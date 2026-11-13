// Templat Perjanjian Kerahasiaan (Non-Disclosure Agreement) BNPB dengan Perguruan Tinggi (13 Nov 2026).
// Pemilik 13 Nov 2026: tiap perguruan tinggi tidak hanya MoU, tetapi juga perjanjian kerahasiaan.
// Pendamping templat NK kampus: timbal balik (kedua pihak membuka informasi), mengikat (berbeda dengan NK),
// dan dapat ditandatangani pada hari yang sama dengan NK. Dasar: UU 14/2008 (informasi yang dikecualikan),
// UU 27/2022 (pelindungan data pribadi), Peraturan BNPB 1/2023 (Satu Data Bencana).
const path = require('path');
const L = require('./nk_lib');
const { A, H, par, pasal } = L;

const isi = [...L.kepala('[[logo perguruan tinggi]]')];
['PERJANJIAN KERAHASIAAN', 'ANTARA', 'BADAN NASIONAL PENANGGULANGAN BENCANA', 'DENGAN', '[[NAMA PERGURUAN TINGGI]]', 'TENTANG',
  'KERAHASIAAN INFORMASI DALAM KERJA SAMA', 'PENANGGULANGAN BENCANA'].forEach((t, i, a) => isi.push(L.tengah(t, i === a.length - 1 ? 200 : 60)));
isi.push(L.nomor('NOMOR\t: [[nomor perjanjian BNPB]]'));
isi.push(L.nomor('NOMOR\t: [[nomor perguruan tinggi]]'));
isi.push(L.kosong(200));
isi.push(par(L.AKTA));
isi.push(A('I.', L.BNPB_IDENTITAS));
isi.push(A('II.', '**[[NAMA PERGURUAN TINGGI]]**, berkedudukan di [[alamat lengkap]], diwakili oleh **[[nama dan gelar Rektor]]**, selaku Rektor [[nama perguruan tinggi]], yang diangkat berdasarkan [[keputusan Majelis Wali Amanat, Menteri, atau badan penyelenggara]] Nomor [[nomor]] tanggal [[tanggal]] tentang [[judul keputusan]], dalam hal ini bertindak untuk dan atas nama [[nama perguruan tinggi]], selanjutnya disebut **PIHAK KEDUA**.'));
isi.push(par(L.PARA_PIHAK));
[
  ['a.', 'bahwa **PARA PIHAK** telah menandatangani Nota Kesepahaman Nomor [[nomor BNPB]] dan Nomor [[nomor perguruan tinggi]] tentang Tridharma Perguruan Tinggi dalam Penanggulangan Bencana, selanjutnya disebut Nota Kesepahaman;'],
  ['b.', 'bahwa dalam pelaksanaan Nota Kesepahaman, **PARA PIHAK** akan saling menyampaikan data dan informasi kebencanaan, data pribadi, hasil riset, rancangan inovasi, dan informasi lain yang perlu dijaga kerahasiaannya;'],
  ['c.', 'bahwa Undang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik, Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, dan Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2023 tentang Satu Data Bencana mewajibkan pengelolaan informasi yang dikecualikan dan data pribadi secara bertanggung jawab; dan'],
  ['d.', 'bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a, huruf b, dan huruf c, **PARA PIHAK** perlu mengatur kewajiban kerahasiaan dalam suatu perjanjian yang mengikat.'],
].forEach(([l, t]) => isi.push(A(l, t)));
isi.push(par('Berdasarkan hal-hal tersebut di atas, **PARA PIHAK** sepakat untuk membuat dan menandatangani Perjanjian Kerahasiaan, selanjutnya disebut Perjanjian, dengan ketentuan sebagai berikut:'));

