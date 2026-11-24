"""Asap lintas negara (PKH-23): kota penerima di Singapura, Malaysia, Brunei <- provinsi asal dan api negara tetangga -> public/udara/data/lintas_negara.json

Mesin  : persis atribusi.py (plume Gauss tunak, 1.458 kombinasi sebaran x emisi x normalisasi, rentang rendah-tinggi, EF dan asumsi yang sama);
         hanya penerimanya kota luar negeri dan sumbernya digabung per PROVINSI asal (atribusi.py membagi per kompleks).
Sumber : (1) kompleks api Indonesia aktif + PLTU seperti atribusi.main; (2) api Malaysia dan Brunei dari FIRMS NRT VIIRS NOAA-20 + NOAA-21 24 jam
         (SouthEast_Asia_24h.csv, tanpa kunci; S-NPP kosong sejak 2026), dikelompokkan per sel 0,1 derajat, negara dari kotak kasar lintasan.negara,
         keyakinan rendah dibuang, EF hutan (tipe gambut Sarawak/Brunei tak diketahui: batas bawah). Api Thailand/Filipina/Timor tak dimodelkan.
Aturan : bagian per asal TAMPIL hanya bila model (jam sama dengan CAMS, besok) menjelaskan >= 20% KELEBIHAN PM2,5 (CAMS - latar 15 µg/m3,
         lantai 1) DAN rata-rata asap model >= 10 µg/m3 (audit-air-quality.md 4: persen dari sinyal 1% menyesatkan) DAN model <= 1,5 x CAMS.
         Selain itu penerima tetap ditulis dengan alasan, bagian kosong: "belum dapat ditentukan", bukan 0%.
Batas  : CAMS global (40 km) tanpa koreksi stasiun, cenderung rendah saat asap pekat: kelebihan = CAMS - 15 jadi batas bawah, aturan 20% lebih longgar
         daripada memakai pengamatan. Stasiun terukur (stasiun_asing.json: DOE indeks API, NEA 1 jam) hanya ditampilkan di samping, tidak masuk aturan.
         Plume tunak tanpa waktu tempuh, deposisi, hujan, kimia sekunder: bukan pelacakan asap. Belum diuji balik terhadap AOD (lihat uji_atribusi.py,
         yang baru menguji kota Indonesia): status HIPOTESIS.
Pakai  : python3 scripts/udara/lintas_negara.py [uji]   (dirantai di jalan.py sesudah atribusi dan asing)
"""
import csv
import datetime as dt
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../banjir"))
import alat
import asing
import atribusi
import lintasan
import prakiraan
from wilayah import PROVINSI

PENERIMA = [  # kode, nama, negara, lat, lon (BSB dan KK dari permintaan pemilik/pengoordinasi; sisanya pusat kota)
    ("SG-SIN", "Singapura", "Singapura", 1.3521, 103.8198),
    ("MY-KUL", "Kuala Lumpur", "Malaysia", 3.1390, 101.6869),
    ("MY-JHB", "Johor Bahru", "Malaysia", 1.4927, 103.7414),
    ("MY-MLK", "Melaka", "Malaysia", 2.1896, 102.2501),
    ("MY-PEN", "George Town (Pulau Pinang)", "Malaysia", 5.4141, 100.3288),
    ("MY-KCH", "Kuching", "Malaysia", 1.5535, 110.3593),
    ("MY-MYY", "Miri", "Malaysia", 4.4148, 114.0089),
    ("MY-BKI", "Kota Kinabalu", "Malaysia", 5.9800, 116.0730),
    ("BN-BWN", "Bandar Seri Begawan", "Brunei", 4.8900, 114.9420),
]
URL_FIRMS = ("https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_24h.csv",
             "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_SouthEast_Asia_24h.csv")
TETANGGA = ("Malaysia", "Brunei")
LATAR = 15.0            # µg/m3, latar perkotaan bukan asap (audit-air-quality.md)
MIN_DIJELASKAN = 0.20
MIN_MODEL = 10.0
SEL = 0.1
MAKS_TETANGGA = 60
JARAK_STASIUN_KM = 30


