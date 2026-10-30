"""Deteksi banjir MODIS harian (NASA LANCE MCDWD) per kabupaten -> public/banjir/data/mcdwd.json

Sumber: produk MCDWD_L3_F2_NRT (Terra+Aqua, komposit 2 hari, 250 m; LANCE) lewat NASA GIBS, lapisan
`MODIS_Combined_Flood_2-Day`, ubin WMTS PNG berpaleta, TANPA kunci. Arsip GIBS 2021-03-22 s.d. kemarin (sela 2021-12-21..22
dan 2023-07-21..25 tak ada). Kenapa GIBS dan bukan berkas LANCE: arsip LANCE nrt3.modaps.eosdis.nasa.gov hanya menyimpan ~8
hari terakhir (diuji 29 Okt 2026: folder 2024/2025 404), sedangkan model butuh deret 2021-sekarang. Jalur LANCE
(Authorization: Bearer $EARTHDATA_TOKEN, ubin GeoTIFF 10 derajat .../allData/61/MCDWD_L3_F2_NRT/<tahun>/<hari>/) tetap valid untuk
pengecekan silang; token tidak dipakai skrip ini.

Level GIBS 5 (matriks `250m`): ubin 9 derajat, 512 px, piksel 0,01758 derajat (~1,95 km). GIBS membuat tingkat ikhtisar dengan
memprioritaskan kelas banjir: 84 piksel banjir di level 6 jadi 58 di level 5 (bukan ~21 bila cuplikan biasa). Jadi hitungan
piksel di sini = jumlah piksel ~2 km yang MEMUAT banjir, BUKAN hektare; ini indeks kehadiran, bukan luas.
Indonesia = baris 9..11 x kolom 30..35 = 18 ubin/hari.

Kelas paleta PNG (GIBS colormap v1.3): 1 tak berair, 2 air permukaan (laut, sungai, danau), 3 banjir berulang, 4 banjir,
5 data tidak cukup (awan/bayangan), 0 tanpa data. Per kabupaten-hari disimpan [c4, c3, c1, c5]; c2 dan c0 tidak.
  banjir   = c4 + c3                       piksel terdeteksi banjir
  valid    = c4 + c3 + c1                   piksel yang teramati (bukan awan)
  tutupan  = valid / (valid + c5)
Hari dengan tutupan < 0,5 tidak menilai "tidak banjir" (awan menutup), dan tidak dipakai sebagai label negatif.

Pakai:  python3 scripts/banjir/mcdwd.py harian [--hari 14]     tambah hari baru ke mcdwd.json (bergulir 90 hari)
        python3 scripts/banjir/mcdwd.py arsip --dari 2021-03-22 --sampai 2026-10-28 [--paralel 8]   lab: isi cache data/raw/banjir/mcdwd/hari.jsonl
        python3 scripts/banjir/mcdwd.py uji
Berkas keluaran: mcdwd.json (bergulir 90 hari, < 2 MB). Cache piksel->kabupaten dan arsip hari ada di data/raw/banjir/mcdwd/ (git-ignore).
Atribusi: NASA LANCE MODIS (MCDWD), via NASA GIBS (Earthdata, data terbuka, tanpa pembatasan penggunaan). Sopan: jeda 0,3 dtk
per ubin per proses; produksi 1 proses (18 ubin/hari), arsip lab 8 proses (~7 ubin/dtk di GIBS CDN).
"""
import datetime as dt, itertools, json, math, os, struct, sys, time, urllib.error, urllib.request, zlib

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, WIB, baca, simpan

