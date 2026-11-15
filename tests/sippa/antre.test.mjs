/* SP-011 + KP-12: antrean luring /pipa/lapangan di atas PbAntre (public/inti/antre.js) dengan penyimpanan memori. Rute SP-008 dipalsukan dengan fetch tiruan
   yang mengikuti kontrak DT §4.3-§4.4. Tiap uji membuktikan yang salah DITOLAK, bukan hanya yang benar tersimpan. */
import test from "node:test";
import assert from "node:assert/strict";
import {siapAntre as siap, isiButir, isiFoto, KODE} from "./antre_alat.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const T1 = {tugas_id: "T1"};   // kirim wajib menyebut tugasnya (butir bawaan uji milik T1)
const JENIS = ["log", "probe", "bbm", "gerak", "inspeksi"];

const semuaDiterima = r => ({status: 200, json: {diterima: JENIS.flatMap(j => r.badan[j] || []).map(b => b.id), ganda: [], ditolak: [], jam_server: Date.now()}});
const bbm = (liter = 20) => ({jenis: "bbm", data: {jenis: "solar", aksi: "terima", liter, waktu: Date.now()}, tugas_id: "T1"});
const probe = (kedalaman_cm = 30, suhu_c = 31.5) => ({jenis: "probe", data: {titik: "T2", tahap: "sesudah", kedalaman_cm, suhu_c, waktu: Date.now()}, tugas_id: "T1"});
const log = () => ({jenis: "log", data: {jenis: "karhutla", kelas_medan: "I", panjang_m: 120, n_orang: 4, t_tiba: 1000, t_mulai_gelar: 2000, air_sampai_lance: 1, waktu_klien: Date.now()}, tugas_id: "T1"});
const jpeg = (size = 5) => ({type: "image/jpeg", size});

test("F1 mode pesawat: sesi log + probe sesudah + BBM tersimpan di saluran tugas, jumlah menunggu 3, tanpa satu pun fetch", async () => {
  const {A, simpan, panggilan} = await siap({balas: semuaDiterima});
  for (const b of [log(), probe(), bbm()]) assert.equal((await A.tambah(b)).ok, true);
  assert.equal((await A.jumlah()).menunggu, 3);
  const isi = await isiButir(simpan);
  assert.equal(isi.length, 3, "tersimpan di saluran sippa:T1");
  for (const v of isi) { assert.match(v.klien_id, UUID, "id UUID v4 dibuat klien"); assert.equal(v.status, "menunggu"); assert.equal(v.data.tugas_id, "T1"); assert.equal(v.data.isi.id, v.klien_id, "id yang sama ikut ke data kiriman"); }
  assert.equal(panggilan.length, 0, "menyimpan tidak pernah menyentuh jaringan");
});

test("tambah menolak butir yang melanggar cekButir (F6: kedalaman 300 cm tanpa lengan_dalam) dan jenis liar; tidak ada yang tersimpan", async () => {
  const {A, simpan} = await siap({balas: semuaDiterima});
  const r = await A.tambah(probe(300));
  assert.equal(r.ok, false); assert.match(r.galat[0].pesan, /lengan/); assert.equal(r.galat[0].medan, "kedalaman_cm");
  assert.equal((await A.tambah(probe(300), {lengan_dalam: 1})).ok, true, "lengan_dalam = 1 membolehkan");
  assert.equal((await A.tambah({jenis: "liar", data: {}, tugas_id: "T1"})).ok, false);
  assert.equal((await A.tambah({jenis: "bbm", data: {jenis: "solar", aksi: "terima", liter: -5, waktu: 1}, tugas_id: "T1"})).ok, false, "liter negatif ditolak");
  assert.equal((await isiButir(simpan)).length, 1);
});

