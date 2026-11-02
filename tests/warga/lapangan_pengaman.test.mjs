/* Modul Lapangan tahap B, pengaman server (temuan pengulas): nonce/absen mundur, luring_lama, sampel_acak (env SAMPEL_TINJAU=1 = pasti), jaringan_beda, wajah_baru,
   peninjau tidak memutus absennya sendiri, wilayah staf every(), WA ganda pada jejak, kunci prototipe, label terverifikasi, ketua membuka foto anggota, tugas dummy.
   Worker utuh di Miniflare + D1 + R2. Karena SAMPEL_TINJAU=1, absen yang selainnya bersih berstatus tinjau/sampel_acak; kasus lolos diuji di lapangan_absen.test.mjs (SAMPEL_TINJAU=0). */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";

const U = await siapkan("uji-lapangan-pengaman", {r2: true, ikat: {SAMPEL_TINJAU: "1"}}), uji = berantai(), DB = U.DB;
const PB = {"x-pb": "1"}, MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, TITIK = {lat: -0.0579, lon: 116.4225};
const K = (kode, h = {}) => ({"x-kode": kode, ...h});
const api = (m, j, b, h = {}) => U.api(m, j, b, {...PB, ...h});
async function kirim(j, data, foto, kode, ekstra = {}) {
  const f = new FormData(); f.append("data", JSON.stringify(data));
  for (const x of [].concat(foto ?? [])) f.append("foto", new File([x], "f.jpg", {type: "image/jpeg"}));
  const {body, headers} = await badanPanjang(f, {...PB, "x-kode": kode, ...ekstra});
  const r = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {method: "POST", headers, body}); const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t};
}
const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi];
let nFoto = 0;
const jpeg = (n = ++nFoto + 5000) => new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...new TextEncoder().encode("JFIF"), 0, 1, 1, 0, 0, 0, 0, 1, 0, 0]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(40).fill(1 + n % 200), 1 + Math.floor(n / 200), 0xff, 0xd9]);
const b64 = a => Buffer.from(new Float32Array(a).buffer).toString("base64");
const D = [1, 0.5, 0.25, -0.3, 0.8, 0.1, -0.6, 0.4, 0.2, -0.1, 0.9, 0.3, -0.4, 0.7, 0.05, -0.2], VEK = b64(D);
const sampel = (t = Date.now()) => [{lat: TITIK.lat + 2e-5, lon: TITIK.lon - 1e-5, akurasi: 18, waktu: t - 2000}, {lat: TITIK.lat - 1e-5, lon: TITIK.lon + 2e-5, akurasi: 16, waktu: t - 1000}, {...TITIK, akurasi: 15, waktu: t}];
let nId = 0; const id16 = () => (0xb000000000000000n + BigInt(++nId)).toString(16);
async function orang(nama, hex, {prov = "62", wa = null, wajah = true, staf_id = null} = {}) {
  const id = id16(), kode = hex.repeat(26).slice(0, 26);
  await DB.prepare("INSERT INTO orang (id, jenis, staf_id, nama, wa, prov, status, kode_sha, wajah_status, wajah_versi, dibuat, diubah, dummy) VALUES (?, 'pegawai', ?, ?, ?, ?, 'aktif', ?, ?, ?, 1, 1, 0)")
    .bind(id, staf_id, nama, wa, prov, sha256(kode), wajah ? "terdaftar" : "belum", wajah ? "uji-1" : null).run();
  if (wajah) await DB.batch(["depan", "kiri", "kanan", "atas", "bawah"].map(a => DB.prepare("INSERT INTO orang_wajah (orang_id, arah, vektor, versi, mutu, dibuat) VALUES (?, ?, ?, 'uji-1', 0.9, 1)").bind(id, a, VEK)));
  return {id, kode, nama};
}
const tugas = async (anggota, {ketua = null, radius = 2000} = {}) => {
  const id = id16(), kini = Date.now();
  await DB.batch([DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, ketua_id, dibuat_oleh, dibuat, dummy) VALUES (?, 'Tugas uji', 'karhutla', ?, ?, ?, ?, ?, ?, 'tes', 1, 0)").bind(id, TITIK.lat, TITIK.lon, radius, kini - JAM, kini + 7 * HARI, ketua),
    ...anggota.map(o => DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, ?)").bind(id, o.id, o.id === ketua ? "ketua" : "anggota"))]);
  return id;
};
const nonce = async (o, jumlah = 1, luring = false) => (await api("POST", "/api/petugas/nonce", {jumlah, luring}, K(o.kode))).j.nonce[0].nonce;
async function absen(o, tid, {nonce: n, data = {}, ekstra, foto = jpeg()} = {}) {
  const t = Date.now();
  return kirim("/api/petugas/absen", {nonce: n ?? await nonce(o), jenis: "masuk", tugas_id: tid, vektor: VEK, versi_model: "uji-1", tantangan_lolos: true, skor_hidup: 0.9, sampel: sampel(), zona: "Asia/Jakarta", waktu_hp: t, luring: false, ...data}, foto, o.kode, ekstra);
}
const baris = (q, ...p) => DB.prepare(q).bind(...p).all().then(r => r.results);

uji("nonce: kedaluwarsa tidak bisa dihidupkan dengan waktu_hp mundur; dibuat sesudah klaim ditolak; nonce daring tidak sah untuk klaim luring", async () => {
  const a = await orang("Alif", "a"), tid = await tugas([a]);
  const n1 = await nonce(a); await DB.prepare("UPDATE lp_nonce SET kedaluwarsa = ? WHERE nonce_sha = ?").bind(Date.now() - 1000, sha256(n1)).run();
  const t = Date.now() - 20 * 60e3;
  /* mundur: klaim luring dengan jam 20 menit lalu; nonce itu dibuat SESUDAH klaim (dibuat > waktu + 5 menit) dan berumur daring */
  const r1 = await absen(a, tid, {nonce: n1, data: {luring: true, waktu_hp: t, sampel: sampel(t)}}); assert.equal(r1.s, 403, r1.t);
  const n2 = await nonce(a); const r2 = await absen(a, tid, {nonce: n2, data: {luring: true, waktu_hp: t, sampel: sampel(t)}}); assert.equal(r2.s, 403, "nonce dibuat setelah waktu klaim: " + r2.t);
  assert.equal(await U.n("lp_nonce", `nonce_sha = '${sha256(n2)}' AND dipakai = 0`), 1, "penolakan tidak membakar nonce");
  const nl = await nonce(a, 1, true), r3 = await absen(a, tid, {nonce: nl, data: {luring: true, waktu_hp: t, sampel: sampel(t)}});
  assert.equal(r3.s, 403, "nonce luring dibuat sesudah klaim (+5 menit): " + r3.t);
  assert.equal(await U.n("lp_absen"), 0);
});

uji("luring_lama, sampel_acak, jaringan_beda: semua masuk tinjau dengan alasannya; jamRelawan tidak membuka sesi dari luring_lama", async () => {
  const b = await orang("Bimo", "b"), tid = await tugas([b]);
  /* luring dengan klaim 3 jam lalu memakai nonce luring yang dibuat 3,5 jam lalu */
  const t = Date.now() - 3 * JAM, nl = await nonce(b, 1, true); await DB.prepare("UPDATE lp_nonce SET dibuat = ?, kedaluwarsa = ? WHERE nonce_sha = ?").bind(t - 10 * MENIT, t - 10 * MENIT + 36 * JAM, sha256(nl)).run();
  const l = await absen(b, tid, {nonce: nl, data: {luring: true, waktu_hp: t, sampel: sampel(t)}}); assert.equal(l.s, 201, l.t);
  assert.equal(l.j.status, "tinjau"); assert.ok(l.j.alasan.includes("luring_lama") && l.j.alasan.includes("luring"), l.t);
  /* sampel_acak: absen bersih + SAMPEL_TINJAU=1 */
  const c = await orang("Citra", "c"), tc = await tugas([c]), s = await absen(c, tc); assert.equal(s.s, 201, s.t);
  assert.equal(s.j.status, "tinjau"); assert.deepEqual(s.j.alasan, ["sampel_acak"]);
  /* jaringan_beda: absen kedua (pulang) dari ip_hash lain dalam 12 jam */
  const p = await absen(c, tc, {data: {jenis: "pulang"}, ekstra: {"cf-connecting-ip": "203.0.113.9"}}); assert.equal(p.s, 201, p.t);
  assert.ok(p.j.alasan.includes("jaringan_beda"), p.t);
  const sama = await orang("Dodi", "d"), td = await tugas([sama]); await absen(sama, td, {ekstra: {"cf-connecting-ip": "203.0.113.5"}});
  const s2 = await absen(sama, td, {data: {jenis: "pulang"}, ekstra: {"cf-connecting-ip": "203.0.113.5"}}); assert.ok(!s2.j.alasan.includes("jaringan_beda"), "IP sama tidak ditandai");
});

uji("wajah_baru: daftar ulang dari terdaftar = 3 absen berikutnya tinjau; pendaftaran pertama bukan", async () => {
  const e = await orang("Eka", "e", {wajah: false}); await api("POST", "/api/petugas/setuju", {versi: (await import("../../src/lapangan_konst.js")).VERSI_SETUJU, setuju: true}, K(e.kode));
  const arah = Object.fromEntries(["depan", "kiri", "kanan", "atas", "bawah"].map(a => [a, VEK]));
  assert.equal((await kirim("/api/petugas/wajah", {versi_model: "uji-1", arah}, jpeg(), e.kode)).s, 200);
  assert.equal(await U.n("lp_wajah_baru", `orang_id = '${e.id}'`), 0, "pendaftaran pertama");
  assert.equal((await kirim("/api/petugas/wajah", {versi_model: "uji-1", arah}, jpeg(), e.kode)).s, 200);
  assert.equal((await DB.prepare("SELECT sisa FROM lp_wajah_baru WHERE orang_id = ?").bind(e.id).first()).sisa, 3);
  const tid = await tugas([e]), r = await absen(e, tid); assert.equal(r.s, 201, r.t); assert.ok(r.j.alasan.includes("wajah_baru"), r.t);
  assert.equal((await DB.prepare("SELECT sisa FROM lp_wajah_baru WHERE orang_id = ?").bind(e.id).first()).sisa, 2);
});

uji("kunci prototipe: kondisi {constructor} dan {__proto__} = 400, bukan 500", async () => {
  const tid = (await baris("SELECT id FROM lp_tugas"))[0].id;
  const hari = new Date(Date.now() + 7 * JAM).toISOString().slice(0, 10);
  for (const k of ['{"constructor": 1}', '{"toString": "x"}', '{"hasOwnProperty": 3}']) {
    const r = await kirim("/api/petugas/logbook", {tugas_id: tid, tanggal: hari, kegiatan: "patroli", kondisi: JSON.parse(k), foto_meta: []}, [], "a".repeat(26));
    assert.equal(r.s, 400, k + r.t); assert.match(r.j.galat, /tidak dikenal/);
  }
});

uji("label terverifikasi: foto di luar radius + 200 m atau tanpa EXIF = 0; dekat + EXIF = 1; tanggal di luar jadwal tugas 409", async () => {
  const g = await orang("Gita", "7"), tid = await tugas([g], {radius: 300}), kini = Date.now(), hari = new Date(kini + 7 * JAM).toISOString().slice(0, 10);
  const L = (meta, kondisi = {kondisi_api: "bara"}, u = {}) => kirim("/api/petugas/logbook", {tugas_id: tid, tanggal: hari, kegiatan: "patroli", kondisi, foto_meta: [meta], ...u}, jpeg(), g.kode);
  const m = (lat, lon, exif = true) => ({lat, lon, akurasi: 10, waktu: kini - 60e3, ...(exif ? {exif_lat: lat, exif_lon: lon} : {})});
  const ver = async () => (await baris("SELECT terverifikasi FROM lapangan_label"))[0].terverifikasi;
  assert.equal((await L(m(TITIK.lat + 0.02, TITIK.lon))).s, 201); assert.equal(await ver(), 0, "2,2 km dari titik, radius 300");
  assert.equal((await L(m(TITIK.lat + 0.0005, TITIK.lon, false))).s, 200); assert.equal(await ver(), 0, "dekat tetapi tanpa EXIF");
  assert.equal((await L(m(TITIK.lat + 0.0005, TITIK.lon))).s, 200); assert.equal(await ver(), 1, "dekat + EXIF cocok");
  assert.equal((await L(m(TITIK.lat + 0.0005, TITIK.lon), {kondisi_api: "bara"}, {kondisi: {kondisi_api: "bara"}})).s, 200);
  await DB.prepare("UPDATE lp_tugas SET mulai = ?, selesai = ? WHERE id = ?").bind(kini + 3 * HARI, kini + 5 * HARI, tid).run();
  const luar = await L(m(TITIK.lat, TITIK.lon)); assert.equal(luar.s, 409, luar.t);
  /* label ikut hilang bersama logbook (trigger) */
  assert.equal(await U.n("lapangan_label"), 1); await DB.prepare("DELETE FROM lp_logbook").run(); assert.equal(await U.n("lapangan_label"), 0, "trigger AFTER DELETE");
});

const STAF = (tok, id, nip, wilayah) => DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
  VALUES (?, ?, ?, ?, 'Unit', ?, ?, '["pimpinan"]', ?, 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, "s" + id.slice(0, 5), "Nama " + id.slice(0, 3), nip, id.slice(0, 3) + "@b.id", "62812000" + nip.slice(0, 4), wilayah),
  DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + JAM)]);
