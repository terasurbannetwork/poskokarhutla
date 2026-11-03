/* Command center karhutla di PERAMBAN NYATA (Chrome headless lewat CDP) melawan worker utuh di workerd (Miniflare) dengan D1 lokal: meja operator (/command-center).
   Dibuktikan di DOM sungguhan: kartu antrean, tel:, transisi lewat klik, 409, log, SENYAP TOTAL (tidak ada play() maupun objek Audio walau navigator.userActivation sudah aktif, tidak ada
   gerbang/lencana suara), operator yang masuk lewat form staf diarahkan ke peta utama, dan nol pelanggaran CSP. play()/pause() dan Audio dipalsukan lewat skrip awal CDP (hitung panggilan);
   ubin peta openfreemap diblokir (peramban di CI tak punya internet).
   Dilewati dengan pesan jelas bila Chrome tidak ada. Jalankan: node --test tests/warga/command_center_layar.test.mjs */
import assert from "node:assert/strict";
import path from "node:path";
import {existsSync, readFileSync} from "node:fs";
import {Miniflare} from "miniflare";
import {after} from "node:test";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import {sha256, berantai} from "./_bnpb.mjs";
import {cariChrome, bukaPeramban} from "../bnpb/_peramban.mjs";
/* kata yang dihapus dari konsep command center (keputusan pemilik 2 Nov 2026); dirakit supaya berkas ini sendiri bersih dari kata itu */
const LAMA = "shi" + "ft", TANPA_LAMA = (teks, ket) => assert.ok(!new RegExp(LAMA, "i").test(teks), "tidak boleh memuat kata lama: " + ket);

