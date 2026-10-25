"""Uji usulan: kalibrasi luas langsung ke NOAA-20 dan NOAA-21 (tanpa porsi S-NPP 0,534). Analisis saja, website tidak diubah.

Titik per tahun = keyakinan n/h, di dalam batas wilayah, tahun WIB, TANPA titik di sel sumber panas tetap (titik_palsu.sel_industri(): smelter, tambang, kilang,
pembangkit, lepas pantai; kawah tetap dihitung) = saringan YANG SAMA dengan mesin luas scripts/data/peta_karhutla.py (sebelum 25 Okt 2026 aturan sejarah.vegetasi), untuk
data/raw/firms/viirs_noaa20.csv (SP 2018-04-01..) dan viirs_noaa21.csv (SP 2023-03-01..). S-NPP dari sejarah.json website (sumber faktor 4,3).
Luas resmi 2015-2025: riwayat.json (factsheet_karhutla.json website, Bakom/BNPB). 2026 Jan-Jul: SiPongi 202.011 ha (laporan.py, uji luar contoh).
Faktor luas PERIODE (sel 375 m unik, tanpa hitung ganda antarhari) dikalibrasi di kalibrasi_unik.py dengan cara yang sama.
Keluaran: kalibrasi_noaa.json + ringkasan di stdout.
Pakai: python3 kalibrasi_noaa.py"""
import csv, datetime as dt, json, os, statistics, sys
from collections import Counter
R = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/'
sys.path.insert(0, R + 'scripts/data')
from wilayah import Wilayah
import sejarah
import titik_palsu
INDUSTRI, _ = titik_palsu.sel_industri()
SINI = os.path.dirname(os.path.abspath(__file__))
W = Wilayah()


def hitung(path):
    """-> (titik per tahun WIB, titik per bulan 2026, titik per (hari, provinsi) 2026)."""
    th, bl, hp = Counter(), Counter(), Counter()
    for r in csv.DictReader(open(path)):
        if (r.get('confidence') or '') not in ('n', 'h') or titik_palsu.palsu(r['latitude'], r['longitude'], INDUSTRI):
            continue
        j = r['acq_time'].zfill(4); t = dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}") + sejarah.WIB
        adm = W.cari(float(r['longitude']), float(r['latitude']))
        if not adm:
            continue
        th[t.year] += 1
        if t.year == 2026: bl[t.month] += 1; hp[(t.date().isoformat(), adm[0])] += 1
    return th, bl, hp


RW = json.load(open(os.path.join(SINI, 'riwayat.json')))
RESMI = {int(r[0]): r[1] for r in RW['rows'] if r[0].isdigit() and int(r[0]) <= 2025}
SNPP = {int(r[0]): r[2] for r in RW['rows'] if r[0].isdigit() and r[2] and int(r[0]) <= 2025}
n20, b20, h20 = hitung(R + 'data/raw/firms/viirs_noaa20.csv')
n21, b21, h21 = hitung(R + 'data/raw/firms/viirs_noaa21.csv')
PENUH20 = [y for y in range(2019, 2026)]          # 2018 mulai April (SP), tidak penuh
PENUH21 = [y for y in range(2024, 2026)]          # 2023 mulai Maret
f = lambda n, ys: {y: RESMI[y] / n[y] for y in ys}
r20, r21, rsn = f(n20, PENUH20), f(n21, PENUH21), f(SNPP, range(2015, 2026))
F20, F21, FSN = statistics.median(r20.values()), statistics.median(r21.values()), statistics.median(rsn.values())


def loo(rasio, n):
    """Tinggalkan satu tahun: tebak luas tahun itu = titik x median rasio tahun lain. -> {tahun: galat %}"""
    return {y: round((n[y] * statistics.median([v for k, v in rasio.items() if k != y]) / RESMI[y] - 1) * 100, 1) for y in rasio}


L20, LSN = loo(r20, n20), loo({y: rsn[y] for y in PENUH20}, SNPP)
# uji luar contoh Jan-Jul 2026 (SiPongi 202.011 ha)
SIP = 202011
j20, j21 = sum(b20[m] for m in range(1, 8)), sum(b21[m] for m in range(1, 8))
est20, est21 = j20 * F20, j21 * F21
gab = (est20 + est21) / 2
kini = (j20 + j21) * 0.5337924177818518 * 4.3
out = {'titik_n20': dict(n20), 'titik_n21': dict(n21), 'rasio_n20': r20, 'rasio_n21': r21, 'rasio_snpp': rsn, 'F20': F20, 'F21': F21, 'FSNPP': FSN,
       'loo_n20': L20, 'loo_snpp_tahun_sama': LSN, 'janjul_2026': {'sipongi': SIP, 'n20': j20, 'n21': j21, 'est_n20': est20, 'est_n21': est21, 'est_gabung': gab,
       'est_kini_0534': kini}, 'bulan_2026_n20': dict(b20), 'bulan_2026_n21': dict(b21)}
json.dump(out, open(os.path.join(SINI, 'kalibrasi_noaa.json'), 'w'), indent=1, default=str)
k = lambda v: f"{v:.2f}".replace('.', ',')
print('titik N20', dict(sorted(n20.items()))); print('titik N21', dict(sorted(n21.items())))
print('ha/titik N20', {y: k(v) for y, v in r20.items()}, 'median', k(F20))
print('ha/titik N21', {y: k(v) for y, v in r21.items()}, 'median', k(F21))
print('ha/titik S-NPP', {y: k(v) for y, v in rsn.items()}, 'median', k(FSN))
print('LOO N20 %', L20, 'MAE', round(statistics.mean(abs(v) for v in L20.values()), 1))
print('LOO S-NPP tahun sama %', LSN, 'MAE', round(statistics.mean(abs(v) for v in LSN.values()), 1))
print(f'Jan-Jul 2026: SiPongi {SIP:,}; N20 {est20:,.0f} ({(est20/SIP-1)*100:+.0f}%); N21 {est21:,.0f} ({(est21/SIP-1)*100:+.0f}%); gabung {gab:,.0f} ({(gab/SIP-1)*100:+.0f}%); cara kini {kini:,.0f} ({(kini/SIP-1)*100:+.0f}%)')

# kestabilan harian 2026: provinsi-hari dengan >= 50 titik NOAA; seberapa jauh perkiraan N20 saja dan N21 saja berselisih, dan gabung vs cara kini
ph = [k for k in set(h20) | set(h21) if h20[k] + h21[k] >= 50]
beda = sorted(abs(h20[k] * F20 - h21[k] * F21) / ((h20[k] * F20 + h21[k] * F21) / 2) for k in ph)
rasio_gk = sorted(((h20[k] * F20 + h21[k] * F21) / 2) / ((h20[k] + h21[k]) * 0.5337924177818518 * 4.3) for k in ph)
q = lambda a, p: a[int(p * (len(a) - 1))]
print(f'prov-hari 2026 (>=50 titik): {len(ph)}; selisih N20-saja vs N21-saja: median {q(beda,.5)*100:.0f}%, P90 {q(beda,.9)*100:.0f}%')
print(f'gabung baru / cara kini per prov-hari: median {q(rasio_gk,.5):.2f}, P10 {q(rasio_gk,.1):.2f}, P90 {q(rasio_gk,.9):.2f}')
out['harian'] = {'n': len(ph), 'beda_median': q(beda, .5), 'beda_p90': q(beda, .9), 'gabung_per_kini': [q(rasio_gk, .1), q(rasio_gk, .5), q(rasio_gk, .9)]}
json.dump(out, open(os.path.join(SINI, 'kalibrasi_noaa.json'), 'w'), indent=1, default=str)
