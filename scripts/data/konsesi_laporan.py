"""Laporan konsesi terbakar 2026: tiap areal konsesi (sawit/HTI/HPH/tambang) yang kemasukan titik panas VIIRS sejak 1 Jan 2026.

Pakai:  python3 scripts/data/konsesi_laporan.py        # -> public/data/konsesi2026/{index,<kode prov>}.json
        python3 scripts/data/konsesi_laporan.py uji    # invarian berkas hasil

Titik: VIIRS S-NPP keyakinan nominal/tinggi. Arsip lokal data/raw/sebaran/viirs_veg_panjang.pkl (api vegetasi, s.d. titik
terakhir arsip), lalu disambung FIRMS area API VIIRS_SNPP_NRT (FIRMS_MAP_KEY di .env / env) sampai hari ini. Hari = kalender
WIB (konvensi SiPongi). Arsip tidak ada di Actions, jadi skrip ini dijalankan manual lalu hasilnya di-commit.

Luas indikasi terbakar = jumlah piksel VIIRS 375 m unik yang kemasukan titik x 14,06 ha, dipotong luas konsesi. Ini jejak
piksel, bukan peta luas bakar resmi; satu piksel bisa terbakar sebagian. Kejadian = rangkaian hari bertitik dengan jeda <= 2 hari.
Titik di dalam areal konsesi bukan bukti siapa yang membakar.
"""
import bisect, csv, datetime as dt, io, json, math, os, pickle, re, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aktor_walhi import Indeks, Kompleks, cincin, di_dalam, kunci  # noqa: E402
from wilayah import Wilayah  # noqa: E402

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
LAHAN = os.path.join(AKAR, "public/data/lahan")
VIIRS = os.path.join(AKAR, "data/raw/sebaran/viirs_veg_panjang.pkl")
KELUAR = os.path.join(AKAR, "public/data/konsesi2026")
T0 = dt.datetime(2015, 1, 1, tzinfo=dt.timezone.utc)
WIB = dt.timedelta(hours=7)
AWAL = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc) - WIB  # 1 Jan 00.00 WIB
PIKSEL = 0.375 / 111.32  # derajat
HA_PIKSEL = 0.375 * 0.375 * 100  # 14,06 ha
BBOX = "94,-11.5,141.5,6.5"
JEDA = 2  # hari tanpa titik yang masih dihitung satu kejadian
RSPO = os.path.join(AKAR, "data/raw/konsesi/rspo_konsesi.json")  # anggota RSPO 2020 via GFW (rspo_oil_palm v20200401)
SANKSI = os.path.join(AKAR, "data/raw/konsesi/sanksi_karhutla.json")
KOMP_KM = 1.5  # titik berdekatan <= 1,5 km dan selang <= 7 hari = satu kompleks (definisi sama dengan kluster 7 hari)
KOMP_LALU_MAKS = 30


def kompleks_lalu(ts, wil):
    """Kompleks api sebelum jendela 7 hari: titik <= 1,5 km dan selang <= 7 hari tersambung (single linkage).
    -> [[lat, lon, kecamatan, titik, mulai, akhir, hari bertitik, FRP maks]] urut titik terbanyak."""
    sel = KOMP_KM / 111.32
    induk = list(range(len(ts)))

    def akar(i):
        while induk[i] != i:
            induk[i] = induk[induk[i]]
            i = induk[i]
        return i
    grid = {}
    for i, (w, la, lo, _) in enumerate(ts):
        cx, cy = math.floor(lo / sel), math.floor(la / sel)
        for a in (cx - 1, cx, cx + 1):
            for b in (cy - 1, cy, cy + 1):
                for j in grid.get((a, b), ()):
                    w2, la2, lo2, _ = ts[j]
                    if abs((w - w2).total_seconds()) <= 7 * 86400 and \
                            math.hypot((la - la2) * 111.32, (lo - lo2) * 111.32 * math.cos(math.radians(la))) <= KOMP_KM:
                        induk[akar(i)] = akar(j)
        grid.setdefault((cx, cy), []).append(i)
    kel = {}
    for i, x in enumerate(ts):
        kel.setdefault(akar(i), []).append(x)
    out = []
    for xs in kel.values():
        hr = sorted({(w + WIB).date().isoformat() for w, *_ in xs})
        la, lo = sum(x[1] for x in xs) / len(xs), sum(x[2] for x in xs) / len(xs)
        c = wil.cari(lo, la)
        out.append([round(la, 4), round(lo, 4), f"{c[2]}, {c[1]}" if c else "", len(xs), hr[0], hr[-1], len(hr), round(max(x[3] for x in xs), 1)])
    return sorted(out, key=lambda k: (-k[3], k[4]))


