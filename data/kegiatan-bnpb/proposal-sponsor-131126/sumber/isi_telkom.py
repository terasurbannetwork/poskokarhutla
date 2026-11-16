"""Isi proposal BNPB dan Telkom University kepada PT Telkom Indonesia (Persero) Tbk: Sekolah Siaga Imersif."""
from pathlib import Path
from angka import *

D = Path(__file__).resolve().parent
NAMA = 'Sekolah Siaga Imersif'

ISI = {
    'judul': f'Proposal Kerja Sama Program {NAMA}: BNPB, Telkom University, dan PT Telkom Indonesia',
    'berkas': 'Proposal Kerja Sama Sekolah Siaga Imersif BNPB Telkom University Telkom 131126',
    'kepala': f'Proposal Kerja Sama Program {NAMA}',
    'jenis': 'PROPOSAL KERJA SAMA PROGRAM',
    'judul_sampul': ['Sekolah Siaga Imersif', 'BNPB Goes to School', 'and Campus'],
    'sub': 'Edukasi kesiapsiagaan bencana dengan simulasi realitas virtual (VR) dan realitas tertambah (AR) '
           'untuk sekolah dan kampus di daerah rawan bencana',
    'logo_mitra': [(str(D / 'logo-telu.png'), 2.2)],
    'blok_sampul': [
        ('DIAJUKAN OLEH', 'Badan Nasional Penanggulangan Bencana (BNPB) bersama Telkom University'),
        ('DIAJUKAN KEPADA', 'PT Telkom Indonesia (Persero) Tbk, Unit Tanggung Jawab Sosial dan Lingkungan (TJSL)'),
        ('NARAHUBUNG BNPB', 'Alfatehan Septianta, Staf Ahli Kepala BNPB Bidang Riset, Inovasi, dan Kerja Sama Perguruan Tinggi'),
    ],
    'tanggal': 'Jakarta, 13 November 2026',
    'ringkasan': [
        f'BNPB dan Telkom University (Tel-U) mengajak PT Telkom Indonesia mendanai program {NAMA}, yaitu edukasi kesiapsiagaan bencana '
        f'dengan simulasi VR dan AR yang dibawa berkeliling ke {T_SEKOLAH} sekolah dan {T_KAMPUS} kampus di {T_PROV} provinsi rawan bencana selama {T_BULAN} bulan.',
        f'Lebih dari 25 juta siswa belajar di sekolah dengan ancaman bencana sedang sampai tinggi, sedangkan program Satuan Pendidikan Aman Bencana (SPAB) '
        f'baru menjangkau sekitar 5% satuan pendidikan. Simulasi VR membuat siswa "mengalami" gempa, tsunami, banjir, dan kebakaran tanpa bahaya, '
        f'dan studi di Indonesia menunjukkan kenaikan pengetahuan yang bertahan sampai tiga bulan.',
        f'Konten dibangun di Metaverse Research and Experience Center (MREC) Tel-U. BNPB menyediakan kurikulum, data risiko, dan akses sekolah melalui BPBD. '
        f'Telkom menjadi sponsor utama dengan perkiraan dukungan {rp(T_TOTAL)} dari dana TJSL bidang pendidikan. Dana tidak melalui APBN dan tidak masuk kas BNPB, '
        f'sehingga program dapat dimulai segera setelah perjanjian kerja sama ditandatangani.',
    ],
    'bab': [
        {'judul': 'Latar Belakang', 'isi': [
            ('p', 'Sekolah adalah tempat anak menghabiskan sebagian besar harinya, dan sebagian besar sekolah Indonesia berdiri di daerah rawan bencana. '
                  'Pemetaan Kementerian Pendidikan Dasar dan Menengah bersama BNPB pada April 2025 mencatat lebih dari 400 ribu sekolah berada di zona gempa, '
                  '200 ribu di zona banjir, dan 8 ribu di zona tsunami. Lebih dari 57% sekolah menghadapi lebih dari dua jenis ancaman.'),
            ('kartu', [
                ('siswa di sekolah berancaman sedang sampai tinggi', 'Ditambah sekitar 1,5 juta guru (Kemendikdasmen, April 2025).', '25 juta'),
                ('satuan pendidikan terdampak dalam 15 tahun', 'Rata-rata lebih dari 2.500 sekolah terdampak setiap tahun.', '72 ribu'),
                ('satuan pendidikan terdampak banjir Sumatra', 'Data Kemendikdasmen per 30 Desember 2025.', '4.149'),
            ]),
            ('sumber', 'Metro TV, 27 April 2025, mengutip pemetaan Kemendikdasmen dan BNPB; NU Online dan Tirto, Desember 2025.'),
            ('p', 'Program SPAB sudah berjalan sejak 2019, tetapi jangkauannya masih terbatas. Kemenko PMK menyebut SPAB baru menjangkau sekitar 5% satuan pendidikan. '
                  'Metode yang dipakai umumnya ceramah dan simulasi evakuasi sekali setahun, sehingga siswa sulit membayangkan situasi bencana yang sebenarnya.'),
            ('p', 'Teknologi realitas virtual memberi jalan keluar. Siswa dapat merasakan guncangan gempa di ruang kelas, melihat air tsunami naik, '
                  'atau mencari jalan keluar dari gedung yang terbakar, lalu belajar dari kesalahannya tanpa risiko. Studi pada 400 relawan perdesaan Indonesia '
                  '(Journal of Medical Internet Research, 2025) menemukan pelatihan VR meningkatkan pengetahuan dan keterampilan secara bermakna, dan kenaikan itu '
                  'bertahan sampai tiga bulan. Uji pada 150 siswa di Selandia Baru (University of Auckland, 2019) juga menunjukkan pengetahuan siswa tentang '
                  'tindakan saat gempa naik setelah memainkan simulasi VR.'),
            ('p', 'BNPB sedang merancang program kerja sama dengan perguruan tinggi. Pembiayaan sepenuhnya dari APBN cukup berat dan prosesnya panjang, '
                  'sehingga BNPB membuka skema kerja sama dengan dunia usaha dalam bentuk sponsor. Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana '
                  'Pasal 28 dan 29 memberi ruang bagi lembaga usaha untuk berperan dalam penanggulangan bencana.'),
        ]},
        {'judul': 'Mengapa Telkom University dan Telkom', 'isi': [
            ('p', 'Ketiga pihak membawa kekuatan yang saling melengkapi. Tidak ada satu pihak pun yang dapat menjalankan program ini sendirian.'),
            ('tabel', dict(kolom=['Pihak', 'Kekuatan yang sudah ada', 'Bukti'], lebar=[1.1, 2.4, 2.2], baris=[
                ['Telkom University', 'MREC adalah pusat keunggulan riset VR, AR, dan web 3D Tel-U. Tel-U ditunjuk sebagai Metaverse Research and Experience Center Indonesia setelah MoU dengan Meta dan TIP pada 2022.',
                 'Tel-U sudah mengembangkan simulasi VR evakuasi gempa (QuakeEzkape) dan kebakaran (VireEzkape) untuk Meta Quest, serta edukasi gempa SIGAP berbasis video 360.'],
                ['PT Telkom Indonesia', 'Telkom memiliki dana TJSL dengan bidang pendidikan sebagai prioritas, jaringan internet sampai sekolah 3T, dan Education Hub.',
                 'Telkom menjalankan pelatihan VR untuk 200 siswa disabilitas di Tangerang pada Desember 2025 dan menyalurkan kuota internet ke 21 sekolah 3T.'],
                ['BNPB', 'BNPB memegang kurikulum kesiapsiagaan, data risiko InaRISK per sekolah, dan jejaring BPBD di seluruh provinsi.',
                 'BNPB menyusun buku pembelajaran SPAB dan mengoordinasikan Seknas SPAB bersama Kemendikdasmen.'],
            ])),
            ('sumber', 'Situs MREC Telkom University; e-Proceeding Applied Science Tel-U Vol. 11 No. 4, 2025; telkom.co.id, 31 Desember 2025; Investortrust, 27 November 2025; buku pembelajaran SPAB BNPB.'),
            ('p', 'Telkom juga sudah hadir saat bencana. Setelah gempa Cianjur 2022, Telkom menyalurkan bantuan Rp1 miliar dan membangun gedung SD sementara untuk SDN Cibulakan. '
                  'Saat banjir Sumatra akhir 2025, TelkomGroup menyalurkan bantuan Rp4,81 miliar di lebih dari 48 lokasi dan memasang internet satelit di posko. '
                  'Program ini memindahkan peran itu ke tahap sebelum bencana: menyiapkan siswa agar selamat.'),
        ]},
        {'judul': 'Tujuan dan Sasaran', 'isi': [
            ('h', 'Tujuan'),
            ('ol', ['Meningkatkan pengetahuan dan keterampilan siswa, mahasiswa, dan guru tentang tindakan penyelamatan diri saat gempa, tsunami, banjir, dan kebakaran.',
                    'Menyediakan konten VR dan AR kebencanaan berbahasa Indonesia yang terbuka dipakai sekolah, BPBD, dan relawan.',
                    'Membentuk guru penggerak siaga yang melanjutkan latihan di sekolahnya setelah tim keliling pergi.',
                    'Mengukur dampak dengan uji sebelum dan sesudah sesi, sehingga hasilnya dapat dilaporkan sebagai capaian TJSL yang terukur.']),
            ('h', 'Sasaran usulan'),
            ('tabel', dict(kolom=['Sasaran', 'Jumlah', 'Keterangan'], lebar=[2.2, 1, 2.8], rata=['l', 'c', 'l'], baris=[
                ['Sekolah dikunjungi', angka(T_SEKOLAH), f'SD, SMP, dan SMA di {T_PROV} provinsi uji coba'],
                ['Siswa ikut sesi simulasi', angka(T_SISWA), f'Sekitar {angka(T_SISWA_PER)} siswa per sekolah dalam satu hari kunjungan'],
                ['Kampus dikunjungi', angka(T_KAMPUS), 'Kampus mitra BNPB di provinsi yang sama'],
                ['Mahasiswa ikut sesi kampus', angka(T_MHS), 'Mahasiswa dilatih menjadi fasilitator relawan'],
                ['Guru penggerak siaga dilatih', angka(T_GURU), 'Empat guru per sekolah'],
                ['Modul simulasi VR', angka(T_MODUL), 'Gempa, tsunami, banjir, dan kebakaran'],
                ['Aplikasi AR jalur evakuasi', '1', 'Peta jalur evakuasi tiap sekolah tampil di layar ponsel'],
            ])),
            ('p', f'Provinsi uji coba yang diusulkan adalah Jawa Barat, Aceh, Sumatera Barat, Nusa Tenggara Timur, dan Sulawesi Tengah. Provinsi itu dipilih karena '
                  'menghadapi ancaman gempa, tsunami, atau banjir besar dalam dua tahun terakhir, dan memiliki kampus mitra BNPB. Daftar akhir disepakati bersama Telkom.'),
        ]},
        {'judul': 'Ruang Lingkup Program', 'isi': [
            ('p', 'Program terdiri atas empat komponen yang berjalan berurutan dan saling menguatkan.'),
            ('tabel', dict(kolom=['Komponen', 'Kegiatan', 'Keluaran', 'Pelaksana'], lebar=[1.3, 2.6, 1.8, 1.1], baris=[
                ['A. Konten imersif', 'Tel-U memproduksi empat modul simulasi VR berdasarkan prosedur BNPB. Setiap modul berdurasi 10 sampai 15 menit dan memuat penilaian otomatis.',
                 'Empat modul VR dan satu aplikasi AR jalur evakuasi', 'MREC Tel-U, ditinjau BNPB'],
                ['B. Keliling sekolah', 'Tim membawa paket VR ke sekolah. Setiap sesi terdiri atas pengantar, simulasi VR, dan latihan evakuasi nyata di halaman sekolah.',
                 f'{angka(T_SISWA)} siswa di {T_SEKOLAH} sekolah', 'BNPB, BPBD, mahasiswa fasilitator'],
                ['C. BNPB Goes to Campus', 'Kuliah umum kebencanaan, sesi simulasi, dan pelatihan mahasiswa sebagai fasilitator relawan.',
                 f'{angka(T_MHS)} mahasiswa di {T_KAMPUS} kampus', 'BNPB, Tel-U, kampus tuan rumah'],
                ['D. Guru penggerak', 'Pelatihan guru memakai modul dan aplikasi AR, lalu menyusun rencana latihan sekolah.',
                 f'{angka(T_GURU)} guru dan rencana latihan sekolah', 'BNPB dan Tel-U'],
            ])),
            ('p', 'Konten dirancang agar dapat dipakai tanpa koneksi internet di lokasi. Versi ponsel berbasis video 360 disiapkan untuk sekolah yang belum memiliki headset, '
                  'sehingga sekolah tetap dapat melanjutkan latihan setelah tim keliling pergi.'),
        ]},
        {'judul': 'Linimasa Program', 'isi': [
            ('p', 'Program berjalan dua belas bulan dalam tiga fase. Fase uji coba di Jawa Barat dipakai untuk memperbaiki konten sebelum keliling ke provinsi lain.'),
            ('tabel', dict(kolom=['Fase', 'Waktu', 'Kegiatan utama', 'Hasil'], lebar=[1.1, 1.3, 3.0, 1.6], baris=[
                ['I. Persiapan', 'Januari sampai Maret 2027', 'Penandatanganan perjanjian kerja sama, produksi empat modul VR dan aplikasi AR, pengadaan paket VR, pelatihan mahasiswa fasilitator, uji coba di 10 sekolah Jawa Barat',
                 'Konten final dan tim siap'],
                ['II. Pelaksanaan', 'April sampai Oktober 2027', 'Keliling 90 sekolah dan 10 kampus di lima provinsi, pelatihan guru penggerak, peluncuran pada acara Telkom atau Hari Kesiapsiagaan Bencana 26 April',
                 'Sesi berjalan di semua lokasi'],
                ['III. Evaluasi', 'November sampai Desember 2027', 'Uji pengetahuan tiga bulan setelah sesi, laporan dampak, penyerahan konten sebagai materi terbuka, rencana perluasan',
                 'Laporan dampak dan rencana tahun kedua'],
            ])),
        ]},
        {'judul': 'Peran Para Pihak', 'isi': [
            ('tabel', dict(kolom=['Pihak', 'Peran dan tanggung jawab'], lebar=[1.2, 4.8], baris=[
                ['BNPB', 'Mengarahkan substansi dan menyetujui prosedur keselamatan di setiap modul.\nMenyediakan data risiko InaRISK dan daftar sekolah rawan.\nMenggerakkan BPBD untuk izin dan pendampingan di sekolah.\nMenandatangani sertifikat dan laporan bersama.'],
                ['Telkom University', 'Memproduksi konten VR dan AR melalui MREC.\nMenyiapkan dan mendampingi mahasiswa fasilitator.\nMengelola paket VR, jadwal keliling, serta pengukuran sebelum dan sesudah sesi.\nMenyusun laporan dampak.'],
                ['PT Telkom Indonesia', 'Menyediakan dana program dari TJSL bidang pendidikan.\nMenyediakan koneksi internet sekolah sasaran bila diperlukan.\nMengirim relawan karyawan pada sesi keliling.\nMenjadi tuan rumah peluncuran dan publikasi.'],
                ['BPBD dan sekolah', 'Memberi izin, menyiapkan ruang, dan menjadwalkan siswa.\nMenjalankan latihan lanjutan bersama guru penggerak.'],
            ])),
        ]},
        {'judul': 'Anggaran dan Bentuk Dukungan', 'isi': [
            ('p', f'Perkiraan kebutuhan program adalah {rp(T_TOTAL)} untuk dua belas bulan. Angka ini adalah perkiraan awal dengan asumsi harga satuan tertulis, '
                  'dan disepakati ulang bersama Telkom sebelum perjanjian kerja sama ditandatangani.'),
            ('tabel', dict(kolom=['Komponen', 'Volume', 'Harga satuan', 'Jumlah', 'Bentuk dukungan'], lebar=[2.6, 1.1, 1.1, 1.1, 1.5],
                           rata=['l', 'c', 'r', 'r', 'l'], total=True, baris=[
                [k, f'{angka(v)} {s}', rp(h), rp(j), b] for k, v, s, h, j, b in T_RINCI] + [
                ['Pemantauan, evaluasi, dan pelaporan (10%)', '', '', rp(T_MONEV), 'Dana'],
                ['Jumlah', '', '', rp(T_TOTAL), '']])),
            ('sumber', 'Perkiraan tim BNPB, 13 November 2026. Harga headset memakai acuan harga Meta Quest 3S (peluncuran 2024 sekitar US$300, naik pada April 2026) ditambah tas, pengisi daya, dan lisensi pengelolaan perangkat.'),
            ('p', 'Telkom dapat memilih paket dukungan sesuai kemampuan anggaran TJSL tahun berjalan.'),
            ('tabel', dict(kolom=['Paket', 'Cakupan', 'Perkiraan'], lebar=[1.2, 3.6, 1.2], rata=['l', 'l', 'r'], baris=[
                ['Utama', f'Seluruh program: empat modul, {T_SEKOLAH} sekolah, {T_KAMPUS} kampus, {T_GURU} guru', rp(T_TOTAL)],
                ['Menengah', 'Empat modul, aplikasi AR, 100 headset, keliling 50 sekolah dan 5 kampus di tiga provinsi, 200 guru', rp(T_PAKET_MENENGAH)],
                ['Awal', 'Dua modul (gempa dan banjir), 20 headset, uji coba di 20 sekolah Jawa Barat', rp(T_PAKET_AWAL)],
            ])),
        ]},
        {'judul': 'Manfaat bagi Telkom', 'isi': [
            ('ul', ['**Sesuai prioritas TJSL.** Peraturan Menteri BUMN Nomor PER-1/MBU/03/2023 Pasal 20 ayat (3) mengutamakan bidang pendidikan untuk TJSL berbentuk bantuan.',
                    '**Dampak terukur.** Setiap sesi diukur dengan uji sebelum dan sesudah, sehingga laporan keberlanjutan Telkom memuat angka kenaikan pengetahuan, bukan hanya jumlah peserta.',
                    '**Kontribusi pada SDGs.** Program mendukung tujuan 4 (pendidikan berkualitas), 11 (kota dan permukiman tangguh), dan 13 (penanganan perubahan iklim).',
                    '**Etalase teknologi.** Konten imersif buatan Tel-U menunjukkan kemampuan digital Grup Telkom untuk kepentingan publik.',
                    '**Penyebutan bersama.** Nama dan logo Telkom tampil di modul, sertifikat peserta, laporan, dan publikasi bersama BNPB, mengikuti etika komunikasi kebencanaan.']),
        ]},
        {'judul': 'Tata Kelola dan Mekanisme Pendanaan', 'isi': [
            ('p', 'Skema ini dirancang agar aman secara aturan dan cepat dijalankan.'),
            ('ol', ['**Dasar kerja sama.** BNPB, Tel-U, dan Telkom menandatangani perjanjian kerja sama tiga pihak yang memuat ruang lingkup, peran, jadwal, dan pelaporan.',
                    '**Dana tidak masuk kas BNPB.** Telkom menyalurkan dana TJSL langsung kepada Tel-U sebagai pelaksana, atau membelanjakan barang sendiri. Dengan cara ini dana tidak menjadi penerimaan negara dan tidak melalui proses APBN.',
                    '**Bila ada barang diserahkan ke BNPB.** Barang yang diserahkan kepada BNPB dicatat sebagai hibah langsung bentuk barang dan diregistrasi sesuai Peraturan Menteri Keuangan Nomor 99/PMK.05/2017.',
                    '**Peran BNPB.** BNPB berperan sebagai pengarah substansi dan penjamin mutu, bukan pengelola dana.',
                    '**Pelaporan.** Tel-U menyampaikan laporan kemajuan setiap tiga bulan dan laporan akhir yang diaudit sesuai ketentuan TJSL Telkom.',
                    '**Kekayaan intelektual.** Konten menjadi milik bersama Tel-U dan BNPB dan dibuka untuk pendidikan nonkomersial, dengan penyebutan Telkom sebagai sponsor.']),
        ]},
        {'judul': 'Langkah Berikutnya', 'isi': [
            ('tabel', dict(kolom=['Langkah', 'Penanggung jawab', 'Waktu'], lebar=[3.6, 1.6, 1.2], baris=[
                ['Audiensi BNPB dan Tel-U membahas konsep dan peran MREC', 'BNPB dan Tel-U', 'Minggu ketiga November 2026'],
                ['Penyampaian proposal kepada Unit TJSL Telkom', 'BNPB dan Tel-U', 'Akhir November 2026'],
                ['Penyesuaian paket dan anggaran bersama Telkom', 'Ketiga pihak', 'Desember 2026'],
                ['Penandatanganan perjanjian kerja sama', 'Ketiga pihak', 'Januari 2027'],
                ['Uji coba di 10 sekolah Jawa Barat', 'Tel-U dan BPBD Jawa Barat', 'Maret 2027'],
            ])),
        ]},
    ],
    'lampiran': {'judul': 'Daftar Rujukan', 'isi': [
        ('ol', ['Metro TV, 27 April 2025. Sebagian besar satuan pendidikan berada di zona rawan bencana. metrotvnews.com',
                'BNPB. Buku Pembelajaran Satuan Pendidikan Aman Bencana. bnpb.go.id',
                'Kemenko PMK. Dorong kolaborasi pentahelix dalam implementasi SPAB. kemenkopmk.go.id',
                'NU Online, Desember 2025. Banjir Sumatra sebabkan 3.274 sekolah rusak. nu.or.id',
                'Calisanie dkk. 2025. Journal of Medical Internet Research 27:e74108. doi.org/10.2196/74108',
                'University of Auckland, 11 Juli 2019. VR game simulates earthquake to help children stay safe. auckland.ac.nz',
                'Telkom University. Metaverse Research and Experience Center. mrec.center.telkomuniversity.ac.id',
                'e-Proceeding of Applied Science Tel-U, Vol. 11 No. 4, 2025. VR Simulation on School of Applied Science Telkom University.',
                'PT Telkom Indonesia, 31 Desember 2025. Limitless Learning: Telkom brings VR experiences to 200 students with disabilities. telkom.co.id',
                'Bisnis.com, 5 Januari 2026. Telkom tebar internet satelit hingga Telkomsel Orbit di Aceh dan Sumatra.',
                'Peraturan Menteri BUMN Nomor PER-1/MBU/03/2023 tentang Penugasan Khusus dan Program Tanggung Jawab Sosial dan Lingkungan BUMN.',
                'Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana.',
                'Peraturan Menteri Keuangan Nomor 99/PMK.05/2017 tentang Administrasi Pengelolaan Hibah.']),
    ]},
}
