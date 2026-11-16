# Bagian kedua bangun_spek_hitung.py (dijalankan lewat exec, berbagi globals): deck lengkap dan penulisan.
import csv as _csv  # noqa: E402

import re as _re
_lamp = Path('D:/Project/Work/BNPB/poskokarhutla/data/kajian-bnpb/hitung-bencana/naskah-imrad/lampiran-a.md').read_text(encoding='utf-8')
PAR = [(m.group(1), m.group(2).replace('*', '').strip()) for m in _re.finditer(r'^\| (A-\d\d) \| ([^|]+) \|', _lamp, _re.M)]
assert len(PAR) == 65, len(PAR)
_GANTI = {'Bias kekayaan': 'Daerah mampu lebih banyak tercatat', 'Inflasi': 'Angka menggembung',
          'Ekor panjang (long tail)': 'Sedikit kejadian memikul dampak besar', 'Penghitungan ganda (double counting)': 'Penghitungan ganda'}
PAR = [(a, _GANTI.get(b, b)) for a, b in PAR]

c_kel = tulis_csv('kelompok_kasus sulit.csv', ['kelompok', 'jumlah'], [
    ['Identitas kejadian', 18], ['Syarat masuk hitungan', 14], ['Ukuran dan korban', 13], ['Penyajian angka', 7], ['Kelas besar dan kecil', 5],
    ['Kerugian dan uang', 4], ['Kelembagaan', 4]])
c_kel_contoh = tulis_csv('kelompok_contoh.csv', ['kelompok', 'contoh'], [
    ['Identitas', 'Dua api menyatu di Kapuas'], ['Syarat', 'Kekeringan lolos hampir semua, karhutla nyaris tidak'],
    ['Ukuran', 'Menjumlah angka kumulatif menggelembungkan korban'], ['Uang', 'Korban gempa Sulawesi Tengah 2018 berbeda menurut sumber'],
    ['Kelas', 'Gempa kecil bisa berkelas Besar, gempa kuat bisa tanpa korban'], ['Penyajian angka', 'Kenaikan jumlah resmi sebagian dari catatan di bawah ambang'],
    ['Lembaga', 'Siapa berwenang menyatakan satu kejadian']])
c_inti = tulis_csv('kasus sulit_inti.csv', ['kasus sulit', 'arti', 'lapisan'], [
    ['Siapa berwenang menyatakan satu kejadian', 'Tanpa pemutus, semua aturan menggabungkan hanya saran', 'Tata kelola'],
    ['Menyatu', 'Api atau banjir yang menyatu atau terpecah dihitung berapa', 'Satu kejadian'],
    ['Kunci dan tanggal kejadian', 'Berapa kejadian lahir dari laporan harian, dan di tahun mana dihitung', 'Satu kejadian'],
    ['Lintas wilayah dan pecahan', 'Satu kejadian di banyak kabupaten dihitung berapa', 'Satu kejadian'],
    ['Kriteria administratif melingkar', 'Bencana karena dinyatakan bencana', 'Ambang masuk'],
    ['Sumber angka luas', 'Satu piksel satelit sudah berukuran belasan hektare', 'Ambang masuk'],
    ['Angka bergerak', 'Kejadian baru lolos ambang di laporan susulan', 'Dampak'],
    ['Magnitudo lawan dampak', 'Kekuatan bahaya bukan ukuran bencana', 'Skala']])
c_vonis = tulis_csv('vonis.csv', ['kriteria', 'vonis'], [
    ['Korban meninggal', 'Pertahankan'], ['Orang terdampak', 'Revisi'], ['Rumah dan fasilitas rusak', 'Revisi'],
    ['Lahan terbakar', 'Ganti'], ['Permintaan bantuan', 'Penanda'], ['Status darurat', 'Penanda']])
c_kepekaan = tulis_csv('kepekaan.csv', ['skenario', 'baris'], [
    ['Lebih longgar', 2484], ['Juklak saat ini', 1903], ['Terdampak seratus orang', 1753], ['Rumah sepuluh unit', 1691],
    ['Batas dinaikkan sedang', 1433], ['Batas EM-DAT', 1212], ['Batas dinaikkan tinggi', 787], ['Harus memenuhi ketiganya', 67]])
c_negara = tulis_csv('negara.csv', ['basis', 'satuan', 'ambang', 'jenis'], [
    ['EM-DAT', 'Satu entri per negara', 'Sepuluh meninggal atau seratus terdampak, atau seruan bantuan', 'Mutlak'],
    ['USGS PAGER', 'Gempa, semuanya dinilai', 'Empat warna menurut korban dan kerugian', 'Mutlak, perkiraan model'],
    ['Jepang', 'Kota dan prefektur', 'Rumah hilang menurut jumlah penduduk kota', 'Mutlak berjenjang'],
    ['FEMA, belum terverifikasi', 'Bencana yang dideklarasikan', 'Kerugian bantuan publik per penduduk', 'Relatif dan mutlak'],
    ['Filipina, belum terverifikasi', 'Wilayah deklarasi', 'Dua dari enam kondisi, sebagian relatif terhadap penduduk', 'Relatif dan kualitatif'],
    ['Indonesia, Juklak tahun 2023', 'Kejadian per kabupaten, nasional satu kejadian', 'Satu dari enam kriteria, semuanya mutlak', 'Mutlak']])
c_mfull = tulis_csv('m_lengkap.csv', ['kode', 'bunyi', 'ubah'], [
    ['M1', 'Satu orang meninggal atau hilang akibat langsung', 'Hilang ikut dihitung, kematian tidak langsung dicatat terpisah'],
    ['M2', 'Lima puluh orang unik terdampak langsung', 'Terdampak langsung didefinisikan, satu orang dihitung satu kali'],
    ['M3', 'Lima unit rumah setara rusak berat', 'Rusak ringan dihitung seperempat dan rusak sedang setengah'],
    ['M4', 'Satu fasilitas penting rusak berat atau sedang', 'Dipisah dari rumah'],
    ['M5', 'Karhutla dua hektare terverifikasi, atau sepuluh hektare lahan gagal panen', 'Jenis lahan dan sumber luas wajib, hotspot hanya indikasi'],
    ['M6', 'SK tanggap darurat yang cocok dengan kejadian', 'Permintaan bantuan dan status darurat menjadi penanda; hanya SK yang menyebut kejadian itu menjadi syarat']])
c_kelas = tulis_csv('kelas_keparahan.csv', ['kelas', 'mati', 'ungsi', 'rumah'], [
    ['Katastrofik', 1000, 100000, 10000], ['Besar', 100, 10000, 1000], ['Sedang', 10, 1000, 100]])
c_tren = tulis_csv('tren.csv', ['tahun', 'resmi', 'lolos', 'sedang', 'mati'], [
    ['2024', 100.0, 100.0, 100.0, 100.0], ['2025', 274.2, 156.6, 117.4, 141.8], ['2026', 105.9, 68.9, 58.7, 113.1]])
c_status = tulis_csv('status_kelompok.csv', ['kelompok', 'penuh', 'sebagian'], [
    ['Identitas kejadian', 13, 5], ['Syarat masuk hitungan', 9, 5], ['Ukuran dan korban', 9, 4], ['Kerugian dan uang', 3, 1],
    ['Kelas besar dan kecil', 2, 3], ['Penyajian angka', 3, 4], ['Kelembagaan', 3, 1]])
c_uji = tulis_csv('hasil_uji.csv', ['uji', 'kasus', 'penuh', 'sebagian', 'gagal'], [['Kasus sulit', 65, 42, 23, 0], ['Uji pemeriksa', 26, 17, 9, 0]])
c_ubah = tulis_csv('perubahan_juklak.csv', ['bagian', 'ubah', 'alasan'], [
    ['Pengertian', 'Tambah lima definisi baru, termasuk kejadian nasional dan terdampak langsung', 'Juklak menetapkan kapan dihitung tanpa menetapkan apa yang dihitung'],
    ['Kode identitas', 'Tambah nomor induk kejadian nasional dari Pusdatinkom', 'Kode lama hanya memuat satu kabupaten'],
    ['Ambang', 'Ganti enam kriteria dengan kriteria usulan; bantuan dan status darurat menjadi penanda, kecuali SK tanggap darurat yang menyebut kejadian itu', 'Satu kriteria menentukan separuh hitungan'],
    ['Lintas wilayah', 'Dua nama hitungan: jumlah kejadian dan jumlah catatan kabupaten; pecahan dihapus', 'DIBI memuat ratusan baris pecahan'],
    ['Aturan menggabungkan', 'Satu aturan menggabungkan per jenis bahaya, lengkap dengan aturan pisah dan selesai', 'Jumlah kejadian karhutla berselisih lebih dari dua kali lipat'],
    ['Skala keparahan', 'Tambah kelas Ringan sampai Katastrofik sebagai klasifikasi data', 'Satu persen catatan memikul hampir semua korban meninggal'],
    ['Versi angka', 'Rilis bulanan bernomor versi dan beku per triwulan; penjumlahan antarhari dilarang', 'Penjumlahan menggelembungkan korban meninggal'],
    ['Formulir', 'Tambah sebelas kolom, termasuk nomor induk dan dasar masuk', 'Tanpa kolom ini aturan baru tidak bisa diperiksa']])
c_bpbd = tulis_csv('kolom_bpbd.csv', ['kolom', 'fungsi'], [
    ['Nomor induk kejadian', 'Menyatukan catatan kabupaten dari satu kejadian'], ['Nomor usulan', 'Pembaruan logbook tidak lagi dicocokkan dengan menebak'],
    ['Dasar masuk', 'Kriteria yang meloloskan kejadian dapat diperiksa'], ['Sumber angka luas', 'Luas terverifikasi dibedakan dari hotspot'],
    ['Evakuasi preventif', 'Dicatat terpisah dari kriteria terdampak'], ['Kematian tidak langsung', 'Dicatat terpisah dari kematian akibat langsung bahaya'],
    ['Penanda status dan bantuan', 'Status darurat dan permintaan bantuan beserta nomor dokumennya'], ['Atribut bahaya', 'Ukuran bahaya per jenis; besar bencana dinilai terpisah'],
    ['Pemicu dominan', 'Tempat bagi penyebab manusia dan bahaya berantai'], ['Tanggal laporan pertama', 'Membedakan tanggal kejadian dari tanggal laporan'],
    ['Keadaan isian', 'Angka nol dibedakan dari angka yang belum didata']])

c_pohon = tulis_csv('pohon_keputusan.csv', ['langkah', 'periksa', 'ya', 'tidak'], [
    ['Pertama', 'Penyebab salah satu jenis bencana', 'Periksa kriteria masuk', 'Bukan kejadian bencana'],
    ['Kedua', 'Korban meninggal atau hilang akibat langsung', 'Masuk, catat kriteria itu', 'Periksa kriteria berikutnya'],
    ['Ketiga', 'Lima puluh orang unik terdampak langsung', 'Masuk, catat kriteria itu', 'Periksa kriteria berikutnya'],
    ['Keempat', 'Lima unit rumah setara rusak berat, atau satu fasilitas penting rusak', 'Masuk, catat kriteria itu', 'Periksa kriteria berikutnya'],
    ['Kelima', 'Karhutla dua hektare terverifikasi, atau sepuluh hektare lahan gagal panen', 'Masuk, catat kriteria itu', 'Periksa kriteria berikutnya'],
    ['Keenam', 'SK tanggap darurat yang cocok dengan kejadian', 'Masuk, catat kriteria itu', 'Di bawah ambang, disimpan saja']])