LAPIS = "MODIS_Combined_Flood_2-Day"
URL = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/%s/default/%s/250m/5/%d/%d.png"
UA = "poskobanjir/1.0 (Pantau Bencana; +https://centurisk97.id)"
BARIS, KOLOM = range(9, 12), range(30, 36)
UBIN = 9.0                    # derajat per ubin pada level 5
PX = 512
AWAL_ARSIP, SELA = dt.date(2021, 3, 22), ((dt.date(2021, 12, 21), dt.date(2021, 12, 22)), (dt.date(2023, 7, 21), dt.date(2023, 7, 25)))
BERKAS = os.path.join(KELUAR, "mcdwd.json")
DIR = os.path.join(MENTAH, "mcdwd")
PETA, ARSIP = os.path.join(DIR, "piksel_L5.json"), os.path.join(DIR, "hari.jsonl")
GULIR = 90
MIN_TUTUPAN = 0.5
ATRIBUSI = ("NASA LANCE MODIS Global Flood Product MCDWD_L3_F2_NRT (Terra+Aqua), via NASA GIBS Worldview Snapshots/WMTS; "
            "data terbuka NASA Earthdata, wajib menyebut sumber. Ringkasan per kabupaten oleh Pantau Bencana.")
LISENSI = "NASA Earthdata Data Use Policy (terbuka, tanpa pembatasan; sebutkan sumber)"


