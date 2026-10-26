"""Angka Paparan Karhutla Provinsi Jambi (format paparan Lampung 241026). Pakai: python3 data.py 2026-10-25T06:00

Hari penuh yang sudah ada di situs (peta_karhutla*.json, harian30.json) diambil dari situs. Hari sesudahnya, termasuk hari cut-off
yang belum lengkap, dihitung dari FIRMS 7 hari publik dengan metode situs (sama dengan satelit-2026-10-24/hitung_nasional.py):
hot = MODIS + VIIRS S-NPP + NOAA-20 semua keyakinan; luas = titik NOAA-20/21 n/h x porsi x 4,3 ha; belum = luas x bagian titik yang
lokasinya sudah terdeteksi 12-36 jam sebelumnya; padam = luas d-2 x bagian titik yang 48 jam tidak terdeteksi lagi.
Kawasan Berbak = TN Berbak + Tahura Orang Kayo Hitam (poligon public/data/lahan/kawasan.geojson no. 1229 dan 1232); seluruh deret
kawasan dihitung dari FIRMS karena situs tidak punya rekap per kawasan. Keluaran data.json."""
import csv, glob, json, math, os, sys
import datetime as dt
from collections import Counter, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
sys.path.insert(0, ROOT + '/scripts/data')
from wilayah import Wilayah  # noqa: E402

CUT = dt.datetime.fromisoformat(sys.argv[1] if len(sys.argv) > 1 else '2026-10-25T06:00')
HARI_D = CUT.date() if CUT.time() != dt.time(0) else CUT.date() - dt.timedelta(days=1)   # hari terakhir di paparan
SEMENTARA = CUT.time() != dt.time(0)
# hari cut-off tanpa satu pun deteksi FIRMS (lintasan malam belum masuk): hari utama = hari penuh sebelumnya
def _ada_hari_cut():   # tanggal FIRMS UTC: hari WIB = acq + 7 jam (lintasan 01.00 WIB tercatat 18.00 UTC hari sebelumnya)
    for fn in glob.glob('sumber/firms/*.csv'):
        for r in csv.DictReader(open(fn)):
            w = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + dt.timedelta(hours=7)
            if w.date() == CUT.date() and w < CUT: return True
    return False
if SEMENTARA and not _ada_hari_cut():
    HARI_D = CUT.date() - dt.timedelta(days=1); SEMENTARA = False; print('hari cut-off belum punya data FIRMS; hari utama', HARI_D)
D8 = [HARI_D - dt.timedelta(days=7 - n) for n in range(8)]
iso = lambda d: d.isoformat()
WEB = 'sumber/web/'; J = lambda f: json.load(open(WEB + f))
H, P, K, WL = J('harian30.json'), J('peta_karhutla.json'), J('peta_karhutla_kab.json'), J('peta_karhutla_wil.json')
KL, OP, KD, KU, UD = J('kluster.json')['features'], J('operasi.json'), J('kendala.json'), J('kumulatif.json'), J('udara_kualitas.json')
PORSI = P['porsi']; HAPX = PORSI * 4.3
W = Wilayah()

