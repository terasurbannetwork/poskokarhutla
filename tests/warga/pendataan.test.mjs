/* Pendataan Satu Data BNPB, Fase 1: src/pendataan.js di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan, migrasi apa adanya (TEST.md).
   Jalankan: node --test tests/warga/pendataan.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker.js dulu: pendataan.js dan worker.js saling impor
import {RUTE_PENDATAAN, barisUnit, magicSah, cekDaftar} from "../../src/pendataan.js";
import * as S from "../../public/bnpb/pendataan_spek.js";

const U = await siapkan("uji-pendataan", {r2: true});
const {DB, api, adm, n} = U;
const uji = berantai();
const SQL = readFileSync(path.join(AKAR, "migrations/0060_pendataan.sql"), "utf8");
const SANDI = "sandi-panjang-1";
const ip = k => ({"cf-connecting-ip": "10.1.0." + k});
const ASAL = {origin: "http://bnpb.lokal"};   // peramban selalu mengirim Origin pada POST fetch; tanpa itu POST bercookie sesi_pendataan ditolak (tolakOrigin)
const H = c => ({cookie: c, "x-pb": "1", ...ASAL});
const DATA = {nama: "Rekap kejadian", isi: "Jumlah kejadian per kabupaten", jenis_data: ["Kejadian bencana"], bencana: ["Banjir"], frekuensi: "Bulanan", bentuk: ["PDF"], pembuat: "Analis data", dilaporkan_ke: ["Direktur"],
  cara_akses: ["API"], cakupan: "Provinsi", keyakinan: "Resmi terverifikasi", akses: "Terbuka untuk publik", berbagi: ["Siap manual"], ketersediaan: "Ada dan rutin"};
const UMUM = {kebutuhan: "Data korban harian", kendala: ["Data sering terlambat"], setuju: "Ya"};
const PDF = new TextEncoder().encode("%PDF-1.4\nisi contoh\n%%EOF\n");
const akunBaru = (username, unit, k, extra = {}) => ({nama: "Budi " + username, nip: "198001012005011001", jabatan: "Analis", unit, email: username + "@contoh.go.id", wa: "08123456" + String(7000 + k), username, sandi: SANDI, ...extra});
const daftar = (o, k) => api("POST", "/api/pendataan/daftar", o, ip(k));
async function masuk(username, sandi = SANDI, k = 50) {
  const r = await api("POST", "/api/pendataan/masuk", {username, sandi}, ip(k));
  return {...r, cookie: (r.h.get("set-cookie") || "").match(/sesi_pendataan=[0-9a-f]{64}/)?.[0]};
}
const unggah = (c, id, tipe, byte, nama = "dokumen.pdf") => U.mf.dispatchFetch("http://bnpb.lokal/api/pendataan/berkas/" + id, {method: "POST", headers: {...H(c), "content-type": tipe, "x-nama": encodeURIComponent(nama)}, body: byte});
const setujui = async username => { const id = (await DB.prepare("SELECT id FROM pdt_akun WHERE username = ?").bind(username).first()).id; return adm("POST", "/api/pendataan/admin/akun/" + id, {aksi: "setujui"}); };
const idAkun = async username => (await DB.prepare("SELECT id FROM pdt_akun WHERE username = ?").bind(username).first()).id;
let cA, cB, cC, isA1, isA2, isU, berkasA;

uji("migrasi 0060 idempoten: jalan dua kali tanpa galat", async () => {
  for (let i = 0; i < 2; i++) await DB.batch(pecah(SQL).map(s => DB.prepare(s)));
  for (const t of ["pdt_akun", "pdt_sesi", "pdt_isian", "pdt_berkas"]) assert.equal(await n(t), 0, t);
});

uji("enum spek = CHECK migrasi, dan D1 menolak enum liar langsung", async () => {
  const daftarDari = (re, t = SQL) => [...t.match(re)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(daftarDari(/unit TEXT NOT NULL CHECK \(unit IN \(([^)]*)\)/), Object.keys(S.UNIT));
  assert.deepEqual(daftarDari(/jenis TEXT NOT NULL CHECK \(jenis IN \(([^)]*)\)/), S.JENIS);
  assert.deepEqual(daftarDari(/status TEXT NOT NULL DEFAULT 'menunggu' CHECK \(status IN \(([^)]*)\)/), S.STATUS_AKUN);
  assert.deepEqual(daftarDari(/status TEXT NOT NULL DEFAULT 'draf' CHECK \(status IN \(([^)]*)\)/), S.STATUS_ISIAN);
  assert.deepEqual(daftarDari(/mime TEXT NOT NULL CHECK \(mime IN \(([^)]*)\)/), Object.keys(S.BERKAS.tipe));
  assert.match(SQL, new RegExp(`ukuran BETWEEN 1 AND ${S.BERKAS.maks}\\b`));
  const bad = (sql, ...b) => assert.rejects(DB.prepare(sql).bind(...b).run(), /CHECK|constraint|UNIQUE|FOREIGN/i, sql.slice(0, 50));
  const akun = "INSERT INTO pdt_akun (id, username, nama, jabatan, unit, unit_lain, email, wa, garam, sandi_hash, status, dibuat) VALUES (?, ?, 'Nama', 'Jabatan', ?, ?, 'a@b.co', '628123456789', ?, ?, ?, 1)";
  const g = "g".repeat(32), h = "h".repeat(64), id = "a".repeat(16);
  await bad(akun, id, "usernamebaik", "kementerian", null, g, h, "menunggu");   // unit liar
  await bad(akun, id, "usernamebaik", "pusdatin", null, g, h, "aktif2");   // status liar
  await bad(akun, id, "Username", "pusdatin", null, g, h, "menunggu");   // huruf besar
  await bad(akun, id, "usernamebaik", "lainnya", null, g, h, "menunggu");   // lainnya tanpa nama unit
  await DB.prepare(akun).bind(id, "ujicheck", "pusdatin", null, g, h, "aktif").run();
  const isian = "INSERT INTO pdt_isian (id, akun_id, unit, jenis, isi, status, dibuat, diubah, dikirim) VALUES (?, ?, 'pusdatin', ?, ?, ?, 1, 1, ?)";
  await bad(isian, "b".repeat(16), id, "laporan", "{}", "draf", null);
  await bad(isian, "b".repeat(16), id, "data", "bukan json", "draf", null);
  await bad(isian, "b".repeat(16), id, "data", "{}", "terkirim", null);   // terkirim wajib berstempel
  await DB.prepare(isian).bind("b".repeat(16), id, "umum", "{}", "draf", null).run();
  await bad(isian, "c".repeat(16), id, "umum", "{}", "draf", null);   // satu umum per akun
  await bad("INSERT INTO pdt_berkas (id, isian_id, nama, mime, ukuran, dibuat) VALUES (?, ?, 'x', 'text/html', 5, 1)", "d".repeat(16), "b".repeat(16));
  await bad("INSERT INTO pdt_berkas (id, isian_id, nama, mime, ukuran, dibuat) VALUES (?, ?, 'x', 'text/csv', ?, 1)", "d".repeat(16), "b".repeat(16), S.BERKAS.maks + 1);
  await DB.batch([DB.prepare("DELETE FROM pdt_isian"), DB.prepare("DELETE FROM pdt_akun")]);
});

uji("tiap rute tanpa auth ditolak (kecuali yang memang publik)", async () => {
  const publik = new Set(["GET /api/pendataan/konfig", "POST /api/pendataan/daftar", "POST /api/pendataan/masuk", "POST /api/pendataan/keluar", "GET /pendataan"]);
  const rute = Object.keys(RUTE_PENDATAAN);
  assert.ok(rute.length >= 16, "semua rute kontrak terdaftar");
  for (const k of rute) {
    if (publik.has(k)) continue;
    const [m, j] = k.split(" ");
    if (j === "/admin/pendataan") { const h = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {redirect: "manual"}); assert.equal(h.status, 303); assert.match(h.headers.get("location"), /\/admin\/masuk/); continue; }
    const r = await api(m, j.replace(":id", "a".repeat(16)), m === "POST" ? {} : undefined, ip(1));
    assert.ok([401, 403, 301, 302, 303, 307].includes(r.s), `${k} tanpa auth harus ditolak, dapat ${r.s}`);
  }
  assert.equal((await api("GET", "/api/pendataan/konfig")).j.turnstile, null);
  // admin biasa (bukan Super Admin) ditolak di rute admin dan dummy
  for (const [m, j] of [["GET", "/api/pendataan/admin/ringkas"], ["GET", "/api/pendataan/admin/ekspor?jenis=data"], ["POST", "/api/pendataan/dummy"], ["POST", "/api/pendataan/admin/akun/" + "a".repeat(16)]])
    assert.equal((await api(m, j, m === "POST" ? {aksi: "isi"} : undefined, MOD2)).s, 403, j);
});

uji("halaman /admin/pendataan: Super Admin 200 memuat skrip layar, admin biasa 403", async () => {
  const r = await adm("GET", "/admin/pendataan"); assert.equal(r.s, 200);
  assert.ok(r.t.includes("/admin/pendataan.js") && r.t.includes("/admin/pendataan.css") && r.t.includes("/admin/bersama.js") && r.t.includes('id="aksiJudul"'));
  assert.equal((await api("GET", "/admin/pendataan", undefined, MOD2)).s, 403);
});

uji("cekDaftar: masukan liar ditolak dengan alasan", () => {
  const ok = akunBaru("pusdatina", "pusdatin", 1);
  assert.ok(cekDaftar(ok).v);
  for (const o of [{...ok, nama: ""}, {...ok, jabatan: "x"}, {...ok, unit: "kemenkes"}, {...ok, unit: "lainnya"}, {...ok, email: "bukan"}, {...ok, wa: "123"}, {...ok, nip: "1"}, {...ok, username: "AB"}, {...ok, username: "ada spasi"},
    {...ok, sandi: "pendek"}, {...ok, sandi: 12345678901}]) assert.ok(cekDaftar(o).galat, JSON.stringify(o).slice(0, 80));
  assert.equal(cekDaftar({...ok, unit: "lainnya", unit_lain: "Kemenkes"}).v.unit_lain, "Kemenkes");
  assert.equal(cekDaftar({...ok, nip: ""}).v.nip, null);
});

uji("daftar: validasi 400, 201 menunggu, 409 username atau email ganda", async () => {
  assert.equal((await daftar({...akunBaru("pusdatina", "pusdatin", 1), sandi: "pendek"}, 1)).s, 400);
  assert.equal((await daftar({...akunBaru("pusdatina", "pusdatin", 1), unit: "x"}, 1)).s, 400);
  const r = await daftar(akunBaru("pusdatina", "pusdatin", 1), 1);
  assert.equal(r.s, 201); assert.deepEqual(r.j, {status: "menunggu"});
  assert.equal((await DB.prepare("SELECT status, wajib_ganti FROM pdt_akun WHERE username = 'pusdatina'").first()).status, "menunggu");
  const hash = (await DB.prepare("SELECT garam, sandi_hash FROM pdt_akun WHERE username = 'pusdatina'").first());
  assert.equal(hash.garam.length, 32); assert.equal(hash.sandi_hash.length, 64); assert.ok(!JSON.stringify(hash).includes(SANDI));
  assert.equal((await daftar(akunBaru("pusdatina", "pusdatin", 2), 2)).s, 409);   // username sama
  const n0 = (await DB.prepare("SELECT count(*) n FROM pdt_akun").first()).n;
  const em = await daftar({...akunBaru("pusdatinz", "pusdatin", 3), email: "PUSDATINA@contoh.go.id"}, 3);   // email sama, beda huruf
  assert.equal(em.s, 201); assert.deepEqual(em.j, {status: "menunggu"});   // jawaban sama dengan sukses: keberadaan email tidak bocor
  assert.equal((await DB.prepare("SELECT count(*) n FROM pdt_akun").first()).n, n0);   // tapi tidak ada baris baru
  assert.equal((await daftar(akunBaru("pusdatinb", "pusdatin", 4), 4)).s, 201);
  assert.equal((await daftar(akunBaru("dalopsc", "dalops", 5), 5)).s, 201);
  assert.equal((await daftar(akunBaru("lainnyad", "lainnya", 6, {unit_lain: "Biro Hukum"}), 6)).s, 201);
});

uji("batas laju daftar: keenam dari IP yang sama 429", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await daftar(akunBaru("laju" + "abcde"[i], "rri", 20 + i), 99)).s, 201);
  assert.equal((await daftar(akunBaru("lajuf", "rri", 30), 99)).s, 429);
  await DB.prepare("DELETE FROM pdt_akun WHERE username LIKE 'laju%'").run();
});

uji("masuk: menunggu 403 dengan pesan, sandi salah 401 seragam, akun tak dikenal 401", async () => {
  const m = await masuk("pusdatina"); assert.equal(m.s, 403); assert.match(m.j.galat, /menunggu persetujuan Super Admin/); assert.equal(m.cookie, undefined);
  const salah = await masuk("pusdatina", "salah-sandi-xx"), asing = await masuk("tidakada1", "salah-sandi-xx");
  assert.equal(salah.s, 401); assert.equal(asing.s, 401); assert.equal(salah.j.galat, asing.j.galat);
  assert.equal((await api("GET", "/api/pendataan/saya")).s, 401);
});

uji("Super Admin setujui, tolak, cabut: masuk sesuai status", async () => {
  assert.equal((await setujui("pusdatina")).s, 200);
  const a = await masuk("pusdatina"); assert.equal(a.s, 200); assert.ok(a.cookie); assert.equal(a.j.akun.status, "aktif"); assert.ok(!("sandi_hash" in a.j.akun) && !("garam" in a.j.akun));
  cA = a.cookie;
  assert.equal((await setujui("pusdatinb")).s, 200); cB = (await masuk("pusdatinb")).cookie;
  assert.equal((await setujui("dalopsc")).s, 200); cC = (await masuk("dalopsc")).cookie;
  assert.ok(cB && cC);
  // tolak dan cabut
  const idL = await idAkun("lainnyad");
  assert.equal((await adm("POST", "/api/pendataan/admin/akun/" + idL, {aksi: "tolak"})).s, 200);
  const t = await masuk("lainnyad"); assert.equal(t.s, 403); assert.match(t.j.galat, /ditolak/);
  assert.equal((await adm("POST", "/api/pendataan/admin/akun/" + idL, {aksi: "cabut"})).s, 409);   // hanya aktif yang dicabut
  assert.equal((await adm("POST", "/api/pendataan/admin/akun/" + idL, {aksi: "setujui"})).s, 200);
  const l = await masuk("lainnyad"); assert.equal(l.s, 200);
  assert.equal((await adm("POST", "/api/pendataan/admin/akun/" + idL, {aksi: "cabut"})).s, 200);
  assert.equal((await api("GET", "/api/pendataan/saya", undefined, {cookie: l.cookie})).s, 401);   // sesi ikut dicabut
  const c = await masuk("lainnyad"); assert.equal(c.s, 403); assert.match(c.j.galat, /dicabut/);
  assert.equal((await adm("POST", "/api/pendataan/admin/akun/" + idL, {aksi: "ngawur"})).s, 400);
  assert.equal((await adm("POST", "/api/pendataan/admin/akun/" + "f".repeat(16), {aksi: "setujui"})).s, 404);
});

uji("POST lewat sesi tanpa x-pb ditolak; keluar menghapus sesi", async () => {
  assert.equal((await api("POST", "/api/pendataan/isian", {jenis: "umum", isi: UMUM, kirim: false}, {cookie: cA, ...ASAL})).s, 403);
  assert.equal((await api("POST", "/api/pendataan/isian", {jenis: "umum", isi: UMUM, kirim: false}, {...H(cA), origin: "https://jahat.contoh"})).s, 403);   // origin lain
  assert.equal((await api("POST", "/api/pendataan/isian", {jenis: "umum", isi: UMUM, kirim: false}, {cookie: cA, "x-pb": "1"})).s, 403);   // Origin kosong + cookie sesi = lintas situs
  const x = await masuk("pusdatinb", SANDI, 51);
  assert.equal((await api("POST", "/api/pendataan/keluar", {}, {cookie: x.cookie, ...ASAL})).s, 200);
  assert.equal((await api("GET", "/api/pendataan/saya", undefined, {cookie: x.cookie})).s, 401);
});

uji("isian: draf tanpa wajib lolos, kirim tanpa wajib 400, Lainnya tanpa isian 400, jenis liar 400", async () => {
  const draf = await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {nama: "Draf awal"}, kirim: false}, H(cA));
  assert.equal(draf.s, 201); assert.equal(draf.j.isian.status, "draf"); assert.equal(draf.j.isian.dikirim, null); isA1 = draf.j.isian.id;
  const kirimKosong = await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {nama: "Tanpa wajib"}, kirim: true}, H(cA));
  assert.equal(kirimKosong.s, 400); assert.match(kirimKosong.j.galat, /wajib/);
  const lain = await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {...DATA, jenis_data: ["Kejadian bencana", "Lainnya"]}, kirim: true}, H(cA));
  assert.equal(lain.s, 400); assert.match(lain.j.galat, /Lainnya/);
  for (const o of [{jenis: "laporan", isi: {}, kirim: false}, {jenis: "data", isi: {}, kirim: "ya"}, {jenis: "data", isi: {kolom_gaib: 1}, kirim: false}, {jenis: "data", isi: [], kirim: false}, {id: "zzz", jenis: "data", isi: {}, kirim: false}])
    assert.equal((await api("POST", "/api/pendataan/isian", o, H(cA))).s, 400, JSON.stringify(o));
  assert.equal(await n("pdt_isian"), 1);
  const besar = await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {isi: "x".repeat(70001)}, kirim: false}, H(cA)); assert.ok([400, 413].includes(besar.s));
});

uji("isian: kirim, ubah, kembali jadi draf; jenis tidak bisa diubah; Lainnya terisi tersimpan", async () => {
  const kirim = await api("POST", "/api/pendataan/isian", {id: isA1, jenis: "data", isi: {...DATA, jenis_data: ["Kejadian bencana", "Lainnya"], jenis_data_lain: "Citra drone"}, kirim: true}, H(cA));
  assert.equal(kirim.s, 200); assert.equal(kirim.j.isian.status, "terkirim"); assert.ok(kirim.j.isian.dikirim); assert.equal(kirim.j.isian.isi.jenis_data_lain, "Citra drone");
  assert.equal((await api("POST", "/api/pendataan/isian", {id: isA1, jenis: "aplikasi", isi: {}, kirim: false}, H(cA))).s, 400);
  const balik = await api("POST", "/api/pendataan/isian", {id: isA1, jenis: "data", isi: DATA, kirim: false}, H(cA));
  assert.equal(balik.j.isian.status, "draf"); assert.equal(balik.j.isian.dikirim, null);
  const lagi = await api("POST", "/api/pendataan/isian", {id: isA1, jenis: "data", isi: DATA, kirim: true}, H(cA)); assert.equal(lagi.j.isian.status, "terkirim");
  const dua = await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {nama: "Draf kedua milik A"}, kirim: false}, H(cA)); assert.equal(dua.s, 201); isA2 = dua.j.isian.id;   // banyak isian data per akun
});

uji("isian umum: satu per akun, yang kedua 409", async () => {
  const u = await api("POST", "/api/pendataan/isian", {jenis: "umum", isi: UMUM, kirim: true}, H(cA)); assert.equal(u.s, 201); isU = u.j.isian.id;
  const dua = await api("POST", "/api/pendataan/isian", {jenis: "umum", isi: UMUM, kirim: true}, H(cA)); assert.equal(dua.s, 409);
  assert.equal((await api("POST", "/api/pendataan/isian", {id: isU, jenis: "umum", isi: {...UMUM, usul: "Diubah"}, kirim: true}, H(cA))).s, 200);
  assert.equal((await DB.prepare("SELECT count(*) n FROM pdt_isian WHERE akun_id = ? AND jenis = 'umum'").bind(await idAkun("pusdatina")).first()).n, 1);
});

uji("isolasi: akun lain tidak bisa mengubah, menghapus, mengunggah ke isian orang; rekan satu unit baca terkirim saja tanpa WA dan email", async () => {
  // C (dalops) menyentuh isian A (pusdatin): semuanya 404
  assert.equal((await api("POST", "/api/pendataan/isian", {id: isA1, jenis: "data", isi: DATA, kirim: true}, H(cC))).s, 404);
  assert.equal((await api("POST", "/api/pendataan/hapus/" + isA1, {}, H(cC))).s, 404);
  assert.equal((await unggah(cC, isA1, "application/pdf", PDF)).status, 404);
  assert.equal((await unggah(cB, isA1, "application/pdf", PDF)).status, 404);   // rekan satu unit pun bukan pemilik
  assert.equal((await api("POST", "/api/pendataan/hapus/" + isA1, {}, H(cB))).s, 404);
  // saya: milik sendiri
  const a = await api("GET", "/api/pendataan/saya", undefined, {cookie: cA});
  assert.equal(a.s, 200); assert.equal(a.j.akun.username, "pusdatina"); assert.equal(a.j.isian.length, 3); assert.equal(a.j.rekan.length, 0);
  // B rekan satu unit: melihat isian TERKIRIM A (data + umum), bukan drafnya
  const b = await api("GET", "/api/pendataan/saya", undefined, {cookie: cB});
  const ids = b.j.rekan.map(r => r.id).sort();
  assert.deepEqual(ids, [isA1, isU].sort()); assert.ok(!ids.includes(isA2));
  assert.ok(b.j.rekan.every(r => r.pengisi === "Budi pusdatina" && "isi" in r && "berkas" in r));
  const A = await DB.prepare("SELECT wa, email, nip FROM pdt_akun WHERE username = 'pusdatina'").first();
  for (const rahasia of [A.wa, A.email, "pusdatina@"]) assert.ok(!b.t.includes(rahasia), "data pribadi rekan bocor: " + rahasia);
  // C dari unit lain tidak melihat apa pun
  assert.equal((await api("GET", "/api/pendataan/saya", undefined, {cookie: cC})).j.rekan.length, 0);
});

uji("rekan 'lainnya' dicocokkan dengan nama unit yang sama tanpa beda huruf besar", async () => {
  for (const [u, k, nm] of [["lainnye", 7, "Biro Hukum dan Kerja Sama"], ["lainnyf", 8, "biro hukum dan kerja sama"], ["lainnyg", 9, "Biro Lain"]]) {
    assert.equal((await daftar(akunBaru(u, "lainnya", k, {unit_lain: nm}), k)).s, 201); await setujui(u);
  }
  const [e, f, g] = [(await masuk("lainnye", SANDI, 60)).cookie, (await masuk("lainnyf", SANDI, 61)).cookie, (await masuk("lainnyg", SANDI, 62)).cookie];
  const baru = await api("POST", "/api/pendataan/isian", {jenis: "umum", isi: UMUM, kirim: true}, H(e)); assert.equal(baru.s, 201);
  assert.deepEqual((await api("GET", "/api/pendataan/saya", undefined, {cookie: f})).j.rekan.map(r => r.id), [baru.j.isian.id]);
  assert.equal((await api("GET", "/api/pendataan/saya", undefined, {cookie: g})).j.rekan.length, 0);
});

uji("berkas: unggah sah, mime palsu ditolak, terlalu besar 413, batas jumlah, unduh sesuai hak, hapus", async () => {
  assert.equal((await unggah(cA, isA1, "text/html", PDF)).status, 415);
  assert.equal((await unggah(cA, isA1, "application/pdf", new TextEncoder().encode("<html>bukan pdf</html>"))).status, 400);   // mime palsu
  assert.equal((await unggah(cA, isA1, "image/png", PDF)).status, 400);
  assert.equal((await unggah(cA, isA1, "application/vnd.ms-excel", PDF)).status, 400);
  assert.equal((await unggah(cA, isA1, "text/csv", new Uint8Array([0x61, 0x2c, 0x00, 0x62]))).status, 400);   // CSV dengan NUL
  assert.equal((await unggah(cA, isA1, "text/csv", new Uint8Array([0xff, 0xfe, 0xfd]))).status, 400);   // bukan UTF-8
  assert.equal((await unggah(cA, isA1, "application/pdf", new Uint8Array(0))).status, 400);
  const besar = new Uint8Array(S.BERKAS.maks + 1); besar.set(PDF);
  assert.equal((await unggah(cA, isA1, "application/pdf", besar)).status, 413);
  assert.equal(await n("pdt_berkas"), 0);
  const ok = await unggah(cA, isA1, "application/pdf", PDF, "Laporan Harian (final) \"1\".pdf"); assert.equal(ok.status, 201);
  const b = (await ok.json()).berkas; berkasA = b.id; assert.equal(b.mime, "application/pdf"); assert.equal(b.ukuran, PDF.length); assert.equal(b.nama, "Laporan Harian (final) \"1\".pdf");
  assert.ok(await (await U.mf.getR2Bucket("MEDIA")).head(`pendataan/${isA1}/${berkasA}`));
  assert.equal((await unggah(cA, isA1, "text/csv", new TextEncoder().encode("a,b\n1,2\n"), "tabel.csv")).status, 201);
  assert.equal((await unggah(cA, isA1, "image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]), "foto.jpg")).status, 201);
  assert.equal((await unggah(cA, isA1, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", new Uint8Array([0x50, 0x4b, 3, 4, 9]), "a.docx")).status, 201);
  assert.equal((await unggah(cA, isA1, "image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]), "a.png")).status, 201);
  assert.equal((await unggah(cA, isA1, "application/pdf", PDF)).status, 409);   // batas per isian
  // unduh: pemilik, rekan satu unit (isian terkirim), Super Admin boleh; unit lain 404; tanpa login 401
  for (const c of [{cookie: cA}, {cookie: cB}, ADMIN]) {
    const r = await U.mf.dispatchFetch("http://bnpb.lokal/api/pendataan/berkas/" + berkasA, {headers: c});
    assert.equal(r.status, 200); assert.deepEqual(new Uint8Array(await r.arrayBuffer()), PDF);
    assert.equal(r.headers.get("content-type"), "application/pdf"); assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.match(r.headers.get("cache-control"), /private, no-store/);
    assert.equal(r.headers.get("content-disposition"), `attachment; filename="Laporan_Harian__final___1_.pdf"; filename*=UTF-8''Laporan%20Harian%20%28final%29%20%221%22.pdf`);
  }
  assert.equal((await api("GET", "/api/pendataan/berkas/" + berkasA, undefined, {cookie: cC})).s, 404);
  assert.equal((await api("GET", "/api/pendataan/berkas/" + berkasA)).s, 401);
  assert.equal((await api("GET", "/api/pendataan/berkas/" + "e".repeat(16), undefined, {cookie: cA})).s, 404);
  // rekan tidak bisa mengunduh berkas isian yang masih draf; pemilik tetap bisa
  const dr = await unggah(cA, isA2, "application/pdf", PDF); assert.equal(dr.status, 201); const bd = (await dr.json()).berkas.id;
  assert.equal((await api("GET", "/api/pendataan/berkas/" + bd, undefined, {cookie: cB})).s, 404);
  assert.equal((await api("GET", "/api/pendataan/berkas/" + bd, undefined, {cookie: cA})).s, 200);
  // hapus: bukan pemilik 404; pemilik ok dan objek R2 ikut hilang
  assert.equal((await api("POST", "/api/pendataan/berkas-hapus/" + bd, {}, H(cB))).s, 404);
  assert.equal((await api("POST", "/api/pendataan/berkas-hapus/" + bd, {}, H(cA))).s, 200);
  assert.equal(await (await U.mf.getR2Bucket("MEDIA")).head(`pendataan/${isA2}/${bd}`), null);
  const saya = await api("GET", "/api/pendataan/saya", undefined, {cookie: cB});
  assert.equal(saya.j.rekan.find(r => r.id === isA1).berkas.length, 5);
});

uji("hapus isian ikut menghapus berkas dan objek R2", async () => {
  const tmp = await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {nama: "Sementara"}, kirim: false}, H(cA));
  const up = await (await unggah(cA, tmp.j.isian.id, "application/pdf", PDF)).json();
  assert.equal((await api("POST", "/api/pendataan/hapus/" + tmp.j.isian.id, {}, H(cA))).s, 200);
  assert.equal(await n("pdt_isian", `id = '${tmp.j.isian.id}'`), 0); assert.equal(await n("pdt_berkas", `id = '${up.berkas.id}'`), 0);
  assert.equal(await (await U.mf.getR2Bucket("MEDIA")).head(`pendataan/${tmp.j.isian.id}/${up.berkas.id}`), null);
});

uji("ekspor CSV: BOM, kolom per jenis, injeksi formula dinetralkan, hanya Super Admin", async () => {
  const f = await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {...DATA, nama: "=HYPERLINK(\"http://x\")", isi: "+1 baris\nkedua", jenis_data: ["Kejadian bencana", "Lainnya"], jenis_data_lain: "@drone"}, kirim: true}, H(cA));
  assert.equal(f.s, 201);
  const mentah = await U.mf.dispatchFetch("http://bnpb.lokal/api/pendataan/admin/ekspor?jenis=data", {headers: ADMIN});   // Response.text() membuang BOM, jadi periksa byte
  const byte = new Uint8Array(await mentah.arrayBuffer()), r = {s: mentah.status, h: mentah.headers, t: new TextDecoder("utf-8", {ignoreBOM: true}).decode(byte)};
  assert.equal(r.s, 200); assert.match(r.h.get("content-type"), /text\/csv/); assert.match(r.h.get("content-disposition"), /pendataan-data\.csv/);
  assert.deepEqual([...byte.slice(0, 3)], [0xef, 0xbb, 0xbf], "BOM UTF-8");
  const baris = r.t.slice(1).split("\r\n"), kop = baris[0];
  assert.ok(kop.startsWith('"Unit","Pengisi","Jabatan","Status","Dikirim (WIB)","Nama data, dokumen, atau laporan"')); assert.equal(kop.split('","').length, 5 + S.KOLOM.data.length);
  assert.ok(r.t.includes(`"'=HYPERLINK(""http://x"")"`), "sel berawalan = diawali '");
  assert.ok(r.t.includes(`"'+1 baris kedua"`), "sel berawalan + diawali ' dan baris baru dirapikan");
  assert.ok(r.t.includes("Lainnya: @drone"), "Lainnya diganti isian manual"); assert.ok(r.t.includes('"Direktorat Pusdatin"') || r.t.includes('"Pusdatin"'));
  for (const sel of r.t.slice(1).split('","')) assert.ok(!/^[=+\-@]/.test(sel.replace(/^"/, "")), "ada sel berawalan formula: " + sel.slice(0, 30));
  assert.equal((await adm("GET", "/api/pendataan/admin/ekspor?jenis=umum")).s, 200);
  assert.equal((await adm("GET", "/api/pendataan/admin/ekspor?jenis=liar")).s, 400);
});

uji("barisUnit: kelima status unit dari data", () => {
  const ak = (status, o = {}) => ({status, nama: "N", wa: "62812", ...o});
  assert.equal(barisUnit([], []).status, "Belum ada akun");
  assert.equal(barisUnit([ak("ditolak"), ak("dicabut")], []).status, "Belum ada akun");
  assert.equal(barisUnit([ak("menunggu")], []).status, "Akun menunggu");
  assert.equal(barisUnit([ak("aktif")], []).status, "Belum mengisi");
  assert.equal(barisUnit([ak("aktif")], [{status: "draf", jenis: "data"}]).status, "Draf");
  const s = barisUnit([ak("aktif"), ak("menunggu")], [{status: "terkirim", jenis: "data", dikirim: 5}, {status: "terkirim", jenis: "aplikasi", dikirim: 9}, {status: "draf", jenis: "umum"}]);
  assert.equal(s.status, "Sudah kirim"); assert.equal(s.data, 1); assert.equal(s.aplikasi, 1); assert.equal(s.umum, 0); assert.equal(s.draf, 1); assert.equal(s.terakhir, 9); assert.equal(s.pic.length, 1);
});

uji("magicSah: byte awal harus cocok dengan jenis", () => {
  assert.ok(magicSah("application/pdf", PDF)); assert.ok(!magicSah("application/pdf", new Uint8Array([0x50, 0x4b, 3, 4])));
  assert.ok(magicSah("application/msword", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1]))); assert.ok(!magicSah("application/msword", PDF));
  assert.ok(magicSah("text/csv", new TextEncoder().encode("nama,jumlah\nÅ,1\n"))); assert.ok(!magicSah("text/plain", PDF));
});

uji("monitoring: ringkas admin memuat unit sasaran urut spek, pic untuk tagih, dan akun/isian", async () => {
  const r = await adm("GET", "/api/pendataan/admin/ringkas");
  assert.equal(r.s, 200); assert.deepEqual(r.j.unit.map(u => u.kunci), S.UNIT_SASARAN); assert.equal(r.j.ringkas.unit_total, 10);
  const pusdatin = r.j.unit[0]; assert.equal(pusdatin.status, "Sudah kirim"); assert.equal(pusdatin.nama, "Pusdatin"); assert.equal(pusdatin.akun_aktif, 2); assert.ok(pusdatin.data >= 2);
  assert.ok(pusdatin.pic.some(p => p.wa.startsWith("62")));
  assert.equal(r.j.unit.find(u => u.kunci === "dalops").status, "Belum mengisi");
  assert.equal(r.j.unit.find(u => u.kunci === "rrs").status, "Belum ada akun");
  assert.equal(r.j.lainnya.length, 3); assert.ok(r.j.lainnya.some(u => u.unit_lain.toLowerCase() === "biro hukum dan kerja sama" && u.akun_aktif === 2));   // dua ejaan huruf besar = satu unit
  assert.ok(r.j.akun.length >= 6 && r.j.akun.every(a => !("sandi_hash" in a) && !("garam" in a)));
  assert.ok(r.j.isian.every(i => i.pengisi && typeof i.isi === "object"));
  assert.ok(r.j.ringkas.draf >= 1 && r.j.ringkas.umum >= 2);
});

uji("batas laju: isian 300 per jam dan unggah 60 per jam per akun", async () => {
  const id = await idAkun("pusdatinb");
  const baris = (aksi, jml) => DB.batch(Array.from({length: jml}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(id, aksi, Date.now())));
  await baris("pendataan.isian", 300);
  const r = await api("POST", "/api/pendataan/isian", {jenis: "umum", isi: UMUM, kirim: false}, H(cB)); assert.equal(r.s, 429); assert.ok(r.h.get("retry-after"));
  const mine = await api("POST", "/api/pendataan/isian", {jenis: "umum", isi: UMUM, kirim: false}, H(cA)); assert.ok(mine.s !== 429, "batas per akun, bukan global");
  const x = await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {nama: "Untuk laju"}, kirim: false}, H(cC)); assert.equal(x.s, 201);
  await baris("pendataan.unggah", 60);
  assert.equal((await unggah(cB, x.j.isian.id, "application/pdf", PDF)).status, 404);   // bukan miliknya: ditolak sebelum laju
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(id).run();
});

uji("masuk: delapan sandi salah per username dan IP berujung 429, dan sesudah terkunci sandi benar pun ditolak", async () => {
  for (let i = 0; i < 8; i++) assert.equal((await masuk("dalopsc", "salah-sandi-xx", 70)).s, 401);
  const kunci = await masuk("dalopsc", "salah-sandi-xx", 70); assert.equal(kunci.s, 429); assert.ok(kunci.h.get("retry-after"));
  assert.equal((await masuk("dalopsc", SANDI, 70)).s, 429);   // sandi pilihan sendiri: kunci menahan tebakan, bukan hanya pencatatan
  assert.equal((await masuk("dalopsc", SANDI, 71)).s, 200);   // IP lain tidak ikut terkunci
});

uji("reset Super Admin: sandi acak tampil sekali, wajib_ganti menutup isian, ganti sandi membukanya", async () => {
  const id = await idAkun("pusdatina");
  assert.equal((await api("POST", "/api/pendataan/admin/akun/" + id, {aksi: "reset"}, MOD2)).s, 403);
  const r = await adm("POST", "/api/pendataan/admin/akun/" + id, {aksi: "reset"});
  assert.equal(r.s, 200); assert.ok(r.j.sandi.length >= 10); assert.equal(r.j.username, "pusdatina");
  assert.equal((await api("GET", "/api/pendataan/saya", undefined, {cookie: cA})).s, 401);   // sesi lama mati
  assert.equal((await masuk("pusdatina", SANDI)).s, 401);   // sandi lama mati
  assert.equal((await DB.prepare("SELECT wajib_ganti FROM pdt_akun WHERE id = ?").bind(id).first()).wajib_ganti, 1);
  const m = await masuk("pusdatina", r.j.sandi, 80); assert.equal(m.s, 200); assert.equal(m.j.akun.wajib_ganti, true);
  const s = await api("GET", "/api/pendataan/saya", undefined, {cookie: m.cookie});
  assert.equal(s.s, 200); assert.equal(s.j.akun.wajib_ganti, true); assert.deepEqual(s.j.isian, []); assert.match(s.j.pesan, /sandi baru/);
  assert.equal((await api("POST", "/api/pendataan/isian", {jenis: "data", isi: {nama: "x"}, kirim: false}, H(m.cookie))).s, 403);
  assert.equal((await api("POST", "/api/pendataan/hapus/" + isA2, {}, H(m.cookie))).s, 403);
  assert.equal((await unggah(m.cookie, isA1, "application/pdf", PDF)).status, 403);
  // ganti sandi: lama salah 401, baru pendek 400, sama 400, benar 200
  const g = (lama, baru) => api("POST", "/api/pendataan/gantisandi", {sandi_lama: lama, sandi: baru}, H(m.cookie));
  assert.equal((await g("salah-sekali-x", "sandi-baru-12345")).s, 401);
  assert.equal((await g(r.j.sandi, "pendek")).s, 400);
  assert.equal((await g(r.j.sandi, r.j.sandi)).s, 400);
  assert.equal((await g(r.j.sandi, "sandi-baru-12345")).s, 200);
  assert.equal((await masuk("pusdatina", r.j.sandi, 81)).s, 401);
  const baru = await masuk("pusdatina", "sandi-baru-12345", 82); assert.equal(baru.s, 200); assert.equal(baru.j.akun.wajib_ganti, false);
  cA = baru.cookie;
  assert.equal((await api("POST", "/api/pendataan/isian", {id: isA2, jenis: "data", isi: {nama: "Draf kedua milik A, diubah"}, kirim: false}, H(cA))).s, 200);
});

uji("dummy: isi memuat kelima status unit, angka bukan nol, berkas R2; hapus menyisakan data asli", async () => {
  const asli = {akun: await n("pdt_akun"), isian: await n("pdt_isian"), berkas: await n("pdt_berkas")};
  assert.equal((await api("POST", "/api/pendataan/dummy", {aksi: "isi"}, MOD2)).s, 403);
  assert.equal(asli.akun > 0 && (await n("pdt_akun", "dummy = 1")), 0);
  const isi = await adm("POST", "/api/pendataan/dummy", {aksi: "isi"});
  assert.equal(isi.s, 201); assert.ok(isi.j.akun >= 10 && isi.j.isian >= 15);
  assert.equal((await adm("POST", "/api/pendataan/dummy", {aksi: "isi"})).s, 409);   // dummy hidup dihitung
  const r = (await adm("GET", "/api/pendataan/admin/ringkas")).j;
  assert.deepEqual([...new Set(r.unit.map(u => u.status))].sort(), ["Akun menunggu", "Belum ada akun", "Belum mengisi", "Draf", "Sudah kirim"].sort());
  const R = r.ringkas;
  for (const k of ["unit_sudah", "akun_aktif", "akun_menunggu", "data", "aplikasi", "umum", "draf"]) assert.ok(R[k] > 0, k + " harus bukan nol");
  assert.deepEqual([...new Set(r.akun.filter(a => a.dummy).map(a => a.status))].sort(), ["aktif", "ditolak", "dicabut", "menunggu"].sort());
  const angka = r.unit.map(u => u.data); assert.ok(new Set(angka).size > 3, "angka antarunit tidak sama rata");
  assert.ok(r.lainnya.length >= 1); assert.ok(r.isian.some(i => i.dummy && i.jenis === "data" && JSON.stringify(i.isi).includes("Lainnya")));
  for (const j of S.JENIS) assert.ok(r.isian.some(i => i.dummy && i.jenis === j && i.status === "terkirim"), j);
  // dummy hanya untuk layar Super Admin: responden asli Pusdatin tidak melihat isian rekan dummy, dan tautan tagih tidak menunjuk nomor dummy
  const sy = await api("GET", "/api/pendataan/saya", undefined, {cookie: cA});
  assert.equal(sy.s, 200); assert.ok(!sy.j.rekan.some(x => /Dummy/.test(x.pengisi)), "rekan dummy bocor ke responden asli");
  assert.ok(r.unit.every(u => u.pic.every(p => !/^62812000000/.test(p.wa))), "tagih menunjuk nomor dummy");
  for (const i of r.isian.filter(i => i.dummy && i.status === "terkirim")) assert.ok(!S.periksaIsian(i.jenis, i.isi, true).galat, "dummy lolos periksaIsian: " + i.id);
  const unitRekan = r.akun.filter(a => a.dummy && a.unit === "logistik" && a.status === "aktif"); assert.equal(unitRekan.length, 2);
  const bd = await DB.prepare("SELECT b.id, b.isian_id FROM pdt_berkas b WHERE b.dummy = 1").first(); assert.ok(bd, "satu berkas dummy");
  assert.ok(await (await U.mf.getR2Bucket("MEDIA")).head(`pendataan/${bd.isian_id}/${bd.id}`));
  const unduhDummy = await U.mf.dispatchFetch("http://bnpb.lokal/api/pendataan/berkas/" + bd.id, {headers: ADMIN}); assert.equal(unduhDummy.status, 200); assert.ok(new TextDecoder().decode(await unduhDummy.arrayBuffer()).startsWith("%PDF"));
  // hapus: nol dummy, objek R2 hilang, data asli utuh
  const h = await adm("POST", "/api/pendataan/dummy", {aksi: "hapus"}); assert.equal(h.s, 200);
  for (const t of ["pdt_akun", "pdt_isian", "pdt_berkas"]) assert.equal(await n(t, "dummy = 1"), 0, t);
  assert.deepEqual({akun: await n("pdt_akun"), isian: await n("pdt_isian"), berkas: await n("pdt_berkas")}, asli);
  assert.equal(await (await U.mf.getR2Bucket("MEDIA")).head(`pendataan/${bd.isian_id}/${bd.id}`), null);
  assert.equal(await n("pdt_sesi", "akun_id NOT IN (SELECT id FROM pdt_akun)"), 0);
  assert.equal((await adm("POST", "/api/pendataan/dummy", {aksi: "isi"})).s, 201);   // bisa diisi lagi sesudah dihapus
  assert.equal((await adm("POST", "/api/pendataan/dummy", {aksi: "hapus"})).s, 200);
  assert.equal((await adm("POST", "/api/pendataan/dummy", {aksi: "ngawur"})).s, 400);
});

uji("tabel belum dimigrasi: rute membalas 503 sopan, bukan 500", async () => {
  await DB.batch(["pdt_berkas", "pdt_isian", "pdt_sesi", "pdt_akun"].map(t => DB.prepare(`ALTER TABLE ${t} RENAME TO ${t}_x`)));
  try {
    assert.equal((await api("POST", "/api/pendataan/masuk", {username: "pusdatina", sandi: SANDI}, ip(90))).s, 503);
    assert.equal((await adm("GET", "/api/pendataan/admin/ringkas")).s, 503);
  } finally { await DB.batch(["pdt_akun", "pdt_sesi", "pdt_isian", "pdt_berkas"].map(t => DB.prepare(`ALTER TABLE ${t}_x RENAME TO ${t}`))); }
});
