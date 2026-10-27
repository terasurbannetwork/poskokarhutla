/* Lapor dari lokasi lewat tautan petugas /lacak (src/instansi.js laporPetugas, rute POST /api/lacak/media dan /api/lacak/lapor di src/penugasan.js, migrations/0062_isian_lapangan.sql)
   di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan. Yang dibuktikan: langkah ditentukan keadaan tugas (konfirmasi, kabar, cek ulang); isian tercatat atas akun yang menugaskan
   dengan PIC = petugas itu (bukan diketik); berkas petugas hanya bisa dirujuk penugasannya sendiri; "bukan api" karhutla wajib beralasan di jalur token DAN akun; kirim ulang idempoten
   walau keadaan tugas sudah berubah; riwayat akun dan admin menyebut petugasnya; ekspor /api/pipa/lapangan membawa hasil, alasan, dan sumber; tanpa 0062 jalur akun seperti dulu dan token 503.
   Jalankan: node --test tests/warga/lacak_lapor.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";
import {buatTugas, TAHAN_BUKAN_API} from "../../src/instansi.js";

const JAM = 3600e3, PB = {"x-pb": "1"}, uji = berantai();
/* api harness + multipart dengan content-length eksplisit seperti peramban (unggahan tanpa panjang ditolak 411) */
const pakai = S => async (metode, j, body, h = {}) => {
  if (!(body instanceof FormData)) return S.api(metode, j, body, h);
  const r0 = new Response(body), isi = new Uint8Array(await r0.arrayBuffer());
  const r = await S.mf.dispatchFetch("http://bnpb.lokal" + j, {method: metode, headers: {"content-type": r0.headers.get("content-type"), "content-length": String(isi.length), ...h}, body: isi});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t, h: r.headers};
};
const U = await siapkan("uji-lacak-lapor", {r2: true, ikat: {PIPA_TOKEN: "token-pipa-uji"}});
const {DB} = U, api = pakai(U);
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`});
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");

/* ---- berkas uji minimal (sama dengan instansi.test.mjs): JPEG sah dan thumbnail WebP ---- */
const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi];
const huruf = t => [...new TextEncoder().encode(t)];
const jpeg = () => new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...huruf("JFIF"), 0, 1, 1, 0, 0, 0, 0, 1, 0, 0]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(40).fill(7), 0xff, 0xd9]);
const riff = (...c) => { const isi = c.flat(), n = 4 + isi.length; return new Uint8Array([...huruf("RIFF"), n & 255, n >> 8 & 255, n >> 16 & 255, 0, ...huruf("WEBP"), ...isi]); };
const WEBP = riff([...huruf("VP8 "), 10, 0, 0, 0, ...Array(10).fill(1)]);
const gps = (lat, lon, t = Date.now()) => ({lat, lon, akurasi: 12, waktu_gps: t, sampel: [[lat + 0.00001, lon, 10, t - 2000], [lat + 0.00002, lon + 0.00001, 11, t - 1000], [lat, lon, 12, t]]});
const form = (g, tid) => { const f = new FormData(); if (tid) f.append("tugas_id", tid); f.append("media", new File([jpeg()], "a.bin")); f.append("thumb", new File([WEBP], "t.bin"));
  for (const k of ["lat", "lon", "akurasi", "waktu_gps"]) f.append(k, String(g[k])); f.append("sampel", JSON.stringify(g.sampel)); f.append("kamera", "1"); return f; };

/* ---- akun aktif lewat SQL, masuk lewat rute sungguhan; tugas karhutla belum dikonfirmasi ---- */
const SANDI = "SandiUji23456789";
async function akun(username, kab) {
  const garam = "g".repeat(32), id = id16();
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, 'pemkab', 'kab', ?, ?, '["62"]', '62', ?, ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, 0)`)
    .bind(id, username, `Pemerintah ${kab}`, `uji|${username}`, kab, garam, sha256(garam + SANDI)).run();
  const r = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(r.s, 200, r.t);
  return {id, h: {cookie: r.h.get("set-cookie").split(",")[0].split(";")[0], ...PB}};
}
async function tugas(kab, lat = -2.2, lon = 113.9) {
  const id = id16(), t = Date.now() - JAM;
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, isian_terakhir, dummy) VALUES (?, '62', ?, 'Kec Uji', ?, ?, 3, 10, 50, ?, ?, 'buka', ?, 0)")
    .bind(id, kab, lat, lon, t, t, t).run();
  return id;
}
const tugaskan = async (A, tid, o = {}) => { const r = await api("POST", `/api/instansi/penugasan/${tid}`, {nama: "Sari Lapangan", peran: "ketua_regu", wa: "0812 3456 7002", orang: 5, ...o}, {...A.h, ...ipBaru()}); assert.equal(r.s, 201, r.t); return r.j.token; };
const lacak = (metode, jalur, token, body) => api(metode, "/api/lacak/" + jalur, body, {"x-lacak": token, ...(metode === "POST" ? PB : {}), ...ipBaru()});
const fotoToken = async (token, g = gps(-2.2005, 113.9005)) => { const r = await lacak("POST", "media", token, form(g)); assert.equal(r.s, 201, r.t); return r.j.id; };
let kl = 0;
const LAPOR = (langkah, kondisi, media, o = {}) => ({klien_id: `lapor-uji-${++kl}`, langkah, kondisi, media, ...o});

