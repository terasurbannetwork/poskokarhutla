"""Deck Penanganan 291026 dua versi dari salinan website 17.29 WIB (../web/, sama dengan deck utama; pemilik 29 Okt malam: "generate kedua
versi", "intinya gunakan 282 dan 153" = luas dan belum padam Papua Selatan 29 Okt s.d. saat ini).
Luas terbakar dan belum padam selalu dari hari api yang sama (pemilik: "hari yang sama biar pasti"):
    python3 jalan.py utuh   -> luas, belum padam, padam = hari utuh website (28 Okt), dilabeli tanggal cut-off 00.00 (kolom 29 Okt)
    python3 jalan.py kini   -> kolom 27/28 Okt = hari itu sendiri (website); kolom 29 Okt = s.d. data terakhir:
                               belum padam = belum_kini.json website; luas dan padam = hitungan sendiri dari hotspot.json website
                               (rumus peta_karhutla: titik NOAA-20/21 nominal/tinggi x 4,12 / 4,16 ha, dibagi 2; padam = titik 27 Okt
                               yang sel 3x3-nya tanpa deteksi 28-29 Okt). Uji hari terbit: luas 27 Okt 5.771 vs website 5.769 ha,
                               padam 28 Okt 7.069 vs 7.244 ha. Website belum menerbitkan luas 29 Okt (hari belum utuh).
                               Titik NOAA-20/21 29 Okt di salinan 17.29 = website 20.41 (tak ada lintasan NOAA di antaranya).
Hotspot, firespot, PM2,5, slide operasi sama dengan ../jalan.py. Cut-off 17.00."""
import csv, datetime as dt, io, json, os, sys
from collections import Counter
VERSI = sys.argv[1]
assert VERSI in ('utuh', 'kini'), 'pakai: python3 jalan.py utuh|kini'
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', '..', 'generator')); sys.path.insert(0, G); os.chdir(G)
import satelit, penanganan, cuaca_riwayat, types
D = dt.date(2026, 10, 29)


class _Hari(dt.date):   # cuaca tarikan 29 Okt (cache/cuaca/*-2026-10-29.json), sama dengan deck utama; kunci cache = tanggal hari jalan
    @classmethod
    def today(cls): return D


cuaca_riwayat.dt = types.SimpleNamespace(date=_Hari, timedelta=dt.timedelta)
UTC_WEB = {'2026-10-28', '2026-10-29'}


WEB = os.path.join(S, '..', 'web')
web = lambda f: json.load(open(os.path.join(WEB, f.replace('/', '-'))))


P, H, HS, KL, KINI = web('peta_karhutla.json'), web('harian30.json'), web('hotspot.json'), web('kluster.json'), web('belum_kini.json')
KH = {d: web(f'kluster_hari/{d}.json')['w'] for d in ('2026-10-26', '2026-10-27', '2026-10-28')}
JAM = '17:00'
assert KINI['hari'] == D.isoformat() and P['hari'][-1] == '2026-10-28', (KINI['hari'], P['hari'][-1])
print('website: harian30', H['dibuat'], '| peta_karhutla', P['dibuat'], 's.d.', P['hari'][-1], '| hotspot.json titik terakhir', HS['acuan'], '| belum_kini', KINI['dibuat'])

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


# luas dan padam 29 Okt s.d. data terakhir (versi kini): rumus peta_karhutla.py atas baris NOAA-20/21 n/h hotspot.json (semua baris, termasuk
# hitung=0: sel yang hotspot-nya tercatat satelit lain tetap titik NOAA bagi luas)
SISI, F = 0.003375, {'N20': 4.12, 'N21': 4.16}
DET = {}
for lat, lon, jam, sen, frp, yak, wil, tgl, hit in HS['baris']:
    if sen in F and yak >= 1:
        DET.setdefault(tgl, []).append((HS['wilayah'][wil].split('|')[0], sen, (round(lon / SISI), round(lat / SISI))))


def luas_sendiri(rows):
    c = Counter((p, s) for p, s, _ in rows)
    return {p: round(sum(c[(p, s)] * f for s, f in F.items()) / 2) for p in {p for p, _ in c}}


