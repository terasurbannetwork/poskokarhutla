/* SP-011: antrean luring /pipa/lapangan (DT §6.1.3-§6.1.4, RU §2.3 F1-F5, F8). Rute SP-008 dipalsukan dengan fetch tiruan yang mengikuti
   kontrak DT §4.3-§4.4; IndexedDB tiruan sekecil mungkin. Tiap uji membuktikan yang salah DITOLAK, bukan hanya yang benar tersimpan. */
import test from "node:test";
import assert from "node:assert/strict";

let nomor = 0;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KODE = "0123456789abcdef0123456789";
const T1 = {tugas_id: "T1"};   // kirim wajib menyebut tugasnya (butir bawaan uji milik T1)

/* IndexedDB tiruan: hanya yang dipakai antre.js (open, createObjectStore, transaction.objectStore put/get/getAll/delete) */
function idbPalsu() {
  const isi = {butir: new Map(), foto: new Map()};
  const minta = f => { const r = {}; queueMicrotask(() => { try { r.result = f(); r.onsuccess?.({target: r}); } catch (e) { r.error = e; r.onerror?.({target: r}); } }); return r; };
  const db = {
    createObjectStore: () => ({}),
    transaction: nama => ({objectStore: () => ({
      put: v => minta(() => { isi[nama].set(v.id, structuredClone(v)); return v.id; }),
      get: k => minta(() => structuredClone(isi[nama].get(k))),
      getAll: () => minta(() => [...isi[nama].values()].map(v => structuredClone(v))),
      delete: k => minta(() => { isi[nama].delete(k); }),
    })}),
  };
  return {isi, open: () => { const q = {}; queueMicrotask(() => { q.result = db; q.onupgradeneeded?.({target: q}); q.onsuccess?.({target: q}); }); return q; }};
}
const idbRusak = () => ({open: () => { throw new Error("IndexedDB diblokir"); }});

function simpananPalsu() {
  const m = new Map();
  return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m};
}

/* muat antre.js segar (keadaan modul bersih) dengan global peramban tiruan */
async function siap({idb = idbPalsu(), balas} = {}) {
  globalThis.indexedDB = idb;
  globalThis.localStorage = simpananPalsu();
  globalThis.localStorage.setItem("sippa.kode", KODE);
  const panggilan = [];
  globalThis.fetch = async (url, init = {}) => {
    const rec = {url, metode: init.method, kode: init.headers?.["x-kode"], badan: typeof init.body === "string" ? JSON.parse(init.body) : init.body};
    panggilan.push(rec);
    const j = await balas(rec, panggilan.length);
    return {ok: j.status >= 200 && j.status < 300, status: j.status, json: async () => j.json ?? {}};
  };
  const A = await import(`../../public/pipa/antre.js?uji=${++nomor}`);
  return {A, idb, panggilan};
}
const semuaDiterima = r => ({status: 200, json: {diterima: [...(r.badan.log || []), ...(r.badan.probe || []), ...(r.badan.bbm || []), ...(r.badan.gerak || [])].map(b => b.id), ganda: [], ditolak: [], jam_server: Date.now()}});
const bbm = (liter = 20) => ({jenis: "bbm", data: {jenis: "solar", aksi: "terima", liter, waktu: Date.now()}, tugas_id: "T1"});
const probe = (kedalaman_cm = 30, suhu_c = 31.5) => ({jenis: "probe", data: {titik: "T2", tahap: "sesudah", kedalaman_cm, suhu_c, waktu: Date.now()}, tugas_id: "T1"});
const log = () => ({jenis: "log", data: {jenis: "karhutla", kelas_medan: "I", panjang_m: 120, n_orang: 4, t_tiba: 1000, t_mulai_gelar: 2000, air_sampai_lance: 1, waktu_klien: Date.now()}, tugas_id: "T1"});