# ------------------------------------------------------------------ PNG berpaleta 8-bit -> byte indeks (stdlib)
def png_indeks(b):
    """PNG paleta 8 bit tak berlapis -> (lebar, tinggi, bytes indeks). Mendukung filter 0-4."""
    if b[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("bukan PNG")
    p, idat, w = 8, [], None
    while p < len(b):
        n, t = struct.unpack(">I4s", b[p:p + 8])
        d = b[p + 8:p + 8 + n]
        p += 12 + n
        if t == b"IHDR":
            w, h, bd, ct, _, _, il = struct.unpack(">IIBBBBB", d)
            if bd != 8 or ct != 3 or il != 0:
                raise ValueError(f"PNG bukan paleta 8 bit tak berlapis: bd={bd} ct={ct} il={il}")
        elif t == b"IDAT":
            idat.append(d)
    raw = zlib.decompress(b"".join(idat))
    out, prev, q = [], bytes(w), 0
    for _ in range(h):
        f, line = raw[q], raw[q + 1:q + 1 + w]
        q += 1 + w
        if f == 1:
            line = bytes(itertools.accumulate(line, lambda a, c: (a + c) & 255))
        elif f == 2:
            line = bytes((a + c) & 255 for a, c in zip(line, prev))
        elif f == 3:
            r = bytearray(line)
            for i in range(w):
                r[i] = (r[i] + ((r[i - 1] if i else 0) + prev[i]) // 2) & 255
            line = bytes(r)
        elif f == 4:
            r = bytearray(line)
            for i in range(w):
                a, up, c = (r[i - 1] if i else 0), prev[i], (prev[i - 1] if i else 0)
                pa, pb, pc = abs(up - c), abs(a - c), abs(a + up - 2 * c)
                r[i] = (r[i] + (a if (pa <= pb and pa <= pc) else (up if pb <= pc else c))) & 255
            line = bytes(r)
        elif f != 0:
            raise ValueError(f"filter PNG {f}")
        out.append(line)
        prev = line
    return w, h, b"".join(out)


def isi_tabel(tabel, idx, runs):
    """Tambahkan hitungan kelas 4, 3, 1, 5 pada tiap run ke tabel[id_kab] = [c4, c3, c1, c5]."""
    for s, n, k in runs:
        seg = idx[s:s + n]
        t = tabel[k]
        t[0] += seg.count(4)
        t[1] += seg.count(3)
        t[2] += seg.count(1)
        t[3] += seg.count(5)


# ------------------------------------------------------------------ peta piksel -> kabupaten (sekali, cache)
def bangun_peta():
    """Pusat piksel tiap ubin -> kabupaten lewat poligon kecamatan (wilayah.Wilayah). -> {"kab": [kunci], "n": [piksel darat], "ubin": {"b_k": runs}}"""
    from wilayah import Wilayah
    w = Wilayah()
    sel = w.SEL
    kunci, nomor = [], {}
    ubin, jumlah = {}, {}
    for r in BARIS:
        for c in KOLOM:
            runs = []
            lon0, lat0 = -180 + c * UBIN, 90 - r * UBIN
            for y in range(PX):
                lat = lat0 - (y + 0.5) * UBIN / PX
                gy = math.floor(lat / sel)
                x, ada = 0, None
                while x < PX:
                    lon = lon0 + (x + 0.5) * UBIN / PX
                    k = None
                    if (math.floor(lon / sel), gy) in w.indeks:
                        a = w.cari(lon, lat)
                        if a:
                            kk = f"{a[0]}|{a[1]}"
                            if kk not in nomor:
                                nomor[kk] = len(kunci)
                                kunci.append(kk)
                            k = nomor[kk]
                    if ada is not None and ada[2] == k and ada[0] + ada[1] == y * PX + x:
                        ada[1] += 1
                    else:
                        if ada is not None and ada[2] is not None:
                            runs.append(ada)
                        ada = [y * PX + x, 1, k]
                    x += 1
                if ada is not None and ada[2] is not None:
                    runs.append(ada)
            for s, n, k in runs:
                jumlah[k] = jumlah.get(k, 0) + n
            ubin[f"{r}_{c}"] = runs
    return {"kab": kunci, "n": [jumlah.get(i, 0) for i in range(len(kunci))], "ubin": ubin}


def muat_peta():
    p = baca(PETA)
    if p is None:
        t0 = time.time()
        p = bangun_peta()
        simpan(PETA, p)
        print(f"peta piksel->kabupaten: {len(p['kab'])} kab, {sum(p['n'])} piksel darat, {time.time() - t0:.0f} dtk", file=sys.stderr)
    return p


# ------------------------------------------------------------------ unduh
def ambil_ubin(tgl, r, c, coba=4):
    u = URL % (LAPIS, tgl, r, c)
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=60) as x:
                return x.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None            # GIBS belum/tak punya ubin tanggal itu
            if i == coba - 1:
                raise
            time.sleep(5 * (i + 1) if e.code != 429 else 30 * (i + 1))
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(5 * (i + 1))


def hari_kab(tgl, peta, jeda=0.3):
    """18 ubin tanggal `tgl` -> (tabel [[c4,c3,c1,c5] per kab], jumlah ubin gagal/kosong)."""
    tabel = [[0, 0, 0, 0] for _ in peta["kab"]]
    gagal = 0
    for r in BARIS:
        for c in KOLOM:
            runs = peta["ubin"][f"{r}_{c}"]
            if not runs:
                continue   # ubin laut
            b = ambil_ubin(tgl, r, c)
            if b is None:
                gagal += 1
                continue
            try:
                w, h, idx = png_indeks(b)
            except Exception:
                gagal += 1
                continue
            isi_tabel(tabel, idx, runs)
            time.sleep(jeda)
    return tabel, gagal


def ada_di_arsip_gibs(d):
    return d >= AWAL_ARSIP and not any(a <= d <= b for a, b in SELA)


# ------------------------------------------------------------------ ringkasan
def banjir_valid(t):
    """[c4, c3, c1, c5] -> (piksel banjir, tutupan 0..1 atau None bila tak ada piksel darat terlihat)."""
    f, v = t[0] + t[1], t[0] + t[1] + t[2]
    tot = v + t[3]
    return f, (v / tot if tot else None)


def hari_ini_utc():
    return dt.datetime.now(dt.timezone.utc).date()


# ------------------------------------------------------------------ harian (produksi)
def harian(n_hari=14):
    peta = muat_peta()
    lama = baca(BERKAS, {})
    deret = lama.get("hari", [])
    kab_lama = lama.get("kab", {})
    punya = set(deret)
    akhir = hari_ini_utc() - dt.timedelta(days=1)
    baru = []
    lab = baca_arsip()   # cache lab (kosong di CI): hari yang sudah ada tak diunduh lagi
    for i in range(n_hari - 1, -1, -1):
        d = akhir - dt.timedelta(days=i)
        if d.isoformat() in punya:
            continue
        tabel, gagal = (lab[d.isoformat()], 0) if d.isoformat() in lab else hari_kab(d.isoformat(), peta)
        if gagal > 2:
            print(f"{d}: {gagal} ubin gagal, dilewati", file=sys.stderr)
            continue
        baru.append((d.isoformat(), tabel))
    if not baru and lama:
        print("mcdwd: tidak ada hari baru", file=sys.stderr)
        return lama
    semua = sorted(set(deret) | {t for t, _ in baru})[-GULIR:]
    idx = {t: i for i, t in enumerate(semua)}
    out = {}
    for ik, kk in enumerate(peta["kab"]):
        if not peta["n"][ik]:
            continue
        f, v = [None] * len(semua), [None] * len(semua)
        a = kab_lama.get(kk)
        if a:
            for j, t in enumerate(deret):
                if t in idx:
                    f[idx[t]], v[idx[t]] = a["f"][j], a["v"][j]
        for t, tabel in baru:
            if t in idx:
                px, tut = banjir_valid(tabel[ik])
                f[idx[t]], v[idx[t]] = px, None if tut is None else round(tut, 2)
        out[kk] = {"n": peta["n"][ik], "f": f, "v": v}
    isi = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sumber": "NASA LANCE MCDWD_L3_F2_NRT via NASA GIBS",
           "lapis": LAPIS, "resolusi_km": 1.95, "satuan": "piksel ~2 km yang memuat banjir (kelas Flood + Recurring flood); BUKAN hektare",
           "catatan": "f = piksel banjir per hari; v = tutupan teramati 0..1 (1 - awan); n = piksel darat kabupaten; v < 0,5 = awan menutup, bukan bukti tidak banjir",
           "atribusi": ATRIBUSI, "lisensi": LISENSI, "hari": semua, "kab": out}
    simpan(BERKAS, isi)
    return isi


