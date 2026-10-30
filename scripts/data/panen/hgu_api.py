"""#5 Residivis api di konsesi sawit (PROKSI HGU) -> public/data/hgu_api.json

AKSES: ATR/BPN Bhumi (bhumi.atrbpn.go.id) TIDAK dipakai. Dibuktikan 30 Okt 2026: robots.txt mengizinkan, tetapi aplikasinya
  peta Next.js tanpa API data/unduhan terdokumentasi, tanpa syarat pakai yang bisa dibaca, dan bantuan hanya soal tampilan.
  Mengambil poligon HGU berarti memanggil backend privat aplikasi -> BERHENTI, dilaporkan ke pemilik (butuh izin/data resmi ATR/BPN).
PROKSI jujur: konsesi sawit Kemenhut (data 2012, diperbarui 2014) via Global Forest Watch di public/data/lahan/konsesi.geojson
  (jenis "sawit"). Bukan HGU; tidak semua HGU ada; batas 2014. Nama pemegang TIDAK dikeluarkan (kebijakan situs).
Riwayat: public/data/riwayat_sel/*.json (VIIRS S-NPP 2012-2026, sel 0,05 derajat, hitung titik per tahun `y`).
  Sel dipasang ke konsesi bila titik tengah sel jatuh di dalamnya; konsesi dipakai bila >= 2 sel (~>= 6.000 ha).
Rumus (unit u, tahun t, 2012..2025; 2026 belum lengkap):
  cnt[u,t] = jumlah titik sel-sel u pada tahun t;  terbakar[u,t] = cnt >= AMBANG(10)
  residivis[u,t] = sum_{s<=t} terbakar[u,s] / (t - 2012 + 1)           (tahun berapi / tahun teramati)
Model: P(terbakar[u,t+1] | riwayat sampai t), regresi logistik pada [residivis, terbakar_t, log1p(cnt_t), tahun_sejak_api, log(sel)].
  Latih: sasaran 2016..2022; UJI: sasaran 2023..2025 (pembagian waktu, fitur hanya <= t).
  Pembanding: persistensi (prediksi = terbakar_t) dan laju dasar latih. LOLOS bila AUC > AUC persistensi + 0,02
  DAN Brier < Brier laju dasar.  Hasil ditulis apa adanya.
Keterbatasan: sel hanya tersimpan bila total titik >= min_titik (5); titik 2012 belum penuh setahun; sel bisa dibagi dua konsesi."""
import json, os, sys, glob, math, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
from panen_util import auc, brier, logit_fit, logit_pred, tulis
from ps import Poligon

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
D = os.path.join(RAIZ, "public", "data")
T0 = 2012
AMBANG = 10
T_AKHIR = 2025


def terbakar(cnt, ambang=AMBANG):
    return [1 if c >= ambang else 0 for c in cnt]


def fitur(cnt, t, ambang=AMBANG):
    """Fitur untuk meramal tahun t+1 dari riwayat <= t. cnt = jumlah titik per tahun mulai T0."""
    b = terbakar(cnt[:t - T0 + 1], ambang)
    res = sum(b) / len(b)
    sejak = 0
    for v in reversed(b):
        if v: break
        sejak += 1
    return [res, b[-1], math.log1p(cnt[t - T0]), min(sejak, len(b))]


def kumpul():
    uk = json.load(open(os.path.join(D, "lahan", "konsesi.geojson")))
    sw = []
    for f in uk["features"]:
        if f["properties"].get("jenis") != "sawit" or f["geometry"]["type"] not in ("Polygon", "MultiPolygon"): continue
        g = f["geometry"]; polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        sw.append((len(sw), [r for p in polys for r in p], f["properties"].get("prov")))
    pol = Poligon([(i, r) for i, r, _ in sw], g=0.25)
    cnt = {}
    for p in glob.glob(os.path.join(D, "riwayat_sel", "*.json")):
        d = json.load(open(p)); s = d["sel"]; assert d["th0"] == T0 and s == 0.05, p
        for k, c in d["c"].items():
            ix, iy = map(int, k.split("_")); lon = d["x0"] + (ix + .5) * s; lat = d["y1"] - (iy + .5) * s
            for u in pol.cari(lon, lat):
                a = cnt.setdefault(u, {"sel": 0, "y": [0] * (T_AKHIR - T0 + 1), "prov": sw[u][2]})
                a["sel"] += 1
                for i in range(len(a["y"])): a["y"][i] += c["y"][i]
    return sw, {u: a for u, a in cnt.items() if a["sel"] >= 2}, len(uk["features"])


def sampel(units, t_lo, t_hi):
    X, y, meta = [], [], []
    for u, a in units.items():
        for t in range(t_lo - 1, t_hi):  # sasaran t+1 di [t_lo, t_hi]
            if t - T0 + 1 < 4: continue
            X.append(fitur(a["y"], t) + [math.log(a["sel"])])
            y.append(terbakar(a["y"])[t + 1 - T0]); meta.append((u, t + 1))
    return X, y, meta


