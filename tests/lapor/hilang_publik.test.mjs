/* Orang hilang publik OH-09 (rute publik daftar dan profil) dan OH-11 (informasi, laporkan, cabut tanpa sesi, "Saya orang ini", antrean petugas): worker.js utuh di Miniflare + D1 sungguhan.
   RENCANA-UJI 2.1 sampai 2.3b, 2.9, 2.10, 2.16, 2.18, 2.19, 2.22 (bagian akhir), 2.23. Jalankan: node --test tests/lapor/hilang_publik.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256, ADMIN} from "../warga/_bnpb.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import "../../src/worker.js";
import * as H from "../../src/hak.js";
import {BIDANG_PUBLIK, tglWib} from "../../src/orang_hilang_murni.js";
import {RUJUKAN} from "../../src/orang_hilang.js";

const uji = berantai();
const HARI = 864e5, kini = Date.now(), KAB = "32.01", WA = ["6281200000201", "6281200000202", "6281200000203", "6281200000204"];
const U = await siapkan("uji-oh-publik", {r2: true, ikat: {OH_PUBLIK: "1", OH_TULIS: "1", OH_FOTO: "0"}}), {api, DB, n} = U;
const MATI = await siapkan("uji-oh-publik-mati", {r2: true});
const env = {DB}, STAF = H.pelakuLpStaf, PEL = H.pelakuLpPelapor;
const ip = i => ({"cf-connecting-ip": `198.51.100.${i}`}), PB = {origin: "http://bnpb.lokal", "x-pb": "1"};
const SESI = {}, sesi = (wa) => SESI[wa] ??= (async () => { const i = WA.indexOf(wa) + 1;
  const mk = "mk" + String(i).padStart(14, "0"), tok = (String(i).padStart(2, "0") + "7e").repeat(32).slice(0, 64);
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, ?, 'Warga Uji', 'aktif', ?)").bind(mk, wa, kini), DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(sha256(tok), mk, kini, kini, kini + 90 * HARI)]);
  return {cookie: `sesi_masuk=${tok}`, ...PB};
})();
const bpbd = async (nu, kab) => { const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat) VALUES (?, ?, 'pemkab', 'kab', 'Wilayah uji', ?, ?, '32', ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "ohpub" + nu, `32|${kab}`, JSON.stringify(["32"]), kab, "g".repeat(32), "0".repeat(64), `ohp${nu}@b.id`, "62812004" + String(nu).padStart(4, "0"), kini).run();
  return {cookie: (await profilAktif(DB, id)).cookie, ...PB}; };
let seq = 0;
/* satu laporan beserta profil; foto publik 32 heks tanpa berkas R2 (hanya id) */
async function buat({status = "tayang", kelas = "dewasa", kab = KAB, umur = 30, tayang = kini, nomor = WA[0], foto = false, nomorDicari = null} = {}) {
  const i = ++seq, id = String(i).padStart(16, "0"), token = "c".repeat(32 - String(i).length) + i;
  await H.crTambah(env, PEL, {id, nomor_pencari: nomor, nama_dicari: "Budi Santoso", ciri: "tahi lalat", lokasi_terakhir: "Desa Rahasia", waktu_terakhir: "Hari ini", nomor_dicari: nomorDicari, hubungan: "Anak", kab}, kini);
  await H.ohTambah(env, PEL, {cari_id: id, token, kelas, nama: "Budi Santoso", panggilan: "Budi", umur: kelas === "anak" ? 9 : umur, kelamin: "Laki-laki", tinggi: 168, pakaian: "kaos merah", ciri: "tahi lalat", kec: "Cibinong", kab, kab_nama: "Kab. Bogor", waktu_terakhir: kini,
    kejadian_id: "KJ-2026-00000001", kejadian_jenis: "banjir", kejadian_kab: "3201", kejadian_mulai: tglWib(kini - 3 * HARI), setuju_versi: 1, setuju_waktu: kini, setuju_wali: kelas === "anak" ? 1 : null}, kini);
  if (status !== "draf") await H.ohPindah(env, STAF, {cari_id: id, dari: "draf", ke: "menunggu", oleh: "uji"}, kini);
  if (status === "tayang") await H.ohPindah(env, STAF, {cari_id: id, dari: "menunggu", ke: "tayang", oleh: "uji"}, tayang);
  if (status === "turun") { await H.ohPindah(env, STAF, {cari_id: id, dari: "menunggu", ke: "tayang", oleh: "uji"}, kini); await H.ohPindah(env, STAF, {cari_id: id, dari: "tayang", ke: "turun", alasan_turun: "petugas", oleh: "uji"}, kini); }
  if (foto) await DB.prepare("UPDATE oh_publik SET foto_publik = ? WHERE cari_id = ?").bind(JSON.stringify(["a".repeat(31) + seq]), id).run();
  return {id, token};
}
const baca = id => DB.prepare("SELECT status, alasan_turun FROM oh_publik WHERE cari_id = ?").bind(id).first();
const info = (b, h = {}) => api("POST", "/api/lapor/hilang/info", b, {...PB, ...ip(90), ...h});

