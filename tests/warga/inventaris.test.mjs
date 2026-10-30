/* Inventaris peralatan pemadam (src/inventaris.js, migrations/0031_inventaris.sql) di workerd (Miniflare) dengan D1 + R2 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock).
   Dibuktikan: skema idempoten dan CHECK/trigger menahan; kepemilikan (akun lain 404); jejak append-only; gudang terdekat dengan alat siap; dikerahkan lalu siap kembali saat padam;
   butir Meja Pantau > 30 hari; agregat provinsi; PIC pihak lain tidak bocor; dummy per DUMMY.md; 503 sopan tanpa 0031.
   Jalankan: node --test tests/warga/inventaris.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {KATEGORI, KELAS_POMPA, JENIS_GUDANG, KONDISI, STATUS, inventarisProvinsi, cekAlat, cekGudang, KATEGORI_P3K, SATUAN_P3K, cekP3k, butirP3k} from "../../src/inventaris.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const uji = berantai();
const U = await siapkan("uji-inventaris", {r2: true});
const {DB, api, n} = U;
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o, db = DB) => db.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `192.0.2.${++ipN % 250}`});

/* ---------------- akun instansi aktif dengan sandi yang diketahui uji; masuk lewat rute sungguhan ---------------- */
const SANDI = "SandiUji123456";
const akun = async (username, o = {}, V = U) => {
  const garam = "c".repeat(32), id = id16();
  await sisip("instansi_akun", {id, username, jenis: "pemkab", tingkat: "kab", wilayah: "Pemerintah Kabupaten " + username, kunci_wilayah: "k" + id, cakupan: '["62"]', prov: "62", kab: "Kapuas", garam, sandi_sha: sha256(garam + SANDI),
    status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat: Date.now() - 3 * HARI, dummy: 0, ...o}, V.DB);
  const m = await V.api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0];
  return {id, username, h: {cookie}, hp: {cookie, ...PB}};
};
const KAP = {tingkat: "kab", prov: "62", kab: "Kapuas", cakupan: '["62"]'}, PROV62 = {jenis: "pemprov", tingkat: "prov", prov: null, kab: null, cakupan: '["62"]'}, PROV11 = {jenis: "pemprov", tingkat: "prov", prov: null, kab: null, cakupan: '["11"]', wilayah: "Provinsi Aceh"};
const GET = (a, j, V = U) => V.api("GET", j, undefined, a.h), POST = (a, j, b, V = U) => V.api("POST", j, b, a.hp);

/* ---------------- staf Meja Pantau ---------------- */
let nipN = 0;
const bikin = async (nama, peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19950${++nipN}0012005`, unit: "Pusdalops BNPB", email: `i${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};

/* ---------------- tugas api yang sudah dikonfirmasi (api ada) dekat Kapuas ---------------- */
const TUGAS_REK = {kebutuhan: {target_hari: 3, dasar: {luas_ha: [8, 12, 20]}, total: {regu: [2, 4, 6], pompa: [{kelas: "debit_besar", hp: 5.5, unit: [2, 4, 6]}, {kelas: "tekanan_tinggi", hp: 10.7, unit: [1, 2, 3]}, {kelas: "jinjing_ringan", hp: 2.1, unit: [1, 1, 2]}]}}};
const tugas = async (akunId, o = {}, V = U) => {
  const id = id16(), t = {id, prov: "62", kab: "Kapuas", kec: "Mentaya", lat: -2.2, lon: 113.9, level: 3, n24: 4, luas_ha: 8, dibuat: Date.now() - 8 * JAM, terakhir_terdeteksi: Date.now() - 2 * JAM, status: "buka",
    konfirmasi_pada: Date.now() - 6 * JAM, isian_terakhir: Date.now() - 6 * JAM, rekomendasi: JSON.stringify(TUGAS_REK), dummy: 0, ...o};
  await sisip("tugas_api", t, V.DB);
  await sisip("tugas_isian", {id: id16(), tugas_id: id, akun_id: akunId, klien_id: "konf" + id, langkah: "konfirmasi", dibuat: Date.now() - 6 * JAM, lat: -2.2, lon: 113.9, waktu_gps: Date.now() - 6 * JAM, hasil: "api_ada", pic_nama: "Pak Joko", pic_jabatan: "Kades", pic_wa: "628111222333", dummy: 0}, V.DB);
  return id;
};
const km = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371; };

let A, B, C, D;   // A pemkab Kapuas, B polres Kapuas, C pemprov Kalteng, D pemprov Aceh
let gA, gA2, gC, gD, aPompaA, aSelangA;
const gudangBadan = (o = {}) => ({nama: "Gudang BPBD Kapuas", jenis: "gudang", alamat: "Jl. Contoh 1", lat: -2.25, lon: 113.95, sumber_koordinat: "peta", pic_nama: "Pak Rahmat", pic_wa: "081234500001", ...o});
const alatBadan = (g, o = {}) => ({gudang_id: g, kategori: "pompa", kelas_pompa: "debit_besar", hp: 5.5, merek_model: "Honda WB30", jumlah: 4, kondisi: "baik", ...o});
const jejak = (alatId) => DB.prepare("SELECT aksi, dari, ke, tugas_id, oleh FROM alat_jejak WHERE alat_id = ? ORDER BY id").bind(alatId).all().then(r => r.results);

/* ================================================================ skema */
uji("migrasi 0031 idempoten; CHECK dan trigger menahan kategori liar, kelas pompa salah, rusak berat siap, provinsi di luar cakupan, pindah antar pemilik, jejak hanya menambah", async () => {
  const sql = teks("migrations/0031_inventaris.sql");
  for (let i = 0; i < 2; i++) await DB.batch(pecah(sql).map(s => DB.prepare(s)));
  A = await akun("akuninva", KAP); B = await akun("akuninvb", {...KAP, jenis: "polres"}); C = await akun("akuninvc", PROV62); D = await akun("akuninvd", PROV11);
  const gid = async (akunId, prov = "62") => { const id = id16(); await sisip("gudang", {id, akun_id: akunId, nama: "G uji " + id.slice(0, 4), jenis: "gudang", prov, lat: -2.2, lon: 113.9, dibuat: 1, diubah: 1}); return id; };
  const g1 = await gid(A.id), g2 = await gid(B.id), alat = o => sisip("alat", {id: id16(), gudang_id: g1, kategori: "nozzle", jumlah: 1, dibuat: 1, diubah: 1, ...o});
  await assert.rejects(() => alat({kategori: "bazoka"}), /CHECK/); await assert.rejects(() => alat({kategori: "nozzle", kelas_pompa: "debit_besar"}), /CHECK/);
  await assert.rejects(() => alat({kategori: "pompa", kelas_pompa: "super"}), /CHECK/); await assert.rejects(() => alat({jumlah: 0}), /CHECK/); await assert.rejects(() => alat({kondisi: "hancur"}), /CHECK/);
  await assert.rejects(() => alat({kondisi: "rusak_berat", status: "siap"}), /CHECK/, "rusak berat tidak boleh siap"); await alat({kondisi: "rusak_berat", status: "servis"});
  await assert.rejects(() => alat({status: "siap", dikerahkan_ke_tugas: id16()}), /CHECK|FOREIGN/, "tugas hanya bila dikerahkan");
  await assert.rejects(() => sisip("gudang", {id: id16(), akun_id: A.id, nama: "Luar", jenis: "gudang", prov: "11", lat: -2.2, lon: 113.9, dibuat: 1, diubah: 1}), /di luar cakupan/);
  await assert.rejects(() => sisip("gudang", {id: id16(), akun_id: A.id, nama: "Jenis", jenis: "gedung", prov: "62", lat: -2.2, lon: 113.9, dibuat: 1, diubah: 1}), /CHECK/);
  await assert.rejects(() => sisip("gudang", {id: id16(), akun_id: A.id, nama: "Lat", jenis: "gudang", prov: "62", lat: 40, lon: 113.9, dibuat: 1, diubah: 1}), /CHECK/);
  await assert.rejects(() => sisip("gudang", {id: id16(), akun_id: A.id, nama: "WA", jenis: "gudang", prov: "62", lat: -2.2, lon: 113.9, pic_wa: "628123456789", dibuat: 1, diubah: 1}), /CHECK/, "nomor PIC wajib bernama");
  await assert.rejects(() => DB.prepare("UPDATE gudang SET akun_id = ? WHERE id = ?").bind(B.id, g1).run(), /pemilik gudang tidak bisa diganti/);
  await assert.rejects(() => DB.prepare("UPDATE gudang SET prov = '11' WHERE id = ?").bind(g1).run(), /di luar cakupan/);
  const al = id16(); await sisip("alat", {id: al, gudang_id: g1, kategori: "tenda", jumlah: 2, dibuat: 1, diubah: 1});
  await assert.rejects(() => DB.prepare("UPDATE alat SET gudang_id = ? WHERE id = ?").bind(g2, al).run(), /satu pemilik|pihak yang sama/, "alat tidak pindah ke pemilik lain");
  await sisip("alat_jejak", {waktu: 1, oleh: "uji", alat_id: al, gudang_id: g1, aksi: "tambah"});
  await assert.rejects(() => DB.prepare("UPDATE alat_jejak SET aksi = 'hapus'").run(), /hanya bisa ditambah/); await assert.rejects(() => DB.prepare("DELETE FROM alat_jejak WHERE alat_id = ?").bind(al).run(), /hanya bisa ditambah/);
  await assert.rejects(() => sisip("alat_jejak", {waktu: 1, oleh: "uji", alat_id: al, gudang_id: g1, aksi: "teleport"}), /CHECK/);
  for (const t of ["alat_jejak", "alat", "gudang"]) await DB.prepare(`DELETE FROM ${t} WHERE dummy = 0`).run().catch(() => {});   // jejak nyata tak bisa dihapus: dilewati
  await DB.prepare("DELETE FROM alat WHERE 1").run(); await DB.prepare("DELETE FROM gudang WHERE 1").run();
});
uji("daftar tetap: JS == CHECK migrasi == klien; kelas pompa == tabel POMPA taktik.py", async () => {
  const sql = teks("migrations/0031_inventaris.sql"), ambil = (pola) => [...sql.match(pola)[1].matchAll(/'(\w+)'/g)].map(m => m[1]);
  assert.deepEqual(Object.keys(KATEGORI), ambil(/kategori IN \(([^)]*)\)/s)); assert.deepEqual(KELAS_POMPA, ambil(/kelas_pompa IN \(([^)]*)\)/)); assert.deepEqual(Object.keys(JENIS_GUDANG), ambil(/jenis IN \(([^)]*)\)/));
  assert.deepEqual(KONDISI, ambil(/kondisi IN \(([^)]*)\)/)); assert.deepEqual(STATUS, ambil(/status IN \(([^)]*)\)/));
  assert.equal(Object.keys(KATEGORI).length, 20);
  const py = [...teks("scripts/data/taktik.py").match(/POMPA = \[(.*?)\n\]/s)[1].matchAll(/"kelas": "(\w+)"/g)].map(m => m[1]);
  assert.deepEqual([...KELAS_POMPA].sort(), [...py].sort(), "kelas pompa selaras dengan taktik.py");
  const klien = teks("public/instansi_alat.js"); for (const k of Object.keys(KATEGORI)) assert.ok(klien.includes(k + ":"), "klien tak mengenal kategori " + k);
  for (const k of KELAS_POMPA) assert.ok(klien.includes(k + ":"), "klien tak mengenal kelas " + k);
  for (const f of ["public/instansi_alat.js", "public/instansi_alat.css", "public/admin/inventaris.js", "public/admin/inventaris.css", "src/inventaris.js", "migrations/0031_inventaris.sql"]) assert.ok(!teks(f).includes(" · "), `${f}: tanpa pemisah titik tengah`);
  for (const f of ["public/instansi_alat.js", "public/admin/inventaris.js"]) { const js = teks(f); assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/.test(js), f + ": teks data lewat textContent"); assert.ok(js.includes("requestAnimationFrame"), f + ": INP, kerja berat ditunda"); }
  assert.ok(cekAlat({kategori: "pompa", jumlah: 2}).v && cekAlat({kategori: "nozzle", jumlah: 2, kelas_pompa: "debit_besar"}).g && cekAlat({kategori: "nozzle", jumlah: 1.5}).g);
});