c_jl2 = tulis_csv('l2_jenis.csv', ['jenis', 'kjn', 'lama', 'usulan'], [
    ['Banjir', 4955, 3896, 3910], ['Cuaca ekstrem', 3764, 2097, 1537], ['Longsor', 1624, 626, 511], ['Kebakaran permukiman', 1081, 444, 400],
    ['Gempa bumi', 126, 55, 60], ['Karhutla', 3589, 30, 32],
    ['Jenis lain', 498, 387, 385], ['Jumlah', 15637, 7535, 6835]])
c_jkelas = tulis_csv('kelas_jenis.csv', ['jenis', 'n', 's', 'b', 'k'], [
    ['Banjir', 3910, 143, 16, 3], ['Cuaca ekstrem', 1537, 20, 0, 0], ['Longsor', 511, 25, 2, 0], ['Kebakaran permukiman', 400, 12, 0, 0],
    ['Kekeringan', 245, 0, 0, 0], ['Gempa bumi', 60, 8, 3, 1], ['Jenis lain', 172, 18, 1, 0], ['Jumlah', 6835, 226, 22, 4]])
_pp = list(PAR)
_r1 = [list(_pp[r]) + list(_pp[13 + r]) + list(_pp[26 + r]) for r in range(13)]
_r2 = [list(_pp[39 + r]) + list(_pp[52 + r]) for r in range(13)]
c_par2 = tulis_csv('kasus sulit65_a.csv', ['k1', 'p1', 'k2', 'p2', 'k3', 'p3'], _r1)
c_par3 = tulis_csv('kasus sulit65_b.csv', ['k1', 'p1', 'k2', 'p2'], _r2)

c_tren2 = tulis_csv('tren2.csv', ['indikator', 'y2024', 'y2025', 'y2026'], [
    ['Jumlah resmi DIBI', 100.0, 274.2, 105.9], ['Lolos ambang usulan', 100.0, 156.6, 68.9], ['Kelas Sedang ke atas', 100.0, 117.4, 58.7], ['Meninggal dan hilang', 100.0, 141.8, 113.1]])
F = {}
F['kapuas'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Dua api menyatu di Kapuas', 'cut_off': False, 'rasio': 0.62,
    'sumber': SHS, 'keterangan': f'{K_HS} Kasus sulit adalah keadaan yang membuat dua petugas menghitung berbeda untuk kejadian yang sama.',
    'judul': 'Dua kelompok api di Kapuas menyatu menjadi satu kebakaran {{angka:hs.kapuas.gabung}} piksel, tetapi tidak ada aturan yang menjawab satu kejadian atau dua',
    'utama': {'judul': 'Dua kelompok api di Kapuas, Kalimantan Tengah, Oktober 2026', 'ikon': 'karhutla',
              'alur': {'skala_huruf': 1.7, 'sorot': 2, 'label_hasil': 'Keadaan', 'langkah': [
                  {'judul': 'Hari pertama', 'pelaku': 'Dua kelompok api', 'butir': ['Satu kelompok {{angka:hs.kapuas.a}} piksel.', 'Kelompok lain {{angka:hs.kapuas.b}} piksel.', 'Berjarak {{angka:hs.kapuas.jarak|fmt=1}} kilometer.'], 'hasil': 'Dua kelompok terpisah.'},
                  {'judul': 'Beberapa hari kemudian', 'pelaku': 'Api merambat', 'butir': ['Kedua kelompok saling mendekat.', 'Deteksi baru mengisi celah di antaranya.'], 'hasil': 'Satu sebaran api.'},
                  {'judul': 'Akhir periode', 'pelaku': 'Satu kebakaran', 'butir': ['Akhir: satu kebakaran.', 'Tidak ada aturan.'], 'hasil': 'Belum diatur.'}]}},
    'panel': {'judul': 'Dua cara menghitungnya', 'ikon': 'ringkasan', 'nada': 'netral',
              'banding': {'kiri': {'judul': 'Dihitung dua'}, 'kanan': {'judul': 'Dihitung satu'}, 'baris': [
                  {'label': 'Jumlah', 'kiri': 'Dua kejadian', 'kanan': 'Satu kejadian'},
                  {'label': 'Luas', 'kiri': 'Luas tiap kelompok', 'kanan': 'Luas gabungan akhir'},
                  {'label': 'Risiko', 'kiri': 'Satu api terhitung ganda', 'kanan': 'Dua api terhitung satu'}]}},
    '_bicara': ('Pada Oktober 2026, dua kelompok api di Kapuas, Kalimantan Tengah, berjarak 8,9 kilometer pada hari pertama. Satu kelompok 116 piksel dan satu lagi 19 piksel. '
                'Dalam beberapa hari keduanya menyatu menjadi satu kebakaran 690 piksel. Apakah itu satu kejadian atau dua, dan sejak kapan, tidak dijawab aturan mana pun. '
                'Kasus seperti ini ada 105 kandidat dalam 28 hari, tetapi kejadian berupa dua api yang menyatu hanya 0,28 persen dari semua kejadian.')}
F['gabung'] = S2
F['lain'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Masalah sama di DIBI dan logbook', 'cut_off': False,
    'sumber': f'{SDIBI}; {SLB}', 'keterangan': f'{K_DIBI} {K_PUS} {K_CARA}',
    'judul': 'Aturan menggabungkan yang tidak jelas juga muncul di DIBI dan logbook, tempat {{angka:dibi.pecahan}} baris DIBI memuat kejadian berupa pecahan',
    'utama': {'judul': 'Tiga bentuk masalah yang sama di data kita', 'ikon': 'data',
              'daftar_ikon': {'mode': 'baris', 'baris': [
                  {'ikon': 'data', 'judul': 'Pecahan di DIBI', 'isi': 'Satu gempa di {{angka:gempa.kab}} kabupaten tercatat {{angka:gempa.pecah|fmt=3}} kejadian di tiap kabupaten, jadi jumlah kejadian berupa pecahan.', 'angka': '{{angka:dibi.pecahan}}', 'satuan': 'baris pecahan'},
                  {'ikon': 'satu-data', 'judul': 'Cara mencocokkan di logbook', 'isi': 'Laporan harian yang sama menghasilkan jumlah kejadian berbeda menurut cara mencocokkan; tanpa pencocokan jumlahnya {{angka:lb.mentah}}.', 'angka': '{{angka:lb.sel|fmt=0}}', 'satuan': 'persen selisih'},
                  {'ikon': 'peringatan', 'judul': 'Angka kumulatif dijumlah', 'isi': 'Dijumlah antarhari: {{angka:lb.kumulatif}} korban meninggal; nilai terbesar: {{angka:lb.terbesar}}. Aturan usulan memakai laporan terakhir, angka di kanan.', 'angka': '{{angka:lb.terakhir}}', 'satuan': 'korban meninggal, laporan terakhir'}]}},
    'pita': {'label': 'Akibatnya bagi pembaca data', 'nada': 'hujan', 'kolom': [
        {'ikon': 'ringkasan', 'judul': 'Jumlah tidak sebanding', 'isi': 'Dua angka yang sama-sama disebut jumlah kejadian bisa berselisih jauh.'},
        {'ikon': 'wilayah', 'judul': 'Daerah terpukul tersembunyi', 'isi': 'Pecahan menyembunyikan kabupaten yang paling terpukul.'},
        {'ikon': 'peringatan', 'judul': 'Korban menggelembung', 'isi': 'Angka kumulatif yang dijumlah menggandakan korban berkali-kali.'}]},
    '_bicara': ('Pola ini bukan khusus karhutla. DIBI memuat 643 baris berpecahan; gempa 15 Agustus 2026 yang melanda 11 kabupaten tercatat 0,091 kejadian di tiap kabupaten. '
                'Logbook Pusdalops menghasilkan 2.809 kejadian dengan satu cara pencocokan, 3.860 dengan cara lain, dan 8.715 bila tidak dicocokkan sama sekali. '
                'Angka kumulatif yang dijumlah lintas hari menghasilkan 12.523 korban meninggal, padahal nilai terbesar per kejadian hanya 609.')}
F['vonis'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'pesan': 'Vonis enam kriteria', 'cut_off': False, 'rasio': 0.52,
    'sumber': 'DIBI BNPB, 12 Nov 2026; Juklak tahun 2023', 'keterangan': f'{K_DIBI} {K_JUK} Hanya tiga kriteria yang punya kolom di DIBI. Cara menggabungkan keenam kriteria, yaitu cukup salah satu terpenuhi, dinilai Pertahankan. Penanda tidak berlaku bagi SK tanggap darurat yang menyebut kejadian itu.',
    'judul': 'Hanya {{angka:kriteria.diuji}} dari {{angka:juk.kriteria}} kriteria Juklak yang dapat diuji dengan DIBI, dan {{angka:kriteria.ubah}} kriteria perlu perubahan',
    'utama': {'judul': 'Penilaian kajian untuk tiap kriteria', 'ikon': 'regulasi',
              'heatmap': {'mode': 'kategori', 'skala_huruf': 1.1,
                          'kelas': [{'kunci': 'Pertahankan', 'token': 'skala.air.3'}, {'kunci': 'Revisi', 'token': 'skala.emas.3'}, {'kunci': 'Ganti', 'token': 'skala.api.3'}, {'kunci': 'Penanda', 'token': 'skala.netral.3'}],
                          'data': {'csv': c_vonis, 'kolom': [{'nama': 'kriteria', 'kepala': 'Kriteria'}, {'nama': 'vonis', 'kepala': 'Penilaian'}],
                                   'keyakinan': 'terverifikasi', 'sumber': SDIBI}}},
    'panel': panel_ikon('Alasan penilaian', 'ringkasan', 'netral', [
        ('jiwa', 'Terdampak', 'Satu-satunya alasan lolos bagi {{angka:dibi.tunggal_p|fmt=1|satuan}} catatan lolos setahun terakhir, dan istilahnya berbeda antarjuklak.'),
        ('rumah', 'Rumah rusak', 'Dari {{angka:rumah.hanya}} catatan lolos karena kriteria ini, {{angka:rumah.kecil}} hanya lima sampai sembilan unit dan {{angka:dibi.rumah_tanpa_korban}} tanpa korban.'),
        ('luas', 'Lahan', 'Tidak bisa diuji, karena satu piksel satelit sudah {{angka:hs.piksel_ha}} hektare.'),
        ('lembaga', 'Administratif', 'Ukuran respons negara yang bersifat melingkar.'),
        ('data', 'Cukup salah satu kriteria', 'Bila semua kriteria wajib terpenuhi, kejadian terpangkas {{angka:dibi.logika_dan|fmt=1|satuan}}.')]),
    '_bicara': ('Sebuah kejadian masuk hitungan bila memenuhi satu dari enam kriteria. Kajian menguji tiga yang punya kolom di DIBI, yaitu meninggal, terdampak, dan rumah rusak. '
                'Kriteria lahan satu hektare tidak bisa diuji karena satu piksel satelit sudah 14 hektare. Permintaan bantuan nasional dan status darurat mengukur respons negara, bukan dampak, '
                'jadi usulannya menjadi penanda. Cukup salah satu kriteria dipertahankan karena logika DAN memangkas kejadian 96,5 persen.')}
