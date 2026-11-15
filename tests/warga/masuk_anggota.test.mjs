/* Satu Pintu Masuk, PM-09 sampai PM-12 (RENCANA-UJI U-22 sampai U-29): anggota dan aktif otomatis, email dinas terpetakan, undangan berantai, papan aktivasi, antrean tinjau.
   Worker utuh di workerd + D1 lokal sungguhan (migrasi apa adanya); kode dibaca dari wa_antre seperti gerbang WA, email ditangkap fixture outboundService (tanpa kirim sungguhan).
   Turnstile dijawab fixture (token "ok" sah). Nomor uji hanya berawalan 62800. */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {siapkan, berantai, ADMIN, GERBANG} from "./_bnpb.mjs";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";   // worker dulu: modul rute mengimpornya balik (siklus)
import {PROV} from "../../src/instansi.js";
import {hashSandi} from "../../src/pendataan.js";

const uji = berantai();
const ASAL = "http://bnpb.lokal", KUNCI = {MASUK_KUNCI: "kunci-masuk-uji-panjang-lebih-dari-32-karakter", TURNSTILE_SECRET: "ts-rahasia-uji", TURNSTILE_SITEKEY: "ts-situs-uji",
  EMAIL_API_KEY: "kunci-resend-uji", EMAIL_FROM: "Centurisk97 <masuk@contoh.id>"};
const surat = []; let resendGagal = false;
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname === "challenges.cloudflare.com") return Response.json({success: (await req.formData()).get("response") === "ok"});
  if (u.hostname === "api.resend.com") { const b = await req.json(); if (resendGagal) return new Response("gagal", {status: 500}); surat.push(b); return Response.json({id: "x" + surat.length}); }
  return new Response("diblok di uji", {status: 599});
};
const U = await siapkan("uji-masuk-anggota", {ikat: KUNCI, luar});
const {DB, api, n} = U;

let ipN = 0;
const H = (tambah = {}) => ({"cf-connecting-ip": `10.8.${Math.floor(++ipN / 250)}.${ipN % 250}`, "x-pb": "1", origin: ASAL, ...tambah});
const nomor = i => `62800777${String(i).padStart(4, "0")}`, lokal = i => "0" + nomor(i).slice(2);
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const T0 = Date.now(), HARI = 864e5;
const kodeTerkirim = async i => (await DB.prepare("SELECT pesan FROM wa_antre WHERE tujuan = ? AND jenis = 'otp' ORDER BY dibuat DESC LIMIT 1").bind(nomor(i)).first())?.pesan.match(/\b([0-9]{6})\b/)[1];
async function login(i) {   // masuk lewat kode untuk nomor i; {r, kuki, lines, cookie}
  await DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000").run();
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi LIKE 'masuk.%' AND kunci <> 'global'").run();
  assert.equal((await api("POST", "/api/masuk/kode", {wa: lokal(i), turnstile: "ok"}, H())).s, 200);
  const r = await api("POST", "/api/masuk/periksa", {wa: lokal(i), kode: await kodeTerkirim(i)}, H());
  assert.equal(r.s, 200, r.t);
  return {r, ...jar(r.h.getSetCookie())};
}
function jar(lines) {
  const kuki = {};
  for (const l of lines) { const [kv, ...a] = l.split(";"), k = kv.slice(0, kv.indexOf("=")), v = kv.slice(kv.indexOf("=") + 1); if (!/Max-Age=0/i.test(a.join(";"))) kuki[k] = v; else delete kuki[k]; }
  return {kuki, lines, cookie: Object.entries(kuki).map(([k, v]) => k + "=" + v).join("; ")};
}
const dari = j => H({cookie: "sesi_masuk=" + j.kuki.sesi_masuk});   // POST bercookie: Origin sama situs dan x-pb
const bacaDari = j => ({cookie: "sesi_masuk=" + j.kuki.sesi_masuk, "cf-connecting-ip": H()["cf-connecting-ip"]});
const mkId = async i => (await DB.prepare("SELECT id FROM mk_akun WHERE wa = ?").bind(nomor(i)).first()).id;

const PUSAT = JSON.parse(readFileSync(path.join(AKAR, "public/banjir/data/pusat_kec.json"), "utf8"));
const KAB_62 = [...new Set(Object.keys(PUSAT).filter(k => k.startsWith("62|")).map(k => k.split("|")[1]))].sort();
let seq = 0;
const instansi = (o = {}) => { const id = id16(); seq++; return sisip("instansi_akun", {id, username: "akun" + id.slice(0, 8), jenis: "pemkab", tingkat: "kab", wilayah: "Pemerintah Kabupaten " + (o.kab ?? "Contoh"), kunci_wilayah: "k" + id,
  cakupan: '["62"]', prov: "62", kab: "Contoh", garam: "a".repeat(32), sandi_sha: "0".repeat(64), status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD",
  email: `b${id.slice(0, 6)}@contoh.go.id`, wa: nomor(9000 + seq), surat: 1, kartu: 1, wajib_ganti: 0, dibuat: T0, ...o}).then(() => id); };
const pendataan = (o = {}) => { const id = id16(); return sisip("pdt_akun", {id, username: "pdt" + id.slice(0, 8), nama: "Sari", jabatan: "Analis", unit: "pusdatin", email: `p${id.slice(0, 6)}@bnpb.go.id`, wa: nomor(0),
  garam: "a".repeat(32), sandi_hash: "0".repeat(64), status: "menunggu", dibuat: T0, ...o}).then(() => id); };
const kontak = (o = {}) => { const id = id16(); return sisip("kontak_pemangku", {id, nama: "Pemangku Uji", jabatan: "Kepala", kategori: "bpbd", prov: "62", kab: "Contoh", wa: nomor(0), status: "aktif", dibuat: T0, diubah: T0, ...o}).then(() => id); };
const snapInstansi = async () => JSON.stringify((await DB.prepare("SELECT * FROM instansi_akun ORDER BY id").all()).results);
const anggota = (i, akun) => DB.prepare("SELECT status, jalur, rujukan, oleh FROM mk_anggota WHERE mk_id = (SELECT id FROM mk_akun WHERE wa = ?) AND akun_id = ?").bind(nomor(i), akun).first();
const mohon = (j, akun, jenis = "instansi") => api("POST", "/api/masuk/mohon", {jenis, akun_id: akun}, dari(j));
const sesiInstansi = r => r.h.getSetCookie().filter(l => l.startsWith("sesi_instansi="));

