/* Paritas bencana PB-22 (src/pb_dokumen.js POST /api/pb/dokumen/rakit|bekukan, GET /api/pb/dokumen[/berkas]; src/hak.js pbStmtDokRakit, pbDokBeku) di workerd (Miniflare)
   dengan D1 dan R2 sungguhan. Dibuktikan: hak (tamu, gerbang, udara, pimpinan boleh bekukan tapi tidak rakit), 422 nomor telepon/NIK, KIB sah lolos, kalimat staf dibersihkan dan <= 1500,
   versi baru = versi + 1, R2 tulis sekali (put kedua 409), dua bekukan bersamaan satu pemenang, fmt di luar json/pdf 400, draf tidak bisa diunduh, kueri baca SEARCH, tanpa 0131 = 503/tersedia:false.
   Jalankan: node --test tests/warga/pb_dokumen.test.mjs */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import "../../src/worker.js";   // dahulu: impor sirkular
import {siapkan, berantai, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import {migrasi} from "./_bantu.mjs";
import {PB_SQL_DOK} from "../../src/hak.js";

const uji = berantai();
const REG = JSON.stringify({pesisir: {dokumen: ["sitrep", "renops", "laporan_kib", "renkon_peta"]}});
const {DB, mf, api, n} = await siapkan("uji-pb-dokumen", {r2: true, ikat: {PB_REGISTRI: REG}});
const R2 = await mf.getR2Bucket("MEDIA");
const TOK = {pus: "1".repeat(64), jabar: "2".repeat(64), udara: "3".repeat(64), koord: "4".repeat(64), pim: "5".repeat(64)};
const PERAN = {pus: '["pusdalops"]', jabar: '["pusdalops"]', udara: '["udara"]', koord: '["koordalops"]', pim: '["pimpinan"]'}, WIL = {pus: "[]", jabar: '["32"]', udara: "[]", koord: "[]", pim: "[]"};
let i = 0;
for (const k of Object.keys(TOK)) {
  i++; const id = String(i).repeat(2) + k.padEnd(14, "0");
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, ?, ?, 'Pusdalops', ?, ?, ?, ?, ?, ?, 0, 1, 'tes', 0)`).bind(id, "dokuji" + k, "Staf " + k, "93000" + i, `${k}@b.id`, "6281300000" + i, PERAN[k], WIL[k], "a".repeat(32), "a".repeat(64)).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(TOK[k]), id, Date.now() + 3600e3).run();
}
const H = k => ({cookie: "sesi_staf=" + TOK[k], "x-pb": "1"});
const rakit = (b, h = MOD2) => api("POST", "/api/pb/dokumen/rakit", b, h);
const beku = (b, h = MOD2) => api("POST", "/api/pb/dokumen/bekukan", b, h);
const D = (o = {}) => ({jenis: "sitrep", bencana: "pesisir", prov: "32", kab: "", periode: "2026-11-15", ...o});
const PANJANG = "lorem ipsum ".repeat(125).trim();   // 1499 karakter, tanpa deret huruf berulang (pembersih menolak spam)
const KIB = "3273106202611151";   // PPKK 3273, KKK 106 karhutla, 20261115, indeks 1
await DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, terakhir, dibuat, diubah) VALUES (?, 'karhutla', '32', 'Kota Bandung', '2026-11-15', 1, 1, 1)").bind("a".repeat(16)).run();
await DB.prepare("INSERT INTO logbook_kib (kejadian_id, kib) VALUES (?, ?)").bind("a".repeat(16), KIB).run();
let id1, id2;

uji("hak rakit: tamu, akun gerbang, udara, pimpinan 403 sebelum body; bencana belum menyala 404; jenis dan wilayah divalidasi", async () => {
  for (const h of [{}, GERBANG, H("udara"), H("pim")]) { assert.equal((await rakit("bukan json", h)).s, 403); assert.equal((await rakit(D(), h)).s, 403); }
  assert.equal((await rakit(D({bencana: "banjir"}))).s, 404);   // registri banjir belum menyalakan dokumen
  assert.equal((await rakit(D({bencana: "xyz"}))).s, 404);
  for (const o of [{jenis: "surat"}, {jenis: "constructor"}, {prov: "99"}, {kab: "3104"}, {periode: "kemarin"}, {periode: "2026-02-31"}, {kib: KIB}, {jenis: "laporan_kib"}, {jenis: "laporan_kib", kib: "12345"}, {jenis: "laporan_kib", kib: "3273010101900001"}, {jenis: "laporan_kib", kib: "3273106202611159"}, {jenis: "laporan_kib", kib: "3171106202611151"}])
    assert.equal((await rakit(D(o))).s, 400, JSON.stringify(o));
  assert.equal((await rakit(D({prov: "31"}), H("jabar"))).s, 403);   // staf wilayah 32
  assert.equal(await n("pb_dokumen"), 0);
});

uji("rakit: draf berversi, angka dari sumber, kalimat staf kosong, versi baru = versi + 1, tanpa kolom oleh di keluaran", async () => {
  const r = await rakit(D()); assert.equal(r.s, 201, r.t); id1 = r.j.id;
  assert.equal(r.j.versi, 1); assert.equal(r.j.status, "draf");
  const k = r.j.dokumen.bagian.map(b => b.kunci); assert.deepEqual(k, ["situasi", "operasi", "ringkasan", "kebijakan"]);
  assert.ok(r.j.dokumen.bagian.every(b => b.kalimat_staf === ""));
  assert.ok(r.j.dokumen.bagian[0].angka.every(a => a.nilai === null || typeof a.nilai === "number"));
  assert.ok(await R2.head(`dokumen/draf/${id1}.json`));
  const r2 = await rakit(D(), H("pus")); assert.equal(r2.s, 201); assert.equal(r2.j.versi, 2); id2 = r2.j.id;
  assert.equal(await n("pb_dokumen", "status = 'draf'"), 2);
  const l = await DB.prepare("SELECT oleh, sesudah FROM pb_log WHERE tabel = 'pb_dokumen' AND aksi = 'isi' ORDER BY id").all();
  assert.match(l.results[0].oleh, /^admin:/); assert.match(l.results[1].oleh, /^staf:/);
  const rn = await rakit(D({jenis: "renops"})); assert.ok(rn.j.dokumen.bagian.some(b => b.kunci === "perka_24_2010" && /belum diisi/.test(b.keterangan)));
  const kb = await rakit(D({jenis: "laporan_kib", kib: KIB})); assert.equal(kb.s, 201, kb.t); assert.equal(kb.j.dokumen.kib, KIB);   // KIB 16 digit bukan NIK
  assert.equal(await n("pb_dokumen", `kib = '${KIB}'`), 1);
});

uji("rakit: nomor HP atau NIK di sumber data = 422, tanpa baris dan tanpa berkas baru", async () => {
  for (const [isi, nama] of [["0812345678901", "hp"], ["+6281234567890", "+62"], ["3273010101900001", "nik"]]) {
    const ringkas = JSON.stringify({versi: 1, angka: {kejadian_30h: 3}, angka_meta: {kejadian_30h: {sumber: "logbook", arti: "hubungi " + isi}}, sumber: [], tingkat: {nasional: null, wilayah: []}});
    const U = await siapkan("uji-pb-dok-" + nama.replace(/\W/g, "x"), {r2: true, ikat: {PB_REGISTRI: REG}, asetKu: async req => new URL(req.url).pathname === "/data/ringkas/pesisir.json" ? new Response(ringkas) : new Response("tidak ada", {status: 404})});
    const r = await U.api("POST", "/api/pb/dokumen/rakit", D(), MOD2); assert.equal(r.s, 422, nama + " " + r.t);
    assert.equal(await U.n("pb_dokumen"), 0);
  }
});

uji("bekukan: hak, validasi kalimat, hanya draf; kalimat dibersihkan dan batas 1500", async () => {
  for (const h of [{}, GERBANG, H("udara")]) assert.equal((await beku("bukan json", h)).s, 403);
  assert.equal((await beku({id: "0".repeat(16)})).s, 404);
  assert.equal((await beku({id: "salah"})).s, 400);
  for (const kalimat of [{ringkasan: "lorem ipsum ".repeat(130)}, {ringkasan: "hubungi 081234567890"}, {ringkasan: "lihat https://contoh.id"}, {lain: "x"}, "teks", {ringkasan: 5}])
    assert.equal((await beku({id: id1, kalimat})).s, 400, JSON.stringify(kalimat).slice(0, 40));
  assert.equal((await beku({id: id1, kalimat: {ringkasan: PANJANG}}, H("jabar"))).s, 200);   // staf wilayah 32 membekukan wilayahnya
  assert.equal(await n("pb_dokumen", "status = 'beku'"), 1);
});

uji("bekukan: R2 tulis sekali; beku tak bisa dibekukan lagi; pimpinan boleh bekukan (Q32); put kedua pada kunci sama = 409 dan status tetap draf", async () => {
  assert.equal((await beku({id: id1})).s, 409);   // sudah beku
  const obj = await R2.get("dokumen/sitrep/pesisir/2026-11-15/32/v1.json"); assert.ok(obj);
  const dok = JSON.parse(await obj.text()); assert.equal(dok.versi, 1); assert.equal(dok.bagian.find(b => b.kunci === "ringkasan").kalimat_staf, PANJANG);
  const b1 = await DB.prepare("SELECT ukuran, sha FROM pb_dokumen WHERE id = ?").bind(id1).first(); assert.equal(b1.sha.length, 64); assert.ok(b1.ukuran > 0);
  await R2.put("dokumen/sitrep/pesisir/2026-11-15/32/v2.json", "{\"asli\":1}");   // kunci versi 2 sudah terisi
  assert.equal((await beku({id: id2, kalimat: {kebijakan: "arahan"}}, H("pim"))).s, 409);
  assert.equal(await (await R2.get("dokumen/sitrep/pesisir/2026-11-15/32/v2.json")).text(), "{\"asli\":1}");   // tidak ditimpa
  assert.equal((await DB.prepare("SELECT status FROM pb_dokumen WHERE id = ?").bind(id2).first()).status, "draf");
  await R2.delete("dokumen/sitrep/pesisir/2026-11-15/32/v2.json");
  const ok = await beku({id: id2, kalimat: {kebijakan: "arahan"}}, H("pim")); assert.equal(ok.s, 200, ok.t);
  assert.equal(await n("pb_log", "aksi = 'terbit' AND oleh LIKE 'staf:%'"), 2)   // jabar (id1) dan pimpinan (id2);
});

uji("dua bekukan bersamaan memberi satu versi beku", async () => {
  const a = await rakit(D({periode: "2026-11-16"}));
  const [x, y] = await Promise.all([beku({id: a.j.id}), beku({id: a.j.id}, H("koord"))]);
  assert.deepEqual([x.s, y.s].sort(), [200, 409]);
  assert.equal(await n("pb_dokumen", `id = '${a.j.id}' AND status = 'beku'`), 1);
  assert.equal(await n("pb_log", `kunci = '${a.j.id}' AND aksi = 'terbit'`), 1);
});

uji("berkas: fmt hanya json dan pdf (400), draf 409, pdf tak ada 404, tamu 403 seragam, beku berisi dokumen; pemirsa dan udara tidak", async () => {
  const f = (i, fmt, h = MOD2) => api("GET", `/api/pb/dokumen/berkas?id=${i}&fmt=${fmt}`, undefined, h);
  for (const fmt of ["xml", "constructor", "", "json/../x"]) assert.equal((await f(id1, fmt)).s, 400, fmt);
  assert.equal((await f("bukan", "json")).s, 400);
  assert.equal((await f(id1, "json", {})).s, 403); assert.equal((await f("0".repeat(16), "json", {})).s, 403); assert.equal((await f("0".repeat(16), "json")).s, 404);
  assert.equal((await f(id1, "json", H("udara"))).s, 403);
  const draf = await rakit(D({periode: "2026-11-17"})); assert.equal((await f(draf.j.id, "json")).s, 409);
  assert.equal((await f(id1, "pdf")).s, 404);
  for (const h of [MOD2, GERBANG, H("pim"), H("jabar")]) { const r = await f(id1, "json", h); assert.equal(r.s, 200); assert.equal(r.h.get("cache-control"), "private, no-store"); assert.equal(JSON.parse(r.t).jenis, "sitrep"); }
  await R2.put("dokumen/sitrep/pesisir/2026-11-15/32/v1.pdf", "%PDF-1.4");
  assert.equal((await f(id1, "pdf")).s, 200);
});

uji("daftar: metadata tanpa oleh, saring jenis, bencana, periode; staf wilayah wajib sebut provinsinya; tamu 403", async () => {
  const g = (q, h = MOD2) => api("GET", "/api/pb/dokumen?" + q, undefined, h);
  assert.equal((await g("jenis=sitrep", {})).s, 403); assert.equal((await g("jenis=surat", {})).s, 403); assert.equal((await g("jenis=sitrep&bencana=xyz", {})).s, 403); assert.equal((await g("jenis=surat")).s, 400); assert.equal((await g("jenis=sitrep&bencana=xyz")).s, 404);
  const r = await g("jenis=sitrep&periode=2026-11-15"); assert.equal(r.s, 200); assert.equal(r.j.dokumen.length, 2);
  assert.deepEqual(r.j.dokumen.map(x => x.versi), [2, 1]); assert.ok(r.j.dokumen.every(x => !("oleh" in x)));
  assert.ok(!r.t.includes("admin:") && !r.t.includes("staf:"));
  assert.equal((await g("jenis=sitrep")).j.dokumen.length, 4);
  assert.equal((await g("jenis=laporan_kib&bencana=pesisir")).j.dokumen.length, 1);
  assert.equal((await g("jenis=sitrep&periode=2026-11-16", GERBANG)).j.dokumen.length, 1);
  assert.equal((await g("jenis=sitrep", H("jabar"))).s, 403); assert.equal((await g("jenis=sitrep&prov=32", H("jabar"))).s, 200);
});

uji("kueri dokumen SEARCH, bukan SCAN", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  for (const sql of [PB_SQL_DOK.rakit, PB_SQL_DOK.satu, PB_SQL_DOK.daftar, PB_SQL_DOK.beku]) {
    const p = db.prepare("EXPLAIN QUERY PLAN " + sql).all().map(r => r.detail).filter(d => /^SCAN (pb_|h\b|r\b)/.test(d));
    assert.deepEqual(p, [], sql.slice(0, 60));
  }
});

uji("tanpa migrasi 0131: rakit 503, daftar tersedia:false", async () => {
  const U = await siapkan("uji-pb-dokumen-lama", {r2: true, sampai: "0131_", ikat: {PB_REGISTRI: REG}});
  assert.equal((await U.api("POST", "/api/pb/dokumen/rakit", D(), MOD2)).s, 503);
  const d = await U.api("GET", "/api/pb/dokumen?jenis=sitrep", undefined, MOD2); assert.equal(d.s, 200); assert.equal(d.j.tersedia, false);
});
