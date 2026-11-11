/* Siklus Bencana: pemeriksaan keamanan 11 Nov. Akun dummy tidak menulis baris nyata (404 seragam); lingkup BP didorong ke SQL sebelum LIMIT (pintu, R3P, renkon);
   meja kaji cepat per kabupaten dalam lingkup BP; BP tanpa Jitupasna di lingkup = 404; batas 500 baris di predikat SQL.
   worker.js utuh di Miniflare + D1 + R2 sungguhan. Jalankan: node --test tests/warga/siklus_keamanan.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16, kjAcak, ASET} from "./_siklus.mjs";
import * as H from "../../src/hak.js";

const U = await mulai("uji-sk-keamanan");
const {DB, api, GET, POST, n, kej} = U;
for (const f of ["kejadian.js", "pulih.js", "renkon.js"]) ASET["/siklus/" + f] = "export const x = 1;";
const [PD, KO] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"])];
const [PDd, KOd] = [await U.staf("Pd Dummy", ["pusdalops"]), await U.staf("Ko Dummy", ["koordalops"])];
await DB.prepare("UPDATE staf SET dummy = 1 WHERE nama IN ('Pd Dummy', 'Ko Dummy')").run();
const BP = await U.bp(), BPd = await U.bp({dummy: 1});
const HARI = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), geser = (t, d) => new Date(Date.parse(t + "T00:00:00Z") + d * 864e5).toISOString().slice(0, 10);
const satu = (sql, ...b) => DB.prepare(sql).bind(...b).first();
const tanggap = async (nama, kab4 = "3201") => {
  const id = await kej(KO, {nama, mulai: "2026-03-02", kab4});
  assert.equal((await POST(PD, `/kejadian/${id}/fase`, {ke: "terverifikasi"})).s, 200);
  const r = await POST(KO, `/kejadian/${id}/fase`, {ke: "tanggap", tanggap_mulai: "2026-03-02"}); assert.equal(r.s, 200, r.t);
  return id;
};
const rusak = (k, unit = 1) => ({jenis: "rusak", sektor: "perumahan", tingkat: "rb", unit, klien_id: k});

const KID = await tanggap("Banjir Bogor keamanan");
const JP = (await POST(KO, "/pulih", {kejadian_id: KID, kab4: "3201"})).j.id;

uji("akun dummy tidak menulis baris nyata: Jitupasna, baris, hitung, status, R3P, kegiatan, renkon, kaji (404 seragam, tidak ada yang berubah)", async () => {
  const takAda = await POST(KOd, "/pulih", {kejadian_id: "KJ-2026-ZZZZZZZZ", kab4: "3201"});
  const baru = await POST(KOd, "/pulih", {kejadian_id: KID, kab4: "3201"}); assert.equal(baru.s, 404); assert.equal(baru.t, takAda.t, "byte demi byte sama dengan tidak ada");
  const sebelum = await n("sk_jitupasna_baris");
  assert.equal((await POST(BPd, `/pulih/${JP}/baris`, {baris: [rusak("klien-dum-001")]})).s, 404);
  assert.equal((await POST(PDd, `/pulih/${JP}/hitung`, {tahun_harga: 2026})).s, 404);
  assert.equal((await POST(KOd, `/pulih/${JP}/status`, {ke: "pengumpulan"})).s, 404);
  assert.equal(await n("sk_jitupasna_baris"), sebelum); assert.equal((await satu("SELECT status FROM sk_jitupasna WHERE id = ?", JP)).status, "dibuka");
  assert.equal((await POST(PD, `/pulih/${JP}/baris`, {baris: [rusak("klien-nyata-01")]})).s, 200, "kontrol: staf nyata menulis");
  await DB.prepare("UPDATE sk_jitupasna SET status = 'final', hitung = '{}' WHERE id = ?").bind(JP).run();   // final di luar rute
  assert.equal((await POST(KOd, "/r3p", {jitupasna_id: JP})).s, 404);
  const r3p = (await POST(KO, "/r3p", {jitupasna_id: JP})).j.id;
  assert.equal((await POST(KOd, `/r3p/${r3p}/kegiatan`, {sektor: "sosial", nama: "Sekolah darurat"})).s, 404);
  assert.equal((await POST(KOd, `/r3p/${r3p}/status`, {ke: "diusulkan"})).s, 404);
  assert.equal(await n("sk_r3p_kegiatan"), 0); assert.equal((await satu("SELECT status FROM sk_r3p WHERE id = ?", r3p)).status, "draf");
  const rk = (await POST(KO, "/renkon", {judul: "Renkon banjir nyata", bencana: "banjir", prov: "32", kab4: "3201"})).j.id;
  assert.equal((await POST(KOd, `/renkon/${rk}/status`, {ke: "pelaksanaan"})).s, 404);
  assert.equal((await POST(PDd, `/renkon/${rk}/asumsi`, {skenario: "skenario baru yang panjang"})).s, 404);
  assert.equal((await satu("SELECT status FROM sk_renkon WHERE id = ?", rk)).status, "persiapan");
  const gm = await tanggap("Gempa kaji keamanan", "3201"); await DB.prepare("UPDATE sk_kejadian SET jenis = 'gempa' WHERE id = ?").bind(gm).run();
  const ing = await api("POST", "/api/siklus/ingest/kaji", {kejadian_id: gm, model: "gempa", masukan: {sumber: "uji"}, ringkas: {rentang: [1, 2]}}, {authorization: "Bearer token-pipa-uji"}); assert.equal(ing.s, 201, ing.t);
  assert.equal((await POST(PDd, `/kaji/${ing.j.id}/status`, {ke: "diperiksa"})).s, 404);
  assert.equal((await POST(PD, `/kaji/${ing.j.id}/status`, {ke: "diperiksa"})).s, 200, "kontrol: staf nyata");
});

uji("BP: meja kaji cepat hanya kabupaten kejadian yang di lingkup akunnya (bukan kab4 utama kejadian), dan hanya isian diverifikasi/masuk_jitupasna", async () => {
  const gm = (await satu("SELECT id FROM sk_kejadian WHERE nama = 'Gempa kaji keamanan'")).id;
  await DB.prepare("UPDATE sk_kejadian SET kab4 = '3205', prov = '32' WHERE id = ?").bind(gm).run();   // kab4 utama Garut; Bogor kabupaten kedua
  await DB.prepare("INSERT OR IGNORE INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat, dummy) VALUES (?, '3205', '2026-03-02', 1, 0), (?, '3201', '2026-03-02', 1, 0)").bind(gm, gm).run();
  const t = Date.parse("2026-03-02T00:00:00Z") + 36e5;
  const ins = (kab, mj) => DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, desa, data, status, dibuat, diubah, oleh) VALUES (?, 'kaji_cepat', '32', ?, 'Desa Uji', ?, 'diverifikasi', ?, ?, 'petugas:x')").bind(id16(), kab, JSON.stringify({kejadian: "gempa", tanggal: "2026-03-02", meninggal: mj}), t, t).run();
  await ins("Garut", 77); await ins("Bogor", 5);
  const kaji = (await satu("SELECT id FROM sk_kaji WHERE kejadian_id = ?", gm)).id;
  const bp = await GET(BP, `/kaji/${kaji}`); assert.equal(bp.s, 200, bp.t);
  assert.deepEqual(bp.j.meja.baris.map(r => r.meninggal), [5], "BP Bogor tidak melihat isian Garut walau kab4 utama kejadian = Garut");
  assert.deepEqual((await GET(PD, `/kaji/${kaji}`)).j.meja.baris.map(r => r.meninggal), [77], "staf: kabupaten utama kejadian, tidak berubah");
});

uji("pintu BP: filter lingkup di SQL sebelum LIMIT 50 (kejadian aktif, kartu R3P menurut kabupaten Jitupasna, renkon berlaku dan disusun)", async () => {
  const t = Date.now(), terlalu = Array.from({length: 55}, (_, i) => i);
  const kBogor = await tanggap("Banjir Bogor lama pintu"); await DB.prepare("UPDATE sk_kejadian SET fase_diubah = 1000 WHERE id = ?").bind(kBogor).run();
  /* R3P: Jitupasna Garut pada kejadian Bogor tidak tampil untuk BP Bogor */
  const jg = id16(); await DB.prepare("INSERT INTO sk_jitupasna (id, kejadian_id, prov, kab4, status, hitung, dibuat, diubah, oleh) VALUES (?, ?, '32', '3205', 'final', '{}', 1, 1, 'staf:uji')").bind(jg, kBogor).run();
  await DB.prepare("INSERT INTO sk_r3p (id, jitupasna_id, kejadian_id, tanggap_mulai, dibuat, diubah, oleh) VALUES (?, ?, ?, '2026-03-02', 1, 1, 'staf:uji')").bind(id16(), jg, kBogor).run();
  const href = bp2 => bp2.j.kartu.filter(k => k.kode === "r3p").map(k => k.href);
  assert.ok(!href(await GET(BP, "/pintu")).includes(`/siklus/pulih/${jg}`), "BP Bogor tidak melihat R3P Jitupasna Garut");
  assert.ok(href(await GET(PD, "/pintu")).includes(`/siklus/pulih/${jg}`), "staf melihat");
  await DB.batch(terlalu.map(i => DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, prov, kab4, mulai, fase, fase_diubah, tanggap_mulai, asal, dibuat, diubah, oleh, dummy) VALUES (?, 'banjir', ?, '32', '3205', '2026-03-02', 'tanggap', ?, '2026-03-02', 'manual', 1, 1, 'uji', 0)").bind(kjAcak(), "Garut " + i, t + 1e6 + i)));
  const bp = await GET(BP, "/pintu"); assert.equal(bp.s, 200, bp.t);
  const nama = bp.j.kartu.map(k => k.nama);
  assert.ok(nama.includes("banjir: Banjir Bogor lama pintu"), "kejadian Bogor muncul walau 55 kejadian Garut lebih baru"); assert.ok(!nama.some(x => /Garut \d/.test(x)));
  const sa = (await GET(PD, "/pintu")).j.kartu.map(k => k.nama); assert.equal(sa.filter(x => /Garut \d/.test(x)).length, 50, "staf: LIMIT 50 tetap");
  /* renkon: 51 renkon berlaku Garut lebih dekat kedaluwarsa, satu Bogor lebih jauh */
  const sah = (sampai, bencana, kab4) => DB.prepare("INSERT INTO sk_renkon (id, judul, bencana, prov, kab4, status, versi, tgl_sah, berlaku_sampai, no_penetapan, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, '32', ?, 'berlaku', 1, ?, ?, 'SK uji', 1, 1, 'uji', 0)")
    .bind(id16(), `Renkon ${bencana} ${kab4}`, bencana, kab4, geser(sampai, -1095), sampai);
  await DB.batch([...Array.from({length: 51}, (_, i) => sah(geser(HARI, 5 + (i % 10)), "tsunami" + i, "3205")), sah(geser(HARI, 60), "longsor", "3201")]);
  const rk = (await GET(BP, "/pintu")).j.kartu.filter(k => k.kode === "renkon").map(k => k.nama);
  assert.ok(rk.some(x => /Renkon longsor 3201/.test(x)), "renkon Bogor muncul: " + rk.join("|")); assert.ok(!rk.some(x => /3205/.test(x)));
});

