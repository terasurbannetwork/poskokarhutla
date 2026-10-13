"""Awal musim 2026 per provinsi + tren jangka panjang -> public/data/musim_awal.json, public/data/tren_karhutla.json

Awal musim (definisi pemilik): hari pertama d sehingga jumlah titik 7 hari terakhir > ambang untuk SEMUA hari d..d+13,
ambang(hari-dalam-tahun) = max(2 x median tahun dasar (dihaluskan +-7 hari), LANTAI). Dicari mulai 8 Juni (musim utama; jendela 7 hari pertama
tidak menyentuh celah data 2026-05-08..06-01). Puncak = hari 7-harian tertinggi; akhir = hari terakhir di atas ambang.
  VIIRS S-NPP n/h, dasar 2015-2025, lantai 10 titik/7 hari  -> musim 2026 dan 2015-2025 (skala halus)
  MODIS keyakinan >= 30, dasar 2002-2025, lantai 3            -> 2002-2026 (tren onset/puncak/akhir 25 tahun)
Musim awal (Feb-Apr, Riau) dicatat terpisah: awal pertama sejak 1 Jan.
Tahun El Nino = ONI musim SON >= 0,5 (enso.json, scripts/sebaran/cuaca.py); IOD positif = DMI rata-rata Agu-Okt >= 0,4.
Tren = kemiringan Theil-Sen + uji Mann-Kendall (pendekatan normal, tanpa koreksi ikatan).
Keberulangan = sel 0,1 derajat (MODIS 2002-2025) dengan >= 3 titik pada sebanyak mungkin tahun; dan porsi titik 2026
(VIIRS) yang jatuh di sel 375 m yang sudah pernah terbakar 2015-2025.

Pakai:  python3 scripts/sebaran/musim_awal.py     |  ... uji
"""
import csv, datetime as dt, json, math, os, statistics, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import (AKAR, HA_SEL, MENTAH, PUBLIK, PROVINSI, PRIORITAS, Lahan, Prov, bukan_vegetasi, muat_viirs, pusat, sel, tgl_hari)
from umum import T0 as _T0  # noqa

MULAI_UTAMA = 159  # 8 Juni (hari-dalam-tahun, 0 = 1 Jan; tahun kabisat bergeser 1 hari, diabaikan)


def awal_musim(c7, ambang, mulai=MULAI_UTAMA, lama=14, sah=None):
    """c7, ambang: daftar per hari-dalam-tahun. sah[d] False = data bolong (memutus rangkaian). -> indeks hari atau None."""
    n = len(c7)
    for d in range(mulai, n - lama + 1):
        if all((sah is None or sah[x]) and c7[x] > ambang[x] for x in range(d, d + lama)):
            return d
    return None


def akhir_musim(c7, ambang, d0):
    if d0 is None:
        return None
    akhir = d0
    for d in range(d0, len(c7)):
        if c7[d] > ambang[d]:
            akhir = d
    return akhir


def rolling7(h):
    out, s = [], 0
    for i, v in enumerate(h):
        s += v
        if i >= 7:
            s -= h[i - 7]
        out.append(s)
    return out


def theil_sen(xs, ys):
    sl = [(ys[j] - ys[i]) / (xs[j] - xs[i]) for i in range(len(xs)) for j in range(i + 1, len(xs)) if xs[j] != xs[i]]
    return statistics.median(sl) if sl else None


def mann_kendall(ys):
    n = len(ys)
    s = sum((ys[j] > ys[i]) - (ys[j] < ys[i]) for i in range(n) for j in range(i + 1, n))
    var = n * (n - 1) * (2 * n + 5) / 18
    z = 0 if s == 0 else (s - (1 if s > 0 else -1)) / math.sqrt(var)
    p = math.erfc(abs(z) / math.sqrt(2))
    return round(z, 2), round(p, 3)


def hari_ke(d):
    return (dt.date(2026, 1, 1) + dt.timedelta(days=d)).strftime("%d %b")


