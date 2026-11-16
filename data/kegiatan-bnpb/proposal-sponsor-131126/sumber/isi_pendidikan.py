"""Isi proposal BNPB dan ITB kepada ParagonCorp: Generasi Siaga Bandung Raya (arah pendidikan)."""
from pathlib import Path
from angka import *

D = Path(__file__).resolve().parent
NAMA = 'Generasi Siaga Bandung Raya'
TOT = rp(E_TOTAL, 2)

ISI = {
    'judul': f'Proposal Kerja Sama Program {NAMA}: BNPB, ITB, dan ParagonCorp',
    'berkas': 'Proposal Kerja Sama Generasi Siaga Bandung Raya BNPB ITB Paragon 131126',
    'kepala': f'Proposal Kerja Sama Program {NAMA}',
    'jenis': 'PROPOSAL KERJA SAMA PROGRAM',
    'judul_sampul': ['Generasi Siaga', 'Bandung Raya'],
    'sub': 'Beasiswa riset kebencanaan untuk mahasiswa ITB yang sekaligus mendampingi guru dan sekolah '
           'di Bandung Raya menyiapkan diri menghadapi gempa',
    'logo_mitra': [(str(D / 'logo-itb.png'), 2.2)],
    'blok_sampul': [
        ('DIAJUKAN OLEH', 'Badan Nasional Penanggulangan Bencana (BNPB) bersama Institut Teknologi Bandung (ITB)'),
        ('DIAJUKAN KEPADA', 'PT Paragon Technology and Innovation (ParagonCorp)'),
        ('NARAHUBUNG BNPB', 'Alfatehan Septianta, Staf Ahli Kepala BNPB Bidang Riset, Inovasi, dan Kerja Sama Perguruan Tinggi'),
    ],
    'tanggal': 'Jakarta, 13 November 2026',
    'ringkasan': [
        f'BNPB dan ITB mengajak ParagonCorp mendanai program {NAMA}. Program ini memberi beasiswa riset kebencanaan kepada '
        f'{E_S1} mahasiswa S1 dan {E_S2} mahasiswa magister ITB, dengan paling sedikit separuh penerima perempuan. Penerima beasiswa lalu mendampingi {E_SEKOLAH} sekolah dan '
        f'{E_GURU} guru di Bandung Raya menyusun rencana sekolah aman bencana dan peta evakuasi.',
        'Jawa Barat adalah provinsi dengan kejadian bencana terbanyak di Indonesia pada 2025. Saat gempa Cianjur 2022, '
        '10 guru dan 42 murid meninggal, dan sebagian besar sekolah di Bandung Raya berdiri di dekat Sesar Lembang.',
        f'Program ini menyambung tiga program pendidikan Paragon yang sudah berjalan, yaitu Paragon Scholarship Program (ITB sudah menjadi kampus mitra), '
        f'Wardah Inspiring Teacher, dan Inspiring Lecturer. Perkiraan dukungan adalah {TOT} untuk {E_BULAN} bulan. '
        'Dana tidak melalui APBN dan tidak masuk kas BNPB.',
    ],
    'bab': [
        {'judul': 'Latar Belakang', 'isi': [
            ('p', 'Jawa Barat menanggung beban bencana terbesar di Indonesia. BNPB mencatat Jawa Barat sebagai provinsi dengan kejadian bencana terbanyak '
                  'pada 2025, di atas Jawa Timur dan Jawa Tengah. Provinsi ini menghadapi gempa dari Sesar Lembang, Sesar Cimandiri, dan zona megathrust '
                  'di selatan, ditambah banjir dan longsor setiap musim hujan.'),
            ('kartu', [
                ('provinsi dengan kejadian bencana terbanyak', 'Jawa Barat menurut BNPB untuk tahun 2025.', 'Peringkat 1'),
                ('guru dan murid meninggal saat gempa Cianjur', '10 guru dan 42 murid, November 2022.', '52 jiwa'),
                ('sekolah berada di zona gempa', 'Angka nasional pemetaan Kemendikdasmen dan BNPB, April 2025.', '400 ribu'),
            ]),
            ('sumber', 'Metro TV, Desember 2025 (data BNPB); Antara, November 2022; Metro TV, 27 April 2025.'),
            ('p', 'Sekolah adalah tempat yang paling menentukan keselamatan anak saat gempa terjadi pada jam belajar. Jawa Barat sudah memiliki Peraturan '
                  'Gubernur Nomor 88 Tahun 2020 tentang Satuan Pendidikan Aman Bencana (SPAB), tetapi banyak sekolah belum memiliki rencana kesiapsiagaan '
                  'dan peta evakuasi. Guru membutuhkan pendamping yang memahami ilmu kebencanaan dan dapat datang berulang kali.'),
            ('p', 'ITB memiliki sumber daya itu. Program Magister Multidisiplin Kebencanaan di Sekolah Pascasarjana ITB melibatkan Teknik Sipil, Geofisika, '
                  'Geologi, dan Sains Kebumian. Pakar ITB menyusun peta sumber dan bahaya gempa nasional serta meneliti pergerakan Sesar Lembang. '
                  'Yang belum ada adalah jembatan yang membawa ilmu itu ke ruang kelas secara teratur.'),
            ('p', 'BNPB sedang merancang program kerja sama dengan perguruan tinggi. Pembiayaan sepenuhnya dari APBN berat dan prosesnya panjang, '
                  'sehingga BNPB membuka skema kerja sama dengan dunia usaha dalam bentuk sponsor, sesuai ruang peran lembaga usaha dalam '
                  'Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana.'),
        ]},
        {'judul': 'Mengapa ITB dan Paragon', 'isi': [
            ('p', 'Paragon sudah menjalankan program pendidikan yang besar dan sudah bekerja sama dengan ITB. Program ini tidak membuat jalur baru, '
                  'melainkan mengarahkan sebagian jalur yang sudah ada ke kebencanaan.'),
            ('tabel', dict(kolom=['Program Paragon yang sudah ada', 'Yang sudah berjalan', 'Sambungan dalam program ini'], lebar=[1.5, 2.6, 2.4], baris=[
                ['Paragon Scholarship Program', 'Tunjangan Rp6,25 juta per semester bagi mahasiswa semester lima sampai delapan, paling banyak sepuluh penerima per kampus. ITB termasuk kampus mitra dan PSP 2026 sudah dibuka.',
                 'Jalur khusus tugas akhir dan tesis kebencanaan bagi mahasiswa ITB.'],
                ['Wardah Inspiring Teacher', 'Program pengembangan guru dari PAUD sampai SMA. Generasi kedelapan menyambut 25.000 guru.',
                 'Guru alumni program menjadi guru siaga di sekolah dampingan.'],
                ['Inspiring Lecturer', 'Pelatihan dosen sejak 2021, dan dosen yang proposalnya disetujui mendapat dana.',
                 'Dosen ITB pembimbing penerima beasiswa mendapat dana pendampingan.'],
                ['Kerja sama FMIPA ITB', 'Perjanjian Juni 2026 tentang magang, kuliah tamu, tugas akhir bersama, dan riset bersama.',
                 'Perluasan ke Magister Kebencanaan dan Fakultas Ilmu dan Teknologi Kebumian.'],
            ])),
            ('sumber', 'Detik Edu, 2024; Good News From Indonesia, 6 Juli 2024; multikampus.itb.ac.id; Industry.co.id; Kabar Bursa, Juni 2024; Industry.co.id, 22 Juni 2026.'),
            ('p', 'Hubungan Paragon dengan ITB juga bersifat pribadi. Pendiri Paragon, Dr. (H.C.) Nurhayati Subakat, adalah lulusan Farmasi ITB, dan ITB, '
                  'Pertamina, serta Paragon meresmikan Gedung Labtek XV pada Agustus 2025. Program ini sejalan dengan pilar pendidikan Paragon, '
                  'dan kuota separuh penerima perempuan ikut memperkuat pilar pemberdayaan.'),
        ]},
        {'judul': 'Tujuan dan Sasaran', 'isi': [
            ('h', 'Tujuan'),
            ('ol', ['Menambah jumlah peneliti muda di bidang kebencanaan melalui beasiswa tugas akhir dan tesis.',
                    'Membawa hasil riset ITB tentang gempa ke sekolah di Bandung Raya dalam bentuk yang dapat dipakai guru.',
                    'Membantu sekolah dampingan menyusun rencana kesiapsiagaan dan peta evakuasi sesuai standar SPAB.',
                    'Menyediakan modul ajar dan kelas daring terbuka yang dapat dipakai sekolah lain di Jawa Barat.']),
            ('h', 'Sasaran usulan'),
            ('tabel', dict(kolom=['Sasaran', 'Jumlah', 'Keterangan'], lebar=[2.2, 1, 2.8], rata=['l', 'c', 'l'], baris=[
                ['Mahasiswa S1 penerima beasiswa tugas akhir', angka(E_S1), 'Dari Fakultas Ilmu dan Teknologi Kebumian, Teknik Sipil, dan prodi terkait'],
                ['Mahasiswa magister penerima hibah tesis', angka(E_S2), 'Dari Program Magister Multidisiplin Kebencanaan'],
                ['Sekolah dampingan', angka(E_SEKOLAH), 'Di Kota Bandung, Kabupaten Bandung Barat, dan Kabupaten Bandung'],
                ['Guru siaga terlatih', angka(E_GURU), 'Empat guru per sekolah, diutamakan alumni Wardah Inspiring Teacher'],
                ['Sekolah dengan rencana kesiapsiagaan', angka(E_SEKOLAH), 'Dokumen SPAB dan peta evakuasi disahkan kepala sekolah'],
                ['Modul ajar dan kelas daring', '1', 'Terbuka untuk semua sekolah di Jawa Barat'],
            ])),
        ]},
        {'judul': 'Ruang Lingkup Program', 'isi': [
            ('tabel', dict(kolom=['Komponen', 'Kegiatan', 'Keluaran', 'Pelaksana'], lebar=[1.3, 2.6, 1.8, 1.1], baris=[
                ['A. Beasiswa riset', 'Mahasiswa dipilih lewat seleksi terbuka dengan kuota separuh untuk perempuan. Topik tugas akhir dan tesis diambil dari masalah nyata sekolah dan daerah, misalnya kerentanan gedung sekolah atau waktu evakuasi.',
                 f'{E_S1 + E_S2} karya ilmiah kebencanaan', 'ITB, seleksi bersama Paragon'],
                ['B. Guru siaga', 'Guru mengikuti pelatihan dua hari tentang gempa, longsor, dan penyusunan rencana sekolah, lalu menjadi penggerak di sekolahnya.',
                 f'{E_GURU} guru siaga', 'BNPB dan ITB'],
                ['C. Pendampingan sekolah', 'Setiap penerima beasiswa mendampingi dua atau tiga sekolah sampai rencana kesiapsiagaan, peta evakuasi, dan simulasi selesai.',
                 f'{E_SEKOLAH} sekolah siaga', 'Penerima beasiswa dan dosen pembimbing'],
                ['D. Kelas terbuka', 'Materi pelatihan dan hasil riset disusun menjadi modul ajar serta kelas daring yang terbuka gratis.',
                 'Modul dan kelas daring', 'ITB dan BNPB'],
            ])),
            ('p', 'Komponen A dan C sengaja digabung. Beasiswa tidak hanya membiayai kuliah, tetapi mewajibkan penerima turun ke sekolah, sehingga riset '
                  'mahasiswa langsung berguna bagi guru dan siswa.'),
        ]},
        {'judul': 'Linimasa Program', 'isi': [
            ('tabel', dict(kolom=['Fase', 'Waktu', 'Kegiatan utama', 'Hasil'], lebar=[1.1, 1.3, 3.0, 1.6], baris=[
                ['I. Persiapan', 'Januari sampai Maret 2027', 'Penandatanganan perjanjian, seleksi penerima beasiswa, penetapan sekolah dampingan bersama Dinas Pendidikan dan BPBD',
                 'Penerima dan sekolah terpilih'],
                ['II. Pelatihan dan riset', 'April sampai Agustus 2027', 'Pelatihan guru siaga, riset tugas akhir dan tesis, pendampingan sekolah, penyusunan modul',
                 'Guru terlatih dan rencana sekolah'],
                ['III. Simulasi dan evaluasi', 'September sampai Desember 2027', 'Simulasi evakuasi di semua sekolah, seminar hasil riset, peluncuran kelas daring, laporan dampak',
                 'Sekolah siaga dan laporan akhir'],
            ])),
        ]},
        {'judul': 'Peran Para Pihak', 'isi': [
            ('tabel', dict(kolom=['Pihak', 'Peran dan tanggung jawab'], lebar=[1.2, 4.8], baris=[
                ['BNPB', 'Mengarahkan substansi dan memastikan rencana sekolah sesuai standar SPAB.\nMenyediakan data risiko InaRISK per sekolah.\nMenggerakkan BPBD dan Dinas Pendidikan untuk izin dan pengesahan.'],
                ['ITB', 'Menyeleksi dan membimbing penerima beasiswa.\nMenyusun materi pelatihan dan modul ajar.\nMengelola dana program dan menyusun laporan.'],
                ['ParagonCorp', 'Menyediakan dana beasiswa dan program.\nIkut menyeleksi penerima beasiswa.\nMenghubungkan guru alumni Wardah Inspiring Teacher.'],
                ['Sekolah, BPBD, dan Dinas Pendidikan', 'Menerima pendampingan dan mengesahkan rencana kesiapsiagaan.\nMenjalankan simulasi berkala.'],
            ])),
        ]},
        {'judul': 'Anggaran dan Bentuk Dukungan', 'isi': [
            ('p', f'Perkiraan kebutuhan program adalah {TOT} untuk dua belas bulan. Besaran beasiswa S1 mengikuti tunjangan Paragon Scholarship Program, '
                  'sedangkan angka lain adalah asumsi awal yang disepakati ulang bersama Paragon.'),
            ('tabel', dict(kolom=['Komponen', 'Volume', 'Harga satuan', 'Jumlah', 'Bentuk dukungan'], lebar=[2.6, 1.1, 1.1, 1.1, 1.5],
                           rata=['l', 'c', 'r', 'r', 'l'], total=True, baris=[
                [k, f'{angka(v)} {s}', rp(h), rp(j), b] for k, v, s, h, j, b in E_RINCI] + [
                ['Pemantauan, evaluasi, dan pelaporan (10%)', '', '', rp(E_MONEV), 'Dana'],
                ['Jumlah', '', '', TOT, '']])),
            ('sumber', 'Perkiraan tim BNPB, 13 November 2026; tunjangan Paragon Scholarship Program menurut Detik Edu, 2024.'),
            ('tabel', dict(kolom=['Paket', 'Cakupan', 'Perkiraan'], lebar=[1.2, 3.6, 1.2], rata=['l', 'l', 'r'], baris=[
                ['Utama', f'{E_S1 + E_S2} penerima beasiswa, {E_SEKOLAH} sekolah, {E_GURU} guru, dan kelas daring', TOT],
                ['Menengah', '20 penerima beasiswa S1, 25 sekolah, 100 guru, dan kelas daring', rp(E_PAKET_MENENGAH)],
                ['Awal', '10 penerima beasiswa S1, 10 sekolah, dan 40 guru', rp(E_PAKET_AWAL)],
            ])),
        ]},
        {'judul': 'Manfaat bagi Paragon', 'isi': [
            ('ul', ['**Sesuai pilar pendidikan.** Program memperkuat pilar pendidikan Paragon, dan kuota penerima perempuan menambah nilai pemberdayaan.',
                    '**Memakai program yang sudah ada.** Beasiswa, jaringan guru, dan kerja sama ITB tinggal diarahkan, sehingga biaya pengelolaan rendah.',
                    '**Dampak terukur.** Laporan memuat jumlah sekolah dengan rencana kesiapsiagaan yang sah dan hasil simulasi evakuasi.',
                    '**Kontribusi pada SDGs.** Program mendukung tujuan 4 (pendidikan berkualitas), 11 (permukiman tangguh), dan 13 (penanganan perubahan iklim).',
                    '**Penyebutan bersama.** Nama Paragon tampil pada sertifikat, modul, dan publikasi bersama BNPB dan ITB.']),
        ]},
        {'judul': 'Tata Kelola dan Mekanisme Pendanaan', 'isi': [
            ('ol', ['**Dasar kerja sama.** BNPB, ITB, dan Paragon menandatangani perjanjian kerja sama tiga pihak.',
                    '**Dana tidak masuk kas BNPB.** Paragon menyalurkan dana langsung kepada ITB, atau membayar beasiswa langsung kepada penerima seperti pola Paragon Scholarship Program. Dana tidak menjadi penerimaan negara dan tidak melalui APBN.',
                    '**Peran BNPB.** BNPB berperan sebagai pengarah substansi dan penjamin mutu rencana sekolah, bukan pengelola dana.',
                    '**Pelaporan.** ITB menyampaikan laporan kemajuan setiap tiga bulan dan laporan akhir yang dapat diaudit.',
                    '**Data anak.** Data siswa yang dikumpulkan saat simulasi hanya berupa angka rekap tanpa nama.']),
        ]},
        {'judul': 'Langkah Berikutnya', 'isi': [
            ('tabel', dict(kolom=['Langkah', 'Penanggung jawab', 'Waktu'], lebar=[3.6, 1.6, 1.2], baris=[
                ['Audiensi BNPB dan ITB bersama Sekolah Pascasarjana dan Fakultas Ilmu dan Teknologi Kebumian', 'BNPB dan ITB', 'Minggu ketiga November 2026'],
                ['Penyampaian proposal kepada ParagonCorp', 'BNPB dan ITB', 'Akhir November 2026'],
                ['Penyesuaian kriteria beasiswa dan paket bersama Paragon', 'Ketiga pihak', 'Desember 2026'],
                ['Penandatanganan perjanjian kerja sama', 'Ketiga pihak', 'Januari 2027'],
                ['Seleksi penerima beasiswa dan penetapan sekolah', 'ITB dan Dinas Pendidikan Jawa Barat', 'Maret 2027'],
            ])),
        ]},
    ],
    'lampiran': {'judul': 'Daftar Rujukan', 'isi': [
        ('ol', ['Metro TV, Desember 2025. Jawa dan Sumatra jadi wilayah dengan kejadian bencana tertinggi sepanjang 2025.',
                'Antara Babel, November 2022. Sepuluh guru dan 42 murid di Cianjur wafat akibat gempa.',
                'Metro TV, 27 April 2025. Sebagian besar satuan pendidikan berada di zona rawan bencana.',
                'Peraturan Gubernur Jawa Barat Nomor 88 Tahun 2020 tentang Satuan Pendidikan Aman Bencana.',
                'Sekolah Pascasarjana ITB, 2023. Program Magister Multidisiplin Kebencanaan.',
                'Detik Edu, 2024. Beasiswa Paragon 2024 dibuka.',
                'Good News From Indonesia, 6 Juli 2024. Pendaftaran Beasiswa Paragon dan kampus mitra.',
                'Republika, 4 Agustus 2023, dan Industry.co.id. Wardah Inspiring Teacher.',
                'Kabar Bursa, Juni 2024. Bersama ITB, ParagonCorp kembangkan pendidikan terjangkau.',
                'Industry.co.id, 22 Juni 2026. ParagonCorp dan FMIPA ITB perkuat kolaborasi riset dan talenta sains.',
                'Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana.']),
    ]},
}