def api_tetangga(teks_csv_list):
    """CSV FIRMS NRT (beberapa satelit) -> sumber api per sel 0,1 derajat di Malaysia/Brunei; FRP 24 jam = jumlah semua piksel, dua satelit."""
    sel = {}
    for teks in teks_csv_list:
        for r in csv.DictReader(io.StringIO(teks)):
            try:
                lat, lon, frp = float(r["latitude"]), float(r["longitude"]), float(r["frp"])
            except (KeyError, ValueError):
                continue
            if r.get("confidence", "").lower() == "l" or frp < 0:
                continue
            n = lintasan.negara(lon, lat)
            if n not in TETANGGA:
                continue
            k = (n, round(lat / SEL), round(lon / SEL))
            a = sel.setdefault(k, [0.0, 0.0, 0.0, 0])   # frp, frp*lat, frp*lon, titik
            a[0] += frp
            a[1] += frp * lat
            a[2] += frp * lon
            a[3] += 1
    out = []
    for (n, _, _), (frp, fla, flo, c) in sorted(sel.items(), key=lambda x: -x[1][0])[:MAKS_TETANGGA]:
        if frp <= 0:
            continue
        lat, lon = fla / frp, flo / frp
        out.append({"jenis": "api", "id": f"{n[:2].upper()}{lat:.2f},{lon:.2f}", "nama": f"Api {n}", "lon": round(lon, 4), "lat": round(lat, 4), "hs": 0.0,
                    "basis": frp * atribusi.DM_PER_MJ, "ef": atribusi.EF_HUTAN, "konsesi": [], "prov": None, "negara": n, "titik": c})
    return out


def kelompok(s):
    if s["jenis"] == "pltu":
        return "PLTU Indonesia", "pltu"
    if s.get("negara"):
        return f"Api di {s['negara']}", "negara"
    return PROVINSI.get(s.get("prov"), "Provinsi tak diketahui"), "provinsi"


def hitung_penerima(k, C, src, hari_jam, d):
    """k {kode, nama, negara, lat, lon}, C = rata-rata CAMS jam sasaran, src dengan cuaca_rot -> dict penerima."""
    unit = atribusi.unit_kota(k, src, hari_jam)
    TD, TE = atribusi.TD, atribusi.TE
    M = sum(atribusi.skala(s, atribusi.EMIS[TE]) * pv[TD][d] for s, pv in unit)
    kelebihan = max(C - LATAR, 1.0)
    o = {"kode": k["kode"], "nama": k["nama"], "negara": k["negara"], "lat": k["lat"], "lon": k["lon"], "pm": round(C), "model": round(M, 1),
         "kelebihan": round(kelebihan, 1), "dijelaskan": round(M / kelebihan, 2), "tampil": False, "bagian": []}
    if M > atribusi.BATAS_PERCAYA * C:
        o["alasan"] = f"Model plume {round(M)} µg/m³ melebihi 1,5× CAMS {round(C)} µg/m³; porsi asal tidak diterbitkan."
        return o
    if M < MIN_MODEL:
        o["alasan"] = f"Asap api yang dimodelkan hanya {round(M, 1)} µg/m³ (di bawah {round(MIN_MODEL)}), terlalu tipis untuk membagi asalnya; belum dapat ditentukan."
        return o
    if M < MIN_DIJELASKAN * kelebihan:
        o["alasan"] = (f"Asap api yang dimodelkan ({round(M, 1)} µg/m³) hanya menjelaskan {round(100 * M / kelebihan)}% kelebihan PM2,5 "
                       f"({round(kelebihan)} µg/m³ di atas latar {round(LATAR)}); asalnya belum dapat ditentukan.")
        return o
    sr, lat = atribusi.rentang(unit, C, d)
    total = max(C, M)
    grup = {}
    for s, pv in unit:
        nama, jenis = kelompok(s)
        g = grup.setdefault(nama, {"asal": nama, "jenis": jenis, "persen": 0.0, "seri": None, "n": 0, "id": []})
        g["persen"] += 100 * atribusi.skala(s, atribusi.EMIS[TE]) * pv[TD][d] / total
        g["n"] += 1
        g["id"].append(s["id"])
        if s["id"] in sr:   # jumlah PER SKENARIO lalu min/maks (bukan jumlah batas)
            g["seri"] = sr[s["id"]] if g["seri"] is None else [a + b for a, b in zip(g["seri"], sr[s["id"]])]
    bag = []
    for g in sorted(grup.values(), key=lambda g: -g["persen"]):
        if g["seri"] is None or round(g["persen"]) < 1:
            continue
        bag.append({"asal": g["asal"], "jenis": g["jenis"], "persen": round(g["persen"]), "rendah": round(min(g["seri"])), "tinggi": round(max(g["seri"])),
                    "kompleks": g["n"]})
    bag.append({"asal": "Latar (sumber lain, CAMS)", "jenis": "latar", "persen": round(100 * max(0.0, C - M) / total), "rendah": round(min(lat)), "tinggi": round(max(lat)),
                "kompleks": 0})
    o["tampil"], o["bagian"] = True, bag
    return o


