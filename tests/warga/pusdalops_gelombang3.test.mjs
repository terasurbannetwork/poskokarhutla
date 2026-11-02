/* Uji integrasi Pusdalops Gelombang 3 (G1 wajib tutup, G2 papan SK aktif, G3 peringatan berantai, G4 antrean medsos; migrasi 0098).
   Worker + D1 sungguhan di Miniflare, migrasi apa adanya; indeks diperiksa dengan EXPLAIN QUERY PLAN di node:sqlite. Tanpa mock. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";
import {buatPengingat} from "../../src/pengingat.js";
import {POLA, BERLAKU_HARI} from "../../src/berantai.js";

const uji = test;
const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "1".repeat(64), TOK_LUAR = "2".repeat(64), TOK_LAJU = "3".repeat(64), TOK_WIL = "4".repeat(64);
const HARI = 864e5;
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-pusdalops-g3"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12)},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  for (const [id, un, tok, peran] of [["b1b1b1b1b1b1b1b1", "g3staf", TOK, '["koordalops"]'], ["b2b2b2b2b2b2b2b2", "g3kampus", TOK_LUAR, '["kemitraan"]'], ["b3b3b3b3b3b3b3b3", "g3laju", TOK_LAJU, '["pimpinan"]'], ["b4b4b4b4b4b4b4b4", "g3wil", TOK_WIL, '["pusdalops"]']])
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, ?, 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, "4000" + id.slice(1, 2) + "000", un + "@b.id", "62814000000" + id.slice(1, 2) + "0", peran, id.startsWith("b4") ? '["33"]' : "[]"),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const orig = {origin: "http://g3.lokal"}, ADMIN = {"x-admin-token": "rahasia-admin", ...orig};
const hdr = t => ({cookie: "sesi_staf=" + t, "x-pb": "1", ...orig}), STAF = hdr(TOK), LUAR = hdr(TOK_LUAR), LAJU = hdr(TOK_LAJU), WIL = hdr(TOK_WIL);
const call = async (m, j, h = STAF, b) => { const r = await mf.dispatchFetch("http://g3.lokal" + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b === undefined ? undefined : JSON.stringify(b)}); return {status: r.status, cc: r.headers.get("cache-control"), j: await r.json().catch(() => null)}; };
const n = async t => (await DB.prepare(`SELECT count(*) n FROM ${t}`).first()).n;
const hariIni = () => new Date().toISOString().slice(0, 10), hariWIB = (d = 0) => new Date(Date.now() + 7 * 36e5 + d * HARI).toISOString().slice(0, 10);
const kejadian = async (kab, jenis = "longsor", h = STAF, tambah = {}) => { const r = await call("POST", "/api/logbook/kejadian", h, {jenis, kab, mulai: hariIni(), md: 1, ...tambah}); assert.equal(r.status, 201, JSON.stringify(r.j)); return r.j.kejadian.id; };
const TUTUP = {tgl_tuntas: hariIni(), kondisi_akhir: "Air surut dan warga kembali ke rumah"};
const TABEL = ["logbook_tutup", "berantai_peringatan", "medsos_butir"];

uji("gelombang 3: gerbang staf, tanpa sesi/peran salah 403 di semua rute baru dan tanpa tulisan", async () => {
  const id = "a".repeat(16);
  const rute = [["POST", `/api/logbook/kejadian/${id}/tutup`], ["GET", "/api/logbook/sk/aktif"], ["GET", "/api/pusdalops/berantai?aktif=1"], ["POST", "/api/pusdalops/berantai/dummy"],
    ["POST", "/api/pusdalops/medsos"], ["POST", "/api/pusdalops/medsos/verifikasi"], ["GET", "/api/pusdalops/medsos"], ["GET", "/api/pusdalops/medsos/jeda"], ["POST", "/api/pusdalops/medsos/dummy"]];
  const sebelum = await Promise.all(TABEL.map(n));
  for (const [m, j] of rute) for (const h of [orig, LUAR]) assert.equal((await call(m, j, h, m === "POST" ? TUTUP : undefined)).status, 403, `${m} ${j}`);
  for (const j of ["/api/pusdalops/berantai/dummy", "/api/pusdalops/medsos/dummy"]) assert.equal((await call("POST", j, STAF, {aksi: "isi"})).status, 403, "staf biasa bukan Super Admin: " + j);
  assert.deepEqual(await Promise.all(TABEL.map(n)), sebelum);
});

uji("G1 tutup: tgl_tuntas dan kondisi_akhir wajib, tersimpan, kejadian lama tetap sah, buka menandai perlu_tutup", async () => {
  const id = await kejadian("33|Magelang", "kekeringan"), u = `/api/logbook/kejadian/${id}/tutup`, bad = async b => { const r = await call("POST", u, STAF, b); assert.equal(r.status, 400, JSON.stringify(b) + JSON.stringify(r.j)); };
  await bad({}); await bad({tgl_tuntas: hariIni()}); await bad({kondisi_akhir: "Selesai ditangani"});
  await bad({...TUTUP, tgl_tuntas: "2026-02-30"}); await bad({...TUTUP, tgl_tuntas: hariWIB(2)}); await bad({...TUTUP, kondisi_akhir: "ab"}); await bad({...TUTUP, kondisi_akhir: "x".repeat(301)});
  await bad({...TUTUP, kondisi_akhir: "hubungi 0812 3456 7890"}); await bad({...TUTUP, kondisi_akhir: "kontak budi@contoh.id"}); await bad({...TUTUP, kondisi_akhir: "ada\u0007kontrol"});
  await bad({...TUTUP, tgl_tuntas: new Date(Date.now() - 3 * HARI).toISOString().slice(0, 10)});   // sebelum mulai (hari ini)
  assert.equal((await DB.prepare("SELECT status FROM logbook_kejadian WHERE id = ?").bind(id).first()).status, "buka", "400 tidak menutup");
  assert.equal(await n("logbook_tutup"), 0);
  const ok = await call("POST", u, STAF, TUTUP); assert.equal(ok.status, 200, JSON.stringify(ok.j)); assert.equal(ok.j.tgl_tuntas, TUTUP.tgl_tuntas); assert.equal(ok.j.tutup_detail, undefined);
  const r = await DB.prepare("SELECT * FROM logbook_tutup WHERE kejadian_id = ?").bind(id).first(); assert.equal(r.kondisi_akhir, TUTUP.kondisi_akhir); assert.match(r.oleh, /^staf:/);
  assert.equal((await call("POST", u, STAF, TUTUP)).status, 409); assert.equal((await call("POST", "/api/logbook/kejadian/ffffffffffffffff/tutup", STAF, TUTUP)).status, 404);
  /* kejadian lama: sudah tutup, tanpa baris logbook_tutup, tetap sah dan tak bisa ditutup lagi */
  const lama = await kejadian("33|Magelang", "lainnya"); await DB.prepare("UPDATE logbook_kejadian SET status = 'tutup' WHERE id = ?").bind(lama).run();
  assert.equal(await n(`logbook_tutup WHERE kejadian_id = '${lama}'`), 0); assert.equal((await call("POST", `/api/logbook/kejadian/${lama}/tutup`, STAF, TUTUP)).status, 409);
  /* perlu_tutup: tanpa entri baru > 7 hari */
  const a = await kejadian("33|Wonosobo"), b = await kejadian("33|Wonosobo", "banjir");
  await DB.prepare("UPDATE logbook_kejadian SET terakhir = ? WHERE id = ?").bind(Date.now() - 8 * HARI, a).run(); await DB.prepare("UPDATE logbook_kejadian SET terakhir = ? WHERE id = ?").bind(Date.now() - 6 * HARI, b).run();
  const bk = (await call("GET", "/api/logbook/buka?kab=" + encodeURIComponent("33|Wonosobo"))).j.kejadian; assert.equal(bk.find(x => x.id === a).perlu_tutup, true); assert.equal(bk.find(x => x.id === b).perlu_tutup, false);
  /* wilayah: staf berwilayah 33 tetap boleh menutup kejadiannya; hanya staf kampus (peran lain) ditolak di uji gerbang */
});

