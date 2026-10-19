/* Ukur muatan awal halaman dengan Chrome headless (CDP, tanpa dependensi): tiap permintaan sampai jaringan diam. Jalur lokal
   dihitung ukuran GZIP isinya (diunduh ulang + zlib level 6; wrangler dev tidak memampatkan, Cloudflare memampatkan), luar =
   encodedDataLength apa adanya; dikelompokkan data / JS-CSS / HTML / luar (peta dasar, CDN).
   Pakai: for p in / /ringkasan /peta; do node tests/beban/ukur_muat.mjs http://127.0.0.1:8799 $p; done
   (satu jalur per proses lebih stabil)
   CHROME=/jalur/chrome bila bukan lokasi bawaan macOS. Diam = 4 dtk tanpa permintaan baru (maks 90 dtk). */
import {spawn, spawnSync} from "node:child_process";
import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {gzipSync} from "node:zlib";

const [asal, ...jalur] = process.argv.slice(2);
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tidur = ms => new Promise(r => setTimeout(r, ms));

async function ukur(url) {
  const profil = mkdtempSync(path.join(tmpdir(), "ukur-"));
  const port = 9300 + Math.floor(Math.random() * 600);
  const c = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, "--no-first-run", "--window-size=1366,900", "about:blank"], {stdio: "ignore"});
  let ws = null;
  for (let i = 0; i < 240 && !ws; i++) { await tidur(250); ws = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json()).then(j => j.webSocketDebuggerUrl).catch(() => null); }
  if (!ws) throw new Error("chrome tidak siap di port " + port);
  const sock = new WebSocket(ws); await new Promise(r => sock.onopen = r);
  let id = 0; const tunggu = new Map(), req = new Map(), selesai = []; let terakhir = Date.now(), sesi = null;
  sock.onmessage = e => { const m = JSON.parse(e.data);
    if (m.id && tunggu.has(m.id)) { tunggu.get(m.id)(m.result); tunggu.delete(m.id); }
    if (m.method === "Network.requestWillBeSent") { req.set(m.params.requestId, m.params.request.url); terakhir = Date.now(); }
    if (m.method === "Network.loadingFinished") { selesai.push([req.get(m.params.requestId), m.params.encodedDataLength]); terakhir = Date.now(); } };
  const kirim = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; tunggu.set(i, r); sock.send(JSON.stringify({id: i, method, params, ...(sessionId ? {sessionId} : {})})); });
  const {targetId} = await kirim("Target.createTarget", {url: "about:blank"});
  sesi = (await kirim("Target.attachToTarget", {targetId, flatten: true})).sessionId;
  await kirim("Network.enable", {}, sesi); await kirim("Network.setCacheDisabled", {cacheDisabled: true}, sesi);
  const t0 = Date.now(); terakhir = t0;
  await kirim("Page.navigate", {url}, sesi);
  while (Date.now() - terakhir < 4000 && Date.now() - t0 < 90e3) await tidur(250);
  sock.close(); c.kill(); spawnSync("pkill", ["-f", profil]); await tidur(1500);   // helper Chrome ikut dimatikan
  try { rmSync(profil, {recursive: true, force: true}); } catch (e) {}
  const g = {data: 0, "js/css": 0, html: 0, luar: 0}, besar = [];
  for (let [u, n] of selesai) { if (!u || u.startsWith("data:")) continue; const x = new URL(u), lokal = x.origin === new URL(asal).origin;
    if (lokal) n = gzipSync(Buffer.from(await (await fetch(u)).arrayBuffer()), {level: 6}).length;
    const k = !lokal ? "luar" : /\.json$/.test(x.pathname) ? "data" : /\.(js|css)$/.test(x.pathname) ? "js/css" : /^\/api\//.test(x.pathname) ? "data" : "html";
    g[k] += n; if (lokal) besar.push([x.pathname, n]); }
  besar.sort((a, b) => b[1] - a[1]);
  return {g, total: Object.values(g).reduce((a, b) => a + b, 0), lokal: g.data + g["js/css"] + g.html, n: selesai.length, besar: besar.slice(0, 12)};
}

/* Plafon muatan lokal (KB gzip) per rute utama, diukur 19 Okt 2026 lewat wrangler dev --local, lalu diberi ruang ~15 %.
   Terukur: gempa 418, cuaca 597, udara 618, gunungapi 656 (provinsi.json terunduh dua kali), kekeringan 480, banjir 1326, karhutla 2836.
   Lewat plafon = exit 1: data/skrip baru memberatkan layar ponsel; kecilkan dulu, jangan naikkan angka ini untuk meloloskan. */
const PLAFON_KB = {"/": 3300, "/banjir/": 1550, "/gempa/": 480, "/cuaca/": 690, "/udara/": 710, "/gunungapi/": 760, "/kekeringan/": 550};
let lewat = 0;
const kb = n => (n / 1024).toFixed(0) + " KB";
for (const j of jalur) {
  const r = await ukur(asal + j);
  console.log(`\n${j}: lokal ${kb(r.lokal)} (data ${kb(r.g.data)}, js/css ${kb(r.g["js/css"])}, html ${kb(r.g.html)}) + luar ${kb(r.g.luar)}; ${r.n} permintaan`);
  for (const [p, n] of r.besar) console.log(`   ${kb(n).padStart(8)}  ${p}`);
  const batas = PLAFON_KB[j];
  if (batas && r.lokal / 1024 > batas) { lewat++; console.log(`   MELEBIHI PLAFON ${batas} KB: muatan awal ${j} terlalu berat; kecilkan data/skrip, jangan naikkan plafon`); }
}
process.exitCode = lewat ? 1 : 0;
