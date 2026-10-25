"""Uji silang luas terbakar METODE KITA vs citra Sentinel-2 dNBR, per kabupaten (keputusan pemilik 25 Okt 2026) -> data/raw/ujiluas_kab/ (cache) + public/data/ujiluas_kab.json

Bedanya dengan ujiluas_dnbr.py (S-NPP saja, per cluster, rasio ke piksel): di sini titik N20 + N21 + S-NPP (n/h, Agu-Okt 2023, sel sumber panas tetap dibuang) dikelompokkan
bersama (harian.dbscan), dan tiap cluster dibandingkan pada periode yang sama dengan:
  dNBR  = luas_citra.nilai (mesin & ambang sama dengan ujiluas_dnbr.py: dNBR > 0,27, NBR pasca < 0,2, kontrol latar)
  a     = jumlah luas harian metode baru: sum_hari (n_N20 x 4,12 + n_N21 x 4,16) / 2 (peta_karhutla.F20/F21; hari UTC)
  b_px  = piksel 375 m UNIK N20 u N21 (kunci insiden.SEL_PIKSEL); b = b_px x 14,0625 ha adalah batas atas, "ha per piksel tersirat" = dNBR / b_px
  c     = cara lama: jumlah titik S-NPP x 4,3
Kabupaten = tempat pusat cluster (wilayah.cari). Jumlah per kabupaten HANYA atas cluster yang berhasil dinilai (a, b, c dijumlah atas cluster yang sama).
Pakai:  python3 ujiluas_kab.py pilih              # cetak kabupaten & cluster terpilih (tanpa jaringan)
        python3 ujiluas_kab.py jalan [shard n]     # nilai dNBR (jaringan, lanjut dari cache); shard ke-i dari n proses paralel
        python3 ujiluas_kab.py ringkas             # tabel + JSON dari cache
        python3 ujiluas_kab.py uji
"""
import csv, datetime as dt, json, os, statistics, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ujiluas_dnbr as U  # noqa: E402
from wilayah import AKAR, PROVINSI, Poligon, Wilayah  # noqa: E402

FIRMS = os.path.join(AKAR, "data/raw/firms")
BERKAS = {"N20": "viirs_noaa20.csv", "N21": "viirs_noaa21.csv", "N": "viirs.csv"}
CACHE = os.path.join(AKAR, "data/raw/ujiluas_kab")
KELUAR = os.path.join(AKAR, "public/data/ujiluas_kab.json")
TGL = U.TGL
F20, F21, F_LAMA = 4.12, 4.16, 4.3
SEL = 0.0034
N_KAB = int(os.environ.get("UJIKAB_NKAB", 10))
PER_KAB = int(os.environ.get("UJIKAB_PERKAB", 14))
DETIK = int(os.environ.get("UJILUAS_DETIK", 2700))
MIN_PX = 4