let A, T1, TOKEN1;

uji("lapor: migrasi 0062 idempoten; CHECK menolak alasan asing dan baris tanpa penugasan maupun alasan", async () => {
  for (const s of pecah(teks("migrations/0062_isian_lapangan.sql"))) await DB.prepare(s).run();
  A = await akun("pemkablapor", "Kab Lapor"); T1 = await tugas("Kab Lapor");
  const iid = id16();
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, kendala, bantuan, status_api) VALUES (?, ?, ?, 'klien-cek-0062', 'tindakan', 1, 'x uji', '[]', '[]', 'bara')").bind(iid, T1, A.id).run();
  await assert.rejects(DB.prepare("INSERT INTO isian_lapangan (isian_id, penugasan_id, alasan_bukan_api) VALUES (?, NULL, NULL)").bind(iid).run(), /CHECK|constraint/i, "kosong dua-duanya");
  await assert.rejects(DB.prepare("INSERT INTO isian_lapangan (isian_id, penugasan_id, alasan_bukan_api) VALUES (?, NULL, 'kabut')").bind(iid).run(), /CHECK|constraint/i, "alasan asing");
  await assert.rejects(DB.prepare("INSERT INTO isian_lapangan (isian_id, penugasan_id) VALUES (?, 'pendek')").bind(iid).run(), /CHECK|constraint/i, "id penugasan 16 hex");
  await DB.prepare("DELETE FROM tugas_isian WHERE id = ?").bind(iid).run();
});

uji("lapor: info membawa langkah konfirmasi; berkas petugas tercatat di media_petugas atas akun yang menugaskan", async () => {
  TOKEN1 = await tugaskan(A, T1);
  const i = await lacak("GET", "info", TOKEN1); assert.equal(i.s, 200, i.t);
  assert.equal(i.j.lapor.langkah, "konfirmasi"); assert.deepEqual(i.j.lapor.kondisi.map(k => k.kode), ["menyala", "bara", "padam", "bukan_api"]);
  assert.ok(i.j.lapor.kondisi.every(k => k.foto), "konfirmasi selalu berfoto"); assert.equal(i.j.lapor.alasan_bukan_api.length, 3); assert.deepEqual(i.j.lapor.riwayat, []);
  const m = await fotoToken(TOKEN1);
  const row = await DB.prepare("SELECT m.akun_id, m.tugas_id, m.kamera, p.penugasan_id FROM instansi_media m JOIN media_petugas p ON p.media_id = m.id WHERE m.id = ?").bind(m).first();
  assert.equal(row.akun_id, A.id); assert.equal(row.tugas_id, T1); assert.equal(row.kamera, 1);
  assert.equal(row.penugasan_id, (await DB.prepare("SELECT id FROM penugasan WHERE tugas_id = ?").bind(T1).first()).id);
  assert.equal((await lacak("POST", "media", "f".repeat(36), form(gps(-2.2, 113.9)))).s, 404, "token liar");
  assert.equal((await api("POST", "/api/lacak/media", form(gps(-2.2, 113.9)), {"x-lacak": TOKEN1, ...ipBaru()})).s, 403, "tanpa x-pb");
});

