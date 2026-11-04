// Penyusun naskah Nota Kesepahaman BNPB dan Kemdiktisaintek (draf 2 Nov 2026).
// Jalankan: NODE_PATH=C:/Users/USER/laporan_bulanan/node_modules node nk_payung_kemdiktisaintek.js
// Pola mengikuti NK BNPB dengan UMY (2024) dan Unpad (2026); kerangka 14 pasal dari deck
// "Arsitektur MoU Kerja Sama BNPB dan Perguruan Tinggi 021126", Lampiran A.
// Isian yang belum pasti ditandai stabilo kuning dan ditulis dalam kurung siku.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, Footer, PageNumber, TabStopType, VerticalAlign,
} = require('docx');

const FONT = 'Bookman Old Style';
const UKURAN = 22; // setengah poin: 11 pt
const KELUAR = path.join(__dirname, '..', 'Draf NK BNPB dan Kemdiktisaintek 021126.docx');

// teks dengan **tebal** dan [[isian]] (stabilo kuning)
function runs(teks, opsi = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\*[^*]+\*)/g;
  let pos = 0, m;
  while ((m = re.exec(teks))) {
    if (m.index > pos) out.push(new TextRun({ text: teks.slice(pos, m.index), font: FONT, size: UKURAN, ...opsi }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, size: UKURAN, ...opsi }));
    else if (t.startsWith('*')) out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, size: UKURAN, ...opsi }));
    else out.push(new TextRun({ text: '[' + t.slice(2, -2) + ']', highlight: 'yellow', font: FONT, size: UKURAN, ...opsi }));
    pos = m.index + t.length;
  }
  if (pos < teks.length) out.push(new TextRun({ text: teks.slice(pos), font: FONT, size: UKURAN, ...opsi }));
  return out;
}

const JARAK = { line: 300, after: 120 };
const tengah = (teks, after = 0, tebal = true) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 276, after }, children: runs(tebal ? `**${teks}**` : teks) });
const par = (teks, opsi = {}) =>
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: JARAK, children: runs(teks), ...opsi });
// butir bergantung: label "(1)" atau "a." lalu teks dengan inden gantung
const butir = (label, teks, kiri = 0, gantung = 567) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: JARAK,
    indent: { left: kiri + gantung, hanging: gantung },
    tabStops: [{ type: TabStopType.LEFT, position: kiri + gantung }],
    children: runs(`${label}\t${teks}`),
  });
const kosong = (after = 120) => new Paragraph({ spacing: { after }, children: [] });

const isi = [];
const pasal = (no, judul, badan) => {
  isi.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 240, line: 276 }, children: runs(`**Pasal ${no}**`) }));
  isi.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { after: 160, line: 276 }, children: runs(`**${judul}**`) }));
  badan.forEach((b) => isi.push(b));
};

// ---------- kepala ----------
isi.push(tengah('[[Lambang Negara]]', 240, false));
['NOTA KESEPAHAMAN', 'ANTARA', 'BADAN NASIONAL PENANGGULANGAN BENCANA', 'DENGAN',
  'KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI', 'TENTANG',
  'PENGUATAN PERAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI', 'DALAM PENANGGULANGAN BENCANA'].forEach((t, i, a) =>
  isi.push(tengah(t, i === a.length - 1 ? 200 : 60)));

const nomor = (teks) => new Paragraph({
  alignment: AlignmentType.LEFT, indent: { left: 1134 }, spacing: { line: 276, after: 40 },
  tabStops: [{ type: TabStopType.LEFT, position: 2268 }], children: runs(teks, { bold: true }),
});
isi.push(nomor('NOMOR\t: [[...]]/KA BNPB/KS.01.01/[[bulan]]/[[tahun]]'));
isi.push(nomor('NOMOR\t: [[nomor Kemdiktisaintek]]'));
isi.push(kosong(200));

