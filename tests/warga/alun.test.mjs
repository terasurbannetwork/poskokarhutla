/* Alun-alun (src/alun.js) di atas D1 lokal sungguhan (Miniflare, worker.js utuh): migrasi 0024, CHECK, enum JS == CHECK, tulis, pengumuman, upvote,
   aduan, terjawab, laju, dummy, halaman publik dan admin. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: alun.js mengimpornya balik (siklus), urutan yang sama dengan produksi
import {JENIS, BANTUAN, ALASAN, MODERASI, TERUSKAN, bersihPanjang, kunciDaftar} from "../../src/alun.js";

const U = await siapkan("uji-alun"), uji = berantai();
const ip = n => ({"cf-connecting-ip": `10.9.0.${n}`});
const SAH = {jenis: "tanya", judul: "Air bersih di mana?", teks: "Kami butuh air bersih di dusun kami.", bencana: "banjir", prov: "33", kab: "Kabupaten Demak"};
const tulis = (b, h = ip(1)) => U.api("POST", "/api/alun", {...SAH, ...b}, h);
const ID = /^[0-9a-f]{16}$/;
const sql = async t => (await U.DB.prepare("SELECT sql FROM sqlite_master WHERE name = ?").bind(t).first()).sql;
const enumSql = (s, kol) => [...s.match(new RegExp(`${kol} IN \\(([^)]*)\\)`))[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const DEPAN = {utas: null}, S1 = {};

uji("migrasi 0024 idempoten (dijalankan ulang tanpa merusak isi)", async () => {
  const f = readFileSync(path.join(AKAR, "migrations/0024_alun.sql"), "utf8");
  const a = await tulis({}); assert.equal(a.s, 201);
  await U.DB.batch(pecah(f).map(s => U.DB.prepare(s)));
  assert.equal(await U.n("alun_utas"), 1);
  DEPAN.utas = a.j;
});

uji("enum JS sama persis dengan CHECK migrasi", async () => {
  const u = await sql("alun_utas"), b = await sql("alun_balas"), s = await sql("alun_suara");
  assert.deepEqual(enumSql(u, "jenis"), JENIS);
  assert.deepEqual(enumSql(u, "bantuan"), BANTUAN);
  assert.deepEqual(enumSql(u, "teruskan_ke").sort(), [...TERUSKAN].sort());
  assert.deepEqual(enumSql(u, "moderasi"), MODERASI);
  assert.deepEqual(enumSql(b, "moderasi"), MODERASI);
  assert.deepEqual(enumSql(s, "alasan"), ALASAN);
});

uji("CHECK menolak isian liar langsung di D1", async () => {
  const ins = (kol, v) => U.DB.prepare(`INSERT INTO alun_utas (id, jenis, judul, teks, bencana, prov, pemilik_sha, dibuat${kol}) VALUES (?, ?, ?, ?, ?, ?, ?, 1${v})`);
  const dasar = ["abcdef0123456789", "tanya", "Judul sah", "teks", "banjir", "33", "0".repeat(64)];
  await assert.rejects(ins("", "").bind("abcdef0123456780", "liar", ...dasar.slice(2)).run(), /CHECK/, "jenis liar");
  await assert.rejects(ins("", "").bind(dasar[0], "butuh_bantuan", ...dasar.slice(2)).run(), /CHECK/, "butuh_bantuan tanpa status");
  await assert.rejects(ins(", bantuan", ", 'terbuka'").bind(...dasar).run(), /CHECK/, "status pada jenis lain");
  await assert.rejects(ins(", sematan", ", 1").bind(...dasar).run(), /CHECK/, "sematan bukan pengumuman");
  await assert.rejects(ins(", lat", ", 1.0").bind(...dasar).run(), /CHECK/, "lat tanpa lon");
  await assert.rejects(ins(", lat, lon", ", 50, 100").bind(...dasar).run(), /CHECK/, "lat di luar Indonesia");
  await assert.rejects(ins("", "").bind(dasar[0], dasar[1], "ab", ...dasar.slice(3)).run(), /CHECK/, "judul terlalu pendek");
  await assert.rejects(ins("", "").bind(dasar[0], dasar[1], dasar[2], "x".repeat(1001), ...dasar.slice(4)).run(), /CHECK/, "teks 1001");
  await assert.rejects(ins("", "").bind(...dasar.slice(0, 4), "BANJIR!", "33", dasar[6]).run(), /CHECK/, "bencana bukan huruf kecil");
  await assert.rejects(ins("", "").bind(...dasar.slice(0, 5), "3x", dasar[6]).run(), /CHECK/, "prov bukan 2 digit");
  await assert.rejects(ins("", "").bind(...dasar.slice(0, 6), "zz").run(), /CHECK/, "pemilik_sha bukan hash");
  await assert.rejects(ins(", moderasi", ", 'liar'").bind(...dasar).run(), /CHECK/, "moderasi liar");
  await assert.rejects(ins(", terjawab_id", ", 'abcdef0123456789'").bind(...dasar).run(), /CHECK/, "terjawab tanpa waktu");
  await assert.rejects(U.DB.prepare("INSERT INTO alun_suara (pos_id, kunci, jenis, alasan, waktu) VALUES ('abcdef0123456789', 'kunci-a', 'aduan', NULL, 1)").run(), /CHECK/, "aduan tanpa alasan");
  await assert.rejects(U.DB.prepare("INSERT INTO alun_suara (pos_id, kunci, jenis, alasan, waktu) VALUES ('abcdef0123456789', 'kunci-a', 'upvote', 'spam', 1)").run(), /CHECK/, "upvote beralasan");
  await assert.rejects(U.DB.prepare("INSERT INTO alun_balas (id, utas_id, teks, dibuat) VALUES ('abcdef0123456789', 'abcdef0123456780', ?, 1)").bind("x".repeat(281)).run(), /CHECK/, "balasan 281");
});

uji("tulis utas sah: kode pemilik tampil sekali, hanya hash tersimpan, IP mentah tidak tersimpan", async () => {
  const r = await tulis({judul: "Bantuan perahu", jenis: "butuh_bantuan", lat: -6.9, lon: 110.6, nama: "Sari"}, ip(2));
  assert.equal(r.s, 201); assert.match(r.j.id, ID); assert.match(r.j.kode, /^[0-9a-f]{26}$/);
  const d = await U.DB.prepare("SELECT * FROM alun_utas WHERE id = ?").bind(r.j.id).first();
  assert.equal(d.pemilik_sha, sha256(r.j.kode)); assert.equal(d.bantuan, "terbuka");
  assert.ok(!JSON.stringify(d).includes("10.9.0.2"), "tanpa IP mentah");
  const g = await U.api("GET", "/api/alun/" + r.j.id);
  assert.equal(g.s, 200); assert.equal(g.j.nama, "Sari"); assert.ok(!g.t.includes("pemilik"), "hash pemilik tidak keluar");
  assert.ok(!g.t.includes(r.j.kode));
});

uji("tulis liar ditolak 400; kata kasar ditolak; URL dan nomor HP dibuang", async () => {
  for (const [b, re] of [[{jenis: "x"}, /jenis/], [{judul: "ab"}, /judul/], [{judul: "x".repeat(121)}, /judul/], [{teks: ""}, /teks|kosong/], [{teks: "a".repeat(1001)}, /1001|maksimal/],
    [{bencana: "tidakada"}, /bencana/], [{prov: "99"}, /prov/], [{prov: 33}, /prov/], [{lat: -6}, /lat/], [{lat: 80, lon: 100}, /lat/], [{nama: "x"}, /nama/], [{sematan: true}, /sematan/],
    [{teks: "kamu bangsat sekali"}, /kasar/], [{judul: "dasar kontol ini"}, /kasar/], [{nama: "anjing lu"}, /kasar/]]) {
    const r = await tulis(b, ip(3)); assert.equal(r.s, 400, JSON.stringify(b)); assert.match(r.j.galat, re);
  }
  assert.equal((await U.api("POST", "/api/alun", "bukan json", ip(3))).s, 400);
  const k = await tulis({teks: "Hubungi 0812 3456 7890 atau lihat https://contoh.com/x dan www.situs.id sekarang", nama: "Budi"}, ip(3));
  assert.equal(k.s, 201);
  const g = (await U.api("GET", "/api/alun/" + k.j.id)).j;
  assert.ok(!/0812|3456|contoh\.com|situs\.id/.test(g.teks), g.teks); assert.match(g.teks, /\[nomor dihapus\]/); assert.match(g.teks, /\[tautan dihapus\]/);
  // teks panjang (> 280): tautan dan nomor tetap dibuang, kata kasar tetap ditolak, nomor berspasi di batas potongan tertangkap
  const isi = "kata ".repeat(54) + "telepon 0812 3456 7890 " + "lagi ".repeat(40) + "https://jahat.example.com/aaa";
  const p = bersihPanjang(isi); assert.ok(!p.galat); assert.ok(!/0812|3456|jahat/.test(p.teks), p.teks);
  for (let n = 240; n < 300; n += 7) { const q = bersihPanjang("a ".repeat(n / 2) + "0812 3456 7890 selesai"); assert.ok(!/0812|3456/.test(q.teks), `n=${n}: ${q.teks.slice(n - 10)}`); }
  assert.ok(bersihPanjang("x ".repeat(200) + "bangsat dia").galat);
  assert.equal(await U.n("alun_utas", "teks LIKE '%0812%' OR teks LIKE '%jahat%'"), 0);
});

uji("pengumuman: ditolak untuk publik dan akun gerbang; sah untuk admin dan bisa disematkan", async () => {
  const p = {jenis: "pengumuman", judul: "Posko dibuka", teks: "Posko terpadu dibuka pukul 08.00.", bencana: "umum"};
  assert.equal((await tulis(p, ip(4))).s, 403);
  assert.equal((await U.api("POST", "/api/alun", {...SAH, ...p}, GERBANG)).s, 403, "akun gerbang situs bukan moderator");
  assert.equal(await U.n("alun_utas", "jenis = 'pengumuman'"), 0);
  const a = await U.api("POST", "/api/alun", {...SAH, ...p, sematan: true}, ADMIN);
  assert.equal(a.s, 201);
  const d = await U.api("GET", "/api/alun?jenis=pengumuman"); assert.equal(d.j.sematan.length, 1); assert.equal(d.j.sematan[0].resmi, true); assert.equal(d.j.sematan[0].sematan, true);
  const semua = await U.api("GET", "/api/alun"); assert.equal(semua.j.sematan.length, 1, "tersemat di atas"); assert.ok(!semua.j.utas.some(x => x.id === a.j.id), "tidak ganda");
  DEPAN.umum = a.j.id;
});

uji("balas: nama opsional, balasan petugas hanya moderator, balasan_n naik", async () => {
  const id = DEPAN.utas.id;
  const b1 = await U.api("POST", "/api/alun/balas/" + id, {teks: "Coba hubungi posko desa.", nama: "Tono"}, ip(5));
  assert.equal(b1.s, 201);
  assert.equal((await U.api("POST", "/api/alun/balas/" + id, {teks: "Resmi", petugas: true}, ip(5))).s, 403, "publik tidak bisa berlencana petugas");
  assert.equal((await U.api("POST", "/api/alun/balas/" + id, {teks: "Resmi", petugas: true}, {...GERBANG, ...ip(5)})).s, 403);
  const b2 = await U.api("POST", "/api/alun/balas/" + id, {teks: "Tim kami menuju lokasi.", petugas: true}, ADMIN);
  assert.equal(b2.s, 201);
  assert.equal((await U.api("POST", "/api/alun/balas/" + id, {teks: "bajingan"}, ip(5))).s, 400);
  assert.equal((await U.api("POST", "/api/alun/balas/" + id, {teks: "x".repeat(281)}, ip(5))).s, 400);
  assert.equal((await U.api("POST", "/api/alun/balas/abcdef0123456789", {teks: "halo"}, ip(5))).s, 404);
  const g = (await U.api("GET", "/api/alun/" + id)).j;
  assert.equal(g.balasan, 2); assert.equal(g.balasan_daftar.length, 2);
  assert.equal(g.balasan_daftar.find(x => x.id === b2.j.id).nama, "Petugas"); assert.equal(g.balasan_daftar.find(x => x.id === b2.j.id).petugas, true);
  DEPAN.b1 = b1.j.id; DEPAN.b2 = b2.j.id;
});

uji("upvote: satu per IP per pos, IP lain menambah", async () => {
  const id = DEPAN.utas.id, u = h => U.api("POST", "/api/alun/upvote/" + id, {}, h);
  assert.equal((await u(ip(11))).j.upvote, 1);
  const lagi = await u(ip(11)); assert.equal(lagi.s, 200); assert.equal(lagi.j.baru, false); assert.equal(lagi.j.upvote, 1);
  assert.equal((await u(ip(12))).j.upvote, 2);
  assert.equal((await U.api("POST", "/api/alun/upvote/" + DEPAN.b1, {}, ip(11))).j.upvote, 1, "balasan juga");
  assert.equal(await U.n("alun_suara", "pos_id = '" + id + "'"), 2);
  assert.equal((await U.api("POST", "/api/alun/upvote/abcdef0123456789", {}, ip(11))).s, 404);
});

uji("lapor: alasan wajib dari daftar tetap; 5 IP berbeda menyembunyikan; IP sama dihitung sekali", async () => {
  const k = await tulis({judul: "Utas yang akan dilaporkan"}, ip(6)), id = k.j.id, l = (n, alasan = "spam") => U.api("POST", "/api/alun/lapor/" + id, {alasan}, ip(n));
  assert.equal((await l(21, "liar")).s, 400); assert.equal((await U.api("POST", "/api/alun/lapor/" + id, {}, ip(21))).s, 400);
  assert.equal((await l(21)).j.tersembunyi, false);
  assert.equal((await l(21, "kasar")).j.baru, false, "IP sama tidak dihitung dua kali");
  assert.equal((await l(22, "hoaks")).j.tersembunyi, false);
  assert.equal((await U.DB.prepare("SELECT moderasi FROM alun_utas WHERE id = ?").bind(id).first()).moderasi, "dilaporkan");
  assert.equal((await U.api("GET", "/api/alun/" + id)).s, 200, "dilaporkan masih tampil");
  assert.equal((await l(23, "data_pribadi")).j.tersembunyi, false, "3 aduan tidak lagi cukup (ambang 5)");
  assert.equal((await l(24)).j.tersembunyi, false);
  assert.equal((await l(25, "lainnya")).j.tersembunyi, true);
  assert.equal((await U.api("GET", "/api/alun/" + id)).s, 404, "tersembunyi hilang dari publik");
  assert.ok(!(await U.api("GET", "/api/alun")).j.utas.some(x => x.id === id));
  assert.equal((await U.api("GET", "/api/alun/" + id, undefined, ADMIN)).s, 200, "admin tetap bisa melihat");
  // pengumuman tidak bisa dibungkam massa
  for (const n of [31, 32, 33, 34]) await U.api("POST", "/api/alun/lapor/" + DEPAN.umum, {alasan: "spam"}, ip(n));
  assert.notEqual((await U.DB.prepare("SELECT moderasi FROM alun_utas WHERE id = ?").bind(DEPAN.umum).first()).moderasi, "tersembunyi");
  DEPAN.sembunyi = id;
});

uji("terjawab: hanya pemilik (x-kode) atau moderator; kode salah 403; balasan harus dari utas itu", async () => {
  const id = DEPAN.utas.id, kode = DEPAN.utas.kode, t = (b, h) => U.api("POST", "/api/alun/terjawab/" + id, b, h);
  assert.equal((await t({balasan_id: DEPAN.b1}, ip(40))).s, 403, "tanpa kode");
  assert.equal((await t({balasan_id: DEPAN.b1}, {...ip(40), "x-kode": "0".repeat(26)})).s, 403, "kode salah");
  assert.equal((await t({balasan_id: DEPAN.b1}, {...GERBANG, ...ip(40)})).s, 403, "akun gerbang bukan moderator");
  const lain = (await tulis({judul: "Utas orang lain"}, ip(41))).j;
  assert.equal((await t({balasan_id: DEPAN.b1}, {...ip(40), "x-kode": lain.kode})).s, 403, "kode utas lain");
  assert.equal((await t({balasan_id: DEPAN.b1}, {...ip(40), "x-kode": kode})).s, 200);
  let g = (await U.api("GET", "/api/alun/" + id)).j; assert.equal(g.terjawab, true); assert.equal(g.terjawab_id, DEPAN.b1);
  assert.equal((await t({balasan_id: "abcdef0123456789"}, {...ip(40), "x-kode": kode})).s, 404, "balasan tak ada");
  assert.equal((await t({balasan_id: null}, ADMIN)).s, 200); g = (await U.api("GET", "/api/alun/" + id)).j; assert.equal(g.terjawab, false);
  assert.equal((await t({balasan_id: DEPAN.b2}, MOD2)).s, 200, "moderator lain boleh");
  assert.equal((await U.api("POST", "/api/alun/terjawab/" + DEPAN.umum, {balasan_id: DEPAN.b1}, ADMIN)).s, 400, "pengumuman");
});

uji("daftar: filter, urutan, kursor; tidak membocorkan data pemilik", async () => {
  for (let i = 0; i < 23; i++) await U.DB.prepare("INSERT INTO alun_utas (id, jenis, judul, teks, bencana, prov, pemilik_sha, upvote, dibuat) VALUES (?, 'info_lapangan', ?, 'isi', 'gempa', '52', ?, ?, ?)")
    .bind("a0000000000000" + String(i).padStart(2, "0"), `Info ${i}`, "1".repeat(64), i, 1000 + i).run();
  const p1 = (await U.api("GET", "/api/alun?jenis=info_lapangan&bencana=gempa&prov=52")).j;
  assert.equal(p1.utas.length, 20); assert.equal(p1.berikut, "20"); assert.equal(p1.utas[0].judul, "Info 22");
  const p2 = (await U.api("GET", "/api/alun?jenis=info_lapangan&bencana=gempa&kursor=20")).j; assert.equal(p2.utas.length, 3); assert.equal(p2.berikut, null);
  assert.equal((await U.api("GET", "/api/alun?jenis=info_lapangan&urut=terpopuler")).j.utas[0].judul, "Info 22");
  const bt = (await U.api("GET", "/api/alun?urut=belum_terjawab")).j.utas; assert.ok(bt.length && bt.every(x => ["tanya", "butuh_bantuan"].includes(x.jenis) && !x.terjawab));
  for (const q of ["jenis=x", "prov=99", "urut=acak", "kursor=-1", "bencana=A!"]) assert.equal((await U.api("GET", "/api/alun?" + q)).s, 400, q);
  const t = (await U.api("GET", "/api/alun")).t; assert.ok(!/pemilik|kode|"ip/.test(t));
});

uji("moderasi admin: tampilkan, sembunyikan, hapus, sematan, status, teruskan; non-moderator 403", async () => {
  const a = (id, b, h = ADMIN) => U.api("POST", "/api/alun/admin/" + id, b, h);
  const id = DEPAN.sembunyi;
  assert.equal((await a(id, {aksi: "tampilkan"}, ip(50))).s, 403); assert.equal((await a(id, {aksi: "tampilkan"}, GERBANG)).s, 403);
  assert.equal((await a(id, {aksi: "liar"})).s, 400);
  assert.equal((await a(id, {aksi: "tampilkan"})).s, 200);
  assert.equal((await U.api("GET", "/api/alun/" + id)).s, 200); assert.equal(await U.n("alun_suara", "pos_id = '" + id + "'"), 0, "aduan dibersihkan");
  assert.equal((await a(id, {aksi: "sembunyikan"})).s, 200); assert.equal((await U.api("GET", "/api/alun/" + id)).s, 404);
  assert.equal((await a(id, {aksi: "hapus"})).s, 200); assert.equal(await U.n("alun_utas", "id = '" + id + "'"), 0);
  const bt = (await tulis({jenis: "butuh_bantuan", judul: "Butuh logistik"}, ip(51))).j.id;
  assert.equal((await a(bt, {aksi: "status", status: "ditangani"})).s, 200);
  assert.equal((await a(bt, {aksi: "status", status: "liar"})).s, 400);
  assert.equal((await a(bt, {aksi: "teruskan", ke: "logistik", catatan: "Kirim ke gudang provinsi"})).s, 200);
  assert.equal((await a(bt, {aksi: "teruskan", ke: "polisi"})).s, 400);
  const g = (await U.api("GET", "/api/alun/" + bt, undefined, ADMIN)).j; assert.equal(g.bantuan, "ditangani"); assert.equal(g.teruskan_ke, "logistik"); assert.equal(g.teruskan_catatan, "Kirim ke gudang provinsi");
  assert.equal((await U.api("GET", "/api/alun/" + bt)).j.teruskan_catatan, undefined, "catatan internal tidak publik");
  assert.equal((await a(DEPAN.utas.id, {aksi: "status", status: "selesai"})).s, 400, "status hanya butuh_bantuan");
  assert.equal((await a(DEPAN.utas.id, {aksi: "sematkan"})).s, 400, "hanya pengumuman");
  assert.equal((await a(DEPAN.umum, {aksi: "lepas_sematan"})).s, 200); assert.equal((await U.api("GET", "/api/alun")).j.sematan.length, 0);
  assert.equal((await a(DEPAN.umum, {aksi: "sematkan"})).s, 200);
  // hapus balasan: balasan_n turun dan terjawab dicabut
  await U.api("POST", "/api/alun/terjawab/" + DEPAN.utas.id, {balasan_id: DEPAN.b1}, ADMIN);
  assert.equal((await a(DEPAN.b1, {aksi: "hapus"})).s, 200);
  const d = (await U.api("GET", "/api/alun/" + DEPAN.utas.id)).j; assert.equal(d.balasan, 1); assert.equal(d.terjawab, false);
});

uji("batas laju: 5 utas per jam per IP lalu 429; IP lain tidak ikut; upvote 120/jam; batas global", async () => {
  const h = ip(60);
  for (let i = 0; i < 5; i++) assert.equal((await tulis({judul: `Utas laju ${i}`}, h)).s, 201);
  const r = await tulis({judul: "Utas laju 6"}, h); assert.equal(r.s, 429); assert.ok(r.h.get("retry-after"));
  assert.equal((await tulis({judul: "Utas IP lain"}, ip(61))).s, 201);
  const hs = (await U.api("POST", "/api/alun/upvote/" + DEPAN.utas.id, {}, ip(62))).s; assert.equal(hs, 200);
  const nip = await U.DB.prepare("SELECT kunci FROM laju_bnpb WHERE aksi = 'alun.upvote' ORDER BY waktu DESC").first();
  await U.DB.batch(Array.from({length: 119}, (_, i) => U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'alun.upvote', ?)").bind(nip.kunci, Date.now() - i)));
  assert.equal((await U.api("POST", "/api/alun/upvote/" + DEPAN.utas.id, {}, ip(62))).s, 429);
  await U.DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'alun.upvote'").run();
  // batas global: banjir utas baru dalam sejam
  await U.DB.batch(Array.from({length: 200}, (_, i) => U.DB.prepare("INSERT INTO alun_utas (id, jenis, judul, teks, bencana, prov, pemilik_sha, dibuat) VALUES (?, 'tanya', 'Banjir', 'x', 'banjir', '33', ?, ?)")
    .bind("b00000000000" + String(i).padStart(4, "0"), "2".repeat(64), Date.now())));
  const g = await tulis({judul: "Terhalang global"}, ip(63)); assert.equal(g.s, 429); assert.match(g.j.galat, /ramai/);
  assert.equal((await U.api("POST", "/api/alun", {...SAH, jenis: "pengumuman", judul: "Pengumuman lolos", teks: "x", bencana: "umum"}, ADMIN)).s, 201, "admin tidak kena batas");
  await U.DB.prepare("DELETE FROM alun_utas WHERE id LIKE 'b0000000000%'").run();
});

uji("dummy: tolak non-super; isi tiap jenis dan status; tidak tampil publik; hapus bersih tanpa sentuh data asli", async () => {
  const asli = await U.n("alun_utas"), asliB = await U.n("alun_balas"), asliS = await U.n("alun_suara");
  assert.equal((await U.api("POST", "/api/alun/dummy", {aksi: "isi"}, ip(70))).s, 403);
  assert.equal((await U.api("POST", "/api/alun/dummy", {aksi: "isi"}, MOD2)).s, 403, "moderator biasa bukan Super Admin");
  assert.equal((await U.api("POST", "/api/alun/dummy", {aksi: "isi"}, GERBANG)).s, 403);
  assert.equal((await U.api("POST", "/api/alun/dummy", {aksi: "liar"}, ADMIN)).s, 400);
  const r = await U.api("POST", "/api/alun/dummy", {aksi: "isi"}, ADMIN); assert.equal(r.s, 200);
  assert.equal((await U.api("POST", "/api/alun/dummy", {aksi: "isi"}, ADMIN)).s, 409, "sudah ada");
  const q = async (kol, w = "dummy = 1") => (await U.n("alun_utas", `${w} AND ${kol}`));
  for (const j of JENIS) assert.ok(await q(`jenis = '${j}'`) >= 1, j);
  for (const s of BANTUAN) assert.ok(await q(`bantuan = '${s}'`) >= 1, s);
  for (const m of MODERASI) assert.ok(await q(`moderasi = '${m}'`) >= 1, m);
  assert.ok(await q("terjawab_id IS NOT NULL") >= 2); assert.ok(await q("teruskan_ke = 'relawan'") >= 1); assert.ok(await q("teruskan_ke = 'logistik'") >= 1); assert.ok(await q("sematan = 1") >= 1);
  assert.ok(await q("upvote > 10") >= 1 && await q("upvote = 0") >= 1, "upvote bervariasi");
  assert.ok(await U.n("alun_balas", "dummy = 1 AND petugas = 1") >= 1);
  assert.equal(await U.n("alun_utas", "dummy = 1 AND balasan_n <> (SELECT count(*) FROM alun_balas b WHERE b.utas_id = alun_utas.id AND b.moderasi <> 'tersembunyi')"), 0, "cacah balasan sesuai");
  assert.equal(await U.n("alun_utas", "dummy = 1 AND upvote <> (SELECT count(*) FROM alun_suara s WHERE s.pos_id = alun_utas.id AND s.jenis = 'upvote')"), 0, "upvote sesuai baris suara");
  // publik tidak melihat dummy; admin ?dummy=1 melihat
  const pub = (await U.api("GET", "/api/alun?jenis=butuh_bantuan")).j; assert.ok(!pub.utas.some(x => x.dummy) && pub.utas.length === (await U.n("alun_utas", "jenis = 'butuh_bantuan' AND dummy = 0 AND moderasi <> 'tersembunyi'")));
  const dId = (await U.DB.prepare("SELECT id FROM alun_utas WHERE dummy = 1 AND moderasi = 'tampil' LIMIT 1").first()).id;
  assert.equal((await U.api("GET", "/api/alun/" + dId)).s, 404); assert.equal((await U.api("GET", "/api/alun/" + dId + "?dummy=1")).s, 404, "tanpa admin tetap 404");
  assert.equal((await U.api("GET", "/api/alun/" + dId + "?dummy=1", undefined, ADMIN)).s, 200);
  assert.equal((await U.api("GET", "/api/alun?dummy=1")).j.utas.some(x => x.dummy), false, "?dummy=1 tanpa admin diabaikan");
  assert.equal((await U.api("GET", "/api/alun?dummy=1", undefined, ADMIN)).j.utas.some(x => x.dummy), true);
  assert.equal((await U.api("POST", "/api/alun/upvote/" + dId, {}, ip(71))).s, 404);
  // layar admin berangka sesudah isi
  const ad = (await U.api("GET", "/api/alun/admin?dummy=1", undefined, ADMIN)).j;
  assert.ok(Object.values(ad.stat.per_jenis).every(n => n > 0)); assert.ok(ad.stat.rata_terjawab_ms > 0); assert.ok(ad.stat.bantuan_terbuka_24j >= 1); assert.ok(ad.antrean.length >= 3);
  assert.ok(ad.antrean.some(x => x.moderasi === "tersembunyi") && ad.antrean.some(x => x.moderasi === "dilaporkan") && ad.antrean.some(x => x.tipe === "balasan")); assert.ok(ad.bantuan.length >= 4);
  const ad0 = (await U.api("GET", "/api/alun/admin", undefined, ADMIN)).j; assert.ok(!ad0.utas.some(x => x.dummy), "tanpa ?dummy=1 admin hanya data asli");
  const h = await U.api("POST", "/api/alun/dummy", {aksi: "hapus"}, ADMIN); assert.equal(h.s, 200); assert.equal(h.j.utas, r.j.utas);
  assert.equal(await U.n("alun_utas", "dummy = 1"), 0); assert.equal(await U.n("alun_balas", "dummy = 1"), 0);
  assert.equal(await U.n("alun_utas"), asli); assert.equal(await U.n("alun_balas"), asliB); assert.equal(await U.n("alun_suara"), asliS, "suara dummy ikut hilang, suara asli utuh");
});

uji("halaman /alun-alun dan /admin/alun: 200 ber-CSP tanpa inline; admin tanpa token dialihkan; API admin tanpa token 403", async () => {
  const p = await U.api("GET", "/alun-alun"); assert.equal(p.s, 200);
  const csp = p.h.get("content-security-policy"); assert.match(csp, /script-src 'self'(;|$)/); assert.doesNotMatch(csp, /unsafe-inline/);
  assert.match(p.t, /alun-alun\.js/); assert.doesNotMatch(p.t, /\sonclick=|<script>[^<]/);
  const a = await U.api("GET", "/admin/alun", undefined, ADMIN); assert.equal(a.s, 200); assert.match(a.t, /\/admin\/alun\.js/); assert.match(a.t, /id="aksiJudul"/);
  const tanpa = await U.mf.dispatchFetch("http://bnpb.lokal/admin/alun", {redirect: "manual"}); assert.ok([302, 303].includes(tanpa.status), String(tanpa.status)); assert.match(tanpa.headers.get("location"), /\/admin\/masuk/);
  for (const [m, j, b] of [["GET", "/api/alun/admin"], ["POST", "/api/alun/admin/abcdef0123456789", {aksi: "hapus"}], ["POST", "/api/alun/dummy", {aksi: "isi"}]]) assert.equal((await U.api(m, j, b)).s, 403, j);
  assert.equal((await U.api("PUT", "/api/alun", {})).s, 405);
  assert.equal((await U.api("POST", "/api/alun", SAH, {...ip(80), origin: "https://jahat.example"})).s, 403, "origin lain");
});

uji("tabel belum dimigrasi: rute membalas 503, bukan 500", async () => {
  const V = await siapkan("uji-alun-kosong");
  await V.DB.batch(["DROP TABLE alun_suara", "DROP TABLE alun_balas", "DROP TABLE alun_utas"].map(s => V.DB.prepare(s)));
  for (const [m, j, b] of [["GET", "/api/alun"], ["GET", "/api/alun/abcdef0123456789"], ["POST", "/api/alun", SAH]]) assert.equal((await V.api(m, j, b, ip(90))).s, 503, j);
  assert.equal((await V.api("GET", "/api/alun/admin", undefined, ADMIN)).s, 503);
  assert.equal((await V.api("GET", "/alun-alun")).s, 200, "halaman statis tetap tayang");
});

/* ---------------- perbaikan ulasan ---------------- */
uji("perbaikan ulasan: akun GERBANG 403 di /api/alun/admin dan tidak melihat utas tersembunyi / teruskan_catatan", async () => {
  assert.equal((await U.api("GET", "/api/alun/admin", undefined, GERBANG)).s, 403);
  assert.equal((await U.api("GET", "/api/alun/admin?dummy=1", undefined, GERBANG)).s, 403);
  const bt = (await tulis({jenis: "butuh_bantuan", judul: "Butuh sesuatu rahasia"}, ip(100))).j.id;
  await U.api("POST", "/api/alun/admin/" + bt, {aksi: "teruskan", ke: "relawan", catatan: "catatan internal"}, ADMIN);
  const g = await U.api("GET", "/api/alun/" + bt, undefined, GERBANG); assert.equal(g.s, 200); assert.equal(g.j.teruskan_catatan, undefined); assert.ok(!g.t.includes("catatan internal"));
  await U.api("POST", "/api/alun/admin/" + bt, {aksi: "sembunyikan"}, ADMIN);
  assert.equal((await U.api("GET", "/api/alun/" + bt, undefined, GERBANG)).s, 404, "gerbang tidak melihat utas tersembunyi");
  assert.equal((await U.api("GET", "/api/alun/" + bt, undefined, ADMIN)).s, 200);
});

