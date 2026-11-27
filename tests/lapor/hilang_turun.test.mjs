/* Orang hilang publik OH-08 (cabut, perpanjang, turun otomatis, cron; src/orang_hilang.js, src/lapor_selamat.js cariStatus, src/lapor_ai.js bersihkanLapor): worker.js utuh di Miniflare + D1 + R2 sungguhan, tanpa mock.
   RENCANA-UJI bagian 2: 2.6, 2.7, 2.8, 2.14, 2.14b, 2.14c, 2.20, 2.22 (tanpa jalur oh_info, itu OH-11). Jalankan: node --test tests/lapor/hilang_turun.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256} from "../warga/_bnpb.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor
import * as H from "../../src/hak.js";
import {bersihkanLapor} from "../../src/lapor_ai.js";
import {bersihOrangHilang, kunciFotoPublik} from "../../src/orang_hilang.js";

const uji = berantai();
const HARI = 864e5, kini = Date.now(), MESIN = {authorization: "Bearer mesin-rahasia"};
const U = await siapkan("uji-oh-turun", {r2: true, ikat: {OH_PUBLIK: "1", WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const R2 = await U.mf.getR2Bucket("MEDIA"), env = {DB, MEDIA: R2};
const WA = "6281200000081", WA2 = "6281200000082", KAB = "32.01", STAF = H.pelakuLpStaf, PEL = H.pelakuLpPelapor, CRON = H.pelakuLpCron;
const SESI = {}, sesi = (wa, i) => SESI[i] ??= (async () => {   // sesi /masuk: nomor terbukti lewat kode (satu per nomor)
  const mk = "mk" + String(i).padStart(14, "0"), tok = (String(i).padStart(2, "0") + "7e").repeat(32).slice(0, 64);
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, ?, 'Warga Uji', 'aktif', ?)").bind(mk, wa, kini),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(sha256(tok), mk, kini, kini, kini + 36e5 * 24 * 90)]);
  return {cookie: `sesi_masuk=${tok}`, origin: "http://bnpb.lokal", "x-pb": "1"};
})();
const bpbd = async (nu, kab) => {
  const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, 'pemkab', 'kab', 'Wilayah uji', ?, ?, '32', ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "ohturun" + nu, `32|${kab}`, JSON.stringify(["32"]), kab, "g".repeat(32), "0".repeat(64), `oh${nu}@b.id`, "62812002" + String(nu).padStart(4, "0"), kini).run();
  return {cookie: (await profilAktif(DB, id)).cookie, origin: "http://bnpb.lokal", "x-pb": "1"};
};
let seq = 0;
/* satu laporan orang dicari beserta profil publiknya; foto: id foto publik yang berkasnya ada di R2 */
async function buat({nomor = WA, status = "tayang", cari = "buka", foto = false, versi = 1, tayang = kini, tutup = kini} = {}) {
  const i = ++seq, id = String(i).padStart(16, "0"), token = "b".repeat(32 - String(i).length) + i;
  await H.crTambah(env, PEL, {id, nomor_pencari: nomor, nama_dicari: "Budi Santoso", ciri: "tahi lalat", lokasi_terakhir: "Desa X", waktu_terakhir: "Hari ini", nomor_dicari: null, hubungan: "Anak", kab: KAB}, kini);
  await H.ohTambah(env, PEL, {cari_id: id, token, kelas: "dewasa", nama: "Budi Santoso", panggilan: "Budi", umur: 30, kelamin: "Laki-laki", pakaian: "kaos merah", kec: "Cibinong", kab: KAB, kab_nama: "Kab. Bogor", ciri: "tahi lalat",
    waktu_terakhir: kini, kejadian_id: "KJ-2026-00000001", kejadian_jenis: "banjir", kejadian_kab: "3201", kejadian_mulai: "2026-11-20", setuju_versi: versi, setuju_waktu: kini}, kini);
  if (status !== "draf") await H.ohPindah(env, STAF, {cari_id: id, dari: "draf", ke: "menunggu", oleh: "uji"}, kini);
  if (status === "tayang") await H.ohPindah(env, STAF, {cari_id: id, dari: "menunggu", ke: "tayang", oleh: "uji"}, tayang);
  if (foto) { const f = "f".repeat(15) + i; await R2.put(kunciFotoPublik(f), "x"); await DB.prepare("UPDATE oh_publik SET foto_publik = ? WHERE cari_id = ?").bind(JSON.stringify([f]), id).run(); }
  if (cari !== "buka") await H.crStatus(env, STAF, id, cari, null, "uji", tutup);
  return {id, token, foto: foto ? "f".repeat(15) + i : null};
}
const baca = id => DB.prepare("SELECT status, alasan_turun, foto_publik, dicabut_waktu, nama FROM oh_publik WHERE cari_id = ?").bind(id).first();
const riwayat = async id => (await H.ohRiwayat(env, STAF, id)).map(r => `${r.dari}>${r.ke}:${r.alasan}:${r.oleh}`);
const ada = async f => !!(await R2.head(kunciFotoPublik(f)));

