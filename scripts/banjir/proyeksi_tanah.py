"""Proyeksi penurunan tanah 10 dan 20 tahun per kecamatan dari public/banjir/data/subsiden.json.

ALGORITMA.md bagian 4 (penurunan-tanah). HIPOTESIS: laju dianggap tetap ("bila laju bertahan").
Rentang rendah/tinggi = sebaran antarpiksel (p10/p90) +- galat s, BUKAN selang kepercayaan.
Tidak dijumlahkan dengan muka laut atau status rob (D1); tanpa DeltaDTM tidak ada kunci `elevasi`.
Nilai cm turun (positif = turun). Tanpa subsiden.json (butuh InSAR nyata, Q1) tidak ada berkas ditulis.

Pakai: python3 scripts/banjir/proyeksi_tanah.py uji
       python3 scripts/banjir/proyeksi_tanah.py          (baca subsiden.json, tulis proyeksi_tanah.json)
"""
import datetime, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, simpan

CAKUPAN_MIN = 30    # persen; di bawah ini tidak diproyeksikan
DERET_MIN = 3.0     # tahun
BASI_HARI = 400     # HIPOTESIS (ALGORITMA 7)
HORIZON = (10, 20)


def tahun(a, b):
    try:
        return (datetime.date.fromisoformat(b) - datetime.date.fromisoformat(a)).days / 365.25
    except (TypeError, ValueError):
        return None


LABEL = "hipotesis: proyeksi bila laju bertahan, belum divalidasi"


def proyeksi(k, e_ref=None):
    """k = baris kecamatan subsiden.json (cm/thn, negatif turun) -> dict laju + t10/t20 atau None bila tidak boleh.
    Konvensi: laju negatif = turun. p90 = kuantil 0,10 (paling dalam, paling negatif); p10 = kuantil 0,90 (paling dangkal/naik).
    e_ref None = galat acuan belum dihitung: tayang_ditahan menyala. galat_jarak (K4) ikut s; tanpa itu tayang_ditahan juga menyala."""
    lama = tahun(k.get("tgl_awal"), k.get("tgl_akhir"))
    if k["cakupan"] < CAKUPAN_MIN or lama is None or lama < DERET_MIN or "p10" not in k or k.get("galat") is None:
        return None
    ej = k.get("galat_jarak")
    s = math.sqrt(k["galat"] ** 2 + (e_ref or 0.0) ** 2 + (ej or 0.0) ** 2)
    r, rd, rl = k["med"], k["p90"], k["p10"]
    lj = dict(rendah=max(0.0, -rl - s), pusat=max(0.0, -r), tinggi=max(0.0, -rd + s))  # cm turun per tahun; kecamatan naik: pusat 0
    sempit = k.get("galat_sumber") != "vstd"
    h = dict(kec=k["kec"], kab=k["kab"], laju_cm_thn={a: round(v, 2) for a, v in lj.items()},
             galat_cm_thn=dict(statistik=k["galat"], acuan=e_ref, jarak=ej), galat_sumber=k.get("galat_sumber", "antarpiksel_saja"),
             rentang_sempit=sempit, acuan_belum_dihitung=e_ref is None, tayang_ditahan=e_ref is None or ej is None,
             tak_beda_nol=bool(k.get("tak_beda_nol")), cakupan=k["cakupan"], hipotesis=True)
    for T in HORIZON:
        h[f"t{T}_cm"] = {a: round(v * T) for a, v in lj.items()}
    return h


def bangun(sub, hari_ini=None):
    e_ref = sub.get("referensi", {}).get("galat_cm_thn")  # None = belum dihitung; jangan diganti 0
    hasil = [h for h in (proyeksi(k, e_ref) for k in sub["kecamatan"]) if h]
    hari_ini = hari_ini or datetime.date.today()
    umur = tahun(sub.get("dihitung"), hari_ini.isoformat())
    return dict(versi=1, kota=sub["kota"], dihitung=hari_ini.isoformat(), basi=umur is None or umur * 365.25 > BASI_HARI,
                catatan="bila laju bertahan; tidak dijumlahkan dengan muka laut atau status rob",
                acuan_belum_dihitung=e_ref is None, tayang_ditahan=e_ref is None,
                galat_jenis=sub.get("galat_jenis", "batas_bawah_piksel_bebas"),
                kecamatan=hasil, tanpa_proyeksi=len(sub["kecamatan"]) - len(hasil),
                atribusi=sub.get("atribusi", ""), label=LABEL)


