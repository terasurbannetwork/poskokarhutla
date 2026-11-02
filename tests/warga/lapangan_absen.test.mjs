/* Modul Lapangan tahap B (src/lapangan.js + src/lapangan_panel.js, migrasi 0097): daftar wajah, nonce, absen, logbook, riwayat, foto, tugas, ringkas, tinjauan.
   Worker utuh di Miniflare + D1 + R2 sungguhan, tanpa mock. Tiap kelas penolakan punya kasusnya (U-05, U-06, U-08, U-09, U-10, U-11, U-12, U-13, U-15).
   Berantai: satu cerita, urutan penting (hitungan kartu panel dihitung dari tokoh di bawah). */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN, GERBANG, sha256} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";
import {VERSI_SETUJU} from "../../src/lapangan_konst.js";

const U = await siapkan("uji-lapangan-b", {r2: true, ikat: {SAMPEL_TINJAU: "0"}}), uji = berantai(), DB = U.DB;
const PB = {"x-pb": "1"}, MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM;
const K = (kode, h = {}) => ({"x-kode": kode, ...h});
const SEMUA = [];   // semua badan balasan, dipindai di akhir: vektor tidak boleh muncul (U-11)
const api = async (m, j, b, h = {}) => { const r = await U.api(m, j, b, {...PB, ...h}); SEMUA.push(r.t); return r; };
async function kirim(j, data, foto, kode, {cf, tambah = {}} = {}) {
  const f = new FormData();
  if (data !== null) f.append("data", typeof data === "string" ? data : JSON.stringify(data));
  for (const x of foto == null ? [] : [].concat(foto)) f.append("foto", new File([x], "f.jpg", {type: "image/jpeg"}));
  const {body, headers} = await badanPanjang(f, {...PB, ...(kode ? {"x-kode": kode} : {}), ...tambah});
  const r = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {method: "POST", headers, body, ...(cf ? {cf} : {})});
  const t = await r.text(); SEMUA.push(t); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t, h: r.headers};
}
const bucket = () => U.mf.getR2Bucket("MEDIA");
const ada = async k => !!(await (await bucket()).head(k));

/* JPEG minimal sah, tiap n memberi isi (dan sha256) berbeda; PNG untuk kasus bukan JPEG */
const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi];
const huruf = t => [...new TextEncoder().encode(t)];
let nFoto = 0;
const jpeg = (n = ++nFoto) => new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...huruf("JFIF"), 0, 1, 1, 0, 0, 0, 0, 1, 0, 0]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(40).fill(1 + n % 200), 1 + Math.floor(n / 200), 0xff, 0xd9]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);

/* vektor 16 dimensi: depan = D, arah lain D + derau kecil (kosinus ~1); BEDA = kebalikan (kosinus -1) */
const b64 = a => Buffer.from(new Float32Array(a).buffer).toString("base64");
const D = [1, 0.5, 0.25, -0.3, 0.8, 0.1, -0.6, 0.4, 0.2, -0.1, 0.9, 0.3, -0.4, 0.7, 0.05, -0.2];
const derau = s => D.map((x, i) => x + 0.03 * Math.sin(s * (i + 1)));
const V = {depan: b64(D), kiri: b64(derau(1)), kanan: b64(derau(2)), atas: b64(derau(3)), bawah: b64(derau(4))};
const BEDA = b64(D.map(x => -x));
const TITIK = {lat: -0.0579, lon: 116.4225};
const sampel = (lat = TITIK.lat, lon = TITIK.lon, t = Date.now()) => [{lat: lat + 2e-5, lon: lon - 1e-5, akurasi: 18, waktu: t - 2000}, {lat: lat - 1e-5, lon: lon + 2e-5, akurasi: 16, waktu: t - 1000}, {lat, lon, akurasi: 15, waktu: t}];

let nId = 0;
const id16 = () => (0xa000000000000000n + BigInt(++nId)).toString(16);
async function buatOrang(nama, hex, {wajah = false, wa = null} = {}) {
  const id = id16(), kode = hex.repeat(26).slice(0, 26);
  await DB.prepare("INSERT INTO orang (id, jenis, nama, wa, prov, status, kode_sha, wajah_status, wajah_versi, dibuat, diubah, dummy) VALUES (?, 'pegawai', ?, ?, '62', 'aktif', ?, ?, ?, 1, 1, 0)")
    .bind(id, nama, wa, sha256(kode), wajah ? "terdaftar" : "belum", wajah ? "uji-1" : null).run();
  if (wajah) await DB.batch(Object.entries(V).map(([a, v]) => DB.prepare("INSERT INTO orang_wajah (orang_id, arah, vektor, versi, mutu, dibuat) VALUES (?, ?, ?, 'uji-1', 0.9, 1)").bind(id, a, v)));
  return {id, kode, nama};
}
const nonce = async (kode, jumlah = 1) => (await api("POST", "/api/petugas/nonce", {jumlah}, K(kode))).j.nonce;
let TUGAS;
async function absen(o, p = {}) {
  const n = "nonce" in p ? p.nonce : (await nonce(o.kode))[0].nonce;
  const data = {nonce: n, jenis: p.jenis ?? "masuk", tugas_id: TUGAS, vektor: V.depan, versi_model: "uji-1", tantangan_lolos: true, skor_hidup: 0.9, sampel: sampel(p.lat, p.lon), zona: "Asia/Jakarta", waktu_hp: Date.now(), luring: false, ...p.data};
  return kirim("/api/petugas/absen", data, "foto" in p ? p.foto : jpeg(), o.kode, p);
}
const baris = (tabel, w) => DB.prepare(`SELECT * FROM ${tabel} WHERE ${w}`).all().then(r => r.results);

/* ---- tokoh ---- */
let BUDI, UJIAN, CICI, DONI, ERNA, DEWI, FITRI, RELA, LUAR, RID;
const STAF = (peran, tok, id, nip, wilayah = "[]") => DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
  VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, ?, 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, "staf" + id.slice(0, 3), "Nama " + id.slice(0, 3), nip, id.slice(0, 3) + "@b.id", "62812000" + id.slice(0, 3).replace(/\D/g, "7"), peran, wilayah),
  DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + JAM)]);
const TOK_P = "c".repeat(64), TOK_V = "b".repeat(64), TOK_W = "d".repeat(64);
await STAF('["pimpinan"]', TOK_P, "e1e1e1e1e1e1e1e1", "3100310031003");
await STAF('["verifikator"]', TOK_V, "e2e2e2e2e2e2e2e2", "3200320032003");
await STAF('["pimpinan"]', TOK_W, "e3e3e3e3e3e3e3e3", "3300330033003", '["99"]');
const sesi = tok => ({cookie: "sesi_staf=" + tok, ...PB});
const PIMPINAN = sesi(TOK_P), VERIF = sesi(TOK_V), WIL99 = sesi(TOK_W);
const A = (m, j, b, h = ADMIN) => api(m, j, b, h);

