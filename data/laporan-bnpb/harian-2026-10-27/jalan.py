"""Laporan harian 271026: riwayat website s.d. 25 Okt dari berkas repo (origin/main, faktor 4,12/4,16; website tayang masih versi lama),
angka 25 Okt s.d. 27 Okt 07.00 WIB dari satelit.hitung atas FIRMS publik 7 hari (cache/raw). Cut-off 07.00 (pemilik 27 Okt); WA Koordalops pagi 26-27 Okt 07.00."""
import datetime as dt, json, os, subprocess, sys
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', 'generator')); sys.path.insert(0, G); os.chdir(G)   # S dihitung sebelum chdir
import harian, wa_harian
OUT = S; os.makedirs(OUT, exist_ok=True)
def web_repo(ke):
    os.makedirs(ke, exist_ok=True); o = {}
    import urllib.request
    for f in harian.WEB:
        if f in ('kluster_awal.json', 'harian30.json'):   # status Prioritas dan Real Time = website tayang (lebih baru dari repo)
            b = urllib.request.urlopen(urllib.request.Request(f'https://centurisk97.id/data/{f}', headers={'User-Agent': 'Mozilla/5.0'}), timeout=120).read()
        else:
            b = subprocess.run(['git', 'show', f'origin/main:public/data/{f}'], capture_output=True, check=True).stdout
        open(os.path.join(ke, f), 'wb').write(b); o[f] = json.loads(b)
    return o
asli = harian.angka_karhutla
CUTOFF = '07:00'   # pemilik 27 Okt: "jadikan waktu cutoff hari ini juga jam 7"
# pemilik 27 Okt: "kita gunakan data di jam 07.00 hari ini saja" = hotspot dan sisa 27 Okt 00.00 s.d. 07.00 WIB (sama dengan Real Time website),
# terbakar s.d. 27 Okt 07.00
# pemilik 27 Okt: "klo bentrok antara data lain dan website, ambil data website": sisa = Belum padam website hari terakhir yang terbit
# (26 Okt); hotspot = 27 Okt 00.00 s.d. 07.00 (= Real Time website); terbakar = website s.d. 26 Okt + 27 Okt s.d. 07.00
def angka_web(kej, web, tanggal, jam):
    hasil = asli(kej, web, tanggal, CUTOFF)
    P, K, WL = web['peta_karhutla.json'], web['peta_karhutla_kab.json'], web['peta_karhutla_wil.json']
    i, i0 = P['hari'].index((tanggal - dt.timedelta(days=1)).isoformat()), P['hari'].index(WL['hari0'])
    def sisa_web(x):
        if not x['lokasi']: return P['prov'].get(x['prov'], {'belum': [0] * 999})['belum'][i] or 0
        if x['lokasi'] in harian.KAWASAN:
            return sum(f[n + 3] for kk in harian.KAWASAN[x['lokasi']] for f in [WL['d'].get(kk, [])] for n in range(0, len(f), 5) if f[n] + i0 == i)
        return next((b for d_, l, b in K['kab'].get(f"{x['prov']}|{x['lokasi']}", {'d': []})['d'] if d_ == i), 0)
    def kum_web(x):
        if not x['lokasi']: return sum(v or 0 for v in P['prov'].get(x['prov'], {'luas': []})['luas'][:i + 1])
        if x['lokasi'] in harian.KAWASAN:
            return sum(f[n + 2] for kk in harian.KAWASAN[x['lokasi']] for f in [WL['d'].get(kk, [])] for n in range(0, len(f), 5) if f[n] + i0 <= i)
        return sum(l for d_, l, b in K['kab'].get(f"{x['prov']}|{x['lokasi']}", {'d': []})['d'] if d_ <= i)
    for x in kej:
        if x['jenis'] == 'karhutla': x['sat']['sisa'], x['sat']['kum'] = sisa_web(x), kum_web(x)
    hari, cutoff, prio, baru = hasil
    return hari, cutoff, prio, lambda k: {**baru(k), 'sisa': P['prov'].get(k, {'belum': [0] * 999})['belum'][i] or 0,
                                          'kum': sum(v or 0 for v in P['prov'].get(k, {'luas': []})['luas'][:i + 1])}