uji("perbaikan ulasan: lokasi disimpan dibulatkan 2 desimal, presisi penuh tidak bocor", async () => {
  const r = await tulis({lat: -6.912345, lon: 110.612399}, ip(101)); assert.equal(r.s, 201);
  const g = await U.api("GET", "/api/alun/" + r.j.id); assert.equal(g.j.lat, -6.91); assert.equal(g.j.lon, 110.61); assert.ok(!g.t.includes("6.9123"));
  const d = await U.DB.prepare("SELECT lat, lon FROM alun_utas WHERE id = ?").bind(r.j.id).first(); assert.deepEqual([d.lat, d.lon], [-6.91, 110.61]);
  assert.match(readFileSync(path.join(AKAR, "public/bnpb/alun-alun.js"), "utf8"), /dibulatkan sekitar 1 km, tampil publik/);
});

uji("perbaikan ulasan: butuh_bantuan tidak pernah auto-sembunyi (hanya dilaporkan); jenis lain perlu 5 aduan", async () => {
  const bt = (await tulis({jenis: "butuh_bantuan", judul: "Butuh bantuan dibanjiri aduan"}, ip(102))).j.id;
  for (let n = 110; n < 118; n++) await U.api("POST", "/api/alun/lapor/" + bt, {alasan: "spam"}, ip(n));
  const d = await U.DB.prepare("SELECT moderasi, aduan_n FROM alun_utas WHERE id = ?").bind(bt).first();
  assert.equal(d.moderasi, "dilaporkan"); assert.equal(d.aduan_n, 8); assert.equal((await U.api("GET", "/api/alun/" + bt)).s, 200);
  const tn = (await tulis({judul: "Tanya biasa diaduankan"}, ip(103))).j.id;
  for (let n = 120; n < 124; n++) await U.api("POST", "/api/alun/lapor/" + tn, {alasan: "spam"}, ip(n));
  assert.equal((await U.api("GET", "/api/alun/" + tn)).s, 200, "4 aduan belum cukup");
  await U.api("POST", "/api/alun/lapor/" + tn, {alasan: "spam"}, ip(124));
  assert.equal((await U.api("GET", "/api/alun/" + tn)).s, 404, "5 aduan menyembunyikan");
});

