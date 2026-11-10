"""Peringatan Dini Kekeringan Meteorologis BMKG (teks) -> public/banjir/data/peringatan_bmkg.json (terbaru) + peringatan_bmkg_arsip.json.

Sumber: halaman https://www.bmkg.go.id/peringatan-dini/kekeringan-meteorologis (SSR Nuxt). Daftar wilayah ada di <script id="__NUXT_DATA__"> (format devalue:
indeks merujuk ke array) sebagai {title, date, data}; data = {PROVINSI: {"1"|"2"|"3": {KABUPATEN: [KECAMATAN, ...]}}}, 1 Waspada, 2 Siaga, 3 Awas
(cocok dengan tabel di halaman). Status dipakai APA ADANYA; warna gambar peta tidak didigitasi. Label "BMKG", terpisah dari "Deteksi Centurisk97".
Endpoint /api/iklim/peringatan-kekeringan-meteorologis/latest menjawab 401 (butuh token internal): tidak dipakai. Halaman tidak menerima parameter tanggal
(?date, ?tanggal, ?dasarian dicoba 10 Nov 2026, semuanya mengembalikan dasarian terbaru), jadi dasarian lama TIDAK bisa diisi mundur: arsip mulai dari lari pertama.
Arsip: satu kunci per dasarian ("2026-11-1"); kunci lama tak pernah disentuh, kunci yang sama hanya diperbarui bila BMKG merevisi isinya dalam dasarian itu.
Tempat: public/banjir/data (ikut terbit dari cache banjir-; public/kekeringan/data ditimpa checkout main saat terbit). Dirantai di scripts/kekeringan/status.py RANTAI.
Gagal-lunak: jaringan/format rusak -> keluar 1, berkas lama dibiarkan.
Pakai:  python3 scripts/kekeringan/peringatan_bmkg.py   |   python3 scripts/kekeringan/peringatan_bmkg.py uji
"""
import datetime as dt, json, os, re, sys, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan

AKAR = os.path.normpath(os.path.join(AB, "../.."))
KELUAR = os.path.join(AKAR, "public/banjir/data/peringatan_bmkg.json")
ARSIP = os.path.join(AKAR, "public/banjir/data/peringatan_bmkg_arsip.json")
URL = "https://www.bmkg.go.id/peringatan-dini/kekeringan-meteorologis"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
ROMAWI = {"I": 1, "II": 2, "III": 3}


