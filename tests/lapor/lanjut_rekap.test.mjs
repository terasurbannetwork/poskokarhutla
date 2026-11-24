/* LJ-12: rekap berkas ke meja dampak dan pengungsi, terima ke Jitupasna (src/lapor_lanjut_meja.js, src/lapor_lanjut_spek.js, rute POST /api/lapor/data/terima;
   paket data/kajian-bnpb/lapor-lanjutan, RENCANA-UJI baris 13 dan 36 sampai 40). worker.js utuh di workerd (Miniflare), D1 sungguhan dengan migrasi apa adanya, tanpa mock.
   Nomor WA dan nama rekaan, bukan nomor pemilik. Jalan: node --test tests/lapor/lanjut_rekap.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import "../../src/worker.js";
import {bukaBerkas} from "../../src/lapor_lanjut.js";
import {bahanJitupasna, kolomRekap, gabungDampak, rekap} from "../../src/lapor_lanjut_spek.js";
import {KOLOM_DAMPAK} from "../../src/meja_spek.js";
import {segarkanGrup} from "../../src/meja.js";
import * as H from "../../src/hak.js";

const uji = berantai();
const U = await siapkan("uji-lapor-rekap", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const env = {DB}, ASAL = "http://bnpb.lokal", kini = Date.now(), XPB = {"x-pb": "1", origin: ASAL};
const KETUA = "6281299770001", BOGOR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
const hari = (g = 0) => new Date(kini + 7 * 36e5 + g * 864e5).toISOString().slice(0, 10);   // tanggal WIB relatif hari ini: fixture tanggal tetap membusuk
let berkasId, kuki;

/* ---------- uji murni ---------- */
uji("bahan Jitupasna: terendam tanpa tingkat rusak tidak masuk; rb rs rr masuk; batal tidak ikut; prasarana per sektor; jalan ditahan; lainnya dilewati (RENCANA-UJI 13, D8)", () => {
  const x = (id, jenis, data, status = "aktif") => ({id, jenis, data, status});
  const b = bahanJitupasna([x("a", "rumah", {tingkat: "tidak_rusak", terendam: true}), x("b", "rumah", {tingkat: "rb"}), x("c", "rumah", {tingkat: "rb"}), x("d", "rumah", {tingkat: "rs"}), x("e", "rumah", {tingkat: "rr"}, "batal"),
    x("f", "prasarana", {jenis: "jembatan", tingkat: "rb"}), x("g", "prasarana", {jenis: "jalan", tingkat: "rb"}), x("h", "prasarana", {jenis: "faskes", tingkat: "rs"}), x("i", "prasarana", {jenis: "lainnya", tingkat: "rb"}), x("j", "jiwa", {tingkat: "rb"})]);
  assert.deepEqual(b, [{sektor: "jalan_jembatan", tingkat: "rb", unit: 1, unit_asal: "isian"}, {sektor: "kesehatan", tingkat: "rs", unit: 1, unit_asal: "isian"},
    {sektor: "perumahan", tingkat: "rb", unit: 2, unit_asal: "rekap_rumah_rusak"}, {sektor: "perumahan", tingkat: "rs", unit: 1, unit_asal: "rekap_rumah_rusak"}]);
  assert.deepEqual(bahanJitupasna([x("a", "rumah", {tingkat: "tidak_rusak", terendam: true})]), [], "hanya terendam: tidak ada bahan");
});

