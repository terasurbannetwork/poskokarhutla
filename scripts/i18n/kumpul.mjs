/* Crawl headless semua tab karhutla, banjir, gempa, cuaca, udara, gunungapi & kekeringan (+ Tentang, Privasi, Statistik) dalam ID dan EN, lalu laporkan kebocoran DUA ARAH:
     - ID mode: teks yang memuat kata Inggris ("oil palm", "Score", "Today")         -> laporan.id_berisi_en
     - EN mode: teks yang masih memuat kata Indonesia (belum/setengah diterjemahkan)  -> laporan.en_berisi_id (+ laporan.hilang untuk kamus)
     - kedua mode: kalimat campur (kata ID dan EN dalam satu simpul teks)            -> laporan.campur
   Tiap tab juga dijelajahi: tombol/baris yang membuka dialog diklik satu per jenis (popup Insight, Berita, Dampak, Posko, Operasi, Ringkasan…),
   dialog yang terbuka direkam sebagai "tab/dlg:…", lalu tab direkam ulang sesudah semua klik ("tab/klik": hasil simulasi, rincian terbuka).
   Pakai:  node scripts/i18n/kumpul.mjs [--lebar 1440,390] [--hanya karhutla|banjir|gempa|cuaca|udara|gunungapi|kekeringan|tentang|privasi|statistik] [--bahasa id|en] [--tab peta,insight]
                                        [--tanpa-klik] [--dump] [--keluar berkas.json]
   Pengelompok kata ada di kelas.mjs (node scripts/i18n/kelas.mjs = cek cepat); skor.mjs menilai ulang keluaran --dump tanpa crawl ulang.
   (lintasan bisa dijalankan paralel per halaman/lebar/bahasa dengan --keluar berbeda, lalu digabung dengan scripts/i18n/gabung.mjs)
   Butuh playwright (PW=/jalur/ke/node_modules/playwright, atau terpasang di cache npx). Server statis untuk public/ dibuat sendiri. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";

const T0 = Date.now();
const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUB = path.join(AKAR, "public");
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const LEBAR = arg("lebar", "1440,390").split(",").map(Number);
const DUMP = process.argv.includes("--dump"), HANYA = arg("hanya", ""), TAB_SAJA = arg("tab", ""), BAHASA = arg("bahasa", "id,en").split(","), KLIK = !process.argv.includes("--tanpa-klik");

import {kelas} from "./kelas.mjs";

function cariPlaywright() {
  const calon = [process.env.PW, "playwright"];
  const npx = path.join(process.env.HOME, ".npm/_npx");
  if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) calon.push(path.join(npx, d, "node_modules/playwright"));
  const req = createRequire(import.meta.url);
  for (const c of calon) { if (!c) continue; try { return req(c); } catch (e) {} }
  throw new Error("playwright tidak ditemukan; set PW=/jalur/node_modules/playwright");
}
const {chromium} = cariPlaywright();

/* ---------- server statis: path tanpa titik -> index.html terdekat (meniru worker); /statistik dirender dari src/admin_halaman.js */
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".geojson": "application/json", ".pbf": "application/x-protobuf"};
const {halamanPublik} = await import(pathToFileURL(path.join(AKAR, "src/admin_halaman.js")));
const HTML_STAT = await halamanPublik().text();
/* /api/publik: contoh tetap (bentuk sama dengan produksi) supaya halaman statistik punya isi untuk diuji */
const PUBLIK = arg("publik", "") && fs.existsSync(arg("publik")) ? fs.readFileSync(arg("publik"), "utf8") : JSON.stringify({kini: Date.now(), rentang: "7h", hari: "2026-10-15", online: 3,
  buka: [["/", 2], ["/peta", 1]], tujuh: {tampilan: 267, orang: 154, ai_jawab: 5, ai_crawl: 2, mesin_cari: 1, sampel: 1}, sejak: {tampilan: 267, orang: 154, ai_jawab: 5, ai_crawl: 2, mesin_cari: 1, sampel: 1},
  mulai: "2026-10-14", seri: [{tgl: "2026-10-14", tampilan: 183, orang: 103, ai_jawab: 5, ai_crawl: 0, mesin_cari: 0}, {tgl: "2026-10-15", tampilan: 84, orang: 51, ai_jawab: 0, ai_crawl: 2, mesin_cari: 1}],
  per_jam: null, dim: {ai_agen: [["ChatGPT|terverifikasi", 3]], perayap: [["ai|GPTBot|terverifikasi", 2]], kanal: [["Langsung", 120], ["Dari jawaban AI", 4]], halaman: [["/", 150], ["/peta", 40]], negara: [["ID", 140]], perangkat: [["Ponsel", 90]]}});
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (p === "/api/publik") { r.writeHead(200, {"content-type": "application/json"}); return r.end(PUBLIK); }
  if (p.startsWith("/api/")) { r.writeHead(404, {"content-type": "application/json"}); return r.end("{}"); }
  if (p === "/statistik") { r.writeHead(200, {"content-type": TIPE[".html"]}); return r.end(HTML_STAT); }
  let f = path.join(PUB, p);
  if (!f.startsWith(PUB)) { r.writeHead(403); return r.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) f = p.startsWith("/banjir") ? path.join(PUB, "banjir/index.html") : path.extname(p) ? null : path.join(PUB, "index.html");
  if (!f || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(r);
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const ASAL = "http://127.0.0.1:" + server.address().port;

/* ---------- di halaman: kumpulkan teks terlihat (sama seperti LEWATI di i18n.js) */
const KUMPUL = () => {
  const LEWATI = "script,style,noscript,code,pre,textarea,[data-no-i18n],[translate=no],.maplibregl-ctrl-attrib,a[href^='http'][target=_blank],.lw-teks,.lw-k-teks";
  const CHROME = "h1,h2,h3,h4,h5,button,th,label,summary,legend,caption,.ex-ey,.lbl,[role=tab],nav a";
  const tab = document.querySelector(".page.on");
  /* header, tab aktif, dialog terbuka, dan elemen lepas di body (spanduk persetujuan, kaki, lembar bagikan); halaman tanpa tab: seluruh body */
  const akar = tab ? [document.querySelector("header"), tab, ...document.querySelectorAll("dialog[open]"),
    ...[...document.body.children].filter(e => !/^(MAIN|HEADER|SCRIPT|DIALOG|STYLE|TEMPLATE)$/.test(e.tagName) && !e.querySelector(".page"))].filter(Boolean) : [document.body];
  akar.forEach(a => a.querySelectorAll("details").forEach(d => { if (!d.closest(".bencana,.lainnya")) d.open = true; }));
  const hasil = [];
  for (const a of akar) {
    const w = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement, t = n.data.trim();
      if (!t || !/\p{L}{2}/u.test(t) || el.closest(LEWATI) || !el.checkVisibility() || (tab && el.closest(".page") && el.closest(".page") !== tab)) continue;
      hasil.push([t, !!el.closest(CHROME)]);
    }
    a.querySelectorAll("[title],[aria-label],[placeholder],[data-tip]").forEach(el => { if (el.closest(LEWATI) || (tab && el.closest(".page") && el.closest(".page") !== tab)) return;
      for (const at of ["title", "aria-label", "placeholder", "data-tip"]) { let v = el.getAttribute(at); if (!v) continue;
        /* tooltip HTML: tiap simpul teks sendiri-sendiri, sama seperti penerjemah memprosesnya */
        const xs = at === "data-tip" && /[<&]/.test(v) ? (() => { const tp = document.createElement("template"); tp.innerHTML = v; const o = [], w = document.createTreeWalker(tp.content, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) o.push(n.data); return o; })() : [v];
        for (let x of xs) { x = x.trim(); if (/\p{L}{2}/u.test(x)) hasil.push([x, false]); } } });
  }
  return hasil;
};
/* kandidat pembuka dialog di tab aktif: satu elemen per "tanda tangan" (tag + kelas + nama data-*) */
const CALON = maks => {
  const tab = document.querySelector(".page.on"); if (!tab) return [];
  const tanda = el => el.tagName + "." + [...el.classList].sort().join(".") + "[" + Object.keys(el.dataset).sort().join(",") + "]";
  const lihat = new Set(), out = [];
  for (const el of tab.querySelectorAll("button,[role=button],tr[tabindex],tr[data-kom],tr[data-kl],tr[data-pp],[data-kom],[data-ex],[data-buka],[data-rinci]")) {
    if (el.closest("a[href],.bhs,[data-no-i18n]") || el.disabled || !el.checkVisibility()) continue;
    const s = tanda(el); if (lihat.has(s)) continue; lihat.add(s); out.push(el); if (out.length >= maks) break;
  }
  window.__calon = out; return out.map(tanda);
};

