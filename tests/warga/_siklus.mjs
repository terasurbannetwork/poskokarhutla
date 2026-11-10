/* Bantuan bersama uji Siklus Bencana (tests/warga/siklus_*.test.mjs): worker.js utuh di Miniflare + D1 + R2, migrasi apa adanya, aset palsu /siklus/*.
   Aktor: tamu, staf PD/KO/PM (login sungguhan lewat /api/staf), SA dan MOD (token admin), BP (akun instansi, login sungguhan). */
import assert from "node:assert/strict";
import "../../src/worker.js";   // worker dulu: modul saling impor
import {siapkan, ADMIN, MOD2, sha256} from "./_bnpb.mjs";

export {ADMIN, MOD2};
export const PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
export const ASET = {"/siklus/index.html": "<!doctype html><title>staf</title>", "/siklus/publik.html": "<!doctype html><title>publik</title>", "/siklus/siklus.js": "export const x = 1;", "/siklus/inti.js": "export const y = 2;",
  "/siklus/siklus.css": "body{}", "/siklus/publik.js": "console.log(1)", "/siklus/publik.css": "body{}", "/siklus/data/atribusi.json": '{"v":1}', "/siklus/data/kamus.json": '{"v":1}', "/siklus/data/masa_depan_ringkas.json": '{"v":1}', "/siklus/data/rahasia.json": '{"x":1}'};
const aset = async req => { const p = new URL(req.url).pathname; return ASET[p] != null ? new Response(ASET[p]) : new Response("tidak ada", {status: 404}); };
export const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const ALFABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let nId = 0;
export const kjAcak = (tahun = 2026) => { let v = ++nId * 7919, k = ""; for (let i = 0; i < 8; i++, v = Math.floor(v / 32)) k = ALFABET[v % 32] + k; return `KJ-${tahun}-${k}`; };

export async function mulai(nama, {ikat = {}, r2 = true} = {}) {
  const U = await siapkan(nama, {r2, ikat: {PIPA_TOKEN: "token-pipa-uji", ...ikat}, asetKu: aset});
  const {DB, api} = U;
  let ipN = 0; const ip = () => ({"cf-connecting-ip": `192.0.2.${++ipN % 250 + 1}`});
  let nipN = 0;
  const staf = async (nama, peran, wilayah = []) => {
    const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19970${++nipN}0012005`, unit: "Pusdalops BNPB", email: `s${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
    const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ip()); assert.equal(m.s, 200, m.t);
    const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
    return {h: {cookie, ...ip()}, hp: {cookie, ...PB, ...ip()}, via: "/api/siklus"};
  };
  let akunN = 0;
  const bp = async (o = {}) => {
    const username = "bpuji" + ++akunN, garam = "c".repeat(32), id = id16(), t = Date.now();
    const baris = {id, username, jenis: "pemkab", tingkat: "kab", wilayah: "BPBD Kabupaten " + username, kunci_wilayah: "k" + id, cakupan: '["32"]', prov: "32", kab: "Bogor", garam, sandi_sha: sha256(garam + "SandiUji123456"),
      status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat: t, ...o};
    await DB.prepare(`INSERT INTO instansi_akun (${Object.keys(baris).join(", ")}) VALUES (${Object.keys(baris).map(() => "?").join(", ")})`).bind(...Object.values(baris)).run();
    const m = await api("POST", "/api/instansi/masuk", {username, sandi: "SandiUji123456"}, {...PB, ...ip()}); assert.equal(m.s, 200, m.t);
    const cookie = m.h.get("set-cookie").split(";")[0];
    return {h: {cookie, ...ip()}, hp: {cookie, ...PB, ...ip()}, via: "/api/instansi/siklus", id};
  };
  const SA = {h: {...ADMIN}, hp: {...ADMIN, ...PB}, via: "/api/siklus"}, MOD = {h: {...MOD2}, hp: {...MOD2, ...PB}, via: "/api/siklus"}, TAMU = {h: {...ip()}, hp: {...PB, ...ip()}, via: "/api/siklus"};
  const GET = (a, j, h = {}) => api("GET", a.via + j, undefined, {...a.h, ...h}), POST = (a, j, b, h = {}) => api("POST", a.via + j, b, {...a.hp, ...h});
  const n = async (tabel, where = "1") => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).first()).n;
  /* kejadian lewat rute sungguhan; paksa: lewati peringatan serupa */
  const kej = async (a, o = {}) => { const r = await POST(a, "/kejadian", {jenis: "banjir", nama: "Banjir uji", kab4: "3201", mulai: "2026-03-02", paksa: true, ...o}); assert.equal(r.s, 201, r.t); return r.j.id; };
  return {...U, staf, bp, SA, MOD, TAMU, GET, POST, n, kej, ip};
}
