/* Satu Pintu Masuk, PM-08 (RENCANA-UJI U-20, U-21, L-1 bagian mesin): lengkapi profil akun umum, halaman /masuk, tautan dari pintu lama.
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
  assert.match(csp, /script-src 'self' https:\/\/challenges\.cloudflare\.com;/); assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com;/); assert.match(csp, /style-src 'self' https:\/\/fonts\.googleapis\.com;/);
  assert.match(csp, /font-src https:\/\/fonts\.gstatic\.com;/); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /connect-src 'self';/); assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*/);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)/i, "tanpa skrip inline"); assert.doesNotMatch(html, /<style|\sstyle=|\son[a-z]+=/i, "tanpa gaya atau penangan inline");
  const lokalDimuat = [...html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]).filter(p => /\.(?:js|css|svg)$/.test(p));
  assert.ok(lokalDimuat.includes("/masuk.js") && lokalDimuat.includes("/masuk.css") && lokalDimuat.includes("/bnpb/bnpb.css") && lokalDimuat.includes("/bnpb/turnstile.js"));
  for (const p of lokalDimuat) assert.ok(existsSync(path.join(AKAR, "public", p)), "ada: " + p);
  for (const luarSitus of [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => new URL(m[1]).origin)) assert.ok(["https://fonts.googleapis.com", "https://fonts.gstatic.com"].includes(luarSitus), "asal luar yang tidak diizinkan CSP: " + luarSitus);
  for (const id of ["fNomor", "fKode", "vRuang", "fSandi", "fLengkapi", "iKode"]) assert.match(html, new RegExp(`id="${id}"`), id);
  const iKode = html.match(/<input id="iKode"[^>]*>/)[0]; for (const t of ["autocomplete=\"one-time-code\"", "inputmode=\"numeric\"", "maxlength=\"6\""]) assert.ok(iKode.includes(t), t);
  assert.match(html, /type="tel" inputmode="numeric" autocomplete="tel"/);
  assert.match(html, /class="ad-top"/); assert.doesNotMatch(html, /Pantau Bencana/);
});