/* ---------------- U-22 ---------------- */
uji("anggota U-22: nomor di kontak pemangku aktif (kategori dan wilayah cocok), akun aktif: anggota aktif jalur kontak, sesi instansi terbit, idempoten", async () => {
  const akun = await instansi({wa: nomor(1)}), kid = await kontak({wa: nomor(20)});
  await kontak({wa: nomor(21), kategori: "polri"});   // kategori polri tidak membuka akun pemkab
  const j = await login(20), awal = await snapInstansi();
  const r = await mohon(j, akun);
  assert.equal(r.s, 200, r.t); assert.equal(r.j.status, "aktif"); assert.equal(r.j.jalur, "kontak"); assert.equal(r.j.ke, "/instansi");
  const ci = sesiInstansi(r); assert.equal(ci.length, 2); assert.deepEqual(ci.map(l => l.match(/Path=([^;]+)/)[1]).sort(), ["/api/instansi", "/instansi"]);
  const a = await anggota(20, akun); assert.equal(a.status, "aktif"); assert.equal(a.jalur, "kontak"); assert.equal(a.rujukan, "kontak:" + kid);
  const saya = await api("GET", "/api/instansi/saya", undefined, {cookie: ci[0].split(";")[0]}); assert.equal(saya.s, 200, saya.t); assert.equal(saya.j.akun.id, akun);
  assert.equal(await n("mk_masuk_log", `akun_id = '${akun}'`), 1);
  assert.equal((await mohon(j, akun)).s, 200); assert.equal(await n("mk_anggota", `akun_id = '${akun}'`), 1, "idempoten per (orang, akun)");
  assert.equal(await snapInstansi(), awal, "tidak ada baris instansi_akun yang dibuat atau diubah");
  /* kategori tidak cocok: menunggu */
  const j2 = await login(21), r2 = await mohon(j2, akun); assert.equal(r2.j.status, "menunggu"); assert.equal(sesiInstansi(r2).length, 0);
  /* daftar ruang berikutnya memuat akun itu tanpa kode lain */
  const j3 = await login(20); assert.equal(j3.r.j.ruang.filter(x => x.jenis === "instansi").length, 1);
});

/* ---------------- U-23 ---------------- */
uji("anggota U-23: ajudan, kontak menunggu, wilayah beda, akun belum aktif, dan tanpa kontak: menunggu; instansi_akun tidak berubah; batas menunggu dan dicabut", async () => {
  const akun = await instansi({wa: nomor(2)}), belum = await instansi({wa: null, status: "belum_klaim", nama: null, nip: null, jabatan: null, unit: null, email: null, surat: 0, kartu: 0});
  const kasus = [[30, async () => kontak({wa: nomor(99), ajudan: "Ajudan Uji", ajudan_wa: nomor(30)}), akun, "ajudan_wa tidak mengaktifkan"],
    [31, async () => kontak({wa: nomor(31), status: "menunggu", setuju_pdp: T0}), akun, "kontak menunggu"],
    [32, async () => kontak({wa: nomor(32), kab: "Lain"}), akun, "wilayah beda"],
    [33, async () => kontak({wa: nomor(33)}), belum, "akun belum aktif"],
    [34, async () => null, akun, "tanpa kontak"]];
  const awal = await snapInstansi();
  for (const [i, buat, tujuan, ket] of kasus) {
    await buat(); const j = await login(i), r = await mohon(j, tujuan);
    assert.equal(r.s, 200, ket + ": " + r.t); assert.equal(r.j.status, "menunggu", ket); assert.equal(sesiInstansi(r).length, 0, ket);
    const a = await anggota(i, tujuan); assert.equal(a.status, "menunggu", ket); assert.equal(a.jalur, "tinjau", ket);
  }
  assert.equal(await snapInstansi(), awal, "tidak ada baris instansi_akun yang dibuat atau diubah");
  /* akun tidak ada, bukan akun lembaga, dan masukan liar */
  const j = await login(34);
  assert.equal((await mohon(j, id16())).s, 404); assert.equal((await api("POST", "/api/masuk/mohon", {jenis: "instansi", akun_id: "x"}, dari(j))).s, 400);
  assert.equal((await api("POST", "/api/masuk/mohon", {jenis: "staf", akun_id: akun}, dari(j))).s, 400);
  assert.equal((await api("POST", "/api/masuk/mohon", {jenis: "instansi", akun_id: akun})).s, 403, "tanpa x-pb dan origin");
  assert.equal((await api("POST", "/api/masuk/mohon", {jenis: "instansi", akun_id: akun}, H())).s, 401, "tanpa sesi akun umum");
  /* batas menunggu per akun umum */
  const banyak = await login(35);
  for (let k = 0; k < 5; k++) assert.equal((await mohon(banyak, await instansi({wa: nomor(9500 + k)}))).s, 200);
  assert.equal((await mohon(banyak, await instansi({wa: nomor(9600)}))).s, 429);
  /* dicabut tidak bisa mengaktifkan diri lewat kontak */
  await kontak({wa: nomor(36)}); const j36 = await login(36), a36 = await instansi({wa: nomor(9700)}); await kontak({wa: nomor(36), kab: "Contoh"});
  assert.equal((await mohon(j36, a36)).j.status, "aktif");
  await DB.prepare("UPDATE mk_anggota SET status = 'dicabut' WHERE mk_id = ? AND akun_id = ?").bind(await mkId(36), a36).run();
  assert.equal((await mohon(j36, a36)).s, 403);
  /* pemilik nomor akun masuk tanpa baris anggota */
  const jp = await login(2), rp = await mohon(jp, akun); assert.equal(rp.j.status, "aktif"); assert.equal(rp.j.jalur, "pemilik"); assert.equal(await n("mk_anggota", `akun_id = '${akun}' AND mk_id = '${await mkId(2)}'`), 0);
});

/* ---------------- U-24 (D19) ---------------- */
uji("anggota U-24: pintu ini TIDAK PERNAH mengubah pdt_akun (kontak bnpb atau undangan staf hanya jadi tanda di antrean); serangan nomor korban gagal", async () => {
  const p1 = await pendataan({wa: nomor(40)}), p2 = await pendataan({wa: nomor(41)}), snap = async () => JSON.stringify((await DB.prepare("SELECT * FROM pdt_akun ORDER BY id").all()).results);
  await kontak({wa: nomor(40), kategori: "bnpb", prov: null, kab: null});
  const u = await api("POST", "/api/masuk/undang", {wa: lokal(41), nama: "Rekan Pusdatin", ke: "pendataan"}, H(ADMIN)); assert.equal(u.s, 201, u.t);
  const awal = await snap(); const j40 = await login(40); await login(41);
  assert.equal(await snap(), awal, "status dan isi pdt_akun tidak berubah");
  assert.equal((await DB.prepare("SELECT status FROM mk_undang WHERE id = ?").bind(u.j.id).first()).status, "terkirim", "undangan tetap berlaku sampai kedaluwarsa");
  assert.equal((await api("POST", "/api/masuk/mohon", {jenis: "pendataan"}, dari(j40))).s, 400, "tidak ada jalur pendataan di pintu ini");
  const rg = await api("GET", "/api/pendataan/admin/ringkas", undefined, ADMIN); assert.equal(rg.s, 200, rg.t);
  const a1 = rg.j.akun.find(x => x.id === p1), a2 = rg.j.akun.find(x => x.id === p2);
  assert.deepEqual([a1.cocok_kontak, a1.nomor_terbukti, a1.diundang_staf], [true, true, false]); assert.deepEqual([a2.cocok_kontak, a2.nomor_terbukti, a2.diundang_staf], [false, true, true]);
  /* serangan: pihak lain mendaftar dengan nomor korban dan sandi sendiri; korban masuk lewat kode; akun tetap menunggu dan sandi penyerang ditolak */
  const garam = "b".repeat(32), jahat = id16();
  await pendataan({id: jahat, username: "penyerang" + jahat.slice(0, 5), wa: nomor(44), garam, sandi_hash: await hashSandi(garam, "sandi-penyerang-panjang")});
  await kontak({wa: nomor(44), kategori: "bnpb", prov: null, kab: null}); await api("POST", "/api/masuk/undang", {wa: lokal(44), ke: "pendataan"}, H(ADMIN));
  await login(44);
  assert.equal((await DB.prepare("SELECT status FROM pdt_akun WHERE id = ?").bind(jahat).first()).status, "menunggu");
  const m = await api("POST", "/api/pendataan/masuk", {username: "penyerang" + jahat.slice(0, 5), sandi: "sandi-penyerang-panjang"}, H()); assert.equal(m.s, 403, m.t); assert.ok(!m.h.getSetCookie().length);
});

