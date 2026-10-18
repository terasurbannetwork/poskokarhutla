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
import bisect, csv, datetime as dt, io, json, math, os, pickle, sys, urllib.request

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


def bangun():
    fitur = json.load(open(os.path.join(LAHAN, "konsesi.geojson")))["features"]
    sumber = json.load(open(os.path.join(LAHAN, "konsesi.geojson"))).get("sumber", {})
    gambut = Indeks(json.load(open(os.path.join(LAHAN, "gambut.geojson")))["features"])
    kws = json.load(open(os.path.join(LAHAN, "kawasan.geojson")))["features"]
    ikws = Indeks(kws)
    aktor = json.load(open(os.path.join(AKAR, "public/data/aktor_karhutla.json")))
    walhi = {kunci(p["nama"]): p for p in aktor["perusahaan"]}
    gneg = aktor.get("grup_negara", {})
    wil = Wilayah()
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
            gb += any(True for _ in gambut.cari(lo, la))
            f = next((kws[j]["properties"]["fungsi"] for j in ikws.cari(lo, la)), None)
            if f:
                kw[f] = kw.get(f, 0) + 1
            c = wil.cari(lo, la)
            if c:
                kec[f"{c[2]}, {c[1]}"] = kec.get(f"{c[2]}, {c[1]}", 0) + 1
                kab[c[1]] = kab.get(c[1], 0) + 1
        harian = sorted(hr.items())
        luas = sum(p.get("luas_peta_ha") or 0 for p in ps)
        nama = ps[0]["nama"] or "(tanpa nama)"
        wl = walhi.get(kunci(nama))
        grup = ", ".join((wl or {}).get("grup") or []) or ps[0].get("grup") or ""
        n = len(ts)
        frp = [x[3] for x in ts]
        t7 = sum(c for d, c in harian if (dt.date.fromisoformat(d) - (akhir + WIB).date()).days > -7)
        r = {
            "id": ps[0]["id"], "nama": nama, "grup": grup,
            "negara": [x for x in ((wl or {}).get("negara") or [gneg.get(ps[0].get("grup") or "", "")]) if x],
            "pemegang": (wl or {}).get("pemegang") or [], "tokoh": (wl or {}).get("tokoh") or [],
            "walhi_titik": (wl or {}).get("titik_agu") or (wl or {}).get("titik_sep"), "walhi_tabel": (wl or {}).get("tabel") or [],
            "kab_titik": [a for a, _ in sorted(kab.items(), key=lambda x: -x[1])],
            # kompleks api 7 hari: [lat, lon, kecamatan, titik, mulai, akhir, hari bertitik, FRP maks]
            "kompleks": [[round(e["la"] / e["n"], 4), round(e["lo"] / e["n"], 4),
                          (lambda c: f"{c[2]}, {c[1]}" if c else "")(wil.cari(e["lo"] / e["n"], e["la"] / e["n"])),
                          e["n"], e["a"], e["b"], len(e["h"]), round(e["frp"], 1)] for e in sorted(kom.values(), key=lambda e: -e["n"])], "jenis": k[1],
            "kab": sorted({p.get("kab") or "" for p in ps} - {""}), "luas_ha": round(luas),
            "tahun_data": ps[0].get("tahun_data"), "blok": len(idx), "blok_terbakar": len(u["i"]),
            "titik": n, "hari_aktif": len(harian), "pertama": harian[0][0], "terakhir": harian[-1][0],
            "rentang_hari": (dt.date.fromisoformat(harian[-1][0]) - dt.date.fromisoformat(harian[0][0])).days + 1,
            "titik_7h": t7, "puncak": list(max(harian, key=lambda x: x[1])),
            "luas_bakar_ha": round(min(luas or 1e12, len(sel) * HA_PIKSEL)), "piksel": len(sel),
            "frp_maks": round(max(frp), 1), "frp_total": round(sum(frp)),
            "gambut": round(gb / n, 3), "kawasan": {f: round(c / n, 3) for f, c in sorted(kw.items(), key=lambda x: -x[1])},
            "kec": [a for a, _ in sorted(kec.items(), key=lambda x: -x[1])[:6]],
            "harian": harian, "kejadian": kejadian(harian),
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
            assert r["pertama"] >= "2026-01-01" and r["pertama"] <= r["terakhir"], f"{r['nama']}: tanggal {r['pertama']}..{r['terakhir']}"
    print("uji konsesi2026: lolos", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else (bangun(), uji())
