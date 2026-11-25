/* Satu Pintu Masuk, PM-03 (RENCANA-UJI U-1..U-9): src/masuk.js di atas worker.js utuh dan D1 lokal sungguhan (Miniflare, migrasi apa adanya).
   Turnstile dijawab fixture outboundService (token "ok" sah, lain tidak); kode dibaca dari wa_antre seperti gerbang WA. Nomor uji hanya berawalan 62800. */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul rute mengimpornya balik (siklus)

const uji = berantai();
const ASAL = "http://bnpb.lokal", RAHASIA = {MASUK_KUNCI: "kunci-masuk-uji-panjang-lebih-dari-32-karakter", TURNSTILE_SECRET: "ts-rahasia-uji", TURNSTILE_SITEKEY: "ts-situs-uji"};
let siteverify = 0;   // jumlah panggilan siteverify: token ngawur di atas batas IP tidak boleh memicunya
const luar = async req => {
  if (new URL(req.url).host === "challenges.cloudflare.com") { siteverify++; return Response.json({success: (await req.formData()).get("response") === "ok"}); }
  return new Response("diblok di uji", {status: 599});
};
const U = await siapkan("uji-masuk", {ikat: RAHASIA, luar});
const TANPA = {};   // satu Worker per rahasia yang dihilangkan (U-6); dibuat di atas karena siapkan() mendaftarkan penutupnya
for (const hilang of Object.keys(RAHASIA)) { const {[hilang]: _, ...sisa} = RAHASIA; TANPA[hilang] = await siapkan("uji-masuk-tanpa-" + hilang.toLowerCase(), {ikat: sisa, luar}); }
const PENDEK = await siapkan("uji-masuk-kunci-pendek", {ikat: {...RAHASIA, MASUK_KUNCI: "x".repeat(31)}, luar});
const BELUM = await siapkan("uji-masuk-belum-migrasi", {ikat: RAHASIA, luar, sampai: "0133_"});
const H = (n, tambah = {}) => ({"cf-connecting-ip": `10.8.0.${n}`, "x-pb": "1", origin: ASAL, ...tambah});
const nomor = i => `62800555${String(i).padStart(4, "0")}`;   // 12 digit, awalan 62800
const lokal = i => "0" + nomor(i).slice(2);
const minta = (i, ip = i, tambah = {}) => U.api("POST", "/api/masuk/kode", {wa: lokal(i), turnstile: "ok"}, H(ip, tambah));
const periksa = (i, kode, ip = i) => U.api("POST", "/api/masuk/periksa", {wa: lokal(i), kode}, H(ip));
const kodeTerkirim = async i => (await U.DB.prepare("SELECT pesan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp' ORDER BY dibuat DESC LIMIT 1").bind(nomor(i)).first())?.pesan.match(/\b([0-9]{6})\b/)[1];
const salahDari = k => k === "000000" ? "111111" : "000000";
const semuaBaris = async () => (await Promise.all(["mk_kode", "wa_antre", "mk_akun", "mk_sesi", "laju_bnpb"].map(t => U.n(t)))).join(",");

uji("masuk U-1: minta kode menulis satu mk_kode dan satu wa_antre otp; kode tidak ada di jawaban dan hanya HMAC tersimpan", async () => {
  const awal = [await U.n("mk_kode"), await U.n("wa_antre", "jenis = 'otp'")];
  const r = await minta(1);
  assert.equal(r.s, 200); assert.deepEqual(r.j, {ok: true, tunggu: 60});
  assert.equal(await U.n("mk_kode"), awal[0] + 1); assert.equal(await U.n("wa_antre", "jenis = 'otp'"), awal[1] + 1);
  const o = await U.DB.prepare("SELECT * FROM wa_antre WHERE tujuan = ? AND jenis = 'otp'").bind(nomor(1)).first(), k = await kodeTerkirim(1);
  assert.match(k, /^[0-9]{6}$/); assert.ok(!r.t.includes(k), "kode tidak di jawaban");
  const m = await U.DB.prepare("SELECT * FROM mk_kode WHERE id = ?").bind(o.rujukan).first();
  assert.equal(o.status, "antre"); assert.equal(m.saluran, "wa"); assert.equal(m.coba, 0); assert.equal(m.habis - m.dibuat, 5 * 60e3);
  assert.match(m.kode_sha, /^[0-9a-f]{64}$/);
  assert.notEqual(m.kode_sha, sha256(k)); assert.notEqual(m.kode_sha, sha256(nomor(1) + "|" + k), "bukan sha polos (T2)");
  assert.ok(!JSON.stringify(m).includes(nomor(1)), "nomor terang tidak di mk_kode");
});

