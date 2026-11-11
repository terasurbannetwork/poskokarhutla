/* Siklus Bencana G1: rencana kueri (SK-044, UJ-F7-03). Setiap SQL sk_* yang dirakit src/hak.js dikumpulkan lewat env.DB tiruan (perekam), lalu
   EXPLAIN QUERY PLAN dijalankan di D1 Miniflare dengan migrasi apa adanya. Tak boleh ada SCAN tabel penuh kecuali yang terdaftar KECIL/INDEKS_BOLEH.
   Jalankan: node --test tests/warga/siklus_rencana_kueri.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";
import * as H from "../../src/hak.js";

const U = await mulai("uji-sk-rencana", {r2: false});
const {DB} = U;
const rek = [];
const env = {DB: {prepare(sql) { const o = {bind: () => o, first: async () => ({n: 0}), all: async () => ({results: []}), run: async () => ({})}; rek.push(sql); return o; }}};
const LING = {kab: '["3201"]', prov: '["32"]'};
const adm = H.pelakuAdmin, sis = H.pelakuSistem, ID = "KJ-2026-9A2WGN3G";
const f0 = {dari: "2026-03-01", sampai: "2026-03-31", batas: 50, dummyOk: false}, ses = {mulai: "2026-03-05", id: ID};
const panggil = [
  () => H.skKejadianDaftar(env, adm, f0), () => H.skKejadianDaftar(env, adm, {...f0, dummyOk: true, kab4: "3201", prov: "32", jenis: "banjir", fase: "tanggap", sesudah: ses}),
  () => H.skKejadianDaftar(env, adm, {...f0, lingkup: '["3201","3202"]'}), () => H.skKejadianDaftar(env, adm, {...f0, lingkup: '["3201"]', kab4: "3201", sesudah: ses, dummyOk: true}),
  () => H.skKejadianById(env, adm, ID), () => H.skKejadianKab(env, adm, ID), () => H.skSumberDariKejadian(env, adm, ID), () => H.skSumberById(env, adm, "0123456789abcdef"),
  () => H.skJejakObyek(env, adm, "kejadian", ID, 50, false), () => H.skJejakObyek(env, adm, "kejadian", ID, 50, true), () => H.skKejadianRingkas(env, adm, ID),
  () => H.skKejadianRingkasBanyak(env, adm, [ID]), () => H.skIdTerpakai(env, adm, [ID]), () => H.skKejadianPublik(env, adm, ID),
  () => H.skKejadianSerupa(env, adm, "3201", "2026-03-01", "2026-03-05", true), () => H.skKejadianSerupa(env, adm, "3201", "2026-03-01", "2026-03-05", false),
  () => H.skAntreanDaftar(env, adm, {batas: 50, dummyOk: false}), () => H.skAntreanDaftar(env, adm, {status: "ambigu", batas: 50, dummyOk: true, sesudah: ses}),
  () => H.skIngestJendela(env, sis, {...f0, sesudah: ses}), () => H.skIngestJendela(env, sis, f0), () => H.skIngestSumber(env, sis, {...f0, sesudah: ses}), () => H.skIngestSumber(env, sis, f0),
  () => H.skSumberAda(env, sis, [["dibi", "x"]]), () => H.skDummyKejadianAda(env, adm, "2026-03-01", "2026-03-31"),
  () => H.skStmtKab(env, adm, ID, "3201", 1, 0, ["dibi", "x"]), () => H.skStmtKabSalin(env, adm, ID, ID, 1),
  () => H.skStmtSumberPindahSemua(env, adm, ID, ID, 1), () => H.skStmtSumberPindah(env, adm, "0123456789abcdef", ID, ID, 1), () => H.skStmtAntrean(env, adm, "0123456789abcdef", "ditolak", null, null, 1),
  () => H.skKajiDaftar(env, adm, ID, false), () => H.skKajiDaftar(env, adm, ID, true), () => H.skKajiById(env, adm, "0123456789abcdef"), () => H.skKajiIds(env, adm, ID, false),
  () => H.skStmtKajiBaru(env, adm, {id: "0123456789abcdef", kejadian_id: ID, model: "gempa", status: "dihitung", masukan: "{}", ringkas: "{}", kini: 1, oleh: "x"}), () => H.skStmtKajiStatus(env, adm, "0123456789abcdef", "dihitung", "diperiksa", null, 1),
  () => H.skMejaKajiCepat(env, "32", "Bogor", 0, 1, 0),
  () => H.skJitupasnaDaftar(env, adm, ID, false), () => H.skJitupasnaDaftar(env, adm, ID, true), () => H.skJitupasnaIds(env, adm, ID, false), () => H.skJitupasnaById(env, adm, "0123456789abcdef"),
  () => H.skJitupasnaTerbaru(env, adm, ID, "3201", 0), () => H.skBarisDaftar(env, adm, "0123456789abcdef"), () => H.skBarisHitung(env, adm, "0123456789abcdef"),
  () => H.skHargaCari(env, adm, ["perumahan"], 2026, "3201", 0), () => H.skHargaDaftar(env, adm, "perumahan", 2026, false), () => H.skHargaDaftar(env, adm, "perumahan", null, true),
  () => H.skR3pById(env, adm, "0123456789abcdef"), () => H.skR3pDariJitupasna(env, adm, "0123456789abcdef"), () => H.skKegiatanDaftar(env, adm, "0123456789abcdef"), () => H.skR3pDiusulkanAda(env, adm, ID),
  () => H.skStmtHargaBaru(env, adm, {id: "0123456789abcdef", sektor: "perumahan", tingkat: "rb", satuan: "unit", harga_rp: 1, tahun: 2026, dokumen: "x", kini: 1, oleh: "x"}),
  () => H.skStmtJitupasnaBaru(env, adm, {id: "0123456789abcdef", kejadian_id: ID, prov: "32", kab4: "3201", kini: 1, oleh: "x"}), () => H.skStmtJitupasnaDummy(env, adm, {id: "0123456789abcdef", kejadian_id: ID, prov: "32", kab4: "3201", versi: 1, kini: 1, oleh: "x"}),
  () => H.skStmtBaris(env, adm, "0123456789abcdef", {id: "0123456789abcdef", jenis: "rusak", sektor: "perumahan", tingkat: "rb", unit: 1}, 1, "x", 0), () => H.skStmtJitupasnaStatus(env, adm, "0123456789abcdef", "dibuka", "pengumpulan", 1),
  () => H.skStmtBarisNilai(env, adm, "0123456789abcdef", [["0123456789abcdef", null, 1]]), () => H.skStmtHitung(env, adm, "0123456789abcdef", 2026, "{}", 1),
  () => H.skStmtR3pBaru(env, adm, "0123456789abcdef", "0123456789abcdef", 1, "x"), () => H.skStmtR3pStatus(env, adm, "0123456789abcdef", "draf", "diusulkan", null, 1), () => H.skStmtR3pSetuju(env, adm, "0123456789abcdef", "staf:x", 1),
  () => H.skStmtKegiatanBaru(env, adm, "0123456789abcdef", {id: "0123456789abcdef", sektor: "sosial", nama: "x"}, 1, "x", 0),
  /* G4 (SK-085 sampai SK-104, UJ-F7-03): renkon, gladi, pintu */
  () => H.skRenkonDaftar(env, adm, {prov: "32", dummyOk: false}), () => H.skRenkonDaftar(env, adm, {prov: "32", kab4: "3201", bencana: "banjir", dummyOk: true}), () => H.skRenkonById(env, adm, "0123456789abcdef"),
  () => H.skRenkonTerbaru(env, adm, "32", "3201", "banjir", 0), () => H.skRenkonTerbaru(env, adm, "32", null, "banjir", 1),
  () => H.skStmtRenkonBaru(env, adm, {id: "0123456789abcdef", judul: "x", bencana: "banjir", prov: "32", kini: 1, oleh: "x"}), () => H.skStmtRenkonIsi(env, adm, "0123456789abcdef", {asumsi: "{}"}, 1),
  () => H.skStmtRenkonReviu(env, adm, "0123456789abcdef", "2026-01-01", 1), () => H.skStmtRenkonStatus(env, adm, "0123456789abcdef", "persiapan", "pelaksanaan", null, 1),
  () => H.skRenkonBerlaku(env, adm, false), () => H.skRenkonBerlaku(env, adm, true), () => H.skRenkonDisusun(env, adm, false), () => H.skRenkonDisusun(env, adm, true),
  () => H.skGladiDaftar(env, adm, "0123456789abcdef", false), () => H.skGladiDaftar(env, adm, "0123456789abcdef", true), () => H.skGladiById(env, adm, "0123456789abcdef"), () => H.skGladiRencana(env, adm, ["0123456789abcdef"], false), () => H.skGladiRencana(env, adm, ["0123456789abcdef"], true),
  () => H.skStmtGladiBaru(env, adm, {id: "0123456789abcdef", jenis: "ruang", renkon_id: "0123456789abcdef", kejadian_id: ID, kini: 1, oleh: "x"}), () => H.skStmtGladiStatus(env, adm, "0123456789abcdef", "dirancang", "siap", null, 1), () => H.skStmtGladiMasalah(env, adm, "0123456789abcdef", "[]", 1, 2),
  () => H.skStmtRenkonDummy(env, adm, {id: "0123456789abcdef", judul: "x", bencana: "banjir", prov: "32", status: "persiapan", kini: 1, oleh: "x"}), () => H.skStmtGladiDummy(env, adm, {id: "0123456789abcdef", jenis: "ruang", renkon_id: "0123456789abcdef", kejadian_id: ID, status: "dirancang", kini: 1, oleh: "x"}),
  () => H.skRenkonDummyAda(env, adm), () => H.skKejadianDummyTerbaru(env, adm), () => H.skKejadianAktif(env, adm, false), () => H.skKejadianAktif(env, adm, true), () => H.skR3pAktifBanyak(env, adm, [ID], false), () => H.skR3pAktifBanyak(env, adm, [ID], true), () => H.skKejadianPublikDaftar(env, sis, 20),
  () => H.skKejadianAktif(env, adm, false, '["3201"]'), () => H.skR3pAktifBanyak(env, adm, [ID], false, '["3201"]'),
  () => H.skRenkonBerlaku(env, adm, false, LING), () => H.skRenkonDisusun(env, adm, false, LING), () => H.skRenkonDaftar(env, adm, {prov: "32", dummyOk: false, ling: LING}),
  () => H.skStmtFase(env, adm, ID, "tanggap", 1), () => H.skStmtPublik(env, adm, ID, true, "x", 1), () => H.skStmtDummyHapus(env, adm),
];
for (const f of panggil) await f();
const sk = [...new Set(rek.filter(s => /\bsk_/.test(s)))];