def muat():
    import titik_palsu as TP
    industri, _ = TP.sel_industri()
    pts = []
    for sat, nama in BERKAS.items():
        with open(os.path.join(FIRMS, nama)) as f:
            for r in csv.DictReader(f):
                if r["acq_date"] < TGL[0].isoformat() or r["acq_date"] > TGL[1].isoformat() or r["confidence"] not in ("n", "h"):
                    continue
                if TP.sel(r["latitude"], r["longitude"]) in industri:
                    continue
                d = dt.date.fromisoformat(r["acq_date"])
                hm = int(r["acq_time"])
                pts.append({"lat": float(r["latitude"]), "lon": float(r["longitude"]), "px": max(float(r["scan"] or .4), float(r["track"] or .4)), "d": d, "sat": sat,
                            "t": dt.datetime(d.year, d.month, d.day, hm // 100, hm % 100, tzinfo=dt.timezone.utc)})
    return pts


def metrik(c):
    """cluster (titik dengan 'sat','d') -> a (ha, jumlah luas harian), b_px, n_snpp, c (ha lama)."""
    h = {}
    for p in c:
        if p["sat"] in ("N20", "N21"):
            h.setdefault(p["d"], [0, 0])[p["sat"] == "N21"] += 1
    a = sum((x[0] * F20 + x[1] * F21) / 2 for x in h.values())
    bpx = {(round(p["lat"] / SEL), round(p["lon"] / SEL)) for p in c if p["sat"] in ("N20", "N21")}
    ns = sum(1 for p in c if p["sat"] == "N")
    return {"a_ha": round(a, 1), "b_px": len(bpx), "n_n20": sum(x[0] for x in h.values()), "n_n21": sum(x[1] for x in h.values()), "n_snpp": ns, "c_ha": round(ns * F_LAMA, 1)}


def pilih():
    wil, gambut = Wilayah(), Poligon(os.path.join(AKAR, "public/data/lahan/gambut.geojson"))
    pts = muat()
    cl = U.kelompok(pts)
    kab = {}
    for c in cl:
        p = U.profil(c, wil, gambut, SEL)
        if not p:
            continue
        m = metrik(c)
        if m["b_px"] < MIN_PX:
            continue
        w = wil.cari(p["pusat"][1], p["pusat"][0])
        p.update(m, kab=w[1], c_pts=c, kunci=(w[0], w[1]))
        kab.setdefault(p["kunci"], []).append(p)
    rank = sorted(kab, key=lambda k: -sum(p["b_px"] for p in kab[k]))
    mineral = [k for k in rank if sum(p["gambut"] for p in kab[k]) / len(kab[k]) < .35 and len(kab[k]) >= 8]
    rank = [k for k in rank if k not in mineral][:N_KAB - 4] + mineral[:4]       # + 4 kabupaten mineral supaya gambut vs mineral bisa dibandingkan
    return {k: sorted(kab[k], key=lambda p: -p["b_px"])[:PER_KAB] for k in rank}, len(pts), len(cl)


def jalan(shard=0, n=1):
    import citra as C, konsesi_citra_jelas as J, luas_citra as L, garis_api as GA  # noqa: E401
    os.makedirs(CACHE, exist_ok=True)
    pil, _, _ = pilih()
    t0 = time.time()
    antre = [p for i, k in enumerate(pil) if i % n == shard for p in pil[k]]
    # gilir antar kabupaten supaya anggaran habis tak menguras satu kabupaten
    per = {}
    for p in antre:
        per.setdefault(p["kunci"], []).append(p)
    import itertools
    for p in [x for g in itertools.zip_longest(*per.values()) for x in g if x]:
        jb = os.path.join(CACHE, p["id"] + ".json")
        if os.path.exists(jb):
            continue
        if time.time() - t0 > DETIK:
            break
        c = p["c_pts"]
        geom, _ = GA.garis(c)
        p["garis"] = U.cincin_ringan(geom)
        p["api"] = [[round(q["lon"], 4), round(q["lat"], 4)] for q in c[:: max(1, len(c) // 40)]]
        kini = dt.datetime.combine(p["akhir"] + dt.timedelta(days=L.CARI_PASCA_HARI + 1), dt.time(), tzinfo=dt.timezone.utc)
        t1 = time.time()
        h = L.nilai(J, C, U.rekaman(p), kini, lambda: time.time() - t1 > U.DETIK_CLUSTER or time.time() - t0 > DETIK)
        print("%s %s px=%d -> %s (%ds)" % (p["id"], p["kab"], p["b_px"], h and (h.get("luas_ha"), h.get("alasan", "")[:50]), time.time() - t1), file=sys.stderr, flush=True)
        if h is not None:
            json.dump(h, open(jb, "w"), ensure_ascii=False)


def med(v):
    return round(statistics.median(v), 2) if v else None


def ringkas():
    pil, _, _ = pilih()
    baris, kabs, dibuang = [], [], {}
    for k, ps in pil.items():
        ok = []
        for p in ps:
            jb = os.path.join(CACHE, p["id"] + ".json")
            if not os.path.exists(jb):
                dibuang["belum dinilai"] = dibuang.get("belum dinilai", 0) + 1
                continue
            h = json.load(open(jb))
            if h.get("luas_ha") is None:
                al = h.get("alasan", "?")
                al = "tak ada adegan bersih" if "bersih" in al else "sinyal tak melewati latar" if "latar" in al else "cakupan rendah" if "cakupan" in al else al[:40]
                dibuang[al] = dibuang.get(al, 0) + 1
                continue
            ok.append({"id": p["id"], "kab": p["kab"], "prov": PROVINSI[p["prov"]], "gambut": p["gambut"], "awal": p["awal"].isoformat(), "akhir": p["akhir"].isoformat(), "dnbr_ha": h["luas_ha"],
                       "tanpa_kontrol": bool(h.get("tanpa_kontrol")), "a_ha": p["a_ha"], "b_px": p["b_px"], "c_ha": p["c_ha"], "n_n20": p["n_n20"], "n_n21": p["n_n21"], "n_snpp": p["n_snpp"]})
        baris += ok
        if ok:
            s = lambda f: sum(x[f] for x in ok)
            d, a, bp, c = s("dnbr_ha"), s("a_ha"), s("b_px"), s("c_ha")
            kabs.append({"kab": k[1], "prov": PROVINSI[k[0]], "n_cluster": len(ok), "n_dicoba": len(ps), "gambut_cl": sum(x["gambut"] for x in ok), "dnbr_ha": round(d), "a_ha": round(a), "b_px": bp,
                         "b_ha_tersirat_per_px": round(d / bp, 2), "c_ha": round(c), "rasio_a": round(d / a, 2), "rasio_c": round(d / c, 2) if c else None, "rasio_a_per_c": round(a / c, 2) if c else None})
    def strata(f):
        v = [x for x in baris if f(x)]
        return {"n": len(v), "dnbr": round(sum(x["dnbr_ha"] for x in v)), "a": round(sum(x["a_ha"] for x in v)), "c": round(sum(x["c_ha"] for x in v)), "b_px": sum(x["b_px"] for x in v),
                "med_dnbr/a": med([x["dnbr_ha"] / x["a_ha"] for x in v]), "med_dnbr/c": med([x["dnbr_ha"] / x["c_ha"] for x in v if x["c_ha"]]), "med_ha_per_px": med([x["dnbr_ha"] / x["b_px"] for x in v]),
                "p10_p90_dnbr/a": [round(U.kuantil([x["dnbr_ha"] / x["a_ha"] for x in v], q), 2) for q in (.1, .9)] if v else None}
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "periode": [TGL[0].isoformat(), TGL[1].isoformat()],
           "metode": "dNBR>0,27 & NBR pasca<0,2 (luas_citra.nilai); a=sum_hari(N20x4,12+N21x4,16)/2; b=piksel unik N20uN21; c=titik S-NPP x 4,3; semua n/h tanpa sel sumber panas tetap",
           "kabupaten": kabs, "dibuang": dibuang, "semua": strata(lambda x: True), "gambut": strata(lambda x: x["gambut"]), "mineral": strata(lambda x: not x["gambut"]), "cluster": baris}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    for kk in kabs:
        print(kk)
    for n in ("semua", "gambut", "mineral"):
        print(n, out[n])
    print("dibuang", dibuang)


def uji():
    c = [{"sat": "N20", "d": dt.date(2023, 9, 1), "lat": 0, "lon": 0}, {"sat": "N20", "d": dt.date(2023, 9, 1), "lat": 0, "lon": 0.0005}, {"sat": "N21", "d": dt.date(2023, 9, 1), "lat": 0, "lon": 0.1},
         {"sat": "N20", "d": dt.date(2023, 9, 2), "lat": 0, "lon": 0}, {"sat": "N", "d": dt.date(2023, 9, 1), "lat": 0, "lon": 0}]
    m = metrik(c)
    assert m["a_ha"] == round((2 * 4.12 + 1 * 4.16) / 2 + 4.12 / 2, 1) and m["b_px"] == 2 and m["n_snpp"] == 1 and m["c_ha"] == 4.3, m
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["jalan"]:
        jalan(*(map(int, a[1:3]) if len(a) == 3 else (0, 1)))
    elif a == ["ringkas"]:
        ringkas()
    else:
        pil, n, ncl = pilih()
        print("titik %d cluster %d" % (n, ncl))
        for k, ps in pil.items():
            print(k, len(ps), "px", [p["b_px"] for p in ps], "gambut", sum(p["gambut"] for p in ps))
