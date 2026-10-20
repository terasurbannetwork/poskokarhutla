/* Bantuan bersama uji Ruang Koordinasi BNPB (relawan, alun-alun, riset, meja kerja): worker.js utuh di workerd (Miniflare), D1 lokal
   sungguhan dengan migrasi apa adanya (TEST.md: tanpa mock klien DB). Jaringan luar diblok. Pakai: const U = await siapkan("uji-relawan"). */
import {test, after} from "node:test";
import path from "node:path";
import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

export const ADMIN = {"x-admin-token": "rahasia-admin"}, MOD2 = {"x-admin-token": "moderator-dua"}, GERBANG = {"x-admin-token": "gerbang@x:sandi"};
export const sha256 = s => createHash("sha256").update(s).digest("hex");
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
export async function siapkan(nama, {r2 = false, ikat = {}, luar, skrip = "src/worker.js"} = {}) {
  const mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, skrip), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", cf: {country: "ID", colo: "CGK"}, d1Databases: {DB: nama}, ...(r2 ? {r2Buckets: {MEDIA: nama}} : {}),
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin, moderator-dua", AKUN_SITUS: "gerbang@x:sandi", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), SESI_KUNCI: "kunci-sesi-uji", ...ikat},
    serviceBindings: {ASSETS: aset}, outboundService: luar || (() => new Response("diblok di uji", {status: 599})), cache: false});
  const DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  after(() => mf.dispose());
  /* ip: header cf-connecting-ip supaya batas laju per IP bisa diuji */
  const api = async (metode, j, body, h = {}) => {
    const isi = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    const r = await mf.dispatchFetch("http://bnpb.lokal" + j, {method: metode, headers: {...(body !== undefined && typeof body !== "string" ? {"content-type": "application/json"} : {}), ...h}, body: isi});
    const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
    return {s: r.status, j: x, t, h: r.headers};
  };
  const n = async (tabel, where = "1") => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).first()).n;
  return {mf, DB, api, adm: (m, j, b) => api(m, j, b, ADMIN), n};
}
/* uji berantai: sesudah satu gagal, sisanya dilewati dengan pesan jelas (status D1 sudah tidak bisa dipercaya) */
export function berantai() {
  let rusak = null;
  return (nama, fn) => test(nama, async () => {
    if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
    try { await fn(); } catch (e) { rusak = nama; throw e; }
  });
}