F['penentu'] = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Satu kriteria memegang separuh hitungan', 'cut_off': False, 'rasio': 0.56,
    'sumber': SDIBI, 'keterangan': f'{K_DIBI} {K_JUK} Satu-satunya alasan lolos berarti hanya kriteria itu yang terpenuhi.',
    'judul': 'Separuh catatan DIBI yang lolos setahun terakhir lolos hanya karena kriteria {{angka:juk.terdampak}} orang terdampak, kriteria yang istilahnya paling kabur',
    'grafik': S4['grafik'],
    'panel': panel_ikon('Mengapa kriteria ini bermasalah', 'peringatan', 'bahaya', [
        ('data', 'Satu-satunya alasan', 'Dari {{angka:dibi.lolos}} catatan lolos, {{angka:dibi.tunggal}} lolos hanya karena kriteria terdampak.'),
        ('regulasi', 'Dua definisi', 'Juklak tahun 2023 dan Juklak tahun 2022 memakai definisi terdampak berbeda.'),
        ('karhutla', 'Kekeringan', 'Lolos {{angka:dibi.kering_p|fmt=1|satuan}} seluruhnya lewat kriteria terdampak.'),
        ('jiwa', 'Usulan', 'Terdampak langsung didefinisikan dan satu orang dihitung satu kali.')]),
    '_bicara': S4['_bicara']}
F['jenis'] = S5
F['kepekaan'] = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Kepekaan ambang', 'cut_off': False, 'rasio': 0.56,
    'sumber': SDIBI, 'keterangan': f'{K_DIBI} Tiap skenario mengubah ketiga batas kriteria yang diuji. EM-DAT adalah basis data bencana internasional.',
    'judul': 'Mengubah angka ambang menggeser catatan yang lolos dari {{angka:dibi.ambang_min}} sampai {{angka:dibi.ambang_maks}}, tetapi tidak membuat sistem lebih benar',
    'grafik': {'judul_panel': 'Catatan yang lolos menurut angka ambang', 'ikon': 'ringkasan', 'judul': '**Catatan lolos**, setahun terakhir',
               'keluarga': 'netral', 'arah': 'horizontal', 'seragam': False, 'pembanding': False, 'ubah': False, 'persen_batang': False, 'sorot': ['Juklak saat ini'],
               'data': {'csv': c_kepekaan, 'kolom': [{'nama': 'skenario'}, {'nama': 'baris', 'fmt': '0'}], 'keyakinan': 'terverifikasi', 'sumber': SDIBI}},
    'panel': panel_ikon('Angka mana yang tepat', 'peringatan', 'bahaya', [
        ('peringatan', 'Tidak ada angka benar', 'Angka lain hanya menggeser hasil dan tidak membuktikan yang lebih tepat.'),
        ('data', 'Perlu pembanding', 'Perlu kejadian pembanding, misalnya yang memicu status darurat.'),
        ('lembaga', 'Pembanding belum ada', 'Data kita belum memuatnya, jadi angka bawaan tetap sampai diuji.')]),
    '_bicara': ('Aturan sekarang meloloskan 1.903 baris. Angka lain menggesernya ke 67 sampai 2.484 baris. Tidak ada angka yang terbukti lebih tepat, karena angka yang benar '
                'hanya bisa dipilih bila ada pembanding, misalnya kejadian yang memicu status darurat atau dana siap pakai. Pembanding itu belum tersedia di data kita, sehingga angka 1, 50, dan 5 tetap bawaan sampai diuji.')}
F['par65'] = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Enam puluh lima kasus sulit', 'cut_off': False, 'rasio': 0.5,
    'sumber': 'Katalog kasus sulit kajian BNPB, 12 Nov 2026', 'keterangan': 'Kasus sulit adalah kasus penghitungan yang jawabannya berbeda menurut siapa yang menghitung dan aturan yang dipakai.',
    'judul': 'Kajian mengumpulkan {{angka:uji.par}} kasus sulit dalam {{angka:kelompok}} kelompok, dan kelompok identitas kejadian paling banyak dengan {{angka:par.a}} kasus sulit',
    'grafik': {'judul_panel': 'Jumlah kasus sulit menurut kelompok', 'ikon': 'ringkasan', 'judul': '**Kasus sulit**, menurut kelompok pertanyaan',
               'keluarga': 'netral', 'arah': 'horizontal', 'seragam': False, 'pembanding': False, 'ubah': False, 'persen_batang': False, 'sorot': ['Identitas kejadian'],
               'data': {'csv': c_kel, 'kolom': [{'nama': 'kelompok'}, {'nama': 'jumlah', 'fmt': '0'}], 'keyakinan': 'terverifikasi', 'sumber': SKJ}},
    'panel': {'judul': 'Contoh tiap kelompok', 'ikon': 'data', 'peringkat': False, 'sel_dua_baris': True, 'sel_maks_baris': 2, 'skala_huruf': 1.15, 'baris_maks_pt': 44,
              'data': {'csv': c_kel_contoh, 'kolom': [{'nama': 'kelompok', 'kepala': 'Kelompok', 'bobot': 0.8}, {'nama': 'contoh', 'kepala': 'Contoh singkat', 'rata': 'l', 'bobot': 2.2}],
                       'keyakinan': 'terverifikasi', 'sumber': SKJ}},
    '_bicara': ('Kasus sulit di sini berarti kasus penghitungan yang jawabannya berbeda tergantung siapa yang menghitung dan aturan apa yang dipakai. Kajian mengumpulkan 65 kasus dari data DIBI, logbook, '
                'hotspot, dan dokumen kerja kita, lalu mengelompokkannya menjadi tujuh kelompok menurut pertanyaan pokoknya. Kelompok terbesar adalah identitas kejadian, yaitu apa yang dihitung sebagai satu kejadian.')}
F['inti'] = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Delapan kasus sulit inti', 'cut_off': False, 'rasio': 1.0,
    'sumber': 'Katalog dan peta ketergantungan kasus sulit kajian BNPB, 12 Nov 2026', 'keterangan': 'Peta ketergantungan menghitung kasus sulit mana yang menentukan jawaban kasus sulit lain.',
    'judul': 'Delapan dari {{angka:uji.par}} kasus sulit menjadi inti karena menentukan paling banyak jawaban lain di antara {{angka:uji.hubungan}} hubungan antarkasus sulit',
    'tabel': {'judul_panel': 'Delapan kasus sulit inti, urut menurut pengaruh', 'ikon': 'satu-data', 'peringkat': True, 'skala_huruf': 1.2, 'baris_maks_pt': 46, 'sel_dua_baris': True, 'sel_maks_baris': 2,
              'data': {'csv': c_inti, 'kolom': [{'nama': 'kasus sulit', 'kepala': 'Kasus sulit inti', 'rata': 'l', 'bobot': 1.5}, {'nama': 'arti', 'kepala': 'Artinya dalam bahasa sehari-hari', 'rata': 'l', 'bobot': 2.4},
                                                {'nama': 'lapisan', 'kepala': 'Lapisan kerangka', 'rata': 'l', 'bobot': 0.9}],
                       'keyakinan': 'terverifikasi', 'sumber': SKJ}},
    '_bicara': ('Kasus sulit saling bergantung: ada 239 hubungan antarkasus sulit, sehingga satu keputusan menggeser banyak jawaban lain. Karena itu delapan kasus sulit inti dipilih dari urutan pengaruhnya, '
                'dan keputusan diambil berurutan dari atas ke bawah. Yang pertama menyangkut tata kelola: tanpa pemutus, semua aturan menggabungkan hanya saran.')}
F['longtail'] = S6
F['negara'] = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Pembanding negara', 'cut_off': False, 'rasio': 0.66,
    'sumber': 'Perbandingan basis data dan negara, Lampiran C kajian BNPB, 12 Nov 2026', 'keterangan': 'EM-DAT adalah basis data bencana internasional. USGS PAGER adalah sistem perkiraan dampak gempa. FEMA adalah badan penanggulangan darurat Amerika Serikat. Baris FEMA dan Filipina belum terverifikasi: nilai FEMA berasal dari dokumen public inspection, dan teks asli Filipina tidak dibuka.',
    'judul': 'Ada {{angka:pembanding}} pembanding yang memakai satuan kejadian dan ambang berbeda, sehingga jumlah kejadian antarbasis tidak sebanding',
    'tabel': {'judul_panel': 'Pembanding terpilih dan Indonesia', 'ikon': 'wilayah', 'peringkat': False, 'sel_dua_baris': True, 'sel_maks_baris': 3, 'skala_huruf': 1.3, 'baris_maks_pt': 70,
              'data': {'csv': c_negara, 'kolom': [{'nama': 'basis', 'kepala': 'Basis atau negara', 'rata': 'l', 'bobot': 1.2}, {'nama': 'satuan', 'kepala': 'Satuan kejadian', 'rata': 'l', 'bobot': 1.3},
                                                  {'nama': 'ambang', 'kepala': 'Ambang', 'rata': 'l', 'bobot': 2.0}, {'nama': 'jenis', 'kepala': 'Jenis ambang', 'rata': 'l', 'bobot': 1.1}],
                       'keyakinan': 'terverifikasi', 'sumber': 'Lampiran C kajian BNPB'}},
    'panel': panel_ikon('Pelajaran dari pembanding', 'lembaga', 'air', [
        ('data', 'Satuan berbeda', 'Jumlah kejadian antarbasis tidak dapat dibandingkan langsung.'),
        ('peringatan', 'Bahaya bukan besar', 'Skala bahaya bukan besar bencana.'),
        ('regulasi', 'Respons terhubung', 'PAGER mengaitkan warna dengan respons.')]),
    '_bicara': ('Kami membandingkan sembilan basis data dan lima negara dengan Indonesia. Tabel ini menampilkan yang paling relevan: EM-DAT, PAGER, Jepang, Amerika Serikat, dan Filipina. '
                'Dua temuan penting. Satuan kejadian berbeda antarbasis, sehingga jumlah kejadian tidak dapat dibandingkan langsung. Dan di antara sumber yang dibuka, hanya EM-DAT dan Indonesia yang '
                'memasukkan kriteria administratif, yaitu seruan bantuan atau status darurat, sebagai pintu masuk pencatatan.')}
import copy as _cp
F['kerangka'] = _cp.deepcopy(S7)
F['kerangka']['utama']['alur']['skala_huruf'] = 1.3
F['kerangka'].update({'pesan': 'Aturan hitung tiga langkah dalam satu halaman', 'rasio': 0.66,
                      'panel': panel_ikon('Prinsip revisi', 'regulasi', 'air', [
                          ('regulasi', 'Sekecil mungkin', 'Susunan Juklak tetap, isi berubah.'),
                          ('data', 'Tetap disimpan', 'DIBI menyimpannya dengan penanda.'),
                          ('lembaga', 'Cukup Juklak', 'Kriteria kejadian diserahkan ke pengelola data (walidata).')])})