harian.angka_karhutla = angka_web
harian.satelit_kunci = None
import satelit; asli_h = satelit.hitung; satelit.hitung = lambda t, j, n, kunci=None: asli_h(t, j, n, kunci='publik')
T = dt.date(2026, 10, 27)
wa = wa_harian.koordalops(open(f'{S}/wa-koordalops.txt').read()); w = wa_harian.bmkg(open(f'{S}/wa-bmkg.txt').read())
ke = os.path.join(OUT, 'kerja-271026'); web = harian.ambil_web(os.path.join(ke, 'web'))   # website tayang sudah terbit s.d. 26 Okt (27 Okt 09.14)
D = harian.susun(wa, web, T, None)
# pemilik 26 Okt ("ikut data satelit"): BPBD lapor belum padam tapi sisa kita 0 ha -> tetap ditangani hanya bila satelit masih melihat api
# di wilayahnya pada hari laporan (FIRMS publik s.d. tarikan terakhir); kalau tidak, selesai
import csv, glob
import peta_karhutla as PK, titik_palsu as TP
from wilayah import Wilayah
wl = Wilayah(); ind, _ = TP.sel_industri(); deteksi = []
for f in glob.glob(os.path.join(G, 'cache', 'raw', '*.csv')):
    for r in csv.DictReader(open(f)):
        t = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M').replace(tzinfo=PK.UTC).astimezone(PK.WIB)
        if t.date() != T or not PK.sedang(r): continue
        la, lo = float(r['latitude']), float(r['longitude'])
        if TP.palsu(la, lo, ind): continue
        a_ = wl.cari(lo, la)
        if a_: deteksi.append(('|'.join(str(v) for v in a_[:3]), t))
# luas terbakar baru di hari laporan s.d. deteksi terakhir yang tertarik (pemilik 26 Okt: "tulis aja angkanya")
import satelit
jam_akhir = (max(t for _, t in deteksi) + dt.timedelta(minutes=1)).strftime('%H:%M') if deteksi else '00:01'
a26 = satelit.hitung(T, jam_akhir, 1)
def luas_hari(x):
    ks = harian.KAWASAN[x['lokasi']] if x['lokasi'] in harian.KAWASAN else None
    if ks: return sum(a26['kec'][k]['luas'][-1] for k in ks if k in a26['kec'])
    o = a26['kab'].get(f"{x['prov']}|{x['lokasi']}"); return o['luas'][-1] if o else 0
for x in D['kejadian']:
    if x['jenis'] != 'karhutla' or x['status'] != 'belum' or round(x['sat']['sisa']) or not x['lokasi']: continue
    kunci = set(harian.KAWASAN[x['lokasi']]) if x['lokasi'] in harian.KAWASAN else None
    cocok = sorted(t for k, t in deteksi if (k in kunci if kunci else k.startswith(f"{x['prov']}|{x['lokasi']}|")))
    if cocok:
        x['sat']['api'] = f"{harian.f0(luas_hari(x))} ha baru {T.day} {harian.BULAN[T.month - 1][:3]}"   # pil "4 ha baru 26 Okt"
    else:
        x['status'] = 'berjalan'; x['tangani'] = x['perhatian'] = False
    print('deteksi hari laporan', x['lokasi'], len(cocok), x['sat'].get('api', '-> selesai'))
