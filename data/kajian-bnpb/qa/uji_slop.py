#!/usr/bin/env python3
"""Uji detektor slop. Jalankan: python3 -I data/kajian-bnpb/qa/uji_slop.py

1. Tiap kode S-n punya satu contoh slop yang wajib tertangkap (fixture negatif per gerbang).
2. Paragraf laporan yang baik (gaya BNPB/Bappenas, dialek naskah) wajib lolos ambang final.
3. Pengecualian yang sah (rentang en dash, nama diri, istilah miring, pertanyaan di blok keputusan) tidak ditandai.
4. Pembaca DOCX dan PPTX memecah bab/slide dengan benar.
5. Kode di slop.py sama dengan kode di ANTI-SLOP.md; berkas aturan dan detektor bebas em dash dan titik tengah.
6. Sampel adversarial (sampel_adversarial/sampel.json, 23 Okt 2026): slop halus yang menghindari daftar kata wajib
   GAGAL final dengan temuan tinggi, kutipan resmi bersumber wajib LOLOS; juga glif, kutipan, tahun, dan pengenceran.
Angka di contoh baik diambil dari KERANGKA.md atau ditulis sebagai token; teks ini fixture, bukan naskah.
"""
import contextlib
import io
import json
import re
import sys
import tempfile
import zipfile
from pathlib import Path

DI = Path(__file__).resolve().parent
sys.path.insert(0, str(DI))
import slop  # noqa: E402

EM, TT = chr(0x2014), chr(0x00b7)


def kode(h):
    return {t['kode'] for u in h['unit'] for t in u['temuan']}


def cek(teks, nama='contoh.md', final=False):
    return slop.periksa_teks(teks, nama, final)


# ---------------------------------------------------------------- 1. satu contoh slop per kode

ISI_KOSONG = ' '.join(['Kabupaten Demak mencatat 12 kejadian banjir pada 2024 menurut DIBI.'] * 22)
SERAGAM = '\n\n'.join(
    f'Kabupaten nomor {i} mencatat {i * 10} kejadian banjir pada 2024 menurut DIBI, dengan {i * 3} desa '
    f'terdampak dan {i * 100} jiwa mengungsi selama musim hujan di wilayah sungai utama provinsi itu.'
    for i in range(1, 8))
KALIMAT_SAMA = ' '.join(f'Banjir kecil merendam {i} desa di Kabupaten Demak kemarin.' for i in range(1, 14))