uji("2.1 OH_PUBLIK mati (bawaan): daftar, profil, dan info menjawab 404 tanpa menyentuh D1", async () => {
  for (const [m, j, b] of [["GET", "/api/lapor/hilang"], ["GET", "/api/lapor/hilang/" + "a".repeat(32)], ["POST", "/api/lapor/hilang/info", {jenis: "cabut", token: "a".repeat(32)}]]) {
    const r = await MATI.api(m, j, b, PB); assert.equal(r.s, 404, j);
  }
  assert.equal(await MATI.n("laju_bnpb"), 0, "tidak menulis laju");
});

uji("2.2 daftar: hanya profil tayang, kunci daftar putih persis, dewasa dan anak; header; filter kab dan umur", async () => {
  const d = await buat({foto: true}), a = await buat({kelas: "anak", foto: true}), m = await buat({status: "menunggu"}), t = await buat({status: "turun"}), f = await buat({status: "draf"}), lain = await buat({kab: "32.04", umur: 52});
  const r = await api("GET", "/api/lapor/hilang", undefined, ip(1)); assert.equal(r.s, 200, r.t);
  const ids = r.j.profil.map(p => p.id); assert.ok(ids.includes(d.token) && ids.includes(a.token) && ids.includes(lain.token));
  for (const x of [m, t, f]) assert.ok(!ids.includes(x.token), "menunggu, turun, draf tidak tampil");
  const pd = r.j.profil.find(p => p.id === d.token), pa = r.j.profil.find(p => p.id === a.token);
  assert.deepEqual(new Set(Object.keys(pd)), new Set(BIDANG_PUBLIK.dewasa), "kunci dewasa = daftar putih persis");
  assert.deepEqual(new Set(Object.keys(pa)), new Set(BIDANG_PUBLIK.anak), "kunci anak = daftar putih persis");
  assert.equal(pd.nama, "Budi Santoso"); assert.equal(pd.umur, "30 sampai 34"); assert.equal(pd.tinggi, "160 sampai 169"); assert.equal(pd.lokasi, "Cibinong, Kab. Bogor"); assert.equal(pd.kejadian.jenis, "banjir"); assert.equal(pd.kejadian.kab, "Bogor");
  assert.equal(pd.foto.length, 1); assert.match(pd.foto[0], /^\/api\/lapor\/hilang\/foto\/a+\d$/);
  assert.equal(pa.nama, "B. S.", "anak: inisial saja"); assert.equal(pa.umur, "anak"); assert.ok(!("foto" in pa) && !("kelamin" in pa) && !("tinggi" in pa) && !("ciri" in pa));
  for (const kata of ["Rahasia", "6281", "nomor", "hubungan", "tahi lalat", "lokasi_terakhir", "nomor_pencari"]) assert.ok(!r.t.includes(kata) || kata === "tahi lalat" && pd.ciri === null || false, `bocor: ${kata}`);
  assert.equal(pd.ciri, null, "ciri tak ditinjau tidak tampil");
  assert.equal(r.h.get("cache-control"), "private, no-store"); assert.equal(r.h.get("x-robots-tag"), "noindex"); assert.equal(r.h.get("referrer-policy"), "no-referrer");
  const fk = await api("GET", "/api/lapor/hilang?kab=3204", undefined, ip(2)); assert.deepEqual(fk.j.profil.map(p => p.id), [lain.token], "filter kab");
  const fu = await api("GET", "/api/lapor/hilang?umur=52", undefined, ip(2)); assert.deepEqual(fu.j.profil.map(p => p.id), [lain.token], "filter umur: rentang 5 tahun, hanya dewasa");
  assert.equal((await api("GET", "/api/lapor/hilang?umur=9", undefined, ip(2))).j.profil.length, 0, "anak tidak ikut filter umur");
});

