/* Uji LAYAR ISIAN Laporan Berkala (LB-06) di Chrome sungguhan, pola cetak_layar.test.mjs: server Node kecil menyajikan public/ apa adanya,
   berkas angka dari fixture, dan menjawab POST /api/laporan-berkala dengan 404 (rute LB-07 belum ada, sama dengan produksi sekarang).
   Dicek: jenis ketiga di /laporan-bnpb, L13 pemilih periode (masukan cocok, periode berjalan ditolak), kartu per bab berisi angka mesin
   baca saja, ketik masuk memori tanpa localStorage (L12) dan pratinjau tertunda, pilih usulan temuan dengan batas 4, tambah dan hapus baris,
   daftar kekurangan sebelum Bekukan, Simpan dan Bekukan tanpa rute server menulis "belum tersedia", pengingat sebelum keluar, versi beku
   baca saja dan Buat versi baru, isian dari server tampil sebagai teks (L5), dan bentuk isian lolos bersihIsi Worker (batas KEAMANAN-PRIVASI 4).
   Tanpa Chrome seluruh berkas DILEWATI. Jalan: node --test tests/berkala/isian_layar.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";
import * as H from "../../public/laporan_berkala_hitung.js";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUB = path.join(AKAR, "public");
const MIME = {".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".html": "text/html; charset=utf-8"};
const ANGKA = JSON.parse(readFileSync(path.join(AKAR, "tests/berkala/fixtures/angka_bulanan.json"), "utf8"));
const CHROME = cariChrome();
const kiniWib = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

test("jenis ketiga Laporan Berkala ada di deretan jenis /laporan-bnpb, berikon", () => {
  const html = readFileSync(path.join(PUB, "laporan_bnpb.html"), "utf8");
  const tombol = [...html.matchAll(/<button type="button" data-j="(\w+)"[^>]*>(<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map(m => [m[1], !!m[2], m[3]]);
  assert.deepEqual(tombol.map(t => t[0]), ["harian", "presiden", "berkala"]);
  assert.ok(tombol.every(t => t[1]), "tiap pilihan jenis berikon");
  assert.equal(tombol[2][2], "Laporan Berkala");
  assert.match(readFileSync(path.join(PUB, "laporan_bnpb.js"), "utf8"), /dataset\.j === "berkala"\) \{[^}]*location\.href = "\/laporan-bnpb\?jenis=berkala"/);
});

if (!CHROME) test("uji layar isian laporan berkala DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN)"}, () => {});
else {
  let srv, base, br, tab, mode = {angka: ANGKA, baris: null}, kiriman = [];
  before(async () => {
    srv = http.createServer((q, s) => {
      const u = new URL(q.url, "http://x"), json = (o, st = 200) => { s.statusCode = st; s.setHeader("content-type", "application/json"); s.end(JSON.stringify(o)); };
      if (q.method === "POST") { let b = ""; q.on("data", d => { b += d; }); q.on("end", () => { kiriman.push([u.pathname, b]); json({galat: "tidak ada"}, 404); }); return; }
      if (u.pathname === "/laporan-bnpb") { s.setHeader("content-type", MIME[".html"]); return s.end(readFileSync(path.join(PUB, "laporan_bnpb.html"))); }
      if (u.pathname === "/api/laporan-berkala/angka") return mode.angka ? json(mode.angka) : json({galat: "belum ada"}, 404);
      if (u.pathname === "/api/laporan-berkala") return mode.baris ? json(mode.baris) : json({galat: "belum ada"}, 404);
      const f = path.join(PUB, u.pathname);
      if (f.startsWith(PUB) && existsSync(f) && !f.endsWith("/")) { s.setHeader("content-type", MIME[path.extname(f)] || "application/octet-stream"); return s.end(readFileSync(f)); }
      s.statusCode = 404; s.end();
    });
    await new Promise(ok => srv.listen(0, "127.0.0.1", ok)); base = "http://127.0.0.1:" + srv.address().port;
    br = await bukaPeramban(CHROME); tab = await br.tab();
  });
  after(async () => { await tab?.tutup(); await br?.tutup(); srv?.close(); });
  const URL_LB = "/laporan-bnpb?jenis=berkala&periode=bulanan&kode=2026-10";
  const buka = async (url = URL_LB) => {
    await tab.ukuran(1440, 900); await tab.buka(base + url);
    await tab.tungguFungsi("!document.querySelector('#lbkCetak')?.disabled && !!window.__lbk", 15000);
    await tab.eval("window.confirm = () => true; true");
  };
  /* ketik seperti pengguna: nilai lalu peristiwa input yang menggelembung; kembalikan lama handler (ms) */
  const ketik = (sel, v) => tab.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; const t = performance.now();
    e.dispatchEvent(new Event("input", {bubbles: true})); return performance.now() - t; })()`);
  const st = () => tab.eval("document.querySelector('#lbkSt').textContent");
  const galatHalaman = () => tab.galat().filter(g => !/favicon|status of 404/.test(g));

  test("L13 pemilih periode: masukan cocok per periode, batas paling akhir, periode berjalan ditolak tanpa pindah halaman", async () => {
    mode = {angka: ANGKA, baris: null}; await buka();
    const jenis = await tab.eval("[...document.querySelectorAll('.lbk .lb-jenis button')].map(b => [b.dataset.j, b.getAttribute('aria-pressed'), !!b.querySelector('svg')])");
    assert.deepEqual(jenis, [["harian", "false", true], ["presiden", "false", true], ["berkala", "true", true]]);
    const seg = await tab.eval("[...document.querySelectorAll('.lbk-seg label')].map(l => { const r = l.getBoundingClientRect(); return [l.querySelector('input').value, !!l.querySelector('svg'), Math.round(r.width)]; })");
    assert.deepEqual(seg.map(x => x[0]), ["harian", "mingguan", "bulanan", "tahunan"]);
    assert.ok(seg.every(x => x[1]), "tiap periode berikon");
    assert.ok(Math.max(...seg.map(x => x[2])) - Math.min(...seg.map(x => x[2])) <= 1, `deretan periode dibagi rata: ${seg.map(x => x[2])}`);
    const kini = kiniWib(), harap = {harian: "date", mingguan: "week", bulanan: "month", tahunan: "text"};
    for (const p of Object.keys(harap)) {
      await tab.eval(`document.querySelector('.lbk-seg input[value=${p}]').click(); true`);
      const [type, max, nilai, label] = await tab.eval("(() => { const i = document.querySelector('#lbkKode'); return [i.type, i.max, i.value, document.querySelector('#lbkKodeL').textContent]; })()");
      assert.equal(type, harap[p], p);
      assert.equal(nilai, H.kodeTerakhir(p, kini), `${p}: bawaan = periode lengkap terakhir`);
      if (p !== "tahunan") assert.equal(max, H.kodeTerakhir(p, kini), `${p}: max`);
      assert.ok(label.length > 0);
    }
    const berjalan = {harian: kini, mingguan: H.mingguIso(kini), bulanan: kini.slice(0, 7), tahunan: kini.slice(0, 4)};
    for (const [p, k] of Object.entries(berjalan)) {
      await tab.eval(`document.querySelector('.lbk-seg input[value=${p}]').click(); true`);
      await tab.eval(`(() => { const i = document.querySelector('#lbkKode'); i.value = ${JSON.stringify(k)}; i.dispatchEvent(new Event('input', {bubbles: true})); document.querySelector('#lbkPilih').requestSubmit(); return true; })()`);
      assert.match(await tab.eval("document.querySelector('#lbkKode').validationMessage"), /belum selesai/, `${p} ${k}`);
      assert.equal(await tab.eval("document.querySelector('#lbkKode').getAttribute('aria-invalid')"), "true");
      assert.equal(await tab.eval("location.search"), "?jenis=berkala&periode=bulanan&kode=2026-10", "periode berjalan tidak membuka halaman");
    }
    await tab.eval("document.querySelector('.lbk-seg input[value=tahunan]').click(); const i = document.querySelector('#lbkKode'); i.value = '25'; document.querySelector('#lbkPilih').requestSubmit(); true");
    assert.match(await tab.eval("document.querySelector('#lbkKode').validationMessage"), /bentuk 2025/);
    assert.deepEqual(galatHalaman(), []);
  });

  test("tanpa kode: halaman membuka bulan lengkap terakhir; mingguan dan tahunan tanpa berkas angka menulis belum tersedia", async () => {
    mode = {angka: null, baris: null}; await tab.ukuran(1440, 900); await tab.buka(base + "/laporan-bnpb?jenis=berkala");
    await tab.tungguFungsi("/belum tersedia/.test(document.querySelector('#lbkSt')?.textContent || '')");
    assert.equal(await tab.eval("new URLSearchParams(location.search).get('kode')"), H.kodeTerakhir("bulanan", kiniWib()));
    await tab.buka(base + "/laporan-bnpb?jenis=berkala&periode=mingguan&kode=2026-W45");
    await tab.tungguFungsi("/belum tersedia/.test(document.querySelector('#lbkSt')?.textContent || '')");
    assert.equal(await tab.eval("document.querySelector('.lbk-isian').hidden"), true);
    assert.equal(await tab.eval("document.querySelector('#lbkJudul').textContent"), "Laporan Mingguan 2026-W45 (2 November 2026 sampai 8 November 2026)");
    await tab.buka(base + "/laporan-bnpb?jenis=berkala&periode=tahunan&kode=2025");
    await tab.tungguFungsi("/belum tersedia/.test(document.querySelector('#lbkSt')?.textContent || '')");
    assert.equal(await tab.eval("document.querySelector('.lbk-isian').hidden"), true);
  });

  test("LB-11 kartu isian harian dan mingguan: tanpa dukungan dan arahan (Q27), harian satu action plan", async () => {
    const fx = p => JSON.parse(readFileSync(path.join(AKAR, `tests/berkala/fixtures/angka_${p}.json`), "utf8"));
    const kepala = () => tab.eval("[...document.querySelectorAll('.lbk-isian details.ex-std')].map(d => d.querySelector('h3').textContent)");
    mode = {angka: fx("harian"), baris: null}; await buka("/laporan-bnpb?jenis=berkala&periode=harian&kode=2026-10-31");
    assert.deepEqual(await kepala(), ["Ringkasan", "Action plan"]);
    assert.equal(await tab.eval("document.querySelectorAll('[data-p^=\"action.\"]').length"), 3, "satu kotak action plan: sudah, sedang, akan");
    assert.equal(await tab.eval("document.querySelectorAll('[data-p=arahan],[data-daftar=dukungan],[data-daftar=temuan_ringkas]').length"), 0);
    mode = {angka: fx("mingguan"), baris: null}; await buka("/laporan-bnpb?jenis=berkala&periode=mingguan&kode=2026-W43");
    assert.deepEqual(await kepala(), ["Ringkasan", "Gambaran umum", "Karhutla", "Banjir dan tanah longsor", "Cuaca ekstrem dan kekeringan", "Geologi dan vulkanologi", "Kegiatan minggu ini"]);
    assert.equal(await tab.eval("document.querySelectorAll('[data-p=arahan],[data-daftar=dukungan]').length"), 0);
    assert.ok(await tab.eval("!!document.querySelector('[data-daftar=temuan_ringkas]')"));
    assert.deepEqual(galatHalaman(), []);
  });

  test("kartu per bab: angka mesin baca saja, kolom staf kosong berpil belum diisi, tanpa kalimat kesimpulan di kepala", async () => {
    mode = {angka: ANGKA, baris: null}; await buka();
    const kepala = await tab.eval("[...document.querySelectorAll('.lbk-isian details.ex-std')].map(d => [d.querySelector('.ex-ey').textContent.trim(), d.querySelector('h3').textContent, !!d.querySelector('.ex-ey svg'), !!d.querySelector('h3 .hl')])");
    assert.deepEqual(kepala.map(k => k[1]), ["Ringkasan Eksekutif", "Gambaran umum", "Karhutla", "Banjir dan tanah longsor", "Cuaca ekstrem dan kekeringan", "Geologi dan vulkanologi", "Program kerja", "Prediksi dan dukungan", "Sampul dan tanda tangan"]);
    assert.ok(kepala.every(k => k[2] && !k[3]), "kepala = nama bab berikon, tanpa angka sorot");
    const mesin = await tab.eval("[...document.querySelectorAll('.lbk-isian details')[0].querySelectorAll('.lbk-mesin dd')].map(d => d.textContent)");
    assert.deepEqual(mesin.slice(0, 2), ["58", "57"], "dua angka Q28 dari berkas angka, tanpa dihitung ulang");
    assert.equal(await tab.eval("document.querySelectorAll('.lbk-mesin input,.lbk-mesin textarea').length"), 0, "angka mesin bukan kolom isian");
    const pil = () => tab.eval("getComputedStyle(document.querySelector('#lbkf-pembuka').closest('.lbk-f').querySelector('.lbk-kosong')).display");
    assert.equal(await pil(), "inline-block");
    await ketik("#lbkf-pembuka", "Kalimat pembuka staf.");
    assert.equal(await pil(), "none");
    const teks = await tab.eval("document.querySelector('.lbk-alat').innerText + document.querySelector('.lbk-isian').innerText");
    assert.doesNotMatch(teks, /·|\bNaN\b|\bundefined\b|\bnull\b|\baman\b/);
    assert.deepEqual([...new Set(teks.match(/\b[A-Z]{3,}\b/g) || [])].filter(x => !["BNPB", "DIBI", "OMC", "RONI", "PDF", "KB", "WIB", "III", "PVMBG", "BMKG", "ASO", "NOAA", "CPC"].includes(x)), [], "tanpa kata kapital selain singkatan");
  });

  test("ketik: masuk memori, tanpa localStorage (L12), handler cepat, pratinjau tertunda, pita belum tersimpan, pengingat keluar", async () => {
    mode = {angka: ANGKA, baris: null}; await buka();
    assert.equal(await tab.eval("document.querySelector('#lbkServer').hidden"), true);
    const ms = await ketik("#lbkf-action-bab2-sudah", "Water bombing 120 sorti.");
    assert.ok(ms < 30, `handler input ${ms.toFixed(1)} ms; kerja berat harus tertunda`);
    assert.equal(await tab.eval("window.__lbk.I.action.bab2.sudah"), "Water bombing 120 sorti.");
    assert.equal(await tab.eval("document.querySelector('#lbkKertas').innerText.includes('Water bombing 120 sorti.')"), false, "pratinjau belum digambar di peristiwa yang sama");
    await tab.tungguFungsi("document.querySelector('#lbkKertas').innerText.includes('Water bombing 120 sorti.')", 5000);
    assert.equal(await tab.eval("document.querySelector('#lbkServer').hidden"), false);
    assert.equal(await tab.eval("document.querySelector('#lbkServer').textContent"), "Belum tersimpan di server");
    await ketik("#lbkf-laporan-situasi", "31");
    assert.equal(await tab.eval("window.__lbk.I.laporan_situasi"), 31);
    await ketik("#lbkf-laporan-situasi", "");
    assert.equal(await tab.eval("'laporan_situasi' in window.__lbk.I"), false, "kosong dihapus, tidak jadi 0");
    assert.equal(await tab.eval("localStorage.length + sessionStorage.length"), 0, "L12");
    assert.equal(await tab.eval("(() => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; })()"), true, "pengingat sebelum keluar");
  });

  test("usulan temuan: pilih paling banyak 4, sisanya nonaktif, kalimat boleh disunting, temuan sendiri wajib sumber", async () => {
    mode = {angka: ANGKA, baris: null}; await buka();
    const kotak = "[data-daftar=temuan_ringkas] input[data-usul]";
    assert.equal(await tab.eval(`document.querySelectorAll('${kotak}').length`), ANGKA.usulan_temuan.length);
    for (let i = 0; i < 4; i++) await tab.eval(`document.querySelectorAll('${kotak}')[${i}].click(); true`);
    assert.deepEqual(await tab.eval("window.__lbk.I.temuan_ringkas.map(t => t.kode)"), ANGKA.usulan_temuan.slice(0, 4).map(t => t.kode));
    assert.deepEqual(await tab.eval(`[...document.querySelectorAll('${kotak}')].map(x => x.disabled)`), ANGKA.usulan_temuan.map((_, i) => i >= 4));
    assert.equal(await tab.eval("document.querySelector('[data-daftar=temuan_ringkas] .lbk-tambah').disabled"), true);
    assert.equal(await tab.eval("document.activeElement?.dataset?.usul"), "temuan_ringkas", "fokus tetap di kotak centang sesudah daftar digambar ulang");
    await ketik("#lbkf-temuan-ringkas-0-kalimat", "Kalimat disunting staf, 4 provinsi.");
    assert.equal(await tab.eval("window.__lbk.I.temuan_ringkas[0].kalimat"), "Kalimat disunting staf, 4 provinsi.");
    await tab.eval(`document.querySelectorAll('${kotak}')[1].click(); true`);
    assert.equal(await tab.eval("window.__lbk.I.temuan_ringkas.length"), 3);
    await tab.eval("document.querySelector('[data-daftar=temuan_ringkas] .lbk-tambah').click(); true");
    assert.deepEqual(await tab.eval("window.__lbk.I.temuan_ringkas[3]"), {pil: "data", judul: "", kalimat: "", sumber: ""});
    assert.equal(await tab.eval("document.activeElement?.id"), "lbkf-temuan-ringkas-3-pil", "fokus ke baris baru");
    await tab.tungguFungsi("[...document.querySelectorAll('#lbkKurang li')].some(li => li.textContent === 'Ringkasan Eksekutif: temuan tanpa kalimat atau sumber')", 5000);
    await tab.eval("document.querySelector('[data-hapus=\"temuan_ringkas.3\"]').click(); true");
    assert.equal(await tab.eval("window.__lbk.I.temuan_ringkas.length"), 3);
  });

  test("kekurangan sebelum Bekukan, isian lengkap lolos bersihIsi, Simpan dan Bekukan tanpa rute server tidak mengaku tersimpan", async () => {
    mode = {angka: ANGKA, baris: null}; kiriman = []; await buka();
    await tab.eval("document.querySelector('#lbkBekukan').click(); true");
    const kurang = await tab.eval("[...document.querySelectorAll('#lbkKurang li')].map(li => li.textContent)");
    assert.ok(kurang.includes("Ringkasan Eksekutif: kalimat pembuka") && kurang.includes("Bab 7.2: dukungan yang dimohon"), kurang.join("; "));
    assert.equal(await tab.eval("document.activeElement?.id"), "lbkKurangW", "fokus ke daftar kekurangan");
    assert.match(await st(), /Belum bisa dibekukan/);
    assert.equal(kiriman.length, 0, "isian kurang tidak dikirim");
    await ketik("#lbkf-pembuka", "Kalimat pembuka.");
    for (const b of ["bab1", "bab2", "bab3", "bab4", "bab5"]) await ketik(`#lbkf-action-${b}-sudah`, `Langkah ${b}.`);
    await tab.eval("document.querySelector('[data-daftar=temuan_ringkas] input[data-usul]').click(); document.querySelector('[data-tambah=dukungan]').click(); true");
    await ketik("#lbkf-dukungan-0-langkah", "<b>Dukungan</b> anggaran");
    await tab.eval("document.querySelector('[data-tambah=kegiatan]').click(); true");
    await ketik("#lbkf-kegiatan-0-tautan", "javascript:alert(1)");
    await ketik("#lbkf-kota", "Jakarta"); await ketik("#lbkf-tanggal", "2026-11-12");
    await tab.eval("document.querySelector('#lbkBekukan').click(); true");
    await tab.tungguFungsi("/Bekukan di server belum tersedia|Penyimpanan draf di server belum tersedia/.test(document.querySelector('#lbkSt').textContent)", 5000);
    assert.match(await st(), /Penyimpanan draf di server belum tersedia\. Isian hanya ada di halaman ini/);
    assert.equal(await tab.eval("document.querySelector('#lbkServer').hidden"), false, "tetap ditandai belum tersimpan");
    assert.deepEqual(kiriman.map(k => k[0]), ["/api/laporan-berkala"], "Bekukan menyimpan draf dulu; gagal simpan = tidak membekukan");
    const isi = JSON.parse(kiriman[0][1]);
    assert.deepEqual(Object.keys(isi).sort(), ["diubah", "isian", "kode", "periode", "tarik"]);
    assert.equal(isi.periode, "bulanan"); assert.equal(isi.kode, "2026-10");
    assert.deepEqual(H.kelengkapan(ANGKA, isi.isian, "bulanan"), [], "isian lengkap menurut modul kelengkapan yang sama dengan server");
    await import("../../src/worker.js");   // urutan impor: laporan_bnpb.js berputar lewat worker.js
    const {bersihIsi} = await import("../../src/laporan_bnpb.js");
    assert.deepEqual(bersihIsi(isi.isian), isi.isian, "bentuk isian muat batas bersihIsi Worker");
    await tab.tungguFungsi("document.querySelector('#lbkKertas').innerText.includes('<b>Dukungan</b> anggaran')", 5000);
    assert.equal(await tab.eval("document.querySelectorAll('#lbkKertas b').length > 0 && ![...document.querySelectorAll('#lbkKertas b')].some(b => b.textContent === 'Dukungan')"), true, "L5 teks isian tampil sebagai teks");
    assert.equal(await tab.eval("document.querySelectorAll('#lbkKertas a[href^=javascript]').length"), 0, "L6");
    assert.equal(await tab.eval("document.querySelector('#lbkKurangW').hidden"), true, "kekurangan habis");
    assert.equal(await tab.eval("localStorage.length"), 0);
  });

  test("versi beku: isian baca saja, Buat versi baru membuka draf; isian dari server tampil sebagai teks", async () => {
    const isian = {pembuka: "<img src=x onerror=alert(1)>Pembuka beku.", kota: "Jakarta", dukungan: [{langkah: "Langkah beku"}], temuan_ringkas: [{kode: "T2", pil: "data", kalimat: "Disunting.", sumber: "DIBI"}]};
    mode = {angka: ANGKA, baris: {versi: 2, isian}}; await buka();
    assert.equal(await tab.eval("document.querySelector('#lbkIsianFs').disabled"), true);
    assert.deepEqual(await tab.eval("['#lbkSimpan', '#lbkBekukan', '#lbkVersi'].map(s => document.querySelector(s).hidden)"), [true, true, false]);
    assert.equal(await tab.eval("document.querySelector('#lbkf-pembuka').value"), isian.pembuka);
    assert.equal(await tab.eval("document.querySelectorAll('.lbk-isian img').length"), 0);
    assert.equal(await tab.eval("document.querySelector('[data-daftar=temuan_ringkas] input[value=T2]').checked"), true);
    assert.match(await st(), /^Beku versi 2/);
    await tab.eval("document.querySelector('#lbkVersi').click(); true");
    assert.equal(await tab.eval("document.querySelector('#lbkIsianFs').disabled"), false);
    assert.equal(await tab.eval("document.querySelector('#lbkServer').hidden"), false);
    await tab.tungguFungsi("document.querySelectorAll('.lbk-air').length > 0", 5000);
    assert.deepEqual(galatHalaman(), []);
  });
}
