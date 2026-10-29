/* Kotak masuk WA laporan harian (src/wa.js): gerbang Baileys, saring pengirim, tanggal/jenis, berkas ke R2, baca admin. Worker utuh di workerd + D1/R2 lokal.
   Jalankan: node --test tests/warga/wa.test.mjs */
import assert from "node:assert/strict";
import {test} from "node:test";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
const {tanggalDari, jenisDari, normalNo} = await import("../../src/worker.js").then(() => import("../../src/wa.js"));   // worker dulu: wa.js dan worker.js saling impor

const PDF = new TextEncoder().encode("%PDF-1.4 laphar uji");
const uji = berantai();
const U = await siapkan("uji-wa", {r2: true, ikat: {WA_KUNCI: "kunci-wa", WA_IZIN: "0812 3456 7890, 628999", WA_MESIN: "mesin-rahasia"}}), {api, n, mf} = U;
const MESIN = {authorization: "Bearer mesin-rahasia"};
/* o = {dari, nama, teks, waktu, berkas: [byte, nama, tipe]}; kunci null = tanpa header */
async function kirim(o, kunci = "kunci-wa") {
  const f = new FormData();
  for (const k of ["dari", "nama", "teks", "waktu"]) if (o[k] !== undefined) f.set(k, String(o[k]));
  if (o.berkas) f.set("berkas", new Blob([o.berkas[0]], {type: o.berkas[2]}), o.berkas[1]);
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: kunci ? {"x-wa-kunci": kunci} : {}, body: f});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return {s: r.status, j, t};
}

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
  assert.equal((await kirim({dari: "6281234567890", teks: "x"}, "salah")).s, 403);
  assert.equal((await kirim({dari: "6281234567890", teks: "x"}, null)).s, 403);
  const r = await kirim({dari: "6281111111111", teks: "banjir"});
  assert.equal(r.s, 200); assert.equal(r.j.disimpan, false);
  assert.equal(await n("wa_masuk"), 0);
  assert.equal((await api("GET", "/api/wa/gateway")).s, 405);
  assert.equal((await api("GET", "/api/wa/berkas?id=abc", undefined, ADMIN)).s, 400);
  assert.equal(await n("wa_masuk"), 0);
});

uji("tanpa WA_KUNCI gerbang 503", async () => {
  const V = await siapkan("uji-wa-tanpa", {r2: true, ikat: {WA_IZIN: "628123"}});
  const r = await V.mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: {"x-wa-kunci": "apa"}, body: new FormData()});
  assert.equal(r.status, 503);
});

uji("teks dari nomor terdaftar tersimpan dengan tanggal dan jenisnya", async () => {
  const r = await kirim({dari: "6281234567890", nama: "Pusdalops", teks: "28/10/2026 Mohon izin menyampaikan hasil pemantauan Dit. Koordalops", waktu: Date.parse("2026-10-29T01:00:00Z")});
  assert.equal(r.s, 200, r.t); assert.equal(r.j.tanggal, "2026-10-28"); assert.equal(r.j.jenis, "bencana"); assert.ok(r.j.id);
  const k = await kirim({dari: "628999", teks: "#karhutla 28/10/2026 pemadaman darat Kalteng"});
  assert.equal(k.j.jenis, "karhutla");
});

uji("kiriman ulang laporan lama jatuh ke tanggal isinya; di luar jendela kembali ke aturan lama", async () => {
  const waktu = Date.parse("2026-10-29T03:00:00Z"), dari = "6281234567890";
  const bmkg = h => `Selamat Pagi, *Bapak Kepala BNPB*,\nBerikut kami sampaikan Laporan Meteorologi dan Klimatologi (BMKG):\n\n1. PM2.5 pada hari ${h} pukul 06.00 WIB`;
  const rekap = "*Yth. Kepala BNPB*\nMohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal 25/10/2026 pkl 07.00 WIB s.d 26/10/2026 pkl 07.00 WIB sebagai berikut:";
  assert.equal((await kirim({dari, teks: rekap, waktu})).j.tanggal, "2026-10-26");
  assert.equal((await kirim({dari, teks: bmkg("Senin, 26 Oktober 2026"), waktu})).j.tanggal, "2026-10-26");
  assert.equal((await kirim({dari, teks: bmkg("Kamis, 29 Oktober 2026"), waktu})).j.tanggal, "2026-10-29");
  assert.equal((await kirim({dari, teks: bmkg("Senin, 12 Oktober 2026"), waktu})).j.tanggal, "2026-10-29", "lewat 14 hari: aturan lama");
  assert.equal((await kirim({dari, teks: bmkg("Sabtu, 31 Oktober 2026"), waktu})).j.tanggal, "2026-10-29", "lewat besok: aturan lama");
  assert.equal((await kirim({dari, nama: "x", teks: "pdf", waktu, berkas: [PDF, "Laporan Harian Dit. Koordalops BNPB 27102026.docx.pdf", "application/pdf"]})).j.tanggal, "2026-10-27");
});

