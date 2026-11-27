/* SB-33: laporan OMC posko (src/operasi_semai.js, migrations/0189_omc_lapor.sql). Worker sungguhan di Miniflare + D1 lokal.
   Jalankan: node --test tests/warga/omc_posko.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import {uraiOmcPosko} from "../../scripts/wa/urai_omc_posko.mjs";
import "../../src/worker.js";

const TOKEN = "t".repeat(40), MESIN = "mesin-uji-" + "m".repeat(30), uji = berantai();
const {DB, api, n} = await siapkan("uji-omc-posko", {ikat: {SEMAI_TOKEN: TOKEN, WA_MESIN: MESIN}});
const bear = t => ({authorization: "Bearer " + t});
const kirim = (b, h = bear(MESIN)) => api("POST", "/api/operasi/omc-posko", b, h);
const hari = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const sorti = (o = {}) => ({ke: 1, mesin_hidup: "08:05", mesin_mati: "10:20", wilayah_semai: "Langkat", ketinggian_ft: {min: 9000, max: 11000}, bahan: "NaCl", kg: 800, ...o});
const lap = (o = {}) => ({tanggal: hari, provinsi: "Aceh", prov_kode: "11", posko: ["Bandar Udara Sultan Iskandar Muda"],
  armada: [{pesawat: "CASA 212", registrasi: "PK-ABC", sorti: [sorti(), sorti({ke: 2, kg: 700})]}],
  kumulatif: [{posko: "Aceh", sorti: 12, kg: 9000, jam_terbang_menit: 1800}], ...o});

uji("migrasi 0189 dua kali tanpa galat", async () => {
  for (let i = 0; i < 2; i++) for (const s of pecah(readFileSync(path.join(AKAR, "migrations/0189_omc_lapor.sql"), "utf8"))) await DB.prepare(s).run();
  assert.equal(await n("op_omc_lapor"), 0);
  await assert.rejects(DB.prepare("INSERT INTO op_omc_lapor (id,tanggal,prov_kode,prov_nama,posko_json,armada_json,sorti_hari,kg_hari,kumulatif_json,sidik,dibuat) VALUES ('x','2026-01-01','1','A','[]','[]',0,0,'[]',?, 'd')").bind("a".repeat(64)).run(), "prov_kode 1 huruf");
});

uji("POST valid tersimpan; sorti dan kg dihitung server", async () => {
  const r = await kirim(lap()); assert.equal(r.s, 201, r.t);
  const b = await DB.prepare("SELECT * FROM op_omc_lapor").first();
  assert.equal(b.sorti_hari, 2); assert.equal(b.kg_hari, 1500); assert.equal(b.prov_kode, "11");
});

uji("kiriman ganda: 200 ganda:true, baris tetap satu", async () => {
  const r = await kirim(lap()); assert.equal(r.s, 200); assert.equal(r.j.ganda, true);
  assert.equal(await n("op_omc_lapor"), 1);
});

uji("token salah 401/403, tanpa token 403, SEMAI_TOKEN tidak boleh menulis", async () => {
  assert.equal((await kirim(lap({prov_kode: "12"}), bear("salah"))).s, 403);
  assert.equal((await kirim(lap({prov_kode: "12"}), {})).s, 403);
  assert.equal((await kirim(lap({prov_kode: "12"}), bear(TOKEN))).s, 403);
  assert.equal((await kirim(lap({prov_kode: "12"}), ADMIN)).s, 403);
  assert.equal(await n("op_omc_lapor"), 1);
});

uji("body jahat ditolak 400/413 dan tidak menyimpan", async () => {
  const jahat = [lap({tanggal: "2026-13-45"}), lap({tanggal: "2099-01-01"}), lap({prov_kode: "1"}), lap({prov_kode: "AB"}), lap({provinsi: ""}), lap({armada: "x"}), lap({armada: []}),
    lap({armada: [{pesawat: "A", sorti: [sorti({kg: -1})]}]}), lap({armada: [{pesawat: "A", sorti: [sorti({kg: 1e9})]}]}), lap({armada: [{pesawat: "A", sorti: [sorti({mesin_hidup: "25:99"})]}]}),
    lap({armada: [{pesawat: "A", sorti: [sorti({bahan: "<script>"})]}]}), lap({armada: [{pesawat: "A", sorti: Array(21).fill(sorti())}]}), lap({posko: Array(11).fill("p")}),
    lap({armada: Array(6).fill({pesawat: "A", sorti: Array(20).fill(sorti())})}), lap({kumulatif: [{posko: "x", sorti: "banyak", kg: 1}]}),
    lap({tanggal: "2026-02-31"}), lap({tanggal: "2024-01-01"}), lap({armada: [{pesawat: "A", sorti: [sorti({wilayah_semai: "hubungi 0812 3456 7890"})]}]}), [], "bukan json{"];
  for (const j of jahat) { const r = await kirim(j); assert.ok(r.s === 400, `${JSON.stringify(j).slice(0, 80)} -> ${r.s}`); }
  assert.equal((await kirim("x".repeat(70000))).s, 413);
  assert.equal(await n("op_omc_lapor"), 1);
});

uji("kolom nama orang/nomor di badan tidak tersimpan (daftar putih)", async () => {
  const j = lap({prov_kode: "13", provinsi: "Sumatera Barat", pelapor: "Budi 081234567890", armada: [{pesawat: "CASA", nama_pilot: "Andi", sorti: [sorti({kru: "Andi"})]}]});
  assert.equal((await kirim(j)).s, 201);
  const b = await DB.prepare("SELECT * FROM op_omc_lapor WHERE prov_kode='13'").first();
  assert.ok(!/Budi|Andi|0812/.test(JSON.stringify(b)));
});

uji("laporan sah terbesar (100 sorti) tersimpan, tidak kena batas CHECK", async () => {
  const w = sorti({wilayah_semai: "x".repeat(200), bahan: "B".repeat(20)});
  const r = await kirim(lap({prov_kode: "15", armada: Array(5).fill({pesawat: "P".repeat(80), registrasi: "R".repeat(20), sorti: Array(20).fill(w)})})); assert.equal(r.s, 201, r.t);
});

uji("keluaran pengurai asli (laporan contoh) diterima setelah prov_kode ditambah", async () => {
  const t = readFileSync(path.join(AKAR, "tests/wa/fixtures/omc_posko_251126.txt"), "utf8").toString();
  const o = uraiOmcPosko(t); assert.ok(o.armada.length > 0);
  const r = await kirim({...o, tanggal: hari, prov_kode: "14", provinsi: o.provinsi || "Riau"}); assert.equal(r.s, 201, r.t);
});

uji("GET: SEMAI_TOKEN 200, tanpa token 403, token salah 401, filter prov, posko terbaru per provinsi", async () => {
  assert.equal((await api("GET", "/api/operasi/omc-posko")).s, 403);
  assert.equal((await api("GET", "/api/operasi/omc-posko", undefined, bear("salah"))).s, 401);
  const r = await api("GET", "/api/operasi/omc-posko", undefined, bear(TOKEN)); assert.equal(r.s, 200, r.t);
  assert.ok(r.j.baris.length >= 3); assert.deepEqual(r.j.posko["11"].posko, ["Bandar Udara Sultan Iskandar Muda"]);
  assert.ok(!/sidik|pelapor/.test(r.t));
  const f = await api("GET", "/api/operasi/omc-posko?prov=11", undefined, bear(TOKEN)); assert.deepEqual([...new Set(f.j.baris.map(x => x.prov_kode))], ["11"]);
  assert.equal((await api("GET", "/api/operasi/omc-posko?prov=1", undefined, bear(TOKEN))).s, 400);
  assert.equal((await api("GET", "/api/operasi/omc-posko?dari=2026-01-01&sampai=2026-12-01", undefined, bear(TOKEN))).s, 400);
  assert.equal((await api("GET", "/api/operasi/omc-posko", undefined, ADMIN)).s, 200);
});
