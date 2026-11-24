"""Stasiun negara tetangga, diarsip sendiri -> public/udara/data/stasiun_asing.json (PKH-22)

Sumber : Malaysia DOE APIMS (https://eqms.doe.gov.my/api3/publicportalapims; tak berdokumen, tanpa kunci, tanpa lisensi tertulis, hanya 24 jam
         terakhir per panggilan sehingga arsip harus kita bangun), Singapura NEA (api-open.data.gov.sg/v2/real-time/api/pm25, Singapore Open Data
         Licence, PM2,5 1 jam per 5 wilayah; ?date= mengembalikan 24 jam, dipakai menambal hari ini dan kemarin).
Isi    : h[jam UTC 'YYYY-MM-DDTHH'] = DOE [API, 1 bila PM2,5 pencemar dominan] | NEA PM2,5 1 jam (µg/m3). DOE melaporkan INDEKS (API, rata-rata 24 jam
         berjalan), bukan µg/m3: PM2,5 hanya dapat ditaksir dengan membalik tabel DOE (api_ke_pm) dan hanya pada jam PM2,5 dominan.
         Jenis berbeda (24 jam berjalan vs 1 jam) tidak boleh dicampur dalam satu angka; pemakai membaca `jenis`.
Arsip  : append-only per (stasiun, jam) tanpa menimpa, bergulir 6 hari (batas ukuran berkas). Tiap sumber gagal sendiri-sendiri.
Hak    : tampilkan atribusi "Jabatan Alam Sekitar Malaysia (APIMS)" dan "NEA / data.gov.sg"; DOE belum memberi izin tertulis (dokumen riset: minta izin
         sebelum membagikan data mentah): berkas ini menyimpan data mentah di repo publik, jadi jangan dirujuk dari layar sebelum izin dicatat.
Pola   : parse_doe, parse_nea, DOE_PM25 dari HazeWatch stations.py (MIT); tabel DOE dari DOE API_Calculation.pdf.
Pakai  : python3 scripts/udara/asing.py [uji]   (dirantai di jalan.py)
"""
import datetime as dt
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

DOE = "https://eqms.doe.gov.my/api3/publicportalapims"
NEA = "https://api-open.data.gov.sg/v2/real-time/api/pm25"
BERKAS = "stasiun_asing.json"
SIMPAN_HARI = 6
MYT, SGT = dt.timezone(dt.timedelta(hours=8)), dt.timezone(dt.timedelta(hours=8))
# PM2,5 rata-rata 24 jam (µg/m3) -> API DOE (tabel DOE; 12,0=50, 50,4=100, 55,4=150, 150,4=200, 250,4=300, 350,4=400, 500,4=500)
DOE_PM25 = [(0, 0), (12.0, 50), (50.4, 100), (55.4, 150), (150.4, 200), (250.4, 300), (350.4, 400), (500.4, 500)]


def api_ke_pm(api):
    """Balik tabel DOE (linier per ruas). Taksiran, bukan ukuran."""
    for (c0, a0), (c1, a1) in zip(DOE_PM25, DOE_PM25[1:]):
        if api <= a1:
            return round(c0 + (c1 - c0) * (api - a0) / (a1 - a0), 1)
    return DOE_PM25[-1][0]


def jam_utc(lokal_iso, tz):
    t = dt.datetime.fromisoformat(lokal_iso)
    t = t.replace(tzinfo=tz) if t.tzinfo is None else t
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H")


def urai_doe(isi):
    """respons apitablehourly -> {id: {nama, lat, lon, h: {jam UTC: [API, dominan]}}}; baris rusak dibuang."""
    out = {}
    for r in isi.get("api_table_hourly", []):
        try:
            api, lat, lon = float(r["API"]), float(r["LATITUDE"]), float(r["LONGITUDE"])
            jam = jam_utc(r["DATETIME"], MYT)
        except (KeyError, TypeError, ValueError):
            continue
        if not (0 <= api <= 999 and 0 <= lat <= 8 and 99 <= lon <= 120):
            continue
        s = out.setdefault("doe:" + str(r["STATION_ID"]), {"nama": str(r.get("STATION_LOCATION") or r["STATION_ID"]).title(), "negara": "MY", "lat": round(lat, 4),
                                                         "lon": round(lon, 4), "sumber": "doe", "jenis": "API DOE, rata-rata 24 jam berjalan (indeks, bukan µg/m3)", "h": {}})
        s["h"][jam] = [int(round(api)), 1 if r.get("PARAM_SYMBOL") == "**" else 0]
    return out


