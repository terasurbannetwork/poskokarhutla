"""Bahan angin kencang (H31, ALGORITMA A9) -> arsip INTERNAL data/raw/cuaca/badai/arsip_<tahun-bulan>.json. TIDAK tayang di UI (KEPUTUSAN Q2).

Sumber: Open-Meteo /v1/ecmwf (ECMWF IFS 0,25 derajat; semua 8 peubah A9 tersedia dari model yang sama, tak perlu model lain). Ditambah
geopotential_height_850hPa/500hPa supaya lapse 850-500 hPa dihitung dari tebal lapisan nyata (K/km), bukan tebal standar. Jam LOKAL titik (timezone=auto).
Unit kerja: kabupaten (titik = rata-rata pusat kecamatan di pusat_kec.json, dilebur per sel 0,25 derajat karena API membulatkan ke kisi: 471 sel untuk 521 kab).
Kecamatan menyusul: 2.286 sel unik (7.274 kecamatan), tinggal mengganti daftar titik di titik_kab().

Per jam (A9):  geser = |V850 - V10| (selisih VEKTOR, m/s) | kering = 100 - RH700 | lapse = (T850 - T500) / ((Z500 - Z850)/1000)
  skor_downburst = min(CAPE/1000, kering/40, lapse/6,5)   bahan_downburst = skor >= 1   (CAPE>=1000 DAN kering>=40 DAN lapse>=6,5)
  skor_putaran   = min(CAPE/1000, geser/10)               bahan_putaran   = skor >= 1   (CAPE>=1000 DAN geser>=10)
Skor kontinu itu hanya cara mengambil "maks harian dan jam maksnya" dari syarat boolean A9; ambangnya tidak diubah. Satu peubah kosong = jam itu tak dinilai (bukan 0).
Arsip (append-only per tanggal terbit WIB, tak pernah ditimpa), per kab per hari lokal d+0..d+2:
  [cape_maks, geser_maks, kering_maks, lapse_maks, skor_db_maks, jam_db, skor_pt_maks, jam_pt, n_jam_db, n_jam_pt, n_jam_db_12_17, n_jam_pt_12_17]
Jam 12-17 lokal dan fase peralihan (A8) BUKAN pengali di sini: hanya dicatat; PRAREG-ANGIN menyatakannya sebagai faktor terpisah.
Kuota: 1 panggilan Open-Meteo per titik (terukur: 10 peubah x 3 hari = X-RateLimit-Cost 1/titik); satu jalan kab = 471 panggilan (batas gratis 10.000/hari, 600/menit).
Pakai: python3 scripts/cuaca/bahan_badai.py   |   python3 scripts/cuaca/bahan_badai.py uji  (tanpa jaringan, fixture/openmeteo_ecmwf_bandung_20261114.json)
"""
import collections, json, math, os, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, ambil, baca, sekarang, simpan, hari_wib  # noqa: E402

URL = "https://api.open-meteo.com/v1/ecmwf"
VAR = ["cape", "wind_speed_10m", "wind_direction_10m", "wind_speed_850hPa", "wind_direction_850hPa", "relative_humidity_700hPa",
       "temperature_850hPa", "temperature_500hPa", "geopotential_height_850hPa", "geopotential_height_500hPa"]
HARI = 3
BATCH = 50
CAPE_MIN, KERING_MIN, LAPSE_MIN, GESER_MIN = 1000, 40, 6.5, 10
DIR = os.path.join(AKAR, "data/raw/cuaca/badai")   # data/raw = arsip mentah internal repo (bukan public/ yang diterbitkan); whitelist .gitignore + commit = H90
FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture/openmeteo_ecmwf_bandung_20261114.json")
KOLOM = ["cape", "geser", "kering", "lapse", "skor_db", "jam_db", "skor_pt", "jam_pt", "n_db", "n_pt", "n_db_12_17", "n_pt_12_17"]


def vektor(s, arah):
    """kecepatan + arah ASAL angin (derajat) -> (u, v)."""
    a = math.radians(arah)
    return -s * math.sin(a), -s * math.cos(a)


