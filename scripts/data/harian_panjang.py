"""Titik panas per provinsi per hari WIB, sampai 400 hari ke belakang -> public/data/harian_panjang.json (kartu tren panel peta).

harian30.json hanya menyimpan 100 hari. Rentang tren 4 bulan ke atas butuh lebih panjang, jadi hari yang keluar dari jendela
harian30 disimpan di sini. Definisinya sama dengan titik_tahun.py dan harian30.py: lokasi unik ~375 m per hari WIB dari M, N, N20, N21,
semua keyakinan, tanpa sumber panas tetap.

Pakai:
  python3 scripts/data/harian_panjang.py bangun <dari> <sd> modis.csv snpp.csv noaa20.csv noaa21.csv   isi awal dari CSV FIRMS (sekali)
  python3 scripts/data/harian_panjang.py sambung                                                       salin hari harian30.json, tiap jalan pipeline
  python3 scripts/data/harian_panjang.py uji                                                           swa-uji tanpa jaringan
"""
import csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))

SIMPAN = 400
AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
JALUR = os.path.join(AKAR, "public/data/harian_panjang.json")
H30 = os.path.join(AKAR, "public/data/harian30.json")
SUMBER = "NASA FIRMS MODIS C6.1, VIIRS S-NPP, NOAA-20, NOAA-21; lokasi unik ~375 m per hari WIB, semua keyakinan, tanpa sumber panas tetap"
WIB = dt.timedelta(hours=7)


def ke_berkas(data):
    """data = {hari: {prov: n}} -> kolom per provinsi, SIMPAN hari terakhir, hari tanpa titik tetap punya baris."""
    if not data:
        return {"versi": 1, "sumber": SUMBER, "hari": [], "prov": {}}
    a, z = dt.date.fromisoformat(min(data)), dt.date.fromisoformat(max(data))
    hari = [(a + dt.timedelta(days=i)).isoformat() for i in range((z - a).days + 1)][-SIMPAN:]
    prov = sorted({p for t in hari for p in data.get(t, {})})
    return {"versi": 1, "sumber": SUMBER, "hari": hari, "prov": {p: [data.get(t, {}).get(p, 0) for t in hari] for p in prov}}


def dari_berkas(isi):
    return {t: {p: v[i] for p, v in isi["prov"].items() if v[i]} for i, t in enumerate(isi["hari"])}


def gabung_h30(data, h30):
    """Hari di harian30 menimpa arsip, KECUALI hari terakhirnya (hari_ini belum lengkap) kalau angkanya lebih kecil dari yang tersimpan."""
    for i, t in enumerate(h30["hari"]):
        data[t] = {p: v[i] for p, v in h30["prov"].items() if v[i]}
    return data


def tulis(data):
    with open(JALUR, "w") as f:
        json.dump(ke_berkas(data), f, separators=(",", ":"))


def bangun(dari, sd, *berkas):
    from firms_sumber import kelas_yakin
    import titik_palsu, titik_unik as TU
    from wilayah import Wilayah
    w, data, lihat = Wilayah(), {}, set()
    industri = titik_palsu.sel_industri()[0]
    for b in berkas:
        for r in csv.DictReader(open(b)):
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB
            d = t.date().isoformat()
            if not dari <= d <= sd:
                continue
            c = r["confidence"].strip()
            if kelas_yakin(c, c.isdigit()) < TU.KEYAKINAN_MIN:
                continue
            if industri and titik_palsu.palsu(r["latitude"], r["longitude"], industri):
                continue
            k = (d, TU.sel(float(r["latitude"]), float(r["longitude"])))
            if k in lihat:
                continue
            lihat.add(k)
            adm = w.cari(float(r["longitude"]), float(r["latitude"]))
            if adm:
                h = data.setdefault(d, {})
                h[adm[0]] = h.get(adm[0], 0) + 1
    tulis(data)
    print(sum(sum(h.values()) for h in data.values()), "titik,", len(data), "hari", file=sys.stderr)


def sambung():
    data = dari_berkas(json.load(open(JALUR))) if os.path.exists(JALUR) else {}
    tulis(gabung_h30(data, json.load(open(H30))))


def uji():
    data = {"2026-01-01": {"14": 3}, "2026-01-03": {"62": 2}}
    isi = ke_berkas(data)
    assert isi["hari"] == ["2026-01-01", "2026-01-02", "2026-01-03"], isi["hari"]
    assert isi["prov"] == {"14": [3, 0, 0], "62": [0, 0, 2]}, isi["prov"]
    assert dari_berkas(isi) == {"2026-01-01": {"14": 3}, "2026-01-02": {}, "2026-01-03": {"62": 2}}
    g = gabung_h30(dict(data), {"hari": ["2026-01-03", "2026-01-04"], "prov": {"62": [5, 7]}})
    assert g["2026-01-03"] == {"62": 5} and g["2026-01-04"] == {"62": 7} and g["2026-01-01"] == {"14": 3}, g
    panjang = {(dt.date(2025, 1, 1) + dt.timedelta(days=i)).isoformat(): {"14": 1} for i in range(SIMPAN + 50)}
    assert len(ke_berkas(panjang)["hari"]) == SIMPAN
    print("harian_panjang: uji lolos")


if __name__ == "__main__":
    perintah = sys.argv[1] if len(sys.argv) > 1 else "sambung"
    {"bangun": bangun, "sambung": sambung, "uji": uji}[perintah](*sys.argv[2:])