uji("setup: orang, persetujuan, daftar wajah (U-08, U-15): ditolak tanpa persetujuan, vektor arah salah menyebut arahnya, bukan JPEG, dimensi beda", async () => {
  BUDI = await buatOrang("Budi Lapangan", "1", {wa: "6281234500001"});
  const sp = (kode, b) => api("POST", "/api/petugas/setuju", b, K(kode));
  const w = (data, foto, kode = BUDI.kode, ekstra) => kirim("/api/petugas/wajah", data, foto, kode, ekstra);
  const DATA = {versi_model: "uji-1", arah: V, mutu: {depan: 0.9, kiri: 0.8}};
  assert.equal((await w(DATA, jpeg(), null)).s, 401, "tanpa kode");
  assert.equal((await w(DATA, jpeg(), "0".repeat(26))).s, 401, "kode salah");
  assert.equal((await w(DATA, jpeg())).s, 403, "persetujuan wajib");
  assert.equal((await sp(BUDI.kode, {versi: VERSI_SETUJU, setuju: true})).s, 200);
  assert.equal((await api("POST", "/api/petugas/wajah", DATA, K(BUDI.kode))).s, 400, "bukan multipart");
  const tk = await w({...DATA, arah: {...V, kiri: BEDA}}, jpeg()); assert.equal(tk.s, 422, tk.t); assert.deepEqual(tk.j.arah, ["kiri"]);
  const dua = await w({...DATA, arah: {...V, kanan: BEDA, bawah: BEDA}}, jpeg()); assert.deepEqual(dua.j.arah, ["kanan", "bawah"]);
  assert.equal((await w({...DATA, arah: {...V, atas: b64([...D, 0.1])}}, jpeg())).s, 422, "dimensi berbeda");
  assert.equal((await w({...DATA, arah: {...V, atas: "bukan base64!"}}, jpeg())).s, 422);
  assert.equal((await w({...DATA, arah: {depan: V.depan}}, jpeg())).s, 400, "lima arah wajib");
  assert.equal((await w({...DATA, versi_model: ""}, jpeg())).s, 400);
  assert.equal((await w({...DATA, mutu: {depan: 2}}, jpeg())).s, 400);
  assert.equal((await w(DATA, PNG)).s, 400, "bukan JPEG"); assert.equal((await w(DATA, null)).s, 400, "tanpa foto");
  assert.equal(await U.n("orang_wajah", `orang_id = '${BUDI.id}'`), 0, "semua penolakan tidak menulis apa pun");
  assert.equal(await ada(`lapangan/acuan/${BUDI.id}.jpg`), false);
  const ok = await w(DATA, jpeg()); assert.equal(ok.s, 200, ok.t); assert.deepEqual(ok.j, {ok: true, wajah_status: "terdaftar"});
  assert.equal(await U.n("orang_wajah", `orang_id = '${BUDI.id}'`), 5); assert.equal(await ada(`lapangan/acuan/${BUDI.id}.jpg`), true);
  const o = await DB.prepare("SELECT wajah_status, wajah_versi FROM orang WHERE id = ?").bind(BUDI.id).first(); assert.deepEqual({...o}, {wajah_status: "terdaftar", wajah_versi: "uji-1"});
  assert.equal((await api("GET", "/api/petugas/saya", undefined, K(BUDI.kode))).j.orang.wajah_status, "terdaftar");
});

uji("hapus wajah (U-15): vektor dan foto acuan R2 hilang, status dihapus; daftar ulang bisa; pencabutan persetujuan juga menghapus R2", async () => {
  assert.equal((await U.api("DELETE", "/api/petugas/wajah", undefined, K(BUDI.kode))).s, 403, "tanpa x-pb");
  assert.equal((await api("DELETE", "/api/petugas/wajah", undefined, {})).s, 401);
  const h = await api("DELETE", "/api/petugas/wajah", undefined, K(BUDI.kode)); assert.deepEqual(h.j, {ok: true, wajah_status: "dihapus"});
  assert.equal(await U.n("orang_wajah", `orang_id = '${BUDI.id}'`), 0); assert.equal(await ada(`lapangan/acuan/${BUDI.id}.jpg`), false, "foto acuan R2 terhapus");
  assert.equal((await api("DELETE", "/api/petugas/wajah", undefined, K(BUDI.kode))).j.wajah_status, "dihapus", "ulang aman");
  const ok = await kirim("/api/petugas/wajah", {versi_model: "uji-1", arah: V}, jpeg(), BUDI.kode); assert.equal(ok.s, 200, ok.t);
  assert.equal(await ada(`lapangan/acuan/${BUDI.id}.jpg`), true);
  const cabut = await api("POST", "/api/petugas/setuju", {versi: VERSI_SETUJU, setuju: false}, K(BUDI.kode)); assert.equal(cabut.s, 200);
  assert.equal(await ada(`lapangan/acuan/${BUDI.id}.jpg`), false, "cabut persetujuan menghapus R2");
  assert.equal(await U.n("orang_wajah", `orang_id = '${BUDI.id}'`), 0);
  assert.equal((await api("POST", "/api/petugas/setuju", {versi: VERSI_SETUJU, setuju: true}, K(BUDI.kode))).s, 200);
  assert.equal((await kirim("/api/petugas/wajah", {versi_model: "uji-1", arah: V}, jpeg(), BUDI.kode)).s, 200, "daftar ulang sesudah cabut");
  assert.equal((await DB.prepare("SELECT sisa FROM lp_wajah_baru WHERE orang_id = ?").bind(BUDI.id).first()).sisa, 3, "daftar ulang = 3 absen ditinjau");
  await DB.prepare("DELETE FROM lp_wajah_baru WHERE orang_id = ?").bind(BUDI.id).run();   // cerita berikutnya memakai BUDI sebagai orang biasa; wajah_baru diuji di lapangan_pengaman.test.mjs
});

