// Penyusun naskah Nota Kesepahaman BNPB dan Kemdiktisaintek (draf 2 Nov 2026, diselaraskan 12 Nov 2026).
// Jalankan: NODE_PATH=~/laporan_bulanan/node_modules node nk_payung_kemdiktisaintek.js
// Pola mengikuti NK BNPB dengan UMY (2024) dan Unpad (2026). Isi diselaraskan dengan deck
// "Ajuan Program Kerja Sama BNPB dengan Perguruan Tinggi 301026 rev5" (empat pilar, 15 program,
// peran Kemdiktisaintek di halaman mitra). Isian yang belum pasti ditandai stabilo kuning.
const path = require('path');
const L = require('./nk_lib');
const { A, H, par, pasal } = L;

const isi = [...L.kepala('[[logo Kemdiktisaintek]]')];
['NOTA KESEPAHAMAN', 'ANTARA', 'BADAN NASIONAL PENANGGULANGAN BENCANA', 'DENGAN',
  'KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI', 'TENTANG',
  'PENGUATAN PERAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI', 'DALAM PENANGGULANGAN BENCANA'].forEach((t, i, a) =>
  isi.push(L.tengah(t, i === a.length - 1 ? 200 : 60)));
isi.push(L.nomor('NOMOR\t: [[...]]/KA BNPB/KS.01.01/[[bulan]]/[[tahun]]'));
isi.push(L.nomor('NOMOR\t: [[nomor Kemdiktisaintek]]'));
isi.push(L.kosong(200));

isi.push(par(L.AKTA));
isi.push(A('I.', L.BNPB_IDENTITAS));
isi.push(A('II.', '**KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI**, berkedudukan di Jalan Jenderal Sudirman, Senayan, Jakarta Pusat 10270, diwakili oleh **Brian Yuliarto** [[gelar lengkap]], selaku Menteri Pendidikan Tinggi, Sains, dan Teknologi Republik Indonesia, yang diangkat berdasarkan Keputusan Presiden Republik Indonesia Nomor [[nomor]] Tahun [[tahun]] tentang [[judul keputusan]], dalam hal ini bertindak untuk dan atas nama Kementerian Pendidikan Tinggi, Sains, dan Teknologi, selanjutnya disebut **PIHAK KEDUA**.'));
isi.push(par(L.PARA_PIHAK));
[
  ['a.', L.BNPB_KONSIDERANS],
  ['b.', 'bahwa **PIHAK KEDUA** adalah kementerian yang menyelenggarakan urusan pemerintahan di bidang pendidikan tinggi, sains, dan teknologi sebagaimana dimaksud dalam Peraturan Presiden Nomor 189 Tahun 2024 tentang Kementerian Pendidikan Tinggi, Sains, dan Teknologi sebagaimana telah diubah dengan Peraturan Presiden Nomor 7 Tahun 2026;'],
  ['c.', 'bahwa Undang-Undang Nomor 12 Tahun 2012 tentang Pendidikan Tinggi mendorong perguruan tinggi menggalang kerja sama di bidang penelitian dan pengabdian kepada masyarakat;'],
  ['d.', 'bahwa Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2025 tentang Rencana Nasional Penanggulangan Bencana Tahun 2025–2029 menempatkan kementerian yang membidangi pendidikan tinggi serta perguruan tinggi sebagai kontributor kegiatan riset kebencanaan;'],
  ['e.', 'bahwa kerja sama **PIHAK KESATU** dengan perguruan tinggi selama ini berjalan sendiri-sendiri per perguruan tinggi dan belum berada dalam satu kerangka nasional; dan'],
  ['f.', 'bahwa **PARA PIHAK** bermaksud menyinergikan tugas, fungsi, dan sumber daya masing-masing untuk memperkuat peran pendidikan tinggi, sains, dan teknologi dalam penanggulangan bencana secara terencana, terkoordinasi, dan terpadu.'],
].forEach(([l, t]) => isi.push(A(l, t)));
isi.push(par('Berdasarkan hal-hal tersebut di atas, **PARA PIHAK** sepakat untuk membuat dan menandatangani Nota Kesepahaman tentang Penguatan Peran Pendidikan Tinggi, Sains, dan Teknologi dalam Penanggulangan Bencana, selanjutnya disebut Nota Kesepahaman, dengan ketentuan sebagai berikut:'));

