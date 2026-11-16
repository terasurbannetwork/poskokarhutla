"""Urai logbook harian Pusdalops 2026 menjadi baris HARIAN MENTAH (sebelum digabung) -> hasil/logbook_baris_harian.json.
Fungsi urai disalin dari data/laporan-bnpb/bulanan/2026-10/logbook_okt.py (tidak diubah). Hanya angka dan wilayah disimpan."""
import docx, re, json, glob, os, collections

ARSIP = 'D:/Project/Work/BNPB/Pusat Pengendalian Operasi/LOGBOOK 2026'
AK = os.path.dirname(os.path.abspath(__file__))
KELUAR = os.path.join(AK, 'hasil', 'logbook_baris_harian.json')
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
    return re.sub(r'\s+', ' ', k).strip().rstrip('.').replace('Kota Adm. ', 'Kota ').replace('Kota Adm ', 'Kota ')


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
    t = re.sub(r'\([a-z ]+\)', ' ', t, flags=re.I)
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


def urai_berkas(f, gagal):
    d = docx.Document(f)
    out = []
    if not d.tables:
        gagal['tanpa_tabel'] += 1
        return out
    for r in d.tables[0].rows[1:]:
        c = [x.text for x in r.cells]
        if len(c) < 5:
            continue
        kepala, lok, dmp = c[1], c[2], c[3]
        m = RE_TGL.search(kepala)
        prov = re.search(r'Prov(?:insi)?\.?\s*([A-Z][A-Za-z .]+?)\s*(?:\n|$|/)', lok)
        if not m or not prov or not prov.group(1).strip():
            gagal['baris_tak_terurai'] += 1
            continue
        tgl = f'{m.group(3)}-{BULAN[m.group(2).lower()]:02d}-{int(m.group(1)):02d}'
        baris = [b.strip() for b in kepala.split('\n') if b.strip()]
        jn_teks = ' '.join(b for b in baris[1:4] if not re.match(r'(?:Pu?kl?|Pukul|Update|UPDATE)', b, re.I) and not RE_TGL.search(b))
        kab = [re.sub(r'\s+', ' ', k).strip() for k in re.findall(r'^\s*((?:Kab\.|Kabupaten|Kota)\s+[A-Za-z .\'-]+?)\s*$', lok, re.M)]
        kab = [kab_baku(k.replace('Kabupaten ', 'Kab. ')) for k in kab]
        out.append({'tgl': tgl, 'jenis': jenis_dari(jn_teks + ' ' + c[4][:200]), 'prov': prov_baku(prov.group(1)), 'kab': kab, 'dampak': dampak(dmp)})
    return out


def hari_dari(nama):
    m = RE_TGL.search(nama)
    return f'{m.group(3)}-{BULAN[m.group(2).lower()]:02d}-{int(m.group(1)):02d}' if m else None


def satu(f):
    g = collections.Counter(); h = hari_dari(os.path.basename(f))
    try:
        rows = urai_berkas(f, g)
    except Exception as ex:
        g['galat_' + type(ex).__name__] += 1; rows = []
    for e in rows:
        e['hari'] = h
    return h, rows, dict(g)


if __name__ == '__main__':
    import multiprocessing as mp
    gagal = collections.Counter(); rows = []; hari = set()
    fs = []
    for f in sorted(glob.glob(ARSIP + '/*/*.docx')):
        nama = os.path.basename(f)
        if nama.lower().startswith(('salinan', '~$')):
            continue
        if not hari_dari(nama):
            gagal['nama_tanpa_tanggal'] += 1
            continue
        fs.append(f)
    with mp.Pool(14) as p:
        for h, r, g in p.imap(satu, fs):
            hari.add(h); rows += r; gagal.update(g)
    json.dump({'sumber': 'Logbook harian Pusdalops 2026 (arsip lokal DOCX), baris mentah sebelum digabung', 'hari': sorted(hari),
               'gagal': dict(gagal), 'baris': rows}, open(KELUAR, 'w', encoding='utf8'), ensure_ascii=False)
    print(len(hari), 'hari', len(rows), 'baris', dict(gagal), min(hari), max(hari))
