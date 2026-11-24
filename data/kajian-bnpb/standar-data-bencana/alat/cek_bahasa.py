"""Pemeriksa bahasa Indonesia baku untuk naskah kajian (EYD V dan KBBI) ditambah aturan pemilik.

  py data/kajian-bnpb/standar-data-bencana/alat/cek_bahasa.py            # periksa semua naskah, gambar, infografis
  py data/kajian-bnpb/standar-data-bencana/alat/cek_bahasa.py berkas.md  # periksa berkas tertentu

GALAT harus dibetulkan sebelum DOCX dibangun (kode keluar 1). SARAN dibaca manusia: bisa benar, bisa tidak.
Daftar pustaka hanya diperiksa untuk aturan pemilik, karena judul asing dikutip apa adanya.
"""
import re
import sys
from pathlib import Path

DI = Path(__file__).resolve().parent

# kata tidak baku -> baku (KBBI VI, EYD V); kata utuh, tidak peka huruf besar
TIDAK_BAKU = {
    'analisa': 'analisis', 'resiko': 'risiko', 'praktek': 'praktik', 'sistim': 'sistem', 'aktifitas': 'aktivitas',
    'efektifitas': 'efektivitas', 'produktifitas': 'produktivitas', 'kwalitas': 'kualitas', 'kwantitas': 'kuantitas',
    'jaman': 'zaman', 'ijin': 'izin', 'nasehat': 'nasihat', 'obyek': 'objek', 'subyek': 'subjek', 'obyektif': 'objektif',
    'tehnik': 'teknik', 'tehnologi': 'teknologi', 'hutang': 'utang', 'himbauan': 'imbauan', 'himbau': 'imbau',
    'silahkan': 'silakan', 'merubah': 'mengubah', 'dirubah': 'diubah', 'sekedar': 'sekadar', 'antri': 'antre',
    'nampak': 'tampak', 'trampil': 'terampil', 'ketrampilan': 'keterampilan', 'propinsi': 'provinsi', 'karir': 'karier',
    'standarisasi': 'standardisasi', 'diagnosa': 'diagnosis', 'hipotesa': 'hipotesis', 'sintesa': 'sintesis',
    'metoda': 'metode', 'frekwensi': 'frekuensi', 'konkrit': 'konkret', 'mempengaruhi': 'memengaruhi',
    'mensosialisasikan': 'menyosialisasikan', 'menterjemahkan': 'menerjemahkan', 'samudera': 'samudra',
    'mengkoordinasikan': 'mengoordinasikan', 'mengkomunikasikan': 'mengomunikasikan', 'mengkonsumsi': 'mengonsumsi',
    'dimana': 'di mana', 'kemana': 'ke mana', 'darimana': 'dari mana', 'kedepan': 'ke depan', 'diatas': 'di atas',
    'dibawah': 'di bawah', 'didalam': 'di dalam', 'diluar': 'di luar', 'disamping': 'di samping', 'diantara': 'di antara',
    'disini': 'di sini', 'disana': 'di sana', 'sehinga': 'sehingga', 'dll': 'dan lain-lain', 'dsb': 'dan sebagainya',
    'hektar': 'hektare', 'gempabumi': 'gempa bumi', 'pemukiman': 'permukiman (tempat tinggal)', 'kadaluarsa': 'kedaluwarsa',
    'tanggulangi': 'tanggulangi', 'terlantar': 'telantar', 'ambulan': 'ambulans', 'apotik': 'apotek', 'atlit': 'atlet',
    'cidera': 'cedera', 'jadual': 'jadwal', 'kongkrit': 'konkret', 'nopember': 'November', 'pebruari': 'Februari',
    'rubah': 'ubah', 'sistimatis': 'sistematis', 'tapal': 'tapal', 'teoritis': 'teoretis', 'varietas': 'varietas',
    'tsunamik': 'tsunami', 'lintasan2': 'lintasan', 'faham': 'paham', 'fikir': 'pikir', 'nafas': 'napas',
}
TIDAK_BAKU = {k: v for k, v in TIDAK_BAKU.items() if k != v}

# istilah Inggris yang harus dicetak miring bila dipakai
INGGRIS = ['hotspot', 'run-up', 'onset', 'sudden onset', 'slow onset', 'extensive risk', 'hazardous event',
           'structured narrative review', 'associated types', 'Pressure and Release model', 'double counting',
           'rapid assessment', 'confidence']

