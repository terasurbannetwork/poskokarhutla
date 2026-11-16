"""Spek dua deck "Kajian Penghitungan dan Klasifikasi Kejadian Bencana" (12 Nov 2026): lengkap dan ringkas (10 halaman isi).

Menulis: tema.json, kredit.json, pustaka.json, data/angka.json, data/hitung/*.csv, spek/hitung-bencana-121126.json,
spek/hitung-bencana-ringkas-121126.json. Bahan: repo poskokarhutla data/kajian-bnpb/hitung-bencana (naskah-ringkas, naskah,
mesin/gambar/*.json, analisis/hasil/*.json). Arah pemilik 12 Nov 2026 ("Ikut semua usulan"): riset/ARAH-DECK.md.
"""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import registri as R  # noqa: E402
from registri import AKAR, SDIBI, SLB, SHS, SKJ, SSIM, JUDUL, KREDIT, tulis_csv  # noqa: E402

R.tulis_tema()
R.tulis_pustaka()

# ---------- singkatan ----------
K_DIBI = 'DIBI adalah Data dan Informasi Bencana Indonesia.'
K_PUS = 'Pusdalops adalah Pusat Pengendalian Operasi.'
K_DDK = 'Cara mencocokkan menentukan laporan harian mana yang dihitung sebagai satu kejadian yang sama.'
K_CARA = 'Cara satu sampai lima adalah lima cara mencocokkan laporan harian yang sama menjadi satu kejadian: tanggal sama, kabupaten berbatasan digabung, jeda tujuh hari, kabupaten diabaikan, tanpa pencocokan.'
K_JUK = 'Juklak adalah petunjuk pelaksanaan.'
K_HS = 'Hotspot VIIRS adalah deteksi api oleh satelit, satu piksel setara sekitar {{angka:hs.piksel_ha}} hektare.'
NOMOR_ = 'Nomor induk kejadian adalah satu nomor dari Pusdatinkom untuk satu kejadian, dipakai bersama semua kabupaten yang terdampak.'
K_PDK = 'Pusdatinkom adalah Pusat Data, Informasi, dan Komunikasi Kebencanaan.'
K_BPBD = 'BPBD adalah Badan Penanggulangan Bencana Daerah.'
SRC_KJ = SKJ


def panel_ikon(judul, ikon, nada, baris, **kw):
    p = {'judul': judul, 'ikon': ikon, 'nada': nada,
         'daftar_ikon': {'mode': 'baris', 'baris': [{'ikon': i, 'judul': j, 'isi': t} for i, j, t in baris]}}
    p.update(kw)
    return p


# ---------- CSV ----------
c_gabung = tulis_csv('gabung.csv', ['jarak', 'j24', 'j72'], [
    ['Jarak setengah kilometer', 61138, 50039], ['Jarak satu kilometer (acuan)', 49088, 37953], ['Jarak dua kilometer', 38963, 27322]])
c_kunci = tulis_csv('kunci_logbook.csv', ['kunci', 'kejadian'], [
    ['Cara tiga: jeda tujuh hari', 2809], ['Cara empat: kabupaten diabaikan', 2913], ['Cara dua: kabupaten berbatasan', 3756], ['Cara satu: tanggal sama', 3860],
    ['Cara lima: tanpa pencocokan', 8715]])
c_penentu = tulis_csv('penentu.csv', ['kombinasi', 'persen'], [
    ['Hanya terdampak', 51.1], ['Terdampak dan rumah rusak', 23.1], ['Hanya rumah atau fasilitas rusak', 14.3], ['Hanya meninggal', 5.6],
    ['Ketiganya', 3.5], ['Meninggal dan terdampak', 1.7], ['Meninggal dan rumah rusak', 0.6]])
c_vonis_ringkas = tulis_csv('vonis_ringkas.csv', ['kriteria', 'vonis'], [
    ['Korban meninggal', 'Pertahankan, perjelas'], ['Orang terdampak', 'Revisi'], ['Rumah dan fasilitas rusak', 'Revisi'],
    ['Lahan terbakar', 'Ganti'], ['Permintaan bantuan nasional', 'Jadi penanda'], ['Status keadaan darurat', 'Jadi penanda']])
c_jenis = tulis_csv('lolos_jenis.csv', ['jenis', 'persen'], [
    ['Kekeringan', 94.6], ['Gelombang pasang dan abrasi', 81.0], ['Banjir', 76.6], ['Gempa bumi', 71.7], ['Cuaca ekstrem', 56.3],
    ['Kebakaran permukiman', 48.9], ['Erupsi gunung api', 42.9], ['Tanah longsor', 36.4], ['Karhutla', 1.4]])
