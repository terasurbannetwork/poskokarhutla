/* Antrean luring petugas di atas PbAntre (KP-15): T8 vektor tidak ke localStorage, 36 jam, nonce luring, 408 tetap / 400 buang, migrasi. */
import test from "node:test";
import assert from "node:assert/strict";
import "../../public/inti/antre.js";
import {buatToko, JUMLAH_NONCE_LURING, UMUR_ABSEN_MS} from "../../public/petugas/antre.js";

const {PbAntre} = globalThis;
let n = 0;
const jam = {t: 1e9};
const item = (id, dibuat) => ({id, dibuat, data: {nonce: "n" + id, vektor: "AACAPw==", luring: true}, foto: new Blob(["x"])});
/* nama saluran unik per toko: registri PbAntre bersifat global */
const baru = (kirimAbsen, o = {}) => {
  const asli = PbAntre.saluran; n++;
  PbAntre.saluran = (nama, op) => asli(nama + n, op);
  try { return buatToko({simpan: PbAntre.memori(), sekarang: () => jam.t, kirimAbsen, header: () => ({"x-kode": "K"}), ...o}); }
  finally { PbAntre.saluran = asli; }
};

test("kirim: terkirim dihapus utuh, urutan lama ke baru, JSON tanpa sisipan antrean, kode lewat header", async () => {
  const urut = [], t = baru(async (data, foto, h) => { urut.push(data.nonce); assert.ok(data.vektor && foto instanceof Blob && !("klien_id" in data) && !("waktu_klien" in data)); assert.equal(h["x-kode"], "K"); return {s: 201, j: {}}; });
  await t.tambahAbsen(item("b", jam.t + 2)); await t.tambahAbsen(item("a", jam.t + 1));
  const h = await t.kirimTertunda();
  assert.deepEqual(urut, ["na", "nb"]); assert.deepEqual(h, {terkirim: ["a", "b"], ditolak: [], sisa: 0});
  assert.equal(await t.jumlahAbsen(), 0, "tidak ada sisa vektor");
});

test("408, 0, 429, 5xx: berhenti di situ, butir tersimpan, yang di belakangnya tidak dicoba", async () => {
  for (const s of [0, 408, 429, 503]) {
    let panggil = 0; const t = baru(async data => (++panggil, data.nonce === "nb" ? {s, j: {}} : {s: 201, j: {}}));
    for (const [i, id] of ["a", "b", "c"].entries()) await t.tambahAbsen(item(id, jam.t + i));
    const h = await t.kirimTertunda();
    assert.deepEqual(h.terkirim, ["a"], String(s)); assert.equal(h.sisa, 2); assert.equal(panggil, 2);
    assert.equal(await t.jumlahAbsen(), 2);
  }
});

test("400: ditolak dan dibuang utuh (vektor ikut hilang), dilaporkan; butir berikutnya terkirim", async () => {
  const t = baru(async data => data.nonce === "na" ? {s: 400, j: {galat: "foto ganda"}} : {s: 201, j: {}});
  await t.tambahAbsen(item("a", jam.t)); await t.tambahAbsen(item("b", jam.t + 1));
  const h = await t.kirimTertunda();
  assert.deepEqual(h.ditolak, [{id: "a", galat: "foto ganda"}]); assert.deepEqual(h.terkirim, ["b"]);
  assert.equal(await t.jumlahAbsen(), 0); assert.deepEqual(await t.absen.daftar(), []);
});

test("36 jam: butir absen kedaluwarsa dibuang sebelum kirim", async () => {
  let panggil = 0; const t = baru(async () => (++panggil, {s: 503, j: {}}));
  await t.tambahAbsen(item("a", jam.t)); jam.t += UMUR_ABSEN_MS + 1;
  const h = await t.kirimTertunda();
  assert.equal(panggil, 0); assert.equal(await t.jumlahAbsen(), 0); assert.deepEqual(h.terkirim, []);
});

