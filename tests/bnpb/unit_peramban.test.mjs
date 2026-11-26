/* RU-020 cangkang Ruang Unit di Chrome nyata: server statis + stub /api/unit/* dengan CSP asli src/bnpb.js (pola saham_layar.test.mjs).
   Pintu 9 kelompok dan 22 unit; /bnpb/unit/plp tanpa data = keadaan kosong tanpa nol palsu; /bnpb/unit/pus satu sistem tayang = kartu UnitRapor
   tanpa tab; /bnpb/unit/perb dua sistem tayang = tab, klik dan panah; 401 = Masuk staf; data 500 = galat dengan Muat ulang; basi ditandai.
   1440 dan 390 px, tanpa galat konsol, tanpa gulir mendatar. Tanpa Chrome: dilewati. UJI_TANGKAP=<folder> menyimpan tangkapan layar PNG.
   Jalan: node --test tests/bnpb/unit_peramban.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync, writeFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";

const CSP = readFileSync(new URL("../../src/bnpb.js", import.meta.url), "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.resolve(new URL("../../public", import.meta.url).pathname), CHROME = cariChrome();
const CONTOH = JSON.parse(readFileSync(new URL("./fixtures/unit/r2/contoh.json", import.meta.url), "utf8"));
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png"};
const SISTEM_BERKAS = {satu_data: "PUS-1", pendampingan_ikd: "PERB-1", kerugian: "PERB-2"};
/* 401/404/500 dari stub sengaja (kontrak), dan aset luar: bukan galat halaman */
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404|500)/.test(g);
const TANGKAP = process.env.UJI_TANGKAP;