c_konsen = tulis_csv('konsentrasi.csv', ['dampak', 'p1', 'p10'], [
    ['Rumah rusak', 92.8, 99.1], ['Meninggal', 85.5, 100.0], ['Terdampak, luka, mengungsi', 64.0, 96.6]])
c_l2 = tulis_csv('l2_tahun.csv', ['tahun', 'lama', 'usulan'], [['2024', 2556, 2285], ['2025', 3647, 3324], ['2026 (sampai 12 November)', 1332, 1226]])
c_selisih = tulis_csv('selisih_l2.csv', ['tahun', 'persen'], [['2024', 10.6], ['2025', 8.9], ['2026 (sampai 12 November)', 8.0]])
c_opsi = tulis_csv('kelas_opsi.csv', ['opsi', 'sedang', 'besar', 'katastrofik'], [
    ['Skala absolut', 3.3, 0.3, 0.1], ['Skala relatif', 10.4, 1.3, 0.5],
    ['Usulan', 4.0, 0.8, 0.1], ['Darurat (versi pertama)', 8.2, 38.6, 0.0]])
c_mkrit = tulis_csv('m_kriteria.csv', ['kode', 'bunyi'], [
    ['Korban', 'Ada korban meninggal atau hilang akibat langsung'], ['Terdampak', 'Lima puluh orang unik terdampak langsung'],
    ['Rumah', 'Lima unit rumah rusak berat atau setaranya'], ['Fasilitas', 'Satu fasilitas penting rusak'],
    ['Karhutla', 'Dua hektare terverifikasi, atau sepuluh hektare gagal panen (puso)'], ['SK darurat', 'SK tanggap darurat yang cocok dengan kejadian']])

# ---------- slide bersama ----------
SAMPUL = {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': 'foto/sampul-banjir.jpg', 'kredit': KREDIT,
          'logo_kanan': 'foto/berakhlak-hd.png', 'kota': 'Jakarta',
          'penyaji': {'nama': 'Alfatehan Septianta', 'jabatan': 'Staf Ahli BNPB, bersama Tim Ahli dan Tim Sus IT BNPB'},
          'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana'}
PENUTUP = {'jenis': 'penutup', 'foto': 'foto/sampul-banjir.jpg', 'logo_kanan': 'foto/berakhlak-hd.png', 'kredit': KREDIT, 'teks': 'Terima Kasih', 'laporan': JUDUL}

RINGKASAN = {
    'jenis': 'kartu-angka', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan eksekutif', 'cut_off': False,
    'sumber': 'Olahan kajian BNPB atas DIBI dan logbook Pusdalops serta hotspot VIIRS, data sampai 12 Nov 2026',
    'keterangan': f'{K_DIBI} {K_PUS} {K_DDK} {K_HS} Kasus sulit adalah keadaan yang membuat dua petugas menghitung berbeda untuk kejadian yang sama.',
    'judul': 'Jumlah kejadian bencana lebih ditentukan oleh cara menghitung daripada oleh kejadian di lapangan, sehingga kajian mengusulkan aturan hitung tiga langkah',
    'judul_panel': 'Temuan utama',
    'tesis': 'Aturan kita menetapkan kapan kejadian masuk hitungan, tetapi belum menetapkan apa yang dihitung sebagai satu kejadian dan seberapa besar.',
    'grup': [{'pil': 'Empat angka dari tiga sumber data', 'nada': 'data', 'ikon': 'data', 'kartu': [
        {'nilai': '{{angka:hs.kali|fmt=1|satuan}}', 'label': 'selisih kejadian karhutla', 'ikon': 'karhutla', 'warna': 'navy'},
        {'nilai': '{{angka:dibi.tunggal_p|fmt=0|satuan}}', 'label': 'lolos hanya karena terdampak', 'ikon': 'jiwa', 'warna': 'oranye'},
        {'nilai': '{{angka:lb.sel|fmt=0|satuan}}', 'label': 'selisih kejadian logbook', 'ikon': 'data', 'warna': 'navy'},
        {'nilai': '{{angka:dibi.konsen_1|fmt=1|satuan}}', 'label': 'korban dari catatan teratas', 'ikon': 'peringatan', 'warna': 'merah'}]}],
    'temuan': [
        {'kode': 'Temuan A.1', 'keyakinan': 'terverifikasi', 'ikon': 'data',
         'teks': '**Satu kejadian tidak punya definisi.** Satu gempa di {{angka:gempa.kab}} kabupaten tercatat {{angka:gempa.pecah|fmt=3}} kejadian di tiap kabupaten.'},
        {'kode': 'Temuan A.2', 'keyakinan': 'terverifikasi', 'ikon': 'regulasi',
         'teks': '**Satu kriteria memegang separuh hitungan.** Sebanyak {{angka:dibi.tunggal_p|fmt=1|satuan}} catatan DIBI yang lolos dalam setahun terakhir lolos hanya karena kriteria terdampak.'},
        {'kode': 'Temuan A.3', 'keyakinan': 'terverifikasi', 'ikon': 'peringatan',
         'teks': '**Ambang tidak bisa diterapkan setara.** Kekeringan lolos {{angka:dibi.kering_p|fmt=1|satuan}}, karhutla hanya {{angka:dibi.karhutla_p|fmt=1|satuan}}, terutama karena DIBI tidak menyimpan luas lahan dan status darurat.'},
        {'kode': 'Temuan C.1', 'keyakinan': 'terverifikasi', 'ikon': 'satu-data',
         'teks': '**Aturan hitung tiga langkah menjawabnya.** Sebanyak {{angka:uji.penuh}} dari {{angka:uji.par}} kasus sulit terjawab penuh dan tidak ada yang gagal.'}],
    'pita': {'label': 'Tiga keputusan dan satu batas kajian', 'nada': 'aksi', 'kolom': [
        {'ikon': 'ringkasan', 'judul': 'Satuan hitung', 'isi': 'Dua angka bernama: jumlah kejadian dan jumlah catatan kabupaten.'},
        {'ikon': 'regulasi', 'judul': 'Status darurat dan bantuan', 'isi': 'Penanda, kecuali surat keputusan (SK) darurat kejadian itu.'},
        {'ikon': 'peringatan', 'judul': 'Skala keparahan', 'isi': 'Kelas Ringan sampai Katastrofik sebagai klasifikasi data.'},
        {'ikon': 'data', 'judul': 'Batas kajian', 'isi': 'Wawancara belum dilakukan; batas syarat dan kelas perlu disesuaikan.'}]},
    '_bicara': ('Kajian ini menjawab pertanyaan yang paling sering diajukan pimpinan, yaitu berapa jumlah kejadian bencana. Jawabannya ternyata lebih ditentukan oleh cara menghitung, '
                'karena Juklak 7/2023 hanya mengatur kapan kejadian masuk hitungan, bukan apa yang dihitung sebagai satu kejadian. '
                'Empat angka di slide ini menunjukkan akibatnya, dan di akhir paparan kami meminta tiga keputusan.')}