uji("2.16 SQL daftar publik tidak menyebut kolom nomor; lp_publik tidak membaca baris penuh", async () => {
  const [sql] = H.ohSqlDaftar({kab: "32.01", umur5: 30, sesudah: {w: 1, token: "a".repeat(32)}, batas: 20, sejak: 1});
  for (const k of ["nomor", "hubungan", "lokasi_terakhir", "dicabut", "setuju", "wali"]) assert.ok(!sql.includes(k), `SQL menyebut ${k}`);
  assert.throws(() => H.ohById(env, H.pelakuLpPublik, "1".repeat(16)), /lp_publik/); assert.throws(() => H.ohByTokenSistem(env, H.pelakuLpPublik, "a".repeat(32)), /lp_publik/);
});

uji("2.3 profil: header; tidak ada, belum tayang, turun, lewat masa menjawab 404 sama", async () => {
  const t = await buat({}), m = await buat({status: "menunggu"}), tu = await buat({status: "turun"}), lama = await buat({tayang: kini - 40 * HARI});
  const r = await api("GET", `/api/lapor/hilang/${t.token}`, undefined, ip(3)); assert.equal(r.s, 200); assert.equal(r.j.profil.id, t.token);
  assert.equal(r.h.get("cache-control"), "private, no-store"); assert.equal(r.h.get("x-robots-tag"), "noindex"); assert.equal(r.h.get("referrer-policy"), "no-referrer");
  const kosong = await api("GET", `/api/lapor/hilang/${"e".repeat(32)}`, undefined, ip(3)); assert.equal(kosong.s, 404);
  for (const x of [m, tu, lama]) { const q = await api("GET", `/api/lapor/hilang/${x.token}`, undefined, ip(3)); assert.equal(q.s, 404); assert.equal(q.t, kosong.t, "badan sama"); }
  assert.equal((await api("GET", "/api/lapor/hilang/semua", undefined, ip(3))).s, 404, "tidak ada rute semua");
  assert.equal((await api("POST", `/api/lapor/hilang/${t.token}`, {}, {...PB, ...ip(3)})).s, 405, "hanya GET");
});

uji("2.3b pengerukan: 20 per halaman, kursor opak sampai habis tanpa duplikat, input buruk 400, laju daftar lebih ketat dari detail", async () => {
  await DB.prepare("UPDATE oh_publik SET status = 'turun', alasan_turun = 'petugas' WHERE status = 'tayang'").run();
  const toks = []; for (let i = 0; i < 25; i++) toks.push((await buat({tayang: kini - i * 1000})).token);
  const h1 = await api("GET", "/api/lapor/hilang", undefined, ip(4)); assert.equal(h1.j.profil.length, 20); assert.ok(typeof h1.j.kursor === "string" && /^[A-Za-z0-9_-]+$/.test(h1.j.kursor), "kursor opak");
  assert.ok(!h1.j.kursor.includes("."), "bukan token terbaca"); const h2 = await api("GET", `/api/lapor/hilang?kursor=${h1.j.kursor}`, undefined, ip(4));
  assert.equal(h2.j.profil.length, 5); assert.equal(h2.j.kursor, null);
  const semua = [...h1.j.profil, ...h2.j.profil].map(p => p.id); assert.equal(new Set(semua).size, 25, "tanpa duplikat"); assert.deepEqual(new Set(semua), new Set(toks));
  for (const j of ["?x=1", "?kab=9999", "?kab=3201&kab=3202", "?kursor=!!", "?kursor=" + btoa("1.zz"), "?umur=abc", "?umur=999", "?kab="]) assert.equal((await api("GET", "/api/lapor/hilang" + j, undefined, ip(5))).s, 400, j);
  let s1 = 0; for (let i = 0; i < 61; i++) s1 = (await api("GET", "/api/lapor/hilang", undefined, ip(6))).s; assert.equal(s1, 429, "daftar: ke-61 dalam sejam ditolak");
  let s2 = 0; for (let i = 0; i < 61; i++) s2 = (await api("GET", `/api/lapor/hilang/${toks[0]}`, undefined, ip(7))).s; assert.equal(s2, 200, "detail: jumlah sama belum ditolak");
});