def evaluasi(units):
    Xl, yl, _ = sampel(units, 2016, 2022); Xu, yu, mu = sampel(units, 2023, T_AKHIR)
    m = logit_fit(Xl, yl); p = logit_pred(m, Xu)
    base = sum(yl) / len(yl); per = [x[1] for x in Xu]; resi = [x[0] for x in Xu]
    def f1(pred):
        tp = sum(1 for a, b in zip(pred, yu) if a and b); fp = sum(1 for a, b in zip(pred, yu) if a and not b); fn = sum(1 for a, b in zip(pred, yu) if not a and b)
        pr = tp / (tp + fp) if tp + fp else 0; rc = tp / (tp + fn) if tp + fn else 0
        return round(2 * pr * rc / (pr + rc), 3) if pr + rc else 0.0
    r = {"n_latih": len(yl), "n_uji": len(yu), "laju_api_latih": round(base, 3), "laju_api_uji": round(sum(yu) / len(yu), 3),
         "unit": len(units), "ambang_titik": AMBANG,
         "auc_model": round(auc(yu, p), 3), "auc_persistensi": round(auc(yu, per), 3), "auc_residivis_saja": round(auc(yu, resi), 3),
         "brier_model": round(brier(yu, p), 4), "brier_laju_dasar": round(brier(yu, [base] * len(yu)), 4),
         "brier_persistensi": round(brier(yu, per), 4),
         "f1_model@0.5": f1([1 if x >= .5 else 0 for x in p]), "f1_persistensi": f1(per),
         "koef_std": dict(zip(["intersep", "residivis", "terbakar_t", "log_cnt_t", "tahun_sejak_api", "log_sel"], [round(w, 3) for w in m["w"]]))}
    ok = r["auc_model"] > r["auc_persistensi"] + .02 and r["brier_model"] < r["brier_laju_dasar"]
    r["vonis"] = "LOLOS" if ok else "GAGAL"
    r["alasan"] = (f"AUC model {r['auc_model']} vs persistensi {r['auc_persistensi']} (syarat +0,02); "
                   f"Brier model {r['brier_model']} vs laju dasar {r['brier_laju_dasar']}")
    return r, m


def main():
    sw, units, nkons = kumpul()
    ev, m = evaluasi(units)
    # indeks residivis terkini per provinsi (rata-rata tertimbang sel) dan 15 konsesi tertinggi, tanpa nama
    per_prov = {}
    rows = []
    for u, a in units.items():
        b = terbakar(a["y"]); res = sum(b) / len(b)
        e = per_prov.setdefault(a["prov"] or "?", {"unit": 0, "sel": 0, "res_x_sel": 0.0, "terbakar_2025": 0})
        e["unit"] += 1; e["sel"] += a["sel"]; e["res_x_sel"] += res * a["sel"]; e["terbakar_2025"] += b[-1]
        rows.append((res, a["sel"], u))
    for e in per_prov.values():
        e["residivis_rata"] = round(e.pop("res_x_sel") / e["sel"], 3)
    rows.sort(reverse=True)
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
           "jenis": "model prediksi (diuji balik, pembagian waktu)",
           "sumber_poligon": "PROKSI: konsesi sawit Kemenhut/GFW (2014), BUKAN HGU ATR/BPN Bhumi (akses ditolak/tak ada API resmi; lihat docstring)",
           "cakupan": {"konsesi_sawit_total": len(sw), "unit_terpakai_(>=2 sel)": len(units)},
           "rumus": "residivis = tahun berapi / tahun teramati; terbakar = titik VIIRS tahun itu >= 10",
           "uji_balik": ev,
           "catatan": ["Laju api tinggi (~75% unit-tahun) karena sel riwayat hanya disimpan bila total titik >= 5 (seleksi pada sel yang pernah berapi, termasuk tahun uji): AUC bisa terlalu optimistis.",
                       "Indeks residivis SAJA (AUC %s) setara model penuh (AUC %s): nilai tambah fitur lain kecil." % (ev["auc_residivis_saja"], ev["auc_model"]),
                       "Pemasangan sel ke konsesi memakai titik tengah sel 0,05 derajat; sel bisa terbagi antar konsesi."],
           "per_provinsi": dict(sorted(per_prov.items(), key=lambda x: -x[1]["sel"])[:20]),
           "unit_residivis_tertinggi": [{"residivis": round(r, 3), "sel": s, "prov": units[u]["prov"], "titik_per_tahun": units[u]["y"]} for r, s, u in rows[:15]],
           "atribusi": "Kemenhut via Global Forest Watch (gfw_oil_palm v20191031); NASA FIRMS VIIRS S-NPP",
           "lisensi": "GFW/Kemenhut terbuka dengan atribusi; tanpa nama pemegang"}
    print(tulis(os.path.join(D, "hgu_api.json"), out), "bita"); print(json.dumps(ev, ensure_ascii=False, indent=1))


def uji():
    c = [0, 12, 0, 30, 0, 0, 11] + [0] * 7
    assert terbakar(c)[:7] == [0, 1, 0, 1, 0, 0, 1]
    f = fitur(c, 2018)  # riwayat 2012..2018: 3 tahun berapi dari 7, terbakar_t=1, sejak=0
    assert abs(f[0] - 3 / 7) < 1e-9 and f[1] == 1 and f[3] == 0
    f = fitur(c, 2019)
    assert f[1] == 0 and f[3] == 1
    print("hgu_api uji OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