uji("masuk U-2: kode benar menerbitkan sesi_masuk; kode sama dua kali ditolak; dua periksa serentak hanya satu menang", async () => {
  const k = await kodeTerkirim(1), r = await periksa(1, k);
  assert.equal(r.s, 200); assert.equal(r.j.ok, true); assert.equal(r.j.lengkap, false); assert.deepEqual(r.j.ruang, []);
  const kuki = r.h.get("set-cookie"), token = kuki.match(/^sesi_masuk=([0-9a-f]{64});/)[1];
  for (const a of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) assert.ok(kuki.includes(a), a);
  assert.ok(!r.t.includes(token), "token tidak di badan jawaban");
  const s = await U.DB.prepare("SELECT * FROM mk_sesi WHERE token_sha = ?").bind(sha256(token)).first();
  assert.ok(s, "sha256 token di mk_sesi"); assert.equal(s.habis - s.kode_pada, 30 * 24 * 3600e3);
  const a = await U.DB.prepare("SELECT * FROM mk_akun WHERE wa = ?").bind(nomor(1)).first();
  assert.equal(a.id, s.mk_id); assert.equal(a.nama, null); assert.equal(a.setuju_pdp, null); assert.equal(a.status, "aktif");
  assert.equal(await U.n("wa_antre", "tujuan = '" + nomor(1) + "' AND jenis = 'otp'"), 0, "baris otp dihapus saat kode dipakai");
  const lagi = await periksa(1, k); assert.equal(lagi.s, 400); assert.equal(lagi.j.galat, "kode salah atau kedaluwarsa");
  /* serentak: dua permintaan dengan kode benar yang sama */
  await minta(2); const k2 = await kodeTerkirim(2);
  const dua = await Promise.all([periksa(2, k2, 20), periksa(2, k2, 21)]);
  assert.deepEqual(dua.map(x => x.s).sort(), [200, 400]);
  assert.equal(await U.n("mk_akun", "wa = '" + nomor(2) + "'"), 1);
  assert.equal(await U.n("mk_sesi", "mk_id = (SELECT id FROM mk_akun WHERE wa = '" + nomor(2) + "')"), 1, "satu sesi saja");
  U.cookie = token;
});

uji("masuk U-2b: /api/masuk/saya hanya dengan sesi dan tanpa nomor terang; keluar mencabut sesi dan cookie", async () => {
  assert.equal((await U.api("GET", "/api/masuk/saya", undefined, {})).s, 401);
  const kuki = {cookie: "sesi_masuk=" + U.cookie};
  const s = await U.api("GET", "/api/masuk/saya", undefined, kuki);
  assert.equal(s.s, 200); assert.equal(typeof s.j.saluran.wa, "boolean"); assert.equal(s.j.akun.lengkap, false); assert.equal(s.j.baru_kode, true); assert.deepEqual(s.j.ruang, []);
  assert.ok(!s.t.includes(nomor(1)), "nomor tersamar"); assert.ok(s.j.akun.wa.endsWith(nomor(1).slice(-4)));
  assert.equal((await U.api("POST", "/api/masuk/keluar", {}, H(1, kuki))).s, 200);   // Origin sama-situs wajib karena cookie sesi_masuk
  assert.equal(await U.n("mk_sesi", "token_sha = '" + sha256(U.cookie) + "'"), 0);
  const k = await U.api("POST", "/api/masuk/keluar", {}, H(1, {cookie: "sesi_masuk=" + U.cookie}));
  assert.match(k.h.get("set-cookie"), /^sesi_masuk=;.*Max-Age=0/);
  assert.equal((await U.api("GET", "/api/masuk/saya", undefined, kuki)).s, 401);
  const lintas = await U.api("POST", "/api/masuk/keluar", {}, H(1, {...kuki, origin: "http://evil.lokal"}));
  assert.equal(lintas.s, 403, "cookie sesi_masuk ikut tolakOrigin");
});

