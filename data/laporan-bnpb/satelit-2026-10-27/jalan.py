"""Laporan Penanganan Pengendalian Karhutla 271026, cut-off 15.00 WIB (pemilik 27 Okt: "cutoff seolah2 jam 15.00").
Pemilik: "data harus sama dengan website, bila beda dengan WA/PDF ambil website". Tanpa FIRMS_MAP_KEY; semua angka dari berkas website
tayang (unduh ulang tiap jalan, simpan di web/):
- hotspot: harian30.json (hari ini) dan peta_karhutla.json (hari yang sudah terbit);
- luas terbakar, belum padam, padam: peta_karhutla.json, hari utuh terakhir 26 Okt seperti tab Belum padam website (pemilik 27 Okt);
  kolomnya 24, 25, 26 Okt (penanganan.bangun ha_utuh). Titik hari UTC 26 dan 27 Okt dibangun ulang dari hotspot.json (bentuk CSV FIRMS)
  hanya untuk menguji hotspot hitungan sendiri terhadap harian30.json;
- firespot: kluster.json (hari ini, jumlah fs_ini per provinsi = kolom FS Real Time) dan kluster_hari/<hari>.json kolom 4 (hari lampau).
Selisih hitungan sendiri vs website dicetak, lalu angka website yang dipakai."""
import csv, datetime as dt, io, json, os, sys, urllib.error, urllib.request
from collections import Counter
G = '/Users/hhizari/WebProjects/poskokarhutla/data/laporan-bnpb/generator'; sys.path.insert(0, G); os.chdir(G)
import satelit, penanganan
S = os.path.dirname(os.path.abspath(__file__))
D, JAM = dt.date(2026, 10, 27), '15:00'
UTC_WEB = {'2026-10-26', '2026-10-27'}   # hari UTC yang di cache/raw belum lengkap (ditarik 27 Okt 08.34 WIB)


def web(f):
    p = os.path.join(S, 'web', f.replace('/', '-'))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write(urllib.request.urlopen(urllib.request.Request(f'https://centurisk97.id/data/{f}', headers={'User-Agent': 'Mozilla/5.0'}), timeout=300).read())
    return json.load(open(p))


P, H, HS, KL = web('peta_karhutla.json'), web('harian30.json'), web('hotspot.json'), web('kluster.json')
KH = {d: web(f'kluster_hari/{d}.json')['w'] for d in ('2026-10-24', '2026-10-25', '2026-10-26')}
try:   # belum padam hari ini, ada sesudah lintasan siang NOAA masuk (titik.yml sesudah 16.30 WIB); pemilik 27 Okt: deck ikut begitu tayang
    KINI = web('belum_kini.json')
except urllib.error.HTTPError:
    KINI = None
KINI = KINI if KINI and KINI['hari'] == D.isoformat() and D.isoformat() not in P['hari'] else None
print('website: harian30', H['dibuat'], '| peta_karhutla', P['dibuat'], 's.d.', P['hari'][-1], '| hotspot.json titik terakhir', HS['acuan'],
      '| belum_kini', KINI['dibuat'] if KINI else 'belum ada')

# hotspot.json -> CSV FIRMS per sumber per hari UTC. Kolom: lat, lon, jam (jam relatif acuan), sensor, frp, keyakinan 0/1/2, wilayah, tgl_wib, hitung
SENSOR = {'MODIS_NRT': 'M', 'VIIRS_SNPP_NRT': 'N', 'VIIRS_NOAA20_NRT': 'N20', 'VIIRS_NOAA21_NRT': 'N21'}
ACUAN = dt.datetime.fromisoformat(HS['acuan'])
KOL = ['latitude', 'longitude', 'scan', 'track', 'acq_date', 'acq_time', 'satellite', 'confidence', 'frp', 'daynight']