uji("lapor: bukan api wajib alasan; PIC = petugas; kirim ulang idempoten sesudah tugas tertutup; riwayat akun dan admin menyebut petugas", async () => {
  const m = await fotoToken(TOKEN1);
  assert.equal((await lacak("POST", "lapor", TOKEN1, LAPOR("konfirmasi", "bukan_api", [m]))).s, 400, "tanpa alasan");
  assert.equal((await lacak("POST", "lapor", TOKEN1, LAPOR("konfirmasi", "bukan_api", [m], {alasan_bukan_api: "kabut"}))).s, 400, "alasan asing");
  for (const [o, nama] of [[{alasan_bukan_api: null}, "alasan null"], [{alasan_bukan_api: ["tidak_ada_bekas"]}, "alasan larik"], [{kondisi: "constructor"}, "kondisi dari prototipe"], [{catatan: 5, alasan_bukan_api: "bekas_lama"}, "catatan bukan teks"]])
    assert.equal((await lacak("POST", "lapor", TOKEN1, {...LAPOR("konfirmasi", "bukan_api", [m]), ...o})).s, 400, nama);
  assert.equal((await api("GET", "/api/lacak/lapor", undefined, {"x-lacak": TOKEN1, ...ipBaru()})).s, 405);
  const salah = await lacak("POST", "lapor", TOKEN1, LAPOR("kabar", "bara", [m])); assert.equal(salah.s, 409, salah.t); assert.equal(salah.j.langkah, "konfirmasi", "409 menyebut langkah yang diminta");
  assert.equal((await lacak("GET", "info", TOKEN1)).j.penugasan.tiba_pada, null, "laporan ditolak tidak mencatat tiba");
  const body = LAPOR("konfirmasi", "bukan_api", [m], {alasan_bukan_api: "sumber_panas_lain"}), r = await lacak("POST", "lapor", TOKEN1, body); assert.equal(r.s, 201, r.t);
  assert.ok((await lacak("GET", "info", TOKEN1)).j.penugasan.tiba_pada, "laporan dari lokasi mencatat tiba: Selesai bisa ditekan tanpa Mulai berangkat, walau tugas sudah tertutup");
  const isi = await DB.prepare("SELECT i.akun_id, i.hasil, i.pic_nama, i.pic_jabatan, i.pic_wa, l.alasan_bukan_api, l.penugasan_id FROM tugas_isian i JOIN isian_lapangan l ON l.isian_id = i.id WHERE i.id = ?").bind(r.j.id).first();
  assert.deepEqual({...isi, penugasan_id: !!isi.penugasan_id}, {akun_id: A.id, hasil: "bukan_api", pic_nama: "Sari Lapangan", pic_jabatan: "Ketua regu", pic_wa: "628123456789", alasan_bukan_api: "sumber_panas_lain", penugasan_id: true}, "WA = akun yang menugaskan; WA pribadi petugas tidak disalin ke isian 180 hari");
  assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(T1).first()).status, "bukan_api");
  const tiba1 = (await lacak("GET", "info", TOKEN1)).j.penugasan.tiba_pada;
  const ulang = await lacak("POST", "lapor", TOKEN1, body); assert.equal(ulang.s, 200, ulang.t); assert.deepEqual(ulang.j, {id: r.j.id, ulang: true}, "antrean kirim ulang sesudah tugas tertutup tetap jawab isian yang sama");
  assert.equal((await lacak("GET", "info", TOKEN1)).j.penugasan.tiba_pada, tiba1, "kirim ulang tidak menggeser waktu tiba");
  const i = (await lacak("GET", "info", TOKEN1)).j.lapor; assert.equal(i.langkah, null); assert.match(i.pesan, /ditutup/); assert.equal(i.riwayat.length, 1); assert.equal(i.riwayat[0].foto, 1);
  const rk = await api("GET", `/api/instansi/tugas/${T1}`, undefined, A.h); assert.equal(rk.s, 200, rk.t);
  assert.deepEqual(rk.j.isian[0].petugas, {nama: "Sari Lapangan", peran: "Ketua regu"}); assert.equal(rk.j.isian[0].alasan_bukan_api, "sumber_panas_lain");
  const ra = await api("GET", `/api/instansi/admin/tugas/${T1}`, undefined, ADMIN); assert.equal(ra.s, 200, ra.t); assert.equal(ra.j.isian[0].petugas.nama, "Sari Lapangan");
  const dt = await api("GET", "/api/instansi/tugas", undefined, A.h); assert.equal(dt.s, 200, dt.t); assert.ok(!JSON.stringify(dt.j.pic_kab).includes("Sari Lapangan"), "PIC yang diingat akun tidak diambil dari laporan petugas");
});