isi.push(par('Pada hari ini [[hari]] tanggal [[tanggal terbilang]] bulan [[bulan]] tahun [[tahun terbilang]] ([[dd-mm-yyyy]]), bertempat di [[kota]], yang bertanda tangan di bawah ini:'));
isi.push(butir('I.', '**BADAN NASIONAL PENANGGULANGAN BENCANA**, berkedudukan di Graha BNPB, Jalan Pramuka Kav. 38, Jakarta Timur 13120, diwakili oleh **Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si., M.Si. (Han)**, selaku Kepala Badan Nasional Penanggulangan Bencana, yang diangkat berdasarkan Keputusan Presiden Republik Indonesia Nomor [[nomor]] Tahun [[tahun]] tentang [[judul keputusan]], dalam hal ini bertindak untuk dan atas nama Badan Nasional Penanggulangan Bencana, selanjutnya disebut **PIHAK KESATU**.'));
isi.push(butir('II.', '**KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI**, berkedudukan di Jalan Jenderal Sudirman, Senayan, Jakarta Pusat 10270, diwakili oleh **Brian Yuliarto** [[gelar lengkap]], selaku Menteri Pendidikan Tinggi, Sains, dan Teknologi Republik Indonesia, yang diangkat berdasarkan Keputusan Presiden Republik Indonesia Nomor [[nomor]] Tahun [[tahun]] tentang [[judul keputusan]], dalam hal ini bertindak untuk dan atas nama Kementerian Pendidikan Tinggi, Sains, dan Teknologi, selanjutnya disebut **PIHAK KEDUA**.'));
isi.push(par('**PIHAK KESATU** dan **PIHAK KEDUA** secara bersama-sama disebut **PARA PIHAK** dan secara sendiri-sendiri disebut **PIHAK**, terlebih dahulu menerangkan hal-hal sebagai berikut:'));
[
  ['a.', 'bahwa **PIHAK KESATU** adalah lembaga pemerintah nonkementerian sebagaimana dimaksud dalam Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana, yang tugas dan fungsinya diatur dalam Peraturan Presiden Nomor 1 Tahun 2019 tentang Badan Nasional Penanggulangan Bencana sebagaimana telah diubah dengan Peraturan Presiden Nomor 29 Tahun 2021;'],
  ['b.', 'bahwa **PIHAK KEDUA** adalah kementerian yang menyelenggarakan urusan pemerintahan di bidang pendidikan tinggi, sains, dan teknologi sebagaimana dimaksud dalam Peraturan Presiden Nomor 189 Tahun 2024 tentang Kementerian Pendidikan Tinggi, Sains, dan Teknologi sebagaimana telah diubah dengan Peraturan Presiden Nomor 7 Tahun 2026;'],
  ['c.', 'bahwa Undang-Undang Nomor 12 Tahun 2012 tentang Pendidikan Tinggi mendorong perguruan tinggi menggalang kerja sama di bidang penelitian dan pengabdian kepada masyarakat;'],
  ['d.', 'bahwa Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2025 tentang Rencana Nasional Penanggulangan Bencana Tahun 2025–2029 menempatkan kementerian yang membidangi pendidikan tinggi serta perguruan tinggi sebagai kontributor kegiatan riset kebencanaan; dan'],
  ['e.', 'bahwa **PARA PIHAK** bermaksud menyinergikan tugas, fungsi, dan sumber daya masing-masing untuk memperkuat peran pendidikan tinggi, sains, dan teknologi dalam penanggulangan bencana secara terencana, terkoordinasi, dan terpadu.'],
].forEach(([l, t]) => isi.push(butir(l, t)));
isi.push(par('Berdasarkan hal-hal tersebut di atas, **PARA PIHAK** sepakat untuk membuat dan menandatangani Nota Kesepahaman tentang Penguatan Peran Pendidikan Tinggi, Sains, dan Teknologi dalam Penanggulangan Bencana, selanjutnya disebut Nota Kesepahaman, dengan ketentuan sebagai berikut:'));

// ---------- pasal ----------
const A = (l, t) => butir(l, t);           // ayat
const H = (l, t) => butir(l, t, 567);      // huruf di bawah ayat
const H0 = (l, t) => butir(l, t);          // huruf langsung di bawah pasal

