"""Angka deck BNPB 211026, versi 3 (setelah verifikasi independen).
- Provinsi: wilayah.Wilayah platform (poligon kecamatan BIG).
- hot  = titik MODIS + VIIRS S-NPP + NOAA-20, semua keyakinan, hari WIB (standar platform / SiPongi).
- luas = titik VIIRS NOAA-20+NOAA-21 n/h x porsi x 4,3 ha. porsi = median nasional (S-NPP n/h / NOAA-20+NOAA-21 n/h)
  16-19 Okt (ide isi_celah() platform; rasio antarhari paling stabil, CV ~13%). S-NPP tidak dipakai langsung karena
  lintasan siangnya 20 Okt hilang di FIRMS. Porsi belum/padam juga dari titik NOAA-20+NOAA-21.
- belum = luas x porsi titik NOAA-20/21 n/h hari d yang di lokasi sama (3x3 sel ~375 m) sudah terdeteksi NOAA-20/21 12-36 jam sebelumnya.
- padam(d) = luas(d-2) x porsi titik NOAA-20/21 n/h hari d-2 yang lokasinya tidak terdeteksi NOAA-20/21 lagi pada hari d-1
  dan d (aturan pemilik 21 Okt 2026: 48 jam tanpa titik = padam).
- fs = jumlah kluster sel NOAA-20/21 yang bertahan (jarak <= 4 sel ~1,5 km). S-NPP tidak dipakai di uji ini.
Nilai disimpan tanpa pembulatan; pembulatan sekali di ganti.py."""
import csv, glob, json, sys
from datetime import datetime, timedelta, date
from collections import defaultdict
sys.path.insert(0, '/Users/hhizari/WebProjects/poskokarhutla/scripts/data')
from wilayah import Wilayah
W = Wilayah()
TGT = sorted(f['properties']['kode'] for f in json.load(open('/Users/hhizari/WebProjects/poskokarhutla/public/geo/provinsi.json'))['features'])
CUT = datetime(2026, 10, 25, 6, 40)  # cut-off 25 Okt 06.40 WIB (FIRMS 7 hari publik ditarik 25 Okt 07.21 WIB; deteksi sesudah 06.40 dibuang)
G = 0.003375
# sel sumber panas tetap (smelter, tambang, kilang, PLTU; tanpa kawah) = titik_palsu.sel_industri(); hanya untuk hotspot, luas/belum tidak disaring
INDUSTRI = {(round(x['lat'] * 100), round(x['lon'] * 100)) for x in json.load(open('titik_palsu.json'))['sumber_statis'] if x['jenis'] != 'kawah'}
hot = defaultdict(int); hot2 = defaultdict(int); nas = defaultdict(lambda: [0, 0])
det = defaultdict(list)          # sel -> waktu deteksi VIIRS n/h (semua satelit)
celhari = defaultdict(set)       # hari -> sel VIIRS n/h
n20 = defaultdict(list)          # (prov, hari) -> (sel, waktu) titik NOAA-20 n/h
pc = defaultdict(list)           # (prov, hari) -> (sel, waktu) titik VIIRS n/h
for fn in sorted(glob.glob('raw2/*.csv')):
    for r in csv.DictReader(open(fn)):
        w = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + timedelta(hours=7)
        if w >= CUT: continue
        x, y = float(r['longitude']), float(r['latitude'])
        s = r['satellite']; d = w.date().isoformat()
        idn = W.cari(x, y); k = idn[0] if idn else None
        if s in ('N', 'N20', 'Terra', 'Aqua'):
            if k in TGT and (round(y * 100), round(x * 100)) not in INDUSTRI: hot[(k, d)] += 1   # sama dengan tab Real Time: titik industri dibuang
        if s not in ('N', 'N20', 'N21') or r['confidence'].lower() not in ('n', 'h'): continue
        c = (round(x / G), round(y / G))
        if s != 'N':  # uji bertahan/padam/FS tanpa S-NPP: lintasan siangnya 20 Okt hilang, jadi hari-hari tidak setara
            det[c].append(w); celhari[d].add(c)
        if idn: nas[d][1 if s == 'N' else 0] += s in ('N', 'N20', 'N21')
        if k in TGT:
            if s != 'N': pc[(k, d)].append((c, w))
            if s in ('N20', 'N21'): n20[(k, d)].append((c, w))
NB = [(i, j) for i in (-1, 0, 1) for j in (-1, 0, 1)]
def bertahan(c, w):
    return any(w - timedelta(hours=36) <= t <= w - timedelta(hours=12) for i, j in NB for t in det.get((c[0] + i, c[1] + j), ()))
def klaster(cs):
    cs = set(cs); m = 0
    while cs:
        st = [cs.pop()]; m += 1
        while st:
            a, b = st.pop()
            for i in range(-4, 5):
                for j in range(-4, 5):
                    if (a + i, b + j) in cs: cs.remove((a + i, b + j)); st.append((a + i, b + j))
    return m
PORSI = 0.5337924177818518  # konstanta platform (scripts/data/peta_karhutla.py); data 16-19 Okt tidak lengkap di berkas 7 hari
HARI = ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']
res = {}
for k in TGT:
    o = {'hot': [], 'luas': [], 'belum': [], 'padam': [], 'fs': []}
    for d in HARI:
        p = (date.fromisoformat(d) - timedelta(days=1)).isoformat(); p2 = (date.fromisoformat(d) - timedelta(days=2)).isoformat()
        L = n20[(k, d)]; Lp = n20[(k, p2)]; sepi = celhari[p] | celhari[d]
        luas = len(L) * PORSI * 4.3; luas_p = len(Lp) * PORSI * 4.3
        o['hot'].append(hot[(k, d)])
        o['luas'].append(luas)
        o['belum'].append(luas * (sum(1 for c, w in L if bertahan(c, w)) / len(L) if L else 0))
        o['padam'].append(luas_p * (sum(1 for c, w in Lp if not any((c[0] + i, c[1] + j) in sepi for i, j in NB)) / len(Lp) if Lp else 0))
        o['fs'].append(klaster({c for c, w in pc[(k, d)] if bertahan(c, w)}))
    res[k] = o
json.dump({'hari': HARI, 'prov': res, 'porsi': PORSI, 'metode': __doc__}, open('angka_nasional.json', 'w'), indent=1)