F['gempa'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Gempa sebelum dan sesudah aturan baru', 'cut_off': False, 'rasio': 0.58,
    'sumber': f'{SDIBI}; simulasi kajian BNPB', 'keterangan': f'{K_DIBI} Katastrofik adalah kelas keparahan tertinggi usulan.',
    'judul': 'Satu gempa di {{angka:gempa.kab}} kabupaten kini terbaca sebagai satu kejadian nasional dengan {{angka:gempa.kab}} catatan kabupaten, bukan {{angka:gempa.pecah|fmt=3}} kejadian di tiap kabupaten',
    'utama': {'judul': 'Gempa 15 Agustus 2026 menurut aturan lama dan aturan baru', 'ikon': 'gempa',
              'banding': {'kiri': {'judul': 'Aturan sekarang (DIBI)'}, 'kanan': {'judul': 'Aturan usulan'}, 'baris': [
                  {'label': 'Jumlah kejadian', 'kiri': '{{angka:gempa.pecah|fmt=3}} kejadian di tiap kabupaten', 'kanan': 'Satu kejadian nasional'},
                  {'label': 'Catatan kabupaten', 'kiri': 'Pecahan, tidak ada catatan utuh', 'kanan': '{{angka:gempa.kab}} catatan yang menunjuk satu nomor induk'},
                  {'label': 'Korban', 'kiri': 'Manggarai {{angka:gempa.manggarai}} dan Nagekeo {{angka:gempa.nagekeo}} tak tampak', 'kanan': 'Korban tiap kabupaten tampak di catatannya'},
                  {'label': 'Skala keparahan', 'kiri': 'Tidak ada skala', 'kanan': 'Katastrofik, menurut dampaknya'}]}},
    'panel': panel_ikon('Aturan satu kejadian', 'wilayah', 'air', [
        ('lembaga', 'Nomor induk', 'Satu nomor dari Pusdatinkom untuk satu kejadian, dipakai semua kabupaten terdampak.'),
        ('wilayah', 'Catatan kabupaten', 'Tiap kabupaten terdampak tetap punya catatan sendiri.'),
        ('karhutla', 'Karhutla', 'Deteksi digabung bila dekat dalam jarak dan {{angka:gabung.jam}} jam, selesai setelah {{angka:gabung.selesai}} hari tanpa deteksi.'),
        ('kalender', 'Batas durasi', 'Satu kejadian paling lama {{angka:gabung.maks}} hari, gempa {{angka:gabung.gempa}} hari.')]),
    '_bicara': ('Satu kejadian adalah satu rangkaian dampak dari satu bahaya utama yang terhubung dalam ruang dan waktu. Gempa 15 Agustus 2026 melanda 11 kabupaten dan di DIBI tercatat 0,091 kejadian di tiap kabupaten. '
                'Manggarai mencatat 62 korban meninggal dan Nagekeo 20, tetapi di kolom jumlah kejadian keduanya hampir tidak tampak. Dalam aturan usulan, gempa itu satu kejadian dengan 11 catatan kabupaten, '
                'dan menurut dampaknya berkelas Katastrofik.')}
F['m'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Syarat masuk hitungan', 'cut_off': False,
    'sumber': 'Kajian BNPB, 12 Nov 2026; Juklak tahun 2023', 'keterangan': f'{K_JUK} SK adalah surat keputusan. Angka bobot dan ambang kriteria masih bawaan sementara.',
    'judul': 'Setiap kejadian yang masuk mencatat kriteria yang meloloskannya, dan {{angka:kriteria.usul}} syarat masuk hitungan memperjelas bunyi Juklak',
    'utama': {'judul': 'Syarat masuk hitungan', 'ikon': 'regulasi',
              'daftar_ikon': {'mode': 'baris', 'baris': [
                  {'ikon': 'jiwa', 'judul': 'Meninggal atau hilang', 'isi': 'Akibat langsung bahaya. Hilang ikut dihitung; kematian tidak langsung dicatat terpisah.', 'angka': '{{angka:juk.mati}}', 'satuan': 'jiwa'},
                  {'ikon': 'pengungsi', 'judul': 'Terdampak langsung', 'isi': 'Orang unik yang terdampak langsung didefinisikan, dan satu orang dihitung satu kali.', 'angka': '{{angka:juk.terdampak}}', 'satuan': 'orang'},
                  {'ikon': 'rumah', 'judul': 'Rumah setara rusak berat', 'isi': 'Rusak ringan dihitung seperempat dan rusak sedang setengah.', 'angka': '{{angka:juk.rumah}}', 'satuan': 'unit'},
                  {'ikon': 'sekolah', 'judul': 'Fasilitas penting', 'isi': 'Rusak berat atau sedang, dipisah dari rumah.', 'angka': '{{angka:juk.mati}}', 'satuan': 'fasilitas'},
                  {'ikon': 'karhutla', 'judul': 'Karhutla', 'isi': 'Luas terverifikasi atau lahan gagal panen (puso); jenis lahan dan sumber luas wajib, hotspot hanya indikasi.', 'angka': '{{angka:m5.lahan}}', 'satuan': 'hektare'},
                  {'ikon': 'regulasi', 'judul': 'SK tanggap darurat', 'isi': 'Permintaan bantuan dan status darurat menjadi penanda; hanya SK yang menyebut kejadian itu menjadi syarat.'}]}},
    'pita': {'label': 'Cara kriteria dipakai', 'nada': 'aksi', 'kolom': [
        {'ikon': 'ringkasan', 'judul': 'Dasar masuk dicatat', 'isi': 'Tiap kejadian mencatat kriteria yang meloloskannya.'},
        {'ikon': 'data', 'judul': 'Di bawah ambang', 'isi': 'Kejadian yang tidak memenuhi satu pun tetap disimpan.'},
        {'ikon': 'peringatan', 'judul': 'Ambang bawaan', 'isi': 'Angka bobot dan ambang masih bawaan sementara.'}]},
    '_bicara': ('Aturan usulan menetapkan enam syarat masuk hitungan yang ditulis langsung. Ada korban meninggal atau hilang akibat langsung, minimal lima puluh orang terdampak langsung, minimal lima rumah rusak berat atau setaranya, '
                'fasilitas penting rusak, karhutla minimal dua hektare terverifikasi atau puso sepuluh hektare, atau ada SK tanggap darurat yang cocok. Kejadian yang tidak memenuhi satu pun tetap disimpan '
                'sebagai kejadian di bawah ambang, dan tiap kejadian yang masuk mencatat syarat yang meloloskannya.')}
F['kelas'] = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Skala keparahan', 'cut_off': False, 'rasio': 0.62,
    'sumber': 'Kajian BNPB, 12 Nov 2026; USGS PAGER; simulasi kajian', 'keterangan': 'PAGER adalah sistem perkiraan dampak gempa USGS. Batas kelas masih bawaan sementara. Kelas Ringan adalah kejadian yang lolos ambang tetapi di bawah Sedang. Batas pengungsi untuk Besar dan Katastrofik hanya berlaku bila korban meninggal atau rumah rusak sudah mencapai Sedang.',
    'judul': 'Batas bawah kelas naik {{angka:kelas.pangkat}} kali lipat dari Sedang ke Besar dan dari Besar ke Katastrofik, dengan syarat tambahan bagi pengungsi',
    'tabel': {'judul_panel': 'Batas bawah tiap kelas menurut indikator tertinggi', 'ikon': 'peringatan', 'peringkat': False, 'skala_huruf': 1.9, 'baris_maks_pt': 120,
              'data': {'csv': c_kelas, 'kolom': [{'nama': 'kelas', 'kepala': 'Kelas'}, {'nama': 'mati', 'kepala': 'Meninggal dan hilang', 'fmt': '0'},
                                                 {'nama': 'ungsi', 'kepala': 'Mengungsi, puncak', 'fmt': '0'}, {'nama': 'rumah', 'kepala': 'Rumah setara rusak berat', 'fmt': '0'}],
                       'keyakinan': 'asumsi-kebijakan', 'sumber': SKJ}},
    'panel': panel_ikon('Aturan penting skala', 'regulasi', 'air', [
        ('jiwa', 'Pengungsi', 'Pengungsi saja paling tinggi Sedang; lebih tinggi perlu indikator lain.'),
        ('wilayah', 'Kabupaten kecil', 'Naik satu kelas bila terdampak mencapai {{angka:kab.persen}} persen penduduk.'),
        ('pembiayaan', 'Rupiah', 'Rupiah tidak menentukan kelas.'),
        ('regulasi', 'Status', 'Klasifikasi data; penetapan status tetap di kepala daerah.')]),
    '_bicara': ('Kelas ditentukan oleh indikator tertinggi yang dicapai, dan batasnya naik sepuluh kali lipat per kelas, mengikuti praktik PAGER milik USGS. Pengungsi saja tidak bisa membuat kelas lebih tinggi dari Sedang. '
                'Kabupaten kecil yang terpukul berat naik satu kelas bila pengungsi dan terdampaknya mencapai 10 persen penduduk, dengan lantai tertentu. Rupiah tidak menentukan kelas. '
                'Kelas ini klasifikasi data statistik dan tidak menggantikan penetapan status oleh kepala daerah atau Presiden. Batas kelas masih bawaan sementara.')}