uji("tugas panel: validasi 400, hanya panel + x-pb, anggota dan ketua; wilayah staf; ubah menggantikan anggota; daftar tanpa wa", async () => {
  UJIAN = await buatOrang("Ujian Penolakan", "2", {wajah: true});
  CICI = await buatOrang("Cici Wajah Beda", "3", {wajah: true}); DONI = await buatOrang("Doni GPS Diam", "4", {wajah: true});
  ERNA = await buatOrang("Erna Luar Radius", "5", {wajah: true}); DEWI = await buatOrang("Dewi Tanpa Wajah", "6");
  FITRI = await buatOrang("Fitri Luring", "7", {wajah: true}); LUAR = await buatOrang("Luar Regu", "8", {wajah: true});
  /* relawan sungguhan: daftar, verifikasi, penugasan diterima */
  const form = {nama: "Rela Wan", wa: "081277700099", email: "rela@contoh.id", prov: "62", kab: "Pulang Pisau", jalur: "umum", keahlian: ["medis"], hari_per_minggu: 3, maks_hari: 30, luar_provinsi: false, gol_darah: "O+", darurat_nama: "Ibu", darurat_wa: "081388800009", setuju: true};
  const d = await U.api("POST", "/api/relawan/daftar", form, {"cf-connecting-ip": "10.9.0.1"}); assert.equal(d.s, 201, d.t);
  RID = (await DB.prepare("SELECT id FROM relawan WHERE nama = 'Rela Wan'").first()).id;
  assert.equal((await U.adm("POST", `/api/relawan/admin/relawan/${RID}`, {aksi: "verifikasi"})).s, 200);
  const pm = await U.adm("POST", "/api/relawan/admin/permintaan", {judul: "Pos uji lapangan", bencana: "karhutla", prov: "62", kab: "Pulang Pisau", butuh: [{keahlian: "medis", jumlah: 2}], mulai: new Date(Date.now() + 7 * JAM).toISOString().slice(0, 10), selesai: new Date(Date.now() + 7 * JAM + 20 * HARI).toISOString().slice(0, 10)}); assert.equal(pm.s, 201, pm.t);
  await DB.prepare("INSERT INTO relawan_penugasan (id, permintaan_id, relawan_id, status, dibuat, diubah) VALUES (?, ?, ?, 'diterima', 1, 1)").bind(id16(), pm.j.id, RID).run();
  RELA = {kode: d.j.kode, nama: "Rela Wan"}; RELA.id = (await api("GET", "/api/petugas/saya", undefined, K(RELA.kode))).j.orang.id;
  await DB.batch([...Object.entries(V).map(([a, v]) => DB.prepare("INSERT INTO orang_wajah (orang_id, arah, vektor, versi, mutu, dibuat) VALUES (?, ?, ?, 'uji-1', 0.9, 1)").bind(RELA.id, a, v)), DB.prepare("UPDATE orang SET wajah_status = 'terdaftar', wajah_versi = 'uji-1' WHERE id = ?").bind(RELA.id)]);

  const kini = Date.now(), anggota = [BUDI, UJIAN, CICI, DONI, ERNA, DEWI, FITRI, RELA].map(x => x.id);
  const SAH = {judul: "Patroli uji Kenohan", bencana: "karhutla", ...TITIK, radius_m: 2000, wilayah_teks: "Kec. Kenohan", renlap_url: "https://centurisk97.id/renlap/uji", mulai: kini - JAM, selesai: kini + 7 * HARI, anggota, ketua_id: BUDI.id};
  const T = (b, h = ADMIN) => A("POST", "/api/petugas/panel/tugas", b, h);
  for (const [h, s] of [[{}, 403], [VERIF, 403], [K(BUDI.kode, PB), 403], [{"x-admin-token": "gerbang@x:sandi"}, 403]]) assert.equal((await api("POST", "/api/petugas/panel/tugas", SAH, h)).s, s, JSON.stringify(h));
  assert.equal((await U.api("POST", "/api/petugas/panel/tugas", SAH, ADMIN)).s, 403, "tanpa x-pb");
  for (const [u, pola] of [[{judul: "x"}, /judul/], [{bencana: "Banjir!"}, /bencana/], [{lat: 20}, /titik/], [{radius_m: 10}, /radius/], [{mulai: kini, selesai: kini - 1}, /selesai/], [{selesai: kini + 100 * HARI}, /90 hari/],
    [{renlap_url: "http://x.id/a"}, /https/], [{renlap_url: "javascript:alert(1)"}, /https/], [{anggota: "x"}, /anggota/], [{anggota: [BUDI.id, BUDI.id]}, /duplikat/], [{ketua_id: LUAR.id}, /ketua/], [{anggota: ["0".repeat(16)], ketua_id: null}, /tidak ditemukan/]]) {
    const r = await T({...SAH, ...u}); assert.equal(r.s, 400, JSON.stringify(u) + r.t); assert.match(r.j.galat, pola, JSON.stringify(u));
  }
  assert.equal(await U.n("lp_tugas"), 0, "penolakan tidak menulis");
  assert.equal((await T(SAH, WIL99)).s, 403, "anggota di luar wilayah staf");
  const ok = await T(SAH); assert.equal(ok.s, 201, ok.t); TUGAS = ok.j.id; assert.match(TUGAS, /^[0-9a-f]{16}$/);
  assert.equal(await U.n("lp_anggota", `tugas_id = '${TUGAS}'`), 8); assert.equal(await U.n("lp_anggota", `tugas_id = '${TUGAS}' AND peran = 'ketua' AND orang_id = '${BUDI.id}'`), 1);
  assert.equal((await T({...SAH, id: "0".repeat(16)})).s, 404, "ubah tugas yang tidak ada");
  assert.equal((await T({...SAH, id: TUGAS}, WIL99)).s, 403, "anggota tugas di luar wilayah staf");
  const g = await api("GET", "/api/petugas/panel/tugas?aktif=1", undefined, PIMPINAN); assert.equal(g.s, 200);
  assert.equal(g.j.baris.length, 1); assert.equal(g.j.baris[0].anggota.length, 8); assert.ok(!/kode_sha|vektor|"wa"/.test(g.t), "daftar tugas tanpa wa/kode");
  assert.equal((await api("GET", "/api/petugas/panel/tugas", undefined, WIL99)).j.baris.length, 0, "staf wilayah 99 tidak melihat");
  for (const h of [{}, VERIF, K(BUDI.kode)]) assert.equal((await api("GET", "/api/petugas/panel/tugas", undefined, h)).s, 403);
  /* bentuk untuk klien: anggota [{id, nama}], hadir/logbook/temuan; radius_m opsional (bawaan 2000 m) */
  const b0 = g.j.baris[0]; assert.ok(b0.anggota.every(x => /^[0-9a-f]{16}$/.test(x.id) && x.nama)); assert.deepEqual([typeof b0.hadir, typeof b0.logbook, "temuan" in b0], ["number", "number", true]);
  for (const k of ["id", "judul", "bencana", "wilayah_teks", "lat", "lon", "radius_m", "mulai", "selesai"]) assert.ok(k in b0, k);
  assert.equal((await T({...SAH, id: TUGAS, radius_m: 777})).s, 200); assert.equal((await baris("lp_tugas", `id = '${TUGAS}'`))[0].radius_m, 777);
  const { radius_m: _r, ...tanpaRadius } = SAH; assert.equal((await T({...tanpaRadius, id: TUGAS})).s, 200); assert.equal((await baris("lp_tugas", `id = '${TUGAS}'`))[0].radius_m, 2000, "bawaan dari konstanta");
  /* ubah: judul berganti, LUAR masuk, UJIAN tetap; lalu kembalikan */
  const ub = await T({...SAH, id: TUGAS, judul: "Patroli uji (revisi)", anggota: [...anggota, LUAR.id]}); assert.equal(ub.s, 200, ub.t); assert.equal(ub.j.id, TUGAS);
  assert.equal(await U.n("lp_anggota", `tugas_id = '${TUGAS}'`), 9);
  const kembali = await T({...SAH, id: TUGAS, judul: "Patroli uji Kenohan"}); assert.equal(kembali.s, 200); assert.equal(await U.n("lp_anggota", `tugas_id = '${TUGAS}'`), 8, "LUAR keluar lagi");
  assert.equal(await U.n("lp_tugas"), 1);
  const s = await api("GET", "/api/petugas/saya", undefined, K(BUDI.kode));
  assert.equal(s.j.tugas.length, 1); assert.deepEqual(Object.keys(s.j.tugas[0]).sort(), ["bencana", "id", "judul", "lat", "lon", "mulai", "radius_m", "renlap_url", "selesai", "wilayah_teks"]);
  assert.equal((await api("GET", "/api/petugas/saya", undefined, K(LUAR.kode))).j.tugas.length, 0, "bukan anggota");
});

