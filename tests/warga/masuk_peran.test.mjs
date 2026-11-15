/* Satu Pintu Masuk, PM-05 sampai PM-07 (RENCANA-UJI U-12 sampai U-19, U-35): sesi peran dari nomor terbukti, relawan dan petugas berhak terbatas, keluar,
   sandi staf, nomor pemirsa. Worker utuh di workerd + D1 lokal sungguhan (migrasi apa adanya); kode dibaca dari wa_antre seperti gerbang WA.
   Turnstile dijawab fixture outboundService (token "ok" sah). Nomor uji hanya berawalan 62800. */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {siapkan, berantai, ADMIN, MOD2, sha256} from "./_bnpb.mjs";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";   // worker dulu: modul rute mengimpornya balik (siklus)

const uji = berantai();
const ASAL = "http://bnpb.lokal", KUNCI = {MASUK_KUNCI: "kunci-masuk-uji-panjang-lebih-dari-32-karakter", TURNSTILE_SECRET: "ts-rahasia-uji", TURNSTILE_SITEKEY: "ts-situs-uji"};
const luar = async req => new URL(req.url).host === "challenges.cloudflare.com" ? Response.json({success: (await req.formData()).get("response") === "ok"}) : new Response("diblok di uji", {status: 599});
const asetMasuk = async req => {   // public/ apa adanya, ditambah /masuk.html palsu supaya jalur "berkas ada" teruji tanpa menunggu PM-08
  const p = new URL(req.url).pathname;
  if (p === "/masuk.html" && !existsSync(path.join(AKAR, "public/masuk.html"))) return new Response("<!doctype html><title>masuk uji</title>", {headers: {"content-type": "text/html"}});
  const f = path.join(AKAR, "public", decodeURIComponent(p));
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const U = await siapkan("uji-masuk-peran", {ikat: KUNCI, luar, asetKu: asetMasuk, r2: true});
const {DB, api, n, mf} = U;

let ipN = 0;
const H = (tambah = {}) => ({"cf-connecting-ip": `10.7.${Math.floor(++ipN / 250)}.${ipN % 250}`, "x-pb": "1", origin: ASAL, ...tambah});
const nomor = i => `62800666${String(i).padStart(4, "0")}`, lokal = i => "0" + nomor(i).slice(2);
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const T0 = Date.now();
const kodeTerkirim = async i => (await DB.prepare("SELECT pesan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp' ORDER BY dibuat DESC LIMIT 1").bind(nomor(i)).first())?.pesan.match(/\b([0-9]{6})\b/)[1];
/* masuk lewat kode untuk nomor i; kembali {r, kuki (nama -> nilai terakhir), lines (semua set-cookie), cookie (header cookie siap pakai)} */
async function login(i) {
  await DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000").run();   // lewati jeda 60 detik
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi LIKE 'masuk.%' AND kunci <> 'global'").run();   // jatah per nomor dan per IP bukan yang diuji di sini
  assert.equal((await api("POST", "/api/masuk/kode", {wa: lokal(i), turnstile: "ok"}, H())).s, 200);
  const r = await api("POST", "/api/masuk/periksa", {wa: lokal(i), kode: await kodeTerkirim(i)}, H());
  assert.equal(r.s, 200, r.t);
  return {r, ...jar(r.h.getSetCookie())};
}
function jar(lines) {
  const kuki = {};
  for (const l of lines) { const [kv, ...a] = l.split(";"), [k, v] = [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]; if (!/Max-Age=0/i.test(a.join(";"))) kuki[k] = v; else delete kuki[k]; }
  return {kuki, lines, cookie: Object.entries(kuki).map(([k, v]) => k + "=" + v).join("; ")};
}
const lengkap = j => ({cookie: j.cookie, ...H()});   // POST bercookie wajib Origin sama situs (tolakOrigin) dan x-pb
const semuaCookie = [];   // seluruh set-cookie yang pernah dikeluarkan rute /api/masuk/*: U-19 memeriksa tak satu pun sesi_admin
const catat = async r => { r = await r; semuaCookie.push(...r.h.getSetCookie()); return r; };   // menerima hasil api() atau janjinya
const instansi = (o = {}) => { const id = id16(); return sisip("instansi_akun", {id, username: "akun" + id.slice(0, 8), jenis: "pemkab", tingkat: "kab", wilayah: "Kabupaten Contoh", kunci_wilayah: "k" + id, cakupan: '["62"]', prov: "62", kab: "Contoh",
  garam: "a".repeat(32), sandi_sha: "0".repeat(64), status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: `b${id.slice(0, 6)}@contoh.go.id`, wa: nomor(0), surat: 1, kartu: 1, wajib_ganti: 0, dibuat: T0, ...o}).then(() => id); };
const pendataan = (o = {}) => { const id = id16(); return sisip("pdt_akun", {id, username: "pdt" + id.slice(0, 8), nama: "Sari", jabatan: "Analis", unit: "pusdatin", email: `p${id.slice(0, 6)}@bnpb.go.id`, wa: nomor(0), garam: "a".repeat(32), sandi_hash: "0".repeat(64), status: "aktif", dibuat: T0, ...o}).then(() => id); };
let instN = 0;
const kampus = async (o = {}) => {
  const ins = id16(), id = id16();
  await sisip("institusi", {id: ins, nama: "Universitas Contoh " + ++instN, jenis: "ptn", pic_nama: "Dosen Uji", dibuat: T0, diubah: T0});
  await sisip("km_akun", {id, institusi_id: ins, nama: "Dosen Uji", email: `k${id.slice(0, 6)}@contoh.ac.id`, wa: nomor(0), status: "aktif", dibuat: T0, diubah: T0, ...o});
  return id;
};
const orang = (o = {}) => { const id = id16(); return sisip("orang", {id, jenis: "pegawai", nama: "Petugas Uji", wa: nomor(0), status: "aktif", wajah_status: "belum", dibuat: T0, diubah: T0, ...o}).then(() => id); };
const relawan = (o = {}) => { const id = id16(); return sisip("relawan", {id, nama: "Relawan Uji", wa: nomor(0), prov: "62", kab: "Contoh", jalur: "umum", hari_per_minggu: 3, maks_hari: 30, luar_provinsi: 0, gol_darah: "O+", darurat_nama: "Ibu Uji", darurat_wa: "62800999" + "0001",
  status: "diverifikasi", setuju_pdp: 1, dibuat: T0, diubah: T0, ...o}).then(() => id); };
const cabutCookie = (lines, nama) => lines.filter(l => l.startsWith(nama + "="));

/* ---------------- U-12 ---------------- */
uji("peran U-12: /masuk dan /alun-alun 200 untuk tamu di centurisk97.id; /, daftar relawan, dan halaman lain tetap 303", async () => {
  const buka = (j, h = {}) => mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", headers: {"cf-connecting-ip": H()["cf-connecting-ip"], ...h}}).then(async r => { await r.text(); return r; });
  const m = await buka("/masuk"); assert.equal(m.status, 200); assert.match(m.headers.get("content-type"), /text\/html/); assert.equal(m.headers.get("cache-control"), "no-store");
  assert.match(m.headers.get("content-security-policy"), /challenges\.cloudflare\.com/, "widget Turnstile boleh tampil");
  assert.equal((await buka("/alun-alun")).status, 200);
  for (const j of ["/", "/relawan", "/berita", "/pendataan/../meja/../relawan"]) { const r = await buka(j); assert.equal(r.status, 303, j); assert.match(r.headers.get("location"), /^\/admin\/masuk/, j); }
  assert.equal((await buka("/masuk.html")).status, 303, "berkas html langsung tetap terkunci");
  /* API alun-alun memang terbuka untuk tamu di host terkunci: baca dan tulis (Turnstile + laju), tanpa dialihkan */
  const baca = await mf.dispatchFetch("https://centurisk97.id/api/alun", {redirect: "manual", headers: {"cf-connecting-ip": H()["cf-connecting-ip"]}});
  assert.equal(baca.status, 200); await baca.text();
  const tulis = await mf.dispatchFetch("https://centurisk97.id/api/alun", {method: "POST", redirect: "manual", headers: {"cf-connecting-ip": H()["cf-connecting-ip"], "content-type": "application/json"},
    body: JSON.stringify({jenis: "tanya", judul: "Air bersih di mana?", teks: "Kami butuh air bersih di dusun kami.", bencana: "banjir", prov: "33", kab: "Kabupaten Demak", turnstile: "ok"})});
  assert.equal(tulis.status, 201, await tulis.text());
});

uji("peran U-12b: GET /masuk tanpa public/masuk.html menjawab halaman sementara 200; /api/masuk/saluran memakai cache tepi 15 detik tanpa query liar", async () => {
  const {default: worker} = await import("../../src/worker.js");
  const env = {DB, IP_SALT: "garam-uji", ...KUNCI, ASSETS: {fetch: async () => new Response("tidak ada", {status: 404})}};
  const r = await worker.fetch(new Request(ASAL + "/masuk", {headers: {"cf-connecting-ip": "10.7.250.1"}}), env, {waitUntil() {}});
  assert.equal(r.status, 200); assert.match(await r.text(), /\/admin\/masuk/);
  const s = await api("GET", "/api/masuk/saluran?x=" + id16()); assert.equal(s.s, 200);
  assert.equal(s.h.get("cache-control"), "public, max-age=15"); assert.equal(typeof s.j.wa, "boolean");
  /* kunci tetap: cacheTepi dengan tanpaQuery = permintaan berparameter acak tidak membuat entri baru */
  const sumber = readFileSync(path.join(AKAR, "src/masuk.js"), "utf8");
  assert.match(sumber, /cacheTepi\(req, ctx, 15, [^\n]*, true\)/);
});

/* ---------------- U-13, U-14, U-15 ---------------- */
uji("peran U-13: nomor sama dengan instansi_akun.wa aktif mendapat cookie instansi di dua Path yang diterima /api/instansi/*; log masuk dicatat", async () => {
  const id = await instansi({wa: nomor(1)});
  const j = await login(1); catat(j.r);
  assert.deepEqual(j.r.j.ruang, [{jenis: "instansi", nama_ruang: "Ruang instansi", lembaga: "Pemerintah kabupaten", wilayah: "Kabupaten Contoh", ke: "/instansi", butuh_sandi: false}]);
  assert.ok(!j.r.t.includes(id) && !j.r.t.includes(nomor(1)) && !j.r.t.includes(lokal(1)), "tanpa id internal dan tanpa nomor");
  const ci = cabutCookie(j.lines, "sesi_instansi"); assert.equal(ci.length, 2);
  assert.deepEqual(ci.map(l => l.match(/Path=([^;]+)/)[1]).sort(), ["/api/instansi", "/instansi"]);
  for (const l of ci) for (const a of ["HttpOnly", "Secure", "SameSite=Lax"]) assert.ok(l.includes(a), a);
  const saya = await api("GET", "/api/instansi/saya", undefined, {cookie: "sesi_instansi=" + j.kuki.sesi_instansi});
  assert.equal(saya.s, 200, saya.t); assert.equal(saya.j.akun.id, id);
  assert.equal(await n("instansi_sesi", `akun_id = '${id}'`), 1);
  assert.equal(await n("mk_masuk_log", `akun_id = '${id}' AND tabel = 'instansi_akun'`), 1);
  const a = await DB.prepare("SELECT terakhir_masuk FROM mk_akun WHERE wa = ?").bind(nomor(1)).first(); assert.ok(a.terakhir_masuk >= T0);
  /* GET /api/masuk/saya menghitung daftar yang sama dari nomor sesi, tanpa menerbitkan sesi baru */
  const sy = await api("GET", "/api/masuk/saya", undefined, {cookie: "sesi_masuk=" + j.kuki.sesi_masuk}); assert.equal(sy.s, 200);
  assert.deepEqual(sy.j.ruang, j.r.j.ruang); assert.ok(!sy.h.getSetCookie().length); assert.equal(await n("instansi_sesi", `akun_id = '${id}'`), 1);
  /* anggota aktif (mk_anggota) ke akun aktif lain; menunggu, atau akun tujuan tidak aktif = tidak masuk */
  const tujuan = await instansi({wa: nomor(90)}), mati = await instansi({wa: nomor(91), status: "dicabut", nama: null, nip: null, jabatan: null, unit: null, email: null, wa: nomor(91), surat: 0, kartu: 0});
  const mk = (await DB.prepare("SELECT id FROM mk_akun WHERE wa = ?").bind(nomor(1)).first()).id, ang = (akun, status) => sisip("mk_anggota", {id: id16(), mk_id: mk, tabel: "instansi_akun", akun_id: akun, status, jalur: "tinjau", rujukan: "uji", dibuat: T0, diubah: T0});
  await ang(mati, "aktif"); const j2 = await login(1); assert.equal(j2.r.j.ruang.length, 1, "akun tujuan dicabut tidak masuk");
  await ang(tujuan, "menunggu"); assert.equal((await login(1)).r.j.ruang.length, 1, "anggota menunggu tidak masuk");
  await DB.prepare("UPDATE mk_anggota SET status = 'aktif' WHERE akun_id = ?").bind(tujuan).run();
  const j3 = await login(1); assert.equal(j3.r.j.ruang.length, 2, "anggota aktif ke akun aktif masuk"); assert.ok(j3.r.j.ruang.every(x => x.perlu_pilih), "dua akun instansi: pilih dulu"); assert.deepEqual(j3.r.j.ruang.map(x => x.pilih).sort(), [id, tujuan].sort());
  assert.equal((await catat(api("POST", "/api/masuk/pilih", {jenis: "instansi", pilih: tujuan}, lengkap(j3)))).s, 200); assert.equal(await n("instansi_sesi", `akun_id = '${tujuan}'`), 1);
});

uji("peran U-14: akun tidak aktif, akun bernomor beda, atau akun tanpa nomor tidak mendapat sesi", async () => {
  const menunggu = await instansi({wa: nomor(2), status: "menunggu"}), dicabut = await instansi({wa: nomor(2), status: "dicabut"}), lain = await instansi({wa: nomor(3)});
  const pdtMenunggu = await pendataan({wa: nomor(2), status: "menunggu"}), kmDicabut = await kampus({wa: nomor(2), status: "dicabut"}), kmDummy = await kampus({wa: nomor(2), dummy: 1});
  const kosong = await instansi({wa: null, nama: null, nip: null, jabatan: null, unit: null, email: null, status: "belum_klaim", surat: 0, kartu: 0});
  const j = await login(2); catat(j.r);
  assert.deepEqual(j.r.j.ruang, []); assert.deepEqual(Object.keys(j.kuki), ["sesi_masuk"], "hanya sesi akun umum");
  for (const [t, k, ids] of [["instansi_sesi", "akun_id", [menunggu, dicabut, lain, kosong]], ["pdt_sesi", "akun_id", [pdtMenunggu]], ["km_sesi", "akun_id", [kmDicabut, kmDummy]]])
    for (const id of ids) assert.equal(await n(t, `${k} = '${id}'`), 0, `${t} ${id}`);
  assert.equal(await n("mk_masuk_log", `mk_id = (SELECT id FROM mk_akun WHERE wa = '${nomor(2)}')`), 0);
  /* akun aktif yang dicabut sesudah kode sah tapi sebelum sesi terbit: INSERT..SELECT bersyarat tidak menerbitkan apa pun */
  const {sesiUntuk} = await import("../../src/instansi.js"), env = {DB};
  assert.equal(await sesiUntuk(env, dicabut, Date.now()), null); assert.equal(await sesiUntuk(env, menunggu, Date.now()), null);
  assert.equal(await n("instansi_sesi", `akun_id = '${dicabut}'`), 0);
});

uji("peran U-15: beberapa akun sejenis = tanpa sesi otomatis + pilih; akun beda jenis tetap dapat sesi; /api/masuk/pilih menerbitkan sesi akun terikat saja", async () => {
  const i1 = await instansi({wa: nomor(4)}), i2 = await instansi({wa: nomor(4), jenis: "polres", wilayah: "Polres Contoh"}), p = await pendataan({wa: nomor(4)}), k = await kampus({wa: nomor(4)});
  const asing = await instansi({wa: nomor(95)});
  const j = await login(4); catat(j.r);
  assert.deepEqual(j.r.j.ruang.map(x => x.jenis).sort(), ["instansi", "instansi", "kemitraan", "pendataan"]);
  const ins = j.r.j.ruang.filter(x => x.jenis === "instansi");
  assert.ok(ins.every(x => x.perlu_pilih === true && /^[0-9a-f]{16}$/.test(x.pilih))); assert.deepEqual(ins.map(x => x.pilih).sort(), [i1, i2].sort());
  assert.ok(j.r.j.ruang.filter(x => x.jenis !== "instansi").every(x => !x.perlu_pilih && !x.pilih));
  assert.ok(!j.lines.some(l => l.startsWith("sesi_instansi=")), "dua akun instansi: tanpa sesi instansi otomatis"); assert.equal(await n("instansi_sesi", `akun_id IN ('${i1}', '${i2}')`), 0);
  assert.equal(await n("pdt_sesi", `akun_id = '${p}'`), 1); assert.equal(await n("km_sesi", `akun_id = '${k}'`), 1);
  assert.equal(await n("mk_masuk_log", `mk_id = (SELECT id FROM mk_akun WHERE wa = '${nomor(4)}')`), 2, "hanya sesi yang terbit dicatat");
  const pd = await api("GET", "/api/pendataan/saya", undefined, {cookie: "sesi_pendataan=" + j.kuki.sesi_pendataan}); assert.equal(pd.s, 200, pd.t); assert.equal(pd.j.akun.nama, "Sari");
  const kl = cabutCookie(j.lines, "sesi_kemitraan"); assert.equal(kl.length, 1); assert.ok(kl[0].includes("SameSite=Strict"), "aturan cookie kampus tetap milik modulnya"); assert.match(kl[0], /Max-Age=43200/, "12 jam");
  assert.equal((await api("GET", "/api/kemitraan/saya", undefined, {cookie: "sesi_kemitraan=" + j.kuki.sesi_kemitraan})).s, 200);
  assert.match(cabutCookie(j.lines, "sesi_pendataan")[0], /Max-Age=2592000/);
  /* /api/masuk/saya menghitung penanda yang sama */
  const sy = await api("GET", "/api/masuk/saya", undefined, {cookie: "sesi_masuk=" + j.kuki.sesi_masuk}); assert.equal(sy.j.ruang.filter(x => x.perlu_pilih).length, 2);
  /* pilih */
  const pilih = (b, c = j) => catat(api("POST", "/api/masuk/pilih", b, lengkap(c)));
  assert.equal((await api("POST", "/api/masuk/pilih", {jenis: "instansi", pilih: i1}, H())).s, 401, "tanpa sesi akun umum");
  assert.equal((await api("POST", "/api/masuk/pilih", {jenis: "instansi", pilih: i1}, {cookie: j.cookie})).s, 403, "tanpa x-pb dan Origin");
  assert.equal((await pilih({jenis: "instansi", pilih: asing})).s, 403, "akun bernomor lain ditolak"); assert.equal((await pilih({jenis: "instansi", pilih: i1.replace(/./, c => c === "a" ? "b" : "a").slice(0, 15)})).s, 400);
  assert.equal((await pilih({jenis: "pendataan", pilih: i1})).s, 403, "id akun jenis lain ditolak"); assert.equal((await pilih({jenis: "staf", pilih: i1})).s, 400); assert.equal((await pilih({jenis: "__proto__", pilih: i1})).s, 400);
  const a = await pilih({jenis: "instansi", pilih: i1}); assert.equal(a.s, 200, a.t); assert.deepEqual(a.j, {ok: true, ke: "/instansi"});
  const ja = jar(a.h.getSetCookie()); assert.equal(cabutCookie(a.h.getSetCookie(), "sesi_instansi").length, 2, "dua Path");
  assert.equal((await api("GET", "/api/instansi/saya", undefined, {cookie: "sesi_instansi=" + ja.kuki.sesi_instansi})).j.akun.id, i1);
  const b2 = await pilih({jenis: "instansi", pilih: i2}, {...j, cookie: j.cookie + "; sesi_instansi=" + ja.kuki.sesi_instansi}); assert.equal(b2.s, 200, b2.t);
  const jb = jar(b2.h.getSetCookie());
  assert.equal((await api("GET", "/api/instansi/saya", undefined, {cookie: "sesi_instansi=" + jb.kuki.sesi_instansi})).j.akun.id, i2);
  assert.equal((await api("GET", "/api/instansi/saya", undefined, {cookie: "sesi_instansi=" + ja.kuki.sesi_instansi})).s, 401, "sesi jenis yang sama di peramban ini diganti");
  assert.equal(await n("mk_masuk_log", `tabel = 'instansi_akun' AND mk_id = (SELECT id FROM mk_akun WHERE wa = '${nomor(4)}')`), 2);
  /* laju IP rute pilih */
  { let tolak = 0; for (let i = 0; i < 61; i++) if ((await api("POST", "/api/masuk/pilih", {jenis: "instansi", pilih: i1}, {...H({"cf-connecting-ip": "10.7.253.1"})})).s === 429) tolak++; assert.equal(tolak, 1); }
});

/* akun contoh (dummy = 1) tidak pernah mendapat sesi lewat nomor */
uji("peran U-14b: akun contoh (dummy = 1) bernomor cocok tidak mendapat sesi, tidak masuk ruang, tidak bisa dipilih", async () => {
  const d = await instansi({wa: nomor(96), dummy: 1}), pd = await pendataan({wa: nomor(96), dummy: 1}), o = await orang({wa: nomor(96), dummy: 1}), r = await relawan({wa: nomor(96), dummy: 1});
  const j = await login(96); catat(j.r); assert.deepEqual(j.r.j.ruang, []); assert.deepEqual(Object.keys(j.kuki), ["sesi_masuk"]);
  assert.equal(await n("instansi_sesi", `akun_id = '${d}'`), 0); assert.equal(await n("pdt_sesi", `akun_id = '${pd}'`), 0);
  assert.equal((await catat(api("POST", "/api/masuk/pilih", {jenis: "instansi", pilih: d}, lengkap(j)))).s, 403);
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {cookie: j.cookie})).s, 401); assert.equal(await n("orang", `id = '${o}'`), 1); assert.equal(r.length, 16);
  const {sesiUntuk} = await import("../../src/instansi.js"); assert.equal(await sesiUntuk({DB}, d, Date.now()), null, "INSERT..SELECT bersyarat juga menolak dummy");
});

