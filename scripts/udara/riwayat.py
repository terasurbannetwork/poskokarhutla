"""Riwayat PM2,5 harian (hari lampau, analisis CAMS) per provinsi dan nasional -> public/udara/data/riwayat.json

Masukan : data/raw/udara/r24_kota.json (prakiraan.py: r24 lampau per kab/kota, 120 hari), scripts/udara/kota.json (jiwa).
Bentuk  : sama dengan udara_kualitas_riwayat.json lama supaya Tren/Peta tak berubah:
          tgl[t] = [jiwa PM2,5 > 15,5, jiwa > 55,4, rata berbobot jiwa, jiwa > 150,4]; prov[kode][t] = [jiwa > 55,4, rata berbobot jiwa].
          Ini analisis model (bukan prakiraan, bukan alat ukur).
Pakai   : python3 scripts/udara/riwayat.py   |   python3 scripts/udara/riwayat.py uji   (dirantai di jalan.py)

PKH-42 hari tinggi -> public/udara/data/hari_tinggi.json: jumlah hari PM2,5 rata 24 jam (hari WIB, >= 18 jam terisi) > 55 ug/m3 per kota per tahun.
  Masukan : data/raw/udara/openaq_arsip/*.json (openaq_arsip.py, PENGAMATAN stasiun multi-tahun, jam UTC). Tanpa folder itu: tidak menulis apa pun
            (CAMS di repo hanya 120 hari dan stasiun BMKG/ISPU baru sejak Nov 2026, jadi tidak ada dasar dua tahun lain).
  Kota    : stasiun dipetakan ke kab/kota terdekat <= 30 km (kota.json, pusat berbobot jiwa); nilai kota = rata stasiun-stasiunnya pada hari itu.
  Jendela : tiap tahun dihitung 1 Jan sampai tanggal data terakhir (sama untuk semua tahun) supaya tahun berjalan sebanding.
            Tahun dengan data < 70% hari jendela: hari_di_atas = null (kosong, bukan 0).
  Tetangga: belum ada arsip multi-tahun (stasiun_asing.json hanya 6 hari, ditahan menunggu izin DOE) -> `tetangga` null dengan alasan.
  Setara rokok (K8, perkiraan kasar): rata PM2,5 harian tahun itu (hari bernilai saja) / 22 = batang per hari, dibulatkan ke 0,5; Berkeley Earth: 22 ug/m3 selama 24 jam ~ 1 batang.
  Null bila hari_di_atas null (data < ambang jendela).
"""
import datetime as dt
import glob
import json
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


AMBANG_HARI, MIN_JAM, MIN_TUTUP, JARAK_MAKS = 55.0, 18, 0.7, 30
UG_PER_BATANG = 22.0   # Berkeley Earth (Muller, 2015): 22 ug/m3 x 24 jam ~ 1 batang rokok; perkiraan kasar


def harian_wib(h):
    """{'YYYY-MM-DDTHH' UTC: ug/m3} -> {tgl WIB: rata 24 jam}, hanya hari dengan >= MIN_JAM jam terisi."""
    per = {}
    for t, v in h.items():
        if v is None:
            continue
        w = dt.datetime.strptime(t[:13], "%Y-%m-%dT%H") + dt.timedelta(hours=7)
        per.setdefault(w.date().isoformat(), []).append(v)
    return {d: sum(x) / len(x) for d, x in per.items() if len(x) >= MIN_JAM}