uji("daftar Jitupasna: BP tanpa Jitupasna di lingkup = 404 sama dengan kejadian tak ada; staf mendapat daftar kosong", async () => {
  const kosong = await tanggap("Banjir Bogor tanpa JP");
  assert.equal((await GET(KO, `/pulih?kejadian_id=${kosong}`)).j.baris.length, 0);
  const bp = await GET(BP, `/pulih?kejadian_id=${kosong}`), tak = await GET(BP, "/pulih?kejadian_id=KJ-2026-ZZZZZZZZ");
  assert.equal(bp.s, 404); assert.equal(bp.t, tak.t);
  assert.equal((await GET(BP, `/pulih?kejadian_id=${KID}`)).s, 200, "ada Jitupasna di lingkup");
});

uji("predikat 500 baris di SQL: batch yang melewati batas tidak menyisipkan sisanya walau lewat hak.js langsung", async () => {
  const j2 = id16(), t = Date.now();
  await DB.prepare("INSERT INTO sk_jitupasna (id, kejadian_id, prov, kab4, status, versi, dibuat, diubah, oleh) VALUES (?, ?, '32', '3201', 'pengumpulan', 7, ?, ?, 'staf:uji')").bind(j2, KID, t, t).run();
  await DB.batch(Array.from({length: 498}, (_, i) => DB.prepare("INSERT INTO sk_jitupasna_baris (id, jitupasna_id, jenis, sektor, tingkat, unit, klien_id, dibuat, oleh, dummy) VALUES (?, ?, 'rusak', 'perumahan', 'rb', 1, ?, ?, 'uji', 0)").bind(id16(), j2, "isi-" + String(i).padStart(5, "0"), t)));
  const env = {DB}, p = H.pelakuAdmin;
  const st = Array.from({length: 5}, (_, i) => H.skStmtBaris(env, p, j2, {id: id16(), jenis: "rusak", sektor: "perumahan", tingkat: "rb", unit: 1, klien_id: "lebih-00" + i}, t, "uji", 0));
  const res = await H.skBatch(env, p, [...st, H.skStmtJejak(env, p, "uji", "jitupasna", j2, "baris", null, null, "5 dikirim", t, 0)]);
  assert.equal(res.slice(0, 5).reduce((a, x) => a + (x.meta.changes ? 1 : 0), 0), 2, "498 + 2 = 500, tiga sisanya ditolak predikat");
  assert.equal(await n("sk_jitupasna_baris", `jitupasna_id = '${j2}'`), 500);
});