uji("kolomRekap: nilai null tidak ditulis; nihil per metrik jadi 0; bagian yang seluruh metriknya nihil jadi pilihan tidak ada dan kolomnya kosong", () => {
  const sah = KOLOM_DAMPAK.sah, ob = (id, jenis, data) => ({id, jenis, data, status: "aktif"});
  const r1 = rekap([ob("a", "rumah", {tingkat: "rb", terendam: false})], {tgl: hari()});
  const k1 = kolomRekap(r1, sah);
  assert.equal(k1.nilai.rumah_rb, 1); assert.ok(!("meninggal" in k1.nilai) && !("hilang" in k1.nilai) && !("rumah_rs" in k1.nilai), "belum didata tidak ditulis sebagai 0");
  assert.ok(!("prasarana_putus" in k1.nilai), "bukan kolom meja"); assert.deepEqual(k1.nihil, []);
  const r2 = rekap([], {nihil: new Set(["meninggal", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam"]), tgl: hari()}), k2 = kolomRekap(r2, sah);
  assert.equal(k2.nilai.meninggal, 0, "nihil menulis 0"); assert.deepEqual(k2.nihil, ["rumah"]); assert.ok(!("rumah_rb" in k2.nilai), "bagian nihil: kolom kosong");
  const r3 = rekap([], {nihil: new Set(["rumah_rb", "rumah_rs"]), tgl: hari()}), k3 = kolomRekap(r3, sah);
  assert.equal(k3.nilai.rumah_rb, 0); assert.deepEqual(k3.nihil, [], "sebagian nihil bukan tidak ada");
});

uji("gabungDampak: kolom ketikan tidak ditimpa dan bertanda beda_sumber; kolom bersumber daftar mengikuti daftar; diverifikasi hanya bertanda rekap_baru", () => {
  const info = KOLOM_DAMPAK, mk = (nilai, nihil = []) => ({nilai, nihil});
  const a = gabungDampak({jenis: "banjir", rumah_rs: 5}, "dilaporkan", mk({rumah_rb: 2, rumah_rs: 1}), info, 1).data;
  assert.equal(a.rumah_rb, 2); assert.equal(a.rumah_rs, 5, "ketikan tetap"); assert.deepEqual(a.lapor_beda, ["rumah_rs"]); assert.deepEqual(a.lapor_sumber, {rumah_rb: "daftar"}); assert.deepEqual(a.lapor_daftar, {rumah_rb: 2, rumah_rs: 1});
  const b = gabungDampak(a, "dilaporkan", mk({rumah_rb: 3, rumah_rs: 1}), info, 2).data;
  assert.equal(b.rumah_rb, 3, "kolom bersumber daftar mengikuti"); assert.equal(b.rumah_rs, 5);
  const c = gabungDampak({...b, rumah_rb: 9}, "dilaporkan", mk({rumah_rb: 4, rumah_rs: 1}), info, 3).data;
  assert.equal(c.rumah_rb, 9, "daftar yang sudah ditimpa ketikan tidak diambil lagi"); assert.deepEqual(c.lapor_beda, ["rumah_rb", "rumah_rs"]);
  const d = gabungDampak(b, "diverifikasi", mk({rumah_rb: 7, rumah_rs: 1}), info, 4); assert.equal(d.data.rumah_rb, 3, "isi tidak berubah"); assert.deepEqual(d.data.lapor_rekap_baru.nilai, {rumah_rb: 7, rumah_rs: 1}); assert.equal(d.data.lapor_daftar.rumah_rb, 3);
  assert.equal(gabungDampak(d.data, "diverifikasi", mk({rumah_rb: 7, rumah_rs: 1}), info, 5).ubah, false, "rekap yang sama tidak menulis ulang");
  assert.equal(gabungDampak(d.data, "diverifikasi", mk({rumah_rb: 3, rumah_rs: 1}), info, 6).data.lapor_rekap_baru, undefined, "rekap kembali sama: tanda dicabut");
  const nh = gabungDampak({jenis: "banjir"}, "dilaporkan", {nilai: {}, nihil: ["rumah"]}, info, 1).data; assert.equal(nh.nihil_rumah, true);
  assert.equal(gabungDampak(nh, "dilaporkan", mk({rumah_rb: 1}), info, 2).data.nihil_rumah, undefined, "ada objek: tidak ada dicabut");
  assert.equal(gabungDampak({jenis: "banjir", rugi_rumah: 10}, "dilaporkan", {nilai: {}, nihil: ["rumah"]}, info, 1).data.nihil_rumah, undefined, "isian ketikan di bagian itu: tidak ada tidak dipasang");
});

/* ---------- uji rute ---------- */
async function tiket(nomor, wa, tingkat, wilayah = BOGOR) {
  const kerja = {tingkat, isian: {lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah)
      VALUES (?, ?, 'terkirim', ?, 'banjir', ?, -6.6, 106.8, ?, ?, ?, ?, '{}', 0, ?, ?)`).bind("s" + nomor, wa, tingkat, wilayah.kabKode, nomor, sha256(nomor), kini, JSON.stringify(kerja), kini, kini),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, 'baru', ?)").bind(nomor, "s" + nomor, kini)]);
}
const tulis = (b, h = {cookie: kuki, ...XPB}) => api("POST", "/api/lapor/data/objek", b, h);
const RUMAH = {kk: "Budi Santoso", desa: "Paledang", kec: "Bogor Tengah", alamat: "RT 01 RW 02", tingkat: "rb", terendam: false, huni: "mengungsi", jiwa: 4};
const PRAS = {jenis: "jembatan", nama: "Jembatan Cisadane", desa: "Paledang", tingkat: "rb", fungsi: "putus", panjang_m: 40, kendaraan: "tidak_ada"};
const TITIK = {nama: "Gedung Serbaguna", desa: "Paledang", jenis_tempat: "terkonsentrasi", tipe_tempat: "fasilitas_umum", tgl_buka: hari(-1), keb_air: "ada", keb_pangan: "ada", keb_sandang: "tidak", keb_kesehatan: "tidak", keb_hunian: "tidak", keb_pendidikan: "ada"};
const JIWA = {nama: "Sari Rahmawati", umur: 30, jk: "p", desa_asal: "Paledang", masuk: hari(-1), kk: "diri", hp: "081234567000"};
const dampak = async () => { const c = await DB.prepare("SELECT * FROM meja_catatan WHERE id = ? AND meja = 'dampak'").bind(berkasId).first(); return c && {...c, d: JSON.parse(c.data)}; };
const sesiStaf = async (id, peran, wilayah = []) => { const tok = (id.slice(0, 2) + "7d").repeat(32).slice(0, 64);
  await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, 'Nama', ?, 'Unit', ?, ?, ?, ?, 'gggggggggggggggggggggggggggggggg', ?, 0, 1, 'tes', 0)`).bind(id, "uji" + id.slice(0, 6), "200" + id.slice(0, 4), id.slice(0, 4) + "@b.id", "6281200" + id.slice(0, 5), JSON.stringify([peran]), JSON.stringify(wilayah), "a".repeat(64)),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 3600e3)]);
  return {cookie: `sesi_staf=${tok}`, origin: ASAL, "x-pb": "1"}; };

uji("siapkan: berkas terbuka, tim masuk dengan kuki; belum ada objek berarti belum ada catatan meja", async () => {
  await DB.prepare("INSERT INTO lapor_izin (wa, peran, kab, oleh, dibuat) VALUES (?, 'bpbd', 'Kota Bogor', 'uji', ?)").bind(KETUA, kini).run(); await tiket("LA-231126-01", KETUA, "bpbd");
  const r = await bukaBerkas(env, "LA-231126-01", kini, ASAL); assert.equal(r.buka, true); berkasId = r.berkas;
  const t = /\?t=([0-9a-f]{32})/.exec((await DB.prepare("SELECT teks FROM lj_kabar WHERE wa = ?").bind(KETUA).first()).teks)[1];
  const m = await api("POST", "/api/lapor/data/masuk", {t}, XPB); assert.equal(m.s, 200, m.t); kuki = m.h.get("set-cookie").split(";")[0];
  assert.equal(await n("meja_catatan", "meja = 'dampak'"), 0);
});

uji("rekap masuk satu catatan meja dampak berkolom lapor_berkas; nilai null tidak jadi 0; objek kedua tidak membuat catatan kedua (RENCANA-UJI 36)", async () => {
  const r = await tulis({jenis: "rumah", isian: RUMAH}); assert.equal(r.s, 201, r.t);
  const c = await dampak(); assert.ok(c, "catatan dibuat sistem"); assert.equal(c.status, "dilaporkan"); assert.equal(c.prov, "32"); assert.equal(c.kab, "Kota Bogor"); assert.equal(c.oleh, "lapor_lanjut");
  assert.equal(c.d.lapor_berkas, berkasId); assert.equal(c.d.jenis, "banjir"); assert.match(c.d.nama_kejadian, /^Banjir Kota Bogor \(LA-231126-01\)$/); assert.equal(c.d.tanggal, hari());
  assert.equal(c.d.rumah_rb, 1); assert.deepEqual(c.d.lapor_sumber.rumah_rb, "daftar");
  for (const m of ["meninggal", "hilang", "luka", "mengungsi", "rumah_rs", "rumah_rr", "rumah_terendam", "jembatan_rb", "jalan_km"]) assert.ok(!(m in c.d), `${m}: belum didata, tidak ditulis`);
  assert.ok(!Object.values(c.d).some(v => v === 0), "tidak ada nol karangan");
  assert.equal(await n("meja_jejak", `catatan_id = '${berkasId}'`), 1);
  const r2 = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Ani Lestari", tingkat: "rs", terendam: true}}); assert.equal(r2.s, 201);
  const p = await tulis({jenis: "prasarana", isian: PRAS}); assert.equal(p.s, 201, p.t);
  assert.equal(await n("meja_catatan", "meja = 'dampak'"), 1, "satu catatan per berkas");
  const c2 = await dampak(); assert.equal(c2.d.rumah_rb, 1); assert.equal(c2.d.rumah_rs, 1); assert.equal(c2.d.rumah_terendam, 1); assert.equal(c2.d.jembatan_rb, 1);
  assert.equal(c2.d.prasarana_putus, undefined, "bukan kolom meja"); assert.ok(!/Budi|Ani|Santoso|Lestari/.test(c2.data), "tanpa data pribadi di catatan meja");
  assert.ok((await DB.prepare("SELECT n FROM meja_ringkas WHERE meja = 'dampak' AND kab = 'Kota Bogor'").first())?.n >= 1, "meja_ringkas ikut diperbarui");
});

uji("nihil menulis 0 untuk metriknya; objek yang sama tidak menulis ulang bila hasilnya tidak berubah", async () => {
  const sebelum = await n("meja_jejak", `catatan_id = '${berkasId}'`);
  const h = await api("POST", "/api/lapor/data/nihil", {metrik: "meninggal", nihil: true}, {cookie: kuki, ...XPB}); assert.equal(h.s, 200, h.t);
  const c = await dampak(); assert.equal(c.d.meninggal, 0, "nihil = 0"); assert.ok(!("hilang" in c.d), "yang tidak ditandai tetap kosong");
  assert.equal(await n("meja_jejak", `catatan_id = '${berkasId}'`), sebelum + 1);
  const t = await tulis({jenis: "usaha", isian: {jenis: "kios", desa: "Paledang", besaran: 2, satuan: "unit"}}); assert.equal(t.s, 201, t.t);
  assert.equal(await n("meja_jejak", `catatan_id = '${berkasId}'`), sebelum + 1, "usaha tidak mengubah kolom meja: tidak menulis");
});

uji("angka ketikan yang berbeda tetap ada dan bertanda beda_sumber; mesin tidak memilih; petugas memilih lewat mengubah isi (RENCANA-UJI 36)", async () => {
  await DB.prepare("UPDATE meja_catatan SET data = json_set(data, '$.rumah_rs', 5) WHERE id = ?").bind(berkasId).run();   // petugas mengetik 5 di kolom yang daftarnya 1
  const r = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Cici Amelia", tingkat: "rs"}}); assert.equal(r.s, 201);
  let c = await dampak(); assert.equal(c.d.rumah_rs, 5, "ketikan tidak ditimpa"); assert.equal(c.d.lapor_daftar.rumah_rs, 2, "angka daftar disimpan berdampingan"); assert.deepEqual(c.d.lapor_beda, ["rumah_rs"]);
  assert.equal(c.d.rumah_rb, 1);
  const bersih = d => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith("lapor_")));
  const u = await api("POST", `/api/meja/catatan/${berkasId}`, {aksi: "ubah", data: {...bersih(c.d), rumah_rs: 2}}, {...ADMIN, ...XPB}); assert.equal(u.s, 200, u.t);   // memilih angka daftar
  c = await dampak(); assert.equal(c.d.rumah_rs, 2); assert.equal(c.d.lapor_beda, undefined, "sama dengan daftar: tanda hilang"); assert.equal(c.d.lapor_berkas, berkasId, "kunci sistem tetap");
  assert.equal(c.d.lapor_daftar.rumah_rs, 2);
});

