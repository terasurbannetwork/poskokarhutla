"""Daftar input pelaporan bencana (Word sederhana): input umum dan input khusus per jenis bencana,
dikelompokkan per bagian.

  py data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/buat_daftar_word.py

Isi daftar diambil dari isian yang benar-benar ditulis dalam laphar dan logbook Pusdalops 1 Januari 2025 sampai 29 Oktober 2026
(hitungan di isian.json, lihat urai_isian.py). Tanpa rekomendasi.
"""
import datetime
import os

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

DI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(DI, '../../../..'))
NAVY = RGBColor(0x05, 0x1C, 0x2C)
ORANYE = RGBColor(0xD9, 0x60, 0x0B)
ABU = RGBColor(0x6B, 0x72, 0x80)
FONT = 'Roboto'

UMUM = [
    ('Identitas dan waktu', [
        'Jenis bencana',
        'Waktu kejadian (tanggal, jam, zona waktu)',
        'Waktu pengkinian',
    ]),
    ('Lokasi', [
        'Provinsi, kabupaten/kota, kecamatan, desa',
        'Jumlah kecamatan dan desa terdampak',
    ]),
    ('Kronologi', [
        'Kronologi kejadian',
    ]),
    ('Korban', [
        'Meninggal (orang)',
        'Hilang (orang)',
        'Luka-luka (orang)',
        'Terdampak (KK dan jiwa)',
        'Mengungsi (KK dan jiwa)',
        'Terancam (KK dan jiwa)',
        'Kelompok rentan (balita, lansia, ibu hamil, disabilitas)',
    ]),
    ('Kerusakan rumah', [
        'Rumah rusak berat, rusak sedang, dan rusak ringan (unit)',
        'Rumah terdampak (unit)',
    ]),
    ('Kerusakan fasilitas dan prasarana', [
        'Fasilitas: sekolah, rumah ibadah, fasilitas kesehatan, kantor, pasar (unit)',
        'Jalan rusak atau terputus (meter, titik)',
        'Jembatan rusak (unit)',
        'Listrik, air bersih, dan telekomunikasi',
    ]),
    ('Kerugian', [
        'Kendaraan rusak (unit)',
        'Taksiran kerugian (rupiah)',
    ]),
    ('Status dan penanganan', [
        'Status keadaan darurat (nomor SK dan masa berlaku)',
        'Upaya penanganan',
        'Unsur yang terlibat',
        'Pos komando dan dapur umum',
        'Distribusi logistik',
    ]),
    ('Kebutuhan dan kondisi', [
        'Kebutuhan mendesak',
        'Kendala',
        'Kondisi mutakhir',
    ]),
    ('Sumber', [
        'Sumber laporan',
        'Dokumentasi',
    ]),
]

KHUSUS = [
    ('Banjir', [
        ('Pemicu dan kondisi air', [
            'Hujan pemicu (intensitas)',
            'Debit atau status sungai dan pintu air',
            'Tinggi muka air atau genangan (cm)',
            'Material yang terbawa (lumpur, kayu, batu)',
        ]),
        ('Dampak khusus', [
            'Rumah terendam (unit)',
            'Rumah hanyut atau tertimbun (unit)',
            'Tanggul, talud, atau irigasi rusak (meter, titik)',
            'Sawah terdampak (ha)',
            'Kebun terdampak (ha)',
            'Tambak atau kolam terdampak (ha)',
            'Ternak (ekor)',
        ]),
        ('Penanganan khusus', [
            'Pompa air yang dioperasikan (unit)',
            'Alat berat (unit)',
        ]),
    ]),
    ('Tanah longsor', [
        ('Pemicu dan kondisi lereng', [
            'Hujan pemicu (intensitas)',
            'Material longsor, gerakan tanah, atau retakan',
            'Dimensi longsoran (panjang, lebar, tinggi, volume)',
        ]),
        ('Dampak khusus', [
            'Rumah tertimbun (unit)',
            'Talud atau tebing rusak (meter, titik)',
        ]),
        ('Penanganan khusus', [
            'Alat berat (unit)',
            'Pencarian dan pertolongan korban',
        ]),
    ]),
    ('Gelombang pasang dan abrasi', [
        ('Pemicu dan kondisi laut', [
            'Rob, pasang laut, atau abrasi garis pantai',
            'Hujan atau cuaca pemicu',
        ]),
        ('Dampak khusus', [
            'Panjang pantai tergerus (meter)',
            'Tanggul atau talud pantai rusak (meter)',
            'Perahu atau kapal rusak (unit)',
        ]),
    ]),
    ('Cuaca ekstrem', [
        ('Pemicu', [
            'Hujan dan angin pemicu (intensitas)',
        ]),
        ('Dampak khusus', [
            'Pohon tumbang (batang, titik)',
            'Atap rusak atau terbang (unit)',
            'Tiang listrik roboh atau listrik padam',
        ]),
    ]),
    ('Kekeringan', [
        ('Kondisi kekeringan', [
            'Hari tanpa hujan atau musim kemarau',
            'Kondisi sumber air (sungai, sumur, mata air)',
        ]),
        ('Dampak khusus', [
            'Krisis air bersih (desa, KK, jiwa)',
            'Sawah terdampak atau puso (ha)',
        ]),
        ('Penanganan khusus', [
            'Distribusi air bersih (liter, tangki)',
            'Pompa air (unit)',
        ]),
    ]),
    ('Kebakaran hutan dan lahan', [
        ('Kondisi api', [
            'Hotspot atau titik api',
            'Status api (aktif, dikendalikan, pendinginan, padam)',
            'Jenis lahan (gambut, mineral, semak belukar)',
        ]),
        ('Dampak khusus', [
            'Luas lahan terbakar (ha)',
            'Kebun terbakar (ha)',
            'Asap, kualitas udara, dan jarak pandang',
        ]),
        ('Penanganan khusus', [
            'Operasi udara (bom air, patroli udara, modifikasi cuaca)',
            'Pompa dan peralatan pemadam (unit)',
        ]),
    ]),
    ('Gempa bumi', [
        ('Parameter gempa', [
            'Magnitudo',
            'Kedalaman dan pusat gempa (km, koordinat)',
            'Intensitas guncangan (MMI) atau wilayah yang merasakan',
            'Gempa susulan',
        ]),
        ('Dampak khusus', [
            'Retakan tanah atau tanah bergerak',
        ]),
    ]),
    ('Tsunami', [
        ('Keterangan', [
            'Belum ada laporan tsunami dalam laphar dan logbook 2025 sampai 2026.',
        ]),
    ]),
    ('Erupsi gunung api', [
        ('Aktivitas gunung api', [
            'Level aktivitas gunung api',
            'Awan panas, lahar, dan radius bahaya (km)',
            'Kolom abu dan hujan abu',
            'Arah dan kecepatan angin',
        ]),
        ('Dampak khusus', [
            'Asap dan jarak pandang',
            'Gangguan kesehatan (ISPA)',
            'Atap rusak atau tertimbun abu (unit)',
            'Kebun terdampak (ha)',
        ]),
        ('Penanganan khusus', [
            'Pencarian dan pertolongan korban',
            'Helikopter untuk pemantauan atau evakuasi',
        ]),
    ]),
    ('Kebakaran gedung dan permukiman', [
        ('Kondisi api', [
            'Penyebab kebakaran',
            'Status api (padam, pendinginan)',
        ]),
        ('Dampak khusus', [
            'Rumah atau bangunan terbakar (unit)',
            'Luas area terbakar',
        ]),
        ('Penanganan khusus', [
            'Unit pemadam kebakaran yang dikerahkan',
        ]),
    ]),
]