/* ================================================================ kepemilikan, CRUD, jejak */
uji("kepemilikan: akun A mengelola gudang dan alatnya; akun B (dan anonim, non-aktif, tanpa x-pb) tidak bisa menyentuhnya, jawabannya 404 yang sama dengan 'tidak ada'", async () => {
  assert.equal((await api("GET", "/api/instansi/gudang")).s, 401); assert.equal((await api("POST", "/api/instansi/gudang", gudangBadan(), {cookie: A.h.cookie})).s, 403, "tanpa x-pb");
  const rb = await akun("akuninvbelum", {...KAP, status: "menunggu"}); assert.equal((await POST(rb, "/api/instansi/gudang", gudangBadan())).s, 403, "akun belum aktif");
  const dasar = await POST(A, "/api/instansi/gudang", gudangBadan()); assert.equal(dasar.s, 201, dasar.t); gA = dasar.j.id;
  for (const [bad, pola] of [[{nama: "x"}, /nama gudang/], [{jenis: "gedung"}, /jenis/], [{lat: 40}, /lokasi/], [{lon: "abc"}, /lokasi/], [{lat: null}, /lokasi/], [{pic_wa: "123"}, /WhatsApp/], [{pic_nama: null}, /nama PIC/], [{sumber_koordinat: "tebak"}, /sumber/], [{prov: "11"}, /provinsi/]])
    { const r = await POST(A, "/api/instansi/gudang", gudangBadan(bad)); assert.equal(r.s, 400, JSON.stringify(bad)); assert.match(r.j.galat, pola); }
  const g = await DB.prepare("SELECT * FROM gudang WHERE id = ?").bind(gA).first(); assert.equal(g.prov, "62"); assert.equal(g.kab, "Kapuas"); assert.equal(g.pic_wa, "6281234500001"); assert.equal(g.sumber_koordinat, "peta");
  /* B tidak bisa menyentuh gudang A */
  for (const aksi of [{aksi: "konfirmasi"}, {aksi: "ubah", nama: "Dibajak"}, {aksi: "hapus"}]) assert.equal((await POST(B, "/api/instansi/gudang/" + gA, aksi)).s, 404, aksi.aksi);
  assert.equal((await POST(B, "/api/instansi/alat", alatBadan(gA))).s, 404, "tambah alat ke gudang pihak lain");
  assert.equal((await POST(B, "/api/instansi/gudang/" + id16(), {aksi: "konfirmasi"})).s, 404, "gudang yang memang tidak ada: jawaban sama");
  const p = await POST(A, "/api/instansi/alat", alatBadan(gA)); assert.equal(p.s, 201, p.t); aPompaA = p.j.id;
  const s = await POST(A, "/api/instansi/alat", {gudang_id: gA, kategori: "selang_2_5", kapasitas: 20, jumlah: 30, kondisi: "baik"}); assert.equal(s.s, 201); aSelangA = s.j.id;
  for (const aksi of [{aksi: "ubah", jumlah: 99}, {aksi: "hapus"}]) assert.equal((await POST(B, "/api/instansi/alat/" + aPompaA, aksi)).s, 404);
  assert.equal((await POST(B, "/api/instansi/alat/kerahkan", {tugas_id: id16(), alat: [aPompaA]})).s, 404, "tugas tidak ada"); assert.equal((await GET(B, "/api/instansi/foto-alat/" + aPompaA)).s, 404);
  assert.equal((await DB.prepare("SELECT jumlah FROM alat WHERE id = ?").bind(aPompaA).first()).jumlah, 4, "tak berubah");
  /* validasi alat */
  for (const [bad, pola] of [[{kategori: "bazoka"}, /kategori/], [{jumlah: 0}, /jumlah/], [{jumlah: 2.5}, /jumlah/], [{kelas_pompa: "super"}, /kelas pompa/], [{kategori: "nozzle", kelas_pompa: "debit_besar"}, /hanya untuk kategori pompa/], [{kondisi: "hancur"}, /kondisi/],
    [{hp: -1}, /hp/], [{tahun: 1800}, /tahun/], [{status: "dikerahkan"}, /status awal/], [{gudang_id: "bukan"}, /gudang/]])
    { const r = await POST(A, "/api/instansi/alat", alatBadan(gA, bad)); assert.ok([400, 404].includes(r.s), JSON.stringify(bad)); }
  /* daftar milik sendiri */
  const mine = await GET(A, "/api/instansi/gudang"); assert.equal(mine.s, 200); assert.equal(mine.j.gudang.length, 1); assert.equal(mine.j.gudang[0].alat.length, 2); assert.equal(mine.j.kamus.kategori.length, 20);
  assert.equal((await GET(B, "/api/instansi/gudang")).j.gudang.length, 0, "B tidak melihat gudang A");
  assert.ok(!mine.t.includes("akun_id") && !mine.t.includes("dummy"), "kolom internal tidak keluar");
});
uji("jejak: tambah, jumlah, kondisi, status (rusak berat otomatis servis), pindah gudang, hapus; jejak tetap ada sesudah alat dihapus; konfirmasi memperbarui diubah", async () => {
  const g2 = await POST(A, "/api/instansi/gudang", gudangBadan({nama: "Pos Daops Kapuas", jenis: "pos_daops", lat: -2.4, lon: 114.1, pic_nama: null, pic_wa: null})); gA2 = g2.j.id;
  const ubah = (id, o) => POST(A, "/api/instansi/alat/" + id, {aksi: "ubah", ...o});
  assert.deepEqual((await jejak(aPompaA)).map(j => j.aksi), ["tambah"]);
  assert.equal((await ubah(aPompaA, {jumlah: 6})).s, 200); assert.equal((await ubah(aPompaA, {kondisi: "rusak_ringan"})).s, 200);
  assert.equal((await ubah(aPompaA, {status: "siap", kondisi: "rusak_berat"})).s, 400, "rusak berat tidak bisa siap");
  const rb = await ubah(aPompaA, {kondisi: "rusak_berat"}); assert.equal(rb.s, 200); assert.equal(rb.j.alat.status, "servis", "rusak berat otomatis servis");
  assert.equal((await ubah(aPompaA, {kondisi: "baik"})).s, 200); const siap = await ubah(aPompaA, {status: "siap"}); assert.equal(siap.j.alat.status, "siap");
  assert.equal((await ubah(aPompaA, {status: "dikerahkan"})).s, 400, "dikerahkan hanya lewat tugas api");
  assert.equal((await ubah(aPompaA, {gudang_id: gA2})).s, 200); assert.equal((await DB.prepare("SELECT gudang_id FROM alat WHERE id = ?").bind(aPompaA).first()).gudang_id, gA2);
  assert.equal((await ubah(aPompaA, {gudang_id: id16()})).s, 404, "gudang tujuan tak ada"); assert.equal((await ubah(aPompaA, {gudang_id: (await DB.prepare("SELECT id FROM gudang WHERE akun_id != ? LIMIT 1").bind(A.id).first())?.id ?? id16()})).s, 404, "gudang pihak lain");
  assert.equal((await ubah(aPompaA, {merek_model: "Honda WB30X"})).s, 200);
  const j = await jejak(aPompaA);
  assert.deepEqual(j.map(x => x.aksi), ["tambah", "jumlah", "kondisi", "kondisi", "status", "kondisi", "status", "pindah"], "urutan jejak");
  assert.deepEqual(j.filter(x => x.aksi === "jumlah").map(x => [x.dari, x.ke]), [["4", "6"]]); assert.deepEqual(j.filter(x => x.aksi === "status").map(x => [x.dari, x.ke]), [["siap", "servis"], ["servis", "siap"]]);
  assert.deepEqual(j.filter(x => x.aksi === "kondisi").map(x => [x.dari, x.ke]), [["baik", "rusak_ringan"], ["rusak_ringan", "rusak_berat"], ["rusak_berat", "baik"]]);
  assert.deepEqual(j.filter(x => x.aksi === "pindah").map(x => [x.dari, x.ke]), [["Gudang BPBD Kapuas", "Pos Daops Kapuas"]]); assert.ok(j.every(x => x.oleh === A.id), "pelaku tercatat");
  /* pindahkan kembali supaya uji berikutnya punya pompa di gA */
  assert.equal((await ubah(aPompaA, {gudang_id: gA})).s, 200);
  /* konfirmasi masih sama: hanya diubah yang bergerak */
  await DB.prepare("UPDATE gudang SET diubah = ? WHERE id = ?").bind(Date.now() - 40 * HARI, gA).run();
  const lama = (await GET(A, "/api/instansi/gudang")).j.gudang.find(g => g.id === gA); assert.equal(lama.basi, true);
  const k = await POST(A, "/api/instansi/gudang/" + gA, {aksi: "konfirmasi"}); assert.equal(k.s, 200); const baru = (await GET(A, "/api/instansi/gudang")).j.gudang.find(g => g.id === gA);
  assert.equal(baru.basi, false); assert.ok(baru.diubah >= Date.now() - 60e3); assert.equal(baru.alat.length, 2, "isi tak berubah");
  /* hapus alat: jejak hapus ada dan jejak lama tetap ada; gudang berisi tak bisa dihapus */
  const tmp = (await POST(A, "/api/instansi/alat", {gudang_id: gA2, kategori: "tenda", jumlah: 3})).j.id;
  assert.equal((await POST(A, "/api/instansi/alat/" + tmp, {aksi: "hapus"})).s, 200); assert.deepEqual((await jejak(tmp)).map(x => x.aksi), ["tambah", "hapus"]); assert.equal(await n("alat", `id = '${tmp}'`), 0);
  assert.equal((await POST(A, "/api/instansi/gudang/" + gA, {aksi: "hapus"})).s, 409, "gudang masih berisi alat");
  assert.equal((await POST(A, "/api/instansi/gudang/" + gA2, {aksi: "ubah", nama: "Pos Daops Kapuas Utara", lat: -2.41})).s, 200); assert.equal((await DB.prepare("SELECT nama, pic_nama FROM gudang WHERE id = ?").bind(gA2).first()).nama, "Pos Daops Kapuas Utara");
  assert.equal((await POST(A, "/api/instansi/gudang/" + gA2, {aksi: "ubah", lat: 99})).s, 400);
  assert.equal((await POST(A, "/api/instansi/gudang/" + gA2, {aksi: "aneh"})).s, 400);
});
uji("foto alat opsional: JPEG dibersihkan dan disimpan di R2, hanya pemilik (dan admin) yang melihat; bukan gambar ditolak; tanpa Content-Length 411", async () => {
  const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi], te = t => [...new TextEncoder().encode(t)];
  const jpg = new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...te("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...seg(0xe1, [...te("Exif"), 0, 0, ...te("GPS-LOKASI-RAHASIA")]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(30).fill(7), 0xff, 0xd9]);
  const kirim = (a, id, isi, h = {}) => U.mf.dispatchFetch("http://bnpb.lokal/api/instansi/foto-alat/" + id, {method: "POST", headers: {...a.hp, "content-length": String(isi.length), ...h}, body: isi});
  assert.equal((await kirim(B, aPompaA, jpg)).status, 404); assert.equal((await kirim(A, aPompaA, new TextEncoder().encode("bukan gambar"))).status, 400);
  const r = await kirim(A, aPompaA, jpg); assert.equal(r.status, 200); const t = await (await GET(A, "/api/instansi/foto-alat/" + aPompaA)).t;
  const o = await (await U.mf.getR2Bucket("MEDIA")).get("inventaris/foto/" + aPompaA); const b = new Uint8Array(await o.arrayBuffer());
  assert.ok(b.length > 0 && !new TextDecoder("latin1").decode(b).includes("GPS-LOKASI-RAHASIA"), "EXIF dibuang"); assert.equal((await DB.prepare("SELECT foto FROM alat WHERE id = ?").bind(aPompaA).first()).foto, 1);
  assert.equal((await GET(B, "/api/instansi/foto-alat/" + aPompaA)).s, 404); assert.equal((await api("GET", "/api/inventaris/foto/" + aPompaA, undefined, ADMIN)).s, 200); assert.equal((await api("GET", "/api/inventaris/foto/" + aPompaA, undefined, GERBANG)).s, 403);
  const tanpa = await U.mf.dispatchFetch("http://bnpb.lokal/api/instansi/foto-alat/" + aPompaA, {method: "POST", headers: A.hp}); assert.equal(tanpa.status, 411); await tanpa.text();
});

