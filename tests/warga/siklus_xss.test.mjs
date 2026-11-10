/* Siklus Bencana: teks dari pihak ketiga dan staf (KEAMANAN 6, UJ-F1-15 bagian rute) dan penjaga tulis (UJ-KP-07, 08, 11 bagian XSS/jejak).
   Nama berisi <img onerror>, javascript:, bidi, 5.000 huruf: tidak pernah menjadi markup (JSON ber-nosniff), dibersihkan/dipotong di ingest, ditolak pada masukan staf.
   Jalankan: node --test tests/warga/siklus_xss.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";

const U = await mulai("uji-sk-xss");
const {DB, api, GET, POST, n} = U;
const KO = await U.staf("Ko Uji", ["koordalops"]), TOK = {authorization: "Bearer token-pipa-uji"};
const ING = (k) => api("POST", "/api/siklus/ingest/kejadian", {keputusan: [k]}, TOK);
const dasar = (o = {}) => ({sumber: "gdacs", kode: "x" + Math.random().toString(36).slice(2), aksi: "baru", jenis: "banjir", kab4: "3201", mulai: "2026-03-02", diambil: 1_780_000_000_000, ...o});

uji("ingest menyaring nama: buang < >, kontrol, bidi; potong ke 160; javascript: tinggal teks biasa", async () => {
  const kasus = [["<img src=x onerror=alert(1)>Banjir Bogor", /^img src=x onerror=alert\(1\)Banjir Bogor$/], ["javascript:alert(1) Banjir", /^javascript:alert\(1\) Banjir$/], ["Banjir‮Bogor​﻿ Raya", /^BanjirBogor Raya$/], ["B".repeat(5000), /^B{160}$/], ["  Banjir \n\t  besar  ", /^Banjir besar$/]];
  for (const [i, [nama, pola]] of kasus.entries()) {
    const r = await ING(dasar({nama, mulai: `2026-03-0${i + 3}`})); assert.equal(r.s, 200, r.t); assert.equal(r.j.baru, 1);
    const baris = await DB.prepare("SELECT nama FROM sk_kejadian WHERE mulai = ?").bind(`2026-03-0${i + 3}`).first();
    assert.match(baris.nama, pola, `nama ${JSON.stringify(nama.slice(0, 30))}`); assert.ok(!/[<>‮​﻿]/.test(baris.nama)); assert.ok(baris.nama.length <= 160);
  }
  assert.equal((await ING(dasar({nama: "<>", mulai: "2026-03-10"}))).s, 400, "nama kosong sesudah disaring ditolak (bukan kejadian tanpa nama)");
  assert.equal((await ING(dasar({kode: "k‮1", nama: "Banjir sah"}))).s, 400, "bidi pada kode ditolak");
  const k = await ING(dasar({kode: "kode<img src=x onerror=alert(1)>", pengenal_luar: "<img onerror=alert(1)>luar", nama: "Banjir kode", mulai: "2026-03-11"})); assert.equal(k.s, 200, k.t);
  const sb = await DB.prepare("SELECT kode, pengenal_luar FROM sk_kejadian_sumber WHERE kode LIKE 'kode%'").first();
  assert.equal(sb.kode, "kodeimg src=x onerror=alert(1)"); assert.equal(sb.pengenal_luar, "img onerror=alert(1)luar", "kode dan pengenal_luar dibersihkan (item 3)");
});
uji("masukan staf: bidi, kontrol, 5.000 huruf, telepon, surel ditolak 400 (teks()); markup lolos sebagai TEKS dan keluar sebagai JSON ber-nosniff, bukan HTML", async () => {
  for (const nama of ["Banjir‮bogor", "Banjir​", "B".repeat(5000), "Banjir 081234567890", "banjir@contoh.id", "Banjir\u0007"]) assert.equal((await POST(KO, "/kejadian", {jenis: "banjir", nama, kab4: "3202", mulai: "2026-03-02", paksa: true})).s, 400, JSON.stringify(nama.slice(0, 20)));
  const r = await POST(KO, "/kejadian", {jenis: "banjir", nama: "<img src=x onerror=alert(1)> javascript:alert(1)", kab4: "3202", mulai: "2026-03-02", paksa: true}); assert.equal(r.s, 201, r.t);
  const d = await GET(KO, `/kejadian/${r.j.id}`);
  assert.match(d.h.get("content-type"), /^application\/json/); assert.equal(d.h.get("x-content-type-options"), "nosniff"); assert.equal(d.j.kejadian.nama, "img src=x onerror=alert(1) javascript:alert(1)", "item 3: < dan > dibuang saat simpan (bersihNama); layar tetap memasangnya lewat esc()/textContent");
  const l = await GET(KO, "/kejadian?dari=2026-03-02&sampai=2026-03-02"); assert.match(l.h.get("content-type"), /^application\/json/); assert.doesNotMatch(l.h.get("content-type"), /html/);
  assert.equal((await POST(KO, `/kejadian/${r.j.id}/fase`, {ke: "terverifikasi", alasan: "<img src=x onerror=alert(2)> terverifikasi"})).s, 200);
  assert.equal((await DB.prepare("SELECT catatan FROM sk_jejak WHERE obyek_id = ? AND aksi = 'fase'").bind(r.j.id).first()).catatan, "img src=x onerror=alert(2) terverifikasi", "alasan dibersihkan");
  assert.equal((await POST(KO, `/kejadian/${r.j.id}/publik`, {publik: true, ringkasan: "<script>alert(1)</script> banjir di wilayah Bogor selatan"})).s, 200);
  const p = await GET(U.TAMU, `/publik/kejadian/${r.j.id}`); assert.equal(p.s, 200); assert.ok(!/[<>]/.test(p.j.ringkasan), "ringkasan publik tanpa markup: " + p.j.ringkasan);
  assert.equal((await POST(KO, `/kejadian/${r.j.id}/publik`, {publik: true, ringkasan: "<><><><><><><><><><><><><><><><><><>"})).s, 400, "kosong sesudah dibersihkan ditolak"); assert.match(p.h.get("content-type"), /^application\/json/); assert.equal(p.h.get("x-content-type-options"), "nosniff");
});
uji("UJ-KP-07: tulis langsung lewat SQL hanya lewat pembatas tabel: CHECK menahan publik tanpa ringkasan dan fase digabung tanpa ke; ringkasan 600+ ditolak; jejak tidak dapat dibuat oleh rute lain", async () => {
  const id = (await DB.prepare("SELECT id FROM sk_kejadian LIMIT 1").first()).id;
  await assert.rejects(DB.prepare("UPDATE sk_kejadian SET publik = 1, ringkasan_publik = NULL WHERE id = ?").bind(id).run(), /constraint|CHECK/i);
  await assert.rejects(DB.prepare("UPDATE sk_kejadian SET ringkasan_publik = ? WHERE id = ?").bind("x".repeat(601), id).run(), /constraint|CHECK/i);
  await assert.rejects(DB.prepare("UPDATE sk_kejadian SET fase = 'digabung' WHERE id = ?").bind(id).run(), /constraint|CHECK|sk_fase/i);
  const sebelum = await n("sk_jejak");
  for (const [m, j] of [["POST", "/api/siklus/jejak"], ["PATCH", "/api/siklus/jejak"], ["DELETE", "/api/siklus/jejak"], ["POST", "/api/siklus/kejadian/arsip"]]) assert.ok([404, 405].includes((await api(m, j, {}, KO.hp)).s), `${m} ${j}: tidak ada rute tulis jejak`);
  assert.equal(await n("sk_jejak"), sebelum);
});
