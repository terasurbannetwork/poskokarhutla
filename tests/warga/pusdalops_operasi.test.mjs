/* Uji integrasi modul operasi Pusdalops Gelombang 2 (src/pemulihan.js, src/lapsus.js, src/rollcall.js; migrasi 0096).
   Worker + D1 sungguhan di Miniflare, migrasi apa adanya; tanpa mock. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

const uji = test;
const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "e".repeat(64), TOK_LUAR = "f".repeat(64), TOK_LAJU = "9".repeat(64), TOK_WIL = "8".repeat(64);
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-pusdalops-operasi"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12)},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  for (const [id, un, tok, peran] of [["a1a1a1a1a1a1a1a1", "pdopsa", TOK, '["koordalops"]'], ["a2a2a2a2a2a2a2a2", "kampusb", TOK_LUAR, '["kemitraan"]'], ["a3a3a3a3a3a3a3a3", "pdlaju", TOK_LAJU, '["pimpinan"]'], ["a4a4a4a4a4a4a4a4", "pdwil", TOK_WIL, '["pusdalops"]']])
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, ?, 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, "3000" + id.slice(1, 2) + "000", un + "@b.id", "62813000000" + id.slice(1, 2) + "0", peran, id.startsWith("a4") ? '["11"]' : "[]"),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const orig = {origin: "http://pdops.lokal"}, ADMIN = {"x-admin-token": "rahasia-admin", ...orig};
const hdr = t => ({cookie: "sesi_staf=" + t, "x-pb": "1", ...orig}), STAF = hdr(TOK), LUAR = hdr(TOK_LUAR), LAJU = hdr(TOK_LAJU);
const call = async (m, j, h = STAF, b) => { const r = await mf.dispatchFetch("http://pdops.lokal" + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b === undefined ? undefined : JSON.stringify(b)}); return {status: r.status, cc: r.headers.get("cache-control"), j: await r.json().catch(() => null)}; };
const n = async t => (await DB.prepare(`SELECT count(*) n FROM ${t}`).first()).n;
const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const TABEL = ["pemulihan", "pemulihan_progres", "lapsus_operasi", "lapsus_prov", "lapsus_tim", "lapsus_kejadian", "lapsus_entri", "rollcall_sesi", "rollcall_peserta"];

uji("pusdalops operasi: gerbang staf, tanpa sesi/peran salah 403 di semua rute sebelum body", async () => {
  const rute = [["POST", "/api/pusdalops/pemulihan"], ["POST", "/api/pusdalops/pemulihan/progres"], ["GET", "/api/pusdalops/pemulihan"], ["GET", "/api/pusdalops/pemulihan/ringkasan"], ["GET", "/api/pusdalops/pemulihan/" + "a".repeat(16)], ["POST", "/api/pusdalops/pemulihan/dummy"],
    ["POST", "/api/pusdalops/lapsus"], ["POST", "/api/pusdalops/lapsus/provinsi"], ["POST", "/api/pusdalops/lapsus/tim"], ["POST", "/api/pusdalops/lapsus/kejadian"], ["POST", "/api/pusdalops/lapsus/entri"], ["POST", "/api/pusdalops/lapsus/status"], ["GET", "/api/pusdalops/lapsus"], ["GET", "/api/pusdalops/lapsus/" + "a".repeat(16)], ["POST", "/api/pusdalops/lapsus/dummy"],
    ["POST", "/api/pusdalops/rollcall"], ["GET", "/api/pusdalops/rollcall"], ["GET", "/api/pusdalops/rollcall/ringkasan"], ["GET", "/api/pusdalops/rollcall/" + "a".repeat(16)], ["POST", "/api/pusdalops/rollcall/dummy"]];
  const sebelum = await Promise.all(TABEL.map(n));
  for (const [m, j] of rute) for (const h of [orig, LUAR]) { const r = await call(m, j, h, m === "POST" ? {x: 1} : undefined); assert.equal(r.status, 403, `${m} ${j}`); }
  assert.deepEqual(await Promise.all(TABEL.map(n)), sebelum, "tak ada tulisan");
  for (const j of ["/api/pusdalops/pemulihan/dummy", "/api/pusdalops/lapsus/dummy", "/api/pusdalops/rollcall/dummy"]) assert.equal((await call("POST", j, STAF, {aksi: "isi"})).status, 403, "staf biasa bukan Super Admin: " + j);
});

uji("pemulihan: buat, progres, daftar, rincian, ringkasan per kab/jenis", async () => {
  const dasar = {jenis: "huntara", kab: "11|Aceh Tamiang", desa: "Kampung Dalam", lat: 4.25, lon: 98.05, target: 100, satuan: "unit", pelaksana: "PT Contoh Bangun", sumber_dana: "APBN BNPB", status: "berjalan", mulai: "2026-09-01"};
  const a = await call("POST", "/api/pusdalops/pemulihan", STAF, dasar); assert.equal(a.status, 201, JSON.stringify(a.j));
  assert.equal(a.j.pemulihan.realisasi, 0); assert.equal(a.j.pemulihan.dummy, false); assert.equal(a.cc, "no-store");
  const b = await call("POST", "/api/pusdalops/pemulihan", STAF, {...dasar, desa: "Sekerak", lat: undefined, lon: undefined, target: 50, realisasi: 10}); assert.equal(b.status, 201);
  await call("POST", "/api/pusdalops/pemulihan", STAF, {jenis: "sumur_bor", kab: "11|Aceh Tamiang", target: 5, satuan: "titik"});
  const p = await call("POST", "/api/pusdalops/pemulihan/progres", STAF, {id: a.j.pemulihan.id, realisasi: 40, catatan: "dinding terpasang"}); assert.equal(p.status, 201, JSON.stringify(p.j));
  assert.equal(p.j.pemulihan.realisasi, 40); assert.equal(p.j.pemulihan.status, "berjalan");
  const s = await call("POST", "/api/pusdalops/pemulihan/progres", STAF, {id: a.j.pemulihan.id, realisasi: 100, status: "selesai", tgl: hariIni()}); assert.equal(s.j.pemulihan.status, "selesai"); assert.equal(s.j.pemulihan.selesai, hariIni());
  const r = await call("GET", "/api/pusdalops/pemulihan/" + a.j.pemulihan.id); assert.equal(r.status, 200); assert.equal(r.j.progres.length, 3, "catatan awal + 2 progres"); assert.deepEqual(r.j.progres.map(x => x.realisasi), [0, 40, 100]);
  const d = await call("GET", "/api/pusdalops/pemulihan?kab=" + encodeURIComponent("11|Aceh Tamiang") + "&jenis=huntara"); assert.equal(d.j.pemulihan.length, 2); assert.ok(d.j.pemulihan.every(x => x.jenis === "huntara"));
  assert.equal((await call("GET", "/api/pusdalops/pemulihan?status=selesai")).j.pemulihan.length, 1);
  const g = await call("GET", "/api/pusdalops/pemulihan/ringkasan?prov=11"); const h = g.j.ringkasan.find(x => x.jenis === "huntara");
  assert.equal(h.item, 2); assert.equal(h.target, 150); assert.equal(h.realisasi, 110); assert.equal(h.persen, 73.3); assert.equal(h.selesai, 1); assert.equal(h.berjalan, 1); assert.equal(h.berkoordinat, 1);
  assert.equal(g.j.ringkasan.find(x => x.jenis === "sumur_bor").persen, 0);
  assert.equal((await call("GET", "/api/pusdalops/pemulihan/ringkasan?prov=zz")).status, 400);
  assert.equal((await call("GET", "/api/pusdalops/pemulihan/" + "b".repeat(16))).status, 404);
});

uji("pemulihan: input buruk ditolak 400 dan tak menulis", async () => {
  const ok = {jenis: "huntap", kab: "11|Aceh Tamiang", target: 10, satuan: "unit"}, sebelum = await n("pemulihan");
  for (const [x, ket] of [[{jenis: "gedung"}, "jenis"], [{kab: "Aceh Tamiang"}, "kab tanpa prov"], [{kab: "99|Entah"}, "prov tak dikenal"], [{target: -1}, "target negatif"], [{target: "10"}, "target string"], [{realisasi: 11}, "realisasi > target"], [{lat: 4.2}, "lat tanpa lon"], [{lat: 50, lon: 98}, "lat luar Indonesia"],
    [{status: "mungkin"}, "status"], [{satuan: ""}, "satuan kosong"], [{pelaksana: "Bapak Budi 0812-3456-7890"}, "nomor HP di pelaksana"], [{pelaksana: "budi@contoh.id"}, "surel"], [{catatan: "a".repeat(501)}, "catatan panjang"], [{mulai: "2026-13-40"}, "tanggal ngawur"],
    [{mulai: "2026-10-10", selesai: "2026-10-01"}, "selesai < mulai"], [{kejadian_id: "xyz"}, "kejadian_id bentuk"], [{desa: "x\u0000y"}, "kontrol"]])
    { const r = await call("POST", "/api/pusdalops/pemulihan", STAF, {...ok, ...x}); assert.equal(r.status, 400, ket + " " + JSON.stringify(r.j)); }
  assert.equal((await call("POST", "/api/pusdalops/pemulihan", STAF, {...ok, kejadian_id: "c".repeat(16)})).status, 404, "kejadian tidak ada");
  assert.equal((await call("POST", "/api/pusdalops/pemulihan/progres", STAF, {id: "c".repeat(16), realisasi: 1})).status, 404);
  assert.equal((await call("POST", "/api/pusdalops/pemulihan/progres", STAF, {id: "bukan", realisasi: 1})).status, 400);
  assert.equal(await n("pemulihan"), sebelum);
  const a = (await call("POST", "/api/pusdalops/pemulihan", STAF, ok)).j.pemulihan;
  assert.equal((await call("POST", "/api/pusdalops/pemulihan/progres", STAF, {id: a.id, realisasi: 11})).status, 400, "progres > target tanpa yakin");
  assert.equal((await call("POST", "/api/pusdalops/pemulihan/progres", STAF, {id: a.id, realisasi: 11, yakin: true})).status, 201);
  assert.equal((await call("POST", "/api/pusdalops/pemulihan/progres", STAF, {id: a.id, realisasi: 5, status: "batal"})).status, 400);
});

uji("lapsus: operasi > provinsi > tim > kejadian, entri harian, penanda basi", async () => {
  const kej = await call("POST", "/api/logbook/kejadian", STAF, {jenis: "banjir", kab: "11|Aceh Tamiang", mulai: hariIni(), mengungsi_jiwa: 10}); assert.equal(kej.status, 201, JSON.stringify(kej.j));
  const o = await call("POST", "/api/pusdalops/lapsus", STAF, {nama: "Operasi Siklon Senyar", jenis: "banjir", mulai: hariIni(), provinsi: ["11", "12"]}); assert.equal(o.status, 201, JSON.stringify(o.j));
  const id = o.j.operasi.id, ent = (x = {}) => call("POST", "/api/pusdalops/lapsus/entri", STAF, {operasi_id: id, ...x});
  assert.equal((await call("POST", "/api/pusdalops/lapsus/provinsi", STAF, {operasi_id: id, prov: "13"})).status, 201);
  assert.equal((await call("POST", "/api/pusdalops/lapsus/provinsi", STAF, {operasi_id: id, prov: "13"})).status, 200, "dobel tidak error");
  const t1 = await call("POST", "/api/pusdalops/lapsus/tim", STAF, {operasi_id: id, prov: "11", nama: "Tim A BNPB"}); assert.equal(t1.status, 201);
  assert.equal((await call("POST", "/api/pusdalops/lapsus/tim", STAF, {operasi_id: id, prov: "11", nama: "Tim A BNPB"})).status, 409);
  assert.equal((await call("POST", "/api/pusdalops/lapsus/tim", STAF, {operasi_id: id, prov: "14", nama: "Tim Z"})).status, 400, "provinsi belum ditambahkan");
  assert.equal((await call("POST", "/api/pusdalops/lapsus/tim", STAF, {operasi_id: id, prov: "11", nama: "Tim 0812 3456 7890"})).status, 400, "nomor HP di nama tim");
  /* kejadian logbook di prov 11 */
  const tk = await call("POST", "/api/pusdalops/lapsus/kejadian", STAF, {operasi_id: id, kejadian_id: kej.j.kejadian.id, tim_id: t1.j.tim.id}); assert.equal(tk.status, 201, JSON.stringify(tk.j));
  assert.equal((await call("POST", "/api/pusdalops/lapsus/kejadian", STAF, {operasi_id: id, kejadian_id: "d".repeat(16)})).status, 404);
  const KEB = [{kelompok: "peralatan", barang: "Sekop", jumlah: 2400, satuan: "buah"}, {kelompok: "logistik", barang: "Tenda", jumlah: 80, satuan: "unit"}];
  const lama = Date.now() - 3 * 864e5;
  assert.equal((await ent({kab: "11|Aceh Tamiang", waktu_data: lama, kebutuhan: KEB, layanan: {bbm: {status: "padam"}}})).status, 201);
  const baru = await ent({kab: "11|Aceh Tamiang", kebutuhan: KEB, layanan: {bbm: {status: "terganggu", catatan: "antre SPBU"}, sinyal: {status: "padam"}, listrik: {status: "normal"}, air: {status: "terganggu"}}, catatan: "hari ke-15"}); assert.equal(baru.status, 201, JSON.stringify(baru.j));
  assert.equal(baru.j.entri.basi, false);
  assert.equal((await ent({kab: "12|Tapanuli Tengah", waktu_data: Date.now() - 30 * 36e5, layanan: {air: {status: "normal"}}})).status, 201);
  const d = await call("GET", "/api/pusdalops/lapsus/" + id); assert.equal(d.status, 200); assert.equal(d.cc, "no-store");
  assert.equal(d.j.provinsi.length, 3); const a = d.j.provinsi.find(p => p.prov === "11");
  assert.equal(a.tim.length, 1); assert.equal(a.kejadian.length, 1); assert.equal(a.kejadian[0].jenis, "banjir"); assert.equal(a.kab.length, 1, "terkini per kab"); assert.equal(a.kab[0].layanan.bbm.status, "terganggu"); assert.equal(a.kab[0].basi, false); assert.equal(a.kab[0].kebutuhan[0].jumlah, 2400);
  const b = d.j.provinsi.find(p => p.prov === "12").kab[0]; assert.equal(b.basi, true); assert.ok(b.umur_jam >= 30); assert.equal(d.j.jumlah_basi, 1); assert.equal(d.j.basi_jam, 24);
  const l = await call("GET", "/api/pusdalops/lapsus"); assert.equal(l.j.operasi.find(x => x.id === id).jumlah_entri, 3);
  /* entri buruk */
  const sebelum = await n("lapsus_entri");
  for (const [x, ket] of [[{kab: "11|Aceh Tamiang"}, "kosong"], [{kab: "14|Rokan Hilir", layanan: {air: {status: "normal"}}}, "prov belum terdaftar (400)"], [{kab: "11|Aceh Tamiang", layanan: {listrik: {status: "mati"}}}, "status"], [{kab: "11|Aceh Tamiang", layanan: {gas: {status: "normal"}}}, "indikator asing"],
    [{kab: "11|Aceh Tamiang", layanan: {air: {status: "normal", catatan: "hubungi 08123456789"}}}, "HP di catatan"], [{kab: "11|Aceh Tamiang", kebutuhan: [{kelompok: "x", barang: "a", jumlah: 1, satuan: "u"}]}, "kelompok"], [{kab: "11|Aceh Tamiang", kebutuhan: [{kelompok: "dana", barang: "a", jumlah: 0, satuan: "u"}]}, "jumlah 0"],
    [{kab: "11|Aceh Tamiang", kebutuhan: [{kelompok: "dana", barang: "a@b.id", jumlah: 1, satuan: "u"}]}, "surel"], [{kab: "11|Aceh Tamiang", layanan: {air: {status: "normal"}}, waktu_data: Date.now() + 36e5}, "masa depan"], [{kab: "11|Aceh Tamiang", layanan: {air: {status: "normal"}}, waktu_data: Date.now() - 90 * 864e5}, "terlalu lama"], [{kab: "11 Aceh", layanan: {air: {status: "normal"}}}, "kunci wilayah"]])
    { const r = await ent(x); assert.equal(r.status, 400, ket + " " + JSON.stringify(r.j)); }
  assert.equal(await n("lapsus_entri"), sebelum);
  assert.equal((await call("POST", "/api/pusdalops/lapsus", STAF, {nama: "x", jenis: "banjir", mulai: hariIni()})).status, 400, "nama pendek");
  assert.equal((await call("POST", "/api/pusdalops/lapsus", STAF, {nama: "Operasi", jenis: "ufo", mulai: hariIni()})).status, 400, "jenis");
  assert.equal((await call("POST", "/api/pusdalops/lapsus", STAF, {nama: "Operasi", jenis: "banjir", mulai: hariIni(), provinsi: ["11", "11"]})).status, 400, "provinsi dobel");
  /* operasi selesai menolak tulis, bisa dibuka lagi */
  assert.equal((await call("POST", "/api/pusdalops/lapsus/status", STAF, {operasi_id: id, status: "selesai"})).status, 200);
  assert.equal((await ent({kab: "11|Aceh Tamiang", layanan: {air: {status: "normal"}}})).status, 409);
  assert.equal((await call("POST", "/api/pusdalops/lapsus/status", STAF, {operasi_id: id, status: "aktif"})).status, 200);
  assert.equal((await ent({kab: "11|Aceh Tamiang", layanan: {air: {status: "normal"}}})).status, 201);
  assert.equal((await call("GET", "/api/pusdalops/lapsus/" + "e".repeat(16))).status, 404);
});

