/* Pengingat (src/pengingat.js, C2) di atas D1 lokal sungguhan (Miniflare, worker.js utuh): migrasi 0028, CHECK, enum JS == CHECK, pendeteksi di tepi ambang tiap jenis,
   dedup dua kali jalan, email Resend (fixture outboundService) hanya saat admin menekan, isi email tanpa data pribadi, tandai selesai/abaikan, dummy lewat rantai sumbernya. */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul BNPB saling impor (siklus), urutan yang sama dengan produksi
import {DAFTAR_JENIS, STATUS, JENIS, susunEmail, kelompokPrioritas} from "../../src/pengingat.js";
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
/* aset uji: sama dengan harness, kecuali risiko_prioritas.json yang dikendalikan per instans (null = 404). Uji lama tidak boleh ketambahan 113 baris prioritas dari berkas nyata. */
const asetDengan = kontrol => async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  if (p === "/banjir/data/kejadian_aktif_awal.json") return new Response("tidak ada", {status: 404});   // baris kejadian aktif diuji di banjir_perluasan.test.mjs
  if (p === "/banjir/data/risiko_prioritas.json") return kontrol.prio == null ? new Response("tidak ada", {status: 404}) : new Response(kontrol.prio);
  return existsSync(f) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const kU = {prio: null}, kV = {prio: null}, kW = {prio: null};
const U = await siapkan("uji-pengingat", {ikat: EMAIL, luar, asetKu: asetDengan(kU)}), V = await siapkan("uji-pengingat-tanpa-email", {luar, asetKu: asetDengan(kV)}), uji = berantai();
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
  for (const r of pilih) if (r.jenis !== "bantuan_terbuka") assert.ok(resend.diterima.text.includes(r.judul), r.judul);
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
  const W = await siapkan("uji-pengingat-dummy", {ikat: EMAIL, luar, asetKu: asetDengan(kW)});
  assert.equal((await W.adm("POST", "/api/pengingat/dummy", {aksi: "isi"})).s, 409, "sumber dummy belum ada: jujur, tidak mengarang");
  for (const m of ["relawan", "riset", "meja", "alun"]) { const r = await W.adm("POST", `/api/${m}/dummy`, {aksi: "isi"}); assert.ok(r.s === 200 || r.s === 201, `${m}: ${r.t}`); }
  const a = await W.api("POST", "/api/alun", {jenis: "butuh_bantuan", judul: "Perahu karet asli", teks: "Kami butuh perahu karet.", bencana: "banjir", prov: "33", kab: "Kabupaten Demak"}, {"cf-connecting-ip": "10.7.2.1"});
  await W.DB.prepare("UPDATE alun_utas SET dibuat = ? WHERE id = ?").bind(Date.now() - 30 * JAM, a.j.id).run();
  assert.equal((await W.adm("POST", "/api/pengingat/admin/periksa", {})).j.dibuat, 1, "satu pengingat asli");
  luarLog = []; kW.prio = readFileSync(path.join(AKAR, "public/banjir/data/risiko_prioritas.json"), "utf8");   // JSON nyata baru tersedia saat dummy diisi
  const isi = await W.adm("POST", "/api/pengingat/dummy", {aksi: "isi"});
  assert.equal(isi.s, 201, isi.t); assert.deepEqual(isi.j.kosong, [], "tiap jenis terisi"); for (const j of DAFTAR_JENIS) assert.ok(isi.j.per_jenis[j] > 0, j);
  assert.equal((await W.adm("POST", "/api/pengingat/dummy", {aksi: "isi"})).s, 409, "sudah ada");
  const publik = await W.adm("GET", "/api/pengingat/admin"), semua = await W.adm("GET", "/api/pengingat/admin?dummy=1");
  assert.equal(publik.j.pengingat.length, 1, "tanpa ?dummy=1 hanya data asli"); assert.equal(semua.j.pengingat.length, 1 + isi.j.pengingat);
  for (const j of DAFTAR_JENIS) assert.ok(semua.j.per_jenis[j] > 0, `per_jenis ${j}`);
  const ids = semua.j.pengingat.filter(x => x.dummy).slice(0, 3).map(x => x.id);
  const kirim = await W.adm("POST", "/api/pengingat/admin/kirim", {ids}); assert.equal(kirim.s, 409, kirim.t); assert.deepEqual(luarLog, [], "data dummy tidak pernah dikirim");
  kW.prio = null;   /* periksa asli tidak menyentuh dummy dan sebaliknya */
  const p = await W.adm("POST", "/api/pengingat/admin/periksa", {}); assert.equal(p.s, 200);
  assert.equal(await W.n("pengingat", "dummy = 1"), isi.j.pengingat, "periksa asli tidak memangkas/menambah dummy");
  const hapus = await W.adm("POST", "/api/pengingat/dummy", {aksi: "hapus"}); assert.equal(hapus.j.pengingat, isi.j.pengingat);
  assert.equal(await W.n("pengingat", "dummy = 1"), 0); assert.equal(await W.n("pengingat"), 1, "yang asli utuh");
});

