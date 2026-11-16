"""Urai LOGBOOK harian Pusdalops BNPB 2026 (satu DOCX per hari, tabel kejadian) -> masukan/logbook_2026.json

Sumber: D:/Project/Work/BNPB/Pusat Pengendalian Operasi/LOGBOOK 2026/<bulan>/<DD Bulan 2026>.docx (laporan 07.00-07.00 WIB).
Tiap baris tabel = satu kejadian yang masih dipantau hari itu; kejadian yang sama ditulis ulang tiap hari dengan "Update".
Kunci kejadian = (kelompok jenis, provinsi, kab/kota, tanggal kejadian). Angka dampak = nilai TERBESAR lintas hari (logbook
menulis angka kumulatif), bukan jumlah. Nama korban, petugas, pelapor, dan nomor telepon TIDAK disimpan (hanya angka dan wilayah).
"""
import docx, re, json, glob, os, collections

ARSIP = 'D:/Project/Work/BNPB/Pusat Pengendalian Operasi/LOGBOOK 2026'
KELUAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'masukan', 'logbook_2026.json')
BULAN = {b: i + 1 for i, b in enumerate('januari februari maret april mei juni juli agustus september oktober november desember'.split())}
JENIS = [('kebakaran_tpa', r'tpa|tempat pemrosesan'), ('kebakaran_permukiman', r'kebakaran (?:rumah|permukiman|pemukiman|gedung|pasar|kapal|bangunan|ruko|toko)'),
         ('banjir_longsor', r'banjir (?:bandang )?dan (?:tanah )?longsor'), ('banjir', r'banjir'), ('longsor', r'longsor|gerakan tanah|pergerakan tanah'),
         ('karhutla', r'karhutla|kebakaran hutan|kebakaran lahan'), ('kekeringan', r'kekeringan|krisis air'),
         ('cuaca', r'cuaca ekstr|angin|puting beliung|hujan es'), ('gempa', r'gempa'), ('erupsi', r'erupsi|gunung api|awan panas'),
         ('gelombang', r'gelombang|abrasi|rob')]
RE_TGL = re.compile(r'(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})', re.I)


PROV_BAKU = {'ntt': 'Nusa Tenggara Timur', 'ntb': 'Nusa Tenggara Barat', 'diy': 'DI Yogyakarta', 'jateng': 'Jawa Tengah', 'jatim': 'Jawa Timur',
             'jabar': 'Jawa Barat', 'sumut': 'Sumatera Utara', 'sumbar': 'Sumatera Barat', 'sumsel': 'Sumatera Selatan', 'kalbar': 'Kalimantan Barat',
             'kalteng': 'Kalimantan Tengah', 'kalsel': 'Kalimantan Selatan', 'kaltim': 'Kalimantan Timur', 'sulsel': 'Sulawesi Selatan', 'sulteng': 'Sulawesi Tengah',
             'sulut': 'Sulawesi Utara', 'sultra': 'Sulawesi Tenggara', 'kep. bangka belitung': 'Kepulauan Bangka Belitung', 'bangka belitung': 'Kepulauan Bangka Belitung'}


def prov_baku(p):
    p = re.sub(r'\s+', ' ', p).strip().rstrip('.')
    return PROV_BAKU.get(p.lower(), p)


def kab_baku(k):
    k = re.sub(r'\s+', ' ', k).strip().rstrip('.').replace('Kota Adm. ', 'Kota ').replace('Kota Adm ', 'Kota ')
    return k


def bil(s):
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0


def maks(teks, pola):
    v = [bil(m) for m in re.findall(pola, teks, re.I)]
    return int(max(v)) if v else 0


def dampak(t):
    t = re.sub(r'\([a-z ]+\)', ' ', t, flags=re.I)        # "1 (satu) jiwa" -> "1  jiwa"
    t = t.replace('±', ' ').replace('+-', ' ')
    N = r'(\d[\d.,]*)'
    return {
        'md': maks(t, N + r'\s*(?:orang|jiwa)?\s*(?:MD|meninggal)'),
        'hilang': maks(t, N + r'\s*(?:orang|jiwa)?\s*hilang'),
        'luka': maks(t, N + r'\s*(?:orang|jiwa)?\s*(?:LR|LB|luka)'),
        'kk': maks(t, N + r'\s*KK(?:\s*/\s*[\d.,]+\s*jiwa)?\s*(?:berpotensi\s*)?terdampak'),
        'jiwa': maks(t, N + r'\s*jiwa\s*(?:berpotensi\s*)?terdampak'),
        'mengungsi': maks(t, N + r'\s*jiwa\s*(?:mengungsi|pengungsi)'),
        'rb': maks(t, N + r'\s*(?:unit\s*)?(?:rumah\s*)?(?:RB|rusak berat)'),
        'rs': maks(t, N + r'\s*(?:unit\s*)?(?:rumah\s*)?(?:RS|rusak sedang)'),
        'rr': maks(t, N + r'\s*(?:unit\s*)?(?:rumah\s*)?(?:RR|rusak ringan)'),
        'rumah_terdampak': maks(t, N + r'\s*(?:unit\s*)?(?:berpotensi\s*)?rumah\s*(?:berpotensi\s*)?(?:terdampak|terendam)'),
        'ha': maks(t, N + r'\s*ha\b'),
    }


