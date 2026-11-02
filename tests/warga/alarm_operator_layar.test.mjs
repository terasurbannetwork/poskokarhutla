/* Pop-up alarm (public/inti/alarm.js) di PERAMBAN NYATA (Chrome headless lewat CDP) melawan worker utuh di workerd (Miniflare) dengan D1 lokal.
   Dibuktikan: (1) TIDAK ADA bunyi saat halaman dibuka/dimuat ulang, (2) bunyi hanya untuk alert yang baru masuk sesudah jajak pertama,
   (3) tombol tindak lanjut di kartu bekerja ujung ke ujung (Dalam konfirmasi -> Ada api -> baris cc_jejak), (4) operator: alert karhutla yang belum final muncul lagi
   pada pemuatan berikutnya, yang final tidak, satu kartu pada satu waktu, (5) pengunjung publik: sekali per perangkat. play()/pause() dipalsukan lewat skrip awal CDP.
   Dilewati dengan pesan jelas bila Chrome tidak ada. Jalankan: node --test tests/warga/alarm_operator_layar.test.mjs */
import assert from "node:assert/strict";
import path from "node:path";
import {existsSync, readFileSync} from "node:fs";
import {Miniflare} from "miniflare";
import {after} from "node:test";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import {sha256, berantai} from "./_bnpb.mjs";
import {cariChrome, bukaPeramban} from "../bnpb/_peramban.mjs";
import {periksaPeringatan} from "../../src/peringatan.js";

