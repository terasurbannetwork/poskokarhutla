"""Penduduk terpapar bahaya gempa per provinsi -> public/gempa/data/dampak.json

Silang dua berkas yang sudah ada: indeks bahaya gempa InaRISK per pusat kecamatan (public/gempa/data/inarisk_gempa.json, 0-1)
dan penduduk per kecamatan (public/data/penduduk.json `kec`, WorldPop). Kelas indeks: rendah < 1/3, sedang 1/3 sampai < 2/3, tinggi >= 2/3
(tiga sama lebar; itu pilihan kami, bukan ambang resmi InaRISK). Penduduk = seluruh penghuni kecamatan, bukan hanya yang di piksel berbahaya.
Kecamatan tanpa nilai InaRISK atau tanpa penduduk tidak dihitung dan dicatat jumlahnya.
Bukan perkiraan guncangan satu gempa: ini paparan bahaya jangka panjang. Model guncangan belum dipakai (koefisien belum diverifikasi).

Pakai:  python3 scripts/gempa/dampak.py        tulis berkas
        python3 scripts/gempa/dampak.py uji    self-check
"""
import datetime as dt, json, os, sys
from collections import defaultdict

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
BATAS = (1 / 3, 2 / 3)
KELAS = ("rendah", "sedang", "tinggi")


def kelas(v):
    return KELAS[0 if v < BATAS[0] else 1 if v < BATAS[1] else 2]


def hitung(indeks, penduduk):
    """indeks {kunci_kec: 0-1}, penduduk {kunci_kec: jiwa} -> (prov, nasional, tanpa_penduduk)."""
    prov = defaultdict(lambda: {"rendah": 0, "sedang": 0, "tinggi": 0, "kec_tinggi": 0})
    tanpa = 0
    for k, v in indeks.items():
        if k not in penduduk:
            tanpa += 1
            continue
        c = kelas(v); p = prov[k.split("|")[0]]
        p[c] += penduduk[k]
        p["kec_tinggi"] += c == "tinggi"
    nas = {c: sum(p[c] for p in prov.values()) for c in KELAS}
    return dict(sorted(prov.items())), nas, tanpa


def tulis():
    ind = json.load(open(os.path.join(AKAR, "public/gempa/data/inarisk_gempa.json")))
    pen = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))
    prov, nas, tanpa = hitung(ind["nilai"], pen["kec"])
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
           "batas": [round(b, 3) for b in BATAS], "nasional": nas, "kec_tanpa_penduduk": tanpa, "prov": prov,
           "sumber": {"bahaya": ind["sumber"], "penduduk": pen["sumber"]},
           "catatan": "Penduduk seluruh kecamatan menurut kelas indeks bahaya di pusat kecamatan; kelas = tiga sama lebar dari indeks 0-1."}
    with open(os.path.join(AKAR, "public/gempa/data/dampak.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"dampak: tinggi {nas['tinggi']:,} jiwa, sedang {nas['sedang']:,}, rendah {nas['rendah']:,}; {tanpa} kecamatan tanpa penduduk")


def uji():
    assert kelas(0.1) == "rendah" and kelas(0.5) == "sedang" and kelas(0.9) == "tinggi" and kelas(2 / 3) == "tinggi"
    prov, nas, tanpa = hitung({"11|A|a": 0.9, "11|A|b": 0.2, "12|B|c": 0.5, "12|B|d": 0.9}, {"11|A|a": 100, "11|A|b": 50, "12|B|c": 30})
    assert prov["11"] == {"rendah": 50, "sedang": 0, "tinggi": 100, "kec_tinggi": 1} and prov["12"]["sedang"] == 30 and tanpa == 1
    assert nas == {"rendah": 50, "sedang": 30, "tinggi": 100}
    print("dampak gempa: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
