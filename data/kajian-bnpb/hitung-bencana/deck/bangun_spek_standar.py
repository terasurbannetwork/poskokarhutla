"""Spek deck "Standar Penghitungan dan Klasifikasi Kejadian Bencana" (13 Nov 2026): 10 slide isi + 1 lampiran.

Sumber isi tunggal: repo poskokarhutla data/kajian-bnpb/hitung-bencana/standar/*.md (00-pengantar Tabel 0.1, Bab 2 sampai 5, 7, 10, 12).
Arah pemilik 12 Nov 2026 ("Ikut semua usulan") dipakai ulang. Menulis (menggabung, tidak menimpa deck lain): tema.json (entri
standar-hitung-bencana), pustaka.json (id standar), data/angka.json (union), data/hitung/std_*.csv, spek/standar-hitung-131126.json.
"""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import registri as R  # noqa: E402
from registri import AKAR, SDIBI, SLB, SKJ, SSIM, tulis_csv, a, db, lb, sm  # noqa: E402

# Akar sendiri: sesi lain membangun ulang deck lama di akar proyek-hitung-bencana dan menimpa data/angka.json tiap putaran.
import shutil  # noqa: E402
AKAR2 = AKAR.parent / 'proyek-hitung-bencana-standar'
for sub in ('foto', 'logo'):
    if not (AKAR2 / sub).exists():
        shutil.copytree(AKAR / sub, AKAR2 / sub)
(AKAR2 / 'data' / 'hitung').mkdir(parents=True, exist_ok=True)
shutil.copy(AKAR / 'data' / 'hitung' / 'l2_tahun.csv', AKAR2 / 'data' / 'hitung' / 'l2_tahun.csv')
shutil.copy(AKAR / 'kredit.json', AKAR2 / 'kredit.json')
shutil.copy(AKAR / 'pustaka.json', AKAR2 / 'pustaka.json')
R.D = AKAR2 / 'data' / 'hitung'

SKS = 'Standar Penghitungan dan Klasifikasi Kejadian Bencana, BNPB, 13 November 2026'
JUDUL = 'Standar Penghitungan dan Klasifikasi Kejadian Bencana'
KUNCI = 'standar-hitung-bencana'


def st(nilai, satuan, kyk='asumsi-kebijakan'):
    return a(nilai, satuan, 'kajian', SKS, kyk)


# ---------- tema dan pustaka (gabung) ----------
tema = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
dasar = dict(tema['kajian']['hitung-bencana'])
dasar.update(judul=JUDUL, judul_pendek='Standar Penghitungan Kejadian Bencana',
             subjudul='Apa yang dihitung sebagai satu kejadian dan seberapa besar kejadian itu',
             cakupan_sampul='DIBI, logbook Pusdalops, dan hotspot VIIRS, 2024 sampai 12 November 2026',
             nama_berkas='Deck Standar Penghitungan dan Klasifikasi Kejadian Bencana {DDMMYY}')
tema['kajian'][KUNCI] = dasar
(AKAR2 / 'tema.json').write_text(json.dumps(tema, ensure_ascii=False, indent=1), encoding='utf-8')

# ---------- angka baru ----------
BARU = {
    'std.satu': st(1, 'kejadian', 'terverifikasi'),
    'syarat': st(6, 'syarat'), 'std.ket': st(45, 'ketetapan'), 'gabung.gambut': st(14, 'hari'),
    'std.nomor': st(7, 'hari kerja'), 'std.keberatan': st(14, 'hari'), 'std.putus': st(14, 'hari'),
    'std.sampel': st(5, 'persen'), 'std.selisih': st(10, 'persen'), 'std.tenggang': st(3, 'hari'),
    'std.fasilitas': st(1, 'fasilitas'), 'std.sk': st(1, 'SK'), 'std.kenaikan': st(10, 'persen'),
    'std.lantai1': st(100, 'orang'), 'std.lantai2': st(1000, 'orang'), 'std.hilang': st(30, 'hari'),
    'hs.min': a(27322, 'kejadian', 'hotspot', 'Simulasi kajian atas hotspot VIIRS, 15 Oktober sampai 11 November 2026', 'terverifikasi'),
    'hs.maks': a(61138, 'kejadian', 'hotspot', 'Simulasi kajian atas hotspot VIIRS, 15 Oktober sampai 11 November 2026', 'terverifikasi'),
    'gempa.mati': db(151, 'jiwa'), 'gempa.ungsi': db(171271, 'jiwa'), 'gempa.rumah': a(63425, 'rumah', 'dibi', SDIBI + '; bobot Ketentuan 5.5 standar', 'terverifikasi'),
    'gempa.mag': a(7.7, 'magnitudo', 'dibi', 'Katalog EMSC, dikutip standar Bab 10, 12 November 2026', 'terverifikasi'),
    'cianjur.mag': a(5.6, 'magnitudo', 'dibi', 'BMKG dan DIBI, gempa Cianjur 21 November 2022, dikutip standar Bab 4', 'terverifikasi'),
    'kelas.r': sm(95.1, 'persen'), 'kelas.s': sm(4.0, 'persen'), 'kelas.b': sm(0.8, 'persen'), 'kelas.k': sm(0.1, 'persen'),
    'uji.adv_standar': sm(26, 'kasus'),
    'lb.kumul2': lb(12523, 'jiwa'), 'lb.sel_juk': lb(7, 'persen'), 'lb.j1': lb(865, 'kejadian'), 'lb.j2': lb(924, 'kejadian'), 'lb.s1': lb(745, 'kejadian'), 'lb.s2': lb(768, 'kejadian'), 'cj.rumah': db(28712, 'rumah'),
}
R.ANGKA.update(BARU)
PAKAI = {}


def ang(k):
    PAKAI[k] = R.ANGKA[k]
    return R.ANGKA[k]


SP = 'Standar Kejadian Bencana, BNPB, 13 Nov 2026'
K_DIBI = 'DIBI adalah Data dan Informasi Bencana Indonesia.'
K_JUK = 'Juklak adalah petunjuk pelaksanaan.'
K_PDK = 'Pusdatinkom adalah Pusat Data, Informasi, dan Komunikasi Kebencanaan BNPB.'
K_BPBD = 'BPBD adalah Badan Penanggulangan Bencana Daerah.'
K_SK = 'SK adalah surat keputusan.'
K_PUS = 'Pusdalops adalah Pusat Pengendalian Operasi BNPB.'


def pi(judul, ikon, nada, baris, **kw):
    p = {'judul': judul, 'ikon': ikon, 'nada': nada,
         'daftar_ikon': {'mode': 'baris', 'baris': [{'ikon': i, 'judul': j, 'isi': t} for i, j, t in baris]}}
    p.update(kw)
    return p


