// Ambil keterangan video TikTok per tagar publik lewat browser lokal (CDP) -> data/raw/medsos/tiktok/<YYYY-MM-DD>.json
// (data/raw tidak dilacak git). Pakai: node scripts/umum/tiktok.mjs [tagar ...]   env BROWSER_CDP (default http://127.0.0.1:9112)
// Tanpa login. Login/captcha/0 item dicatat per tagar; tidak ada upaya mengakali. Node bawaan saja (fetch, WebSocket).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CDP = (process.env.BROWSER_CDP || "http://127.0.0.1:9112").replace(/\/$/, "");
const TAGAR = process.argv.length > 2 ? process.argv.slice(2) : ["karhutla", "kabutasap", "kebakaranhutan", "kebakaranlahan"];
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

// Ekstraksi di dalam halaman. Keterangan = img[alt] sebelum " dibuat oleh "; id video dari tautan.
const EKSTRAK = `(() => [...document.querySelectorAll('[data-e2e="challenge-item"]')].map(e => {
  const a = e.querySelector('a[href*="/video/"]'); if (!a) return null;
  const m = a.href.match(/tiktok\\.com\\/@([^/]+)\\/video\\/(\\d+)/); if (!m) return null;
  const alt = (e.querySelector('img[alt]') || {}).alt || '';
  const i = alt.indexOf(' dibuat oleh ');
  return {id: m[2], akun: m[1], teks: (i >= 0 ? alt.slice(0, i) : alt).trim(), url: a.href.split('?')[0]};
}).filter(Boolean))()`;

async function ambilTagar(tagar) {
  const t = await (await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" })).json();
  let ws;
  try {
    ws = new WebSocket(t.webSocketDebuggerUrl);
    let n = 0; const tunggu = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && tunggu.has(m.id)) { tunggu.get(m.id)(m); tunggu.delete(m.id); } };
    await new Promise((ok, gagal) => { ws.onopen = ok; ws.onerror = () => gagal(new Error("websocket tab gagal")); });
    const kirim = (method, params = {}) => new Promise((ok) => { const i = ++n; tunggu.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
    const nilai = async (expr) => (await kirim("Runtime.evaluate", { returnByValue: true, expression: expr })).result?.result?.value;
    await kirim("Page.navigate", { url: `https://www.tiktok.com/tag/${encodeURIComponent(tagar)}` });
    let ada = 0;
    for (let i = 0; i < 20 && !ada; i++) { await tidur(1000); ada = await nilai(`document.querySelectorAll('[data-e2e="challenge-item"]').length`); }
    if (!ada) return { item: [], catatan: "0 item (login/captcha/halaman kosong), dilewati" };
    for (let i = 0; i < 2; i++) { await nilai("window.scrollTo(0, document.body.scrollHeight)"); await tidur(3000); }
    return { item: (await nilai(EKSTRAK)) || [], catatan: null };
  } finally {
    try { ws?.close(); } catch {}
    await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});  // tab selalu ditutup walau galat
  }
}

try { await (await fetch(`${CDP}/json/version`)).json(); }
catch { console.error(`Browser CDP tak terjangkau di ${CDP}. Jalankan browser dengan remote debugging atau set BROWSER_CDP.`); process.exit(2); }

const hasil = {}; const catatan = {};
for (let i = 0; i < TAGAR.length; i++) {
  const g = TAGAR[i];
  try { const r = await ambilTagar(g); hasil[g] = r.item; if (r.catatan) catatan[g] = r.catatan; }
  catch (e) { hasil[g] = []; catatan[g] = "galat: " + e.message; }
  console.error(`#${g}: ${hasil[g].length} item${catatan[g] ? " (" + catatan[g] + ")" : ""}`);
  // ponytail: jeda acak 20-40 s antar tagar supaya tidak tampak seperti perayap agresif dan tidak memicu pembatasan TikTok.
  if (i < TAGAR.length - 1) await tidur(20000 + Math.random() * 20000);
}
const tgl = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);  // hari WIB
const jalur = join(AKAR, "data/raw/medsos/tiktok", `${tgl}.json`);
mkdirSync(dirname(jalur), { recursive: true });
writeFileSync(jalur, JSON.stringify({ diambil: new Date().toISOString(), tagar: hasil, catatan }, null, 1));
console.error("ditulis", jalur);
if (!Object.values(hasil).some((x) => x.length)) process.exit(3);
