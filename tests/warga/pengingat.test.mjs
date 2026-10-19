/* Pengingat (src/pengingat.js, C2) di atas D1 lokal sungguhan (Miniflare, worker.js utuh): migrasi 0028, CHECK, enum JS == CHECK, pendeteksi di tepi ambang tiap jenis,
   dedup dua kali jalan, email Resend (fixture outboundService) hanya saat admin menekan, isi email tanpa data pribadi, tandai selesai/abaikan, dummy lewat rantai sumbernya. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul BNPB saling impor (siklus), urutan yang sama dengan produksi
import {DAFTAR_JENIS, STATUS, JENIS, susunEmail} from "../../src/pengingat.js";
import {sisipInstitusi, sisipPerjanjian} from "../../src/relawan.js";

const JAM = 3600e3, HARI = 24 * JAM, MENIT = 60e3;
const wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
let luarLog = [], resend = {status: 200, diterima: null};
const luar = async req => {
  const u = new URL(req.url); luarLog.push(u.hostname);
  if (u.hostname === "api.resend.com") { resend.diterima = JSON.parse(await req.text()); return new Response(resend.status === 200 ? '{"id":"x"}' : "RAHASIA-BALASAN-RESEND", {status: resend.status}); }
  return new Response("diblok di uji", {status: 599});
};
const EMAIL = {EMAIL_API_KEY: "kunci-uji", EMAIL_FROM: "Pantau <p@contoh.id>", EMAIL_TO: "a@contoh.id, b@contoh.id"};
const U = await siapkan("uji-pengingat", {ikat: EMAIL, luar}), V = await siapkan("uji-pengingat-tanpa-email", {luar}), uji = berantai();
const env = {DB: U.DB};
const sql = async t => (await U.DB.prepare("SELECT sql FROM sqlite_master WHERE name = ?").bind(t).first()).sql;
const enumSql = (s, kol) => [...s.match(new RegExp(`${kol} IN \\(([^)]*)\\)`))[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const daftar = (q = "") => U.api("GET", "/api/pengingat/admin" + q, undefined, ADMIN);
const periksa = () => U.api("POST", "/api/pengingat/admin/periksa", {}, ADMIN);
const PII = ["Rahmat Hidayat", "6281234567890", "pic.rahasia@kampus.id"];
const S = {};   // id sumber per kasus

uji("migrasi 0028 idempoten; enum JS sama persis dengan CHECK; CHECK menolak isian liar di D1", async () => {
  const f = readFileSync(path.join(AKAR, "migrations/0028_pengingat.sql"), "utf8");
  await U.DB.prepare("INSERT INTO pengingat (id, jenis, sumber_id, keadaan, tanggal, judul, dibuat) VALUES ('aaaaaaaaaaaaaaaa', 'renkon', 'bbbbbbbbbbbbbbbb', 'x', '2026-10-20', 'Judul sah', 1)").run();
  await U.DB.batch(pecah(f).map(s => U.DB.prepare(s)));
  assert.equal(await U.n("pengingat"), 1, "dijalankan ulang tanpa merusak isi");
  const p = await sql("pengingat"), t = await sql("alun_tautan");
  assert.deepEqual(enumSql(p, "jenis"), DAFTAR_JENIS);
  assert.deepEqual(enumSql(p, "status"), STATUS);
  assert.deepEqual(enumSql(t, "jenis"), ["relawan", "logistik"]);
  assert.deepEqual(Object.keys(JENIS), DAFTAR_JENIS);
  const ins = (o = {}) => { const v = {id: "cccccccccccccccc", jenis: "renkon", sumber: "dddddddddddddddd", keadaan: "k", tanggal: "2026-10-20", judul: "Judul sah", status: "baru", dummy: 0, ...o};
    return U.DB.prepare("INSERT INTO pengingat (id, jenis, sumber_id, keadaan, tanggal, judul, status, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)").bind(v.id, v.jenis, v.sumber, v.keadaan, v.tanggal, v.judul, v.status, v.dummy).run(); };
  for (const [nama, o] of [["jenis liar", {jenis: "spam"}], ["status liar", {status: "terkirim"}], ["tanggal liar", {tanggal: "kemarin"}], ["judul pendek", {judul: "ab"}], ["dummy 2", {dummy: 2}], ["id pendek", {id: "abc"}]])
    await assert.rejects(ins(o), /CHECK|constraint/i, nama);
  await assert.rejects(ins({id: "eeeeeeeeeeeeeeee", jenis: "renkon", sumber: "bbbbbbbbbbbbbbbb", keadaan: "x"}), /UNIQUE/i, "satu baris per (jenis, sumber, keadaan)");
  await ins({id: "ffffffffffffffff", keadaan: "x2", sumber: "bbbbbbbbbbbbbbbb"});   // keadaan lain = baris lain
  await U.DB.prepare("DELETE FROM pengingat").run();
  await assert.rejects(U.DB.prepare("INSERT INTO alun_tautan (id, utas_id, jenis, tujuan_id, dibuat) VALUES ('1111111111111111', 'tidak-ada-utas0000', 'relawan', '2222222222222222', 1)").run(), /CHECK|FOREIGN|constraint/i);
});

uji("gerbang: tanpa token 403, akun gerbang 403, non-super tak bisa dummy, masukan liar 400, email belum diset 503", async () => {
  for (const [m, j, b] of [["GET", "/api/pengingat/admin"], ["POST", "/api/pengingat/admin/periksa", {}], ["POST", "/api/pengingat/admin/kirim", {ids: ["aaaaaaaaaaaaaaaa"]}],
    ["POST", "/api/pengingat/admin/aaaaaaaaaaaaaaaa", {aksi: "selesai"}], ["POST", "/api/pengingat/dummy", {aksi: "isi"}]]) {
    assert.equal((await U.api(m, j, b)).s, 403, `${m} ${j} tanpa token`);
    assert.equal((await U.api(m, j, b, GERBANG)).s, 403, `${m} ${j} akun gerbang`);
  }
  assert.equal((await U.api("POST", "/api/pengingat/dummy", {aksi: "isi"}, MOD2)).s, 403, "moderator biasa bukan Super Admin");
  for (const ids of [undefined, [], "aaaaaaaaaaaaaaaa", ["bukan-id"], Array(51).fill("aaaaaaaaaaaaaaaa"), [1]]) assert.equal((await U.adm("POST", "/api/pengingat/admin/kirim", {ids})).s, 400, JSON.stringify(ids)?.slice(0, 30));
  assert.equal((await U.adm("POST", "/api/pengingat/admin/aaaaaaaaaaaaaaaa", {aksi: "hapus"})).s, 400);
  assert.equal((await U.adm("POST", "/api/pengingat/admin/aaaaaaaaaaaaaaaa", {aksi: "selesai"})).s, 404);
  assert.equal((await U.adm("POST", "/api/pengingat/dummy", {aksi: "x"})).s, 400);
  const k = await V.api("POST", "/api/pengingat/admin/kirim", {ids: ["aaaaaaaaaaaaaaaa"]}, ADMIN);
  assert.equal(k.s, 503, k.t); assert.match(k.j.galat, /EMAIL/);
  assert.equal((await V.api("GET", "/admin/pengingat", undefined, ADMIN)).s, 200, "halaman admin");
  const h = await U.api("GET", "/admin/pengingat"); assert.ok([302, 303].includes(h.s) || h.s === 403 || h.t.includes("Login") || h.t.includes("Masuk"), "halaman admin tanpa token tidak memuat isi");
});

/* ---------------- sumber di tepi ambang ---------------- */
const mj = (meja, kab, status, data, {dibuat = Date.now() - 3 * HARI, desa = null, kaji = null, stok = null} = {}) => {
  const id = Math.random().toString(16).slice(2, 10).padEnd(8, "0") + Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return {id, st: U.DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, desa, data, status, dibuat, diubah, oleh, kaji_id, stok) VALUES (?, ?, '33', ?, ?, ?, ?, ?, ?, 'uji', ?, ?)")
    .bind(id, meja, kab, desa, JSON.stringify(data), status, dibuat, dibuat, kaji, stok)};
};
uji("pendeteksi: tiap jenis terdeteksi tepat di tepi ambang (dalam/luar satu satuan), jenis lain tidak ikut", async () => {
  const kini = Date.now(), tg = h => wib(kini + h * HARI), st = [];
  /* MoU / PKS: berakhir <= 60 hari ke depan sampai 30 hari ke belakang, hanya perjanjian TERBARU per institusi */
  const inst = (nama, per) => { const id = Math.random().toString(16).slice(2, 18).padEnd(16, "0");
    st.push(sisipInstitusi(env, id, {nama, singkatan: null, jenis: "pts", prov: "33", pic: PII[0], jabatan: null, email: PII[2], wa: PII[1], catatan: null}, null, kini, "uji", 0));
    for (const p of per) st.push(sisipPerjanjian(env, id, {jenis_perjanjian: p.j ?? "mou_relawan", nomor: p.nomor ?? "MoU/UJI/1", mulai: tg(-500), berakhir: tg(p.h), kuota: (p.j ?? "mou_relawan") === "mou_relawan" ? 10 : null}, kini, "uji", 0));
    return id; };
  S.mouIn = inst("Kampus Tepi 60", [{h: 60}]); S.mouLuar = inst("Kampus Luar 61", [{h: 61}]); S.mouHabis = inst("Kampus Habis 30", [{h: -30}]); S.mouLama = inst("Kampus Habis 31", [{h: -31}]);
  S.pks = inst("Kampus Riset", [{j: "pks_riset", h: 45, nomor: "PKS/UJI/1"}]);
  S.diperpanjang = inst("Kampus Perpanjang", [{h: 10, nomor: "MoU/LAMA"}, {h: 400, nomor: "MoU/BARU"}]);
  /* meja kerja */
  const lg = (umurMenit, status = "diminta") => mj("logistik", "Kab Uji", status, {barang: "beras", jumlah_diminta: 500, satuan: "kg", posko: "Posko Uji", kebutuhan_untuk: 100}, {dibuat: kini - umurMenit * MENIT});
  const L1 = lg(24 * 60 + 1), L2 = lg(24 * 60 - 1), L3 = lg(48 * 60, "disetujui");
  const ds = (hari, status = "cair") => mj("dsp", "Kab Uji", status, {kejadian: "Banjir Uji", nomor_permohonan: "DSP/UJI/" + hari, nilai_diajukan: 1000, nilai_disetujui: 1000, nilai_cair: 1000, tgl_ajuan: tg(-90), tgl_setuju: tg(-80), tgl_cair: tg(-hari)});
  const D1 = ds(31), D2 = ds(30), D3 = ds(60, "spj");
  const rk = h => mj("renkon", "Kab Uji", "tercatat", {bencana: "banjir", judul: "Renkon Banjir Uji", tgl_sah: tg(-300), berlaku_sampai: tg(h), uji_terakhir: tg(-10)});
  const R1 = rk(90), R2 = rk(91), R3 = rk(-1);
  const kj = n => mj("kaji_cepat", "Kab Uji", "masuk_jitupasna", {kejadian: "banjir", tanggal: tg(-100)}, {desa: "Desa " + n});
  const K1 = kj("Satu"), K2 = kj("Dua");
  const rh = (kaji, hari) => mj("rehab", "Kab Uji", "jitupasna", {rumah_rb: 2, rumah_rs: 1, rumah_rr: 0, tgl_jitupasna: tg(-hari)}, {kaji});
  const H1 = rh(K1.id, 61), H2 = rh(K2.id, 60);
  const gd = (nama, stok) => mj("gudang", "Kab Uji", "tercatat", {gudang: nama, barang: "beras", satuan: "kg", ambang_min: 100, stok_awal: stok}, {stok});
  const G1 = gd("Gudang Tepi", 100), G2 = gd("Gudang Aman", 101);   // stok == ambang (terpicu) dan ambang + 1 (tidak)
  await U.DB.batch([...st, ...[K1, K2, L1, L2, L3, D1, D2, D3, R1, R2, R3, H1, H2, G1, G2].map(x => x.st)]);
  Object.assign(S, {L1: L1.id, L2: L2.id, L3: L3.id, D1: D1.id, D2: D2.id, R1: R1.id, R2: R2.id, R3: R3.id, H1: H1.id, H2: H2.id, G1: G1.id, G2: G2.id});
  /* Alun-alun: butuh_bantuan terbuka > 24 jam, lewat API lalu umur dimundurkan */
  const baru = async (judul, mundurMenit, bantuan = "terbuka") => { const a = await U.api("POST", "/api/alun", {jenis: "butuh_bantuan", judul, teks: "Kami butuh bantuan segera.", bencana: "banjir", prov: "33", kab: "Kabupaten Demak"}, {"cf-connecting-ip": "10.7.0." + (1 + mundurMenit % 200)});
    assert.equal(a.s, 201, a.t); await U.DB.prepare("UPDATE alun_utas SET dibuat = ?, bantuan = ? WHERE id = ?").bind(kini - mundurMenit * MENIT, bantuan, a.j.id).run(); return a.j.id; };
  S.A1 = await baru("Perahu karet untuk lansia", 24 * 60 + 1); S.A2 = await baru("Air bersih dusun", 24 * 60 - 1); S.A3 = await baru("Selimut pengungsi", 30 * 60, "ditangani");

  const p = await periksa();
  assert.equal(p.s, 200, p.t);
  const harus = {[S.mouIn]: "mou_relawan", [S.mouHabis]: "mou_relawan", [S.pks]: "pks_riset", [S.L1]: "logistik_lambat", [S.D1]: "dsp_spj", [S.R1]: "renkon", [S.R3]: "renkon", [S.H1]: "rehab_macet", [S.G1]: "stok_rendah", [S.A1]: "bantuan_terbuka"};
  const l = await daftar();
  assert.equal(l.j.pengingat.length, Object.keys(harus).length, JSON.stringify(l.j.pengingat.map(x => [x.jenis, x.judul])));
  assert.equal(p.j.dibuat, Object.keys(harus).length);
  /* sumber_id tidak ikut respons; cocokkan lewat D1 */
  const dariD1 = Object.fromEntries((await U.DB.prepare("SELECT sumber_id, jenis, keadaan FROM pengingat").all()).results.map(r => [r.sumber_id, r]));
  // institusi: sumber_id perjanjian, bukan institusi; cocokkan lewat institusi_perjanjian
  const idMou = async inst => (await U.DB.prepare("SELECT id FROM institusi_perjanjian WHERE institusi_id = ? ORDER BY berakhir DESC LIMIT 1").bind(inst).first()).id;
  const peta = {[await idMou(S.mouIn)]: "mou_relawan", [await idMou(S.mouHabis)]: "mou_relawan", [await idMou(S.pks)]: "pks_riset", ...Object.fromEntries(Object.entries(harus).filter(([, j]) => !["mou_relawan", "pks_riset"].includes(j)))};
  assert.deepEqual(Object.fromEntries(Object.entries(dariD1).map(([k, v]) => [k, v.jenis])), peta);
  for (const x of [S.mouLuar, S.mouLama, S.diperpanjang]) assert.ok(!(await idMou(x) in dariD1), "di luar ambang atau sudah diperpanjang");
  for (const x of [S.L2, S.L3, S.D2, S.R2, S.H2, S.G2, S.A2, S.A3]) assert.ok(!(x in dariD1), `${x} belum/tidak memenuhi ambang`);
  assert.match(dariD1[await idMou(S.mouIn)].keadaan, /^segera_habis:/); assert.match(dariD1[await idMou(S.mouHabis)].keadaan, /^habis:/);
  assert.deepEqual(Object.keys(p.j.per_jenis), DAFTAR_JENIS); assert.equal(p.j.per_jenis.renkon, 2);
  assert.equal(l.j.per_jenis.renkon, 2); assert.equal(l.j.email_siap, true);
  for (const x of l.j.pengingat) { assert.equal(x.status, "baru"); assert.ok(!("sumber_id" in x) && !("keadaan" in x)); }
  assert.deepEqual(luarLog, [], "periksa/cron tidak boleh mengirim apa pun ke luar");
});

