/* Logika murni antrean luring (public/bnpb/antre.js, F6): penyimpanan tiruan + pengirim tiruan, tanpa jaringan.
   Jalankan: node --test tests/warga/antre.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import "../../public/bnpb/antre.js";

const {Antre} = globalThis;
const memori = (awal = []) => { let d = awal; return {baca: async () => structuredClone(d), tulis: async v => { d = structuredClone(v); }, lihat: () => d}; };
let nId = 0;
const buat = (kirimItem, o = {}) => { const simpan = o.simpan || memori(); return {simpan, a: Antre.buat({untuk: "meja", simpan, kirimItem, acak: () => "klien" + String(++nId).padStart(6, "0"), sekarang: () => 1000 + nId, ...o})}; };

test("luring: offline masuk antrean berurutan dengan klien_id + waktu klien, tanpa kode", async () => {
  const {a, simpan} = buat(async () => { throw new Error("jaringan"); });
  const r1 = await a.kirim("POST", "/api/meja/catatan", {meja: "dsp", kode: "RAHASIA"}, () => false), r2 = await a.kirim("POST", "/api/meja/catatan/x", {aksi: "status"}, () => false);
  assert.ok(r1.antre && r2.antre && r1.ok);
  const l = simpan.lihat(); assert.equal(l.length, 2); assert.notEqual(l[0].klien_id, l[1].klien_id);
  assert.ok(l[0].b.klien_id === l[0].klien_id && Number.isFinite(l[0].b.waktu_klien)); assert.equal(l[1].m, "POST");
  assert.ok(!JSON.stringify(l).includes("x-kode"), "header kode tidak disimpan");
});

test("luring: kirim ulang berurutan, 2xx keluar dari antrean, urutan dijaga", async () => {
  const lihat = [], {a, simpan} = buat(async it => { lihat.push(it.u); return {s: 200, j: {}}; });
  for (const u of ["/1", "/2", "/3"]) await a.tambahItem(a.baru("POST", u, {}));
  const h = await a.kirimSemua(); assert.deepEqual(lihat, ["/1", "/2", "/3"]); assert.equal(h.terkirim, 3); assert.equal(h.sisa, 0); assert.equal(simpan.lihat().length, 0);
});

test("luring: 4xx dibuang dengan pesan, 5xx/408/429/jaringan tetap antre dan menghentikan urutan", async () => {
  const kode = {"/a": 422, "/b": 503, "/c": 200}, lihat = [];
  const {a, simpan} = buat(async it => { lihat.push(it.u); return {s: kode[it.u], j: it.u === "/a" ? {galat: "kolom salah"} : {}}; });
  for (const u of ["/a", "/b", "/c"]) await a.tambahItem(a.baru("POST", u, {}));
  let h = await a.kirimSemua();
  assert.equal(h.dibuang.length, 1); assert.equal(h.dibuang[0].pesan, "kolom salah"); assert.deepEqual(lihat, ["/a", "/b"], "/c menunggu giliran /b");
  assert.deepEqual(simpan.lihat().map(x => x.u), ["/b", "/c"]);
  for (const s of [408, 429, 500]) { kode["/b"] = s; h = await a.kirimSemua(); assert.equal(h.sisa, 2, "status " + s); }
  kode["/b"] = 200; h = await a.kirimSemua(); assert.equal(h.sisa, 0); assert.equal(h.terkirim, 2);
  const lempar = buat(async () => { throw new Error("putus"); }); await lempar.a.tambahItem(lempar.a.baru("POST", "/q", {}));
  assert.equal((await lempar.a.kirimSemua()).sisa, 1);
});

test("luring: tanpa kode antrean menunggu; online + antrean kosong langsung kirim; respons hilang -> klien_id sama dipakai ulang", async () => {
  let ada = false, n = 0;
  const {a, simpan} = buat(async () => { n++; return {s: 200, j: {}}; }, {kodeAda: () => ada});
  await a.tambahItem(a.baru("POST", "/k", {})); const h = await a.kirimSemua(); assert.equal(h.kode, false); assert.equal(n, 0); assert.equal(h.sisa, 1);
  ada = true; assert.equal((await a.kirimSemua()).terkirim, 1);
  const langsung = await a.kirim("POST", "/l", {}, () => true); assert.equal(langsung.antre, undefined); assert.equal(langsung.s, 200);
  const ids = []; const t = buat(async it => { ids.push(it.b.klien_id); if (ids.length === 1) throw new Error("putus"); return {s: 201, j: {}}; });
  const r = await t.a.kirim("POST", "/m", {}, () => true); assert.equal(r.antre, true); await t.a.kirimSemua();
  assert.equal(ids.length, 2); assert.equal(ids[0], ids[1], "kiriman ulang membawa klien_id yang sama (idempotensi server)");
  const empat = buat(async () => ({s: 400, j: {galat: "x"}})); assert.equal((await empat.a.kirim("POST", "/n", {}, () => true)).s, 400, "4xx langsung dikembalikan, tidak diantrekan");
  assert.equal(simpan.lihat().length, 0);
});

test("luring: antrean dua halaman berbagi penyimpanan tapi tidak saling kirim", async () => {
  const simpan = memori(), got = [];
  const m = buat(async it => { got.push("meja" + it.u); return {s: 200, j: {}}; }, {simpan, untuk: "meja"}), r = buat(async it => { got.push("rel" + it.u); return {s: 200, j: {}}; }, {simpan, untuk: "relawan"});
  await m.a.tambahItem(m.a.baru("POST", "/1", {})); await r.a.tambahItem(r.a.baru("POST", "/2", {}));
  await r.a.kirimSemua(); assert.deepEqual(got, ["rel/2"]); assert.equal(simpan.lihat().length, 1); assert.equal(await m.a.jumlah(), 1);
});
