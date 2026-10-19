"""Pemantauan lahan terbakar 2026 di konsesi: sebelum terbakar SUDAH sawit, atau BUKAN sawit lalu menunjukkan tanda penyiapan kebun?

Pakai:  KONSESI_PROV=16 KONSESI_TOP=3 python3 scripts/data/sawit_pantau.py   # -> public/data/konsesi2026/sawit_pantau.json + citra/*_sebelum_*/_sesudah_*.png
        python3 scripts/data/sawit_pantau.py uji                              # swa-uji klasifikasi (tanpa jaringan)

HASIL INI INDIKASI, BUKAN BUKTI. Per perusahaan (teratas menurut KONSESI_TOP, luas_bakar_ha > 0), kotak konsesi dibagi 80 x 80 sel:
- tanggal bakar sel = adegan Sentinel-2 L2A pertama (sejak SAWIT_DARI) dengan dNBR > 0,27 (acuan NBR tertinggi adegan bersih sebelumnya)
  DAN NBR < 0,2 (sama dengan konsesi_citra_jelas.py); sel di luar poligon konsesi diabaikan;
- baseline: fraksi sawit 2021 per sel dari peta tahun tanam Descals dkk. 2024 (sawit_peta.py; "tahun tanam" = persiapan lahan terakhir,
  replanting ikut; peta berhenti 2021): >= 0,5 "sawit sebelum", < 0,1 "bukan sawit", sisanya "campuran";
- sel "bukan sawit": lintasan NDVI sesudah bakar -> status (lihat klasifikasi). Sel sawit/campuran hanya dihitung luasnya.
Sumber citra: Contains modified Copernicus Sentinel data 2026. Peta sawit: Descals dkk. 2024 (ESSD 16:5111, CC BY 4.0).
"""
import datetime as dt, json, os, statistics, sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import citra as C  # noqa: E402
import konsesi_citra as K  # noqa: E402
import konsesi_citra_jelas as J  # noqa: E402

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DIR = os.path.join(AKAR, "public/data/konsesi2026")
KELUAR = os.path.join(DIR, "citra")
PROV = os.environ.get("KONSESI_PROV", "14,15,16,61,62,63,64,93,53").split(",")
TOP = int(os.environ.get("KONSESI_TOP", 20))
DARI = os.environ.get("SAWIT_DARI", "2026-03-01")
N = J.N

# ambang: hipotesis, belum diuji balik
DNBR_BAKAR = .27       # hipotesis, belum diuji balik (Key & Benson; sama dengan konsesi_citra_jelas)
NBR_BAKAR = .2         # hipotesis, belum diuji balik
SAWIT_SEBELUM = .5     # hipotesis, belum diuji balik: fraksi sawit 2021 >= ini = "sawit sebelum"
BUKAN_SAWIT = .1       # hipotesis, belum diuji balik: fraksi sawit 2021 < ini = "bukan sawit"
HARI_DINI = 60         # hipotesis, belum diuji balik: sebelum ini lintasan belum dinilai
NDVI_HIJAU = .5        # hipotesis, belum diuji balik
NDVI_TERBUKA = .3      # hipotesis, belum diuji balik
SD_SERAGAM = .08       # hipotesis, belum diuji balik: simpangan baku NDVI tetangga 3x3
AWAN_CITRA = 30        # % awan maksimum untuk citra sebelum/sesudah

STATUS = ("terlalu dini", "pulih alami", "hijau seragam", "tetap terbuka", "peralihan")


def kelas_sawit(frak):
    return "sawit sebelum" if frak >= SAWIT_SEBELUM else "bukan sawit" if frak < BUKAN_SAWIT else "campuran"


def status(hari, ndvi, sd):
    """status sel bukan-sawit: hari sejak bakar ke adegan bersih terakhir, NDVI-nya, simpangan baku NDVI tetangga 3x3 (None = tak cukup tetangga)"""
    if hari is None or ndvi is None or hari < HARI_DINI:
        return "terlalu dini"
    if ndvi >= NDVI_HIJAU and sd is not None:
        return "pulih alami" if sd >= SD_SERAGAM else "hijau seragam"
    if ndvi < NDVI_TERBUKA:
        return "tetap terbuka"
    return "peralihan"


def sd_tetangga(g, i):
    y, x = divmod(i, N)
    v = [g[(y + dy) * N + x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)
         if 0 <= y + dy < N and 0 <= x + dx < N and g[(y + dy) * N + x + dx] is not None]
    return statistics.pstdev(v) if len(v) >= 4 else None


