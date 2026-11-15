/* Pembiayaan risiko PR-01 (data/kajian-bnpb/pembiayaan-risiko/RENCANA-UJI.md T3, T10): skema pb_saldo, pb_skema, pb_model di workerd (Miniflare) dengan D1 sungguhan.
   Jalankan: node --test tests/warga/pembiayaan_skema.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {siapkan} from "./_bnpb.mjs";

const {DB} = await siapkan("uji-pembiayaan-skema"), KINI = Date.parse("2026-11-15T12:00:00Z"), KJ = "KJ-2026-0000000A";
const n = async t => (await DB.prepare(`SELECT count(*) n FROM ${t}`).first()).n;
const saldo = (o = {}) => { const v = {kej: null, lapis: "dsp", nilai: 5000000000, tgl: "2026-11-01", sumber: "Surat Biro Keuangan 12/2026", catatan: null, ...o};
  return DB.prepare("INSERT INTO pb_saldo (kejadian_id, lapis, nilai, tanggal_data, sumber, catatan, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, 'staf:1', ?)").bind(v.kej, v.lapis, v.nilai, v.tgl, v.sumber, v.catatan, KINI).run(); };
const skema = (o = {}) => { const v = {nama: "Skema gempa uji", penerbit: "Penerbit uji", jenis: "parametrik", indeks: "magnitudo", ambang: "M 7,0", wilayah: "[\"3201\"]", bayaran: null, dari: "2026-01-01", sampai: "2026-12-31", ...o};
  return DB.prepare("INSERT INTO pb_skema (nama, penerbit, jenis, indeks, ambang, wilayah, bayaran, berlaku_dari, berlaku_sampai, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'staf:1', ?)").bind(v.nama, v.penerbit, v.jenis, v.indeks, v.ambang, v.wilayah, v.bayaran, v.dari, v.sampai, KINI).run(); };
const hash = "ab".repeat(32);
const model = (o = {}) => { const v = {id: "pager-v1", rumus: "kerugian = paparan x kerentanan x harga", hash, ...o};
  return DB.prepare("INSERT INTO pb_model (id, rumus, hash, didaftar) VALUES (?, ?, ?, ?)").bind(v.id, v.rumus, v.hash, KINI).run(); };
await DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, mulai, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'gempa', 'Gempa uji', '3201', '2026-11-01', ?, 'manual', ?, ?, 'uji')").bind(KJ, KINI, KINI, KINI).run();

uji("T10 pb_saldo bertaut ke sk_kejadian lewat FK dan kejadian_id boleh NULL (saldo umum)", async () => {
  const fk = (await DB.prepare("PRAGMA foreign_key_list(pb_saldo)").all()).results;
  assert.ok(fk.some(f => f.table === "sk_kejadian" && f.from === "kejadian_id" && f.to === "id"));
  await saldo(); await saldo({kej: KJ, lapis: "pfb", nilai: 0});
  await assert.rejects(() => saldo({kej: "KJ-2026-ZZZZZZZZ"}), /FOREIGN KEY/);
  assert.equal(await n("pb_saldo"), 2);
});

uji("T3 pb_saldo: sumber wajib, nilai bulat >= 0, lapis dan tanggal sah; append-only", async () => {
  await assert.rejects(() => saldo({sumber: ""}), /CHECK/); await assert.rejects(() => saldo({sumber: null}), /NOT NULL/);
  await assert.rejects(() => saldo({nilai: -1}), /CHECK/); await assert.rejects(() => saldo({nilai: 1.5}), /CHECK/); await assert.rejects(() => saldo({nilai: "banyak"}), /CHECK/);
  await assert.rejects(() => saldo({nilai: null}), /NOT NULL/);
  await assert.rejects(() => saldo({lapis: "apbn"}), /CHECK/); await assert.rejects(() => saldo({tgl: "kemarin"}), /CHECK/); await assert.rejects(() => saldo({tgl: "2026-02-30"}), /CHECK/);
  const id1 = (await DB.prepare("SELECT min(id) i FROM pb_saldo").first()).i;
  await assert.rejects(() => DB.prepare("INSERT OR REPLACE INTO pb_saldo (id, lapis, nilai, tanggal_data, sumber, oleh, dibuat) VALUES (?, 'pfb', 1, '2026-11-02', 'timpa', 'x', 1)").bind(id1).run(), /tidak boleh ditimpa/);
  assert.equal((await DB.prepare("SELECT sumber FROM pb_saldo WHERE id = ?").bind(id1).first()).sumber, "Surat Biro Keuangan 12/2026");
  await assert.rejects(() => saldo({catatan: "x".repeat(301)}), /CHECK/);
  assert.equal(await n("pb_saldo"), 2, "penolakan tidak menulis");
  await saldo({nilai: 9000000000000});
  for (const sql of ["UPDATE pb_saldo SET nilai = 1", "DELETE FROM pb_saldo"]) await assert.rejects(() => DB.prepare(sql).run(), /tidak boleh/);
});

uji("indeks saldo: kueri terbaru per lapis dan per kejadian memakai indeks", async () => {
  const plan = async (sql, ...b) => (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...b).all()).results.map(r => r.detail).join(" | ");
  assert.match(await plan("SELECT nilai FROM pb_saldo WHERE lapis = ? ORDER BY tanggal_data DESC LIMIT 1", "dsp"), /pb_saldo_lapis/);
  assert.match(await plan("SELECT nilai FROM pb_saldo WHERE kejadian_id = ? AND lapis = ? ORDER BY tanggal_data DESC LIMIT 1", KJ, "pfb"), /pb_saldo_kej/);
});

uji("pb_skema: jenis, tanggal, masa berlaku, wilayah JSON; pembaruan = baris baru; append-only", async () => {
  await skema(); await skema({ambang: "M 7,5"});
  assert.equal(await n("pb_skema"), 2);
  await assert.rejects(() => skema({jenis: "lain"}), /CHECK/); await assert.rejects(() => skema({sampai: "2025-12-31"}), /CHECK/);
  await assert.rejects(() => skema({dari: "01/01/2026"}), /CHECK/); await assert.rejects(() => skema({wilayah: "bukan json"}), /CHECK/); await assert.rejects(() => skema({wilayah: "{}"}), /CHECK/);
  await assert.rejects(() => skema({bayaran: "x".repeat(201)}), /CHECK/); await assert.rejects(() => skema({penerbit: null}), /NOT NULL/);
  await assert.rejects(() => skema({dari: "2026-02-30"}), /CHECK/);
  await assert.rejects(() => DB.prepare("INSERT OR REPLACE INTO pb_skema (id, nama, penerbit, jenis, indeks, ambang, berlaku_dari, berlaku_sampai, oleh, dibuat) VALUES (1, 'timpa', 'timpa', 'parametrik', 'idx', 'x', '2026-01-01', '2026-02-01', 'x', 1)").run(), /tidak boleh ditimpa/);
  assert.equal((await DB.prepare("SELECT nama FROM pb_skema WHERE id = 1").first()).nama, "Skema gempa uji");
  for (const sql of ["UPDATE pb_skema SET ambang = 'M 9'", "DELETE FROM pb_skema"]) await assert.rejects(() => DB.prepare(sql).run(), /tidak boleh/);
  assert.equal(await n("pb_skema"), 2);
});

uji("pb_model: pra-registrasi beku; status hanya hipotesis -> lulus atau gagal sekali; tidak bisa dihapus", async () => {
  await model();
  assert.equal((await DB.prepare("SELECT status FROM pb_model").first()).status, "hipotesis");
  await assert.rejects(() => model({id: "x-2", hash: "XYZ"}), /CHECK/); await assert.rejects(() => model({id: "x-3", rumus: "x"}), /CHECK/);
  await assert.rejects(() => model(), /UNIQUE|PRIMARY|ditimpa/);
  await assert.rejects(() => DB.prepare("INSERT OR REPLACE INTO pb_model (id, rumus, hash, didaftar, status) VALUES ('pager-v1', 'rumus pengganti sesudah lihat data', ?, 1, 'hipotesis')").bind(hash).run(), /ditimpa/);
  await assert.rejects(() => DB.prepare("INSERT INTO pb_model (id, rumus, hash, didaftar, status) VALUES ('langsung-lulus', 'rumus yang langsung lulus', ?, 1, 'lulus')").bind(hash).run(), /hipotesis/);
  assert.equal((await DB.prepare("SELECT rumus FROM pb_model WHERE id = 'pager-v1'").first()).rumus, "kerugian = paparan x kerentanan x harga");
  for (const sql of ["UPDATE pb_model SET rumus = 'rumus baru sesudah melihat data'", `UPDATE pb_model SET hash = '${"cd".repeat(32)}'`, "UPDATE pb_model SET didaftar = 1", "DELETE FROM pb_model", "UPDATE pb_model SET status = 'menang'"])
    await assert.rejects(() => DB.prepare(sql).run(), /tidak boleh|CHECK/, sql);
  await DB.prepare("UPDATE pb_model SET status = 'gagal'").run();
  await assert.rejects(() => DB.prepare("UPDATE pb_model SET status = 'lulus'").run(), /tidak boleh/, "vonis tidak dibalik");
});
