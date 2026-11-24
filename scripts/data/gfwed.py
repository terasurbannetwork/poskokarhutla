"""NASA GFWED GEOS-5 (FWI prakiraan harian) tanpa pustaka luar + uji banding AUC per lead (PKH-25).

Berkas GFWED harian = netCDF-3 klasik ("CDF\\x02", 64-bit offset), BUKAN HDF5, jadi struct stdlib cukup membacanya
(`baca_kepala`, `titik`, `titik_jauh` lewat HTTP Range: berkas penuh 17 MB mengalir ~10 KB/s, 4 byte per sel 1 dtk). Sumber: https://portal.nccs.nasa.gov/datashare/GlobalFWI/v2.0/fwiCalcs.GEOS-5/Default/GEOS-5/<tahun>/<YYYYMMDD00>/
FWI.GEOS-5.Daily.Default.<run>.<valid>.nc (run D-L, valid D = lead L; file pertama run = H+1).

Pakai:  python3 scripts/data/gfwed.py uji            self-check luring (netCDF buatan tangan)
        python3 scripts/data/gfwed.py banding        baca sel lewat Range, hitung AUC per lead -> scripts/data/gfwed_banding.json
Milik pipa-data; fwi.py (rumus) tidak diubah.

PEMBANDING, bukan pengganti: AUC GFWED lead L (hari D, sel 0,5 derajat terdekat) vs AUC FWI hitungan kita (ERA5 jam 12, sama dengan
persentil_fwi.py) pada sel-hari yang sama, label "sel-hari >= K titik VIIRS". FWI kita di sini ERA5 (reanalisis, lead 0), BUKAN prakiraan:
membandingkannya dengan GFWED lead 7 itu timpang ke arah kita; pembanding prakiraan kita (ansambel IFS per lead) belum diarsipkan.
"""
import datetime as dt, json, os, struct, sys, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR

DASAR = "https://portal.nccs.nasa.gov/datashare/GlobalFWI/v2.0/fwiCalcs.GEOS-5/Default/GEOS-5"
HASIL = os.path.join(AKAR, "scripts/data/gfwed_banding.json")
UKURAN = {1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8}
KODE = {1: "b", 3: "h", 4: "i", 5: "f", 6: "d"}


def _str(b, o):
    n = struct.unpack_from(">i", b, o)[0]
    return b[o + 4:o + 4 + n].decode("utf-8", "replace"), o + 4 + (n + 3) // 4 * 4


def _atribut(b, o):
    tag, n = struct.unpack_from(">ii", b, o)
    o += 8
    out = {}
    for _ in range(n if tag else 0):
        nama, o = _str(b, o)
        t, k = struct.unpack_from(">ii", b, o)
        o += 8
        tebal = k * UKURAN[t]
        mentah = b[o:o + tebal]
        out[nama] = mentah.decode("utf-8", "replace") if t == 2 else list(struct.unpack(f">{k}{KODE[t]}", mentah))
        o += (tebal + 3) // 4 * 4
    return out, o


def baca_kepala(b):
    """Kepala netCDF-3 klasik/64-bit -> (dims, vars). vars[nama] = dict(dim, atr, tipe, vsize, mulai)."""
    assert b[:3] == b"CDF" and b[3] in (1, 2), "bukan netCDF-3 klasik (HDF5/netCDF-4 butuh pustaka)"
    v2 = b[3] == 2
    o = 8
    tag, n = struct.unpack_from(">ii", b, o)
    o += 8
    dims = []
    for _ in range(n if tag else 0):
        nama, o = _str(b, o)
        dims.append((nama, struct.unpack_from(">i", b, o)[0]))
        o += 4
    _, o = _atribut(b, o)
    tag, n = struct.unpack_from(">ii", b, o)
    o += 8
    vs = {}
    for _ in range(n if tag else 0):
        nama, o = _str(b, o)
        nd = struct.unpack_from(">i", b, o)[0]
        ids = struct.unpack_from(f">{nd}i", b, o + 4)
        o += 4 + 4 * nd
        atr, o = _atribut(b, o)
        t, vsize = struct.unpack_from(">ii", b, o)
        o += 8
        mulai = struct.unpack_from(">q" if v2 else ">i", b, o)[0]
        o += 8 if v2 else 4
        vs[nama] = {"dim": [dims[i] for i in ids], "atr": atr, "tipe": t, "vsize": vsize, "mulai": mulai}
    return dims, vs


def _isi(v, x):
    """Nilai isian/NaN/ekstrem -> None (bukan 0); terapkan scale_factor/add_offset."""
    kosong = v["atr"].get("_FillValue") or v["atr"].get("missing_value")
    if (kosong and x == kosong[0]) or x != x or abs(x) > 1e15:
        return None
    return x * (v["atr"].get("scale_factor") or [1])[0] + (v["atr"].get("add_offset") or [0])[0]