uji("dedup: dua kali jalan tidak menambah; baris baru hanya bila keadaan sumber berubah; kondisi hilang = baris ikut hilang; selesai/abaikan bertahan", async () => {
  const idA = (await U.DB.prepare("SELECT id FROM pengingat WHERE jenis = 'logistik_lambat'").first()).id;
  const p2 = await periksa(); assert.equal(p2.j.dibuat, 0); assert.equal(p2.j.dihapus, 0); assert.equal(await U.n("pengingat"), 10);
  assert.equal((await U.adm("POST", `/api/pengingat/admin/${idA}`, {aksi: "selesai"})).s, 200);
  const idB = (await U.DB.prepare("SELECT id FROM pengingat WHERE jenis = 'dsp_spj'").first()).id;
  assert.equal((await U.adm("POST", `/api/pengingat/admin/${idB}`, {aksi: "abaikan"})).s, 200);
  const p3 = await periksa(); assert.equal(p3.j.dibuat, 0);
  assert.deepEqual((await U.DB.prepare("SELECT status FROM pengingat WHERE id IN (?, ?) ORDER BY status").bind(idA, idB).all()).results.map(r => r.status), ["abaikan", "selesai"], "yang sudah ditandai tidak dibuka lagi tiap hari");
  /* keadaan berubah: MoU segera_habis -> habis = baris BARU (lama diganti) */
  const mid = (await U.DB.prepare("SELECT id FROM institusi_perjanjian WHERE institusi_id = ?").bind(S.mouIn).first()).id;
  await U.DB.prepare("UPDATE institusi_perjanjian SET berakhir = ? WHERE id = ?").bind(wib(Date.now() - 2 * HARI), mid).run();
  const p4 = await periksa(); assert.equal(p4.j.dibuat, 1); assert.equal(p4.j.dihapus, 1); assert.equal(await U.n("pengingat"), 10);
  assert.match((await U.DB.prepare("SELECT keadaan FROM pengingat WHERE sumber_id = ?").bind(mid).first()).keadaan, /^habis:/);
  /* kondisi hilang: logistik disetujui, gudang diisi ulang, utas ditangani */
  await U.DB.batch([U.DB.prepare("UPDATE meja_catatan SET status = 'disetujui' WHERE id = ?").bind(S.L1), U.DB.prepare("UPDATE meja_catatan SET stok = 500 WHERE id = ?").bind(S.G1), U.DB.prepare("UPDATE alun_utas SET bantuan = 'ditangani' WHERE id = ?").bind(S.A1)]);
  const p5 = await periksa(); assert.equal(p5.j.dibuat, 0); assert.equal(p5.j.dihapus, 3); assert.equal(await U.n("pengingat"), 7);
  assert.equal(await U.n("pengingat", "jenis IN ('logistik_lambat', 'stok_rendah', 'bantuan_terbuka')"), 0);
  /* kambuh: stok turun lagi -> muncul lagi (barisnya dulu sudah dihapus) */
  await U.DB.prepare("UPDATE meja_catatan SET stok = 50 WHERE id = ?").bind(S.G1).run();
  assert.equal((await periksa()).j.dibuat, 1);
  assert.equal(await U.n("pengingat"), 8);
});

