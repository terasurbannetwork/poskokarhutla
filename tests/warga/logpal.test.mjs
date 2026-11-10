/* Inventori LogPal (src/logpal.js, migrations/0112_logpal.sql, public/logpal/) di workerd (Miniflare) dengan D1 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock).
   Dibuktikan: skema idempoten dan CHECK/trigger menahan; BPBD A tidak menulis gudang BPBD B (404) dan pemprov yang hanya membaca ditolak menulis (403); mutasi keluar melebihi stok ditolak
   tanpa baris mutasi dan dua penarikan serentak tidak menembus stok; opname menyesuaikan stok dalam satu transaksi dengan tercatat dari server; alur tahap permintaan maju satu langkah, BPBD tidak
   memprosesnya; akun tanpa hak ditolak; dummy per DUMMY.md; kesamaan daftar tetap server dan klien.
   Jalankan: node --test tests/warga/logpal.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync} from "node:fs";
import path from "node:path";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {FLOW, KELOMPOK, MUTASI, TEKS_B, rumus, cekBarang} from "../../src/logpal.js";
import {bangunSql, bangunSqlBantuan, uraiCsv, diLuarRepo, susunStatis, potongTeks, BATAS_POTONG} from "../../scripts/logpal/impor.mjs";
import {tmpdir} from "node:os";

const GUDANG_FIX = "gudang,pemilik,kode_prov,provinsi,lon,lat\nGudang BPBD Kalimantan Tengah,BPBD,62,Kalimantan Tengah,113.92,-2.21\n\"Gudang BPBD, Papua Selatan\",BPBD,96,Papua Selatan,140.4,-8.5\n";
const WILAYAH_FIX = "kode_prov,provinsi,kab,kecamatan,penduduk,pengungsi_rata,lon,lat,gudang_bnpb,jam_bnpb,gudang_semua,jam_semua\n62,Kalimantan Tengah,Kapuas,17,400000,3.2,114.4,-3,Gudang Uji A,11.6,Gudang Uji B,7.2\n";
const PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, uji = berantai();
const U = await siapkan("uji-logpal"), {DB, api, n} = U;
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `192.0.2.${++ipN % 250}`});
const SANDI = "SandiUji123456";

const akun = async (username, o = {}) => {
  const garam = "c".repeat(32), id = id16();
  await sisip("instansi_akun", {id, username, jenis: "pemkab", tingkat: "kab", wilayah: "BPBD Kabupaten " + username, kunci_wilayah: "k" + id, cakupan: '["62"]', prov: "62", kab: "Kapuas", garam, sandi_sha: sha256(garam + SANDI),
    status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat: Date.now(), ...o});
  const m = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0];
  return {id, h: {cookie}, hp: {cookie, ...PB}};
};
let nipN = 0;
const staf = async (nama, peran) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19950${++nipN}0012005`, unit: "Pusdalops BNPB", email: `l${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
const GET = (a, j = "/api/instansi/logpal/data") => api("GET", j, undefined, a.h), POST = (a, j, b) => api("POST", j, b, a.hp);
const P = "/api/instansi/logpal/", BARANG = (o = {}) => ({barang: "Beras 5 kg", kelompok: "Pangan", satuan: "karung", jumlah: 10, ...o});
const stok = async id => DB.prepare("SELECT jumlah, baik, rusak FROM logpal_barang WHERE id = ?").bind(id).first();
let A, B, C, S, gA, gB, bA;

/* ================================================================ skema */
uji("skema logpal: migrasi idempoten, CHECK dan trigger menahan", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0112_logpal.sql"), "utf8");
  for (const s of pecah(sql)) await DB.prepare(s).run();   // diulang di atas migrasi yang sudah jalan: IF NOT EXISTS
  for (const t of ["gudang", "alat"]) assert.ok(await DB.prepare(`SELECT 1 FROM sqlite_master WHERE name = ?`).bind(t).first(), `tabel lama ${t} tidak boleh hilang`);
  const g = id16(), t = Date.now();
  await assert.rejects(sisip("logpal_gudang", {id: g, nama: "Gudang X", pemilik: "BNPB", akun_id: id16(), prov: "62", provinsi: "Kalimantan Tengah", dibuat: t, diubah: t}), /constraint|FOREIGN|CHECK/i);   // BNPB tidak boleh punya akun pemilik
  await sisip("logpal_gudang", {id: g, nama: "Gudang X", pemilik: "BPBD", prov: "62", provinsi: "Kalimantan Tengah", dibuat: t, diubah: t});
  const dasar = {gudang_id: g, barang: "Selimut", kelompok: "Sandang", dibuat: t, diubah: t};
  await assert.rejects(sisip("logpal_barang", {id: id16(), ...dasar, jumlah: 5, baik: 4, rusak: 3}), /CHECK|constraint/i);   // baik + rusak > jumlah
  await assert.rejects(sisip("logpal_barang", {id: id16(), ...dasar, jumlah: -1}), /CHECK|constraint/i);   // stok negatif
  const p = id16();
  await sisip("logpal_permintaan", {id: p, jenis: "Tanggap darurat", bpbd: "BPBD X", provinsi: "Kalimantan Tengah", items: '[{"barang":"a","jumlah":1}]', dibuat: t, diubah: t});
  await assert.rejects(DB.prepare("UPDATE logpal_permintaan SET tahap = 3 WHERE id = ?").bind(p).run(), /hanya maju satu langkah/);   // melompat
  await assert.rejects(DB.prepare("UPDATE logpal_permintaan SET tahap = 9 WHERE id = ?").bind(p).run(), /hanya maju|CHECK/);
  await DB.prepare("UPDATE logpal_permintaan SET tahap = 1 WHERE id = ?").bind(p).run();
  await DB.prepare("UPDATE logpal_permintaan SET ditolak = 1 WHERE id = ?").bind(p).run();
  await assert.rejects(DB.prepare("UPDATE logpal_permintaan SET tahap = 2 WHERE id = ?").bind(p).run(), /hanya maju|ditolak/);   // ditolak tidak bergerak lagi
  await DB.prepare("DELETE FROM logpal_gudang WHERE id = ?").bind(g).run();   // cascade bersih
  assert.equal(await n("logpal_barang"), 0);
  await DB.prepare("DELETE FROM logpal_permintaan WHERE id = ?").bind(p).run();
});

uji("validasi barang murni: cekBarang menolak kelompok asing dan kondisi melebihi jumlah", () => {
  assert.ok(cekBarang(BARANG()).v);
  assert.match(cekBarang(BARANG({kelompok: "Asing"})).g, /kelompok/);
  assert.match(cekBarang(BARANG({jumlah: 5, baik: 4, rusak: 3})).g, /melebihi/);
  assert.match(cekBarang(BARANG({jumlah: -1})).g, /jumlah/);
  assert.match(cekBarang(BARANG({kedaluwarsa: "31/12/2026"})).g, /kedaluwarsa/);
  const aset = cekBarang({barang: "Perahu karet", kelompok: "Peralatan air", jumlah: 8, baik: 6, rr: 1, rb: 1, tahun: 2020, nilai: 95e6});
  assert.equal(aset.v.rusak, 2);
});

/* ================================================================ akses */
uji("akses: akun tanpa hak ditolak, tulis tanpa x-pb ditolak, data kosong untuk yang berhak", async () => {
  assert.equal((await api("GET", P + "data")).s, 401);   // anonim
  const polda = await akun("poldalogpal", {jenis: "polda", tingkat: "prov", wilayah: "Polda Kalteng", kunci_wilayah: "polda62", prov: null, kab: null});
  assert.equal((await GET(polda)).s, 403, "polda bukan BPBD");
  const udara = await staf("Staf Udara", ["udara"]);
  assert.equal((await GET(udara)).s, 403, "staf tanpa peran logistik");
  assert.equal((await api("GET", P + "data", undefined, {"x-admin-token": "gerbang@x:sandi"})).s, 401, "akun gerbang situs bukan moderator");
  A = await akun("bpbdkapuas"); B = await akun("bpbdkatingan", {kab: "Katingan"});
  C = await akun("bpbdkalteng", {jenis: "pemprov", tingkat: "prov", wilayah: "BPBD Provinsi Kalimantan Tengah", kunci_wilayah: "prov62", prov: null, kab: null});
  S = await staf("Staf Logistik", ["pusdalops"]);
  const tanpaPB = await api("POST", P + "gudang", {nama: "Gudang Gelap"}, {...A.h, origin: "http://bnpb.lokal"});
  assert.equal(tanpaPB.s, 403); assert.match(tanpaPB.j.galat, /x-pb/);
  assert.equal((await api("POST", P + "gudang", {nama: "Gudang Gelap"}, {...A.h, origin: "http://asing.example", "x-pb": "1"})).s, 403, "origin lain ditolak");
  for (const x of [A, B, C, S]) { const r = await GET(x); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.gudang, []); }
  assert.equal((await GET(A)).j.peran, "bpbd"); assert.equal((await GET(S)).j.peran, "staf"); assert.equal((await GET(S)).j.proses, true); assert.equal((await GET(A)).j.proses, false);
  assert.equal((await GET(S)).j.super, false, "staf biasa bukan Super Admin");
});