def jenis_dari(s):
    s = s.lower()
    return next((j for j, p in JENIS if re.search(p, s)), 'lainnya')


def urai_berkas(f):
    d = docx.Document(f)
    out = []
    if not d.tables:
        return out
    for r in d.tables[0].rows[1:]:
        c = [x.text for x in r.cells]
        if len(c) < 5:
            continue
        kepala, lok, dmp = c[1], c[2], c[3]
        m = RE_TGL.search(kepala)
        prov = re.search(r'Prov(?:insi)?\.?\s*([A-Z][A-Za-z .]+?)\s*(?:\n|$|/)', lok)
        if not m or not prov or not prov.group(1).strip():
            continue
        tgl = f'{m.group(3)}-{BULAN[m.group(2).lower()]:02d}-{int(m.group(1)):02d}'
        # jenis = baris teks pertama setelah baris waktu
        baris = [b.strip() for b in kepala.split('\n') if b.strip()]
        jn_teks = ' '.join(b for b in baris[1:4] if not re.match(r'(?:Pu?kl?|Pukul|Update|UPDATE)', b, re.I) and not RE_TGL.search(b))
        kab = [re.sub(r'\s+', ' ', k).strip() for k in re.findall(r'^\s*((?:Kab\.|Kabupaten|Kota)\s+[A-Za-z .\'-]+?)\s*$', lok, re.M)]
        kab = [k.replace('Kabupaten ', 'Kab. ') for k in kab]
        kab = [kab_baku(k) for k in kab]
        out.append({'tgl': tgl, 'jenis': jenis_dari(jn_teks + ' ' + c[4][:200]), 'jenis_teks': jn_teks[:60], 'prov': prov_baku(prov.group(1)),
                    'kab': kab, 'dampak': dampak(dmp)})
    return out


def hari_dari(nama):
    m = RE_TGL.search(nama)
    return f'{m.group(3)}-{BULAN[m.group(2).lower()]:02d}-{int(m.group(1)):02d}' if m else None


kej = {}
hari_ada = []
for f in sorted(glob.glob(ARSIP + '/*/*.docx')):
    nama = os.path.basename(f)
    if nama.lower().startswith(('salinan', '~$')):
        continue
    hari = hari_dari(nama)
    if not hari:
        continue
    hari_ada.append(hari)
    for e in urai_berkas(f):
        k = (e['jenis'], e['prov'], ';'.join(e['kab']) or '-', e['tgl'])
        x = kej.setdefault(k, {'jenis': e['jenis'], 'jenis_teks': e['jenis_teks'], 'prov': e['prov'], 'kab': e['kab'], 'tgl': e['tgl'],
                               'pertama': hari, 'terakhir': hari, 'dampak': collections.Counter()})
        x['pertama'], x['terakhir'] = min(x['pertama'], hari), max(x['terakhir'], hari)
        for kk, v in e['dampak'].items():
            x['dampak'][kk] = max(x['dampak'][kk], v)

# gabung kejadian yang sama: jenis, provinsi, dan tanggal sama, kab beririsan (penulisan kab berbeda antarhari)
kel = collections.defaultdict(list)
for v in kej.values():
    kel[(v['jenis'], v['prov'], v['tgl'])].append(v)
gab = []
for vs in kel.values():
    sisa = list(vs)
    while sisa:
        a = sisa.pop(0)
        ka = set(a['kab'])
        i = 0
        while i < len(sisa):
            b = sisa[i]
            if ka & set(b['kab']) or not ka or not b['kab']:
                ka |= set(b['kab'])
                a['kab'] = sorted(ka)
                a['pertama'], a['terakhir'] = min(a['pertama'], b['pertama']), max(a['terakhir'], b['terakhir'])
                for kk, v in b['dampak'].items():
                    a['dampak'][kk] = max(a['dampak'][kk], v)
                sisa.pop(i)
            else:
                i += 1
        gab.append(a)
kej = {i: v for i, v in enumerate(gab)}
hasil = {'sumber': 'Logbook harian Pusdalops BNPB 2026, arsip lokal ' + ARSIP, 'hari': sorted(set(hari_ada)),
         'catatan': 'Kunci = (jenis, prov, kab, tanggal kejadian); angka = maks lintas hari; tanpa nama dan nomor telepon.',
         'kejadian': [dict(v, dampak=dict(v['dampak'])) for v in kej.values()]}
json.dump(hasil, open(KELUAR, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
okt = [v for v in kej.values() if v['tgl'].startswith('2026-10')]
print('hari', len(set(hari_ada)), 'kejadian', len(kej), 'Okt', len(okt))
print(collections.Counter(v['jenis'] for v in okt))
