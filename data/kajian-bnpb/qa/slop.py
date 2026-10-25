#!/usr/bin/env python3
"""Detektor AI slop untuk naskah kajian BNPB, teks Indonesia dan Inggris (stdlib saja).

Aturan, contoh salah dan benar, serta alasannya ada di ../ANTI-SLOP.md. Kode S-n di berkas ini
sama dengan kode di sana; uji_slop.py gagal bila keduanya tidak cocok.

  python3 qa/slop.py naskah/air/*.md             ambang draf: GAGAL bila ada pola kritis/tinggi atau skor bab > 20
  python3 qa/slop.py --final keluaran/air.docx   ambang final: GAGAL bila ada pola kritis/tinggi atau skor bab > 10
  python3 qa/slop.py --json deck.pptx            keluaran JSON
  python3 qa/slop.py --ambang --laporan keluaran/qa/slop-air.md keluaran/air.docx
                                                 vonis ambang anti-AI per bab (LULUS, GAGAL RINGAN, GAGAL BERAT) dan laporannya
Keluar dengan kode 1 bila ada berkas GAGAL (dengan --ambang: bila ada bab yang tidak LULUS).

Impor: periksa_berkas(jalur, final), periksa_teks(teks, nama, final), gerbang(jalur_list, final), temuan_ambang(jalur_list).
Skor = jumlah bobot temuan per 1.000 kata prosa (penyebut paling sedikit 500 kata), maksimal 100.
"""
import json
import posixpath
import re
import statistics
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

KRITIS, TINGGI, SEDANG, RENDAH = 20, 5, 3, 1
AMBANG_DRAF, AMBANG_FINAL, AMBANG_TINJAU = 20, 10, 10
KATA_MIN = 500          # penyebut minimum: slide dan bab pendek dinilai seolah 500 kata
KALIMAT_PANJANG = 45    # kata
PARAGRAF_ISI = 25       # kata; paragraf sependek ini sudah wajib berangka (S-37) dan dihitung simetrinya (S-28)
PADAT_KOSONG = 5        # kata kosong per 1.000 kata

NAMA = {
    'S-1': 'em dash', 'S-2': 'titik tengah', 'S-3': 'emoji',
    'S-4': 'tanda pisah tiruan', 'S-5': 'tanda seru',
    'S-6': 'sisa percakapan chatbot', 'S-7': 'penanda isian',
    'S-8': 'pembuka era', 'S-9': 'pembuka klise',
    'S-10': 'inflasi makna', 'S-11': 'bahasa promosi', 'S-12': 'kata kosong',
    'S-13': 'kepadatan kata kosong', 'S-14': 'penguat kosong', 'S-15': 'frasa bertele-tele',
    'S-16': 'meta-komentar',
    'S-17': 'tiga-serangkai abstrak', 'S-18': 'tiga-serangkai gaya',
    'S-19': 'kontras retoris', 'S-20': 'simpulan moral atau aforisme',
    'S-21': 'kalimat penutup bergaya', 'S-22': 'pertanyaan retoris', 'S-23': 'personifikasi',
    'S-24': 'slogan atau ajakan', 'S-25': 'kata hubung pembuka berulang',
    'S-26': 'pembuka kalimat atau paragraf sama', 'S-27': 'butir berkepala tebal',
    'S-28': 'paragraf simetris', 'S-29': 'panjang kalimat seragam', 'S-30': 'kalimat terlalu panjang',
    'S-31': 'hedging', 'S-32': 'signifikan tanpa uji', 'S-33': 'kuantor kabur',
    'S-34': 'atribusi kabur', 'S-35': 'pengisian celah spekulatif', 'S-36': 'presisi palsu',
    'S-37': 'paragraf tanpa angka dan sumber', 'S-38': 'kata Inggris berpadanan',
    'S-39': 'gugus pola dalam satu paragraf',
    'S-40': 'titik dua di atas ambang', 'S-41': 'hedging di atas ambang', 'S-42': 'pembuka klise bab atau subbab',
    'S-43': 'kata terlarang khas AI',
}

SARAN = {
    'S-1': 'Ganti dengan koma, titik dua, kurung, atau pecah jadi dua kalimat.',
    'S-2': 'Pakai koma, label sendiri, atau baris baru.',
    'S-3': 'Hapus; bila butuh tanda, pakai ikon dari registri tema.json.',
    'S-4': 'En dash hanya untuk rentang (2015\u20132025, Jun\u2013Okt, ruas Cilegon\u2013Gresik); dua nama yang berarti "dan" '
           'ditulis dengan "dan"; pemisah kalimat pakai koma atau titik dua.',
    'S-5': 'Laporan ilmiah tidak memakai tanda seru; tunjukkan bobot lewat angka.',
    'S-6': 'Hapus sisa percakapan; naskah berdiri sendiri.',
    'S-7': 'Isi dengan token angka dari data/angka.json beserta sumbernya, atau hapus kalimatnya.',
    'S-8': 'Buka dengan temuan berangka, bukan latar zaman.',
    'S-9': 'Hapus pembuka; mulai dari temuan: siapa, di mana, berapa, kapan, sumbernya.',
    'S-10': 'Ganti klaim penting dengan fakta: apa yang dilakukan, berapa besar, menurut sumber apa.',
    'S-11': 'Hapus nada promosi; sebut ukuran kinerja yang bisa diperiksa.',
    'S-12': 'Buang kata itu atau ganti dengan isi yang terukur.',
    'S-13': 'Terlalu banyak kata kosong; tulis ulang paragraf yang memuatnya dengan angka dan pelaku.',
    'S-14': 'Hapus penguat; besarnya ditunjukkan angka.',
    'S-15': 'Ringkas: "adalah", "agar", "untuk", "sejak"; "dalam rangka X" menjadi "untuk X".',
    'S-16': 'Langsung sampaikan isinya; "Bab ini" cukup sekali di Sistematika.',
    'S-17': 'Ganti tiga sifat abstrak dengan satu ukuran nyata (waktu tanggap, cakupan, jumlah).',
    'S-18': 'Tiga-serangkai gaya nol (Buku Pegangan): sebut jumlah dan rujuk tabelnya, atau tulis butir yang memang ada; '
            'daftar nama diri atau berangka hanya sah di DOCX.',
    'S-19': 'Tulis klaim positifnya langsung dengan angka; koreksi definisi cukup satu kalimat datar.',
    'S-20': 'Hapus nasihat dan pepatah; akhiri pada fakta terakhir.',
    'S-21': 'Hapus kalimat penutup bergaya; paragraf selesai di fakta terakhir.',
    'S-22': 'Ubah menjadi pernyataan temuan; pertanyaan bab cukup di front matter.',
    'S-23': 'Sebut pelaku nyata (lembaga, alat ukur) dan kata kerja yang bisa diamati.',
    'S-24': 'Laporan menyatakan temuan dan rekomendasi berlembaga; slogan dan ajakan dibuang.',
    'S-25': 'Hapus kata hubung yang tidak membawa arti; mulai kalimat dengan subjek.',
    'S-26': 'Gabungkan kalimat atau ganti subjek; daftar sejajar lebih baik dijadikan tabel.',
    'S-27': 'Tulis sebagai kalimat atau tabel; label tebal hanya di kotak yang memang berlabel.',
    'S-28': 'Panjang paragraf mengikuti isi; gabungkan yang tipis, pecah yang memuat dua gagasan.',
    'S-29': 'Selingi kalimat pendek berangka dengan kalimat penjelas yang lebih panjang.',
    'S-30': 'Pecah menjadi dua atau tiga kalimat; satu kalimat satu gagasan.',
    'S-31': 'Satu penanda ketidakpastian cukup, disertai besarnya (rentang) dan sebabnya.',
    'S-32': 'Sebut besarnya (naik 40%) atau hasil ujinya (uji Mann-Kendall, p < 0,05).',
    'S-33': 'Ganti dengan jumlahnya ("12 kabupaten") atau sebut anggotanya.',
    'S-34': 'Sebut sumbernya ([@kunci] atau catatan kaki) atau hapus klaimnya.',
    'S-35': 'Tulis bahwa data tidak tersedia dan siapa pemegangnya; jangan isi celah dengan dugaan.',
    'S-36': 'Tulis angka persis dari sumber atau rentang estimasi; "100%" hanya bila bersumber.',
    'S-37': 'Paragraf isi memuat paling sedikit satu angka atau satu rujukan sumber.',
    'S-38': 'Pakai padanan baku; istilah teknis tanpa padanan ditulis miring.',
    'S-39': 'Paragraf memuat dua pola slop atau lebih; tulis ulang dari fakta: pelaku, angka, tempat, waktu, sumber.',
    'S-40': 'Paling banyak 20 titik dua per 1.500 kata paragraf isi; ganti pola "Label: penjelasan" dengan kalimat utuh.',
    'S-41': 'Paling banyak 2 penanda ragu per 1.500 kata; tulis besarnya ketidakpastian (rentang) dan sumbernya.',
    'S-42': 'Buka bab dan subbab dengan temuan berangka: siapa, di mana, berapa, kapan, sumbernya.',
    'S-43': 'Ganti dengan kata kerja yang bisa diamati; daftar pemilik riset/anti-slop/banned-ai-words.txt dan padanan Indonesianya.',
}


def _r(kode, bobot, pola, lingkup='semua'):
    return (kode, bobot, re.compile(pola, re.I), lingkup)


# Emoji termasuk glif teknis yang dirender emoji (jam pasir, tombol putar, kotak) dan penyambung ZWJ.
# Segitiga arah U+25B2/U+25BC sengaja tidak masuk: aturannya di PEDOMAN B1.5 dan gerbang D-23.
EMOJI = (r'[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D\u231A\u231B\u2328\u23CF\u23E9-\u23F3'
         r'\u23F8-\u23FA\u2139\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u3030\u303D\u3297\u3299]')
BULAN = r'(?:Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Agt|Ags|Sep|Okt|Nov|Des)'

# Diperiksa pada teks mentah semua paragraf, termasuk kutipan dan tabel.
KARAKTER = [
    _r('S-1', KRITIS, r'[\u2012\u2014\u2015\u2E3A\u2E3B\uFE31\uFE32\uFE58]'),
    _r('S-2', KRITIS, r'[\u00b7\u2219\u22c5\u2027\u30fb\u25e6\u2043]|(?<=\S)\s*\u2022'),
    _r('S-3', KRITIS, EMOJI),
    # "--" atau tanda hubung/en dash berspasi di antara kata; en dash di antara dua nama (Bali–Nusa), karena en dash
    # hanya untuk rentang (PEDOMAN C3). Rentang yang sah: bulan (Jun–Okt), angka Romawi (I–III), dan tempat
    # yang didahului ruas/rute/jalur/segmen/koridor/lintas (PUEBI: "sampai ke").
    _r('S-4', SEDANG, r'(?<=\w) ?--(?= ?\w)|(?<=[^\W\d_]) [\u2013-] (?=[^\W\d_])'
                      r'|(?-i:(?<!ruas )(?<!rute )(?<!jalur )(?<!segmen )(?<!koridor )(?<!lintas )'
                      rf'\b(?!{BULAN}[a-z]*\u2013)(?![IVXLCDM]+\u2013)[A-Z][a-z]+\u2013[A-Z][a-z]+)'),
]