uji("kepemilikan: BPBD A tidak bisa menulis gudang BPBD B; pemprov hanya membaca gudang kabupaten", async () => {
  const a = await POST(A, P + "gudang", {nama: "Gudang BPBD Kapuas", pemilik: "BNPB", prov: "11"}); assert.equal(a.s, 201, a.t); gA = a.j.id;
  const b = await POST(B, P + "gudang", {nama: "Gudang BPBD Katingan"}); assert.equal(b.s, 201, b.t); gB = b.j.id;
  const row = await DB.prepare("SELECT pemilik, prov, akun_id, kab FROM logpal_gudang WHERE id = ?").bind(gA).first();
  assert.deepEqual([row.pemilik, row.prov, row.akun_id, row.kab], ["BPBD", "62", A.id, "Kapuas"], "pemilik, provinsi, dan akun diturunkan dari sesi, bukan dari kiriman");
  const x = await POST(A, P + "barang/" + gA, BARANG()); assert.equal(x.s, 201, x.t); bA = x.j.id;
  const y = await POST(B, P + "barang/" + gB, BARANG({barang: "Selimut", kelompok: "Sandang"})); assert.equal(y.s, 201, y.t);
  /* A menulis gudang B: setiap jalur tulis dijawab 404 dan tidak mengubah apa pun */
  const bB = (await DB.prepare("SELECT id FROM logpal_barang WHERE gudang_id = ?").bind(gB).first()).id;
  assert.equal((await POST(A, P + "barang/" + gB, BARANG())).s, 404);
  assert.equal((await POST(A, P + "ubah/" + bB, BARANG({jumlah: 999}))).s, 404);
  assert.equal((await POST(A, P + "mutasi/" + gB, {tanggal: "2026-11-01", jenis: "Keluar", barang_id: bB, jumlah: 1})).s, 404);
  assert.equal((await POST(A, P + "opname/" + gB, {tanggal: "2026-11-01", petugas: "Budi", baris: [{barang_id: bB, fisik: 0}], disesuaikan: true})).s, 404);
  assert.equal((await stok(bB)).jumlah, 10);
  assert.equal(await n("logpal_mutasi"), 0); assert.equal(await n("logpal_opname"), 0);
  /* A tidak melihat gudang B, B tidak melihat gudang A */
  assert.deepEqual((await GET(A)).j.gudang.map(g => g.id), [gA]); assert.deepEqual((await GET(B)).j.gudang.map(g => g.id), [gB]);
  /* pemprov membaca keduanya tetapi tidak boleh menulis gudang milik akun kabupaten */
  const c = await GET(C); assert.deepEqual(c.j.gudang.map(g => g.id).sort(), [gA, gB].sort()); assert.ok(c.j.gudang.every(g => g.boleh_tulis === false));
  assert.equal((await POST(C, P + "barang/" + gA, BARANG())).s, 403);
  assert.equal((await POST(C, P + "ubah/" + bA, BARANG({jumlah: 999}))).s, 403);
  assert.equal((await stok(bA)).jumlah, 10);
  /* staf BNPB membaca semua, tetapi tidak menulis gudang BPBD */
  assert.equal((await GET(S)).j.gudang.length, 2);
  assert.equal((await POST(S, P + "barang/" + gA, BARANG())).s, 403);
  /* pemkab tidak boleh membuat gudang di provinsi lain walau mengirim prov */
  const luar = await POST(A, P + "gudang", {nama: "Gudang Seberang", prov: "11"}); assert.equal(luar.s, 201);
  assert.equal((await DB.prepare("SELECT prov FROM logpal_gudang WHERE id = ?").bind(luar.j.id).first()).prov, "62");
  const pp = await POST(C, P + "gudang", {nama: "Gudang Seberang Prov", prov: "11"}); assert.equal(pp.s, 403, "pemprov di luar cakupan");
  await DB.prepare("DELETE FROM logpal_gudang WHERE id = ?").bind(luar.j.id).run();
});

/* ================================================================ stok */
uji("stok: mutasi keluar melebihi stok ditolak tanpa baris; masuk, keluar, penghapusan memperbarui stok", async () => {
  const m = (o = {}) => ({tanggal: "2026-11-05", jenis: "Keluar", barang_id: bA, jumlah: 1, lawan: "Kab. Pulang Pisau", moda: "Darat", dokumen: "BAST-1", nilai: 650000, pj: "Rahmat", ...o});
  const lebih = await POST(A, P + "mutasi/" + gA, m({jumlah: 11})); assert.equal(lebih.s, 409, lebih.t); assert.match(lebih.j.galat, /melebihi stok/);
  assert.equal(await n("logpal_mutasi"), 0); assert.deepEqual(await stok(bA), {jumlah: 10, baik: 10, rusak: 0});
  const k = await POST(A, P + "mutasi/" + gA, m({jumlah: 4})); assert.equal(k.s, 201, k.t);
  assert.deepEqual(await stok(bA), {jumlah: 6, baik: 6, rusak: 0});
  assert.equal((await POST(A, P + "mutasi/" + gA, m({jenis: "Masuk", jumlah: 5}))).s, 201); assert.deepEqual(await stok(bA), {jumlah: 11, baik: 11, rusak: 0});
  assert.equal((await POST(A, P + "mutasi/" + gA, m({jenis: "Penghapusan", jumlah: 1, lawan: "Rusak"}))).s, 201); assert.deepEqual(await stok(bA), {jumlah: 10, baik: 10, rusak: 0});
  /* validasi */
  for (const salah of [{jenis: "Pindah"}, {tanggal: "2026-13-40"}, {jumlah: 0}, {jumlah: 1.5}, {barang_id: "xyz"}, {nilai: -1}]) assert.equal((await POST(A, P + "mutasi/" + gA, m(salah))).s, 400, JSON.stringify(salah));
  assert.equal((await POST(A, P + "mutasi/" + gA, m({barang_id: id16()}))).s, 404, "barang yang bukan di gudang ini");
  /* dua penarikan serentak 7 dari stok 10: tepat satu lolos, stok tidak pernah negatif */
  const [r1, r2] = await Promise.all([POST(A, P + "mutasi/" + gA, m({jumlah: 7})), POST(A, P + "mutasi/" + gA, m({jumlah: 7}))]);
  assert.deepEqual([r1.s, r2.s].sort(), [201, 409]);
  assert.deepEqual(await stok(bA), {jumlah: 3, baik: 3, rusak: 0});
  assert.equal(await n("logpal_mutasi", "gudang_id = '" + gA + "'"), 4);
  /* keluar mengambil dari yang baik dulu, lalu yang rusak, tanpa melanggar baik + rusak <= jumlah */
  await DB.prepare("UPDATE logpal_barang SET jumlah = 10, baik = 2, rusak = 8 WHERE id = ?").bind(bA).run();
  assert.equal((await POST(A, P + "mutasi/" + gA, m({jumlah: 5}))).s, 201); assert.deepEqual(await stok(bA), {jumlah: 5, baik: 0, rusak: 5});
  await DB.prepare("UPDATE logpal_barang SET jumlah = 10, baik = 10, rusak = 0 WHERE id = ?").bind(bA).run();
});

uji("diterima: hanya mutasi keluar, tidak melebihi yang dikirim, hanya pemilik gudang", async () => {
  const kel = await DB.prepare("SELECT id, jumlah FROM logpal_mutasi WHERE jenis = 'Keluar' AND gudang_id = ? ORDER BY dibuat LIMIT 1").bind(gA).first();
  const mas = await DB.prepare("SELECT id FROM logpal_mutasi WHERE jenis = 'Masuk' AND gudang_id = ?").bind(gA).first();
  assert.equal((await POST(A, P + "diterima/" + kel.id, {diterima: kel.jumlah + 1})).s, 400);
  assert.equal((await POST(A, P + "diterima/" + mas.id, {diterima: 1})).s, 400);
  assert.equal((await POST(B, P + "diterima/" + kel.id, {diterima: 1})).s, 404);
  assert.equal((await POST(A, P + "diterima/" + kel.id, {diterima: kel.jumlah - 1})).s, 200);
  assert.equal((await DB.prepare("SELECT diterima FROM logpal_mutasi WHERE id = ?").bind(kel.id).first()).diterima, kel.jumlah - 1);
});

uji("opname: menyesuaikan stok dalam satu transaksi, tercatat dari server, barang gudang lain ditolak", async () => {
  const b2 = (await POST(A, P + "barang/" + gA, BARANG({barang: "Matras lipat", kelompok: "Sandang", jumlah: 20, baik: 15, rusak: 5}))).j.id;
  const o = (baris, ekstra = {}) => ({tanggal: "2026-11-06", petugas: "Siti", baris, ...ekstra});
  /* tanpa penyesuaian: stok tetap, selisih dicatat */
  const t1 = await POST(A, P + "opname/" + gA, o([{barang_id: bA, fisik: 8, ket: "dua hilang", tercatat: 9999}, {barang_id: b2, fisik: 20}])); assert.equal(t1.s, 201, t1.t);
  assert.deepEqual(await stok(bA), {jumlah: 10, baik: 10, rusak: 0});
  const br = (await DB.prepare("SELECT barang_id, tercatat, fisik, selisih, ket FROM logpal_opname_baris WHERE opname_id = ?").bind(t1.j.id).all()).results.find(r => r.barang_id === bA);
  assert.deepEqual([br.tercatat, br.fisik, br.selisih, br.ket], [10, 8, -2, "dua hilang"], "tercatat diambil dari stok server, bukan kiriman klien");
  /* dengan penyesuaian: jumlah = fisik, baik dan rusak dijaga */
  const t2 = await POST(A, P + "opname/" + gA, o([{barang_id: bA, fisik: 7}, {barang_id: b2, fisik: 12}], {disesuaikan: true})); assert.equal(t2.s, 201, t2.t);
  assert.deepEqual(await stok(bA), {jumlah: 7, baik: 7, rusak: 0});
  assert.deepEqual(await stok(b2), {jumlah: 12, baik: 12, rusak: 0}, "baik 15 -> 12, rusak 5 -> 0 (baik + rusak <= jumlah)");
  const data = (await GET(A)).j; assert.equal(data.opname.length, 2); assert.equal(data.opname.find(x => x._id === t2.j.id).baris.length, 2);
  /* barang gudang lain: seluruh BA ditolak, stok tidak berubah */
  const bB = (await DB.prepare("SELECT id FROM logpal_barang WHERE gudang_id = ?").bind(gB).first()).id;
  const cur = await n("logpal_opname");
  assert.equal((await POST(A, P + "opname/" + gA, o([{barang_id: bA, fisik: 1}, {barang_id: bB, fisik: 0}], {disesuaikan: true}))).s, 400);
  assert.equal(await n("logpal_opname"), cur); assert.deepEqual(await stok(bA), {jumlah: 7, baik: 7, rusak: 0});
  for (const salah of [o([]), o([{barang_id: bA, fisik: -1}]), o([{barang_id: bA, fisik: 1}, {barang_id: bA, fisik: 2}]), {...o([{barang_id: bA, fisik: 1}]), petugas: ""}, {...o([{barang_id: bA, fisik: 1}]), tanggal: "kemarin"}])
    assert.equal((await POST(A, P + "opname/" + gA, salah)).s, 400, JSON.stringify(salah).slice(0, 80));
});

uji("ubah barang: pemilik mengubah, kolom aset tersimpan lengkap", async () => {
  const id = (await POST(A, P + "barang/" + gA, {barang: "Perahu karet", kelompok: "Peralatan air", satuan: "unit", jumlah: 8, baik: 6, kode_barang: "3.04.01", nup: "5", merek: "Zodiac", seri: "Z-470", tahun: 2020,
    cara: "Pembelian", nilai: 95e6, rr: 1, rb: 1, label: "Permanen", lokasi: "Hanggar 2", dokumen: "BAST-14", sumber_dana: "APBD", batch: "", harga: null, kedaluwarsa: "", kategori: "Perahu", item_standar: "Perahu evakuasi", prioritas: ""})).j.id;
  const x = await DB.prepare("SELECT * FROM logpal_barang WHERE id = ?").bind(id).first();
  assert.deepEqual([x.rusak, x.kode_barang, x.nup, x.merek, x.seri, x.tahun, x.cara, x.nilai, x.rr, x.rb, x.label, x.lokasi, x.dokumen, x.sumber_dana, x.item_standar], [2, "3.04.01", "5", "Zodiac", "Z-470", 2020, "Pembelian", 95e6, 1, 1, "Permanen", "Hanggar 2", "BAST-14", "APBD", "Perahu evakuasi"]);
  assert.equal((await POST(A, P + "ubah/" + id, {label: "Belum", catatan: "dicat ulang"})).s, 200);
  const y = await DB.prepare("SELECT label, catatan, jumlah, merek FROM logpal_barang WHERE id = ?").bind(id).first(); assert.deepEqual(y, {label: "Belum", catatan: "dicat ulang", jumlah: 8, merek: "Zodiac"}, "ubah sebagian");
  assert.equal((await POST(A, P + "ubah/" + id, {jumlah: 1, baik: 5})).s, 400, "baik melebihi jumlah");
  assert.equal((await POST(A, P + "ubah/" + id16(), {jumlah: 1})).s, 404);
});