/* ---------------- U-25 ---------------- */
uji("anggota U-25: email dinas terpetakan: kode sekali pakai ke domain yang dipetakan admin, akhiran berbatas titik, .go.id tanpa peta ditolak, email tidak disimpan", async () => {
  const akun = await instansi({wa: nomor(3)}), lain = await instansi({wa: nomor(4)}), awal = await snapInstansi();
  const peta = (domain, h = H(ADMIN), id = akun, aksi = "tambah") => api("POST", "/api/masuk/domain", {aksi, domain, akun_id: id}, h);
  assert.equal((await peta("bpbd.contoh.go.id", H())).s, 403, "tamu"); assert.equal((await peta("bpbd.contoh.go.id", H(GERBANG))).s, 403, "akun gerbang situs bukan admin");
  for (const d of ["go.id", "ac.id", "gmail.com", "mail.gmail.com", "id", "x", "bpbd contoh.go.id"]) assert.equal((await peta(d)).s, 400, d);
  assert.equal((await peta("bpbd.contoh.go.id", H(ADMIN), id16())).s, 404, "akun tidak ada"); assert.equal((await peta("bpbd.contoh.go.id", H(ADMIN), akun, "ubah")).s, 400);
  assert.equal((await peta("BPBD.Contoh.go.id")).s, 201); assert.equal(await n("mk_domain", `domain = 'bpbd.contoh.go.id' AND akun_id = '${akun}'`), 1);
  const j = await login(50); surat.length = 0;
  const minta = (email, id = akun, h = dari(j)) => api("POST", "/api/masuk/email", {akun_id: id, email}, h);
  assert.equal((await minta("a@xbpbd.contoh.go.id")).s, 400, "xgo.id bukan akhiran berbatas titik"); assert.equal((await minta("a@contoh.go.id")).s, 400, "induk dari domain terpetakan tidak ikut");
  assert.equal((await minta("a@lain.go.id")).s, 400, ".go.id tanpa peta ditolak"); assert.equal((await minta("a@bpbd.contoh.go.id", lain)).s, 400, "dipetakan ke akun lain");
  for (const e of ["a@bpbd.contoh.go.id.evil.com", "a@bpbd.contoh.go.id.", "a@xn--bpbd-9ua.contoh.go.id", "a@bpbd.cöntoh.go.id", "a@bpbd.contoh.go.id@evil.com"]) assert.equal((await minta(e)).s, 400, e);
  assert.equal(surat.length, 0);
  assert.equal((await minta("bukan-email")).s, 400); assert.equal((await api("POST", "/api/masuk/email", {akun_id: akun, email: "a@bpbd.contoh.go.id"}, H())).s, 401);
  assert.equal(surat.length, 0, "tidak ada email keluar untuk yang ditolak");
  assert.equal((await minta("a+tag@BPBD.contoh.go.id")).s, 200, "plus-tag dan huruf besar diterima bila domain terpetakan"); await DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000").run(); surat.length = 0;
  const m = await minta("Rekan@Unit.BPBD.contoh.go.id"); assert.equal(m.s, 200, m.t); assert.equal(surat.length, 1); assert.deepEqual(surat[0].to, ["rekan@unit.bpbd.contoh.go.id"]);
  const kode = surat[0].text.match(/\b([0-9]{6})\b/)[1]; assert.ok(!m.t.includes(kode), "kode tidak ada di jawaban");
  const k = await DB.prepare("SELECT saluran, nomor_sha, kode_sha FROM mk_kode WHERE saluran = 'email'").first(); assert.ok(k && !JSON.stringify(k).includes("rekan@"), "alamat tidak tersimpan terang");
  assert.equal(await n("wa_antre", `tujuan = '${nomor(50)}'`), 0 + await n("wa_antre", `tujuan = '${nomor(50)}' AND jenis = 'otp'`));
  assert.equal((await minta("rekan@unit.bpbd.contoh.go.id")).s, 429, "jeda kirim ulang");
  const periksa = (kodeX, email = "rekan@unit.bpbd.contoh.go.id", id = akun) => api("POST", "/api/masuk/email/periksa", {akun_id: id, email, kode: kodeX}, dari(j));
  assert.equal((await periksa(kode === "000000" ? "111111" : "000000")).s, 400); assert.equal((await periksa(kode, "orang-lain@unit.bpbd.contoh.go.id")).s, 400, "kode terikat pada alamat");
  const ok = await periksa(kode); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.status, "aktif"); assert.equal(sesiInstansi(ok).length, 2);
  const a = await anggota(50, akun); assert.equal(a.jalur, "email"); assert.equal(a.rujukan, "email:unit.bpbd.contoh.go.id"); assert.ok(!JSON.stringify(a).includes("rekan@"));
  assert.equal((await periksa(kode)).s, 400, "kode sekali pakai");
  assert.equal(await snapInstansi(), awal, "tidak ada baris instansi_akun yang dibuat atau diubah");
  /* pemetaan dihapus: tidak bisa lagi */
  assert.equal((await peta("bpbd.contoh.go.id", H(ADMIN), akun, "hapus")).s, 200); assert.equal((await peta("bpbd.contoh.go.id", H(ADMIN), akun, "hapus")).s, 404);
  assert.equal((await minta("rekan@unit.bpbd.contoh.go.id")).s, 400);
  /* pengiriman gagal: 502 dan kode hangus */
  await peta("bpbd.contoh.go.id"); await DB.prepare("UPDATE mk_kode SET dibuat = dibuat - 120000, habis = 1 WHERE saluran = 'email'").run(); resendGagal = true;
  const g = await minta("rekan@unit.bpbd.contoh.go.id"); resendGagal = false; assert.equal(g.s, 502);
  assert.equal(await n("mk_kode", `saluran = 'email' AND habis > ${Date.now()} AND dipakai IS NULL`), 0, "kode yang tidak terkirim hangus");
});

uji("anggota U-25b: tanpa EMAIL_API_KEY atau dengan pengirim resend.dev rute email menjawab 503 'belum aktif', tidak ada baris ditulis", async () => {
  const V = await siapkan("uji-masuk-anggota-tanpa-email", {ikat: {...KUNCI, EMAIL_API_KEY: ""}, luar});
  const r = await V.api("POST", "/api/masuk/email", {akun_id: id16(), email: "a@bpbd.contoh.go.id"}, H()); assert.equal(r.s, 503); assert.match(r.j.galat, /kode lewat email belum aktif/);
  const W = await siapkan("uji-masuk-anggota-resenddev", {ikat: {...KUNCI, EMAIL_FROM: "Centurisk97 <onboarding@resend.dev>"}, luar});
  assert.equal((await W.api("POST", "/api/masuk/email/periksa", {akun_id: id16(), email: "a@bpbd.contoh.go.id", kode: "123456"}, H())).s, 503);
  assert.equal(await V.n("mk_kode"), 0);
});

/* ---------------- U-26, U-27, U-28 ---------------- */
const bikin = async (i, peran, wilayah) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf Uji " + i, nip: `1990${String(i).padStart(2, "0")}0012005`.padEnd(18, "7"), unit: "Pusdalops BNPB", email: `s${i}@bnpb.go.id`, wa: lokal(i), peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t); await DB.prepare("UPDATE staf SET wajib_ganti = 0 WHERE id = ?").bind(r.j.staf.id).run();
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, H()); assert.equal(m.s, 200, m.t);
  return H({cookie: m.h.getSetCookie().find(l => l.startsWith("sesi_staf=")).split(";")[0]});
};