# ---------- CSV ----------
c_gabung = tulis_csv('std_gabung.csv', ['jenis', 'gabung', 'baru', 'selesai'], [
    ['Banjir', 'Kabupaten sama, laporan aktif terakhir kurang dari tujuh hari', 'Jeda tujuh hari tanpa laporan aktif',
     'Genangan surut dan tujuh hari tanpa laporan aktif'],
    ['Karhutla', 'Deteksi berurutan, tiap deteksi dekat dari sebelumnya, selisih waktu dua hari', 'Jeda tujuh hari tanpa deteksi dan tanpa laporan aktif',
     'Tujuh hari tanpa deteksi, paling lama tiga puluh hari'],
    ['Karhutla di gambut', 'Aturan sama dengan karhutla lahan mineral', 'Jeda empat belas hari, karena bara dapat menyala lagi',
     'Empat belas hari tanpa deteksi dan tanpa laporan aktif'],
    ['Gempa bumi', 'Gempa utama dan susulan dalam tiga puluh hari di zona sama', 'Gempa baru yang sama kuat atau lebih kuat dan merusak wilayah lain',
     'Tiga puluh hari tanpa susulan merusak, paling lama sembilan puluh hari'],
    ['Erupsi gunung api', 'Satu gunung dalam satu periode status', 'Periode baru setelah empat belas hari di status Waspada atau Normal',
     'Empat belas hari di status Waspada atau Normal'],
    ['Kekeringan', 'Satu zona musim BMKG dalam satu periode kemarau', 'Periode kemarau berikutnya',
     'Kemarau zona berakhir atau SK status berakhir'],
])
c_kelas = tulis_csv('std_kelas.csv', ['kelas', 'mati', 'ungsi', 'rumah', 'luas'], [
    ['Katastrofik', '1.000 atau lebih', '100.000 atau lebih', '10.000 atau lebih', '100.000 atau lebih'],
    ['Besar', '100 sampai 999', '10.000 sampai 99.999', '1.000 sampai 9.999', '10.000 sampai 99.999'],
    ['Sedang', '10 sampai 99', '1.000 sampai 9.999', '100 sampai 999', '1.000 sampai 9.999'],
    ['Ringan', 'Di bawah batas Sedang', 'Di bawah batas Sedang', 'Di bawah batas Sedang', 'Di bawah batas Sedang'],
])
c_tahun = tulis_csv('std_tahun.csv', ['tahun', 'lama', 'usulan'], [['2024', 2556, 2285], ['2025', 3647, 3324], ['2026*', 1332, 1226]])
c_gabung_k = tulis_csv('std_gabung_karhutla.csv', ['jarak', 'j24', 'j72'], [['Jarak 0,5 km', 61138, 50039], ['Jarak 1 km', 49088, 37953], ['Jarak 2 km', 38963, 27322]])
c_alur = tulis_csv('std_alur.csv', ['langkah', 'pelaku', 'waktu'], [
    ['Laporan pertama dan nomor usulan', 'BPBD', 'Mengikuti pelaporan harian'],
    ['Nomor induk disahkan', 'Pusdatinkom', 'Tujuh hari kerja setelah laporan pertama'],
    ['Verifikasi deteksi satelit', 'Pusdatinkom', 'Tiga hari, lalu kedaluwarsa'],
    ['Status dan kelas sementara', 'Pusdatinkom', 'Setiap pembaruan'],
    ['Rilis bulanan (angka resmi), dikunci tiap triwulan', 'Pusdatinkom', 'Rilis pertama setelah kejadian selesai'],
    ['Keberatan atas penggabungan atau kelas', 'BPBD', 'Empat belas hari setelah rilis'],
    ['Putusan keberatan', 'Pusdatinkom', 'Empat belas hari setelah keberatan']])
c_nilai = tulis_csv('std_nilai.csv', ['variabel', 'nilai', 'alasan'], [
    ['Meninggal', 'Nilai terakhir', 'Hanya bertambah dan dikoreksi lewat verifikasi'],
    ['Kerusakan rumah dan fasilitas', 'Nilai terakhir', 'Pendataan makin lengkap seiring waktu'],
    ['Hilang', 'Nilai terbesar', 'Berkurang saat korban ditemukan'],
    ['Luka atau sakit', 'Nilai terbesar', 'Berkurang saat pasien pulih'],
    ['Terdampak', 'Nilai terbesar', 'Berubah mengikuti keadaan wilayah'],
    ['Mengungsi', 'Nilai terbesar, yaitu puncak', 'Berkurang saat warga kembali'],
])
c_keputusan = tulis_csv('std_keputusan.csv', ['keputusan', 'isi', 'akibat'], [
    ['Mengesahkan standar', 'Seluruh ketentuan standar menjadi dasar revisi Juklak (petunjuk pelaksanaan BNPB)',
     'Semua pencatat dan petugas verifikasi memakai satu aturan yang sama'],
    ['Mengesahkan usulan ketetapan', 'Seluruh usulan ketetapan (nilai batas dan peran) berlaku seperti tertulis, diubah lewat revisi',
     'Mengubah satu nilai cukup dilakukan di satu tabel dan pasal yang merujuknya'],
    ['Uji coba satu musim', 'Tiga provinsi, tipe utama berbeda: Riau (karhutla), Jawa Barat (banjir, longsor, gempa), Nusa Tenggara Timur (kekeringan)',
     'Melatih pencatat dan mengukur beban kerja serta waktu dari kejadian sampai laporan masuk'],
])

# ---------- slide ----------
S = []

S.append({'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': 'foto/sampul-banjir.jpg',
          'kredit': R.KREDIT, 'logo_kanan': 'foto/berakhlak-hd.png', 'kota': 'Jakarta',
          'penyaji': {'nama': 'Alfatehan Septianta', 'jabatan': 'Staf Ahli BNPB, bersama Tim Ahli dan Tim Sus IT BNPB'},
          'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana'})
S.append({'jenis': 'daftar-isi'})

