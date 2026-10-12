"""Peluang FWI 7 hari dari ansambel ECMWF IFS 0,25 derajat (51 anggota) -> public/data/fwi_ansambel.json

Tiap anggota menjalankan sistem FWI (fwi.py) dari keadaan FFMC/DMC/DC hari ini di fwi.json, memakai cuaca
jam 12 waktu setempat + hujan 24 jam (13.00 kemarin s.d. 12.00), sama dengan harian.cuaca_fwi.
Per sel per hari (besok .. +7):  pt = P(FWI >= 7, Tinggi), ps = P(FWI >= 14, Sangat Tinggi),
med/p10/p90 FWI, ph = P(hujan 24 jam >= 5 mm). Peluang = pecahan anggota.

Kuota Open-Meteo: bobot = lokasi x 4 variabel x 51 anggota / 10 = 20,4 per lokasi (8 hari < 14).
Jadi cuaca diambil sekali per kotak 1 derajat (sel 0,5 derajat terdekat ke pusat kotak), lalu dipakai
semua sel 0,5 derajat di kotak itu, masing-masing dengan keadaan FFMC/DMC/DC-nya sendiri.
  ANSAMBEL_CAKUPAN=prioritas (bawaan): 9 provinsi prioritas, 96 kotak = ~1.960 panggilan/hari
  ANSAMBEL_CAKUPAN=semua: 235 kotak = ~4.800 panggilan/hari
Model cadangan bila ECMWF gagal: gfs025 (31 anggota, 12,4 per lokasi).

Pakai:  python3 scripts/data/ansambel.py      |  python3 scripts/data/ansambel.py uji
Jalankan setelah harian.py. Keadaan awal = kode fwi.json pada hari sebelum hari pertama ansambel (hari ini bila
fwi.json segar; bila basi, prakiraan deterministik fwi.json untuk hari itu, atau hari terakhir yang ada).
"""
import datetime as dt, json, math, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(1, os.path.join(os.path.dirname(__file__), "..", "banjir"))
import fwi as F
from umum import KuotaHabis, ambil, per_lokasi, simpan
from wilayah import AKAR, PRIORITAS

KELUAR = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
URL = "https://ensemble-api.open-meteo.com/v1/ensemble"
VAR = ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "precipitation"]
MODEL = ["ecmwf_ifs025", "gfs025"]
PER_PANGGIL = 8  # 8 lokasi x 51 anggota x 4 var x 192 jam ~ 3 MB JSON per respons
HARI = 7


def persentil(xs, q):
    s = sorted(xs)
    k = (len(s) - 1) * q / 100
    i = int(k)
    return s[i] if i + 1 >= len(s) else s[i] + (s[i + 1] - s[i]) * (k - i)


def bobot(lokasi, n_var, anggota, hari):
    """Rumus kuota Open-Meteo (ForecastApiResult.calculateQueryWeight): per lokasi max(1, v/10 * max(1, hari/14))."""
    return lokasi * max(1.0, n_var * anggota / 10 * max(1.0, hari / 14))


def anggota(h):
    """Respons ansambel -> daftar akhiran anggota: '' (kontrol), '_member01', ..."""
    return [""] + sorted(k[len(VAR[0]):] for k in h if k.startswith(VAR[0] + "_member"))


def siang(h, akhiran):
    """Satu anggota -> [(tgl, t, rh, ws, hujan24)] tiap jam 12 lokal yang punya 24 jam sebelumnya."""
    out = []
    for i, w in enumerate(h["time"]):
        if not w.endswith("T12:00") or i < 23:
            continue
        hj = h["precipitation" + akhiran][i - 23:i + 1]
        out.append((w[:10], h["temperature_2m" + akhiran][i], h["relative_humidity_2m" + akhiran][i],
                    h["wind_speed_10m" + akhiran][i], None if any(x is None for x in hj) else sum(hj)))
    return out


def ringkas(seri_anggota, hujan_anggota):
    """seri_anggota: [[fwi hari 0..n] per anggota]; -> dict pt/ps/med/p10/p90/ph per hari."""
    n = len(seri_anggota[0])
    out = {k: [] for k in ("pt", "ps", "med", "p10", "p90", "ph")}
    for d in range(n):
        v = [s[d] for s in seri_anggota if s[d] is not None]
        r = [s[d] for s in hujan_anggota if s[d] is not None]
        if not v:
            for k in out:
                out[k].append(None)
            continue
        out["pt"].append(round(sum(x >= 7 for x in v) / len(v), 2))
        out["ps"].append(round(sum(x >= 14 for x in v) / len(v), 2))
        out["med"].append(round(persentil(v, 50), 1))
        out["p10"].append(round(persentil(v, 10), 1))
        out["p90"].append(round(persentil(v, 90), 1))
        out["ph"].append(round(sum(x >= 5 for x in r) / len(r), 2) if r else None)
    return out


def kode_hari_ini(g, tgl):
    """Keadaan FFMC/DMC/DC sel pada tgl (atau hari terakhir <= tgl) dari fwi.json."""
    hs = [h for h in g["hari"] if h["tgl"] <= tgl]
    return (hs[-1]["tgl"], (hs[-1]["ffmc"], hs[-1]["dmc"], hs[-1]["dc"])) if hs else (None, F.AWAL)


