/* Gabungkan beberapa keluaran kumpul.mjs (lintasan paralel) jadi scripts/i18n/laporan.json + tabel ringkas.
   Pakai: node scripts/i18n/gabung.mjs a.json b.json … [--keluar scripts/i18n/laporan.json] */
import fs from "node:fs";
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const keluar = arg("keluar", "scripts/i18n/laporan.json");
const berkas = process.argv.slice(2).filter((x, i, a) => !x.startsWith("--") && a[i - 1] !== "--keluar");
const L = {dibuat: new Date().toISOString(), hilang: {}, semua_hilang: {}, id_berisi_en: {}, en_berisi_id: {}, campur: {}, tab: {}, galat: {}};
for (const f of berkas) {
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const k of ["hilang", "id_berisi_en", "en_berisi_id", "campur"]) for (const [t, tabs] of Object.entries(d[k] || {})) L[k][t] = [...new Set([...(L[k][t] || []), ...tabs])];
  for (const [t, n] of Object.entries(d.semua_hilang || {})) L.semua_hilang[t] = (L.semua_hilang[t] || 0) + n;
  for (const [t, x] of Object.entries(d.tab || {})) Object.assign(L.tab[t] ||= {}, x);
  Object.assign(L.galat, d.galat || {});
}
fs.writeFileSync(keluar, JSON.stringify(L, null, 1));
const kol = [...new Set(Object.values(L.tab).flatMap(Object.keys))].sort();
console.log("tab".padEnd(44), kol.map(c => c.padEnd(18)).join(""));
for (const [k, x] of Object.entries(L.tab)) console.log(k.slice(0, 43).padEnd(44), kol.map(c => (x[c] ? `${x[c].bocor}/${x[c].campur}/${x[c].teks}${x[c].persen_bocor > 1 ? "!" : ""}` : "-").padEnd(18)).join(""));
console.log("\nID berisi EN:", Object.keys(L.id_berisi_en).length, " EN berisi ID:", Object.keys(L.en_berisi_id).length, " campur:", Object.keys(L.campur).length, " kunci hilang:", Object.keys(L.hilang).length);
