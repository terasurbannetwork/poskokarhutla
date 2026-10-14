/* Crawl headless semua tab karhutla & banjir dalam ID dan EN, lalu laporkan teks Indonesia yang masih terlihat di mode EN.
   Pakai:  node scripts/i18n/kumpul.mjs [--lebar 1440,390] [--hanya karhutla|banjir] [--tab peta,insight] [--keluar berkas.json]
   (lintasan bisa dijalankan paralel per halaman/lebar dengan --keluar berbeda; satu lintasan ± 10–20 menit karena WebGL peta di headless)
   Butuh playwright (PW=/jalur/ke/node_modules/playwright, atau terpasang di cache npx). Server statis untuk public/ dibuat sendiri.
   Keluaran: scripts/i18n/laporan.json (kunci yang hilang, persen per tab, galat konsol) + tabel ringkas di stdout. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const T0 = Date.now();
const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUB = path.join(AKAR, "public");
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const LEBAR = arg("lebar", "1440,390").split(",").map(Number);
const HANYA = arg("hanya", ""), TAB_SAJA = arg("tab", "");

function cariPlaywright() {
  const calon = [process.env.PW, "playwright"];
  const npx = path.join(process.env.HOME, ".npm/_npx");
  if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) calon.push(path.join(npx, d, "node_modules/playwright"));
  const req = createRequire(import.meta.url);
  for (const c of calon) { if (!c) continue; try { return req(c); } catch (e) {} }
  throw new Error("playwright tidak ditemukan; set PW=/jalur/node_modules/playwright");
}
const {chromium} = cariPlaywright();

/* ---------- server statis: path tanpa titik -> index.html terdekat (meniru worker) */
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".geojson": "application/json", ".pbf": "application/x-protobuf"};
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, "http://x").pathname);
  if (p.startsWith("/api/")) { r.writeHead(404, {"content-type": "application/json"}); return r.end("{}"); }
  let f = path.join(PUB, p);
  if (!f.startsWith(PUB)) { r.writeHead(403); return r.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) f = p.startsWith("/banjir") ? path.join(PUB, "banjir/index.html") : path.extname(p) ? null : path.join(PUB, "index.html");
  if (!f || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(r);
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const ASAL = "http://127.0.0.1:" + server.address().port;

/* ---------- di halaman: kumpulkan teks terlihat (sama seperti LEWATI di i18n.js) dan klasifikasikan */
const KUMPUL = () => {
  const LEWATI = "script,style,noscript,code,pre,textarea,[data-no-i18n],[translate=no],.maplibregl-ctrl-attrib,a[href^='http'][target=_blank],.lw-teks,.lw-k-teks";
  const CHROME = "h1,h2,h3,h4,h5,button,th,label,summary,legend,caption,.ex-ey,.lbl,[role=tab],nav a";
  const akar = [document.querySelector("header"), document.querySelector(".page.on"), ...document.querySelectorAll("dialog[open]")].filter(Boolean);
  akar.forEach(a => a.querySelectorAll("details").forEach(d => { if (!d.closest(".bencana,.lainnya")) d.open = true; }));
  const hasil = [];
  for (const a of akar) {
    const w = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement, t = n.data.trim();
      if (!t || !/\p{L}{2}/u.test(t) || el.closest(LEWATI) || !el.checkVisibility()) continue;
      hasil.push([t, !!el.closest(CHROME)]);
    }
    a.querySelectorAll("[title],[aria-label],[placeholder],[data-tip]").forEach(el => { if (el.closest(LEWATI)) return;
      for (const at of ["title", "aria-label", "placeholder", "data-tip"]) { let v = el.getAttribute(at); if (!v) continue;
        if (at === "data-tip") { const d = document.createElement("div"); d.innerHTML = v; v = d.textContent; }
        v = v.trim(); if (/\p{L}{2}/u.test(v)) hasil.push([v, false]); } });
  }
  return hasil;
};
/* "terlihat Indonesia": ada kata fungsi/kosakata UI Indonesia. Nama tempat (Kalimantan Tengah, Ogan Komering Ilir) tidak terhitung. */
const KATA = new Set(("dan yang di ke dari untuk dengan tidak ada ini itu atau pada oleh sebagai dalam akan bisa belum sudah per hari jam titik panas lahan hutan " +
  "tahun bulan minggu kebakaran wilayah kecamatan jumlah luas sumber lihat buka tutup unduh cari semua terbaru kemarin sekarang baru lama tinggi rendah sedang " +
  "siaga awas waspada peta berita dampak simulasi metode lapor warga laporan perkiraan orang regu kompleks api asap udara gambut sawit kawasan musim hujan kering " +
  "angin suhu kelembapan risiko bahaya naik turun dibanding sejak sampai hingga lebih kurang tanpa masih juga karena agar supaya jika bila saat tiap setiap seluruh " +
  "banjir longsor sungai prakiraan keputusan sarana memuat gagal pilih tampilkan sembunyikan rincian ringkasan pembaruan diperbarui terakhir puncak rata kenaikan " +
  "penurunan dibandingkan menit detik pekan tanggal tingkat kelas jenis nama nilai angka total selama terdekat jarak via darat penduduk jiwa terdampak rumah " +
  "sekolah kasus penderita perusahaan konsesi izin pemilik grup tanggung jawab tindakan disarankan teramati kenapa status lokasi cuaca riwayat tren peringkat " +
  "teratas wilayah kerja satelit citra lapisan legenda dasar gelap terang tema bagikan salin tautan disalin kirim pesan masukan tentang privasi menurut kata " +
  "kali lipat persen sekitar hanya paling banyak sedikit antara selain tetap terus mulai selesai belum ada data model pemodelan peluang kemungkinan prakiraan " +
  "aktif padam baru-baru sebaran penjalaran arah kecepatan meter hektare ha km jalan kanal parit sumur bor pompa air helikopter pesawat bom water bombing").split(" "));