uji("G1 pengingat: tingkat 24 jam, 72 jam, lalu 7 hari tanpa tutup", async () => {
  const k = await kejadian("33|Kebumen"), kini = Date.now(), env = {DB, ASSETS: {fetch: async () => new Response("", {status: 404})}};
  const daftar = async () => (await DB.prepare("SELECT keadaan, judul, rincian FROM pengingat WHERE jenis = 'logbook_lanjutan' AND sumber_id = ?").bind(k).all()).results;
  const tua = j => DB.prepare("UPDATE logbook_kejadian SET terakhir = ? WHERE id = ?").bind(kini - j * 3600e3, k).run();
  await tua(30); await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]}); assert.match((await daftar())[0].keadaan, /^h1:/);
  await tua(80); await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]}); assert.match((await daftar())[0].keadaan, /^h3:/);
  await tua(170); await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]});
  const d = await daftar(); assert.equal(d.length, 1); assert.match(d[0].keadaan, /^h7:/); assert.match(d[0].judul, /7 hari/); assert.match(d[0].rincian, /tanggal tuntas dan kondisi akhir/);
});

uji("G2 papan SK aktif: hanya yang masih berlaku, tanda kejadian selesai / tanpa entri > 7 hari, ringkasan, terpotong", async () => {
  const sk = (kid, tingkat, wilayah, nomor, mulai, selesai) => call("POST", `/api/logbook/kejadian/${kid}/sk`, STAF, {tingkat, wilayah, nomor, tmt_mulai: mulai, tmt_selesai: selesai});
  const hijau = await kejadian("33|Purworejo"), tutup = await kejadian("33|Purworejo", "banjir"), basi = await kejadian("13|Agam", "banjir"), lewat = await kejadian("13|Agam", "longsor");
  await DB.prepare("UPDATE logbook_kejadian SET status = 'tutup' WHERE id = ?").bind(tutup).run(); await DB.prepare("UPDATE logbook_kejadian SET terakhir = ? WHERE id = ?").bind(Date.now() - 9 * HARI, basi).run();
  const mulai = hariWIB(-10);
  for (const [k, t, w, no, s] of [[hijau, "tanggap", "prov", "G2/HIJAU", hariWIB(5)], [tutup, "siaga", "kab", "G2/TUTUP", hariWIB(0)], [basi, "tanggap", "kab", "G2/BASI", null], [lewat, "transisi", "kab", "G2/LEWAT", hariWIB(-1)]]) assert.equal((await sk(k, t, w, no, mulai, s)).status, 201, no);
  const r = await call("GET", "/api/logbook/sk/aktif"); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.cc, "no-store");
  const per = Object.fromEntries(r.j.sk.map(x => [x.nomor, x])), nomor = r.j.sk.map(x => x.nomor);
  assert.ok(!nomor.includes("G2/LEWAT"), "SK yang sudah lewat tidak tampil"); for (const no of ["G2/HIJAU", "G2/TUTUP", "G2/BASI"]) assert.ok(nomor.includes(no), no);
  assert.equal(per["G2/HIJAU"].sisa_hari, 5); assert.equal(per["G2/HIJAU"].kejadian_selesai, false); assert.equal(per["G2/HIJAU"].perlu_cek, false); assert.equal(per["G2/HIJAU"].tanpa_entri_hari, 0);
  assert.equal(per["G2/TUTUP"].kejadian_selesai, true); assert.equal(per["G2/TUTUP"].perlu_cek, true); assert.equal(per["G2/TUTUP"].sisa_hari, 0, "berakhir hari ini masih aktif");
  assert.equal(per["G2/BASI"].sisa_hari, null); assert.ok(per["G2/BASI"].tanpa_entri_hari >= 9); assert.equal(per["G2/BASI"].perlu_cek, true);
  for (const k of ["tingkat", "wilayah", "nomor", "tmt_mulai", "perpanjangan_ke", "prov", "kab", "kejadian_id"]) assert.ok(k in per["G2/HIJAU"], k);
  assert.deepEqual(r.j.per_tingkat.map(x => x.tingkat), ["siaga", "tanggap", "transisi"]);
  const t = Object.fromEntries(r.j.per_tingkat.map(x => [x.tingkat, x])); assert.ok(t.tanggap.sk >= 2 && t.tanggap.perlu_cek >= 1); assert.equal(r.j.per_provinsi.find(x => x.prov === "13").sk, 1); assert.equal(r.j.per_provinsi.find(x => x.prov === "13").perlu_cek, 1);
  assert.equal(r.j.terpotong, false); assert.equal(r.j.jumlah, r.j.sk.length); assert.equal(r.j.perlu_cek, r.j.sk.filter(x => x.perlu_cek).length);
});

