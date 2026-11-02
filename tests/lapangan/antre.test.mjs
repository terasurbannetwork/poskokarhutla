import test from "node:test";
import assert from "node:assert/strict";
import {simpanMemori, tambahAntre, daftarAntre, jumlahAntre, kirimAntre, bisaDiulang, simpanNonce, ambilNonce, jumlahNonce, simpanSelisih, bacaSelisih, JUMLAH_NONCE_LURING} from "../../public/petugas/antre.js";

const item = (id, dibuat) => ({id, dibuat, data: {nonce: "n" + id, vektor: "AACAPw==", luring: true}, foto: new Blob(["x"])});

test("antre: tambah lalu daftar urut dari yang lama", async () => {
  const s = simpanMemori();
  await tambahAntre(s, item("b", 20)); await tambahAntre(s, item("a", 10)); await tambahAntre(s, item("c", 30));
  assert.deepEqual((await daftarAntre(s)).map(x => x.id), ["a", "b", "c"]);
  assert.equal(await jumlahAntre(s), 3);
});

test("kirimAntre: terkirim dihapus utuh (vektor ikut hilang), urutan lama ke baru", async () => {
  const s = simpanMemori(), urut = [];
  await tambahAntre(s, item("b", 2)); await tambahAntre(s, item("a", 1));
  const h = await kirimAntre(s, async it => { urut.push(it.id); assert.ok(it.data.vektor); return {ok: true, status: 201}; });
  assert.deepEqual(urut, ["a", "b"]); assert.deepEqual(h, {terkirim: ["a", "b"], ditolak: [], sisa: 0});
  assert.deepEqual(await s.semua("antre"), [], "tidak ada sisa vektor");
});

test("kirimAntre: jaringan putus (0), 429, dan 5xx berhenti di situ dan menyimpan yang tersisa", async () => {
  for (const status of [0, 408, 429, 500, 503]) {
    const s = simpanMemori(); for (const [i, id] of ["a", "b", "c"].entries()) await tambahAntre(s, item(id, i));
    let panggil = 0;
    const h = await kirimAntre(s, async it => (++panggil, it.id === "b" ? {ok: false, status} : {ok: true, status: 201}));
    assert.deepEqual(h.terkirim, ["a"], String(status)); assert.equal(h.sisa, 2); assert.equal(panggil, 2, "c tidak dicoba supaya urutan terjaga");
    assert.deepEqual((await daftarAntre(s)).map(x => x.id), ["b", "c"]);
  }
});

test("kirimAntre: jawaban tegas 4xx dibuang (tidak diulang selamanya) dan dilaporkan", async () => {
  const s = simpanMemori(); await tambahAntre(s, item("a", 1)); await tambahAntre(s, item("b", 2));
  const h = await kirimAntre(s, async it => it.id === "a" ? {ok: false, status: 400, galat: "foto ganda"} : {ok: true, status: 201});
  assert.deepEqual(h.ditolak, [{id: "a", status: 400, galat: "foto ganda"}]); assert.deepEqual(h.terkirim, ["b"]);
  assert.equal(await jumlahAntre(s), 0);
});

test("bisaDiulang: hanya jaringan, batas waktu, terlalu sering, galat server", () => {
  for (const s of [0, 408, 429, 500, 502]) assert.equal(bisaDiulang(s), true, String(s));
  for (const s of [400, 401, 403, 404, 409, 422]) assert.equal(bisaDiulang(s), false, String(s));
});

test("nonce luring: enam buah, yang kedaluwarsa dibuang, dipakai sekali, paling cepat kedaluwarsa dulu", async () => {
  const s = simpanMemori(), kini = 1_000_000;
  assert.equal(JUMLAH_NONCE_LURING, 6);
  await simpanNonce(s, [{nonce: "tua", tantangan: "kedip", kedaluwarsa: kini - 1}, {nonce: "b", tantangan: "kedip", kedaluwarsa: kini + 200}, {nonce: "a", tantangan: "toleh_kiri", kedaluwarsa: kini + 100}, {nonce: null, kedaluwarsa: kini + 5}, {nonce: "c", tantangan: "kedip", kedaluwarsa: kini}], kini);
  assert.equal(await jumlahNonce(s, kini), 2);
  assert.equal((await ambilNonce(s, kini)).nonce, "a");
  assert.equal((await ambilNonce(s, kini)).nonce, "b");
  assert.equal(await ambilNonce(s, kini), null, "habis");
  await simpanNonce(s, [{nonce: "z", tantangan: "kedip", kedaluwarsa: kini + 10}], kini);
  assert.equal(await ambilNonce(s, kini + 11), null, "kedaluwarsa saat diambil");
});

test("selisih jam: tersimpan, default 0", async () => {
  const s = simpanMemori(); assert.equal(await bacaSelisih(s), 0);
  await simpanSelisih(s, -4200, 5); assert.equal(await bacaSelisih(s), -4200);
  await simpanSelisih(s, 900, 6); assert.equal(await bacaSelisih(s), 900);
});