uji("perbaikan ulasan: aduan hanya dihitung bila Turnstile lolos (aktif), upvote tidak terpengaruh", async () => {
  const T = await siapkan("uji-alun-ts", {ikat: {TURNSTILE_SECRET: "s", TURNSTILE_SITEKEY: "k"}});
  const id = (await T.DB.prepare("INSERT INTO alun_utas (id, jenis, judul, teks, bencana, prov, pemilik_sha, dibuat) VALUES ('c000000000000001', 'tanya', 'Judul sah', 'isi', 'banjir', '33', ?, 1) RETURNING id").bind("3".repeat(64)).first()).id;
  const a = await T.api("POST", "/api/alun/lapor/" + id, {alasan: "spam", turnstile: "token"}, ip(130)); assert.equal(a.s, 403);
  assert.equal(await T.n("alun_suara", "jenis = 'aduan'"), 0, "aduan tanpa Turnstile sah tidak dihitung");
  assert.equal((await T.api("POST", "/api/alun/upvote/" + id, {}, ip(130))).s, 200);
});

uji("perbaikan ulasan: kunci cache daftar memakai parameter tervalidasi saja", async () => {
  const k = (q, p) => kunciDaftar(new URL("http://x.lokal/api/alun?" + q), p).url;
  const p = {jenis: "tanya", bencana: "", prov: "33", urut: "terbaru", kursor: "0"};
  assert.equal(k("jenis=tanya&prov=33", p), k("prov=33&jenis=tanya&x=1&cb=abc123", p));
  assert.equal(k("prov=33&jenis=tanya&zzz=9", p), "http://x.lokal/api/alun?jenis=tanya&prov=33");
});

