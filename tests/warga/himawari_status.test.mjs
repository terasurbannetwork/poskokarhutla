/* ST-01 (KEPUTUSAN-SATELIT D16): status_sumber Himawari. Terputus = tanpa baris alarm (null BUKAN "tanpa api"), /api/status memberi alasan, status_sumber rusak = terputus/galat. */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {periksaStatus} from "../../src/worker.js";   // worker.js SEBELUM modul yang saling mengimpor
import {statusSumber, tandaiBaru, himawariRespons} from "../../src/himawari.js";
import {alarmHimawari} from "../../src/alarm_himawari.js";

const kini = Date.now(), acuan = new Date(kini - 600e3).toISOString();
const H = [-2, 114, 20, 30, 3, 3, 1, 4, 50];
const hidup = {sumber: "ptree_wlf", status: "hidup", terakhir_ok: acuan, terputus_sejak: null, kelas_galat: null, percobaan: 1, alarm_tersedia: true};
const putus = {sumber: "ptree_wlf", status: "terputus", terakhir_ok: null, terputus_sejak: "2026-11-25T02:27Z", kelas_galat: "ditolak", percobaan: 3, alarm_tersedia: false, teks: "<img src=x onerror=alert(1)>"};
const R_PUTUS = {acuan, baris: null, penanda: null, status_sumber: putus}, R_HIDUP = {acuan, baris: [H], status_sumber: hidup};
const r2 = o => ({get: async k => k === "data/himawari.json" && o ? {body: new Response(JSON.stringify(o)).body} : null, head: async () => o ? {etag: "e"} : null});
const stmt = () => { const q = {bind: () => q, first: async () => null, all: async () => ({results: []}), run: async () => ({meta: {changes: 0}})}; return q; };
const D1 = {prepare: stmt, batch: async () => []};
const ASSETS = {fetch: async () => new Response(null, {status: 404})};
const status = async o => (await periksaStatus({MEDIA: r2(o), DB: D1, ASSETS}, new URL("https://x.test/api/status"), kini)).sumber.himawari;

uji("himawari status: terputus -> status + waktu + kelas, bukan hanya basi; teks server tak lolos", async () => {
  const s = await status(R_PUTUS);
  assert.deepEqual([s.status, s.terputus_sejak, s.kelas_galat], ["terputus", "2026-11-25T02:27Z", "ditolak"]);
  const r = await himawariRespons({MEDIA: r2(R_PUTUS), DB: D1, ASSETS}, kini);
  assert.deepEqual(r.baris, []); assert.equal(r.n_baru, 0);
  assert.equal(r.status_sumber.teks, "sumber terputus sejak 2026-11-25T02:27Z");
  assert.ok(!JSON.stringify(r).includes("<img"), "string bebas server tak boleh diteruskan");
});
uji("himawari status: pulih -> hidup, tanpa terputus_sejak", async () => {
  const s = await status(R_HIDUP);
  assert.equal(s.status, "hidup"); assert.ok(!("terputus_sejak" in s));
  assert.equal((await himawariRespons({MEDIA: r2(R_HIDUP), DB: D1, ASSETS}, kini)).status_sumber.status, "hidup");
});
uji("himawari status: status_sumber rusak -> terputus/galat (gagal tertutup); berkas lama tanpa kunci tetap hidup", () => {
  for (const x of ["hidup", 5, [], {}, {status: "hidup", alarm_tersedia: "ya"}, {status: "terputus", kelas_galat: "<b>", terputus_sejak: "<b>"}]) {
    const s = statusSumber({acuan, baris: [H], status_sumber: x});
    assert.equal(s.alarm_tersedia, false, JSON.stringify(x)); assert.equal(s.status, "terputus", JSON.stringify(x));
    assert.equal(s.kelas_galat, "galat", JSON.stringify(x)); assert.ok(!s.teks?.includes("<"));
  }
  assert.equal(statusSumber({acuan, baris: [H]}).alarm_tersedia, true);
  assert.equal(statusSumber({acuan, baris: [H], status_sumber: hidup}).status, "hidup");
});
uji("himawari status: tandaiBaru kosong saat terputus; baris null tidak melempar", () => {
  assert.deepEqual(tandaiBaru(R_PUTUS, null, kini), []);
  assert.deepEqual(tandaiBaru({...R_HIDUP, status_sumber: putus}, null, kini), [], "baris ada tapi sumber terputus: tetap kosong");
  assert.equal(tandaiBaru(R_HIDUP, null, kini).length, 1);
});
uji("himawari status: alarmHimawari terputus tidak menulis alarm dan memberi alasan", async () => {
  const sql = [], db = {prepare: s => { sql.push(s); return stmt(); }, batch: async () => []};
  const h = await alarmHimawari({MEDIA: r2(R_PUTUS), DB: db}, kini);
  assert.equal(h.lewat, "sumber terputus"); assert.ok(!sql.some(s => /INSERT INTO alarm_himawari|UPDATE tugas_api/.test(s)));
});
uji("himawari status: berkas hilang = tidak_diketahui (bukan hidup), tanpa alarm; /api/status melaporkannya", async () => {
  assert.equal(statusSumber(null).status, "tidak_diketahui"); assert.equal(statusSumber(null).alarm_tersedia, false);
  assert.equal((await status(null)).status, "tidak_diketahui");
});
