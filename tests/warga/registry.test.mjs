/* Rute, OG, statistik, dan sitemap mengikuti registry (public/bencana.json via src/bencana.generated.js), bukan daftar tulisan tangan.
   Jalankan: node --test tests/warga/registry.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import REG from "../../src/bencana.generated.js";
import {ruteBencana, sumberStatus, halStatistik, sitemap} from "../../src/bencana.js";
import {metaRute} from "../../src/og_meta.js";
import worker, {HTML_RUTE, SUMBER_STATUS} from "../../src/worker.js";

const salinan = () => structuredClone(REG);
const cocok = (R, j) => R.find(([re]) => re.test(j));
const baru = {id: "uji1", nama: "Bencana Baru", rute: "/uji1/", status: "aktif", tab: ["peta", "tren", "metode"], tab_sembunyi: ["metode"],
  kejadian: {awalan: "X", nama: "Kejadian baru", nama_jamak: "Kejadian baru"}, sumber_status: [["uji1", "/uji1/data/meta.json", 6]]};

test("rute karhutla/banjir identik dengan daftar tulisan tangan lama; gempa (mati) tetap 404", () => {
  const LAMA = /^\/(tentang|ringkasan|peta|insight|berita|kompleks|posko|informasi|foto|keputusan|tren|dampak|sim|metode|prioritas|sarana|operasi|k\/K\d+|sim\/K\d+)\/?$/;
  for (const j of ["/", "/index.html", "/banjir", "/banjir/", "/banjir/index.html", "/tentang", "/peta/", "/k/K0009", "/sim/K12", "/operasi", "/keputusan", "/sarana", "/prioritas",
    "/k/B0001", "/k/K", "/sim", "/banjir/peta", "/banjir/insight", "/banjir/simulasi", "/banjir/rob/", "/banjir/x", "/banjir/k/B0001", "/gempa", "/gempa/", "/gempa/peta", "/gempa/k/G0001", "/cuaca/", "/x", "/data/meta.json", "/tentang-halaman", "/privasi"]) {
    const lama = LAMA.test(j) || /^\/banjir\/(peta|insight|simulasi|rob)\/?$/.test(j) || /^\/(index\.html)?$/.test(j) || /^\/banjir(\/|\/index\.html)?$/.test(j) || j === "/tentang-halaman" || j === "/privasi";
    assert.equal(!!cocok(HTML_RUTE, j), lama, j);
  }
  assert.equal(cocok(HTML_RUTE, "/banjir/")[1], "/banjir/index.html");
  assert.equal(cocok(HTML_RUTE, "/banjir/")[2], "/banjir/");
});

test("menambah entri aktif di salinan registry memunculkan rutenya; mati tidak", () => {
  const B = salinan(); B.bencana.push(baru, {...baru, id: "mati1", rute: "/mati1/", status: "mati"});
  const R = ruteBencana(B);
  for (const j of ["/uji1", "/uji1/", "/uji1/peta", "/uji1/tren/", "/uji1/k/X0001", "/uji1/sim/X12"]) assert.equal(cocok(R, j)?.[1], "/uji1/index.html", j);
  for (const j of ["/uji1/x", "/uji1/data/meta.json", "/uji1/k/K0001", "/mati1/", "/mati1/peta", "/gempa/"]) assert.ok(!cocok(R, j), j);
  assert.ok(!cocok(ruteBencana(REG), "/uji1/"), "registry asli tidak berubah");
});

test("statistik dan sumber status mengikuti registry", () => {
  assert.deepEqual(halStatistik(), ["karhutla", "banjir", "warga", "tentang", "privasi", "statistik"]);
  assert.deepEqual(SUMBER_STATUS.map(s => s[0]).sort(), ["banjir", "berita", "dampak", "titik"]);
  const B = salinan(); B.bencana.push(baru);
  assert.ok(halStatistik(B).includes("uji1")); assert.ok(sumberStatus(B).some(s => s[0] === "uji1"));
  assert.ok(!halStatistik(B).includes("gempa") && !sumberStatus(B).some(s => s[0] === "gempa_terbaru"));
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
  assert.equal(metaRute(u("/gempa/peta"), M, B), null);
});

test("/sitemap.xml: halaman tetap + tab tak tersembunyi bencana aktif, domain dari request", async () => {
  const r = await worker.fetch(new Request("https://contoh.test/sitemap.xml"), {}, {});
  assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /xml/);
  const x = await r.text(), loc = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace("https://contoh.test", ""));
  for (const j of ["/", "/peta", "/insight", "/berita", "/tren", "/dampak", "/tentang", "/privasi"]) assert.ok(loc.includes(j), j);
  for (const j of ["/posko", "/metode", "/informasi", "/kompleks", "/ringkasan", "/gempa/", "/banjir/"]) assert.ok(!loc.includes(j), `${j} tersembunyi/mati/uji tidak boleh ada`);
  assert.ok(!x.includes("terasurban"));
  const B = salinan(); B.bencana.push(baru);
  const l2 = sitemap("https://a.b", B);
  assert.match(l2, /https:\/\/a\.b\/uji1\/<\/loc>/); assert.match(l2, /\/uji1\/tren</); assert.doesNotMatch(l2, /\/uji1\/metode/);
});

test("robots.txt dan llms.txt ada, robots menunjuk sitemap", () => {
  assert.match(readFileSync(path.join(AKAR, "public/robots.txt"), "utf8"), /^Sitemap: https:\/\/\S+\/sitemap\.xml$/m);
  const l = readFileSync(path.join(AKAR, "public/llms.txt"), "utf8");
  for (const b of REG.bencana.filter(b => b.status === "aktif")) assert.ok(l.includes(b.rute === "/" ? "Karhutla" : b.rute), b.id);
  assert.ok(!/\/gempa\//.test(l));
});