def grup_rapi(g):
    """'PT Smart Tbk' -> 'Smart'; 'Wilmar International Limited' tetap (nama resmi grup RSPO)."""
    g = re.sub(r"^PT\.?\s+|\s+Tbk\.?$", "", (g or "").strip())
    return g


def kunci_firms():
    k = os.environ.get("FIRMS_MAP_KEY")
    if not k and os.path.exists(os.path.join(AKAR, ".env")):
        for b in open(os.path.join(AKAR, ".env")):
            if b.startswith("FIRMS_MAP_KEY="):
                k = b.split("=", 1)[1].strip().strip('"')
    return k


def titik():
    """[(waktu UTC, lat, lon, frp)] sejak 1 Jan 2026 WIB."""
    v = pickle.load(open(VIIRS, "rb"))
    t, la, lo, fr = v["t"], v["lat"], v["lon"], v["frp"]
    m0 = int((AWAL - T0).total_seconds() // 60)
    a = bisect.bisect_left(t, m0)
    out = [(T0 + dt.timedelta(minutes=int(t[j])), float(la[j]), float(lo[j]), float(fr[j])) for j in range(a, len(t))]
    akhir = out[-1][0]
    k = kunci_firms()
    if not k:
        print("FIRMS_MAP_KEY tidak ada: titik berhenti di", akhir, file=sys.stderr)
        return out, akhir
    hari, kini = akhir.date(), dt.datetime.now(dt.timezone.utc).date()
    tambah = 0
    while hari <= kini:
        n = min(5, (kini - hari).days + 1)
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{k}/VIIRS_SNPP_NRT/{BBOX}/{n}/{hari.isoformat()}"
        teks = urllib.request.urlopen(url, timeout=120).read().decode()
        for r in csv.DictReader(io.StringIO(teks)):
            if r["confidence"] not in ("n", "h"):
                continue
            w = dt.datetime.strptime(r["acq_date"] + r["acq_time"].zfill(4), "%Y-%m-%d%H%M").replace(tzinfo=dt.timezone.utc)
            if w > akhir:
                out.append((w, float(r["latitude"]), float(r["longitude"]), float(r["frp"])))
                tambah += 1
        hari += dt.timedelta(days=n)
    out.sort()
    print(f"arsip s.d. {akhir:%Y-%m-%d %H:%M} UTC + {tambah} titik FIRMS NRT", file=sys.stderr)
    return out, out[-1][0]


def kejadian(harian):
    """[[mulai, selesai, hari kalender, titik]] dari [[tgl, n]] terurut."""
    ep = []
    for d, n in harian:
        h = dt.date.fromisoformat(d)
        if ep and (h - dt.date.fromisoformat(ep[-1][1])).days <= JEDA + 1:
            ep[-1][1] = d
            ep[-1][3] += n
        else:
            ep.append([d, d, 1, n])
    for e in ep:
        e[2] = (dt.date.fromisoformat(e[1]) - dt.date.fromisoformat(e[0])).days + 1
    return ep


def luas_gambut(geoms, luas, gambut):
    """Luas konsesi di atas gambut (ha): sampel grid ~1.500 titik di kotak pembatas blok, porsi yang jatuh di gambut x luas.
    ponytail: sampel grid, galat ~1-3 % luas; ganti irisan poligon kalau butuh angka resmi."""
    if not luas:
        return 0
    bb = [(min(x for r in cincin(g) for x, _ in r[0]), min(y for r in cincin(g) for _, y in r[0]),
           max(x for r in cincin(g) for x, _ in r[0]), max(y for r in cincin(g) for _, y in r[0])) for g in geoms]
    lb = sum((b[2] - b[0]) * (b[3] - b[1]) for b in bb)
    if not lb:
        return 0
    st = max(math.sqrt(lb / 1500), 0.0005)
    isi = gb = 0
    for g, (x0, y0, x1, y1) in zip(geoms, bb):
        y = y0 + st / 2
        while y < y1:
            x = x0 + st / 2
            while x < x1:
                if any(di_dalam(x, y, r) for r in cincin(g)):
                    isi += 1
                    gb += any(True for _ in gambut.cari(x, y))
                x += st
            y += st
    return round(luas * gb / isi) if isi else 0


def bangun():
    fitur = json.load(open(os.path.join(LAHAN, "konsesi.geojson")))["features"]
    sumber = json.load(open(os.path.join(LAHAN, "konsesi.geojson"))).get("sumber", {})
    gambut = Indeks(json.load(open(os.path.join(LAHAN, "gambut.geojson")))["features"])
    kws = json.load(open(os.path.join(LAHAN, "kawasan.geojson")))["features"]
    ikws = Indeks(kws)
    aktor = json.load(open(os.path.join(AKAR, "public/data/aktor_karhutla.json")))
    walhi = {kunci(p["nama"]): p for p in aktor["perusahaan"]}
    gneg = aktor.get("grup_negara", {})
    gp_d = json.load(open(os.path.join(AKAR, "public/data/aktor_greenpeace.json")))  # titik sumber asap Greenpeace/Pantau Gambut, 8 Agu-1 Okt 2026
    gp_nama = {p["nama"]: p for p in gp_d["perusahaan"]}
    gp_poli = {i: gp_nama[n] for i, n in gp_d["poligon"].items()}  # per id poligon (kunci nama terlalu umum untuk Inhutani)
    wil = Wilayah()
    rspo = {}
    for x in json.load(open(RSPO))["unit"]:
        rspo.setdefault(kunci(x["perusahaan"]), []).append(x)
    sanksi = {}
    for x in json.load(open(SANKSI))["kasus"]:
        for nm in [x["nama"]] + (x.get("alias") or []):
            sanksi.setdefault(kunci(nm), []).append(x)
    kp = Kompleks(os.path.join(AKAR, "public/data/kluster.json"))
    ix = Indeks(fitur)
    T, akhir = titik()
    per = {}  # indeks fitur -> [titik]
    for w, la, lo, fr in T:
        for i in ix.cari(lo, la):
            per.setdefault(i, []).append((w, la, lo, fr))
    # satu perusahaan = nama + jenis + provinsi (blok terpisah digabung)
    usaha = {}
    for i, ts in per.items():
        p = fitur[i]["properties"]
        k = (kunci(p["nama"]) or p["id"], p["jenis"], p["prov"])
        u = usaha.setdefault(k, {"i": [], "t": {}})
        u["i"].append(i)
        for x in ts:
            u["t"][(x[0], x[1], x[2])] = x  # titik di blok tumpang tindih dihitung sekali
    # luas total perusahaan: semua bloknya, termasuk yang tidak terbakar
    blok = {}
    for i, f in enumerate(fitur):
        p = f["properties"]
        blok.setdefault((kunci(p["nama"]) or p["id"], p["jenis"], p["prov"]), []).append(i)
    prov = {}
    for k, u in usaha.items():
        idx = blok[k]
        ps = [fitur[i]["properties"] for i in idx]
        ts = sorted(u["t"].values())
        hr = {}
        sel = set()
        gb = 0
        gbh = {}  # hari -> titik di gambut
        gbsel = set()
        kw = {}
        kec = {}
        kab = {}
        kom = {}
        batas7 = akhir - dt.timedelta(days=7)
        for w, la, lo, fr in ts:
            if w >= batas7:
                q = kp.cari(lo, la)
                if q:
                    d = (w + WIB).date().isoformat()
                    e = kom.setdefault(q, {"n": 0, "a": d, "b": d, "h": set(), "la": 0.0, "lo": 0.0, "frp": 0.0})
                    e["n"] += 1
                    e["a"], e["b"] = min(e["a"], d), max(e["b"], d)
                    e["h"].add(d)
                    e["la"] += la
                    e["lo"] += lo
                    e["frp"] = max(e["frp"], fr)
            d = (w + WIB).date().isoformat()
            hr[d] = hr.get(d, 0) + 1
            sel.add((math.floor(la / PIKSEL), math.floor(lo / PIKSEL)))
            if any(True for _ in gambut.cari(lo, la)):
                gb += 1
                gbh[d] = gbh.get(d, 0) + 1
                gbsel.add((math.floor(la / PIKSEL), math.floor(lo / PIKSEL)))
            f = next((kws[j]["properties"]["fungsi"] for j in ikws.cari(lo, la)), None)
            if f:
                kw[f] = kw.get(f, 0) + 1
            c = wil.cari(lo, la)
            if c:
                kec[f"{c[2]}, {c[1]}"] = kec.get(f"{c[2]}, {c[1]}", 0) + 1
                kab[c[1]] = kab.get(c[1], 0) + 1
        harian = sorted(hr.items())
        luas = sum(p.get("luas_peta_ha") or 0 for p in ps)
        gha = luas_gambut([fitur[i]["geometry"] for i in idx], luas, gambut)
        nama = ps[0]["nama"] or "(tanpa nama)"
        wl = walhi.get(kunci(nama))
        rs = rspo.get(kunci(nama)) if k[1] == "sawit" else None
        gp = next((gp_poli[ps_i["id"]] for ps_i in ps if ps_i["id"] in gp_poli), None)
        grup = ", ".join((wl or {}).get("grup") or []) or ps[0].get("grup") or (grup_rapi(rs[0]["grup"]) if rs else "")
        grup_asal = "walhi" if (wl or {}).get("grup") else "peta" if ps[0].get("grup") else "rspo" if grup else ""
        if not grup and gp and (gp["grup"] or gp["grup_kaitan"]):
            grup, grup_asal = gp["grup"] or gp["grup_kaitan"], "greenpeace"
        neg = (wl or {}).get("negara") or [gneg.get(grup, "") or ("MY" if grup.endswith("Berhad") else "")]
        n = len(ts)
        frp = [x[3] for x in ts]
        kl = kompleks_lalu([x for x in ts if x[0] < batas7], wil)
        t7 = sum(c for d, c in harian if (dt.date.fromisoformat(d) - (akhir + WIB).date()).days > -7)
        r = {
            "id": ps[0]["id"], "nama": nama, "grup": grup, "grup_asal": grup_asal,
            "negara": [x for x in neg if x],
            # anggota RSPO (data RSPO 2020): grup anggota, unit bersertifikat atau belum, tahun keanggotaan
            "rspo": {"grup": rs[0]["grup"], "sertifikat": any(x["sertifikat"] for x in rs), "sejak": next((x["anggota_sejak"] for x in rs if x["anggota_sejak"]), None)} if rs else None,
            "sanksi": [{"jenis": x["jenis"], "status": x["status"], "tahun": x.get("tahun_putusan") or x.get("tahun_kebakaran"),
                        "nilai": x.get("nilai_rp") or x.get("nilai_gugatan_rp"), "perkara": x.get("perkara"), "url": x["sumber"][0]["url"]}
                       for x in sanksi.get(kunci(nama), []) if x["prov"] == k[2]],
            "pemegang": (wl or {}).get("pemegang") or [], "tokoh": (wl or {}).get("tokoh") or [],
            "walhi_titik": (wl or {}).get("titik_agu") or (wl or {}).get("titik_sep"), "walhi_tabel": (wl or {}).get("tabel") or [],
            "kab_titik": [a for a, _ in sorted(kab.items(), key=lambda x: -x[1])],
            # kompleks api 7 hari: [lat, lon, kecamatan, titik, mulai, akhir, hari bertitik, FRP maks]
            "kompleks": [[round(e["la"] / e["n"], 4), round(e["lo"] / e["n"], 4),
                          (lambda c: f"{c[2]}, {c[1]}" if c else "")(wil.cari(e["lo"] / e["n"], e["la"] / e["n"])),
                          e["n"], e["a"], e["b"], len(e["h"]), round(e["frp"], 1)] for e in sorted(kom.values(), key=lambda e: -e["n"])], "jenis": k[1],
            # kompleks api sebelum 7 hari terakhir (bentuk sama), 30 terbesar + ringkasan sisanya [jumlah, titik, titik maks]
            "kompleks_lalu": kl[:KOMP_LALU_MAKS],
            "kompleks_lalu_sisa": [len(kl) - KOMP_LALU_MAKS, sum(x[3] for x in kl[KOMP_LALU_MAKS:]), kl[KOMP_LALU_MAKS][3]] if len(kl) > KOMP_LALU_MAKS else None,
            "kab": sorted({p.get("kab") or "" for p in ps} - {""}), "luas_ha": round(luas),
            "tahun_data": ps[0].get("tahun_data"), "blok": len(idx), "blok_terbakar": len(u["i"]),
            "titik": n, "hari_aktif": len(harian), "pertama": harian[0][0], "terakhir": harian[-1][0],
            "rentang_hari": (dt.date.fromisoformat(harian[-1][0]) - dt.date.fromisoformat(harian[0][0])).days + 1,
            "titik_7h": t7, "puncak": list(max(harian, key=lambda x: x[1])),
            "luas_bakar_ha": round(min(luas or 1e12, len(sel) * HA_PIKSEL)), "piksel": len(sel),
            "frp_maks": round(max(frp), 1), "frp_total": round(sum(frp)),
            "gambut": round(gb / n, 3),
            # gambut: luas konsesi di gambut (sampel grid), titik & indikasi bakar di gambut, kejadian [mulai, selesai, hari, titik]
            "gambut_ha": gha, "gambut_titik": gb, "gambut_bakar_ha": round(min(gha or 1e12, len(gbsel) * HA_PIKSEL)),
            "gambut_kejadian": kejadian(sorted(gbh.items())), "kawasan": {f: round(c / n, 3) for f, c in sorted(kw.items(), key=lambda x: -x[1])},
            "kec": [a for a, _ in sorted(kec.items(), key=lambda x: -x[1])[:6]],
            "harian": harian, "kejadian": kejadian(harian),
            # Greenpeace & Pantau Gambut 2026: titik sumber asap (bukan titik panas) 8 Agu-1 Okt; tabel "Sawit #n"/"PBPH #n"/"PSN tebu"/"Kaitan SG/MY"
            "gp": bool(gp), "gp_titik": (gp or {}).get("asap_titik") or ((gp or {}).get("kaitan") or {}).get("titik"), "gp_hari": (gp or {}).get("asap_hari") or ((gp or {}).get("kaitan") or {}).get("hari"),
            "gp_tabel": (gp or {}).get("tabel") or [], "gp_ket": ((gp or {}).get("kaitan") or {}).get("ket") or (gp or {}).get("catatan") or "",
            "walhi": bool(wl), "walhi_ket": (wl or {}).get("catatan", ""),
            "pusat": [round(sum(x[1] for x in ts) / n, 4), round(sum(x[2] for x in ts) / n, 4)],
            # titik: [lat, lon, "MM-DD HH:MM" WIB, frp]
            "pt": [[round(la, 4), round(lo, 4), (w + WIB).strftime("%m-%d %H:%M"), round(fr, 1)] for w, la, lo, fr in ts],
            "geom": [fitur[i]["geometry"] for i in idx],
        }
        r["persen_bakar"] = round(r["luas_bakar_ha"] / luas, 4) if luas else None
        prov.setdefault(k[2], []).append(r)
    os.makedirs(KELUAR, exist_ok=True)
    nama_prov = {}
    try:
        nama_prov = {kd: v["nama"] for kd, v in json.load(open(os.path.join(AKAR, "public/data/laporan.json")))["prov"].items()}
    except Exception:
        pass
    idx = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
           "sampai": (akhir + WIB).strftime("%Y-%m-%d %H:%M WIB"), "dari": "2026-01-01",
           "sumber_titik": "NASA FIRMS VIIRS S-NPP 375 m, keyakinan nominal/tinggi (arsip SP + NRT)",
           "sumber_konsesi": sumber, "ha_piksel": round(HA_PIKSEL, 2), "jeda_kejadian": JEDA,
           "celah": "FIRMS kosong 8 Mei - 1 Jun 2026", "prov": []}
    for kd, rs in sorted(prov.items()):
        rs.sort(key=lambda r: -r["titik"])
        with open(os.path.join(KELUAR, f"{kd}.json"), "w") as f:
            json.dump({"prov": kd, "nama": nama_prov.get(kd, kd), "perusahaan": rs}, f, ensure_ascii=False, separators=(",", ":"))
        idx["prov"].append({"kode": kd, "nama": nama_prov.get(kd, kd), "perusahaan": len(rs), "titik": sum(r["titik"] for r in rs),
                            "luas_bakar_ha": sum(r["luas_bakar_ha"] for r in rs),
                            "jenis": {j: sum(1 for r in rs if r["jenis"] == j) for j in ("sawit", "hti", "hph", "tambang")}})
    with open(os.path.join(KELUAR, "index.json"), "w") as f:
        json.dump(idx, f, ensure_ascii=False, separators=(",", ":"))
    print(f"konsesi2026: {sum(p['perusahaan'] for p in idx['prov'])} perusahaan, {len(idx['prov'])} provinsi, s.d. {idx['sampai']}", file=sys.stderr)


