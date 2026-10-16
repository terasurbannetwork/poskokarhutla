"""Seri status harian aktual per provinsi, append-only -> public/banjir/data/seri_status.json

Satu baris per tanggal: jumlah kecamatan berstatus Waspada/Siaga/Awas HARI INI (hari ke-0 status.json, bukan prakiraan)
per provinsi, banjir dan longsor. Dipakai "dari kemarin" dan Tren (selisih dua tanggal).
{"hari": ["2026-10-13", ...], "prov": {"62": {"2026-10-13": [bw, bs, ba, lw, ls, la]}}, "nas": {tanggal: [6 angka]}}
  bw/bs/ba = banjir Waspada/Siaga/Awas, lw/ls/la = longsor. Provinsi tanpa kecamatan berstatus pada tanggal itu = [0,...]
  (status.json memang memuat semua kecamatan berstatus > 0, jadi nol di sini adalah pengukuran, bukan data hilang).
Aturan: tanggal lampau tidak pernah diubah; hanya tanggal terbaru boleh ditimpa jalan ulang di hari yang sama.
Status.json yang basi (hari ke-0 lebih tua dari hari-ini hujan.json) tidak dicatat: tanggal itu akan bolong, bukan palsu.
Pakai:  python3 scripts/banjir/seri_status.py   |   python3 scripts/banjir/seri_status.py uji
"""
import os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, baca, simpan
from wilayah import PROVINSI


def tambah(seri, st, hari_ini):
    """Catat hari ke-0 `st` ke `seri` (dimodifikasi di tempat). -> True bila ada yang ditulis."""
    tgl = st["hari"][0]
    if tgl != hari_ini:
        return False
    if seri["hari"] and tgl < seri["hari"][-1]:
        return False  # tanggal lampau tidak diubah
    baris = {k: [0] * 6 for k in PROVINSI}
    for kunci, v in st["kec"].items():
        p = baris[kunci.split("|")[0]]
        for i, lv in enumerate((v["b"][0], v["l"][0])):
            if lv:
                p[i * 3 + lv - 1] += 1
    for k, b in baris.items():
        seri["prov"].setdefault(k, {})[tgl] = b
    seri["nas"][tgl] = [sum(b[i] for b in baris.values()) for i in range(6)]
    if not seri["hari"] or seri["hari"][-1] != tgl:
        seri["hari"].append(tgl)
    return True


def main():
    st, hujan = baca(os.path.join(KELUAR, "status.json")), baca(os.path.join(KELUAR, "hujan.json"))
    if not st or not hujan:
        sys.exit("status.json/hujan.json belum ada")
    jalur = os.path.join(KELUAR, "seri_status.json")
    seri = baca(jalur, {"hari": [], "prov": {}, "nas": {}})
    n = len(seri["hari"])
    ada = os.path.exists(jalur)  # berkas selalu ada (kosong sah): layar memuatnya tanpa 404
    if tambah(seri, st, hujan["hari_ini"]) or not ada:
        simpan(jalur, seri)
        print(f"seri_status: {st['hari'][0]} nasional [bw,bs,ba,lw,ls,la] = {seri['nas'][st['hari'][0]]}; {len(seri['hari'])} hari (sebelumnya {n})", file=sys.stderr)
    else:
        print(f"seri_status: status.json hari ke-0 {st['hari'][0]} bukan hari ini ({hujan['hari_ini']}) atau lampau; tidak dicatat", file=sys.stderr)


def uji():
    seri = {"hari": [], "prov": {}, "nas": {}}
    st = {"hari": ["2026-01-02", "2026-01-03"], "kec": {"62|A|x": {"b": [2, 0], "l": [0, 0]}, "62|A|y": {"b": [1, 0], "l": [3, 0]},
                                                       "11|B|z": {"b": [0, 3], "l": [1, 1]}}}
    assert not tambah(seri, st, "2026-01-01") and seri["hari"] == []  # basi
    assert tambah(seri, st, "2026-01-02")
    assert seri["prov"]["62"]["2026-01-02"] == [1, 1, 0, 0, 0, 1] and seri["prov"]["11"]["2026-01-02"] == [0, 0, 0, 1, 0, 0]
    assert seri["prov"]["96"]["2026-01-02"] == [0] * 6 and seri["nas"]["2026-01-02"] == [1, 1, 0, 1, 0, 1]
    st2 = {"hari": ["2026-01-03"], "kec": {"11|B|z": {"b": [1], "l": [0]}}}
    assert tambah(seri, st2, "2026-01-03") and seri["hari"] == ["2026-01-02", "2026-01-03"]
    assert seri["prov"]["62"]["2026-01-02"] == [1, 1, 0, 0, 0, 1]              # lampau utuh
    st2["kec"]["11|B|z"]["b"] = [2]
    assert tambah(seri, st2, "2026-01-03") and seri["hari"] == ["2026-01-02", "2026-01-03"] and seri["nas"]["2026-01-03"][1] == 1  # hari ini boleh ditimpa
    assert not tambah(seri, {"hari": ["2026-01-02"], "kec": {}}, "2026-01-02")  # mundur ditolak
    print("ok seri_status")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