uji("rollcall: sesi per tanggal dan slot, dobel 409, ringkasan ketaatan bulanan", async () => {
  const P = hasil => [{kategori: "bpbd_prov", prov: "11", hasil}, {kategori: "bpbd_kab", kab: "11|Aceh Tamiang", hasil: "hadir"}, {kategori: "komunitas", nama: "ORARI Aceh", prov: "11", hasil: "gangguan"}];
  const t = hariIni(), a = await call("POST", "/api/pusdalops/rollcall", STAF, {tgl: t, slot: "pagi", peserta: P("hadir")}); assert.equal(a.status, 201, JSON.stringify(a.j)); assert.equal(a.j.sesi.peserta, 3);
  assert.equal((await call("POST", "/api/pusdalops/rollcall", STAF, {tgl: t, slot: "pagi", peserta: P("hadir")})).status, 409);
  assert.equal(await n("rollcall_peserta WHERE sesi_id NOT IN (SELECT id FROM rollcall_sesi)"), 0);
  const b = await call("POST", "/api/pusdalops/rollcall", STAF, {tgl: t, slot: "malam", peserta: P("tidak")}); assert.equal(b.status, 201);
  const d = await call("GET", "/api/pusdalops/rollcall?bulan=" + t.slice(0, 7)); assert.equal(d.j.sesi.length, 2); const pagi = d.j.sesi.find(x => x.slot === "pagi"); assert.equal(pagi.dipanggil, 3); assert.equal(pagi.hadir, 2); assert.equal(pagi.gangguan, 1);
  const r = await call("GET", "/api/pusdalops/rollcall/" + a.j.sesi.id); assert.equal(r.j.peserta.length, 3); assert.equal(r.j.sesi.slot, "pagi");
  const g = await call("GET", "/api/pusdalops/rollcall/ringkasan?bulan=" + t.slice(0, 7)); assert.equal(g.j.sesi, 2); assert.equal(g.j.hari, 1);
  const kp = g.j.per_kategori.find(x => x.kategori === "bpbd_prov"); assert.equal(kp.dipanggil, 2); assert.equal(kp.hadir, 1); assert.equal(kp.persen, 50);
  const kab = g.j.per_peserta.find(x => x.kab === "Aceh Tamiang"); assert.equal(kab.persen, 100); assert.equal(g.j.per_peserta.find(x => x.nama === "ORARI Aceh").gangguan, 2);
  assert.equal((await call("GET", "/api/pusdalops/rollcall/ringkasan?bulan=2026-13")).status, 400);
  assert.equal((await call("GET", "/api/pusdalops/rollcall/ringkasan?bulan=2020-01")).j.sesi, 0);
  const sebelum = await n("rollcall_sesi");
  for (const [x, ket] of [[{slot: "subuh"}, "slot"], [{tgl: "2999-01-01"}, "masa depan"], [{tgl: "2026-02-30"}, "tanggal ngawur"], [{peserta: []}, "kosong"], [{peserta: "x"}, "bukan larik"], [{peserta: [{kategori: "bpbd_prov", prov: "11", hasil: "ada"}]}, "hasil"],
    [{peserta: [{kategori: "radio", prov: "11", hasil: "hadir"}]}, "kategori"], [{peserta: [{kategori: "bpbd_kab", kab: "Aceh", hasil: "hadir"}]}, "kab tanpa prov"], [{peserta: [{kategori: "bpbd_prov", prov: "99", hasil: "hadir"}]}, "prov asing"],
    [{peserta: [{kategori: "komunitas", prov: "11", hasil: "hadir"}]}, "komunitas tanpa nama"], [{peserta: [{kategori: "komunitas", nama: "Budi 081234567890", prov: "11", hasil: "hadir"}]}, "HP"],
    [{peserta: [{kategori: "bpbd_prov", prov: "11", hasil: "hadir"}, {kategori: "bpbd_prov", prov: "11", hasil: "tidak"}]}, "peserta dobel"], [{peserta: Array.from({length: 151}, (_, i) => ({kategori: "komunitas", nama: "K" + i + "x", prov: "11", hasil: "hadir"}))}, "terlalu banyak"]])
    { const q = await call("POST", "/api/pusdalops/rollcall", STAF, {tgl: "2026-10-01", slot: "siang", peserta: P("hadir"), ...x}); assert.equal(q.status, 400, ket + " " + JSON.stringify(q.j)); }
  assert.equal(await n("rollcall_sesi"), sebelum);
});