test("F2 sinyal kembali: satu POST ke /api/sippa/lapangan/kirim dengan x-kode, jam_kirim, butir dikelompokkan per jenis; terkirim = antrean kosong; panggilan kedua tidak mengirim apa pun", async () => {
  const {A, panggilan} = await siap({balas: semuaDiterima});
  await A.tambah(log()); await A.tambah(probe()); await A.tambah(bbm());
  const sebelum = Date.now();
  const h = await A.kirimSemua(T1);
  assert.equal(panggilan.length, 1);
  const p = panggilan[0];
  assert.equal(p.url, "/api/sippa/lapangan/kirim"); assert.equal(p.metode, "POST"); assert.equal(p.kode, KODE);
  assert.ok(p.badan.jam_kirim >= sebelum && p.badan.jam_kirim <= Date.now());
  assert.deepEqual([p.badan.log.length, p.badan.probe.length, p.badan.bbm.length, p.badan.gerak.length], [1, 1, 1, 0]);
  for (const x of p.badan.bbm) assert.deepEqual(Object.keys(x).sort(), ["aksi", "id", "jenis", "liter", "waktu"], "isi butir persis seperti diisi: tanpa klien_id atau waktu_klien tambahan");
  assert.equal(h.diterima, 3); assert.equal((await A.jumlah()).menunggu, 0);
  await A.kirimSemua(T1);
  assert.equal(panggilan.length, 1, "antrean kosong tidak memanggil server lagi");
});

test("kirim ulang butir yang sama (jawaban ganda) tetap menghapusnya dari antrean: terkirim satu kali, bukan menumpuk", async () => {
  const {A} = await siap({balas: r => ({status: 200, json: {diterima: [], ganda: r.badan.bbm.map(b => b.id), ditolak: [], jam_server: 1}})});
  await A.tambah(bbm());
  const h = await A.kirimSemua(T1);
  assert.equal(h.ganda, 1); assert.equal((await A.jumlah()).total, 0);
});

test("F3/F4 butir ditolak sebagian: HANYA butir yang ditolak server tertinggal dengan alasannya, butir lain dalam paket yang sama diterima dan dihitung sekali, tidak dikirim ulang sebelum diperbaiki, Perbaiki mengembalikannya ke menunggu", async () => {
  let tolak;
  const {A, panggilan} = await siap({balas: r => {
    const semua = [...r.badan.log, ...r.badan.bbm];
    return {status: 200, json: {diterima: semua.filter(b => b.id !== tolak).map(b => b.id), ganda: [], ditolak: semua.filter(b => b.id === tolak).map(b => ({id: b.id, alasan: "t_tiba: tidak boleh lebih awal dari mulai gelar"})), jam_server: 1}};
  }});
  const a = await A.tambah(log()), b = await A.tambah(bbm()), c = await A.tambah(bbm(30));
  tolak = a.id;
  const h = await A.kirimSemua(T1);
  assert.equal(h.diterima, 2, "yang sah dihitung sekali walau terkirim ulang saat paket dibelah"); assert.equal(h.ditolak, 1);
  const j = await A.jumlah();
  assert.deepEqual([j.menunggu, j.ditolak], [0, 1]);
  const d = (await A.daftar()).find(x => x.id === a.id);
  assert.equal(d.keadaan, "ditolak"); assert.match(d.alasan, /tidak boleh lebih awal/);
  assert.equal((await A.daftar()).some(x => x.id === b.id || x.id === c.id), false, "butir yang diterima hilang dari antrean");
  const n = panggilan.length;
  await A.kirimSemua(T1);
  assert.equal(panggilan.length, n, "butir ditolak tidak dikirim ulang diam-diam");
  tolak = null;
  assert.equal((await A.perbaiki(a.id, {...d.data, t_tiba: 500})).ok, true);
  assert.equal((await A.perbaiki(a.id, {...d.data, panjang_m: 9999})).ok, false, "perbaikan juga lewat cekButir");
  const h2 = await A.kirimSemua(T1);
  assert.equal(h2.diterima, 1); assert.equal(panggilan.at(-1).badan.log[0].t_tiba, 500, "yang dikirim isi hasil perbaikan");
});