F['ds'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'pesan': 'Angka yang sah dan penyajian', 'cut_off': False,
    'sumber': SKJ, 'ulang_angka_boleh': 'keterangan menjelaskan dasar hitung angka kartu', 'keterangan': 'Angka {{angka:lb.kali|fmt=0}} kali: {{angka:lb.kumulatif}} korban meninggal bila semua baris harian dijumlah lawan {{angka:lb.terbesar}} bila tiap kejadian diambil angka terbesarnya, dijumlah untuk semua kejadian logbook Januari sampai Oktober 2026. Aturan usulan memakai nilai laporan terakhir, {{angka:lb.terakhir}}, sehingga jumlah antarhari menjadi {{angka:lb.kali22}} kali dibanding nilai laporan terakhir. Deret adalah rangkaian angka menurut waktu. Patahan deret adalah penanda bahwa aturan berubah sehingga angka sebelum dan sesudahnya tidak sebanding.',
    'judul': 'Aturan angka sah mencegah korban meninggal menggelembung sekitar {{angka:lb.kali|fmt=0}} kali lipat karena penjumlahan antarhari', 'rasio': 0.64,
    'utama': {'judul': 'Aturan angka yang sah dan cara menyajikannya', 'ikon': 'ringkasan',
              'daftar_ikon': {'mode': 'baris', 'baris': [
                  {'ikon': 'jiwa', 'judul': 'Satu orang satu kategori', 'isi': 'Orang yang sama tidak terhitung dua kali di kategori korban.'},
                  {'ikon': 'kalender', 'judul': 'Nilai terakhir dan terbesar', 'isi': 'Nilai terakhir untuk meninggal dan kerusakan, nilai terbesar untuk lainnya.'},
                  {'ikon': 'peringatan', 'judul': 'Tanpa penjumlahan antarhari', 'isi': 'Menjumlah angka kumulatif lintas hari dilarang.'},
                  {'ikon': 'data', 'judul': 'Kosong bukan nol', 'isi': 'Angka nol dibedakan dari angka yang belum didata.'}]}},
    'pita': {'label': 'Aturan penyajian', 'nada': 'aksi', 'kolom': [
        {'ikon': 'ringkasan', 'judul': 'Jumlah tidak sendirian', 'isi': 'Selalu didampingi dampak dan sebaran kelas.'},
        {'ikon': 'naik', 'judul': 'Tren diberi tanda', 'isi': 'Hanya untuk deret yang sebanding; titik saat cara hitung berubah diberi tanda patahan.'},
        {'ikon': 'kalender', 'judul': 'Rilis bernomor versi', 'isi': 'Angka dirilis bulanan, beku per triwulan.'}]},
    'panel': {'judul': 'Akibat menjumlah antarhari', 'ikon': 'peringatan', 'nada': 'bahaya',
              'angka_besar': {'mode': 'kartu', 'kartu': [
                  {'nilai': '{{angka:lb.kumulatif}}', 'satuan': 'korban meninggal', 'label': 'Dijumlah antarhari', 'ket': 'Angka kumulatif logbook 2026.', 'ikon': 'peringatan'},
                  {'nilai': '{{angka:lb.terakhir}}', 'satuan': 'korban meninggal', 'label': 'Laporan terakhir', 'ket': 'Hasil aturan usulan.', 'ikon': 'kalender'},
                  {'nilai': '{{angka:lb.kali|fmt=0}}', 'satuan': 'kali', 'label': 'Dibanding nilai terbesar', 'ket': 'Nilai terbesar per kejadian.', 'ikon': 'ringkasan'}]}},
    '_bicara': ('Aturan angka korban menetapkan satu orang masuk satu kategori sehingga tidak terhitung dua kali. Korban meninggal dan kerusakan memakai nilai terakhir, sedangkan hilang, luka, terdampak, dan mengungsi memakai nilai terbesar selama kejadian. '
                'Menjumlah angka antarhari dilarang, karena itulah yang menggelembungkan korban meninggal sekitar 20 kali, dari 609 pada nilai terbesar menjadi 12.523 pada logbook 2026; aturan usulan memakai laporan terakhir, 565. Dalam aturan penyajian, jumlah kejadian tidak pernah sendirian, '
                'dan tren hanya untuk deret yang sebanding dengan tanda patahan deret.')}
F['tahun'] = dict(S8)
F['tahun']['judul'] = 'Aturan usulan meloloskan {{angka:l2.selisih|fmt=1|satuan}} lebih sedikit kejadian, dan penurunan terbesar ada pada cuaca ekstrem dan longsor'
F['tahun']['keterangan'] = f'{K_DIBI} Jenis lain mencakup kekeringan tetapi tidak karhutla, yang tampil sendiri. Catatan DIBI ({{{{angka:dibi.baris}}}} baris) digabung menjadi {{{{angka:kjn.total}}}} kejadian nasional menurut langkah satu aturan usulan. Semua kejadian adalah jumlah sebelum syarat masuk dipakai. Tabel jenis bahaya memakai versi akhir aturan, sama dengan sebaran kelas pada slide pilihan skala. Kriteria luas dan SK tanggap darurat tidak terukur di DIBI.'
F['tahun']['panel'] = {'judul': 'Kejadian lolos menurut jenis bahaya', 'ikon': 'ringkasan', 'peringkat': False, 'skala_huruf': 1.3, 'baris_maks_pt': 46,
                       'data': {'csv': c_jl2, 'kolom': [{'nama': 'jenis', 'kepala': 'Jenis bahaya'}, {'nama': 'kjn', 'kepala': 'Semua kejadian', 'fmt': '0'}, {'nama': 'lama', 'kepala': 'Juklak', 'fmt': '0'},
                                                        {'nama': 'usulan', 'kepala': 'Usulan', 'fmt': '0'}], 'keyakinan': 'terverifikasi', 'sumber': SSIM},
                       'daftar': ['Karhutla nyaris tidak berubah karena kriteria luas dan SK darurat tidak terukur di DIBI.']}
F['tahun']['ulang_angka_boleh'] = 'keterangan menjelaskan dasar hitung angka tabel'
F['tahun']['pesan'] = 'Aturan usulan lawan aturan Juklak menurut jenis'
F['tahun']['sumber'] = 'Simulasi aturan usulan pada data DIBI, kajian BNPB, 12 Nov 2026'
F['tahun']['jenis_slide'] = 'tabel'
F['gugur'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'pesan': 'Yang gugur dan yang masuk', 'cut_off': False, 'rasio': 0.6,
    'sumber': SSIM, 'keterangan': f'{K_DIBI} Kejadian yang gugur tidak dibuang karena tetap disimpan sebagai kejadian di bawah ambang. Selisih dihitung pada DIBI; sebaran per jenis di slide lain memakai versi akhir aturan.',
    'judul': 'Aturan usulan menggugurkan {{angka:l2.gugur_n}} kejadian dan memasukkan {{angka:l2.baru_n}} kejadian baru, sehingga selisih bersihnya {{angka:l2.gugur}} kejadian',
    'utama': {'judul': 'Contoh kejadian yang gugur dan yang masuk', 'ikon': 'ringkasan',
              'banding': {'kiri': {'judul': 'Gugur dari hitungan'}, 'kanan': {'judul': 'Masuk hitungan baru'}, 'baris': [
                  {'label': 'Contoh', 'kiri': '{{angka:gugur.terdampak}} terdampak, {{angka:gugur.rb}} rumah rusak berat, {{angka:gugur.rr}} rusak ringan', 'kanan': 'Korban hilang tanpa korban meninggal'},
                  {'label': 'Aturan Juklak', 'kiri': 'Lolos karena lima rumah rusak', 'kanan': 'Tidak masuk, hilang tidak dihitung'},
                  {'label': 'Aturan usulan', 'kiri': 'Rusak ringan hanya seperempat, jadi tidak cukup', 'kanan': 'Hilang dihitung seperti meninggal'},
                  {'label': 'Definisi terdampak', 'kiri': 'Definisi terdampak berbeda antarjuklak', 'kanan': 'Terdampak didefinisikan, satu orang dihitung satu kali'}]}},
    'panel': panel_ikon('Yang perlu diingat', 'peringatan', 'netral', [
        ('naik', 'Selisih bersih', '{{angka:l2.gugur_n}} kejadian gugur, {{angka:l2.baru_n}} baru masuk: selisih bersih {{angka:l2.gugur}} ({{angka:l2.lama}} menjadi {{angka:l2.usulan}}).'),
        ('data', 'Batas bawah', 'Luas dan SK darurat tidak terukur di DIBI.'),
        ('regulasi', 'Disimpan', 'Tetap ada di basis data dengan penanda.'),
        ('ringkasan', 'Dasar masuk', 'Tiap kejadian yang masuk mencatat kriteria yang meloloskannya.')]),
    '_bicara': ('Ambang usulan meloloskan 6.835 kejadian dibanding 7.535, selisih 700 kejadian. Yang gugur hampir semuanya lolos hanya karena rumah atau fasilitas rusak ringan, '
                'misalnya satu kejadian dengan 48 orang terdampak, 2 rumah rusak berat, dan 3 rusak ringan. Yang masuk baru adalah kejadian dengan korban hilang tanpa korban meninggal. '
                'Perubahan terbesar justru pada definisi terdampak langsung, lebih dari angka ambangnya.')}
F['opsi'] = dict(S9)
F['opsi']['panel'] = {'judul': 'Kelas menurut jenis bahaya, skala absolut', 'ikon': 'peringatan', 'peringkat': False, 'skala_huruf': 1.35, 'baris_maks_pt': 46,
                      'data': {'csv': c_jkelas, 'kolom': [{'nama': 'jenis', 'kepala': 'Jenis bahaya'}, {'nama': 'n', 'kepala': 'Lolos', 'fmt': '0'}, {'nama': 's', 'kepala': 'Sedang', 'fmt': '0'},
                                                         {'nama': 'b', 'kepala': 'Besar', 'fmt': '0'}, {'nama': 'k', 'kepala': 'Katastrofik', 'fmt': '0'}], 'keyakinan': 'terverifikasi', 'sumber': SSIM},
                      'daftar': ['Usulan menaikkan satu kelas bagi kabupaten kecil: {{angka:kelas.naik_n}} kejadian, {{angka:kelas.berubah|fmt=1|satuan}}. Besar atau Katastrofik: {{angka:kelas.a_n}} ({{angka:kelas.a_v2|fmt=1|satuan}}) pada skala absolut, {{angka:kelas.u_n}} ({{angka:kelas.u_atas|fmt=1|satuan}}) pada usulan.']}
F['opsi']['ulang_angka_boleh'] = 'keterangan menjelaskan dasar hitung angka tabel'
F['opsi']['pesan'] = 'Pilihan skala keparahan menurut jenis'
F['opsi']['keterangan'] = F['opsi']['keterangan'].replace(' Skala absolut memakai angka dampak tetap; skala relatif membaginya dengan jumlah penduduk kabupaten.', '') + ' Jenis lain di sini mencakup karhutla tetapi tidak kekeringan, jadi berbeda dari slide Juklak dan usulan.'
F['opsi']['sumber'] = 'Simulasi aturan usulan pada data DIBI, kajian BNPB, 12 Nov 2026'
F['tren'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Tren jumlah kejadian lawan korban', 'cut_off': False, 'rasio': 0.58,
    'sumber': 'Simulasi aturan usulan pada data DIBI, kajian BNPB, 12 Nov 2026', 'keterangan': f'{K_DIBI} Indeks 2024 sama dengan seratus. Slide ini memakai Januari sampai Oktober tiap tahun. Indeks jumlah resmi: {{{{angka:tren.i25}}}} pada 2025 dan {{{{angka:tren.i26}}}} pada 2026 terhadap 2024, jadi turun {{{{angka:tren.turun|satuan}}}} dari 2025 ke 2026.',
    'judul': 'Jumlah resmi DIBI naik {{angka:tren.naik|satuan}} pada 2025 lalu kembali ke tingkat 2024 pada 2026, sedangkan korban bergerak lebih landai',
    'utama': {'judul': 'Jumlah kejadian dan korban, indeks 2024 sama dengan seratus', 'ikon': 'naik',
              's3_baris_kelompok': {'data': {'csv': c_tren2, 'kolom': [{'nama': 'indikator'}, {'nama': 'y2024', 'kepala': '2024', 'fmt': '1'}, {'nama': 'y2025', 'kepala': '2025', 'fmt': '1'},
                                                                        {'nama': 'y2026', 'kepala': '2026', 'fmt': '1'}], 'keyakinan': 'terverifikasi', 'sumber': SDIBI}}},
    'panel': panel_ikon('Mengapa jumlah menyesatkan', 'peringatan', 'bahaya', [
        ('peringatan', 'Catatan bukan bencana', 'Dari {{angka:tren.bukan_2024|fmt=1|satuan}} (2024) ke {{angka:tren.bukan_2025|fmt=1|satuan}} (2025).'),
        ('rumah', 'Rumah rusak berat', 'Naik {{angka:tren.rumah|satuan}} pada 2026 karena gempa Agustus walau jumlah kejadian turun.'),
        ('regulasi', 'Deret tidak sebanding', 'Deret lintas 2024 dan 2025 tidak boleh dibaca sebagai tren.')]),
    '_bicara': ('Jumlah resmi DIBI naik 174 persen dari 2024 ke 2025, lalu turun 61 persen pada 2026, sedangkan korban meninggal dan hilang bergerak lebih landai. Lonjakan 2025 sebagian besar adalah catatan di bawah ambang, '
                'karena catatan bertanda bukan bencana naik dari 2,5 persen pada 2024 menjadi 41,4 persen pada 2025. Pada 2026 rumah setara rusak berat naik 227 persen walaupun jumlah kejadian turun, karena gempa Agustus. '
                'Jumlah kejadian tidak boleh dibaca sebagai ukuran keparahan.')}