def stasiun_dekat(k, arsip, jarak=JARAK_STASIUN_KM):
    """Pembacaan terakhir stasiun terdekat dalam `jarak` km: NEA PM2,5 1 jam atau DOE (API, taksiran PM2,5 bila PM2,5 dominan). Hanya info."""
    ada = [(alat.jarak_km(k["lat"], k["lon"], s["lat"], s["lon"]), sid, s) for sid, s in arsip.items() if s["h"]]
    ada = [x for x in ada if x[0] <= jarak]
    if not ada:
        return None
    d, sid, s = min(ada, key=lambda x: x[0])
    jam = max(s["h"])
    v = s["h"][jam]
    out = {"stasiun": s["nama"], "km": round(d), "jam_utc": jam + ":00Z", "sumber": s["sumber"]}
    if s["sumber"] == "nea":
        out.update(pm25_1jam=v)
    else:
        out.update(api=v[0], pm25_taksiran_24j=asing.api_ke_pm(v[0]) if v[1] else None)
    return out


def siapkan_cuaca(src, A, jam_ke, t0):
    for s in src:
        cu = atribusi.cuaca_sumber(A, s["lon"], s["lat"], jam_ke, t0)
        s["cuaca_rot"] = [[None if w is None else (*atribusi.putar(w[0], w[1], r), w[2], w[3]) for w in cu] for r in atribusi.ROT_V]


def hitung(penerima, pm_per_penerima, prak, A, src, t0, stasiun=None):
    jam = [alat.dari_iso(j) for j in prak["jam"]]
    jam_ke = [(j - t0).total_seconds() / 3600 for j in jam]
    hari_jam = [[i for i, j in enumerate(jam) if alat.hari_wib(j) == dd] for dd in prak["hari"]]
    siapkan_cuaca(src, A, jam_ke, t0)
    d, out = atribusi.HARI_ATRIBUSI, []
    for k, pm in zip(penerima, pm_per_penerima):
        v = [pm[i] for i in hari_jam[d] if pm[i] is not None]
        if not v:
            continue
        o = hitung_penerima(k, sum(v) / len(v), src, hari_jam, d)
        o["terukur"] = stasiun_dekat(k, stasiun or {})
        out.append(o)
    return out


