"""Citra Sentinel-2 SEBELUM dan SESUDAH aliran lahar/awan panas tiap peristiwa pilihan -> public/gunungapi/data/citra/<id>_<YYYYMMDD>.png
dan kolom `citra` di public/gunungapi/data/paparan.json (dijaga paparan.py saat menulis ulang).

Mesin baca COG/PNG/penilaian awan dipinjam dari scripts/data (citra.py, konsesi_citra.py), tidak disunting.
Citra warna semu: R = SWIR 2,2 um, G = NIR, B = merah (sama dengan citra karhutla): endapan segar tampak abu-kebiruan/terang tanpa vegetasi,
hutan hijau tua. Adegan dipilih paling jelas: tanpa-data <= 25% (kotak yang terbelah ubin MGRS ditolak), awan+bayangan terendah; 150 hari sebelum dan 75 hari sesudah.
Gagal (STAC/COG tak terjangkau) = pesan dan keluar 0; berkas lama dibiarkan.
Pakai:  python3 scripts/gunungapi/citra.py          unduh dan tulis
        python3 scripts/gunungapi/citra.py uji      self-check
"""
import datetime as dt, json, os, sys
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/gunungapi/data/citra")
PAPARAN = os.path.join(AKAR, "public/gunungapi/data/paparan.json")
SEBELUM, SESUDAH = 150, 75    # hari jendela cari (sebelum diperlebar: musim hujan Indonesia sering menutup 60 hari penuh)
UA = "poskokarhutla/1.0 (+https://github.com/terasurbannetwork/poskokarhutla)"
MAKS_AWAN, MAKS_AWAN_LONGGAR, MAKS_KOSONG = 35, 55, 25
# id gunung, tanggal peristiwa, pusat kotak (aliran), sisi km, nama peristiwa
PERISTIWA = [
    ("semeru", "2021-12-04", -8.20, 112.95, 16, "Awan panas guguran Semeru 4 Des 2021"),
    ("semeru", "2022-12-04", -8.20, 112.95, 16, "Awan panas guguran Semeru 4 Des 2022"),
    ("merapi", "2023-03-11", -7.60, 110.41, 16, "Guguran lava dan awan panas Merapi 11 Mar 2023"),
    ("lewotobi-laki-laki", "2024-11-04", -8.54, 122.78, 24, "Erupsi Lewotobi Laki-laki 3-4 Nov 2024"),
    ("ruang", "2024-04-17", 2.30, 125.37, 10, "Erupsi Ruang 16-17 Apr 2024"),
    ("marapi", "2024-05-11", -0.40, 100.47, 24, "Banjir bandang lahar dingin Marapi 11 Mei 2024"),
]


def skor(awan, kosong):
    """lebih kecil lebih jelas; tanpa-data dihukum lebih berat karena membuat gambar bolong"""
    return awan + 1.5 * kosong


def pilih(adegan, tanggal):
    """adegan [(tgl, awan%, kosong%, item)] -> (sebelum, sesudah) terbaik di luar batas awan/kosong; None bila tak ada.
    Seri: yang lebih dekat ke peristiwa."""
    t0 = dt.date.fromisoformat(tanggal)

    def terbaik(daftar):
        sah = [a for a in daftar if a[1] <= MAKS_AWAN and a[2] <= MAKS_KOSONG] or \
              [a for a in daftar if a[1] <= MAKS_AWAN_LONGGAR and a[2] <= MAKS_KOSONG]   # gunung selalu berawan: terbaik yang ada, awan tertulis di keterangan
        return min(sah, key=lambda a: (skor(a[1], a[2]), abs((dt.date.fromisoformat(a[0]) - t0).days)), default=None)
    return (terbaik([a for a in adegan if dt.date.fromisoformat(a[0]) < t0]),
            terbaik([a for a in adegan if dt.date.fromisoformat(a[0]) > t0]))


def berkas(id_, tgl):
    return f"{id_}_{tgl.replace('-', '')}.png"


def entri(id_, peristiwa, fase, a, bbox):
    tgl, awan, kosong, _ = a
    return {"tgl": tgl, "berkas": f"/gunungapi/data/citra/{berkas(id_, tgl)}", "bbox": bbox, "fase": fase,
            "keterangan": f"{peristiwa}: {fase}, Sentinel-2, awan {awan}%"}


def gabung(paparan, hasil):
    """hasil {id: [entri]} -> paparan dengan citra gunung terisi, urut tanggal; id yang tak ada di paparan dilaporkan (dikembalikan)"""
    ada = {g["id"] for g in paparan["gunung"]}
    for g in paparan["gunung"]:
        if g["id"] in hasil:
            g["citra"] = sorted(hasil[g["id"]], key=lambda e: e["tgl"])
    return paparan, sorted(set(hasil) - ada)


_M = []


def mesin():
    """scripts/data/citra.py dan konsesi_citra.py dimuat lewat jalur (nama modul 'citra' bentrok dengan berkas ini)"""
    import importlib.util
    if _M:
        return _M
    d = os.path.join(AKAR, "scripts/data")
    sys.path.insert(0, d)
    hasil = []
    for nama, alias in (("citra", "citra_karhutla"), ("konsesi_citra", "konsesi_citra")):
        sp = importlib.util.spec_from_file_location(alias, os.path.join(d, nama + ".py"))
        m = importlib.util.module_from_spec(sp)
        sys.modules[alias] = m
        if nama == "konsesi_citra":
            sys.modules["citra"] = hasil[0]   # konsesi_citra melakukan 'import citra as C'
        sp.loader.exec_module(m)
        hasil.append(m)
    sys.modules.pop("citra", None)
    hasil[0].UA["User-Agent"] = UA   # UA jujur untuk STAC/COG (earth-search menjawab 200, dicek curl 19 Okt 2026)
    _M.extend(hasil)
    return _M