const undang = (h, b) => api("POST", "/api/masuk/undang", b, h);
uji("anggota U-26: undangan berlaku mengaktifkan anggota saat kode sah; dicabut atau lewat 14 hari tidak; pemilik dan anggota boleh mengundang, orang luar tidak", async () => {
  const akun = await instansi({wa: nomor(5)}), awal = await snapInstansi();
  const u = await undang(H(ADMIN), {wa: lokal(60), nama: "Rekan Satu", akun_id: akun}); assert.equal(u.s, 201, u.t);
  assert.equal(u.j.status, "terkirim"); assert.match(u.j.wa, /^•+0060$/); assert.ok(!u.t.includes(nomor(60)) && !u.t.includes(lokal(60)));
  const j = await login(60); const a = await anggota(60, akun); assert.equal(a.status, "aktif"); assert.equal(a.jalur, "undang"); assert.equal(a.rujukan, "undang:" + u.j.id); assert.match(a.oleh, /^admin:/);
  assert.equal((await DB.prepare("SELECT status FROM mk_undang WHERE id = ?").bind(u.j.id).first()).status, "diterima");
  assert.equal(j.r.j.ruang.filter(x => x.jenis === "instansi").length, 1); assert.equal(sesiInstansi(j.r).length, 2, "sesi instansi terbit saat kode sah");
  /* dicabut */
  const c = await undang(H(ADMIN), {wa: lokal(61), akun_id: akun}); const cb = await api("POST", "/api/masuk/undang/cabut/" + c.j.id, {}, H(ADMIN)); assert.equal(cb.s, 200, cb.t);
  assert.equal((await api("POST", "/api/masuk/undang/cabut/" + c.j.id, {}, H(ADMIN))).s, 409); await login(61); assert.equal(await anggota(61, akun), null);
  /* lewat 14 hari */
  const k = await undang(H(ADMIN), {wa: lokal(62), akun_id: akun}); await DB.prepare("UPDATE mk_undang SET habis = ? WHERE id = ?").bind(Date.now() - 1000, k.j.id).run(); await login(62); assert.equal(await anggota(62, akun), null);
  const d = await DB.prepare("SELECT habis - dibuat s FROM mk_undang WHERE id = ?").bind(u.j.id).first(); assert.equal(d.s, 14 * HARI);
  /* pemilik nomor akun (dari nomor sesi, bukan cookie instansi) mengundang tanpa menyebut akun */
  const jp = await login(5), up = await undang(dari(jp), {wa: lokal(63), nama: "Dari Pemilik"}); assert.equal(up.s, 201, up.t);
  assert.equal((await DB.prepare("SELECT oleh_tabel, oleh_id FROM mk_undang WHERE id = ?").bind(up.j.id).first()).oleh_tabel, "mk_akun");
  /* anggota biasa (60) ikut boleh mengundang; orang luar (64) tidak; akun lain tidak */
  const ja = await login(60); assert.equal((await undang(dari(ja), {wa: lokal(65), akun_id: akun})).s, 201);
  const jl = await login(64); assert.equal((await undang(dari(jl), {wa: lokal(66), akun_id: akun})).s, 403); assert.equal((await undang(dari(jl), {wa: lokal(66)})).s, 403);
  assert.equal((await undang(H(), {wa: lokal(66), akun_id: akun})).s, 401);
  /* daftar undangan: pemilik, anggota; nomor tersamar; tamu dan orang luar tidak */
  const dl = await api("GET", "/api/masuk/undang?akun_id=" + akun, undefined, bacaDari(jp)); assert.equal(dl.s, 200, dl.t);
  assert.ok(dl.j.undangan.length >= 3 && dl.j.undangan.every(x => /^•+\d{4}$/.test(x.wa))); assert.ok(dl.j.undangan.some(x => x.milikku));
  assert.ok(!dl.t.includes(nomor(63)) && !dl.t.includes(lokal(63)));
  const dA = await api("GET", "/api/masuk/undang?akun_id=" + akun, undefined, bacaDari(ja)); assert.equal(dA.s, 200); assert.ok(dA.j.undangan.length >= 1 && dA.j.undangan.every(x => x.milikku), "anggota biasa hanya melihat undangannya sendiri"); assert.ok(dA.j.undangan.length < dl.j.undangan.length);
  assert.equal((await api("GET", "/api/masuk/undang?akun_id=" + akun, undefined, bacaDari(jl))).s, 403); assert.equal((await api("GET", "/api/masuk/undang?akun_id=" + akun)).s, 401);
  /* mencabut undangan: bukan pengundang dan bukan pemilik tidak boleh */
  assert.equal((await api("POST", "/api/masuk/undang/cabut/" + up.j.id, {}, dari(jl))).s, 404, "tidak boleh = sama dengan tidak ada"); assert.equal((await api("POST", "/api/masuk/undang/cabut/" + up.j.id, {}, dari(jp))).s, 200);
  assert.equal(await snapInstansi(), awal, "tidak ada baris instansi_akun yang dibuat atau diubah");
});

uji("anggota U-27: undangan ke staf, akun lain, atau akun tidak aktif ditolak; undangan ke-21 sehari dan ke-101 terbuka ditolak; nomor sendiri dan anggota lama ditolak", async () => {
  const akun = await instansi({wa: nomor(6)}), lain = await instansi({wa: nomor(7)}), mati = await instansi({wa: null, status: "belum_klaim", nama: null, nip: null, jabatan: null, unit: null, email: null, surat: 0, kartu: 0});
  const jp = await login(6), ok = b => undang(dari(jp), {akun_id: akun, ...b});
  assert.equal((await ok({wa: lokal(70), ke: "staf"})).s, 400, "tidak ada undangan ke staf");
  assert.equal((await undang(dari(jp), {wa: lokal(70), akun_id: lain})).s, 403, "akun lain"); assert.equal((await undang(dari(jp), {wa: lokal(70), akun_id: mati})).s, 403, "akun tidak aktif");
  assert.equal((await undang(H(ADMIN), {wa: lokal(70), akun_id: mati})).s, 404, "akun tidak aktif walau admin"); assert.equal((await undang(H(ADMIN), {wa: lokal(70)})).s, 403, "admin tanpa akun_id");
  assert.equal((await ok({wa: lokal(70), akun_id: "x"})).s, 400); assert.equal((await ok({wa: "123"})).s, 400); assert.equal((await ok({})).s, 400);
  assert.equal((await ok({wa: lokal(6)})).s, 400, "nomor sendiri");
  assert.equal(await n("mk_undang", "tabel = 'staf'"), 0);
  assert.equal((await ok({wa: lokal(71)})).s, 201); assert.equal((await ok({wa: lokal(71)})).s, 409, "undangan berlaku untuk nomor yang sama");
  await login(72); await DB.prepare("INSERT INTO mk_anggota (id, mk_id, tabel, akun_id, status, jalur, rujukan, dibuat, diubah) VALUES (?, ?, 'instansi_akun', ?, 'aktif', 'tinjau', 'uji', ?, ?)").bind(id16(), await mkId(72), akun, T0, T0).run();
  assert.equal((await ok({wa: lokal(72)})).s, 409, "sudah anggota");
  /* ke-21 dalam sehari */
  const bibit = (k, o) => sisip("mk_undang", {id: id16(), wa: nomor(7000 + k), tabel: "instansi_akun", akun_id: akun, oleh_tabel: "mk_akun", oleh_id: jp.mk ?? "", status: "terkirim", dibuat: Date.now(), habis: Date.now() + 5 * HARI, ...o});
  const mkP = await mkId(6); jp.mk = mkP; await DB.prepare("DELETE FROM mk_undang WHERE oleh_id = ?").bind(mkP).run();
  for (let k = 0; k < 20; k++) await bibit(k);
  const h21 = await ok({wa: lokal(73)}); assert.equal(h21.s, 429); assert.match(h21.j.galat, /hari ini/);
  /* ke-101 terbuka: 100 undangan terbuka yang dibuat lebih dari sehari lalu */
  await DB.prepare("DELETE FROM mk_undang WHERE oleh_id = ?").bind(mkP).run();
  for (let k = 0; k < 100; k++) await bibit(100 + k, {dibuat: Date.now() - 2 * HARI});
  const t101 = await ok({wa: lokal(74)}); assert.equal(t101.s, 429); assert.match(t101.j.galat, /belum dijawab/);
  await DB.prepare("UPDATE mk_undang SET status = 'dicabut' WHERE oleh_id = ? AND wa LIKE '62800777710%'").bind(mkP).run();   // 10 dicabut: terbuka 90, jatah kembali
  assert.equal((await ok({wa: lokal(74)})).s, 201);
});