# aturan pemilik dan pola bahasa: (pola, pesan, tingkat, berlaku di pustaka?)
POLA = [
    (r'\[[^\]\n]*\](?!\()', 'kurung siku dilarang pemilik; tulis keterangannya sebagai kalimat utuh', 'GALAT', True),
    (r'ANGKA SEMENTARA|BELUM TERVERIFIKASI|BAWAAN SEMENTARA', 'penanda kerja tidak boleh tercetak', 'GALAT', True),
    (r'\bDIBI\b|\blogbook\b|Data dan Informasi Bencana Indonesia', 'pemilik: kajian ini tidak dikaitkan dengan DIBI atau logbook Pusdalops', 'GALAT', True),
    (r'Kajian Penghitungan dan Klasifikasi', 'pemilik: jangan memakai kajian klasifikasi sebelumnya', 'GALAT', True),
    (r'Pantau Bencana', 'pemilik: jangan menulis "Pantau Bencana"', 'GALAT', True),
    (r'·', 'pemilik: jangan memisahkan teks dengan titik tengah', 'GALAT', True),
    # pemilik 19 Nov 2026: istilah Inggris dipakai bila lebih mudah dipahami; judul resmi Juklak 3/2022 "Pengkajian Cepat" tetap
    (r'\b[Kk]aji cepat\b|\b[Tt]inggi rayapan\b|\b[Tt]ingkat keyakinan\b', 'pemilik: pakai istilah yang lazim, yaitu rapid assessment, run-up, atau confidence', 'GALAT', False),
    # pemilik 24 Nov 2026: "kejadian ikutan" tidak baku; pasangan istilahnya kejadian pemicu dan kejadian terpicu
    (r'\b[Ii]kutan(nya)?\b', 'pemilik: pakai "kejadian terpicu", bukan "ikutan"', 'GALAT', False),
    (r'\b(akibat|karena|oleh)\s+(langsung\s+)?bahaya\b', '"bahaya" bukan pelaku; pakai "kejadian bencana" atau "ancaman"', 'GALAT', False),
    (r'\bjenis bahaya\b|\bsetiap bahaya\b|\bper bahaya\b', 'pakai "jenis bencana" atau "jenis ancaman"', 'GALAT', False),
    (r'\badalah merupakan\b|\bmerupakan adalah\b', 'pleonasme; pilih salah satu', 'GALAT', False),
    (r'\bagar supaya\b|\bdemi untuk\b|\bsangat \w+ sekali\b|\bmulai dari\b.*\bhingga dari\b', 'pleonasme', 'GALAT', False),
    (r'\bjam\s+\d{1,2}([.:]\d{2})?\b', 'waktu pukul ditulis "pukul 10.00"', 'GALAT', False),
    (r'\b(antar|pasca|pra|non|multi|sub|swa|tuna|nir|purna|ekstra|inter|intra)\s+[a-z]', 'unsur terikat ditulis serangkai (antardaerah, pascabencana)', 'GALAT', False),
    (r'\d(mm|cm|km|m|ha|kg)\b', 'beri spasi antara angka dan satuan (50 mm)', 'GALAT', False),
    (r'\b\d{1,3}(,\d{3})+\b(?!,)', 'pemisah ribuan memakai titik (1.000)', 'GALAT', False),
    (r'(?<![\w.,-])\d+\.\d{1,2}(?=\s?(persen|meter|km|mm|hektare|jiwa|orang)\b)', 'desimal memakai koma (0,5 meter)', 'GALAT', False),
    (r'(?<![\w/–-])\d{1,3}-\d{1,3}(?![\w/-])', 'rentang angka memakai tanda pisah (24–72) atau kata "sampai"', 'GALAT', False),
    (r'(?<=\S)  +(?=\S)', 'spasi ganda', 'GALAT', True),
    (r'\s+[,.;:](?=\s|$)', 'spasi sebelum tanda baca', 'GALAT', True),
    (r'\b([a-z]{3,})\s+\1\b', 'kata berulang ditulis dengan tanda hubung atau dihapus', 'GALAT', False),
    (r'\b(di|ke)\s(lakukan|buat|gunakan|pakai|terapkan|berikan|kirim|catat|hitung|isi|tetapkan|ambil|ukur)\b', 'awalan di- pada kata kerja ditulis serangkai', 'GALAT', False),
    (r'\byang mana\b', '"yang mana" sebagai penghubung tidak baku; pakai "yang"', 'GALAT', False),
    (r'(?<!\bke)\bdi mana\b(?!\s*\?)', '"di mana" sebagai kata penghubung tidak baku; pakai "tempat" atau "yang"', 'SARAN', False),
    (r'\bdimana|\bbilamana\b', 'tidak baku; pakai "apabila" atau "ketika"', 'SARAN', False),
    (r'\bbila\b', 'dalam naskah resmi lebih lazim "apabila"', 'SARAN', False),
    (r'\bdan/atau\b', 'boleh dipakai bila mengutip peraturan; selain itu cukup "atau"', 'SARAN', False),
    (r'\d+\s?%', 'dalam paragraf tulis "persen"; lambang % hanya di tabel atau gambar', 'SARAN', False),
]


