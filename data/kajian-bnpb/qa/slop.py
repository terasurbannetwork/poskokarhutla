#!/usr/bin/env python3
"""Detektor AI slop untuk naskah kajian BNPB, teks Indonesia dan Inggris (stdlib saja).

Aturan, contoh salah dan benar, serta alasannya ada di ../ANTI-SLOP.md. Kode S-n di berkas ini
sama dengan kode di sana; uji_slop.py gagal bila keduanya tidak cocok.

  python3 qa/slop.py naskah/air/*.md             ambang draf: GAGAL bila ada pola kritis atau skor bab > 20
  python3 qa/slop.py --final keluaran/air.docx   ambang final: GAGAL bila ada pola kritis/tinggi atau skor bab > 10
  python3 qa/slop.py --json deck.pptx            keluaran JSON
Keluar dengan kode 1 bila ada berkas GAGAL.

Impor: periksa_berkas(jalur, final), periksa_teks(teks, nama, final), gerbang(jalur_list, final).
Skor = jumlah bobot temuan per 1.000 kata prosa (penyebut paling sedikit 250 kata), maksimal 100.
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
KATA_MIN = 250          # penyebut minimum: bab pendek tidak meledakkan skor
KALIMAT_PANJANG = 45    # kata
PADAT_KOSONG = 5        # kata kosong per 1.000 kata

NAMA = {
    'S-1': 'em dash', 'S-2': 'titik tengah', 'S-3': 'emoji',
    'S-4': 'tanda pisah tiruan', 'S-5': 'tanda seru',
    'S-6': 'sisa percakapan chatbot', 'S-7': 'penanda isian',
    'S-8': 'pembuka era', 'S-9': 'pembuka klise',
    'S-10': 'inflasi makna', 'S-11': 'bahasa promosi', 'S-12': 'kata kosong',
    'S-13': 'kepadatan kata kosong', 'S-14': 'penguat kosong', 'S-15': 'frasa bertele-tele',
    'S-16': 'meta-komentar',
    'S-17': 'tiga-serangkai abstrak', 'S-18': 'tiga-serangkai beruntun atau rapat',
    'S-19': 'kontras retoris', 'S-20': 'simpulan moral atau aforisme',
    'S-21': 'kalimat penutup bergaya', 'S-22': 'pertanyaan retoris', 'S-23': 'personifikasi',
    'S-24': 'slogan atau ajakan', 'S-25': 'kata hubung pembuka berulang',
    'S-26': 'pembuka kalimat atau paragraf sama', 'S-27': 'butir berkepala tebal',
    'S-28': 'paragraf simetris', 'S-29': 'panjang kalimat seragam', 'S-30': 'kalimat terlalu panjang',
    'S-31': 'hedging', 'S-32': 'signifikan tanpa uji', 'S-33': 'kuantor kabur',
    'S-34': 'atribusi kabur', 'S-35': 'pengisian celah spekulatif', 'S-36': 'presisi palsu',
    'S-37': 'paragraf tanpa angka dan sumber', 'S-38': 'kata Inggris berpadanan',
}

SARAN = {
    'S-1': 'Ganti dengan koma, titik dua, kurung, atau pecah jadi dua kalimat.',
    'S-2': 'Pakai koma, label sendiri, atau baris baru.',
    'S-3': 'Hapus; bila butuh tanda, pakai ikon dari registri tema.json.',
    'S-4': 'En dash hanya untuk rentang angka (2015\u20132025); pemisah kalimat pakai koma atau titik dua.',
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
    'S-18': 'Pecah daftar bertiga; jumlah butir mengikuti isi, sebagian jadikan tabel.',
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
}


def _r(kode, bobot, pola, lingkup='semua'):
    return (kode, bobot, re.compile(pola, re.I), lingkup)


EMOJI = r'[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\U0001F1E6-\U0001F1FF]'

# Diperiksa pada teks mentah semua paragraf, termasuk kutipan dan tabel.
KARAKTER = [
    _r('S-1', KRITIS, r'[\u2014\u2015]'),
    _r('S-2', KRITIS, r'[\u00b7\u2219\u22c5\u2027\u30fb]|(?<=\S)\s*\u2022'),
    _r('S-3', KRITIS, EMOJI),
    _r('S-4', SEDANG, r'(?<=\w) ?--(?= ?\w)|(?<=[^\W\d_]) \u2013 (?=[^\W\d_])'),
]

# Diperiksa pada teks bersih tanpa kutipan langsung. Lingkup "prosa" melewati tabel, judul, atribut.
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
    _r('S-9', SEDANG, r'^indonesia (adalah|merupakan) (salah satu )?negara (yang )?(sangat |paling )?(rawan|rentan)'),
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
                       r'|optimalisasi|mengoptimalkan|krusial|esensial|fundamental|masif|integral|paripurna)\b'),
    _r('S-12', RENDAH, r'\b(delve[sd]?|delving|tapestry|pivotal|crucial|robust|leverag(e|es|ed|ing)|utiliz(e|es|ed|ing)'
                       r'|holistic|synerg(y|ies|istic)|multifaceted|intricate|realm|showcas(e|es|ed|ing)'
                       r'|foster(s|ed|ing)?|underscor(e|es|ed|ing)|vibrant|testament|nuanced|meticulous(ly)?'
                       r'|empower(s|ed|ing)?|unlock(s|ed|ing)?|elevat(e|es|ed|ing)|embark(s|ed|ing)?'
                       r'|bolster(s|ed|ing)?|garner(s|ed|ing)?|interplay|paramount)\b'),
    # S-14 penguat kosong
    _r('S-14', SEDANG, r'\b(sangat|amat|begitu|teramat) (penting|krusial|vital|esensial|signifikan|strategis|fundamental|urgen|mendesak)\b'),
    _r('S-14', SEDANG, r'\bamat sangat\b|\bsangat \w+ sekali\b'),
    _r('S-14', RENDAH, r'\b(benar-benar|sungguh)\b'),
    _r('S-14', SEDANG, r'\b(very|extremely|incredibly|truly|really) (important|crucial|vital|significant|essential|unique)\b'),
    # S-15 frasa bertele-tele
    _r('S-15', RENDAH, r'\badalah merupakan\b|\bagar supaya\b|\bdemi untuk\b|\bsejak dari\b|\bdalam rangka\b|\byang mana\b'),
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
    _r('S-19', SEDANG, r'\btidak (hanya|sekadar|semata(-mata)?|cuma) [^.;]{1,60}?,? (tetapi|tapi|namun|melainkan)\b'),
    _r('S-19', TINGGI, r"\bnot (just|only|merely) [^.;]{1,60}?, but\b|\bit'?s not (just )?(about )?[^.;]{1,40}?[,;] it'?s\b"
                       r"|\bmore than just\b|\bnot because [^.;]{1,40}?, but because\b"),
    # S-20 simpulan moral dan aforisme
    _r('S-20', TINGGI, r'\b(adalah|merupakan|menjadi|jadi) kunci\b|\bkunci (utama|keberhasilan|sukses)\b'),
    _r('S-20', TINGGI, r'\bmasa depan (yang )?(lebih )?(baik|cerah|gemilang|tangguh|aman|berkelanjutan|cemerlang)\b'),
    _r('S-20', TINGGI, r'\bbukan (lagi )?(sebuah )?pilihan\b|\bkeniscayaan\b|\bharga mati\b|\b(tidak|tak) (bisa|dapat) (lagi )?ditawar'),
    _r('S-20', SEDANG, r'\btidak ada [^\W\d_]+( [^\W\d_]+){0,3} tanpa [^\W\d_]+'),
    _r('S-20', TINGGI, r"\b(is|are|remains?) (the )?key (to|for)\b|\bthe future (looks|is) bright\b|\bexciting times\b"
                       r"|\ba (major )?step in the right direction\b|\bonly time will tell\b|\bthe (language|currency|architecture) of\b"),
    # S-23 personifikasi
    _r('S-23', TINGGI, r'\b(data|angka(-angka)?|fakta|statistik|peta|grafik|sejarah) (ini |tersebut |pun )?(berbicara|bercerita'
                       r'|menjerit|berteriak|berbisik|(tidak|tak) (pernah )?berbohong)\b'),
    _r('S-23', TINGGI, r'\b(alam|bumi|sungai|gunung|laut|langit|hujan|banjir|bencana|api) (sedang |pun |seolah )?(murka|marah|mengamuk'
                       r'|menangis|berbicara|menegur|memberi pelajaran|mengintai|menghantui|mengetuk|(tidak|tak) pandang bulu)\b'),
    _r('S-23', TINGGI, r"\bibu pertiwi (menangis|berduka)\b|\bthe data (tells|speaks|shows us)\b|\bnature'?s (wrath|fury)\b|\bmother nature\b"),
    # S-24 slogan dan ajakan
    _r('S-24', TINGGI, r'(?:^|[.!?] )(mari|ayo|yuk|saatnya|sudah saatnya|bersama(-sama)? kita)\b'),
    _r('S-24', TINGGI, r'\bmulai (besok|sekarang)\b|\bdemi (masa depan|generasi (mendatang|penerus)|anak cucu|kejayaan)\b'),
    _r('S-24', TINGGI, r'\b(negara|pemerintah) (harus |wajib |selalu )?hadir\b(?! (di|ke|pada|dalam|untuk menghadiri)\b)'),
    _r('S-24', SEDANG, r'\bjangan sampai\b'),
    _r('S-24', TINGGI, r"(?:^|[.!?] )let'?s (?!dive|delve|take a|explore|break)\w+|\btogether,? we (can|will)\b"),
    # S-31 hedging (tumpukan penanda dihitung terpisah)
    _r('S-31', SEDANG, r'\b(dapat|bisa) (saja )?berpotensi\b'),
    _r('S-31', RENDAH, r'\b(tampaknya|sepertinya|agaknya|kiranya|seolah-olah|boleh jadi|bisa jadi)\b'),
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

# Atribusi kabur: hanya temuan bila paragrafnya tidak memuat sumber sama sekali.
ATRIBUSI = [re.compile(p, re.I) for p in (
    r'\b(para|banyak|sejumlah|berbagai|beberapa) (ahli|pakar|pengamat|peneliti|kalangan|studi|penelitian|kajian|laporan|sumber'
    r'|pihak|analis)\b[^.]{0,40}?\b(menyatakan|menyebut|menyebutkan|menunjukkan|berpendapat|meyakini|sepakat|mengungkap'
    r'|mengungkapkan|memperkirakan|menilai|mencatat)\b',
    r'(?:^|[.!?] )(studi|penelitian|riset|kajian|survei|laporan|data) (terbaru |terkini |terdahulu )?(menunjukkan|membuktikan'
    r'|mengungkap|mengungkapkan|memperlihatkan)\b',
    r'\b(diyakini|dipercaya|diakui) (secara luas|banyak pihak|oleh banyak)\b',
    r"\b(experts|observers|analysts|critics|researchers|scientists|studies|research|reports) (say|said|suggest|show|believe|argue|note|indicate|agree)\b",
)]

PENUTUP = re.compile(r'^(pada akhirnya|singkatnya|intinya|pendek kata|sejatinya|pada hakikatnya|hakikatnya|inilah|di sinilah'
                     r'|hanya dengan|jelaslah|tak pelak|tidak heran|ultimately|in the end|in conclusion|in short|in summary'
                     r'|all in all|at the end of the day|in essence)\b', re.I)
HUBUNG = re.compile(r'^(selain itu|lebih lanjut|lebih jauh|di sisi lain|oleh karena itu|oleh sebab itu|karena itu|dengan demikian'
                    r'|namun demikian|meskipun demikian|walaupun demikian|akan tetapi|adapun|sementara itu|di samping itu'
                    r'|tidak hanya itu|terlebih lagi|pada dasarnya|secara umum|secara keseluruhan|dalam hal ini|lebih dari itu'
                    r'|selanjutnya|namun|furthermore|moreover|additionally|in addition|however|consequently|therefore'
                    r'|nevertheless|overall|ultimately|notably|importantly|that said|that being said)\b', re.I)
SIGNIFIKAN = re.compile(r'\b(signifikan|significant(ly)?)\b', re.I)
UJI = re.compile(r'\b(uji|taraf|selang kepercayaan|nilai[- ]p|statistik\w*|statistically|test|p-value|confidence)\b|\bp ?[<=\u2264>]', re.I)
KUANTOR = re.compile(r'\b(berbagai|sejumlah|beragam|aneka|segudang|beberapa|various|numerous|a number of|several|a variety of|myriad)\b', re.I)
HEDGE = {'mungkin', 'barangkali', 'kemungkinan', 'kiranya', 'agaknya', 'tampaknya', 'sepertinya', 'cenderung',
         'diperkirakan', 'diduga', 'berpotensi', 'seolah', 'seakan', 'perhaps', 'possibly', 'potentially', 'presumably',
         'seemingly', 'apparently', 'arguably'}
ITEM = r"[^\W\d_][\w/-]*(?: [^\W\d_][\w/-]*){0,2}"
TRI = re.compile(rf"(?<!, )\b({ITEM}), ({ITEM}),? (?:dan|serta|atau|maupun|and|or) ({ITEM})\b", re.I)
ABSTRAK = set('''efektif efisien akuntabel transparan partisipatif inklusif adaptif tangguh berkelanjutan terpadu terintegrasi
menyeluruh holistik komprehensif sinergis kolaboratif inovatif responsif cepat tepat akurat terukur terarah sistematis optimal
aman nyaman sejahtera mandiri berdaya produktif profesional kredibel andal solid sinergi kolaborasi inovasi integritas komitmen
transparansi akuntabilitas efektivitas efisiensi keberlanjutan ketangguhan kemandirian kesiapsiagaan kepedulian
efficient effective sustainable resilient inclusive transparent accountable innovative seamless robust scalable reliable
innovation inspiration insight insights collaboration empowerment excellence'''.split())
LABEL_TEBAL = re.compile(r'^\s*\*\*[^*]{1,40}?(:\*\*|\*\*\s*:)')
SUMBER = re.compile(r'\[-?@|(?<![\w@.])@[a-z0-9]+-|\[\^|\{\{angka:|\b[Ss]umber\b|\b([Mm]enurut|[Bb]erdasarkan|[Aa]ccording to)'
                    r' (data |laporan |catatan |hasil |kajian )?[A-Z]|\([^()]{0,80}?\b(1[89]|20)\d{2}[a-z]?(, hlm\.[^)]*)?\)'
                    r'|\b(dkk|et al)\.|\b(data|laporan|catatan|publikasi|dokumen|rilis|survei|sensus|statistik|peta) [A-Z]{2,}')
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

JENIS_PROSA = {'isi', 'butir', 'kotak', 'catatan', 'slide'}
JENIS_ALUR = {'isi', 'butir', 'kotak'}
SINGKATAN = r'(?:dkk|hlm|no|kab|prov|kec|kel|jl|kav|dll|dsb|dst|tsb|tbk|dr|ir|prof|drs|hj|vol|ed|al|mis|bdk|cf|vs|sbb|yth|fig|gbr|pt|cv|e\.g|i\.e)'


# ---------------------------------------------------------------- teks

def bersihkan(mentah):
    """Teks Markdown/naskah menjadi teks polos untuk dibaca pola. Token angka jadi angka."""
    t = mentah.replace('\\*', '\x00')
    t = re.sub(r'\{\{angka:[^}]*\}\}', '123', t)
    t = re.sub(r'\[-?@[^\]]*\]', '', t)
    t = re.sub(r'(?<![\w@])@(?:tbl|gbr|sub|bab|lamp|rek):[\w-]+', 'Tabel 1', t)
    t = re.sub(r'(?<![\w@.])@[a-z0-9]+(?:-[a-z0-9]+)+', 'Penulis (2024)', t)
    t = re.sub(r'\{#[^}]*\}|\[\^[^\]]*\]|`[^`]*`', '', t)
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
    return re.sub(r'\u201c[^\u201d]*\u201d|"[^"]*"', ' ', teks)


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
            'cuplikan': cuplikan.strip()[:100], 'saran': saran or SARAN[kode]}


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
    if nama in ('title', 'judul', 'subtitle', 'subjudul'):
        return 'judul', 0
    if tabel:
        return 'tabel', None
    for pola, jenis in (('caption|keterangan', 'keterangan'), ('pertanyaan|question', 'pertanyaan'),
                        ('quote|kutipan', 'kutipan'), ('sumber|source|label|pil\\b|kepala', 'label')):
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
    tanpa_sumber = not _ada_sumber(p['mentah'])
    for k in kal:
        n = jumlah_kata(k)
        if n > KALIMAT_PANJANG:
            T.append(_t('S-30', 2, lok, f'{n} kata: {k[:70]}'))
        if k.endswith('?') and p['dalam'] != 'keputusan':
            T.append(_t('S-22', SEDANG, lok, k))
        if SIGNIFIKAN.search(k) and not UJI.search(k):
            T.append(_t('S-32', SEDANG, lok, k))
        if not re.search(r'\d', k):
            T += [_t('S-33', RENDAH, lok, m.group(0)) for m in KUANTOR.finditer(k)]
        if tanpa_sumber:
            T += [_t('S-34', TINGGI, lok, m.group(0)) for rx in ATRIBUSI for m in rx.finditer(k)]
        if _tumpuk_hedge(k):
            T.append(_t('S-31', SEDANG, lok, k))
    if len(kal) >= 2 and j in JENIS_ALUR and PENUTUP.match(kal[-1]):
        T.append(_t('S-21', TINGGI, lok, kal[-1]))
    if j in JENIS_ALUR:
        alur += [(p, k) for k in kal]


def _alur(alur, kata, T):
    """Pola lintas kalimat: kata hubung, pembuka sama, tiga-serangkai."""
    hub_lalu = tri_lalu = False
    n_hub = n_tri = 0
    awal_lalu, ulang = None, 0
    for p, k in alur:
        lok = p['lokasi']
        hub = bool(HUBUNG.match(k))
        n_hub += hub
        if hub and hub_lalu:
            T.append(_t('S-25', SEDANG, lok, k[:60]))
        hub_lalu = hub
        tri = []
        for m in TRI.finditer(k):
            if sum(any(w.lower() in ABSTRAK for w in g.split()) for g in m.groups()) >= 2:
                T.append(_t('S-17', TINGGI, lok, m.group(0)))
            if not all(g[0].isupper() for g in m.groups()[1:]):   # daftar nama diri (BNPB, BMKG, dan BIG) bukan gaya
                tri.append(m)
        n_tri += len(tri)
        if tri and tri_lalu:
            T.append(_t('S-18', SEDANG, lok, tri[0].group(0)))
        tri_lalu = bool(tri)
        if p['jenis'] == 'isi':
            w = _kata_awal(k)
            ulang = ulang + 1 if w and w == awal_lalu else 1
            awal_lalu = w
            if ulang == 3 and w not in ('bab', 'tabel', 'gambar', 'lampiran') and not w.isdigit():
                T.append(_t('S-26', SEDANG, lok, f'tiga kalimat berturut dibuka "{w}"'))
    if len(alur) >= 8 and n_hub / len(alur) > 0.25:
        T.append(_t('S-25', TINGGI, alur[0][0]['lokasi'], f'{n_hub} dari {len(alur)} kalimat dibuka kata hubung'))
    if n_tri >= 3 and n_tri * 1000 / max(kata, 1) > 6:
        T.append(_t('S-18', TINGGI, alur[0][0]['lokasi'], f'{n_tri} daftar bertiga dalam {kata} kata'))


def _paragraf(isi, T):
    besar = [jumlah_kata(p['teks']) for p in isi if jumlah_kata(p['teks']) >= 25]
    if len(besar) >= 6:
        rerata = statistics.mean(besar)
        kv = statistics.pstdev(besar) / rerata
        if kv < 0.2:
            T.append(_t('S-28', TINGGI, isi[0]['lokasi'], f'{len(besar)} paragraf, rerata {rerata:.0f} kata, KV {kv:.2f} < 0,20'))
    panjang = [jumlah_kata(k) for p in isi for k in pecah_kalimat(p['teks'])]
    if len(panjang) >= 12:
        kv = statistics.pstdev(panjang) / statistics.mean(panjang)
        if kv < 0.25:
            T.append(_t('S-29', SEDANG, isi[0]['lokasi'], f'{len(panjang)} kalimat, KV panjang {kv:.2f} < 0,25'))
    awal = [_kata_awal(p['teks'], 2) for p in isi]
    for i in range(2, len(awal)):
        if awal[i] and awal[i] == awal[i - 1] == awal[i - 2] and (i < 3 or awal[i - 3] != awal[i]):
            T.append(_t('S-26', SEDANG, isi[i]['lokasi'], f'tiga paragraf berturut dibuka "{awal[i]}"'))
    layak = [p for p in isi if jumlah_kata(p['teks']) >= 40]
    kosong = [p for p in layak if not re.search(r'\d', p['teks']) and not _ada_sumber(p['mentah'])]
    T += [_t('S-37', 2, p['lokasi'], p['teks'][:70]) for p in kosong]
    if len(layak) >= 5 and len(kosong) / len(layak) > 0.5:
        T.append(_t('S-37', TINGGI, layak[0]['lokasi'], f'{len(kosong)} dari {len(layak)} paragraf isi tanpa angka dan sumber'))


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
            if lingkup == 'prosa' and p['jenis'] not in JENIS_PROSA:
                continue
            T += [_t(kode, bobot, p['lokasi'], m.group(0)) for m in rx.finditer(teks)]
        if bahasa == 'id':
            T += _padanan(p, terpakai)
        if p['jenis'] in JENIS_PROSA:
            _kalimat(p, T, alur)
    if alur:
        _alur(alur, kata, T)
    isi = [p for p in paras if p['jenis'] == 'isi']
    if isi:
        _paragraf(isi, T)
    butir = [p for p in paras if p['jenis'] == 'butir']
    tebal = [p for p in butir if LABEL_TEBAL.match(p['mentah'])]
    if len(tebal) >= 3 and len(tebal) >= 0.6 * len(butir):
        T.append(_t('S-27', SEDANG, tebal[0]['lokasi'], f'{len(tebal)} dari {len(butir)} butir dibuka label tebal'))
    kosong = sum(t['kode'] == 'S-12' for t in T)
    padat = kosong * 1000 / max(kata, 1)
    if kata >= 200 and padat > PADAT_KOSONG:
        T.append(_t('S-13', TINGGI, paras[0]['lokasi'], f'{padat:.1f} kata kosong per 1.000 kata > {PADAT_KOSONG}'))
    skor = min(100, round(sum(t['bobot'] for t in T) * 1000 / max(kata, KATA_MIN)))
    return {'nama': judul, 'kata': kata, 'bahasa': bahasa, 'kata_kosong_per_1000': round(padat, 1), 'skor': skor,
            'status': _status(skor, T, final), 'temuan': T}


def _status(skor, temuan, final):
    if any(t['bobot'] >= KRITIS for t in temuan) or (final and any(t['bobot'] >= TINGGI for t in temuan)):
        return 'GAGAL'
    if skor > (AMBANG_FINAL if final else AMBANG_DRAF):
        return 'GAGAL'
    return 'TINJAU' if not final and skor > AMBANG_TINJAU else 'LOLOS'


def _rangkum(nama, unit, final):
    hasil = [nilai_unit(j, ps, final) for j, ps in unit]
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


def gerbang(jalur_list, final=True):
    """Untuk periksa.py: (lolos, pesan). Pesan menyebut kode, lokasi, nilai, ambang, dan saran."""
    pesan, ambang = [], AMBANG_FINAL if final else AMBANG_DRAF
    for jalur in jalur_list:
        h = periksa_berkas(jalur, final)
        for u in h['unit']:
            if u['status'] != 'GAGAL':
                continue
            for t in sorted(u['temuan'], key=lambda t: -t['bobot']):
                pesan.append(f"{t['kode']} {t['lokasi']}: \"{t['cuplikan']}\" ({t['aturan']}, {t['tingkat']}); "
                             f"bab \"{u['nama']}\" skor {u['skor']}, ambang {ambang}; saran: {t['saran']}")
    return not pesan, pesan


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
    berkas = [a for a in argv if not a.startswith('--')]
    if not berkas:
        print(__doc__)
        return 2
    hasil = [periksa_berkas(b, final) for b in berkas]
    if sebagai_json:
        print(json.dumps(hasil, ensure_ascii=False, indent=1))
    else:
        mode = (f'final (GAGAL bila ada pola kritis/tinggi atau skor bab > {AMBANG_FINAL})' if final else
                f'draf (GAGAL bila ada pola kritis atau skor bab > {AMBANG_DRAF}; TINJAU bila > {AMBANG_TINJAU})')
        print(f'slop.py: {len(hasil)} berkas, ambang {mode}\n')
        print('\n\n'.join(laporan(h) for h in hasil))
    return 1 if any(h['status'] == 'GAGAL' for h in hasil) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