uji("lapor: konfirmasi api, kabar padam wajib foto, lalu cek ulang; berkas penugasan lain dan berkas akun tidak bisa dirujuk", async () => {
  const T2 = await tugas("Kab Lapor", -2.3, 113.8), tk = await tugaskan(A, T2, {nama: "Joko Regu", peran: "anggota", wa: null}), tkLain = await tugaskan(A, T2, {nama: "Dedi Lain", peran: "driver", wa: "0812 3456 7003"});
  const g = gps(-2.3004, 113.8004), mLain = await fotoToken(tkLain, g);
  const fa = form(g, T2), ma = await api("POST", "/api/instansi/media", fa, {...A.h, ...ipBaru()}); assert.equal(ma.s, 201, ma.t);
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("konfirmasi", "menyala", [mLain]))).s, 400, "berkas penugasan lain");
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("konfirmasi", "menyala", [ma.j.id]))).s, 400, "berkas akun");
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("konfirmasi", "menyala", []))).s, 400, "konfirmasi tanpa foto");
  const k = await lacak("POST", "lapor", tk, LAPOR("konfirmasi", "menyala", [await fotoToken(tk, g)])); assert.equal(k.s, 201, k.t);
  assert.equal((await DB.prepare("SELECT pic_wa FROM tugas_isian WHERE id = ?").bind(k.j.id).first()).pic_wa, "628123456789", "petugas tanpa WA: tetap WA akun yang menugaskan");
  assert.equal((await lacak("GET", "info", tk)).j.lapor.langkah, "kabar");
  const kb = await lacak("POST", "lapor", tk, LAPOR("kabar", "bara", [], {catatan: "Sekat bakar selesai di sisi utara"})); assert.equal(kb.s, 201, kb.t);
  assert.equal((await DB.prepare("SELECT tindakan, status_api FROM tugas_isian WHERE id = ?").bind(kb.j.id).first()).tindakan, "Sekat bakar selesai di sisi utara");
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("kabar", "padam", []))).s, 400, "padam wajib foto");
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("kabar", "bukan_api", []))).s, 400, "bukan api bukan kondisi kabar");
  const pd = await lacak("POST", "lapor", tk, LAPOR("kabar", "padam", [await fotoToken(tk, g)])); assert.equal(pd.s, 201, pd.t);
  const t = await DB.prepare("SELECT status, padam_verif FROM tugas_api WHERE id = ?").bind(T2).first(); assert.deepEqual({...t}, {status: "padam", padam_verif: "padam_dilaporkan"});
  const info = (await lacak("GET", "info", tk)).j.lapor; assert.equal(info.langkah, "cekulang"); assert.equal(info.foto, true); assert.deepEqual(info.kondisi, []);
  const cu = await lacak("POST", "lapor", tk, LAPOR("cekulang", undefined, [await fotoToken(tk, g)], info.bekas ? {bekas_terbakar_baru: "ya"} : {})); assert.equal(cu.s, 201, cu.t);
  assert.ok((await DB.prepare("SELECT cek_ulang_pada FROM tugas_api WHERE id = ?").bind(T2).first()).cek_ulang_pada);
  if (info.bekas) assert.equal((await DB.prepare("SELECT bekas_terbakar_baru FROM uji_isian WHERE isian_id = ?").bind(cu.j.id).first()).bekas_terbakar_baru, "ya");
  const rw = (await lacak("GET", "info", tk)).j.lapor.riwayat; assert.deepEqual(rw.map(r => r.langkah), ["cekulang", "kabar", "kabar", "konfirmasi"], "riwayat hanya isian tautan ini, terbaru dulu, cek ulang dibedakan dari kabar");
  assert.equal((await DB.prepare("SELECT count(*) n FROM isian_lapangan l JOIN penugasan p ON p.id = l.penugasan_id WHERE p.nama = 'Dedi Lain'").first()).n, 0);
});