uji("G3 berantai: entri banjir/cuaca membuat peringatan longsor+banjir 3 hari, tanpa dobel, jenis lain tidak, teks bukan ramalan", async () => {
  /* angka di kode == berkas statis */
  const f = JSON.parse(readFileSync(path.join(AKAR, "public/data/bnpb/logbook_susulan.json"), "utf8"));
  for (const [kunci, p] of Object.entries(POLA)) assert.deepEqual(f.pasangan[kunci].nasional && {n: f.pasangan[kunci].nasional.n, k: f.pasangan[kunci].nasional.k, laju: f.pasangan[kunci].nasional.laju, dasar: f.pasangan[kunci].nasional.dasar, lift: f.pasangan[kunci].nasional.lift, ci95: f.pasangan[kunci].nasional.ci95}, p, kunci);
  assert.equal(f.jendela_hari, BERLAKU_HARI);
  const kab = "33|Brebes", kunci = id => DB.prepare("SELECT * FROM berantai_peringatan WHERE prov = '33' AND kab = 'Brebes' ORDER BY susulan").all();
  const sebelum = await n("berantai_peringatan"); await kejadian(kab, "longsor"); await kejadian(kab, "gempabumi"); assert.equal(await n("berantai_peringatan"), sebelum, "longsor/gempa bukan pemicu");
  const id = await kejadian(kab, "banjir"); let r = (await kunci()).results;
  assert.deepEqual(r.map(x => [x.susulan, x.pemicu]), [["banjir", "banjir"], ["longsor", "banjir"]]); assert.equal(r[0].kejadian_id, id);
  assert.ok(Math.abs(r[0].berlaku_sampai - r[0].mulai - 3 * HARI) < 5, "berlaku 3 hari");
  /* entri lanjutan memperpanjang, tidak menggandakan */
  await DB.prepare("UPDATE berantai_peringatan SET mulai = mulai - ?, berlaku_sampai = berlaku_sampai - ?, diperbarui = diperbarui - ? WHERE kab = 'Brebes'").bind(HARI, HARI, HARI).run();
  const lama = (await kunci()).results[0];
  assert.equal((await call("POST", `/api/logbook/kejadian/${id}/entri`, STAF, {md: 2})).status, 201); r = (await kunci()).results;
  assert.equal(r.length, 2, "tidak dobel"); assert.equal(r[0].mulai, lama.mulai, "mulai tetap selama masih aktif"); assert.ok(r[0].berlaku_sampai > lama.berlaku_sampai + 0.9 * HARI, "diperpanjang");
  /* cuaca di kab yang sama memakai baris yang sama */
  await kejadian(kab, "cuaca"); r = (await kunci()).results; assert.equal(r.length, 2); assert.equal(r[0].pemicu, "cuaca");
  /* sudah kedaluwarsa lalu entri baru: baris dimulai ulang */
  await DB.prepare("UPDATE berantai_peringatan SET mulai = mulai - ?, berlaku_sampai = berlaku_sampai - ? WHERE kab = 'Brebes'").bind(10 * HARI, 10 * HARI).run(); const kad = Date.now();
  assert.equal((await call("POST", `/api/logbook/kejadian/${id}/entri`, STAF, {md: 3})).status, 201); r = (await kunci()).results; assert.ok(r[0].mulai >= kad - 5000, "mulai baru"); assert.ok(r[0].berlaku_sampai > Date.now());
  /* GET */
  const g = await call("GET", "/api/pusdalops/berantai?aktif=1"); assert.equal(g.status, 200); assert.equal(g.cc, "no-store");
  const mine = g.j.peringatan.filter(x => x.kab === "Brebes"); assert.equal(mine.length, 2);
  const lon = mine.find(x => x.susulan === "longsor"); assert.equal(lon.pemicu, "banjir", "entri terakhir yang menang"); assert.equal(lon.lift, POLA["banjir>longsor"].lift); assert.deepEqual(lon.ci95, POLA["banjir>longsor"].ci95);
  assert.match(lon.teks, /bukan ramalan/); assert.match(g.j.catatan, /bukan ramalan/); assert.ok(lon.sisa_jam > 60 && lon.sisa_jam <= 72);
  await DB.prepare("UPDATE berantai_peringatan SET mulai = ? - 3 * 864e5, berlaku_sampai = ? WHERE kab = 'Brebes' AND susulan = 'banjir'").bind(Date.now() - 1000, Date.now() - 1000).run();
  assert.equal((await call("GET", "/api/pusdalops/berantai?aktif=1")).j.peringatan.filter(x => x.kab === "Brebes").length, 1, "kedaluwarsa tidak tampil");
  assert.equal((await call("GET", "/api/pusdalops/berantai?aktif=1&prov=13")).j.peringatan.filter(x => x.prov !== "13").length, 0);
  assert.equal((await call("GET", "/api/pusdalops/berantai?aktif=0")).status, 400); assert.equal((await call("GET", "/api/pusdalops/berantai?aktif=1&prov=zz")).status, 400);
});

