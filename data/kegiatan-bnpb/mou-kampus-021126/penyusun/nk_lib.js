// Pustaka bersama penyusun naskah Nota Kesepahaman BNPB (2 Nov 2026).
// Gaya: Bookman Old Style 11 pt, A4, kotak paraf tiap halaman, isian [[...]] berstabilo kuning,
// **tebal**, *miring*. Pola pasal mengikuti NK BNPB dengan UMY (2024) dan Unpad (2026).
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, Footer, PageNumber, TabStopType, VerticalAlign, ImageRun,
} = require('docx');

const FONT = 'Bookman Old Style';
const UKURAN = 22;
const JARAK = { line: 300, after: 120 };
const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const TANPA = { top: NB, bottom: NB, left: NB, right: NB };

function runs(teks, opsi = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\*[^*]+\*)/g;
  let pos = 0, m;
  const tr = (text, x = {}) => new TextRun({ text, font: FONT, size: UKURAN, ...opsi, ...x });
  while ((m = re.exec(teks))) {
    if (m.index > pos) out.push(tr(teks.slice(pos, m.index)));
    const t = m[0];
    if (t.startsWith('**')) out.push(...runs(t.slice(2, -2), { ...opsi, bold: true }));   // isian [[...]] di dalam teks tebal tetap berstabilo
    else if (t.startsWith('[[')) out.push(tr('[' + t.slice(2, -2) + ']', { highlight: 'yellow' }));
    else out.push(tr(t.slice(1, -1), { italics: true }));
    pos = m.index + t.length;
  }
  if (pos < teks.length) out.push(tr(teks.slice(pos)));
  return out;
}

const tengah = (teks, after = 60, tebal = true) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 276, after }, children: runs(teks, tebal ? { bold: true } : {}) });
const par = (teks) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: JARAK, children: runs(teks) });
const butir = (label, teks, kiri = 0, gantung = 567) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED, spacing: JARAK, indent: { left: kiri + gantung, hanging: gantung },
  tabStops: [{ type: TabStopType.LEFT, position: kiri + gantung }], children: runs(`${label}\t${teks}`),
});
const A = (l, t) => butir(l, t);          // ayat atau butir langsung
const H = (l, t) => butir(l, t, 567);     // huruf di bawah ayat
const kosong = (after = 120) => new Paragraph({ spacing: { after }, children: [] });

function pasal(isi, no, judul, badan) {
  isi.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 240, line: 276 }, children: runs(`**Pasal ${no}**`) }));
  isi.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { after: 160, line: 276 }, children: runs(`**${judul}**`) }));
  badan.forEach((b) => isi.push(b));
}

const nomor = (teks) => new Paragraph({
  indent: { left: 1134 }, spacing: { line: 276, after: 40 },
  tabStops: [{ type: TabStopType.LEFT, position: 2268 }], children: runs(teks, { bold: true }),
});

// kepala: lambang negara (antarlembaga pemerintah) atau logo BNPB kiri dan logo mitra kanan (mitra nonpemerintah)
function kepala(jenis, logoMitra = '[[logo perguruan tinggi]]') {
  if (jenis === 'lambang') return [tengah('[[Lambang Negara]]', 240, false)];
  const logo = fs.readFileSync(path.join(__dirname, 'aset', 'logo-bnpb.png'));
  const sel = (anak, rata) => new TableCell({ width: { size: 4252, type: WidthType.DXA }, borders: TANPA, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: rata, children: anak })] });
  return [new Table({
    width: { size: 8504, type: WidthType.DXA }, columnWidths: [4252, 4252],
    borders: { ...TANPA, insideHorizontal: NB, insideVertical: NB },
    rows: [new TableRow({ children: [
      sel([new ImageRun({ type: 'png', data: logo, transformation: { width: 60, height: 76 } })], AlignmentType.LEFT),
      sel(runs(logoMitra), AlignmentType.RIGHT),
    ] })],
  }), kosong(120)];
}

function alamat(judul, baris) {
  const sel = (teks, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: TANPA,
    children: [new Paragraph({ spacing: { line: 276, after: 40 }, children: runs(teks) })] });
  return [
    new Paragraph({ indent: { left: 567 }, spacing: { before: 80, after: 60 }, children: runs(`**${judul}**`) }),
    new Table({
      width: { size: 8504, type: WidthType.DXA }, columnWidths: [567, 1701, 283, 5953],
      borders: { ...TANPA, insideHorizontal: NB, insideVertical: NB },
      rows: baris.map(([k, v]) => new TableRow({ children: [sel('', 567), sel(k, 1701), sel(':', 283), sel(v, 5953)] })),
    }),
  ];
}

