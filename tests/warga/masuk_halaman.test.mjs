/* Satu Pintu Masuk, PM-08 (RENCANA-UJI U-20, U-21, L-1 bagian mesin): lengkapi profil akun umum, halaman /masuk (sandi saja sejak K25), tautan dari pintu lama.
   Worker utuh di workerd + D1 lokal sungguhan (migrasi apa adanya); public/ disajikan apa adanya. Nomor uji hanya berawalan 62800. */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {siapkan, berantai} from "./_bnpb.mjs";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";   // worker dulu: modul rute mengimpornya balik (siklus)

const uji = berantai();
const ASAL = "http://bnpb.lokal", KUNCI = {MASUK_KUNCI: "kunci-masuk-uji-panjang-lebih-dari-32-karakter", TURNSTILE_SECRET: "ts-rahasia-uji", TURNSTILE_SITEKEY: "ts-situs-uji"};
const luar = async req => new URL(req.url).host === "challenges.cloudflare.com" ? Response.json({success: (await req.formData()).get("response") === "ok"}) : new Response("diblok di uji", {status: 599});
const U = await siapkan("uji-masuk-halaman", {ikat: KUNCI, luar});
const {DB, api, n, mf} = U;
const baca = r => readFileSync(path.join(AKAR, r), "utf8");

let ipN = 0;
const H = (tambah = {}) => ({"cf-connecting-ip": `10.9.${Math.floor(++ipN / 250)}.${ipN % 250}`, "x-pb": "1", origin: ASAL, ...tambah});
const nomor = i => `62800777${String(i).padStart(4, "0")}`, lokal = i => "0" + nomor(i).slice(2);
const kodeTerkirim = async i => (await DB.prepare("SELECT pesan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp' ORDER BY dibuat DESC LIMIT 1").bind(nomor(i)).first())?.pesan.match(/\b([0-9]{6})\b/)[1];
async function masuk(i) {
  assert.equal((await api("POST", "/api/masuk/kode", {wa: lokal(i), turnstile: "ok"}, H())).s, 200);
  const r = await api("POST", "/api/masuk/periksa", {wa: lokal(i), kode: await kodeTerkirim(i)}, H());
  assert.equal(r.s, 200, r.t);
  return r;
}
const kuki = r => r.h.getSetCookie().find(l => l.startsWith("sesi_masuk=")).split(";")[0];

uji("halaman U-20: lengkapi tanpa persetujuan atau isian sah ditolak; sesudahnya saya.akun.lengkap true dan baris mk_akun terisi", async () => {
  const r = await masuk(1), c = kuki(r), tulis = (b, h = {}) => api("POST", "/api/masuk/lengkapi", b, H({cookie: c, ...h}));
  assert.equal(r.j.lengkap, false);
  const sah = {nama: "Budi Santoso", prov: "33", kab: "Kab. Demak", setuju: true};
  assert.equal((await api("POST", "/api/masuk/lengkapi", sah, H())).s, 401, "tanpa sesi");
  assert.equal((await tulis(sah, {origin: "http://evil.lokal"})).s, 403, "origin lain");
  for (const [nama, b] of [["tanpa setuju", {...sah, setuju: undefined}], ["setuju salah", {...sah, setuju: false}], ["setuju teks", {...sah, setuju: "true"}], ["setuju angka", {...sah, setuju: 1}],
    ["nama kosong", {...sah, nama: " "}], ["nama satu huruf", {...sah, nama: "B"}], ["nama 81 huruf", {...sah, nama: "a".repeat(81)}], ["nama bukan teks", {...sah, nama: ["Budi"]}], ["nama berisi tautan", {...sah, nama: "klik www.contoh.com"}],
    ["nama berisi nomor", {...sah, nama: "Budi " + "0812" + "34567890"}], ["provinsi bukan kode", {...sah, prov: "Jawa Tengah"}], ["provinsi tak ada", {...sah, prov: "99"}], ["provinsi tanpa", {...sah, prov: undefined}],
    ["kab kosong", {...sah, kab: ""}], ["kab 61 huruf", {...sah, kab: "k".repeat(61)}], ["kab tanpa", {...sah, kab: undefined}]])
    assert.equal((await tulis(b)).s, 400, nama);
  assert.equal(await n("mk_akun", `wa = '${nomor(1)}' AND setuju_pdp IS NULL AND nama IS NULL`), 1, "semua penolakan tidak menulis apa pun");
  const ok = await tulis(sah); assert.equal(ok.s, 200, ok.t); assert.deepEqual(ok.j, {ok: true, lengkap: true});
  const a = await DB.prepare("SELECT nama, prov, kab, setuju_pdp FROM mk_akun WHERE wa = ?").bind(nomor(1)).first();
  assert.deepEqual([a.nama, a.prov, a.kab], ["Budi Santoso", "33", "Kab. Demak"]); assert.ok(a.setuju_pdp > 0 && a.setuju_pdp <= Date.now(), "waktu persetujuan");
  const s = await api("GET", "/api/masuk/saya", undefined, {cookie: c});
  assert.equal(s.j.akun.lengkap, true); assert.equal(s.j.akun.nama, "Budi Santoso"); assert.ok(!s.t.includes(nomor(1)));
  /* ubah profil tidak menggeser waktu persetujuan pertama */
  await tulis({...sah, nama: "Budi S"}); const b = await DB.prepare("SELECT nama, setuju_pdp FROM mk_akun WHERE wa = ?").bind(nomor(1)).first();
  assert.equal(b.nama, "Budi S"); assert.equal(b.setuju_pdp, a.setuju_pdp);
  /* masuk lagi: jawaban periksa sudah menyebut lengkap */
  await DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000").run();
  assert.equal((await masuk(1)).j.lengkap, true);
});