# ================= DECK RINGKAS (10 halaman isi) =================
S2 = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Cara menggabungkan hotspot', 'cut_off': False, 'rasio': 0.58,
    'sumber': SHS, 'keterangan': f'{K_HS} Jendela adalah selang waktu penggabungan dua deteksi.',
    'judul': 'Aturan menggabungkan hotspot saja mengubah jumlah kejadian karhutla {{angka:hs.kali|fmt=1|satuan}} dari data hotspot yang sama',
    'utama': {'judul': 'Jumlah kejadian karhutla menurut cara menggabungkan hotspot', 'ikon': 'karhutla', 'subjudul_grafik': 'Kejadian, 15 Oktober sampai 11 November 2026',
              's3_baris_kelompok': {'data': {'csv': c_gabung, 'kolom': [{'nama': 'jarak'}, {'nama': 'j24', 'kepala': 'Jendela satu hari', 'fmt': '0'},
                                                                      {'nama': 'j72', 'kepala': 'Jendela tiga hari', 'fmt': '0'}],
                                    'keyakinan': 'terverifikasi', 'sumber': SHS}}},
    'panel': panel_ikon('Dua api menyatu di Kapuas', 'karhutla', 'api', [
        ('karhutla', 'Dua kelompok', '{{angka:hs.kapuas.a}} dan {{angka:hs.kapuas.b}} piksel, berjarak {{angka:hs.kapuas.jarak|fmt=1|satuan}}.'),
        ('luas', 'Menyatu', 'Dalam beberapa hari keduanya menjadi satu kebakaran {{angka:hs.kapuas.gabung}} piksel.'),
        ('peringatan', 'Tanpa jawaban', 'Satu kejadian atau dua, dan sejak kapan, tidak diatur aturan mana pun.'),
        ('data', 'Pengaruh kecil', 'Hanya {{angka:hs.gabung_p|fmt=2|satuan}} kejadian berupa api yang menyatu; jarak lebih berpengaruh.')]),
    '_bicara': ('Kami menghitung kejadian karhutla dari deteksi hotspot satelit selama dua puluh delapan hari. Dua deteksi dianggap satu kejadian bila cukup dekat '
                'dalam jarak dan waktu. Dengan jarak dan jendela waktu berbeda, data yang sama menghasilkan 27.322 sampai 61.138 kejadian, selisih 2,2 kali lipat. '
                'Tidak ada angka yang benar sendiri; angka hanya bisa dibandingkan bila cara menggabungkannya sama.')}