uji("anggota U-28: isi pesan undangan = templat tetap dengan nama lembaga dari basis data; nama ketikan pengundang tidak masuk pesan", async () => {
  const akun = await instansi({wa: nomor(8), kab: "Uji28"}), lembaga = "Pemerintah Kabupaten Uji28";
  const jp = await login(8), nama = "Rekan <b>Penipu</b>";
  const u = await undang(dari(jp), {wa: lokal(80), nama: "Pak Penipu", akun_id: akun}); assert.equal(u.s, 201, u.t);
  const w = await DB.prepare("SELECT pesan, jenis, tujuan, status, rujukan FROM wa_antre WHERE rujukan = ?").bind(u.j.id).first();
  assert.equal(w.jenis, "undang"); assert.equal(w.tujuan, nomor(80)); assert.equal(w.status, "antre");
  assert.equal(w.pesan, `Anda diundang bergabung ke ${lembaga} di Centurisk97. Masuk di https://centurisk97.id/masuk dengan nomor ini. Undangan berlaku 14 hari.`);
  assert.ok(!w.pesan.includes("Penipu")); assert.equal((await DB.prepare("SELECT nama FROM mk_undang WHERE id = ?").bind(u.j.id).first()).nama, "Pak Penipu", "nama hanya untuk tampilan di daftar");
  assert.equal((await undang(dari(jp), {wa: lokal(81), nama: "Lihat https://jahat.example", akun_id: akun})).s, 400, "nama berisi tautan ditolak");
  assert.equal((await undang(dari(jp), {wa: lokal(81), nama: "A", akun_id: akun})).s, 400);
  const u2 = await undang(dari(jp), {wa: lokal(81), nama, akun_id: akun}); assert.equal(u2.s, 201);
  assert.ok(!(await DB.prepare("SELECT pesan FROM wa_antre WHERE rujukan = ?").bind(u2.j.id).first()).pesan.includes("Penipu"));
  /* pesan pendataan: templat sama, tanpa nama lembaga dari akun */
  const up = await undang(H(ADMIN), {wa: lokal(82), ke: "pendataan"}); assert.equal(up.s, 201);
  assert.equal((await DB.prepare("SELECT pesan FROM wa_antre WHERE rujukan = ?").bind(up.j.id).first()).pesan, "Anda diundang bergabung ke Pendataan Satu Data BNPB di Centurisk97. Masuk di https://centurisk97.id/masuk dengan nomor ini. Undangan berlaku 14 hari.");
  /* undangan dari kontak pemangku: hanya staf dan admin, nomor kontak tidak keluar */
  const kid = await kontak({wa: nomor(83), nama: "Kepala Uji", kab: "Uji28"});
  assert.equal((await undang(dari(jp), {kontak_id: kid, akun_id: akun})).s, 403);
  const uk = await undang(H(ADMIN), {kontak_id: kid, akun_id: akun}); assert.equal(uk.s, 201, uk.t); assert.ok(!uk.t.includes(nomor(83)));
  assert.equal((await DB.prepare("SELECT tujuan FROM wa_antre WHERE rujukan = ?").bind(uk.j.id).first()).tujuan, nomor(83));
});

uji("anggota U-27b: staf berperan hanya mengundang ke akun di wilayah hak stafnya; staf tanpa peran aktivasi ditolak", async () => {
  const akun = await instansi({wa: nomor(10), prov: "33", cakupan: '["33"]', kab: "Contoh33"}), akunLuar = await instansi({wa: nomor(11)});   // luar = prov 62
  const sv = await bikin(90, ["verifikator"], ["33"]);
  const a = await undang(sv, {wa: lokal(91), akun_id: akun}); assert.equal(a.s, 201, a.t); assert.equal((await DB.prepare("SELECT oleh_tabel FROM mk_undang WHERE id = ?").bind(a.j.id).first()).oleh_tabel, "staf");
  assert.equal((await undang(sv, {wa: lokal(92), akun_id: akunLuar})).s, 403, "luar wilayah");
  assert.equal((await undang(sv, {wa: lokal(92), ke: "pendataan"})).s, 201, "staf boleh mengundang ke pendataan");
  const lain = await bikin(93, ["analis_konsesi"], []); assert.equal((await undang(lain, {wa: lokal(94), akun_id: akun})).s, 401, "peran tanpa hak aktivasi sama dengan tamu");
});