def urai_nea(isi):
    """respons pm25 NEA (terbaru atau ?date=) -> {id: {..., h: {jam UTC: µg/m3 1 jam}}}"""
    d = isi.get("data") or {}
    where = {m["name"]: m["labelLocation"] for m in d.get("regionMetadata", [])}
    out = {}
    for it in d.get("items", []):
        try:
            jam = jam_utc(it["timestamp"], SGT)
        except (KeyError, ValueError):
            continue
        for reg, v in (it.get("readings", {}).get("pm25_one_hourly") or {}).items():
            if reg not in where or not isinstance(v, (int, float)) or not 0 <= v <= 1000:
                continue
            s = out.setdefault("nea:" + reg, {"nama": f"Singapura ({reg})", "negara": "SG", "lat": round(where[reg]["latitude"], 4),
                                              "lon": round(where[reg]["longitude"], 4), "sumber": "nea", "jenis": "PM2,5 1 jam (µg/m3)", "h": {}})
            s["h"][jam] = v
    return out


def gabung(arsip, baru):
    """Tambah jam yang belum ada; jam yang sudah ada TIDAK ditimpa. -> jumlah jam baru."""
    n = 0
    for sid, s in baru.items():
        a = arsip.setdefault(sid, {k: v for k, v in s.items() if k != "h"} | {"h": {}})
        for jam, v in s["h"].items():
            if jam not in a["h"]:
                a["h"][jam] = v
                n += 1
    return n


def pangkas(arsip, sekarang):
    batas = (sekarang - dt.timedelta(days=SIMPAN_HARI)).strftime("%Y-%m-%dT%H")
    return {k: dict(a, h=dict(sorted((j, v) for j, v in a["h"].items() if j >= batas))) for k, a in sorted(arsip.items())
            if any(j >= batas for j in a["h"])}


def ambil_doe(jeda=2):
    try:
        negeri = [int(s["STATE_ID"]) for s in alat.ambil(f"{DOE}/statelist", timeout=60)]
    except Exception:
        negeri = [1, 10, 12, 13, 14, 15, 16]   # Johor, Selangor, Sabah, Sarawak, WP KL, Labuan, Putrajaya
    out = {}
    for n in negeri:
        try:
            for sid, s in urai_doe(alat.ambil(f"{DOE}/apitablehourly?stateid={n}", timeout=90)).items():
                out.setdefault(sid, s)["h"].update(s["h"])
        except Exception as e:
            alat.log(f"::warning title=udara DOE negeri {n}::{type(e).__name__}: {str(e)[:150]}")
        time.sleep(jeda)
    return out


def ambil_nea(sekarang):
    out = {}
    for url in (NEA, *(f"{NEA}?date={(sekarang.astimezone(SGT) - dt.timedelta(days=k)).date().isoformat()}" for k in (0, 1))):
        for sid, s in urai_nea(alat.ambil(url, timeout=60)).items():
            out.setdefault(sid, s)["h"].update(s["h"])
        time.sleep(3)   # 6 permintaan / 10 detik tanpa kunci
    return out