uji("2.6 petugas menutup laporan: profil tayang turun dalam permintaan yang sama, foto publik terhapus; ke_sar dan buka tidak menurunkan (K115, Q25)", async () => {
  const meja = await bpbd(1, KAB), st = (id, status) => api("POST", `/api/lapor/meja/cari/${id}/status`, {status}, meja);
  const L = {selamat: await buat({foto: true}), meninggal: await buat(), tutup: await buat({status: "menunggu"}), sar: await buat({foto: true}), buka: await buat()};
  for (const [k, s] of [["selamat", "ditemukan_selamat"], ["meninggal", "ditemukan_meninggal"], ["tutup", "tutup"], ["sar", "ke_sar"]]) { const r = await st(L[k].id, s); assert.equal(r.s, 200, r.t); }
  assert.deepEqual([(await baca(L.selamat.id)).status, (await baca(L.selamat.id)).alasan_turun], ["turun", "ditemukan"]);
  assert.deepEqual([(await baca(L.meninggal.id)).status, (await baca(L.meninggal.id)).alasan_turun], ["turun", "ditemukan"], "jenazah tidak pernah tampil, hanya menurunkan (D21)");
  assert.deepEqual([(await baca(L.tutup.id)).status, (await baca(L.tutup.id)).alasan_turun], ["turun", "tutup"], "profil menunggu ikut turun");
  assert.equal((await baca(L.sar.id)).status, "tayang", "ke_sar tidak menurunkan"); assert.equal((await baca(L.buka.id)).status, "tayang");
  assert.equal((await baca(L.selamat.id)).foto_publik, "[]"); assert.equal(await ada(L.selamat.foto), false, "berkas foto publik terhapus"); assert.equal(await ada(L.sar.foto), true);
  assert.equal(await H.ohByToken(env, H.pelakuLpPublik, L.selamat.token, kini - 30 * HARI), null, "hilang dari publik pada permintaan berikutnya");
  assert.ok((await riwayat(L.selamat.id)).some(x => x.startsWith("tayang>turun:ditemukan:")), "riwayat tercatat");
  assert.equal((await api("POST", `/api/lapor/meja/cari/${L.buka.id}/status`, {status: "buka"}, meja)).s, 200); assert.equal((await baca(L.buka.id)).status, "tayang", "status buka tidak menurunkan");
  assert.equal((await DB.prepare("SELECT status FROM lapor_cari WHERE id = ?").bind(L.selamat.id).first()).status, "ditemukan_selamat", "laporan privat tetap untuk petugas");
});

uji("2.20 jalur cron K115: laporan ditutup lewat jalur lain tanpa cariStatus; sapuan menurunkan tayang dan menunggu, bukan ke_sar atau buka", async () => {
  const a = await buat({foto: true}), b = await buat({status: "menunggu"}), c = await buat(), d = await buat();
  await DB.batch([DB.prepare("UPDATE lapor_cari SET status = 'ditemukan_selamat', ditutup = ?2 WHERE id = ?1").bind(a.id, kini), DB.prepare("UPDATE lapor_cari SET status = 'tutup', ditutup = ?2 WHERE id = ?1").bind(b.id, kini),
    DB.prepare("UPDATE lapor_cari SET status = 'ke_sar', ditutup = ?2 WHERE id = ?1").bind(c.id, kini)]);
  const h = await bersihOrangHilang(env, kini + 60e3); assert.equal(h.turun, 2);
  assert.deepEqual([(await baca(a.id)).alasan_turun, (await baca(b.id)).alasan_turun], ["ditemukan", "tutup"]); assert.equal((await baca(c.id)).status, "tayang"); assert.equal((await baca(d.id)).status, "tayang");
  assert.equal(await ada(a.foto), false); assert.equal((await riwayat(a.id)).at(-1), "tayang>turun:ditemukan:sistem");
  assert.equal((await bersihOrangHilang(env, kini + 120e3)).turun, 0, "diulang tidak mengubah apa pun");
  const lewat = await bersihOrangHilang({DB: {prepare: () => { throw new Error("no such table: oh_publik"); }, batch: () => { throw new Error("no such table: oh_publik"); }}}, kini); assert.equal(lewat.turun, 0, "migrasi 0188 belum diterapkan: dilewati");
});

