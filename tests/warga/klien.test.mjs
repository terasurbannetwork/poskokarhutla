/* Lapisan klien (fungsi murni + gerbang persetujuan): public/persetujuan.js dan public/jejak.js dijalankan apa adanya di node:vm
   dengan DOM tiruan minimal; src/publik.js & src/statistik.js diuji sebagai fungsi murni. Tanpa jaringan, tanpa database.
   Jalankan: node --test tests/warga/klien.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {PERISTIWA, pSampel, pHit, MAKS_BODY_JEJAK} from "../../src/statistik.js";
import {klasifikasi, dalamCidr, cidrKe, ambilCidr, jaringanHosting, kanal, perangkat, tamuHash} from "../../src/publik.js";

const SKRIP = n => readFileSync(path.join(AKAR, "public", n), "utf8");
const MENIT = 60e3, WIB = 7 * 36e5, hariWIB = t => new Date(t + WIB).toISOString().slice(0, 10);

/* ---------- DOM tiruan: cukup untuk persetujuan.js + jejak.js ---------- */
function dunia({simpan = {}, nav = {}, kini = Date.now()} = {}) {
  const ls = new Map(Object.entries(simpan)), beacon = [], fetchLog = [], timer = [], sisip = [];
  const el = () => { const e = new EventTarget(); Object.assign(e, {remove() { e.dihapus = true; }, querySelector: () => el(), querySelectorAll: () => [], focus() {}, dataset: {}, style: {},
    insertAdjacentHTML(_, h) { sisip.push(h); }, parentElement: null, closest: () => null, showModal() {}, checked: false});
    Object.defineProperty(e, "lastElementChild", {get: () => el()}); return e; };   // getter, bukan nilai (Object.assign akan memanggilnya berulang)
  const doc = el(); const win = new EventTarget();
  Object.assign(doc, {visibilityState: "visible", readyState: "interactive", referrer: "https://l.facebook.com/", baseURI: "https://posko.lokal/",
    documentElement: {dataset: {}}, head: el(), body: el(), getElementById: () => null, querySelector: s => s === ".page.on" ? {id: "p-peta"} : null, querySelectorAll: () => []});
  const ctx = {
    window: win, document: doc, navigator: {sendBeacon: (u, b) => { beacon.push({u, b}); return true; }, language: "id-ID", connection: {effectiveType: "4g"}, ...nav},
    localStorage: {getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k)},
    sessionStorage: {getItem: () => null, setItem() {}},
    screen: {width: 390, height: 844}, location: new URL("https://posko.lokal/peta?utm_source=wa"), Blob, URL, URLSearchParams, CustomEvent, Event, EventTarget, crypto: globalThis.crypto,
    setTimeout: (f, ms) => { timer.push({f, ms}); return timer.length; }, clearTimeout() {}, setInterval() {}, performance: {getEntriesByType: () => []},
    fetch: (...a) => { fetchLog.push(a); return Promise.resolve(new Response("{}")); }, Date: class extends Date { constructor(...a) { super(...(a.length ? a : [kini])); } static now() { return kini; } },
    Math, JSON, Number, String, Object, Array, Set, Map, WeakSet, Promise, RegExp, Error, console,
  };
  Object.assign(win, ctx, {innerWidth: 390, innerHeight: 844, matchMedia: q => ({matches: /coarse/.test(q)}), addEventListener: win.addEventListener.bind(win), dispatchEvent: win.dispatchEvent.bind(win)});
  ctx.window = win; ctx.self = win; win.window = win;
  vm.createContext(win);
  const jalankan = (nama, data = {}) => { doc.currentScript = {dataset: data, src: "https://posko.lokal/" + nama}; vm.runInContext(SKRIP(nama), win, {filename: nama}); };
  return {win, doc, ls, beacon, fetchLog, timer, sisip, jalankan, waktu: f => timer.filter(t => f(t.ms)).forEach(t => t.f())};
}
const isiBeacon = async d => Promise.all(d.beacon.map(async x => JSON.parse(await x.b.text())));
const tutup = d => { d.doc.visibilityState = "hidden"; d.doc.dispatchEvent(new Event("visibilitychange")); d.win.dispatchEvent(new Event("pagehide")); };

let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});

/* ---------- gerbang persetujuan ---------- */
uji("persetujuan: tanpa pilihan, analitik mati dan jejak tidak mengirim apa pun", async () => {
  const d = dunia();
  d.jalankan("persetujuan.js"); d.jalankan("jejak.js", {halaman: "karhutla"});
  assert.equal(d.win.Persetujuan.analitik(), false);
  assert.ok(!d.sisip.some(h => h.includes("<section class=\"pv pv-kartu\"")), "spanduk sengaja dimatikan (SPANDUK = false, pemilik 14 Okt 2026)");
  d.waktu(() => true); tutup(d);
  assert.equal(d.beacon.length + d.fetchLog.length, 0, "tidak boleh ada kiriman sebelum persetujuan");
  assert.equal(d.ls.has("pb_vid"), false, "id analitik tidak boleh dibuat sebelum persetujuan");
});

