/* Modul Lapangan tahap C, kait ke modul lain (LP-030, 042, 043, 044, 045, 047): worker utuh di Miniflare + D1 + R2 sungguhan, tanpa mock.
   x-kode-regu Posko, /saya (pelatihan, keahlian, kit), kit di logbook, genangan ke prediksi_konfirmasi, pengingat absen/logbook, ringkasan logbook di arsip sitrep.
   Tabel migrasi 0101 (orang_keahlian, lp_logbook_kit) dan pelebaran CHECK pengingat dibuat sementara di sini BILA belum ada di migrations/. Tiap kelas penolakan punya kasusnya. */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai, sha256} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";
import {buatPengingat} from "../../src/pengingat.js";
import {arsipkanSitrep} from "../../src/sitrep.js";

const U = await siapkan("uji-lapangan-c", {r2: true}), uji = berantai(), DB = U.DB;
const PB = {"x-pb": "1"}, JAM = 3600e3, HARI = 24 * JAM, K = (kode, h = {}) => ({"x-kode": kode, ...h});
const api = (m, j, b, h = {}) => U.api(m, j, b, {...PB, ...h});
const TITIK = {lat: -2.55, lon: 112.9};

/* ---- DDL sementara bila migrasi 0101 belum ada ---- */
const ada = async (nama, pola) => { const r = await DB.prepare("SELECT sql FROM sqlite_master WHERE name = ?").bind(nama).first(); return !!r && (!pola || r.sql.includes(pola)); };
if (!await ada("orang_keahlian")) await DB.exec("CREATE TABLE orang_keahlian (orang_id TEXT NOT NULL REFERENCES orang (id) ON DELETE CASCADE, keahlian TEXT NOT NULL, bukti TEXT, dibuat INTEGER NOT NULL, PRIMARY KEY (orang_id, keahlian))");
if (!await ada("lp_logbook_kit")) await DB.exec("CREATE TABLE lp_logbook_kit (logbook_id TEXT NOT NULL REFERENCES lp_logbook (id) ON DELETE CASCADE, kit_id TEXT NOT NULL, jumlah INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (logbook_id, kit_id))");
if (!await ada("pengingat", "lapangan_absen")) {   // pola 0088: CHECK tak bisa di-ALTER
  const def = (await DB.prepare("SELECT sql FROM sqlite_master WHERE name = 'pengingat'").first()).sql.replace("'sensor_lapor')", "'sensor_lapor', 'lapangan_absen', 'lapangan_logbook')");
  await DB.exec("CREATE TABLE pengingat_cad AS SELECT * FROM pengingat; DROP TABLE pengingat; " + def.replace(/\n/g, " ") + "; INSERT INTO pengingat SELECT * FROM pengingat_cad; DROP TABLE pengingat_cad");
}

let nId = 0;
const id16 = () => (0xb000000000000000n + BigInt(++nId)).toString(16);
const kodeDari = c => c.repeat(26);
async function orang(nama, c, {prov = "62", kab = "Seruyan", relawan = null} = {}) {
  const id = id16();
  await DB.prepare("INSERT INTO orang (id, jenis, relawan_id, nama, prov, kab, status, kode_sha, wajah_status, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, 'aktif', ?, 'belum', 1, 1, 0)")
    .bind(id, relawan ? "relawan" : "pegawai", relawan, nama, prov, kab, sha256(kodeDari(c))).run();
  return {id, kode: kodeDari(c), nama};
}
const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi];
let nFoto = 0;
const jpeg = () => { const n = ++nFoto; return new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...new TextEncoder().encode("JFIF"), 0, 1, 1, 0, 0, 0, 0, 1, 0, 0]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(40).fill(1 + n % 200), n >> 8, n & 255, 0xff, 0xd9]); };
async function logbook(kode, data, foto = [], h = {}) {
  const f = new FormData(); f.append("data", JSON.stringify(data));
  for (const x of foto) f.append("foto", new File([x], "f.jpg", {type: "image/jpeg"}));
  const {body, headers} = await badanPanjang(f, {...PB, ...(kode ? {"x-kode": kode} : {}), ...h});
  const r = await U.mf.dispatchFetch("http://bnpb.lokal/api/petugas/logbook", {method: "POST", headers, body});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t};
}
const hari = () => new Date(Date.now() + 7 * JAM).toISOString().slice(0, 10);
const baris = (tabel, w = "1") => DB.prepare(`SELECT * FROM ${tabel} WHERE ${w}`).all().then(r => r.results);
let BUDI, CICI, JAUH, RELA, TUGAS, REGU, KIT_A, KIT_B, KIT_LAIN;