uji("keamanan 2: email bantuan_terbuka tanpa judul utas warga (jenis, umur, wilayah, tautan admin saja)", async () => {
  const e = susunEmail([{jenis: "bantuan_terbuka", judul: "Butuh bantuan terbuka lebih dari 24 jam: RAHASIA-JUDUL-WARGA", rincian: null, prov: "33", kab: "Cilacap", dibuat: 10 * HARI}], 12 * HARI, "https://x.id");
  assert.ok(!e.teks.includes("RAHASIA-JUDUL-WARGA") && !e.html.includes("RAHASIA-JUDUL-WARGA"));
  assert.match(e.teks, /2 hari/); assert.match(e.teks, /Cilacap/); assert.match(e.teks, /https:\/\/x\.id\/admin\/pengingat/);
});

uji("keamanan 2: kirim email dibatasi 10 per jam per moderator (ke-11 = 429, moderator lain tetap boleh)", async () => {
  resend = {status: 200, diterima: null};
  const id = (await U.DB.prepare("SELECT id FROM pengingat WHERE status IN ('baru', 'dikirim') AND dummy = 0 LIMIT 1").first()).id;
  const sebelum = (await U.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE aksi = 'pengingat.kirim'").first()).n;
  for (let i = sebelum; i < 10; i++) assert.equal((await U.adm("POST", "/api/pengingat/admin/kirim", {ids: [id]})).s, 200);
  const l = await U.adm("POST", "/api/pengingat/admin/kirim", {ids: [id]}); assert.equal(l.s, 429, l.t);
  assert.equal((await U.api("POST", "/api/pengingat/admin/kirim", {ids: [id]}, MOD2)).s, 200, "batas per moderator, bukan global");
});

/* ---------------- F2: prioritas dampak ke BPBD ---------------- */
const NYATA = readFileSync(path.join(AKAR, "public/banjir/data/risiko_prioritas.json"), "utf8");
const kX = {prio: null}, logX = [], X = await siapkan("uji-pengingat-f2", {ikat: EMAIL, luar: async r => { logX.push(new URL(r.url).hostname); return new Response("diblok di uji", {status: 599}); }, asetKu: asetDengan(kX)});
const kec = (n, o = {}) => ({prov: "33", prov_nama: "Jawa Tengah", kab: "Kabupaten A", kec: "Kec " + n, kelas: 2, kelas_nama: "Tinggi", skor: 60, utama: "banjir", utama_nama: "Banjir", pend: 12345, perubahan: "tetap", dari_kelas: "Tinggi", ...o,
  bpbd: {nama: "AAA", pusdalops: "0812-3456-7890", km: 5, sekab: true, ...o.bpbd}});
const prio = (list, o = {}) => JSON.stringify({hari: "2026-10-19", usang: false, kec: list, ...o});
const periksaX = () => X.adm("POST", "/api/pengingat/admin/periksa", {});
const baris = async () => (await X.DB.prepare("SELECT id, sumber_id, keadaan, status, judul, rincian, muatan FROM pengingat WHERE jenis = 'prioritas_dampak' ORDER BY judul").all()).results;
const kel = async (q = "") => (await X.adm("GET", "/api/pengingat/admin" + q)).j.kelompok_prioritas;
const F2 = {};

uji("F2: baris terbentuk dari JSON nyata repo, satu per kecamatan, sumber_id 16 hex, dua kali jalan tidak berulang", async () => {
  const nyata = JSON.parse(NYATA); kX.prio = NYATA;
  const a = await periksaX(); assert.equal(a.s, 200, a.t); assert.equal(a.j.per_jenis.prioritas_dampak, nyata.kec.length);
  const rs = await baris(); assert.equal(rs.length, nyata.kec.length);
  for (const r of rs) { assert.match(r.sumber_id, /^[0-9a-f]{16}$/); assert.match(r.keadaan, /^k[0-3]$/); assert.match(r.judul, /^Kec\. .+: .+, .+, ±[\d.,]+ jiwa$/); assert.match(r.rincian, /^BPBD /); }
  assert.equal(new Set(rs.map(r => r.sumber_id)).size, rs.length, "kunci kecamatan unik");
  const b = await periksaX(); assert.equal(b.j.dibuat, 0); assert.equal(b.j.dihapus, 0); assert.equal((await baris()).length, rs.length);
  assert.deepEqual(logX, [], "periksa tidak mengirim apa pun ke luar");
  await X.DB.prepare("DELETE FROM pengingat").run();
});

uji("F2: kelompok per BPBD; tautan wa.me hanya untuk nomor sah; teks tanpa data pribadi; naik kelas = baris baru; tanggal data ikut", async () => {
  kX.prio = prio([kec(1), kec(2), kec(3, {bpbd: {nama: "BBB", pusdalops: "12345"}}), kec(4, {bpbd: {nama: "CCC", pusdalops: null, sekab: false, km: 22.5}})]);
  assert.equal((await periksaX()).j.dibuat, 4);
  let g = await kel(); assert.equal(g.length, 3);
  const A = g.find(x => x.bpbd === "AAA"), B = g.find(x => x.bpbd === "BBB"), C = g.find(x => x.bpbd === "CCC");
  assert.equal(A.kecamatan, 2); assert.equal(A.ids.length, 2); assert.equal(A.wa, "6281234567890");
  assert.ok(A.tautan.startsWith("https://wa.me/6281234567890?text="), A.tautan);
  const teks = decodeURIComponent(A.tautan.split("?text=")[1]); assert.equal(teks, A.teks);
  for (const p of ["Kec. Kec 1, Kabupaten A: Tinggi, Banjir, ±", "Kec. Kec 2", "19 Oktober 2026", "https://centurisk97.id/risiko", "BPBD AAA"]) assert.ok(teks.includes(p), p);
  for (const pii of [...PII, "0812-3456", "081234567890", "token", "@"]) assert.ok(!teks.includes(pii), `teks memuat ${pii}`);
  assert.equal(B.tautan, null, "nomor tak sah tidak jadi tautan"); assert.equal(B.wa, null); assert.equal(C.tautan, null);
  assert.match((await baris()).find(r => r.judul.includes("Kec 4")).rincian, /terdekat 22\.5 km/);
  assert.match((await baris()).find(r => r.judul.includes("Kec 1")).rincian, /BPBD AAA; tetap/); assert.ok(!(await baris()).find(r => r.judul.includes("Kec 1")).rincian.includes("terdekat"), "sekab: tanpa jarak");
  /* tanggal data baru, kelas sama: tidak ada baris baru, teks ikut tanggal terbaru */
  kX.prio = prio([kec(1), kec(2), kec(3, {bpbd: {nama: "BBB", pusdalops: "12345"}}), kec(4, {bpbd: {nama: "CCC", pusdalops: null}})], {hari: "2026-10-20"});
  const t = await periksaX(); assert.equal(t.j.dibuat, 0); assert.equal(t.j.dihapus, 0);
  assert.ok((await kel()).find(x => x.bpbd === "AAA").teks.includes("20 Oktober 2026"));
  /* naik kelas kec 1: baris baru, baris lama (belum dikirim) diganti */
  kX.prio = prio([kec(1, {kelas: 3, kelas_nama: "Sangat tinggi", perubahan: "naik", dari_kelas: "Tinggi"}), kec(2), kec(3, {bpbd: {nama: "BBB", pusdalops: "12345"}}), kec(4, {bpbd: {nama: "CCC", pusdalops: null}})], {hari: "2026-10-20"});
  const n = await periksaX(); assert.equal(n.j.dibuat, 1); assert.equal(n.j.dihapus, 1);
  const rs = await baris(); assert.equal(rs.length, 4); const k1 = rs.find(r => r.judul.includes("Kec 1"));
  assert.equal(k1.keadaan, "k3"); assert.match(k1.rincian, /naik dari Tinggi/);
});

uji("F2: hanya moderator yang menandai dikirim; gerbang dan tanpa token 403; masukan liar 400; bukan prioritas 409; tidak ada kiriman server", async () => {
  const A = (await kel()).find(x => x.bpbd === "AAA"), body = {ids: A.ids};
  for (const h of [{}, GERBANG]) assert.equal((await X.api("POST", "/api/pengingat/admin/dikirim-wa", body, h)).s, 403);
  for (const ids of [undefined, [], "x", ["bukan-id"], [1]]) assert.equal((await X.adm("POST", "/api/pengingat/admin/dikirim-wa", {ids})).s, 400);
  const lain = await X.DB.prepare("INSERT INTO pengingat (id, jenis, sumber_id, keadaan, tanggal, judul, dibuat) VALUES ('1a1a1a1a1a1a1a1a', 'renkon', 'bbbbbbbbbbbbbbbb', 'x', '2026-10-20', 'Judul sah', 1)").run();
  assert.equal((await X.adm("POST", "/api/pengingat/admin/dikirim-wa", {ids: ["1a1a1a1a1a1a1a1a"]})).s, 409, "jenis lain tak bisa ditandai lewat rute ini");
  assert.equal(await X.n("pengingat", "id = '1a1a1a1a1a1a1a1a' AND status = 'baru'"), 1);
  const ok = await X.api("POST", "/api/pengingat/admin/dikirim-wa", body, MOD2); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.ditandai, 2);
  assert.equal(await X.n("pengingat", `jenis = 'prioritas_dampak' AND status = 'dikirim' AND dikirim_pada IS NOT NULL AND oleh IS NOT NULL`), 2);
  assert.equal((await X.adm("POST", "/api/pengingat/admin/dikirim-wa", body)).s, 409, "sudah ditandai");
  assert.ok(!(await kel()).some(x => x.bpbd === "AAA"), "kelompok yang sudah dikirim hilang dari antrean baru");
  assert.deepEqual(logX, [], "menandai tidak mengirim apa pun dari server");
  assert.equal((await X.api("GET", "/api/pengingat/admin")).s, 403, "daftar kelompok hanya moderator");
  await X.DB.prepare("DELETE FROM pengingat WHERE id = '1a1a1a1a1a1a1a1a'").run();
});