CONTOH = [
    ('S-1', f'Mitigasi {EM} bukan respons {EM} menurunkan korban pada 2024.'),
    ('S-2', f'IRBI 2024 {TT} 38 provinsi {TT} BNPB'),
    ('S-3', 'Peringatan dini \U0001F680 aktif di 12 kabupaten.'),
    ('S-4', 'Wilayah Bali – Nusa Tenggara mencatat 40 kejadian pada 2024.'),
    ('S-5', 'Evakuasi harus segera dilakukan sebelum air naik!'),
    ('S-6', 'Berikut temuan utama bab ini. Semoga bermanfaat.'),
    ('S-7', 'Jumlah korban meninggal mencapai [DATA] jiwa pada 2024.'),
    ('S-8', 'Di era yang serba cepat ini, informasi bencana harus cepat sampai.'),
    ('S-9', 'Tidak dapat dipungkiri bahwa banjir melanda Demak pada 2024.'),
    ('S-10', 'BPBD memainkan peran yang sangat penting dalam penanganan banjir 2024.'),
    ('S-11', 'Sistem ini menjadi solusi jitu untuk banjir rob di 12 desa.'),
    ('S-12', 'Penanganan banjir 2024 di Demak memerlukan sinergi lintas lembaga.'),
    ('S-13', ISI_KOSONG + ' Pendekatan holistik, komprehensif, dan transformatif diperlukan.'),
    ('S-14', 'Data kejadian 2024 sangat penting bagi perencanaan.'),
    ('S-15', 'Kegiatan ini adalah merupakan bagian dari rencana kontinjensi 2024.'),
    ('S-16', 'Bab ini akan membahas profil risiko 119 kabupaten/kota di Pulau Jawa.'),
    ('S-17', 'Penyaluran bantuan pada 2024 harus cepat, tepat, dan akurat.'),
    ('S-18', 'Kajian mencakup air baku, irigasi, dan bendungan pada 2024.'),
    ('S-19', 'Mitigasi bukan sekadar program tahunan 2026.'),
    ('S-20', 'Kesiapsiagaan desa pada 2024 adalah kunci keselamatan warga.'),
    ('S-21', 'Banjir 2024 merendam 12 desa di Demak. Pada akhirnya, semua kembali pada kesiapan kita.'),
    ('S-22', 'Apakah 119 kabupaten/kota di Jawa siap menghadapi kemarau 2026?'),
    ('S-23', 'Pada Maret 2024 alam sedang murka di pesisir utara Jawa.'),
    ('S-24', 'Mari kita jaga 12 sungai utama di Jawa Tengah.'),
    ('S-25', 'Selain itu, 12 desa terendam pada 2024. Lebih lanjut, 5 jembatan putus.'),
    ('S-26', 'Banjir merendam 12 desa. Banjir memutus 5 jembatan. Banjir merusak 30 rumah.'),
    ('S-27', '- **Air baku:** cakupan layanan 2024 perlu ditambah.\n'
             '- **Irigasi:** 12 saluran perlu diperbaiki.\n'
             '- **Bendungan:** sedimentasi 3 waduk perlu dikeruk.'),
    ('S-28', SERAGAM),
    ('S-29', KALIMAT_SAMA),
    ('S-30', 'Pemerintah daerah bersama BPBD dan dinas teknis di 12 kabupaten perlu menyusun rencana kontinjensi '
             'banjir yang memuat jalur evakuasi, lokasi pengungsian, kebutuhan logistik, jadwal latihan, pembagian '
             'peran antarlembaga, sistem komunikasi darurat, dan mekanisme pendanaan yang dapat segera dicairkan '
             'ketika status tanggap darurat ditetapkan oleh kepala daerah pada musim hujan 2026.'),
    ('S-31', 'Curah hujan di Jawa Barat diperkirakan cenderung naik pada musim hujan 2026.'),
    ('S-32', 'Kejadian banjir di Jawa naik secara signifikan pada 2024.'),
    ('S-33', 'Banjir rob melanda berbagai daerah pesisir utara Jawa.'),
    ('S-34', 'Para ahli menyatakan bahwa gempa megathrust selatan Jawa dapat terjadi kapan saja.'),
    ('S-35', 'Data korban banjir bandang itu terbatas, namun diduga mencapai ratusan jiwa.'),
    ('S-36', 'Program desa tangguh bencana menjangkau 500+ desa pada 2024.'),
    ('S-37', 'Penanggulangan bencana memerlukan perhatian dan keterlibatan banyak pihak di tingkat pusat dan daerah, '
             'terutama dalam menyiapkan masyarakat menghadapi ancaman yang datang setiap musim, membangun kesadaran '
             'warga, dan memastikan bahwa setiap rencana yang disusun benar-benar dapat dijalankan ketika keadaan '
             'darurat terjadi di wilayah masing-masing.'),
    ('S-38', 'Peta jalan 2026 disusun bersama stakeholder di 119 kabupaten/kota.'),
    ('S-39', 'Dalam rangka mewujudkan desa tangguh, BPBD menempuh langkah strategis di 12 desa pada 2026.'),
    ('S-40', ' '.join(f'Desa {i}: {i * 3} rumah terendam pada Maret 2024 menurut BPBD.' for i in range(1, 23))),
    ('S-41', 'Curah hujan tampaknya naik. Banjir cenderung meluas ke hilir. Longsor mungkin bertambah di lereng.'),
    ('S-42', '# Profil Risiko\n\nDalam rangka menyusun profil, BPBD mencatat 12 kejadian pada 2024 (BNPB, 2025).'),
    ('S-43', 'Kajian ini mendalami 12 kejadian banjir di Demak pada 2024 menurut DIBI.'),
]


def uji_contoh_per_kode():
    assert {k for k, _ in CONTOH} == set(slop.NAMA), \
        f'kode tanpa contoh negatif: {sorted(set(slop.NAMA) - {k for k, _ in CONTOH})}'
    gagal = []
    for k, teks in CONTOH:
        h = cek(teks)
        if k not in kode(h):
            gagal.append(f'{k} tidak tertangkap; yang tertangkap {sorted(kode(h))} pada: {teks[:60]}')
    assert not gagal, '\n'.join(gagal)


# ---------------------------------------------------------------- 2. slop gabungan dan laporan yang baik

SLOP = '''Di era yang serba cepat ini, penanggulangan bencana memainkan peran yang sangat penting bagi pembangunan
nasional. Tidak dapat dipungkiri bahwa Indonesia merupakan negara yang rawan bencana. Bab ini akan membahas
berbagai upaya yang holistik, komprehensif, dan berkelanjutan.

Perlu diketahui bahwa mitigasi bukan sekadar program, melainkan sebuah keniscayaan. Para ahli menyatakan bahwa
risiko akan terus meningkat secara signifikan. Selain itu, sinergi seluruh pemangku kepentingan menjadi kunci.
Lebih lanjut, penanganan harus cepat, tepat, dan akurat.

Mari bersama kita wujudkan Indonesia tangguh. Apakah kita sudah siap? Alam sedang murka dan bencana mengintai
di setiap sudut negeri. Pada akhirnya, kesiapsiagaan adalah kunci menuju masa depan yang lebih tangguh.
'''