test("F8 kode dicabut: 403 berhenti dengan pesan 'Kode penugasan sudah dicabut', antrean TIDAK dihapus; 401 minta tautan baru", async () => {
  let status = 403;
  const {A, panggilan} = await siap({balas: () => ({status})});
  await A.tambah(bbm()); await A.tambah(bbm(30));
  const h = await A.kirimSemua(T1);
  assert.equal(h.berhenti, "kode"); assert.equal(h.pesan, "Kode penugasan sudah dicabut");
  assert.equal((await A.jumlah()).menunggu, 2, "butir tetap tersimpan");
  assert.equal(A.kodeTersimpan(), null, "kode yang ditolak server dihapus, tidak dipakai lagi");
  globalThis.localStorage.setItem("sippa.kode", KODE);   // tautan baru ditempel
  status = 401;
  assert.match((await A.kirimSemua(T1)).pesan, /tautan baru/i);
  assert.equal(panggilan.length, 2); assert.equal((await A.jumlah()).menunggu, 2);
});

test("tugas wajib disebut: kirimSemua tanpa tugas_id tidak mengirim apa pun (butir tugas A tidak boleh berangkat dengan kode tugas B)", async () => {
  const {A, panggilan} = await siap({balas: semuaDiterima});
  await A.tambah({...bbm(11), tugas_id: "A"}); await A.tambah({...bbm(22), tugas_id: "B"}); await A.tambah({...bbm(33), tugas_id: null});
  for (const arg of [{}, undefined, {tugas_id: null}, {tugas_id: undefined}]) {
    const h = await A.kirimSemua(arg);
    assert.equal(h.berhenti, "tugas", JSON.stringify(arg));
  }
  assert.equal(panggilan.length, 0, "nol fetch");
  assert.equal((await A.jumlah()).menunggu, 3, "semua butir masih menunggu");
  await A.kirimSemua({tugas_id: "A"});
  assert.deepEqual(panggilan[0].badan.bbm.map(b => b.liter), [11], "hanya milik A; butir tanpa tugas tidak ikut");
});

test("keluar() dan buangSemua() membersihkan kode, penanda terkirim, dan draf tugas itu; buangSemua jalan keluar bila kode mati", async () => {
  const {A, simpan} = await siap({balas: semuaDiterima});
  globalThis.localStorage.setItem("sippa.terkirim", "123"); globalThis.localStorage.setItem("sippa.draf.T1", "{}"); globalThis.localStorage.setItem("sippa.draf.T2", "{}");
  assert.equal((await A.keluar({tugas_id: "T1"})).ok, true);
  for (const k of ["sippa.kode", "sippa.terkirim", "sippa.draf.T1"]) assert.equal(globalThis.localStorage.getItem(k), null, k);
  assert.equal(globalThis.localStorage.getItem("sippa.draf.T2"), "{}", "draf tugas lain tidak disentuh");
  globalThis.localStorage.setItem("sippa.kode", KODE);
  const b = await A.tambah(bbm()); await A.tambahFoto(jpeg(), b.id);
  assert.equal((await A.keluar({tugas_id: "T1"})).ok, false, "isian menunggu mencegah keluar biasa");
  await A.buangSemua({tugas_id: "T1"});
  assert.equal((await isiButir(simpan)).length, 0); assert.equal((await isiFoto(simpan)).length, 0); assert.equal(A.kodeTersimpan(), null);
  assert.equal((await A.jumlah()).total, 0);
});