uji("persetujuan: menolak tidak mengirim apa pun; menerima mengirim satu hitungan 'terima'", async () => {
  const t = dunia();
  t.jalankan("persetujuan.js"); t.jalankan("jejak.js", {halaman: "karhutla"});
  t.win.Persetujuan.simpan(false); tutup(t);
  assert.equal(t.beacon.length, 0, "menolak: nol kiriman");
  const p = JSON.parse(t.ls.get("pb_persetujuan"));
  assert.deepEqual([p.v, p.analitik, typeof p.t], [t.win.Persetujuan.VERSI, false, "number"], "pilihan + versi + tanggal disimpan");
  const d = dunia();
  d.jalankan("persetujuan.js"); d.jalankan("jejak.js", {halaman: "karhutla"});
  d.win.Persetujuan.simpan(true); tutup(d);
  const [b] = await isiBeacon(d);
  assert.equal(d.beacon.length, 1, "tepat satu kiriman saat halaman ditutup");
  assert.ok(b.e.some(e => e[0] === "persetujuan" && e[1] === "terima"), "hitungan persetujuan diterima ikut");
});

uji("persetujuan: DNT/GPC memaksa mati; pilihan lama (> 12 bulan) atau versi lain ditanya ulang", async () => {
  const g = dunia({nav: {globalPrivacyControl: true}});
  g.jalankan("persetujuan.js"); g.jalankan("jejak.js", {halaman: "karhutla"});
  g.win.Persetujuan.simpan(true); tutup(g);
  assert.equal(g.win.Persetujuan.analitik(), false); assert.equal(g.beacon.length, 0, "GPC: tidak ada kiriman walau 'terima'");
  const n = dunia({nav: {doNotTrack: "1"}, simpan: {pb_persetujuan: JSON.stringify({v: "2026-10", t: Date.now(), analitik: true})}});
  n.jalankan("persetujuan.js"); n.jalankan("jejak.js", {halaman: "karhutla"}); tutup(n);
  assert.equal(n.beacon.length, 0, "DNT: tidak ada kiriman walau tersimpan setuju");
  for (const lama of [{v: "2026-10", t: Date.now() - 366 * 864e5, analitik: true}, {v: "2020-01", t: Date.now(), analitik: true}]) {
    const x = dunia({simpan: {pb_persetujuan: JSON.stringify(lama)}});
    x.jalankan("persetujuan.js");
    assert.equal(x.win.Persetujuan.analitik(), false, `pilihan ${JSON.stringify(lama)} tidak berlaku`);
    assert.ok(!x.sisip.some(h => h.includes("<section class=\"pv pv-kartu\"")), "spanduk tetap mati (SPANDUK = false); analitik mati di atas");
  }
});

/* ---------- jejak: bendera kunjungan dari localStorage, muatan ---------- */
const setuju = JSON.stringify({v: "2026-10", t: Date.now(), analitik: true});
uji("jejak: aturan 30 menit, pengunjung kembali, pertama hari ini, slot tidak dihitung dua kali", async () => {
  const kini = Date.parse("2026-10-14T03:00:00Z"), kemarin = hariWIB(kini - 864e5);
  const a = dunia({kini, simpan: {pb_persetujuan: setuju, pb_vid: "abcdefabcdefabcdef", pb_hari1: kemarin, pb_akhir: String(kini - 31 * MENIT)}});
  a.jalankan("persetujuan.js"); a.jalankan("jejak.js", {halaman: "banjir"}); tutup(a);
  const [x] = await isiBeacon(a);
  assert.deepEqual([x.h, x.o, x.b, x.kv], ["banjir", 1, 1, 1], "pertama hari ini, pernah datang kemarin, kunjungan baru (> 30 mnt)");
  assert.deepEqual(x.s, [Math.floor(((kini + WIB) % 864e5) / 6e5)], "slot 10 menit sekarang");
  const b = dunia({kini: kini + 10 * MENIT, simpan: Object.fromEntries(a.ls)});
  b.jalankan("persetujuan.js"); b.jalankan("jejak.js", {halaman: "banjir"}); tutup(b);
  const [y] = await isiBeacon(b);
  assert.deepEqual([y.o, y.kv], [0, 0], "10 menit kemudian: bukan orang baru, bukan kunjungan baru");
  assert.deepEqual(y.s, [Math.floor(((kini + 10 * MENIT + WIB) % 864e5) / 6e5)].filter(s => !x.s.includes(s)), "slot yang sudah dilaporkan tidak dikirim lagi");
  const c = dunia({kini: kini + 50 * MENIT, simpan: Object.fromEntries(b.ls)});
  c.jalankan("persetujuan.js"); c.jalankan("jejak.js", {halaman: "banjir"}); tutup(c);
  assert.equal((await isiBeacon(c))[0].kv, 1, "40 menit tanpa aktivitas: kunjungan baru");
});