uji("2.8 masa tayang habis: cron menurunkan (kedaluwarsa); perpanjang mengembalikan ke menunggu; persetujuan versi lama tidak bisa diperpanjang", async () => {
  const H1 = await sesi(WA, 1), a = await buat({tayang: kini - 40 * HARI, foto: true}), b = await buat({tayang: kini - 1 * HARI}), c = await buat({tayang: kini - 40 * HARI, versi: 2});
  const h = await bersihOrangHilang(env, kini); assert.equal(h.turun, 2);
  assert.deepEqual([(await baca(a.id)).alasan_turun, (await baca(b.id)).status, (await baca(c.id)).alasan_turun], ["kedaluwarsa", "tayang", "kedaluwarsa"]); assert.equal(await ada(a.foto), false);
  const p = id => api("POST", "/api/lapor/hilang/saya/perpanjang", {id}, H1);
  const ok = await p(a.id); assert.equal(ok.s, 200, ok.t); assert.equal((await baca(a.id)).status, "menunggu"); assert.equal((await baca(a.id)).alasan_turun, null);
  assert.equal((await p(a.id)).s, 409, "sudah menunggu: tidak ada yang diperpanjang"); assert.equal((await p(b.id)).s, 409, "masih tayang");
  const lama = await p(c.id); assert.equal(lama.s, 409, "persetujuan versi lama"); assert.equal((await baca(c.id)).status, "turun");
  assert.equal((await riwayat(a.id)).at(-1), "turun>menunggu:perpanjang:pelapor");
  const tutup = await buat({tayang: kini - 40 * HARI}); await bersihOrangHilang(env, kini); await DB.prepare("UPDATE lapor_cari SET status = 'tutup', ditutup = ?2 WHERE id = ?1").bind(tutup.id, kini).run();
  assert.equal((await p(tutup.id)).s, 409, "laporan sudah ditutup tidak ditayangkan lagi");
});

uji("2.7 cabut persetujuan (K114): turun seketika, foto terhapus, laporan privat tetap terbaca petugas; hanya pemilik nomor", async () => {
  const H1 = await sesi(WA, 1), H2 = await sesi(WA2, 2), a = await buat({foto: true}), m = await buat({status: "menunggu"}), d = await buat({status: "draf"});
  const cabut = (id, h) => api("POST", "/api/lapor/hilang/saya/cabut", {id}, h);
  assert.equal((await cabut(a.id, H2)).s, 404, "milik nomor lain menjawab sama dengan tidak ada"); assert.equal((await baca(a.id)).status, "tayang");
  const r = await cabut(a.id, H1); assert.equal(r.s, 200, r.t); assert.equal(r.j.status, "turun");
  const x = await baca(a.id); assert.deepEqual([x.status, x.alasan_turun, x.foto_publik], ["turun", "dicabut", "[]"]); assert.ok(x.dicabut_waktu > 0); assert.equal(await ada(a.foto), false);
  assert.equal(await H.ohByToken(env, H.pelakuLpPublik, a.token, kini - 30 * HARI), null);
  assert.equal((await H.crDaftar(env, STAF)).some(c => c.id === a.id && c.nama_dicari === "Budi Santoso"), true, "laporan privat tetap");
  assert.equal((await cabut(m.id, H1)).s, 200, "menunggu juga bisa dicabut"); assert.equal((await baca(m.id)).alasan_turun, "dicabut");
  assert.equal((await cabut(a.id, H1)).s, 409, "sudah turun"); assert.equal((await cabut(d.id, H1)).s, 409, "draf belum tampil"); assert.equal((await cabut("zz", H1)).s, 400);
  assert.equal((await riwayat(a.id)).at(-1), "tayang>turun:dicabut:pelapor");
  assert.equal((await api("POST", "/api/lapor/hilang/saya/cabut", {id: d.id}, {...H1, "x-pb": ""})).s, 403, "tanpa header x-pb");
  const g = await api("GET", "/api/lapor/hilang/saya", undefined, H1); assert.equal(g.s, 200); const mine = g.j.profil.find(p => p.id === a.id);
  assert.deepEqual(Object.keys(mine).sort(), ["alasan", "berakhir", "bisa_cabut", "bisa_perpanjang", "dibuat", "id", "label", "status"], "tanpa nomor, ciri, foto, titik");
  assert.ok(!g.t.includes("Budi") && !g.t.includes(WA) && !g.t.includes("tahi"), "tanpa nama, nomor, ciri");
  assert.deepEqual((await api("GET", "/api/lapor/hilang/saya", undefined, H2)).j.profil, [], "nomor lain tidak melihat profil ini");
});