S3 = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Cara mencocokkan logbook', 'cut_off': False, 'rasio': 0.56,
    'sumber': SLB, 'keterangan': f'{K_PUS} {K_CARA}',
    'judul': 'Cara mencocokkan laporan harian saja menggeser jumlah kejadian logbook {{angka:lb.sel|satuan}}, dan tanpa pencocokan jumlahnya lebih dari dua kali lipat',
    'grafik': {'judul_panel': 'Jumlah kejadian logbook menurut cara mencocokkan', 'ikon': 'data', 'judul': '**Kejadian mentah**, Jan sampai Okt 2026',
               'keluarga': 'netral', 'arah': 'horizontal', 'seragam': False, 'pembanding': False, 'ubah': False, 'persen_batang': False,
               'sorot': ['Cara tiga: jeda tujuh hari'],
               'data': {'csv': c_kunci, 'kolom': [{'nama': 'kunci'}, {'nama': 'kejadian', 'fmt': '0'}], 'keyakinan': 'terverifikasi', 'sumber': SLB}},
    'panel': panel_ikon('Mengapa angka logbook mudah menyesatkan', 'peringatan', 'bahaya', [
        ('data', 'Cara menentukan', 'Laporan harian yang sama dapat jadi kejadian baru, tergantung cara mencocokkan.'),
        ('peringatan', 'Angka kumulatif', 'Dijumlah: {{angka:lb.kumulatif}}; terbesar: {{angka:lb.terbesar}}; laporan terakhir (aturan usulan): {{angka:lb.terakhir}} korban meninggal.'),
        ('kalender', 'Laporan berubah', 'Dari {{angka:lb.lolos_akhir}} kejadian lolos (semua tanggal logbook), {{angka:lb.susulan}} belum lolos di laporan pertama.'),
        ('ringkasan', 'Setelah ambang', 'Jumlah yang lolos hanya berubah {{angka:lb.sel_lolos|satuan}} antar-cara mencocokkan.')]),
    '_bicara': ('Logbook Pusdalops menghasilkan 2.809 kejadian dengan satu cara pencocokan, 3.860 dengan cara lain, dan 8.715 bila laporan harian tidak dicocokkan sama sekali. '
                'Selisih antar-cara mencocokkan 27 persen. Masalah kedua, logbook menulis angka kumulatif; bila semua baris harian dijumlah, korban meninggal menjadi 12.523 korban meninggal; bila tiap kejadian diambil angka terbesarnya lalu dijumlah untuk semua kejadian, totalnya 609 korban meninggal. Aturan usulan memakai nilai laporan terakhir per kejadian, yaitu 565 korban meninggal.')}

S4 = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Penentu tunggal dan vonis kriteria', 'cut_off': False, 'rasio': 0.5,
    'sumber': SDIBI, 'keterangan': f'{K_DIBI} {K_JUK} Satu-satunya alasan lolos berarti hanya kriteria itu yang terpenuhi. Cara menggabungkan keenam kriteria, yaitu cukup salah satu terpenuhi, dinilai Pertahankan. Penanda tidak berlaku bagi SK tanggap darurat yang menyebut kejadian itu.',
    'judul': 'Separuh catatan DIBI yang lolos setahun terakhir lolos hanya karena kriteria {{angka:juk.terdampak}} orang terdampak, kriteria yang istilahnya paling kabur',
    'grafik': {'judul_panel': 'Kombinasi kriteria yang meloloskan catatan', 'ikon': 'regulasi', 'judul': '**Persen catatan lolos**, setahun terakhir',
               'keluarga': 'netral', 'arah': 'horizontal', 'seragam': False, 'pembanding': False, 'ubah': False, 'persen_batang': False,
               'sorot': ['Hanya terdampak'],
               'data': {'csv': c_penentu, 'kolom': [{'nama': 'kombinasi'}, {'nama': 'persen', 'fmt': '1'}], 'keyakinan': 'terverifikasi', 'sumber': SDIBI}},
    'panel': {'judul': 'Penilaian enam kriteria Juklak', 'ikon': 'ringkasan', 'peringkat': False, 'skala_huruf': 1.3, 'baris_maks_pt': 52,
              'data': {'csv': c_vonis_ringkas, 'kolom': [{'nama': 'kriteria', 'kepala': 'Kriteria', 'rata': 'l', 'bobot': 1.5}, {'nama': 'vonis', 'kepala': 'Penilaian', 'rata': 'l', 'bobot': 1.0}],
                       'keyakinan': 'terverifikasi', 'sumber': SDIBI}},
    '_bicara': ('Sebuah kejadian masuk hitungan bila memenuhi satu dari enam kriteria. Dari 1.903 catatan DIBI yang lolos, 973 baris atau 51,1 persen lolos hanya karena kriteria 50 orang terdampak. '
                'Kriteria itu pula yang paling kabur, karena Juklak 7/2023 dan Juklak 3/2022 memakai dua definisi berbeda. Tabel di kanan memuat vonis kajian untuk tiap kriteria.')}

