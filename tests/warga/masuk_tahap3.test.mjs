/* Satu Pintu Masuk, tahap 3 (RENCANA-UJI U-30 sampai U-34) dan catatan pemeriksa PM-09 sampai PM-12: atur sandi sesudah kode, hapus akun umum, bukti ulang 180 hari,
   alun-alun mengenali akun yang masuk, kode lewat email; batas undangan per nomor, daftar undangan anggota, antrean tinjau staf berwilayah, putus sesi anggota dicabut.
   Worker utuh di workerd + D1 lokal (migrasi apa adanya); kode dibaca dari wa_antre, email ditangkap fixture outboundService (tanpa kirim sungguhan). Nomor uji hanya berawalan 62800. */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul rute mengimpornya balik (siklus)
import {hashSandi} from "../../src/pendataan.js";

const uji = berantai();
const ASAL = "http://bnpb.lokal", KUNCI = {MASUK_KUNCI: "kunci-masuk-uji-panjang-lebih-dari-32-karakter", TURNSTILE_SECRET: "ts-rahasia-uji", TURNSTILE_SITEKEY: "ts-situs-uji",
  EMAIL_API_KEY: "kunci-resend-uji", EMAIL_FROM: "Centurisk97 <masuk@contoh.id>"};
const surat = [];
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname === "challenges.cloudflare.com") return Response.json({success: (await req.formData()).get("response") === "ok"});
  if (u.hostname === "api.resend.com") { surat.push(await req.json()); return Response.json({id: "x" + surat.length}); }
  return new Response("diblok di uji", {status: 599});
};
const U = await siapkan("uji-masuk-tahap3", {ikat: KUNCI, luar});
const {DB, api, n} = U;

let ipN = 0;
const H = (tambah = {}) => ({"cf-connecting-ip": `10.6.${Math.floor(++ipN / 250)}.${ipN % 250}`, "x-pb": "1", origin: ASAL, ...tambah});
const nomor = i => `62800666${String(i).padStart(4, "0")}`, lokal = i => "0" + nomor(i).slice(2);
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const T0 = Date.now(), HARI = 864e5;
const kodeTerkirim = async i => (await DB.prepare("SELECT pesan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp' ORDER BY dibuat DESC LIMIT 1").bind(nomor(i)).first())?.pesan.match(/\b([0-9]{6})\b/)[1];
function jar(lines) {
  const kuki = {};
  for (const l of lines) { const [kv, ...a] = l.split(";"), k = kv.slice(0, kv.indexOf("=")), v = kv.slice(kv.indexOf("=") + 1); if (!/Max-Age=0/i.test(a.join(";"))) kuki[k] = v; else delete kuki[k]; }
  return {kuki, lines, cookie: Object.entries(kuki).map(([k, v]) => k + "=" + v).join("; ")};
}
async function login(i) {   // masuk lewat kode WA untuk nomor i
  await DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000").run();
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi LIKE 'masuk.%' AND kunci <> 'global'").run();
  assert.equal((await api("POST", "/api/masuk/kode", {wa: lokal(i), turnstile: "ok"}, H())).s, 200);
  const r = await api("POST", "/api/masuk/periksa", {wa: lokal(i), kode: await kodeTerkirim(i)}, H());
  assert.equal(r.s, 200, r.t);
  return {r, ...jar(r.h.getSetCookie())};
}
const dari = j => H({cookie: "sesi_masuk=" + j.kuki.sesi_masuk});
const bacaDari = j => ({cookie: "sesi_masuk=" + j.kuki.sesi_masuk, "cf-connecting-ip": H()["cf-connecting-ip"]});
const mkId = async i => (await DB.prepare("SELECT id FROM mk_akun WHERE wa = ?").bind(nomor(i)).first()).id;
let seq = 0;
const instansi = (o = {}) => { const id = id16(); seq++; return sisip("instansi_akun", {id, username: "akun" + id.slice(0, 8), jenis: "polres", tingkat: "kab", wilayah: "Pemerintah Kabupaten Contoh " + seq, kunci_wilayah: "k" + id,
  cakupan: '["62"]', prov: "62", kab: "Contoh", garam: "a".repeat(32), sandi_sha: "0".repeat(64), status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD",
  email: `b${id.slice(0, 6)}@contoh.go.id`, wa: nomor(9000 + seq), surat: 1, kartu: 1, wajib_ganti: 0, dibuat: T0, ...o}).then(() => id); };
const pendataan = (o = {}) => { const id = id16(); return sisip("pdt_akun", {id, username: "pdt" + id.slice(0, 8), nama: "Sari", jabatan: "Analis", unit: "pusdatin", email: `p${id.slice(0, 6)}@bnpb.go.id`, wa: nomor(0),
  garam: "a".repeat(32), sandi_hash: "0".repeat(64), status: "aktif", dibuat: T0, ...o}).then(() => id); };
const kontak = (o = {}) => { const id = id16(); return sisip("kontak_pemangku", {id, nama: "Pemangku Uji", jabatan: "Kepala", kategori: "polri", prov: "62", kab: "Contoh", wa: nomor(0), status: "aktif", dibuat: T0, diubah: T0, ...o}).then(() => id); };
const anggotaMk = (mk, akun, o = {}) => sisip("mk_anggota", {id: id16(), mk_id: mk, tabel: "instansi_akun", akun_id: akun, status: "aktif", jalur: "tinjau", rujukan: "uji", dibuat: T0, diubah: T0, ...o});
const akunMk = async (i, o = {}) => { const id = id16(); await sisip("mk_akun", {id, wa: nomor(i), status: "aktif", dibuat: T0, ...o}); return id; };
const snap = async t => JSON.stringify((await DB.prepare(`SELECT * FROM ${t} ORDER BY 1`).all()).results);
const bikinStaf = async (i, peran, wilayah) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf Uji " + i, nip: `1990${String(i).padStart(2, "0")}0012005`.padEnd(18, "7"), unit: "Pusdalops BNPB", email: `s${i}@bnpb.go.id`, wa: lokal(i), peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t); await DB.prepare("UPDATE staf SET wajib_ganti = 0 WHERE id = ?").bind(r.j.staf.id).run();
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, H()); assert.equal(m.s, 200, m.t);
  return {id: r.j.staf.id, h: H({cookie: m.h.getSetCookie().find(l => l.startsWith("sesi_staf=")).split(";")[0]})};
};
const tungguSurat = async (awal, ms = 3000) => { const t0 = Date.now(); while (surat.length <= awal && Date.now() - t0 < ms) await new Promise(r => setTimeout(r, 25)); return surat.length; };