# Diperiksa pada teks bersih tanpa kutipan langsung. Lingkup "prosa" melewati tabel, judul, atribut;
# lingkup "slide" hanya teks slide PPTX.
POLA = [
    _r('S-5', SEDANG, r'(?<=[^\W\d_]{2})!(?=\s|$)', 'prosa'),
    # S-6 sisa percakapan
    _r('S-6', KRITIS, r'\bsemoga (bermanfaat|membantu|dapat membantu|informasi ini)'),
    _r('S-6', KRITIS, r'\bsebagai (sebuah )?(model bahasa|kecerdasan buatan|asisten (ai|virtual))\b'),
    _r('S-6', KRITIS, r'\b(jangan ragu untuk (bertanya|menghubungi)|silakan (beri tahu|tanyakan)'
                      r'|apakah (anda|kamu) ingin saya|saya harap (ini|informasi|penjelasan))'),
    _r('S-6', KRITIS, r'\bpertanyaan yang (bagus|menarik|sangat baik)\b|\btentu( saja)?!'),
    _r('S-6', KRITIS, r'\b(hingga|sampai) (pembaruan|batas pengetahuan|data pelatihan) terakhir saya\b'),
    _r('S-6', KRITIS, r"\bi hope (this|that) helps\b|\bas an ai\b|\bas a (large )?language model\b"
                      r"|\b(let me know|feel free to ask) if\b|\bwould you like me to\b|\bcertainly!"
                      r"|\bgreat question\b|\bas of my (last|latest) (update|training)\b|\byou'?re absolutely right\b"),
    # S-7 penanda isian
    _r('S-7', KRITIS, r'\blorem ipsum\b|(?-i:\b(?:TODO|TBD|FIXME|XXX+)\b)|\bX{2,}\s?%'),
    _r('S-7', KRITIS, r'\[(real data|data|sumber|angka|placeholder|nama|tahun|tanggal|isi|xx+)(\]|[ :][^\]]*\])'),
    # S-8 pembuka era
    _r('S-8', KRITIS, r'\bdi (era|zaman|masa) (yang )?serba\b'),
    _r('S-8', KRITIS, r"\bin today'?s (fast-paced|digital|modern|ever-changing|rapidly changing) (world|age|era|landscape|society)\b"),
    _r('S-8', KRITIS, r'\bin (the|an|this) (ever-evolving|ever-changing|rapidly evolving|fast-paced) (landscape|world|era)\b'),
    # S-9 pembuka klise
    _r('S-9', TINGGI, r'\b(tidak|tak) (dapat |bisa )?(di)?(pungkiri|mungkiri)\b|\b(tidak|tak) terbantahkan\b'),
    _r('S-9', TINGGI, r'\bseiring (dengan )?(berjalannya|bergulirnya|perkembangan|kemajuan) (waktu|zaman|teknologi)\b'),
    _r('S-9', TINGGI, r'\bdewasa ini\b|\bsudah (menjadi )?rahasia umum\b'),
    _r('S-9', TINGGI, r'\bdi era (digital|globalisasi|disrupsi|modern|teknologi|informasi)\b'),
    _r('S-9', TINGGI, r'\b(dalam|di tengah|di dalam) lanskap (kebijakan|kebencanaan|tata kelola|global|digital'
                      r'|politik|ekonomi|pembangunan|risiko|yang)\b'),
    _r('S-9', SEDANG, r'\bdi tengah (dinamika|tantangan|ketidakpastian|kompleksitas|derasnya|arus|pesatnya|gempuran|hiruk-pikuk)\b'),
    _r('S-9', SEDANG, r'\bsejak (zaman dahulu|dahulu kala|zaman dulu)\b'),
    _r('S-9', SEDANG, r'(?:^|[.!?] )indonesia (adalah|merupakan) (salah satu )?negara (yang )?(sangat |paling )?(rawan|rentan)'),
    _r('S-9', SEDANG, r'(?:^|[.!?] )sebagai (negara|bangsa) (kepulauan|yang|dengan|maritim|besar)\b'
                      r'|\bindonesia (dikenal|disebut) sebagai (negara|salah satu)\b'),
    _r('S-9', TINGGI, r"\bin an era (of|where|when)\b|\bsince the dawn of\b|\bit goes without saying\b"
                      r"|\bat the end of the day\b|\bin the realm of\b"),
    _r('S-9', RENDAH, r'\bbelakangan ini\b'),
    # S-10 inflasi makna
    _r('S-10', TINGGI, r'\b(memainkan|memegang|mengambil|menjalankan) peran(an)? (yang )?(sangat |amat )?(penting|krusial'
                       r'|vital|kunci|sentral|strategis|besar|signifikan|utama|fundamental)\b'),
    _r('S-10', SEDANG, r'\bberperan (sangat |amat )?(penting|krusial|vital|strategis|sentral|besar)\b'),
    _r('S-10', TINGGI, r'\b(tidak|tak) terpisahkan\b|\bbagian integral\b'),
    _r('S-10', TINGGI, r'\b(tulang punggung|garda terdepan|pilar utama|fondasi kokoh|landasan kokoh|jantung dari)\b'),
    _r('S-10', SEDANG, r'\bujung tombak\b'),
    _r('S-10', TINGGI, r'\b(menegaskan|menggarisbawahi|mencerminkan|menunjukkan|menandakan|membuktikan) (kembali )?'
                       r'(betapa|pentingnya|perlunya|komitmen|keseriusan|urgensi)\b'),
    _r('S-10', SEDANG, r'\bhal ini (menunjukkan|mengindikasikan|menegaskan|mencerminkan|menggarisbawahi|membuktikan|menandakan)\b'),
    _r('S-10', TINGGI, r'\b(tonggak (sejarah|penting)|babak baru|era baru|lompatan (besar|signifikan)|momentum (penting|strategis|emas))\b'),
    _r('S-10', SEDANG, r'\blangkah (nyata|strategis|maju|besar|konkret|progresif)\b'),
    _r('S-10', SEDANG, r'\bsecara (holistik|komprehensif|sinergis|optimal|maksimal|masif|paripurna)\b'),
    _r('S-10', SEDANG, r'\bpendekatan (yang )?(holistik|komprehensif|menyeluruh|terintegrasi|paripurna)\b'),
    _r('S-10', SEDANG, r'\b(sinergi|kolaborasi|koordinasi|komitmen|kerja sama) (yang )?(kuat|erat|solid|tinggi|penuh|apik|harmonis)\b'),
    _r('S-10', SEDANG, r'\b(seluruh|semua|berbagai) (pihak|elemen( bangsa)?|lapisan masyarakat|pemangku kepentingan|kalangan|komponen bangsa)\b'),
    _r('S-10', SEDANG, r'\bpara pemangku kepentingan\b|\bkontribusi (yang )?(nyata|besar|signifikan|positif|penting|berarti)\b'
                       r'|\b(wujud|bentuk|bukti) (nyata |konkret )?(komitmen|keseriusan|kepedulian|kehadiran)\b'
                       r'|\b(motor penggerak|lokomotif|katalisator|saling berkelindan|di atas kertas)\b'
                       r'|\bupaya (yang )?(berkelanjutan|terus-menerus|konsisten|serius|maksimal|sungguh-sungguh)\b'
                       r'|\bsecara lebih (holistik|komprehensif|terpadu|terintegrasi|menyeluruh|optimal|maksimal|sinergis)\b'
                       r'|\b(tidak|tak) (terlepas|lepas) dari\b'),
    _r('S-10', TINGGI, r"\bplays? an? (crucial|pivotal|vital|key|significant|central|critical|important) role\b"
                       r"|\b(is|serves as|stands as) a testament\b|\ba testament to\b"
                       r"|\b(underscores?|highlights?) the (importance|need|significance)\b"
                       r"|\bmarking a (pivotal|significant|key) (moment|shift|turning point)\b|\ba pivotal moment\b"
                       r"|\bpaves? the way\b|\bsets? the stage for\b|\bat its core\b|\bthe heart of the matter\b"
                       r"|\bthe real question is\b|\bnavigat(e|ing) the complexit(y|ies)\b|\bindelible mark\b"),
    # S-11 bahasa promosi
    _r('S-11', TINGGI, r'\bsolusi (yang )?(tepat|jitu|terbaik|inovatif|komprehensif|menyeluruh|holistik|ampuh|cerdas|efektif)\b'),
    _r('S-11', TINGGI, r'\b(revolusioner|spektakuler|menakjubkan|tak tertandingi|kelas dunia|terbaik di kelasnya|tiada duanya)\b'),
    _r('S-11', SEDANG, r'\b(terobosan|luar biasa)\b'),
    _r('S-11', SEDANG, r'\b(dari )?hulu (hingga|sampai|ke) hilir\b|\bsabang sampai merauke\b'),
    _r('S-11', TINGGI, r'\bhadir (sebagai|untuk) (solusi|menjawab|menjadi)\b'),
    _r('S-11', TINGGI, r"\b(revolutionary|game[- ]chang(er|ing)|cutting[- ]edge|world[- ]class|best[- ]in[- ]class"
                       r"|next[- ]generation|groundbreaking|unparalleled|breathtaking|state[- ]of[- ]the[- ]art"
                       r"|seamless(ly)?|nestled)\b|\bboasts? (a|an)\b"),
    # S-12 kata kosong tunggal (dihitung juga kepadatannya, S-13)
    _r('S-12', RENDAH, r'\b(holistik|komprehensif|sinergi|sinergis|sinergitas|bersinergi|transformatif|inovatif|optimal'
                       r'|optimalisasi|mengoptimalkan|krusial|esensial|fundamental|masif|integral|paripurna'
                       r'|terintegrasi|kolaboratif|akselerasi|resiliensi|multipihak|pentahelix)\b'),
    _r('S-12', RENDAH, r'\b(delve[sd]?|delving|tapestry|pivotal|crucial|robust|leverag(e|es|ed|ing)|utiliz(e|es|ed|ing)'
                       r'|holistic|synerg(y|ies|istic)|multifaceted|intricate|realm|showcas(e|es|ed|ing)'
                       r'|foster(s|ed|ing)?|underscor(e|es|ed|ing)|vibrant|testament|nuanced|meticulous(ly)?'
                       r'|empower(s|ed|ing)?|unlock(s|ed|ing)?|elevat(e|es|ed|ing)|embark(s|ed|ing)?'
                       r'|bolster(s|ed|ing)?|garner(s|ed|ing)?|interplay|paramount)\b'),
    # S-14 penguat kosong
    # bukan "sangat kuat" atau "sangat tinggi": keduanya nama kelas resmi BMKG
    _r('S-14', SEDANG, r'\b(sangat|amat|begitu|teramat) (penting|krusial|vital|esensial|signifikan|strategis|fundamental|urgen|mendesak'
                       r'|menentukan|dibutuhkan|diperlukan|serius|berarti|berharga)\b'),
    _r('S-14', SEDANG, r'\bamat sangat\b|\bsangat \w+ sekali\b'),
    _r('S-14', RENDAH, r'\b(benar-benar|sungguh)\b'),
    _r('S-14', SEDANG, r'\b(very|extremely|incredibly|truly|really) (important|crucial|vital|significant|essential|unique)\b'),
    # S-15 frasa bertele-tele
    _r('S-15', RENDAH, r'\badalah merupakan\b|\bagar supaya\b|\bdemi untuk\b|\bsejak dari\b|\byang mana\b'
                       r'|\bdalam rangka\b(?! (mewujudkan|menciptakan|membangun|mendorong|mengoptimalkan)\b)'),
    _r('S-15', SEDANG, r'\bdalam (rangka|upaya) (mewujudkan|menciptakan|membangun|mendorong|mengoptimalkan)\b'),
    _r('S-15', RENDAH, r"\bin order to\b|\bdue to the fact that\b|\bat this point in time\b|\bfor the purpose of\b"
                       r"|\bhas the ability to\b|\bin the event that\b"),
    # S-16 meta-komentar
    _r('S-16', TINGGI, r'\b(bab|bagian|subbab|tulisan|kajian|dokumen|laporan|makalah|naskah) ini akan (membahas|menguraikan'
                       r'|menjelaskan|memaparkan|mengulas|menyajikan|mendiskusikan|menganalisis|mengkaji)\b'),
    _r('S-16', SEDANG, r'\bpada (bab|bagian|subbab) ini,? (akan )?(dibahas|diuraikan|dijelaskan|disajikan|dipaparkan|diulas)\b'),
    _r('S-16', SEDANG, r'\b(bab|bagian|subbab|pembahasan) (berikut|selanjutnya|berikutnya) akan (membahas|menguraikan|menjelaskan|memaparkan)\b'),
    _r('S-16', TINGGI, r'\b(perlu|penting untuk|patut|harus) (diketahui|dicatat|diingat|digarisbawahi|ditekankan|disadari'
                       r'|dipahami|diperhatikan) bahwa\b'),
    _r('S-16', TINGGI, r'(?:^|[.!?] )(perlu|penting untuk|sangat penting untuk|patut) (diketahui|dicatat|diingat|digarisbawahi'
                       r'|ditekankan|disadari)\b(?! bahwa)'),
    _r('S-16', SEDANG, r'\b(sebagaimana|seperti) (yang )?(telah )?(disebutkan|dijelaskan|diuraikan|dibahas|disinggung|dikemukakan)'
                       r' (sebelumnya|di atas|terdahulu|pada bagian sebelumnya)\b'),
    _r('S-16', TINGGI, r'\b(sebagaimana|seperti) (yang )?(kita )?(ketahui|maklumi)( bersama)?\b'),
    _r('S-16', SEDANG, r'\bberikut (ini )?(adalah|merupakan) (penjelasan|uraian|ringkasan|pembahasan|rangkuman)\b'),
    _r('S-16', TINGGI, r'\b(dalam|pada) (tulisan|bab|bagian|kajian) ini,? (kami|penulis|kita)\b'),
    _r('S-16', TINGGI, r'\b(penting|layak) (digarisbawahi|dicermati|dicatat|diingat|ditekankan)\b|\b(perlu|patut|penting untuk) dicermati\b'),
    _r('S-16', SEDANG, r'(?:^|[.!?] )(uraian|pembahasan|bagian|subbab) berikut (ini )?(memetakan|menguraikan|membahas|menjelaskan'
                       r'|memaparkan|menyajikan|merangkum|mengulas)\b|\bberikut (uraian|penjelasan|ulasan|rincian)nya\b'
                       r'|\b(berdasarkan|dari) uraian (di atas|tersebut|sebelumnya)\b|\bterlihat jelas bahwa\b'
                       r'|(?:^|[.!?] )(menariknya|uniknya|ironisnya|tak pelak)\b'),
    _r('S-16', RENDAH, r'\b(bab|bagian) ini (membahas|menguraikan|menjelaskan|memaparkan|mengulas|menyajikan)\b'),
    _r('S-16', TINGGI, r"\bin this (chapter|section|article|report|paper|document|post),? (we|i) (will|shall|aim)\b"
                       r"|\blet'?s (dive|delve|take a (closer )?look|explore|break (it|this) down)\b"
                       r"|\bit(?:'s| is) (important|worth|crucial|essential) (to note|noting|to remember|to mention)\b"
                       r"|\bwithout further ado\b|\bhere'?s what you need to know\b"),
    _r('S-16', SEDANG, r"\bthis (chapter|section|article|report|paper) (will )?(discuss|explore|examine|delve into|look at)\b"
                       r"|\bas (mentioned|discussed|noted|stated) (earlier|above|previously|before)\b"
                       r"|\bnow that we'?ve covered\b|\bbefore we proceed\b"),
    # S-19 kontras retoris
    _r('S-19', TINGGI, r'\bbukan(lah)? (sekadar|hanya|semata(-mata)?|cuma)\b|\blebih dari sekadar\b'),
    _r('S-19', TINGGI, r'\bbukan (soal|masalah|tentang|perkara) [^.;]{1,50}?,? (melainkan|tetapi|tapi|namun)\b'),
    _r('S-19', SEDANG, r'\bbukan(lah)? (?!sekadar|hanya|semata|cuma|soal|masalah|tentang|perkara)[^.;]{1,50}?,? melainkan\b'),
    _r('S-19', TINGGI, r'\btak (sekadar|hanya|semata(-mata)?|cuma)\b[^.;]{0,120}?,? (tetapi|tapi|namun|melainkan)\b'
                       r'|\balih-alih (sekadar|hanya|cuma)\b'),
    _r('S-19', SEDANG, r'\btidak (hanya|sekadar|semata(-mata)?|cuma) [^.;]{1,160}?,? (tetapi|tapi|namun|melainkan)\b'
                       r'|\b(tidak|tak) (terletak|bergantung|berhenti) (pada|di) [^.;]{1,80}?,? (tetapi|melainkan|namun)\b'
                       r'|\bbukan lagi (?!(sebuah )?pilihan)[^.;]{1,60}?,? (tetapi|melainkan|namun)\b'
                       r'|(?:^|[.!?] )(tak|tidak|bukan) hanya itu\b'),
    # Buku Pegangan melarang kontras "X, bukan Y" di slide tanpa pengecualian; di DOCX penyunting menilainya (M-10)
    _r('S-19', SEDANG, r'(?<=[^\W\d_]), bukan (?!hanya|sekadar|semata|cuma|lagi)[^\W\d_]', 'slide'),
    _r('S-19', TINGGI, r"\bnot (just|only|merely) [^.;]{1,60}?, but\b|\bit'?s not (just )?(about )?[^.;]{1,40}?[,;] it'?s\b"
                       r"|\bmore than just\b|\bnot because [^.;]{1,40}?, but because\b"),
    # S-20 simpulan moral dan aforisme
    _r('S-20', TINGGI, r'\b(adalah|merupakan|menjadi|jadi) kunci\b|\bkunci (utama|keberhasilan|sukses)\b'),
    _r('S-20', TINGGI, r'\bmasa depan (yang )?(lebih )?(baik|cerah|gemilang|tangguh|aman|berkelanjutan|cemerlang)\b'),
    _r('S-20', TINGGI, r'\bbukan (lagi )?(sebuah )?pilihan\b|\bkeniscayaan\b|\bharga mati\b'
                       r'|\b(tidak|tak) (bisa|dapat|boleh) (lagi )?(ditawar|ditunda|diabaikan|dianggap remeh|disepelekan)'),
    _r('S-20', TINGGI, r'\b(memegang kunci|(menjadi|merupakan) (fondasi|pondasi|syarat mutlak|modal utama)|menjadi penentu utama)\b'
                       r'|\bhari esok yang (lebih )?(baik|aman|cerah|tangguh|sejahtera)\b|\b(generasi|anak cucu) (berikutnya|mendatang|penerus)\b'
                       r'|\b(tidak|tak) lahir dalam semalam\b|\bsetapak demi setapak\b'
                       r'|\binvestasi (terbaik |jangka panjang )?(bagi|untuk) (keselamatan|masa depan|generasi)\b'),
    _r('S-20', SEDANG, r'\btidak ada [^\W\d_]+( [^\W\d_]+){0,3} tanpa [^\W\d_]+'),
    # bukan "modal sosial": konsep yang dipakai Renas PB
    _r('S-20', SEDANG, r'\b(pengingat pahit|pelajaran berharga|luka mendalam|duka mendalam|lingkaran setan|kesempatan emas'
                       r'|berjalan beriringan)\b'),
    _r('S-20', TINGGI, r"\b(is|are|remains?) (the )?key (to|for)\b|\bthe future (looks|is) bright\b|\bexciting times\b"
                       r"|\ba (major )?step in the right direction\b|\bonly time will tell\b|\bthe (language|currency|architecture) of\b"),
    # S-22 pertanyaan retoris yang ditutup titik (yang ditutup "?" dihitung per kalimat)
    _r('S-22', SEDANG, r'(?:^|[.!?] )(pertanyaannya|pertanyaan (besar|mendasar|penting)nya'
                       r'|(lantas|lalu),? (bagaimana|apa|sejauh mana|mengapa|siapa))\b', 'prosa'),
    # S-23 personifikasi
    _r('S-23', TINGGI, r'\b(data|angka(-angka)?|fakta|statistik|peta|grafik|sejarah) (ini |tersebut |pun )?(berbicara|bercerita'
                       r'|menjerit|berteriak|berbisik|(tidak|tak) (pernah )?berbohong)\b'),
    _r('S-23', TINGGI, r'\b(alam|bumi|sungai|gunung|laut|langit|hujan|banjir|bencana|api) (sedang |pun |seolah )?(murka|marah|mengamuk'
                       r'|menangis|berbicara|menegur|(tidak|tak) pandang bulu)\b'),
    # subjek alam atau data, paling banyak dua kata sisipan ("bencana datang mengetuk", "sungai seakan menagih")
    _r('S-23', TINGGI, r'\b(alam|bumi|sungai|gunung|laut|langit|hujan|banjir|bencana|api|kemarau|kekeringan|data|angka(-angka)?)'
                       r'(?: [^\W\d_]+){0,2}? (?:(?:seakan|seolah|pun|sedang|kini) )?(?:(?:tidak|tak) mengenal|menagih'
                       r'|memberi (?:sinyal|pesan|isyarat|pelajaran)|mengirim (?:sinyal|pesan)|merayap|menyapa|mengintai|mengetuk'
                       r'|menghantui)\b|\btanpa permisi\b'),
    _r('S-23', TINGGI, r"\bibu pertiwi (menangis|berduka)\b|\bthe data (tells|speaks|shows us)\b|\bnature'?s (wrath|fury)\b|\bmother nature\b"),
    # S-24 slogan dan ajakan
    _r('S-24', TINGGI, r'(?:^|[.!?] )(mari|ayo|yuk|saatnya|sudah saatnya|bersama(-sama)? kita)\b'),
    _r('S-24', TINGGI, r'\bmulai (besok|sekarang)\b|\bdemi (masa depan|generasi (mendatang|penerus)|anak cucu|kejayaan)\b'),
    _r('S-24', TINGGI, r'\b(negara|pemerintah) (harus |wajib |selalu )?hadir\b(?! (di|ke|pada|dalam|untuk menghadiri)\b)'
                       r'|\bkehadiran (negara|pemerintah)\b'),
    _r('S-24', TINGGI, r'\b(kini|sekarang|telah) (saatnya|waktunya)\b|\bsudah waktunya\b|\bbergandengan tangan\b|\bbahu[- ]membahu\b'),
    _r('S-24', SEDANG, r'\bjangan sampai\b|\b(perlu|harus|patut) menjadi perhatian (bersama|serius|kita|semua|seluruh)\b'
                       r'|\bperhatian serius\b'),
    # sapaan kepada pembaca (PEDOMAN C1)
    _r('S-24', SEDANG, r'\bkita (semua|bersama)\b|\b(anda|kamu)\b', 'prosa'),
    _r('S-24', TINGGI, r"(?:^|[.!?] )let'?s (?!dive|delve|take a|explore|break)\w+|\btogether,? we (can|will)\b"),
    # S-31 hedging (tumpukan penanda dihitung terpisah)
    _r('S-31', SEDANG, r'\b(dapat|bisa) (saja )?berpotensi\b'),
    _r('S-31', RENDAH, r'\b(tampaknya|sepertinya|agaknya|kiranya|seolah-olah|boleh jadi|bisa jadi|ditengarai|disinyalir)\b'),
    _r('S-31', SEDANG, r"\bcould potentially\b|\bmight possibly\b|\bmay or may not\b|\bit (appears|seems) that\b"
                       r"|\bone could argue\b|\bgenerally speaking\b|\bto a certain extent\b|\bsome might say\b"),
    _r('S-31', RENDAH, r'\b(arguably|presumably)\b'),
    # S-34 atribusi kabur yang tidak pernah sah
    _r('S-34', TINGGI, r'\b(konon|kabarnya|disebut-sebut)\b'),
    # S-35 pengisian celah spekulatif
    _r('S-35', TINGGI, r'\b(data|informasi|catatan|dokumentasi)\b[^.]{0,60}?\b(terbatas|tidak tersedia|belum tersedia|sulit diperoleh'
                       r'|minim)\b[^.]{0,80}?\b(namun|tetapi|meski|meskipun|walau|walaupun)\b[^.]{0,60}?\b(diduga|kemungkinan'
                       r'|diperkirakan|diyakini|tampaknya|agaknya)\b'),
    _r('S-35', TINGGI, r"\b(while|although) (specific )?(details|information|data) (is|are) (limited|scarce|not (readily |publicly )?available)\b"
                       r"|\bmaintains a low profile\b|\blikely (grew up|began|started|founded)\b|\bit is believed that\b"),
    # S-36 presisi palsu
    _r('S-36', SEDANG, r'(?<![\w.,])\d[\d.,]*\s?\+(?=[\s,.;:)]|$)|\b99[,.]9+\s?%'),
    _r('S-36', RENDAH, r'(?<![\d.,])100\s?%'),
]

