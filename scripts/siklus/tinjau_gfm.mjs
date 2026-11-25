/* Tinjau lokal kartu Genangan radar (GS-11) tanpa menyentuh produksi: melayani public/ dan menjawab /api/siklus/kaji* dari keluaran pipeline lokal
   data/raw/siklus/kaji/siklus (hasil genangan_kaji.py uji Sumatera 26 Nov 2025). Hanya 127.0.0.1; tidak ada data contoh di public/.
   Jalan: node scripts/siklus/tinjau_gfm.mjs [port=8801]  ->  http://localhost:8801/siklus/kaji  (atau langsung /siklus/kaji/e1e2e3e4e5e6e7e8) */
import http from "node:http";
import {readFileSync, existsSync, readdirSync, statSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUB = path.join(AKAR, "public"), SAJI = path.join(AKAR, "data/raw/siklus/kaji/siklus/saji");
const SID = "e1e2e3e4e5e6e7e8", KJ = "KJ-UJI-SUMATERA-20251126", PORT = Number(process.argv[2]) || 8801;
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".geojson": "application/json"};
const versi = readdirSync(path.join(SAJI, "kaji")).map(f => /_banjir_gfm_v(\d+)\.json$/.exec(f)?.[1]).filter(Boolean).map(Number).sort((a, b) => b - a)[0];
if (!versi) { console.error("Tidak ada keluaran banjir_gfm di " + SAJI); process.exit(1); }
const hasil = JSON.parse(readFileSync(path.join(SAJI, "kaji", `${KJ}_banjir_gfm_v${versi}.json`), "utf8"));
const baris = {id: SID, kejadian_id: KJ, model: "banjir_gfm", versi, status: "dihitung", masukan: null, galat_kalibrasi: null, yakin: hasil.yakin, ringkas: hasil.ringkas, dihitung: Date.now(), diubah: Date.now(), alasan_tarik: null};
const json = (res, k, o) => { res.writeHead(k, {"content-type": TIPE[".json"]}); res.end(JSON.stringify(o)); };

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), p = u.pathname;
  if (p === "/api/staf/saya") return json(res, 200, {staf: {peran: ["koordalops"]}});
  if (p === "/api/siklus/kejadian") return json(res, 200, {baris: [{id: KJ, jenis: "banjir", kab4: "1116", mulai: hasil.mulai, fase: "tanggap"}], berikut: null});
  if (p === "/api/siklus/kaji") return json(res, 200, {kejadian_id: KJ, baris: [baris]});
  if (p === `/api/siklus/kaji/${SID}`) return json(res, 200, {kaji: baris, kejadian: {id: KJ, jenis: "banjir", mulai: hasil.mulai, kab4: "1116", fase: "tanggap"}, hasil, hasil_status: "ada", hasil_selaras: true, meja: {catatan: "isian petugas BPBD", baris: []}});
  const b = new RegExp(`^/api/siklus/kaji/${SID}/berkas/(\\d{4}_(?:sel\\.geojson|(?:radar|asli|swir)_(?:pra|pasca)\\.png))$`).exec(p);
  if (b) { const f = path.join(SAJI, "kaji_berkas", KJ, "banjir_gfm", `v${versi}`, b[1]); return existsSync(f) ? (res.writeHead(200, {"content-type": TIPE[path.extname(f)]}), res.end(readFileSync(f))) : json(res, 404, {galat: "tidak ada"}); }
  if (p.startsWith("/api/")) return json(res, 404, {galat: "tidak ada"});
  const f = path.join(PUB, /^\/siklus(\/.*)?$/.test(p) && !/\.\w+$/.test(p) ? "siklus/index.html" : path.normalize(p));
  if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); return res.end("tidak ada"); }
  res.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "cache-control": "no-store"}); res.end(readFileSync(f));
}).listen(PORT, "127.0.0.1", () => console.log(`Tinjau genangan: http://localhost:${PORT}/siklus/kaji/${SID}  (versi ${versi}, data lokal ${KJ})`));
