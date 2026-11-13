"""Laporan harian 041126: angka karhutla dari website tayang (terbit s.d. 3 Nov), tally tabel Belum padam 3 Nov.
Cut-off 07.00 (pemilik 27 Okt); WA Koordalops pagi 3-4 Nov 07.00, BMKG dan PVMBG 4 Nov 06.00. Aturan sama dengan 011126."""
import datetime as dt, json, os, subprocess, sys
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', '..', '..', 'generator')); sys.path.insert(0, G); os.chdir(G)   # S dihitung sebelum chdir
import harian, wa_harian
OUT = S; os.makedirs(OUT, exist_ok=True)   # 2 Nov pemilik: format baseline paparan Kepala 011126 lewat mesin ppt-konsultan jadi resmi
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
    i, i0 = P['hari'].index(min((tanggal - dt.timedelta(days=1)).isoformat(), P['hari'][-1])), P['hari'].index(WL['hari0'])   # 3 Nov: data.yml 2 Nov batal, website s.d. 1 Nov
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
import satelit; asli_h = satelit.hitung; satelit.hitung = lambda t, j, n, kunci=None: asli_h(t, j, n, kunci='publik')   # cache/raw diisi dari FIRMS publik 7 hari
T = dt.date(2026, 11, 4)
wa = wa_harian.koordalops(open(f'{S}/wa-koordalops.txt').read()); w = wa_harian.bmkg(open(f'{S}/wa-bmkg.txt').read())
ke = os.path.join(OUT, 'kerja-041126')
# 4 Nov pemilik: bangun ulang hari yang sama tanpa unduh ulang (folder kerja/web sudah ada); SEGAR=1 memaksa unduh segar
harian.SIMPAN = satelit.SIMPAN = os.path.isdir(os.path.join(ke, 'web')) and os.environ.get('SEGAR') != '1'
print('mode', 'simpanan' if harian.SIMPAN else 'unduh segar')
web = harian.ambil_web(os.path.join(ke, 'web'))   # website tayang sudah terbit s.d. 2 Nov
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
        x['status'] = 'berjalan'; x['tangani'] = x['perhatian'] = False; x['sat']['padam_sat'] = True   # 4 Nov: ikut ke sat_kab untuk slide kejadian baru
    print('deteksi hari laporan', x['lokasi'], len(cocok), x['sat'].get('api', '-> selesai'))
# pemilik 27 Okt: "harus tally data ini" (tab Belum padam website, SEN 26 OKT): firespot, sisa, dan status API diambil dari tabel website
# hari terakhir yang terbit (arsip kluster_hari/<hari>.json: w[kunci] = [cluster, firespot, level maks, ..., titik firespot hari itu, ...]).
# Provinsi Prioritas pada tabel itu wajib masuk (Kaltim, Sulsel). Dalam penanganan bila belum padam > 0 atau Prioritas;
# Prioritas = perlu perhatian; belum padam 0 = selesai. Kawasan/kabupaten tanpa status website sendiri tetap ikut satelit.
import urllib.request
H_SISA = min((T - dt.timedelta(days=1)).isoformat(), web['peta_karhutla.json']['hari'][-1])   # 3 Nov: website belum terbit 2 Nov -> hari terakhir yang terbit, satu baris searah
print('hari data website', H_SISA)
HL = f"{int(H_SISA[8:])} {harian.BULAN[int(H_SISA[5:7]) - 1][:3].upper()}"
KH = harian.unduh_json(f'https://centurisk97.id/data/kluster_hari/{H_SISA}.json', os.path.join(ke, 'web', f'kluster_hari-{H_SISA}.json'))
json.dump(KH, open(os.path.join(ke, 'web', f'kluster_hari-{H_SISA}.json'), 'w'))
W_ = lambda kk: KH['w'].get(kk) or [0] * 7
P_ = web['peta_karhutla.json']; iS = P_['hari'].index(H_SISA)
ada = {x['prov'] for x in D['kejadian'] if x['jenis'] == 'karhutla'}   # 29 Okt: provinsi yang sudah dilapor WA per kabupaten (Merauke) tidak ditambah lagi, supaya tidak dobel
# 28 Okt: provinsi dengan belum padam >= 50 ha di tabel itu juga masuk walau tidak di WA (Kaltim 461 ha)
BESAR = lambda k: (P_['prov'].get(k, {'belum': [0] * 999})['belum'][iS] or 0) >= 50
for k in sorted(k for k, v in KH['w'].items() if '|' not in k and (v[2] == 3 or BESAR(k)) and k not in ada):
    p_ = P_['prov'].get(k, {'luas': [], 'belum': [0] * 999})
    D['kejadian'].append({'jenis': 'karhutla', 'prov': k, 'lokasi': '', 'status': 'berjalan', 'angka': {}, 'tangani': True, 'perhatian': KH['w'][k][2] == 3,
                          'sat': {'kum': sum(v or 0 for v in p_['luas'][:iS + 1]), 'sisa': p_['belum'][iS] or 0, 'hot': 0}})
    D['prioritas_baru'] = D.get('prioritas_baru', []) + [k]; print('website', H_SISA, 'ditambahkan:', harian.NAMA[k])
