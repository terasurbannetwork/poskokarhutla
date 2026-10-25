"""Kalibrasi faktor luas PERIODE dari sel 375 m unik (keputusan pemilik 25 Okt 2026). Analisis; mesin: scripts/data/peta_karhutla.py (luas periode).

Satuan = KEJADIAN SEL: rangkaian deteksi sel 375 m yang sama (sel() mesin) dengan jeda <= JEDA_SEL hari (WIB) antar deteksi = satu kejadian; jeda > JEDA_SEL
memulai kejadian baru. Luas periode = kejadian sel yang tersentuh periode x F_u. Dalam satu tahun, kejadian = sel unik kecuali sel yang menyala lagi sesudah > JEDA_SEL
hari (hitungan itu sama dengan yang dipakai berkas JSON, supaya mesin harian yang hanya mengingat JEDA_SEL hari ke belakang konsisten dengan kalibrasi).
Titik: N20 (2019-2025, SP 2018-04..) dan N21 (2024-2025), keyakinan n/h, di dalam batas wilayah, tahun WIB, tanpa sel sumber panas tetap (sama dengan kalibrasi_noaa.py).
F_u20 = median luas resmi tahunan 2019-2025 / kejadian sel N20 setahun; F_u_gab = median 2024-2025 / kejadian sel N20 u N21 (sel yang dilihat salah satu satelit).
Uji: tinggalkan satu tahun (MAE %) dan Jan-Jul 2026 vs SiPongi 202.011 ha. Pembanding lama: jumlah luas harian (F20 4,12) MAE 13,5% (kalibrasi_noaa.json loo_n20).
Pakai: python3 kalibrasi_unik.py  -> kalibrasi_unik.json + ringkasan"""
import csv, datetime as dt, json, os, statistics, sys
from collections import defaultdict
R = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/'
sys.path.insert(0, R + 'scripts/data')
import peta_karhutla as PK
import titik_palsu
from wilayah import Wilayah
SINI = os.path.dirname(os.path.abspath(__file__))
GMAX = PK.JEDA_SEL
INDUSTRI, _ = titik_palsu.sel_industri()
W = Wilayah()
RW = json.load(open(os.path.join(SINI, 'riwayat.json')))
RESMI = {int(r[0]): r[1] for r in RW['rows'] if r[0].isdigit() and int(r[0]) <= 2025}
SIP = 202011


def muat(path, hari_per_sel, tahun_min):
    """Isi hari_per_sel[(sel)] = set(hari ordinal WIB) untuk deteksi n/h tersaring di dalam batas wilayah."""
    memo = {}
    for r in csv.DictReader(open(path)):
        if (r.get('confidence') or '') not in ('n', 'h'):
            continue
        j = r['acq_time'].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}") + dt.timedelta(hours=7)
        if t.year < tahun_min:
            continue
        lon, lat = float(r['longitude']), float(r['latitude'])
        if titik_palsu.palsu(lat, lon, INDUSTRI):
            continue
        c = PK.sel(lon, lat)
        if c not in memo:
            memo[c] = bool(W.cari(lon, lat))
        if memo[c]:
            hari_per_sel[c].add(t.date().toordinal())


def kejadian(hari_per_sel, awal, akhir):
    """Jumlah kejadian sel dengan deteksi di [awal, akhir] (ordinal) menurut aturan JEDA_SEL; jeda dihitung dalam periode itu saja."""
    n = 0
    for hs in hari_per_sel.values():
        prev = None
        for d in sorted(x for x in hs if awal <= x <= akhir):
            if prev is None or d - prev > GMAX:
                n += 1
            prev = d
    return n


def tahun(y):
    return dt.date(y, 1, 1).toordinal(), dt.date(y, 12, 31).toordinal()


def loo(rasio, n):
    return {y: round((n[y] * statistics.median([v for k, v in rasio.items() if k != y]) / RESMI[y] - 1) * 100, 1) for y in rasio}


