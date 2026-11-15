/* KP-21 migrasi 0138 dan 0139 (SQLite sungguhan). node --test tests/warga/orang_akun_skema.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import path from "node:path";
import {migrasi, AKAR} from "./_bantu.mjs";

const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON;"); db.exec(migrasi());
const O = "o".repeat(16), A = "a".repeat(16);
db.prepare("INSERT INTO orang (id, jenis, nama, dibuat, diubah) VALUES (?, 'pegawai', 'Uji', 1, 1)").run(O);

uji("KP-21 orang_akun: migrasi dijalankan dua kali tanpa galat", () => {
  for (const f of ["0138_orang_akun.sql", "0139_orang_tinjau.sql"]) db.exec(readFileSync(path.join(AKAR, "migrations", f), "utf8"));
});
uji("KP-21 orang_akun: CHECK, FK, dan kunci ganda", () => {
  const ins = (t, a, o, c) => db.prepare("INSERT INTO orang_akun VALUES (?,?,?,?,1)").run(t, a, o, c);
  ins("staf", A, O, "nip");
  assert.throws(() => ins("staf", A, O, "wa"), /UNIQUE|PRIMARY/);
  assert.throws(() => ins("pemirsa", A, O, "wa"), /CHECK/);
  assert.throws(() => ins("pdt_akun", A, O, "nama"), /CHECK/);
  assert.throws(() => ins("km_akun", A, "z".repeat(16), "wa"), /FOREIGN/);
});
uji("KP-21 orang_tinjau: CHECK keputusan dan diputus berpasangan, satu baris per akun", () => {
  const ins = (alasan, k, d) => db.prepare("INSERT INTO orang_tinjau (id, akun_tabel, akun_id, kandidat, alasan, keputusan, diputus, dibuat) VALUES (?, 'staf', ?, '[]', ?, ?, ?, 1)").run("t".repeat(16), A, alasan, k, d);
  assert.throws(() => ins("nama_sama", null, null), /CHECK/);
  assert.throws(() => ins("bentrok", "pasang", null), /CHECK/);
  ins("bentrok", null, null);
  assert.throws(() => db.prepare("INSERT INTO orang_tinjau (id, akun_tabel, akun_id, alasan, dibuat) VALUES (?, 'staf', ?, 'bentrok', 1)").run("u".repeat(16), A), /UNIQUE/);
});