# 29 Okt pemilik "harus sama / tally dengan data di website": provinsi yang di WA hanya dilapor per kabupaten (Merauke) tapi ada di tabel
# website (Prioritas atau belum padam >= 50 ha) ditulis sebagai baris provinsi dengan angka provinsi website (Papua Selatan 1.618 ha)
# 30 Okt: angka kabupaten disimpan sebelum digabung ke baris provinsi, untuk tabel karhutla kejadian baru di slide 3 (Morowali Utara)
for x in D['kejadian']:
    if x['jenis'] == 'karhutla' and x['lokasi'] and x['lokasi'] not in harian.KAWASAN: x['lokasi_wa'], x['sat_kab'] = x['lokasi'], dict(x['sat'])
prov_ada = {x['prov'] for x in D['kejadian'] if x['jenis'] == 'karhutla' and not x['lokasi']}
for x in D['kejadian']:
    if x['jenis'] == 'karhutla' and x['lokasi'] and x['lokasi'] not in harian.KAWASAN and x['prov'] not in prov_ada and (W_(x['prov'])[2] == 3 or BESAR(x['prov'])):
        p_ = P_['prov'][x['prov']]; x['lokasi'] = ''; prov_ada.add(x['prov'])
        x['sat'].update(sisa=p_['belum'][iS] or 0, kum=sum(v or 0 for v in p_['luas'][:iS + 1]))
for x in D['kejadian']:
    if x['jenis'] != 'karhutla': continue
    ks = harian.KAWASAN.get(x['lokasi']) if x['lokasi'] else None
    x['sat']['hot'] = sum(W_(kk)[4] or 0 for kk in ks) if ks else W_(x['prov'] + (f"|{x['lokasi']}" if x['lokasi'] else ''))[4] or 0
    if not x['lokasi']:
        lv = W_(x['prov'])[2]
        # 26-27 Okt pemilik ("ikut data satelit", "tetap dalam penanganan karena satelit masih melihat api"): WA masih lapor sisa,
        # website belum padam 0 ha, tapi firespot hari itu > 0 -> tetap ditangani (29 Okt: Kalteng 58, Kalbar 13, Kalsel 2 firespot)
        # 29 Okt pemilik ("sisa 0 tapi ada firespot kan aneh"): syaratnya luas terbakar website hari itu > 0, dan pilnya menulis luas itu
        # ("42 ha baru 28 Okt"), bukan "sisa ± 0 ha". Firespot tanpa luas (Kalsel 2, Kalbar 13) = selesai
        lh = P_['prov'].get(x['prov'], {'luas': [0] * 999})['luas'][iS] or 0
        api_wa = x['status'] != 'selesai' and (x['sat']['hot'] or 0) > 0 and round(lh) > 0
        if api_wa and not round(x['sat']['sisa']): x['sat']['api'] = f"{harian.f0(lh)} ha baru {int(H_SISA[8:])} {harian.BULAN[int(H_SISA[5:7]) - 1][:3]}"
        x['tangani'] = round(x['sat']['sisa']) > 0 or lv == 3 or api_wa; x['perhatian'] = x['tangani'] and (x['perhatian'] or lv == 3 or round(x['sat']['sisa']) >= 100)   # 28 Okt: Prioritas atau sisa >= 100 ha (aturan 23 Okt)
        x['status'] = 'berjalan'
        print('website', H_SISA, harian.NAMA[x['prov']], ['Aman', 'Patroli', 'Siaga', 'Prioritas'][max(lv, 0)], round(x['sat']['sisa']), 'ha', x['sat']['hot'], 'FS ->', 'ditangani' if x['tangani'] else 'selesai', 'PERHATIAN' if x['perhatian'] else '')