/* ================================================================ gudang terdekat, kerahkan, padam */
let T1;
uji("gudang terdekat dengan alat siap: diurut jarak garis lurus, hanya alat siap, kelas pompa rekomendasi dicocokkan, PIC hanya milik sendiri (admin melihat semua)", async () => {
  /* C (pemprov Kalteng) ~30 km dari tugas dengan debit_besar siap, tekanan_tinggi hanya rusak berat (servis); D (Aceh) jauh; gudang Kapuas A ~6 km */
  gC = (await POST(C, "/api/instansi/gudang", gudangBadan({nama: "Gudang Pemprov Kalteng", lat: -2.45, lon: 114.1, pic_nama: "Bu Sari Rahasia", pic_wa: "081299900001"}))).j.id;
  assert.equal((await POST(C, "/api/instansi/alat", alatBadan(gC, {jumlah: 10}))).s, 201); assert.equal((await POST(C, "/api/instansi/alat", alatBadan(gC, {kelas_pompa: "tekanan_tinggi", hp: 10.7, jumlah: 5, kondisi: "rusak_berat"}))).s, 201);
  assert.equal((await POST(C, "/api/instansi/alat", {gudang_id: gC, kategori: "mobil_tangki", kapasitas: 6000, jumlah: 2})).s, 201);
  gD = (await POST(D, "/api/instansi/gudang", gudangBadan({nama: "Gudang Aceh", lat: 4.6, lon: 96.8, pic_nama: "Pak Aceh", pic_wa: "081299900002"}))).j.id; await POST(D, "/api/instansi/alat", alatBadan(gD));
  const kosongG = (await POST(A, "/api/instansi/gudang", gudangBadan({nama: "Gudang Kosong Dekat", lat: -2.21, lon: 113.91}))).j.id;   // dekat sekali tetapi tanpa alat siap: tidak muncul
  await POST(A, "/api/instansi/alat", {gudang_id: kosongG, kategori: "tenda", jumlah: 1, status: "servis"});
  T1 = await tugas(A.id);
  const r = await GET(A, "/api/instansi/tugas/" + T1); assert.equal(r.s, 200, r.t); const gt = r.j.gudang_terdekat;
  assert.deepEqual(gt.gudang.map(g => g.id), [gA, gC], "gudang A lalu C; gudang tanpa alat siap dan gudang provinsi lain tidak muncul");
  const nama = gt.gudang.map(g => g.nama); assert.ok(!nama.includes("Gudang Kosong Dekat") && !nama.includes("Gudang Aceh"), nama.join()); assert.deepEqual(nama.at(-1), "Gudang Pemprov Kalteng");
  const jarakC = km(-2.2, 113.9, -2.45, 114.1); assert.ok(Math.abs(gt.gudang.at(-1).jarak_km - jarakC) < 0.1, `${gt.gudang.at(-1).jarak_km} vs ${jarakC}`);
  assert.deepEqual(gt.gudang.map(g => g.jarak_km), [...gt.gudang.map(g => g.jarak_km)].sort((x, y) => x - y), "urut jarak");
  const gc = gt.gudang.find(g => g.id === gC); assert.deepEqual(gc.alat.map(a => [a.kategori, a.kelas_pompa, a.jumlah]).sort(), [["mobil_tangki", null, 2], ["pompa", "debit_besar", 10]], "rusak berat tidak dihitung siap");
  assert.equal(gc.pic_wa, undefined, "PIC milik C tidak bocor ke A"); assert.equal(gt.gudang.find(g => g.milik_saya).pic_wa, "6281234500001", "PIC milik sendiri terlihat");
  const pm = Object.fromEntries(gt.pompa.map(p => [p.kelas, p])); assert.equal(pm.debit_besar.perlu, 4); assert.equal(pm.debit_besar.total_siap, 16, "6 di A + 10 di C"); assert.deepEqual(pm.debit_besar.tersedia.map(x => x.gudang_id), [gA, gC]);
  assert.equal(pm.tekanan_tinggi.total_siap, 0, "satu-satunya tekanan tinggi rusak berat"); assert.equal(pm.jinjing_ringan.perlu, 1);
  assert.ok(!JSON.stringify(r.j).includes("081299900001") && !JSON.stringify(r.j).includes("6281299900001") && !JSON.stringify(r.j).includes("Rahasia"), "tidak ada PIC pihak lain di rincian tugas");
  const rb = await GET(B, "/api/instansi/tugas/" + T1); assert.equal(rb.s, 200, "polres satu kabupaten melihat tugas yang sama"); assert.ok(!rb.t.includes("6281234500001") && !rb.t.includes("Pak Rahmat"), "PIC milik A tidak bocor ke B"); assert.ok(rb.j.gudang_terdekat.gudang.length >= 2);
  const adm = await api("GET", "/api/instansi/admin/tugas/" + T1, undefined, MOD2); assert.equal(adm.s, 200); assert.ok(adm.j.gudang_terdekat.gudang.find(g => g.id === gC).pic_wa === "6281299900001", "admin melihat PIC");
  assert.equal((await api("GET", "/api/instansi/admin/tugas/" + T1, undefined, GERBANG)).s, 403);
});
const KABAR = (o = {}) => ({klien_id: "inv-klien-" + id16(), tindakan: "Pemadaman darat dengan pompa", status_api: "bara", kendala: [], bantuan: [], media: [], ...o});
/* melaporkan padam kini wajib melampirkan minimal satu foto atau video lokasi: baris media langsung di D1 (rute unggah diuji di instansi.test.mjs) */
const media = async (akunId, tugasId, db = DB) => { const id = id16(); await sisip("instansi_media", {id, akun_id: akunId, tugas_id: tugasId, jenis: "foto", mime: "image/jpeg", ukuran: 1000, waktu_ambil: Date.now(), sumber_waktu: "unggah", lat: -2.2, lon: 113.9, waktu_gps: Date.now(), dibuat: Date.now()}, db); return id; };
const statusAlat = id => DB.prepare("SELECT status, dikerahkan_ke_tugas t FROM alat WHERE id = ?").bind(id).first();
uji("dikerahkan lalu siap: kabar tindakan dengan alat_inventaris mengerahkan alat siap milik sendiri; padam mengembalikan siap; manual juga bisa; alat pihak lain atau tidak siap ditolak", async () => {
  const aB = (await POST(B, "/api/instansi/gudang", gudangBadan({nama: "Gudang Polres"}))).j.id, alB = (await POST(B, "/api/instansi/alat", alatBadan(aB))).j.id;
  const r0 = await POST(A, "/api/instansi/kabar/" + T1, KABAR({alat_inventaris: [alB]})); assert.equal(r0.s, 404, r0.t); assert.equal((await statusAlat(alB)).status, "siap", "alat B tak tersentuh");
  assert.equal(await n("tugas_isian", `tugas_id = '${T1}' AND langkah = 'tindakan'`), 0, "kabar yang ditolak tidak meninggalkan isian");
  assert.equal((await POST(A, "/api/instansi/kabar/" + T1, KABAR({alat_inventaris: "satu"}))).s, 400); assert.equal((await POST(A, "/api/instansi/kabar/" + T1, KABAR({alat_inventaris: [aPompaA, aPompaA]}))).s, 400, "duplikat");
  const dibumi = (await DB.prepare("SELECT diubah FROM gudang WHERE id = ?").bind(gA).first()).diubah;
  const ok = await POST(A, "/api/instansi/kabar/" + T1, KABAR({alat_inventaris: [aPompaA, aSelangA], alat_dipakai: {pompa: 6, selang_m: 600}})); assert.equal(ok.s, 201, ok.t);
  for (const id of [aPompaA, aSelangA]) assert.deepEqual({...(await statusAlat(id))}, {status: "dikerahkan", t: T1});
  assert.deepEqual((await jejak(aPompaA)).at(-1), {aksi: "status", dari: "siap", ke: "dikerahkan", tugas_id: T1, oleh: A.id});
  assert.ok((await DB.prepare("SELECT diubah FROM gudang WHERE id = ?").bind(gA).first()).diubah > dibumi, "mengerahkan memperbarui gudang");
  assert.equal((await POST(A, "/api/instansi/kabar/" + T1, KABAR({alat_inventaris: [aPompaA]}))).s, 409);
  assert.ok(!(await GET(A, "/api/instansi/tugas/" + T1)).j.gudang_terdekat.gudang.some(g => g.id === gA && g.alat.some(a => a.kategori === "pompa")), "dikerahkan bukan siap");
  await assert.rejects(() => DB.prepare("UPDATE alat SET status = 'siap' WHERE id = ?").bind(aPompaA).run(), /CHECK/, "siap tak boleh membawa tugas");
  const pd = await POST(A, "/api/instansi/kabar/" + T1, KABAR({status_api: "padam", media: [await media(A.id, T1)]})); assert.equal(pd.s, 201, pd.t);
  for (const id of [aPompaA, aSelangA]) assert.deepEqual({...(await statusAlat(id))}, {status: "siap", t: null});
  assert.deepEqual((await jejak(aPompaA)).at(-1), {aksi: "status", dari: "dikerahkan", ke: "siap", tugas_id: T1, oleh: "sistem"});
  assert.equal((await POST(A, "/api/instansi/alat/kerahkan", {tugas_id: T1, alat: [aPompaA]})).s, 409, "tugas sudah padam");
  const T2 = await tugas(A.id); const k = await POST(A, "/api/instansi/alat/kerahkan", {tugas_id: T2, alat: [aPompaA]}); assert.equal(k.s, 200, k.t); assert.equal((await statusAlat(aPompaA)).t, T2);
  assert.equal((await POST(A, "/api/instansi/alat/kerahkan", {tugas_id: T2, alat: [aPompaA]})).s, 409, "sudah dikerahkan"); assert.equal((await POST(B, "/api/instansi/alat/kerahkan", {tugas_id: T2, alat: [alB]})).s, 200, "B satu kabupaten, alatnya sendiri");
  const manual = await POST(A, "/api/instansi/alat/" + aPompaA, {aksi: "ubah", status: "siap"}); assert.equal(manual.s, 200); assert.deepEqual({...(await statusAlat(aPompaA))}, {status: "siap", t: null});
  assert.deepEqual((await jejak(aPompaA)).at(-1), {aksi: "status", dari: "dikerahkan", ke: "siap", tugas_id: T2, oleh: A.id}); await POST(B, "/api/instansi/alat/" + alB, {aksi: "ubah", status: "siap"});
  const tTutup = await tugas(A.id, {status: "bukan_api"}); assert.equal((await POST(A, "/api/instansi/alat/kerahkan", {tugas_id: tTutup, alat: [aPompaA]})).s, 409, "tugas tertutup");
  const tAceh = await tugas(D.id, {prov: "11", kab: "Aceh Barat"}); assert.equal((await POST(A, "/api/instansi/alat/kerahkan", {tugas_id: tAceh, alat: [aPompaA]})).s, 404, "tugas di luar wilayah A");
});

