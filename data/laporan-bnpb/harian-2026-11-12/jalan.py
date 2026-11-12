"""Laporan harian 121126 (format Revisi 37 laporan 11 Nov: VERSI_AWAL=1 ALT=2), data WA Koordalops 11-12 Nov 07.00;
turunan harian-2026-11-11/jalan.py. Website diunduh segar; BMKG dan PVMBG 12 Nov."""
import datetime as dt, json, os, subprocess, sys
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', 'generator')); sys.path.insert(0, G); os.chdir(G)   # S dihitung sebelum chdir
import harian, wa_harian
AWAL = os.environ.get('VERSI_AWAL') == '1'   # 10 Nov pemilik: "versi awal tuh maksudnya yang kayak kemaren dlu aja desainnya": 2 slide, desain 9 Nov, data 10 Nov
if AWAL:
    sys.path.insert(0, S); import desain_kemarin; desain_kemarin.pasang(('judul', 's2') if os.environ.get('ALT') == '2' else desain_kemarin.NAMA)   # alt 2: kolom Kondisi hilang, ikon bencana, gunung Siaga, legenda tengah
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
# 11 Nov: scripts/data/peta_karhutla.py (commit 629bda20) membaca harian.JENDELA_HARI saat impor; nama "harian" sudah dipegang generator/harian.py.
# Saat impor satelit, sys.modules['harian'] sementara = scripts/data/harian.py, lalu dikembalikan ke modul generator.
import importlib.util as _ilu
_gen_h = sys.modules['harian']; _p_h = os.path.normpath(os.path.join(G, '..', '..', '..', 'scripts', 'data', 'harian.py'))
_sp = _ilu.spec_from_file_location('harian', _p_h); _data_h = _ilu.module_from_spec(_sp); sys.modules['harian'] = _data_h
sys.path.insert(1, os.path.dirname(_p_h)); _sp.loader.exec_module(_data_h)
import satelit; sys.modules['harian'] = _gen_h
asli_h = satelit.hitung; satelit.hitung = lambda t, j, n, kunci=None: asli_h(t, j, n, kunci='publik')   # cache/raw diisi dari FIRMS publik 7 hari
T = dt.date(2026, 11, 12)
import re as _re
# 12 Nov: WA Koordalops memakai butir "* " (parser membaca "- ") dan menyebut 20 kejadian menonjol tetapi hanya merinci 15;
# teks dinormalkan di sini (berkas WA tetap apa adanya). Nama: "Kota. Sukabumi" -> "Kota Sukabumi", "Banggai Kep." -> "Banggai Kepulauan".
def wa_normal(t):
    t = _re.sub(r'\n\* ', '\n- ', t); t = _re.sub(r'\nDetail:', '\n- Detail:', t)
    t = t.replace('*(Kejadian Baru)*', '(Kejadian Baru)').replace('*(Pengkinian Data)*', '(Pengkinian Data)')   # urai_wa harian_lanjut: kepala tanpa bintang
    t = t.replace('Kota. Sukabumi', 'Kota Sukabumi').replace('Kab. Banggai Kep.', 'Kab. Banggai Kepulauan')
    n_ = len(_re.findall(r'\n\d+\.\s*Bencana', t)); print('WA: kejadian dirinci', n_)
    return _re.sub(r'(berdampak signifikan sejumlah\s+)\d+', lambda m: m[1] + str(n_), t)
wa = wa_harian.koordalops(wa_normal(open(f'{S}/wa-koordalops.txt', encoding='utf-8').read())); w = wa_harian.bmkg(open(f'{S}/wa-bmkg.txt', encoding='utf-8').read())
ke = os.path.join(OUT, 'kerja-121126')   # data.json laporan 071126 asli (riwayat lampiran) tidak ditimpa
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
# 6 Nov pemilik ("untuk provinsi yg udah ada di slide pengkinian, kalau ada kejadian baru gausah ditampilin"): kabupaten karhutla di provinsi
# yang sudah punya baris provinsi dilebur ke baris itu (angka provinsi website sudah memuatnya); slide 3 menulis pesan di panel Karhutla
lebur = [x for x in D['kejadian'] if x['jenis'] == 'karhutla' and x['lokasi'] and x['lokasi'] not in harian.KAWASAN and x['prov'] in prov_ada]
for x in lebur: print('ikut baris provinsi:', x['lokasi'], '->', harian.NAMA[x['prov']])
D['kejadian'] = [x for x in D['kejadian'] if x not in lebur]
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
# 6 Nov pemilik ("yang karhutla kenapa kab/kota-nya di-strip?"): baris karhutla tingkat provinsi membawa kabupaten yang masih bersisa api
# (belum padam > 0) di website pada hari datanya, sisa terbesar dulu; dipakai panel Informasi bencana versi 3
KB_ = web['peta_karhutla_kab.json']['kab']
for x in D['kejadian']:
    if x['jenis'] == 'karhutla' and not x['lokasi']:
        j_ = P_['hari'].index(x['sat'].get('dari') or H_SISA)
        x['kab_sisa'] = [[k.split('|')[1], b] for b, k in sorted(((b, k) for k, v in KB_.items() if k.split('|')[0] == str(x['prov']) for d, l, b in v['d'] if d == j_ and round(b) > 0), reverse=True)]
        x['kab_api'] = [k for k, b in x['kab_sisa']]   # 6 Nov: sisa per kabupaten ikut, untuk slide rincian kab/kota menurun