/* ---------------- U-16 ---------------- */
uji("peran U-16: petugas lewat nomor = profil dan penugasan, wajah/absen/nonce/persetujuan menolak, riwayat tanpa absen; tautan kode lama tetap diterima", async () => {
  const kode = "ab".repeat(13), oid = await orang({wa: lokal(5)});   // orang.wa bentuk 08...
  const j = await login(5); catat(j.r);
  assert.deepEqual(j.r.j.ruang.map(x => x.jenis), ["petugas"]); assert.equal(j.r.j.ruang[0].ke, "/petugas");
  assert.deepEqual(Object.keys(j.kuki), ["sesi_masuk"], "tanpa cookie baru");
  const sesi = {cookie: "sesi_masuk=" + j.kuki.sesi_masuk}, pb = {...sesi, "x-pb": "1", origin: ASAL};
  const s = await api("GET", "/api/petugas/saya", undefined, sesi); assert.equal(s.s, 200, s.t); assert.equal(s.j.orang.id, oid);
  const r = await api("GET", "/api/petugas/riwayat", undefined, sesi); assert.equal(r.s, 200); assert.deepEqual(r.j.absen, []);
  for (const [m, jl, b] of [["POST", "/api/petugas/wajah", {}], ["DELETE", "/api/petugas/wajah"], ["POST", "/api/petugas/nonce", {}], ["POST", "/api/petugas/absen", {}], ["POST", "/api/petugas/setuju", {}]]) {
    const x = await api(m, jl, b, pb); assert.equal(x.s, 403, `${m} ${jl}: ${x.t}`); assert.match(x.j.galat, /nomor WhatsApp/);
  }
  /* logbook lewat nomor: teks saja diterima sesuai aturan logbook; foto 403 sebelum badan dibaca atau sesudah parse */
  const kini = Date.now(), hari = new Date(kini + 7 * 3600e3).toISOString().slice(0, 10), tid = id16();
  await sisip("lp_tugas", {id: tid, judul: "Patroli uji", bencana: "banjir", lat: -2.5, lon: 112.9, radius_m: 2000, mulai: kini - 3600e3, selesai: kini + 86400e3, dibuat: 1, dummy: 0}); await sisip("lp_anggota", {tugas_id: tid, orang_id: oid});
  const lb = async (foto, d = {}) => {
    const f = new FormData(); f.append("data", JSON.stringify({tugas_id: tid, tanggal: hari, kegiatan: "patroli", uraian: "Cek lapangan", hasil: "aman", foto_meta: [], ...d}));
    for (const x of foto) f.append("foto", new File([x], "f.jpg", {type: "image/jpeg"}));
    const rs = new Response(f), buf = new Uint8Array(await rs.arrayBuffer());
    const x = await mf.dispatchFetch(ASAL + "/api/petugas/logbook", {method: "POST", headers: {...pb, "content-type": rs.headers.get("content-type"), "content-length": String(buf.length)}, body: buf}); return {s: x.status, t: await x.text()};
  };
  const teks = await lb([]); assert.equal(teks.s, 201, teks.t); assert.equal(await n("lp_logbook", `orang_id = '${oid}'`), 1);
  const kecil = await lb([new Uint8Array([0xff, 0xd8, 1, 2, 0xff, 0xd9])], {foto_meta: [{lat: -2.5, lon: 112.9, akurasi: 10, waktu: kini}]}); assert.equal(kecil.s, 403, kecil.t); assert.match(kecil.t, /tautan kode pribadi/);
  const besar = await lb([new Uint8Array(70 * 1024)]); assert.equal(besar.s, 403, "ditolak dari Content-Length sebelum badan dibaca"); assert.match(besar.t, /tautan kode pribadi/);
  assert.equal(await n("lp_logbook_foto"), 0);
  assert.equal((await api("GET", "/api/petugas/foto/" + id16(), undefined, sesi)).s, 401, "foto absen tetap butuh kode pribadi atau panel");
  /* tanpa sesi: tetap 401; dengan x-kode yang salah: hasilnya kode, bukan sesi */
  assert.equal((await api("GET", "/api/petugas/saya")).s, 401);
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {...sesi, "x-kode": "00".repeat(13)})).s, 401, "x-kode salah ditolak walau sesi ada");
  /* tautan kode lama: orang berkode; wajah/absen lewat kode tidak ditolak oleh tolakRegu */
  const {sha: shaWorker} = await import("../../src/worker.js"), oid2 = await orang({wa: null, nama: "Petugas Berkode", kode_sha: await shaWorker(kode)});
  const k = await api("GET", "/api/petugas/saya", undefined, {"x-kode": kode}); assert.equal(k.s, 200, k.t); assert.equal(k.j.orang.id, oid2);
  const kw = await api("POST", "/api/petugas/nonce", {}, {"x-kode": kode, "x-pb": "1", origin: ASAL}); assert.ok(!/nomor WhatsApp/.test(kw.t), "kode pribadi membuka wajah dan absen seperti sebelumnya: " + kw.t);
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {"x-kode": "11".repeat(13)})).s, 401);
});