uji("nonce: butuh kode dan x-pb, jumlah 1 atau 6, berumur 5 menit / 36 jam, tantangan dari daftar, hanya sha256 di D1", async () => {
  assert.equal((await api("POST", "/api/petugas/nonce", {jumlah: 1}, {})).s, 401);
  assert.equal((await U.api("POST", "/api/petugas/nonce", {jumlah: 1}, K(BUDI.kode))).s, 403, "tanpa x-pb");
  for (const j of [0, 2, 7, "1", null]) assert.equal((await api("POST", "/api/petugas/nonce", {jumlah: j}, K(CICI.kode))).s, j === null ? 200 : 400, String(j));
  const a = await api("POST", "/api/petugas/nonce", {}, K(CICI.kode)); assert.equal(a.s, 200); assert.equal(a.j.nonce.length, 1);
  const n = a.j.nonce[0]; assert.match(n.nonce, /^[0-9a-f]{32}$/); assert.ok(["kedip", "toleh_kiri", "toleh_kanan"].includes(n.tantangan));
  assert.ok(Math.abs(n.kedaluwarsa - a.j.waktu_server - 5 * MENIT) < 1000);
  const e = await api("POST", "/api/petugas/nonce", {jumlah: 6}, K(CICI.kode)); assert.equal(e.j.nonce.length, 6); assert.equal(new Set(e.j.nonce.map(x => x.nonce)).size, 6);
  assert.ok(Math.abs(e.j.nonce[0].kedaluwarsa - e.j.waktu_server - 36 * JAM) < 1000);
  /* klien: {jumlah: n, luring: true} dengan n = sisa simpanan (1..6) */
  for (const n2 of [1, 3]) { const l = await api("POST", "/api/petugas/nonce", {jumlah: n2, luring: true}, K(CICI.kode)); assert.equal(l.s, 200, l.t); assert.equal(l.j.nonce.length, n2); assert.ok(Math.abs(l.j.nonce[0].kedaluwarsa - l.j.waktu_server - 36 * JAM) < 1000, "umur luring"); }
  for (const j of [0, 7, 2.5]) assert.equal((await api("POST", "/api/petugas/nonce", {jumlah: j, luring: true}, K(CICI.kode))).s, 400, "luring jumlah " + j);
  assert.equal((await api("POST", "/api/petugas/nonce", {jumlah: 1, luring: false}, K(CICI.kode))).j.nonce.length, 1);
  assert.equal((await baris("lp_nonce", `nonce_sha = '${n.nonce}'`)).length, 0, "nonce mentah tidak disimpan");
  assert.equal((await baris("lp_nonce", `nonce_sha = '${sha256(n.nonce)}' AND dipakai = 0`)).length, 1);
});

uji("absen penolakan (U-05, U-06): bukan JPEG, tanpa foto, nonce kedaluwarsa / milik orang lain / dipakai dua kali, foto sha ganda, bukan anggota, sampel kurang, jaringan luar negeri; laju 10 per jam", async () => {
  const U1 = UJIAN, hitung = () => U.n("lp_absen");
  assert.equal((await kirim("/api/petugas/absen", {}, jpeg(), null)).s, 401, "tanpa kode");
  assert.equal((await absen(U1, {foto: PNG})).s, 400, "bukan JPEG"); assert.equal((await absen(U1, {foto: null})).s, 400, "tanpa foto");
  const lama = await nonce(U1.kode); await DB.prepare("UPDATE lp_nonce SET kedaluwarsa = ? WHERE nonce_sha = ?").bind(Date.now() - 1000, sha256(lama[0].nonce)).run();
  const kd = await absen(U1, {nonce: lama[0].nonce}); assert.equal(kd.s, 403, kd.t); assert.match(kd.j.galat, /nonce/);
  const milikBudi = (await nonce(BUDI.kode))[0].nonce;
  assert.equal((await absen(U1, {nonce: milikBudi})).s, 403, "nonce milik orang lain");
  assert.equal(await U.n("lp_nonce", `nonce_sha = '${sha256(milikBudi)}' AND dipakai = 0`), 1, "nonce BUDI tidak terbakar oleh orang lain");
  assert.equal(await hitung(), 0, "semua penolakan tidak menulis absen");
  const foto1 = jpeg(), n1 = (await nonce(U1.kode))[0].nonce;
  const ok = await absen(U1, {nonce: n1, foto: foto1}); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.status, "lolos");
  const ulang = await absen(U1, {nonce: n1, jenis: "pulang"}); assert.equal(ulang.s, 403, "nonce dipakai dua kali " + ulang.t); assert.match(ulang.j.galat, /nonce/);
  const ganda = await absen(U1, {jenis: "pulang", foto: foto1}); assert.equal(ganda.s, 409, ganda.t); assert.match(ganda.j.galat, /foto/);
  assert.equal((await absen(U1, {data: {tugas_id: "1".repeat(16)}})).s, 404, "bukan tugas miliknya");
  assert.equal((await absen(U1, {data: {sampel: sampel().slice(0, 2)}})).s, 400, "kurang dari 3 sampel");
  const luar = await absen(U1, {cf: {country: "US"}}); assert.equal(luar.s, 400, luar.t); assert.match(luar.j.galat, /luar Indonesia/);
  assert.equal((await absen(U1, {data: {jenis: "pulang"}})).s, 429, "laju 10 per jam");
  assert.equal(await hitung(), 1, "hanya satu absen sah tercatat");
});

uji("absen sah (U-09): wajah cocok = lolos tersimpan dengan foto R2 bersih; tantangan, jarak dan skor tercatat; pulang kedua; satu per hari", async () => {
  const r = await absen(BUDI); assert.equal(r.s, 201, r.t);
  assert.deepEqual(Object.keys(r.j).sort(), ["alasan", "id", "jarak_m", "status", "waktu"]); assert.equal(r.j.status, "lolos"); assert.deepEqual(r.j.alasan, []);
  assert.ok(r.j.jarak_m < 100, String(r.j.jarak_m)); assert.ok(Math.abs(r.j.waktu - Date.now()) < 30e3);
  const [a] = await baris("lp_absen", `id = '${r.j.id}'`);
  assert.equal(a.orang_id, BUDI.id); assert.equal(a.tugas_id, TUGAS); assert.equal(a.jenis, "masuk"); assert.equal(a.status, "lolos"); assert.equal(a.dalam_radius, 1); assert.equal(a.gps_curiga, 0);
  assert.ok(a.skor_wajah > 0.95 && a.skor_wajah <= 1.0001); assert.equal(a.tantangan_lolos, 1); assert.ok(["kedip", "toleh_kiri", "toleh_kanan"].includes(a.tantangan)); assert.equal(a.luring, 0);
  assert.match(a.foto_sha256, /^[0-9a-f]{64}$/); assert.equal(a.foto_key, `lapangan/absen/${r.j.id}.jpg`); assert.ok(!("vektor" in a));
  const o = await (await bucket()).get(a.foto_key); assert.ok(o); const bt = new Uint8Array(await o.arrayBuffer()); assert.deepEqual([bt[0], bt[1]], [0xff, 0xd8]); assert.equal(o.httpMetadata.contentType, "image/jpeg");
  assert.equal((await absen(BUDI)).s, 409, "absen masuk kedua hari ini");
  const p = await absen(BUDI, {data: {jenis: "pulang"}}); assert.equal(p.s, 201, p.t); assert.equal(p.j.status, "lolos");
  assert.equal(await U.n("lp_absen", `orang_id = '${BUDI.id}' AND status = 'lolos'`), 2);
});

