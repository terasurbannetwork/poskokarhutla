/* Command center karhutla di PERAMBAN NYATA (Chrome headless lewat CDP) melawan worker utuh di workerd (Miniflare) dengan D1 lokal: meja operator (/command-center) dan layar dinding
   (/command-center/dinding). Dibuktikan di DOM sungguhan: gerbang suara dan lencana SENYAP, kartu antrean, tel:, transisi lewat klik, 409, log, layar dinding 16:9 tanpa gulir di 1920 dan 3840,
   skala huruf, umur data merah, "Gagal menyegarkan sejak", spanduk sesi habis, tanpa pop-up, dan nol pelanggaran CSP. play()/pause() audio dipalsukan lewat skrip awal CDP (hasil deterministik,
   bunyi tidak keluar); ubin peta openfreemap diblokir (peramban di CI tak punya internet) sehingga jalur cadangan latar polos ikut teruji.
   Dilewati dengan pesan jelas bila Chrome tidak ada. Jalankan: node --test tests/warga/command_center_layar.test.mjs */
import assert from "node:assert/strict";
import path from "node:path";
import {existsSync, readFileSync} from "node:fs";
import {Miniflare} from "miniflare";
import {after} from "node:test";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import {sha256, berantai} from "./_bnpb.mjs";
import {cariChrome, bukaPeramban} from "../bnpb/_peramban.mjs";

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
  const pemirsa = async tab => {
    const i = ++n, id = "7" + i.toString(16).padStart(3, "0") + "e".repeat(12), tok = sha256("pm-" + id);
    await DB.batch([DB.prepare("INSERT INTO pemirsa (id, username, nama, tab, garam, sandi_sha, dibuat) VALUES (?, ?, 'Layar Ruang', ?, ?, ?, 1)").bind(id, "layardinding" + i, JSON.stringify(tab), "g".repeat(32), "0".repeat(64)),
      DB.prepare("INSERT INTO pemirsa_sesi (token_sha, pemirsa_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 5 * JAM)]);
    return {id, tok};
  };
  const tugas = async (urut, o) => {
    const id = urut.toString(16).padStart(4, "0").padEnd(16, "c"), t = Date.now(), r = {prov: "11", kab: "Kota Banda Aceh", kec: "Kuta Alam", lat: 5.55123, lon: 95.32456, n24: 12, luas_ha: 45.5, dibuat: t - 10 * MENIT, konfirmasi_pada: null, ...o};
    await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy) VALUES (?, ?, ?, ?, ?, ?, 3, ?, ?, ?, ?, 'buka', ?, 0)")
      .bind(id, r.prov, r.kab, r.kec, r.lat, r.lon, r.n24, r.luas_ha, r.dibuat, r.dibuat, r.konfirmasi_pada).run();
    return id;
  };
  const op = await staf("Budi Santoso", ["operator_cc"]), koord = await staf("Koordinator Uji", ["koordalops"]), rekan = await staf("Citra Dewi", ["operator_cc"]), pm = await pemirsa(["dinding"]);
  const T1 = await tugas(0x3001, {dibuat: Date.now() - 20 * MENIT}), T2 = await tugas(0x3002, {kab: "Aceh Besar", kec: "Darul Imarah", lat: 5.4, lon: 95.5, dibuat: Date.now() - 12 * MENIT, konfirmasi_pada: Date.now() - 5 * MENIT});
  const T3 = await tugas(0x3003, {kab: "Aceh Tamiang", kec: "Karang Baru", lat: 4.3, lon: 98.0, dibuat: Date.now() - 40 * MENIT});
  await DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'dalam_konfirmasi', ?, ?, 0)").bind(T3, "staf:" + rekan.id, Date.now() - 8 * MENIT).run();
  /* titik panas: 3 lokasi unik + 1 duplikat lokasi (satelit lain) + 1 lebih tua dari 24 jam; putaran dibuat 5 jam lalu = basi (batas 4 jam) */
  const acuan = Date.now(), baris = [[5.55, 95.32, -1, "N20", 10, 2, 0, "11-01"], [5.55, 95.32, -0.5, "N21", 11, 2, 0, "11-01"], [4.3, 98.0, -2, "N", 5, 1, 0, "11-01"], [-2.5, 113.3, -3, "M", 7, 1, 0, "11-01"], [-3.1, 114.1, -30, "N20", 9, 2, 0, "10-31"]];
  await DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(acuan - 5 * JAM, JSON.stringify({kolom: [], acuan: new Date(acuan).toISOString(), dibuat: new Date(acuan - 5 * JAM).toISOString(), wilayah: ["11|Kota Banda Aceh|Kuta Alam"], baris})).run();

  /* ---------------- peramban ---------------- */
  const STUB = `window.__bunyi = {play: 0, pause: 0}; HTMLMediaElement.prototype.play = function () { window.__bunyi.play++; return Promise.resolve(); }; HTMLMediaElement.prototype.pause = function () { window.__bunyi.pause++; };`;
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

  uji("cc layar meja (Chrome): gerbang suara, kartu antrean, tel:, transisi lewat klik, catatan koreksi wajib, 409, bunyi berhenti begitu semua dipegang, log, nol pelanggaran CSP", async () => {
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok);
    await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
    /* gerbang: operator wajib menyalakan suara (tanpa "lewati"); lencana SENYAP mencolok sebelum diketuk */
    assert.equal(await q(tab, "!q('.cc-gerbang').hidden"), true, "gerbang terlihat sebelum diketuk"); assert.match(await q(tab, "q('.cc-gerbang').innerText"), /Ketuk untuk menyalakan suara/);
    assert.equal(await q(tab, "qa('.cc-gerbang-lewat').length"), 0, "operator tidak boleh melewati gerbang"); assert.match(await q(tab, "q('.cc-senyap').innerText"), /SENYAP/); assert.equal(await q(tab, "q('.cc-senyap').dataset.s"), "menunggu");
    assert.equal(await q(tab, "window.__bunyi.play"), 0, "belum diketuk: tidak ada upaya berbunyi");
    await tab.klik(".cc-gerbang-tombol");
    await tab.tungguFungsi("document.querySelector('.cc-senyap').dataset.s === 'hidup'"); assert.equal(await q(tab, "q('.cc-gerbang').hidden"), true);
    assert.ok(await q(tab, "window.__bunyi.play") >= 1, "ada alert baru: berbunyi segera setelah diketuk");
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
    const pause0 = await q(tab, "window.__bunyi.pause"); assert.equal(pause0, 0, "masih ada satu alert baru: bunyi belum berhenti");
    await tab.klik('.cc-kartu[data-status="baru"] button[data-ke="dalam_konfirmasi"]');
    await tab.tungguFungsi("document.querySelectorAll('.cc-kartu[data-status=\"baru\"]').length === 0");
    assert.ok(await q(tab, "window.__bunyi.pause") >= 1, "semua sudah dipegang: bunyi berhenti sendiri (keadaan dari server)");
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
    const log = await q(tab, "({baris: qa('.cc-log-isi .cc-tabel')[1].querySelectorAll('tbody tr').length, ring: qa('.cc-log-isi .cc-tabel')[0].innerText, csv: q('.cc-saring a').getAttribute('href'), ops: qa('.cc-saring select')[1].innerText})");
    assert.equal(log.baris, 3, "dua ambil + satu keputusan"); assert.match(log.ring, /Budi Santoso/); assert.match(log.csv, /^\/api\/cc\/log\?.*format=csv/); assert.match(log.ops, /Budi Santoso/);
    assert.deepEqual(bersih(tab), [], "tidak ada galat konsol atau pelanggaran CSP");
    await tab.tutup();
  });

  uji("cc layar meja (Chrome): koordalops hanya melihat (tanpa tombol aksi, tanpa nomor BPBD), boleh lewati gerbang suara", async () => {
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", koord.tok);
    await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
    assert.equal(await q(tab, "qa('button[data-ke], input.cc-catatan, .cc-kontak').length"), 0); assert.match(await q(tab, "q('.cc-info').innerText"), /Koordinator Uji \(hanya melihat\)/);
    assert.equal(await q(tab, "qa('.cc-gerbang-lewat').length"), 1, "pembaca boleh lewati gerbang"); await tab.klik(".cc-gerbang-lewat");
    assert.equal(await q(tab, "q('.cc-senyap').dataset.s"), "hening"); assert.equal(await q(tab, "window.__bunyi.play"), 0, "pembaca yang melewati gerbang tidak mendengar alarm");
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

  uji("cc layar dinding (Chrome): 16:9 tanpa gulir di 1920 dan 3840, skala huruf, baca saja, tanpa pop-up, titik panas unik, umur data merah bila basi, gagal menyegarkan, sesi habis = spanduk", async () => {
    /* mulai dari antrean bersih: tiga alert segar (dua baru, satu sudah dipegang rekan) */
    await DB.prepare("DELETE FROM tugas_api").run();
    const D1 = await tugas(0x4001, {dibuat: Date.now() - 20 * MENIT}); await tugas(0x4002, {kab: "Aceh Besar", kec: "Darul Imarah", lat: 5.4, lon: 95.5, dibuat: Date.now() - 12 * MENIT, konfirmasi_pada: Date.now() - 5 * MENIT});
    const D3 = await tugas(0x4003, {kab: "Aceh Tamiang", kec: "Karang Baru", lat: 4.3, lon: 98.0, dibuat: Date.now() - 40 * MENIT});
    await DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'dalam_konfirmasi', ?, ?, 0)").bind(D3, "staf:" + rekan.id, Date.now() - 8 * MENIT).run();
    const tab = await tabBaru(1920, 1080); await cookie(tab, "sesi_pemirsa", pm.tok);
    await tab.buka(base + "/command-center/dinding", {tunggu: ".dd-item"});
    await tab.tungguFungsi("document.querySelectorAll('.dd-sumber.basi').length >= 1 && /diperbarui/.test(document.querySelectorAll('.dd-sumber')[1].innerText)", 20000);
    const gambar = () => q(tab, `({gulirY: document.documentElement.scrollHeight - innerHeight, gulirX: document.documentElement.scrollWidth - innerWidth, bodyY: document.body.scrollHeight - innerHeight, font: parseFloat(getComputedStyle(document.documentElement).fontSize),
      daftarLuap: q('.dd-daftar').scrollHeight - q('.dd-daftar').clientHeight, jam: q('.dd-jam-angka').textContent, shift: q('.dd-shift-nama').textContent, hadir: q('.dd-hadir').textContent, item: qa('.dd-item').length,
      ubin: qa('.dd-ubin').map(u => [u.querySelector('.dd-angka-label').textContent, u.querySelector('.dd-angka-nilai').textContent, u.querySelector('.dd-angka-satuan').textContent]), sub: qa('.dd-ubin .dd-angka-sub').map(e => e.textContent),
      sumber: qa('.dd-sumber').map(e => [e.querySelector('b').textContent, e.innerText, e.classList.contains('basi')]), aksi: qa('button[data-ke], input, textarea, select, a[href^="tel:"], .al, [role=dialog]:not(.cc-gerbang)').length,
      skrip: qa('script[src]').map(s => s.getAttribute('src')), judulItem: qa('.dd-item-atas b').map(b => b.textContent), pil: qa('.dd-item .cc-pil').map(p => p.textContent),
      petaAda: !!q('.dd-peta canvas'), petaGagal: q('.dd-peta-gagal').hidden ? '' : q('.dd-peta-gagal').textContent, kunci: q('.dd-kunci').textContent, teks: document.body.innerText})`);
    let g = await gambar();
    assert.ok(g.gulirY <= 0 && g.gulirX <= 0 && g.bodyY <= 0, `tanpa gulir di 1920: ${g.gulirY}/${g.gulirX}/${g.bodyY}`); assert.ok(Math.abs(g.font - 17.4) < 0.3, "rem ~17,4 px di 1920x1080: " + g.font); assert.ok(g.daftarLuap <= 1);
    assert.match(g.jam, /^\d\d\.\d\d$/); assert.match(g.shift, /^Shift (Pagi|Siang|Malam) \d\d\.\d\d–\d\d\.\d\d$/); assert.match(g.hadir, /Belum ada operator hadir|Operator hadir:/);
    assert.equal(g.item, 3); assert.deepEqual(g.pil, ["Baru", "Baru", "Dalam konfirmasi"]); assert.deepEqual(g.judulItem, ["Kota Banda Aceh", "Aceh Besar", "Aceh Tamiang"]);
    assert.equal(g.ubin.length, 6); assert.deepEqual(g.ubin.map(u => u[0]), ["Titik panas 24 jam", "Alert hari ini", "Median respons shift ini", "Lewat 6 jam, BPBD belum konfirmasi", "Peringatan aktif, semua bencana", "OMC hari ini"]);
    assert.deepEqual(g.ubin[0].slice(1), ["3", "lokasi"], "3 lokasi unik: duplikat satelit lain dan titik lebih tua dari 24 jam tidak dihitung"); assert.deepEqual(g.ubin[2].slice(1), ["–", ""], "belum ada alert yang dipegang pada shift ini (D1 diisi langsung)");
    assert.deepEqual(g.ubin[4].slice(1), ["0", "peringatan"]); assert.deepEqual(g.ubin[5].slice(1), ["0", "sortie"]);
    /* cakupan tertulis di tiap tile: rincian "alert hari ini" satu populasi dengan angkanya (dibuat sejak 00.00 WIB); "lewat 6 jam" menyebut semua level sejak dibuat */
    assert.equal(g.sub[0], "lokasi unik (sel 375 m, semua satelit)", "375 m = ukuran sel, bukan galat: tanpa ±"); assert.doesNotMatch(g.sub[0], /±/);
    assert.match(g.sub[1], /^dibuat sejak 00\.00 WIB: \d+ baru · \d+ dalam konfirmasi · \d+ diputuskan$/); assert.equal(g.sub[3], "semua tugas karhutla terbuka, semua level, sejak dibuat");
    assert.deepEqual(g.sumber.map(s => s[0]), ["Command center", "Titik panas", "Peringatan", "OMC"]);
    const sm = Object.fromEntries(g.sumber.map(s => [s[0], s])); assert.equal(sm["Command center"][2], false); assert.equal(sm["Titik panas"][2], true, "putaran titik 5 jam: MERAH (batas 4 jam)"); assert.match(sm["Titik panas"][1], /diperbarui 5 jam( \d+ menit)? lalu/, "putaran dibuat 5 jam sebelum uji mulai; uji yang lambat membacanya 5 jam 1 menit");
    assert.equal(sm["Peringatan"][2], false); assert.equal(sm["OMC"][2], false); assert.match(sm["Command center"][1], /diperbarui (kurang dari 1 menit|\d+ menit) lalu/);
    assert.equal(g.aksi, 0, "baca saja: tanpa tombol aksi, isian, nomor telepon, pop-up"); assert.deepEqual(g.skrip.filter(s => !s.startsWith("/vendor/maplibre/")).map(s => s.replace(/\?v=\d+$/, "")), ["/inti/format.js", "/angka_kawasan.js", "/admin/command_bersama.js", "/admin/command_dinding.js"]);
    assert.ok(!/alarm\.js|sapa\.js|asisten/.test(g.skrip.join(" "))); assert.doesNotMatch(g.teks, /\+?62\d{8,}|0\d{3}-\d{6,}|Kalak|Dipegang/, "tanpa nomor telepon dan catatan"); assert.match(g.kunci, /Layar tetap menyala/);
    await tab.tungguFungsi("document.querySelector('.dd-peta canvas') || !document.querySelector('.dd-peta-gagal').hidden", 20000);
    g = await gambar(); assert.ok(g.petaAda || g.petaGagal, "peta tergambar, atau jalur cadangan menjelaskan"); if (!g.petaAda) assert.match(g.petaGagal, /Peta/);
    /* gerbang suara: ketuk menyalakan; alarm berbunyi karena ada alert baru */
    assert.equal(await q(tab, "!q('.cc-gerbang').hidden"), true); await tab.klik(".cc-gerbang-tombol"); await tab.tungguFungsi("document.querySelector('.cc-senyap').dataset.s === 'hidup'");
    assert.ok(await q(tab, "window.__bunyi.play") >= 1); assert.equal(await q(tab, "qa('.cc-gerbang-lewat').length"), 0);
    assert.deepEqual(bersih(tab), [], "nol galat konsol dan nol pelanggaran CSP (termasuk peta)");
    /* 3840x2160: skala huruf dua kali lipat, tetap tanpa gulir */
    await tab.ukuran(3840, 2160); await tidur(600); g = await gambar();
    assert.ok(Math.abs(g.font - 34.8) < 0.5, "rem ~34,8 px di 3840x2160: " + g.font); assert.ok(g.gulirY <= 0 && g.gulirX <= 0 && g.bodyY <= 0, `tanpa gulir di 3840: ${g.gulirY}/${g.gulirX}/${g.bodyY}`); assert.ok(g.daftarLuap <= 1);
    await tab.ukuran(1366, 768); await tidur(600); g = await gambar(); assert.ok(g.gulirY <= 0 && g.gulirX <= 0 && g.bodyY <= 0, `tanpa gulir di 1366: ${g.gulirY}/${g.gulirX}/${g.bodyY}`);
    /* antrean panjang (65 alert; server hanya mengirim 60 baris): baris yang tidak muat dibuang, diganti "+N alert lagi" dengan N = SELURUH antrean - baris yang tampil (bukan 60 - baris yang tampil) */
    await DB.batch(Array.from({length: 62}, (_, i) => DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy) VALUES (?, '11', ?, 'Kec', 5.5, 95.3, 3, 4, 12, ?, ?, 'buka', NULL, 0)")
      .bind((0x3100 + i).toString(16).padStart(4, "0").padEnd(16, "c"), "Kab Contoh " + i, Date.now() - (2 + i) * MENIT, Date.now() - (2 + i) * MENIT)));
    await sampai(tab, "!document.querySelector('.dd-lagi').hidden && document.querySelectorAll('.dd-item').length < 40");
    g = await gambar(); assert.ok(g.daftarLuap <= 1 && g.gulirY <= 0 && g.item < 60, `daftar dipotong tanpa gulir: ${g.item} baris, luap ${g.daftarLuap}`); assert.match(await q(tab, "q('.dd-lagi').textContent"), /^\+\d+ alert lagi$/);
    assert.equal(Number((await q(tab, "q('.dd-lagi').textContent")).match(/\d+/)[0]) + g.item, 65, "sisa dihitung dari seluruh antrean (65), bukan dari 60 baris yang dikirim server");
    /* hemat kerja layar yang menyala 24 jam: jajak antrean 30 dtk TIDAK memasang ulang titik panas (puluhan ribu fitur), alert dipasang ulang hanya bila isinya berubah, pemotongan antrean mengukur
       tata letak sekali (bukan per baris). Peta dihitung lewat pembungkus setData; /api/titik diblokir supaya hanya jajak antrean yang jalan. */
    if (g.petaAda && !/WebGL|tidak bisa dimuat/.test(g.petaGagal)) {   // peta hanya hidup bila WebGL tersedia (Chrome tanpa GPU/SwiftShader tak bisa); angka dan antrean tetap diuji di atas
      await tab.kirim("Performance.enable"); await tab.kirim("Network.setBlockedURLs", {urls: [...BLOKIR, "*/api/titik*"]});
      await tab.eval(`(() => { window.__sd = {titik: 0, alert: 0}; window.__cc = 0; const g = maplibregl.Map.prototype.getSource; maplibregl.Map.prototype.getSource = function (id) { const s = g.call(this, id);
        if (s && s.setData && !s.__w) { s.__w = 1; const sd = s.setData.bind(s); s.setData = d => { window.__sd[id] = (window.__sd[id] || 0) + 1; return sd(d); }; } return s; };
        const f = window.fetch; window.fetch = (u, o) => { if (String(u).includes("/api/cc/dinding")) window.__cc++; return f.call(window, u, o); }; })()`);
      const layout = async () => (await tab.kirim("Performance.getMetrics")).metrics.find(m => m.name === "LayoutCount").value;
      const putaran = async n => { await sampai(tab, `window.__cc >= ${n}`); await tidur(500); };
      let l0 = await layout(); await putaran(1); const dl = (await layout()) - l0;
      for (let i = 2; i <= 3; i++) await putaran(i);
      const sd = await q(tab, "window.__sd"); assert.deepEqual(sd, {titik: 0, alert: 0}, "tiga jajak antrean tanpa perubahan: tidak ada setData sama sekali (dulu: seluruh titik dipasang ulang tiap jajak)");
      assert.ok(dl <= 12, `satu jajak antrean 60 baris = beberapa tata letak saja (potong() lama: satu per baris yang dibuang, 55 terukur; kini 2): ${dl}`);
      await tugas(0x3300, {kab: "Kab Alert Baru", lat: 3.5, lon: 97.5, dibuat: Date.now() - JAM}); await putaran(4);
      assert.deepEqual(await q(tab, "window.__sd"), {titik: 0, alert: 1}, "alert berubah: lapisan alert (<= 60 fitur) dipasang ulang SEKALI, titik panas tidak");
      await tab.kirim("Network.setBlockedURLs", {urls: BLOKIR}); await sampai(tab, "window.__sd.titik >= 1");
      assert.ok((await q(tab, "window.__sd")).titik >= 1, "titik panas dipasang saat datanya baru dimuat (muatTitik)");
    }
    await DB.prepare("DELETE FROM cc_status WHERE tugas_id IN (SELECT id FROM tugas_api WHERE kab LIKE 'Kab Contoh %')").run(); await DB.prepare("DELETE FROM tugas_api WHERE kab LIKE 'Kab Contoh %'").run();
    /* jajak gagal: "Gagal menyegarkan sejak HH.MM" MERAH; pulih saat jaringan kembali */
    await tab.kirim("Network.setBlockedURLs", {urls: [...BLOKIR, "*/api/cc/dinding*"]}); 
    await sampai(tab, "/Gagal menyegarkan sejak \\d\\d\\.\\d\\d/.test(document.querySelectorAll('.dd-sumber')[0].innerText)"); assert.equal(await q(tab, "qa('.dd-sumber')[0].classList.contains('basi')"), true);
    await tab.kirim("Network.setBlockedURLs", {urls: BLOKIR});
    await sampai(tab, "!/Gagal menyegarkan/.test(document.querySelectorAll('.dd-sumber')[0].innerText)"); assert.equal(await q(tab, "qa('.dd-sumber')[0].classList.contains('basi')"), false);
    /* sesi habis: spanduk besar dengan tautan masuk ulang, halaman TIDAK dialihkan diam-diam */
    assert.equal(await q(tab, "q('.dd-spanduk').hidden"), true);
    await DB.prepare("DELETE FROM pemirsa_sesi WHERE pemirsa_id = ?").bind(pm.id).run();
    await sampai(tab, "!document.querySelector('.dd-spanduk').hidden");
    assert.equal(await q(tab, "q('.dd-spanduk').innerText.replace(/\\s+/g, ' ')"), "Sesi habis — masuk ulang Masuk ulang"); assert.equal(await q(tab, "q('.dd-spanduk a').getAttribute('href')"), "/admin/masuk?ke=%2Fcommand-center%2Fdinding");
    assert.equal(await q(tab, "location.pathname"), "/command-center/dinding"); assert.ok(await q(tab, "parseFloat(getComputedStyle(q('.dd-spanduk')).fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize)") >= 2.9, "spanduk besar (3 rem)");
    await tab.tutup();
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
    /* shift dan operator: pilihan sekali klik, memuat segera tanpa tunda */
    await q(tab, "(window.__panggil.log.length = 0)"); await tab.pilih(".cc-saring select", "pagi"); await tab.tungguFungsi("window.__panggil.log.length === 1", 300);
    assert.deepEqual(bersih(tab), []); await tab.tutup();
  });

  /* ---------------- peta palsu: MapLibre pengganti yang merekam lapisan dan cat (deterministik, tanpa WebGL/ubin). Zoom = zoom "fit bounds" sungguhan dari ukuran kotak peta (Mercator) ---------------- */
  const PETA_PALSU = `(() => { const nilai = {lapisan: [], cat: {}, sumber: {}};
    class Peta { constructor(o) { this.o = o; this.h = {}; window.__peta = this; setTimeout(() => (this.h["style.load"] || []).forEach(f => f()), 0); }
      on(e, f) { (this.h[e] ||= []).push(f); return this; } addSource(id) { nilai.sumber[id] = {setData() {}}; } getSource(id) { return nilai.sumber[id]; }
      addLayer(l) { nilai.lapisan.push(l.id); nilai.cat[l.id] = JSON.parse(JSON.stringify(l.paint)); } getLayer(id) { return nilai.lapisan.includes(id) ? {} : undefined; }
      setPaintProperty(id, k, v) { nilai.cat[id][k] = v; } resize() {} setStyle() {}
      getZoom() { const k = this.o.container, [[w0, s0], [w1, s1]] = this.o.bounds, m = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / (2 * Math.PI), pad = this.o.fitBoundsOptions.padding * 2;
        return Math.min(Math.log2((k.clientWidth - pad) / (512 * (w1 - w0) / 360)), Math.log2((k.clientHeight - pad) / (512 * (m(s1) - m(s0))))); } }
    window.__peta_nilai = nilai; window.maplibregl = {Map: Peta}; })();`;
  /* jari-jari (px) sebuah ekspresi ["interpolate", ["linear"], ["zoom"], z0, r0, z1, r1, ...] di zoom tertentu */
  const JARI = `(e, z) => { const t = e.slice(3); if (z <= t[0]) return t[1]; for (let i = 0; i + 3 < t.length; i += 2) if (z <= t[i + 2]) return t[i + 1] + (t[i + 3] - t[i + 1]) * (z - t[i]) / (t[i + 2] - t[i]); return t[t.length - 1]; }`;

  uji("cc layar dinding (Chrome): titik panas terbaca dari jauh (oranye terang, garis gelap, ~0,25-0,35 rem, membesar di 4K) dan di bawah lingkaran alert; sub-teks 'Alert hari ini' menjumlah ke angka besar", async () => {
    await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]);
    const hari0 = Math.floor((Date.now() + 7 * JAM) / (24 * JAM)) * 24 * JAM - 7 * JAM, dibuat = hari0 + Math.floor((Date.now() - hari0) / 2);   // tengah antara 00.00 WIB dan sekarang: selalu hari ini
    await tugas(0x5001, {dibuat}); await tugas(0x5002, {kab: "Aceh Besar", lat: 5.4, lon: 95.5, dibuat});
    const c = await tugas(0x5003, {kab: "Aceh Tamiang", lat: 4.3, lon: 98.0, dibuat}), d = await tugas(0x5004, {kab: "Aceh Utara", lat: 5.1, lon: 97.1, dibuat}), tutup = await tugas(0x5005, {kab: "Aceh Barat", lat: 4.4, lon: 96.1, dibuat});
    await DB.batch([DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'dalam_konfirmasi', ?, ?, 0)").bind(c, "staf:" + rekan.id, Date.now() - 8 * MENIT),
      DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) VALUES (?, 'ada_api', ?, ?, 0)").bind(d, "staf:" + rekan.id, Date.now() - 4 * MENIT),
      DB.prepare("UPDATE tugas_api SET status = 'padam' WHERE id = ?").bind(tutup)]);   // ditutup (padam) hari ini tanpa keputusan operator
    const pm4 = await pemirsa(["dinding"]), tab = await tabBaru(1920, 1080); await cookie(tab, "sesi_pemirsa", pm4.tok); await tab.kirim("Page.addScriptToEvaluateOnNewDocument", {source: PETA_PALSU});
    try {
      await tab.buka(base + "/command-center/dinding", {tunggu: ".dd-item"});
      const ubinAlert = "[...document.querySelectorAll('.dd-ubin')].find(u => /Alert hari ini/.test(u.querySelector('.dd-angka-label').textContent))";
      const tile = () => q(tab, `(() => { const u = ${ubinAlert}; return {n: u.querySelector('.dd-angka-nilai').textContent, sub: u.querySelector('.dd-angka-sub').textContent, tinggi: u.scrollHeight - u.clientHeight, gulir: document.documentElement.scrollHeight - innerHeight}; })()`);
      const jumlah = t => [...t.sub.matchAll(/(\d+) (?:baru|dalam konfirmasi|diputuskan|sudah tutup)/g)].reduce((x, m) => x + Number(m[1]), 0);
      await tab.tungguFungsi(`(() => { const u = ${ubinAlert}; return u && u.querySelector('.dd-angka-nilai').textContent === '5'; })()`, 20000);
      let t = await tile();
      assert.equal(t.sub, "dibuat sejak 00.00 WIB: 2 baru · 1 dalam konfirmasi · 1 diputuskan · 1 sudah tutup", "dua baru (a, b), satu dalam konfirmasi (c), satu diputuskan (d), satu sudah tutup (padam)");
      assert.equal(jumlah(t), Number(t.n), "bagian-bagian sub-teks menjumlah ke angka besar"); assert.ok(t.tinggi <= 1 && t.gulir <= 0, `tile dan layar tidak meluap di 1920: ${t.tinggi}/${t.gulir}`);
      await tab.ukuran(1366, 768); await tidur(500); t = await tile(); assert.ok(t.tinggi <= 1 && t.gulir <= 0, `tile dan layar tidak meluap di 1366: ${t.tinggi}/${t.gulir}`); await tab.ukuran(1920, 1080); await tidur(400);
      /* tak ada yang ditutup: bentuk lama persis, dan tetap menjumlah */
      await DB.prepare("UPDATE tugas_api SET status = 'buka' WHERE id = ?").bind(tutup).run();
      await sampai(tab, `!/sudah tutup/.test(${ubinAlert}.querySelector('.dd-angka-sub').textContent)`); t = await tile();
      assert.match(t.sub, /^dibuat sejak 00\.00 WIB: \d+ baru · \d+ dalam konfirmasi · \d+ diputuskan$/); assert.equal(jumlah(t), Number(t.n), "tanpa tugas tutup: tiga bagian saja, tetap menjumlah"); assert.equal(t.n, "5");
      /* titik panas di peta: lapisan paling bawah, jari-jari ikut rem, terang, bergaris gelap */
      assert.deepEqual(await q(tab, "window.__peta_nilai.lapisan"), ["titik", "alert-halo", "alert"], "titik panas dipasang lebih dulu = di bawah lingkaran alert");
      const peta = () => q(tab, `(() => { const J = ${JARI}, n = window.__peta_nilai, z = window.__peta.getZoom(), rem = parseFloat(getComputedStyle(document.documentElement).fontSize), t = n.cat.titik, al = n.cat.alert;
        return {z, rem, titik: J(t["circle-radius"], z), alert: J(al["circle-radius"], z), warna: t["circle-color"], garis: t["circle-stroke-color"], garisLebar: t["circle-stroke-width"], opasitas: t["circle-opacity"], garisOpasitas: t["circle-stroke-opacity"],
          legenda: getComputedStyle(q('.dd-legenda li[data-s=titik]'), '::before').backgroundColor}; })()`);
      const p1 = await peta(), rem1 = p1.titik / p1.rem;
      assert.ok(p1.z > 3.5 && p1.z < 6, "zoom awal 1920x1080 masuk akal: " + p1.z); assert.ok(rem1 >= 0.22 && rem1 <= 0.4, `jari-jari titik ~0,25-0,35 rem di 1920 (dulu 0,1 rem = bintik 2 px): ${rem1.toFixed(3)} rem = ${p1.titik.toFixed(1)} px`);
      assert.ok(p1.titik < p1.alert, "titik lebih kecil dari lingkaran alert");
      const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), terang = ([r, g, bl]) => 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      assert.match(p1.warna, /^#[0-9a-f]{6}$/i); assert.ok(terang(rgb(p1.warna)) > terang(rgb("#ff9a3c")), "lebih terang dari oranye lama #ff9a3c"); assert.ok(terang(rgb(p1.garis)) < 40, "garis gelap"); assert.ok(p1.garisLebar >= 0.7 && p1.garisLebar <= 2);
      assert.ok(p1.opasitas > 0.8 && p1.garisOpasitas >= 0.5, "lebih pekat dari 0,8 lama");
      assert.equal(p1.legenda, `rgb(${rgb(p1.warna).join(", ")})`, "swatch legenda sama dengan warna titik");
      /* 4K: rem dua kali lipat, jari-jari px ikut membesar; terhadap huruf tetap ~0,25-0,35 rem */
      await tab.ukuran(3840, 2160); await tidur(900); const p2 = await peta(), rem2 = p2.titik / p2.rem;
      assert.ok(Math.abs(p2.rem - 34.8) < 0.5); assert.ok(p2.titik > p1.titik * 1.6, `titik membesar di 3840: ${p1.titik.toFixed(1)} -> ${p2.titik.toFixed(1)} px`); assert.ok(rem2 >= 0.22 && rem2 <= 0.4, `~0,25-0,35 rem di 3840: ${rem2.toFixed(3)}`); assert.ok(p2.garisLebar > p1.garisLebar, "garis ikut skala");
      assert.deepEqual(bersih(tab), []);
    } finally { await tab.tutup(); await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]); }
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

  uji("cc layar meja (Chrome): tab Log dibuka sebelum antrean (tanggal shift dari server) tiba: 'Pilih tanggal' + Unduh CSV nonaktif, bukan kotak kosong; begitu antrean tiba tanggal dibenihkan dan log dimuat", async () => {
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
      let k = await keadaan(); assert.match(k.tgl, /^\d{4}-\d\d-\d\d$/, "dibenihkan dari tanggal shift server"); assert.match(k.href, /tgl=\d{4}-\d\d-\d\d/); assert.equal(k.mati, null); assert.ok(k.tabel >= 1);
      /* operator mengosongkan tanggal */
      await q(tab, "(window.__panggil.log.length = 0)"); await tab.pilih(".cc-saring input[type=date]", "");
      k = await keadaan(); assert.equal(k.tgl, ""); assert.equal(k.tabel, 0, "tabel dan ringkasan lama dikosongkan"); assert.match(k.isi, /Pilih tanggal/); assert.doesNotMatch(k.isi, /Ringkasan per operator|Jejak \(/);
      assert.equal(k.href, null, "Unduh CSV tidak menunjuk ke mana pun"); assert.equal(k.mati, "true"); assert.equal(k.judul, "Pilih tanggal"); assert.equal(k.log, 0, "tanpa tanggal tidak ada permintaan log");
      /* jajak antrean (30 dtk) dan aksi memuat ulang antrean berkali-kali: ketikan tidak ditimpa tanggal bawaan */
      for (let i = 1; i <= 2; i++) { await jajakUlang(tab); await tab.tungguFungsi(`window.__antrean >= ${i}`, 10000); await tidur(500); }
      await q(tab, "document.querySelector('.cc-btn.ke-dalam_konfirmasi').click()"); await tab.tungguFungsi("window.__antrean >= 3", 10000); await tidur(500);   // aksi -> muat() ulang
      k = await keadaan(); assert.equal(k.tgl, "", "tanggal tetap kosong sesudah jajak dan aksi (dulu: ditimpa tanggal shift tiap muat)"); assert.match(k.isi, /Pilih tanggal/); assert.equal(k.mati, "true"); assert.equal(k.log, 0);
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

  uji("cc layar meja dan dinding (Chrome): daftar yang dipotong server ditandai: chip '500+', catatan di meja, 'N+ alert lagi' di dinding", async () => {
    await DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM cc_status")]);
    await DB.prepare(`WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 501) INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy)
      SELECT printf('%016x', 0xb000000 + n), '11', 'Kota Banda Aceh', 'Kuta Alam', 5.5, 95.3, 3, 4, 12, ?1 - n * 1000, ?1, 'buka', NULL, 0 FROM s`).bind(Date.now() - 10 * MENIT).run();
    const tab = await tabBaru(1440, 900); await cookie(tab, "sesi_staf", op.tok); await tab.buka(base + "/command-center", {tunggu: ".cc-kartu"});
    await tab.tungguFungsi("document.querySelectorAll('.cc-kartu').length === 500");
    assert.deepEqual(await q(tab, "qa('.cc-chip b').map(b => b.textContent)"), ["500+", "0+", "0"], "Baru dan Dalam konfirmasi datang dari satu daftar terpotong (yang belum dipegang dibaca duluan, jadi 'dalam konfirmasi' bisa lebih banyak dari 0): keduanya batas bawah, ditandai +; keputusan akhir tidak terpotong");
    assert.equal(await q(tab, "!q('.cc-panel .cc-spanduk.galat').hidden"), true); assert.match(await q(tab, "q('.cc-panel .cc-spanduk.galat').innerText"), /melebihi batas baca server dan dipotong.*batas bawah/);
    assert.deepEqual(bersih(tab), []); await tab.tutup();
    const pm2 = await pemirsa(["dinding"]), dd = await tabBaru(1920, 1080); await cookie(dd, "sesi_pemirsa", pm2.tok);   // sesi pm sudah dihapus uji dinding di atas
    await dd.buka(base + "/command-center/dinding", {tunggu: ".dd-item"});
    await dd.tungguFungsi("!document.querySelector('.dd-lagi').hidden && document.querySelectorAll('.dd-item').length < 60 && /^\\d+\\+ alert lagi$/.test(document.querySelector('.dd-lagi').textContent)");
    const lagi = await q(dd, "({teks: q('.dd-lagi').textContent, item: qa('.dd-item').length})"); assert.match(lagi.teks, /^\d+\+ alert lagi$/, "terpotong: akhiran + seperti chip lain, bukan '+N+'"); assert.doesNotMatch(lagi.teks, /^\+/);
    assert.equal(Number(lagi.teks.match(/\d+/)[0]) + lagi.item, 500, "N = 500 (yang dibaca) - baris tampil; '+' di belakang = masih ada yang tak terbaca");
    assert.deepEqual(bersih(dd), []); await dd.tutup();
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

  uji("cc layar dinding (Chrome): tile peringatan memakai hitungan sebenarnya (60), bukan panjang daftar 50; Awas lama tetap menyalakan bendera merah", async () => {
    const kini = Date.now();
    await DB.batch([DB.prepare("DELETE FROM peringatan"),
      DB.prepare("INSERT INTO peringatan (kunci, jenis, tingkat, judul, sumber, dibuat, berlaku_hingga) VALUES ('gempa:LS0:awas', 'gempa', 'Awas', 'uji awas lama', 'BMKG', ?1, ?2)").bind(kini - 5 * JAM, kini + JAM),
      DB.prepare(`WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 59) INSERT INTO peringatan (kunci, jenis, tingkat, judul, sumber, dibuat, berlaku_hingga)
        SELECT 'gempa:LS' || n || ':x', 'gempa', CASE WHEN n <= 40 THEN 'Siaga' ELSE 'Waspada' END, 'uji ' || n, 'BMKG', ?1 - n * 1000, ?2 FROM s`).bind(kini, kini + JAM)]);
    const pm3 = await pemirsa(["dinding"]), dd = await tabBaru(1920, 1080); await cookie(dd, "sesi_pemirsa", pm3.tok);
    try {
      await dd.buka(base + "/command-center/dinding", {tunggu: ".dd-ubin"});
      const tile = "[...document.querySelectorAll('.dd-ubin')].find(u => /Peringatan aktif/.test(u.querySelector('.dd-angka-label').textContent))";
      await dd.tungguFungsi(`(() => { const u = ${tile}; return u && u.querySelector('.dd-angka-nilai').textContent === '60'; })()`, 20000);
      const t = await q(dd, `({n: ${tile}.querySelector('.dd-angka-nilai').textContent, sub: ${tile}.querySelector('.dd-angka-sub').textContent, merah: ${tile}.classList.contains('merah')})`);
      assert.deepEqual(t, {n: "60", sub: "1 Awas · 40 Siaga · 19 Waspada", merah: true}, "daftar server hanya 50 terbaru (tanpa Awas lama); tile dari total dan per_tingkat");
      assert.deepEqual(bersih(dd), []);
    } finally { await dd.tutup(); await DB.prepare("DELETE FROM peringatan").run(); }
  });
}