test("F1 mode pesawat: sesi log + probe sesudah + BBM tersimpan di IndexedDB sippa-antre, jumlah menunggu 3, tanpa satu pun fetch", async () => {
  const {A, idb, panggilan} = await siap({balas: semuaDiterima});
  for (const b of [log(), probe(), bbm()]) assert.equal((await A.tambah(b)).ok, true);
  assert.equal((await A.jumlah()).menunggu, 3);
  assert.equal(idb.isi.butir.size, 3, "tersimpan di store butir");
  for (const v of idb.isi.butir.values()) { assert.match(v.id, UUID, "id UUID v4 dibuat klien"); assert.equal(v.keadaan, "menunggu"); assert.equal(v.coba, 0); assert.equal(v.tugas_id, "T1"); assert.equal(v.data.id, v.id, "id yang sama ikut ke data kiriman"); }
  assert.equal(panggilan.length, 0, "menyimpan tidak pernah menyentuh jaringan");
});

test("tambah menolak butir yang melanggar cekButir (F6: kedalaman 300 cm tanpa lengan_dalam) dan jenis liar; tidak ada yang tersimpan", async () => {
  const {A, idb} = await siap({balas: semuaDiterima});
  const r = await A.tambah(probe(300));
  assert.equal(r.ok, false); assert.match(r.galat[0].pesan, /lengan/); assert.equal(r.galat[0].medan, "kedalaman_cm");
  assert.equal((await A.tambah(probe(300), {lengan_dalam: 1})).ok, true, "lengan_dalam = 1 membolehkan");
  assert.equal((await A.tambah({jenis: "liar", data: {}, tugas_id: "T1"})).ok, false);
  assert.equal((await A.tambah({jenis: "bbm", data: {jenis: "solar", aksi: "terima", liter: -5, waktu: 1}, tugas_id: "T1"})).ok, false, "liter negatif ditolak");
  assert.equal(idb.isi.butir.size, 1);
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
  assert.equal(h.diterima, 3); assert.equal((await A.jumlah()).menunggu, 0);
  await A.kirimSemua(T1);
  assert.equal(panggilan.length, 1, "antrean kosong tidak memanggil server lagi");
});

test("kirim ulang butir yang sama (jawaban ganda) tetap menghapusnya dari antrean: terkirim satu kali, bukan menumpuk", async () => {
  const {A} = await siap({balas: r => ({status: 200, json: {diterima: [], ganda: r.badan.bbm.map(b => b.id), ditolak: [], jam_server: 1}})});
  await A.tambah(bbm());
  const h = await A.kirimSemua(T1);
  assert.equal(h.ganda, 1); assert.equal((await A.jumlah()).menunggu + (await A.jumlah()).ditolak, 0);
});