S5 = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Ambang sama, hasil berbeda per jenis', 'cut_off': False, 'rasio': 0.58,
    'sumber': SDIBI, 'keterangan': f'{K_DIBI} Karhutla diduga rendah karena DIBI tidak memiliki kolom luas lahan dan status darurat.',
    'judul': 'Ambang yang sama meloloskan {{angka:dibi.kering_p|fmt=1|satuan}} catatan kekeringan tetapi hanya {{angka:dibi.karhutla_p|fmt=1|satuan}} catatan karhutla',
    'utama': {'judul': 'Persen catatan DIBI yang lolos ambang, menurut jenis bencana', 'ikon': 'wilayah',
              'lollipop': {'sorot': 'Karhutla', 'satuan': 'Persen catatan, setahun sampai 12 November 2026', 'skala_huruf': 1.05,
                           'data': {'csv': c_jenis, 'kolom': [{'nama': 'jenis'}, {'nama': 'persen', 'fmt': '1'}], 'keyakinan': 'terverifikasi', 'sumber': SDIBI}}},
    'panel': panel_ikon('Mengapa karhutla nyaris tidak lolos', 'karhutla', 'api', [
        ('luas', 'Sebab utama', 'Terutama karena DIBI tidak menyimpan luas lahan dan status darurat.'),
        ('lembaga', 'Tidak dapat diperiksa', 'Karhutla mungkin masuk lewat kriteria yang tidak tampak bagi pembaca data.'),
        ('data', 'Dasar catatan', 'Contoh: {{angka:dibi.kering_n}} catatan kekeringan dan {{angka:dibi.karhutla_n}} catatan karhutla dalam setahun terakhir.')]),
    '_bicara': ('Satu set ambang menyaring dengan kekuatan yang sangat berbeda antarjenis bencana. Dari 129 catatan kekeringan, 94,6 persen lolos, sedangkan dari 1.208 catatan karhutla hanya 1,4 persen. '
                'Karhutla kemungkinan masuk lewat kriteria luas dan status darurat, tetapi DIBI tidak mencatatnya, sehingga pembaca tidak bisa memeriksa alasannya.')}

S6 = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Long tail dampak', 'cut_off': False, 'rasio': 0.56,
    'sumber': SDIBI, 'keterangan': f'{K_DIBI} Satu baris adalah satu hari di satu kabupaten untuk satu jenis bencana. Long tail adalah sebaran dengan sedikit kejadian memikul hampir seluruh dampak. Jumlah resmi DIBI Januari sampai Oktober naik jauh lebih tinggi daripada kejadian yang lolos kriteria Juklak, yang naik {{{{angka:tren.lolos|satuan}}}}.',
    'judul': 'Satu persen catatan DIBI memikul {{angka:dibi.konsen_1|fmt=1|satuan}} korban meninggal, jadi jumlah kejadian bukan ukuran besar',
    'utama': {'judul': 'Porsi dampak yang dipikul catatan teratas', 'ikon': 'jiwa', 'subjudul_grafik': 'Persen dari total, setahun sampai 12 November 2026',
              's3_baris_kelompok': {'data': {'csv': c_konsen, 'kolom': [{'nama': 'dampak'}, {'nama': 'p1', 'kepala': 'Satu persen catatan teratas', 'fmt': '1'},
                                                                      {'nama': 'p10', 'kepala': 'Sepuluh persen catatan teratas', 'fmt': '1'}],
                                    'keyakinan': 'terverifikasi', 'sumber': SDIBI}}},
    'panel': panel_ikon('Kejadian kecil dan besar terhitung sama', 'peringatan', 'bahaya', [
        ('jiwa', 'Banjir Aceh Utara', '28 November 2025: {{angka:aceh.mati}} meninggal, {{angka:aceh.terdampak}} terdampak, {{angka:aceh.rumah}} rumah rusak.'),
        ('data', 'Terhitung sama', 'Kejadian dengan satu korban meninggal juga terhitung satu kejadian di DIBI.'),
        ('peringatan', 'Sebagian besar kosong', '{{angka:dibi.tanpa_mati_p|fmt=1|satuan}} catatan tidak memuat korban meninggal sama sekali.'),
        ('naik', 'Tren menyesatkan', 'Jumlah resmi naik {{angka:tren.naik|satuan}} pada 2025, sebagian besar karena catatan kecil.')]),
    '_bicara': ('Cukup salah satu kriteria memberi bobot sama pada satu kejadian dengan satu orang meninggal dan banjir Aceh Utara 28 November 2025 yang memuat 246 meninggal. '
                'Keduanya terhitung satu kejadian. Satu persen catatan teratas memikul 85,5 persen korban meninggal, dan 94,8 persen catatan tidak memuat korban meninggal sama sekali.')}

