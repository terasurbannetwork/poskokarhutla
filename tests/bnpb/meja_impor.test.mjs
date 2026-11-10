// Pembaca .xlsx impor Data BPBD (public/bnpb/meja_impor.js): zip, sharedStrings, tanggal Excel, pemetaan kolom spek. Tanpa jaringan dan tanpa pustaka.
// Jalankan: node --test tests/bnpb/meja_impor.test.mjs
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {deflateRawSync} from "node:zlib";
import {bacaXlsx, barisDariLembar, potong, tanggalExcel, angkaId, ubahSel} from "../../public/bnpb/meja_impor.js";
import "../../src/worker.js";   // memecah siklus impor meja.js <-> meja_spek.js
import {MEJA} from "../../src/meja_spek.js";

const KOLOM = MEJA.dampak.kolom;
const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
function zip(berkas, simpan = false) {   // {nama: teks} -> Uint8Array zip (deflate, atau stored bila simpan)
  const bagian = [], pusat = []; let o = 0;
  for (const [nama, teks] of Object.entries(berkas)) {
    const mentah = Buffer.from(teks), data = simpan ? mentah : deflateRawSync(mentah), nm = Buffer.from(nama), h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(simpan ? 0 : 8, 8); h.writeUInt32LE(crc(mentah), 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(mentah.length, 22); h.writeUInt16LE(nm.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(simpan ? 0 : 8, 10); c.writeUInt32LE(crc(mentah), 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(mentah.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(o, 42);
    bagian.push(h, nm, data); pusat.push(c, nm); o += 30 + nm.length + data.length;
  }
  const dir = Buffer.concat(pusat), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(pusat.length / 2, 8); e.writeUInt16LE(pusat.length / 2, 10); e.writeUInt32LE(dir.length, 12); e.writeUInt32LE(o, 16);
  return new Uint8Array(Buffer.concat([...bagian, dir, e]));
}
const sel = (ref, v, t) => t === "s" ? `<c r="${ref}" t="s"><v>${v}</v></c>` : t === "i" ? `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>` : `<c r="${ref}"><v>${v}</v></c>`;
const buku = (lembarXml, bersama) => zip({
  "[Content_Types].xml": "<Types/>", "xl/workbook.xml": '<workbook><sheets><sheet name="Petunjuk" sheetId="2" r:id="rId2"/><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>',
  "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Type="x/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x/worksheet" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
  "xl/sharedStrings.xml": `<sst>${bersama.map(s => `<si><t>${s}</t></si>`).join("")}</sst>`,
  "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${lembarXml}</sheetData></worksheet>`, "xl/worksheets/sheet2.xml": "<worksheet><sheetData><row r=\"1\"><c r=\"A1\" t=\"inlineStr\"><is><t>bukan ini</t></is></c></row></sheetData></worksheet>"});

const BERSAMA = ["Jenis", "Nama", "Tgl", "jenis", "nama_kejadian", "tanggal", "meninggal", "kec", "banjir", "Banjir &amp; longsor Sungai A", "Kec. Muara", "nihil_sosek"];
const LEMBAR = `<row r="1">${sel("A1", 0, "s")}</row>
  <row r="2">${sel("A2", 3, "s")}${sel("B2", 4, "s")}${sel("C2", 5, "s")}${sel("D2", 6, "s")}${sel("E2", 7, "s")}${sel("F2", 11, "s")}</row>
  <row r="3">${sel("A3", 8, "s")}${sel("B3", 9, "s")}${sel("C3", 46000)}${sel("D3", 0)}${sel("E3", 10, "s")}${sel("F3", "ya", "i")}</row>
  <row r="4"></row>
  <row r="5">${sel("A5", "Banjir", "i")}${sel("B5", "Kosong angka", "i")}${sel("C5", "05/11/2026", "i")}${sel("D5", "1.234", "i")}</row>
  <row r="6">${sel("A6", "gempa", "i")}${sel("B6", "Salah", "i")}${sel("C6", "kemarin", "i")}${sel("D6", "banyak", "i")}</row>`;

test("bacaXlsx: sharedStrings, entitas XML, lembar Data (bukan lembar pertama), sel kosong dilewati", async () => {
  const rows = await bacaXlsx(buku(LEMBAR, BERSAMA));
  assert.equal(rows[0][0], "Jenis"); assert.deepEqual(rows[1].slice(0, 3), ["jenis", "nama_kejadian", "tanggal"]);
  assert.equal(rows[2][1], "Banjir & longsor Sungai A"); assert.equal(rows[2][3], 0); assert.equal(rows[3].length, 0);
});
test("zip stored (tanpa kompresi) juga terbaca", async () => {
  const b = zip({"xl/workbook.xml": '<sheets><sheet name="Data" r:id="rId1"/></sheets>', "xl/_rels/workbook.xml.rels": '<Relationship Id="rId1" Target="worksheets/s.xml"/>', "xl/worksheets/s.xml": `<sheetData><row r="1">${sel("A1", "halo", "i")}</row></sheetData>`}, true);
  assert.deepEqual(await bacaXlsx(b), [["halo"]]);
});
test("tanggal Excel dan angka gaya Indonesia", () => {
  assert.equal(tanggalExcel(46000), "2025-12-09"); assert.equal(tanggalExcel(45000.75), "2023-03-15");
  assert.equal(angkaId("1.234"), 1234); assert.equal(angkaId("1.234,5"), 1234.5); assert.equal(angkaId("12,5"), 12.5); assert.equal(angkaId("abc"), "abc");
  assert.deepEqual(ubahSel(KOLOM.find(k => k.nama === "jam"), 0.604166667), {nilai: "14:30"});
  assert.deepEqual(ubahSel(KOLOM.find(k => k.nama === "jenis"), "Kebakaran permukiman"), {nilai: "kebakaran_permukiman"});
  assert.ok(ubahSel(KOLOM.find(k => k.nama === "jenis"), "puting").galat);
});
test("barisDariLembar: 0 tetap terkirim, kosong tidak, kec ke tingkat atas, ya ke true, baris salah dilaporkan dengan nomor Excel", async () => {
  const h = await barisDariLembar(await bacaXlsx(buku(LEMBAR, BERSAMA)), KOLOM);
  assert.equal(h.baris.length, 2); assert.equal(h.galat.length, 1); assert.equal(h.kosong, 1);
  const [a, b] = h.baris;
  assert.equal(a.sumber, 3); assert.equal(a.kec, "Kec. Muara"); assert.deepEqual(a.data, {jenis: "banjir", nama_kejadian: "Banjir & longsor Sungai A", tanggal: "2025-12-09", meninggal: 0, nihil_sosek: true});
  assert.equal(a.data.kec, undefined);
  assert.deepEqual(b.data, {jenis: "banjir", nama_kejadian: "Kosong angka", tanggal: "2026-11-05", meninggal: 1234}); assert.equal(b.data.hilang, undefined);
  assert.equal(h.galat[0].sumber, 6); assert.match(h.galat[0].pesan, /Tanggal|tanggal/); assert.match(h.galat[0].pesan, /bukan angka/);
});
test("tanpa baris kunci: galat yang menunjuk templat", () => assert.rejects(barisDariLembar([["a"], ["b"]], KOLOM), /templat/));
test("potong per 50 baris dan per ukuran JSON", async () => {
  assert.deepEqual((await potong(Array(120).fill(0))).map(x => x.length), [50, 50, 20]);
  const besar = {data: {t: "x".repeat(100 * 1024)}};
  assert.deepEqual((await potong([besar, besar, besar, besar])).map(x => x.length), [2, 2]);
});

test("templat resmi: baris kunci = kolom spek, kosong mulai baris 3, tanpa data contoh", async () => {
  const rows = await bacaXlsx(readFileSync(new URL("../../public/bnpb/templat/data-dampak.xlsx", import.meta.url)));
  assert.deepEqual(rows[1], KOLOM.filter(k => k.tipe !== "gudang").map(k => k.nama), "templat beda dari spek: jalankan python3 scripts/bnpb/templat_dampak.py");
  const h = await barisDariLembar(rows, KOLOM); assert.equal(h.baris.length, 0); assert.equal(h.asing.length, 0);
  assert.equal(h.dikenal, rows[1].length);
});
test("lembar besar: kemajuan dilaporkan tiap 200 baris", async () => {
  const rows = [["jenis", "nama_kejadian", "tanggal"], ...Array.from({length: 450}, (_, i) => ["banjir", "K" + i, "2026-11-01"])], lap = [];
  const h = await barisDariLembar(rows, KOLOM, (a, b) => lap.push([a, b]));
  assert.equal(h.baris.length, 450); assert.deepEqual(lap.map(x => x[0]), [200, 400]);
});