for x in D['kejadian']:   # firespot kabupaten dari tabel website hari itu (30 Okt)
    if x.get('sat_kab') is not None: x['sat_kab']['hot'] = W_(f"{x['prov']}|{x['lokasi_wa']}")[4] or 0
# urutan tabel: baris provinsi sisa terbesar di atas, lalu kawasan/kabupaten, lalu jenis lain
# 29 Okt pemilik "ikuti data website tapi masuk akal": firespot website 0 padahal sisa masih ada (arsip 28 Okt Papsel, Maluku kosong,
# FIRMS 2.534 dan 204 deteksi) -> pil firespot "–" seperti tabel website, bukan 0
for x in D['kejadian']:
    if x['jenis'] == 'karhutla' and x['tangani'] and not x['sat']['hot'] and round(x['sat']['sisa']) > 0: x['sat']['hot'] = None
# 29 Okt pemilik: "kalau ada data kosong ambil data/hari terakhir aja, pastikan satu baris itu datanya sama (searah), tapi label tetap
# hari ini": baris provinsi yang firespot websitenya kosong -> terbakar, firespot, dan sisa semuanya dari hari terakhir yang firespotnya
# terisi (arsip kluster_hari + peta_karhutla hari itu). Sebab kosong: arsip 28 Okt ditulis 20.41 WIB dengan data macet di 06.05 WIB.
for x in D['kejadian']:
    if x['jenis'] != 'karhutla' or x['lokasi'] or x['sat']['hot'] is not None: continue
    for mundur in range(1, 6):
        h_ = (dt.date.fromisoformat(H_SISA) - dt.timedelta(days=mundur)).isoformat()
        kh_ = harian.unduh_json(f'https://centurisk97.id/data/kluster_hari/{h_}.json', os.path.join(ke, 'web', f'kluster_hari-{h_}.json'))
        w_ = kh_['w'].get(x['prov']) or [0] * 7
        if w_[4]:
            j_, p_ = P_['hari'].index(h_), P_['prov'][x['prov']]
            x['sat'].update(hot=w_[4], sisa=p_['belum'][j_] or 0, kum=sum(v or 0 for v in p_['luas'][:j_ + 1]), dari=h_)
            print('data kosong', H_SISA, harian.NAMA[x['prov']], '-> pakai', h_, w_[4], 'FS', round(x['sat']['sisa']), 'ha'); break
# 31 Okt pemilik ("jambi karena sisa 0 ha, dianggap selesai aja"): baris yang sesudah diisi data hari terakhir sisanya 0 ha dan tanpa
# luas terbakar baru hari itu = selesai
for x in D['kejadian']:
    if x['jenis'] == 'karhutla' and x['tangani'] and not round(x['sat']['sisa']) and not x['sat'].get('api'):
        x['tangani'] = x['perhatian'] = False; print('sisa 0 ha -> selesai', harian.NAMA[x['prov']], x['lokasi'])
