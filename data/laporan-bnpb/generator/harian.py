"""Laporan Kejadian Bencana Harian DDMMYY (4 slide: sampul, ringkasan + peta, rincian, penutup) dari teks WA, dalam format deck pemilik 221026.

    python3 harian.py --tanggal 2026-10-25 --koordalops wa.txt --bmkg bmkg.txt [--jam 12:00] [--out DIR] [--templat PPTX]

- Cut-off baku pemilik (24 Okt 2026): laporan harian bencana jam 12.00 WIB. Angka karhutla = hari laporan sementara s.d. --jam (satelit.hitung,
  mesin website): titik panas tanpa titik industri, luas, belum padam per provinsi/kabupaten/kecamatan. Terbakar 1 Jan = luas harian website
  sampai kemarin + luas hari ini s.d. jam. --jam lengkap = mode lama (hari kemarin penuh, langsung dari berkas website), dipakai untuk cek.
- Kejadian, status BPBD, kekeringan, gempa, TPA dari WA Koordalops 07.00 (wa_harian.koordalops); PM2.5 dari WA BMKG (wa_harian.bmkg).
- Aturan pemilik (Buku Pegangan, Riwayat 23-24 Okt): status karhutla ikut sisa belum padam data kita (0 ha selesai; >= 10 ha ditangani walau
  BPBD padam; < 10 ha selesai kecuali BPBD belum padam); provinsi berstatus Prioritas di website wajib masuk; perlu perhatian semua jenis;
  luas karhutla hanya angka kita (luas BPBD tidak tampil); tiap pil berikon; panel setinggi isinya; tanpa titik tengah.
- Templat = deck pemilik "Laporan Kejadian Bencana Harian 221026.pptx" (bukan di git; bawaan cache/templat/harian-221026.pptx)."""
from collections import Counter
import argparse, datetime as dt, json, os, posixpath, re, shutil, subprocess, sys, urllib.request, zipfile
from xml.sax.saxutils import escape

DI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, DI)
import wa_harian, banjir_data  # noqa: E402

AKAR = wa_harian.AKAR
BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
HARI_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
GEO_VUL = ('gempabumi', 'erupsi')   # 10 Nov pemilik: kelompok geologi dan vulkanologi; jenis lain hidrometeorologi, kecuali Kebakaran TPA ('lainnya')
KEPALA_NAMA = 'Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)'
NAVY, ORG, MERAH, KER, SLATE, INK, ABU, TEKS = '051C2C', 'D9600B', 'C8102E', 'B08A3E', '5B7A99', '1A1A1A', '6B7280', '2E3440'
T_NAVY, T_ORG, T_MERAH, T_KER, T_SLATE = 'E6EAF0', 'FBE7D6', 'F8DDE0', 'F4ECDC', 'E3EAF1'
NAMA = {k: v['nama'].replace('Kepulauan ', 'Kep. ') for k, v in json.load(open(os.path.join(AKAR, 'public', 'data', 'laporan.json')))['prov'].items()}
AKRONIM = {'Kal. Barat': 'Kalbar', 'Kal. Tengah': 'Kalteng', 'Kal. Selatan': 'Kalsel', 'Kal. Timur': 'Kaltim', 'Kal. Utara': 'Kaltara',
           'Sum. Utara': 'Sumut', 'Sum. Barat': 'Sumbar', 'Sum. Selatan': 'Sumsel', 'Sul. Utara': 'Sulut', 'Sul. Tengah': 'Sulteng',
           'Sul. Selatan': 'Sulsel', 'Sul. Tenggara': 'Sultra', 'Sul. Barat': 'Sulbar', 'Papua Selatan': 'Papsel', 'Papua Barat': 'Pabar'}
SINGKAT = {'Kep. Bangka Belitung': 'Kep. Babel', 'Nusa Tenggara Timur': 'NTT', 'Nusa Tenggara Barat': 'NTB', 'Papua Barat Daya': 'Papua Barat Daya',
           'Jawa Barat': 'Jabar', 'Jawa Tengah': 'Jateng', 'Jawa Timur': 'Jatim', 'DI Yogyakarta': 'DIY'}   # 27 Okt: lima provinsi Jawa berdesakan di peta
JENIS_SINGKAT = {'gempabumi': 'gempa', 'karhutla': 'karhutla', 'banjir': 'banjir', 'angin': 'angin', 'cuaca': 'cuaca ekstrem', 'kekeringan': 'kekeringan', 'lainnya': 'kebakaran', 'longsor': 'longsor', 'erupsi': 'erupsi', 'gelombang_pasang': 'gelombang pasang', 'kebakaran_permukiman': 'kebakaran permukiman'}
angka_id = lambda t: float(t.replace('.', '').replace(',', '.'))
PENDEK = lambda k: SINGKAT.get(NAMA[k]) or re.sub(r'^(Kalimantan|Sumatera|Sulawesi) ', lambda m: m.group(1)[:3] + '. ', NAMA[k])
# kawasan yang dilaporkan BPBD tanpa nama kabupaten: kecamatan pembentuknya (sama dengan kotak kawasan paparan Jatim 231026)
KAWASAN = {'Gunung Argopuro': ['35|Probolinggo|Krucil', '35|Probolinggo|Tiris', '35|Situbondo|Sumbermalang', '35|Bondowoso|Pakem', '35|Jember|Panti',
                               '35|Jember|Jelbuk', '35|Jember|Sukorambi'],   # lereng dan jalur pendakian Argopuro (Bremi, Baderan)
           'TN Way Kambas': ['18|Lampung Timur|Labuhan Ratu', '18|Lampung Timur|Way Bungur', '18|Lampung Timur|Purbolinggo', '18|Lampung Timur|Sukadana'],   # = deck Lampung 241026
           'Gunung Arjuno': ['35|Pasuruan|Prigen', '35|Pasuruan|Purwosari', '35|Malang|Singosari', '35|Malang|Lawang', '35|Malang|Karangploso',
                             '35|Kota Batu|Bumiaji', '35|Mojokerto|Gondang', '35|Mojokerto|Pacet', '35|Mojokerto|Trawas', '35|Mojokerto|Jatirejo']}
JENIS_LAIN = {'gempabumi': ('Gempa bumi', 'gempa', SLATE, T_SLATE), 'lainnya': ('Kebakaran TPA', 'api', 'A23B2A', 'F5E1DD'), 'banjir': ('Banjir', 'banjir', '2F6FB5', 'DCE7F5'), 'angin': ('Angin kencang', 'angin', '0E7490', 'D5EEF2'),
             'cuaca': ('Cuaca ekstrem', 'angin', '0E7490', 'D5EEF2'), 'longsor': ('Tanah longsor', 'longsor', '7A5230', 'EFE4D8'),
             'erupsi': ('Erupsi', 'gunung', 'C8102E', 'F8DDE0'), 'gelombang_pasang': ('Gelombang pasang', 'banjir', '2F6FB5', 'DCE7F5'),
             'kebakaran_permukiman': ('Kebakaran permukiman', 'api', 'A23B2A', 'F5E1DD')}   # 11 Nov: dua jenis baru dari wa_harian, tanpa entri ini deck KeyError   # 7 Nov atasan: erupsi Bromo 5 Nov 17.11 WIB masuk Informasi bencana slide 1   # 1 Nov: longsor Simalungun   # 30 Okt: "Bencana Alam Cuaca Ekstrem" (Jombang, Tapin)
WEB = ('peta_karhutla.json', 'peta_karhutla_kab.json', 'peta_karhutla_wil.json', 'harian30.json', 'kluster_awal.json')


def f0(v): return f'{int(round(v)):,}'.replace(',', '.')
def tgl_id(d, bulan=True): return f'{d.day} {BULAN[d.month - 1] if bulan else BULAN[d.month - 1][:3]} {d.year}'


def rentang(a, b):
    """'23–24 Oktober 2026' / '31 Oktober–1 November 2026'."""
    return tgl_id(b) if a == b else f'{a.day}–{tgl_id(b)}' if a.month == b.month else f'{a.day} {BULAN[a.month - 1]}–{tgl_id(b)}'


# ------------------------------------------------------------------ angka
SIMPAN = False   # 4 Nov pemilik: bangun ulang hari yang sama memakai data yang sudah diunduh (jalan.py menyalakan; SEGAR=1 memaksa unduh)


def unduh_json(url, path):
    """JSON dari url; bila SIMPAN dan berkas simpanan ada, baca simpanan tanpa jaringan."""
    if SIMPAN and os.path.exists(path): return json.load(open(path, encoding='utf-8'))
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for coba in range(3):
        try: b = urllib.request.urlopen(req, timeout=180).read(); break
        except (TimeoutError, OSError):
            if coba == 2: raise
    os.makedirs(os.path.dirname(path), exist_ok=True); open(path, 'wb').write(b)
    return json.loads(b)


def ambil_web(ke):
    os.makedirs(ke, exist_ok=True)
    if SIMPAN and all(os.path.exists(os.path.join(ke, f)) for f in WEB):
        print('pakai simpanan website', ke); return {f: json.load(open(os.path.join(ke, f))) for f in WEB}
    for f in WEB:
        req = urllib.request.Request(f'https://centurisk97.id/data/{f}', headers={'User-Agent': 'Mozilla/5.0 (generator laporan BNPB)'})
        for coba in range(3):   # jaringan kadang tersendat di tengah unduhan; coba ulang sebelum menyerah
            try: b = urllib.request.urlopen(req, timeout=180).read(); break
            except (TimeoutError, OSError):
                if coba == 2: raise
        open(os.path.join(ke, f), 'wb').write(b)
    return {f: json.load(open(os.path.join(ke, f))) for f in WEB}


def angka_karhutla(kej, web, tanggal, jam):
    """Isi x['sat'] = {'kum','sisa','hot'} tiap karhutla + daftar provinsi Prioritas website. Mode jam: hari laporan s.d. jam; mode lengkap: kemarin penuh."""
    P, K, WL, H = web['peta_karhutla.json'], web['peta_karhutla_kab.json'], web['peta_karhutla_wil.json'], web['harian30.json']
    hari = tanggal if jam else tanggal - dt.timedelta(days=1)
    i0 = P['hari'].index(WL['hari0'])
    # luas harian website sebelum hari data (kumulatif 1 Jan), lalu angka hari data
    # hari terakhir website sebelum hari data; mode jam menambal hari yang belum terbit dari satelit (27 Okt: website berhenti di 24 Okt)
    akhir = max(d for d in P['hari'] if d < hari.isoformat()); sblm = P['hari'].index(akhir)
    celah = (hari - dt.date.fromisoformat(akhir)).days
    def web_prov(k, i):
        p = P['prov'].get(k); return (sum(v or 0 for v in p['luas'][:i + 1]) if p else 0)
    def web_kab(key, i):
        return sum(l for x, l, b in K['kab'].get(key, {'d': []})['d'] if x <= i)
    def web_kec(keys, i):
        n = 0
        for kk in keys:
            f = WL['d'].get(kk, [])
            n += sum(f[j + 2] for j in range(0, len(f), 5) if f[j] + i0 <= i)
        return n
    if jam:
        import satelit
        a = satelit.hitung(tanggal, jam, celah)
        hari_ini = lambda t, k: (lambda o: {'hot': o['hot_bersih'][-1], 'luas': sum(o['luas']), 'sisa': o['belum'][-1]} if o else {'hot': 0, 'luas': 0, 'sisa': 0})(a[t].get(k))
        def nilai(tingkat, k, kum_kemarin):
            if tingkat == 'kec':
                o = [hari_ini('kec', kk) for kk in k]; h = {m: sum(x[m] for x in o) for m in ('hot', 'luas', 'sisa')}
            else:
                h = hari_ini(tingkat, k)
            return {'kum': kum_kemarin + h['luas'], 'sisa': h['sisa'], 'hot': h['hot']}
        cutoff = a['cutoff']
    else:
        i, j = P['hari'].index(hari.isoformat()), H['hari'].index(hari.isoformat())
        def nilai(tingkat, k, kum_kemarin):
            if tingkat == 'prov':
                p = P['prov'].get(k, {'luas': [0] * 999, 'belum': [0] * 999})
                return {'kum': kum_kemarin + (p['luas'][i] or 0), 'sisa': p['belum'][i] or 0, 'hot': H['prov'].get(k, [0] * 999)[j]}
            if tingkat == 'kab':
                d = K['kab'].get(k, {'d': []})['d']
                return {'kum': kum_kemarin + next((l for x, l, b in d if x == i), 0), 'sisa': next((b for x, l, b in d if x == i), 0), 'hot': H['kab'].get(k, [0] * 999)[j]}
            o = {'kum': kum_kemarin, 'sisa': 0, 'hot': 0}
            for kk in k:
                f = WL['d'].get(kk, [])
                for n in range(0, len(f), 5):
                    if f[n] + i0 == i: o['kum'] += f[n + 2]; o['sisa'] += f[n + 3]; o['hot'] += f[n + 1]
            return o
        cutoff = P['dibuat']
    for x in kej:
        if x['jenis'] != 'karhutla':
            continue
        lok, p = x['lokasi'], x['prov']
        if not lok:
            x['sat'] = nilai('prov', p, web_prov(p, sblm))
        elif lok in KAWASAN:
            x['sat'] = nilai('kec', KAWASAN[lok], web_kec(KAWASAN[lok], sblm))
        else:
            key = f'{p}|{lok}'
            if key not in K['kab'] and key not in H['kab'] and lok.startswith('Kota '):   # kota yang di data kita tanpa awalan "Kota"
                alt = f"{p}|{lok[5:]}"
                if alt in K['kab'] or alt in H['kab']: key = alt
            if key not in K['kab'] and key not in H['kab']:
                sys.exit(f'kabupaten {key!r} tidak ada di data website; tambahkan ke KAWASAN atau betulkan nama di WA')
            x['sat'] = nilai('kab', key, web_kab(key, sblm))
    prio = {f['properties']['prov'] for f in web['kluster_awal.json']['features'] if f['properties']['level'] == 3}
    return hari, cutoff, prio, (lambda k: nilai('prov', k, web_prov(k, sblm)))


def susun(wa, web, tanggal, jam):
    kej = [dict(x) for x in wa['kejadian']]
    hari, cutoff, prio, prov_baru = angka_karhutla(kej, web, tanggal, jam)
    # pedoman pemilik 23 Okt: provinsi berstatus Prioritas di website (cluster level 3) yang tidak ada di laporan Koordalops ditambahkan
    ada = {x['prov'] for x in kej if x['jenis'] == 'karhutla'}
    baru = sorted(({'jenis': 'karhutla', 'prov': k, 'lokasi': '', 'status': 'berjalan', 'angka': {}, 'sat': prov_baru(k)} for k in prio - ada), key=lambda x: -x['sat']['sisa'])
    # urutan tabel karhutla: baris provinsi dulu (sisa terbesar di atas), lalu kabupaten/kawasan menurut urutan provinsi di WA
    kh = [x for x in kej if x['jenis'] == 'karhutla']
    kh = sorted([x for x in kh if not x['lokasi']] + baru, key=lambda x: -x['sat']['sisa']) + [x for x in kh if x['lokasi']]
    kej = kh + [x for x in kej if x['jenis'] != 'karhutla']
    for y in kej:
        sisa = round(y['sat']['sisa']) if 'sat' in y else None
        # status karhutla ikut sisa data kita (pemilik 24 Okt); jenis lain ikut BPBD
        # BPBD melapor api belum padam = tetap ditangani walau sisa kita 0 (pemilik 25 Okt, Ciremai dan Lawu: satelit bisa tertutup awan/kabut)
        y['tangani'] = (y['status'] != 'selesai') if sisa is None else True if y['status'] == 'belum' else sisa >= 10
        y['perhatian'] = y['tangani'] and ((sisa >= 100 or y['status'] == 'belum') if sisa is not None else y['status'] == 'belum')
    return {'hari': hari.isoformat(), 'cutoff': cutoff, 'kejadian': kej, 'prioritas_baru': [x['prov'] for x in baru]}


