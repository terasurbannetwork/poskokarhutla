/* Lapisan rute statistik, sesi admin, kotak pesan, dan statistik publik: src/worker.js di workerd (Miniflare) dengan D1 lokal
   sungguhan yang diberi migrasi apa adanya. Tanpa mock klien DB. Resend dan daftar IP operator dari fixture lewat outboundService.
   Jalankan: node --test tests/warga/statistik.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {createHmac} from "node:crypto";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const JAM = 3600e3, HARI = 24 * JAM, WIB = 7 * JAM;
const tglWIB = t => new Date(t + WIB).toISOString().slice(0, 10), slotWIB = t => Math.floor(((t + WIB) % HARI) / 6e5);
const SESI_KUNCI = "kunci-sesi-uji-0123456789", TOKEN = "rahasia-admin", UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const SANDI = "sandi uji:7#&", AKUN = `admin@contoh.id:${SANDI}`, MASUK = "email=admin%40contoh.id&sandi=" + encodeURIComponent(SANDI);
const IP_GPTBOT = "20.171.206.9", IP_PALSU = "203.0.113.50";
let mf, DB, ASET_404 = new Set(), EMAIL = [];
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (ASET_404.has(p)) return new Response("tidak ada", {status: 404});
  const f = path.join(AKAR, "public", p.endsWith("/") ? p + "index.html" : p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) ? new Response(readFileSync(f), {headers: {"content-type": f.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream"}}) : new Response("tidak ada", {status: 404});
};
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname === "api.resend.com") { EMAIL.push({h: Object.fromEntries(req.headers), b: await req.json()}); return Response.json({id: "uji"}); }
  if (u.href === "https://openai.com/gptbot.json") return Response.json({creationTime: "2026-10-01", prefixes: [{ipv4Prefix: "20.171.206.0/24"}, {ipv6Prefix: "2a03:2880:f000::/36"}]});
  if (u.href === "https://openai.com/chatgpt-user.json") return Response.json({prefixes: [{ipv4Prefix: "23.98.142.176/28"}]});
  return new Response("tidak ada", {status: 404});
};
const opsi = {modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
  d1Databases: {DB: "uji-statistik"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: `${TOKEN}, token-moderator-2, ${AKUN}`, SESI_KUNCI, EMAIL_API_KEY: "re_uji", EMAIL_TO: "pemilik@contoh.id", EMAIL_FROM: "Posko <posko@contoh.id>"},
  serviceBindings: {ASSETS: aset}, outboundService: luar};

before(async () => { mf = new Miniflare(opsi); DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s))); });
after(() => mf?.dispose());

let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
let ipN = 0;
const ipBaru = () => `10.1.${Math.floor(++ipN / 250)}.${ipN % 250}`;
const panggil = async (metode, jalur, body, o = {}) => {
  const r = await mf.dispatchFetch("https://posko.lokal" + jalur, {method: metode, redirect: "manual", cf: o.cf,
    headers: {"cf-connecting-ip": o.ip || "10.9.9.9", "user-agent": o.ua ?? UA, ...(typeof body === "string" ? {"content-type": "application/x-www-form-urlencoded"} : {"content-type": "application/json"}), ...o.h},
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)});
  const teks = await r.text(); let j = null; try { j = JSON.parse(teks); } catch (e) {}
  return {status: r.status, j, teks, h: r.headers};
};
const ADMIN = {h: {authorization: "Bearer " + TOKEN}};
let vN = 0;
const vid = () => "uji" + String(++vN).padStart(13, "0");
const jejak = (o, ops) => panggil("POST", "/api/jejak", {v: vid(), h: "karhutla", ...o}, ops);
const hari = (tgl = tglWIB(Date.now()), hal = "karhutla") => DB.prepare("SELECT * FROM stat_hari WHERE tgl = ? AND hal = ?").bind(tgl, hal).first();
const tunggu = async (f, ms = 3000) => { const t = Date.now(); for (;;) { const v = await f(); if (v) return v; if (Date.now() - t > ms) return v; await new Promise(r => setTimeout(r, 25)); } };
const sesi = (exp, mod, kunci = SESI_KUNCI) => `sesi_admin=${exp}.${mod}.${createHmac("sha256", kunci).update(`${exp}.${mod}`).digest("hex")}`;
const modDari = async t => (await import("node:crypto")).createHash("sha256").update(t).digest("hex").slice(0, 12);

/* ================================================================ /api/jejak */
uji("jejak: masukan salah DITOLAK dan tidak menulis apa pun", async () => {
  const kasus = [
    [{e: [["klik_iklan", "x"]]}, {}, 400, "nama peristiwa di luar allow-list"],
    [{e: [["cf_negara", "ID"]]}, {}, 400, "dimensi milik server dikirim klien"],
    [{e: Array.from({length: 51}, (_, i) => ["tab", "t" + i])}, {}, 413, "51 peristiwa (maks 50)"],
    [{e: [["tab", "x".repeat(4100)]]}, {}, 413, "body > 4 KB"],
    [{v: undefined}, {}, 400, "tanpa id pengunjung"],
    [{v: "pendek"}, {}, 400, "id pengunjung < 16 karakter"],
    [{v: "HURUF-BESAR-DAN-STRIP"}, {}, 400, "id pengunjung bukan [0-9a-z]"],
    [{h: "admin"}, {}, 400, "halaman di luar enum"],
    [{s: [144]}, {}, 400, "slot 144"],
    [{s: [3, 3]}, {}, 400, "slot kembar"],
    [{e: [["tab", "peta", 0]]}, {}, 400, "n = 0"],
    [{e: [["vital", "lcp", 1, -5]]}, {}, 400, "nilai negatif"],
    [{k: 99999}, {}, 400, "klik di luar batas"],
    [{}, {ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"}, 403, "UA bot"],
    [{}, {ua: "python-requests/2.31"}, 403, "UA skrip"],
    [{}, {ua: ""}, 403, "tanpa user-agent"],
  ];
  for (const [o, ops, st, sebab] of kasus) {
    const r = await jejak(o, ops);
    assert.equal(r.status, st, `${sebab}: harus ${st}, diterima ${r.status} ${r.teks}`);
  }
  assert.equal((await DB.prepare("SELECT count(*) n FROM stat_hari").first()).n, 0, "kiriman yang ditolak tidak boleh membuat baris");
});

uji("jejak: tiap kiriman = satu baris (hari, halaman) yang diperbarui, angka teragregasi", async () => {
  const s = slotWIB(Date.now()), cf = {country: "ID", region: "Riau", city: "Pekanbaru", latitude: "0.5071", longitude: "101.4478", timezone: "Asia/Jakarta", colo: "CGK", asn: 7713, asOrganization: "PT Telkom Indonesia"};
  const a = vid();
  assert.equal((await panggil("POST", "/api/jejak", {v: a, h: "karhutla", o: 1, b: 0, kv: 1, k: 4, d: 90, s: [s], e: [["tampil", "peta"], ["tab", "peta", 2], ["vital", "lcp", 1, 2400], ["kompleks", "K0001"]]}, {cf})).status, 204);
  assert.equal((await panggil("POST", "/api/jejak", {v: vid(), h: "karhutla", o: 1, b: 1, kv: 1, k: 1, d: 30, s: [s], e: [["tampil", "ringkasan"], ["tab", "peta"]]}, {cf})).status, 204);
  assert.equal((await panggil("POST", "/api/jejak", {v: a, h: "karhutla", o: 0, b: 0, kv: 0, k: 2, d: 60, s: [], e: [["tab", "insight"], ["vital", "lcp", 1, 1600]]}, {cf})).status, 204);
  assert.equal((await DB.prepare("SELECT count(*) n FROM stat_hari").first()).n, 1, "3 kiriman satu halaman harus tetap 1 baris");
  const r = await hari(), d = JSON.parse(r.dim), slot = JSON.parse(r.slot);
  assert.deepEqual([r.kiriman, r.orang, r.kembali, r.kunjungan, r.tampilan, r.klik, r.detik], [3, 2, 1, 2, 2, 7, 180], "kiriman/orang/kembali/kunjungan/tampilan/klik/detik");
  assert.deepEqual(d.tab.peta, [3, 0], "tab peta n=3 (2 + 1)");
  assert.deepEqual(d.vital.lcp, [2, 4000], "vital lcp n=2, s=2400+1600");
  assert.deepEqual(d.cf_negara.ID, [2, 0], "konteks Cloudflare hanya dihitung pada kunjungan baru (kv=1), bukan tiap kiriman");
  assert.deepEqual(d.cf_kota["Pekanbaru|Riau|ID|0.5|101.4"], [2, 0], "kota dibulatkan 0,1°");
  assert.deepEqual(d.cf_jaringan["PT Telkom Indonesia"], [2, 0]);
  assert.equal(d.browser.Chrome[0], 2); assert.equal(d.os.Android[0], 2);
  assert.equal(slot[s], 2, `slot 10 menit ${s} harus 2 orang`);
  assert.equal(d._n.tab, 2, "pencacah kunci tab = peta, insight");
  for (const h of ["tentang", "privasi", "statistik"]) {
    assert.equal((await jejak({h, o: 1, kv: 1, e: [["tampil", h]]})).status, 204, `halaman ${h} harus diterima`);
    assert.equal((await hari(tglWIB(Date.now()), h))?.orang, 1, `halaman ${h} tercatat di barisnya sendiri`);
  }
  await DB.prepare("DELETE FROM stat_hari WHERE hal IN ('tentang', 'privasi', 'statistik')").run();   // uji berikutnya menghitung jumlah baris
});

uji("jejak: kunci baru di atas 100 per dimensi per hari masuk 'lainnya'", async () => {
  const tgl = tglWIB(Date.now()), r = await hari(tgl), d = JSON.parse(r.dim);
  d.cari = Object.fromEntries(Array.from({length: 100}, (_, i) => ["Wilayah " + i, [1, 0]])); d._n.cari = 100;
  await DB.prepare("UPDATE stat_hari SET dim = ? WHERE tgl = ? AND hal = 'karhutla'").bind(JSON.stringify(d), tgl).run();
  assert.equal((await jejak({e: [["cari", "Wilayah baru"], ["cari", "Wilayah 7"]]})).status, 204);
  const x = JSON.parse((await hari(tgl)).dim);
  assert.equal(x.cari["Wilayah baru"], undefined, "kunci ke-101 tidak boleh tersimpan apa adanya");
  assert.deepEqual(x.cari.lainnya, [1, 0], "kunci ke-101 masuk 'lainnya'");
  assert.deepEqual(x.cari["Wilayah 7"], [2, 0], "kunci lama tetap bertambah");
  assert.equal(x._n.cari, 100, "'lainnya' tidak menambah pencacah kunci");
});

uji("jejak: saat ramai disampel deterministik dan dicatat berbobot 1/p", async () => {
  const tgl = tglWIB(Date.now());
  await DB.prepare("INSERT OR IGNORE INTO stat_hari (tgl, hal, slot, menit) VALUES (?, 'banjir', ?, ?)").bind(tgl, JSON.stringify(Array(144).fill(0)), JSON.stringify(Array(1440).fill(0))).run();
  await DB.prepare("UPDATE stat_hari SET kiriman = 19000, orang = 0 WHERE tgl = ? AND hal = 'banjir'").bind(tgl).run();   // total ≥ 18 rb -> p = 0,2
  let ditulis = 0, dilewati = 0;
  for (let i = 0; i < 60; i++) { const r = await jejak({h: "banjir", o: 1}); if (r.status === 204) ditulis++; else if (r.status === 202) dilewati++; else assert.fail(`status ${r.status} ${r.teks}`); }
  const r = await hari(tgl, "banjir");
  assert.ok(ditulis > 0 && dilewati > 0, `sampel 0,2 harus menulis sebagian: ditulis ${ditulis}, dilewati ${dilewati}`);
  assert.equal(r.kiriman, 19000 + ditulis, "kiriman (tanpa skala) = jumlah yang benar-benar ditulis");
  assert.equal(r.orang, ditulis * 5, `tiap kiriman tersampel berbobot 1/0,2 = 5: orang ${r.orang} vs ${ditulis}×5`);
  assert.equal(r.sampel, 0.2, "kolom sampel mencatat p terkecil hari itu");
  const s = await panggil("GET", `/api/statistik?hal=banjir`, undefined, ADMIN);
  assert.equal(s.j.sampel, true, "API harus menandai angka sebagai perkiraan (sampel)");
  await DB.prepare("DELETE FROM stat_hari WHERE tgl = ? AND hal = 'banjir'").bind(tgl).run();   // anggaran sampel dihitung lintas halaman: kembalikan
});

/* ================================================================ /api/statistik */
uji("statistik: tanpa masuk 401, token salah 401", async () => {
  assert.equal((await panggil("GET", "/api/statistik")).status, 401);
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {authorization: "Bearer salah"}})).status, 401);
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {"x-admin-token": "salah"}})).status, 401);
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {"x-admin-token": TOKEN}})).status, 200, "x-admin-token tetap diterima untuk skrip");
  assert.equal((await panggil("GET", "/api/statistik?dari=2026-01-01&sampai=2026-05-01", undefined, ADMIN)).status, 400, "rentang > 90 hari ditolak");
});

