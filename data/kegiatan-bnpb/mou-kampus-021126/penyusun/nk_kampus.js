// Templat Nota Kesepahaman BNPB dengan Perguruan Tinggi Koordinator (2 Nov 2026).
// Pola baku NK BNPB dengan UGM (2022), UMY (2024), Unpad (2026) ditambah empat pasal baru:
// peran perguruan tinggi koordinator, data dan kerahasiaan, kekayaan intelektual dan publikasi, rujukan payung nasional.
// Naskah dengan pihak nonpemerintah memakai logo BNPB (Perban BNPB 7/2020), bukan lambang negara.
const path = require('path');
const L = require('./nk_lib');
const { A, H, par, pasal } = L;

const isi = [...L.kepala('logo')];
['NOTA KESEPAHAMAN', 'ANTARA', 'BADAN NASIONAL PENANGGULANGAN BENCANA', 'DENGAN', '[[NAMA PERGURUAN TINGGI]]', 'TENTANG',
  'TRIDHARMA PERGURUAN TINGGI DALAM PENANGGULANGAN BENCANA'].forEach((t, i, a) => isi.push(L.tengah(t, i === a.length - 1 ? 200 : 60)));
isi.push(L.nomor('NOMOR\t: [[...]]/KA BNPB/KS.01.01/[[bulan]]/[[tahun]]'));
isi.push(L.nomor('NOMOR\t: [[nomor perguruan tinggi]]'));
isi.push(L.kosong(200));
isi.push(par(L.AKTA));
isi.push(A('I.', L.BNPB_IDENTITAS));
isi.push(A('II.', '**[[NAMA PERGURUAN TINGGI]]**, berkedudukan di [[alamat lengkap]], diwakili oleh **[[nama dan gelar Rektor]]**, selaku Rektor [[nama perguruan tinggi]], yang diangkat berdasarkan [[keputusan Majelis Wali Amanat, Menteri, atau badan penyelenggara]] Nomor [[nomor]] tanggal [[tanggal]] tentang [[judul keputusan]], dalam hal ini bertindak untuk dan atas nama [[nama perguruan tinggi]], selanjutnya disebut **PIHAK KEDUA**.'));
isi.push(par('[[Untuk perguruan tinggi swasta yang diwakili badan penyelenggara: ganti identitas di atas dengan Ketua Pengurus (nama yayasan atau perkumpulan) selaku badan penyelenggara (nama perguruan tinggi), berdasarkan akta pendirian dan anggaran dasar yang berlaku.]]'));
isi.push(par(L.PARA_PIHAK));
[
  ['a.', L.BNPB_KONSIDERANS],
  ['b.', 'bahwa **PIHAK KEDUA** adalah [[perguruan tinggi negeri badan hukum, perguruan tinggi negeri, atau perguruan tinggi swasta]] yang menyelenggarakan pendidikan, penelitian, dan pengabdian kepada masyarakat;'],
  ['c.', 'bahwa Nota Kesepahaman antara Badan Nasional Penanggulangan Bencana dan Kementerian Pendidikan Tinggi, Sains, dan Teknologi Nomor [[nomor]] tentang Penguatan Peran Pendidikan Tinggi, Sains, dan Teknologi dalam Penanggulangan Bencana menjadi rujukan kerja sama **PIHAK KESATU** dengan perguruan tinggi; dan'],
  ['d.', 'bahwa **PARA PIHAK** sepakat untuk melakukan kerja sama yang saling memberikan manfaat dan diselenggarakan secara terencana, terkoordinasi, dan terpadu.'],
].forEach(([l, t]) => isi.push(A(l, t)));
isi.push(par('Berdasarkan hal-hal tersebut di atas, **PARA PIHAK** sepakat untuk membuat dan menandatangani Nota Kesepahaman tentang Tridharma Perguruan Tinggi dalam Penanggulangan Bencana, selanjutnya disebut Nota Kesepahaman, dengan ketentuan sebagai berikut:'));