# 3 Ringkasan
S.append({
    'jenis': 'kartu-angka', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan eksekutif', 'cut_off': False,
    'sumber': SP + '; DIBI dan logbook sampai 12 Nov 2026',
    'keterangan': K_DIBI + ' Logbook adalah catatan harian Pusat Pengendalian Operasi (Pusdalops) BNPB. ' + K_JUK + ' Hitungan logbook lebih stabil: bila laporan harian dicocokkan dengan cara berbeda, jumlah bencana berselisih {{angka:lb.sel_juk|fmt=0}} persen menurut Juklak ({{angka:lb.j1|fmt=0}} sampai {{angka:lb.j2|fmt=0}}) dan hanya {{angka:lb.sel_lolos|fmt=0}} persen menurut standar ({{angka:lb.s1|fmt=0}} sampai {{angka:lb.s2|fmt=0}}). Persen tiap kelas dibulatkan terpisah.',
    'judul': 'Dengan standar, selisih jumlah bencana di logbook antara dua cara pencatatan turun dari {{angka:lb.sel_juk|fmt=0}} persen (Juklak) menjadi {{angka:lb.sel_lolos|fmt=0|satuan}}',
    'judul_panel': 'Empat angka kunci',
    'tesis': 'Juklak, petunjuk pelaksanaan BNPB tentang data kejadian, belum mengatur apa yang dihitung sebagai satu kejadian, sehingga jumlah kejadian bergantung pada cara menghitung.',
    'grup': [{'pil': 'Hasil standar pada data 2024 sampai 12 November 2026', 'nada': 'data', 'ikon': 'data', 'kartu': [
        {'nilai': '{{angka:std.satu|fmt=0|satuan}}', 'label': 'satu gempa, {{angka:gempa.kab|fmt=0}} catatan kabupaten', 'ikon': 'wilayah', 'warna': 'navy'},
        {'nilai': '{{angka:l2.selisih|fmt=1|satuan}}', 'label': 'turun, dari {{angka:l2.lama|fmt=0}} jadi {{angka:l2.usulan|fmt=0}}', 'ikon': 'ringkasan', 'warna': 'oranye'},
        {'nilai': '{{angka:lb.sel_juk|fmt=0}} ke {{angka:lb.sel_lolos|fmt=0|satuan}}', 'label': 'logbook lebih stabil (lihat catatan)', 'ikon': 'data', 'warna': 'navy'},
        {'nilai': '{{angka:kelas.u_n|fmt=0|satuan}}', 'label': 'dari {{angka:l2.usulan|fmt=0}} kelas Besar ke atas', 'ikon': 'peringatan', 'warna': 'merah'}]}],
    'temuan': [
        {'kode': 'Temuan A.1', 'keyakinan': 'asumsi-kebijakan', 'ikon': 'wilayah',
         'teks': '**Satu gempa, satu kejadian.** Gempa 15 Agustus 2026 merusak {{angka:gempa.kab|fmt=0}} kabupaten. DIBI kini mencatatnya {{angka:gempa.pecah|fmt=3}} kejadian per kabupaten ({{angka:std.satu|fmt=0}} dibagi {{angka:gempa.kab|fmt=0}}); standar menghitungnya {{angka:std.satu|fmt=0|satuan}} dengan {{angka:gempa.kab|fmt=0}} catatan kabupaten.'},
        {'kode': 'Temuan A.2', 'keyakinan': 'asumsi-kebijakan', 'ikon': 'regulasi',
         'teks': '**Enam syarat dampak.** Bencana dihitung bila salah satunya terpenuhi, misalnya {{angka:juk.mati|fmt=0}} orang meninggal atau hilang.'},
        {'kode': 'Temuan A.3', 'keyakinan': 'asumsi-kebijakan', 'ikon': 'peringatan',
         'teks': '**Empat kelas dari dampak.** Ringan sampai Katastrofik; kekuatan gempa tidak menentukan kelas.'},
        {'kode': 'Temuan A.4', 'keyakinan': 'asumsi-kebijakan', 'ikon': 'jiwa',
         'teks': '**Satu angka resmi per jenis korban.** Satu orang satu kategori; laporan harian tidak dijumlahkan.'}],
    'pita': {'label': 'Tiga hal yang diminta dari pimpinan', 'nada': 'aksi', 'kolom': [
        {'ikon': 'regulasi', 'judul': 'Mengesahkan standar', 'isi': 'Menjadi dasar revisi Juklak.'},
        {'ikon': 'ringkasan', 'judul': 'Mengesahkan usulan ketetapan', 'isi': '{{angka:std.ket}} nilai batas dan pembagian tugas.'},
        {'ikon': 'wilayah', 'judul': 'Uji coba satu musim', 'isi': 'Tiga provinsi; hasilnya dipakai merevisi Juklak.'}]},
    '_bicara': 'Standar ini menetapkan apa yang dihitung sebagai satu kejadian bencana, kapan kejadian itu dihitung sebagai bencana, seberapa besar kelasnya, dan angka korban mana yang dipakai. Dengan aturan yang sama untuk semua pencatat, jumlah bencana yang kita laporkan tidak lagi berubah menurut cara masing-masing pencatat menghitung. Contohnya gempa 15 Agustus 2026 yang merusak 11 kabupaten. Di DIBI, yaitu Data dan Informasi Bencana Indonesia, gempa itu tampil sebagai 11 baris yang masing-masing bernilai 0,091 kejadian, yaitu 1 dibagi 11. Menurut standar, gempa itu 1 kejadian dengan 11 catatan kabupaten. Pada data 2024 sampai 12 November 2026, standar menghitung 6.835 kejadian sebagai bencana, 9,3 persen lebih sedikit dari 7.535 menurut aturan sekarang. Di logbook Pusdalops, selisih jumlah bencana antara dua cara menentukan laporan harian yang termasuk kejadian yang sama turun dari 7 persen menurut Juklak menjadi 3 persen menurut standar; jumlah kejadian mentah berselisih 27 persen. Hanya 57 dari 6.835 kejadian, atau 0,8 persen, yang berkelas Besar atau Katastrofik. Kami meminta pengesahan standar, pengesahan 45 usulan ketetapan, dan uji coba satu musim di tiga provinsi; hasilnya dipakai merevisi Juklak.'})

# 4 Masalah
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Jumlah bergantung pada cara menghitung', 'cut_off': False, 'rasio': 0.55,
    'sumber': 'Hotspot VIIRS 15 Okt sampai 11 Nov 2026, logbook Pusdalops, DIBI, diolah',
    'keterangan': K_DIBI + ' ' + K_PUS + ' Hotspot adalah deteksi api oleh VIIRS, sensor satelit pendeteksi hotspot; jarak adalah jarak gabung antardeteksi, dan jendela adalah selisih waktu gabung: satu hari (dua puluh empat jam) atau tiga hari (tujuh puluh dua jam). Cara menentukan laporan harian mana yang termasuk kejadian yang sama bisa berbeda antarpencatat.',
    'judul': 'Cara menghitung menentukan jumlah kejadian: data karhutla yang sama berselisih {{angka:hs.kali|fmt=1|satuan}} lipat, dan data logbook yang sama berselisih {{angka:lb.sel|fmt=0|satuan}}',
    'utama': {'judul': 'Kejadian karhutla menurut aturan gabung hotspot', 'ikon': 'karhutla', 's3_kolom_grup': {'satuan': 'Jumlah kejadian karhutla (hotspot 15 Oktober sampai 11 November 2026)', 'data': {
        'csv': c_gabung_k, 'kolom': [{'nama': 'jarak'}, {'nama': 'j24', 'kepala': 'Jendela satu hari', 'fmt': '0'}, {'nama': 'j72', 'kepala': 'Jendela tiga hari', 'fmt': '0'}],
        'keyakinan': 'terverifikasi', 'sumber': 'Simulasi kajian atas hotspot VIIRS, 15 Oktober sampai 11 November 2026'}}},
    'panel': pi('Penyebabnya sama: satu kejadian belum didefinisikan', 'regulasi', 'bahaya', [
        ('karhutla', 'Karhutla', 'Hanya karena jarak dan selisih waktu gabung, jumlah berubah {{angka:hs.kali|fmt=1|satuan}} lipat.'),
        ('data', 'Logbook', 'Logbook sama: {{angka:lb.min|fmt=0}} sampai {{angka:lb.maks|fmt=0}} kejadian sebelum disaring syarat (selisih {{angka:lb.sel|fmt=0|satuan}}).'),
        ('wilayah', 'DIBI', 'Di DIBI satu baris adalah satu hari di satu kabupaten untuk satu jenis bencana.'),
        ('regulasi', 'Aturan', 'Juklak mengatur kapan kejadian masuk hitungan; apa itu satu kejadian belum diatur.')]),
    '_bicara': 'Masalahnya bukan di lapangan, tetapi di cara menghitung. Data hotspot yang sama menghasilkan jumlah kejadian karhutla antara 27.322 dan 61.138, selisih 2,2 kali lipat, hanya karena pilihan jarak dan selisih waktu gabung. Logbook Pusdalops menghasilkan 2.809 sampai 3.860 kejadian menurut cara menentukan laporan harian yang termasuk kejadian yang sama, selisih 27 persen sebelum disaring syarat. Di DIBI satu baris adalah satu hari di satu kabupaten untuk satu jenis bencana, bukan satu kejadian. Ketiganya berakar pada satu hal: belum ditetapkan apa yang dihitung sebagai satu kejadian.'})

