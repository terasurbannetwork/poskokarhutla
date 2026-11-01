"""Hujan satelit harian NASA GPM IMERG (Late Run, cadangan Early Run) di Indonesia -> public/banjir/data/cuaca_imerg.json + arsip bulanan append-only.

Sumber: GES DISC OPeNDAP (ASCII subset), koleksi GPM_3IMERGDL.07 (Late, ~14 jam) dan GPM_3IMERGDE.07 (Early, ~4 jam), V07C per 1 Nov 2026
(daftar folder https://gpm1.gesdisc.eosdis.nasa.gov/data/GPM_L3/ publik; versi dibaca dari daftar folder, bukan dikunci). Grid 0,1 derajat,
dimensi precipitation[time=1][lon=3600][lat=1800] (diverifikasi lewat .dds publik), lon = -179,95 + 0,1 i, lat = -89,95 + 0,1 j, hari = hari UTC (07-07 WIB).
Auth: Authorization: Bearer $EARTHDATA_TOKEN; header hanya diteruskan ke *.earthdata.nasa.gov / *.eosdis.nasa.gov. Token tak ada = keluar 0, berkas lama utuh.
Per kab: maks dan rata-rata hujan harian atas sel 0,1 derajat di titik tengah kecamatannya (pusat_kec.json, kunci "prov|kab" sama dengan cuaca_prospektif).
Arsip cuaca_imerg_arsip_<YYYY-MM>.json {"terbit": {tgl: {"run":"L", "kab": {"prov|kab": [maks, rata]}}}}: HANYA Late Run, kab dengan maks >= 10 mm
(yang tidak tertulis = di bawah itu); entri tak pernah diubah, berkas rusak = berhenti (aturan prospektif_cuaca.py).
FORMAT ASCII LIVE BELUM DIKONFIRMASI (data butuh token; fixture uji dibangun dari dokumentasi Hyrax): parse() sengaja longgar dan main() mencatat
baris "skema IMERG" di log CI; bila gagal, langkah memberi peringatan dan berkas lama tidak disentuh.
Pakai: python3 scripts/cuaca/imerg.py   |   ... uji
"""
import collections, datetime as dt, http.cookiejar, json, os, re, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, baca, simpan

BASE = "https://gpm1.gesdisc.eosdis.nasa.gov"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
HOST_OK = (".earthdata.nasa.gov", ".eosdis.nasa.gov")
LON0, LAT0, RES = -179.95, -89.95, 0.1
I_LON, I_LAT = (2740, 3219), (780, 1590)   # 94,05-141,95 BT; 11,95 LS - 6,95 LU
HARI, MIN_ARSIP, MIN_GRID, SEL = 3, 10, 1, 0.25
HILANG = -9000