const sesi = tok => ({cookie: "sesi_staf=" + tok, ...PB});

uji("wilayah staf pakai every(): staf Kalbar + anggota Riau = 403; ubah tugas dengan anggota lama di luar wilayah 403; daftar menyembunyikan anggota luar wilayah", async () => {
  await STAF("f".repeat(64), "f1f1f1f1f1f1f1f1", "4100410041004", '["61"]'); const KALBAR = sesi("f".repeat(64));
  const kb = await orang("Kalbar Satu", "k", {prov: "61"}), rs = await orang("Riau Satu", "r", {prov: "14"});
  const T = (b, h) => api("POST", "/api/petugas/panel/tugas", b, h);
  const kini = Date.now(), dasar = {judul: "Tugas lintas", bencana: "karhutla", ...TITIK, mulai: kini, selesai: kini + HARI};
  assert.equal((await T({...dasar, anggota: [kb.id, rs.id], ketua_id: null}, KALBAR)).s, 403, "staf Kalbar + anggota Riau");
  const ok = await T({...dasar, anggota: [kb.id], ketua_id: null}, KALBAR); assert.equal(ok.s, 201, ok.t);
  /* admin menambah anggota Riau; staf Kalbar tidak boleh lagi menyunting dan tidak melihat anggota Riau */
  assert.equal((await T({...dasar, id: ok.j.id, anggota: [kb.id, rs.id], ketua_id: rs.id}, ADMIN)).s, 200);
  assert.equal((await T({...dasar, id: ok.j.id, anggota: [kb.id], ketua_id: null}, KALBAR)).s, 403, "anggota lama di luar wilayah");
  const dk = (await api("GET", "/api/petugas/panel/tugas", undefined, KALBAR)).j.baris.find(x => x.id === ok.j.id);
  assert.deepEqual(dk.anggota.map(x => x.nama), ["Kalbar Satu"]); assert.equal(dk.ketua_id, null, "ketua Riau tidak bocor");
  assert.equal((await api("GET", "/api/petugas/panel/tugas", undefined, ADMIN)).j.baris.find(x => x.id === ok.j.id).anggota.length, 2);
  /* tugas dummy tidak diisi anggota nyata */
  const dum = id16(); await DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat, dummy) VALUES (?, 'Contoh', 'karhutla', ?, ?, 500, ?, ?, 1, 1)").bind(dum, TITIK.lat, TITIK.lon, kini, kini + HARI).run();
  await DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, 'anggota')").bind(dum, kb.id).run();
  const d = await T({...dasar, id: dum, anggota: [kb.id]}, ADMIN); assert.equal(d.s, 400, d.t); assert.match(d.j.galat, /dummy/);
});