test("F3/F4 butir ditolak: tetap di antrean dengan alasan server, butir lain dalam kiriman yang sama diterima, tidak dikirim ulang sebelum diperbaiki, Perbaiki mengembalikannya ke menunggu", async () => {
  let tolak;
  const {A, panggilan} = await siap({balas: r => {
    const semua = [...r.badan.log, ...r.badan.bbm];
    return {status: 200, json: {diterima: semua.filter(b => b.id !== tolak).map(b => b.id), ganda: [], ditolak: semua.filter(b => b.id === tolak).map(b => ({id: b.id, alasan: "t_tiba: tidak boleh lebih awal dari mulai gelar"})), jam_server: 1}};
  }});
  const a = await A.tambah(log()), b = await A.tambah(bbm());
  tolak = a.id;
  const h = await A.kirimSemua(T1);
  assert.equal(h.diterima, 1); assert.equal(h.ditolak, 1);
  const j = await A.jumlah();
  assert.deepEqual([j.menunggu, j.ditolak], [0, 1]);
  const d = (await A.daftar()).find(x => x.id === a.id);
  assert.equal(d.keadaan, "ditolak"); assert.match(d.alasan, /tidak boleh lebih awal/);
  assert.equal((await A.daftar()).some(x => x.id === b.id), false, "butir yang diterima hilang dari antrean");
  await A.kirimSemua(T1);
  assert.equal(panggilan.length, 1, "butir ditolak tidak dikirim ulang diam-diam");
  tolak = null;
  assert.equal((await A.perbaiki(a.id, {...d.data, t_tiba: 500})).ok, true);
  assert.equal((await A.perbaiki(a.id, {...d.data, panjang_m: 9999})).ok, false, "perbaikan juga lewat cekButir");
  const h2 = await A.kirimSemua(T1);
  assert.equal(h2.diterima, 1); assert.equal(panggilan[1].badan.log[0].t_tiba, 500, "yang dikirim isi hasil perbaikan");
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
  const {A, idb} = await siap({balas: semuaDiterima});
  globalThis.localStorage.setItem("sippa.terkirim", "123"); globalThis.localStorage.setItem("sippa.draf.T1", "{}"); globalThis.localStorage.setItem("sippa.draf.T2", "{}");
  assert.equal((await A.keluar({tugas_id: "T1"})).ok, true);
  for (const k of ["sippa.kode", "sippa.terkirim", "sippa.draf.T1"]) assert.equal(globalThis.localStorage.getItem(k), null, k);
  assert.equal(globalThis.localStorage.getItem("sippa.draf.T2"), "{}", "draf tugas lain tidak disentuh");
  globalThis.localStorage.setItem("sippa.kode", KODE);
  await A.tambah(bbm()); await A.tambahFoto({type: "image/jpeg", size: 5}, "x");
  assert.equal((await A.keluar({tugas_id: "T1"})).ok, false, "isian menunggu mencegah keluar biasa");
  await A.buangSemua({tugas_id: "T1"});
  assert.equal(idb.isi.butir.size, 0); assert.equal(idb.isi.foto.size, 0); assert.equal(A.kodeTersimpan(), null);
  assert.equal((await A.jumlah()).total, 0);
});

