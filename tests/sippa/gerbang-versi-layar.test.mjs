/* Gerbang versi CSS layar /pipa: berkas yang dimuat ber-?v= dari public/pipa/*.js dilayani cache immutable setahun,
   jadi isi berubah tanpa ?v= naik = peramban memakai gaya lama selamanya (27 Okt 2026: peta penuh tidak tampil karena layar_peta.css?v=2 basi).
   Fixture fixtures/versi-layar.json mencatat sha256 per "berkas@v"; isi satu ?v= tidak boleh berubah. Perbarui: node tests/sippa/gerbang-versi-layar.test.mjs --catat */
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync, readdirSync, writeFileSync} from "node:fs";

const akar = p => new URL(`../../${p}`, import.meta.url);
const FIX = new URL("./fixtures/versi-layar.json", import.meta.url);
export function rujukan() {
  const r = {};
  for (const n of readdirSync(akar("public/pipa")).filter(n => n.endsWith(".js")))
    for (const m of readFileSync(akar(`public/pipa/${n}`), "utf8").matchAll(/\/pipa\/([a-z_]+\.css)\?v=(\d+)/g)) r[`${m[1]}@${m[2]}`] = m[1];
  return r;
}
const sha = b => createHash("sha256").update(readFileSync(akar(`public/pipa/${b}`))).digest("hex").slice(0, 16);

if (process.argv.includes("--catat")) {
  const lama = JSON.parse(readFileSync(FIX, "utf8"));
  for (const [k, b] of Object.entries(rujukan())) lama[k] ??= sha(b);
  writeFileSync(FIX, JSON.stringify(lama, null, 2) + "\n");
}

test("gerbang versi CSS layar: isi tiap berkas@?v= sama dengan potret tercatat (berubah wajib naik ?v=)", () => {
  const catat = JSON.parse(readFileSync(FIX, "utf8")), g = [];
  for (const [k, b] of Object.entries(rujukan())) {
    if (!catat[k]) g.push(`${k} belum tercatat; jalankan node tests/sippa/gerbang-versi-layar.test.mjs --catat`);
    else if (catat[k] !== sha(b)) g.push(`${b} berubah tetapi ?v= tetap (${k}); naikkan ?v= di pemuatnya lalu catat`);
  }
  assert.deepEqual(g, []);
});