test("foto 429, 408, 5xx dan jaringan putus: foto tetap menunggu, kirim berhenti 'tunda' (butir tidak berangkat), tidak diunggah lagi sebelum waktunya", async () => {
  for (const mode of [429, 408, 503, "putus"]) {
    const {A, simpan, panggilan} = await siap({balas: () => { if (mode === "putus") throw new TypeError("offline"); return {status: mode}; }});
    const b = await A.tambah(log()); await A.tambahFoto(jpeg(), b.id);
    const t0 = 2_000_000_000;
    const h = await A.kirimSemua({...T1, sekarang: t0});
    assert.equal(h.berhenti, "tunda", String(mode));
    assert.equal((await isiFoto(simpan))[0].status, "menunggu", `${mode}: sementara, bukan ditolak`);
    assert.equal(panggilan.some(p => p.url.endsWith("/kirim")), false, `${mode}: butir menunggu fotonya`);
    await A.kirimSemua({...T1, sekarang: t0 + 1000});
    assert.equal(panggilan.filter(p => p.url.endsWith("/foto")).length, 1, `${mode}: foto belum waktunya, tidak diunggah lagi`);
  }
});

test("tanpa kode tersimpan: tidak ada fetch, berhenti 'kode'", async () => {
  const {A, panggilan} = await siap({balas: semuaDiterima});
  await A.tambah(bbm()); globalThis.localStorage.removeItem("sippa.kode");
  const h = await A.kirimSemua(T1);
  assert.equal(h.berhenti, "kode"); assert.equal(panggilan.length, 0);
});

test("5xx dan jaringan putus: mundur eksponensial berjitter, tidak dikirim lagi sebelum waktunya, butir tetap menunggu sampai berhasil", async () => {
  let mode = 500;
  const {A, panggilan} = await siap({balas: r => { if (mode === "putus") throw new TypeError("Failed to fetch"); return mode === 200 ? semuaDiterima(r) : {status: mode}; }});
  await A.tambah(bbm());
  const t0 = 1_000_000_000;
  const h = await A.kirimSemua({...T1, sekarang: t0});
  assert.equal(h.berhenti, "tunda"); assert.equal((await A.jumlah()).menunggu, 1);
  await A.kirimSemua({...T1, sekarang: t0 + 1000});
  assert.equal(panggilan.length, 1, "belum waktunya = tidak ada fetch");
  mode = "putus";
  await A.kirimSemua({...T1, sekarang: t0 + 200_000});
  assert.equal(panggilan.length, 2, "jaringan putus juga dihitung");
  mode = 200;
  await A.kirimSemua({...T1, sekarang: t0 + 200_000 + 10_000});
  assert.equal(panggilan.length, 2, "mundur kedua lebih panjang dari 10 detik");
  const h3 = await A.kirimSemua({...T1, sekarang: t0 + 400_000});
  assert.equal(h3.diterima, 1); assert.equal((await A.jumlah()).menunggu, 0);
});

test("429 (batas laju server) pada kirim butir: bukan penolakan; butir tetap menunggu, mundur, tidak ada panggilan sebelum waktunya", async () => {
  const {A, panggilan} = await siap({balas: () => ({status: 429})});
  await A.tambah(bbm());
  const t0 = 3_000_000_000;
  const h = await A.kirimSemua({...T1, sekarang: t0});
  assert.equal(h.berhenti, "tunda"); assert.equal(h.ditolak, 0);
  assert.equal((await A.jumlah()).menunggu, 1);
  await A.kirimSemua({...T1, sekarang: t0 + 5_000});
  assert.equal(panggilan.length, 1, "belum waktunya");
});

test("413 membelah kiriman dua lalu mengulang; butir tunggal yang tetap 413 ditolak, bukan berputar", async () => {
  const {A, panggilan} = await siap({balas: r => {
    const n = r.badan.bbm.length;
    return n > 2 ? {status: 413} : semuaDiterima(r);
  }});
  for (let i = 0; i < 4; i++) await A.tambah(bbm(10 + i));
  const h = await A.kirimSemua(T1);
  assert.deepEqual(panggilan.map(p => p.badan.bbm.length), [4, 2, 2]); assert.equal(h.diterima, 4);
  const lain = await siap({balas: () => ({status: 413})});
  await lain.A.tambah(bbm());
  const h2 = await lain.A.kirimSemua(T1);
  assert.equal(lain.panggilan.length, 1); assert.equal(h2.ditolak, 1);
  assert.match((await lain.A.daftar())[0].alasan, /terlalu besar/i);
});

