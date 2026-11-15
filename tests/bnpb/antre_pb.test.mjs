/* Antrean luring /meja dan /relawan/saya di atas PbAntre (KP-11): penyimpanan memori, fetch tiruan. node --test tests/bnpb/antre_pb.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import "../../public/inti/antre.js";
import "../../public/bnpb/antre.js";

const {PbAntre, AntreBnpb} = globalThis;
const buat = (untuk, kode, o = {}) => { const st = o.st || PbAntre.memori(); return {st, a: AntreBnpb.buat(untuk, () => kode.v, {simpan: () => st, langsung: false, pemicu: false, ...o})}; };
const lama = isi => { const st = {hapus: 0}; return {st, semua: async () => isi, hapus: async () => { st.hapus++; }}; };
const fetchTiruan = (balas, catat) => { const o = globalThis.fetch; globalThis.fetch = async (u, i) => { catat.push({u, i}); return balas(u, i); }; return () => { globalThis.fetch = o; }; };
const res = (status, j = {}) => ({status, json: async () => j});

test("luring: masuk antrean dengan klien_id dan waktu_klien dalam badan, x-kode tak tersimpan, lalu terkirim dengan kode saat itu", async () => {
  const kode = {v: "KODE-A"}, {a, st} = buat("meja", kode), c = [];
  const r = await a.kirim("POST", "/api/meja/catatan", {meja: "dsp"}, () => false);
  assert.ok(r.ok && r.antre);
  const [x] = await st.semua("meja"); assert.equal(x.data.m, "POST"); assert.equal(x.data.u, "/api/meja/catatan");
  assert.equal(x.data.b.klien_id, x.klien_id); assert.ok(Number.isFinite(x.data.b.waktu_klien));
  assert.ok(!JSON.stringify(x).includes("KODE-A") && !JSON.stringify(x).toLowerCase().includes("x-kode"));
  kode.v = "KODE-B"; const pulih = fetchTiruan(() => res(201), c);
  try { await a.saluran.kirimSekarang(); } finally { pulih(); }
  assert.equal(c.length, 1); assert.equal(c[0].i.headers["x-kode"], "KODE-B"); assert.equal(JSON.parse(c[0].i.body).klien_id, x.klien_id);
  assert.equal(await a.jumlah(), 0);
});

test("langsung bila online dan antrean kosong; gagal 5xx masuk antrean dengan klien_id yang sama; 4xx tak diantrekan", async () => {
  const kode = {v: "K"}, {a} = buat("relawan", kode), c = [];
  let pulih = fetchTiruan(() => res(200, {ok: 1}), c);
  try { const r = await a.kirim("POST", "/api/relawan/saya/penugasan/1", {aksi: "masuk"}, () => true); assert.ok(r.ok && !r.antre); } finally { pulih(); }
  pulih = fetchTiruan(() => res(422, {galat: "salah"}), c);
  try { const r = await a.kirim("POST", "/u", {aksi: "x"}, () => true); assert.ok(!r.ok && !r.antre && r.j.galat === "salah"); } finally { pulih(); }
  assert.equal(await a.jumlah(), 0);
  pulih = fetchTiruan(() => res(503), c);
  try { const r = await a.kirim("POST", "/u", {aksi: "keluar"}, () => true); assert.ok(r.antre); } finally { pulih(); }
  assert.equal(await a.jumlah(), 1); assert.equal(JSON.parse(c[2].i.body).klien_id, (await a.saluran.daftar())[0].klien_id);
  assert.equal(await a.jumlah(), 1);
});

test("tanpa kode: tidak dikirim langsung, antre menunggu", async () => {
  const {a} = buat("meja", {v: ""}), c = []; const pulih = fetchTiruan(() => res(200), c);
  try { assert.ok((await a.kirim("POST", "/u", {}, () => true)).antre); } finally { pulih(); }
  assert.equal(c.length, 0);
});

test("pindahan pb_antre/kv: larik dibuka, klien_id dan badan sama persis, butir halaman lain ikut tersimpan, basis lama dihapus sesudahnya", async () => {
  const b1 = {a: 1, klien_id: "k1", waktu_klien: Date.now() - 5}, b2 = {aksi: "masuk", klien_id: "k2", waktu_klien: Date.now() - 6};
  const L = lama([[{untuk: "meja", klien_id: "k1", m: "POST", u: "/api/meja/catatan", b: b1}, {untuk: "relawan", klien_id: "k2", m: "POST", u: "/api/relawan/saya/penugasan/9", b: b2}, {untuk: "meja", klien_id: "rusak"}]]);
  const {a, st} = buat("meja", {v: "K"});
  assert.equal(await a.pindah(L), 1); assert.equal(L.st.hapus, 1);
  const [m] = await st.semua("meja"), [r] = await st.semua("relawan");
  assert.equal(m.klien_id, "k1"); assert.deepEqual(m.data, {m: "POST", u: "/api/meja/catatan", b: b1}); assert.equal(m.dibuat, b1.waktu_klien);
  assert.equal(r.klien_id, "k2"); assert.deepEqual(r.data.b, b2);
  assert.equal(await a.pindah(lama([])), 0);
});

test("pindahan: penyimpanan gagal -> basis lama tidak dihapus", async () => {
  const st = PbAntre.memori(); st.taruh = async () => { throw new Error("penuh"); };
  const L = lama([[{untuk: "meja", klien_id: "k1", m: "POST", u: "/u", b: {klien_id: "k1", waktu_klien: Date.now()}}]]);
  const {a} = buat("meja", {v: "K"}, {st});
  assert.equal(await a.pindah(L), -1); assert.equal(L.st.hapus, 0);
});

test("pindahLokal: cadangan localStorage lama dipindah lalu dihapus", async () => {
  const mem = new Map([["pb_antre_bnpb", JSON.stringify([{untuk: "relawan", klien_id: "k3", m: "POST", u: "/u", b: {klien_id: "k3", waktu_klien: Date.now()}}])]]);
  const ls = {getItem: k => mem.get(k) ?? null, removeItem: k => mem.delete(k)};
  const {a, st} = buat("relawan", {v: "K"});
  assert.equal(await a.pindahLokal(ls), 1); assert.equal((await st.semua("relawan")).length, 1); assert.equal(mem.size, 0);
});