/* ---------------- catatan pemeriksa ---------------- */
uji("tahap3 A1: undangan yang dicabut tidak dihitung ke batas per nomor; yang terkirim dihitung dan pesan 429 tidak memberi petunjuk tentang nomor itu", async () => {
  const tujuan = lokal(10), akun = [];
  for (let k = 0; k < 5; k++) akun.push(await instansi());
  for (let k = 0; k < 4; k++) {   // kirim lalu cabut empat kali ke akun yang sama: pengirim iseng tidak menutup jalan
    const u = await api("POST", "/api/masuk/undang", {wa: tujuan, akun_id: akun[0]}, H(ADMIN)); assert.equal(u.s, 201, "kirim ke-" + (k + 1) + ": " + u.t);
    assert.equal((await api("POST", "/api/masuk/undang/cabut/" + u.j.id, {}, H(ADMIN))).s, 200);
  }
  for (let k = 0; k < 3; k++) assert.equal((await api("POST", "/api/masuk/undang", {wa: tujuan, akun_id: akun[k + 1]}, H(ADMIN))).s, 201);
  const t = await api("POST", "/api/masuk/undang", {wa: tujuan, akun_id: akun[4]}, H(ADMIN));
  assert.equal(t.s, 429); assert.equal(t.j.galat, "Nomor ini belum bisa diundang sekarang. Coba lagi besok."); assert.ok(!t.t.includes(tujuan) && !/undangan/i.test(t.t));
});

uji("tahap3 A2: anggota biasa melihat undangannya sendiri walau 200 undangan orang lain lebih baru (saring di SQL sebelum batas)", async () => {
  const akun = await instansi(), mk = await akunMk(11, {nama: "Anggota Biasa"}); await anggotaMk(mk, akun);
  const j = await login(11), mine = id16();
  await sisip("mk_undang", {id: mine, wa: nomor(12), tabel: "instansi_akun", akun_id: akun, oleh_tabel: "mk_akun", oleh_id: mk, status: "terkirim", dibuat: T0 - 5 * HARI, habis: T0 + HARI});
  for (let k = 0; k < 205; k++) await sisip("mk_undang", {id: id16(), wa: nomor(2000 + k), tabel: "instansi_akun", akun_id: akun, oleh_tabel: "staf", oleh_id: "x".repeat(16), status: "terkirim", dibuat: T0 - k, habis: T0 + HARI});
  const g = await api("GET", "/api/masuk/undang?akun_id=" + akun, undefined, bacaDari(j)); assert.equal(g.s, 200, g.t);
  assert.deepEqual(g.j.undangan.map(x => x.id), [mine]); assert.equal(g.j.undangan[0].milikku, true);
});

uji("tahap3 A3 dan A6: staf berwilayah melihat akun di wilayahnya saja; baris membawa akun_id; ?akun_id= menyaring di SQL; id tidak sah 400", async () => {
  const a62 = await instansi({prov: "62", cakupan: '["62"]'}), a33 = await instansi({prov: "33", cakupan: '["33"]', kab: "Lain"});
  const m1 = await akunMk(20, {nama: "Pemohon Satu"}), m2 = await akunMk(21, {nama: "Pemohon Dua"}), m3 = await akunMk(22, {nama: "Pemohon Tiga"});
  await anggotaMk(m1, a62, {status: "menunggu"}); await anggotaMk(m2, a33, {status: "menunggu"}); await anggotaMk(m3, a62, {status: "menunggu"});
  const st = await bikinStaf(23, ["verifikator"], ["62"]);
  const t = await api("GET", "/api/masuk/anggota/tinjau", undefined, st.h); assert.equal(t.s, 200, t.t);
  assert.deepEqual(t.j.anggota.map(x => x.nama).sort(), ["Pemohon Satu", "Pemohon Tiga"], "akun wilayah lain tidak terlihat");
  assert.ok(t.j.anggota.every(x => x.akun_id === a62), "tiap baris membawa akun_id");
  const nas = await api("GET", "/api/masuk/anggota/tinjau", undefined, ADMIN); assert.ok(nas.j.anggota.some(x => x.akun_id === a33), "admin melihat semua");
  const saring = await api("GET", "/api/masuk/anggota/tinjau?akun_id=" + a33, undefined, ADMIN); assert.deepEqual(saring.j.anggota.map(x => x.akun_id), [a33]);
  assert.deepEqual((await api("GET", "/api/masuk/anggota/tinjau?akun_id=" + a33, undefined, st.h)).j.anggota, [], "staf berwilayah tidak bisa menyaring ke akun di luar haknya");
  assert.equal((await api("GET", "/api/masuk/anggota/tinjau?akun_id=bukan-id", undefined, ADMIN)).s, 400);
});