def harian_prov(sumber, prov, tahun):
    """-> {prov: {tahun: [366 hitungan]}}. sumber: iterator (lon, lat, tanggal_lokal)."""
    out = {}
    for lo, la, tg in sumber:
        y = tg.year
        if y not in tahun:
            continue
        p = prov(lo, la)
        if not p:
            continue
        out.setdefault(p, {}).setdefault(y, [0] * 366)[tg.timetuple().tm_yday - 1] += 1
    return out


def musim_semua(per, dasar, lantai, celah=None):
    """per: {prov: {th: [366]}} -> {prov: {th: {awal, puncak, akhir, awal_dini, total}}}, ambang per prov."""
    hasil, ambang_p = {}, {}
    for p, th in per.items():
        c7 = {y: rolling7(v) for y, v in th.items()}
        med = [statistics.median([c7.get(y, [0] * 366)[d] for y in dasar]) for d in range(366)]
        med = [sum(med[max(0, d - 7):d + 8]) / len(med[max(0, d - 7):d + 8]) for d in range(366)]  # dihaluskan +-7 hari
        amb = [max(2 * m, lantai) for m in med]
        ambang_p[p] = amb
        hasil[p] = {}
        for y, c in c7.items():
            sah = None
            if celah and y in celah:
                sah = [not (celah[y][0] <= d <= celah[y][1] + 6) for d in range(366)]
            a = awal_musim(c, amb, sah=sah)
            a0 = awal_musim(c, amb, mulai=0, sah=sah)
            pk = max(range(366), key=lambda d: c[d])
            hasil[p][y] = {"awal": a, "puncak": pk, "akhir": akhir_musim(c, amb, a), "awal_dini": a0 if a0 is not None and a0 < MULAI_UTAMA else None,
                           "total": sum(th[y]), "maks7": c[pk]}
    return hasil, ambang_p