# Atribusi kabur: hanya temuan bila kalimatnya sendiri tidak memuat sumber. Satu sitasi di kalimat lain
# tidak membebaskan klaim "banyak kajian sepakat" di kalimat ini.
ATRIBUSI = [re.compile(p, re.I) for p in (
    r'\b(para|banyak|sejumlah|berbagai|beberapa) (ahli|pakar|pengamat|peneliti|kalangan|studi|penelitian|kajian|laporan|sumber'
    r'|pihak|analis)\b[^.]{0,40}?\b(menyatakan|menyebut|menyebutkan|menunjukkan|berpendapat|meyakini|sepakat|mengungkap'
    r'|mengungkapkan|memperkirakan|menilai|mencatat)\b',
    r'(?:^|[.!?] )(studi|penelitian|riset|kajian|survei|laporan|data) (terbaru |terkini |terdahulu )?(menunjukkan|membuktikan'
    r'|mengungkap|mengungkapkan|memperlihatkan)\b',
    r'\b(diyakini|dipercaya|diakui) (secara luas|banyak pihak|oleh banyak)\b',
    r'(?:^|[.!?] )(literatur|pustaka|bukti( empiris)?|temuan( lapangan)?|pengalaman|praktik)\b(?! (ini|itu|tersebut)\b)'
    r'[^.]{0,40}?\b(menunjukkan|membuktikan|mengindikasikan|memperlihatkan|mengajarkan|menegaskan)\b',
    r"\b(experts|observers|analysts|critics|researchers|scientists|studies|research|reports) (say|said|suggest|show|believe|argue|note|indicate|agree)\b",
)]