S7 = {
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'pesan': 'Aturan hitung tiga langkah', 'cut_off': False, 'rasio': 0.68,
    'sumber': SKJ, 'keterangan': f'{K_DIBI} SK adalah surat keputusan. {NOMOR_} Batas syarat dan kelas perlu disesuaikan.',
    'judul': 'Aturan hitung {{angka:lapis}} langkah menentukan satu kejadian lalu syarat masuk dan kelasnya, ditopang dua aturan pendukung untuk angka korban dan penyajian',
    'utama': {'judul': 'Tiga langkah dan dua aturan pendukung', 'ikon': 'satu-data',
              'alur': {'skala_huruf': 1.3, 'sorot': 0, 'label_hasil': 'Hasil', 'langkah': [
                  {'judul': 'Satu kejadian', 'pelaku': 'Yang dihitung', 'butir': ['Satu nomor induk per kejadian.', 'Kabupaten tetap punya catatan.', 'Ada aturan penggabungan.'], 'hasil': 'Satu nomor induk.'},
                  {'judul': 'Syarat masuk', 'pelaku': 'Masuk atau tidak', 'butir': ['Ada enam syarat tertulis.', 'Alasan masuk dicatat.', 'Kejadian kecil tetap disimpan.'], 'hasil': 'Masuk atau di bawah ambang.'},
                  {'judul': 'Kelas keparahan', 'pelaku': 'Besar kejadian', 'butir': ['Ada empat kelas.', 'Ringan sampai Katastrofik.', 'Kabupaten kecil bisa naik.'], 'hasil': 'Satu kelas.'},
                  {'judul': 'Angka korban', 'pelaku': 'Aturan pendukung', 'butir': ['Satu orang satu kategori.', 'Angka antarhari tidak dijumlah.', 'Nol beda dari belum didata.'], 'hasil': 'Angka sah.'},
                  {'judul': 'Penyajian', 'pelaku': 'Aturan pendukung', 'butir': ['Jumlah tampil bersama dampak.', 'Tren ditandai bila cara berubah.', 'Rilis diberi nomor versi.'], 'hasil': 'Tabel dan tren.'}]}},
    'panel': {'judul': 'Syarat masuk hitungan', 'ikon': 'regulasi', 'peringkat': False, 'sel_dua_baris': True, 'sel_maks_baris': 3, 'skala_huruf': 1.2, 'baris_maks_pt': 52,
              'data': {'csv': c_mkrit, 'kolom': [{'nama': 'kode', 'kepala': 'Syarat', 'bobot': 0.9}, {'nama': 'bunyi', 'kepala': 'Bunyi', 'rata': 'l', 'bobot': 2.4}],
                       'keyakinan': 'asumsi-kebijakan', 'sumber': SKJ}},
    '_bicara': ('Aturan hitung usulan memisahkan tiga pertanyaan yang selama ini dibebankan pada enam kriteria. Langkah satu menjawab apa yang dihitung sebagai satu kejadian, langkah dua menjawab kapan kejadian masuk hitungan, '
                'langkah tiga menjawab seberapa besar kejadian itu. Dua aturan pendukung mengatur angka korban dan cara menyajikannya. Urutan kerjanya: kejadian dibentuk lebih dulu, angka korban ditetapkan, baru syarat masuk dan kelas dinilai.')}

