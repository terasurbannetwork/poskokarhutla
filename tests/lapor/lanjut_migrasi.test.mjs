/* LJ-01: migrasi 0161 data lanjutan BPBD (data/kajian-bnpb/lapor-lanjutan/DESAIN-TEKNIS.md). Skema dibangun dari semua migrasi repo di SQLite sungguhan
   (pola tests/warga/migrasi_beku.test.mjs), 0161 diterapkan sekali lagi (idempoten), lalu CHECK, UNIQUE, dan FK diuji dengan sisipan yang benar dan salah.
   Jalan: node --test tests/lapor/lanjut_migrasi.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";

const DIR = new URL("../../migrations/", import.meta.url);
const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON");
for (const f of readdirSync(DIR).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
const k = Date.now(), A = "a".repeat(16), O = "o".repeat(16);
const sisip = sql => db.exec(sql);

test("0161 idempoten: diterapkan kedua kali tanpa galat, sepuluh tabel lj_* (0161 sembilan, 0165 lj_sesi)", () => {
  db.exec(readFileSync(new URL("0161_lapor_data.sql", DIR), "utf8"));
  const t = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'lj_%' ORDER BY name").all().map(r => r.name);
  assert.deepEqual(t, ["lj_akses", "lj_beku", "lj_berkas", "lj_jejak", "lj_kabar", "lj_media", "lj_objek", "lj_sesi", "lj_tanya", "lj_tim"]);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'lj_%'").get().n, 0);   // tanpa trigger
});

test("lj_berkas: satu per (induk, kab); selesai wajib bertanggal tutup (hitungan 5 tahun, D23); induk harus nomor LA-", () => {
  sisip(`INSERT INTO lj_berkas (id, induk, kab, dibuat, diubah) VALUES ('${A}', 'LA-201126-01', '31.75', ${k}, ${k})`);
  assert.throws(() => sisip(`INSERT INTO lj_berkas (id, induk, kab, dibuat, diubah) VALUES ('${"b".repeat(16)}', 'LA-201126-01', '31.75', ${k}, ${k})`));
  assert.throws(() => sisip(`INSERT INTO lj_berkas (id, induk, kab, status, dibuat, diubah) VALUES ('${"c".repeat(16)}', 'LA-201126-02', '31.75', 'selesai', ${k}, ${k})`));
  assert.throws(() => sisip(`INSERT INTO lj_berkas (id, induk, kab, dibuat, diubah) VALUES ('${"d".repeat(16)}', 'KJ-201126-01', '31.75', ${k}, ${k})`));
  sisip(`INSERT INTO lj_berkas (id, induk, kab, status, ditutup, dibuat, diubah) VALUES ('${"e".repeat(16)}', 'LA-201126-03', '31.75', 'selesai_catatan', ${k}, ${k}, ${k})`);
});

test("lj_objek: berinduk berkas yang ada, jenis tertutup, pribadi JSON terpisah, titik berpasangan", () => {
  assert.throws(() => sisip(`INSERT INTO lj_objek (id, berkas, jenis, urut, data, oleh, dibuat, diubah) VALUES ('${O}', '${"z".repeat(16)}', 'rumah', 1, '{}', 'x', ${k}, ${k})`));
  sisip(`INSERT INTO lj_objek (id, berkas, jenis, urut, data, pribadi, oleh, dibuat, diubah) VALUES ('${O}', '${A}', 'rumah', 1, '{}', '{"nama":"x"}', 'x', ${k}, ${k})`);
  assert.throws(() => sisip(`INSERT INTO lj_objek (id, berkas, jenis, urut, data, oleh, dibuat, diubah) VALUES ('${"p".repeat(16)}', '${A}', 'mobil', 2, '{}', 'x', ${k}, ${k})`));
  assert.throws(() => sisip(`INSERT INTO lj_objek (id, berkas, jenis, urut, data, pribadi, oleh, dibuat, diubah) VALUES ('${"q".repeat(16)}', '${A}', 'jiwa', 1, '{}', 'bukan json', 'x', ${k}, ${k})`));
  assert.throws(() => sisip(`INSERT INTO lj_objek (id, berkas, jenis, urut, data, lat, oleh, dibuat, diubah) VALUES ('${"r".repeat(16)}', '${A}', 'jiwa', 2, '{}', -6.2, 'x', ${k}, ${k})`));
  // pengosongan data pribadi (D23) adalah UPDATE biasa ke NULL
  sisip(`UPDATE lj_objek SET pribadi = NULL WHERE id = '${O}'`);
});

test("lj_media hanya di lapor/data/; lj_tim token selalu berkedaluwarsa; lj_kabar jenis tertutup", () => {
  assert.throws(() => sisip(`INSERT INTO lj_media (id, objek, kunci_r2, jenis, waktu_terima, lencana, pintu, oleh) VALUES ('${"m".repeat(16)}', '${O}', 'lapor/foto/x.jpg', 'foto', ${k}, 'gps', 'web', 'x')`));
  sisip(`INSERT INTO lj_media (id, objek, kunci_r2, jenis, waktu_terima, lencana, pintu, oleh) VALUES ('${"m".repeat(16)}', '${O}', 'lapor/data/${A}/${O}/m.jpg', 'foto', ${k}, 'gps', 'web', 'x')`);
  assert.throws(() => sisip(`INSERT INTO lj_tim (berkas, wa, peran, token_sha, oleh, dibuat) VALUES ('${A}', '6281200000001', 'anggota', '${"a".repeat(64)}', 'x', ${k})`));
  sisip(`INSERT INTO lj_tim (berkas, wa, peran, token_sha, kedaluwarsa, oleh, dibuat) VALUES ('${A}', '6281200000001', 'anggota', '${"a".repeat(64)}', ${k + 1}, 'x', ${k})`);
  assert.throws(() => sisip(`INSERT INTO lj_kabar (wa, jenis, teks, dibuat) VALUES ('6281200000001', 'promosi', 'x', ${k})`));
});

test("lj_sesi: nomor WA 62, keadaan JSON paling panjang 6000, berkas harus ada (tinjauan migrasi-idempoten 0165)", () => {
  const isi = (wa, keadaan, berkas = A) => db.prepare("INSERT INTO lj_sesi (wa, berkas, keadaan, diubah) VALUES (?, ?, ?, ?)").run(wa, berkas, keadaan, k);
  isi("6281299880001", "{}");
  assert.throws(() => isi("0812999", "{}"));
  assert.throws(() => isi("6281299880002", "bukan json"));
  assert.throws(() => isi("6281299880003", JSON.stringify({x: "a".repeat(6001)})));
  assert.throws(() => isi("6281299880004", "{}", "z".repeat(16)), "FK ke lj_berkas");
});
