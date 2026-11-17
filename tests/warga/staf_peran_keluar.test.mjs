/* Migrasi 0152 (batas 7 peran staf dihapus) dan tombol Keluar di setiap halaman (src/worker.js pasangKeluar), dijalankan di workerd + D1 lokal.
   - 0152 diterapkan di atas DB berisi staf, sesi staf, dan penugasan Meja Pantau: semuanya selamat (DROP TABLE menjalankan CASCADE/SET NULL anak).
   - Super Admin menyimpan SEMUA peran untuk satu staf lewat rute; isi peran tetap dijaga trigger (peran asing dan duplikat ditolak).
   - HTML bersesi diberi /inti/keluar.js; halaman tanpa sesi (/masuk, PUBLIK_TANPA_SESI) tidak.
   Jalankan: node --test tests/warga/staf_peran_keluar.test.mjs */
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync} from "node:fs";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, sha256} from "./_bnpb.mjs";

const uji = berantai();
const {DB, api, adm} = await siapkan("uji-staf-peran-keluar", {sampai: "0152_"});
const ID = "7".repeat(16), TOK = "c".repeat(64), SEMUA = ["verifikator", "pusdalops", "analis_konsesi", "udara", "tmc", "koordalops", "pimpinan", "kemitraan", "operator_cc", "direktori", "irtama"];   // = PERAN src/staf.js (pantau.test.mjs menjaga kesamaannya dengan trigger)

uji("0152: staf, sesi staf, dan penugasan Meja Pantau selamat dari bangun ulang tabel", async () => {
  await DB.batch([
    DB.prepare("INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy) VALUES (?, 'stafujipp', 'Staf Uji', '90001000', 'Unit Uji', 's@b.id', '6281200001111', '[\"pimpinan\",\"kemitraan\"]', '[]', ?, ?, 0, 1, 'tes', 0)")
      .bind(ID, "g".repeat(32), "a".repeat(64)),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(TOK), ID, Date.now() + 36e5),
    DB.prepare("INSERT INTO pantau_tugas (butir_id, jenis, ditugaskan_ke, dibuat, diubah, oleh) VALUES ('uji:butir:1', 'uji', ?, 1, 1, 'tes')").bind(ID)]);
  await assert.rejects(DB.prepare("UPDATE staf SET peran = ? WHERE id = ?").bind(JSON.stringify(SEMUA), ID).run(), /CHECK/, "sebelum 0152: 11 peran ditolak CHECK");
  await DB.batch(pecah(readFileSync(path.join(AKAR, "migrations/0152_staf_peran_tanpa_batas.sql"), "utf8")).map(s => DB.prepare(s)));
  assert.equal((await DB.prepare("SELECT count(*) n FROM staf_sesi WHERE staf_id = ?").bind(ID).first()).n, 1, "sesi staf tidak terhapus CASCADE");
  assert.equal((await DB.prepare("SELECT ditugaskan_ke d FROM pantau_tugas WHERE butir_id = 'uji:butir:1'").first()).d, ID, "penugasan tidak dikosongkan SET NULL");
  assert.equal((await DB.prepare("SELECT count(*) n FROM sqlite_master WHERE name LIKE '%_cadang'").first()).n, 0, "tabel cadangan dibuang");
  const obj = new Set((await DB.prepare("SELECT name FROM sqlite_master WHERE tbl_name = 'staf'").all()).results.map(r => r.name));
  for (const x of ["staf_wa", "staf_aktif", "staf_larik_sah", "staf_larik_ubah"]) assert.ok(obj.has(x), x + " terpasang lagi");
});

uji("Super Admin menyimpan semua peran; peran asing dan duplikat tetap ditolak", async () => {
  const r = await adm("POST", "/api/staf/admin/" + ID, {aksi: "ubah", peran: SEMUA, wilayah: []});
  assert.equal(r.s, 200, r.t);
  assert.deepEqual(JSON.parse((await DB.prepare("SELECT peran FROM staf WHERE id = ?").bind(ID).first()).peran), SEMUA);
  assert.equal((await adm("POST", "/api/staf/admin/" + ID, {aksi: "ubah", peran: [...SEMUA, "pimpinan"], wilayah: []})).s, 400);
  assert.equal((await adm("POST", "/api/staf/admin/" + ID, {aksi: "ubah", peran: ["raja"], wilayah: []})).s, 400);
  await assert.rejects(DB.prepare("UPDATE staf SET peran = '[\"pimpinan\",\"pimpinan\"]' WHERE id = ?").bind(ID).run(), /tidak sah atau berulang/);
  await assert.rejects(DB.prepare("UPDATE staf SET peran = '[]' WHERE id = ?").bind(ID).run(), /CHECK/);
});

uji("tombol Keluar disisipkan di halaman bersesi, tidak di halaman tanpa sesi", async () => {
  const ada = t => t.includes('src="/inti/keluar.js');
  const bahan = await adm("GET", "/bnpb/bahan");
  assert.equal(bahan.s, 200); assert.ok(ada(bahan.t), "/bnpb/bahan memuat keluar.js");
  assert.equal(bahan.t.match(/inti\/keluar\.js/g).length, 1, "sekali saja");
  for (const j of ["/masuk", "/petugas"]) { const r = await api("GET", j); if (r.s === 200) assert.ok(!ada(r.t), j + " tanpa tombol Keluar"); }
});