S8 = {
    'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Aturan usulan lawan aturan Juklak', 'cut_off': False, 'rasio': 0.6,
    'sumber': 'DIBI dan logbook Pusdalops; simulasi kajian BNPB, 12 Nov 2026', 'keterangan': f'{K_DIBI} Kriteria luas dan SK tanggap darurat tidak terukur di DIBI, jadi hasil ini batas bawah. Kejadian yang lolos kriteria Juklak naik {{{{angka:tren.lolos|satuan}}}} dari 2024 ke 2025, jauh di bawah kenaikan jumlah resmi DIBI.',
    'judul': 'Aturan usulan meloloskan {{angka:l2.selisih|fmt=1|satuan}} lebih sedikit kejadian dan membuat hasil tahan terhadap cara mencocokkan laporan',
    'utama': {'judul': 'Kejadian yang masuk hitungan menurut Juklak dan aturan usulan', 'ikon': 'ringkasan',
              's3_baris_kelompok': {'data': {'csv': c_l2, 'kolom': [{'nama': 'tahun'}, {'nama': 'lama', 'kepala': 'Aturan Juklak', 'fmt': '0'}, {'nama': 'usulan', 'kepala': 'Aturan usulan', 'fmt': '0'}],
                                               'keyakinan': 'terverifikasi', 'sumber': SSIM}}},
    'panel': {'judul': 'Tahan terhadap cara mencocokkan', 'ikon': 'data', 'nada': 'netral',
              'angka_besar': {'mode': 'kartu', 'kartu': [
                  {'nilai': '{{angka:lb.sel|fmt=0|satuan}}', 'label': 'Selisih jumlah mentah', 'ket': 'Logbook 2026, sebelum syarat masuk.', 'ikon': 'peringatan'},
                  {'nilai': '{{angka:lb.sel_lolos|fmt=0|satuan}}', 'label': 'Selisih kejadian yang lolos', 'ket': 'Sesudah ambang usulan diterapkan.', 'ikon': 'ringkasan'},
                  {'nilai': '{{angka:l2.selisih|fmt=1|satuan}}', 'label': 'Kejadian lebih sedikit', 'ket': 'Aturan usulan lawan Juklak pada data DIBI.', 'ikon': 'naik'}]}},
    '_bicara': ('Pada data DIBI, kejadian nasional dibentuk dari baris yang berpecahan, lalu diuji dengan ambang lama dan ambang usulan. Ambang usulan meloloskan 6.835 kejadian dibanding 7.535, atau 9,3 persen lebih sedikit. '
                'Yang gugur hampir semuanya lolos hanya karena rumah atau fasilitas rusak ringan. Pada logbook, pilihan cara mencocokkan mengubah jumlah mentah 27 persen, tetapi setelah ambang hanya 3 persen.')}

S9 = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Pilihan skala keparahan', 'cut_off': False, 'rasio': 0.58,
    'sumber': 'DIBI, status darurat BNPB, penduduk WorldPop; simulasi kajian BNPB', 'keterangan': f'{K_DIBI} Skala absolut memakai angka dampak tetap; skala relatif membaginya dengan jumlah penduduk kabupaten. Simulasi versi pertama adalah hitungan awal atas {{{{angka:kelas.n_v1}}}} kejadian, sebelum aturan disempurnakan menjadi versi akhir atas {{{{angka:l2.usulan}}}} kejadian; skala relatif dan status darurat memakai versi pertama. Label dibulatkan per kelas.',
    'judul': 'Skala usulan menjadikan hanya {{angka:kelas.u_n}} kejadian ({{angka:kelas.u_atas|fmt=1|satuan}}) berkelas Besar atau Katastrofik, sehingga dapat diperiksa satu per satu',
    'utama': {'judul': 'Persen kejadian di kelas Sedang ke atas menurut pilihan skala', 'ikon': 'peringatan',
              'tumpuk': {'skala_huruf': 1.4, 'warna': ['skala.air.3', 'oranye', 'merah'],
                         'data': {'csv': c_opsi, 'kolom': [{'nama': 'opsi'}, {'nama': 'sedang', 'kepala': 'Sedang', 'fmt': '1|persen'}, {'nama': 'besar', 'kepala': 'Besar', 'fmt': '1|persen'},
                                                           {'nama': 'katastrofik', 'kepala': 'Katastrofik', 'fmt': '1|persen'}],
                                  'keyakinan': 'terverifikasi', 'sumber': SSIM}}},
    'panel': panel_ikon('Mengapa usulan memilih skala absolut', 'regulasi', 'air', [
        ('regulasi', 'Kenaikan kelas', 'Usulan menaikkan satu kelas bagi kabupaten kecil: {{angka:kelas.naik_n}} kejadian, {{angka:kelas.berubah|fmt=1|satuan}}.'),
        ('data', 'Indeks gabungan ditolak', 'Sama dengan skala absolut pada {{angka:kelas.idx_sama|fmt=1|satuan}} kejadian, tetapi bobotnya harus dibela.'),
        ('peringatan', 'Status darurat menyesatkan', 'Cocok dengan skala dampak hanya pada {{angka:kelas.cocok_c|fmt=1|satuan}} kejadian.'),
        ('naik', 'Besar dan Katastrofik', 'Skala absolut: {{angka:kelas.a_n}} kejadian ({{angka:kelas.a_atas|fmt=1|satuan}}); usulan: {{angka:kelas.u_n}} kejadian ({{angka:kelas.u_atas|fmt=1|satuan}}).')]),
    '_bicara': ('Empat cara memberi kelas dibandingkan. Skala absolut sederhana dan mudah diperiksa; indeks gabungan memberi hasil yang sama tetapi bobotnya harus dibela. '
                'Skala yang mengikuti status darurat, hanya cocok dengan skala absolut pada 52,7 persen kejadian dan menjadikan 38,6 persen kejadian berkelas Besar. '
                'Karena itu usulan memakai skala absolut dengan kenaikan kelas.')}