/* SCAN yang dibolehkan: tidak ada tabel sk_* penuh. Pemindaian indeks parsial dummy hanya menyentuh baris dummy (kecil). */
const INDEKS_BOLEH = /USING (COVERING )?INDEX (sk_kej_dummy|sk_jejak_dummy|sk_kaji_dummy|sk_jp_dummy|sk_jpb_dummy|sk_r3p_dummy|sk_r3pk_dummy|sk_harga_dummy|sk_rk_dummy|sk_gl_dummy)\b/;
const params = sql => (sql.match(/\?/g) ?? []).length;

uji("kueri terkumpul: semua fungsi baca dan tulis sk_* ikut diperiksa", () => { assert.ok(sk.length >= 30, `hanya ${sk.length} kueri`); });
for (const sql of sk) uji(`UJ-F7-03: tanpa SCAN tabel penuh: ${sql.replace(/\s+/g, " ").slice(0, 90)}`, async () => {
  const baris = (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...Array(params(sql)).fill("[]")).all()).results.map(r => r.detail);
  for (const d of baris) {
    if (!/^SCAN /.test(d)) continue;
    if (/ VIRTUAL TABLE INDEX|^SCAN json_each|^SCAN j\b|^SCAN CONSTANT ROW/.test(d)) continue;   // json_each: kecil, dibatasi isi parameter
    assert.ok(INDEKS_BOLEH.test(d), `SCAN tak terdaftar: ${d}\n${sql}\n${baris.join("\n")}`);
  }
});