pasal(isi, 1, 'MAKSUD DAN TUJUAN', [
  A('(1)', 'Nota Kesepahaman ini dimaksudkan sebagai kerangka nasional bagi **PARA PIHAK** dalam melaksanakan kerja sama penguatan peran pendidikan tinggi, sains, dan teknologi dalam penanggulangan bencana.'),
  A('(2)', 'Nota Kesepahaman ini bertujuan untuk:'),
  H('a.', 'menjembatani kebutuhan ilmu pengetahuan dan teknologi **PIHAK KESATU** dan badan penanggulangan bencana daerah dengan inovasi, riset, teknologi, dan kepakaran perguruan tinggi;'),
  H('b.', 'memperluas pendidikan kebencanaan di perguruan tinggi;'),
  H('c.', 'meningkatkan pemanfaatan hasil riset dan inovasi perguruan tinggi pada tahap prabencana, keadaan darurat bencana, dan pascabencana; dan'),
  H('d.', 'memperkuat pengabdian kepada masyarakat dan kerelawanan sivitas akademika di bidang penanggulangan bencana.'),
]);
pasal(isi, 2, 'RUANG LINGKUP', [
  par('Ruang lingkup Nota Kesepahaman ini meliputi:'),
  A('a.', 'pendidikan kebencanaan, termasuk mata kuliah kebencanaan dengan modul baku, mata kuliah pilihan lintas program studi, dan kuliah umum Kepala Badan Nasional Penanggulangan Bencana di perguruan tinggi;'),
  A('b.', 'magang mahasiswa di lingkungan **PIHAK KESATU** dan kuliah kerja nyata tematik kebencanaan di desa rawan bencana yang diakui sebagai satuan kredit semester sesuai dengan ketentuan peraturan perundang-undangan;'),
  A('c.', 'riset dan inovasi kebencanaan, termasuk daftar masalah kebencanaan dari **PIHAK KESATU** dan badan penanggulangan bencana daerah, agenda riset kebencanaan, hibah riset bersama, uji lapangan, dan hilirisasi inovasi;'),
  A('d.', 'pemanfaatan data dan informasi kebencanaan, termasuk Data dan Informasi Bencana Indonesia dan InaRISK, untuk pendidikan dan riset;'),
  A('e.', 'pengabdian kepada masyarakat dan kerelawanan, termasuk relawan bencana kampus yang terlatih dan terdaftar di **PIHAK KESATU**, satuan tugas bencana mahasiswa, alumni, dan perguruan tinggi, serta kampus aman bencana;'),
  A('f.', 'pendampingan badan penanggulangan bencana daerah oleh perguruan tinggi dalam penyusunan kajian risiko bencana, rencana penanggulangan bencana, dan indeks ketahanan daerah;'),
  A('g.', 'forum ilmiah tahunan, jurnal kebencanaan bersama, dan riset bersama perguruan tinggi dengan mitra luar negeri; dan'),
  A('h.', 'kegiatan lain yang disepakati **PARA PIHAK** sesuai dengan tugas dan fungsi masing-masing.'),
]);
pasal(isi, 3, 'PELAKSANAAN', [
  A('(1)', 'Dalam melaksanakan Nota Kesepahaman ini, **PARA PIHAK** tunduk pada ketentuan peraturan perundang-undangan.'),
  A('(2)', 'Pelaksanaan ruang lingkup sebagaimana dimaksud dalam Pasal 2 dituangkan dalam:'),
  H('a.', 'Perjanjian Kerja Sama antara unit kerja di lingkungan **PIHAK KESATU** dan unit kerja di lingkungan **PIHAK KEDUA**; dan/atau'),
  H('b.', 'Nota Kesepahaman atau Perjanjian Kerja Sama antara **PIHAK KESATU** dan perguruan tinggi.'),
  A('(3)', 'Perjanjian Kerja Sama sebagaimana dimaksud pada ayat (2) paling sedikit memuat rencana kegiatan, hak dan kewajiban, pembiayaan, hasil kegiatan, kekayaan intelektual, kerahasiaan, keadaan kahar, jangka waktu, penyelesaian perselisihan, dan perubahan.'),
  A('(4)', 'Untuk menyusun dan melaksanakan Perjanjian Kerja Sama sebagaimana dimaksud pada ayat (2), **PARA PIHAK** menunjuk wakil sesuai dengan tugas dan fungsinya.'),
]);
pasal(isi, 4, 'PERAN PARA PIHAK', [
  A('(1)', 'Dalam pelaksanaan Nota Kesepahaman ini, **PIHAK KESATU** berperan:'),
  H('a.', 'menyusun dan memutakhirkan daftar masalah kebencanaan dari unit kerja **PIHAK KESATU** dan badan penanggulangan bencana daerah sebagai bahan agenda riset kebencanaan;'),
  H('b.', 'menyediakan akses data dan informasi kebencanaan sebagaimana dimaksud dalam Pasal 8;'),
  H('c.', 'menyediakan tempat magang, narasumber kuliah umum, dan lokasi uji lapangan bersama pemerintah daerah dan badan penanggulangan bencana daerah; dan'),
  H('d.', 'melatih dan mendaftarkan relawan bencana kampus serta melibatkannya dalam penanggulangan bencana sesuai dengan ketentuan peraturan perundang-undangan.'),
  A('(2)', 'Dalam pelaksanaan Nota Kesepahaman ini, **PIHAK KEDUA** berperan:'),
  H('a.', 'mendorong perguruan tinggi menyelenggarakan mata kuliah kebencanaan;'),
  H('b.', 'mendorong pengakuan magang dan kuliah kerja nyata tematik kebencanaan sebagai satuan kredit semester sesuai dengan kebijakan pembelajaran di pendidikan tinggi;'),
  H('c.', 'membuka kesempatan bagi riset, inovasi, dan pengabdian kepada masyarakat di bidang kebencanaan dalam skema pendanaan yang dikelola **PIHAK KEDUA**, sesuai dengan ketentuan peraturan perundang-undangan; dan'),
  H('d.', 'menyebarluaskan program kerja sama kepada perguruan tinggi melalui lembaga layanan pendidikan tinggi.'),
  A('(3)', '**PIHAK KEDUA** mendorong dan memfasilitasi perguruan tinggi untuk berperan serta dalam pelaksanaan Nota Kesepahaman ini dengan menghormati otonomi perguruan tinggi.'),
]);
pasal(isi, 5, 'TIM KOORDINASI', [
  A('(1)', '**PARA PIHAK** membentuk tim koordinasi bersama untuk mengoordinasikan pelaksanaan Nota Kesepahaman ini.'),
  A('(2)', 'Tim koordinasi sebagaimana dimaksud pada ayat (1) bertugas:'),
  H('a.', 'menyusun rencana kerja tahunan;'),
  H('b.', 'memantau pelaksanaan Perjanjian Kerja Sama; dan'),
  H('c.', 'menyampaikan laporan kepada pimpinan **PARA PIHAK**.'),
  A('(3)', 'Sekretariat tim koordinasi berkedudukan di Biro Hukum, Organisasi, dan Kerja Sama **PIHAK KESATU** dan unit kerja yang ditunjuk **PIHAK KEDUA**.'),
  A('(4)', 'Susunan keanggotaan tim koordinasi ditetapkan bersama oleh **PARA PIHAK**; wakil masing-masing **PIHAK** ditunjuk sesuai dengan tugas dan fungsinya.'),
]);
pasal(isi, 6, 'PELAKSANAAN REGIONAL DAN TEMATIK', [
  A('(1)', 'Pelaksanaan Nota Kesepahaman ini dapat diselenggarakan per regional yang mencakup seluruh provinsi dan per bidang tematik.'),
  A('(2)', '**PARA PIHAK** dapat menunjuk perguruan tinggi koordinator regional dan tematik untuk memfasilitasi koordinasi dengan perguruan tinggi lain di wilayah atau bidangnya, bersama lembaga layanan pendidikan tinggi setempat.'),
  A('(3)', 'Penunjukan perguruan tinggi koordinator sebagaimana dimaksud pada ayat (2) dilakukan dengan persetujuan pimpinan perguruan tinggi yang bersangkutan dan tidak mengurangi hak perguruan tinggi lain untuk bekerja sama langsung dengan **PIHAK KESATU**.'),
  A('(4)', 'Nota Kesepahaman atau Perjanjian Kerja Sama antara **PIHAK KESATU** dan perguruan tinggi merujuk Nota Kesepahaman ini.'),
]);
pasal(isi, 7, 'PEMBIAYAAN', [
  par('Pembiayaan yang timbul dari pelaksanaan Perjanjian Kerja Sama sebagaimana dimaksud dalam Pasal 3 dibebankan kepada anggaran masing-masing **PIHAK** sesuai dengan tugas dan tanggung jawabnya dan/atau sumber pembiayaan lain yang sah dan tidak mengikat berdasarkan kesepakatan **PARA PIHAK**, sesuai dengan ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 8, 'DATA DAN INFORMASI', [
  A('(1)', '**PARA PIHAK** saling memanfaatkan data dan informasi yang diperlukan untuk pelaksanaan Nota Kesepahaman ini.'),
  A('(2)', 'Pertukaran dan pemanfaatan data bencana dilaksanakan sesuai dengan Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2023 tentang Satu Data Bencana.'),
  A('(3)', '**PARA PIHAK** menjaga kerahasiaan informasi yang dikecualikan dan melindungi data pribadi sesuai dengan ketentuan peraturan perundang-undangan.'),
  A('(4)', 'Data dan informasi yang diperoleh dari **PIHAK** lainnya tidak diberikan kepada pihak ketiga tanpa persetujuan tertulis **PIHAK** pemilik data, kecuali diwajibkan oleh ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 9, 'KEKAYAAN INTELEKTUAL', [
  A('(1)', 'Kekayaan intelektual yang timbul dari pelaksanaan Nota Kesepahaman ini diatur dalam Perjanjian Kerja Sama dengan memperhatikan kontribusi masing-masing pihak.'),
  A('(2)', 'Pengaturan sebagaimana dimaksud pada ayat (1) tidak mengurangi hak moral pencipta dan hak inventor untuk dicantumkan namanya.'),
  A('(3)', 'Nama penulis atau pencipta dicantumkan dalam karya ilmiah dan karya cipta yang dihasilkan sesuai dengan kaidah ilmiah.'),
]);
pasal(isi, 10, 'PEMANTAUAN DAN EVALUASI', [
  A('(1)', '**PARA PIHAK** melakukan pemantauan dan evaluasi pelaksanaan Nota Kesepahaman ini paling sedikit 1 (satu) kali dalam 1 (satu) tahun atau sewaktu-waktu sesuai dengan kesepakatan **PARA PIHAK**.'),
  A('(2)', 'Hasil pemantauan dan evaluasi sebagaimana dimaksud pada ayat (1) dilaporkan kepada pimpinan **PARA PIHAK** dan menjadi bahan perencanaan kerja sama berikutnya.'),
]);
pasal(isi, 11, 'JANGKA WAKTU', [
  A('(1)', 'Nota Kesepahaman ini berlaku untuk jangka waktu 5 (lima) tahun terhitung sejak tanggal ditandatangani.'),
  A('(2)', 'Jangka waktu sebagaimana dimaksud pada ayat (1) dapat diperpanjang berdasarkan kesepakatan tertulis **PARA PIHAK** yang diusulkan oleh salah satu **PIHAK** paling lambat 90 (sembilan puluh) hari kalender sebelum Nota Kesepahaman ini berakhir.'),
  A('(3)', 'Salah satu **PIHAK** dapat mengakhiri Nota Kesepahaman ini sebelum jangka waktunya berakhir dengan pemberitahuan tertulis kepada **PIHAK** lainnya paling lambat 90 (sembilan puluh) hari kalender sebelum tanggal pengakhiran yang dikehendaki.'),
  A('(4)', 'Berakhirnya Nota Kesepahaman ini tidak memengaruhi Perjanjian Kerja Sama yang masih berjalan sampai berakhirnya jangka waktu Perjanjian Kerja Sama tersebut, kecuali **PARA PIHAK** menentukan lain.'),
]);
pasal(isi, 12, 'PENYELESAIAN PERSELISIHAN', [
  par('Dalam hal terjadi perbedaan penafsiran atau perselisihan dalam pelaksanaan Nota Kesepahaman ini, **PARA PIHAK** menyelesaikannya secara musyawarah untuk mufakat.'),
]);
pasal(isi, 13, 'KORESPONDENSI', [
  A('(1)', 'Seluruh surat-menyurat dan dokumen lain yang berkaitan dengan Nota Kesepahaman ini dialamatkan kepada:'),
  ...L.alamat('BADAN NASIONAL PENANGGULANGAN BENCANA', L.BNPB_ALAMAT),
  ...L.alamat('KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI', [
    ['Alamat', 'Jalan Jenderal Sudirman, Senayan, Jakarta Pusat 10270'],
    ['Telepon', '[[nomor telepon]]'],
    ['Pos-el', '[[pos-el unit kerja sama]]'],
    ['U.p.', '[[unit kerja yang membidangi kerja sama]]'],
  ]),
  A('(2)', 'Dalam hal terjadi perubahan alamat sebagaimana dimaksud pada ayat (1), **PIHAK** yang mengubah alamat memberitahukan secara tertulis kepada **PIHAK** lainnya paling lambat 14 (empat belas) hari kalender sejak perubahan berlaku efektif. Kelalaian menyampaikan pemberitahuan perubahan alamat menjadi tanggung jawab **PIHAK** yang mengubah alamat.'),
]);
pasal(isi, 14, 'LAIN-LAIN', [
  A('(1)', 'Nota Kesepahaman ini hanya dapat diubah dengan dokumen tertulis yang disepakati dan ditandatangani **PARA PIHAK** dalam bentuk adendum yang merupakan bagian tidak terpisahkan dari Nota Kesepahaman ini.'),
  A('(2)', 'Nota Kesepahaman ini tidak dimaksudkan untuk membatasi **PARA PIHAK** bekerja sama dengan pihak lain untuk maksud dan tujuan yang sama (*non binding* dan non eksklusif), dan tidak menimbulkan kewajiban pembiayaan; kewajiban tersebut diatur dalam Perjanjian Kerja Sama.'),
  A('(3)', 'Nota Kesepahaman dan Perjanjian Kerja Sama antara **PIHAK KESATU** dan perguruan tinggi yang telah ada sebelum Nota Kesepahaman ini tetap berlaku sampai berakhirnya jangka waktunya dan dapat diselaraskan dengan Nota Kesepahaman ini pada saat diperpanjang.'),
  A('(4)', '**PARA PIHAK** tidak dapat mengalihkan Nota Kesepahaman ini kepada pihak lain tanpa persetujuan tertulis **PARA PIHAK**.'),
]);
pasal(isi, 15, 'PENUTUP', [
  par('Nota Kesepahaman ini dibuat dan ditandatangani oleh **PARA PIHAK** dalam rangkap 2 (dua) asli, bermeterai cukup, dan masing-masing mempunyai kekuatan hukum yang sama.'),
]);
isi.push(...L.ttd(L.BNPB_TTD, ['**PIHAK KEDUA**', '**MENTERI PENDIDIKAN TINGGI,**', '**SAINS, DAN TEKNOLOGI,**', '**Brian Yuliarto**', '[[gelar lengkap]]']));

L.simpan(isi, path.join(__dirname, '..', 'Draf NK BNPB dan Kemdiktisaintek 021126.docx'), 'Draf Nota Kesepahaman BNPB dan Kemdiktisaintek');
