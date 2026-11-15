/* Titik pengungsian KP-19 (src/pengungsian_titik.js, migrations/0134 + 0135, data/kajian-bnpb/keterpaduan/RENCANA-UJI.md T11 dan T12)
   di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya. Jalankan: node --test tests/warga/pengungsian_titik.test.mjs */
import assert from "node:assert/strict";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";

const uji = berantai(), HARI = 864e5, wib = t => new Date(t + 7 * 36e5).toISOString().slice(0, 10), KINI = Date.now(), hari = h => wib(KINI - h * HARI);
const {DB, api, adm, n} = await siapkan("uji-pengungsian-titik");
const PIDIE = "1107", ACEH_BESAR = "1106", LAT = 5.1, LON = 96.1;
const petugas = async (kab, meja = ["pengungsi"]) => { const r = await adm("POST", "/api/meja/petugas", {nama: "Petugas Uji", prov: "11", kab, meja}); assert.equal(r.s, 201, r.t); return {"x-kode": r.j.kode}; };
const titik = (b, h = ADMIN) => api("POST", "/api/pengungsian/titik", {kab4: PIDIE, nama: "Balai Desa Uji", jenis_tempat: "terkonsentrasi", lat: LAT, lon: LON, ...b}, h);
const pgs = (o = {}) => ({tgl_data: hari(1), nama_tempat: "Balai Uji", jenis_tempat: "terkonsentrasi", kejadian: "banjir", tgl_buka: hari(3), kk: 5, bayi_l: 1, bayi_p: 1, balita_l: 1, balita_p: 1, anak_l: 1, anak_p: 1, remaja_l: 1, remaja_p: 1, dewasa_l: 2, dewasa_p: 2, lansia_l: 1, lansia_p: 1,
  keb_air: "ada", keb_pangan: "ada", keb_sandang: "ada", keb_kesehatan: "ada", keb_hunian: "ada", keb_pendidikan: "ada", ...o});
const catat = (h, kab, data) => api("POST", "/api/meja/catatan", {meja: "pengungsi", prov: "11", kab, kec: "Kec. Uji", desa: "Desa Uji", data}, h);
let A, B, idA;

uji("T11 titik pengungsian: 150 m menanyakan dulu, 250 m langsung jadi, paksa membuat", async () => {
  A = await petugas("Pidie"); B = await petugas("Aceh Besar");
  const p = await titik({}); assert.equal(p.s, 201, p.t); idA = p.j.titik.id; assert.match(idA, /^TP-[A-Z2-7]{8}$/);
  const d150 = 150 / 111320, d250 = 250 / 111320;
  const dekat = await titik({nama: "Masjid Uji", lat: LAT + d150}); assert.equal(dekat.s, 409, dekat.t);
  assert.equal(dekat.j.dekat.length, 1); assert.equal(dekat.j.dekat[0].id, idA); assert.ok(dekat.j.dekat[0].jarak_m > 140 && dekat.j.dekat[0].jarak_m < 160);
  assert.equal(await n("titik_pengungsian"), 1);
  const jauh = await titik({nama: "Lapangan Uji", lat: LAT + d250}); assert.equal(jauh.s, 201, jauh.t);
  const paksa = await titik({nama: "Masjid Uji", lat: LAT + d150, paksa: true}); assert.equal(paksa.s, 201, paksa.t);
  assert.equal(await n("titik_pengungsian"), 3);
  const g = await api("GET", `/api/pengungsian/titik?kab4=${PIDIE}`, undefined, ADMIN); assert.equal(g.s, 200, g.t);
  assert.equal(g.j.titik.length, 3); assert.equal(g.j.titik[0].putaran_terakhir, null); assert.equal(g.j.titik[0].basi, true);
  const tup = await api("POST", "/api/pengungsian/titik/tutup", {id: paksa.j.titik.id}, ADMIN); assert.equal(tup.s, 200, tup.t);
  assert.equal((await api("POST", "/api/pengungsian/titik/tutup", {id: paksa.j.titik.id}, ADMIN)).s, 409);
});

