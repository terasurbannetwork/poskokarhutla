/* GS-08 (data/kajian-bnpb/genangan-satelit, RENCANA-UJI T6 dan T7): migrasi 0174 sk_kaji + model banjir_gfm + rute berkas. worker.js utuh di Miniflare + D1 + R2.
   Jalankan: node --test tests/warga/siklus_kaji_gfm.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {mulai} from "./_siklus.mjs";
import {AKAR, pecah} from "./_bantu.mjs";

const U = await mulai("uji-sk-kaji-gfm");
const {DB, api, GET, n, kej} = U;
const KO = await U.staf("Ko Gfm", ["koordalops"]), BP = await U.bp(), BP2 = await U.bp({kab: "Garut"}), {TAMU} = U;
const R2 = await U.mf.getR2Bucket("MEDIA");
const TOK = {authorization: "Bearer token-pipa-uji"};
const KID = await kej(KO, {nama: "Banjir gfm uji", jenis: "banjir", kab4: "3201", mulai: "2026-03-02"});
const RING = {rentang: [100, 400], vonis: "menunggu", status_model: "hipotesis", pil: "Hipotesis: belum lulus uji balik", sumber: "Copernicus GFM"};
const kunci = (v, kj = KID) => `siklus/saji/kaji/${kj}_banjir_gfm_v${v}.json`;
const ingest = (o = {}) => api("POST", "/api/siklus/ingest/kaji", {kejadian_id: KID, model: "banjir_gfm", versi: 1, masukan: {kj: KID}, ringkas: RING, hasil_r2: kunci(1), ...o}, TOK);

uji("T6: migrasi 0174 idempoten, isi lama utuh, banjir_gfm diterima, model lain ditolak, hasil_r2 terikat model dan versi", () => {
  const dir = path.join(AKAR, "migrations"), semua = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  const sebelum = semua.filter(f => f < "0174");
  const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON;");
  for (const f of sebelum) for (const s of pecah(readFileSync(path.join(dir, f), "utf8"))) db.exec(s);
  const kj = "KJ-2026-AAAAAAAA";
  db.exec(`INSERT INTO sk_kejadian (id, jenis, nama, mulai, fase, fase_diubah, asal, dibuat, diubah, oleh) VALUES ('${kj}', 'banjir', 'Banjir uji', '2026-03-02', 'tanggap', 1, 'manual', 1, 1, 'x')`);
  const ins = (o) => { const r = {id: "00000000000000" + String(o.v).padStart(2, "0"), kejadian_id: kj, model: "gempa", versi: 1, status: "dihitung", masukan: "{}", ringkas: '{"rentang":[1,2]}', hasil_r2: null, ...o}; delete r.v;
    const k = Object.keys(r); return db.prepare(`INSERT INTO sk_kaji (${k.join(",")}, dihitung, diubah, oleh) VALUES (${k.map(() => "?").join(",")}, 1, 1, 'x')`).run(...k.map(x => r[x])); };
  ins({v: 1, hasil_r2: `siklus/saji/kaji/${kj}.json`});
  const baru = readFileSync(path.join(dir, "0174_sk_kaji_gfm.sql"), "utf8");
  for (let i = 0; i < 2; i++) for (const s of pecah(baru)) db.exec(s);   // dua kali = idempoten
  assert.equal(db.prepare("SELECT count(*) c FROM sk_kaji").get().c, 1, "baris lama utuh");
  assert.equal(db.prepare("SELECT hasil_r2 FROM sk_kaji").get().hasil_r2, `siklus/saji/kaji/${kj}.json`);
  assert.equal(db.prepare("SELECT count(*) c FROM sqlite_master WHERE type = 'index' AND name IN ('sk_kaji_kej', 'sk_kaji_status', 'sk_kaji_dummy')").get().c, 3, "indeks terjaga");
  const tolak = (o, p) => assert.throws(() => ins(o), p ?? /constraint/i);
  assert.equal(ins({v: 2, model: "banjir_gfm", versi: 1, hasil_r2: `siklus/saji/kaji/${kj}_banjir_gfm_v1.json`}).changes, 1);
  assert.equal(ins({v: 3, model: "banjir_gfm", versi: 2, hasil_r2: null}).changes, 1, "hasil_r2 null boleh");
  tolak({v: 4, model: "banjir_gfm", versi: 3, hasil_r2: `siklus/saji/kaji/${kj}.json`});                       // pola gempa untuk gfm
  tolak({v: 5, model: "banjir_gfm", versi: 3, hasil_r2: `siklus/saji/kaji/${kj}_banjir_gfm_v2.json`});          // versi lain
  tolak({v: 6, model: "banjir_gfm", versi: 3, hasil_r2: `siklus/saji/kaji/KJ-2026-BBBBBBBB_banjir_gfm_v3.json`}); // kejadian lain
  tolak({v: 7, model: "banjir_jam1", versi: 1, hasil_r2: "siklus/saji/lain/x.json"});
  tolak({v: 8, model: "tsunami", versi: 1});
  assert.equal(ins({v: 9, model: "banjir_jam1", versi: 1, hasil_r2: `siklus/saji/kaji/${kj}.json`}).changes, 1, "jam1 tetap pola lama");
});

uji("T7 ingest: banjir_gfm diterima; hasil_r2 dicocokkan model dan versi; versi lama tidak ditimpa; ringkas dan status_model dijaga; gempa dan banjir_jam1 tetap jalan", async () => {
  const a = await ingest(); assert.equal(a.s, 201, a.t); assert.equal(a.j.versi, 1);
  const lama = await DB.prepare("SELECT hasil_r2, ringkas FROM sk_kaji WHERE id = ?").bind(a.j.id).first();
  const b = await ingest({versi: 2, hasil_r2: kunci(2), ringkas: {...RING, rentang: [200, 500]}}); assert.equal(b.s, 201, b.t); assert.equal(b.j.versi, 2);
  const tetap = await DB.prepare("SELECT hasil_r2, ringkas FROM sk_kaji WHERE id = ?").bind(a.j.id).first(); assert.deepEqual(tetap, lama, "v1 utuh");
  const sebelum = await n("sk_kaji");
  for (const o of [{hasil_r2: `siklus/saji/kaji/${KID}.json`}, {versi: 3, hasil_r2: kunci(2)}, {hasil_r2: kunci(1, "KJ-2026-ZZZZZZZZ")}, {hasil_r2: "../x.json"}, {versi: undefined}, {versi: 0}, {versi: 100}, {versi: "1"},
    {ringkas: {...RING, status_model: "teruji"}}, {ringkas: {...RING, vonis: "lulus"}}, {ringkas: {...RING, pil: "Teruji: lulus uji balik"}}, {ringkas: {...RING, status_model: undefined}},
    {ringkas: {...RING, rentang: [9, 1]}}, {ringkas: {...RING, catatan: ["x".repeat(190), "x".repeat(190), "x".repeat(190), "x".repeat(190), "x".repeat(190), "x".repeat(190), "x".repeat(190), "x".repeat(190)]}}, {model: "tsunami"}]) {
    const r = await ingest(o); assert.equal(r.s, 400, JSON.stringify(o).slice(0, 90) + " " + r.t);
  }
  assert.equal(await n("sk_kaji"), sebelum, "yang ditolak tidak menulis");
  const lulus = await ingest({versi: 3, hasil_r2: kunci(3), ringkas: {...RING, vonis: "lulus", status_model: "teruji", pil: "Teruji: lulus uji balik"}}); assert.equal(lulus.s, 201, lulus.t);
  // versi klien tidak sama dengan versi server (max+1): CHECK baris menolak (409), tidak menulis
  assert.equal((await ingest({versi: 9, hasil_r2: kunci(9)})).s, 409); assert.equal(await n("sk_kaji", `kejadian_id = '${KID}' AND model = 'banjir_gfm'`), 3);
  // model lama tidak berubah
  assert.equal((await ingest({model: "gempa", versi: undefined, ringkas: {rentang: [1, 2]}, hasil_r2: `siklus/saji/kaji/${KID}.json`})).s, 201);
  assert.equal((await ingest({model: "banjir_jam1", versi: undefined, ringkas: {rentang: [1, 2]}, hasil_r2: null})).s, 201);
  assert.equal((await ingest({model: "gempa", versi: undefined, ringkas: {rentang: [1, 2]}, hasil_r2: kunci(1)})).s, 400, "gempa tidak memakai pola gfm");
});

const HASIL = {versi: 1, yakin: "estimasi-model", kab: [{kab4: "3201", kab: "Bogor", kec: {A: {luas_ha: 1}}}, {kab4: "3205", kab: "Garut", kec: {B: {luas_ha: 2}}}], kec: {"3201": {A: 1}, "3205": {B: 2}}, jiwa_kab_sah: {worldpop: [1, 2]}};
const BER = n => `siklus/saji/kaji_berkas/${KID}/banjir_gfm/v1/${n}`;
let SID, SIDJAM;
uji("T7 hasil: PD dan KO menerima utuh; BP disaring ke kab4 lingkupnya", async () => {
  SID = (await DB.prepare("SELECT id FROM sk_kaji WHERE kejadian_id = ? AND model = 'banjir_gfm' AND versi = 1").bind(KID).first()).id;
  SIDJAM = (await DB.prepare("SELECT id FROM sk_kaji WHERE kejadian_id = ? AND model = 'banjir_jam1'").bind(KID).first()).id;
  await R2.put(kunci(1), JSON.stringify(HASIL));
  const staf = await GET(KO, `/kaji/${SID}`); assert.equal(staf.s, 200, staf.t); assert.deepEqual(staf.j.hasil.kab.map(k => k.kab4), ["3201", "3205"]); assert.ok(staf.j.hasil.jiwa_kab_sah);
  const bp = await GET(BP, `/kaji/${SID}`); assert.equal(bp.s, 200, bp.t);
  assert.deepEqual(bp.j.hasil.kab.map(k => k.kab4), ["3201"]); assert.deepEqual(Object.keys(bp.j.hasil.kec), ["3201"]); assert.equal("jiwa_kab_sah" in bp.j.hasil, false);
  assert.doesNotMatch(bp.t, /3205|Garut/, "kab lain tidak bocor");
  assert.equal((await GET(BP2, `/kaji/${SID}`)).s, 404, "BP di luar kejadian: 404 seragam");
});

uji("T7 berkas: izin nama, hak BP, 404 model lain, 413 melebihi batas, header", async () => {
  await R2.put(BER("3201_sel.geojson"), '{"type":"FeatureCollection","features":[]}'); await R2.put(BER("3205_sel.geojson"), "{}"); await R2.put(BER("3201_radar_pra.png"), new Uint8Array([137, 80, 78, 71]));
  const ok = await GET(KO, `/kaji/${SID}/berkas/3201_sel.geojson`); assert.equal(ok.s, 200, ok.t);
  assert.equal(ok.h.get("cache-control"), "private, max-age=3600"); assert.match(ok.h.get("vary") || "", /cookie/i);
  const biasa = await GET(KO, `/kaji/${SID}`); assert.match(biasa.h.get("cache-control"), /private, no-store/); assert.match(biasa.h.get("vary") || "", /cookie/i); assert.match(ok.h.get("content-type"), /geo\+json/); assert.equal(ok.h.get("x-content-type-options"), "nosniff");
  const png = await GET(KO, `/kaji/${SID}/berkas/3201_radar_pra.png`); assert.equal(png.s, 200); assert.equal(png.h.get("content-type"), "image/png");
  assert.equal((await GET(BP, `/kaji/${SID}/berkas/3201_sel.geojson`)).s, 200, "BP kab sendiri");
  assert.equal((await GET(BP, `/kaji/${SID}/berkas/3205_sel.geojson`)).s, 403, "BP kab lain");
  assert.match((await GET(BP, `/kaji/${SID}/berkas/3205_sel.geojson`)).h.get("cache-control"), /no-store/, "403 tidak di-cache");
  assert.equal((await GET(TAMU, `/kaji/${SID}/berkas/3201_sel.geojson`)).s, 401);
  for (const nm of ["..%2F3201_sel.geojson", "%2e%2e/3201_sel.geojson", "3201_sel.json", "3201_sel.geojson%00", "320_sel.geojson", "3201_lain_pra.png", "3201_radar_pra.gif", "3201_radar_pra.png/x", "3201/sel.geojson", ""]) {
    const r = await GET(KO, `/kaji/${SID}/berkas/${nm}`); assert.ok([404, 400].includes(r.s) && r.s !== 200, nm + " " + r.s);
  }
  assert.equal((await GET(KO, `/kaji/${SID}/berkas/3201_asli_pasca.png`)).s, 404, "tidak ada di R2");
  assert.equal((await GET(KO, `/kaji/${SIDJAM}/berkas/3201_sel.geojson`)).s, 404, "model bukan banjir_gfm");
  assert.equal((await GET(KO, `/kaji/0123456789abcdef/berkas/3201_sel.geojson`)).s, 404);
  await R2.put(BER("3201_sel.geojson"), "x".repeat(300 * 1024 + 1)); await R2.put(BER("3201_radar_pra.png"), new Uint8Array(120 * 1024 + 1));
  for (const nm of ["3201_sel.geojson", "3201_radar_pra.png"]) { const r = await GET(KO, `/kaji/${SID}/berkas/${nm}`); assert.equal(r.s, 413, nm); assert.match(r.h.get("cache-control"), /no-store/); assert.doesNotMatch(r.t, /xxxx/); }
  await R2.put(BER("3201_sel.geojson"), "x".repeat(300 * 1024)); assert.equal((await GET(KO, `/kaji/${SID}/berkas/3201_sel.geojson`)).s, 200, "tepat di batas");
});