uji("lapor: tautan bocor tidak bisa menutup tugas dari jauh; tautan hanya menerima foto", async () => {
  const T4 = await tugas("Kab Lapor", -2.5, 113.6), tk = await tugaskan(A, T4, {nama: "Rudi Jauh", peran: "anggota"});
  const jauh = gps(-2.5, 113.7);   // sekitar 11 km dari titik api
  const ba = await lacak("POST", "lapor", tk, LAPOR("konfirmasi", "bukan_api", [await fotoToken(tk, jauh)], {alasan_bukan_api: "tidak_ada_bekas"}));
  assert.equal(ba.s, 409, ba.t); assert.equal(ba.j.jauh, true); assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(T4).first()).status, "buka", "tugas tidak tertutup");
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("konfirmasi", "padam", [await fotoToken(tk, jauh)]))).s, 409, "sudah padam dari jauh juga ditolak");
  const api = await lacak("POST", "lapor", tk, LAPOR("konfirmasi", "menyala", [await fotoToken(tk, jauh)])); assert.equal(api.s, 201, "api ada dari jauh tetap diterima (ditandai jauh)");
  assert.equal((await lacak("GET", "info", tk)).j.penugasan.tiba_pada, null, "laporan dari 11 km tidak mencatat tiba");
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("kabar", "padam", [await fotoToken(tk, jauh)]))).s, 409, "kabar padam dari jauh ditolak");
  const dekat = await lacak("POST", "lapor", tk, LAPOR("kabar", "padam", [await fotoToken(tk, gps(-2.5005, 113.6005))])); assert.equal(dekat.s, 201, dekat.t);
  assert.ok((await lacak("GET", "info", tk)).j.penugasan.tiba_pada, "laporan berfoto dari lokasi mencatat tiba");
  /* laju per tautan: 20 isian per jam (yang ditolak sebelum tersimpan tidak dihitung) */
  const pid = (await DB.prepare("SELECT id FROM penugasan WHERE nama = 'Rudi Jauh'").first()).id;
  await DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT ?, 'lacak.isi', ? FROM (SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) a, (SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) b").bind(pid, Date.now()).run();
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("cekulang", undefined, [await fotoToken(tk, gps(-2.5005, 113.6005))]))).s, 429, "lacak.isi 20 per jam");
  assert.equal((await lacak("POST", "lapor", tk, LAPOR("kabar", ["padam"], []))).s, 409, "langkah sudah berganti");
  /* video ditolak di jalur tautan (MP4 minimal sah: ftyp, moov/mvhd, mdat) */
  const kotak = (tipe, isi) => { const n = 8 + isi.length; return [n >> 24 & 255, n >> 16 & 255, n >> 8 & 255, n & 255, ...huruf(tipe), ...isi]; };
  const mv = new Uint8Array(100); new DataView(mv.buffer).setUint32(12, 1000); new DataView(mv.buffer).setUint32(16, 5000);
  const mp4 = new Uint8Array([...kotak("ftyp", [...huruf("isom"), 0, 0, 2, 0, ...huruf("isomiso2avc1mp41")]), ...kotak("moov", kotak("mvhd", [...mv])), ...kotak("mdat", Array(30).fill(5))]);
  const f = form(gps(-2.5005, 113.6005)); f.set("media", new File([mp4], "v.bin"));
  const v = await lacak("POST", "media", tk, f); assert.equal(v.s, 400, v.t); assert.match(v.j.galat, /hanya menerima foto/);
});

uji("lapor: akun dengan WA bukan nomor seluler (akun contoh 62000000xxx) memakai WA penugasan; keduanya tak sah ditolak dengan pesan jelas", async () => {
  const B = await akun("pemkabtanpawa", "Kab Tanpa WA"); await DB.prepare("UPDATE instansi_akun SET wa = '62000000099', dummy = 1 WHERE id = ?").bind(B.id).run();
  const T5 = await tugas("Kab Tanpa WA", -1.8, 114.2), g = gps(-1.8004, 114.2004);
  const tk = await tugaskan(B, T5, {nama: "Ana Petugas", peran: "anggota", wa: "0812 3456 7009"});
  const k = await lacak("POST", "lapor", tk, LAPOR("konfirmasi", "menyala", [await fotoToken(tk, g)])); assert.equal(k.s, 201, k.t);
  assert.equal((await DB.prepare("SELECT pic_wa FROM tugas_isian WHERE id = ?").bind(k.j.id).first()).pic_wa, "6281234567009");
  const T6 = await tugas("Kab Tanpa WA", -1.9, 114.3), tk2 = await tugaskan(B, T6, {nama: "Ani Tanpa WA", peran: "anggota", wa: null});
  const k2 = await lacak("POST", "lapor", tk2, LAPOR("konfirmasi", "menyala", [await fotoToken(tk2, gps(-1.9004, 114.3004))])); assert.equal(k2.s, 400); assert.match(k2.j.galat, /melengkapi verifikasi/);
});

