"""Riwayat PM2,5 harian (hari lampau, analisis CAMS) per provinsi dan nasional -> public/udara/data/riwayat.json

Masukan : data/raw/udara/r24_kota.json (prakiraan.py: r24 lampau per kab/kota, 120 hari), scripts/udara/kota.json (jiwa).
Bentuk  : sama dengan udara_kualitas_riwayat.json lama supaya Tren/Peta tak berubah:
          tgl[t] = [jiwa PM2,5 > 15,5, jiwa > 55,4, rata berbobot jiwa, jiwa > 150,4]; prov[kode][t] = [jiwa > 55,4, rata berbobot jiwa].
          Ini analisis model (bukan prakiraan, bukan alat ukur).
Pakai   : python3 scripts/udara/riwayat.py   |   python3 scripts/udara/riwayat.py uji   (dirantai di jalan.py)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

B_BAIK, B_TS, B_STS = 15.5, 55.4, 150.4


def hitung(r24, kota):
    """r24 {kode: {tgl: nilai}}, kota [{kode, prov, jiwa}] -> {kolom, tgl, prov}."""
    jiwa = {k["kode"]: (k["prov"], k["jiwa"]) for k in kota}
    nas, pv = {}, {}
    for kode, d in r24.items():
        if kode not in jiwa:
            continue
        p, j = jiwa[kode]
        for t, v in d.items():
            if v is None or v < 0:
                continue
            n = nas.setdefault(t, [0, 0, 0.0, 0, 0])      # >baik, >ts, sum(jiwa x pm), >sts, jiwa total
            q = pv.setdefault(p, {}).setdefault(t, [0, 0.0, 0])   # >ts, sum(jiwa x pm), jiwa total
            n[0] += j * (v > B_BAIK); n[1] += j * (v > B_TS); n[2] += j * v; n[3] += j * (v > B_STS); n[4] += j
            q[0] += j * (v > B_TS); q[1] += j * v; q[2] += j
    return {"kolom": ["jiwa_di_atas_baik", "jiwa_tidak_sehat", "rata_pm25", "jiwa_sangat_tidak_sehat"],
            "tgl": {t: [n[0], n[1], round(n[2] / n[4], 1), n[3]] for t, n in sorted(nas.items()) if n[4]},
            "prov": {p: {t: [q[0], round(q[1] / q[2], 1)] for t, q in sorted(d.items()) if q[2]} for p, d in sorted(pv.items())}}


def main():
    r24 = alat.muat(os.path.join(alat.RAW, "r24_kota.json"), {})
    if not r24:
        alat.log("riwayat: r24_kota.json kosong, riwayat.json tidak ditulis")
        return
    d = hitung(r24, alat.kota())
    alat.log(f"riwayat.json: {alat.simpan('riwayat.json', d) // 1024} KB, {len(d['tgl'])} hari")


def uji():
    kota = [{"kode": "a", "prov": "1", "jiwa": 100}, {"kode": "b", "prov": "1", "jiwa": 300}, {"kode": "c", "prov": "2", "jiwa": 600}]
    h = hitung({"a": {"t1": 200.0}, "b": {"t1": 10.0}, "c": {"t1": 60.0, "t2": None}, "x": {"t1": 999}}, kota)
    assert h["tgl"] == {"t1": [700, 700, round((100 * 200 + 300 * 10 + 600 * 60) / 1000, 1), 100]}, h["tgl"]
    assert h["prov"]["1"]["t1"] == [100, 57.5] and h["prov"]["2"]["t1"] == [600, 60.0] and "t2" not in h["prov"]["2"], h["prov"]
    print("riwayat uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