uji("halaman U-21: pintu lama tetap ada dan menautkan ke /masuk dengan ?ke= halamannya", async () => {
  const lama = await api("GET", "/admin/masuk"); assert.equal(lama.s, 200);
  assert.match(lama.t, /type="password"/); assert.match(lama.t, /action="\/admin\/masuk"/, "form sandi lama utuh"); assert.match(lama.t, /href="\/masuk">Masuk dengan nomor WhatsApp</);
  const dgnKe = await api("GET", "/admin/masuk?ke=%2Fkemitraan"); assert.match(dgnKe.t, /href="\/masuk\?ke=%2Fkemitraan">Masuk dengan nomor WhatsApp</);
  const bukanSitus = await api("GET", "/admin/masuk?ke=%2F%2Fevil.lokal"); assert.doesNotMatch(bukanSitus.t, /evil\.lokal/, "?ke= asing dibuang oleh tujuan()");
  /* satu pintu (KEPUTUSAN-MASUK K16, 24 Nov 2026): /instansi tidak punya layar masuk sendiri; tamu dialihkan ke /admin/masuk?ke=/instansi */
  const ins = baca("public/instansi.html"), insJs = baca("public/instansi.js");
  assert.doesNotMatch(ins, /id="fMasuk"|type="password"/, "tanpa form sandi kedua di /instansi");
  assert.match(insJs, /location\.replace\("\/admin\/masuk\?ke=" \+ encodeURIComponent\(location\.pathname/, "tamu ke pintu tunggal");
});

uji("halaman L-1b: penyaring ?ke= menolak jalur di luar situs; pintu sandi mengikuti tujuan; nomor tersamar", () => {
  const ctx = {document: {getElementById: () => null}}; ctx.globalThis = ctx; vm.createContext(ctx);
  if (existsSync(path.join(AKAR, "public/inti/pesan.js"))) vm.runInContext(baca("public/inti/pesan.js"), ctx, {filename: "pesan.js"});
  vm.runInContext(baca("public/masuk.js"), ctx, {filename: "masuk.js"});
  const {jalurAman, pintuSandi, nomorSah, kalimat} = ctx.MasukMurni;
  for (const jahat of ["//evil.com", "/\\evil", "https://x", "http://x/y", "/\tx", "/\t/evil.com", "/\n/evil.com", "/ evil", "javascript:alert(1)", "evil.com", "", "\\\\evil", "/\u0000x", "/\x7f", null, undefined, 5, ["/a"]]) assert.equal(jalurAman(jahat), "", JSON.stringify(jahat));
  for (const baik of ["/", "/instansi", "/admin/pantau?x=1", "/alun-alun#a", "/petugas/panel"]) assert.equal(jalurAman(baik), baik);
  assert.equal(pintuSandi(""), "/admin/masuk"); assert.equal(pintuSandi("/instansi"), "/instansi"); assert.equal(pintuSandi("/instansi/laporan"), "/instansi");
  assert.equal(pintuSandi("/pendataan"), "/pendataan"); assert.equal(pintuSandi("/kemitraan/daerah"), "/kemitraan/masuk");
  assert.equal(pintuSandi("/instansiku"), "/admin/masuk?ke=%2Finstansiku"); assert.equal(pintuSandi("/admin/pantau"), "/admin/masuk?ke=%2Fadmin%2Fpantau");
  assert.equal(nomorSah("0812 3456 7890"), true); assert.equal(nomorSah("+62 812-3456-7890"), true); assert.equal(nomorSah("12345"), false); assert.equal(nomorSah("0212345678"), false); assert.equal(nomorSah(""), false);
  assert.equal(ctx.PesanLayar.samar("62800123456"), "xxxxxxx3456");   // satu penyamar bersama (/inti/pesan.js)
  assert.equal(kalimat("kode salah atau kedaluwarsa"), "Kode salah atau kedaluwarsa."); assert.equal(kalimat(""), ""); assert.equal(kalimat("Sudah."), "Sudah.");
  assert.doesNotMatch(baca("public/masuk.js"), /console\.|localStorage|sessionStorage|innerHTML|insertAdjacentHTML|eval\(/, "kode dan nomor tidak dicatat atau disimpan; teks server lewat textContent");
});

uji("halaman L-1c: keluar dan kode sah mengosongkan isian; hitung mundur dari jam dan berhenti di tab tersembunyi; L4 tanpa tautan /privasi; 404 sama dengan 503", () => {
  const js = baca("public/masuk.js"), html = baca("public/masuk.html");
  const fn = (nama, mulai) => { const i = js.indexOf(mulai); assert.ok(i >= 0, nama); return js.slice(i, i + 700); };
  const bersih = fn("bersih", "function bersih()");
  for (const id of ["iNomor", "iKode", "iSandi", "iNama", "iKab"]) assert.ok(bersih.includes(`"${id}"`), "bersih: " + id);
  assert.match(bersih, /daftarRuang"\)\.replaceChildren\(\)/); assert.match(bersih, /clearInterval\(hitung\)/);
  assert.match(fn("keluar", "async function keluar()"), /bersih\(\)/, "jalur keluar memanggil bersih");
  assert.match(fn("periksa", "clearInterval(hitung); gambarUlang = null;"), /\$\("iNomor"\)\.value = ""/, "kode sah mengosongkan nomor");
  assert.doesNotMatch(js, /sisa--/, "hitung mundur tidak bergantung jumlah tick"); assert.match(js, /akhir = Date\.now\(\)/); assert.match(js, /visibilitychange/);
  assert.match(js, /setInterval\(\(\) => \{ if \(document\.hidden\) return;/);
  assert.match(fn("isiKab", "async function isiKab()"), /if \(\$\("iProv"\)\.value !== prov\) return;/);
  assert.match(js, /\[saya\.s, saluran\.s\]\.some\(x => x === 404 \|\| x === 503\)/);
  assert.match(html, /id="mkMuat"/); assert.match(html, /<form id="fNomor"[^>]*hidden>/, "form nomor tersembunyi sampai pemeriksaan awal selesai");
  assert.doesNotMatch(html, /\/privasi/); assert.match(html, /<details class="mk-rinci">\s*<summary>Baca selengkapnya<\/summary>/);
  assert.match(html, /menghapus akunmu sendiri dari halaman akun/, "teks persetujuan L4 menyebut hapus akun sendiri (PM-14)");
  for (const id of ["fEmail", "fSandiBaru", "fHapus", "bHapusAkun", "bEmail", "iSandiBaru"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /id="iSandiBaru"[^>]*autocomplete="new-password"/); assert.match(html, /id="iSandiBaru"[^>]*type="password"|type="password"[^>]*id="iSandiBaru"/);
});

uji("halaman L-1d: masuk.js dan aktivasi.js memakai PesanLayar, tanpa salinan kalimat, tanggal, atau penyamar lama", () => {
  const ak = baca("public/admin/aktivasi.js"), mj = baca("public/masuk.js");
  for (const [nama, js] of [["masuk.js", mj], ["aktivasi.js", ak]]) {
    assert.match(js, /PesanLayar\./, nama + " memakai PesanLayar");
    for (const lama of ["Tidak ada sambungan", "lalu coba lagi", "Menunggu persetujuan", "•"]) assert.ok(!js.includes(lama), nama + " tanpa salinan: " + lama);
  }
  assert.doesNotMatch(mj, /const tersamar|const lama =/); assert.match(baca("public/masuk.html"), /\/inti\/pesan\.js\?v=1"><\/script>\s*<script src="\/masuk\.js/);
  assert.match(ak, /Tidak ada dalam 120 hari/); assert.doesNotMatch(ak, /4 bulan/);
});