uji("absen ragu masuk tinjau, tidak pernah tolak (U-09): wajah berbeda, tantangan gagal, GPS diam, luar radius, tanpa wajah terdaftar, versi model beda", async () => {
  const c = await absen(CICI, {data: {vektor: BEDA}}); assert.equal(c.s, 201, c.t); assert.equal(c.j.status, "tinjau"); assert.ok(c.j.alasan.includes("wajah_berbeda"));
  assert.ok((await baris("lp_absen", `id = '${c.j.id}'`))[0].skor_wajah < 0);
  const tdiam = Date.now(), diam = [0, 1, 2].map(i => ({lat: TITIK.lat, lon: TITIK.lon, akurasi: 15, waktu: tdiam - (2 - i) * 1000}));
  const d = await absen(DONI, {data: {sampel: diam}}); assert.equal(d.s, 201, d.t); assert.equal(d.j.status, "tinjau"); assert.deepEqual(d.j.alasan, ["gps_curiga"]);
  assert.match((await baris("lp_absen", `id = '${d.j.id}'`))[0].gps_ket, /tidak bergeser/);
  const e = await absen(ERNA, {lat: TITIK.lat + 0.5}); assert.equal(e.s, 201, e.t); assert.equal(e.j.status, "tinjau"); assert.deepEqual(e.j.alasan, ["luar_radius"]); assert.ok(e.j.jarak_m > 50000);
  const w = await absen(DEWI); assert.equal(w.j.status, "tinjau"); assert.deepEqual(w.j.alasan, ["wajah_belum_daftar"]);
  const tg = await absen(BUDI, {data: {jenis: "pulang", tantangan_lolos: false}}); assert.equal(tg.s, 409, "BUDI sudah pulang hari ini; uji tantangan lewat orang lain");
  const vb = await absen(UJIAN, {data: {jenis: "pulang", versi_model: "model-lain", tantangan_lolos: false}}); assert.equal(vb.s, 429, "UJIAN sudah habis jatah laju");
  for (const x of await baris("lp_absen", "status = 'tinjau'")) assert.notEqual(x.status, "tolak");
  assert.equal(await U.n("lp_absen", "status = 'tolak'"), 0, "skor rendah, GPS curiga, luar radius tidak pernah menolak");
});

uji("absen luring (U-10): enam nonce simpanan, satu dipakai belakangan, diterima bertanda luring dengan jam HP; jam HP di luar 24 jam jatuh ke tinjau jam_hp + luring", async () => {
  const simpan = await nonce(FITRI.kode, 6); assert.equal(simpan.length, 6);
  const t = Date.now() - 5 * MENIT;
  const r = await absen(FITRI, {nonce: simpan[3].nonce, data: {luring: true, waktu_hp: t, sampel: sampel(TITIK.lat, TITIK.lon, t)}});
  assert.equal(r.s, 201, r.t); assert.equal(r.j.status, "lolos"); assert.equal(r.j.waktu, t, "waktu luring = jam HP yang sah");
  const [a] = await baris("lp_absen", `id = '${r.j.id}'`); assert.equal(a.luring, 1); assert.equal(a.waktu_hp, t);
  const lagi = await absen(FITRI, {nonce: simpan[3].nonce, jenis: "pulang", data: {luring: true}}); assert.equal(lagi.s, 403, "nonce simpanan sekali pakai");
  const lama = await absen(FITRI, {nonce: simpan[0].nonce, jenis: "pulang", data: {luring: true, waktu_hp: Date.now() - 30 * JAM}});
  assert.equal(lama.s, 201, lama.t); assert.equal(lama.j.status, "tinjau"); assert.ok(lama.j.alasan.includes("jam_hp") && lama.j.alasan.includes("luring"), lama.t);
  assert.ok(Math.abs(lama.j.waktu - Date.now()) < 30e3, "jam HP basi ditolak, jam server dipakai");
  const depan = await absen(FITRI, {nonce: simpan[1].nonce, jenis: "pulang", data: {luring: true, waktu_hp: Date.now() + 10 * MENIT}}); assert.equal(depan.s, 409, "sudah ada pulang hari ini");
});

uji("absen relawan (U-12): lolos membuka relawan_jam, pulang ragu disahkan peninjau menutupnya dan menghitung menit", async () => {
  const m = await absen({...RELA, nama: "Rela"}); assert.equal(m.s, 201, m.t); assert.equal(m.j.status, "lolos");
  let [j] = await baris("relawan_jam", `relawan_id = '${RID}'`);
  assert.ok(j && j.keluar === null && j.sah === 1 && j.menit === null, JSON.stringify(j));
  assert.equal((await DB.prepare("SELECT status FROM relawan_penugasan WHERE relawan_id = ?").bind(RID).first()).status, "bertugas");
  const p = await absen(RELA, {data: {jenis: "pulang", vektor: BEDA}}); assert.equal(p.s, 201, p.t); assert.equal(p.j.status, "tinjau");
  [j] = await baris("relawan_jam", `relawan_id = '${RID}'`); assert.equal(j.keluar, null, "pulang yang masih ditinjau belum menutup sesi");
  RELA.pulang = p.j.id;
});

uji("riwayat dan foto (U-11): riwayat 14 hari milik sendiri tanpa vektor; foto hanya untuk pemilik atau peninjau; selain itu 404/401", async () => {
  assert.equal((await api("GET", "/api/petugas/riwayat", undefined, {})).s, 401);
  const r = await api("GET", "/api/petugas/riwayat", undefined, K(BUDI.kode)); assert.equal(r.s, 200); assert.equal(r.h.get("cache-control"), "no-store");
  assert.equal(r.j.absen.length, 2); assert.deepEqual(r.j.absen.map(x => x.jenis).sort(), ["masuk", "pulang"]); assert.ok(r.j.absen.every(x => x.status === "lolos" && x.foto_url.startsWith("/api/petugas/foto/")));
  assert.ok(!/vektor|skor_wajah|foto_sha|foto_key|ip_hash/.test(r.t), "riwayat tanpa vektor, skor mentah, kunci R2");
  const id = r.j.absen[0].id;
  const f = await U.mf.dispatchFetch("http://bnpb.lokal" + r.j.absen[0].foto_url, {headers: {"x-kode": BUDI.kode}}); assert.equal(f.status, 200);
  assert.equal(f.headers.get("content-type"), "image/jpeg"); assert.equal(f.headers.get("cache-control"), "private, no-store"); assert.equal(new Uint8Array(await f.arrayBuffer())[0], 0xff);
  const ambil = async (h, j = `/api/petugas/foto/${id}`) => { const x = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {headers: h}); await x.arrayBuffer(); return x.status; };
  assert.equal(await ambil({}), 401, "tamu"); assert.equal(await ambil(K(CICI.kode)), 404, "orang lain tidak melihat foto milik BUDI");
  assert.equal(await ambil({"x-kode": "0".repeat(26)}), 401); assert.equal(await ambil(VERIF), 401, "staf tanpa peran panel"); assert.equal(await ambil(PIMPINAN), 200); assert.equal(await ambil(ADMIN), 200);
  assert.equal(await ambil(WIL99), 404, "staf wilayah lain"); assert.equal(await ambil(ADMIN, "/api/petugas/foto/" + "f".repeat(16)), 404);
  assert.equal(await ambil({"x-admin-token": "gerbang@x:sandi"}), 401, "akun gerbang situs bukan panel");
});

