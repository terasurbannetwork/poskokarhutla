"""Laporan Penanganan Pengendalian Karhutla 301026, cut-off 17.00 WIB, dari salinan website 18.07 WIB (web/; titik.yml 17.30, lintasan
terakhir 14.56 WIB). Cara sama dengan ../satelit-2026-10-29/dua-versi/jalan.py. Luas terbakar dan belum padam selalu dari hari api yang sama
(pemilik 29 Okt: "hari yang sama biar pasti"):
    python3 jalan.py utuh   -> luas, belum padam, padam = hari utuh website (29 Okt), dilabeli tanggal cut-off 00.00 (kolom 30 Okt)
    python3 jalan.py kini   -> kolom 28/29 Okt = hari itu sendiri (website); kolom 30 Okt = s.d. data terakhir: belum padam =
                               belum_kini.json website; luas dan padam = hitungan sendiri dari hotspot.json website (rumus peta_karhutla)
Hotspot: harian30.json; firespot: kluster.json (hari ini) dan kluster_hari/<hari>.json kolom 4; pil PM2,5: riwayat udara website;
slide operasi: wa-satgas.txt (argumen ke-2 untuk teks lain)."""
import csv, datetime as dt, io, json, os, sys
from collections import Counter
VERSI = sys.argv[1]
assert VERSI in ('utuh', 'kini'), 'pakai: python3 jalan.py utuh|kini [wa.txt]'
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', 'generator')); sys.path.insert(0, G); os.chdir(G)
WA = os.path.abspath(os.path.join(S, sys.argv[2] if len(sys.argv) > 2 else 'wa-satgas.txt'))
import satelit, penanganan
D, JAM = dt.date(2026, 10, 30), '17:00'
UTC_WEB = {'2026-10-29', '2026-10-30'}   # cache/raw ditarik 29 Okt 11.01 WIB: UTC 29 Okt belum lengkap
web = lambda f: json.load(open(os.path.join(S, 'web', f.replace('/', '-'))))
P, H, HS, KL, KINI = web('peta_karhutla.json'), web('harian30.json'), web('hotspot.json'), web('kluster.json'), web('belum_kini.json')
KH = {d: web(f'kluster_hari/{d}.json')['w'] for d in ('2026-10-27', '2026-10-28', '2026-10-29')}
assert KINI['hari'] == D.isoformat() and P['hari'][-1] == '2026-10-29' and H['hari_ini'] == D.isoformat(), (KINI['hari'], P['hari'][-1])
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


# luas dan padam s.d. data terakhir: rumus peta_karhutla.py atas baris NOAA-20/21 n/h hotspot.json (semua baris, termasuk hitung=0)
SISI, F = 0.003375, {'N20': 4.12, 'N21': 4.16}
DET = {}
for lat, lon, jam, sen, frp, yak, wil, tgl, hit in HS['baris']:
    if sen in F and yak >= 1:
        DET.setdefault(tgl, []).append((HS['wilayah'][wil].split('|')[0], sen, (round(lon / SISI), round(lat / SISI))))


def luas_sendiri(rows):
    c = Counter((p, s) for p, s, _ in rows)
    return {p: round(sum(c[(p, s)] * f for s, f in F.items()) / 2) for p in {p for p, _ in c}}


def padam_sendiri(hari, kemudian):
    ada = {c for t in kemudian for _, _, c in DET[t]}
    return luas_sendiri([r for r in DET[hari] if not any((r[2][0] + i, r[2][1] + j) in ada for i in (-1, 0, 1) for j in (-1, 0, 1))])


LUAS_KINI, PADAM_KINI = luas_sendiri(DET['10-30']), padam_sendiri('10-28', ('10-29', '10-30'))
# uji rumus pada hari yang sudah terbit (29 Okt): hitungan sendiri vs peta_karhutla.json
j = P['hari'].index('2026-10-29')
for m, a in (('luas', luas_sendiri(DET['10-29'])), ('padam', padam_sendiri('10-27', ('10-28', '10-29')))):
    print(f'uji {m} 29 Okt: sendiri {sum(a.values()):,} vs website {sum((o[m][j] or 0) for o in P["prov"].values()):,} ha')

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
                jj = P['hari'].index((dt.date.fromisoformat(d) - dt.timedelta(days=1)).isoformat())
                for m in ('luas', 'belum', 'padam'): o[m][i] = pk[m][jj] or 0
            elif d == D.isoformat():
                o['luas'][i], o['belum'][i], o['padam'][i] = LUAS_KINI.get(k, 0), KINI['prov'].get(k, 0), PADAM_KINI.get(k, 0)
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
pil_sendiri.RIWAYAT = os.path.join(S, 'web', 'udara-riwayat.json')
wa = penanganan.wa_operasi
asli_op = wa.operasi


def operasi_web(teks):
    """WA 30 Okt tanpa rekap gelar: baris PEMILIK dari rekap instansi 28 Okt (pemilik 29 Okt: "ikuti data kemarin kalau ada"), dikurangi
    satu-satunya beda yang mengubah instansi: patroli/OMC Jawa Timur 1 -> 0 = PK-SCH, OMC BNPB (rekap 28 Okt "JAWA TIMUR: A. BNPB 1 Unit OMC").
    Kalsel 9 -> 8 dan Kalteng 2 -> 3 patroli/OMC = satu unit pindah, instansinya tetap. Pil ARMADA UDARA bertanggal laporan WA."""
    op = asli_op(teks)
    if op['pemilik']:
        return op
    o28 = asli_op(open(os.path.join(S, '..', 'satelit-2026-10-28', 'wa-satgas.txt')).read())
    beda = {k: (o28['armada'].get(k), op['armada'].get(k)) for k in set(op['armada']) | set(o28['armada']) if op['armada'].get(k) != o28['armada'].get(k)}
    assert beda == {'Jawa Timur': ([1, 1], [0, 1]), 'Kalimantan Selatan': ([9, 5], [8, 5]), 'Kalimantan Tengah': ([2, 8], [3, 8])}, beda
    pemilik = {**o28['pemilik'], 'BNPB': o28['pemilik']['BNPB'] - 1}
    assert sum(pemilik.values()) == sum(map(sum, op['armada'].values())), pemilik
    return {**op, 'pemilik': pemilik, 'tanggal_armada': op['tanggal_laporan']}


wa.operasi = operasi_web
satelit.hitung = hitung_web
penanganan.satelit = satelit
penanganan.firespot_hari.seri = firespot_web
try:
    penanganan.bangun(D, JAM, None, S, WA, ha_utuh=True, belum_kini=False, luas_00=True)
except FileNotFoundError as e:   # soffice tak terpasang di mesin ini: PDF diekspor lewat PowerPoint
    assert 'soffice' in str(e), e
kerja = os.path.join(G, 'cache', f'penanganan-{D:%d%m%y}')
nama = f'Laporan Penanganan Pengendalian Karhutla {D:%d%m%y} - ' + ('hari utuh 29 Okt' if VERSI == 'utuh' else f's.d. {JAM.replace(":", ".")} WIB')
open(os.path.join(S, nama + '.pptx'), 'wb').write(open(os.path.join(kerja, f'Laporan Penanganan Pengendalian Karhutla {D:%d%m%y}.pptx'), 'rb').read())
open(os.path.join(S, f'angka-{VERSI}.json'), 'w').write(open(os.path.join(kerja, 'angka.json')).read())
print('ok', nama)