def di_konsesi(r, bb):
    """sel (baris 0 = utara) yang pusatnya di dalam poligon konsesi; poligon luar saja, lubang diabaikan"""
    polys = [p[0] for g in r["geom"] for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])]
    kotak = [(min(c[0] for c in p), min(c[1] for c in p), max(c[0] for c in p), max(c[1] for c in p), p) for p in polys]
    dx, dy = (bb[2] - bb[0]) / N, (bb[3] - bb[1]) / N
    ada = [False] * (N * N)
    for i in range(N):
        y = bb[3] - (i + .5) * dy
        for j in range(N):
            x = bb[0] + (j + .5) * dx
            ada[i * N + j] = any(a <= x <= c and b <= y <= d and C.di_dalam(x, y, p) for a, b, c, d, p in kotak)
    return ada


def ndvi_grid(it, lat, lon, km, nbr):
    red, nir = J.pita(it, "red", lat, lon, km), J.pita(it, "nir08", lat, lon, km)
    # pantulan berosifset -0,1 bisa <= 0 pada piksel gelap (bayangan/air tipis): NDVI-nya ~1 palsu, dan "NDVI tertinggi" memperbesarnya -> dibuang
    return [(b - a) / (b + a) if n is not None and a is not None and b is not None and a >= .01 and b >= .01 else None
            for n, a, b in zip(nbr, red, nir)]


