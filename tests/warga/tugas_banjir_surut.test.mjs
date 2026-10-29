/* Penutup tugas banjir terbaca "surut" (bukan padam/api) di rincian admin, linimasa, rekap respons; karhutla tetap berbahasa api; 🧪 dummy
   dengan bencana=banjir mengisi tiga tugas contoh. worker.js utuh di workerd + D1 dengan migrasi apa adanya (TEST.md).
   Jalankan: node --test tests/warga/tugas_banjir_surut.test.mjs */
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";

const JAM = 3600e3, PB = {"x-pb": "1"}, uji = berantai(), id16 = () => randomBytes(8).toString("hex");
const U = await siapkan("uji-banjir-surut"), {DB, api} = U;
let ipN = 0; const SANDI = "SandiUji23456789";
async function akun(username) {
  const garam = "g".repeat(32), id = id16();
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, 'pemkab', 'kab', 'Pemerintah Seruyan', ?, '["62"]', '62', 'Seruyan', ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, 0)`)
    .bind(id, username, "uji|" + username, garam, sha256(garam + SANDI)).run();
  const r = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, "cf-connecting-ip": `198.51.100.${++ipN}`}); assert.equal(r.s, 200, r.t);
  return {cookie: r.h.get("set-cookie").split(",")[0].split(";")[0], ...PB};
}
const tugas = async (bencana, o = {}) => {
  const id = id16(), t = Date.now() - 30 * JAM;
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, dibuat, terakhir_terdeteksi, status, dummy) VALUES (?, '62', 'Seruyan', 'Seruyan Hilir', ?, 113, 3, 1, ?, ?, 'buka', 0)").bind(id, o.lat, t, t).run();
  if (bencana !== "karhutla") await DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES (?, ?)").bind(id, bencana).run();
  return id;
};
let H, B, F;
const linimasa = id => api("GET", `/api/ops/linimasa/${id}`, undefined, H);
const rincian = async id => (await api("GET", `/api/instansi/admin/tugas/${id}`, undefined, ADMIN)).j.tugas;

uji("banjir: ditutup admin lalu terbaca surut di rincian dan linimasa; tanpa klaim satelit", async () => {
  H = await akun("surut1"); B = await tugas("banjir", {lat: -3.1}); F = await tugas("karhutla", {lat: -3.9});
  const s = await api("POST", `/api/instansi/admin/selesai/${B}`, {}, ADMIN); assert.equal(s.s, 200, s.t);
  const p = (await rincian(B)).padam;
  assert.equal(p.judul, "Sudah surut belum?"); assert.equal(p.pil, "Surut dilaporkan"); assert.match(p.label, /^Surut dilaporkan/);
  assert.ok(!/padam|api\b|titik panas/i.test(p.label + p.pil), "kosakata api tidak bocor"); assert.match(p.catatan, /bukan citra satelit/); assert.equal(p.boleh_cek_ulang, false);
  const li = await linimasa(B); assert.equal(li.s, 200, li.t);
  assert.equal(li.j.linimasa.find(e => e.jenis === "padam").ket, "Dilaporkan surut"); assert.equal(li.j.kata.padam, "Surut");
  assert.ok(li.j.respons.padam_menit >= 0 && li.j.respons.terverifikasi_menit == null, "tidak ada verifikasi sebelum 48 jam");
});

uji("banjir: surut terverifikasi (data pantauan, bukan satelit) dan banjir naik lagi", async () => {
  await DB.prepare("UPDATE tugas_api SET padam_verif = 'padam_terverifikasi', verif_pada = ? WHERE id = ?").bind(Date.now(), B).run();
  assert.equal((await rincian(B)).padam.pil, "Surut terverifikasi"); assert.match((await rincian(B)).padam.label, /data pantauan banjir/);
  let li = (await linimasa(B)).j; const e = li.linimasa.find(x => x.jenis === "terverifikasi"); assert.match(e.ket, /^Surut terverifikasi.*bukan citra satelit/); assert.equal(li.kata.terverifikasi, "Surut terverifikasi"); assert.ok(li.respons.terverifikasi_menit >= 0);
  await DB.prepare("UPDATE tugas_api SET status = 'buka', padam_verif = 'muncul_lagi', verif_pada = ? WHERE id = ?").bind(Date.now(), B).run();
  assert.equal((await rincian(B)).padam.pil, "Banjir naik lagi");
  li = (await linimasa(B)).j; assert.match(li.linimasa.find(x => x.jenis === "muncul_lagi").ket, /^Banjir naik lagi/);
});

uji("karhutla tetap berbahasa api (pembanding)", async () => {
  await DB.prepare("UPDATE tugas_api SET status = 'padam', padam_verif = 'padam_dilaporkan', padam_pada = ?, verif_pada = ? WHERE id = ?").bind(Date.now() - JAM, Date.now() - JAM, F).run();
  const p = (await rincian(F)).padam; assert.match(p.label, /^Padam/); assert.equal(p.judul, undefined);
  const li = (await linimasa(F)).j; assert.equal(li.linimasa.find(e => e.jenis === "padam").ket, "Dilaporkan padam"); assert.equal(li.kata, undefined);
});

uji("dummy 🧪 dengan bencana=banjir mengisi tiga tugas banjir contoh; 🧹 menghapusnya; karhutla biasa tidak menambah banjir", async () => {
  await DB.prepare("DELETE FROM tugas_api WHERE id IN (?, ?)").bind(B, F).run();
  const r = await api("POST", "/api/instansi/admin/dummy", {aksi: "isi", bencana: "banjir"}, ADMIN); assert.equal(r.s, 201, r.t);
  const n = async () => (await DB.prepare("SELECT count(*) n FROM tugas_bencana x JOIN tugas_api t ON t.id = x.tugas_id WHERE x.bencana = 'banjir' AND t.dummy = 1").first()).n;
  assert.equal(await n(), 3); assert.equal(r.j.bencana, "banjir");
  const ver = (await DB.prepare("SELECT t.id, t.padam_verif FROM tugas_bencana x JOIN tugas_api t ON t.id = x.tugas_id WHERE x.bencana = 'banjir' AND t.dummy = 1").all()).results;
  assert.deepEqual(ver.map(x => String(x.padam_verif)).sort(), ["null", "padam_dilaporkan", "padam_terverifikasi"]);
  const tv = ver.find(x => x.padam_verif === "padam_terverifikasi"); assert.equal((await rincian(tv.id)).padam.pil, "Surut terverifikasi");
  assert.equal((await api("POST", "/api/instansi/admin/dummy", {aksi: "hapus"}, ADMIN)).s, 200); assert.equal(await n(), 0);
  const k = await api("POST", "/api/instansi/admin/dummy", {aksi: "isi"}, ADMIN); assert.equal(k.s, 201, k.t); assert.equal(await n(), 0);
  await api("POST", "/api/instansi/admin/dummy", {aksi: "hapus"}, ADMIN);
});
