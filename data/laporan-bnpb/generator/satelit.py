"""Angka satelit karhutla untuk deck, dengan jam cut-off pada hari laporan (hari terakhir = angka sementara s.d. jam itu).

Mesin hitungnya mesin website (scripts/data/peta_karhutla.py: rekam, hari_data, hitung, hitung_wil; luas per titik F20/F21 per satelit), jadi untuk hari yang sudah
lengkap hasilnya sama dengan public/data/peta_karhutla*.json. Yang ditambah di sini hanya: tarikan FIRMS mentah per hari UTC (cache CSV),
pemotongan di jam cut-off WIB, dan hot_bersih (tanpa titik sumber panas industri, sama dengan harian30.json / tabel Real Time website).

API:
    hitung(tanggal: date, jam='15:00', hari_n=4, kunci=None) -> {
        'hari': ['YYYY-MM-DD', ...]            # hari_n hari WIB, berakhir di tanggal
        'cutoff': 'YYYY-MM-DDTHH:MM+07:00',
        'faktor': PK.FAKTOR,
        'prov': {'62': {'hot': [..], 'hot_bersih': [..], 'luas': [..], 'belum': [..], 'padam': [..], 'fs': [0, ..]}},
        'kab':  {'62|Kotawaringin Barat': {... sama ...}},       # kunci persis properties.kunci layar
        'kec':  {'62|Kotawaringin Barat|Kumai': {... sama ...}},
    }   # luas/belum/padam float belum dibulatkan (bulatkan sekali di deck), hot int
CLI:
    python3 satelit.py --tanggal 2026-10-25 [--jam 15:00] [--hari 4] [--keluar angka.json]
    python3 satelit.py --uji      # hari lengkap 23 Okt (jam 23:59) harus sama dengan public/data/peta_karhutla.json lokal (bangun --penuh dengan rumus F20/F21)
Butuh FIRMS_MAP_KEY (env atau .env repo). CSV mentah di cache/raw/ (di-ignore git)."""
import csv, datetime as dt, io, json, os, re, sys, urllib.request
from collections import defaultdict

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
import peta_karhutla as PK   # noqa: E402
import titik_palsu as TP      # noqa: E402
from wilayah import Wilayah   # noqa: E402

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache', 'raw')
SUMBER = ('MODIS_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT')
WIB = PK.WIB


def kunci_firms(kunci=None):
    if kunci or os.environ.get('FIRMS_MAP_KEY'):
        return kunci or os.environ['FIRMS_MAP_KEY']
    m = re.search(r'^FIRMS_MAP_KEY=(\S+)', open(os.path.join(AKAR, '.env')).read(), re.M)
    if not m:
        sys.exit('FIRMS_MAP_KEY tidak ada (env atau .env)')
    return m.group(1)


def csv_hari(src, u, cutoff, kunci):
    """CSV FIRMS satu sumber satu hari UTC. Cache sah bila ditarik sesudah cut-off atau >= 12 jam sesudah hari UTC-nya berakhir."""
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, f'{src}-{u.isoformat()}.csv')
    akhir = dt.datetime.combine(u + PK.HARI, dt.time(), PK.UTC)
    if os.path.exists(f):
        t = dt.datetime.fromtimestamp(os.path.getmtime(f), PK.UTC)
        if t >= akhir + PK.TRUST or t >= cutoff:
            return open(f).read()
    url = f'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{kunci}/{src}/{PK.BBOX}/1/{u.isoformat()}'
    teks = urllib.request.urlopen(url, timeout=180).read().decode()
    if not teks.startswith('latitude'):
        sys.exit(f'FIRMS {src} {u}: jawaban bukan CSV ({teks[:60]!r})')
    open(f, 'w').write(teks)
    return teks