test("paling banyak 200 butir per panggilan, urut dibuat", async () => {
  const {A, panggilan} = await siap({balas: semuaDiterima});
  for (let i = 0; i < 203; i++) await A.tambah(bbm(1 + i));
  await A.kirimSemua(T1);
  assert.equal(panggilan[0].badan.bbm.length, 200);
  assert.equal(panggilan[0].badan.bbm[0].liter, 1, "yang paling dulu dibuat berangkat dulu");
  assert.equal(panggilan[1].badan.bbm.length, 3); assert.equal((await A.jumlah()).total, 0);
});

test("butir diikat ke tugas_id: kiriman tugas B tidak membawa butir tugas A di ponsel yang sama", async () => {
  const {A, panggilan} = await siap({balas: semuaDiterima});
  await A.tambah({...bbm(11), tugas_id: "A"}); await A.tambah({...bbm(22), tugas_id: "B"});
  await A.kirimSemua({tugas_id: "B"});
  assert.deepEqual(panggilan[0].badan.bbm.map(b => b.liter), [22]);
  assert.equal((await A.jumlah({tugas_id: "A"})).menunggu, 1, "milik A masih menunggu");
  assert.equal((await A.jumlah({tugas_id: "B"})).menunggu, 0);
});

test("satu pengiriman pada satu waktu: panggilan kedua selagi berjalan dijawab 'sibuk' tanpa fetch ganda", async () => {
  let lepas;
  const gerbang = new Promise(ok => { lepas = ok; });
  const {A, panggilan} = await siap({balas: async r => { await gerbang; return semuaDiterima(r); }});
  await A.tambah(bbm());
  const satu = A.kirimSemua(T1);
  await new Promise(ok => setTimeout(ok, 10));
  const dua = await A.kirimSemua(T1);
  assert.equal(dua.berhenti, "sibuk");
  lepas(); await satu;
  assert.equal(panggilan.length, 1);
  assert.equal((await A.kirimSemua(T1)).berhenti === "sibuk", false, "kunci dilepas setelah selesai");
});

test("jawaban kirim membawa jam_server ke layar (pita 'jam ponsel berbeda dari jam server')", async () => {
  const {A} = await siap({balas: r => ({status: 200, json: {diterima: r.badan.bbm.map(b => b.id), ganda: [], ditolak: [], jam_server: 1761370800000}})});
  await A.tambah(bbm());
  assert.equal((await A.kirimSemua(T1)).jam_server, 1761370800000);
});

test("F5 IndexedDB gagal: butir teks jatuh ke localStorage dan tetap terkirim; foto ditolak dengan pesan; batas 200 butir", async () => {
  globalThis.indexedDB = {open: () => { throw new Error("IndexedDB diblokir"); }};
  try {
    const {A, panggilan} = await siap({simpan: null, balas: semuaDiterima});
    assert.equal((await A.tambah(bbm())).ok, true);
    const mentah = Object.values(JSON.parse(globalThis.localStorage.getItem("pb_antre2")));
    assert.equal(mentah.length, 1); assert.equal(mentah[0].data.jenis, "bbm");
    const f = await A.tambahFoto(jpeg(10), mentah[0].klien_id);
    assert.equal(f.ok, false); assert.equal(f.pesan, "Foto tidak bisa disimpan luring di peramban ini");
    assert.equal(await A.idbSiap(), false);
    assert.equal((await A.jumlah()).menunggu, 1);
    await A.kirimSemua(T1);
    assert.equal(panggilan.length, 1); assert.equal((await A.jumlah()).menunggu, 0);
    for (let i = 0; i < 200; i++) assert.equal((await A.tambah(bbm(1 + i))).ok, true, `butir ${i}`);
    const penuh = await A.tambah(bbm(999));
    assert.equal(penuh.ok, false); assert.match(penuh.pesan, /penuh/i);
  } finally { delete globalThis.indexedDB; }
});

