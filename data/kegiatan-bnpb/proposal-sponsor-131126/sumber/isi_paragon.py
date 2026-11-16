"""Isi proposal BNPB dan ITB kepada ParagonCorp: Pengungsian Bermartabat."""
from pathlib import Path
from angka import *

D = Path(__file__).resolve().parent
NAMA = 'Pengungsian Bermartabat'

ISI = {
    'judul': f'Proposal Kerja Sama Program {NAMA}: BNPB, ITB, dan ParagonCorp',
    'berkas': 'Proposal Kerja Sama Pengungsian Bermartabat BNPB ITB Paragon 131126',
    'kepala': f'Proposal Kerja Sama Program {NAMA}',
    'jenis': 'PROPOSAL KERJA SAMA PROGRAM',
    'judul_sampul': ['Pengungsian Bermartabat', 'Kebersihan, Air Bersih, dan', 'Rasa Aman bagi Kelompok Rentan'],
    'sub': 'Kit kebersihan siaga, air bersih dari teknologi ITB, dan riset produk hemat air untuk pengungsi, '
           'terutama lansia, anak, ibu hamil, penyandang disabilitas, dan perempuan',
    'logo_mitra': [(str(D / 'logo-itb.png'), 2.2)],
    'blok_sampul': [
        ('DIAJUKAN OLEH', 'Badan Nasional Penanggulangan Bencana (BNPB) bersama Institut Teknologi Bandung (ITB)'),
        ('DIAJUKAN KEPADA', 'PT Paragon Technology and Innovation (ParagonCorp)'),
        ('NARAHUBUNG BNPB', 'Alfatehan Septianta, Staf Ahli Kepala BNPB Bidang Riset, Inovasi, dan Kerja Sama Perguruan Tinggi'),
    ],
    'tanggal': 'Jakarta, 13 November 2026',
    'ringkasan': [
        f'BNPB dan ITB mengajak ParagonCorp mendanai program {NAMA}. Program ini menyiapkan {angka(P_KIT)} kit kebersihan siaga, '
        f'{P_AIR} unit pengolah air buatan ITB, {P_BILIK} bilik mandi dan cuci terpisah yang ramah disabilitas, serta riset bersama produk kebersihan hemat air, '
        f'dalam {P_BULAN} bulan.',
        'Perlengkapan kebersihan, air bersih, dan ruang mandi yang aman adalah kebutuhan yang paling sering terlambat di pengungsian. Saat gempa Cianjur 2022, '
        'lebih dari 114 ribu orang mengungsi, termasuk 7.309 lansia dan 380 ibu hamil. Saat banjir Sumatra 2025, dokter melaporkan penyakit kulit akibat kurangnya sabun dan air bersih.',
        f'Program ini mempertemukan tiga hal yang sudah terbukti: produk dan bantuan kebersihan Paragon di Sumatra, unit pengolah air ITB yang terpasang di '
        f'puluhan lokasi Sumatra, dan jejaring posko BNPB. Perkiraan dukungan Paragon adalah {rp(P_TOTAL)}. Dana tidak melalui APBN dan tidak masuk kas BNPB.',
    ],
    'bab': [
        {'judul': 'Latar Belakang', 'isi': [
            ('p', 'Bencana besar memaksa ratusan ribu orang tinggal di pengungsian selama berminggu-minggu. Bantuan pangan biasanya datang cepat, '
                  'tetapi kebutuhan kebersihan dan rasa aman sering terlambat. Kekurangan itu paling dirasakan kelompok rentan: lansia, bayi dan anak, ibu hamil, penyandang disabilitas, serta perempuan.'),
            ('kartu', [
                ('pengungsi gempa Cianjur', 'Termasuk 7.309 lansia dan 380 ibu hamil, per 1 Desember 2022.', '114 ribu'),
                ('liter air per orang per hari', 'Standar minimum Sphere untuk minum, memasak, dan kebersihan diri.', '15'),
                ('lebih cepat dengan stok di muka', 'Pengalaman UNFPA di Indonesia saat kit kebersihan disiapkan sebelum bencana.', '3 kali'),
            ]),
            ('sumber', 'DPR RI, Isu Sepekan Desember 2022; Sphere Handbook 2018; UNFPA Asia Pasifik, Dignity Kits.'),
            ('p', 'Laporan dari banjir Sumatra akhir 2025 menunjukkan pola yang sama. Perhimpunan dokter spesialis kulit menyebut pembalut sebagai kebutuhan vital '
                  'yang sering terlewat, dan meminta sabun serta air bersih diutamakan karena penyakit kulit paling banyak ditemukan di pengungsian. '
                  'Komnas Perempuan menyoroti sulitnya mendapat pembalut dan kurangnya toilet terpisah. Sampai Februari 2026, hunian sementara di Aceh '
                  'dilaporkan belum memenuhi standar privasi dan keamanan bagi kelompok rentan.'),
            ('p', 'Masalah ini dapat dicegah dengan persiapan. Kit kebersihan yang sudah disimpan sebelum bencana dapat dikirim dalam 48 jam, '
                  'dan unit pengolah air dapat dipasang di hari pertama. Persiapan itu membutuhkan mitra yang menguasai produk kebersihan, teknologi air, dan jaringan posko.'),
            ('p', 'BNPB sedang merancang program kerja sama dengan perguruan tinggi. Pembiayaan sepenuhnya dari APBN berat dan prosesnya panjang, sehingga BNPB '
                  'membuka skema kerja sama dengan dunia usaha dalam bentuk sponsor. Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana Pasal 28 dan 29 '
                  'memberi ruang bagi lembaga usaha untuk berperan dalam penanggulangan bencana.'),
        ]},
        {'judul': 'Mengapa ITB dan Paragon', 'isi': [
            ('p', 'ITB dan Paragon sudah lama bekerja bersama, dan keduanya sudah hadir di lokasi bencana yang sama. Program ini mengubah bantuan yang selama ini '
                  'dikirim sekali menjadi kesiapan yang terukur dan berulang.'),
            ('tabel', dict(kolom=['Pihak', 'Kekuatan yang sudah ada', 'Bukti'], lebar=[1.0, 2.4, 2.4], baris=[
                ['ParagonCorp', 'Paragon memproduksi sabun, sampo, dan produk perawatan diri dalam skala nasional, untuk keluarga Indonesia, dengan pilar sosial pendidikan, kesehatan, pemberdayaan, dan lingkungan.',
                 'Pada Desember 2025 Paragon mengirim sekitar 30 ton bantuan ke Sumatra, termasuk 1.000 sampo dan sabun serta 14 paket filter air. Paragon juga hadir di Cianjur 2022 bersama Dompet Dhuafa.'],
                ['ITB', 'ITB menguasai teknologi pengolahan air ultrafiltrasi, ilmu farmasi dan kimia untuk formulasi, serta riset mitigasi bencana.',
                 'Lebih dari 47 unit pengolah air ITB dikirim ke Aceh, Sumatera Utara, dan Sumatera Barat. Jaringan pipa 4,1 km di Agam mengalirkan sekitar 35.000 liter per hari untuk 281 keluarga.'],
                ['BNPB', 'BNPB memegang komando posko, data pengungsi, dan gudang logistik pusat dan daerah.',
                 'BNPB bersama ITB memimpin konsorsium 14 kampus untuk pemulihan Sumatra yang diluncurkan pada 12 Januari 2026.'],
            ])),
            ('sumber', 'Katadata, 19 Desember 2025; ITB News, 19 dan 22 Januari 2026; Antara, 4 April 2026; Kabar Bursa, 3 Juni 2024.'),
            ('p', 'Hubungan ITB dan Paragon juga kuat di luar kebencanaan. Pendiri Paragon, Dr. (H.C.) Nurhayati Subakat, adalah lulusan Farmasi ITB. '
                  'ITB, Pertamina, dan Paragon meresmikan Gedung Labtek XV untuk riset material molekuler pada Agustus 2025, dan Paragon menandatangani kerja sama riset '
                  'dan talenta dengan FMIPA ITB pada Juni 2026. Program ini dapat berjalan di atas kerja sama yang sudah ada. Di Agam, ITB membangun air bersih '
                  'dan Paragon menyalurkan 200 paket bantuan di lokasi yang sama.'),
        ]},
        {'judul': 'Tujuan dan Sasaran', 'isi': [
            ('h', 'Tujuan'),
            ('ol', ['Menjamin pengungsi, terutama kelompok rentan, mendapat perlengkapan kebersihan dalam 48 jam sejak status tanggap darurat.',
                    'Menyediakan air bersih di pengungsian pada hari pertama dengan teknologi ITB.',
                    'Menyediakan ruang mandi dan cuci yang aman, terpisah, dan ramah disabilitas.',
                    'Menghasilkan produk kebersihan hemat air yang dirancang untuk kondisi pengungsian melalui riset bersama ITB dan Paragon.',
                    'Membentuk kader siaga pengungsian yang mengelola kebersihan dan melindungi kelompok rentan.']),
            ('h', 'Sasaran usulan'),
            ('tabel', dict(kolom=['Sasaran', 'Jumlah', 'Keterangan'], lebar=[2.2, 1, 2.8], rata=['l', 'c', 'l'], baris=[
                ['Kit kebersihan siaga', angka(P_KIT), 'Tiga jenis: keluarga (termasuk pembalut), lansia, dan bayi'],
                ['Titik stok siaga', angka(P_GUDANG), 'Gudang mitra di Jawa Barat, Sumatera Barat, Sulawesi Tengah, dan Nusa Tenggara Timur'],
                ['Unit pengolah air ultrafiltrasi', angka(P_AIR), 'Siap kirim dan dipasang tim ITB'],
                ['Bilik mandi dan cuci terpisah', angka(P_BILIK), 'Bongkar pasang, berlampu, berkunci, dan ramah disabilitas'],
                ['Formulasi produk hemat air diuji', angka(P_FORMULA), 'Misalnya sampo tanpa bilas dan sabun cair tanpa air'],
                ['Kader siaga pengungsian', angka(P_KADER_N), 'Dari desa rawan bencana, separuhnya perempuan'],
            ])),
        ]},
        {'judul': 'Ruang Lingkup Program', 'isi': [
            ('p', 'Program terdiri atas empat komponen. Komponen A sampai C menyiapkan barang dan teknologi sebelum bencana, sedangkan komponen D menyiapkan orang.'),
            ('tabel', dict(kolom=['Komponen', 'Kegiatan', 'Keluaran', 'Pelaksana'], lebar=[1.3, 2.6, 1.8, 1.1], baris=[
                ['A. Kit kebersihan siaga', 'Isi kit disusun mengikuti standar UNFPA dan Sphere, lalu diproduksi dan disimpan di titik stok. Kit dikirim ke posko atas permintaan BNPB atau BPBD.',
                 f'{angka(P_KIT)} kit di {P_GUDANG} titik stok', 'Paragon, ditinjau BNPB'],
                ['B. Air dan bilik aman', 'ITB menyiapkan unit pengolah air dan melatih operator daerah. Bilik terpisah dipasang bersama unit air di pengungsian.',
                 f'{P_AIR} unit air dan {P_BILIK} bilik', 'ITB dan BPBD'],
                ['C. Riset produk hemat air', 'Farmasi dan FMIPA ITB bersama tim riset Paragon mengembangkan dan menguji produk kebersihan untuk kondisi air terbatas.',
                 f'{P_FORMULA} formulasi teruji dan publikasi bersama', 'ITB dan Paragon'],
                ['D. Kader siaga', 'Pelatihan pengelolaan kebersihan pengungsian, perlindungan kelompok rentan, dan evakuasi.',
                 f'{P_KADER_N} kader terlatih', 'BNPB, ITB, relawan karyawan Paragon'],
            ])),
            ('p', 'Kit tetap dimiliki dan disimpan oleh Paragon atau mitra penyalurnya sampai digunakan. Dengan cara ini stok tidak menjadi barang milik negara, '
                  'dan penyaluran tetap mengikuti permintaan posko sehingga bantuan tidak menumpuk di satu lokasi.'),
        ]},
        {'judul': 'Linimasa Program', 'isi': [
            ('tabel', dict(kolom=['Fase', 'Waktu', 'Kegiatan utama', 'Hasil'], lebar=[1.1, 1.3, 3.0, 1.6], baris=[
                ['I. Persiapan', 'Januari sampai Maret 2027', 'Penandatanganan perjanjian kerja sama, penyusunan isi kit, produksi tahap pertama, perakitan unit air, penetapan titik stok',
                 'Stok pertama siap di Jawa Barat'],
                ['II. Siaga dan riset', 'April sampai September 2027', 'Pengisian empat titik stok, pelatihan operator air dan kader siaga, riset dan uji formulasi, gladi pengiriman 48 jam',
                 'Empat titik stok siap kirim'],
                ['III. Respons dan evaluasi', 'Oktober sampai Desember 2027', 'Penyaluran pada kejadian bencana musim hujan, survei kepuasan pengungsi kelompok rentan, laporan dampak, rencana tahun kedua',
                 'Laporan dampak dan rencana lanjutan'],
            ])),
            ('p', 'Bila bencana besar terjadi sebelum fase II selesai, stok yang sudah ada langsung disalurkan dan dicatat sebagai uji lapangan.'),
        ]},
        {'judul': 'Peran Para Pihak', 'isi': [
            ('tabel', dict(kolom=['Pihak', 'Peran dan tanggung jawab'], lebar=[1.2, 4.8], baris=[
                ['BNPB', 'Mengarahkan substansi dan menyetujui isi kit sesuai standar kemanusiaan.\nMenetapkan titik stok bersama BPBD.\nMeminta penyaluran saat tanggap darurat dan memastikan kit sampai ke pengungsi yang tepat.\nMenyediakan data pengungsi terpilah menurut jenis kelamin dan usia.'],
                ['ITB', 'Menyediakan dan merawat unit pengolah air, serta melatih operator daerah.\nMemimpin riset formulasi hemat air bersama Paragon.\nMengukur mutu air dan dampak program, lalu menyusun laporan ilmiah.'],
                ['ParagonCorp', 'Menyediakan dana program dan produk kebersihan untuk kit.\nMenyimpan stok melalui gudang atau mitra penyalur.\nMenyertakan tim riset dan relawan karyawan.\nMenjadi tuan rumah publikasi bersama.'],
                ['BPBD', 'Menerima dan menyalurkan kit di posko.\nMemilih desa asal kader siaga.'],
            ])),
        ]},
        {'judul': 'Anggaran dan Bentuk Dukungan', 'isi': [
            ('p', f'Perkiraan kebutuhan program adalah {rp(P_TOTAL)} untuk dua belas bulan. Angka ini adalah perkiraan awal dengan asumsi harga satuan tertulis. '
                  'Isi kit yang berupa produk Paragon dapat dihitung sebagai dukungan barang, sehingga dana tunai yang dibutuhkan lebih kecil.'),
            ('tabel', dict(kolom=['Komponen', 'Volume', 'Harga satuan', 'Jumlah', 'Bentuk dukungan'], lebar=[2.6, 1.1, 1.1, 1.1, 1.5],
                           rata=['l', 'c', 'r', 'r', 'l'], total=True, baris=[
                [k, f'{angka(v)} {s}', rp(h), rp(j), b] for k, v, s, h, j, b in P_RINCI] + [
                ['Pemantauan, evaluasi, dan pelaporan (10%)', '', '', rp(P_MONEV), 'Dana'],
                ['Jumlah', '', '', rp(P_TOTAL), '']])),
            ('sumber', 'Perkiraan tim BNPB, 13 November 2026. Harga unit air dan bilik dikonfirmasi ke tim ITB; harga kit memakai acuan isi kit dasar UNFPA dengan produk dinilai harga pokok.'),
            ('tabel', dict(kolom=['Paket', 'Cakupan', 'Perkiraan'], lebar=[1.2, 3.6, 1.2], rata=['l', 'l', 'r'], baris=[
                ['Utama', f'Seluruh program: {angka(P_KIT)} kit, {P_AIR} unit air, {P_BILIK} bilik, riset, dan {P_KADER_N} kader', rp(P_TOTAL)],
                ['Menengah', '5.000 kit, 10 unit air, 20 bilik, dan riset formulasi', rp(P_PAKET_MENENGAH)],
                ['Awal', '2.000 kit di Jawa Barat dan riset formulasi tahap pertama', rp(P_PAKET_AWAL)],
            ])),
        ]},
        {'judul': 'Manfaat bagi Paragon', 'isi': [
            ('ul', ['**Sesuai pilar sosial Paragon.** Program menyentuh pilar kesehatan dan lingkungan, dan memakai produk kebersihan Paragon untuk seluruh keluarga.',
                    '**Dari bantuan sekali kirim menjadi program terukur.** Laporan memuat waktu sampai ke pengungsi, jumlah penerima, dan kepuasan pengungsi kelompok rentan.',
                    '**Riset produk baru.** Formulasi hemat air dari riset bersama ITB dapat dikembangkan menjadi produk untuk daerah dengan air terbatas.',
                    '**Kontribusi pada SDGs.** Program mendukung tujuan 3 (kesehatan), 6 (air bersih dan sanitasi), 10 (berkurangnya kesenjangan), dan 13 (penanganan perubahan iklim).',
                    '**Penyebutan bersama.** Nama Paragon tampil pada kemasan kit, laporan, dan publikasi bersama BNPB. Di lokasi pengungsian tidak ada kegiatan promosi produk, sesuai etika kemanusiaan.']),
        ]},
        {'judul': 'Tata Kelola dan Mekanisme Pendanaan', 'isi': [
            ('ol', ['**Dasar kerja sama.** BNPB, ITB, dan Paragon menandatangani perjanjian kerja sama tiga pihak yang memuat ruang lingkup, peran, jadwal, dan pelaporan.',
                    '**Dana tidak masuk kas BNPB.** Paragon menyalurkan dana untuk komponen B, C, dan D langsung kepada ITB sebagai pelaksana, dan membelanjakan isi kit sendiri. Dana tidak menjadi penerimaan negara dan tidak melalui proses APBN.',
                    '**Stok tetap milik mitra sampai disalurkan.** Kit disalurkan langsung kepada pengungsi melalui posko. Bila ada barang yang diserahkan kepada BNPB, barang itu dicatat sebagai hibah langsung bentuk barang sesuai Peraturan Menteri Keuangan Nomor 99/PMK.05/2017.',
                    '**Peran BNPB.** BNPB berperan sebagai pengarah substansi, penentu sasaran penyaluran, dan penjamin mutu, bukan pengelola dana.',
                    '**Perlindungan data.** Data pengungsi yang dibagikan hanya berupa angka rekap tanpa nama.',
                    '**Pelaporan.** ITB menyampaikan laporan kemajuan setiap tiga bulan dan laporan akhir yang dapat diaudit.']),
        ]},
        {'judul': 'Langkah Berikutnya', 'isi': [
            ('tabel', dict(kolom=['Langkah', 'Penanggung jawab', 'Waktu'], lebar=[3.6, 1.6, 1.2], baris=[
                ['Audiensi BNPB dan ITB membahas konsep, unit air, dan tim riset', 'BNPB dan ITB', 'Minggu ketiga November 2026'],
                ['Penyampaian proposal kepada ParagonCorp', 'BNPB dan ITB', 'Akhir November 2026'],
                ['Penyesuaian isi kit, paket, dan anggaran bersama Paragon', 'Ketiga pihak', 'Desember 2026'],
                ['Penandatanganan perjanjian kerja sama', 'Ketiga pihak', 'Januari 2027'],
                ['Stok pertama siap di Jawa Barat', 'Paragon dan BPBD Jawa Barat', 'Maret 2027'],
            ])),
        ]},
    ],
    'lampiran': {'judul': 'Daftar Rujukan', 'isi': [
        ('ol', ['DPR RI. Isu Sepekan, Desember 2022 (data pengungsi Cianjur per 1 Desember 2022). berkas.dpr.go.id',
                'Sphere Association. The Sphere Handbook, 2018. spherestandards.org',
                'UNFPA Asia and the Pacific. Dignity Kits. asiapacific.unfpa.org',
                'detikHealth, 6 Desember 2025. Ancaman penyakit kulit intai pengungsi korban banjir Aceh dan Sumatera.',
                'NU Online. Penanganan bencana harus mengedepankan hak perempuan. nu.or.id',
                'Katadata, 19 Desember 2025. Sosok Nurhayati Subakat, perempuan pendiri Paragon yang kirim bantuan ke Sumatra.',
                'ITB News, 22 Januari 2026. ITB strengthens post-disaster recovery in Sumatra. itb.ac.id',
                'ITB News, 19 Januari 2026. ITB strengthens Sumatra post-disaster recovery via science-based approach. itb.ac.id',
                'Antara, 4 April 2026. ITB serahkan program penyediaan air bersih di Agam.',
                'ITB News, 7 Agustus 2025. ITB, Pertamina, and Paragon inaugurate Labtek XV building. itb.ac.id',
                'Industry.co.id, 22 Juni 2026. ParagonCorp dan FMIPA ITB perkuat kolaborasi riset dan talenta sains.',
                'Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana.',
                'Peraturan Menteri Keuangan Nomor 99/PMK.05/2017 tentang Administrasi Pengelolaan Hibah.']),
    ]},
}
