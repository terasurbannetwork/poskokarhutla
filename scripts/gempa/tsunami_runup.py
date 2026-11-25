"""TS-03: run-up tsunami historis Indonesia dari NOAA NCEI/WDS Global Historical Tsunami Database (HazEL).

Sumber : https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/tsunamis/runups?country=INDONESIA&page=N  (200 butir/halaman, 15 halaman per 24 Nov 2026)
         Data pemerintah AS (NOAA NCEI), domain publik; sitasi: NOAA/WDS Global Historical Tsunami Database, doi:10.7289/V5PN93H7.
         Parameter penyaring tahun di API diabaikan (diuji 24 Nov 2026), jadi semua halaman ditarik lalu disaring di sini.
Keluaran: public/gempa/data/tsunami_runup.json. Kolom per butir: id, tanggal (ISO sebagian: YYYY, YYYY-MM, YYYY-MM-DD), lokasi, area,
         lat, lon, tinggi_m (runupHt; null bila tidak tercatat, BUKAN 0), jenis_ukur (typeMeasurementId mentah, null bila kosong),
         validitas (sourceEventValidity: 4 = pasti menurut dokumentasi NCEI, belum dikonfirmasi ke halaman resmi di sesi ini),
         ragu ('doubtful' mentah), penyebab (sourceCauseCode mentah), id_kejadian (tsunamiEventId), id_gempa, m (sourceEqMagnitude), jarak_sumber_km.
Hanya DATA RUN-UP hasil pengamatan; bukan prakiraan dan bukan peringatan. Tinggi muka air di pantai vs run-up sebenarnya
tidak dibedakan oleh API selain lewat kode jenis_ukur; layar tidak boleh mencampurnya (ALGORITMA 7).
Tidak ditarik tiap muat halaman: dijalankan tangan, hasil di-commit.

Pakai:  python3 scripts/gempa/tsunami_runup.py tarik   # jaringan, ~15 permintaan
        python3 scripts/gempa/tsunami_runup.py uji     # tanpa jaringan: logika penyaring + berkas yang tersimpan
"""
import re
import json, os, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import umum

URL = "https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/tsunamis/runups?country=INDONESIA&page="
BERKAS = os.path.join(umum.KELUAR, "tsunami_runup.json")
SITASI = "NOAA National Centers for Environmental Information/World Data Service. Global Historical Tsunami Database. doi:10.7289/V5PN93H7"


def tanggal(i):
    t = str(i["year"])
    if i.get("month"):
        t += "-%02d" % i["month"]
        if i.get("day"):
            t += "-%02d" % i["day"]
    return t


def alat(lokasi, jenis_ukur):
    """'pelampung' untuk DART (lokasi D5xxxx atau typeMeasurementId 3), selain itu None. Layar menyaring pelampung dari run-up darat."""
    return "pelampung" if jenis_ukur == 3 or re.match(r"D5\d{4}", lokasi or "") else None


def baris(i):
    """Satu butir NCEI -> butir kita; kosong tetap None. Tanpa koordinat = dibuang (None)."""
    if i.get("country") != "INDONESIA" or i.get("latitude") is None or i.get("longitude") is None:
        return None
    return {"id": i["id"], "tanggal": tanggal(i), "lokasi": i.get("locationName"), "area": i.get("area"),
            "lat": i["latitude"], "lon": i["longitude"], "tinggi_m": i.get("runupHt"), "jenis_ukur": i.get("typeMeasurementId"),
            "alat": alat(i.get("locationName"), i.get("typeMeasurementId")),
            "validitas": i.get("sourceEventValidity"), "ragu": i.get("doubtful"), "penyebab": i.get("sourceCauseCode"),
            "id_kejadian": i.get("tsunamiEventId"), "id_gempa": i.get("earthquakeEventId"), "m": i.get("sourceEqMagnitude"),
            "jarak_sumber_km": None if i.get("distFromSource") is None else round(i["distFromSource"], 1)}


def tarik():
    p, total, mentah = 1, 1, []
    while p <= total:
        d = umum.ambil(URL + str(p))
        total = d["totalPages"]
        mentah += d["items"]
        p += 1
    hasil = [b for b in map(baris, mentah) if b]
    hasil.sort(key=lambda b: (b["tanggal"], b["id"]))
    umum.simpan(BERKAS, {"dibuat": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "sumber": URL.split("?")[0], "sitasi": SITASI,
                         "lisensi": "Domain publik (NOAA NCEI, Pemerintah AS); atribusi wajib",
                         "n_mentah": len(mentah), "n": len(hasil), "n_bertinggi": sum(b["tinggi_m"] is not None for b in hasil), "runup": hasil})
    print("n_mentah", len(mentah), "n", len(hasil))


def uji():
    b = baris({"id": 1, "year": 1994, "month": 6, "country": "INDONESIA", "latitude": -8.5, "longitude": 114.3, "locationName": "X"})
    assert b and b["tanggal"] == "1994-06" and b["tinggi_m"] is None, b  # kosong tetap None, bukan 0
    assert baris({"id": 2, "year": 1994, "country": "INDONESIA", "latitude": None, "longitude": 1}) is None  # tanpa koordinat dibuang
    assert baris({"id": 3, "year": 1994, "country": "MALAYSIA", "latitude": 1, "longitude": 1}) is None
    if not os.path.exists(BERKAS):
        print("tsunami_runup uji OK (berkas belum ada, jalankan tarik)")
        return
    d = json.load(open(BERKAS))
    r = d["runup"]
    assert d["n"] == len(r) > 500 and all(x["lat"] is not None for x in r)
    assert all(x["tinggi_m"] is None or x["tinggi_m"] >= 0 for x in r), "tinggi negatif"  # 0 m dari NCEI (1 butir, Pameungpeuk 2006) = pengamatan 0, dipertahankan; kosong = None
    assert all(92 <= x["lon"] <= 144 and -15 <= x["lat"] <= 9 for x in r), "ada titik di luar Indonesia"  # 3 butir pelampung DART D56001 (14 LS) sah, bertanda alat="pelampung"
    # Verifikasi K1: Banyuwangi 3 Jun 1994, Rajegwesi ~13,9 m
    raj = [x for x in r if x["tanggal"].startswith("1994-06") and any(k in (x["lokasi"] or "").upper() for k in ("RAJEKWESI", "RAJEGWESI"))]  # NCEI menulis RAJEKWESI
    assert raj and abs(max(x["tinggi_m"] for x in raj) - 13.9) < 0.15, raj
    assert sum(x.get("alat") == "pelampung" for x in r) >= 3, "pelampung DART tidak bertanda"
    print("tsunami_runup uji OK:", d["n"], "butir;", d["n_bertinggi"], "bertinggi; Rajegwesi 1994 =", max(x["tinggi_m"] for x in raj), "m")


if __name__ == "__main__":
    {"tarik": tarik, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "uji", uji)()
