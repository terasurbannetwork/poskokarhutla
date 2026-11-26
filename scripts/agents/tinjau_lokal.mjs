/* Server tinjau lokal (pemilik 11 Nov 2026: "ke depan gw mau review di lokal", tanpa menunggu push dan terbit GitHub).
   http://localhost:8800 = KODE layar dari folder kerja ini (HTML, JS, CSS, gambar, JSON non-data) + DATA, API, dan LOGIN dari produksi
   (centurisk97.id). Jadi perubahan layar terlihat dengan data asli begitu berkas disimpan; cukup muat ulang peramban.
   - Halaman HTML (HTML_RUTE worker atau *.html): produksi tetap ditanya dulu (gerbang login, alih ke /masuk, atribut <html>
     per sesi), lalu isinya diganti berkas lokal dengan tag <html> dari produksi.
   - /api/*, POST /masuk dan /admin/masuk, /data/** dan semua yang tidak ada di folder kerja: diteruskan ke produksi. Cookie dibuang atribut
     Secure/Domain-nya supaya menempel di localhost; Location produksi ditulis ulang ke localhost.
   PERHATIAN: tulisan (POST/PUT/DELETE) mengenai PRODUKSI, sama seperti memakai situsnya langsung.
   Jalan terus lewat launchd id.centurisk97.tinjau-lokal (scripts/agents/tinjau_lokal.plist; pasang: npm run tinjau:pasang).
   Manual: node scripts/agents/tinjau_lokal.mjs [port]. Uji: tests/agen/gerbang-tinjau-lokal.test.mjs. */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const JENIS = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json"};
const BUANG = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "strict-transport-security", "alt-svc"]);

async function berkas(publik, jalur) {
  const p = path.join(publik, decodeURIComponent(jalur));
  if (!p.startsWith(publik + path.sep)) return null;   // tolak ../
  try { const s = await fs.stat(p); return s.isFile() ? p : null; } catch { return null; }
}
/* jalur /data/ di mana pun = keluaran pipeline: selalu produksi, salinan di folder kerja bisa basi */
const jalurData = j => /(^|\/)data\//.test(j);

/* /admin/biaya-bot dan /api/wa/biaya/ringkas sebelum Worker baru terbit. Admin dicek ke produksi lewat /admin/kunci-api dengan kuki peramban;
   harian dibaca dari produksi lewat GET /api/wa/biaya (kunci mesin dari scripts/wa/.env, hanya baca), rincian dari ~/.wa-bot/biaya-lokal.json mesin ini.
   Mengembalikan false bila produksi sudah punya rutenya (dilayani seperti biasa). */
async function biayaBotLokal(req, res, jalur, H, akar) {
  const sudah = await fetch(new URL(jalur, H), {headers: {cookie: req.headers.cookie || ""}, redirect: "manual"});
  if (sudah.status !== 404) return false;
  const adm = await fetch(new URL("/admin/kunci-api", H), {headers: {cookie: req.headers.cookie || ""}, redirect: "manual"});
  if (adm.status !== 200) {
    if (jalur.startsWith("/api/")) { res.writeHead(401, {"content-type": JENIS[".json"]}); res.end(JSON.stringify({galat: "hanya admin; masuk lagi"})); return true; }
    res.writeHead(303, {location: "/masuk?ke=" + encodeURIComponent(jalur)}); res.end(); return true;
  }
  if (jalur === "/admin/biaya-bot") {
    const {halamanBiayaBot} = await import(pathToFileURL(path.join(akar, "src/admin_halaman.js")).href);
    res.writeHead(200, {"content-type": JENIS[".html"], "cache-control": "no-store", "x-tinjau": "lokal-biaya-bot"}); res.end(halamanBiayaBot()); return true;
  }
  const env = Object.fromEntries((await fs.readFile(path.join(akar, "scripts/wa/.env"), "utf8").catch(() => "")).split("\n").map(b => /^([A-Z_]+)=(.*)$/.exec(b.trim())).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, "")]));
  const hariWib = t => new Date(t + 7 * 36e5).toISOString().slice(0, 10), kini = Date.now(), dari = hariWib(kini - 89 * 864e5);
  const tgl = Array.from({length: 90}, (_, i) => hariWib(kini - (89 - i) * 864e5));
  const harian = env.WA_MESIN ? (await Promise.all(tgl.map(async t => { try { const r = await fetch(new URL("/api/wa/biaya?tanggal=" + t, H), {headers: {authorization: "Bearer " + env.WA_MESIN}}); return {tanggal: t, usd_mikro: r.ok ? (await r.json()).usd_mikro || 0 : 0}; } catch { return {tanggal: t, usd_mikro: 0}; } }))).filter(x => x.usd_mikro > 0) : [];
  const Biaya = await import(pathToFileURL(path.join(akar, "scripts/wa/biaya.mjs")).href);
  const rumah = path.join(process.env.HOME || "", ".wa-bot");
  const rinci = await fs.stat(path.join(rumah, "biaya-lokal.json")).then(() => ({...Biaya.ringkas(rumah), diperbarui: kini}), () => null);
  res.writeHead(200, {"content-type": JENIS[".json"], "cache-control": "no-store", "x-tinjau": "lokal-biaya-bot"}); res.end(JSON.stringify({hari_ini: hariWib(kini), dari, harian, rinci})); return true;
}

