/* Peringatan dini warga (paket pwa-peringatan, ALGORITMA 2 sampai 8): fungsi murni src/pw_peringatan.js dijalankan nyata */
import test from "node:test";
import assert from "node:assert/strict";
import {hitungPeristiwa, teksNotif, penerima, endpointSah, tahanSampai, titikTerdekat, idLangganan, tglWib} from "../../src/pw_inti.js";

const kini = Date.parse("2026-11-21T03:00:00Z");   // 10.00 WIB
const P = (bnj, dibuat = "2026-11-21T00:00:00Z") => ({dibuat, kode: {HJN: {kol: ["tot"], hari: ["2026-11-21", "2026-11-22", "2026-11-23"]}, BNJ: {kol: ["lv", "ps"], vonis: {a: ["mengalahkan baseline"]}},
  LSR: {kol: ["lv", "ps"]}, ASP: {kol: ["pm", "kat"]}, CEX: {kol: ["emb", "lv"]}},
  kab: [{id: "3175", nama: "Kota Administrasi Jakarta Timur", BNJ: bnj, LSR: [[0, 0], [0, 0], [0, 0]], ASP: [null, null, null], CEX: [[10, 0], [10, 0], [10, 0]]}]});

test("naik ke Waspada memicu; tingkat sama tidak dua kali; turun lalu naik ke tingkat yang pernah tercatat tidak memicu", () => {
  const tercatat = new Map();
  let h = hitungPeristiwa(P([[1, 0], [0, 0], [2, 0]]), tercatat, kini);
  assert.deepEqual(h.perKab.get("3175").map(x => [x.tanggal, x.lv]), [["2026-11-21", 1], ["2026-11-23", 2]]);
  h = hitungPeristiwa(P([[1, 0], [0, 0], [2, 0]]), tercatat, kini);
  assert.equal(h.perKab.size, 0, "tingkat sama dua kali");
  h = hitungPeristiwa(P([[0, 0], [0, 0], [1, 0]]), tercatat, kini);
  assert.equal(h.perKab.size, 0, "turun tidak memicu");
  h = hitungPeristiwa(P([[2, 0], [0, 0], [2, 0]]), tercatat, kini);
  assert.deepEqual(h.perKab.get("3175").map(x => [x.tanggal, x.lv]), [["2026-11-21", 2]], "naik lagi lebih tinggi memicu");
});

test("null tidak dianggap 0, data basi lebih dari 36 jam tidak menghasilkan apa pun", () => {
  assert.equal(hitungPeristiwa(P([null, null, null]), new Map(), kini).perKab.size, 0);
  assert.equal(hitungPeristiwa(P([[3, 0], [3, 0], [3, 0]], "2026-11-19T00:00:00Z"), new Map(), kini).perKab.size, 0);
});

test("teks: judul berjenis dan bertingkat, isi berlabel prakiraan bukan peringatan resmi, tanpa kata aman", () => {
  const t = teksNotif("Kota Administrasi Jakarta Timur", [{jenis: "BNJ", tanggal: "2026-11-22", lv: 2, teruji: true}, {jenis: "CEX", tanggal: "2026-11-22", lv: 1, teruji: false}], "Cakung");
  assert.equal(t.judul, "Siaga di Kota Jakarta Timur");
  assert.match(t.isi, /Banjir Siaga, Angin kencang Waspada \(belum teruji\)/);
  assert.match(t.isi, /bukan peringatan resmi/);
  assert.doesNotMatch(`${t.judul} ${t.isi}`, /\baman\b/i);
  assert.ok(new TextEncoder().encode(JSON.stringify(t)).length < 3993);
});

test("penerima: satu notifikasi per perangkat, menurut jenis dan ambang", () => {
  const r = (id, endpoint, kec, jenis, ambang) => ({id, endpoint, p256dh: "x", auth: "y", kec_nama: kec, jenis, ambang});
  const daftar = [{jenis: "BNJ", tanggal: "2026-11-22", lv: 1}, {jenis: "ASP", tanggal: "2026-11-22", lv: 2}];
  const g = penerima([r("a", "e1", "Cakung", 15, 1), r("b", "e1", "Pulogadung", 15, 1), r("c", "e2", "Matraman", 1, 2), r("d", "e3", "Duren Sawit", 4, 1)], daftar);
  assert.equal(g.length, 2, "e2 hanya banjir dengan ambang Siaga: tidak menerima");
  assert.equal(g.find(x => x.sub.endpoint === "e1").kec, "Cakung, Pulogadung");
  assert.deepEqual(g.find(x => x.sub.endpoint === "e3").daftar.map(x => x.jenis), ["ASP"]);
});

test("endpoint hanya layanan push peramban; jam tenang menahan Waspada malam, Siaga tidak ditahan", () => {
  assert.ok(endpointSah("https://fcm.googleapis.com/fcm/send/abc"));
  assert.ok(endpointSah("https://web.push.apple.com/QGx"));
  assert.ok(!endpointSah("https://contoh.com/push"));
  assert.ok(!endpointSah("http://fcm.googleapis.com/x"));
  const malam = Date.parse("2026-11-21T16:00:00Z");   // 23.00 WIB
  assert.equal(tglWib(tahanSampai(malam, 1)), "2026-11-22");
  assert.equal(new Date(tahanSampai(malam, 1) + 7 * 3600e3).getUTCHours(), 5);
  assert.equal(tahanSampai(malam, 2), null);
  assert.equal(tahanSampai(kini, 1), null);
});

test("titik berkumpul: dalam 5 km, titik kumpul didahulukan, berlabel perkiraan", () => {
  const osm = {titik_kumpul: [[-6.20, 106.90, "Lapangan Banteng"]], sekolah: [[-6.199, 106.901, "SD Negeri 1"], [-6.5, 107.5, "Jauh"]]};
  const t = titikTerdekat({lat: -6.2, lon: 106.9}, osm, [[-6.201, 106.9, "Masjid Al Ikhlas"]]);
  assert.deepEqual(t.map(x => x.nama), ["Lapangan Banteng", "Masjid Al Ikhlas", "SD Negeri 1"]);
  assert.ok(t.every(x => x.sumber.includes("perkiraan")));
});

test("id langganan tetap untuk endpoint dan kecamatan yang sama", async () => {
  const a = await idLangganan("https://fcm.googleapis.com/x", "31.75.06"), b = await idLangganan("https://fcm.googleapis.com/x", "31.75.06");
  assert.equal(a, b); assert.equal(a.length, 16);
  assert.notEqual(a, await idLangganan("https://fcm.googleapis.com/x", "31.75.07"));
});

test("KI-01: push LSR, CEX, ASP berlabel Hipotesis; BNJ tidak", () => {
  const ev = jenis => [{jenis, lv: 2, tanggal: "2026-11-25", teruji: false}];
  for (const j of ["LSR", "CEX", "ASP"]) { const t = teksNotif("Kab. A", ev(j), ""); assert.ok(/Hipotesis/.test(t.judul) && /Hipotesis/.test(t.isi) && /belum lolos uji balik/.test(t.isi), j); }
  const b = teksNotif("Kab. A", ev("BNJ"), ""); assert.ok(!/Hipotesis|belum lolos/.test(b.judul + b.isi), "BNJ tanpa label");
  const campur = teksNotif("Kab. A", [{jenis: "BNJ", lv: 3, tanggal: "2026-11-25", teruji: true}, ...ev("LSR")], "");
  assert.ok(!campur.judul.includes("Hipotesis") && campur.isi.includes("Hipotesis"), "judul BNJ bersih, isi menandai LSR");
});