def uji():
    idx = json.load(open(os.path.join(KELUAR, "index.json")))
    assert idx["prov"], "index.json tanpa provinsi"
    for p in idx["prov"]:
        d = json.load(open(os.path.join(KELUAR, f"{p['kode']}.json")))
        assert len(d["perusahaan"]) == p["perusahaan"], f"{p['kode']}: jumlah perusahaan {len(d['perusahaan'])} != index {p['perusahaan']}"
        for r in d["perusahaan"]:
            assert r["titik"] == len(r["pt"]) == sum(n for _, n in r["harian"]) == sum(e[3] for e in r["kejadian"]), \
                f"{r['nama']}: titik {r['titik']} tidak sama dengan jumlah titik/harian/kejadian"
            assert not r["luas_ha"] or r["luas_bakar_ha"] <= r["luas_ha"], f"{r['nama']}: luas bakar {r['luas_bakar_ha']} > luas {r['luas_ha']}"
            lalu = sum(k[3] for k in r["kompleks_lalu"]) + ((r["kompleks_lalu_sisa"] or [0, 0])[1])
            assert lalu + sum(k[3] for k in r["kompleks"]) <= r["titik"], f"{r['nama']}: titik kompleks {lalu} melebihi titik"
            assert all(k[4] <= k[5] for k in r["kompleks_lalu"]), f"{r['nama']}: rentang kompleks lampau terbalik"
            assert r["gambut_titik"] == sum(e[3] for e in r["gambut_kejadian"]) <= r["titik"], f"{r['nama']}: titik gambut tidak cocok"
            assert r["gambut_bakar_ha"] <= r["luas_bakar_ha"] and r["gambut_ha"] <= (r["luas_ha"] or r["gambut_ha"]), f"{r['nama']}: luas gambut"
            assert r["pertama"] >= "2026-01-01" and r["pertama"] <= r["terakhir"], f"{r['nama']}: tanggal {r['pertama']}..{r['terakhir']}"
    print("uji konsesi2026: lolos", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else (bangun(), uji())
