/* Uji beban 100k kunjungan/hari dengan lonjakan 50x, tanpa dependensi (k6/artillery tidak terpasang; skrip ini setara dan
   jalan di mana saja ada Node 22).

   Satu "kunjungan" = apa yang dilakukan peramban saat halaman pertama dibuka: 1 HTML (rute acak sesuai bobot) + skrip/CSS
   lokal dari HTML itu + berkas data muatan awal + /api/titik (bila halaman memanggilnya) + kadang /api/warga (tab Informasi).
   Laju dasar 100.000/86.400 = 1,16 kunjungan/dtk; lonjakan = BURST x laju dasar.

   Pemanggilan Worker dihitung dari log wrangler dev yang dijalankan dengan pembungkus penghitung (lihat LOG di bawah):
   tiap baris "PANGGIL <ms> <jalur>" = satu pemanggilan Worker. Permintaan aset statis yang cocok TIDAK memanggil Worker.

   Pakai (lokal):
     wrangler dev --local -c <config dengan main = pembungkus yang mencetak console.log("PANGGIL", ms, pathname)> --port 8799 > log.txt
     node tests/beban/beban.mjs http://localhost:8799 --dasar 20 --lonjakan 15 --burst 50 --log log.txt
   Pakai (pratinjau Cloudflare, tanpa --log; hitung pemanggilan dari dasbor Workers > Metrics):
     node tests/beban/beban.mjs https://<preview>.workers.dev --dasar 60 --lonjakan 30 --burst 50 --skala 0.2
   Catatan 19 Okt 2026: lima bencana lain (gempa, cuaca, udara, gunungapi, kekeringan) kini ada di RUTE (bobot 18 % total). wrangler dev --local TANPA
   pembungkus jenuh pada --burst 50 (galat 5xx massal lalu proses mati, 486 kunjungan/10 dtk); pakai --burst 5 untuk dev lokal, burst 50 hanya di pratinjau.
   Plafon muatan awal per rute ada di ukur_muat.mjs (PLAFON_KB; exit 1 bila lewat).
   --skala memperkecil laju (mis. 0.2 = 20 % laju sesungguhnya) supaya uji singkat tidak menghabiskan kuota harian. */
import {readFileSync, existsSync} from "node:fs";

const arg = process.argv.slice(2), asal = arg[0];
const opsi = k => { const i = arg.indexOf("--" + k); return i < 0 ? null : arg[i + 1]; };
const DASAR = +(opsi("dasar") ?? 20), LONJAK = +(opsi("lonjakan") ?? 15), BURST = +(opsi("burst") ?? 50), SKALA = +(opsi("skala") ?? 1), LOG = opsi("log");
const LAJU = 100000 / 86400 * SKALA;
const RUTE = [["/", 32], ["/peta", 12], ["/ringkasan", 8], ["/banjir/", 12], ["/k/K0001", 4], ["/berita", 4], ["/sim/K0001", 2], ["/tentang", 2], ["/warga/", 4],
  ["/gempa/", 5], ["/cuaca/", 5], ["/udara/", 4], ["/gunungapi/", 3], ["/kekeringan/", 3]];
const DATA_KARHUTLA = ["data/meta.json", "data/hotspot24.json", "data/kluster_awal.json", "data/fwi.json", "data/bnpb.json", "data/wilayah.json", "geo/provinsi.json",
  "data/daops.json", "data/inarisk.json", "data/bpbd.json", "data/sejarah.json", "data/harian30.json", "data/posko.json"];
const DATA_BANJIR = ["banjir/data/meta.json", "banjir/data/status.json", "banjir/data/hujan.json", "banjir/data/posko.json"];
/* data muatan awal bencana lain (terukur lewat ukur_muat.mjs 19 Okt 2026; /banjir/data/ dipakai bersama untuk berita/cuaca/gunungapi) */
const DATA_LAIN = {
  "/gempa/": ["geo/provinsi.json", "gempa/data/meta.json", "gempa/data/riwayat_prov.json", "gempa/data/laju.json", "banjir/data/berita_gempa.json", "banjir/data/dampak_gempa.json"],
  "/cuaca/": ["geo/provinsi.json", "banjir/data/pusat_kec.json", "banjir/data/cuaca_prakiraan.json", "banjir/data/cuaca_meta.json", "banjir/data/berita_cuaca.json"],
  "/udara/": ["geo/provinsi.json", "udara/data/lintasan.json", "udara/data/prakiraan.json", "data/udara_kualitas.json", "banjir/data/berita_udara.json"],
  "/gunungapi/": ["geo/provinsi.json", "banjir/data/abu_gunungapi.json", "banjir/data/gunungapi_status.json", "banjir/data/berita_gunungapi.json"],
  "/kekeringan/": ["geo/provinsi.json", "data/kekeringan_prakiraan.json", "data/kekeringan_meta.json", "banjir/data/berita_kekeringan.json"],
};
const P_WARGA = 0.1;   // bagian kunjungan yang membuka peta Lapor Warga (GET /api/warga)
/* titik_live.js memanggil /api/titik hanya bila data statis > 3,5 jam (titik.yml terlambat); tepat jadwal umurnya <= ± 3,3 jam */
const P_TITIK = +(opsi("titik") ?? 0.1);