uji("F2: kecamatan keluar daftar = baris dihapus, kecuali yang sudah dikirim atau selesai", async () => {
  const k = await baris(), id = x => k.find(r => r.judul.includes(x)).id;
  await X.adm("POST", `/api/pengingat/admin/${id("Kec 3")}`, {aksi: "selesai"});
  kX.prio = prio([kec(2)], {hari: "2026-10-20"});   // keluar: kec 1 (dikirim), kec 3 (selesai), kec 4 (baru)
  const p = await periksaX(); assert.equal(p.j.dibuat, 0);
  const sisa = (await baris()).map(r => r.judul.match(/Kec \d/)[0]).sort();
  /* Kec 1 dan 2 sudah dikirim, Kec 3 selesai -> bertahan; Kec 4 baru -> dihapus */
  assert.deepEqual(sisa, ["Kec 1", "Kec 2", "Kec 3"]); assert.equal(p.j.dihapus, 1);
});

uji("F2: JSON usang, 404, rusak, atau tanpa tanggal = jenis dilewati, antrean tidak dipangkas", async () => {
  const sebelum = (await baris()).length; assert.ok(sebelum >= 1);
  for (const [nama, v] of [["usang", prio([kec(9)], {usang: true})], ["404", null], ["rusak", "{bukan json"], ["tanpa tanggal", JSON.stringify({usang: false, kec: [kec(9)]})], ["kec bukan larik", JSON.stringify({hari: "2026-10-20", kec: {}})], ["kosong", prio([])]]) {
    kX.prio = v; const p = await periksaX(); assert.equal(p.s, 200, nama);
    if (nama === "kosong") { assert.equal((await baris()).length, sebelum); continue; }
    assert.equal(p.j.dibuat, 0, nama); assert.equal(p.j.dihapus, 0, nama); assert.equal((await baris()).length, sebelum, nama);
  }
  assert.equal((await baris()).length, sebelum, "daftar kosong sah: yang dikirim/selesai tetap");
});