uji("G4 medsos: tambah, validasi 400, dobel tautan 409, wilayah 403", async () => {
  const dasar = {sumber: "medsos", tautan: "https://contoh.invalid/status/1234567890123456789", judul: "Banjir setinggi lutut di jalan utama", kab: "33|Cilacap", jenis: "banjir"};
  const a = await call("POST", "/api/pusdalops/medsos", STAF, dasar); assert.equal(a.status, 201, JSON.stringify(a.j)); assert.equal(a.cc, "no-store");
  assert.equal(a.j.butir.status, "baru"); assert.equal(a.j.butir.prov, "33"); assert.equal(a.j.butir.kab, "Cilacap"); assert.equal(a.j.butir.dummy, false); assert.ok(Math.abs(a.j.butir.waktu_pantau - Date.now()) < 10000);
  assert.equal((await call("POST", "/api/pusdalops/medsos", STAF, dasar)).status, 409, "tautan sama"); assert.equal((await call("POST", "/api/pusdalops/medsos", STAF, {...dasar, tautan: "https://CONTOH.invalid/status/1234567890123456789"})).status, 409, "huruf besar sama");
  const sebelum = await n("medsos_butir"), bad = async (o, t) => assert.equal((await call("POST", "/api/pusdalops/medsos", STAF, {...dasar, tautan: "https://contoh.invalid/x/" + Math.random().toString(16).slice(2), ...o})).status, 400, t);
  await bad({tautan: "http://contoh.invalid/a"}, "http"); await bad({tautan: "https://127.0.0.1/a"}, "IP"); await bad({tautan: "https://u:p@contoh.invalid/a"}, "kredensial"); await bad({tautan: "https://contoh.invalid/a b"}, "spasi"); await bad({tautan: "javascript:alert(1)"}, "skema");
  await bad({tautan: "https://contoh.invalid/" + "a".repeat(300)}, "terlalu panjang"); await bad({sumber: "koran"}, "sumber"); await bad({judul: "ab"}, "judul pendek"); await bad({judul: "x".repeat(141)}, "judul panjang"); await bad({judul: "telepon 0812 3456 7890"}, "HP di judul");
  await bad({judul: "lapor ke a@b.id"}, "surel"); await bad({kab: undefined, prov: undefined}, "tanpa wilayah"); await bad({kab: undefined, prov: "99"}, "prov tak dikenal"); await bad({prov: "11"}, "prov tak cocok kab"); await bad({jenis: "ufo"}, "jenis");
  await bad({waktu_pantau: Date.now() + HARI}, "masa depan"); await bad({waktu_pantau: Date.now() - 40 * HARI}, "terlalu lama"); await bad({waktu_pantau: "kemarin"}, "bukan waktu");
  assert.equal(await n("medsos_butir"), sebelum, "400 tidak menulis");
  const tv = await call("POST", "/api/pusdalops/medsos", STAF, {sumber: "tv", tautan: "https://contoh.invalid/tv/1", judul: "Liputan TV longsor", prov: "11", waktu_pantau: new Date(Date.now() - 2 * 36e5).toISOString()}); assert.equal(tv.status, 201, JSON.stringify(tv.j)); assert.equal(tv.j.butir.kab, null);
  /* wilayah: staf berwilayah 33 hanya menulis di 33 */
  assert.equal((await call("POST", "/api/pusdalops/medsos", WIL, {...dasar, tautan: "https://contoh.invalid/w/1", kab: "11|Aceh Tamiang"})).status, 403);
  assert.equal((await call("POST", "/api/pusdalops/medsos", WIL, {...dasar, tautan: "https://contoh.invalid/w/2"})).status, 201);
  /* antrean */
  const q = await call("GET", "/api/pusdalops/medsos"); assert.equal(q.status, 200); assert.equal(q.j.status, "baru"); assert.ok(q.j.butir.length >= 3); const w = q.j.butir.map(x => x.waktu_pantau); assert.deepEqual(w, [...w].sort((x, y) => y - x), "terbaru dulu");
  assert.equal((await call("GET", "/api/pusdalops/medsos?prov=11")).j.butir.length, 1); assert.equal((await call("GET", "/api/pusdalops/medsos?status=ngawur")).status, 400); assert.equal((await call("GET", "/api/pusdalops/medsos?prov=zz")).status, 400);
  assert.equal((await call("GET", "/api/pusdalops/medsos?status=ditolak")).j.butir.length, 0);
});