const uji = berantai(), CHROME = cariChrome(), MENIT = 6e4, JAM = 36e5;
if (!CHROME) uji("alarm operator layar DILEWATI: Chrome tidak ditemukan", async () => {});
else {
  /* halaman uji minimal: hanya memuat /inti/alarm.js (index.html utuh butuh peta/tile) */
  const HALAMAN = `<!doctype html><meta charset="utf-8"><title>uji alarm</title><body><script src="/inti/alarm.js"></script>`;
  const aset = async req => {
    const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
    if (p === "/uji-alarm.html") return new Response(HALAMAN, {headers: {"content-type": "text/html"}});
    const jenis = {".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mp3": "audio/mpeg", ".html": "text/html"}[path.extname(p)];
    return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f), {headers: jenis ? {"content-type": jenis} : {}}) : new Response("tidak ada", {status: 404});
  };
  const mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    cf: {country: "ID", colo: "CGK"}, d1Databases: {DB: "uji-alarm-layar"}, port: 0, host: "127.0.0.1",
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SESI_KUNCI: "kunci-sesi-uji", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), CC_MEMO_DETIK: "0"},
    serviceBindings: {ASSETS: aset}, outboundService: () => new Response("diblok di uji", {status: 599}), cache: false});
  after(() => mf.dispose());
  const base = (await mf.ready).origin, DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));

  const id = "5001" + "d".repeat(12), tok = sha256("tok-" + id);
  await DB.batch([DB.prepare("INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy) VALUES (?, 'alarmstaf1xx', 'Budi Santoso', '90001000', 'Unit Uji', 's1@b.id', '628120000001', ?, '[]', ?, ?, 0, 1, 'tes', 0)")
      .bind(id, JSON.stringify(["operator_cc"]), "g".repeat(32), "a".repeat(64)),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 5 * JAM)]);
  const tugas = async (urut, kab, kec) => {
    const t = Date.now() - 10 * MENIT, tid = urut.toString(16).padStart(4, "0").padEnd(16, "c");
    await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy) VALUES (?, '11', ?, ?, 5.5, 95.3, 3, 12, 45.5, ?, ?, 'buka', NULL, 0)").bind(tid, kab, kec, t, t).run();
    return tid;
  };
  const bentuk = () => periksaPeringatan({DB, ASSETS: {fetch: aset}}, Date.now());
  const T1 = await tugas(0x4001, "Kota Banda Aceh", "Kuta Alam"), T2 = await tugas(0x4002, "Aceh Besar", "Darul Imarah");
  await bentuk();
  assert.equal((await (await fetch(base + "/api/peringatan/aktif")).json()).peringatan.filter(a => a.jenis === "karhutla").length, 2, "pembentukan peringatan menghasilkan 2 alert karhutla");

  const STUB = `window.__bunyi = {play: 0}; HTMLMediaElement.prototype.play = function () { window.__bunyi.play++; return Promise.resolve(); }; HTMLMediaElement.prototype.pause = function () {};`;
  const br = await bukaPeramban(CHROME);
  after(() => br.tutup());
  const tidur = ms => new Promise(r => setTimeout(r, ms));
  async function tabBaru() {
    const tab = await br.tab(); await tab.ukuran(1280, 900);
    await tab.kirim("Page.addScriptToEvaluateOnNewDocument", {source: STUB});
    return tab;
  }
  const cookie = async (tab, nilai) => { await tab.kirim("Network.deleteCookies", {name: "sesi_staf", url: base}); if (nilai) await tab.cookie(base, "sesi_staf", nilai); };
  const q = (tab, js) => tab.eval(`(() => { const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)]; return (${js}); })()`);
  const buka = async tab => { await tab.buka(base + "/uji-alarm.html"); await tab.tungguFungsi("document.querySelector('.al')", 12000); };
  const judul = tab => q(tab, "q('.al h3').textContent");
  const tutup = async tab => { await tab.klik(".al [data-tutup]"); await tab.tungguFungsi("!document.querySelector('.al')"); };
  const jajakUlang = tab => tab.eval(`document.dispatchEvent(new Event("visibilitychange"))`);
  const status = tid => DB.prepare("SELECT status FROM cc_status WHERE tugas_id = ?").bind(tid).first().then(r => r?.status ?? null);
  const idDari = j => /Kuta Alam/.test(j) ? T1 : T2;

  uji("alarm operator (Chrome): kartu + tindak lanjut ujung ke ujung, muncul lagi sampai final, tanpa bunyi saat muat, bunyi hanya alert baru", async () => {
    const tab = await tabBaru(); await cookie(tab, tok);
    await buka(tab);
    assert.equal(await q(tab, "qa('.al').length"), 1, "satu kartu pada satu waktu (dua alert antre)");
    await tab.tungguFungsi("document.querySelector('.al .al-op')");
    assert.equal(await q(tab, "window.__bunyi.play"), 0, "dibuka: tidak ada bunyi untuk operator");
    const j1 = await judul(tab), A = idDari(j1), B = A === T1 ? T2 : T1;
    assert.match(await q(tab, "q('.al-op').innerText"), /Baru[\s\S]*Belum ada yang memegang/);
    /* Dalam konfirmasi lalu Ada api, lewat klik */
    await tab.klik('.al-op button[data-ke="dalam_konfirmasi"]');
    await tab.tungguFungsi("/Dalam konfirmasi/.test(document.querySelector('.al-op .al-p').textContent) && document.querySelector('.al-op button[data-ke=\"ada_api\"]')");
    assert.equal(await status(A), "dalam_konfirmasi");
    await tab.klik('.al-op button[data-ke="ada_api"]');
    await tab.tungguFungsi("/Ada api/.test(document.querySelector('.al-op .al-p').textContent) && /Diputuskan/.test(document.querySelector('.al-op').innerText)");
    assert.equal(await status(A), "ada_api");
    const jejak = (await DB.prepare("SELECT dari, ke FROM cc_jejak WHERE tugas_id = ? ORDER BY id").bind(A).all()).results;
    assert.deepEqual(jejak.map(r => `${r.dari}>${r.ke}`), ["baru>dalam_konfirmasi", "dalam_konfirmasi>ada_api"], "jejak tercatat");
    /* tutup: kartu kedua muncul (alert B, belum final), tidak membanjiri */
    await tutup(tab); await tab.tungguFungsi("document.querySelector('.al')");
    assert.notEqual(await judul(tab), j1); assert.equal(await q(tab, "qa('.al').length"), 1);
    assert.equal(await status(B), null);
    /* muat ulang: yang final (A) tidak muncul; B (belum final) muncul lagi walau sudah pernah tampil; tanpa bunyi */
    await buka(tab); await tab.tungguFungsi("document.querySelector('.al .al-op')");
    assert.notEqual(await judul(tab), j1, "alert final tidak muncul lagi"); const jB = await judul(tab);
    assert.equal(await q(tab, "window.__bunyi.play"), 0, "dimuat ulang: tanpa bunyi");
    await tutup(tab); await tidur(1500);
    assert.equal(await q(tab, "qa('.al').length"), 0, "tutup hanya menyembunyikan untuk halaman ini; yang final tidak datang");
    assert.equal(await q(tab, "window.__bunyi.play"), 0);
    /* alert BARU masuk saat halaman terbuka: kartu + SATU bunyi */
    const T3 = await tugas(0x4003, "Aceh Tamiang", "Karang Baru"); await bentuk(); await jajakUlang(tab);
    await tab.tungguFungsi("document.querySelector('.al .al-op')", 10000);
    assert.match(await judul(tab), /Karang Baru/); assert.equal(await q(tab, "window.__bunyi.play"), 1, "alert baru sesudah halaman terbuka: berbunyi sekali");
    await jajakUlang(tab); await tidur(1500); assert.equal(await q(tab, "window.__bunyi.play"), 1, "tidak ada pengulangan bunyi");
    /* tidak diputuskan: muat ulang memunculkannya lagi (B juga, karena belum final); pengunjung lain tak terpengaruh */
    await buka(tab); await tab.tungguFungsi("document.querySelector('.al .al-op')");
    assert.notEqual(await judul(tab), j1, "yang final (A) tetap tidak kembali");
    assert.equal(await q(tab, "window.__bunyi.play"), 0);
    assert.equal(await status(T3), null);
    await tab.tutup();
  });

  uji("alarm publik (Chrome): sekali per perangkat, tanpa bagian operator, tanpa bunyi saat muat", async () => {
    const tab = await tabBaru(); await cookie(tab, null);
    await tab.buka(base + "/uji-alarm.html"); await tab.eval("localStorage.clear()"); await buka(tab);
    assert.equal(await q(tab, "qa('.al-op').length"), 0, "publik: tanpa bagian tindak lanjut");
    assert.equal(await q(tab, "window.__bunyi.play"), 0);
    /* tiga alert belum final (sisa uji operator): tampil satu per satu, masing-masing sekali */
    const lihat = [];
    for (let i = 0; i < 3; i++) { await tab.tungguFungsi("document.querySelector('.al')"); lihat.push(await judul(tab)); await tutup(tab); await tidur(600); }
    assert.equal(new Set(lihat).size, 3, "tiga kartu berbeda");
    await tab.buka(base + "/uji-alarm.html"); await tidur(5000);
    assert.equal(await q(tab, "qa('.al').length"), 0, "publik: yang sudah dilihat tidak muncul lagi walau belum final");
    assert.equal(await q(tab, "window.__bunyi.play"), 0);
    await tab.tutup();
  });
}
