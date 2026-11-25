/* Halaman nyata situs (dipakai gerbang tests/agen/gerbang-peta-situs.test.mjs dan tests/warga/peta_situs.test.mjs): satu sumber, tidak disalin.
   nyata = HTML_RUTE + kunci GET di src (berkas js) yang menyajikan HTML + berkas html di public yang bukan sasaran alias. */
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join} from "node:path";
import {HTML_RUTE, BNPB_BERSIH} from "../../../src/worker.js";

export const AKAR = new URL("../../../", import.meta.url).pathname;
export const norm = r => r === "/" ? r : r.replace(/\/+$/, "");

/* alias yang bukan halaman sendiri: kunci HTML_RUTE atau berkas yang disajikan lewat rute lain */
const ALIAS = {"/tentang-halaman": "/tentang", "/akademisi": "/direktori", "/design-system/sistem": "/design-system/sistem"};
const KECUALI_RUTE = [/^\/admin\/(masuk|command-center|pipa|ai)$/, /^\/admin$/, /^\/f\/:id$/, /^\/ews\//, /^\/logpal\/(logpal\.(css|js)|index\.html)$/, /^\/pipa\/(?!lapangan$)/];
/* GET /pipa/<layar> dan /pipa/kit|aset/:id = layar di dalam SIPPA (menu sendiri), bukan halaman situs */

export const nyata = new Set();
for (const [, , k] of HTML_RUTE) if (k) nyata.add(ALIAS[norm(k)] || norm(k));
for (const f of readdirSync(join(AKAR, "src")).filter(f => f.endsWith(".js"))) {
  for (const m of readFileSync(join(AKAR, "src", f), "utf8").matchAll(/"GET (\/[^"]*)"/g)) {
    const r = norm(m[1]);
    if (r.startsWith("/api/") || KECUALI_RUTE.some(re => re.test(r)) || /\.(css|js)$/.test(r)) continue;
    nyata.add(ALIAS[r] || r);
  }
}
nyata.add("/api"); nyata.add("/lacak"); nyata.add("/warga");   // /api dan /lacak dilayani langsung di fetch(); /warga = public/warga/index.html
const BERKAS_KHUSUS = {"bnpb/kinerja": "/kinerja-bnpb", "pipa/uji_pilot": "/uji-pilot", "logpal/index": "/instansi/logpal", "siklus/publik": "/siklus/kejadian", "siklus/index": "/siklus",
  "inti/": null, "og/": null, "404": null, "500": null, "udara/sim/coba": null, "design-system-peta": "/design-system/sistem", "design-system-bnpb": "/design-system/bnpb",
  "kemitraan": "/kemitraan", "tentang": "/tentang", "kejadian": "/kejadian.html", "lapor/poster": "/lapor/poster.html"};
const targetHtmlRute = new Set(HTML_RUTE.map(([, b]) => b));
(function jelajah(d) {
  for (const n of readdirSync(join(AKAR, "public", d))) {
    const rel = join(d, n);
    if (statSync(join(AKAR, "public", rel)).isDirectory()) { if (!/^(inti|og|data|img|admin)$/.test(n)) jelajah(rel); continue; }
    if (!n.endsWith(".html") || / 2\./.test(n)) continue;
    const base = rel.replace(/\.html$/, "");
    if (targetHtmlRute.has("/" + rel)) continue;   // sudah dicakup kunci HTML_RUTE
    if (Object.hasOwn(BERKAS_KHUSUS, base)) { if (BERKAS_KHUSUS[base]) nyata.add(BERKAS_KHUSUS[base]); continue; }
    if (/^(404|500)$/.test(base) || base.startsWith("inti/") || base.startsWith("og/")) continue;
    let r = base.endsWith("/index") ? "/" + base.slice(0, -6) : "/" + base.replace(/_/g, "-");
    if (d === "bnpb" && Object.hasOwn(BNPB_BERSIH, n.replace(/\.html$/, "").replace(/_/g, "-"))) r = BNPB_BERSIH[n.replace(/\.html$/, "").replace(/_/g, "-")];
    else if (/^\/(banjir|cuaca|gempa|gunungapi|kekeringan|udara)\/(laporan|laporan-das|simulasi)$/.test(r)) r += ".html";
    nyata.add(ALIAS[r] || r);
  }
})("");
/* tab/anak di dalam halaman bencana (kunci HTML_RUTE null) */
export const tab = r => HTML_RUTE.some(([re, , k]) => k === null && re.test(r));