def gaya(run, ukuran=11, tebal=False, warna=None):
    run.font.name = FONT
    run.font.size = Pt(ukuran)
    run.font.bold = tebal
    if warna:
        run.font.color.rgb = warna


def garis_bawah(p, warna='D9600B'):
    pPr = p._p.get_or_add_pPr()
    bdr = OxmlElement('w:pBdr')
    b = OxmlElement('w:bottom')
    for k, v in (('w:val', 'single'), ('w:sz', '6'), ('w:space', '1'), ('w:color', warna)):
        b.set(qn(k), v)
    bdr.append(b)
    pPr.append(bdr)


def main():
    doc = Document()
    for s in doc.sections:
        s.top_margin = s.bottom_margin = Cm(2)
        s.left_margin = s.right_margin = Cm(2.5)
    st = doc.styles['Normal']
    st.font.name = FONT
    st.font.size = Pt(11)

    # logo KRIS dan BNPB
    kris = os.path.join(REPO, 'data/laporan-bnpb/generator/sampul/media/kris-logo.png')
    bnpb = os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-bnpb/logo/sumber-bnpb.png')
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    if os.path.exists(kris):
        p.add_run().add_picture(kris, height=Cm(0.9))
        p.add_run('   ')
    if os.path.exists(bnpb):
        p.add_run().add_picture(bnpb, height=Cm(1.3))

    p = doc.add_paragraph()
    gaya(p.add_run('Daftar Input Pelaporan Kejadian Bencana'), 16, True, NAVY)
    p = doc.add_paragraph()
    gaya(p.add_run('Diambil dari isian yang ditulis dalam laporan harian dan logbook Pusdalops BNPB periode 1 Januari 2025 sampai 29 Oktober 2026.'), 10, warna=ABU)

    def judul(t):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        gaya(p.add_run(t), 14, True, NAVY)
        garis_bawah(p)

    def kelompok(t):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        gaya(p.add_run(t), 11, True, ORANYE)

    def daftar(butir):
        for i, b in enumerate(butir):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.keep_with_next = i < len(butir) - 1   # satu kelompok tidak terpotong halaman
            gaya(p.add_run(b))

    judul('Umum')
    for nama_kel, butir in UMUM:
        kelompok(nama_kel)
        daftar(butir)
    for nama, kel in KHUSUS:
        judul(f'Khusus {nama.lower()}')
        for nama_kel, butir in kel:
            kelompok(nama_kel)
            daftar(butir)

    kel = os.path.join(DI, '..', 'keluaran', '04 Landasan Formulir Pelaporan', f'Daftar Input Pelaporan Bencana {datetime.date.today():%d%m%y}.docx')
    os.makedirs(os.path.dirname(kel), exist_ok=True)
    doc.save(kel)
    print(os.path.abspath(kel))


if __name__ == '__main__':
    main()