if __name__ == '__main__':
    s20, s21 = defaultdict(set), defaultdict(set)
    muat(R + 'data/raw/firms/viirs_noaa20.csv', s20, 2019)
    muat(R + 'data/raw/firms/viirs_noaa21.csv', s21, 2024)
    gab = defaultdict(set)
    for c in set(s20) | set(s21):
        gab[c] = s20.get(c, set()) | s21.get(c, set())
    k20 = {y: kejadian(s20, *tahun(y)) for y in range(2019, 2026)}
    # sel unik murni per tahun (tanpa aturan jeda) untuk dibandingkan
    uniq20 = {y: sum(1 for hs in s20.values() if any(tahun(y)[0] <= x <= tahun(y)[1] for x in hs)) for y in range(2019, 2026)}
    kg = {y: kejadian(gab, *tahun(y)) for y in (2024, 2025)}
    r20 = {y: RESMI[y] / k20[y] for y in k20}
    rg = {y: RESMI[y] / kg[y] for y in kg}
    Fu20, Fug = statistics.median(r20.values()), statistics.median(rg.values())
    L20 = loo(r20, k20)
    mae = lambda d: round(statistics.mean(abs(v) for v in d.values()), 1)
    # N20 saja pada 2024-2025 untuk pembanding setara dengan gabungan
    Lg = loo(rg, kg)   # dua tahun: tebakan satu tahun dari tahun lainnya
    a, b = dt.date(2026, 1, 1).toordinal(), dt.date(2026, 7, 31).toordinal()
    j20, jg = kejadian(s20, a, b), kejadian(gab, a, b)
    # hari kerja 2026 sampai 24 Okt
    a2, b2 = a, dt.date(2026, 10, 24).toordinal()
    out = {'JEDA_SEL': GMAX, 'kejadian_n20': k20, 'sel_unik_n20': uniq20, 'kejadian_gab': kg, 'rasio_n20': r20, 'rasio_gab': rg, 'Fu20': Fu20, 'Fu_gab': Fug,
           'loo_n20': L20, 'loo_n20_mae': mae(L20), 'loo_gab': Lg, 'loo_gab_mae': mae(Lg),
           'janjul_2026': {'sipongi': SIP, 'kejadian_n20': j20, 'kejadian_gab': jg, 'est_n20': j20 * Fu20, 'est_gab': jg * Fug,
                           'est_n20_pakai_gab': j20 * Fug, 'est_gab_pakai_n20': jg * Fu20},
           'sd_24okt_2026': {'kejadian_n20': kejadian(s20, a2, b2), 'kejadian_gab': kejadian(gab, a2, b2)}}
    json.dump(out, open(os.path.join(SINI, 'kalibrasi_unik.json'), 'w'), indent=1)
    k = lambda v: f"{v:.2f}".replace('.', ',')
    print('kejadian N20', k20, 'sel unik murni', uniq20)
    print('kejadian N20uN21', kg)
    print('ha/kejadian N20', {y: k(v) for y, v in r20.items()}, 'median F_u20', k(Fu20))
    print('ha/kejadian gab', {y: k(v) for y, v in rg.items()}, 'median F_u_gab', k(Fug))
    print('LOO N20 %', L20, 'MAE', mae(L20), '(lama jumlah harian 13,5)')
    print('LOO gab %', Lg, 'MAE', mae(Lg))
    for nama, est, n in (('N20 x Fu20', j20 * Fu20, j20), ('gab x Fu_gab', jg * Fug, jg), ('N20 x Fu_gab', j20 * Fug, j20), ('gab x Fu20', jg * Fu20, jg)):
        print(f'Jan-Jul 2026 {nama}: {n} kejadian -> {est:,.0f} ha ({(est / SIP - 1) * 100:+.1f}% vs SiPongi {SIP:,})')
    print('2026 s.d. 24 Okt kejadian N20', out['sd_24okt_2026'])