uji("modul sumber belum dimigrasi: jenisnya dilewati tanpa 500, jenis lain tetap diproses", async () => {
  await V.DB.prepare("DROP TABLE institusi_perjanjian").run();
  const a = await V.api("POST", "/api/alun", {jenis: "butuh_bantuan", judul: "Perahu karet", teks: "Kami butuh perahu karet.", bencana: "banjir", prov: "33", kab: "Kabupaten Demak"}, {"cf-connecting-ip": "10.7.1.1"});
  await V.DB.prepare("UPDATE alun_utas SET dibuat = ? WHERE id = ?").bind(Date.now() - 30 * JAM, a.j.id).run();
  const p = await V.adm("POST", "/api/pengingat/admin/periksa", {}); assert.equal(p.s, 200, p.t); assert.equal(p.j.dibuat, 1);
  assert.equal(await V.n("pengingat", "jenis = 'bantuan_terbuka'"), 1);
});

uji("kirim: email hanya saat admin menekan; satu email gabungan ke EMAIL_TO; tanpa data pribadi; gagal kirim tidak mengubah status", async () => {
  assert.deepEqual(luarLog, [], "belum ada kiriman sebelum admin menekan");
  const rows = (await U.DB.prepare("SELECT id, jenis, judul, status FROM pengingat WHERE status = 'baru' ORDER BY jenis, id").all()).results;
  assert.ok(rows.length >= 4);
  const pilih = rows.slice(0, 3), sisa = rows.slice(3);
  resend = {status: 500, diterima: null};
  const gagal = await U.adm("POST", "/api/pengingat/admin/kirim", {ids: pilih.map(r => r.id)});
  assert.equal(gagal.s, 502, gagal.t); assert.ok(!gagal.t.includes("RAHASIA-BALASAN"), "isi balasan Resend tidak ikut respons"); assert.match(gagal.t, /Resend HTTP 500/);
  assert.equal(await U.n("pengingat", "status = 'dikirim'"), 0, "gagal kirim: status tidak berubah");
  resend = {status: 200, diterima: null};
  const ok = await U.adm("POST", "/api/pengingat/admin/kirim", {ids: pilih.map(r => r.id)});
  assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.terkirim, 3); assert.equal(ok.j.ke, 2);
  assert.equal(luarLog.filter(h => h === "api.resend.com").length, 2, "tepat dua panggilan Resend: satu gagal, satu berhasil");
  assert.deepEqual(resend.diterima.to, ["a@contoh.id", "b@contoh.id"]); assert.equal(resend.diterima.from, "Pantau <p@contoh.id>");
  assert.match(resend.diterima.subject, /3 pengingat/);
  for (const r of pilih) assert.ok(resend.diterima.text.includes(r.judul), r.judul);
  for (const r of sisa) assert.ok(!resend.diterima.text.includes(r.judul), "yang tidak dipilih tidak ikut");
  for (const s of PII) { assert.ok(!resend.diterima.text.includes(s) && !resend.diterima.html.includes(s), `data pribadi bocor: ${s}`); }
  assert.deepEqual((await U.DB.prepare("SELECT status, dikirim_pada IS NOT NULL ada FROM pengingat WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(pilih.map(r => r.id))).all()).results.map(r => `${r.status}:${r.ada}`), ["dikirim:1", "dikirim:1", "dikirim:1"]);
  assert.equal(await U.n("pengingat", "status = 'dikirim'"), 3, "yang tidak dipilih tetap baru");
  /* selesai/abaikan tidak ikut terkirim ulang */
  await U.adm("POST", `/api/pengingat/admin/${pilih[0].id}`, {aksi: "selesai"});
  luarLog = []; resend.diterima = null;
  const lagi = await U.adm("POST", "/api/pengingat/admin/kirim", {ids: [pilih[0].id]});
  assert.equal(lagi.s, 409, lagi.t); assert.deepEqual(luarLog, []);
  assert.equal((await U.adm("POST", `/api/pengingat/admin/${pilih[0].id}`, {aksi: "buka"})).j.status, "baru");
  /* susunEmail murni: kosong tidak meledak, HTML di-escape */
  const e = susunEmail([{jenis: "renkon", judul: "<b>x</b> & y", rincian: null, prov: "33", kab: null}]);
  assert.ok(e.html.includes("&lt;b&gt;x&lt;/b&gt; &amp; y") && !e.html.includes("<b>x</b>"));
});

uji("dummy: lahir dari rantai sumber dummy modul lain, tiap jenis terisi, tidak ikut angka publik/asli, tidak pernah dikirim, hapus bersih", async () => {
  const W = await siapkan("uji-pengingat-dummy", {ikat: EMAIL, luar});
  assert.equal((await W.adm("POST", "/api/pengingat/dummy", {aksi: "isi"})).s, 409, "sumber dummy belum ada: jujur, tidak mengarang");
  for (const m of ["relawan", "riset", "meja", "alun"]) { const r = await W.adm("POST", `/api/${m}/dummy`, {aksi: "isi"}); assert.ok(r.s === 200 || r.s === 201, `${m}: ${r.t}`); }
  const a = await W.api("POST", "/api/alun", {jenis: "butuh_bantuan", judul: "Perahu karet asli", teks: "Kami butuh perahu karet.", bencana: "banjir", prov: "33", kab: "Kabupaten Demak"}, {"cf-connecting-ip": "10.7.2.1"});
  await W.DB.prepare("UPDATE alun_utas SET dibuat = ? WHERE id = ?").bind(Date.now() - 30 * JAM, a.j.id).run();
  assert.equal((await W.adm("POST", "/api/pengingat/admin/periksa", {})).j.dibuat, 1, "satu pengingat asli");
  luarLog = [];
  const isi = await W.adm("POST", "/api/pengingat/dummy", {aksi: "isi"});
  assert.equal(isi.s, 201, isi.t); assert.deepEqual(isi.j.kosong, [], "tiap jenis terisi"); for (const j of DAFTAR_JENIS) assert.ok(isi.j.per_jenis[j] > 0, j);
  assert.equal((await W.adm("POST", "/api/pengingat/dummy", {aksi: "isi"})).s, 409, "sudah ada");
  const publik = await W.adm("GET", "/api/pengingat/admin"), semua = await W.adm("GET", "/api/pengingat/admin?dummy=1");
  assert.equal(publik.j.pengingat.length, 1, "tanpa ?dummy=1 hanya data asli"); assert.equal(semua.j.pengingat.length, 1 + isi.j.pengingat);
  for (const j of DAFTAR_JENIS) assert.ok(semua.j.per_jenis[j] > 0, `per_jenis ${j}`);
  const ids = semua.j.pengingat.filter(x => x.dummy).slice(0, 3).map(x => x.id);
  const kirim = await W.adm("POST", "/api/pengingat/admin/kirim", {ids}); assert.equal(kirim.s, 409, kirim.t); assert.deepEqual(luarLog, [], "data dummy tidak pernah dikirim");
  /* periksa asli tidak menyentuh dummy dan sebaliknya */
  const p = await W.adm("POST", "/api/pengingat/admin/periksa", {}); assert.equal(p.s, 200);
  assert.equal(await W.n("pengingat", "dummy = 1"), isi.j.pengingat, "periksa asli tidak memangkas/menambah dummy");
  const hapus = await W.adm("POST", "/api/pengingat/dummy", {aksi: "hapus"}); assert.equal(hapus.j.pengingat, isi.j.pengingat);
  assert.equal(await W.n("pengingat", "dummy = 1"), 0); assert.equal(await W.n("pengingat"), 1, "yang asli utuh");
});