uji("tahap3 A5: cabut_sesi pada anggota yang SUDAH dicabut tetap memutus semua sesi akun itu; tanpa cabut_sesi 409; orang luar 404 seragam", async () => {
  const pemilik = 30, akun = await instansi({wa: nomor(pemilik)}), mk = await akunMk(31, {nama: "Anggota Dicabut"});
  await anggotaMk(mk, akun, {status: "dicabut"});
  const aid = (await DB.prepare("SELECT id FROM mk_anggota WHERE mk_id = ?").bind(mk).first()).id;
  await sisip("instansi_sesi", {token_sha: "a".repeat(64), akun_id: akun, dibuat: T0, kedaluwarsa: T0 + HARI});
  const jp = await login(pemilik), jl = await login(32);
  const cabut = (h, b) => api("POST", "/api/masuk/anggota/cabut/" + aid, b, h);
  assert.equal((await cabut(dari(jp), {})).s, 409, "tanpa cabut_sesi tetap 409"); assert.ok(await n("instansi_sesi", `akun_id = '${akun}'`) >= 2, "sesi sisip dan sesi dari kode pemilik");
  assert.equal((await cabut(dari(jl), {cabut_sesi: true})).s, 404, "orang luar"); assert.ok(await n("instansi_sesi", `akun_id = '${akun}'`) >= 2);
  const r = await cabut(dari(jp), {cabut_sesi: true}); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j, {ok: true, id: aid, status: "dicabut", sesi_semua_dicabut: true, sesi_lama_masih_hidup: false}); assert.equal(await n("instansi_sesi", `akun_id = '${akun}'`), 0);
  assert.equal((await DB.prepare("SELECT status FROM mk_anggota WHERE id = ?").bind(aid).first()).status, "dicabut");
});

/* ---------------- U-30 ---------------- */
uji("tahap3 U-30: atur sandi sesudah kode: pendataan dan kampus pilihan sendiri, instansi acak hanya untuk pemilik nomor; ditolak untuk anggota, staf, kode lama; sesi akun dicabut", async () => {
  const sandiBaru = (j, b) => api("POST", "/api/masuk/sandi_baru", b, dari(j));
  /* pendataan */
  const pd = await pendataan({wa: nomor(40)}), s1 = "sandi-baru-sepuluh";
  await sisip("pdt_sesi", {token_sha: "b".repeat(64), akun_id: pd, dibuat: T0, kedaluwarsa: T0 + HARI});
  const j = await login(40), sj = await api("GET", "/api/masuk/saya", undefined, bacaDari(j));
  assert.equal(sj.j.baru_kode, true); assert.deepEqual(sj.j.sandi.map(x => [x.jenis, x.pilih]), [["pendataan", pd]]); assert.equal(sj.j.anggota_n, 0);
  assert.equal((await sandiBaru(j, {jenis: "pendataan", sandi: "pendek"})).s, 400, "panjang minimum aturan modul");
  assert.equal((await api("POST", "/api/masuk/sandi_baru", {jenis: "pendataan", sandi: s1}, bacaDari(j))).s, 403, "tanpa x-pb dan Origin");
  assert.equal((await api("POST", "/api/masuk/sandi_baru", {jenis: "pendataan", sandi: s1}, H())).s, 401, "tanpa sesi");
  const ok = await sandiBaru(j, {jenis: "pendataan", sandi: s1}); assert.equal(ok.s, 200, ok.t); assert.deepEqual(ok.j, {ok: true});
  const b = await DB.prepare("SELECT garam, sandi_hash FROM pdt_akun WHERE id = ?").bind(pd).first(); assert.equal(b.sandi_hash, await hashSandi(b.garam, s1));
  assert.equal(await n("pdt_sesi", `akun_id = '${pd}'`), 0, "sesi lama dicabut");
  assert.equal((await api("POST", "/api/pendataan/masuk", {username: (await DB.prepare("SELECT username FROM pdt_akun WHERE id = ?").bind(pd).first()).username, sandi: s1}, H())).s, 200, "sandi baru berlaku");
  /* kampus */
  const ins = id16(), km = id16(); await sisip("institusi", {id: ins, nama: "Universitas Uji Sandi", jenis: "ptn", pic_nama: "Dosen Uji", dibuat: T0, diubah: T0});
  await sisip("km_akun", {id: km, institusi_id: ins, nama: "Dosen Uji", email: "d@contoh.ac.id", wa: nomor(41), status: "aktif", gagal: 4, kunci_sampai: T0 + HARI, dibuat: T0, diubah: T0});
  await sisip("km_sesi", {sha: "c".repeat(64), akun_id: km, dibuat: T0, sampai: T0 + HARI});
  const jk = await login(41); assert.equal((await sandiBaru(jk, {jenis: "kemitraan", sandi: s1})).s, 200);
  const k = await DB.prepare("SELECT gagal, kunci_sampai, sandi_sha, garam FROM km_akun WHERE id = ?").bind(km).first();
  assert.equal(k.gagal, 0); assert.equal(k.kunci_sampai, null); assert.equal(k.sandi_sha, await hashSandi(k.garam, s1)); assert.equal(await n("km_sesi", `akun_id = '${km}'`), 0);
  assert.equal(await n("km_jejak", `baris = '${km}' AND aksi = 'atur_sandi'`), 1);
  /* instansi: pemilik nomor akun (sandi acak server, tampil sekali); anggota biasa ditolak */
  const ia = await instansi({wa: nomor(42)}), lama = (await DB.prepare("SELECT sandi_sha FROM instansi_akun WHERE id = ?").bind(ia).first()).sandi_sha;
  await sisip("instansi_sesi", {token_sha: "d".repeat(64), akun_id: ia, dibuat: T0, kedaluwarsa: T0 + HARI});
  const jo = await login(42), sm = await api("GET", "/api/masuk/saya", undefined, bacaDari(jo)); assert.deepEqual(sm.j.sandi.map(x => x.jenis), ["instansi"]);
  const io = await sandiBaru(jo, {jenis: "instansi"}); assert.equal(io.s, 200, io.t); assert.match(io.j.sandi, /^[2-9A-HJ-NP-Za-km-z]{16}$/);
  assert.notEqual((await DB.prepare("SELECT sandi_sha FROM instansi_akun WHERE id = ?").bind(ia).first()).sandi_sha, lama); assert.equal(await n("instansi_sesi", `akun_id = '${ia}'`), 0);
  assert.equal(await n("instansi_jejak", `akun_id = '${ia}' AND aksi = 'ganti_sandi'`), 1);
  const mkA = await akunMk(43, {nama: "Anggota"}); await anggotaMk(mkA, ia); const ja = await login(43), sa = await api("GET", "/api/masuk/saya", undefined, bacaDari(ja));
  assert.deepEqual(sa.j.sandi, [], "anggota tidak melihat aksi"); assert.equal(sa.j.anggota_n, 1);
  assert.equal((await sandiBaru(ja, {jenis: "instansi"})).s, 403, "anggota bukan pemilik nomor akun");
  /* staf dan jenis lain: tidak pernah */
  const st = await bikinStaf(44, ["verifikator"], []), sebelum = await snap("staf"), js = await login(44);
  for (const jenis of ["staf", "pemirsa", "admin", "__proto__"]) assert.equal((await sandiBaru(js, {jenis, sandi: s1})).s, 400, jenis);
  for (const jenis of ["pendataan", "kemitraan", "instansi"]) assert.equal((await sandiBaru(js, {jenis, sandi: s1})).s, 403, "nomor staf tanpa akun jenis " + jenis);
  assert.equal(await snap("staf"), sebelum, "tabel staf tidak berubah");
  /* kode lebih dari 15 menit */
  await DB.prepare("UPDATE mk_sesi SET kode_pada = kode_pada - 16 * 60000 WHERE mk_id = ?").bind(await mkId(40)).run();
  assert.equal((await sandiBaru(j, {jenis: "pendataan", sandi: s1 + "x"})).s, 403);
  assert.equal((await api("GET", "/api/masuk/saya", undefined, bacaDari(j))).j.sandi, undefined, "aksi tidak ditawarkan");
  /* dua akun pendataan satu nomor: wajib pilih, id luar ditolak */
  const p1 = await pendataan({wa: nomor(45)}), p2 = await pendataan({wa: nomor(45)}), lain = await pendataan({wa: nomor(46)}), j2 = await login(45);
  assert.equal((await sandiBaru(j2, {jenis: "pendataan", sandi: s1})).s, 400); assert.equal((await sandiBaru(j2, {jenis: "pendataan", sandi: s1, pilih: lain})).s, 403);
  assert.equal((await sandiBaru(j2, {jenis: "pendataan", sandi: s1, pilih: p2})).s, 200); assert.ok(p1);
});

