"""Kurva kelembapan tanah bulanan per provinsi gambut -> public/data/tanah_gambut_bulanan.json  (tiket PKH-43)

Sumber: ERA5-Land (Open-Meteo archive, models=era5_land), lapisan sama dengan tanah.py (0-7 dan 7-28 cm, m3/m3).
Provinsi gambut = provinsi yang punya KHG di public/data/khg_prioritas.json. Wakil tiap provinsi = sampai 3 KHG terluas;
titiknya (centroid poligon KHG dari data/raw/khg, hanya ada di mesin lokal) disimpan di data/gambut_titik.json supaya CI
tak butuh poligon. Nilai provinsi = rata-rata titik berbobot luas KHG. Ini model tanah MINERAL (lihat catatan tanah.py):
bukan muka air gambut. null = bulan belum ada data; tidak pernah 0 pengganti kosong.
normal = rata-rata nilai bulanan 2015-2025 (memuat 2015, 2019, 2023). Bulan tahun berjalan tak penuh memuat `hari`.

Pakai:  python3 scripts/data/tanah_gambut.py   |   python3 scripts/data/tanah_gambut.py uji
"""
import datetime as dt, glob, json, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(1, os.path.join(os.path.dirname(__file__), "..", "banjir"))
from umum import ambil, per_lokasi, simpan
from wilayah import AKAR

TITIK = os.path.join(AKAR, "data/gambut_titik.json")
KELUAR = os.path.join(AKAR, "public/data/tanah_gambut_bulanan.json")
WIB = dt.timezone(dt.timedelta(hours=7))
VAR = ["soil_moisture_0_to_7cm_mean", "soil_moisture_7_to_28cm_mean"]
PEMBANDING = [2015, 2019, 2023]
NORMAL = (2015, 2025)
PER_PROV = 3


def titik_gambut():
    """{prov: [{kode, luas_ha, lat, lon}]}; dari cache repo, atau dibangun dari poligon KHG lokal."""
    if os.path.exists(TITIK):
        return json.load(open(TITIK))["prov"]
    luas = {e["kode"]: e for e in json.load(open(os.path.join(AKAR, "public/data/khg_prioritas.json")))["khg"]}
    pusat = {}
    for f in glob.glob(os.path.join(AKAR, "data/raw/khg/hal_*.json")):
        for ft in json.load(open(f))["features"]:
            g = ft["geometry"]
            bag = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            p = [c for b in bag for c in b[0]]  # ponytail: rata-rata simpul cincin luar, cukup untuk sel 9 km
            pusat[ft["properties"]["kode_khg"]] = (round(sum(c[1] for c in p) / len(p), 3), round(sum(c[0] for c in p) / len(p), 3))
    out = {}
    for kode, e in sorted(luas.items(), key=lambda x: -x[1]["luas_ha"]):
        if kode in pusat and len(out.get(e["prov"], [])) < PER_PROV:
            out.setdefault(e["prov"], []).append({"kode": kode, "luas_ha": e["luas_ha"], "lat": pusat[kode][0], "lon": pusat[kode][1]})
    simpan(TITIK, {"sumber": "centroid poligon KHG BRGM PRIMS (data/raw/khg), 3 KHG terluas per provinsi", "prov": out})
    return out


def bulanan(seri, awal):
    """{tgl: nilai|None} -> {(tahun, bulan): (rata-rata, jumlah hari)}."""
    per = {}
    for t, v in seri.items():
        if v is not None and t >= awal:
            per.setdefault((int(t[:4]), int(t[5:7])), []).append(v)
    return {k: (sum(v) / len(v), len(v)) for k, v in per.items()}


def gabung(titik, seri_titik):
    """Rata-rata berbobot luas per (tahun, bulan); titik tanpa data bulan itu diabaikan."""
    s = {}
    for t, bul in zip(titik, seri_titik):
        for k, (m, n) in bul.items():
            a = s.setdefault(k, [0.0, 0.0, 0])
            a[0] += m * t["luas_ha"]; a[1] += t["luas_ha"]; a[2] = max(a[2], n)
    return {k: (a[0] / a[1], a[2]) for k, a in s.items()}


