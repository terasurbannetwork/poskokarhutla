"""Kalibrasi faktor ha per LOKASI UNIK per hari (keputusan pemilik 9 Nov 2026: "Belum padam" = lokasi unik x faktor ini).

Lokasi unik = sel peta_karhutla.sel() (~375 m) yang terdeteksi NOAA-20 atau NOAA-21 keyakinan n/h pada satu hari WIB, dihitung sekali berapa pun satelit dan lintasannya,
di dalam batas wilayah, tanpa sel sumber panas tetap (titik_palsu.sel_industri()) = saringan yang sama dengan kalibrasi_noaa.py.
Faktor = luas resmi BNPB tahunan (riwayat.json) / jumlah lokasi-hari setahun, median antartahun, sama dengan cara F20/F21 di kalibrasi_noaa.py.
  F_GAB : N20 u N21, 2024-2025 (dua tahun penuh N21), dipakai harian karena 2026 selalu dua satelit.
  F_N20 : N20 saja, 2019-2025 (pembanding tujuh tahun, tidak dipakai).
Uji: Jan-Jul 2026 vs SiPongi 202.011 ha.
Pakai: python3 kalibrasi_lokasi.py [folder firms]  -> kalibrasi_lokasi.json + ringkasan."""
import csv, datetime as dt, json, os, statistics, sys
from collections import defaultdict

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
import peta_karhutla as PK   # noqa: E402
import titik_palsu           # noqa: E402
from wilayah import Wilayah  # noqa: E402

FIRMS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AKAR, 'data/raw/firms')
SIP = 202011
INDUSTRI, _ = titik_palsu.sel_industri()
W = Wilayah()
RESMI = {int(r[0]): r[1] for r in json.load(open(os.path.join(SINI, 'riwayat.json')))['rows'] if r[0].isdigit() and int(r[0]) <= 2025}


def muat(path, hari_sel, tahun_min):
    """hari_sel[(hari WIB ordinal)] = set(sel) untuk deteksi n/h tersaring di dalam batas wilayah."""
    memo = {}
    for r in csv.DictReader(open(path)):
        if (r.get('confidence') or '') not in ('n', 'h'):
            continue
        j = r['acq_time'].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}") + dt.timedelta(hours=7)
        if t.year < tahun_min:
            continue
        lon, lat = float(r['longitude']), float(r['latitude'])
        c = PK.sel(lon, lat)
        if c not in memo:
            memo[c] = bool(W.cari(lon, lat)) and not titik_palsu.palsu(lat, lon, INDUSTRI)
        if memo[c]:
            hari_sel[t.date().toordinal()].add(c)


def per_tahun(hs, tahun):
    n = defaultdict(int)
    for d, s in hs.items():
        y = dt.date.fromordinal(d).year
        if y in tahun:
            n[y] += len(s)
    return dict(n)


if __name__ == '__main__':
    h20, h21 = defaultdict(set), defaultdict(set)
    muat(os.path.join(FIRMS, 'viirs_noaa20.csv'), h20, 2019)
    muat(os.path.join(FIRMS, 'viirs_noaa21.csv'), h21, 2024)
    gab = defaultdict(set)
    for d in set(h20) | set(h21):
        gab[d] = h20.get(d, set()) | h21.get(d, set())
    n20, ng = per_tahun(h20, range(2019, 2027)), per_tahun(gab, range(2024, 2027))
    r20 = {y: RESMI[y] / n20[y] for y in range(2019, 2026)}
    rg = {y: RESMI[y] / ng[y] for y in (2024, 2025)}
    F20, FG = statistics.median(r20.values()), statistics.median(rg.values())
    a, b = dt.date(2026, 1, 1).toordinal(), dt.date(2026, 7, 31).toordinal()
    jg = sum(len(s) for d, s in gab.items() if a <= d <= b)
    j20 = sum(len(s) for d, s in h20.items() if a <= d <= b)
    out = {'lokasi_hari_n20': n20, 'lokasi_hari_gab': ng, 'rasio_n20': r20, 'rasio_gab': rg, 'F_N20': F20, 'F_GAB': FG,
           'janjul_2026': {'sipongi': SIP, 'lokasi_hari_gab': jg, 'est_gab': jg * FG, 'lokasi_hari_n20': j20, 'est_n20': j20 * F20}}
    json.dump(out, open(os.path.join(SINI, 'kalibrasi_lokasi.json'), 'w'), indent=1)
    k = lambda v: f"{v:.3f}".replace('.', ',')
    print('lokasi-hari N20', n20, '\nlokasi-hari N20uN21', ng)
    print('ha/lokasi-hari N20', {y: k(v) for y, v in r20.items()}, 'median', k(F20))
    print('ha/lokasi-hari gab', {y: k(v) for y, v in rg.items()}, 'median', k(FG))
    print(f'Jan-Jul 2026: gab {jg} x {k(FG)} = {jg * FG:,.0f} ha ({(jg * FG / SIP - 1) * 100:+.1f}% vs SiPongi {SIP:,}); N20 saja {j20} x {k(F20)} = {j20 * F20:,.0f} ({(j20 * F20 / SIP - 1) * 100:+.1f}%)')
