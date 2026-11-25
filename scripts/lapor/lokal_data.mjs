/* Tinjau lokal rute /api/lapor/data/* (data lanjutan BPBD, paket lapor-lanjutan): Worker ASLI (src/worker.js) di Miniflare, D1 + R2 sungguhan,
   tersimpan di ~/.lapor-lokal/miniflare (luar repo, persisten). Migrasi diterapkan saat mulai, dicatat di tabel _migrasi_lokal (idempoten).
   Dipanggil dari tanganiLapor (scripts/lapor/lokal.mjs); tidak ada logika rute di sini. Hanya loopback, tidak pernah ke produksi.
   Berkas uji: node scripts/lapor/lokal.mjs berkas-uji (nomor WA rekaan). */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Miniflare} from "miniflare";
import {pecah} from "../../tests/warga/_bantu.mjs";   // juga menyambung FormData Node ke miniflare

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ASAL = "http://bnpb.lokal", ADMIN = "rahasia-lokal";
let siap;
export const mulai = () => siap ||= (async () => {
  const dir = path.join(os.homedir(), ".lapor-lokal", "miniflare"); fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  const mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", cf: {country: "ID", colo: "CGK"}, defaultPersistRoot: dir, d1Databases: {DB: "lapor-lokal"}, r2Buckets: {MEDIA: "lapor-lokal"},
    bindings: {IP_SALT: "garam-lokal", ALARM_CACHE_DETIK: "0", ADMIN_TOKEN: ADMIN, SESI_KUNCI: "kunci-sesi-lokal"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, outboundService: () => new Response("diblok (lokal)", {status: 599}), cache: false});
  const DB = await mf.getD1Database("DB");
  await DB.prepare("CREATE TABLE IF NOT EXISTS _migrasi_lokal (nama TEXT PRIMARY KEY)").run();
  const ada = new Set((await DB.prepare("SELECT nama FROM _migrasi_lokal").all()).results.map(r => r.nama));
  for (const f of fs.readdirSync(path.join(AKAR, "migrations")).filter(f => f.endsWith(".sql")).sort()) {
    if (ada.has(f)) continue;
    await DB.batch(pecah(fs.readFileSync(path.join(AKAR, "migrations", f), "utf8")).map(s => DB.prepare(s)));
    await DB.prepare("INSERT INTO _migrasi_lokal VALUES (?)").bind(f).run();
  }
  return {mf, DB};
})();

/* Staf lokal: peramban loopback tidak punya sesi staf Worker, jadi tanpa kuki tim kita titipkan token admin lokal (hanya di Miniflare ini). */
export async function layani(req, res, url) {
  const {mf} = await mulai(), h = {};
  for (const [k, v] of Object.entries(req.headers)) if (!["host", "connection", "origin"].includes(k)) h[k] = v;
  if (req.headers.origin) h.origin = ASAL;
  if (!/lapor_data=/.test(req.headers.cookie || "")) h["x-admin-token"] = ADMIN;
  const bagian = []; for await (const c of req) bagian.push(c);
  const badan = Buffer.concat(bagian), tanpa = req.method === "GET" || req.method === "HEAD";
  const r = await mf.dispatchFetch(ASAL + url.pathname + url.search, {method: req.method, headers: h, body: tanpa || !badan.length ? undefined : badan});
  const kepala = {}; r.headers.forEach((v, k) => { if (k !== "set-cookie" && k !== "content-encoding") kepala[k] = v; });
  const kuki = r.headers.getSetCookie?.() || []; if (kuki.length) kepala["set-cookie"] = kuki.map(c => c.replace(/;\s*Secure/i, ""));
  res.writeHead(r.status, kepala); res.end(Buffer.from(await r.arrayBuffer())); return true;
}

/* satu tiket induk tingkat bpbd + berkas data + ketua rekaan; kembalikan tautan ketua */
export async function berkasUji() {
  await import("../../src/worker.js");
  const {bukaBerkas} = await import("../../src/lapor_lanjut.js"), {DB} = await mulai(), kini = Date.now();
  const wa = "62812999" + String(Math.floor(Math.random() * 9000) + 1000), nomor = "LA-" + new Date(kini + 7 * 36e5).toISOString().slice(2, 10).replace(/-/g, "") + "-" + String(Math.floor(Math.random() * 89) + 10);
  const kab = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
  const kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: kab}}, jenis: {nilai: "banjir"}}, transkrip: []};
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
  await DB.batch([DB.prepare("INSERT OR IGNORE INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, 'bpbd', 'Kota Bogor', 'uji-lokal', ?)").bind(wa, kini),
    DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES (?, ?, 'terkirim', 'bpbd', 'banjir', '32.71', -6.6, 106.8, ?, ?, ?, ?, '{}', 0, ?, ?)`).bind("s" + nomor, wa, nomor, await sha(nomor), kini, JSON.stringify(kerja), kini, kini),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, 'baru', ?)").bind(nomor, "s" + nomor, kini)]);
  const r = await bukaBerkas({DB}, nomor, kini, ASAL);
  const k = await DB.prepare("SELECT teks FROM lj_kabar WHERE wa = ? ORDER BY rowid DESC LIMIT 1").bind(wa).first();
  return {...r, nomor, wa, tautan: "http://localhost:8800" + (/\/lapor\/data\/\?t=[0-9a-f]{32}/.exec(k?.teks || "")?.[0] || "?")};
}