pasal(isi, 1, 'PENGERTIAN', [
  par('Dalam Perjanjian ini yang dimaksud dengan:'),
  A('1.', '**Informasi Rahasia** adalah setiap data, informasi, dokumen, dan materi dalam bentuk apa pun, baik lisan, tertulis, elektronik, maupun visual, yang disampaikan oleh satu **PIHAK** kepada **PIHAK** lainnya dalam pelaksanaan Nota Kesepahaman dan dinyatakan rahasia atau menurut sifatnya patut diperlakukan sebagai rahasia.'),
  A('2.', '**Pihak Pemberi** adalah **PIHAK** yang menyampaikan Informasi Rahasia.'),
  A('3.', '**Pihak Penerima** adalah **PIHAK** yang menerima Informasi Rahasia.'),
  A('4.', '**Data Pribadi** adalah data tentang orang perseorangan yang teridentifikasi atau dapat diidentifikasi secara tersendiri atau dikombinasi dengan informasi lainnya, sebagaimana dimaksud dalam Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.'),
  A('5.', '**Personel** adalah pegawai, dosen, peneliti, mahasiswa, relawan, dan tenaga lain yang ditugaskan oleh **PIHAK** dalam pelaksanaan Nota Kesepahaman.'),
]);
pasal(isi, 2, 'MAKSUD DAN TUJUAN', [
  A('(1)', 'Perjanjian ini dimaksudkan untuk mengatur kewajiban **PARA PIHAK** dalam menjaga Informasi Rahasia yang dipertukarkan dalam pelaksanaan Nota Kesepahaman.'),
  A('(2)', 'Perjanjian ini bertujuan untuk melindungi Informasi Rahasia dan Data Pribadi dari penggunaan dan pengungkapan yang tidak sah.'),
]);
pasal(isi, 3, 'LINGKUP INFORMASI RAHASIA', [
  par('Informasi Rahasia meliputi:'),
  A('a.', 'data dan informasi kebencanaan yang belum dipublikasikan atau termasuk informasi yang dikecualikan, termasuk data kejadian, data korban dan pengungsi, data kerusakan dan kerugian, serta data dan peta risiko yang dibatasi;'),
  A('b.', 'Data Pribadi, termasuk data korban, pengungsi, relawan, mahasiswa, dan Personel;'),
  A('c.', 'daftar masalah kebencanaan dan bahan internal **PIHAK KESATU** yang belum ditetapkan untuk umum;'),
  A('d.', 'data riset, metode, perangkat lunak, rancangan inovasi, dan hasil riset **PIHAK KEDUA** yang belum dipublikasikan atau belum dilindungi kekayaan intelektualnya;'),
  A('e.', 'akun, kata sandi, kunci akses, dan informasi keamanan sistem yang diberikan untuk mengakses data; dan'),
  A('f.', 'informasi lain yang dinyatakan rahasia secara tertulis oleh Pihak Pemberi.'),
]);
pasal(isi, 4, 'PENGECUALIAN', [
  par('Kewajiban kerahasiaan dalam Perjanjian ini tidak berlaku terhadap informasi yang:'),
  A('a.', 'telah menjadi milik umum bukan karena pelanggaran Perjanjian ini oleh Pihak Penerima;'),
  A('b.', 'telah dimiliki Pihak Penerima secara sah sebelum disampaikan oleh Pihak Pemberi, yang dapat dibuktikan dengan dokumen tertulis;'),
  A('c.', 'diperoleh Pihak Penerima secara sah dari pihak ketiga yang tidak terikat kewajiban kerahasiaan;'),
  A('d.', 'dikembangkan sendiri oleh Pihak Penerima tanpa menggunakan Informasi Rahasia; atau'),
  A('e.', 'disetujui secara tertulis oleh Pihak Pemberi untuk diungkapkan.'),
]);
pasal(isi, 5, 'KEWAJIBAN PIHAK PENERIMA', [
  par('Pihak Penerima wajib:'),
  A('a.', 'menggunakan Informasi Rahasia hanya untuk pelaksanaan Nota Kesepahaman dan Perjanjian Kerja Sama turunannya;'),
  A('b.', 'tidak mengungkapkan Informasi Rahasia kepada pihak ketiga tanpa persetujuan tertulis Pihak Pemberi;'),
  A('c.', 'membatasi akses Informasi Rahasia hanya kepada Personel yang memerlukannya untuk melaksanakan tugas;'),
  A('d.', 'memastikan Personel sebagaimana dimaksud dalam huruf c mengetahui dan mematuhi kewajiban kerahasiaan dalam Perjanjian ini, termasuk dengan pernyataan menjaga kerahasiaan secara tertulis;'),
  A('e.', 'menjaga Informasi Rahasia dengan tingkat kehati-hatian paling sedikit sama dengan yang diterapkan terhadap informasi rahasianya sendiri, termasuk pengamanan fisik dan elektronik yang memadai; dan'),
  A('f.', 'tidak menyalin, menggandakan, atau memindahkan Informasi Rahasia ke luar sistem yang disepakati, kecuali sepanjang diperlukan untuk pelaksanaan Nota Kesepahaman.'),
]);
pasal(isi, 6, 'PELINDUNGAN DATA PRIBADI', [
  A('(1)', 'Pemrosesan Data Pribadi dalam pelaksanaan Nota Kesepahaman dilakukan sesuai dengan Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.'),
  A('(2)', 'Data Pribadi yang diterima untuk keperluan riset dianonimkan atau dipseudonimkan sebelum dianalisis, kecuali disepakati lain secara tertulis dan memiliki dasar pemrosesan yang sah.'),
  A('(3)', 'Hasil riset, publikasi, peta, dan bahan paparan tidak boleh memuat Data Pribadi yang dapat mengidentifikasi orang perseorangan.'),
]);
pasal(isi, 7, 'PENGUNGKAPAN BERDASARKAN KETENTUAN PERATURAN PERUNDANG-UNDANGAN', [
  par('Dalam hal Pihak Penerima diwajibkan mengungkapkan Informasi Rahasia berdasarkan ketentuan peraturan perundang-undangan atau perintah pengadilan, Pihak Penerima memberitahukan secara tertulis kepada Pihak Pemberi sebelum pengungkapan sepanjang diperbolehkan, dan hanya mengungkapkan bagian Informasi Rahasia yang diwajibkan.'),
]);
pasal(isi, 8, 'INSIDEN KEBOCORAN', [
  A('(1)', 'Dalam hal terjadi atau diduga terjadi kebocoran, akses tidak sah, atau kehilangan Informasi Rahasia, Pihak Penerima memberitahukan secara tertulis kepada Pihak Pemberi paling lambat 2 x 24 (dua kali dua puluh empat) jam sejak diketahui.'),
  A('(2)', 'Pihak Penerima segera mengambil langkah untuk menghentikan dan membatasi dampak kebocoran serta bekerja sama dengan Pihak Pemberi dalam penanganannya.'),
  A('(3)', 'Dalam hal kebocoran menyangkut Data Pribadi, **PARA PIHAK** memenuhi kewajiban pemberitahuan kepada subjek data pribadi dan lembaga yang berwenang sesuai dengan ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 9, 'HAK ATAS INFORMASI', [
  A('(1)', 'Informasi Rahasia tetap menjadi milik Pihak Pemberi.'),
  A('(2)', 'Perjanjian ini tidak memberikan lisensi atau hak kekayaan intelektual apa pun atas Informasi Rahasia kepada Pihak Penerima. Kekayaan intelektual yang timbul dari kerja sama diatur dalam Perjanjian Kerja Sama.'),
]);
pasal(isi, 10, 'PUBLIKASI', [
  par('Publikasi hasil kegiatan yang menggunakan Informasi Rahasia **PIHAK** lainnya dilakukan setelah mendapat persetujuan tertulis **PIHAK** pemilik informasi. Persetujuan atau penolakan disampaikan paling lambat 30 (tiga puluh) hari kalender sejak permohonan diterima; penolakan disertai alasan.'),
]);
pasal(isi, 11, 'PENGEMBALIAN DAN PEMUSNAHAN', [
  par('Dalam waktu paling lambat 30 (tiga puluh) hari kalender sejak Perjanjian ini berakhir atau sejak diminta secara tertulis oleh Pihak Pemberi, Pihak Penerima mengembalikan atau memusnahkan Informasi Rahasia beserta salinannya, dan menyampaikan pernyataan tertulis bahwa hal tersebut telah dilakukan, kecuali salinan yang wajib disimpan berdasarkan ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 12, 'JANGKA WAKTU', [
  A('(1)', 'Perjanjian ini berlaku sejak tanggal ditandatangani sampai dengan berakhirnya Nota Kesepahaman, termasuk perpanjangannya.'),
  A('(2)', 'Kewajiban kerahasiaan tetap berlaku selama 5 (lima) tahun setelah Perjanjian ini berakhir.'),
  A('(3)', 'Kewajiban terhadap Data Pribadi dan informasi yang dikecualikan berlaku tanpa batas waktu sepanjang informasi tersebut masih bersifat rahasia menurut ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 13, 'PELANGGARAN', [
  A('(1)', 'Dalam hal salah satu **PIHAK** melanggar Perjanjian ini, **PIHAK** yang dirugikan berhak menghentikan pemberian Informasi Rahasia dan akses data, meminta pengembalian atau pemusnahan Informasi Rahasia, dan menuntut ganti rugi sesuai dengan ketentuan peraturan perundang-undangan.'),
  A('(2)', 'Pelanggaran oleh Personel menjadi tanggung jawab **PIHAK** yang menugaskannya, tanpa mengurangi tanggung jawab pribadi Personel tersebut.'),
]);
pasal(isi, 14, 'PENYELESAIAN PERSELISIHAN', [
  A('(1)', 'Dalam hal terjadi perselisihan dalam pelaksanaan Perjanjian ini, **PARA PIHAK** menyelesaikannya secara musyawarah untuk mufakat.'),
  A('(2)', 'Dalam hal musyawarah sebagaimana dimaksud pada ayat (1) tidak mencapai mufakat dalam waktu 30 (tiga puluh) hari kalender, **PARA PIHAK** sepakat menyelesaikannya melalui [[Pengadilan Negeri Jakarta Timur atau forum lain yang disepakati]].'),
]);
pasal(isi, 15, 'KORESPONDENSI', [
  A('(1)', 'Pemberitahuan dan surat-menyurat berdasarkan Perjanjian ini disampaikan secara tertulis kepada alamat sebagaimana tercantum dalam Nota Kesepahaman, dengan pejabat penghubung kerahasiaan:'),
  ...L.alamat('BADAN NASIONAL PENANGGULANGAN BENCANA', [
    ['U.p.', '[[Kepala Pusat Data, Informasi, dan Komunikasi Kebencanaan]]'],
    ['Pos-el', '[[pos-el pejabat penghubung]]'],
  ]),
  ...L.alamat('[[NAMA PERGURUAN TINGGI]]', [
    ['U.p.', '[[pejabat penghubung, misalnya Ketua LPPM]]'],
    ['Pos-el', '[[pos-el pejabat penghubung]]'],
  ]),
  A('(2)', 'Perubahan pejabat penghubung diberitahukan secara tertulis kepada **PIHAK** lainnya paling lambat 14 (empat belas) hari kalender sejak perubahan berlaku.'),
]);
pasal(isi, 16, 'LAIN-LAIN', [
  A('(1)', 'Perjanjian ini merupakan bagian yang tidak terpisahkan dari Nota Kesepahaman dan berlaku bagi seluruh Perjanjian Kerja Sama turunannya. Perjanjian Kerja Sama dapat mengatur kerahasiaan secara lebih rinci sepanjang tidak mengurangi perlindungan dalam Perjanjian ini.'),
  A('(2)', 'Perjanjian ini hanya dapat diubah dengan dokumen tertulis yang disepakati dan ditandatangani **PARA PIHAK** dalam bentuk adendum.'),
  A('(3)', 'Perjanjian ini tidak mewajibkan salah satu **PIHAK** untuk menyampaikan informasi tertentu dan tidak menimbulkan kewajiban pembiayaan.'),
  A('(4)', '**PARA PIHAK** tidak dapat mengalihkan hak dan kewajiban dalam Perjanjian ini kepada pihak lain tanpa persetujuan tertulis **PARA PIHAK**.'),
]);
pasal(isi, 17, 'PENUTUP', [
  par('Perjanjian ini dibuat dan ditandatangani oleh **PARA PIHAK** dalam rangkap 2 (dua) asli, bermeterai cukup, dan masing-masing mempunyai kekuatan hukum yang sama.'),
]);
isi.push(...L.ttd(L.BNPB_TTD, ['**PIHAK KEDUA**', '**REKTOR**', '**[[NAMA PERGURUAN TINGGI]],**', '**[[nama Rektor]]**', '[[gelar lengkap]]']));

L.simpan(isi, path.join(__dirname, '..', 'Templat Perjanjian Kerahasiaan BNPB dan Perguruan Tinggi 131126.docx'), 'Templat Perjanjian Kerahasiaan BNPB dan Perguruan Tinggi');