def uji():
    k = dict(kec="A", kab="X", n=50, cakupan=80, med=-2.0, p90=-3.0, p10=-1.0, galat=0.2, galat_jarak=0.0, tgl_awal="2019-01-01", tgl_akhir="2025-01-01")
    h = proyeksi(k, 0.0)
    # galat jarak (K4): ikut s (rentang melebar); tanpa galat_jarak -> tayang_ditahan
    hj = proyeksi({**k, "galat_jarak": 1.0}, 0.0)
    assert abs(hj["laju_cm_thn"]["tinggi"] - (3.0 + (0.2 ** 2 + 1.0) ** .5)) < 0.01 and not hj["tayang_ditahan"], hj
    assert proyeksi({kk: v for kk, v in k.items() if kk != "galat_jarak"}, 0.0)["tayang_ditahan"]
    assert not h["tayang_ditahan"] and not h["acuan_belum_dihitung"] and h["rentang_sempit"], h  # antarpiksel_saja
    assert not proyeksi({**k, "galat_sumber": "vstd"}, 0.0)["rentang_sempit"]
    assert proyeksi(k)["tayang_ditahan"] and proyeksi(k)["acuan_belum_dihitung"]  # e_ref None
    assert h["t10_cm"]["pusat"] == 20 and h["t20_cm"]["pusat"] == 40, h
    assert h["t10_cm"]["rendah"] <= h["t10_cm"]["pusat"] <= h["t10_cm"]["tinggi"], h
    assert h["t20_cm"]["rendah"] == 16 and h["t20_cm"]["tinggi"] == 64 and h["hipotesis"], h
    # sisi dangkal naik: rendah dibatasi 0
    assert proyeksi({**k, "p10": 1.5}, 0.0)["t10_cm"]["rendah"] == 0
    # kecamatan naik (med > 0): pusat 0, urutan tetap
    n = proyeksi({**k, "med": 1.0, "p90": -0.5, "p10": 2.0}, 0.0)
    for T in ("t10_cm", "t20_cm"):
        assert n[T]["pusat"] == 0 and n[T]["rendah"] <= n[T]["pusat"] <= n[T]["tinggi"], n
    # cakupan rendah, deret pendek, tanpa tanggal/galat: tidak diproyeksikan
    assert proyeksi({**k, "cakupan": 29}) is None
    assert proyeksi({**k, "tgl_awal": "2023-06-01"}) is None
    assert proyeksi({**k, "tgl_awal": None}) is None
    assert proyeksi({kk: v for kk, v in k.items() if kk != "galat"}) is None
    assert proyeksi({**k, "galat": None}) is None  # kurang dari BLOK_MIN blok (subsiden K3)
    # tanpa kunci gabungan rob/muka laut
    assert not any(("rob" in a or "laut" in a or "gabung" in a) for a in h)
    b = bangun(dict(kota="T", dihitung="2025-01-01", kecamatan=[k, {**k, "cakupan": 10}], atribusi="a", label="x"), datetime.date(2025, 6, 1))
    assert b["label"] == LABEL and b["tayang_ditahan"] and b["galat_jenis"] == "batas_bawah_piksel_bebas", b
    assert not bangun(dict(kota="T", dihitung="2025-01-01", kecamatan=[k], referensi=dict(galat_cm_thn=0.3)), datetime.date(2025, 6, 1))["tayang_ditahan"]
    assert len(b["kecamatan"]) == 1 and b["tanpa_proyeksi"] == 1 and not b["basi"] and "elevasi" not in b, b
    assert bangun(dict(kota="T", dihitung="2023-01-01", kecamatan=[]), datetime.date(2025, 6, 1))["basi"]
    print("proyeksi_tanah uji: OK")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        jalur = os.path.join(KELUAR, "subsiden.json")
        if not os.path.exists(jalur):
            sys.exit("subsiden.json belum ada (menunggu data InSAR, Q1): tidak ada proyeksi ditulis")
        simpan(os.path.join(KELUAR, "proyeksi_tanah.json"), bangun(json.load(open(jalur))))
