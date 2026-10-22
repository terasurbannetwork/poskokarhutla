/* Mesin tugas multi-bahaya (src/tugas_bencana.js, src/instansi.js buatTugasIsi/selesaiBencana, migrations/0047_tugas_bencana.sql):
   D1 sungguhan di workerd (Miniflare), migrasi apa adanya. Berkas masukan /data/tugas_<id>.json dijawab dari peta `BERKAS`.
   Jalankan: node --test tests/warga/tugas_bencana.test.mjs */
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {readFileSync} from "node:fs";
import path from "node:path";
import "../../src/worker.js";   // worker.js dulu: instansi.js dan worker.js saling impor
import {tugasBaruDariBerkas, verifikasiPadam, selesai} from "../../src/instansi.js";
import {ringkasAkun} from "../../src/push.js";
import {siapkan, berantai, sha256} from "./_bnpb.mjs";
import {AKAR, pecah} from "./_bantu.mjs";

const JAM = 3600e3, MENIT = 60e3, HARI = 24 * JAM, uji = berantai();
const T0 = Date.UTC(2026, 9, 22, 4, 7);   // menit 7, bukan menit 18
const BERKAS = new Map();
const aset = async req => { const b = BERKAS.get(new URL(req.url).pathname.split("/").pop()); return b === undefined ? new Response("tidak ada", {status: 404}) : new Response(typeof b === "string" ? b : JSON.stringify(b)); };
const U = await siapkan("uji-tugas-bencana", {asetKu: aset});
const env = {DB: U.DB, ASSETS: {fetch: aset}};
/* kunci `dibuat` dan `bencana` HARUS sebelum `kompleks` (kontrak: pengintaian hanya membaca awal berkas) */
const berkas = (b, waktu, kompleks, tambah = {}) => BERKAS.set(`tugas_${b}.json`, {dibuat: new Date(waktu).toISOString(), bencana: b, ...tambah, kompleks});
const K = (lat, lon, o = {}) => ({lat, lon, prov: "62", kab: "Seruyan", kec: "Seruyan Hilir", level: 3, n24: 2, ...o});
const bersih = () => U.DB.batch(["tugas_api", "tugas_meta"].map(t => U.DB.prepare(`DELETE FROM ${t}`)));
const baris = b => U.DB.prepare("SELECT t.*, x.reda FROM tugas_api t JOIN tugas_bencana x ON x.tugas_id = t.id WHERE x.bencana = ? ORDER BY t.lat").bind(b).all().then(r => r.results);