test("foto: PNG ditolak dengan pesan (server hanya jpeg/webp, ADR-09); JPEG diunggah LEBIH DULU dari butir lewat multipart x-kode; foto 4xx tidak menahan butir", async () => {
  const urut = [];
  const {A, simpan, panggilan} = await siap({balas: r => { urut.push(r.url); return r.url.endsWith("/foto") ? {status: 201, json: {foto_id: "F-1"}} : semuaDiterima(r); }});
  const b = await A.tambah(log());
  const png = await A.tambahFoto({type: "image/png", size: 10}, b.id);
  assert.equal(png.ok, false); assert.match(png.pesan, /PNG/); assert.match(png.pesan, /JPEG|WebP/i);
  assert.equal((await isiFoto(simpan)).length, 0, "PNG tidak masuk antrean");
  assert.equal((await A.tambahFoto(jpeg(9_000_000), b.id)).ok, false, "di atas 8 MiB ditolak di klien");
  assert.equal((await A.tambahFoto(jpeg(1000), "tak-ada")).ok, false, "foto lampiran butir yang tidak ada ditolak");
  assert.equal((await A.tambahFoto(jpeg(1000), b.id)).ok, true);
  assert.equal((await isiFoto(simpan)).length, 1);
  await A.kirimSemua(T1);
  assert.deepEqual(urut, ["/api/sippa/lapangan/foto", "/api/sippa/lapangan/kirim"], "foto dulu");
  assert.equal(panggilan[0].kode, KODE); assert.ok(panggilan[0].badan instanceof FormData); assert.ok(panggilan[0].badan.has("berkas"));
  assert.equal((await isiFoto(simpan)).length, 0, "foto terunggah hilang dari antrean");
  assert.equal((await A.jumlah()).total, 0);
  /* foto ditolak 4xx: butir tetap berangkat tanpa foto */
  const dua = await siap({balas: r => r.url.endsWith("/foto") ? {status: 415} : semuaDiterima(r)});
  const b2 = await dua.A.tambah(log()); await dua.A.tambahFoto({type: "image/webp", size: 5}, b2.id);
  const h = await dua.A.kirimSemua(T1);
  assert.equal(h.diterima, 1, "butir tetap terkirim");
  assert.equal((await isiFoto(dua.simpan))[0].status, "ditolak");
});

test("keluar(): butir belum terkirim mencegah keluar; antrean kosong menghapus kode (DT §6.1.2 langkah 4)", async () => {
  const {A} = await siap({balas: semuaDiterima});
  await A.tambah(bbm());
  assert.equal((await A.keluar()).ok, false); assert.equal(globalThis.localStorage.getItem("sippa.kode"), KODE);
  await A.kirimSemua(T1);
  assert.equal((await A.keluar()).ok, true); assert.equal(globalThis.localStorage.getItem("sippa.kode"), null);
});

/* SP-015: ponsel bersama. caches tiruan meniru cache SW API (kunci = URL jalur + ?k=hash) */
function cachesPalsu() {
  const toko = new Map([["pb-lapangan-api-v3", new Map([
    ["http://x/api/sippa/lapangan/saya?k=aaa", 1], ["http://x/api/lapangan/saya?k=bbb", 1]])], ["pb-lapangan-cangkang-v3", new Map([["/lapangan", 1]])]]);
  const buka = async n => ({keys: async () => [...toko.get(n).keys()].map(url => ({url})), delete: async r => toko.get(n).delete(r.url)});
  return {toko, keys: async () => [...toko.keys()], open: buka};
}