/* ---------------- U-31 ---------------- */
uji("tahap3 U-31: hapus akun umum membuang mk_akun, sesi, keanggotaan, penanda penulis, undangan terkirimnya; kiriman tetap tanpa nama pelaku; akun lembaga utuh; kode lama ditolak", async () => {
  const akun = await instansi(), mk = await akunMk(50, {nama: "Warga Hapus", prov: "62", kab: "Contoh", setuju_pdp: T0}); await anggotaMk(mk, akun);
  const j = await login(50), tulis = await api("POST", "/api/alun", {jenis: "tanya", judul: "Air bersih di mana?", teks: "Kami butuh air bersih.", bencana: "banjir", prov: "33", turnstile: "ok"}, dari(j));
  assert.equal(tulis.s, 201, tulis.t); assert.equal(await n("alun_penulis", `mk_id = '${mk}'`), 1);
  const uid = id16(); await sisip("mk_undang", {id: uid, wa: nomor(51), tabel: "instansi_akun", akun_id: akun, oleh_tabel: "mk_akun", oleh_id: mk, status: "terkirim", dibuat: T0, habis: T0 + HARI});
  await DB.prepare("INSERT INTO mk_masuk_log (id, mk_id, tabel, akun_id, waktu) VALUES (?, ?, 'instansi_akun', ?, ?)").bind(id16(), mk, akun, T0).run();
  const awalInstansi = await snap("instansi_akun");
  const hapus = (h, b) => api("POST", "/api/masuk/hapus", b, h);
  assert.equal((await hapus(dari(j), {})).s, 400, "tanpa yakin"); assert.equal((await hapus(dari(j), {yakin: "ya"})).s, 400); assert.equal((await hapus(H(), {yakin: true})).s, 401);
  assert.equal((await hapus(bacaDari(j), {yakin: true})).s, 403, "tanpa x-pb dan Origin");
  await DB.prepare("UPDATE mk_sesi SET kode_pada = kode_pada - 16 * 60000 WHERE mk_id = ?").bind(mk).run(); assert.equal((await hapus(dari(j), {yakin: true})).s, 403, "kode lebih dari 15 menit"); assert.equal(await n("mk_akun", `id = '${mk}'`), 1);
  const j2 = await login(50), log = await n("mk_masuk_log"), r = await hapus(dari(j2), {yakin: true}); assert.equal(r.s, 200, r.t);
  assert.ok(r.h.getSetCookie().some(l => l.startsWith("sesi_masuk=;") && /Max-Age=0/.test(l)), "cookie dihapus");
  for (const [t, w] of [["mk_akun", `id = '${mk}'`], ["mk_sesi", `mk_id = '${mk}'`], ["mk_anggota", `mk_id = '${mk}'`], ["alun_penulis", `mk_id = '${mk}'`], ["mk_undang", `id = '${uid}'`]]) assert.equal(await n(t, w), 0, t);
  assert.equal(await n("alun_utas", `id = '${tulis.j.id}'`), 1, "kiriman tetap ada"); assert.equal(await n("mk_masuk_log"), log, "log masuk tetap");
  const g = await api("GET", "/api/alun/" + tulis.j.id); assert.equal(g.s, 200); assert.ok(!("terverifikasi" in g.j) && !("label" in g.j), "tanpa nama pelaku");
  assert.equal(await snap("instansi_akun"), awalInstansi, "akun lembaga tidak terhapus"); assert.equal((await api("GET", "/api/masuk/saya", undefined, bacaDari(j2))).s, 401);
});