kh = [x for x in D['kejadian'] if x['jenis'] == 'karhutla']
D['kejadian'] = sorted(kh, key=lambda x: (not x['tangani'], -x['sat']['sisa'])) + [x for x in D['kejadian'] if x['jenis'] != 'karhutla']   # 29 Okt: Merauke (kabupaten, sisa terbesar) ikut urut sisa
wa['laporan'] += len(D.get('prioritas_baru', []))   # 28 Okt: kejadian tambahan dari website ikut dihitung sebagai laporan (26 WA + 7 = 33 >= 27 menonjol)
json.dump(D, open(os.path.join(ke, 'data.json'), 'w'), ensure_ascii=False, indent=1)
import shutil, zipfile
tpl = os.path.join(G, 'cache', 'templat', 'harian-221026.pptx')
if os.path.isdir(os.path.join(ke, 'tpl')): shutil.rmtree(os.path.join(ke, 'tpl'))
zipfile.ZipFile(tpl).extractall(os.path.join(ke, 'tpl'))
subprocess.run(['node', os.path.join(G, 'harian_peta.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
subprocess.run(['node', os.path.join(G, 'harian_ikon.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
nama = os.path.join(OUT, 'Laporan Kejadian Bencana Harian 041126.pptx')
dk = harian.Deck(ke, D, wa, w, T, None); dk.BJ = None   # 29 Okt pemilik: "format seperti biasa" = 4 slide, tanpa slide status banjir
dk.LAMPIRAN = True; dk.SIAGA = True; dk.GA_GAYAS = ['lingkaran']   # 2 Nov pemilik memilih desain lingkaran (mistar dan teks dibuang)   # 2 Nov pemilik: gunung api ke bagian Status siaga bencana   # 30 Okt manager: "ada keterangan kejadian baru, sisanya taro di lampiran"
dk.GA = wa_harian.pvmbg(open(f'{S}/wa-pvmbg.txt', encoding='utf-8').read())   # 30 Okt: status gunung api PVMBG wajib tampil
dk.lbl_kolom, dk.lbl_hot, dk.lbl_kum = f'FIRESPOT DAN SISA {HL}', 'firespot', f'TERBAKAR 1 JAN–{HL}'; dk.bangun(tpl, nama)
print('ok', nama, '| hari data', D['hari'], '| cutoff', D['cutoff'], '| kejadian', dk.N_TOT, 'karhutla', len(dk.KH), 'ditangani', len(dk.KH_T), 'perlu perhatian', len(dk.SER), 'selesai', dk.N_SEL, '| Prioritas ditambah', D['prioritas_baru'])
for x in D['kejadian']:
    print(x['jenis'], x['prov'], x['lokasi'] or '(prov)', x['status'], 'DITANGANI' if x['tangani'] else 'selesai', 'PERHATIAN' if x['perhatian'] else '', {k: (round(v) if isinstance(v, (int, float)) else v) for k, v in x.get('sat', {}).items()})
# 2 Nov pemilik: baseline paparan Kepala BNPB 011126 (daftar isi, penanda bagian, kaki sumber); dibingkai mesin ppt-konsultan
import lewat_deck
SK, SG = 'Laporan Harian Dit. Koordalops BNPB, 3 Nov 2026 07.00 s.d. 4 Nov 2026 07.00 WIB', f'GIS BNPB, {HL.title()} 2026'
lewat_deck.bingkai(nama, 'harian', 'Laporan Kejadian Bencana Harian', 'Periode 3 Nov 2026, 07.00 sampai 4 Nov 2026, 07.00 WIB', T, pdf=False,
    tanpa_kepada='pemilik 2 Nov 2026: pil Disampaikan kepada dihapus, laporan harian dipresentasikan Kepala BNPB sendiri',
    bagian=[{'judul': 'Ringkasan Situasi', 'label': 'Ringkasan', 'halaman_tetap': [2]}, {'judul': 'Kejadian Baru', 'label': 'Kejadian baru', 'halaman_tetap': [3]},
            {'judul': 'Pengkinian Kejadian Sebelumnya', 'label': 'Pengkinian', 'halaman_tetap': [4]},
            {'judul': 'Status Siaga Bencana', 'label': 'Status siaga', 'halaman_tetap': [5]}],   # halaman_tetap: tanpa pembatas (mesin)
    spek_tambah={'panel_sisi': 'gelap'},   # baseline paparan Kepala 011126: panel kiri daftar isi dan pembatas berfoto sampul, gradien navy
    # 2 Nov pemilik: laporan harian tanpa slide daftar isi dan pembatas bagian; penanda bagian di atas slide tetap
    susun=[{'jenis': 'sampul'},
           {'halaman': 2, 'bagian': 1, 'sumber': f'{SK}; {SG}'}, {'halaman': 3, 'bagian': 2, 'sumber': f'{SK}; {SG}'},
           {'halaman': 4, 'bagian': 3, 'sumber': f'{SK}; {SG}'}, {'halaman': 5, 'bagian': 4, 'sumber': 'PVMBG Badan Geologi, 4 Nov 2026 06.00 WIB'},
           {'jenis': 'penutup'}])
print('mesin ok', nama)
# KRIS di sampul dan penutup serta logo BNPB 1,3x kini bawaan mesin ppt-konsultan (deck.py pasang_kris, skala_logo_bnpb), bukan tempelan repo
# 2 Nov: data website mengeja "Kota Pare Pare" (kunci pencocokan); di slide tampil ejaan resmi "Kota Parepare"
import zipfile as Z
_t = nama + '.tmp'
with Z.ZipFile(nama) as zi, Z.ZipFile(_t, 'w', Z.ZIP_DEFLATED) as zo:
    for it in zi.infolist():
        b = zi.read(it.filename)
        if it.filename.endswith('.xml'): b = b.replace('Pare Pare'.encode(), 'Parepare'.encode())
        zo.writestr(it, b)
os.replace(_t, nama)
import pdf; print('pdf', pdf.ke_pdf(nama))   # 30 Okt: PDF langsung (soffice, atau PowerPoint di Windows)
