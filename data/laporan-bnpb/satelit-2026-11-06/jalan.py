"""Laporan Penanganan Pengendalian Karhutla 061126, cut-off 18.00 WIB (pemilik 6 Nov). Cara sama dengan ../satelit-2026-10-31/jalan.py, versi
"per sekarang" (tim 31 Okt: "diganti aja jadi yang per sekarang"; pemilik 29 Okt: luas dan belum padam dari hari api yang sama):
- hotspot: harian30.json semua hari; firespot: kluster.json (hari ini) dan kluster_hari/<hari>.json kolom 4;
- kolom 1 Nov: belum padam = belum_kini.json website; luas dan padam = rumus peta_karhutla atas hotspot.json (diuji terhadap 31 Okt);
  hari lampau = peta_karhutla.json hari itu sendiri;
- pil PM2,5: udara/data/riwayat.json website; pil cuaca: Open-Meteo past_days=1, sel 6 provinsi tabel saja;
- slide operasi: WA satgas 1 Nov 11.01 (wa-satgas.txt; operasi 31 Okt), tanpa rekap instansi, jadi baris PEMILIK tidak tampil.
Salinan web/ dipakai ulang; BARU=1 memaksa unduh ulang."""
import csv, datetime as dt, io, json, os, sys, types, urllib.request
from collections import Counter
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', 'generator')); sys.path.insert(0, G); os.chdir(G)
import satelit, penanganan, cuaca_riwayat
D, JAM = dt.date(2026, 11, 6), '18:00'
KEMARIN, LUSA = D - dt.timedelta(days=1), D - dt.timedelta(days=2)
md = lambda d: d.strftime('%m-%d')


class _Hari(dt.date):   # jalan ulang hari lain tetap memakai cuaca tarikan hari laporan
    @classmethod
    def today(cls): return D


cuaca_riwayat.dt = types.SimpleNamespace(date=_Hari, timedelta=dt.timedelta)


def unduh(url, ke):
    # salinan web/ yang sudah ada dipakai ulang (terbitan sesudah cut-off 18.00 WIB): jalan ulang tidak menggeser angka bila website
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
assert P['hari'][-1] == KEMARIN.isoformat(), P['hari'][-1]
KINI_ADA = KINI['hari'] == D.isoformat()   # True: versi "per sekarang" (cara 301026; pemilik dan tim 31 Okt 19.00 "diganti aja jadi yang per sekarang")
# 1 Nov: belum_kini terbit 17.19, jadi dipakai versi per sekarang. Bila belum_kini belum memuat hari laporan (31 Okt: FIRMS belum punya
# lintasan NOAA-21), jatuh ke versi "hari utuh" deck 291026 (../satelit-2026-10-29/dua-versi, VERSI 'utuh'): luas, belum padam, padam
# tiap kolom = hari utuh sehari sebelumnya, berlabel cut-off 00.00.
assert H['hari_ini'] == D.isoformat(), H['hari_ini']
print('website: harian30', H['dibuat'], '| peta_karhutla', P['dibuat'], 's.d.', P['hari'][-1], '| hotspot.json titik terakhir', HS['acuan'], '| belum_kini', KINI['dibuat'])

# hotspot.json -> CSV FIRMS per sumber per hari UTC (hari UTC kemarin dan hari ini); hari lain dari cache/raw atau tarikan FIRMS
SENSOR = {'MODIS_NRT': 'M', 'VIIRS_SNPP_NRT': 'N', 'VIIRS_NOAA20_NRT': 'N20', 'VIIRS_NOAA21_NRT': 'N21'}
ACUAN = dt.datetime.fromisoformat(HS['acuan'])
KOL = ['latitude', 'longitude', 'scan', 'track', 'acq_date', 'acq_time', 'satellite', 'confidence', 'frp', 'daynight']
# 6 Nov 19.3x pemilik: "bener2 pakai data terbaru sampai waktu cut off". FIRMS ditarik langsung 19.40 WIB (firms/, disalin ke cache/raw):
# MODIS 6 Nov sampai 17.38 WIB (website berhenti 16.04); VIIRS NOAA-20/21 lintasan siang 6 Nov belum diterbitkan NASA (0 baris).
# Jadi hari UTC kemarin dan hari ini dibaca dari FIRMS segar, bukan hotspot.json website.
UTC_WEB = set()


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
print('VERSI', 'per sekarang' if KINI_ADA else f'hari utuh (belum_kini {D} belum terbit)', f'| {D} s.d. data terakhir: luas {sum(LUAS_D.values())} ha, padam {sum(PADAM_D.values())} ha',
      f'belum padam {round(sum(KINI["prov"].values()))} ha' if KINI_ADA else '')