wa['laporan'] += len(D.get('prioritas_baru', []))   # 28 Okt: kejadian tambahan dari website ikut dihitung sebagai laporan (26 WA + 7 = 33 >= 27 menonjol)
# 6 Nov pemilik ("ternyata sekarang di slide itu gausah bahas karhutla lagi"): versi 4 tanpa karhutla. Kejadian karhutla dibuang
# (peta, judul, kartu, tabel, tindakan ikut); jumlah laporan dikurangi laporan karhutla WA dan tambahan website.
n_kh = sum(1 for x in wa['kejadian'] if x['jenis'] == 'karhutla') + len(D.get('prioritas_baru', []))
D['kejadian'] = [x for x in D['kejadian'] if x['jenis'] != 'karhutla']; wa['kejadian'] = [x for x in wa['kejadian'] if x['jenis'] != 'karhutla']
wa['laporan'] -= n_kh; print('tanpa karhutla: laporan', wa['laporan'], 'menonjol', len(D['kejadian']))
# 7 Nov atasan (Bang Ghozi, WA 08.45-09.00: "Tambahkan dong. Bromo waspada", "Yg 24 jam terakhir", "Slide 2 aman kok", "Slide 1 aja,
# di kinikan datanya"): erupsi Gn. Bromo Kamis 5 Nov 17.11 WIB (PVMBG via pos pengamatan; kolom abu ± 500 m, amplitudo 23 mm, 46 detik,
# status Waspada, radius 1 km dari kawah aktif) masuk Informasi bencana slide 1. Tidak ada di WA Koordalops, jadi ditambahkan di sini.
# 8-9 Nov: erupsi Gn. Bromo (5 Nov) tidak ditambahkan lagi: di luar 24 jam terakhir dan tidak ada di WA Koordalops/PVMBG
# 7 Nov pemilik ("coba yg ntt gempa hapus, itu slide 1 tuh yg bener2 terkini dalam 24 jam aja"): kejadian Pengkinian Data / Update WA
# (gempa NTT, banjir Aceh Selatan) dibuang; tinggal Kejadian Baru + erupsi Bromo. Jumlah laporan WA tetap.
# 11 Nov pemilik ("tampilin juga bencana yang masih ongoing: banjir yang belum surut, cuaca ekstrem yang masih ada, kekeringan yang masih ada",
# "masukin juga tanggal awal mulai bencana", "jangan lupa di petanya juga"): slide 1 = kejadian baru + kejadian yang masih berlangsung menurut
# Kondisi Mutakhir WA 11 Nov. Masih berlangsung: Pidie Jaya (masih menggenangi, tebing jebol meluas), Blora (masih penanganan; kejadian 9 Nov
# yang sama, atasan 11 Nov), kekeringan Boyolali, Kendal, Pekalongan (Siaga Darurat Provinsi s.d. 31 Des, distribusi air bersih).
# Tidak masuk: Gayo Lues (air sudah surut, pembersihan; status TD berakhir 10 Nov), Jember (aman dan kondusif).
# MULAI = laporan pertama rentetan episode yang tidak putus (jeda <= 30 hari): laphar_riwayat.json (arsip s.d. 28 Okt) + arsip WA harian-*:
# Pidie Jaya logbook Pusdalops 1 Nov (banjir 25 Okt sudah surut 25-26 Okt = kejadian lain; sejak 1 Nov tidak pernah surut; WA pertama 3 Nov; web 5 Nov = kabar terakhir); Blora WA 9 Nov (angin kencang, Kejadian Baru); Sumbawa WA 10 Nov; Boyolali laphar 24 Jun (rentetan 24 Jun, 10 Jul, 30 Agu, 24 Okt);
# Kendal laphar 11 Okt; Pekalongan laphar 27 Jul.
# 11 Nov pemilik: "yang ongoing tuh BENCANANYA, bukan penanganannya" -> Blora dibuang (angin 9 Nov sudah lewat, tinggal penanganan);
# Pidie Jaya (genangan masih ada) dan kekeringan (kemarau masih berlangsung) tetap
# 12 Nov (WA 11-12 Nov): masih berlangsung = banjir Pidie Jaya (masih menggenangi), kekeringan Boyolali, Pasuruan, Banggai Kepulauan
# (distribusi air bersih). Tidak masuk: Gayo Lues (air sudah surut), gempa NTT (pemulihan). Kendal, Pekalongan, Sumbawa tidak ada di WA hari ini.
# MULAI: Pasuruan laphar 18 Jun (rentetan 18 Jun s.d. 16 Okt, jeda <= 27 hari); Banggai Kepulauan laphar 4 Sep (WA: dropping air
# 27 Agu s.d. 11 Nov tanpa putus). Kejadian baru Kota Sukabumi dan Blitar: Laphar 11 Nov.
BERLANGSUNG = {'Pidie Jaya': '2026-11-01', 'Boyolali': '2026-06-24', 'Pasuruan': '2026-06-18', 'Banggai Kepulauan': '2026-09-04'}
MULAI_BARU = {'Kota Sukabumi': '2026-11-11', 'Sukabumi': '2026-11-11', 'Blitar': '2026-11-11'}
# label WA "Kejadian Baru" padahal kejadian lama (atasan 11 Nov: Blora = kejadian 9 Nov, KK bertambah) -> bukan baru, dan bencananya sudah lewat
for x in D['kejadian'] + wa['kejadian']:
    if x.get('lokasi') == 'Blora': x['baru'] = False
lama = [f"{x['jenis']} {x['lokasi'] or x['prov']}" for x in D['kejadian'] if not x.get('baru') and x['lokasi'] not in BERLANGSUNG]
D['kejadian'] = [x for x in D['kejadian'] if x.get('baru') or x['lokasi'] in BERLANGSUNG]; wa['kejadian'] = [x for x in wa['kejadian'] if x.get('baru') or x.get('lokasi') in BERLANGSUNG]
for x in D['kejadian']:
    x['baru'] = x['lokasi'] in MULAI_BARU; x['mulai'] = MULAI_BARU.get(x['lokasi']) or BERLANGSUNG[x['lokasi']]
    if x['lokasi'] == 'Banggai Kepulauan': x['lokasi'] = 'Banggai Kep.'   # 12 Nov: nama penuh terpotong di kolom KAB/KOTA (singkatan resmi Koordalops)
print('sudah selesai, dibuang:', lama, '| tampil:', [(x['jenis'], x['lokasi'], x['mulai'], 'baru' if x['baru'] else 'berlangsung') for x in D['kejadian']])
# 7 Nov pemilik ("yang banjir cek masih ada apa udah surut", "pake label pill ya, termasuk yg kk dll nya"): pil KONDISI per kejadian dari
# Kondisi Mutakhir laphar Koordalops 6 Nov (sampai 7 Nov 07.00 WIB); jenis pil: selesai, surut (masih genangan), tangani, waspada
# 11 Nov: pil KONDISI dari Kondisi Mutakhir WA Koordalops 10 Nov 07.00 s.d. 11 Nov 07.00 WIB (Revisi 14 tanpa kolom Kondisi, tetap diisi)
KONDISI = {'Kota Sukabumi': ('Pembersihan', 'tangani'), 'Sukabumi': ('Pembersihan', 'tangani'), 'Blitar': ('Pembersihan', 'tangani'), 'Pidie Jaya': ('Masih tergenang', 'surut'),
           'Boyolali': ('Distribusi air', 'tangani'), 'Pasuruan': ('Distribusi air', 'tangani'), 'Banggai Kep.': ('Distribusi air', 'tangani')}
for x in D['kejadian']:
    if x['lokasi'] in KONDISI: x['kondisi_pil'] = KONDISI[x['lokasi']]
    else: print('PERINGATAN tanpa pil kondisi:', x['jenis'], x['lokasi'])
