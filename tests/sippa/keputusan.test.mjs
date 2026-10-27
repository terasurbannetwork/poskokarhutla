/* SP-100, SP-101, SP-102: keputusan harian. Fungsi murni; prioritas.json nyata dipakai bila ada. */
import test from "node:test";
import assert from "node:assert/strict";
import * as K from "../../public/pipa/keputusan.js";

const dasar = {id: "K1", n24: 0, n7: 10, menit: 60, darat: true, dari: "Daops Palangkaraya", besok: {tgl: "2026-10-28", hujan_mm: 2, angin_kmj: 8}};

test("skor: titik 7 hari + 3 x titik 24 jam, dibobot zona, dibagi 1 + jam perjalanan; tak terjangkau darat = null", () => {
  assert.equal(K.skor(dasar, "A"), 10 / 2);
  assert.equal(K.skor({...dasar, n24: 2}, "B"), (10 + 6) * 0.8 / 2);
  assert.equal(K.skor({...dasar, darat: false}, "A"), null);
  assert.equal(K.skor({...dasar, menit: null}, "A"), null);
  assert.ok(K.skor(dasar, "A") > K.skor(dasar, "D"), "zona A di atas D pada api dan waktu sama");
  assert.ok(K.skor(dasar, "A") > K.skor({...dasar, menit: 240}, "A"), "lebih dekat = lebih tinggi");
});

test("jalanTunda: urutan aturan tak terjangkau, angin, hujan, api tidak aktif, lalu jalan dengan alasan berangka id-ID", () => {
  assert.match(K.jalanTunda({...dasar, darat: false}).alasan, /^Tidak terjangkau darat/);
  const angin = K.jalanTunda({...dasar, besok: {hujan_mm: 50, angin_kmj: 30}});
  assert.equal(angin.putusan, "tunda"); assert.match(angin.alasan, /^Angin 30 km\/jam/, "angin menang atas hujan (keselamatan dulu)");
  assert.match(K.jalanTunda({...dasar, besok: {hujan_mm: 20.5, angin_kmj: 5}}).alasan, /^Hujan 20,5 mm/);
  assert.equal(K.jalanTunda({...dasar, besok: {hujan_mm: 19.9, angin_kmj: 29.9}}).putusan, "jalan", "tepat di bawah ambang = jalan");
  assert.match(K.jalanTunda({...dasar, n7: 2}).alasan, /^Api tidak aktif/);
  assert.equal(K.jalanTunda({...dasar, n7: 2, n24: 1}).putusan, "jalan", "titik 24 jam cukup walau 7 hari sedikit");
  const j = K.jalanTunda({...dasar, besok: null});
  assert.equal(j.putusan, "jalan"); assert.equal(j.alasan, "10 titik panas dalam 7 hari dalam 2 km; 60 menit dari Daops Palangkaraya.");
  assert.doesNotMatch(JSON.stringify([angin, j]), /titik api|·|—/);
});

test("jamBerangkat: tiba 07.00 WIB, dibulatkan turun 15 menit; lebih dari 7 jam = malam sebelumnya", () => {
  assert.deepEqual(K.jamBerangkat(79), {teks: "05.30 WIB", hari: 0});
  assert.deepEqual(K.jamBerangkat(0), {teks: "07.00 WIB", hari: 0});
  assert.deepEqual(K.jamBerangkat(420), {teks: "00.00 WIB", hari: 0});
  assert.deepEqual(K.jamBerangkat(421), {teks: "malam sebelumnya", hari: -1});
});

test("peringkat dan keputusanHariIni: urut skor, tak terjangkau di akhir, hanya yang jalan masuk keputusan, paling banyak tiga", () => {
  const kompleks = [{id: "K1", kab: "Kapuas", zona_k: "A"}, {id: "K2", kab: "Katingan", zona_k: "D"}, {id: "K3", kab: "Seruyan", zona_k: "A"}, {id: "K4", kab: "Sampit", zona_k: "B"}, {id: "K9", kab: "X", zona_k: "A"}];
  const pri = [{...dasar, id: "K1"}, {...dasar, id: "K2", n7: 50}, {...dasar, id: "K3", darat: false, n7: 99}, {...dasar, id: "K4", besok: {hujan_mm: 40, angin_kmj: 1}}];
  const r = K.peringkat(kompleks, pri, "zona_k", 10);
  assert.deepEqual(r.map(x => x.id), ["K2", "K1", "K4", "K3"], "K2: 50 x 0,2 = 10 di atas K1: 10; K3 tak terjangkau di akhir; K9 tanpa titik tidak masuk");
  assert.equal(r.find(x => x.id === "K1").kab, "Kapuas");
  const kh = K.keputusanHariIni(r);
  assert.deepEqual(kh.map(x => x.id), ["K2", "K1"], "K4 hujan dan K3 tak terjangkau ditunda");
  assert.equal(kh[0].berangkat.teks, "06.00 WIB");
  assert.equal(K.peringkat(kompleks, pri, "zona_k", 2).length, 2);
});

test("teksWhatsApp: kepala tebal, keputusan bernomor, tiga tunda teratas, catatan asumsi; tanpa titik tengah dan tanpa markup", () => {
  const urut = [{id: "K1", kab: "Kapuas", zona: "A", menit: 60, dari: "Daops Kapuas", putusan: "jalan", alasan: "10 titik panas dalam 7 hari dalam 2 km; 60 menit dari Daops Kapuas."},
    {id: "K2", kab: "Katingan", zona: "B", putusan: "tunda", alasan: "Hujan 40 mm besok: bara bisa padam sendiri dan jalan licin."}];
  const t = K.teksWhatsApp(urut, K.keputusanHariIni(urut), "Kalimantan Tengah", "27 Okt 2026");
  assert.match(t, /^\*SIPPA Kalimantan Tengah, 27 Okt 2026\*/);
  assert.match(t, /1\. K1 Kapuas, zona A: berangkat 06\.00 WIB dari Daops Kapuas\./);
  assert.match(t, /Ditunda:\n- K2 Katingan: Hujan 40 mm/);
  assert.doesNotMatch(t, /·|<|>/);
  assert.match(K.teksWhatsApp([], [], "X", "y"), /Belum ada lokasi yang layak/);
});
