/* Siklus Bencana G2: rute kaji dan ingest/kaji (SK-053). UJ-F3-08, UJ-KP-03. worker.js utuh di Miniflare + D1 + R2 sungguhan.
   Jalankan: node --test tests/warga/siklus_kaji.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";
import * as H from "../../src/hak.js";

const U = await mulai("uji-sk-kaji");
const {DB, api, GET, POST, n, kej} = U;
const [PD, KO, PM] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"]), await U.staf("Pm Uji", ["pimpinan"])];
const BP = await U.bp(), BP2 = await U.bp({kab: "Garut"}), {SA, TAMU} = U;
const R2 = await U.mf.getR2Bucket("MEDIA");
const TOK = {authorization: "Bearer token-pipa-uji"};
const KID = await kej(KO, {nama: "Gempa uji", jenis: "gempa", kab4: "3201", mulai: "2026-03-02"});
const ingest = (o = {}, h = TOK) => api("POST", "/api/siklus/ingest/kaji", {kejadian_id: KID, model: "gempa", masukan: {sumber: "usgs-shakemap", id: "us6000tkt2"}, ringkas: {rentang: [22.1, 353.8], kelas: "kuning"},
  hasil_r2: `siklus/saji/kaji/${KID}.json`, galat_kalibrasi: {kalibrasi: 3.06, faktor_loo: 5.34}, ...o}, h);

uji("UJ-F3-08: ingest tanpa Bearer 401, dengan cookie sesi 400, tidak menulis", async () => {
  assert.equal((await ingest({}, {})).s, 401);
  assert.equal((await ingest({}, {...TOK, cookie: PD.h.cookie})).s, 400);
  assert.equal(await n("sk_kaji"), 0);
});
uji("UJ-F3-08: ingest membuat versi baru dan tidak menimpa; yakin estimasi-model; jejak sistem:ingest", async () => {
  const a = await ingest(); assert.equal(a.s, 201, a.t); assert.equal(a.j.versi, 1); assert.equal(a.j.status, "dihitung");
  const b = await ingest({ringkas: {rentang: [30, 400]}}); assert.equal(b.s, 201); assert.equal(b.j.versi, 2); assert.notEqual(b.j.id, a.j.id);
  const lama = await DB.prepare("SELECT versi, ringkas, yakin, oleh FROM sk_kaji WHERE id = ?").bind(a.j.id).first();
  assert.deepEqual([lama.versi, lama.yakin, lama.oleh], [1, "estimasi-model", "sistem:ingest"]); assert.deepEqual(JSON.parse(lama.ringkas).rentang, [22.1, 353.8], "versi 1 utuh");
  assert.equal((await ingest({model: "banjir_jam1"})).j.versi, 1, "versi dihitung per model");
  assert.equal(await n("sk_jejak", "obyek = 'kaji' AND aksi = 'ingest'"), 3);
});
uji("ingest menolak: yakin lain, rentang bukan larik dua, rentang terbalik/negatif, model/status/hasil_r2 salah, kunci tak sah, menunggu_data berrentang", async () => {
  const sebelum = await n("sk_kaji");
  for (const o of [{yakin: "resmi"}, {yakin: "terverifikasi"}, {ringkas: {rentang: [5]}}, {ringkas: {rentang: [1, 2, 3]}}, {ringkas: {rentang: 5}}, {ringkas: {kelas: "kuning"}}, {ringkas: {rentang: [9, 1]}}, {ringkas: {rentang: [-1, 1]}}, {ringkas: {rentang: ["1", "2"]}},
    {ringkas: {rentang: [1, 2], Total: 3}}, {ringkas: [1, 2]}, {ringkas: null}, {model: "tsunami"}, {status: "dipakai"}, {hasil_r2: "siklus/saji/kaji/KJ-2026-AAAAAAAA.json"}, {hasil_r2: "../x.json"}, {masukan: "x"}, {masukan: {sumber: "x".repeat(900)}},
    {kejadian_id: "abc"}, {status: "menunggu_data", ringkas: {rentang: [1, 2]}}, {galat_kalibrasi: []}]) {
    const r = await ingest(o); assert.equal(r.s, 400, JSON.stringify(o).slice(0, 80) + " " + r.t);
  }
  assert.equal(await n("sk_kaji"), sebelum);
});
uji("ingest: menunggu_data tanpa rentang sah; kejadian tidak ada 404; dummy 404; digabung 409; teks dibersihkan dari markup", async () => {
  const m = await ingest({status: "menunggu_data", model: "banjir_jam1", ringkas: {rentang: null, alasan: "grid USGS belum terbit"}, hasil_r2: null}); assert.equal(m.s, 201, m.t); assert.equal(m.j.status, "menunggu_data");
  assert.equal((await ingest({kejadian_id: "KJ-2026-ZZZZZZZZ", hasil_r2: null})).s, 404);
  const x = await ingest({masukan: {sumber: "<img src=x onerror=alert(1)>usgs", id: "a‮b"}}); assert.equal(x.s, 201);
  const s = (await DB.prepare("SELECT masukan FROM sk_kaji WHERE id = ?").bind(x.j.id).first()).masukan; assert.doesNotMatch(s, /[<>‮]/);
  const dum = await DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, mulai, fase, fase_diubah, asal, dibuat, diubah, oleh, dummy) VALUES ('KJ-2026-DMMY0001', 'gempa', 'Contoh gempa', '2026-03-02', 'tanggap', 1, 'manual', 1, 1, 'x', 1)").run(); assert.ok(dum.success);
  assert.equal((await ingest({kejadian_id: "KJ-2026-DMMY0001", hasil_r2: null})).s, 404, "kejadian dummy tidak menerima ingest");
  const k2 = await kej(KO, {nama: "Gempa digabung", jenis: "gempa", kab4: "3201", mulai: "2026-03-02"});
  await DB.prepare("UPDATE sk_kejadian SET fase = 'dibatalkan' WHERE id = ? AND fase = 'terdeteksi'").bind(k2).run();
  assert.equal((await ingest({kejadian_id: k2, hasil_r2: null})).s, 409);
});

let SID;
uji("daftar dan detail: staf melihat versi terbaru dulu; detail memuat R2 (<100 KB), isian meja berdampingan hanya kolom angka", async () => {
  const l = await GET(PD, `/kaji?kejadian_id=${KID}`); assert.equal(l.s, 200, l.t);
  assert.deepEqual(l.j.baris.filter(r => r.model === "gempa").map(r => r.versi), [3, 2, 1]);
  SID = l.j.baris.find(r => r.model === "gempa" && r.versi === 1).id;
  assert.equal(l.j.baris[0].oleh, "sistem:ingest"); assert.ok(Array.isArray(l.j.baris[0].ringkas.rentang));
  await R2.put(`siklus/saji/kaji/${KID}.json`, JSON.stringify({v: 1, jenis: "kaji", versi: 1, korban: {rentang: [22.1, 353.8], y: "estimasi-model"}}));
  const mulaiMs = Date.parse("2026-03-02T00:00:00Z");
  await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, desa, data, status, dibuat, diubah, oleh) VALUES (?, 'kaji_cepat', '32', 'Bogor', 'Desa Uji', ?, 'diverifikasi', ?, ?, 'petugas:x')").bind(id16(), JSON.stringify({kejadian: "gempa", tanggal: "2026-03-02", meninggal: 2, rumah_rb: 7, foto: "https://rahasia.example/f.jpg", kebutuhan: "hubungi 0812 rahasia"}), mulaiMs + 3600e3, mulaiMs + 3600e3).run();
  await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, desa, data, status, dibuat, diubah, oleh) VALUES (?, 'kaji_cepat', '32', 'Bogor', 'Desa Uji', ?, 'dilaporkan', ?, ?, 'petugas:x')").bind(id16(), JSON.stringify({kejadian: "gempa", tanggal: "2026-03-02", meninggal: 99, rumah_rb: 7, foto: "https://rahasia.example/f.jpg", kebutuhan: "hubungi 0812 rahasia"}), mulaiMs + 3600e3, mulaiMs + 3600e3).run();
  const d = await GET(PD, `/kaji/${SID}`); assert.equal(d.s, 200, d.t);
  assert.equal(d.j.hasil_status, "ada"); assert.equal(d.j.hasil.korban.y, "estimasi-model"); assert.equal(d.j.hasil_selaras, true); assert.equal(d.j.kaji.yakin, "estimasi-model");
  assert.equal(d.j.meja.baris.length, 1, "hanya isian diverifikasi atau masuk_jitupasna; yang baru dilaporkan tidak ikut"); assert.equal(d.j.meja.baris[0].meninggal, 2); assert.equal(d.j.meja.baris[0].rumah_rb, 7);
  assert.doesNotMatch(d.t, /rahasia|data"/, "teks bebas dan foto meja tidak ikut");
  assert.deepEqual(d.j.kaji.ringkas.rentang, [22.1, 353.8], "rentang hasil model terpisah dari angka meja");
  const lain = await GET(PD, `/kaji/${(await GET(PD, `/kaji?kejadian_id=${KID}`)).j.baris[0].id}`); assert.equal(lain.j.hasil_selaras, false, "R2 versi 1, baris versi lain");
});
function id16() { return [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join(""); }
uji("detail: R2 lebih 100 KB tidak dibuka, R2 tidak ada = menunggu", async () => {
  await R2.put(`siklus/saji/kaji/${KID}.json`, JSON.stringify({v: 1, pad: "x".repeat(110 * 1024)}));
  assert.equal((await GET(PD, `/kaji/${SID}`)).j.hasil_status, "terlalu_besar");
  await R2.delete(`siklus/saji/kaji/${KID}.json`);
  const d = await GET(PD, `/kaji/${SID}`); assert.equal(d.j.hasil_status, "menunggu"); assert.equal(d.j.hasil, null);
});
uji("UJ-KP-03: BP lingkup melihat tanpa kolom internal (oleh); BP luar lingkup, id tidak ada, dan kejadian tak ada memberi 404 byte demi byte sama", async () => {
  const ok = await GET(BP, `/kaji?kejadian_id=${KID}`); assert.equal(ok.s, 200); assert.ok(ok.j.baris.length >= 3); for (const r of ok.j.baris) assert.equal("oleh" in r, false);
  const d = await GET(BP, `/kaji/${SID}`); assert.equal(d.s, 200); assert.equal("oleh" in d.j.kaji, false);
  const luar = await GET(BP2, `/kaji?kejadian_id=${KID}`), takAda = await GET(BP2, "/kaji?kejadian_id=KJ-2026-ZZZZZZZZ"), luarD = await GET(BP2, `/kaji/${SID}`), takAdaD = await GET(BP2, "/kaji/0123456789abcdef");
  assert.equal(luar.s, 404); assert.equal(luar.t, takAda.t); assert.equal(luarD.s, 404); assert.equal(luarD.t, takAdaD.t); assert.equal(luar.t, luarD.t);
  assert.equal((await GET(PD, "/kaji")).s, 400); assert.equal((await GET(PD, "/kaji?kejadian_id=x")).s, 400);
  assert.equal((await GET(TAMU, `/kaji?kejadian_id=${KID}`)).s, 401);
});
uji("status: dihitung ke diperiksa ke dipakai; ditarik wajib alasan; ditarik terminal; PM dan BP ditolak; jejak tercatat", async () => {
  const b = (await ingest()).j.id;
  assert.equal((await POST(PM, `/kaji/${b}/status`, {ke: "diperiksa"})).s, 403);
  assert.equal((await POST(PD, `/kaji/${b}/status`, {ke: "dipakai"})).s, 409, "lompat dihitung ke dipakai");
  assert.equal((await POST(PD, `/kaji/${b}/status`, {ke: "final"})).s, 400);
  assert.equal((await POST(PD, `/kaji/${b}/status`, {ke: "diperiksa"})).s, 200);
  assert.equal((await POST(KO, `/kaji/${b}/status`, {ke: "dipakai"})).s, 200);
  assert.equal((await POST(KO, `/kaji/${b}/status`, {ke: "ditarik"})).s, 400, "tanpa alasan"); assert.equal((await POST(KO, `/kaji/${b}/status`, {ke: "ditarik", alasan: "ab"})).s, 400);
  assert.equal((await POST(KO, `/kaji/${b}/status`, {ke: "ditarik", alasan: "<b>masukan MMI</b> salah"})).s, 200);
  const r = await DB.prepare("SELECT status, alasan_tarik FROM sk_kaji WHERE id = ?").bind(b).first(); assert.equal(r.status, "ditarik"); assert.doesNotMatch(r.alasan_tarik, /[<>]/);
  assert.equal((await POST(KO, `/kaji/${b}/status`, {ke: "dipakai"})).s, 409, "ditarik tidak kembali");
  assert.equal(await n("sk_jejak", `obyek = 'kaji' AND obyek_id = '${b}' AND aksi = 'status'`), 3);
  assert.equal((await GET(PD, `/kaji/${b}`)).j.kaji.alasan_tarik.includes("salah"), true);
  assert.equal((await POST(PD, "/kaji/0123456789abcdef/status", {ke: "diperiksa"})).s, 404);
});
uji("balapan status: pernyataan yang kalah tidak berubah dan jejaknya tidak ditulis (changes() = 0)", async () => {
  const b = (await ingest()).j.id, p = H.pelakuSkStaf, env = {DB}, sebelum = await n("sk_jejak", "obyek = 'kaji'");
  const res = await H.skBatch(env, p, [H.skStmtKajiStatus(env, p, b, "diperiksa", "dipakai", null, Date.now()), H.skStmtJejakJikaBerubah(env, p, "staf:x", "kaji", b, "status", "diperiksa", "dipakai", null, Date.now())]);
  assert.equal(res[0].meta.changes, 0); assert.equal(await n("sk_jejak", "obyek = 'kaji'"), sebelum);
  assert.throws(() => H.skStmtKajiStatus(env, H.pelakuSkInstansi, b, "dihitung", "diperiksa", null, 1), e => e.status === 403, "BP tidak mengubah kaji");
  assert.throws(() => H.skStmtKajiBaru(env, H.pelakuSkStaf, {}), e => e.status === 403, "staf tidak menambah kaji; hanya sistem dan admin");
});
uji("versi ke-100 ditolak CHECK (409), bukan menimpa", async () => {
  const k = await kej(KO, {nama: "Gempa banyak", jenis: "gempa", kab4: "3201", mulai: "2026-03-03"});
  await DB.prepare("INSERT INTO sk_kaji (id, kejadian_id, model, versi, status, masukan, ringkas, dihitung, diubah, oleh) SELECT printf('%016x', 1000 + value), ?, 'gempa', 99, 'dihitung', '{}', '{\"rentang\":[1,2]}', 1, 1, 'x' FROM json_each('[1]')").bind(k).run();
  assert.equal((await ingest({kejadian_id: k, hasil_r2: null})).s, 409);
  assert.equal(await n("sk_kaji", `kejadian_id = '${k}'`), 1);
});