test("SP-015 keluar() dan buangSemua() juga membuang simpanan API SW /api/sippa/lapangan/saya (jalur lain dan cangkang utuh)", async () => {
  for (const fn of ["keluar", "buangSemua"]) {
    const {A} = await siap({balas: semuaDiterima});
    const c = globalThis.caches = cachesPalsu();
    await A[fn]({tugas_id: "T1"});
    assert.deepEqual([...c.toko.get("pb-lapangan-api-v3").keys()], ["http://x/api/lapangan/saya?k=bbb"], `${fn}: hanya jalur sippa dibuang`);
    assert.equal(c.toko.get("pb-lapangan-cangkang-v3").size, 1, "cangkang tidak disentuh");
  }
  delete globalThis.caches;
});

test("SP-015 buangSemua() tanpa tugas_id menghapus SEMUA draf sippa.draf.*, kunci lain tetap", async () => {
  const {A} = await siap({balas: semuaDiterima});
  for (const k of ["sippa.draf.T1", "sippa.draf.T2", "lain"]) globalThis.localStorage.setItem(k, "{}");
  await A.buangSemua();
  assert.equal(globalThis.localStorage.getItem("sippa.draf.T1"), null); assert.equal(globalThis.localStorage.getItem("sippa.draf.T2"), null);
  assert.equal(globalThis.localStorage.getItem("lain"), "{}", "kunci non-draf tidak disentuh");
});

test("SP-015 buangKadaluarsa(): butir dan foto lebih tua 14 hari dibuang dengan hitungan; yang baru tetap", async () => {
  const {A, simpan} = await siap({balas: semuaDiterima});
  const hari = 86400000, now = Date.now();
  const a = (await A.tambah(bbm(1))).id, b = (await A.tambah(bbm(2))).id, c = (await A.tambah(bbm(3))).id;
  await A.tambahFoto(jpeg(), a); await A.tambahFoto(jpeg(), b);
  const umur = async (s, id, dibuat, status) => simpan.taruh({...(await s(simpan)).find(x => x.klien_id === id), dibuat, ...(status ? {status} : {})});
  await umur(isiButir, a, now - 15 * hari); await umur(isiButir, b, now - 14 * hari + 60000); await umur(isiButir, c, now - 20 * hari, "ditolak");
  const [f1, f2] = await isiFoto(simpan); await simpan.taruh({...f1, dibuat: now - 15 * hari}); await simpan.taruh({...f2, dibuat: now});
  assert.deepEqual(await A.buangKadaluarsa({sekarang: now}), {butir: 2, foto: 1});
  assert.deepEqual((await isiButir(simpan)).map(x => x.klien_id), [b], "butir 14 hari kurang semenit tetap");
  assert.equal((await isiFoto(simpan)).length, 1);
});

/* ---------- migrasi dari IndexedDB sippa-antre (KP-12) ---------- */
const lamaPalsu = (butir, foto) => { const o = {dihapus: 0, semua: async s => s === "butir" ? butir : foto, hapus: async () => { o.dihapus++; }}; return o; };
const butirLama = (id, tugas_id, extra = {}) => ({id, jenis: "bbm", data: {id, jenis: "solar", aksi: "terima", liter: 5, waktu: 1}, dibuat: Date.now() - 1000, tugas_id, keadaan: "menunggu", alasan: null, coba: 0, kirim_berikut: 0, ...extra});