test("foto 429, 408, 5xx dan jaringan putus: foto tetap menunggu dengan coba + kirim_berikut mundur dan tidak diunggah lagi sebelum waktunya", async () => {
  for (const mode of [429, 408, 503, "putus"]) {
    const {A, idb, panggilan} = await siap({balas: () => { if (mode === "putus") throw new TypeError("offline"); return {status: mode}; }});
    const b = await A.tambah(log()); await A.tambahFoto({type: "image/jpeg", size: 5}, b.id);
    const t0 = 2_000_000_000;
    const h = await A.kirimSemua({...T1, sekarang: t0});
    assert.equal(h.berhenti, "tunda", String(mode));
    const f = [...idb.isi.foto.values()][0];
    assert.equal(f.keadaan, "menunggu", `${mode}: sementara, bukan ditolak`); assert.equal(f.coba, 1);
    assert.ok(f.kirim_berikut >= t0 + 96_000 && f.kirim_berikut <= t0 + 144_000, `${mode}: ${f.kirim_berikut - t0}`);
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

test("5xx dan jaringan putus: coba naik, kirim_berikut mundur eksponensial berjitter (60 dtk x 2^coba, maks 30 menit x 0,8-1,2), tidak dikirim lagi sebelum waktunya", async () => {
  let mode = 500;
  const {A, idb, panggilan} = await siap({balas: () => { if (mode === "putus") throw new TypeError("Failed to fetch"); return mode === 200 ? semuaDiterima({badan: {log: [], probe: [], bbm: [...idb.isi.butir.values()].map(v => v.data)}}) : {status: mode}; }});
  await A.tambah(bbm());
  const t0 = 1_000_000_000;
  let h = await A.kirimSemua({...T1, sekarang: t0});
  assert.equal(h.berhenti, "tunda");
  let v = [...idb.isi.butir.values()][0];
  assert.equal(v.coba, 1); assert.equal(v.keadaan, "menunggu");
  assert.ok(v.kirim_berikut >= t0 + 120_000 * 0.8 && v.kirim_berikut <= t0 + 120_000 * 1.2, `coba 1 = 60 dtk x 2^1 = 120 dtk, dapat ${v.kirim_berikut - t0} ms`);
  await A.kirimSemua({...T1, sekarang: t0 + 1000});
  assert.equal(panggilan.length, 1, "belum waktunya = tidak ada fetch");
  mode = "putus";
  await A.kirimSemua({...T1, sekarang: t0 + 200_000});
  v = [...idb.isi.butir.values()][0];
  assert.equal(v.coba, 2, "jaringan putus juga dihitung"); assert.equal(panggilan.length, 2);
  mode = 200;
  const h3 = await A.kirimSemua({...T1, sekarang: v.kirim_berikut + 1});
  assert.equal(h3.diterima, 1); assert.equal((await A.jumlah()).menunggu, 0);
  for (const [coba, tengah] of [[0, 60_000], [3, 480_000], [5, 1_800_000], [20, 1_800_000]]) {
    for (const acak of [0, 1]) { const ms = A.tundaUlang(coba, acak); assert.ok(ms >= tengah * 0.8 - 1 && ms <= tengah * 1.2 + 1, `coba ${coba} acak ${acak}: ${ms}`); }
  }
});

test("429 (batas laju server) pada kirim butir: bukan penolakan; butir tetap menunggu, coba naik, mundur sesuai tundaUlang, tidak ada panggilan sebelum waktunya", async () => {
  const {A, idb, panggilan} = await siap({balas: () => ({status: 429})});
  await A.tambah(bbm());
  const t0 = 3_000_000_000;
  const h = await A.kirimSemua({...T1, sekarang: t0});
  assert.equal(h.berhenti, "tunda"); assert.equal(h.ditolak, 0);
  const v = [...idb.isi.butir.values()][0];
  assert.equal(v.keadaan, "menunggu"); assert.equal(v.coba, 1);
  assert.ok(v.kirim_berikut >= t0 + 96_000 && v.kirim_berikut <= t0 + 144_000, `kirim_berikut ${v.kirim_berikut - t0} ms`);
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
  await A.kirimSemua(T1);
  assert.equal(panggilan[1].badan.bbm.length, 3);
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

test("F5 IndexedDB gagal: butir teks jatuh ke localStorage sippa.antre dan tetap terkirim; foto ditolak dengan pesan; batas 200 butir", async () => {
  const {A, panggilan} = await siap({idb: idbRusak(), balas: semuaDiterima});
  assert.equal((await A.tambah(bbm())).ok, true);
  const mentah = JSON.parse(globalThis.localStorage.getItem("sippa.antre"));
  assert.equal(mentah.length, 1); assert.equal(mentah[0].jenis, "bbm");
  const f = await A.tambahFoto({type: "image/jpeg", size: 10}, mentah[0].id);
  assert.equal(f.ok, false); assert.equal(f.pesan, "Foto tidak bisa disimpan luring di peramban ini");
  assert.equal((await A.jumlah()).menunggu, 1);
  await A.kirimSemua(T1);
  assert.equal(panggilan.length, 1); assert.equal((await A.jumlah()).menunggu, 0);
  for (let i = 0; i < 200; i++) assert.equal((await A.tambah(bbm(1 + i))).ok, true, `butir ${i}`);
  const penuh = await A.tambah(bbm(999));
  assert.equal(penuh.ok, false); assert.match(penuh.pesan, /penuh/i);
  assert.equal(JSON.parse(globalThis.localStorage.getItem("sippa.antre")).length, 200);
});

test("F5 varian: IndexedDB yang menggantung tanpa galat (open tidak pernah menjawab) jatuh ke localStorage dalam batas waktu, tidak membekukan antrean", async () => {
  const {A} = await siap({idb: {open: () => ({})}, balas: semuaDiterima});
  const t0 = Date.now(), jaga = setInterval(() => {}, 100);   // pewaktu batas di antre.js di-unref di Node; penjaga ini menahan proses selama uji menunggu
  const r = await A.tambah(bbm()); clearInterval(jaga);
  assert.equal(r.ok, true);
  assert.ok(Date.now() - t0 < 5000, "jatuh ke cadangan dalam beberapa detik");
  assert.equal(JSON.parse(globalThis.localStorage.getItem("sippa.antre")).length, 1);
  assert.equal(await A.idbSiap(), false);
});

test("jawaban kirim membawa jam_server ke layar (pita 'jam ponsel berbeda dari jam server')", async () => {
  const {A} = await siap({balas: r => ({status: 200, json: {diterima: r.badan.bbm.map(b => b.id), ganda: [], ditolak: [], jam_server: 1761370800000}})});
  await A.tambah(bbm());
  assert.equal((await A.kirimSemua(T1)).jam_server, 1761370800000);
});

test("foto: PNG ditolak dengan pesan (server hanya jpeg/webp, ADR-09); JPEG diunggah LEBIH DULU dari butir lewat multipart x-kode; foto_id tercatat; foto 4xx tidak menahan butir", async () => {
  const urut = [];
  const {A, idb, panggilan} = await siap({balas: (r) => {
    urut.push(r.url);
    return r.url.endsWith("/foto") ? {status: 201, json: {foto_id: "F-1"}} : semuaDiterima(r);
  }});
  const b = await A.tambah(log());
  const png = await A.tambahFoto({type: "image/png", size: 10}, b.id);
  assert.equal(png.ok, false); assert.match(png.pesan, /PNG/); assert.match(png.pesan, /JPEG|WebP/i);
  assert.equal(idb.isi.foto.size, 0, "PNG tidak masuk antrean");
  assert.equal((await A.tambahFoto({type: "image/jpeg", size: 9_000_000}, b.id)).ok, false, "di atas 8 MiB ditolak di klien");
  assert.equal((await A.tambahFoto({type: "image/jpeg", size: 1000}, b.id)).ok, true);
  assert.equal(idb.isi.foto.size, 1);
  await A.kirimSemua(T1);
  assert.deepEqual(urut, ["/api/sippa/lapangan/foto", "/api/sippa/lapangan/kirim"], "foto dulu");
  assert.equal(panggilan[0].kode, KODE); assert.ok(panggilan[0].badan instanceof FormData); assert.ok(panggilan[0].badan.has("berkas"));
  assert.equal(idb.isi.foto.size, 0, "foto terunggah hilang dari antrean");
  assert.equal((await A.jumlah()).menunggu, 0);
  /* foto ditolak 4xx: butir tetap berangkat tanpa foto */
  const dua = await siap({balas: r => r.url.endsWith("/foto") ? {status: 415} : semuaDiterima(r)});
  const b2 = await dua.A.tambah(log()); await dua.A.tambahFoto({type: "image/webp", size: 5}, b2.id);
  const h = await dua.A.kirimSemua(T1);
  assert.equal(h.diterima, 1, "butir tetap terkirim");
  assert.equal([...dua.idb.isi.foto.values()][0].keadaan, "ditolak");
});

test("keluar(): butir belum terkirim mencegah keluar; antrean kosong menghapus kode (DT §6.1.2 langkah 4)", async () => {
  const {A} = await siap({balas: semuaDiterima});
  await A.tambah(bbm());
  assert.equal((await A.keluar()).ok, false); assert.equal(globalThis.localStorage.getItem("sippa.kode"), KODE);
  await A.kirimSemua(T1);
  assert.equal((await A.keluar()).ok, true); assert.equal(globalThis.localStorage.getItem("sippa.kode"), null);
});

test("antre.js tidak menulis markup; teks tanpa em dash atau titik tengah", async () => {
  const {readFileSync} = await import("node:fs");
  const s = readFileSync(new URL("../../public/pipa/antre.js", import.meta.url), "utf8");
  assert.doesNotMatch(s, /innerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(s, /[—·]/);
});
