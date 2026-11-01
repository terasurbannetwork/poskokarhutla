"""Kalender risiko per kab/kota x bulan x jenis dari logbook Pusdalops (public/data/logbook_riwayat.json, milik pipa-data).
Keluaran public/prediksi/data/kalender_risiko.json. REFERENSI KEDUA (bukan pengganti klimatologi di nilai.py):
klimatologi nilai.py = frekuensi harian dari DIBI/FIRMS yang teramati sistem ini (pendek); kalender ini = sisi dampak,
bagian tahun penuh (tahun_penuh di logbook_riwayat.json, tiap bulan >=25 hari tercatat) yang bulan itu punya >=1 kejadian tercatat: p = tahun_ada / jumlah tahun penuh."""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D

JENIS = ["banjir", "longsor", "cuaca", "karhutla"]
KECIL = 5   # kab dengan total kejadian jenis itu (tahun penuh, semua bulan) di bawah ini = sampel kecil


def peluang(ada, thn):
    return round(ada / thn, 2) if thn > 0 else None


def bangun(L, daftar):
    tp = L["tahun_penuh"]
    kab = {}
    for k in daftar:
        e = L["kab"].get(k["geo"])
        if e is None:
            continue
        kab[k["id"]] = {}
        for j in JENIS:
            ada = e.get("tahun_ada", {}).get(j, [0] * 12)
            n = e["bulan_penuh"].get(j, [0] * 12)   # kejadian tahun penuh saja
            kab[k["id"]][j] = {"ada": ada, "n": n, "p": [peluang(a, len(tp)) for a in ada], "kecil": sum(n) < KECIL}
    return {"dibuat": D.hari_ini(), "sumber": "Logbook harian Pusdalops BNPB, tahun penuh " + tp[0] + "-" + tp[-1],
            "tahun_penuh": tp, "n_tahun": len(tp), "jenis": JENIS, "kecil_di_bawah": KECIL,
            "metode": "Peluang = jumlah tahun penuh yang bulan itu punya minimal satu kejadian tercatat / jumlah tahun penuh. n = kejadian tahun penuh saja.",
            "kab": kab}


def uji():
    assert peluang(7, 7) == 1.0 and peluang(3, 7) == 0.43 and peluang(1, 0) is None
    L = {"tahun_penuh": ["2014", "2015"], "kab": {"1|A": {"bulan_penuh": {"banjir": [3] + [0] * 11}, "tahun": {"2014": {"banjir": 2}, "2015": {"banjir": 1}}, "tahun_ada": {"banjir": [2] + [0] * 11}}}}
    o = bangun(L, [{"id": "1", "geo": "1|A"}, {"id": "2", "geo": "x"}])
    b = o["kab"]["1"]["banjir"]
    assert list(o["kab"]) == ["1"] and b["p"][0] == 1.0 and b["kecil"] and o["kab"]["1"]["karhutla"]["ada"] == [0] * 12
    print("uji lulus kalender")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        L = json.load(open(os.path.join(D.AKAR, "public/data/logbook_riwayat.json")))
        o = bangun(L, D.kab())
        D.simpan(os.path.join(D.DATA, "kalender_risiko.json"), o)
        print(f"kalender_risiko.json: {len(o['kab'])} dari 514 kab/kota, {o['n_tahun']} tahun penuh")