# 5 Definisi
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Satu kejadian dan dua angka bernama', 'cut_off': False, 'rasio': 0.48,
    'sumber': SP + ', Bab 2 dan Bab 10; DIBI, tarikan 12 November 2026',
    'keterangan': K_DIBI + ' ' + K_PDK + ' Nomor induk kejadian adalah satu nomor untuk satu kejadian, dipakai bersama semua kabupaten yang terdampak.',
    'judul': 'Satu kejadian memiliki satu nomor induk; gempa di {{angka:gempa.kab}} kabupaten dihitung {{angka:std.satu|fmt=0|satuan}} nasional dan {{angka:gempa.kab}} catatan kabupaten',
    'utama': {'judul': 'Dua tingkat hitungan', 'ikon': 'wilayah', 'banding': {
        'kiri': {'judul': 'Kejadian nasional'}, 'kanan': {'judul': 'Catatan kabupaten'}, 'baris': [
            {'label': 'Isi', 'kiri': 'Satu kejadian utuh', 'kanan': 'Bagian di satu kabupaten'},
            {'label': 'Identitas', 'kiri': 'Satu nomor induk', 'kanan': 'Kode catatan, memuat nomor induk'},
            {'label': 'Nama angka', 'kiri': 'Jumlah kejadian', 'kanan': 'Jumlah catatan kabupaten'},
            {'label': 'Gempa 15 Agustus 2026', 'kiri': '{{angka:std.satu|fmt=0|satuan}}', 'kanan': '{{angka:gempa.kab|fmt=0}} catatan'}]}},
    'panel': pi('Aturan hitung dua tingkat', 'lembaga', 'air', [
        ('lembaga', 'Nomor induk', 'Pusdatinkom mengesahkannya dalam {{angka:std.nomor|fmt=0|satuan}} setelah laporan pertama.'),
        ('peringatan', 'Kejadian tidak dipecah', 'DIBI menulis {{angka:gempa.pecah|fmt=3}} kejadian ({{angka:std.satu|fmt=0}} dibagi {{angka:gempa.kab|fmt=0}}) per kabupaten; standar menghitung satu kejadian.'),
        ('wilayah', 'Provinsi', 'Provinsi menghitung tiap kejadian di wilayahnya; antarprovinsi tidak dijumlahkan jadi angka nasional.'),
        ('kalender', 'Tanggal', 'Tanggal dampak pertama; tanggal laporan diterima tidak dipakai.')]),
    '_bicara': 'Satu kejadian bencana adalah satu rangkaian dampak dari satu bahaya utama yang terhubung dalam ruang dan waktu. Kejadian dicatat pada dua tingkat dengan dua angka bernama. Kejadian nasional memakai satu nomor induk dari Pusdatinkom dan disebut jumlah kejadian. Catatan kabupaten adalah bagian kejadian di tiap kabupaten dan merujuk nomor induk itu. Gempa 15 Agustus 2026 merusak 11 kabupaten. DIBI mencatatnya 0,091 kejadian per kabupaten, yaitu 1 dibagi 11, sehingga tiap kabupaten tampak hanya mengalami sebagian kejadian. Standar menghitungnya 1 kejadian nasional dengan 11 catatan kabupaten. Provinsi menghitung kejadian nasional yang menyentuh provinsinya, dan angka provinsi tidak dijumlahkan menjadi angka nasional.'})

# 6 Aturan gabung, pisah, tutup
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Aturan menggabung, memisah, dan menutup kejadian', 'cut_off': False, 'rasio': 0.78,
    'sumber': SP + ', Bab 2, Tabel 2.2',
    'keterangan': 'BMKG adalah lembaga pemerintah yang memantau cuaca dan gempa. ' + K_SK + ' Zona gempa adalah kabupaten yang terdampak gempa utama ditambah kabupaten yang bersinggungan. Dua deteksi karhutla digabung bila jaraknya paling jauh satu setengah kali ukuran piksel (petak citra satelit) terbesar keduanya; hasilnya enam persepuluh sampai satu setengah kilometer.',
    'judul': 'Laporan digabung bila selang antarlaporan kurang dari {{angka:gabung.selesai|fmt=0|satuan}} ({{angka:gabung.gambut|fmt=0|satuan}} di gambut); satu kejadian paling lama {{angka:gabung.maks|fmt=0|satuan}}, gempa {{angka:gabung.gempa|fmt=0|satuan}}',
    'tabel': {'judul_panel': 'Enam dari empat belas jenis bencana yang dipakai DIBI', 'ikon': 'kalender', 'peringkat': False,
              'sel_dua_baris': True, 'sel_maks_baris': 3, 'skala_huruf': 1.3, 'baris_maks_pt': 60,
              'data': {'csv': c_gabung, 'kolom': [
                  {'nama': 'jenis', 'kepala': 'Jenis', 'rata': 'l', 'bobot': 0.9},
                  {'nama': 'gabung', 'kepala': 'Digabung bila', 'rata': 'l', 'bobot': 1.7},
                  {'nama': 'baru', 'kepala': 'Kejadian baru bila', 'rata': 'l', 'bobot': 1.6},
                  {'nama': 'selesai', 'kepala': 'Selesai bila', 'rata': 'l', 'bobot': 1.6}],
                       'keyakinan': 'asumsi-kebijakan', 'sumber': SKS}},
    'pita': {'label': 'Aturan untuk semua jenis', 'nada': 'data', 'kolom': [
        {'ikon': 'wilayah', 'judul': 'Bentuk tidak memecah', 'isi': 'Api terpisah sungai tetap satu kejadian bila berdekatan.'},
        {'ikon': 'ringkasan', 'judul': 'Penggabungan dipertahankan', 'isi': 'Kejadian lebih kecil ditutup berstatus digabung, nomornya tetap.'},
        {'ikon': 'peringatan', 'judul': 'Riwayat sistem', 'isi': 'Keputusan otomatis dapat dibatalkan Pusdatinkom.'}]},
    '_bicara': 'Standar menetapkan aturan gabung, pisah, dan selesai untuk 14 jenis bencana yang sama dengan jenis di DIBI. Slide ini memuat enam jenis utama. Jeda pemisah umumnya tujuh hari tanpa laporan aktif. Di lahan gambut jedanya 14 hari karena bara di bawah permukaan dapat menyala lagi tanpa terdeteksi satelit. Satu kejadian paling lama 30 hari, dan gempa 90 hari, supaya satu kejadian tidak menyapu satu musim. Karhutla digabung bila deteksi berantai dalam jarak gabung dan selisih waktu dua hari, sama dengan aturan kluster di sistem kita. Bentuk tidak memecah kejadian, dan penggabungan yang sah tidak dibatalkan.'})

