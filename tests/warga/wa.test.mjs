/* Kotak masuk WA laporan harian (src/wa.js): webhook Fonnte, saring pengirim, tanggal/jenis, berkas ke R2, baca admin. Worker utuh di workerd + D1/R2 lokal.
   Jalankan: node --test tests/warga/wa.test.mjs */
import assert from "node:assert/strict";
import {test} from "node:test";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
const {tanggalDari, jenisDari, normalNo} = await import("../../src/worker.js").then(() => import("../../src/wa.js"));   // worker dulu: wa.js dan worker.js saling impor

const PDF = new TextEncoder().encode("%PDF-1.4 laphar uji");
const luar = req => new URL(req.url).pathname === "/laphar.pdf" ? new Response(PDF, {headers: {"content-type": "application/pdf"}}) : new Response("x", {status: 404});
const uji = berantai();
const U = await siapkan("uji-wa", {r2: true, luar, ikat: {WA_KUNCI: "kunci-wa", WA_IZIN: "0812 3456 7890, 628999"}}), {api, n} = U;
const kirim = (o, k = "kunci-wa") => api("POST", `/api/wa/fonnte?k=${k}`, o);

test("tanggal, jenis, dan nomor diurai murni", () => {
  const kini = Date.parse("2026-10-28T20:00:00Z");   // 29 Okt WIB
  assert.equal(tanggalDari("halo", kini), "2026-10-29");
  assert.equal(tanggalDari("28/10/2026 rekap", kini), "2026-10-28");
  assert.equal(tanggalDari("Tanggal 2026-10-27\nisi", kini), "2026-10-27");
  assert.equal(tanggalDari("31/02/2026", kini), "2026-10-29", "tanggal mustahil jatuh ke hari terima");
  assert.equal(jenisDari("Upaya pemadaman di Kalbar", ""), "karhutla");
  assert.equal(jenisDari("banjir Demak #karhutla", ""), "karhutla");
  assert.equal(jenisDari("Kebakaran hutan #bencana", ""), "bencana");
  assert.equal(jenisDari("", "Laphar 28 Okt.pdf"), "bencana");
  assert.equal(normalNo("081234567890@s.whatsapp.net"), "6281234567890");
});

uji("kunci salah ditolak, pengirim asing diam tidak disimpan", async () => {
  assert.equal((await kirim({sender: "6281234567890", message: "x"}, "salah")).s, 403);
  const r = await kirim({sender: "6281111111111", message: "banjir"});
  assert.equal(r.s, 200); assert.equal(r.j.disimpan, false);
  assert.equal(await n("wa_masuk"), 0);
  assert.equal((await api("GET", "/api/wa/fonnte?k=kunci-wa")).s, 405);
  assert.equal((await kirim({sender: "6281234567890", message: "x".repeat(300000)})).s, 400, "kiriman di atas 256 KB ditolak");
  assert.equal((await api("GET", "/api/wa/berkas?id=abc", undefined, ADMIN)).s, 400);
  assert.equal(await n("wa_masuk"), 0);
});

uji("teks dari nomor terdaftar tersimpan dengan tanggal dan jenisnya", async () => {
  const r = await kirim({sender: "6281234567890", name: "Pusdalops", message: "28/10/2026 Mohon izin menyampaikan hasil pemantauan Dit. Koordalops"});
  assert.equal(r.s, 200, r.t); assert.equal(r.j.tanggal, "2026-10-28"); assert.equal(r.j.jenis, "bencana");
  const k = await kirim({sender: "120363000@g.us", member: "628999", message: "#karhutla 28/10/2026 pemadaman darat Kalteng"});   // dari grup: anggota yang dicek
  assert.equal(k.j.jenis, "karhutla");
});

uji("berkas dari url Fonnte masuk R2 dan hanya admin yang bisa membacanya", async () => {
  const r = await kirim({sender: "6281234567890", message: "", url: "https://cdn.fonnte.uji/laphar.pdf", filename: "laphar.pdf"});
  assert.equal(r.j.disimpan, true);
  assert.equal((await api("GET", "/api/wa/masuk?tanggal=2026-10-28")).s, 403);
  const d = await api("GET", `/api/wa/masuk?tanggal=${r.j.tanggal}&jenis=bencana`, undefined, ADMIN);
  const p = d.j.pesan.find(x => x.ada_berkas); assert.ok(p, d.t);
  assert.equal((await api("GET", `/api/wa/berkas?id=${p.id}`)).s, 403);
  const b = await api("GET", `/api/wa/berkas?id=${p.id}`, undefined, ADMIN);
  assert.equal(b.s, 200); assert.equal(b.t, "%PDF-1.4 laphar uji");
  assert.match(b.h.get("content-disposition"), /^attachment/);
  const h = await api("GET", "/api/wa/masuk?tanggal=2026-10-28&jenis=karhutla", undefined, ADMIN);
  assert.equal(h.j.pesan.length, 1); assert.match(h.j.pesan[0].teks, /pemadaman/);
});
