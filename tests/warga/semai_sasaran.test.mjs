/* Migrasi op_semai_sasaran (migrations/0176_semai_sasaran.sql, SB-06) di D1 Miniflare: dua kali tanpa galat, baris salah ditolak.
   Jalankan: node --test tests/warga/semai_sasaran.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai} from "./_bnpb.mjs";
import "../../src/worker.js";

const uji = berantai();
const {DB, n} = await siapkan("uji-semai-sasaran");
const ins = (kolom, nilai) => DB.prepare(`INSERT INTO op_semai_sasaran (${kolom}) VALUES (${nilai.map(() => "?").join(",")})`).bind(...nilai).run();
const W = "id,kab,tanggal,oleh,dibuat";

uji("migrasi 0176 dijalankan dua kali tanpa galat dan tanpa menyentuh op_semai_target", async () => {
  const sebelum = (await DB.prepare("SELECT sql FROM sqlite_master WHERE name='op_semai_target'").first()).sql;
  for (let i = 0; i < 2; i++) for (const s of pecah(readFileSync(path.join(AKAR, "migrations/0176_semai_sasaran.sql"), "utf8"))) await DB.prepare(s).run();
  assert.equal(await n("op_semai_sasaran"), 0);
  assert.equal((await DB.prepare("SELECT sql FROM sqlite_master WHERE name='op_semai_target'").first()).sql, sebelum, "op_semai_target tidak boleh berubah");
  assert.equal((await DB.prepare("SELECT count(*) n FROM sqlite_master WHERE type='trigger' AND tbl_name='op_semai_sasaran'").first()).n, 0, "tanpa trigger");
});

uji("baris salah ditolak D1", async () => {
  await assert.rejects(ins(W, ["a", "317", "2026-11-26", "o", "d"]), "kab 3 huruf");
  await assert.rejects(ins(W, ["b", "31720", "2026-11-26", "o", "d"]), "kab 5 huruf");
  await assert.rejects(ins("id,kab,tanggal,dibuat", ["c", "3172", "2026-11-26", "d"]), "oleh wajib");
  await assert.rejects(ins("id,kab,oleh,dibuat", ["d", "3172", "o", "d"]), "tanggal wajib");
  await assert.rejects(ins(W + ",catatan", ["e", "3172", "2026-11-26", "o", "d", "x".repeat(301)]), "catatan > 300");
  assert.equal(await n("op_semai_sasaran"), 0);
});

uji("baris sah masuk; kembar aktif ditolak, sesudah hapus lunak boleh lagi", async () => {
  await ins(W + ",catatan", ["f", "3172", "2026-11-26", "o", "d", "x".repeat(300)]);
  await assert.rejects(ins(W, ["g", "3172", "2026-11-26", "o", "d"]), "kab+tanggal aktif kembar");
  await ins(W, ["h", "3172", "2026-11-27", "o", "d"]);
  await DB.prepare("UPDATE op_semai_sasaran SET terhapus='t', alasan_hapus='salah', dihapus_oleh='o' WHERE id='f'").run();
  await ins(W, ["i", "3172", "2026-11-26", "o", "d"]);
  assert.equal(await n("op_semai_sasaran"), 3);
});