uji("halaman U-20b: lengkapi dibatasi per alamat dan tanpa tabel mk_* menjawab 503", async () => {
  const c = kuki(await masuk(2)), ip = "10.9.250.250"; let tolak = 0;
  for (let i = 0; i < 31; i++) if ((await api("POST", "/api/masuk/lengkapi", {}, {...H({cookie: c}), "cf-connecting-ip": ip})).s === 429) tolak++;
  assert.equal(tolak, 1, "30 per jam per alamat");
  const V = await siapkan("uji-masuk-halaman-belum", {ikat: KUNCI, luar, sampai: "0133_"});
  const r = await V.api("POST", "/api/masuk/lengkapi", {nama: "Budi", prov: "33", kab: "Demak", setuju: true}, H({cookie: "sesi_masuk=" + "a".repeat(64)}));
  assert.equal(r.s, 503); assert.match(r.j.galat, /migrasi masuk belum dijalankan/);
});

uji("halaman L-1: GET /masuk menyajikan public/masuk.html dengan CSP yang cukup; tanpa skrip, gaya, atau penangan inline; semua berkas yang dimuat ada", async () => {
  const r = await mf.dispatchFetch(ASAL + "/masuk", {headers: {"cf-connecting-ip": "10.9.251.1"}}), html = await r.text();
  assert.equal(r.status, 200); assert.equal(html, baca("public/masuk.html"), "berkas asli, bukan halaman sementara");
  const csp = r.headers.get("content-security-policy");
  assert.match(csp, /style-src 'self' https:\/\/fonts\.googleapis\.com;/); assert.match(csp, /img-src 'self' data:;/);
  assert.match(csp, /font-src https:\/\/fonts\.gstatic\.com;/); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /form-action 'self'/); assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*/);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)/i, "tanpa skrip inline"); assert.doesNotMatch(html, /<style|\sstyle=|\son[a-z]+=/i, "tanpa gaya atau penangan inline");
  const lokalDimuat = [...html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
  assert.ok(lokalDimuat.includes("/masuk.js") && lokalDimuat.includes("/admin/admin.css"));
  for (const p of lokalDimuat) assert.ok(existsSync(path.join(AKAR, "public", p)), "ada: " + p);
  for (const luarSitus of [...html.matchAll(/<(?:script|link|img)[^>]*(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => new URL(m[1]).origin)) assert.ok(["https://fonts.googleapis.com", "https://fonts.gstatic.com"].includes(luarSitus), "asal luar yang tidak diizinkan CSP: " + luarSitus);
  assert.doesNotMatch(html, /Pantau Bencana/);
});

uji("halaman U-21: /masuk hanya username dan sandi (K25: tanpa kode WhatsApp); galeri jenis bencana di kanan; /admin/masuk dialihkan ke /masuk", async () => {
  const alih = async j => { const r = await mf.dispatchFetch(ASAL + j, {redirect: "manual"}); await r.text(); assert.equal(r.status, 303, j); return r.headers.get("location"); };
  assert.equal(await alih("/admin/masuk"), "/masuk#sandi");
  assert.equal(await alih("/admin/masuk?ke=%2Fkemitraan"), "/masuk?ke=%2Fkemitraan#sandi");
  assert.doesNotMatch(await alih("/admin/masuk?ke=%2F%2Fevil.lokal"), /evil\.lokal/, "?ke= asing dibuang oleh tujuan()");
  const html = baca("public/masuk.html");
  assert.match(html, /<form id="fAkun" method="post" action="\/masuk">/, "form sandi biasa, langsung tampil");
  assert.match(html, /id="iSandiAkun" name="sandi" type="password"[^>]*autocomplete="current-password"/); assert.match(html, /id="iAkun" name="email" type="text"[^>]*autocomplete="username"/);
  assert.doesNotMatch(html, /WhatsApp|type="tel"|one-time-code|id="fNomor"|id="fKode"/, "tanpa jalur kode WhatsApp (K25)");
  assert.doesNotMatch(html, /\/admin\/masuk/, "tidak ada tautan ke pintu lama");
  assert.equal((html.match(/<figure class="ad-pita">/g) || []).length, 6, "galeri enam jenis bencana");
  for (const f of html.matchAll(/src="(\/img\/masuk\/[^"?]+)/g)) assert.ok(existsSync(path.join(AKAR, "public", f[1])), "foto ada: " + f[1]);
  const js = baca("public/masuk.js");
  assert.doesNotMatch(js, /\/api\/masuk\/kode|\/api\/masuk\/periksa/, "halaman tidak memanggil rute kode");
  assert.match(js, /\$\("fAkun"\)\.action = "\/masuk" \+ \(ke \? "\?ke=" \+ encodeURIComponent\(ke\) : ""\)/, "?ke= ikut dikirim ke POST /masuk");
  assert.match(js, /document\.body\.dataset\.galat/, "galat server dibaca dari <body data-galat>");
  /* satu pintu (KEPUTUSAN-MASUK K16, 24 Nov 2026): /instansi tidak punya layar masuk sendiri; tamu dialihkan ke /masuk?ke=/instansi (K21) */
  const ins = baca("public/instansi.html"), insJs = baca("public/instansi.js");
  assert.doesNotMatch(ins, /id="fMasuk"|type="password"/, "tanpa form sandi kedua di /instansi");
  assert.match(insJs, /location\.replace\("\/masuk\?ke=" \+ encodeURIComponent\(location\.pathname/, "tamu ke pintu tunggal");
});

uji("halaman L-1b: penyaring ?ke= menolak jalur di luar situs; akun pendataan dan kampus ke layar sandinya sendiri; galat lewat textContent", () => {
  const ctx = {document: {getElementById: () => null}}; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(baca("public/masuk.js"), ctx, {filename: "masuk.js"});
  const {jalurAman, pintuSandi} = ctx.MasukMurni;
  for (const jahat of ["//evil.com", "/\\evil", "https://x", "http://x/y", "/\tx", "/\t/evil.com", "/\n/evil.com", "/ evil", "javascript:alert(1)", "evil.com", "", "\\\\evil", "/\u0000x", "/\x7f", null, undefined, 5, ["/a"]]) assert.equal(jalurAman(jahat), "", JSON.stringify(jahat));
  for (const baik of ["/", "/instansi", "/admin/pantau?x=1", "/alun-alun#a", "/petugas/panel"]) assert.equal(jalurAman(baik), baik);
  assert.equal(pintuSandi(""), ""); assert.equal(pintuSandi("/instansi"), ""); assert.equal(pintuSandi("/instansiku"), ""); assert.equal(pintuSandi("/admin/pantau"), "");
  assert.equal(pintuSandi("/pendataan"), "/pendataan"); assert.equal(pintuSandi("/kemitraan/daerah"), "/kemitraan/masuk");
  assert.doesNotMatch(baca("public/masuk.js"), /console\.|localStorage|sessionStorage|innerHTML|insertAdjacentHTML|eval\(/, "sandi tidak dicatat atau disimpan; teks server lewat textContent");
});

uji("halaman L-1d: aktivasi.js memakai PesanLayar, tanpa salinan kalimat, tanggal, atau penyamar lama", () => {
  const ak = baca("public/admin/aktivasi.js");
  assert.match(ak, /PesanLayar\./);
  for (const lama of ["Tidak ada sambungan", "lalu coba lagi", "Menunggu persetujuan", "•"]) assert.ok(!ak.includes(lama), "tanpa salinan: " + lama);
  assert.match(ak, /Tidak ada dalam 120 hari/); assert.doesNotMatch(ak, /4 bulan/);
});
