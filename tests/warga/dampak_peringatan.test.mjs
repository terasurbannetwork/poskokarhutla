/* DP-09: rute baca status prakiraan dan dampak peringatan (src/dampak_peringatan.js) di Miniflare dengan R2 sungguhan. RENCANA-UJI N15. */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";

const U = await siapkan("uji-dampak-peringatan", {r2: true}), uji = berantai();
const R2 = await U.mf.getR2Bucket("MEDIA");
const ip = n => ({"cf-connecting-ip": `10.8.0.${n}`});
const RINGKAS = {versi: 1, kab: {"1101": {nama: "Kab. Aceh Selatan", status: {BNJ: {s: 2}}, fasilitas: {sekolah_dapodik: 37, faskes_osm: null}, desa: {"x": 1}, titik: [1, 2]}}};

uji("objek belum terbit: belum_terukur, bukan nol (publik dan staf)", async () => {
  for (const j of ["ringkas", "status"]) {
    const r = await U.api("GET", `/api/dampak-peringatan/${j}`, undefined, ip(1));
    assert.equal(r.s, 200); assert.equal(r.j.belum_terukur, true); assert.ok(r.j.alasan);
  }
  const d = await U.api("GET", "/api/dampak-peringatan/desa?kab=1101", undefined, ADMIN);
  assert.equal(d.s, 200); assert.equal(d.j.belum_terukur, true);
});

uji("publik: ringkas tersaji tanpa kunci tingkat desa atau titik, fasilitas tetap hitungan", async () => {
  await R2.put("dampak_peringatan/ringkas.json", JSON.stringify(RINGKAS));
  const r = await U.api("GET", "/api/dampak-peringatan/ringkas", undefined, ip(2));
  assert.equal(r.s, 200); assert.equal(r.j.kab["1101"].nama, "Kab. Aceh Selatan");
  assert.equal(r.j.kab["1101"].fasilitas.sekolah_dapodik, 37); assert.equal(r.j.kab["1101"].fasilitas.faskes_osm, null);
  assert.ok(!/"desa"|"titik"/.test(r.t), "kunci desa/titik bocor");
  assert.match(r.h.get("cache-control") || "", /public, max-age=120/);
});

uji("N15: rute desa tanpa sesi 401; kab bukan empat digit 400; staf menerima berkas desa", async () => {
  await R2.put("dampak_peringatan/desa/1101.json", JSON.stringify({desa: [{kd: "1101012001", nama: "Contoh", fasilitas: {faskes_osm: [{nama: "Puskesmas X"}]}}]}));
  assert.equal((await U.api("GET", "/api/dampak-peringatan/desa?kab=1101", undefined, ip(3))).s, 401);
  for (const k of ["", "11", "11011", "abcd", "1101/../x"]) assert.equal((await U.api("GET", `/api/dampak-peringatan/desa?kab=${encodeURIComponent(k)}`, undefined, ADMIN)).s, 400, k);
  const r = await U.api("GET", "/api/dampak-peringatan/desa?kab=1101", undefined, ADMIN);
  assert.equal(r.s, 200); assert.equal(r.j.desa[0].nama, "Contoh"); assert.match(r.h.get("cache-control") || "", /no-store/);
});

uji("N15: publik tidak menyajikan jalur desa dan hanya GET", async () => {
  assert.equal((await U.api("POST", "/api/dampak-peringatan/ringkas", {}, ip(4))).s >= 400, true);
  assert.ok(!/Puskesmas X/.test((await U.api("GET", "/api/dampak-peringatan/status", undefined, ip(4))).t));
});

uji("objek rusak (bukan JSON) dijawab belum_terukur", async () => {
  await R2.put("dampak_peringatan/status.json", "{rusak");
  const r = await U.api("GET", "/api/dampak-peringatan/status", undefined, ip(5));
  assert.equal(r.s, 200); assert.equal(r.j.belum_terukur, true);
});

uji("publik: poligon peringatan BMKG dan nama kab lewat tanpa berubah, kunci desa tetap dibuang", async () => {
  const poligon = [[107.1, -6.2], [107.3, -6.2], [107.3, -6.4], [107.1, -6.2]];
  await R2.put("dampak_peringatan/ringkas.json", JSON.stringify({...RINGKAS, peringatan: [{id: "a", bahaya: "banjir", poligon}]}));
  const r = await U.api("GET", "/api/dampak-peringatan/ringkas", undefined, ip(6));
  assert.deepEqual(r.j.peringatan[0].poligon, poligon);
  assert.equal(r.j.kab["1101"].nama, "Kab. Aceh Selatan");
  assert.ok(!/"desa"|"titik"/.test(r.t));
});