uji("indeks A: daftar kejadian memakai sk_kej_mulai (mulai DESC, id DESC) tanpa urut ulang; antrean memakai sk_ks_antre (status, mulai, id)", async () => {
  const plan = async (sql, ...b) => (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...b).all()).results.map(r => r.detail).join(" | ");
  const a = await plan("SELECT id FROM sk_kejadian e WHERE e.fase != 'digabung' AND e.mulai >= ? AND e.mulai <= ? ORDER BY e.mulai DESC, e.id DESC LIMIT 51", "2026-03-01", "2026-03-31");
  assert.match(a, /sk_kej_mulai/); assert.doesNotMatch(a, /TEMP B-TREE/, a);
  const q = rek.find(s => /FROM sk_kejadian_sumber WHERE status IN \('ambigu', 'tanpa_wilayah'\) AND dummy = 0 ORDER BY mulai, id/.test(s));   // kueri nyata antreanDaftar tanpa saringan status
  const b = await plan(q, 51);
  assert.match(b, /sk_ks_antre/);   // TEMP B-TREE untuk ORDER BY tetap ada (dua status digabung), tetapi hanya di atas baris antrean (indeks parsial), bukan seluruh tabel
});
uji("indeks B: daftar BP mencari lewat sk_kejkab_kab (kab4, mulai) memakai rentang mulai", async () => {
  const sql = rek.find(s => /FROM sk_kejadian_kab k JOIN sk_kejadian e/.test(s) && /json_each/.test(s));
  const baris = (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...Array(params(sql)).fill("[]")).all()).results.map(r => r.detail);
  const k = baris.find(d => /sk_kejkab_kab/.test(d)); assert.ok(k, baris.join("\n"));
  assert.match(k, /^SEARCH k USING (COVERING )?INDEX sk_kejkab_kab \(kab4=\? AND mulai>\? AND mulai<\?\)/, k);
});
uji("SK-053: isian meja kaji_cepat memakai meja_catatan_wilayah (meja, prov, kab), bukan SCAN tabel", async () => {
  const sql = rek.find(s => /FROM meja_catatan WHERE meja = 'kaji_cepat'/.test(s)); assert.ok(sql);
  const baris = (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...Array(params(sql)).fill(0)).all()).results.map(r => r.detail);
  assert.match(baris.join("|"), /SEARCH \w+ USING INDEX meja_catatan_wilayah \(meja=\? AND prov=\? AND kab=\?( AND status=\?)?\)/, baris.join("|")); assert.ok(!baris.some(d => /^SCAN /.test(d)), baris.join("|"));
});