uji("setup: tugas aktif, anggota, relawan berpelatihan, kit SIPPA di dua provinsi", async () => {
  const kini = Date.now(), a0 = Date.parse(hari() + "T00:00:00Z") - 7 * JAM;
  BUDI = await orang("Budi Lapangan", "1"); CICI = await orang("Cici Lapangan", "2"); JAUH = await orang("Jauh Provinsi", "3", {prov: "33", kab: "Cilacap"});
  const rid = id16();
  await DB.prepare("INSERT INTO relawan (id, kode_sha, nama, prov, kab, jalur, hari_per_minggu, maks_hari, luar_provinsi, status, setuju_pdp, dibuat, diubah) VALUES (?, ?, 'Rela Wan', '62', 'Seruyan', 'umum', 3, 30, 0, 'diverifikasi', 1, 1, 1)").bind(rid, sha256(kodeDari("4"))).run();
  await DB.batch([DB.prepare("INSERT INTO relawan_pelatihan (id, relawan_id, nama, penyelenggara, tgl, dibuat, dummy) VALUES (?, ?, 'Pemadaman gambut', 'BNPB', '2026-03-01', 1, 0)").bind(id16(), rid),
    DB.prepare("INSERT INTO relawan_pelatihan (id, relawan_id, nama, penyelenggara, tgl, dibuat, dummy) VALUES (?, ?, 'P3K', 'PMI', '2026-08-15', 1, 0)").bind(id16(), rid)]);
  RELA = {kode: kodeDari("4"), rid};
  TUGAS = id16();
  await DB.batch([DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat_oleh, dibuat, dummy) VALUES (?, 'Patroli banjir Seruyan', 'banjir', ?, ?, 2000, ?, ?, 'uji', 1, 0)").bind(TUGAS, TITIK.lat, TITIK.lon, a0 - JAM, a0 + 3 * HARI),
    ...[BUDI, CICI, JAUH].map(o => DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, 'anggota')").bind(TUGAS, o.id))]);
  KIT_A = id16(); KIT_B = id16(); KIT_LAIN = id16();
  for (const [id, kode, prov] of [[KIT_A, "SIPPA-001", "62"], [KIT_B, "SIPPA-002", "62"], [KIT_LAIN, "SIPPA-003", "33"]]) {
    await DB.prepare("INSERT INTO sippa_kit (id, kode, jenis, prov, dibuat, diubah, dummy) VALUES (?, ?, 'banjir', ?, 1, 1, 0)").bind(id, kode, prov).run();
    await DB.prepare("INSERT INTO sippa_tugas (id, kit_id, kode_sha, nama_regu, unsur, prov, kab, mulai, berakhir, oleh, dummy) VALUES (?, ?, ?, 'Regu Kit', 'bpbd', ?, 'Kab', ?, ?, 'uji', 0)").bind(id16(), id, sha256(id + "k"), prov, kini - JAM, kini + 5 * JAM).run();
  }
  /* KIT_B: penugasannya dicabut, jadi bukan kit tugas */
  await DB.prepare("UPDATE sippa_tugas SET dicabut = ? WHERE kit_id = ?").bind(kini, KIT_B).run();
});

uji("LP-030 x-kode-regu: kode regu sah masuk sebagai orang pegawai; salah, dicabut, dan campur tanpa kode ditolak 401; /api/posko lama tetap jalan", async () => {
  const kode = "ab".repeat(13), id = id16();
  await DB.prepare("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat) VALUES (?, 'Regu Seruyan 1', 'BPBD', '62', 'Seruyan', ?, 1)").bind(id, sha256(kode)).run();
  REGU = {id, kode};
  const s = await api("GET", "/api/petugas/saya", undefined, {"x-kode-regu": kode}); assert.equal(s.s, 200, s.t);
  assert.deepEqual([s.j.orang.id, s.j.orang.nama, s.j.orang.jenis, s.j.orang.prov], [id, "Regu Seruyan 1", "pegawai", "62"]);
  assert.equal(await U.n("orang", `id = '${id}' AND kode_sha IS NULL`), 1, "satu baris orang, tanpa kode pribadi");
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {"x-kode-regu": kode})).s, 200); assert.equal(await U.n("orang", `id = '${id}'`), 1, "ulang tidak menggandakan");
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {"x-kode-regu": "cd".repeat(13)})).s, 401, "kode regu salah");
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {"x-kode-regu": "bukan-heks"})).s, 401, "bentuk salah");
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {})).s, 401, "tanpa kode apa pun");
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {"x-kode": kode})).s, 401, "kode regu bukan x-kode");
  await DB.prepare("UPDATE orang SET status = 'nonaktif' WHERE id = ?").bind(id).run();
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {"x-kode-regu": kode})).s, 401, "orang regu dinonaktifkan");
  await DB.prepare("UPDATE orang SET status = 'aktif' WHERE id = ?").bind(id).run();
  await DB.prepare("UPDATE regu SET dicabut = 5 WHERE id = ?").bind(id).run();
  assert.equal((await api("GET", "/api/petugas/saya", undefined, {"x-kode-regu": kode})).s, 401, "regu dicabut");
  await DB.prepare("UPDATE regu SET dicabut = NULL WHERE id = ?").bind(id).run();
  /* regu lama: rute Posko yang memakai kode yang sama tetap menerimanya */
  const p = await api("POST", "/api/prediksi/konfirmasi", {kab: "Seruyan", tanggal: hari(), kode: "BNJ", terjadi: 1}, {"x-kode-regu": kode}); assert.equal(p.s, 200, p.t);
});