def hari_tinggi(stasiun, kota):
    """stasiun [{lat, lon, h}] (jam UTC), kota [{kode, nama, lat, lon}] -> {kota, jendela, tahun, tetangga}; None bila tak ada data."""
    per = {}   # kode kota -> {tgl: [rata stasiun...]}
    for st in stasiun:
        j, k = min(((alat.jarak_km(st["lat"], st["lon"], c["lat"], c["lon"]), c) for c in kota), key=lambda x: x[0])
        if j > JARAK_MAKS:
            continue
        for d, v in harian_wib(st["h"]).items():
            per.setdefault(k["kode"], {}).setdefault(d, []).append(v)
    tgl = [d for v in per.values() for d in v]
    if not tgl:
        return None
    akhir = max(tgl)[5:]
    nama = {c["kode"]: c["nama"] for c in kota}
    out = {}
    for kode, v in per.items():
        rata = {d: sum(x) / len(x) for d, x in v.items() if d[5:] <= akhir}
        th = {}
        for y in sorted({d[:4] for d in rata}):
            n_jendela = (dt.date.fromisoformat(f"{y}-{akhir}") - dt.date(int(y), 1, 1)).days + 1
            ada = [x for d, x in rata.items() if d[:4] == y]
            cukup = len(ada) >= MIN_TUTUP * n_jendela
            th[y] = [len(ada), sum(x > AMBANG_HARI for x in ada) if cukup else None,
                     round(sum(ada) / len(ada) / UG_PER_BATANG * 2) / 2 if cukup else None]
        out[kode] = {"nama": nama[kode], "tahun": th}
    return {"jendela": f"01-01 s/d {akhir}", "kolom": ["hari_data", "hari_di_atas", "setara_rokok_per_hari"], "setara_rokok_status": "perkiraan kasar",
            "setara_rokok_rujukan": "Berkeley Earth: 22 ug/m3 selama 24 jam ~ 1 batang", "ambang_ug": AMBANG_HARI, "kota": out,
            "tetangga": None, "tetangga_alasan": "arsip multi-tahun kota negara tetangga belum ada di repo"}


def main_hari_tinggi():
    st = []
    for f in glob.glob(os.path.join(alat.RAW, "openaq_arsip", "*.json")):
        d = alat.muat(f)
        if d.get("lat") is not None and d.get("lon") is not None:
            st.append(d)
    d = hari_tinggi(st, alat.kota()) if st else None
    if not d:
        alat.log("hari_tinggi: arsip OpenAQ tidak ada, hari_tinggi.json tidak ditulis")
        return
    d.update({"v": 1, "sumber": "OpenAQ (openaq.org) dan penyedia asalnya; hitungan Centurisk97", "n_stasiun": len(st)})
    alat.log(f"hari_tinggi.json: {alat.simpan('hari_tinggi.json', d) // 1024} KB, {len(d['kota'])} kota")


def main():
    main_hari_tinggi()
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
    # hari tinggi: 3 kota; hari WIB tgl = 24 jam UTC mulai (tgl - 1)T17
    def jam(tgl, v):
        o = dt.datetime.fromisoformat(tgl) - dt.timedelta(hours=7)
        return {(o + dt.timedelta(hours=i)).strftime("%Y-%m-%dT%H"): v for i in range(24)}
    h1 = {**jam("2024-03-01", 60), **jam("2024-03-02", 50), **jam("2025-03-01", 60), **jam("2025-03-02", 56), **jam("2026-03-01", 70)}
    ko = [{"kode": "a", "nama": "A", "lat": 0, "lon": 100}, {"kode": "b", "nama": "B", "lat": 5, "lon": 100}, {"kode": "c", "nama": "C", "lat": 10, "lon": 100}]
    r = hari_tinggi([{"lat": 0.01, "lon": 100, "h": h1}, {"lat": 5, "lon": 100, "h": {"2026-03-01T00": 99}}, {"lat": 20, "lon": 0, "h": h1}], ko)
    assert r["jendela"] == "01-01 s/d 03-01" and list(r["kota"]) == ["a"], r   # stasiun jauh dan stasiun 1 jam (b) tak menghasilkan kota; c tanpa data
    a = r["kota"]["a"]["tahun"]
    assert a["2024"] == [1, None, None] and a["2026"] == [1, None, None], a   # data < 70% jendela -> null, bukan 0
    n = 70   # jendela 70 hari penuh
    pen = {}
    for i in range(n):
        d = (dt.date(2025, 1, 1) + dt.timedelta(i)).isoformat()
        pen.update(jam(d, 56 if i < 10 else 20))
    r = hari_tinggi([{"lat": 0, "lon": 100, "h": pen}], ko)
    assert r["kota"]["a"]["tahun"]["2025"][1] == 10, r
    assert r["kota"]["a"]["tahun"]["2025"][2] == round((10 * 56 + 60 * 20) / 70 / 22 * 2) / 2, r
    print("riwayat uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
