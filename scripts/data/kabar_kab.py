"""Kabar api per kabupaten untuk halaman /kabar (docs/bnpb/PROGRAM-15-JAM.md blok B).

Memecah public/data/tugas_kompleks.json (7 MB, terlalu berat untuk ponsel di lapangan) menjadi satu berkas
kecil per kabupaten: hanya kompleks yang lolos syarat tugas otomatis (level 3 dan level 2 bersyarat), urut
level lalu titik panas 24 jam, paling banyak MAKS per kabupaten. Nama perusahaan konsesi TIDAK dibawa
(halaman ini terbuka tanpa login); yang tersisa jenis konsesinya saja.

Keluaran: public/data/kabar/index.json dan public/data/kabar/<prov>-<slug>.json.
Bentuk tiap butir: {"t": {...tugas untuk KartuApi}, "kartu": {...kunci kartu}} supaya layar memanggil
KartuApi.pasang(wadah, t, kartu) persis seperti /instansi.

Jalankan: python3 scripts/data/kabar_kab.py [--uji]
"""
import json, os, re, sys, tempfile

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.environ.get("KABAR_DATA") or os.path.join(AKAR, "public/data")
MAKS = 40
KUNCI_T = ("id", "lat", "lon", "level", "prov", "kab", "kec", "n24", "rekomendasi", "akses")
KUNCI_KARTU = ("insiden", "front", "masuk", "radius_m", "luas_aktif", "luas_koreksi", "tren", "syarat", "insiden_awal")


def slug(prov, kab):
    s = re.sub(r"[^a-z0-9]+", "-", str(kab).lower()).strip("-")
    return f"{prov}-{s or 'tanpa-nama'}"


def butir(k):
    t = {c: k[c] for c in KUNCI_T if c in k}
    kartu = {c: k[c] for c in KUNCI_KARTU if c in k}
    jenis = sorted({str(x.get("jenis")) for x in k.get("konsesi") or [] if isinstance(x, dict) and x.get("jenis")})
    if jenis:
        kartu["konsesi_jenis"] = jenis   # tanpa nama pemegang
    return {"t": t, "kartu": kartu}


def pecah(dok):
    kel = {}
    for k in dok.get("kompleks") or []:
        if not k.get("otomatis") or not k.get("kab") or not k.get("prov"):
            continue
        kel.setdefault((str(k["prov"]), k["kab"]), []).append(k)
    berkas, indeks = {}, []
    for (prov, kab), ks in kel.items():
        ks.sort(key=lambda k: (-(k.get("level") or 0), -(k.get("n24") or 0)))
        nama = slug(prov, kab)
        berkas[nama] = {"dibuat": dok.get("dibuat"), "prov": prov, "kab": kab, "total": len(ks),
                        "l3": sum(1 for k in ks if k.get("level") == 3),
                        "butir": [butir(k) for k in ks[:MAKS]]}
        indeks.append({"f": nama, "prov": prov, "kab": kab, "n": len(ks),
                       "l3": sum(1 for k in ks if k.get("level") == 3)})
    indeks.sort(key=lambda x: (-x["l3"], -x["n"], x["kab"]))
    return {"dibuat": dok.get("dibuat"), "kab": indeks}, berkas


def tulis(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    tmp = jalur + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, jalur)


def jalan(data):
    with open(os.path.join(data, "tugas_kompleks.json"), encoding="utf-8") as f:
        dok = json.load(f)
    indeks, berkas = pecah(dok)
    keluar = os.path.join(data, "kabar")
    lama = set(os.listdir(keluar)) if os.path.isdir(keluar) else set()
    for nama, isi in berkas.items():
        tulis(os.path.join(keluar, nama + ".json"), isi)
    tulis(os.path.join(keluar, "index.json"), indeks)
    for sisa in lama - {n + ".json" for n in berkas} - {"index.json"}:   # kabupaten yang apinya sudah tidak lolos syarat
        os.remove(os.path.join(keluar, sisa))
    return indeks, berkas


def uji():
    dok = {"dibuat": "2026-10-22T10:00:00Z", "kompleks": [
        {"id": "K1", "prov": "62", "kab": "Kapuas", "level": 2, "n24": 50, "otomatis": True, "lat": -2, "lon": 114,
         "konsesi": [{"jenis": "sawit", "nama": "PT Rahasia", "pemegang": "PT Rahasia"}], "insiden": "62-1", "rekomendasi": {}},
        {"id": "K2", "prov": "62", "kab": "Kapuas", "level": 3, "n24": 10, "otomatis": True, "lat": -2, "lon": 114},
        {"id": "K3", "prov": "62", "kab": "Kapuas", "level": 2, "n24": 999, "otomatis": False},
        {"id": "K4", "prov": "14", "kab": "Kota Dumai", "level": 2, "n24": 5, "otomatis": True},
    ]}
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, "kabar"))
        open(os.path.join(d, "kabar", "62-lama.json"), "w").write("{}")
        with open(os.path.join(d, "tugas_kompleks.json"), "w") as f:
            json.dump(dok, f)
        indeks, berkas = jalan(d)
        assert [x["f"] for x in indeks["kab"]] == ["62-kapuas", "14-kota-dumai"], indeks
        kap = berkas["62-kapuas"]
        assert kap["total"] == 2 and [b["t"]["id"] for b in kap["butir"]] == ["K2", "K1"], "urut level lalu n24; non-otomatis dibuang"
        teks = open(os.path.join(d, "kabar", "62-kapuas.json"), encoding="utf-8").read()
        assert "Rahasia" not in teks and '"konsesi_jenis":["sawit"]' in teks, "nama konsesi tidak boleh terbit"
        assert not os.path.exists(os.path.join(d, "kabar", "62-lama.json")), "berkas kabupaten basi dihapus"
    print("kabar_kab: uji lolos")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    else:
        indeks, _ = jalan(DATA)
        print(f"kabar_kab: {len(indeks['kab'])} kabupaten")
