/* Kemitraan Kampus: cangkang rute + gerbang hak (src/kemitraan.js, migrasi 0085) di atas worker utuh (Miniflare) dan D1 lokal sungguhan, tanpa mock klien DB (TEST.md).
   Dijaga: tiap peran (SA, ST, PM, KK, AG, BP, PL) terdeteksi benar; yang salah DITOLAK (kode dicabut/kedaluwarsa, sesi kedaluwarsa, staf tanpa peran kemitraan, akun gerbang situs);
   peran staf `kemitraan` bisa diberikan lewat API dan trigger; /kemitraan tanpa sesi = 200 di centurisk97.id; pola :id/:rid/:aid/:kab4 cocok, pola liar 404;
   POST bercookie sesi_kemitraan dari origin asing ditolak; tabel km belum ada = 503.
   Jalankan: node --test tests/warga/kemitraan_gerbang.test.mjs */
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";
import {ruteKm, RUTE_KEMITRAAN} from "../../src/kemitraan.js";
import {tolakOrigin} from "../../src/worker.js";
import {PERAN} from "../../src/staf.js";

const U = await siapkan("uji-km-gerbang"), uji = berantai();
const PB = {"x-pb": "1"}, JAM = 3600e3, KINI = Date.now();
const id16 = () => randomBytes(8).toString("hex");
let ipN = 0; const ip = () => ({"cf-connecting-ip": `10.7.${Math.floor(++ipN / 250)}.${ipN % 250}`});
const saya = (h = {}) => U.api("GET", "/api/kemitraan/saya", undefined, {...ip(), ...h});
const sisip = (tabel, o) => { const k = Object.keys(o); return U.DB.prepare(`INSERT INTO ${tabel} (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).bind(...k.map(x => o[x])).run(); };

let nStaf = 0;
async function stafBaru(peran) {
  const r = await U.api("POST", "/api/staf/admin/buat", {nama: "Staf Uji", nip: `1981${++nStaf}0012005`, unit: "Direktorat Uji", email: `km${nStaf}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await U.api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ip()), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await U.api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB, ...ip()})).s, 200);
  return {cookie, ...PB};
}
let nWA = 0;
async function relawanBaru() {
  nWA++;
  const r = await U.api("POST", "/api/relawan/daftar", {nama: "Dosen Uji " + nWA, wa: "08127" + String(nWA).padStart(6, "0"), email: `d${nWA}@contoh.id`, prov: "62", kab: "Pulang Pisau", jalur: "umum", keahlian: ["medis"],
    sertifikat: "BTCLS", hari_per_minggu: 3, maks_hari: 30, luar_provinsi: false, gol_darah: "O+", darurat_nama: "Ibu Uji", darurat_wa: "08139" + String(nWA).padStart(6, "0"), setuju: true}, ip());
  assert.equal(r.s, 201, r.t);
  const id = (await U.DB.prepare("SELECT id FROM relawan WHERE nama = ?").bind("Dosen Uji " + nWA).first()).id;
  return {id, kode: r.j.kode};
}
const anggota = id => sisip("km_anggota", {relawan_id: id, unsur: "dosen", dibuat: KINI, diubah: KINI});
async function kodeBpbd(o = {}) {
  const kode = randomBytes(13).toString("hex");
  await sisip("km_bpbd_kode", {id: id16(), kode_sha: sha256(kode), kab4: "6211", prov: "62", nama: "Pak Anto", berlaku: KINI + 30 * 24 * JAM, dibuat: KINI, ...o});
  return kode;
}
async function kodePl(o = {}) {
  const kode = randomBytes(13).toString("hex");
  await sisip("km_pl_kode", {id: id16(), kode_sha: sha256(kode), jenis: "penelaah", nama: "Dr Ani", berlaku: KINI + 30 * 24 * JAM, dibuat: KINI, ...o});
  return kode;
}
async function sesiKK(o = {}) {
  const inst = id16(), akun = id16(), token = randomBytes(32).toString("hex");
  await sisip("institusi", {id: inst, nama: "Universitas Uji " + akun, jenis: "ptn", prov: "62", pic_nama: "PIC", dibuat: 1, diubah: 1});
  await sisip("km_akun", {id: akun, institusi_id: inst, nama: "Koordinator Uji", email: `kk${akun}@kampus.ac.id`, status: "aktif", dibuat: KINI, diubah: KINI, ...(o.akun || {})});
  await sisip("km_sesi", {sha: sha256(token), akun_id: akun, dibuat: KINI - JAM, sampai: KINI + 12 * JAM, ...(o.sesi || {})});
  return {token, cookie: `sesi_kemitraan=${token}`, akun};
}