uji("perbaikan ulasan: lajuIP sebelum Turnstile (tulis & balas)", async () => {
  const T = await siapkan("uji-alun-ts2", {ikat: {TURNSTILE_SECRET: "s", TURNSTILE_SITEKEY: "k"}}), h = ip(140);
  for (let i = 0; i < 5; i++) assert.equal((await T.api("POST", "/api/alun", {...SAH, turnstile: "x"}, h)).s, 403);
  assert.equal((await T.api("POST", "/api/alun", {...SAH, turnstile: "x"}, h)).s, 429, "percobaan Turnstile gagal tetap terhitung laju");
});

uji("perbaikan ulasan: nama yang meniru petugas ditolak untuk non-moderator (tulis & balas); nama biasa lolos", async () => {
  for (const n of ["Petugas Posko", "BPBD Demak", "bnpb pusat", "Admin Forum", "Moderator", "Tim RESMI", "Pemerintah Desa", "Polisi Lalu", "TNI AD", "Basarnas SAR"]) {
    assert.equal((await tulis({nama: n}, ip(150))).s, 400, n);
    assert.equal((await U.api("POST", "/api/alun/balas/" + DEPAN.utas.id, {teks: "halo", nama: n}, ip(150))).s, 400, "balas " + n);
  }
  assert.equal((await tulis({nama: "Fitni"}, ip(151))).s, 201, "Fitni bukan TNI");
  assert.equal((await U.api("POST", "/api/alun/balas/" + DEPAN.utas.id, {teks: "halo", nama: "Antoni"}, ip(151))).s, 201);
});

