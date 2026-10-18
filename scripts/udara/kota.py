"""Tabel kab/kota statis untuk pipeline udara -> scripts/udara/kota.json (dijalankan SEKALI tangan, bukan di CI).

Kode : Kepmendagri No 300.2.2-2138 Tahun 2025 lewat github.com/cahyadsn/wilayah db/wilayah.sql (MIT), dicocokkan ke nama
       kab di public/banjir/data/pusat_kec.json (batas yang sama dengan public/geo).
Titik: rata-rata pusat kecamatan berbobot penduduk (tempat orang tinggal, bukan pusat poligon yang bisa di hutan).
Jiwa : sel WorldPop public/data/penduduk.json ke pusat kecamatan terdekat dalam provinsi yang sama (cara kualitas.py).
Pakai: python3 scripts/udara/kota.py <wilayah.sql>   |   python3 scripts/udara/kota.py uji
"""
import difflib
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

ALIAS = {"padangsidempuan": "padangsidimpuan", "pangkajenekepulauan": "pangkajenedankepulauan", "pahuwato": "pohuwato"}


def norm(s):
    s = s.lower().replace("kabupaten", "").replace("kab.", "")
    s = re.sub(r"[^a-z]", "", s)
    return ALIAS.get(s, s)


def kunci(nama):
    """'Kota X' dan 'Kabupaten X' tetap beda (Kota Bekasi vs Kab. Bekasi)."""
    n = nama.strip()
    return ("kota" + norm(n[5:])) if n.lower().startswith("kota ") else norm(n)


def kode_kab(sql):
    return {k.replace(".", ""): n for k, n in re.findall(r"\('(\d\d\.\d\d)','([^']*)'\)", sql)}


def cocokkan(kab_geo, kode):
    """kab_geo: {(prov, nama)} -> {(prov, nama): kode}. Tepat dulu, lalu difflib dalam provinsi (>= 0,85)."""
    idx = {}
    for k, n in kode.items():
        idx.setdefault(k[:2], {})[kunci(n)] = k
    out = {}
    for p, n in kab_geo:
        if n in ("None", "") or p not in idx:
            continue
        kk = kunci(n)
        if kk in idx[p]:
            out[(p, n)] = idx[p][kk]
            continue
        c = difflib.get_close_matches(kk, list(idx[p]), n=1, cutoff=.85)
        if c:
            out[(p, n)] = idx[p][c[0]]
    return out


def bangun(pusat_kec, pend, kode):
    pusat = {}
    for kk, (la, lo) in pusat_kec.items():
        p, kab, _ = kk.split("|")
        pusat.setdefault(p, []).append([la, lo, kab, 0])
    h = pend.get("sel", .25) / 2
    for la, lo, jiwa, p in pend["grid"]:
        if p in pusat:
            # sel dibagi rata ke pusat kecamatan di dalamnya (kecamatan kota kecil dan rapat -> kota dapat bagiannya);
            # tanpa pusat di dalam sel: ke pusat terdekat. ponytail: proksi kasar, ganti dengan poligon kecamatan bila perlu presisi
            dlm = [q for q in pusat[p] if abs(q[0] - la) <= h and abs(q[1] - lo) <= h]
            if not dlm:
                c = math.cos(math.radians(la))
                dlm = [min(pusat[p], key=lambda q: (q[0] - la) ** 2 + ((q[1] - lo) * c) ** 2)]
            for q in dlm:
                q[3] += jiwa / len(dlm)
    peta = cocokkan({(p, q[2]) for p, qs in pusat.items() for q in qs}, kode)
    agr = {}
    for p, qs in pusat.items():
        for la, lo, kab, j in qs:
            if (p, kab) in peta:
                a = agr.setdefault(peta[(p, kab)], [p, kab, 0.0, 0.0, 0, 0.0])
                w = j or 1e-6
                a[2] += la * w
                a[3] += lo * w
                a[4] += j
                a[5] += w
    baris = []
    for k, (p, kab, sla, slo, j, w) in sorted(agr.items()):
        nm = kode[k].replace("Kabupaten ", "Kab. ")
        baris.append([k, nm, p, round(sla / w, 3), round(slo / w, 3), int(j), kab])
    return {"sumber": "Kode: Kepmendagri 300.2.2-2138/2025 (cahyadsn/wilayah, MIT); titik & jiwa: pusat kecamatan berbobot WorldPop 2026",
            "kolom": ["kode", "nama", "prov", "lat", "lon", "jiwa", "kab"], "baris": baris}


def uji():
    assert kunci("Kota Banda Aceh") == "kotabandaaceh" and kunci("Kabupaten Aceh Barat") == "acehbarat" == kunci("Aceh Barat")
    kode = {"1201": "Kabupaten Tapanuli Tengah", "1277": "Kota Padangsidimpuan", "1275": "Kota Medan", "3216": "Kabupaten Bekasi", "3275": "Kota Bekasi"}
    m = cocokkan({("12", "Kota Padang Sidempuan"), ("12", "Kota Medan"), ("12", "None"), ("32", "Bekasi"), ("32", "Kota Bekasi"), ("99", "X")}, kode)
    assert m == {("12", "Kota Padang Sidempuan"): "1277", ("12", "Kota Medan"): "1275", ("32", "Bekasi"): "3216", ("32", "Kota Bekasi"): "3275"}, m
    assert cocokkan({("12", "Kota Medann Raya Jauh")}, kode) == {}   # nama yang terlalu jauh ditolak, bukan ditebak
    pk = {"12|Kota Medan|A": [3.6, 98.7], "12|Kota Medan|B": [3.5, 98.6], "12|Kota Padang Sidempuan|C": [1.4, 99.3]}
    pend = {"sel": .25, "grid": [[3.6, 98.7, 900, "12"], [3.5, 98.6, 100, "12"], [1.4, 99.3, 50, "12"], [0, 0, 7, "99"], [3.0, 98.0, 20, "12"]]}
    b = bangun(pk, pend, kode)["baris"]   # sel (3,6;98,7) memuat pusat A dan B: dibagi rata ke A dan B; sel (3;98) tanpa pusat -> terdekat (B)
    assert b[0][:3] == ["1275", "Kota Medan", "12"] and b[0][5] == 1020 and b[0][3] == 3.549, b
    assert b[1][0] == "1277" and b[1][5] == 50 and len(b) == 2
    print("kota uji: lulus")


def main(sql_path):
    kode = kode_kab(open(sql_path, encoding="utf-8").read())
    if len(kode) < 500:
        raise SystemExit(f"wilayah.sql hanya {len(kode)} kab/kota; harus ~514")
    d = bangun(alat.muat(os.path.join(alat.AKAR, "public/banjir/data/pusat_kec.json")), alat.data("penduduk.json"), kode)
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kota.json")
    alat.simpan(p, d)
    alat.log(f"kota.json: {len(d['baris'])} kab/kota, {sum(r[5] for r in d['baris']):,} jiwa")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1])
