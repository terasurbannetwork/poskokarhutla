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
const instansi = (o = {}) => { const id = id16(); return sisip("instansi_akun", {id, username: "akun" + id.slice(0, 8), jenis: "polres", tingkat: "kab", wilayah: "Kabupaten Contoh", kunci_wilayah: "k" + id, cakupan: '["62"]', prov: "62", kab: "Contoh",
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
  for (const j of ["/", "/relawan", "/berita", "/pendataan/../meja/../relawan"]) { const r = await buka(j); assert.equal(r.status, 303, j); assert.match(r.headers.get("location"), /^\/masuk\?ke=/, j); }
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
  assert.equal(r.status, 200); assert.match(await r.text(), /Halaman masuk belum tersedia/);
  const s = await api("GET", "/api/masuk/saluran?x=" + id16()); assert.equal(s.s, 200);
  assert.equal(s.h.get("cache-control"), "public, max-age=15"); assert.equal(typeof s.j.wa, "boolean");
  /* kunci tetap: cacheTepi dengan tanpaQuery = permintaan berparameter acak tidak membuat entri baru */
  const sumber = readFileSync(path.join(AKAR, "src/masuk.js"), "utf8");
  assert.match(sumber, /cacheTepi\(req, ctx, 15, [^\n]*, true\)/);
});

/* ---------------- U-13, U-14, U-15 ---------------- */
uji("peran U-13: (K25) nomor sama dengan instansi_akun.wa aktif TIDAK mendapat sesi instansi dari kode; hanya sesi akun umum; tanpa log masuk akun", async () => {
  const id = await instansi({wa: nomor(1)});
  const j = await login(1); catat(j.r);
  assert.deepEqual(j.r.j.ruang, [], "kode tidak membuka ruang akun peran (K25)");
  assert.deepEqual(Object.keys(j.kuki), ["sesi_masuk"], "hanya sesi akun umum");
  assert.ok(!j.r.t.includes(id) && !j.r.t.includes(nomor(1)) && !j.r.t.includes(lokal(1)), "tanpa id internal dan tanpa nomor");
  assert.equal(await n("instansi_sesi", `akun_id = '${id}'`), 0);
  assert.equal(await n("mk_masuk_log", `akun_id = '${id}'`), 0);
  const a = await DB.prepare("SELECT terakhir_masuk FROM mk_akun WHERE wa = ?").bind(nomor(1)).first(); assert.ok(a.terakhir_masuk >= T0);
  const sy = await api("GET", "/api/masuk/saya", undefined, {cookie: "sesi_masuk=" + j.kuki.sesi_masuk}); assert.equal(sy.s, 200); assert.ok(!sy.h.getSetCookie().length, "saya tidak menerbitkan sesi");
  assert.equal(await n("instansi_sesi", `akun_id = '${id}'`), 0);
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

uji("peran U-15: (K25) akun instansi, pendataan, dan kampus bernomor sama tidak mendapat sesi dari kode; rute pilih, sandi sesudah kode, atur sandi, dan kode email sudah dicabut", async () => {
  const i1 = await instansi({wa: nomor(4)}), i2 = await instansi({wa: nomor(4), jenis: "polres", wilayah: "Polres Contoh"}), p = await pendataan({wa: nomor(4)}), k = await kampus({wa: nomor(4)});
  const j = await login(4); catat(j.r);
  assert.deepEqual(j.r.j.ruang, []); assert.deepEqual(Object.keys(j.kuki), ["sesi_masuk"]);
  assert.equal(await n("instansi_sesi", `akun_id IN ('${i1}', '${i2}')`), 0); assert.equal(await n("pdt_sesi", `akun_id = '${p}'`), 0); assert.equal(await n("km_sesi", `akun_id = '${k}'`), 0);
  assert.equal(await n("mk_masuk_log", `mk_id = (SELECT id FROM mk_akun WHERE wa = '${nomor(4)}')`), 0);
  for (const rute of ["POST /api/masuk/pilih", "POST /api/masuk/sandi", "POST /api/masuk/sandi_baru", "POST /api/masuk/kode_email"]) {
    const r = await catat(api("POST", rute.slice(5), {jenis: "instansi", pilih: i1, sandi: "x", wa: lokal(4), email: "a@contoh.go.id"}, lengkap(j)));
    assert.ok(r.s === 404 || r.s === 405, rute + " dicabut: " + r.s); assert.ok(!r.h.getSetCookie().some(l => /^sesi_(instansi|pendataan|kemitraan|staf|pemirsa)=/.test(l)), rute);
  }
  const sumber = readFileSync(path.join(AKAR, "src/masuk.js"), "utf8");
  for (const rute of ["POST /api/masuk/pilih", "POST /api/masuk/sandi", "POST /api/masuk/sandi_baru", "POST /api/masuk/kode_email"]) assert.ok(!sumber.includes(`"${rute}"`), "tidak terdaftar lagi: " + rute);
});

/* akun contoh (dummy = 1) tidak pernah mendapat sesi lewat nomor */
uji("peran U-14b: akun contoh (dummy = 1) bernomor cocok tidak mendapat sesi, tidak masuk ruang, tidak bisa dipilih", async () => {
  const d = await instansi({wa: nomor(96), dummy: 1}), pd = await pendataan({wa: nomor(96), dummy: 1}), o = await orang({wa: nomor(96), dummy: 1}), r = await relawan({wa: nomor(96), dummy: 1});
  const j = await login(96); catat(j.r); assert.deepEqual(j.r.j.ruang, []); assert.deepEqual(Object.keys(j.kuki), ["sesi_masuk"]);
  assert.equal(await n("instansi_sesi", `akun_id = '${d}'`), 0); assert.equal(await n("pdt_sesi", `akun_id = '${pd}'`), 0);
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
uji("peran U-17: keluar mencabut mk_sesi dan mengirim penghapus cookie semua sesi peran peramban ini; cookie instansi dihapus di kedua Path; sesi_admin tidak disentuh", async () => {
  const j = await login(14); catat(j.r);
  const kel = await catat(api("POST", "/api/masuk/keluar", {}, lengkap(j))); assert.equal(kel.s, 200);
  const baris = kel.h.getSetCookie(), hapus = nama => baris.filter(l => l.startsWith(nama + "=;") && /Max-Age=0/.test(l));
  assert.deepEqual(hapus("sesi_instansi").map(l => l.match(/Path=([^;]+)/)[1]).sort(), ["/api/instansi", "/instansi"], "dua Path");
  for (const nama of ["sesi_masuk", "sesi_pendataan", "sesi_kemitraan", "sesi_staf", "sesi_pemirsa"]) assert.equal(hapus(nama).length, 1, nama);
  assert.ok(!baris.some(l => l.startsWith("sesi_admin=")), "sesi_admin tidak disentuh");
  assert.equal(await n("mk_sesi", `token_sha = '${sha256(j.kuki.sesi_masuk)}'`), 0);
  assert.equal((await api("GET", "/api/masuk/saya", undefined, {cookie: "sesi_masuk=" + j.kuki.sesi_masuk})).s, 401);
  /* tanpa cookie apa pun: tetap 200 dan cookie penghapus */
  assert.equal((await catat(api("POST", "/api/masuk/keluar", {}, H()))).s, 200);
});

/* ---------------- U-35 ---------------- */
uji("peran U-35: nomor pemirsa hanya diisi Super Admin; kode tidak membuka sesi pemirsa (K25); pemirsa diputus tidak menerbitkan sesi", async () => {
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
  /* K25: pemirsa bernomor tidak lagi masuk lewat kode; masuk lewat sandi di /masuk */
  const j = await login(15); catat(j.r);
  assert.deepEqual(j.r.j.ruang, []); assert.ok(!j.kuki.sesi_pemirsa); assert.equal(await n("pemirsa_sesi", `pemirsa_id = '${pid}'`), 0);
  assert.equal((await api("POST", "/api/pemirsa/admin/" + pid, {aksi: "cabut"}, ADMIN)).s, 200);
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
uji("peran U-18: (K25) staf bernomor sama tidak mendapat sesi_staf dari kode dan tidak tampil di daftar ruang; username tidak keluar", async () => {
  STAF = await bikinStaf(16);
  const j = await login(16); catat(j.r);
  assert.deepEqual(j.r.j.ruang, []); assert.ok(!j.lines.some(l => l.startsWith("sesi_staf=")));
  assert.equal(await n("staf_sesi"), 0); assert.ok(!j.r.t.includes(STAF.username), "username tidak keluar");
  const r = await catat(api("POST", "/api/masuk/sandi", {sandi: STAF.sandi, staf: STAF.id}, lengkap(j)));
  assert.ok(r.s === 404 || r.s === 405, "sandi sesudah kode dicabut: " + r.s); assert.equal(await n("staf_sesi"), 0);
});

uji("peran U-19: tidak ada rute /api/masuk/* yang menerbitkan sesi_admin; akun rahasia tidak dicari lewat nomor", async () => {
  assert.ok(semuaCookie.length > 10, "ada cukup keluaran untuk diperiksa"); assert.ok(!semuaCookie.some(l => l.startsWith("sesi_admin=")), "tak satu pun jawaban /api/masuk/* membawa sesi_admin");
  /* sesi akun umum: sandi rahasia (AKUN_SITUS, ADMIN_TOKEN) tidak membuka apa pun lewat pintu ini */
  const j = await login(20); catat(j.r); const kuki = lengkap(j);
  for (const b of [{sandi: "sandi"}, {sandi: "rahasia-admin"}, {sandi: "sandi", staf: "gerbang@x"}, {sandi: "sandi-dummy", staf: "dirga@x"}]) {
    const r = await catat(api("POST", "/api/masuk/sandi", b, kuki)); assert.notEqual(r.s, 200, JSON.stringify(b)); assert.ok(!r.h.getSetCookie().length);
  }
  assert.ok(!semuaCookie.some(l => l.startsWith("sesi_admin=")));
  const sumber = ["src/masuk.js", "src/masuk_sesi.js", "src/masuk_konst.js"].map(f => readFileSync(path.join(AKAR, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")).join("\n");
  assert.ok(!/sesi_admin|buatSesi|adminOK|ADMIN_TOKEN|AKUN_SITUS/.test(sumber), "kode pintu masuk tidak menyentuh akun rahasia");
});
