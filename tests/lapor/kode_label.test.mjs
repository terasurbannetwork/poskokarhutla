/* LK-08 (paket data/kajian-bnpb/lapor-kejadian/, Q14 bawaan): tiga keluarga kode kejadian tidak pernah tampil telanjang atau tercampur di layar Lapor.
   KJ-ddmmyy-NN (kejadian laporan K66), KJ-ddmm-XXXXXXXX (kejadian resmi Buku Besar), GL-ddmmyy-NN (gugus) selalu lewat labelKode (public/lapor/kode.js).
   Gerbang statis: tiap `${x.kode}` di templat dan tiap el()/append() yang menulis x.kode di public/lapor/*.js harus memanggil labelKode, kecuali
   pemakaian bukan teks layar yang tercatat di IZIN (mis. kode wilayah di URL). Jalan: node --test tests/lapor/kode_label.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {labelKode} from "../../public/lapor/kode.js";

const DIR = new URL("../../public/lapor/", import.meta.url);
const IZIN = [/encodeURIComponent\(kec\.kode\)/];   // peringatan.js: kode kecamatan di URL API, bukan kode kejadian

test("labelKode: tiap keluarga berlabel sendiri, kode lain tidak diubah", () => {
  assert.equal(labelKode("KJ-241126-03"), "Kejadian laporan KJ-241126-03");
  assert.equal(labelKode("KJ-2411-AB12CD34"), "Kejadian resmi KJ-2411-AB12CD34");
  assert.equal(labelKode("GL-241126-01"), "Kejadian laporan GL-241126-01", "gugus = kejadian laporan (D1)");
  assert.equal(labelKode("GL-241126-100"), "Kejadian laporan GL-241126-100");
  for (const x of ["LA-241126-01", "", null, undefined, "KJ-24-1"]) assert.equal(labelKode(x), String(x ?? ""), String(x));
  assert.notEqual(labelKode("KJ-241126-03").split(" ").slice(0, 2).join(" "), labelKode("KJ-2411-AB12CD34").split(" ").slice(0, 2).join(" "), "dua keluarga KJ tidak pernah satu label");
});

export function telanjang(teks) {
  const salah = [];
  const pola = [/\$\{([^{}]*\.kode)\}/g, /(?:el|append)\(([^()]*\.kode)\)/g, /textContent\s*=\s*[^;]*?([\w.?]+\.kode)\b/g];
  for (const re of pola) for (const m of teks.matchAll(re)) {
    const potong = teks.slice(Math.max(0, m.index - 40), m.index + m[0].length + 5);
    if (/labelKode\(/.test(m[0]) || IZIN.some(r => r.test(potong))) continue;
    salah.push(m[0].slice(0, 80));
  }
  return salah;
}

// append() berargumen banyak: argumen sampai ");" di baris yang sama, satu argumen berupa x.kode tanpa labelKode
export const appendTelanjang = teks => [...teks.matchAll(/append\(([^\n]*?)\);/g)].map(m => m[1])
  .filter(a => a.split(",").some(x => /^\s*[\w?.]+\.kode\s*$/.test(x)) && !/labelKode\(/.test(a)).map(a => `append(${a.slice(0, 60)})`);

test("mode gagal: kode telanjang di templat atau el() tertangkap, yang berlabel lolos", () => {
  assert.equal(telanjang("x = `Kejadian ${kj.kode}`").length, 1);
  assert.equal(appendTelanjang('k.append(ikon("m-gugus"), g.kode); k.title = 1;').length, 1, "append berargumen banyak");
  assert.equal(appendTelanjang('k.append(ikon("m-gugus"), labelKode(g.kode)); k.title = 1;').length, 0);
  assert.equal(telanjang("el(\"b\", null, g.kode)").length, 1);
  assert.equal(telanjang("x = `${labelKode(kj.kode)}`").length, 0);
});

test("public/lapor/*.js: tidak ada kode kejadian telanjang", () => {
  const salah = [];
  for (const f of readdirSync(DIR).filter(f => f.endsWith(".js") && f !== "kode.js")) {
    const t = readFileSync(new URL(f, DIR), "utf8");
    for (const x of telanjang(t)) salah.push(`${f}: ${x}`);
    for (const x of appendTelanjang(t)) salah.push(`${f}: ${x}`);
  }
  assert.deepEqual(salah, [], "kode kejadian tampil tanpa label: bungkus dengan labelKode (public/lapor/kode.js, Q14)");
});