uji("G4 verifikasi: tolak, tautkan ke kejadian ada, buat kejadian baru lewat logbook; jeda median per bulan", async () => {
  const mk = async (i, o = {}) => (await call("POST", "/api/pusdalops/medsos", STAF, {sumber: "medsos", tautan: "https://contoh.invalid/v/" + i, judul: "Pantauan nomor " + i, kab: "33|Kebumen", jenis: "longsor", ...o})).j.butir;
  const v = (b, o) => call("POST", "/api/pusdalops/medsos/verifikasi", STAF, {id: b.id, ...o});
  const [t, k, c, g] = [await mk(1), await mk(2), await mk(3), await mk(4)];
  for (const [o, s] of [[{}, 400], [{aksi: "ngawur"}, 400], [{aksi: "tolak", id: "zz"}, 400], [{aksi: "tolak", id: "f".repeat(16)}, 404]]) assert.equal((await call("POST", "/api/pusdalops/medsos/verifikasi", STAF, {id: t.id, ...o})).status, s, JSON.stringify(o));
  assert.equal((await v(t, {aksi: "tolak", catatan: "hubungi 0812 3456 7890"})).status, 400);
  const tol = await v(t, {aksi: "tolak", catatan: "hoaks, foto lama"}); assert.equal(tol.status, 200); assert.equal(tol.j.butir.status, "ditolak"); assert.equal(tol.j.butir.catatan, "hoaks, foto lama"); assert.equal((await v(t, {aksi: "tolak"})).status, 409, "sudah diverifikasi");
  /* tautkan */
  assert.equal((await v(k, {aksi: "tautkan"})).status, 400); assert.equal((await v(k, {aksi: "tautkan", kejadian_id: "f".repeat(16)})).status, 404);
  const kid = await kejadian("33|Kebumen", "longsor"), tk = await v(k, {aksi: "tautkan", kejadian_id: kid}); assert.equal(tk.status, 200, JSON.stringify(tk.j)); assert.equal(tk.j.butir.status, "terverifikasi"); assert.equal(tk.j.butir.kejadian_id, kid);
  /* buat: gagal validasi logbook = butir kembali baru; sukses = kejadian logbook nyata dengan entri */
  const gal = await v(c, {aksi: "buat", kejadian: {md: -5}}); assert.equal(gal.status, 400); assert.equal((await DB.prepare("SELECT status, kejadian_id FROM medsos_butir WHERE id = ?").bind(c.id).first()).status, "baru", "klaim dikembalikan");
  const kej = await n("logbook_kejadian"), b = await v(c, {aksi: "buat", kejadian: {md: 2, mengungsi_jiwa: 30}}); assert.equal(b.status, 201, JSON.stringify(b.j));
  assert.equal(await n("logbook_kejadian"), kej + 1); assert.equal(b.j.butir.status, "jadi_kejadian"); assert.equal(b.j.butir.kejadian_id, b.j.kejadian.id); assert.equal(b.j.kejadian.jenis, "longsor"); assert.equal(b.j.kejadian.kab, "Kebumen"); assert.equal(b.j.entri.md, 2);
  assert.match(b.j.entri.catatan, /Pantauan nomor 3/); assert.equal((await v(c, {aksi: "buat"})).status, 409); assert.equal(await n("logbook_kejadian"), kej + 1, "klik ganda tidak menggandakan");
  /* tanpa jenis/kab di butir dan tidak diberi: 400 dari validasi logbook, butir baru lagi */
  const kosong = await mk(5, {kab: undefined, prov: "33", jenis: undefined}); assert.equal((await v(kosong, {aksi: "buat"})).status, 400); assert.equal((await v(kosong, {aksi: "buat", kejadian: {jenis: "banjir", kab: "33|Kebumen"}})).status, 201);
  /* wilayah: staf berwilayah 33 tak boleh memverifikasi butir provinsi 13 atau menautkan ke kejadian provinsi lain */
  const luar = await mk(6, {kab: "13|Agam"}); assert.equal((await call("POST", "/api/pusdalops/medsos/verifikasi", WIL, {id: luar.id, aksi: "tolak"})).status, 403);
  const dalam = await mk(7); const kj13 = await kejadian("13|Agam", "banjir"); assert.equal((await call("POST", "/api/pusdalops/medsos/verifikasi", WIL, {id: dalam.id, aksi: "tautkan", kejadian_id: kj13})).status, 403);
  assert.equal((await call("POST", "/api/pusdalops/medsos/verifikasi", WIL, {id: dalam.id, aksi: "buat", kejadian: {kab: "13|Agam"}})).status, 403, "kab hasil timpaan di luar wilayah");
  assert.equal((await DB.prepare("SELECT status FROM medsos_butir WHERE id = ?").bind(dalam.id).first()).status, "baru");
  /* jeda: waktu_pantau tetap, kejadian.dibuat diatur: 60 dan 180 menit -> median 120; satu logbook lebih dulu dihitung terpisah */
  await DB.prepare("DELETE FROM medsos_butir").run();
  const B = await Promise.all([mk(11), mk(12), mk(13), mk(14)]), kj = await Promise.all([kejadian("33|Kebumen"), kejadian("33|Kebumen"), kejadian("33|Kebumen"), kejadian("33|Kebumen")]);
  const w0 = Date.now() - 2 * HARI, menit = [60, 180, 120, -30];
  for (let i = 0; i < 4; i++) { await DB.prepare("UPDATE logbook_kejadian SET dibuat = ? WHERE id = ?").bind(w0 + menit[i] * 6e4, kj[i]).run(); await DB.prepare("UPDATE medsos_butir SET waktu_pantau = ?, status = 'terverifikasi', kejadian_id = ? WHERE id = ?").bind(w0, kj[i], B[i].id).run(); }
  const j = await call("GET", "/api/pusdalops/medsos/jeda"); assert.equal(j.status, 200, JSON.stringify(j.j)); assert.equal(j.j.keseluruhan.median_menit, 120); assert.equal(j.j.keseluruhan.n, 4); assert.equal(j.j.keseluruhan.logbook_lebih_dulu, 1);
  const bln = new Date(w0 + 7 * 36e5).toISOString().slice(0, 7); assert.equal(j.j.per_bulan.find(x => x.bulan === bln).median_menit, 120); assert.equal(j.j.terpotong, false);
});