def csv_web(src, u):
    b = io.StringIO(); w = csv.writer(b); w.writerow(KOL)
    for lat, lon, jam, sen, frp, yak, *_ in HS['baris']:
        t = ACUAN + dt.timedelta(hours=jam)
        if sen != SENSOR[src] or t.date().isoformat() != u: continue
        conf = ('0', '50', '90')[yak] if sen == 'M' else 'lnh'[yak]
        w.writerow([lat, lon, .4, .4, t.date().isoformat(), t.strftime('%H%M'), {'M': 'Aqua', 'N': 'N'}.get(sen, sen), conf, frp, 'D'])
    return b.getvalue()


def csv_hari(src, u, cutoff, kunci):
    if u.isoformat() in UTC_WEB:
        return csv_web(src, u.isoformat())
    f = os.path.join(satelit.CACHE, f'{src}-{u.isoformat()}.csv')
    if not os.path.exists(f):
        sys.exit(f'cache {f} tidak ada')
    return open(f).read()


satelit.csv_hari = csv_hari
satelit.kunci_firms = lambda k=None: 'cache'
asli = satelit.hitung


def hitung_web(t, jam, n, kunci=None):
    a = asli(t, jam, n, kunci)
    beda = []
    for i, d in enumerate(a['hari']):
        for k, o in a['prov'].items():
            if d in P['hari'] and k in P['prov']:
                j = P['hari'].index(d)
                for m in ('hot', 'luas', 'belum', 'padam'):
                    w = P['prov'][k][m][j] or 0
                    if round(o[m][i]) != round(w): beda.append((d, k, m, round(o[m][i]), w))
                    o[m][i] = w
            elif d == H['hari_ini']:
                w = H['prov'].get(k, [0])[-1]
                if o['hot'][i] != w: beda.append((d, k, 'hot', o['hot'][i], w))
                o['hot'][i] = w
    print('selisih hitungan sendiri vs website (hari, prov, metrik, sendiri, website):', beda or 'tidak ada')
    # pemilik 27 Okt: luas & belum padam = hari utuh terakhir website (tab Belum padam "KEMARIN, SEN 26 OKT"): indeks i = hari[i] - 1
    for k, o in a['prov'].items():
        for i, d in enumerate(a['hari']):
            j = P['hari'].index((dt.date.fromisoformat(d) - dt.timedelta(days=1)).isoformat())
            for m in ('luas', 'belum', 'padam'):
                o[m][i] = (P['prov'].get(k) or {m: [0] * len(P['hari'])})[m][j] or 0
            if KINI:   # belum padam tidak digeser: hari laporan dari belum_kini.json, hari lampau dari peta_karhutla.json
                o['belum'][i] = KINI['prov'].get(k, 0) if d == KINI['hari'] else (P['prov'].get(k) or {'belum': [0] * len(P['hari'])})['belum'][P['hari'].index(d)] or 0
    return a


asli_fs = penanganan.firespot_hari.seri


def firespot_web(hari_akhir, n, jam='17:00', kunci=None):
    fs, hari = asli_fs(hari_akhir, n, jam, kunci)
    kini = Counter()
    for f in KL['features']:
        for k, v in (f['properties'].get('fs_ini') or {}).items(): kini[k.split('|')[0]] += v
    beda = []
    for k in set(fs) | set(kini) | {k for w in KH.values() for k in w if '|' not in k}:
        baris = fs.setdefault(k, [0] * n)
        for i, d in enumerate(hari):
            w = kini.get(k, 0) if d == H['hari_ini'] else (KH[d].get(k) or [0] * 5)[4] if d in KH else None
            if w is None: continue
            if baris[i] != w: beda.append((d, k, baris[i], w))
            baris[i] = w
    print('selisih firespot sendiri vs website (hari, prov, sendiri, website):', beda or 'tidak ada')
    return fs, hari


satelit.hitung = hitung_web
penanganan.satelit = satelit
penanganan.firespot_hari.seri = firespot_web
penanganan.bangun(D, JAM, None, S, os.path.join(S, 'wa-satgas.txt'), ha_utuh=True, belum_kini=bool(KINI), luas_00=True)