def main():
    t0 = time.time()
    fj = json.load(open(os.path.join(KELUAR, "fwi.json")))
    tgl0 = fj["hari_ini"]
    semua = os.environ.get("ANSAMBEL_CAKUPAN", "prioritas") == "semua"
    sel = [g for g in fj["grid"] if semua or g["prov"] in PRIORITAS]
    kotak = {}
    for g in sel:
        kotak.setdefault((math.floor(g["lat"]), math.floor(g["lon"])), []).append(g)
    contoh = [min(gs, key=lambda g: (g["lat"] - k[0] - .5) ** 2 + (g["lon"] - k[1] - .5) ** 2) for k, gs in kotak.items()]
    print(f"{len(sel)} sel, {len(kotak)} kotak 1 derajat, hari_ini fwi.json {tgl0}", file=sys.stderr)

    cuaca, model, n_ang, total = {}, None, 0, 0.0
    for m in MODEL:
        try:
            for a in range(0, len(contoh), PER_PANGGIL):
                b = contoh[a:a + PER_PANGGIL]
                q = {"latitude": ",".join(str(g["lat"]) for g in b), "longitude": ",".join(str(g["lon"]) for g in b),
                     "models": m, "hourly": ",".join(VAR), "forecast_days": HARI + 1, "timezone": "auto"}
                for g, d in zip(b, per_lokasi(ambil(URL + "?" + urllib.parse.urlencode(q), batas_waktu=240))):
                    h = d["hourly"]
                    ak = anggota(h)
                    n_ang = len(ak)
                    cuaca[(g["lat"], g["lon"])] = [siang(h, x) for x in ak]
                w = bobot(len(b), len(VAR), n_ang, HARI + 1)
                total += w
                print(f"  {m} {a + len(b)}/{len(contoh)} ({n_ang} anggota, kuota ~{total:.0f})", file=sys.stderr)
                time.sleep(w / 9)  # batas 600 panggilan/menit: ~540/menit
            model = m
            break
        except KuotaHabis:
            raise
        except Exception as e:
            print(f"  {m} gagal: {e}; coba model berikutnya", file=sys.stderr)
            cuaca, total = {}, total
    if not model:
        sys.exit("ansambel gagal untuk semua model")

    hari, keluar = None, []
    for k, gs in kotak.items():
        c = min(gs, key=lambda g: (g["lat"] - k[0] - .5) ** 2 + (g["lon"] - k[1] - .5) ** 2)
        per_ang = cuaca[(c["lat"], c["lon"])]
        mulai = per_ang[0][0][0]  # hari pertama ansambel (besok); keadaan diambil sehari sebelumnya
        kemarin = (dt.date.fromisoformat(mulai) - dt.timedelta(days=1)).isoformat()
        for g in gs:
            t_awal, kode = kode_hari_ini(g, kemarin)
            fwis, hujan = [], []
            for hs in per_ang:
                hs = [x for x in hs if t_awal is None or x[0] > t_awal][:HARI]
                hari = hari or [x[0] for x in hs]
                fwis.append([s["fwi"] for s in F.deret([x[1:] for x in hs], awal=kode)])
                hujan.append([x[4] for x in hs])
            keluar.append({"lat": g["lat"], "lon": g["lon"], "prov": g["prov"], **ringkas(fwis, hujan)})
    keluar.sort(key=lambda g: (g["lat"], g["lon"]))
    simpan(os.path.join(KELUAR, "fwi_ansambel.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "model": model, "anggota": n_ang, "hari": hari,
        "sel": 0.5, "awal": tgl0, "cakupan": "semua" if semua else "prioritas", "sampel_cuaca": 1.0, "grid": keluar})
    kuat = sum(1 for g in keluar if any((x or 0) >= 0.8 for x in g["ps"]))
    print(f"fwi_ansambel.json: {len(keluar)} sel, hari {hari}, sel dengan P(FWI>=14) >= 0,8 di salah satu hari: {kuat}; "
          f"kuota ~{total:.0f}; {os.path.getsize(os.path.join(KELUAR, 'fwi_ansambel.json')) / 1024:.0f} KB; {time.time() - t0:.0f} dtk",
          file=sys.stderr)


def uji():
    assert abs(bobot(1, 4, 51, 8) - 20.4) < 1e-9 and bobot(100, 4, 1, 14) == 100 and abs(bobot(1, 2, 1, 4018) - 57.4) < 1e-9
    h = {"time": [f"2026-10-{13 + i // 24:02d}T{i % 24:02d}:00" for i in range(72)],
         "temperature_2m": [30] * 72, "temperature_2m_member01": [31] * 72,
         "relative_humidity_2m": [50] * 72, "relative_humidity_2m_member01": [40] * 72,
         "wind_speed_10m": [10] * 72, "wind_speed_10m_member01": [10] * 72,
         "precipitation": [0] * 72, "precipitation_member01": [1] * 72}
    ak = anggota(h)
    assert ak == ["", "_member01"], ak
    s = siang(h, "_member01")
    assert [x[0] for x in s] == ["2026-10-14", "2026-10-15"] and s[0][4] == 24, s  # hari ini (jam 12 < 23 jam data) dilewati
    r = ringkas([[5, 15], [8, 20], [1, None]], [[0, 6], [10, None], [5, 0]])
    assert r["pt"] == [0.33, 1.0] and r["ps"] == [0.0, 1.0] and r["med"] == [5, 17.5] and r["ph"] == [0.67, 0.5], r
    g = {"hari": [{"tgl": "2026-10-12", "ffmc": 90, "dmc": 50, "dc": 600}, {"tgl": "2026-10-13", "ffmc": 91, "dmc": 51, "dc": 605}]}
    assert kode_hari_ini(g, "2026-10-12") == ("2026-10-12", (90, 50, 600))
    print("ok ansambel")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