uji("statistik: total hari yang disemai, slot, dimensi lintas halaman, pita gangguan", async () => {
  const T = "2026-01-15", sl = Array(144).fill(0), sl2 = Array(144).fill(0), sis = Array(144).fill(0); sl[60] = 3; sl[61] = 1; sl2[60] = 2; sis[54] = 1;
  const ins = (hal, o, slot, dim) => DB.prepare(`INSERT INTO stat_hari (tgl, hal, kiriman, orang, kembali, kunjungan, tampilan, klik, detik, slot, menit, dim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(T, hal, o[0], o[1], o[2], o[3], o[4], o[5], o[6], JSON.stringify(slot), JSON.stringify(Array(1440).fill(0)), JSON.stringify(dim));
  await DB.batch([
    ins("karhutla", [10, 8, 3, 9, 20, 40, 1200], sl, {_n: {tab: 2}, tab: {peta: [12, 0], insight: [5, 0]}, provinsi: {"14": [4, 0]}}),
    ins("banjir", [4, 3, 1, 3, 6, 9, 300], sl2, {_n: {tab: 1}, tab: {peta: [2, 0]}}),
    ins("sistem", [1, 0, 0, 0, 0, 0, 0], sis, {_n: {basi: 1}, basi: {titik: [1, 0]}}),
  ]);
  const r = await panggil("GET", `/api/statistik?dari=${T}&sampai=${T}`, undefined, ADMIN);
  assert.equal(r.status, 200, r.teks);
  assert.deepEqual(r.j.ringkas, {orang: 11, kembali: 4, kunjungan: 12, tampilan: 26, klik: 49, detik: 1500, kiriman: 14}, "ringkas = jumlah karhutla + banjir, tanpa baris sistem");
  assert.deepEqual(r.j.slot, [[60, 5], [61, 1]], "slot dijumlah lintas halaman");
  assert.deepEqual(r.j.dim.tab, [["peta", 14, 0], ["insight", 5, 0]], "dimensi digabung & diurutkan");
  assert.deepEqual(r.j.gangguan, [54], "pita gangguan dari baris sistem");
  assert.equal(r.j.dim.basi, undefined, "dimensi sistem tidak ikut daftar pengunjung");
  assert.match(r.j.jendela, /2026-01-15, 00:00–24:00 WIB/);
  const b = await panggil("GET", `/api/statistik?dari=${T}&sampai=${T}&hal=banjir`, undefined, ADMIN);
  assert.equal(b.j.ringkas.orang, 3, "saring hal=banjir");
});

uji("statistik: pengunjung kembali dan aturan 30 menit dari bendera klien", async () => {
  const tgl = tglWIB(Date.now()), r0 = await hari(tgl) || {orang: 0, kembali: 0, kunjungan: 0};
  await jejak({o: 1, b: 1, kv: 1});   // pertama hari ini, pernah datang kemarin, kunjungan baru
  await jejak({o: 0, b: 1, kv: 0});   // kiriman kedua di kunjungan yang sama: b tanpa o tidak menambah kembali
  await jejak({o: 0, b: 1, kv: 1});   // kembali setelah > 30 menit: kunjungan +1, orang tetap
  const r = await hari(tgl);
  assert.deepEqual([r.orang - r0.orang, r.kembali - r0.kembali, r.kunjungan - r0.kunjungan], [1, 1, 2], "orang +1, kembali +1, kunjungan +2");
  const s = await panggil("GET", "/api/statistik?hal=karhutla", undefined, ADMIN);
  assert.equal(s.j.ringkas.kembali, r.kembali); assert.ok(s.j.langsung.sekarang >= 1, "kiriman 5 menit terakhir terhitung 'saat ini'");
});

/* ================================================================ sesi admin */
uji("masuk: email/sandi salah ditolak, cookie HttpOnly Secure SameSite=Strict 12 jam", async () => {
  for (const b of [MASUK.replace("sandi=", "sandi=x"), "email=lain%40contoh.id&sandi=" + encodeURIComponent(SANDI), "email=&sandi=", "token=" + encodeURIComponent(TOKEN)]) {
    const salah = await panggil("POST", "/admin/masuk", b, {ip: ipBaru()});
    assert.equal(salah.status, 401, b); assert.equal(salah.h.get("set-cookie"), null, "masuk gagal tidak boleh memberi cookie: " + b);
  }
  assert.equal((await panggil("POST", "/admin/masuk", MASUK.replace("admin@", "ADMIN@"), {ip: ipBaru()})).status, 303, "email tidak peka huruf besar");
  const ok = await panggil("POST", "/admin/masuk", MASUK, {ip: ipBaru()});
  assert.equal(ok.status, 303); assert.equal(ok.h.get("location"), "/admin/statistik");
  const c = ok.h.get("set-cookie");
  for (const f of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/", "Max-Age=43200"]) assert.ok(c.includes(f), `cookie sesi tanpa ${f}: ${c}`);
  const kue = c.split(";")[0];
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {cookie: kue}})).status, 200, "cookie sesi membuka API");
  const hal = await panggil("GET", "/admin/statistik", undefined, {h: {cookie: kue}});
  assert.equal(hal.status, 200); assert.match(hal.teks, /admin\/statistik\.js/); assert.match(hal.h.get("content-security-policy"), /script-src 'self'/);
  assert.equal((await panggil("GET", "/admin/statistik")).status, 303, "tanpa sesi dialihkan ke /admin/masuk");
  assert.equal((await panggil("GET", "/admin/pesan")).h.get("location"), "/admin/masuk");
  assert.equal((await panggil("GET", "/admin/masuk")).status, 200);
});

uji("masuk: sesi kedaluwarsa, dipalsukan, atau token dicabut ditolak", async () => {
  const mod = await modDari(TOKEN), kini = Date.now();
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {cookie: sesi(kini + JAM, mod)}})).status, 200, "sesi sah (pembanding)");
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {cookie: sesi(kini - 1000, mod)}})).status, 401, "sesi kedaluwarsa");
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {cookie: sesi(kini + JAM, mod, "kunci-lain")}})).status, 401, "ditandatangani kunci lain");
  const ubah = sesi(kini + JAM, mod).replace(/=(\d+)\./, (m, e) => `=${Number(e) + 1}.`);
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {cookie: ubah}})).status, 401, "masa berlaku diubah tanpa tanda baru");
  assert.equal((await panggil("GET", "/api/statistik", undefined, {h: {cookie: sesi(kini + JAM, await modDari("token-yang-dicabut"))}})).status, 401, "moderator yang tokennya tidak ada lagi");
});

uji("masuk: percobaan dibatasi lajunya per IP", async () => {
  const ip = ipBaru();
  for (let i = 1; i <= 8; i++) assert.equal((await panggil("POST", "/admin/masuk", MASUK + "tebak" + i, {ip})).status, 401, `percobaan ke-${i}`);
  const r = await panggil("POST", "/admin/masuk", MASUK, {ip});
  assert.equal(r.status, 429, `percobaan ke-9 dalam 15 menit harus 429 walau token benar, diterima ${r.status}`);
  assert.equal(r.h.get("set-cookie"), null);
  assert.equal((await panggil("POST", "/admin/masuk", MASUK, {ip: ipBaru()})).status, 303, "IP lain tidak terdampak");
});

uji("keluar: cookie dihapus, POST dari origin lain ditolak", async () => {
  const r = await panggil("POST", "/admin/keluar", "");
  assert.equal(r.status, 303); assert.match(r.h.get("set-cookie"), /sesi_admin=;.*Max-Age=0/);
  assert.equal((await panggil("POST", "/admin/keluar", "", {h: {origin: "https://jahat.contoh"}})).status, 403);
});

/* ================================================================ kotak pesan */
const pesanSah = (o = {}) => ({nama: "Rina", instansi: "BPBD Riau", email: "rina@bpbd.go.id", kategori: "koreksi", pesan: "Titik K0042 sebenarnya sudah padam sejak kemarin sore.", tautan: "https://posko.lokal/k/K0042", ...o});
uji("pesan: masukan salah DITOLAK dan tidak menulis apa pun", async () => {
  const kasus = [
    [{email: ""}, "email kosong"], [{email: "bukan-email"}, "email tanpa @"], [{email: "a@b"}, "email tanpa domain"], [{email: "a b@c.id"}, "email berspasi"],
    [{pesan: "pendek"}, "pesan < 10"], [{pesan: "<b></b>   <i>x</i>"}, "pesan < 10 setelah HTML dibuang"], [{pesan: "x".repeat(2001)}, "pesan > 2000"],
    [{kategori: "spam"}, "kategori di luar enum"], [{situs: "http://bot.contoh"}, "honeypot terisi"], [{nama: "n".repeat(101)}, "nama > 100"],
  ];
  for (const [o, sebab] of kasus) { const r = await panggil("POST", "/api/pesan", pesanSah(o), {ip: ipBaru()}); assert.equal(r.status, 400, `${sebab}: ${r.status} ${r.teks}`); }
  assert.equal((await DB.prepare("SELECT count(*) n FROM pesan").first()).n, 0);
  assert.equal((await panggil("POST", "/api/pesan", pesanSah(), {ip: ipBaru(), h: {origin: "https://jahat.contoh"}})).status, 403, "origin lain");
});

uji("pesan: tersimpan tanpa HTML, email notifikasi ke pemilik dengan reply-to pengirim", async () => {
  EMAIL = [];
  const r = await panggil("POST", "/api/pesan", pesanSah({pesan: "<script>alert(1)</script>Mohon koreksi <b>K0042</b>, sudah padam.", email: "Rina@BPBD.go.id"}), {ip: ipBaru()});
  assert.equal(r.status, 201, r.teks);
  const p = await DB.prepare("SELECT * FROM pesan WHERE id = ?").bind(r.j.id).first();
  assert.equal(p.isi, "alert(1)Mohon koreksi K0042, sudah padam.", "tag HTML dibuang");
  assert.equal(p.email, "rina@bpbd.go.id"); assert.equal(p.status, "baru"); assert.match(p.ip_hash, /^[0-9a-f]{64}$/);
  const e = await tunggu(() => EMAIL[0]);
  assert.ok(e, "notifikasi email tidak terkirim");
  assert.equal(e.h.authorization, "Bearer re_uji"); assert.deepEqual(e.b.to, ["pemilik@contoh.id"]); assert.equal(e.b.reply_to, "rina@bpbd.go.id");
  assert.match(e.b.subject, /Koreksi data/);
});

uji("pesan: dibatasi 5 per jam per IP", async () => {
  const ip = ipBaru();
  for (let i = 1; i <= 5; i++) assert.equal((await panggil("POST", "/api/pesan", pesanSah(), {ip})).status, 201, `pesan ke-${i}`);
  assert.equal((await panggil("POST", "/api/pesan", pesanSah(), {ip})).status, 429, "pesan ke-6 dalam sejam");
});

uji("pesan: admin wajib masuk, status berpindah, saring kategori dan cari", async () => {
  const id = (await DB.prepare("SELECT id FROM pesan ORDER BY dibuat LIMIT 1").first()).id;
  assert.equal((await panggil("GET", "/api/pesan")).status, 401);
  assert.equal((await panggil("POST", `/api/pesan/${id}`, {status: "dibaca"})).status, 401);
  const daftar = await panggil("GET", "/api/pesan", undefined, ADMIN);
  assert.equal(daftar.status, 200); assert.equal(daftar.j.email_siap, true); assert.equal(daftar.j.hitung.baru, 6);
  for (const st of ["dibaca", "arsip", "baru", "dibaca"]) {
    const r = await panggil("POST", `/api/pesan/${id}`, {status: st}, ADMIN);
    assert.equal(r.status, 200, `-> ${st}: ${r.teks}`);
    assert.equal((await DB.prepare("SELECT status FROM pesan WHERE id = ?").bind(id).first()).status, st);
  }
  assert.equal((await panggil("POST", `/api/pesan/${id}`, {status: "dihapus"}, ADMIN)).status, 400, "status di luar enum");
  assert.equal((await panggil("POST", `/api/pesan/0123456789abcdef`, {status: "arsip"}, ADMIN)).status, 404);
  assert.equal((await panggil("GET", "/api/pesan?kategori=media", undefined, ADMIN)).j.pesan.length, 0);
  assert.equal((await panggil("GET", "/api/pesan?q=alert", undefined, ADMIN)).j.pesan.length, 1);
  assert.equal((await panggil("GET", "/api/pesan?status=baru", undefined, ADMIN)).j.pesan.length, 5);
  const s = await panggil("GET", "/api/statistik", undefined, ADMIN);
  assert.equal(s.j.pesan_baru, 5, "lencana pesan belum dibaca di dasbor");
});

/* ================================================================ statistik publik (hit HTML) */
uji("cron: daftar IP operator diambil dan disimpan, yang gagal dilewati", async () => {
  await (await mf.getWorker()).scheduled({cron: "17 * * * *"});
  const r = (await DB.prepare("SELECT operator, cidr FROM stat_ip ORDER BY operator").all()).results;
  assert.deepEqual(r.map(x => x.operator), ["openai-gptbot", "openai-user"], "hanya daftar yang berhasil diambil");
  assert.deepEqual(JSON.parse(r[0].cidr), ["20.171.206.0/24", "2a03:2880:f000::/36"]);
});

uji("hit HTML: manusia, jawaban AI, perayap terverifikasi/palsu, dan jaringan hosting dipisah", async () => {
  const browser = {"accept-language": "id-ID,id;q=0.9", "sec-fetch-dest": "document", referer: "https://chatgpt.com/"};
  const hit = (jalur, ua, ip, h = {}, cf = {country: "ID", asn: 7713, asOrganization: "PT Telkom Indonesia"}) => panggil("GET", jalur, undefined, {ua, ip, h, cf});
  const r = await hit("/k/K0001", UA, "36.80.1.2", browser);
  assert.equal(r.status, 200); assert.match(r.teks, /<html/);
  await hit("/", UA, "36.80.1.2", {...browser, referer: ""});
  await hit("/banjir/", UA, "36.80.9.9", {...browser, referer: "https://www.google.com/"});
  await hit("/peta", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot", IP_GPTBOT);
  await hit("/peta", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot", IP_PALSU);
  await hit("/metode", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot", "23.98.142.180");
  await hit("/metode", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-User/1.0", "160.79.104.10");
  await hit("/", UA, "3.5.1.1", browser, {country: "US", asn: 16509, asOrganization: "AMAZON-02"});
  await hit("/", UA, "36.80.7.7", {}, {country: "ID", asn: 7713});   // tanpa accept-language: bukan peramban
  const tgl = tglWIB(Date.now());
  const p = await tunggu(async () => { const x = await hari(tgl, "publik"); return x && x.tampilan + x.ai_jawab + x.ai_crawl + x.tak_dihitung >= 9 ? x : null; });
  assert.ok(p, "hit HTML tidak tercatat (waitUntil)");
  assert.deepEqual([p.tampilan, p.orang, p.ai_jawab, p.ai_crawl, p.mesin_cari, p.tak_dihitung], [3, 2, 2, 1, 0, 3], "tampilan/orang/ai_jawab/ai_crawl/mesin_cari/tak_dihitung");
  assert.equal(JSON.parse(p.slot).reduce((t, v) => t + v, 0), 2, "slot 10 menit menghitung orang (2), bukan muat halaman (3)");
  const d = JSON.parse(p.dim);
  assert.deepEqual(Object.keys(d.halaman).sort(), ["/", "/banjir/", "/k/K0001"]);
  assert.deepEqual(d.kanal, {"Dari jawaban AI": [1, 0], Langsung: [1, 0], Pencarian: [1, 0]});
  assert.deepEqual(d.ai_agen, {"ChatGPT|terverifikasi": [1, 0], "Claude|tak terverifikasi": [1, 0]});
  assert.deepEqual(d.perayap, {"AI|GPTBot|terverifikasi": [1, 0]});
  assert.deepEqual(d.tak_dihitung, {"perayap palsu: GPTBot": [1, 0], "jaringan hosting/cloud": [1, 0], "tanpa tanda peramban": [1, 0]});
  const api = await panggil("GET", "/api/publik?r=7h");
  assert.equal(api.status, 200); assert.equal(api.j.online, 2, "dua orang berbeda dalam 5 menit"); assert.equal(api.j.tujuh.tampilan, 3);
  assert.deepEqual(api.j.buka.map(x => x[0]).sort(), ["/", "/banjir/"], "halaman terakhir tiap orang");
  assert.equal((await panggil("GET", "/api/publik?r=1tahun")).status, 400);
});

uji("hit HTML: IP tidak pernah tersimpan, garam harian dimusnahkan cron", async () => {
  const semua = [];
  for (const t of ["stat_hari", "stat_tamu", "stat_garam", "stat_ip", "laju", "pesan"]) semua.push(JSON.stringify((await DB.prepare(`SELECT * FROM ${t}`).all()).results));
  for (const ip of ["36.80.1.2", "36.80.9.9", IP_PALSU, "3.5.1.1", "160.79.104.10"]) assert.ok(!semua.join("").includes(ip), `IP ${ip} tersimpan di D1`);
  const kemarin = tglWIB(Date.now() - HARI), kini = tglWIB(Date.now());
  await DB.prepare("INSERT INTO stat_garam (tgl, garam) VALUES (?, ?)").bind(kemarin, "a".repeat(64)).run();
  await DB.prepare("INSERT INTO stat_tamu (tgl, h) VALUES (?, ?)").bind(tglWIB(Date.now() - 2 * HARI), "0123456789abcdef").run();
  await (await mf.getWorker()).scheduled({cron: "17 * * * *"});
  assert.deepEqual((await DB.prepare("SELECT tgl FROM stat_garam").all()).results.map(x => x.tgl), [kini], "hanya garam hari ini yang tersisa");
  assert.equal((await DB.prepare("SELECT count(*) n FROM stat_tamu WHERE tgl < ?").bind(kemarin).first()).n, 0, "sidik pengunjung > 1 hari dihapus");
});

uji("hit HTML: rute HTML dilayani dari aset, aset lain tidak lewat jalur ini", async () => {
  const idx = readFileSync(path.join(AKAR, "public/index.html"), "utf8"), bj = readFileSync(path.join(AKAR, "public/banjir/index.html"), "utf8");
  /* Worker sengaja menulis ulang meta og:/twitter:/canonical per rute (src/og_meta.js) dan atribut pil data-pb-*;
     selain itu isi harus sama persis dengan berkas */
  /* ... dan merek: selain *.workers.dev, "Centurisk97" di judul/meta jadi "Pantau Bencana" (17 Okt 2026) */
  const tanpaPil = t => t.replace(/ data-pb-(online|tampil)="\d+"/g, "").replace(/Centurisk97/g, "Pantau Bencana")
    .replace(/<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>|<link rel="canonical"[^>]*>/g, "<meta-og>");
  for (const [j, isi] of [["/", idx], ["/peta", idx], ["/k/K0009", idx], ["/banjir/", bj], ["/banjir", bj]]) {
    const r = await panggil("GET", j, undefined, {h: {"accept-language": "id"}});
    assert.equal(r.status, 200, `GET ${j}`); assert.equal(tanpaPil(r.teks), tanpaPil(isi), `GET ${j} harus isi berkas HTML-nya`);
  }
  // /tentang kini tab di index.html (HALAMAN); berkas tentang.html dilayani di /tentang-halaman
  const t = await panggil("GET", "/tentang"); assert.equal(tanpaPil(t.teks), tanpaPil(idx));
  const th = await panggil("GET", "/tentang-halaman"); assert.equal(tanpaPil(th.teks), tanpaPil(readFileSync(path.join(AKAR, "public/tentang.html"), "utf8")));
  const th2 = await panggil("GET", "/tentang-halaman/"); assert.equal(tanpaPil(th2.teks), tanpaPil(readFileSync(path.join(AKAR, "public/tentang.html"), "utf8")), "garis miring di ujung tetap halaman yang sama");
  const {HTML_RUTE} = await import("../../src/worker.js");
  for (const j of ["/jejak.js", "/data/meta.json", "/admin/admin.css", "/img/logo.svg", "/banjir/data/meta.json"]) assert.ok(!HTML_RUTE.some(([re]) => re.test(j)), `${j} tidak boleh memanggil Worker`);
  const s = await panggil("GET", "/statistik"); assert.equal(s.status, 200); assert.match(s.teks, /statistik_publik\.js/);
});

uji("cron: retensi statistik 90 hari (publik dikosongkan rinciannya), pesan 180 hari, pita gangguan", async () => {
  const lama = tglWIB(Date.now() - 95 * HARI), k = JSON.stringify(Array(144).fill(0)), m = JSON.stringify(Array(1440).fill(0));
  await DB.batch([
    DB.prepare(`INSERT INTO stat_hari (tgl, hal, tampilan, slot, menit, dim) VALUES (?, 'karhutla', 5, ?, ?, '{"_n":{"tab":1},"tab":{"peta":[5,0]}}')`).bind(lama, k, m),
    DB.prepare(`INSERT INTO stat_hari (tgl, hal, tampilan, slot, menit, dim) VALUES (?, 'publik', 7, ?, ?, '{"_n":{"halaman":1},"halaman":{"/":[7,0]}}')`).bind(lama, k, m),
    DB.prepare(`INSERT INTO pesan (id, dibuat, diubah, email, kategori, isi, ip_hash) VALUES ('00000000000000aa', ?, ?, 'x@y.id', 'lainnya', 'pesan yang sudah lama', ?)`).bind(Date.now() - 181 * HARI, Date.now() - 181 * HARI, "b".repeat(64)),
  ]);
  ASET_404.add("/data/meta.json");   // titik basi -> pita gangguan
  await (await mf.getWorker()).scheduled({cron: "17 * * * *"});
  ASET_404.clear();
  assert.equal(await hari(lama, "karhutla"), null, "baris analitik > 90 hari dihapus");
  const pub = await hari(lama, "publik");
  assert.equal(pub.tampilan, 7, "baris publik lama tetap ada (angka sejak diluncurkan)"); assert.equal(pub.dim, '{"_n":{}}', "rincian publik > 90 hari dikosongkan");
  assert.equal((await DB.prepare("SELECT count(*) n FROM pesan WHERE id = '00000000000000aa'").first()).n, 0, "pesan > 180 hari dihapus");
  const sis = await hari(tglWIB(Date.now()), "sistem");
  assert.ok(sis && JSON.parse(sis.slot)[slotWIB(Date.now())] >= 1, "slot sekarang ditandai gangguan");
  assert.ok(JSON.parse(sis.dim).basi.titik, "sumber basi tercatat");
});