def jam(h, i):
    """Satu jam (indeks i dari hourly h) -> dict bahan A9, atau None bila ada peubah kosong."""
    x = {k: h[k][i] for k in VAR}
    if any(v is None for v in x.values()):
        return None
    u8, v8 = vektor(x["wind_speed_850hPa"], x["wind_direction_850hPa"])
    u1, v1 = vektor(x["wind_speed_10m"], x["wind_direction_10m"])
    tebal = (x["geopotential_height_500hPa"] - x["geopotential_height_850hPa"]) / 1000
    if tebal <= 0:
        return None
    geser = math.hypot(u8 - u1, v8 - v1)
    kering = 100 - x["relative_humidity_700hPa"]
    lapse = (x["temperature_850hPa"] - x["temperature_500hPa"]) / tebal
    c = x["cape"]
    return {"cape": c, "geser": geser, "kering": kering, "lapse": lapse,
            "skor_db": min(c / CAPE_MIN, kering / KERING_MIN, lapse / LAPSE_MIN), "skor_pt": min(c / CAPE_MIN, geser / GESER_MIN)}


def per_jam(lok):
    """Respons Open-Meteo satu titik -> [(tanggal lokal, jam lokal, dict|None)] (A9 per jam)."""
    h = lok["hourly"]
    return [(t[:10], int(t[11:13]), jam(h, i)) for i, t in enumerate(h["time"])]


def harian(baris):
    """per_jam -> {tanggal: [12 kolom KOLOM]}; hari tanpa satu pun jam bernilai dilewati."""
    per = collections.defaultdict(list)
    for tgl, jj, d in baris:
        if d:
            per[tgl].append((jj, d))
    out = {}
    for tgl, hs in per.items():
        mx = lambda k: max(hs, key=lambda e: e[1][k])
        db, pt = mx("skor_db"), mx("skor_pt")
        r = lambda v, n=1: round(v, n)
        out[tgl] = [r(max(d["cape"] for _, d in hs), 0), r(max(d["geser"] for _, d in hs)), r(max(d["kering"] for _, d in hs), 0), r(max(d["lapse"] for _, d in hs), 2),
                    r(db[1]["skor_db"], 2), db[0], r(pt[1]["skor_pt"], 2), pt[0],
                    sum(d["skor_db"] >= 1 for _, d in hs), sum(d["skor_pt"] >= 1 for _, d in hs),
                    sum(d["skor_db"] >= 1 for j, d in hs if 12 <= j <= 17), sum(d["skor_pt"] >= 1 for j, d in hs if 12 <= j <= 17)]
    return out


def titik_kab(pusat):
    """pusat_kec {pp|kab|kec: [lat, lon]} -> ({pp|kab: sel}, [sel unik]); sel = (lat, lon) dibulatkan ke 0,25 derajat."""
    m = collections.defaultdict(list)
    for k, (la, lo) in pusat.items():
        m["|".join(k.split("|")[:2])].append((la, lo))
    kab = {k: (round(sum(a for a, _ in v) / len(v) * 4) / 4, round(sum(b for _, b in v) / len(v) * 4) / 4) for k, v in sorted(m.items())}
    return kab, sorted(set(kab.values()))


def tarik(sel):
    """[(lat, lon)] -> {sel: respons}; satu panggilan per BATCH titik, gagal sekali = batal semuanya (arsip tak boleh separuh)."""
    out = {}
    for a in range(0, len(sel), BATCH):
        b = sel[a:a + BATCH]
        r = ambil(URL + "?" + urllib.parse.urlencode({"latitude": ",".join(f"{p[0]:.2f}" for p in b), "longitude": ",".join(f"{p[1]:.2f}" for p in b),
                                                      "hourly": ",".join(VAR), "wind_speed_unit": "ms", "forecast_days": HARI, "timezone": "auto"}))
        r = r if isinstance(r, list) else [r]
        if len(r) != len(b):
            raise RuntimeError(f"Open-Meteo: {len(r)} respons untuk {len(b)} titik")
        out.update(zip(b, r))
    return out


def tambah(arsip, terbit, hari, kab, h_sel):
    """Append-only: tanggal terbit yang sudah ada TIDAK ditimpa. True bila entri baru."""
    if terbit in arsip["terbit"]:
        return False
    per = {s: harian(per_jam(r)) for s, r in h_sel.items()}
    arsip["terbit"][terbit] = {"hari": hari, "kab": {k: [per[s].get(d) for d in hari] for k, s in kab.items() if all(per[s].get(d) for d in hari[:1])}}
    return True