def baca_var(b, v):
    """Seluruh isi satu variabel (dimensi rekaman dihitung 1) -> list; isian = None."""
    n = 1
    for _, s in v["dim"]:
        n *= s or 1
    return [_isi(v, x) for x in struct.unpack_from(f">{n}{KODE[v['tipe']]}", b, v["mulai"])]


def titik(b, lat, lon):
    """{nama variabel 2-D (lat,lon): nilai di sel terdekat}. Bujur GFWED boleh -180..180 atau 0..360."""
    _, vs = baca_kepala(b)
    la, lo = baca_var(b, vs["lat"]), baca_var(b, vs["lon"])
    if lon < 0 and max(lo) > 180:
        lon += 360
    i = min(range(len(la)), key=lambda k: abs(la[k] - lat))
    j = min(range(len(lo)), key=lambda k: abs(lo[k] - lon))
    out = {}
    for k, v in vs.items():
        if len(v["dim"]) >= 2 and v["dim"][-1][1] == len(lo) and v["dim"][-2][1] == len(la):
            o = v["mulai"] + (i * len(lo) + j) * UKURAN[v["tipe"]]
            out[k] = _isi(v, struct.unpack_from(">" + KODE[v["tipe"]], b, o)[0])
    return out


def _rentang(url, a, n):
    """n byte mulai a lewat HTTP Range (server NCCS mendukung; berkas penuh 17 MB terlalu lambat ~10 KB/s)."""
    r = urllib.request.Request(url, headers={"User-Agent": "pipa-data/1.0", "Range": f"bytes={a}-{a + n - 1}"})
    for k in range(3):
        try:
            x = urllib.request.urlopen(r, timeout=60).read(n + 1)   # +1: balasan lebih panjang dari n (Range diabaikan) ditolak
            if len(x) == n:
                return x
        except Exception:
            pass
    return None


def url_harian(run, valid):
    return f"{DASAR}/{run[:4]}/{run}/FWI.GEOS-5.Daily.Default.{run}.{valid}.nc"


def titik_jauh(url, sel, nama="GEOS-5_FWI"):
    """{(lat,lon): nilai variabel `nama`} untuk daftar sel TANPA mengunduh berkas: kepala + sumbu + 4 byte per sel lewat Range.
    Galat/berkas hilang -> {} (bukan 0)."""
    kepala = _rentang(url, 0, 8192)
    if kepala is None:
        return {}
    try:
        _, vs = baca_kepala(kepala)
        if max(vs['lat']['dim'][0][1], vs['lon']['dim'][0][1]) > 20000:
            return {}
        la = struct.unpack(f">{vs['lat']['dim'][0][1]}d", _rentang(url, vs["lat"]["mulai"], 8 * vs["lat"]["dim"][0][1]))
        lo = struct.unpack(f">{vs['lon']['dim'][0][1]}d", _rentang(url, vs["lon"]["mulai"], 8 * vs["lon"]["dim"][0][1]))
        v = vs[nama]
        out = {}
        for lat, lon in sel:
            x = lon + 360 if lon < 0 and max(lo) > 180 else lon
            i = min(range(len(la)), key=lambda k: abs(la[k] - lat))
            j = min(range(len(lo)), key=lambda k: abs(lo[k] - x))
            c = _rentang(url, v["mulai"] + (i * len(lo) + j) * 4, 4)
            if c is not None:
                out[(lat, lon)] = _isi(v, struct.unpack(">f", c)[0])
        return out
    except (TypeError, KeyError, AssertionError, struct.error):
        return {}


def fwi_dari(nilai):
    """Nilai FWI dari hasil titik(): variabel yang namanya berakhir 'FWI' (bukan DSR/ISI)."""
    return next((v for k, v in nilai.items() if k.split("_")[-1] == "FWI"), None)