const browser = await chromium.launch();
const laporan = {dibuat: new Date().toISOString(), hilang: {}, semua_hilang: {}, id_berisi_en: {}, en_berisi_id: {}, campur: {}, tab: {}, galat: {}};
const HALAMAN = [
  {nama: "karhutla", url: "/", ekstra: {posko: ["posko", "sarana", "operasi", "keputusan"]}},
  {nama: "banjir", url: "/banjir/"},
  {nama: "gempa", url: "/gempa/"},
  {nama: "cuaca", url: "/cuaca/"},
  {nama: "udara", url: "/udara/"},
  {nama: "gunungapi", url: "/gunungapi/"},
  {nama: "kekeringan", url: "/kekeringan/"},
  {nama: "tentang", url: "/tentang.html", polos: true},
  {nama: "privasi", url: "/privasi.html", polos: true},
  {nama: "statistik", url: "/statistik", polos: true},
].filter(h => !HANYA || HANYA.split(",").includes(h.nama));

for (const h of HALAMAN) for (const lebar of LEBAR) for (const bhs of BAHASA) {
  const ctx = await browser.newContext({viewport: {width: lebar, height: lebar > 800 ? 900 : 844}, locale: "en-US"});
  const pg = await ctx.newPage(); const galat = [];
  /* hanya teks yang diuji: ubin peta, citra, dan huruf dari luar ditolak (permintaan menggantung ke luar membuat crawl macet bermenit-menit) */
  await pg.route(u => !u.href.startsWith(ASAL) && !/^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//.test(u.href), r => r.abort());
  /* klik penjelajah tidak boleh membuka jendela, mencetak, atau pindah halaman */
  await pg.addInitScript(() => { window.open = () => null; window.print = () => {};
    document.addEventListener("click", e => { const a = e.target.closest?.("a[href]"); if (a && window.__jelajah) e.preventDefault(); }, true);
    try { navigator.share = undefined; } catch (e) {} });
  pg.on("pageerror", e => galat.push("pageerror: " + e.message));
  pg.on("console", m => { if (m.type() === "error") galat.push(m.text().slice(0, 200)); });
  pg.on("dialog", d => d.dismiss().catch(() => {}));
  try { await pg.goto(ASAL + h.url + (h.url.includes("?") ? "&" : "?") + "lang=" + bhs, {waitUntil: "domcontentloaded", timeout: 60000}); }
  catch (e) { laporan.galat[`${h.nama} ${lebar} ${bhs}`] = {galat: ["goto: " + e.message.slice(0, 120)]}; await ctx.close(); tulis(); continue; }
  console.error(`${h.nama} ${lebar} ${bhs}`);
  if (h.polos) {
    await pg.waitForTimeout(3000);
    await rekam(pg, h, lebar, bhs, "halaman");
    laporan.galat[`${h.nama} ${lebar} ${bhs}`] = {galat: [...new Set(galat)]};
    await ctx.close(); tulis(); continue;
  }
  await pg.waitForFunction(() => typeof bukaTab === "function", null, {timeout: 30000});
  await pg.waitForTimeout(4000);
  await rekam(pg, h, lebar, bhs, "awal");   // spanduk persetujuan + tab pertama seperti dilihat pengunjung baru
  await pg.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
  const tabs = await pg.evaluate(() => (typeof TABS !== "undefined" ? TABS : []).map(t => t[0]));
  /* peta paling akhir: begitu peta tampil, MapLibre (WebGL perangkat lunak di headless) membuat tiap langkah sesudahnya jauh lebih lambat */
  for (const tab of tabs.filter(t => t !== "tentang" && (!TAB_SAJA || TAB_SAJA.split(",").includes(t))).sort((a, b) => (a === "peta") - (b === "peta"))) {
    const subs = h.ekstra?.[tab] || [null];
    for (const sub of subs) {
      console.error("  >", tab, sub || "", ((Date.now() - T0) / 1000).toFixed(1));
      await pg.evaluate(([t, s]) => { if (s) S.poskoSub = s; bukaTab(t); }, [tab, sub]);
      await pg.waitForTimeout(tab === "sim" || tab === "simulasi" || tab === "metode" || tab === "insight" ? 3500 : 1800);
      const kunci = sub && sub !== tab ? tab + "/" + sub : tab;
      await rekam(pg, h, lebar, bhs, kunci);
      if (KLIK && tab !== "peta") {
        await jelajah(pg, h, lebar, bhs, kunci, tab, sub);
        /* klik penjelajah bisa meninggalkan keadaan (exhibit diperbesar, panel terbuka) yang ikut terlihat di tab berikutnya: muat ulang */
        await pg.reload({waitUntil: "domcontentloaded"}).catch(() => {}); await pg.waitForFunction(() => typeof bukaTab === "function", null, {timeout: 30000}).catch(() => {}); await pg.waitForTimeout(2500);
      }
    }
  }
  /* laci kompleks (hanya karhutla) */
  if (h.nama === "karhutla" && (!TAB_SAJA || TAB_SAJA.includes("peta"))) {
    const ada = await pg.evaluate(async () => { bukaTab("peta"); await new Promise(r => setTimeout(r, 800)); const f = S.kluster?.features?.[0]; if (!f) return false; Laci.buka(f.properties.id); return true; }).catch(e => (galat.push("laci: " + e.message), false));
    if (ada) { await pg.waitForTimeout(1500); await rekam(pg, h, lebar, bhs, "laci"); await pg.evaluate(() => document.querySelector("#dlgLaci")?.open && document.querySelector("#dlgLaci").close()); }
  }
  /* uji tombol: klik bahasa lain, pastikan html lang & teks tab berganti tanpa galat */
  const lain = bhs === "id" ? "en" : "id";
  await pg.evaluate(() => bukaTab("insight")).catch(() => {});
  await pg.waitForTimeout(1500);
  const sebelum = await pg.evaluate(() => document.querySelector("#tabs")?.innerText);
  await pg.evaluate(b => document.querySelector(`.bhs button[data-b="${b}"]`).click(), lain);   // klik lewat DOM: klik mouse playwright bisa tertahan WebGL peta
  await pg.waitForTimeout(2500);
  const sesudah = await pg.evaluate(() => [document.documentElement.lang, document.querySelector("#tabs")?.innerText, location.search]);
  if (bhs === "en") for (const x of await pg.evaluate(() => [...(window.T?.hilang?.keys() || [])].map(s => T.kunci(s)))) (laporan.semua_hilang[x] ||= 0), laporan.semua_hilang[x]++;
  laporan.galat[`${h.nama} ${lebar} ${bhs}`] = {galat: [...new Set(galat)], toggle: {lang: sesudah[0], berubah: sebelum !== sesudah[1], url: sesudah[2]}};
  await ctx.close();
  tulis();   // tiap lintasan langsung ditulis: crawl panjang yang gagal di tengah tidak menghapus hasil sebelumnya
}
function tulis() { fs.writeFileSync(arg("keluar", path.join(AKAR, "scripts/i18n/laporan.json")), JSON.stringify(laporan, (k, v) => v instanceof Set ? [...v] : v, 1)); }
await browser.close(); server.close();

/* klik tiap jenis tombol/baris di tab; dialog yang terbuka direkam lalu ditutup; tab yang berpindah dikembalikan */
async function jelajah(pg, h, lebar, bhs, kunci, tab, sub) {
  const tanda = await pg.evaluate(CALON, 30).catch(() => []);
  let ada = 0;
  for (let i = 0; i < tanda.length; i++) {
    const r = await pg.evaluate(async i => { window.__jelajah = 1; const el = window.__calon[i]; if (!el?.isConnected || !el.checkVisibility()) return null;
      const tab0 = document.querySelector(".page.on")?.id, d0 = new Set(document.querySelectorAll("dialog[open]"));
      try { el.click(); } catch (e) { return null; }
      await new Promise(r => setTimeout(r, 900));
      const baru = [...document.querySelectorAll("dialog[open]")].filter(d => !d0.has(d));
      return {dlg: baru.length > 0, pindah: document.querySelector(".page.on")?.id !== tab0}; }, i).catch(() => null);
    if (!r) continue;
    if (r.dlg) { await pg.waitForTimeout(700); await rekam(pg, h, lebar, bhs, `${kunci}/dlg:${tanda[i].replace(/\[\]$/, "")}`); ada++; }
    await pg.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close())).catch(() => {});
    if (r.pindah) { await pg.evaluate(([t, s]) => { if (s) S.poskoSub = s; bukaTab(t); }, [tab, sub]); await pg.waitForTimeout(1200); await pg.evaluate(CALON, 30).catch(() => []); }
  }
  await pg.waitForTimeout(800);
  await rekam(pg, h, lebar, bhs, kunci + "/klik");
  console.error(`    ${tanda.length} jenis klik, ${ada} dialog`);
}