def kurva(bul, tahun):
    """Bulanan satu provinsi -> kurva 12 bulan per lapisan."""
    def rata(th, b):
        x = bul.get((th, b))
        return None if x is None else round(x[0], 3)
    out = []
    for b in range(1, 13):
        nm = [bul[(th, b)][0] for th in range(NORMAL[0], NORMAL[1] + 1) if (th, b) in bul]
        x = bul.get((tahun, b))
        out.append({"bulan": b, "tahun_ini": rata(tahun, b), "hari": None if x is None else x[1],
                    **{str(th): rata(th, b) for th in PEMBANDING}, "normal": round(sum(nm) / len(nm), 3) if nm else None})
    return out


def main():
    prov_titik = titik_gambut()
    hari_ini = dt.datetime.now(WIB).date()
    tahun = hari_ini.year
    nama = {e["prov"]: e["prov_nama"] for e in json.load(open(os.path.join(AKAR, "public/data/khg_prioritas.json")))["khg"]}
    out, terakhir = {}, None
    for p, ts in prov_titik.items():
        q = {"latitude": ",".join(str(t["lat"]) for t in ts), "longitude": ",".join(str(t["lon"]) for t in ts), "models": "era5_land",
             "daily": ",".join(VAR), "start_date": f"{NORMAL[0]}-01-01", "end_date": hari_ini.isoformat(), "timezone": "Asia/Jakarta"}
        data = per_lokasi(ambil("https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(q), batas_waktu=300))
        lap = {}
        for j, v in enumerate(VAR):
            lap[["0-7 cm", "7-28 cm"][j]] = kurva(gabung(ts, [bulanan(dict(zip(d["daily"]["time"], d["daily"][v])), "0") for d in data]), tahun)
        for d in data:
            ada = [t for t, x in zip(d["daily"]["time"], d["daily"][VAR[1]]) if x is not None]
            terakhir = max(terakhir or ada[-1], ada[-1])
        out[p] = {"nama": nama.get(p, p), "titik": [t["kode"] for t in ts], "kurva": lap}
        time.sleep(10)
    simpan(KELUAR, {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "tahun_ini": tahun, "data_terakhir": terakhir,
                    "satuan": "m3/m3, rata-rata bulanan", "pembanding": PEMBANDING, "normal": f"rata-rata {NORMAL[0]}-{NORMAL[1]}",
                    "sumber": "ERA5-Land via Open-Meteo archive; titik = centroid KHG terluas (BRGM PRIMS), bobot luas; model tanah mineral, bukan muka air gambut",
                    "prov": out})
    print(f"tanah_gambut_bulanan.json: {len(out)} provinsi, data sampai {terakhir}", file=sys.stderr)


def uji():
    s = {f"2015-0{m}-{h:02d}": m / 10 for m in (1, 2) for h in (1, 2)}
    s["2015-02-03"] = None
    b = bulanan(s, "0")
    assert b[(2015, 1)] == (0.1, 2) and b[(2015, 2)][1] == 2
    t = [{"luas_ha": 1}, {"luas_ha": 3}]
    g = gabung(t, [{(2015, 1): (0.2, 5)}, {(2015, 1): (0.4, 5)}])
    assert abs(g[(2015, 1)][0] - 0.35) < 1e-9
    k = kurva({(2015, 1): (0.2, 31), (2019, 1): (0.4, 31), (2026, 1): (0.3, 10)}, 2026)
    assert k[0]["2015"] == 0.2 and k[0]["tahun_ini"] == 0.3 and k[0]["hari"] == 10 and k[0]["2023"] is None
    assert k[0]["normal"] == 0.3 and k[5]["normal"] is None and k[5]["tahun_ini"] is None
    print("ok tanah_gambut")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
