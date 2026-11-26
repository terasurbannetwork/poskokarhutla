/* Kabar selamat dan orang dicari (K91, D126-D130; TIKET LA-80) di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya.
   RENCANA-UJI §22. Jalankan: node --test tests/lapor/selamat.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import {JPEG_SAH} from "../warga/_bantu.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {bersihkanLapor} from "../../src/lapor_ai.js";

const uji = berantai();
const MESIN = {authorization: "Bearer mesin-rahasia"};
const U = await siapkan("uji-lapor-selamat", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const WA = "6281200000051", WA2 = "6281200000052", WA_DICARI = "6281200000061", WA_LAIN = "6281200000062";
const KAB = "32.01", KAB_LAIN = "32.73";
const sesi = async (wa, i) => {   // sesi /masuk: nomor terbukti lewat kode (mk_akun + mk_sesi, seperti hasil /api/masuk/periksa)
  const mk = "mk" + String(i).padStart(14, "0"), tok = (String(i).padStart(2, "0") + "7e").repeat(32).slice(0, 64), kini = Date.now();
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, ?, 'Warga Uji', 'aktif', ?)").bind(mk, wa, kini),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(sha256(tok), mk, kini, kini, kini + 3600e3)]);
  return {cookie: `sesi_masuk=${tok}`, origin: "http://bnpb.lokal", "x-pb": "1"};
};
const bpbd = async (nu, kab) => {   // akun BPBD kab/kota + sesi profil (paket profil-bpbd)
  const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, 'pemkab', 'kab', 'Wilayah uji', ?, ?, '32', ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "selamatuji" + nu, `32|${kab}`, JSON.stringify(["32"]), kab, "g".repeat(32), "0".repeat(64), `selamat${nu}@b.id`, "62812001" + String(nu).padStart(4, "0"), Date.now()).run();
  return {cookie: (await profilAktif(DB, id)).cookie, origin: "http://bnpb.lokal", "x-pb": "1"};
};
let H1, H2, tautan, token;
const tanda = (h, b = {}) => api("POST", "/api/lapor/selamat", {nama_panggil: "Budi", status: "selamat", kab: KAB, ...b}, h);

uji("tanpa sesi kode sekali pakai: ditolak 401 yang menyuruh minta kode; nomor ketikan tidak cukup", async () => {
  for (const [m, j, b] of [["POST", "/api/lapor/selamat", {nama_panggil: "Budi", status: "selamat", kab: KAB}], ["DELETE", "/api/lapor/selamat"], ["GET", "/api/lapor/selamat/saya"],
    ["POST", "/api/lapor/cari", {nama_dicari: "Ani", kab: KAB}]]) {
    const r = await api(m, j, b); assert.equal(r.s, 401, `${m} ${j}`); assert.match(r.j.galat, /kode/i);
  }
  const ketik = await api("POST", "/api/lapor/selamat", {wa: WA, nama_panggil: "Budi", status: "selamat", kab: KAB}, {"x-pb": "1", origin: "http://bnpb.lokal"});
  assert.equal(ketik.s, 401); assert.match(ketik.j.galat, /kode/i);
  assert.equal((await api("POST", "/api/lapor/selamat", {wa: WA, nama_panggil: "Budi", status: "selamat", kab: KAB}, MESIN)).s, 401, "kunci mesin bukan pemilik nomor");
  assert.equal(await n("lapor_selamat"), 0);
});

uji("dengan sesi: x-pb wajib, isian divalidasi, tanda dibuat dengan tautan 7 hari", async () => {
  H1 = await sesi(WA, 1); H2 = await sesi(WA2, 2);
  assert.equal((await tanda({cookie: H1.cookie, origin: H1.origin})).s, 403, "tanpa x-pb");
  for (const b of [{nama_panggil: ""}, {nama_panggil: "Budi 081234567890"}, {nama_panggil: "0812 3456 7890"}, {nama_panggil: "0812-3456-7890"}, {status: "aman"}, {kab: "99.99"}, {kab: "Bogor"}]) assert.equal((await tanda(H1, b)).s, 400, JSON.stringify(b));
  const r = await tanda(H1); assert.equal(r.s, 200, r.t);
  assert.match(r.j.tautan, /^\/lapor\/s\/[A-Za-z0-9_-]{43}$/); tautan = r.j.tautan; token = tautan.split("/").pop();
  assert.ok(Math.abs(r.j.kedaluwarsa - Date.now() - 7 * 864e5) < 60e3, "berlaku 7 hari");
  assert.equal(r.j.kab_nama, "Bogor");
  assert.equal(await n("tautan_token", `jenis = 'selamat' AND token_sha = '${sha256(token)}'`), 1, "token.js: hanya sha256 token");
  assert.equal(await n("tautan_token", `token_sha = '${token}'`), 0);
  const s = await api("GET", "/api/lapor/selamat/saya", undefined, H1); assert.equal(s.s, 200); assert.equal(s.j.tanda.nama_panggil, "Budi"); assert.equal(s.j.tanda.token, undefined);
});

uji("GET token publik: hanya nama panggilan, status, waktu, kab/kota; tanpa nomor, titik, desa", async () => {
  const r = await api("GET", `/api/lapor/s/${token}`); assert.equal(r.s, 200, r.t);
  assert.deepEqual(Object.keys(r.j).sort(), ["kab", "kab_nama", "label", "nama_panggil", "status", "waktu"]);
  assert.doesNotMatch(r.t, /6281200000|lat|lon|desa|nomor/i);
  assert.equal(r.h.get("cache-control"), "private, no-store"); assert.match(r.h.get("x-robots-tag"), /noindex/);
});

uji("tanda baru mengganti yang lama; satu tanda aktif per nomor", async () => {
  const r = await tanda(H1, {nama_panggil: "Budi S", status: "butuh_bantuan"}); assert.equal(r.s, 200);
  const baru = r.j.tautan.split("/").pop(); assert.notEqual(baru, token);
  assert.equal((await api("GET", `/api/lapor/s/${token}`)).s, 404, "tautan lama dicabut");
  assert.equal((await api("GET", `/api/lapor/s/${baru}`)).j.status, "butuh_bantuan");
  assert.equal(await n("lapor_selamat", "dicabut IS NULL"), 1); assert.equal(await n("lapor_selamat"), 2);
  assert.equal(await n("tautan_token", "jenis = 'selamat' AND dicabut IS NOT NULL"), 1, "tautan lama dicabut di tautan_token");
  token = baru;
});

uji("dicabut, kedaluwarsa, dan tak dikenal: 404 dengan pesan yang sama persis", async () => {
  const tak = await api("GET", `/api/lapor/s/${"A".repeat(43)}`), rusak = await api("GET", "/api/lapor/s/xyz");
  assert.equal(tak.s, 404); assert.equal(rusak.t, tak.t);
  await DB.prepare("UPDATE lapor_selamat SET kedaluwarsa = ? WHERE dicabut IS NULL AND nomor = ?").bind(Date.now() - 1, WA).run();
  const ked = await api("GET", `/api/lapor/s/${token}`); assert.equal(ked.s, 404); assert.equal(ked.t, tak.t, "kedaluwarsa");
  await DB.prepare("UPDATE lapor_selamat SET kedaluwarsa = ? WHERE dicabut IS NULL AND nomor = ?").bind(Date.now() + 864e5, WA).run();
  assert.equal((await api("GET", `/api/lapor/s/${token}`)).s, 200);
  assert.equal((await api("DELETE", "/api/lapor/selamat", undefined, H1)).j.dicabut, true);
  const cab = await api("GET", `/api/lapor/s/${token}`); assert.equal(cab.s, 404); assert.equal(cab.t, tak.t, "dicabut");
  assert.equal((await api("GET", "/api/lapor/selamat/saya", undefined, H1)).j.tanda, null);
  assert.equal((await api("DELETE", "/api/lapor/selamat", undefined, H1)).j.dicabut, false);
});

const cari = (h, b = {}) => api("POST", "/api/lapor/cari", {nama_dicari: "Siti Aminah", ciri: "tinggi, kerudung biru", lokasi_terakhir: "Dekat pasar", waktu_terakhir: "kemarin sore", hubungan: "anak", kab: KAB, ...b}, h);
uji("orang dicari: validasi, nomor dinormalkan, tidak tampil publik", async () => {
  assert.equal((await cari(H1, {nama_dicari: "A"})).s, 400); assert.equal((await cari(H1, {kab: "99.99"})).s, 400); assert.equal((await cari(H1, {nomor_dicari: "123"})).s, 400);
  const r = await cari(H1, {nomor_dicari: "081200000061"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.status, "buka");
  const r2 = await cari(H1, {nama_dicari: "Budi Santoso", nomor_dicari: WA_LAIN, kab: KAB_LAIN}); assert.equal(r2.s, 200);
  const r3 = await cari(H1, {nama_dicari: "Siti Aminah", nomor_dicari: WA_LAIN}); assert.equal(r3.s, 200);   // nama sama, nomor lain
  assert.equal((await DB.prepare("SELECT nomor_dicari FROM lapor_cari WHERE id = ?").bind(r.j.id).first()).nomor_dicari, WA_DICARI);
  assert.equal((await api("GET", "/api/lapor/alun")).t.includes("Siti"), false, "tidak masuk alun-alun");
  assert.equal(await n("lapor_tiket"), 0, "tidak membuat laporan atau tiket");
  assert.equal((await cari(H1)).s, 200); assert.equal((await cari(H1)).s, 200);
  assert.equal((await cari(H1)).s, 429, "batas 5 per nomor per hari");
});

uji("Laporan saya: pencari melihat laporan orang dicari miliknya saja, tanpa nomor dan ciri", async () => {
  const s1 = await api("GET", "/api/lapor/selamat/saya", undefined, H1); assert.equal(s1.s, 200, s1.t);
  assert.ok(s1.j.cari.length >= 5); assert.ok(s1.j.cari.every(r => r.status === "buka" && r.id && r.kab_nama));
  assert.equal(s1.t.includes(WA_DICARI) || s1.t.includes("kerudung") || s1.t.includes("nomor"), false, "tanpa nomor siapa pun dan tanpa ciri");
  const s2 = await api("GET", "/api/lapor/selamat/saya", undefined, H2); assert.equal(s2.s, 200); assert.deepEqual(s2.j.cari, [], "nomor lain tidak melihat milik H1");
});

uji("meja: BNPB melihat semua; cocok hanya bila nomor sama persis dengan tanda aktif (bukan nama)", async () => {
  const dicari = await sesi(WA_DICARI, 3);
  const a = await api("GET", "/api/lapor/meja/cari", undefined, ADMIN); assert.equal(a.s, 200, a.t);
  assert.equal(a.j.baris.length, 5); assert.equal(a.j.baris.filter(b => b.cocok).length, 0, "belum ada tanda");
  assert.equal((await tanda(dicari, {nama_panggil: "Siti"})).s, 200);
  const b = (await api("GET", "/api/lapor/meja/cari", undefined, ADMIN)).j.baris, cocok = b.filter(x => x.cocok);
  assert.equal(cocok.length, 1); assert.equal(cocok[0].nomor_dicari, WA_DICARI); assert.equal(cocok[0].tanda.status, "selamat"); assert.ok(cocok[0].tanda.waktu);
  assert.equal(b.filter(x => x.nama_dicari === "Siti Aminah" && x.nomor_dicari === WA_LAIN).every(x => !x.cocok), true, "nama sama, nomor beda: tidak cocok");
  assert.equal(b.every(x => x.nomor_pencari === WA), true, "nomor pencari tampil untuk staf");
  await api("DELETE", "/api/lapor/selamat", undefined, dicari);
  assert.equal((await api("GET", "/api/lapor/meja/cari", undefined, ADMIN)).j.baris.filter(x => x.cocok).length, 0, "tanda dicabut: tidak cocok");
  await tanda(dicari, {nama_panggil: "Siti"});
  assert.equal((await api("GET", "/api/lapor/meja/cari", undefined, {})).s, 403, "tamu ditolak");
  assert.equal((await api("GET", "/api/lapor/meja/cari", undefined, H1)).s, 403, "sesi /masuk warga bukan meja");
});

uji("meja BPBD: hanya kab wilayahnya", async () => {
  const bogor = await bpbd(1, KAB), bandung = await bpbd(2, KAB_LAIN);
  const a = await api("GET", "/api/lapor/meja/cari", undefined, bogor); assert.equal(a.s, 200, a.t);
  assert.equal(a.j.baris.length, 4); assert.ok(a.j.baris.every(x => x.kab === KAB));
  const b = await api("GET", "/api/lapor/meja/cari", undefined, bandung);
  assert.equal(b.j.baris.length, 1); assert.equal(b.j.baris[0].kab, KAB_LAIN);
  H1.bogor = bogor; H1.bandung = bandung;
});

uji("status: tulis riwayat append-only, mengisi ditutup dan ditutup_oleh; luar wilayah 404", async () => {
  const {bogor, bandung} = H1, id = (await DB.prepare("SELECT id FROM lapor_cari WHERE kab = ? ORDER BY dibuat LIMIT 1").bind(KAB).first()).id;
  const st = (h, b) => api("POST", `/api/lapor/meja/cari/${id}/status`, b, h);
  assert.equal((await st({cookie: bogor.cookie, origin: bogor.origin}, {status: "tutup"})).s, 403, "tanpa x-pb");
  assert.equal((await st(bandung, {status: "tutup"})).s, 404, "luar wilayah");
  assert.equal((await st(bogor, {status: "hilang"})).s, 400);
  assert.equal(await n("lapor_cari_riwayat"), 0);
  const r = await st(bogor, {status: "ke_sar", catatan: "diteruskan ke SAR"}); assert.equal(r.s, 200, r.t);
  assert.equal(await n("lapor_cari_riwayat", `cari_id = '${id}'`), 1);
  const baris = await DB.prepare("SELECT status, ditutup, ditutup_oleh FROM lapor_cari WHERE id = ?").bind(id).first();
  assert.equal(baris.status, "ke_sar"); assert.ok(baris.ditutup); assert.match(baris.ditutup_oleh, /^BPBD /);
  assert.equal((await st(ADMIN, {status: "ditemukan_selamat"})).s, 200);
  assert.equal(await n("lapor_cari_riwayat", `cari_id = '${id}'`), 2, "riwayat bertambah, tidak menimpa");
  assert.equal((await DB.prepare("SELECT status FROM lapor_cari_riwayat WHERE cari_id = ? ORDER BY id").bind(id).all()).results.map(x => x.status).join(), "ke_sar,ditemukan_selamat");
  assert.equal((await st(ADMIN, {status: "buka"})).s, 200);
  assert.equal((await DB.prepare("SELECT ditutup, ditutup_oleh FROM lapor_cari WHERE id = ?").bind(id).first()).ditutup, null, "dibuka lagi: penutupan dikosongkan");
});

uji("bersih-bersih: tanda selamat lebih dari 30 hari dihapus, yang baru tetap", async () => {
  const ada = await n("lapor_selamat");
  await DB.prepare("INSERT INTO lapor_selamat (id, nomor, nama_panggil, status, kab, token_id, dibuat, kedaluwarsa) VALUES ('aaaaaaaaaaaaaaaa', ?, 'Lama', 'selamat', ?, ?, ?, ?)")
    .bind(WA2, KAB, "bbbbbbbbbbbbbbbb", Date.now() - 31 * 864e5, Date.now() - 24 * 864e5).run();
  await bersihkanLapor({DB}, Date.now());
  assert.equal(await n("lapor_selamat", "id = 'aaaaaaaaaaaaaaaa'"), 0); assert.equal(await n("lapor_selamat"), ada);
});

uji("bersih-bersih: orang dicari ditutup lebih dari 2 tahun dianonimkan, yang lain utuh, riwayat tetap (Q67)", async () => {
  const kini = Date.now(), ins = (id, st, dibuat, ditutup) => DB.prepare("INSERT INTO lapor_cari (id, nomor_pencari, nama_dicari, ciri, lokasi_terakhir, nomor_dicari, hubungan, kab, status, dibuat, ditutup, ditutup_oleh) VALUES (?, ?, 'Budi Lama', 'topi', 'pasar', ?, 'anak', ?, ?, ?, ?, 'uji')")
    .bind(id, WA, WA_DICARI, KAB, st, dibuat, ditutup).run();
  await ins("q67lama000000001", "tutup", kini - 900 * 864e5, kini - 800 * 864e5);
  await ins("q67satu000000001", "tutup", kini - 400 * 864e5, kini - 365 * 864e5);
  await ins("q67buka000000001", "buka", kini - 1100 * 864e5, null);
  await DB.prepare("INSERT INTO lapor_cari_riwayat (cari_id, status, catatan, oleh, waktu) VALUES ('q67lama000000001', 'tutup', 'rahasia', 'uji', ?)").bind(kini).run();
  const MEDIA = await U.mf.getR2Bucket("MEDIA"), kf = id => `lapor/foto/${id}.jpg`;
  for (const [c, fo] of [["q67lama000000001", "c".repeat(16)], ["q67satu000000001", "d".repeat(16)]]) {
    await DB.prepare("INSERT INTO lapor_cari_foto (cari_id, foto_id) VALUES (?, ?)").bind(c, fo).run(); await MEDIA.put(kf(fo), "x"); }
  await bersihkanLapor({DB, MEDIA}, kini);
  assert.equal(await MEDIA.head(kf("c".repeat(16))), null, "foto orang dicari yang dianonimkan ikut dihapus"); assert.ok(await MEDIA.head(kf("d".repeat(16))), "foto laporan lain tetap");
  assert.equal(await n("lapor_cari_foto", "cari_id = 'q67lama000000001'"), 0); assert.equal(await n("lapor_cari_foto", "cari_id = 'q67satu000000001'"), 1);
  const g = id => DB.prepare("SELECT * FROM lapor_cari WHERE id = ?").bind(id).first();
  const a = await g("q67lama000000001");
  assert.equal(a.nama_dicari, "dihapus"); assert.equal(a.nomor_pencari, "62000000000");
  for (const k of ["ciri", "lokasi_terakhir", "nomor_dicari", "hubungan"]) assert.equal(a[k], null, k);
  assert.equal(a.kab, KAB); assert.equal(a.status, "tutup"); assert.ok(a.dibuat && a.ditutup);
  for (const id of ["q67satu000000001", "q67buka000000001"]) { const b = await g(id); assert.equal(b.nama_dicari, "Budi Lama"); assert.equal(b.nomor_pencari, WA); assert.equal(b.ciri, "topi"); }
  assert.equal(await n("lapor_cari_riwayat", "cari_id = 'q67lama000000001'"), 1, "riwayat tak disentuh");
});

uji("gerbang teks: kata \"aman\" tidak ada di berkas rute dan pesan fitur ini", async () => {
  assert.doesNotMatch(readFileSync(new URL("../../src/lapor_selamat.js", import.meta.url), "utf8"), /\baman\b/i);
  const semua = [await tanda(H2, {kab: "99.99"}), await tanda(H2, {nama_panggil: ""}), await api("POST", "/api/lapor/selamat", {}), await api("GET", `/api/lapor/s/${"B".repeat(43)}`)];
  for (const r of semua) assert.doesNotMatch(r.t, /\baman\b/i);
});

uji("basis data: satu tanda aktif per nomor (indeks unik) dan riwayat orang dicari tak bisa diubah atau dihapus", async () => {
  await tanda(H2);
  await assert.rejects(DB.prepare("INSERT INTO lapor_selamat (id, nomor, nama_panggil, status, kab, token_id, dibuat, kedaluwarsa) VALUES ('cccccccccccccccc', ?, 'X', 'selamat', ?, 'dddddddddddddddd', 1, 2)").bind(WA2, KAB).run(), /UNIQUE/i);
  await assert.rejects(DB.prepare("UPDATE lapor_cari_riwayat SET catatan = 'ubah'").run(), /append-only/);
  await assert.rejects(DB.prepare("DELETE FROM lapor_cari_riwayat").run(), /append-only/);
});

uji("kunci laju per nomor bukan nomor mentah", async () => {
  assert.ok(await n("laju_bnpb", "aksi LIKE 'lapor.selamat%' OR aksi LIKE 'lapor.cari.baru%'") > 0);
  assert.equal(await n("laju_bnpb", "kunci GLOB '*62[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'"), 0);
});

uji("metode lain: 405 dengan Allow memuat DELETE", async () => {
  const r = await api("PUT", "/api/lapor/selamat", {}, H1); assert.equal(r.s, 405);
  assert.match(r.h.get("allow"), /DELETE/); assert.match(r.h.get("allow"), /POST/);
});

uji("halaman /lapor/s/<token> tamu: melayani halaman tautan dengan noindex dan tanpa referrer", async () => {
  const r = await api("GET", `/lapor/s/${"A".repeat(43)}`);
  assert.equal(r.s, 200); assert.match(r.t, /Kabar selamat/);
  assert.match(r.h.get("x-robots-tag"), /noindex/); assert.equal(r.h.get("referrer-policy"), "no-referrer"); assert.match(r.h.get("cache-control"), /no-store/);
});

uji("orang dicari lewat obrolan (pemilik 25 Nov 2026): tanpa kode, baris lapor_cari ditulis dengan nomor pengirim, tanpa tiket", async () => {
  const MESIN_H = {authorization: "Bearer mesin-rahasia"}, WA_CHAT = "6281200000071";
  assert.equal((await api("POST", "/api/lapor/izin", {wa: WA_CHAT}, MESIN_H)).s, 200);
  const tiket0 = await n("lapor_tiket"), cari0 = await n("lapor_cari");
  const kirimP = b => api("POST", "/api/lapor/pesan", {wa: WA_CHAT, ...b}, MESIN_H);
  let r;
  for (const t of ["orang hilang", "1", "1", "Rina Wati"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 300)); }
  r = await kirimP({lokasi: {lat: -6.6, lon: 106.8, akurasi: 12}}); assert.equal(r.s, 200, r.t.slice(0, 300));
  if (/Benar/.test(r.t)) r = await kirimP({teks: "1"});   // konfirmasi desa bila pembaca wilayah tersedia
  r = await kirimP({teks: "Joko"}); assert.equal(r.s, 200, r.t.slice(0, 300));
  r = await kirimP({teks: "Lewati"}); assert.match(r.t, /Nama panggilan wajib diisi/, "nama panggilan wajib, Lewati ditolak (pemilik 26 Nov 2026)");
  // nama panggilan, hubungan, kelamin, umur, tinggi tidak tahu, berat, pakaian, tanda 
  await DB.prepare("DELETE FROM laju_bnpb").run();   // alur ini lebih dari 20 pesan dalam semenit; kuota diuji di berkas lain
  for (const t of ["Jojo", "4", "Tidak tahu", "Tidak tahu"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 300)); }
  assert.match(r.t, /Tinggi badan Joko/); assert.equal(r.j.satuan, "cm");
  r = await kirimP({teks: "400"}); assert.match(r.t, /antara 30 dan 250 cm/, "tinggi di luar batas wajar ditanya ulang");
  for (const t of ["Tidak tahu", "55", "Lewati", "Lewati"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 300)); }
  assert.match(r.t, /Foto Joko/, "sesudah ciri: foto orang dicari");
  const f = await api("POST", "/api/lapor/foto", {wa: WA_CHAT, data: Buffer.from(JPEG_SAH).toString("base64")}, MESIN_H);   // dari galeri: tanpa lokasi, tetap diterima
  assert.equal(f.s, 200, f.t.slice(0, 300)); assert.match(f.t, /Foto diterima/); const fid = f.j.fotoBaru.id;
  assert.ok(await U.mf.getR2Bucket("MEDIA").then(b => b.head(`lapor/foto/${fid}.jpg`)), "berkas foto di R2");
  for (const t of ["Lanjut", "1", "Tidak tahu", "Pakai nomor saya", "Posko SDN 1 Paledang, Jl. Paledang"]) { r = await kirimP({teks: t}); assert.equal(r.s, 200, r.t.slice(0, 300)); }
  assert.match(r.t, /Foto: ada/);
  assert.match(r.t, /Ringkasan laporan orang dicari/);
  r = await kirimP({teks: "1"}); assert.equal(r.s, 200, r.t.slice(0, 300)); assert.match(r.t, /Laporan orang dicari diterima/);
  // penilaian di layar terima kasih cari orang (tanpa nomor tiket) menempel pada sesi itu (pemilik 26 Nov 2026: "Pengalamannya gimana?")
  const nl = await api("POST", "/api/lapor/nilai", {wa: WA_CHAT, nilai: 5, cari: true}, MESIN_H); assert.equal(nl.s, 200, nl.t.slice(0, 300));
  assert.equal(await n("lapor_cari"), cari0 + 1); assert.equal(await n("lapor_tiket"), tiket0, "tidak membuat tiket");
  const b = await DB.prepare("SELECT nomor_pencari, nama_dicari, hubungan, waktu_terakhir, nomor_dicari, status FROM lapor_cari ORDER BY dibuat DESC LIMIT 1").first();
  assert.deepEqual(b, {nomor_pencari: WA_CHAT, nama_dicari: "Joko", hubungan: "Saudara", waktu_terakhir: "Hari ini", nomor_dicari: null, status: "buka"});
  const t = await DB.prepare("SELECT cari_id, panggilan, nomor_kontak, tempat_tunggu FROM lapor_cari_temu ORDER BY rowid DESC LIMIT 1").first();
  assert.deepEqual({...t, cari_id: undefined}, {cari_id: undefined, panggilan: "Jojo", nomor_kontak: WA_CHAT, tempat_tunggu: "Posko SDN 1 Paledang, Jl. Paledang"}, "nomor kontak dan tempat tunggu tersimpan (0177)");
  assert.equal((await DB.prepare("SELECT foto_id FROM lapor_cari_foto WHERE cari_id = ?").bind(t.cari_id).first())?.foto_id, fid, "foto tertaut ke laporan (0185)");
});
