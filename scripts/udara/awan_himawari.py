"""Awan dingin per kabupaten dari Himawari-9 (NOAA open data, tanpa kredensial) -> public/udara/data/awan_himawari.json.

UJI KELAYAKAN DB-05. Analisis Centurisk97, BUKAN peringatan dan bukan produk BMKG/JMA.
Sumber: s3://noaa-himawari9 `AHI-L1b-FLDK/YYYY/MM/DD/HHMM/HS_H09_..._B13_FLDK_R20_Snn10.DAT.bz2` (pita 13, 10,4 um, 2 km, ~3 MB per segmen).
Hanya segmen garis yang menutup Indonesia diunduh (biasanya S04-S07 = ~12 MB), dibuka dengan bz2/struct stdlib; sel kabupaten diambil dengan
proyeksi maju CGMS (lintang/bujur -> kolom/garis), jadi tanpa numpy/h5py. Produk Clouds (CHGT) berformat HDF5 800 MB tanpa potong wilayah
yang bisa dilakukan stdlib, maka TINGGI PUNCAK di sini PERKIRAAN KASAR dari suhu kecerahan lewat profil tropis (bukan CHGT).
Ambang: awan dingin Tb <= 235 K (-38 C), sangat dingin Tb <= 208 K (-65 C). Titik contoh: kisi 0,1 derajat dalam poligon kabupaten
(public/geo/kabupaten), kab kecil memakai titik pusat bbox. Kode kab = prov + urutan di berkas geo (sama dengan laporan_cuaca.kab_indeks).
Pakai: python3 scripts/udara/awan_himawari.py [YYYYMMDDHHMM] | uji
"""
import bz2, datetime as dt, json, math, os, re, struct, sys, time, urllib.request
from array import array

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BERKAS = os.path.join(AKAR, "public/udara/data/awan_himawari.json")
BUCKET = "https://noaa-himawari9.s3.amazonaws.com/"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
LAT, BUJ = (-11.5, 6.5), (94.0, 142.0)
LANGKAH = 0.1
T_DINGIN, T_SANGAT = 235.0, 208.0
H, C, K = 6.62606957e-34, 299792458.0, 1.3806488e-23
SEG_GARIS = 550


def ambil(url, coba=3):
    for i in range(coba):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90).read()
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(3 * (i + 1))


def daftar(prefiks):
    return re.findall(r"<Key>([^<]*)</Key>", ambil(f"{BUCKET}?list-type=2&prefix={prefiks}").decode())


def proyeksi(lat, lon, p):
    """CGMS maju: (lintang, bujur) derajat -> (kolom, garis) 1-based; None bila di belakang bumi."""
    la, lo = math.radians(lat), math.radians(lon - p["sub"])
    pe = math.atan((p["rpol"] ** 2 / p["req"] ** 2) * math.tan(la))
    e2 = (p["req"] ** 2 - p["rpol"] ** 2) / p["req"] ** 2
    re_ = p["rpol"] / math.sqrt(1 - e2 * math.cos(pe) ** 2)
    r1 = p["rs"] - re_ * math.cos(pe) * math.cos(lo)
    r2 = -re_ * math.cos(pe) * math.sin(lo)
    r3 = re_ * math.sin(pe)
    if r1 <= 0:
        return None
    x = math.degrees(math.atan(-r2 / r1))
    y = math.degrees(math.asin(-r3 / math.sqrt(r1 * r1 + r2 * r2 + r3 * r3)))
    return round(p["coff"] + x * 2 ** -16 * p["cfac"]), round(p["loff"] + y * 2 ** -16 * p["lfac"])


def baca_segmen(b):
    """Bytes HSD terdekompresi -> (param proyeksi, kalibrasi, garis_pertama, ncols, nlines, array uint16)."""
    pos, blok = 0, {}
    while len(blok) < 11:
        n, ln = b[pos], struct.unpack("<H", b[pos + 1:pos + 3])[0]
        blok[n] = pos
        pos += ln
    nbit, ncol, nlin = struct.unpack("<HHH", b[blok[2] + 3:blok[2] + 9])
    sub, cfac, lfac, coff, loff, rs, req, rpol = struct.unpack("<dIIffddd", b[blok[3] + 3:blok[3] + 3 + 48])
    o = blok[5] + 3
    band, lam, _, _, _, gain, const = struct.unpack("<HdHHHdd", b[o:o + 35 - 3])
    c0, c1, c2 = struct.unpack("<3d", b[o + 32:o + 56])
    g1 = struct.unpack("<H", b[blok[7] + 5:blok[7] + 7])[0]
    assert (nbit, band) == (16, 13), (nbit, band)
    d = array("H")
    d.frombytes(b[pos:pos + ncol * nlin * 2])
    if sys.byteorder == "big":
        d.byteswap()
    p = dict(sub=sub, cfac=cfac, lfac=lfac, coff=coff, loff=loff, rs=rs, req=req, rpol=rpol)
    return p, (lam, gain, const, c0, c1, c2), g1, ncol, nlin, d