pasal(1, 'MAKSUD DAN TUJUAN', [
  A('(1)', 'Nota Kesepahaman ini dimaksudkan sebagai pedoman bagi **PARA PIHAK** dalam melaksanakan kerja sama penguatan peran pendidikan tinggi, sains, dan teknologi dalam penanggulangan bencana.'),
  A('(2)', 'Nota Kesepahaman ini bertujuan untuk:'),
  H('a.', 'menyambungkan kebutuhan ilmu pengetahuan dan teknologi **PIHAK KESATU** dan badan penanggulangan bencana daerah dengan kepakaran perguruan tinggi;'),
  H('b.', 'memperluas pendidikan kebencanaan di perguruan tinggi; dan'),
  H('c.', 'meningkatkan pemanfaatan hasil riset dan inovasi perguruan tinggi pada tahap prabencana, keadaan darurat bencana, dan pascabencana.'),
]);
pasal(2, 'RUANG LINGKUP', [
  par('Ruang lingkup Nota Kesepahaman ini meliputi:'),
  H0('a.', 'pendidikan dan kurikulum kebencanaan, termasuk mata kuliah kebencanaan dan kuliah umum;'),
  H0('b.', 'magang mahasiswa di lingkungan **PIHAK KESATU** dan kuliah kerja nyata tematik kebencanaan yang diakui sebagai satuan kredit semester sesuai dengan ketentuan peraturan perundang-undangan;'),
  H0('c.', 'riset dan inovasi kebencanaan, termasuk penyusunan daftar masalah kebencanaan, agenda riset, pendanaan riset, uji lapangan, dan hilirisasi inovasi;'),
  H0('d.', 'pemanfaatan data dan informasi kebencanaan untuk pendidikan dan riset;'),
  H0('e.', 'pengabdian kepada masyarakat dan kerelawanan, termasuk relawan kampus, satuan tugas bencana perguruan tinggi, dan kampus aman bencana;'),
  H0('f.', 'pendampingan badan penanggulangan bencana daerah oleh perguruan tinggi dalam penyusunan kajian risiko bencana dan rencana penanggulangan bencana;'),
  H0('g.', 'forum ilmiah, publikasi bersama, dan kerja sama riset dengan mitra luar negeri; dan'),
  H0('h.', 'kegiatan lain yang disepakati **PARA PIHAK** sesuai dengan tugas dan fungsi masing-masing.'),
]);
pasal(3, 'PELAKSANAAN', [
  A('(1)', 'Dalam melaksanakan Nota Kesepahaman ini, **PARA PIHAK** tunduk pada ketentuan peraturan perundang-undangan.'),
  A('(2)', 'Pelaksanaan ruang lingkup sebagaimana dimaksud dalam Pasal 2 dituangkan dalam:'),
  H('a.', 'Perjanjian Kerja Sama antara unit kerja di lingkungan **PIHAK KESATU** dan unit kerja di lingkungan **PIHAK KEDUA**; dan/atau'),
  H('b.', 'Nota Kesepahaman atau Perjanjian Kerja Sama antara **PIHAK KESATU** dan perguruan tinggi.'),
  A('(3)', '**PIHAK KEDUA** mendorong dan memfasilitasi perguruan tinggi untuk berperan serta dalam pelaksanaan Nota Kesepahaman ini dengan menghormati otonomi perguruan tinggi.'),
  A('(4)', 'Perjanjian Kerja Sama sebagaimana dimaksud pada ayat (2) paling sedikit memuat rencana kegiatan, hak dan kewajiban, pembiayaan, hasil kegiatan, kekayaan intelektual, kerahasiaan, keadaan kahar, jangka waktu, penyelesaian perselisihan, dan perubahan.'),
  A('(5)', 'Untuk menyusun dan melaksanakan Perjanjian Kerja Sama sebagaimana dimaksud pada ayat (2), **PARA PIHAK** menunjuk wakil sesuai dengan tugas dan fungsinya.'),
]);
pasal(4, 'TIM KOORDINASI', [
  A('(1)', '**PARA PIHAK** membentuk tim koordinasi bersama untuk mengoordinasikan pelaksanaan Nota Kesepahaman ini.'),
  A('(2)', 'Tim koordinasi sebagaimana dimaksud pada ayat (1) bertugas:'),
  H('a.', 'menyusun rencana kerja tahunan;'),
  H('b.', 'memantau pelaksanaan Perjanjian Kerja Sama; dan'),
  H('c.', 'menyampaikan laporan kepada pimpinan **PARA PIHAK**.'),
  A('(3)', 'Sekretariat tim koordinasi berkedudukan di Biro Hukum, Organisasi, dan Kerja Sama **PIHAK KESATU** dan unit kerja yang ditunjuk **PIHAK KEDUA**.'),
  A('(4)', 'Susunan keanggotaan tim koordinasi ditetapkan bersama oleh **PARA PIHAK**; wakil masing-masing **PIHAK** ditunjuk sesuai dengan tugas dan fungsinya.'),
]);
pasal(5, 'PERGURUAN TINGGI KOORDINATOR', [
  A('(1)', '**PARA PIHAK** dapat menunjuk perguruan tinggi koordinator regional dan tematik untuk mengoordinasikan perguruan tinggi lain di wilayahnya dalam pelaksanaan Nota Kesepahaman ini.'),
  A('(2)', 'Penunjukan perguruan tinggi koordinator sebagaimana dimaksud pada ayat (1) dilakukan dengan persetujuan pimpinan perguruan tinggi yang bersangkutan.'),
  A('(3)', 'Nota Kesepahaman atau Perjanjian Kerja Sama antara **PIHAK KESATU** dan perguruan tinggi merujuk Nota Kesepahaman ini.'),
]);
pasal(6, 'PEMBIAYAAN', [
  par('Pembiayaan yang timbul dari pelaksanaan Perjanjian Kerja Sama sebagaimana dimaksud dalam Pasal 3 dibebankan kepada anggaran masing-masing **PIHAK** sesuai dengan tugas dan tanggung jawabnya dan/atau sumber pembiayaan lain yang sah dan tidak mengikat berdasarkan kesepakatan **PARA PIHAK**, sesuai dengan ketentuan peraturan perundang-undangan.'),
]);
pasal(7, 'DATA DAN INFORMASI', [
  A('(1)', '**PARA PIHAK** saling memanfaatkan data dan informasi yang diperlukan untuk pelaksanaan Nota Kesepahaman ini.'),
  A('(2)', 'Pertukaran dan pemanfaatan data bencana dilaksanakan sesuai dengan Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2023 tentang Satu Data Bencana.'),
  A('(3)', '**PARA PIHAK** menjaga kerahasiaan informasi yang dikecualikan dan melindungi data pribadi sesuai dengan ketentuan peraturan perundang-undangan.'),
  A('(4)', 'Data dan informasi yang diperoleh dari **PIHAK** lainnya tidak diberikan kepada pihak ketiga tanpa persetujuan tertulis **PIHAK** pemilik data, kecuali diwajibkan oleh ketentuan peraturan perundang-undangan.'),
]);
pasal(8, 'KEKAYAAN INTELEKTUAL', [
  A('(1)', 'Kekayaan intelektual yang timbul dari pelaksanaan Nota Kesepahaman ini diatur dalam Perjanjian Kerja Sama dengan memperhatikan kontribusi masing-masing pihak.'),
  A('(2)', 'Pengaturan sebagaimana dimaksud pada ayat (1) tidak mengurangi hak moral pencipta dan hak inventor untuk dicantumkan namanya.'),
  A('(3)', 'Nama penulis atau pencipta dicantumkan dalam karya ilmiah dan karya cipta yang dihasilkan sesuai dengan kaidah ilmiah.'),
]);
pasal(9, 'PEMANTAUAN DAN EVALUASI', [
  A('(1)', '**PARA PIHAK** melakukan pemantauan dan evaluasi pelaksanaan Nota Kesepahaman ini paling sedikit 1 (satu) kali dalam 1 (satu) tahun atau sewaktu-waktu sesuai dengan kesepakatan **PARA PIHAK**.'),
  A('(2)', 'Hasil pemantauan dan evaluasi sebagaimana dimaksud pada ayat (1) dilaporkan kepada pimpinan **PARA PIHAK** dan menjadi bahan perencanaan kerja sama berikutnya.'),
]);
pasal(10, 'JANGKA WAKTU', [
  A('(1)', 'Nota Kesepahaman ini berlaku untuk jangka waktu 5 (lima) tahun terhitung sejak tanggal ditandatangani.'),
  A('(2)', 'Jangka waktu sebagaimana dimaksud pada ayat (1) dapat diperpanjang berdasarkan kesepakatan tertulis **PARA PIHAK** yang diusulkan oleh salah satu **PIHAK** paling lambat 90 (sembilan puluh) hari kalender sebelum Nota Kesepahaman ini berakhir.'),
  A('(3)', 'Salah satu **PIHAK** dapat mengakhiri Nota Kesepahaman ini sebelum jangka waktunya berakhir dengan pemberitahuan tertulis kepada **PIHAK** lainnya paling lambat 90 (sembilan puluh) hari kalender sebelum tanggal pengakhiran yang dikehendaki.'),
  A('(4)', 'Berakhirnya Nota Kesepahaman ini tidak memengaruhi Perjanjian Kerja Sama yang masih berjalan sampai berakhirnya jangka waktu Perjanjian Kerja Sama tersebut, kecuali **PARA PIHAK** menentukan lain.'),
]);
pasal(11, 'PERUBAHAN', [
  A('(1)', 'Nota Kesepahaman ini hanya dapat diubah dengan dokumen tertulis yang disepakati dan ditandatangani **PARA PIHAK** dalam bentuk adendum.'),
  A('(2)', 'Adendum sebagaimana dimaksud pada ayat (1) merupakan bagian yang tidak terpisahkan dari Nota Kesepahaman ini.'),
]);
pasal(12, 'PENYELESAIAN PERSELISIHAN', [
  par('Dalam hal terjadi perbedaan penafsiran atau perselisihan dalam pelaksanaan Nota Kesepahaman ini, **PARA PIHAK** menyelesaikannya secara musyawarah untuk mufakat.'),
]);