export async function buatServer({hulu = "https://centurisk97.id", akar = AKAR, rute = null} = {}) {
  const publik = path.join(akar, "public");
  if (!rute) { try { const w = await import(pathToFileURL(path.join(akar, "src/worker.js")).href);
    /* halaman Ruang Koordinasi dilayani lewat jalur bersih BNPB_BERSIH (/sitrep, /bnpb/logbook, ...), bukan HTML_RUTE */
    /* halaman modul yang dilayani Worker modulnya sendiri (layaniKm, layaniSk, LogPal, SIPPA) */
    const MODUL = [["/kemitraan", "/kemitraan.html"], ["/kemitraan/masuk", "/kemitraan/masuk.html"], ["/kemitraan/daftar", "/kemitraan/daftar.html"], ["/kemitraan/buku", "/kemitraan/buku.html"], ["/kemitraan/panduan", "/kemitraan/panduan.html"], ["/siklus", "/siklus/index.html"], ["/instansi", "/instansi.html"], ["/instansi/logpal", "/logpal/index.html"], ["/instansi/data-bencana", "/bnpb/data-bencana.html"], ["/pipa", "/pipa/index.html"], ["/masuk", "/masuk.html"], ["/lapor", "/lapor/index.html"]];
    rute = [...w.HTML_RUTE, ...Object.entries(w.BNPB_BERSIH || {}).map(([k, j]) => [{test: p => p === j || p === j + "/"}, `/bnpb/${k}.html`]),
      ...MODUL.map(([j, f]) => [{test: p => p === j || p === j + "/"}, f]),
      [{test: p => /^\/siklus\/[a-z-]+\/?$/.test(p)}, "/siklus/index.html"],   // bagian Siklus satu ruas (/siklus/kejadian, /siklus/paparan, ...) = cangkang yang sama; /siklus/kejadian/KJ-... tetap hulu
      [{test: p => p === "/rumah-rusak" || p === "/rumah-rusak/"}, "/rumah_rusak.html"], [{test: p => p === "/meja" || p === "/meja/"}, "/bnpb/meja.html"],
      /* Ruang Unit (src/unit.js): pintu = unit/index.html, /bnpb/unit/<kode> = cangkang unit/unit.html; data /api/unit/* tetap dari hulu */
      [{test: p => p === "/bnpb/unit" || p === "/bnpb/unit/"}, "/bnpb/unit/index.html"], [{test: p => /^\/bnpb\/unit\/[a-z0-9-]+\/?$/.test(p)}, "/bnpb/unit/unit.html"],
      /* halaman /bnpb/<nama> yang dilayani Worker lewat halamanBnpbPublik (mis. /bnpb/inarisk): berkas public/bnpb/<nama>.html bila ada, selain itu HTML hulu */
      [{test: p => /^\/bnpb\/[a-z0-9-]+\/?$/.test(p)}, null, null, p => p.replace(/\/$/, "") + ".html"]]; } catch { rute = []; } }
  const H = new URL(hulu);
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://lokal"), jalur = url.pathname, asal = `http://${req.headers.host}`;
      const ruteHtml = req.method === "GET" && rute.find(([re]) => re.test(jalur));
      const lokal = req.method === "GET" && !jalur.startsWith("/api/") && !jalurData(jalur) && !ruteHtml && await berkas(publik, jalur);
      if (lokal) {
        res.writeHead(200, {"content-type": JENIS[path.extname(lokal).toLowerCase()] || "application/octet-stream", "cache-control": "no-store"});
        return res.end(await fs.readFile(lokal));
      }
      /* Pemantau biaya bot WA (/admin/biaya-bot) sebelum rutenya terbit: hanya bila produksi belum punya rutenya */
      if (req.method === "GET" && (jalur === "/admin/biaya-bot" || jalur === "/api/wa/biaya/ringkas") && await biayaBotLokal(req, res, jalur, H, akar)) return;
      /* Lapor Bencana AI (data/kajian-bnpb/lapor-ai) sebelum rutenya terbit: /api/lapor/* dijawab mesin lokal, TIDAK diteruskan ke produksi */
      if (jalur.startsWith("/api/lapor/")) { const {tanganiLapor} = await import(pathToFileURL(path.join(akar, "scripts/lapor/lokal.mjs")).href); if (await tanganiLapor(req, res, url)) return; }
      /* Cermin InaRISK (data/kajian-bnpb/inarisk) sebelum rutenya terbit: proksi src/inarisk.js dijalankan lokal ke InaRISK asli;
         D1 batas laju diganti tiruan yang selalu lolos (server ini hanya loopback) */
      if (jalur.startsWith("/api/inarisk/")) {
        const {RUTE_INARISK} = await import(pathToFileURL(path.join(akar, "src/inarisk.js")).href);
        const kunci = `${req.method} ${jalur.replace(/^(\/api\/inarisk\/(?:kegiatan|ubin))\/.+$/, "$1/:x")}`, fn = RUTE_INARISK[kunci];
        if (fn) {
          const badan = req.method === "POST" ? await new Promise(ok => { const b = []; req.on("data", c => b.push(c)); req.on("end", () => ok(Buffer.concat(b))); }) : undefined;
          const DB = {prepare: () => ({bind: () => ({first: async () => ({n: 0}), run: async () => ({})})})};
          const r = await fn({DB, IP_SALT: "lokal"}, new Request(new URL(req.url, "http://lokal"), {method: req.method, headers: req.headers, body: badan}), url);
          res.writeHead(r.status, Object.fromEntries(r.headers)); return res.end(Buffer.from(await r.arrayBuffer()));
        }
      }
      /* Dampak peringatan dini (data/kajian-bnpb/dampak-peringatan) sebelum rutenya terbit: rute publik src/dampak_peringatan.js
         dijalankan lokal, R2 diganti berkas keluaran pipeline di folder kerja (data/raw/dampak_peringatan, data/raw/prediksi/status.json) */
      if (req.method === "GET" && /^\/api\/dampak-peringatan\/(ringkas|status)$/.test(jalur)) {
        const {RUTE_DAMPAK_PERINGATAN} = await import(pathToFileURL(path.join(akar, "src/dampak_peringatan.js")).href);
        const fn = RUTE_DAMPAK_PERINGATAN[`GET ${jalur}`];
        if (fn) {
          const BERKAS = {"ringkas.json": "data/raw/dampak_peringatan/ringkas.json", "status.json": "data/raw/prediksi/status.json"};
          const MEDIA = {get: async k => { const f = BERKAS[k.replace(/^dampak_peringatan\//, "")]; if (!f) return null;
            try { const t = await fs.readFile(path.join(akar, f), "utf8"); return {text: async () => t, json: async () => JSON.parse(t), size: t.length}; } catch { return null; } }};
          const DB = {prepare: () => ({bind: () => ({first: async () => ({n: 0}), run: async () => ({}), all: async () => ({results: []})})})};
          globalThis.caches ??= {default: {match: async () => undefined, put: async () => {}}};
          const r = await fn({DB, MEDIA, IP_SALT: "lokal"}, new Request(new URL(req.url, "http://lokal")), url, {waitUntil() {}});
          res.writeHead(r.status, {...Object.fromEntries(r.headers), "cache-control": "no-store"}); return res.end(Buffer.from(await r.arrayBuffer()));
        }
      }
      const kepala = {};
      for (const [k, v] of Object.entries(req.headers)) if (!["host", "connection", "accept-encoding", "content-length"].includes(k)) kepala[k] = v;
      if (kepala.origin) kepala.origin = H.origin;
      if (kepala.referer) kepala.referer = kepala.referer.replace(asal, H.origin);
      const badan = ["GET", "HEAD"].includes(req.method) ? undefined : await new Promise(ok => { const b = []; req.on("data", c => b.push(c)); req.on("end", () => ok(Buffer.concat(b))); });
      const r = await fetch(new URL(req.url, H), {method: req.method, headers: kepala, body: badan, redirect: "manual"});
      const keluar = {};
      r.headers.forEach((v, k) => { if (!BUANG.has(k) && k !== "set-cookie" && k !== "location" && k !== "content-security-policy") keluar[k] = v; });
      const kuki = r.headers.getSetCookie().map(c => c.replace(/;\s*Secure/gi, "").replace(/;\s*Domain=[^;]*/gi, ""));
      if (kuki.length) keluar["set-cookie"] = kuki;
      const loc = r.headers.get("location"); if (loc) keluar.location = loc.replace(H.origin, asal);
      let isi = Buffer.from(await r.arrayBuffer());
      /* keluaran Peluang semai sebelum rutenya terbit (data/kajian-bnpb/semai-awan SA-08): hulu 404 -> data/raw/semai/keluar lokal */
      const semai = r.status === 404 && req.method === "GET" && /^\/api\/operasi\/semai\/berkas\/((?:arsip\/\d{10}\.json)|[a-z_]+(?:_\d{1,2})?\.(?:json|png))$/.exec(jalur);
      if (semai) {
        const f = path.join(akar, "data/raw/semai/keluar", semai[1]);
        try { const b = await fs.readFile(f); res.writeHead(200, {"content-type": JENIS[path.extname(f)], "cache-control": "no-store", "x-tinjau": "lokal-semai"}); return res.end(b); } catch { /* tidak ada: teruskan 404 hulu */ }
      }
      /* berkas /data/ baru yang belum terbit (hulu 404) dari folder kerja; yang sudah terbit tetap dari hulu */
      const dataBaru = r.status === 404 && req.method === "GET" && jalurData(jalur) && await berkas(publik, jalur);
      if (dataBaru) { res.writeHead(200, {"content-type": JENIS[path.extname(dataBaru).toLowerCase()] || "application/octet-stream", "cache-control": "no-store", "x-tinjau": "lokal-data-baru"}); return res.end(await fs.readFile(dataBaru)); }
      /* rute HTML baru yang belum terbit di produksi (hulu 404) tetap disajikan dari folder kerja */
      /* rute yang memetakan jalur ke berkas sendiri (elemen ke-4, mis. Docs bertingkat) dipakai seperti di Worker */
      const fileRute = ruteHtml && (ruteHtml[3] ? ruteHtml[3](jalur) : ruteHtml[1]);
      const baru = r.status === 404 && ruteHtml && await berkas(publik, fileRute);
      const htmlLokal = baru || (r.ok && (r.headers.get("content-type") || "").includes("text/html") &&
        (ruteHtml ? await berkas(publik, fileRute) : jalur.endsWith(".html") && await berkas(publik, jalur)));
      let status = r.status;
      if (baru) { status = 200; keluar["content-type"] = "text/html; charset=utf-8"; }
      if (htmlLokal) {
        const tagHulu = /<html[^>]*>/i.exec(isi.toString("utf8"))?.[0];
        let h = await fs.readFile(htmlLokal, "utf8");
        if (tagHulu) h = h.replace(/<html[^>]*>/i, tagHulu);
        isi = Buffer.from(h); keluar["cache-control"] = "no-store"; keluar["x-tinjau"] = "lokal";
      } else if (r.ok && jalur.startsWith("/admin") && (r.headers.get("content-type") || "").includes("text/html")) {
        /* halaman admin dirender Worker: sisipkan lapisan dashboard lokal supaya perubahan public/inti/dasbor.css terlihat sebelum deploy */
        let h = isi.toString("utf8");
        if (!h.includes("/inti/dasbor.css")) h = h.replace("</head>", '<link href="/inti/dasbor.css" rel="stylesheet">\n<script src="/inti/dasbor_admin.js" defer></script>\n</head>');
        /* tiru kerangka admin src/admin_halaman.js sebelum Worker baru terbit: satu menu = panel kiri Pusdalops, tanpa sub-nav grup (pemilik 26 Nov 2026) */
        if (h.includes('<header class="ad-top">') && !h.includes("/bnpb/menu_pusdalops.js")) h = h.replace(/<nav class="ad-sub"[\s\S]*?<\/nav>/, "")
          .replace("</header>", '</header><link href="/bnpb/menu_pusdalops.css" rel="stylesheet"><script src="/bnpb/menu_pusdalops.js"></script>');
        isi = Buffer.from(h); keluar["cache-control"] = "no-store";
      }
      /* tiru pasangKeluar src/worker.js: tombol Keluar di semua HTML sebelum Worker baru terbit (halaman tanpa sesi tidak dibedakan di sini) */
      if ((keluar["content-type"] || r.headers.get("content-type") || "").includes("text/html") && !/^\/(admin\/)?masuk\/?$/.test(jalur)) {
        const h = isi.toString("utf8");
        if (h.includes("</body>") && !h.includes("/inti/keluar.js")) { isi = Buffer.from(h.replace("</body>", '<script src="/inti/keluar.js?v=1" defer></script>\n</body>')); keluar["cache-control"] = "no-store"; }
      }
      res.writeHead(status, keluar);
      res.end(req.method === "HEAD" ? undefined : isi);
    } catch (e) {
      res.writeHead(502, {"content-type": "text/plain; charset=utf-8"}); res.end("tinjau lokal: " + e.message);
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = +(process.argv[2] || process.env.PORT || 8800);
  /* hanya loopback (IPv4 dan IPv6), tidak terbuka ke jaringan: server ini membawa cookie sesi produksi */
  for (const h of ["127.0.0.1", "::1"]) (await buatServer()).listen(port, h).on("error", e => { console.error(h, e.message); process.exit(1); });   // port bentrok: keluar, launchd KeepAlive mencoba ulang
  console.log(`tinjau lokal siap: http://localhost:${port} (kode dari ${AKAR}, data dari centurisk97.id)`);
}