test("pindahkan: butir dan foto dari sippa-antre pindah dengan id yang sama ke saluran tugasnya, foto terbaca ulang SEBELUM basis lama dihapus, lalu terkirim; panggilan kedua tidak mengulang", async () => {
  const urut = [];
  const {A, simpan, panggilan} = await siap({balas: r => { urut.push(r.url); return r.url.endsWith("/foto") ? {status: 201, json: {foto_id: "F"}} : semuaDiterima(r); }});
  const blob = jpeg(7);
  const lama = lamaPalsu([butirLama("b1", "T1"), butirLama("b2", "T2"), butirLama("tua", "T1", {dibuat: Date.now() - 20 * 86400000})],
    [{id: "f1", blob, mime: "image/jpeg", butir_id: "b1", keadaan: "menunggu"}, {id: "f2", blob, mime: "image/jpeg", tahap: "tiba", lat: -2.2, lon: 113.9, tugas_id: "T2", keadaan: "menunggu"}, {id: "f3", blob, mime: "image/jpeg", butir_id: "b1", keadaan: "ditolak"}]);
  assert.equal(await A.pindahkan({lama}), 2, "dua butir tersisa; yang lebih tua 14 hari tidak ikut");
  assert.equal(lama.dihapus, 1, "basis lama dihapus sesudah semuanya tertulis");
  assert.deepEqual((await isiButir(simpan, "T1")).map(x => x.klien_id), ["b1"]); assert.deepEqual((await isiButir(simpan, "T2")).map(x => x.klien_id), ["b2"]);
  assert.deepEqual((await isiFoto(simpan, "T1")).map(x => x.klien_id), ["f1"], "foto lampiran ikut tugas butirnya; yang ditolak tak ikut");
  assert.deepEqual((await isiFoto(simpan, "T2")).map(x => x.klien_id), ["f2"]);
  assert.deepEqual((await isiFoto(simpan, "T1"))[0].data.blob, blob);
  assert.equal(await A.pindahkan({lama}), 0, "penanda: tidak diulang"); assert.equal(lama.dihapus, 1);
  await A.kirimSemua(T1);
  assert.deepEqual(urut, ["/api/sippa/lapangan/foto", "/api/sippa/lapangan/kirim"], "foto lama berangkat lebih dulu");
  assert.equal((await A.jumlah({tugas_id: "T1"})).total, 0); assert.equal((await A.jumlah({tugas_id: "T2"})).menunggu, 1, "milik T2 menunggu kodenya");
});

test("pindahkan: foto gagal tertulis (peramban tanpa IndexedDB) = basis lama TIDAK dihapus dan penanda tidak dipasang; butir cadangan localStorage lama ikut", async () => {
  globalThis.indexedDB = {open: () => { throw new Error("diblokir"); }};
  try {
    const {A} = await siap({simpan: null, balas: semuaDiterima});
    globalThis.localStorage.setItem("sippa.antre", JSON.stringify([butirLama("ls1", "T1")]));
    const lama = lamaPalsu([butirLama("b1", "T1")], [{id: "f1", blob: jpeg(), mime: "image/jpeg", butir_id: "b1", keadaan: "menunggu"}]);
    await assert.rejects(A.pindahkan({lama}), /foto belum tertulis/);
    assert.equal(lama.dihapus, 0); assert.equal(globalThis.localStorage.getItem("sippa.antre.pindah"), null);
    assert.notEqual(globalThis.localStorage.getItem("sippa.antre"), null, "cadangan lama dibiarkan");
  } finally { delete globalThis.indexedDB; }
  const {A, simpan} = await siap({balas: semuaDiterima});
  globalThis.localStorage.setItem("sippa.antre", JSON.stringify([butirLama("ls1", "T1")]));
  const lama = lamaPalsu([butirLama("b1", "T1")], []);
  assert.equal(await A.pindahkan({lama}), 2);
  assert.deepEqual((await isiButir(simpan)).map(x => x.klien_id).sort(), ["b1", "ls1"]); assert.equal(globalThis.localStorage.getItem("sippa.antre"), null);
});

test("antre.js tidak menulis markup; teks tanpa em dash atau titik tengah", async () => {
  const {readFileSync} = await import("node:fs");
  const s = readFileSync(new URL("../../public/pipa/antre.js", import.meta.url), "utf8");
  assert.doesNotMatch(s, /innerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(s, /[—·]/);
});