uji("2.10 info: tanpa sesi 401 untuk informasi, laporkan; sesi sah masuk antrean; nomor pemberi tidak pernah di respons publik; sasaran harus tayang; x-pb wajib; foto mati", async () => {
  const p = await buat({}), H1 = await sesi(WA[1]);
  assert.equal((await info({jenis: "informasi", token: p.token, pesan: "Saya lihat dia di terminal"}, {...ip(10)})).s, 401, "tanpa sesi");
  assert.equal((await info({jenis: "laporkan", token: p.token, alasan: "lainnya"}, ip(10))).s, 401);
  const nomorKetik = await info({jenis: "informasi", token: p.token, pesan: "Saya lihat dia di terminal", wa: WA[3]}, ip(10)); assert.equal(nomorKetik.s, 401, "nomor yang diketik tidak cukup");
  const r = await info({jenis: "informasi", token: p.token, pesan: "Saya lihat dia di terminal, hubungi 0812 3456 7890"}, {...H1, ...ip(11)}); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j, {diterima: true, rujukan: RUJUKAN}); assert.match(RUJUKAN, /112 dan kepolisian/); assert.ok(!/\b(aman|pasti)\b/i.test(RUJUKAN) && !/\d{4,}/.test(RUJUKAN.replace("112", "")), "tanpa nomor layanan lain");
  const b = await DB.prepare("SELECT jenis, nomor_pemberi, pesan, status FROM oh_info WHERE sasaran_token = ?").bind(p.token).first();
  assert.deepEqual([b.jenis, b.nomor_pemberi, b.status], ["informasi", WA[1], "baru"]); assert.ok(!b.pesan.includes("3456 7890"), "nomor dalam pesan disamarkan");
  assert.ok(!r.t.includes(WA[1]), "nomor pemberi tidak ada di respons");
  const pub = await api("GET", `/api/lapor/hilang/${p.token}`, undefined, ip(12)); assert.ok(!pub.t.includes(WA[1]) && !pub.t.includes("terminal"), "publik tidak memuat isi info");
  assert.equal((await info({jenis: "informasi", token: p.token, pesan: "x"}, {...H1, ...ip(11)})).s, 400, "pesan terlalu pendek");
  assert.equal((await info({jenis: "informasi", token: p.token, pesan: "Lihat di pasar"}, {...H1, "x-pb": "", ...ip(11)})).s, 403, "x-pb wajib");
  assert.equal((await info({jenis: "informasi", token: "d".repeat(32), pesan: "Lihat di pasar"}, {...H1, ...ip(11)})).s, 404, "profil tidak ada");
  const m = await buat({status: "menunggu"}); assert.equal((await info({jenis: "informasi", token: m.token, pesan: "Lihat di pasar"}, {...H1, ...ip(11)})).s, 404, "belum tayang: sama dengan tidak ada");
  for (const bad of [{jenis: "lain", token: p.token}, {jenis: "informasi", token: "zz"}, {jenis: "laporkan", token: p.token, alasan: "asal"}, {jenis: "informasi", token: p.token, pesan: "Lihat di pasar", tingkat: "pasti"}]) assert.equal((await info(bad, {...H1, ...ip(11)})).s, 400, JSON.stringify(bad));
  assert.equal((await info({jenis: "foto", token: p.token, tingkat: "mirip"}, {...H1, ...ip(11)})).s, 404, "OH_FOTO mati");
});

uji("2.9 laju: informasi per nomor 10 per jam (kunci sha nomor); laporkan 10 per hari; cabut dan orang_ini tanpa sesi per IP", async () => {
  const p = await buat({}), H3 = await sesi(WA[2]); let s = 0;
  for (let i = 0; i < 11; i++) s = (await info({jenis: "informasi", token: p.token, pesan: `Lihat di pasar ${i}`}, {...H3, ...ip(20 + i)})).s;
  assert.equal(s, 429, "ke-11 ditolak walau IP berganti");
  const kunci = (await DB.prepare("SELECT kunci FROM laju_bnpb WHERE aksi = 'oh.info.informasi'").all()).results.map(x => x.kunci); assert.ok(kunci.every(k => /^[0-9a-f]{64}$/.test(k) && k !== WA[2]), "kunci = sha nomor, bukan nomor");
  let c = 0; for (let i = 0; i < 6; i++) c = (await info({jenis: "cabut", token: p.token, pesan: "Mohon cabut"}, ip(40))).s; assert.equal(c, 429, "cabut tanpa sesi: ke-6 per IP ditolak");
  let o = 0; for (let i = 0; i < 6; i++) o = (await info({jenis: "orang_ini", token: p.token}, ip(41))).s; assert.equal(o, 429);
});

