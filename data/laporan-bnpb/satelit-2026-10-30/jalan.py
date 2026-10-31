"""Laporan Penanganan Pengendalian Karhutla 301026, cut-off 17.00 WIB. Cara = versi "kini" deck 291026 (../satelit-2026-10-29/dua-versi/jalan.py),
pilihan pemilik 29 Okt malam: luas terbakar dan belum padam dari hari api yang sama ("hari yang sama biar pasti", "gunakan 282 dan 153").
Semua angka dari berkas website tayang (unduh ulang tiap jalan, simpan di web/), WA kalah bila beda:
- hotspot: harian30.json semua hari;
- kolom 28 dan 29 Okt: luas, belum padam, padam = peta_karhutla.json hari itu sendiri;
- kolom 30 Okt (s.d. data terakhir): belum padam = belum_kini.json; luas dan padam = hitungan sendiri dari hotspot.json website
  (rumus peta_karhutla: titik NOAA-20/21 nominal/tinggi x 4,12 / 4,16 ha, dibagi 2; padam = titik 28 Okt yang sel 3x3-nya tanpa deteksi
  29-30 Okt). Diuji terhadap hari terbit 29 Okt (dicetak);
- firespot: kluster.json (hari ini) dan kluster_hari/<hari>.json kolom 4 (hari lampau);
- pil PM2,5: udara/data/riwayat.json website;
- slide operasi: WA satgas 30 Okt (wa-satgas.txt; operasi 29 Okt). WA tanpa rekap instansi dan armadanya (58 unit) beda dengan rekap 28 Okt
  (59 unit), jadi baris PEMILIK tidak tampil (bnpb.pemilik tanpa rekap).
Jalankan (Windows): $env:PYTHONUTF8=1; C:\\Python314\\python data\\laporan-bnpb\\satelit-2026-10-30\\jalan.py"""
import csv, datetime as dt, io, json, os, sys, types, urllib.request
from collections import Counter
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', 'generator')); sys.path.insert(0, G); os.chdir(G)
import satelit, penanganan, cuaca_riwayat
D, JAM = dt.date(2026, 10, 30), '17:00'
KEMARIN, LUSA = D - dt.timedelta(days=1), D - dt.timedelta(days=2)
md = lambda d: d.strftime('%m-%d')


class _Hari(dt.date):   # jalan ulang hari lain tetap memakai cuaca tarikan hari laporan
    @classmethod
    def today(cls): return D


cuaca_riwayat.dt = types.SimpleNamespace(date=_Hari, timedelta=dt.timedelta)


def unduh(url, ke):
    # salinan web/ yang sudah ada dipakai ulang (terbitan 17.31 WIB, sesudah cut-off): jalan ulang tidak menggeser angka bila website
    # sudah terbit lagi. BARU=1 memaksa unduh ulang.
    if os.path.exists(ke) and not os.environ.get('BARU'):
        return json.load(open(ke, encoding='utf-8'))
    os.makedirs(os.path.dirname(ke), exist_ok=True)
    for coba in range(3):
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=300).read(); break
        except (TimeoutError, OSError):
            if coba == 2: raise
    open(ke, 'wb').write(b)
    return json.loads(b)


web = lambda f: unduh(f'https://centurisk97.id/data/{f}', os.path.join(S, 'web', f.replace('/', '-')))
P, H, HS, KL, KINI = web('peta_karhutla.json'), web('harian30.json'), web('hotspot.json'), web('kluster.json'), web('belum_kini.json')
KH = {d: web(f'kluster_hari/{d}.json')['w'] for d in ((D - dt.timedelta(days=i)).isoformat() for i in (3, 2, 1))}
assert KINI['hari'] == D.isoformat() and P['hari'][-1] == KEMARIN.isoformat(), (KINI['hari'], P['hari'][-1])
assert H['hari_ini'] == D.isoformat(), H['hari_ini']
print('website: harian30', H['dibuat'], '| peta_karhutla', P['dibuat'], 's.d.', P['hari'][-1], '| hotspot.json titik terakhir', HS['acuan'], '| belum_kini', KINI['dibuat'])