PENUTUP = re.compile(r'^(pada akhirnya|singkatnya|intinya|pendek kata|sejatinya|pada hakikatnya|hakikatnya|inilah|di sinilah'
                     r'|hanya dengan|jelaslah|tak pelak|tidak heran|ultimately|in the end|in conclusion|in short|in summary'
                     r'|all in all|at the end of the day|in essence)\b', re.I)
# Pembuka simpulan yang sah bila kalimatnya membawa angka data atau sumber ("Dengan demikian, IPA Jawa 54% ...").
PENUTUP_LUNAK = re.compile(r'^(dengan demikian|oleh karena itu|oleh sebab itu|karena itu|ke depan(nya)?|akhirnya|pada intinya'
                           r'|alhasil|walhasil|dengan kata lain|dengan (begitu|cara ini)|melalui (langkah|upaya|pendekatan) (ini|tersebut)'
                           r'|dengan (kebersamaan|langkah|upaya|komitmen|sinergi|kolaborasi)\b)', re.I)
HUBUNG = re.compile(r'^(selain itu|tak hanya itu|bukan hanya itu|tidak kalah penting(nya)?|tak kalah penting(nya)?|meski begitu'
                    r'|kendati demikian|hanya saja|pada saat yang sama|lebih lanjut|lebih jauh|di sisi lain|oleh karena itu|oleh sebab itu|karena itu|dengan demikian'
                    r'|namun demikian|meskipun demikian|walaupun demikian|akan tetapi|adapun|sementara itu|di samping itu'
                    r'|tidak hanya itu|terlebih lagi|pada dasarnya|secara umum|secara keseluruhan|dalam hal ini|lebih dari itu'
                    r'|selanjutnya|namun|furthermore|moreover|additionally|in addition|however|consequently|therefore'
                    r'|nevertheless|overall|ultimately|notably|importantly|that said|that being said)\b', re.I)
SIGNIFIKAN = re.compile(r'\b(signifikan|significant(ly)?)\b', re.I)
UJI = re.compile(r'\b(uji|taraf|selang kepercayaan|nilai[- ]p|statistik\w*|statistically|test|p-value|confidence)\b|\bp ?[<=\u2264>]', re.I)
KUANTOR = re.compile(r'\b(berbagai|sejumlah|beragam|aneka|segudang|beberapa|sebagian besar|puluhan|ratusan|ribuan|jutaan'
                     r'|banyak (faktor|hal|pihak|kalangan|negara|aspek|kajian|studi|penelitian)'
                     r'|various|numerous|a number of|several|a variety of|myriad)\b', re.I)
# Bukan "relatif": "kelembapan relatif" istilah resmi.
HEDGE = {'mungkin', 'barangkali', 'kemungkinan', 'kiranya', 'agaknya', 'tampaknya', 'sepertinya', 'cenderung',
         'diperkirakan', 'diduga', 'berpotensi', 'berpeluang', 'ditengarai', 'disinyalir', 'terindikasi', 'dimungkinkan',
         'seolah', 'seakan', 'perhaps', 'possibly', 'potentially', 'presumably', 'seemingly', 'apparently', 'arguably'}
ITEM = r"[^\W\d_][\w/-]*(?: [^\W\d_][\w/-]*){0,2}"
# "X, termasuk Y dan Z" dan sejenisnya adalah daftar dua butir sesudah pengantar, bukan tiga-serangkai
TRI = re.compile(rf"(?<!, )\b({ITEM}), (?!(?:termasuk|yaitu|yakni|seperti|misalnya|terutama|khususnya|antara lain|including|such as)\b)"
                 rf"({ITEM}),? (?:dan|serta|atau|maupun|and|or) ({ITEM})\b", re.I)
ABSTRAK = set('''efektif efisien akuntabel transparan partisipatif inklusif adaptif tangguh berkelanjutan terpadu terintegrasi
menyeluruh holistik komprehensif sinergis kolaboratif inovatif responsif cepat tepat akurat terukur terarah sistematis optimal
aman nyaman sejahtera mandiri berdaya produktif profesional kredibel andal solid sinergi kolaborasi inovasi integritas komitmen
transparansi akuntabilitas efektivitas efisiensi keberlanjutan ketangguhan kemandirian kesiapsiagaan kepedulian
penguatan perluasan pendalaman peningkatan pengembangan percepatan pemberdayaan optimalisasi revitalisasi harmonisasi
sinkronisasi akselerasi transformasi pembenahan penajaman
efficient effective sustainable resilient inclusive transparent accountable innovative seamless robust scalable reliable
innovation inspiration insight insights collaboration empowerment excellence'''.split())
LABEL_TEBAL = re.compile(r'^\s*\*\*[^*]{1,40}?(:\*\*|\*\*\s*:)')
# Penanda tanpa kata untuk [@kunci], token angka, dan catatan kaki di teks bersih, supaya sumber terbaca per kalimat.
MARK = '\ue000'
# Rujukan: kunci, token, catatan kaki, label "Sumber:", sitasi (Nama, 2023) atau Nama (2023), nomor regulasi.
# "sumber daya" bukan rujukan, dan tahun dalam kurung seperti "(Maret 2024)" juga bukan.
SUMBER = re.compile(r'\[-?@|(?<![\w@.])@[a-z0-9]+-|\[\^|\{\{angka:|' + MARK + r'|\b[Ss]umber\s*:'
                    r'|\b([Mm]enurut|[Bb]erdasarkan|[Aa]ccording to) (data |laporan |catatan |hasil |kajian )?[A-Z]'
                    r'|\([A-Z][^(),]{0,60}, (1[89]|20)\d{2}[a-z]?(, hlm\.[^)]*)?[);]'
                    r'|[A-Z][\w-]+(?: (?:&|dan) [A-Z][\w-]+)? \((1[89]|20)\d{2}[a-z]?\)'
                    r'|\b(UU|PP|Perpres|Perka|Perban|Inpres|Keppres|Perda|Pergub|Perbup|Perwal|Permen\w*|Kepmen\w*)( [A-Z]+)?'
                    r' \d+/(1[89]|20)\d{2}\b|\bNomor \d+ Tahun (1[89]|20)\d{2}\b'
                    r'|\b(dkk|et al)\.|\b(?i:data|laporan|catatan|publikasi|dokumen|rilis|survei|sensus|statistik|peta) [A-Z]{2,}')
TAHUN = re.compile(r'\b(1[89]|20)\d{2}(?:/\d{2,4})?\b')
KATA = re.compile(r"[^\W_]+(?:[-'\u2019][^\W_]+)*")
ID_UMUM = set('yang dan di dengan untuk ini dari pada dalam tidak adalah akan oleh atau ke'.split())
EN_UMUM = set('the and of to is that for with are this be in on by as'.split())

