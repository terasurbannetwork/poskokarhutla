/* Paritas bencana PB-10 (src/pb_isian.js, src/hak.js pbTitik*, migrations/0130) di workerd (Miniflare) dengan D1 sungguhan.
   Dibuktikan: bencana tanpa kemampuan operasi 404, hak tulis (tamu, gerbang, peran lain, wilayah lain, peran dicabut), validasi, IDOR, hapus lunak,
   batas laju 60/10 menit, tanpa tabel (tulis 503, baca kosong), XSS bersih, kueri baca SEARCH.
   Jalankan: node --test tests/warga/pb_titik.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import {DatabaseSync} from "node:sqlite";
import {migrasi} from "./_bantu.mjs";
import {PB_SQL} from "../../src/hak.js";
import "../../src/worker.js";

const uji = berantai();
const REG = JSON.stringify({pesisir: {operasi: true, renlap: {sarana: ["alat_berat", "tenda", "tim_sar_unit"]}}});
const {DB, api, n} = await siapkan("uji-pb-titik", {ikat: {PB_REGISTRI: REG}});
const TOK = {pus: "1".repeat(64), jabar: "2".repeat(64), udara: "3".repeat(64), koord: "4".repeat(64)};
const PERAN = {pus: '["pusdalops"]', jabar: '["pusdalops"]', udara: '["udara"]', koord: '["koordalops"]'}, WIL = {pus: "[]", jabar: '["32"]', udara: "[]", koord: "[]"};
for (const k of Object.keys(TOK)) {
  const id = k.length.toString().repeat(2) + k.padEnd(14, "0");
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, ?, ?, 'Pusdalops', ?, ?, ?, ?, ?, ?, 0, 1, 'tes', 0)`).bind(id, "pbuji" + k, "Staf " + k, "9200" + k.length + k.charCodeAt(0), `${k}@b.id`, "62812000" + k.charCodeAt(0) + k.length, PERAN[k], WIL[k], "a".repeat(32), "a".repeat(64)).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(TOK[k]), id, Date.now() + 3600e3).run();
  TOK[k] = {cookie: "sesi_staf=" + TOK[k], "x-pb": "1", id};
}
const H = k => ({cookie: TOK[k].cookie, "x-pb": "1"});
const pos = (j, b, h = MOD2) => api("POST", "/api/pb/titik" + j, b, h);
const dapat = (q, h = MOD2) => api("GET", "/api/pb/titik?" + q, undefined, h);
const T = (o = {}) => ({bencana: "pesisir", golongan: "sarana", jenis: "tenda", prov: "32", kab: "3273", nama: "Gudang BPBD Kota Bandung", lat: -6.9, lon: 107.6, kapasitas: 40, ...o});
let id;

uji("bencana tanpa kemampuan operasi atau tidak dikenal = 404, bukan 400", async () => {
  assert.equal((await pos("", T({bencana: "longsor"}))).s, 404);
  assert.equal((await pos("", T({bencana: "xyz"}))).s, 404);
  assert.equal((await dapat("bencana=longsor&prov=32")).s, 404);
});

uji("hak tulis: tamu, akun gerbang, koordalops, udara, staf wilayah lain ditolak", async () => {
  for (const h of [{}, GERBANG, H("koord"), H("udara")]) assert.equal((await pos("", T(), h)).s, 403);
  assert.equal((await pos("", T(), H("jabar"))).s, 201);                      // 32 = wilayahnya
  assert.equal((await pos("", T({prov: "31", kab: "3171"}), H("jabar"))).s, 403);   // 31 bukan wilayahnya
  assert.equal(await n("pb_titik", "1"), 1);
});

uji("tamu ke hapus dan simpan = 403 baik id ada maupun tidak, bencana tak aktif pun 403; metode salah 405", async () => {
  const ada = (await DB.prepare("SELECT id FROM pb_titik LIMIT 1").first()).id;
  for (const id of [ada, "0".repeat(16)]) assert.equal((await pos("/hapus", {id, alasan: "salah ketik"}, {})).s, 403);
  assert.equal((await pos("", T({bencana: "banjir"}), {})).s, 403);
  assert.equal((await pos("/hapus", "bukan json", {})).s, 403);
  for (const [m, j] of [["GET", "/api/pb/titik/hapus"], ["PUT", "/api/pb/titik"], ["DELETE", "/api/pb/titik"]]) assert.equal((await api(m, j, undefined, MOD2)).s, 405, m + j);
});

uji("peran dicabut = 403 pada permintaan berikutnya", async () => {
  assert.equal((await pos("", T(), H("pus"))).s, 201);
  await DB.prepare("UPDATE staf SET peran = '[\"pimpinan\"]' WHERE id = ?").bind(TOK.pus.id).run();
  assert.equal((await pos("", T(), H("pus"))).s, 403);
  await DB.prepare("UPDATE staf SET peran = '[\"pusdalops\"]' WHERE id = ?").bind(TOK.pus.id).run();
});

uji("validasi: golongan, jenis (daftar sah), koordinat, wilayah, kapasitas, nama", async () => {
  const salah = async (o, kata) => { const r = await pos("", T(o)); assert.equal(r.s, 400, JSON.stringify(o) + r.t); if (kata) assert.match(r.t, kata); };
  await salah({jenis: "perahu_karet"}, /tenda, alat_berat, tim_sar_unit/);   // sarana tidak berlaku untuk pesisir
  await salah({golongan: "fasilitas", jenis: "tenda"}, /tempat_evakuasi/);
  await salah({golongan: "lain"});
  await salah({lat: 40, lon: 107}); await salah({lat: "x"}); await salah({prov: "99"}); await salah({kab: "3173"}); await salah({kab: "31"});
  await salah({kapasitas: -1}); await salah({kapasitas: 1.5}); await salah({nama: "  "}); await salah({status: "hancur"});
  assert.equal((await pos("", T({golongan: "fasilitas", jenis: "tempat_evakuasi", nama: "GOR Uji"}))).s, 201);
  assert.equal((await pos("", T({prov: "32", kab: ""}))).s, 201);
});

uji("XSS dan penutup CDATA tersimpan bersih; jawaban tanpa pengisi", async () => {
  const r = await pos("", T({nama: "<script>alert(1)</script>Gudang ]]>", catatan: "<img onerror=x>]]>"})); assert.equal(r.s, 201, r.t); id = r.j.id;
  const b = await DB.prepare("SELECT nama, catatan FROM pb_titik WHERE id = ?").bind(id).first();
  for (const v of [b.nama, b.catatan]) assert.ok(!/[<>]/.test(v), v);
  const g = await dapat("bencana=pesisir&prov=32&kab=3273"); assert.equal(g.s, 200);
  assert.ok(g.j.titik.length >= 1 && g.j.titik.every(x => !("oleh" in x)));
  assert.equal(g.j.tersedia, true);
});

uji("nama dan catatan menolak nomor telepon, NIK, dan tautan (400), tanpa baris tersimpan", async () => {
  const sebelum = await n("pb_titik", "1"), logSebelum = await n("pb_log", "1");
  for (const o of [{nama: "Hubungi 081234567890"}, {catatan: "NIK 3273010101010001"}, {nama: "Gudang http://x.id/a"}, {catatan: "lihat www.contoh.com"}]) {
    const r = await pos("", T(o)); assert.equal(r.s, 400, JSON.stringify(o) + r.t); assert.match(r.t, /nomor telepon, NIK, atau tautan/);
  }
  assert.equal(await n("pb_titik", "1"), sebelum); assert.equal(await n("pb_log", "1"), logSebelum);
});

uji("ubah: IDOR (id milik wilayah lain 403), tak bisa dipindah, log sebelum dan sesudah, oleh tanpa nama", async () => {
  const lain = (await pos("", T({prov: "31", kab: "3171"}))).j.id;
  assert.equal((await pos("", T({id: lain}), H("jabar"))).s, 403);
  assert.equal((await pos("", T({id, prov: "31", kab: "3171"}))).s, 400);   // pindah wilayah
  assert.equal((await pos("", T({id: "0".repeat(16)}))).s, 404);
  assert.equal((await pos("", T({id: "bukan"}))).s, 400);
  const u = await pos("", T({id, nama: "Gudang Baru", status: "rusak"})); assert.equal(u.s, 200, u.t);
  const b = await DB.prepare("SELECT nama, status FROM pb_titik WHERE id = ?").bind(id).first(); assert.deepEqual([b.nama, b.status], ["Gudang Baru", "rusak"]);
  const l = (await DB.prepare("SELECT oleh, aksi, sebelum, sesudah FROM pb_log WHERE kunci = ? ORDER BY id").bind(id).all()).results;
  assert.deepEqual(l.map(x => x.aksi), ["isi", "ubah"]);
  assert.ok(JSON.parse(l[1].sebelum).nama.includes("Gudang") && JSON.parse(l[1].sesudah).nama === "Gudang Baru");
  assert.match(l[0].oleh, /^admin:[0-9a-f]{12}$/);
});

uji("hapus lunak: alasan 5 sampai 300, wilayah, hapus kedua 409, hilang dari daftar, baris tetap", async () => {
  assert.equal((await pos("/hapus", {id, alasan: "x"})).s, 400);
  assert.equal((await pos("/hapus", {id: "0".repeat(16), alasan: "salah ketik"})).s, 404);
  const lain = (await DB.prepare("SELECT id FROM pb_titik WHERE prov = '31' LIMIT 1").first()).id;
  assert.equal((await pos("/hapus", {id: lain, alasan: "salah ketik"}, H("jabar"))).s, 403);
  assert.equal((await pos("/hapus", {id, alasan: "salah ketik"}, GERBANG)).s, 403);
  assert.equal((await pos("/hapus", {id, alasan: "salah ketik pengisi"})).s, 200);
  assert.equal((await pos("/hapus", {id, alasan: "salah ketik pengisi"})).s, 409);
  assert.equal((await pos("", T({id}))).s, 409);   // ubah sesudah hapus
  assert.ok(!(await dapat("bencana=pesisir&prov=32&kab=3273")).j.titik.some(x => x.id === id));
  assert.ok((await DB.prepare("SELECT dihapus FROM pb_titik WHERE id = ?").bind(id).first()).dihapus > 0);
  assert.equal((await DB.prepare("SELECT alasan FROM pb_log WHERE kunci = ? AND aksi = 'hapus'").bind(id).first()).alasan, "salah ketik pengisi");
});

uji("baca: hak per peran, udara hanya karhutla dan udara, wilayah staf, saring golongan dan jenis", async () => {
  assert.equal((await dapat("bencana=pesisir&prov=32", {})).s, 403);
  assert.equal((await dapat("bencana=pesisir&prov=32", GERBANG)).s, 200);
  assert.equal((await dapat("bencana=pesisir&prov=32", H("koord"))).s, 200);
  assert.equal((await dapat("bencana=pesisir&prov=32", H("udara"))).s, 403);
  assert.equal((await dapat("bencana=pesisir&prov=31", H("jabar"))).s, 403);
  assert.equal((await dapat("bencana=pesisir&prov=99")).s, 400);
  assert.equal((await dapat("bencana=pesisir&prov=32&golongan=ngawur")).s, 400);
  const f = await dapat("bencana=pesisir&prov=32&golongan=fasilitas"); assert.ok(f.j.titik.length && f.j.titik.every(x => x.golongan === "fasilitas"));
});

uji("kueri baca dan tulis memakai indeks (SEARCH), bukan SCAN", () => {
  const sq = new DatabaseSync(":memory:"); sq.exec(migrasi());   // rencana SQLite sama dengan D1
  for (const k of ["daftar", "satu", "ubah", "hapus", "laju"]) {
    const rencana = sq.prepare("EXPLAIN QUERY PLAN " + PB_SQL[k]).all().map(r => r.detail).join(" | ");
    assert.ok(/SEARCH pb_/.test(rencana) && !/SCAN pb_/.test(rencana), `${k}: ${rencana}`);
  }
});

uji("batas laju: ke-61 dalam 10 menit = 429", async () => {
  const oleh = (await DB.prepare("SELECT oleh FROM pb_log WHERE oleh LIKE 'admin:%' LIMIT 1").first()).oleh;
  const ada = await n("pb_log", `oleh = '${oleh}'`), kini = Date.now();
  for (let i = ada; i < 60; i++) await DB.prepare("INSERT INTO pb_log (waktu, oleh, tabel, kunci, aksi) VALUES (?, ?, 'pb_titik', 'x', 'isi')").bind(kini, oleh).run();
  assert.equal((await pos("", T())).s, 429);
  assert.equal((await pos("", T(), H("pus"))).s, 201);   // pengisi lain tidak terdampak
});

uji("tanpa migrasi 0130: tulis 503 bermigrasi, baca daftar kosong tersedia false", async () => {
  const lama = await siapkan("uji-pb-titik-lama", {ikat: {PB_REGISTRI: REG}, sampai: "0130_"});
  const t = await lama.api("POST", "/api/pb/titik", T(), MOD2); assert.equal(t.s, 503); assert.match(t.t, /0130/);
  const g = await lama.api("GET", "/api/pb/titik?bencana=pesisir&prov=32", undefined, MOD2); assert.equal(g.s, 200); assert.deepEqual(g.j, {tersedia: false, titik: []});
});
