// Draf Nota Kesepahaman BNPB dan BRIN (2 Nov 2026). Kerangka: deck analisis Lampiran A (bagian BRIN),
// Peraturan BRIN 2/2022 jo. 4/2024 (NK sebagai payung, PKS memuat muatan minimum), Renas PB 2025-2029.
const path = require('path');
const L = require('./nk_lib');
const { A, H, par, pasal } = L;

const isi = [...L.kepala('lambang')];
['NOTA KESEPAHAMAN', 'ANTARA', 'BADAN NASIONAL PENANGGULANGAN BENCANA', 'DENGAN', 'BADAN RISET DAN INOVASI NASIONAL', 'TENTANG',
  'RISET DAN INOVASI UNTUK PENANGGULANGAN BENCANA'].forEach((t, i, a) => isi.push(L.tengah(t, i === a.length - 1 ? 200 : 60)));
isi.push(L.nomor('NOMOR\t: [[...]]/KA BNPB/KS.01.01/[[bulan]]/[[tahun]]'));
isi.push(L.nomor('NOMOR\t: [[nomor BRIN]]'));
isi.push(L.kosong(200));
isi.push(par(L.AKTA));
isi.push(A('I.', L.BNPB_IDENTITAS));
isi.push(A('II.', '**BADAN RISET DAN INOVASI NASIONAL**, berkedudukan di Gedung B.J. Habibie, Jalan M.H. Thamrin Nomor 8, Jakarta Pusat 10340, diwakili oleh **Arif Satria** [[gelar lengkap]], selaku Kepala Badan Riset dan Inovasi Nasional, yang diangkat berdasarkan Keputusan Presiden Republik Indonesia Nomor 123/P Tahun 2025 tentang [[judul keputusan]], dalam hal ini bertindak untuk dan atas nama Badan Riset dan Inovasi Nasional, selanjutnya disebut **PIHAK KEDUA**.'));
isi.push(par(L.PARA_PIHAK));
[
  ['a.', L.BNPB_KONSIDERANS],
  ['b.', 'bahwa **PIHAK KEDUA** adalah lembaga pemerintah yang menyelenggarakan penelitian, pengembangan, pengkajian, dan penerapan, serta invensi dan inovasi secara terintegrasi sebagaimana dimaksud dalam Peraturan Presiden Nomor 78 Tahun 2021 tentang Badan Riset dan Inovasi Nasional;'],
  ['c.', 'bahwa Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2025 tentang Rencana Nasional Penanggulangan Bencana Tahun 2025–2029 menempatkan **PIHAK KEDUA** sebagai kontributor kegiatan riset kebencanaan;'],
  ['d.', 'bahwa kerja sama di lingkungan **PIHAK KEDUA** diselenggarakan berdasarkan Peraturan Badan Riset dan Inovasi Nasional Nomor 2 Tahun 2022 tentang Penyelenggaraan Kerja Sama di Lingkungan Badan Riset dan Inovasi Nasional sebagaimana telah diubah dengan Peraturan Badan Riset dan Inovasi Nasional Nomor 4 Tahun 2024; dan'],
  ['e.', 'bahwa **PARA PIHAK** bermaksud menyinergikan tugas, fungsi, dan sumber daya masing-masing agar penanggulangan bencana didukung hasil riset dan inovasi secara terencana, terkoordinasi, dan terpadu.'],
].forEach(([l, t]) => isi.push(A(l, t)));
isi.push(par('Berdasarkan hal-hal tersebut di atas, **PARA PIHAK** sepakat untuk membuat dan menandatangani Nota Kesepahaman tentang Riset dan Inovasi untuk Penanggulangan Bencana, selanjutnya disebut Nota Kesepahaman, dengan ketentuan sebagai berikut:'));