/* ---------------- U-29 ---------------- */
uji("anggota U-29: papan aktivasi: angka per kabupaten cocok dengan isi tabel uji; tamu dan anggota instansi ditolak; rincian kontak belum anggota", async () => {
  const [k1, k2, k3] = KAB_62;
  const a1 = await instansi({wa: nomor(100), kab: k1}), a1b = await instansi({wa: nomor(101), kab: k1, jenis: "polres", kunci_wilayah: "polres" + id16()}), a2 = await instansi({wa: nomor(102), kab: k2});
  const mati = await instansi({wa: null, kab: k3, status: "belum_klaim", nama: null, nip: null, jabatan: null, unit: null, email: null, surat: 0, kartu: 0});
  const jA = await login(110), jB = await login(111);   // 110 anggota aktif a1; 111 anggota aktif a2 (sesi instansi tidak ikut dipakai)
  const ang = (i, akun, status = "aktif") => sisip("mk_anggota", {id: id16(), mk_id: awaitMk[i], tabel: "instansi_akun", akun_id: akun, status, jalur: "tinjau", rujukan: "uji", dibuat: T0, diubah: T0});
  const awaitMk = {110: await mkId(110), 111: await mkId(111)};
  await ang(110, a1); await ang(111, a2); await ang(111, a1, "menunggu");
  const kini = Date.now();
  await sisip("mk_masuk_log", {id: id16(), mk_id: awaitMk[110], tabel: "instansi_akun", akun_id: a1, waktu: kini - 2 * HARI});
  await sisip("mk_masuk_log", {id: id16(), mk_id: awaitMk[110], tabel: "instansi_akun", akun_id: a1, waktu: kini - 9 * HARI});
  await sisip("mk_masuk_log", {id: id16(), mk_id: awaitMk[111], tabel: "instansi_akun", akun_id: a2, waktu: kini - 130 * HARI});
  const und = (k, status, akun, habis = kini + 5 * HARI) => sisip("mk_undang", {id: id16(), wa: nomor(7500 + k), tabel: "instansi_akun", akun_id: akun, oleh_tabel: "admin", oleh_id: "x", status, dibuat: kini - HARI, habis});
  await und(1, "terkirim", a1); await und(2, "diterima", a1); await und(3, "dicabut", a1); await und(4, "terkirim", a1, kini - 1000);
  const kA = await kontak({wa: nomor(120), kab: k1, nama: "Kontak A"}), kB = await kontak({wa: nomor(110), kab: k1, nama: "Kontak B anggota"}), kC = await kontak({wa: nomor(121), kab: k1, kategori: "polri", nama: "Kontak C"});
  await kontak({wa: nomor(122), kab: k1, kategori: "swasta", nama: "Kontak swasta"}); await kontak({wa: nomor(123), kab: k1, status: "menunggu", setuju_pdp: T0, nama: "Kontak menunggu"});
  await kontak({wa: nomor(101), kab: k1, nama: "Kontak pemilik akun"});   // pemilik akun aktif: bukan "belum anggota"
  const papan = await api("GET", "/api/masuk/aktivasi", undefined, ADMIN); assert.equal(papan.s, 200, papan.t);
  const semua = new Set(Object.keys(PUSAT).map(k => k.split("|").slice(0, 2).join("|")).filter(k => { const [p, a] = k.split("|"); return a && a.length >= 2 && a !== "None" && Object.hasOwn(PROV, p); }));
  assert.equal(papan.j.daftar.length, semua.size, "satu baris per kabupaten atau kota dari daftar wilayah repo"); assert.ok(semua.size >= 500);
  assert.ok(!papan.h.get("cache-control")?.includes("public"), "tidak pernah di-cache publik");
  const baris = k => papan.j.daftar.find(x => x.prov === "62" && x.kab === k);
  assert.deepEqual({...baris(k1), terakhir_masuk: undefined, prov_nama: undefined}, {prov: "62", kab: k1, akun_aktif: 2, anggota: 1, terakhir_masuk: undefined, undangan_terkirim: 1, undangan_diterima: 1, kontak_belum: 2, status: "aktif", prov_nama: undefined});
  assert.ok(Math.abs(baris(k1).terakhir_masuk - (kini - 2 * HARI)) < 1000);
  assert.equal(baris(k2).akun_aktif, 1); assert.equal(baris(k2).anggota, 1); assert.equal(baris(k2).terakhir_masuk, null, "log lebih tua dari jendela tidak dibaca"); assert.equal(baris(k2).status, "lama");
  assert.equal(baris(k3).akun_aktif, 0); assert.equal(baris(k3).status, "belum_ada");
  assert.equal(papan.j.daftar.filter(x => x.akun_aktif > 0).length, 2); assert.equal(papan.j.daftar.reduce((s, x) => s + x.kontak_belum, 0), 2);
  const f = await api("GET", "/api/masuk/aktivasi?prov=62", undefined, ADMIN); assert.ok(f.j.daftar.length < papan.j.daftar.length && f.j.daftar.every(x => x.prov === "62"));
  /* hak: tamu, akun umum, anggota instansi (sesi instansi dan sesi masuk), akun gerbang situs */
  assert.equal((await api("GET", "/api/masuk/aktivasi")).s, 403);
  assert.equal((await api("GET", "/api/masuk/aktivasi", undefined, bacaDari(jA))).s, 403, "anggota instansi ditolak"); assert.equal((await api("GET", "/api/masuk/aktivasi", undefined, GERBANG)).s, 403);
  assert.equal((await api("GET", "/api/masuk/aktivasi?prov=99", undefined, ADMIN)).s, 400); assert.equal((await api("GET", "/api/masuk/aktivasi?kab=" + k1, undefined, ADMIN)).s, 400, "kab tanpa prov");
  /* rincian: kontak aktif berkategori yang belum anggota, nomor tersamar, akun tujuan menurut kategori */
  const r = await api("GET", `/api/masuk/aktivasi?prov=62&kab=${encodeURIComponent(k1)}`, undefined, ADMIN); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.kontak.map(k => k.nama).sort(), ["Kontak A", "Kontak C"]); assert.ok(!r.t.includes(nomor(120)) && !r.t.includes(lokal(120)) && /•+0120/.test(r.t));
  assert.equal(r.j.kontak.find(k => k.id === kA).akun_id, a1, "bpbd: akun pemkab"); assert.equal(r.j.kontak.find(k => k.id === kC).akun_id, a1b, "polri: akun polres"); assert.equal(r.j.akun.length, 2);
  assert.equal((await api("GET", `/api/masuk/aktivasi?prov=62&kab=Tidak%20Ada`, undefined, ADMIN)).s, 400);
  /* undang dari rincian (kontak_id, tanpa nomor terang) lalu angka naik setelah papan dihitung ulang */
  const uk = await undang(H(ADMIN), {kontak_id: kA, akun_id: a1}); assert.equal(uk.s, 201, uk.t);
});