uji("logbook (U-13, LP-032, LP-033): validasi, foto bergeotag (EXIF 5 km / 48 jam, JPEG, sha unik), kondisi menjadi label dan tertaut ke tugas api <= 1 km, ubah di hari yang sama, kunci sesudah 23.59 WIB", async () => {
  const kini = Date.now(), hari = new Date(kini + 7 * JAM).toISOString().slice(0, 10), kemarin = new Date(kini + 7 * JAM - HARI).toISOString().slice(0, 10);
  await DB.batch([DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, n24, dibuat, terakhir_terdeteksi) VALUES ('aaaaaaaaaaaaaaaa', '64', 'Kutai Kartanegara', ?, ?, 3, 2, 1, 1)").bind(TITIK.lat + 0.004, TITIK.lon),
    DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, n24, dibuat, terakhir_terdeteksi) VALUES ('bbbbbbbbbbbbbbbb', '64', 'Kutai Kartanegara', ?, ?, 3, 2, 1, 1)").bind(TITIK.lat + 0.02, TITIK.lon)]);
  const meta = (u = {}) => ({lat: TITIK.lat + 0.0001, lon: TITIK.lon, akurasi: 12, waktu: kini - 60e3, ...u});
  const DATA = (u = {}) => ({tugas_id: TUGAS, tanggal: hari, kegiatan: "patroli", uraian: "Pengecekan bara di gambut.", hasil: "Bara dipadamkan", kendala: ["air_jauh"], kebutuhan: ["selang_pompa"],
    kondisi: {kondisi_api: "bara", tebal_gambut_cm: 120, jarak_air_m: 300, akses: "motor"}, foto_meta: [meta(), meta()], ...u});
  const L = (data, foto, kode = BUDI.kode, ekstra) => kirim("/api/petugas/logbook", data, foto, kode, ekstra);
  assert.equal((await L(DATA(), [jpeg(), jpeg()], null)).s, 401);
  for (const [u, foto, s, pola] of [[{tugas_id: "x"}, [jpeg(), jpeg()], 400, /tugas_id/], [{tanggal: "2026-02-30"}, [jpeg(), jpeg()], 400, /tanggal/], [{kegiatan: "x"}, [jpeg(), jpeg()], 400, /kegiatan/], [{kegiatan: "Patroli titik panas"}, [jpeg(), jpeg()], 400, /kegiatan/], [{kendala: ["Air jauh"]}, [jpeg(), jpeg()], 400, /kendala/], [{kebutuhan: ["bbm", "bbm"]}, [jpeg(), jpeg()], 400, /kebutuhan/],
    [{kondisi: {kondisi_api: "gosong"}}, [jpeg(), jpeg()], 400, /kondisi_api/], [{kondisi: {tebal_gambut_cm: 9999}}, [jpeg(), jpeg()], 400, /tebal_gambut/], [{kondisi: {liar: 1}}, [jpeg(), jpeg()], 400, /tidak dikenal/],
    [{kendala: "x"}, [jpeg(), jpeg()], 400, /kendala/], [{foto_meta: [meta()]}, [jpeg(), jpeg()], 400, /foto_meta/], [{foto_meta: [meta(), meta({lat: 40})]}, [jpeg(), jpeg()], 400, /foto 2/],
    [{foto_meta: [meta(), meta({waktu: kini - 60 * JAM})]}, [jpeg(), jpeg()], 400, /48 jam/], [{foto_meta: [meta(), meta({exif_lat: TITIK.lat + 0.5, exif_lon: TITIK.lon})]}, [jpeg(), jpeg()], 400, /km/],
    [{foto_meta: [meta(), meta({exif_waktu: kini - 60 * JAM})]}, [jpeg(), jpeg()], 400, /48 jam/], [{}, [jpeg(), PNG], 400, /JPEG/],
    [{tanggal: hari.slice(0, 8) + "99"}, [jpeg(), jpeg()], 400, /tanggal/], [{tugas_id: "1".repeat(16)}, [jpeg(), jpeg()], 404, /tugas/],
    [{foto_meta: Array(7).fill(meta())}, Array.from({length: 7}, () => jpeg()), 400, /maksimal/], [{tanggal: kemarin}, [jpeg(), jpeg()], 409, /terkunci/]]) {
    const r = await L(DATA(u), foto); assert.equal(r.s, s, JSON.stringify(u).slice(0, 80) + r.t); assert.match(r.j.galat, pola, JSON.stringify(u).slice(0, 80));
  }
  assert.equal(await U.n("lp_logbook"), 0, "semua penolakan tidak menulis"); assert.equal(await U.n("lapangan_label"), 0);
  const f1 = jpeg(), f2 = jpeg();
  const ok = await L(DATA(), [f1, f2]); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.foto, 2); assert.deepEqual(ok.j.label, ["api"]); assert.equal(ok.j.terkunci, false);
  assert.equal(ok.j.tugas_api_id, "aaaaaaaaaaaaaaaa", "tugas api terdekat <= 1 km, bukan yang 2 km");
  const lb = ok.j.id, [row] = await baris("lp_logbook", `id = '${lb}'`); assert.equal(row.terkunci, 0); assert.deepEqual(JSON.parse(row.kendala), ["air_jauh"]); assert.equal(JSON.parse(row.kondisi).kondisi_api, "bara");
  const [lab] = await baris("lapangan_label", `sumber_id = '${lb}'`); assert.equal(lab.jenis, "api"); const nl = JSON.parse(lab.nilai);
  assert.deepEqual([nl.kondisi_api, nl.tebal_gambut_cm, nl.jarak_air_m, nl.akses, nl.tugas_api_id], ["bara", 120, 300, "motor", "aaaaaaaaaaaaaaaa"]); assert.ok(nl.jarak_tugas_m <= 1000 && nl.jarak_tugas_m > 300);
  const fotos = await baris("lp_logbook_foto", `logbook_id = '${lb}'`); assert.equal(fotos.length, 2); for (const f of fotos) assert.equal(await ada(f.foto_key), true);
  assert.equal((await L(DATA(), [f1, jpeg()])).s, 409, "foto sha ganda ditolak"); assert.equal(await U.n("lp_logbook_foto"), 2);
  /* ubah di hari yang sama: 200, foto bertambah, label diganti (api -> banjir) */
  const u = await L(DATA({kegiatan: "pemantauan", kondisi: {tinggi_genangan_cm: 40, hujan_lokal: "lebat"}, foto_meta: [meta()]}), [jpeg()]);
  assert.equal(u.s, 200, u.t); assert.equal(u.j.id, lb); assert.equal(u.j.foto, 3); assert.deepEqual(u.j.label, ["banjir"]);
  assert.equal(await U.n("lp_logbook"), 1); assert.equal((await baris("lp_logbook", `id = '${lb}'`))[0].kegiatan, "pemantauan");
  const labs = await baris("lapangan_label", `sumber_id = '${lb}'`); assert.deepEqual(labs.map(x => x.jenis), ["banjir"], "label api lama dibuang"); assert.deepEqual(JSON.parse(labs[0].nilai), {tinggi_genangan_cm: 40, hujan_lokal: "lebat"});
  const banyak = await L(DATA({foto_meta: Array(4).fill(meta())}), Array.from({length: 4}, () => jpeg())); assert.equal(banyak.s, 400, "3 + 4 > 6"); assert.match(banyak.j.galat, /maksimal 6/);
  const kosong = await L(DATA({kondisi: {}, foto_meta: []}), []); assert.equal(kosong.s, 200, kosong.t); assert.deepEqual(kosong.j.label, []); assert.equal(await U.n("lapangan_label", `sumber_id = '${lb}'`), 0, "kondisi kosong menghapus label");
  /* saya dan riwayat */
  const s = await api("GET", "/api/petugas/saya", undefined, K(BUDI.kode)); assert.deepEqual(s.j.hari_ini.logbook, {id: lb, terkunci: false});
  assert.equal(s.j.hari_ini.absen_masuk.status, "lolos"); assert.equal(s.j.hari_ini.absen_pulang.status, "lolos"); assert.equal(s.j.hari_ini.absen_masuk.tugas_id, TUGAS);
  /* U-13: baris kemarin terkunci walau terkunci=0 di D1; logbook hari ini baru terkunci setelah cron lewat 23.59 WIB */
  await DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, kendala, kebutuhan, kondisi, waktu, diubah, terkunci, dummy) VALUES (?, ?, ?, ?, 'Kemarin', '[]', '[]', '{}', 1, 1, 0, 0)").bind(id16(), BUDI.id, TUGAS, kemarin).run();
  const kunci = await L(DATA({tanggal: kemarin, foto_meta: []}), []); assert.equal(kunci.s, 409, "ubah tanggal yang sudah lewat 23.59 WIB");
  const rw = await api("GET", "/api/petugas/riwayat", undefined, K(BUDI.kode)); assert.equal(rw.j.logbook.find(x => x.tanggal === kemarin).terkunci, true); assert.equal(rw.j.logbook.find(x => x.tanggal === hari).terkunci, false);
  const {bersihkanLapangan} = await import("../../src/lapangan.js");
  await bersihkanLapangan({DB, MEDIA: await bucket()}, kini + 26 * JAM);
  assert.equal(await U.n("lp_logbook", "terkunci = 0"), 0, "cron mengunci logbook hari-hari lampau");
  assert.equal(await U.n("lp_nonce", "kedaluwarsa < " + (kini - HARI)), 0);
});