uji("pusdalops operasi: batas laju tulis per pelaku (120/jam) dan 429", async () => {
  let kode = 0;
  for (let i = 0; i < 125 && kode !== 429; i++) kode = (await call("POST", "/api/pusdalops/pemulihan", LAJU, {jenis: "lainnya", kab: "11|Aceh Tamiang", target: 1, satuan: "unit"})).status;
  assert.equal(kode, 429); assert.ok(await n("pemulihan WHERE oleh LIKE '%'") > 100);
});

uji("pusdalops operasi: dummy hanya Super Admin, isi lalu hapus bersih, ganda 409", async () => {
  const awal = await Promise.all(TABEL.map(n));
  const tbl = async () => Promise.all(["pemulihan", "lapsus_operasi", "rollcall_sesi"].map(t => n(`${t} WHERE dummy = 1`)));
  for (const m of ["pemulihan", "lapsus", "rollcall"]) {
    const u = `/api/pusdalops/${m}/dummy`;
    assert.equal((await call("POST", u, ADMIN, {aksi: "ngawur"})).status, 400);
    const i = await call("POST", u, ADMIN, {aksi: "isi"}); assert.equal(i.status, 201, m + JSON.stringify(i.j));
    assert.equal((await call("POST", u, ADMIN, {aksi: "isi"})).status, 409, "dummy ganda");
  }
  assert.ok((await tbl()).every(x => x > 0));
  const d = await call("GET", "/api/pusdalops/lapsus"); const op = d.j.operasi.find(x => x.dummy); assert.ok(op, "operasi dummy tampil bertanda"); const r = (await call("GET", "/api/pusdalops/lapsus/" + op.id)).j;
  assert.ok(r.provinsi.length >= 3 && r.jumlah_basi >= 2, "dummy memuat data basi"); assert.ok(r.provinsi.every(p => p.tim.length), "tim per provinsi");
  assert.ok((await call("GET", "/api/pusdalops/rollcall/ringkasan")).j.per_kategori.length === 3, "dummy roll call tampil di ringkasan bulan ini");
  for (const m of ["pemulihan", "lapsus", "rollcall"]) assert.equal((await call("POST", `/api/pusdalops/${m}/dummy`, ADMIN, {aksi: "hapus"})).status, 200);
  assert.deepEqual(await tbl(), [0, 0, 0]);
  assert.equal(await n("pemulihan_progres WHERE pemulihan_id NOT IN (SELECT id FROM pemulihan)"), 0);
  for (const t of ["lapsus_prov", "lapsus_tim", "lapsus_kejadian", "lapsus_entri"]) assert.equal(await n(`${t} WHERE operasi_id NOT IN (SELECT id FROM lapsus_operasi)`), 0, t + " yatim");
  assert.equal(await n("rollcall_peserta WHERE sesi_id NOT IN (SELECT id FROM rollcall_sesi)"), 0);
  /* baris nyata tetap utuh */
  assert.ok((await n("pemulihan")) > 0 && (await n("rollcall_sesi")) >= 2 && awal[2] >= 1);
});