uji("peran U-16b: dua baris bernomor sama tidak dibuka; orang nonaktif tidak dihitung; relawan di luar STATUS_RELAWAN_SAH tidak dibuka", async () => {
  await orang({wa: nomor(6)}); await orang({wa: lokal(6), nama: "Kembar"});   // bentuk 62... dan 08...
  const j = await login(6); catat(j.r); assert.deepEqual(j.r.j.ruang, []);
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {cookie: "sesi_masuk=" + j.kuki.sesi_masuk})).s, 401);
  await orang({wa: nomor(7)}); await orang({wa: nomor(7), nama: "Nonaktif", status: "nonaktif"});
  const j7 = await login(7); assert.deepEqual(j7.r.j.ruang.map(x => x.jenis), ["petugas"], "yang nonaktif tidak dihitung");
  for (const [i, st] of [[8, "terdaftar"], [9, "ditolak"], [10, "nonaktif"], [11, "daftar_hitam"]]) {
    await relawan({wa: nomor(i), status: st});
    const x = await login(i); assert.deepEqual(x.r.j.ruang, [], st);
    const sesi = {cookie: "sesi_masuk=" + x.kuki.sesi_masuk};
    assert.equal((await api("GET", "/api/relawan/saya", undefined, sesi)).s, 403, st); assert.equal((await api("GET", "/api/petugas/saya", undefined, sesi)).s, 401, st);
  }
  assert.equal(await n("orang", "relawan_id IS NOT NULL"), 0, "tidak ada salinan orang untuk relawan yang tidak sah");
  /* dua relawan bernomor sama dalam dua bentuk */
  await relawan({wa: nomor(12)}); await relawan({wa: lokal(12), nama: "Kembar Dua"});
  const j12 = await login(12); assert.deepEqual(j12.r.j.ruang, []);
  assert.equal((await api("GET", "/api/relawan/saya", undefined, {cookie: "sesi_masuk=" + j12.kuki.sesi_masuk})).s, 403);
});