# 7 Syarat masuk
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'pesan': 'Enam syarat masuk hitungan', 'cut_off': False,
    'sumber': SP + ', Bab 3, Tabel 3.1',
    'keterangan': K_SK + ' Karhutla adalah kebakaran hutan dan lahan. Puso adalah tanaman rusak lebih dari delapan puluh lima persen menurut dinas pertanian. ' + K_BPBD + '',
    'judul': 'Kejadian masuk hitungan bila memenuhi satu dari {{angka:syarat}} syarat; permintaan bantuan dan status darurat hanya keterangan tambahan',
    'utama': {'judul': 'Enam syarat masuk hitungan', 'ikon': 'regulasi', 'daftar_ikon': {'mode': 'baris', 'rasio_satuan': 0.62, 'baris': [
        {'ikon': 'jiwa', 'judul': 'Meninggal atau hilang', 'isi': 'Akibat langsung bahaya dalam masa kejadian.', 'angka': '{{angka:juk.mati}}', 'satuan': 'jiwa'},
        {'ikon': 'pengungsi', 'judul': 'Orang terdampak', 'isi': 'Orang terdampak langsung; tiap orang sekali.', 'angka': '{{angka:juk.terdampak}}', 'satuan': 'orang'},
        {'ikon': 'rumah', 'judul': 'Rumah setara rusak berat', 'isi': 'Rusak sedang setengah, rusak ringan seperempat.', 'angka': '{{angka:juk.rumah}}', 'satuan': 'unit'},
        {'ikon': 'sekolah', 'judul': 'Fasilitas penting', 'isi': 'Misalnya sekolah; rusak berat atau sedang bila layanan terhenti.', 'angka': '{{angka:std.fasilitas}}', 'satuan': 'fasilitas'},
        {'ikon': 'karhutla', 'judul': 'Karhutla', 'isi': 'Luas diverifikasi, atau {{angka:m5.puso|fmt=0|satuan}} puso (gagal panen).', 'angka': '{{angka:m5.lahan}}', 'satuan': 'hektare'},
        {'ikon': 'regulasi', 'judul': 'SK tanggap darurat', 'isi': 'SK yang sesuai kejadian itu.', 'angka': '{{angka:std.sk}}', 'satuan': 'SK'}]}},
    'pita': {'label': 'Tiga status kejadian', 'nada': 'aksi', 'kolom': [
        {'ikon': 'regulasi', 'judul': 'Masuk hitungan bencana', 'isi': 'Memenuhi satu syarat; syarat dicatat.'},
        {'ikon': 'data', 'judul': 'Di bawah batas minimum', 'isi': 'Dilaporkan dan disimpan, tidak dijumlahkan.'},
        {'ikon': 'peringatan', 'judul': 'Terdeteksi satelit, belum diperiksa', 'isi': 'Belum bernomor induk; kedaluwarsa bila {{angka:std.tenggang|fmt=0|satuan}} tanpa verifikasi.'}]},
    '_bicara': 'Syarat masuk diperiksa pada satu kejadian nasional yang sudah dibentuk, dengan angka yang sah, bukan pada laporan harian per kabupaten. Kejadian masuk hitungan bila memenuhi satu dari enam syarat: ada korban meninggal atau hilang; minimal 50 orang luka, mengungsi, atau terdampak langsung; minimal lima rumah setara rusak berat; satu fasilitas penting rusak; karhutla minimal 2 hektare terverifikasi atau puso 10 hektare; atau ada SK tanggap darurat yang cocok. Permintaan bantuan, status siaga darurat, dan status lain hanya dicatat sebagai penanda, karena penanda mengukur tanggapan, bukan dampak. Kejadian berstatus bencana, di bawah ambang, atau terdeteksi belum diverifikasi, dan tiap kejadian bencana menyimpan dasar masuknya.'})

# 8 Kelas
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Empat kelas keparahan', 'cut_off': False, 'ulang_angka_boleh': 'catatan bintang di kaki menyebut lantai 100 dan 1.000 orang untuk aturan daerah kecil, nilai yang berbeda dari sel tabel', 'rasio': 0.62,
    'sumber': SP + ', Bab 4; USGS PAGER; BMKG dan DIBI, gempa Cianjur 2022',
    'keterangan': '* Pengungsi saja paling tinggi Sedang, termasuk setelah kenaikan kelas; Besar atau Katastrofik dari pengungsi hanya berlaku bila meninggal dan hilang atau rumah setara rusak berat sudah mencapai Sedang. Kabupaten kecil naik satu kelas bila pengungsi dan terdampak mencapai {{angka:std.kenaikan|fmt=0|satuan}} penduduk (minimal {{angka:std.lantai1|fmt=0|satuan}} ke Sedang, {{angka:std.lantai2|fmt=0|satuan}} ke Besar).',
    'judul': 'Batas tiap kelas {{angka:kelas.pangkat}} kali batas kelas di bawahnya, dan kelas kejadian mengikuti indikator dampak tertinggi',
    'tabel': {'judul_panel': 'Batas bawah tiap kelas; rumah dihitung setara rusak berat', 'ikon': 'peringatan', 'peringkat': False, 'skala_huruf': 1.5, 'baris_maks_pt': 78, 'sel_dua_baris': True, 'sel_maks_baris': 2,
              'data': {'csv': c_kelas, 'kolom': [
                  {'nama': 'kelas', 'kepala': 'Kelas', 'bobot': 1.3},
                  {'nama': 'mati', 'kepala': 'Meninggal, hilang', 'bobot': 1.3},
                  {'nama': 'ungsi', 'kepala': 'Mengungsi*', 'bobot': 1.3},
                  {'nama': 'rumah', 'kepala': 'Rumah setara', 'bobot': 1.3},
                  {'nama': 'luas', 'kepala': 'Karhutla, hektare', 'bobot': 1.3}],
                       'keyakinan': 'asumsi-kebijakan', 'sumber': SKS}},
    'panel': pi('Aturan penting kelas', 'regulasi', 'air', [
        ('jiwa', 'Pengungsi saja*', 'Kelas paling tinggi Sedang (lihat catatan).'),
        ('wilayah', 'Kabupaten kecil', 'Naik satu kelas bila pengungsi dan terdampak {{angka:std.kenaikan|fmt=0|satuan}} penduduk.'),
        ('gempa', 'Magnitudo', 'Cianjur {{angka:cianjur.mag|fmt=1}}: {{angka:cj.rumah|fmt=0}} rumah setara rusak berat, Katastrofik.'),
        ('pembiayaan', 'Rupiah', 'Kerugian tidak menentukan kelas.')]),
    '_bicara': 'Kelas ditentukan oleh indikator tertinggi yang dicapai, dengan jenjang sepuluh kali lipat mengikuti klasifikasi korban USGS PAGER. Besar dimulai dari 100 meninggal dan hilang, 10.000 pengungsi, atau 1.000 rumah setara rusak berat. Pengungsi saja paling tinggi Sedang, karena jumlah pengungsi bergantung pada keputusan evakuasi dan kapasitas posko. Kabupaten berpenduduk kecil naik satu kelas bila pengungsi dan terdampaknya mencapai 10 persen penduduk, dengan lantai 100 orang ke Sedang dan 1.000 orang ke Besar, paling tinggi Besar. Magnitudo hanya atribut: gempa Cianjur 2022 berkekuatan 5,6 tetapi berkelas Katastrofik karena rumah rusak: menurut DIBI 13.730 rusak berat ditambah setengah dari 16.320 rusak sedang dan seperempat dari 27.287 rusak ringan, yaitu 28.712 rumah setara rusak berat, sedangkan banyak gempa di atas magnitudo 7 tidak berdampak. Rupiah tidak menentukan kelas.'})