# Kata Inggris yang punya padanan baku. Urutan: frasa panjang dulu supaya satu tempat cocok sekali.
PADANAN = [
    ('early warning systems?', 'sistem peringatan dini'), ('early warning', 'peringatan dini'),
    ('capacity building', 'peningkatan kapasitas'), ('best practices?', 'praktik baik'),
    ('lessons? learn(?:ed|t)', 'pelajaran'), ('key performance indicators?', 'indikator kinerja utama'),
    ('risk assessments?', 'kajian risiko'), ('rapid assessments?', 'kaji cepat'),
    ('needs? assessments?', 'kajian kebutuhan'), ('contingency plans?', 'rencana kontinjensi'),
    ('action plans?', 'rencana aksi'), ('policy briefs?', 'ringkasan kebijakan'),
    ('build back better', 'membangun kembali lebih baik'), ('worst[- ]case(?: scenarios?)?', 'skenario terburuk'),
    ('real[- ]time', 'waktu nyata'), ('big data', 'mahadata'), ('quick wins?', 'hasil cepat'),
    ('community[- ]based', 'berbasis masyarakat'), ('stakeholders?', 'pemangku kepentingan'),
    ('framework', 'kerangka kerja'), ('roadmaps?', 'peta jalan'), ('timelines?', 'linimasa'),
    ('milestones?', 'tonggak capaian'), ('deadlines?', 'tenggat'), ('feedback', 'umpan balik'),
    ('insights?', 'temuan'), ('tools', 'perangkat'), ('outputs?', 'keluaran'), ('outcomes?', 'hasil'),
    ('inputs?', 'masukan'), ('impacts?', 'dampak'), ('updates?|updated|updating', 'pembaruan'),
    ('upgrades?', 'peningkatan'), ('issues?', 'isu'), ('planning', 'perencanaan'), ('monitoring', 'pemantauan'),
    ('evaluation', 'evaluasi'), ('assessments?', 'kajian'), ('mapping', 'pemetaan'), ('triggers?', 'pemicu'),
    ('governance', 'tata kelola'), ('database', 'basis data'), ('dashboards?', 'dasbor'), ('online', 'daring'),
    ('offline', 'luring'), ('hotspots?', 'titik panas'), ('benchmark(?:s|ing)?', 'pembanding'),
    ('mainstreaming', 'pengarusutamaan'), ('resilien(?:ce|t)', 'ketangguhan'), ('preparedness', 'kesiapsiagaan'),
    ('recovery', 'pemulihan'), ('hazards?', 'bahaya'), ('vulnerabilit(?:y|ies)', 'kerentanan'),
    ('exposure', 'keterpaparan'), ('awareness', 'kesadaran'), ('workshops?', 'lokakarya'), ('meetings?', 'rapat'),
    ('sharing', 'berbagi'), ('sustainab(?:le|ility)', 'berkelanjutan'), ('leverag(?:e|ing)', 'memanfaatkan'),
    ('shelters?', 'tempat pengungsian'), ('disasters?', 'bencana'), ('mitigation', 'mitigasi'),
    ('evacuation', 'evakuasi'), ('response', 'respons'), ('clusters?', 'klaster'),
]
PADANAN_RX = re.compile('|'.join(rf'(?P<p{i}>\b(?:{p})\b)' for i, (p, _) in enumerate(PADANAN)), re.I)

# ---------------------------------------------------------------- ambang anti-AI per bab (Buku Pegangan Angka & copy; PEDOMAN D4)
PER_KATA, AMBANG_TITIK_DUA, AMBANG_HEDGE, KATA_PEMBUKA = 1500, 20, 2, 50
# kode yang dihitung sebagai pelanggaran ambang; vonis per bab: 0 LULUS, 1-2 GAGAL RINGAN, 3 atau lebih GAGAL BERAT
AMBANG_KODE = ('S-1', 'S-17', 'S-18', 'S-40', 'S-41', 'S-42', 'S-43')
PEMBUKA_KLISE = re.compile(r'\b(di era|dalam lanskap|seiring (perkembangan|berjalannya|bergulirnya) (zaman|waktu)'
                           r'|(tidak|tak) (dapat |bisa )?(di)?(pungkiri|mungkiri)|pada hakikatnya|sebagaimana (yang )?(kita )?(ketahui|maklumi)'
                           r'|dalam rangka|perlu diketahui|in the realm of|in today\'?s|in an era|as we navigate|in the ever-evolving'
                           r'|it is (important|worth) (to note|considering)|when it comes to|at its core|at the heart of)\b', re.I)
HEDGE_FRASA = re.compile(r'\b(perlu dicatat bahwa|patut dicatat|penting untuk diperhatikan|dapat dikatakan bahwa)\b', re.I)
# kata samar dihitung bila kalimatnya tanpa angka data dan tanpa rujukan ("cenderung" tanpa data, PEDOMAN D4)
HEDGE_SAMAR = {'tampaknya', 'sepertinya', 'agaknya', 'kiranya', 'barangkali', 'mungkin', 'cenderung', 'ditengarai', 'disinyalir',
               'diduga', 'seolah', 'seakan', 'seolah-olah', 'seakan-akan'}
# padanan Indonesia daftar pemilik (Buku Pegangan Angka & copy); daftar Inggris dibaca dari banned-ai-words.txt untuk teks Inggris
KATA_AI_ID = ('mulus', 'menavigasi', 'mendalami', 'menyelami', 'memulai perjalanan', 'memupuk', 'mendayagunakan', 'kokoh', 'permadani')
BANNED = Path(__file__).resolve().parent.parent / 'riset' / 'anti-slop' / 'banned-ai-words.txt'
KATA_AI_EN = tuple(b.strip().replace('-', ' ') for b in (BANNED.read_text(encoding='utf-8').splitlines() if BANNED.exists() else [])
                   if b.strip() and not b.startswith('#'))
KATA_AI_RX = {
    'id': re.compile(r'\b(' + '|'.join(re.escape(k) for k in KATA_AI_ID) + r')\b', re.I),
    'en': re.compile(r'\b(' + '|'.join(re.escape(k).replace(r'\ ', r'[ -]') for k in sorted(KATA_AI_EN, key=len, reverse=True)) + r')\b', re.I)
    if KATA_AI_EN else None,
}
# set tiga istilah resmi yang dihitung faktual seperti nama diri: tahap penyelenggaraan UU 24/2007 Pasal 33 (T10) dan komponen IRBI
TIGA_RESMI = ({'prabencana', 'tanggap darurat', 'pascabencana'}, {'bahaya', 'kerentanan', 'kapasitas'})
LABEL_TITIK_DUA = re.compile(r'^\s*(sumber|catatan|keterangan|keyakinan|catatan kaki)\s*:', re.I)

JENIS_PROSA = {'isi', 'butir', 'kotak', 'catatan', 'slide'}
JENIS_ALUR = {'isi', 'butir', 'kotak'}
SINGKATAN = r'(?:dkk|hlm|no|kab|prov|kec|kel|jl|kav|dll|dsb|dst|tsb|tbk|dr|ir|prof|drs|hj|vol|ed|al|mis|bdk|cf|vs|sbb|yth|fig|gbr|pt|cv|e\.g|i\.e)'


# ---------------------------------------------------------------- teks

def bersihkan(mentah):
    """Teks Markdown/naskah menjadi teks polos untuk dibaca pola. Token angka jadi angka; rujukan jadi MARK."""
    t = mentah.replace('\\*', '\x00')
    t = re.sub(r'\{\{angka:[^}]*\}\}', '123' + MARK, t)
    t = re.sub(r'\[-?@[^\]]*\]|\[\^[^\]]*\]', MARK, t)
    t = re.sub(r'(?<![\w@])@(?:tbl|gbr|sub|bab|lamp|rek):[\w-]+', 'Tabel 1', t)
    t = re.sub(r'(?<![\w@.])@[a-z0-9]+(?:-[a-z0-9]+)+', 'Penulis (2024)', t)
    t = re.sub(r'\{#[^}]*\}|`[^`]*`', '', t)
    t = re.sub(r'\\([\[\]{}@|])', r'\1', t)
    t = t.replace('**', '')
    t = re.sub(r'(?<![\w*])\*(?=\S)([^*]+?)(?<=\S)\*(?![\w*])', r'\1', t)
    return re.sub(r'\s+', ' ', t.replace('\x00', '*')).strip()


def jumlah_kata(teks):
    return len(KATA.findall(teks))


def pecah_kalimat(teks):
    hasil = []
    for b in re.split(r'(?<=[.!?])\s+(?=["\u201c(\[]?[A-Z0-9])', teks):
        if hasil and re.search(rf'(?:\b{SINGKATAN}|\b[A-Z])\.$', hasil[-1], re.I):
            hasil[-1] += ' ' + b
        elif b.strip():
            hasil.append(b.strip())
    return hasil


def _tanpa_kutip(teks):
    """Kutipan langsung dilewati pemeriksaan frasa hanya bila pendek (label, istilah: 4 kata atau kurang) atau
    rujukannya menyusul di kalimat yang sama. Kutipan panjang tanpa rujukan diperiksa seperti prosa, supaya
    tanda petik tidak dipakai mencuci slop."""
    def ganti(m):
        sesudah = teks[m.end():m.end() + 120].split('. ')[0]
        return ' ' if jumlah_kata(m.group(0)) <= 4 or SUMBER.search(sesudah) else m.group(0)
    return re.sub(r'\u201c[^\u201d]*\u201d|"[^"]*"', ganti, teks)


def angka_data(teks):
    """Ada angka selain tahun. Tahun ("pada 2026", "2026/2027") tidak membuat paragraf berdata."""
    return bool(re.search(r'\d', TAHUN.sub('', teks)))


def _kata_awal(kalimat, n=1):
    k = [w.lower() for w in KATA.findall(kalimat)[:n]]
    return ' '.join(k) if len(k) == n else ''


def _ada_sumber(mentah):
    return bool(SUMBER.search(mentah))


def _bahasa(teks):
    kata = [w.lower() for w in KATA.findall(teks)]
    return 'en' if sum(w in EN_UMUM for w in kata) > sum(w in ID_UMUM for w in kata) else 'id'


def _tingkat(bobot):
    return 'kritis' if bobot >= KRITIS else 'tinggi' if bobot >= TINGGI else 'sedang' if bobot >= SEDANG else 'rendah'


def _t(kode, bobot, lokasi, cuplikan, saran=None):
    return {'kode': kode, 'aturan': NAMA[kode], 'bobot': bobot, 'tingkat': _tingkat(bobot), 'lokasi': lokasi,
            'cuplikan': cuplikan.replace(MARK, '').strip()[:100], 'saran': saran or SARAN[kode]}


def _para(jenis, mentah, lokasi, dalam=None):
    return {'jenis': jenis, 'mentah': mentah, 'teks': bersihkan(mentah), 'lokasi': lokasi, 'dalam': dalam}


# ---------------------------------------------------------------- pembaca berkas

def baca_md(teks, nama):
    """Markdown dan dialek naskah (front matter, token, blok :::). Satu unit per judul '#'."""
    baris = teks.split('\n')
    unit = [[nama, []]]
    mulai = 0
    if baris and baris[0].strip() == '---':
        for k in range(1, len(baris)):
            if baris[k].strip() == '---':
                mulai = k + 1
                break
    st = {'blok': [], 'jenis': None, 'baris': 0, 'direktif': [], 'atribut': False, 'kode': False}

    def simpan():
        if st['blok']:
            mentah = ' '.join(s.strip() for s in st['blok'])
            dalam = st['direktif'][-1] if st['direktif'] else None
            unit[-1][1].append(_para(st['jenis'], mentah, f"{nama}:{st['baris']}", dalam))
        st['blok'], st['jenis'] = [], None

    for k in range(mulai, len(baris)):
        b, no = baris[k], k + 1
        s = b.strip()
        if s.startswith('```') or s.startswith('~~~'):
            simpan()
            st['kode'] = not st['kode']
            continue
        if st['kode']:
            continue
        m = re.match(r'^(:{3,})\s*([\w-]*)', s)
        if m:
            simpan()
            if m.group(2):
                st['direktif'].append(m.group(2))
                st['atribut'] = True
            elif st['direktif']:
                st['direktif'].pop()
            continue
        if not s or re.fullmatch(r'[-*_]{3,}', s):
            simpan()
            st['atribut'] = False
            continue
        if st['atribut'] and re.match(r'^[\w-]+:\s', s):
            simpan()
            unit[-1][1].append(_para('atribut', s.split(':', 1)[1].strip(), f'{nama}:{no}', st['direktif'][-1]))
            continue
        st['atribut'] = False
        h = re.match(r'^(#{1,6})\s+(.*)$', s)
        if h:
            simpan()
            judul = re.sub(r'\s*\{#[^}]*\}\s*$', '', h.group(2)).strip()
            if len(h.group(1)) == 1:
                if unit[-1][1]:
                    unit.append([judul, []])
                else:
                    unit[-1][0] = judul
            unit[-1][1].append(_para('judul', judul, f'{nama}:{no}'))
            continue
        if s.startswith('|'):
            simpan()
            if not re.fullmatch(r'\|?[\s:|-]+\|?', s):
                unit[-1][1].append(_para('tabel', s, f'{nama}:{no}', st['direktif'][-1] if st['direktif'] else None))
            continue
        if re.match(r'^\[\^[^\]]+\]:', s):
            simpan()
            unit[-1][1].append(_para('catatan', s.split(':', 1)[1].strip(), f'{nama}:{no}'))
            continue
        if s.startswith('>'):
            if st['jenis'] != 'kutipan':
                simpan()
                st['jenis'], st['baris'] = 'kutipan', no
            st['blok'].append(s.lstrip('> '))
            continue
        li = re.match(r'^\s*(?:[-*+]|\d+[.)])\s+(.*)$', b)
        if li:
            simpan()
            st['jenis'], st['baris'] = ('kotak' if st['direktif'] else 'butir'), no
            st['blok'].append(li.group(1))
            continue
        if not st['blok']:
            st['jenis'], st['baris'] = ('kotak' if st['direktif'] else 'isi'), no
        st['blok'].append(s)
    simpan()
    return [u for u in unit if u[1]]