def keputusan_slide(dasar=None, mode='ringkas'):
    c_k = tulis_csv('keputusan.csv', ['keputusan', 'a', 'b', 'akibat'], [
        ['Satuan hitung kejadian', 'Dua angka: kejadian nasional dan catatan kabupaten', 'Hanya per kabupaten',
         'A: pecahan hilang, tetapi laporan lama dihitung ulang. B: sederhana, tetapi satu gempa terbaca sebelas kejadian.'],
        ['Status darurat dan permintaan bantuan', 'Penanda, kecuali SK darurat yang menyebut kejadian itu: tetap syarat', 'Tetap menjadi syarat masuk hitungan',
         'A: jumlah tak bergantung kemauan daerah. B: tanpa perubahan bagi BPBD, tetapi jumlah bergantung kapasitas daerah.'],
        ['Kelas keparahan', 'Kelas Ringan sampai Katastrofik dari dampak', 'Tanpa kelas keparahan',
         'A: ada ukuran besar-kecil yang bisa diperiksa. B: jumlah kejadian tetap dibaca sebagai ukuran besar.']])
    return {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Keputusan yang diminta', 'cut_off': False, 'rasio': 1.0,
            'sumber': SKJ, 'keterangan': f'{K_JUK} Pilihan A adalah rekomendasi kajian dan pilihan B adalah alternatifnya. Uji coba berjalan satu musim di tiga provinsi yang tipe bencananya berbeda; aturan lama dan baru berjalan berdampingan. Kelas keparahan tidak menggantikan penetapan status oleh kepala daerah atau Presiden.',
            'judul': 'Pimpinan diminta memilih {{angka:keputusan}} hal sebelum uji coba di {{angka:provinsi.uji}} provinsi, dan kajian merekomendasikan pilihan A',
            'tabel': {'judul_panel': 'Tiga keputusan, pilihan A (rekomendasi) dan pilihan B (alternatif), beserta akibatnya', 'ikon': 'regulasi', 'peringkat': True, 'sel_dua_baris': True,
                      'sel_maks_baris': 3, 'skala_huruf': 1.15, 'baris_maks_pt': 100,
                      'data': {'csv': c_k, 'kolom': [{'nama': 'keputusan', 'kepala': 'Keputusan', 'rata': 'l', 'bobot': 1.1}, {'nama': 'a', 'kepala': 'Pilihan A, rekomendasi', 'rata': 'l', 'bobot': 1.6},
                                                     {'nama': 'b', 'kepala': 'Pilihan B', 'rata': 'l', 'bobot': 1.0}, {'nama': 'akibat', 'kepala': 'Akibat', 'rata': 'l', 'bobot': 2.4}],
                               'keyakinan': 'asumsi-kebijakan', 'sumber': SKJ}},
            'pita': ({'label': 'Batas kajian', 'nada': 'data', 'kolom': [
                {'ikon': 'jiwa', 'judul': 'Wawancara', 'isi': 'Pencatat belum diwawancarai.'},
                {'ikon': 'peringatan', 'judul': 'Batas syarat dan kelas', 'isi': 'Perlu disesuaikan dengan data respons.'},
                {'ikon': 'data', 'judul': 'Data DIBI', 'isi': 'Dari dasbor publik, dapat dikoreksi susulan.'}]} if mode == 'ringkas' else
                {'label': 'Sebelum memilih', 'nada': 'data', 'kolom': [
                {'ikon': 'ringkasan', 'judul': 'Pilihan A', 'isi': 'Rekomendasi kajian untuk ketiga keputusan.'},
                {'ikon': 'peringatan', 'judul': 'Batas kajian', 'isi': 'Dibahas pada slide batas kajian.'},
                {'ikon': 'regulasi', 'judul': 'Status darurat', 'isi': 'Tetap ditetapkan kepala daerah atau Presiden.'}]}),
            '_bicara': ('Kami meminta tiga keputusan, dan kajian merekomendasikan pilihan A pada ketiganya. Pertama, satuan hitung: dua angka bernama, jumlah kejadian nasional dan jumlah catatan kabupaten, atau hanya per kabupaten. '
                        'Kedua, apakah status darurat dan permintaan bantuan menjadi penanda atau tetap menjadi syarat masuk hitungan. Ketiga, apakah kelas keparahan diterapkan sebagai klasifikasi data. '
                        'Ketiganya harus dijawab sebelum uji coba di tiga provinsi selama satu musim, disusul perubahan Juklak. Kelas ini tidak menggantikan penetapan status oleh kepala daerah atau Presiden. '
                        'Wawancara belum dilakukan, batas syarat dan kelas perlu disesuaikan, dan data DIBI diambil dari dasbor publik.')}


def ringkasan_ringkas():
    r = dict(RINGKASAN)
    return r




exec(compile((Path(__file__).resolve().parent / "lengkap.py").read_text(encoding="utf-8"), "lengkap.py", "exec"))