/* ---------------- U-32 ---------------- */
uji("tahap3 U-32: anggota yang 180 hari tidak masuk diperiksa ulang saat kode sah: kontak masih cocok tetap aktif, selain itu menunggu pemeriksaan", async () => {
  const a1 = await instansi(), a2 = await instansi(), a3 = await instansi(), a4 = await instansi(), lama = T0 - 200 * HARI, barusan = T0 - 10 * HARI;
  /* nomor 60: tak pernah masuk, dibuat 200 hari lalu, tanpa kontak -> menunggu; a4 dicatat masuk 10 hari lalu -> tetap aktif */
  const m = await akunMk(60, {nama: "Lama Sekali", dibuat: lama}); await anggotaMk(m, a1, {dibuat: lama}); await anggotaMk(m, a4, {dibuat: lama});
  await DB.prepare("INSERT INTO mk_masuk_log (id, mk_id, tabel, akun_id, waktu) VALUES (?, ?, 'instansi_akun', ?, ?)").bind(id16(), m, a4, barusan).run();
  /* nomor 61: lama, tetapi kontak pemangku aktif yang cocok -> tetap aktif */
  const m2 = await akunMk(61, {nama: "Kontak Cocok", dibuat: lama}); await anggotaMk(m2, a2, {dibuat: lama}); await kontak({wa: nomor(61)});
  /* nomor 62: masuk terakhir 200 hari lalu -> menunggu; nomor 63: keanggotaan baru -> tetap aktif */
  const m3 = await akunMk(62, {nama: "Log Lama", dibuat: lama}); await anggotaMk(m3, a3, {dibuat: lama});
  await DB.prepare("INSERT INTO mk_masuk_log (id, mk_id, tabel, akun_id, waktu) VALUES (?, ?, 'instansi_akun', ?, ?)").bind(id16(), m3, a3, lama).run();
  const m4 = await akunMk(63, {nama: "Baru Gabung"}); await anggotaMk(m4, a1, {dibuat: T0 - HARI});
  const st = async (mk, a) => (await DB.prepare("SELECT status, jalur, rujukan FROM mk_anggota WHERE mk_id = ? AND akun_id = ?").bind(mk, a).first());
  const j = await login(60);
  assert.equal((await st(m, a1)).status, "menunggu"); assert.equal((await st(m, a1)).jalur, "tinjau"); assert.equal((await st(m, a4)).status, "aktif");
  assert.deepEqual(j.r.j.ruang.filter(x => x.jenis === "instansi").map(x => x.lembaga + "|" + x.wilayah).length, 1, "hanya akun yang masih aktif tampil");
  assert.equal(j.r.j.menunggu.length, 1, "orang melihat Menunggu pemeriksaan");
  await login(61); assert.equal((await st(m2, a2)).status, "aktif", "kontak cocok");
  await login(62); assert.equal((await st(m3, a3)).status, "menunggu");
  await login(63); assert.equal((await st(m4, a1)).status, "aktif", "baru gabung tidak diperiksa");
  const saya = await api("GET", "/api/masuk/saya", undefined, bacaDari(j)); assert.equal(saya.j.menunggu.length, 1);
  assert.equal(await n("mk_anggota", `mk_id = '${m}' AND status = 'menunggu' AND rujukan = 'ulang'`), 1);
});