uji("logbook tanpa R2: foto = 503, tanpa foto tetap jalan (jalur teks)", async () => {
  const kini = Date.now(), hari = new Date(kini + 7 * JAM).toISOString().slice(0, 10);
  const r = await kirim("/api/petugas/logbook", {tugas_id: TUGAS, tanggal: hari, kegiatan: "lainnya", foto_meta: []}, [], FITRI.kode);
  assert.equal(r.s, 201, r.t); assert.equal(r.j.foto, 0);
});

uji("panel ringkas (LP-016, U-04): hanya pimpinan/koordalops/moderator; hadir, belum absen, belum logbook, tinjau, titik hari ini; wilayah dihormati; tanpa vektor", async () => {
  for (const h of [{}, VERIF, K(CICI.kode), {"x-admin-token": "gerbang@x:sandi"}]) assert.equal((await api("GET", "/api/petugas/panel/ringkas", undefined, h)).s, 403, JSON.stringify(h));
  const r = await api("GET", "/api/petugas/panel/ringkas", undefined, PIMPINAN); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.hadir, 4, "BUDI, UJIAN, FITRI, RELA lolos"); assert.equal(r.j.belum_absen, 0, "semua anggota sudah absen masuk (tinjau dihitung sudah absen)");
  assert.equal(r.j.belum_logbook, 6, "8 anggota, logbook BUDI dan FITRI"); assert.equal(r.j.tinjau, 6, "CICI, DONI, ERNA, DEWI masuk; FITRI dan RELA pulang");
  assert.equal(r.j.titik.length, 8); const b = r.j.titik.find(x => x.nama === "Budi Lapangan");
  assert.deepEqual(Object.keys(b).sort(), ["lat", "lon", "nama", "orang", "status", "tugas", "waktu"]); assert.equal(b.status, "lolos"); assert.equal(b.tugas, "Patroli uji Kenohan"); assert.equal(b.orang, BUDI.id);
  assert.deepEqual(r.j.jejak, [], "tanpa penugasan lacak");
  assert.ok(!/kode_sha|vektor|skor|"wa"/.test(r.t));
  const w = await api("GET", "/api/petugas/panel/ringkas", undefined, WIL99); assert.deepEqual([w.j.hadir, w.j.belum_absen, w.j.belum_logbook, w.j.tinjau, w.j.titik.length], [0, 0, 0, 0, 0], "staf wilayah 99");
  assert.equal((await api("GET", "/api/petugas/panel/ringkas", undefined, ADMIN)).s, 200);
});

uji("ketua regu (x-kode, peran ketua) membaca tinjauan dan ringkasan HANYA tugasnya; anggota biasa ditolak; kode salah 401", async () => {
  const tinjau = h => api("GET", "/api/petugas/panel/tinjau", undefined, h), ringkas = h => api("GET", "/api/petugas/panel/ringkas", undefined, h);
  const b = await tinjau(K(BUDI.kode)); assert.equal(b.s, 200, b.t); assert.equal(b.j.total, 6, "BUDI ketua TUGAS: melihat antrean tugasnya");
  const rb = await ringkas(K(BUDI.kode)); assert.equal(rb.s, 200, rb.t); assert.equal(rb.j.hadir, 4); assert.equal(rb.j.titik.length, 8);
  for (const f of [tinjau, ringkas]) { assert.equal((await f(K(CICI.kode))).s, 403, "anggota biasa"); assert.equal((await f(K("0".repeat(26)))).s, 401, "kode salah"); }
  /* ERNA ketua tugas lain (kosong); di TUGAS ia anggota biasa. Ketua tidak melihat TUGAS. */
  const t2 = "ab".repeat(8);
  await DB.batch([DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, ketua_id, dibuat_oleh, dibuat, dummy) VALUES (?, 'Tugas lain', 'banjir', ?, ?, 2000, ?, ?, ?, 'uji', 1, 0)").bind(t2, TITIK.lat, TITIK.lon, Date.now() - JAM, Date.now() + HARI, ERNA.id),
    DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, 'ketua')").bind(t2, ERNA.id)]);
  const te = await tinjau(K(ERNA.kode)); assert.equal(te.s, 200, te.t); assert.equal(te.j.total, 0); assert.deepEqual(te.j.baris, []);
  const re = await ringkas(K(ERNA.kode)); assert.equal(re.s, 200, re.t); assert.deepEqual([re.j.hadir, re.j.tinjau, re.j.titik.length, re.j.jejak.length], [0, 0, 0, 0]);
  assert.equal((await api("POST", "/api/petugas/panel/tinjau/" + "0".repeat(16), {putus: "sah"}, K(BUDI.kode))).s, 403, "ketua hanya membaca, tidak memutus");
  await DB.batch([DB.prepare("DELETE FROM lp_anggota WHERE tugas_id = ?").bind(t2), DB.prepare("DELETE FROM lp_tugas WHERE id = ?").bind(t2)]);
});

