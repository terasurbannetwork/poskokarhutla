// Kamus terjemahan statis Lapor (public/lapor/tr, scripts/lapor/tr_buat.mjs): bot memakainya tanpa model, dan isinya menjaga angka dan tanda tebal.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {dariIndonesia, kunciTr, BAHASA} from "../../src/lapor_bahasa.js";

test("bot: pertanyaan tetap dari kamus tanpa model; satu label hilang = tetap Indonesia", async () => {
  const kamus = {"Siapa nama Anda?": "Saha nami Anjeun?", "Lewati": "Liwat"};
  assert.deepEqual(await dariIndonesia(null, {teks: "Siapa  nama\nAnda?", pilihan: ["Lewati"], ket: [""]}, "su", kamus), {teks: "Saha nami Anjeun?", pilihan: ["Liwat"], ket: [""]});
  assert.deepEqual(await dariIndonesia(null, {teks: "Siapa nama Anda?", pilihan: ["Batal"]}, "su", kamus), {teks: "Siapa nama Anda?", pilihan: ["Batal"], ket: null});
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