/* ---------------- U-33 ---------------- */
uji("tahap3 U-33: kiriman alun-alun dari akun yang masuk menulis alun_penulis dan tampil terverifikasi; tamu tetap bisa menulis tanpa baris itu; label hanya untuk tepat satu lembaga; diblokir 403", async () => {
  const isi = {jenis: "tanya", judul: "Posko di mana?", teks: "Ada posko dekat sini?", bencana: "banjir", prov: "33", kab: "Kabupaten Demak", turnstile: "ok"};
  const tamu = await api("POST", "/api/alun", isi, H()); assert.equal(tamu.s, 201, tamu.t); assert.equal(await n("alun_penulis", `pos_id = '${tamu.j.id}'`), 0);
  /* akun umum tanpa lembaga */
  await akunMk(70, {nama: "Sari Warga", prov: "33", kab: "Demak", setuju_pdp: T0}); const j = await login(70);
  const a = await api("POST", "/api/alun", isi, dari(j)); assert.equal(a.s, 201, a.t);
  const baris = await DB.prepare("SELECT mk_id, label FROM alun_penulis WHERE pos_id = ?").bind(a.j.id).first(); assert.deepEqual(baris, {mk_id: await mkId(70), label: null});
  assert.equal((await DB.prepare("SELECT nama FROM alun_utas WHERE id = ?").bind(a.j.id).first()).nama, null, "nama akun TIDAK otomatis masuk kolom nama publik (R2): kosong = NULL");
  assert.equal((await DB.prepare("SELECT nama FROM alun_utas WHERE id = ?").bind((await api("POST", "/api/alun", {...isi, nama: "Nama Ketik"}, dari(j))).j.id).first()).nama, "Nama Ketik");
  const rb = await api("POST", "/api/alun/balas/" + a.j.id, {teks: "Balasan saya", turnstile: "ok"}, dari(j)); assert.equal(rb.s, 201, rb.t); assert.equal(await n("alun_penulis", `pos_id = '${rb.j.id}'`), 1);
  const lg = await api("GET", "/api/alun?jenis=tanya"), pa = lg.j.utas.find(x => x.id === a.j.id), pt = lg.j.utas.find(x => x.id === tamu.j.id);
  assert.equal(pa.terverifikasi, true); assert.equal(pa.label, null); assert.ok(!("terverifikasi" in pt), "tamu tanpa tanda");
  assert.ok(!lg.t.includes(await mkId(70)) && !lg.t.includes(nomor(70)) && !lg.t.includes(lokal(70)), "tanpa mk_id dan nomor"); assert.ok(!lg.t.includes("Sari Warga") && pa.nama === null, "nama akun tidak ada di jawaban publik kecuali dikirim lewat isian");
  const rinci = await api("GET", "/api/alun/" + a.j.id); assert.equal(rinci.j.terverifikasi, true); assert.equal(rinci.j.balasan_daftar[0].terverifikasi, true);
  /* label: pemilik nomor satu akun lembaga aktif */
  const ia = await instansi({wa: nomor(71), wilayah: "BPBD Kabupaten Demak"}), j1 = await login(71);
  const b1 = await api("POST", "/api/alun", {...isi, nama: "Kepala Pelaksana"}, dari(j1)); assert.equal(b1.s, 201, b1.t);
  assert.equal((await DB.prepare("SELECT label FROM alun_penulis WHERE pos_id = ?").bind(b1.j.id).first()).label, "BPBD Kabupaten Demak");
  assert.equal((await api("GET", "/api/alun/" + b1.j.id)).j.label, "BPBD Kabupaten Demak");
  /* anggota aktif dua akun: tanpa label; satu akun: label; anggota yang menunggu: tanpa label */
  const m72 = await akunMk(72, {nama: "Anggota Dua"}); await anggotaMk(m72, ia); await anggotaMk(m72, await instansi({wilayah: "BPBD Lain"}));
  assert.equal((await DB.prepare("SELECT label FROM alun_penulis WHERE pos_id = ?").bind((await api("POST", "/api/alun", isi, dari(await login(72)))).j.id).first()).label, null);
  const m73 = await akunMk(73, {nama: "Anggota Satu"}); await anggotaMk(m73, ia);
  assert.equal((await DB.prepare("SELECT label FROM alun_penulis WHERE pos_id = ?").bind((await api("POST", "/api/alun", isi, dari(await login(73)))).j.id).first()).label, "BPBD Kabupaten Demak");
  const m74 = await akunMk(74, {nama: "Anggota Tunggu"}); await anggotaMk(m74, ia, {status: "menunggu"});
  assert.equal((await DB.prepare("SELECT label FROM alun_penulis WHERE pos_id = ?").bind((await api("POST", "/api/alun", isi, dari(await login(74)))).j.id).first()).label, null);
  /* diblokir: tidak menulis sebagai akun; tamu tetap bisa */
  await DB.prepare("UPDATE mk_akun SET status = 'diblokir' WHERE id = ?").bind(await mkId(70)).run();
  const awal = await n("alun_utas"); assert.equal((await api("POST", "/api/alun", isi, dari(j))).s, 403); assert.equal(await n("alun_utas"), awal);
  assert.equal((await api("POST", "/api/alun", isi, H())).s, 201);
  /* G2: laju dihitung SEBELUM sesi dibaca: akun diblokir dari IP yang sudah di batas mendapat 429, bukan 403 (bot tidak membebani D1 tanpa hitungan) */
  const ipB = {...dari(j), "cf-connecting-ip": "10.6.249.9"}; let s429 = 0;
  for (let k = 0; k < 8; k++) if ((await api("POST", "/api/alun", isi, ipB)).s === 429) s429++;
  assert.ok(s429 >= 1, "laju menang atas pembacaan sesi");
  const rbl = {...dari(j), "cf-connecting-ip": "10.6.249.10"}; let b429 = 0;
  for (let k = 0; k < 40; k++) if ((await api("POST", "/api/alun/balas/" + a.j.id, {teks: "balas", turnstile: "ok"}, rbl)).s === 429) b429++;
  assert.ok(b429 >= 1, "balas: laju sebelum SELECT utas dan sesi");
  /* rute contoh sudah tidak ada */
  for (const [m, p, b] of [["POST", "/api/alun/dummy", {aksi: "isi"}], ["POST", "/api/alun/dummy", {aksi: "isi"}, ADMIN]]) { const r = await api(m, p, b, b === ADMIN ? ADMIN : H()); assert.ok(r.s === 404 || r.s === 403 || r.s === 405, p + " " + r.s); }
  const mati = await api("POST", "/api/alun/dummy", {aksi: "isi"}, {...ADMIN, ...H()}); assert.notEqual(mati.s, 200); assert.equal(await n("alun_utas", "dummy = 1"), 0);
  /* baris contoh lama di produksi tidak tampil, tidak bisa dibalas, tidak bisa diteruskan */
  const lama = id16(); await sisip("alun_utas", {id: lama, jenis: "butuh_bantuan", judul: "Baris lama contoh", teks: "teks", bencana: "banjir", prov: "33", kab: "Kabupaten Demak", pemilik_sha: "0".repeat(64), bantuan: "terbuka", dibuat: T0, dummy: 1});
  assert.ok(!(await api("GET", "/api/alun")).t.includes(lama)); assert.equal((await api("GET", "/api/alun/" + lama, undefined, ADMIN)).s, 404); assert.equal((await api("GET", "/api/alun?dummy=1", undefined, ADMIN)).t.includes(lama), false);
  assert.ok(!(await api("GET", "/api/alun/admin?dummy=1", undefined, ADMIN)).t.includes(lama)); assert.equal((await api("POST", "/api/alun/balas/" + lama, {teks: "balas", turnstile: "ok"}, H())).s, 404);
  assert.equal((await api("POST", "/api/alun/admin/" + lama, {aksi: "teruskan_relawan", keahlian: "medis", jumlah: 2, mulai: "2030-01-01"}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/alun/upvote/" + lama, {}, H())).s, 404); assert.equal((await api("POST", "/api/alun/lapor/" + lama, {alasan: "spam", turnstile: "ok"}, H())).s, 404);
  assert.ok(!(await api("GET", "/api/alun/admin", undefined, ADMIN)).t.includes(lama), "daftar admin"); assert.equal((await api("GET", "/api/alun/" + lama)).s, 404, "rincian publik");
  assert.notEqual((await api("POST", "/api/alun/dummy", {aksi: "isi"}, {...ADMIN, ...H()})).s, 200, "rute contoh tidak ada"); assert.equal(await n("alun_utas", "dummy = 1"), 1, "baris lama tidak diubah");
  /* tabel alun_penulis belum ada: alun-alun tetap jalan tanpa tanda */
  await DB.prepare("DROP TABLE alun_penulis").run();
  const tanpa = await api("POST", "/api/alun", isi, dari(j1)); assert.equal(tanpa.s, 201, tanpa.t); const lg2 = await api("GET", "/api/alun"); assert.equal(lg2.s, 200); assert.ok(!lg2.t.includes("terverifikasi"));
});

/* ---------------- U-34 ---------------- */
uji("tahap3 U-34: kode lewat email: jawaban sama untuk alamat cocok dan tidak; hanya alamat cocok memicu kiriman; kode diterima periksa; staf tetap diminta sandi; laju dan Turnstile", async () => {
  const minta = (b, h = H()) => api("POST", "/api/masuk/kode_email", {turnstile: "ok", ...b}, h);
  await pendataan({wa: nomor(80), email: "Dinas.Uji@Contoh.id"});
  const awal = surat.length, sama = await minta({wa: lokal(80), email: "dinas.uji@contoh.id"});
  assert.equal(sama.s, 200, sama.t); assert.deepEqual(sama.j, {ok: true, tunggu: 60}); assert.equal(await tungguSurat(awal), awal + 1);
  const mail = surat[awal]; assert.deepEqual(mail.to, ["dinas.uji@contoh.id"]); const kode = mail.text.match(/\b(\d{6})\b/)[1]; assert.match(mail.text, /5 menit/); assert.ok(!/https?:/.test(mail.text), "tanpa tautan");
  /* alamat lain, nomor lain, nomor tanpa akun: persis sama, tanpa kiriman */
  const sebelum = surat.length;
  for (const b of [{wa: lokal(80), email: "orang.lain@contoh.id"}, {wa: lokal(81), email: "dinas.uji@contoh.id"}, {wa: lokal(82), email: "tidak.ada@contoh.id"}]) {
    const r = await minta(b); assert.equal(r.s, sama.s); assert.deepEqual(r.j, sama.j, JSON.stringify(b)); assert.equal(r.h.get("content-type"), sama.h.get("content-type"));
  }
  await new Promise(r => setTimeout(r, 150)); assert.equal(surat.length, sebelum, "tidak ada email untuk alamat yang tidak cocok");
  assert.ok(!sama.t.includes(kode), "kode tidak ada di jawaban");
  /* kode dari email diterima periksa untuk NOMOR itu */
  const salah = await api("POST", "/api/masuk/periksa", {wa: lokal(80), kode: kode === "000000" ? "000001" : "000000"}, H()); assert.equal(salah.s, 400);
  const r = await api("POST", "/api/masuk/periksa", {wa: lokal(80), kode}, H()); assert.equal(r.s, 200, r.t); assert.equal(r.j.lewat, "email"); assert.deepEqual(r.j.ruang.map(x => x.jenis), ["pendataan"]);
  assert.ok(r.h.getSetCookie().some(l => l.startsWith("sesi_pendataan=")), "sesi peran akun yang cocok"); assert.ok(!r.h.getSetCookie().some(l => l.startsWith("sesi_masuk=")), "tanpa sesi akun umum"); assert.equal(await n("mk_akun", `wa = '${nomor(80)}'`), 0, "tidak membuat mk_akun");
  assert.equal((await api("POST", "/api/masuk/periksa", {wa: lokal(80), kode}, H())).s, 400, "sekali pakai");
  /* kode di D1 hanya HMAC, tanpa alamat email */
  assert.ok(!(await snap("mk_kode")).includes("dinas.uji"));
  /* staf: email cocok memberi kode, tetapi sesi staf tetap butuh sandi */
  const st = await bikinStaf(83, ["verifikator"], []); const emailStaf = "s83@bnpb.go.id", a2 = surat.length;
  assert.equal((await minta({wa: lokal(83), email: emailStaf})).s, 200); await tungguSurat(a2);
  const js = await api("POST", "/api/masuk/periksa", {wa: lokal(83), kode: surat[a2].text.match(/\b(\d{6})\b/)[1]}, H()); assert.equal(js.s, 200, js.t);
  assert.deepEqual(js.j.ruang.map(x => [x.jenis, x.butuh_sandi, x.ke]), [["staf", true, "/admin/masuk"]], "staf lewat email: pintu sandi lama"); assert.ok(!js.h.getSetCookie().some(l => /^sesi_(staf|masuk)=/.test(l)), "tanpa sesi_staf dan sesi_masuk"); assert.ok(st.id);
  /* penjaga, Turnstile, bentuk, laju */
  assert.equal((await minta({wa: lokal(80), email: "dinas.uji@contoh.id"}, {"cf-connecting-ip": "10.6.250.1"})).s, 403, "tanpa x-pb");
  assert.equal((await minta({wa: lokal(80), email: "dinas.uji@contoh.id", turnstile: "salah"})).s, 403);
  assert.equal((await minta({wa: "bukan nomor", email: "a@contoh.id"})).s, 400); assert.equal((await minta({wa: lokal(80), email: "bukan-email"})).s, 400);
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi LIKE 'masuk.%'").run();
  const ipTetap = () => H(); let terakhir;
  for (let k = 0; k < 4; k++) terakhir = await minta({wa: lokal(84), email: k % 2 ? "a@contoh.id" : "b@contoh.id"}, ipTetap());
  assert.equal(terakhir.s, 429, "laju per nomor dihitung untuk semua permintaan, alamat cocok atau tidak");
  /* pengirim email belum aktif */
  const V = await siapkan("uji-masuk-tahap3-tanpa-email", {ikat: {...KUNCI, EMAIL_API_KEY: ""}, luar});
  const x = await V.api("POST", "/api/masuk/kode_email", {wa: lokal(80), email: "a@contoh.id", turnstile: "ok"}, H()); assert.equal(x.s, 503); assert.match(x.j.galat, /belum aktif/);
});

uji("tahap3 saya lunak: ?lunak=1 tanpa sesi menjawab 200 {masuk:false} (pemeriksaan diam-diam halaman lain), tanpa lunak tetap 401", async () => {
  const a = await api("GET", "/api/masuk/saya?lunak=1"); assert.equal(a.s, 200); assert.deepEqual(a.j, {masuk: false});
  assert.equal((await api("GET", "/api/masuk/saya")).s, 401);
  const j = await login(90); assert.equal((await api("GET", "/api/masuk/saya?lunak=1", undefined, bacaDari(j))).j.akun.id, await mkId(90), "dengan sesi jawaban penuh");
});

uji("tahap3 S1 (D21): kode email hanya membuka akun yang emailnya cocok: akun pendataan penyerang bernomor korban tidak membuka akun instansi korban; tanpa sesi_masuk, tanpa mk_akun, tanpa log", async () => {
  const korban = await instansi({wa: nomor(95), email: "kepala@bpbd.contoh.go.id"}), penyerang = await pendataan({wa: nomor(95), email: "penyerang@contoh.id"});
  const awal = surat.length, awalAkun = await n("mk_akun"), awalLog = await n("mk_masuk_log"), awalSesi = await n("instansi_sesi");
  const minta = await api("POST", "/api/masuk/kode_email", {wa: lokal(95), email: "penyerang@contoh.id", turnstile: "ok"}, H()); assert.equal(minta.s, 200);
  await tungguSurat(awal); const kode = surat[awal].text.match(/\b(\d{6})\b/)[1];
  assert.deepEqual((await DB.prepare("SELECT tabel, akun_id FROM mk_kode_akun").all()).results.filter(x => x.akun_id === penyerang || x.akun_id === korban), [{tabel: "pdt_akun", akun_id: penyerang}], "ikatan hanya ke akun yang cocok");
  const r = await api("POST", "/api/masuk/periksa", {wa: lokal(95), kode}, H()); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.ruang.map(x => x.jenis), ["pendataan"]); const kuki = r.h.getSetCookie().map(l => l.split("=")[0]);
  assert.deepEqual(kuki, ["sesi_pendataan"], "hanya sesi peran akun yang cocok"); assert.equal(await n("instansi_sesi"), awalSesi, "tidak ada sesi instansi korban");
  assert.equal(await n("mk_akun"), awalAkun); assert.equal(await n("mk_masuk_log"), awalLog); assert.equal(await n("mk_kode_akun"), 0, "ikatan habis dipakai");
  assert.equal((await api("POST", "/api/masuk/periksa", {wa: lokal(95), kode}, H())).s, 400, "sekali pakai");
  /* kode WA milik pemegang nomor tetap membuka semuanya seperti biasa */
  const j = await login(95); assert.deepEqual(j.r.j.ruang.map(x => x.jenis).sort(), ["instansi", "pendataan"]); assert.ok(j.kuki.sesi_masuk);
  /* dua akun cocok: keduanya terikat; satu sesi per modul */
  const p2 = await pendataan({wa: nomor(96), email: "sama@contoh.id"}), i2 = await instansi({wa: nomor(96), email: "sama@contoh.id"}); const a2 = surat.length;
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi LIKE 'masuk.%'").run();
  await api("POST", "/api/masuk/kode_email", {wa: lokal(96), email: "sama@contoh.id", turnstile: "ok"}, H()); await tungguSurat(a2);
  assert.equal(await n("mk_kode_akun", `akun_id IN ('${p2}', '${i2}')`), 2);
  const r2 = await api("POST", "/api/masuk/periksa", {wa: lokal(96), kode: surat[a2].text.match(/\b(\d{6})\b/)[1]}, H()); assert.deepEqual(r2.j.ruang.map(x => x.jenis).sort(), ["instansi", "pendataan"]);
});

uji("tahap3 G1: tamu tanpa cookie tidak menyentuh D1 (400 kali tetap 200, laju_bnpb tidak bertambah); dengan cookie berbentuk sah (palsu pun) dibatasi 300 per jam per alamat, juga ?lunak=1", async () => {
  const h = {"cf-connecting-ip": "10.6.248.76"}, awal = await n("laju_bnpb", "aksi = 'masuk.saya_ip'");
  for (let k = 0; k < 400; k++) { const r = await api("GET", "/api/masuk/saya?lunak=1", undefined, h); assert.equal(r.s, 200); assert.deepEqual(r.j, {masuk: false}); }
  assert.equal((await api("GET", "/api/masuk/saya", undefined, h)).s, 401); assert.equal(await n("laju_bnpb", "aksi = 'masuk.saya_ip'"), awal, "tanpa baris laju untuk tamu");
  const c = {...h, "cf-connecting-ip": "10.6.248.77", cookie: "sesi_masuk=" + "a".repeat(64)}; let t = 0, pertama = 0;
  for (let k = 0; k < 305; k++) { const r = await api("GET", k % 2 ? "/api/masuk/saya?lunak=1" : "/api/masuk/saya", undefined, c); if (r.s === 429) { t++; pertama ||= k + 1; } }
  assert.equal(pertama, 301, "permintaan ke-301 ditolak"); assert.equal(t, 5);
});