uji("jejak GPS petugas dari penugasan_posisi (LP-031): WA orang = WA penugasan /lacak; hari ini; tanpa nomor WA di balasan", async () => {
  await DB.batch([DB.prepare("INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, garam, sandi_sha, dibuat) VALUES ('c0c0c0c0c0c0c0c0', 'akunjejak', 'pemprov', 'prov', 'Kalimantan Tengah', 'kalteng', '[\"62\"]', ?, ?, 1)").bind("g".repeat(32), "a".repeat(64)),
    DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, wa, orang, token_sha, status, dibuat, kedaluwarsa) VALUES ('d0d0d0d0d0d0d0d0', 'aaaaaaaaaaaaaaaa', 'c0c0c0c0c0c0c0c0', 'Budi di lacak', 'anggota', '6281234500001', 1, ?, 'aktif', 1, ?)").bind("b".repeat(64), Date.now() + HARI)]);
  const t = Date.now();
  await DB.batch([0, 1, 2].map(i => DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES ('d0d0d0d0d0d0d0d0', ?, ?, 10, ?)").bind(TITIK.lat + i * 0.001, TITIK.lon, t - (3 - i) * 1000)));
  const r = await api("GET", "/api/petugas/panel/ringkas", undefined, PIMPINAN); assert.equal(r.j.jejak.length, 1);
  assert.equal(r.j.jejak[0].nama, "Budi Lapangan"); assert.equal(r.j.jejak[0].orang, BUDI.id); assert.equal(r.j.jejak[0].titik.length, 3);
  assert.deepEqual(r.j.jejak[0].titik, [0, 1, 2].map(i => [TITIK.lat + i * 0.001, TITIK.lon]), "pasangan [lat, lon], urut waktu naik"); assert.ok(!/6281234500001/.test(r.t), "nomor WA tidak keluar");
  assert.deepEqual((await api("GET", "/api/petugas/panel/ringkas", undefined, WIL99)).j.jejak, []);
});

let ANTRE;
uji("antrean tinjauan (U-04): hanya panel; baris lengkap tanpa vektor; foto dan acuan hanya untuk peninjau", async () => {
  for (const h of [{}, VERIF, K(CICI.kode)]) assert.equal((await api("GET", "/api/petugas/panel/tinjau", undefined, h)).s, 403);
  const r = await api("GET", "/api/petugas/panel/tinjau", undefined, PIMPINAN); assert.equal(r.s, 200); assert.equal(r.j.total, 6); assert.equal(r.j.baris.length, 6);
  const c = r.j.baris.find(x => x.nama === "Cici Wajah Beda");
  assert.deepEqual(Object.keys(c).sort(), ["acuan_url", "alasan", "foto_url", "gps_ket", "id", "jarak_m", "jenis", "lat", "lon", "luring", "nama", "skor_wajah", "tugas", "waktu"]);
  assert.ok(c.alasan.includes("wajah_berbeda")); assert.equal(c.foto_url, `/api/petugas/foto/${c.id}`); assert.match(c.acuan_url, /^\/api\/petugas\/panel\/acuan\/[0-9a-f]{16}$/);
  assert.equal(r.j.baris.find(x => x.nama === "Dewi Tanpa Wajah").acuan_url, null, "belum punya foto acuan");
  assert.ok(!/"vektor"|kode_sha/.test(r.t)); ANTRE = Object.fromEntries(r.j.baris.map(x => [x.nama + x.jenis, x.id]));
  assert.equal((await api("GET", "/api/petugas/panel/tinjau", undefined, WIL99)).j.total, 0);
  /* foto acuan BUDI: ada di R2 (didaftarkan di setup); peninjau 200, petugas/tamu/staf tanpa peran ditolak, orang tanpa wajah 404 */
  const ac = async (h, id) => { const x = await U.mf.dispatchFetch("http://bnpb.lokal/api/petugas/panel/acuan/" + id, {headers: h}); await x.arrayBuffer(); return x.status; };
  await (await bucket()).put(`lapangan/acuan/${CICI.id}.jpg`, jpeg(), {httpMetadata: {contentType: "image/jpeg"}});
  assert.equal(await ac(PIMPINAN, CICI.id), 200); assert.equal(await ac(ADMIN, CICI.id), 200); assert.equal(await ac(PIMPINAN, BUDI.id), 404, "BUDI punya foto acuan tetapi tak punya absen tinjau"); assert.equal(await ac({}, BUDI.id), 403); assert.equal(await ac(K(BUDI.kode), BUDI.id), 403, "pemilik sendiri lewat /panel/acuan ditolak");
  assert.equal(await ac(VERIF, BUDI.id), 403); assert.equal(await ac(PIMPINAN, DEWI.id), 404); assert.equal(await ac(WIL99, CICI.id), 404); assert.equal(await ac(PIMPINAN, "9".repeat(16)), 404);
  const f = await U.mf.dispatchFetch("http://bnpb.lokal/api/petugas/panel/acuan/" + CICI.id, {headers: PIMPINAN}); assert.equal(f.headers.get("cache-control"), "private, no-store"); assert.equal(f.headers.get("content-type"), "image/jpeg"); await f.arrayBuffer();
});

uji("putus tinjauan: sah / tolak (tolak wajib catatan), hanya panel + x-pb, sekali putus; sah menutup relawan_jam; ringkas ikut berubah; yang ditolak boleh absen ulang", async () => {
  const P = (id, b, h = PIMPINAN) => api("POST", "/api/petugas/panel/tinjau/" + id, b, h);
  const cici = ANTRE["Cici Wajah Bedamasuk"], doni = ANTRE["Doni GPS Diammasuk"], rela = RELA.pulang;
  for (const h of [{}, VERIF, K(CICI.kode, PB)]) assert.equal((await P(cici, {putus: "sah"}, h)).s, 403);
  assert.equal((await U.api("POST", "/api/petugas/panel/tinjau/" + cici, {putus: "sah"}, ADMIN)).s, 403, "tanpa x-pb");
  assert.equal((await P(cici, {putus: "mungkin"})).s, 400); assert.equal((await P(doni, {putus: "tolak"})).s, 400, "tolak tanpa catatan"); assert.equal((await P(doni, {putus: "tolak", catatan: "ab"})).s, 400);
  assert.equal((await P("0".repeat(16), {putus: "sah"})).s, 404); assert.equal((await P(cici, {putus: "sah"}, WIL99)).s, 404);
  const s = await P(cici, {putus: "sah", catatan: "Wajah tertutup helm"}); assert.equal(s.s, 200, s.t); assert.equal(s.j.status, "sah");
  const t = await P(doni, {putus: "tolak", catatan: "GPS tidak bergerak, foto bukan di lokasi"}); assert.equal(t.s, 200, t.t);
  assert.equal((await P(cici, {putus: "tolak", catatan: "ganti pikiran"})).s, 409, "sudah diputus"); assert.equal((await P(doni, {putus: "sah"})).s, 409);
  const [a] = await baris("lp_absen", `id = '${cici}'`); assert.deepEqual([a.status, a.catatan, a.peninjau.length > 0, a.waktu_tinjau > 0], ["sah", "Wajah tertutup helm", true, true]);
  assert.equal((await baris("lp_absen", `id = '${doni}'`))[0].status, "tolak");
  const rj = await P(rela, {putus: "sah"}); assert.equal(rj.s, 200, rj.t); assert.equal(rj.j.jam, "ditutup");
  const [j] = await baris("relawan_jam", `relawan_id = '${RID}'`); assert.ok(j.keluar >= j.masuk && j.menit >= 0 && j.menit <= 960, JSON.stringify(j));
  const r = await api("GET", "/api/petugas/panel/ringkas", undefined, PIMPINAN);
  assert.equal(r.j.hadir, 5, "CICI disahkan"); assert.equal(r.j.belum_absen, 1, "DONI ditolak = belum absen"); assert.equal(r.j.tinjau, 3); assert.equal(r.j.titik.length, 7);
  const ulang = await absen(DONI, {data: {sampel: sampel()}}); assert.equal(ulang.s, 201, "yang ditolak peninjau boleh mengulang: " + ulang.t); assert.equal(ulang.j.status, "lolos");
});

uji("vektor tidak muncul di balasan mana pun (U-11): pindai semua badan balasan dan riwayat", async () => {
  assert.ok(SEMUA.length > 80, "cukup banyak balasan terpindai: " + SEMUA.length);
  const haram = [...Object.values(V), BEDA].flatMap(v => [v, v.slice(0, 24)]);
  for (const t of SEMUA) { for (const h of haram) assert.ok(!t.includes(h), "vektor bocor di: " + t.slice(0, 120)); assert.ok(!/"vektor"/.test(t), "kunci vektor di balasan: " + t.slice(0, 120)); }
  assert.ok((await DB.prepare("SELECT count(*) n FROM orang_wajah").first()).n >= 25, "vektor tetap tersimpan di D1");
});

uji("relawan cabut diri: absen, logbook, dan berkas R2-nya ikut terhapus (hapusOrang)", async () => {
  const [a] = await baris("lp_absen", `orang_id = '${RELA.id}' LIMIT 1`); assert.ok(a && await ada(a.foto_key));
  const c = await U.api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: "HAPUS"}, K(RELA.kode)); assert.equal(c.s, 200, c.t);
  assert.equal(await U.n("lp_absen", `orang_id = '${RELA.id}'`), 0); assert.equal(await ada(a.foto_key), false, "foto absen R2 dibuang");
  assert.equal(await U.n("orang", `id = '${RELA.id}'`), 0);
});