const staf = async (id, peran, wilayah) => {
  const tok = id.repeat(64).slice(0, 64);
  await U.DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, ?, ?, 'Pusdalops', ?, ?, ?, ?, ?, ?, 0, 1, 'tes', 0)`).bind(id.repeat(16), "dpuji" + id + "xx", "Staf " + id, "9200" + id + "000", id + "@b.id", "6281300000" + id.charCodeAt(0), JSON.stringify(peran), JSON.stringify(wilayah), "a".repeat(32), "a".repeat(64)).run();
  await U.DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id.repeat(16), Date.now() + 3600e3).run();
  return {cookie: "sesi_staf=" + tok, "x-pb": "1"};
};

uji("/desa: staf berwilayah hanya provinsinya (403 di luar), peran lain 401, galat tidak disimpan", async () => {
  const a = await staf("a", ["pusdalops"], ["11"]), b = await staf("b", ["tmc"], []);
  const ok = await U.api("GET", "/api/dampak-peringatan/desa?kab=1101", undefined, a); assert.equal(ok.s, 200);
  const luar = await U.api("GET", "/api/dampak-peringatan/desa?kab=3301", undefined, a);
  assert.equal(luar.s, 403); assert.match(luar.h.get("cache-control") || "", /no-store/);
  assert.equal((await U.api("GET", "/api/dampak-peringatan/desa?kab=1101", undefined, b)).s, 401);
  assert.match((await U.api("GET", "/api/dampak-peringatan/desa?kab=x", undefined, a)).h.get("cache-control") || "", /no-store/);
});

uji("publik: daftar putih membuang kunci desa, kelurahan, nama fasilitas, geometri, dan kab bukan empat digit di kedalaman mana pun", async () => {
  const kotor = {versi: 1, dibuat: "x", kode_desa: "1", geometry: {x: 1}, kab: {"1101": {nama: "A", kelurahan: "B", terliput: true, geometry: [1],
    status: {BNJ: {s: 1, hari: [1, 0, 0, 0], alamat: "jl"}}, bahaya: {BNJ: {r_bmkg: 2, penduduk_area_peringatan: {worldpop: 5, desa_x: {a: 1}}, nama_desa: "Z"}},
    fasilitas: {sekolah_dapodik: 3, faskes_osm: {nama: "Puskesmas Z"}, "Nama Bebas": 4}, jiwa_kelas: {tinggi: 1}}, "abcd": {nama: "bukan kab"}, "11012": {nama: "x"}},
    peringatan: [{id: "a", poligon: [[[1, 2]]], wilayah: "w", penerima: "rahasia", kab: ["1101"]}]};
  await R2.put("dampak_peringatan/ringkas.json", JSON.stringify(kotor));
  const r = await U.api("GET", "/api/dampak-peringatan/ringkas", undefined, ip(7));
  assert.equal(r.s, 200);
  assert.deepEqual(Object.keys(r.j.kab), ["1101"]);
  assert.deepEqual(r.j.kab["1101"].fasilitas, {sekolah_dapodik: 3});
  assert.deepEqual(r.j.kab["1101"].bahaya.BNJ, {r_bmkg: 2, penduduk_area_peringatan: {worldpop: 5}});
  assert.deepEqual(r.j.peringatan[0], {id: "a", poligon: [[[1, 2]]], wilayah: "w", kab: ["1101"]});
  assert.ok(!/kode_desa|kelurahan|geometry|alamat|Puskesmas|nama_desa|rahasia|bukan kab/.test(r.t), r.t);
});

uji("status.json nyata (bentuk status_prakiraan.py) lewat utuh; belum_terukur tidak disimpan cache", async () => {
  const st = {versi: 1, dibuat: "x", boleh_tampil: false, hipotesis: true, boleh_per_bahaya: {BNJ: false}, sumber: {prediksi: "t", umpan_bmkg: "segar", kelas_kab: true},
    kab: {"1101": {BNJ: {hipotesis: true, s: 1, pemicu: "bmkg", sebagian: false, hari: [1, 0, 0, null]}}}};
  await R2.put("dampak_peringatan/status.json", JSON.stringify(st));
  assert.deepEqual((await U.api("GET", "/api/dampak-peringatan/status", undefined, ip(8))).j, st);
  await R2.delete("dampak_peringatan/status.json");
  const b = await U.api("GET", "/api/dampak-peringatan/status", undefined, ip(9));
  assert.equal(b.j.belum_terukur, true); assert.match(b.h.get("cache-control") || "", /no-store/);
});
