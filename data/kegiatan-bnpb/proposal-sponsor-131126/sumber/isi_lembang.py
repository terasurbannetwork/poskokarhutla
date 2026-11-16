"""Isi proposal BNPB dan ITB kepada ParagonCorp: Sekolah Siaga Sesar Lembang (arah penerapan teknologi, Jawa Barat)."""
from pathlib import Path
from angka import *

D = Path(__file__).resolve().parent
NAMA = 'Sekolah Siaga Sesar Lembang'
TOT = rp(L_TOTAL)

ISI = {
    'judul': f'Proposal Kerja Sama Program {NAMA}: BNPB, ITB, dan ParagonCorp',
    'berkas': 'Proposal Kerja Sama Sekolah Siaga Sesar Lembang BNPB ITB Paragon 131126',
    'kepala': f'Proposal Kerja Sama Program {NAMA}',
    'jenis': 'PROPOSAL KERJA SAMA PROGRAM',
    'judul_sampul': ['Sekolah Siaga', 'Sesar Lembang'],
    'sub': 'Sensor gempa, pemeriksaan gedung, dan jalur evakuasi untuk sekolah di sekitar Sesar Lembang '
           'dengan teknologi ITB',
    'logo_mitra': [(str(D / 'logo-itb.png'), 2.2)],
    'blok_sampul': [
        ('DIAJUKAN OLEH', 'Badan Nasional Penanggulangan Bencana (BNPB) bersama Institut Teknologi Bandung (ITB)'),
        ('DIAJUKAN KEPADA', 'PT Paragon Technology and Innovation (ParagonCorp)'),
        ('NARAHUBUNG BNPB', 'Alfatehan Septianta, Staf Ahli Kepala BNPB Bidang Riset, Inovasi, dan Kerja Sama Perguruan Tinggi'),
    ],
    'tanggal': 'Jakarta, 13 November 2026',
    'ringkasan': [
        f'BNPB dan ITB mengajak ParagonCorp mendanai program {NAMA}. Program ini memasang sensor gempa di {L_SEKOLAH} sekolah di sekitar '
        f'Sesar Lembang, memeriksa kekuatan gedungnya, memperkuat satu sekolah percontohan, dan menyiapkan jalur evakuasi, dalam {L_BULAN} bulan.',
        'Sesar Lembang membentang sekitar 29,5 km dari Ngamprah sampai Lembang dan berpotensi memicu gempa magnitudo 6,8 sampai 7. '
        'Skenario BMKG menunjukkan guncangan skala VII sampai VIII MMI di Bandung Raya, cukup untuk merusak gedung yang tidak dirancang tahan gempa.',
        f'ITB adalah rumah bagi pakar peta gempa nasional dan peneliti pergerakan Sesar Lembang. Perkiraan dukungan Paragon adalah {TOT}. '
        'Dana tidak melalui APBN dan tidak masuk kas BNPB. Program ini dapat menjadi percontohan sebelum diperluas ke pesisir selatan Jawa Barat yang menghadapi megathrust.',
    ],
    'bab': [
        {'judul': 'Latar Belakang', 'isi': [
            ('p', 'Bandung Raya berdiri di atas dua ancaman gempa. Di utara, Sesar Lembang membentang sekitar 29,5 km dari Ngamprah di Kabupaten Bandung Barat '
                  'sampai Suntenjaya di Lembang. Di selatan, zona megathrust Jawa bagian barat berpotensi memicu gempa magnitudo 8,9 dan tsunami di pesisir '
                  'Pangandaran, Garut, Sukabumi, dan Cianjur selatan.'),
            ('kartu', [
                ('panjang Sesar Lembang', 'Dari Ngamprah sampai Suntenjaya, Lembang (Badan Geologi).', '29,5 km'),
                ('potensi magnitudo bila seluruh segmen bergerak', 'Dasar skenario terburuk rencana kontinjensi (Badan Geologi).', 'M6,8 sampai 7'),
                ('skenario tinggi tsunami pantai selatan Jawa Barat', 'Bila dua segmen megathrust pecah bersamaan (Widiyantoro dkk., 2020).', '20 m'),
            ]),
            ('sumber', 'Detik Jabar dan Metro TV, 2025 sampai 2026, mengutip Badan Geologi; BMKG, 14 Agustus 2017; Widiyantoro dkk., Scientific Reports 10:15274, 2020.'),
            ('p', 'Kajian BMKG pada 2017 memodelkan gempa magnitudo 6,8 di Sesar Lembang pada kedalaman 10 km. Hasilnya, guncangan di Bandung Raya mencapai '
                  'skala VII sampai VIII MMI. Pada skala itu, gedung yang tidak dirancang tahan gempa dapat rusak berat. BMKG merekomendasikan bangunan '
                  'mengikuti standar SNI 1726 dan memperluas edukasi.'),
            ('p', 'Gempa Cianjur 21 November 2022 menunjukkan akibatnya. Gempa magnitudo 5,6 itu menewaskan 327 orang menurut data BNPB per 30 November 2022, '
                  'termasuk 10 guru dan 42 murid. Banyak korban tertimpa bangunan, termasuk gedung sekolah. Sekolah di jalur Sesar Lembang perlu tahu seberapa '
                  'kuat gedungnya dan ke mana siswa harus lari.'),
            ('p', 'BNPB sedang merancang program kerja sama dengan perguruan tinggi. Pembiayaan sepenuhnya dari APBN berat dan prosesnya panjang, sehingga '
                  'BNPB membuka skema kerja sama dengan dunia usaha dalam bentuk sponsor, sesuai ruang peran lembaga usaha dalam Undang-Undang Nomor 24 Tahun 2007.'),
        ]},
        {'judul': 'Teknologi ITB yang Diterapkan', 'isi': [
            ('p', 'Program ini membawa hasil riset ITB ke lapangan. Setiap teknologi sudah dikembangkan atau diteliti di ITB, dan program ini memasangnya di sekolah.'),
            ('tabel', dict(kolom=['Teknologi', 'Dasar keahlian ITB', 'Penerapan di sekolah'], lebar=[1.4, 2.6, 2.4], baris=[
                ['Sensor gempa murah', 'Riset ITB tentang alat ukur intensitas gempa berbasis sensor MEMS dengan peringatan lewat pesan singkat dan Telegram.',
                 'Sensor seismik dipasang di sekolah. Data guncangan tampil di layar sekolah dan dipakai sebagai bahan ajar.'],
                ['Peta bahaya gempa', 'Pakar Teknik Sipil ITB menyunting peta sumber dan bahaya gempa nasional bersama Pusat Studi Gempa Nasional.',
                 'Tingkat guncangan rencana di lokasi setiap sekolah menjadi dasar pemeriksaan gedung.'],
                ['Pemantauan Sesar Lembang', 'Peneliti Fakultas Ilmu dan Teknologi Kebumian ITB mengukur pergerakan Sesar Lembang dengan GPS.',
                 'Data sensor sekolah menambah titik pengamatan di sekitar sesar untuk riset ITB.'],
                ['Pemeriksaan dan penguatan gedung', 'Teknik Sipil ITB memeriksa kerentanan bangunan dan merancang penguatan struktur.',
                 'Asesmen cepat gedung sekolah dan penguatan satu sekolah percontohan.'],
            ])),
            ('sumber', 'Jurnal JOKI ITB; LPPM ITB, Peta Deagregasi Nasional; Meilano dkk., EGU 2010; FGB ITB Talk #11, 29 Agustus 2025.'),
            ('kotak', 'Sensor sekolah adalah alat edukasi dan riset, bukan pengganti jaringan resmi BMKG. Peringatan dini gempa dan tsunami tetap menjadi wewenang BMKG, '
                      'dan program ini bekerja selaras dengan BMKG dan BPBD Jawa Barat.'),
        ]},
        {'judul': 'Tujuan dan Sasaran', 'isi': [
            ('h', 'Tujuan'),
            ('ol', ['Mengetahui tingkat kerentanan gedung sekolah di sekitar Sesar Lembang.',
                    'Membuktikan bahwa penguatan struktur sekolah dapat dilakukan dengan biaya terukur melalui satu sekolah percontohan.',
                    'Menyediakan jalur evakuasi, rambu, dan titik kumpul yang sudah dilatihkan di setiap sekolah sasaran.',
                    'Membangun jaringan sensor gempa sekolah yang memperkaya riset ITB dan pembelajaran siswa.']),
            ('h', 'Sasaran usulan'),
            ('tabel', dict(kolom=['Sasaran', 'Jumlah', 'Keterangan'], lebar=[2.2, 1, 2.8], rata=['l', 'c', 'l'], baris=[
                ['Sekolah sasaran', angka(L_SEKOLAH), 'Di Lembang, Cisarua, Parongpong, Ngamprah, dan Bandung bagian utara'],
                ['Sensor gempa terpasang', angka(L_SEKOLAH), 'Satu sensor per sekolah, terhubung ke dasbor ITB'],
                ['Gedung sekolah diperiksa', angka(L_SEKOLAH), 'Asesmen cepat struktur oleh Teknik Sipil ITB'],
                ['Sekolah percontohan diperkuat', '1', 'Dipilih dari hasil asesmen dengan kerentanan tertinggi'],
                ['Sekolah dengan jalur evakuasi', angka(L_SEKOLAH), 'Peta, rambu, titik kumpul, dan simulasi'],
            ])),
        ]},
        {'judul': 'Ruang Lingkup Program', 'isi': [
            ('tabel', dict(kolom=['Komponen', 'Kegiatan', 'Keluaran', 'Pelaksana'], lebar=[1.3, 2.6, 1.8, 1.1], baris=[
                ['A. Sensor sekolah', 'Sensor seismik dipasang di setiap sekolah dan terhubung ke dasbor ITB. Guru dilatih membaca data untuk pelajaran IPA dan geografi.',
                 f'{L_SEKOLAH} sensor dan satu dasbor', 'ITB'],
                ['B. Asesmen gedung', 'Tim Teknik Sipil ITB memeriksa struktur setiap gedung dan memberi peringkat kerentanan beserta rekomendasi.',
                 f'{L_SEKOLAH} laporan asesmen', 'ITB, ditinjau BNPB'],
                ['C. Sekolah percontohan', 'Satu sekolah dengan kerentanan tertinggi diperkuat strukturnya sebagai contoh bagi pemerintah daerah.',
                 'Satu gedung tahan gempa', 'ITB dan kontraktor terpilih'],
                ['D. Jalur evakuasi', 'Peta evakuasi, rambu, dan titik kumpul disusun bersama sekolah, lalu diuji dengan simulasi.',
                 f'{L_SEKOLAH} sekolah terlatih', 'BNPB, BPBD, mahasiswa ITB'],
            ])),
            ('h', 'Tahap lanjutan: pesisir selatan Jawa Barat'),
            ('p', 'Bila percontohan berhasil, model yang sama dapat diperluas ke sekolah di pesisir Pangandaran, Garut, dan Sukabumi yang menghadapi tsunami '
                  'dari megathrust selatan. Tahap lanjutan itu menambah papan jalur evakuasi tsunami dan titik kumpul di tempat tinggi, dan diajukan sebagai proposal terpisah.'),
        ]},
        {'judul': 'Linimasa Program', 'isi': [
            ('tabel', dict(kolom=['Fase', 'Waktu', 'Kegiatan utama', 'Hasil'], lebar=[1.1, 1.3, 3.0, 1.6], baris=[
                ['I. Persiapan', 'Januari sampai Maret 2027', 'Penandatanganan perjanjian, penetapan sekolah bersama Dinas Pendidikan dan BPBD, pengadaan sensor',
                 'Sekolah dan alat siap'],
                ['II. Asesmen dan pemasangan', 'April sampai Agustus 2027', 'Asesmen gedung 30 sekolah, pemasangan sensor dan dasbor, penyusunan jalur evakuasi',
                 'Laporan asesmen dan sensor aktif'],
                ['III. Penguatan dan simulasi', 'September 2027 sampai Juni 2028', 'Desain dan pelaksanaan penguatan sekolah percontohan, simulasi evakuasi di semua sekolah, laporan dampak',
                 'Sekolah percontohan dan laporan akhir'],
            ])),
            ('p', 'Penguatan gedung dijadwalkan saat libur sekolah agar kegiatan belajar tidak terganggu.'),
        ]},
        {'judul': 'Peran Para Pihak', 'isi': [
            ('tabel', dict(kolom=['Pihak', 'Peran dan tanggung jawab'], lebar=[1.2, 4.8], baris=[
                ['BNPB', 'Mengarahkan substansi dan memastikan jalur evakuasi sesuai standar SPAB.\nMenyediakan data risiko InaRISK.\nMengoordinasikan BPBD Jawa Barat dan BMKG.'],
                ['ITB', 'Memasang sensor dan mengelola dasbor data.\nMemeriksa gedung dan merancang penguatan struktur.\nMengelola dana program dan menyusun laporan ilmiah.'],
                ['ParagonCorp', 'Menyediakan dana program.\nMengirim relawan karyawan saat simulasi evakuasi.\nMenjadi tuan rumah publikasi bersama.'],
                ['Sekolah, BPBD, dan Dinas Pendidikan', 'Memberi izin, menjaga sensor, dan menjalankan simulasi berkala.\nMenindaklanjuti rekomendasi asesmen gedung.'],
            ])),
        ]},
        {'judul': 'Anggaran dan Bentuk Dukungan', 'isi': [
            ('p', f'Perkiraan kebutuhan program adalah {TOT} untuk delapan belas bulan. Angka ini adalah perkiraan awal. Biaya penguatan sekolah percontohan '
                  'dikunci setelah asesmen gedung selesai.'),
            ('tabel', dict(kolom=['Komponen', 'Volume', 'Harga satuan', 'Jumlah', 'Bentuk dukungan'], lebar=[2.6, 1.1, 1.1, 1.1, 1.5],
                           rata=['l', 'c', 'r', 'r', 'l'], total=True, baris=[
                [k, f'{angka(v)} {s}', rp(h), rp(j), b] for k, v, s, h, j, b in L_RINCI] + [
                ['Pemantauan, evaluasi, dan pelaporan (10%)', '', '', rp(L_MONEV), 'Dana'],
                ['Jumlah', '', '', TOT, '']])),
            ('sumber', 'Perkiraan tim BNPB, 13 November 2026. Harga sensor memakai acuan Raspberry Shake RS4D (US$605 sampai US$1.055, toko resmi, November 2026) ditambah pemasangan dan koneksi.'),
            ('tabel', dict(kolom=['Paket', 'Cakupan', 'Perkiraan'], lebar=[1.2, 3.6, 1.2], rata=['l', 'l', 'r'], baris=[
                ['Utama', f'Seluruh program, termasuk penguatan satu sekolah percontohan', TOT],
                ['Menengah', f'Sensor, asesmen, dan jalur evakuasi di {L_SEKOLAH} sekolah tanpa penguatan gedung', rp(L_PAKET_MENENGAH)],
                ['Awal', 'Sensor, asesmen, dan jalur evakuasi di 10 sekolah Lembang', rp(L_PAKET_AWAL)],
            ])),
        ]},
        {'judul': 'Manfaat bagi Paragon', 'isi': [
            ('ul', ['**Melindungi anak sekolah.** Program sejalan dengan pilar pendidikan dan kesehatan Paragon.',
                    '**Dekat dengan ITB.** Program berjalan di sekitar kampus ITB dan memperkuat kerja sama yang sudah ada, termasuk Labtek XV.',
                    '**Dampak terlihat.** Sensor terpasang, laporan gedung, dan satu sekolah yang lebih aman menjadi bukti nyata.',
                    '**Kontribusi pada SDGs.** Program mendukung tujuan 4 (pendidikan berkualitas), 9 (infrastruktur), dan 11 (permukiman tangguh).',
                    '**Penyebutan bersama.** Nama Paragon tampil pada prasasti sekolah percontohan, dasbor, dan publikasi bersama.']),
        ]},
        {'judul': 'Tata Kelola dan Mekanisme Pendanaan', 'isi': [
            ('ol', ['**Dasar kerja sama.** BNPB, ITB, dan Paragon menandatangani perjanjian kerja sama tiga pihak.',
                    '**Dana tidak masuk kas BNPB.** Paragon menyalurkan dana langsung kepada ITB sebagai pelaksana. Dana tidak menjadi penerimaan negara dan tidak melalui APBN.',
                    '**Aset di sekolah.** Sensor dan penguatan gedung diserahkan kepada sekolah atau pemerintah daerah pemiliknya sesuai ketentuan barang milik daerah.',
                    '**Peran BNPB.** BNPB berperan sebagai pengarah substansi dan penghubung dengan BMKG dan BPBD, bukan pengelola dana.',
                    '**Pelaporan.** ITB menyampaikan laporan kemajuan setiap tiga bulan dan laporan akhir yang dapat diaudit.']),
        ]},
        {'judul': 'Langkah Berikutnya', 'isi': [
            ('tabel', dict(kolom=['Langkah', 'Penanggung jawab', 'Waktu'], lebar=[3.6, 1.6, 1.2], baris=[
                ['Audiensi BNPB dan ITB bersama Teknik Sipil dan Fakultas Ilmu dan Teknologi Kebumian', 'BNPB dan ITB', 'Minggu ketiga November 2026'],
                ['Penyampaian proposal kepada ParagonCorp', 'BNPB dan ITB', 'Akhir November 2026'],
                ['Koordinasi dengan BMKG dan BPBD Jawa Barat', 'BNPB', 'Desember 2026'],
                ['Penandatanganan perjanjian kerja sama', 'Ketiga pihak', 'Januari 2027'],
                ['Penetapan 30 sekolah sasaran', 'ITB dan Dinas Pendidikan Jawa Barat', 'Maret 2027'],
            ])),
        ]},
    ],
    'lampiran': {'judul': 'Daftar Rujukan', 'isi': [
        ('ol', ['BMKG, 14 Agustus 2017. Penjelasan BMKG terkait hasil kajian Sesar Lembang yang berpotensi memicu gempa magnitudo 6,8.',
                'Detik Jabar, 2025. Enam titik evakuasi hadapi skenario terburuk Sesar Lembang di Kota Bandung.',
                'Metro TV, 2026. Sesar Lembang picu gempa M7, Badan Geologi: mitigasi tidak bisa ditunda.',
                'Widiyantoro dkk. 2020. Implications for megathrust earthquakes and tsunamis from seismic gaps south of Java. Scientific Reports 10:15274.',
                'CNBC Indonesia, 13 Desember 2025. Zona megathrust berubah jadi 14 titik.',
                'NU Online, 30 November 2022. Korban gempa Cianjur bertambah 327 jiwa meninggal dunia.',
                'Antara Babel, November 2022. Sepuluh guru dan 42 murid di Cianjur wafat akibat gempa.',
                'Jurnal JOKI ITB. Rancang bangun alat ukur intensitas gempa berbasis sensor MEMS.',
                'LPPM ITB. Peta Deagregasi Nasional untuk berbagai jenis sumber gempa.',
                'Meilano dkk. 2010. Deformasi Sesar Lembang dari pengamatan GPS. EGU General Assembly.',
                'Raspberry Shake. Daftar harga RS4D, toko resmi, diakses November 2026.',
                'Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana.']),
    ]},
}