uji("T12 isian (titik, tanggal) ganda 409; catatan tanpa titik tetap memakai indeks lama", async () => {
  const a = await catat(A, "Pidie", pgs({titik_id: idA})); assert.equal(a.s, 201, a.t);
  assert.equal((await DB.prepare("SELECT json_extract(data, '$.titik_id') t FROM meja_catatan WHERE id = ?").bind(a.j.catatan.id).first()).t, idA);
  const dua = await catat(A, "Pidie", pgs({titik_id: idA, nama_tempat: "Nama Lain"})); assert.equal(dua.s, 409, dua.t);   // nama beda: yang menahan indeks (titik, tanggal)
  assert.equal((await catat(A, "Pidie", pgs({titik_id: idA, tgl_data: hari(2)}))).s, 201);   // tanggal lain boleh
  assert.equal((await catat(A, "Pidie", pgs({nama_tempat: "Tanpa Titik"}))).s, 201);
  assert.equal((await catat(A, "Pidie", pgs({nama_tempat: "Tanpa Titik"}))).s, 409);   // indeks lama (nama, tanggal)
  assert.equal((await catat(A, "Pidie", pgs({nama_tempat: "Tanpa Titik Dua"}))).s, 201);
  assert.equal((await catat(A, "Pidie", pgs({titik_id: "TP-ZZZZZZZZ", nama_tempat: "X"}))).s, 400);   // titik tak ada
  assert.equal((await catat(A, "Pidie", pgs({titik_id: "bukan-kode", nama_tempat: "Y"}))).s, 400);
  const g = await api("GET", `/api/pengungsian/titik?kab4=${PIDIE}`, undefined, ADMIN);
  assert.equal(g.j.titik.find(t => t.id === idA).putaran_terakhir, hari(1)); assert.equal(g.j.titik.find(t => t.id === idA).basi, false);
});

uji("petugas kab A tidak membuat, melihat, menutup, atau memakai titik di kab B", async () => {
  assert.equal((await titik({kab4: ACEH_BESAR, nama: "Titik B"}, A)).s, 403);
  assert.equal((await api("GET", `/api/pengungsian/titik?kab4=${ACEH_BESAR}`, undefined, A)).s, 403);
  const tb = await titik({kab4: ACEH_BESAR, nama: "Titik B", lat: 5.5, lon: 95.5}, B); assert.equal(tb.s, 201, tb.t);
  assert.equal((await api("POST", "/api/pengungsian/titik/tutup", {id: tb.j.titik.id}, A)).s, 404);
  assert.equal((await catat(A, "Pidie", pgs({titik_id: tb.j.titik.id, nama_tempat: "Z"}))).s, 400, "titik kab lain ditolak di meja pengungsi");
  assert.equal((await titik({nama: "Tanpa kab4 sendiri", lat: 5.9, lon: 96.5}, A)).s, 201, "kab4 petugas dipakai bila tidak dikirim");   // kab4 default = kab petugas
  const kj = await api("GET", "/api/pengungsian/titik", undefined, A); assert.equal(kj.s, 200); assert.ok(kj.j.titik.every(t => t.kab4 === PIDIE));
  const tanpaMeja = await petugas("Pidie", ["kaji_cepat"]); assert.equal((await titik({}, tanpaMeja)).s, 403);
});

uji("titik pengungsian tidak tampil di rute publik atau tanpa kode", async () => {
  assert.equal((await api("GET", `/api/pengungsian/titik?kab4=${PIDIE}`, undefined, {})).s, 403);
  assert.equal((await titik({}, {})).s, 403);
  for (const j of ["/api/titik", "/api/warga", "/api/meja/ringkas", "/api/meja/spek", "/api/status"]) { const r = await api("GET", j, undefined, {}); assert.ok(!/Balai Desa Uji|Masjid Uji|TP-[A-Z2-7]{8}/.test(r.t), `${j} membocorkan titik`); }
});

