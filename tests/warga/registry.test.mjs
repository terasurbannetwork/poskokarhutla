/* Rute, OG, statistik, dan sitemap mengikuti registry (public/bencana.json via src/bencana.generated.js), bukan daftar tulisan tangan.
   Jalankan: node --test tests/warga/registry.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import REG from "../../src/bencana.generated.js";
import {ruteBencana, sumberStatus, sumberUji, halStatistik, sitemap} from "../../src/bencana.js";
import {metaRute} from "../../src/og_meta.js";
import worker, {HTML_RUTE, SUMBER_STATUS, SUMBER_UJI} from "../../src/worker.js";

const salinan = () => structuredClone(REG);
const cocok = (R, j) => R.find(([re]) => re.test(j));
const baru = {id: "uji1", nama: "Bencana Baru", rute: "/uji1/", status: "aktif", tab: ["peta", "tren", "metode"], tab_sembunyi: ["metode"],
  kejadian: {awalan: "X", nama: "Kejadian baru", nama_jamak: "Kejadian baru"}, sumber_status: [["uji1", "/uji1/data/meta.json", 6]]};

test("rute karhutla/banjir identik dengan daftar tulisan tangan lama; semua bencana dilayani, mati 404", () => {
  const LAMA = /^\/(tentang|ringkasan|peta|insight|berita|kompleks|posko|informasi|foto|keputusan|tren|dampak|sim|metode|prioritas|sarana|operasi|k\/K\d+|sim\/K\d+)\/?$/;
  for (const j of ["/", "/index.html", "/banjir", "/banjir/", "/banjir/index.html", "/tentang", "/peta/", "/k/K0009", "/sim/K12", "/operasi", "/keputusan", "/sarana", "/prioritas",
    "/k/B0001", "/k/K", "/sim", "/banjir/peta", "/banjir/insight", "/banjir/simulasi", "/banjir/rob/", "/banjir/x", "/banjir/k/B0001", "/banjir/k/B0007", "/banjir/k/X1", "/banjir/sim/B0001", "/x", "/data/meta.json", "/tentang-halaman", "/privasi"]) {
    const lama = LAMA.test(j) || /^\/banjir\/(peta|insight|simulasi|rob)\/?$/.test(j) || /^\/(index\.html)?$/.test(j) || /^\/banjir(\/|\/index\.html)?$/.test(j) || /^\/banjir\/k\/B\d+$/.test(j) || j === "/tentang-halaman" || j === "/privasi";
    assert.equal(!!cocok(HTML_RUTE, j), lama, j);
  }
  // semua bencana kini aktif dan dilayani (tidak ada lagi tahap 'uji'); 'mati' disimulasikan pada salinan di bawah
  for (const id of ["cuaca", "udara", "kekeringan", "gunungapi"]) assert.equal(cocok(HTML_RUTE, `/${id}/`)?.[1], `/${id}/index.html`, id);
  // gempa aktif: halaman, tab (juga yang tersembunyi dari nav), dan kejadian G dilayani; mati = 404 lagi
  for (const j of ["/gempa", "/gempa/", "/gempa/peta", "/gempa/tentang", "/gempa/insight", "/gempa/tren", "/gempa/kejadian", "/gempa/berita", "/gempa/dampak", "/gempa/foto", "/gempa/sim", "/gempa/k/G0001"]) assert.equal(cocok(HTML_RUTE, j)?.[1], "/gempa/index.html", j);
  assert.ok(!cocok(HTML_RUTE, "/gempa/k/K0001"), "kejadian karhutla bukan di gempa");
  const MATI = salinan(); MATI.bencana.find(b => b.id === "gempa").status = "mati";
  for (const j of ["/gempa", "/gempa/", "/gempa/peta"]) assert.ok(!cocok(ruteBencana(MATI), j), `gempa mati harus 404: ${j}`);
  for (const j of ["/semua", "/semua/", "/semua/index.html"]) assert.equal(cocok(HTML_RUTE, j)?.[1], "/semua/index.html", j);
  assert.ok(!cocok(HTML_RUTE, "/semua/x"));
  assert.ok(sitemap("https://x.test").includes("<loc>https://x.test/semua</loc>"), "/semua masuk sitemap");
  assert.equal(cocok(HTML_RUTE, "/banjir/")[1], "/banjir/index.html");
  assert.equal(cocok(HTML_RUTE, "/banjir/")[2], "/banjir/");
});

test("menambah entri aktif di salinan registry memunculkan rutenya; mati tidak", () => {
  const B = salinan(); B.bencana.push(baru, {...baru, id: "mati1", rute: "/mati1/", status: "mati"});
  const R = ruteBencana(B);
  for (const j of ["/uji1", "/uji1/", "/uji1/peta", "/uji1/tren/", "/uji1/k/X0001", "/uji1/sim/X12"]) assert.equal(cocok(R, j)?.[1], "/uji1/index.html", j);
  for (const j of ["/uji1/x", "/uji1/data/meta.json", "/uji1/k/K0001", "/mati1/", "/mati1/peta"]) assert.ok(!cocok(R, j), j);
  assert.ok(!cocok(ruteBencana(REG), "/uji1/"), "registry asli tidak berubah");
});

test("statistik dan sumber status mengikuti registry", () => {
  assert.deepEqual(halStatistik(), ["karhutla", "banjir", "gempa", "cuaca", "udara", "gunungapi", "kekeringan", "warga", "tentang", "privasi", "statistik"]);
  // hanya "aktif" menentukan 503 /api/status (banjir, gempa, cuaca, udara, gunungapi, kekeringan aktif); tahap "uji" dilaporkan terpisah (kini tak ada bencana uji)
  assert.deepEqual(SUMBER_STATUS.map(s => s[0]).sort(), ["banjir", "berita", "berita_cuaca", "berita_gempa", "berita_gunungapi", "berita_kekeringan", "berita_udara", "cuaca", "cuaca_nowcast", "dampak", "gempa_terbaru", "gunungapi", "himawari", "kekeringan", "kualitas", "presiden", "titik"]);
  assert.deepEqual(SUMBER_UJI, []);
  const U = salinan(); U.bencana.find(b => b.id === "cuaca").status = "uji";   // pemisahan aktif/uji diuji pada salinan
  assert.deepEqual(sumberUji(U).map(s => s[0]).sort(), ["berita_cuaca", "cuaca", "cuaca_nowcast"]); assert.ok(!sumberStatus(U).some(s => s[0].includes("cuaca")));
  const B = salinan(); B.bencana.push(baru);
  assert.ok(halStatistik(B).includes("uji1")); assert.ok(sumberStatus(B).some(s => s[0] === "uji1"));
  const M = salinan(); M.bencana.find(b => b.id === "gempa").status = "mati";
  assert.ok(!halStatistik(M).includes("gempa") && !sumberUji(M).some(s => s[0] === "gempa_terbaru") && !sumberStatus(M).some(s => s[0] === "gempa_terbaru"), "mati: tak melahirkan apa pun");
});

test("OG: tab, kejadian, dan halaman utama bencana baru dari registry", () => {
  const S = "https://x.id", M = {situs: S, v: "1", nama: {}, halaman: {"/": {judul: "N", desk: "dn", gambar: "ringkasan"}, "/uji1/": {judul: "Baru", desk: "db", gambar: "uji1"}}};
  const B = salinan(); B.bencana.push(baru);
  const u = s => new URL(S + s);
  assert.equal(metaRute(u("/uji1/"), M, B).judul, "Baru");
  assert.equal(metaRute(u("/uji1/tren"), M, B).judul, "Tren · Pantau Bencana Bencana Baru");
  assert.equal(metaRute(u("/uji1/k/X0001"), M, B).url, S + "/uji1/k/X0001");
  assert.equal(metaRute(u("/peta"), M, B).judul, "Peta · Pantau Bencana Karhutla");
  assert.equal(metaRute(u("/uji1/tren"), M), null, "registry asli tidak mengenalnya");
  assert.equal(metaRute(u("/gempa/peta"), M, B).judul, "Peta · Pantau Bencana Gempa & Tsunami", "gempa (aktif) punya OG");
  const MATI = salinan(); MATI.bencana.find(b => b.id === "gempa").status = "mati";
  assert.equal(metaRute(u("/gempa/peta"), M, MATI), null, "gempa mati tidak punya OG");
});

test("/sitemap.xml: halaman tetap + tab tak tersembunyi bencana aktif, domain dari request", async () => {
  const r = await worker.fetch(new Request("https://contoh.test/sitemap.xml"), {}, {});
  assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /xml/);
  const x = await r.text(), loc = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace("https://contoh.test", ""));
  for (const j of ["/", "/semua", "/peta", "/insight", "/berita", "/tren", "/dampak", "/tentang", "/privasi"]) assert.ok(loc.includes(j), j);
  for (const j of ["/gempa/", "/gempa/peta", "/gempa/insight", "/gempa/tren", "/gempa/berita", "/gempa/dampak", "/gempa/sim", "/gempa/foto", "/gempa/tentang"]) assert.ok(loc.includes(j), `${j} gempa aktif harus ada`);
  for (const j of ["/posko", "/metode", "/informasi", "/kompleks", "/ringkasan", "/cuaca/metode", "/udara/metode", "/gunungapi/metode", "/kekeringan/metode", "/banjir/posko", "/banjir/metode", "/gempa/posko", "/gempa/metode", "/gempa/ringkasan", "/gempa/informasi"]) assert.ok(!loc.includes(j), `${j} tersembunyi/mati tidak boleh ada`);
  for (const j of ["/banjir/", "/banjir/peta", "/banjir/berita", "/banjir/foto"]) assert.ok(loc.includes(j), `${j} banjir aktif harus ada`);
  for (const id of ["cuaca", "udara", "gunungapi", "kekeringan"]) for (const t of ["", "peta", "insight", "berita", "tren", "dampak", "foto", "tentang"]) assert.ok(loc.includes(`/${id}/${t}`), `/${id}/${t} aktif harus ada`);
  assert.ok(!x.includes("terasurban"));
  const B = salinan(); B.bencana.push(baru);
  const l2 = sitemap("https://a.b", B);
  assert.match(l2, /https:\/\/a\.b\/uji1\/<\/loc>/); assert.match(l2, /\/uji1\/tren</); assert.doesNotMatch(l2, /\/uji1\/metode/);
});

test("robots.txt dan llms.txt ada, robots menunjuk sitemap", () => {
  assert.match(readFileSync(path.join(AKAR, "public/robots.txt"), "utf8"), /^Sitemap: https:\/\/\S+\/sitemap\.xml$/m);
  const l = readFileSync(path.join(AKAR, "public/llms.txt"), "utf8");
  for (const b of REG.bencana.filter(b => b.status === "aktif")) assert.ok(l.includes(b.rute === "/" ? "Karhutla" : b.rute), b.id);
});

test("registry `halaman`: tab berupa halaman terpisah disajikan berkasnya (cuaca/simulasi), tab lain tetap index.html bencananya", () => {
  const berkas = j => cocok(HTML_RUTE, j)?.[1];
  assert.equal(REG.bencana.find(b => b.id === "cuaca").halaman.simulasi, "simulasi.html");
  assert.equal(berkas("/cuaca/simulasi"), "/cuaca/simulasi.html"); assert.equal(berkas("/cuaca/simulasi/"), "/cuaca/simulasi.html");
  assert.equal(berkas("/cuaca/peta"), "/cuaca/index.html");
  assert.equal(berkas("/udara/simulasi"), "/udara/index.html", "udara punya p-simulasi di index.html");
  assert.equal(berkas("/gunungapi/simulasi"), "/gunungapi/index.html");
  assert.equal(berkas("/banjir/simulasi"), "/banjir/index.html", "alias lama banjir tidak berubah");
  const R = ruteBencana(salinan()).find(([, f]) => f === "/cuaca/simulasi.html");
  assert.ok(R && R[2] === null, "halaman terpisah tidak punya kunci statistik sendiri (sama dengan tab lain)");
});