# ------------------------------------------------------------------ arsip lab (cache lokal)
def _kerja(a):
    tgl, jeda = a
    peta = muat_peta()
    try:
        tabel, gagal = hari_kab(tgl, peta, jeda)
    except Exception as e:   # jaringan putus sesaat: hari ini dilewati, jalan ulang melengkapi
        print(f"{tgl}: {e}", file=sys.stderr)
        return tgl, None, 99
    return tgl, tabel, gagal


def arsip(dari, sampai, paralel=8):
    from concurrent.futures import ProcessPoolExecutor
    peta = muat_peta()
    ada = set()
    if os.path.exists(ARSIP):
        for l in open(ARSIP):
            try:
                ada.add(json.loads(l)["t"])
            except Exception:
                pass
    hari, d = [], dt.date.fromisoformat(dari)
    while d <= dt.date.fromisoformat(sampai):
        if ada_di_arsip_gibs(d) and d.isoformat() not in ada:
            hari.append(d.isoformat())
        d += dt.timedelta(days=1)
    hari.reverse()  # terbaru dulu: kalau terputus, yang paling berguna sudah ada
    print(f"arsip: {len(hari)} hari akan diambil ({len(ada)} sudah ada)", file=sys.stderr)
    os.makedirs(DIR, exist_ok=True)
    t0 = time.time()
    with ProcessPoolExecutor(paralel) as ex, open(ARSIP, "a") as f:
        for i, (tgl, tabel, gagal) in enumerate(ex.map(_kerja, [(t, 0.3) for t in hari]), 1):
            if gagal > 2:
                print(f"{tgl}: {gagal} ubin gagal, tidak disimpan", file=sys.stderr)
                continue
            f.write(json.dumps({"t": tgl, "g": gagal, "d": tabel}, separators=(",", ":")) + "\n")
            f.flush()
            if i % 25 == 0:
                print(f"  {i}/{len(hari)} {tgl} ({(time.time() - t0) / i:.1f} dtk/hari)", file=sys.stderr)


