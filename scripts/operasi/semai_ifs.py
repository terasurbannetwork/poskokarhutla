"""Ambil prakiraan ECMWF IFS Open Data 0,1 derajat untuk Peluang Semai Awan (tiket SA-01).

Setiap berkas GRIB2 punya `.index` (JSON per baris: param, levelist, _offset, _length). Kita hanya mengunduh field yang
dibutuhkan lewat HTTP Range, bukan berkas utuh. Pengurai GRIB2 memakai `eccodes` (keputusan pemilik S6/D3); `eccodes` dan
`numpy` hanya diimpor di fungsi urai/simpan, jadi `uji` jalan tanpa keduanya.

Pakai:
  python3 scripts/operasi/semai_ifs.py --putaran auto                       (13 langkah, putaran 00/12 terbaru yang lengkap)
  python3 scripts/operasi/semai_ifs.py --putaran 2026111400 --langkah 0,24 --cek   (subset + laporan per field)
  python3 scripts/operasi/semai_ifs.py uji                                  (swa-uji luring, stdlib saja)
Masukan:  https://data.ecmwf.int/forecasts/<tgl>/<jam>z/ifs/0p1/oper/ (CC BY 4.0, tanpa kunci)
Keluaran: data/raw/semai/<YYYYMMDDHH>/<langkah>.npz (float16, tidak di-commit). Kunci `sfc_<param>` dan `pl_<param>_<hPa>`.
          Dipotong ke bujur 94..142, lintang 7..-12 (urutan utara ke selatan, barat ke timur).
Satuan:   apa adanya dari ECMWF, KECUALI `sfc_tp` (kumulatif sejak awal putaran) disimpan dalam mm, bukan m, agar tidak
          tergerus float16. `w` dalam Pa/s, `gh` dalam meter geopotensial, `tclw` kg/m2.
"""
import argparse, concurrent.futures as cf, datetime as dt, json, os, sys, time, urllib.request

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DASAR = "https://data.ecmwf.int/forecasts/{tgl}/{jam}z/ifs/0p1/oper/{tgl}{jam}0000-{step}h-oper-fc"
UA = "poskokarhutla-semai/1.0 (data riset kebencanaan)"
LANGKAH = list(range(0, 37, 3))
BUJUR = (94.0, 142.0)
LINTANG = (-12.0, 7.0)
PARALEL = 6
PERCOBAAN = 3

# (levtype, param, level atau None)
FIELD = ([("sfc", p, None) for p in ("lcc", "mucape", "tclw", "tp", "10u", "10v", "2t", "2d")]
         + [("pl", p, l) for p in ("u", "v") for l in (850, 700, 200)]
         + [("pl", "r", 850)]
         + [("pl", p, l) for p in ("t", "gh") for l in (1000, 925, 850, 700, 600, 500)]
         + [("pl", "w", l) for l in (850, 700)])
# tp kumulatif: pada langkah 0 ECMWF tidak menyimpannya; dianggap 0 dan dicatat, bukan galat.
OPSIONAL_LANGKAH0 = {("sfc", "tp", None)}


def kunci(f):
    lt, p, l = f
    return f"{lt}_{p}" if l is None else f"{lt}_{p}_{l}"


def url(putaran, step, lt, ekstensi):
    return DASAR.format(tgl=putaran[:8], jam=putaran[8:], step=step) + f"-{lt}.{ekstensi}"


# ---------- murni (diuji di `uji`) ----------

def urai_index(teks):
    """Baris JSON -> daftar dict; baris kosong/rusak dilewati."""
    hasil = []
    for b in teks.splitlines():
        b = b.strip()
        if not b:
            continue
        try:
            d = json.loads(b)
        except ValueError:
            continue
        if "_offset" in d and "_length" in d:
            hasil.append(d)
    return hasil


def pilih_field(index, lt, diminta):
    """Cocokkan field diminta ke baris index (levtype sama). Kembalikan ({field: (offset, panjang)}, [hilang])."""
    peta = {}
    for d in index:
        if d.get("levtype") != lt:
            continue
        lv = d.get("levelist")
        peta[(d.get("param"), int(lv) if lv is not None else None)] = (d["_offset"], d["_length"])
    ada, hilang = {}, []
    for f in diminta:
        if f[0] != lt:
            continue
        v = peta.get((f[1], f[2]))
        if v is None:
            hilang.append(f)
        else:
            ada[f] = v
    return ada, hilang


