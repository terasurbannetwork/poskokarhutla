/* POST /api/laporan-bnpb/baca (src/laporan_bnpb.js): dokumen/foto -> teks. Rute di workerd + D1/R2 lokal; env.AI tidak ada di Miniflare,
   jadi jalur toMarkdown/vision diuji lewat bacaDokumen dengan AI palsu (biayanya neuron, tidak dipanggil sungguhan).
   Jalankan: node --test tests/warga/laporan_baca.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
const {bacaDokumen, MODEL_OCR} = await import("../../src/worker.js").then(() => import("../../src/laporan_bnpb.js"));

const uji = berantai();
const U = await siapkan("uji-baca", {r2: true}), {api, DB, mf} = U;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const baca = (j, body, h) => api("POST", "/api/laporan-bnpb/baca" + j, body, h);
const palsu = () => { const c = []; return {c, AI: {
  toMarkdown: async (d, o) => { c.push(["md", d.name, d.blob.type, o]); return {name: d.name, format: "markdown", data: "# Judul\n" + "isi laporan ".repeat(30)}; },
  run: async (m, a) => { c.push(["run", m, a]); return {response: "Kab. A | 3 | 10"}; }}}; };

uji("bukan admin 403; jenis tak didukung 415; tanpa AI 503; id/berkas hilang 404", async () => {
  assert.equal((await baca("", new Uint8Array([1]), {"x-nama-berkas": "a.docx"})).s, 403);
  assert.equal((await baca("", new Uint8Array([1]), {...ADMIN, "x-nama-berkas": "a.exe", "content-type": "application/octet-stream"})).s, 415);
  assert.equal((await baca("", new Uint8Array([1]), {...ADMIN, "x-nama-berkas": "a.docx", "content-type": DOCX})).s, 503);
  assert.equal((await baca("?wa=abc", undefined, ADMIN)).s, 400);
  assert.equal((await baca("?wa=999", undefined, ADMIN)).s, 404);
});

uji("docx dan pdf lewat toMarkdown; pdf tipis ditandai scan", async () => {
  const {c, AI} = palsu();
  const d = await bacaDokumen({AI}, {nama: "laphar.docx", bytes: new Uint8Array([1, 2]), tipe: DOCX});
  assert.equal(d.jenis, "markdown"); assert.match(d.teks, /isi laporan/); assert.equal(d.catatan, undefined);
  assert.deepEqual(c[0].slice(0, 3), ["md", "laphar.docx", DOCX]);
  const p = await bacaDokumen({AI}, {nama: "x.pdf", bytes: new Uint8Array([1]), tipe: "application/octet-stream"});   // tipe dari ekstensi
  assert.equal(p.catatan, undefined); assert.deepEqual(c[1][3], {conversionOptions: {pdf: {metadata: false}}});
  AI.toMarkdown = async d => ({data: "# Scan\n tipis"});
  assert.match((await bacaDokumen({AI}, {nama: "x.pdf", bytes: new Uint8Array([1]), tipe: "application/pdf"})).catatan, /scan/);
});

uji("foto lewat model penglihatan, bukan toMarkdown", async () => {
  const {c, AI} = palsu();
  const f = await bacaDokumen({AI}, {nama: "foto.jpg", bytes: new Uint8Array([255, 216, 255]), tipe: "image/jpeg"});
  assert.deepEqual([f.jenis, f.teks], ["ocr", "Kab. A | 3 | 10"]);
  assert.equal(c.length, 1); assert.equal(c[0][1], MODEL_OCR); assert.equal(c[0][2].temperature, 0);
  assert.match(c[0][2].messages[0].content[1].image_url.url, /^data:image\/jpeg;base64,/);
});

uji("?wa=<id>: hasil tersimpan di R2 dibaca ulang tanpa menyentuh AI", async () => {
  const r2 = await mf.getR2Bucket("MEDIA");
  await r2.put("wa/x/1", new Uint8Array([1])); await r2.put("wa/x/1.teks.json", JSON.stringify({nama: "a.docx", jenis: "markdown", teks: "dari cache"}));
  await DB.prepare("INSERT INTO wa_masuk (diterima, tanggal, jenis, dari, berkas, nama_berkas, tipe) VALUES (1, '2026-10-29', 'bencana', '62', 'wa/x/1', 'a.docx', ?)").bind(DOCX).run();
  const id = (await DB.prepare("SELECT id FROM wa_masuk").first()).id;
  const h = await baca(`?wa=${id}`, undefined, ADMIN);   // Miniflare tanpa AI: hanya cache yang bisa menjawab 200
  assert.equal(h.s, 200, h.t); assert.equal(h.j.teks, "dari cache");
});