uji("peran U-16c: relawan sah lewat nomor = profil, penugasan, ketersediaan; cabut data, aksi penugasan, dan data kesehatan tidak; tautan kode lama tetap", async () => {
  const rid = await relawan({wa: lokal(13), nama: "Relawan Sah"});   // relawan.wa bentuk 08...
  const j = await login(13); catat(j.r);
  assert.deepEqual(j.r.j.ruang.map(x => x.jenis).sort(), ["petugas", "relawan"]); assert.ok(j.r.j.ruang.every(x => x.wilayah === "Contoh"));
  const sesi = {cookie: "sesi_masuk=" + j.kuki.sesi_masuk}, pb = {...sesi, "x-pb": "1", origin: ASAL};
  const g = await api("GET", "/api/relawan/saya", undefined, sesi); assert.equal(g.s, 200, g.t); assert.equal(g.j.relawan.nama, "Relawan Sah");
  for (const dilarang of ["gol_darah", "darurat", "O+", "Ibu Uji", "9990001"]) assert.ok(!g.t.includes(dilarang), "data kesehatan tidak ikut: " + dilarang);
  const ub = await api("POST", "/api/relawan/saya", {aksi: "siap"}, pb); assert.equal(ub.s, 200, ub.t); assert.equal(ub.j.status, "siap_tugas");
  assert.equal((await api("POST", "/api/relawan/saya", {aksi: "ketersediaan", hari_per_minggu: 2, maks_hari: 10, luar_provinsi: false}, pb)).s, 200);
  const cb = await api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: "HAPUS"}, pb); assert.equal(cb.s, 403, cb.t);
  assert.equal((await DB.prepare("SELECT anonim, gol_darah FROM relawan WHERE id = ?").bind(rid).first()).gol_darah, "O+", "data tidak dihapus lewat nomor");
  assert.equal((await api("POST", "/api/relawan/saya/penugasan/" + id16(), {aksi: "terima"}, pb)).s, 403, "aksi penugasan tetap butuh kode pribadi");
  /* petugas lewat relawan: orang disalin saat dipakai, hak terbatas (tanpa wajah) */
  const pt = await api("GET", "/api/petugas/saya", undefined, sesi); assert.equal(pt.s, 200, pt.t); assert.equal(pt.j.orang.id, null); assert.equal(pt.j.orang.nama, "Relawan Sah"); assert.deepEqual(pt.j.tugas, []);
  assert.equal(await n("orang", `relawan_id = '${rid}'`), 0, "GET tidak menulis: pandangan relawan tanpa salinan");
  assert.equal((await api("POST", "/api/petugas/absen", {}, pb)).s, 403); assert.equal(await n("orang", `relawan_id = '${rid}'`), 1, "salinan baru dibuat di permintaan tulis pertama");
  /* tautan kode lama relawan: persis seperti sekarang */
  const kode = "cd".repeat(13); await DB.prepare("UPDATE relawan SET kode_sha = ? WHERE id = ?").bind(sha256(kode), rid).run();
  const lama = await api("GET", "/api/relawan/saya", undefined, {"x-kode": kode}); assert.equal(lama.s, 200); assert.equal(lama.j.relawan.nama, "Relawan Sah");
  assert.equal((await api("GET", "/api/relawan/saya", undefined, {"x-kode": "ee".repeat(13)})).s, 403, "kode salah tetap 403 walau tanpa sesi");
  assert.equal((await api("GET", "/api/relawan/saya", undefined, {...sesi, "x-kode": "ee".repeat(13)})).s, 403, "x-kode salah ditolak walau sesi ada");
  const cabutLama = await api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: "HAPUS"}, {"x-kode": kode}); assert.equal(cabutLama.s, 200, "dengan kode pribadi cabut tetap bekerja");
  assert.equal((await api("GET", "/api/relawan/saya", undefined, sesi)).s, 403, "relawan dianonimkan: nomor tak lagi membuka apa pun");
});