uji("perbaikan ulasan: terjawab oleh pemilik dibatasi 30 per jam per kode", async () => {
  const u = (await tulis({judul: "Utas untuk laju terjawab"}, ip(160))).j, b = (await U.api("POST", "/api/alun/balas/" + u.id, {teks: "jawaban"}, ip(161))).j.id;
  const t = () => U.api("POST", "/api/alun/terjawab/" + u.id, {balasan_id: b}, {...ip(162), "x-kode": u.kode});
  for (let i = 0; i < 30; i++) assert.equal((await t()).s, 200, "ke-" + i);
  const r = await t(); assert.equal(r.s, 429); assert.ok(r.h.get("retry-after"));
});

/* ---------------- C1: Teruskan ke relawan / logistik (migrasi 0028, alun_tautan) ---------------- */
const hari = d => new Date(Date.now() + 7 * 36e5 + d * 864e5).toISOString().slice(0, 10);
const bantuan = async (n, o = {}) => (await tulis({jenis: "butuh_bantuan", judul: "Butuh tenaga medis dan beras", ...o}, ip(n))).j.id;
const teruskan = (id, b, h = ADMIN) => U.api("POST", "/api/alun/admin/" + id, b, h);
const FORM_R = {aksi: "teruskan_relawan", keahlian: "medis", jumlah: 5, mulai: hari(0), selesai: hari(3)};
const FORM_L = {aksi: "teruskan_logistik", barang: "beras", jumlah: 500, satuan: "kg", posko: "Posko Balai Desa", kebutuhan_untuk: 120};
const relawanUji = async n => {   // relawan siap tugas dengan data pribadi yang tidak boleh bocor ke publik
  const id = `ab${String(n).padStart(14, "0")}`;
  await U.DB.prepare("INSERT INTO relawan (id, nama, wa, email, prov, kab, jalur, keahlian, hari_per_minggu, maks_hari, luar_provinsi, status, setuju_pdp, dibuat, diubah) VALUES (?, ?, ?, ?, '33', 'Kabupaten Demak', 'umum', '[\"medis\"]', 3, 30, 0, 'siap_tugas', 1, 1, 1)")
    .bind(id, "Siti Rahasia " + n, "62812000000" + String(n).padStart(2, "0"), `siti${n}@rahasia.id`).run();
  return id;
};
const tugaskan = async (pid, n) => { const r = await relawanUji(n); await U.DB.prepare("INSERT INTO relawan_penugasan (id, permintaan_id, relawan_id, status, dibuat, diubah) VALUES (?, ?, ?, 'diterima', 1, 1)").bind(`cd${String(n).padStart(14, "0")}`, pid, r).run(); };
const pil = async id => (await U.api("GET", "/api/alun/" + id)).j.tautan;

