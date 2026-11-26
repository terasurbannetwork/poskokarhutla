/* LR-11 gerbang Lapor tanpa sinyal (data/kajian-bnpb/lapor-luring RENCANA-UJI bagian 5).
   Service worker dijalankan sungguhan di vm dengan self, caches, dan fetch tiruan: handler fetch-nya ditanya satu per satu jalur mana yang ia layani.
   Jalankan: node --test tests/lapor/luring_gerbang.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const baca = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const SW = baca("public/sw-lapor.js"), HTML = baca("public/lapor/index.html"), LURING = baca("public/lapor/luring.js");
const ASAL = "https://centurisk97.id";

/* muat SW di vm: kumpulkan pendengar dan semua caches.put */
function muatSw() {
  const dengar = {}, ditaruh = [];
  const tembolok = {put: async (req) => { ditaruh.push(typeof req === "string" ? req : req.url); }};
  const ctx = {self: {addEventListener: (t, f) => { dengar[t] = f; }, location: {origin: ASAL}, skipWaiting: async () => {}, clients: {claim: async () => {}}},
    caches: {open: async () => tembolok, match: async () => undefined, keys: async () => [], delete: async () => true},
    fetch: async () => ({ok: true, clone() { return this; }, text: async () => HTML}), URL, Promise, setTimeout, Response: {error: () => ({})}};
  vm.runInNewContext(SW, ctx);
  return {dengar, ditaruh};
}
const { dengar } = muatSw();
const dilayani = (jalur, method = "GET", mode = "no-cors") => {
  let kena = false;
  dengar.fetch({request: {method, url: ASAL + jalur, mode}, respondWith: p => { kena = true; Promise.resolve(p).catch(() => {}); }, waitUntil() {}});
  return kena;
};

test("SW: VERSI berawalan pb-lapor- dan versi lama dibuang saat aktif", () => {
  assert.match(SW, /const VERSI = "pb-lapor-\d+"/);
  assert.match(SW, /k\.startsWith\("pb-lapor-"\) && k !== SIMPAN/);
});

test("SW hanya GET: POST ke /api/lapor tidak pernah disentuh", () => {
  for (const j of ["/api/lapor/pesan", "/api/lapor/foto", "/api/lapor/darurat/cepat"]) assert.equal(dilayani(j, "POST"), false, j);
});

test("SW tidak menyimpan respons /api/ selain nomor penting (tanpa data pribadi di cache)", () => {
  for (const j of ["/api/lapor/sesi", "/api/lapor/riwayat", "/api/lapor/foto/abc", "/api/lapor/meja"]) assert.equal(dilayani(j), false, j);
  assert.equal(dilayani("/api/lapor/penting"), true);
  assert.equal((SW.match(/"\/api\//g) || []).length, 3, "jalur /api/ baru di SW harus lewat gerbang ini");
});

test("cangkang: halaman /lapor/ dan semua aset lokal index.html dilayani SW saat tanpa sinyal", () => {
  assert.equal(dilayani("/lapor/", "GET", "navigate"), true);
  const aset = [...HTML.matchAll(/(?:src|href)="(\/[^"#]+)"/g)].map(m => m[1]).filter(u => u !== "/lapor/" && !u.startsWith("/api/"));
  // impor modul luring.js dan spek bersama dimuat lewat import, bukan tag; ikut diperiksa
  const impor = [...LURING.matchAll(/from "\.\.\/inti\/([^"]+)"/g)].map(m => `/inti/${m[1]}`).concat("/inti/spek.js");
  const tidak = [...aset, ...impor].filter(u => !/^\/bnpb\/turnstile\.js/.test(u) && !dilayani(u));   // turnstile butuh jaringan ke Cloudflare
  assert.deepEqual(tidak, [], "aset tidak tersedia tanpa sinyal");
});

test("pasang: cangkang membaca aset dari halaman, tanpa /api/ dan tanpa foto hiasan", async () => {
  const {dengar: d, ditaruh} = muatSw(); let tunggu;
  d.install({waitUntil: p => { tunggu = p; }}); await tunggu;
  assert.ok(ditaruh.includes("/lapor/"));
  assert.ok(ditaruh.some(u => u.startsWith("/lapor/luring.js?v=")), "luring.js ikut cangkang");
  assert.equal(ditaruh.filter(u => u.startsWith("/api/")).length, 0);
});

test("antrean: batas 5 butir, 3 foto, 20 MB, 14 hari dari spek bersama dan dipakai formulir", async () => {
  const {BATAS, bolehSimpan} = await import("../../public/inti/luring_spek.js");
  assert.equal(BATAS.butir, 5); assert.equal(BATAS.fotoPerButir, 3); assert.equal(BATAS.totalByte, 20 * 1024 * 1024); assert.equal(BATAS.umurMs, 14 * 864e5);
  assert.equal(bolehSimpan({butirMenunggu: 5}).ok, false);
  assert.equal(bolehSimpan({foto: 4}).ok, false);
  assert.equal(bolehSimpan({byteTersimpan: 19 * 1048576, byteBaru: 2 * 1048576}).ok, false);
  assert.match(LURING, /bolehSimpan\(\{butirMenunggu/, "formulir memeriksa batas sebelum simpan");
  assert.match(LURING, /saluran\("lapor-luring"/);
  assert.doesNotMatch(LURING, /indexedDB\.open|localStorage\.setItem\("pb_antre/, "antrean hanya lewat inti/antre.js");
  assert.doesNotMatch(SW, /indexedDB/, "SW tidak membaca antrean");
});

test("foto luring hanya dari kamera: tiap input berkas ber-capture dan EXIF kamera wajib", () => {
  const berkas = (LURING.match(/\.type = "file"/g) || []).length, kamera = (LURING.match(/\.capture = "environment"/g) || []).length;
  assert.ok(berkas >= 1); assert.equal(kamera, berkas);
  assert.match(LURING, /!exif \|\| !exif\.kamera/);
  assert.match(LURING, /BATAS\.fotoSegarMs/, "aturan 5 menit dari spek (Q1)");
});

test("Worker: waktu simpan HP dicek waktuKlienSah dan tidak menulis waktu kejadian", () => {
  const M = baca("src/lapor_mesin.js"), t = M.slice(M.indexOf("export function tandaLuring"), M.indexOf("export function nilaiFotoLuring"));
  assert.match(M, /import \{waktuKlienSah, BATAS as BATAS_LURING\} from "\.\.\/public\/inti\/luring_spek\.js"/);
  assert.match(t, /waktuKlienSah\(w, kini\)/);
  assert.doesNotMatch(t, /isian|\.waktu\s*=/, "tandaLuring tidak menyentuh isian waktu");
});

test("teks luring: tanpa kata aman, tanpa titik tengah, tanpa kapital semua", () => {
  const teks = [...LURING.matchAll(/(["`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map(m => m[2].replace(/\$\{[^}]*\}/g, "")).filter(x => /\s/.test(x) && /[a-z]/.test(x));
  for (const x of teks) {
    assert.doesNotMatch(x, /\baman\b/i, x);
    assert.doesNotMatch(x, /·/, x);
    const kapital = (x.match(/\b[A-Z]{3,}\b/g) || []).filter(k => !["BNPB", "BPBD", "GPS", "EXIF", "JPEG", "WIB"].includes(k));
    assert.deepEqual(kapital, [], x);
  }
});
