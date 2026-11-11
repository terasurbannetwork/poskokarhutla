/* Server tinjau lokal (pemilik 11 Nov 2026: "ke depan gw mau review di lokal", tanpa menunggu push dan terbit GitHub).
   http://localhost:8800 = KODE layar dari folder kerja ini (HTML, JS, CSS, gambar, JSON non-data) + DATA, API, dan LOGIN dari produksi
   (centurisk97.id). Jadi perubahan layar terlihat dengan data asli begitu berkas disimpan; cukup muat ulang peramban.
   - Halaman HTML (HTML_RUTE worker atau *.html): produksi tetap ditanya dulu (gerbang login, alih ke /admin/masuk, atribut <html>
     per sesi), lalu isinya diganti berkas lokal dengan tag <html> dari produksi.
   - /api/*, /admin/masuk, /data/** dan semua yang tidak ada di folder kerja: diteruskan ke produksi. Cookie dibuang atribut
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

export async function buatServer({hulu = "https://centurisk97.id", akar = AKAR, rute = null} = {}) {
  const publik = path.join(akar, "public");
  if (!rute) { try { rute = (await import(pathToFileURL(path.join(akar, "src/worker.js")).href)).HTML_RUTE; } catch { rute = []; } }
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
      const htmlLokal = r.ok && (r.headers.get("content-type") || "").includes("text/html") &&
        (ruteHtml ? await berkas(publik, ruteHtml[1]) : jalur.endsWith(".html") && await berkas(publik, jalur));
      if (htmlLokal) {
        const tagHulu = /<html[^>]*>/i.exec(isi.toString("utf8"))?.[0];
        let h = await fs.readFile(htmlLokal, "utf8");
        if (tagHulu) h = h.replace(/<html[^>]*>/i, tagHulu);
        isi = Buffer.from(h); keluar["cache-control"] = "no-store"; keluar["x-tinjau"] = "lokal";
      }
      res.writeHead(r.status, keluar);
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
