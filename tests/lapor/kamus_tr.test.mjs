// Kamus terjemahan statis Lapor (public/lapor/tr, scripts/lapor/tr_buat.mjs): bot memakainya tanpa model, dan isinya menjaga angka dan tanda tebal.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {dariIndonesia, kunciTr, BAHASA} from "../../src/lapor_bahasa.js";

test("bot: pertanyaan tetap dari kamus tanpa model; satu label hilang = tetap Indonesia", async () => {
  const kamus = {"Siapa nama Anda?": "Saha nami Anjeun?", "Lewati": "Liwat"};
  assert.deepEqual(await dariIndonesia(null, {teks: "Siapa  nama\nAnda?", pilihan: ["Lewati"], ket: [""]}, "su", kamus), {teks: "Saha nami Anjeun?", pilihan: ["Liwat"], ket: [""]});
  assert.deepEqual(await dariIndonesia(null, {teks: "Siapa nama Anda?", pilihan: ["Batal"]}, "su", kamus), {teks: "Saha nami Anjeun?", pilihan: ["Batal"], ket: null});   // parsial: yang ketemu diterjemahkan
  assert.equal((await dariIndonesia(null, {teks: "Siapa nama Anda?"}, "id", kamus)).teks, "Siapa nama Anda?");
});

test("berkas kamus: kode bahasa sah, kunci rapat, angka dan tanda tebal sama", () => {
  const dir = new URL("../../public/lapor/tr/", import.meta.url), kode = new Set(BAHASA.map(([k]) => k));
  const angka = t => [...String(t).matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0]).sort().join("|");
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    assert.ok(kode.has(f.replace(/\.json$/, "")) && f !== "id.json", `kode bahasa ${f}`);
    for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(new URL(f, dir), "utf8")))) {
      assert.equal(kunciTr(k), k, `${f}: kunci tidak rapat`);
      assert.equal(angka(v), angka(k), `${f}: angka berubah di "${k.slice(0, 60)}"`);
      assert.equal((v.match(/\*/g) || []).length, (k.match(/\*/g) || []).length, `${f}: tanda tebal di "${k.slice(0, 60)}"`);
    }
  }
});

test("bot: teks tersusun diterjemahkan per baris; baris asing dibantu model, model gagal = parsial", async () => {
  const kamus = {"*Lokasi tercatat*": "*Location noted*", "Desa/Kel.": "Village:"};
  const t = "*Lokasi tercatat*\nDesa/Kel.";
  assert.equal((await dariIndonesia(null, {teks: t}, "en", kamus)).teks, "*Location noted*\nVillage:");
  const campur = "*Lokasi tercatat*\nKalimat baru";
  assert.equal((await dariIndonesia(null, {teks: campur}, "en", kamus)).teks, "*Location noted*\nKalimat baru");   // tanpa model
  assert.equal((await dariIndonesia(async () => { throw new Error("x"); }, {teks: campur}, "en", kamus)).teks, "*Location noted*\nKalimat baru");   // model gagal
  assert.equal((await dariIndonesia(async () => ({teks: "ada 99", pilihan: [], ket: []}), {teks: campur}, "en", kamus)).teks, "*Location noted*\nKalimat baru");   // penjaga angka menolak
  assert.equal((await dariIndonesia(async () => ({teks: "*Location noted*\nNew sentence", pilihan: [], ket: []}), {teks: campur}, "en", kamus)).teks, "*Location noted*\nNew sentence");
});

test("tr_kumpul: satuan dan tiap baris masuk", async () => {
  const {kumpul} = await import("../../scripts/lapor/tr_kumpul.mjs"), k = kumpul();
  for (const x of ["orang", "rumah", "KK", "*Lokasi tercatat*", "*Kejadian yang sama?*"]) assert.ok(k.has(x), x);
});