# ---------------------------------------------------------------- poligon kawasan
KAW = json.load(open(ROOT + '/public/data/lahan/kawasan.geojson'))['features']
def cincin(g): return [p[0] for p in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates'])]
TN, THR = cincin(KAW[1229]['geometry']), cincin(KAW[1232]['geometry'])
assert KAW[1229]['properties']['nama'] == 'Taman Nasional' and KAW[1232]['properties']['nama'] == 'Taman Hutan Raya'
def dalam(x, y, ring):
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c
def kaw_of(x, y):
    if any(dalam(x, y, r) for r in TN): return 'tn'
    if any(dalam(x, y, r) for r in THR): return 'thr'
    return None
GAMBUT = json.load(open(ROOT + '/public/data/lahan/gambut.geojson'))['features']
GB = [r for f in GAMBUT for r in cincin(f['geometry']) if 101 < r[0][0] < 105 and -3 < r[0][1] < 0]   # cincin gambut sekitar Jambi
GBX = [(min(p[0] for p in r), min(p[1] for p in r), max(p[0] for p in r), max(p[1] for p in r)) for r in GB]
def di_gambut(x, y): return any(b[0] <= x <= b[2] and b[1] <= y <= b[3] and dalam(x, y, r) for r, b in zip(GB, GBX))

# ---------------------------------------------------------------- FIRMS 7 hari -> angka per unit dan hari
G = 0.003375
C = {'nominal': 'n', 'high': 'h', 'low': 'l'}
hot = Counter(); det = defaultdict(list); celhari = defaultdict(set); n20 = defaultdict(list)
titik = []   # titik semua satelit di Jambi: lon, lat, waktu, kab, kec, kawasan
for fn in sorted(glob.glob('sumber/firms/*.csv')):
    for r in csv.DictReader(open(fn)):
        w = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + dt.timedelta(hours=7)
        if w >= CUT: continue
        x, y = float(r['longitude']), float(r['latitude']); s = r['satellite']; d = iso(w.date())
        s = {'T': 'Terra', 'A': 'Aqua', '1': 'N20'}.get(s, s); cf = C.get(r['confidence'], r['confidence'])
        idn = W.cari(x, y) if 101 < x < 105 and -3 < y < 0 else None
        units = []
        if idn and idn[0] == '15':
            units = ['15', '15|' + idn[1], '15|' + idn[1] + '|' + idn[2]]
            kw = kaw_of(x, y)
            if kw: units += ['kaw', 'kaw|' + kw, 'kaw|' + idn[1] + '|' + idn[2]]
        if s in ('N', 'N20', 'Terra', 'Aqua'):
            for u in units: hot[(u, d)] += 1
            if units: titik.append([round(x, 4), round(y, 4), w.isoformat(timespec='minutes'), idn[1], idn[2], kaw_of(x, y)])
        if s not in ('N20', 'N21') or cf not in ('n', 'h'): continue
        c = (round(x / G), round(y / G)); det[c].append(w); celhari[d].add(c)
        for u in units: n20[(u, d)].append((c, w))
NB = [(i, j) for i in (-1, 0, 1) for j in (-1, 0, 1)]
def bertahan(c, w): return any(w - dt.timedelta(hours=36) <= t <= w - dt.timedelta(hours=12) for i, j in NB for t in det.get((c[0] + i, c[1] + j), ()))
def firms(u, d):
    d = d if isinstance(d, str) else iso(d)
    dd = dt.date.fromisoformat(d); p, p2 = iso(dd - dt.timedelta(days=1)), iso(dd - dt.timedelta(days=2))
    L, Lp = n20[(u, d)], n20[(u, p2)]; sepi = celhari[p] | celhari[d]
    luas = len(L) * HAPX
    return {'hot': hot[(u, d)], 'luas': luas, 'belum': luas * (sum(1 for c, w in L if bertahan(c, w)) / len(L) if L else 0),
            'padam': len(Lp) * HAPX * (sum(1 for c, w in Lp if not any((c[0] + i, c[1] + j) in sepi for i, j in NB)) / len(Lp) if Lp else 0)}
F0 = min(dt.date.fromisoformat(t[2][:10]) for t in titik)   # hari pertama berkas 7 hari (belum/padam hari awal tidak lengkap)

# ---------------------------------------------------------------- situs (hari penuh) + FIRMS (sesudahnya)
SH = set(P['hari'])   # hari luas/belum/padam di situs
HH = set(H['hari'][:-1]) if H['hari'][-1] >= iso(HARI_D) else set(H['hari'])   # hari titik lengkap di situs
def deret(u):
    o = {m: [] for m in ('hot', 'luas', 'belum', 'padam')}; src = []
    lvl = u.count('|')
    if lvl == 2: wd = wil(u)
    for d in D8:
        f = firms(u, d)
        if iso(d) in SH:
            if lvl == 0: p = P['prov'][u]; i = P['hari'].index(iso(d)); v = {m: p[m][i] or 0 for m in ('luas', 'belum', 'padam')}
            elif lvl == 1: i = P['hari'].index(iso(d)); v = {m: kabd(u).get(i, (0, 0, 0))[j] for j, m in enumerate(('luas', 'belum', 'padam'))}
            else: v = {m: wd.get(d, {}).get(m, 0) for m in ('luas', 'belum', 'padam')}
            s = 'situs'
        else: v = {m: f[m] for m in ('luas', 'belum', 'padam')}; s = 'firms'
        if iso(d) in HH and iso(d) in H['hari']:
            if lvl == 0: h = H['prov'][u][H['hari'].index(iso(d))]
            elif lvl == 1: h = H['kab'].get(u, [0] * len(H['hari']))[H['hari'].index(iso(d))]
            else: h = wd.get(d, {}).get('hot', 0)
        else: h = f['hot']
        o['hot'].append(h); [o[m].append(v[m]) for m in ('luas', 'belum', 'padam')]; src.append(s)
    o['src'] = src
    return o
def kabd(u):
    e = K['kab'].get(u, {'d': []})['d']
    return {r[0]: (r[1], r[2], 0) for r in e}
H0 = dt.date.fromisoformat(WL['hari0'])
def wil(u):
    f = WL['d'].get(u, []); o = {}
    for n in range(0, len(f), 5):
        x, h, l, b, pd = f[n:n + 5]; o[H0 + dt.timedelta(days=x)] = {'hot': h, 'luas': l, 'belum': b, 'padam': pd}
    return o

# uji: FIRMS = situs di hari yang tumpang tindih (sesudah 2 hari pertama berkas 7 hari)
uji = []
for d in sorted(SH):
    dd = dt.date.fromisoformat(d)
    if dd < F0 + dt.timedelta(days=2) or dd > HARI_D: continue
    f = firms('15', d); i = P['hari'].index(d); p = P['prov']['15']
    uji.append((d, round(f['luas']), p['luas'][i], round(f['belum']), p['belum'][i], f['hot'], H['prov']['15'][H['hari'].index(d)]))
print('uji FIRMS vs situs (hari, luas f/s, belum f/s, hot f/s):', uji)

PV = deret('15')
KABS = sorted({f['properties']['kab'] for f in json.load(open(ROOT + '/public/geo/kabupaten/15.json'))['features']} | {k[3:] for k in H['kab'] if k.startswith('15|')})
KECF = json.load(open(ROOT + '/public/geo/kecamatan/15.json'))['features']
KAB = {k: deret('15|' + k) for k in KABS}
KEC = {}
for f in KECF:
    u = '15|' + f['properties']['kab'] + '|' + f['properties']['kec']; s = deret(u)
    if sum(s['hot']) or sum(s['luas']): KEC[u[3:]] = s
KAWD = {k: {m: [firms(u, d)[m] for d in D8] for m in ('hot', 'luas', 'belum', 'padam')} for k, u in (('all', 'kaw'), ('tn', 'kaw|tn'), ('thr', 'kaw|thr'))}
KAWK = {}
for f in KECF:
    u = f['properties']['kab'] + '|' + f['properties']['kec']; v = [firms('kaw|' + u, d)['hot'] for d in D8]
    if sum(v): KAWK[u] = {m: [firms('kaw|' + u, d)[m] for d in D8] for m in ('hot', 'luas', 'belum')}

# ---------------------------------------------------------------- kompleks api (kluster.json), 7 hari terakhir
NAMA_LV = ['Rutin', 'Patroli', 'Siaga', 'Prioritas']
A7 = iso(HARI_D - dt.timedelta(days=6))
def ring(f):
    p = f['properties']; tg = p.get('tanggung') or []
    return {'id': p['id'], 'kab': p['kab'], 'kec': p['kec'], 'level': p['level'], 'n': p['n'], 'n24': p.get('n24') or 0, 'luas': p['luas'],
            'awal': (p.get('awal') or '')[:10], 'akhir': (p.get('akhir') or '')[:10], 'lon': p['lon'], 'lat': p['lat'], 'pj': tg[1] if len(tg) > 1 else '',
            'pihak': tg[0] if tg else '', 'gambut': p.get('gambut'), 'daops': p.get('daops'), 'jarak': p.get('jarak_daops'), 'kaw': kaw_of(p['lon'], p['lat']),
            'fwi': p.get('fwi'), 'dc': p.get('dc'), 'isi': p.get('isi'), 'ws': p.get('ws'), 'rh': p.get('rh'), 't': p.get('t')}
JK = [ring(f) for f in KL if f['properties']['prov'] == '15' and (f['properties'].get('jam_sejak') or 0) <= 168]   # level 0-1 tidak punya awal/akhir
JK.sort(key=lambda r: (-r['level'], -r['luas']))
nlv = {NAMA_LV[l]: sum(1 for r in JK if r['level'] == l) for l in range(4)}
k7 = Counter(r['kab'] for r in JK)

# ---------------------------------------------------------------- peta 1: titik 24 jam s.d. cut-off; peta 3: titik 8 hari sekitar kawasan
t24 = [t for t in titik if dt.datetime.fromisoformat(t[2]) >= CUT - dt.timedelta(hours=24)] if HARI_D == CUT.date() else [t for t in titik if t[2][:10] == iso(HARI_D)]
kec24 = Counter((t[4], t[3]) for t in t24)
BB3 = (103.88, -1.74, 104.58, -1.13)   # zoom peta 3 (rasio panel 1,15)
pts3 = [[t[0], t[1], t[2][:10], t[5]] for t in titik if BB3[0] <= t[0] <= BB3[2] and BB3[1] <= t[1] <= BB3[3] and t[2][:10] >= iso(D8[0])]
tD = [t for t in titik if t[2][:10] == iso(HARI_D)]
gamb = sum(1 for t in tD if di_gambut(t[0], t[1]))

# ---------------------------------------------------------------- operasi: kebutuhan kompleks di kawasan, target 3 hari
KF = OP['koef']; kf = lambda n, s: KF[n][('lo', 'mid', 'hi')[s]]
import operasi as OPR   # rumus kebutuhan asli aplikasi, koefisien diselaraskan dengan operasi.json situs
for _k, _v in KF.items():
    if _k in OPR.KOEF: OPR.KOEF[_k].update({x: _v[x] for x in ('lo', 'mid', 'hi')})
def total(kom, T=3, s=1):
    t = OPR.total(kom, T, s); t['bara'] = math.ceil(sum(c['bara'][s] for c in kom) - 1e-9); t['air_l'] = round(t['bara'] * kf('air_bara', s))
    return t
OPK = [c for c in OP['kompleks'] if c['prov'] == '15' and kaw_of(c['lon'], c['lat'])]
OPK.sort(key=lambda c: -c['luas'])
butuh = [total(OPK, 3, s) for s in range(3)]
kend = {c['id']: KD['kompleks'].get(c['id']) for c in OPK}
ih = UD['hari'].index(iso(CUT.date())) if iso(CUT.date()) in UD['hari'] else 0   # PM2.5 CAMS harian (belum divalidasi): rata-rata provinsi + kab terburuk
pm = {'hari': UD['hari'][ih], 'prov': UD['prov']['15'][ih], 'kolom': UD['kolom_prov'], 'kab': [r for r in UD['kab'][ih] if r[0] == '15'], 'batas': UD['batas']}

out = {'cut': CUT.isoformat(timespec='minutes'), 'hari': iso(HARI_D), 'sementara': SEMENTARA, 'D8': [iso(d) for d in D8], 'uji': uji,
       'dibuat': {'harian30': H['dibuat'], 'peta': P['dibuat'], 'operasi': OP['dibuat']},
       'prov': PV, 'kab': KAB, 'kec': KEC, 'kaw': KAWD, 'kawk': KAWK, 'k7': k7, 'nlv': nlv, 'kompleks': JK[:60],
       'kec24': [[a, b, n] for (a, b), n in kec24.most_common()], 't24': [[t[0], t[1]] for t in t24], 'n24': len(t24),
       'pts3': pts3, 'gambut': [gamb, len(tD)], 'op_prov': OP['prov']['15'], 'op_kaw': OPK, 'butuh': butuh, 'kendala': kend,
       'kumulatif': {'kalimat': next((v.get('kalimat_rerata') for k, v in KU.items() if isinstance(v, dict) and k == '15' and v.get('kalimat_rerata')), None)},
       'luas_tahun': sum(v or 0 for v in P['prov']['15']['luas']), 'luas_tahun_sd': P['hari'][-1], 'pm': pm, 'koef': {n: KF[n] for n in ('air_bara', 'selang_pompa', 'ha_per_bor', 'orang_regu')}}
json.dump(out, open('data.json', 'w'), ensure_ascii=False, default=list)
print('cut', CUT, 'hari', HARI_D, 'sementara', SEMENTARA, 'F0', F0)
print('prov', {m: [round(v) for v in PV[m]] for m in ('hot', 'luas', 'belum')}, PV['src'])
for k in sorted(KAB, key=lambda k: -KAB[k]['hot'][-1])[:6]: print(' kab', k, KAB[k]['hot'], [round(v) for v in KAB[k]['luas']])
print('kaw', {k: {m: [round(x) for x in v[m]] for m in ('hot', 'luas', 'belum')} for k, v in KAWD.items()})
print('kawk', {k: v['hot'] for k, v in sorted(KAWK.items(), key=lambda kv: -sum(kv[1]['hot']))[:6]})
print('nlv', nlv, 'k7', k7.most_common(4), 'n24', len(t24), kec24.most_common(4), 'gambut', gamb, len(tD), 'pts3', len(pts3))
print('opk', [(c['id'], c['kab'], c['kec'], round(c['luas'])) for c in OPK][:8], 'butuh', butuh)