def main():
    sekarang = dt.datetime.now(dt.timezone.utc)
    arsip = alat.keluaran(BERKAS, {}).get("st", {})
    baru, gagal = {}, []
    for nama, f in (("doe", lambda: ambil_doe()), ("nea", lambda: ambil_nea(sekarang))):
        try:
            baru[nama] = f()
        except Exception as e:
            gagal.append(nama)
            alat.log(f"::warning title=udara {nama} gagal::{type(e).__name__}: {str(e)[:200]}")
    if len(gagal) == 2:
        raise RuntimeError("DOE dan NEA sama-sama gagal")
    n = {k: gabung(arsip, v) for k, v in baru.items()}
    arsip = pangkas(arsip, sekarang)
    nb = alat.simpan(BERKAS, {"v": 1, "dibuat": alat.iso(sekarang), "catatan": "append-only, jam UTC; DOE = API (indeks), NEA = PM2,5 1 jam; lihat asing.py",
                             "atribusi": ["Jabatan Alam Sekitar Malaysia (APIMS)", "NEA / data.gov.sg (Singapore Open Data Licence)"], "st": arsip})
    alat.log(f"asing: {len(arsip)} stasiun, {nb // 1024} KB, jam baru {n}, gagal {gagal}")


def uji():
    assert [api_ke_pm(a) for a in (0, 50, 100, 150, 200, 500, 900)] == [0, 12.0, 50.4, 55.4, 150.4, 500.4, 500.4]
    assert abs(api_ke_pm(75) - 31.2) < .05
    doe = {"api_table_hourly": [
        {"STATION_ID": "CA54Q", "STATION_LOCATION": "Limbang, SARAWAK", "LATITUDE": 4.7588, "LONGITUDE": 115.0137, "DATETIME": "2026-11-24T08:00:00", "API": 24, "PARAM_SYMBOL": "**"},
        {"STATION_ID": "CA54Q", "LATITUDE": 4.7588, "LONGITUDE": 115.0137, "DATETIME": "2026-11-24T07:00:00", "API": 30, "PARAM_SYMBOL": "*"},
        {"STATION_ID": "X", "LATITUDE": 40, "LONGITUDE": 10, "DATETIME": "2026-11-24T07:00:00", "API": 30},                 # di luar Asia Tenggara
        {"STATION_ID": "Y", "LATITUDE": 3, "LONGITUDE": 101, "DATETIME": "2026-11-24T07:00:00", "API": 5000},               # absurd
        {"STATION_ID": "Z", "LATITUDE": 3, "LONGITUDE": 101, "DATETIME": "rusak", "API": 50}, {"STATION_ID": "W"}]}
    d = urai_doe(doe)
    assert list(d) == ["doe:CA54Q"] and d["doe:CA54Q"]["h"] == {"2026-11-24T00": [24, 1], "2026-11-23T23": [30, 0]}, d   # 08:00 MYT = 00 UTC
    nea = {"data": {"regionMetadata": [{"name": "north", "labelLocation": {"latitude": 1.418, "longitude": 103.82}}],
                    "items": [{"timestamp": "2026-11-24T08:00:00+08:00", "readings": {"pm25_one_hourly": {"north": 9, "west": 8}}},
                              {"timestamp": "2026-11-24T07:00:00+08:00", "readings": {"pm25_one_hourly": {"north": -3}}}]}}
    n = urai_nea(nea)
    assert list(n) == ["nea:north"] and n["nea:north"]["h"] == {"2026-11-24T00": 9}, n    # wilayah tak dikenal dan nilai negatif dibuang
    ar = {}
    assert gabung(ar, d) == 2 and gabung(ar, n) == 1
    d["doe:CA54Q"]["h"]["2026-11-24T00"] = [999, 0]
    assert gabung(ar, d) == 0 and ar["doe:CA54Q"]["h"]["2026-11-24T00"] == [24, 1]      # append-only
    p = pangkas({"a": {"h": {"2026-11-01T00": 1, "2026-11-24T00": 2}}, "b": {"h": {"2026-11-01T00": 1}}}, dt.datetime(2026, 11, 24, 3, tzinfo=dt.timezone.utc))
    assert list(p) == ["a"] and list(p["a"]["h"]) == ["2026-11-24T00"], p
    print("asing uji: lulus")


if __name__ == "__main__":
    uji()
    if sys.argv[1:] != ["uji"]:
        main()