def satu(r):
    lat, lon, km = J.kotak_konsesi(r)
    bb = C.kotak(lat, lon, km)
    q = {"collections": ["sentinel-2-l2a"], "bbox": C.kotak(lat, lon, 2), "limit": 100,
         "datetime": f"{DARI}T00:00:00Z/{dt.date.today().isoformat()}T23:59:59Z",
         "query": {"eo:cloud_cover": {"lt": 85}}, "sortby": [{"field": "properties.datetime", "direction": "asc"}]}
    adegan, lihat = [], set()
    for it in json.loads(C.ambil(C.STAC, data=json.dumps(q).encode()))["features"]:
        tgl = it["properties"]["datetime"][:10]
        if tgl in lihat:
            continue
        try:
            v = J.sampel(it, lat, lon, km)
            if v:
                adegan.append({"tgl": tgl, "it": it, "nbr": v[0], "aw": v[2], "ndvi": ndvi_grid(it, lat, lon, km, v[0])})
                lihat.add(tgl)
        except Exception as e:
            print("  gagal", it["id"], e, file=sys.stderr)
    ada = di_konsesi(r, bb)
    ha = (km * 1000 / N) ** 2 / 1e4
    # tanggal bakar per sel
    acuan, bakar = [None] * (N * N), [None] * (N * N)   # bakar[i] = indeks adegan
    for k, a in enumerate(adegan):
        for i, v in enumerate(a["nbr"]):
            if v is None:
                continue
            if bakar[i] is None and ada[i] and acuan[i] is not None and acuan[i] - v > DNBR_BAKAR and v < NBR_BAKAR:
                bakar[i] = k
            if acuan[i] is None or v > acuan[i]:
                acuan[i] = v
    terbakar = [i for i in range(N * N) if bakar[i] is not None]
    import sawit_peta as S
    peta = S.tahun_tanam(*bb, N) if terbakar else []
    kelas = {"sawit sebelum": 0, "bukan sawit": 0, "campuran": 0}
    st = {s: 0 for s in STATUS}
    nd_sebelum = {k: [] for k in kelas}
    for i in terbakar:
        p = peta[i]
        if p is None:
            continue
        kl = kelas_sawit(p[0])
        kelas[kl] += 1
        k0 = bakar[i]
        pre = [adegan[k]["ndvi"][i] for k in range(k0) if adegan[k]["ndvi"][i] is not None]
        if pre:
            nd_sebelum[kl].append(max(pre))
        if kl != "bukan sawit":
            continue
        d0 = dt.date.fromisoformat(adegan[k0]["tgl"])
        sesudah = [k for k in range(k0 + 1, len(adegan)) if adegan[k]["ndvi"][i] is not None]
        if not sesudah:
            st["terlalu dini"] += 1
            continue
        k = sesudah[-1]
        st[status((dt.date.fromisoformat(adegan[k]["tgl"]) - d0).days, adegan[k]["ndvi"][i], sd_tetangga(adegan[k]["ndvi"], i))] += 1
    out = {"nama": r["nama"], "jenis": r["jenis"], "bakar_hotspot_ha": r["luas_bakar_ha"],
           "bakar_ha": round(len(terbakar) * ha), "sawit_sebelum_ha": round(kelas["sawit sebelum"] * ha),
           "bukan_sawit_ha": round(kelas["bukan sawit"] * ha), "campuran_ha": round(kelas["campuran"] * ha),
           "status_ha": {s: round(v * ha) for s, v in st.items()},
           "ndvi_sebelum_median": {k: round(statistics.median(v), 2) for k, v in nd_sebelum.items() if v},
           "sel_ha": round(ha, 1), "adegan": len(adegan), "bbox": bb, "tgl_bakar_median": None, "citra_sebelum": None, "citra_sesudah": None}
    if not terbakar:
        return out
    med = sorted(adegan[bakar[i]]["tgl"] for i in terbakar)[len(terbakar) // 2]
    out["tgl_bakar_median"] = med
    bersih = [a for a in adegan if a["aw"] <= AWAN_CITRA]
    for kunci, a in (("citra_sebelum", max((a for a in bersih if a["tgl"] < med), key=lambda a: a["tgl"], default=None)),
                     ("citra_sesudah", max((a for a in bersih if a["tgl"] > med), key=lambda a: a["tgl"], default=None))):
        if a:
            f = f"{r['id']}_{kunci[6:]}_{a['tgl'].replace('-', '')}.png"
            if not os.path.exists(os.path.join(KELUAR, f)):
                K.swir(a["it"], lat, lon, km, os.path.join(KELUAR, f))
            out[kunci] = {"f": f"konsesi2026/citra/{f}", "tgl": a["tgl"], "awan": a["aw"]}
    print(f"  {r['nama']}: {len(adegan)} adegan, bakar {out['bakar_ha']} ha (hotspot {r['luas_bakar_ha']}), sawit {out['sawit_sebelum_ha']} "
          f"bukan {out['bukan_sawit_ha']} campuran {out['campuran_ha']}, {out['status_ha']}", file=sys.stderr)
    return out


def main():
    os.makedirs(KELUAR, exist_ok=True)
    jalur = os.path.join(DIR, "sawit_pantau.json")
    ada = json.load(open(jalur)) if os.path.exists(jalur) else {}
    hasil = ada.get("perusahaan", {})
    rs = [r for k in PROV if os.path.exists(os.path.join(DIR, f"{k}.json"))
          for r in [x for x in json.load(open(os.path.join(DIR, f"{k}.json")))["perusahaan"] if (x.get("luas_bakar_ha") or 0) > 0][:TOP]
          if os.environ.get("KONSESI_ULANG") or r["id"] not in hasil]
    print(f"{len(rs)} konsesi", file=sys.stderr)
    prov = {r["id"]: k for k in PROV if os.path.exists(os.path.join(DIR, f"{k}.json"))
            for r in json.load(open(os.path.join(DIR, f"{k}.json")))["perusahaan"]}

    def jalan(r):
        try:
            return r["id"], satu(r)
        except Exception as e:
            print("  gagal", r["nama"], e, file=sys.stderr)
            return r["id"], None
    with ThreadPoolExecutor(int(os.environ.get("KONSESI_UTAS", 3))) as ex:
        for rid, h in ex.map(jalan, rs):
            if h is not None:
                h["prov"] = prov.get(rid)
                hasil[rid] = h
            json.dump({"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
                       "sumber": ["Contains modified Copernicus Sentinel data 2026 (Sentinel-2 L2A)",
                                  "Descals, A. dkk. 2024, Global mapping of oil palm planting year 1990-2021, ESSD 16:5111, Zenodo 10.5281/zenodo.13379129, CC BY 4.0"],
                       "catatan": "Indikasi, bukan bukti. Sawit sebelum = fraksi sawit 2021 >= 0,5 pada sel ~500 m; bukan sawit = < 0,1. Peta sawit berhenti 2021 dan 'tahun tanam' "
                                  "= persiapan lahan terakhir (replanting ikut). Status 'tetap terbuka' / 'hijau seragam' pada sel bukan sawit hanya hipotesis penyiapan kebun; "
                                  "ambang belum diuji balik.",
                       "perusahaan": hasil}, open(jalur, "w"), separators=(",", ":"), ensure_ascii=False)
    print(f"sawit_pantau.json: {len(hasil)} perusahaan", file=sys.stderr)


def uji():
    assert status(None, .6, .1) == "terlalu dini" and status(59, .2, .1) == "terlalu dini"
    assert status(90, None, .1) == "terlalu dini"
    assert status(90, .7, .12) == "pulih alami" and status(90, .7, .03) == "hijau seragam"
    assert status(90, .2, .01) == "tetap terbuka" and status(90, .4, .1) == "peralihan"
    assert status(90, .7, None) == "peralihan"
    assert kelas_sawit(.5) == "sawit sebelum" and kelas_sawit(.09) == "bukan sawit" and kelas_sawit(.3) == "campuran"
    g = [None] * (N * N)
    for k, v in enumerate((.5, .5, .5, .5, .5, .5, .5, .5, .5)):
        g[(k // 3) * N + k % 3] = v
    assert sd_tetangga(g, N + 1) == 0 and sd_tetangga(g, N * 40 + 40) is None
    print("uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