async function rekam(pg, h, lebar, bhs, tab) {
  const isi = await pg.evaluate(KUMPUL).catch(() => []);
  const k = `${h.nama}/${tab}`, L = laporan.tab[k] ||= {};
  const unik = new Map(isi.map(([t, c]) => [t.replace(/\s+/g, " "), c]));
  const n = unik.size, nc = [...unik.values()].filter(Boolean).length;
  const kls = [...unik.keys()].map(t => [t, kelas(t)]);
  const bocor = kls.filter(([, c]) => bhs === "id" ? c.en > 0 : c.id > 0), campur = kls.filter(([, c]) => c.id > 0 && c.en > 0);
  const rec = {teks: n, chrome: nc, bocor: bocor.length, campur: campur.length, persen_bocor: n ? +(100 * bocor.length / n).toFixed(2) : 0, persen_campur: n ? +(100 * campur.length / n).toFixed(2) : 0};
  const simpan = (tujuan, xs) => { for (const [t] of xs) (tujuan[t] ||= new Set()).add(k); };
  simpan(bhs === "id" ? laporan.id_berisi_en : laporan.en_berisi_id, bocor);
  simpan(laporan.campur, campur.map(([t]) => [`[${bhs}] ${t}`]));
  if (bhs === "en") {
    /* kunci kamus: teks Indonesia yang gagal diterjemahkan (ada di T.hilang) */
    const gagal = new Set(await pg.evaluate(() => [...(window.T?.hilang?.keys() || [])]).catch(() => []));
    const buruk = bocor.filter(([t]) => gagal.has(t));
    const kunci = await pg.evaluate(xs => xs.map(s => window.T?.kunci ? T.kunci(s) : s), buruk.map(x => x[0])).catch(() => []);
    for (const key of kunci) (laporan.hilang[key] ||= new Set()).add(k);
    rec.hilang = buruk.length;
  }
  L[bhs + "_" + lebar] = rec;
  if (DUMP) (laporan.teks ||= {})[`${k} ${bhs} ${lebar}`] = [...unik.keys()];
  console.error(`  ${k} ${bhs} ${lebar}: ${n} teks, bocor ${rec.bocor} (${rec.persen_bocor}%), campur ${rec.campur}`);
}
tulis();
console.log("tab".padEnd(44), LEBAR.flatMap(l => BAHASA.map(b => `${b.toUpperCase()} ${l}: bocor/campur/teks`)).join("   "));
for (const [k, L] of Object.entries(laporan.tab)) console.log(k.slice(0, 43).padEnd(44), LEBAR.flatMap(l => BAHASA.map(b => { const x = L[b + "_" + l];
  return x ? `${String(x.bocor).padStart(4)}/${String(x.campur).padStart(3)}/${String(x.teks).padStart(5)} ${x.persen_bocor > 1 ? "!" : " "}`.padEnd(24) : "-".padEnd(24); })).join("   "));
console.log("\nID berisi EN:", Object.keys(laporan.id_berisi_en).length, " EN berisi ID:", Object.keys(laporan.en_berisi_id).length, " campur:", Object.keys(laporan.campur).length, " kunci hilang:", Object.keys(laporan.hilang).length);
for (const [k, g] of Object.entries(laporan.galat)) console.log(k.padEnd(22), "galat:", g.galat.length, g.toggle ? "toggle: " + JSON.stringify(g.toggle) : "", g.galat.slice(0, 4).join(" | "));