def ambil():
    with urllib.request.urlopen(urllib.request.Request(URL, headers=UA), timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def nuxt_json(html):
    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise ValueError("__NUXT_DATA__ tidak ada")
    return m.group(1)


def urai(teks):
    """devalue: tiap nilai dict/list berisi indeks ke array datar. Kembalikan {title, date, data} terurai."""
    a = json.loads(teks)

    def lepas(i, dalam=0):
        if dalam > 12:
            raise ValueError("terlalu dalam")
        x = a[i]
        if isinstance(x, dict):
            return {k: lepas(v, dalam + 1) for k, v in x.items()}
        if isinstance(x, list) and not (x and isinstance(x[0], str) and x[0] in ("ShallowReactive", "Reactive", "Ref", "ShallowRef")):
            return [lepas(v, dalam + 1) for v in x]
        return x
    for i, x in enumerate(a):
        if isinstance(x, dict) and {"title", "date", "data"} <= set(x):
            return lepas(i)
    raise ValueError("objek peringatan tidak ditemukan")


def bentuk(o, sekarang=None):
    judul, tgl, data = str(o["title"]), str(o["date"]), o["data"]
    m = re.search(r"Dasarian (III|II|I) (\w+) (\d{4}) \(([^)]*)\)", judul)
    if not m or m.group(2) not in BULAN or not isinstance(data, dict):
        raise ValueError("judul/data tidak dikenali: " + judul[:80])
    das, bln, thn, rentang = ROMAWI[m.group(1)], BULAN.index(m.group(2)) + 1, int(m.group(3)), m.group(4)
    n = {"1": 0, "2": 0, "3": 0}; kab = set(); kec = 0; tk = {"1": set(), "2": set(), "3": set()}
    for prov, per in data.items():
        for lv, kabs in per.items():
            if lv not in n or not isinstance(kabs, dict):
                raise ValueError(f"tingkat tak dikenal {lv}")
            for k, kcs in kabs.items():
                if not isinstance(kcs, list) or not all(isinstance(c, str) for c in kcs):
                    raise ValueError("kecamatan bukan daftar teks")
                n[lv] += len(kcs); kec += len(kcs); kab.add((prov, k)); tk[lv].add((prov, k))
    return {"sumber": "BMKG", "url": URL, "judul": judul, "tanggal": tgl, "kunci": f"{thn}-{bln:02d}-{das}", "dasarian": das, "bulan": bln, "tahun": thn,
            "rentang": rentang, "diambil": (sekarang or dt.datetime.now(dt.timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "ringkas": {"provinsi": len(data), "kabupaten": len(kab), "kabupaten_entri": sum(len(v) for v in tk.values()), "kecamatan": kec, "kecamatan_tingkat": n, "kabupaten_tingkat": {k: len(v) for k, v in tk.items()}},
            "data": data}


def tambah_arsip(arsip, isi):
    """Kunci lama tak disentuh; kunci yang sama diperbarui hanya bila datanya beda (revisi BMKG dalam dasarian)."""
    a = dict(arsip or {})
    lama = a.get(isi["kunci"])
    if lama is None or lama["data"] != isi["data"]:
        a[isi["kunci"]] = {k: isi[k] for k in ("judul", "tanggal", "rentang", "diambil", "ringkas", "data")}
    return a


def main():
    try:
        isi = bentuk(urai(nuxt_json(ambil())))
    except Exception as e:
        print(f"peringatan_bmkg gagal: {e}; berkas lama dibiarkan", file=sys.stderr)
        return 1
    simpan(ARSIP, tambah_arsip(baca(ARSIP, {}), isi))
    simpan(KELUAR, isi)
    r = isi["ringkas"]
    print(f"peringatan_bmkg: {isi['judul']}: {r['provinsi']} provinsi, {r['kabupaten']} kabupaten, {r['kecamatan']} kecamatan {r['kecamatan_tingkat']}")
    return 0


def uji():
    o = urai(open(os.path.join(AB, "fixture_peringatan_bmkg.json")).read())
    i = bentuk(o, dt.datetime(2026, 11, 10, tzinfo=dt.timezone.utc))
    r = i["ringkas"]
    assert i["kunci"] == "2026-11-1" and i["tanggal"] == "2026-11-01" and i["rentang"] == "1-10 November 2026"
    assert (r["provinsi"], r["kabupaten"], r["kabupaten_entri"], r["kecamatan"]) == (13, 48, 61, 320) and r["kecamatan_tingkat"] == {"1": 126, "2": 75, "3": 119}, r
    assert "KABUPATEN BANTUL" in i["data"]["DAERAH ISTIMEWA YOGYAKARTA"]["1"] and "BAMBANGLIPURO" in i["data"]["DAERAH ISTIMEWA YOGYAKARTA"]["1"]["KABUPATEN BANTUL"]
    a = tambah_arsip({"2026-10-3": {"data": {"X": 1}}}, i)
    assert set(a) == {"2026-10-3", "2026-11-1"} and a["2026-10-3"] == {"data": {"X": 1}}      # dasarian lama tak tersentuh
    assert tambah_arsip(a, i) == a                                                              # isi sama: tak berubah
    j = json.loads(json.dumps(i)); j["data"]["BANTEN"]["3"] = {}
    assert tambah_arsip(a, j)["2026-11-1"]["data"] != a["2026-11-1"]["data"] and tambah_arsip(a, j)["2026-10-3"] == a["2026-10-3"]
    for rusak in ('{"x":1}', "[]", "tidak json"):
        try: urai(rusak); assert False
        except (ValueError, KeyError, TypeError, AssertionError) as e:
            assert not isinstance(e, AssertionError)
    print("peringatan_bmkg uji OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else sys.exit(main())
