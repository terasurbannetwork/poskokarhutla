/* EWS EW-05: komponen layar public/inti/pantau_alat.{js,css} di Chrome sungguhan (pola tests/warga/kinerja_layar.test.mjs).
   Server Node kecil melayani public/ asli (termasuk /bencana.json registri) dan fixture /api/alat/pos, /api/alat/seri
   dengan bentuk yang sama dengan src/alat.js (urut, tingkat, ringkasan dari fungsi murni yang sama).
   U2 basi tidak pernah 0 dan tanpa warna tingkat, U6 tanpa sumber aktif tidak dirender, U7 klik grafik tidak membekukan (Event Timing),
   U11 tanpa kata "aman". Tanpa Chrome seluruh berkas DILEWATI. Jalan: node --test tests/inti/pantau_alat_layar.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";
import {tingkat, basi, ringkasan, urut, grafikSvg} from "../../public/inti/pantau_alat.js";
import {tindakanUntuk, BENCANA} from "../../public/ews_tindakan.js";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUB = path.join(AKAR, "public");
const MIME = {".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".html": "text/html; charset=utf-8"};
const TERLARANG = /\bNaN\b|\bundefined\b|\bnull\b|\[object|—|\bAnda\b|\baman\b/gi;
const CHROME = cariChrome();
const JAM = 3600e3;

const HALAMAN = (b, lewatPasang) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/inti/tema.css"><link rel="stylesheet" href="/inti/gaya.css"><link rel="stylesheet" href="/inti/kartu.css"><link rel="stylesheet" href="/inti/pantau_alat.css"></head>
<body><div id="tip" role="tooltip"></div><main><div class="wrap"><p>Insight</p></div><div class="wrap" id="insight"></div></main>
<script src="/inti/format.js"></script><script src="/inti/tip.js"></script><script>pasangTip()</script>
${lewatPasang ? `<script type="module" src="/inti/pantau_alat_pasang.js" data-bencana="${b}"></script>`
  : `<script type="module">import {pasang} from "/inti/pantau_alat.js"; window.__al = pasang("#insight", ${JSON.stringify(b)});</script>`}</body></html>`;

const AMB = {tinggi_cm: {waspada: 150, siaga: 200, awas: 250}};
function posFixture(kini) {
  const p = [
    {id: "sensor:TMA-A", sumber: "sensor", jenis: "tma", nama: "Batang Agam hulu", lat: -0.3, lon: 100.4, kab: "13.06", nilai: {tinggi_cm: 182, laju_cm_jam: 4}, utama: "tinggi_cm", satuan: "cm", waktu: kini - 4 * 6e4, ambang: AMB, alat: {baterai: 3.98, suhu: null}},
    {id: "sensor:TMA-B", sumber: "sensor", jenis: "tma", nama: "Pos putus bernilai nol", nilai: {tinggi_cm: 0}, utama: "tinggi_cm", satuan: "cm", waktu: kini - 3 * JAM, ambang: AMB, alat: {baterai: 3.5, suhu: 31}},
    {id: "sensor:TMA-C", sumber: "sensor", jenis: "tma", nama: "Pos belum pernah mengirim", nilai: null, utama: "tinggi_cm", satuan: "cm", waktu: null, ambang: AMB, alat: {baterai: null, suhu: null}},
    {id: "sensor:HUJ-D", sumber: "sensor", jenis: "hujan", nama: "Penakar hujan kering", nilai: {mm10: 0, mm60: 0}, utama: "mm10", satuan: "mm", waktu: kini - 2 * 6e4, ambang: null, alat: {baterai: 4.1, suhu: 29.5}},
    {id: "sihka:123", sumber: "sihka", jenis: "tma", nama: "Pos Katulampa", nilai: {tinggi: 160}, utama: "tinggi", satuan: "cm", waktu: kini - 20 * 6e4, ambang: {siaga3: 80, siaga2: 150, siaga1: 200}, status: "ok", status_resmi: "Siaga 2", pengelola: null, alat: {baterai: null, suhu: null}},
    ...Array.from({length: 10}, (_, i) => ({id: "sihka:N" + i, sumber: "sihka", jenis: "tma", nama: "Pos normal " + String(i).padStart(2, "0"), nilai: {tinggi: 40 + i}, utama: "tinggi", satuan: "cm", waktu: kini - 30 * 6e4, ambang: null, status: "ok", status_resmi: "Normal", alat: {baterai: null, suhu: null}})),
  ];
  return urut(p, kini).map(x => ({...x, tingkat: tingkat(x, kini)?.kode ?? null, basi: basi(x, kini)}));
}
function seriFixture(kini) {
  const titik = [];
  for (let t = kini - 24 * JAM; t <= kini; t += 5 * 6e4) if (t < kini - 10 * JAM || t > kini - 9 * JAM) titik.push([t, 120 + Math.round(60 * Math.sin((t - kini) / (4 * JAM)))]);
  return {pos: "sensor:TMA-A", sumber: "sensor", jenis: "tma", kunci: "tinggi_cm", satuan: "cm", interval: 5 * 6e4, ambang: AMB.tinggi_cm, titik, dibuat: kini};
}

if (!CHROME) test("uji layar pantau alat DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN)"}, () => {});
else {
  let srv, base, br, tab, mode = "ok";
  before(async () => {
    srv = http.createServer((q, s) => {
      const u = new URL(q.url, "http://x"), kini = Date.now();
      const kirim = (o, st = 200) => { s.statusCode = st; s.setHeader("content-type", "application/json"); s.end(JSON.stringify(o)); };
      if (u.pathname === "/uji") { s.setHeader("content-type", MIME[".html"]); return s.end(HALAMAN(u.searchParams.get("b") || "banjir", u.searchParams.has("pasang"))); }
      if (u.pathname === "/api/alat/pos") {
        if (mode === "500") return kirim({galat: "x"}, 500);
        if (mode === "kosong") return kirim({bencana: "banjir", dibuat: kini, pos: [], ringkas: ringkasan([], kini), gagal: []});
        if (mode === "gagal") return kirim({bencana: "banjir", dibuat: kini, pos: [], ringkas: ringkasan([], kini, {gagal: ["sensor", "sihka"]}), gagal: ["sensor", "sihka"]});
        const pos = posFixture(kini);
        return kirim({bencana: "banjir", dibuat: kini, pos, ringkas: ringkasan(pos, kini), gagal: []});
      }
      if (u.pathname === "/api/alat/seri") return u.searchParams.get("pos") === "sensor:TMA-A" ? kirim(seriFixture(kini)) : kirim({galat: "pos tidak dikenal"}, 404);
      const f = path.join(PUB, u.pathname);
      if (f.startsWith(PUB) && existsSync(f) && !f.endsWith("/")) { s.setHeader("content-type", MIME[path.extname(f)] || "application/octet-stream"); return s.end(readFileSync(f)); }
      s.statusCode = 404; s.end();
    });
    await new Promise(ok => srv.listen(0, "127.0.0.1", ok)); base = "http://127.0.0.1:" + srv.address().port;
    br = await bukaPeramban(CHROME); tab = await br.tab();
  });
  after(async () => { await tab?.tutup(); await br?.tutup(); srv?.close(); });
  const buka = async (b = "banjir", w = 1280) => { await tab.ukuran(w, 900); await tab.buka(`${base}/uji?b=${b}`); await tab.eval("window.__al"); await tab.eval("localStorage.clear()"); };
  const bukanFavicon = g => !/favicon\.ico/.test(g);

  for (const w of [1280, 375]) test(`${w}px: kartu, ringkasan, pemberitahuan; tanpa scroll horizontal, tanpa teks bocor`, async () => {
    mode = "ok"; await buka("banjir", w);
    assert.equal(await tab.eval("document.querySelectorAll('.al').length"), 1);
    assert.equal(await tab.eval("document.querySelector('.al .ex-jd h3').innerText.trim()"), "Pemantauan alat");
    assert.equal(await tab.eval("document.querySelectorAll('.al-kartu').length"), 12, "12 kartu pertama");
    const t = await tab.teks();
    assert.match(t, /15\s*pos/); assert.match(t, /2\s*di atas ambang/); assert.match(t, /2\s*tanpa data terkini/);
    assert.match(t, /2 alat tanpa data terkini/); assert.match(t, /Pos putus bernilai nol \(3 jam lalu\)/); assert.match(t, /belum pernah mengirim/);
    /* Langkah cepat mengutip naskah tangga (ews_tindakan.js) apa adanya, jadi tidak ikut saringan kata kita */
    const tKita = await tab.eval("(() => { const c = document.body.cloneNode(true); c.querySelectorAll('.al-langkah').forEach(e => e.remove()); return c.innerText; })()");
    assert.deepEqual([...new Set(tKita.match(TERLARANG) || [])], []);
    assert.ok((await tab.lebihLebar()).sw <= w + 1, "scroll horizontal");
    /* kartu sebaris rata (tinggi sama) dan berjarak, tidak menempel */
    const baris = await tab.eval(`(() => { const k = [...document.querySelectorAll('.al-kartu')].map(e => e.getBoundingClientRect()); const g = {}; k.forEach(r => (g[Math.round(r.top)] ||= []).push(r)); return Object.values(g).map(r => ({h: [...new Set(r.map(x => Math.round(x.height)))], n: r.length, celah: r.length > 1 ? Math.round(r[1].left - r[0].right) : null})); })()`);
    for (const b of baris) { assert.equal(b.h.length, 1, "tinggi kartu sebaris sama: " + JSON.stringify(b)); if (b.celah != null) assert.equal(b.celah, 20); }
    assert.equal(baris[0].n, w > 900 ? 3 : 1);
    await tab.klik("[data-lagi]"); await tab.tungguFungsi("document.querySelectorAll('.al-kartu').length === 15"); assert.equal(await tab.eval("!!document.querySelector('[data-lagi]')"), false);
    assert.deepEqual(tab.galat().filter(bukanFavicon), []);
  });

  test("U2: pos basi bernilai terakhir 0 atau null tidak menampilkan 0 dan tidak berwarna tingkat; pos segar bernilai 0 tetap 0", async () => {
    mode = "ok"; await buka();
    const k = id => tab.eval(`(() => { const e = document.querySelector('.al-kartu[data-id="${id}"]'); return {w: e.dataset.w, nilai: !!e.querySelector('.al-angka b'), angka: e.querySelector('.al-angka').innerText, pil: e.querySelector('.al-pil')?.innerText ?? null, pilW: e.querySelector('.al-pil')?.dataset.w ?? null}; })()`);
    for (const id of ["sensor:TMA-B", "sensor:TMA-C"]) {
      const c = await k(id);
      assert.equal(c.w, "tanpa_data"); assert.equal(c.pilW, "tanpa_data"); assert.equal(c.pil, "Tidak ada data terkini");
      assert.equal(c.nilai, false, `${id} menampilkan angka: ${c.angka}`);
      assert.doesNotMatch(c.angka.replace(/terakhir \d+ jam lalu/, ""), /\d/, id);
    }
    assert.match((await k("sensor:TMA-B")).angka, /^terakhir 3 jam lalu$/);
    assert.match((await k("sensor:TMA-C")).angka, /belum pernah mengirim data/);
    const kering = await k("sensor:HUJ-D");
    assert.match(kering.angka, /^0\s*mm$/); assert.equal(kering.pil, null, "tanpa ambang tanpa pil"); assert.equal(kering.w, "");
    const a = await k("sensor:TMA-A"); assert.equal(a.pil, "Waspada"); assert.match(a.angka, /182\s*cm/);
    assert.equal((await k("sihka:123")).pil, "Siaga 2");
    assert.equal(await tab.eval(`document.querySelector('.al-kartu[data-id="sensor:TMA-C"] .al-rinci').innerText.includes('tidak ada data')`), true);
  });

  test("U6: tanpa kemampuan.alat atau tanpa sumber aktif, panel tidak dirender; sumber gagal ditulis, bukan 0 pos", async () => {
    mode = "ok"; await buka("karhutla");
    assert.equal(await tab.eval("document.querySelectorAll('.al, .al-wrap').length"), 0);
    mode = "kosong"; await buka("banjir");
    assert.equal(await tab.eval("document.querySelectorAll('.al, .al-wrap').length"), 0);
    mode = "gagal"; await buka("banjir");
    let t = await tab.eval("document.querySelector('.al').innerText");
    assert.match(t, /Sumber Sensor Centurisk97 gagal dimuat\./); assert.match(t, /Sumber SIHKA, Kementerian PU gagal dimuat\./); assert.doesNotMatch(t, /\b0\s*pos/);
    mode = "500"; await buka("gunungapi");
    t = await tab.eval("document.querySelector('.al').innerText");
    assert.match(t, /PVMBG, Badan Geologi gagal dimuat/); assert.doesNotMatch(t, /\b0\s*pos/);
    mode = "ok";
  });

  test("U7: klik grafik tidak membekukan layar; grafik terputus di celah, tooltip muncul, tutup mengembalikan fokus", async () => {
    mode = "ok"; await buka();
    await tab.eval(`window.__lama = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lama = Math.max(window.__lama, e.duration); }).observe({type: "event", durationThreshold: 16, buffered: false}); true`);
    const r = await tab.eval(`(() => { const b = document.querySelector('[data-grafik="sensor:TMA-A"]'); b.scrollIntoView({block: "center"}); const x = b.getBoundingClientRect(); return {x: x.left + x.width / 2, y: x.top + x.height / 2}; })()`);
    for (const type of ["mousePressed", "mouseReleased"]) await tab.kirim("Input.dispatchMouseEvent", {type, x: r.x, y: r.y, button: "left", clickCount: 1});
    await tab.tungguFungsi("!!document.querySelector('.al-grafik .al-svg')");
    assert.equal(await tab.eval(`document.querySelector('[data-grafik="sensor:TMA-A"]').getAttribute('aria-expanded')`), "true");
    assert.equal(await tab.eval("document.querySelector('.al-grafik').previousElementSibling.dataset.id"), "sensor:TMA-A", "grafik tepat sesudah kartunya");
    assert.equal(await tab.eval("document.querySelectorAll('.al-grafik polyline').length"), 2, "celah 1 jam memutus garis");
    assert.equal(await tab.eval("document.querySelectorAll('.al-grafik .al-ga').length"), 3, "tiga garis ambang");
    await new Promise(ok => setTimeout(ok, 300));
    const lama = await tab.eval("window.__lama");
    assert.ok(lama < 200, `durasi interaksi ${lama} ms`);
    await tab.eval(`document.querySelector('.al-gh').dispatchEvent(new PointerEvent('pointerover', {bubbles: true})); true`);
    assert.equal(await tab.eval("document.querySelector('#tip').classList.contains('on')"), true);
    assert.match(await tab.eval("document.querySelector('#tip').innerText"), /WIB[\s\S]*cm/);
    await tab.klik("[data-tutup-grafik]");
    assert.equal(await tab.eval("document.querySelectorAll('.al-grafik').length"), 0);
    assert.equal(await tab.eval(`document.activeElement?.dataset.grafik`), "sensor:TMA-A");
    /* pos tanpa seri: pesan gagal, bukan grafik kosong bernilai 0 */
    await tab.klik('[data-grafik="sihka:123"]'); await tab.tungguFungsi("/gagal dimuat/.test(document.querySelector('.al-grafik')?.innerText || '')");
    assert.deepEqual(tab.galat().filter(g => bukanFavicon(g) && !/404/.test(g)), []);
  });

  test("pemasang tanpa skrip inline (dipakai /banjir dan /gunungapi) memasang panel sebelum #insight", async () => {
    mode = "ok"; await tab.ukuran(1280, 900); await tab.buka(`${base}/uji?b=banjir&pasang`, {tunggu: ".al-kartu"});
    assert.equal(await tab.eval("document.querySelector('.al-wrap').nextElementSibling.id"), "insight");
    for (const b of ["banjir", "gunungapi"]) assert.match(readFileSync(path.join(PUB, b, "index.html"), "utf8"), new RegExp(`<script type="module" src="../inti/pantau_alat_pasang.js" data-bencana="${b}"></script>`));
  });

  test("EW-09: Langkah cepat untuk tingkat tertinggi, teks butir sama persis dengan tangga tindakan", async () => {
    mode = "ok";
    for (const b of ["banjir", "gunungapi"]) {
      await buka(b);
      const d = await tab.eval(`(() => { const e = document.querySelector('.al-langkah'); return e && {w: e.dataset.w, jd: e.querySelector('h4').textContent, pil: e.querySelector('.al-pil').textContent, li: [...e.querySelectorAll('li')].map(x => x.textContent), t: [...e.querySelectorAll('li')].map(x => x.title)}; })()`);
      assert.ok(d, b + ": kotak Langkah cepat ada");
      assert.equal(d.jd, "Langkah cepat"); assert.equal(d.pil, "Waspada"); assert.equal(d.w, "waspada");
      assert.deepEqual(d.li, tindakanUntuk(b, 1), b + ": teks sama persis");
      assert.deepEqual(d.t, BENCANA[b].rujukan[1], b + ": rujukan di title");
      assert.equal(await tab.eval("document.querySelector('.al-langkah').nextElementSibling.classList.contains('al-kisi')"), true, "kotak sebelum kisi kartu");
    }
    assert.deepEqual(tab.galat().filter(bukanFavicon), []);
  });

  test("pemberitahuan ditutup tersimpan per hari di perangkat", async () => {
    mode = "ok"; await buka();
    await tab.klik("[data-tutup-putus]");
    assert.equal(await tab.eval("document.querySelectorAll('.al-putus').length"), 0);
    await tab.buka(`${base}/uji?b=banjir`); await tab.eval("window.__al");
    assert.equal(await tab.eval("document.querySelectorAll('.al-putus').length"), 0);
    assert.equal(await tab.eval("document.querySelectorAll('.al-kartu').length"), 12);
  });
}