test("T8: vektor tidak pernah ke localStorage, juga saat IndexedDB gagal dan saat dikirim ulang", async () => {
  const tulis = []; globalThis.localStorage = {getItem: () => null, removeItem() {}, setItem: (k, v) => tulis.push([k, v])};
  const asliIdb = globalThis.indexedDB;
  globalThis.indexedDB = {open() { throw new Error("IndexedDB mati"); }};
  try {
    /* tanpa opsi simpan: jalur bawaan berlapis (IndexedDB gagal -> memori karena rahasia) */
    const asli = PbAntre.saluran; n++; PbAntre.saluran = (nama, op) => asli(nama + n, op);
    let t; try { t = buatToko({kirimAbsen: async () => ({s: 503, j: {}})}); } finally { PbAntre.saluran = asli; }
    await assert.rejects(t.tambahAbsen(item("a", Date.now())), /tidak bisa disimpan luring/, "IndexedDB mati: absen ditolak, bukan pura-pura tersimpan di HP");
    await t.kirimTertunda();
    await t.simpanNonce([{nonce: "z", tantangan: "kedip", kedaluwarsa: Date.now() + 1e6}], Date.now()); await t.simpanSelisih(5, Date.now());
    assert.equal(await t.jumlahAbsen(), 0, "butir yang ditolak tidak tertinggal di memori");
    assert.deepEqual(tulis, [], "tidak ada tulisan localStorage");
  } finally { delete globalThis.localStorage; globalThis.indexedDB = asliIdb; }
});

test("nonce luring: enam, yang kedaluwarsa dibuang, sekali pakai, paling cepat kedaluwarsa dulu, tanpa IndexedDB", async () => {
  const t = baru(async () => ({s: 201, j: {}})), kini = jam.t;
  assert.equal(JUMLAH_NONCE_LURING, 6);
  await t.simpanNonce([{nonce: "tua", tantangan: "kedip", kedaluwarsa: kini - 1}, {nonce: "b", tantangan: "kedip", kedaluwarsa: kini + 200}, {nonce: "a", tantangan: "toleh_kiri", kedaluwarsa: kini + 100}, {nonce: null, kedaluwarsa: kini + 5}, {nonce: "c", tantangan: "kedip", kedaluwarsa: kini}], kini);
  assert.equal(await t.jumlahNonce(kini), 2);
  assert.deepEqual(await t.ambilNonce(kini), {nonce: "a", tantangan: "toleh_kiri", kedaluwarsa: kini + 100});
  assert.equal((await t.ambilNonce(kini)).nonce, "b");
  assert.equal(await t.ambilNonce(kini), null, "habis");
  await t.simpanNonce([{nonce: "z", tantangan: "kedip", kedaluwarsa: kini + 10}], kini);
  assert.equal(await t.ambilNonce(kini + 11), null, "kedaluwarsa saat diambil");
});

test("nonce dan selisih tidak ikut terkirim (bukan antrean kirim)", async () => {
  let panggil = 0; const t = baru(async () => (++panggil, {s: 201, j: {}}));
  await t.simpanNonce([{nonce: "a", tantangan: "kedip", kedaluwarsa: jam.t + 1e6}], jam.t); await t.simpanSelisih(1, jam.t);
  const h = await t.kirimTertunda(); assert.equal(panggil, 0); assert.deepEqual(h, {terkirim: [], ditolak: [], sisa: 0});
  assert.equal(await t.jumlahNonce(jam.t), 1);
});

test("selisih jam: tersimpan, default 0", async () => {
  const t = baru(async () => ({s: 201, j: {}}));
  assert.equal(await t.bacaSelisih(), 0);
  await t.simpanSelisih(-4200, jam.t); assert.equal(await t.bacaSelisih(), -4200);
  await t.simpanSelisih(900, jam.t + 1); assert.equal(await t.bacaSelisih(), 900);
});

test("migrasi dari lp-antre: butir (vektor + foto) pindah, basis lama dihapus, butir kedaluwarsa dibuang; gagal tulis = basis dibiarkan", async () => {
  const t = baru(async () => ({s: 201, j: {}})), lama = [item("x", jam.t - 10), item("tua", jam.t - UMUR_ABSEN_MS - 5)];
  let hapus = 0;
  const jalan = (tt, L) => PbAntre.pindahDari({db: "lp-antre", store: "antre", ke: tt.absen, lama: L, petakan: it => ({klien_id: it.id, dibuat: it.dibuat, data: {...it.data, foto: it.foto}})});
  assert.equal(await jalan(t, {semua: async () => lama, hapus: async () => { hapus++; }}), 1);
  assert.equal(hapus, 1);
  const [x] = await t.absen.daftar(); assert.equal(x.klien_id, "x"); assert.equal(x.data.vektor, "AACAPw=="); assert.ok(x.data.foto instanceof Blob);
  /* pindahkanLama (jalur nyata) di lingkungan tanpa indexedDB: melempar, tidak menjatuhkan, tidak menghapus apa pun */
  await assert.rejects(t.pindahkanLama());
});
