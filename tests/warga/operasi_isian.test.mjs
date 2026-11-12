/* Operasi Udara isian manual (src/operasi_isian.js, migrations/0126_operasi_isian.sql) di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya.
   Dibuktikan: hak tulis (tamu dan akun gerbang ditolak, moderator boleh), gelar, sortie isi/ubah/kembar 409, hasil, temuan isi/ubah, hapus lunak
   dengan alasan (butir hilang dari peta, hapus kedua 409), riwayat tercatat tanpa nama, penanda op_isian, indeks terhapus dipakai.
   Jalankan: node --test tests/warga/operasi_isian.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)

const uji = berantai();
const {DB, api, n} = await siapkan("uji-operasi-isian");
const hari = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // hari ini WIB
const pos = (j, b, h = MOD2) => api("POST", "/api/operasi/isian/" + j, b, h);
const arm = await DB.prepare("SELECT registrasi, base_id FROM op_armada WHERE dummy = 0 AND base_id IS NOT NULL ORDER BY registrasi LIMIT 1").first();
let gid, tid;

uji("hak tulis: tamu dan akun gerbang ditolak, badan salah 400", async () => {
  assert.equal((await pos("gelar", {tanggal: hari}, {})).s, 403);
  assert.equal((await pos("gelar", {tanggal: hari}, GERBANG)).s, 403);
  assert.equal((await pos("gelar", {tanggal: "2020-01-01", base_id: arm.base_id, butir: []})).s, 400);
  assert.equal((await pos("gelar", {tanggal: hari, base_id: "XXX", butir: []})).s, 400);
});

uji("gelar: status tersimpan sebagai manual, penanda dan riwayat tercatat", async () => {
  const r = await pos("gelar", {tanggal: hari, base_id: arm.base_id, butir: [{registrasi: arm.registrasi, status: "siaga", alasan: "cuaca"}]});
  assert.equal(r.s, 201, r.t);
  const s = await DB.prepare("SELECT status, sumber FROM op_armada_status WHERE tanggal = ? AND registrasi = ?").bind(hari, arm.registrasi).first();
  assert.deepEqual([s.status, s.sumber], ["siaga", "manual"]);
  assert.equal(await n("op_isian", `tabel = 'op_armada_status' AND terhapus = 0`), 1);
  const ubah = await pos("gelar", {tanggal: hari, base_id: arm.base_id, butir: [{registrasi: arm.registrasi, status: "siap"}]});
  assert.equal(ubah.s, 201);
  assert.deepEqual((await DB.prepare("SELECT aksi FROM op_isian_log WHERE tabel = 'op_armada_status' ORDER BY id").all()).results.map(x => x.aksi), ["isi", "ubah"]);
});

uji("sortie: isi, kembar 409, ubah; hasil drops/liter", async () => {
  const b = {tanggal: hari, registrasi: arm.registrasi, jenis: "berangkat", jam_wib: "00:05", misi: "WB", lokasi: "Desa Uji", lat: -2.1, lon: 113.9};
  const r = await pos("sortie", b); assert.equal(r.s, 201, r.t); gid = r.j.id;
  assert.equal((await pos("sortie", b)).s, 409);
  const u = await pos("sortie", {...b, id: gid, lokasi: "Desa Ubah"}); assert.equal(u.s, 200, u.t);
  assert.equal((await DB.prepare("SELECT lokasi FROM op_gerak WHERE id = ?").bind(gid).first()).lokasi, "Desa Ubah");
  assert.equal(await n("op_isian_kejadian", `jenis = 'gerak' AND id = ${gid}`), 1);
  assert.equal((await pos("sortie", {...b, id: 999999})).s, 404);
  const h = await pos("hasil", {gerak_id: gid, drops: 4, liter: 2000, lapor: "padam"}); assert.equal(h.s, 201, h.t);
  const x = await DB.prepare("SELECT drops, liter, lapor FROM op_gerak_hasil WHERE gerak_id = ?").bind(gid).first();
  assert.deepEqual([x.drops, x.liter, x.lapor], [4, 2000, "padam"]);
  assert.equal((await pos("hasil", {gerak_id: gid})).s, 400);
});

uji("temuan: isi, kembar 409, ubah", async () => {
  const b = {tanggal: hari, registrasi: arm.registrasi, lat: -2.2, lon: 113.8, status: "berasap", luas_klaim_ha: 1.5, lokasi: "Blok A"};
  const r = await pos("temuan", b); assert.equal(r.s, 201, r.t); tid = r.j.id;
  assert.equal((await pos("temuan", b)).s, 409);
  const u = await pos("temuan", {...b, id: tid, status: "clear"}); assert.equal(u.s, 200, u.t);
  assert.equal((await DB.prepare("SELECT status FROM op_temuan WHERE id = ?").bind(tid).first()).status, "clear");
});

uji("hapus lunak: alasan wajib, butir hilang dari peta, hapus kedua 409, ubah sesudah hapus 409", async () => {
  assert.equal((await pos("hapus", {tabel: "op_gerak", kunci: String(gid), alasan: "x"})).s, 400);
  for (const [tabel, kunci] of [["op_gerak", String(gid)], ["op_temuan", String(tid)], ["op_armada_status", `${hari}|${arm.registrasi}`]]) {
    const r = await pos("hapus", {tabel, kunci, alasan: "salah ketik pengisi"}); assert.equal(r.s, 200, `${tabel}: ${r.t}`);
    assert.equal((await pos("hapus", {tabel, kunci, alasan: "salah ketik pengisi"})).s, 409);
  }
  assert.equal((await pos("hasil", {gerak_id: gid, drops: 1})).s, 409);
  const p = await api("GET", `/api/operasi/peta?tanggal=${hari}`, undefined, MOD2); assert.equal(p.s, 200, p.t);
  assert.equal(p.j.gerak.filter(g => g.id === gid).length, 0); assert.equal(p.j.temuan.filter(t => t.id === tid).length, 0);
  assert.equal(p.j.armada.find(a => a.registrasi === arm.registrasi).status, null);
  assert.equal(await n("op_gerak", `id = ${gid}`), 1, "baris asli tetap ada");
});

uji("riwayat: hak baca, per butir dan per tanggal, pengisi tanpa nama", async () => {
  assert.equal((await api("GET", `/api/operasi/isian/riwayat?tanggal=${hari}`, undefined, {})).s, 403);
  const r = await api("GET", `/api/operasi/isian/riwayat?tabel=op_gerak&kunci=${gid}`, undefined, MOD2); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.map(x => x.aksi), ["hapus", "ubah", "isi"]);
  assert.ok(r.j.every(x => /^admin:[0-9a-f]+$/.test(x.oleh)), "pengisi tercatat sebagai hash, bukan nama");
  assert.equal(r.j[0].alasan, "salah ketik pengisi");
  const t = await api("GET", `/api/operasi/isian/riwayat?tanggal=${hari}`, undefined, MOD2); assert.equal(t.s, 200); assert.ok(t.j.length >= 6);
});

uji("butir terhapus dibaca lewat indeks, bukan pindai penuh", async () => {
  const r = (await DB.prepare("EXPLAIN QUERY PLAN SELECT tabel, kunci FROM op_isian WHERE terhapus = 1").all()).results.map(x => x.detail).join(" | ");
  assert.match(r, /SEARCH op_isian USING (COVERING )?INDEX/, r);
});