F['uji'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'pesan': 'Hasil uji kasus sulit', 'cut_off': False, 'rasio': 0.58,
    'sumber': 'Uji kasus sulit dan kasus uji pemeriksa independen, kajian BNPB, 12 Nov 2026', 'keterangan': 'Sebagian berarti arahnya ada tetapi masih bergantung pada angka bawaan, data yang belum ada, atau keputusan di luar BNPB. Kasus uji dari pemeriksa dibuat oleh orang yang tidak ikut menulis aturan.',
    'judul': 'Aturan usulan menjawab penuh {{angka:uji.penuh}} dari {{angka:uji.par}} kasus sulit dan tidak ada yang gagal, sedangkan {{angka:uji.sebagian}} lainnya masih sebagian',
    'utama': {'judul': 'Status kasus sulit menurut kelompok', 'ikon': 'ringkasan',
              'tumpuk': {'warna': ['navy', 'oranye'],
                         'data': {'csv': c_status, 'kolom': [{'nama': 'kelompok'}, {'nama': 'penuh', 'kepala': 'Terjawab penuh', 'fmt': '0'}, {'nama': 'sebagian', 'kepala': 'Sebagian', 'fmt': '0'}],
                                  'keyakinan': 'terverifikasi', 'sumber': SKJ}}},
    'panel': {'judul': 'Dua uji pada aturan usulan', 'ikon': 'data', 'peringkat': False, 'skala_huruf': 2.0, 'baris_maks_pt': 110,
              'data': {'csv': c_uji, 'kolom': [{'nama': 'uji', 'kepala': 'Uji'}, {'nama': 'kasus', 'kepala': 'Kasus', 'fmt': '0'}, {'nama': 'penuh', 'kepala': 'Penuh', 'fmt': '0'},
                                               {'nama': 'sebagian', 'kepala': 'Sebagian', 'fmt': '0'}, {'nama': 'gagal', 'kepala': 'Gagal', 'fmt': '0'}],
                       'keyakinan': 'terverifikasi', 'sumber': SKJ},
              'daftar': ['Versi awal aturan gagal pada {{angka:uji.gagal_v1}} kasus sulit; kini terjawab.',
                         'Kasus uji dari pemeriksa: {{angka:uji.adv_berat}} kasus berat, sudah diperbaiki.']},
    '_bicara': ('Aturan usulan diuji empat cara: tiap kasus sulit dijawab atau tidak, aturan dicek agar tidak saling bertentangan, aturan dijalankan pada data DIBI dan logbook, dan pemeriksa yang tidak ikut menulis mencoba mematahkannya dengan kasus uji. '
                'Dari 65 kasus sulit, 42 terjawab penuh dan 23 sebagian, tanpa yang gagal. Status sebagian berasal dari rincian yang belum ditulis, angka sementara yang belum diuji satu musim penuh, dan data di luar BNPB, bukan dari pertentangan logika. '
                'Dari 26 kasus uji pemeriksa, 17 terjawab penuh dan 9 sebagian.')}
F['ubah'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Delapan perubahan Juklak', 'cut_off': False,
    'sumber': 'Usulan revisi Juklak tahun 2023, kajian BNPB, 12 Nov 2026', 'keterangan': f'{K_JUK} {K_DIBI} {K_PDK} Tujuh baris merangkum delapan perubahan terpenting, dua di antaranya digabung dalam baris pertama, dari lima belas perubahan yang diusulkan. Tujuh perubahan lain bersifat redaksional atau menyangkut epidemi.',
    'judul': 'Revisi Juklak cukup {{angka:usul.jumlah}} perubahan, dan {{angka:usul.tampil}} yang paling menentukan dirangkum dalam {{angka:ubah.baris}} baris tabel',
    'utama': {'judul': 'Perubahan Juklak yang paling menentukan, beserta alasannya', 'ikon': 'regulasi',
              'daftar_ikon': {'mode': 'baris', 'baris': [
                  {'ikon': 'regulasi', 'judul': 'Definisi dan kode', 'isi': 'Lima definisi baru dan nomor induk kejadian, satu nomor dari Pusdatinkom untuk satu kejadian, dipakai bersama semua kabupaten terdampak.'},
                  {'ikon': 'jiwa', 'judul': 'Ambang', 'isi': 'Enam kriteria diganti kriteria usulan; bantuan dan status darurat menjadi penanda, kecuali SK tanggap darurat.', 'angka': '{{angka:dibi.tunggal_p|fmt=0}}', 'satuan': 'persen catatan dari satu kriteria'},
                  {'ikon': 'wilayah', 'judul': 'Lintas wilayah', 'isi': 'Jumlah kejadian dan jumlah catatan kabupaten menjadi dua nama hitungan; pecahan dihapus.', 'angka': '{{angka:dibi.pecahan}}', 'satuan': 'baris pecahan di DIBI'},
                  {'ikon': 'karhutla', 'judul': 'Aturan menggabungkan', 'isi': 'Satu aturan per jenis bahaya untuk menggabungkan dan menutup kejadian.', 'angka': '{{angka:hs.kali|fmt=1}}', 'satuan': 'kali selisih karhutla'},
                  {'ikon': 'peringatan', 'judul': 'Skala keparahan', 'isi': 'Kelas Ringan sampai Katastrofik sebagai klasifikasi data.', 'angka': '{{angka:dibi.konsen_1|fmt=1}}', 'satuan': 'persen korban meninggal'},
                  {'ikon': 'kalender', 'judul': 'Versi angka', 'isi': 'Rilis bulanan bernomor versi dan beku per triwulan; penjumlahan antarhari dilarang.', 'angka': '{{angka:lb.kali|fmt=0}}', 'satuan': 'kali gelembung korban'},
                  {'ikon': 'surel', 'judul': 'Formulir', 'isi': 'Kolom nomor induk dan dasar masuk ditambah, agar aturan baru bisa diperiksa.', 'angka': '{{angka:kolom.baru}}', 'satuan': 'kolom baru'}]}},
    '_bicara': ('Revisi dibuat sekecil mungkin. Susunan Juklak 7/2023 dipertahankan, yang berubah isi ketentuan. Dari 15 perubahan, delapan yang paling menentukan ada di slide ini; tujuh lainnya mengenai redaksi, definisi, dan epidemi. '
                'Kejadian di bawah ambang tidak dibuang, karena DIBI sudah menyimpannya dengan penanda sejak 2025. Revisi ini cukup ditetapkan sebagai perubahan Juklak, karena Perban 1/2023 mendelegasikan kriteria kejadian kepada walidata.')}
F['bpbd'] = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'pesan': 'Apa yang berubah bagi BPBD', 'cut_off': False, 'rasio': 1.0,
    'sumber': SKJ, 'keterangan': f'{K_BPBD} {K_PUS} Beban kerja nyata per kejadian baru dapat diukur pada tahap uji coba.',
    'judul': 'BPBD mengisi {{angka:kolom.baru}} kolom tambahan per kejadian, dan beban kerja nyata baru dapat diukur pada tahap uji coba',
    'tabel': {'judul_panel': 'Kolom tambahan pada formulir kejadian', 'ikon': 'surel', 'peringkat': True, 'skala_huruf': 1.25, 'baris_maks_pt': 30,
              'data': {'csv': c_bpbd, 'kolom': [{'nama': 'kolom', 'kepala': 'Kolom baru', 'rata': 'l', 'bobot': 1.2}, {'nama': 'fungsi', 'kepala': 'Fungsi', 'rata': 'l', 'bobot': 2.6}],
                       'keyakinan': 'asumsi-kebijakan', 'sumber': SKJ}},
    '_bicara': ('Bagi BPBD, perubahan terbesar ada di formulir. Ada sebelas kolom tambahan per kejadian, sebagian besar terisi otomatis seperti nomor induk, dasar masuk, dan kelas, sedangkan sisanya berupa pilihan. '
                'Tanpa kolom ini aturan baru tidak bisa diperiksa. Beban kerja nyata belum bisa diukur karena wawancara belum dilakukan; waktu per kejadian akan diukur pada tahap uji coba. '
                'Fitur dasarnya sudah ada di sistem logbook kita, dan meja data dampak untuk BPBD sudah membedakan nol dari belum didata.')}
F['tahap'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Tahap penerapan', 'cut_off': False, 'rasio': 0.66,
    'sumber': SKJ, 'keterangan': f'{K_PDK} {K_JUK}',
    'judul': 'Penerapan berjalan dalam {{angka:tahap}} tahap, dimulai dari keputusan pimpinan dan uji coba berdampingan di {{angka:provinsi.uji}} provinsi selama satu musim',
    'utama': {'judul': 'Empat tahap penerapan aturan baru', 'ikon': 'kalender',
              'alur': {'skala_huruf': 1.65, 'sorot': 0, 'label_hasil': 'Hasil', 'langkah': [
                  {'judul': 'Keputusan', 'pelaku': 'Pimpinan BNPB', 'butir': ['Jawab pertanyaan.', 'Pilih A atau B.', 'Bawaan jadi tetap.'], 'hasil': 'Keputusan tetap.'},
                  {'judul': 'Uji coba', 'pelaku': 'Tiga provinsi', 'butir': ['Dua aturan berdampingan.', 'Tiga provinsi berbeda.', 'Satu musim, ada wawancara.'], 'hasil': 'Beban kerja terukur.'},
                  {'judul': 'Revisi Juklak', 'pelaku': 'Pusdatinkom', 'butir': ['Perubahan Juklak tahun 2023.', 'Metadata DIBI diperbarui.', 'Formulir baru disusun.'], 'hasil': 'Juklak dan formulir baru.'},
                  {'judul': 'Penerapan nasional', 'pelaku': 'Semua pencatat', 'butir': ['Formulir memakai aturan baru.', 'Deret lama dihitung ulang.', 'Titik ubah dicatat.'], 'hasil': 'Deret sebanding.'}]}},
    'panel': panel_ikon('Rencana aksi', 'ringkasan', 'air', [
        ('ringkasan', 'Sudah dilakukan', 'Kajian dan ujinya selesai.'),
        ('regulasi', 'Berikutnya', 'Keputusan pimpinan dahulu, sesudahnya uji coba.'),
        ('kalender', 'Satu musim', 'Uji coba berjalan satu musim penuh.')]),
    '_bicara': ('Penerapan berjalan dalam empat tahap. Tahap nol adalah keputusan pimpinan atas pertanyaan prioritas. Tahap satu uji coba: aturan baru dan lama berjalan berdampingan di tiga provinsi selama satu musim, '
                'disertai wawancara. Tahap dua revisi Juklak dan metadata DIBI. Tahap tiga penerapan nasional, dengan catatan patahan deret. Yang sudah dilakukan adalah kajian dan ujinya, '
                'sedangkan wawancara pencatat belum dilakukan.')}