/* ================================================================ Meja Pantau dan agregat */
uji("butir Meja Pantau: gudang diubah > 30 hari muncul untuk pusdalops (berwilayah), hilang sesudah konfirmasi; peran lain dan wilayah lain tidak melihatnya", async () => {
  const pus = await bikin("Pusdalops Kalteng", ["pusdalops"], ["62"]), pusAceh = await bikin("Pusdalops Aceh", ["pusdalops"], ["11"]), ana = await bikin("Analis", ["analis_konsesi"]), koord = await bikin("Koordinator", ["koordalops"]);
  const ada = async (s, jenis = "inventaris_lama") => (await api("GET", "/api/pantau", undefined, s.h)).j.butir.filter(b => b.jenis === jenis);
  assert.equal((await ada(pus)).length, 0, "semua gudang segar");
  const lama = Date.now() - 45 * HARI; await DB.prepare("UPDATE gudang SET diubah = ? WHERE id = ?").bind(lama, gA).run();
  const b = await ada(pus); assert.equal(b.length, 1); assert.equal(b[0].id, `inv:${gA}:${lama}`); assert.match(b[0].judul, /Inventaris Gudang BPBD Kapuas .* belum diperbarui 45 hari, batasnya 30 hari/); assert.equal(b[0].terlambat, true); assert.equal(b[0].prov, "62"); assert.equal(b[0].tautan, "/admin/inventaris");
  assert.equal((await ada(pusAceh)).length, 0, "wilayah lain"); assert.equal((await ada(ana)).length, 0, "peran lain"); assert.equal((await ada(koord)).length, 1, "koordinator melihat semua jenis"); assert.equal((await ada({h: ADMIN})).length, 1);
  assert.equal((await api("GET", "/api/pantau", undefined, pus.h)).j.jenis.inventaris_lama, "Inventaris lebih dari 30 hari belum diperbarui");
  const ambil = await api("POST", "/api/pantau/butir", {id: b[0].id, aksi: "ambil"}, pus.hp); assert.equal(ambil.s, 200, ambil.t);
  await POST(A, "/api/instansi/gudang/" + gA, {aksi: "konfirmasi"}); assert.equal((await ada(pus)).length, 0, "kondisinya tak berlaku lagi: butir hilang sendiri");
  await DB.prepare("UPDATE gudang SET diubah = ? WHERE id = ?").bind(Date.now() - 70 * HARI, gA).run(); const lagi = await ada(pus); assert.equal(lagi.length, 1); assert.notEqual(lagi[0].id, b[0].id, "kambuh = butir baru"); assert.equal(lagi[0].prioritas, 2);
  await DB.prepare("UPDATE instansi_akun SET status = 'dicabut' WHERE id = ?").bind(A.id).run(); assert.equal((await ada(pus)).length, 0, "akun dicabut: tak ditagih"); await DB.prepare("UPDATE instansi_akun SET status = 'aktif' WHERE id = ?").bind(A.id).run();
  await POST(A, "/api/instansi/gudang/" + gA, {aksi: "konfirmasi"});
});
uji("agregat inventarisProvinsi: alat siap per kategori per provinsi, tanpa dikerahkan, servis, rusak berat, atau dummy", async () => {
  const x = await inventarisProvinsi({DB}), p62 = x.provinsi.find(p => p.prov === "62"), p11 = x.provinsi.find(p => p.prov === "11");
  assert.equal(p62.nama, "Kalimantan Tengah"); assert.equal(p62.siap.pompa, 6 + 10 + 4, "6 (A) + 10 (C) + 4 (B); 5 rusak berat tidak ikut"); assert.equal(p62.siap.mobil_tangki, 2); assert.equal(p62.siap.selang_2_5, 30); assert.equal(p62.siap.tenda, 0, "servis tidak siap");
  assert.equal(p11.siap.pompa, 4); assert.ok(Object.keys(p62.siap).length === 20 && Object.keys(p62.siap).every(k => k in KATEGORI));
  assert.equal(p62.total_siap, Object.values(p62.siap).reduce((s, v) => s + v, 0));
  const T3 = await tugas(A.id); assert.equal((await POST(A, "/api/instansi/alat/kerahkan", {tugas_id: T3, alat: [aSelangA]})).s, 200);
  assert.equal((await inventarisProvinsi({DB})).provinsi.find(p => p.prov === "62").siap.selang_2_5, 0, "dikerahkan keluar dari agregat");
  await POST(A, "/api/instansi/alat/" + aSelangA, {aksi: "ubah", status: "siap"});
  assert.deepEqual(await inventarisProvinsi({DB: {prepare: () => { throw new Error("no such table: gudang"); }}}), {provinsi: []}, "tanpa 0031: kosong, tidak melempar");
});
uji("privasi: ringkasan wilayah tanpa PIC dan alamat pihak lain; admin dan staf melihat semua sesuai wilayah; akun gerbang, analis, anonim ditolak; penyaring pihak dan provinsi", async () => {
  const w = await GET(A, "/api/instansi/inventaris/wilayah"); assert.equal(w.s, 200, w.t);
  const nm = w.j.gudang.map(g => g.nama); assert.ok(nm.includes("Gudang Pemprov Kalteng") && nm.includes("Gudang Polres") && nm.includes("Gudang BPBD Kapuas") && !nm.includes("Gudang Aceh"), nm.join());
  for (const g of w.j.gudang) assert.ok(!("pic_nama" in g) && !("pic_wa" in g) && !("alamat" in g) && !("akun_id" in g), "gudang tanpa kontak");
  for (const rahasia of ["081299900001", "6281299900001", "Bu Sari Rahasia", "Pak Rahmat"]) assert.ok(!w.t.includes(rahasia), "bocor: " + rahasia);
  assert.ok(w.j.gudang.filter(g => g.milik_saya).every(g => ["Gudang BPBD Kapuas", "Pos Daops Kapuas Utara", "Gudang Kosong Dekat"].includes(g.nama)) && w.j.gudang.filter(g => g.milik_saya).length === 3);
  assert.equal(w.j.gudang.find(g => g.id === gC).pemilik.jenis, "pemprov"); assert.equal(w.j.total_siap.mobil_tangki, 2);
  assert.ok(!(await GET(D, "/api/instansi/inventaris/wilayah")).j.gudang.some(g => g.prov !== "11"), "Aceh hanya melihat Aceh");
  const pus = await bikin("Pusdalops 62", ["pusdalops"], ["62"]), pim = await bikin("Pimpinan", ["pimpinan"]), ver = await bikin("Verif", ["verifikator"]), ana = await bikin("Analis2", ["analis_konsesi"]), tmc = await bikin("TMC", ["tmc"]);
  const lihat = (h, q = "") => api("GET", "/api/inventaris" + q, undefined, h);
  const adm = await lihat(ADMIN); assert.equal(adm.s, 200); assert.equal(adm.j.super, true); assert.equal((await lihat(MOD2)).j.super, false);
  const gc = adm.j.gudang.find(g => g.id === gC); assert.equal(gc.pic_wa, "6281299900001"); assert.equal(gc.pemilik.jenis, "pemprov"); assert.equal(gc.siap, 12, "10 debit_besar + 2 mobil tangki"); assert.equal(gc.total, 17);
  assert.ok(adm.j.gudang.some(g => g.prov === "11") && adm.j.rekap.map(r => r.prov).join() === "11,62");
  const r62 = adm.j.rekap.find(r => r.prov === "62"); assert.deepEqual(r62.kategori.pompa, {total: 6 + 10 + 5 + 4, siap: 20, dikerahkan: 0}); assert.equal(r62.gudang, 5);
  const p62 = await lihat(pus.h); assert.equal(p62.s, 200); assert.ok(p62.j.gudang.every(g => g.prov === "62") && p62.j.gudang.length === 5 && p62.j.rekap.length === 1, "staf berwilayah hanya provinsinya");
  for (const s of [pim, ver]) assert.equal((await lihat(s.h)).j.gudang.length, adm.j.gudang.length);
  for (const [nama, h] of [["analis", ana.h], ["tmc", tmc.h], ["gerbang", GERBANG]]) assert.equal((await lihat(h)).s, 403, nama); assert.equal((await api("GET", "/api/inventaris")).s, 403);
  assert.equal((await lihat(MOD2, "?pihak=polres")).j.gudang.length, 1); assert.equal((await lihat(MOD2, "?pihak=polres")).j.gudang[0].pemilik.jenis, "polres");
  assert.deepEqual((await lihat(MOD2, "?prov=11")).j.gudang.map(g => g.nama), ["Gudang Aceh"]); assert.equal((await lihat(MOD2, "?prov=1")).s, 400); assert.equal((await lihat(MOD2, "?pihak=raja")).s, 400);
  assert.equal((await lihat(pus.h, "?prov=11")).j.gudang.length, 0, "staf Kalteng minta Aceh: kosong");
  const rin = await api("GET", "/api/inventaris/gudang/" + gC, undefined, pus.h); assert.equal(rin.s, 200); assert.equal(rin.j.alat.length, 3); assert.ok(rin.j.jejak.length >= 3 && rin.j.jejak.every(j => j.oleh === "pemilik" || j.oleh === "sistem"), "jejak tanpa id akun");
  assert.equal((await api("GET", "/api/inventaris/gudang/" + gD, undefined, pus.h)).s, 404, "gudang di luar wilayah staf = tidak ada"); assert.equal((await api("GET", "/api/inventaris/gudang/" + gD, undefined, GERBANG)).s, 403);
  const hal = await U.mf.dispatchFetch("http://bnpb.lokal/admin/inventaris", {headers: ADMIN}), html = await hal.text(); assert.equal(hal.status, 200); assert.match(hal.headers.get("content-security-policy"), /script-src 'self'/);
  assert.ok(html.includes("/admin/inventaris.js") && html.includes("/admin/inventaris.css") && html.includes("/inti/format.js") && html.includes("Inventaris alat")); assert.ok(!html.includes("628") && !/<script>[^<]/.test(html), "kerangka tanpa data dan tanpa skrip inline");
});