def hitung(tanggal, jam='15:00', hari_n=4, kunci=None):
    cutoff = dt.datetime.combine(tanggal, dt.time.fromisoformat(jam), WIB)
    hari = [tanggal - (hari_n - 1 - i) * PK.HARI for i in range(hari_n)]
    utc = [hari[0] - (3 - i) * PK.HARI for i in range((tanggal - hari[0]).days + 4)]   # hari_data(d) butuh UTC d-1, d; hitung(d) butuh d-2
    kunci = kunci_firms(kunci)
    sel_ind, _ = TP.sel_industri()
    semua, ind = [], []
    for u in utc:
        for src in SUMBER:
            for r in csv.DictReader(io.StringIO(csv_hari(src, u, cutoff, kunci))):
                t = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M').replace(tzinfo=PK.UTC)
                if t >= cutoff:
                    continue
                semua.append((src, r))
                if r['satellite'] in PK.HOT and TP.palsu(r['latitude'], r['longitude'], sel_ind):
                    ind.append((src, r))
    w = Wilayah()
    rek, rek_ind = PK.rekam(semua, w, '', sel_ind), PK.rekam(ind, w, '')
    for r in (rek, rek_ind):
        for u in utc:
            r.setdefault(u.isoformat(), PK.baru_rekaman(''))
    hd = {d: PK.hari_data(rek, d) for d in utc[1:]}
    hd_ind = {d: PK.hari_data(rek_ind, d) for d in utc[1:]}
    out = {'prov': {}, 'kab': {}, 'kec': {}}
    def isi(tingkat, k, i, hot, luas, belum, padam, hot_ind):
        o = out[tingkat].setdefault(k, {m: [0] * hari_n for m in ('hot', 'hot_bersih', 'luas', 'belum', 'padam', 'fs')})
        o['hot'][i], o['luas'][i], o['belum'][i], o['padam'][i] = hot, luas, belum, padam
        o['hot_bersih'][i] = hot - hot_ind
    for i, d in enumerate(hari):
        for k, (h, l, b, p) in PK.hitung(hd, d).items():
            isi('prov', k, i, h, l, b, p, hd_ind[d]['hot'].get(k, 0))
        ind_w = defaultdict(int)
        for kk, n in hd_ind[d]['hotw'].items():
            ind_w[kk] += n; ind_w[kk.rsplit('|', 1)[0]] += n
        for k, (h, l, b, p) in PK.hitung_wil(hd, d).items():
            isi('kec' if k.count('|') == 2 else 'kab', k, i, h, l, b, p, ind_w.get(k, 0))
    return {'hari': [d.isoformat() for d in hari], 'cutoff': cutoff.isoformat(timespec='minutes'), 'faktor': PK.FAKTOR, **out}


def uji():
    """Hari lengkap 23 Okt 2026 = berkas website lokal (public/data/peta_karhutla.json luas/belum/padam per provinsi, rumus F20/F21 yang sama); hot bersih = harian30.json
    di website (jaringan). Berkas lokal harus dibangun ulang penuh dengan peta_karhutla.py bila F20/F21 berubah."""
    a = hitung(dt.date(2026, 10, 23), '23:59', 3)
    P = json.load(open(os.path.join(AKAR, 'public/data/peta_karhutla.json')))
    assert P['faktor'] == PK.FAKTOR, f"berkas lokal memakai faktor {P['faktor']}, mesin {PK.FAKTOR}: bangun ulang penuh"
    ambil = lambda f: json.load(urllib.request.urlopen(urllib.request.Request(f'https://centurisk97.id/data/{f}', headers={'User-Agent': 'curl/8'}), timeout=60))
    H = ambil('harian30.json')
    ip, ih = P['hari'].index('2026-10-23'), H['hari'].index('2026-10-23')
    beda = [(k, m, PK.bul(o[m][-1]), P['prov'][k][m][ip]) for k, o in a['prov'].items() if k in P['prov']
            for m in ('luas', 'belum', 'padam') if abs(PK.bul(o[m][-1]) - (P['prov'][k][m][ip] or 0)) > 1]
    hb = [(k, o['hot_bersih'][-1], H['prov'].get(k, [0] * 99)[ih]) for k, o in a['prov'].items() if o['hot_bersih'][-1] != H['prov'].get(k, [0] * 99)[ih]]
    assert not beda, f'luas/belum/padam beda dengan berkas website: {beda[:8]}'
    assert len(hb) <= 2 and all(abs(x - y) <= 3 for _, x, y in hb), f'hot bersih beda dengan harian30: {hb[:8]}'
    print('uji lolos: 23 Okt sama dengan berkas website lokal untuk', len(a['prov']), 'provinsi; hot_bersih selisih', hb)


if __name__ == '__main__':
    arg = sys.argv[1:]
    if '--uji' in arg:
        uji()
    else:
        nilai = lambda o, b: arg[arg.index(o) + 1] if o in arg else b
        a = hitung(dt.date.fromisoformat(nilai('--tanggal', '')), nilai('--jam', '15:00'), int(nilai('--hari', '4')))
        json.dump(a, open(nilai('--keluar', 'angka_satelit.json'), 'w'), ensure_ascii=False)
        print('ok', a['cutoff'], 'nasional hot', sum(o['hot'][-1] for o in a['prov'].values()),
              'luas', PK.bul(sum(o['luas'][-1] for o in a['prov'].values())), 'belum', PK.bul(sum(o['belum'][-1] for o in a['prov'].values())))