uji("/saya (LP-042, LP-043): pelatihan relawan, keahlian, kit_tugas hanya kit aktif di provinsinya; tanpa kode 401", async () => {
  assert.equal((await api("GET", "/api/petugas/saya")).s, 401);
  const b = await api("GET", "/api/petugas/saya", undefined, K(BUDI.kode));
  assert.deepEqual([b.j.pelatihan, b.j.keahlian, b.j.kit_tugas], [[], [], [{id: KIT_A, nama: "SIPPA-001"}]], "pegawai: tanpa pelatihan; KIT_B dicabut dan KIT_LAIN provinsi lain tidak ikut");
  const j = await api("GET", "/api/petugas/saya", undefined, K(JAUH.kode)); assert.deepEqual(j.j.kit_tugas, [{id: KIT_LAIN, nama: "SIPPA-003"}]);
  const r = await api("GET", "/api/petugas/saya", undefined, K(RELA.kode)); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.pelatihan, [{nama: "P3K", tanggal: "2026-08-15"}, {nama: "Pemadaman gambut", tanggal: "2026-03-01"}], "terbaru dulu");
  await DB.prepare("INSERT INTO orang_keahlian (orang_id, keahlian, bukti, dibuat) VALUES (?, 'drone', NULL, 1), (?, 'pompa', NULL, 1)").bind(BUDI.id, BUDI.id).run();
  assert.deepEqual((await api("GET", "/api/petugas/saya", undefined, K(BUDI.kode))).j.keahlian, ["drone", "pompa"]);
  assert.deepEqual((await api("GET", "/api/petugas/saya", undefined, K(CICI.kode))).j.keahlian, [], "keahlian orang lain tidak bocor");
});