# ------------------------------------------------------------------ deck
class Deck:
    def __init__(s, ke, D, wa, w, tanggal, jam):
        s.ke, s.D, s.wa, s.w, s.tanggal, s.jam = ke, D, wa, w, tanggal, jam
        s.N, s.MED = [300], {}
        M, IK = os.path.join(ke, 'tpl', 'ppt', 'media') + '/', os.path.join(ke, 'ik') + '/'
        s.I = {'papan_p': M + 'image-2-2.png', 'awas_p': M + 'image-2-3.png', 'papan_n': M + 'image-2-4.png', 'seru_n': M + 'image-2-5.png', 'api_o': M + 'image-2-6.png',
               'daun_k': M + 'image-2-7.png', 'cek_p': M + 'image-2-10.png', 'titik3_p': M + 'image-2-11.png', 'api_p': M + 'image-2-12.png',
               'api_o2': M + 'image-2-13.png', 'heli_p': M + 'image-2-30.png', 'pendaki_p': M + 'image-2-31.png', 'daun_p': M + 'image-2-32.png', 'api_n': M + 'image-3-4.png',
               'rumah_k': M + 'image-3-36.png', 'orang_k': M + 'image-3-37.png', 'tetes_k': M + 'image-3-38.png', 'daun2_p': M + 'image-3-34.png',
               'peta.png': os.path.join(ke, 'peta.png')}
        s.GA, s.LAMPIRAN, s.GABUNG = None, False, False
        s.SIAGA = False   # 2 Nov pemilik: gunung api pindah ke slide sendiri "Status siaga bencana" (bukan kejadian baru)   # GABUNG (31 Okt, alternatif): kejadian baru dan pengkinian satu slide   # 30 Okt: GA = wa_harian.pvmbg(...); LAMPIRAN = slide 3 kejadian baru + gunung api, sisanya lampiran
        for n in ('gempa', 'api', 'banjir', 'tenda', 'rumah', 'orang', 'hati', 'kalender', 'sampah', 'awas', 'angin', 'truk', 'gunung', 'asap', 'suhu', 'tetes', 'mata', 'tekanan', 'hujan', 'telepon', 'cek', 'radius', 'arah', 'longsor', 'asapsolid', 'hujansolid', 'anginsolid', 'jam'):
            for c in ('putih', 'slate', 'merah', 'oranye', 'navy', 'kering', 'coklat'):
                s.I[f'{n}_{c}'] = IK + f'{n}-{c}.png'
        for i_ in range(16):   # 11 Nov: panah arah sektor gunung api
            for c in ('kering', 'oranye', 'navy'): s.I[f'panah{i_}_{c}'] = IK + f'panah{i_}-{c}.png'
            s.I[f'kompas{i_}_kering'] = IK + f'kompas{i_}-kering.png'
        s.I['awas_p2'], s.I['awas_b'] = IK + 'awas-putih.png', IK + 'awas-slate.png'
        s.I['daun_putih'] = s.I['daun_p']
        KJ = D['kejadian']
        s.KJ, s.KH = KJ, [x for x in KJ if x['jenis'] == 'karhutla']
        s.KR, s.LN = [x for x in KJ if x['jenis'] == 'kekeringan'], [x for x in KJ if x['jenis'] not in ('karhutla', 'kekeringan')]
        s.KH_T, s.SER = [x for x in s.KH if x['tangani']], [x for x in KJ if x['perhatian']]
        s.N_SEL, s.N_TOT, s.N_PROV = sum(1 for x in KJ if not x['tangani']), len(KJ), len({x['prov'] for x in KJ})
        s.TT = json.load(open(os.path.join(ke, 'titik.json')))
        s.BJ = banjir_data.baca(AKAR, tanggal, NAMA)   # None = sumber banjir kosong: halaman banjir tidak dibuat
        hd = dt.date.fromisoformat(D['hari'])
        s.lbl_hari = f'{hd.day} {BULAN[hd.month - 1][:3].upper()}' + (f' S.D. {jam.replace(":", ".")}' if jam else '')
        s.lbl_kum = f'TERBAKAR 1 JAN–{hd.day} {BULAN[hd.month - 1][:3].upper()}'
        s.lbl_kolom, s.lbl_hot = f'{s.lbl_hari}: HOTSPOT, SISA', 'hotspot'

    # ---- 31 Okt pemilik: "karena kita udah bedain kejadian sebelumnya, perlu keterangan Laporan Pertama tanggal berapa" (slide pengkinian)
    def awal(s, x):
        """Tanggal laphar pertama episode yang masih berjalan: arsip laphar (public/data/laphar_riwayat.json, episode) + arsip WA
        Koordalops harian (../harian-*/wa-koordalops.txt; tanggal laphar = awal periode WA). None = tidak pernah dilapor Koordalops."""
        if not hasattr(s, '_riw'):
            p = os.path.join(AKAR, 'public', 'data', 'laphar_riwayat.json')
            s._riw = json.load(open(p, encoding='utf-8'))['episode'] if os.path.exists(p) else []
            s._wa_arsip = []
            import glob, wa_harian
            for f in glob.glob(os.path.join(os.path.dirname(os.path.dirname(s.ke)), 'harian-*', 'wa-koordalops.txt')):
                try: w_ = wa_harian.koordalops(open(f, encoding='utf-8').read(), pagi=False)
                except Exception: continue
                s._wa_arsip += [(w_['mulai'][:10], k) for k in w_['kejadian']]
        jenis = {x['jenis']} | ({'cuaca'} if x['jenis'] == 'angin' else set()) | ({'banjir'} if 'banjir' in (x.get('label') or '').lower() else set())
        lok = x['lokasi'] or x.get('lokasi_wa') or ''
        kab = {f"{x['prov']}|{'|'.join(k.split('|')[1:2])}" for k in KAWASAN[lok]} if lok in KAWASAN else {f"{x['prov']}|{lok}"} if lok else set()
        batas = (s.tanggal - dt.timedelta(days=10)).isoformat()
        ep = [e for e in s._riw if e['jenis'] in jenis and e['prov'] == x['prov'] and e['terakhir'] >= batas
              and ((e['kab'] in kab or (lok in KAWASAN and e['tingkat'] == 'lain' and lok.split()[-1] in e['tempat'])) if lok else e['tingkat'] == 'prov')]
        if not ep and not lok and x['jenis'] == 'karhutla':   # baris provinsi dari website: kejadian kabupaten Koordalops di provinsi itu
            ep = [e for e in s._riw if e['jenis'] == 'karhutla' and e['prov'] == x['prov'] and e['terakhir'] >= batas]
        tg = [e['mulai'] for e in ep] + [t for t, k in s._wa_arsip if k['jenis'] in jenis | {x['jenis']} and k['prov'] == x['prov']
                                          and (k['lokasi'] == lok if lok else (not k['lokasi'] or x['jenis'] == 'karhutla'))]
        return dt.date.fromisoformat(min(tg)) if tg else None

    def awal_ga(s, g):
        """4 Nov pemilik: laporan pertama tiap gunung api Siaga/Awas = laphar pertama dalam rentetan laporan yang tidak putus sampai hari ini
        (teks laphar terurai data/raw/laphar/teks, lokal). Kolom tanggal di tabel status laphar tidak dipakai: isinya bolak-balik
        (Merapi 19 Jul lalu 13 Mar, tiga gunung sama-sama 18 Agu). Rentetan yang sudah ada sejak berkas pertama arsip = 'sebelum <tahun>'.
        None bila arsip tidak ada (mesin lain): pil tidak dipasang, bukan tanggal karangan."""
        if not hasattr(s, '_ga_teks'):
            import glob
            d_ = os.path.join(AKAR, 'data', 'raw', 'laphar', 'teks')
            s._ga_teks = {os.path.basename(f)[:10]: f for f in sorted(glob.glob(os.path.join(d_, '2*.txt')))}
            s._ga_awal = {}
        if not s._ga_teks: return None
        nm = re.sub(r'^Gn\.?\s*', '', g['nama']).strip()
        if nm in s._ga_awal: return s._ga_awal[nm]
        pola = re.compile(r'Gn\.?\s*' + re.escape(nm) + r'|Gunung\s*(?:api\s*)?' + re.escape(nm), re.I)
        hari = sorted(s._ga_teks)
        ada = [h for h in hari if pola.search(open(s._ga_teks[h], encoding='utf-8', errors='ignore').read())]
        hasil = None
        if ada and ada[-1] == hari[-1]:   # masih dilaporkan di laphar terakhir arsip; WA PVMBG sesudahnya meneruskan rentetan
            i = hari.index(ada[-1])
            while i > 0 and hari[i - 1] in ada: i -= 1
            hasil = f'sebelum {hari[0][:4]}' if i == 0 else (lambda d: f"{d.day} {BULAN[d.month - 1][:3]}" + (f' {d.year}' if d.year != s.tanggal.year else ''))(dt.date.fromisoformat(hari[i]))
        s._ga_awal[nm] = hasil
        return hasil

    def teks_awal(s, x):
        d = s.awal(x)
        if not d: return 'Dari data satelit' if x['jenis'] == 'karhutla' else ''
        return f"Laporan pertama {d.day} {BULAN[d.month - 1][:3]}" + (f' {d.year}' if d.year != s.tanggal.year else '')

    # primitif (sama dengan buat.py 241026)
    def nid(s): s.N[0] += 1; return s.N[0]
    def rpr(s, sz, b, c, spc=0): sz = max(int(sz), 700); return f'<a:rPr lang="id-ID" sz="{sz}"{" b=\"1\"" if b else ""}{f" spc=\"{spc}\"" if spc else ""} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill><a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr>'
    def tx(s, x, y, w, h, paras, sz=1000, c=INK, b=False, al='l', an='t', spc=0, wrap='square'):
        ps = ''
        for p in paras:
            runs = [(p, c, b)] if isinstance(p, str) else [r if len(r) == 3 else (r[0], r[1], b) for r in p]
            ps += f'<a:p><a:pPr algn="{al}"><a:buNone/></a:pPr>' + ''.join(f'<a:r>{s.rpr(sz, rb, rc, spc)}<a:t>{escape(t)}</a:t></a:r>' for t, rc, rb in runs) + f'<a:endParaRPr lang="id-ID" sz="{sz}"/></a:p>'
        return (f'<p:sp><p:nvSpPr><p:cNvPr id="{s.nid()}" name="T"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{max(int(w), 1)}" cy="{max(int(h), 1)}"/></a:xfrm>'
                f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="{wrap}" lIns="0" tIns="0" rIns="0" bIns="0" anchor="{an}"/><a:lstStyle/>{ps}</p:txBody></p:sp>')
    def kotak(s, x, y, w, h, fill=None, geom='rect', ln=None, adj=None, lw=9525):
        av = f'<a:gd name="adj" fmla="val {adj}"/>' if adj is not None else ''
        f = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
        l = f'<a:ln w="{lw}"><a:solidFill><a:srgbClr val="{ln}"/></a:solidFill></a:ln>' if ln else '<a:ln><a:noFill/></a:ln>'
        return f'<p:sp><p:nvSpPr><p:cNvPr id="{s.nid()}" name="K"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{max(int(w), 1)}" cy="{max(int(h), 1)}"/></a:xfrm><a:prstGeom prst="{geom}"><a:avLst>{av}</a:avLst></a:prstGeom>{f}{l}</p:spPr></p:sp>'
    def garis(s, x, y, w, c=INK, t=9525, h=0):
        return f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{s.nid()}" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="{t}"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'
    def gambar(s, x, y, w, h, nama):
        rid = s.MED.setdefault(s.I[nama], f'rIdM{len(s.MED) + 1}')
        return f'<p:pic><p:nvPicPr><p:cNvPr id="{s.nid()}" name="G"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
    def kartu(s, x, y, ikon, tint, nilai, lab, warna, w=2021373):
        return (s.kotak(x, y, w, 512064, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=14286) + s.kotak(x + 109728, y + 91440, 329184, 329184, tint, 'ellipse')
                + s.gambar(x + 182880, y + 164592, 182880, 182880, ikon) + s.tx(x + 512064, y + 36576, w - 548640, 274320, [nilai], sz=1700, b=True, c=warna, an='ctr')
                + s.tx(x + 512064, y + 301752, w - 548640, 155448, [lab], sz=750, c=TEKS))
    def pil_bagian(s, x, y, w, teks, ikon, warna):
        return s.kotak(x, y, w, 182880, warna, 'roundRect', adj=50000) + s.gambar(x + 73152, y + 36576, 109728, 109728, ikon) + s.tx(x + 237744, y, w - 260000, 182880, [teks], sz=660, b=True, c='FFFFFF', spc=100, an='ctr', wrap='none')
    def status_ikon(s, x, y, d, st):
        return s.kotak(x, y, d, d, ORG if st else NAVY, 'ellipse') + s.gambar(x + d * .18, y + d * .18, d * .64, d * .64, 'titik3_p' if st else 'cek_p')
    def lebar_runs(s, runs, sz):
        """Lebar teks (EMU) dari metrik Roboto di generator/font; runs = [(teks, warna, tebal)], sz = ratusan pt."""
        from PIL import ImageFont
        if not hasattr(s, '_fon'):
            d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'font')
            s._fon = {t: ImageFont.truetype(os.path.join(d, f'Roboto-{"Bold" if t else "Regular"}.ttf'), 1000) for t in (True, False)}
        return int(sum(s._fon[bool(t)].getlength(x) for x, _, t in runs) / 1000 * sz / 100 * 12700)

    def pil(s, x, y, teks, fill, warna, ikon, sz=620, h=164592, b=True, w=None):
        sz = max(sz, 700); w = w or 120000 + len(teks) * sz * 62 + h * .9
        return (s.kotak(x, y, w, h, fill, 'roundRect', adj=50000) + s.gambar(x + h * .35, y + h * .2, h * .6, h * .6, ikon)
                + s.tx(x + h * .95, y, w - h * .95, h, [teks], sz=sz, b=b, c=warna, al='ctr', an='ctr', wrap='none')), w
    def au(s, xe, y, h, angka, satuan, sz, c=INK, b=True, cs=None, bs=None, wn=700000, wu=900000):
        # angka rata kanan berakhir di xe, satuan mulai di xe + celah: satuan tiap baris sejajar berapa pun digitnya (pemilik 27 Okt)
        g = sz * 30
        return (s.tx(xe - wn, y, wn, h, [angka], sz=sz, b=b, c=c, al='r', an='ctr', wrap='none')
                + s.tx(xe + g, y, wu, h, [satuan] if isinstance(satuan, str) else [satuan], sz=sz, b=b if bs is None else bs, c=c if cs is None else cs, an='ctr', wrap='none'))
    def pecah(s, teks):
        # '3.523 KK' -> ('3.523', 'KK'); teks tanpa angka di depan -> None
        m = re.match(r'^(±\s*)?([\d.,]+)\s+(.+)$', teks); return (m[2], m[3]) if m else None
    def sisa_teks(s, sa):
        # sisa 0 tapi satelit masih melihat api di hari laporan: tampilkan jam deteksinya (pemilik 26 Okt, Gn. Argopuro)
        return f"sisa ± {f0(sa['sisa'])} ha" if round(sa['sisa']) else sa['api'] if sa.get('api') else 'sisa 0 ha'
    def geser(s, xml, dy):
        return re.sub(r'<a:off x="(\d+)" y="(-?\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{int(m.group(2)) + dy}"/>', xml)

    # ---------------------------------------------------------- isi teks yang tergantung data
    def tindak(s):
        # kolom "Yang akan dilakukan BNPB" satu baris tanpa bungkus (wrap none, 8,2 pt, lebar ±3,3 inci): ±56 huruf muat.
        # 29 Okt pemilik ("jelek banget"): "Pemadaman: TN Way Kambas, Karanganyar, Gn. Argopuro, Enrekang" meluap ke kolom sebelah.
        def muat(awal, nama, batas=56):
            for n in range(len(nama), 0, -1):
                t = awal + ', '.join(nama[:n]) + (f' dan {len(nama) - n} lainnya' if n < len(nama) else '')
                if len(t) <= batas: return t
            pendek = [n.split(' ±')[0] for n in nama]   # 7 Nov: satu nama + angka + "dan N lainnya" tidak muat -> nama tanpa angka (angka ada di tabel), bukan elipsis (D-17)
            if pendek != nama: return muat(awal, pendek, batas)
            return awal + nama[0][:max(batas - len(awal) - 1, 8)] + '…'
        # 4 Nov pemilik (atasan: "rasanya tiap hari infonya gitu2 aja"): isi dari perubahan sejak laporan kemarin bila arsip kemarin ada
        ub = s.tindak_ubah(muat)
        if ub: return ub
        # 28 Okt pemilik: "berinisiatif dikit tambahin atau ganti" -> tiap kolom diisi dari angka hari itu, bukan kalimat yang sama tiap hari
        sisa = sorted((x for x in s.KH if x['tangani'] and (not x['lokasi'] or x['lokasi'] not in KAWASAN)), key=lambda x: -x['sat']['sisa'])   # 29 Okt: kabupaten (Merauke) ikut
        nm = lambda x: x['lokasi'] or PENDEK(x['prov'])
        b1 = ['•  ' + ' dan '.join(f"{nm(x)} ±{f0(x['sat']['sisa'])} ha" for x in sisa[:2]) + ' belum padam'] if sisa else []
        kab = [x['lokasi'].replace('Gunung ', 'Gn. ') for x in s.KH if x['lokasi'] and x['status'] == 'belum' and x['tangani']]   # Gn.: muat dua baris (26 Okt)
        jaga = [nm(x) for x in sisa[2:] if x['perhatian']]
        if kab: b1.append(muat('•  Pemadaman: ', kab))
        elif jaga:   # 30 Okt pemilik: "sebutin aja 2 lainnya apa" -> awalan pendek dulu supaya nama tertulis, bukan "dan N lainnya"
            t_ = muat('•  Patroli dan pendinginan: ', jaga[:3])
            if 'lainnya' in t_: t_ = muat('•  Patroli, pendinginan: ', jaga[:3], 59)
            # 31 Okt pemilik: "'2 lainnya' jabarin aja apa aja" -> nama tetap tidak muat: pakai singkatan provinsi (Sulteng, Kaltim, Sultra)
            if 'lainnya' in t_: t_ = muat('•  Patroli, pendinginan: ', [AKRONIM.get(n, n) for n in jaga[:3]], 59)
            b1.append(t_)
        elif len(sisa) > 2: b1.append(f"•  Pantau {len(sisa) - 2} provinsi lain dengan sisa api")
        kota = list(dict.fromkeys(k for k, v, kat in s.w['pm'] if kat.lower() in ('berbahaya', 'sangat tidak sehat')))[:2]
        b2 = [muat('•  Masker dan layanan ISPA: ', kota)] if kota else ['•  Pemantauan kualitas udara di wilayah terdampak asap']
        ungsi = []
        for x in s.KJ:
            m = re.search(r'([\d.]+)\s*jiwa\s*mengungsi(?!\s*\(?sudah kembali)', x.get('teks', {}).get('dampak', ''))   # 1 Nov Langkat: sudah kembali = bukan pengungsi
            if m: ungsi.append((angka_id(m[1]), f"{JENIS_SINGKAT.get(x['jenis'], x['jenis'])} {PENDEK(x['prov']).replace('Kep. ', '')}"))
        if ungsi: b2.append('•  Pengungsi: ' + ', '.join(f"{t} ±{f0(n)}" for n, t in sorted(ungsi, reverse=True)[:2]) + ' jiwa')
        else: b2.append('•  PM2.5 tingkat Berbahaya (BMKG)' if kota else '•  Siaga evakuasi warga rentan di sekitar api')
        if s.KR:
            kk = sum(x['angka'].get('kk', 0) for x in s.KR)
            tk, lt = sum(x['angka'].get('tangki', 0) for x in s.KR), sum(x['angka'].get('liter', 0) for x in s.KR)
            b3 = [f'•  Tersalur {f0(lt)} liter' + (f', {f0(tk)} tangki' if tk else '') + f' untuk ±{f0(kk)} KK'] if lt else [f"•  Air bersih untuk ±{f0(kk)} KK di {len(s.KR)} kab/kota"]
            kosong = [x['lokasi'] for x in s.KR if not x['angka'].get('liter')]
            besar = max(s.KR, key=lambda x: x['angka'].get('kk', 0))
            b3.append('•  Percepat pendataan dan distribusi: ' + ', '.join(kosong) if kosong else f"•  Terdampak terbesar: {besar['lokasi']} (±{f0(besar['angka'].get('kk', 0))} KK)")
            k3 = ('daun_p', 'Air bersih', b3)
        else:
            g = next((x for x in s.LN if x['tangani']), None)
            k3 = ('awas_p', 'Pemulihan', [f"•  {JENIS_LAIN[g['jenis']][0]} {NAMA[g['prov']]}: pendampingan berlanjut"] if g else ['•  Pemantauan kejadian lain berlanjut'])
        return [('heli_p', 'Pemadaman prioritas', b1), ('pendaki_p', 'Keselamatan warga', b2), k3]

    def kemarin(s):
        """Arsip laporan hari sebelumnya (../harian-<D-1>/kerja-*/data.json dan wa-bmkg.txt); None bila tidak ada."""
        if hasattr(s, '_kmr'): return s._kmr
        import glob, wa_harian
        d_ = os.path.join(os.path.dirname(os.path.dirname(s.ke)), f'harian-{(s.tanggal - dt.timedelta(days=1)).isoformat()}')
        dj = sorted(glob.glob(os.path.join(d_, 'kerja-*', 'data.json')))
        s._kmr = None
        if dj:
            K = json.load(open(dj[-1], encoding='utf-8'))
            try: pm = wa_harian.bmkg(open(os.path.join(d_, 'wa-bmkg.txt'), encoding='utf-8').read())['pm']
            except Exception: pm = None
            s._kmr = {'kej': K['kejadian'], 'pm': pm}
        return s._kmr

    def tindak_ubah(s, muat):
        """Strip 'Yang akan dilakukan BNPB': tiap butir = tindakan BNPB (gaya lama) + data yang diperkaya (4 Nov pemilik: "isinya bukan apa
        yang dilakukan BNPB", "lebih suka yang lama, tapi informasinya diupgrade"). Pembanding kemarin dipakai sebagai alasan tindakan."""
        K = s.kemarin() or {'kej': [], 'pm': None}
        f1 = lambda v: f'{v:.1f}'.replace('.', ',')
        nm = lambda x: AKRONIM.get(x['lokasi'] or PENDEK(x['prov']), x['lokasi'] or PENDEK(x['prov']))
        kunci = lambda x: (x['prov'], x.get('lokasi') or '')
        sk = {kunci(x): (x.get('sat') or {}).get('sisa') or 0 for x in K['kej'] if x['jenis'] == 'karhutla' and x.get('tangani')}
        kini = sorted((x for x in s.KH if x['tangani'] and (not x['lokasi'] or x['lokasi'] not in KAWASAN)), key=lambda x: -x['sat']['sisa'])
        b1 = [f"•  Memperkuat pemadaman: {nm(x)} ±{f0(x['sat']['sisa'])} ha" for x in kini[:1]]
        if len(kini) > 1: b1 = [f"•  Memperkuat pemadaman: {nm(kini[0])} ±{f0(kini[0]['sat']['sisa'])} ha, {nm(kini[1])} ±{f0(kini[1]['sat']['sisa'])} ha"]
        naik = [(x['sat']['sisa'] - sk.get(kunci(x), 0), x) for x in kini[2:] if x['sat']['sisa'] - sk.get(kunci(x), 0) >= 50]   # belum ditangani kemarin = naik dari 0 (Kaltim)
        naik.sort(key=lambda t: -t[0])
        jaga = [nm(x) for x in kini[2:] if x['perhatian']]
        if sk and naik: b1.append(muat('•  Menambah pemadaman: ', [f"{nm(x)} naik {f0(d)} ha" for d, x in naik[:2]], 61))   # 4 Nov: 60 huruf masih muat di kolom
        elif jaga: b1.append(muat('•  Patroli dan pendinginan: ', jaga[:3], 59))
        elif len(kini) > 2: b1.append(f"•  Memantau {len(kini) - 2} provinsi lain dengan sisa api")
        # keselamatan warga: masker/ISPA di kota terburuk (nilai PM2.5), lalu layanan pengungsi; tanpa pengungsi, pantau udara
        pm = s.w['pm']; b2 = []
        kota = [(k, v) for k, v, kat in pm if kat.lower() in ('berbahaya', 'sangat tidak sehat')]
        if kota:
            t_ = f"•  Menyediakan masker dan ISPA: {kota[0][0]} (PM2.5 {f1(kota[0][1])})"
            b2.append(t_ if len(t_) <= 59 else f"•  Menyediakan masker: {kota[0][0]} (PM2.5 {f1(kota[0][1])})")
        ungsi = []
        for x in s.KJ:
            u_ = (x.get('teks') or {}).get('pengungsi') or ''
            m = re.search(r'([\d.]+)\s*(?:\([^)]*\)\s*)?jiwa', u_, re.I)
            if m and x['status'] != 'selesai' and not re.search(r'kembali', u_, re.I): ungsi.append((angka_id(m[1]), x['lokasi'] or PENDEK(x['prov'])))
        ungsi.sort(reverse=True)
        if ungsi: b2.append(muat('•  Melayani pengungsi: ', [f"{t} ±{f0(n)}" for n, t in ungsi[:2]], 54) + ' jiwa')
        # 6 Nov pemilik ("ga efektif dan nanggung"; "udara karhutla dan udara polusi", "kalimatnya yang lengkap dan efektif"): stasiun PM2.5
        # Tidak Sehat ke atas dipisah: provinsi yang punya karhutla di laporan ini = asap karhutla, selain itu = polusi udara kota.
        # Satu butir per kelompok: tindakan + provinsi + kategori terburuk + nilai tertinggi, mis. "Memantau asap karhutla Kalteng: Tidak Sehat (PM2.5 64,2)"
        from wa_operasi import STASIUN
        URUT = ['tidak sehat', 'sangat tidak sehat', 'berbahaya']
        prov_kh = {str(x['prov']) for x in s.KH}
        grup = {'asap karhutla': {}, 'polusi udara': {}} if s.KH else {'kualitas udara': {}}   # 6 Nov: laporan tanpa karhutla
        for k, v, kat in pm:
            if kat.lower() not in URUT: continue
            kode = next((c for kw, c in STASIUN.items() if kw in k.upper()), None)
            nama = (AKRONIM.get(PENDEK(kode), PENDEK(kode)) if kode else k).replace('DKI ', '')
            g = grup[('asap karhutla' if kode in prov_kh else 'polusi udara') if s.KH else 'kualitas udara'].setdefault(nama, [0, 0])
            g[0], g[1] = max(g[0], v), max(g[1], URUT.index(kat.lower()))
        for jenis, g in grup.items():
            if len(b2) >= 2 or not g: continue
            provs = sorted(g, key=lambda n: -g[n][0])
            kat = URUT[max(t[1] for t in g.values())].title()
            t_ = f"•  Memantau {jenis} {', '.join(provs)}: {kat} (PM2.5 {f1(g[provs[0]][0])})"
            if len(t_) > 59: t_ = muat(f"•  Memantau {jenis} {kat}: ", provs, 59)
            b2.append(t_)
        if not b2: b2 = ['•  Memantau kualitas udara di wilayah terdampak asap']
        # kolom ketiga: air bersih bila ada kekeringan (gaya lama), kejadian baru bila tidak, pemulihan sebagai cadangan
        br = [x for x in s.baru() if x['jenis'] != 'karhutla']
        if s.KR:
            kk = sum(x['angka'].get('kk', 0) for x in s.KR); lt = sum(x['angka'].get('liter', 0) for x in s.KR); tk = sum(x['angka'].get('tangki', 0) for x in s.KR)
            b3 = [f"•  Melanjutkan distribusi {f0(lt)} liter untuk ±{f0(kk)} KK"] if lt else [f"•  Mendistribusikan air bersih untuk ±{f0(kk)} KK"]
            kosong = [x['lokasi'] for x in s.KR if not x['angka'].get('liter')]
            besar = max(s.KR, key=lambda x: x['angka'].get('kk', 0))
            b3.append(muat('•  Mempercepat pendataan dan distribusi: ', kosong, 59) if kosong else f"•  Memprioritaskan {besar['lokasi']}: ±{f0(besar['angka'].get('kk', 0))} KK terdampak")
            k3 = ('daun_p', 'Air bersih', b3)
        elif br and s.KH:   # 7 Nov: tanpa karhutla kolom pertama sudah Kejadian baru; kolom ketiga jangan dobel
            k3 = ('awas_p', 'Kejadian baru', [muat('•  Mengkaji cepat dampak: ', [f"{x['lokasi'] or PENDEK(x['prov'])} ±{f0(x['angka']['kk'])} KK" if x['angka'].get('kk') else (x['lokasi'] or PENDEK(x['prov'])) for x in br], 59),
                                              '•  Mendampingi BPBD: logistik dan pembersihan material'])
        else:
            kb_ = {(y['jenis'], y['prov'], y['lokasi']) for y in br}; g = next((x for x in s.LN if x['tangani'] and (x['jenis'], x['prov'], x['lokasi']) not in kb_), None) or next((x for x in s.LN if x['tangani']), None)   # 7 Nov: kejadian lama dulu, yang baru sudah di kolom pertama
            k3 = ('awas_p', 'Pemulihan', [f"•  {JENIS_LAIN[g['jenis']][0]} {NAMA[g['prov']]}: pendampingan berlanjut"] if g else ['•  Pemantauan kejadian lain berlanjut'])
            if not s.KH and (not g or (g['jenis'], g['prov'], g['lokasi']) in kb_) and (s.w.get('awas') or s.w.get('siaga') or s.w.get('angin')):
                # 8 Nov: tanpa kejadian lama, kolom ketiga bukan "Pemulihan" atas kejadian baru, tapi peringatan dini cuaca BMKG
                pv = lambda d: [(lambda n: SINGKAT.get(n) or AKRONIM.get(re.sub(r'^(Kalimantan|Sumatera|Sulawesi) ', lambda m: m.group(1)[:3] + '. ', n), n))(n.replace('Sumatra', 'Sumatera')) for n in d]
                k3 = ('awas_p', 'Peringatan dini BMKG', ([muat(f"•  Hujan: Awas {', '.join(pv(s.w['awas']))}; Siaga ", pv(s.w['siaga']), 59)] if s.w.get('awas') and s.w.get('siaga')   # 9 Nov: tingkat Awas BMKG; satu baris supaya panel tidak meluap
                                                         else [muat('•  Awas hujan sangat lebat: ', pv(s.w['awas']), 59)] if s.w.get('awas')
                                                         else [muat('•  Siaga hujan lebat: ', pv(s.w['siaga']), 59)] if s.w.get('siaga') else [])
                                                      + ([muat('•  Angin kencang: ', pv(s.w['angin']), 59)] if s.w.get('angin') else []))
        if not s.KH:   # 6 Nov pemilik ("di slide itu gausah bahas karhutla lagi"): kolom pemadaman diganti kejadian baru / pendampingan
            if br:   # 6 Nov: kejadian baru yang sudah surut/selesai tidak "dikaji cepat", cukup dipantau pascabencana
                lk = lambda x: x['lokasi'] or PENDEK(x['prov'])
                isi_ = lambda x: f"{lk(x)} ±{f0(x['angka']['kk'])} KK" if x['angka'].get('kk') else f"{lk(x)} {f0(x['angka']['meninggal'])} MD" if x['angka'].get('meninggal') else lk(x)
                er = [x for x in br if x['jenis'] == 'erupsi']; br = [x for x in br if x['jenis'] != 'erupsi']   # 7 Nov: erupsi punya kolom sendiri
                bt, bs = [x for x in br if x['tangani']], [x for x in br if not x['tangani']]
                b0 = ([muat('•  Mengkaji cepat dampak: ', [isi_(x) for x in bt], 59)] if bt else []) + ([muat('•  Memantau pascabencana: ', [lk(x) for x in bs], 59)] if bs else [])
                k1 = ('awas_p', 'Kejadian baru', (b0 + ['•  Mendampingi BPBD: logistik dan pembukaan akses'])[:2])
            else:
                lg = [x for x in s.LN if x['tangani']]
                k1 = ('awas_p', 'Pendampingan', [muat('•  Mendampingi BPBD: ', [x['lokasi'] or PENDEK(x['prov']) for x in lg], 59)] if lg else ['•  Pemantauan kejadian lain berlanjut'])
            if er:   # 7 Nov pemilik (Bromo): kolom ketiga = pemantauan gunung api yang erupsi, bukan pemulihan kejadian lama
                k3 = ('awas_p', 'Gunung api', [muat('•  Memantau aktivitas: ', [JENIS_LAIN['erupsi'][0].replace('Erupsi ', '') if JENIS_LAIN['erupsi'][0] != 'Erupsi' else x['lokasi'] for x in er], 59),
                                               '•  Menjaga radius aman dari kawah aktif'])
            return [k1, ('pendaki_p', 'Keselamatan warga', b2), k3]
        return [('heli_p', 'Pemadaman prioritas', b1), ('pendaki_p', 'Keselamatan warga', b2), k3]

    def detail(s, x):
        a = x['angka']
        if x['jenis'] in ('gempabumi', 'banjir', 'longsor', 'gelombang_pasang'):   # 11 Nov: rob/abrasi = jalur banjir, bukan pil api
            pil = []
            if a.get('transisi_sd'):
                d = dt.date.fromisoformat(a['transisi_sd']); pil.append((f'Transisi s.d. {d.day} {BULAN[d.month - 1][:3]}', T_ORG, ORG, 'kalender_oranye'))
            if a.get('huntara'): pil.append((f"{f0(a['huntara'])} huntara", T_NAVY, NAVY, 'rumah_navy'))
            stat = [((('±' if k in ('mengungsi', 'kk') else '') + f0(a[k])), lab, ik, c) for k, lab, ik, c in (('mengungsi', 'jiwa mengungsi', 'tenda_slate', SLATE), ('meninggal', 'jiwa meninggal', 'hati_merah', MERAH), ('hilang', 'jiwa hilang', 'hati_merah', MERAH),
                                                                         ('rumah', 'rumah rusak', 'rumah_slate', SLATE)) if a.get(k)]
            if a.get('rumah_dampak') and len(stat) < 3: stat.append((f"±{f0(a['rumah_dampak'])}", 'rumah terdampak', 'rumah_slate', SLATE))
            if a.get('kk') and len(stat) < 3: stat.append((f"±{f0(a['kk'])}", 'KK terdampak', 'orang_slate', SLATE))
            if a.get('potensi_kk') and len(stat) < 3: stat.append((f"±{f0(a['potensi_kk'])}", 'KK berpotensi terdampak', 'orang_slate', SLATE))
            return {'pil': (s.ket(x) if s.LAMPIRAN else []) + pil, 'stat': stat}   # 30 Okt: keterangan BPBD singkat ("Banjir sudah surut")
        if x['jenis'] == 'kekeringan':   # kekeringan yang tampil di box Bencana lainnya (kejadian baru, 30 Okt)
            stat = [(f"±{f0(a[k])}", lab, ik, c) for k, lab, ik, c in (('kk', 'KK terdampak', 'orang_k', KER), ('jiwa', 'jiwa terdampak', 'orang_k', KER), ('liter', 'liter air bersih', 'tetes_k', KER)) if a.get(k)]
            return {'pil': s.ket(x), 'stat': stat}
        if x['jenis'] in ('angin', 'cuaca'):
            rusak = ', '.join(t for t in (f"{f0(a['kios'])} kios" if a.get('kios') else '', f"{f0(a['rumah'])} rumah" if a.get('rumah') else '') if t)
            return {'pil': ([(f"{f0(a['meninggal'])} jiwa meninggal", 'F7F8FA', MERAH, 'hati_merah')] if a.get('meninggal') else [])   # 3 Nov Dairi
                    + ([(f'{rusak} rusak', 'F7F8FA', INK, 'rumah_slate')] if rusak else [])
                    + ([(f"±{f0(a['rumah_dampak'])} rumah terdampak", 'F7F8FA', INK, 'rumah_slate')] if a.get('rumah_dampak') and not rusak else [])
                    + ([(f"±{f0(a['kk'])} KK", 'F7F8FA', INK, 'orang_slate')] if a.get('kk') else [])
                    + (s.ket(x) if s.LAMPIRAN else [('penanganan' if x['tangani'] else 'selesai', T_ORG if x['tangani'] else T_NAVY, ORG if x['tangani'] else NAVY, 'awas_oranye' if x['tangani'] else 'kalender_navy')])}
        kon = x['teks']['kondisi'].lower()
        st = 'pendinginan' if 'pendinginan' in kon else 'masih pemadaman' if x['status'] == 'belum' else 'padam' if x['status'] == 'selesai' else 'penanganan'
        luas = [(f"± {f0(a['ha']) if a['ha'] == int(a['ha']) else str(a['ha']).replace('.', ',')} ha terbakar", 'F7F8FA', INK, 'sampah_slate')] if a.get('ha') else []
        if s.LAMPIRAN: return {'pil': luas + s.ket(x)}   # 30 Okt: TPA dll. memakai keterangan BPBD singkat
        return {'pil': luas + [(st, T_ORG if x['tangani'] else T_NAVY, ORG if x['tangani'] else NAVY, 'api_oranye' if x['tangani'] else 'kalender_navy')]}

    def judul(s):
        mulai = dt.date.fromisoformat(s.wa['mulai'][:10]); sampai = dt.date.fromisoformat(s.wa['sampai'][:10])
        H, P = (lambda t: (t, ORG, True)), (lambda t: (t, INK, True))
        pk = list(dict.fromkeys(NAMA[x['prov']] for x in s.KR))
        # 31 Okt pemilik: "kata '0 kekeringan' hapus aja" -> jenis berjumlah nol tidak disebut di judul
        def bagian(kr_tambah=''):
            bag = [b for b in ((len(s.KH), ' karhutla'), (len(s.KR), ' kekeringan' + kr_tambah), (len(s.LN), ' bencana lainnya')) if b[0]]
            if getattr(s, 'V3', False) and not s.KH and not s.KR:   # 7 Nov: tanpa karhutla dan kekeringan, "terdiri atas 7 bencana lainnya" janggal -> pecah per jenis seperti kartu
                bag = [(n, ' ' + (v[0][0].lower() + v[0][1:]).replace('Gn. ', 'Gn. ')) for j, v in JENIS_LAIN.items() for n in [sum(1 for x in s.LN if x['jenis'] == j)] if n]
            o = []
            for i, (n, lab) in enumerate(bag):
                if i: o.append(P(', dan ' if i == len(bag) - 1 and len(bag) > 2 else ' dan ' if i == len(bag) - 1 else ', '))
                o += [H(f0(n)), P(lab)]
            return o
        J2 = [P(f'Laporan {rentang(mulai, sampai)}: '), H(f0(s.N_TOT)), P(' kejadian di '), H(f'{s.N_PROV} provinsi'), P(', terdiri atas ')] + bagian()   # pemilik 25 Okt: tanpa jumlah dalam penanganan di judul
        J3 = [P('Rincian '), H(f0(s.N_TOT)), P(' kejadian: ')] + bagian(' di ' + ' dan '.join(pk) if 0 < len(pk) <= 2 else f' di {len(pk)} provinsi' if pk else '')
        return J2, J3

    # ---------------------------------------------------------- slide 2: ringkasan
    def peta_blok(s, MX, MY, MW, MH, V3, leg, k=1.0, kl=1.0):
        """Peta ringkasan: lingkaran jumlah kejadian per provinsi + label, tanda seru (bukan versi 3), legenda di leg=(x, y) atau None.
        k = skala lingkaran dan label (peta kecil alternatif 4/5, 6 Nov); kl = skala legenda."""
        o = s.gambar(MX, MY, MW, MH, 'peta.png'); KJ = s.KJ
        per = {}
        for x in KJ: per.setdefault(x['prov'], []).append(x)
        # posisi lingkaran: pusat poligon terbesar + GESER manual untuk provinsi yang rapat; label dipilih otomatis (kanan, kiri, bawah) yang
        # tidak menabrak lingkaran/label lain atau tepi peta; urutan KIRI/BAWAH lama jadi pilihan pertama provinsi itu.
        KIRI = {'15', '16', '61', '12', '32', '71', '93', '95'}; BAWAH = {'34', '63', '73'}
        GESER = {'19': (40, 25), '32': (0, 10), '33': (0, -15), '35': (40, 0), '96': (-30, 0), '73': (0, 30), '72': (-20, 0)}
        titik = {}
        for p in per:
            px, py = s.TT['pusat'][p]; dx, dy = GESER.get(p, (0, 0)); titik[p] = (MX + (px + dx) / s.TT['PW'] * MW, MY + (py + dy) / s.TT['PH'] * MH)
        besar = lambda xs: k * (lambda u: 219456 if u <= 1 else 265176 if u <= 3 else 310896)(sum(1 for x in xs if x['jenis'] == 'karhutla') or len(xs))
        # 10 Nov pemilik ("di peta, tambahin titik gunung yang lagi siaga, terus kasih icon"): penanda berikon di koordinat gunung Level III/IV PVMBG;
        # nama di bawahnya. Lingkaran provinsi yang menimpa penanda digeser ke utara, posisi gunung tidak pernah digeser
        GA_T, dg = [], int(146304 * k)
        if V3 and s.GA:
            ab_ = json.load(open(os.path.join(AKAR, 'public', 'banjir', 'data', 'abu_gunungapi.json'), encoding='utf-8'))['gunung']
            for g in s.GA['gunung']:
                if g['level'] not in ('Awas', 'Siaga'): continue
                nm_g = re.sub(r'^(Gn\.|Gunung)\s*', '', g['nama']); pk = next((a_ for a_ in ab_ if a_['nama'].lower() == nm_g.lower()), None)
                if not pk: print('PERINGATAN gunung tanpa koordinat:', g['nama']); continue
                GA_T.append((nm_g, MX + (pk['lon'] - 95.0) / 45.9 * MW, MY + (6.2 - pk['lat']) / 17.2 * MH, MERAH if g['level'] == 'Awas' else ORG))
            for p, (cx, cy) in titik.items():
                perlu = besar(per[p]) / 2 + dg / 2 + 18288
                for _, gx, gy, _w in GA_T:
                    if (cx - gx) ** 2 + (cy - gy) ** 2 < perlu ** 2: cy = gy - (perlu ** 2 - (cx - gx) ** 2) ** .5
                titik[p] = (cx, cy)
        terisi = [(cx - besar(per[p]) / 2, cy - besar(per[p]) / 2, cx + besar(per[p]) / 2, cy + besar(per[p]) / 2) for p, (cx, cy) in titik.items()]
        terisi += [(gx - dg / 2, gy - dg / 2, gx + dg / 2, gy + dg / 2 + 137160) for _, gx, gy, _w in GA_T]
        # 10 Nov pemilik: peringatan dini masuk peta, lingkaran putih bertanda seru, garis dan tanda oranye atau merah; PERINGATAN_PETA = [(lon, lat, label, 'merah'|'oranye', sisi label)]
        PD_T, dp = [], int(201168 * k)
        for lon_, lat_, lab_, wr_, sisi_ in (getattr(s, 'PERINGATAN_PETA', None) or [] if V3 else []):
            gx, gy = MX + (lon_ - 95.0) / 45.9 * MW, MY + (6.2 - lat_) / 17.2 * MH; lw_ = len(lab_.split('|')[0]) * 46000 * k   # label "Daerah|Bahaya": hanya nama daerah yang tampil (10 Nov pemilik: "tampilin daerahnya", nama bahaya "gausah ada di peta"); bahaya dipakai memilih ikon
            PD_T.append((gx, gy, lab_, MERAH if wr_ == 'merah' else ORG, sisi_, lw_))
            terisi += [(gx - dp / 2, gy - dp / 2, gx + dp / 2, gy + dp / 2), (gx - dp / 2 - 36576 - lw_, gy - 73152, gx - dp / 2, gy + 73152) if sisi_ == 'kiri' else (gx + dp / 2, gy - 73152, gx + dp / 2 + 36576 + lw_, gy + 73152)]
        tabrak = lambda r: r[0] < MX or r[2] > MX + MW or any(not (r[2] <= q[0] or q[2] <= r[0] or r[3] <= q[1] or q[3] <= r[1]) for q in terisi)
        for p, xs in per.items():
            cx, cy = titik[p]
            # 6 Nov pemilik (Aceh 3 banjir + 1 longsor tergambar "4" biru, padahal legenda membedakan warnanya): lingkaran utama = karhutla, atau
            # jenis terbanyak; tiap jenis lain jadi lencana kecil berwarna jenisnya di pojok bawah lalu atas (jumlah per warna = tabel)
            hit = Counter(x['jenis'] for x in xs)
            # 10 Nov pemilik ("audiens juga bisa tahu kalo itu jenis bencana hidro atau geo/vul pada peta"): warna tetap per bencana; bentuk = kelompok,
            # lingkaran hidrometeorologi, kotak geologi dan vulkanologi
            bj = lambda j: 'roundRect' if V3 and j in GEO_VUL else 'ellipse'
            wj = lambda j: ORG if j == 'karhutla' else KER if j == 'kekeringan' else JENIS_LAIN[j][2]
            uj = sorted(hit, key=lambda j: (j != 'karhutla', -hit[j], j == 'kekeringan'))
            utama, warna = hit[uj[0]], wj(uj[0]); lain_j = uj[1:]
            d = besar(xs)
            o += s.kotak(cx - d / 2, cy - d / 2, d, d, warna, bj(uj[0]), ln='FFFFFF', lw=19050, adj=22000 if bj(uj[0]) == 'roundRect' else None) + s.tx(cx - d / 2, cy - d / 2, d, d, [str(utama)], sz=int(850 * k), b=True, c='FFFFFF', al='ctr', an='ctr')
            for (sdx, sdy), j in zip(((1, 1), (-1, 1), (-1, -1), (1, -1)), lain_j):   # kanan-atas terakhir: tempat tanda seru (bukan versi 3)
                q = 155448 * k; bx, by = cx + sdx * d * .42 - q / 2, cy + sdy * d * .42 - q / 2
                o += s.kotak(bx, by, q, q, wj(j), bj(j), ln='FFFFFF', lw=12700, adj=22000 if bj(j) == 'roundRect' else None) + s.tx(bx, by, q, q, [str(hit[j])], sz=int(650 * k), b=True, c='FFFFFF', al='ctr', an='ctr')
            np_ = 0 if V3 else sum(1 for x in xs if x['perhatian'])
            if np_:   # 3 Nov atasan ("perlu perhatiannya 7, disini cuma 6 tanda seru"): satu tanda seru per kejadian, berjajar ke kanan
                q = 137160; qw = q if np_ == 1 else int(q * 1.6)   # 3 Nov atasan: dua kejadian = satu badge "2!", bukan dua tanda seru
                ex = cx + d * .42 - q / 2
                o += (s.kotak(ex, cy - d * .42 - q / 2, qw, q, MERAH, 'ellipse' if np_ == 1 else 'roundRect', ln='FFFFFF', lw=12700, adj=None if np_ == 1 else 50000)
                      + s.tx(ex, cy - d * .42 - q / 2, qw, q, ['!' if np_ == 1 else f'{np_}!'], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none'))
            nm = PENDEK(p); lw = k * (60000 + len(nm) * 52000)
            yb = max(d / 2 + 27432, d * .42 + 77724 + 18288 if lain_j else 0)
            calon = {'kanan': (cx + d / 2 + 54864, cy - 73152, cx + d / 2 + 54864 + lw, cy + 73152), 'kiri': (cx - d / 2 - 54864 - lw, cy - 73152, cx - d / 2 - 54864, cy + 73152),
                     'bawah': (cx - lw / 2, cy + yb, cx + lw / 2, cy + yb + 146304), 'atas': (cx - lw / 2, cy - d / 2 - 173736, cx + lw / 2, cy - d / 2 - 27432)}
            urut = ['kiri', 'bawah', 'kanan'] if p in KIRI else ['bawah', 'kanan', 'kiri'] if p in BAWAH else ['kanan', 'kiri', 'bawah']
            sisi = next((u for u in urut + (['atas'] if V3 else []) if not tabrak(calon[u])), None if k < 1 else urut[0])   # 10 Nov: penanda gunung menutup sisi lain, label naik ke atas lingkaran
            if sisi is None: continue   # 6 Nov: peta kecil alternatif 4/5, label yang menimpa label lain dilewati
            r = calon[sisi]; terisi.append(r)
            o += (s.tx(r[2] - 1463040, cy - 73152, 1463040, 146304, [nm], sz=int(750 * k), b=True, al='r', an='ctr') if sisi == 'kiri'
                  else s.tx(cx - 731520, r[1], 1463040, 146304, [nm], sz=int(750 * k), b=True, al='ctr', an='ctr') if sisi in ('bawah', 'atas')
                  else s.tx(r[0], cy - 73152, 1463040, 146304, [nm], sz=int(750 * k), b=True, an='ctr'))
        for nm_g, gx, gy, w_g in GA_T:
            o += s.kotak(gx - dg / 2, gy - dg / 2, dg, dg, w_g, 'triangle', ln='FFFFFF', lw=12700)   # 10 Nov pemilik: "cukup segitiga warna oren untuk siaga dan merah untuk awas"
            o += s.tx(gx - 457200, gy + dg / 2, 914400, 137160, [nm_g], sz=int(700 * k), b=True, c=w_g, al='ctr', an='ctr', wrap='none')
        for gx, gy, lab_, c_, sisi_, lw_ in PD_T:
            ik_ = ('asapsolid' if 'PM2' in lab_ else 'anginsolid' if 'ngin' in lab_ else 'hujansolid') + ('_merah' if c_ == MERAH else '_oranye')   # 10 Nov pemilik: lingkaran besar berisi ikon bahaya, lencana kecil bertanda seru di kanan atas
            lab_ = [(lab_.split('|')[0], INK, True)]
            db = dp * .56; bx, by = gx + dp * .36 - db / 2, gy - dp * .36 - db / 2
            o += s.kotak(gx - dp / 2, gy - dp / 2, dp, dp, 'FFFFFF', 'ellipse', ln=c_, lw=15875) + s.gambar(gx - dp * .3, gy - dp * .3, dp * .6, dp * .6, ik_)
            o += s.kotak(bx, by, db, db, c_, 'ellipse', ln='FFFFFF', lw=9525) + s.tx(bx, by, db, db, ['!'], sz=int(700 * k), b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none')   # 10 Nov pemilik: lencana solid
            o += (s.tx(gx - dp / 2 - 36576 - 1463040, gy - 73152, 1463040, 146304, [lab_], sz=int(680 * k), al='r', an='ctr', wrap='none') if sisi_ == 'kiri'
                  else s.tx(gx + dp / 2 + 36576, gy - 73152, 1463040, 146304, [lab_], sz=int(680 * k), an='ctr', wrap='none'))
        n_seru = sum(1 for x in KJ if x['perhatian'])
        if not V3 and n_seru != len(s.SER): raise AssertionError(f'peta {n_seru} tanda seru, kartu perlu perhatian {len(s.SER)} (atasan 3 Nov: harus sama)')
        if leg is None: return o
        lx, ly = leg
        lain_ent = [(k_, v) for k_, v in JENIS_LAIN.items() if any(x['jenis'] == k_ for x in s.LN)]
        if V3:   # 10 Nov pemilik: legenda rata tengah, dan dikelompokkan hidrometeorologi | geologi dan vulkanologi
            hid_ = ([('ellipse', ORG, 'karhutla', False)] if s.KH else []) + ([('ellipse', KER, 'kekeringan', False)] if s.KR else []) + [('ellipse', v[2], v[0][0].lower() + v[0][1:], False) for k_, v in lain_ent if k_ not in GEO_VUL and k_ != 'lainnya']
            geo_ = [('roundRect', v[2], v[0][0].lower() + v[0][1:], False) for k_, v in lain_ent if k_ in GEO_VUL]
            if GA_T: geo_ += [('triangle', MERAH if l_ == 'Awas' else ORG, f'gunung api {l_}', False) for l_ in ('Awas', 'Siaga') if any(g['level'] == l_ for g in s.GA['gunung'])]
            pd_w = {c_ for *_x, c_, _s, _l in PD_T}
            ent = hid_ + geo_ + ([('seru', ORG, 'peringatan dini', False)] if pd_w else [])   # 10 Nov atasan: label "Hidrometeorologi" di legenda "gausah ada. Ini istilah internal kita aja"
        else:
            ent = ([('rect', ORG, 'karhutla', False)] if s.KH else []) + ([('ellipse', KER, 'kekeringan', False)] if s.KR else []) + [('ellipse', v[2], v[0][0].lower() + v[0][1:], False) for k_, v in lain_ent] + [('ellipse', MERAH, 'perlu perhatian', True)]
        qe = lambda b_: 128016 if b_ == 'rect' else 146304
        JEDA = 118872 if V3 else 228600
        lb = lambda t_: len(t_) * (46000 if V3 else 52000) * kl + JEDA * kl
        if V3: lx = MX + (MW - (sum(qe(b_) + 54864 + lb(t_) for b_, _w, t_, _s in ent) - JEDA * kl)) / 2
        for bentuk, w, t, seru in ent:
            q = qe(bentuk)
            if bentuk == 'seru': o += s.kotak(lx, ly + 22860, q, q, 'FFFFFF', 'ellipse', ln=w, lw=15875) + s.kotak(lx + q * .58, ly + 22860 - q * .12, q * .54, q * .54, w, 'ellipse', ln='FFFFFF', lw=6350) + s.tx(lx + q * .58, ly + 22860 - q * .12, q * .54, q * .54, ['!'], sz=600, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none')
            else: o += s.kotak(lx, ly + 22860 + (146304 - q) / 2, q, q, w, bentuk, adj=22000 if bentuk == 'roundRect' else None) + (s.tx(lx, ly + 22860, q, q, ['!'], sz=750, b=True, c='FFFFFF', al='ctr', an='ctr') if seru else '')
            o += s.tx(lx + q + 54864, ly, 1463040, 192024, [t], sz=int(750 * kl), an='ctr', wrap='none'); lx += q + 54864 + lb(t)
        return o

    def s2(s):
        KJ, I = s.KJ, s.I
        # 6 Nov pemilik (versi 3, 2 slide): "perlu perhatian gausah, hapus aja" -> kotak, tanda seru peta, dan legendanya hilang;
        # "status penanganan ganti sama informasi bencana" -> tabel bencana, provinsi, kab/kota, dampak KK (s.info_bencana)
        V3 = getattr(s, 'V3', False)
        o = s.kotak(548640, 1280160, 11094415 if V3 else 8579267, 932688, 'F3F5F8', 'roundRect', adj=7843) + s.pil_bagian(658368, 1335024, 1525219, 'KEJADIAN BENCANA', 'papan_p', NAVY)
        if not V3: o += s.kotak(9402227, 1280160, 2240829, 932688, 'FCF1F2', 'roundRect', adj=7843) + s.pil_bagian(9511955, 1335024, 1453896, 'PERLU PERHATIAN', 'awas_p', MERAH)
        T = [('papan_n', T_NAVY, f0(s.wa['laporan']), 'laporan kejadian', NAVY), ('seru_n', T_NAVY, f0(s.N_TOT), 'kejadian menonjol', NAVY),
             ('api_o', T_ORG, f0(len(s.KH)), 'karhutla', ORG), ('daun_k', T_KER, f0(len(s.KR)), 'kekeringan', KER), ('awas_b', T_SLATE, f0(len(s.LN)), 'bencana lainnya', SLATE)]
        if V3:   # 6 Nov pemilik: "bencana lainnya pecah aja: hari ini kan ada gempa, banjir, dan angin", "iconnya juga sesuaikan"
            IKK = {'gempa': 'gempa_slate', 'banjir': 'banjir_navy', 'angin': 'angin_slate', 'longsor': 'longsor_coklat', 'api': 'api_merah', 'gunung': 'gunung_merah'}
            # 10 Nov pemilik: kartu "laporan kejadian" (jumlah WA) dihapus, "kejadian menonjol" berganti nama "laporan kejadian"; "gausah pisahin per bencana, bikin 2 aja: hidrometeorologi,
            # geologi dan vulkanologi", "iconnya juga sesuaikan". Geologi dan vulkanologi = gempa bumi dan erupsi; tanah longsor ikut hidrometeorologi; Kebakaran TPA bukan keduanya
            n_geo = sum(1 for x in s.LN if x['jenis'] in GEO_VUL); n_hid = len(s.KH) + len(s.KR) + sum(1 for x in s.LN if x['jenis'] not in GEO_VUL and x['jenis'] != 'lainnya')
            T = [('papan_n', T_NAVY, f0(s.N_TOT), 'laporan kejadian', NAVY), ('hujan_navy', 'DCE7F5', f0(n_hid), 'hidrometeorologi', '2F6FB5'), ('gunung_coklat', 'EFE4D8', f0(n_geo), 'geologi dan vulkanologi', '7A5230')]
        kw = ((11094415 - 2 * 109728) if V3 else 8359811) - (len(T) - 1) * 91440; kw //= len(T)
        for i, t in enumerate(T): o += s.kartu(658368 + i * (kw + 91440), 1591056, *t, w=kw)
        if not V3: o += s.kartu(9511955, 1591056, 'awas_merah', T_MERAH, f0(len(s.SER)), 'kejadian perlu perhatian', MERAH)
        MX, MY, MW, MH = 502920, 2331720, 7680960, 2880360
        MENURUN = V3 and getattr(s, 'MENURUN', False)
        PX = 6309360   # alternatif 3: panel Informasi bencana melebar ke kiri, peta mengecil (rasio tetap) dan rata tengah tegak
        PIL_ = V3 and getattr(s, 'INFO_PIL', False)   # 7 Nov pemilik: kolom DAMPAK dan KONDISI berupa pil -> panel melebar ke kiri, peta mengecil
        if PIL_: PX = 7955280 if getattr(s, 'TANPA_KONDISI', False) else 6858000   # 10 Nov: tanpa KONDISI panel menyempit, peta melebar
        if MENURUN or PIL_: MW_ = PX - 91440 - MX; MY += (MH - MW_ * MH // MW) // 2; MW, MH = MW_, MW_ * MH // MW
        o += s.peta_blok(MX, MY, MW, MH, V3, (640080 if MENURUN else 1371600, 5184648))
        if MENURUN: return o + s.info_bencana_menurun(PX, 2331720, 11643055 - PX, 3017520) + s.strip_tindak()
        if PIL_: return o + s.info_bencana(PX, 11643055 - PX) + s.strip_tindak()
        if V3: return o + s.info_bencana() + s.strip_tindak()
        # status penanganan: batang selesai | belum selesai, lalu daftar perlu perhatian (semua jenis)
        o += s.kotak(8503920, 2331720, 3139135, 3017520, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.tx(8668512, 2441448, 2864815, 182880, ['STATUS PENANGANAN'], sz=750, b=True, c=NAVY, spc=100)
        # format templat 221026 (pemilik 26 Okt: "formatnya sesuai template"): bar persen, kartu selesai / dalam penanganan, daftar karhutla dalam penanganan
        BW = 2809951; ws = round(BW * s.N_SEL / s.N_TOT); pct = round(s.N_SEL / s.N_TOT * 100)
        o += s.kotak(8668512, 2697480, ws, 201168, NAVY) + s.tx(8668512, 2697480, ws, 201168, [f'{pct}%'], sz=750, b=True, c='FFFFFF', al='ctr', an='ctr')
        o += s.kotak(8668512 + ws, 2697480, BW - ws, 201168, ORG) + s.tx(8668512 + ws, 2697480, BW - ws, 201168, [f'{100 - pct}%'], sz=750, b=True, c='FFFFFF', al='ctr', an='ctr')
        for x0, f, w, ik, n, lab in ((8668512, T_NAVY, NAVY, 'cek_p', s.N_SEL, 'selesai'), (10110064, T_ORG, ORG, 'titik3_p', s.N_TOT - s.N_SEL, 'dalam penanganan')):
            o += s.kotak(x0, 2971800, 1368400, 512064, f, 'roundRect', adj=9000) + s.kotak(x0 + 109728, 3063240, 329184, 329184, w, 'ellipse') + s.gambar(x0 + 192024, 3145536, 164592, 164592, ik)
            o += s.tx(x0 + 512064, 2990088, 819760, 292608, [[(f0(n), w, True), (f'  / {f0(s.N_TOT)}', TEKS, False)]], sz=1700, an='ctr') + s.tx(x0 + 512064, 3273552, 840000, 164592, [lab], sz=680, b=True, c=w)
        # pemilik 27 Okt: daftar memuat semua bencana yang ditangani, bukan karhutla saja; jenis terbanyak diringkas satu baris bila tak muat
        lain = [x for x in s.KR + s.LN if x['tangani']]
        baris = [('kh', x) for x in sorted(s.KH_T, key=lambda x: -x['sat']['sisa'])] + [('satu', x) for x in lain]
        MAKS = (5250000 - 3840480) // 164592
        while len(baris) > MAKS:
            # 3 Nov atasan ("banjir dipisah aja jadi 2 provinsi"): banjir diringkas per provinsi, jenis lain per jenis
            kunci = lambda x: (x['jenis'], x['prov']) if x['jenis'] == 'banjir' else (x['jenis'], None)
            hit = Counter(kunci(x) for k, x in baris if k == 'satu')
            if not hit or hit.most_common(1)[0][1] < 2: break
            j = hit.most_common(1)[0][0]; xs = [x for k, x in baris if k == 'satu' and kunci(x) == j]
            i = next(n for n, (k, x) in enumerate(baris) if k == 'satu' and kunci(x) == j)
            baris = [b for b in baris if not (b[0] == 'satu' and kunci(b[1]) == j)]; baris.insert(i, ('grup', xs))
        jen = lambda b: (b[1] if b[0] == 'satu' else b[1][0])['jenis'] if b[0] in ('satu', 'grup') else None
        urut_j = list(dict.fromkeys(jen(b) for b in baris if jen(b)))   # 3 Nov: baris banjir per provinsi berurutan
        baris = [b for b in baris if not jen(b)] + sorted([b for b in baris if jen(b)], key=lambda b: urut_j.index(jen(b)))
        MAKS2 = (5250000 - 3840480) // 128016   # 30 Okt: 13 karhutla + 5 grup bertumpuk; baris >= 1,28 juta EMU, karhutla sisa terkecil digabung
        if s.LAMPIRAN and len(baris) > MAKS2:
            kh = [b for b in baris if b[0] == 'kh']; sisa_b = len(baris) - len(kh); simpan = max(MAKS2 - sisa_b - 1, 3)
            if len(kh) > simpan + 1:
                baris = kh[:simpan] + [('khgrup', [x for _, x in kh[simpan:]])] + [b for b in baris if b[0] != 'kh']
        o += s.garis(8668512, 3557016, 2809951, 'E5E7EB') + s.tx(8668512, 3621024, 2864815, 182880, [f'BENCANA DALAM PENANGANAN ({s.N_TOT - s.N_SEL})'], sz=750, b=True, c=MERAH, spc=100)
        rp = min(164592, (5250000 - 3840480) // max(1, len(baris))); XE = 11180000   # ujung kanan angka pil; satuan terpanjang ("rumah") masih di dalam pil
        def ringkas(xs):
            a = {m: sum(x['angka'].get(m, 0) for x in xs) for m in ('kk', 'rumah', 'rumah_dampak', 'mengungsi', 'jiwa', 'ha')}
            ha = f0(a['ha']) if a['ha'] == int(a['ha']) else str(round(a['ha'], 1)).replace('.', ',')   # TPA 28 Okt: ±15,5 ha, bukan "penanganan"
            return (f"{f0(a['kk'])} KK" if a['kk'] else f"{ha} ha" if a['ha'] else f"{f0(a['rumah'] or a['rumah_dampak'])} rumah" if a['rumah'] or a['rumah_dampak']
                    else f"{f0(a['mengungsi'])} mengungsi" if a['mengungsi'] else 'dalam pendataan')   # 4 Nov pemilik: Solok tanpa angka KK
        for n, (k, x) in enumerate(baris):
            y = 3840480 + n * rp; q = int(rp * .8)
            if n: o += s.garis(8668512, y - (rp - q) // 2, 2809951, 'F1F2F4')
            if k == 'khgrup':   # karhutla sisa terkecil, satu baris; rinciannya di lampiran 1
                tot = sum(y_['sat']['sisa'] for y_ in x)
                k, x = 'kh', {'prov': None, 'lokasi': '', 'perhatian': any(y_['perhatian'] for y_ in x), 'sat': {'sisa': tot}}
                w, tint, tc, ik, isi = ORG, T_ORG, ORG, 'api_p', s.sisa_teks(x['sat'])
                nm = [('Karhutla lainnya', INK, True), (f', {len(baris[n][1])} provinsi', TEKS, False)]
            elif k == 'kh':
                w, tint, tc, ik, isi = ORG, T_ORG, ORG, 'api_p', s.sisa_teks(x['sat'])
                nm = [(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], TEKS, False)] if x['lokasi'] else [])
            else:
                xs = x if k == 'grup' else [x]; j = xs[0]['jenis']
                w, tint, tc, ik = (KER, T_KER, '8A6A2E', 'daun_p') if j == 'kekeringan' else (JENIS_LAIN[j][2], JENIS_LAIN[j][3], JENIS_LAIN[j][2], JENIS_LAIN[j][1] + '_putih')
                isi = ringkas(xs)
                nm = ([(NAMA[x['prov']], INK, True), (', ' + x['lokasi'], TEKS, False)] if k == 'satu' and x['lokasi'] else [(NAMA[x['prov']], INK, True)] if k == 'satu'
                      else [('Kekeringan' if j == 'kekeringan' else JENIS_LAIN[j][0], INK, True), (f", {len(xs)} kab/kota di {len({y_['prov'] for y_ in xs})} provinsi", TEKS, False)]
                      if len({y_['prov'] for y_ in xs}) > 1 else [(JENIS_LAIN[j][0] if j != 'kekeringan' else 'Kekeringan', INK, True), (f", {NAMA[xs[0]['prov']]}, {len(xs)} kab/kota", TEKS, False)])
                if k == 'satu' and j == 'banjir': nm = [('Banjir', INK, True), (f", {NAMA[x['prov']]}" + (f", {x['lokasi']}" if x['lokasi'] else ''), TEKS, False)]   # 3 Nov: baris banjir menyebut jenis dan provinsi
                if k == 'grup' and len(nm[0][0] + nm[-1][0]) > 36:   # 30 Okt: "Kebakaran TPA, 2 kab/kota di 2 provinsi" terpotong di kolom 1,76 juta EMU
                    nm[-1] = (nm[-1][0].replace(' provinsi', ' prov.'), TEKS, False)
            o += s.kotak(8668512, y, q, q, w, 'ellipse') + s.gambar(8668512 + q * .19, y + q * .19, q * .62, q * .62, ik)
            if x['perhatian'] if k != 'grup' else any(y_['perhatian'] for y_ in x):   # tanda ! sama dengan peta
                bq = q * .55; o += s.kotak(8668512 + q * .7, y - q * .2, bq, bq, MERAH, 'ellipse', ln='FFFFFF', lw=6350) + s.tx(8668512 + q * .7, y - q * .2, bq, bq, ['!'], sz=500, b=True, c='FFFFFF', al='ctr', an='ctr')
            o += s.tx(8869680, y - (164592 - q) // 2, 1758391, 164592, [nm], sz=760, an='ctr', wrap='none')
            if k == 'kh':
                o += s.kotak(10470000, y, 1070000, q, tint, 'roundRect', adj=50000) + s.gambar(10520000, y + q * .16, q * .68, q * .68, 'api_o2')
                o += (s.tx(10650000, y, 260000, q, ['sisa'], sz=720, b=True, c=tc, an='ctr', wrap='none') + s.au(XE, y, q, f"± {f0(x['sat']['sisa'])}", 'ha', 720, c=tc, wn=380000, wu=200000)
                      if round(x['sat']['sisa']) or not x['sat'].get('api') else s.tx(10746943, y, 713232, q, [isi], sz=620, b=True, c=tc, an='ctr', wrap='none'))
            else:
                pe = s.pecah(isi); ikp = 'api_merah' if pe and pe[1] == 'ha' else ('orang' if pe and pe[1] == 'KK' else 'rumah') + ('_k' if j == 'kekeringan' else '_slate')
                if pe and pe[1] == 'ha': pe = (f'± {pe[0]}', 'ha')
                o += s.kotak(10470000, y, 1070000, q, tint, 'roundRect', adj=50000) + s.gambar(10520000, y + q * .16, q * .68, q * .68, ikp)
                o += s.au(XE, y, q, *pe, 720, c=tc, wn=500000, wu=300000) if pe else s.tx(10545775, y, 932688, q, [isi], sz=620, b=True, c=tc, al='ctr', an='ctr', wrap='none')
        return o + s.strip_tindak()

    def info_bencana(s, X=8503920, W=3139135):
        """Versi 3 (6 Nov pemilik): panel kanan slide ringkasan = INFORMASI BENCANA, satu baris per kejadian menonjol: bencana, provinsi,
        kab/kota, dampak KK ("kalau gaada infonya strip aja"). Urut karhutla (sisa terbesar), kekeringan, lalu bencana lainnya; nama jenis
        hanya di baris pertama kelompoknya."""
        Y, H = getattr(s, 'INFO_Y', None) or (2331720, 3017520)   # 10 Nov pemilik: panel bisa dinaikkan sejajar atas kartu
        PIL_ = getattr(s, 'INFO_PIL', False)
        o = s.kotak(X, Y, W, H, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.tx(X + 164592, Y + 109728, W - 329184, 182880, ['INFORMASI BENCANA'], sz=750, b=True, c=NAVY, spc=100)
        XL = X + 109728; WL = W - 219456
        # 6 Nov pemilik: kab/kota karhutla tingkat provinsi tidak di-strip -> kabupaten yang masih bersisa api di website (x['kab_api'], sisa
        # terbesar dulu, diisi jalan.py); dampak = KK, ditambah MD bila ada ("data pentingnya tampilkan", teks Menko PMK)
        CB, CP, CK = 800000, 500000, 900000
        # 7 Nov pemilik ("Erupsi Gn. Bromo" menimpa kolom provinsi): kolom BENCANA melebar sesuai nama terpanjang (diukur Roboto tebal 7 pt),
        # diambil dari kolom PROVINSI (paling banyak 25.000 EMU, kepala PROVINSI tetap lega) lalu dari kolom DAMPAK
        nm_ = [v[0] for j, v in JENIS_LAIN.items() if any(x['jenis'] == j for x in s.LN)] + (['Karhutla'] if s.KH else []) + (['Kekeringan'] if s.KR else [])
        perlu = max([s.lebar_runs([(n, INK, True)], 700) for n in nm_] or [0]) + 182880 + 100584 + 54864   # 10 Nov: ikon bencana dalam bulatan warna legenda
        if perlu > CB: CP -= min(perlu - CB, 25000); CB = perlu
        if PIL_: CK = 960000   # "Kab. Lampung Selatan" utuh
        TK = getattr(s, 'TANPA_KONDISI', False)   # 10 Nov pemilik: "itu kondisi gausah dulu"
        KM = getattr(s, 'KOLOM_MULAI', False) and PIL_ and TK   # 11 Nov pemilik: kejadian baru + masih berlangsung, kolom tanggal mulai di kanan
        CM = 0
        if KM: CP, CK, CM = 400000, 820000, 560000   # 11 Nov pemilik ("ini nempel"): kolom PROVINSI dan KAB/KOTA dirampingkan, pil diukur lebih pas
        CD = getattr(s, 'CD_PIL', 700000) if PIL_ and not TK else WL - CB - CP - CK - CM   # 9 Nov: CD_PIL = kolom lebih lebar untuk pil dampak panjang; 7 Nov: kolom DAMPAK (pil KK) lalu KONDISI (pil surut/ditangani) di kanan
        # 10 Nov pemilik ("ini grouping berdasarkan provinsi ya", "ini kasih icon bencananya"): kolom pertama PROVINSI, namanya sekali per kelompok; tiap baris bencana berikon
        # 10 Nov pemilik ("tanpa menghilangkan klasifikasi per bencananya"): kolom KELOMPOK sesudah BENCANA berisi pil Hidro atau Geo/Vul; CB dilebarkan, kolom sesudahnya digeser
        CG = 0; CB0 = CB   # 10 Nov atasan: "Kolom ini gausah ada" (KELOMPOK)
        # 10 Nov pemilik ("ini multigrouping aja, sebisa mungkin jangan ada info yang multiple times ditulis, terutama jenis bencana sama kelompok bencana"):
        # tingkat BENCANA > PROVINSI > KAB/KOTA; tiap nilai ditulis sekali, di tengah rentang barisnya
        C = [('BENCANA', XL + CG, CB0, 'l'), ('PROVINSI', XL + CB, CP, 'l'), ('KAB/KOTA', XL + CB + CP, CK, 'l'), ('DAMPAK', XL + CB + CP + CK, CD, 'l' if PIL_ else 'r')]
        if PIL_ and not TK: C.append(('KONDISI', XL + CB + CP + CK + CD, WL - CB - CP - CK - CD, 'l'))
        if KM:
            C.append(('MULAI', XL + CB + CP + CK + CD, CM, 'l'))
            # keterangan warna pil MULAI di kanan judul panel: oranye = kejadian baru, navy = masih berlangsung
            lx = X + W - 164592
            for teks_, warna_, tint_ in (('masih berlangsung', NAVY, T_NAVY), ('kejadian baru', ORG, T_ORG)):
                lw_ = s.lebar_runs([(teks_, TEKS, False)], 620); lx -= lw_
                o += s.tx(lx, Y + 109728, lw_ + 9144, 182880, [teks_], sz=620, c=TEKS, an='ctr', wrap='none')
                lx -= 128016; o += s.kotak(lx, Y + 109728 + 45720, 91440, 91440, tint_, 'roundRect', ln=warna_, lw=9525, adj=20000); lx -= 118872
        yk = Y + 365760
        o += s.kotak(XL, yk, WL, 182880, NAVY, 'roundRect', adj=12000)
        for t, x, w, al in C: o += s.tx(x + 54864, yk, w - 109728, 182880, [t], sz=620, b=True, c='FFFFFF', spc=40, al='ctr', an='ctr', wrap='none')   # 10 Nov pemilik: "ini header tabel tuh centerin"
        IK_J = {'gempa': 'gempa_slate', 'banjir': 'banjir_navy', 'angin': 'angin_slate', 'longsor': 'longsor_coklat', 'api': 'api_merah', 'gunung': 'gunung_merah'}
        kel = [('Karhutla', 'api_oranye', sorted(s.KH, key=lambda x: (not x['tangani'], -x['sat']['sisa'])))]
        kel += [('Kekeringan', 'daun_k', s.KR)]
        for j, v in JENIS_LAIN.items(): kel.append((v[0], IK_J[v[1]], [x for x in s.LN if x['jenis'] == j]))
        rank_ = lambda x: 1 if x['jenis'] in GEO_VUL else 2 if x['jenis'] == 'lainnya' else 0
        urut_ = {nama: i for i, (nama, _, _) in enumerate(kel)}
        baris = sorted(((nama, ik, x) for nama, ik, xs in kel for x in xs), key=lambda b: (rank_(b[2]), urut_[b[0]], int(b[2]['prov'])))   # kelompok, jenis, lalu kode provinsi barat ke timur
        y0, yb = yk + 182880 + 27432, Y + H - 73152
        SI_ = getattr(s, 'SIAGA_INFO', False) and s.GA   # 10 Nov pemilik: "di bawah informasi bencana, tambahin status siaga"
        TI_ = getattr(s, 'TINDAK_INFO', False); RES_T = (getattr(s, 'RES_T', None) or 1143000) if TI_ else 0   # 10 Nov pemilik: Keselamatan warga dan Peringatan dini BMKG masuk panel, di bawah Status Siaga
        if SI_: yb -= 1234440 + RES_T
        rp = min(420624 if getattr(s, 'INFO_Y', None) else 256032 if TK else 201168, (yb - y0) // max(1, len(baris))); sz = 780 if rp >= 320040 else 700 if rp >= 137160 else 620
        def rentang_(n, sama):
            m = n + 1
            while m < len(baris) and sama(baris[m]): m += 1
            return m - n
        def lok(x):
            if x['lokasi']: return x['lokasi'] if x['lokasi'].startswith(('Kota ', 'TN ', 'Gunung ')) else f"Kab. {x['lokasi']}"
            ks = x.get('kab_api') or []
            for m in range(len(ks), 0, -1):
                t = ', '.join(ks[:m]) + (f' +{len(ks) - m}' if m < len(ks) else '')
                if len(t) <= 22 or m == 1: return t
            return '–'
        def dampak(x):
            if x.get('dampak_pil'): return x['dampak_pil']   # 9 Nov: WA "Dampak: Pendataan" -> angka kerusakan laphar dipasang jalan.py
            a = x['angka'] if x['jenis'] != 'karhutla' else {}
            kk, md = a.get('kk'), a.get('meninggal')
            return ', '.join(([f'±{f0(kk)} KK'] if kk else []) + ([f'{f0(md)} MD'] if md else [])) or '–'
        for n, (nama, ik, x) in enumerate(baris):
            y = y0 + n * rp
            sbl = baris[n - 1] if n else None
            kel_awal = n == 0 or rank_(sbl[2]) != rank_(x)
            ben_awal = kel_awal or sbl[0] != nama
            pro_awal = ben_awal or sbl[2]['prov'] != x['prov']
            if n: o += s.garis(XL, y, WL, 'BFC5CC') if kel_awal else s.garis(XL + CG, y, WL - CG, 'D1D5DB') if ben_awal else s.garis(XL + CB, y, WL - CB, 'E5E7EB') if pro_awal else s.garis(XL + CB + CP, y, WL - CB - CP, 'F1F2F4')
            if ben_awal:
                t_b = rentang_(n, lambda b: rank_(b[2]) == rank_(x) and b[0] == nama) * rp
                d = min(182880, rp - 18288)   # 10 Nov pemilik: "ini icon bencananya tambahin buletan dengan warna yang sesuai legenda"
                wn = CB0 - d - 100584; szn = sz if len(nama) * sz * 66 < wn else max(540, int(wn / len(nama) / 66))   # 6 Nov: "Tanah longsor" menimpa kolom berikutnya
                wj_ = ORG if nama == 'Karhutla' else KER if nama == 'Kekeringan' else next(v[2] for v in JENIS_LAIN.values() if v[0] == nama)
                o += s.kotak(XL + CG + 54864, y + (t_b - d) // 2, d, d, wj_, 'ellipse') + s.gambar(XL + CG + 54864 + d * .18, y + (t_b - d) // 2 + d * .18, d * .64, d * .64, ik.split('_')[0] + '_putih') + s.tx(XL + CG + 54864 + d + 45720, y, wn, t_b, [nama], sz=szn, b=True, c=INK, an='ctr', wrap='none')
            dm = dampak(x)
            pv = AKRONIM.get(PENDEK(x['prov']), PENDEK(x['prov']))
            pv = {'Maluku Utara': 'Malut', 'Papua Barat Daya': 'PBD', 'Papua Pegunungan': 'Papeg', 'Papua Tengah': 'Papteng', 'Papua Barat': 'Pabar', 'Kep. Bangka Belitung': 'Babel',
                  'Kepulauan Riau': 'Kepri', 'Kep. Riau': 'Kepri', 'DI Yogyakarta': 'DIY', 'DKI Jakarta': 'Jakarta'}.get(pv, pv)   # kolom provinsi sempit
            if pro_awal:
                t_p = rentang_(n, lambda b: rank_(b[2]) == rank_(x) and b[0] == nama and b[2]['prov'] == x['prov']) * rp
                o += s.tx(XL + CB + 54864, y, CP - 54864, t_p, [pv], sz=sz, b=True, c=INK, an='ctr', wrap='none')
            o += s.tx(XL + CB + CP + 54864, y, CK - 54864, rp, [lok(x)], sz=sz, c=TEKS, an='ctr', wrap='none')
            if PIL_:   # 7 Nov pemilik ("pake label pill ya, termasuk yg kk dll nya")
                hp = min(164592, rp - 27432); yp = y + (rp - hp) // 2; xd = XL + CB + CP + CK + 54864
                if TK and dm != '–':   # 10 Nov pemilik: "ini bikin center di kolom"
                    lp_ = [(100000 + len(t_) * 700 * 59 + hp * .9) if KM else (120000 + len(t_) * 700 * 62 + hp * .9) for t_ in dm.split(', ')]
                    xd = XL + CB + CP + CK + (CD - sum(lp_) - 36576 * (len(lp_) - 1)) / 2
                for t_ in dm.split(', ') if dm != '–' else []:
                    p_, w_ = s.pil(xd, yp, t_, T_NAVY, NAVY, 'orang_navy' if 'KK' in t_ else 'awas_navy', sz=620, h=hp, w=(100000 + len(t_) * 700 * 59 + hp * .9) if KM else None); o += p_; xd += w_ + 36576
                if dm == '–': o += s.tx(xd, y, 300000, rp, ['–'], sz=sz, c=ABU, an='ctr', wrap='none')
                if KM and x.get('mulai'):   # pil kalender di tengah kolom MULAI; oranye = kejadian baru
                    dmu = dt.date.fromisoformat(x['mulai']); tmu = f"{dmu.day} {BULAN[dmu.month - 1][:3]}"
                    tint_, warna_, ik_ = (T_ORG, ORG, 'kalender_oranye') if x.get('baru') else (T_NAVY, NAVY, 'kalender_navy')
                    lp_ = 100000 + len(tmu) * 700 * 59 + hp * .9
                    o += s.pil(XL + CB + CP + CK + CD + (CM - lp_) / 2, yp, tmu, tint_, warna_, ik_, sz=620, h=hp, w=lp_)[0]
                kd = None if TK else x.get('kondisi_pil')
                if kd:
                    tint, warna, ik = {'selesai': (T_SLATE, SLATE, 'cek_slate'), 'surut': (T_ORG, ORG, 'banjir_oranye'), 'tangani': (T_NAVY, NAVY, 'orang_navy'),
                                       'waspada': (T_KER, '8A6A2E', 'mata_kering')}[kd[1]]
                    o += s.pil(XL + CB + CP + CK + CD + 54864, yp, kd[0], tint, warna, ik, sz=620, h=hp)[0]
            else:
                o += s.tx(XL + CB + CP + CK, y, WL - CB - CP - CK - 54864, rp, [dm], sz=sz if len(dm) <= 11 else min(sz, 600), b=dm != '–', c=INK if dm != '–' else ABU, al='r', an='ctr', wrap='none')
        if SI_:
            ys = y0 + len(baris) * rp + 54864
            o += s.siaga_info(XL, ys, WL, Y + H - 54864 - RES_T - ys)
            if TI_: o += s.tindak_info(XL, Y + H - 54864 - RES_T, WL, RES_T)
        return o

    def tindak_info(s, X, Y, W, H):
        """Butir ke-2 dan seterusnya dari pita Yang akan dilakukan BNPB, ditumpuk di dalam panel Informasi Bencana."""
        if getattr(s, 'PERINGATAN_BARIS', None):   # 10 Nov pemilik: "ini jelek bgt, desainnya ubah": kepala seperti Status Siaga, satu baris per peringatan
            o = s.garis(X, Y, W, 'BFC5CC') + s.tx(X + 54864, Y + 45720, W - 109728, 164592, ['PERINGATAN DINI'], sz=750, b=True, c=NAVY, spc=100, wrap='none')
            if getattr(s, 'PERINGATAN_PERIODE', None):   # 11 Nov pemilik ("terlalu padet ... daerah dan periodenya"): periode sekali di kepala panel, rata kanan, ikon kalender
                tp_ = s.PERINGATAN_PERIODE; rw_ = int(s.lebar_runs([(tp_, ABU, False)], 600) * 1.15); di_ = 100584; Y_ = Y - 13716   # lebar_runs kurang ukur untuk teks abu 6 pt
                o += s.gambar(X + W - 54864 - rw_ - di_ - 54864, Y_ + 45720 + (164592 - di_) // 2, di_, di_, 'kalender_navy') + s.tx(X + W - 54864 - rw_ - 9144, Y_ + 45720, rw_ + 18288, 164592, [tp_], sz=600, c=ABU, al='r', an='ctr', wrap='none')
            if getattr(s, 'PERINGATAN_KET', False):   # 11 Nov pemilik: keterangan ikon di kanan kepala panel: kalender = periode berlaku, jam = waktu diukur
                lx_ = X + W - 54864
                for ik_k, tk_ in (('jam_navy', 'waktu diukur'), ('kalender_navy', 'periode berlaku')):
                    lw_ = int(s.lebar_runs([(tk_, TEKS, False)], 620) * 1.15); lx_ -= lw_
                    o += s.tx(lx_, Y + 45720, lw_ + 9144, 164592, [tk_], sz=620, c=TEKS, al='r', an='ctr', wrap='none')
                    lx_ -= 100584 + 36576; o += s.gambar(lx_, Y + 45720 + (164592 - 100584) // 2, 100584, 100584, ik_k); lx_ -= 128016
            bar = s.PERINGATAN_BARIS; y0 = Y + 237744; dua = any(len(b) > 5 and b[5] for b in bar)   # 11 Nov: baris dua tingkat (daerah + periode) lebih tinggi, pil lebih ramping
            rp = min(301752 if dua else 228600, (Y + H - y0) // len(bar)); h_p = min(164592, rp - 27432); lb_p = 868680 if dua else 1051560
            for n, (ik, bhy, lok, pil, wr, *per) in enumerate(bar):   # per = [periode berlaku] opsional (11 Nov pemilik: buletin BMKG 9-12 Nov masih berlaku, "tampilan periodenya bagusin")
                y = y0 + n * rp; d = 173736; c, t = (MERAH, T_MERAH) if wr == 'merah' else (ORG, T_ORG); xm, ym = X + 27432, y + (rp - d) // 2; db = d * .56   # 10 Nov pemilik: "ini samain kayak di peta"
                if n: o += s.garis(X, y, W, 'F1F2F4')
                o += s.gambar(X + 54864, ym, d, d, ik)   # 10 Nov pemilik: ikon solid saja, tanpa lingkaran dan tanda seru
                o += s.tx(X + 265176, y, 1005840, rp, [bhy], sz=720, b=True, an='ctr', wrap='none')
                if per and per[0]:   # lokasi dua baris: nama lokasi, lalu periode kecil abu-abu dengan ikon kalender (panel terlalu sempit untuk kolom sendiri)
                    # 11 Nov pemilik ("rapihin spacing/sizingnya"): blok dua tingkat di tengah baris, jarak antartingkat tetap, ikon sebesar tinggi huruf periode
                    h1, h2, gap, di = 109728, 91440, 18288, 82296; yt = y + (rp - h1 - gap - h2) // 2; xl = X + 1271016
                    o += s.tx(xl, yt, 1110000, h1, [lok], sz=700, c=TEKS, an='ctr', wrap='none')
                    o += s.gambar(xl, yt + h1 + gap + (h2 - di) // 2, di, di, per[1] if len(per) > 1 else 'kalender_navy') + s.tx(xl + di + 36576, yt + h1 + gap, 1060000, h2, [per[0]], sz=600, c=ABU, an='ctr', wrap='none')
                else:
                    o += s.tx(X + 1271016, y, 1110000, rp, [lok], sz=700, c=TEKS, an='ctr', wrap='none')
                o += s.pil(X + W - 27432 - lb_p, y + (rp - h_p) // 2, pil, t, c, 'awas_merah' if wr == 'merah' else 'awas_oranye', sz=640, h=h_p, w=lb_p)[0]
            return o
        o = s.garis(X, Y, W, 'BFC5CC'); butir = s.tindak()[1:]; rp = H // max(1, len(butir))
        for n, (ik, jd, isi) in enumerate(butir):
            y = Y + n * rp; d = 329184
            o += s.kotak(X + 54864, y + (rp - d) // 2, d, d, ORG, 'ellipse') + s.gambar(X + 128016, y + (rp - d) // 2 + 73152, 182880, 182880, ik)
            o += s.tx(X + 457200, y + 64008, W - 512064, 182880, [jd], sz=880, b=True, an='ctr', wrap='none') + s.tx(X + 457200, y + 246888, W - 512064, rp - 265176, isi, sz=720, c=TEKS, wrap='none')
        return o

    def siaga_info(s, X, Y, W, H):
        """Ringkasan status gunung api PVMBG di bawah tabel Informasi Bencana: jumlah per level lalu satu baris per gunung Awas atau Siaga."""
        o = s.garis(X, Y, W, 'BFC5CC') + s.tx(X + 54864, Y + 45720, W - 109728, 164592, ['STATUS SIAGA'], sz=750, b=True, c=NAVY, spc=100, wrap='none')
        # 11 Nov pemilik ("jadinya pakai S-BD, TG dll"): arah sektor disingkat mata angin, artinya dijelaskan di kanan kepala panel
        ket_ = []
        for g_ in s.GA['gunung']:
            if g_['level'] in ('Awas', 'Siaga') and (g_.get('sektor') or 0) > (g_.get('radius') or 0):
                ar0 = s.arah_sektor(g_)
                if ar0 and (s.singkat_mata_angin(ar0), ar0) not in ket_: ket_.append((s.singkat_mata_angin(ar0), ar0))
        if ket_:
            tk_ = ', '.join(f'{a_} = {b_}' for a_, b_ in ket_); lw_ = int(s.lebar_runs([(tk_, TEKS, False)], 620) * 1.15)
            o += s.tx(X + W - 54864 - lw_, Y + 45720, lw_, 164592, [tk_], sz=620, c=TEKS, al='r', an='ctr', wrap='none')
        lv = s.GA['level']; yk = Y + 237744; hk = 228600; lb = (W - 3 * 54864) // 4
        for i, (k, c, t, ik) in enumerate((('Awas', MERAH, T_MERAH, 'awas_merah'), ('Siaga', ORG, T_ORG, 'gunung_oranye'), ('Waspada', KER, T_KER, 'mata_kering'), ('Normal', SLATE, T_SLATE, 'cek_slate'))):
            x = X + i * (lb + 54864); runs = [(f0(lv.get(k, 0)) + '  ', c, True), (k, c, False)]; d = 137160   # 10 Nov pemilik: "kasih icon", ikon sama dengan slide Status Siaga
            x0 = x + (lb - d - 45720 - s.lebar_runs(runs, 760)) / 2
            o += s.kotak(x, yk, lb, hk, t, 'roundRect', adj=14000) + s.gambar(x0, yk + (hk - d) / 2, d, d, ik) + s.tx(x0 + d + 45720, yk, lb, hk, [runs], sz=760, an='ctr', wrap='none')
        gs = [g for g in s.GA['gunung'] if g['level'] in ('Awas', 'Siaga')]; y0 = yk + hk + 36576; rp = min(347472 if getattr(s, 'INFO_Y', None) else 228600, (Y + H - y0) // max(1, len(gs)))
        for n, g in enumerate(gs):
            y = y0 + n * rp; d = 137160; c = MERAH if g['level'] == 'Awas' else ORG
            if n: o += s.garis(X, y, W, 'F1F2F4')
            rad, sek = g.get('radius') or 0, g.get('sektor') or 0
            km = lambda v: f'{v:g}'.replace('.', ',')
            # 11 Nov pemilik dan atasan ("panah gini bingung", "makin ga ngerti apa itu sbd, tg", "layout/desainnya juga benerin"): arah sektor ditulis
            # lengkap di tingkat kedua di bawah nama gunung (ikon panah searah sektor + "Sektor ke selatan-barat daya"), seperti baris peringatan dini;
            # pil kanan tetap Radius dan Sektor (jarak saja), kolom tetap supaya sejajar antarbaris
            ar_ = next((m[1].strip() for m in re.finditer(r'sektor\s+([a-z][a-z\- ]*?)(?=\s+(?:meliputi|di|dari|gunung\w*|sejauh)\b|[.,])', ' '.join(g['rekom']).lower())), '') if sek > rad else ''
            b_ = s.bearing(ar_) if ar_ else None; ik_s = f'panah{round(b_ / 22.5) % 16}_kering' if b_ is not None else 'arah_kering'
            # 11 Nov: kolom kiri-rata (nama, Radius, Sektor) supaya sejajar antarbaris; pil Sektor menulis arah lengkap dengan ikon jarum kompas
            o += s.kotak(X + 54864, y + (rp - d) // 2, d, d, c, 'triangle') + s.tx(X + 246888, y, 1005840, rp, [g['nama']], sz=720, b=True, an='ctr', wrap='none')
            ik_k = f'kompas{round(b_ / 22.5) % 16}_kering' if b_ is not None else 'arah_kering'
            lb_p, h_p = 777240, min(164592, rp - 27432); x1 = X + 1243584; x2 = x1 + lb_p + 45720; yp = y + (rp - h_p) // 2
            if rad: o += s.pil(x1, yp, f'Radius {km(rad)} km', T_ORG, ORG, 'radius_oranye', sz=660, h=h_p, w=lb_p)[0]
            if sek > rad: o += s.pil(x2, yp, f'Bahaya {km(sek)} km – {s.singkat_mata_angin(ar_)}' if ar_ else f'Sektor {km(sek)} km', T_KER, '8A6A2E', ik_k, sz=660, h=h_p)[0]
        return o

    # ---- 6 Nov (Bang Ghozi: "tulis aja kab kota ke bawah dicoba"; pemilik: "coba 2-2nya, kasih beberapa alternatif slide")
    PV_SINGKAT = {'Maluku Utara': 'Malut', 'Papua Barat Daya': 'PBD', 'Papua Pegunungan': 'Papeg', 'Papua Tengah': 'Papteng', 'Papua Barat': 'Pabar',
                  'Kep. Bangka Belitung': 'Babel', 'Kepulauan Riau': 'Kepri', 'Kep. Riau': 'Kepri', 'DI Yogyakarta': 'DIY', 'DKI Jakarta': 'Jakarta'}
    def pv(s, k):
        p = AKRONIM.get(PENDEK(k), PENDEK(k)); return s.PV_SINGKAT.get(p, p)
    def kab_kh(s, x):
        """[(kab/kota, sisa ha)] karhutla: baris kabupaten = lokasinya sendiri; baris provinsi = kabupaten bersisa api di website."""
        if x['lokasi']: return [(x['lokasi'], x['sat'].get('sisa') or 0)]
        return [(k, b) for k, b in (x.get('kab_sisa') or [])]
    def dampak_lain(s, x):
        a = x['angka']; kk, md = a.get('kk'), a.get('meninggal')
        return ([f'±{f0(kk)} KK'] if kk else []) + ([f'{f0(md)} MD'] if md else [])
    def lok_lain(s, x):
        if not x['lokasi']: return '–'
        return x['lokasi'] if x['lokasi'].startswith(('Kota ', 'TN ', 'Gunung ')) else f"Kab. {x['lokasi']}"
    def kh_urut(s): return sorted(s.KH, key=lambda x: (not x['tangani'], -x['sat']['sisa']))
    def lain_urut(s):
        kel = [('Kekeringan', KER, s.KR)] + [(v[0], v[2], [x for x in s.LN if x['jenis'] == j]) for j, v in JENIS_LAIN.items()]
        return [(nama if i == 0 else '', w, x) for nama, w, xs in kel for i, x in enumerate(xs)]

    def tabel_kepala(s, X, Y, kol, h=228600):
        o = s.kotak(X, Y, sum(w for _, _, w, _ in kol), h, NAVY, 'roundRect', adj=12000)
        for t, x, w, al in kol: o += s.tx(x + 54864, Y, w - 109728, h, [t], sz=650, b=True, c='FFFFFF', spc=40, al=al, an='ctr', wrap='none')
        return o

    def tabel_lain(s, X, Y, W, YB, rmax=228600, sempit=False):
        """Tabel kekeringan + bencana lainnya: BENCANA, PROVINSI, KAB/KOTA, DAMPAK (KK dan MD bertumpuk bila sempit)."""
        CB, CP = (int(W * .31), int(W * .14)) if sempit else (int(W * .25), int(W * .17)); CK = int(W * .32) if sempit else int(W * .34)
        kol = [('BENCANA', X, CB, 'l'), ('PROV.' if CP < 500000 else 'PROVINSI', X + CB, CP, 'l'), ('KAB/KOTA', X + CB + CP, CK, 'l'), ('DAMPAK', X + CB + CP + CK, W - CB - CP - CK, 'r')]
        o = s.tabel_kepala(X, Y, kol); y0 = Y + 228600 + 27432
        baris = s.lain_urut(); rp = min(rmax, (YB - y0) // max(1, len(baris))); sz = 750 if rp >= 182880 else 700 if rp >= 137160 else 620
        for n, (nama, w, x) in enumerate(baris):
            y = y0 + n * rp
            if nama and n: o += s.garis(X, y, W, 'D1D5DB')
            elif n: o += s.garis(X + CB, y, W - CB, 'F1F2F4')
            if nama:
                d = min(91440, rp // 2)
                wn = CB - d - 100584; szn = sz if len(nama) * sz * 66 < wn else max(540, int(wn / len(nama) / 66))   # huruf tebal ~66 EMU/huruf per 1/100 pt
                o += s.kotak(X + 54864, y + (rp - d) // 2, d, d, w, 'ellipse') + s.tx(X + 54864 + d + 45720, y, wn, rp, [nama], sz=szn, b=True, an='ctr', wrap='none')
            dm = s.dampak_lain(x)
            o += s.tx(X + CB + 54864, y, CP - 54864, rp, [s.pv(x['prov'])], sz=sz, an='ctr', wrap='none')
            lk = s.lok_lain(x); lk = lk[5:] if sempit and lk.startswith('Kab. ') else lk   # kolom sempit: tanpa awalan "Kab." (Kota tetap ditulis)
            o += s.tx(X + CB + CP + 54864, y, CK - 54864, rp, [lk], sz=sz if len(lk) * sz * 60 < CK - 54864 else max(540, int((CK - 54864) / len(lk) / 60)), c=TEKS, an='ctr', wrap='none')   # nama panjang di kolom sempit diperkecil, tidak menimpa DAMPAK
            par = (dm if sempit else [', '.join(dm)]) if dm else ['–']
            o += s.tx(X + CB + CP + CK, y, W - CB - CP - CK - 54864, rp, par, sz=sz if len(par) == 1 else min(sz, 620), b=bool(dm), c=INK if dm else ABU, al='r', an='ctr', wrap='none')
        return o

    def tabel_kh_kab(s, X, Y, W, YB, blok, rmax=201168, judul_sisa='SISA API'):
        """Tabel karhutla kab/kota menurun: PROVINSI (baris pertama blok), KAB/KOTA satu per baris, SISA API (ha)."""
        CP, CK = int(W * .3), int(W * .44)
        kol = [('PROVINSI', X, CP, 'l'), ('KAB/KOTA', X + CP, CK, 'l'), (judul_sisa, X + CP + CK, W - CP - CK, 'r')]
        o = s.tabel_kepala(X, Y, kol); y0 = Y + 228600 + 27432
        n_ = sum(len(b) for b in blok); rp = min(rmax, (YB - y0) // max(1, n_)); sz = 750 if rp >= 182880 else 700 if rp >= 137160 else 620
        n = 0
        for i, rows in enumerate(blok):
            for j, (prov, kab, sisa, gaya) in enumerate(rows):
                y = y0 + n * rp; n += 1
                if j == 0 and i: o += s.garis(X, y, W, 'D1D5DB')
                elif j: o += s.garis(X + CP, y, W - CP, 'F1F2F4')
                if j == 0:
                    d = min(91440, rp // 2)
                    o += s.kotak(X + 54864, y + (rp - d) // 2, d, d, ORG, 'ellipse') + s.tx(X + 54864 + d + 45720, y, CP - d - 100584, rp, [prov], sz=sz, b=True, an='ctr', wrap='none')
                o += s.tx(X + CP + 54864, y, CK - 54864, rp, [kab], sz=sz, c=ABU if gaya == 'lain' else TEKS, an='ctr', wrap='none')
                o += s.tx(X + CP + CK, y, W - CP - CK - 54864, rp, [sisa], sz=sz, b=sisa != '–', c=ORG if sisa != '–' else ABU, al='r', an='ctr', wrap='none')
        return o

    def blok_kh(s, maks=None):
        """Satu blok per baris karhutla: [(provinsi, kab/kota, sisa, gaya)]. maks = nama kab/kota paling banyak, sisanya 'dan N lainnya'."""
        out = []
        for x in s.kh_urut():
            ks = s.kab_kh(x); p = s.pv(x['prov'])
            if not ks: out.append([(p, '–', '–', '')]); continue
            tampil = ks if maks is None or len(ks) <= maks + 1 else ks[:maks]
            rows = [(p if i == 0 else '', k, f'± {f0(b)} ha', '') for i, (k, b) in enumerate(tampil)]
            if len(tampil) < len(ks): rows.append(('', f'dan {len(ks) - len(tampil)} lainnya', f'± {f0(sum(b for _, b in ks[len(tampil):]))} ha', 'lain'))
            out.append(rows)
        return out

    def judul_rinci(s):
        H, P = (lambda t: (t, ORG, True)), (lambda t: (t, INK, True))
        nk = sum(len(s.kab_kh(x)) for x in s.KH); npv = sum(1 for x in s.KH if s.kab_kh(x))
        return [P('Rincian lokasi: karhutla di '), H(f'{f0(nk)} kab/kota'), P(', '), H(f0(len(s.KR) + len(s.LN))), P(' kejadian lainnya')]

    def s_rinci(s):
        """Slide rincian (alternatif 1 dan 2, 6 Nov): kab/kota karhutla menurun lengkap di dua kolom, kekeringan + bencana lainnya di kolom ketiga."""
        X0, W, Y0, YB, G = 548640, 11094415, 1325880, 6007608, 137160
        NK = 3; WL3 = 3200400; cw = (W - NK * G - WL3) // NK   # tiga kolom karhutla + satu kolom bencana lainnya (lebih lebar: 4 kolom isi)
        # baris dibagi rata ke tiga kolom; provinsi yang terpotong diulang namanya di puncak kolom berikutnya
        rows = [(r, b[0][0]) for b in s.blok_kh() for r in b]; per = -(-len(rows) // NK)
        kolom = []
        for c in range(NK):
            ch = rows[c * per:(c + 1) * per]; blok = []
            for j, ((p, k, sisa, g), pn) in enumerate(ch):
                if p or j == 0: blok.append([(pn, k, sisa, g)])
                else: blok[-1].append((p, k, sisa, g))
            kolom.append(blok)
        WK = NK * cw + (NK - 1) * G
        o = s.kotak(X0, Y0, WK, YB - Y0, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500) + s.kepala(X0, Y0, WK, ORG, T_ORG, 'api_p', 'Karhutla: kab/kota dengan sisa api', len(s.KH), h=411480)
        yt = Y0 + 502920; yb = YB - 91440
        cwi = (WK - 219456 - (NK - 1) * 91440) // NK
        for c, blok in enumerate(kolom):
            if blok: o += s.tabel_kh_kab(X0 + 109728 + c * (cwi + 91440), yt, cwi, yb, blok, rmax=182880)
        X3 = X0 + NK * (cw + G)
        o += s.kotak(X3, Y0, WL3, YB - Y0, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500) + s.kepala(X3, Y0, WL3, SLATE, T_SLATE, 'awas_p2', 'Bencana lainnya', len(s.KR) + len(s.LN), h=411480)
        o += s.tabel_lain(X3 + 109728, yt, WL3 - 219456, yb, sempit=True)
        return o

    def info_bencana_menurun(s, X, Y, W, H):
        """Alternatif 3 (6 Nov): panel Informasi bencana slide 1 dengan kab/kota karhutla menurun, paling banyak 2 nama per provinsi lalu
        'dan N lainnya'; karhutla dan bencana lainnya dua tabel berdampingan supaya muat."""
        o = s.kotak(X, Y, W, H, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.tx(X + 164592, Y + 91440, W - 329184, 182880, ['INFORMASI BENCANA'], sz=750, b=True, c=NAVY, spc=100)
        XL, WL = X + 109728, W - 219456; sw = (WL - 91440) // 2; yt = Y + 338328; yb = Y + H - 64008
        o += s.tabel_kh_kab(XL, yt, sw, yb, s.blok_kh(maks=1), judul_sisa='SISA')   # 2 nama per provinsi terlalu rapat (baris 6 pt)
        o += s.tabel_lain(XL + sw + 91440, yt, sw, yb, sempit=True)
        return o

    # ---- 6 Nov sore (Bang Ghozi: "jangan +10", "gapapa kebawah juga tulisannya"; pemilik: "bener2 sesuain aja layoutnya, petanya bisa
    # diperkecil"): ringkasan dengan SEMUA kab/kota karhutla ditulis menurun di slide 1. Alternatif 4 dan 5.
    def kpi_daftar(s):
        IKK = {'gempa': 'gempa_slate', 'banjir': 'banjir_navy', 'angin': 'angin_slate', 'longsor': 'longsor_coklat', 'api': 'api_merah', 'gunung': 'gunung_merah'}
        return ([('papan_n', T_NAVY, f0(s.wa['laporan']), 'laporan kejadian', NAVY), ('seru_n', T_NAVY, f0(s.N_TOT), 'kejadian menonjol', NAVY),
                 ('api_o', T_ORG, f0(len(s.KH)), 'karhutla', ORG), ('daun_k', T_KER, f0(len(s.KR)), 'kekeringan', KER)]
                + [(IKK[v[1]], v[3], f0(n), v[0][0].lower() + v[0][1:], v[2]) for j, v in JENIS_LAIN.items() for n in [sum(1 for x in s.LN if x['jenis'] == j)] if n])

    def kpi_ringkas(s, Y, H):
        """Kartu angka satu baris tipis (tanpa pil KEJADIAN BENCANA): ikon, angka, label di bawah angka."""
        X, W = 548640, 11094415
        o = s.kotak(X, Y, W, H, 'F3F5F8', 'roundRect', adj=12000)
        T = s.kpi_daftar(); g = 91440; kw = (W - 2 * 91440 - (len(T) - 1) * g) // len(T); ch = H - 2 * 64008
        for i, (ik, tint, nilai, lab, warna) in enumerate(T):
            x, y = X + 91440 + i * (kw + g), Y + 64008; d = 320040
            o += s.kotak(x, y, kw, ch, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=14286) + s.kotak(x + 82296, y + (ch - d) // 2, d, d, tint, 'ellipse')
            o += s.gambar(x + 82296 + 77724, y + (ch - d) // 2 + 77724, 164592, 164592, ik)
            o += s.tx(x + 466344, y + 9144, kw - 502920, ch // 2 + 18288, [nilai], sz=1400, b=True, c=warna, an='b')
            o += s.tx(x + 466344, y + ch // 2 + 27432, kw - 502920, ch // 2 - 36576, [lab], sz=650, c=TEKS, an='t', wrap='none')
        return o

    def baris_kh_judul(s):
        """Baris karhutla menurun: ('prov', nama, sisa) lalu ('kab', nama, sisa) tiap kab/kota bersisa api; tanpa '+N' (Bang Ghozi 6 Nov)."""
        out = []
        for x in s.kh_urut():
            ks = s.kab_kh(x); out.append(('prov', NAMA[x['prov']], round(x['sat'].get('sisa') or 0)))
            out += [('kab', {'Penukal Abab Lematang Ilir': 'PALI'}.get(k, k), round(b)) for k, b in ks]   # singkatan resmi untuk nama yang tidak muat di kolom
        return out

    def kolom_kh_judul(s, n):
        """Bagi baris karhutla rata ke n kolom; kolom yang mulai di tengah provinsi diberi baris provinsi '(lanjutan)'."""
        rows = s.baris_kh_judul(); per = -(-len(rows) // n); kol = []
        for c in range(n):
            ch = rows[c * per:(c + 1) * per]
            if ch and ch[0][0] == 'kab':
                prov = next(r for r in reversed(rows[:c * per]) if r[0] == 'prov'); ch = [('lanj', prov[1], None)] + ch
            kol.append(ch)
        return kol

    def tabel_kh_judul(s, X, Y, W, rows, rp, judul=('KAB/KOTA', 'SISA (HA)')):
        """Satu kolom karhutla: kepala navy, baris provinsi bertint (titik oranye, total sisa), kab/kota menjorok di bawahnya."""
        o = s.tabel_kepala(X, Y, [(judul[0], X, W - 520000, 'l'), (judul[1], X + W - 520000, 520000, 'r')], h=201168)
        y = Y + 201168 + 27432; sz = 720 if rp >= 164592 else 680 if rp >= 146304 else 640 if rp >= 128016 else 600
        for jen, nama, sisa in rows:
            ss = '–' if sisa is None or (jen == 'prov' and not sisa) else f0(sisa)
            if jen in ('prov', 'lanj'):
                o += s.kotak(X, y + 9144, W, rp - 18288, 'FDF1E6', 'roundRect', adj=20000)
                d = min(82296, rp // 2); o += s.kotak(X + 54864, y + (rp - d) // 2, d, d, ORG, 'ellipse')
                t = nama + (' (lanjutan)' if jen == 'lanj' else '')
                o += s.tx(X + 54864 + d + 45720, y, W - 640080, rp, [t], sz=sz, b=True, c=INK, an='ctr', wrap='none')
                if jen == 'prov': o += s.tx(X + W - 548640, y, 493776, rp, [ss], sz=sz, b=True, c=ORG, al='r', an='ctr', wrap='none')
            else:
                lw = W - 228600 - 548640; szk = sz if len(nama) * sz * 78 < lw else max(520, int(lw / len(nama) / 78))
                o += s.tx(X + 228600, y, lw, rp, [nama], sz=szk, c=TEKS, an='ctr', wrap='none')
                o += s.tx(X + W - 548640, y, 493776, rp, [ss], sz=sz, c=INK, al='r', an='ctr', wrap='none')
                o += s.garis(X + 228600, y + rp, W - 228600, 'F1F2F4')
            y += rp
        return o

    def panel_kh_judul(s, X, Y, W, YB, n):
        o = s.kotak(X, Y, W, YB - Y, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500)
        o += s.kepala(X, Y, W, ORG, T_ORG, 'api_p', 'Karhutla: kab/kota dengan sisa api', len(s.KH), h=365760)
        kol = s.kolom_kh_judul(n); WI = W - 219456; cw = (WI - (n - 1) * 91440) // n
        yt = Y + 420624; rp = min(201168, (YB - 64008 - yt - 228600) // max(len(c) for c in kol))
        for c, rows in enumerate(kol):
            if rows: o += s.tabel_kh_judul(X + 109728 + c * (cw + 91440), yt, cw, rows, rp)
        return o

    def tindak_menurun(s, X, Y, W, H):
        """'Yang akan dilakukan BNPB' bertumpuk (alternatif 5): tiga butir di bawah peta, isi sama dengan strip bawah."""
        o = s.kotak(X, Y, W, H, 'FDF4EC', 'roundRect', adj=5000) + s.tx(X + 128016, Y + 64008, W - 256032, 182880, ['YANG AKAN DILAKUKAN BNPB'], sz=750, b=True, c=ORG, spc=100)
        T = s.tindak(); bh = (H - 292608) // len(T)
        for i, (ik, jd, isi) in enumerate(T):
            y = Y + 274320 + i * bh
            if i: o += s.garis(X + 128016, y - 18288, W - 256032, 'F2D3BA')
            o += s.kotak(X + 128016, y + 45720, 320040, 320040, ORG, 'ellipse') + s.gambar(X + 128016 + 64008, y + 45720 + 64008, 192024, 192024, ik)
            o += s.tx(X + 548640, y + 18288, W - 640080, 192024, [jd], sz=900, b=True) + s.tx(X + 548640, y + 219456, W - 640080, bh - 237744, isi, sz=760, c=TEKS, wrap='none')
        return o

    def s2_alt(s, gaya):
        Y0, KH_ = 1280160, 557784
        o = s.kpi_ringkas(Y0, KH_); Ym = Y0 + KH_ + 91440
        if gaya == 4:   # peta kecil + tabel bencana lainnya di kiri; karhutla 4 kolom di kanan; strip tindakan tetap di bawah
            YB = 5376672; XL, WLc = 548640, 3840480; MH = WLc * 2880360 // 7680960
            o += s.peta_blok(XL, Ym, WLc, MH, True, (XL + 45720, Ym + MH + 9144), k=.72, kl=.82)
            yt = Ym + MH + 228600
            o += s.tabel_lain(XL, yt, WLc, YB, rmax=182880)
            XR = XL + WLc + 137160
            return o + s.panel_kh_judul(XR, Ym, 11643055 - XR, YB, 4) + s.strip_tindak()
        # gaya 5: peta + tindakan bertumpuk di kiri; karhutla 3 kolom + bencana lainnya di kanan, setinggi slide
        YB = 6291072; XL, WLc = 548640, 3657600; MH = WLc * 2880360 // 7680960
        o += s.peta_blok(XL, Ym, WLc, MH, True, (XL + 45720, Ym + MH + 9144), k=.72, kl=.8)
        yt = Ym + MH + 228600
        o += s.tindak_menurun(XL, yt, WLc, YB - yt)
        XR = XL + WLc + 137160; WL3 = 2651760; WK = 11643055 - XR - WL3 - 137160
        o += s.panel_kh_judul(XR, Ym, WK, YB, 3)
        X3 = XR + WK + 137160
        o += s.kotak(X3, Ym, WL3, YB - Ym, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500) + s.kepala(X3, Ym, WL3, SLATE, T_SLATE, 'awas_p2', 'Bencana lainnya', len(s.KR) + len(s.LN), h=365760)
        return o + s.tabel_lain(X3 + 91440, Ym + 420624, WL3 - 182880, YB - 64008, rmax=228600, sempit=True)

    def strip_tindak(s):
        TI_ = getattr(s, 'TINDAK_INFO', False)   # 10 Nov pemilik: sisa butir pindah ke panel kanan, pita selebar peta
        o = s.kotak(548640, 5468112, 7315200 if TI_ else 11094415, 822960, 'FDF4EC', 'roundRect', adj=8889) + s.tx(694944, 5541264, 3657600, 182880, [getattr(s, 'JUDUL_STRIP', 'YANG AKAN DILAKUKAN BNPB')], sz=750, b=True, c=ORG, spc=100)
        if TI_ and getattr(s, 'STRIP_KARTU', None):   # 10 Nov pemilik: isi yang ada ditata supaya ruang kosong tidak banyak, dua kartu putih sebaris
            kartu = s.STRIP_KARTU; gp = 91440; xk0 = 658368; lb = (7315200 - 2 * 109728 - (len(kartu) - 1) * gp) // len(kartu); yk, hk = 5751576, 475488
            for i, (ik, jd, isi) in enumerate(kartu):
                x = xk0 + i * (lb + gp); d = 310896
                o += s.kotak(x, yk, lb, hk, 'FFFFFF', 'roundRect', ln='F2D3BA', adj=12000) + s.kotak(x + 91440, yk + (hk - d) // 2, d, d, ORG, 'ellipse') + s.gambar(x + 91440 + d * .2, yk + (hk - d) // 2 + d * .2, d * .6, d * .6, ik)
                if len(isi) > 48:   # 11 Nov pemilik ("jangan pakai frasa nanggung"): isi kalimat utuh, boleh dua baris
                    o += s.tx(x + 484632, yk + 36576, lb - 530352, 164592, [jd], sz=860, b=True, an='ctr', wrap='none') + s.tx(x + 484632, yk + 210312, lb - 548640, hk - 237744, [isi], sz=700, c=TEKS, an='t', wrap='square')
                else:
                    o += s.tx(x + 484632, yk + 54864, lb - 530352, 182880, [jd], sz=880, b=True, an='ctr', wrap='none') + s.tx(x + 484632, yk + 246888, lb - 530352, 173736, [isi], sz=780, c=TEKS, an='ctr', wrap='none')
            return o
        if TI_:   # 10 Nov pemilik: pita selebar peta berisi tiga blok
            butir = s.tindak()[:1] + list(getattr(s, 'STRIP_TAMBAH', []))
            lb = (7315200 - 292608) // len(butir)
            for i, (ik, jd, isi) in enumerate(butir):
                x = 694944 + i * lb
                if i: o += s.garis(x - 64008, 5788152, 0, 'F2D3BA', h=429768)
                o += s.kotak(x, 5806440, 301752, 301752, ORG, 'ellipse') + s.gambar(x + 68580, 5875020, 164592, 164592, ik)
                o += s.tx(x + 365760, 5715000, lb - 438912, 182880, [jd], sz=900, b=True, wrap='none') + s.tx(x + 365760, 5907024, lb - 438912, 365760, isi, sz=720, c=TEKS, wrap='none')
            return o
        for i, (ik, jd, isi) in enumerate(s.tindak()):
            x = 694944 + i * 3600602
            if i: o += s.garis(x - 73152, 5797296, 0, 'F2D3BA', h=457200)
            o += s.kotak(x, 5806440, 365760, 365760, ORG, 'ellipse') + s.gambar(x + 82296, 5888736, 201168, 201168, ik)
            o += s.tx(x + 457200, 5733288, 3014472, 201168, [jd], sz=950, b=True) + s.tx(x + 457200, 5952744, 3014472, 320040, isi, sz=820, c=TEKS, wrap='none')
        return o

    # ---------------------------------------------------------- slide 3: rincian
    def kepala(s, x, y, w, warna, tint, ikon, nama, n, h=457200):
        return (s.kotak(x, y, w, h, tint, 'roundRect', adj=16000) + s.kotak(x, y + h * .6, w, h * .4, tint) + s.kotak(x + 128016, y + (h - 292608) / 2, 292608, 292608, warna, 'ellipse')
                + s.gambar(x + 182880, y + (h - 182880) / 2, 182880, 182880, ikon) + s.tx(x + 502920, y, w - 1100000, h, [nama], sz=1100, b=True, an='ctr')
                + s.tx(x + w - 640080, y, 512064, h, [str(n)], sz=1800, b=True, c=warna, al='r', an='ctr'))

    def kolom_kh(s, A):
        # (x, lebar) tiap kolom tabel karhutla di panel kiri (676656 s.d. 7141464); A = ada kolom laporan pertama
        if A: return {'lok': (676656, 1880000), 'awal': (2540000, 1000000), 'kum': (3740000, 1120000), 'fs': (4900000, 1000000), 'sisa': (5940000, 1201464)}
        return {'lok': (676656, 2560000), 'kum': (3291840, 1300000), 'fs': (4680000, 1150000), 'sisa': (5880000, 1261464)}
    def tabel_kh(s, KH, Y=1325880, H=5029200, judul='Karhutla', ket=False, kmax=1.15):
        """Panel tabel karhutla (LOKASI, TERBAKAR, FIRESPOT DAN SISA) di kolom kiri, mulai Y setinggi H."""
        o = s.kotak(548640, Y, 6720840, H, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=max(2000, int(2000 * 5029200 / H))) + s.kepala(548640, Y, 6720840, ORG, T_ORG, 'api_p', judul, len(KH))
        # 2 Nov pemilik: header rata tengah; firespot dan sisa dua kolom; laporan pertama kolom sendiri (slide pengkinian)
        A = getattr(s, 'TAMPIL_AWAL', False); C = s.kolom_kh(A)
        tg = re.search(r'(\d{1,2} [A-Z]{3})$', s.lbl_kolom); tg = f' {tg[1]}' if tg else ''
        kep = [('LOKASI', *C['lok']), (s.lbl_kum, *C['kum']), (f'{s.lbl_hot.upper()}{tg}', *C['fs']), (f'SISA{tg}', *C['sisa'])] + ([('LAPORAN PERTAMA', *C['awal'])] if A else [])
        # 2 Nov pemilik (baseline paparan Kepala 011126): kepala tabel bar navy, huruf putih; tanggal kolom baris kedua lebih kecil dan pudar
        o += s.kotak(676656, Y + 539496, 6464808, 265176, NAVY, 'roundRect', adj=12000)   # 2 Nov pemilik: tidak mepet kotak judul seksi
        for t, x, w in kep:
            m = re.match(r'^(TERBAKAR|FIRESPOT|HOTSPOT|SISA)\s+(.+)$', t)
            if m:
                o += s.tx(x, Y + 557784, w, 128016, [m[1]], sz=720, b=True, c='FFFFFF', spc=60, al='ctr', an='b', wrap='none')
                o += s.tx(x, Y + 685800, w, 100584, [m[2]], sz=700, c='9FB0C4', spc=30, al='ctr', an='t', wrap='none')
            else:
                o += s.tx(x, Y + 539496, w, 265176, [t], sz=720, b=True, c='FFFFFF', spc=60, al='ctr', an='ctr', wrap='none')
        baris = []
        for p in dict.fromkeys(x['prov'] for x in KH):
            xs = [x for x in KH if x['prov'] == p]
            if len(xs) > 1: baris.append(('grup', p, xs))
            baris += [('anak' if len(xs) > 1 else 'satu', p, [x]) for x in xs]
        y0, yb = Y + 868680, Y + H - 95080; rp = min((yb - y0) // max(1, len(baris)), 420000); k = rp / 300446
        sz_n, sz_p = int(920 * max(min(k, kmax), .78)), int(760 * max(min(k, kmax), .8))
        for n, (jenis, p, xs) in enumerate(baris):
            y = y0 + n * rp
            if n and jenis != 'grup': o += s.garis(676656, y, 6464808, 'EEF0F3')
            if jenis == 'grup':
                tot = next((x['sat']['kum'] for x in xs if not x['lokasi']), None) or sum(x['sat']['kum'] for x in xs); ph = int(rp * .62)   # angka provinsi sudah memuat kabupatennya
                o += s.kotak(676656, y + rp * .06, 6464808, rp * .88, 'F7F8FA') + s.tx(749808, y, 1645920, rp, [NAMA[p]], sz=sz_n, b=True, an='ctr')
                wn = 1645920 if len(NAMA[p]) > 14 else 1040000
                # 2 Nov pemilik ("spacingnya jelek"): teks mulai sesudah ikon dengan celah, lebar pil ikut panjang teks
                px0, py0, tk = 749808 + wn - 80000, y + (rp - ph) / 2, f'{len(xs)} kejadian'; pw = ph * 1.05 + len(tk) * int(sz_p * .9) * 62 + ph * .45
                o += s.kotak(px0, py0, pw, ph, T_ORG, 'roundRect', adj=50000) + s.gambar(px0 + ph * .3, py0 + ph * .2, ph * .6, ph * .6, 'api_o2') + s.tx(px0 + ph * 1.05, py0, pw - ph * 1.05, ph, [tk], sz=int(sz_p * .9), b=True, c=ORG, an='ctr', wrap='none')
                kx = C['kum'][0]
                o += s.kotak(kx, y + (rp - ph) / 2, 1005840, ph, 'FFFFFF', 'roundRect', ln='F2C9A8', adj=50000) + s.gambar(kx + ph * .4, y + (rp - ph) / 2 + ph * .2, ph * .6, ph * .6, 'api_o2') + s.tx(kx + ph * .8, y + (rp - ph) / 2, 1005840 - ph * .8, ph, [f'total ± {f0(tot)} ha'], sz=int(sz_p * .95), b=True, al='ctr', an='ctr')
                continue
            x = xs[0]; sa = x['sat']; ind = 164592 if jenis == 'anak' else 0; d = int(min(237744, rp * .6))
            o += s.status_ikon(676656 + ind, y + (rp - d) / 2, d, x['tangani'])
            nm = [(x['lokasi'] or 'Tingkat provinsi', INK, False)] if jenis == 'anak' else [(NAMA[p], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])
            kt = s.keterangan(x) if ket else ''   # 30 Okt: keterangan BPBD singkat di bawah nama (kejadian baru)
            lx, lw = C['lok']; lx += 313344 + ind; lw -= 313344 + ind
            o += s.tx(lx, y, lw, rp, [nm] + ([[(kt, TEKS, False)]] if kt and x['tangani'] and not A else []), sz=sz_n, an='ctr', wrap='none')
            if A:   # 2 Nov pemilik: tanggal laporan pertama kolom sendiri, bukan di bawah nama
                # 2 Nov pemilik ("masih polos tekstual"): tanggal jadi pil berikon kalender + "hari ke-N" sejak laporan pertama;
                # kejadian yang hanya terlihat satelit = pil abu berikon pengamatan
                d_ = s.awal(x); ax, aw = C['awal']; ph_ = int(min(201168, rp * .5)); szp = int(sz_p * .92)
                ta, (fl, wn, ikn) = ((f"{d_.day} {BULAN[d_.month - 1][:3]}" + (f' {d_.year}' if d_.year != s.tanggal.year else ''), (T_NAVY, NAVY, 'kalender_navy'))
                                     if d_ else ('Data satelit', (T_SLATE, SLATE, 'mata_slate')))
                pw_ = s.pil(0, 0, ta, fl, wn, ikn, sz=szp, h=ph_)[1]; yp = y + rp / 2 - (ph_ + (118872 if d_ else 0)) / 2
                o += s.pil(ax + (aw - pw_) / 2, yp, ta, fl, wn, ikn, sz=szp, h=ph_)[0]
                if d_:
                    hk = (s.tanggal - d_).days + 1
                    o += s.tx(ax, yp + ph_ + 9144, aw, 109728, [f'hari ke-{f0(hk)}'], sz=700, c=ABU, al='ctr', an='ctr', wrap='none')
            o += s.tx(C['kum'][0], y, C['kum'][1], rp, [f"± {f0(sa['kum'])} ha"], sz=int(sz_n * .98), b=True, an='ctr', wrap='none')   # 2 Nov: rata kiri
            ph = int(min(250000, rp * .66)); yy = y + (rp - ph) / 2; ic = int(ph * .62)
            if kt and not x['tangani']:   # 31 Okt pemilik: keterangan kejadian padam jadi label (melintang kolom firespot dan sisa)
                x0, x1 = C['fs'][0], C['sisa'][0] + C['sisa'][1]; pw_ = s.pil(0, 0, kt, T_NAVY, NAVY, 'kalender_navy', sz=sz_p, h=ph)[1]
                o += s.pil(x0 + (x1 - x0 - pw_) / 2, yy, kt, T_NAVY, NAVY, 'kalender_navy', sz=sz_p, h=ph)[0]
            if x['tangani']:
                fs = '–' if sa['hot'] is None else f0(sa['hot'])   # None: website menulis "–" (29 Okt)
                sis = f"± {f0(sa['sisa'])} ha" if round(sa['sisa']) or not sa.get('api') else s.sisa_teks(sa)
                for (cx, cw), teks, fill, warna, ikon in ((C['fs'], fs, T_NAVY, NAVY, 'api_n'), (C['sisa'], sis, T_ORG, ORG, 'api_o2')):
                    pw = cw - 91440; px = cx + 45720; tw = len(teks) * sz_p * 62; g = ic + 54864 + tw; gx = px + (pw - g) / 2
                    o += s.kotak(px, yy, pw, ph, fill, 'roundRect', adj=50000) + s.gambar(gx, yy + (ph - ic) / 2, ic, ic, ikon) + s.tx(gx + ic + 54864, yy, tw + 60000, ph, [teks], sz=sz_p, b=True, c=warna, an='ctr', wrap='none')
        return o

    def lain_isi(s, LN, XL, XR, ringkas, padat=False):
        """Isi box Bencana lainnya (penanda @y@...@@ untuk digeser), format slide rincian; kembali (xml, tinggi)."""
        def pils(ps, px_, y_):
            o_ = ''
            for t, f, c, ik in reversed(ps):
                ww = 120000 + len(t) * 700 * 62 + 164592 * .9
                if KW and ik in ('awas_oranye', 'kalender_navy'): ww = KW   # 4 Nov pemilik: label keterangan selebar, pil KK sejajar
                px_ -= ww; o_ += s.pil(px_, y_, t, f, c, ik, sz=700, h=164592, w=ww)[0]; px_ -= 54864
            return o_, px_
        lain, yy = '', 0
        KW = max((120000 + len(t) * 700 * 62 + 164592 * .9 for x in LN for t, f, c, ik in s.ket(x) if ik in ('awas_oranye', 'kalender_navy')), default=0) if getattr(s, 'SEJAJAR', False) else 0
        JL = dict(JENIS_LAIN, **({'kekeringan': ('Kekeringan', 'daun', KER, T_KER)} if any(x['jenis'] == 'kekeringan' for x in LN) else {}))
        def ujung_nama(x):   # ujung kanan nama (+ pil kalender) di versi ringkas
            nm = [(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])
            xn = XL + 400000 + int(sum(len(t) for t, _, _ in nm) * 760 * 56)
            if getattr(s, 'TAMPIL_AWAL', False) and s.teks_awal(x):
                xa = XL + 400000 + s.lebar_runs(nm, 760) + 54864
                xn = max(xn, int(xa + s.pil(0, 0, s.teks_awal(x).replace('Laporan pertama ', ''), T_NAVY, NAVY, 'kalender_navy', sz=700, h=164592, b=False)[1] + 45720))
            return xn
        def stat_ringkas(dt_): return [(f"{v} {lab.replace(' terdampak', '').replace('jiwa ', '')}", 'F7F8FA', c, ik) for v, lab, ik, c in dt_.get('stat', [])]
        # 5 Nov pemilik ("samain antara banjir sudah surut dan air sudah surut"): bila satu kejadian berketerangan + angka harus
        # dua baris (Kota Subulussalam), semua kejadian berketerangan + angka ikut dua baris (Pidie Jaya), supaya pilnya sejajar
        DUA = ringkas and any(s.detail(x).get('pil') and x_st and pils(s.detail(x)['pil'] + x_st, XR - 18288, 9144)[1] <= ujung_nama(x)
                              for x in LN for x_st in [stat_ringkas(s.detail(x))])
        for jn, (nama, ikon, warna, tint) in JL.items():
            xs = [x for x in LN if x['jenis'] == jn]
            if not xs: continue
            if ringkas and not yy:
                # 28 Okt pemilik: legenda ikon jenis bencana di atas daftar ringkas
                lx = XL + 18288; lain += '@0@'
                for jn2, (nm2, ik2, w2, _) in JL.items():
                    if not any(x['jenis'] == jn2 for x in LN): continue
                    lain += s.kotak(lx, 27432, 128016, 128016, w2, 'ellipse') + s.gambar(lx + 27432, 54864, 73152, 73152, f'{ik2}_putih') + s.tx(lx + 164592, 0, len(nm2) * 48000, 182880, [nm2], sz=700, c=TEKS, an='ctr', wrap='none')
                    lx += 164592 + len(nm2) * 48000 + 137160
                lain += '@@'; yy += 182880 + 45720
            if ringkas:
                # 28 Okt: kolom kanan tidak muat (7 kekeringan + 7 lainnya): satu baris per kejadian, angka jadi pil, baris kedua bila pil tidak muat
                for x in xs:
                    dt_ = s.detail(x); st = [(f"{v} {lab.replace(' terdampak', '').replace('jiwa ', '')}", 'F7F8FA', c, ik) for v, lab, ik, c in dt_.get('stat', [])]
                    nm = [(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])
                    xn = XL + 400000 + int(sum(len(t) for t, _, _ in nm) * 760 * 56)   # 31 Okt: 50 terlalu sempit, pil menimpa "Kota Subulussalam"
                    lain += f'@{yy}@' + s.status_ikon(XL + 18288, 18288, 146304, x['tangani']) + s.kotak(XL + 201168, 18288, 146304, 146304, warna, 'ellipse') + s.gambar(XL + 228600, 45720, 91440, 91440, f'{ikon}_putih')
                    lain += s.tx(XL + 400000, 0, 2286000, 182880, [nm], sz=760, an='ctr', wrap='none')
                    if getattr(s, 'TAMPIL_AWAL', False) and s.teks_awal(x):   # 4 Nov pemilik: versi ringkas juga memuat pil kalender laporan pertama
                        xa = XL + 400000 + s.lebar_runs(nm, 760) + 54864
                        pa, wa_ = s.pil(xa, 9144, s.teks_awal(x).replace('Laporan pertama ', ''), T_NAVY, NAVY, 'kalender_navy', sz=700, h=164592, b=False)
                        lain += pa; xn = max(xn, int(xa + wa_ + 45720))
                    satu, px_ = pils(dt_.get('pil', []) + st, XR - 18288, 9144)
                    if px_ > xn and not (DUA and dt_.get('pil') and st): lain += satu + '@@'; yy += 182880 + (9144 if s.LAMPIRAN else 27432); continue
                    p1, px1 = pils(dt_.get('pil', []), XR - 18288, 9144)
                    if px1 > xn:
                        lain += p1 + '@@'; yy += 182880 + 9144
                        lain += f'@{yy}@' + pils(st, XR - 18288, 9144)[0] + '@@'; yy += 182880 + (9144 if s.LAMPIRAN else 27432)
                    else:   # 30 Okt: pil keterangan panjang menimpa nama (Deli Serdang): nama sebaris sendiri, pil di bawahnya
                        lain += '@@'; yy += 182880 + 9144
                        dua, px2 = pils(dt_.get('pil', []) + st, XR - 18288, 9144)
                        if px2 > XL + 400000: lain += f'@{yy}@' + dua + '@@'; yy += 182880 + (9144 if s.LAMPIRAN else 27432)
                        else:
                            lain += f'@{yy}@' + p1 + '@@'; yy += 182880 + 9144
                            lain += f'@{yy}@' + pils(st, XR - 18288, 9144)[0] + '@@'; yy += 182880 + (9144 if s.LAMPIRAN else 27432)
                continue
            if yy: yy += 54864
            lain += f'@{yy}@' + s.kotak(XL, 0, XR - XL, 182880, 'F3F5F8', 'roundRect', adj=30000) + s.kotak(XL + 45720, 18288, 146304, 146304, warna, 'ellipse') + s.gambar(XL + 73152, 45720, 91440, 91440, f'{ikon}_putih')
            p_, _ = s.pil(XL + 300000 + len(nama) * 64000, 27432, f'{len(xs)} kejadian', tint, warna, {'gempa': 'gempa_slate', 'api': 'api_merah', 'banjir': 'banjir_navy', 'angin': 'angin_slate', 'daun': 'daun_k', 'longsor': 'longsor_coklat', 'gunung': 'gunung_merah'}[ikon], sz=580, h=128016)
            lain += s.tx(XL + 237744, 0, 1600000, 182880, [nama], sz=820, b=True, an='ctr', wrap='none') + p_ + '@@'
            yy += 182880 + 18288; AI, AN = 237744, 237744 + 146304 + 64008
            for x in xs:
                dt_ = s.detail(x)
                nm = [(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])
                # 2 Nov pemilik ("hirarki indentasinya"): anak menjorok, ikon status sejajar nama induk
                lain += f'@{yy}@' + s.status_ikon(XL + AI, 18288, 146304, x['tangani']) + s.tx(XL + AN, 0, 2286000, 182880, [nm], sz=760, an='ctr', wrap='none')
                ujung = XL + AN + s.lebar_runs(nm, 760)   # 3 Nov: lebar diukur dari font Roboto (perkiraan per huruf memotong nama)
                if getattr(s, 'TAMPIL_AWAL', False) and s.teks_awal(x):   # 31 Okt: laporan pertama; 3 Nov pemilik ("dibuat label"): pil kalender
                    pa, wa_ = s.pil(ujung + 54864, 9144, s.teks_awal(x).replace('Laporan pertama ', ''), T_NAVY, NAVY, 'kalender_navy', sz=700, h=164592, b=False)   # 3 Nov pemilik: ikon + tanggal saja, artinya di keterangan
                    lain += pa; ujung += 54864 + int(wa_)
                p1, px1 = pils(dt_.get('pil', []), XR - 18288, 9144)
                pil_stat = ''; xr_stat = XR
                if px1 < ujung + 45720:   # 30 Okt: pil menimpa nama, turun sebaris (3 Nov: 50 terlalu sempit, menimpa "Laporan pertama")
                    if dt_.get('stat') and len(dt_['stat']) == 1:   # 3 Nov pemilik ("jadi aneh layoutnya"): pil di ujung kanan baris angka, bukan baris sendiri
                        pil_stat, xr_stat = pils(dt_.get('pil', []), XR - 18288, (201168 if padat else 320040) // 2 - 164592 // 2)
                        xr_stat -= 45720 - 54864; p1 = ''
                    else:
                        lain += '@@'; yy += 182880 + 9144; lain += f'@{yy}@'
                lain += p1 + '@@'
                yy += 182880 + 9144
                if dt_.get('stat') and padat:   # 3 Nov: 8 bencana lainnya tanpa kekeringan tidak muat: kotak angka satu baris (nilai lalu label)
                    sw = (xr_stat - XL - AN - (len(dt_['stat']) - 1) * 45720) // len(dt_['stat']); sx = XL + AN
                    lain += f'@{yy}@' + pil_stat
                    for v, lab, ik, c in dt_['stat']:
                        vw = int(len(v) * 950 * 64)
                        lain += s.kotak(sx, 0, sw, 201168, 'F7F8FA', 'roundRect', adj=14000) + s.gambar(sx + 64008, 41148, 118872, 118872, ik) + s.tx(sx + 219456, 0, vw, 201168, [v], sz=950, b=True, c=c, an='ctr', wrap='none')
                        lain += s.tx(sx + 219456 + vw + 91440, 0, sw - vw - 320000, 201168, [lab], sz=680, c=TEKS, an='ctr', wrap='none')
                        sx += sw + 45720
                    lain += '@@'; yy += 201168 + 18288
                elif dt_.get('stat'):
                    sw = (xr_stat - XL - AN - 2 * 45720) // len(dt_['stat']) if not pil_stat else xr_stat - XL - AN - 45720; sx = XL + AN
                    lain += f'@{yy}@' + pil_stat
                    for v, lab, ik, c in dt_['stat']:
                        lain += s.kotak(sx, 0, sw, 320040, 'F7F8FA', 'roundRect', adj=14000) + s.gambar(sx + 64008, 45720, 118872, 118872, ik) + s.tx(sx + 219456, 18288, sw - 240000, 164592, [v], sz=950, b=True, c=c, an='ctr', wrap='none')
                        lain += s.tx(sx + 64008, 182880, sw - 100000, 118872, [lab], sz=620, c=TEKS, an='ctr', wrap='none')
                        sx += sw + 45720
                    lain += '@@'; yy += 320040 + 18288
                yy += 9144
        return lain, yy

    def s3(s, LN=None, KH=None):
        KH, KR, LN = s.KH if KH is None else KH, s.KR, s.LN if LN is None else LN   # 30 Okt: slide pengkinian = tanpa kejadian baru (sudah di slide 3)
        s.KET_UMUM = not s.LAMPIRAN; s.SEJAJAR = False   # perataan pil hanya di slide kejadian baru
        s.TAMPIL_AWAL = s.LAMPIRAN and not s.GABUNG   # 31 Okt: slide pengkinian memuat tanggal laporan pertama
        try: return s._s3(KH, KR, LN)
        finally: s.TAMPIL_AWAL = False

    def _s3(s, KH, KR, LN):
        LGH = 182880 if s.LAMPIRAN else 274320; CB = 6355080 - 73152 - LGH   # 30 Okt: keterangan lebih kecil, isi kolom kanan dapat ruang
        o = s.tabel_kh(KH)
        QX, QW = 7406640, 4236415; XL, XR = 7571232, 11478463
        lain, yy = s.lain_isi(LN, XL, XR, False)
        LH = 411480 + yy + 64008
        # panel setinggi isinya (pemilik 24 Okt): kekeringan di atas, bencana lainnya langsung di bawahnya, keterangan menempel di bawahnya
        PK_ = {p: [x for x in KR if x['prov'] == p] for p in dict.fromkeys(x['prov'] for x in KR)}
        if len(PK_) > 1: PK_ = {None: KR}   # 27 Okt: 9 kekeringan di 6 provinsi tidak muat sebagai blok per provinsi
        BR = {p: len(xs) + (len(xs) > 1) for p, xs in PK_.items()}; KEPALA = 2304288 - 1856232 - (265176 if None in PK_ else 0)
        KB_isi = 1856232 + sum(KEPALA + 320040 * n + 91440 for n in BR.values()) - 91440 + 137160 if KR else 1325880
        rk = False
        if not KR and LN and LH > CB - 1325880:   # 3 Nov: tanpa kekeringan panel naik menimpa judul; padatkan dulu, ringkas bila masih tidak muat
            lain, yy = s.lain_isi(LN, XL, XR, False, padat=True); LH = 411480 + yy + 64008
            if LH > CB - 1325880: lain, yy = s.lain_isi(LN, XL, XR, True); LH = 411480 + yy + 64008; rk = True
        if KR and LN and (CB - LH - 2 * 91440 - 1856232 - len(BR) * KEPALA) // max(1, sum(BR.values())) < 230000:
            lain, yy = s.lain_isi(LN, XL, XR, True); LH = 411480 + yy + 64008; rk = True
        if s.LAMPIRAN and rk and not getattr(s, 'TAMPIL_AWAL', False): CB = 6355080 - 45720   # 4 Nov: dengan pil laporan pertama, sisakan baris keterangan di bawah panel   # 30 Okt: keterangan status pindah ke baris legenda box Bencana lainnya
        LY = KB_isi + 91440 if CB - (KB_isi + 91440) >= LH else CB - LH
        if not KR and LH <= CB - 1325880: LY = 1325880   # 3 Nov: tanpa kekeringan, sejajar panel karhutla di kiri
        if s.LAMPIRAN and KR:   # 30 Okt: baris kekeringan minimal 0,2 juta EMU (sebelumnya tergencet dan bertumpuk)
            LY = max(LY, 1856232 + sum(KEPALA + 192024 * n + 91440 for n in BR.values()) - 91440 + 137160 + 91440)
        KB = LY - 91440
        if KR:
            o += s.kotak(QX, 1325880, QW, KB - 1325880, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.kepala(QX, 1325880, QW, KER, T_KER, 'daun2_p', 'Kekeringan', len(KR))
        rp = min(320040, (KB - 91440 - 1856232 - len(BR) * (KEPALA + 91440) + 91440) // max(1, sum(BR.values()))); dy = -265176 if None in PK_ else 0
        for p, xs in PK_.items():
            o0, o = o, ''
            tkk, tjw, tl, ttk = (sum(x['angka'].get(m, 0) for x in xs) for m in ('kk', 'jiwa', 'liter', 'tangki'))
            px = max(8458200, XL + len(NAMA[p]) * 70000 + 91440) if p else 0   # pil sesudah nama provinsi (nama panjang tidak tertimpa)
            if p: o += s.tx(XL, 1856232, px - XL, 201168, [NAMA[p]], sz=950, b=True, an='ctr', wrap='none') + s.kotak(px, 1883664, 640080, 146304, T_KER, 'roundRect', adj=50000) + s.gambar(px + 51206, 1883664 + 29261, 87782, 87782, 'daun_k') + s.tx(px + 117043, 1883664, 640080 - 117043, 146304, [f'{len(xs)} kejadian'], sz=620, b=True, c='8A6A2E', al='ctr', an='ctr')
            # 28 Okt pemilik: kepala kolom rata tengah di atas isinya (TERDAMPAK = KK + jiwa, BANTUAN AIR = pil liter + tangki)
            o += '@KEPALA_KER@'
            for t, x0, w0, al in (('LOKASI', XL, 1200000, 'ctr'), ('TERDAMPAK', 8620000, 9900000 - 8620000, 'ctr'), ('BANTUAN AIR', 9930000, XR - 9930000, 'ctr')):
                o += s.tx(x0, 2103120, w0, 182880, [t], sz=620, b=True, c='FFFFFF', spc=60, al=al, an='ctr')
            o = o.replace('@KEPALA_KER@', s.kotak(XL, 2103120, XR - XL, 182880, NAVY, 'roundRect', adj=12000))   # 2 Nov: bar navy di bawah teks kepala
            tot = len(xs) > 1
            def baris_air(y, kk, jw, liter, tangki, garis_c, b=True):
                # pemilik 27 Okt: kolom diberi ruang (tanpa ikon per baris di TERDAMPAK); liter dan tangki dua label berikon
                ph_, yp = 164592, y + (rp - 164592) / 2; pl, lc = s.pecah(liter), '8A6A2E' if not b else INK
                # 5 Nov pemilik ("ini bukannya pakai label ya?"): TERDAMPAK jadi label berbingkai berikon orang, sejajar pil BANTUAN AIR
                r = s.kotak(8640000, yp, 9890000 - 8640000, ph_, 'FFFFFF', 'roundRect', ln=garis_c, adj=50000) + s.gambar(8675000, yp + 32000, 100584, 100584, 'orang_k')
                r += (s.au(9150000, yp, ph_, *s.pecah(kk), 720, c=lc, wn=330000, wu=200000) if s.pecah(kk) else s.tx(8810000, yp, 1050000, ph_, [kk], sz=720, b=True, c=lc, an='ctr', wrap='none'))
                if s.pecah(kk): r += s.au(9650000, yp, ph_, *(s.pecah(jw) or ('–', 'jiwa')), 720, c=TEKS, b=False, wn=330000, wu=230000) if s.pecah(jw) or jw == 'jiwa –' else s.tx(9300000, yp, 580000, ph_, [jw], sz=720, c=TEKS, an='ctr', wrap='none')
                tk = re.search(r'([\d.]+)', tangki)
                pw = 880000 if pl or tk else 10870000 + 608463 - 9930000   # 28 Okt pemilik: tanpa data = "dalam proses pendataan", pil melebar ke kolom tangki
                r += s.kotak(9930000, yp, pw, ph_, 'FFFFFF', 'roundRect', ln=garis_c, adj=50000) + s.gambar(9985000, yp + 32000, 100584, 100584, 'tetes_k')
                r += s.au(9930000 + 620000, yp, ph_, *pl, 720, c=lc, wn=430000, wu=200000) if pl else s.tx(10120000, yp, pw - 230000, ph_, ['dalam proses pendataan'], sz=680, c=TEKS, an='ctr', wrap='none')
                if tk: r += (s.kotak(10870000, yp, 608463, ph_, 'FFFFFF', 'roundRect', ln=garis_c, adj=50000) + s.gambar(10910000, yp + 27432, 109728, 109728, 'truk_kering')
                             + s.au(10870000 + 300000, yp, ph_, tk[1], 'tangki', 720, c=lc, wn=120000, wu=300000))
                return r
            if tot:
                y = 2304288
                o += s.kotak(XL, y + rp * .08, XR - XL, rp * .84, 'F3F5F8', 'roundRect', adj=12000) + s.tx(XL + 91440, y, 1000000, rp, ['TOTAL'], sz=700, b=True, c=ABU, spc=60, an='ctr')
                o += baris_air(y, f'{f0(tkk)} KK', f'{f0(tjw)} jiwa', f'{f0(tl)} liter', f', {f0(ttk)} tangki' if ttk else '', 'B08A3E', b=False)   # 30 Okt: tanpa data tangki bukan "0 tangki"
            for n, x in enumerate(xs):
                y = 2304288 + (n + tot) * rp; a = x['angka']
                if n: o += s.garis(XL, y, XR - XL, 'EEF0F3')
                ta = s.teks_awal(x).replace('Laporan pertama ', '') if getattr(s, 'TAMPIL_AWAL', False) else ''
                # 5 Nov: 6 kekeringan + total, baris ~262 rb EMU: pil sebaris sesudah nama panjang (Pemalang, Temanggung, Grobogan)
                # menimpa angka KK (mulai ~8,62 jt EMU) -> pil turun ke bawah nama bila ujungnya lewat batas kolom TERDAMPAK
                lewat = ta and (XL + 228600 + s.lebar_runs([(x['lokasi'], INK, True)], 850) + 45720 + s.pil(0, 0, ta, T_NAVY, NAVY, 'kalender_navy', sz=700, h=128016, b=False)[1]) > 8570000
                if ta and (rp >= 290000 or (lewat and rp >= 230000)):   # 4 Nov pemilik: kekeringan ikut pil kalender laporan pertama; di bawah nama (kolom LOKASI sempit)
                    # 5 Nov atasan ("spacingnya berantakan"): nama + pil satu blok di tengah baris, tidak keluar ke baris atas
                    nh, ph, gp = (137160, 128016, 18288) if rp >= 290000 else (118872, 118872, 9144)
                    yb = y + (rp - nh - gp - ph) / 2
                    o += s.status_ikon(XL, y + (rp - 164592) / 2, 164592, True) + s.tx(XL + 228600, yb, 1100000, nh, [x['lokasi']], sz=(850 if rp >= 290000 else 800) if len(x['lokasi']) < 15 else 750, b=True, an='ctr', wrap='none')
                    o += s.pil(XL + 228600, yb + nh + gp, ta, T_NAVY, NAVY, 'kalender_navy', sz=700, h=ph, b=False)[0]
                else:
                    o += s.status_ikon(XL, y + (rp - 164592) / 2, 164592, True) + s.tx(XL + 228600, y, 1100000, rp, [x['lokasi']], sz=850 if len(x['lokasi']) < 15 else 750, b=True, an='ctr')
                    if ta: o += s.pil(XL + 228600 + s.lebar_runs([(x['lokasi'], INK, True)], 850) + 45720, y + (rp - 128016) / 2, ta, T_NAVY, NAVY, 'kalender_navy', sz=700, h=128016, b=False)[0]
                o += baris_air(y, f"{f0(a['kk'])} KK" if a.get('kk') else 'dalam pendataan', f"{f0(a['jiwa'])} jiwa" if a.get('jiwa') else 'jiwa –',
                               f"{f0(a['liter'])} liter" if a.get('liter') else 'belum dilaporkan', f", {f0(a['tangki'])} tangki" if a.get('tangki') else '', 'E2D3B5')
            o = o0 + s.geser(o, dy); dy += KEPALA + BR[p] * rp + 91440
        if LN:
            o += s.kotak(QX, LY, QW, LH, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=4000) + s.kepala(QX, LY, QW, SLATE, T_SLATE, 'awas_p2', 'Bencana lainnya', len(LN), h=365760)
            o += re.sub(r'@(\d+)@(.*?)@@', lambda m: s.geser(m.group(2), LY + 411480 + int(m.group(1))), lain, flags=re.S)
        if s.LAMPIRAN and rk and LN:   # 30 Okt: selesai / dalam penanganan di ujung kanan baris legenda jenis bencana (tanpa baris sendiri)
            xr, ly = XR - 18288, LY + 411480
            for w, ik, t_ in ((ORG, 'titik3_p', 'dalam penanganan'), (NAVY, 'cek_p', 'selesai')):
                tw = len(t_) * 44000; xr -= tw
                o += s.tx(xr, ly, tw, 182880, [t_], sz=700, c=TEKS, an='ctr', wrap='none'); xr -= 164592
                o += s.kotak(xr, ly + 27432, 128016, 128016, w, 'ellipse') + s.gambar(xr + 27432, ly + 54864, 73152, 73152, ik); xr -= 137160
            if getattr(s, 'TAMPIL_AWAL', False):   # 4 Nov pemilik: legenda kalender = laporan pertama, juga di versi ringkas (baris sendiri di bawah panel)
                ky = LY + LH + 73152
                o += s.tx(QX + 91440, ky, 868680, LGH, ['KETERANGAN'], sz=650, b=True, c=ABU, spc=100, an='ctr')
                o += s.gambar(QX + 1005840, ky + 18288, 146304, 146304, 'kalender_navy') + s.tx(QX + 1197864, ky, 1400000, LGH, ['laporan pertama'], sz=700, c=TEKS, an='ctr')
            return o
        if s.LAMPIRAN:   # 30 Okt: satu baris kecil tanpa kotak besar
            ket = s.tx(QX + 91440, 6080760, 868680, LGH, ['KETERANGAN'], sz=650, b=True, c=ABU, spc=100, an='ctr')
            for x0, w, ik, t in ((QX + 1005840, NAVY, 'cek_p', 'selesai'), (QX + 1783080, ORG, 'titik3_p', 'dalam penanganan')):
                ket += s.kotak(x0, 6080760 + 27432, 128016, 128016, w, 'ellipse') + s.gambar(x0 + 27432, 6080760 + 54864, 73152, 73152, ik) + s.tx(x0 + 173736, 6080760, 1000000, LGH, [t], sz=700, c=TEKS, an='ctr')
            if getattr(s, 'TAMPIL_AWAL', False):   # 3 Nov pemilik: "tulis aja di keterangan kalau icon kalender itu artinya laporan pertama"
                x0 = QX + 2834640
                ket += s.gambar(x0, 6080760 + 18288, 146304, 146304, 'kalender_navy') + s.tx(x0 + 192024, 6080760, 1000000, LGH, ['laporan pertama'], sz=700, c=TEKS, an='ctr')
        else:
            ket = s.kotak(QX, 6080760, QW, 274320, 'F7F8FA', 'roundRect', adj=30000) + s.tx(7974025, 6080760, 868680, 274320, ['KETERANGAN'], sz=680, b=True, spc=100, an='ctr')
            for x0, w, ik, t in ((9117025, NAVY, 'cek_p', 'selesai'), (10011308, ORG, 'titik3_p', 'dalam penanganan')):
                ket += s.kotak(x0, 6140196, 155448, 155448, w, 'ellipse') + s.gambar(x0 + 32004, 6172200, 91440, 91440, ik) + s.tx(x0 + 210312, 6080760, 1064362, 274320, [t], sz=750, an='ctr')
        o += s.geser(ket, (LY + LH if LN else KB) + 73152 - 6080760)
        return o


    # ---------------------------------------------------------- 30 Okt (manager): slide 3 = kejadian baru + gunung api; sisanya lampiran
    def baru(s):
        """Kejadian bertanda (Kejadian Baru) di WA, apa adanya dari WA (lokasi BPBD, belum digabung ke baris provinsi website)."""
        out = []; s.IKUT_PROV = []
        for x in s.wa['kejadian']:
            if not x.get('baru'): continue
            # 6 Nov pemilik ("untuk provinsi yg udah ada di slide pengkinian, kalau ada kejadian baru gausah ditampilin"; 5 Nov: Desa Bintangor
            # Mukti, Morowali Utara -> "masukin ke pengkinian aja"): karhutla baru di provinsi yang sudah punya baris provinsi (bukan baris hasil
            # gabungan kabupaten ini sendiri) ikut baris itu di Pengkinian
            if x['jenis'] == 'karhutla' and any(y['jenis'] == 'karhutla' and y['prov'] == x['prov'] and not y['lokasi'] and y.get('lokasi_wa') != x['lokasi'] for y in s.KJ):
                s.IKUT_PROV.append(x); continue
            m = next((y for y in s.KJ if y['jenis'] == x['jenis'] and y['prov'] == x['prov'] and x['lokasi'] in (y['lokasi'], y.get('lokasi_wa'))), None)
            if x['jenis'] != 'karhutla':
                out.append({**x, 'tangani': m['tangani'] if m else x['status'] != 'selesai'}); continue
            # karhutla: angka kabupaten itu sendiri (sat_kab disimpan jalan.py sebelum digabung ke baris provinsi website, Morowali Utara -> Sulteng);
            # status ikut aturan susun(): BPBD belum padam = ditangani, selain itu sisa data kita >= 10 ha
            gabung = m is not None and not m['lokasi'] and m.get('lokasi_wa') == x['lokasi']
            sa = dict((m.get('sat_kab') if gabung else m['sat']) if m else {'kum': 0, 'sisa': 0, 'hot': 0})
            tg = (x['status'] == 'belum' or round(sa.get('sisa') or 0) >= 10) if gabung or not m else m['tangani']
            if sa.get('padam_sat'): tg = False   # 4 Nov Pulau Taliabu: jalan.py sudah memutus selesai (satelit tidak melihat api hari laporan, aturan 26 Okt)
            # 4 Nov pemilik ("hapus aja dari slide 3"): kabupaten padam yang provinsinya masih ada sisa di slide pengkinian tidak ditulis di sini
            # (Luwu, Konawe Kepulauan, Pulau Taliabu); kejadiannya sudah terwakili baris provinsi, supaya slide 3 dan 4 tidak bertentangan
            if not tg and gabung and m['tangani'] and round(m['sat']['sisa']): continue
            out.append({**x, 'sat': sa, 'tangani': tg})
        return out

    def label_jenis(s, x):
        t = x.get('label') or JENIS_LAIN.get(x['jenis'], (x['jenis'],))[0]
        t = re.sub(r'(?i)kebakaran hutan dan lahan', 'Karhutla', t)
        return t[:1].upper() + t[1:].lower()

    def judul_baru(s):
        B = s.baru(); H, P = (lambda t: (t, ORG, True)), (lambda t: (t, INK, True))
        hit = Counter(s.label_jenis(x).split(' dan ')[0].lower() for x in B)
        J = [P('Kejadian baru: '), H(f0(len(B))), P(' dari '), H(f0(s.N_TOT)), P(' kejadian menonjol')]
        if hit:
            bag = [f'{n} {j}' for j, n in hit.most_common()]
            J += [P(' (' + (', '.join(bag[:-1]) + (', dan ' if len(bag) > 2 else ' dan ') + bag[-1] if len(bag) > 1 else bag[0]) + ')')]
        if s.GA and not s.SIAGA:
            lv = s.GA['level']; st = [(lv[k], k) for k in ('Awas', 'Siaga') if lv.get(k)]
            if st:
                J += [P('; ')]
                for i, (n, k) in enumerate(st):
                    J += ([P(' dan ')] if i else []) + [H(f'{n} gunung api'), P(f' berstatus {k}')]
        return J

    def s3_baru(s):
        s.KET_UMUM = True; s.SEJAJAR = True   # 4 Nov pemilik: pil KK sejajar di slide kejadian baru
        # 30 Okt revisi pemilik: karhutla baru = tabel karhutla biasa (masih terbakar di atas, padam di bawah); banjir, cuaca ekstrem, dll. = box
        # "Bencana lainnya" biasa, keduanya dengan keterangan singkat BPBD; kolom kiri diisi penuh setinggi panel gunung api di kanan.
        B = s.baru(); X0, LW = 548640, 6720840
        KHb = sorted((x for x in B if x['jenis'] == 'karhutla'), key=lambda x: (not x['tangani'], -(x['sat'].get('sisa') or 0)))
        LNb = [x for x in B if x['jenis'] != 'karhutla']
        XL, XR = X0 + 164592, X0 + LW - 164592
        Y0, YB, GAP = 1325880, 6007608, 91440
        nb = len(KHb) + sum(1 for p in {x['prov'] for x in KHb} if sum(1 for x in KHb if x['prov'] == p) > 1)
        HK_ = lambda rp: 868680 + nb * rp + 95080 if KHb else 0
        ruang = YB - Y0 - (GAP if KHb and LNb else 0)
        lain, LH = '', 0
        if LNb:
            # format lengkap (kotak angka) bila muat bersama tabel karhutla; kalau tidak, format ringkas satu baris
            lain, yy = s.lain_isi(LNb, XL, XR, False); LH = 411480 + yy + 64008
            if HK_(270000) + LH > ruang:
                lain, yy = s.lain_isi(LNb, XL, XR, True); LH = 411480 + yy + 64008
        if s.SIAGA and LNb and (KHb or s.IKUT_PROV):   # 2 Nov: tanpa gunung api; karhutla kiri, bencana lainnya kanan, masing-masing setinggi kolom
            QX, QW = 7406640, 4236415
            lain, yy = s.lain_isi(LNb, QX + 164592, QX + QW - 164592, False); LH = 411480 + yy + 64008
            if LH > YB - Y0: lain, yy = s.lain_isi(LNb, QX + 164592, QX + QW - 164592, True); LH = 411480 + yy + 64008
            # 6 Nov pemilik ("buat yg karhutla kosong aja, paling ada textnya"): semua karhutla baru ikut baris provinsi -> panel tetap, isinya pesan
            o = s.tabel_kh(KHb, Y0, YB - Y0, 'Karhutla', ket=True, kmax=1.0) if KHb else s.kh_kosong(Y0, YB - Y0)   # setinggi panel kanan
            o += s.kotak(QX, Y0, QW, YB - Y0, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=4000) + s.kepala(QX, Y0, QW, SLATE, T_SLATE, 'awas_p2', 'Bencana lainnya', len(LNb), h=365760)
            o += re.sub(r'@(\d+)@(.*?)@@', lambda m: s.geser(m.group(2), Y0 + 411480 + int(m.group(1))), lain, flags=re.S)
            return o + (s.keterangan_kiri(X0, LW) if KHb else '')
        if KHb and LNb: HK = min(max(HK_(270000), ruang - LH), HK_(420000))   # sisa ruang ke tabel karhutla (baris lebih lega, huruf tetap)
        elif KHb: HK = min(HK_(420000), ruang)
        else: HK = 0
        o = ''
        if not B:
            o += s.tx(XL, Y0 + 91440, XR - XL, 274320, ['Tidak ada kejadian baru pada periode laporan ini.'], sz=900, c=TEKS, an='ctr')
        if KHb: o += s.tabel_kh(KHb, Y0, HK, 'Karhutla', ket=True, kmax=1.0)
        LY = Y0 + (HK + GAP if KHb else 0)
        if LNb:
            sisa_r = max(0, YB - LY - LH) if KHb else 0
            o += s.kotak(X0, LY, LW, LH + sisa_r, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=4000) + s.kepala(X0, LY, LW, SLATE, T_SLATE, 'awas_p2', 'Bencana lainnya', len(LNb), h=365760)
            o += re.sub(r'@(\d+)@(.*?)@@', lambda m: s.geser(m.group(2), LY + 411480 + int(m.group(1))), lain, flags=re.S)
        yk = 6080760   # keterangan menempel di dasar kolom, sejajar dasar panel gunung api
        ket = s.kotak(X0, yk, LW, 274320, 'F7F8FA', 'roundRect', adj=30000) + s.tx(X0 + 128016, yk, 868680, 274320, ['KETERANGAN'], sz=680, b=True, spc=100, an='ctr')
        for x0, w, ik, t in ((X0 + 1100000, NAVY, 'cek_p', 'selesai'), (X0 + 2000000, ORG, 'titik3_p', 'dalam penanganan')):
            ket += s.kotak(x0, yk + 59436, 155448, 155448, w, 'ellipse') + s.gambar(x0 + 32004, yk + 91440, 91440, 91440, ik) + s.tx(x0 + 210312, yk, 1064362, 274320, [t], sz=750, an='ctr')
        o += ket   # 2 Nov pemilik: penunjuk "Pengkinian kejadian sebelumnya: halaman 4" tidak perlu
        if s.GA and not s.SIAGA: o += s.panel_ga(7406640, Y0, 4236415, YB - Y0)   # 30 Okt: panel berhenti di atas kotak KETERANGAN kanan
        return o

    def keterangan_kiri(s, X0, LW):
        yk = 6080760
        ket = s.kotak(X0, yk, LW, 274320, 'F7F8FA', 'roundRect', adj=30000) + s.tx(X0 + 128016, yk, 868680, 274320, ['KETERANGAN'], sz=680, b=True, spc=100, an='ctr')
        for x0, w, ik, t in ((X0 + 1100000, NAVY, 'cek_p', 'selesai'), (X0 + 2000000, ORG, 'titik3_p', 'dalam penanganan')):
            ket += s.kotak(x0, yk + 59436, 155448, 155448, w, 'ellipse') + s.gambar(x0 + 32004, yk + 91440, 91440, 91440, ik) + s.tx(x0 + 210312, yk, 1064362, 274320, [t], sz=750, an='ctr')
        return ket

    def kh_kosong(s, Y, H):
        """6 Nov pemilik: panel Karhutla slide Kejadian Baru tanpa baris, karena semua karhutla baru ada di provinsi yang sudah di Pengkinian.
        Pesan di tengah panel + satu baris per kejadian: lokasi BPBD dan baris provinsi yang memuatnya (tanpa angka WA, aturan data sistem)."""
        X, W = 548640, 6720840
        o = s.kotak(X, Y, W, H, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2000) + s.kepala(X, Y, W, ORG, T_ORG, 'api_p', 'Karhutla', 0)
        n = len(s.IKUT_PROV); RH, RG = 420624, 91440
        blok = 457200 + 128016 + 320040 + 393192 + 182880 + n * RH + (n - 1) * RG
        y = Y + 457200 + max(182880, (H - 457200 - blok) // 2 - 182880)
        cx = X + W // 2
        o += s.kotak(cx - 228600, y, 457200, 457200, T_ORG, 'ellipse') + s.gambar(cx - 137160, y + 91440, 274320, 274320, 'api_oranye')
        y += 457200 + 128016
        o += s.tx(X + 457200, y, W - 914400, 320040, ['Tidak ada karhutla di provinsi baru'], sz=1300, b=True, al='ctr', an='ctr')
        y += 320040
        o += s.tx(X + 640080, y, W - 1280160, 393192, ['Titik api baru ada di provinsi yang sudah ditangani, jadi dicatat pada baris provinsinya di Pengkinian Kejadian Sebelumnya.'],
                  sz=900, c=TEKS, al='ctr', an='ctr')
        y += 393192 + 182880
        RX, RW = X + 914400, W - 1828800
        for x in s.IKUT_PROV:
            lok = x['lokasi'] if x['lokasi'].startswith('Kota ') else f"Kab. {x['lokasi']}"
            o += s.kotak(RX, y, RW, RH, 'F7F8FA', 'roundRect', adj=20000)
            o += s.kotak(RX + 118872, y + (RH - 228600) // 2, 228600, 228600, ORG, 'ellipse') + s.gambar(RX + 164592, y + (RH - 137160) // 2, 137160, 137160, 'api_p')
            o += s.tx(RX + 438912, y, RW // 2, RH, [lok], sz=1000, b=True, an='ctr')
            o += s.tx(RX + RW // 2, y, RW // 2 - 137160, RH, [f"ikut baris {NAMA[x['prov']]}"], sz=900, c=TEKS, al='r', an='ctr')
            y += RH + RG
        return o

    # 2 Nov pemilik: bagian "Status siaga bencana" = gunung api PVMBG (infonya sama beberapa hari, bukan kejadian baru)
    def judul_siaga(s):
        H, P = (lambda t: (t, ORG, True)), (lambda t: (t, INK, True)); lv = s.GA['level']
        st = [(lv[k], k) for k in ('Awas', 'Siaga') if lv.get(k)]
        J = [P('Status siaga bencana: ')]
        for i, (n, k) in enumerate(st): J += ([P(' dan ')] if i else []) + [H(f'{n} gunung api'), P(f' berstatus {k}')]
        return J + [P(f", {lv.get('Waspada', 0)} Waspada, {lv.get('Normal', 0)} Normal")] if st else J + [P('tidak ada gunung api berstatus Siaga atau Awas')]
    def s_siaga(s):
        return s.panel_ga(548640, 1325880, 11094415, 6007608 - 1325880, kolom=3)

    def lampiran_selesai_bulan(s, riwayat, awal_status):
        """5 Nov atasan ("daftar kejadian yang sudah selesai aja"; "bulan yang sedang berjalan, nambah terus"): daftar kejadian yang
        selesai sejak tanggal 1 bulan laporan sampai tanggal laporan. riwayat = [(tanggal, kejadian data.json)] urut naik, hari sebelum
        laporan; hari laporan memakai s.KJ. awal_status = kejadian data.json hari terakhir bulan lalu (yang sudah selesai di sana dan
        masih selesai tidak dihitung). Kejadian yang selesai lalu kembali ditangani keluar dari daftar. Kembali [(judul, isi, catatan)]."""
        kunci = lambda x: (x['jenis'], x['prov'], x['lokasi'] or '')
        sel = {kunci(x) for x in awal_status if not x.get('tangani')}
        daftar = {}
        for t, kej in list(riwayat) + [(s.tanggal, s.KJ)]:
            for x in kej:
                k = kunci(x)
                if x.get('tangani'): daftar.pop(k, None); sel.discard(k)
                elif k not in sel: daftar[k] = (t, x); sel.add(k)
        rows = sorted(daftar.values(), key=lambda r: (-r[0].toordinal(), r[1]['jenis'] != 'karhutla', NAMA[r[1]['prov']], r[1]['lokasi'] or ''))
        bln, th = BULAN[s.tanggal.month - 1], s.tanggal.year
        rentang_ = f'1–{s.tanggal.day} {bln} {th}' if s.tanggal.day > 1 else f'1 {bln} {th}'
        JN = dict(JENIS_LAIN, karhutla=('Karhutla', 'api', ORG, T_ORG), kekeringan=('Kekeringan', 'daun', KER, T_KER))
        IK_PIL = {'api': 'api_oranye', 'daun': 'daun_k', 'banjir': 'banjir_navy', 'gempa': 'gempa_slate', 'longsor': 'longsor_coklat', 'angin': 'angin_slate'}
        def ket(x):
            if x['jenis'] == 'karhutla': return 'Api sudah padam'
            k_ = s.keterangan(x); return 'Selesai' if k_ == 'Dalam penanganan' else k_
        nm = lambda x: [(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])
        tgl = lambda t: f'{t.day} {BULAN[t.month - 1][:3]}'
        per_jenis = {}
        for _, x in rows:
            j = JN.get(x['jenis'], ('Lainnya', 'awas', SLATE, T_SLATE)); per_jenis[x['jenis']] = per_jenis.get(x['jenis'], 0) + 1
        X0, W, Y = 548640, 11094415, 1325880; KP, PAD, KK, RH = 365760, 137160, 182880, 237744
        cw = (W - 3 * PAD) // 2; PER = (6007608 - Y - KP - PAD - KK - 45720 - 91440) // RH   # baris per kolom
        # 5 Nov atasan ("pengkategorian provinsi, kayak Aceh baru bawahnya kota apa aja"): baris induk provinsi, anak kabupaten/kota.
        # Grup urut tanggal selesai terbaru di dalamnya; baris = induk (1) + anak. Kolom diisi per grup, grup tidak dipotong kecuali
        # lebih panjang dari satu kolom (lanjutan diberi induk ulang "(lanjutan)").
        grup = {}
        for t, x in rows: grup.setdefault(x['prov'], []).append((t, x))
        GR = sorted(grup.items(), key=lambda kv: (-max(t for t, _ in kv[1]).toordinal(), NAMA[kv[0]]))
        def potong(gr):   # [(prov, anak, lanjutan)] per kolom, kapasitas PER baris
            kol, cur, isi_ = [], [], 0
            for p, anak in gr:
                anak = list(anak); lanj = False
                while anak:
                    muat = PER - isi_ - 1
                    if muat < 1 or (muat < len(anak) and len(anak) <= PER - 1 and cur):   # grup utuh pindah ke kolom baru
                        kol.append(cur); cur, isi_ = [], 0; continue
                    cur.append((p, anak[:muat], lanj)); isi_ += 1 + len(anak[:muat]); anak = anak[muat:]; lanj = True
            if cur: kol.append(cur)
            return kol
        def seimbang(gr):   # dua kolom: titik potong antargrup yang paling rata
            L = [1 + len(a) for _, a in gr]; tot = sum(L); best = None
            for k in range(1, len(gr)):
                a_, b_ = sum(L[:k]), tot - sum(L[:k])
                if a_ <= PER and b_ <= PER and (best is None or max(a_, b_) < best[0]): best = (max(a_, b_), k)
            if best: return [[(p, a, False) for p, a in gr[:best[1]]], [(p, a, False) for p, a in gr[best[1]:]]]
            return None
        tot_baris = sum(1 + len(a) for _, a in GR)
        kolom = (seimbang(GR) if len(GR) > 1 and tot_baris <= 2 * PER else None) or potong(GR) or [[]]
        hal = [kolom[i:i + 2] for i in range(0, len(kolom), 2)]
        P, H = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
        out = []
        for h_, kol_h in enumerate(hal):
            judul = [P('Lampiran: '), H(f'Daftar Kejadian Selesai {bln} {th}')] + ([P(f' ({h_ + 1}/{len(hal)})')] if len(hal) > 1 else [])
            catatan = [f'Kejadian yang selesai {rentang_}: {len(rows)} kejadian di {len(grup)} provinsi ('
                       + ', '.join(f'{v} {JN.get(k, ("lainnya",))[0].lower()}' for k, v in per_jenis.items()) + ').',
                       'Daftar bertambah tiap hari sampai akhir bulan; kejadian yang kembali ditangani dikeluarkan dari daftar.']
            for kol in kol_h:
                for p, anak, lanj in kol:
                    if not lanj: catatan.append(NAMA[p] + ': ' + '; '.join((x['lokasi'] or 'tingkat provinsi') + f' ({JN.get(x["jenis"], ("lainnya",))[0].lower()}, {tgl(t)}, {ket(x)})' for t, x in grup[p]))
            def isi(kol_h=kol_h):
                n_baris = max([sum(1 + len(a) for _, a, _ in k) for k in kol_h] + [1])
                HB = KP + PAD + KK + 45720 + n_baris * RH + 91440   # panel setinggi isinya (pemilik 24 Okt)
                kpl = f'Kejadian selesai, {rentang_}'
                o = s.kotak(X0, Y, W, HB, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.kepala(X0, Y, W, NAVY, T_NAVY, 'cek_p', kpl, len(rows), h=KP)
                px = X0 + 502920 + s.lebar_runs([(kpl, INK, True)], 1100) + 182880   # ringkasan per jenis sesudah judul kepala
                for jn_, v in per_jenis.items():
                    j = JN.get(jn_, ('Lainnya', 'awas', SLATE, T_SLATE))
                    p_, pw = s.pil(px, Y + (KP - 164592) / 2, f'{v} {j[0].lower()}', 'FFFFFF', j[2], IK_PIL.get(j[1], 'cek_navy'), sz=700, h=164592)
                    o += p_; px += pw + 54864
                if not rows:
                    return o + s.tx(X0 + PAD, Y + KP + PAD, W - 2 * PAD, RH, [f'Belum ada kejadian selesai pada {rentang_}'], sz=850, c=ABU, an='ctr')
                for c, kol in enumerate(kol_h):
                    x0 = X0 + PAD + c * (cw + PAD); y = Y + KP + PAD
                    cL, cS = cw * .50, cw * .15   # LOKASI, SELESAI; sisanya KETERANGAN
                    o += s.kotak(x0, y, cw, KK, NAVY, 'roundRect', adj=12000)
                    for t_, xx, ww, al in (('LOKASI', x0 + 91440, cL - 91440, 'l'), ('SELESAI', x0 + cL, cS, 'ctr'), ('KETERANGAN', x0 + cL + cS, cw - cL - cS - 91440, 'r')):
                        o += s.tx(xx, y, ww, KK, [t_], sz=620, b=True, c='FFFFFF', spc=60, al=al, an='ctr')
                    y += KK + 45720
                    for g, (p, anak, lanj) in enumerate(kol):
                        # baris induk provinsi: latar abu tipis, nama tebal + jumlah kejadian
                        o += s.kotak(x0, y + 18288, cw, RH - 36576, 'F3F5F8', 'roundRect', adj=20000)
                        o += s.tx(x0 + 91440, y, cL, RH, [[(NAMA[p], INK, True)] + ([(' (lanjutan)', ABU, False)] if lanj else [])], sz=820, an='ctr', wrap='none')
                        n_ = len(grup[p]); o += s.tx(x0 + cw - 1200000 - 91440, y, 1200000, RH, [f'{n_} kejadian'], sz=700, c=ABU, al='r', an='ctr', wrap='none')
                        y += RH
                        for n, (t, x) in enumerate(anak):
                            if n: o += s.garis(x0 + 228600, y, cw - 228600, 'EEF0F3')
                            j = JN.get(x['jenis'], ('Lainnya', 'awas', SLATE, T_SLATE)); yc = y + (RH - 137160) / 2
                            o += s.status_ikon(x0 + 228600, yc, 137160, False)
                            o += s.kotak(x0 + 411480, yc, 137160, 137160, j[2], 'ellipse') + s.gambar(x0 + 436626, y + (RH - 86868) / 2, 86868, 86868, f'{j[1]}_putih')
                            lok = x['lokasi'] or f"{j[0]} tingkat provinsi"
                            o += s.tx(x0 + 603504, y, cL - 603504, RH, [lok], sz=800, an='ctr', wrap='none')
                            pw = s.pil(0, 0, tgl(t), T_NAVY, NAVY, 'kalender_navy', sz=700, h=146304, b=False)[1]
                            o += s.pil(x0 + cL + (cS - pw) / 2, y + (RH - 146304) / 2, tgl(t), T_NAVY, NAVY, 'kalender_navy', sz=700, h=146304, b=False)[0]
                            kt = ket(x); kw = s.pil(0, 0, kt, 'F3F5F8', INK, 'cek_navy', sz=700, h=146304, b=False)[1]
                            o += s.pil(x0 + cw - kw, y + (RH - 146304) / 2, kt, 'F3F5F8', INK, 'cek_navy', sz=700, h=146304, b=False)[0]
                            y += RH
                return o
            out.append((judul, isi, catatan))
        return out

    def panel_ga(s, QX, QY, QW, QH, kolom=1):
        # 30 Okt revisi pemilik: kartu gunung api untuk publik (status, radius, sektor, ancaman, kawasan, imbauan); status PVMBG sebagai pil;
        # legenda warna pil di kotak KETERANGAN bawah panel (sama dengan keterangan kiri); sisa ruang dibagi rata jadi jarak di dalam kartu.
        GA = s.GA; GW, GT = '9A3412', 'FBE7DC'
        gs = [g for g in GA['gunung'] if g['level'] in ('Awas', 'Siaga')]
        o = s.kotak(QX, QY, QW, QH, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.kepala(QX, QY, QW, GW, GT, 'gunung_putih', 'Gunung api', len(gs), h=365760)
        IX, IW = QX + 128016, QW - 256032
        st = f"Status PVMBG {GA['jam'].replace(' pukul', ',')}"; pw = 300000 + len(st) * 43000
        LING = kolom > 1 and getattr(s, 'GA_GAYA', 'mistar') in ('lingkaran', 'teks')
        # 2 Nov pemilik: gaya lingkaran = pil status PVMBG di kotak judul "Gunung api" (tidak makan satu baris), kartu level ringkas
        sx_, sy_ = IX, QY + 420624
        if not LING:   # 2 Nov pemilik: gaya lingkaran tanpa pil Status PVMBG; sumber dan jamnya sudah di kaki slide
            o += s.kotak(sx_, sy_, pw, 182880, T_NAVY, 'roundRect', adj=50000) + s.gambar(sx_ + 54864, sy_ + 36576, 109728, 109728, 'kalender_navy')
            o += s.tx(sx_ + 210312, sy_, pw - 228600, 182880, [st], sz=680, b=True, c=NAVY, an='ctr', wrap='none')
        if LING:
            TW = (IW - 3 * 54864) // 4; y = QY + 420624; hk = 301752
            for i, (k, c, t, lv, ik) in enumerate((('Awas', MERAH, T_MERAH, 'IV', 'awas_merah'), ('Siaga', ORG, T_ORG, 'III', 'gunung_oranye'),
                                                   ('Waspada', KER, T_KER, 'II', 'mata_kering'), ('Normal', SLATE, T_SLATE, 'I', 'cek_slate'))):
                x = IX + i * (TW + 54864)
                o += s.kotak(x, y, TW, hk, t, 'roundRect', adj=14000) + s.gambar(x + 91440, y + (hk - 164592) // 2, 164592, 164592, ik)
                o += s.tx(x + 320040, y, 420000, hk, [str(GA['level'].get(k, 0))], sz=1300, b=True, c=c, an='ctr', wrap='none')
                nx_ = x + 320040 + len(str(GA['level'].get(k, 0))) * 109728 + 73152   # label menempel sesudah angka
                o += s.tx(nx_, y, x + TW - nx_ - 36576, hk, [[(k, c, True), (f' ({lv})', TEKS, False)]], sz=700, an='ctr', wrap='none')
        TW = (IW - 3 * 54864) // 4
        for i, (k, c, t, lv, ik) in ([] if LING else enumerate((('Awas', MERAH, T_MERAH, 'IV', 'awas_merah'), ('Siaga', ORG, T_ORG, 'III', 'gunung_oranye'),
                                               ('Waspada', KER, T_KER, 'II', 'mata_kering'), ('Normal', SLATE, T_SLATE, 'I', 'cek_slate')))):
            x = IX + i * (TW + 54864); y = QY + 685800
            o += s.kotak(x, y, TW, 384048, t, 'roundRect', adj=12000) + s.gambar(x + 91440, y + 91440, 201168, 201168, ik)
            XT = x + 91440 + 201168 + 118872   # 30 Okt: jarak ikon dan angka diperlebar
            o += s.tx(XT, y + 18288, x + TW - XT - 36576, 228600, [str(GA['level'].get(k, 0))], sz=1400, b=True, c=c, an='ctr')
            o += s.tx(XT, y + 237744, x + TW - XT - 36576, 128016, [[(k, c, True), (f' ({lv})', TEKS, False)]], sz=620, an='ctr', wrap='none')
        # kotak KETERANGAN di bawah panel, sejajar keterangan kolom kiri
        yk = QY + QH + 73152
        o += s.kotak(QX, yk, QW, 274320, 'F7F8FA', 'roundRect', adj=30000) + s.tx(QX + 128016, yk, 868680, 274320, ['KETERANGAN'], sz=680, b=True, spc=100, an='ctr')
        lx = QX + 1060704
        for c, lab in ((MERAH, 'ancaman'), (SLATE, 'kawasan dihindari'), (NAVY, 'imbauan')):
            o += s.kotak(lx, yk + 59436, 155448, 155448, c, 'ellipse') + s.tx(lx + 210312, yk, len(lab) * 50000, 274320, [lab], sz=750, an='ctr', wrap='none'); lx += 210312 + len(lab) * 50000 + 137160
        if any(s.awal_ga(g) for g in gs):   # 4 Nov pemilik: arti pil kalender di kartu gunung
            o += s.gambar(lx, yk + 50292, 173736, 173736, 'kalender_navy') + s.tx(lx + 228600, yk, 1400000, 274320, ['laporan pertama'], sz=750, an='ctr', wrap='none'); lx += 228600 + 15 * 50000
        if LING:   # 9 Nov pemilik ("definisi status: awas itu apa, siaga apa, dst", ditaruh di sisa baris Keterangan): rumusan ringkas Permen ESDM 15/2011, ikon sama dengan ubin level
            dx = lx + 91440; o += s.kotak(dx, yk + 45720, 9144, 182880, 'D1D5DB'); dx += 100584; dw = (QX + QW - 54864 - dx) // 4
            for i, (k, c, ik, arti) in enumerate((('Awas', MERAH, 'awas_merah', 'erupsi berpotensi mengancam permukiman'), ('Siaga', ORG, 'gunung_oranye', 'erupsi dapat mengancam sekitar pusat erupsi'),
                                                  ('Waspada', KER, 'mata_kering', 'aktivitas mulai naik, bahaya sekitar kawah'), ('Normal', SLATE, 'cek_slate', 'fluktuasi, tanpa peningkatan signifikan'))):
                o += s.gambar(dx + i * dw, yk + (274320 - 146304) // 2, 146304, 146304, ik) + s.tx(dx + i * dw + 182880, yk, dw - 228600, 274320, [[(f'{k}: ', c, True), (arti, TEKS, False)]], sz=620, an='ctr')
        if not gs:
            return o + s.tx(IX, QY + 1188720, IW, 274320, ['Tidak ada gunung api berstatus Siaga atau Awas.'], sz=850, c=TEKS, an='ctr')
        y0, yb, GAP = QY + (813816 if LING else 1188720), QY + QH - 91440, 73152
        def kartu(g, y, e, IX=IX, IW=IW, hmin=0):
            c, t = (MERAH, T_MERAH) if g['level'] == 'Awas' else (ORG, T_ORG)
            isi = ([(a, T_MERAH, MERAH, 'awas_merah') for a in s.ga_ancaman(g)] + [(k, T_SLATE, SLATE, 'banjir_slate') for k in s.ga_kawasan(g)]
                   + [(m, T_NAVY, NAVY, 'awas_navy') for m in s.ga_imbauan(g)])
            zona = ([('radius', g['radius'], 'radius bahaya')] if g['radius'] else []) + ([('arah', g['sektor'], 'sektor terjauh')] if g['sektor'] else [])
            yz = y + 283464 + e; yp = yz + (164592 + 54864 + e if zona else 0)
            pil, ye = s.alir(isi, IX + 73152, yp, IW - 146304, h=155448, sz=620) if isi else ('', yp - 54864)
            ch = max(ye - y + 73152 + e, hmin)
            r = s.kotak(IX, y, IW, ch, 'F7F8FA', 'roundRect', adj=max(3000, int(9000 * 1000000 / ch)))
            r += s.kotak(IX + 73152, y + 54864 + e // 2, 182880, 182880, c, 'ellipse') + s.gambar(IX + 105156, y + 86868 + e // 2, 118872, 118872, 'gunung_putih')
            r += s.tx(IX + 320040, y + 45720 + e // 2, IW - 1100000, 201168, [g['nama']], sz=950, b=True, an='ctr', wrap='none')
            # 2 Nov pemilik: pil status cukup "Siaga"/"Awas" (tanpa level) dan berikon, sama dengan kartu ringkasan di atas
            ik = 'awas_merah' if g['level'] == 'Awas' else 'gunung_oranye'; pw_ = s.pil(0, 0, g['level'], t, c, ik, sz=620, h=164592)[1]
            r += s.pil(IX + IW - 73152 - pw_, y + 64008 + e // 2, g['level'], t, c, ik, sz=620, h=164592)[0]
            zx = IX + 73152
            for ik, km, lab in zona:
                zw = 300000 + (len(f0(km)) + 4 + len(lab)) * 44000
                r += s.kotak(zx, yz, zw, 164592, 'FFFFFF', 'roundRect', ln='F2C9A8', adj=50000) + s.gambar(zx + 45720, yz + 27432, 109728, 109728, f'{ik}_oranye')
                r += s.tx(zx + 192024, yz, zw - 210000, 164592, [[(f'{f0(km)} km', c, True), (f'  {lab}', TEKS, False)]], sz=700, an='ctr', wrap='none'); zx += zw + 45720
            return r + pil, ch
        if kolom > 1 and gs:   # 2 Nov pemilik ("masih tekstual, berantakan"): kartu grafis per gunung, berdampingan setinggi panel
            k = min(kolom, len(gs)); cw = (IW - GAP * (k - 1)) // k
            mk = max(max(g.get('radius') or 0, g.get('sektor') or 0) for g in gs); s._ga_kmax = int(max(5, -(-mk // 5) * 5))   # skala bersama, kelipatan 5 km
            for i, g in enumerate(gs):
                o += s.kartu_ga(g, IX + (i % k) * (cw + GAP), y0, cw, yb - y0)
            return o
        # ukur dulu, lalu sisa ruang dibagi rata ke tiap kartu (3 jarak per kartu: atas, antara chip dan pil, bawah)
        tinggi = [kartu(g, 0, 0)[1] for g in gs]
        sisa = yb - y0 - sum(tinggi) - GAP * (len(gs) - 1)
        e = max(0, min(sisa // (3 * len(gs)), 128016))
        GAP2 = GAP + (max(0, sisa - 3 * e * len(gs)) // max(1, len(gs) - 1) if len(gs) > 1 else 0)
        y = y0
        for g in gs:
            r, ch = kartu(g, y, e); o += r; y += ch + GAP2
        return o

    # ---------------------------------------------------------- 31 Okt pemilik (alternatif): "satukan slide 3 dan 4, gausah ada pemisahan
    # antara kejadian baru dan kejadian lampau/pengkinian" -> satu slide rincian: semua karhutla kiri, bencana lainnya kanan atas,
    # gunung api ringkas kanan bawah (teks lengkap PVMBG tetap di catatan pembicara)
    def judul_gabung(s):
        J = s.judul()[1]
        if s.GA:
            lv = s.GA['level']; st = [(lv[k], k) for k in ('Awas', 'Siaga') if lv.get(k)]
            if st:
                H, P = (lambda t: (t, ORG, True)), (lambda t: (t, INK, True)); J += [P('; ')]
                for i, (n, k) in enumerate(st): J += ([P(' dan ')] if i else []) + [H(f'{n} gunung api'), P(f' berstatus {k}')]
        return J

    def s3_gabung(s):
        s.KET_UMUM = True
        Y0, YB = 1325880, 6355080
        o = s.tabel_kh(s.KH, Y0, YB - Y0)
        QX, QW = 7406640, 4236415; XL, XR = 7571232, 11478463
        GA_MIN = 1965960 if s.GA else 0   # kepala + status + 4 kotak level + 3 baris gunung
        y = Y0
        if s.LN or s.KR:
            LN = s.KR + s.LN
            lain, yy = s.lain_isi(LN, XL, XR, False); LH = 411480 + yy + 64008
            if Y0 + LH + 274320 + GA_MIN > YB: lain, yy = s.lain_isi(LN, XL, XR, True); LH = 411480 + yy + 64008
            o += s.kotak(QX, y, QW, LH, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=4000) + s.kepala(QX, y, QW, SLATE, T_SLATE, 'awas_p2', 'Bencana lainnya', len(LN), h=365760)
            o += re.sub(r'@(\d+)@(.*?)@@', lambda m: s.geser(m.group(2), y + 411480 + int(m.group(1))), lain, flags=re.S)
            y += LH + 45720
        lk = s.tx(QX + 91440, y, 868680, 182880, ['KETERANGAN'], sz=650, b=True, c=ABU, spc=100, an='ctr')
        for x0, w, ik, t in ((QX + 1005840, NAVY, 'cek_p', 'selesai'), (QX + 1783080, ORG, 'titik3_p', 'dalam penanganan')):
            lk += s.kotak(x0, y + 27432, 128016, 128016, w, 'ellipse') + s.gambar(x0 + 27432, y + 54864, 73152, 73152, ik) + s.tx(x0 + 173736, y, 1000000, 182880, [t], sz=700, c=TEKS, an='ctr')
        o += lk; y += 182880 + 73152
        if s.GA: o += s.ga_ringkas(QX, y, QW, YB - y)
        return o

    def ga_ringkas(s, QX, QY, QW, QH):
        GA = s.GA; GW, GT = '9A3412', 'FBE7DC'
        gs = [g for g in GA['gunung'] if g['level'] in ('Awas', 'Siaga')]
        o = s.kotak(QX, QY, QW, QH, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=max(3000, int(3000 * 4600000 / QH))) + s.kepala(QX, QY, QW, GW, GT, 'gunung_putih', 'Gunung api', len(gs), h=365760)
        IX, IW = QX + 128016, QW - 256032
        st = f"Status PVMBG {GA['jam'].replace(' pukul', ',')}"; pw = 300000 + len(st) * 43000
        y = QY + 420624
        o += s.kotak(IX, y, pw, 182880, T_NAVY, 'roundRect', adj=50000) + s.gambar(IX + 54864, y + 36576, 109728, 109728, 'kalender_navy')
        o += s.tx(IX + 210312, y, pw - 228600, 182880, [st], sz=680, b=True, c=NAVY, an='ctr', wrap='none')
        y += 182880 + 64008; TW = (IW - 3 * 54864) // 4; TH = 237744
        for i, (k, c, t, ik) in enumerate((('Awas', MERAH, T_MERAH, 'awas_merah'), ('Siaga', ORG, T_ORG, 'gunung_oranye'),
                                           ('Waspada', KER, T_KER, 'mata_kering'), ('Normal', SLATE, T_SLATE, 'cek_slate'))):
            x = IX + i * (TW + 54864)
            o += s.kotak(x, y, TW, TH, t, 'roundRect', adj=20000) + s.gambar(x + 64008, y + (TH - 137160) / 2, 137160, 137160, ik)
            o += s.tx(x + 237744, y, TW - 260000, TH, [[(str(GA['level'].get(k, 0)), c, True), (f'  {k}', TEKS, False)]], sz=800, an='ctr', wrap='none')
        y += TH + 73152
        if not gs:
            return o + s.tx(IX, y, IW, 228600, ['Tidak ada gunung api berstatus Siaga atau Awas.'], sz=800, c=TEKS, an='ctr')
        yb = QY + QH - 64008; RH = min((yb - y) // len(gs), 548640)
        for n, g in enumerate(gs):
            c, t = (MERAH, T_MERAH) if g['level'] == 'Awas' else (ORG, T_ORG)
            ry = y + n * RH; h1 = 228600
            dua = RH >= 420000   # ruang cukup: baris kedua berisi ancaman utama
            ty = ry + ((RH - (h1 + 182880 if dua else h1)) // 2)
            o += s.kotak(IX, ry + 18288, IW, RH - 36576, 'F7F8FA', 'roundRect', adj=12000)
            o += s.kotak(IX + 64008, ty + 22860, 182880, 182880, c, 'ellipse') + s.gambar(IX + 96012, ty + 54864, 118872, 118872, 'gunung_putih')
            o += s.tx(IX + 301752, ty, 1300000, h1, [g['nama']], sz=880, b=True, an='ctr', wrap='none')
            o += s.kotak(IX + IW - 694944, ty + 32004, 630936, 164592, t, 'roundRect', adj=50000) + s.tx(IX + IW - 694944, ty + 32004, 630936, 164592, [f"{g['level']} ({'IV' if g['level'] == 'Awas' else 'III'})"], sz=620, b=True, c=c, al='ctr', an='ctr')
            zx = IX + 1380000
            for ik, km, lab in ([('radius', g['radius'], 'radius')] if g['radius'] else []) + ([('arah', g['sektor'], 'sektor')] if g['sektor'] else []):
                zw = 230000 + (len(f0(km)) + 4 + len(lab)) * 42000
                o += s.kotak(zx, ty + 32004, zw, 164592, 'FFFFFF', 'roundRect', ln='F2C9A8', adj=50000) + s.gambar(zx + 41148, ty + 59436, 109728, 109728, f'{ik}_oranye')
                o += s.tx(zx + 173736, ty + 32004, zw - 180000, 164592, [[(lab + ' ', TEKS, False), (f'{f0(km)} km', c, True)]], sz=650, an='ctr', wrap='none'); zx += zw + 45720
            if dua:
                isi = [(a, T_MERAH, MERAH, 'awas_merah') for a in s.ga_ancaman(g)]
                if isi: o += s.alir(isi, IX + 301752, ty + h1 + 9144, IW - 301752 - 64008, h=155448, sz=600)[0]
        return o

    def judul_lamp1(s, LN, KH):
        H, P = (lambda t: (t, ORG, True)), (lambda t: (t, INK, True))
        bag = [(len(KH), 'karhutla'), (len(s.KR), 'kekeringan'), (len(LN), 'bencana lainnya')]; bag = [b for b in bag if b[0]]
        J = [P('Pengkinian kejadian: ' if getattr(s, 'TANPA_BARU', False) else 'Pengkinian kejadian sebelumnya: ')]   # rev 2 (6 Nov): kejadian baru ikut slide ini
        for i, (n, lab) in enumerate(bag):
            J += ([P(', ' if i < len(bag) - 1 else (', dan ' if len(bag) > 2 else ' dan '))] if i else []) + [H(f0(n)), P(f' {lab}')]
        return J

    # ---- gunung api untuk publik (30 Okt): pil ancaman, kawasan dihindari, dan imbauan diturunkan dari rekomendasi PVMBG
    ARAH = [('barat laut', 'BL'), ('barat daya', 'BD'), ('timur laut', 'TL'), ('tenggara', 'Tg'), ('selatan', 'S'), ('utara', 'U'), ('barat', 'B'), ('timur', 'T')]

    def singkat_arah(s, t):
        # 2 Nov pemilik: "jangan disingkat, orang ga ngerti" -> arah ditulis lengkap (S-BD, Tg tidak dipakai lagi)
        return re.sub(r'\s+', ' ', t).strip()

    def ga_ancaman(s, g):
        r = ' '.join(g['rekom']).lower(); o = []
        for pola, lab in ((r'awan\s*panas', 'Awan panas'), (r'guguran lava', 'Guguran lava'), (r'aliran lava', 'Aliran lava'), (r'batu pijar|batu \(pijar\)', 'Lontaran batu pijar'),
                          (r'lontaran material', 'Lontaran material'), (r'hujan abu', 'Hujan abu'), (r'lahar', 'Lahar'), (r'erupsi sekunder', 'Erupsi sekunder')):
            if re.search(pola, r): o.append(lab)
        return o

    def ga_kawasan(s, g):
        """Kawasan dihindari, diringkas: satu pil sektor, satu pil per awalan sungai (Sungai Boyong, Bedog, ...), radius tambahan."""
        r = ' '.join(g['rekom']); o, sek, sg = [], [], {}
        for m in re.finditer(r'sektor\s+([a-z][a-z\- ]*?)(?=\s+(?:meliputi|di|dari|Gunung)\b|[.,])', r):
            a = s.singkat_arah(m[1].strip())
            if a not in sek: sek.append(a)
        if sek: o.append('Sektor ' + (', '.join(sek[:-1]) + ' dan ' + sek[-1] if len(sek) > 1 else sek[0]))
        for m in re.finditer(r'\b(Sungai|Besuk|Kali)\s+([A-Z][a-z]+)((?:\s*,\s*(?!Sungai|Besuk|Kali|dan\b)[A-Z][a-z]+)*)', r):
            for n in [m[2]] + [x.strip() for x in m[3].split(',') if x.strip()]:
                if n not in sg.setdefault(m[1], []): sg[m[1]].append(n)
        o += [f"{k} {', '.join(v)}" for k, v in sg.items()]
        mx = g['radius'] or 0
        for m in re.finditer(r'radius\s+(\d+(?:[.,]\d+)?)\s*km dari\s+([a-z ]+?)(?:\s+di sektor\s+([a-z ]+?))?(?=\s+(?:Gunung|di|sektor)\b|[.,])', r):
            if float(m[1].replace(',', '.')) < mx:
                t = f'{m[1]} km dari {m[2].strip()}' + (f' ({s.singkat_arah(m[3].strip())})' if m[3] else '')
                if t not in o: o.append(t)
        return o

    def ga_imbauan(s, g):
        r = ' '.join(g['rekom']).lower(); o = []
        if re.search(r'pendaki|wisatawan|pengunjung', r): o.append('Larangan wisata dan pendakian')
        if 'tsunami' in r: o.append('Abaikan isu tsunami')
        if 'arahan bpbd' in r: o.append('Ikuti arahan BPBD')
        return o

    # ikon per jenis ancaman gunung api (dari pustaka ikon generator)
    IK_ANCAMAN = {'Awan panas': 'asap', 'Guguran lava': 'longsor', 'Aliran lava': 'api', 'Lontaran batu pijar': 'api', 'Lontaran material': 'awas',
                  'Hujan abu': 'asap', 'Lahar': 'banjir', 'Erupsi sekunder': 'awas'}
    def kartu_ga(s, g, X, Y, W, H):
        """Kartu gunung api grafis (2 Nov pemilik): kepala nama + pil status; diagram zona bahaya (lingkaran radius, panah sektor,
        angka km besar); ancaman sebagai ubin berikon; kawasan dihindari sebagai pil; imbauan bertanda cek. Teks PVMBG di catatan."""
        c, t = (MERAH, T_MERAH) if g['level'] == 'Awas' else (ORG, T_ORG)
        o = s.kotak(X, Y, W, H, 'F7F8FA', 'roundRect', adj=4000)
        PX, PW = X + 109728, W - 219456
        o += s.kotak(PX, Y + 91440, 237744, 237744, c, 'ellipse') + s.gambar(PX + 54864, Y + 146304, 128016, 128016, 'gunung_putih')
        o += s.tx(PX + 320040, Y + 91440, PW - 1000000, 237744, [g['nama']], sz=1100, b=True, an='ctr', wrap='none')
        ga_ = s.awal_ga(g)
        if ga_:   # 4 Nov pemilik: tiap gunung diberi pil kalender laporan pertama (artinya di keterangan bawah panel)
            o += s.pil(PX + 320040 + s.lebar_runs([(g['nama'], INK, True)], 1100) + 73152, Y + 114300, ga_, T_NAVY, NAVY, 'kalender_navy', sz=700, h=192024, b=False)[0]
        ik = 'awas_merah' if g['level'] == 'Awas' else 'gunung_oranye'; pw_ = s.pil(0, 0, g['level'], t, c, ik, sz=700, h=192024)[1]
        o += s.pil(PX + PW - pw_, Y + 114300, g['level'], t, c, ik, sz=700, h=192024)[0]
        sub = lambda y, teks: s.tx(PX, y, PW, 146304, [teks], sz=650, b=True, c=ABU, spc=80, an='ctr')
        # zona bahaya (2 Nov pemilik): skala tetap per 5 km, sama untuk semua gunung, supaya bisa dibandingkan; dua gaya untuk dipilih
        # pemilik: 'mistar' (batang jarak dari puncak) dan 'lingkaran' (cincin tiap 5 km, irisan sektor berarah, penunjuk utara)
        y = Y + 420624; o += s.garis(PX, y, PW, 'E1E5EA'); y += 64008
        o += sub(y, 'ZONA BAHAYA, JARAK DARI PUNCAK'); y += 173736
        KM = getattr(s, '_ga_kmax', None) or 15
        rad, sek = g.get('radius') or 0, g.get('sektor') or 0
        arah = next((m[1].strip() for m in re.finditer(r'sektor\s+([a-z][a-z\- ]*?)(?=\s+(?:meliputi|di|dari|gunung\w*|sejauh)\b|[.,])', ' '.join(g['rekom']).lower())), '')
        wz = s.ga_wil(g); ang_ = 18 if getattr(s, 'GA_GAYA', 'mistar') == 'lingkaran' else 52   # kolom samping diagram sempit
        baris_ = ([('radius', f0(rad), 'km ke segala arah dari puncak', s.teks_wil(wz, 'radius', ang_))] if rad else []) + \
                 ([('arah', f0(sek), f'km ke arah {arah}' if arah else 'km di sektor bahaya', s.teks_wil(wz, 'sektor', ang_))] if sek > rad else [])
        if getattr(s, 'GA_GAYA', 'mistar') == 'teks':
            # 2 Nov pemilik: "tanpa gimmick grafis, teks tapi layout dan desainnya bagus". Tiap bagian zona satu baris: badge km
            # (pekat = segala arah, muda = sektor) | arti zona tebal + desa dan kecamatan lengkap per kabupaten.
            BW = 694944; tx0 = PX + BW + 109728; tw = PW - BW - 109728
            for ikn, km, lab, wil in baris_:
                wl = s.teks_wil_penuh(wz, 'radius' if ikn == 'radius' else 'sektor')
                nbar = max(1, -(-sum(len(t) for t, _, _ in wl) // 54)) if wl else 0
                hr = max(502920, 228600 + nbar * 128016 + 54864)
                pekat = ikn == 'radius'
                o += s.kotak(PX, y, BW, hr, c if pekat else 'FBE0CC', 'roundRect', adj=14000)
                o += s.tx(PX, y + hr // 2 - 192024, BW, 265176, [[(km, 'FFFFFF' if pekat else c, True), (' km', 'FFFFFF' if pekat else c, False)]], sz=1700, al='ctr', an='ctr', wrap='none')
                o += s.gambar(PX + BW // 2 - 54864, y + hr // 2 + 91440, 109728, 109728, f"{'radius_putih' if pekat else 'arah_oranye'}")
                o += s.kotak(tx0 - 54864, y, PW - BW - 54864, hr, 'FFFFFF', 'roundRect', adj=10000)
                lab_ = lab.replace('km ', '')
                o += s.tx(tx0 + 54864, y + 45720, tw - 109728, 182880, [lab_[0].upper() + lab_[1:]], sz=900, b=True, c=INK, an='ctr', wrap='none')
                if wl:
                    o += s.gambar(tx0 + 54864, y + 250000, 100584, 100584, 'rumah_oranye')
                    o += s.tx(tx0 + 201168, y + 228600, tw - 256032, nbar * 128016, [wl], sz=700, an='t')
                y += hr + 54864
            y += 45720
        elif getattr(s, 'GA_GAYA', 'mistar') == 'lingkaran':
            D = 905256; y += 27432   # 2 Nov pemilik: diagram lebih ringkas, tetap lega; U di sudut kanan atas bidang diagram
            cx, cy = PX + D // 2 + 45720, y + D // 2; R0 = D // 2
            rr = lambda km: int(R0 * min(km, KM) / KM)
            o += s.kotak(cx - R0, cy - R0, D, D, 'FFFFFF', 'ellipse')
            for km in range(5, KM + 1, 5):   # cincin skala tiap 5 km
                r_ = rr(km); o += s.kotak(cx - r_, cy - r_, 2 * r_, 2 * r_, None, 'ellipse', ln='C9D1DB', lw=6350)
            b0 = s.bearing(arah) if sek > rad else None
            if b0 is not None:   # irisan sektor: lebar 60 derajat ke arah sektor, sampai jarak terjauh
                r_ = rr(sek); a1, a2 = int(((b0 - 30 - 90) % 360) * 60000), int(((b0 + 30 - 90) % 360) * 60000)
                o += s.irisan(cx - r_, cy - r_, 2 * r_, a1, a2, 'F6C9A7', 'F2A672')
            if rad:
                r_ = rr(rad); o += s.kotak(cx - r_, cy - r_, 2 * r_, 2 * r_, 'FBE0CC', 'ellipse', ln=c, lw=12700)
            if b0 is not None:   # panah dari puncak ke ujung sektor
                import math
                r_ = rr(sek) - 27432; o += s.panah(cx, cy, cx + r_ * math.sin(math.radians(b0)), cy - r_ * math.cos(math.radians(b0)), c)
            o += s.kotak(cx - 82296, cy - 82296, 164592, 164592, c, 'ellipse') + s.gambar(cx - 45720, cy - 45720, 91440, 91440, 'gunung_putih')
            for km in range(5, KM + 1, 5):   # label cincin berlatar putih di sumbu utara
                lt = f'{km} km' if km == KM else f'{km}'; lw_ = 91440 + len(lt) * 50292
                o += s.kotak(cx - lw_ // 2, cy - rr(km) - 50292, lw_, 100584, 'FFFFFF', 'roundRect', adj=50000)
                o += s.tx(cx - lw_ // 2, cy - rr(km) - 50292, lw_, 100584, [lt], sz=600, c=ABU, al='ctr', an='ctr', wrap='none')
            o += s.utara(cx + R0 - 91440, y - 27432)
            # 2 Nov pemilik: tiap zona = satu baris "3 km ke segala arah dari puncak" (angka lebih kecil), tepat di bawahnya daerahnya
            tx0 = PX + D + 182880; tw = PW - D - 182880
            blok = []
            for ikn, km, lab, wil in baris_:
                wl = s.teks_wil_penuh(wz, 'radius' if ikn == 'radius' else 'sektor')
                nbar = s.jumlah_baris(wl, 700, tw - 237744) if wl else 0   # diukur dengan Roboto sungguhan
                blok.append((ikn, km, lab, wl, nbar, 210312 + nbar * 118872 + 82296))
            tinggi_ = sum(h for *_, h in blok) - (82296 if blok else 0)
            ty = y + max(0, (D - tinggi_) // 2); y_awal = y
            for ikn, km, lab, wl, nbar, h in blok:
                o += s.kotak(tx0, ty + 9144, 182880, 182880, T_ORG, 'ellipse') + s.gambar(tx0 + 45720, ty + 54864, 91440, 91440, f'{ikn}_oranye')
                o += s.tx(tx0 + 237744, ty, tw - 237744, 201168, [[(f'{km} km ', c, True), (lab.replace('km ', ''), INK, False)]], sz=1000, an='ctr', wrap='none')
                if wl:
                    o += s.tx(tx0 + 237744, ty + 210312, tw - 237744, nbar * 118872, [wl], sz=700, an='t')
                ty += h
            y = max(y_awal + D, ty - 82296) + 91440
        else:
            bx, bw, bh = PX + 201168, PW - 201168 - 91440, 146304   # mistar mulai sesudah ikon puncak
            kx = lambda km: bx + int(bw * min(km, KM) / KM)
            for km in (rad, sek):   # angka radius dan sektor di atas batang
                if km: o += s.tx(kx(km) - 228600, y - 18288, 457200, 128016, [f'{f0(km)} km'], sz=700, b=True, c=c, al='ctr', wrap='none')
            y += 128016
            o += s.kotak(PX, y + bh // 2 - 91440, 182880, 182880, c, 'ellipse') + s.gambar(PX + 36576, y + bh // 2 - 54864, 109728, 109728, 'gunung_putih')
            o += s.kotak(bx, y, bw, bh, 'E6EAF0', 'roundRect', adj=50000)
            if sek > rad: o += s.kotak(bx, y, kx(sek) - bx, bh, 'F6C9A7', 'roundRect', adj=50000)
            if rad: o += s.kotak(bx, y, kx(rad) - bx, bh, c, 'roundRect', adj=50000)
            for km in range(0, KM + 1, 5):   # skala tiap 5 km: garis bantu dan angka di bawah batang
                if 0 < km < KM: o += s.garis(kx(km), y - 27432, 0, 'FFFFFF', t=12700, h=bh + 54864)
                o += s.tx(kx(km) - 228600, y + bh + 18288, 457200, 128016, [f'{km} km' if km == KM else f'{km}'], sz=650, c=ABU, al='ctr', wrap='none')
            y += bh + 201168
            for ikn, km, lab, wil in baris_:
                o += s.gambar(PX, y + 36576, 128016, 128016, f'{ikn}_oranye')
                o += s.tx(PX + 182880, y, PW - 182880, 201168, [[(f'{km} ', c, True), (lab, INK, False)]], sz=900, an='ctr', wrap='none'); y += 201168
                if wil:
                    nb_ = 1 if len(''.join(t for t, _, _ in wil)) <= 70 else 2
                    o += s.tx(PX + 182880, y, PW - 182880, 118872 * nb_, [wil], sz=700, an='t'); y += 118872 * nb_ + 45720
                else: y += 18288
            y += 45720
        # ancaman: ubin berikon dua kolom (2 Nov pemilik: desain ubin juga untuk gaya lingkaran)
        an_ = s.ga_ancaman(g)
        if an_:
            o += s.garis(PX, y, PW, 'E1E5EA'); y += 45720; o += sub(y, 'ANCAMAN'); y += 164592
            uw, uh = (PW - 54864) // 2, 210312
            for n, a in enumerate(an_):
                ux, uy = PX + (n % 2) * (uw + 54864), y + (n // 2) * (uh + 45720)
                o += s.kotak(ux, uy, uw, uh, 'FFFFFF', 'roundRect', ln='F3C7CD', adj=20000)
                o += s.kotak(ux + 45720, uy + 32004, 164592, 164592, MERAH, 'ellipse') + s.gambar(ux + 77724, uy + 64008, 100584, 100584, f"{s.IK_ANCAMAN.get(a, 'awas')}_putih")
                o += s.tx(ux + 256032, uy, uw - 283464, uh, [a], sz=750, b=True, c=MERAH, an='ctr', wrap='none')
            y += ((len(an_) + 1) // 2) * (uh + 45720) + 45720
        # kawasan dihindari: pil
        kw = s.ga_kawasan(g)
        if kw:
            o += s.garis(PX, y, PW, 'E1E5EA'); y += 45720; o += sub(y, 'KAWASAN DIHINDARI'); y += 164592
            p_, y = s.alir([(k_, T_SLATE, SLATE, 'banjir_slate') for k_ in kw], PX, y, PW, h=182880, sz=700); o += p_; y += 64008
        # imbauan: daftar bertanda cek
        im = s.ga_imbauan(g)
        if im:
            o += s.garis(PX, y, PW, 'E1E5EA'); y += 45720; o += sub(y, 'IMBAUAN'); y += 164592
            p_, y = s.alir([(m_, T_NAVY, NAVY, 'cek_navy') for m_ in im], PX, y, PW, h=182880, sz=700); o += p_   # pil bertanda cek, ringkas
        return o

    SINGKAT_ARAH = (('barat laut', 'BL'), ('barat daya', 'BD'), ('timur laut', 'TL'), ('tenggara', 'TG'), ('utara', 'U'), ('selatan', 'S'), ('barat', 'B'), ('timur', 'T'))
    def singkat_mata_angin(s, arah):   # 11 Nov: hanya pil Bahaya slide ringkasan; slide 2 tetap singkat_arah (lengkap)
        '''"selatan-barat daya" -> "S-BD", "tenggara" -> "TG", "barat laut dan tenggara" -> "BL dan TG" (11 Nov pemilik, pola mata angin 16 arah).'''
        def satu(t):
            o_ = []
            for bag in t.split('-'):
                bag = bag.strip(); k_ = next((v for k, v in s.SINGKAT_ARAH if bag == k), None)
                o_.append(k_ or bag)
            return '-'.join(o_)
        return ' dan '.join(satu(p_) for p_ in arah.split(' dan '))
    def arah_sektor(s, g):
        return next((m[1].strip() for m in re.finditer(r'sektor\s+([a-z][a-z\- ]*?)(?=\s+(?:meliputi|di|dari|gunung\w*|sejauh)\b|[.,])', ' '.join(g['rekom']).lower())), '')
    MATA_ANGIN = (('barat laut', 315), ('barat daya', 225), ('timur laut', 45), ('tenggara', 135), ('utara', 0), ('timur', 90), ('selatan', 180), ('barat', 270))
    def bearing(s, arah):
        """Arah PVMBG ("selatan-barat daya", "tenggara") ke derajat kompas (0 = utara, searah jarum jam); gabungan = rata-rata sudut."""
        t, d = (arah or '').lower(), []
        for k, v in s.MATA_ANGIN:
            if k in t: d.append(v); t = t.replace(k, ' ')
        if not d: return None
        import math
        x, y_ = sum(math.sin(math.radians(v)) for v in d), sum(math.cos(math.radians(v)) for v in d)
        return math.degrees(math.atan2(x, y_)) % 360
    def irisan(s, x, y, d, a1, a2, fill, ln):
        return (f'<p:sp><p:nvSpPr><p:cNvPr id="{s.nid()}" name="Sektor"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(d)}" cy="{int(d)}"/></a:xfrm>'
                f'<a:prstGeom prst="pie"><a:avLst><a:gd name="adj1" fmla="val {a1}"/><a:gd name="adj2" fmla="val {a2}"/></a:avLst></a:prstGeom>'
                f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="{ln}"/></a:solidFill></a:ln></p:spPr></p:sp>')
    def panah(s, x1, y1, x2, y2, c, t=15875):
        x, y = min(x1, x2), min(y1, y2); w, h = abs(x2 - x1), abs(y2 - y1)
        fl = (' flipH="1"' if x2 < x1 else '') + (' flipV="1"' if y2 < y1 else '')
        return (f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{s.nid()}" name="Panah"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm{fl}><a:off x="{int(x)}" y="{int(y)}"/>'
                f'<a:ext cx="{max(int(w), 1)}" cy="{max(int(h), 1)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="{t}"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill>'
                f'<a:tailEnd type="triangle" w="med" len="med"/></a:ln></p:spPr></p:cxnSp>')
    def utara(s, x, y):
        return s.kotak(x + 27432, y, 73152, 91440, NAVY, 'triangle') + s.tx(x - 18288, y + 91440, 164592, 118872, ['U'], sz=700, b=True, c=NAVY, al='ctr', wrap='none')

    def alir(s, isi, x0, y, W, h=182880, sz=680):
        """Pil (teks, isi, warna, ikon) berurutan, turun baris bila tidak muat; kembali (xml, y bawah)."""
        o, x = '', x0
        for t, fill, c, ik in isi:
            pw = 260000 + int(len(t) * sz * 64)
            if x > x0 and x + pw > x0 + W: x = x0; y += h + 45720
            o += s.kotak(x, y, pw, h, fill, 'roundRect', adj=50000) + s.gambar(x + 45720, y + (h - 100584) / 2, 100584, 100584, ik)
            o += s.tx(x + 182880, y, pw - 201168, h, [t], sz=sz, b=True, c=c, an='ctr', wrap='none'); x += pw + 45720
        return o, y + h

    def jumlah_baris(s, runs, sz, lebar):
        """Jumlah baris teks campuran tebal/biasa setelah dipenggal per kata, diukur dengan Roboto sungguhan (PIL)."""
        try:
            from PIL import ImageFont
            fd = os.path.join(AKAR, 'data', 'kajian-bnpb', 'skill', 'deck-bnpb', 'assets', 'fonts')
            F = {b: ImageFont.truetype(os.path.join(fd, 'Roboto-Bold.ttf' if b else 'Roboto-Regular.ttf'), sz / 100) for b in (True, False)}
        except Exception:
            return max(1, -(-sum(len(t) for t, _, _ in runs) // 50))
        kata = []   # (teks kata termasuk spasi sesudahnya, tebal)
        for t, _, b in runs:
            for m in re.finditer(r'\S+\s*|\s+', t): kata.append((m[0], b))
        n, x, W = 1, 0.0, lebar / 12700 * 0.98
        for k, b in kata:
            w = F[b].getlength(k); wt = F[b].getlength(k.rstrip())
            if x > 0 and x + wt > W: n += 1; x = 0.0
            x += w
        return n

    def teks_wil_penuh(s, wz, zona_):
        """Wilayah satu bagian zona: hanya nama kecamatan, semuanya, urut jumlah desa terdampak (2 Nov pemilik: "langsung kecamatannya
        aja, gausah ada embel2 kabupaten dan desa"). Desa dan kabupaten lengkap tetap di catatan pembicara."""
        if not wz: return None
        d = [t for t in wz['desa'] if t[5] == zona_]
        if not d: return None
        kec = {}
        for t in d: kec[t[2]] = kec.get(t[2], 0) + 1
        nama = [k for k, _ in sorted(kec.items(), key=lambda kv: -kv[1])]
        return [('Kec. ', TEKS, False), (', '.join(nama), INK, True)]

    def teks_wil(s, wz, zona_, anggaran=52):
        """Runs teks wilayah satu bagian zona: <=2 desa = nama desa; lebih = jumlah desa + kecamatan (urut jumlah desa), kabupaten
        disebut bila hanya satu; daftar kecamatan dipotong ("dan N lainnya") supaya muat 2 baris. Desa lengkap di catatan pembicara."""
        if not wz: return None
        d = [t for t in wz['desa'] if t[5] == zona_]
        if not d: return None
        kab = sorted({t[3] for t in d})
        if len(d) <= 2:
            isi = ', '.join(f'{t[1]} (Kec. {t[2]}, {t[3]})' for t in d)
            return [('Desa ', TEKS, False), (isi, INK, True)]
        kec = {}
        for t in d: kec[(t[3], t[2])] = kec.get((t[3], t[2]), 0) + 1
        urut = [k for k, _ in sorted(kec.items(), key=lambda kv: -kv[1])]
        nama, pj = [], 0
        for kb, kc in urut:
            if pj + len(kc) > anggaran and nama: break
            nama.append(kc); pj += len(kc) + 2
        sisa = len(urut) - len(nama)
        kc_t = ', '.join(nama) + (f', dan {sisa} lainnya' if sisa else '')
        return [(f'{len(d)} desa', INK, True), (f' di Kec. {kc_t}' + (f' ({kab[0]})' if len(kab) == 1 else f', {len(kab)} kabupaten'), TEKS, False)]

    def ga_wil(s, g):
        """Desa/kecamatan di dalam zona bahaya (ga_wilayah.zona), disimpan per gunung."""
        s._wil = getattr(s, '_wil', {})
        if g['nama'] in s._wil: return s._wil[g['nama']]
        try:
            import ga_wilayah
            ab = json.load(open(os.path.join(AKAR, 'public', 'banjir', 'data', 'abu_gunungapi.json'), encoding='utf-8'))['gunung']
            kunci = re.sub(r'^(Gn\.|Gunung)\s*', '', g['nama']).lower()
            pk = next((x for x in ab if x['nama'].lower() == kunci), None)
            if not pk: s._wil[g['nama']] = None; return None
            arah = next((m[1].strip() for m in re.finditer(r'sektor\s+([a-z][a-z\- ]*?)(?=\s+(?:meliputi|di|dari|gunung\w*|sejauh)\b|[.,])', ' '.join(g['rekom']).lower())), '')
            rad, sek = g.get('radius') or 0, g.get('sektor') or 0
            s._wil[g['nama']] = ga_wilayah.zona(pk['lat'], pk['lon'], rad, sek if sek > rad else 0, s.bearing(arah) if sek > rad else None)
        except Exception as e:
            print('ga_wilayah gagal', g['nama'], e); s._wil[g['nama']] = None
        return s._wil[g['nama']]

    def catatan_ga(s):
        """Teks lengkap WA PVMBG untuk catatan pembicara slide 3."""
        GA = s.GA; L = [f"Teks lengkap PVMBG, {GA['jam']}.", ', '.join(f'{k} {n}' for k, n in GA['level'].items()) + '.']
        for g in GA['gunung']:
            L += ['', f"{g['nama']} ({g['level']})", 'Visual:'] + [f'- {b}' for b in g['visual']] + ['Kegempaan:'] + [f'- {b}' for b in g['gempa']] + ['Rekomendasi:'] + [f'- {b}' for b in g['rekom']]
            wz = s.ga_wil(g) if g['level'] in ('Awas', 'Siaga') else None
            if wz and wz['desa']:   # 2 Nov: perkiraan desa di dalam zona (poligon desa repo, bukan peta KRB resmi)
                L += ['Desa di dalam zona bahaya (perkiraan dari radius dan sektor PVMBG, batas desa Kemendagri disederhanakan):']
                L += [f'- {n} (Kec. {kc}, {kb}), {f0(jm)} km dari puncak, {"radius" if zn == "radius" else "sektor"}' for _, n, kc, kb, jm, zn in wz['desa']]
        return L

    KATA_KET = r'surut|padam|penanganan|tergenang|mengungsi|bersiaga|pemantauan|dibersihkan|kembali|normal|terkendali|evakuasi'

    def keterangan(s, x):
        """Keterangan singkat dari Kondisi Mutakhir BPBD ("Api sudah berhasil dipadamkan", "Banjir sudah surut"); kalimat panjang atau
        tanpa kata status = "Dalam penanganan" / "Selesai" (30 Okt pemilik: keterangan Tapin terlalu panjang)."""
        k = (x.get('teks') or {}).get('kondisi', '') or ''
        if x.get('jenis') == 'karhutla' and 'tangani' in x:
            # 30 Okt pemilik ("ikut data website"): BPBD dan satelit bentrok -> keterangan ikut satelit, bukan kalimat BPBD
            # (Morowali Utara: BPBD "api sudah padam" untuk kejadian 2 ha, satelit 41 firespot dan sisa 46 ha di kabupaten)
            bpbd_selesai = x.get('status') == 'selesai' or bool(re.search(r'padam|dipadamkan', k, re.I) and not re.search(r'belum padam|masih', k, re.I))
            if x['tangani'] and bpbd_selesai: return 'Satelit masih mendeteksi api'
            if not x['tangani'] and not bpbd_selesai: return 'Satelit tidak mendeteksi api'
            if not x['tangani']: return 'Api sudah padam'   # 31 Okt pemilik: "api telah padam" = "api sudah berhasil dipadamkan", satu label
        # 5 Nov atasan ("kata-katanya bener-bener samain aja"): banjir selesai yang BPBD-nya menulis surut ("Air sudah mulai surut",
        # "Banjir sudah surut", "Sungai Mas air sudah surut") satu label
        if x.get('jenis') == 'banjir' and not x.get('tangani') and re.search(r'surut', k, re.I): return 'Banjir sudah surut'
        for bag in re.split(r'[,;.]\s+|\s+dan\s+|:\s*', k):
            b = re.sub(r'\s+(?:oleh\s+)?(?:BPBD|Tim)\b.*$', '', bag.strip()).strip(' .')
            if b and re.fullmatch(r'(?i)(?:dalam\s+)?penanganan', b): return 'Dalam penanganan'   # 4 Nov pemilik: Brebes "Penanganan" = Sumenep "Dalam penanganan"
            if b and len(b) <= 32 and re.search(s.KATA_KET, b, re.I): return b[0].upper() + b[1:]
        return 'Dalam penanganan' if x.get('tangani') else 'Selesai'

    def ket(s, x):
        """[pil keterangan]; kosong bila keterangannya umum dan sedang merender slide pengkinian (30 Okt: kekeringan tergencet)."""
        p_ = s.pil_ket(x)
        return [] if not getattr(s, 'KET_UMUM', True) and p_[0] in ('Dalam penanganan', 'Selesai') else [p_]

    def pil_ket(s, x):
        return (s.keterangan(x), T_ORG, ORG, 'awas_oranye') if x.get('tangani') else (s.keterangan(x), T_NAVY, NAVY, 'kalender_navy')

    # ---------------------------------------------------------- slide banjir (setelah rincian): status banjir dan rob dari sistem kita
    def judul_banjir(s):
        t = s.BJ['total']; hd = dt.date.fromisoformat(s.BJ['hari'])
        H, P = (lambda x: (x, ORG, True)), (lambda x: (x, INK, True))
        ada = [(t['awas'], 'Awas'), (t['siaga'], 'Siaga')]
        J = [P(f'Status banjir {tgl_id(hd)}: ')]
        for n, lab in ada:
            if n: J += [H(f'{n} provinsi'), P(f' {lab}, ')]
        if t['kejadian_aktif']: J += [H(f0(t['kejadian_aktif'])), P(' wilayah Siaga (prakiraan), ')]
        if t['rob']: J += [H(f0(t['rob'])), P(' titik rob Waspada+, ')]
        if len(J) == 1: J += [P('tidak ada provinsi Siaga atau Awas, ')]
        J[-1] = (J[-1][0].rstrip(', '), J[-1][1], True)
        return J

    def s_banjir(s):
        B, o = s.BJ, ''
        ST = {3: ('Awas', MERAH, T_MERAH, 'banjir_merah'), 2: ('Siaga', ORG, T_ORG, 'banjir_oranye'), 1: ('Waspada', '8A6A2E', T_KER, 'banjir_kering'), 0: ('Normal', NAVY, T_NAVY, 'banjir_navy')}
        P, T = B['prov'], B['total']; jiwa = T['terpapar_jiwa'] is not None
        # Awas dan Siaga wajib masuk (aturan pemilik): baris sisanya diringkas bila lebih dari 12
        wajib = sum(p['status'] >= 2 for p in P); baris = P if len(P) <= max(12, wajib) else P[:max(11, wajib)] + [None]
        y0, yb = 2057400, 6260000; rp = min((yb - y0) // len(baris), 380000)
        LH_ = len(baris) * rp + y0 + 91440 - 1325880   # panel setinggi isinya
        o += s.kotak(548640, 1325880, 6720840, LH_, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2000) + s.kepala(548640, 1325880, 6720840, '2F6FB5', 'DCE7F5', 'banjir_putih', 'Status banjir per provinsi', len(P))
        kol = [('PROVINSI', 676656, 1700000, 'l'), ('STATUS', 2400000, 1000000, 'ctr'), ('HUJAN 3 HARI TERBESAR', 3450000, 1700000, 'ctr'), ('WILAYAH SIAGA', 5200000, 800000, 'ctr'),
               ('TITIK ROB', 5950000, 600000, 'ctr')] + ([('TERPAPAR', 6550000, 700000, 'ctr')] if jiwa else [])
        for t, x, w, al in kol: o += s.tx(x, 1856232, w, 164592, [t], sz=650, b=True, c=ABU, al=al)
        o += s.garis(676656, 2039112, 6464808, INK)
        hm = max([p['hujan3_mm'] or 0 for p in P] + [1])
        for n, p in enumerate(baris):
            y = y0 + n * rp
            if n: o += s.garis(676656, y, 6464808, 'EEF0F3')
            if p is None:
                sisa = P[len(baris) - 1:]
                o += s.tx(676656, y, 3000000, rp, [f'{len(sisa)} provinsi lainnya'], sz=720, c=TEKS, an='ctr', wrap='none'); continue
            nm, w, tint, ik = ST[p['status']]
            o += s.tx(676656, y, 1700000, rp, [p['nama']], sz=880, b=True, an='ctr', wrap='none')
            ph = int(min(200000, rp * .62)); _, pw = s.pil(0, 0, nm, tint, w, ik, sz=720, h=ph)
            o += s.pil(2900000 - pw / 2, y + (rp - ph) / 2, nm, tint, w, ik, sz=720, h=ph)[0]
            if p['hujan3_mm'] is not None:
                bw = 1100000 * p['hujan3_mm'] / hm
                o += s.kotak(3500000, y + rp * .3, 1100000, rp * .4, 'F3F5F8') + s.kotak(3500000, y + rp * .3, max(bw, 12000), rp * .4, '2F6FB5') + s.tx(4650000, y, 520000, rp, [f"{f0(p['hujan3_mm'])} mm"], sz=760, c=TEKS, an='ctr', wrap='none')
            o += s.tx(5200000, y, 800000, rp, ['–' if p['kejadian_aktif'] is None else f0(p['kejadian_aktif'])], sz=880, b=bool(p['kejadian_aktif']), c=NAVY if p['kejadian_aktif'] else ABU, al='ctr', an='ctr')
            o += s.tx(5950000, y, 600000, rp, ['–' if p['rob'] is None else f0(p['rob'])], sz=880, b=bool(p['rob']), c=NAVY if p['rob'] else ABU, al='ctr', an='ctr')
            if jiwa: o += s.tx(6550000, y, 700000, rp, [f0(p['terpapar_jiwa']) if p['terpapar_jiwa'] is not None else '–'], sz=800, c=TEKS, al='ctr', an='ctr', wrap='none')
        QX, QW = 7406640, 4236415; kw = (QW - 91440) // 2
        o += s.kotak(QX, 1325880, QW, 2377440, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.tx(QX + 164592, 1417320, QW - 329184, 182880, ['RINGKAS PROVINSI'], sz=750, b=True, c=NAVY, spc=100)
        n_tot = T['awas'] + T['siaga'] + T['waspada']; bw = QW - 329184; x = QX + 164592
        for n, k in ((T['awas'], 3), (T['siaga'], 2), (T['waspada'], 1)):
            if n:
                ww = bw * n / n_tot; o += s.kotak(x, 1645920, ww, 201168, ST[k][1]) + s.tx(x, 1645920, ww, 201168, [str(n)], sz=750, b=True, c='FFFFFF', al='ctr', an='ctr'); x += ww
        kar = [('banjir_merah', T_MERAH, f0(T['awas']), 'provinsi Awas', MERAH), ('banjir_oranye', T_ORG, f0(T['siaga']), 'provinsi Siaga', ORG),
               ('banjir_navy', T_NAVY, '–' if T['kejadian_aktif'] is None else f0(T['kejadian_aktif']), 'wilayah Siaga (prakiraan)', NAVY), ('banjir_slate', T_SLATE, '–' if T['rob'] is None else f0(T['rob']), 'titik rob Waspada atau lebih', SLATE)]
        for i, (ik, tint, v, lab, w) in enumerate(kar): o += s.kartu(QX + 164592 + (i % 2) * (kw - 80000 + 45720), 1965960 + (i // 2) * 594360, ik, tint, v, lab, w, w=kw - 80000)
        o += s.tx(QX + 164592, 3200400, QW - 329184, 560000, [f'Hari data {tgl_id(dt.date.fromisoformat(B["hari"]))}'
                                                            + (f', cut-off {s.jam.replace(":", ".")} WIB' if s.jam else '') + '.'], sz=720, c=TEKS)
        if B.get('rob_depan'):
            RD = B['rob_depan'][:6]
            o += s.kotak(QX, 3794760, QW, 160000 + 320000 + 228600 * len(RD), 'FFFFFF', 'roundRect', ln='BFC5CC', adj=4000)
            o += s.tx(QX + 164592, 3886200, QW - 329184, 182880, ['ROB 1 SAMPAI 3 HARI KE DEPAN'], sz=750, b=True, c=NAVY, spc=100)
            for i, r in enumerate(RD):
                y = 4160520 + i * 228600; nm, w, tint, ik = ST[r['lv']]; d = dt.date.fromisoformat(r['hari'])
                o += s.tx(QX + 164592, y, 2300000, 182880, [r['kec']], sz=760, an='ctr', wrap='none') + s.pil(QX + 2750000, y + 9144, nm, tint, w, ik, sz=700, h=164592)[0]
                o += s.tx(QX + 3500000, y, 570000, 182880, [f'{d.day} {BULAN[d.month - 1][:3]}'], sz=760, c=TEKS, al='r', an='ctr', wrap='none')
        o += s.tx(QX, 6080760, QW, 274320, [f'Sumber: Open-Meteo, GloFAS, InaRISK, BMKG, olahan Centurisk97, data {tgl_id(dt.date.fromisoformat(B["hari"]))}'], sz=650, c=ABU, an='ctr')
        return o

    # ---------------------------------------------------------- rakit
    SAMPUL_BARU = True   # 2 Nov pemilik dan atasan: sampul dan penutup format terbaru = paparan Papua Selatan 311026 (deck.py)
    def sampul_baru(s, F, periode, penutup):
        """Ganti slide 1 dan 4 templat 221026 dengan sampul/penutup paparan Papua Selatan 311026 (generator/sampul/, hasil deck.py:
        kiri putih, foto kanan, "Dipresentasikan oleh", tanggal pil navy, kaki (c) 2026 + Ketangguhan Bangsa; penutup kartu Call Center 117).
        Hanya judul, subjudul, dan tanggal yang diganti; teks penutup umum."""
        SP = os.path.join(DI, 'sampul')
        def tx_sp(teks): return f'<a:t>{escape(teks)}</a:t>'
        for no, nama in ((1, 'sampul'), (4, 'penutup')):
            x = open(os.path.join(SP, f'{nama}.xml'), encoding='utf-8').read()
            if nama == 'sampul':
                jd = re.search(r'<p:sp>(?:(?!</p:sp>).)*?<a:t>Pengendalian</a:t>.*?</p:sp>', x, re.S)[0]
                par = re.findall(r'<a:p>.*?</a:p>', jd, re.S)
                jd2 = jd.replace(''.join(par), par[0].replace(tx_sp('Pengendalian'), tx_sp('Laporan Kejadian')) + par[0].replace(tx_sp('Pengendalian'), tx_sp('Bencana Harian')))
                x = x.replace(jd, jd2)
                sb = re.search(r'<p:sp>(?:(?!</p:sp>).)*?<a:t>Kabupaten Merauke dan </a:t>.*?</p:sp>', x, re.S)[0]
                r = re.findall(r'<a:r>.*?</a:r>', sb, re.S)
                x = x.replace(sb, sb.replace(''.join(r), r[0].replace(tx_sp('Kabupaten Merauke dan '), tx_sp(periode))))
                assert x.count('Jakarta, 31 Oktober 2026') == 1; x = x.replace('Jakarta, 31 Oktober 2026', f'Jakarta, {tgl_id(s.tanggal)}')
                # 2 Nov pemilik ("whitespace di atas judul terlalu banyak"): kotak judul templat untuk 3 baris (rata bawah); judul 2 baris
                # = blok judul s.d. pil tanggal naik satu baris judul (44 pt x 95%)
                naik = 530860 * (3 - 2)
                x = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda m: f'<a:off x="{m[1]}" y="{int(m[2]) - naik}"/>' if 1700000 <= int(m[2]) <= 5400000 else m[0], x)
            # 2 Nov pemilik: logo BNPB tanpa lingkaran putih (PNG-nya sudah transparan)
            x = re.sub(r'<p:sp>(?:(?!</p:sp>).)*?<a:off x="548640" y="457200"/>(?:(?!</p:sp>).)*?prst="ellipse".*?</p:sp>', '', x, count=1, flags=re.S)
            x = x.replace('<a:off x="788126" y="628193"/><a:ext cx="526869" cy="663854"/>', '<a:off x="548640" y="457200"/><a:ext cx="731520" cy="921717"/>')   # logo sejajar tepi teks, sebesar contoh atasan
            rel = open(os.path.join(SP, f'{nama}.xml.rels'), encoding='utf-8').read()
            for m in sorted(set(re.findall(r'\.\./media/([^"]+)', rel))):
                F[f'ppt/media/sp-{m}'] = open(os.path.join(SP, 'media', m), 'rb').read()
            rel = rel.replace('../media/', '../media/sp-')
            lama = F[f'ppt/slides/_rels/slide{no}.xml.rels'].decode()
            notes = re.findall(r'<Relationship [^>]*/notesSlide"[^>]*/>', lama)   # notesSlide tetap tersambung (PowerPoint minta perbaiki berkas bila putus)
            notes = [re.sub(r'Id="[^"]+"', f'Id="rIdNt{no}"', n) for n in notes]
            F[f'ppt/slides/_rels/slide{no}.xml.rels'] = rel.replace('</Relationships>', ''.join(notes) + '</Relationships>').encode()
            F[f'ppt/slides/slide{no}.xml'] = x.encode()
        if not any(re.search(rb'Extension="png"', F['[Content_Types].xml'], re.I) for _ in [0]):
            F['[Content_Types].xml'] = F['[Content_Types].xml'].replace(b'<Default ', b'<Default Extension="png" ContentType="image/png"/><Default ', 1)

    def judul_xml(s, judul, szj):
        """Judul slide isi. KRIS_ISI (6 Nov pemilik, versi 3: "tiap slide pastikan ada logo kris dan bnpb"): logo KRIS resmi di kiri logo
        BNPB, tinggi 0,35 inci sejajar tengah logo; kotak judul berhenti sebelum KRIS supaya tidak bertumpuk."""
        W = 10454335
        o = ''
        if getattr(s, 'KRIS_ISI', False):
            src = next((p for p in (os.path.join(os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb')), 'assets', 'logo-bersama', 'kris-logo.png'), os.path.join(DI, 'sampul', 'media', 'kris-logo.png')) if os.path.exists(p)), None)   # 10 Nov: skill Windows hanya punya kris.png; salinan repo identik
            if not src: raise RuntimeError('logo KRIS (assets/logo-bersama/kris.png di skill ppt-konsultan) tidak ditemukan; setel DECK_BNPB')
            dst = os.path.join(s.ke, 'ik', 'kris.png')   # media wajib di folder kerja (nama bagian zip relatif s.ke; skill di drive lain)
            if not os.path.exists(dst): os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(src, dst)
            s.I['kris'] = dst; kh = 320040; kw_ = int(kh * 1690 / 393); kx = 11094415 - 137160 - kw_
            o = s.gambar(kx, 320040 + (693000 - kh) // 2, kw_, kh, 'kris'); W = kx - 91440 - 548640
            szj = min(szj, 2000)   # judul gunung api 22 pt jadi dua baris di kotak yang menyempit; 20 pt (sama dengan slide ringkasan) tetap satu baris
        return s.tx(548640, 292608, W, 747864, [[(t, c, True) for t, c, _ in judul]], sz=szj, an='ctr') + o

    def bangun(s, templat, keluar):
        zi = zipfile.ZipFile(templat); F = {n: zi.read(n) for n in zi.namelist()}
        GEO = r'<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>'
        J2, J3 = s.judul()
        if s.LAMPIRAN: J3 = s.judul_gabung() if s.GABUNG else s.judul_baru()
        f3 = s.s3_gabung if s.GABUNG else s.s3_baru if s.LAMPIRAN else s.s3
        for i, judul, fn, szj in ((2, J2, s.s2, 2000), (3, J3, f3, 2200)):   # judul dua baris: slide 2 lebih panjang, huruf sedikit lebih kecil
            s.N[0] = 300; s.MED.clear()
            sk = F[f'ppt/slides/slide{i}.xml'].decode(); a = sk.index('</p:grpSpPr>') + len('</p:grpSpPr>'); b = sk.index('</p:spTree>')
            simpan = []
            for blk in re.findall(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>|<p:cxnSp>.*?</p:cxnSp>', sk[a:b], re.S):
                g = re.search(GEO, blk); g = tuple(map(int, g.groups())) if g else None
                if blk.startswith('<p:pic>') and 'r:embed="rId1"' in blk:
                    if s.SIAGA:   # 2 Nov pemilik: logo kanan atas sebesar paparan Kepala 011126, rata tepi kanan isi
                        blk = re.sub(GEO, '<a:off x="11094415" y="320040"/><a:ext cx="548640" cy="693000"/>', blk, count=1)
                    simpan.append(blk); continue
                if g and ((g[3] == 0 and g[1] in (1207008, 6446520)) or g[1] == 6510528): simpan.append(blk)
            if i == 3: dekor3 = (sk[:a], sk[b:], simpan)
            body = fn()
            jd = s.judul_xml(judul, szj)   # 3 Nov atasan: judul rata tengah, sejajar tengah logo (gerbang D-50)
            F[f'ppt/slides/slide{i}.xml'] = (sk[:a] + ''.join(simpan) + jd + body + sk[b:]).encode()
            rel = F[f'ppt/slides/_rels/slide{i}.xml.rels'].decode()
            tetap = ''.join(r for r in re.findall(r'<Relationship [^>]*/>', rel) if 'Id="rId1"' in r or '/image"' not in r)
            nama = lambda p: 'h-' + os.path.relpath(p, s.ke).replace(os.sep, '-').replace('/', '-')   # Windows: os.sep '\\' bikin nama bagian zip rusak (31 Okt)
            F[f'ppt/slides/_rels/slide{i}.xml.rels'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + tetap
                + ''.join(f'<Relationship Id="{r}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{nama(p)}"/>' for p, r in s.MED.items()) + '</Relationships>').encode()
            for p in s.MED: F[f'ppt/media/{nama(p)}'] = open(p, 'rb').read()
        def klon(no, judul, fn, hal, sebelum_penutup, sldid, szj=2200, catatan=None):
            # klon slide 3 (kerangka sama: logo, garis, nomor halaman), isi diganti; disisipkan sebelum penutup atau sesudahnya (lampiran)
            s.N[0] = 300; s.MED.clear(); body = fn(); awal, akhir, dekor = dekor3
            tetap = [x.replace('<a:t>3</a:t>', f'<a:t>{hal}</a:t>') for x in dekor]
            jd = s.judul_xml(judul, szj)   # 3 Nov atasan: judul rata tengah, sejajar tengah logo (gerbang D-50)
            F[f'ppt/slides/slide{no}.xml'] = (awal + ''.join(tetap) + jd + body + akhir).encode()
            rel = F['ppt/slides/_rels/slide3.xml.rels'].decode()
            # 29 Okt: catatan slide 3 tidak ikut disalin; dua slide berbagi satu notesSlide = PowerPoint minta perbaiki berkas
            keep = ''.join(r for r in re.findall(r'<Relationship [^>]*/>', rel) if ('Id="rId1"' in r or '/image"' not in r) and '/notesSlide"' not in r)
            nama = lambda p: 'h-' + os.path.relpath(p, s.ke).replace(os.sep, '-').replace('/', '-')   # Windows: os.sep '\\' bikin nama bagian zip rusak (31 Okt)
            if catatan:   # 30 Okt: catatan pembicara sendiri (bukan berbagi notesSlide3, itu membuat PowerPoint minta perbaiki berkas)
                nx = re.sub(r'<p:extLst>.*?</p:extLst>', '', F['ppt/notesSlides/notesSlide3.xml'].decode(), flags=re.S).replace('<a:t>3</a:t>', f'<a:t>{hal}</a:t>')
                par = ''.join(f'<a:p><a:r><a:rPr lang="id-ID" dirty="0"/><a:t>{escape(b)}</a:t></a:r></a:p>' if b else '<a:p><a:endParaRPr lang="id-ID"/></a:p>' for b in catatan)
                nx = re.sub(r'(<p:ph type="body" idx="1"/>.*?<a:lstStyle/>).*?(</p:txBody>)', lambda m: m[1] + par + m[2], nx, count=1, flags=re.S)
                F[f'ppt/notesSlides/notesSlide{no}.xml'] = nx.encode()
                F[f'ppt/notesSlides/_rels/notesSlide{no}.xml.rels'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/>'
                    f'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide{no}.xml"/></Relationships>').encode()
                keep += f'<Relationship Id="rIdN{no}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide{no}.xml"/>'
                F['[Content_Types].xml'] = F['[Content_Types].xml'].replace(b'</Types>', f'<Override PartName="/ppt/notesSlides/notesSlide{no}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/></Types>'.encode(), 1)
            F[f'ppt/slides/_rels/slide{no}.xml.rels'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + keep
                + ''.join(f'<Relationship Id="{r}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{nama(p)}"/>' for p, r in s.MED.items()) + '</Relationships>').encode()
            for p in s.MED: F[f'ppt/media/{nama(p)}'] = open(p, 'rb').read()
            F['[Content_Types].xml'] = F['[Content_Types].xml'].replace(b'<Override PartName="/ppt/slides/slide4.xml"', f'<Override PartName="/ppt/slides/slide{no}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slides/slide4.xml"'.encode(), 1)
            rid = f'rId{90 + no}'
            F['ppt/_rels/presentation.xml.rels'] = F['ppt/_rels/presentation.xml.rels'].replace(b'</Relationships>', f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{no}.xml"/></Relationships>'.encode())
            baru_ = f'<p:sldId id="{sldid}" r:id="{rid}"/>'.encode()
            F['ppt/presentation.xml'] = (F['ppt/presentation.xml'].replace(b'<p:sldId id="259" r:id="rId5"/>', baru_ + b'<p:sldId id="259" r:id="rId5"/>', 1) if sebelum_penutup
                                         else F['ppt/presentation.xml'].replace(b'</p:sldIdLst>', baru_ + b'</p:sldIdLst>', 1))
        LAMP, hal = list(getattr(s, 'LAMP_TAMBAH', None) or []), 4   # 5 Nov: lampiran dari pemanggil (perubahan status selesai)
        if s.LAMPIRAN and not s.GABUNG:   # 30 Okt revisi pemilik: kejadian sebelumnya bukan lampiran, tepat sesudah slide kejadian baru (slide 4)
            # 6 Nov pemilik (rev 2: "slide 3 dihapus, banjir sama angin kencang yang ada di slide 3 gabung ke slide 4"): TANPA_BARU = kejadian baru
            # ikut pengkinian; pemanggil membuang halaman 3 lewat susun lewat_deck
            kunci = set() if getattr(s, 'TANPA_BARU', False) else {(b['jenis'], b['prov'], b['lokasi']) for b in s.baru()}
            LN_p = [x for x in s.LN if (x['jenis'], x['prov'], x['lokasi']) not in kunci]
            KH_p = [x for x in s.KH if not (x['lokasi'] and ('karhutla', x['prov'], x['lokasi']) in kunci)]   # karhutla kab baru sudah di slide 3
            if KH_p or s.KR or LN_p:
                klon(6, s.judul_lamp1(LN_p, KH_p), lambda: s.s3(LN_p, KH_p), hal, True, 261); hal += 1
        if s.SIAGA and s.GA:   # 2 Nov: slide status siaga (gunung api) sesudah pengkinian; teks lengkap PVMBG di catatan pembicara
            # 2 Nov pemilik: dua gaya zona bahaya untuk dibandingkan (mistar dan lingkaran); GA_GAYAS = gaya yang dibangun, berurutan
            for n_, gy_ in enumerate(getattr(s, 'GA_GAYAS', None) or ['lingkaran']):   # 2 Nov pemilik memilih desain lingkaran
                klon(7 + n_, s.judul_siaga(), (lambda gy_=gy_: (setattr(s, 'GA_GAYA', gy_), s.s_siaga())[1]), hal, True, 262 + n_, catatan=s.catatan_ga()); hal += 1
        for n_, (jd_, fn_) in enumerate(getattr(s, 'HAL_TAMBAH', None) or []):   # 10 Nov pemilik: slide Hidrometeorologi, Geologi dan Vulkanologi, Prediksi (harian_lanjut.py)
            klon(40 + n_, jd_, fn_, hal, True, 340 + n_, szj=2000); hal += 1
        if getattr(s, 'ALT_RINCI', False):
            # 6 Nov pemilik ("coba 2-2nya, kasih beberapa alternatif slide"): halaman isi tambahan untuk dipilih pemanggil lewat susun:
            # rincian kab/kota menurun (sesudah ringkasan), versi lampirannya, dan ringkasan alternatif 3 (kab/kota menurun di slide 1)
            klon(30, s.judul_rinci(), s.s_rinci, hal, True, 290, szj=2000); hal += 1
            klon(31, [('Lampiran: ', INK, True), ('Rincian Lokasi Kejadian Bencana', ORG, True)], s.s_rinci, hal, True, 291, szj=2000); hal += 1   # gaya judul lampiran selesai (5 Nov)
            def _menurun():
                s.MENURUN = True
                try: return s.s2()
                finally: s.MENURUN = False
            klon(32, s.judul()[0], _menurun, hal, True, 292, szj=2000); hal += 1
            # 6 Nov sore (Bang Ghozi: "jangan +10", "gapapa kebawah"): ringkasan dengan semua kab/kota karhutla, alternatif 4 dan 5
            klon(33, s.judul()[0], lambda: s.s2_alt(4), hal, True, 293, szj=2000); hal += 1
            klon(34, s.judul()[0], lambda: s.s2_alt(5), hal, True, 294, szj=2000); hal += 1
        if s.BJ:   # slide status banjir; sebelum penutup
            klon(5, s.judul_banjir(), s.s_banjir, hal, True, 260); hal += 1
        hal0 = hal
        if s.LAMPIRAN and s.GA and not s.SIAGA and 'ppt/notesSlides/notesSlide3.xml' in F:
            par = ''.join(f'<a:p><a:r><a:rPr lang="id-ID" dirty="0"/><a:t>{escape(b)}</a:t></a:r></a:p>' if b else '<a:p><a:endParaRPr lang="id-ID"/></a:p>' for b in s.catatan_ga())
            F['ppt/notesSlides/notesSlide3.xml'] = re.sub(r'(<p:ph type="body" idx="1"/>.*?<a:lstStyle/>).*?(</p:txBody>)', lambda m: m[1] + par + m[2], F['ppt/notesSlides/notesSlide3.xml'].decode(), count=1, flags=re.S).encode()
        for n, (judul, fn, cat) in enumerate(LAMP):
            klon(20 + n, judul, fn, hal0 + n, False, 280 + n, catatan=cat)   # 5 Nov: nomor 6/7 sudah dipakai pengkinian dan gunung api
        mulai = dt.datetime.strptime(s.wa['mulai'], '%Y-%m-%d %H.%M'); sampai = dt.datetime.strptime(s.wa['sampai'], '%Y-%m-%d %H.%M')
        jam = lambda t: f'{t.day} {BULAN[t.month - 1][:3]} {t.year}, {t:%H.%M}'
        GANTI = {1: [('21 Okt 2026, 07.00  –  22 Okt 2026, 07.00 WIB', f'{jam(mulai)}  –  {jam(sampai)} WIB'), ('Kamis, 22 Oktober 2026', f'{HARI_ID[s.tanggal.weekday()]}, {tgl_id(s.tanggal)}')],
                 4: [('Laporan Kejadian Bencana Harian, 21–22 Oktober 2026', f'Laporan Kejadian Bencana Harian, {rentang(mulai.date(), sampai.date())}')]}
        for i, gs in GANTI.items():
            x = F[f'ppt/slides/slide{i}.xml'].decode()
            for a_, b_ in gs: assert x.count(a_) == 1, f'templat bukan deck 221026: {a_!r}'; x = x.replace(a_, b_)
            F[f'ppt/slides/slide{i}.xml'] = x.encode()
        if s.SAMPUL_BARU: s.sampul_baru(F, f'Periode {jam(mulai)} sampai {jam(sampai)} WIB', f'Laporan Kejadian Bencana Harian, {rentang(mulai.date(), sampai.date())}')
        x = F['ppt/slides/slide4.xml'].decode(); blk = [b for b in re.findall(r'<p:sp>.*?</p:sp>', x, re.S) if 'Lampiran (data rinci)' in b]
        if blk and LAMP:   # 30 Okt: lampiran ada lagi; penunjuk halamannya diisi halaman lampiran pertama
            F['ppt/slides/slide4.xml'] = x.replace(blk[0], re.sub(r'mulai halaman \d+', f'mulai halaman {hal0}', blk[0])).encode()
        elif blk: F['ppt/slides/slide4.xml'] = x.replace(blk[0], '').encode()   # deck tanpa lampiran (pemilik 23 Okt)
        for i in sorted(int(m) for n in F for m in re.findall(r'^ppt/slides/slide(\d+)\.xml$', n)):
            t = re.sub(r'<[^>]+>', '', F[f'ppt/slides/slide{i}.xml'].decode())
            assert '·' not in t and '—' not in t, f'titik tengah / em dash di slide {i}'
        # 4 Nov pemilik (diulang sesudah 3 Nov): pengkinian dan gunung api wajib memuat pil laporan pertama tiap kejadian/gunung yang
        # tanggalnya diketahui, plus legendanya. Gerbang: build berhenti, bukan diam-diam hilang di salah satu tata letak.
        teks_ = lambda n: re.sub(r'<[^>]+>', '', F[f'ppt/slides/slide{n}.xml'].decode()) if f'ppt/slides/slide{n}.xml' in F else None
        kurang = []
        if s.LAMPIRAN and not s.GABUNG and teks_(6) is not None:
            for x in s.KR + LN_p:
                ta = s.teks_awal(x).replace('Laporan pertama ', '')
                if ta and ta not in teks_(6): kurang.append(f"pengkinian: {x['jenis']} {x['lokasi'] or NAMA[x['prov']]} tanpa pil {ta}")
            if any(s.teks_awal(x) for x in s.KR + LN_p) and 'laporan pertama' not in teks_(6): kurang.append('pengkinian: legenda "laporan pertama" tidak ada')
        if s.SIAGA and s.GA and teks_(7) is not None:
            gs_ = [g for g in s.GA['gunung'] if g['level'] in ('Awas', 'Siaga')]
            for g in gs_:
                if s.awal_ga(g) and s.awal_ga(g) not in teks_(7): kurang.append(f"gunung api: {g['nama']} tanpa pil {s.awal_ga(g)}")
            if any(s.awal_ga(g) for g in gs_) and 'laporan pertama' not in teks_(7): kurang.append('gunung api: legenda "laporan pertama" tidak ada')
            if not any(s.awal_ga(g) for g in gs_): print('PERINGATAN gunung api: arsip teks laphar (data/raw/laphar/teks) tidak ada, pil laporan pertama tidak dipasang')
        if kurang: raise RuntimeError('gerbang laporan pertama gagal:\n  ' + '\n  '.join(kurang))
        dipakai = set()
        for n, v in F.items():
            if n.endswith('.rels'):
                dipakai |= {t[1:] if t.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(posixpath.dirname(n)), t)) for t in re.findall(r'Target="([^"]+)"', v.decode())}
        for n in [n for n in F if n.startswith('ppt/media/') and n not in dipakai]: del F[n]
        ct = F['[Content_Types].xml'].decode()
        F['[Content_Types].xml'] = re.sub(r'<Override PartName="/([^"]+)"[^>]*/>', lambda m: m.group(0) if m.group(1) in F else '', ct).encode()
        zo = zipfile.ZipFile(keluar, 'w', zipfile.ZIP_DEFLATED)
        for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
        zo.close()


def utama():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--tanggal', required=True, help='hari laporan (YYYY-MM-DD), = tanggal akhir periode WA 07.00')
    ap.add_argument('--koordalops', required=True); ap.add_argument('--bmkg', required=True)
    ap.add_argument('--jam', default='12:00', help="cut-off WIB hari laporan (bawaan 12:00); 'lengkap' = hari kemarin penuh dari berkas website")
    ap.add_argument('--out', default='.'); ap.add_argument('--templat', default=os.path.join(DI, 'cache', 'templat', 'harian-221026.pptx'))
    g = ap.parse_args()
    tanggal = dt.date.fromisoformat(g.tanggal); jam = None if g.jam == 'lengkap' else g.jam
    if not os.path.exists(g.templat):
        sys.exit(f'templat tidak ada: {g.templat} (salin "Laporan Kejadian Bencana Harian 221026.pptx" pemilik ke sana)')
    wa = wa_harian.koordalops(open(g.koordalops).read()); w = wa_harian.bmkg(open(g.bmkg).read())
    if wa['sampai'][:10] != g.tanggal:
        sys.exit(f"WA Koordalops s.d. {wa['sampai']} bukan hari laporan {g.tanggal}")
    ke = os.path.abspath(os.path.join(g.out, f'kerja-{tanggal:%d%m%y}')); os.makedirs(ke, exist_ok=True)
    web = ambil_web(os.path.join(ke, 'web'))
    D = susun(wa, web, tanggal, jam)
    json.dump(D, open(os.path.join(ke, 'data.json'), 'w'), ensure_ascii=False, indent=1)
    if os.path.isdir(os.path.join(ke, 'tpl')): shutil.rmtree(os.path.join(ke, 'tpl'))
    zipfile.ZipFile(g.templat).extractall(os.path.join(ke, 'tpl'))
    subprocess.run(['node', os.path.join(DI, 'harian_peta.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
    if not os.path.exists(os.path.join(ke, 'ik', 'awas-merah.png')):
        subprocess.run(['node', os.path.join(DI, 'harian_ikon.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
    nama = os.path.join(os.path.abspath(g.out), f'Laporan Kejadian Bencana Harian {tanggal:%d%m%y}.pptx')
    dk = Deck(ke, D, wa, w, tanggal, jam); dk.bangun(g.templat, nama)
    # semua PPT lewat deck.py (pemilik 31 Okt 2026): sampul, penutup, pita kaki navy, palet, QA dari mesin deck BNPB
    import lewat_deck
    mulai = dt.datetime.strptime(wa['mulai'], '%Y-%m-%d %H.%M'); sampai = dt.datetime.strptime(wa['sampai'], '%Y-%m-%d %H.%M')
    jm = lambda t: f'{t.day} {BULAN[t.month - 1]} {t.year}, {t:%H.%M}'
    lewat_deck.bingkai(nama, 'harian', 'Laporan Kejadian Bencana Harian', f'Periode {jm(mulai)} sampai {jm(sampai)} WIB', tanggal)
    print('ok', nama, '| cut-off', D['cutoff'], '| hari data', D['hari'], '| kejadian', dk.N_TOT, 'karhutla', len(dk.KH), 'ditangani', len(dk.KH_T),
          'perlu perhatian', len(dk.SER), 'selesai', dk.N_SEL, '| Prioritas ditambah', D['prioritas_baru'])


if __name__ == '__main__':
    utama()