BAIK = '''---
kajian: mitigasi
bab: 1
judul: Pendahuluan
pertanyaan: Mengapa Indonesia memerlukan grand design mitigasi untuk 2026–2030?
---

# Pendahuluan {#bab:pendahuluan}

## Latar Belakang {#sub:latar}

**WorldRiskReport 2025 menempatkan Indonesia di peringkat ketiga.** Indeks Risiko Bencana Indonesia (IRBI)
nasional tercatat {{angka:irbi.nasional.2024|fmt=2}} pada 2024 [@bnpb-irbi]. Penurunannya belum merata:
{{angka:irbi.kab.tinggi.2023}} kabupaten/kota masih berada di kelas tinggi pada 2023, sebagian besar di pesisir
selatan Jawa, pesisir barat Sumatra, dan Sulawesi Tengah.

Pulau Jawa dihuni {{angka:jawa.penduduk.persen_2020}}% penduduk Indonesia menurut Sensus Penduduk 2020, tetapi
hanya memiliki {{angka:jawa.air_permukaan.persen}}% air permukaan nasional (BPS, 2020, mengutip Radhika dkk., 2017).
Ketimpangan itu membuat 119 kabupaten/kota di enam provinsi bergantung pada tampungan waduk
dan air tanah selama kemarau. Pada kemarau 2023, DIBI mencatat {{angka:dibi.kekeringan.jawa.2023}} kejadian
kekeringan di Jawa, terbanyak sejak 2019.

Kelas risiko dihitung dari komponen bahaya, kerentanan, dan kapasitas dengan bobot yang ditetapkan BNPB
[@bnpb-2016-rbi]. Data kejadian diambil dari DIBI dan dibekukan per 23 Oktober 2026. Wilayah dengan kelengkapan
data di bawah 80% tidak diberi skor dan ditandai "data tidak cukup".

Skenario dalam kajian ini adalah skenario terburuk yang masuk akal (*reasonable worst case*), mengikuti pola
*National Risk Register* Inggris [@cabinet-office-2023-nrr]. Kerangka Sendai 2015–2030 (*Sendai Framework for
Disaster Risk Reduction*) menetapkan tujuh target global yang dipantau tiap tahun [@undrr-2015-sendai].

## Sistematika {#sub:sistematika}

Bab ini menguraikan latar dan lingkup kajian. Bab 2 meninjau pustaka dan regulasi. Bab 3 menjelaskan
data dan metode. Bab 4 merekam kejadian besar 2004–2025 beserta pelajarannya.

::: temuan {#tem:a1}
judul: Risiko tinggi terkumpul di pesisir selatan Jawa
sifat: fakta

**Bukti:** {{angka:irbi.kab_tinggi.jawa}} kabupaten/kota di pesisir selatan Jawa berada di kelas tinggi IRBI 2025 [@bnpb-irbi].

**Dampak:** Penduduk di zona ini terpapar gempa megathrust dan tsunami pada saat yang sama.
:::

::: keputusan
- Apakah peringatan dini tsunami di selatan Jawa diperluas ke 2027 atau dipercepat ke 2026?
:::
'''

BAIK_EN = '''Indonesia ranked third in the WorldRiskReport 2025. The national disaster risk index stood at 128.52 in 2024
(BNPB, 2025), yet 168 districts remained in the high class in 2023. Most of them sit on the southern coast of Java
and the western coast of Sumatra, where the megathrust hazard overlaps with dense settlement.
'''

SLOP_EN = '''In today's fast-paced world, disaster management plays a crucial role. It's important to note that experts
say resilience is key to a brighter future. Let's dive in.
'''


def uji_slop_gabungan_gagal():
    for final in (False, True):
        h = cek(SLOP, final=final)
        assert h['status'] == 'GAGAL', h['status']
        assert h['skor'] > 50, h['skor']
    wajib = {'S-8', 'S-9', 'S-10', 'S-12', 'S-14', 'S-16', 'S-17', 'S-19', 'S-20', 'S-21', 'S-22', 'S-23', 'S-24',
             'S-25', 'S-32', 'S-33', 'S-34'}
    assert wajib <= kode(cek(SLOP)), sorted(wajib - kode(cek(SLOP)))
    h = cek(SLOP_EN)
    assert h['status'] == 'GAGAL' and h['unit'][0]['bahasa'] == 'en'
    assert {'S-8', 'S-10', 'S-16', 'S-20', 'S-34'} <= kode(h), sorted(kode(h))


def uji_laporan_baik_lolos():
    for teks, nama in ((BAIK, 'bab-01.md'), (BAIK_EN, 'baik-en.txt')):
        h = cek(teks, nama, final=True)
        temuan = [(t['kode'], t['cuplikan']) for u in h['unit'] for t in u['temuan']]
        assert h['status'] == 'LOLOS', (nama, h['skor'], temuan)
        assert h['skor'] <= slop.AMBANG_FINAL, (nama, h['skor'], temuan)
        assert not any(t['bobot'] >= slop.TINGGI for u in h['unit'] for t in u['temuan']), temuan


# ---------------------------------------------------------------- 2b. ambang anti-AI per bab dan vonis tiga tingkat

def _vonis(teks, nama='bab-01.md'):
    return [(u['vonis'], u['pelanggaran']) for u in cek(teks, nama, final=True)['unit']]