uji("pusdalops operasi: migrasi 0096 idempoten; tanpa tabel rute 503 jelas, rute lain tak terpengaruh", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations", "0096_pusdalops_operasi.sql"), "utf8"), sebelum = await n("pemulihan");
  await DB.batch(pecah(sql).map(s => DB.prepare(s))); assert.equal(await n("pemulihan"), sebelum, "jalan ulang tak menghapus data");
  for (const t of ["rollcall_peserta", "rollcall_sesi", "lapsus_entri", "lapsus_kejadian", "lapsus_tim", "lapsus_prov", "lapsus_operasi", "pemulihan_progres", "pemulihan"]) await DB.exec(`DROP TABLE ${t}`);
  for (const [m, j, b] of [["GET", "/api/pusdalops/pemulihan"], ["GET", "/api/pusdalops/pemulihan/ringkasan"], ["POST", "/api/pusdalops/pemulihan", {jenis: "huntara", kab: "11|Aceh Tamiang", target: 1, satuan: "unit"}], ["GET", "/api/pusdalops/lapsus"], ["POST", "/api/pusdalops/lapsus", {nama: "Operasi X", jenis: "banjir", mulai: hariIni()}],
    ["GET", "/api/pusdalops/rollcall"], ["GET", "/api/pusdalops/rollcall/ringkasan"], ["POST", "/api/pusdalops/rollcall", {tgl: hariIni(), slot: "pagi", peserta: [{kategori: "bpbd_prov", prov: "11", hasil: "hadir"}]}], ["POST", "/api/pusdalops/rollcall/dummy", {aksi: "isi"}]]) {
    const r = await call(m, j, m === "POST" && j.endsWith("dummy") ? ADMIN : STAF, b); assert.equal(r.status, 503, m + " " + j); assert.match(r.j.galat, /migrasi 0096/);
  }
  assert.equal((await call("GET", "/api/logbook/buka?kab=" + encodeURIComponent("11|Aceh Tamiang"))).status, 200, "logbook tak terpengaruh");
  assert.equal((await call("GET", "/api/pusdalops/pemulihan", orig)).status, 403, "gerbang staf tetap lebih dulu daripada 503");
  await DB.batch(pecah(sql).map(s => DB.prepare(s)));
  assert.equal((await call("GET", "/api/pusdalops/pemulihan")).status, 200);
});