def baca_txt(teks, nama):
    paras, blok, awal = [], [], 0
    for k, b in enumerate(teks.split('\n') + [''], 1):
        if b.strip():
            if not blok:
                awal = k
            blok.append(b.strip())
        elif blok:
            mentah = ' '.join(blok)
            butir = re.match(r'^(?:[-*\u2022]|\d+[.)])\s+', mentah)
            paras.append(_para('butir' if butir else 'isi', mentah[butir.end():] if butir else mentah, f'{nama}:{awal}'))
            blok = []
    return [[nama, paras]] if paras else []


W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def _nyala(el, attr):
    if el is None:
        return False
    v = el.get(attr)
    return v is None or v.lower() not in ('0', 'false', 'off', 'none')


def _bungkus(potongan):
    """[(teks, tebal, miring)] menjadi teks bertanda ** dan * seperti Markdown."""
    gabung = []
    for t, b, i in potongan:
        if gabung and (gabung[-1][1], gabung[-1][2]) == (b, i):
            gabung[-1][0] += t
        else:
            gabung.append([t, b, i])
    keluar = []
    for t, b, i in gabung:
        inti = t.strip()
        if not inti or not (b or i):
            keluar.append(t)
            continue
        tanda = ('**' if b else '') + ('*' if i else '')
        keluar.append(t[:len(t) - len(t.lstrip())] + tanda + inti + tanda[::-1] + t[len(t.rstrip()):])
    return ''.join(keluar)


def _jalan_w(el, potongan):
    for c in el:
        if c.tag in (W + 'del', W + 'moveFrom', W + 'instrText', W + 'delText', W + 'pPr', W + 'rPr'):
            continue
        if c.tag == W + 'r':
            rpr = c.find(W + 'rPr')
            b = _nyala(rpr.find(W + 'b') if rpr is not None else None, W + 'val')
            i = _nyala(rpr.find(W + 'i') if rpr is not None else None, W + 'val')
            for x in c:
                if x.tag == W + 't' and x.text:
                    potongan.append((x.text, b, i))
                elif x.tag in (W + 'tab', W + 'br', W + 'cr'):
                    potongan.append((' ', b, i))
                elif x.tag == W + 'noBreakHyphen':
                    potongan.append(('-', b, i))
                elif x.tag in (W + 'footnoteReference', W + 'endnoteReference'):
                    potongan.append(('[^%s]' % x.get(W + 'id'), False, False))
        else:
            _jalan_w(c, potongan)


def _jenis_docx(nama, tingkat, daftar, tabel):
    if re.match(r'(toc|daftar (isi|tabel|gambar|lampiran)|table of (contents|figures)|index)', nama):
        return None, None
    m = re.search(r'(?:heading|judul)\s*(\d)', nama)
    if m:
        return 'judul', int(m.group(1))
    if tingkat is not None and tingkat < 9:
        return 'judul', tingkat + 1
    if re.match(r'(title|subtitle|judul|subjudul|heading)', nama):
        return 'judul', 0
    if tabel:
        return 'tabel', None
    for pola, jenis in (('caption|keterangan', 'keterangan'), ('pertanyaan|question', 'pertanyaan'),
                        ('quote|kutipan|pustaka|bibliograf|referen', 'kutipan'),
                        ('sumber|source|label|pil\\b|kepala', 'label')):
        if re.search(pola, nama):
            return jenis, None
    if daftar or re.match(r'(list|daftar)', nama):
        return 'butir', None
    return 'isi', None


def baca_docx(jalur):
    z = zipfile.ZipFile(jalur)
    nama = Path(jalur).name
    gaya = {}
    if 'word/styles.xml' in z.namelist():
        for s in ET.fromstring(z.read('word/styles.xml')).iter(W + 'style'):
            nm = s.find(W + 'name')
            ol = s.find(f'{W}pPr/{W}outlineLvl')
            gaya[s.get(W + 'styleId')] = ((nm.get(W + 'val') if nm is not None else s.get(W + 'styleId') or '').lower(),
                                          int(ol.get(W + 'val')) if ol is not None else None)
    datar, hitung = [], [0]

    def para(p, tabel):
        hitung[0] += 1
        ppr = p.find(W + 'pPr')
        ps = ppr.find(W + 'pStyle') if ppr is not None else None
        sid = ps.get(W + 'val') if ps is not None else ''
        nm, tk = gaya.get(sid, (sid.lower(), None))
        ol = ppr.find(W + 'outlineLvl') if ppr is not None else None
        if ol is not None:
            tk = int(ol.get(W + 'val'))
        daftar = ppr is not None and ppr.find(W + 'numPr') is not None
        jenis, tingkat = _jenis_docx(nm, tk, daftar, tabel)
        potongan = []
        _jalan_w(p, potongan)
        mentah = _bungkus(potongan).strip()
        if jenis and mentah:
            datar.append((tingkat, _para(jenis, mentah, f'{nama} p.{hitung[0]}')))

    def jalan(el, tabel=False):
        for c in el:
            if c.tag == W + 'p':
                para(c, tabel)
            elif c.tag == W + 'tbl':
                for p in c.iter(W + 'p'):
                    para(p, True)
            elif c.tag == W + 'sdt':
                g = c.find(f'.//{W}docPartGallery')
                if g is not None and 'contents' in (g.get(W + 'val') or '').lower():
                    continue
                isi = c.find(W + 'sdtContent')
                if isi is not None:
                    jalan(isi, tabel)

    jalan(ET.fromstring(z.read('word/document.xml')).find(W + 'body'))
    ada_h1 = any(t == 1 for t, _ in datar)
    unit = [['Bagian awal', []]]
    for tingkat, p in datar:
        pisah = tingkat == 1 if ada_h1 else re.match(r'^BAB\s+\d+\b', p['teks'])
        if pisah:
            if unit[-1][1]:
                unit.append([p['teks'], []])
            else:
                unit[-1][0] = p['teks']
        unit[-1][1].append(p)
    if 'word/footnotes.xml' in z.namelist():
        catatan = []
        for fn in ET.fromstring(z.read('word/footnotes.xml')).iter(W + 'footnote'):
            if fn.get(W + 'type') in ('separator', 'continuationSeparator', 'continuationNotice'):
                continue
            for p in fn.iter(W + 'p'):
                potongan = []
                _jalan_w(p, potongan)
                mentah = _bungkus(potongan).strip()
                if mentah:
                    catatan.append(_para('catatan', mentah, f"{nama} catatan kaki {fn.get(W + 'id')}"))
        if catatan:
            unit.append(['Catatan kaki', catatan])
    return [u for u in unit if u[1]]


def _urutan_slide(z):
    try:
        pres = ET.fromstring(z.read('ppt/presentation.xml'))
        rels = ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))
        peta = {r.get('Id'): r.get('Target') for r in rels}
        urut = []
        for s in pres.iter(P + 'sldId'):
            t = peta.get(s.get(R + 'id'), '')
            urut.append(t.lstrip('/') if t.startswith('/') else posixpath.normpath('ppt/' + t))
        if urut:
            return urut
    except KeyError:
        pass
    return sorted((n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)),
                  key=lambda n: int(re.search(r'(\d+)\.xml$', n).group(1)))


def baca_pptx(jalur):
    z = zipfile.ZipFile(jalur)
    nama = Path(jalur).name
    unit = []
    for n, bagian in enumerate(_urutan_slide(z), 1):
        root = ET.fromstring(z.read(bagian))
        di_tabel = {id(p) for t in root.iter(A + 'tbl') for p in t.iter(A + 'p')}
        paras = []
        for k, p in enumerate(root.iter(A + 'p'), 1):
            potongan = []
            for c in p:
                if c.tag in (A + 'r', A + 'fld'):
                    rpr, t = c.find(A + 'rPr'), c.find(A + 't')
                    b = rpr is not None and rpr.get('b') in ('1', 'true')
                    i = rpr is not None and rpr.get('i') in ('1', 'true')
                    potongan.append((t.text or '' if t is not None else '', b, i))
                elif c.tag == A + 'br':
                    potongan.append((' ', False, False))
            mentah = _bungkus(potongan).strip()
            if mentah:
                paras.append(_para('tabel' if id(p) in di_tabel else 'slide', mentah, f'{nama} slide {n} par.{k}'))
        if paras:
            unit.append([f'Slide {n}', paras])
    return unit


# ---------------------------------------------------------------- penilaian

def _nama_diri(teks, m):
    """Kata berhuruf besar di tengah kalimat, atau di awal kalimat diikuti kata berhuruf besar (Sendai Framework)."""
    if not m.group(0)[0].isupper():
        return False
    kiri = teks[:m.start()]
    if kiri.strip() and not re.search(r'[.!?:;]\s*["\u201c(]?$', kiri):
        return True
    kanan = re.match(r'\s+([^\W\d_])', teks[m.end():])
    return bool(kanan and kanan.group(1).isupper())


def _padanan(p, terpakai):
    miring = {m.group(1).strip().lower() for m in re.finditer(r'(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)', p['mentah'])}
    keluar = []
    for m in PADANAN_RX.finditer(p['teks']):
        if _nama_diri(p['teks'], m):
            continue
        kata = m.group(0).lower()
        if kata not in terpakai and any(kata in s for s in miring):
            terpakai.add(kata)          # istilah asing miring boleh sekali per bab
            continue
        pad = PADANAN[int(m.lastgroup[1:])][1]
        keluar.append(_t('S-38', 2, p['lokasi'], m.group(0), f'Pakai "{pad}"; istilah teknis tanpa padanan ditulis miring.'))
    return keluar


def _tumpuk_hedge(kalimat):
    kata = [w.lower() for w in KATA.findall(kalimat)]
    pos = [i for i, w in enumerate(kata) if w in HEDGE]
    return any(b - a <= 6 for a, b in zip(pos, pos[1:]))