# 9 Angka yang dipakai
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Angka yang dipakai', 'cut_off': False, 'ulang_angka_boleh': 'keterangan kaki menjelaskan asal angka 565 dan 609 yang tampil di panel', 'rasio': 0.62,
    'sumber': SP + ', Bab 5 dan Tabel 6.4; logbook Pusdalops 2026',
    'keterangan': 'KK adalah kepala keluarga. BPS adalah Badan Pusat Statistik. ' + K_DIBI + ' Terdampak adalah istilah baku. Logbook: {{angka:lb.terakhir|fmt=0}} bila memakai angka laporan terakhir tiap kejadian (angka terbit); {{angka:lb.terbesar|fmt=0}} bila memakai angka tertinggi tiap kejadian (dipakai untuk syarat dan kelas).',
    'judul': 'Menjumlah laporan harian menggelembungkan korban meninggal menjadi {{angka:lb.kumulatif|fmt=0}}, padahal tiap kejadian dihitung sekali hanya {{angka:lb.terakhir|fmt=0}} sampai {{angka:lb.terbesar|fmt=0}}',
    'tabel': {'judul_panel': 'Nilai yang dipakai per variabel', 'ikon': 'ringkasan', 'peringkat': False, 'sel_dua_baris': True, 'sel_maks_baris': 2,
              'skala_huruf': 1.4, 'baris_maks_pt': 60,
              'data': {'csv': c_nilai, 'kolom': [
                  {'nama': 'variabel', 'kepala': 'Variabel', 'rata': 'l', 'bobot': 1.3},
                  {'nama': 'nilai', 'kepala': 'Nilai dari laporan harian', 'rata': 'l', 'bobot': 1.2},
                  {'nama': 'alasan', 'kepala': 'Alasan', 'rata': 'l', 'bobot': 2.0}],
                       'keyakinan': 'asumsi-kebijakan', 'sumber': SKS}},
    'panel': pi('Perubahan istilah dan aturan hitung', 'peringatan', 'bahaya', [
        ('regulasi', 'Menderita jadi terdampak', 'Kolom menderita di DIBI diganti terdampak.'),
        ('jiwa', 'KK menjadi jiwa', 'Memakai rata-rata anggota rumah tangga BPS, bertanda taksiran.'),
        ('data', 'Satu orang satu kategori', 'Yang luka dan mengungsi dicatat sebagai luka.'),
        ('peringatan', 'Logbook Jan sampai Okt 2026', 'Dijumlah: {{angka:lb.kumulatif|fmt=0}}; tiap kejadian sekali: {{angka:lb.terakhir|fmt=0}} sampai {{angka:lb.terbesar|fmt=0}}.')]),
    '_bicara': 'Standar memakai satu nilai per variabel. Meninggal dan kerusakan memakai nilai terakhir, sedangkan hilang, luka, terdampak, dan mengungsi memakai nilai terbesar selama masa kejadian. Syarat masuk dan kelas dihitung dari nilai terbesar meninggal dan hilang per laporan. Istilah baku adalah terdampak, dan kolom menderita di DIBI diganti nama. Laporan yang memakai kepala keluarga dikonversi ke jiwa dengan rata-rata anggota rumah tangga BPS dan diberi penanda taksiran. Satu orang hanya masuk satu kategori. Laporan harian tidak boleh dijumlahkan: di logbook Januari sampai Oktober 2026, penjumlahan laporan harian menghasilkan 12.523 korban meninggal, padahal bila tiap kejadian dihitung sekali jumlahnya 565 (memakai angka laporan terakhir) atau paling banyak 609 (memakai angka tertinggi tiap kejadian).'})

# 10 Tata kelola
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Tata kelola dan alur', 'cut_off': False, 'rasio': 0.62,
    'sumber': SP + ', Bab 7, Tabel 7.1 dan Tabel 7.2',
    'keterangan': K_PDK + ' ' + K_BPBD + ' Pusdatinkom adalah walidata, yaitu pemilik dan penanggung jawab data kejadian. Rilis dibekukan per triwulan berarti angka rilis itu tidak ditimpa, dan koreksi terbit sebagai rilis baru.',
    'judul': 'Nomor induk disahkan {{angka:std.nomor|fmt=0|satuan}} setelah laporan pertama, dan BPBD boleh berkeberatan sampai {{angka:std.keberatan|fmt=0|satuan}} setelah rilis',
    'tabel': {'judul_panel': 'Dari laporan pertama sampai rilis dan koreksi', 'ikon': 'satu-data', 'peringkat': True, 'sel_dua_baris': True, 'sel_maks_baris': 2,
              'skala_huruf': 1.2, 'baris_maks_pt': 46,
              'data': {'csv': c_alur, 'kolom': [
                  {'nama': 'langkah', 'kepala': 'Langkah', 'rata': 'l', 'bobot': 1.5},
                  {'nama': 'pelaku', 'kepala': 'Pelaku', 'rata': 'l', 'bobot': 1.0},
                  {'nama': 'waktu', 'kepala': 'Batas waktu', 'rata': 'l', 'bobot': 1.6}],
                       'keyakinan': 'asumsi-kebijakan', 'sumber': SKS}},
    'panel': {'judul': 'Penjagaan mutu', 'ikon': 'regulasi', 'nada': 'netral', 'angka_besar': {'mode': 'kartu', 'kartu': [
        {'nilai': '{{angka:std.sampel|fmt=0|satuan}}', 'label': 'catatan diperiksa', 'ket': 'Tiap triwulan terhadap dokumen pendukung.', 'ikon': 'data'},
        {'nilai': '{{angka:std.selisih|fmt=0|satuan}}', 'label': 'selisih sampel satu BPBD', 'ket': 'Seluruh catatan diperiksa.', 'ikon': 'peringatan'},
        {'nilai': '{{angka:std.putus|fmt=0|satuan}}', 'label': 'batas putusan keberatan', 'ket': 'Pusdatinkom memutus keberatan.', 'ikon': 'regulasi'}]}},
    '_bicara': 'Tata kelola mengatur siapa mengerjakan apa dan dengan batas waktu berapa. BPBD mengirim laporan pertama dengan nomor usulan dan membawanya pada tiap pengkinian. Pusdatinkom sebagai walidata mengesahkan nomor induk paling lambat tujuh hari kerja setelah laporan pertama, menetapkan status dan kelas, dan merilis data bulanan bernomor versi yang dibekukan per triwulan. BPBD dapat mengajukan keberatan paling lambat 14 hari setelah rilis, dan Pusdatinkom memutuskan paling lambat 14 hari setelah keberatan diterima. Untuk mencegah angka menggelembung, 5 persen catatan kabupaten diperiksa tiap triwulan, dan selisih lebih dari 10 persen pada satu BPBD memicu pemeriksaan seluruh catatannya. Setiap keputusan mesin tercatat dan dapat dibatalkan.'})