/* ---------------- U-17 ---------------- */
uji("peran U-17: keluar mencabut mk_sesi dan sesi peran peramban ini; cookie instansi dihapus di kedua Path; sesi_admin tidak disentuh", async () => {
  const i = await instansi({wa: nomor(14)}), p = await pendataan({wa: nomor(14)}), k = await kampus({wa: nomor(14)});
  const j = await login(14); catat(j.r);
  assert.equal(await n("instansi_sesi", `akun_id = '${i}'`), 1);
  const lain = await login(4); catat(lain.r);   // peramban lain: sesi instansi/pendataan/kampus nomor 4 tidak ikut tercabut
  const sebelum = [await n("instansi_sesi"), await n("pdt_sesi"), await n("km_sesi")];
  const kel = await catat(api("POST", "/api/masuk/keluar", {}, lengkap(j))); assert.equal(kel.s, 200);
  const baris = kel.h.getSetCookie(), hapus = nama => baris.filter(l => l.startsWith(nama + "=;") && /Max-Age=0/.test(l));
  assert.deepEqual(hapus("sesi_instansi").map(l => l.match(/Path=([^;]+)/)[1]).sort(), ["/api/instansi", "/instansi"], "dua Path");
  for (const nama of ["sesi_masuk", "sesi_pendataan", "sesi_kemitraan", "sesi_staf", "sesi_pemirsa"]) assert.equal(hapus(nama).length, 1, nama);
  assert.ok(!baris.some(l => l.startsWith("sesi_admin=")), "sesi_admin tidak disentuh");
  assert.equal(await n("mk_sesi", `token_sha = '${sha256(j.kuki.sesi_masuk)}'`), 0);
  assert.equal(await n("instansi_sesi", `akun_id = '${i}'`), 0); assert.equal(await n("pdt_sesi", `akun_id = '${p}'`), 0); assert.equal(await n("km_sesi", `akun_id = '${k}'`), 0);
  assert.deepEqual([await n("instansi_sesi"), await n("pdt_sesi"), await n("km_sesi")], [sebelum[0] - 1, sebelum[1] - 1, sebelum[2] - 1], "hanya sesi peramban ini");
  assert.equal((await api("GET", "/api/instansi/saya", undefined, {cookie: "sesi_instansi=" + j.kuki.sesi_instansi})).s, 401, "cookie lama tak berlaku lagi");
  assert.equal((await api("GET", "/api/masuk/saya", undefined, {cookie: "sesi_masuk=" + j.kuki.sesi_masuk})).s, 401);
  /* tanpa cookie apa pun: tetap 200 dan cookie penghapus */
  assert.equal((await catat(api("POST", "/api/masuk/keluar", {}, H()))).s, 200);
});