uji("C1 teruskan ke relawan: membuat permintaan relawan SUNGGUHAN (wilayah dan judul dari utas), tautan dua arah, utas jadi ditangani", async () => {
  const id = await bantuan(201, {kab: "Kabupaten Demak", lat: -6.912345, lon: 110.612399});
  assert.equal(await U.n("alun_tautan"), 0);
  const r = await teruskan(id, FORM_R); assert.equal(r.s, 201, r.t);
  assert.match(r.j.tujuan_id, ID); assert.equal(r.j.jenis, "relawan");
  const p = await U.DB.prepare("SELECT * FROM relawan_permintaan WHERE id = ?").bind(r.j.tujuan_id).first();
  assert.equal(p.judul, "Butuh tenaga medis dan beras"); assert.equal(p.prov, "33"); assert.equal(p.kab, "Kabupaten Demak"); assert.equal(p.bencana, "banjir"); assert.equal(p.status, "buka");
  assert.deepEqual(JSON.parse(p.butuh), [{keahlian: "medis", jumlah: 5}]); assert.equal(p.mulai, hari(0)); assert.equal(p.selesai, hari(3)); assert.equal(p.lat, -6.91); assert.equal(p.dummy, 0);
  assert.match(p.catatan, new RegExp(id));
  const t = await U.DB.prepare("SELECT utas_id, jenis, tujuan_id FROM alun_tautan").first(); assert.deepEqual({...t}, {utas_id: id, jenis: "relawan", tujuan_id: r.j.tujuan_id});
  const u = await U.DB.prepare("SELECT teruskan_ke, bantuan FROM alun_utas WHERE id = ?").bind(id).first(); assert.deepEqual({...u}, {teruskan_ke: "relawan", bantuan: "ditangani"});
  /* permintaan itu muncul di daftar admin relawan (rantai sungguhan, bukan salinan) */
  const dr = await U.adm("GET", "/api/relawan/admin/permintaan"); assert.ok(dr.j.permintaan.some(x => x.id === r.j.tujuan_id), dr.t.slice(0, 200));
  S1.relawan = {utas: id, pid: r.j.tujuan_id};
});