/* ================================================================ dummy (DUMMY.md) */
uji("dummy: hanya Super Admin; gudang dan alat di beberapa provinsi dengan semua kategori, kondisi, status; rantai ke rincian tugas dan Meja Pantau; isi ulang 409; hapus bersih tanpa menyentuh data nyata", async () => {
  for (const h of [MOD2, GERBANG, {}]) assert.equal((await api("POST", "/api/inventaris/dummy", {aksi: "isi"}, h)).s, 403);
  assert.equal((await api("POST", "/api/inventaris/dummy", {aksi: "aneh"}, ADMIN)).s, 400);
  const nyata = async () => ({gudang: await n("gudang", "dummy = 0"), alat: await n("alat", "dummy = 0"), jejak: await n("alat_jejak", "dummy = 0"), akun: await n("instansi_akun", "dummy = 0"), tugas: await n("tugas_api", "dummy = 0")}), sebelum = await nyata();
  const isi = await api("POST", "/api/inventaris/dummy", {aksi: "isi"}, ADMIN); assert.equal(isi.s, 201, isi.t); assert.ok(isi.j.gudang >= 9 && isi.j.alat >= 30, isi.t);
  assert.deepEqual(await nyata(), sebelum, "data nyata tak tersentuh oleh isi");
  const distinct = async (kolom, tabel = "alat") => (await DB.prepare(`SELECT DISTINCT ${kolom} v FROM ${tabel} WHERE dummy = 1`).all()).results.map(r => r.v).sort();
  assert.deepEqual(await distinct("kategori"), Object.keys(KATEGORI).sort(), "tiap kategori terisi"); assert.deepEqual(await distinct("kondisi"), [...KONDISI].sort()); assert.deepEqual(await distinct("status"), [...STATUS].sort());
  assert.deepEqual(await distinct("jenis", "gudang"), Object.keys(JENIS_GUDANG).sort(), "tiap jenis gudang terisi"); assert.deepEqual(await distinct("kelas_pompa"), [null, ...KELAS_POMPA].sort(), "tiap kelas pompa");
  const provs = await distinct("prov", "gudang"); assert.ok(provs.length >= 5 && provs.includes("62") && provs.includes("14"), provs.join());
  assert.ok(await n("alat", "dummy = 1 AND status = 'dikerahkan' AND dikerahkan_ke_tugas IS NOT NULL") >= 1, "alat dikerahkan menunjuk tugas dummy"); assert.ok(await n("alat_jejak", "dummy = 1 AND aksi = 'status' AND tugas_id IS NOT NULL") >= 1);
  assert.ok(await n("gudang", `dummy = 1 AND diubah < ${Date.now() - 31 * HARI}`) >= 1, "ada gudang basi untuk butir Meja Pantau"); for (const a of ["tambah", "jumlah", "kondisi", "status"]) assert.ok(await n("alat_jejak", `dummy = 1 AND aksi = '${a}'`) >= 1, "jejak " + a);
  assert.ok(await n("instansi_akun", "dummy = 1 AND username LIKE 'dummyinv%'") === 3);
  /* layar dummy: tiap sel rekap provinsi terisi (bukan nol), staf nyata tidak melihat dummy, dan hulu instansi ikut ada */
  const rekap = (await api("GET", "/api/inventaris", undefined, ADMIN)).j; const dum = rekap.gudang.filter(g => g.dummy); assert.equal(dum.length, isi.j.gudang);
  for (const g of dum) { assert.ok(g.total > 0 && g.pic_nama && g.nama.startsWith("[DUMMY]"), g.nama); }
  for (const r of rekap.rekap.filter(r => ["14", "16", "61", "63"].includes(r.prov))) assert.ok(Object.values(r.kategori).some(v => v.siap > 0), "provinsi " + r.prov + " berangka");
  const sn = await bikin("Pusdalops Nasional", ["pusdalops"]); assert.ok(!(await api("GET", "/api/inventaris", undefined, sn.h)).j.gudang.some(g => g.dummy), "staf nyata tidak melihat dummy");
  assert.equal((await api("GET", "/api/inventaris/gudang/" + dum[0].id, undefined, sn.h)).s, 404); assert.ok((await api("GET", "/api/inventaris/gudang/" + dum[0].id, undefined, ADMIN)).j.jejak.length >= 1);
  assert.ok(!(await GET(A, "/api/instansi/inventaris/wilayah")).j.gudang.some(g => g.nama.startsWith("[DUMMY]")), "akun nyata tidak melihat dummy");
  const tD = (await DB.prepare("SELECT id FROM tugas_api WHERE dummy = 1 AND status = 'buka' AND konfirmasi_pada IS NOT NULL AND rekomendasi IS NOT NULL ORDER BY dibuat LIMIT 1").first()).id;
  const rin = await api("GET", "/api/instansi/admin/tugas/" + tD, undefined, ADMIN); assert.equal(rin.s, 200); const gt = rin.j.gudang_terdekat;
  assert.ok(gt.gudang.length >= 3 && gt.gudang.every(g => g.nama.startsWith("[DUMMY]")), "tugas dummy hanya melihat gudang dummy"); assert.ok(gt.pompa.length >= 2 && gt.pompa.every(p => p.kelas && p.total_siap > 0), JSON.stringify(gt.pompa));
  const pn = (await api("GET", "/api/pantau", undefined, ADMIN)).j.butir.filter(b => b.jenis === "inventaris_lama" && b.dummy); assert.ok(pn.length >= 1, "butir Meja Pantau dari gudang dummy basi");
  assert.equal((await api("POST", "/api/inventaris/dummy", {aksi: "isi"}, ADMIN)).s, 409, "gerbang sudah ada menghitung baris hidup");
  /* 🧹 di halaman Instansi menghapus akun dummy: gudang ikut (CASCADE), lalu isi ulang bisa */
  const lewat = await api("POST", "/api/instansi/admin/dummy", {aksi: "hapus"}, ADMIN); assert.equal(lewat.s, 200, lewat.t); assert.equal(await n("gudang", "dummy = 1"), 0, "gudang ikut terhapus bersama akun dummy"); assert.equal(await n("alat", "dummy = 1"), 0);
  const ulang = await api("POST", "/api/inventaris/dummy", {aksi: "isi"}, ADMIN); assert.equal(ulang.s, 201, ulang.t);
  /* isi dummy instansi sesudah dummy inventaris ada tidak terkunci oleh akun dummyinv */
  const del = await api("POST", "/api/inventaris/dummy", {aksi: "hapus"}, ADMIN); assert.equal(del.s, 200, del.t); assert.ok(del.j.gudang >= 9 && del.j.alat >= 30);
  for (const [t, w] of [["gudang", "dummy = 1"], ["alat", "dummy = 1"], ["alat_jejak", "dummy = 1"], ["instansi_akun", "dummy = 1"], ["tugas_api", "dummy = 1"]]) assert.equal(await n(t, w), 0, t);
  assert.deepEqual(await nyata(), sebelum, "data nyata utuh sesudah hapus");
  assert.equal((await api("POST", "/api/inventaris/dummy", {aksi: "isi"}, ADMIN)).s, 201); const li = await api("POST", "/api/instansi/admin/dummy", {aksi: "isi"}, ADMIN); assert.equal(li.s, 409, "dummy instansi sudah ada karena rantai"); await api("POST", "/api/inventaris/dummy", {aksi: "hapus"}, ADMIN);
});