uji("jejak: muatan sah menurut server (allow-list, ≤ 50 entri, ≤ 4 KB), maks 3 kiriman per muat", async () => {
  const d = dunia({simpan: {pb_persetujuan: setuju}});
  d.jalankan("persetujuan.js"); d.jalankan("jejak.js", {halaman: "karhutla"});
  for (let i = 0; i < 120; i++) d.win.Jejak.catat("kompleks", "K" + String(i).padStart(4, "0") + "x".repeat(70));
  d.win.Jejak.catat("rujukan", "harus-dibuang-kalau-penuh");
  d.waktu(ms => ms === 5 * MENIT);   // kiriman tengah sesi
  d.doc.visibilityState = "hidden"; d.doc.dispatchEvent(new Event("visibilitychange"));   // < 2 menit sejak kiriman: tidak kirim
  d.win.dispatchEvent(new Event("pagehide"));
  for (let i = 0; i < 5; i++) d.win.Jejak.kirim();
  assert.ok(d.beacon.length <= 3, `maks 3 kiriman per muat, terjadi ${d.beacon.length}`);
  for (const m of await isiBeacon(d)) {
    const s = JSON.stringify(m);
    assert.ok(s.length <= MAKS_BODY_JEJAK, `muatan ${s.length} byte > ${MAKS_BODY_JEJAK}`);
    assert.ok(m.e.length <= 50, `${m.e.length} entri`);
    for (const e of m.e) assert.ok(PERISTIWA.has(e[0]), `peristiwa '${e[0]}' tidak ada di allow-list server`);
    assert.match(m.v, /^[0-9a-z]{16,40}$/);
  }
  const [awal] = await isiBeacon(d);
  for (const k of ["perangkat", "layar", "viewport", "bahasa", "koneksi", "rujukan", "utm_sumber", "tampil", "tab"]) assert.ok(awal.e.some(e => e[0] === k) || k === "rujukan", `konteks ${k} tidak terkirim`);
});

/* ---------- fungsi murni server ---------- */
uji("klasifikasi UA: asisten AI, perayap AI, mesin pencari, bot lain, manusia", () => {
  const br = {bahasa: "id-ID", dest: "document"}, cf = {asn: 7713};
  const k = ua => klasifikasi(ua, cf, br);
  assert.deepEqual([k("Mozilla/5.0 ... ChatGPT-User/1.0; +https://openai.com/bot").jenis, k("ChatGPT-User/1.0").op], ["ai_jawab", "openai-user"]);
  assert.equal(k("Claude-User/1.0").nama, "Claude"); assert.equal(k("Perplexity-User/1.0").jenis, "ai_jawab");
  for (const ua of ["GPTBot/1.2", "OAI-SearchBot/1.0", "ClaudeBot/1.0", "PerplexityBot/1.0", "CCBot/2.0", "Bytespider", "Applebot-Extended/0.1"]) assert.equal(k(ua).jenis, "ai_crawl", ua);
  for (const ua of ["Googlebot/2.1", "bingbot/2.0", "Applebot/0.1", "DuckDuckBot/1.1"]) assert.equal(k(ua).jenis, "mesin_cari", ua);
  assert.equal(k("Applebot-Extended/0.1").nama, "Applebot-Extended", "Applebot-Extended bukan Applebot biasa");
  for (const ua of ["curl/8.4", "python-requests/2.31", "HeadlessChrome/120", "facebookexternalhit/1.1", ""]) assert.deepEqual(k(ua), {jenis: "tak", alasan: "bot lain"}, ua);
  assert.equal(k("Mozilla/5.0 (iPhone) Safari/604.1").jenis, "manusia");
  assert.equal(klasifikasi("Mozilla/5.0 Chrome/129", cf, {bahasa: "*"}).alasan, "tanpa tanda peramban");
  assert.equal(klasifikasi("Mozilla/5.0 Chrome/129", cf, {bahasa: "id", dest: "image"}).alasan, "tanpa tanda peramban");
});