def uji_ambang_vonis():
    # laporan baik: nol pelanggaran ambang, LULUS
    assert all(v == 'LULUS' for v, _ in _vonis(BAIK)), [(u['nama'], u['vonis'], [(x['kode'], x['cuplikan']) for x in u['temuan']
                                                        if x['kode'] in slop.AMBANG_KODE]) for u in cek(BAIK, 'bab-01.md', True)['unit']]
    # satu dan dua pelanggaran GAGAL RINGAN, tiga atau lebih GAGAL BERAT (Buku Pegangan Angka & copy)
    satu = 'Kajian mencakup air baku, irigasi, dan bendungan di 119 kab/kota pada 2024 (BNPB, 2025).'
    dua = satu + ' BPBD mendalami 12 laporan desa pada Maret 2024.'
    tiga = dua + ' Ancaman meliputi kekeringan, banjir, dan rob sejak 2015 menurut DIBI.'
    assert _vonis(satu) == [('GAGAL RINGAN', 1)] and _vonis(dua) == [('GAGAL RINGAN', 2)] and _vonis(tiga) == [('GAGAL BERAT', 3)], \
        (_vonis(satu), _vonis(dua), _vonis(tiga))
    # daftar faktual (nama diri, angka) dan set istilah resmi tidak dihitung di DOCX/naskah; di slide tanpa pengecualian
    faktual = ('Banjir melanda Jawa Barat, Jawa Tengah, dan Jawa Timur pada 2024 (BNPB, 2025). Strategi dibagi ke tahap prabencana, '
               'tanggap darurat, dan pascabencana menurut UU 24/2007. Risiko dihitung dari komponen bahaya, kerentanan, dan kapasitas (BNPB, 2016).')
    assert _vonis(faktual) == [('LULUS', 0)], _vonis(faktual)
    h = slop.nilai_unit('Slide 2', [slop._para('slide', 'Banjir di Jawa Barat, Jawa Tengah, dan Jawa Timur pada 2024', 'd.pptx slide 2 par.1')])
    assert h['vonis'] == 'GAGAL RINGAN' and 'S-18' in {x['kode'] for x in h['temuan']}, h['temuan']
    # set istilah resmi juga sah di slide (subjudul KEPUTUSAN T10); "X, termasuk Y dan Z" bukan tiga-serangkai
    h = slop.nilai_unit('Slide 1', [slop._para('slide', 'Strategi Prabencana, Tanggap Darurat, dan Pascabencana', 'd.pptx slide 1 par.1')])
    assert h['vonis'] == 'LULUS', h['temuan']
    assert _vonis('Peringatan diuji sampai desa di bantaran sungai utama, termasuk sirene dan pesan singkat, pada 2024 (BNPB, 2025).') == [('LULUS', 0)]
    # titik dua: "Sumber:" dan label tidak dihitung; 20 per 1.500 kata isi sah
    label = '\n\n'.join(f'Sumber: DIBI BNPB, tabel {i} pada 2024.' for i in range(1, 30))
    assert 'S-40' not in kode(cek(label)) and 'S-40' in kode(cek(dict(CONTOH)['S-40']))
    # hedging: kata samar di kalimat berangka atau bersumber tidak dihitung; frasa daftar PEDOMAN selalu dihitung
    berangka = 'Curah hujan cenderung naik 12% pada 2024. Banjir mungkin meluas ke 5 desa. Longsor tampaknya bertambah 3 titik.'
    assert 'S-41' not in kode(cek(berangka)) and 'S-41' in kode(cek('Perlu dicatat bahwa banjir 2024 merendam 12 desa. Patut dicatat '
                                                                     'pula 5 jembatan putus. Dapat dikatakan bahwa 30 rumah rusak.'))
    # pembuka klise hanya di 50 kata pertama sesudah judul; di tengah subbab dinilai S-15 biasa
    jauh = '# Profil\n\n' + ' '.join(['Kabupaten Demak mencatat 12 kejadian banjir pada 2024 menurut DIBI.'] * 6) + ' Dalam rangka evaluasi, BPBD menghitung 5 desa.'
    assert 'S-42' not in kode(cek(jauh)) and 'S-42' in kode(cek(dict(CONTOH)['S-42']))
    # kata terlarang Inggris hanya untuk teks Inggris; "total" di prosa Indonesia bukan pelanggaran
    assert 'S-43' not in kode(cek('Jumlah total kejadian banjir 2024 di Demak tercatat 12 menurut DIBI.'))
    assert 'S-43' in kode(cek('The agency will delve into 12 flood records from 2024 (BNPB, 2025).', 'en.txt'))


# ---------------------------------------------------------------- 3. pengecualian yang sah