uji("catatan diverifikasi atau masuk_logbook: isi tidak berubah, hanya bertanda rekap_baru; diterima lewat terima_rekap (RENCANA-UJI 37)", async () => {
  await DB.prepare("UPDATE meja_catatan SET status = 'diverifikasi' WHERE id = ?").bind(berkasId).run();
  const awal = await dampak(), kolom = d => JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith("lapor_"))));
  const r = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Dedi Kurnia", tingkat: "rr"}}); assert.equal(r.s, 201);
  let c = await dampak(); assert.equal(c.status, "diverifikasi"); assert.equal(kolom(c.d), kolom(awal.d), "kolom isi sama persis"); assert.equal(c.diubah, awal.diubah, "diubah tidak maju");
  assert.equal(c.d.rumah_rr, undefined); assert.equal(c.d.lapor_rekap_baru.nilai.rumah_rr, 1); assert.equal(c.d.lapor_daftar.rumah_rr, undefined, "rekap yang diterapkan belum berubah");
  await DB.prepare("UPDATE meja_catatan SET status = 'masuk_logbook' WHERE id = ?").bind(berkasId).run();
  const r2 = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Eka Putri", tingkat: "rr"}}); assert.equal(r2.s, 201);
  c = await dampak(); assert.equal(c.status, "masuk_logbook"); assert.equal(c.d.rumah_rr, undefined); assert.equal(c.d.lapor_rekap_baru.nilai.rumah_rr, 2);
  const bersih = d => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith("lapor_") && !k.startsWith("logbook_")));
  const tolakDulu = await api("POST", `/api/meja/catatan/${berkasId}`, {aksi: "ubah", data: bersih(c.d), terima_rekap: "ya"}, {...ADMIN, ...XPB}); assert.equal(tolakDulu.s, 400);
  const u0 = await api("POST", `/api/meja/catatan/${berkasId}`, {aksi: "ubah", data: bersih(c.d)}, {...ADMIN, ...XPB}); assert.equal(u0.s, 200, u0.t);   // mengubah tanpa menerima rekap
  c = await dampak(); assert.equal(c.status, "dilaporkan"); assert.equal(c.d.rumah_rr, undefined); assert.equal(c.d.lapor_rekap_baru.nilai.rumah_rr, 2, "tanda tetap sampai diterima");
  const u = await api("POST", `/api/meja/catatan/${berkasId}`, {aksi: "ubah", data: bersih(c.d), terima_rekap: true}, {...ADMIN, ...XPB}); assert.equal(u.s, 200, u.t);
  c = await dampak(); assert.equal(c.d.rumah_rr, 2); assert.equal(c.d.lapor_rekap_baru, undefined); assert.equal(c.d.lapor_daftar.rumah_rr, 2);
});