def tb(cnt, kal):
    lam, gain, const, c0, c1, c2 = kal
    rad = gain * cnt + const
    if rad <= 0:
        return None
    te = H * C / (K * lam * 1e-6) / math.log(2 * H * C * C / ((lam * 1e-6) ** 5 * rad * 1e6) + 1)
    return c0 + c1 * te + c2 * te * te


def tinggi_km(t):
    """Perkiraan kasar: atmosfer tropis, 300 K di permukaan, -6,5 K/km, tropopause ~16 km (~195 K)."""
    return round(max(0.0, min(16.0, (300.0 - t) / 6.5)), 1)


def titik_kab():
    """{kode: [(lat, lon), ...]} kisi 0,1 derajat dalam poligon; kab tanpa titik: pusat bbox."""
    out = {}
    for f in sorted(os.listdir(os.path.join(AKAR, "public/geo/kabupaten"))):
        if not re.fullmatch(r"\d\d\.json", f):
            continue
        pv = f[:2]
        for i, ft in enumerate(json.load(open(os.path.join(AKAR, "public/geo/kabupaten", f)))["features"], 1):
            g = ft["geometry"]
            cincin = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            xs = [x for poli in cincin for r in poli for x, _ in r]
            ys = [y for poli in cincin for r in poli for _, y in r]
            if not xs:
                continue
            pts = []
            for iy in range(math.ceil(min(ys) / LANGKAH), math.floor(max(ys) / LANGKAH) + 1):
                for ix in range(math.ceil(min(xs) / LANGKAH), math.floor(max(xs) / LANGKAH) + 1):
                    y, x = iy * LANGKAH, ix * LANGKAH
                    if any(dalam(x, y, poli) for poli in cincin):
                        pts.append((y, x))
            out[f"{pv}{i:02d}"] = (ft["properties"]["kab"], pts or [((min(ys) + max(ys)) / 2, (min(xs) + max(xs)) / 2)])
    return out


def dalam(x, y, poli):
    """Genap-ganjil: cincin luar lalu lubang."""
    n = 0
    for r in poli:
        c = False
        j = len(r) - 1
        for i in range(len(r)):
            if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
                c = not c
            j = i
        n += c
    return n % 2 == 1