uji("jaringan hosting: ASN/organisasi cloud tidak dihitung sebagai manusia", () => {
  for (const cf of [{asn: 16509}, {asn: 14061}, {asn: 24940}, {asn: 1, asOrganization: "Hetzner Online GmbH"}, {asn: 2, asOrganization: "Google Cloud"}])
    assert.equal(klasifikasi("Mozilla/5.0 Chrome/129", cf, {bahasa: "id"}).alasan, "jaringan hosting/cloud", JSON.stringify(cf));
  for (const cf of [{asn: 7713, asOrganization: "PT Telkom Indonesia"}, {asn: 23693, asOrganization: "PT. Telekomunikasi Selular"}, {}]) assert.equal(jaringanHosting(cf), false, JSON.stringify(cf));
});

uji("verifikasi IP perayap: CIDR IPv4/IPv6, ekstraksi dari daftar operator", () => {
  const d = ["20.171.206.0/24", "2a03:2880:f000::/36", "52.230.152.0/24"].map(cidrKe);
  assert.ok(dalamCidr("20.171.206.9", d)); assert.ok(dalamCidr("2a03:2880:f0ff::1", d)); assert.ok(dalamCidr("52.230.152.255", d));
  assert.ok(!dalamCidr("20.171.207.1", d), "di luar /24"); assert.ok(!dalamCidr("2a03:2880:e000::1", d), "di luar /36"); assert.ok(!dalamCidr("bukan-ip", d));
  assert.equal(cidrKe("1.2.3.4/33"), null); assert.equal(cidrKe("300.1.1.1/8"), null);
  const teks = JSON.stringify({creationTime: "2026", prefixes: [{ipv4Prefix: "66.249.64.0/27"}, {ipv6Prefix: "2001:4860:4801:10::/64"}, {ipv4Prefix: "66.249.64.0/27"}]});
  assert.deepEqual(ambilCidr(teks), ["66.249.64.0/27", "2001:4860:4801:10::/64"], "unik, v4 & v6");
});

uji("kanal & perangkat dari rujukan dan UA", () => {
  const k = (r, u) => kanal(r, "posko.lokal", u).kanal;
  assert.deepEqual([k(""), k("https://chatgpt.com/"), k("https://www.perplexity.ai/x"), k("https://l.facebook.com/"), k("https://wa.me/"), k("https://www.google.co.id/"), k("https://kompas.com/a"), k("https://posko.lokal/banjir/"), k("https://x.com", "wa")],
    ["Langsung", "Dari jawaban AI", "Dari jawaban AI", "Media sosial", "Media sosial", "Pencarian", "Rujukan", "Internal", "Kampanye"]);
  assert.equal(kanal("https://www.kompas.com/a", "posko.lokal").rujukan, "kompas.com");
  assert.deepEqual(["Mozilla/5.0 (iPhone)", "Mozilla/5.0 (Linux; Android 14) Mobile", "Mozilla/5.0 (Linux; Android 14; SM-X200)", "Mozilla/5.0 (iPad)", "Mozilla/5.0 (Windows NT 10.0)"].map(perangkat),
    ["Ponsel", "Ponsel", "Tablet", "Tablet", "Desktop"]);
});

uji("garam harian: sidik berubah saat garam diganti, tidak memuat IP", async () => {
  const a = await tamuHash("a".repeat(64), "36.80.1.2", "UA"), b = await tamuHash("b".repeat(64), "36.80.1.2", "UA");
  assert.match(a, /^[0-9a-f]{16}$/); assert.notEqual(a, b, "garam baru = sidik baru (hari berbeda tak bisa dihubungkan)");
  assert.equal(a, await tamuHash("a".repeat(64), "36.80.1.2", "UA"), "dalam satu hari stabil");
});

uji("matematika sampel: p turun bertahap, bobot 1/p, tulisan maksimal di bawah anggaran", () => {
  assert.deepEqual([0, 11999, 12000, 17999, 18000, 22000, 1e6].map(pSampel), [1, 1, .5, .5, .2, .05, .05]);
  assert.deepEqual([0, 29999, 30000, 36000, 40000].map(pHit), [1, 1, .5, .2, .05]);
  /* tulisan nyata bila ada N kiriman: simulasi berurutan */
  const tulis = (N, p) => { let w = 0; for (let i = 0; i < N; i++) w += p(w); return Math.round(w); };
  const analitik = tulis(100000, pSampel), publik = tulis(100000, pHit);
  assert.ok(analitik < 26000, `100 rb kiriman analitik -> ${analitik} tulisan`);
  assert.ok(publik < 44000, `100 rb hit HTML -> ${publik} tulisan`);
  assert.ok(analitik + publik * 1.66 < 100000, `total kasar (+ stat_tamu ≤ 0,66 per tampilan) ${Math.round(analitik + publik * 1.66)} harus < 100 rb`);
});