def main():
    t = alat.sekarang()
    prak, A = alat.keluaran("prakiraan.json"), alat.keluaran("angin.json")
    src = atribusi.sumber_list(alat.data("kluster.json"), alat.keluaran("pltu.json"), t, lintasan.titik_konsesi())
    n_id = sum(s["jenis"] == "api" for s in src)
    try:
        csv_teks = [alat.ambil(u, teks=True, timeout=120) for u in URL_FIRMS]
        tet = api_tetangga(csv_teks)
    except Exception as e:
        alat.log(f"::warning title=udara api tetangga::{type(e).__name__}: {str(e)[:200]}; sumber tetangga TIDAK dimodelkan")
        tet = None
    src += tet or []
    pen = [dict(zip(("kode", "nama", "negara", "lat", "lon"), p)) for p in PENERIMA]
    waktu, seri = prakiraan.cams([(p["lat"], p["lon"]) for p in pen])
    t0 = alat.dari_iso(prak["jam"][0])
    i0 = waktu.index(t0)
    pm = [s[0][i0:i0 + 72] for s in seri]
    baris = hitung(pen, pm, prak, A, src, t0, alat.keluaran("stasiun_asing.json", {}).get("st", {}))
    d = {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "hari": prak["hari"][atribusi.HARI_ATRIBUSI], "status_validasi": "hipotesis",
         "n_api_indonesia": n_id, "n_api_tetangga": None if tet is None else len(tet), "aturan": {"min_dijelaskan": MIN_DIJELASKAN, "min_model_ug": MIN_MODEL, "latar_ug": LATAR},
         "penerima": baris, "asumsi": atribusi.ASUMSI,
         "batasan": ["CAMS global 40 km tanpa koreksi stasiun, cenderung rendah saat asap pekat; kelebihan = CAMS - 15 µg/m³.",
                     "Plume tunak tanpa waktu tempuh, hujan, atau kimia sekunder; bukan pelacakan asap.",
                     "Api Malaysia dan Brunei hanya dari VIIRS NOAA-20 + NOAA-21 24 jam, tanpa tipe gambut (EF hutan, batas bawah); api Thailand, Filipina tak dimodelkan.",
                     "Provinsi asal berarti api di provinsi itu yang dilalui angin ke penerima, bukan penetapan siapa yang membakar.",
                     "Belum diuji balik terhadap AOD untuk kota luar negeri; angka HIPOTESIS."],
         "sumber": "Open-Meteo (CAMS, angin), NASA FIRMS VIIRS, DOE Malaysia APIMS, NEA Singapura; perkiraan Centurisk97"}
    nb = alat.simpan("lintas_negara.json", d)
    alat.log(f"lintas_negara.json: {nb // 1024} KB, {len(baris)} penerima, {sum(b['tampil'] for b in baris)} dengan asal; api ID {n_id}, tetangga {d['n_api_tetangga']}; "
             + "; ".join(f"{b['nama']} CAMS {b['pm']} model {b['model']} ({round(100 * b['dijelaskan'])}%)" for b in baris))