// tanda tangan dua kolom; kiri/kanan = 3 baris jabatan lalu baris nama
function ttd(kiri, kanan) {
  const jeda = ['', '', '', ''];
  const sel = (baris) => new TableCell({ width: { size: 4252, type: WidthType.DXA }, borders: TANPA,
    children: [...baris.slice(0, 3), ...jeda, ...baris.slice(3)].map((t) =>
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 276 }, children: t === '' ? [] : runs(t) })) });
  return [kosong(120), new Table({
    width: { size: 8504, type: WidthType.DXA }, columnWidths: [4252, 4252],
    borders: { ...TANPA, insideHorizontal: NB, insideVertical: NB },
    rows: [new TableRow({ cantSplit: true, children: [sel(kiri), sel(kanan)] })],
  })];
}

function kaki() {
  const garis = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const paraf = (teks) => new TableCell({ width: { size: 1134, type: WidthType.DXA },
    borders: { top: garis, bottom: garis, left: garis, right: garis },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: teks ? [new TextRun({ text: teks, font: FONT, size: 14 })] : [] })] });
  return new Footer({ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] }),
    new Table({ width: { size: 2268, type: WidthType.DXA }, columnWidths: [1134, 1134], alignment: AlignmentType.RIGHT, rows: [
      new TableRow({ children: [paraf('Paraf Pihak Kesatu'), paraf('Paraf Pihak Kedua')] }),
      new TableRow({ height: { value: 425, rule: 'atLeast' }, children: [paraf(''), paraf('')] }),
    ] }),
  ] });
}

function simpan(isi, keluar, judul) {
  const doc = new Document({
    creator: 'BNPB', title: judul, description: 'Draf; isian berstabilo kuning wajib dilengkapi',
    styles: { default: { document: { run: { font: FONT, size: UKURAN } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1701, left: 1701, right: 1418, footer: 567 } } },
      footers: { default: kaki() }, children: isi,
    }],
  });
  return Packer.toBuffer(doc).then((b) => { fs.writeFileSync(keluar, b); console.log('ok', keluar); });
}

// identitas dan konsiderans BNPB yang sama di semua naskah
const BNPB_IDENTITAS = '**BADAN NASIONAL PENANGGULANGAN BENCANA**, berkedudukan di Graha BNPB, Jalan Pramuka Kav. 38, Jakarta Timur 13120, diwakili oleh **Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)**, selaku Kepala Badan Nasional Penanggulangan Bencana, yang diangkat berdasarkan Keputusan Presiden Republik Indonesia Nomor [[nomor]] Tahun [[tahun]] tentang [[judul keputusan]], dalam hal ini bertindak untuk dan atas nama Badan Nasional Penanggulangan Bencana, selanjutnya disebut **PIHAK KESATU**.';
const BNPB_KONSIDERANS = 'bahwa **PIHAK KESATU** adalah lembaga pemerintah nonkementerian sebagaimana dimaksud dalam Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana, yang tugas dan fungsinya diatur dalam Peraturan Presiden Nomor 1 Tahun 2019 tentang Badan Nasional Penanggulangan Bencana sebagaimana telah diubah dengan Peraturan Presiden Nomor 29 Tahun 2021;';
const BNPB_TTD = ['**PIHAK KESATU**', '**KEPALA BADAN NASIONAL**', '**PENANGGULANGAN BENCANA,**', '**Letnan Jenderal TNI**', '**Kristomei Sianturi, S.Sos.,**', '**M.Si. (Han)**'];
const BNPB_ALAMAT = [
  ['Alamat', 'Graha BNPB, Jalan Pramuka Kav. 38, Jakarta Timur 13120'],
  ['Telepon', '021-29827793'],
  ['Pos-el', 'biro.hoks@bnpb.go.id'],
  ['U.p.', 'Kepala Biro Hukum, Organisasi, dan Kerja Sama'],
];
const AKTA = 'Pada hari ini [[hari]] tanggal [[tanggal terbilang]] bulan [[bulan]] tahun [[tahun terbilang]] ([[dd-mm-yyyy]]), bertempat di [[kota]], yang bertanda tangan di bawah ini:';
const PARA_PIHAK = '**PIHAK KESATU** dan **PIHAK KEDUA** secara bersama-sama disebut **PARA PIHAK** dan secara sendiri-sendiri disebut **PIHAK**, terlebih dahulu menerangkan hal-hal sebagai berikut:';

module.exports = {
  runs, tengah, par, butir, A, H, kosong, pasal, nomor, kepala, alamat, ttd, simpan,
  BNPB_IDENTITAS, BNPB_KONSIDERANS, BNPB_TTD, BNPB_ALAMAT, AKTA, PARA_PIHAK,
};