uji("wilayah: staf berwilayah 33 ditolak 403 di tutup/buat/lanjut kejadian provinsi lain; staf nasional tetap 200; bypass medsos dan tautan berbahaya", async () => {
  const k13 = await kejadian("13|Pariaman", "lainnya"), k33 = await kejadian("33|Pemalang", "lainnya");
  assert.equal((await call("POST", `/api/logbook/kejadian/${k13}/tutup`, WIL, TUTUP)).status, 403); assert.equal((await call("POST", `/api/logbook/kejadian/${k13}/entri`, WIL, {md: 1})).status, 403);
  const sebelum = await n("logbook_kejadian");
  for (const kab of [{kab: "13|Pariaman"}, {kab_kode: "13|Pariaman"}, {wilayah: "13|Pariaman"}, {prov: "13", kab: "Pariaman"}]) assert.equal((await call("POST", "/api/logbook/kejadian", WIL, {jenis: "lainnya", mulai: hariIni(), md: 1, ...kab})).status, 403, JSON.stringify(kab));
  assert.equal(await n("logbook_kejadian"), sebelum);
  assert.equal((await call("POST", `/api/logbook/kejadian/${k33}/entri`, WIL, {md: 2})).status, 201); assert.equal((await call("POST", `/api/logbook/kejadian/${k33}/tutup`, WIL, TUTUP)).status, 200);
  assert.equal((await call("POST", `/api/logbook/kejadian/${k13}/tutup`, STAF, TUTUP)).status, 200, "staf nasional");
  let x = -1;
  const mk = async i => (await call("POST", "/api/pusdalops/medsos", WIL, {sumber: "medsos", tautan: "https://contoh.invalid/b/" + i, judul: "Butir bypass nomor " + "abcdefgh"[i], kab: "33|Pemalang", jenis: "banjir"})).j.butir;
  for (const kejadian of [{kab_kode: "13|Pariaman"}, {wilayah: "13|Pariaman"}, {prov_kode: "13", kab: "Pariaman"}, {prov: "13"}, {kab: "13|Pariaman"}]) { const b = await mk(++x); const kej0 = await n("logbook_kejadian");
    assert.ok([400, 403].includes((await call("POST", "/api/pusdalops/medsos/verifikasi", WIL, {id: b.id, aksi: "buat", kejadian})).status), JSON.stringify(kejadian)); assert.equal(await n("logbook_kejadian"), kej0, JSON.stringify(kejadian)); }
  for (const tautan of ["https://wa.me/628123456789", "https://api.whatsapp.com/send?phone=628123456789", "https://contoh.invalid/@budi/post", "https://contoh.invalid/p?u=a@b.id", "https://contoh.invalid/p?tel=0812-3456-7890"])
    assert.equal((await call("POST", "/api/pusdalops/medsos", STAF, {sumber: "medsos", tautan, judul: "Tautan terlarang", prov: "33"})).status, 400, tautan);
  assert.equal((await call("POST", "/api/pusdalops/medsos", STAF, {sumber: "medsos", tautan: "https://contoh.invalid/u/status/1234567890123456789?s=20", judul: "Id panjang di path sah", prov: "33"})).status, 201);
});