const uji = berantai(), CHROME = cariChrome(), MENIT = 6e4, JAM = 36e5;
if (!CHROME) uji("cc layar DILEWATI: Chrome tidak ditemukan", async () => {});
else {
  const aset = async req => {
    const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
    const jenis = {".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mp3": "audio/mpeg", ".html": "text/html"}[path.extname(p)];   // modul ES (import() maplibre.js) menuntut MIME JavaScript, seperti aset Cloudflare sungguhan
    return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f), {headers: jenis ? {"content-type": jenis} : {}}) : new Response("tidak ada", {status: 404});
  };
  const mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    cf: {country: "ID", colo: "CGK"}, d1Databases: {DB: "uji-cc-layar"}, port: 0, host: "127.0.0.1",
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SESI_KUNCI: "kunci-sesi-uji", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), CC_MEMO_DETIK: "0"},
    serviceBindings: {ASSETS: aset}, outboundService: () => new Response("diblok di uji", {status: 599}), cache: false});
  after(() => mf.dispose());
  const base = (await mf.ready).origin, DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));

  /* ---------------- penyemai ---------------- */
  let n = 0;
  const staf = async (nama, peran) => {
    const i = ++n, id = "5" + i.toString(16).padStart(3, "0") + "d".repeat(12), tok = sha256("tok-" + id);
    await DB.batch([DB.prepare("INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy) VALUES (?, ?, ?, ?, 'Unit Uji', ?, ?, ?, '[]', ?, ?, 0, 1, 'tes', 0)")
        .bind(id, "layarstaf" + i + "xx", nama, "9000" + i + "000", `s${i}@b.id`, "62812000" + String(i).padStart(4, "0"), JSON.stringify(peran), "g".repeat(32), "a".repeat(64)),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 5 * JAM)]);
    return {id, tok};
  };
  const tugas = async (urut, o) => {
    const id = urut.toString(16).padStart(4, "0").padEnd(16, "c"), t = Date.now(), r = {prov: "11", kab: "Kota Banda Aceh", kec: "Kuta Alam", lat: 5.55123, lon: 95.32456, n24: 12, luas_ha: 45.5, dibuat: t - 10 * MENIT, konfirmasi_pada: null, ...o};
    await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy) VALUES (?, ?, ?, ?, ?, ?, 3, ?, ?, ?, ?, 'buka', ?, 0)")
      .bind(id, r.prov, r.kab, r.kec, r.lat, r.lon, r.n24, r.luas_ha, r.dibuat, r.dibuat, r.konfirmasi_pada).run();
    return id;
  };
  const op = await staf("Budi Santoso", ["operator_cc"]), koord = await staf("Koordinator Uji", ["koordalops"]), rekan = await staf("Citra Dewi", ["operator_cc"]);
  const T1 = await tugas(0x3001, {dibuat: Date.now() - 20 * MENIT}), T2 = await tugas(0x3002, {kab: "Aceh Besar", kec: "Darul Imarah", lat: 5.4, lon: 95.5, dibuat: Date.now() - 12 * MENIT, konfirmasi_pada: Date.now() - 5 * MENIT});
  const T3 = await tugas(0x3003, {kab: "Aceh Tamiang", kec: "Karang Baru", lat: 4.3, lon: 98.0, dibuat: Date.now() - 40 * MENIT});
  await DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'dalam_konfirmasi', ?, ?, 0)").bind(T3, "staf:" + rekan.id, Date.now() - 8 * MENIT).run();
  /* titik panas: 3 lokasi unik + 1 duplikat lokasi (satelit lain) + 1 lebih tua dari 24 jam; putaran dibuat 5 jam lalu = basi (batas 4 jam) */
  const acuan = Date.now(), baris = [[5.55, 95.32, -1, "N20", 10, 2, 0, "11-01"], [5.55, 95.32, -0.5, "N21", 11, 2, 0, "11-01"], [4.3, 98.0, -2, "N", 5, 1, 0, "11-01"], [-2.5, 113.3, -3, "M", 7, 1, 0, "11-01"], [-3.1, 114.1, -30, "N20", 9, 2, 0, "10-31"]];
  await DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(acuan - 5 * JAM, JSON.stringify({kolom: [], acuan: new Date(acuan).toISOString(), dibuat: new Date(acuan - 5 * JAM).toISOString(), wilayah: ["11|Kota Banda Aceh|Kuta Alam"], baris})).run();

  /* ---------------- peramban ---------------- */
  /* hitung SEMUA upaya bunyi: play(), pause(), konstruktor Audio; dan paksa navigator.userActivation.hasBeenActive = true (pemicu keluhan: alarm langsung berbunyi saat halaman dibuka) */
  const STUB = `window.__bunyi = {play: 0, pause: 0, audio: 0}; HTMLMediaElement.prototype.play = function () { window.__bunyi.play++; return Promise.resolve(); }; HTMLMediaElement.prototype.pause = function () { window.__bunyi.pause++; };
    const AudioAsli = window.Audio; window.Audio = function (...a) { window.__bunyi.audio++; return new AudioAsli(...a); };
    Object.defineProperty(Navigator.prototype, "userActivation", {get: () => ({hasBeenActive: true, isActive: true}), configurable: true});`;
  const br = await bukaPeramban(CHROME);
  after(() => br.tutup());
  const BLOKIR = ["*openfreemap.org*", "*fonts.googleapis.com*", "*fonts.gstatic.com*"];
  async function tabBaru(lebar, tinggi) {
    const tab = await br.tab(); await tab.ukuran(lebar, tinggi);
    await tab.kirim("Page.addScriptToEvaluateOnNewDocument", {source: STUB}); await tab.kirim("Network.setBlockedURLs", {urls: BLOKIR});
    return tab;
  }
  const cookie = async (tab, nama, nilai) => { await tab.kirim("Network.deleteCookies", {name: "sesi_staf", url: base}); await tab.kirim("Network.deleteCookies", {name: "sesi_pemirsa", url: base}); if (nilai) await tab.cookie(base, nama, nilai); };
  const bersih = tab => tab.galat().filter(g => !/openfreemap|fonts\.g|ERR_BLOCKED_BY_CLIENT|status of 409|favicon\.ico/.test(g));   // 409 = CAS kalah balapan yang memang diuji; pemblokiran sengaja
  const tidur = ms => new Promise(r => setTimeout(r, ms));
  const jajakUlang = tab => tab.eval(`document.dispatchEvent(new Event("visibilitychange"))`);
  /* jajak berantai tidak menumpuk: pemicu yang jatuh saat jajak sedang jalan dibuang (jajak berikutnya baru 30 dtk lagi). Ulangi pemicu sampai kondisi terpenuhi, bukan satu kali lalu menunggu. */
  const sampai = async (tab, js, ms = 20000) => { const t0 = Date.now(); for (;;) { if (await tab.eval(js)) return; if (Date.now() - t0 > ms) throw new Error(`kondisi tidak terpenuhi dalam ${ms} ms: ${js.slice(0, 120)}`); await jajakUlang(tab); await tidur(700); } };
  const q = (tab, js) => tab.eval(`(() => { const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)]; return (${js}); })()`);

  uji("cc layar meja (Chrome): kartu antrean, tel:, transisi lewat klik, catatan koreksi wajib, 409, log, SENYAP total (nol play()/Audio walau userActivation aktif), nol pelanggaran CSP", async () => {
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok);
    await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
    /* senyap total: userActivation sudah aktif (stub), alert baru ada, tetapi tidak ada gerbang, lencana, play() maupun Audio */
    assert.equal(await q(tab, "navigator.userActivation.hasBeenActive"), true, "prasyarat: halaman dianggap sudah pernah diketuk");
    assert.equal(await q(tab, "qa('.cc-gerbang, .cc-gerbang-tombol, .cc-gerbang-lewat, .cc-senyap').length"), 0, "tanpa gerbang atau lencana suara");
    assert.deepEqual(await q(tab, "window.__bunyi"), {play: 0, pause: 0, audio: 0}, "meja dibuka: tidak ada play(), pause(), atau Audio");
    assert.equal(await q(tab, "qa('a[href*=\"dinding\"]').length"), 0, "tidak ada tombol layar dinding");
    const tanpaSuara = await q(tab, "document.documentElement.outerHTML");
    assert.doesNotMatch(tanpaSuara, /\.mp3|\bAudio\b|SENYAP|Ketuk untuk menyalakan|layar dinding/i, "DOM meja tidak memuat bunyi");
    /* kartu: urutan baru (terlama dulu), dalam konfirmasi menyusul; badge konfirmasi lapangan; pemegang; nomor BPBD bertombol tel: */
    const kartu = await q(tab, "qa('.cc-kartu').map(k => ({s: k.dataset.status, judul: k.querySelector('h3').textContent, lap: !!k.querySelector('.cc-lap'), btn: [...k.querySelectorAll('button[data-ke]')].map(b => b.dataset.ke), teks: k.innerText}))");
    assert.deepEqual(kartu.map(k => k.s), ["baru", "baru", "dalam_konfirmasi"]); assert.match(kartu[0].judul, /Kuta Alam, Kota Banda Aceh/); assert.match(kartu[1].judul, /Darul Imarah, Aceh Besar/);
    assert.equal(kartu[1].lap, true); assert.equal(kartu[0].lap, false); assert.match(kartu[1].teks, /BPBD sudah konfirmasi lapangan/);
    assert.deepEqual(kartu[0].btn, ["dalam_konfirmasi"]); assert.deepEqual(kartu[2].btn, ["ada_api", "tidak_ada_api"]); assert.match(kartu[2].teks, /Dipegang Citra Dewi sejak \d\d\.\d\d/); assert.match(kartu[0].teks, /Belum ada yang memegang/);
    assert.match(kartu[0].teks, /\d+ menit/, "umur format Indonesia");
    assert.match(kartu[0].teks, /46 ha/, "luas satelit 45,5 dibulatkan (resolusi kasar, sama dengan ciriTugas dan pop-up): 46 ha"); assert.doesNotMatch(kartu[0].teks, /45,5/);
    await tab.tungguFungsi("document.querySelector('.cc-kartu .cc-tel')"); assert.match(await q(tab, "q('.cc-kartu .cc-tel').getAttribute('href')"), /^tel:\+?\d+$/);
    assert.equal(await q(tab, "qa('.cc-kartu .cc-tel').every(a => /^tel:[+\\d]+$/.test(a.getAttribute('href')))"), true);
    assert.deepEqual(await q(tab, "({cc: qa('.cc-chip b').map(b => b.textContent)})"), {cc: ["2", "1", "0"]});
    /* dipegang sejak KEMARIN: waktu bertanggal ("30 Okt 09.15"), bukan jam yang terbaca pagi ini; hari ini tetap hanya jam */
    await DB.prepare("UPDATE cc_status SET sejak = ? WHERE tugas_id = ?").bind(Date.now() - 2 * 24 * JAM, T3).run(); await jajakUlang(tab);
    await tab.tungguFungsi(`/Dipegang Citra Dewi sejak \\d{1,2} \\p{L}+ \\d\\d\\.\\d\\d/u.test(document.querySelector('.cc-kartu[data-id="${T3}"]').innerText)`);
    await DB.prepare("UPDATE cc_status SET sejak = ? WHERE tugas_id = ?").bind(Date.now() - 8 * MENIT, T3).run(); await jajakUlang(tab);
    await tab.tungguFungsi(`/Dipegang Citra Dewi sejak \\d\\d\\.\\d\\d ·/.test(document.querySelector('.cc-kartu[data-id="${T3}"]').innerText)`);
    /* dibuat 2 HARI lalu (alert tampil sampai 7 hari): baris "dibuat" bertanggal seperti "Dipegang", bukan jam yang terbaca pagi ini; hari ini tetap hanya jam. Kartu sementara, dibuang sebelum langkah berikut. */
    const T4 = await tugas(0x3004, {kab: "Aceh Jaya", kec: "Teunom", dibuat: Date.now() - 2 * 24 * JAM}); await jajakUlang(tab);
    await tab.tungguFungsi(`document.querySelector('.cc-kartu[data-id="${T4}"]')`);
    assert.match(await q(tab, `q('.cc-kartu[data-id="${T4}"] .cc-meta').innerText`), /dibuat \d{1,2} \p{L}+ \d\d\.\d\d · umur/u, "alert kemarin: tanggal ikut tampil");
    assert.match(await q(tab, `q('.cc-kartu[data-id="${T1}"] .cc-meta').innerText`), /dibuat \d\d\.\d\d · umur/, "alert hari ini: jam saja");
    await DB.prepare("DELETE FROM tugas_api WHERE id = ?").bind(T4).run(); await jajakUlang(tab);
    await tab.tungguFungsi(`!document.querySelector('.cc-kartu[data-id="${T4}"]')`);
    /* ambil alert pertama */
    await tab.klik('.cc-kartu[data-status="baru"] button[data-ke="dalam_konfirmasi"]');
    await tab.tungguFungsi("document.querySelectorAll('.cc-kartu[data-status=\"dalam_konfirmasi\"]').length === 2");
    assert.equal((await DB.prepare("SELECT status, oleh FROM cc_status WHERE tugas_id = ?").bind(T1).first()).oleh, "staf:" + op.id); assert.match(await q(tab, "document.querySelector('.cc-spanduk').innerText"), /Kuta Alam, Kota Banda Aceh: Dalam konfirmasi/);
    await tab.klik('.cc-kartu[data-status="baru"] button[data-ke="dalam_konfirmasi"]');
    await tab.tungguFungsi("document.querySelectorAll('.cc-kartu[data-status=\"baru\"]').length === 0");
    assert.deepEqual(await q(tab, "window.__bunyi"), {play: 0, pause: 0, audio: 0}, "sesudah klik dan jajak: tetap senyap");
    /* keputusan akhir dengan catatan; koreksi tanpa catatan ditolak di klien tanpa menulis jejak */
    await q(tab, `(() => { const k = q('.cc-kartu[data-id="${T1}"]'), i = k.querySelector('input.cc-catatan'); i.value = 'Kalak BPBD: api sudah padam'; i.dispatchEvent(new Event('input', {bubbles: true})); })()`);
    await tab.klik(`.cc-kartu[data-id="${T1}"] button[data-ke="tidak_ada_api"]`);
    await tab.tungguFungsi(`document.querySelector('.cc-kartu[data-id="${T1}"]').dataset.status === 'tidak_ada_api'`);
    assert.equal((await DB.prepare("SELECT catatan FROM cc_jejak WHERE tugas_id = ? AND ke = 'tidak_ada_api'").bind(T1).first()).catatan, "Kalak BPBD: api sudah padam");
    assert.match(await q(tab, `q('.cc-kartu[data-id="${T1}"]').innerText`), /Diputuskan Budi Santoso pukul \d\d\.\d\d/);
    const jejak0 = (await DB.prepare("SELECT count(*) n FROM cc_jejak WHERE tugas_id = ?").bind(T1).first()).n;
    await tab.klik(`.cc-kartu[data-id="${T1}"] button[data-ke="dalam_konfirmasi"]`);
    assert.match(await q(tab, "q('.cc-spanduk').innerText"), /Koreksi wajib bercatatan/); assert.equal((await DB.prepare("SELECT count(*) n FROM cc_jejak WHERE tugas_id = ?").bind(T1).first()).n, jejak0);
    /* 409: rekan memutuskan lebih dulu (D1 langsung); klik kartu basi => pesan + muat ulang, tanpa jejak palsu */
    await DB.prepare("UPDATE cc_status SET status = 'ada_api', oleh = ?, sejak = ? WHERE tugas_id = ?").bind("staf:" + rekan.id, Date.now(), T3).run();
    const jejakT3 = (await DB.prepare("SELECT count(*) n FROM cc_jejak WHERE tugas_id = ?").bind(T3).first()).n;
    await tab.klik(`.cc-kartu[data-id="${T3}"] button[data-ke="tidak_ada_api"]`);
    await tab.tungguFungsi(`document.querySelector('.cc-kartu[data-id="${T3}"]').dataset.status === 'ada_api'`);
    assert.match(await q(tab, "q('.cc-spanduk').innerText"), /Sudah diubah oleh Citra Dewi pukul \d\d\.\d\d menjadi "Ada api"/); assert.equal((await DB.prepare("SELECT count(*) n FROM cc_jejak WHERE tugas_id = ?").bind(T3).first()).n, jejakT3, "kalah balapan: tanpa jejak");
    /* log */
    await tab.klikTeks(".cc-tab", "^Log$"); await tab.tungguFungsi("document.querySelectorAll('.cc-log-isi .cc-tabel').length === 2");
    const log = await q(tab, "({baris: qa('.cc-log-isi .cc-tabel')[1].querySelectorAll('tbody tr').length, ring: qa('.cc-log-isi .cc-tabel')[0].innerText, csv: q('.cc-saring a').getAttribute('href'), ops: qa('.cc-saring select')[0].innerText})");
    assert.equal(log.baris, 3, "dua ambil + satu keputusan"); assert.match(log.ring, /Budi Santoso/); assert.match(log.csv, /^\/api\/cc\/log\?.*format=csv/); assert.match(log.ops, /Budi Santoso/);
    assert.deepEqual(bersih(tab), [], "tidak ada galat konsol atau pelanggaran CSP");
    await tab.tutup();
  });

  /* masuk lewat satu pintu /admin/masuk: operator_cc SAJA ke peta utama "/", ?ke= yang sah menang, peran lain tetap di Meja Pantau */
  const stafLogin = async (nama, peran) => {
    const i = ++n, id = "6" + i.toString(16).padStart(3, "0") + "f".repeat(12), garam = "h".repeat(32), sandi = "sandi-uji-" + i;
    await DB.prepare("INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy) VALUES (?, ?, ?, ?, 'Unit Uji', ?, ?, ?, '[]', ?, ?, 0, 1, 'tes', 0)")
      .bind(id, "masukstaf" + i + "xx", nama, "8000" + i + "000", `m${i}@b.id`, "62813000" + String(i).padStart(4, "0"), JSON.stringify(peran), garam, sha256(garam + sandi)).run();
    return {username: "masukstaf" + i + "xx", sandi};
  };
  uji("cc layar masuk staf (Chrome): operator_cc saja diarahkan ke peta utama '/'; ?ke= sah menang; operator + peran lain dan koordalops tetap ke Meja Pantau", async () => {
    const masuk = async (akun, ke = "") => {
      const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", null);
      await tab.buka(base + "/admin/masuk" + (ke ? "?ke=" + encodeURIComponent(ke) : ""), {tunggu: "#email"});
      await tab.eval(`(() => { document.getElementById("email").value = ${JSON.stringify(akun.username)}; document.getElementById("sandi").value = ${JSON.stringify(akun.sandi)}; document.querySelector(".ad-tombol-masuk").click(); })()`);
      return tab;
    };
    const op1 = await stafLogin("Operator Saja", ["operator_cc"]);
    let tab = await masuk(op1); await tab.tungguFungsi(`location.pathname === "/"`, 15000); await tab.tutup();
    tab = await masuk(op1, "/command-center"); await tab.tungguFungsi(`location.pathname === "/command-center"`, 15000); await tab.tutup();
    tab = await masuk(op1, "https://jahat.example/x"); await tab.tungguFungsi(`location.pathname === "/"`, 15000); assert.equal(await q(tab, "location.origin"), base, "?ke= berupa URL penuh diabaikan"); await tab.tutup();
    const campur = await stafLogin("Operator Campur", ["operator_cc", "pusdalops"]), koordP = await stafLogin("Koord Masuk", ["koordalops"]);
    for (const akun of [campur, koordP]) { tab = await masuk(akun); await tab.tungguFungsi(`document.querySelector(".pt-judul, h1, .pt-butir, .pt-kosong, .pt-bar") && location.pathname === "/admin/pantau"`, 15000); await tab.tutup(); }
  });

  uji("cc layar meja (Chrome): koordalops hanya melihat (tanpa tombol aksi, tanpa nomor BPBD), tanpa gerbang suara", async () => {
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", koord.tok);
    await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
    assert.equal(await q(tab, "qa('button[data-ke], input.cc-catatan, .cc-kontak').length"), 0); assert.match(await q(tab, "q('.cc-info').innerText"), /Koordinator Uji \(hanya melihat\)/);
    assert.equal(await q(tab, "qa('.cc-gerbang, .cc-senyap').length"), 0); assert.equal(await q(tab, "window.__bunyi.play + window.__bunyi.audio"), 0, "pembaca juga senyap");
    assert.deepEqual(bersih(tab), []); await tab.tutup();
  });

  uji("cc layar Meja Pantau (Chrome): kartu api memakai komponen Meja Pantau yang ada; operator melihat status + tombol transisi dan tidak melihat 'Buka layar kerja'; koreksi wajib catatan; 409; riwayat memuat log cc; koordalops hanya melihat; pusdalops tetap punya tautan", async () => {
    const lama = Date.now() - 8 * JAM, sebut = id => `li.pt-butir[data-id="api-konf:${id}"]`;
    const [PA, PB, PC, PD, PE] = [await tugas(0x3301, {kab: "Kab Pantau Satu", kec: "Kec Satu", dibuat: lama}), await tugas(0x3302, {kab: "Kab Pantau Dua", kec: "Kec Dua", dibuat: lama}),
      await tugas(0x3303, {kab: "Kab Pantau Tiga", kec: "Kec Tiga", dibuat: lama}), await tugas(0x3304, {kab: "Kab Pantau Empat", kec: "Kec Empat", dibuat: lama}),
      await tugas(0x3305, {kab: "Kab Pantau Lima", kec: "Kec Lima", dibuat: Date.now() - 8 * 24 * JAM})];   // PE: level 3 tetapi sudah 8 hari = bukan alert karena UMUR (bukan karena level)
    const PF = await tugas(0x3306, {kab: "Kab Pantau Enam", kec: "Kec Enam", dibuat: lama}), PG = await tugas(0x3307, {kab: "Kab Pantau Tujuh", kec: "Kec Tujuh", dibuat: Date.now() - 4 * 24 * JAM});
    await DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'tidak_ada_api', ?, ?, 0)").bind(PG, "staf:" + rekan.id, Date.now() - 3 * 24 * JAM).run();   // diputuskan 3 hari lalu: waktu bertanggal
    await DB.prepare("UPDATE tugas_api SET level = 2 WHERE id = ?").bind(PB).run();   // bukan alert level 3
    await DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'dalam_konfirmasi', ?, ?, 0)").bind(PC, "staf:" + rekan.id, Date.now() - 2 * 24 * JAM).run();   // dipegang sejak kemarin: waktu bertanggal
    await DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'ada_api', ?, ?, 0)").bind(PD, "staf:" + rekan.id, Date.now() - 20 * JAM).run();   // diputuskan > 12 jam lalu: sudah hilang dari antrean cc, tetap alert
    const pusd = await staf("Pusdalops Pantau", ["pusdalops"]), css = readFileSync(path.join(AKAR, "public/admin/pantau.css"), "utf8");
    const kartu = (tab, id) => q(tab, `(() => { const k = q('${sebut(id)}'); if (!k) return null; const cc = k.querySelector('[data-cc]');
      return {cc: cc?.dataset.cc ?? null, pil: [...k.querySelectorAll('[data-cc] .pt-pil')].map(p => p.textContent), teks: k.innerText, tombol: [...k.querySelectorAll('button[data-cc-ke]')].map(b => b.dataset.ccKe + ':' + b.textContent),
        kerja: [...k.querySelectorAll('a.pt-btn')].filter(a => /Buka layar kerja/.test(a.textContent)).map(a => a.getAttribute('href')),
        kelas: [...new Set([...k.querySelectorAll('[data-cc], [data-cc] *, [data-cc-ke], .pt-aksi:has([data-cc-ke]), [data-koreksi-form], [data-koreksi-form] *')].flatMap(e => [...e.classList]))]}; })()`);
    const jejakN = id => DB.prepare("SELECT count(*) n FROM cc_jejak WHERE tugas_id = ?").bind(id).first().then(r => r.n);
    const pesanPantau = tab => q(tab, "q('#ptPesan').innerText");

    /* ---- operator_cc ---- */
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok);
    await tab.buka(base + "/admin/pantau", {tunggu: sebut(PA)}); await tab.tungguFungsi(`document.querySelectorAll('li.pt-butir').length >= 5 && !document.querySelector('.pt-redup.pt-catatan + .pt-redup')`);
    assert.equal(await q(tab, "qa('a.pt-btn').filter(a => /Buka layar kerja/.test(a.textContent)).length + qa('a[href*=\"/admin/instansi\"]').length"), 0, "operator tidak boleh membuka /admin/instansi: tidak ada tombol buntu");
    assert.equal(await q(tab, "qa('link[href*=\"command_\"], script[src*=\"command_\"]').length"), 0, "command_bersama/command_center tidak dimuat di Meja Pantau");
    let a = await kartu(tab, PA); assert.deepEqual([a.cc, a.pil, a.tombol], ["baru", ["Baru"], ["dalam_konfirmasi:Dalam konfirmasi"]]); assert.match(a.teks, /Tindak lanjut command center/); assert.match(a.teks, /Belum ada yang memegang/);
    const b = await kartu(tab, PB); assert.equal(b.cc, null); assert.deepEqual(b.tombol, []); assert.match(b.teks, /Bukan alert level 3: tidak ada tindak lanjut operator/);
    const e = await kartu(tab, PE); assert.equal(e.cc, null); assert.deepEqual(e.tombol, []); assert.match(e.teks, /Alert level 3 sudah lewat 7 hari: tidak ada tindak lanjut operator/); assert.doesNotMatch(e.teks, /Bukan alert level 3/, "level 3 berumur 8 hari: keterangan tidak boleh menyangkal levelnya");
    const c = await kartu(tab, PC); assert.deepEqual([c.cc, c.pil, c.tombol], ["dalam_konfirmasi", ["Dalam konfirmasi"], ["ada_api:Ada api", "tidak_ada_api:Tidak ada api"]]); assert.match(c.teks, /Dipegang Citra Dewi sejak \d{1,2} \p{L}+ \d\d\.\d\d/u, "dipegang sejak kemarin: bertanggal");
    const d = await kartu(tab, PD); assert.deepEqual([d.cc, d.pil, d.tombol], ["ada_api", ["Ada api"], ["dalam_konfirmasi:Koreksi"]]); const hariWib = ms => Math.floor((ms + 7 * JAM) / (24 * JAM)), sejakD = (await DB.prepare("SELECT sejak FROM cc_status WHERE tugas_id = ?").bind(PD).first()).sejak;
    assert.match(d.teks, hariWib(sejakD) === hariWib(Date.now()) ? /Diputuskan Citra Dewi pukul \d\d\.\d\d/ : /Diputuskan Citra Dewi pada \d{1,2} \p{L}+ \d\d\.\d\d/u, "jam saja memakai 'pukul'; bila tanggal ikut, 'pada'");
    const g = await kartu(tab, PG); assert.deepEqual([g.cc, g.pil, g.tombol], ["tidak_ada_api", ["Tidak ada api"], ["dalam_konfirmasi:Koreksi"]]); assert.match(g.teks, /Diputuskan Citra Dewi pada \d{1,2} \p{L}+ \d\d\.\d\d/u, "diputuskan 3 hari lalu: 'pada' + tanggal"); assert.doesNotMatch(g.teks, /pukul/, "'pukul' tidak boleh mendahului tanggal");
    /* gaya: HANYA kelas yang sudah didefinisikan pantau.css (tombol, pil, baris, meta, form alasan) */
    for (const x of [a, b, c, d, e, g]) for (const k of x.kelas) assert.ok(css.includes("." + k), `kelas "${k}" tidak ada di pantau.css: kartu api tak boleh membawa gaya baru`);
    assert.ok(!/<style|style=/.test(await q(tab, "document.querySelector('.pt-isi').innerHTML")), "tanpa gaya sebaris");
    /* riwayat dibuka dulu, lalu 'Dalam konfirmasi': status DAN riwayat ikut berubah */
    await tab.klik(`${sebut(PA)} button[data-aksi="riwayat"]`); await tab.tungguFungsi(`/Belum ada riwayat/.test(document.querySelector('${sebut(PA)} [data-riwayat]').innerText)`);
    await tab.klik(`${sebut(PA)} button[data-cc-ke="dalam_konfirmasi"]`);
    await tab.tungguFungsi(`document.querySelector('${sebut(PA)} [data-cc]')?.dataset.cc === 'dalam_konfirmasi' && /Budi Santoso: tindak lanjut Baru → Dalam konfirmasi/.test(document.querySelector('${sebut(PA)} [data-riwayat]')?.innerText ?? '')`);
    assert.equal((await DB.prepare("SELECT status, oleh FROM cc_status WHERE tugas_id = ?").bind(PA).first()).oleh, "staf:" + op.id); assert.equal(await pesanPantau(tab), "Tindak lanjut tersimpan.");
    a = await kartu(tab, PA); assert.match(a.teks, /Dipegang Budi Santoso sejak \d\d\.\d\d/); assert.deepEqual(a.tombol, ["ada_api:Ada api", "tidak_ada_api:Tidak ada api"]);
    assert.match(await q(tab, `q('${sebut(PA)} [data-riwayat]').innerText`), /\d{1,2} \p{L}+ \d\d\.\d\d WIB, Budi Santoso: tindak lanjut Baru → Dalam konfirmasi/u);
    /* keputusan akhir langsung, tanpa catatan */
    await tab.klik(`${sebut(PA)} button[data-cc-ke="ada_api"]`); await tab.tungguFungsi(`document.querySelector('${sebut(PA)} [data-cc]')?.dataset.cc === 'ada_api'`);
    assert.match(await q(tab, `q('${sebut(PA)} [data-riwayat]').innerText`), /Dalam konfirmasi → Ada api/);
    /* koreksi: input kecil, catatan >= 3 huruf; Batal menutup tanpa menulis */
    const n0 = await jejakN(PD);
    await tab.klik(`${sebut(PD)} button[data-cc-ke="dalam_konfirmasi"]`); await tab.tungguFungsi(`document.querySelector('${sebut(PD)} [data-koreksi-form]')`);
    assert.equal(await q(tab, "document.activeElement?.id"), "ptKoreksi", "fokus langsung di input catatan"); assert.equal(await jejakN(PD), n0, "membuka form tidak menulis");
    await tab.klik(`${sebut(PD)} button[data-cc-batal]`); await tab.tungguFungsi(`!document.querySelector('${sebut(PD)} [data-koreksi-form]')`);
    await tab.klik(`${sebut(PD)} button[data-cc-ke="dalam_konfirmasi"]`); await tab.tungguFungsi(`document.querySelector('${sebut(PD)} [data-koreksi-form]')`);
    await q(tab, `(() => { const f = q('${sebut(PD)} [data-koreksi-form]'); f.elements.catatan.value = ' ab '; f.requestSubmit(); })()`);
    assert.match(await q(tab, `q('${sebut(PD)} [data-koreksi-galat]').innerText`), /minimal 3 huruf/); assert.equal(await jejakN(PD), n0, "catatan terlalu pendek: ditolak di klien, tanpa kiriman");
    await q(tab, `(() => { const f = q('${sebut(PD)} [data-koreksi-form]'); f.elements.catatan.value = 'Salah catat, BPBD membatalkan'; f.requestSubmit(); })()`);
    await tab.tungguFungsi(`document.querySelector('${sebut(PD)} [data-cc]')?.dataset.cc === 'dalam_konfirmasi' && !document.querySelector('${sebut(PD)} [data-koreksi-form]')`);
    const kj = await DB.prepare("SELECT dari, ke, catatan, oleh FROM cc_jejak WHERE tugas_id = ?").bind(PD).first(); assert.deepEqual(kj, {dari: "ada_api", ke: "dalam_konfirmasi", catatan: "Salah catat, BPBD membatalkan", oleh: "staf:" + op.id});
    /* 409: rekan memutuskan lebih dulu; klik kartu basi => pesan singkat + kartu dimuat ulang, tanpa jejak palsu */
    const nc = await jejakN(PC); await DB.prepare("UPDATE cc_status SET status = 'ada_api', oleh = ?, sejak = ? WHERE tugas_id = ?").bind("staf:" + rekan.id, Date.now(), PC).run();
    await tab.klik(`${sebut(PC)} button[data-cc-ke="tidak_ada_api"]`);
    await tab.tungguFungsi(`document.querySelector('${sebut(PC)} [data-cc]')?.dataset.cc === 'ada_api'`);
    assert.match(await pesanPantau(tab), /Sudah diubah oleh Citra Dewi pukul \d\d\.\d\d menjadi "Ada api"/); assert.equal(await q(tab, "q('#ptPesan').className"), "pt-pesan galat"); assert.equal(await jejakN(PC), nc, "kalah balapan: tanpa jejak");
    /* 409 yang waktunya bertanggal: kalimat baku "pada 29 Okt 09.15", bukan "pukul 29 Okt 09.15". Kartu PG di layar masih tidak_ada_api; rekan sudah mengubahnya (3 hari lalu) */
    await DB.prepare("UPDATE cc_status SET status = 'ada_api', oleh = ?, sejak = ? WHERE tugas_id = ?").bind("staf:" + rekan.id, Date.now() - 3 * 24 * JAM, PG).run();
    await tab.klik(`${sebut(PG)} button[data-cc-ke="dalam_konfirmasi"]`); await tab.tungguFungsi(`document.querySelector('${sebut(PG)} [data-koreksi-form]')`);
    await q(tab, `(() => { const f = q('${sebut(PG)} [data-koreksi-form]'); f.elements.catatan.value = 'Salah catat lama'; f.requestSubmit(); })()`);
    await tab.tungguFungsi(`document.querySelector('${sebut(PG)} [data-cc]')?.dataset.cc === 'ada_api'`);
    assert.match(await pesanPantau(tab), /^Sudah diubah oleh Citra Dewi pada \d{1,2} \p{L}+ \d\d\.\d\d menjadi "Ada api"/u); assert.doesNotMatch(await pesanPantau(tab), /pukul/);
    /* catatan koreksi yang sedang diketik bertahan lintas render (Riwayat di kartu yang sama, ganti penyaring, muat ulang sesudah aksi di kartu lain); fokus hanya diberikan saat form DIBUKA, tidak dicuri dari kontrol yang sedang dipakai */
    const inp = id => `${sebut(id)} #ptKoreksi`, tandai = id => q(tab, `(() => { q('${inp(id)}').__lama = true; })()`), nilai = id => q(tab, `q('${inp(id)}')?.value ?? null`);
    const baru = id => tab.tungguFungsi(`(() => { const i = document.querySelector('${inp(id)}'); return i && !i.__lama; })()`), alihFokus = () => q(tab, "(() => { q('#ptProv').focus(); return document.activeElement.id; })()");
    const ketik = (id, teks) => q(tab, `(() => { const i = q('${inp(id)}'); i.value = ${JSON.stringify(teks)}; i.dispatchEvent(new Event('input', {bubbles: true})); })()`);
    await tab.klik(`${sebut(PA)} button[data-cc-ke="dalam_konfirmasi"]`); await tab.tungguFungsi(`document.querySelector('${inp(PA)}')`);
    assert.equal(await q(tab, "document.activeElement?.id"), "ptKoreksi", "dibuka lewat klik Koreksi: fokus ke input"); await ketik(PA, "Catatan sementara BPBD");
    const bertahan = async dari => { assert.equal(await nilai(PA), "Catatan sementara BPBD", "catatan utuh: " + dari); assert.notEqual(await q(tab, "document.activeElement?.id"), "ptKoreksi", "fokus tidak dicuri: " + dari); };
    await alihFokus(); await tandai(PA); await tab.klik(`${sebut(PA)} button[data-aksi="riwayat"]`); await baru(PA); await bertahan("Riwayat di kartu yang sama");
    await alihFokus(); await tandai(PA); await tab.klik('button.pt-chip[data-jenis=""]'); await baru(PA); await bertahan("ganti penyaring");
    await alihFokus(); await tandai(PA); await tab.klik(`${sebut(PF)} button[data-cc-ke="dalam_konfirmasi"]`);
    await tab.tungguFungsi(`document.querySelector('${sebut(PF)} [data-cc]')?.dataset.cc === 'dalam_konfirmasi'`); await baru(PA); await bertahan("muat ulang sesudah aksi di kartu lain");
    await q(tab, `q('${sebut(PA)} [data-koreksi-form]').requestSubmit()`);
    await tab.tungguFungsi(`document.querySelector('${sebut(PA)} [data-cc]')?.dataset.cc === 'dalam_konfirmasi' && !document.querySelector('${sebut(PA)} [data-koreksi-form]')`);
    assert.equal((await DB.prepare("SELECT catatan FROM cc_jejak WHERE tugas_id = ? ORDER BY id DESC LIMIT 1").bind(PA).first()).catatan, "Catatan sementara BPBD", "catatan yang tersimpan = yang diketik sebelum kartu dibangun ulang");
    /* satu form koreksi saja: membuka kartu lain menutup yang tadi dan membuang drafnya */
    await tab.klik(`${sebut(PA)} button[data-cc-ke="ada_api"]`); await tab.tungguFungsi(`document.querySelector('${sebut(PA)} [data-cc]')?.dataset.cc === 'ada_api'`);
    await tab.klik(`${sebut(PA)} button[data-cc-ke="dalam_konfirmasi"]`); await tab.tungguFungsi(`document.querySelector('${inp(PA)}')`); await ketik(PA, "draf kartu lama");
    await tab.klik(`${sebut(PC)} button[data-cc-ke="dalam_konfirmasi"]`); await tab.tungguFungsi(`document.querySelector('${inp(PC)}')`);
    assert.equal(await q(tab, "qa('[data-koreksi-form]').length"), 1, "form koreksi hanya di satu kartu"); assert.equal(await q(tab, `document.activeElement === q('${inp(PC)}')`), true, "kartu yang baru dibuka mendapat fokus");
    await tab.klik(`${sebut(PC)} button[data-cc-batal]`); await tab.tungguFungsi(`!document.querySelector('[data-koreksi-form]')`);
    await tab.klik(`${sebut(PA)} button[data-cc-ke="dalam_konfirmasi"]`); await tab.tungguFungsi(`document.querySelector('${inp(PA)}')`); assert.equal(await nilai(PA), "", "draf kartu yang ditutup tidak bangkit lagi");
    await tab.klik(`${sebut(PA)} button[data-cc-batal]`); await tab.tungguFungsi(`!document.querySelector('[data-koreksi-form]')`);
    await tab.ukuran(375, 800); const lb = await tab.lebihLebar(); assert.ok(lb.sw <= lb.iw, `ponsel 375 px: blok tindak lanjut dan tombolnya tidak melebarkan halaman (${lb.sw} > ${lb.iw})`);
    assert.deepEqual(bersih(tab), [], "tanpa galat konsol atau pelanggaran CSP"); await tab.tutup();

    /* ---- koordalops: status dan pemegang saja ---- */
    const tk = await tabBaru(1440, 900); await cookie(tk, "sesi_staf", koord.tok);
    await tk.buka(base + "/admin/pantau", {tunggu: sebut(PA)}); await tk.tungguFungsi(`document.querySelectorAll('li.pt-butir').length >= 4`);
    for (const id of [PA, PC, PD]) { const x = await kartu(tk, id); assert.ok(x.cc && x.pil.length === 1, "pil status ada"); assert.deepEqual(x.tombol, [], "pembaca cc tanpa tombol"); }
    assert.match((await kartu(tk, PD)).teks, /Dipegang Budi Santoso sejak/); assert.doesNotMatch((await kartu(tk, PB)).teks, /Bukan alert level 3/, "keterangan itu hanya untuk operator_cc"); assert.doesNotMatch((await kartu(tk, PE)).teks, /Alert level 3 sudah lewat 7 hari|tidak ada tindak lanjut operator/, "keterangan umur juga hanya untuk operator_cc"); assert.equal((await kartu(tk, PB)).cc, null);
    assert.equal(await q(tk, "qa('a.pt-btn').filter(a => /Buka layar kerja/.test(a.textContent)).length"), 0, "koordalops juga tidak boleh membuka /admin/instansi");
    assert.deepEqual(bersih(tk), []); await tk.tutup();

    /* ---- pusdalops: tautan tetap ada, tanpa blok cc ---- */
    const tp = await tabBaru(1440, 900); await cookie(tp, "sesi_staf", pusd.tok);
    await tp.buka(base + "/admin/pantau", {tunggu: sebut(PA)}); await tp.tungguFungsi(`document.querySelectorAll('li.pt-butir').length >= 4`);
    const pa = await kartu(tp, PA); assert.deepEqual(pa.kerja, ["/admin/instansi#pantau/" + PA], "peran yang berhak: tautan tetap, deep link utuh"); assert.equal(pa.cc, null); assert.deepEqual(pa.tombol, []);
    assert.equal(await q(tp, "qa('[data-cc], [data-cc-ke]').length"), 0, "tanpa hak baca cc: tidak ada blok cc sama sekali"); assert.doesNotMatch(await tp.teks(), /Tindak lanjut command center|Bukan alert level 3|Alert level 3 sudah lewat 7 hari/);
    assert.deepEqual(bersih(tp), []); await tp.tutup();
    await DB.prepare("DELETE FROM tugas_api WHERE id IN (?, ?, ?, ?, ?, ?, ?)").bind(PA, PB, PC, PD, PE, PF, PG).run(); await DB.prepare("DELETE FROM cc_status WHERE tugas_id IN (?, ?, ?, ?, ?, ?, ?)").bind(PA, PB, PC, PD, PE, PF, PG).run();
  });

  uji("cc layar meja (Chrome): alasan koreksi yang sedang diketik tidak terputus oleh alert baru (urutan berubah) maupun kartunya dibangun ulang: fokus, nilai, dan kursor bertahan", async () => {
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok);
    const F1 = await tugas(0x3201, {kab: "Kab Fokus Satu", dibuat: Date.now() - 50 * MENIT}); await DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'dalam_konfirmasi', ?, ?, 0)").bind(F1, "staf:" + op.id, Date.now() - 3 * MENIT).run();
    await tab.buka(base + "/command-center", {tunggu: `.cc-kartu[data-id="${F1}"]`});
    const sel = `.cc-kartu[data-id="${F1}"] input[data-catatan]`;
    await tab.tungguFungsi(`(() => { const k = document.querySelector('.cc-kartu[data-id="${F1}"] .cc-kontak'); return k && !/Memuat/.test(k.innerText); })()`);   // nomor BPBD selesai dimuat: kartu tidak akan dibangun ulang karenanya
    /* operator mengetik "abc" di kartu dan menaruh kursor di tengah; tandai elemen supaya terlihat apakah kartu ini dibangun ulang */
    await q(tab, `(() => { const i = q('${sel}'); i.focus(); i.value = 'abc'; i.dispatchEvent(new Event('input', {bubbles: true})); i.setSelectionRange(1, 2); i.__lama = true; })()`);
    const keadaan = () => q(tab, `({aktif: document.activeElement === q('${sel}'), tag: document.activeElement.tagName, nilai: q('${sel}').value, lama: !!q('${sel}').__lama, mulai: q('${sel}').selectionStart, akhir: q('${sel}').selectionEnd, kartu: qa('.cc-kartu').length})`);
    const k0 = (await keadaan()).kartu;
    /* (1) alert BARU masuk di depan (urutan berubah): kartu F1 tidak dicabut, jadi tidak kehilangan fokus */
    await tugas(0x3202, {kab: "Kab Fokus Baru", dibuat: Date.now() - 2 * MENIT}); await jajakUlang(tab);
    await tab.tungguFungsi(`document.querySelectorAll('.cc-kartu').length === ${k0 + 1}`);
    let k = await keadaan(); assert.equal(k.tag, "INPUT", "fokus tidak jatuh ke BODY"); assert.deepEqual([k.aktif, k.nilai, k.lama, k.mulai, k.akhir], [true, "abc", true, 1, 2], "elemen yang sama, nilai dan kursor utuh");
    assert.match(await q(tab, "qa('.cc-kartu')[0].querySelector('h3').textContent"), /Kab Fokus Baru/, "alert baru memang diselipkan di urutan depan");
    /* (2) kartu F1 sendiri dibangun ulang (BPBD konfirmasi lapangan: data kartu berubah): fokus, nilai, dan kursor dipulihkan ke input baru */
    await DB.prepare("UPDATE tugas_api SET konfirmasi_pada = ? WHERE id = ?").bind(Date.now(), F1).run(); await jajakUlang(tab);
    await tab.tungguFungsi(`/BPBD sudah konfirmasi lapangan/.test(document.querySelector('.cc-kartu[data-id="${F1}"]').innerText)`);
    k = await keadaan(); assert.equal(k.lama, false, "kartunya memang dibangun ulang (elemen baru)"); assert.equal(k.tag, "INPUT", "tetapi fokus dipulihkan"); assert.deepEqual([k.aktif, k.nilai, k.mulai, k.akhir], [true, "abc", 1, 2]);
    assert.deepEqual(bersih(tab), []); await tab.tutup();
  });

  /* pembungkus fetch di halaman: hitung panggilan /api/cc/kontak dan /api/cc/log (bukan CSV); __tahan > 0 menahan jawaban log sekian ms dan menghormati signal (seperti fetch sungguhan) */
  const PANTAU = `(() => { const f = window.fetch.bind(window); window.__panggil = {kontak: [], log: [], batal: 0}; window.__tahan = 0;
    window.fetch = (u, o) => { const s = String(u);
      if (s.includes('/api/cc/kontak')) window.__panggil.kontak.push(s);
      if (s.includes('/api/cc/log') && !s.includes('format=csv')) { window.__panggil.log.push(s);
        if (window.__tahan) return new Promise((ok, tolak) => { const sig = o && o.signal; if (sig && sig.aborted) { window.__panggil.batal++; return tolak(new DOMException('abort', 'AbortError')); }
          const t = setTimeout(() => f(u, o).then(ok, tolak), window.__tahan);
          if (sig) sig.addEventListener('abort', () => { clearTimeout(t); window.__panggil.batal++; tolak(new DOMException('abort', 'AbortError')); }); }); }
      return f(u, o); }; })();`;

  uji("cc layar meja (Chrome): nomor BPBD semua lokasi dimuat bersama (25 lokasi = 2 panggilan, bukan 25); filter tanggal Log didebounce 400 ms dan permintaan usang dibatalkan", async () => {
    await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]);
    for (let i = 0; i < 25; i++) await tugas(0x3400 + i, {kab: "Kab Banyak " + i, dibuat: Date.now() - (5 + i) * MENIT});
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok); await tab.kirim("Page.addScriptToEvaluateOnNewDocument", {source: PANTAU});
    await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
    await tab.tungguFungsi("document.querySelectorAll('.cc-kartu').length === 25 && [...document.querySelectorAll('.cc-kartu')].every(k => k.querySelector('.cc-kontak') && !/Memuat/.test(k.querySelector('.cc-kontak').innerText))");
    const kontak = await q(tab, "window.__panggil.kontak.map(u => new URL(u, location.href).searchParams.getAll('lokasi'))");
    assert.deepEqual(kontak.map(l => l.length), [20, 5], "25 lokasi: satu panggilan 20 + satu panggilan 5"); assert.equal(new Set(kontak.flat()).size, 25); assert.ok(kontak.flat().every(l => /^11\|Kab Banyak \d+$/.test(l)));
    assert.equal(await q(tab, "qa('.cc-kartu .cc-kontak').every(k => /0813-6066-9111/.test(k.innerText))"), true, "jawaban tiap lokasi (nomor provinsi Aceh dari bpbd.json) dipetakan ke kartunya, juga yang di panggilan kedua");
    await tidur(1200); assert.equal(await q(tab, "window.__panggil.kontak.length"), 2, "dimuat ulang sendiri tiap 30 detik, tetapi nomor yang masih segar (30 menit) tidak diminta lagi");
    /* log: lima perubahan tanggal beruntun (jeda 60 ms) = SATU permintaan, 400 ms sesudah yang terakhir */
    await tab.klikTeks(".cc-tab", "^Log$"); await tab.tungguFungsi("document.querySelector('.cc-log-isi h3') && !/Memuat/.test(document.querySelector('.cc-log-isi').innerText)");
    await q(tab, "(window.__panggil.log.length = 0, window.__panggil.batal = 0)");
    await q(tab, `(async () => { const i = q('.cc-saring input[type=date]'); for (const d of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']) { i.value = d; i.dispatchEvent(new Event('change', {bubbles: true})); await new Promise(r => setTimeout(r, 60)); } })()`);
    assert.equal(await q(tab, "window.__panggil.log.length"), 0, "selagi masih berubah: belum ada permintaan"); assert.match(await q(tab, "q('.cc-log-isi').innerText"), /Memuat log/);
    await tab.tungguFungsi("window.__panggil.log.length >= 1 && !/Memuat/.test(document.querySelector('.cc-log-isi').innerText)"); await tidur(700);
    const log1 = await q(tab, "window.__panggil.log"); assert.equal(log1.length, 1, "lima perubahan = satu permintaan"); assert.match(log1[0], /tgl=2026-10-05\b/);
    assert.match(await q(tab, "q('.cc-saring a').getAttribute('href')"), /tgl=2026-10-05/, "tautan CSV mengikuti tanggal terakhir");
    /* permintaan yang sedang jalan lalu filter berubah lagi: diputus (signal), jawabannya tidak menimpa layar */
    await q(tab, "(window.__panggil.log.length = 0, window.__panggil.batal = 0, window.__tahan = 1500)");
    await q(tab, "(() => { const i = q('.cc-saring input[type=date]'); i.value = '2026-10-11'; i.dispatchEvent(new Event('change', {bubbles: true})); })()");
    await tab.tungguFungsi("window.__panggil.log.length === 1");   // permintaan A sudah berangkat (ditahan 1,5 dtk)
    await q(tab, "(() => { const i = q('.cc-saring input[type=date]'); i.value = '2026-10-12'; i.dispatchEvent(new Event('change', {bubbles: true})); })()");
    assert.equal(await q(tab, "window.__panggil.batal"), 1, "A diputus begitu filter berubah, tanpa menunggu jawabannya");
    await q(tab, "(window.__tahan = 0)"); await tab.tungguFungsi("window.__panggil.log.length === 2 && !/Memuat/.test(document.querySelector('.cc-log-isi').innerText)"); await tidur(600);
    const log2 = await q(tab, "window.__panggil.log"); assert.equal(log2.length, 2); assert.match(log2[0], /tgl=2026-10-11\b/); assert.match(log2[1], /tgl=2026-10-12\b/);
    assert.match(await q(tab, "q('.cc-log-isi').innerText"), /12 Oktober 2026/); assert.doesNotMatch(await q(tab, "q('.cc-log-isi').innerText"), /11 Oktober 2026/, "jawaban usang tidak tampil");
    /* tanpa saringan lain selain tanggal dan operator: satu kotak pilih (Operator), tak ada pilihan kelompok waktu, dan permintaan log hanya membawa tgl (+ operator) */
    assert.deepEqual(await q(tab, "qa('.cc-saring select').map(e => e.getAttribute('aria-label'))"), ["Operator"]); TANPA_LAMA(await q(tab, "document.body.innerText"), "tab Log");
    assert.ok(log2.every(u => !new RegExp(LAMA, "i").test(u)), "permintaan log tidak membawa parameter lama");
    assert.deepEqual(bersih(tab), []); await tab.tutup();
  });

  uji("cc layar meja (Chrome): galat tak terduga saat memuat nomor BPBD tidak menguncinya selamanya: kartu keluar dari 'Memuat nomor kantor', alert berikutnya tetap dimuat nomornya", async () => {
    await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]);
    await tugas(0x5101, {kab: "Kab Banting Satu"}); await tugas(0x5102, {kab: "Kab Banting Dua"});
    /* ambil() bawaan tidak melempar; pembungkus ini melemparkannya SEKALI untuk /api/cc/kontak, seperti galat tak terduga di tengah kerjakanKontak() (flag jalanKontak dulu tak pernah dilepas) */
    const BANTING = `(() => { let cc; window.__banting = 1; window.__kontakPanggilan = 0;
      Object.defineProperty(window, "Cc", {configurable: true, get: () => cc, set: v => { cc = {...v, ambil: async (u, o) => { if (String(u).includes("/api/cc/kontak")) { window.__kontakPanggilan++; if (window.__banting > 0) { window.__banting--; throw new Error("banting uji"); } } return v.ambil(u, o); }}; }}); })();`;
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok); await tab.kirim("Page.addScriptToEvaluateOnNewDocument", {source: BANTING});
    try {
      await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
      await tab.tungguFungsi("document.querySelectorAll('.cc-kartu').length === 2 && [...document.querySelectorAll('.cc-kartu')].every(k => /Nomor BPBD belum bisa dimuat \\(galat tak terduga\\)/.test(k.querySelector('.cc-kontak').innerText))", 20000);
      assert.equal(await q(tab, "window.__kontakPanggilan"), 1); assert.equal(await q(tab, "qa('.cc-kontak').some(k => /Memuat nomor/.test(k.innerText))"), false, "tidak ada kartu yang macet di 'Memuat nomor kantor'");
      /* alert baru dengan lokasi lain: flag sudah dilepas, jadi nomornya dimuat (dulu: kartu baru macet 'Memuat' sampai halaman dimuat ulang) */
      await tugas(0x5103, {kab: "Kab Banting Tiga", dibuat: Date.now() - 2 * MENIT});
      await sampai(tab, "document.querySelectorAll('.cc-kartu').length === 3 && /0813-6066-9111/.test([...document.querySelectorAll('.cc-kartu')].find(k => /Banting Tiga/.test(k.innerText)).querySelector('.cc-kontak').innerText)");
      assert.equal(await q(tab, "window.__kontakPanggilan"), 2, "dua panggilan: yang gagal sekali, lalu alert baru"); assert.equal(await q(tab, "qa('.cc-kontak').filter(k => /Memuat nomor/.test(k.innerText)).length"), 0);
      assert.deepEqual(bersih(tab), []);
    } finally { await tab.tutup(); await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]); }
  });

  uji("cc layar meja (Chrome): tab Log dibuka sebelum antrean (tanggal dari server) tiba: 'Pilih tanggal' + Unduh CSV nonaktif, bukan kotak kosong; begitu antrean tiba tanggal dibenihkan dan log dimuat", async () => {
    await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]);
    await tugas(0x5301, {kab: "Kab Log Dini"});
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok); await tab.kirim("Page.addScriptToEvaluateOnNewDocument", {source: PANTAU});
    try {
      await tab.kirim("Network.setBlockedURLs", {urls: [...BLOKIR, "*/api/cc/antrean*"]});   // antrean tertahan: S.data kosong, tanggal bawaan belum ada
      await tab.buka(base + "/command-center", {tunggu: ".cc-tab"});
      await tab.klikTeks(".cc-tab", "^Log$"); await tab.tungguFungsi("/Pilih tanggal/.test(document.querySelector('.cc-log-isi').innerText)", 10000);
      let k = await q(tab, "({tgl: q('.cc-saring input[type=date]').value, href: q('.cc-saring a').getAttribute('href'), mati: q('.cc-saring a').getAttribute('aria-disabled'), judul: q('.cc-saring a').title, log: window.__panggil.log.length})");
      assert.equal(k.tgl, ""); assert.equal(k.href, null, "Unduh CSV tidak menunjuk ke mana pun"); assert.equal(k.mati, "true"); assert.equal(k.judul, "Pilih tanggal"); assert.equal(k.log, 0, "tanpa tanggal tidak ada permintaan log");
      await tab.kirim("Network.setBlockedURLs", {urls: BLOKIR}); await jajakUlang(tab);   // antrean tiba -> tanggal dibenihkan -> log dimuat karena tab Log sedang terbuka
      await tab.tungguFungsi("document.querySelector('.cc-log-isi h3') && !/Memuat/.test(document.querySelector('.cc-log-isi').innerText)", 15000);
      k = await q(tab, "({tgl: q('.cc-saring input[type=date]').value, href: q('.cc-saring a').getAttribute('href'), mati: q('.cc-saring a').getAttribute('aria-disabled'), log: window.__panggil.log.length})");
      assert.match(k.tgl, /^\d{4}-\d\d-\d\d$/); assert.match(k.href, /tgl=\d{4}-\d\d-\d\d/); assert.equal(k.mati, null); assert.ok(k.log >= 1);
    } finally { await tab.tutup(); await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]); }
  });

  uji("cc layar meja (Chrome): tanggal Log yang dikosongkan tidak ditimpa jajak/aksi; tabel lama dikosongkan, Unduh CSV nonaktif ('Pilih tanggal'), tanpa permintaan; 429 ditulis jelas", async () => {
    await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]);
    await tugas(0x5201, {kab: "Kab Log Kosong"});
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok); await tab.kirim("Page.addScriptToEvaluateOnNewDocument", {source: PANTAU});
    try {
      await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
      await q(tab, "(window.__antrean = 0, (() => { const f = window.fetch; window.fetch = (u, o) => { if (String(u).includes('/api/cc/antrean')) window.__antrean++; return f.call(window, u, o); }; })())");
      await tab.klikTeks(".cc-tab", "^Log$"); await tab.tungguFungsi("document.querySelector('.cc-log-isi h3') && !/Memuat/.test(document.querySelector('.cc-log-isi').innerText)");
      const keadaan = () => q(tab, `({tgl: q('.cc-saring input[type=date]').value, href: q('.cc-saring a').getAttribute('href'), mati: q('.cc-saring a').getAttribute('aria-disabled'), judul: q('.cc-saring a').title, isi: q('.cc-log-isi').innerText, tabel: qa('.cc-log-isi .cc-tabel').length, log: window.__panggil.log.length})`);
      let k = await keadaan(); assert.match(k.tgl, /^\d{4}-\d\d-\d\d$/, "dibenihkan dari tanggal WIB server"); assert.match(k.href, /tgl=\d{4}-\d\d-\d\d/); assert.equal(k.mati, null); assert.ok(k.tabel >= 1);
      /* operator mengosongkan tanggal */
      await q(tab, "(window.__panggil.log.length = 0)"); await tab.pilih(".cc-saring input[type=date]", "");
      k = await keadaan(); assert.equal(k.tgl, ""); assert.equal(k.tabel, 0, "tabel dan ringkasan lama dikosongkan"); assert.match(k.isi, /Pilih tanggal/); assert.doesNotMatch(k.isi, /Ringkasan per operator|Jejak \(/);
      assert.equal(k.href, null, "Unduh CSV tidak menunjuk ke mana pun"); assert.equal(k.mati, "true"); assert.equal(k.judul, "Pilih tanggal"); assert.equal(k.log, 0, "tanpa tanggal tidak ada permintaan log");
      /* jajak antrean (30 dtk) dan aksi memuat ulang antrean berkali-kali: ketikan tidak ditimpa tanggal bawaan */
      for (let i = 1; i <= 2; i++) { await jajakUlang(tab); await tab.tungguFungsi(`window.__antrean >= ${i}`, 10000); await tidur(500); }
      await q(tab, "document.querySelector('.cc-btn.ke-dalam_konfirmasi').click()"); await tab.tungguFungsi("window.__antrean >= 3", 10000); await tidur(500);   // aksi -> muat() ulang
      k = await keadaan(); assert.equal(k.tgl, "", "tanggal tetap kosong sesudah jajak dan aksi (dulu: ditimpa tanggal bawaan tiap muat)"); assert.match(k.isi, /Pilih tanggal/); assert.equal(k.mati, "true"); assert.equal(k.log, 0);
      /* memilih tanggal lagi: tabel, tautan CSV hidup kembali */
      await tab.pilih(".cc-saring input[type=date]", "2026-10-05"); await tab.tungguFungsi("window.__panggil.log.length >= 1 && !/Memuat/.test(document.querySelector('.cc-log-isi').innerText) && document.querySelector('.cc-log-isi h3')", 10000);
      k = await keadaan(); assert.equal(k.tgl, "2026-10-05"); assert.match(k.href, /tgl=2026-10-05/); assert.equal(k.mati, null); assert.equal(k.judul, "");
      /* batas laju server (429) terbaca jelas, bukan teks teknis */
      await q(tab, "(() => { const f = window.fetch; window.fetch = (u, o) => String(u).includes('/api/cc/log') ? Promise.resolve(new Response(JSON.stringify({galat: 'batas cc.log: 120 per 1 jam sudah tercapai'}), {status: 429, headers: {'content-type': 'application/json'}})) : f.call(window, u, o); })()");
      await tab.pilih(".cc-saring input[type=date]", "2026-10-06"); await tab.tungguFungsi("/Terlalu sering memuat log/.test(document.querySelector('.cc-log-isi').innerText)", 10000);
      assert.doesNotMatch(await q(tab, "q('.cc-log-isi').innerText"), /cc\.log/);
      assert.deepEqual(bersih(tab), []);
    } finally { await tab.tutup(); await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]); }
  });

  uji("cc layar meja (Chrome): daftar yang dipotong server ditandai: chip '500+' dan catatan di meja", async () => {
    await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]);
    await DB.prepare(`WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 501) INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy)
      SELECT printf('%016x', 0xb000000 + n), '11', 'Kota Banda Aceh', 'Kuta Alam', 5.5, 95.3, 3, 4, 12, ?1 - n * 1000, ?1, 'buka', NULL, 0 FROM s`).bind(Date.now() - 10 * MENIT).run();
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok); await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
    await tab.tungguFungsi("document.querySelectorAll('.cc-kartu').length === 500");
    assert.deepEqual(await q(tab, "qa('.cc-chip b').map(b => b.textContent)"), ["500+", "0+", "0"], "Baru dan Dalam konfirmasi datang dari satu daftar terpotong (yang belum dipegang dibaca duluan, jadi 'dalam konfirmasi' bisa lebih banyak dari 0): keduanya batas bawah, ditandai +; keputusan akhir tidak terpotong");
    assert.equal(await q(tab, "!q('.cc-panel .cc-spanduk.galat').hidden"), true); assert.match(await q(tab, "q('.cc-panel .cc-spanduk.galat').innerText"), /melebihi batas baca server dan dipotong.*batas bawah/);
    assert.deepEqual(bersih(tab), []); await tab.tutup();
    await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]);
  });

  uji("cc layar meja (Chrome): log terpotong ditandai di mana-mana: '5.000+' di judul dan ringkasan, catatan tanpa anjuran unduh CSV, CSV bertanda x-terpotong dan baris catatan", async () => {
    const TG = "2026-03-10", mulai = Date.parse(TG + "T08:00:00+07:00");
    await DB.prepare(`WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 5001) INSERT INTO cc_jejak (waktu, tugas_id, oleh, dari, ke, catatan, dummy)
      SELECT ?1 + n * 1000, printf('%016x', 0xd000000 + n % 7), ?2, 'baru', 'dalam_konfirmasi', NULL, 0 FROM s`).bind(mulai, "staf:" + op.id).run();
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", koord.tok); await tab.buka(base + "/command-center", {tunggu: ".cc-tab"});
    await tab.klikTeks(".cc-tab", "^Log$"); await tab.tungguFungsi("document.querySelector('.cc-saring input[type=date]')");
    await tab.pilih(".cc-saring input[type=date]", TG);
    await tab.tungguFungsi("/Jejak \\(5\\.000\\+ baris\\)/.test(document.querySelector('.cc-log-isi').innerText)", 20000);
    const g = await q(tab, "({baris: qa('.cc-log-isi .cc-tabel')[1].querySelectorAll('tbody tr').length, ring: [...qa('.cc-log-isi .cc-tabel')[0].querySelectorAll('tbody td.ang')].map(td => td.textContent), banner: q('.cc-log-isi .cc-spanduk.galat').innerText})");
    assert.equal(g.baris, 5000); assert.deepEqual(g.ring.slice(0, 2), ["5.000+", "0+"], "Aksi dan Diputuskan: batas bawah, ditandai +");
    assert.match(g.banner, /melebihi 5\.000 baris dan dipotong pada 5\.000 baris pertama.*batas bawah.*CSV juga hanya memuat baris ini/); assert.doesNotMatch(g.banner, /atau unduh CSV/, "CSV tidak lengkap: tidak dianjurkan sebagai jalan keluar");
    const csv = await q(tab, "fetch(q('.cc-saring a').getAttribute('href')).then(async r => ({x: r.headers.get('x-terpotong'), nama: r.headers.get('content-disposition'), akhir: (await r.text()).trim().split('\\r\\n').pop()}))");
    assert.equal(csv.x, "1"); assert.match(csv.nama, /-terpotong\.csv/); assert.match(csv.akhir, /^"CATATAN: log terpotong/);
    /* tanggal sepi: tanda hilang (tidak terpotong) */
    await tab.pilih(".cc-saring input[type=date]", "2026-03-11"); await tab.tungguFungsi("/Jejak \\(0 baris\\)/.test(document.querySelector('.cc-log-isi').innerText)", 20000);
    assert.equal(await q(tab, "qa('.cc-log-isi .cc-spanduk.galat').length"), 0);
    assert.deepEqual(bersih(tab), []); await tab.tutup();
  });

}