uji("2.18 laporkan: 2 pelapor berbeda tidak menurunkan, ke-3 berbeda menurunkan alasan dilaporkan; pelapor sama berulang dihitung satu; foto ikut turun", async () => {
  const p = await buat({foto: true}), q = await buat({}), S = [await sesi(WA[0]), await sesi(WA[1]), await sesi(WA[2])];
  const lapor = (tok, i, alasan = "tidak_ingin_ditemukan") => info({jenis: "laporkan", token: tok, alasan, pesan: "Dia pergi sendiri"}, {...S[i], ...ip(50 + i)});
  assert.equal((await lapor(p.token, 0)).s, 200); assert.equal((await lapor(p.token, 1)).s, 200); assert.equal((await baca(p.id)).status, "tayang", "dua pelapor: tetap tayang");
  assert.equal((await lapor(q.token, 0)).s, 200); for (let i = 0; i < 4; i++) await lapor(q.token, 0); assert.equal((await baca(q.id)).status, "tayang", "pelapor sama berulang dihitung satu");
  const r = await lapor(p.token, 2); assert.equal(r.s, 200); assert.deepEqual(r.j, {diterima: true, rujukan: RUJUKAN}, "respons sama, tidak menyebut profil turun");
  assert.deepEqual(await baca(p.id), {status: "turun", alasan_turun: "dilaporkan"}); assert.ok((await H.ohRiwayat(env, STAF, p.id)).some(x => x.alasan === "dilaporkan_ambang" && x.oleh === "sistem"));
  assert.equal((await DB.prepare("SELECT foto_publik FROM oh_publik WHERE cari_id = ?").bind(p.id).first()).foto_publik, "[]", "foto publik dikosongkan");
  assert.equal((await api("GET", `/api/lapor/hilang/${p.token}`, undefined, ip(60))).s, 404, "turun seketika");
  const pesan = (await DB.prepare("SELECT pesan FROM oh_info WHERE sasaran_token = ? LIMIT 1").bind(p.token).first()).pesan; assert.match(pesan, /^\[tidak_ingin_ditemukan\]/, "penanda dari pihak ketiga tercatat");
});

uji("2.22 cabut tanpa sesi dan 2.23 Saya orang ini: masuk antrean, tidak menurunkan sendiri, tanpa nomor; profil turun atau tidak ada = 404", async () => {
  const p = await buat({nomorDicari: "6281299999999"}), m = await buat({status: "menunggu"}), tu = await buat({status: "turun"});
  const c = await info({jenis: "cabut", token: p.token, pesan: `Mohon cabut laporan ${p.id}`}, ip(70)); assert.equal(c.s, 200, c.t);
  const cm = await info({jenis: "cabut", token: m.token}, ip(71)); assert.equal(cm.s, 200, "profil yang masih menunggu boleh dicabut lewat petugas");
  assert.equal((await info({jenis: "cabut", token: tu.token}, ip(72))).s, 404);
  const oi = await info({jenis: "orang_ini", token: p.token, pesan: "Ini saya, mohon turunkan"}, ip(73)); assert.equal(oi.s, 200, oi.t);
  assert.equal((await baca(p.id)).status, "tayang", "tidak menurunkan sendiri sebelum petugas");
  const baris = (await DB.prepare("SELECT jenis, nomor_pemberi, status FROM oh_info WHERE sasaran_token = ? ORDER BY dibuat, jenis").bind(p.token).all()).results; assert.deepEqual(baris.map(x => [x.jenis, x.nomor_pemberi, x.status]).sort(), [["cabut", null, "baru"], ["orang_ini", null, "baru"]]);
  for (const r of [c, oi]) assert.ok(!r.t.includes("6281299999999"), "nomor orang dicari tidak ke pelapor");
});