/* ---------------- U-35 ---------------- */
uji("peran U-35: nomor pemirsa hanya diisi Super Admin; pemirsa aktif masuk lewat kode dan hanya tab yang diizinkan; pemirsa diputus tidak", async () => {
  const buat = await api("POST", "/api/pemirsa/admin/buat", {nama: "Mitra Uji", tab: ["berita"]}, ADMIN); assert.equal(buat.s, 201, buat.t);
  const pid = buat.j.pemirsa.id, lain = (await api("POST", "/api/pemirsa/admin/buat", {nama: "Mitra Dua", tab: ["tren"]}, ADMIN)).j.pemirsa.id;
  const set = (b, h = {...ADMIN, ...H()}) => api("POST", "/api/masuk/pemirsa_wa", b, h);
  assert.equal((await set({pemirsa_id: pid, wa: lokal(15)}, H())).s, 403, "tamu");
  assert.equal((await set({pemirsa_id: pid, wa: lokal(15)}, ADMIN)).s, 403, "Super Admin tanpa x-pb dan Origin ditolak (penjaga)");
  assert.equal((await set({pemirsa_id: pid, wa: lokal(15)}, {...ADMIN, ...H({origin: "http://evil.lokal"})})).s, 403, "origin lain");
  assert.equal((await set({pemirsa_id: pid, wa: lokal(15)}, {...MOD2, ...H()})).s, 403, "moderator bukan Super Admin");
  { const ip = {"cf-connecting-ip": "10.7.252.9"}; let tolak = 0; for (let i = 0; i < 31; i++) if ((await set({pemirsa_id: pid, wa: "bukan nomor"}, {...ADMIN, ...H(), ...ip})).s === 429) tolak++; assert.equal(tolak, 1, "30 per jam per IP"); }
  assert.equal(await n("mk_pemirsa_wa"), 0);
  assert.equal((await set({pemirsa_id: "xyz", wa: lokal(15)})).s, 400); assert.equal((await set({pemirsa_id: id16(), wa: lokal(15)})).s, 404); assert.equal((await set({pemirsa_id: pid, wa: "bukan nomor"})).s, 400);
  const ok = await set({pemirsa_id: pid, wa: lokal(15)}); assert.equal(ok.s, 200, ok.t); assert.ok(!ok.t.includes(nomor(15)), "nomor tersamar"); assert.equal(await n("mk_pemirsa_wa", `wa = '${nomor(15)}'`), 1);
  assert.equal((await set({pemirsa_id: lain, wa: lokal(15)})).s, 409, "nomor satu pemirsa saja");
  const j = await login(15); catat(j.r);
  assert.deepEqual(j.r.j.ruang, [{jenis: "pemirsa", nama_ruang: "Pantauan", lembaga: "Mitra Uji", wilayah: null, ke: "/berita", butuh_sandi: false}]);
  assert.match(cabutCookie(j.lines, "sesi_pemirsa")[0], /HttpOnly/); assert.equal(await n("pemirsa_sesi", `pemirsa_id = '${pid}'`), 1);
  const situs = (jl, cookie) => mf.dispatchFetch("https://centurisk97.id" + jl, {redirect: "manual", headers: {"cf-connecting-ip": H()["cf-connecting-ip"], cookie}}).then(async r => { await r.text(); return r; });
  const kuki = "sesi_pemirsa=" + j.kuki.sesi_pemirsa;
  assert.equal((await situs("/berita", kuki)).status, 200, "tab yang diizinkan"); const t = await situs("/tren", kuki);
  assert.equal(t.status, 303); assert.equal(t.headers.get("location"), "/berita", "tab lain dialihkan ke tab pertamanya");
  /* pemirsa diputus: tidak ada sesi baru dan sesi lama sudah dicabut */
  assert.equal((await api("POST", "/api/pemirsa/admin/" + pid, {aksi: "cabut"}, ADMIN)).s, 200);
  const j2 = await login(15); assert.deepEqual(j2.r.j.ruang, []); assert.ok(!j2.kuki.sesi_pemirsa); assert.equal(await n("pemirsa_sesi", `pemirsa_id = '${pid}'`), 0);
  /* null menghapus; Super Admin mengisi ulang */
  assert.equal((await set({pemirsa_id: pid, wa: null})).s, 200); assert.equal(await n("mk_pemirsa_wa", `pemirsa_id = '${pid}'`), 0);
  const {sesiUntuk} = await import("../../src/pemirsa.js"); assert.equal(await sesiUntuk({DB}, pid, Date.now()), null, "pemirsa diputus tidak menerbitkan sesi");
});