uji("masuk U-3: kode salah enam kali menghanguskan kode; kode benar pun ditolak", async () => {
  await minta(3); const k = await kodeTerkirim(3), salah = salahDari(k);
  for (let i = 1; i <= 5; i++) assert.equal((await periksa(3, salah)).s, 400, "percobaan " + i);
  assert.equal((await periksa(3, salah)).s, 400);   // keenam: hangus
  const m = await U.DB.prepare("SELECT coba, habis FROM mk_kode WHERE id = (SELECT rujukan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp')").bind(nomor(3)).first();
  assert.equal(m.coba, 6); assert.ok(m.habis <= Date.now(), "ditandai habis");
  const b = await periksa(3, k); assert.equal(b.s, 400); assert.equal(await U.n("mk_akun", "wa = '" + nomor(3) + "'"), 0, "tanpa akun, tanpa sesi");
  /* kode benar pada percobaan kelima masih sah */
  await minta(4); const k4 = await kodeTerkirim(4);
  for (let i = 1; i <= 4; i++) await periksa(4, salahDari(k4));
  assert.equal((await periksa(4, k4)).s, 200);
});

uji("masuk U-4: jawaban minta kode sama untuk nomor dikenal dan tidak dikenal; galat periksa identik untuk semua sebab", async () => {
  await U.DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000").run();   // lewati jeda 60 detik
  const kenal = await minta(1, 40), asing = await minta(5, 41);   // nomor 1 sudah punya mk_akun (U-2), nomor 5 belum
  assert.equal(await U.n("mk_akun", "wa = '" + nomor(5) + "'"), 0);
  assert.equal(kenal.s, asing.s); assert.equal(kenal.t, asing.t);
  /* galat periksa: salah, tanpa kode, habis waktu, habis coba */
  const salah = await periksa(5, salahDari(await kodeTerkirim(5)), 42), tanpa = await periksa(6, "123456", 43);
  await minta(7); await U.DB.prepare("UPDATE mk_kode SET habis = 1 WHERE id = (SELECT rujukan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp')").bind(nomor(7)).run();
  const habis = await periksa(7, await kodeTerkirim(7), 44);
  await minta(8); const k8 = await kodeTerkirim(8); for (let i = 0; i < 6; i++) await periksa(8, salahDari(k8), 45);
  const hangus = await periksa(8, k8, 45);
  for (const x of [tanpa, habis, hangus]) { assert.equal(x.s, salah.s); assert.equal(x.t, salah.t); }
  assert.equal(salah.s, 400);
});

uji("masuk U-5: batas laju per nomor, jeda kirim ulang, per IP, dan global", async () => {
  const tua = () => U.DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000").run();   // lewati jeda 60 detik tanpa menunggu
  assert.equal((await minta(9, 50)).s, 200);
  const jeda = await minta(9, 51); assert.equal(jeda.s, 429); assert.ok(Number(jeda.h.get("retry-after")) > 0);
  await tua(); assert.equal((await minta(9, 52)).s, 200);
  await tua(); assert.equal((await minta(9, 53)).s, 200);
  await tua(); const keempat = await minta(9, 54);
  assert.equal(keempat.s, 429, "kode keempat dalam 15 menit"); assert.ok(!/[0-9]+ per/.test(keempat.t), "angka batas tidak dibocorkan");
  assert.equal(await U.n("wa_antre", "tujuan = '" + nomor(9) + "' AND jenis = 'otp'"), 3, "tiga kode terkirim, keempat tidak");
  /* per IP: 30 per jam */
  const ip = 60; let ditolak = 0;
  for (let i = 0; i < 31; i++) { const r = await minta(100 + i, ip); if (r.s === 429) ditolak++; }
  assert.equal(ditolak, 1, "permintaan ke-31 dari satu IP ditolak");
  /* global: 300 per jam, 2.000 per hari (baris ditanam langsung, lalu dibersihkan) */
  const tanam = (n, waktu) => U.DB.prepare(`WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM c WHERE i < ${n}) INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT 'global', 'masuk.global', ? FROM c`).bind(waktu).run();
  const awal = await U.n("laju_bnpb", "kunci = 'global'");
  await tanam(300 - awal, Date.now());
  const g = await minta(200, 70); assert.equal(g.s, 429); assert.match(g.j.galat, /sedang ramai/);
  await U.DB.prepare("DELETE FROM laju_bnpb WHERE kunci = 'global'").run();
  await tanam(2000, Date.now() - 2 * 3600e3);
  assert.equal((await minta(201, 71)).s, 429, "batas harian");
  await U.DB.prepare("DELETE FROM laju_bnpb WHERE kunci = 'global'").run();
  assert.equal((await minta(202, 72)).s, 200, "pulih sesudah dibersihkan");
  /* periksa: 60 per jam per IP */
  let tolak = 0; for (let i = 0; i < 61; i++) if ((await periksa(300, "123456", 80)).s === 429) tolak++;
  assert.equal(tolak, 1);
});