uji("peninjau tidak memutus absennya sendiri (403); ketua regu membuka foto anggotanya, anggota lain tidak; acuan hanya untuk absen tinjau", async () => {
  await STAF("9".repeat(64), "a9a9a9a9a9a9a9a9", "4200420042004", "[]"); const P = sesi("9".repeat(64));
  const saya = await orang("Peninjau Orang", "1", {staf_id: "a9a9a9a9a9a9a9a9"}), ketua = await orang("Ketua Regu", "2"), agt = await orang("Anggota Regu", "3"), lain = await orang("Anggota Lain", "4");
  const tid = await tugas([saya, ketua, agt], {ketua: ketua.id}), tl = await tugas([lain]);
  const as = await absen(saya, tid); assert.equal(as.j.status, "tinjau"); const aa = await absen(agt, tid); assert.equal(aa.j.status, "tinjau");
  const putus = (id, h) => api("POST", "/api/petugas/panel/tinjau/" + id, {putus: "sah"}, h);
  const sendiri = await putus(as.j.id, P); assert.equal(sendiri.s, 403, sendiri.t); assert.equal((await baris("SELECT status FROM lp_absen WHERE id = ?", as.j.id))[0].status, "tinjau");
  assert.equal((await putus(aa.j.id, P)).s, 200, "absen orang lain boleh");
  const foto = async (id, kode) => { const r = await U.mf.dispatchFetch("http://bnpb.lokal/api/petugas/foto/" + id, {headers: {"x-kode": kode}}); await r.arrayBuffer(); return r.status; };
  assert.equal(await foto(aa.j.id, ketua.kode), 200, "ketua regu membuka foto anggota");
  assert.equal(await foto(aa.j.id, lain.kode), 404, "anggota tugas lain"); assert.equal(await foto(aa.j.id, saya.kode), 404, "anggota biasa tidak membuka foto sesama");
  /* acuan: ketua tidak punya akses panel/acuan (staf saja); orang tanpa absen tinjau 404, dengan absen tinjau 200 */
  await (await U.mf.getR2Bucket("MEDIA")).put(`lapangan/acuan/${ketua.id}.jpg`, jpeg(), {httpMetadata: {contentType: "image/jpeg"}});
  const ac = async id => { const r = await U.mf.dispatchFetch("http://bnpb.lokal/api/petugas/panel/acuan/" + id, {headers: P}); await r.arrayBuffer(); return r.status; };
  assert.equal(await ac(ketua.id), 404, "ketua belum punya absen tinjau");
  const ak = await absen(ketua, tid); assert.equal(ak.j.status, "tinjau"); assert.equal(await ac(ketua.id), 200);
});

