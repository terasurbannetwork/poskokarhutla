"""LAB (PKH-39): panjang garis depan api dari citra Sentinel-2 (AFD-S2) per kompleks, dibanding panjang front `taktik.py`/`operasi.py`
-> public/data/lab/front.json. BUKAN produksi: tidak mengubah taktik.py, operasi.py, atau harian.py (hanya membaca operasi.json).

RUJUKAN
  Hu, X., Ban, Y., Nascetti, A. (2021). Sentinel-2 MSI data for active fire detection in major fire-prone biomes: A multi-criteria approach.
  Int. J. Appl. Earth Obs. Geoinf. 101:102347, doi 10.1016/j.jag.2021.102347. Abstrak (DIBACA): kriteria berganda pada pantulan B4, B11, B12,
  20 m, ambang ADAPTIF per biom (dari 11 juta amatan Jun-Sep 2019, 14 wilayah); CE 0,14, OE 0,04 pada pemeriksaan visual.
  Koefisien DICEK ke teks lengkap (24 Nov 2026, salinan akses terbuka di Lirias KU Leuven; ScienceDirect 403): lihat tabel LEMBAP/SAVANA di bawah. Makalah memakai TOA, kita L2A.
  Penney, G. dkk. (2019), CF = a x I^b (L/m2/s): a dan b TIDAK DIISI di sini (tidak bersumber di repo); tanpa keduanya `penney` = null.
  Dipakai hanya sebagai pembanding berlabel hipotesis untuk `air_front_l_per_m` (taktik.py: 80, asumsi platform), dikali ZONA NYALA
  (panjang front x kedalaman nyala dari FBP), bukan luas wilayah. Yang dihitung di sini: L/s per m front = CF x kedalaman_nyala_m (m2 per m front);
  liter total butuh durasi serangan, tidak diasumsikan.

PANJANG FRONT: piksel api = lolos AFD-S2; front = sisi piksel api (4-tetangga) yang berbatasan dengan piksel SAH bukan api. Sisi ke piksel awan/
  tanpa data/tepi jendela tidak dihitung (kosong bukan front), tetapi `terpotong` = True bila ada api di tepi jendela atau berbatasan dengan piksel tak sah.
  Garis tangga (Manhattan) memanjangkan garis miring hingga 4/pi kali rata-rata: `panjang_km` = sisi x piksel x pi/4 (koreksi arah acak, kasar),
  `panjang_tangga_km` = tanpa koreksi. Resolusi = km x 1000 / N; di atas 40 m `resolusi_kasar` = True (jendela terlalu lebar untuk 20 m asli).
Pakai:  python3 scripts/data/lab_front.py uji
        python3 scripts/data/lab_front.py jalan K0001 [K0002 ...]   # kompleks dari public/data/operasi.json; butuh jaringan (Earth Search)
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR  # noqa: E402

KELUAR = os.path.join(AKAR, "public/data/lab/front.json")
OPERASI = os.path.join(AKAR, "public/data/operasi.json")
# Tabel 3 Hu dkk. 2021 (DICEK ke teks lengkap, Lirias KU Leuven; data makalah = reflektansi TOA, kita L2A permukaan: selisih belum diukur):
#   Tropical & Subtropical Moist Broadleaf: C1 Red <= 1,045 x SWIR2 - 0,071 DAN C2 SWIR2/SWIR1 >= 1;  Grasslands, Savannas & Shrublands: C1 Red <= 0,677 x SWIR2 - 0,052 saja (tanpa C2).
# (a, b, rasio): Red <= a x SWIR2 - b dan SWIR2/SWIR1 >= rasio (rasio 0 = C2 tak dipakai). Bioma per kompleks dari `jenis` operasi.json: savana -> SAVANA, selain itu LEMBAP (pendekatan kasar).
LEMBAP, SAVANA = (1.045, 0.071, 1.0), (0.677, 0.052, 0.0)
A_RED, B_RED, RASIO_MIN = LEMBAP
N = 80                  # piksel per sisi (sama dengan konsesi_citra_jelas.pita)
KM = 1.6                # sisi jendela: 1600 m / 80 = 20 m per piksel, resolusi asli SWIR S2
KASAR_M = 40
AWAN_MAKS = 40          # % awan SCL jendela


def afds2(red, s1, s2, a=A_RED, b=B_RED, rasio=RASIO_MIN):
    """Satu piksel: True api, False bukan api, None tak sah (pita kosong)."""
    if red is None or s1 is None or s2 is None or s1 <= 0:
        return None
    return red <= a * s2 - b and s2 / s1 >= rasio


def panjang_front(api, n, piksel_m):
    """api = list n*n (True/False/None). -> {sisi, panjang_tangga_km, panjang_km, n_api, terpotong}"""
    sisi, n_api, potong = 0, 0, False
    for i, v in enumerate(api):
        if not v:
            continue
        n_api += 1
        y, x = divmod(i, n)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if not (0 <= yy < n and 0 <= xx < n):
                potong = True
                continue
            t = api[yy * n + xx]
            if t is False:
                sisi += 1
            elif t is None:
                potong = True
    tangga = sisi * piksel_m / 1000
    return {"sisi": sisi, "panjang_tangga_km": round(tangga, 3), "panjang_km": round(tangga * math.pi / 4, 3), "n_api": n_api, "terpotong": potong}


def penney(a, b, intensitas_kw_m, kedalaman_nyala_m):
    """Pembanding hipotesis: L/s per m front = CF x kedalaman nyala, CF = a x I^b (L/m2/s). None bila ada masukan kosong."""
    if None in (a, b, intensitas_kw_m, kedalaman_nyala_m) or intensitas_kw_m <= 0 or kedalaman_nyala_m < 0:
        return None
    cf = a * intensitas_kw_m ** b
    return {"cf_l_m2_s": round(cf, 4), "l_per_s_per_m_front": round(cf * kedalaman_nyala_m, 4), "status_nilai": "hipotesis"}


def banding(panjang_km, front_taktik):
    """front_taktik = operasi.json kompleks[].front (3 skenario, km). Rasio lab/taktik per skenario; kosong bukan nol."""
    if panjang_km is None or not front_taktik:
        return None
    return [round(panjang_km / f, 3) if f else None for f in front_taktik]


def hitung(red, s1, s2, n=N, km=KM, par=LEMBAP):
    api = [afds2(r, a, b, *par) for r, a, b in zip(red, s1, s2)]
    pm = km * 1000 / n
    return {**panjang_front(api, n, pm), "piksel_m": round(pm, 1), "resolusi_kasar": pm > KASAR_M,
            "n_sah": sum(v is not None for v in api)}


def satu(c, kini):
    """Satu kompleks operasi.json -> rekaman, atau {alasan} bila tak ada adegan bersih. Jaringan; pembaca = konsesi_citra_jelas.pita (impor, bukan salinan)."""
    import citra as C
    import konsesi_citra_jelas as J
    hari = kini.date()
    for it in sorted(C.cari(C.kotak(c["lat"], c["lon"], KM), hari), key=lambda i: i["properties"]["datetime"], reverse=True):
        if it["properties"].get("eo:cloud_cover", 100) > AWAN_MAKS:
            continue
        try:
            r, s1, s2 = (J.pita(it, k, c["lat"], c["lon"], KM) for k in ("red", "swir16", "swir22"))
        except Exception as e:  # noqa: BLE001  satu adegan rusak tidak menghentikan jalan
            print(f"{c['id']}: {type(e).__name__} {e}", file=sys.stderr)
            continue
        h = hitung(r, s1, s2, par=SAVANA if c.get("jenis") == "savana" else LEMBAP)
        return {"id": c["id"], "adegan": it["id"], "tgl": it["properties"]["datetime"][:10], "awan_pct": it["properties"].get("eo:cloud_cover"),
                **h, "front_taktik_km": c.get("front"), "rasio_lab_per_taktik": banding(h["panjang_km"], c.get("front")),
                "penney": None, "status_nilai": "hipotesis"}
    return {"id": c["id"], "alasan": "tidak ada adegan Sentinel-2 L2A dengan awan <= %d%% dalam 10 hari" % AWAN_MAKS}


def jalan(ids):
    ops = {c["id"]: c for c in json.load(open(OPERASI))["kompleks"]}
    kini = dt.datetime.now(dt.timezone.utc)
    hasil = [satu(ops[i], kini) if i in ops else {"id": i, "alasan": "tidak ada di operasi.json"} for i in ids]
    isi = {"dibuat": kini.isoformat(timespec="minutes"), "rujukan": "Hu dkk. 2021 doi 10.1016/j.jag.2021.102347 (koefisien belum diverifikasi ke teks)",
           "status_nilai": "hipotesis", "kompleks": hasil}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    json.dump(isi, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    print(json.dumps(hasil, ensure_ascii=False, indent=1))


def uji():
    n = 10
    ada = lambda x, y: n * y + x
    red, s1, s2 = [0.2] * n * n, [0.2] * n * n, [0.2] * n * n   # vegetasi: Red 0,2 > 0,677 x 0,2 - 0,052
    for y in range(3, 7):            # blok api 4 x 4 di tengah: Red rendah, SWIR2 tinggi, SWIR2/SWIR1 >= 1
        for x in range(3, 7):
            red[ada(x, y)], s1[ada(x, y)], s2[ada(x, y)] = 0.05, 0.3, 0.5
    assert afds2(0.05, 0.3, 0.5) is True and afds2(0.2, 0.2, 0.2) is False
    assert afds2(0.05, 0.6, 0.5) is False                      # SWIR2/SWIR1 < 1 (mis. tanah terang)
    assert afds2(None, 0.3, 0.5) is None and afds2(0.05, 0, 0.5) is None
    h = hitung(red, s1, s2, n=n, km=0.2)                        # piksel 20 m
    assert (h["n_api"], h["sisi"], h["piksel_m"], h["terpotong"], h["resolusi_kasar"]) == (16, 16, 20.0, False, False), h
    assert h["panjang_tangga_km"] == 0.32 and h["panjang_km"] == round(0.32 * math.pi / 4, 3), h
    s2[ada(1, 1)] = None                                       # piksel awan di dalam api: sisi ke sana tidak dihitung
    red[ada(3, 3)] = None
    h2 = hitung(red, s1, s2, n=n, km=0.2)
    assert h2["n_sah"] == 98 and h2["n_api"] == 15 and h2["terpotong"] and h2["sisi"] == 14, h2
    for i in range(n * n):                                     # api menyentuh tepi jendela -> terpotong, tepi bukan front
        red[i], s1[i], s2[i] = 0.05, 0.3, 0.5
    h3 = hitung(red, s1, s2, n=n, km=0.2)
    assert h3["terpotong"] and h3["sisi"] == 0 and h3["panjang_km"] == 0.0, h3
    assert hitung([0.2] * 4, [0.2] * 4, [0.2] * 4, n=2, km=0.04)["n_api"] == 0
    assert hitung([0.2] * 4, [0.2] * 4, [0.2] * 4, n=2, km=0.2)["resolusi_kasar"]   # 100 m
    assert penney(None, 0.5, 1000, 3) is None and penney(0.1, 0.5, 1000, None) is None and penney(0.1, 0.5, 0, 3) is None
    assert penney(0.01, 0.5, 100, 2) == {"cf_l_m2_s": 0.1, "l_per_s_per_m_front": 0.2, "status_nilai": "hipotesis"}   # a, b sintetis hanya untuk uji aritmetika
    assert banding(2.0, [1.0, 2.0, 0]) == [2.0, 1.0, None] and banding(None, [1]) is None and banding(1, None) is None
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:2] == ["jalan"]:
        jalan(sys.argv[2:])
    else:
        uji()