uji("masuk D18: minta kode baru tidak mematikan kode lama; sesudah satu kode dipakai, kode lain nomor itu hangus dan tidak bisa dipakai", async () => {
  const tua = () => U.DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000").run();
  assert.equal((await minta(13, 130)).s, 200); const k1 = await kodeTerkirim(13);
  await tua(); assert.equal((await minta(13, 131)).s, 200);
  const sama = (await U.DB.prepare("SELECT pesan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp' ORDER BY dibuat").bind(nomor(13)).all()).results.map(r => r.pesan.match(/\b([0-9]{6})\b/)[1]);
  assert.equal(sama.length, 2); assert.equal(sama[0], k1);
  assert.equal(await U.n("mk_kode", "dipakai IS NULL AND habis > " + Date.now() + " AND id IN (SELECT rujukan FROM wa_antre WHERE tujuan = '" + nomor(13) + "')"), 2, "dua kode aktif");
  const k2 = sama[1];
  assert.equal((await periksa(13, k1, 132)).s, 200, "kode pertama masih sah sesudah kode kedua diminta");
  assert.equal(await U.n("wa_antre", "tujuan = '" + nomor(13) + "' AND jenis = 'otp'"), 0, "semua baris otp nomor itu dihapus");
  if (k2 !== k1) { const r = await periksa(13, k2, 133); assert.equal(r.s, 400); assert.equal(r.j.galat, "kode salah atau kedaluwarsa"); }
  /* tebakan total tetap terbatas: dua kode aktif, kode salah enam kali menghanguskan keduanya */
  assert.equal((await minta(14, 134)).s, 200); await tua(); assert.equal((await minta(14, 135)).s, 200);
  const benar = (await U.DB.prepare("SELECT pesan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp'").bind(nomor(14)).all()).results.map(r => r.pesan.match(/\b([0-9]{6})\b/)[1]);
  const salah = ["000000", "111111", "222222"].find(x => !benar.includes(x));
  for (let i = 0; i < 6; i++) assert.equal((await periksa(14, salah, 136)).s, 400);
  assert.equal((await periksa(14, benar[0], 136)).s, 400, "kode benar pun hangus sesudah enam percobaan");
  assert.equal(await U.n("mk_akun", "wa = '" + nomor(14) + "'"), 0);
});

uji("masuk A1: batas IP minta kode dicek sebelum siteverify; keluar punya batas IP sendiri", async () => {
  const awal = siteverify;
  let ditolak = 0; for (let i = 0; i < 31; i++) { const r = await U.api("POST", "/api/masuk/kode", {wa: lokal(400 + i), turnstile: "buruk"}, H(140)); if (r.s === 429) ditolak++; }
  assert.equal(ditolak, 1); assert.equal(siteverify - awal, 30, "permintaan ke-31 tidak memicu siteverify");
  let tolak = 0; for (let i = 0; i < 61; i++) if ((await U.api("POST", "/api/masuk/keluar", {}, H(141))).s === 429) tolak++;
  assert.equal(tolak, 1, "keluar: 60 per jam per IP");
});

uji("masuk U-6: tanpa MASUK_KUNCI, TURNSTILE_SECRET, atau TURNSTILE_SITEKEY: 503 dan tidak ada baris ditulis", async () => {
  for (const hilang of Object.keys(RAHASIA)) {
    const V = TANPA[hilang];
    assert.equal((await V.api("POST", "/api/masuk/kode", {wa: lokal(1), turnstile: "ok"}, H(1))).s, 503, hilang);
    if (hilang === "MASUK_KUNCI") assert.equal((await V.api("POST", "/api/masuk/periksa", {wa: lokal(1), kode: "123456"}, H(1))).s, 503);
    for (const t of ["mk_kode", "wa_antre", "mk_akun", "mk_sesi", "laju_bnpb"]) assert.equal(await V.n(t), 0, `${hilang}: ${t} kosong`);
  }
  assert.equal((await PENDEK.api("POST", "/api/masuk/kode", {wa: lokal(1), turnstile: "ok"}, H(1))).s, 503, "MASUK_KUNCI 31 karakter = kosong");
  assert.equal((await PENDEK.api("POST", "/api/masuk/periksa", {wa: lokal(1), kode: "123456"}, H(1))).s, 503);
  assert.equal(await PENDEK.n("mk_kode"), 0);
  /* rahasia lengkap, token salah atau kosong: tidak lolos-diam seperti turnstileOK */
  const awal = await U.n("mk_kode");
  assert.equal((await U.api("POST", "/api/masuk/kode", {wa: lokal(12), turnstile: "buruk"}, H(96))).s, 403);
  assert.equal((await U.api("POST", "/api/masuk/kode", {wa: lokal(12)}, H(96))).s, 403);
  assert.equal((await U.api("POST", "/api/masuk/kode", {wa: "bukan nomor", turnstile: "ok"}, H(96))).s, 400);
  assert.equal(await U.n("mk_kode"), awal);
});