def teks_dari(path):
    t = path.read_text(encoding='utf-8')
    if path.suffix == '.html':
        t = re.sub(r'<style.*?</style>|<svg.*?</svg>|<symbol.*?</symbol>', ' ', t, flags=re.S)
        t = re.sub(r'<i>(.*?)</i>', r'*\1*', t)
        t = re.sub(r'<[^>]+>', '\n', t)
        t = re.sub(r'\{F[RMB]\}', '', t)
    return t


def baris_prosa(t):
    """Buang blok kode, isi kotak kartu (label pendek), abstrak berbahasa Inggris, sintaks gambar, dan baris
    pembatas tabel. Kembalikan (nomor, isi, apakah tabel)."""
    pagar = kartu = inggris = False
    for i, ln in enumerate(t.split('\n'), 1):
        if ln.strip().startswith('```'):
            pagar = not pagar
            continue
        if ln.startswith('#'):
            inggris = ln.strip().lower() == '## abstract'
        if ln.startswith(':::'):
            kartu = ln.startswith(':::kartu')
            continue
        if pagar or kartu or inggris or not ln.strip() or re.match(r'^\s*\|?\s*:?-{3}', ln):
            continue
        ln = re.sub(r'!\[([^\]]*)\]\([^)]*\)', r'\1', ln)      # gambar: periksa keterangannya saja
        ln = re.sub(r'https?://\S+', '', ln)
        yield i, ln, ln.lstrip().startswith('|')


def periksa(path):
    temuan = []
    pustaka = path.name == 'pustaka.md'
    t = teks_dari(path)
    for no, ln, tabel in baris_prosa(t):
        isi = re.sub(r'^#+\s*', '', ln)
        for pola, pesan, tingkat, di_pustaka in POLA:
            if pustaka and not di_pustaka:
                continue
            if (tabel or path.suffix == '.html') and pesan.startswith('dalam paragraf'):
                continue
            fl = 0 if re.search(r'[A-Z]{3}', pola) else re.I     # pola berhuruf kapital (DIBI, ANGKA) peka huruf besar
            for m in re.finditer(pola, isi, flags=fl):
                temuan.append((tingkat, no, m.group(0), pesan))
        if pustaka:
            continue
        dikutip = ' '.join(re.findall(r'"([^"]+)"', isi)).lower().split()   # contoh yang sengaja dikutip
        for kata in re.findall(r"[A-Za-z']+", isi):
            if kata.lower() in dikutip:
                continue
            if kata.lower() in TIDAK_BAKU and not (kata == 'Gempabumi' and 'Intensitas Gempabumi' in isi):
                temuan.append(('GALAT', no, kata, f'tidak baku; pakai "{TIDAK_BAKU[kata.lower()]}"'))
        for ist in INGGRIS:
            for m in re.finditer(r'(?<![\w*])' + re.escape(ist) + r'(?![\w*])', isi, flags=re.I):
                temuan.append(('GALAT', no, m.group(0), 'istilah asing dicetak miring (*...*)'))
        if not tabel and not ln.lstrip().startswith('#') and path.suffix == '.md':
            for kal in re.split(r'(?<=[.?!])\s+', isi):
                n = len(kal.split())
                if n > 45:
                    temuan.append(('SARAN', no, kal[:60] + '…', f'kalimat {n} kata; pertimbangkan dipecah'))
            akhir = isi.rstrip()
            if (len(akhir.split()) > 6 and not re.search(r'[.?!:;)]$|\*\*$|;\s*(atau|dan)$', akhir)
                    and not re.match(r'^(Tabel|Gambar|Sumber|Kata kunci|Keywords)\b', isi.strip())):
                temuan.append(('GALAT', no, akhir[-40:], 'paragraf atau butir tidak diakhiri tanda baca; kalimat mungkin menggantung'))
    return temuan


def main():
    args = [Path(a) for a in sys.argv[1:]]
    if not args:
        akar = DI.parent      # folder standar-data-bencana
        # arsip = salinan beku revisi lama; tidak disunting, jadi tidak diperiksa
        # research_notes dan reports = catatan kerja riset, bukan naskah
        LEWAT = {'sumber', 'arsip', 'research_notes', 'reports'}
        args = sorted(p for p in akar.rglob('*.md') if not LEWAT & set(p.parts) and p.name != 'README.md')
        args += sorted(p for p in akar.rglob('*.html') if p.parent.name in ('gambar', 'infografis') and 'arsip' not in p.parts)
    galat = saran = 0
    for p in args:
        for tingkat, no, cuplik, pesan in periksa(p):
            print(f'{tingkat:5} {p.parent.name}/{p.name}:{no}  "{cuplik}"  {pesan}')
            galat += tingkat == 'GALAT'
            saran += tingkat == 'SARAN'
    print(f'\nRingkasan: {galat} galat, {saran} saran, {len(args)} berkas')
    sys.exit(1 if galat else 0)


if __name__ == '__main__':
    main()