uji("logbook: kit (LP-043) dan genangan ke prediksi (LP-045); kit tugas lain, jumlah liar, dan logbook tugas orang lain DITOLAK tanpa menulis", async () => {
  const kini = Date.now(), meta = (u = {}) => ({lat: TITIK.lat + 0.0005, lon: TITIK.lon, akurasi: 10, waktu: kini - 60e3, exif_lat: TITIK.lat + 0.0005, exif_lon: TITIK.lon, exif_waktu: kini - 60e3, ...u});
  const D = (u = {}) => ({tugas_id: TUGAS, tanggal: hari(), kegiatan: "pemantauan", kondisi: {tinggi_genangan_cm: 45, hujan_lokal: "lebat"}, foto_meta: [meta()], ...u});
  for (const [u, s, pola] of [[{kit: [{kit_id: KIT_LAIN}]}, 403, /bukan kit/], [{kit: [{kit_id: KIT_B}]}, 403, /bukan kit/], [{kit: [{nama: "SIPPA-003"}]}, 403, /bukan kit/], [{kit: [{kit_id: KIT_A, jumlah: 0}]}, 400, /jumlah/],
    [{kit: [{kit_id: KIT_A, jumlah: 1.5}]}, 400, /jumlah/], [{kit: [{jumlah: 2}]}, 400, /kit_id atau nama/], [{kit: "SIPPA-001"}, 400, /daftar/], [{kit: Array(21).fill({kit_id: KIT_A})}, 400, /20/]]) {
    const r = await logbook(BUDI.kode, D(u), [jpeg()]); assert.equal(r.s, s, JSON.stringify(u).slice(0, 60) + r.t); assert.match(r.j.galat, pola);
  }
  assert.equal((await logbook(null, D(), [jpeg()])).s, 401);
  assert.equal((await logbook(JAUH.kode, D({tugas_id: id16()}), [jpeg()])).s, 404, "tugas yang bukan miliknya");
  assert.equal(await U.n("lp_logbook"), 0, "penolakan tidak menulis"); assert.equal(await U.n("lp_logbook_kit"), 0); assert.equal(await U.n("prediksi_konfirmasi", "kode_regu LIKE 'lp:%'"), 0);
  const ok = await logbook(BUDI.kode, D({kit: [{kit_id: KIT_A, jumlah: 2}, {nama: "sippa-001", jumlah: 3}]}), [jpeg()]); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.kit, 1, "kit_id dan nama yang sama = satu butir");
  assert.deepEqual((await baris("lp_logbook_kit", `logbook_id = '${ok.j.id}'`)).map(x => [x.kit_id, x.jumlah]), [[KIT_A, 3]]);
  let [p] = await baris("prediksi_konfirmasi", "kode_regu LIKE 'lp:%'");
  assert.deepEqual([p.kab, p.tanggal, p.kode, p.terjadi, p.nilai, p.sumber, p.kode_regu], ["Seruyan", hari(), "BNJ", 1, 45, "regu", "lp:" + BUDI.id]);
  /* ubah di hari yang sama: kit diganti, prediksi ditimpa (bukan baris kedua); tanpa field kit = kit tidak berubah */
  const u1 = await logbook(BUDI.kode, D({kondisi: {tinggi_genangan_cm: 0}}), [jpeg()]); assert.equal(u1.s, 200, u1.t); assert.equal(u1.j.kit, undefined);
  assert.equal(await U.n("lp_logbook_kit"), 1, "tanpa kit = tidak diubah");
  [p] = await baris("prediksi_konfirmasi", "kode_regu LIKE 'lp:%'"); assert.deepEqual([p.terjadi, p.nilai], [0, 0]); assert.equal(await U.n("prediksi_konfirmasi", "kode_regu LIKE 'lp:%'"), 1);
  const u2 = await logbook(BUDI.kode, D({kit: [], kondisi: {}, foto_meta: []})); assert.equal(u2.s, 200); assert.equal(await U.n("lp_logbook_kit"), 0, "kit: [] mengosongkan");
  /* tanpa foto bergeotag di radius = tidak terverifikasi = tidak masuk prediksi */
  const t = await logbook(CICI.kode, D({foto_meta: []})); assert.equal(t.s, 201, t.t); assert.equal(await U.n("prediksi_konfirmasi", `kode_regu = 'lp:${CICI.id}'`), 0, "tanpa foto terverifikasi");
  const jauh = await logbook(CICI.kode, D({foto_meta: [meta({lat: TITIK.lat + 0.1, exif_lat: TITIK.lat + 0.1})]}), [jpeg()]); assert.equal(jauh.s, 200, jauh.t);
  assert.equal(await U.n("prediksi_konfirmasi", `kode_regu = 'lp:${CICI.id}'`), 0, "foto di luar radius tugas");
  /* logbook lewat kode regu Posko (LP-030): anggota harus terdaftar di tugas, regu belum = 404 */
  const rg = await logbook(null, D({foto_meta: []}), [], {"x-kode-regu": REGU.kode}); assert.equal(rg.s, 404, "regu bukan anggota tugas");
  await DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, 'anggota')").bind(TUGAS, REGU.id).run();
  const rg2 = await logbook(null, D({foto_meta: []}), [], {"x-kode-regu": REGU.kode}); assert.equal(rg2.s, 201, rg2.t);
});