def uji():
    # api tetangga: sel 0,1 derajat digabung, keyakinan rendah dan di luar Malaysia/Brunei dibuang, FRP dua satelit dijumlah
    h = "latitude,longitude,frp,confidence\n"
    a = h + "1.50,110.30,10,n\n1.52,110.32,30,h\n1.51,110.31,99,l\n-2.0,104.0,50,h\n4.9,114.9,5,n\n"
    b = h + "1.50,110.30,20,h\n"
    s = api_tetangga([a, b])
    assert [(x["negara"], round(x["lat"], 1), x["titik"]) for x in s] == [("Malaysia", 1.5, 3), ("Brunei", 4.9, 1)], s
    assert abs(s[0]["basis"] - 60 * atribusi.DM_PER_MJ) < 1e-9 and s[0]["jenis"] == "api" and s[0]["prov"] is None
    assert api_tetangga(["latitude,longitude,frp,confidence\nrusak,1,2,h\n"]) == []
    assert kelompok({"jenis": "api", "prov": "61"})[0] == PROVINSI["61"] and kelompok({"jenis": "api", "negara": "Malaysia"}) == ("Api di Malaysia", "negara")
    assert kelompok({"jenis": "pltu"}) == ("PLTU Indonesia", "pltu") and kelompok({"jenis": "api", "prov": "xx"})[1] == "provinsi"
    # ujung ke ujung: angin barat 5 m/s, api Kalbar (prov 61) di barat Kuching dan api Malaysia lebih dekat
    A = lintasan.angin_uji(50, 0)
    A["blh"] = [[[800] * 47 for _ in range(18)] for _ in range(25)]
    t0 = alat.dari_iso("2026-10-18T03:00Z")
    jam = [alat.iso(t0 + dt.timedelta(hours=x)) for x in range(72)]
    prak = {"jam": jam, "hari": ["2026-10-18", "2026-10-19", "2026-10-20"]}
    pen = [{"kode": "MY-KCH", "nama": "Kuching", "negara": "Malaysia", "lat": 1.55, "lon": 110.35}]
    src = [{"jenis": "api", "id": "K1", "nama": "api Kalbar", "lon": 108.0, "lat": 1.5, "hs": 0.0, "basis": 5000 * atribusi.DM_PER_MJ, "ef": atribusi.EF_GAMBUT, "konsesi": [], "prov": "61"},
           {"jenis": "api", "id": "MY1", "nama": "Api Malaysia", "lon": 109.5, "lat": 1.5, "hs": 0.0, "basis": 500 * atribusi.DM_PER_MJ, "ef": atribusi.EF_HUTAN, "konsesi": [],
            "prov": None, "negara": "Malaysia"}]
    # CAMS menjadi 3x model: model menjelaskan ~ 1/3 kelebihan -> tampil, persen per provinsi, jumlah <= 100, tetangga terpisah
    r0 = hitung(pen, [[200.0] * 72], prak, A, [dict(s) for s in src], t0)[0]
    M = r0["model"]
    assert M > 10, M
    C = 15 + 3 * M
    r = hitung(pen, [[C] * 72], prak, A, [dict(s) for s in src], t0)[0]
    asal = {b["asal"]: b for b in r["bagian"]}
    assert r["tampil"] and {PROVINSI["61"], "Api di Malaysia", "Latar (sumber lain, CAMS)"} <= set(asal), r
    assert abs(sum(b["persen"] for b in r["bagian"]) - 100) <= 2 and all(b["rendah"] <= b["persen"] <= b["tinggi"] for b in r["bagian"]), r["bagian"]
    # CAMS 10x model: model < 20% kelebihan -> TIDAK tampil, bukan 0%
    r2 = hitung(pen, [[15 + 10 * M] * 72], prak, A, [dict(s) for s in src], t0)[0]
    assert not r2["tampil"] and r2["bagian"] == [] and "belum dapat ditentukan" in r2["alasan"], r2
    # model > 1,5 x CAMS: tak terpercaya
    r3 = hitung(pen, [[M / 3] * 72], prak, A, [dict(s) for s in src], t0)[0]
    assert not r3["tampil"] and "1,5×" in r3["alasan"]
    # model < 10 µg/m3 walau CAMS kecil: tak tampil (cegah persen dari sinyal tipis)
    kecil = [dict(src[0], basis=src[0]["basis"] / 1000), dict(src[1], basis=src[1]["basis"] / 1000)]
    r4 = hitung(pen, [[40.0] * 72], prak, A, kecil, t0)[0]
    assert not r4["tampil"] and r4["model"] < 10 and "terlalu tipis" in r4["alasan"], r4
    # stasiun terdekat: NEA 1 jam dan DOE (taksiran hanya bila PM2,5 dominan); di luar 30 km = None
    ar = {"nea:c": {"nama": "Singapura (central)", "sumber": "nea", "lat": 1.357, "lon": 103.82, "h": {"2026-11-24T00": 9, "2026-11-24T01": 12}},
          "doe:a": {"nama": "Kuching", "sumber": "doe", "lat": 1.56, "lon": 110.39, "h": {"2026-11-24T01": [75, 1]}},
          "doe:b": {"nama": "Jauh", "sumber": "doe", "lat": 4.0, "lon": 110.0, "h": {"2026-11-24T01": [75, 1]}}}
    assert stasiun_dekat({"lat": 1.3521, "lon": 103.8198}, ar)["pm25_1jam"] == 12
    sd = stasiun_dekat(pen[0], ar)
    assert sd["stasiun"] == "Kuching" and sd["api"] == 75 and abs(sd["pm25_taksiran_24j"] - 31.2) < .1, sd
    assert stasiun_dekat({"lat": -5, "lon": 100}, ar) is None
    print("lintas_negara uji: lulus")


if __name__ == "__main__":
    uji()
    if sys.argv[1:] != ["uji"]:
        main()