# 6 Nov pemilik ("perlu perhatian gausah, hapus aja"): data.json untuk peta tanpa tanda perlu perhatian (garis merah provinsi);
# D di memori tetap utuh untuk hitungan lain
json.dump({**D, 'kejadian': [{**x, 'perhatian': False} for x in D['kejadian']]}, open(os.path.join(ke, 'data.json'), 'w'), ensure_ascii=False, indent=1)
# pemilik 5 Nov 2026: kondisi banjir WA laporan harian ini ikut memperbarui Pantau Banjir /bnpb/dalops (R2). Mesin dengan arsip logbook:
# rakit ulang logbook + WA; tanpa arsip: tempel WA ke berkas yang tayang. Gagal unggah (wrangler belum login) tidak menghentikan laporan.
subprocess.run([sys.executable, 'scripts/data/dalops_banjir.py', '--unggah'], cwd=os.path.normpath(os.path.join(S, '..', '..', '..')))   # 10 Nov: banjir baru Pidie Jaya
import shutil, zipfile
tpl = os.path.join(G, 'cache', 'templat', 'harian-221026.pptx')
if os.path.isdir(os.path.join(ke, 'tpl')): shutil.rmtree(os.path.join(ke, 'tpl'))
zipfile.ZipFile(tpl).extractall(os.path.join(ke, 'tpl'))
subprocess.run(['node', os.path.join(G, 'harian_peta.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
subprocess.run(['node', os.path.join(G, 'harian_ikon.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
# 6 Nov pemilik ("coba buat file rev 2, jadinya slide 3 dihapus, terus banjir sama angin kencang yang ada di slide 3 gabung ke slide 4"):
# REV=2 -> berkas "(rev2)", tanpa slide Kejadian Baru, kejadian baru ikut slide Pengkinian
REV2 = False
# 6 Nov pemilik (versi 3, "perombakan banyak", acuan versi biasa): tanpa sampul, penutup, lampiran, slide 3 dan 4; tinggal 2 slide:
# ringkasan (tanpa perlu perhatian, panel Status penanganan diganti Informasi bencana) dan status siaga apa adanya; KRIS + BNPB di tiap slide
REV3 = True
ALT2 = os.environ.get('ALT') == '2'   # 10 Nov pemilik: "di slide mana pun gausah bahas tentang karhutla dulu, buat file baru aja nanti, alt 2"
nama = os.path.join(OUT, 'Laporan Kejadian Bencana Harian 121126' + (' (rev2)' if REV2 else '') + (' alt 2' if ALT2 and not AWAL else '')   # 11 Nov: format Revisi 14 (VERSI_AWAL=1 ALT=2) bernama tanpa alt 2
    + '' + (f" rev {os.environ['ALT_REV']}" if ALT2 and os.environ.get('ALT_REV') else '') + '.pptx')
dk = harian.Deck(ke, D, wa, w, T, None); dk.BJ = None; dk.TANPA_BARU = REV2; dk.V3 = dk.KRIS_ISI = REV3; dk.ALT_RINCI = False   # 6 Nov: halaman alternatif kab/kota menurun ikut dibangun   # 29 Okt pemilik: "format seperti biasa" = 4 slide, tanpa slide status banjir
dk.CD_PIL = 960120; dk.INFO_PIL = True; dk.LAMPIRAN = True; dk.SIAGA = True; dk.GA_GAYAS = ['lingkaran']   # 2 Nov pemilik memilih desain lingkaran (mistar dan teks dibuang)   # 2 Nov pemilik: gunung api ke bagian Status siaga bencana   # 30 Okt manager: "ada keterangan kejadian baru, sisanya taro di lampiran"
dk.GA = wa_harian.pvmbg(open(f'{S}/wa-pvmbg.txt', encoding='utf-8').read())   # 30 Okt: status gunung api PVMBG wajib tampil
# 5 Nov atasan ("daftar kejadian yang sudah selesai aja", "bulan yang sedang berjalan, nambah terus"): lampiran sesudah penutup,
# tanpa indikator bagian, berisi kejadian selesai 1 bulan ini s.d. T dari data.json tiap laporan harian bulan ini
def data_hari(t):
    f = os.path.join(S, '..', f'harian-{t.isoformat()}', f'kerja-{t:%d%m%y}', 'data.json')
    if not os.path.exists(f): print('lampiran: tidak ada data harian', t); return []
    return json.load(open(f, encoding='utf-8'))['kejadian']
T1 = T.replace(day=1)
riwayat = [(T1 + dt.timedelta(days=n), data_hari(T1 + dt.timedelta(days=n))) for n in range(T.day - 1)]
dk.LAMP_TAMBAH = dk.lampiran_selesai_bulan(riwayat, data_hari(T1 - dt.timedelta(days=1)))
if REV3: dk.LAMP_TAMBAH = []   # versi 3: lampiran dihapus
# 10 Nov pemilik: urutan 5 slide = ringkasan, status siaga, hidrometeorologi, geologi dan vulkanologi, prediksi (harian_lanjut.py)
import harian_lanjut as HL2
# 11 Nov: format Revisi 14 (VERSI_AWAL) hanya 2 slide; slide lanjutan tidak dibangun (siapkan butuh gempa di WA, hari ini tidak ada)
# 12 Nov: format 3 slide tanpa slide geologi; entri gempa NTT (pengungsi 26.672 beda dari bahan-laphar 9 Nov) tidak dikirim ke bahan prediksi
_wa_tanpa_gempa = _re.sub(r'\n\d+\. Bencana Alam Gempa Bumi.*?(?=\n\n\*[A-Z]\.|\n\n\n|\Z)', '', wa_normal(open(f'{S}/wa-koordalops.txt', encoding='utf-8').read()), flags=_re.S)
B3 = HL2.siapkan(S, T, ke, web, H_SISA, KH, _wa_tanpa_gempa, open(f'{S}/wa-bmkg.txt', encoding='utf-8').read(), w)
B3['bmkg_ga'] = dk.GA
dk.TANPA_KONDISI = ALT2 and (AWAL or bool(os.environ.get('ALT_REV')))   # 10 Nov pemilik: "itu kondisi gausah dulu, alt 2 rev 2 ya filenya"
if ALT2:
    B3['tanpa_karhutla'] = True   # jumlah dari Kerugian Materiil laphar 9 Nov: huntara Gayo Lues 10; fasdah Padang Pariaman 2, Jember 5; jembatan Gayo Lues 2, Padang Pariaman 2; fasdik Gayo Lues 1, Jember 1, Malang 2; akses jalan Pidie Jaya 1, Padang Pariaman 1
    B3['infra'] = [('Huntara rusak ringan', 10), ('Fasilitas ibadah', 7), ('Jembatan', 4), ('Fasilitas pendidikan', 4), ('Akses jalan', 2)]
B3['kondisi'] = {'Pidie Jaya': ('Berangsur surut', 'surut'), 'Gayo Lues': ('Surut, pembersihan', 'tangani'), 'Padang Pariaman': ('Surut total', 'selesai'),
                 'Sukoharjo': ('Kondusif', 'selesai'), 'Blora': ('Pembersihan material', 'tangani'), 'Jember': ('Pembersihan material', 'tangani'), 'Malang': ('Pembersihan material', 'tangani')}
B3['strip_hid'] = [('awas_putih', 'Status berakhir 10 Nov', 'Masa tanggap darurat Gayo Lues berakhir. Air sudah surut, pembersihan masih berjalan.'),
                   ('hujan_putih', 'Banjir di wilayah peringatan', 'Aceh dan Sumatera Barat masuk peringatan Siaga hujan lebat BMKG sampai 12 Nov.'),
                   ('rumah_putih', 'Kerusakan terberat di Gayo Lues', '105 rumah rusak berat atau hanyut, 10 huntara rusak ringan, 1 jembatan gantung rusak berat.')]
def strip_geo(B):
    g = B['bahan']['gempa']; h = g['huntara']; tot = h['selesai'] + h['lebih50'] + h['kurang50']; mg = max(g['kab'], key=lambda k: k[4]); i_ = B['gunung_insight']
    f1 = HL2.f1
    return [('rumah_putih', f"Huntara selesai {f1(h['selesai'] / tot * 100)}%", f"{HL2.f0(h['lebih50'])} unit di atas 50%, {HL2.f0(h['kurang50'])} unit di bawah 50%, {HL2.f0(h['lahan'])} unit penyiapan lahan."),
            ('truk_putih', f"Kebutuhan R3P Rp{f1(g['kebutuhan'] / 1e12)} triliun", f"{f1(mg[4] / g['kebutuhan'] * 100)}% di {mg[0]}. Nilai Jitupasna dan R3P masih fluktuatif."),
            ('gunung_putih', f"Semeru {i_['Semeru'][0]} letusan dalam sehari", f"Rata-rata 9 hari sebelumnya {f1(i_['Semeru'][1])}. Merapi {i_['Merapi'][0]} guguran, rata-rata {f1(i_['Merapi'][1])}.")]
B3['strip_geo'] = strip_geo
def strip_pred(B):
    pk = {k: v for k, v in B['pr']}; hh = B['pr_hari']; H_ = harian.NAMA
    top = max(B['pr'], key=lambda kv: max(kv[1]['b'])); i = top[1]['b'].index(max(top[1]['b']))
    fw = B['fwi'][0]; rob = B['rob'][0]
    if B.get('tanpa_karhutla'):
        kena = [n for n, b_, l_ in B['lok_pred'] if max(b_ + l_) >= 2]
        ketiga = ('rumah_putih', 'Lokasi terdampak Siaga kembali' if kena else 'Lokasi terdampak tanpa Siaga', f"{', '.join(kena)} berstatus Siaga atau Awas banjir atau longsor dalam 3 hari." if kena else 'Tidak ada lokasi kejadian yang mencapai Siaga banjir atau longsor dalam 3 hari.')
    return [('banjir_putih', f"Puncak banjir {HL2.TGL(hh[i])}", f"{H_[top[0]]} {max(top[1]['b'])} kecamatan Siaga dan Awas banjir, longsor {top[1]['l'][i]} kecamatan."),
            (('tetes_putih', 'Laut dan pesisir', f"{len(B['gelombang'])} perairan bergelombang sedang atau lebih, {len(B['rob'])} peringatan banjir rob BMKG berlaku pada {HL2.TGL(B['T'])}.") if B.get('gelombang') is not None else
             ('hujan_putih', 'Aceh dan Sumatera Barat', f"Hujan lebat berlanjut di wilayah yang sudah terdampak: Aceh {pk['11']['b'][0]} dan Sumatera Barat {pk['13']['b'][0]} kecamatan Siaga banjir pada {HL2.TGL(hh[0])}.")),
            ketiga if B.get('tanpa_karhutla') else ('api_putih', f"Bahaya karhutla tertinggi di {H_[fw[1]]}", f"Indeks cuaca kebakaran (FWI) di {H_[fw[1]]} naik sampai {HL2.f1(max(fw[2]))} pada {HL2.TGL(B['fwi_hari'][fw[2].index(max(fw[2]))])}.")]
B3['strip_pred'] = strip_pred
# 11 Nov pemilik ("gunakan kalimat lengkap"): judul dan isi pita "Yang diwaspadai" berupa kalimat utuh
def strip_pred_kalimat(B):
    hh = B['pr_hari']; H_ = harian.NAMA; BL = lambda d: f"{d.day} {harian.BULAN[d.month - 1]}"
    top = max(B['pr'], key=lambda kv: max(kv[1]['b'])); i = top[1]['b'].index(max(top[1]['b']))
    rw = {r['wilayah'] for r in B['rob']}; fw = max(B['fwi'], key=lambda t: max(t[2])); j = fw[2].index(max(fw[2]))
    return [('banjir_putih', f"Banjir paling luas terjadi pada {BL(hh[i])}.",
             f"Di {H_[top[0]]}, {max(top[1]['b'])} kecamatan berstatus Siaga atau Awas banjir dan {top[1]['l'][i]} kecamatan Siaga atau Awas longsor."),
            ('tetes_putih', 'Gelombang dan banjir rob masih berlaku.',
             f"BMKG memperingatkan gelombang sedang atau lebih di {len(B['gelombang'])} perairan dan banjir rob di {len(rw)} pesisir."),
            udara_kalimat(B)]
# 12 Nov pemilik ("karhutla/fwi di slide prediksi hapus dlu"): butir ketiga pita bawah = udara, provinsi dengan kab/kota Tidak Sehat terbanyak
def udara_kalimat(B):
    per = {}
    for nm2, r_ in B['udara']:
        v_ = max([v for v in r_ if v is not None] or [0])
        if v_ > 55.4: a_ = per.setdefault(B['udara_prov'][nm2], [0, 0]); a_[0] += 1; a_[1] = max(a_[1], v_)
    k, (n, mx) = max(per.items(), key=lambda kv: kv[1])
    return ('asapsolid_putih', f"Udara tidak sehat paling luas di {harian.NAMA[k]}.",
            f"PM2,5 di {n} kab/kota {harian.NAMA[k]} diperkirakan di atas 55,4 µg/m³, tertinggi {HL2.f1(mx)} µg/m³.")
B3['strip_pred'] = strip_pred_kalimat
dk.HAL_TAMBAH = [] if AWAL else HL2.halaman(dk, B3)   # AWAL: slide prediksi saja, dipasang di bawah
if os.environ.get('ALT_REV') == '3':   # 10 Nov atasan: prediksi "bisa lebih banyak lagi selain banjir dan longsor"
    import harian_prediksi as HP
    HP.siapkan(B3, ke); dk.HAL_TAMBAH[2] = (dk.HAL_TAMBAH[2][0], lambda: HP.gambar(dk, B3))
if AWAL:   # pil "10 KK mengungsi" menempel pil kondisi pada lebar kolom 9 Nov: kolom Dampak dilebarkan, teks kondisi dipendekkan supaya tetap di dalam tabel
    dk.HAL_TAMBAH = []
    # 11 Nov pemilik ("coba buat 1 slide untuk prediksi bencana"): slide 3 = prediksi multi-ancaman (harian_prediksi.py, desain 10 Nov alt 2 rev 3);
    # panel lokasi terdampak hanya lokasi yang tampil di slide 1 (kejadian baru + masih berlangsung)
    import harian_prediksi as HP
    HP.siapkan(B3, ke)
    B3['udara_unik'] = [(n_.replace('Kota Administrasi ', 'Kota '), r_) for n_, r_ in B3['udara_unik']]   # nama panjang terpotong di panel kualitas udara
    _tampil = {x['lokasi'] for x in D['kejadian']}
    B3['lok_pred'] = [r for r in B3['lok_pred'] if r[0] in _tampil]
    print('prediksi: lokasi', [r[0] for r in B3['lok_pred']], '| prakiraan dibuat', B3['pr_dibuat'])
    B3['tanpa_karhutla'] = False   # 11 Nov pemilik ("karhutla masukin dl aja"): slide prediksi memuat panel bahaya karhutla (FWI) dan butir karhutla di pita bawah
    # 11 Nov pemilik ("prediksinya coba jadi 1 minggu ke depan", pilih opsi 1): panel cuaca diganti hujan lebat sampai hari terakhir prakiraan
    # (cuaca_prakiraan.json website: Open-Meteo kisi 0,25 derajat, ambang hujan lebat 50 mm/hari = scripts/cuaca/cuaca.py HUJAN[0]).
    # Status banjir dan longsor tetap 3 hari (model 72 jam); tiap panel menulis tanggalnya sendiri.
    CP_ = harian.unduh_json('https://centurisk97.id/banjir/data/cuaca_prakiraan.json', os.path.join(ke, 'lanjut', 'banjir-data-cuaca_prakiraan.json'))
    ih_ = [i for i, h in enumerate(CP_['hari']) if h >= T.isoformat()][:3]   # 11 Nov pemilik: "jadinya 3 hari dlu aja" (sama dengan status banjir dan longsor)
    hit_ = {}
    for la_, lo_, pv_, mm_, _ in CP_['sel']:
        r_ = hit_.setdefault(pv_, [0] * len(ih_))
        for j_, i in enumerate(ih_):
            if (mm_[i] or 0) >= 50: r_[j_] += 1
    B3['cuaca'] = sorted(((k, v) for k, v in hit_.items() if sum(v)), key=lambda t: -sum(t[1]))
    B3['cuaca_hari'] = [dt.date.fromisoformat(CP_['hari'][i]) for i in ih_]
    # 11 Nov pemilik lewat sesi lain ("boleh coba"): panel dikelompokkan per PENYEBAB, judul menyebut penyebabnya supaya tidak tumpang tindih;
    # banjir rob = pasang air laut, beda dari banjir karena hujan
    B3['cuaca_judul'] = 'HUJAN: LOKASI HUJAN LEBAT, 50 MM ATAU LEBIH'
    B3['banjir_judul'] = 'HUJAN: KECAMATAN SIAGA DAN AWAS'
    B3['peta_judul'] = f"HUJAN: PERINGATAN DINI BMKG, {B3['bmkg']['periode'].upper().replace('NOVEMBER 2026', 'NOV').replace('–', 'SAMPAI')}"
    _n_fw7 = sum(1 for _, k_, v_ in B3['fwi'] if max(v_) >= HL2.FW[2][0])   # tinggi ke atas
    B3['fwi_judul'] = f'KARHUTLA: FWI TINGGI, {min(5, _n_fw7)} DARI {_n_fw7} PROVINSI'   # 11 Nov pemilik: "ini juga cuma 5 daerah karhutla?"
    B3['udara_judul'] = f"UDARA: PM2,5 TIDAK SEHAT, {B3['udara_hari'][0].day}–{B3['udara_hari'][-1].day} NOV"   # 11 Nov pemilik: "24 jam ini membingungkan"
    B3['udara_tabel'] = True
    B3['tanpa_abu'] = True
    # 11 Nov sore pemilik ("ikutin ini": tabel penyebab Hujan, Laut, Karhutla, Udara, Gunung api; panel hujan jadi satu; peta BMKG dihapus,
    # peringatan dini BMKG masuk panel hujan; judul udara tanpa tanggal)
    B3['tata3'] = True
    B3['tanpa_fwi'] = True   # 12 Nov pemilik: panel karhutla/FWI dihapus dulu, panel laut setinggi kolom tengah
    # 12 Nov: BMKG Siaga hujan lebat 6 provinsi dan angin kencang 8 provinsi -> dua nama pertama + "dan N provinsi lain" supaya muat satu baris
    B3['nm_bmkg'] = lambda ks: ', '.join(harian.NAMA[k] for k in ks) if len(ks) <= 3 else f"{harian.NAMA[ks[0]]}, {harian.NAMA[ks[1]]}, dan {len(ks) - 2} provinsi lain"
    B3['hujan_judul'] = 'HUJAN: BANJIR, LONGSOR, DAN CUACA EKSTREM'
    B3['udara_judul'] = 'UDARA: PM2,5 TIDAK SEHAT'
    B3['ga_judul'] = 'GUNUNG API: STATUS DAN SEBARAN ABU'
    B3['tanpa_ga'] = True
    B3['laut_semua'] = True   # 11 Nov pemilik: panel laut mencakup semua (gelombang tinggi + jumlah sedang, rob per tanggal)   # 11 Nov pemilik: "gunung api gausah dimasukin lagii" (panel dan kartu)   # 11 Nov pemilik: "ini hapus aja" (panel peluang abu vulkanik)
    B3['abu_judul'] = 'GUNUNG API: PELUANG ABU SAMPAI KE LOKASI'
    _fw_st = HL2.FW[-1][0]
    _n_fw = sum(1 for _, k_, v_ in B3['fwi'] if max(v_) >= _fw_st)
    _n_ga = sum(1 for g_ in dk.GA['gunung'] if g_['level'] in ('Siaga', 'Awas'))
    # 11 Nov pemilik: kartu banjir dan longsor = gabungan 3 hari (sama dengan judul dan lampiran), label tanpa tanggal
    B3['kartu_fn'] = lambda T_: [(T_[0][0], T_[0][1], harian.f0(LP3['n_b']), 'kec. Siaga banjir', T_[0][4]), (T_[1][0], T_[1][1], harian.f0(LP3['n_l']), 'kec. Siaga longsor', T_[1][4]), T_[4], T_[3],
                                 ('hujan_oranye', harian.T_ORG, harian.f0(sum(1 for v_ in B3['level'].values() if v_ in ('awas', 'siaga'))), 'provinsi Siaga hujan lebat', harian.ORG),   # 12 Nov: kartu FWI diganti peringatan hujan lebat BMKG
                                 ('asapsolid_slate', harian.T_SLATE, harian.f0(B3['udara_n']), 'kab/kota udara tidak sehat', harian.SLATE)]   # 11 Nov: kartu gunung api diganti perairan gelombang tinggi (laut)
    _ph = max(range(len(ih_)), key=lambda j: sum(v[j] for _, v in B3['cuaca']))
    B3['cuaca_kartu'] = f"lokasi hujan lebat, {B3['cuaca_hari'][_ph].day} Nov"   # 1 lokasi = kotak kisi 25 km
    B3['laut_judul'] = 'LAUT: GELOMBANG DAN ROB (AIR PASANG)'
    print('hujan lebat per hari', [sum(v[j] for _, v in B3['cuaca']) for j in range(len(ih_))], B3['cuaca'][:5], '| prakiraan', CP_['dibuat'])
    _jp = HL2.judul_pred(B3)   # 11 Nov: kembali 3 hari, judul bawaan "Prediksi 3 hari: ..."
    dk.HAL_TAMBAH = [(_jp, lambda: HP.gambar(dk, B3))]
    # 11 Nov pemilik: lampiran daftar kecamatan Siaga dan Awas banjir dan longsor (angka di slide prediksi), tanpa indikator bagian
    import harian_lampiran as HLP
    LP3 = HLP.siapkan(ke, T); print('lampiran kecamatan', LP3['n_kec'], 'kab', LP3['n_kab'], 'banjir', LP3['n_b'], 'longsor', LP3['n_l'])
    # 12 Nov pemilik: "jangan dlu buat lampiran" -> halaman lampiran tidak dibangun (LP3 tetap dipakai untuk angka kartu dan judul)   # 11 Nov pemilik ("ya"): daftar lengkap karhutla, gelombang, rob di lampiran
    B3['banjir_judul'] = f"HUJAN: SIAGA DAN AWAS, {min(6, len(LP3['prov']))} DARI {len(LP3['prov'])} PROVINSI"   # 11 Nov pemilik: "ini tuh memang hanya 6 daerah?"
    # 11 Nov pemilik ("ini coba yang lebih menggambarkan secara general"): judul prediksi merangkum semua penyebab; angka = lampiran dan kartu
    _P, _Q = (lambda t: (t, harian.INK, True)), (lambda t: (t, harian.ORG, True))
    # 11 Nov pemilik ("ini juga kalimatnya benerin"): judul berupa kalimat utuh
    _hz = B3['pr_hari'][-1]
    dk.HAL_TAMBAH[0] = ([_P(f'Hingga {_hz.day} {harian.BULAN[_hz.month - 1][:3]}, '), _Q(f"{harian.f0(LP3['n_kec'])} kecamatan"), _P(' berstatus Siaga banjir atau longsor, udara '),
                         _Q(f"{harian.f0(B3['udara_n'])} kab/kota"), _P(' tidak sehat, dan '), _Q(f"{len({r['wilayah'] for r in B3['rob']})} pesisir"), _P(' berpotensi banjir rob')], dk.HAL_TAMBAH[0][1])   # 12 Nov: karhutla diganti banjir rob   # muat dua baris   # 11 Nov pemilik: daerah di atas ambang Tidak Sehat
    if ALT2:   # 10 Nov pemilik, Revisi 5 alt 2: "4 kejadian menonjol di 3 provinsi" di judul "gausah ada"
        dk.KARTU_ALT = dk.SIAGA_INFO = dk.TINDAK_INFO = dk.KOLOM_MULAI = True;   # 11 Nov: kolom MULAI di Informasi Bencana
        dk.INFO_Y = (1280160, 5010912)   # pemilik 10 Nov: Informasi Bencana dan Status Siaga naik sejajar atas kartu
        # WA BMKG 12 Nov: PM2,5 Kemayoran 82,3 dan Palembang 76,9 Tidak Sehat; Awas hujan sangat lebat Sumut; Siaga hujan lebat Aceh, Sumbar, Jambi,
        # Bengkulu, Kaltim, Papua Barat Daya; angin kencang di 8 provinsi (Aceh, Sumut, Sumbar, Kepri, Jambi, Bengkulu, Kaltim, Papua Barat Daya)
        dk.PERINGATAN_PETA = [(97.8, 2.3, '|Hujan lebat', 'oranye', 'kanan'), (99.8, 1.4, 'Sumatera Utara|Hujan sangat lebat', 'merah', 'kanan'), (100.6, -0.7, 'Sumatera Barat|Hujan lebat', 'oranye', 'kanan'),
                              (102.9, -1.7, 'Jambi|Hujan lebat', 'oranye', 'kanan'), (102.3, -3.7, 'Bengkulu|Hujan lebat', 'oranye', 'kiri'), (104.7, -3.1, 'Palembang|PM2,5 Tidak Sehat', 'oranye', 'kanan'),
                              (106.6, -5.45, 'Jakarta|PM2,5 Tidak Sehat', 'oranye', 'kiri'), (116.4, 0.6, 'Kalimantan Timur|Hujan lebat', 'oranye', 'kanan'), (132.2, -1.3, 'Papua Barat Daya|Hujan lebat', 'oranye', 'kanan')]
        # 11 Nov atasan ("Yang akan dilakukan BNPB harusnya tally dengan jenis bencana yang ditampilkan"): satu kartu per jenis, urut kekeringan, banjir, cuaca ekstrem
        # kekeringan Boyolali 12.022 + Kendal 2.706 + Pekalongan 12.934 = 27.662 KK (WA Koordalops 11 Nov)
        # 11 Nov pemilik ("jangan pakai klausa/frasa nanggung, gunakan kalimat yang baik dan mudah dipahami"): judul = jenis bencana, isi = kalimat utuh
        dk.JUDUL_STRIP = 'RENCANA AKSI'   # 11 Nov pemilik: "jangan apa yang dilakukan BNPB, tapi Rencana Aksi"
        # kekeringan Boyolali 12.022 + Pasuruan 5.269 + Banggai Kepulauan 1.541 = 18.832 KK; rumah rusak cuaca ekstrem Kota Sukabumi 20 + Blitar 14 = 34 (WA Koordalops 12 Nov)
        dk.STRIP_KARTU = [('tetes_putih', 'Kekeringan', 'Mendukung BPBD menyalurkan air bersih ke ±18.832 KK di tiga kabupaten.'),
                          ('banjir_putih', 'Banjir', 'Memantau banjir Pidie Jaya yang masih berdampak pada ±8.608 KK.'),
                          ('angin_putih', 'Cuaca ekstrem', 'Mengkaji cepat dampak di Kota Sukabumi dan Blitar yang merusak ±34 rumah.')]
        dk.PERINGATAN_KET = True   # 11 Nov pemilik: keterangan ikon kalender (periode berlaku) dan jam (waktu diukur)
        dk.RES_T = 1325880   # 11 Nov pemilik: periode tetap di bawah daerah, baris dipertinggi supaya tidak padat
        dk.PERINGATAN_BARIS = [('asapsolid_oranye', 'Kualitas udara', 'Jakarta & Palembang (>75)', 'Tidak Sehat', 'oranye', 'µg/m³, 12 Nov 06.00 WIB', 'jam_navy'), ('hujansolid_merah', 'Hujan sangat lebat', 'Sumatera Utara', 'Awas', 'merah', '10–12 November'),
                               ('hujansolid_oranye', 'Hujan lebat', 'Aceh, Sumbar, dan 4 lainnya', 'Siaga', 'oranye', '10–12 November'), ('anginsolid_oranye', 'Angin kencang', 'Aceh, Sumut, dan 6 lainnya', 'Berpotensi', 'oranye', '10–12 November')]
        tindak_asli = dk.tindak(); tindak_asli = [(tindak_asli[0][0], tindak_asli[0][1], [t.replace('Mengkaji cepat dampak', 'Kaji cepat') for t in tindak_asli[0][2]])] + [(tindak_asli[2][0], 'Peringatan dini', ['•  Kemayoran Jakarta mencatat PM2,5 82,3 µg/m³ dan Palembang 76,9 µg/m³, Tidak Sehat', '•  Angin kencang berpotensi terjadi di 8 provinsi', '•  Hujan sangat lebat berpotensi di Sumut, lebat di 6 provinsi'])]; dk.tindak = lambda: tindak_asli   # pemilik 10 Nov: Keselamatan warga dan Peringatan dini BMKG jadi satu, kalimat langsung, tanpa penyediaan masker; WA BMKG 10 Nov   # pita bawah dihitung sebelum angin kencang digabung, supaya kotak Peringatan dini BMKG tidak tergeser
        for x in D['kejadian']:   # pemilik: "ini juga gabung aja jadi cuaca ekstrem", "ini langsung 10 KK aja"; satu nama di judul, kartu, peta, legenda, dan tabel
            if x['jenis'] == 'angin': x['jenis'] = 'cuaca'
            if x.get('dampak_pil') == '10 KK mengungsi': x['dampak_pil'] = '10 KK'
        judul_asli = dk.judul   # 11 Nov: judul memisahkan kejadian baru dan yang masih berlangsung
        # 11 Nov atasan ("Kenapa berubah formatnya bro? Kan harusnya 5 kejadian bencana xx banjir xx kekeringan"): format judul tetap
        # "Terdapat N kejadian bencana dengan rincian ..." per jenis (kejadian baru dan masih berlangsung tidak dipisah di judul)
        def _judul_jenis(a):
            nm_ = lambda j: 'kekeringan' if j == 'kekeringan' else (lambda v: v[0][0].lower() + v[0][1:])(harian.JENIS_LAIN[j])
            urut_ = ['banjir', 'cuaca', 'kekeringan'] + [j for j in harian.JENIS_LAIN if j not in ('banjir', 'cuaca')]
            hit_ = [(n_, nm_(j)) for j in urut_ for n_ in [sum(1 for x in D['kejadian'] if x['jenis'] == j)] if n_]
            o_ = [(a[0][0].rstrip(': ') + ': Terdapat ', *a[0][1:]), a[1], (' kejadian bencana dengan rincian ', *a[0][1:])]
            for i_, (n_, l_) in enumerate(hit_):
                if i_: o_.append((', dan ' if i_ == len(hit_) - 1 and len(hit_) > 2 else ' dan ' if i_ == len(hit_) - 1 else ', ', *a[0][1:]))
                o_ += [(harian.f0(n_), *a[1][1:]), (' ' + l_, *a[0][1:])]
            return o_
        dk.judul = lambda: (lambda a, b: (_judul_jenis(a), b))(*judul_asli())
    for x in D['kejadian']:
        if x.get('kondisi_pil', ('',))[0] == 'Pembersihan material': x['kondisi_pil'] = ('Pembersihan', x['kondisi_pil'][1])
dk.lbl_kolom, dk.lbl_hot, dk.lbl_kum = f'FIRESPOT DAN SISA {HL}', 'firespot', f'TERBAKAR 1 JAN–{HL}'; dk.bangun(tpl, nama)
print('ok', nama, '| hari data', D['hari'], '| cutoff', D['cutoff'], '| kejadian', dk.N_TOT, 'karhutla', len(dk.KH), 'ditangani', len(dk.KH_T), 'perlu perhatian', len(dk.SER), 'selesai', dk.N_SEL, '| Prioritas ditambah', D['prioritas_baru'])
for x in D['kejadian']:
    print(x['jenis'], x['prov'], x['lokasi'] or '(prov)', x['status'], 'DITANGANI' if x['tangani'] else 'selesai', 'PERHATIAN' if x['perhatian'] else '', {k: (round(v) if isinstance(v, (int, float)) else v) for k, v in x.get('sat', {}).items()})
# 2 Nov pemilik: baseline paparan Kepala BNPB 011126 (daftar isi, penanda bagian, kaki sumber); dibingkai mesin ppt-konsultan
import lewat_deck, shutil, zipfile as Z, pdf
SK, SG = 'Laporan Harian Dit. Koordalops BNPB, 11 Nov 2026 07.00 s.d. 12 Nov 2026 07.00 WIB', f'GIS BNPB, {HL.title()} 2026'
SR, SV = {'sumber': f'{SK}; {SG}' + ('; PVMBG Badan Geologi, 12 Nov 2026 06.00 WIB' if AWAL and ALT2 else '')}, {'sumber': 'PVMBG Badan Geologi, 12 Nov 2026 06.00 WIB; definisi status Permen ESDM 15/2011'}
B_R, B_D, B_S = ({'judul': 'Ringkasan Situasi', 'label': 'Ringkasan'}, {'judul': 'Rincian Lokasi', 'label': 'Rincian lokasi'}, {'judul': 'Status Siaga Bencana', 'label': 'Status siaga'})
B_H, B_G, B_P = ({'judul': 'Bencana Hidrometeorologi', 'label': 'Hidrometeorologi'}, {'judul': 'Bencana Geologi dan Vulkanologi', 'label': 'Geologi dan vulkanologi'}, {'judul': 'Prediksi Bencana', 'label': 'Prediksi'})
SH_ = {'sumber': f'{SK}; BMKG, 12 Nov 2026 06.00 WIB' + ('' if ALT2 else f'; {SG}')}; SGV = {'sumber': 'Laporan Harian Dit. Koordalops BNPB, 11 Nov 2026; PVMBG Badan Geologi, 1 s.d. 12 Nov 2026'}
_pd = dt.datetime.fromisoformat(B3['pr_dibuat'])   # 11 Nov: waktu prakiraan dari berkas, bukan disalin dari hari sebelumnya
SPR = {'sumber': f"BMKG, 10 sampai 12 Nov 2026; GIS BNPB, prakiraan banjir dan longsor {_pd.day} {harian.BULAN[_pd.month - 1][:3]} {_pd.year} {_pd:%H.%M} WIB; Open-Meteo, prakiraan hujan {B3['cuaca_hari'][0].day} sampai {B3['cuaca_hari'][-1].day} Nov 2026"}
bg = lambda b, h: dict(b, halaman_tetap=[h])
# halaman isi generator: 2 ringkasan, 5 status siaga, 6 rincian kab/kota menurun, 7 rincian sebagai lampiran, 8 ringkasan alternatif 3,
# 9 dan 10 ringkasan alternatif 4 dan 5
# 6 Nov Bang Ghozi ("tulis aja kab kota ke bawah dicoba"), pemilik ("coba 2-2nya, kasih beberapa alternatif slide")
# 7 Nov: nomor halaman generator bergeser bila slide Pengkinian tidak ada (kejadian lama dibuang) -> slide 2 sempat jadi penutup
# "Terima kasih". Halaman ringkasan dan status siaga dicari dari judulnya.
from pptx import Presentation as _P
_hal = {i + 1: ' '.join(sh.text_frame.text for sh in sl.shapes if sh.has_text_frame) for i, sl in enumerate(_P(nama).slides)}
H_RING = next(i for i, t in _hal.items() if 'INFORMASI BENCANA' in t)
H_SIAGA = next(i for i, t in _hal.items() if 'Status siaga bencana' in t)
if not AWAL: H_HID, H_GEO, H_PRE = (next(i for i, t in _hal.items() if k_ in t) for k_ in ('RUMAH RUSAK PER LOKASI', 'GUNUNG API LEVEL III', 'PERINGATAN DINI BMKG'))
print('halaman generator: ringkasan', H_RING, 'status siaga', H_SIAGA)
H_PRE = next(i for i, t in _hal.items() if 'YANG DIWASPADAI' in t) if AWAL else H_PRE
H_LAMP = sorted(i for i, t in _hal.items() if 'Lampiran:' in t) if AWAL else []   # tanpa 'bagian' = tanpa indikator tab
VARIAN = {'utama': ([bg(B_R, 1), bg(B_S, 2), bg(B_P, 3)], [dict(SR, halaman=H_RING, bagian=1), dict(SV, halaman=H_SIAGA, bagian=2), dict(SPR, halaman=H_PRE, bagian=3)] + [dict({'sumber': f"GIS BNPB, prakiraan PM2,5 (CAMS) {B3['udara_hari'][0].day} sampai {B3['udara_hari'][-1].day} Nov 2026; kategori ISPU PM2,5"} if 'udara' in _hal[h_] else {'sumber': 'GIS BNPB, indeks cuaca kebakaran (FWI) dari data sistem'} if 'karhutla' in _hal[h_] else {'sumber': f"BMKG, peringatan gelombang dan banjir rob berlaku {T.day} Nov 2026"} if 'pesisir' in _hal[h_] else {'sumber': f"GIS BNPB, prakiraan banjir dan longsor {_pd.day} {harian.BULAN[_pd.month - 1][:3]} {_pd.year} {_pd:%H.%M} WIB"}, halaman=h_) for h_ in H_LAMP])} if AWAL else {'utama': ([bg(B_R, 1), bg(B_S, 2), bg(B_H, 3), bg(B_G, 4), bg(B_P, 5)], [dict(SR, halaman=H_RING, bagian=1), dict(SV, halaman=H_SIAGA, bagian=2), dict(SH_, halaman=H_HID, bagian=3), dict(SGV, halaman=H_GEO, bagian=4), dict(SPR, halaman=H_PRE, bagian=5)])}
if AWAL and H_LAMP:   # 11 Nov pemilik: "lampiran di file terpisah aja" -> berkas '<nama> Lampiran' di folder Revisi yang sama, tanpa indikator bagian
    _b, _su = VARIAN['utama']
    VARIAN = {'utama': (_b, [x for x in _su if x['halaman'] not in H_LAMP]), 'lampiran': (None, [x for x in _su if x['halaman'] in H_LAMP])}
if AWAL:   # 12 Nov pemilik ("yang slide prediksi buat terpisah dlu aja", "yang main-nya masih 2 slide doang"): deck utama 2 slide, prediksi berkas '<nama> Prediksi' di folder Revisi yang sama, tanpa indikator bagian
    _b, _su = VARIAN['utama']
    VARIAN = {**VARIAN, 'utama': (_b[:2], [x for x in _su if x['halaman'] != H_PRE]), 'prediksi': (None, [{k_: v_ for k_, v_ in x.items() if k_ != 'bagian'} for x in _su if x['halaman'] == H_PRE])}
if os.environ.get('HANYA'): VARIAN = {k: v for k, v in VARIAN.items() if k in os.environ['HANYA'].split(',')}   # bangun ulang sebagian
mentah = nama[:-5] + ' (mentah).pptx'; shutil.copyfile(nama, mentah)
for akhir, (bagian, susun) in VARIAN.items():
    kel = nama[:-5] + ' Lampiran.pptx' if akhir == 'lampiran' else nama[:-5] + ' Prediksi.pptx' if akhir == 'prediksi' else nama.replace('utama', akhir); shutil.copyfile(mentah, kel)
    lewat_deck.bingkai(kel, 'harian', 'Laporan Kejadian Bencana Harian', 'Periode 11 Nov 2026, 07.00 sampai 12 Nov 2026, 07.00 WIB', T, pdf=False,
        tanpa_kepada='pemilik 2 Nov 2026: pil Disampaikan kepada dihapus, laporan harian dipresentasikan Kepala BNPB sendiri',
        bagian=bagian, spek_tambah={'panel_sisi': 'gelap'}, susun=susun)
    _t = kel + '.tmp'   # 2 Nov: ejaan resmi "Kota Parepare"
    with Z.ZipFile(kel) as zi, Z.ZipFile(_t, 'w', Z.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            b = zi.read(it.filename)
            if it.filename.endswith('.xml'): b = b.replace('Pare Pare'.encode(), 'Parepare'.encode())
            zo.writestr(it, b)
    os.replace(_t, kel)
    print('mesin ok', kel)
    try: pdf_ = pdf.ke_pdf(kel)
    except PermissionError:   # PDF lama sedang dibuka pemilik: simpan berdampingan dengan akhiran jam
        import time; k2 = kel[:-5] + time.strftime(' %H%M') + '.pptx'; shutil.copyfile(kel, k2); pdf_ = pdf.ke_pdf(k2); os.remove(k2)
    if akhir in ('lampiran', 'prediksi') and globals().get('_KE_REV'):   # lampiran ikut folder Revisi deck utama
        os.replace(kel, os.path.join(_KE_REV, os.path.basename(kel))); os.replace(pdf_, os.path.join(_KE_REV, os.path.basename(kel)[:-5] + '.pdf')); print('folder', _KE_REV)
    else:
        _KE_REV = lewat_deck.serah_revisi(kel, pdf_); print('folder', _KE_REV)   # pemilik 9 Nov: PPT dan PDF masuk folder Revisi N
os.remove(mentah)