def uji_bukan_slop():
    sah = [
        ('Kerusuhan sosial masuk bencana sosial, bukan nonalam, menurut UU 24/2007.', 'S-19'),
        ('DIBI mencatat 2.400 kejadian pada 2015–2025.', 'S-4'),
        ('Sebanyak 12 kabupaten di Jawa Barat, Jawa Tengah, dan Jawa Timur masuk kelas tinggi pada 2023.', 'S-17'),
        ('Sendai Framework for Disaster Risk Reduction memuat tujuh target untuk 2015–2030.', 'S-38'),
        ('Luas hitungan satelit memakai *hotspot* VIIRS 375 m sebagai titik panas pada 2024.', 'S-38'),
        ('Angka kunci 2024 dibaca dari registri data.', 'S-20'),
        ('Kelembapan relatif diperkirakan 60% pada Agustus 2026 menurut BMKG.', 'S-31'),
        ('Pemerintah hadir di lokasi pengungsian pada hari kedua, 12 Maret 2024.', 'S-24'),
        ('Lanskap gambut Kalimantan Tengah terbakar 12.000 ha pada 2023.', 'S-9'),
        ('Data menunjukkan {{angka:dibi.banjir.2024}} kejadian banjir pada 2024.', 'S-34'),
        ('Kab. Sukabumi mencatat 12 longsor pada 2024. Kab. Cianjur mencatat 9.', 'S-30'),
        ('Jumlah titik panas tidak sama dengan jumlah kebakaran (BNPB, 2025).', 'S-19'),
        ('Pelatihan berlangsung maksimal 2 JP per hari pada 2026.', 'S-12'),
        ('Indeks ENSO JAS +2,63 masuk kelas El Niño sangat kuat menurut BMKG (rilis 22 September 2026).', 'S-14'),
        ('Musim kemarau berlangsung Jun–Okt 2023 menurut BMKG; rinciannya di Lampiran I–III.', 'S-4'),
        ('Tanggul laut ruas Cilegon–Gresik direncanakan sepanjang 500 km (pernyataan Presiden, Juni 2025).', 'S-4'),
        ('Potensi penduduk terpapar multibahaya tercatat 271.130.365 jiwa (BNPB, 2025); modal sosial desa dibahas di Bab 5.',
         'S-20'),
    ]
    salah = [f'{k} pada: {t}' for t, k in sah if k in kode(cek(t))]
    assert not salah, '\n'.join(salah)
    # istilah asing miring hanya sah sekali per bab
    h = cek('Satelit merekam *hotspot* pada 2024. Jumlah *hotspot* 2023 lebih rendah.')
    assert sum(t['kode'] == 'S-38' for u in h['unit'] for t in u['temuan']) == 1
    # pertanyaan di blok keputusan sah, di prosa tidak
    assert 'S-22' not in kode(cek('::: keputusan\n- Apakah tenggat 2026 dipercepat?\n:::'))
    assert 'S-22' in kode(cek('Apakah tenggat 2026 dipercepat?'))
    # tanda seru tunggal (penanda ikon di deck) bukan tanda seru prosa
    assert 'S-5' not in kode(cek('!'))


# ---------------------------------------------------------------- 4. DOCX dan PPTX

def _docx(jalur):
    w = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

    def p(teks, gaya=None, tebal=False, miring=False, catatan=None):
        ppr = f'<w:pPr><w:pStyle w:val="{gaya}"/></w:pPr>' if gaya else ''
        rpr = ('<w:rPr>' + ('<w:b/>' if tebal else '') + ('<w:i/>' if miring else '') + '</w:rPr>') if (tebal or miring) else ''
        ref = f'<w:r><w:footnoteReference w:id="{catatan}"/></w:r>' if catatan else ''
        return f'<w:p>{ppr}<w:r>{rpr}<w:t xml:space="preserve">{teks}</w:t></w:r>{ref}</w:p>'

    tubuh = ''.join([
        p('Pendahuluan', 'Heading1'),
        p('Pulau Jawa dihuni 56,10% penduduk Indonesia menurut Sensus Penduduk 2020, tetapi hanya memiliki 6,3% air '
          'permukaan nasional (BPS, 2020).', catatan=1),
        '<w:p><w:r><w:t xml:space="preserve">Skenario memakai pola </w:t></w:r><w:r><w:rPr><w:i/></w:rPr>'
        '<w:t>reasonable worst case</w:t></w:r><w:r><w:t xml:space="preserve"> pada 2026.</w:t></w:r></w:p>',
        p('Profil Risiko', 'Heading1'),
        p(f'Di era yang serba cepat ini, BPBD memainkan peran penting {EM} kata pengisi.'),
        '<w:tbl><w:tr><w:tc>' + p('Jawa Barat') + '</w:tc><w:tc>' + p('128,52') + '</w:tc></w:tr></w:tbl>',
    ])
    gaya = (f'<w:styles {w}><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>'
            '</w:styles>')
    catatan = (f'<w:footnotes {w}><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:t>-</w:t></w:r></w:p></w:footnote>'
               '<w:footnote w:id="1"><w:p><w:r><w:t>Rerata sederhana 119 kabupaten/kota, DIBI 2024.</w:t></w:r></w:p>'
               '</w:footnote></w:footnotes>')
    with zipfile.ZipFile(jalur, 'w') as z:
        z.writestr('word/document.xml', f'<w:document {w}><w:body>{tubuh}</w:body></w:document>')
        z.writestr('word/styles.xml', gaya)
        z.writestr('word/footnotes.xml', catatan)


def _pptx(jalur):
    a = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
    p_ns = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
    r_ns = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

    def slide(*paras, tabel=()):
        isi = ''.join(f'<a:p><a:r><a:rPr b="1"/><a:t>{t}</a:t></a:r></a:p>' for t in paras)
        tbl = ''.join(f'<a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>{t}</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl>'
                      for t in tabel)
        return f'<p:sld {a} {p_ns}><p:cSld><p:spTree><p:sp><p:txBody>{isi}</p:txBody></p:sp>{tbl}</p:spTree></p:cSld></p:sld>'

    with zipfile.ZipFile(jalur, 'w') as z:
        # urutan tampil: slide2.xml lebih dulu, lalu slide1.xml
        z.writestr('ppt/presentation.xml', f'<p:presentation {p_ns} {r_ns}><p:sldIdLst>'
                   '<p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst></p:presentation>')
        z.writestr('ppt/_rels/presentation.xml.rels',
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId2" Target="slides/slide1.xml"/><Relationship Id="rId3" Target="slides/slide2.xml"/>'
                   '</Relationships>')
        z.writestr('ppt/slides/slide2.xml', slide('168 kabupaten/kota di kelas tinggi IRBI 2023', '!',
                                                  tabel=('Jawa Barat',)))
        z.writestr('ppt/slides/slide1.xml', slide(f'Ringkasan {TT} 2024', 'Mitigasi bukan sekadar program'))