pasal(isi, 1, 'MAKSUD DAN TUJUAN', [
  A('(1)', 'Nota Kesepahaman ini dimaksudkan untuk menyelaraskan kegiatan Tridharma Perguruan Tinggi, yaitu pendidikan, penelitian, dan pengabdian kepada masyarakat, di bidang penanggulangan bencana dalam rangka pelaksanaan tugas dan fungsi **PIHAK KESATU** dan misi **PIHAK KEDUA**.'),
  A('(2)', 'Nota Kesepahaman ini bertujuan untuk memadukan kemampuan **PARA PIHAK** dalam meningkatkan perencanaan dan pelaksanaan penanggulangan bencana di Indonesia.'),
]);
pasal(isi, 2, 'RUANG LINGKUP', [
  par('Ruang lingkup Nota Kesepahaman ini meliputi:'),
  A('a.', 'pendidikan, penelitian, dan pengabdian kepada masyarakat di bidang penanggulangan bencana;'),
  A('b.', 'dukungan kegiatan penanggulangan bencana pada tahap prabencana, keadaan darurat bencana, dan pascabencana;'),
  A('c.', 'peningkatan kapasitas sumber daya manusia; dan'),
  A('d.', 'kegiatan lain yang disepakati **PARA PIHAK** sepanjang tidak bertentangan dengan ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 3, 'PELAKSANAAN', [
  A('(1)', 'Dalam melaksanakan Nota Kesepahaman ini, **PARA PIHAK** tunduk pada ketentuan peraturan perundang-undangan.'),
  A('(2)', 'Pelaksanaan Nota Kesepahaman ini dirumuskan secara rinci dalam Perjanjian Kerja Sama dan/atau dokumen lain yang disepakati antara unit kerja di lingkungan **PIHAK KESATU** dan unit kerja di lingkungan **PIHAK KEDUA**.'),
  A('(3)', 'Untuk menyusun Perjanjian Kerja Sama sebagaimana dimaksud pada ayat (2), **PARA PIHAK** menunjuk wakil sesuai dengan tugas dan fungsinya.'),
]);
pasal(isi, 4, 'PERAN PERGURUAN TINGGI KOORDINATOR', [
  A('(1)', '**PARA PIHAK** sepakat menunjuk **PIHAK KEDUA** sebagai perguruan tinggi koordinator untuk [[regional atau tematik, misalnya: Jawa Barat]].'),
  A('(2)', 'Sebagai perguruan tinggi koordinator, **PIHAK KEDUA** berperan:'),
  H('a.', 'memfasilitasi koordinasi dengan perguruan tinggi lain yang bersedia ikut serta dalam program kerja sama perguruan tinggi yang dikoordinasikan **PIHAK KESATU**, bersama lembaga layanan pendidikan tinggi setempat;'),
  H('b.', 'menjadi simpul pelaksanaan kuliah kerja nyata tematik kebencanaan, magang, dan relawan kampus di [[wilayah atau bidang tematiknya]]; dan'),
  H('c.', 'menyampaikan laporan kegiatan koordinasi kepada **PIHAK KESATU**.'),
  A('(3)', 'Peran sebagaimana dimaksud pada ayat (2) tidak mengurangi hak perguruan tinggi lain untuk bekerja sama langsung dengan **PIHAK KESATU**.'),
  A('(4)', 'Peran perguruan tinggi koordinator tidak menjadikan **PIHAK KEDUA** wakil perguruan tinggi lain dan tidak menimbulkan kewajiban pembiayaan.'),
]);
pasal(isi, 5, 'JANGKA WAKTU', [
  A('(1)', 'Nota Kesepahaman ini berlaku untuk jangka waktu 5 (lima) tahun terhitung sejak tanggal ditandatangani.'),
  A('(2)', 'Jangka waktu sebagaimana dimaksud pada ayat (1) dapat diperpanjang berdasarkan kesepakatan tertulis **PARA PIHAK** yang diusulkan oleh salah satu **PIHAK** paling lambat 90 (sembilan puluh) hari kalender sebelum Nota Kesepahaman ini berakhir.'),
  A('(3)', 'Salah satu **PIHAK** dapat mengakhiri Nota Kesepahaman ini sebelum jangka waktunya berakhir dengan pemberitahuan tertulis kepada **PIHAK** lainnya paling lambat 90 (sembilan puluh) hari kalender sebelum tanggal pengakhiran yang dikehendaki.'),
  A('(4)', 'Berakhirnya Nota Kesepahaman ini tidak memengaruhi Perjanjian Kerja Sama yang masih berjalan sampai berakhirnya jangka waktu Perjanjian Kerja Sama tersebut, kecuali **PARA PIHAK** menentukan lain.'),
]);
pasal(isi, 6, 'PEMBIAYAAN', [
  par('Pembiayaan yang timbul dari pelaksanaan Perjanjian Kerja Sama sebagaimana dimaksud dalam Pasal 3 dibebankan kepada anggaran masing-masing **PIHAK** sesuai dengan tugas dan tanggung jawabnya dan/atau sumber pembiayaan lain yang sah dan tidak mengikat berdasarkan kesepakatan **PARA PIHAK**, sesuai dengan ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 7, 'DATA DAN KERAHASIAAN', [
  A('(1)', 'Akses dan pemanfaatan data bencana oleh **PIHAK KEDUA** dilaksanakan sesuai dengan Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2023 tentang Satu Data Bencana.'),
  A('(2)', '**PARA PIHAK** menjaga kerahasiaan informasi yang dikecualikan dan melindungi data pribadi sesuai dengan ketentuan peraturan perundang-undangan.'),
  A('(3)', 'Data dan informasi yang diperoleh dari **PIHAK** lainnya tidak diberikan kepada pihak ketiga tanpa persetujuan tertulis **PIHAK** pemilik data, kecuali diwajibkan oleh ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 8, 'KEKAYAAN INTELEKTUAL DAN PUBLIKASI', [
  A('(1)', 'Kekayaan intelektual yang timbul dari pelaksanaan Nota Kesepahaman ini diatur dalam Perjanjian Kerja Sama dengan memperhatikan kontribusi masing-masing **PIHAK**, tanpa mengurangi hak moral pencipta dan hak inventor untuk dicantumkan namanya.'),
  A('(2)', 'Publikasi hasil kegiatan yang memuat data **PIHAK** lainnya dilakukan sesuai dengan Pasal 7 dan setelah mendapat persetujuan tertulis **PIHAK** pemilik data.'),
  A('(3)', 'Nama penulis atau pencipta dicantumkan dalam karya ilmiah dan karya cipta yang dihasilkan sesuai dengan kaidah ilmiah.'),
]);
pasal(isi, 9, 'EVALUASI', [
  par('**PARA PIHAK** melakukan evaluasi pelaksanaan Nota Kesepahaman ini paling sedikit 1 (satu) kali dalam 1 (satu) tahun.'),
]);
pasal(isi, 10, 'PENYELESAIAN PERSELISIHAN', [
  par('Dalam hal terjadi perbedaan penafsiran atau perselisihan dalam pelaksanaan Nota Kesepahaman ini, **PARA PIHAK** menyelesaikannya secara musyawarah untuk mufakat.'),
]);
pasal(isi, 11, 'KORESPONDENSI', [
  A('(1)', 'Seluruh surat-menyurat dan dokumen lain yang berkaitan dengan Nota Kesepahaman ini dialamatkan kepada:'),
  ...L.alamat('BADAN NASIONAL PENANGGULANGAN BENCANA', L.BNPB_ALAMAT),
  ...L.alamat('[[NAMA PERGURUAN TINGGI]]', [
    ['Alamat', '[[alamat lengkap]]'],
    ['Telepon', '[[nomor telepon]]'],
    ['Pos-el', '[[pos-el unit kerja sama]]'],
    ['U.p.', '[[unit kerja sama atau wakil rektor bidang kerja sama]]'],
  ]),
  A('(2)', 'Dalam hal terjadi perubahan alamat sebagaimana dimaksud pada ayat (1), **PIHAK** yang mengubah alamat memberitahukan secara tertulis kepada **PIHAK** lainnya paling lambat 14 (empat belas) hari kalender sejak perubahan berlaku efektif. Kelalaian menyampaikan pemberitahuan perubahan alamat menjadi tanggung jawab **PIHAK** yang mengubah alamat.'),
]);
pasal(isi, 12, 'RUJUKAN PAYUNG NASIONAL', [
  A('(1)', 'Pelaksanaan Nota Kesepahaman ini diselaraskan dengan Nota Kesepahaman sebagaimana dimaksud dalam huruf c bagian pembukaan. Berakhir atau berubahnya Nota Kesepahaman tersebut tidak mengakhiri Nota Kesepahaman ini.'),
  A('(2)', 'Nota Kesepahaman **PARA PIHAK** Nomor [[nomor]] tanggal [[tanggal]] dicabut dan dinyatakan tidak berlaku sejak Nota Kesepahaman ini ditandatangani, tanpa mengurangi hak dan kewajiban yang telah timbul. Perjanjian Kerja Sama yang masih berjalan tetap berlaku sampai berakhir dan selanjutnya merujuk Nota Kesepahaman ini. [[Bila belum ada nota kesepahaman sebelumnya, hapus ayat ini.]]'),
]);
pasal(isi, 13, 'LAIN-LAIN', [
  A('(1)', 'Nota Kesepahaman ini hanya dapat diubah dengan dokumen tertulis yang disepakati dan ditandatangani **PARA PIHAK** dalam bentuk adendum.'),
  A('(2)', 'Nota Kesepahaman ini tidak dimaksudkan untuk membatasi **PARA PIHAK** bekerja sama dengan pihak lain untuk maksud dan tujuan yang sama (*non binding* dan non eksklusif), dan tidak menimbulkan kewajiban pembiayaan; kewajiban tersebut diatur dalam Perjanjian Kerja Sama.'),
  A('(3)', '**PARA PIHAK** tidak dapat mengalihkan Nota Kesepahaman ini kepada pihak lain tanpa persetujuan tertulis **PARA PIHAK**.'),
]);
pasal(isi, 14, 'PENUTUP', [
  par('Nota Kesepahaman ini dibuat dan ditandatangani oleh **PARA PIHAK** dalam rangkap 2 (dua) asli, bermeterai cukup, dan masing-masing mempunyai kekuatan hukum yang sama.'),
]);
isi.push(...L.ttd(L.BNPB_TTD, ['**PIHAK KEDUA**', '**REKTOR**', '**[[NAMA PERGURUAN TINGGI]],**', '**[[nama Rektor]]**', '[[gelar lengkap]]']));

L.simpan(isi, path.join(__dirname, '..', 'Templat NK BNPB dan Perguruan Tinggi Koordinator 021126.docx'), 'Templat Nota Kesepahaman BNPB dan Perguruan Tinggi Koordinator');