const pilih = () => { let r = Math.random() * 100; for (const [p, b] of RUTE) if ((r -= b) < 0) return p; return "/"; };
const tidur = ms => new Promise(r => setTimeout(r, ms));
const lat = {}, galat = {};
const catat = (k, ms, ok) => { (lat[k] ||= []).push(ms); if (!ok) galat[k] = (galat[k] || 0) + 1; };
const jenis = u => u.includes("/api/") ? "api" : /\.(js|css)(\?|$)/.test(u) ? "js/css" : /\.json/.test(u) ? "data" : "html";

async function ambil(u) {
  const t = performance.now();
  try { const r = await fetch(u, {headers: {"accept-encoding": "gzip, br"}}), teks = await r.text(); catat(jenis(u), performance.now() - t, r.status < 500); return teks; }
  catch (e) { catat(jenis(u), performance.now() - t, false); return null; }
}
const skripCache = new Map();
async function kunjungan() {
  const rute = pilih(), html = await ambil(asal + rute);
  if (html == null) return;
  if (!skripCache.has(rute)) {
    const dasar = new URL(rute.endsWith("/") ? rute : rute.replace(/[^/]*$/, ""), asal);
    const base = html.match(/<base href="([^"]+)"/)?.[1];
    skripCache.set(rute, [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"#:]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(m => new URL(m[1], base ? new URL(base, asal) : dasar).href));
  }
  const banjir = rute.startsWith("/banjir"), lain = DATA_LAIN[rute], aset = [...skripCache.get(rute), ...(lain || (banjir ? DATA_BANJIR : rute === "/tentang" ? [] : DATA_KARHUTLA)).map(p => asal + "/" + p)];
  await Promise.all(aset.map(ambil));
  if (!banjir && !lain && rute !== "/tentang" && Math.random() < P_TITIK) await ambil(asal + "/api/titik");
  if (Math.random() < P_WARGA) await ambil(asal + `/api/warga?jam=24&bbox=${[100, -5, 120, 5].map(v => v + Math.floor(Math.random() * 3)).join(",")}`);
}

const panggilan = () => LOG && existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter(l => l.includes("PANGGIL ")) : [];
async function fase(nama, detik, laju) {
  const p0 = panggilan().length, jalan = [], t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < detik * 1000) { jalan.push(kunjungan()); n++; await tidur(-Math.log(1 - Math.random()) / laju * 1000); }   // kedatangan Poisson
  await Promise.all(jalan); await tidur(500);
  const p = panggilan().slice(p0);
  console.log(`${nama}: ${n} kunjungan dalam ${detik} dtk (${(n / detik).toFixed(2)}/dtk)` + (LOG ? `, ${p.length} pemanggilan Worker = ${(p.length / n).toFixed(2)} per kunjungan` : ""));
  return p;
}
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * .95)] ?? 0; };

console.log(`laju dasar ${LAJU.toFixed(2)} kunjungan/dtk (100k/hari x ${SKALA}), lonjakan x${BURST}`);
const pa = await fase("dasar", DASAR, LAJU), pb = await fase(`lonjakan x${BURST}`, LONJAK, LAJU * BURST);
const p50 = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
for (const [k, v] of Object.entries(lat)) console.log(`  ${k.padEnd(7)} ${String(v.length).padStart(6)} permintaan  p50 ${p50(v).toFixed(0)} ms  p95 ${p95(v).toFixed(0)} ms  galat ${galat[k] || 0}`);
if (LOG) {
  const per = {}; for (const l of [...pa, ...pb]) { const [ms, j] = l.trim().split(/\s+/).slice(-2); const k = j.startsWith("/api/") ? j : /\.json$/.test(j) ? "data 404" : "HTML"; (per[k] ||= []).push(+ms); }
  for (const [k, v] of Object.entries(per)) console.log(`  Worker ${k.padEnd(12)} ${String(v.length).padStart(5)} panggilan, durasi dinding p50 ${p50(v)} ms p95 ${p95(v)} ms`);
}