/* ================================================================ P3K dan medis (migrasi 0034) */
const wibTgl = t => new Date(t + 7 * JAM).toISOString().slice(0, 10), tglDari = d => wibTgl(Date.now() + d * HARI);
const p3kBadan = (g, o = {}) => ({gudang_id: g, kategori: "masker_n95", nama: "Masker N95 uji", satuan: "buah", jumlah: 50, ambang: 20, kedaluwarsa: tglDari(200), ...o});
const jejakP = (id) => DB.prepare("SELECT aksi, dari, ke, tugas_id, oleh FROM p3k_jejak WHERE p3k_id = ? ORDER BY id").bind(id).all().then(r => r.results);
let gP, pP;   // gudang uji P3K milik A, satu barang P3K
uji("migrasi 0034 idempoten; CHECK dan trigger P3K menahan kategori, satuan, jumlah negatif, tanggal rusak; jejak hanya menambah; daftar tetap JS == CHECK == klien", async () => {
  const sql = teks("migrations/0034_korban_p3k.sql");
  for (let i = 0; i < 2; i++) await DB.batch(pecah(sql).map(x => DB.prepare(x)));
  const g = id16(); await sisip("gudang", {id: g, akun_id: A.id, nama: "Gudang P3K uji", jenis: "gudang", prov: "62", lat: -2.2, lon: 113.9, dibuat: 1, diubah: 1}); gP = g;
  const p = o => sisip("p3k", {id: id16(), gudang_id: g, kategori: "kotak_p3k", jumlah: 1, dibuat: 1, diubah: 1, ...o});
  for (const [nama, o] of [["kategori liar", {kategori: "morfin"}], ["satuan liar", {satuan: "ton"}], ["jumlah negatif", {jumlah: -1}], ["kedaluwarsa bukan tanggal", {kedaluwarsa: "20261001"}], ["kedaluwarsa huruf", {kedaluwarsa: "2026-1x-01"}],
    ["ambang nol", {ambang: 0}], ["id pendek", {id: "abc"}]]) await assert.rejects(() => p(o), /CHECK/, nama);
  await p({jumlah: 0, kedaluwarsa: "2026-12-31", ambang: 5}); await assert.rejects(() => p({gudang_id: id16()}), /FOREIGN/, "gudang harus ada");
  const pj = id16(); await sisip("p3k_jejak", {waktu: 1, oleh: "uji", p3k_id: pj, gudang_id: g, aksi: "pakai", tugas_id: id16()});
  await assert.rejects(() => DB.prepare("UPDATE p3k_jejak SET aksi = 'hapus'").run(), /hanya bisa ditambah/); await assert.rejects(() => DB.prepare("DELETE FROM p3k_jejak WHERE p3k_id = ?").bind(pj).run(), /hanya bisa ditambah/);
  await assert.rejects(() => sisip("p3k_jejak", {waktu: 1, oleh: "uji", p3k_id: pj, gudang_id: g, aksi: "teleport"}), /CHECK/);
  await DB.prepare("DELETE FROM p3k WHERE gudang_id = ?").bind(g).run();
  const ambil = pola => [...sql.match(pola)[1].matchAll(/'(\w+)'/g)].map(m => m[1]);
  assert.deepEqual(Object.keys(KATEGORI_P3K), ambil(/kategori IN \(('kotak_p3k'[^)]*)\)/)); assert.deepEqual(SATUAN_P3K, ambil(/satuan IN \(([^)]*)\)/)); assert.equal(Object.keys(KATEGORI_P3K).length, 10);
  const klien = teks("public/instansi_alat.js"); for (const k of Object.keys(KATEGORI_P3K)) assert.ok(klien.includes(k + ":"), "klien tak mengenal P3K " + k);
  for (const k of SATUAN_P3K) assert.ok(klien.includes(`"${k}"`), "klien tak mengenal satuan " + k);
  assert.ok(!teks("migrations/0034_korban_p3k.sql").includes(" · ") && !klien.includes(" · "), "tanpa pemisah titik tengah");
  assert.ok(cekP3k({kategori: "tandu", jumlah: 0}).v && cekP3k({kategori: "tandu", jumlah: 1.5}).g && cekP3k({kategori: "tandu", jumlah: 1, kedaluwarsa: "2026-02-30"}).g && cekP3k({kategori: "tandu", jumlah: 1, kedaluwarsa: ""}).v.kedaluwarsa === null);
});
uji("P3K: pemilik mengelola; akun lain, anonim, tanpa x-pb ditolak; validasi; pakai mengurangi stok dengan jejak 'dipakai di tugas X'; stok tak cukup 409; jejak tetap ada sesudah hapus", async () => {
  assert.equal((await api("POST", "/api/instansi/p3k", p3kBadan(gP), PB)).s, 401, "anonim"); assert.equal((await api("POST", "/api/instansi/p3k", p3kBadan(gP))).s, 403, "tanpa x-pb"); assert.equal((await api("POST", "/api/instansi/p3k", p3kBadan(gP), {cookie: A.h.cookie})).s, 403, "tanpa x-pb");
  assert.equal((await POST(B, "/api/instansi/p3k", p3kBadan(gP))).s, 404, "gudang akun lain = tidak ada");
  for (const [bad, pola] of [[{kategori: "morfin"}, /kategori P3K/], [{satuan: "ton"}, /satuan/], [{jumlah: -1}, /jumlah/], [{jumlah: 1.5}, /jumlah/], [{ambang: 0}, /ambang/], [{kedaluwarsa: "2026-02-30"}, /kedaluwarsa/], [{kedaluwarsa: 5}, /kedaluwarsa/], [{nama: "x".repeat(81)}, /nama/]]) {
    const r = await POST(A, "/api/instansi/p3k", p3kBadan(gP, bad)); assert.equal(r.s, 400, JSON.stringify(bad)); assert.match(r.j.galat, pola);
  }
  const t = await POST(A, "/api/instansi/p3k", p3kBadan(gP)); assert.equal(t.s, 201, t.t); pP = t.j.id;
  const gl = (await GET(A, "/api/instansi/gudang")).j; assert.equal(gl.p3k_aktif, true); assert.ok(gl.kamus.p3k.some(k => k.k === "aed") && gl.kamus.satuan_p3k.includes("liter"));
  const baris = gl.gudang.find(g => g.id === gP).p3k.find(x => x.id === pP); assert.equal(baris.jumlah, 50); assert.equal(baris.kdl, null); assert.equal(baris.rendah, false);
  assert.deepEqual((await GET(B, "/api/instansi/gudang")).j.gudang.flatMap(g => g.p3k), [], "akun lain tidak melihat P3K milik A");
  for (const aksi of [{aksi: "ubah", jumlah: 1}, {aksi: "pakai", jumlah: 1}, {aksi: "hapus"}]) assert.equal((await POST(B, "/api/instansi/p3k/" + pP, aksi)).s, 404, aksi.aksi);
  const g0 = (await DB.prepare("SELECT diubah FROM gudang WHERE id = ?").bind(gP).first()).diubah;
  const tid = await tugas(A.id);
  const pk = await POST(A, "/api/instansi/p3k/" + pP, {aksi: "pakai", jumlah: 8, tugas_id: tid}); assert.equal(pk.s, 200, pk.t); assert.equal(pk.j.jumlah, 42);
  assert.equal((await POST(A, "/api/instansi/p3k/" + pP, {aksi: "pakai", jumlah: 0})).s, 400); assert.equal((await POST(A, "/api/instansi/p3k/" + pP, {aksi: "pakai", jumlah: 1.5})).s, 400);
  assert.equal((await POST(A, "/api/instansi/p3k/" + pP, {aksi: "pakai", jumlah: 1, tugas_id: id16()})).s, 404, "tugas yang tak ada = 404");
  const tLuar = await tugas(A.id, {prov: "11", kab: "Aceh Besar"}); assert.equal((await POST(A, "/api/instansi/p3k/" + pP, {aksi: "pakai", jumlah: 1, tugas_id: tLuar})).s, 404, "tugas di luar lingkup akun");
  const lebih = await POST(A, "/api/instansi/p3k/" + pP, {aksi: "pakai", jumlah: 43}); assert.equal(lebih.s, 409); assert.match(lebih.j.galat, /tidak cukup/);
  assert.equal((await DB.prepare("SELECT jumlah FROM p3k WHERE id = ?").bind(pP).first()).jumlah, 42, "stok tidak minus");
  const pakai2 = await POST(A, "/api/instansi/p3k/" + pP, {aksi: "pakai", jumlah: 2}); assert.equal(pakai2.j.jumlah, 40);
  const ub = await POST(A, "/api/instansi/p3k/" + pP, {aksi: "ubah", jumlah: 100, ambang: 30, kedaluwarsa: tglDari(10)}); assert.equal(ub.s, 200, ub.t); assert.equal(ub.j.p3k.kdl, "dekat");
  assert.equal((await POST(A, "/api/instansi/p3k/" + pP, {aksi: "ubah", jumlah: -3})).s, 400); assert.equal((await POST(A, "/api/instansi/p3k/" + pP, {aksi: "aneh"})).s, 400);
  const j = await jejakP(pP); assert.deepEqual(j.map(x => x.aksi), ["tambah", "pakai", "pakai", "jumlah", "ubah"]);
  assert.deepEqual([j[1].dari, j[1].ke, j[1].tugas_id], ["50", "42", tid], "jejak: dipakai di tugas X"); assert.ok(j[4].dari.includes("ambang: 20") && j[4].dari.includes("kedaluwarsa: 20") && j[4].ke.startsWith("ambang: 30; kedaluwarsa: ") && !j[4].dari.includes("nama"), "jejak ubah memuat semua bidang yang berubah: " + j[4].dari + " -> " + j[4].ke); assert.ok(j.every(x => (x.dari ?? "").length <= 80 && (x.ke ?? "").length <= 80)); assert.equal(j[2].tugas_id, null); assert.ok(j.every(x => x.oleh === A.id));
  assert.ok((await DB.prepare("SELECT diubah FROM gudang WHERE id = ?").bind(gP).first()).diubah > g0, "memakai atau mengubah P3K memperbarui gudang");
  const lain = await POST(A, "/api/instansi/p3k", p3kBadan(gP, {kategori: "tandu", satuan: "unit", jumlah: 3, ambang: null, kedaluwarsa: null, nama: null})); assert.equal(lain.s, 201);
  assert.equal((await POST(A, "/api/instansi/p3k/" + lain.j.id, {aksi: "hapus"})).s, 200); assert.equal(await n("p3k", `id = '${lain.j.id}'`), 0);
  assert.deepEqual((await jejakP(lain.j.id)).map(x => x.aksi), ["tambah", "hapus"], "jejak tetap ada sesudah barangnya dihapus");
  assert.equal((await POST(A, "/api/instansi/gudang/" + gP, {aksi: "hapus"})).s, 409, "gudang yang masih berisi barang P3K tidak bisa dihapus");
});
uji("P3K Meja Pantau: kedaluwarsa <= 30 hari (stok > 0) dan stok di bawah ambang jadi butir untuk pusdalops dan koordalops; analis tidak; hilang sesudah diperbaiki", async () => {
  const pus = await bikin("Pusdalops P3K", ["pusdalops"], ["62"]), pusAceh = await bikin("Pusdalops Aceh P3K", ["pusdalops"], ["11"]), ana = await bikin("Analis P3K", ["analis_konsesi"]), koor = await bikin("Koord P3K", ["koordalops"]);
  const tambah = async o => (await POST(A, "/api/instansi/p3k", p3kBadan(gP, o))).j.id;
  const dekat = await tambah({kategori: "salep_luka_bakar", nama: "Salep dekat", jumlah: 9, ambang: null, kedaluwarsa: tglDari(12)}), lewat = await tambah({kategori: "aed", nama: null, satuan: "unit", jumlah: 1, ambang: null, kedaluwarsa: tglDari(-3)});
  const jauh = await tambah({kategori: "regulator", satuan: "unit", jumlah: 4, ambang: null, kedaluwarsa: tglDari(31)}), habisKdl = await tambah({kategori: "tandu", satuan: "unit", jumlah: 0, ambang: null, kedaluwarsa: tglDari(2)});
  const rendah = await tambah({kategori: "infus_oralit", satuan: "liter", jumlah: 2, ambang: 5, kedaluwarsa: null, nama: "Oralit"});
  const butir = async (h = pus.h) => (await api("GET", "/api/pantau", undefined, h)).j.butir.filter(b => b.jenis.startsWith("p3k_"));
  const b1 = await butir(); const kdl = b1.filter(b => b.jenis === "p3k_kedaluwarsa"), stok = b1.filter(b => b.jenis === "p3k_stok");
  assert.ok(kdl.some(b => b.id.startsWith("p3k-kdl:" + dekat)) && kdl.some(b => b.id.startsWith("p3k-kdl:" + lewat)), "dekat dan lewat tampil");
  assert.ok(!kdl.some(b => b.id.includes(jauh) || b.id.includes(habisKdl)), "31 hari dan stok nol tidak tampil sebagai kedaluwarsa");
  assert.equal(kdl.find(b => b.id.includes(lewat)).prioritas, 2); assert.equal(kdl.find(b => b.id.includes(dekat)).prioritas, 3); assert.match(kdl.find(b => b.id.includes(lewat)).judul, /sudah kedaluwarsa/); assert.match(kdl.find(b => b.id.includes(dekat)).judul, /12 hari lagi/);
  assert.ok(stok.some(b => b.id.startsWith("p3k-stok:" + rendah) && /tinggal 2 liter, di bawah ambang 5/.test(b.judul)) && b1.every(b => b.prov === "62" && b.tautan === "/admin/inventaris"));
  assert.equal(stok.filter(b => b.id.includes(pP)).length, 0, "stok P3K uji (100 >= ambang 30) bukan butir");
  assert.deepEqual(await butir(pusAceh.h), [], "wilayah lain tidak melihat"); assert.deepEqual(await butir(ana.h), [], "analis konsesi tidak"); assert.ok((await butir(koor.h)).length >= 3, "koordalops melihat semua jenis");
  assert.ok((await butir(ADMIN)).length >= b1.length);
  assert.equal((await POST(A, "/api/instansi/p3k/" + rendah, {aksi: "ubah", jumlah: 9})).s, 200); assert.equal((await POST(A, "/api/instansi/p3k/" + dekat, {aksi: "ubah", kedaluwarsa: tglDari(90)})).s, 200);
  const b2 = await butir(); assert.ok(!b2.some(b => b.id.includes(rendah) || b.id.includes(dekat)), "butir hilang sendiri sesudah stok diisi dan tanggal diganti"); assert.ok(b2.some(b => b.id.includes(lewat)));
  const ringkas = await butirP3k({DB}, Date.now(), false); assert.ok(ringkas.some(b => b.id.includes(lewat)) && ringkas.every(b => b.dummy === 0), "pengait langsung, tanpa dummy");
  assert.equal((await POST(A, "/api/instansi/p3k/" + lewat, {aksi: "hapus"})).s, 200);
});
uji("rekap P3K per provinsi: admin semua, staf berwilayah hanya provinsinya; rincian gudang memuat P3K dan jejaknya; peran tak berhak ditolak", async () => {
  const gA11 = await POST(D, "/api/instansi/gudang", gudangBadan({nama: "Gudang Aceh P3K"})); assert.equal(gA11.s, 201, gA11.t);
  assert.equal((await POST(D, "/api/instansi/p3k", p3kBadan(gA11.j.id, {kategori: "tabung_oksigen", satuan: "unit", jumlah: 3, ambang: 5, kedaluwarsa: tglDari(5)}))).s, 201);
  const adm = (await api("GET", "/api/inventaris", undefined, ADMIN)).j; assert.equal(adm.p3k_aktif, true);
  const r11 = adm.rekap_p3k.find(r => r.prov === "11"), r62 = adm.rekap_p3k.find(r => r.prov === "62");
  assert.deepEqual(r11.kategori.tabung_oksigen, {jumlah: 3, jenis: 1, kedaluwarsa: 1, rendah: 1}); assert.ok(r62.kategori.masker_n95.jumlah === 100 && r62.kategori.masker_n95.kedaluwarsa === 0 || r62.kategori.masker_n95.kedaluwarsa === 1, JSON.stringify(r62.kategori.masker_n95));
  const pus = await bikin("Pusdalops rekap P3K", ["pusdalops"], ["11"]); const sp = (await api("GET", "/api/inventaris", undefined, pus.h)).j; assert.deepEqual(sp.rekap_p3k.map(r => r.prov), ["11"], "staf berwilayah hanya provinsinya");
  const rin = await api("GET", "/api/inventaris/gudang/" + gP, undefined, ADMIN); assert.equal(rin.s, 200); assert.ok(rin.j.p3k.some(x => x.id === pP) && rin.j.p3k_jejak.some(j => j.aksi === "pakai" && j.oleh === "pemilik"), "rincian memuat P3K dan jejaknya tanpa id akun");
  assert.equal((await api("GET", "/api/inventaris/gudang/" + gP, undefined, pus.h)).s, 404, "gudang luar wilayah staf");
  const ana = await bikin("Analis rekap P3K", ["analis_konsesi"]); assert.equal((await api("GET", "/api/inventaris", undefined, ana.h)).s, 403); assert.equal((await api("GET", "/api/inventaris", undefined, GERBANG)).s, 403);
  const lw = await GET(A, "/api/instansi/inventaris/wilayah"); assert.ok(lw.j.gudang.every(g => !("p3k" in g)) && !lw.t.includes("Masker N95 uji"), "ringkasan wilayah antar-pihak tidak memuat P3K");
});
uji("gudangTerdekat di rincian tugas admin untuk staf berwilayah: gudang di luar wilayah tetap tampil tetapi PIC disembunyikan dan koordinat dibulatkan 0,01 derajat; admin dan gudang dalam wilayah presisi", async () => {
  const E = await akun("akuninvkalbar", {jenis: "pemprov", tingkat: "prov", prov: null, kab: null, cakupan: '["61"]', wilayah: "Provinsi Kalimantan Barat"});
  const gLuar = await POST(E, "/api/instansi/gudang", gudangBadan({nama: "Gudang Kalbar Dekat", prov: "61", lat: -2.2517, lon: 113.9491, pic_nama: "Pak Luar", pic_wa: "081299900777"})); assert.equal(gLuar.s, 201, gLuar.t);
  assert.equal((await POST(E, "/api/instansi/alat", alatBadan(gLuar.j.id, {kelas_pompa: "debit_besar"}))).s, 201);
  const gDalam = await POST(A, "/api/instansi/gudang", gudangBadan({nama: "Gudang Kalteng Dekat", lat: -2.2417, lon: 113.9391, pic_nama: "Pak Dalam", pic_wa: "081299900888"})); assert.equal(gDalam.s, 201);
  assert.equal((await POST(A, "/api/instansi/alat", alatBadan(gDalam.j.id))).s, 201);
  const tid = await tugas(A.id), pus = await bikin("Pusdalops rincian", ["pusdalops"], ["62"]);
  const ambil = async h => (await api("GET", "/api/instansi/admin/tugas/" + tid, undefined, h)); const per = (r, nama) => r.j.gudang_terdekat.gudang.find(g => g.nama === nama);
  const st = await ambil(pus.h); assert.equal(st.s, 200, st.t); const luar = per(st, "Gudang Kalbar Dekat"), dalam = per(st, "Gudang Kalteng Dekat");
  assert.ok(luar && dalam, "gudang luar wilayah tetap tampil"); assert.ok(!("pic_wa" in luar) && !("pic_nama" in luar), "PIC gudang luar wilayah disembunyikan"); assert.ok(!st.t.includes("081299900777") && !st.t.includes("6281299900777") && !st.t.includes("Pak Luar"));
  assert.deepEqual([luar.lat, luar.lon], [-2.25, 113.95], "koordinat dibulatkan 0,01 derajat"); assert.equal(dalam.pic_wa, "6281299900888"); assert.deepEqual([dalam.lat, dalam.lon], [-2.2417, 113.9391], "dalam wilayah tetap presisi");
  assert.ok(luar.jarak_km > 0 && luar.alat.length >= 1, "jarak dan alat siap tetap dihitung dari koordinat asli");
  const ad = await ambil(ADMIN); const al = per(ad, "Gudang Kalbar Dekat"); assert.equal(al.pic_wa, "6281299900777"); assert.deepEqual([al.lat, al.lon], [-2.2517, 113.9491], "admin presisi dan berPIC");
  const nasional = await bikin("Pusdalops nasional rincian", ["pusdalops"]); const sn = per(await ambil(nasional.h), "Gudang Kalbar Dekat"); assert.equal(sn.pic_wa, "6281299900777", "staf nasional tak dibatasi wilayah");
  await DB.prepare("DELETE FROM alat WHERE gudang_id IN (?, ?)").bind(gLuar.j.id, gDalam.j.id).run(); await DB.prepare("DELETE FROM gudang WHERE id IN (?, ?)").bind(gLuar.j.id, gDalam.j.id).run();
});
uji("dummy P3K: ikut 🧪 inventaris (lewat, hampir kedaluwarsa, di bawah ambang, habis dengan jejak dipakai di tugas, aman); butir Meja Pantau dummy; 🧹 bersih tanpa menyentuh data nyata", async () => {
  const nyata = async () => ({p3k: await n("p3k", "dummy = 0"), jejak: await n("p3k_jejak", "dummy = 0")}), sebelum = await nyata();
  const isi = await api("POST", "/api/inventaris/dummy", {aksi: "isi"}, ADMIN); assert.equal(isi.s, 201, isi.t); assert.ok(isi.j.p3k >= 9, isi.t); assert.deepEqual(await nyata(), sebelum);
  const D1 = (await DB.prepare("SELECT * FROM p3k WHERE dummy = 1").all()).results, hariIni = tglDari(0), batas = tglDari(30);
  assert.ok(D1.some(x => x.kedaluwarsa < hariIni && x.jumlah > 0) && D1.some(x => x.kedaluwarsa >= hariIni && x.kedaluwarsa <= batas && x.jumlah > 0) && D1.some(x => x.ambang != null && x.jumlah < x.ambang) && D1.some(x => x.jumlah === 0), "tiap keadaan terisi");
  assert.ok(new Set(D1.map(x => x.satuan)).size >= 3 && new Set(D1.map(x => x.kategori)).size >= 8, "satuan dan kategori beragam");
  assert.ok(await n("p3k_jejak", "dummy = 1 AND aksi = 'pakai' AND tugas_id IS NOT NULL") >= 1, "pakai di tugas dummy"); assert.ok(await n("p3k_jejak", "dummy = 1 AND aksi = 'tambah'") >= 9);
  const bd = (await api("GET", "/api/pantau", undefined, ADMIN)).j.butir.filter(b => b.dummy && b.jenis.startsWith("p3k_")); assert.ok(bd.some(b => b.jenis === "p3k_kedaluwarsa") && bd.some(b => b.jenis === "p3k_stok"), "butir Meja Pantau dari P3K dummy");
  const sn = await bikin("Pusdalops nasional P3K", ["pusdalops"]); assert.ok(!(await api("GET", "/api/pantau", undefined, sn.h)).j.butir.some(b => b.dummy), "staf nyata tidak melihat dummy");
  assert.ok(!(await api("GET", "/api/inventaris", undefined, sn.h)).t.includes("[DUMMY]"));
  const hp = await api("POST", "/api/inventaris/dummy", {aksi: "hapus"}, ADMIN); assert.equal(hp.s, 200, hp.t); assert.ok(hp.j.p3k >= 9);
  for (const t of ["p3k", "p3k_jejak"]) assert.equal(await n(t, "dummy = 1"), 0, t); assert.deepEqual(await nyata(), sebelum, "data P3K nyata utuh");
});