const indo = t => { const k = t.toLowerCase().match(/\p{L}+/gu) || []; return k.some(w => KATA.has(w) && !["data", "status", "model", "total", "ha", "km", "per", "via", "water", "bombing", "api"].includes(w)) || k.filter(w => KATA.has(w)).length >= 2; };

const HALAMAN = [
  {nama: "karhutla", url: "/", ekstra: {posko: ["posko", "sarana", "operasi", "keputusan"]}},
  {nama: "banjir", url: "/banjir/"},
].filter(h => !HANYA || h.nama === HANYA);

const browser = await chromium.launch();
const laporan = {dibuat: new Date().toISOString(), hilang: {}, semua_hilang: {}, tab: {}, galat: {}};
for (const h of HALAMAN) for (const lebar of LEBAR) for (const bhs of ["id", "en"]) {
  const ctx = await browser.newContext({viewport: {width: lebar, height: lebar > 800 ? 900 : 844}, locale: "en-US"});
  const pg = await ctx.newPage(); const galat = [];
  /* hanya teks yang diuji: ubin peta, citra, dan huruf dari luar ditolak (permintaan menggantung ke luar membuat crawl macet bermenit-menit) */
  await pg.route(u => !u.href.startsWith(ASAL) && !/^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//.test(u.href), r => r.abort());
  pg.on("pageerror", e => galat.push("pageerror: " + e.message));
  pg.on("console", m => { if (m.type() === "error") galat.push(m.text().slice(0, 200)); });
  await pg.goto(ASAL + h.url + "?lang=" + bhs, {waitUntil: "domcontentloaded", timeout: 60000});
  await pg.waitForFunction(() => typeof bukaTab === "function", null, {timeout: 30000});
  await pg.waitForTimeout(4000);
  console.error(`${h.nama} ${lebar} ${bhs}`);
  const tabs = await pg.evaluate(() => (typeof TABS !== "undefined" ? TABS : []).map(t => t[0]));
  /* peta paling akhir: begitu peta tampil, MapLibre (WebGL perangkat lunak di headless) membuat tiap langkah sesudahnya jauh lebih lambat */
  for (const tab of tabs.filter(t => !TAB_SAJA || TAB_SAJA.split(",").includes(t)).sort((a, b) => (a === "peta") - (b === "peta"))) {
    const subs = h.ekstra?.[tab] || [null];
    for (const sub of subs) {
      console.error("  >", tab, sub || "", ((Date.now() - T0) / 1000).toFixed(1));
      await pg.evaluate(([t, s]) => { if (s) S.poskoSub = s; bukaTab(t); }, [tab, sub]);
      await pg.waitForTimeout(tab === "sim" || tab === "metode" || tab === "insight" ? 3500 : 1800);
      const kunci = sub && sub !== tab ? tab + "/" + sub : tab;
      await rekam(pg, h, lebar, bhs, kunci);
    }
  }
  /* laci kompleks + toggle ID->EN->ID pada tab aktif (hanya karhutla) */
  if (h.nama === "karhutla") {
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

async function rekam(pg, h, lebar, bhs, tab) {
  const isi = await pg.evaluate(KUMPUL);
  const k = `${h.nama}/${tab}`, L = laporan.tab[k] ||= {};
  const unik = new Map(isi.map(([t, c]) => [t, c]));
  const n = unik.size, nc = [...unik.values()].filter(Boolean).length;
  if (bhs === "id") { L["id_" + lebar] = {teks: n}; return; }
  /* belum diterjemahkan = penerjemah gagal (ada di T.hilang) DAN terlihat Indonesia; teks Inggris hasil terjemahan tidak ikut terhitung */
  const gagal = new Set(await pg.evaluate(() => [...(window.T?.hilang?.keys() || [])]));
  const buruk = [...unik].filter(([t]) => indo(t) && gagal.has(t.replace(/\s+/g, " "))), bc = buruk.filter(([, c]) => c);
  L["en_" + lebar] = {teks: n, indonesia: buruk.length, persen: n ? +(100 * (1 - buruk.length / n)).toFixed(1) : 100,
    chrome: nc, chrome_indonesia: bc.length, persen_chrome: nc ? +(100 * (1 - bc.length / nc)).toFixed(1) : 100};
  const kunci = await pg.evaluate(xs => xs.map(s => window.T?.kunci ? T.kunci(s) : s), buruk.map(x => x[0]));
  for (const key of kunci) (laporan.hilang[key] ||= new Set()).add(k);
  console.error(`  ${k} ${lebar}: ${L["en_" + lebar].persen}% / chrome ${L["en_" + lebar].persen_chrome}%`);
}
tulis();
console.log("tab".padEnd(26), LEBAR.map(l => `EN ${l}: semua% / chrome%`).join("   "));
for (const [k, L] of Object.entries(laporan.tab)) console.log(k.padEnd(26), LEBAR.map(l => L["en_" + l] ? `${String(L["en_" + l].persen).padStart(5)} / ${String(L["en_" + l].persen_chrome).padStart(5)}  (${L["en_" + l].indonesia} sisa)` : "-").join("   "));
console.log("\nkunci hilang:", Object.keys(laporan.hilang).length);
for (const [k, g] of Object.entries(laporan.galat)) console.log(k.padEnd(22), "galat:", g.galat.length, "toggle:", JSON.stringify(g.toggle), g.galat.slice(0, 4).join(" | "));