uji("rekap harian titik masuk meja pengungsi: kunci titik dan tanggal, enam sektor terbawa, kejadian dari tiket induk; satu catatan per titik per hari (RENCANA-UJI 38)", async () => {
  const t = await tulis({jenis: "titik", isian: TITIK, lat: -6.6, lon: 106.8}); assert.equal(t.s, 201, t.t); const tp = t.j.objek.titik_id;
  assert.equal(await n("meja_catatan", "meja = 'pengungsi'"), 0, "titik tanpa pengungsi: belum ada catatan (tidak ada nol karangan)");
  const j1 = await tulis({jenis: "jiwa", isian: {...JIWA, titik: tp}}); assert.equal(j1.s, 201, j1.t);
  const j2 = await tulis({jenis: "jiwa", isian: {nama: "Anak Uji", umur: 7, jk: "l", desa_asal: "Paledang", masuk: hari(-1), kk: j1.j.objek.id, titik: tp}}); assert.equal(j2.s, 201, j2.t);
  const baris = await DB.prepare("SELECT * FROM meja_catatan WHERE meja = 'pengungsi'").all(); assert.equal(baris.results.length, 1);
  const c = baris.results[0], d = JSON.parse(c.data);
  assert.equal(d.titik_id, tp); assert.equal(d.tgl_data, hari()); assert.equal(d.nama_tempat, "Gedung Serbaguna"); assert.equal(d.kejadian, "banjir"); assert.equal(d.tgl_buka, hari(-1)); assert.equal(c.status, "tercatat"); assert.equal(c.desa, "Paledang"); assert.equal(c.kab, "Kota Bogor");
  assert.equal(d.jiwa_total, 2); assert.equal(d.kk, 1); assert.equal(d.dewasa_p, 1); assert.equal(d.anak_l, 1); assert.equal(d.bayi_l, 0, "kelompok tanpa orang: 0 dari data karena semua jiwa punya umur dan jenis kelamin");
  assert.deepEqual([d.keb_air, d.keb_pangan, d.keb_sandang, d.keb_kesehatan, d.keb_hunian, d.keb_pendidikan], ["ada", "ada", "tidak", "tidak", "tidak", "ada"]); assert.equal(d.lapor_berkas, berkasId);
  assert.ok(!/Sari|Rahmawati|081234567000|Anak Uji/.test(c.data), "tanpa nama atau HP");
  const j3 = await tulis({jenis: "jiwa", isian: {nama: "Bayi Uji", umur: 0, jk: "p", desa_asal: "Paledang", masuk: hari(-1), kk: j1.j.objek.id, titik: tp}}); assert.equal(j3.s, 201, j3.t);
  assert.equal(await n("meja_catatan", "meja = 'pengungsi'"), 1, "indeks unik titik dan tanggal: tetap satu"); const d2 = JSON.parse((await DB.prepare("SELECT data FROM meja_catatan WHERE meja = 'pengungsi'").first()).data);
  assert.equal(d2.jiwa_total, 3); assert.equal(d2.bayi_p, 1);
  await DB.prepare("UPDATE meja_catatan SET data = json_set(data, '$.lapor_berkas', 'berkaslain') WHERE meja = 'pengungsi'").run();   // catatan milik pihak lain tidak disentuh
  const j4 = await tulis({jenis: "jiwa", isian: {nama: "Orang Lagi", umur: 40, jk: "l", desa_asal: "Paledang", masuk: hari(-1), kk: j1.j.objek.id, titik: tp}}); assert.equal(j4.s, 201);
  assert.equal(JSON.parse((await DB.prepare("SELECT data FROM meja_catatan WHERE meja = 'pengungsi'").first()).data).jiwa_total, 3);
});