/* akun wilayah Kalimantan Tengah (prov 62) dengan sesi, disemai lewat SQL (jalur masuk diuji di instansi.test.mjs) */
async function akun(user) {
  const id = randomBytes(8).toString("hex"), token = randomBytes(32).toString("hex"), kini = Date.now();
  await U.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, 'pemprov', 'prov', 'Pemprov Kalteng', ?, '["62"]', NULL, NULL, ?, ?, 'aktif', 'Budi', '198001012005011001', 'Kepala', 'BPBD', 'budi@x.go.id', '6281234567890', 1, 1, 0, ?)`)
    .bind(id, user, "62||" + user, "g".repeat(32), "a".repeat(64), kini).run();
  await U.DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(token), id, kini, kini + 30 * HARI).run();
  return {cookie: `sesi_instansi=${token}`};
}
const sql0047 = () => pecah(readFileSync(path.join(AKAR, "migrations/0047_tugas_bencana.sql"), "utf8"));

uji("0047: idempoten, bencana di luar daftar ditolak, ikut terhapus bersama tugasnya", async () => {
  for (const s of sql0047()) await U.DB.prepare(s).run();   // diulang di atas skema yang sudah termigrasi
  await U.DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES ('aaaaaaaaaaaaaaaa', '62', 'Seruyan', -2, 112, 3, 1, 1)").run();
  await assert.rejects(U.DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES ('aaaaaaaaaaaaaaaa', 'tsunami')").run());
  await U.DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES ('aaaaaaaaaaaaaaaa', 'banjir')").run();
  await U.DB.prepare("DELETE FROM tugas_api").run();
  assert.equal(await U.n("tugas_bencana"), 0, "ON DELETE CASCADE");
});

uji("ingest tugas_banjir.json: tugas + baris tugas_bencana, kartu hanya kunci whitelist, versi sama sekali saja", async () => {
  await bersih(); berkas("banjir", T0 - 5 * MENIT, [K(-2.5, 112, {id: "B0001", jiwa_terdampak: 180, hujan_mm: 90, rahasia: "x"}), K(-2.2, 112.4, {id: "B0002", level: 2, kartu: {hujan_mm: 10, bukan_kunci: 1}})]);
  const h = await tugasBaruDariBerkas(env, T0);
  assert.deepEqual(h.bencana, {banjir: {baru: 2, digabung: 0}});
  assert.equal(h.lewat, "tugas_kompleks.json belum ada", "berkas karhutla tak ada: yang diproses hanya banjir");
  const B = await baris("banjir"); assert.equal(B.length, 2); assert.ok(B.every(t => t.status === "buka" && t.reda === 0));
  const kartu = id => U.DB.prepare("SELECT kartu FROM tugas_kartu WHERE tugas_id = ?").bind(id).first().then(r => JSON.parse(r.kartu));
  assert.deepEqual(await kartu(B.find(t => t.lat === -2.5).id), {insiden: "B0001", jiwa_terdampak: 180, hujan_mm: 90});
  assert.deepEqual(await kartu(B.find(t => t.lat === -2.2).id), {insiden: "B0002", hujan_mm: 10}, "kartu di butir.kartu juga dibaca; id butir = insiden");
  assert.deepEqual((await tugasBaruDariBerkas(env, T0 + MENIT)).bencana ?? {}, {}, "versi sama diproses sekali");
  assert.equal(await U.n("tugas_api"), 2);
  /* berkas yang menyebut bencana lain (atau tanpa kunci bencana) tidak diurai untuk bahaya ini */
  berkas("gempa", T0 - 4 * MENIT, [K(-1, 110)]); BERKAS.set("tugas_gempa.json", {dibuat: new Date(T0).toISOString(), bencana: "banjir", kompleks: [K(-1, 110)]});
  BERKAS.set("tugas_cuaca.json", {dibuat: new Date(T0).toISOString(), kompleks: [K(-1, 110)]});
  await tugasBaruDariBerkas(env, T0 + 2 * MENIT); assert.equal(await U.n("tugas_api"), 2);
  BERKAS.delete("tugas_gempa.json"); BERKAS.delete("tugas_cuaca.json");
});

uji("GET /api/instansi/tugas: ?bencana= menyaring, tanpa parameter semuanya, nilai asing 400, karhutla tetap tanpa catatan", async () => {
  const a = await akun("pemprovkalteng");
  await U.DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES ('kkkkkkkkkkkkkkkk', '62', 'Seruyan', 'X', -2.9, 111.5, 3, ?, ?)").bind(Date.now(), Date.now()).run();
  const baca = q => U.api("GET", "/api/instansi/tugas" + q, undefined, a);
  const semua = await baca(""); assert.equal(semua.s, 200, semua.t); assert.equal(semua.j.tugas.length, 3);
  const banjir = await baca("?bencana=banjir"); assert.equal(banjir.j.tugas.length, 2); assert.ok(banjir.j.tugas.every(t => t.bencana === "banjir" && t.bencana_nama === "Banjir"));
  const api = await baca("?bencana=karhutla"); assert.deepEqual(api.j.tugas.map(t => t.id), ["kkkkkkkkkkkkkkkk"]); assert.equal(api.j.tugas[0].bencana, "karhutla");
  assert.deepEqual((await baca("?bencana=gempa")).j.tugas, []);
  assert.equal((await baca("?bencana=tsunami")).s, 400);
  assert.equal((await U.api("GET", "/api/instansi/tugas?bencana=banjir")).s, 401, "tanpa sesi tetap ditolak");
  await U.DB.prepare("DELETE FROM tugas_api WHERE id = 'kkkkkkkkkkkkkkkk'").run();
});

uji("selesai banjir: id hilang dua versi berturut-turut menutup tugas; yang masih ada bertahan; id sama = tugas sama walau pindah", async () => {
  const A = K(-2.5, 112, {id: "B0001"}), Bb = K(-2.2, 112.4, {id: "B0002", level: 2});
  berkas("banjir", T0 + 10 * MENIT, [{...Bb, lat: -2.21, lon: 112.9}]);   // A hilang; B pindah > 2 km tetap tugas yang sama (kunci id)
  let h = await tugasBaruDariBerkas(env, T0 + 11 * MENIT); assert.deepEqual(h.bencana.banjir, {baru: 0, digabung: 1});
  let B = await baris("banjir"); assert.equal(B.length, 2);
  assert.deepEqual(B.map(t => [t.status, t.reda]).sort(), [["buka", 0], ["buka", 1]]);
  berkas("banjir", T0 + 20 * MENIT, [Bb]);
  h = await tugasBaruDariBerkas(env, T0 + 21 * MENIT); assert.equal(h.bencana.banjir.ditutup, 1);
  B = await baris("banjir"); const a = B.find(t => t.status === "padam"), b = B.find(t => t.status === "buka");
  assert.equal(a.padam_verif, "padam_dilaporkan", "reda menunggu verifikasi, bukan langsung terverifikasi"); assert.ok(a.padam_pada > 0 && a.verif_pada > 0); assert.equal(b.reda, 0);
  /* berkas kosong yang menyatakan lengkap: true tetap dinilai: B hilang dua versi */
  berkas("banjir", T0 + 30 * MENIT, [], {lengkap: true}); await tugasBaruDariBerkas(env, T0 + 31 * MENIT);
  assert.equal((await baris("banjir")).find(t => t.id === b.id).reda, 1);
  berkas("banjir", T0 + 40 * MENIT, [K(-1, 105, {id: "B0003"})]); h = await tugasBaruDariBerkas(env, T0 + 41 * MENIT);
  assert.equal(h.bencana.banjir.ditutup, 1); assert.equal(h.bencana.banjir.baru, 1);
  assert.equal((await baris("banjir")).find(t => t.id === b.id).status, "padam");
  assert.equal((await baris("banjir")).filter(t => t.status === "buka").length, 1, "B0003 baru tidak ikut dinilai putaran pembuatannya");
  /* butir yang sudah normal tidak membuat tugas baru */
  berkas("banjir", T0 + 50 * MENIT, [K(-0.5, 111, {id: "B0004", status: "normal"})]); await tugasBaruDariBerkas(env, T0 + 51 * MENIT);
  assert.equal((await baris("banjir")).filter(t => t.lat === -0.5).length, 0);
});

uji("selesai gunungapi: level turun ke II menutup dalam satu versi; gempa tanpa penutupan otomatis", async () => {
  await bersih();
  berkas("gunungapi", T0 - MENIT, [K(-7.5, 110.4, {id: "V0001", prov: "33", kab: "Magelang", level: 3, kartu: {level: 3, radius_krb_km: 5}})]);
  await tugasBaruDariBerkas(env, T0); assert.equal((await baris("gunungapi")).length, 1);
  berkas("gunungapi", T0 + 9 * MENIT, [K(-7.5, 110.4, {id: "V0001", prov: "33", kab: "Magelang", level: 3, kartu: {level: 2}})]);
  const h = await tugasBaruDariBerkas(env, T0 + 10 * MENIT); assert.equal(h.bencana.gunungapi.ditutup, 1);
  assert.equal((await baris("gunungapi"))[0].status, "padam");
  berkas("gempa", T0 + 19 * MENIT, [K(-8, 116, {id: "G0001", prov: "52", kab: "Lombok Utara", level: 3, kartu: {mag: 6.1}})]);
  await tugasBaruDariBerkas(env, T0 + 20 * MENIT); assert.equal((await baris("gempa")).length, 1);
  berkas("gempa", T0 + 29 * MENIT, [], {lengkap: true}); await tugasBaruDariBerkas(env, T0 + 30 * MENIT);
  assert.equal((await baris("gempa"))[0].status, "buka", "gempa: hanya laporan regu yang menutup");
  assert.deepEqual(await selesai.gempa(env, T0), {lewat: "tanpa penutupan otomatis; hanya laporan regu"});
  assert.equal(typeof selesai.karhutla, "function");
});

uji("selesai cuaca dan kekeringan memakai aturannya sendiri (CAP berakhir = satu versi; kekeringan butuh dua)", async () => {
  await bersih();
  berkas("cuaca", T0 - MENIT, [K(-6.9, 107.6, {id: "C0001", prov: "32", kab: "Bandung", level: 2, kartu: {jenis_peringatan: "hujan lebat"}})]);
  berkas("kekeringan", T0 - MENIT, [K(-8.6, 116.1, {id: "D0001", prov: "52", kab: "Lombok Timur", level: 3})]);
  await tugasBaruDariBerkas(env, T0);
  berkas("cuaca", T0 + 9 * MENIT, [], {lengkap: true}); berkas("kekeringan", T0 + 9 * MENIT, [K(-8.6, 116.1, {id: "D0001", prov: "52", kab: "Lombok Timur", level: 2, status: "Normal"})]);
  const h = await tugasBaruDariBerkas(env, T0 + 10 * MENIT);
  assert.equal(h.bencana.cuaca.ditutup, 1); assert.equal(h.bencana.kekeringan.ditutup ?? 0, 0);
  assert.equal((await baris("kekeringan"))[0].reda, 1);
  berkas("kekeringan", T0 + 19 * MENIT, [K(-8.6, 116.1, {id: "D0001", prov: "52", kab: "Lombok Timur", level: 2, status: "Normal"})]);
  assert.equal((await tugasBaruDariBerkas(env, T0 + 20 * MENIT)).bencana.kekeringan.ditutup, 1);
});

uji("jalur karhutla tak berubah: tidak menelan tugas bahaya lain, verifikasi satelit mengabaikan tugas bahaya lain", async () => {
  await bersih();
  berkas("banjir", T0 - MENIT, [K(-2.5, 112, {id: "B0009", level: 3})]); await tugasBaruDariBerkas(env, T0);
  BERKAS.set("tugas_kompleks.json", {dibuat: new Date(T0 + 9 * MENIT).toISOString(), kompleks: [K(-2.5, 112.001, {luas: 30})]});
  const h = await tugasBaruDariBerkas(env, T0 + 10 * MENIT);
  assert.equal(h.baru, 1, "api di titik yang sama dengan banjir = tugas sendiri"); assert.equal(h.digabung, 0);
  assert.equal(await U.n("tugas_api"), 2); assert.equal(await U.n("tugas_bencana"), 1, "karhutla tanpa baris");
  assert.equal(await U.n("tugas_luas_awal"), 1, "luas awal hanya karhutla");
  /* karhutla berikutnya bergabung ke tugas karhutla, bukan banjir */
  BERKAS.set("tugas_kompleks.json", {dibuat: new Date(T0 + 19 * MENIT).toISOString(), kompleks: [K(-2.5, 112.002, {luas: 31})]});
  assert.deepEqual(await tugasBaruDariBerkas(env, T0 + 20 * MENIT), {baru: 0, digabung: 1});
  /* verifikasiPadam: tugas banjir yang dilaporkan padam tidak diperiksa terhadap titik panas */
  const id = (await baris("banjir"))[0].id;
  await U.DB.prepare("UPDATE tugas_api SET status = 'padam', padam_verif = 'padam_dilaporkan', padam_pada = ? WHERE id = ?").bind(T0 - 60 * JAM, id).run();
  await U.DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(T0, JSON.stringify({acuan: new Date(T0 - JAM).toISOString(), baris: [[-2.5, 112, 0]]})).run().catch(() => {});
  assert.deepEqual(await verifikasiPadam(env, T0), {periksa: 0, muncul: 0, terverifikasi: 0});
  assert.equal((await U.DB.prepare("SELECT padam_verif FROM tugas_api WHERE id = ?").bind(id).first()).padam_verif, "padam_dilaporkan");
});

uji("ringkasan push dan kabar: kata per bahaya; karhutla saja = kalimat lama", async () => {
  const a = {id: "x", tingkat: "kab", prov: "62", kab: "Seruyan", wilayah: "Seruyan", cakupan: '["62"]'}, t = (id, b) => ({id, prov: "62", kab: "Seruyan", status: "buka", dibuat: T0, konfirmasi_pada: null, isian_terakhir: null, padam_verif: null, ...(b ? {bencana: b} : {})});
  const D = tugas => ({tugas, cek: [], muncul: []});
  const lama = ringkasAkun(a, D([t("a"), t("b")]), T0 - JAM, T0 + MENIT);
  assert.equal(lama.judul, "2 api baru di Kab. Seruyan");
  const baru = ringkasAkun(a, D([t("a"), t("b", "banjir"), t("c", "banjir")]), T0 - JAM, T0 + MENIT);
  assert.equal(baru.judul, "3 tugas baru di Kab. Seruyan"); assert.match(baru.isi, /2 banjir baru/); assert.match(baru.isi, /1 karhutla baru/);
});

uji("tabel 0047 belum diterapkan: karhutla dan daftar tugas jalan seperti dulu, bahaya lain tidak dibuat (bukan galat)", async () => {
  await bersih(); await U.DB.prepare("DROP INDEX tugas_bencana_jenis").run(); await U.DB.prepare("ALTER TABLE tugas_bencana RENAME TO tugas_bencana_x").run();
  try {
    const a = await akun("pemprovkalteng2");
    berkas("banjir", T0 + 59 * MENIT, [K(-2.5, 112, {id: "B0010"})]);
    BERKAS.set("tugas_kompleks.json", {dibuat: new Date(T0 + 59 * MENIT).toISOString(), kompleks: [K(-2.9, 111.5, {luas: 10})]});
    const h = await tugasBaruDariBerkas(env, T0 + 60 * MENIT);
    assert.equal(h.baru, 1, "karhutla tetap dibuat"); assert.equal(h.bencana.banjir.lewat, "migrasi 0047 belum diterapkan");
    assert.equal(await U.n("tugas_api"), 1);
    const semua = await U.api("GET", "/api/instansi/tugas", undefined, a); assert.equal(semua.s, 200, semua.t); assert.equal(semua.j.tugas.length, 1); assert.equal(semua.j.tugas[0].bencana, "karhutla");
    assert.equal((await U.api("GET", "/api/instansi/tugas?bencana=karhutla", undefined, a)).j.tugas.length, 1);
    assert.deepEqual((await U.api("GET", "/api/instansi/tugas?bencana=banjir", undefined, a)).j.tugas, []);
    assert.equal((await verifikasiPadam(env, T0)).periksa, 0);
  } finally {
    await U.DB.prepare("ALTER TABLE tugas_bencana_x RENAME TO tugas_bencana").run(); await U.DB.prepare("CREATE INDEX IF NOT EXISTS tugas_bencana_jenis ON tugas_bencana (bencana)").run();
  }
});

/* ---- pagar keselamatan (review keamanan): berkas rusak/kosong tidak boleh menutup tugas se-Indonesia ---- */
const semai = async (b, n, waktu) => { await bersih(); berkas(b, waktu, Array.from({length: n}, (_, i) => K(-2 - i * 0.5, 112, {id: "C" + String(1000 + i), level: 2}))); await tugasBaruDariBerkas(env, waktu + MENIT); };
const bukaN = b => baris(b).then(r => r.filter(t => t.status === "buka").length);

uji("pagar: berkas kosong tanpa lengkap:true tidak menutup apa pun; dengan lengkap:true cuaca menutup", async () => {
  await semai("cuaca", 2, T0 + 100 * MENIT);
  berkas("cuaca", T0 + 110 * MENIT, []); let h = await tugasBaruDariBerkas(env, T0 + 111 * MENIT);
  assert.equal(h.bencana?.cuaca?.ditutup ?? 0, 0); assert.equal(await bukaN("cuaca"), 2);
  assert.ok((await baris("cuaca")).every(t => t.reda === 0), "tidak ikut dihitung reda");
  berkas("cuaca", T0 + 120 * MENIT, [], {lengkap: true}); h = await tugasBaruDariBerkas(env, T0 + 121 * MENIT);
  assert.equal(h.bencana.cuaca.ditutup, 2); assert.equal(await bukaN("cuaca"), 0);
});

uji("pagar: berkas terpotong (> 600) atau berisi butir tak sah tidak menutup apa pun", async () => {
  await semai("cuaca", 2, T0 + 130 * MENIT);
  berkas("cuaca", T0 + 140 * MENIT, [K(-2, 112, {id: "C1000", level: 2}), {lat: "bukan angka", prov: "62"}]);   // satu butir ditolak kompleksSah
  await tugasBaruDariBerkas(env, T0 + 141 * MENIT); assert.equal(await bukaN("cuaca"), 2, "butir tak sah: berkas dianggap tak utuh");
  berkas("cuaca", T0 + 150 * MENIT, Array.from({length: 601}, (_, i) => K(-10 + (i % 10) * 0.1, 100 + i * 0.01, {id: "C" + (2000 + i), level: 2, kab: "Kab" + i})));
  await tugasBaruDariBerkas(env, T0 + 151 * MENIT);
  assert.ok((await baris("cuaca")).filter(t => t.status === "padam").length === 0, "terpotong 600: tak ada yang ditutup");
});

uji("pagar: lebih dari separuh tugas (>= 5 buka) tertutup sekaligus dibatalkan; di bawah separuh jalan; padam_dilaporkan jadi terverifikasi 48 jam kemudian", async () => {
  await semai("cuaca", 6, T0 + 160 * MENIT);
  const sisa = Array.from({length: 2}, (_, i) => K(-2 - i * 0.5, 112, {id: "C" + (1000 + i), level: 2}));   // 4 dari 6 hilang
  berkas("cuaca", T0 + 170 * MENIT, sisa); let h = await tugasBaruDariBerkas(env, T0 + 171 * MENIT);
  assert.equal(h.bencana?.cuaca?.ditutup ?? 0, 0); assert.equal(await bukaN("cuaca"), 6, "pagar: 4 dari 6");
  berkas("cuaca", T0 + 180 * MENIT, [...sisa, ...Array.from({length: 3}, (_, i) => K(-3 - i * 0.5, 112, {id: "C" + (1002 + i), level: 2}))]);   // tinggal 1 yang hilang (C1005)
  h = await tugasBaruDariBerkas(env, T0 + 181 * MENIT);
  assert.equal(h.bencana.cuaca.ditutup, 1); assert.equal(await bukaN("cuaca"), 5);
  const t = (await baris("cuaca")).find(x => x.status === "padam"); assert.equal(t.padam_verif, "padam_dilaporkan");
  berkas("cuaca", T0 + 49 * JAM, [...sisa, ...Array.from({length: 3}, (_, i) => K(-3 - i * 0.5, 112, {id: "C" + (1002 + i), level: 2}))]);
  h = await tugasBaruDariBerkas(env, T0 + 49 * JAM + MENIT); assert.equal(h.bencana?.cuaca?.terverifikasi ?? 0, 0, "kurang dari 48 jam sejak ditutup (T0+181mnt)");
  berkas("cuaca", T0 + 52 * JAM, [...sisa, ...Array.from({length: 3}, (_, i) => K(-3 - i * 0.5, 112, {id: "C" + (1002 + i), level: 2}))]);
  await tugasBaruDariBerkas(env, T0 + 52 * JAM + MENIT);
  assert.equal((await baris("cuaca")).find(x => x.id === t.id).padam_verif, "padam_terverifikasi");
});

uji("kartu: nilai bersarang dan teks panjang dibuang, larik primitif kecil dan angka lolos; kec > 60 huruf tak sampai ke kabar", async () => {
  await bersih();
  berkas("banjir", T0 + 200 * MENIT, [K(-2.5, 112, {id: "B0100", jiwa_terdampak: {a: 1}, hujan_mm: 12.5, nama: "x".repeat(201), tingkat: "Awas", syarat: ["penduduk", {x: 1}], mulai: "2026-10-22", kec: "k".repeat(61)})]);
  await tugasBaruDariBerkas(env, T0 + 201 * MENIT);
  const t = (await baris("banjir"))[0], kartu = JSON.parse((await U.DB.prepare("SELECT kartu FROM tugas_kartu WHERE tugas_id = ?").bind(t.id).first()).kartu);
  assert.deepEqual(kartu, {insiden: "B0100", tingkat: "Awas", mulai: "2026-10-22", hujan_mm: 12.5});
  assert.equal(t.kec, null, "kec > 60 huruf tidak disimpan");
  const {pasKartuBencana} = await import("../../src/tugas_bencana.js");
  assert.deepEqual(JSON.parse(pasKartuBencana("gempa", {mag: 6, syarat: ["a", "b"], dasar: ["x".repeat(300)]})), {mag: 6, syarat: ["a", "b"]});
});

uji("kartu kekeringan dan cuaca: kunci kontrak terbaru (hipotesis, jiwa_kab_terlibat); lengkap:true di antara bencana dan kompleks terbaca", async () => {
  const {pasKartuBencana} = await import("../../src/tugas_bencana.js");
  assert.deepEqual(JSON.parse(pasKartuBencana("kekeringan", {id: "x", spi3: -1.8, hari_tanpa_hujan: 31, jiwa_kab_terlibat: 1000, dasar: "BMKG", hipotesis: true})), {spi3: -1.8, hari_tanpa_hujan: 31, jiwa_kab_terlibat: 1000, dasar: "BMKG", hipotesis: true});
  assert.deepEqual(JSON.parse(pasKartuBencana("cuaca", {kartu: {jenis_peringatan: "hujan lebat", berlaku_hingga: "2026-10-23", jiwa_kab_terlibat: 90}})), {jenis_peringatan: "hujan lebat", berlaku_hingga: "2026-10-23", jiwa_kab_terlibat: 90});
  await bersih();
  BERKAS.set("tugas_cuaca.json", {dibuat: new Date(T0 + 300 * MENIT).toISOString(), bencana: "cuaca", lengkap: true, label: "x", syarat_ambang: {}, kompleks: [K(-6.9, 107.6, {id: "C0900", level: 2})]});
  assert.equal((await tugasBaruDariBerkas(env, T0 + 301 * MENIT)).bencana.cuaca.baru, 1);
  BERKAS.set("tugas_kekeringan.json", {dibuat: new Date(T0 + 302 * MENIT).toISOString(), bencana: "kekeringan", lengkap: true, kompleks: [K(-8.6, 116.1, {id: "D0900", level: 3, otomatis: false, hipotesis: true})]});
  assert.equal((await tugasBaruDariBerkas(env, T0 + 303 * MENIT)).bencana?.kekeringan?.baru ?? 0, 0, "otomatis:false tidak membuat tugas baru");
});