// korespondensi: tabel tanpa garis
const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const sel = (teks, w) => new TableCell({
  width: { size: w, type: WidthType.DXA }, borders: { top: NB, bottom: NB, left: NB, right: NB },
  children: [new Paragraph({ spacing: { line: 276, after: 40 }, children: runs(teks) })],
});
const alamat = (judul, baris) => [
  new Paragraph({ indent: { left: 567 }, spacing: { before: 80, after: 60 }, children: runs(`**${judul}**`) }),
  new Table({
    width: { size: 8504, type: WidthType.DXA }, columnWidths: [567, 1701, 283, 5953],
    borders: { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB },
    rows: baris.map(([k, v]) => new TableRow({ children: [sel('', 567), sel(k, 1701), sel(':', 283), sel(v, 5953)] })),
  }),
];
pasal(13, 'KORESPONDENSI', [
  A('(1)', 'Seluruh surat-menyurat dan dokumen lain yang berkaitan dengan Nota Kesepahaman ini dialamatkan kepada:'),
  ...alamat('BADAN NASIONAL PENANGGULANGAN BENCANA', [
    ['Alamat', 'Graha BNPB, Jalan Pramuka Kav. 38, Jakarta Timur 13120'],
    ['Telepon', '021-29827793'],
    ['Pos-el', 'biro.hoks@bnpb.go.id'],
    ['U.p.', 'Kepala Biro Hukum, Organisasi, dan Kerja Sama'],
  ]),
  ...alamat('KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI', [
    ['Alamat', 'Jalan Jenderal Sudirman, Senayan, Jakarta Pusat 10270'],
    ['Telepon', '[[nomor telepon]]'],
    ['Pos-el', '[[pos-el unit kerja sama]]'],
    ['U.p.', '[[unit kerja yang membidangi kerja sama]]'],
  ]),
  A('(2)', 'Dalam hal terjadi perubahan alamat sebagaimana dimaksud pada ayat (1), **PIHAK** yang mengubah alamat memberitahukan secara tertulis kepada **PIHAK** lainnya paling lambat 14 (empat belas) hari kalender sejak perubahan berlaku efektif. Kelalaian menyampaikan pemberitahuan perubahan alamat menjadi tanggung jawab **PIHAK** yang mengubah alamat.'),
]);
pasal(14, 'LAIN-LAIN', [
  A('(1)', 'Nota Kesepahaman ini tidak dimaksudkan untuk membatasi **PARA PIHAK** bekerja sama dengan pihak lain untuk maksud dan tujuan yang sama (*non binding* dan non eksklusif), dan tidak menimbulkan kewajiban pembiayaan; kewajiban tersebut diatur dalam Perjanjian Kerja Sama.'),
  A('(2)', 'Nota Kesepahaman dan Perjanjian Kerja Sama antara **PIHAK KESATU** dan perguruan tinggi yang telah ada sebelum Nota Kesepahaman ini tetap berlaku sampai berakhirnya jangka waktunya dan dapat diselaraskan dengan Nota Kesepahaman ini pada saat diperpanjang.'),
  A('(3)', '**PARA PIHAK** tidak dapat mengalihkan Nota Kesepahaman ini kepada pihak lain tanpa persetujuan tertulis **PARA PIHAK**.'),
]);
pasal(15, 'PENUTUP', [
  par('Nota Kesepahaman ini dibuat dan ditandatangani oleh **PARA PIHAK** dalam rangkap 2 (dua) asli, bermeterai cukup, dan masing-masing mempunyai kekuatan hukum yang sama.'),
]);