# pemilik 27 Okt: "harus tally data ini" (tab Belum padam website, SEN 26 OKT): firespot, sisa, dan status API diambil dari tabel website
# hari terakhir yang terbit (arsip kluster_hari/<hari>.json: w[kunci] = [cluster, firespot, level maks, ..., titik firespot hari itu, ...]).
# Provinsi Prioritas pada tabel itu wajib masuk (Kaltim, Sulsel). Dalam penanganan bila belum padam > 0 atau Prioritas;
# Prioritas = perlu perhatian; belum padam 0 = selesai. Kawasan/kabupaten tanpa status website sendiri tetap ikut satelit.
import urllib.request
H_SISA = (T - dt.timedelta(days=1)).isoformat()
KH = json.loads(urllib.request.urlopen(urllib.request.Request(f'https://centurisk97.id/data/kluster_hari/{H_SISA}.json', headers={'User-Agent': 'Mozilla/5.0'}), timeout=120).read())
json.dump(KH, open(os.path.join(ke, 'web', f'kluster_hari-{H_SISA}.json'), 'w'))
W_ = lambda kk: KH['w'].get(kk) or [0] * 7
P_ = web['peta_karhutla.json']; iS = P_['hari'].index(H_SISA)
ada = {x['prov'] for x in D['kejadian'] if x['jenis'] == 'karhutla' and not x['lokasi']}
for k in sorted(k for k, v in KH['w'].items() if '|' not in k and v[2] == 3 and k not in ada):
    p_ = P_['prov'].get(k, {'luas': [], 'belum': [0] * 999})
    D['kejadian'].append({'jenis': 'karhutla', 'prov': k, 'lokasi': '', 'status': 'berjalan', 'angka': {}, 'tangani': True, 'perhatian': True,
                          'sat': {'kum': sum(v or 0 for v in p_['luas'][:iS + 1]), 'sisa': p_['belum'][iS] or 0, 'hot': 0}})
    D['prioritas_baru'] = D.get('prioritas_baru', []) + [k]; print('Prioritas website', H_SISA, 'ditambahkan:', harian.NAMA[k])
for x in D['kejadian']:
    if x['jenis'] != 'karhutla': continue
    ks = harian.KAWASAN.get(x['lokasi']) if x['lokasi'] else None
    x['sat']['hot'] = sum(W_(kk)[4] or 0 for kk in ks) if ks else W_(x['prov'] + (f"|{x['lokasi']}" if x['lokasi'] else ''))[4] or 0
    if not x['lokasi']:
        lv = W_(x['prov'])[2]
        x['tangani'] = round(x['sat']['sisa']) > 0 or lv == 3; x['perhatian'] = x['tangani'] and (x['perhatian'] or lv == 3)
        x['status'] = 'berjalan'
        print('website', H_SISA, harian.NAMA[x['prov']], ['Aman', 'Patroli', 'Siaga', 'Prioritas'][max(lv, 0)], round(x['sat']['sisa']), 'ha', x['sat']['hot'], 'FS ->', 'ditangani' if x['tangani'] else 'selesai', 'PERHATIAN' if x['perhatian'] else '')
# urutan tabel: baris provinsi sisa terbesar di atas, lalu kawasan/kabupaten, lalu jenis lain
kh = [x for x in D['kejadian'] if x['jenis'] == 'karhutla']
D['kejadian'] = sorted((x for x in kh if not x['lokasi']), key=lambda x: -x['sat']['sisa']) + [x for x in kh if x['lokasi']] + [x for x in D['kejadian'] if x['jenis'] != 'karhutla']
json.dump(D, open(os.path.join(ke, 'data.json'), 'w'), ensure_ascii=False, indent=1)
import shutil, zipfile
tpl = os.path.join(G, 'cache', 'templat', 'harian-221026.pptx')
if os.path.isdir(os.path.join(ke, 'tpl')): shutil.rmtree(os.path.join(ke, 'tpl'))
zipfile.ZipFile(tpl).extractall(os.path.join(ke, 'tpl'))
subprocess.run(['node', os.path.join(G, 'harian_peta.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
subprocess.run(['node', os.path.join(G, 'harian_ikon.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
nama = os.path.join(OUT, 'Laporan Kejadian Bencana Harian 271026.pptx')
dk = harian.Deck(ke, D, wa, w, T, None); dk.lbl_kolom, dk.lbl_hot, dk.lbl_kum = 'FIRESPOT DAN SISA 26 OKT', 'firespot', 'TERBAKAR 1 JAN–26 OKT'; dk.bangun(tpl, nama)
print('ok', nama, '| hari data', D['hari'], '| cutoff', D['cutoff'], '| kejadian', dk.N_TOT, 'karhutla', len(dk.KH), 'ditangani', len(dk.KH_T), 'perlu perhatian', len(dk.SER), 'selesai', dk.N_SEL, '| Prioritas ditambah', D['prioritas_baru'])
for x in D['kejadian']:
    print(x['jenis'], x['prov'], x['lokasi'] or '(prov)', x['status'], 'DITANGANI' if x['tangani'] else 'selesai', 'PERHATIAN' if x['perhatian'] else '', {k: (round(v) if not isinstance(v, str) else v) for k, v in x.get('sat', {}).items()})
