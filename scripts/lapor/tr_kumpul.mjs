/* Kumpulan teks statis Lapor Bencana untuk kamus terjemahan (pemilik 20 Nov 2026: "semua statis, lu terjemahin aja semua dulu").
   Sumber: teks dan atribut public/lapor/index.html, string literal layar (lapor.js, maskot.js, ilustrasi.js), semua isi edukasi.json,
   dan string literal mesin (lapor_mesin.js, lapor_spek.js, lapor_info.js) untuk pertanyaan bot. Lebih banyak tidak apa-apa (hanya biaya terjemah sekali);
   teks yang tersusun saat jalan (berisi angka atau nama) tetap lewat /api/lapor/terjemah dan simpanan server.
   Dipakai scripts/lapor/tr_buat.mjs; jalankan langsung untuk melihat jumlahnya: node scripts/lapor/tr_kumpul.mjs */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as acorn from "acorn";
import {BAHASA} from "../../src/lapor_bahasa.js";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baca = j => fs.readFileSync(path.join(AKAR, j), "utf8");
export const MAKS = 600;   // sama dengan batas pejalan teks di lapor.js

const KODE = /^lp-|\slp-|^\w+[:/]\w+$|^[a-z0-9_-]+$|^[a-z]+[A-Z]\w*$|^[.#:[]|[{}<>=;\\]|^\/|https?:|\.(js|css|json|png|svg|html|pdf|docx|jpg|mp4)\b|^\s*$|^[A-Z0-9_]+$|^\w+\(|=>|&&|\|\|/;
const layak = t => t.length >= 2 && t.length <= MAKS && /\p{L}{2}/u.test(t) && !KODE.test(t) && !/^LA-\d/.test(t);
// kunci kamus = teks dengan spasi dan baris baru dirapatkan (sama dengan kunci di lapor.js); teks asli (dengan baris baru) yang diterjemahkan
export const kunciTr = t => String(t).replace(/\s+/g, " ").trim();
const rapi = t => String(t).replace(/[ \t]+/g, " ").trim();

function literal(src) {   // token string dan template dari acorn (bukan regex: regex literal berisi tanda kutip menggeser pasangan kutip)
  const hasil = [];
  for (const t of acorn.tokenizer(src, {ecmaVersion: "latest", sourceType: "module"})) {
    if (t.type === acorn.tokTypes.string) hasil.push(rapi(String(t.value)));
    else if (t.type === acorn.tokTypes.template) hasil.push(rapi(String(t.value ?? "")));   // potongan statis di antara ${...}
  }
  return hasil;
}
function html(src) {
  const isi = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<!--[\s\S]*?-->/g, " ");
  const hasil = [...isi.matchAll(/(?:placeholder|title|aria-label|alt)="([^"]+)"/g)].map(m => kunciTr(m[1]));
  for (const p of isi.split(/<[^>]+>/)) hasil.push(kunciTr(p.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")));   // satu simpul teks = di antara dua tag
  return hasil;
}
function json(o, acc = []) {
  if (typeof o === "string") acc.push(rapi(o));
  else if (Array.isArray(o)) o.forEach(x => json(x, acc));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (!["id", "gambar", "dibuat", "catatan", "ikon", "url", "sumber"].includes(k)) json(v, acc);
  return acc;
}

export function kumpul() {
  const semua = [
    ...html(baca("public/lapor/index.html")),
    ...["public/lapor/lapor.js", "public/lapor/maskot.js", "public/lapor/ilustrasi.js", "src/lapor_mesin.js", "src/lapor_spek.js", "src/lapor_info.js"].flatMap(j => literal(baca(j))),
    ...json(JSON.parse(baca("public/lapor/edukasi.json"))),
    ...BAHASA.map(([, n]) => `Lanjut dalam bahasa ${n.replace(/^Bahasa /, "")}`),   // tombol jendela bahasa (template di lapor.js)
  ];
  const peta = new Map();   // kunci -> teks asli
  const tambah = t => { const k = kunciTr(t); if (layak(k) && !peta.has(k)) peta.set(k, t); };
  for (const t of semua) { tambah(t); if (t.includes("\n")) t.split("\n").forEach(tambah); }   // pesan bot tersusun saat jalan: tiap baris tetap juga butir (dariIndonesia menerjemahkan per baris)
  // ket tombol berisi "=" juga tersaring sebagai kode; satuan pil angka ("orang", "KK") lolos dari filter KODE (kata tunggal huruf kecil dianggap kode), jadi dimasukkan langsung
  for (const m of baca("src/lapor_spek.js").matchAll(/\b(?:satuan|ket):\s*"([^"]+)"/g)) { const k = kunciTr(m[1]); if (!peta.has(k)) peta.set(k, m[1]); }
  return new Map([...peta].sort(([a], [b]) => a < b ? -1 : 1));
}

if (import.meta.url === `file://${process.argv[1]}`) { const k = kumpul(); console.log(k.size, "teks"); if (process.argv[2] === "-v") console.log([...k.keys()].join("\n")); }