# hotspot.json -> CSV FIRMS per sumber per hari UTC (hari UTC kemarin dan hari ini); hari lain dari cache/raw atau tarikan FIRMS
SENSOR = {'MODIS_NRT': 'M', 'VIIRS_SNPP_NRT': 'N', 'VIIRS_NOAA20_NRT': 'N20', 'VIIRS_NOAA21_NRT': 'N21'}
ACUAN = dt.datetime.fromisoformat(HS['acuan'])
KOL = ['latitude', 'longitude', 'scan', 'track', 'acq_date', 'acq_time', 'satellite', 'confidence', 'frp', 'daynight']
UTC_WEB = {KEMARIN.isoformat(), D.isoformat()}


def csv_web(src, u):
    b = io.StringIO(); w = csv.writer(b); w.writerow(KOL)
    for lat, lon, jam, sen, frp, yak, *_ in HS['baris']:
        t = ACUAN + dt.timedelta(hours=jam)
        if sen != SENSOR[src] or t.date().isoformat() != u: continue
        conf = ('0', '50', '90')[yak] if sen == 'M' else 'lnh'[yak]
        w.writerow([lat, lon, .4, .4, t.date().isoformat(), t.strftime('%H%M'), {'M': 'Aqua', 'N': 'N'}.get(sen, sen), conf, frp, 'D'])
    return b.getvalue()


asli_csv = satelit.csv_hari
satelit.csv_hari = lambda src, u, cutoff, kunci: csv_web(src, u.isoformat()) if u.isoformat() in UTC_WEB else asli_csv(src, u, cutoff, kunci)

# luas dan padam hari laporan s.d. data terakhir: rumus peta_karhutla.py atas baris NOAA-20/21 n/h hotspot.json
SISI, F = 0.003375, {'N20': 4.12, 'N21': 4.16}
DET = {}
for lat, lon, jam, sen, frp, yak, wil, tgl, hit in HS['baris']:
    if sen in F and yak >= 1:
        DET.setdefault(tgl, []).append((HS['wilayah'][wil].split('|')[0], sen, (round(lon / SISI), round(lat / SISI))))


def luas_sendiri(rows):
    c = Counter((p, s) for p, s, _ in rows)
    return {p: round(sum(c[(p, s)] * f for s, f in F.items()) / 2) for p in {p for p, _ in c}}


def padam_sendiri(hari_api, sesudah):
    ada = {c for t in sesudah for _, _, c in DET.get(md(t), [])}
    return luas_sendiri([r for r in DET.get(md(hari_api), []) if not any((r[2][0] + i, r[2][1] + j) in ada for i in (-1, 0, 1) for j in (-1, 0, 1))])


LUAS_D, PADAM_D = luas_sendiri(DET.get(md(D), [])), padam_sendiri(LUSA, (KEMARIN, D))
# uji rumus terhadap hari yang sudah terbit (kemarin): nasional dan per provinsi
j = P['hari'].index(KEMARIN.isoformat()); uji = luas_sendiri(DET.get(md(KEMARIN), []))
web_l = {k: v['luas'][j] or 0 for k, v in P['prov'].items()}
print(f'uji luas {KEMARIN}: sendiri {sum(uji.values())} ha vs website {round(sum(web_l.values()))} ha;',
      'beda > 5 ha:', {k: (uji.get(k, 0), round(web_l.get(k, 0))) for k in set(uji) | set(web_l) if abs(uji.get(k, 0) - web_l.get(k, 0)) > 5} or 'tidak ada')
print(f'{D} s.d. data terakhir: luas {sum(LUAS_D.values())} ha, padam {sum(PADAM_D.values())} ha, belum padam {round(sum(KINI["prov"].values()))} ha')

asli = satelit.hitung