uji("OH-11 petugas: antrean info (nomor pemberi, wilayah), turunkan dari cabut atau orang ini, selesai; wilayah lain 404; tanpa hak 403", async () => {
  const p = await buat({kab: "32.05"}), S1 = await sesi(WA[3]), meja = await bpbd(1, "32.05"), lain = await bpbd(2, "32.06");
  await info({jenis: "informasi", token: p.token, pesan: "Dia di rumah sakit umum"}, {...S1, ...ip(80)}); await info({jenis: "orang_ini", token: p.token, pesan: "Ini saya"}, ip(81));
  const g = await api("GET", "/api/lapor/meja/hilang/info", undefined, ADMIN); assert.equal(g.s, 200, g.t); const baris = g.j.info.filter(x => x.profil.id === p.id); assert.equal(baris.length, 2);
  assert.equal(baris.find(x => x.jenis === "informasi").nomor_pemberi, WA[3]); assert.equal(baris.find(x => x.jenis === "orang_ini").nomor_pemberi, null); assert.equal(g.h.get("cache-control"), "private, no-store");
  const gm = await api("GET", "/api/lapor/meja/hilang/info", undefined, meja); assert.equal(gm.s, 200); assert.equal(gm.j.info.filter(x => x.profil.id === p.id).length, 2, "BPBD wilayahnya melihat");
  const gl = await api("GET", "/api/lapor/meja/hilang/info", undefined, lain); assert.equal(gl.j.info.filter(x => x.profil.id === p.id).length, 0, "wilayah lain tidak melihat");
  assert.equal((await api("GET", "/api/lapor/meja/hilang/info", undefined, ip(82))).s, 403, "tamu ditolak");
  const aksi = (id, b, h = meja) => api("POST", `/api/lapor/meja/hilang/${id}/aksi`, b, h);
  assert.equal((await aksi(p.id, {aksi: "turunkan", alasan: "dicabut"}, lain)).s, 404, "wilayah lain");
  assert.equal((await aksi(p.id, {aksi: "turunkan", alasan: "asal"})).s, 400);
  const info2 = baris.find(x => x.jenis === "orang_ini").id;
  assert.equal((await aksi(p.id, {aksi: "teruskan_info", info: info2})).s, 200); assert.equal((await DB.prepare("SELECT status FROM oh_info WHERE id = ?").bind(info2).first()).status, "diteruskan");
  const t = await aksi(p.id, {aksi: "turunkan", alasan: "dicabut", catatan: "diverifikasi lewat telepon ke 0812 3456 7890"}); assert.equal(t.s, 200, t.t);
  assert.deepEqual(await baca(p.id), {status: "turun", alasan_turun: "dicabut"}); const rw = await H.ohRiwayat(env, STAF, p.id); assert.ok(rw.at(-1).alasan === "turun_dicabut" && !rw.at(-1).catatan.includes("3456 7890"), "catatan lolos samarkan");
  assert.equal((await aksi(p.id, {aksi: "turunkan", alasan: "dicabut"})).s, 409, "sudah turun");
  assert.equal((await aksi(p.id, {aksi: "selesai_info", info: info2})).s, 200); assert.equal((await aksi(p.id, {aksi: "selesai_info", info: info2})).s, 409, "sudah selesai");
  assert.equal((await aksi(p.id, {aksi: "selesai_info", info: "9".repeat(16)})).s, 409, "info bukan milik profil ini");
  const sisa = await api("GET", "/api/lapor/meja/hilang/info", undefined, meja); assert.ok(!sisa.j.info.some(x => x.id === info2), "yang selesai keluar dari antrean");
});

uji("2.19 lokasi penemuan tidak sampai ke pelapor orang hilang: saya/*, info, daftar, detail tidak memuatnya (D19)", async () => {
  const p = await buat({nomor: WA[3]}), H4 = await sesi(WA[3]), RAHASIA = "Gudang Kapuk Rahasia Lokasi Temu";
  await DB.prepare("INSERT INTO oh_temu (id, nomor_penemu, kab, lokasi_teks, lat, lon, waktu_temu, kondisi, ucapan, dibuat) VALUES (?, '6281277777777', ?, ?, -6.123, 106.456, ?, 'sadar', 'ucapan rahasia', ?)").bind("7".repeat(16), KAB, RAHASIA, kini, kini).run();
  const badan = [(await api("GET", "/api/lapor/hilang/saya", undefined, {...H4, ...ip(95)})).t, (await info({jenis: "informasi", token: p.token, pesan: "Mungkin di gudang"}, {...H4, ...ip(96)})).t, (await api("GET", "/api/lapor/hilang", undefined, ip(97))).t, (await api("GET", `/api/lapor/hilang/${p.token}`, undefined, ip(98))).t];
  for (const t of badan) for (const k of [RAHASIA, "Kapuk", "6281277777777", "106.456", "-6.123", "ucapan rahasia"]) assert.ok(!t.includes(k), `bocor: ${k}`);
});
