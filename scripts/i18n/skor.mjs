/* Nilai ulang keluaran kumpul.mjs --dump (atau gabungannya) dengan kelas.mjs terkini, tanpa crawl ulang.
   Pakai: node scripts/i18n/skor.mjs a.json [b.json …] [--contoh N]   -> tabel per tab: bocor/campur/teks per bahasa & lebar */
import fs from "node:fs";
import {kelas} from "./kelas.mjs";
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const berkas = process.argv.slice(2).filter((x, i, a) => !x.startsWith("--") && !a[i - 1]?.startsWith("--"));
const teks = {};
for (const f of berkas) Object.assign(teks, JSON.parse(fs.readFileSync(f, "utf8")).teks || {});
const tab = {}, contoh = {id: new Map(), en: new Map(), campur: new Map()};
for (const [kunci, xs] of Object.entries(teks)) {
  const [k, bhs, lebar] = kunci.split(" ");
  let bocor = 0, campur = 0;
  for (const t of xs) { const c = kelas(t);
    if (bhs === "id" ? c.en : c.id) { bocor++; contoh[bhs].set(t, k); }
    if (c.id && c.en) { campur++; contoh.campur.set(`[${bhs}] ${t}`, k); } }
  (tab[k] ||= {})[`${bhs}_${lebar}`] = {teks: xs.length, bocor, campur, persen: xs.length ? +(100 * bocor / xs.length).toFixed(2) : 0};
}
const kol = [...new Set(Object.values(tab).flatMap(Object.keys))].sort();
console.log("tab".padEnd(46), kol.map(c => c.padEnd(17)).join(""));
for (const [k, x] of Object.entries(tab)) console.log(k.slice(0, 45).padEnd(46), kol.map(c => (x[c] ? `${x[c].bocor}/${x[c].campur}/${x[c].teks}${x[c].persen > 1 ? "!" : ""}` : "-").padEnd(17)).join(""));
const N = +arg("contoh", 0);
console.log(`\nID berisi EN: ${contoh.id.size}  EN berisi ID: ${contoh.en.size}  campur: ${contoh.campur.size}`);
if (N) for (const [j, m] of Object.entries(contoh)) { console.log(`\n## ${j}`); for (const [t, k] of [...m].slice(0, N)) console.log(`- ${t.slice(0, 220)}   @ ${k}`); }