uji("2.22 auth saya/*: nomor ketikan 401; nomor di badan atau kueri tidak dipakai walau sesi hidup milik nomor lain; kunci mesin menerima nomor dari gateway", async () => {
  const a = await buat({nomor: WA}), H2 = await sesi(WA2, 2);
  for (const [m, j, b] of [["POST", "/api/lapor/hilang/saya/cabut", {id: a.id, wa: WA}], ["POST", "/api/lapor/hilang/saya/perpanjang", {id: a.id, wa: WA}], ["GET", `/api/lapor/hilang/saya?wa=${WA}`], ["GET", "/api/lapor/hilang/saya"]]) {
    const r = await api(m, j, b, {"x-pb": "1", origin: "http://bnpb.lokal"}); assert.equal(r.s, 401, `${m} ${j}`); assert.match(r.j.galat, /petugas/i);
  }
  assert.equal((await api("POST", "/api/lapor/hilang/saya/cabut", {id: a.id, wa: WA}, H2)).s, 404, "sesi WA2 dengan wa=WA di badan: tetap WA2"); assert.equal((await baca(a.id)).status, "tayang");
  assert.deepEqual((await api("GET", `/api/lapor/hilang/saya?wa=${WA}`, undefined, H2)).j.profil, [], "kueri wa diabaikan");
  assert.equal((await api("POST", "/api/lapor/hilang/saya/cabut", {id: a.id, wa: WA}, {authorization: "Bearer salah"})).s, 403, "kunci mesin salah");
  assert.equal((await api("POST", "/api/lapor/hilang/saya/cabut", {id: a.id}, MESIN)).s, 400, "gateway wajib membawa nomor sah");
  assert.equal((await api("POST", "/api/lapor/hilang/saya/cabut", {id: a.id, wa: WA2}, MESIN)).s, 404, "gateway: nomor lain tidak mencabut");
  const g = await api("GET", `/api/lapor/hilang/saya?wa=${WA}`, undefined, MESIN); assert.equal(g.s, 200); assert.ok(g.j.profil.some(p => p.id === a.id));
  const ok = await api("POST", "/api/lapor/hilang/saya/cabut", {id: a.id, wa: WA}, MESIN); assert.equal(ok.s, 200, ok.t); assert.equal((await baca(a.id)).alasan_turun, "dicabut");
});

uji("2.14 anonim 730 hari: oh_publik dan catatan riwayat dikosongkan bersama lapor_cari; laporan yang masih buka tidak tersentuh", async () => {
  const a = await buat({cari: "tutup", tutup: kini - 800 * HARI, status: "menunggu"}), b = await buat({cari: "tutup", tutup: kini - 100 * HARI, status: "menunggu"});
  await H.ohPindah(env, STAF, {cari_id: a.id, dari: "menunggu", ke: "turun", alasan_turun: "ditolak", catatan: "nama Budi Santoso 0812", oleh: "staf:1"}, kini - 790 * HARI);
  await bersihkanLapor(env, kini);
  const x = await DB.prepare("SELECT nama, inisial, panggilan, umur, kelamin, pakaian, ciri, kec, kab_nama, waktu_terakhir, foto_publik, bidang_pilihan, kab, kejadian_jenis FROM oh_publik WHERE cari_id = ?").bind(a.id).first();
  assert.deepEqual(x, {nama: null, inisial: null, panggilan: null, umur: null, kelamin: null, pakaian: null, ciri: null, kec: null, kab_nama: null, waktu_terakhir: null, foto_publik: "[]", bidang_pilihan: "{}", kab: KAB, kejadian_jenis: "banjir"});
  assert.equal(await n("oh_riwayat", `cari_id = '${a.id}' AND catatan IS NOT NULL`), 0, "catatan teranonim"); assert.ok(await n("oh_riwayat", `cari_id = '${a.id}'`) >= 2, "baris riwayat tetap");
  assert.equal((await baca(b.id)).nama, "Budi Santoso", "belum 730 hari");
  assert.equal((await DB.prepare("SELECT nama_dicari FROM lapor_cari WHERE id = ?").bind(a.id).first()).nama_dicari, "dihapus");
});