class Teruskan(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        r = super().redirect_request(req, fp, code, msg, headers, newurl)
        if r and not (urllib.parse.urlsplit(newurl).hostname or "").endswith(HOST_OK):
            r.headers.pop("Authorization", None)
        return r


def buka(token):
    op = urllib.request.build_opener(Teruskan, urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    op.addheaders = [("User-Agent", UA)]

    def ambil(url, coba=3):
        for n in range(coba):
            try:
                r = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
                return op.open(r, timeout=180).read().decode("utf-8", "replace")
            except Exception as e:
                if n == coba - 1:
                    raise
                time.sleep(10 * (n + 1))
    return ambil


def parse(teks):
    """ASCII OPeNDAP (DAP2) -> {(i_lon, i_lat): mm}. Baris data: '[t][i_lon], v, v, ...' (nilai sepanjang lat, mulai I_LAT[0]); -9999.9 dibuang."""
    out, bagian, ada = {}, "", None
    for g in teks.splitlines():
        g = g.strip()
        m = re.match(r"^((?:\[\d+\])+),\s*(.*)$", g)
        if not m:
            if g and not g.startswith("-") and ("," in g or "[" in g) and "{" not in g and ";" not in g:
                bagian = g
            continue
        if "precipitation" not in bagian or re.search(r"\.(lon|lat|time)\b", bagian):
            continue
        idx = [int(x) for x in re.findall(r"\[(\d+)\]", m.group(1))]
        for j, v in enumerate(m.group(2).split(",")):
            v = float(v)
            if v > HILANG:
                out[(idx[-1], j)] = v
        ada = ada or (bagian, g[:60])
    if ada:
        print(f"skema IMERG: bagian='{ada[0][:70]}' baris contoh='{ada[1]}' sel={len(out)}", file=sys.stderr)
    return out


def sel(i_lon, i_lat):
    """Indeks relatif subset -> (lat, lon) pusat sel."""
    return LAT0 + RES * (I_LAT[0] + i_lat), LON0 + RES * (I_LON[0] + i_lon)


def idx(lat, lon):
    return round((lon - LON0) / RES) - I_LON[0], round((lat - LAT0) / RES) - I_LAT[0]


def per_kab(nilai, pusat):
    """nilai {(i_lon,i_lat): mm}, pusat {'prov|kab|kec': [lat, lon]} -> {'prov|kab': [maks, rata]} (sel di titik tengah tiap kecamatan)."""
    h = collections.defaultdict(list)
    for k, (la, lo) in pusat.items():
        v = nilai.get(idx(la, lo))
        if v is not None:
            h["|".join(k.split("|")[:2])].append(v)
    return {k: [round(max(v), 1), round(sum(v) / len(v), 1)] for k, v in h.items()}


def kisi(nilai):
    """Rata-rata sel 0,1 -> sel 0,25 derajat; hanya >= MIN_GRID mm. -> [[lat, lon, mm]]"""
    a = collections.defaultdict(list)
    for (i, j), v in nilai.items():
        la, lo = sel(i, j)
        a[(int(la // SEL), int(lo // SEL))].append(v)
    return sorted([round((p + .5) * SEL, 3), round((q + .5) * SEL, 3), round(sum(v) / len(v), 1)] for (p, q), v in a.items() if sum(v) / len(v) >= MIN_GRID)


def tambah(isi, tgl, e):
    if tgl in isi["terbit"]:
        return isi, False
    isi["terbit"][tgl] = e
    return isi, True


def versi(ambil, koleksi, tahun, bulan):
    """Nama berkas terbaru per tanggal dari daftar folder publik: {YYYYMMDD: nama}."""
    d = ambil(f"{BASE}/data/GPM_L3/{koleksi}/{tahun}/{bulan}/")
    return {m.group(1): m.group(0) for m in re.finditer(r"3B-DAY-[EL]\.MS\.MRG\.3IMERG\.(\d{8})-S000000-E235959\.V07[A-Z]\.nc4(?=\")", d)}


def unduh(ambil, tgl):
    """Late Run bila ada, selain itu Early. -> (run, {(i_lon,i_lat): mm}) atau None."""
    d = dt.date.fromisoformat(tgl)
    for run, kol in (("L", "GPM_3IMERGDL.07"), ("E", "GPM_3IMERGDE.07")):
        try:
            f = versi(ambil, kol, f"{d:%Y}", f"{d:%m}").get(f"{d:%Y%m%d}")
            if not f:
                continue
            q = f"precipitation[0:0][{I_LON[0]}:{I_LON[1]}][{I_LAT[0]}:{I_LAT[1]}]"
            u = f"{BASE}/opendap/GPM_L3/{kol}/{d:%Y}/{d:%m}/{f}.ascii?" + urllib.parse.quote(q, safe=":")
            n = parse(ambil(u))
            if n:
                return run, n
            print(f"::warning title=cuaca imerg::{tgl} {run}: balasan tanpa sel terbaca", file=sys.stderr)
        except Exception as e:
            print(f"::warning title=cuaca imerg::{tgl} {run}: {e}", file=sys.stderr)
    return None


def main():
    token = os.environ.get("EARTHDATA_TOKEN")
    if not token:
        print("imerg: EARTHDATA_TOKEN tidak ada, dilewati (berkas lama utuh)", file=sys.stderr)
        return
    pusat = baca(os.path.join(KELUAR, "pusat_kec.json"))
    if not pusat:
        raise RuntimeError("pusat_kec.json tidak ada")
    ambil = buka(token)
    hari = [(dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=n)).isoformat() for n in range(1, HARI + 1)]
    ok = {}
    for t in hari:
        r = unduh(ambil, t)
        if r:
            ok[t] = r
    if not ok:
        raise RuntimeError("tidak ada hari IMERG yang terunduh")
    urut = sorted(ok)
    kab = {t: per_kab(ok[t][1], pusat) for t in urut}
    kunci = sorted({k for t in urut for k, v in kab[t].items() if v[0] >= MIN_GRID})
    akhir = urut[-1]
    simpan(os.path.join(KELUAR, "cuaca_imerg.json"), {
        "versi": 1, "sumber": "NASA GPM IMERG V07 Late Run (cadangan Early Run) via GES DISC; hari UTC (07.00-07.00 WIB)", "dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "hari": urut, "run": {t: ok[t][0] for t in urut}, "kolom": ["maks mm", "rata mm"],
        "kab": {k: [kab[t].get(k, [0, 0]) for t in urut] for k in kunci},
        "grid": {"hari": akhir, "sel": SEL, "kolom": ["lat", "lon", "mm"], "d": kisi(ok[akhir][1])}})
    for t in urut:   # arsip: hanya Late Run, entri lama tidak disentuh
        if ok[t][0] != "L":
            continue
        jalur = os.path.join(KELUAR, f"cuaca_imerg_arsip_{t[:7]}.json")
        if os.path.exists(jalur):
            try:
                isi = json.load(open(jalur))
                assert isinstance(isi["terbit"], dict)
            except Exception as x:
                raise RuntimeError(f"{jalur} rusak ({x}): berhenti, tidak memulai log baru diam-diam")
        else:
            isi = {"versi": 1, "bulan": t[:7], "kolom": ["maks mm", "rata mm"], "ambang_catat": {"mm": MIN_ARSIP}, "sumber": "NASA GPM IMERG V07 Late Run, sel 0,1 derajat di titik tengah kecamatan; hari UTC", "terbit": {}}
        isi, baru = tambah(isi, t, {"run": "L", "kab": {k: v for k, v in kab[t].items() if v[0] >= MIN_ARSIP}})
        if baru:
            simpan(jalur, isi)
    print(f"imerg: hari {urut}, run {[ok[t][0] for t in urut]}, {len(kunci)} kab >= {MIN_GRID} mm", file=sys.stderr)


def uji():
    # Fixture menurut dokumentasi Hyrax (DAP2 .ascii), BELUM dicocokkan dengan balasan live; 2 lon x 4 lat dari subset.
    fx = """Dataset {
    Grid {
      Array:
        Float32 precipitation[time = 1][lon = 2][lat = 4];
      Maps:
        Float64 time[time = 1];
        Float32 lon[lon = 2];
        Float64 lat[lat = 4];
    } precipitation;
} 3B-DAY-L.MS.MRG.3IMERG.20261031-S000000-E235959.V07C.nc4;
---------------------------------------------
precipitation.precipitation, [1][2][4]
[0][0], 0.0, 12.5, -9999.9, 80.0
[0][1], 2.0, 4.0, 6.0, 8.0

precipitation.time, [1]
1.4617E9

precipitation.lon, [2]
94.05, 94.15

precipitation.lat, [4]
-11.95, -11.85, -11.75, -11.65
"""
    n = parse(fx)
    assert n == {(0, 0): 0.0, (0, 1): 12.5, (0, 3): 80.0, (1, 0): 2.0, (1, 1): 4.0, (1, 2): 6.0, (1, 3): 8.0}, n
    la, lo = sel(1, 3)
    assert abs(la - (-11.65)) < 1e-6 and abs(lo - 94.15) < 1e-6 and idx(la, lo) == (1, 3)
    pu = {"11|Aceh|A": [-11.85, 94.05], "11|Aceh|B": [-11.65, 94.05], "11|Aceh|C": [-11.75, 94.05], "12|Sumut|X": [-11.95, 94.15]}
    assert per_kab(n, pu) == {"11|Aceh": [80.0, 46.2], "12|Sumut": [2.0, 2.0]}, per_kab(n, pu)   # C nol/hilang dilewati
    g = kisi(n)
    assert all(len(r) == 3 and r[2] >= MIN_GRID for r in g) and g
    isi = {"terbit": {}}
    isi, b1 = tambah(isi, "2026-10-31", {"run": "L", "kab": {}})
    isi, b2 = tambah(isi, "2026-10-31", {"run": "L", "kab": {"x": [1, 1]}})
    assert b1 and not b2 and isi["terbit"]["2026-10-31"]["kab"] == {}
    print("imerg uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