uji("wilayah: SK status darurat ditolak 403 untuk staf berwilayah 33 di kejadian provinsi 13, tanpa baris SK; kejadian 33 dan staf nasional tetap 201", async () => {
  const k13 = await kejadian("13|Agam", "lainnya"), k33 = await kejadian("33|Batang", "lainnya"), sk = nomor => ({tingkat: "siaga", wilayah: "kab", nomor, tmt_mulai: hariIni()});
  const nSk = () => n("logbook_sk"), sebelum = await nSk();
  const luar = await call("POST", `/api/logbook/kejadian/${k13}/sk`, WIL, sk("WIL/13/1")); assert.equal(luar.status, 403, JSON.stringify(luar.j)); assert.match(luar.j.galat, /di luar wilayah/);
  assert.equal(await nSk(), sebelum, "403 tidak menulis SK");
  assert.equal((await call("POST", `/api/logbook/kejadian/${k33}/sk`, WIL, sk("WIL/33/1"))).status, 201, "kejadian dalam wilayah");
  assert.equal((await call("POST", `/api/logbook/kejadian/${k13}/sk`, STAF, sk("NAS/13/1"))).status, 201, "staf nasional");
  assert.equal(await nSk(), sebelum + 2);
});

uji("gelombang 3: batas laju tulis per pelaku (120/jam) dan 429", async () => {
  let kode = 0;
  for (let i = 0; i < 125 && kode !== 429; i++) kode = (await call("POST", "/api/pusdalops/medsos", LAJU, {sumber: "medsos", tautan: "https://contoh.invalid/laju/" + i, judul: "Butir laju " + i, prov: "11"})).status;
  assert.equal(kode, 429); assert.ok(await n("medsos_butir WHERE oleh LIKE 'staf:b3%'") >= 100);
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES ('lb:staf:b3b3b3b3b3b3b3b3', 'logbook_tulis', ?)").bind(Date.now())));
  assert.equal((await call("POST", `/api/logbook/kejadian/${"f".repeat(16)}/tutup`, LAJU, TUTUP)).status, 429, "tutup memakai laju logbook");
});

uji("gelombang 3: dummy hanya Super Admin, isi lalu hapus bersih, ganda 409", async () => {
  await call("POST", "/api/logbook/dummy", ADMIN, {aksi: "isi"});
  const dm = async () => Promise.all(["berantai_peringatan", "medsos_butir"].map(t => n(`${t} WHERE dummy = 1`)));
  for (const m of ["berantai", "medsos"]) {
    const u = `/api/pusdalops/${m}/dummy`;
    assert.equal((await call("POST", u, ADMIN, {aksi: "ngawur"})).status, 400); assert.equal((await call("POST", u, ADMIN, {aksi: "isi"})).status, 201, m); assert.equal((await call("POST", u, ADMIN, {aksi: "isi"})).status, 409, "dummy ganda");
  }
  const [b, m] = await dm(); assert.ok(b >= 4 && m >= 5);
  const lb = (await call("GET", "/api/pusdalops/berantai?aktif=1")).j.peringatan.filter(x => x.dummy); assert.ok(lb.length >= 4, "dummy tampil bertanda"); assert.ok(lb.every(x => /bukan ramalan/.test(x.teks)));
  const aktif = await call("GET", "/api/pusdalops/medsos?status=baru&prov=33"); assert.ok(aktif.j.butir.some(x => x.dummy));
  assert.ok((await call("GET", "/api/pusdalops/medsos/jeda")).j.keseluruhan.n >= 1, "dummy terhubung kejadian dummy ikut jeda");
  const sk = (await call("GET", "/api/logbook/sk/aktif")).j; assert.ok(sk.sk.some(x => x.dummy), "SK dummy logbook tampil di papan");
  /* baris nyata tidak tersentuh */
  const nyata = [await n("berantai_peringatan WHERE dummy = 0"), await n("medsos_butir WHERE dummy = 0")];
  for (const x of ["berantai", "medsos"]) assert.equal((await call("POST", `/api/pusdalops/${x}/dummy`, ADMIN, {aksi: "hapus"})).status, 200);
  await call("POST", "/api/logbook/dummy", ADMIN, {aksi: "hapus"});
  assert.deepEqual(await dm(), [0, 0]); assert.deepEqual([await n("berantai_peringatan WHERE dummy = 0"), await n("medsos_butir WHERE dummy = 0")], nyata);
  assert.equal(await n("logbook_tutup WHERE kejadian_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"), 0);
});