uji("masuk U-7: tabel mk_* belum ada: 503 dengan pesan migrasi; pintu sandi lama tetap 200", async () => {
  const V = BELUM;
  for (const [m, j, b] of [["POST", "/api/masuk/kode", {wa: lokal(1), turnstile: "ok"}], ["POST", "/api/masuk/periksa", {wa: lokal(1), kode: "123456"}], ["GET", "/api/masuk/saya"]]) {
    const r = await V.api(m, j, b, m === "GET" ? {cookie: "sesi_masuk=" + "a".repeat(64)} : H(1));
    assert.equal(r.s, 503, j); assert.match(r.j.galat, /migrasi masuk belum dijalankan/);
  }
  const lama = await V.mf.dispatchFetch("http://bnpb.lokal/admin/masuk", {redirect: "manual"}); await lama.text(); assert.equal(lama.status, 303, "alamat lama pintu sandi (K21)"); assert.equal(lama.headers.get("location"), "/masuk#sandi");
});

uji("masuk U-8: tanpa x-pb atau Origin lain semua POST /api/masuk/* ditolak, termasuk form text/plain lintas situs", async () => {
  const awal = await semuaBaris();
  const isi = {wa: lokal(1), turnstile: "ok", kode: "123456"};
  for (const j of ["/api/masuk/kode", "/api/masuk/periksa", "/api/masuk/keluar"]) {
    const tanpaPB = H(90); delete tanpaPB["x-pb"];
    const tanpaAsal = H(91); delete tanpaAsal.origin;
    for (const [nama, h] of [["tanpa x-pb", tanpaPB], ["origin lain", H(92, {origin: "http://evil.lokal"})], ["tanpa origin", tanpaAsal], ["origin null", H(93, {origin: "null"})],
      ["form lintas situs", {"cf-connecting-ip": "10.8.0.94", "content-type": "text/plain", origin: "http://evil.lokal"}]])
      assert.equal((await U.api("POST", j, JSON.stringify(isi), h)).s, 403, `${j} ${nama}`);
  }
  assert.equal(await semuaBaris(), awal, "tidak ada yang ditulis, laju pun tidak");
  /* peramban sama-situs tanpa Origin (Sec-Fetch-Site) tetap diterima */
  const tanpaAsal = H(95, {"sec-fetch-site": "same-origin"}); delete tanpaAsal.origin;
  assert.equal((await U.api("POST", "/api/masuk/kode", {wa: lokal(10), turnstile: "ok"}, tanpaAsal)).s, 200);
});

uji("masuk U-9: tanpa cf-connecting-ip minta dan periksa kode ditolak dan tidak menulis apa pun", async () => {
  /* Miniflare selalu mengisi cf-connecting-ip (127.0.0.1) di pintunya, jadi worker.js dipanggil langsung dengan D1 lokal yang sama: kode rute yang sama, tanpa header itu */
  const awal = await semuaBaris(), {default: worker} = await import("../../src/worker.js");
  const env = {DB: U.DB, IP_SALT: "garam-uji", ...RAHASIA, ASSETS: {fetch: async () => new Response("tidak ada", {status: 404})}};
  for (const [j, b] of [["/api/masuk/kode", {wa: lokal(11), turnstile: "ok"}], ["/api/masuk/periksa", {wa: lokal(11), kode: "123456"}]]) {
    const r = await worker.fetch(new Request(ASAL + j, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1", origin: ASAL}, body: JSON.stringify(b)}), env, {waitUntil() {}});
    assert.equal(r.status, 403, j); assert.match((await r.json()).galat, /alamat jaringan/);
  }
  assert.equal(await semuaBaris(), awal);
});
