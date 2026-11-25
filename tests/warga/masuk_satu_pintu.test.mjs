/* Satu pintu masuk (pemilik 24 Nov 2026 K16: "ga ada admin ga ada instansi, semuanya masuk dari satu tempat"; 25 Nov 2026 K21: semua peran masuk lewat /masuk).
   Form sandi di /masuk (POST /masuk) dan alamat lama POST /admin/masuk memakai logika yang sama: admin, pemirsa, staf, lalu instansi.
   GET /admin/masuk dialihkan ke /masuk dengan ?ke= dipertahankan. Arah sesudah masuk: peta-situs ALGORITMA "Arah sesudah masuk", ?ke= hanya disaring tujuan().
   Worker utuh di workerd + D1 sungguhan (TEST.md: tanpa mock). Jalankan: node --test tests/warga/masuk_satu_pintu.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256, ADMIN, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";

const uji = berantai();
const {DB, mf} = await siapkan("uji-satu-pintu");
let ipN = 0;
const ASAL = "https://centurisk97.id";
const kirim = (jalur, user, sandi, ke = "", asal = ASAL) => mf.dispatchFetch(asal + jalur + (ke ? "?ke=" + encodeURIComponent(ke) : ""), {
  method: "POST", redirect: "manual", body: new URLSearchParams({email: user, sandi}).toString(),
  headers: {"content-type": "application/x-www-form-urlencoded", origin: asal, "cf-connecting-ip": `198.51.100.${++ipN % 250}`}});
const masuk = (user, sandi, ke) => kirim("/admin/masuk", user, sandi, ke);
const arah = async r => { await r.text(); assert.equal(r.status, 303); return r.headers.get("location"); };
const buka = (jalur, h = {}) => mf.dispatchFetch(ASAL + jalur, {redirect: "manual", headers: h});
const SANDI = "SandiUji23456789";
const buat = async (username, status = "belum_klaim") => {   // aktif butuh data verifikasi; masuk berlaku untuk status apa pun selain dicabut
  const garam = "b".repeat(32);
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, 'polda', 'prov', 'Polda Uji', ?, '["13"]', '13', NULL, ?, ?, ?, 0, 0, 0, ?)`).bind(username.padEnd(16, "0").slice(0, 16), username, "kw-" + username, garam, sha256(garam + SANDI), status, Date.now()).run();
};
let stafN = 0;
const staf = async (username, peran) => {
  const garam = "c".repeat(32), id = (++stafN).toString(16).padStart(16, "e");
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, 'Staf Uji', ?, 'Pusdalops', ?, ?, ?, '[]', ?, ?, 0, 1, 'tes', 0)`).bind(id, username, "9200" + stafN + "000", `${username}@b.id`, "62800777" + String(stafN).padStart(4, "0"), JSON.stringify(peran), garam, sha256(garam + SANDI)).run();
};

uji("satu pintu: akun instansi masuk lewat /admin/masuk dan diarahkan ke /instansi dengan sesi instansi", async () => {
  await buat("poldasatupintu");
  const r = await masuk("PoldaSatuPintu", SANDI);
  assert.equal(r.status, 303, await r.text());
  assert.equal(r.headers.get("location"), "/instansi");
  const kuki = r.headers.getSetCookie();
  assert.ok(kuki.some(c => /^sesi_instansi=[0-9a-f]{64}; Path=\/instansi;/.test(c)), "cookie sesi instansi untuk /instansi");
  assert.ok(kuki.some(c => /^sesi_instansi=[0-9a-f]{64}; Path=\/api\/instansi;/.test(c)), "cookie sesi instansi untuk /api/instansi");
  const tok = kuki.find(c => c.startsWith("sesi_instansi=")).split(";")[0];
  const saya = await mf.dispatchFetch("https://centurisk97.id/api/instansi/saya", {headers: {cookie: tok, "x-pb": "1"}});
  assert.equal(saya.status, 200, "sesi dari pintu tunggal dipakai rute instansi");
});

uji("K21 U4: POST /masuk memakai logika yang sama dengan POST /admin/masuk (sesi, arah, ?ke=)", async () => {
  const r = await kirim("/masuk", "poldasatupintu", SANDI, "/instansi");
  assert.equal(await arah(r), "/instansi");
  assert.equal(r.headers.getSetCookie().filter(c => /^sesi_instansi=[0-9a-f]{64};/.test(c)).length, 2, "cookie instansi di dua Path");
  assert.equal(await arah(await masuk("poldasatupintu", SANDI, "/instansi")), "/instansi", "POST /admin/masuk?ke=/instansi tetap jalan untuk klien lama");
  const tanpaAsal = await mf.dispatchFetch(ASAL + "/masuk", {method: "POST", redirect: "manual", body: new URLSearchParams({email: "poldasatupintu", sandi: SANDI}).toString(),
    headers: {"content-type": "application/x-www-form-urlencoded", origin: "https://luar.contoh", "cf-connecting-ip": "198.51.100.251"}});
  await tanpaAsal.text(); assert.equal(tanpaAsal.status, 403, "CSRF: asal lain ditolak sama dengan rute tulis lain");
});

uji("K21 U4: GET /admin/masuk?ke= dialihkan ke /masuk dengan ?ke= yang sama; sesi sah tetap ke ?ke=", async () => {
  assert.equal(await arah(await buka("/admin/masuk?ke=%2Finstansi")), "/masuk?ke=%2Finstansi#sandi");
  assert.equal(await arah(await buka("/admin/masuk?ke=%2Fpendataan%3Fx%3D1")), "/masuk?ke=%2Fpendataan%3Fx%3D1#sandi");
  assert.equal(await arah(await buka("/admin/masuk")), "/masuk#sandi", "tamu tanpa ?ke=");
  assert.equal(await arah(await buka("/admin/masuk?ke=%2F%2Fluar.contoh")), "/masuk#sandi", "?ke= asing dibuang tujuan()");
  assert.equal(await arah(await buka("/admin/masuk?ke=%2Fbnpb%2Fbahan", GERBANG)), "/masuk?ke=%2Fbnpb%2Fbahan#sandi", "akun gerbang dapat form (bisa ganti akun), tidak dipantulkan");
  assert.equal(await arah(await buka("/admin/masuk?ke=%2Fbnpb%2Fbahan", ADMIN)), "/bnpb/bahan", "admin bersesi langsung ke ?ke=");
  assert.equal(await arah(await buka("/admin/masuk", ADMIN)), "/admin/statistik", "kontrak Admin.keMasuk: sesi sah tanpa ?ke= tetap 303 ke halaman admin");
  const h = await buka("/masuk"), t = await h.text();
  assert.equal(h.status, 200); assert.match(t, /<form id="fAkun"[^>]*method="post" action="\/masuk"/, "form sandi di /masuk"); assert.match(t, /name="email"[\s\S]*name="sandi"/);
});

uji("K21 U4: ?ke= hanya disaring tujuan(): //luar dan https://luar ke beranda pintu, jalur situs sendiri lolos", async () => {
  for (const jahat of ["//luar.contoh", "https://luar.contoh", "/\\luar.contoh", "/a\x7fb", "/\t/luar.contoh"]) assert.equal(await arah(await masuk("poldasatupintu", SANDI, jahat)), "/instansi", jahat);
  for (const baik of ["/instansi?tab=peta", "/pendataan?x=1", "/siklus/kejadian/KJ-1"]) assert.equal(await arah(await masuk("poldasatupintu", SANDI, baik)), baik, baik);
});

uji("K21 U4: arah bawaan staf: /bnpb bila host membukanya, selain itu butir pertama menu staf; Direktori saja, operator_cc", async () => {
  await staf("pusdalopssatu", ["pusdalops"]); await staf("verifsatu", ["verifikator"]); await staf("direktorisatu", ["direktori"]); await staf("operatorccsatu", ["operator_cc"]);
  assert.equal(await arah(await masuk("pusdalopssatu", SANDI)), "/bnpb/dalops", "centurisk97.id menolak /bnpb untuk pusdalops: butir pertama menu staf");
  assert.equal(await arah(await kirim("/masuk", "pusdalopssatu", SANDI, "", "http://t.lokal")), "/bnpb", "host tak terkunci: /bnpb");
  assert.equal(await arah(await masuk("verifsatu", SANDI)), "/admin/pantau", "verifikator: butir pertama menu stafnya");
  assert.equal(await arah(await masuk("direktorisatu", SANDI)), "/direktori");
  assert.equal(await arah(await masuk("direktorisatu", SANDI, "/admin/statistik")), "/direktori", "Direktori saja: ?ke= di luar /direktori diabaikan (cegah putaran)");
  assert.equal(await arah(await masuk("operatorccsatu", SANDI)), "/command-center");
  assert.equal(await arah(await masuk("pusdalopssatu", SANDI, "/siklus/kejadian/KJ-1")), "/siklus/kejadian/KJ-1", "?ke= sah menang");
});

uji("satu pintu: sandi salah dan akun dicabut tetap 401 dengan pesan yang sama, di halaman /masuk berpesan galat", async () => {
  await buat("poldadicabut1", "dicabut");
  for (const [u, s] of [["poldasatupintu", "salah-sekali-123"], ["poldadicabut1", SANDI], ["tidakada99", SANDI]]) {
    const r = await masuk(u, s); assert.equal(r.status, 401, u);
    const t = await r.text();
    assert.match(t, /<body data-galat="Username atau kata sandi salah\.">/, "pesan di atribut body, dibaca public/masuk.js");
    assert.match(t, /id="fAkun"/, "halaman /masuk yang sama");
    assert.match(r.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  }
});

const form = (jalur, h, user = "poldasatupintu", sandi = SANDI) => mf.dispatchFetch(ASAL + jalur, {method: "POST", redirect: "manual", body: new URLSearchParams({email: user, sandi}).toString(),
  headers: {"content-type": "application/x-www-form-urlencoded", ...h}});
uji("review PS-08: login-CSRF: Origin kosong atau null ditolak di /masuk dan /admin/masuk kecuali Sec-Fetch-Site same-origin", async () => {
  for (const jalur of ["/masuk", "/admin/masuk"]) {
    for (const [nama, h] of [["tanpa Origin", {}], ["Origin null", {origin: "null"}], ["Origin null lintas situs", {origin: "null", "sec-fetch-site": "cross-site"}], ["Origin lain", {origin: "https://luar.contoh"}]]) {
      const r = await form(jalur, {"cf-connecting-ip": "198.51.100.252", ...h}); await r.text(); assert.equal(r.status, 403, `${jalur} ${nama}`);
      assert.ok(!r.headers.getSetCookie().some(c => /^sesi_/.test(c) && !/Max-Age=0/.test(c)), `${jalur} ${nama}: tanpa sesi`);
    }
    const ok = await form(jalur, {origin: "null", "sec-fetch-site": "same-origin", "cf-connecting-ip": "198.51.100.253"});
    assert.equal(await arah(ok), "/instansi", `${jalur}: Origin null dari halaman sendiri (Sec-Fetch-Site same-origin) diterima`);
  }
});

uji("review PS-08: instansi ?ke= di luar /instansi dan halaman instansi dibuang: /admin/akun ke /instansi; membuka /admin/akun langsung 303 ke /masuk tanpa HTML admin", async () => {
  const r = await masuk("poldasatupintu", SANDI, "/admin/akun");
  assert.equal(await arah(r), "/instansi");
  for (const ke of ["/api/instansi/saya", "/admin/statistik"]) assert.equal(await arah(await masuk("poldasatupintu", SANDI, ke)), "/instansi", ke);
  const kuki = r.headers.getSetCookie().filter(c => c.startsWith("sesi_instansi=")).map(c => c.split(";")[0]).slice(0, 1).join("; ");
  const ad = await buka("/admin/akun", {cookie: kuki}), t = await ad.text();
  assert.equal(ad.status, 303); assert.match(ad.headers.get("location"), /^\/masuk\?ke=%2Fadmin%2Fakun/); assert.equal(t, "", "tanpa HTML admin");
});

uji("review PS-08: /admin/masuk dan /masuk berbagi satu batas laju per alamat; PUT /masuk 405", async () => {
  const ip = "203.0.113.77", coba = (jalur, i) => form(jalur, {origin: ASAL, "cf-connecting-ip": ip}, "tidakadalaju" + i, "salah-salah-" + i);
  for (let i = 0; i < 8; i++) { const r = await coba(i % 2 ? "/masuk" : "/admin/masuk", i); await r.text(); assert.equal(r.status, 401, "percobaan ke-" + (i + 1)); }
  for (const jalur of ["/masuk", "/admin/masuk"]) {
    const r = await coba(jalur, 99), t = await r.text();
    assert.equal(r.status, 429, jalur); assert.ok(Number(r.headers.get("retry-after")) > 0, "retry-after"); assert.match(t, /data-galat="Terlalu banyak percobaan\. Coba lagi nanti\."/);
  }
  const p = await mf.dispatchFetch(ASAL + "/masuk", {method: "PUT", redirect: "manual", headers: {origin: ASAL}}); await p.text();
  assert.equal(p.status, 405); assert.match(p.headers.get("allow"), /POST/);
});