def uji_docx_pptx():
    with tempfile.TemporaryDirectory() as d:
        dx, px = Path(d) / 'uji.docx', Path(d) / 'uji.pptx'
        _docx(dx)
        _pptx(px)
        h = slop.periksa_berkas(dx)
        nama = [u['nama'] for u in h['unit']]
        assert nama == ['Pendahuluan', 'Profil Risiko', 'Catatan kaki'], nama
        assert h['unit'][0]['status'] == 'LOLOS', h['unit'][0]['temuan']
        assert h['unit'][1]['status'] == 'GAGAL' and {'S-1', 'S-8', 'S-10'} <= kode({'unit': [h['unit'][1]]})
        teks = [p['mentah'] for _, ps in slop.baca_docx(dx) for p in ps]
        assert any('*reasonable worst case*' in t for t in teks), teks
        assert any('[^1]' in t for t in teks), teks
        assert [p['jenis'] for _, ps in slop.baca_docx(dx)[1:2] for p in ps][-2:] == ['tabel', 'tabel']
        h = slop.periksa_berkas(px)
        assert [u['nama'] for u in h['unit']] == ['Slide 1', 'Slide 2']
        assert h['unit'][0]['status'] == 'LOLOS', h['unit'][0]['temuan']     # slide2.xml, tampil pertama
        assert {'S-2', 'S-19'} <= kode({'unit': [h['unit'][1]]}) and h['unit'][1]['status'] == 'GAGAL'
        jenis = [p['jenis'] for p in slop.baca_pptx(px)[0][1]]
        assert jenis == ['slide', 'slide', 'tabel'], jenis
        ok, pesan = slop.gerbang([dx, px], final=True)
        assert not ok and any(m.startswith('S-1 uji.docx p.') for m in pesan), pesan[:3]


def uji_gerbang_dan_cli():
    with tempfile.TemporaryDirectory() as d:
        baik, buruk = Path(d) / 'bab-01.md', Path(d) / 'bab-02.md'
        baik.write_text(BAIK, encoding='utf-8')
        buruk.write_text(SLOP, encoding='utf-8')
        assert slop.gerbang([baik], final=True) == (True, [])
        ok, pesan = slop.gerbang([buruk], final=True)
        assert not ok and all(re.match(r'S-\d+ bab-02\.md:\d+: ', m) for m in pesan), pesan[:3]
        with contextlib.redirect_stdout(io.StringIO()):
            assert slop.main([str(baik), '--final']) == 0
            assert slop.main([str(buruk)]) == 1
            lap = Path(d) / 'slop-uji.md'
            assert slop.main(['--ambang', '--laporan', str(lap), str(baik)]) == 0
            assert slop.main(['--ambang', str(buruk)]) == 1
        isi = lap.read_text(encoding='utf-8')
        assert '| LULUS |' in isi and 'GAGAL' not in isi.split('Vonis:')[1].split('\n', 1)[1], isi[:400]
        assert slop.temuan_ambang([baik]) == [] and slop.temuan_ambang([buruk]), 'temuan_ambang T-8'


# ---------------------------------------------------------------- 5. kode dan kebersihan berkas

def uji_kode_dan_berkas():
    aturan = (DI.parent / 'ANTI-SLOP.md').read_text(encoding='utf-8')
    di_aturan = set(re.findall(r'\bS-\d+\b', aturan))
    assert di_aturan == set(slop.NAMA), (sorted(set(slop.NAMA) - di_aturan), sorted(di_aturan - set(slop.NAMA)))
    assert set(slop.SARAN) == set(slop.NAMA)
    # contoh paragraf di bagian 4 aturan: yang "Salah" gagal, yang "Benar" lolos ambang final
    for label, harap in (('Salah', 'GAGAL'), ('Benar', 'LOLOS')):
        blok = re.search(rf'^> {label}: (.+?)\n\n', aturan, re.S | re.M).group(1)
        teks = re.sub(r'\n> ', ' ', blok).replace('{n}', '{{angka:contoh}}')
        h = cek(teks, final=True)
        assert h['status'] == harap, (label, h['skor'], [(t['kode'], t['cuplikan']) for u in h['unit'] for t in u['temuan']])
        if label == 'Benar':  # contoh benar juga lulus ambang anti-AI (vonis tiga tingkat)
            assert all(u['vonis'] == 'LULUS' for u in h['unit']), [(t['kode'], t['cuplikan']) for u in h['unit'] for t in u['temuan']]
    for berkas in (DI / 'slop.py', DI / 'uji_slop.py', DI.parent / 'ANTI-SLOP.md'):
        isi = berkas.read_text(encoding='utf-8')
        assert EM not in isi and TT not in isi, f'{berkas.name} memuat em dash atau titik tengah'