/* ================================================================ tanpa migrasi 0031 */
uji("503 sopan bila 0031 belum diterapkan; rincian tugas, Meja Pantau, dan kabar tindakan biasa tetap jalan", async () => {
  const V = await siapkan("uji-inventaris-503", {r2: true});
  for (const t of ["alat_jejak", "alat", "gudang"]) await V.DB.prepare(`DROP TABLE ${t}`).run();
  const a = await akun("akuninv503", KAP, V), tid = await tugas(a.id, {}, V);
  for (const [m, j, b, h] of [["GET", "/api/instansi/gudang", undefined, a.h], ["POST", "/api/instansi/gudang", gudangBadan(), a.hp], ["POST", "/api/instansi/gudang/" + id16(), {aksi: "konfirmasi"}, a.hp], ["POST", "/api/instansi/alat", alatBadan(id16()), a.hp],
    ["POST", "/api/instansi/alat/" + id16(), {aksi: "hapus"}, a.hp], ["GET", "/api/instansi/inventaris/wilayah", undefined, a.h], ["POST", "/api/instansi/alat/kerahkan", {tugas_id: tid, alat: [id16()]}, a.hp], ["GET", "/api/inventaris", undefined, ADMIN],
    ["GET", "/api/inventaris/gudang/" + id16(), undefined, ADMIN], ["POST", "/api/inventaris/dummy", {aksi: "isi"}, ADMIN], ["GET", "/api/instansi/foto-alat/" + id16(), undefined, a.h]]) {
    const r = await V.api(m, j, b, h); assert.equal(r.s, 503, `${m} ${j}: ${r.t.slice(0, 120)}`); assert.match(r.j.galat, /0031/);
  }
  const rin = await GET(a, "/api/instansi/tugas/" + tid, V); assert.equal(rin.s, 200); assert.equal(rin.j.gudang_terdekat, null, "tanpa tabel: null, bukan galat");
  assert.equal((await V.api("GET", "/api/instansi/admin/tugas/" + tid, undefined, ADMIN)).s, 200); assert.equal((await V.api("GET", "/admin/inventaris", undefined, ADMIN)).s, 200, "kerangka halaman tidak butuh tabel");
  const pa = await V.api("GET", "/api/pantau", undefined, ADMIN); assert.equal(pa.s, 200); assert.ok("inventaris_lama" in pa.j.jenis && !pa.j.butir.some(b => b.jenis === "inventaris_lama"));
  const k1 = await POST(a, "/api/instansi/kabar/" + tid, KABAR(), V); assert.equal(k1.s, 201, k1.t);
  assert.equal((await POST(a, "/api/instansi/kabar/" + tid, KABAR({alat_inventaris: [id16()]}), V)).s, 503, "memilih alat inventaris tanpa tabel: 503 yang jelas, isian tidak setengah tersimpan");
  assert.equal(await V.n("tugas_isian", `tugas_id = '${tid}' AND langkah = 'tindakan'`), 1, "hanya kabar biasa yang tersimpan");
  const pd = await POST(a, "/api/instansi/kabar/" + tid, KABAR({status_api: "padam", media: [await media(a.id, tid, V.DB)]}), V); assert.equal(pd.s, 201, "padam tanpa tabel inventaris tidak melempar"); assert.deepEqual(await inventarisProvinsi({DB: V.DB}), {provinsi: []});
});

