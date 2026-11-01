/* Penulis .xlsx paling kecil: satu lembar, sel teks/angka, gabung sel; ZIP tanpa kompresi (STORE). Tanpa gaya (lebar kolom saja).
   ponytail: tanpa gaya/format tanggal; tambah styles.xml bila pemilik minta tebal/border. */
const T = new Uint32Array(256).map((_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc = b => { let c = ~0; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
const kol = i => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };

/* baris: larik larik (null = kosong; angka = numerik; lainnya = teks). lebar: larik lebar kolom (karakter). gabung: ["G7:G12"]. */
export function buatXlsx({baris, lebar = [], gabung = [], nama = "Laporan"}) {
  const sel = (v, r, c) => v == null || v === "" ? "" : typeof v === "number" ? (Number.isFinite(v) ? `<c r="${kol(c)}${r + 1}"><v>${v}</v></c>` : "") : `<c r="${kol(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  const lembar = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + (lebar.length ? `<cols>${lebar.map((w, i) => w ? `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>` : "").join("")}</cols>` : "")
    + `<sheetData>${baris.map((b, r) => `<row r="${r + 1}">${b.map((v, c) => sel(v, r, c)).join("")}</row>`).join("")}</sheetData>`
    + (gabung.length ? `<mergeCells count="${gabung.length}">${gabung.map(g => `<mergeCell ref="${g}"/>`).join("")}</mergeCells>` : "") + `</worksheet>`;
  const X = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
  const berkas = {
    "[Content_Types].xml": X + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": X + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": X + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(String(nama).slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": X + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": lembar,
  };
  const enc = new TextEncoder(), bagian = [], pusat = []; let pos = 0;
  const u16 = n => [n & 255, n >> 8 & 255], u32 = n => [n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24];
  for (const [n, isi] of Object.entries(berkas)) {
    const nm = enc.encode(n), d = enc.encode(isi), c = crc(d);
    const sama = [...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(nm.length), ...u16(0)];   // flag, STORE, jam, tanggal 1980-01-01, crc, ukuran x2, panjang nama, ekstra
    bagian.push(Uint8Array.from([0x50, 0x4B, 3, 4, ...u16(20), ...sama]), nm, d);
    pusat.push(Uint8Array.from([0x50, 0x4B, 1, 2, ...u16(20), ...u16(20), ...sama, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), nm);
    pos += 30 + nm.length + d.length;
  }
  const ukuran = pusat.reduce((a, b) => a + b.length, 0), n = Object.keys(berkas).length;
  const akhir = Uint8Array.from([0x50, 0x4B, 5, 6, 0, 0, 0, 0, ...u16(n), ...u16(n), ...u32(ukuran), ...u32(pos), 0, 0]);
  const semua = [...bagian, ...pusat, akhir], out = new Uint8Array(semua.reduce((a, b) => a + b.length, 0)); let o = 0;
  for (const b of semua) { out.set(b, o); o += b.length; }
  return out;
}