/* ---------- G4: pintu tanpa pindai (UJ-F7-03). Tiap kueri pintu memakai indeks yang dijanjikan DT: sk_kej_fase (parsial), sk_r3p_kej, sk_rk_batas (parsial), sk_rk_status (parsial), sk_gl_renkon. ---------- */
const cari = re => { const q = rek.find(x => re.test(x)); assert.ok(q, String(re)); return q; };
const rencana = async (sql) => (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...Array(params(sql)).fill("[]")).all()).results.map(r => r.detail).join(" | ");
uji("UJ-F7-03: pintu memakai indeks parsial: kejadian aktif lewat sk_kej_fase, R3P lewat sk_r3p_kej, renkon berlaku lewat sk_rk_batas, renkon disusun lewat sk_rk_status, gladi lewat sk_gl_renkon", async () => {
  assert.match(await rencana(cari(/FROM sk_kejadian WHERE fase IN \('tanggap', 'transisi', 'pemulihan'\)/)), /sk_kej_fase/);
  assert.match(await rencana(cari(/FROM sk_r3p r WHERE r\.kejadian_id IN/)), /sk_r3p_kej/);
  assert.match(await rencana(cari(/FROM sk_renkon WHERE status = 'berlaku' AND berlaku_sampai >=/)), /sk_rk_batas/);
  assert.match(await rencana(cari(/FROM sk_renkon WHERE status IN \('persiapan'/)), /sk_rk_status/);
  assert.match(await rencana(cari(/FROM sk_gladi WHERE renkon_id IN/)), /sk_gl_renkon/);
  assert.match(await rencana(cari(/FROM sk_gladi WHERE renkon_id = \?/)), /sk_gl_renkon/);
  assert.match(await rencana(cari(/FROM sk_renkon WHERE prov = \?/)), /sk_rk_wil/);
  for (const re of [/FROM sk_kejadian WHERE fase IN \('tanggap'/, /FROM sk_renkon WHERE status = 'berlaku'/, /FROM sk_renkon WHERE status IN \('persiapan'/, /FROM sk_r3p r WHERE r\.kejadian_id IN/, /FROM sk_gladi WHERE renkon_id IN/]) assert.match(cari(re), /LIMIT 50/, "pintu LIMIT 50");
});

/* pemeriksaan keamanan 11 Nov: filter lingkup BP didorong ke SQL SEBELUM LIMIT, dan indeks baru dipakai */
uji("lingkup BP di SQL: kejadian aktif, R3P (JOIN Jitupasna), renkon berlaku/disusun/daftar memuat predikat lingkup sebelum LIMIT dan tetap memakai indeks yang sama", async () => {
  const sqlLing = re => { const q = rek.find(x => re.test(x) && /json_each\(\?\)\)(?: |\))/.test(x) && /(kab4 IN|j\.kab4 IN)/.test(x)); assert.ok(q, String(re)); return q; };
  const a = sqlLing(/FROM sk_kejadian WHERE fase IN \('tanggap'/); assert.match(a, /kab4 IN \(SELECT value FROM json_each\(\?\)\) ORDER BY fase_diubah DESC LIMIT 50/); assert.match(await rencana(a), /sk_kej_fase/);
  const r = sqlLing(/FROM sk_r3p r JOIN sk_jitupasna j/); assert.match(r, /j\.kab4 IN \(SELECT value FROM json_each\(\?\)\) LIMIT 50/); assert.match(await rencana(r), /sk_r3p_kej/);
  for (const [re, idx] of [[/FROM sk_renkon WHERE status = 'berlaku'/, /sk_rk_batas/], [/FROM sk_renkon WHERE status IN \('persiapan'/, /sk_rk_status/], [/FROM sk_renkon WHERE prov = \?/, /sk_rk_wil/]]) {
    const q = sqlLing(re); assert.match(q, /kab4 IS NULL AND prov IN \(SELECT value FROM json_each\(\?\)\)\)[^]*LIMIT/, "predikat lingkup sebelum LIMIT"); assert.match(await rencana(q), idx);
  }
});
uji("indeks baru: pintu publik memakai sk_kej_publik tanpa urut ulang; sk_harga_cari (sektor, tahun DESC, kab4) dipakai skHargaCari", async () => {
  const pub = cari(/FROM sk_kejadian WHERE publik = 1 AND dummy = 0 AND mulai >=/), rp = await rencana(pub);
  assert.match(rp, /sk_kej_publik/, rp); assert.doesNotMatch(rp, /TEMP B-TREE/, rp);
  const hc = cari(/FROM sk_harga WHERE sektor IN/), rh = await rencana(hc);
  assert.match(rh, /sk_harga_cari \(sektor=\? AND tahun=\?/, rh);
  const idx = (await DB.prepare("SELECT sql FROM sqlite_master WHERE name = 'sk_harga_cari'").first()).sql; assert.match(idx, /\(sektor, tahun DESC, kab4\)/);
});
uji("sk_rk_unik: renkon provinsi (kab4 NULL) tidak bisa kembar untuk (prov, bencana, versi, dummy)", async () => {
  const ins = (id, kab4) => DB.prepare("INSERT INTO sk_renkon (id, judul, bencana, prov, kab4, versi, dibuat, diubah, oleh, dummy) VALUES (?, 'Renkon uji unik', 'banjir', '32', ?, 1, 1, 1, 'uji', 0)").bind(id, kab4).run();
  await ins("00000000000000a1", null); await assert.rejects(() => ins("00000000000000a2", null), /UNIQUE/, "kab4 NULL kembar ditolak");
  await ins("00000000000000a3", "3201"); await assert.rejects(() => ins("00000000000000a4", "3201"), /UNIQUE/);
  await DB.prepare("DELETE FROM sk_renkon WHERE id IN ('00000000000000a1', '00000000000000a3')").run();
});