pasal(isi, 1, 'MAKSUD DAN TUJUAN', [
  A('(1)', 'Nota Kesepahaman ini dimaksudkan sebagai pedoman bagi **PARA PIHAK** dalam melaksanakan kerja sama riset dan inovasi untuk penanggulangan bencana.'),
  A('(2)', 'Nota Kesepahaman ini bertujuan untuk:'),
  H('a.', 'menjadikan masalah penanggulangan bencana bahan pertimbangan dalam penyusunan agenda riset sesuai dengan kewenangan **PIHAK KEDUA**;'),
  H('b.', 'mempercepat penerapan hasil riset dan inovasi dalam kebijakan dan operasi penanggulangan bencana; dan'),
  H('c.', 'mengoptimalkan pemanfaatan data, infrastruktur riset, dan sumber daya manusia **PARA PIHAK**.'),
]);
pasal(isi, 2, 'RUANG LINGKUP', [
  par('Ruang lingkup Nota Kesepahaman ini meliputi:'),
  A('a.', 'penyusunan agenda riset bersama berdasarkan daftar masalah kebencanaan;'),
  A('b.', 'pemanfaatan infrastruktur riset, laboratorium, dan layanan sains;'),
  A('c.', 'pertukaran dan pemanfaatan data dan informasi, termasuk data penginderaan jauh;'),
  A('d.', 'uji lapangan, penerapan, dan hilirisasi hasil riset dan inovasi;'),
  A('e.', 'pendanaan riset kebencanaan melalui skema yang tersedia sesuai dengan ketentuan peraturan perundang-undangan;'),
  A('f.', 'kerja sama riset dengan mitra luar negeri dengan memperhatikan ketentuan hubungan luar negeri;'),
  A('g.', 'peningkatan kapasitas sumber daya manusia, termasuk pertukaran tenaga ahli; dan'),
  A('h.', 'kegiatan lain yang disepakati **PARA PIHAK** sesuai dengan tugas dan fungsi masing-masing.'),
]);
pasal(isi, 3, 'PELAKSANAAN', [
  A('(1)', 'Dalam melaksanakan Nota Kesepahaman ini, **PARA PIHAK** tunduk pada ketentuan peraturan perundang-undangan.'),
  A('(2)', 'Pelaksanaan ruang lingkup sebagaimana dimaksud dalam Pasal 2 dituangkan dalam Perjanjian Kerja Sama antara unit kerja di lingkungan **PIHAK KESATU** dan organisasi riset atau pusat riset di lingkungan **PIHAK KEDUA**.'),
  A('(3)', 'Perjanjian Kerja Sama sebagaimana dimaksud pada ayat (2) dapat melibatkan perguruan tinggi atau kementerian yang membidangi pendidikan tinggi sesuai dengan kesepakatan dalam Perjanjian Kerja Sama tersebut, selaras dengan Nota Kesepahaman antara Badan Nasional Penanggulangan Bencana dan Kementerian Pendidikan Tinggi, Sains, dan Teknologi.'),
  A('(4)', 'Perjanjian Kerja Sama sebagaimana dimaksud pada ayat (2) paling sedikit memuat rencana kegiatan, hak dan kewajiban, pembiayaan, hasil kegiatan, kekayaan intelektual, kerahasiaan, keadaan kahar, jangka waktu, penyelesaian perselisihan, dan perubahan.'),
]);
pasal(isi, 4, 'PERAN PARA PIHAK', [
  A('(1)', 'Dalam pelaksanaan Nota Kesepahaman ini, **PIHAK KESATU** berperan:'),
  H('a.', 'menyampaikan daftar masalah dan kebutuhan riset penanggulangan bencana;'),
  H('b.', 'menyediakan data sesuai dengan kewenangannya dan memfasilitasi koordinasi lokasi uji lapangan dengan pemerintah daerah dan badan penanggulangan bencana daerah; dan'),
  H('c.', 'memanfaatkan hasil riset dan inovasi dalam kebijakan dan operasi penanggulangan bencana.'),
  A('(2)', 'Dalam pelaksanaan Nota Kesepahaman ini, **PIHAK KEDUA** berperan:'),
  H('a.', 'menugaskan periset dan pusat riset yang relevan;'),
  H('b.', 'membuka akses infrastruktur riset sesuai dengan ketentuan peraturan perundang-undangan; dan'),
  H('c.', 'menyampaikan hasil riset dan inovasi kepada **PIHAK KESATU** sesuai dengan Perjanjian Kerja Sama.'),
]);
pasal(isi, 5, 'KOORDINASI', [
  A('(1)', '**PARA PIHAK** menunjuk pejabat penghubung sesuai dengan tugas dan fungsinya untuk mengoordinasikan pelaksanaan Nota Kesepahaman ini serta penyusunan dan pelaksanaan Perjanjian Kerja Sama.'),
  A('(2)', 'Pejabat penghubung sebagaimana dimaksud pada ayat (1) menyusun rencana kerja tahunan bersama dan memantau pelaksanaan Perjanjian Kerja Sama.'),
]);
pasal(isi, 6, 'PEMBIAYAAN', [
  A('(1)', 'Pembiayaan yang timbul dari pelaksanaan Perjanjian Kerja Sama sebagaimana dimaksud dalam Pasal 3 dibebankan kepada anggaran masing-masing **PIHAK** sesuai dengan tugas dan tanggung jawabnya dan/atau sumber pembiayaan lain yang sah dan tidak mengikat berdasarkan kesepakatan **PARA PIHAK**, sesuai dengan ketentuan peraturan perundang-undangan.'),
  A('(2)', 'Pemanfaatan layanan infrastruktur riset **PIHAK KEDUA** mengikuti ketentuan penerimaan negara bukan pajak yang berlaku.'),
]);
pasal(isi, 7, 'DATA DAN INFORMASI', [
  A('(1)', '**PARA PIHAK** saling memanfaatkan data dan informasi yang diperlukan untuk pelaksanaan Nota Kesepahaman ini.'),
  A('(2)', 'Pertukaran dan pemanfaatan data dilaksanakan sesuai dengan Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2023 tentang Satu Data Bencana dan ketentuan yang berlaku pada **PIHAK** pemilik data.'),
  A('(3)', 'Data yang dipertukarkan tetap menjadi milik **PIHAK** yang menyediakannya.'),
  A('(4)', '**PARA PIHAK** menjaga kerahasiaan informasi yang dikecualikan dan melindungi data pribadi sesuai dengan ketentuan peraturan perundang-undangan.'),
  A('(5)', 'Data dan informasi yang diperoleh dari **PIHAK** lainnya tidak diberikan kepada pihak ketiga tanpa persetujuan tertulis **PIHAK** pemilik data, kecuali diwajibkan oleh ketentuan peraturan perundang-undangan.'),
]);
pasal(isi, 8, 'KEKAYAAN INTELEKTUAL', [
  A('(1)', 'Kekayaan intelektual yang timbul dari pelaksanaan Nota Kesepahaman ini diatur dalam Perjanjian Kerja Sama dengan memperhatikan kontribusi masing-masing **PIHAK** dan ketentuan peraturan perundang-undangan.'),
  A('(2)', 'Pengaturan sebagaimana dimaksud pada ayat (1) tidak mengurangi hak moral pencipta dan hak inventor untuk dicantumkan namanya.'),
]);
pasal(isi, 9, 'PEMANTAUAN DAN EVALUASI', [
  A('(1)', '**PARA PIHAK** melakukan pemantauan dan evaluasi pelaksanaan Nota Kesepahaman ini paling sedikit 1 (satu) kali dalam 1 (satu) tahun atau sewaktu-waktu sesuai dengan kesepakatan **PARA PIHAK**.'),
  A('(2)', 'Hasil pemantauan dan evaluasi sebagaimana dimaksud pada ayat (1) dilaporkan kepada pimpinan **PARA PIHAK** dan menjadi bahan perencanaan kerja sama berikutnya.'),
]);
pasal(isi, 10, 'JANGKA WAKTU', [
  A('(1)', 'Nota Kesepahaman ini berlaku untuk jangka waktu 5 (lima) tahun terhitung sejak tanggal ditandatangani.'),
  A('(2)', 'Jangka waktu sebagaimana dimaksud pada ayat (1) dapat diperpanjang berdasarkan kesepakatan tertulis **PARA PIHAK** yang diusulkan oleh salah satu **PIHAK** paling lambat 90 (sembilan puluh) hari kalender sebelum Nota Kesepahaman ini berakhir.'),
  A('(3)', 'Salah satu **PIHAK** dapat mengakhiri Nota Kesepahaman ini sebelum jangka waktunya berakhir dengan pemberitahuan tertulis kepada **PIHAK** lainnya paling lambat 90 (sembilan puluh) hari kalender sebelum tanggal pengakhiran yang dikehendaki.'),
  A('(4)', 'Berakhirnya Nota Kesepahaman ini tidak memengaruhi Perjanjian Kerja Sama yang masih berjalan sampai berakhirnya jangka waktu Perjanjian Kerja Sama tersebut, kecuali **PARA PIHAK** menentukan lain.'),
]);
pasal(isi, 11, 'PERUBAHAN', [
  A('(1)', 'Nota Kesepahaman ini hanya dapat diubah dengan dokumen tertulis yang disepakati dan ditandatangani **PARA PIHAK** dalam bentuk adendum.'),
  A('(2)', 'Adendum sebagaimana dimaksud pada ayat (1) merupakan bagian yang tidak terpisahkan dari Nota Kesepahaman ini.'),
]);
pasal(isi, 12, 'PENYELESAIAN PERSELISIHAN', [
  par('Dalam hal terjadi perbedaan penafsiran atau perselisihan dalam pelaksanaan Nota Kesepahaman ini, **PARA PIHAK** menyelesaikannya secara musyawarah untuk mufakat.'),
]);
pasal(isi, 13, 'KORESPONDENSI', [
  A('(1)', 'Seluruh surat-menyurat dan dokumen lain yang berkaitan dengan Nota Kesepahaman ini dialamatkan kepada:'),
  ...L.alamat('BADAN NASIONAL PENANGGULANGAN BENCANA', L.BNPB_ALAMAT),
  ...L.alamat('BADAN RISET DAN INOVASI NASIONAL', [
    ['Alamat', 'Gedung B.J. Habibie, Jalan M.H. Thamrin Nomor 8, Jakarta Pusat 10340'],
    ['Telepon', '[[nomor telepon]]'],
    ['Pos-el', '[[pos-el unit kerja sama]]'],
    ['U.p.', '[[unit kerja yang membidangi kerja sama]]'],
  ]),
  A('(2)', 'Dalam hal terjadi perubahan alamat sebagaimana dimaksud pada ayat (1), **PIHAK** yang mengubah alamat memberitahukan secara tertulis kepada **PIHAK** lainnya paling lambat 14 (empat belas) hari kalender sejak perubahan berlaku efektif. Kelalaian menyampaikan pemberitahuan perubahan alamat menjadi tanggung jawab **PIHAK** yang mengubah alamat.'),
]);
pasal(isi, 14, 'LAIN-LAIN', [
  A('(1)', 'Nota Kesepahaman ini tidak dimaksudkan untuk membatasi **PARA PIHAK** bekerja sama dengan pihak lain untuk maksud dan tujuan yang sama (*non binding* dan non eksklusif), dan tidak menimbulkan kewajiban pembiayaan; kewajiban tersebut diatur dalam Perjanjian Kerja Sama.'),
  A('(2)', 'Kegiatan yang telah berjalan di antara **PARA PIHAK** sebelum Nota Kesepahaman ini tetap dilaksanakan berdasarkan dokumen yang mengaturnya.'),
  A('(3)', '**PARA PIHAK** tidak dapat mengalihkan Nota Kesepahaman ini kepada pihak lain tanpa persetujuan tertulis **PARA PIHAK**.'),
]);
pasal(isi, 15, 'PENUTUP', [
  par('Nota Kesepahaman ini dibuat dan ditandatangani oleh **PARA PIHAK** dalam rangkap 2 (dua) asli, bermeterai cukup, dan masing-masing mempunyai kekuatan hukum yang sama.'),
]);
isi.push(...L.ttd(L.BNPB_TTD, ['**PIHAK KEDUA**', '**KEPALA BADAN RISET**', '**DAN INOVASI NASIONAL,**', '**Arif Satria**', '[[gelar lengkap]]']));

L.simpan(isi, path.join(__dirname, '..', 'Draf NK BNPB dan BRIN 021126.docx'), 'Draf Nota Kesepahaman BNPB dan BRIN');
