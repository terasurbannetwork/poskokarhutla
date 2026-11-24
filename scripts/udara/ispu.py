"""ISPU langsung dari KLH/BPLH (stasiun pemantau resmi) dengan QC -> public/udara/data/ispu.json

Sumber : https://ispu.kemenlh.go.id/apimobile/v1/getStations (tanpa kunci; UA peramban penuh). Host lama ispu.menlhk.go.id mati.
         Tiap stasiun hanya jam terakhir; riwayat tidak ada, jadi arsip harian dibangun sendiri (nilai_prakiraan.py -> stasiun_harian.json).
Isi    : a_pm25 = rata-rata 24 jam BERJALAN (bukan per jam; audit pk/docs/research/audit-air-quality.md 1.2), stempel = AKHIR periode.
         Hampir semua stasiun auto_validation=1 (belum divalidasi): angka ini bahan uji dan pembanding, bukan ISPU yang sudah disahkan.
QC     : buang (1) c_pm25 kosong (PM2,5 bukan penentu indeks resmi, nilainya sering absurd), (2) PM2,5 <= 1 atau > 2000 (sensor macet/lonjakan),
         (3) PM2,5 > 1,5 x PM10 + 5, (4) stasiun uji atau perawatan, (5) stempel waktu di masa depan; waktu `waktu` = jam lokal,
         zona dari PROVINSI (kolom time_z salah di beberapa stasiun, mis. Kaltim berlabel WIB).
Gabung : berdiri sendiri; TIDAK dicampur ke stasiun_arsip.json WAQI yang dipakai koreksi CAMS di prakiraan.py (koreksi itu regresi per jam,
         sedangkan ISPU rata-rata 24 jam; mencampurnya menggeser fase harian CAMS ke faktor). WAQI/OpenAQ tidak diubah.
Pola   : algoritma QC dari HazeWatch (MIT, pipeline/src/haze/stations.py parse_ispu) dan temuan audit-air-quality.md.
Pakai  : python3 scripts/udara/ispu.py [uji]   (dirantai di jalan.py)
"""
import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

URL = "https://ispu.kemenlh.go.id/apimobile/v1/getStations"
BERKAS = os.path.join(alat.OUT, "ispu.json")
SUMBER = "KLH/BPLH (ispu.kemenlh.go.id)"
WITA = {"bali", "nusa tenggara barat", "nusa tenggara timur", "kalimantan selatan", "kalimantan timur", "kalimantan utara",
        "sulawesi utara", "sulawesi tengah", "sulawesi selatan", "sulawesi barat", "sulawesi tenggara", "gorontalo"}
WIT = {"maluku", "maluku utara", "papua", "papua barat", "papua barat daya", "papua tengah", "papua pegunungan", "papua selatan"}
TOLERANSI_MENIT = 5


def offset(prov):
    p = (prov or "").strip().lower()
    return 9 if p in WIT else 8 if p in WITA else 7


def angka(x):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return v if v == v else None


def qc(rows, sekarang):
    """rows API -> (stasiun lolos, {alasan: jumlah dibuang}). Stasiun = {id, nama, prov, lat, lon, t (UTC ISO), pm25, pm10}."""
    ok, buang = [], {}

    def tolak(a):
        buang[a] = buang.get(a, 0) + 1

    for r in rows:
        if str(r.get("is_maintenance")) == "1" or str(r.get("stasiun_uji")) == "1":
            tolak("uji_atau_perawatan")
            continue
        pm, pm10 = angka(r.get("a_pm25")), angka(r.get("a_pm10"))
        if pm is None:
            tolak("pm25_kosong")
        elif r.get("c_pm25") in (None, ""):
            tolak("c_pm25_kosong")
        elif pm <= 1 or pm > 2000:
            tolak("pm25_macet_atau_absurd")
        elif pm10 is not None and pm10 > 1 and pm > 1.5 * pm10 + 5:
            tolak("pm25_jauh_di_atas_pm10")
        else:
            try:
                lokal = dt.datetime.strptime(r["waktu"], "%Y-%m-%d %H:%M:%S")
                lat, lon = float(r["lat"]), float(r["lon"])
            except (KeyError, ValueError, TypeError):
                tolak("waktu_atau_koordinat_rusak")
                continue
            t = (lokal - dt.timedelta(hours=offset(r.get("provinsi")))).replace(tzinfo=dt.timezone.utc)
            if t > sekarang + dt.timedelta(minutes=TOLERANSI_MENIT):
                tolak("waktu_masa_depan")
            elif not (-12 <= lat <= 7 and 94 <= lon <= 142):
                tolak("di_luar_indonesia")
            else:
                ok.append({"id": r["id_stasiun"], "nama": r.get("nama") or r["id_stasiun"], "prov": r.get("provinsi"),
                           "lat": round(lat, 4), "lon": round(lon, 4), "t": alat.iso(t), "pm25": round(pm, 1),
                           "pm10": None if pm10 is None else round(pm10, 1)})
    return ok, buang