# 11 Hasil uji
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Hasil uji pada data', 'cut_off': False, 'rasio': 0.55,
    'sumber': 'DIBI dan logbook; simulasi BNPB, 12 Nov 2026; ' + SP + ', Bab 12',
    'keterangan': K_DIBI + ' ' + K_JUK + ' Syarat luas karhutla dan SK tanggap darurat belum terukur di DIBI, sehingga hasil adalah batas atas. Tanda bintang berarti sampai 12 November. Logbook: Juklak {{angka:lb.j1|fmt=0}} sampai {{angka:lb.j2|fmt=0}}, standar {{angka:lb.s1|fmt=0}} sampai {{angka:lb.s2|fmt=0}}. Angka status darurat berasal dari percobaan sebelum aturan kelas final. Persen tiap kelas dibulatkan terpisah.',
    'judul': 'Pada data 2024 sampai 12 November 2026, standar menghitung {{angka:l2.usulan|fmt=0}} kejadian sebagai bencana, {{angka:l2.selisih|fmt=1|satuan}} lebih sedikit dari aturan sekarang ({{angka:l2.lama|fmt=0}})',
    'utama': {'judul': 'Kejadian yang masuk hitungan menurut Juklak dan standar', 'ikon': 'ringkasan', 's3_kolom_grup': {'satuan': 'Kejadian per tahun', 'data': {
        'csv': c_tahun, 'kolom': [
            {'nama': 'tahun'}, {'nama': 'lama', 'kepala': 'Aturan Juklak', 'fmt': '0'}, {'nama': 'usulan', 'kepala': 'Standar', 'fmt': '0'}],
        'keyakinan': 'terverifikasi', 'sumber': SSIM}}},
    'panel': pi('Hasil lain dari uji', 'data', 'netral', [
        ('data', 'Kestabilan', 'Selisih bencana logbook antar-pencatatan: {{angka:lb.sel_juk|fmt=0}} persen (Juklak), {{angka:lb.sel_lolos|fmt=0|satuan}} (standar).'),
        ('peringatan', 'Sebaran kelas', '{{angka:kelas.u_n|fmt=0}} dari {{angka:l2.usulan|fmt=0}} kejadian ({{angka:kelas.u_atas|fmt=1|satuan}}) berkelas Besar atau Katastrofik.'),
        ('regulasi', 'Status darurat', 'Kelas menurut status darurat sama dengan kelas menurut dampak hanya pada {{angka:kelas.cocok_c|fmt=1|satuan}} kejadian.'),
        ('ringkasan', 'Kasus sulit', 'Semua {{angka:uji.par}} situasi sulit dan {{angka:uji.adv_standar}} kasus uji rekaan punya jawaban di standar.')]),
    '_bicara': 'Standar diuji pada data DIBI, logbook Pusdalops, dan hotspot 2024 sampai 12 November 2026. Kejadian yang masuk hitungan turun 9,3 persen, dari 7.535 menurut Juklak menjadi 6.835 menurut standar, terutama karena rumah rusak ringan kini hanya dihitung seperempat. Selisih jumlah bencana di logbook antara dua cara pencatatan turun dari 7 persen menurut Juklak menjadi 3 persen menurut standar; selisih jumlah kejadian mentah 27 persen. Hanya 0,8 persen kejadian kelas Besar ke atas, sedangkan status darurat cocok dengan kelas dampak hanya pada 52,7 persen kejadian, dihitung pada percobaan sebelum aturan kelas final, sehingga status ditulis berdampingan dengan kelas. Semua 65 kasus sulit dan 26 kasus uji buatan pemeriksa terjawab oleh standar. Syarat luas karhutla dan SK belum terukur di data uji, jadi hasil adalah batas atas.'})

# 12 Keputusan
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Keputusan yang diminta', 'cut_off': False, 'rasio': 0.9,
    'sumber': SP + ', Bab 12 dan Tabel 0.1',
    'keterangan': K_JUK + ' ' + K_DIBI + ' ' + K_BPBD + ' ' + K_PUS + ' BPS adalah Badan Pusat Statistik. WorldPop adalah data penduduk berbasis grid. Pencatat adalah petugas BPBD dan Pusdalops yang mengisi laporan kejadian.',
    'judul': 'Pimpinan diminta mengesahkan standar dan {{angka:std.ket}} usulan ketetapan agar dapat diuji satu musim di {{angka:provinsi.uji}} provinsi',
    'tabel': {'judul_panel': 'Tiga keputusan yang diminta dan manfaatnya', 'ikon': 'regulasi', 'peringkat': True, 'sel_dua_baris': True, 'sel_maks_baris': 3,
              'skala_huruf': 1.4, 'baris_maks_pt': 100,
              'data': {'csv': c_keputusan, 'kolom': [
                  {'nama': 'keputusan', 'kepala': 'Keputusan', 'rata': 'l', 'bobot': 1.1},
                  {'nama': 'isi', 'kepala': 'Isi', 'rata': 'l', 'bobot': 2.2},
                  {'nama': 'akibat', 'kepala': 'Manfaat', 'rata': 'l', 'bobot': 1.9}],
                       'keyakinan': 'asumsi-kebijakan', 'sumber': SKS}},
    'pita': {'label': 'Batas hasil uji', 'nada': 'data', 'kolom': [
        {'ikon': 'jiwa', 'judul': 'Wawancara', 'isi': 'Pencatat belum diwawancarai; itu bagian uji coba.'},
        {'ikon': 'peringatan', 'judul': 'Syarat karhutla dan SK', 'isi': 'Belum terukur di DIBI, sehingga hasil adalah batas atas.'},
        {'ikon': 'data', 'judul': 'Jumlah penduduk', 'isi': 'Memakai WorldPop; standar menetapkan proyeksi BPS.'}]},
    '_bicara': 'Kami meminta tiga keputusan. Pertama, mengesahkan standar sebagai dasar revisi Juklak, yaitu petunjuk pelaksanaan BNPB tentang data kejadian. Kedua, mengesahkan 45 usulan ketetapan, yaitu angka batas dan pembagian tugas yang sebelumnya belum pernah diputuskan, misalnya batas syarat masuk, batas kelas, dan tugas BPBD, Pusdalops, dan Pusdatinkom. Tiap nilai sudah ditulis tegas beserta alasannya dalam satu tabel di dokumen standar lengkap, sehingga dapat disahkan atau diganti satu per satu. Ketiga, menugaskan uji coba satu musim di tiga provinsi: Riau untuk karhutla, Jawa Barat untuk banjir, longsor, dan gempa, dan Nusa Tenggara Timur untuk kekeringan. Pencatat dilatih dan beban kerjanya diukur, lalu hasilnya dipakai merevisi Juklak. Batas hasil uji perlu diingat: pencatat belum diwawancarai, syarat karhutla dan SK belum terukur di DIBI, dan uji memakai data penduduk WorldPop, bukan proyeksi BPS.'})