uji("lapor: jalur akun juga wajib alasan bukan api (karhutla); ekspor pipa membawa hasil, alasan, dan sumber", async () => {
  const T3 = await tugas("Kab Lapor", -2.4, 113.7), g = gps(-2.4003, 113.7003), m = await api("POST", "/api/instansi/media", form(g, T3), {...A.h, ...ipBaru()}); assert.equal(m.s, 201, m.t);
  const KONF = o => ({klien_id: `akun-uji-${++kl}`, hasil: "bukan_api", pic_nama: "Pak Joko", pic_jabatan: "Kepala Desa", pic_wa: "0812 1111 2222", media: [m.j.id], ...o});
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${T3}`, KONF(), A.h)).s, 400, "akun tanpa alasan");
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${T3}`, KONF({alasan_bukan_api: null}), A.h)).s, 400, "akun alasan null");
  const lain = await api("POST", `/api/instansi/konfirmasi/${T3}`, KONF({alasan_bukan_api: "bekas_lama"}), {...A.h, "x-akun": "f".repeat(16)}); assert.equal(lain.s, 401, "antrean akun lain di ponsel bersama ditolak (klien menunda)");
  assert.equal((await api("POST", "/api/instansi/media", form(g, T3), {...A.h, "x-akun": "f".repeat(16), ...ipBaru()})).s, 401, "unggah antrean akun lain ditolak");
  assert.equal((await api("GET", "/api/instansi/saya", undefined, {...A.h, "x-akun": "f".repeat(16)})).s, 401, "tab basi (akun lain masuk di tab lain) = 401");
  assert.equal((await api("GET", "/api/instansi/saya", undefined, {...A.h, "x-akun": A.id})).s, 200, "akun yang sama lolos");
  assert.equal((await api("POST", "/api/instansi/keluar", {}, {...A.h, "x-akun": "f".repeat(16)})).s, 401, "tab basi tidak mencabut sesi akun yang sedang masuk");
  assert.equal((await api("GET", "/api/instansi/saya", undefined, A.h)).s, 200, "sesi tetap hidup");
  const r = await api("POST", `/api/instansi/konfirmasi/${T3}`, KONF({alasan_bukan_api: "bekas_lama"}), A.h); assert.equal(r.s, 201, r.t);
  assert.deepEqual({...await DB.prepare("SELECT penugasan_id, alasan_bukan_api FROM isian_lapangan WHERE isian_id = ?").bind(r.j.id).first()}, {penugasan_id: null, alasan_bukan_api: "bekas_lama"});
  assert.equal((await api("GET", `/api/instansi/tugas/${T3}`, undefined, A.h)).j.isian[0].petugas, null, "dikirim akun: petugas null");
  const p = await api("GET", "/api/pipa/lapangan", undefined, {authorization: "Bearer token-pipa-uji"}); assert.equal(p.s, 200, p.t);
  const B = Object.fromEntries(p.j.tugas.map(x => [x.id, x]));
  assert.deepEqual([B[T1].hasil, B[T1].status, B[T1].alasan_bukan_api, B[T1].sumber_konfirmasi, B[T1].isian_petugas], ["bukan_api", "bukan_api", "sumber_panas_lain", "petugas", 1]);
  assert.deepEqual([B[T3].hasil, B[T3].alasan_bukan_api, B[T3].sumber_konfirmasi, B[T3].isian_petugas], ["bukan_api", "bekas_lama", "instansi", 0]);
  assert.ok(!JSON.stringify(p.j).includes("Sari Lapangan"), "nama petugas tidak ikut ekspor");
});

uji("lapor: penahan bukan api di pembuat tugas: tanpa alasan dan sumber panas tetap 14 hari (aturan lama), tidak ada bekas dan bekas lama 3 hari", async () => {
  assert.deepEqual(TAHAN_BUKAN_API, {lamaHari: 14, alasanSesaatHari: 3, alasanSesaat: ["tidak_ada_bekas", "bekas_lama"]});
  const kini = Date.now(), HARI = 24 * JAM, E = await akun("pemkabtahan", "Kab Tahan");
  const bukanApi = async (lat, umurHari, alasan) => {
    const id = await tugas("Kab Tahan", lat, 112.0), iid = id16(), kp = kini - umurHari * HARI;
    await DB.prepare("UPDATE tugas_api SET status = 'bukan_api', konfirmasi_pada = ? WHERE id = ?").bind(kp, id).run();
    await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, akurasi, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa) VALUES (?, ?, ?, ?, 'konfirmasi', ?, ?, 112.0, 10, ?, 'bukan_api', 'Pak Uji', 'Kades', '628111222333')")
      .bind(iid, id, E.id, "tahan-" + iid, kp, lat, kp).run();
    if (alasan) await DB.prepare("INSERT INTO isian_lapangan (isian_id, alasan_bukan_api) VALUES (?, ?)").bind(iid, alasan).run();
    return id;
  };
  /* lokasi berjauhan (>= 0,2 derajat): tiap hotspot hanya dekat satu tugas bukan_api */
  const kasus = [["tidak_ada_bekas", 5, true], ["bekas_lama", 5, true], ["sumber_panas_lain", 5, false], [null, 5, false], ["tidak_ada_bekas", 2, false], [null, 20, true]];
  const lat = i => -1.0 - i * 0.2;
  for (const [i, [alasan, umur]] of kasus.entries()) await bukanApi(lat(i), umur, alasan);
  const K = (i) => ({id: "KT" + i, lat: lat(i) - 0.005, lon: 112.0, prov: "62", kab: "Kab Tahan", kec: "Kec Uji", level: 2, n24: 5, jam_sejak: 1, luas: 30, konsesi: []});
  const isi = {dibuat: new Date(kini - 10 * 60e3).toISOString(), kompleks: kasus.map((_, i) => K(i))};
  const env = {DB, ASSETS: {fetch: async req => new URL(req.url).pathname === "/data/tugas_kompleks.json" ? Response.json(isi) : new Response("tidak ada", {status: 404})}};
  await buatTugas(env, kini);
  const baru = (await DB.prepare("SELECT lat FROM tugas_api WHERE kab = 'Kab Tahan' AND status = 'buka'").all()).results.map(r => r.lat);
  const lahir = kasus.map((_, i) => baru.some(x => Math.abs(x - (lat(i) - 0.005)) < 0.001));
  assert.deepEqual(lahir, kasus.map(k => k[2]), "tugas baru lahir hanya untuk alasan sesaat > 3 hari dan tanpa alasan > 14 hari");
});