uji("F2: cron jam 00/06/12/18 UTC menit 55 menjalankan pendeteksi prioritas saja; menit/jam lain tidak", async () => {
  await X.DB.prepare("DELETE FROM pengingat").run(); kX.prio = prio([kec(7), kec(8)]);
  const w = await X.mf.getWorker(), tik = t => w.scheduled({cron: "* * * * *", scheduledTime: new Date(t)});
  await tik("2026-10-22T06:54:00Z"); await tik("2026-10-22T07:55:00Z"); assert.equal((await baris()).length, 0, "menit/jam salah");
  await tik("2026-10-22T06:55:00Z"); assert.equal((await baris()).length, 2);
  await tik("2026-10-22T12:55:00Z"); assert.equal((await baris()).length, 2, "idempoten");
  assert.equal(await X.n("pengingat", "jenis <> 'prioritas_dampak'"), 0, "jenis lain tidak ikut di jam 06");
});

uji("F2: enum jenis di JS sama persis dengan CHECK migrasi 0028, prioritas_dampak terdaftar", async () => {
  assert.deepEqual(enumSql(await sql("pengingat"), "jenis"), DAFTAR_JENIS); assert.ok(DAFTAR_JENIS.includes("prioritas_dampak")); assert.equal(JENIS.prioritas_dampak, "Prioritas dampak: kirim ke BPBD");
  assert.match(readFileSync(path.join(AKAR, "migrations/0028_pengingat.sql"), "utf8"), /'bantuan_terbuka', 'prioritas_dampak'\)\)/);
  assert.deepEqual(kelompokPrioritas([]), []);
});