asli = satelit.hitung
if False:
    # (diganti di bawah: SEGAR) pemilik 6 Nov: versi hari utuh menaruh hotspot 6 Nov di samping luas/belum padam 5 Nov ("mendampingkan data yang beda", tidak boleh).
    # belum_kini 6 Nov belum terbit, jadi belum padam hari laporan dihitung sendiri dengan rumus peta_karhutla (satelit.hitung); diuji
    # uji_belum.py terhadap belum_kini 5 Nov 23.45: enam provinsi tabel selisih <= 5 ha; beda besar Papua Selatan 1.912 vs 1.201,
    # Maluku 83 vs 48, Maluku Utara 33 vs 27. Luas dan padam tetap rumus luas_sendiri/padam_sendiri di atas.
    _b = asli(D, JAM, 2); _i = _b['hari'].index(D.isoformat())
    KINI = {'hari': D.isoformat(), 'dibuat': f'hitungan sendiri s.d. {JAM}', 'prov': {k: round(o['belum'][_i]) for k, o in _b['prov'].items()}}
    KINI_ADA = True
    print('belum padam', D, 'hitungan sendiri:', sum(KINI['prov'].values()), 'ha')


# Hari laporan D: hotspot, luas, belum padam, padam semuanya hitungan sendiri (rumus website, satelit.hitung) atas FIRMS segar s.d. cut-off,
# supaya satu kolom = satu hari yang sama (pemilik 6 Nov: jangan sandingkan data beda hari). D-1 dan D-2 = berkas website hari itu sendiri.
KINI_ADA = True
SEGAR = asli(D, JAM, 2); iS = SEGAR['hari'].index(D.isoformat())
print('SEGAR', D, 's.d.', JAM, {m: round(sum(o[m][iS] for o in SEGAR['prov'].values())) for m in ('hot', 'luas', 'belum', 'padam')})


def hitung_web(t, jam, n, kunci=None):
    a = asli(t, jam, n, kunci)
    beda = []
    for i, d in enumerate(a['hari']):
        if d in H['hari'] and d != D.isoformat():
            for k, o in a['prov'].items():
                w = H['prov'].get(k, [0] * len(H['hari']))[H['hari'].index(d)]
                if o['hot'][i] != w: beda.append((d, k, o['hot'][i], w))
                o['hot'][i] = w
    print('selisih hotspot sendiri vs website (hari, prov, sendiri, website):', beda[:20] or 'tidak ada', f'({len(beda)} sel)' if beda else '')
    nol = {m: [0] * len(P['hari']) for m in ('luas', 'belum', 'padam')}
    for k, o in a['prov'].items():
        pk = P['prov'].get(k) or nol
        for i, d in enumerate(a['hari']):
            if not KINI_ADA:   # hari utuh d-1, dilabeli d (luas_00)
                j = P['hari'].index((dt.date.fromisoformat(d) - dt.timedelta(days=1)).isoformat())
                for m in ('luas', 'belum', 'padam'): o[m][i] = pk[m][j] or 0
            elif d == D.isoformat():   # hitungan sendiri atas FIRMS segar (lihat SEGAR)
                pass
            else:
                for m in ('luas', 'belum', 'padam'): o[m][i] = pk[m][P['hari'].index(d)] or 0
    return a


# Firespot keempat hari diambil dari website (kluster_hari tiga hari lalu + kluster.json hari ini), jadi hitungan sendiri firespot_hari.seri
# tidak dijalankan: ia menarik cuaca 92 hari untuk 612 sel (25 tarikan Open-Meteo, +-2 menit tiap tarikan karena kuota) hanya untuk dibuang.
# Cuaca cukup untuk pil 6 baris tabel: grid dibatasi ke sel 6 provinsi hotspot teratas hari laporan (rata-rata per provinsi tidak berubah).
iH = H['hari'].index(D.isoformat())
TOP6 = set(sorted(SEGAR['prov'], key=lambda k: -SEGAR['prov'][k]['hot'][iS])[:6])
asli_grid = cuaca_riwayat.H.grid_darat
cuaca_riwayat.H.grid_darat = lambda w: [g for g in asli_grid(w) if g[2] in TOP6]
# Pil hanya memakai hujan dan angin hari laporan, diambil langsung dari data per jam hari itu; riwayat 92 hari cuma untuk FWI (tak dipakai pil).
# past_days=1 (kemarin + hari ini) cukup: pil hanya memakai hari laporan (pemilik 31 Okt: "ambil secukupnya", jangan 92 hari).
cuaca_riwayat.PAST = 1
print('6 provinsi tabel (hotspot', D, '):', sorted(TOP6, key=lambda k: -SEGAR['prov'][k]['hot'][iS]), [SEGAR['prov'][k]['hot'][iS] for k in sorted(TOP6, key=lambda k: -SEGAR['prov'][k]['hot'][iS])])


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
penanganan.bangun(D, JAM, None, S, (os.path.join(S, 'wa-satgas.txt') if os.path.exists(os.path.join(S, 'wa-satgas.txt')) else None), ha_utuh=True, belum_kini=False, luas_00=True)   # label kolom = hari kalender (sama dengan 301026)
json.dump(json.load(open(os.path.join(G, 'cache', f'penanganan-{D:%d%m%y}', 'angka.json'))), open(os.path.join(S, 'angka.json'), 'w'))
