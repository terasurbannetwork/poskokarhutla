/* Teks WhatsApp Kartu Api (public/instansi_kartu.js): fungsi murni, tanpa Chrome. Kartu kosong/null tidak boleh melempar atau mencetak NaN/undefined. */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {muatKartu, TUGAS, KARTU} from "./kartu_fixture.mjs";
const K = muatKartu();
uji("teks WA lengkap: angka kunci, rentang terkoreksi, navigasi ke titik masuk, tanpa titik tengah", () => {
  const s = K.teks(TUGAS, KARTU);
  assert.match(s, /KARTU API 62-261022-007/);
  assert.match(s, /Sekitar 12 ha, rentang 8,1 sampai 21 ha|sekitar 12 ha, rentang 8,1 sampai 21 ha/i);
  assert.doesNotMatch(s, /\b40 ha|\b30 ha/, "luas mentah piksel tidak boleh tampil");
  assert.match(s, /destination=-2\.5,113\.9/, "navigasi ke titik masuk");
  assert.match(s, /radius sekitar 380 m/); assert.match(s, /konsesi hti PT Contoh Lestari \(pemegang Grup Contoh\)/);
  assert.match(s, /regu 3 regu \(rentang 2 sampai 5\)/); assert.match(s, /Perkiraan dari satelit, belum divalidasi lapangan/);
  assert.doesNotMatch(s, /·|NaN|undefined|null|—/);
});
uji("teks WA tanpa kartu atau kartu kosong: yang ada saja, tanpa galat", () => {
  for (const k of [null, undefined, {}, {front: {lat: "x"}, luas_koreksi: {ha: "a"}, tren: {}, konsesi: [null, 5]}]) {
    const s = K.teks({}, k); assert.match(s, /KARTU API/); assert.doesNotMatch(s, /NaN|undefined|null|·/);
  }
  const s = K.teks(TUGAS, null); assert.match(s, /destination=-2\.5,113\.9/, "tanpa kartu, titik api dari tugas"); assert.match(s, /Kebutuhan/);
  assert.equal(K.html({}, null), "", "tanpa isi sama sekali: tidak ada kartu");
});
uji("luas: koreksi didahulukan, cadangan luas aktif, dua angka bermakna", () => {
  assert.match(K.teks({}, {luas_aktif: {ha: 1234, min: 900, maks: 1500}}), /sekitar 1\.200 ha/);
  assert.match(K.teks({}, {luas_koreksi: {ha: 5}, luas_aktif: {ha: 999}}), /sekitar 5 ha/);
});