uji("F2: dummy mengisi 6 baris dari JSON nyata dengan dummy=1, satu BPBD tanpa nomor, tidak bentrok dengan baris asli", async () => {
  const Z = await siapkan("uji-pengingat-f2-dummy", {luar, ikat: EMAIL, asetKu: asetDengan({prio: NYATA})}), nyata = JSON.parse(NYATA);
  assert.equal((await Z.adm("POST", "/api/pengingat/admin/periksa", {})).j.dibuat, nyata.kec.length, "asli lebih dulu: sumber_id dummy harus berbeda");
  const i = await Z.adm("POST", "/api/pengingat/dummy", {aksi: "isi"}); assert.equal(i.s, 201, i.t); assert.equal(i.j.per_jenis.prioritas_dampak, 6);
  assert.equal(await Z.n("pengingat", "jenis = 'prioritas_dampak' AND dummy = 1"), 6); assert.equal(await Z.n("pengingat", "jenis = 'prioritas_dampak' AND dummy = 0"), nyata.kec.length);
  const g = (await Z.adm("GET", "/api/pengingat/admin?dummy=1")).j.kelompok_prioritas;
  assert.ok(g.some(x => !x.tautan), "ada BPBD tanpa nomor"); assert.ok(g.some(x => x.tautan?.startsWith("https://wa.me/62")), "ada BPBD dengan nomor");
  assert.equal((await Z.adm("POST", "/api/pengingat/dummy", {aksi: "hapus"})).s, 200); assert.equal(await Z.n("pengingat", "jenis = 'prioritas_dampak'"), nyata.kec.length);
});