uji("pengingat (LP-044): absen sesudah 10.00 WIB, logbook sesudah 20.00 WIB, satu baris per tugas per hari, hilang bila sudah terisi", async () => {
  const jamWIB = j => Date.parse(hari() + "T00:00:00Z") - 7 * JAM + j * JAM, env = {DB, ASSETS: {fetch: async () => new Response("", {status: 404})}};
  const daftar = async () => (await DB.prepare("SELECT jenis, judul, rincian FROM pengingat WHERE sumber_id = ? ORDER BY jenis").bind(TUGAS).all()).results;
  const jalan = j => buatPengingat(env, jamWIB(j), {hanya: ["lapangan_absen", "lapangan_logbook"]});
  await jalan(9.5); assert.equal((await daftar()).length, 0, "sebelum 10.00 belum dinilai");
  await jalan(11);
  /* 4 anggota (BUDI, CICI, JAUH, REGU), tanpa absen sama sekali */
  let d = await daftar(); assert.deepEqual(d.map(x => x.jenis), ["lapangan_absen"]); assert.match(d[0].judul, /4 dari 4 petugas belum absen masuk/); assert.match(d[0].judul, /Patroli banjir Seruyan/);
  assert.doesNotMatch(JSON.stringify(d), /Budi|Cici|Jauh|Regu Seruyan/, "tanpa nama petugas");
  await jalan(11); assert.equal((await daftar()).length, 1, "ulang = tetap satu");
  const absen = (o, status) => DB.prepare(`INSERT INTO lp_absen (id, orang_id, tugas_id, jenis, tanggal, waktu, lat, lon, foto_key, foto_sha256, status) VALUES (?, ?, ?, 'masuk', ?, ?, ?, ?, 'lapangan/x.jpg', ?, ?)`).bind(id16(), o.id, TUGAS, hari(), jamWIB(8), TITIK.lat, TITIK.lon, sha256(id16()), status).run();
  await absen(BUDI, "lolos"); await absen(CICI, "tolak");
  await jalan(11); d = await daftar(); assert.match(d[0].judul, /3 dari 4 petugas/, "absen sah mengurangi; absen ditolak tidak dihitung");
  /* logbook: Budi, Cici, dan regu sudah mengisi (uji sebelumnya); Jauh belum */
  await jalan(21); d = await daftar(); assert.deepEqual(d.map(x => x.jenis), ["lapangan_absen", "lapangan_logbook"]); assert.match(d[1].judul, /1 dari 4 petugas belum mengisi logbook/);
  await DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, kendala, kebutuhan, kondisi, waktu, diubah, terkunci, dummy) VALUES (?, ?, ?, ?, 'lainnya', '[]', '[]', '{}', 1, 1, 0, 0)").bind(id16(), JAUH.id, TUGAS, hari()).run();
  await jalan(21); assert.deepEqual((await daftar()).map(x => x.jenis), ["lapangan_absen"], "semua sudah isi logbook: pengingatnya ikut hilang");
  /* tugas dummy dan tugas yang sudah selesai tidak memicu pengingat nyata */
  const lalu = id16();
  await DB.batch([DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat, dummy) VALUES (?, 'Tugas lampau', 'banjir', ?, ?, 500, 1, 2, 1, 0)").bind(lalu, TITIK.lat, TITIK.lon), DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id) VALUES (?, ?)").bind(lalu, JAUH.id)]);
  await jalan(21); assert.equal(await U.n("pengingat", `sumber_id = '${lalu}'`), 0);
});

uji("sitrep (LP-047): arsip memuat ringkasan logbook per tugas, agregat tanpa nama atau uraian; logbook dummy tidak ikut", async () => {
  const kini = Date.parse(hari() + "T07:00:00Z") - 7 * JAM + 12 * JAM;   // 12.00 WIB hari ini
  await DB.prepare("UPDATE lp_logbook SET uraian = 'RAHASIA-URAIAN', kendala = '[\"air_jauh\"]' WHERE orang_id = ?").bind(BUDI.id).run();
  const dummyTugas = id16();
  await DB.batch([DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat, dummy) VALUES (?, 'Tugas dummy', 'banjir', ?, ?, 500, 1, ?, 1, 1)").bind(dummyTugas, TITIK.lat, TITIK.lon, Date.now() + HARI),
    DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, kendala, kebutuhan, kondisi, waktu, diubah, terkunci, dummy) VALUES (?, ?, ?, ?, 'lainnya', '[]', '[]', '{}', 1, 1, 0, 1)").bind(id16(), BUDI.id, dummyTugas, hari())]);
  const {logbookPetugas} = await import("../../src/sitrep.js");
  const r = await logbookPetugas({DB}, kini);
  assert.equal(r.tugas.length, 1, "tugas dummy tidak ikut"); const t = r.tugas[0];
  assert.deepEqual([t.id, t.judul, t.anggota, t.terisi, t.tanggal], [TUGAS, "Patroli banjir Seruyan", 4, 4, hari()]);
  assert.deepEqual(t.kendala, {air_jauh: 1}); assert.equal(t.kegiatan.pemantauan, 3); assert.equal(t.kegiatan.lainnya, 1);
  assert.doesNotMatch(JSON.stringify(r), /RAHASIA|Budi|Cici/);
  /* arsip R2: dipakai bila registry terbaca; di sini hanya memastikan fungsi arsip tidak rusak oleh tambahan (masukan wajib tak terbaca = dilewati, bukan galat) */
  const a = await arsipkanSitrep({DB, MEDIA: await U.mf.getR2Bucket("MEDIA"), ASSETS: {fetch: async () => new Response("", {status: 404})}}, kini, true);
  assert.ok(a.lewat, JSON.stringify(a));
});
