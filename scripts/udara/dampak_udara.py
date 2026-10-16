"""Dampak kualitas udara, tanpa jaringan -> public/data/udara_dampak.json (folder yang di-commit data.yml; dirantai di akhir kualitas.py)

Per tanggal (4 hari prakiraan CAMS di asap.json): kecamatan yang PM2,5 rata-rata 24 jamnya di atas batas Baik+Sedang (55,4 ug/m3,
kategori Tidak sehat atau lebih menurut Permen LHK P.14/2020), dilihat dari sel CAMS 1 derajat yang memuat pusat kecamatannya.
Untuk kecamatan itu dihitung penduduk (WorldPop), sekolah dan siswa (Dapodik/EMIS), puskesmas/klinik dan rumah sakit (OSM) dengan
hitung() yang sama dengan scripts/banjir/dampak.py. Ini PERKIRAAN MODEL kasar (kisi ~40 km, belum dikoreksi ke alat ukur): penduduk
= semua penghuni kecamatan, sekolah/faskes = yang tercatat dan cocok nama/titik kecamatan, bisa kurang dari kenyataan.
Tanpa kecamatan di atas batas pada suatu tanggal, tanggal itu tidak punya kunci. Korban/kerugian historis tidak ada: BNPB tidak
mencatat kualitas udara sebagai jenis bencana (kabut asap karhutla ada di tab Dampak karhutla), jadi bagiannya tidak dibuat (A18).

{"dibuat", "hari": [..], "batas": 55.4, "terpapar": {tanggal: {"kec", "penduduk"?, "sekolah"?, "siswa"?, "faskes"?, "rs"?, ..., "prov": {kode: {...}}}},
 "cakupan": {"sekolah_cocok"}, "sumber"}
Pakai:  python3 scripts/udara/dampak_udara.py   |   python3 scripts/udara/dampak_udara.py uji
"""
import datetime as dt
import importlib.util
import json
import os
import sys
from collections import defaultdict

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kualitas  # noqa: E402

WIB = dt.timezone(dt.timedelta(hours=7))
BATAS = kualitas.BATAS[1]  # di atas ini = Tidak sehat atau lebih


def _banjir_dampak():
    """hitung() milik banjir dimuat lewat jalur (namanya `dampak` bentrok dengan modul lain di sys.path)."""
    sp = importlib.util.spec_from_file_location("banjir_dampak", os.path.join(AKAR, "scripts/banjir/dampak.py"))
    m = importlib.util.module_from_spec(sp); sys.modules["banjir_dampak"] = m; sp.loader.exec_module(m)
    return m


def kec_tidak_sehat(asap, pusat_kec, d, batas=BATAS):
    """Kunci kecamatan 'prov|kab|kec' yang PM2,5 rata-rata hari ke-d di atas `batas`; sel kosong dilewati."""
    k = asap["kolom"]
    i_rata = k.index("pm25_rata") - 2
    sel = {kualitas.kunci_sel(r[0], r[1]): r[2:] for r in asap["grid"]}
    out = []
    for kk, (la, lo) in pusat_kec.items():
        v = sel.get(kualitas.kunci_sel(la, lo))
        pm = v[i_rata][d] if v else None
        if pm is not None and pm > batas:
            out.append(kk)
    return sorted(out)


def main():
    B = _banjir_dampak()
    muat = lambda p: json.load(open(os.path.join(AKAR, p), encoding="utf-8"))
    asap, pusat = muat("public/data/asap.json"), muat("public/banjir/data/pusat_kec.json")
    pend_j, sk_j, fas_j = muat("public/data/penduduk.json"), muat("public/data/sekolah.json"), muat("public/data/fasilitas.json")
    pend = pend_j["kec"]
    sekolah = defaultdict(lambda: (0, 0))
    cocok = 0
    for r in sk_j["baris"]:
        k = f"{r[5]}|{r[6]}|{r[7]}"
        cocok += k in pend
        n, s = sekolah[k]
        sekolah[k] = (n + 1, s + (r[4] or 0))
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    from wilayah import Wilayah  # noqa: E402
    w = Wilayah()
    fas = defaultdict(lambda: (0, 0))
    for f in fas_j:
        if f["t"] in ("faskes", "rs"):
            adm = w.cari(f["lon"], f["lat"])
            if adm:
                k = f"{adm[0]}|{adm[1]}|{adm[2]}"
                x, y = fas[k]
                fas[k] = (x + (f["t"] == "faskes"), y + (f["t"] == "rs"))
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "hari": asap["hari"], "batas": BATAS, "terpapar": {},
           "cakupan": {"sekolah_cocok": round(cocok / len(sk_j["baris"]), 3)},
           "sumber": "perkiraan model CAMS (Copernicus) via Open-Meteo, belum dikoreksi; penduduk WorldPop 2026; sekolah Dapodik/EMIS; faskes OSM"}
    for d, t in enumerate(asap["hari"]):
        kec = kec_tidak_sehat(asap, pusat, d)
        if not kec:
            continue
        pv = defaultdict(list)
        for k in kec:
            pv[k.split("|")[0]].append(k)
        a = B.hitung(kec, pend, sekolah, fas)
        a["prov"] = {p: B.hitung(ks, pend, sekolah, fas) for p, ks in sorted(pv.items())}
        out["terpapar"][t] = a
    with open(os.path.join(AKAR, "public/data/udara_dampak.json.tmp"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(os.path.join(AKAR, "public/data/udara_dampak.json.tmp"), os.path.join(AKAR, "public/data/udara_dampak.json"))
    print("udara dampak: " + "; ".join(f"{t}: {a['kec']} kec, {a.get('penduduk', 0):,} jiwa, {a.get('sekolah', 0)} sekolah" for t, a in out["terpapar"].items()), file=sys.stderr)


def uji():
    asap = {"kolom": ["lat", "lon", "pm25_maks", "pm25_rata"], "grid": [[.5, 101.5, [90, 20], [60, 10]], [.5, 102.5, [90, 90], [None, 80]]]}
    pusat = {"14|A|a": [.2, 101.2], "14|A|b": [.9, 101.9], "14|B|c": [.4, 102.4], "14|C|d": [5.5, 101.5]}   # kec d di luar sel
    assert kec_tidak_sehat(asap, pusat, 0) == ["14|A|a", "14|A|b"]       # sel tanpa nilai (None) dan di luar sel dilewati
    assert kec_tidak_sehat(asap, pusat, 1) == ["14|B|c"]
    assert kec_tidak_sehat(asap, pusat, 0, batas=70) == []
    print("ok dampak udara")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