/* ================================================================ tanpa migrasi 0034 */
uji("503 sopan bila 0034 belum diterapkan: rute P3K 503; gudang, alat, dummy, dan Meja Pantau biasa tetap jalan", async () => {
  const V = await siapkan("uji-inventaris-0034", {r2: true});
  for (const t of ["p3k_jejak", "p3k", "korban_jejak", "korban"]) await V.DB.prepare(`DROP TABLE ${t}`).run();
  const a = await akun("akuninv0034", KAP, V), g = (await POST(a, "/api/instansi/gudang", gudangBadan(), V)).j.id;
  assert.equal((await POST(a, "/api/instansi/alat", alatBadan(g), V)).s, 201, "alat biasa tetap jalan");
  for (const [m, j, b, h] of [["POST", "/api/instansi/p3k", p3kBadan(g), a.hp], ["POST", "/api/instansi/p3k/" + id16(), {aksi: "hapus"}, a.hp]]) { const r = await V.api(m, j, b, h); assert.equal(r.s, 503, `${m} ${j}: ${r.t.slice(0, 100)}`); assert.match(r.j.galat, /0034/); }
  const gl = await GET(a, "/api/instansi/gudang", V); assert.equal(gl.s, 200); assert.equal(gl.j.p3k_aktif, false); assert.deepEqual(gl.j.gudang[0].p3k, []);
  const ad = await V.api("GET", "/api/inventaris", undefined, ADMIN); assert.equal(ad.s, 200); assert.equal(ad.j.p3k_aktif, false); assert.deepEqual(ad.j.rekap_p3k, []); assert.equal((await V.api("GET", "/api/inventaris/gudang/" + g, undefined, ADMIN)).s, 200);
  const pa = await V.api("GET", "/api/pantau", undefined, ADMIN); assert.equal(pa.s, 200); assert.ok(!pa.j.butir.some(b => b.jenis.startsWith("p3k_") || b.jenis === "korban_baru")); assert.deepEqual(await butirP3k({DB: V.DB}, Date.now(), true), []);
  assert.equal((await V.api("POST", "/api/inventaris/dummy", {aksi: "isi"}, ADMIN)).s, 201, "dummy inventaris tetap terisi tanpa bagian P3K"); assert.equal((await V.api("POST", "/api/inventaris/dummy", {aksi: "hapus"}, ADMIN)).s, 200);
});