uji("pusdalops operasi: teks bebas memakai saringan kuat (NFKC, sela, surel lebar penuh)", async () => {
  const dasar = {jenis: "huntap", kab: "11|Aceh Tamiang", target: 10, satuan: "unit"}, sebelum = await n("pemulihan");
  for (const x of ["0812/3456/789", "0812_3456_789", "０８１２３４５６７８９０", "budi＠contoh.id", "hubungi 0812 3456 7890"]) {
    const r = await call("POST", "/api/pusdalops/pemulihan", STAF, {...dasar, pelaksana: x}); assert.equal(r.status, 400, x + JSON.stringify(r.j));
  }
  assert.equal(await n("pemulihan"), sebelum);
  assert.equal((await call("POST", "/api/pusdalops/pemulihan", STAF, {...dasar, pelaksana: "PT Contoh 2026/112"})).status, 201, "nomor pendek tetap sah");
});

uji("pusdalops operasi: staf berwilayah hanya menulis di provinsinya (403 provinsi lain), baca bebas", async () => {
  const W = hdr(TOK_WIL), ok = {jenis: "huntap", target: 10, satuan: "unit"}, sebelum = await n("pemulihan");
  assert.equal((await call("POST", "/api/pusdalops/pemulihan", W, {...ok, kab: "33|Cilacap"})).status, 403);
  assert.equal(await n("pemulihan"), sebelum);
  const a = await call("POST", "/api/pusdalops/pemulihan", W, {...ok, kab: "11|Aceh Tamiang"}); assert.equal(a.status, 201);
  const luar = (await call("POST", "/api/pusdalops/pemulihan", STAF, {...ok, kab: "33|Cilacap"})).j.pemulihan;
  assert.equal((await call("POST", "/api/pusdalops/pemulihan/progres", W, {id: luar.id, realisasi: 1})).status, 403);
  assert.equal((await call("POST", "/api/pusdalops/pemulihan/progres", W, {id: a.j.pemulihan.id, realisasi: 1})).status, 201);
  assert.equal((await call("GET", "/api/pusdalops/pemulihan/" + luar.id, W)).status, 200);
  /* lapsus */
  assert.equal((await call("POST", "/api/pusdalops/lapsus", W, {nama: "Operasi Dua", jenis: "banjir", mulai: hariIni(), provinsi: ["11", "12"]})).status, 403, "satu provinsi di luar wilayah");
  assert.equal((await call("POST", "/api/pusdalops/lapsus", W, {nama: "Operasi Tanpa Prov", jenis: "banjir", mulai: hariIni()})).status, 403, "tanpa provinsi hanya nasional");
  const o = await call("POST", "/api/pusdalops/lapsus", STAF, {nama: "Operasi Gabungan", jenis: "banjir", mulai: hariIni(), provinsi: ["11", "12"]}); const id = o.j.operasi.id;
  assert.equal((await call("POST", "/api/pusdalops/lapsus/status", W, {operasi_id: id, status: "selesai"})).status, 403, "operasi lintas provinsi");
  assert.equal((await call("POST", "/api/pusdalops/lapsus/provinsi", W, {operasi_id: id, prov: "13"})).status, 403);
  assert.equal((await call("POST", "/api/pusdalops/lapsus/tim", W, {operasi_id: id, prov: "12", nama: "Tim X"})).status, 403);
  assert.equal((await call("POST", "/api/pusdalops/lapsus/tim", W, {operasi_id: id, prov: "11", nama: "Tim Wil"})).status, 201);
  assert.equal((await call("POST", "/api/pusdalops/lapsus/entri", W, {operasi_id: id, kab: "12|Tapanuli Tengah", layanan: {air: {status: "normal"}}})).status, 403);
  assert.equal((await call("POST", "/api/pusdalops/lapsus/entri", W, {operasi_id: id, kab: "11|Aceh Tamiang", layanan: {air: {status: "normal"}}})).status, 201);
  const kej = (await call("POST", "/api/logbook/kejadian", STAF, {jenis: "banjir", kab: "12|Tapanuli Tengah", mulai: hariIni(), mengungsi_jiwa: 1})).j.kejadian;
  assert.equal((await call("POST", "/api/pusdalops/lapsus/kejadian", W, {operasi_id: id, kejadian_id: kej.id})).status, 403);
  /* rollcall */
  const rc = (tgl, prov) => call("POST", "/api/pusdalops/rollcall", W, {tgl, slot: "siang", peserta: [{kategori: "bpbd_prov", prov: "11", hasil: "hadir"}, {kategori: "bpbd_prov", prov, hasil: "hadir"}]});
  assert.equal((await rc("2026-09-01", "12")).status, 403);
  assert.equal((await call("POST", "/api/pusdalops/rollcall", W, {tgl: "2026-09-01", slot: "siang", peserta: [{kategori: "bpbd_prov", prov: "11", hasil: "hadir"}]})).status, 201);
  /* admin tak berwilayah */
  assert.equal((await call("POST", "/api/pusdalops/pemulihan", ADMIN, {...ok, kab: "33|Cilacap"})).status, 201);
});
