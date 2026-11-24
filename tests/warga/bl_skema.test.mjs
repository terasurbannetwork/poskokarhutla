/* Bot Laporan WA BL-01 (migrations/0154_bl_proyek.sql): skema bl_* di SQLite memori dari semua migrasi repo.
   Dibuktikan: migrasi idempoten, CHECK status tiap tabel, wa_sha 64 hex (nomor mentah ditolak), id proyek P-DDMMYY-NN, PK bahan dan versi, FK ke proyek.
   Jalankan: node --test tests/warga/bl_skema.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {migrasi, pecah} from "./_bantu.mjs";

const M154 = readFileSync(new URL("../../migrations/0154_bl_proyek.sql", import.meta.url), "utf8");
const buat = () => { const db = new DatabaseSync(":memory:"); for (const s of pecah(migrasi())) db.exec(s); db.exec("PRAGMA foreign_keys = ON"); return db; };
const SHA = "a".repeat(64);
const proyek = (db, o = {}) => db.prepare("INSERT INTO bl_proyek (id, wa_sha, jenis, tanggal, status, versi, dibuat, diubah) VALUES (?,?,?,?,?,?,1,1)")
  .run(o.id ?? "P-181126-01", o.wa_sha ?? SHA, o.jenis ?? "harian", o.tanggal ?? "2026-11-18", o.status ?? "terbuka", o.versi ?? 0);

uji("migrasi 0154 jalan dua kali tanpa galat", () => {
  const db = buat(); db.exec(M154);
  const t = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name GLOB 'bl_*' ORDER BY name").all().map(r => r.name);
  assert.deepEqual(t, ["bl_bahan", "bl_biaya", "bl_daftar", "bl_detak", "bl_pola", "bl_proyek", "bl_versi"]);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type = 'trigger' AND tbl_name GLOB 'bl_*'").get().n, 0);
});

uji("bl_proyek CHECK: status, id, wa_sha, tanggal", () => {
  const db = buat();
  ["terbuka", "bertanya", "membangun", "draf", "final", "ditutup", "batal", "kedaluwarsa"].forEach((s, i) => proyek(db, {id: `P-181126-0${i}`, status: s, jenis: i % 2 ? "harian" : "penanganan"}));
  for (const salah of [{status: "selesai"}, {id: "P-18112-01"}, {id: "X-181126-01"}, {wa_sha: "6281234567890"}, {wa_sha: "A".repeat(64)}, {tanggal: "18-11-2026"}, {jenis: "Harian"}, {versi: -1}])
    assert.throws(() => proyek(db, {id: "P-181126-99", ...salah}), /CHECK/, JSON.stringify(salah));
});

uji("bl_bahan dan bl_versi: PK ganda ditolak, FK ke proyek", () => {
  const db = buat(); proyek(db);
  const bahan = (p, w) => db.prepare("INSERT INTO bl_bahan (proyek_id, wa_id, jenis_bahan, ditambah) VALUES (?,?,?,1)").run(p, w, "bmkg_pagi");
  bahan("P-181126-01", "41"); assert.throws(() => bahan("P-181126-01", "41"), /UNIQUE|PRIMARY/);
  assert.throws(() => bahan("P-181126-02", "42"), /FOREIGN KEY/);
  const versi = (n, r2 = "bot-laporan/P-181126-01/v1/isian.json") => db.prepare("INSERT INTO bl_versi (proyek_id, n, isian_r2, dibuat) VALUES (?,?,?,1)").run("P-181126-01", n, r2);
  versi(1); assert.throws(() => versi(1), /UNIQUE|PRIMARY/);
  assert.throws(() => versi(0), /CHECK/); assert.throws(() => versi(2, "public/x.json"), /CHECK/);
});

uji("bl_pola, bl_daftar, bl_biaya, bl_detak CHECK", () => {
  const db = buat();
  const pola = s => db.prepare("INSERT INTO bl_pola (id, jenis, slide_judul, operasi, ringkas, hitung, status, diubah) VALUES (?,?,?,?,?,1,?,1)").run(`pola-${s}-0001`, "harian", "Ringkasan", "ganti_teks", "judul lebih pendek", s);
  for (const s of ["mengamati", "diusulkan", "aturan", "ditolak"]) pola(s);
  assert.throws(() => pola("disetujui"), /CHECK/);
  const daftar = (w, s) => db.prepare("INSERT INTO bl_daftar (wa_sha, nama, instansi, status, dibuat) VALUES (?,?,?,?,1)").run(w, "Uji", "BPBD Uji", s);
  daftar("1".repeat(64), "menunggu"); daftar("2".repeat(64), "setuju"); daftar("3".repeat(64), "tolak");
  assert.throws(() => daftar("4".repeat(64), "aktif"), /CHECK/); assert.throws(() => daftar("628123456789", "menunggu"), /CHECK/);
  db.prepare("INSERT INTO bl_biaya (tanggal, usd_mikro) VALUES ('2026-11-18', 1250000)").run();
  assert.throws(() => db.prepare("INSERT INTO bl_biaya (tanggal, usd_mikro) VALUES ('2026-11-19', -1)").run(), /CHECK/);
  db.prepare("INSERT INTO bl_detak (mesin, terakhir) VALUES ('gateway', 1)").run();
  assert.throws(() => db.prepare("INSERT INTO bl_detak (mesin, terakhir) VALUES ('Gate Way', 1)").run(), /CHECK/);
});