/* ---------------- U-18, U-19 ---------------- */
let STAF = null;
const bikinStaf = async (i, peran = ["pusdalops"]) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf Uji " + i, nip: `1990${String(i).padStart(2, "0")}0012005`.padEnd(18, "7"), unit: "Pusdalops BNPB", email: `s${i}@bnpb.go.id`, wa: lokal(i), peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t); return {id: r.j.staf.id, username: r.j.username, sandi: r.j.sandi};
};
uji("peran U-18: staf tidak mendapat sesi_staf dari kode; sandi salah menaikkan hitungan gagal staf; sandi benar menerbitkan sesi_staf", async () => {
  STAF = await bikinStaf(16); const lainStaf = await bikinStaf(17);
  const j = await login(16); catat(j.r);
  assert.deepEqual(j.r.j.ruang, [{jenis: "staf", nama_ruang: "Panel staf BNPB", lembaga: "BNPB", wilayah: null, ke: "/admin/pantau", butuh_sandi: true, pilih: STAF.id}]);
  assert.ok(!j.lines.some(l => l.startsWith("sesi_staf=")), "tanpa sesi_staf sebelum sandi"); assert.equal(await n("staf_sesi"), 0); assert.ok(!j.r.t.includes(STAF.username), "username tidak keluar");
  const sesi = {cookie: "sesi_masuk=" + j.kuki.sesi_masuk}, sandi = (b, h = lengkap(j)) => catat(api("POST", "/api/masuk/sandi", b, h));
  const gagalStaf = () => n("laju_bnpb", "aksi = 'staf.gagal_ui'");
  const lajuSandi = await n("laju_bnpb", "aksi = 'masuk.sandi_ip'");
  assert.equal((await api("POST", "/api/masuk/sandi", {sandi: "x"}, H({cookie: "sesi_masuk=" + "f".repeat(64)}))).s, 401, "kuki palsu");
  assert.equal(await n("laju_bnpb", "aksi = 'masuk.sandi_ip'"), lajuSandi + 1, "batas IP dihitung sebelum sesi dibaca");
  assert.equal((await api("POST", "/api/masuk/sandi", {sandi: "x"}, H())).s, 401, "tanpa sesi akun umum");
  assert.equal((await api("POST", "/api/masuk/sandi", {sandi: "x"}, {...sesi, "cf-connecting-ip": "10.7.251.1"})).s, 403, "tanpa x-pb dan Origin");
  const awal = await gagalStaf();
  const salah = await (await sandi({sandi: "bukan-sandinya", staf: STAF.id})); assert.equal(salah.s, 401); assert.ok(!salah.h.getSetCookie().length);
  assert.equal(await gagalStaf(), awal + 1, "hitungan gagal staf naik"); assert.equal(await n("staf_sesi"), 0);
  assert.equal((await sandi({sandi: STAF.sandi, staf: lainStaf.id})).s, 400, "staf yang nomornya beda tidak bisa dipilih");
  assert.equal((await sandi({sandi: STAF.sandi, username: lainStaf.username, staf: "gerbang@x"})).s, 400, "username dari klien tidak diterima");
  assert.equal((await sandi({sandi: "", staf: STAF.id})).s, 400);
  await DB.prepare("UPDATE mk_sesi SET kode_pada = kode_pada - 16 * 60e3").run();
  assert.equal((await sandi({sandi: STAF.sandi, staf: STAF.id})).s, 403, "kode lebih dari 15 menit"); assert.equal(await n("staf_sesi"), 0);
  await DB.prepare("UPDATE mk_sesi SET kode_pada = kode_pada + 16 * 60e3").run();
  const ok = await sandi({sandi: STAF.sandi}); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.ke, "/admin/pantau"); assert.equal(ok.j.wajib_ganti, true, "sandi awal = wajib ganti, seperti alur lama");
  const cs = ok.h.getSetCookie().find(l => l.startsWith("sesi_staf=")); assert.ok(cs && cs.includes("HttpOnly"));
  const saya = await api("GET", "/api/staf/saya", undefined, {cookie: cs.split(";")[0]}); assert.equal(saya.s, 200, saya.t); assert.equal(saya.j.staf.id, STAF.id);
  assert.equal(await n("mk_masuk_log", `tabel = 'staf' AND akun_id = '${STAF.id}'`), 1);
  /* keluar mencabut sesi staf peramban ini */
  const kel = await api("POST", "/api/masuk/keluar", {}, {...lengkap(j), cookie: j.cookie + "; " + cs.split(";")[0]}); assert.equal(kel.s, 200);
  assert.equal(await n("staf_sesi", `staf_id = '${STAF.id}'`), 0); assert.ok(kel.h.getSetCookie().some(l => /^sesi_staf=;.*Max-Age=0/.test(l)));
});