uji("Lifeline tidak ditulis langsung (D7): tidak ada baris lf_status atau lf_usulan dari rekap", async () => {
  assert.equal(await n("lf_status"), 0); assert.equal(await n("lf_usulan"), 0);
});

uji("jiwa terakhir keluar: catatan pengungsi hari ini milik berkas ditutup lewat tgl_tutup (tidak dijumlah rekapTerakhir) dan dibuka lagi bila jiwa kembali", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  const t = await tulis({jenis: "titik", isian: {...TITIK, nama: "Balai Desa Kedua"}, lat: -6.7, lon: 106.9}); assert.equal(t.s, 201, t.t); const tp = t.j.objek.titik_id;
  const j = await tulis({jenis: "jiwa", isian: {...JIWA, nama: "Penghuni Tunggal", titik: tp}}); assert.equal(j.s, 201, j.t);
  const baris = async () => { const c = await DB.prepare("SELECT data, status FROM meja_catatan WHERE meja = 'pengungsi' AND json_extract(data, '$.titik_id') = ?").bind(tp).first(); return c && JSON.parse(c.data); };
  let d = await baris(); assert.equal(d.jiwa_total, 1); assert.equal(d.tgl_tutup, undefined);
  const o = j.j.objek, keluar = await tulis({id: o.id, rev: o.rev, isian: {...JIWA, nama: "Penghuni Tunggal", titik: tp, keluar: hari()}}); assert.equal(keluar.s, 200, keluar.t);
  d = await baris(); assert.equal(d.tgl_tutup, hari(-1), "titik buka kemarin: tutup kemarin"); assert.equal(d.lapor_tutup, true); assert.equal(d.jiwa_total, 1, "angka terakhir tidak dikarang jadi 0");
  const rg = await DB.prepare("SELECT status, jumlah FROM meja_ringkas WHERE meja = 'pengungsi' AND kab = 'Kota Bogor' AND status = 'ditutup'").first(); assert.ok(rg, "status turunan ditutup");
  assert.equal(JSON.parse(rg.jumlah).jiwa_total, 0, "titik ditutup tidak ikut jumlah");
  const kembali = await tulis({id: keluar.j.objek.id, rev: keluar.j.objek.rev, isian: {...JIWA, nama: "Penghuni Tunggal", titik: tp}}); assert.equal(kembali.s, 200, kembali.t);
  d = await baris(); assert.equal(d.tgl_tutup, undefined, "jiwa kembali: dibuka lagi"); assert.equal(d.lapor_tutup, undefined); assert.equal(d.jiwa_total, 1);
});