uji("duplikat kiriman ulang mengembalikan id yang sama", async () => {
  const o = {dari: "6281234567890", teks: "28/10/2026 ulang outbox", waktu: Date.parse("2026-10-29T02:00:00Z")};
  const a = await kirim(o), b = await kirim(o);
  assert.equal(a.j.id, b.j.id); assert.equal(await n("wa_masuk", "teks = '28/10/2026 ulang outbox'"), 1);
});

uji("berkas masuk R2, dibaca admin dan mesin; bearer salah 403; tipe terlarang dibuang", async () => {
  const r = await kirim({dari: "6281234567890", teks: "", berkas: [PDF, "laphar.pdf", "application/pdf"]});
  assert.equal(r.j.disimpan, true, r.t);
  assert.equal((await api("GET", "/api/wa/masuk?tanggal=2026-10-28")).s, 403);
  assert.equal((await api("GET", "/api/wa/masuk?tanggal=2026-10-28", undefined, {authorization: "Bearer salah"})).s, 403);
  const d = await api("GET", `/api/wa/masuk?tanggal=${r.j.tanggal}&jenis=bencana`, undefined, MESIN);
  const p = d.j.pesan.find(x => x.ada_berkas); assert.ok(p, d.t); assert.ok(p.diterima > 1e12);
  assert.equal((await api("GET", `/api/wa/berkas?id=${p.id}`)).s, 403);
  assert.equal((await api("GET", `/api/wa/berkas?id=${p.id}`, undefined, {authorization: "Bearer salah"})).s, 403);
  for (const h of [ADMIN, MESIN]) {
    const b = await api("GET", `/api/wa/berkas?id=${p.id}`, undefined, h);
    assert.equal(b.s, 200); assert.equal(b.t, "%PDF-1.4 laphar uji"); assert.match(b.h.get("content-disposition"), /^attachment/);
  }
  assert.equal((await api("GET", "/api/wa/rekap?sampai=2026-10-29&hari=1", undefined, MESIN)).s, 200);
  const h = await api("GET", "/api/wa/masuk?tanggal=2026-10-28&jenis=karhutla", undefined, ADMIN);
  assert.equal(h.j.pesan.length, 1); assert.match(h.j.pesan[0].teks, /pemadaman/);
  assert.equal(h.j.pesan[0].kunci, null); assert.equal(h.j.pesan[0].label, "Lain-lain"); assert.equal(h.j.pesan[0].tanggal_isi, null);
  const lp = await kirim({dari: "6281234567890", teks: "", berkas: [PDF, "Laporan Harian Dit Koordalops 27102026.pdf", "application/pdf"]});
  const semua = await api("GET", `/api/wa/masuk?tanggal=${lp.j.tanggal}`, undefined, ADMIN);   // tanpa ?jenis= : semua baris tanggal itu
  const q = semua.j.pesan.find(m => m.nama_berkas?.startsWith("Laporan Harian"));
  assert.ok(semua.j.pesan.length >= 2, semua.t); assert.equal(q.kunci, "laphar_pdf"); assert.equal(q.label, "Laphar PDF"); assert.equal(q.tanggal_isi, "2026-10-27");
  const x = await kirim({dari: "6281234567890", teks: "dengan exe", berkas: [PDF, "a.exe", "application/x-msdownload"]});
  assert.equal(x.j.disimpan, true);
  const l = await api("GET", `/api/wa/masuk?tanggal=${x.j.tanggal}`, undefined, ADMIN);
  assert.equal(l.j.pesan.find(m => m.teks === "dengan exe").ada_berkas, 0, "tipe terlarang: teks tersimpan, berkas dibuang");
});

uji("WA_MESIN tak diset: bearer apa pun ditolak", async () => {
  const V = await siapkan("uji-wa-nomesin", {r2: true, ikat: {WA_KUNCI: "k", WA_IZIN: "628123"}});
  assert.equal((await V.api("GET", "/api/wa/masuk?tanggal=2026-10-28", undefined, {authorization: "Bearer "})).s, 403);
  assert.equal((await V.api("GET", "/api/wa/masuk?tanggal=2026-10-28", undefined, {authorization: "Bearer undefined"})).s, 403);
});

uji("body chunked di atas 21 MB ditolak 413 tanpa content-length", async () => {
  const sepotong = new Uint8Array(1024 * 1024);
  const aliran = new ReadableStream({pull(c) { if (aliran.n++ < 23) c.enqueue(sepotong); else c.close(); }}); aliran.n = 0;
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: {"x-wa-kunci": "kunci-wa", "content-type": "multipart/form-data; boundary=x"}, body: aliran, duplex: "half"});
  assert.equal(r.status, 413);
});

uji("gif dan waktu terlalu lama: berkas dibuang, diterima jatuh ke sekarang", async () => {
  const x = await kirim({dari: "6281234567890", teks: "waktu kuno", waktu: 1000, berkas: [PDF, "a.gif", "image/gif"]});
  const l = await api("GET", `/api/wa/masuk?tanggal=${x.j.tanggal}`, undefined, ADMIN), m = l.j.pesan.find(q => q.teks === "waktu kuno");
  assert.equal(m.ada_berkas, 0); assert.ok(m.diterima > Date.now() - 60e3);
});
