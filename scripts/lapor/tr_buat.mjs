/* Kamus terjemahan statis Lapor Bencana: public/lapor/tr/<kode>.json = {kunci teks Indonesia: terjemahan}, satu berkas per bahasa (pemilik 20 Nov 2026:
   "semua statis, lu terjemahin aja semua dulu"; bahasa harus langsung berganti, tanpa menunggu AI dan tanpa batas laju).
   Teks dari scripts/lapor/tr_kumpul.mjs. Bertambah: butir yang sudah ada tidak diterjemahkan ulang, butir yang tidak lagi ada dibuang.
   Angka harus sama dan tanda *tebal* harus utuh, kalau tidak butirnya tidak masuk kamus (layar jatuh ke /api/lapor/terjemah).
   Kunci API dari env atau scripts/wa/.env, tidak dicetak. Jalankan: node scripts/lapor/tr_buat.mjs [kode ...]   (tanpa kode = semua bahasa) */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {kumpul} from "./tr_kumpul.mjs";
import {BAHASA, NAMA_BAHASA} from "../../src/lapor_bahasa.js";
import {buatModel} from "../../src/lapor_model.js";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = path.join(AKAR, "public/lapor/tr");
// scripts/wa/.env lebih dulu: sesi Claude Code membawa ANTHROPIC_BASE_URL-nya sendiri di env yang bukan untuk kunci ini
const env = k => (fs.readFileSync(path.join(AKAR, "scripts/wa/.env"), "utf8").match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1] || process.env[k];
const model = buatModel({kunci: env("ANTHROPIC_API_KEY"), dasar: env("ANTHROPIC_BASE_URL") || "", model: process.env.LAPOR_MODEL || undefined, batasMs: 240000, maksToken: 12000});
if (!model) { console.error("ANTHROPIC_API_KEY tidak ada"); process.exit(1); }

const angka = t => [...String(t).matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0]).sort().join("|");
const tebal = t => (String(t).match(/\*/g) || []).length;
const sah = (a, b) => typeof b === "string" && b.trim() && angka(a) === angka(b) && tebal(a) === tebal(b);
const SKEMA = {type: "object", properties: {teks: {type: "array", items: {type: "string"}}}, required: ["teks"], additionalProperties: false};

async function terjemah(kode, daftar) {
  const sistem = `You translate the user interface, chatbot questions, and disaster preparedness guidance of BNPB's disaster reporting app (Indonesia) from Indonesian into ${NAMA_BAHASA[kode]}.
Translate EVERY item fully into ${NAMA_BAHASA[kode]}, including short labels such as menu names, tab names, and button text. Do not leave Indonesian words untranslated when ${NAMA_BAHASA[kode]} has its own word; keep a loanword only when speakers really use it.
Keep exactly: digits and numbers, units, *asterisks* around bold text, _underscores_, line breaks, "- " bullets, placeholders in square brackets, URLs, phone numbers, @handles, and these names: BNPB, BPBD, BMKG, PVMBG, WhatsApp, GPS, Google Maps, KK, NIK, SIG, AI, Sigap.
Place names stay as written. Polite, plain register that ordinary villagers understand. Same count and order as the input. Output only the translations.`;
  const j = await model({sistem, skema: SKEMA, teks: JSON.stringify({teks: daftar})});
  if (!Array.isArray(j?.teks) || j.teks.length !== daftar.length) throw new Error(`jumlah ${j?.teks?.length} lawan ${daftar.length}`);
  return j.teks;
}

async function satuBahasa(kode, sumber) {
  const berkas = path.join(DIR, `${kode}.json`);
  let lama = {}; try { lama = JSON.parse(fs.readFileSync(berkas, "utf8")); } catch {}
  const kamus = Object.fromEntries([...sumber.keys()].filter(k => lama[k]).map(k => [k, lama[k]]));
  const belum = [...sumber.keys()].filter(k => !kamus[k]);
  const potong = []; let bag = [], n = 0;
  for (const k of belum) { const t = sumber.get(k); if (bag.length && (n + t.length > 3500 || bag.length >= 60)) { potong.push(bag); bag = []; n = 0; } bag.push(k); n += t.length; }
  if (bag.length) potong.push(bag);
  let gagal = 0;
  const kerja = async ks => {
    for (let coba = 1; coba <= 3; coba++) {
      try { const hasil = await terjemah(kode, ks.map(k => sumber.get(k)));
        ks.forEach((k, i) => { if (sah(sumber.get(k), hasil[i])) kamus[k] = hasil[i].trim(); else gagal++; }); return; }
      catch (e) { if (coba === 3) { gagal += ks.length; console.error(`${kode}: ${e.message}`); } }
    }
  };
  for (let i = 0; i < potong.length; i += 6) await Promise.all(potong.slice(i, i + 6).map(kerja));   // 6 potongan bersamaan per bahasa
  const urut = Object.fromEntries(Object.keys(kamus).sort().map(k => [k, kamus[k]]));
  fs.writeFileSync(berkas, JSON.stringify(urut) + "\n");
  console.log(`${kode}: ${Object.keys(urut).length}/${sumber.size} (${belum.length} baru, ${gagal} ditolak)`);
}

const sumber = kumpul();
fs.mkdirSync(DIR, {recursive: true});
const pilih = process.argv.slice(2), kodeSemua = BAHASA.map(([k]) => k).filter(k => k !== "id" && (!pilih.length || pilih.includes(k)));
for (let i = 0; i < kodeSemua.length; i += 4) await Promise.all(kodeSemua.slice(i, i + 4).map(k => satuBahasa(k, sumber)));   // 4 bahasa bersamaan