uji("catatan pengungsi yang disunting petugas tidak ditimpa rekap: isi tetap, hanya lapor_rekap_baru, tanpa jejak baru", async () => {
  await DB.prepare("UPDATE meja_catatan SET data = json_set(data, '$.lapor_berkas', ?) WHERE meja = 'pengungsi' AND json_extract(data, '$.nama_tempat') = 'Gedung Serbaguna'").bind(berkasId).run();   // kembalikan milik berkas
  const c = await DB.prepare("SELECT id, data FROM meja_catatan WHERE meja = 'pengungsi' AND json_extract(data, '$.nama_tempat') = 'Gedung Serbaguna'").first(), d = JSON.parse(c.data), tp = d.titik_id;
  const spek = Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith("lapor_") && !/^(jiwa_|umur_)/.test(k)));
  const u = await api("POST", `/api/meja/catatan/${c.id}`, {aksi: "ubah", kec: "Bogor Tengah", data: {...spek, saran: "perlu tenda tambahan"}}, {...ADMIN, ...XPB}); assert.equal(u.s, 200, u.t);
  const jejak = await n("meja_jejak", `catatan_id = '${c.id}'`), j = await tulis({jenis: "jiwa", isian: {nama: "Tamu Baru", umur: 50, jk: "l", desa_asal: "Paledang", masuk: hari(-1), kk: "diri", hp: "081234567111", titik: tp}}); assert.equal(j.s, 201, j.t);
  const x = JSON.parse((await DB.prepare("SELECT data FROM meja_catatan WHERE id = ?").bind(c.id).first()).data);
  assert.equal(x.saran, "perlu tenda tambahan"); assert.equal(x.jiwa_total, d.jiwa_total, "isi tetap"); assert.equal(x.dewasa_l, d.dewasa_l);
  assert.equal(x.lapor_rekap_baru.nilai.dewasa_l, 2, "Orang Lagi dan Tamu Baru"); assert.equal(x.lapor_berkas, berkasId); assert.equal(await n("meja_jejak", `catatan_id = '${c.id}'`), jejak, "menandai tidak menulis jejak");
  await tulis({jenis: "jiwa", isian: {nama: "Tamu Dua", umur: 51, jk: "l", desa_asal: "Paledang", masuk: hari(-1), kk: "diri", hp: "081234567222", titik: tp}});
  assert.equal(JSON.parse((await DB.prepare("SELECT data FROM meja_catatan WHERE id = ?").bind(c.id).first()).data).lapor_rekap_baru.nilai.dewasa_l, 3, "tanda mengikuti rekap terbaru");
});

uji("dua sumber untuk kab dan kejadian yang sama tidak dijumlah di meja_ringkas; kejadian lain tetap dijumlah", async () => {
  const ringkas = async () => JSON.parse((await DB.prepare("SELECT jumlah FROM meja_ringkas WHERE meja = 'dampak' AND kab = 'Kota Bogor' AND status = 'dilaporkan' AND dummy = 0").first()).jumlah).rumah_rb;
  const manual = (id, tanggal, rb) => DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, oleh) VALUES (?, 'dampak', '32', 'Kota Bogor', ?, 'dilaporkan', ?, ?, 'petugas:uji')")
    .bind(id, JSON.stringify({jenis: "banjir", nama_kejadian: "Banjir ketikan " + id, tanggal, rumah_rb: rb}), kini, kini).run();
  await segarkanGrup(env, "dampak", "32", "Kota Bogor", 0, kini); const berkasSaja = await ringkas(); assert.ok(berkasSaja >= 1);
  await manual("e".repeat(16), hari(-3), 7); await segarkanGrup(env, "dampak", "32", "Kota Bogor", 0, kini);
  assert.equal(await ringkas(), berkasSaja + 7, "kejadian lain (tanggal beda): dijumlah");
  await manual("d".repeat(16), hari(), 5); await segarkanGrup(env, "dampak", "32", "Kota Bogor", 0, kini);
  assert.equal(await ringkas(), 7 + 5, "kejadian sama: hanya ketikan petugas, berkas tidak dijumlah");
  await DB.prepare("DELETE FROM meja_catatan WHERE id IN (?, ?)").bind("e".repeat(16), "d".repeat(16)).run(); await segarkanGrup(env, "dampak", "32", "Kota Bogor", 0, kini);
  assert.equal(await ringkas(), berkasSaja);
});

/* ---------- terima ke Jitupasna ---------- */
const akunBpbd = async () => {   // akun lembaga kab aktif + sesi profil (pola tests/lapor/lanjut_rute.test.mjs)
  const id = "0000000000000009", mk = "mk00000000000009", ag = "ag000000000000009".slice(0, 16);
  await DB.batch([DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
      VALUES (?, 'lembagarekap', 'pemkot', 'kab', 'Wilayah uji', '32|Kota Bogor', '["32"]', '32', 'Kota Bogor', ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', 'rekap@b.id', '628120030009', 1, 1, 0, ?)`).bind(id, "g".repeat(32), "0".repeat(64), kini),
    DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, '628120020009', 'Anggota Uji', 'aktif', ?)").bind(mk, kini),
    DB.prepare("INSERT INTO mk_anggota (id, mk_id, tabel, akun_id, status, jalur, rujukan, dibuat, diubah) VALUES (?, ?, 'instansi_akun', ?, 'aktif', 'tinjau', 'uji', ?, ?)").bind(ag, mk, id, kini, kini)]);
  return {cookie: (await profilAktif(DB, id)).cookie, origin: ASAL, "x-pb": "1"};
};
let pusdal;
const terima = (b, h) => api("POST", "/api/lapor/data/terima", b, h ?? pusdal);
const KJ = "KJ-2026-ABCDEFGH";

