/* Siklus Bencana: rute dummy (SK-030, SK-041). UJ-KP-13, INV-5. worker.js utuh di Miniflare + D1 + R2 sungguhan.
   Jalankan: node --test tests/warga/siklus_dummy.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";

const U = await mulai("uji-sk-dummy");
const {DB, api, GET, POST, n} = U;
const [PD, KO] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"])];
const BP = await U.bp(), {SA, TAMU} = U;
const R2 = await U.mf.getR2Bucket("MEDIA");
const TABEL = ["sk_kejadian", "sk_kejadian_kab", "sk_kejadian_alias", "sk_kejadian_sumber", "sk_jejak"];
const dummyN = async () => { let t = 0; for (const x of TABEL) t += await n(x, "dummy = 1"); return t; };
const reset = () => DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'sk.dummy'").run();   // 6 per jam: tiap uji mulai dari nol
const TOK = {authorization: "Bearer token-pipa-uji"};

uji("UJ-KP-13: bukan SA ditolak (tamu 401, PD/KO/BP 403) dan tidak menulis", async () => {
  for (const a of [PD, KO]) assert.equal((await POST(a, "/dummy", {aksi: "isi", halaman: "kejadian"})).s, 403);
  assert.equal((await POST(TAMU, "/dummy", {aksi: "isi", halaman: "kejadian"})).s, 401);
  assert.equal((await POST(BP, "/dummy", {aksi: "isi", halaman: "kejadian"})).s, 403);
  assert.equal(await dummyN(), 0);
});
uji("masukan: aksi dan halaman asing, periode salah, kab4 asing 400", async () => {
  for (const b of [{}, {aksi: "x"}, {aksi: "isi"}, {aksi: "isi", halaman: "lain"}, {aksi: "isi", halaman: "kejadian", periode: "2026-02-30"}, {aksi: "isi", halaman: "kejadian", kab4: "9999"}]) assert.equal((await POST(SA, "/dummy", b)).s, 400, JSON.stringify(b));
});
uji("isi kejadian: 7 fase, sumber ambigu, tanpa_wilayah, dua sumber dengan selisih; periode dari layar; 409 bila sudah ada", async () => {
  const r = await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-03", kab4: "3201"}); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.per_tabel.sk_kejadian, 7); assert.equal(r.j.contoh, false);
  const fase = (await DB.prepare("SELECT fase, mulai FROM sk_kejadian WHERE dummy = 1 ORDER BY mulai").all()).results;
  assert.deepEqual(fase.map(f => f.fase), ["terdeteksi", "terverifikasi", "tanggap", "transisi", "pemulihan", "selesai", "dibatalkan"]);
  assert.equal(fase[0].mulai, "2026-03-01", "periode dari layar, bukan hari ini");
  assert.equal(await n("sk_kejadian_sumber", "status = 'ambigu' AND dummy = 1"), 1); assert.equal(await n("sk_kejadian_sumber", "status = 'tanpa_wilayah' AND dummy = 1 AND kab4 IS NULL"), 1);
  const id = (await DB.prepare("SELECT id FROM sk_kejadian WHERE dummy = 1 AND fase = 'tanggap'").first()).id;
  const d = await GET(SA, `/kejadian/${id}`); assert.equal(d.s, 200); const m = d.j.selisih.find(x => x.metrik === "meninggal"); assert.equal(m.selisih, 3); assert.equal(m.n, 2);
  assert.equal(await n("sk_jejak", "dummy = 0 AND aksi = 'isi_dummy'"), 0, "jejak isi ikut dummy");
  const lagi = await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-03"}); assert.equal(lagi.s, 409); assert.match(lagi.t, /sudah ada 7/);
  assert.equal(await n("sk_kejadian", "dummy = 1"), 7, "409 tidak menulis");
});
uji("staf nyata dan BP tidak melihat dummy; SA melihat; publik 404; ingest menolak mengacunya", async () => {
  assert.equal((await GET(PD, "/kejadian?dari=2026-03-01&sampai=2026-03-31")).j.baris.length, 0);
  assert.equal((await GET(SA, "/kejadian?dari=2026-03-01&sampai=2026-03-31")).j.baris.length, 7);
  const id = (await DB.prepare("SELECT id FROM sk_kejadian WHERE dummy = 1 AND fase = 'tanggap'").first()).id;
  assert.equal((await GET(PD, `/kejadian/${id}`)).s, 404); assert.equal((await GET(BP, `/kejadian/${id}`)).s, 404);
  await DB.prepare("UPDATE sk_kejadian SET publik = 1, ringkasan_publik = 'Ringkasan contoh banjir yang cukup panjang.' WHERE id = ?").bind(id).run();
  assert.equal((await GET(TAMU, `/publik/kejadian/${id}`)).s, 404, "dummy tidak pernah publik");
  const j = await api("GET", "/api/siklus/ingest/jendela?dari=2026-03-01&sampai=2026-03-31", undefined, TOK); assert.equal(j.s, 200); assert.equal(JSON.stringify(j.j).includes(id), false);
  const t = await api("POST", "/api/siklus/ingest/kejadian", {keputusan: [{sumber: "dibi", kode: "z1", aksi: "tambah", kejadian_id: id, jenis: "banjir", mulai: "2026-03-03", diambil: 1_780_000_000_000, dampak: {}}]}, TOK);
  assert.equal(t.s, 400, "INV-5"); assert.match(t.t, /dummy/);
});
uji("hapus: anak sebelum induk dalam satu batch, semua tabel kosong dari dummy, baris nyata utuh, jejak hapus bertahan", async () => {
  await reset();
  const nyata = await U.kej(SA, {nama: "Banjir nyata", mulai: "2026-03-05"});
  const sebelum = await n("sk_kejadian", "dummy = 0");
  assert.equal((await POST(PD, "/dummy", {aksi: "hapus"})).s, 403);
  const r = await POST(SA, "/dummy", {aksi: "hapus"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.per_tabel.sk_kejadian, 7); assert.ok(r.j.per_tabel.sk_kejadian_sumber >= 4);
  assert.equal(await dummyN(), 0);
  assert.equal(await n("sk_kejadian", "dummy = 0"), sebelum); assert.ok(await n("sk_kejadian", `id = '${nyata}'`));
  assert.equal(await n("sk_jejak", "aksi = 'hapus_dummy' AND dummy = 0"), 1);
  assert.equal((await POST(SA, "/dummy", {aksi: "hapus"})).j.dihapus, 0, "hapus kosong = 0, bukan galat");
  assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-03"})).s, 200, "isi ulang sesudah hapus");
  await POST(SA, "/dummy", {aksi: "hapus"});
});
uji("SK-041 paparan tanpa tabel: isi memeriksa berkas _dummy/ ada (404 bila belum), tidak menyemai D1; hapus tetap jalan", async () => {
  await reset();
  const sebelum = await dummyN();
  const a = await POST(SA, "/dummy", {aksi: "isi", halaman: "paparan"}); assert.equal(a.s, 404);
  await R2.put("siklus/saji/_dummy/paparan/3201.json", JSON.stringify({dummy: true}));
  const b = await POST(SA, "/dummy", {aksi: "isi", halaman: "paparan"}); assert.equal(b.s, 200); assert.deepEqual(b.j, {dibuat: 0, dihapus: 0, per_tabel: {}, contoh: true});
  assert.equal(await dummyN(), sebelum);
  assert.equal((await POST(SA, "/dummy", {aksi: "hapus", halaman: "paparan"})).j.contoh, false);
  assert.equal((await POST(PD, "/dummy", {aksi: "isi", halaman: "paparan"})).s, 403);
});
uji("dummy dibatasi 6 per jam", async () => {
  await reset();
  let s; for (let i = 0; i < 8; i++) s = (await POST(SA, "/dummy", {aksi: "hapus"})).s;
  assert.equal(s, 429);
});
uji("periode objek: {dari, sampai} menentukan rentang; {kab4, prov, bahaya} diterima untuk paparan; periode salah 400", async () => {
  await reset();
  const r = await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: {dari: "2026-09-10", sampai: "2026-09-12"}, kab4: "3202"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.per_tabel.sk_kejadian, 7);
  const m = (await DB.prepare("SELECT min(mulai) a, max(mulai) b, min(kab4) k FROM sk_kejadian WHERE dummy = 1").first()); assert.deepEqual([m.a, m.b, m.k], ["2026-09-10", "2026-09-12", "3202"], "semua dalam rentang layar");
  assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: {dari: "2026-09-10", sampai: "2026-09-12"}, kab4: "3202"})).s, 409);
  await POST(SA, "/dummy", {aksi: "hapus"}); await reset();
  for (const periode of [{dari: "2026-09-12", sampai: "2026-09-10"}, {dari: "x"}, {kab4: "3201", prov: "abc"}]) assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode})).s, 400, JSON.stringify(periode));
  await R2.put("siklus/saji/_dummy/paparan/3201.json", "{}");
  const p = await POST(SA, "/dummy", {aksi: "isi", halaman: "paparan", periode: {kab4: "3201", prov: "32", bahaya: "banjir"}}); assert.equal(p.s, 200, p.t); assert.equal(p.j.contoh, true); assert.deepEqual(p.j.per_tabel, {});
});