def baca_arsip():
    """-> {tanggal: tabel} dari cache lab."""
    out = {}
    if os.path.exists(ARSIP):
        for l in open(ARSIP):
            try:
                r = json.loads(l)
                out[r["t"]] = r["d"]
            except Exception:
                pass
    return out


# ------------------------------------------------------------------ swa-uji
def uji():
    # 1. dekoder PNG: PNG paleta sintetis dengan filter 0,1,2,4
    def buat(rows, filters):
        raw, prev = b"", bytes(len(rows[0]))
        for row, f in zip(rows, filters):
            raw += bytes([f])
            if f == 0:
                raw += bytes(row)
            elif f == 1:
                raw += bytes((row[i] - (row[i - 1] if i else 0)) & 255 for i in range(len(row)))
            elif f == 2:
                raw += bytes((row[i] - prev[i]) & 255 for i in range(len(row)))
            elif f == 4:
                o = bytearray()
                for i in range(len(row)):
                    a, up, c = (row[i - 1] if i else 0), prev[i], (prev[i - 1] if i else 0)
                    pa, pb, pc = abs(up - c), abs(a - c), abs(a + up - 2 * c)
                    o.append((row[i] - (a if (pa <= pb and pa <= pc) else (up if pb <= pc else c))) & 255)
                raw += bytes(o)
            prev = bytes(row)
        def ch(t, d):
            return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
        return (b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", len(rows[0]), len(rows), 8, 3, 0, 0, 0))
                + ch(b"PLTE", bytes(768)) + ch(b"IDAT", zlib.compress(raw)) + ch(b"IEND", b""))
    rows = [[1, 1, 4, 5, 3, 2], [4, 4, 1, 1, 5, 5], [1, 4, 1, 3, 3, 1], [5, 5, 5, 1, 1, 4], [0, 1, 4, 4, 2, 2]]
    for fs in ([0] * 5, [1] * 5, [2] * 5, [4] * 5, [0, 1, 2, 4, 2]):
        w, h, idx = png_indeks(buat(rows, fs))
        assert (w, h) == (6, 5) and idx == bytes(sum(rows, [])), fs
    # 2. hitungan run: dua kab pada satu ubin
    idx = bytes(sum(rows, []))
    tabel = [[0, 0, 0, 0], [0, 0, 0, 0]]
    isi_tabel(tabel, idx, [[0, 6, 0], [6, 12, 1]])   # baris 0 -> kab 0; baris 1-2 -> kab 1
    assert tabel[0] == [1, 1, 2, 1], tabel[0]         # baris 0: 4x1, 3x1, 1x2, 5x1
    assert tabel[1] == [3, 2, 5, 2], tabel[1]
    assert banjir_valid([1, 1, 2, 1]) == (2, 4 / 5) and banjir_valid([0, 0, 0, 0]) == (0, None)
    # 3. kalender arsip GIBS
    assert ada_di_arsip_gibs(dt.date(2021, 3, 22)) and not ada_di_arsip_gibs(dt.date(2021, 3, 21))
    assert not ada_di_arsip_gibs(dt.date(2023, 7, 22)) and ada_di_arsip_gibs(dt.date(2023, 7, 26))
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "uji":
        uji()
    elif a[0] == "harian":
        harian(int(a[a.index("--hari") + 1]) if "--hari" in a else 14)
    elif a[0] == "arsip":
        arsip(a[a.index("--dari") + 1] if "--dari" in a else AWAL_ARSIP.isoformat(),
              a[a.index("--sampai") + 1] if "--sampai" in a else (hari_ini_utc() - dt.timedelta(days=1)).isoformat(),
              int(a[a.index("--paralel") + 1]) if "--paralel" in a else 8)
    elif a[0] == "peta":
        muat_peta()
    else:
        sys.exit("pakai: harian | arsip | peta | uji")
