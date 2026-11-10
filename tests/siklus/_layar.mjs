/* Bantuan uji layar Siklus: server statis kecil yang melayani public/ dengan CSP asli (src/bnpb.js) dan API palsu, lalu Chrome nyata lewat CDP (tests/bnpb/_peramban.mjs).
   Tanpa Chrome, pemanggil MELEWATI uji dengan pesan jelas. Halaman staf /siklus/* dilayani index.html; /siklus/kejadian/KJ-... dilayani index.html atau publik.html (opsi tamu). */
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";

export {bukaPeramban, cariChrome};
const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PUB = path.join(AKAR, "public");
const CSP = /export const CSP = "([^"]+)"/.exec(readFileSync(path.join(AKAR, "src/bnpb.js"), "utf8"))[1];
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2"};
export const KJ = "KJ-2026-9A2WGN3G";

/* api(metode, jalur, query, badan) -> [status, objek] atau null (404). tamu: halaman /siklus/kejadian/KJ-... memakai publik.html */
export async function sajikan(api, {tamu = false} = {}) {
  const catat = [], hilang = [];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"); let badan = "";
    req.on("data", d => { badan += d; });
    req.on("end", () => {
      if (u.pathname.startsWith("/api/")) {
        let j = null; try { j = badan ? JSON.parse(badan) : null; } catch (e) { /* bukan JSON */ }
        catat.push({metode: req.method, jalur: u.pathname, q: Object.fromEntries(u.searchParams), badan: j, xpb: req.headers["x-pb"]});
        const r = api(req.method, u.pathname, u.searchParams, j) ?? [404, {galat: "tidak ada"}];
        res.writeHead(r[0], {"content-type": TIPE[".json"]}); return res.end(JSON.stringify(r[1]));
      }
      let p = u.pathname;
      if (/^\/siklus(\/(kejadian|paparan))?(\/.*)?$/.test(p) && !/\.\w+$/.test(p)) p = tamu && /^\/siklus\/kejadian\/KJ-/.test(p) ? "/siklus/publik.html" : "/siklus/index.html";
      const f = path.join(PUB, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
      if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { hilang.push(u.pathname); res.writeHead(404); return res.end("tidak ada"); }
      res.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP, "cache-control": "no-store"}); res.end(readFileSync(f));
    });
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  return {url: `http://127.0.0.1:${srv.address().port}`, catat, hilang, tutup: () => new Promise(ok => srv.close(ok))};
}
/* galat konsol yang bukan karena jaringan keluar (font Google, ubin peta) tidak mengganggu uji */
export const galatNyata = T => T.galat().filter(g => !/googleapis|gstatic|openfreemap|ERR_(INTERNET|NAME|CONNECTION|BLOCKED)|Failed to load resource|dari satu pilihan/i.test(g));
