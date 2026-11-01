"""Langganan cuaca ekstrem: laju dasar kejadian logbook jenis `cuaca` per kabupaten x bulan -> public/banjir/data/cuaca_langganan.json (M5)

Masukan: public/data/logbook_riwayat.json (scripts/data/logbook_bersih.py; commit 2934f7b9): per kab `bulan_penuh[jenis][bulan 0..11]` = kejadian di
TAHUN PENUH saja (tahun yang tiap bulannya >= 25 hari tercatat; daftar di `tahun_penuh`, dibaca dari data, bukan ditulis tetap).
laju = kejadian bulan itu / jumlah tahun penuh = kejadian per tahun pada bulan itu. Prediktor sejenis teruji paling kuat (klimatologi kab x bulan
latih 2016-2021 mencapai AUC 0,865 di uji 2022-2025, cuaca_uji_logbook.json); laju di berkas ini memakai semua tahun penuh termasuk 2024-2025,
jadi untuk laju ini angka itu bukan uji luar-sampel. Laju ini mencerminkan musim DAN kebiasaan lapor, bukan bahaya fisik.
Keluaran: {dibuat, sumber, tahun_penuh, n_tahun, kolom, bulan: {"1".."12": [[prov|kab, kejadian, laju] urut menurun]}, bulan_ini: {bulan, top: [[kab, kejadian, laju, peringkat]]}, catatan}
Kabupaten tanpa kejadian di bulan itu tidak ditulis. Peringkat = urutan dalam daftar bulan (1 = tertinggi).
Pakai: python3 scripts/cuaca/langganan.py   |   python3 scripts/cuaca/langganan.py uji
"""
import datetime as dt, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, WIB, baca, sekarang, simpan

JENIS, TOP = "cuaca", 20


def hitung(riw, jenis=JENIS):
    tp = riw["tahun_penuh"]
    n = len(tp)
    if not n:
        raise ValueError("tahun_penuh kosong")
    bulan = {}
    for m in range(12):
        baris = [(k, v["bulan_penuh"][jenis][m]) for k, v in riw["kab"].items() if v.get("bulan_penuh", {}).get(jenis, [0] * 12)[m] > 0]
        baris.sort(key=lambda x: (-x[1], x[0]))
        bulan[str(m + 1)] = [[k, c, round(c / n, 2)] for k, c in baris]
    return tp, bulan


def main(kini=None):
    riw = baca(os.path.join(AKAR, "public/data/logbook_riwayat.json"))
    if not riw:
        raise RuntimeError("logbook_riwayat.json tidak ada: langganan dilewati")
    tp, bulan = hitung(riw)
    b = (kini or dt.datetime.now(WIB).date()).month
    simpan(os.path.join(KELUAR, "cuaca_langganan.json"), {
        "dibuat": sekarang(), "sumber": "Logbook harian Pusdalops BNPB (logbook_riwayat.json), jenis cuaca, tahun penuh saja", "tahun_penuh": tp, "n_tahun": len(tp),
        "kolom": ["kab", "kejadian", "per_tahun"], "bulan": bulan,
        "bulan_ini": {"bulan": b, "top": [[*r, i + 1] for i, r in enumerate(bulan[str(b)][:TOP])]},
        "catatan": "Laju dasar kejadian cuaca yang tercatat di logbook per kabupaten dan bulan. Ia mencerminkan musim dan kebiasaan lapor kabupaten, bukan bahaya fisik; "
                   "logbook tidak memisahkan subjenis (puting beliung, angin kencang, hujan lebat)."})
    print(f"cuaca langganan: {len(tp)} tahun penuh; bulan {b}: {len(bulan[str(b)])} kab berlangganan, teratas {bulan[str(b)][0] if bulan[str(b)] else None}", file=sys.stderr)


def uji():
    riw = {"tahun_penuh": ["2014", "2015"], "kab": {"1|A": {"bulan_penuh": {"cuaca": [4, 0] + [0] * 10}}, "1|B": {"bulan_penuh": {"cuaca": [1, 2] + [0] * 10}},
                                                      "1|C": {"bulan_penuh": {"banjir": [9] * 12}}, "1|D": {"bulan_penuh": {"cuaca": [4, 0] + [0] * 10}}}}
    tp, b = hitung(riw)
    assert b["1"] == [["1|A", 4, 2.0], ["1|D", 4, 2.0], ["1|B", 1, .5]] and b["2"] == [["1|B", 2, 1.0]] and b["3"] == []   # seri urut kunci; jenis lain tak ikut
    try:
        hitung({"tahun_penuh": [], "kab": {}})
        raise SystemExit("tanpa tahun penuh harus ditolak")
    except ValueError:
        pass
    print("ok langganan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