uji("C1 status relawan tampil di utas publik sebagai pil TANPA data pribadi: ditugaskan N dari M, ditutup, terpenuhi", async () => {
  const {utas, pid} = S1.relawan;
  assert.deepEqual(await pil(utas), [{jenis: "relawan", tahap: "buka", label: "Relawan ditugaskan 0 dari 5"}]);
  for (let i = 1; i <= 3; i++) await tugaskan(pid, i);
  const g = await U.api("GET", "/api/alun/" + utas);
  assert.deepEqual(g.j.tautan, [{jenis: "relawan", tahap: "buka", label: "Relawan ditugaskan 3 dari 5"}]);
  for (const s of ["Siti Rahasia", "rahasia.id", "6281200", pid, "relawan_permintaan"]) assert.ok(!g.t.includes(s), `bocor: ${s}`);
  const dl = await U.api("GET", "/api/alun"); assert.ok(dl.j.utas.find(x => x.id === utas).tautan.length === 1, "pil juga di daftar publik");
  for (const s of ["Siti Rahasia", pid]) assert.ok(!dl.t.includes(s), `bocor di daftar: ${s}`);
  await U.DB.prepare("UPDATE relawan_permintaan SET status = 'ditutup' WHERE id = ?").bind(pid).run();
  assert.equal((await pil(utas))[0].label, "Permintaan relawan ditutup");
  await U.DB.prepare("UPDATE relawan_permintaan SET status = 'buka' WHERE id = ?").bind(pid).run();
  for (let i = 4; i <= 5; i++) await tugaskan(pid, i);
  assert.deepEqual(await pil(utas), [{jenis: "relawan", tahap: "terpenuhi", label: "Kebutuhan relawan terpenuhi"}]);
  /* admin melihat id tujuan, publik tidak */
  const a = await U.adm("GET", "/api/alun/admin"); assert.equal(a.j.bantuan.find(x => x.id === utas).tautan[0].id, pid);
  assert.ok(a.j.keahlian.medis && a.j.barang.includes("beras"), "pilihan formulir dari daftar modul tujuan");
});

uji("C1 teruskan ke logistik: membuat catatan Meja Logistik berstatus diminta, pil mengikuti diminta, disetujui, dikirim, diterima", async () => {
  const id = await bantuan(202, {kab: "Kabupaten Lebak"});
  const r = await teruskan(id, FORM_L); assert.equal(r.s, 201, r.t);
  const c = await U.DB.prepare("SELECT meja, prov, kab, status, data, dummy FROM meja_catatan WHERE id = ?").bind(r.j.tujuan_id).first();
  assert.deepEqual({meja: c.meja, prov: c.prov, kab: c.kab, status: c.status, dummy: c.dummy}, {meja: "logistik", prov: "33", kab: "Kabupaten Lebak", status: "diminta", dummy: 0});
  assert.deepEqual(JSON.parse(c.data), {barang: "beras", jumlah_diminta: 500, satuan: "kg", posko: "Posko Balai Desa", kebutuhan_untuk: 120});
  assert.equal(await U.n("meja_jejak", `catatan_id = '${r.j.tujuan_id}'`), 1, "jejak status awal ikut tercatat");
  assert.ok((await U.adm("GET", "/api/meja/catatan?meja=logistik")).j.catatan.some(x => x.id === r.j.tujuan_id), "tampil di Meja Kerja");
  assert.deepEqual(await pil(id), [{jenis: "logistik", tahap: "diminta", label: "Bantuan diminta"}]);
  for (const [ke, label] of [["disetujui", "Bantuan disetujui"], ["dikirim", "Bantuan dikirim"], ["diterima", "Bantuan diterima"]]) {
    await U.DB.prepare("UPDATE meja_catatan SET status = ? WHERE id = ?").bind(ke, r.j.tujuan_id).run();
    assert.equal((await pil(id))[0].label, label);
  }
  const g = await U.api("GET", "/api/alun/" + id); for (const s of [r.j.tujuan_id, "Posko Balai Desa", "meja_catatan"]) assert.ok(!g.t.includes(s), `bocor: ${s}`);
  S1.logistik = id;
});

uji("C1 satu utas boleh banyak tautan (relawan dua kali, logistik sekali); semua tampil berurutan", async () => {
  const id = await bantuan(203, {kab: "Kota Padang"});
  for (const f of [FORM_R, {...FORM_R, keahlian: "sar", jumlah: 2}, FORM_L]) assert.equal((await teruskan(id, f)).s, 201);
  assert.equal(await U.n("alun_tautan", `utas_id = '${id}'`), 3);
  assert.deepEqual((await pil(id)).map(x => x.jenis), ["relawan", "relawan", "logistik"]);
  assert.equal((await U.adm("GET", "/api/alun/admin")).j.bantuan.find(x => x.id === id).tautan.length, 3);
  S1.banyak = id;
});

