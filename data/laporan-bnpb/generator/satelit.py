"""Angka satelit karhutla untuk deck, dengan jam cut-off pada hari laporan (hari terakhir = angka sementara s.d. jam itu).

Mesin hitungnya mesin website (scripts/data/peta_karhutla.py: rekam, hari_data, hitung, hitung_wil; luas per titik F20/F21 per satelit), jadi untuk hari yang sudah
lengkap hasilnya sama dengan public/data/peta_karhutla*.json. Yang ditambah di sini hanya: tarikan FIRMS mentah per hari UTC (cache CSV),
pemotongan di jam cut-off WIB. hot = LOKASI UNIK per hari WIB (titik_unik.py: M, N, N20, N21, sedang/tinggi, tanpa sel industri; keputusan pemilik 25 Okt 2026), jadi hot_bersih == hot
(kunci dipertahankan untuk pembaca lama) dan 'hot_mandiri' = hitungan ulang terpisah dari baris mentah (pembanding uji).

API:
    hitung(tanggal: date, jam='17:00', hari_n=4, kunci=None) -> {
        'hari': ['YYYY-MM-DD', ...]            # hari_n hari WIB, berakhir di tanggal
        'cutoff': 'YYYY-MM-DDTHH:MM+07:00',
        'faktor': PK.FAKTOR,
        'prov': {'62': {'hot': [..], 'hot_bersih': [..], 'luas': [..], 'belum': [..], 'padam': [..]}},   # firespot tidak di sini: firespot_hari.py
        'kab':  {'62|Kotawaringin Barat': {... sama ...}},       # kunci persis properties.kunci layar
        'kec':  {'62|Kotawaringin Barat|Kumai': {... sama ...}},
    }   # luas/belum/padam float belum dibulatkan (bulatkan sekali di deck), hot int
CLI:
    python3 satelit.py --tanggal 2026-10-25 [--jam 17:00] [--hari 4] [--keluar angka.json]
    python3 satelit.py --uji      # hari lengkap 23 Okt (jam 23:59) harus sama dengan public/data/peta_karhutla.json lokal (bangun --penuh dengan rumus F20/F21)
Butuh FIRMS_MAP_KEY (env atau .env repo). CSV mentah di cache/raw/ (di-ignore git)."""
import csv, datetime as dt, io, json, os, re, sys, urllib.request
from collections import defaultdict

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
import peta_karhutla as PK   # noqa: E402
import titik_palsu as TP      # noqa: E402
import titik_unik as TU       # noqa: E402
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
    teks = urllib.request.urlopen(url, timeout=600).read().decode()
    if not teks.startswith('latitude'):
        sys.exit(f'FIRMS {src} {u}: jawaban bukan CSV ({teks[:60]!r})')
    open(f, 'w').write(teks)
    return teks


def hitung(tanggal, jam='17:00', hari_n=4, kunci=None):
    cutoff = dt.datetime.combine(tanggal, dt.time.fromisoformat(jam), WIB)
    hari = [tanggal - (hari_n - 1 - i) * PK.HARI for i in range(hari_n)]
    utc = [hari[0] - (3 - i) * PK.HARI for i in range((tanggal - hari[0]).days + 4)]   # hari_data(d) butuh UTC d-1, d; hitung(d) butuh d-2
    kunci = kunci_firms(kunci)
    sel_ind, _ = TP.sel_industri()
    semua = []
    for u in utc:
        for src in SUMBER:
            for r in csv.DictReader(io.StringIO(csv_hari(src, u, cutoff, kunci))):
                t = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M').replace(tzinfo=PK.UTC)
                if t >= cutoff:
                    continue
                semua.append((src, r))
    w = Wilayah()
    rek = PK.rekam(semua, w, '', sel_ind)
    for u in utc:
        rek.setdefault(u.isoformat(), PK.baru_rekaman(''))
    hd = {d: PK.hari_data(rek, d) for d in utc[1:]}
    # pembanding mandiri: titik_unik.unik langsung atas baris mentah (tanpa rekam/hari_data), berurut waktu, hari WIB
    pts = []
    for _, r in semua:
        sen = {'Terra': 'M', 'Aqua': 'M'}.get(r['satellite'], r['satellite'])
        la, lo = float(r['latitude']), float(r['longitude'])
        if sen in TU.SENSOR and PK.sedang(r) and not TP.palsu(la, lo, sel_ind):
            t = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M').replace(tzinfo=PK.UTC)
            pts.append({'s': sen, 'c': 1, 'lat': la, 'lon': lo, 't': t, 'wib': t.astimezone(WIB).date().isoformat()})
    pts.sort(key=lambda x: x['t'])
    mandiri, mentah = defaultdict(int), defaultdict(int)
    for x in pts:
        a_ = w.cari(x['lon'], x['lat'])
        x['p'] = a_[0] if a_ else ''
        mentah[(x['wib'], x['p'])] += 1
    for x in TU.unik(pts, lambda x: x['wib']):
        mandiri[(x['wib'], x['p'])] += 1
    out = {'prov': {}, 'kab': {}, 'kec': {}}
    def isi(tingkat, k, i, hot, luas, belum, padam):
        o = out[tingkat].setdefault(k, {m: [0] * hari_n for m in ('hot', 'hot_bersih', 'luas', 'belum', 'padam')})
        o['hot'][i], o['luas'][i], o['belum'][i], o['padam'][i] = hot, luas, belum, padam
        o['hot_bersih'][i] = hot   # hot sudah bersih
    for i, d in enumerate(hari):
        for k, (h, l, b, p) in PK.hitung(hd, d).items():
            isi('prov', k, i, h, l, b, p)
        for k, (h, l, b, p) in PK.hitung_wil(hd, d).items():
            isi('kec' if k.count('|') == 2 else 'kab', k, i, h, l, b, p)
    mand = {k: [mandiri.get((d.isoformat(), k), 0) for d in hari] for k in PK.PROVINSI}
    mentah_p = {k: [mentah.get((d.isoformat(), k), 0) for d in hari] for k in PK.PROVINSI}
    return {'hari': [d.isoformat() for d in hari], 'cutoff': cutoff.isoformat(timespec='minutes'), 'faktor': PK.FAKTOR, 'hot_mandiri': mand, 'hot_mentah': mentah_p, **out}