ada = {c for t in ('10-28', '10-29') for _, _, c in DET[t]}
LUAS29 = luas_sendiri(DET['10-29'])
PADAM29 = luas_sendiri([r for r in DET['10-27'] if not any((r[2][0] + i, r[2][1] + j) in ada for i in (-1, 0, 1) for j in (-1, 0, 1))])

satelit.csv_hari = csv_hari
satelit.kunci_firms = lambda k=None: 'cache'
asli = satelit.hitung


def hitung_web(t, jam, n, kunci=None):
    a = asli(t, jam, n, kunci)
    for i, d in enumerate(a['hari']):
        if d in H['hari']:
            for k, o in a['prov'].items(): o['hot'][i] = H['prov'].get(k, [0] * len(H['hari']))[H['hari'].index(d)]
    nol = {m: [0] * len(P['hari']) for m in ('luas', 'belum', 'padam')}
    for k, o in a['prov'].items():
        pk = P['prov'].get(k) or nol
        for i, d in enumerate(a['hari']):
            if VERSI == 'utuh':   # hari utuh d-1, dilabeli d (luas_00)
                j = P['hari'].index((dt.date.fromisoformat(d) - dt.timedelta(days=1)).isoformat())
                for m in ('luas', 'belum', 'padam'): o[m][i] = pk[m][j] or 0
            elif d == D.isoformat():
                o['luas'][i], o['belum'][i], o['padam'][i] = LUAS29.get(k, 0), KINI['prov'].get(k, 0), PADAM29.get(k, 0)
            else:
                for m in ('luas', 'belum', 'padam'): o[m][i] = pk[m][P['hari'].index(d)] or 0
    return a


asli_fs = penanganan.firespot_hari.seri


def firespot_web(hari_akhir, n, jam='17:00', kunci=None):
    fs, hari = asli_fs(hari_akhir, n, jam, kunci)
    kini = Counter()
    for f in KL['features']:
        for k, v in (f['properties'].get('fs_ini') or {}).items(): kini[k.split('|')[0]] += v
    for k in set(fs) | set(kini) | {k for w in KH.values() for k in w if '|' not in k}:
        baris = fs.setdefault(k, [0] * n)
        for i, d in enumerate(hari):
            w = kini.get(k, 0) if d == H['hari_ini'] else (KH[d].get(k) or [0] * 5)[4] if d in KH else None
            if w is not None: baris[i] = w
    return fs, hari


import pil_sendiri
pil_sendiri.RIWAYAT = os.path.join(WEB, 'udara-riwayat.json')
wa = penanganan.wa_operasi
asli_op = wa.operasi


def operasi_web(teks):
    op, o28 = asli_op(teks), asli_op(open(os.path.join(S, '..', '..', 'satelit-2026-10-28', 'wa-satgas.txt')).read())
    assert op['armada'] == o28['armada'], (op['armada'], o28['armada'])
    return {**op, 'pemilik': o28['pemilik'], 'tanggal_armada': op['tanggal_laporan']}


wa.operasi = operasi_web
satelit.hitung = hitung_web
penanganan.satelit = satelit
penanganan.firespot_hari.seri = firespot_web
try:
    penanganan.bangun(D, JAM, None, S, os.path.join(S, '..', 'wa-satgas.txt'), ha_utuh=True, belum_kini=False, luas_00=True)
except FileNotFoundError as e:   # soffice tak terpasang di mesin ini: PDF diekspor lewat PowerPoint
    assert 'soffice' in str(e), e
kerja = os.path.join(G, 'cache', f'penanganan-{D:%d%m%y}')
nama = f'Laporan Penanganan Pengendalian Karhutla {D:%d%m%y} - ' + ('hari utuh 28 Okt' if VERSI == 'utuh' else f's.d. {JAM.replace(":", ".")} WIB')
open(os.path.join(S, nama + '.pptx'), 'wb').write(open(os.path.join(kerja, f'Laporan Penanganan Pengendalian Karhutla {D:%d%m%y}.pptx'), 'rb').read())
open(os.path.join(S, f'angka-{VERSI}.json'), 'w').write(open(os.path.join(kerja, 'angka.json')).read())
print('ok', nama)