uji("jejak GPS: WA ganda di tabel orang tidak ditautkan; tanpa persetujuan tidak ditautkan", async () => {
  const w1 = await orang("Wati Satu", "5", {wa: "6281299900001"}), tid = await tugas([w1]);
  await DB.batch([DB.prepare("INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, garam, sandi_sha, dibuat) VALUES ('c1c1c1c1c1c1c1c1', 'akunjejak2', 'pemprov', 'prov', 'Kalimantan Tengah', 'kalteng', '[\"62\"]', ?, ?, 1)").bind("g".repeat(32), "a".repeat(64)),
    DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, n24, dibuat, terakhir_terdeteksi) VALUES ('eeeeeeeeeeeeeeee', '62', 'Pulang Pisau', ?, ?, 3, 2, 1, 1)").bind(TITIK.lat, TITIK.lon),
    DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, wa, orang, token_sha, status, dibuat, kedaluwarsa) VALUES ('f0f0f0f0f0f0f0f0', 'eeeeeeeeeeeeeeee', 'c1c1c1c1c1c1c1c1', 'Wati', 'anggota', '6281299900001', 1, ?, 'aktif', 1, ?)").bind("c".repeat(64), Date.now() + HARI)]);
  const t = Date.now(); await DB.batch([0, 1, 2].map(i => DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES ('f0f0f0f0f0f0f0f0', ?, ?, 10, ?)").bind(TITIK.lat + i * 0.001, TITIK.lon, t - (3 - i) * 1000)));
  const ring = async () => (await api("GET", "/api/petugas/panel/ringkas", undefined, ADMIN)).j.jejak.filter(x => x.nama.startsWith("Wati"));
  assert.equal((await ring()).length, 0, "belum menyetujui");
  await DB.prepare("INSERT INTO orang_setuju (id, orang_id, versi_teks, setuju, waktu) VALUES ('s1s1s1s1s1s1s1s1', ?, 'v', 1, ?)").bind(w1.id, Date.now()).run();
  assert.equal((await ring()).length, 1, "satu orang, setuju");
  await orang("Wati Kembar", "6", {wa: "6281299900001"});
  assert.equal((await ring()).length, 0, "WA ganda: tidak ditautkan");
  void tid;
});