def gabung_rentang(item, celah=0):
    """item = {nama: (offset, panjang)} -> daftar (awal, akhir_eksklusif, [(nama, offset, panjang)]).
    Rentang yang saling menempel (celah <= `celah` byte) digabung jadi satu permintaan."""
    urut = sorted(item.items(), key=lambda kv: kv[1][0])
    hasil = []
    for nama, (o, n) in urut:
        if hasil and o - hasil[-1][1] <= celah:
            hasil[-1][1] = max(hasil[-1][1], o + n)
            hasil[-1][2].append((nama, o, n))
        else:
            hasil.append([o, o + n, [(nama, o, n)]])
    return [tuple(h) for h in hasil]


def kandidat_putaran(sekarang, banyak=4):
    """Putaran 00/12 UTC terbaru sampai terlama, berformat YYYYMMDDHH."""
    t = sekarang.replace(minute=0, second=0, microsecond=0, hour=12 if sekarang.hour >= 12 else 0)
    hasil = []
    for _ in range(banyak):
        hasil.append(t.strftime("%Y%m%d%H"))
        t -= dt.timedelta(hours=12)
    return hasil


def pilih_putaran(sekarang, ada):
    """Putaran terbaru yang index langkah 36 (sfc dan pl) sudah ada. `ada(url)` -> bool disuntik agar murni."""
    for p in kandidat_putaran(sekarang):
        if ada(url(p, 36, "sfc", "index")) and ada(url(p, 36, "pl", "index")):
            return p
    return None


def indeks_potong(awal, langkah, n, lo, hi):
    """Indeks grid yang koordinatnya di [lo, hi] (toleransi 1e-6). Koordinat diputar ke -180..180 bila perlu.
    Kembalikan daftar indeks berurut menurut koordinat TERNORMALISASI menaik (lintang: pakai nilai apa adanya)."""
    ok = []
    for i in range(n):
        c = awal + i * langkah
        if c > 180.0 + 1e-9:
            c -= 360.0
        if lo - 1e-6 <= c <= hi + 1e-6:
            ok.append((c, i))
    ok.sort()
    return [i for _, i in ok]


# ---------- jaringan ----------

def ambil(u, rentang=None):
    h = {"User-Agent": UA}
    if rentang:
        h["Range"] = f"bytes={rentang[0]}-{rentang[1] - 1}"
    for k in range(PERCOBAAN):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=90) as r:
                b = r.read()
            if rentang and len(b) != rentang[1] - rentang[0]:
                raise IOError(f"panjang {len(b)} != {rentang[1] - rentang[0]}")
            return b
        except Exception as e:  # noqa: BLE001
            if k == PERCOBAAN - 1:
                raise
            time.sleep(2 * 3 ** k)


