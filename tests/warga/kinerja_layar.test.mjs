/* Uji LAYAR /admin/kinerja di Chrome sungguhan: server Node kecil melayani HTML dari halamanBnpb("kinerja"), berkas public/, dan fixture /api/sla (tanpa D1; rute nyata diuji uji worker).
   Tanpa Chrome seluruh berkas DILEWATI. Jalan: node --test tests/warga/sla_layar.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {halamanBnpb} from "../../src/admin_halaman.js";
import {fixture} from "./_kinerja_fixture.mjs";

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public");
const MIME = {".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json"};
const TERLARANG = /\bNaN\b|\bundefined\b|\bnull\b|\[object|—|\bAnda\b/g;
const bukanFavicon = g => !/favicon\.ico/.test(g);
const CHROME = cariChrome();

/* fixture tab Kesehatan: bentuk sama dengan src/kesehatan.js dan scripts/agents/kesegaran.py */
const WF = [{nama: "Titik Himawari tiap 30 menit", berkas: "himawari.yml", aktif: true, terakhir: {status: "completed", hasil: "failure", umur_jam: 0.4, url: "https://github.com/x/1"}, sukses_umur_jam: 6.2, gagal_beruntun: 3},
  {nama: "Titik panas tiap 3 jam", berkas: "titik.yml", aktif: true, terakhir: {status: "in_progress", hasil: null, umur_jam: 0.1, url: "https://github.com/x/2"}, sukses_umur_jam: 3, gagal_beruntun: 0},
  {nama: "Arsip bulanan dengan nama workflow yang sangat panjang sekali untuk menguji lebar kolom", berkas: "arsip-bulanan-panjang.yml", aktif: false, terakhir: null, sukses_umur_jam: null, gagal_beruntun: 0}];
const KES = m => ({kini: "2026-11-23T04:00:00.000Z", status: {ok: false, basi: ["himawari"], sumber: {titik: {dibuat: "x", umur_jam: 0.3, ambang_jam: 8}, himawari: {dibuat: null, umur_jam: null, ambang_jam: 1}, jeda_satelit: {umur_jam: 2, ambang_jam: null}}},
  workflow: m === "tanpa_token" ? {tersedia: false, alasan: "tanpa token"} : {tersedia: true, daftar: WF},
  d1: m === "tanpa_token" ? {tersedia: false, alasan: "tanpa token"} : {tersedia: true, batas: {baca: 5e6, tulis: 1e5},
    hari: [...Array.from({length: 5}, (_, i) => ({tanggal: `2026-11-${17 + i}`, baca: 3143797, tulis: 12000, kueri_baca: 900000, kueri_tulis: 4000})), {tanggal: "2026-11-22", baca: null, tulis: null, kueri_baca: null, kueri_tulis: null},
      {tanggal: "2026-11-23", baca: 4200000, tulis: 23456, kueri_baca: 1000000, kueri_tulis: 5000}]}});
const BERKAS = {dibuat: "2026-11-23T11:22+07:00", ringkas: {segar: 1, telat: 3, hilang: 1}, ringkas_kesegaran: {segar: 1, basi: 1, mati: 3}, berkas: [{modul: "karhutla", berkas: "public/data/meta.json", batas_jam: 8, sumber: "titik.yml", umur_jam: 0.1, status: "segar", kesegaran: "segar"},
  {modul: "banjir", berkas: "public/banjir/data/meta.json", batas_jam: 30, sumber: "banjir.yml", umur_jam: 41, status: "telat", kesegaran: "basi"},
  {modul: "gempa", berkas: "public/gempa/data/meta.json", batas_jam: 6, sumber: "gempa.yml", stempel: "2026-11-20T08:05+07:00", umur_jam: 75.3, status: "telat", kesegaran: "mati"},
  {modul: "longsor", berkas: "public/longsor/data/meta.json", batas_jam: 24, sumber: "longsor.yml", stempel: null, umur_jam: null, status: "hilang", kesegaran: "mati"},
  {modul: "lama", berkas: "public/lama/data/meta.json", batas_jam: 24, sumber: "lama.yml", umur_jam: 30, status: "telat"}]};   // tanpa kunci kesegaran: status lama jadi cadangan

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
      if (u.pathname === "/api/kesehatan" || u.pathname === "/data/kesegaran.json") { s.setHeader("content-type", "application/json"); return s.end(JSON.stringify(u.pathname === "/api/kesehatan" ? KES(mode) : BERKAS)); }
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
  for (const w of [1440, 375]) test(`tab Kesehatan di ${w}px: workflow gagal di atas, sumber basi, berkas telat, tanpa scroll horizontal dan teks bocor`, async () => {
    mode = "ok"; await buka("/admin/kinerja?tab=kesehatan", w);
    await tab.tungguFungsi("document.querySelectorAll('.ex-tabel tbody tr').length >= 7");
    assert.match(await tab.eval("document.querySelector('.ex-tabel tbody tr')?.innerText"), /Himawari[\s\S]*gagal[\s\S]*3/);
    const t = await tab.teks();
    for (const re of [/workflow gagal terakhir/, /sedang jalan/, /nonaktif/, /basi/, /telat/, /41 jam lalu/, /data tidak tersedia sejak 20-11-2026 08\.05 WIB/, /longsor[\s\S]*mati[\s\S]*data tidak tersedia\b/, /berkas data basi atau mati/, /kuota baca D1 hari ini[\s\S]*84%|84%[\s\S]*kuota baca D1 hari ini/, /4\.200\.000/, /Kuota D1/]) assert.match(t, re);
    assert.deepEqual([...new Set(t.match(TERLARANG) || [])], []);
    assert.doesNotMatch(t, /75,3 jam lalu|SEGAR|BASI|MATI/, "berkas mati tanpa umur; label tanpa kapital");
    const ber = await tab.eval("[...document.querySelectorAll('.ex-tabel')].at(-1).innerText");
    assert.match(ber, /banjir[\s\S]*basi/); assert.match(ber, /lama[\s\S]*telat/);
    assert.equal(await tab.eval("[...document.querySelectorAll('.kj-pil.t-basi')].length >= 1"), true);
    assert.equal(await tab.eval("getComputedStyle(document.querySelector('.kj-bar')).display"), "none", "filter periode dan wilayah tidak berlaku di tab ini");
    assert.ok((await tab.lebihLebar()).sw <= w + 1, "scroll horizontal");
    await tab.klikTeks("[data-tab]", "^Data$"); await tab.tungguFungsi("document.querySelectorAll('.kj-s').length === 3 && !location.search.includes('tab=')");
    assert.deepEqual(tab.galat().filter(bukanFavicon), []);
  });
  test("tab Kesehatan tanpa GITHUB_TOKEN: rak workflow menjelaskan, rak lain tetap terisi", async () => {
    mode = "tanpa_token"; await buka("/admin/kinerja?tab=kesehatan"); mode = "ok";
    await tab.tungguFungsi("/GITHUB_TOKEN belum dipasang/.test(document.body.innerText) && /CF_ANALITIK_TOKEN dan CF_AKUN_ID belum dipasang/.test(document.body.innerText)");
    assert.match(await tab.teks(), /Sumber data sekarang[\s\S]*titik/);
  });
}