def main():
    prov = Prov()
    enso = json.load(open(os.path.join(MENTAH, "enso.json")))
    el_nino = sorted(int(k[:4]) for k, v in enso["oni"].items() if k.endswith("-10") and v >= 0.5 and 2002 <= int(k[:4]) <= 2026)
    iod = {y: round(statistics.mean([enso["dmi"].get(f"{y}-{b:02d}", 0) for b in (8, 9, 10)]), 2) for y in range(2002, 2027)}
    oni_son = {y: enso["oni"].get(f"{y}-10") for y in range(2002, 2027)}

    # ---------- VIIRS ----------
    v = muat_viirs()
    tl = lambda m, lo: (_T0 + dt.timedelta(minutes=m + lo * 4)).date()  # tanggal waktu matahari setempat
    per_v = harian_prov(((v["lon"][i], v["lat"][i], tl(v["t"][i], v["lon"][i])) for i in range(len(v["t"]))), prov, set(range(2015, 2027)))
    celah = {2026: (dt.date(2026, 5, 8).timetuple().tm_yday - 1, dt.date(2026, 6, 1).timetuple().tm_yday - 1)}
    mv, amb_v = musim_semua(per_v, range(2015, 2026), 10, celah)

    # ---------- MODIS ----------
    jalur = os.path.join(AKAR, "data/raw/firms/modis.csv")
    nonveg = bukan_vegetasi(jalur)

    def modis():
        for r in csv.DictReader(open(jalur)):
            c = r.get("confidence", "")
            if not c.isdigit() or int(c) < 30:
                continue
            t = r.get("type")
            la, lo = float(r["latitude"]), float(r["longitude"])
            if (t and t != "0") or (not t and (round(la, 2), round(lo, 2)) in nonveg):
                continue
            j = r["acq_time"].zfill(4)
            m = dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}") + dt.timedelta(minutes=lo * 4)
            yield lo, la, m.date()
    rec = {}  # sel 0,1 -> {tahun: n}
    def modis_rec():
        for lo, la, tg in modis():
            if 2002 <= tg.year <= 2025:
                k = (math.floor(lo * 10), math.floor(la * 10))
                d = rec.setdefault(k, {})
                d[tg.year] = d.get(tg.year, 0) + 1
            yield lo, la, tg
    per_m = harian_prov(modis_rec(), prov, set(range(2002, 2027)))
    mm, _ = musim_semua(per_m, range(2002, 2026), 3, celah)

    # ---------- keberulangan 375 m (VIIRS) ----------
    lalu, ini = {}, []
    for i in range(len(v["t"])):
        y = (_T0 + dt.timedelta(minutes=v["t"][i])).year
        k = sel(v["lon"][i], v["lat"][i])
        if y <= 2025:
            lalu.setdefault(k, set()).add(y)
        else:
            ini.append(k)
    pernah = sum(1 for k in ini if k in lalu)
    dua = sum(1 for k in ini if len(lalu.get(k, ())) >= 2)
    tiga = sum(1 for k in ini if len(lalu.get(k, ())) >= 3)

    # ---------- gambut per tahun (VIIRS, cache 0,01 derajat) ----------
    lh = Lahan()
    gb_c, gb = {}, {}
    for i in range(len(v["t"])):
        lo, la = v["lon"][i], v["lat"][i]
        k = (round(lo, 2), round(la, 2))
        if k not in gb_c:
            gb_c[k] = 1 if lh.gb.cari(lo, la) else 0
        y = (_T0 + dt.timedelta(minutes=v["t"][i])).year
        a = gb.setdefault(y, [0, 0])
        a[0] += gb_c[k]
        a[1] += 1

    # ---------- peristiwa besar pertama 2026 ----------
    awal26 = {p: mv.get(p, {}).get(2026, {}).get("awal") for p in per_v}
    besar = {}
    for l in open(os.path.join(MENTAH, "peristiwa.jsonl")):
        if '"t0":"2026' not in l:
            continue
        e = json.loads(l)
        if e["ha"] < 500 or e["prov"] not in PROVINSI:
            continue
        besar.setdefault(e["prov"], []).append({k: e[k] for k in ("id", "t0", "lon0", "lat0", "ha", "jam", "n")} | {"hari": len(e["hari"])})
    pertama = {}
    for p, daf in besar.items():
        a = awal26.get(p)
        daf.sort(key=lambda e: e["t0"])
        if a is not None:
            batas = (dt.date(2026, 1, 1) + dt.timedelta(days=a - 14)).isoformat()
            daf_awal = [e for e in daf if e["t0"][:10] >= batas][:3]
        else:
            daf_awal = daf[:3]
        terbesar = sorted(daf, key=lambda e: -e["ha"])[:5]
        for e in daf_awal + terbesar:
            if "kab" not in e:
                w = prov.lengkap(e["lon0"], e["lat0"])
                e["kab"], e["kec"] = (w[1], w[2]) if w else (None, None)
        pertama[p] = {"pertama": daf_awal, "terbesar": terbesar, "n_besar": len(daf)}

    # ---------- keluaran musim_awal.json ----------
    out_p = {}
    for p in sorted(per_v, key=lambda p: (p not in PRIORITAS, p)):
        if p not in PROVINSI:
            continue
        r = mv[p]
        hist = [r[y]["awal"] for y in range(2015, 2026) if r.get(y, {}).get("awal") is not None]
        r26 = r.get(2026, {})
        out_p[p] = {"nama": PROVINSI[p], "prioritas": p in PRIORITAS,
                    "awal_2026": hari_ke(r26["awal"]) if r26.get("awal") is not None else None,
                    "awal_2026_iso": (dt.date(2026, 1, 1) + dt.timedelta(days=r26["awal"])).isoformat() if r26.get("awal") is not None else None,
                    "awal_dini_2026": hari_ke(r26["awal_dini"]) if r26.get("awal_dini") is not None else None,
                    "puncak_2026": hari_ke(r26["puncak"]) if r26 else None, "titik_2026": r26.get("total"),
                    "awal_median_2015_2025": hari_ke(round(statistics.median(hist))) if hist else None,
                    "selisih_hari": (r26["awal"] - round(statistics.median(hist))) if hist and r26.get("awal") is not None else None,
                    "tahun_bermusim": len(hist),
                    "per_tahun": {y: {k: (hari_ke(x) if k in ("awal", "puncak", "akhir", "awal_dini") and x is not None else x) for k, x in r[y].items()} for y in sorted(r)},
                    "c7_2026": rolling7(per_v[p].get(2026, [0] * 366)), "ambang": [round(a) for a in amb_v[p]],
                    **pertama.get(p, {"pertama": [], "terbesar": [], "n_besar": 0})}
    pr = [p for p in PRIORITAS if out_p.get(p, {}).get("awal_2026_iso")]
    pr.sort(key=lambda p: out_p[p]["awal_2026_iso"])
    kal = []
    for p in pr:
        o = out_p[p]
        s = o["selisih_hari"]
        kal.append(f"{o['nama']} {o['awal_2026']}" + (f" ({abs(s)} hari {'lebih awal' if s < 0 else 'lebih lambat'} dari median 2015-2025)" if s else ""))
    tanpa = [out_p[p]["nama"] for p in PRIORITAS if p in out_p and not out_p[p]["awal_2026_iso"]]
    narasi = ("Musim 2026 (definisi: jumlah titik VIIRS 7 hari > 2x median 2015-2025 selama >= 14 hari berturut-turut) "
              f"mulai berurutan: {'; '.join(kal)}." + (f" Belum memenuhi definisi: {', '.join(tanpa)}." if tanpa else "")
              + f" {round(100 * pernah / max(1, len(ini)))}% titik 2026 jatuh di sel 375 m yang pernah terbakar 2015-2025.")
    json.dump({"dibuat": dt.date.today().isoformat(), "definisi": __doc__.split("\n\n")[1].strip(), "celah_data": ["2026-05-08", "2026-06-01"],
               "catatan": "Data Juli-Oktober 2026 = FIRMS NRT (deteksi sedikit berbeda dari arsip standar); ambang memakai arsip standar.",
               "narasi": narasi, "urutan": pr, "prov": out_p},
              open(os.path.join(PUBLIK, "musim_awal.json"), "w"), ensure_ascii=False, separators=(",", ":"))

    # ---------- tren_karhutla.json ----------
    tahun = list(range(2002, 2027))
    tren = {}
    for p in sorted(per_m, key=lambda p: (p not in PRIORITAS, p)):
        if p not in PROVINSI:
            continue
        tot = [sum(per_m[p].get(y, [0])) for y in tahun]
        yy = tahun[:-1]
        t25 = tot[:-1]
        log = [math.log1p(x) for x in t25]
        sl = theil_sen(yy, log)
        en = [t25[i] for i, y in enumerate(yy) if y in el_nino]
        bi = [t25[i] for i, y in enumerate(yy) if y not in el_nino]
        aw = [(y, mm[p][y]["awal"]) for y in yy if mm[p].get(y, {}).get("awal") is not None]
        pk = [(y, mm[p][y]["puncak"]) for y in yy if mm[p].get(y, {}).get("awal") is not None]
        ak = [(y, mm[p][y]["akhir"]) for y in yy if mm[p].get(y, {}).get("akhir") is not None]
        f = lambda xs: round(10 * theil_sen([a for a, _ in xs], [b for _, b in xs]), 1) if len(xs) >= 6 else None
        g = lambda xs: mann_kendall([b for _, b in xs])[1] if len(xs) >= 6 else None
        tren[p] = {"nama": PROVINSI[p], "prioritas": p in PRIORITAS, "titik": tot,
                   "tren_persen_per_tahun": round(100 * (math.exp(sl) - 1), 1) if sl is not None else None, "mk_p": mann_kendall(t25)[1],
                   "median_el_nino": statistics.median(en) if en else None, "median_biasa": statistics.median(bi) if bi else None,
                   "rasio_el_nino": round(statistics.median(en) / max(1, statistics.median(bi)), 1) if en and bi else None,
                   "awal": {y: hari_ke(d) for y, d in aw}, "puncak": {y: hari_ke(d) for y, d in pk}, "akhir": {y: hari_ke(d) for y, d in ak},
                   "awal_hari": {y: d for y, d in aw}, "puncak_hari": {y: d for y, d in pk}, "akhir_hari": {y: d for y, d in ak},
                   "geser_awal_hari_per_dekade": f(aw), "geser_awal_p": g(aw), "geser_akhir_hari_per_dekade": f(ak), "geser_akhir_p": g(ak),
                   "musim_2026_modis": {k: (hari_ke(x) if k in ("awal", "puncak", "akhir", "awal_dini") and x is not None else x) for k, x in mm[p].get(2026, {}).items()}}
    nasional = [sum(tren[p]["titik"][i] for p in tren) for i in range(len(tahun))]
    porsi = {y: {p: round(tren[p]["titik"][i] / max(1, nasional[i]), 3) for p in tren if tren[p]["titik"][i] / max(1, nasional[i]) >= .03} for i, y in enumerate(tahun)}
    besar_th = sorted(tahun[:-1], key=lambda y: -nasional[tahun.index(y)])[:5]
    sel_rec = sorted(((sum(1 for n in d.values() if n >= 3), sum(d.values()) / 24, k) for k, d in rec.items()), reverse=True)
    hot = []
    for f_, r_, (gx, gy) in sel_rec:
        lo, la = (gx + .5) / 10, (gy + .5) / 10
        w = prov.lengkap(lo, la)
        if not w:  # Australia, Timor Leste, Malaysia, laut
            continue
        if len(hot) >= 40:
            break
        hot.append({"lon": lo, "lat": la, "tahun_terbakar": f_, "rata_titik": round(r_, 1), "prov": w[0] if w else None, "kab": w[1] if w else None})
    json.dump({"dibuat": dt.date.today().isoformat(), "sumber": "NASA FIRMS MODIS C6.1 2002-2026 (keyakinan >= 30, vegetasi); VIIRS S-NPP 2015-2026; ONI/DMI NOAA",
               "catatan": "2026 belum lengkap (data s.d. 12 Okt, celah 8 Mei-1 Jun) dan tidak ikut perhitungan tren.",
               "tahun": tahun, "el_nino": el_nino, "oni_son": oni_son, "iod_aso": iod, "nasional": nasional,
               "tren_nasional_persen_per_tahun": round(100 * (math.exp(theil_sen(tahun[:-1], [math.log1p(x) for x in nasional[:-1]])) - 1), 1),
               "mk_p_nasional": mann_kendall(nasional[:-1])[1], "tahun_terbesar": besar_th, "porsi_prov": porsi,
               "gambut_porsi_viirs": {y: round(a / max(1, b), 3) for y, (a, b) in sorted(gb.items())},
               "titik_viirs": {y: b for y, (a, b) in sorted(gb.items())},
               "ulang_2026": {"titik": len(ini), "sel_pernah": round(pernah / max(1, len(ini)), 3), "sel_2th": round(dua / max(1, len(ini)), 3), "sel_3th": round(tiga / max(1, len(ini)), 3)},
               "keberulangan": hot, "prov": tren},
              open(os.path.join(PUBLIK, "tren_karhutla.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(narasi, file=sys.stderr)


def uji():
    c = [0] * 366
    for d in range(200, 230):
        c[d] = 50
    amb = [10] * 366
    assert awal_musim(c, amb) == 200 and akhir_musim(c, amb, 200) == 229
    c[210] = 0  # rangkaian putus: 200..209 cuma 10 hari, 211..229 = 19 hari
    assert awal_musim(c, amb) == 211
    sah = [True] * 366
    sah[215] = False
    assert awal_musim(c, amb, sah=sah) == 216
    assert awal_musim([0] * 366, amb) is None
    assert rolling7([1] * 10) == [1, 2, 3, 4, 5, 6, 7, 7, 7, 7]
    assert abs(theil_sen([1, 2, 3, 4], [2, 4, 6, 8]) - 2) < 1e-9
    z, p = mann_kendall(list(range(20)))
    assert z > 3 and p < .01 and mann_kendall([5] * 10)[1] == 1.0
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