uji("C1 penolakan: utas tanpa kabupaten 400, bukan butuh_bantuan 400, formulir liar 400, tanpa token/gerbang 403, utas hilang 404 - dan tidak ada baris tujuan yatim", async () => {
  const sebelum = [await U.n("relawan_permintaan"), await U.n("meja_catatan"), await U.n("alun_tautan")];
  const tanpaKab = await bantuan(204, {kab: undefined});
  for (const f of [FORM_R, FORM_L]) { const r = await teruskan(tanpaKab, f); assert.equal(r.s, 400, r.t); assert.match(r.j.galat, /kabupaten/); }
  const tanya = (await tulis({}, ip(205))).j.id, ok = await bantuan(206);
  for (const f of [FORM_R, FORM_L]) assert.equal((await teruskan(tanya, f)).s, 400, "hanya butuh_bantuan");
  for (const f of [{...FORM_R, keahlian: "tukang_sulap"}, {...FORM_R, jumlah: 0}, {...FORM_R, jumlah: 1001}, {...FORM_R, mulai: "besok"}, {...FORM_R, selesai: hari(-5)}, {...FORM_R, keahlian: undefined},
    {...FORM_L, barang: "emas"}, {...FORM_L, jumlah: 0}, {...FORM_L, satuan: undefined}, {...FORM_L, posko: undefined}, {...FORM_L, kebutuhan_untuk: undefined}, {...FORM_L, kebutuhan_untuk: -1}]) {
    const r = await teruskan(ok, f); assert.equal(r.s, 400, JSON.stringify(f) + r.t);
  }
  for (const f of [FORM_R, FORM_L]) {
    assert.equal((await teruskan(ok, f, {})).s, 403, "tanpa token"); assert.equal((await teruskan(ok, f, GERBANG)).s, 403, "akun gerbang situs");
    assert.equal((await teruskan("0".repeat(16), f)).s, 404);
  }
  assert.deepEqual([await U.n("relawan_permintaan"), await U.n("meja_catatan"), await U.n("alun_tautan")], sebelum, "tidak ada tujuan yatim");
  assert.equal((await U.DB.prepare("SELECT teruskan_ke, bantuan FROM alun_utas WHERE id = ?").bind(ok).first()).bantuan, "terbuka", "gagal = utas tidak berubah");
  assert.equal((await teruskan(ok, FORM_R, MOD2)).s, 201, "moderator mana pun boleh");
});

uji("C1 menghapus utas ikut membuang tautannya (FK), tujuan tetap ada; utas tanpa tautan tidak punya pil", async () => {
  const id = S1.banyak, tujuan = (await U.DB.prepare("SELECT tujuan_id FROM alun_tautan WHERE utas_id = ?").bind(id).all()).results.map(x => x.tujuan_id);
  const h = await teruskan(id, {aksi: "hapus"}); assert.equal(h.s, 200, h.t);
  assert.equal(await U.n("alun_tautan", `utas_id = '${id}'`), 0);
  assert.equal(await U.n("relawan_permintaan", `id IN ('${tujuan.join("','")}')`) + await U.n("meja_catatan", `id IN ('${tujuan.join("','")}')`), 3, "permintaan dan catatan yang sudah dibuat tidak hilang diam-diam");
  const polos = await bantuan(207); assert.deepEqual(await pil(polos), []);
});

uji("C1 dummy: urutan isi bebas (alun/relawan/meja) selalu berhasil; tautan hanya ke tujuan dummy yang sudah ada; 🧹 tiap modul tidak meninggalkan yatim berbahaya", async () => {
  const isi = async (W, m) => { const r = await W.adm("POST", `/api/${m}/dummy`, {aksi: "isi"}); assert.ok(r.s === 200 || r.s === 201, `${m}: ${r.s} ${r.t}`); return r; };
  const hapus = async (W, m) => { const r = await W.adm("POST", `/api/${m}/dummy`, {aksi: "hapus"}); assert.equal(r.s, 200, `${m}: ${r.t}`); };
  /* alun lebih dulu: tanpa tujuan, tanpa tautan; modul lain tetap bisa diisi */
  const A = await siapkan("uji-alun-c1-a");
  assert.equal((await isi(A, "alun")).j.tautan, 0);
  await isi(A, "relawan"); await isi(A, "meja");
  assert.equal(await A.n("alun_tautan"), 0);
  /* relawan dan meja lebih dulu, alun sesudahnya: dua tautan ke tujuan dummy yang ada, tidak ada baris dummy baru di modul lain */
  const W = await siapkan("uji-alun-c1-dummy");
  await isi(W, "relawan"); await isi(W, "meja");
  const sebelum = [await W.n("relawan_permintaan", "dummy = 1"), await W.n("meja_catatan", "dummy = 1")];
  assert.equal((await isi(W, "alun")).j.tautan, 2);
  assert.deepEqual([await W.n("relawan_permintaan", "dummy = 1"), await W.n("meja_catatan", "dummy = 1")], sebelum);
  assert.equal(await W.n("alun_tautan", "dummy = 1"), 2);
  const a = await W.adm("GET", "/api/alun/admin?dummy=1"), adaPil = a.j.bantuan.filter(x => x.tautan.length); assert.equal(adaPil.length, 2);
  assert.deepEqual((await W.api("GET", "/api/alun")).j.utas.filter(x => x.tautan?.length), [], "dummy tidak tampil publik");
  /* 🧹 modul tujuan lebih dulu: tautan dummy yang tersisa tidak tampil dan tidak merusak apa pun; 🧹 alun membersihkannya */
  await hapus(W, "relawan"); await hapus(W, "meja");
  assert.equal((await W.adm("GET", "/api/alun/admin?dummy=1")).s, 200);
  assert.equal((await W.adm("GET", "/api/alun/admin?dummy=1")).j.bantuan.filter(x => x.tautan.length).length, 0, "tujuan hilang = pil hilang");
  await hapus(W, "alun");
  assert.equal(await W.n("alun_tautan"), 0); assert.equal(await W.n("alun_utas", "dummy = 1"), 0);
  /* urutan lain: meja, alun, relawan, riset, lalu hapus alun dulu */
  const Z = await siapkan("uji-alun-c1-z");
  for (const m of ["meja", "alun", "relawan", "riset"]) await isi(Z, m);
  assert.equal(await Z.n("alun_tautan", "dummy = 1"), 1, "hanya logistik yang sudah ada saat alun diisi");
  await hapus(Z, "alun"); await hapus(Z, "meja"); await hapus(Z, "relawan"); await hapus(Z, "riset");
  assert.equal(await Z.n("alun_tautan"), 0);
  /* tanpa alun_tautan */
  const X = await siapkan("uji-alun-c1-tanpa"); await X.DB.prepare("DROP TABLE alun_tautan").run();
  const id = (await X.api("POST", "/api/alun", {...SAH, jenis: "butuh_bantuan"}, ip(210))).j.id;
  const g = await X.api("GET", "/api/alun/" + id); assert.equal(g.s, 200); assert.deepEqual(g.j.tautan, []);
  assert.equal((await X.api("GET", "/api/alun")).s, 200); assert.equal((await X.adm("GET", "/api/alun/admin")).s, 200);
  const r = await X.api("POST", "/api/alun/admin/" + id, FORM_R, ADMIN); assert.equal(r.s, 503, r.t); assert.equal(await X.n("relawan_permintaan"), 0, "tidak ada tujuan yatim");
  assert.equal((await X.api("POST", "/api/alun/admin/" + id, {aksi: "hapus"}, ADMIN)).s, 200, "menghapus utas tetap jalan");
});
