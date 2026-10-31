#!/usr/bin/env node
/* Penjaga sebelum unggah R2 bulanan: berkas baru tidak boleh menyusut lebih dari 5% dibanding versi yang baru diunduh
   (unduhan gagal diam-diam atau panen bolong menghasilkan berkas kecil yang menimpa data bagus).
   node scripts/akademisi/pemutakhiran/jaga_unggah.mjs <folder lama> <folder baru> nama1 nama2 ... ; keluar 1 bila ada yang menyusut. */
import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

/* ukuran = jumlah baris: larik; objek pembungkus larik (lembaga, pendanaan, wilayah_daya.kab) = jumlah lariknya;
   objek kecil berisi peta (lembaga_ekstra: lembaga + kampus) = jumlah kunci petanya; peta per id (pakar_ekstra, kejadian_ekstra) = jumlah kunci */
export const ukuran = d => { if (Array.isArray(d)) return d.length; if (!d || typeof d !== "object") return 0; const v = Object.values(d);
  if (v.some(Array.isArray)) return v.filter(Array.isArray).reduce((a, x) => a + x.length, 0);
  return v.length <= 3 ? v.reduce((a, x) => a + (x && typeof x === "object" ? Object.keys(x).length : 0), 0) : v.length; };

export const susut = (lama, baru, ambang = 0.95) => lama > 0 && baru < lama * ambang;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [lamaDir, baruDir, ...nama] = process.argv.slice(2); let gagal = 0;
  for (const n of nama) { const pb = join(baruDir, n + ".json"), pl = join(lamaDir, n + ".json");
    if (!existsSync(pb)) { console.log(`${n}: TIDAK ADA hasil baru`); gagal++; continue; }
    const b = ukuran(JSON.parse(readFileSync(pb, "utf8"))), l = existsSync(pl) ? ukuran(JSON.parse(readFileSync(pl, "utf8"))) : 0;
    const buruk = susut(l, b); if (buruk) gagal++; console.log(`${n}: lama ${l}, baru ${b}${buruk ? "  MENYUSUT, unggah dibatalkan" : ""}`); }
  process.exit(gagal ? 1 : 0);
}