/* ---------------- antrean tinjau ---------------- */
uji("anggota tinjau: antrean instansi, pendataan, dan kampus membawa cocok_kontak dan nomor_terbukti; antrean anggota menunggu, setujui, tolak, cabut", async () => {
  /* tanda pada antrean akun yang sudah ada */
  const wA = 130, wB = 131;
  const pa = await instansi({wa: nomor(wA), status: "menunggu", dikirim: T0}), pb = await instansi({wa: nomor(wB), status: "menunggu", dikirim: T0});
  await kontak({wa: nomor(wA)}); await login(wA);   // A: kontak cocok dan nomor terbukti; B: tidak keduanya
  const q = await api("GET", "/api/instansi/admin/antrean", undefined, ADMIN); assert.equal(q.s, 200, q.t);
  const ra = q.j.akun.find(x => x.id === pa), rb = q.j.akun.find(x => x.id === pb);
  assert.equal(ra.cocok_kontak, true); assert.equal(ra.nomor_terbukti, true); assert.equal(rb.cocok_kontak, false); assert.equal(rb.nomor_terbukti, false);
  const pd = await pendataan({wa: nomor(wA)}), pe = await pendataan({wa: nomor(wB)}); await DB.prepare("UPDATE pdt_akun SET status = 'menunggu' WHERE id IN (?, ?)").bind(pd, pe).run();
  await kontak({wa: nomor(wA), kategori: "bnpb", prov: null, kab: null});
  const rg = await api("GET", "/api/pendataan/admin/ringkas", undefined, ADMIN); assert.equal(rg.s, 200, rg.t);
  const ga = rg.j.akun.find(x => x.id === pd), gb = rg.j.akun.find(x => x.id === pe);
  assert.equal(ga.nomor_terbukti, true); assert.equal(gb.nomor_terbukti, false); assert.equal(gb.cocok_kontak, false);
  /* kampus menunggu */
  const ins = id16(), km = id16(); await sisip("institusi", {id: ins, nama: "Universitas Uji Tinjau", jenis: "ptn", pic_nama: "Dosen Uji", dibuat: T0, diubah: T0});
  await sisip("km_akun", {id: km, institusi_id: ins, nama: "Dosen Uji", email: "d@contoh.ac.id", wa: nomor(wA), status: "menunggu", dibuat: T0, diubah: T0}); await sisip("km_kampus", {institusi_id: ins, status: "menunggu", dibuat: T0, diubah: T0, oleh: "daftar"});
  const kk = await api("GET", "/api/kemitraan/kampus", undefined, ADMIN); assert.equal(kk.s, 200, kk.t);
  const rk = kk.j.kampus.find(x => x.id === ins); assert.equal(rk.nomor_terbukti, true); assert.equal(rk.cocok_kontak, false);
  /* antrean anggota */
  const akun = await instansi({wa: nomor(132)}), jm = await login(133), jo = await login(132);
  assert.equal((await mohon(jm, akun)).j.status, "menunggu");
  const idA = (await DB.prepare("SELECT id FROM mk_anggota WHERE mk_id = ? AND akun_id = ?").bind(await mkId(133), akun).first()).id;
  const t = await api("GET", "/api/masuk/anggota/tinjau", undefined, ADMIN); assert.equal(t.s, 200, t.t);
  const ma = t.j.anggota.find(x => x.id === idA); assert.ok(ma && ma.nomor_terbukti === true && ma.cocok_kontak === false && /^•+0133$/.test(ma.wa)); assert.ok(!t.t.includes(nomor(133)));
  assert.equal((await api("GET", "/api/masuk/anggota/tinjau")).s, 401);
  assert.equal((await api("GET", "/api/masuk/anggota/tinjau", undefined, bacaDari(await login(134)))).j.anggota.length, 0, "orang luar tidak melihat apa pun");
  assert.equal((await api("GET", "/api/masuk/anggota/tinjau", undefined, bacaDari(jo))).j.anggota.filter(x => x.id === idA).length, 1, "pemilik nomor akun melihat permohonan ke akunnya");
  const putus = (aksi, id, h) => api("POST", "/api/masuk/anggota/putus/" + id, {aksi}, h);
  assert.equal((await putus("setujui", idA, dari(await login(134)))).s, 404); assert.equal((await putus("lain", idA, H(ADMIN))).s, 400);
  const awal = await snapInstansi();
  const ok = await putus("setujui", idA, dari(jo)); assert.equal(ok.s, 200, ok.t); assert.equal((await anggota(133, akun)).status, "aktif"); assert.equal((await anggota(133, akun)).jalur, "tinjau");
  assert.equal((await putus("setujui", idA, dari(jo))).s, 409);
  assert.equal(await snapInstansi(), awal);
  /* tolak: akun lain, oleh admin */
  const jx = await login(135); await mohon(jx, akun); const idB = (await DB.prepare("SELECT id FROM mk_anggota WHERE mk_id = ? AND akun_id = ?").bind(await mkId(135), akun).first()).id;
  assert.equal((await putus("tolak", idB, H(ADMIN))).s, 200); assert.equal((await anggota(135, akun)).status, "dicabut"); assert.equal((await mohon(jx, akun)).s, 403, "ditolak tidak bisa mohon ulang lewat bukti");
  /* daftar dan cabut anggota: pemilik nomor akun dan admin saja; anggota biasa dan staf tidak */
  const dl = await api("GET", "/api/masuk/anggota?akun_id=" + akun, undefined, bacaDari(jo)); assert.equal(dl.s, 200, dl.t);
  assert.deepEqual(dl.j.anggota.map(x => x.id), [idA]); assert.ok(/^•+0133$/.test(dl.j.anggota[0].wa) && !dl.t.includes(nomor(133)));
  const jb = await login(133); assert.equal(sesiInstansi(jb.r).length, 2, "anggota aktif mendapat sesi instansi lewat kode");
  assert.equal((await api("GET", "/api/masuk/anggota?akun_id=" + akun, undefined, bacaDari(jb))).s, 403, "anggota biasa"); assert.equal(dl.j.cabut_sesi_default, false); assert.equal((await api("GET", "/api/masuk/anggota")).s, 401);
  assert.equal((await api("POST", "/api/masuk/anggota/cabut/" + idA, {}, dari(jb))).s, 404);
  assert.equal((await api("POST", "/api/masuk/anggota/cabut/" + id16(), {}, H(ADMIN))).s, 404);
  /* cabut tanpa cabut_sesi: sesi lama tetap sampai habis; dengan cabut_sesi: semua sesi akun itu dihapus */
  const sesiAwal = await n("instansi_sesi", `akun_id = '${akun}'`); assert.ok(sesiAwal >= 1);
  const c = await api("POST", "/api/masuk/anggota/cabut/" + idA, {}, dari(jo)); assert.equal(c.s, 200, c.t); assert.equal(c.j.sesi_semua_dicabut, false); assert.equal(c.j.sesi_lama_masih_hidup, true); assert.equal(await n("instansi_sesi", `akun_id = '${akun}'`), sesiAwal);
  assert.equal((await api("POST", "/api/masuk/anggota/cabut/" + idA, {}, dari(jo))).s, 409);
  assert.equal((await login(133)).r.j.ruang.filter(x => x.jenis === "instansi").length, 0, "anggota dicabut tidak mendapat sesi baru lewat kode");
  const jb2 = await login(133), ulang = await mohon(jb2, akun); assert.equal(ulang.s, 403);
  await kontak({wa: nomor(136)}); const j6 = await login(136), x6 = await mohon(j6, akun); assert.equal(x6.j.status, "aktif");
  const id6 = (await DB.prepare("SELECT id FROM mk_anggota WHERE mk_id = ? AND akun_id = ?").bind(await mkId(136), akun).first()).id;
  const c6 = await api("POST", "/api/masuk/anggota/cabut/" + id6, {cabut_sesi: true}, H(ADMIN)); assert.equal(c6.s, 200); assert.equal(c6.j.sesi_semua_dicabut, true); assert.equal(await n("instansi_sesi", `akun_id = '${akun}'`), 0);
  assert.equal(await snapInstansi(), awal, "tidak ada baris instansi_akun yang dibuat atau diubah");
});

/* ---------------- daftar akun untuk dipilih pemohon ---------------- */
uji("anggota akun: daftar akun aktif per provinsi dan kabupaten untuk pemohon, tanpa data pribadi; tamu ditolak", async () => {
  const [k1, k2] = KAB_62.slice(3);
  const a = await instansi({wa: nomor(140), kab: k1}), p = await instansi({wa: nomor(141), kab: k2, jenis: "polres", kunci_wilayah: "polres" + id16()});
  const prov = await instansi({wa: nomor(142), jenis: "pemprov", tingkat: "prov", prov: null, kab: null, wilayah: "Provinsi Kalimantan Tengah", kunci_wilayah: "62" + id16().slice(0, 4), cakupan: '["62"]'});
  const j = await login(143), g = (q, h = bacaDari(j)) => api("GET", "/api/masuk/akun?" + q, undefined, h);
  const r = await g("prov=62&rumpun=pemda"); assert.equal(r.s, 200, r.t); assert.ok(r.j.kab.includes(k1) && r.j.kab.includes(k2)); assert.deepEqual(r.j.akun.map(x => x.id), [prov], "tanpa kab: hanya akun tingkat provinsi");
  const s = await g(`prov=62&rumpun=pemda&kab=${encodeURIComponent(k1)}`); assert.deepEqual(s.j.akun.map(x => x.id).sort(), [a, prov].sort()); assert.equal(s.j.kab_ada_akun, true);
  const t = await g(`prov=62&rumpun=aparat&kab=${encodeURIComponent(k1)}`); assert.equal(t.j.akun.length, 0); assert.equal(t.j.kab_ada_akun, false, "belum ada akun aktif: layar mengarah ke verifikasi");
  assert.deepEqual((await g(`prov=62&rumpun=aparat&kab=${encodeURIComponent(k2)}`)).j.akun.map(x => x.id), [p]);
  for (const x of r.j.akun) assert.deepEqual(Object.keys(x).sort(), ["id", "jenis", "lembaga", "tingkat"]);
  for (const x of s.j.akun) assert.deepEqual(Object.keys(x).sort(), ["id", "jenis", "lembaga", "tingkat"], "tanpa nip, email, nomor, username");
  assert.equal((await g("prov=99&rumpun=pemda")).s, 400); assert.equal((await g("prov=62&rumpun=lain")).s, 400); assert.equal((await g("prov=62&rumpun=pemda&kab=Fiktif")).s, 400);
  assert.equal((await g("prov=62&rumpun=pemda", {"cf-connecting-ip": "10.9.9.9"})).s, 401);
});