def hitung_web(t, jam, n, kunci=None):
    a = asli(t, jam, n, kunci)
    beda = []
    for i, d in enumerate(a['hari']):
        if d in H['hari']:
            for k, o in a['prov'].items():
                w = H['prov'].get(k, [0] * len(H['hari']))[H['hari'].index(d)]
                if o['hot'][i] != w: beda.append((d, k, o['hot'][i], w))
                o['hot'][i] = w
    print('selisih hotspot sendiri vs website (hari, prov, sendiri, website):', beda[:20] or 'tidak ada', f'({len(beda)} sel)' if beda else '')
    nol = {m: [0] * len(P['hari']) for m in ('luas', 'belum', 'padam')}
    for k, o in a['prov'].items():
        pk = P['prov'].get(k) or nol
        for i, d in enumerate(a['hari']):
            if d == D.isoformat():
                o['luas'][i], o['belum'][i], o['padam'][i] = LUAS_D.get(k, 0), KINI['prov'].get(k, 0), PADAM_D.get(k, 0)
            else:
                for m in ('luas', 'belum', 'padam'): o[m][i] = pk[m][P['hari'].index(d)] or 0
    return a


# Firespot keempat hari diambil dari website (kluster_hari tiga hari lalu + kluster.json hari ini), jadi hitungan sendiri firespot_hari.seri
# tidak dijalankan: ia menarik cuaca 92 hari untuk 612 sel (25 tarikan Open-Meteo, +-2 menit tiap tarikan karena kuota) hanya untuk dibuang.
# Cuaca cukup untuk pil 6 baris tabel: grid dibatasi ke sel 6 provinsi hotspot teratas hari laporan (rata-rata per provinsi tidak berubah).
iH = H['hari'].index(D.isoformat())
TOP6 = set(sorted(H['prov'], key=lambda k: -(H['prov'][k][iH] or 0))[:6])
asli_grid = cuaca_riwayat.H.grid_darat
cuaca_riwayat.H.grid_darat = lambda w: [g for g in asli_grid(w) if g[2] in TOP6]
# Pil hanya memakai hujan dan angin hari laporan, diambil langsung dari data per jam hari itu; riwayat 92 hari cuma untuk FWI (tak dipakai pil).
# 3 hari cukup dan jauh lebih ringan bagi kuota Open-Meteo (30 Okt: tarikan 92 hari tertahan kuota 429).
cuaca_riwayat.PAST = 3
print('6 provinsi tabel (hotspot', D, '):', sorted(TOP6, key=lambda k: -H['prov'][k][iH]), [H['prov'][k][iH] for k in sorted(TOP6, key=lambda k: -H['prov'][k][iH])])


def firespot_web(hari_akhir, n, jam='17:00', kunci=None):
    hari = [(hari_akhir - dt.timedelta(days=n - 1 - i)).isoformat() for i in range(n)]
    fs = {}
    kini = Counter()
    for f in KL['features']:
        for k, v in (f['properties'].get('fs_ini') or {}).items(): kini[k.split('|')[0]] += v
    for k in set(kini) | {k for w in KH.values() for k in w if '|' not in k}:
        baris = fs.setdefault(k, [0] * n)
        for i, d in enumerate(hari):
            assert d == H['hari_ini'] or d in KH, f'firespot {d} tidak ada di website'
            baris[i] = kini.get(k, 0) if d == H['hari_ini'] else (KH[d].get(k) or [0] * 5)[4]
    print('firespot website', hari[-1], 'nasional', sum(v[-1] for v in fs.values()))
    return fs, hari


import pil_sendiri
pil_sendiri.RIWAYAT = os.path.join(S, 'web', 'udara-riwayat.json')
unduh('https://centurisk97.id/udara/data/riwayat.json', pil_sendiri.RIWAYAT)

asli_op = penanganan.wa_operasi.operasi
# pil ARMADA UDARA bertanggal laporan WA (sama dengan deck 281026 dan 291026), bukan hari kegiatan
penanganan.wa_operasi.operasi = lambda teks: (lambda op: {**op, 'tanggal_armada': op['tanggal_laporan']})(asli_op(teks))
satelit.hitung = hitung_web
penanganan.satelit = satelit
penanganan.firespot_hari.seri = firespot_web
penanganan.bangun(D, JAM, None, S, os.path.join(S, 'wa-satgas.txt'), ha_utuh=True, belum_kini=False, luas_00=True)
json.dump(json.load(open(os.path.join(G, 'cache', f'penanganan-{D:%d%m%y}', 'angka.json'))), open(os.path.join(S, 'angka.json'), 'w'))