def ada_url(u):
    try:
        req = urllib.request.Request(u, method="HEAD", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200
    except Exception:  # noqa: BLE001
        return False


# ---------- urai (eccodes) ----------

def urai_pesan(pesan):
    """Bytes satu pesan GRIB2 -> (array 2D terpotong float32, info). Grid dibaca dari kunci GRIB, tidak diasumsikan."""
    import eccodes as ec
    import numpy as np
    g = ec.codes_new_from_message(pesan)
    try:
        ni, nj = ec.codes_get(g, "Ni"), ec.codes_get(g, "Nj")
        la1 = ec.codes_get(g, "latitudeOfFirstGridPointInDegrees")
        lo1 = ec.codes_get(g, "longitudeOfFirstGridPointInDegrees")
        di, dj = ec.codes_get(g, "iDirectionIncrementInDegrees"), ec.codes_get(g, "jDirectionIncrementInDegrees")
        naik = ec.codes_get(g, "jScansPositively")
        kemasan = ec.codes_get(g, "packingType")
        nilai = ec.codes_get_values(g).reshape(nj, ni)
    finally:
        ec.codes_release(g)
    # lintang: baris ke-j = la1 + j*dj (naik) atau la1 - j*dj (turun); potong lalu urutkan utara -> selatan
    lat_ix = indeks_potong(la1, dj if naik else -dj, nj, *LINTANG)
    lat_ix = sorted(lat_ix, key=lambda j: -(la1 + j * dj if naik else la1 - j * dj))
    lon_ix = indeks_potong(lo1, di, ni, *BUJUR)
    potong = nilai[np.ix_(lat_ix, lon_ix)].astype("float32")
    return potong, {"ni": ni, "nj": nj, "la1": la1, "lo1": lo1, "di": di, "dj": dj, "packing": kemasan}


def ambil_langkah(putaran, step, pool, cek=False):
    """Unduh semua field satu langkah. Kembalikan (dict field->bytes, laporan hilang, byte total, detik)."""
    t0 = time.time()
    peta, hilang, rentang_semua = {}, [], []
    for lt in ("sfc", "pl"):
        idx = urai_index(ambil(url(putaran, step, lt, "index")).decode())
        ada, h = pilih_field(idx, lt, FIELD)
        hilang += h
        for awal, akhir, anggota in gabung_rentang({f: v for f, v in ada.items()}):
            rentang_semua.append((url(putaran, step, lt, "grib2"), awal, akhir, anggota))
    bayt = {}

    def kerja(r):
        u, awal, akhir, anggota = r
        b = ambil(u, (awal, akhir))
        return {f: b[o - awal:o - awal + n] for f, o, n in anggota}

    for d in pool.map(kerja, rentang_semua):
        bayt.update(d)
    return bayt, hilang, sum(len(v) for v in bayt.values()), time.time() - t0


# ---------- cek ----------

BATAS = {  # nama param -> (min, max) yang masuk akal setelah potong; tp sudah mm
    "lcc": (0, 1.0001), "mucape": (0, 10000), "tclw": (0, 20), "tp": (0, 2000), "t": (180, 320), "2t": (230, 330),
    "2d": (230, 330), "r": (0, 110), "gh": (0, 20000), "u": (-120, 120), "v": (-120, 120), "10u": (-80, 80),
    "10v": (-80, 80), "w": (-20, 20),
}


def cek_nilai(f, a):
    lo, hi = BATAS[f[1]]
    if f[1] == "gh" and f[2] == 1000:
        lo = -400  # geopotensial 1000 hPa bisa negatif bila tekanan permukaan laut < 1000 hPa
    return float(a.min()) >= lo and float(a.max()) <= hi


def jalankan(putaran, langkah, cek):
    import numpy as np
    sekarang = dt.datetime.now(dt.timezone.utc)
    if putaran == "auto":
        putaran = pilih_putaran(sekarang, ada_url)
        if not putaran:
            sys.exit("tidak ada putaran dengan langkah 36 lengkap dalam 4 putaran terakhir")
    print(f"putaran {putaran}, langkah {langkah}")
    keluar = os.path.join(AKAR, "data", "raw", "semai", putaran)
    os.makedirs(keluar, exist_ok=True)
    t_unduh = t_urai = 0.0
    byte_total = 0
    gagal = []
    log = []  # (langkah, field, bytes, bentuk, min, max, packing)
    with cf.ThreadPoolExecutor(PARALEL) as pool:
        # unduh langkah berikutnya sambil mengurai langkah kini tidak dilakukan: ukur tiap fase terpisah
        for s in langkah:
            bayt, hilang, nb, dtk = ambil_langkah(putaran, s, pool)
            t_unduh += dtk
            byte_total += nb
            t0 = time.time()
            arr, packing = {}, set()
            for f in FIELD:
                if f in bayt:
                    a, info = urai_pesan(bayt[f])
                    if f == ("sfc", "tp", None):
                        a = a * 1000.0  # m -> mm
                    arr[kunci(f)] = a
                    packing.add(info["packing"])
                    log.append((s, f, len(bayt[f]), a.shape, float(a.min()), float(a.max()), info["packing"]))
                    if cek and not cek_nilai(f, a):
                        gagal.append(f"langkah {s} {kunci(f)} di luar rentang: {a.min():.4g}..{a.max():.4g}")
            for f in hilang:
                if not (s == 0 and f in OPSIONAL_LANGKAH0):
                    gagal.append(f"langkah {s} {kunci(f)} tidak ada di index")
                else:
                    print(f"  langkah 0: {kunci(f)} tidak ada (wajar, kumulatif), diisi nol")
                    ref = next(iter(arr.values()))
                    arr[kunci(f)] = np.zeros_like(ref)
            bentuk = {a.shape for a in arr.values()}
            if len(bentuk) != 1:
                gagal.append(f"langkah {s} bentuk beragam {bentuk}")
            np.savez(os.path.join(keluar, f"{s}.npz"), **{k: v.astype("float16") for k, v in arr.items()})
            t_urai += time.time() - t0
            print(f"  langkah {s}: {len(arr)} field, {nb / 1e6:.1f} MB, unduh {dtk:.1f} dtk, "
                  f"bentuk {sorted(bentuk)}, packing {sorted(packing)}")
    if cek:
        print(f"\n{'langkah':>7} {'field':<14} {'MB':>6} {'bentuk':<10} {'min':>12} {'max':>12}  packing")
        for s, f, n, b, lo, hi, pk in log:
            print(f"{s:>7} {kunci(f):<14} {n / 1e6:6.2f} {str(b):<10} {lo:12.5g} {hi:12.5g}  {pk}")
    print(f"\nunduh {t_unduh:.1f} dtk, urai+simpan {t_urai:.1f} dtk, total {t_unduh + t_urai:.1f} dtk, "
          f"{byte_total / 1e6:.1f} MB diunduh")
    if gagal:
        print("GAGAL:\n  " + "\n  ".join(gagal))
        sys.exit(1)
    print("OK")


def uji():
    idx = urai_index('{"levtype":"sfc","param":"lcc","_offset":10,"_length":5}\n\nrusak{\n'
                     '{"levtype":"pl","param":"t","levelist":"850","_offset":0,"_length":3}\n'
                     '{"levtype":"sfc","param":"tp","_offset":15,"_length":7}\n'
                     '{"levtype":"sol","param":"vsw","levelist":"1","_offset":99,"_length":1}')
    assert len(idx) == 4
    ada, hilang = pilih_field(idx, "sfc", FIELD)
    assert ada[("sfc", "lcc", None)] == (10, 5) and ("sfc", "mucape", None) in hilang and len(hilang) == 6
    ada, hilang = pilih_field(idx, "pl", FIELD)
    assert ada[("pl", "t", 850)] == (0, 3) and len(ada) == 1 and len(hilang) == 20
    # levtype 'sol' tidak pernah cocok dengan field sfc/pl
    assert len(FIELD) == 29 and len({kunci(f) for f in FIELD}) == 29
    g = gabung_rentang({"a": (0, 3), "b": (3, 4), "c": (10, 2), "d": (12, 1)})
    assert [(x[0], x[1], [m[0] for m in x[2]]) for x in g] == [(0, 7, ["a", "b"]), (10, 13, ["c", "d"])]
    assert len(gabung_rentang({"a": (0, 3), "b": (5, 4)})) == 2 and len(gabung_rentang({"a": (0, 3), "b": (5, 4)}, 2)) == 1
    t = dt.datetime(2026, 11, 14, 13, 5)
    assert kandidat_putaran(t)[:3] == ["2026111412", "2026111400", "2026111312"]
    assert kandidat_putaran(dt.datetime(2026, 11, 14, 9, 0))[0] == "2026111400"
    # 14.00 UTC: 12z lengkap -> 12z; belum -> 00z; tak satu pun -> None
    assert pilih_putaran(t, lambda u: True) == "2026111412"
    assert pilih_putaran(t, lambda u: "2026111412" not in u) == "2026111400"
    assert pilih_putaran(t, lambda u: "-36h-" not in u or "2026111312" in u) == "2026111312"
    assert pilih_putaran(t, lambda u: False) is None
    # sfc lengkap tapi pl belum: lewati putaran itu
    assert pilih_putaran(t, lambda u: not ("2026111412" in u and "-pl." in u)) == "2026111400"
    assert url("2026111400", 24, "pl", "grib2") == \
        "https://data.ecmwf.int/forecasts/20261114/00z/ifs/0p1/oper/20261114000000-24h-oper-fc-pl.grib2"
    # potong: bujur -180..179.9 -> 94..142 = 481; lintang 90..-90 -> 7..-12 = 191
    bj = indeks_potong(-180.0, 0.1, 3600, *BUJUR)
    assert len(bj) == 481 and bj[0] == 2740 and bj[-1] == 3220
    lt = indeks_potong(90.0, -0.1, 1801, *LINTANG)
    assert len(lt) == 191
    # grid 0..359.9: bujur 94..142 sama banyak; bujur > 180 diputar
    assert len(indeks_potong(0.0, 0.1, 3600, *BUJUR)) == 481
    assert indeks_potong(0.0, 90.0, 4, -100, -80) == [3]
    print("uji semai_ifs: OK")


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        return uji()
    ap = argparse.ArgumentParser()
    ap.add_argument("--putaran", required=True, help="YYYYMMDDHH atau auto")
    ap.add_argument("--langkah", default=",".join(map(str, LANGKAH)))
    ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    jalankan(a.putaran, [int(x) for x in a.langkah.split(",")], a.cek)


if __name__ == "__main__":
    main()