uji("2.14b oh_temu 730 hari sesudah ditutup_waktu: kolom pribadi kosong, berkas R2 dan baris foto terhapus; yang baru atau belum ditutup tetap", async () => {
  const ins = (id, tutup) => DB.prepare("INSERT INTO oh_temu (id, nomor_penemu, kab, lokasi_teks, lat, lon, waktu_temu, kondisi, ucapan, ciri, status, dibuat, ditutup_waktu) VALUES (?, '6281200000099', ?, 'Jl. Mawar', -6.6, 106.8, ?, 'sadar', 'nama saya Andi', 'tinggi', ?, ?, ?)")
    .bind(id, KAB, kini, tutup ? "ditutup" : "menunggu", kini, tutup);
  const t1 = "t".repeat(15) + "1", t2 = "t".repeat(15) + "2", t3 = "t".repeat(15) + "3", f1 = "e".repeat(15) + "1", f2 = "e".repeat(15) + "2";
  await DB.batch([ins(t1, kini - 800 * HARI), ins(t2, kini - 10 * HARI), ins(t3, null), DB.prepare("INSERT INTO oh_temu_foto (temu_id, foto_id) VALUES (?, ?), (?, ?)").bind(t1, f1, t2, f2),
    DB.prepare("INSERT INTO oh_riwayat (temu_id, dari, ke, alasan, catatan, oleh, waktu) VALUES (?, 'menunggu', 'ditinjau', 'tinjau', 'dari Andi', 'staf:1', ?)").bind(t1, kini)]);
  await R2.put(`lapor/foto/${f1}.jpg`, "x"); await R2.put(`lapor/foto/${f2}.jpg`, "x");
  await bersihOrangHilang(env, kini);
  assert.deepEqual(await DB.prepare("SELECT nomor_penemu, lokasi_teks, lat, lon, ucapan, ciri, kab, kondisi FROM oh_temu WHERE id = ?").bind(t1).first(), {nomor_penemu: null, lokasi_teks: null, lat: null, lon: null, ucapan: null, ciri: null, kab: KAB, kondisi: "sadar"});
  assert.equal(await R2.head(`lapor/foto/${f1}.jpg`), null); assert.equal(await n("oh_temu_foto", `temu_id = '${t1}'`), 0); assert.equal(await n("oh_riwayat", `temu_id = '${t1}' AND catatan IS NOT NULL`), 0);
  assert.equal((await DB.prepare("SELECT nomor_penemu FROM oh_temu WHERE id = ?").bind(t2).first()).nomor_penemu, "6281200000099"); assert.ok(await R2.head(`lapor/foto/${f2}.jpg`)); assert.equal(await n("oh_temu_foto", `temu_id = '${t2}'`), 1);
  assert.equal((await DB.prepare("SELECT lat FROM oh_temu WHERE id = ?").bind(t3).first()).lat, -6.6, "belum ditutup tidak pernah dianonimkan");
});

uji("2.14c retensi: oh_cari_foto lebih dari 90 hari dan oh_info selesai lebih dari 180 hari terhapus; yang baru, yang belum selesai tetap", async () => {
  const sha = "a".repeat(64), tok = "c".repeat(32);
  await DB.batch([...[kini - 91 * HARI, kini - 89 * HARI].map(w => DB.prepare("INSERT INTO oh_cari_foto (nomor_sha, waktu, kandidat, tingkat) VALUES (?, ?, 1, 'mirip')").bind(sha, w)),
    ...[["i1", "selesai", kini - 181 * HARI], ["i2", "selesai", kini - 179 * HARI], ["i3", "baru", null], ["i4", "diteruskan", null]].map(([i, st, sw]) => DB.prepare("INSERT INTO oh_info (id, jenis, sasaran_token, status, dibuat, selesai_waktu) VALUES (?, 'informasi', ?, ?, ?, ?)").bind(i.padEnd(16, "0"), tok, st, kini - 300 * HARI, sw))]);
  await bersihOrangHilang(env, kini);
  assert.equal(await n("oh_cari_foto"), 1); assert.deepEqual((await DB.prepare("SELECT id FROM oh_info ORDER BY id").all()).results.map(r => r.id.slice(0, 2)), ["i2", "i3", "i4"]);
});