# 13 Lampiran
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Lampiran: gempa 15 Agustus 2026', 'cut_off': False, 'rasio': 0.6,
    'sumber': 'DIBI 12 Nov 2026, diolah; ' + SP + ', Bab 10, Tabel 10.2',
    'keterangan': K_DIBI + ' Magnitudo {{angka:gempa.mag|fmt=1}} menurut katalog gempa Eropa dan Mediterania, dicatat sebagai keterangan. Bobot rumah setara: rusak sedang setengah dan rusak ringan seperempat.',
    'judul': 'Lampiran: gempa 15 Agustus 2026 di DIBI {{angka:gempa.kab}} baris masing-masing {{angka:gempa.pecah|fmt=3}} kejadian, menurut standar {{angka:std.satu|fmt=0|satuan}} dengan {{angka:gempa.kab}} catatan kabupaten',
    'utama': {'judul': 'Gempa 15 Agustus 2026 sebelum dan sesudah standar', 'ikon': 'gempa', 'banding': {
        'kiri': {'judul': 'Cara sekarang'}, 'kanan': {'judul': 'Standar'}, 'baris': [
            {'label': 'Jumlah kejadian', 'kiri': '{{angka:gempa.kab|fmt=0}} baris, tiap baris {{angka:gempa.pecah|fmt=3}} kejadian ({{angka:std.satu|fmt=0}} dibagi {{angka:gempa.kab|fmt=0}})', 'kanan': 'Satu kejadian nasional'},
            {'label': 'Catatan kabupaten', 'kiri': 'Tidak ada istilahnya', 'kanan': '{{angka:gempa.kab|fmt=0}} catatan, satu nomor induk'},
            {'label': 'Angka dipakai', 'kiri': 'Tersebar per kabupaten', 'kanan': '{{angka:gempa.mati|fmt=0}} meninggal, {{angka:gempa.ungsi|fmt=0}} mengungsi, semua kabupaten'},
            {'label': 'Syarat masuk', 'kiri': 'Dasar masuk tidak tercatat', 'kanan': 'Syarat korban jiwa dan rumah terpenuhi'},
            {'label': 'Kelas', 'kiri': 'Tidak ada kelas', 'kanan': 'Katastrofik'}]}},
    'panel': pi('Empat langkah hitung', 'satu-data', 'air', [
        ('wilayah', 'Satu kejadian', 'Satu kejadian di tiap provinsi terdampak (tiga provinsi) dan satu secara nasional.'),
        ('jiwa', 'Angka yang dipakai', 'Rumah setara rusak berat {{angka:gempa.rumah|fmt=0}}; sedang dan ringan berbobot.'),
        ('regulasi', 'Syarat masuk', 'Syarat korban jiwa dan syarat rumah terpenuhi.'),
        ('peringatan', 'Kelas', 'Katastrofik karena rumah dan pengungsi; magnitudo hanya dicatat.')]),
    '_bicara': 'Contoh ini memakai data nyata. DIBI mencatat gempa 15 Agustus 2026 sebagai 11 baris di Nusa Tenggara Barat, Nusa Tenggara Timur, dan Sulawesi Selatan, masing-masing bernilai 0,091 kejadian, yaitu 1 dibagi 11, sehingga tiap kabupaten tampak hanya mengalami sebagian kejadian. Menurut standar, gempa itu 1 kejadian nasional dengan 11 catatan kabupaten. Angka sah: 151 meninggal, 171.271 mengungsi, dan 63.425 rumah setara rusak berat, dihitung dari rusak berat ditambah setengah rusak sedang dan seperempat rusak ringan. Syarat masuk satu, dua, dan tiga terpenuhi, dan syarat fasilitas belum dapat dinilai karena DIBI lama tidak memilah tingkat kerusakan fasilitas. Kelas Katastrofik karena rumah setara rusak berat dan pengungsi mencapai kelas tertinggi. Magnitudo 7,7 hanya dicatat sebagai atribut.'})

S.append({'jenis': 'penutup', 'foto': 'foto/sampul-banjir.jpg', 'logo_kanan': 'foto/berakhlak-hd.png', 'kredit': R.KREDIT,
          'teks': 'Terima Kasih', 'laporan': JUDUL})

BAGIAN = [
    {'judul': 'Ringkasan', 'label': 'Ringkasan', 'halaman_tetap': [3]},
    {'judul': 'Masalah: Cara Menghitung', 'label': 'Masalah', 'halaman_tetap': [4]},
    {'judul': 'Satu Kejadian', 'label': 'Satu kejadian', 'halaman_tetap': [5, 6]},
    {'judul': 'Syarat Masuk dan Kelas', 'label': 'Syarat dan kelas', 'halaman_tetap': [7, 8]},
    {'judul': 'Angka dan Tata Kelola', 'label': 'Angka dan tata kelola', 'halaman_tetap': [9, 10]},
    {'judul': 'Hasil Uji dan Keputusan', 'label': 'Uji dan keputusan', 'halaman_tetap': [11, 12]},
    {'judul': 'Lampiran', 'label': 'Lampiran', 'halaman_tetap': [13]},
]

SPEK = {
    'tanpa_alur': 'slide keputusan berbentuk tabel tiga baris agar pilihan dan akibatnya terbaca utuh (standar Tabel 0.1, 13 Nov 2026)',
    '_catatan': 'Dibangun dari spek/bangun_spek_standar.py.',
    'arah': 'Sesi arah 12 Nov 2026 dijawab "Ikut semua usulan" dan dipakai ulang: kepada Kepala BNPB, penyaji Alfatehan Septianta, dipaparkan, 10 slide isi dan 1 lampiran, nada tegas, istilah Inggris seperti di dokumen, penutup Terima Kasih saja, PPTX dan PDF, logo BNPB dan KRIS.',
    'pesan_kunci': 'Standar menetapkan satu kejadian, enam syarat masuk, empat kelas, dan satu nilai per angka, sehingga jumlah kejadian stabil; pimpinan diminta mengesahkan standar dan ketetapan, lalu menugaskan uji coba.',
    'judul_dokumen': JUDUL, 'subjek_dokumen': 'Standar BNPB, 13 November 2026', 'format': 'kajian', 'kajian': KUNCI,
    'ukuran_keterangan_pt': 8.0, 'tanggal': '2026-11-13', 'cut_off': '12 Nov 2026', 'slide': S, 'bagian': BAGIAN,
}
(Path(__file__).resolve().parent / 'standar-hitung-131126.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=1), encoding='utf-8')

# angka.json: gabungan (union) supaya spek deck lain tidak rusak
import re  # noqa: E402
teks = json.dumps(SPEK, ensure_ascii=False)
dipakai = set(re.findall(r'\{\{angka:([^|}]+)', teks))
fp = AKAR2 / 'data' / 'angka.json'
ada = {}
for k in dipakai:
    if k not in R.ANGKA:
        print('ANGKA TIDAK TERDAFTAR:', k)
    else:
        ada[k] = R.ANGKA[k]
fp.write_text(json.dumps({'angka': ada}, ensure_ascii=False, indent=1), encoding='utf-8')
print('spek ditulis:', len(S), 'slide;', len(dipakai), 'token angka')