uji("gelombang 3: migrasi 0098 idempoten; tanpa tabel rute baru 503 jelas, tutup/entri logbook tetap jalan", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations", "0098_pusdalops_gelombang3.sql"), "utf8"), sebelum = [await n("logbook_tutup"), await n("medsos_butir")];
  await DB.batch(pecah(sql).map(s => DB.prepare(s))); assert.deepEqual([await n("logbook_tutup"), await n("medsos_butir")], sebelum, "jalan ulang tak menghapus data");
  const kid = await kejadian("33|Tegal", "banjir"), kid2 = await kejadian("33|Tegal", "lainnya");
  for (const t of ["logbook_tutup", "berantai_peringatan", "medsos_butir"]) await DB.exec(`DROP TABLE ${t}`);
  for (const [m, j, b] of [["GET", "/api/pusdalops/berantai?aktif=1"], ["GET", "/api/pusdalops/medsos"], ["GET", "/api/pusdalops/medsos/jeda"], ["POST", "/api/pusdalops/medsos", {sumber: "tv", tautan: "https://contoh.invalid/t", judul: "Liputan tanpa tabel", prov: "33"}],
    ["POST", "/api/pusdalops/medsos/verifikasi", {id: "f".repeat(16), aksi: "tolak"}], ["POST", "/api/pusdalops/berantai/dummy", {aksi: "isi"}], ["POST", "/api/pusdalops/medsos/dummy", {aksi: "isi"}]]) {
    const r = await call(m, j, m === "POST" && j.endsWith("dummy") ? ADMIN : STAF, b); assert.equal(r.status, 503, m + " " + j); assert.match(r.j.galat, /migrasi 0098/);
  }
  const e = await call("POST", `/api/logbook/kejadian/${kid}/entri`, STAF, {md: 4}); assert.equal(e.status, 201, "entri jalan walau berantai belum ada");
  assert.equal((await call("POST", "/api/logbook/kejadian", STAF, {jenis: "cuaca", kab: "33|Tegal", mulai: hariIni(), md: 0})).status, 201);
  const t = await call("POST", `/api/logbook/kejadian/${kid2}/tutup`, STAF, TUTUP); assert.equal(t.status, 200, JSON.stringify(t.j)); assert.match(t.j.tutup_detail, /0098/);
  assert.equal((await call("POST", `/api/logbook/kejadian/${kid2}/tutup`, STAF, TUTUP)).status, 409, "sudah tutup");
  assert.equal((await DB.prepare("SELECT status FROM logbook_kejadian WHERE id = ?").bind(kid2).first()).status, "tutup");
  assert.equal((await call("GET", "/api/logbook/sk/aktif")).status, 200, "papan SK tak butuh tabel baru");
  assert.equal((await call("GET", "/api/pusdalops/medsos", orig)).status, 403, "gerbang staf tetap lebih dulu daripada 503");
  await DB.batch(pecah(sql).map(s => DB.prepare(s))); assert.equal((await call("GET", "/api/pusdalops/medsos")).status, 200);
});

uji("indeks: kueri baru memakai SEARCH di indeks, bukan SCAN tabel (EXPLAIN QUERY PLAN di node:sqlite)", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  const rencana = (sql, ...p) => db.prepare("EXPLAIN QUERY PLAN " + sql).all(...p).map(r => r.detail).join(" | ");
  const harusSearch = (nama, sql, ...p) => { const d = rencana(sql, ...p); assert.ok(/SEARCH/.test(d) && !/SCAN (logbook_sk|logbook_kejadian|medsos_butir|berantai_peringatan|logbook_tutup)\b(?! USING)/.test(d), nama + ": " + d); return d; };
  const d = harusSearch("sk aktif", "SELECT s.id FROM (SELECT * FROM logbook_sk WHERE tmt_selesai IS NULL UNION ALL SELECT * FROM logbook_sk WHERE tmt_selesai >= ?) s JOIN logbook_kejadian k ON k.id = s.kejadian_id ORDER BY s.tmt_selesai LIMIT 1001", "2026-11-02");
  assert.match(d, /logbook_sk_selesai/); assert.ok(!/SCAN logbook_sk/.test(d), "tanpa SCAN indeks: " + d); assert.ok((d.match(/SEARCH logbook_sk USING INDEX logbook_sk_selesai/g) || []).length === 2, d);
  assert.match(harusSearch("berantai aktif", "SELECT prov FROM berantai_peringatan WHERE berlaku_sampai > ? ORDER BY berlaku_sampai DESC LIMIT 501", 1), /berantai_berlaku/);
  assert.match(harusSearch("berantai upsert", "SELECT 1 FROM berantai_peringatan WHERE prov = ? AND kab = ? AND susulan = ?", "33", "x", "banjir"), /PRIMARY KEY|autoindex/i);
  assert.match(harusSearch("antrean", "SELECT id FROM medsos_butir WHERE status = ? ORDER BY waktu_pantau DESC LIMIT 101", "baru"), /medsos_antre/);
  assert.match(harusSearch("antrean prov", "SELECT id FROM medsos_butir WHERE status = ? AND prov = ? ORDER BY waktu_pantau DESC LIMIT 101", "baru", "33"), /medsos_antre/);
  assert.match(harusSearch("jeda", "SELECT b.waktu_pantau, k.dibuat FROM medsos_butir b JOIN logbook_kejadian k ON k.id = b.kejadian_id WHERE b.kejadian_id IS NOT NULL AND b.waktu_pantau >= ? ORDER BY b.waktu_pantau LIMIT 5001", 1), /medsos_jeda/);
  assert.match(harusSearch("tautan unik", "SELECT id FROM medsos_butir WHERE tautan = ?", "x"), /medsos_tautan/);
  assert.match(harusSearch("tutup", "SELECT 1 FROM logbook_tutup WHERE kejadian_id = ?", "x"), /PRIMARY KEY|autoindex/i);
});