# ---------------------------------------------------------------- 6. sampel adversarial dan celah yang ditutup

SAMPEL = json.loads((DI / 'sampel_adversarial' / 'sampel.json').read_text(encoding='utf-8'))

# Slop yang ditulis sesudah pola S-n disusun (uji generalisasi 23 Okt 2026); harus tetap GAGAL.
TAHAN = [
    'Berdasarkan uraian di atas, terlihat jelas bahwa ketahanan air Pulau Jawa berada pada titik yang mengkhawatirkan '
    'pada 2025. Kondisi ini memerlukan respons kebijakan yang cepat dan terukur dari pemerintah pusat maupun daerah. '
    'Tanpa intervensi yang tepat sasaran, krisis air diprediksi akan semakin dalam dan berdampak luas terhadap '
    'kehidupan jutaan warga.',
    'Penanggulangan bencana merupakan tanggung jawab bersama antara pemerintah, masyarakat, dan dunia usaha '
    'sebagaimana diamanatkan UU 24/2007. Oleh sebab itu, partisipasi aktif seluruh elemen sangat diharapkan agar '
    'upaya pengurangan risiko dapat berjalan efektif dan efisien. Sinergi yang terbangun diharapkan mampu menekan '
    'dampak bencana hingga ke tingkat paling bawah.',
    'Secara keseluruhan, data 2015–2024 memperlihatkan tren yang konsisten: frekuensi bencana hidrometeorologi '
    'terus meningkat. Peningkatan ini tidak terlepas dari perubahan iklim, degradasi lingkungan, dan tata ruang yang '
    'belum berbasis risiko. Ketiga faktor tersebut saling berkelindan dan membentuk lingkaran risiko yang sulit diputus.',
    'Menariknya, wilayah dengan indeks kapasitas tinggi tidak selalu mencatat korban lebih sedikit pada 2024. Fenomena '
    'ini mengisyaratkan adanya celah antara dokumen perencanaan dan implementasi di lapangan. Dengan kata lain, '
    'kesiapsiagaan di atas kertas belum sepenuhnya menjelma menjadi kesiapsiagaan yang nyata.',
    'Peta jalan mitigasi 2026–2030 dirancang untuk menjawab tantangan tersebut secara bertahap dan terukur. Setiap '
    'tahapan dilengkapi indikator kinerja yang jelas sehingga capaian dapat dipantau secara berkala. Melalui pendekatan '
    'ini, diharapkan terwujud tata kelola risiko yang lebih adaptif, responsif, dan berorientasi pada hasil.',
    'Gempa Cianjur 2022 menjadi pengingat pahit bahwa bangunan yang tidak memenuhi standar dapat berubah menjadi '
    'perangkap mematikan. Ratusan nyawa melayang dalam hitungan detik. Peristiwa ini meninggalkan luka mendalam '
    'sekaligus pelajaran berharga bagi upaya penegakan kode bangunan di seluruh Indonesia.',
    # paragraf pendek (25 sampai 40 kata) tanpa angka data: hanya S-37 yang menangkapnya
    'Data tahun 2024 memperlihatkan pola yang mengkhawatirkan. Banjir dan longsor terjadi hampir di seluruh provinsi, '
    'dengan dampak yang dirasakan langsung oleh masyarakat. Situasi ini menuntut respons yang lebih cepat, lebih '
    'terkoordinasi, dan lebih berpihak kepada kelompok rentan.',
    'Kekeringan 2023 meninggalkan jejak panjang bagi petani di Jawa Tengah. Sawah retak, sumur mengering, dan antrean '
    'jeriken menjadi pemandangan sehari-hari. Di balik angka-angka itu, ada keluarga yang harus memilih antara air '
    'minum dan air untuk ternak.',
    'Ke depan, BNPB akan terus memperkuat koordinasi dengan kementerian dan lembaga terkait. Langkah ini diharapkan '
    'dapat mempercepat penanganan darurat sekaligus memastikan bantuan tepat sasaran. Dengan begitu, kehadiran negara '
    'benar-benar dirasakan oleh masyarakat terdampak.',
    'Upaya mitigasi yang dilakukan selama ini telah menunjukkan hasil yang menggembirakan. Namun, masih terdapat '
    'sejumlah tantangan yang harus dihadapi bersama, mulai dari keterbatasan anggaran hingga rendahnya kesadaran '
    'masyarakat. Oleh karena itu, diperlukan langkah-langkah konkret yang melibatkan semua pihak.',
]


def _temuan(h):
    return [(t['kode'], t['tingkat'], t['cuplikan'][:40]) for u in h['unit'] for t in u['temuan']]


def _ada_tinggi(h):
    return any(t['bobot'] >= slop.TINGGI for u in h['unit'] for t in u['temuan'])