def waktu_terbaru(skrg=None):
    """HHMM terbaru yang segmen S0610 pita 13-nya sudah ada (rilis ~10 menit)."""
    skrg = skrg or dt.datetime.now(dt.timezone.utc)
    for mnt in range(0, 6 * 60, 10):
        w = (skrg - dt.timedelta(minutes=mnt)).replace(second=0, microsecond=0)
        w = w.replace(minute=w.minute // 10 * 10)
        if daftar(f"AHI-L1b-FLDK/{w:%Y/%m/%d/%H%M}/HS_H09_{w:%Y%m%d_%H%M}_B13_FLDK_R20_S0610"):
            return w
    raise SystemExit("tidak ada observasi Himawari 6 jam terakhir")


def proses(w, kab):
    mulai = time.time()
    p0 = None
    seg = {}
    unduh = 0
    # garis tiap titik -> segmen yang dibutuhkan
    kalib = None
    perlu = {}
    for kode, (_, pts) in kab.items():
        for la, lo in pts:
            if not (LAT[0] <= la <= LAT[1] and BUJ[0] <= lo <= BUJ[1]):
                continue
            if p0 is None:
                p0 = _param_awal(w)
            kl = proyeksi(la, lo, p0)
            if kl:
                perlu.setdefault((kl[1] - 1) // SEG_GARIS + 1, []).append((kode, kl))
    for s in sorted(perlu):
        url = f"{BUCKET}AHI-L1b-FLDK/{w:%Y/%m/%d/%H%M}/HS_H09_{w:%Y%m%d_%H%M}_B13_FLDK_R20_S{s:02d}10.DAT.bz2"
        mentah = ambil(url)
        unduh += len(mentah)
        seg[s] = baca_segmen(bz2.decompress(mentah))
        kalib = seg[s][1]
    hasil = {}
    for s, lst in perlu.items():
        _, _, g1, ncol, nlin, d = seg[s]
        for kode, (c, l) in lst:
            r = l - g1
            if 0 <= r < nlin and 1 <= c <= ncol:
                v = d[r * ncol + c - 1]
                if v < 65534:
                    t = tb(v, kalib)
                    if t:
                        hasil.setdefault(kode, []).append(t)
    return hasil, unduh, time.time() - mulai


_PARAM = {}


def _param_awal(w):
    if not _PARAM:
        url = f"{BUCKET}AHI-L1b-FLDK/{w:%Y/%m/%d/%H%M}/HS_H09_{w:%Y%m%d_%H%M}_B13_FLDK_R20_S0610.DAT.bz2"
        _PARAM.update(baca_segmen(bz2.decompress(ambil(url)))[0])
    return _PARAM


def ringkas(ts):
    n = len(ts)
    tmin = min(ts)
    return {"n_titik": n, "tb_min_c": round(tmin - 273.15, 1), "tinggi_puncak_km_perkiraan": tinggi_km(tmin),
            "persen_dingin": round(100 * sum(t <= T_DINGIN for t in ts) / n, 1),
            "persen_sangat_dingin": round(100 * sum(t <= T_SANGAT for t in ts) / n, 1)}


def jalan(w):
    kab = titik_kab()
    hasil, unduh, dtk = proses(w, kab)
    isi = {kode: {"kab": kab[kode][0], **ringkas(ts)} for kode, ts in sorted(hasil.items())}
    dok = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M:00+07:00"),
           "jam_pengamatan_utc": w.strftime("%Y-%m-%dT%H:%M:00Z"),
           "label": "Analisis Centurisk97 dari citra inframerah Himawari-9 (NOAA open data). Uji kelayakan, bukan peringatan dan bukan produk BMKG.",
           "definisi": {"awan_dingin": "suhu kecerahan pita 13 (10,4 um) <= 235 K (-38 C)", "awan_sangat_dingin": "<= 208 K (-65 C)",
                        "persen": "persen titik contoh (kisi 0,1 derajat dalam poligon kabupaten) yang memenuhi ambang",
                        "tinggi_puncak": "PERKIRAAN KASAR dari suhu kecerahan minimum, profil tropis 300 K -6,5 K/km maks 16 km; bukan produk CHGT"},
           "ukuran_unduh_mb": round(unduh / 1e6, 1), "detik": round(dtk, 1), "n_kab": len(isi), "kab": isi}
    os.makedirs(os.path.dirname(BERKAS), exist_ok=True)
    with open(BERKAS + ".tmp", "w", encoding="utf-8") as f:
        json.dump(dok, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(BERKAS + ".tmp", BERKAS)
    print(f"awan_himawari {w:%Y%m%d %H%M}Z: {len(isi)} kab, {dok['ukuran_unduh_mb']} MB, {dok['detik']} dtk", file=sys.stderr)


def uji():
    # Planck: 300 K -> radiansi -> kembali ~300 K (c0..c2 ~ identitas)
    lam = 10.4074e-6
    rad = 2 * H * C * C / lam ** 5 / (math.exp(H * C / (lam * K * 300.0)) - 1) / 1e6
    assert abs(tb((rad - 15.197657722429469) / -0.0037525074318633814, (10.4074, -0.0037525074318633814, 15.197657722429469, 0, 1, 0)) - 300.0) < 0.01
    p = dict(sub=140.7, cfac=20466275, lfac=20466275, coff=2750.5, loff=2750.5, rs=42164.0, req=6378.137, rpol=6356.7523)
    assert proyeksi(0, 140.7, p) == (2750, 2750) or proyeksi(0, 140.7, p) == (2751, 2751)
    c, l = proyeksi(-6.2, 106.8, p)  # Jakarta: barat dan selatan khatulistiwa
    assert c < 2750 and l > 2750, (c, l)
    assert tinggi_km(300) == 0.0 and tinggi_km(190) == 16.0 and tinggi_km(235) == 10.0
    assert dalam(0.5, 0.5, [[(0, 0), (1, 0), (1, 1), (0, 1)]]) and not dalam(2, 2, [[(0, 0), (1, 0), (1, 1), (0, 1)]])
    print("uji awan_himawari ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        jalan(dt.datetime.strptime(sys.argv[1], "%Y%m%d%H%M").replace(tzinfo=dt.timezone.utc) if sys.argv[1:] else waktu_terbaru())