uji("lapor: x-akun di akun bersesi: tab basi 401 sebelum cek status, ganti sandi tidak jalan, keluar dengan akun cocok tetap mencabut sesi, masuk tidak terpengaruh", async () => {
  const C = await akun("pemkabtabbasi", "Kab Tab Basi"), basi = {"x-akun": "f".repeat(16)};
  const sandiSha = async () => (await DB.prepare("SELECT sandi_sha FROM instansi_akun WHERE id = ?").bind(C.id).first()).sandi_sha, awal = await sandiSha();
  assert.equal((await api("POST", "/api/instansi/gantisandi", {}, {...C.h, ...basi})).s, 401, "ganti sandi dari tab basi"); assert.equal(await sandiSha(), awal, "sandi tidak berubah");
  await DB.prepare("UPDATE instansi_akun SET wajib_ganti = 1 WHERE id = ?").bind(C.id).run();
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, {...C.h, ...basi})).s, 401, "x-akun dicek sebelum wajib_ganti (klien keluar, tidak menandai galat)");
  const w = await api("GET", "/api/instansi/tugas", undefined, {...C.h, "x-akun": C.id}); assert.equal(w.s, 403); assert.equal(w.j.wajib_ganti, true);
  await DB.prepare("UPDATE instansi_akun SET wajib_ganti = 0 WHERE id = ?").bind(C.id).run();
  assert.equal((await api("POST", "/api/instansi/masuk", {username: "pemkabtabbasi", sandi: SANDI}, {...PB, ...basi, ...ipBaru()})).s, 200, "masuk tidak memakai x-akun");
  assert.equal((await api("POST", "/api/instansi/keluar", {}, {...C.h, "x-akun": C.id})).s, 200);
  assert.equal((await api("GET", "/api/instansi/saya", undefined, C.h)).s, 401, "keluar dengan akun cocok mencabut sesi");
  /* pic_kab: PIC ketikan akun sendiri tetap diingat walau isian petugas lebih baru di kabupaten yang sama */
  const D = await akun("pemkabpicuji", "Kab PIC"), T7 = await tugas("Kab PIC", -1.6, 113.4), T8 = await tugas("Kab PIC", -1.7, 113.5), g7 = gps(-1.6003, 113.4003);
  const m7 = await api("POST", "/api/instansi/media", form(g7, T7), {...D.h, ...ipBaru()}); assert.equal(m7.s, 201, m7.t);
  assert.equal((await api("POST", `/api/instansi/konfirmasi/${T7}`, {klien_id: "pic-akun-uji-1", hasil: "api_ada", status_api: "menyala", pic_nama: "Pak Kades Asli", pic_jabatan: "Kepala Desa", pic_wa: "0812 5555 6666", media: [m7.j.id]}, D.h)).s, 201);
  const tk8 = await tugaskan(D, T8, {nama: "Petugas Lebih Baru", peran: "anggota"});
  assert.equal((await lacak("POST", "lapor", tk8, LAPOR("konfirmasi", "menyala", [await fotoToken(tk8, gps(-1.7003, 113.5003))]))).s, 201);
  const pk = (await api("GET", "/api/instansi/tugas", undefined, D.h)).j.pic_kab["62|kab pic"];
  assert.equal(pk?.nama, "Pak Kades Asli", JSON.stringify(pk));
});