def banding(K=5, leads=(1, 3, 5, 7), tahun=2025, tiap=8):
    """AUC per lead GFWED vs FWI ERA5 kita pada sel contoh persentil_fwi, hari musim `tahun`, tiap `tiap` hari."""
    import persentil_fwi as PF
    PF.TAHUN_API = [t for t in PF.TAHUN_API if t > 2015]   # arsip VIIRS 2015 tak ada lokal (hanya pemanasan FWI)
    api, data = PF.api_per_sel(), PF.kumpul(0.3)
    from concurrent.futures import ThreadPoolExecutor
    kita, skor = {}, {L: [] for L in leads}
    sel_hari = {}   # tanggal -> [xy]
    for sels in data.values():
        for xy, s in sels:
            for t, v in sorted(s.items()):
                if t.startswith(str(tahun)) and dt.date.fromisoformat(t).toordinal() % tiap == 0:
                    kita[(xy, t)] = (v, api.get(xy, {}).get(t, 0) >= K)
                    sel_hari.setdefault(t, []).append(xy)
    tugas = [(t, L) for t in sel_hari for L in leads]
    def kerja(tl):
        t, L = tl
        d = dt.date.fromisoformat(t)
        return t, L, titik_jauh(url_harian((d - dt.timedelta(days=L)).strftime("%Y%m%d") + "00", d.strftime("%Y%m%d")), sel_hari[t])
    with ThreadPoolExecutor(8) as ex:
        for t, L, got in ex.map(kerja, tugas):
            for xy, g in got.items():
                if g is not None:
                    skor[L].append((xy, t, g, kita[(xy, t)][1]))
    hasil = {"dasar": f"PERINGATAN: banding timpang (FWI kita = ERA5 reanalisis lead 0, GFWED = prakiraan lead 1-7); sampel kecil (27 kejadian), tanpa selang kepercayaan: selisih AUC tidak bermakna. sel-hari musim {tahun} tiap {tiap} hari; label >= {K} titik VIIRS; sel contoh persentil_fwi (condong sering terbakar)",
             "K": K, "lead": {}, "dibuat": dt.date.today().isoformat()}
    for L in leads:
        rows = skor[L]
        ada = {(xy, t) for xy, t, _, _ in rows}
        a = PF.auc([g for _, _, g, y in rows if y], [g for _, _, g, y in rows if not y])
        ak = PF.auc([kita[k][0] for k in ada if kita[k][1]], [kita[k][0] for k in ada if not kita[k][1]])
        hasil["lead"][str(L)] = {"sel_hari": len(rows), "kejadian": sum(1 for r in rows if r[3]),
                                 "auc_gfwed": None if a is None else round(a, 3), "auc_fwi_kita_era5": None if ak is None else round(ak, 3)}
    return hasil


def _nc_uji(lat, lon, fwi):
    """netCDF-3 64-bit mini buatan tangan: dim lat, lon; var lat, lon (double), GEOS-5_FWI (float, _FillValue -9999)."""
    def s(x):
        x = x.encode()
        return struct.pack(">i", len(x)) + x + b"\0" * (-len(x) % 4)
    kosong = struct.pack(">ii", 0, 0)
    isian = struct.pack(">ii", 12, 1) + s("_FillValue") + struct.pack(">iif", 5, 1, -9999.0)
    nl, no = len(lat), len(lon)
    dim = struct.pack(">ii", 10, 2) + s("lat") + struct.pack(">i", nl) + s("lon") + struct.pack(">i", no)
    def var(nm, ids, t, vs, mulai, atr):
        return s(nm) + struct.pack(">i", len(ids)) + struct.pack(f">{len(ids)}i", *ids) + atr + struct.pack(">iiq", t, vs, mulai)
    panjang = 8 + len(dim) + len(kosong) + 8 + len(var("lat", [0], 6, 0, 0, kosong)) + len(var("lon", [1], 6, 0, 0, kosong)) \
        + len(var("GEOS-5_FWI", [0, 1], 5, 0, 0, isian))
    o2 = panjang + 8 * nl
    o3 = o2 + 8 * no
    vv = struct.pack(">ii", 11, 3) + var("lat", [0], 6, 8 * nl, panjang, kosong) + var("lon", [1], 6, 8 * no, o2, kosong) \
        + var("GEOS-5_FWI", [0, 1], 5, 4 * nl * no, o3, isian)
    return (b"CDF\x02" + struct.pack(">i", 0) + dim + kosong + vv + struct.pack(f">{nl}d", *lat) + struct.pack(f">{no}d", *lon)
            + struct.pack(f">{nl * no}f", *fwi))


def uji():
    b = _nc_uji([-1.0, 0.0, 1.0], [100.0, 100.5, 101.0, 101.5], [float(i) for i in range(12)])
    assert baca_kepala(b)[1]["GEOS-5_FWI"]["tipe"] == 5
    assert titik(b, 0.1, 100.6) == {"GEOS-5_FWI": 5.0}                      # baris 1 kolom 1 = 1*4+1
    assert fwi_dari(titik(b, 1.0, 101.5)) == 11.0
    assert fwi_dari(titik(_nc_uji([0.0], [10.0], [-9999.0]), 0, 10)) is None, "nilai isian = None, bukan 0"
    try:
        baca_kepala(b"\x89HDF\r\n\x1a\n")
        raise SystemExit("HDF5 harus ditolak")
    except AssertionError:
        pass
    print("gfwed.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:] == ["banding"]:
        h = banding()
        json.dump(h, open(HASIL, "w"), ensure_ascii=False, indent=1)
        print(json.dumps(h, ensure_ascii=False, indent=1))
    else:
        uji()
