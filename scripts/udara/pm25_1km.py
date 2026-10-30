"""#11 MAIAC AOD 1 km -> PM2,5: model + uji tinggalkan-satu-stasiun. STATUS: MODEL SIAP, MASUKAN AOD BELUM TERAMBIL.

Rumus : PM25 = b0 + b1*AOD + b2*BLH + b3*RH + efek provinsi (intersep per provinsi, ridge ke rata-rata global bila provinsi < 5 pasangan).
        Fitur: AOD047 MAIAC (MCD19A2 v061, Optical_Depth_047, QA bersih), BLH dan RH jam lintasan dari Open-Meteo, label = PM2,5 harian stasiun BMKG.
Uji   : leave-one-station-out; R2 dan RMSE dikumpulkan dari prakiraan tiap stasiun yang ditinggalkan; pembanding = rata-rata latih (klimatologi, R2 = 0 by construction)
        dan CAMS mentah bila ada. LOLOS hanya bila RMSE LOSO < RMSE klimatologi DAN R2 > 0,1 dengan >= 10 stasiun dan >= 100 pasangan.
Hambatan terukur 29 Okt 2026 (jangan diulang tanpa mengubah salah satunya):
  - MCD19A2 hanya HDF4-EOS. Mesin ini: GDAL tanpa driver HDF4, tanpa pyhdf/h4dump; runner CI Ubuntu belum diperiksa.
  - ladsweb.modaps.eosdis.nasa.gov/opendap menolak token Bearer EARTHDATA_TOKEN (401 HTTP Basic); /archive/.../290.csv kena timeout 90 dtk.
  - Liputan: AOD MAIAC hanya langit cerah; musim asap/awan Indonesia diperkirakan membuat pasangan stasiun-hari jauh lebih sedikit dari 27 x 13.
Karena itu modul ini TIDAK menulis pm25_1km.json (tidak ada angka palsu). Jalur lanjut: pasang pembaca HDF4 (pyhdf / GDAL+HDF4) di lab.yml atau lokal, isi `pasangan.json`
  [[stasiun, prov, tanggal, aod, blh, rh, pm25], ...] lalu `python3 scripts/udara/pm25_1km.py pasangan.json`.
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pm25_mos as m


def desain(r, provs):
    return [1.0, r[3], r[4], r[5]] + [1.0 if r[1] == p else 0.0 for p in provs[1:]]


def loso(pas):
    """pas = [(stasiun, prov, tanggal, aod, blh, rh, pm25)] -> dict hasil LOSO atau None bila terlalu sedikit."""
    st = sorted({r[0] for r in pas})
    if len(st) < 10 or len(pas) < 100:
        return {"vonis": "DATA KURANG", "n_stasiun": len(st), "n_pasangan": len(pas)}
    provs = sorted({r[1] for r in pas})
    sq, sqk, y_all, p_all = 0.0, 0.0, [], []
    for s in st:
        L, U = [r for r in pas if r[0] != s], [r for r in pas if r[0] == s]
        pv = sorted({r[1] for r in L})
        try:
            b = m.ols([desain(r, pv) for r in L], [r[6] for r in L], ridge=1.0)
        except ValueError:
            continue
        rata = sum(r[6] for r in L) / len(L)
        for r in U:
            pr = sum(c * x for c, x in zip(b, desain(r, pv))) if r[1] in pv else rata   # provinsi tak terlihat: rata-rata latih
            sq += (pr - r[6]) ** 2
            sqk += (rata - r[6]) ** 2
            y_all.append(r[6])
            p_all.append(pr)
    n = len(y_all)
    rmse, rmse_k = math.sqrt(sq / n), math.sqrt(sqk / n)
    ym = sum(y_all) / n
    r2 = 1 - sq / sum((y - ym) ** 2 for y in y_all)
    return {"n_stasiun": len(st), "n_pasangan": n, "rmse_loso": round(rmse, 2), "rmse_klimatologi": round(rmse_k, 2), "r2_loso": round(r2, 3),
            "vonis": "LOLOS" if rmse < rmse_k and r2 > 0.1 else "GAGAL"}


def uji():
    import random
    rng = random.Random(4)
    pas = []
    for s in range(14):
        for d in range(12):
            aod, blh, rh = rng.random() * 1.5, 300 + rng.random() * 1500, 50 + rng.random() * 40
            pas.append((f"S{s}", "11" if s < 7 else "12", f"d{d}", aod, blh, rh, 8 + 60 * aod - 0.01 * blh + 0.1 * rh + rng.gauss(0, 4)))
    r = loso(pas)
    assert r["vonis"] == "LOLOS" and r["r2_loso"] > 0.6, r
    acak = [(a, b, c, d, e, f, rng.gauss(30, 10)) for a, b, c, d, e, f, g in pas]
    assert loso(acak)["vonis"] == "GAGAL"
    assert loso(pas[:20])["vonis"] == "DATA KURANG"
    print("pm25_1km uji ok")


if __name__ == "__main__":
    if sys.argv[1:2] and sys.argv[1] != "uji":
        print(loso([tuple(x) for x in json.load(open(sys.argv[1]))]))
    else:
        m.uji()
        uji()