def kerja(ev):
    C, K = mesin()
    id_, tgl, lat, lon, km, nama = ev
    t0 = dt.date.fromisoformat(tgl)
    bb = C.kotak(lat, lon, km)
    fitur = []
    for dari, sampai in ((t0 - dt.timedelta(days=SEBELUM), t0), (t0, t0 + dt.timedelta(days=SESUDAH))):   # dua pencarian: limit 100 memotong jendela panjang
        q = {"collections": ["sentinel-2-l2a"], "bbox": C.kotak(lat, lon, 1), "limit": 100,
             "datetime": f"{dari.isoformat()}T00:00:00Z/{sampai.isoformat()}T23:59:59Z",
             "sortby": [{"field": "properties.datetime", "direction": "asc"}]}
        fitur += json.loads(C.ambil(C.STAC, data=json.dumps(q).encode()))["features"]
    adegan, lihat = [], set()
    for it in fitur:
        d = it["properties"]["datetime"][:10]
        if d == tgl or it["id"] in lihat or not C.menutup(it["geometry"], C.kotak(lat, lon, 1)):
            continue
        try:
            aw, ks = K.awan(it, lat, lon, km)
        except Exception as e:
            print(f"  {id_} {d}: {e}", file=sys.stderr)
            continue
        lihat.add(it["id"])
        adegan.append((d, aw, ks, it))
    sb, ss = pilih(adegan, tgl)
    out = []
    for fase, a in (("sebelum", sb), ("sesudah", ss)):
        if not a:
            print(f"  {nama}: tak ada adegan {fase} yang cukup jelas ({len(adegan)} diperiksa)", file=sys.stderr)
            continue
        p = os.path.join(KELUAR, berkas(id_, a[0]))
        if not os.path.exists(p):
            K.swir(a[3], lat, lon, km, p)
        out.append(entri(id_, nama, fase, a, bb))
        print(f"  {nama}: {fase} {a[0]} awan {a[1]}% kosong {a[2]}% {os.path.getsize(p) / 1e3:.0f} KB", file=sys.stderr)
    return id_, out


def main():
    os.makedirs(KELUAR, exist_ok=True)
    try:
        mesin()
        with ThreadPoolExecutor(3) as ex:
            res = list(ex.map(kerja, PERISTIWA))
    except Exception as e:
        print(f"citra gagal: {e}; berkas lama dibiarkan", file=sys.stderr)
        return
    hasil = {}
    for id_, out in res:
        hasil.setdefault(id_, []).extend(out)
    pakai = {berkas(i, e["tgl"]) for i, v in hasil.items() for e in v}
    for f in os.listdir(KELUAR):   # sisa pilihan lama (adegan yang kalah) dibuang
        if f.endswith(".png") and f not in pakai:
            os.remove(os.path.join(KELUAR, f))
    if not os.path.exists(PAPARAN):
        print("paparan.json belum ada: jalankan paparan.py dulu; PNG sudah disimpan", file=sys.stderr)
        return
    p, hilang = gabung(json.load(open(PAPARAN)), hasil)
    if hilang:
        print("gunung tak ada di paparan.json:", hilang, file=sys.stderr)
    open(PAPARAN + ".tmp", "w").write(json.dumps(p, ensure_ascii=False, separators=(",", ":")))
    os.replace(PAPARAN + ".tmp", PAPARAN)
    print(f"citra: {sum(len(v) for v in hasil.values())} citra untuk {len(hasil)} gunung", file=sys.stderr)


def uji():
    c = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "contoh/paparan_citra_contoh.json")))
    ad = [(a[0], a[1], a[2], None) for a in c["adegan"]]
    sb, ss = pilih(ad, c["tanggal"])
    assert sb[0] == c["harapan"]["sebelum"] and ss[0] == c["harapan"]["sesudah"], (sb, ss)   # berawan 80% dan 40% kosong tak terpilih
    assert pilih([("2021-11-01", 90, 0, None)], "2021-12-04") == (None, None)                 # semua berawan: tak ada vonis jernih
    assert pilih([("2021-12-04", 0, 0, None)], "2021-12-04") == (None, None)                  # hari peristiwa tak termasuk
    assert berkas("semeru", "2021-12-02") == "semeru_20211202.png"
    e = entri("semeru", "APG", "sesudah", ss, [1, 2, 3, 4])
    p, hilang = gabung({"gunung": [{"id": "semeru", "citra": []}]}, {"semeru": [e, dict(e, tgl="2021-01-01")], "x": [e]})
    assert hilang == ["x"] and [x["tgl"] for x in p["gunung"][0]["citra"]][0] == "2021-01-01"
    for ev in PERISTIWA:
        assert ev[0] and 4 <= ev[4] <= 30 and dt.date.fromisoformat(ev[1])
    for f in os.listdir(KELUAR) if os.path.isdir(KELUAR) else []:
        if f.endswith(".png"):
            assert os.path.getsize(os.path.join(KELUAR, f)) <= 300_000, f"{f} > 300 KB"
    print("citra uji: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