uji("terima: tanpa x-pb, tanpa sesi, tim berkas, Koordalops, dan akun lembaga ditolak; masukan dijaga (aksi tertutup, berkas sah)", async () => {
  pusdal = await sesiStaf("22222b2b2b2b2b2b", "pusdalops"); const koord = await sesiStaf("11111a1a1a1a1a1a", "koordalops");
  const lembaga = await akunBpbd();
  const b = {berkas: berkasId, aksi: "jitupasna"};
  assert.equal((await terima(b, {...ADMIN, origin: ASAL})).s, 403, "tanpa x-pb");
  assert.equal((await terima(b, XPB)).s, 401, "tanpa sesi");
  assert.equal((await terima(b, {cookie: kuki, ...XPB})).s, 401, "kuki tim berkas bukan sesi staf");
  assert.equal((await terima(b, koord)).s, 401, "Koordalops tidak membuka berkas data lanjutan");
  assert.equal((await terima(b, lembaga)).s, 403, "akun lembaga");
  const luar = await sesiStaf("33333c3c3c3c3c3c", "pusdalops", ["31"]), dalam = await sesiStaf("44444d4d4d4d4d4d", "pusdalops", ["32"]);
  const lw = await terima(b, luar); assert.equal(lw.s, 403, lw.t); assert.match(lw.j.galat, /luar wilayah/);
  assert.notEqual((await terima(b, dalam)).s, 403, "staf provinsi berkas ini lolos gerbang wilayah");
  assert.ok(!H.boleh(H.pelakuLpStaf, "sk_jitupasna_baris", "tambah") && !H.boleh(H.pelakuLpStaf, "sk_jejak", "tambah") && !H.boleh(H.pelakuLpStaf, "sk_jitupasna", "baca"), "lp_staf tidak mendapat hak sk_*");
  assert.ok(H.boleh(H.pelakuLjTerima, "sk_jitupasna_baris", "tambah") && !H.boleh(H.pelakuLjTerima, "sk_jitupasna", "ubah") && !H.boleh(H.pelakuLjTerima, "sk_kejadian", "tambah"), "lj_terima sempit");
  assert.equal((await terima({berkas: "xx", aksi: "jitupasna"})).s, 400); assert.equal((await terima({berkas: berkasId, aksi: "tutup"})).s, 400, "penutupan menyusul di LJ-13");
  assert.equal((await terima({berkas: berkasId, aksi: "__proto__"})).s, 400); assert.equal((await terima({berkas: "f".repeat(16), aksi: "jitupasna"})).s, 404);
  assert.equal(await n("sk_jitupasna_baris"), 0);
});

uji("berkas tanpa kejadian_id: Terima ditolak dengan pesan, tidak ada Jitupasna dan tidak ada sk_kejadian baru (RENCANA-UJI 39)", async () => {
  const r = await terima({berkas: berkasId, aksi: "jitupasna"}); assert.equal(r.s, 409, r.t); assert.match(r.j.galat, /belum tertaut ke kejadian/);
  assert.equal(await n("sk_jitupasna"), 0); assert.equal(await n("sk_jitupasna_baris"), 0); assert.equal(await n("sk_kejadian"), 0, "mesin tidak pernah membuat kejadian");
  assert.ok((await dampak()), "dorongan ke meja dampak tetap jalan tanpa kejadian_id");
});

uji("terima: kejadian tertaut tetapi Jitupasna belum dibuka ditolak; mesin tidak membuatnya", async () => {
  await DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, prov, kab4, mulai, fase, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', 'Banjir uji', '32', '3271', ?, 'tanggap', ?, 'manual', ?, ?, 'uji')").bind(KJ, hari(-2), kini, kini, kini).run();
  await DB.prepare("UPDATE lj_berkas SET kejadian_id = ?, kab4 = '3271' WHERE id = ?").bind(KJ, berkasId).run();
  const r = await terima({berkas: berkasId, aksi: "jitupasna"}); assert.equal(r.s, 409, r.t); assert.match(r.j.galat, /belum dibuka/); assert.equal(await n("sk_jitupasna"), 0);
});