test("U11: teks panel tanpa kata aman; CSS tanpa huruf kapital paksa", () => {
  for (const f of ["public/inti/pantau_alat.js", "public/inti/pantau_alat.css"]) {
    const s = readFileSync(path.join(AKAR, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(s, /\baman\b/i, f);
    assert.doesNotMatch(s, /text-transform\s*:\s*uppercase/i, f);
  }
});

test("grafik 1.440 titik: kolom tooltip paling banyak 300 (nilai terakhir tiap kelompok), garis tetap memuat semua titik", () => {
  const t0 = Date.UTC(2026, 10, 25), titik = Array.from({length: 1440}, (_, i) => [t0 + i * 6e4, i]);
  const svg = grafikSvg({titik, interval: 6e4, kunci: "getar_mms", satuan: "mm/s", ambang: null}, "Uji", 900);
  const kolom = svg.match(/class="al-gh"/g).length;
  assert.ok(kolom <= 300 && kolom >= 280, "kolom " + kolom);
  assert.equal(svg.match(/<polyline[^>]*points="([^"]*)"/)[1].split(" ").length, 1440);
  assert.match(svg, /Getaran: 1\.439 mm\/s/, "kolom terakhir memakai nilai terakhir");
  assert.equal(grafikSvg({titik: titik.slice(0, 288), interval: 6e4}, "Uji", 900).match(/class="al-gh"/g).length, 288, "di bawah ambang: satu kolom per titik");
});