uji("peran terdeteksi benar: SA, ST, PM, KK, AG, BP, PL; tanpa kredensial 401", async () => {
  const sa = await saya(ADMIN); assert.equal(sa.s, 200, sa.t); assert.equal(sa.j.jenis, "SA", "ADMIN_TOKEN yang tercantum di SUPER_ADMIN");
  assert.equal((await saya(MOD2)).j.jenis, "ST", "moderator biasa = ST");
  assert.equal((await saya(await stafBaru(["kemitraan"]))).j.jenis, "ST", "staf peran kemitraan = ST");
  assert.equal((await saya(await stafBaru(["pimpinan"]))).j.jenis, "PM", "staf pimpinan = PM");
  assert.equal((await saya(await stafBaru(["pimpinan", "kemitraan"]))).j.jenis, "ST", "kemitraan menang atas pimpinan");
  assert.equal((await saya({cookie: (await sesiKK()).cookie})).j.jenis, "KK");
  const r = await relawanBaru(); await anggota(r.id);
  await U.DB.prepare("UPDATE relawan SET status = 'siap_tugas' WHERE id = ?").bind(r.id).run();
  assert.equal((await saya({"x-kode": r.kode})).j.jenis, "AG");
  assert.equal((await saya({"x-kode": await kodeBpbd()})).j.jenis, "BP");
  assert.equal((await saya({"x-kode": await kodePl()})).j.jenis, "PL");
  const tamu = await saya(); assert.equal(tamu.s, 401, "tanpa kredensial: 401, bukan data");
});
uji("yang salah DITOLAK: kode dicabut, kedaluwarsa, relawan bukan anggota km, akun gerbang, staf tanpa peran kemitraan, sesi KK mati", async () => {
  for (const [nama, kode] of [["bpbd dicabut", await kodeBpbd({dicabut: KINI - 1})], ["bpbd kedaluwarsa", await kodeBpbd({berlaku: KINI - 1})],
    ["pl dicabut", await kodePl({dicabut: KINI - 1})], ["pl kedaluwarsa", await kodePl({berlaku: KINI - 1})], ["kode acak", randomBytes(13).toString("hex")], ["bentuk liar", "xyz"]]) {
    const r = await saya({"x-kode": kode}); assert.equal(r.s, 403, `${nama}: harus 403, dapat ${r.s} ${r.t}`); assert.equal(r.j.jenis, undefined);
  }
  const bukanAnggota = await relawanBaru();   // relawan sah tetapi tanpa baris km_anggota
  assert.equal((await saya({"x-kode": bukanAnggota.kode})).s, 403, "relawan tanpa km_anggota bukan AG");
  const nonaktif = await relawanBaru(); await anggota(nonaktif.id);
  await U.DB.prepare("UPDATE relawan SET status = 'nonaktif' WHERE id = ?").bind(nonaktif.id).run();
  assert.equal((await saya({"x-kode": nonaktif.kode})).s, 403, "relawan nonaktif bukan AG");
  const baru = await relawanBaru(); await anggota(baru.id);   // status awal 'terdaftar': belum diverifikasi
  assert.equal((await saya({"x-kode": baru.kode})).s, 403, "relawan terdaftar (belum diverifikasi) bukan AG");
  await U.DB.prepare("UPDATE relawan SET status = 'diverifikasi' WHERE id = ?").bind(baru.id).run();
  assert.equal((await saya({"x-kode": baru.kode})).j?.jenis, "AG", "kembaran sah: diverifikasi = AG");
  await U.DB.prepare("UPDATE relawan SET dummy = 1 WHERE id = ?").bind(baru.id).run();
  assert.equal((await saya({"x-kode": baru.kode})).s, 403, "relawan dummy bukan AG");
  assert.equal((await saya(GERBANG)).s, 401, "akun gerbang situs bukan ST (modOK menolaknya)");
  for (const p of ["pusdalops", "verifikator", "koordalops"]) assert.equal((await saya(await stafBaru([p]))).s, 401, `staf ${p} tanpa peran kemitraan bukan ST/PM`);
  assert.equal((await saya({cookie: (await sesiKK({sesi: {sampai: KINI - 1, dibuat: KINI - 2}})).cookie})).s, 401, "sesi KK kedaluwarsa");
  assert.equal((await saya({cookie: (await sesiKK({akun: {status: "dicabut"}})).cookie})).s, 401, "akun KK dicabut");
  assert.equal((await saya({cookie: "sesi_kemitraan=" + "a".repeat(64)})).s, 401, "token sesi tak dikenal");
});
uji("peran staf kemitraan bisa DIBERIKAN (API + trigger 0085); peran liar tetap ditolak", async () => {
  assert.equal(PERAN.kemitraan, "Kemitraan kampus");
  const r = await U.api("POST", "/api/staf/admin/buat", {nama: "Staf Ubah", nip: "198199900120", unit: "Direktorat Uji", email: "ubah@bnpb.go.id", wa: "081234567890", peran: ["pusdalops"], wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const id = (await U.DB.prepare("SELECT id FROM staf WHERE username = ?").bind(r.j.username).first()).id;
  const u = await U.api("POST", "/api/staf/admin/" + id, {aksi: "ubah", peran: ["pusdalops", "kemitraan"], wilayah: []}, ADMIN); assert.equal(u.s, 200, u.t);
  assert.deepEqual(JSON.parse((await U.DB.prepare("SELECT peran FROM staf WHERE id = ?").bind(id).first()).peran), ["pusdalops", "kemitraan"]);
  assert.equal((await U.api("POST", "/api/staf/admin/" + id, {aksi: "ubah", peran: ["kemitraan", "bukan_peran"], wilayah: []}, ADMIN)).s, 400, "peran liar ditolak di API");
  await assert.rejects(() => U.DB.prepare("UPDATE staf SET peran = '[\"kemitraan\",\"bukan_peran\"]' WHERE id = ?").bind(id).run(), /tidak sah/, "trigger menolak peran liar");
  await assert.rejects(() => U.DB.prepare("UPDATE staf SET peran = '[\"kemitraan\",\"kemitraan\"]' WHERE id = ?").bind(id).run(), /tidak sah|CHECK|berulang/, "trigger menolak peran ganda");
});
uji("/kemitraan tanpa sesi = layar masuk 200 di host centurisk97.id; halaman terkunci lain tetap dialihkan", async () => {
  const situs = (j, h = {}) => U.mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", headers: {...ip(), ...h}});
  for (const j of ["/kemitraan", "/kemitraan/", "/kemitraan/masuk", "/kemitraan/daftar", "/kemitraan/saya", "/kemitraan/sertifikat/" + id16()]) {
    const r = await situs(j), t = await r.text();
    assert.equal(r.status, 200, `${j}: tamu harus 200 (bukan 303 ke /admin/masuk), dapat ${r.status}`);
    assert.match(r.headers.get("content-type"), /text\/html/); assert.match(t, /Kemitraan/);
    assert.match(r.headers.get("content-security-policy"), /script-src 'self'/); assert.match(r.headers.get("cache-control"), /no-store/);
    assert.doesNotMatch(t, /<script|style=|onclick=/i, `${j}: cangkang tanpa skrip/gaya inline`);
  }
  const kontrol = await situs("/prediksi"); await kontrol.text();
  assert.equal(kontrol.status, 303, "kontrol: halaman terkunci lain di host yang sama tetap dialihkan ke masuk");
  const api = await situs("/api/kemitraan/saya"); await api.text(); assert.equal(api.status, 401, "API di host terkunci: dijaga hakKm, bukan gerbang situs");
});
uji("pola jalur: :id :rid :aid :kab4 cocok; pola liar 404; metode lain 405", async () => {
  assert.deepEqual(ruteKm("GET", "/api/kemitraan/daerah/6211/pakar")?.p, {kab4: "6211"});
  assert.deepEqual(ruteKm("POST", "/api/kemitraan/masalah/0123456789abcdef/pakar/A5012345")?.p, {id: "0123456789abcdef", aid: "A5012345"});
  assert.deepEqual(ruteKm("GET", "/kemitraan/sertifikat/0123456789abcdef")?.p, {id: "0123456789abcdef"});
  for (const j of ["/api/kemitraan/daerah/62/pakar", "/api/kemitraan/daerah/62110/pakar", "/api/kemitraan/daerah/621a/pakar", "/api/kemitraan/daerah/6211/pakar/x",
    "/api/kemitraan/masalah/0123456789abcde/pakar/A5012345", "/api/kemitraan/masalah/0123456789ABCDEF/pakar/A5012345", "/api/kemitraan/masalah/0123456789abcdef/pakar/B5012345",
    "/api/kemitraan/masalah/0123456789abcdef/pakar/A123", "/api/kemitraan/masalah/0123456789abcdef/pakar/A1234567890123", "/api/kemitraan/masalah/0123456789abcdef/pakar/A12x45"])
    assert.equal(ruteKm(j.includes("masalah") ? "POST" : "GET", j), null, "pola liar harus tidak cocok: " + j);
  const st = {...MOD2, ...ip()};
  assert.equal((await U.api("GET", "/api/kemitraan/daerah/6211/pakar", undefined, st)).s, 501, "pola sah + hak sah: sampai ke rute (penampung 501)");
  assert.equal((await U.api("POST", "/api/kemitraan/masalah/0123456789abcdef/pakar/A5012345", {}, st)).s, 501);
  for (const [m, j] of [["GET", "/api/kemitraan/daerah/62/pakar"], ["GET", "/api/kemitraan/daerah/abcd/pakar"], ["POST", "/api/kemitraan/masalah/xyz/pakar/A5012345"], ["POST", "/api/kemitraan/masalah/0123456789abcdef/pakar/B1"],
    ["GET", "/api/kemitraan/tidak-ada"], ["GET", "/api/kemitraan/saya/lain"]]) {
    const r = await U.api(m, j, m === "POST" ? {} : undefined, st); assert.equal(r.s, 404, `${m} ${j}: harus 404 JSON, dapat ${r.s}`); assert.ok(r.j?.galat, "badan galat JSON");
  }
  const m = await U.api("POST", "/api/kemitraan/saya", {}, st); assert.equal(m.s, 405); assert.match(m.h.get("allow"), /GET/);
  assert.equal((await U.api("GET", "/api/kemitraan/daerah/6211/pakar", undefined, ip())).s, 401, "pola sah tanpa hak: 401 (rute ada tidak dibedakan dari rute tak ada oleh isi)");
  assert.ok(Object.keys(RUTE_KEMITRAAN).length >= 10);
});
uji("CSRF: POST bercookie sesi_kemitraan dari origin asing/kosong ditolak; sama-situs lolos ke hak", async () => {
  const j = "/api/kemitraan/masalah/0123456789abcdef/pakar/A5012345", kk = await sesiKK(), h = x => ({...ip(), cookie: kk.cookie, ...x});
  assert.equal((await U.api("POST", j, {}, h({origin: "https://evil.example", "x-km": "1"}))).s, 403, "origin asing + cookie sesi_kemitraan");
  assert.equal((await U.api("POST", j, {}, h({"x-km": "1"}))).s, 403, "origin kosong + cookie sesi_kemitraan (SameSite saja tidak menahan)");
  assert.equal((await U.api("POST", j, {}, h({origin: "null", "x-km": "1"}))).s, 403, "origin null + cookie");
  assert.equal((await U.api("POST", j, {}, h({origin: "http://bnpb.lokal"}))).s, 401, "sama-situs tanpa x-km: sesi KK tidak berlaku untuk kiriman");
  assert.equal((await U.api("POST", j, {}, h({origin: "http://bnpb.lokal", "x-km": "1"}))).s, 501, "sama-situs + x-km: lolos tolakOrigin dan hakKm (KK), sampai ke penampung");
  /* tanpa cookie sesi, kosong tetap diterima seperti semula (kode x-kode / token header tidak lewat cookie) */
  const url = new URL("http://bnpb.lokal/x");
  assert.equal(tolakOrigin(new Request(url, {method: "POST", headers: {cookie: "lain=1"}}), url), null);
  assert.equal(tolakOrigin(new Request(url, {method: "POST", headers: {cookie: "sesi_kemitraan=" + "a".repeat(64)}}), url)?.status, 403);
});
uji("tabel km belum ada = 503 rapi, bukan 500", async () => {
  const V = await siapkan("uji-km-503");
  await V.DB.prepare("DROP TABLE km_bpbd_kode").run();   // simulasi migrasi 0080 belum jalan untuk tabel ini
  const r = await V.api("GET", "/api/kemitraan/saya", undefined, {"x-kode": randomBytes(13).toString("hex"), ...ip()});
  assert.equal(r.s, 503, r.t); assert.match(r.j.galat, /belum diaktifkan/);
  assert.doesNotMatch(r.t, /migrasi|0080|0085/, "pesan publik tanpa nomor migrasi");
  assert.equal((await V.api("GET", "/api/kemitraan/saya", undefined, {...ip()})).s, 401, "tanpa kode: tidak menyentuh tabel km, 401");
});
uji("HEAD/OPTIONS/metode lain: HEAD dipetakan ke GET, OPTIONS dan POST ke halaman 405 + allow, tidak jatuh ke aset; /kemitraanX dan /kemitraan.html tetap terkunci", async () => {
  const h = await U.api("HEAD", "/api/kemitraan/saya", undefined, {...MOD2, ...ip()}); assert.equal(h.s, 200, "HEAD rute API = GET");
  const o = await U.api("OPTIONS", "/api/kemitraan/saya", undefined, {...MOD2, ...ip()}); assert.equal(o.s, 405); assert.match(o.h.get("allow"), /GET/);
  const p = await U.api("POST", "/kemitraan/saya", {}, ip()); assert.equal(p.s, 405, "POST ke halaman bukan jatuh ke ASSETS"); assert.equal(p.h.get("allow"), "GET");
  assert.equal((await U.api("OPTIONS", "/kemitraan", undefined, ip())).s, 405);
  assert.equal((await U.api("HEAD", "/kemitraan", undefined, ip())).s, 200);
  const situs = async j => { const r = await U.mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", headers: ip()}); await r.text(); return r; };
  assert.notEqual((await situs("/kemitraanX")).status, 200, "/kemitraanX bukan halaman modul");
  assert.equal((await situs("/kemitraan.html")).status, 303, "/kemitraan.html tetap dialihkan gerbang .html");
});
uji("halaman berhak tanpa sesi = 303 ke /kemitraan/masuk; dengan hak yang sesuai 200; KK tak boleh panduan", async () => {
  const situs = async (j, h = {}) => { const r = await U.mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", headers: {...ip(), ...h}}); await r.text(); return r; };
  for (const j of ["/kemitraan/buku", "/kemitraan/panduan"]) { const r = await situs(j); assert.equal(r.status, 303, j); assert.equal(r.headers.get("location"), "/kemitraan/masuk"); }
  assert.equal((await situs("/kemitraan/buku", {"x-kode": randomBytes(13).toString("hex")})).status, 303, "kode salah tetap 303");
  assert.equal((await situs("/kemitraan/buku", MOD2)).status, 200); assert.equal((await situs("/kemitraan/panduan", MOD2)).status, 200);
  assert.equal((await situs("/kemitraan/buku", GERBANG)).status, 303, "akun gerbang situs bukan ST");
  const kk = await sesiKK();
  assert.equal((await situs("/kemitraan/buku", {cookie: kk.cookie})).status, 200, "KK boleh buku");
  assert.equal((await situs("/kemitraan/panduan", {cookie: kk.cookie})).status, 303, "KK tidak boleh panduan (DT 4.2: ST, BP)");
});
uji("laju tebakan kode km 60 per jam per IP (bukan 300); kode sah tidak ikut dihitung", async () => {
  const tetap = {"cf-connecting-ip": "10.99.0.77"}, sah = await kodeBpbd();
  for (let i = 0; i < 60; i++) { const r = await saya({...tetap, "x-kode": randomBytes(13).toString("hex")}); assert.equal(r.s, 403, `tebakan ke-${i + 1}`); }
  const r = await saya({...tetap, "x-kode": randomBytes(13).toString("hex")}); assert.equal(r.s, 429, "tebakan ke-61 dari IP yang sama: 429"); assert.equal(r.h.get("retry-after"), "3600");
  assert.equal((await saya({...tetap, "x-kode": sah})).j?.jenis, "BP", "kode sah tetap lolos di atas batas (tidak menyentuh penghitung)");
  assert.equal((await saya({...ip(), "x-kode": randomBytes(13).toString("hex")})).s, 403, "IP lain tidak terpengaruh");
});