test("layar Ruang Unit: pintu, unit kosong, satu sistem, tab, masuk, galat, basi", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const kini = new Date().toISOString();
  let indeks = null, data500 = false, basi = false;
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    const js = (o, s = 200) => { r.writeHead(s, {"content-type": "application/json"}); r.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return indeks === 401 ? js({galat: "perlu masuk"}, 401) : js(indeks);
    const d = u.match(/^\/api\/unit\/data\/([a-z0-9_]+)$/);
    if (d) {
      if (data500) return js({galat: "x"}, 500);
      const sis = SISTEM_BERKAS[d[1]]; if (!sis) return js({galat: "belum", status: "belum_ada"}, 404);
      const b = JSON.parse(JSON.stringify(CONTOH)); b.kartu.forEach(k => { k.sistem = sis; k.id = sis.toLowerCase() + "-" + k.id; });
      if (basi) b.dibuat = "2026-01-01T00:00:00Z";
      return js(b);
    }
    const f = path.join(PUB, u === "/bnpb/unit" ? "/bnpb/unit/index.html" : /^\/bnpb\/unit\/[a-z]{2,4}$/.test(u) ? "/bnpb/unit/unit.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); r.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  const ent = (nama, sistem, x = {}) => ({nama, sistem, dibuat: kini, basi_jam: 48, ok: true, galat: null, diunggah: kini, basi: false, ...x});
  const tangkap = async nama => { if (!TANGKAP) return; mkdirSync(TANGKAP, {recursive: true});
    const {data} = await t.kirim("Page.captureScreenshot", {format: "png", captureBeyondViewport: true}); writeFileSync(path.join(TANGKAP, nama + ".png"), Buffer.from(data, "base64")); };
  const bersih = async w => {
    const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
    assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
    const bocor = await t.eval("(document.querySelector('main').innerText.match(/.{0,40}(\\b(NaN|undefined|null)\\b|\\[object|·).{0,40}/) || [])[0] || null"); assert.equal(bocor, null, `teks bocor @${w}`);
    assert.equal(await t.eval("/\\baman\\b/i.test(document.body.innerText)"), false);
  };
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh);
      /* 1) pintu: PUS-1 tayang, PERB-1 basi, MT-2 langkah gagal */
      indeks = {dibuat: kini, berkas: [ent("satu_data", "PUS-1"), ent("pendampingan_ikd", "PERB-1", {basi: true, diunggah: "2026-10-01T00:00:00Z", basi_jam: 1080}),
        {nama: "MT-2", sistem: "MT-2", dibuat: kini, basi_jam: 1080, ok: false, galat: "ValueError: x"}]};
      await t.buka(asal + "/bnpb/unit", {tunggu: ".pt-grup"});
      assert.equal(await t.eval("document.querySelectorAll('section.ex.ex-std.pt-grup').length"), 9, "sembilan kelompok");
      assert.equal(await t.eval("document.querySelectorAll('a.pt-baris[data-unit]').length"), 22, "22 unit");
      assert.equal(await t.eval("document.querySelector('[data-unit=pus] .un-jml').textContent"), "1 tayang");
      assert.equal(await t.eval("document.querySelector('[data-unit=plp] .un-jml').textContent"), "belum ada");
      assert.equal(await t.eval("document.querySelector('[data-unit=perb] .un-jml').textContent"), "1 tayang");
      assert.match(await t.eval("document.querySelector('[data-unit=perb] .un-basi').textContent"), /^basi sejak \d+ \w+ 2026$/);
      assert.match(await t.eval("document.querySelector('#g-cegah .ex-hd').innerText"), /1 disiapkan/, "MT-2 gagal = disiapkan");
      assert.equal(await t.eval("document.querySelector('.pt-grup .ex-hd .hl')"), null, "kepala tanpa .hl");
      assert.ok(await t.eval("[...document.querySelectorAll('#g-darurat a')].some(a => a.getAttribute('href') === '/bnpb/dalops')"), "Penanganan Darurat menautkan Dalops");
      await bersih(w); await tangkap(`pintu-${w}`);

      /* 2) /bnpb/unit/plp tanpa data: kosong, tanpa tab, tanpa angka nol palsu */
      await t.buka(asal + "/bnpb/unit/plp", {tunggu: "#sistem"});
      assert.equal(await t.eval("document.querySelector('h1').textContent"), "Direktorat Pengelolaan Logistik dan Peralatan");
      assert.equal(await t.eval("!!document.querySelector('[role=tablist]')"), false);
      assert.match(await t.eval("document.querySelector('#sistem').innerText"), /Belum ada sistem yang tayang untuk unit ini\./);
      assert.equal(await t.eval("document.querySelectorAll('#sistem tbody tr').length"), 3);
      assert.equal(await t.eval("/(^|\\s)0(\\s|$)/.test(document.querySelector('main').innerText)"), false, "nol palsu");
      assert.equal(await t.eval("[...document.querySelectorAll('#sistem td')].every(td => td.dataset.label)"), true, "data-label tiap td");
      assert.ok(await t.eval("[...document.querySelectorAll('#sistem a')].some(a => a.href.endsWith('scripts/bnpb/unit/plp1.py'))"), "tautan skrip PLP-1");
      await bersih(w); await tangkap(`plp-kosong-${w}`);

      /* 3) /bnpb/unit/pus: satu sistem tayang, kartu dari UnitRapor langsung */
      await t.buka(asal + "/bnpb/unit/pus", {tunggu: "#pus-1-pus1-produsen"});
      assert.equal(await t.eval("!!document.querySelector('[role=tablist]')"), false);
      assert.equal(await t.eval("document.querySelectorAll('.un-panel[data-sistem] section.ex-std').length"), 2);
      assert.match(await t.eval("document.querySelector('#pus-1-pus1-produsen').innerText"), /belum ada data/);
      assert.match(await t.eval("document.querySelector('#sistem').innerText"), /Tayang/);
      await bersih(w); await tangkap(`pus-${w}`);

      /* 4) /bnpb/unit/perb dua sistem tayang: tab, klik pindah tanpa membekukan, ?s= diingat, panah memindah fokus */
      indeks.berkas.push(ent("kerugian", "PERB-2")); indeks.berkas[1] = ent("pendampingan_ikd", "PERB-1");
      await t.buka(asal + "/bnpb/unit/perb", {tunggu: "#perb-1-pus1-produsen"});
      assert.equal(await t.eval("document.querySelectorAll('[role=tab]').length"), 3);
      assert.equal(await t.eval("document.querySelector('[role=tab][aria-selected=true]').dataset.tab"), "PERB-1");
      await t.eval("document.querySelector('[data-tab=\"PERB-2\"]').click()");
      assert.equal(await t.eval("document.querySelector('[data-tab=\"PERB-2\"]').getAttribute('aria-selected')"), "true", "chrome tab berganti seketika");
      assert.equal(await t.eval("document.getElementById('p-perb-1').hidden"), true);
      await t.tunggu("#perb-2-pus1-produsen");
      assert.match(await t.eval("location.search"), /s=perb-2/);
      await t.eval("document.querySelector('[data-tab=\"PERB-2\"]').focus(); document.querySelector('[role=tablist]').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}))");
      assert.equal(await t.eval("document.activeElement.dataset.tab"), "sistem");
      await t.buka(asal + "/bnpb/unit/perb?s=sistem", {tunggu: "#sistem"});
      assert.equal(await t.eval("document.querySelector('[role=tab][aria-selected=true]').dataset.tab"), "sistem", "?s= membuka tab itu");
      await bersih(w); await tangkap(`perb-tab-${w}`);

      /* 5) basi: pil merah dan spanduk dari rapor.js */
      basi = true; await t.buka(asal + "/bnpb/unit/pus", {tunggu: "#pus-1-pus1-produsen"}); basi = false;
      assert.match(await t.eval("document.querySelector('#pus-1-pus1-produsen').innerText"), /basi sejak/);

      /* 6) data 500: galat dengan Muat ulang, kartu lain tetap */
      data500 = true; await t.buka(asal + "/bnpb/unit/pus", {tunggu: "[data-ulang]"});
      assert.match(await t.eval("document.querySelector('.un-panel').innerText"), /gagal dimuat\. Coba lagi beberapa menit lagi\./);
      assert.equal(await t.eval("!!document.querySelector('#sistem')"), true);
      data500 = false; await t.klik("[data-ulang]"); await t.tunggu("#pus-1-pus1-produsen");
      t.kosongkanGalat();

      /* 7) sesi habis: indeks 401 = kartu Masuk staf */
      indeks = 401; await t.buka(asal + "/bnpb/unit/plp", {tunggu: ".un-masuk"});
      assert.equal(await t.eval("document.querySelector('.un-masuk a').getAttribute('href')"), "/admin/masuk?ke=%2Fbnpb%2Funit%2Fplp");
    }
  } finally { await t.tutup(); await br.tutup(); srv.close(); }
});