uji("rumus CSV: teks diawali = + - @ tab CR ditolak di barang, mutasi, dan opname; angka negatif tetap angka", async () => {
  for (const awal of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\tx", "\rx"]) assert.equal(rumus(awal), true, JSON.stringify(awal));
  assert.equal(rumus("Aman =1"), false); assert.equal(rumus(5), false);
  for (const awal of ["=1+1", "+SUM(A1)", "-2+3", "@cmd"]) {
    const x = await POST(A, P + "barang/" + gA, BARANG({barang: "Aman " + awal, merek: awal}));
    assert.equal(x.s, 400, awal); assert.match(x.j.galat, /diawali/);
  }
  assert.equal((await POST(A, P + "gudang", {nama: "=1+1"})).s, 400, "gudang bernama rumus");
  assert.equal((await POST(C, P + "gudang", {nama: "Gudang Aman", prov: "62", kab: "@x"})).s, 400, "kab rumus");
  const pm = (o) => ({jenis: "Penguatan kesiapsiagaan", items: [{barang: "Terpal", jumlah: 1, satuan: "lembar"}], ...o});
  assert.equal((await POST(A, P + "permintaan", pm({items: [{barang: "=1+1", jumlah: 1, satuan: "x"}]}))).s, 400); assert.equal((await POST(A, P + "permintaan", pm({items: [{barang: "Terpal", jumlah: 1, satuan: "+x"}]}))).s, 400);
  for (const k of ["trc", "sk", "status_darurat", "rekomendasi", "kab"]) assert.equal((await POST(S, P + "permintaan", pm({bpbd: "BPBD Uji", provinsi: "Aceh", [k]: "-1+1"}))).s, 400, "permintaan " + k);
  assert.equal((await POST(S, P + "permintaan", pm({bpbd: "=BPBD", provinsi: "Aceh"}))).s, 400); assert.equal((await POST(S, P + "permintaan", pm({bpbd: "BPBD Uji", provinsi: "Aceh"}))).s, 201, "kontrol: isian sah lolos"); await DB.prepare("DELETE FROM logpal_permintaan WHERE akun_id IS NULL AND bpbd = 'BPBD Uji'").run();
  assert.equal((await POST(A, P + "barang/" + gA, BARANG({barang: "=cmd|' /C calc'!A0"}))).s, 400);
  const m = (o) => ({tanggal: "2026-11-05", jenis: "Masuk", barang_id: bA, jumlah: 1, ...o});
  for (const k of ["lawan", "moda", "dokumen", "pj"]) assert.equal((await POST(A, P + "mutasi/" + gA, m({[k]: "=1+1"}))).s, 400, k);
  const cur = await n("logpal_mutasi"); assert.equal((await POST(A, P + "mutasi/" + gA, m({lawan: "Kab. Aman"}))).s, 201); assert.equal(await n("logpal_mutasi"), cur + 1);
  assert.equal((await POST(A, P + "mutasi/" + gA, m({jenis: "Keluar"}))).s, 201);   // kembalikan stok
  const o = (b) => ({tanggal: "2026-11-06", petugas: "Siti", baris: [{barang_id: bA, fisik: 10}], ...b});
  assert.equal((await POST(A, P + "opname/" + gA, o({petugas: "=Siti"}))).s, 400);
  assert.equal((await POST(A, P + "opname/" + gA, o({baris: [{barang_id: bA, fisik: 10, ket: "@x"}]}))).s, 400);
  assert.equal(cekBarang(BARANG({jumlah: 5, nilai: 10})).v.nilai, 10, "angka bukan teks, tidak disaring");
  const js = readFileSync(path.join(AKAR, "public/logpal/logpal.js"), "utf8");
  assert.ok(js.includes("[=+\\-@\\t\\r]"), "klien menetralkan sel CSV berawalan rumus");
});

/* ================================================================ permintaan */
uji("permintaan: alur tahap maju satu langkah, BPBD hanya mengajukan dan melihat miliknya, staf memproses", async () => {
  const badan = (o = {}) => ({jenis: "Tanggap darurat", status_darurat: "Siaga darurat", sk: "SK/1/2026", jiwa: 1200, rekomendasi: "Layak", trc: "TRC-1", items: [{barang: "Selimut", jumlah: 500, satuan: "lembar"}], bpbd: "SAYA BNPB", ...o});
  assert.equal((await POST(A, P + "permintaan", badan({sk: ""}))).s, 400, "tanggap darurat wajib status dan SK");
  assert.equal((await POST(A, P + "permintaan", badan({items: []}))).s, 400);
  assert.equal((await POST(A, P + "permintaan", badan({jenis: "Lain"}))).s, 400);
  assert.equal((await POST(A, P + "permintaan", badan({jenis: ["Tanggap darurat"]}))).s, 400, "jenis bukan string");
  assert.equal((await POST(A, P + "mutasi/" + gA, {tanggal: "2026-11-05", jenis: ["Masuk"], barang_id: bA, jumlah: 1})).s, 400, "jenis mutasi bukan string");
  assert.equal((await POST(A, P + "permintaan", badan({items: [{barang: "Selimut", jumlah: 0, satuan: "x"}]}))).s, 400);
  const r = await POST(A, P + "permintaan", badan()); assert.equal(r.s, 201, r.t); const pid = r.j.id;
  const row = await DB.prepare("SELECT akun_id, bpbd, provinsi, kab, tahap FROM logpal_permintaan WHERE id = ?").bind(pid).first();
  assert.deepEqual([row.akun_id, row.bpbd, row.provinsi, row.kab, row.tahap], [A.id, "BPBD Kabupaten bpbdkapuas", "Kalimantan Tengah", "Kapuas", 0], "pemohon diturunkan dari sesi, bukan nama kiriman");
  const rb = await POST(B, P + "permintaan", badan({tanggap: 1, jenis: "Penguatan kesiapsiagaan", status_darurat: "", sk: ""})); assert.equal(rb.s, 201, rb.t);
  /* kepemilikan baca */
  assert.deepEqual((await GET(A)).j.permintaan.map(p => p._id), [pid]); assert.deepEqual((await GET(B)).j.permintaan.map(p => p._id), [rb.j.id]);
  assert.equal((await GET(C)).j.permintaan.length, 0, "pemprov hanya melihat permintaannya sendiri"); assert.equal((await GET(S)).j.permintaan.length, 2);
  /* BPBD tidak memproses tahap */
  assert.equal((await POST(A, P + "tahap/" + pid, {aksi: "lanjut", petugas: "Budi", dari: 0})).s, 403);
  assert.equal((await POST(C, P + "tahap/" + pid, {aksi: "lanjut", petugas: "Budi", dari: 0})).s, 403);
  /* staf: salah aksi, tanpa petugas, tahap basi */
  assert.equal((await POST(S, P + "tahap/" + pid, {aksi: "loncat", petugas: "Nur", dari: 0})).s, 400);
  assert.equal((await POST(S, P + "tahap/" + pid, {aksi: "lanjut", petugas: "", dari: 0})).s, 400);
  assert.equal((await POST(S, P + "tahap/" + pid, {aksi: "lanjut", petugas: "Nur", dari: 3})).s, 409);
  const alur = FLOW["Tanggap darurat"];
  for (let t = 0; t < alur.length - 1; t++) {
    const x = await POST(S, P + "tahap/" + pid, {aksi: "lanjut", petugas: "Nur", dari: t, catatan: "ok " + t}); assert.equal(x.s, 200, x.t); assert.equal(x.j.tahap, t + 1);
  }
  assert.equal((await POST(S, P + "tahap/" + pid, {aksi: "lanjut", petugas: "Nur", dari: alur.length - 1})).s, 409, "sudah selesai");
  const rw = (await GET(S)).j.permintaan.find(p => p._id === pid).riwayat; assert.deepEqual(rw.map(x => x.tahap), alur, "riwayat satu baris per tahap, termasuk Diajukan");
  /* tolak sekali, lalu berhenti */
  const tl = await POST(S, P + "tahap/" + rb.j.id, {aksi: "tolak", petugas: "Nur", dari: 0, catatan: "stok daerah cukup"}); assert.equal(tl.s, 200, tl.t);
  const sesudah = (await GET(B)).j.permintaan[0]; assert.equal(sesudah.ditolak, true); assert.equal(sesudah.riwayat.at(-1).tahap, "Ditolak");
  assert.equal((await POST(S, P + "tahap/" + rb.j.id, {aksi: "lanjut", petugas: "Nur", dari: 0})).s, 409);
  assert.equal(await n("logpal_tahap", "permintaan_id = '" + rb.j.id + "'"), 2);
});

/* ================================================================ staf BNPB */
uji("staf BNPB: mengelola gudang BNPB, pemilik dipaksa BNPB, kebutuhan hanya untuk staf", async () => {
  const g = await POST(S, P + "gudang", {nama: "Poslog BNPB Kalteng", prov: "62", pemilik: "BPBD", kapasitas_ton: 300}); assert.equal(g.s, 201, g.t);
  assert.deepEqual(await DB.prepare("SELECT pemilik, akun_id, kapasitas_ton FROM logpal_gudang WHERE id = ?").bind(g.j.id).first(), {pemilik: "BNPB", akun_id: null, kapasitas_ton: 300});
  const b = await POST(S, P + "barang/" + g.j.id, BARANG({barang: "Selimut", kelompok: "Sandang", jumlah: 100})); assert.equal(b.s, 201, b.t);
  assert.equal((await POST(S, P + "mutasi/" + g.j.id, {tanggal: "2026-11-07", jenis: "Keluar", barang_id: b.j.id, jumlah: 30, lawan: "BPBD Kapuas"})).s, 201);
  assert.equal((await POST(A, P + "mutasi/" + g.j.id, {tanggal: "2026-11-07", jenis: "Keluar", barang_id: b.j.id, jumlah: 30})).s, 404, "pemkab tidak melihat gudang BNPB, apalagi menulisnya");
  assert.equal((await POST(C, P + "mutasi/" + g.j.id, {tanggal: "2026-11-07", jenis: "Keluar", barang_id: b.j.id, jumlah: 30})).s, 403, "pemprov melihat gudang BNPB di provinsinya tetapi tidak boleh menulis");
  await DB.prepare("INSERT INTO logpal_kebutuhan (no, wilayah, kebutuhan, diajukan, satuan) VALUES (1, 'Aceh', 'Selimut', 5000, 'lembar')").run();
  assert.equal((await GET(S)).j.kebutuhan.length, 1); assert.equal((await GET(A)).j.kebutuhan.length, 0);
  assert.equal((await POST(S, P + "mutasi/" + g.j.id, {tanggal: "2026-11-07", jenis: "Keluar", barang_id: b.j.id, jumlah: 71})).s, 409);
  await DB.prepare("DELETE FROM logpal_kebutuhan").run();
});

/* ================================================================ impor lokal */
uji("impor: skrip menulis SQL idempoten dari JSON gudang, memasangkan akun pemprov, menolak data tak sah dan jalur di dalam repo", async () => {
  const dir = path.join(AKAR, "public/data/logpal"), baca = f => uraiCsv(readFileSync(path.join(dir, f), "utf8"));
  const dokumen = [{berkas: "g1.json", d: {nama: "Gudang BPBD Kalimantan Tengah", pemilik: "BPBD", provinsi: "Kalimantan Tengah", kapasitas_ton: null, items: [
      {id: "b1", barang: "Perahu karet", kelompok: "Peralatan air", satuan: "unit", jumlah: 8, baik: 6, rusak: 2, kedaluwarsa: "", sumber_dana: "APBD", per: "Nov 2026", sumber: "Uji", catatan: "O'Brien \"kutip\"", prioritas: "", kategori: "Perahu", item_standar: "Perahu evakuasi", tahun: 2020, nilai: 9.5e7}]}},
    {berkas: "g2.json", d: {nama: "Poslog Uji Impor", pemilik: "BNPB", provinsi: "Sumatera Utara", kapasitas_ton: 50, items: [{id: "b1", barang: "Selimut", kelompok: "Sandang", satuan: "lembar", jumlah: 100, baik: 100, rusak: 0, kedaluwarsa: "2027-01-31", prioritas: "1"}]}},
    {berkas: "g3.json", d: {nama: "Gudang BPBD Kabupaten Kapuas Uji", pemilik: "BPBD", provinsi: "Kalimantan Tengah", kab: "KAPUAS", kapasitas_ton: null, items: []}}];
  const bangun = d => bangunSql({dokumen: d, provinsi: baca("provinsi.csv"), gudang: uraiCsv(GUDANG_FIX), kelompok: KELOMPOK, batas: TEKS_B, rumus, kini: Date.now()});
  const sql = bangun(dokumen), jalan = async () => { for (const st of pecah(sql)) await DB.prepare(st).run(); };
  await jalan(); await jalan();   // dua kali: INSERT OR IGNORE
  assert.equal(await n("logpal_gudang", "kode IN ('gudang-bpbd-kalimantan-tengah', 'poslog-uji-impor')"), 2); assert.equal(await n("logpal_barang", "gudang_id IN (SELECT id FROM logpal_gudang WHERE kode LIKE '%impor%' OR kode = 'gudang-bpbd-kalimantan-tengah')"), 2);
  const g = await DB.prepare("SELECT akun_id, prov, lon, lat FROM logpal_gudang WHERE kode = 'gudang-bpbd-kalimantan-tengah'").first();
  assert.deepEqual([g.akun_id, g.prov, g.lon, g.lat], [C.id, "62", 113.92, -2.21], "dipasangkan ke akun pemprov aktif provinsi itu; koordinat dari gudang.csv");
  assert.equal((await DB.prepare("SELECT akun_id FROM logpal_gudang WHERE kode = 'poslog-uji-impor'").first()).akun_id, null);
  const gk = await DB.prepare("SELECT akun_id, kab FROM logpal_gudang WHERE kode = 'gudang-bpbd-kabupaten-kapuas-uji'").first();
  assert.deepEqual([gk.akun_id, gk.kab], [A.id, "KAPUAS"], "gudang kab/kota dipasangkan ke akun pemkab wilayah itu, bukan pemprov");
  assert.match((await DB.prepare("SELECT catatan FROM logpal_barang WHERE barang = 'Perahu karet' AND catatan LIKE '%Brien%'").first()).catatan, /O'Brien "kutip"/, "kutip tidak merusak SQL");
  const di = (await GET(C)).j.gudang.find(x => x.nama === "Gudang BPBD Kalimantan Tengah"); assert.equal(di.boleh_tulis, true); assert.equal(di.items.length, 1);
  assert.equal((await POST(C, P + "ubah/" + di.items[0].id, {jumlah: 9})).s, 200, "akun pemprov kini mengelola gudang impor");
  assert.equal((await GET(S)).j.gudang.find(x => x.nama === "Poslog Uji Impor").boleh_tulis, true);
  /* berkas statis (di luar repo) masuk tabel logpal_statis; jangkauan memisahkan jam dan nama gudang dari wilayah publik; kode Papua dibetulkan */
  const dirS = mkdtempSync(path.join(tmpdir(), "lp-statis-"));
  writeFileSync(path.join(dirS, "gudang.csv"), GUDANG_FIX); writeFileSync(path.join(dirS, "wilayah.csv"), WILAYAH_FIX);
  writeFileSync(path.join(dirS, "usulan.csv"), "urutan,titik,provinsi,jam_rata,kab_24,kab_72,pengungsi_24\n1,Titik Uji,Kalimantan Tengah,20,10,20,3000\n");
  writeFileSync(path.join(dirS, "rute.csv"), "provinsi,kab,asal,moda,jam,turun_di,km,lon,lat,g_lon,g_lat\nKalimantan Tengah,Kapuas,Gudang Uji A,Darat,12,Langsung,100,114.4,-3,113.9,-2.2\n");
  writeFileSync(path.join(dirS, "teks.json"), JSON.stringify({catatan: ["Catatan uji satu."], stok_a: "Gudang Uji A", stok_b: "Gudang Uji B", pembanding: "Gudang Uji A dan B"}));
  const statis = susunStatis(dirS); rmSync(dirS, {recursive: true});
  assert.deepEqual(Object.keys(statis).sort(), ["gudang", "jangkauan", "rute", "teks", "usulan"]);
  assert.match(statis.gudang, /Papua Selatan",BPBD,93,/, "kode 96 Papua Selatan dibetulkan ke 93"); assert.equal(statis.jangkauan, "provinsi,kab,gudang_bnpb,jam_bnpb,gudang_semua,jam_semua\nKalimantan Tengah,Kapuas,Gudang Uji A,11.6,Gudang Uji B,7.2\n");
  for (const st of pecah(bangunSql({dokumen: [], provinsi: baca("provinsi.csv"), gudang: [], kelompok: KELOMPOK, statis}))) await DB.prepare(st).run();
  assert.equal(await n("logpal_statis"), 5); assert.match((await DB.prepare("SELECT isi FROM logpal_statis WHERE nama = 'rute'").first()).isi, /^provinsi,kab,asal[\s\S]*\nKalimantan Tengah,Kapuas,Gudang Uji A/, "baris baru CSV terjaga");
  assert.throws(() => bangunSql({dokumen: [], provinsi: [], gudang: [], kelompok: KELOMPOK, statis: {lain: "x"}}), /statis/);
  const keb = uraiCsv("no,wilayah,kebutuhan,diajukan,satuan,sumber_x,sumber_x_teks,sumber_y,sumber_y_teks,setara,status_tetap\n77,Wilayah Uji,Selimut,100,lembar,30,30 lembar,5,5 lembar,1,\n");
  for (const st of pecah(bangunSql({dokumen: [], provinsi: [], gudang: [], kebutuhan: keb, kelompok: KELOMPOK}))) await DB.prepare(st).run();
  assert.deepEqual(await DB.prepare("SELECT stok_a, stok_a_teks, stok_b, stok_b_teks FROM logpal_kebutuhan WHERE no = 77").first(), {stok_a: 30, stok_a_teks: "30 lembar", stok_b: 5, stok_b_teks: "5 lembar"}, "kolom stok dipetakan menurut posisi");
  await DB.prepare("DELETE FROM logpal_kebutuhan WHERE no = 77").run();
  /* data tak sah ditolak sebelum menyentuh D1 */
  const ubah = (f) => structuredClone(dokumen).map((x, i) => (i === 0 && f(x.d), x));
  assert.throws(() => bangun(ubah(d => { d.items[0].kelompok = "Asing"; })), /kelompok/);
  assert.throws(() => bangun(ubah(d => { d.items[0].rusak = 9; })), /melebihi jumlah/);
  assert.throws(() => bangun(ubah(d => { d.provinsi = "Atlantis"; })), /provinsi/);
  assert.throws(() => bangun(ubah(d => { d.items[0].kedaluwarsa = "31/12/2026"; })), /kedaluwarsa/);
  assert.throws(() => bangun(ubah(d => { d.items[0].catatan = "x".repeat(TEKS_B.catatan + 1); })), /catatan/);
  assert.throws(() => bangun(ubah(d => { d.items[0].lokasi = "=HYPERLINK(1)"; })), /lokasi/);
  assert.throws(() => bangun(ubah(d => { d.items[0].barang = "@SUM(A1)"; })), /nama barang/);
  assert.throws(() => bangun([...dokumen, dokumen[0]]), /kembar/);
  /* jalur di dalam repo ditolak, jalur sementara di luar repo lolos */
  assert.equal(diLuarRepo(path.join(AKAR, "data/gudang.sql")), false); assert.equal(diLuarRepo(path.join(AKAR, "public/data/logpal")), false); assert.equal(diLuarRepo(path.join(tmpdir(), "logpal.sql")), true);
  await DB.prepare("DELETE FROM logpal_gudang WHERE kode IN ('gudang-bpbd-kalimantan-tengah', 'poslog-uji-impor')").run();
});

/* ================================================================ dummy */
uji("dummy: hanya Super Admin, isi berangka di semua tab, staf nyata tidak melihat, hapus bersih", async () => {
  const hitung = async () => ({g: await n("logpal_gudang", "dummy = 1"), b: await n("logpal_barang", "dummy = 1"), m: await n("logpal_mutasi", "dummy = 1"), o: await n("logpal_opname", "dummy = 1"), p: await n("logpal_permintaan", "dummy = 1"), k: await n("logpal_kebutuhan", "dummy = 1")});
  assert.equal((await api("POST", P + "dummy", {aksi: "isi"}, {...MOD2, ...PB})).s, 403, "moderator biasa bukan Super Admin");
  assert.equal((await POST(S, P + "dummy", {aksi: "isi"})).s, 403); assert.equal((await POST(A, P + "dummy", {aksi: "isi"})).s, 403);
  assert.equal((await api("POST", P + "dummy", {aksi: "isi"}, ADMIN)).s, 403, "tanpa x-pb");
  assert.equal((await api("POST", P + "dummy", {aksi: "lain"}, {...ADMIN, ...PB})).s, 400);
  const sebelum = (await GET(S)).j.gudang.length;
  const isi = await api("POST", P + "dummy", {aksi: "isi"}, {...ADMIN, ...PB}); assert.equal(isi.s, 201, isi.t);
  assert.equal((await api("POST", P + "dummy", {aksi: "isi"}, {...ADMIN, ...PB})).s, 409, "dummy kedua ditolak");
  const c = await hitung(); for (const [k, v] of Object.entries(c)) assert.ok(v > 0, `tabel ${k} kosong`);
  /* pemeriksaan per tab: tiap sisi yang dibandingkan tidak sama rata, tiap ember terisi */
  const d = (await api("GET", P + "data", undefined, ADMIN)).j;
  assert.equal(d.super, true);
  const items = d.gudang.flatMap(g => g.items);
  assert.ok(items.some(x => x.kedaluwarsa && x.kedaluwarsa < "2026-11-09") && items.some(x => x.kedaluwarsa && x.kedaluwarsa > "2026-11-09"), "kedaluwarsa lewat dan belum");
  assert.ok(items.some(x => x.rusak > 0) && items.some(x => x.kode_barang && x.nup && x.nilai && x.tahun && x.label), "rusak dan aset lengkap");
  assert.ok(items.some(x => x.label === "Belum") && items.some(x => x.label === "Permanen"));
  assert.deepEqual([...new Set(d.mutasi.map(m => m.jenis))].sort(), [...MUTASI].sort());
  const kel = d.mutasi.filter(m => m.jenis === "Keluar"); assert.ok(kel.some(m => m.diterima === null) && kel.some(m => m.diterima === m.jumlah) && kel.some(m => m.diterima != null && m.diterima < m.jumlah), "keluar: belum, penuh, kurang");
  const sel = d.opname.flatMap(o => o.baris.map(b => b.selisih)); assert.ok(sel.some(x => x < 0) && sel.some(x => x > 0) && sel.some(x => x === 0), "opname: kurang, lebih, sesuai");
  assert.ok(d.permintaan.some(p => p.ditolak) && d.permintaan.some(p => !p.ditolak && p.tahap === FLOW[p.jenis].length - 1) && d.permintaan.some(p => !p.ditolak && p.tahap === 0) && d.permintaan.some(p => p.tahap > 0 && p.tahap < 5));
  assert.deepEqual([...new Set(d.permintaan.map(p => p.jenis))].sort(), Object.keys(FLOW).sort());
  assert.ok(d.kebutuhan.length > 0 && d.kebutuhan.some(k => k.setara === "0") && d.kebutuhan.some(k => k.setara === "1"));
  /* staf nyata dan BPBD nyata tidak melihat baris dummy */
  assert.equal((await GET(S)).j.gudang.length, sebelum); assert.equal((await GET(S)).j.permintaan.some(p => p.bpbd.startsWith("[DUMMY]")), false); assert.equal((await GET(C)).j.gudang.some(g => g.nama.startsWith("[DUMMY]")), false);
  const hapus = await api("POST", P + "dummy", {aksi: "hapus"}, {...ADMIN, ...PB}); assert.equal(hapus.s, 200, hapus.t);
  assert.deepEqual(await hitung(), {g: 0, b: 0, m: 0, o: 0, p: 0, k: 0});
  assert.equal(await n("instansi_akun", "username LIKE 'dummylogpal%'"), 0);
  assert.equal((await GET(S)).j.gudang.length, sebelum, "data nyata tidak ikut terhapus");
});

/* ================================================================ bantuan (tab Bantuan, migrasi 0115) */
const BANTUAN_CSV = "provinsi,wilayah,tingkat,tahun,barang,jumlah,satuan,belum_usulkan,catatan\n"
  + "Nusa Tenggara Timur,Provinsi Nusa Tenggara Timur,prov,2026,Mobil Rescue,1,unit,1,\n"
  + "Nusa Tenggara Timur,Flores Timur,kab,2026,Selimut,120,lembar,1,\n"
  + "Nusa Tenggara Timur,Flores Timur,kab,2025,Selimut,30,lembar,1,\n"
  + "Nusa Tenggara Timur,Flores Timur,kab,2026,Tenda Pengungsi,4,set,1,\n"
  + "Nusa Tenggara Timur,Kupang,kab,2026,Terpal,50,lembar,0,\n"
  + "Nusa Tenggara Timur,Kota Kupang,kab,2026,Terpal,70,lembar,1,\n"
  + "Kalimantan Tengah,Kapuas,kab,2025,Family Kit,9,paket,0,\n";
const provCsv = () => uraiCsv(readFileSync(path.join(AKAR, "public/data/logpal/provinsi.csv"), "utf8"));
uji("bantuan: akses per peran, tanpa sesi ditolak, staf nyata tanpa dummy, pemkab Kupang tidak melihat Kota Kupang", async () => {
  assert.equal((await api("GET", P + "bantuan")).s, 401, "tanpa sesi");
  assert.equal((await api("POST", P + "bantuan", {}, {...A.hp})).s, 405, "tidak ada rute tulis");
  const udara = await staf("Staf Udara 2", ["udara"]); assert.equal((await GET(udara, P + "bantuan")).s, 403, "staf tanpa peran logistik");
  /* tabel ada tetapi kosong */
  const kosong = await GET(S, P + "bantuan"); assert.equal(kosong.s, 200); assert.deepEqual(kosong.j.baris, []); assert.equal(kosong.h.get("cache-control"), "private, no-store");
  /* data lewat SQL impor yang sama dengan produksi */
  const sql = bangunSqlBantuan({baris: uraiCsv(BANTUAN_CSV), provinsi: provCsv(), kini: Date.now(), rumus});
  for (const st of sql.split("\n").filter(l => l.startsWith("INSERT"))) await DB.prepare(st).run();
  assert.equal(await n("logpal_bantuan"), 7);
  const NTT = await akun("bpbdntt", {jenis: "pemprov", tingkat: "prov", wilayah: "BPBD Provinsi NTT", kunci_wilayah: "prov53", cakupan: '["53"]', prov: null, kab: null});
  const KUP = await akun("bpbdkupang", {prov: "53", cakupan: '["53"]', kab: "Kupang"}), KOTA = await akun("bpbdkotakupang", {jenis: "pemkot", prov: "53", cakupan: '["53"]', kab: "Kota Kupang"});
  const FLO = await akun("bpbdflotim", {prov: "53", cakupan: '["53"]', kab: "Kab. Flores Timur"});   // awalan "Kab." dinormalkan
  const wil = async a => { const r = await GET(a, P + "bantuan"); assert.equal(r.s, 200, r.t); return [...new Set(r.j.baris.map(b => b.wilayah))].sort(); };
  assert.deepEqual(await wil(S), ["Flores Timur", "Kapuas", "Kota Kupang", "Kupang", "Provinsi Nusa Tenggara Timur"], "staf melihat semua");
  assert.deepEqual(await wil(NTT), ["Flores Timur", "Kota Kupang", "Kupang", "Provinsi Nusa Tenggara Timur"], "pemprov hanya provinsinya");
  assert.deepEqual(await wil(KUP), ["Kupang"], "Kupang tidak melihat Kota Kupang atau baris prov");
  assert.deepEqual(await wil(KOTA), ["Kota Kupang"], "Kota Kupang tidak melihat Kupang");
  assert.deepEqual(await wil(FLO), ["Flores Timur"]);
  assert.deepEqual(await wil(A), ["Kapuas"], "pemkab provinsi lain hanya miliknya"); assert.deepEqual(await wil(B), [], "pemkab tanpa baris: kosong, bukan galat");
  assert.deepEqual(Object.keys((await GET(KUP, P + "bantuan")).j.baris[0]).sort(), ["barang", "belum_usulkan", "catatan", "jumlah", "prov", "provinsi", "satuan", "tahun", "tingkat", "wilayah"], "bentuk baris tanpa id/dummy");
  /* dummy: terisi untuk prov dan kab, 2025 dan 2026, belum_usulkan 0 dan 1; staf nyata tidak melihatnya; hapus bersih tanpa menyentuh baris asli */
  const isi = await api("POST", P + "dummy", {aksi: "isi"}, {...ADMIN, ...PB}); assert.equal(isi.s, 201, isi.t); assert.ok(isi.j.bantuan > 0);
  const d = (await api("GET", P + "bantuan", undefined, ADMIN)).j.baris.filter(b => b.wilayah.startsWith("[DUMMY]"));
  assert.ok(d.length > 10 && new Set(d.map(b => b.tingkat)).size === 2 && new Set(d.map(b => b.tahun)).size === 2 && new Set(d.map(b => b.belum_usulkan)).size === 2, "dummy mengisi tiap kolom");
  assert.ok(["Selimut", "Matras", "Kasur Lipat", "Terpal", "Makanan Siap Saji", "Family Kit"].every(k => d.some(b => b.barang === k)) && d.some(b => !["Selimut", "Matras", "Kasur Lipat", "Terpal", "Makanan Siap Saji", "Family Kit"].includes(b.barang)), "kolom angka dan teks gabungan terisi");
  assert.equal((await wil(S)).some(w => w.startsWith("[DUMMY]")), false, "staf nyata tanpa dummy");
  assert.equal((await wil(NTT)).some(w => w.startsWith("[DUMMY]")), false);
  assert.equal((await api("POST", P + "dummy", {aksi: "hapus"}, {...ADMIN, ...PB})).s, 200);
  assert.equal(await n("logpal_bantuan", "dummy = 1"), 0); assert.equal(await n("logpal_bantuan"), 7, "baris asli utuh");
});

uji("bantuan: CHECK menolak jumlah 0, kunci kembar, tingkat asing; impor menolak CSV di repo dan baris tak sah, SQL aman diulang", async () => {
  const dasar = {id: id16(), prov: "53", provinsi: "Nusa Tenggara Timur", tingkat: "kab", wilayah: "Uji", tahun: 2026, barang: "Terpal", jumlah: 5, satuan: "lembar", belum_usulkan: 0, dibuat: Date.now()};
  await assert.rejects(sisip("logpal_bantuan", {...dasar, jumlah: 0}), /CHECK|constraint/i);
  await assert.rejects(sisip("logpal_bantuan", {...dasar, tingkat: "pusat"}), /CHECK|constraint/i);
  await assert.rejects(sisip("logpal_bantuan", {...dasar, belum_usulkan: 2}), /CHECK|constraint/i);
  await sisip("logpal_bantuan", dasar);
  await assert.rejects(sisip("logpal_bantuan", {...dasar, id: id16()}), /UNIQUE|constraint/i, "kunci (prov, wilayah, tahun, barang) kembar");
  await DB.prepare("DELETE FROM logpal_bantuan WHERE wilayah = 'Uji'").run();
  /* migrasi idempoten */
  for (const st of pecah(readFileSync(path.join(AKAR, "migrations/0115_logpal_bantuan.sql"), "utf8"))) await DB.prepare(st).run();
  /* validasi impor */
  const bangun = csv => bangunSqlBantuan({baris: uraiCsv(csv), provinsi: provCsv(), rumus});
  const K = "provinsi,wilayah,tingkat,tahun,barang,jumlah,satuan,belum_usulkan,catatan\n", ok = "Nusa Tenggara Timur,Belu,kab,2026,Terpal,5,lembar,0,";
  assert.ok(bangun(K + ok + "\n"));
  for (const [salah, re] of [["Atlantis,Belu,kab,2026,Terpal,5,lembar,0,", /provinsi/], ["Nusa Tenggara Timur,Belu,negara,2026,Terpal,5,lembar,0,", /tingkat/], ["Nusa Tenggara Timur,Belu,kab,26,Terpal,5,lembar,0,", /tahun/],
    ["Nusa Tenggara Timur,Belu,kab,2026,Terpal,0,lembar,0,", /jumlah/], ["Nusa Tenggara Timur,Belu,kab,2026,Terpal,1.5,lembar,0,", /jumlah/], ["Nusa Tenggara Timur,Belu,kab,2026,Terpal,-3,lembar,0,", /jumlah/],
    ["Nusa Tenggara Timur,Belu,kab,2026,Terpal,5,lembar,2,", /belum_usulkan/], ["Nusa Tenggara Timur,Belu,kab,2026,=CMD(),5,lembar,0,", /barang/], ["Nusa Tenggara Timur,B,kab,2026,Terpal,5,lembar,0,", /wilayah/], [ok + "\n" + ok, /kembar/]])
    assert.throws(() => bangun(K + salah + "\n"), re, salah);
  assert.throws(() => bangun("provinsi,wilayah\nA,B\n"), /kolom/);
  assert.throws(() => bangun(K), /tanpa baris/);
  /* aman dijalankan dua kali: jumlah tetap, nilai terbaru menang */
  const sql1 = bangun(K + ok + "\n"), sql2 = bangun(K + ok.replace(",5,", ",8,") + "\n"), tulis = async sql => { for (const st of sql.split("\n").filter(l => l.startsWith("INSERT"))) await DB.prepare(st).run(); };
  await tulis(sql1); await tulis(sql1); assert.equal(await n("logpal_bantuan", "wilayah = 'Belu'"), 1);
  await tulis(sql2); assert.equal((await DB.prepare("SELECT jumlah FROM logpal_bantuan WHERE wilayah = 'Belu'").first()).jumlah, 8);
  await DB.prepare("DELETE FROM logpal_bantuan WHERE wilayah = 'Belu'").run();
  /* CLI: CSV di dalam repo ditolak (data asli tidak boleh di repo); di luar repo menghasilkan SQL */
  assert.equal(diLuarRepo(path.join(AKAR, "tests/warga/bantuan.csv")), false);
  const dir = mkdtempSync(path.join(tmpdir(), "bantuan-")); try {
    writeFileSync(path.join(dir, "b.csv"), K + ok + "\n");
    const {spawnSync} = await import("node:child_process"), seed = path.join(dir, "seed"); (await import("node:fs")).mkdirSync(seed);
    const jalan = (...a) => spawnSync(process.execPath, [path.join(AKAR, "scripts/logpal/impor.mjs"), ...a], {encoding: "utf8"});
    const luar = jalan(seed, path.join(dir, "o.sql"), "--bantuan", path.join(dir, "b.csv")); assert.equal(luar.status, 0, luar.stderr); assert.match(readFileSync(path.join(dir, "o.sql"), "utf8"), /INSERT OR REPLACE INTO logpal_bantuan/);
    const dalam = jalan(seed, path.join(dir, "o2.sql"), "--bantuan", path.join(AKAR, "tests/warga/cakupan.json")); assert.equal(dalam.status, 3, "CSV bantuan di dalam repo ditolak"); assert.match(dalam.stderr, /DITOLAK/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

uji("bantuan: klien meringkas per BPBD (jumlah dua tahun, status usulan, teks gabungan) tanpa kata terkirim, diterima, atau stok", () => {
  const html = readFileSync(path.join(AKAR, "public/logpal/index.html"), "utf8"), js = readFileSync(path.join(AKAR, "public/logpal/logpal.js"), "utf8");
  const blok = js.match(/\/\*bantuan-murni\*\/([\s\S]*?)\/\*akhir-bantuan-murni\*\//)[1];
  const f = new Function("BN_KOL", "N", blok + "; return {ringkasBn, teksLainBn};")(["Selimut", "Matras", "Kasur Lipat", "Terpal", "Makanan Siap Saji", "Family Kit"], v => (Number(v) || 0).toLocaleString("id-ID"));
  const B = [{prov: "53", provinsi: "NTT", tingkat: "kab", wilayah: "Flores Timur", tahun: 2026, barang: "Selimut", jumlah: 120, satuan: "lembar", belum_usulkan: true},
    {prov: "53", provinsi: "NTT", tingkat: "kab", wilayah: "Flores Timur", tahun: 2025, barang: "Selimut", jumlah: 30, satuan: "lembar", belum_usulkan: false},
    {prov: "53", provinsi: "NTT", tingkat: "kab", wilayah: "Flores Timur", tahun: 2026, barang: "Tenda Pengungsi", jumlah: 4, satuan: "set", belum_usulkan: true},
    {prov: "53", provinsi: "NTT", tingkat: "prov", wilayah: "Provinsi NTT", tahun: 2026, barang: "Mobil Rescue", jumlah: 1, satuan: "unit", belum_usulkan: false}];
  const semua = f.ringkasBn(B, "", "", false); assert.deepEqual(semua.map(x => x.wilayah), ["Provinsi NTT", "Flores Timur"], "prov dulu, lalu kab");
  assert.equal(semua[1].angka.Selimut, 150, "Semua tahun dijumlah"); assert.equal(f.ringkasBn(B, "", "2025", false)[0].angka.Selimut, 30);
  assert.equal(f.ringkasBn(B, "", "", true).length, 1, "penyaring belum mengusulkan"); assert.equal(f.ringkasBn(B, "62", "", false).length, 0);
  assert.equal(f.teksLainBn(semua[1].lain), "Tenda Pengungsi 4 set");
  const tab = html.slice(html.indexOf('data-tab="bantuan"'), html.indexOf('data-tab="kirim"'));
  assert.ok(tab.length > 500 && /Bantuan peralatan dan logistik/.test(tab) && !/terkirim|diterima|stok|Data tidak tersedia|·/i.test(tab), "label netral, tanpa titik tengah");
  assert.match(html, /data-h="bantuan"[^>]*>Bantuan</); assert.match(js, /const MON=\[[^\]]*'bantuan'\]/); assert.match(js, /if\(h==='bantuan'\)bukaBantuan\(\)/);
  assert.equal((js.match(/bukaBantuan\(\)/g) || []).length, 3, "definisi, klik tab, dan muat ulang sesudah dummy; tidak dimuat saat halaman dibuka");
  assert.match(js, /\$\('bn_prov'\)\.replaceChildren/); assert.ok(!/innerHTML/.test(blok), "isi lewat textContent");
});

/* ================================================================ halaman dan klien */
uji("halaman /instansi/logpal wajib login: anonim ditolak, BPBD aktif, staf berperan, dan admin masuk; data gudang bukan aset publik", async () => {
  const tanpa = async (j, host = "http://bnpb.lokal") => { const x = await U.mf.dispatchFetch(host + j, {redirect: "manual", headers: ipBaru()}); await x.text(); return x; };
  for (const j of ["/instansi/logpal", "/logpal/index.html"]) {
    const x = await tanpa(j); assert.equal(x.status, 303, j); assert.equal(x.headers.get("location"), "/instansi", j);
    assert.equal((await tanpa(j, "https://centurisk97.id")).status, 303, j + " di centurisk97.id tanpa sesi");
  }
  assert.equal((await api("GET", "/logpal/")).s, 404, "/logpal/ lama tidak lagi menyajikan halaman");   // jalur /logpal tanpa garis miring jatuh ke direktori aset uji (EISDIR), bukan perilaku produksi
  for (const j of ["/instansi/logpal", "/logpal/index.html"]) { const x = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {method: "HEAD", redirect: "manual", headers: ipBaru()}); await x.text(); assert.equal(x.status, 303, "HEAD anonim " + j); }
  for (const j of ["/logpal/logpal.js", "/logpal/logpal.css"]) for (const method of ["GET", "HEAD"]) {
    const x = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {method, redirect: "manual", headers: ipBaru()}); await x.text(); assert.equal(x.status, 401, `${method} anonim ${j}`);
  }
  for (const [nama, h] of [["BPBD aktif", A.h], ["staf berperan", S.h], ["admin", ADMIN]]) for (const [j, tipe] of [["/logpal/logpal.js", /javascript/], ["/logpal/logpal.css", /css/]]) {
    const x = await api("GET", j, undefined, h); assert.equal(x.s, 200, `${nama} ${j}`); assert.match(x.h.get("content-type"), tipe); assert.ok(x.t.length > 1000);
  }
  for (const f of ["gudang", "usulan", "rute"]) {
    assert.equal((await api("GET", `/data/logpal/${f}.csv`)).s, 404, `${f}.csv bukan aset publik`);
    assert.equal((await api("GET", `/api/instansi/logpal/statis?nama=${f}`)).s, 401, `${f} tanpa sesi`);
  }
  assert.equal((await api("GET", "/data/logpal/kebutuhan.csv")).s, 404, "data pengajuan tidak di public");
  const udara = await staf("Staf Udara Dua", ["udara"]); assert.equal((await api("GET", "/instansi/logpal", undefined, udara.h)).s, 403, "staf tanpa peran logistik");
  for (const [nama, h] of [["BPBD aktif", A.h], ["staf berperan", S.h], ["admin", ADMIN]]) {
    const x = await api("GET", "/instansi/logpal", undefined, h); assert.equal(x.s, 200, nama); assert.match(x.t, /Inventori LogPal/, nama);
    const csp = x.h.get("content-security-policy") || ""; assert.match(csp, /script-src 'self'(;|$)/, nama + " CSP script-src ketat"); assert.doesNotMatch(csp.match(/script-src[^;]*/)?.[0] || "unsafe-inline", /unsafe-inline/, nama);
    assert.match(x.h.get("cache-control"), /no-store/); assert.match(x.h.get("vary") || "", /cookie/i);
    const st = await api("GET", "/api/instansi/logpal/statis?nama=rute", undefined, h); assert.equal(st.s, 200, nama); assert.match(st.t, /^provinsi,kab,asal/, nama);
    const tk = await api("GET", "/api/instansi/logpal/statis?nama=teks", undefined, h); assert.equal(tk.s, 200); assert.equal(tk.j.stok_a, "Gudang Uji A");
    assert.match((await api("GET", "/api/instansi/logpal/statis?nama=jangkauan", undefined, h)).t, /^provinsi,kab,gudang_bnpb/);
    assert.equal((await api("GET", "/api/instansi/logpal/statis?nama=lain", undefined, h)).s, 400);
  }
  await DB.prepare("DELETE FROM logpal_statis WHERE nama = 'usulan'").run(); assert.equal((await api("GET", "/api/instansi/logpal/statis?nama=usulan", undefined, S.h)).s, 404, "belum diimpor");
  const host = await U.mf.dispatchFetch("https://centurisk97.id/instansi/logpal", {redirect: "manual", headers: {...A.h, ...ipBaru()}}); assert.equal(host.status, 200, "BPBD aktif membuka halaman di centurisk97.id tanpa sesi admin"); await host.text();
  { const x = await U.mf.dispatchFetch("http://bnpb.lokal/instansi/logpal", {redirect: "manual", headers: {cookie: "sesi_instansi=" + "0".repeat(64), ...ipBaru()}}); await x.text(); assert.equal(x.status, 303, "cookie palsu"); }
  const dir = "public/logpal/", html = readFileSync(path.join(AKAR, dir, "index.html"), "utf8"), js = readFileSync(path.join(AKAR, dir, "logpal.js"), "utf8"), css = readFileSync(path.join(AKAR, dir, "logpal.css"), "utf8");
  for (const [nama, isi] of Object.entries({html, js, css})) { assert.ok(!/Pantau Bencana/i.test(isi), `${nama}: tanpa kata terlarang`); assert.ok(!/claude\.(use|ai)/.test(isi), `${nama}: lapisan claude.use harus hilang`); }
  assert.ok(!/<script[^>]*src="https?:/.test(html) && !/<link[^>]*href="https?:\/\/(?!fonts\.g)/.test(html), "d3 dan qrcode dimuat lokal");
  assert.match(html, /<header class="top">/); assert.match(html, /\/inti\/tema\.css/); assert.match(html, /\/vendor\/d3\/d3\.min\.js/); assert.match(html, /\/vendor\/qrcode\/qrcode\.min\.js/);
  assert.match(js, /\/api\/instansi\/logpal\//); assert.match(js, /x-pb/);
  assert.match(js, /'#q-'/, "QR berisi URL situs + hash #q-<gudang>-<barang>"); assert.match(js, /location\.origin/);
  const daftar = nama => new Function("return [" + js.match(new RegExp(`const ${nama}=\\[([\\s\\S]*?)\\];`))[1] + "]")();
  assert.deepEqual(daftar("KEL"), KELOMPOK);
  const flow = new Function("return " + js.match(/const FLOW=(\{[\s\S]*?\});/)[1])(); assert.deepEqual(flow, FLOW);
  /* kecepatan klik dan angka jujur */
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]); assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), [], "id ganda di index.html");
  assert.match(js, /const nanti=/); assert.match(js, /const ulang = \(\.\.\.n\) => nanti\(/); assert.match(js, /if\(mon\)nanti\(dash\._semua\)/); assert.match(js, /tunda\(gambarStok\)/);
  assert.match(js, /Promise\.all\(Object\.entries\(DAF\)/); assert.match(css, /content-visibility:auto/);
  assert.match(js, /timeZone:'Asia\/Jakarta'/); assert.match(js, /const pb=\(v\)=>Math\.min\(100,Math\.max\(0/);
  assert.match(js, /perkiraan \$\{Math\.round/); assert.match(js, /\/1000\)\*1000/); assert.match(js, /KMK 295\/2019/);
  assert.match(html, /data-draw="sumber" data-k="stok"/); assert.match(html, /data-draw="sumber" data-k="kebutuhan"/); assert.ok(!/515|38 ibu kota/.test(html), "angka statis 515 dan 38 diganti dari data");
  assert.match(html, /id="dummy"/); assert.equal((html.match(/data-dummy="/g) || []).length, 2, "dua ikon dummy");
  assert.ok((await api("GET", "/data/logpal/wilayah.csv")).s === 200 && (await api("GET", "/data/logpal/provinsi_peta.json")).s === 200 && (await api("GET", "/data/logpal/provinsi.csv")).s === 200, "wilayah, provinsi, peta tetap statis");
  const wil = (await api("GET", "/data/logpal/wilayah.csv")).t; assert.equal(wil.split("\n")[0], "kode_prov,provinsi,kab,kecamatan,penduduk,pengungsi_rata,lon,lat", "wilayah publik tanpa kolom gudang dan jam");
  assert.ok(!/gudang|poslog|bpba|jam_/i.test(wil), "wilayah publik tidak memuat nama gudang");
  /* nama gudang asli tidak boleh ada di berkas publik atau kode (repo publik) */
  const NAMA_ASLI = /kualanamu|upt padang|\bbpba\b|bpbd sumbar|bpbd sumut|gudang bpbd,? (bali|jawa tengah|papua|maluku|sulawesi tenggara|kepulauan riau|kalimantan utara|di yogyakarta)/i;
  const telusur = d => readdirSync(path.join(AKAR, d), {withFileTypes: true}).flatMap(e => e.isDirectory() ? telusur(path.join(d, e.name)) : /\.(js|html|css|csv|json|sql|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []);
  const bocor = [...telusur("public/logpal"), ...telusur("public/data/logpal"), ...telusur("migrations").filter(f => /logpal/.test(f)), "src/logpal.js", "scripts/logpal/impor.mjs"].filter(f => !/vendor/.test(f) && NAMA_ASLI.test(readFileSync(path.join(AKAR, f), "utf8")));
  assert.deepEqual(bocor, [], "nama gudang asli di berkas repo");
  assert.ok(!readdirSync(path.join(AKAR, "src")).includes("logpal_statis.js"), "data statis tidak lagi dibundel di src");
  assert.match(js, /statis\?nama=gudang/); assert.ok(!/\/data\/logpal\/(gudang|usulan|rute)\.csv/.test(js), "klien memuat gudang, usulan, rute lewat API bersesi");
  assert.match(readFileSync(path.join(AKAR, "public/instansi.html"), "utf8"), /href="\/instansi\/logpal"/, "tertaut dari Ruang Instansi");
});

/* ================================================================ statis besar (migrasi 0113) dan tab Pengantaran */
uji("statis besar: potongan berurutan dirakit, nama asing 400, tanpa sesi 401, belum diimpor 404", async () => {
  const mig = readFileSync(path.join(AKAR, "migrations/0113_logpal_potongan.sql"), "utf8");
  for (const s of pecah(mig)) await DB.prepare(s).run();   // diulang di atas migrasi yang sudah jalan: IF NOT EXISTS
  const sy = "/api/instansi/logpal/statis?nama=";
  for (const nm of ["matriks", "kecamatan", "terdampak"]) {
    assert.equal((await api("GET", sy + nm, undefined, S.h)).s, 404, nm + " belum diimpor");
    assert.equal((await api("GET", sy + nm)).s, 401, nm + " tanpa sesi");
  }
  assert.equal((await api("GET", sy + "lain", undefined, S.h)).s, 400);
  /* isi >> 90 KB, ada kutip tunggal, kutip ganda, baris baru, dan karakter di luar BMP, supaya pemotongan diuji nyata */
  const baris = Array.from({length: 9000}, (_, i) => `${i},O'Brien "kutip",Kab ${i} \u{1F30A} é,${(i * 7.31).toFixed(2)}`);
  const kecamatan = "i,nama,kab,nilai\n" + baris.join("\n") + "\n";
  const matriks = JSON.stringify({gudang: [{nama: "Gudang Uji", lon: 1, lat: 2}], jam: Array.from({length: 60}, (_, i) => Array.from({length: 150}, (_, k) => [i + k / 10, null, 5.5]))});
  const terdampak = "kode_prov,provinsi,kab,kec,kk,jiwa,status,per\n62,Kalimantan Tengah,Kapuas,A;B,10,40,Belum surut,8 Nov 2026\n";
  const potong = potongTeks(kecamatan); assert.ok(potong.length >= 4, "kecamatan butuh banyak potongan");
  assert.equal(potong.join(""), kecamatan, "potongan bersambung kembali utuh");
  const sql = bangunSql({dokumen: [], provinsi: [], gudang: [], kelompok: KELOMPOK, statis: {kecamatan, matriks, terdampak}});
  const stmt = pecah(sql); assert.ok(stmt.length > 6);
  for (const s of stmt) assert.ok(Buffer.byteLength(s) <= 100000, "pernyataan SQL melewati batas D1 100 KB: " + Buffer.byteLength(s));
  for (const p of potongTeks(matriks)) assert.ok(p.length <= BATAS_POTONG);
  const kecil = await n("logpal_statis"), jalan = async () => { for (const s of stmt) await DB.prepare(s).run(); };
  await jalan(); await jalan();   // diulang: potongan lama dihapus dulu, tidak dobel
  assert.equal(await n("logpal_statis_potong", "nama = 'kecamatan'"), potong.length);
  assert.equal(await n("logpal_statis_potong", "length(isi) > 90000"), 0);
  assert.equal(await n("logpal_statis"), kecil, "logpal_statis (nama kecil) tidak tersentuh oleh nama besar");
  /* urutan rusak (potongan hilang) terdeteksi, bukan dirakit diam-diam; diuji SEBELUM ada hasil sukses karena hasil sukses dimemo 10 menit per isolat */
  await DB.prepare("DELETE FROM logpal_statis_potong WHERE nama = 'kecamatan' AND urut = 1").run();
  assert.equal((await api("GET", sy + "kecamatan", undefined, S.h)).s, 500, "potongan bolong");
  await jalan();   // pulihkan
  for (const [h, nama] of [[A.h, "BPBD aktif"], [S.h, "staf"], [ADMIN, "admin"]]) {
    const k = await api("GET", sy + "kecamatan", undefined, h); assert.equal(k.s, 200, nama); assert.equal(k.t, kecamatan, nama + ": dirakit sama persis"); assert.match(k.h.get("content-type"), /text\/csv/); assert.match(k.h.get("cache-control"), /private, no-store/);
    const m = await api("GET", sy + "matriks", undefined, h); assert.equal(m.s, 200); assert.match(m.h.get("content-type"), /json/); assert.equal(m.t, matriks); assert.equal(m.j.gudang[0].nama, "Gudang Uji");
    assert.equal((await api("GET", sy + "terdampak", undefined, h)).t, terdampak);
  }
  /* sesudah sukses, jawaban datang dari memo: baris D1 yang hilang tidak terlihat sampai TTL habis (ponytail di src/logpal.js) */
  await DB.prepare("DELETE FROM logpal_statis_potong WHERE nama = 'terdampak'").run();
  assert.equal((await api("GET", sy + "terdampak", undefined, S.h)).t, terdampak, "memo melayani");
  assert.equal((await api("GET", sy + "terdampak")).s, 401, "memo tidak melewati gerbang sesi");
  /* CHECK: nama asing dan isi terlalu besar ditolak */
  await assert.rejects(sisip("logpal_statis_potong", {nama: "gudang", urut: 0, isi: "x", diubah: 1}), /CHECK|constraint/i);
  await assert.rejects(sisip("logpal_statis_potong", {nama: "matriks", urut: 70, isi: "x", diubah: 1}), /CHECK|constraint/i);
  await assert.rejects(sisip("logpal_statis_potong", {nama: "matriks", urut: 5, isi: "x".repeat(90001), diubah: 1}), /CHECK|constraint/i);
  await DB.prepare("DELETE FROM logpal_statis_potong").run();
  /* terlalu banyak potongan ditolak saat membangun SQL, sebelum DELETE (CHECK urut 0..59) */
  assert.throws(() => bangunSql({dokumen: [], provinsi: [], gudang: [], kelompok: KELOMPOK, statis: {kecamatan: "x".repeat(BATAS_POTONG * 61)}}), /melebihi 60/);
  assert.doesNotThrow(() => bangunSql({dokumen: [], provinsi: [], gudang: [], kelompok: KELOMPOK, statis: {kecamatan: "x".repeat(BATAS_POTONG * 59)}}));
});

uji("impor statis besar: folder di dalam repo ditolak, folder luar menghasilkan potongan", async () => {
  const { spawnSync } = await import("node:child_process");
  const luar = mkdtempSync(path.join(tmpdir(), "lp-besar-")), seed = path.join(luar, "seed"), keluar = path.join(luar, "o.sql");
  const jalankan = (...a) => spawnSync(process.execPath, [path.join(AKAR, "scripts/logpal/impor.mjs"), ...a], {encoding: "utf8"});
  try {
    const di = jalankan(path.join(AKAR, "public/data/logpal"), keluar); assert.equal(di.status, 3, "folder seed di dalam repo");
    assert.match(di.stderr, /DITOLAK/);
    assert.equal(jalankan(luar, path.join(AKAR, "o.sql")).status, 3, "keluaran di dalam repo");
    assert.equal(jalankan(luar, keluar, "--statis", path.join(AKAR, "public/data/logpal")).status, 3, "folder statis di dalam repo");
    writeFileSync(path.join(luar, "matriks.json"), JSON.stringify({gudang: [], x: "y".repeat(200000)}));
    writeFileSync(path.join(luar, "kecamatan.csv"), "a,b\n1,2\n"); writeFileSync(path.join(luar, "terdampak.csv"), "kode_prov,kab\n62,Kapuas\n");
    const { mkdirSync } = await import("node:fs"); mkdirSync(seed);
    const ok = jalankan(seed, keluar, "--statis", luar); assert.equal(ok.status, 0, ok.stderr);
    const sql = readFileSync(keluar, "utf8");
    assert.match(sql, /DELETE FROM logpal_statis_potong WHERE nama = 'matriks'/); assert.ok((sql.match(/INSERT INTO logpal_statis_potong \(nama, urut/g) || []).length >= 5);
    for (const s of pecah(sql)) assert.ok(Buffer.byteLength(s) <= 100000);
    writeFileSync(path.join(luar, "matriks.json"), "bukan json");
    assert.notEqual(jalankan(seed, keluar, "--statis", luar).status, 0, "matriks.json rusak ditolak");
  } finally { rmSync(luar, {recursive: true, force: true}); }
});

uji("tab Pengantaran: rencana kirim murni (urutan tiba, stok terbatas, truk) dan klien memakai data bersesi", () => {
  const html = readFileSync(path.join(AKAR, "public/logpal/index.html"), "utf8"), js = readFileSync(path.join(AKAR, "public/logpal/logpal.js"), "utf8"), css = readFileSync(path.join(AKAR, "public/logpal/logpal.css"), "utf8");
  const blok = js.match(/\/\*kirim-murni\*\/([\s\S]*?)\/\*akhir-kirim-murni\*\//)[1];
  const K0 = {m: {gudang: [{nama: "Jauh", pemilik: "BNPB", provinsi: "X", status: "ada"}, {nama: "Dekat", pemilik: "BNPB", provinsi: "X", status: "ada"}, {nama: "Tutup", pemilik: "BNPB", provinsi: "X", status: "tutup"}],
      jam: [[[10, null, null]], [[2, null, 1]], [[1, null, null]]], bandara: [["Bandara", "Sipil"]], tni: [["Lanud", 50, ""]]},
    kec: [{kode_prov: "62", kab: "Kapuas", kec: "Selat", km_akhir: "35", jauh: "0", _i: 0}, {kode_prov: "62", kab: "Kapuas", kec: "Basarang", km_akhir: "20", jauh: "1", _i: 0}]};
  K0.ix = new Map([["62|kapuas", K0.kec]]);
  const G = {a: {pemilik: "BNPB", nama: "Dekat", provinsi: "X", items: [{barang: "Selimut", item_standar: "Selimut", baik: 600}, {barang: "Selimut", item_standar: "Selimut", baik: 100}, {barang: "Tenda", item_standar: "Tenda pengungsi", baik: 4}]},
    b: {pemilik: "BNPB", nama: "Jauh", provinsi: "X", items: [{barang: "Selimut", item_standar: "Selimut", baik: 5000}]}};
  const f = new Function("K0", "G", "klasifikasi", blok + "; return {rencanaK, tibaK, idsK, jamT, cariKec, tayangK, normK, akhirK, tampilK, stokK, tglK};")(K0, G, () => ({item_standar: ""}));
  assert.deepEqual(f.idsK("semua"), [0, 1], "gudang tutup tidak dihitung");
  const t = f.tibaK(1, K0.kec[0]); assert.deepEqual([t.moda, t.utama, t.akhir, t.total], ["Darat", 2, 1, 6], "2 jam utama + 3 jam muat + 1 jam antar (35 km / 35)");
  assert.equal(f.akhirK(K0.kec[1]), 1, "kecamatan jauh dari jalan: 20 km per jam");
  const r = f.rencanaK(K0.kec[0], 1000, 8, "semua");
  assert.deepEqual(r.P.map(x => x.g.nama), ["Dekat", "Jauh"], "gudang tercepat dulu, lalu yang berikutnya menutup kekurangan");
  const sel = r.B.find(b => b.n === "Selimut"); assert.deepEqual([sel.kb, sel.pn, sel.kr, sel.asal.join()], [1000, 1000, 0, "Dekat,Jauh"]);
  assert.deepEqual([r.P[0].m.Selimut, r.P[1].m.Selimut], [700, 300], "stok Dekat habis 700, sisanya dari Jauh");
  const tenda = r.B.find(b => b.n === "Tenda pengungsi"); assert.deepEqual([tenda.kb, tenda.pn, tenda.kr], [42, 4, 38], "stok kurang: kekurangan dilaporkan");
  assert.equal(r.P[0].truk, Math.ceil(r.P[0].ton / 8)); assert.equal(f.rencanaK(K0.kec[0], 1000, 8, "semua").B.find(b => b.n === "Genset").pn, 0, "stok tidak tercatat: terpenuhi 0");
  assert.deepEqual([K0.m.gudang[0], K0.m.gudang[1], K0.m.gudang[2]].map(f.tampilK), [true, true, false], "gudang tanpa stok tampil di G (Tutup) tidak dianggap terlihat");
  assert.equal(f.stokK(K0.m.gudang[1]), f.stokK(K0.m.gudang[1]), "stok dimemo per gudang"); assert.equal(f.stokK(K0.m.gudang[1]).Selimut, 700);
  assert.equal(f.tglK("2026-11-08"), "8 Nov"); assert.equal(f.tglK(""), "–");
  assert.equal(f.jamT(30), "30 jam"); assert.equal(f.jamT(72), "3 hari"); assert.equal(f.jamT(null), "–");
  assert.equal(f.cariKec("62", "KAPUAS", "ba-sarang").kec, "Basarang", "padanan nama longgar"); assert.equal(f.cariKec("62", "Kapuas", "tidak ada").kec, "Selat", "tanpa padanan kecamatan: yang pertama"); assert.equal(f.cariKec("62", "Lain", "x"), undefined);
  /* terdampak: ambang 14 hari seperti TDm.tayang */
  const doc = {baris: [{kab: "A", status: "Belum surut", tanggal: "2026-11-05"}, {kab: "B", status: "Sudah surut", tanggal: "2026-10-20"}, {kab: "C", status: "Belum surut", tanggal: "2026-10-20"}, {kab: "D", status: "Belum diketahui", tanggal: "2026-11-08"}, {kab: "E", status: "Sudah surut", tanggal: "2026-11-09"}]};
  assert.deepEqual(f.tayangK(doc, "2026-11-09").map(b => b.kab), ["A", "E"], "lebih tua dari 14 hari dan Belum diketahui tidak tampil");
  /* kabel layar */
  assert.match(html, /data-h="kirim"[^>]*>Pengantaran/); assert.match(html, /data-tab="kirim"/); assert.match(js, /const MON=\['stok','standar','kebutuhan','jaringan','kirim','bantuan'\]/);
  assert.match(js, /if\(h==='kirim'\)bukaKirim\(\)/); assert.match(js, /statis\?nama='\+n/); assert.match(js, /'matriks',1/); assert.match(js, /\/banjir\/data\/terdampak\.json/);
  assert.ok(!/fetch\('data\//.test(js) && !/\/data\/logpal\/(matriks|kecamatan|terdampak)/.test(js), "data besar hanya lewat API bersesi");
  assert.equal((js.match(/bukaKirim\(\)/g) || []).length, 2, "hanya definisi dan satu pemanggil (klik tab), tidak dimuat saat halaman dibuka");
  assert.match(js, /perlu izin TNI AU/); assert.match(js, /jalankanK\(c,jw,/); assert.match(js, /Menghitung rencana\./); assert.match(js, /K0\.ix\.get\(/); assert.match(js, /clientWidth!==K0\.lebar/); assert.match(html, /perkiraan 3 jam|Perkiraan tiba/); assert.match(html, /gudang yang boleh dilihat akun ini/);
  assert.ok(!/garis lurus|belum memakai jaringan jalan/i.test(html), "kalimat tab Jaringan tidak lagi menyebut garis lurus");
  assert.match(html, /rute darat, laut, dan udara[^<]*belum dikonfirmasi operator angkutan/i);
  const kirimHtml = html.slice(html.indexOf('data-tab="kirim"'), html.indexOf('data-p="input"')); assert.ok(kirimHtml.length > 1000 && !/·|Pantau Bencana|Bapak/.test(kirimHtml));
  /* data besar tidak di repo */
  for (const nm of ["matriks.json", "kecamatan.csv", "terdampak.csv"]) assert.equal(readdirSync(path.join(AKAR, "public/data/logpal")).includes(nm), false, nm + " bukan aset publik");
});