let jp;
uji("Jitupasna hanya terisi lewat Terima staf: rumah rb rs rr sebagai rekap_rumah_rusak, prasarana per sektor sebagai isian, terendam tanpa tingkat tidak masuk; terima ulang tidak menggandakan (RENCANA-UJI 40)", async () => {
  jp = "9".repeat(16);
  await DB.prepare("INSERT INTO sk_jitupasna (id, kejadian_id, prov, kab4, status, versi, dibuat, diubah, oleh) VALUES (?, ?, '32', '3271', 'dibuka', 1, ?, ?, 'uji')").bind(jp, KJ, kini, kini).run();
  const tr = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Fani Hanif", tingkat: "tidak_rusak", terendam: true}}); assert.equal(tr.s, 201, tr.t);
  assert.equal(await n("sk_jitupasna_baris"), 0, "mengisi daftar tidak menulis Jitupasna");
  const jl = await tulis({jenis: "prasarana", isian: {jenis: "jalan", nama: "Jalan Raya Paledang", desa: "Paledang", tingkat: "rb", fungsi: "terbatas", panjang_m: 300, kendaraan: "motor"}}); assert.equal(jl.s, 201, jl.t);
  const r = await terima({berkas: berkasId, aksi: "jitupasna"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.jitupasna, jp);
  const b = (await DB.prepare("SELECT sektor, tingkat, unit, unit_asal, jenis, oleh, klien_id FROM sk_jitupasna_baris WHERE jitupasna_id = ? ORDER BY sektor, tingkat").bind(jp).all()).results;
  assert.deepEqual(b.map(x => `${x.sektor}:${x.tingkat}=${x.unit}:${x.unit_asal}`), ["jalan_jembatan:rb=1:isian", "perumahan:rb=1:rekap_rumah_rusak", "perumahan:rr=2:rekap_rumah_rusak", "perumahan:rs=2:rekap_rumah_rusak"]);
  assert.ok(b.every(x => x.jenis === "rusak" && /^lj[0-9a-f]{16}[0-9a-z](rb|rs|rr)$/.test(x.klien_id))); assert.equal(r.j.dilewati.rumah_tanpa_tingkat_rusak, 1); assert.equal(r.j.dilewati.jalan_ditahan_satuan_harga_belum_dikonfirmasi, 1, "satu jalan ditahan (U10), satu jembatan masuk per unit");
  assert.ok(!("nilai_rp" in r.j) && (await DB.prepare("SELECT count(*) n FROM sk_jitupasna_baris WHERE nilai_rp IS NOT NULL").first()).n === 0, "BPBD tidak menaksir rupiah");
  assert.equal(await n("sk_jejak", "obyek = 'jitupasna' AND aksi = 'terima_lapor'"), 1); assert.equal(await n("lj_jejak", `berkas = '${berkasId}' AND aksi = 'terima_jitupasna'`), 1);
  const ulang = await terima({berkas: berkasId, aksi: "jitupasna"}); assert.equal(ulang.s, 200); assert.equal(await n("sk_jitupasna_baris"), 4, "tidak menggandakan");
  assert.equal(await n("sk_kejadian"), 1); assert.equal(await n("lf_status"), 0);
});

uji("terima ulang menyegarkan angka: objek yang dibatalkan membuat barisnya 0, bukan basi; baris lain bergeser", async () => {
  const daftar = await api("GET", "/api/lapor/data/berkas", undefined, {cookie: kuki}); const jembatan = daftar.j.objek.find(o => o.jenis === "prasarana");
  const batal = await api("POST", "/api/lapor/data/batal", {objek: jembatan.id, rev: jembatan.rev, alasan: "salah catat jembatan"}, {cookie: kuki, ...XPB}); assert.equal(batal.s, 200, batal.t);
  const t = await tulis({jenis: "rumah", isian: {...RUMAH, kk: "Gita Pertiwi", tingkat: "rb"}}); assert.equal(t.s, 201, t.t);
  const r = await terima({berkas: berkasId, aksi: "jitupasna"}); assert.equal(r.s, 200, r.t);
  const b = (await DB.prepare("SELECT sektor, tingkat, unit FROM sk_jitupasna_baris WHERE jitupasna_id = ? ORDER BY sektor, tingkat").bind(jp).all()).results;
  assert.deepEqual(b.map(x => `${x.sektor}:${x.tingkat}=${x.unit}`), ["jalan_jembatan:rb=0", "perumahan:rb=2", "perumahan:rr=2", "perumahan:rs=2"]); assert.equal(await n("sk_jitupasna_baris"), 4);
});

uji("Jitupasna sedang dihitung atau final: Terima ditolak dengan pesan dan tidak mengubah baris", async () => {
  const sebelum = JSON.stringify((await DB.prepare("SELECT id, unit FROM sk_jitupasna_baris ORDER BY id").all()).results);
  await DB.prepare("UPDATE sk_jitupasna SET status = 'dihitung', hitung = '{}' WHERE id = ?").bind(jp).run();
  let r = await terima({berkas: berkasId, aksi: "jitupasna"}); assert.equal(r.s, 409); assert.match(r.j.galat, /dihitung/);
  await DB.prepare("UPDATE sk_jitupasna SET status = 'final' WHERE id = ?").bind(jp).run();
  r = await terima({berkas: berkasId, aksi: "jitupasna"}); assert.equal(r.s, 409, r.t); assert.match(r.j.galat, /final.*revisi/);
  assert.equal(JSON.stringify((await DB.prepare("SELECT id, unit FROM sk_jitupasna_baris ORDER BY id").all()).results), sebelum);
  await DB.prepare("INSERT INTO sk_jitupasna (id, kejadian_id, prov, kab4, status, versi, induk_id, dibuat, diubah, oleh) VALUES (?, ?, '32', '3271', 'dibuka', 2, ?, ?, ?, 'uji')").bind("8".repeat(16), KJ, jp, kini, kini).run();
  r = await terima({berkas: berkasId, aksi: "jitupasna"}); assert.equal(r.s, 200, "revisi (versi baru) menerima lagi: " + r.t);
  assert.equal(await n("sk_jitupasna_baris", `jitupasna_id = '${"8".repeat(16)}'`), 3, "jembatan sudah dibatalkan: tidak ada barisnya di versi baru"); assert.equal(await n("sk_jitupasna_baris", `jitupasna_id = '${jp}'`), 4, "versi final tetap utuh");
});

uji("batas laju: Terima paling banyak 60 per jam per staf (RENCANA-UJI 'laju')", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  let s = 0; for (let i = 0; i < 61; i++) s = (await terima({berkas: "f".repeat(16), aksi: "jitupasna"})).s;
  assert.equal(s, 429);
});

uji("batas laju per IP: Terima paling banyak 120 per jam per IP, diperiksa sebelum autentikasi", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  let s = 0; for (let i = 0; i < 121; i++) s = (await terima({berkas: "f".repeat(16), aksi: "jitupasna"}, XPB)).s;
  assert.equal(s, 429, "tamu tanpa sesi tetap terkena laju");
});