def uji():
    """Hari lengkap 23 Okt 2026: luas/belum/padam = berkas website lokal (public/data/peta_karhutla.json, rumus F20/F21 yang sama); hot (lokasi unik) = hitungan ulang mandiri
    titik_unik.unik atas baris mentah, harus sama persis, <= deteksi mentah, dan nasional lebih kecil (sel yang dilihat dua satelit = satu).
    Berkas lokal harus dibangun ulang penuh dengan peta_karhutla.py bila F20/F21 berubah."""
    a = hitung(dt.date(2026, 10, 23), '23:59', 3)
    P = json.load(open(os.path.join(AKAR, 'public/data/peta_karhutla.json')))
    assert P['faktor'] == PK.FAKTOR, f"berkas lokal memakai faktor {P['faktor']}, mesin {PK.FAKTOR}: bangun ulang penuh"
    ip = P['hari'].index('2026-10-23')
    beda = [(k, m, PK.bul(o[m][-1]), P['prov'][k][m][ip]) for k, o in a['prov'].items() if k in P['prov']
            for m in ('luas', 'belum', 'padam') if abs(PK.bul(o[m][-1]) - (P['prov'][k][m][ip] or 0)) > 1]
    assert not beda, f'luas/belum/padam beda dengan berkas website: {beda[:8]}'
    hm = [(k, o['hot'][-1], a['hot_mandiri'][k][-1]) for k, o in a['prov'].items() if o['hot'][-1] != a['hot_mandiri'][k][-1]]
    assert not hm, f'hot (lokasi unik) beda dengan hitungan mandiri titik_unik: {hm[:8]}'
    assert all(a['hot_mandiri'][k][-1] <= a['hot_mentah'][k][-1] for k in a['hot_mandiri']), 'lokasi unik > deteksi mentah'
    nu, nm = sum(v[-1] for v in a['hot_mandiri'].values()), sum(v[-1] for v in a['hot_mentah'].values())
    assert nu < nm, f'lokasi unik nasional {nu} harus lebih kecil dari deteksi mentah {nm}'
    hp = [(k, o['hot'][-1], P['prov'][k]['hot'][ip]) for k, o in a['prov'].items() if k in P['prov'] and o['hot'][-1] != P['prov'][k]['hot'][ip]]
    assert not hp, f'hot beda dengan peta_karhutla.json lokal: {hp[:8]}'
    print(f'uji lolos: 23 Okt sama dengan berkas website lokal untuk {len(a["prov"])} provinsi; hot = lokasi unik mandiri {nu} dari {nm} deteksi mentah')


if __name__ == '__main__':
    arg = sys.argv[1:]
    if '--uji' in arg:
        uji()
    else:
        nilai = lambda o, b: arg[arg.index(o) + 1] if o in arg else b
        a = hitung(dt.date.fromisoformat(nilai('--tanggal', '')), nilai('--jam', '17:00'), int(nilai('--hari', '4')))
        json.dump(a, open(nilai('--keluar', 'angka_satelit.json'), 'w'), ensure_ascii=False)
        print('ok', a['cutoff'], 'nasional hot', sum(o['hot'][-1] for o in a['prov'].values()),
              'luas', PK.bul(sum(o['luas'][-1] for o in a['prov'].values())), 'belum', PK.bul(sum(o['belum'][-1] for o in a['prov'].values())))