uji("peran U-18b: banyak staf bernomor sama wajib dipilih dari daftar; sandi staf lain dengan nomor sama tidak membuka akun yang dipilih", async () => {
  const a = await bikinStaf(18), b = await bikinStaf(19); await DB.prepare("UPDATE staf SET wa = ? WHERE id = ?").bind(nomor(18), b.id).run();
  const j = await login(18); catat(j.r); assert.equal(j.r.j.ruang.filter(x => x.jenis === "staf").length, 2);
  const sandi = (body) => catat(api("POST", "/api/masuk/sandi", body, lengkap(j)));
  assert.equal((await sandi({sandi: a.sandi})).s, 400, "dua akun: wajib memilih");
  assert.equal((await sandi({sandi: b.sandi, staf: a.id})).s, 401, "sandi akun lain bukan sandi akun yang dipilih");
  assert.equal((await sandi({sandi: a.sandi, staf: a.id})).s, 200);
  await DB.prepare("UPDATE staf SET status = 'dicabut' WHERE id = ?").bind(b.id).run();
  const j2 = await login(18); assert.equal(j2.r.j.ruang.filter(x => x.jenis === "staf").length, 1, "staf dicabut tidak masuk daftar");
  assert.equal((await catat(api("POST", "/api/masuk/sandi", {sandi: b.sandi, staf: b.id}, lengkap(j2)))).s, 400);
});

uji("peran U-19: tidak ada rute /api/masuk/* yang menerbitkan sesi_admin; akun rahasia tidak dicari lewat nomor", async () => {
  assert.ok(semuaCookie.length > 10, "ada cukup keluaran untuk diperiksa"); assert.ok(!semuaCookie.some(l => l.startsWith("sesi_admin=")), "tak satu pun jawaban /api/masuk/* membawa sesi_admin");
  /* sesi akun umum tanpa staf: sandi rahasia (AKUN_SITUS, ADMIN_TOKEN) tidak membuka apa pun */
  const j = await login(20); catat(j.r); const kuki = lengkap(j);
  for (const b of [{sandi: "sandi"}, {sandi: "rahasia-admin"}, {sandi: "sandi", staf: "gerbang@x"}, {sandi: "sandi-dummy", staf: "dirga@x"}]) {
    const r = await catat(api("POST", "/api/masuk/sandi", b, kuki)); assert.equal(r.s, 403, JSON.stringify(b)); assert.ok(!r.h.getSetCookie().length);
  }
  assert.ok(!semuaCookie.some(l => l.startsWith("sesi_admin=")));
  const sumber = ["src/masuk.js", "src/masuk_sesi.js", "src/masuk_konst.js"].map(f => readFileSync(path.join(AKAR, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")).join("\n");
  assert.ok(!/sesi_admin|buatSesi|adminOK|ADMIN_TOKEN|AKUN_SITUS/.test(sumber), "kode pintu masuk tidak menyentuh akun rahasia");
});