def main(isi=None):
    sekarang = dt.datetime.now(dt.timezone.utc)
    try:
        d = isi if isi is not None else alat.ambil(URL, timeout=60)
        rows = d["rows"]
        if not isinstance(rows, list) or len(rows) < 20:
            raise ValueError(f"hanya {len(rows) if isinstance(rows, list) else '?'} baris")
    except Exception as e:   # sumber mati: berkas lama tetap, jam aslinya
        if not os.path.exists(BERKAS):
            raise
        alat.log(f"::warning title=udara ispu::sumber gagal, berkas lama dipakai: {type(e).__name__}: {str(e)[:200]}")
        return
    ok, buang = qc(rows, sekarang)
    if not ok:
        raise ValueError("semua stasiun ISPU gugur QC")
    out = {"v": 1, "dibuat": alat.iso(sekarang), "sumber": SUMBER, "satuan": "µg/m³",
           "catatan": "PM2,5 = rata-rata 24 jam berjalan, stempel akhir periode; belum divalidasi (auto_validation=1); QC Centurisk97",
           "n_mentah": len(rows), "n_lolos": len(ok), "dibuang": dict(sorted(buang.items())), "stasiun": sorted(ok, key=lambda s: s["id"])}
    alat.simpan(BERKAS, out)
    alat.log(f"ispu: {len(ok)}/{len(rows)} stasiun lolos QC; dibuang {buang}")


def uji():
    now = dt.datetime(2026, 11, 24, 3, 0, tzinfo=dt.timezone.utc)
    b = lambda **k: {"id_stasiun": k.pop("id"), "waktu": "2026-11-24 09:00:00", "lat": "-2.9", "lon": "104.7", "a_pm25": "40", "a_pm10": "50",
                     "c_pm25": "2", "provinsi": "Sumatera Selatan", "is_maintenance": "0", "stasiun_uji": "0", **k}
    rows = [b(id="ok"), b(id="cnull", c_pm25=None), b(id="nol", a_pm25="0.5"), b(id="absurd", a_pm25="3000"),
            b(id="pm10", a_pm25="90", a_pm10="20"), b(id="batas", a_pm25="35", a_pm10="20"),   # 35 = 1,5x20+5: tepat batas, lolos
            b(id="uji", stasiun_uji="1"), b(id="rawat", is_maintenance="1"), b(id="depan", waktu="2026-11-24 12:00:00"),
            b(id="kaltim", provinsi="Kalimantan Timur", waktu="2026-11-24 11:00:00"),   # WITA: 11:00 lokal = 03:00 UTC = sekarang, lolos
            b(id="kaltim_depan", provinsi="Kalimantan Timur", waktu="2026-11-24 12:00:00"),   # WITA 12:00 = 04:00 UTC: masa depan
            b(id="rusak", waktu="bukan waktu"), b(id="luar", lat="40", lon="10"), b(id="tanpa_pm", a_pm25=None)]
    ok, buang = qc(rows, now)
    assert sorted(s["id"] for s in ok) == ["batas", "kaltim", "ok"], [s["id"] for s in ok]
    assert buang == {"c_pm25_kosong": 1, "pm25_macet_atau_absurd": 2, "pm25_jauh_di_atas_pm10": 1, "uji_atau_perawatan": 2,
                     "waktu_masa_depan": 2, "waktu_atau_koordinat_rusak": 1, "di_luar_indonesia": 1, "pm25_kosong": 1}, buang
    assert ok[0]["t"] == "2026-11-24T02:00Z" and next(s for s in ok if s["id"] == "kaltim")["t"] == "2026-11-24T03:00Z", ok
    assert offset("jawa TImur") == 7 and offset("Papua Tengah") == 9 and offset(None) == 7
    print("ispu uji: lulus")


if __name__ == "__main__":
    uji()
    if sys.argv[1:] != ["uji"]:
        main()