def _kalimat(p, T, alur):
    j, lok = p['jenis'], p['lokasi']
    kal = pecah_kalimat(_tanpa_kutip(p['teks']))
    ragu = set()
    for k in kal:
        n = jumlah_kata(k)
        if n > KALIMAT_PANJANG:
            T.append(_t('S-30', 2, lok, f'{n} kata: {k[:70]}'))
        if k.endswith('?') and p['dalam'] != 'keputusan':
            T.append(_t('S-22', SEDANG, lok, k))
        if SIGNIFIKAN.search(k) and not UJI.search(k):
            T.append(_t('S-32', SEDANG, lok, k))
        if not angka_data(k):
            T += [_t('S-33', RENDAH, lok, m.group(0)) for m in KUANTOR.finditer(k)]
        if not SUMBER.search(k):
            T += [_t('S-34', TINGGI, lok, m.group(0)) for rx in ATRIBUSI for m in rx.finditer(k)]
        if _tumpuk_hedge(k):
            T.append(_t('S-31', SEDANG, lok, k))
        ragu |= {w.lower() for w in KATA.findall(k)} & HEDGE
    if len(ragu) >= 3 and jumlah_kata(p['teks']) >= 30:
        T.append(_t('S-31', SEDANG, lok, f'{len(ragu)} penanda ketidakpastian dalam satu paragraf: {", ".join(sorted(ragu))}'))
    akhir = kal[-1] if kal else ''
    if len(kal) >= 2 and j in JENIS_ALUR and (PENUTUP.match(akhir) or (
            PENUTUP_LUNAK.match(akhir) and not angka_data(akhir) and not SUMBER.search(akhir))):
        T.append(_t('S-21', TINGGI, lok, akhir))
    if j in JENIS_ALUR:
        alur += [(p, k) for k in kal]


def _alur(alur, kata, T):
    """Pola lintas kalimat: kata hubung dan pembuka sama (tiga-serangkai dinilai per kemunculan di _tiga)."""
    hub_lalu = False
    n_hub = 0
    awal_lalu, ulang = None, 0
    for p, k in alur:
        lok = p['lokasi']
        hub = bool(HUBUNG.match(k))
        n_hub += hub
        if hub and hub_lalu:
            T.append(_t('S-25', SEDANG, lok, k[:60]))
        hub_lalu = hub
        if p['jenis'] == 'isi':
            w = _kata_awal(k)
            ulang = ulang + 1 if w and w == awal_lalu else 1
            awal_lalu = w
            if ulang == 3 and w not in ('bab', 'tabel', 'gambar', 'lampiran') and not w.isdigit():
                T.append(_t('S-26', SEDANG, lok, f'tiga kalimat berturut dibuka "{w}"'))
    if len(alur) >= 8 and n_hub / len(alur) > 0.25:
        T.append(_t('S-25', TINGGI, alur[0][0]['lokasi'], f'{n_hub} dari {len(alur)} kalimat dibuka kata hubung'))


def _tiga(paras, T):
    """Tiga-serangkai per kemunculan (Buku Pegangan Angka & copy: tiga-serangkai gaya nol). Abstrak: S-17. Gaya: S-18.
    Set istilah resmi TIGA_RESMI tidak dihitung di mana pun. Di DOCX dan naskah daftar faktual (tiap butir memuat nama diri atau
    angka) juga tidak dihitung; di deck (teks slide) pengecualian itu tidak berlaku."""
    for p in paras:
        if p['jenis'] not in JENIS_PROSA:
            continue
        for k in pecah_kalimat(_tanpa_kutip(p['teks'])):
            for m in TRI.finditer(k):
                g = m.groups()
                if sum(any(w.lower() in ABSTRAK for w in x.split()) for x in g) >= 2:
                    T.append(_t('S-17', TINGGI, p['lokasi'], m.group(0)))
                    continue
                ada = lambda x, st: {r for r in st if re.search(rf'\b{r}\b', x.lower())}
                if any(all(ada(x, st) for x in g) and len(set().union(*(ada(x, st) for x in g))) == 3 for st in TIGA_RESMI):
                    continue  # set istilah resmi, juga di slide (subjudul kajian mitigasi, KEPUTUSAN T10)
                if p['jenis'] != 'slide' and all(any(w[0].isupper() or any(c.isdigit() for c in w) for w in x.split()) for x in g):
                    continue  # daftar faktual nama diri atau angka: hanya di DOCX dan naskah
                # bobot 0: tiga-serangkai gaya dihitung di vonis ambang (gerbang T-8), tidak menggeser skor slop yang dikalibrasi
                T.append(_t('S-18', 0, p['lokasi'], m.group(0)))


def _ambang(paras, T):
    """Ambang terukur skill anti-ai-checker yang dipakai kajian (PEDOMAN D4): titik dua dan hedging per 1.500 kata,
    pembuka klise di 50 kata pertama tiap bab dan subbab, kata terlarang khas AI."""
    isi = [p for p in paras if p['jenis'] == 'isi']
    kata_isi = sum(jumlah_kata(p['teks']) for p in isi)
    titik_dua = 0
    for p in isi:
        t = LABEL_TITIK_DUA.sub('', p['teks'])
        t = re.sub(r'https?://\S+|\d:\d', '', t)
        titik_dua += t.count(':')
    batas = AMBANG_TITIK_DUA * max(1, kata_isi / PER_KATA)
    if titik_dua > batas:
        T.append(_t('S-40', SEDANG, isi[0]['lokasi'], f'{titik_dua} titik dua dalam {kata_isi} kata paragraf isi > {batas:.0f}'))
    prosa = [p for p in paras if p['jenis'] in JENIS_PROSA]
    kata = sum(jumlah_kata(p['teks']) for p in prosa)
    ragu = []
    for p in prosa:
        for k in pecah_kalimat(_tanpa_kutip(p['teks'])):
            ragu += [(p, m.group(0)) for m in HEDGE_FRASA.finditer(k)]
            if not angka_data(k) and not SUMBER.search(k):
                ragu += [(p, w) for w in KATA.findall(k) if w.lower() in HEDGE_SAMAR]
    batas = AMBANG_HEDGE * max(1, kata / PER_KATA)
    if len(ragu) > batas:
        T.append(_t('S-41', SEDANG, ragu[0][0]['lokasi'],
                    f'{len(ragu)} penanda ragu dalam {kata} kata > {batas:.0f}: ' + ', '.join(dict.fromkeys(w.lower() for _, w in ragu))))
    # pembuka klise: jendela 50 kata prosa sesudah tiap judul (bab dan subbab)
    jendela = None
    for p in paras:
        if p['jenis'] == 'judul':
            jendela = KATA_PEMBUKA
            continue
        if jendela is None or jendela <= 0 or p['jenis'] not in JENIS_ALUR:
            continue
        kata_p = KATA.findall(p['teks'])
        potong = ' '.join(kata_p[:int(jendela)])
        lihat = [m.group(0) for m in PEMBUKA_KLISE.finditer(potong)]
        lihat += [m.group(0) for kode, _, rx, _ in POLA if kode in ('S-8', 'S-9') for m in rx.finditer(potong)]
        for x in dict.fromkeys(lihat):
            T.append(_t('S-42', TINGGI, p['lokasi'], f'"{x}" di {KATA_PEMBUKA} kata pertama sesudah judul'))
        jendela -= len(kata_p)
    for p in prosa:
        rx = [KATA_AI_RX['id']] + ([KATA_AI_RX['en']] if KATA_AI_RX['en'] is not None and _bahasa(p['teks']) == 'en' else [])
        for r_ in rx:
            T += [_t('S-43', SEDANG, p['lokasi'], m.group(0)) for m in r_.finditer(_tanpa_kutip(p['teks']))]


def vonis_ambang(temuan):
    """Vonis tiga tingkat per bab (Buku Pegangan Angka & copy, PEDOMAN D4): 0 LULUS, 1-2 GAGAL RINGAN, 3 atau lebih GAGAL BERAT."""
    n = sum(1 for t in temuan if t['kode'] in AMBANG_KODE)
    return n, 'LULUS' if n == 0 else 'GAGAL RINGAN' if n <= 2 else 'GAGAL BERAT'


def _kv(n):
    return statistics.pstdev(n) / statistics.mean(n)


def _paragraf(isi, T, tanpa_angka_sah=False):
    besar = [(p, jumlah_kata(p['teks'])) for p in isi if jumlah_kata(p['teks']) >= PARAGRAF_ISI]
    n = [b for _, b in besar]
    if len(n) >= 6 and _kv(n) < 0.2:
        T.append(_t('S-28', TINGGI, isi[0]['lokasi'], f'{len(n)} paragraf, rerata {statistics.mean(n):.0f} kata, KV {_kv(n):.2f} < 0,20'))
    else:
        # ponytail: ambang 0,10 dikalibrasi pada fixture, belum pada bab nyata bergaya Isi Temuan; kalibrasi ulang di sana
        lima = next((i for i in range(len(n) - 4) if _kv(n[i:i + 5]) < 0.10), None)
        if lima is not None:
            T.append(_t('S-28', TINGGI, besar[lima][0]['lokasi'], f'5 paragraf berturut, KV {_kv(n[lima:lima + 5]):.2f} < 0,10'))
    panjang = [jumlah_kata(k) for p in isi for k in pecah_kalimat(p['teks'])]
    if len(panjang) >= 12:
        kv = statistics.pstdev(panjang) / statistics.mean(panjang)
        if kv < 0.25:
            T.append(_t('S-29', SEDANG, isi[0]['lokasi'], f'{len(panjang)} kalimat, KV panjang {kv:.2f} < 0,25'))
    awal = [_kata_awal(p['teks'], 2) for p in isi]
    for i in range(2, len(awal)):
        if awal[i] and awal[i] == awal[i - 1] == awal[i - 2] and (i < 3 or awal[i - 3] != awal[i]):
            T.append(_t('S-26', SEDANG, isi[i]['lokasi'], f'tiga paragraf berturut dibuka "{awal[i]}"'))
    if not tanpa_angka_sah:     # aturan positif 4.2: tiap paragraf isi membawa angka atau rujukan
        T += [_t('S-37', TINGGI, p['lokasi'], p['teks'][:70]) for p in isi
              if jumlah_kata(p['teks']) >= PARAGRAF_ISI and not angka_data(p['teks']) and not _ada_sumber(p['mentah'])]


# Kode pola frasa yang dihitung gugusnya per paragraf (S-39); pola lintas kalimat dan tingkat bab tidak ikut.
FRASA = {f'S-{i}' for i in range(5, 37)} - {'S-13', 'S-18', 'S-25', 'S-26', 'S-27', 'S-28', 'S-29', 'S-30'}
TANPA_ANGKA = re.compile(r'(kata pengantar|prakata|sambutan)\b', re.I)


def _gugus(T):
    """Dua kode frasa berbeda atau lebih di satu paragraf dengan bobot 3 atau lebih: tinggi, berapa pun panjang babnya."""
    per = {}
    for t in T:
        if t['kode'] in FRASA:
            per.setdefault(t['lokasi'], []).append(t)
    return [_t('S-39', TINGGI, lok, ', '.join(sorted({t['kode'] for t in ts}, key=lambda k: int(k[2:]))))
            for lok, ts in per.items() if len({t['kode'] for t in ts}) >= 2 and sum(t['bobot'] for t in ts) >= 3]


