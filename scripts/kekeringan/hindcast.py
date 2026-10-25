"""Hindcast musim kering tahun nyata -> public/kekeringan/data/hindcast.json, untuk kalibrasi 'jiwa rentan krisis air' terhadap jiwa terdampak DIBI.

Hanya tahun yang ada di iklim_neraca.json (hujan, suhu, RH, angin, radiasi NASA POWER per bulan): 1997, 1998, 2015, 2016, 2023, 2024. TAHUN 2019 TIDAK ADA di bahan itu.
Mulai 1 Juni, simpanan penuh (sama dengan skenario Awal kemarau); hujan = rerata bulanan tahun itu dibagi harian oleh simulasi.js.
Pakai:  python3 scripts/kekeringan/hindcast.py        python3 scripts/kekeringan/hindcast.py uji
"""
import datetime as dt, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import neraca as N

TAHUN = (2015, 2023)
KELUAR = os.path.join(N.AKAR, "public/kekeringan/data/hindcast.json")


def bangun(iklim, kunci, tahun):
    out = {}
    for y in tahun:
        hs, es_ = [], []
        for k in kunci:
            h, e, _ = N.harian_dari_bulanan(iklim[k], y, dt.date(y, 6, 1))
            a, b = N.ringkas(h, e); hs.append(a); es_.append(b)
        out[str(y)] = {"mulai": f"{y}-06-01", "hujan": hs, "et0": es_}
    return out


def main():
    ner = json.load(open(os.path.join(N.AKAR, "public/data/kekeringan_neraca.json")))["sel_data"]
    kunci = [f"{la:g},{lo:g}" for la, lo in zip(ner["lat"], ner["lon"])]
    iklim = json.load(open(N.IKLIM))
    o = {"label": "Deteksi Pantau Bencana", "lat": ner["lat"], "lon": ner["lon"], "tahun": bangun(iklim, kunci, TAHUN),
         "catatan": "NASA POWER bulanan tahun nyata, mulai 1 Juni, simpanan penuh. 2019 tidak ada di bahan iklim."}
    json.dump(o, open(KELUAR, "w"), separators=(",", ":"))
    print(f"hindcast: {os.path.getsize(KELUAR) / 1000:.0f} KB; tahun {list(o['tahun'])}")


def uji():
    c = {"lat": 0.0, "z": 0.0, "norm": {"p": [5.0] * 12, "tx": [30.0] * 12, "tn": [22.0] * 12}, "tahun": {"2015": {"p": [1.0] * 12, "tx": [32.0] * 12, "tn": [23.0] * 12}}, "pm": {}}
    h15, e15, _ = N.harian_dari_bulanan(c, 2015, dt.date(2015, 6, 1))
    hn, _, _ = N.harian_dari_bulanan(c, "normal", dt.date(2015, 6, 1))
    assert all(abs(x - 1.0) < 1e-9 for x in h15) and all(abs(x - 5.0) < 1e-9 for x in hn)          # tahun nyata memakai nilainya sendiri, bukan klimatologi
    assert abs(N.harian_dari_bulanan(c, 2023, dt.date(2015, 6, 1))[0][0] - 5.0) < 1e-9               # tahun tanpa data: klimatologi
    print("ok hindcast")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
