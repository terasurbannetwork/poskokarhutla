/* Uji LAYAR /admin/kinerja di Chrome sungguhan: server Node kecil melayani HTML dari halamanBnpb("kinerja"), berkas public/, dan fixture /api/sla (tanpa D1; rute nyata diuji uji worker).
   Tanpa Chrome seluruh berkas DILEWATI. Jalan: node --test tests/warga/sla_layar.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";
import {halamanBnpb} from "../../src/admin_halaman.js";
import {fixture} from "./_kinerja_fixture.mjs";

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public");
const MIME = {".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json"};
const TERLARANG = /\bNaN\b|\bundefined\b|\bnull\b|\[object|—|\bAnda\b/g;
const bukanFavicon = g => !/favicon\.ico/.test(g);
const CHROME = cariChrome();

if (!CHROME) test("uji layar kinerja DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN)"}, () => {});
else {
  let srv, base, br, tab, mode = "ok";
  const dipanggil = [];
  before(async () => {
    srv = http.createServer(async (q, s) => {
      const u = new URL(q.url, "http://x");
      if (u.pathname === "/admin/kinerja") { s.setHeader("content-type", "text/html; charset=utf-8"); return s.end(await halamanBnpb("kinerja")); }
      if (u.pathname === "/api/sla") {
        dipanggil.push(u.search);
        if (mode === "503") { s.statusCode = 503; s.setHeader("content-type", "application/json"); return s.end('{"galat":"belum aktif"}'); }
        if (mode === "500") { s.statusCode = 500; return s.end("{}"); }
        const f = fixture({hari: +u.searchParams.get("hari") || 30, prov: u.searchParams.get("prov") || ""});
        if (mode === "kosong") Object.assign(f, {sumber: [], tahap: [], wilayah: [], tren: [], himawari: {alarm: 0, terkunci: 0, hilang: 0, selisih_viirs_p50_menit: null}, catatan: [], proses: [], macet: [], lapangan: null});
        s.setHeader("content-type", "application/json"); return s.end(JSON.stringify(f));
      }
      const f = path.join(PUB, u.pathname);
      if (f.startsWith(PUB) && existsSync(f) && !f.endsWith("/")) { s.setHeader("content-type", MIME[path.extname(f)] || "application/octet-stream"); return s.end(readFileSync(f)); }
      s.statusCode = 404; s.end();
    });
    await new Promise(ok => srv.listen(0, "127.0.0.1", ok)); base = "http://127.0.0.1:" + srv.address().port;
    br = await bukaPeramban(CHROME); tab = await br.tab();
  });
  after(async () => { await tab?.tutup(); await br?.tutup(); srv?.close(); });
  const buka = async (url, w = 1440) => { await tab.ukuran(w, 900); await tab.buka(base + url); await new Promise(r => setTimeout(r, 900)); };

  for (const w of [1440, 375]) test(`Kinerja di ${w}px: tiga tab terisi, tanpa galat, tanpa scroll horizontal, tanpa teks bocor`, async () => {
    mode = "ok"; await buka("/admin/kinerja", w);
    const cek = async () => { assert.ok((await tab.lebihLebar()).sw <= w + 1, "scroll horizontal"); assert.deepEqual([...new Set((await tab.teks()).match(TERLARANG) || [])], []); };
    assert.equal(await tab.eval("document.querySelectorAll('.kj-s').length"), 3); assert.equal(await tab.eval("document.querySelectorAll('.kj-gr').length"), 2);
    assert.match(await tab.teks(), /target belum ditetapkan|Himawari/); await cek();
    await tab.klikTeks("[data-tab]", "^Proses$"); await tab.tungguFungsi("document.querySelectorAll('.kj-corong li').length === 6 && location.search.includes('tab=proses')");
    const t = await tab.teks(); assert.match(t, /target belum ditetapkan/); assert.match(t, /muncul lagi/); assert.match(t, /Tugas yang macet/); assert.match(t, /belum ada data/);
    assert.equal(await tab.eval("document.querySelectorAll('.kj-tw tbody tr').length"), 4); assert.ok(await tab.eval("!!document.querySelector('a[href=\"/admin/instansi#pantau\"]')")); await cek();
    await tab.klikTeks("[data-tab]", "^Lapangan$"); await tab.tungguFungsi("document.querySelectorAll('.kj-tr tbody tr').length === 3");
    const l = await tab.teks(); assert.match(l, /isian lengkap/); assert.match(l, /dari 14 tugas/); assert.match(l, /dari 42 foto/); assert.match(l, /dari 11 tugas padam/); assert.match(l, /dari 13 tugas terkonfirmasi/); assert.match(l, /dari 12 tugas/); assert.match(l, /BPBD Kalimantan Tengah/); assert.doesNotMatch(l, /\b0%/); await cek();
    assert.deepEqual(tab.galat().filter(bukanFavicon), []);
  });
  test("nilai null tampil 'belum ada data', bukan nol atau tanda hubung; satu satuan per kolom; catatan tampil", async () => {
    mode = "ok"; await buka("/admin/kinerja?hari=7");
    let d = await tab.teks();
    assert.match(d, /Catatan metode/); assert.match(d, /dihitung dari saat tugas dibuat/);
    assert.doesNotMatch(d, /Belum ada alarm Himawari/, "alarm null bukan nol alarm");
    assert.equal(await tab.eval("[...document.querySelectorAll('.kj-ukur')].filter(e => /alarm dini|terkunci jadi tugas|hilang sebelum/.test(e.innerText)).every(e => /belum ada data/.test(e.innerText))"), true);
    await tab.klikTeks("[data-tab]", "^Proses$"); await tab.tungguFungsi("document.querySelectorAll('.kj-corong li').length === 6");
    d = await tab.teks(); assert.match(d, /Sebagian tahap belum ada data/); assert.doesNotMatch(d, /\d+ tugas menunggu,/);
    const satuan = await tab.eval(`(() => { const baris = [...document.querySelectorAll('.kj-t1, table')].flatMap(t => [...t.querySelectorAll('tbody tr')]);
      const kol = (tbl, i) => [...tbl.querySelectorAll('tbody tr')].map(r => r.children[i]?.innerText || '').filter(x => /menit|jam|hari/.test(x)).map(x => x.replace(/[^a-z]/g, ''));
      return {w: [2, 3].map(i => new Set(kol(document.querySelector('.kj-tw'), i)).size), tahap: [2, 3].map(i => new Set(kol(document.querySelector('.kj-corong').closest('section').nextElementSibling.querySelector('table'), i)).size)}; })()`);
    assert.deepEqual(satuan, {w: [1, 1], tahap: [1, 1]}, "satu satuan per kolom");
    const tahapTbl = await tab.eval("document.querySelector('.kj-corong').closest('section').nextElementSibling.querySelector('table').innerText");
    assert.match(tahapTbl, /belum ada data/); assert.doesNotMatch(tahapTbl, /–/);
    assert.match(await tab.eval("document.querySelector('.kj-tw').innerText"), /Riau[\s\S]*belum ada data/);
  });
  test("tab di URL dipulihkan dan ikut filter hari", async () => {
    mode = "ok"; await buka("/admin/kinerja?tab=lapangan&hari=7");
    assert.equal(await tab.eval("document.querySelector('[data-tab=lapangan]').getAttribute('aria-pressed')"), "true");
    assert.equal(await tab.eval("document.querySelectorAll('.kj-tr tbody tr').length"), 3);
    await tab.klik("[data-urut=nama][data-t=r]"); await tab.tungguFungsi("document.querySelector('#kjIsiR tr td')?.innerText === 'BPBD Kalimantan Tengah'");
    assert.equal(await tab.eval("document.querySelector('[data-urut=nama][data-t=r]').closest('th').getAttribute('aria-sort')"), "ascending");
    assert.ok(await tab.eval("location.search.includes('urutr=nama')"));
  });
  test("filter hari dan urut tulis ke URL; urut mengubah barisnya; drill ke kabupaten", async () => {
    mode = "ok"; await buka("/admin/kinerja?tab=proses");
    /* uji sebelumnya sudah memuat hari=7: tanpa dikosongkan, tunggu di bawah lolos seketika dan klik urut mengenai tabel lama
       yang lalu dihapus kerangka muat() (querySelector null, flaky di CI) */
    dipanggil.length = 0;
    await tab.klikTeks("[data-hari]", "^7 hari$"); await tab.tungguFungsi("location.search.includes('hari=7')");
    assert.equal(await tab.eval("document.querySelector('[data-hari=\"7\"]').getAttribute('aria-pressed')"), "true");
    for (let i = 0; i < 40 && !dipanggil.some(q => q.includes("hari=7")); i++) await new Promise(r => setTimeout(r, 100));
    assert.ok(dipanggil.some(q => q.includes("hari=7")), "fetch hari=7 tidak terkirim");
    await tab.tungguFungsi("document.querySelectorAll('.kj-corong li').length === 6 && document.querySelector('[data-hari=\"7\"]').getAttribute('aria-pressed') === 'true'");
    await tab.tungguFungsi("!!document.querySelector('[data-urut=nama][data-t=w]')");   // tabel wilayah digambar lewat nanti(), sesudah corong
    await tab.klik("[data-urut=nama][data-t=w]"); await tab.tungguFungsi("document.querySelector('#kjIsiW tr td')?.innerText === 'Kalimantan Tengah' || document.querySelector('#kjIsiW tr td')?.innerText === 'Kalimantan Timur'");
    assert.equal(await tab.eval("document.querySelector('[data-urut=nama][data-t=w]').closest('th').getAttribute('aria-sort')"), "ascending");
    await tab.tungguFungsi("document.querySelector('#kjIsiW tr td')?.innerText === 'Kalimantan Tengah'");   // tbody bisa kosong sesaat saat nanti() menggambar ulang (flaky di CI)
    assert.equal(await tab.eval("document.querySelector('#kjIsiW tr td')?.innerText"), "Kalimantan Tengah");
    await tab.tungguFungsi("!!document.querySelector(\"[data-prov='16']\")");   // baris wilayah digambar ulang lewat nanti() sesudah urut
    await tab.klik("[data-prov='16']"); await tab.tungguFungsi("location.search.includes('prov=16') && document.querySelectorAll('.kj-tw tbody tr').length === 2");
    assert.match(await tab.eval("document.querySelector('#kjChip').innerText"), /Sumatera Selatan/);
    await tab.tungguFungsi("!!document.querySelector('[data-semua]')");
    await tab.klik("[data-semua]"); await tab.tungguFungsi("!location.search.includes('prov=')");
    assert.deepEqual(tab.galat().filter(bukanFavicon), []);
  });
  test("URL langsung memulihkan filter", async () => {
    mode = "ok"; await buka("/admin/kinerja?tab=proses&hari=90&prov=16");
    assert.equal(await tab.eval("document.querySelector('[data-hari=\"90\"]').getAttribute('aria-pressed')"), "true");
    assert.equal(await tab.eval("document.querySelectorAll('.kj-tw tbody tr').length"), 2);
  });
  for (const [m, re] of [["503", /migrasi 0042 dan 0043 belum diterapkan/], ["kosong", /Belum ada data/], ["500", /Gagal memuat/]]) test(`keadaan ${m}`, async () => {
    mode = m; await buka("/admin/kinerja"); mode = "ok";
    assert.match(await tab.teks(), re); assert.ok((await tab.lebihLebar()).sw <= 1441);
    if (m === "500") { await tab.klik("[data-ulang]"); await tab.tungguFungsi("document.querySelectorAll('.kj-s').length === 3"); }
  });
}