def nilai_unit(judul, paras, final=False):
    T, alur, terpakai = [], [], set()
    kata = sum(jumlah_kata(p['teks']) for p in paras if p['jenis'] != 'tabel')
    bahasa = _bahasa(' '.join(p['teks'] for p in paras))
    for p in paras:
        for kode, bobot, rx, _ in KARAKTER:
            T += [_t(kode, bobot, p['lokasi'], p['mentah'][max(0, m.start() - 30):m.end() + 30]) for m in rx.finditer(p['mentah'])]
        if p['jenis'] == 'kutipan':
            continue
        teks = _tanpa_kutip(p['teks'])
        for kode, bobot, rx, lingkup in POLA:
            if (lingkup == 'prosa' and p['jenis'] not in JENIS_PROSA) or (lingkup == 'slide' and p['jenis'] != 'slide'):
                continue
            T += [_t(kode, bobot, p['lokasi'], m.group(0)) for m in rx.finditer(teks)]
        if bahasa == 'id':
            T += _padanan(p, terpakai)
        if p['jenis'] in JENIS_PROSA:
            _kalimat(p, T, alur)
    if alur:
        _alur(alur, kata, T)
    _tiga(paras, T)
    _ambang(paras, T)
    isi = [p for p in paras if p['jenis'] == 'isi']
    if isi:
        _paragraf(isi, T, bool(TANPA_ANGKA.match(judul)))
    T += _gugus(T)
    butir = [p for p in paras if p['jenis'] == 'butir']
    tebal = [p for p in butir if LABEL_TEBAL.match(p['mentah'])]
    if len(tebal) >= 3 and len(tebal) >= 0.6 * len(butir):
        T.append(_t('S-27', SEDANG, tebal[0]['lokasi'], f'{len(tebal)} dari {len(butir)} butir dibuka label tebal'))
    kosong = sum(t['kode'] == 'S-12' for t in T)
    padat = kosong * 1000 / max(kata, 1)
    if kata >= 200 and padat > PADAT_KOSONG:
        T.append(_t('S-13', TINGGI, paras[0]['lokasi'], f'{padat:.1f} kata kosong per 1.000 kata > {PADAT_KOSONG}'))
    skor = min(100, round(sum(t['bobot'] for t in T) * 1000 / max(kata, KATA_MIN)))
    n, vonis = vonis_ambang(T)
    return {'nama': judul, 'kata': kata, 'bahasa': bahasa, 'kata_kosong_per_1000': round(padat, 1), 'skor': skor,
            'status': _status(skor, T, final), 'pelanggaran': n, 'vonis': vonis, 'temuan': T}


def _status(skor, temuan, final):
    """Temuan kritis atau tinggi selalu GAGAL (Tahap 1 dan 3 ANTI-SLOP 6.1); draf dan final beda di ambang skor."""
    if any(t['bobot'] >= TINGGI for t in temuan):
        return 'GAGAL'
    if skor > (AMBANG_FINAL if final else AMBANG_DRAF):
        return 'GAGAL'
    return 'TINJAU' if not final and skor > AMBANG_TINJAU else 'LOLOS'


def _tandai_pustaka(unit):
    """Isi Daftar Pustaka adalah judul karya orang lain: hanya diperiksa karakternya, seperti kutipan."""
    for _, ps in unit:
        di_pustaka = False
        for p in ps:
            if p['jenis'] == 'judul':
                di_pustaka = bool(re.match(r'(daftar pustaka|pustaka|referensi|references|bibliograf\w*)$', p['teks'], re.I))
            elif di_pustaka and p['jenis'] in ('isi', 'butir'):
                p['jenis'] = 'kutipan'
    return unit


def _rangkum(nama, unit, final):
    hasil = [nilai_unit(j, ps, final) for j, ps in _tandai_pustaka(unit)]
    kata = sum(u['kata'] for u in hasil)
    bobot = sum(t['bobot'] for u in hasil for t in u['temuan'])
    status = 'GAGAL' if any(u['status'] == 'GAGAL' for u in hasil) else \
        'TINJAU' if any(u['status'] == 'TINJAU' for u in hasil) else 'LOLOS'
    return {'berkas': nama, 'kata': kata, 'skor': min(100, round(bobot * 1000 / max(kata, KATA_MIN))),
            'status': status, 'final': final, 'unit': hasil}


def periksa_teks(teks, nama='teks.md', final=False):
    baca = baca_txt if nama.endswith('.txt') else baca_md
    return _rangkum(nama, baca(teks, nama), final)


def periksa_berkas(jalur, final=False):
    jalur = Path(jalur)
    akhiran = jalur.suffix.lower()
    if akhiran == '.docx':
        return _rangkum(jalur.name, baca_docx(jalur), final)
    if akhiran == '.pptx':
        return _rangkum(jalur.name, baca_pptx(jalur), final)
    if akhiran in ('.md', '.txt', '.markdown'):
        return periksa_teks(jalur.read_text(encoding='utf-8'), jalur.name, final)
    raise ValueError(f'{jalur}: format tidak didukung (md, txt, docx, pptx)')


def _gagal(jalur_list, final, lewati):
    """(berkas, temuan, pesan) untuk tiap temuan di bab/slide yang GAGAL; kode di `lewati` tidak dihitung."""
    ambang = AMBANG_FINAL if final else AMBANG_DRAF
    for jalur in jalur_list:
        h = periksa_berkas(jalur, final)
        for u in h['unit']:
            T = [t for t in u['temuan'] if t['kode'] not in lewati]
            skor = min(100, round(sum(t['bobot'] for t in T) * 1000 / max(u['kata'], KATA_MIN)))
            if _status(skor, T, final) == 'GAGAL':
                for t in sorted(T, key=lambda t: -t['bobot']):
                    yield h['berkas'], t, (f"\"{t['cuplikan']}\" ({t['aturan']}, {t['tingkat']}); bab \"{u['nama']}\" "
                                           f"skor {skor}, ambang {ambang}; saran: {t['saran']}")


def temuan_gerbang(jalur_list, final=True, lewati=()):
    """Bentuk temuan periksa.py: [(berkas, lokasi, pesan)]. Jangan lewatkan S-1..S-3: D-1 dan D-2 hanya
    mencari U+2014 dan U+00B7, sedangkan S-1 dan S-2 juga menangkap kerabatnya (U+2012, U+2015, U+2E3A, U+2022)."""
    return [(b, t['lokasi'][len(b):].strip(' :'), f"{t['kode']} {p}") for b, t, p in _gagal(jalur_list, final, lewati)]


def gerbang(jalur_list, final=True, lewati=()):
    """(lolos, pesan). Tiap pesan: kode, lokasi, cuplikan, tingkat, skor bab, ambang, saran."""
    pesan = [f"{t['kode']} {t['lokasi']}: {p}" for _, t, p in _gagal(jalur_list, final, lewati)]
    return not pesan, pesan


def temuan_ambang(jalur_list, lewati=()):
    """Gerbang T-8 periksa.py: [(berkas, lokasi, pesan)] untuk tiap bab atau slide yang vonis ambangnya bukan LULUS.
    Kode di `lewati` tidak dihitung (periksa.py melewatkan S-1: em dash sudah ditolak D-1 dengan ambang nol)."""
    out = []
    for jalur in jalur_list:
        h = periksa_berkas(jalur, final=True)
        for u in h['unit']:
            n, vonis = vonis_ambang([t for t in u['temuan'] if t['kode'] not in lewati])
            if vonis != 'LULUS':
                langgar = [t for t in u['temuan'] if t['kode'] in AMBANG_KODE and t['kode'] not in lewati]
                rinci = '; '.join(f"{t['kode']} \"{t['cuplikan'][:50]}\" ({t['lokasi']})" for t in langgar[:4])
                out.append((h['berkas'], u['nama'][:60], f"vonis {vonis}: {n} pelanggaran ambang anti-AI; {rinci}"
                            + (f' (dan {len(langgar) - 4} lagi)' if len(langgar) > 4 else '')))
    return out


def laporan_ambang(hasil):
    """Laporan pindaian per bab format skill anti-ai-checker (PEDOMAN D4): berkas, kata, status, pelanggaran, kata terlarang
    beserta lokasi, rasio em dash dan titik dua, pembuka, usulan tulis ulang, vonis. Ditulis ke keluaran/qa/slop-<kajian>.md."""
    md = ['# Pindaian anti-AI per bab', '',
          'Ambang: em dash 0, titik dua paling banyak 20 per 1.500 kata isi, hedging paling banyak 2 per 1.500 kata, tiga-serangkai '
          'gaya 0, pembuka klise 0 di 50 kata pertama tiap bab dan subbab, kata terlarang khas AI 0 (Buku Pegangan bab Angka & copy). '
          'Vonis: 0 pelanggaran LULUS, 1 sampai 2 GAGAL RINGAN, 3 atau lebih GAGAL BERAT.', '']
    for h in hasil:
        md += [f"## {h['berkas']}", '', '| Bab | Kata | Status slop | Pelanggaran | Em dash per 1.000 | Titik dua per 1.500 | Vonis |',
               '| --- | --- | --- | --- | --- | --- | --- |']
        for u in h['unit']:
            em = sum(t['kode'] == 'S-1' for t in u['temuan'])
            td = next((t['cuplikan'].split()[0] for t in u['temuan'] if t['kode'] == 'S-40'), '–')
            md.append(f"| {u['nama'][:60]} | {u['kata']} | {u['status']} | {u['pelanggaran']} | "
                      f"{str(round(em * 1000 / max(u['kata'], 1), 1)).replace('.', ',')} | {td} | {u['vonis']} |")
        md.append('')
        for u in h['unit']:
            langgar = [t for t in u['temuan'] if t['kode'] in AMBANG_KODE]
            if langgar:
                md += [f"### {u['nama'][:60]}: {u['vonis']}", '']
                md += [f"- {t['kode']} {t['aturan']}, {t['lokasi']}: \"{t['cuplikan']}\". Usulan: {t['saran']}" for t in langgar]
                md.append('')
    return '\n'.join(md) + '\n'


def laporan(h):
    baris = [f"{h['status']:<6} {h['berkas']}  skor {h['skor']}  ({h['kata']} kata)"]
    for u in h['unit']:
        baris.append(f"  {u['status']:<6} {u['nama'][:60]}  skor {u['skor']}, {u['kata']} kata, "
                     f"kata kosong {str(u['kata_kosong_per_1000']).replace('.', ',')} per 1.000")
        for t in u['temuan']:
            baris.append(f"    {t['kode']:<5} {t['tingkat']:<6} {t['lokasi']}  \"{t['cuplikan']}\"  {t['aturan']}. {t['saran']}")
    return '\n'.join(baris)


def main(argv):
    final = '--final' in argv
    sebagai_json = '--json' in argv
    ambang = '--ambang' in argv
    tulis = argv[argv.index('--laporan') + 1] if '--laporan' in argv else None
    berkas = [a for i, a in enumerate(argv) if not a.startswith('--') and not (i and argv[i - 1] == '--laporan')]
    if not berkas:
        print(__doc__)
        return 2
    if ambang:
        hasil = [periksa_berkas(b, True) for b in berkas]
        teks = laporan_ambang(hasil)
        if tulis:
            Path(tulis).parent.mkdir(parents=True, exist_ok=True)
            Path(tulis).write_text(teks, encoding='utf-8')
        print(teks)
        return 1 if any(u['vonis'] != 'LULUS' for h in hasil for u in h['unit']) else 0
    hasil = [periksa_berkas(b, final) for b in berkas]
    if sebagai_json:
        print(json.dumps(hasil, ensure_ascii=False, indent=1))
    else:
        mode = (f'final (GAGAL bila ada pola kritis/tinggi atau skor bab > {AMBANG_FINAL})' if final else
                f'draf (GAGAL bila ada pola kritis/tinggi atau skor bab > {AMBANG_DRAF}; TINJAU bila > {AMBANG_TINJAU})')
        print(f'slop.py: {len(hasil)} berkas, ambang {mode}\n')
        print('\n\n'.join(laporan(h) for h in hasil))
    return 1 if any(h['status'] == 'GAGAL' for h in hasil) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