def main():
    pusat = baca(os.path.join(KELUAR, "pusat_kec.json"))
    if not pusat:
        raise RuntimeError("pusat_kec.json tidak ada")
    kab, sel = titik_kab(pusat)
    terbit = hari_wib(1)[0]
    berkas = os.path.join(DIR, f"arsip_{terbit[:7]}.json")
    arsip = baca(berkas, None) or {"kolom": KOLOM, "ambang": {"cape": CAPE_MIN, "kering": KERING_MIN, "lapse": LAPSE_MIN, "geser": GESER_MIN},
                                   "sumber": "Open-Meteo /v1/ecmwf (ECMWF IFS 0,25)", "terbit": {}}
    if terbit in arsip["terbit"]:
        print(f"bahan badai: terbit {terbit} sudah diarsipkan, dilewati")
        return
    h_sel = tarik(sel)
    hari = sorted({t[:10] for t in next(iter(h_sel.values()))["hourly"]["time"]})[:HARI]
    tambah(arsip, terbit, hari, kab, h_sel)
    os.makedirs(DIR, exist_ok=True)
    simpan(berkas, arsip)
    n = len(arsip["terbit"][terbit]["kab"])
    print(f"bahan badai: terbit {terbit}, {n}/{len(kab)} kab, {len(sel)} panggilan Open-Meteo", file=sys.stderr)


def uji():
    lok = json.load(open(FIXTURE, encoding="utf-8"))
    assert lok["timezone"] == "Asia/Jakarta" and len(lok["hourly"]["time"]) == 24
    bj = per_jam(lok)
    assert len(bj) == 24 and all(d for _, _, d in bj)
    h = harian(bj)["2026-11-14"]
    d = dict(zip(KOLOM, h))
    # CAPE 14 Nov: maks 1760 J/kg jam 12 lokal; RH700 dan lapse nyata dari fixture
    assert d["cape"] == 1760 and 0 < d["geser"] < 10 and d["n_pt"] == 0, d
    # vektor: angin sama arah, beda kecepatan -> selisih skalar; berlawanan -> dijumlah
    assert abs(math.hypot(*[a - b for a, b in zip(vektor(8, 270), vektor(3, 270))]) - 5) < 1e-9
    assert abs(math.hypot(*[a - b for a, b in zip(vektor(8, 270), vektor(3, 90))]) - 11) < 1e-9
    # ambang A9 pada jam sintetis (unit uji logika, BUKAN data): semua tepat di ambang -> skor 1
    s = {k: [None] for k in VAR}
    s.update(cape=[1000], wind_speed_10m=[0], wind_direction_10m=[0], wind_speed_850hPa=[10], wind_direction_850hPa=[0], relative_humidity_700hPa=[60],
             temperature_850hPa=[16.5], temperature_500hPa=[0], geopotential_height_850hPa=[1500], geopotential_height_500hPa=[4000])
    x = jam(s, 0)   # lapse = 16,5/2,5 = 6,6
    assert x["skor_pt"] == 1 and x["skor_db"] == 1, x
    s["relative_humidity_700hPa"] = [61]
    assert jam(s, 0)["skor_db"] < 1 and jam(s, 0)["skor_pt"] == 1
    s["wind_speed_850hPa"] = [None]
    assert jam(s, 0) is None
    # arsip append-only
    pusat = {"32|Bandung|A": [-6.9, 107.6], "32|Bandung|B": [-7.0, 107.5], "32|Garut|C": [-7.2, 107.9]}
    kab, sel = titik_kab(pusat)
    assert len(kab) == 2 and kab["32|Bandung"] == (-7.0, 107.5)
    ar = {"terbit": {}}
    hs = {s_: lok for s_ in sel}
    assert tambah(ar, "2026-11-15", ["2026-11-14"], kab, hs) and not tambah(ar, "2026-11-15", ["x"], kab, hs)
    assert ar["terbit"]["2026-11-15"]["hari"] == ["2026-11-14"] and ar["terbit"]["2026-11-15"]["kab"]["32|Bandung"][0] == h
    print(f"uji bahan badai lulus: Bandung 2026-11-14 {dict(zip(KOLOM, h))}")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