/* ---------------- perbaikan pemeriksa: undangan sisa, antrean berhak, batas per nomor ---------------- */
uji("anggota T2/T3/R8: undangan dari pengundang yang tak lagi berhak mati; antrean menunggu disaring hak di SQL; batas undangan per nomor tujuan", async () => {
  const akun = await instansi({wa: nomor(150)}), lain = await instansi({wa: nomor(151)});
  /* T2: anggota M mengundang; dicabut lewat API (undangan ikut dicabut) dan lewat DB langsung (undangan tidak sah lagi) */
  const jM = await login(152), mM = await mkId(152);
  await sisip("mk_anggota", {id: id16(), mk_id: mM, tabel: "instansi_akun", akun_id: akun, status: "aktif", jalur: "tinjau", rujukan: "uji", dibuat: T0, diubah: T0});
  const u1 = await undang(dari(jM), {wa: lokal(153), akun_id: akun}), u2 = await undang(dari(jM), {wa: lokal(154), akun_id: akun}); assert.equal(u1.s, 201, u1.t); assert.equal(u2.s, 201);
  const idM = (await DB.prepare("SELECT id FROM mk_anggota WHERE mk_id = ? AND akun_id = ?").bind(mM, akun).first()).id;
  await DB.prepare("UPDATE mk_anggota SET status = 'dicabut' WHERE id = ?").bind(idM).run();   // tanpa lewat API: pengundang sudah tak berhak
  await login(154); assert.equal(await anggota(154, akun), null, "undangan dari pengundang yang tak berhak tidak sah");
  await DB.prepare("UPDATE mk_anggota SET status = 'aktif' WHERE id = ?").bind(idM).run();
  const c = await api("POST", "/api/masuk/anggota/cabut/" + idM, {}, H(ADMIN)); assert.equal(c.s, 200, c.t);
  assert.equal((await DB.prepare("SELECT status FROM mk_undang WHERE id = ?").bind(u1.j.id).first()).status, "dicabut", "undangan sisa ikut dicabut");
  await login(153); assert.equal(await anggota(153, akun), null);
  /* T3: 205 permohonan di akun lain tidak menutupi antrean akun sendiri */
  for (let k = 0; k < 205; k++) { const m = id16(); await sisip("mk_akun", {id: m, wa: nomor(8000 + k), nama: "Orang Lain " + k, status: "aktif", dibuat: T0}); await sisip("mk_anggota", {id: id16(), mk_id: m, tabel: "instansi_akun", akun_id: lain, status: "menunggu", jalur: "tinjau", rujukan: "uji", dibuat: T0 - 1000 + k, diubah: T0}); }
  const jo = await login(150), jp = await login(155); assert.equal((await mohon(jp, akun)).j.status, "menunggu");
  const t = await api("GET", "/api/masuk/anggota/tinjau", undefined, bacaDari(jo)); assert.equal(t.s, 200, t.t);
  assert.equal(t.j.anggota.length, 1, "hanya akun miliknya"); assert.ok(!t.t.includes("Orang Lain") && !t.t.includes(nomor(8000)));
  assert.equal((await api("GET", "/api/masuk/anggota/tinjau", undefined, bacaDari(await login(156)))).j.anggota.length, 0);
  const ta = await api("GET", "/api/masuk/anggota/tinjau", undefined, ADMIN); assert.equal(ta.j.anggota.length, 200, "admin melihat semua, dipotong batas");
  /* R8: nomor tujuan yang sama paling banyak 3 undangan sehari lintas akun dan pengundang */
  const akuns = [await instansi({wa: nomor(157)}), await instansi({wa: nomor(158)}), await instansi({wa: nomor(159)}), await instansi({wa: nomor(160)})];
  for (let k = 0; k < 3; k++) assert.equal((await undang(H(ADMIN), {wa: lokal(161), akun_id: akuns[k]})).s, 201);
  const r8 = await undang(H(ADMIN), {wa: lokal(161), akun_id: akuns[3]}); assert.equal(r8.s, 429); assert.match(r8.j.galat, /nomor itu/);
});

/* ---------------- halaman papan ---------------- */
uji("anggota halaman: /admin/aktivasi untuk admin dan staf berperan; tamu dan peran lain dialihkan; memuat skrip papan dan kartu standar", async () => {
  const buka = (h = {}) => U.mf.dispatchFetch(ASAL + "/admin/aktivasi", {redirect: "manual", headers: {"cf-connecting-ip": H()["cf-connecting-ip"], ...h}}).then(async r => ({s: r.status, loc: r.headers.get("location"), t: await r.text()}));
  const tamu = await buka(); assert.equal(tamu.s, 303); assert.match(tamu.loc, /^\/admin\/masuk/);
  const a = await buka(ADMIN); assert.equal(a.s, 200); assert.match(a.t, /\/admin\/aktivasi\.js/); assert.match(a.t, /\/admin\/aktivasi\.css/); assert.match(a.t, /\/inti\/kartu\.css/); assert.match(a.t, /Aktivasi daerah/);
  const sv = await bikin(95, ["verifikator"], []); const s = await buka({cookie: sv.cookie}); assert.equal(s.s, 200); assert.match(s.t, /data-staf="1"/);
  const lain = await bikin(96, ["analis_konsesi"], []); const l = await buka({cookie: lain.cookie}); assert.equal(l.s, 303); assert.match(l.loc, /\/admin\/pantau/);
  assert.ok(existsSync(path.join(AKAR, "public/admin/aktivasi.js")) && existsSync(path.join(AKAR, "public/admin/aktivasi.css")));
});

/* ---------------- gerbang mekanis: modul tidak menulis akun modul lain ---------------- */
uji("anggota G-7: tidak ada baris instansi_akun yang dibuat atau diubah oleh seluruh rute pintu ini (dihitung dari berkas kode)", async () => {
  for (const f of ["src/masuk.js", "src/masuk_undang.js", "src/masuk_tanda.js"]) assert.ok(!/\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE|DELETE\s+FROM)\s+(?:staf|instansi_akun|instansi_sesi|pdt_sesi|km_sesi|pemirsa_sesi|pemirsa)\b/i.test(readFileSync(path.join(AKAR, f), "utf8")), f);
  assert.ok(existsSync(path.join(AKAR, "src/masuk_undang.js")));
});