def uji_sampel_adversarial():
    assert len(SAMPEL['slop']) >= 12 and len(SAMPEL['baik']) >= 12, 'sampel adversarial menyusut'
    kasus = [(s['id'], s['teks'], {k for k in s['pola_sasaran'] if k.startswith('S-')}) for s in SAMPEL['slop']]
    kasus += [(f'tahan-{i}', t, set()) for i, t in enumerate(TAHAN, 1)]
    gagal = []
    for sid, teks, sasaran in kasus:
        h = cek(teks, f'{sid}.md', final=True)
        if h['status'] != 'GAGAL' or not _ada_tinggi(h) or (sasaran and not sasaran & kode(h)):
            gagal.append(f'{sid} lolos: {h["status"]} skor {h["skor"]}, sasaran {sorted(sasaran)}, temuan {_temuan(h)}')
    for s in SAMPEL['baik']:
        h = cek(s['teks'], f"{s['id']}.md", final=True)
        if h['status'] != 'LOLOS' or _ada_tinggi(h):
            gagal.append(f"{s['id']} salah tangkap: skor {h['skor']}, temuan {_temuan(h)}")
    assert not gagal, '\n'.join(gagal)


def uji_glif():
    harap = {'S-1': (0x2012, 0x2015, 0x2E3A, 0x2E3B, 0xFE58), 'S-2': (0x25E6, 0x2043, 0x2027),
             'S-3': (0x231B, 0x23F0, 0x23F1, 0x2139, 0x25B6, 0x25FE)}
    lolos = [f'{k} U+{c:04X}' for k, cs in harap.items() for c in cs
             if k not in kode(cek(f'Peringatan dini {chr(c)} aktif di 12 kabupaten pada 2024.'))]
    assert not lolos, f'glif lolos: {lolos}'
    assert 'S-2' in kode(cek('IRBI 2024 • 38 provinsi'))
    # segitiga arah bukan emoji; aturannya di PEDOMAN B1.5 dan gerbang D-23
    assert not {'S-1', 'S-2', 'S-3'} & kode(cek('Titik panas naik ▲ 39% dan turun ▼ 12% pada 2024.'))
    for t in ('Wilayah Jawa - Bali mencatat 40 kejadian pada 2024.', 'Wilayah Bali–Nusa Tenggara mencatat 40 kejadian.'):
        assert 'S-4' in kode(cek(t)), t


def uji_celah_ditutup():
    # kutipan panjang tanpa rujukan diperiksa seperti prosa; kutipan pendek atau bersumber tetap dilewati
    cuci = ('Kepala BPBD menyebut banjir 2024 sebagai "pengingat bahwa kesiapsiagaan adalah kunci menuju masa depan '
            'yang lebih tangguh dan bukan sekadar program".')
    assert {'S-19', 'S-20'} <= kode(cek(cuci)), sorted(kode(cek(cuci)))
    assert 'S-20' not in kode(cek('Renas PB menulis "kesiapsiagaan adalah kunci keselamatan warga desa" (BNPB, 2025).'))
    # tahun bukan angka data: "pada 2026" atau "(Maret 2024)" tidak membebaskan paragraf kosong atau kuantor kabur
    kosong = dict(CONTOH)['S-37']
    for tambah in (' Hal itu berlaku pada 2026.', ' Hal itu terlihat sejak banjir besar (Maret 2024).'):
        assert 'S-37' in kode(cek(kosong + tambah)), tambah
    assert 'S-33' in kode(cek('Banjir rob melanda berbagai daerah pesisir utara Jawa pada 2024.'))
    # atribusi kabur dinilai per kalimat: sitasi di kalimat lain tidak membebaskannya
    assert 'S-34' in kode(cek('Para ahli menyatakan megathrust dapat terjadi kapan saja. Gempa Cianjur 2022 '
                              'menimbulkan kerugian besar (BNPB, 2023).'))
    # pengenceran: gugus slop tetap GAGAL di bab panjang yang skornya sendiri di bawah ambang final
    slop04 = next(s['teks'] for s in SAMPEL['slop'] if s['id'] == 'slop-04')
    bab = '\n\n'.join([s['teks'] for s in SAMPEL['baik']] * 4 + [slop04])
    h = cek(bab, final=True)
    assert h['skor'] <= slop.AMBANG_FINAL and h['status'] == 'GAGAL' and 'S-39' in kode(h), (h['skor'], _temuan(h))
    # Kata Pengantar tidak wajib berangka; bab isi wajib
    assert 'S-37' not in kode(cek('# Kata Pengantar\n\n' + kosong))
    assert 'S-37' in kode(cek('# Pendahuluan\n\n' + kosong))
    # draf juga GAGAL pada temuan tinggi (ANTI-SLOP 6.1 Tahap 1)
    assert cek(dict(CONTOH)['S-20'])['status'] == 'GAGAL'
    # kontras "X, bukan Y" dilarang di slide (Buku Pegangan); di DOCX dinilai penyunting (M-10)
    h = slop.nilai_unit('Slide 1', [slop._para('slide', 'Titik panas, bukan kebakaran, pada 2024', 'uji.pptx slide 1 par.1')])
    assert 'S-19' in {t['kode'] for t in h['temuan']}, h['temuan']


if __name__ == '__main__':
    uji = [v for k, v in sorted(globals().items()) if k.startswith('uji_')]
    for f in uji:
        f()
        print(f'lolos  {f.__name__}')
    print(f'{len(uji)} uji lolos, {len(CONTOH)} contoh slop tertangkap per kode')