F['pohon'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Pohon keputusan ambang masuk', 'cut_off': False,
    'sumber': 'Aturan hitung usulan, kajian BNPB, 12 Nov 2026', 'keterangan': 'SK adalah surat keputusan. Pemeriksaan berurutan dari kiri ke kanan. Batas angka masih bawaan sementara.',
    'judul': 'Pohon keputusan memeriksa {{angka:kriteria.usul}} hal secara berurutan, dan kejadian masuk hitungan begitu satu kriteria terpenuhi',
    'utama': {'judul': 'Pemeriksaan ambang masuk, dari kiri ke kanan', 'ikon': 'regulasi',
              'alur': {'skala_huruf': 1.7, 'sorot': 5, 'label_hasil': 'Hasil', 'langkah': [
                  {'judul': 'Jenis bencana', 'pelaku': 'Pertama', 'butir': ['Ya: periksa lanjut.', 'Tidak: bukan bencana.'], 'hasil': 'Bukan bencana.'},
                  {'judul': 'Korban', 'pelaku': 'Kedua', 'butir': ['Korban langsung.', 'Ya: masuk.', 'Tidak: lanjut.'], 'hasil': 'Masuk bila ya.'},
                  {'judul': 'Terdampak', 'pelaku': 'Ketiga', 'butir': ['Terdampak langsung.', 'Ya: masuk.', 'Tidak: lanjut.'], 'hasil': 'Masuk bila ya.'},
                  {'judul': 'Rumah atau fasilitas', 'pelaku': 'Keempat', 'butir': ['Rumah atau fasilitas rusak.', 'Ya: masuk.', 'Tidak: lanjut.'], 'hasil': 'Masuk bila ya.'},
                  {'judul': 'Karhutla', 'pelaku': 'Kelima', 'butir': ['Luas atau gagal panen.', 'Ya: masuk.', 'Tidak: lanjut.'], 'hasil': 'Masuk bila ya.'},
                  {'judul': 'SK darurat', 'pelaku': 'Keenam', 'butir': ['SK yang cocok.', 'Ya: masuk.', 'Tidak: di bawah ambang.'], 'hasil': 'Di bawah ambang.'}]}},
    '_bicara': ('Pohon keputusan ambang masuk dibaca dari kiri. Pertama pastikan penyebabnya salah satu jenis bencana. Lalu kriteria diperiksa satu per satu, dari korban meninggal atau hilang sampai SK tanggap darurat. '
                'Kejadian masuk begitu satu kriteria terpenuhi dan dicatat bersama kriteria itu. Kejadian yang tidak memenuhi satu pun disimpan sebagai kejadian di bawah ambang.')}


F['batas'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Batas kajian', 'cut_off': False,
    'sumber': 'Bab Keterbatasan kajian BNPB, 12 Nov 2026', 'keterangan': f'{K_DIBI} {K_JUK} Hotspot adalah deteksi api oleh satelit. Pernyataan bertanda belum terverifikasi di Lampiran C kajian masih menunggu pengecekan ke sumber primer.',
    'judul': 'Batas kajian: hanya {{angka:kriteria.diuji}} dari {{angka:juk.kriteria}} kriteria yang dapat diuji, dan wawancara dengan pencatat belum dilakukan',
    'utama': {'judul': 'Yang perlu diingat saat membaca hasil', 'ikon': 'peringatan',
              'daftar_ikon': {'mode': 'baris', 'baris': [
                  {'ikon': 'data', 'judul': 'Data DIBI dan teks Juklak', 'isi': 'DIBI ditarik dari dasbor publik sampai 12 November 2026 dan dapat dikoreksi; Juklak dibaca dari salinan tidak resmi, lima halaman belum terbaca.'},
                  {'ikon': 'luas', 'judul': 'Karhutla batas bawah', 'isi': 'DIBI tidak menyimpan luas lahan dan status darurat, dan hotspot bukan luas terbakar.'},
                  {'ikon': 'jiwa', 'judul': 'Wawancara dan ambang', 'isi': 'Beban kerja bagi pencatat belum terukur; ambang dan kelas belum disesuaikan dengan respons negara.'},
                  {'ikon': 'lembaga', 'judul': 'Rujukan belum terverifikasi', 'isi': 'Sebagian pernyataan di Lampiran C menunggu pengecekan ke sumber primer.'}]}},
    'pita': {'label': 'Arti bagi pembaca', 'nada': 'hujan', 'kolom': [
        {'ikon': 'luas', 'judul': 'Karhutla', 'isi': 'Angka yang lolos ambang adalah batas bawah.'},
        {'ikon': 'ringkasan', 'judul': 'Kejadian nasional', 'isi': 'Hitungan dari DIBI adalah batas atas tanpa nomor induk.'},
        {'ikon': 'regulasi', 'judul': 'Kelas keparahan', 'isi': 'Klasifikasi data; tingkat bencana menunggu peraturan presiden.'}]},
    '_bicara': ('Sebelum keputusan, tiga batas kajian perlu disebut. Data DIBI ditarik dari dasbor publik sampai 12 November 2026. Teks Juklak dibaca dari salinan tidak resmi. Hanya tiga dari enam kriteria yang bisa diuji, '
                'wawancara belum dilakukan, dan angka ambang serta kelas masih bawaan sementara karena belum disesuaikan dengan respons negara. Sebagian rujukan di Lampiran C juga masih bertanda belum terverifikasi.')}


c_lima = tulis_csv('lima_cara.csv', ['cara', 'bila'], [
    ['Cara satu', 'Jenis bencana dan kabupaten sama pada tanggal kejadian yang sama'],
    ['Cara dua', 'Seperti cara satu, tetapi kabupaten yang berbatasan digabung; dipakai arsip logbook 2026'],
    ['Cara tiga', 'Jenis bencana dan kabupaten sama, dengan jeda antarkemunculan paling lama tujuh hari'],
    ['Cara empat', 'Jenis bencana dan tanggal sama, di kabupaten mana pun'],
    ['Cara lima', 'Tidak ada pencocokan: tiap baris harian dihitung sendiri']])
F['pertanyaan'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'pesan': 'Tiga pertanyaan penelitian', 'cut_off': False,
    'sumber': SKJ, 'keterangan': f'{K_DIBI} {K_JUK}',
    'judul': 'Kajian ini menjawab {{angka:pertanyaan}} pertanyaan tentang cara kita menghitung kejadian bencana, dan jawabannya mengubah cara angka dibaca',
    'utama': {'judul': 'Tiga pertanyaan penelitian', 'ikon': 'ringkasan',
              'daftar_ikon': {'mode': 'baris', 'baris': [
                  {'ikon': 'data', 'judul': 'Pertanyaan satu: cara menghitung', 'isi': 'Seberapa besar jumlah kejadian berubah bila cara menghitungnya berubah.', 'angka': '{{angka:hs.kali|fmt=1}}', 'satuan': 'kali selisih karhutla'},
                  {'ikon': 'regulasi', 'judul': 'Pertanyaan dua: syarat dalam Juklak', 'isi': 'Apakah enam kriteria Juklak tahun 2023 menyaring kejadian dengan terukur dan setara antarjenis bencana.', 'angka': '{{angka:dibi.tunggal_p|fmt=0}}', 'satuan': 'persen lolos lewat satu kriteria'},
                  {'ikon': 'satu-data', 'judul': 'Pertanyaan tiga: aturan hitung baru', 'isi': 'Apakah aturan hitung baru membuat angka lebih stabil dan bermakna. Selisih antar-cara turun dari {{angka:lb.sel|fmt=0}} persen menjadi {{angka:lb.sel_lolos|fmt=0}} persen; kejadian {{angka:l2.selisih|fmt=1}} persen lebih sedikit.', 'angka': '{{angka:lb.sel|fmt=0}}', 'satuan': 'persen selisih antar-cara'}]}},
    'pita': {'label': 'Jawaban singkat', 'nada': 'aksi', 'kolom': [
        {'ikon': 'data', 'judul': 'Cara menghitung', 'isi': 'Jumlah berubah sangat besar, sampai {{angka:hs.kali|fmt=1|satuan}} pada karhutla.'},
        {'ikon': 'regulasi', 'judul': 'Syarat dalam Juklak', 'isi': 'Tidak terukur dan tidak setara antarjenis bencana.'},
        {'ikon': 'satu-data', 'judul': 'Aturan hitung baru', 'isi': 'Ya, dengan syarat: angka lebih stabil dan bisa diperiksa.'}]},
    '_bicara': ('Kajian ini punya tiga pertanyaan. Pertama, seberapa besar jumlah kejadian berubah bila cara menghitungnya berubah. Kedua, apakah enam kriteria Juklak menyaring kejadian dengan terukur dan setara antarjenis bencana. '
                'Ketiga, apakah aturan hitung baru membuat angka lebih stabil dan bermakna. Jawaban singkatnya: jumlah berubah sangat besar, kriteria Juklak tidak terukur dan tidak setara, dan aturan baru lebih stabil dengan beberapa syarat.')}
F['data'] = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Tiga sumber data', 'cut_off': False, 'rasio': 0.5,
    'sumber': 'Olahan kajian BNPB atas DIBI dan logbook Pusdalops serta hotspot VIIRS, data sampai 12 Nov 2026', 'keterangan': f'{K_DIBI} {K_PUS} {K_HS} Kasus sulit adalah keadaan yang membuat dua petugas menghitung berbeda untuk kejadian yang sama.',
    'judul': 'Kajian menguji {{angka:dibi.baris}} catatan DIBI dan {{angka:lb.baris}} baris logbook Pusdalops, lalu mengecek karhutla dengan {{angka:hs.deteksi}} titik hotspot',
    'utama': {'judul': 'Tiga sumber data kajian', 'ikon': 'data',
              'angka_besar': {'mode': 'kartu', 'kartu': [
                  {'nilai': '{{angka:dibi.baris}}', 'satuan': 'catatan', 'label': 'DIBI', 'ket': 'Awal 2024 sampai 12 November 2026.', 'ikon': 'data'},
                  {'nilai': '{{angka:lb.baris}}', 'satuan': 'baris', 'label': 'Logbook Pusdalops', 'ket': 'Laporan harian, Januari sampai Oktober 2026.', 'ikon': 'satu-data'},
                  {'nilai': '{{angka:hs.deteksi}}', 'satuan': 'titik', 'label': 'Hotspot VIIRS', 'ket': '15 Oktober sampai 11 November 2026.', 'ikon': 'karhutla'}]}},
    'panel': panel_ikon('Cara menguji tiap pertanyaan', 'regulasi', 'air', [
        ('data', 'Cara menghitung', 'Hotspot digabung dengan jarak dan selang waktu berbeda, dan logbook dicocokkan dengan lima cara.'),
        ('regulasi', 'Syarat dalam Juklak', 'Enam kriteria diuji pada catatan DIBI setahun terakhir, lalu angka batasnya diubah.'),
        ('satu-data', 'Aturan hitung baru', 'Aturan usulan dijalankan pada DIBI dan logbook, dibandingkan dengan Juklak, lalu diuji dengan kasus sulit.')]),
    'pita': {'label': 'Catatan tiap sumber', 'nada': 'hujan', 'kolom': [
        {'ikon': 'data', 'judul': 'DIBI', 'isi': 'Ditarik dari dasbor publik dan dapat dikoreksi susulan.'},
        {'ikon': 'satu-data', 'judul': 'Logbook', 'isi': 'Angka dampak diurai dari teks bebas.'},
        {'ikon': 'karhutla', 'judul': 'Hotspot', 'isi': 'Deteksi satelit; luas terbakar tidak diukur.'}]},
    '_bicara': ('Ada tiga sumber data. DIBI berisi 15.974 catatan dari awal 2024 sampai 12 November 2026. Logbook harian Pusdalops 2026 berisi 9.329 baris. '
                'Hotspot satelit VIIRS berisi 295.488 titik dari 15 Oktober sampai 11 November 2026. Tiap pertanyaan diuji dengan cara berbeda, seperti ditunjukkan di panel kanan.')}