uji("lapor: tanpa 0062 info.lapor null, token 503, jalur akun bukan api tanpa alasan seperti dulu, ekspor tetap jalan", async () => {
  const S = await siapkan("uji-lacak-lapor-tanpa-0062", {r2: true, ikat: {PIPA_TOKEN: "token-pipa-uji"}});
  const sapi = pakai(S); await S.DB.prepare("DROP TABLE media_petugas").run(); await S.DB.prepare("DROP TABLE isian_lapangan").run();
  const garam = "g".repeat(32), aid = id16(), un = "pemkabtanpa";
  await S.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, 'pemkab', 'kab', 'Pemerintah Kab Satu', 'uji|x', '["62"]', '62', 'Kab Satu', ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, 0)`).bind(aid, un, garam, sha256(garam + SANDI)).run();
  const ms = await sapi("POST", "/api/instansi/masuk", {username: un, sandi: SANDI}, {...PB, ...ipBaru()}), h = {cookie: ms.h.get("set-cookie").split(",")[0].split(";")[0], ...PB};
  const tid = id16(), t0 = Date.now() - JAM;
  await S.DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, isian_terakhir, dummy) VALUES (?, '62', 'Kab Satu', 'Kec', -2.2, 113.9, 3, 10, 50, ?, ?, 'buka', ?, 0)").bind(tid, t0, t0, t0).run();
  const tk = (await sapi("POST", `/api/instansi/penugasan/${tid}`, {nama: "Sari Lapangan", peran: "anggota", wa: "0812 3456 7002", orang: 2}, {...h, ...ipBaru()})).j.token;
  const i = await sapi("GET", "/api/lacak/info", undefined, {"x-lacak": tk, ...ipBaru()}); assert.equal(i.s, 200, i.t); assert.equal(i.j.lapor, null);
  assert.equal((await sapi("POST", "/api/lacak/lapor", LAPOR("konfirmasi", "menyala", []), {"x-lacak": tk, ...PB, ...ipBaru()})).s, 503);
  assert.equal((await sapi("POST", "/api/lacak/media", form(gps(-2.2, 113.9)), {"x-lacak": tk, ...PB, ...ipBaru()})).s, 503);
  const m = await sapi("POST", "/api/instansi/media", form(gps(-2.2003, 113.9003), tid), {...h, ...ipBaru()}); assert.equal(m.s, 201, m.t);
  const r = await sapi("POST", `/api/instansi/konfirmasi/${tid}`, {klien_id: "tanpa-0062-uji", hasil: "bukan_api", pic_nama: "Pak Joko", pic_jabatan: "Kepala Desa", pic_wa: "0812 1111 2222", media: [m.j.id]}, h); assert.equal(r.s, 201, r.t);
  const rk = await sapi("GET", `/api/instansi/tugas/${tid}`, undefined, h); assert.equal(rk.s, 200, rk.t); assert.equal(rk.j.isian[0].petugas, null);
  const p = await sapi("GET", "/api/pipa/lapangan", undefined, {authorization: "Bearer token-pipa-uji"}); assert.equal(p.s, 200, p.t);
  assert.deepEqual([p.j.tugas[0].hasil, p.j.tugas[0].alasan_bukan_api, p.j.tugas[0].sumber_konfirmasi], ["bukan_api", null, "instansi"]);
});

uji("lapor: halaman /lacak memuat lacak_lapor.js tanpa skrip/gaya inline; CSP mengizinkan pratinjau blob:; klien lolos sintaks", async () => {
  const html = teks("public/lacak.html");
  assert.ok(html.indexOf("/lacak_lapor.js?v=") < html.indexOf("/lacak.js?v="), "lacak_lapor.js dimuat sebelum lacak.js (defer berurutan)");
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html) && !/\sstyle="/i.test(html), "tanpa skrip/gaya inline");
  for (const id of ["kartuLapor", "pilihKondisi", "pilihAlasan", "pilihBekas", "fotoKamera", "fotoGaleri", "bKirimLapor", "antreanLapor", "daftarLaporSaya"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /id="fotoKamera"[^>]*capture="environment"/);
  for (const f of ["public/lacak_lapor.js", "public/lacak.js"]) new vm.Script(teks(f), {filename: f});
  const r = await api("GET", "/lacak"); assert.equal(r.s, 200); assert.match(r.h.get("content-security-policy"), /img-src 'self' data: blob:/);
});