// ---------- tanda tangan ----------
const ttd = (baris) => new TableCell({
  width: { size: 4252, type: WidthType.DXA }, borders: { top: NB, bottom: NB, left: NB, right: NB },
  children: baris.map((t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 276 }, children: t === '' ? [] : runs(t) })),
});
const jeda = ['', '', '', ''];
isi.push(kosong(120));
isi.push(new Table({
  width: { size: 8504, type: WidthType.DXA }, columnWidths: [4252, 4252],
  borders: { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB },
  rows: [new TableRow({
    cantSplit: true,
    children: [
      ttd(['**PIHAK KESATU**', '**KEPALA BADAN NASIONAL**', '**PENANGGULANGAN BENCANA,**', ...jeda,
        '**Letnan Jenderal TNI**', '**Kristomei Sianturi, S.Sos.,**', '**M.Si., M.Si. (Han)**']),
      ttd(['**PIHAK KEDUA**', '**MENTERI PENDIDIKAN TINGGI,**', '**SAINS, DAN TEKNOLOGI,**', ...jeda,
        '**Brian Yuliarto**', '[[gelar lengkap]]']),
    ],
  })],
}));

// ---------- kaki: nomor halaman + kotak paraf ----------
const garis = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const paraf = (teks, tinggi) => new TableCell({
  width: { size: 1134, type: WidthType.DXA }, borders: { top: garis, bottom: garis, left: garis, right: garis },
  verticalAlign: VerticalAlign.TOP,
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: teks ? [new TextRun({ text: teks, font: FONT, size: 14 })] : [] })],
});
const kaki = new Footer({
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] }),
    new Table({
      width: { size: 2268, type: WidthType.DXA }, columnWidths: [1134, 1134], alignment: AlignmentType.RIGHT,
      rows: [
        new TableRow({ children: [paraf('Paraf Pihak Kesatu'), paraf('Paraf Pihak Kedua')] }),
        new TableRow({ height: { value: 425, rule: 'atLeast' }, children: [paraf(''), paraf('')] }),
      ],
    }),
  ],
});

const doc = new Document({
  creator: 'BNPB', title: 'Draf Nota Kesepahaman BNPB dan Kemdiktisaintek',
  description: 'Draf 2 Nov 2026; isian berstabilo kuning wajib dilengkapi',
  styles: { default: { document: { run: { font: FONT, size: UKURAN } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1701, left: 1701, right: 1418, footer: 567 } } },
    footers: { default: kaki },
    children: isi,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(KELUAR, b); console.log('ok', KELUAR); });
