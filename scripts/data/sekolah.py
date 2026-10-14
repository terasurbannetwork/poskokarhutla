"""Ubah sekolah.xlsx (data sekolah nasional, 5 lembar) jadi public/data/sekolah.json untuk 9 provinsi prioritas.

Pakai: python3 -I scripts/data/sekolah.py [sekolah.xlsx]   (bawaan ~/Downloads/sekolah.xlsx; xlsx TIDAK masuk repo)
       python3 scripts/data/sekolah.py uji
Dibaca mengalir (zipfile + iterparse): xlsx ~250 MB / XML ~2 GB tidak dimuat utuh.
Lembar: 1 siswa (satu-satunya yang punya jumlah siswa), 2 guru, 3 rombel sekolah, 4 rombel emis (madrasah), 5 sekolah (profil).
Semuanya berkolom 12 awal sama; digabung per NPSN, lembar yang lebih awal menang."""
import json, math, os, re, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter

AKAR = os.path.join(os.path.dirname(__file__), "../..")
N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
# 9 provinsi prioritas (wilayah.PRIORITAS) menurut nama di data sumber
KODE = {"kalimantan tengah": "62", "sumatera selatan": "16", "kalimantan barat": "61", "papua selatan": "93", "kalimantan timur": "64",
        "kalimantan selatan": "63", "jambi": "15", "nusa tenggara timur": "53", "riau": "14"}
KOLOM = ["nama", "jenjang", "status", "npsn", "siswa", "prov", "kab", "kec", "desa", "lat", "lon"]


def kode_prov(nama):
    """'Prov. Kalimantan Tengah' -> '62'; None kalau di luar 9 provinsi."""
    return KODE.get(re.sub(r"^prov\.?\s*", "", (nama or "").strip(), flags=re.I).lower())


def titik_sah(lat, lon):
    """Koordinat Indonesia yang masuk akal; 0/kosong/luar negeri ditolak."""
    return lat is not None and lon is not None and (lat, lon) != (0, 0) and -11.5 <= lat <= 6.5 and 94 <= lon <= 142


def angka(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def bersih(s, awalan=""):
    s = (s or "").strip()
    s = re.sub(rf"^{awalan}\.?\s+", "", s, flags=re.I) if awalan else s
    return "" if s.upper() == "NULL" else s


def kol(ref):
    n = 0
    for c in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(c) - 64
    return n - 1


def baca_string(z):
    ss = []
    for _, e in ET.iterparse(z.open("xl/sharedStrings.xml")):
        if e.tag == N + "si":
            ss.append("".join(t.text or "" for t in e.iter(N + "t")))
            e.clear()
    return ss


def baris(z, ss, n, lebar=14):
    """Hasilkan list nilai (kolom 0..lebar-1) tiap baris lembar n; baris 1 (header) ikut."""
    for _, e in ET.iterparse(z.open(f"xl/worksheets/sheet{n}.xml")):
        if e.tag == N + "row":
            r = [None] * lebar
            for c in e.iter(N + "c"):
                k, v = kol(c.get("r")), c.find(N + "v")
                if k < lebar and v is not None:
                    r[k] = ss[int(v.text)] if c.get("t") == "s" else v.text
            yield r
            e.clear()


def ke_item(r, punya_siswa):
    """Satu baris sumber -> item sekolah, atau None bila di luar 9 provinsi / titik tak sah."""
    p = kode_prov(r[0])
    lat, lon = angka(r[8]), angka(r[9])
    if not p or not titik_sah(lat, lon):
        return None
    s = None
    if punya_siswa:
        s = int(angka(r[12]) or 0) + int(angka(r[13]) or 0)
    return [bersih(r[5]), (r[6] or "").strip(), "N" if (r[11] or "").upper().startswith("NEG") else "S", (r[4] or "").strip(), s, p,
            bersih(r[1], "kab"), bersih(r[2], "kec"), bersih(r[3]), round(lat, 5), round(lon, 5)]


def main(path):
    z = zipfile.ZipFile(path)
    ss = baca_string(z)
    ada, hasil, stat = {}, [], Counter()
    for n in range(1, 6):
        for i, r in enumerate(baris(z, ss, n)):
            if i == 0:
                assert r[0] == "provinsi" and r[8] == "lintang", f"lembar {n}: header tak dikenal {r[:10]}"
                continue
            stat[f"lembar{n}_baris"] += 1
            x = ke_item(r, n == 1)
            if not x:
                continue
            stat[f"lembar{n}_masuk"] += 1
            if x[3] in ada:  # NPSN sudah ada: lengkapi siswa kalau lembar ini yang punya
                continue
            ada[x[3]] = 1
            hasil.append(x)
        print(f"lembar {n} selesai: {stat[f'lembar{n}_baris']} baris, {stat[f'lembar{n}_masuk']} lolos", file=sys.stderr)
    hasil.sort(key=lambda x: (x[5], x[6], x[7], x[0]))
    out = {"sumber": "Data sekolah nasional (Dapodik/Kemendikbud, EMIS Kemenag)", "kolom": KOLOM, "baris": hasil}
    p = os.path.join(AKAR, "public/data/sekolah.json")
    json.dump(out, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(hasil)} sekolah -> {p} ({os.path.getsize(p) / 1e6:.1f} MB)")
    print("per provinsi:", dict(Counter(x[5] for x in hasil)))
    print("per jenjang:", dict(Counter(x[1] for x in hasil).most_common(12)))
    print("tanpa siswa (bukan di lembar siswa):", sum(x[4] is None for x in hasil))
    print(dict(stat))


def uji():
    assert kode_prov("Prov. Kalimantan Tengah") == "62" and kode_prov("PAPUA SELATAN") == "93" and kode_prov("Luar Negeri") is None
    assert kode_prov("Prov. Papua") is None and kode_prov(None) is None
    assert titik_sah(-2.2, 113.9) and not titik_sah(0, 0) and not titik_sah(None, 100) and not titik_sah(-2, 20) and not titik_sah(50, 110)
    assert bersih("Kab. Kapuas", "kab") == "Kapuas" and bersih("NULL") == "" and bersih("Kec. Selat", "kec") == "Selat"
    r = ["Prov. Riau", "Kota Pekanbaru", "Kec. Tampan", "Sidomulyo", "10001", "SD N 1", "SD", "A", "0.5", "101.4", "jl", "NEGERI", "100", "90"]
    assert ke_item(r, True) == ["SD N 1", "SD", "N", "10001", 190, "14", "Kota Pekanbaru", "Tampan", "Sidomulyo", 0.5, 101.4]
    assert ke_item(r, False)[4] is None
    assert ke_item(["Luar Negeri"] + r[1:], True) is None
    assert ke_item(r[:8] + ["0", "0"] + r[10:], True) is None
    print("uji sekolah ok")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "~/Downloads/sekolah.xlsx"
    uji() if a == "uji" else main(os.path.expanduser(a))