uji("validasi: nama berisi nomor HP, koordinat sebelah, jenis salah, kolom asing, kejadian_id gaib ditolak", async () => {
  for (const b of [{nama: "Hubungi 081234567890"}, {lat: 5.1, lon: undefined}, {lat: 50, lon: 96}, {jenis_tempat: "gedung"}, {zzz: 1}, {kab4: "9999"}, {kejadian_id: "KJ-2026-ABCDEFGH"}, {paksa: "ya"}]) {
    const r = await titik({lat: 5.7, lon: 96.7, ...b}); assert.ok([400].includes(r.s), `${JSON.stringify(b)} -> ${r.s} ${r.t}`);
  }
});

uji("kejadian_id harus menyentuh kab titik; kec/desa bersih; tutup di rentang buka..hari ini; catatan sesudah tutup ditolak; spek publik tanpa titik_id", async () => {
  const KJ = "KJ-2026-ABCDEFGH";
  await DB.batch([DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, mulai, fase_diubah, asal, dibuat, diubah, oleh) VALUES (?, 'banjir', 'Banjir Uji', ?, ?, 'manual', ?, ?, 'uji')").bind(KJ, hari(5), KINI, KINI, KINI),
    DB.prepare("INSERT INTO sk_kejadian_kab (kejadian_id, kab4, mulai, dibuat) VALUES (?, ?, ?, ?)").bind(KJ, ACEH_BESAR, hari(5), KINI)]);
  assert.equal((await titik({nama: "Kj Salah", lat: 5.3, lon: 96.3, kejadian_id: KJ})).s, 400, "kejadian tidak mencakup Pidie");
  assert.equal((await titik({kab4: ACEH_BESAR, nama: "Kj Benar", lat: 5.4, lon: 95.4, kejadian_id: KJ, buka: hari(4)})).s, 201);
  assert.equal((await titik({nama: "Kec Angka", lat: 5.31, lon: 96.31, kec: 5})).s, 400);
  assert.equal((await titik({nama: "Desa HP", lat: 5.31, lon: 96.31, desa: "hubungi 081234567890"})).s, 400);
  const t = await titik({nama: "Tutup Uji", lat: 5.32, lon: 96.32, buka: hari(4)}); assert.equal(t.s, 201, t.t);
  const id = t.j.titik.id, tutup = b => api("POST", "/api/pengungsian/titik/tutup", {id, ...b}, ADMIN);
  assert.equal((await tutup({tutup: hari(-3)})).s, 400, "masa depan");
  assert.equal((await tutup({tutup: hari(6)})).s, 400, "sebelum buka");
  assert.equal((await tutup({tutup: hari(3)})).s, 200);
  const r = await catat(A, "Pidie", pgs({titik_id: id, tgl_data: hari(1), nama_tempat: "Sesudah Tutup"})); assert.equal(r.s, 400, r.t); assert.match(r.j.galat, /sudah ditutup/);
  assert.equal((await catat(A, "Pidie", pgs({titik_id: id, tgl_data: hari(3), tgl_buka: hari(4), nama_tempat: "Hari Tutup"}))).s, 201);
  const spek = await api("GET", "/api/meja/spek", undefined, {}); assert.ok(!spek.t.includes("titik_id"));
});

uji("laju tulis titik: petugas dibatasi 60 per jam (titik.tulis), buat dan tutup memakai penghitung yang sama", async () => {
  const P = await petugas("Pidie"), pid = (await DB.prepare("SELECT id FROM meja_petugas ORDER BY dibuat DESC LIMIT 1").first()).id;
  await DB.batch(Array.from({length: 60}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'titik.tulis', ?)").bind(pid, KINI)));
  const r = await titik({nama: "Laju", lat: 5.8, lon: 96.8}, P); assert.equal(r.s, 429, r.t);
  assert.equal((await api("POST", "/api/pengungsian/titik/tutup", {id: idA}, P)).s, 429);
});
