"""Awan tumbuh cepat per kabupaten dari Himawari-9 pita 13 (A2, H12) -> public/udara/data/awan_tumbuh.json.

Pembaca, proyeksi, dan pengambilan sampel DIIMPOR dari awan_himawari.py (tidak disalin). Dua pindaian berjarak 30 menit (t-30, t).
Pakai: python3 scripts/udara/awan_tumbuh.py [YYYYMMDDHHMM] | uji
"""
import datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import awan_himawari as hw

BERKAS = os.path.join(hw.AKAR, "public/udara/data/awan_tumbuh.json")
D_TUMBUH, T_TUMBUH, T_PUNCAK, T_ADA = -8.0, 253.0, 208.0, 273.0
CATATAN = ("Tanda awal pertumbuhan awan konvektif, BUKAN deteksi badai dan BUKAN peringatan BMKG. Resolusi piksel 2 km dan titik contoh kisi 0,1 derajat "
           "(~11 km) akan melewatkan sel badai kecil; kabupaten kecil hanya diwakili satu titik. Laju pendinginan 8 K per 30 menit "
           "(Roberts & Rutledge 2003; Mecikalski & Bedka 2006). Tb_min dibandingkan antar-pindaian pada titik contoh yang sama, bukan menelusuri sel yang bergerak. "
           "Penurunan Tb_min di satu kabupaten bisa berupa ADVEKSI awan dingin yang sudah ada dari kabupaten sebelah, bukan pertumbuhan (turun 81 K dalam 30 menit mustahil sebagai pertumbuhan): "
           "`tumbuh` hanya bila awan sudah ada sebelumnya (Tb_min(t-30) <= 273 K); bila sebelumnya cerah (> 273 K) dan kini <= 253 K ditandai `masuk` (awan dingin baru masuk/terdeteksi).")
_CACHE = {}


def pindai(w, kab):
    if w not in _CACHE:
        _CACHE[w] = hw.proses(w, kab)
    return _CACHE[w]


def nilai(ts, ts0):
    tmin, tmin0 = min(ts), min(ts0)
    d = tmin - tmin0
    n = len(ts)
    return {"tb_min_k": round(tmin, 1), "tb_min_sebelum_k": round(tmin0, 1), "delta_k": round(d, 1),
            "persen_235k": round(100 * sum(t <= hw.T_DINGIN for t in ts) / n, 1),
            "persen_208k": round(100 * sum(t <= hw.T_SANGAT for t in ts) / n, 1),
            "tumbuh": d <= D_TUMBUH and tmin <= T_TUMBUH and tmin0 <= T_ADA,
            "masuk": tmin <= T_TUMBUH and tmin0 > T_ADA, "puncak_tembus": tmin <= T_PUNCAK, "n_titik": n}


def hitung(w, kab=None):
    kab = kab or hw.titik_kab()
    (a, ub, ud), (b, ub0, ud0) = pindai(w, kab), pindai(w - dt.timedelta(minutes=30), kab)
    return {k: {"kab": kab[k][0], **nilai(a[k], b[k])} for k in sorted(a) if k in b}, ub + ub0, ud + ud0


def jalan(w):
    isi, unduh, dtk = hitung(w)
    dok = {"sumber": "Himawari-9 AHI pita 13 (10,4 um), NOAA open data s3://noaa-himawari9; analisis Centurisk97",
           "diperbarui": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M:00+07:00"),
           "jam_pengamatan_utc": w.strftime("%Y-%m-%dT%H:%M:00Z"), "jam_pembanding_utc": (w - dt.timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:00Z"),
           "definisi": {"tumbuh": "Tb_min(t) - Tb_min(t-30) <= -8 K DAN Tb_min(t) <= 253 K DAN Tb_min(t-30) <= 273 K (awan sudah ada)", "masuk": "Tb_min(t) <= 253 K DAN Tb_min(t-30) > 273 K (awan dingin baru masuk/terdeteksi, bukan pertumbuhan)", "puncak_tembus": "Tb_min(t) <= 208 K"},
           "catatan": CATATAN, "ukuran_unduh_mb": round(unduh / 1e6, 1), "detik": round(dtk, 1), "n_kab": len(isi), "kab": isi}
    os.makedirs(os.path.dirname(BERKAS), exist_ok=True)
    with open(BERKAS + ".tmp", "w", encoding="utf-8") as f:
        json.dump(dok, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(BERKAS + ".tmp", BERKAS)
    print(f"awan_tumbuh {w:%Y%m%d %H%M}Z: {len(isi)} kab, {sum(v['tumbuh'] for v in isi.values())} tumbuh, "
          f"{sum(v['masuk'] for v in isi.values())} masuk, {sum(v['puncak_tembus'] for v in isi.values())} puncak_tembus, {dok['ukuran_unduh_mb']} MB, {dok['detik']} dtk", file=sys.stderr)


def uji():
    # logika ambang (sintetis)
    assert nilai([250.0, 260], [260.0, 260])["tumbuh"] and not nilai([254.0, 260], [270.0, 260])["tumbuh"]
    n = nilai([200.0], [281.0])   # cerah -> dingin: adveksi, BUKAN tumbuh
    assert n["masuk"] and not n["tumbuh"] and not nilai([250.0], [260.0])["masuk"] and nilai([250.0], [260.0])["tumbuh"]
    assert not nilai([250.0], [255.0])["tumbuh"] and nilai([207.0], [207.0])["puncak_tembus"]
    # dua pindaian ASLI NOAA S3 (tanpa cache disk, ~24 MB): 14 Nov 2026 07:00Z dan pembandingnya 06:30Z
    kab = hw.titik_kab()
    isi, unduh, dtk = hitung(dt.datetime(2026, 11, 14, 7, 0, tzinfo=dt.timezone.utc), kab)
    assert len(isi) > 400, len(isi)
    for v in isi.values():
        assert 170 < v["tb_min_k"] < 340 and 170 < v["tb_min_sebelum_k"] < 340 and 0 <= v["persen_208k"] <= v["persen_235k"] <= 100, v
    print(f"uji awan_tumbuh ok: {len(isi)} kab, {unduh / 1e6:.1f} MB, {dtk:.0f} dtk, "
          f"{sum(v['tumbuh'] for v in isi.values())} tumbuh, {sum(v['puncak_tembus'] for v in isi.values())} puncak_tembus")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        jalan(dt.datetime.strptime(sys.argv[1], "%Y%m%d%H%M").replace(tzinfo=dt.timezone.utc) if sys.argv[1:] else hw.waktu_terbaru())