F['lima'] = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Lima cara mencocokkan logbook', 'cut_off': False, 'rasio': 0.64,
    'sumber': 'Uji pencocokan logbook Pusdalops, kajian BNPB, 12 Nov 2026', 'keterangan': f'{K_PUS} Baris harian adalah satu laporan harian di logbook.',
    'judul': 'Logbook dicocokkan dengan {{angka:lima}} cara, dan tiap cara diuji dengan tiga aturan angka korban',
    'tabel': {'judul_panel': 'Dua baris dianggap satu kejadian bila', 'ikon': 'satu-data', 'peringkat': False, 'sel_dua_baris': True, 'sel_maks_baris': 3, 'skala_huruf': 1.3, 'baris_maks_pt': 62,
              'data': {'csv': c_lima, 'kolom': [{'nama': 'cara', 'kepala': 'Cara', 'bobot': 0.8}, {'nama': 'bila', 'kepala': 'Syarat', 'rata': 'l', 'bobot': 3.0}],
                       'keyakinan': 'terverifikasi', 'sumber': SKJ}},
    'panel': panel_ikon('Tiga aturan angka korban', 'jiwa', 'air', [
        ('naik', 'Nilai terbesar', 'Memakai angka tertinggi selama kejadian.'),
        ('peringatan', 'Jumlah semua laporan', 'Menjumlah angka antarhari.'),
        ('kalender', 'Laporan terakhir', 'Memakai angka koreksi terbaru; ini yang dipakai aturan usulan.')]),
    '_bicara': ('Logbook Pusdalops dicocokkan dengan lima cara. Cara satu menyamakan jenis bencana, kabupaten, dan tanggal. Cara dua menambah penggabungan kabupaten yang berbatasan dan dipakai arsip logbook 2026. '
                'Cara tiga memakai jeda paling lama tujuh hari tanpa melihat tanggal. Cara empat tidak melihat kabupaten. Cara lima tidak mencocokkan sama sekali. Untuk tiap cara, korban dihitung dengan nilai terbesar, jumlah semua laporan, atau laporan terakhir.')}
F['logbook'] = dict(S3)
F['logbook']['jenis_slide'] = 'panel'


def posisi(slide, pesan):
    for i, s in enumerate(slide, 1):
        if s.get('pesan') == pesan:
            return i
    raise SystemExit(f'pesan tidak ditemukan: {pesan}')


def susun_lengkap():
    urut = [
        ('r', dict(RINGKASAN)),
        ('b', 1), ('s', F['kapuas']), ('s', F['pertanyaan']),
        ('b', 2), ('s', F['data']), ('s', F['lima']),
        ('b', 3), ('s', F['gabung']), ('s', F['logbook']), ('s', F['lain']),
        ('b', 4), ('s', F['vonis']), ('s', F['penentu']), ('s', F['jenis']), ('s', F['kepekaan']), ('s', F['longtail']),
        ('b', 5), ('s', F['tahun']), ('s', F['gugur']), ('s', F['opsi']), ('s', F['tren']), ('s', F['par65']), ('s', F['uji']),
        ('b', 6), ('s', F['negara']), ('s', F['kerangka']), ('s', F['gempa']), ('s', F['m']), ('s', F['pohon']), ('s', F['kelas']), ('s', F['ds']),
        ('b', 7), ('s', F['ubah']), ('s', F['bpbd']), ('s', F['tahap']), ('s', F['batas']), ('k', None)]
    hasil = [dict(SAMPUL), {'jenis': 'daftar-isi'}]
    for k, v in urut:
        if k == 'b':
            hasil.append({'jenis': 'pembatas-seksi', 'bagian': v})
        elif k in ('r', 's'):
            hasil.append(dict(v))
        else:
            hasil.append(None)   # keputusan: diisi sesudah posisi slide diketahui
    j = [i for i, s in enumerate(hasil) if s is None][0]
    dasar = None
    hasil[j] = keputusan_slide(mode='lengkap')
    hasil.append({'jenis': 'pembatas-seksi', 'bagian': 8})
    kol3 = [{'nama': 'k1', 'kepala': 'No'}, {'nama': 'p1', 'kepala': 'Kasus sulit', 'rata': 'l', 'bobot': 2.4}, {'nama': 'k2', 'kepala': 'No'}, {'nama': 'p2', 'kepala': 'Kasus sulit', 'rata': 'l', 'bobot': 2.4},
            {'nama': 'k3', 'kepala': 'No'}, {'nama': 'p3', 'kepala': 'Kasus sulit', 'rata': 'l', 'bobot': 2.4}]
    ket = 'Kasus sulit adalah keadaan yang membuat dua petugas bisa menghitung berbeda untuk kejadian yang sama. Nomor mengikuti Lampiran A naskah kajian. Jumlah seluruhnya enam puluh lima kasus.'
    hasil.append({'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Daftar kasus sulit', 'kode': 'A1', 'judul_tanpa_kode': True,
                  'judul': 'Lampiran daftar kasus sulit penghitungan', 'judul_daftar': 'Daftar kasus sulit, bagian pertama', 'maks_baris': 13, 'keterangan': ket,
                  'data': {'csv': c_par2, 'kolom': kol3, 'keyakinan': 'terverifikasi', 'sumber': SKJ}})
    hasil.append({'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Daftar kasus sulit lanjutan', 'kode': 'A2', 'judul_tanpa_kode': True,
                  'judul': 'Lampiran daftar kasus sulit, bagian kedua', 'judul_daftar': 'Daftar kasus sulit, bagian kedua', 'maks_baris': 13, 'keterangan': ket,
                  'data': {'csv': c_par3, 'kolom': kol3[:4], 'keyakinan': 'terverifikasi', 'sumber': SKJ}})
    hasil.append(dict(PENUTUP))
    return hasil


# ---------- penulisan ----------
def tulis_angka(spek_list):
    teks = json.dumps(spek_list, ensure_ascii=False)
    dipakai = set(m.group(1).split('|')[0].strip() for m in re.finditer(r'\{\{angka:([^}]+)\}\}', teks))
    tidak_ada = dipakai - set(R.ANGKA)
    if tidak_ada:
        raise SystemExit(f'token angka tanpa entri registri: {sorted(tidak_ada)}')
    (AKAR / 'data' / 'angka.json').write_text(json.dumps({'angka': {k: v for k, v in R.ANGKA.items() if k in dipakai}}, ensure_ascii=False, indent=1), encoding='utf-8')


ARAH = ('Sesi arah 12 Nov 2026 dijawab "Ikut semua usulan": kepada Kepala BNPB, penyaji Alfatehan Septianta, dipaparkan, ringkas 10 slide isi dan lengkap sekitar 24, '
        'nada tegas, istilah Inggris seperti di dokumen, cut-off data 12 November 2026 di sumber, penutup Terima Kasih saja, PPTX dan PDF, logo BNPB dan KRIS.')
PESAN = 'Jumlah kejadian bencana lebih ditentukan oleh cara menghitung; aturan hitung tiga langkah membuatnya stabil dan dapat diperiksa, dan kajian meminta tiga keputusan.'


def spek(kajian, slide, nama, bagian=None):
    s = {'tanpa_alur': 'slide keputusan berbentuk tabel tiga baris agar pilihan A dan B terbaca utuh (naskah 05 subbab 5.5, 13 Nov 2026)', '_catatan': 'Dibangun dari spek/bangun_spek_hitung.py.', 'arah': ARAH, 'pesan_kunci': PESAN,
         'judul_dokumen': JUDUL, 'subjek_dokumen': 'Kajian BNPB, 12 November 2026', 'format': 'kajian', 'kajian': kajian,
         'tanggal': '2026-11-12', 'cut_off': '12 Nov 2026', 'slide': slide}
    if bagian:
        s['bagian'] = bagian
    (AKAR / 'spek' / nama).write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding='utf-8')
    print(nama, len(slide), 'slide')
    return s


ISI_R = [dict(RINGKASAN), S2, S3, S4, S5, S6, S8, S9, S7, keputusan_slide(('slide 5', 'slide 6', 'slide 11', 'slide 9', 'slide 10'))]
R_SLIDE = [dict(SAMPUL), {'jenis': 'daftar-isi'}] + ISI_R + [dict(PENUTUP)]
BAGIAN_R = [{'judul': 'Ringkasan', 'label': 'Ringkasan', 'halaman_tetap': [3]},
            {'judul': 'Pertanyaan Satu: Seberapa Besar Jumlah Berubah', 'label': 'Pertanyaan Satu', 'halaman_tetap': [4, 5]},
            {'judul': 'Pertanyaan Dua: Apakah Juklak Menyaring Setara', 'label': 'Pertanyaan Dua', 'halaman_tetap': [6, 7, 8]},
            {'judul': 'Pertanyaan Tiga: Apakah Aturan Baru Lebih Stabil', 'label': 'Pertanyaan Tiga', 'halaman_tetap': [9, 10]},
            {'judul': 'Usulan dan Keputusan', 'label': 'Usulan dan Keputusan', 'halaman_tetap': [11, 12]}]
spek('hitung-bencana-ringkas', R_SLIDE, 'hitung-bencana-ringkas-121126.json', BAGIAN_R)
L_SLIDE = susun_lengkap()
BAGIAN_L = [{'judul': 'Masalah dan Pertanyaan', 'label': 'Masalah'}, {'judul': 'Data dan Cara Menguji', 'label': 'Data'},
            {'judul': 'Hasil Satu: Cara Menghitung', 'label': 'Hasil satu'}, {'judul': 'Hasil Dua: Syarat dalam Juklak', 'label': 'Hasil dua'},
            {'judul': 'Hasil Tiga: Aturan Hitung Baru', 'label': 'Hasil tiga'}, {'judul': 'Aturan Hitung yang Diusulkan', 'label': 'Usulan'},
            {'judul': 'Kesimpulan dan Keputusan', 'label': 'Keputusan'}]
_p0 = 0
_n = -(-33 // 13)
BAGIAN_L.append({'judul': 'Lampiran', 'label': 'Lampiran'})
spek('hitung-bencana', L_SLIDE, 'hitung-bencana-121126.json', BAGIAN_L)
tulis_angka(R_SLIDE + L_SLIDE)
