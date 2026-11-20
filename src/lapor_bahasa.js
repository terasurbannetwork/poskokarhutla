/* Pilihan bahasa Lapor Bencana (KEPUTUSAN-LAPOR-AI K58, D80-D83, Q43). Mesin dan data tetap bahasa Indonesia:
   pesan pelapor diterjemahkan ke Indonesia sebelum masuk mesin (teks asli disimpan berdampingan), balasan mesin diterjemahkan ke bahasa pilihan.
   Angka dijaga: terjemahan masuk yang memuat angka yang tidak ada di teks asli ditolak dan teks asli yang dipakai (aturan kutipan angka tetap).
   Tanpa model (tanpa kunci API) hanya bahasa Indonesia (D82). Dipakai server lokal dan nanti Worker; model = buatModel() src/lapor_model.js. */

import {samarkan} from "./samarkan.js";

export const BAHASA = [   // label dalam bahasa Indonesia supaya mudah dikenali (pemilik 20 Nov 2026: "bahasa batak gitu"); mutu model per bahasa belum diukur (Q43)
  ["id", "Bahasa Indonesia"], ["en", "English"], ["jv", "Bahasa Jawa"], ["su", "Bahasa Sunda"], ["mad", "Bahasa Madura"], ["ban", "Bahasa Bali"],
  ["sas", "Bahasa Sasak"], ["min", "Bahasa Minang"], ["bbc", "Bahasa Batak Toba"], ["btx", "Bahasa Batak Karo"], ["btm", "Bahasa Batak Mandailing"],
  ["bts", "Bahasa Batak Simalungun"], ["nia", "Bahasa Nias"], ["ace", "Bahasa Aceh"], ["msa", "Bahasa Melayu"], ["ljp", "Bahasa Lampung"],
  ["bjn", "Bahasa Banjar"], ["nij", "Bahasa Dayak Ngaju"], ["bug", "Bahasa Bugis"], ["mak", "Bahasa Makassar"], ["sda", "Bahasa Toraja"],
  ["gor", "Bahasa Gorontalo"], ["abs", "Bahasa Ambon"], ["pmy", "Bahasa Papua"],
];
export const NAMA_BAHASA = {id: "Indonesian", en: "English", jv: "Javanese (ngoko alus, polite)", su: "Sundanese (lemes, polite)", mad: "Madurese", ban: "Balinese (polite register)",
  sas: "Sasak", min: "Minangkabau", bbc: "Batak Toba", btx: "Batak Karo", btm: "Batak Mandailing", bts: "Batak Simalungun", nia: "Nias", ace: "Acehnese",
  msa: "Malay as spoken in Sumatra and Riau", ljp: "Lampung", bjn: "Banjarese", nij: "Ngaju Dayak", bug: "Buginese", mak: "Makassarese", sda: "Toraja-Sa'dan",
  gor: "Gorontalo", abs: "Ambonese Malay", pmy: "Papuan Malay"};
export const bahasaSah = b => BAHASA.some(([k]) => k === b) ? b : "id";

const SKEMA = {type: "object", properties: {teks: {type: "string"}}, required: ["teks"], additionalProperties: false};
const angkaDi = t => new Set(String(t).match(/\d+(?:[.,]\d+)?/g) || []);
// dua arah: angka tidak boleh bertambah, hilang, atau berubah. ponytail: kata bilangan ("limang", "tiga") tidak terperiksa; batasnya dikenal,
// mesin tetap meminta kutipan angka dari teks terjemahan, dan teks asli tersimpan berdampingan untuk diperiksa petugas
// K72: terjemahan yang jauh lebih panjang dari aslinya bukan terjemahan (model dibelokkan menulis jawaban); dibuang, teks asli dipakai
export const wajarPanjang = (asal, hasil) => String(hasil).length <= String(asal).length * 2.5 + 40;
const angkaSama = (a, b) => { const x = angkaDi(a), y = angkaDi(b); return x.size === y.size && [...x].every(v => y.has(v)); };

/* pesan pelapor -> bahasa Indonesia. Hasil {teks, asli, diterjemahkan}. */
export async function keIndonesia(model, teks, bahasa) {
  const asli = String(teks || ""), aman = samarkan(asli);   // D12: disamarkan sebelum dikirim ke AI
  if (!model || !asli.trim() || bahasa === "id" || /^\s*\d+\s*$/.test(asli)) return {teks: asli, asli, diterjemahkan: false}; // nomor pilihan tidak diterjemahkan
  try {
    const j = await model({sistem: `You translate a disaster report message from a resident in Indonesia into plain Indonesian. The resident writes in ${NAMA_BAHASA[bahasa] || "an Indonesian regional language or another language"}.
Rules: translate meaning only, add nothing. Keep every number exactly as written: digits stay digits, number words stay number words translated literally (do not convert words to digits or digits to words). Keep place names, people names, and road names unchanged. If the text is already Indonesian, return it unchanged.`, skema: SKEMA, teks: aman});
    const hasil = String(j?.teks || "").trim();
    if (!hasil) return {teks: asli, asli, diterjemahkan: false};
    if (!angkaSama(aman, hasil) || !wajarPanjang(aman, hasil)) return {teks: asli, asli, diterjemahkan: false}; // angka berubah atau terlalu panjang = tolak terjemahan
    return {teks: hasil, asli, diterjemahkan: hasil !== asli};
  } catch { return {teks: asli, asli, diterjemahkan: false}; }
}

/* balasan mesin (Indonesia) -> bahasa pilihan. Teks dan label tombol dalam satu panggilan; gagal = Indonesia apa adanya. */
export const kunciTr = t => String(t ?? "").replace(/\s+/g, " ").trim();   // sama dengan kunci kamus statis public/lapor/tr dan lapor.js
export async function dariIndonesia(model, {teks, pilihan = null, ket = null, nama = null}, bahasa, kamus = null) {
  if (bahasa === "id" || !teks) return {teks, pilihan, ket};
  // kamus statis (scripts/lapor/tr_buat.mjs): pertanyaan tetap mesin sudah diterjemahkan sebelumnya, tanpa model dan seketika (pemilik 20 Nov 2026)
  if (kamus) { const k = t => !kunciTr(t) ? t : kamus[kunciTr(t)];
    const tt = k(teks), pp = pilihan?.map(k), kk = ket?.map(k);
    if (tt && !pp?.some(x => x == null) && !kk?.some(x => x == null)) return {teks: tt, pilihan: pp ?? pilihan, ket: kk ?? ket}; }
  if (!model) return {teks, pilihan, ket};
  // D12: yang ke AI disamarkan juga untuk arah keluar; nama pelapor diganti penanda lalu dipulihkan (tinjauan keamanan tahap 2)
  const tutup = t => { let x = samarkan(String(t ?? "")); if (nama && nama.length >= 2) x = x.split(nama).join("[NAMA]"); return x; };
  const buka = t => nama ? String(t).split("[NAMA]").join(nama) : String(t);
  const aman = tutup(teks), pAman = pilihan ? pilihan.map(tutup) : null, kAman = ket ? ket.map(tutup) : null;
  const skema = {type: "object", properties: {teks: {type: "string"}, pilihan: {type: "array", items: {type: "string"}}, ket: {type: "array", items: {type: "string"}}}, required: ["teks", "pilihan", "ket"], additionalProperties: false};
  try {
    const j = await model({sistem: `You translate messages from the BNPB disaster reporting assistant from Indonesian into ${bahasa === "lain" ? "simple Indonesian that a speaker of any Indonesian regional language understands (keep it Indonesian, just simpler)" : NAMA_BAHASA[bahasa]}.
Rules: keep WhatsApp formatting (*bold*, _italic_, line breaks, "- " bullets). Keep all numbers, ticket numbers (like LA-191126-01), phone numbers (112, 117), URLs, names, and placeholders in square brackets (like [NAMA]) exactly. Translate "pilihan" (button labels) and "ket" (button hints) item by item, same count and order; empty strings stay empty. Polite register. Output only the translation.`,
      skema, teks: JSON.stringify({teks: aman, pilihan: pAman || [], ket: kAman || []})});
    if (!angkaSama(aman, j?.teks || "") || !wajarPanjang(aman, j?.teks || "") || !String(j?.teks || "").includes("[NAMA]") && aman.includes("[NAMA]")) return {teks, pilihan, ket}; // angka atau penanda nama hilang = kirim Indonesia
    return {teks: buka(j.teks), pilihan: pilihan && j?.pilihan?.length === pilihan.length ? j.pilihan.map(buka) : pilihan, ket: ket && j?.ket?.length === ket.length ? j.ket.map(buka) : ket};
  } catch { return {teks, pilihan, ket}; }
}

/* teks antarmuka kartu (judul, keterangan, tombol, placeholder) -> bahasa pilihan, sekaligus satu panggilan (pemilik 20 Nov 2026: kartu masih bahasa Indonesia).
   Hanya teks tetap buatan layar, bukan isian pelapor. Butir yang angkanya berubah atau jumlahnya tidak cocok tetap Indonesia. */
// PANJANG 600: paragraf halaman privasi dan bantuan ikut diterjemahkan (pemilik 20 Nov 2026: privasi tetap Indonesia saat bahasa Bali).
// HURUF_PANGGILAN: satu panggilan model paling banyak sekian huruf masukan; 40 teks panjang sekaligus melewati max_tokens 2048 (bahasa Bali alus
// lebih panjang dari Indonesia) dan seluruh kiriman jadi null, jadi daftar dipotong lalu dipanggil bersamaan.
export const MAKS_TEKS_UI = 60, PANJANG_TEKS_UI = 600, HURUF_PANGGILAN = 2000;
export async function terjemahUi(model, daftar, bahasa) {   // butir gagal = null (klien mencoba lagi nanti, tidak menyimpan teks asli sebagai terjemahan)
  const teks = (Array.isArray(daftar) ? daftar : []).slice(0, MAKS_TEKS_UI).map(t => String(t ?? "").slice(0, PANJANG_TEKS_UI));
  if (bahasa === "id" || !NAMA_BAHASA[bahasa]) return teks;
  if (!model || !teks.length) return teks.map(() => null);
  const potong = [[]]; let huruf = 0;
  for (const t of teks) { if (potong.at(-1).length && huruf + t.length > HURUF_PANGGILAN) { potong.push([]); huruf = 0; } potong.at(-1).push(t); huruf += t.length; }
  return (await Promise.all(potong.map(p => terjemahSatu(model, p, bahasa)))).flat();
}
async function terjemahSatu(model, teks, bahasa) {
  const skema = {type: "object", properties: {teks: {type: "array", items: {type: "string"}}}, required: ["teks"], additionalProperties: false};
  try {
    const j = await model({sistem: `You translate short user-interface labels of the BNPB disaster reporting app from Indonesian into ${NAMA_BAHASA[bahasa]}. Translate item by item, same count and order. Keep numbers, units, place names, and "WhatsApp", "GPS", "BNPB", "BPBD" unchanged. Short and polite. Output only the translations.`,
      skema, teks: JSON.stringify({teks})});
    if (!Array.isArray(j?.teks) || j.teks.length !== teks.length) return teks.map(() => null);
    return teks.map((t, i) => typeof j.teks[i] === "string" && j.teks[i].trim() && angkaSama(t, j.teks[i]) && wajarPanjang(t, j.teks[i]) ? j.teks[i] : null);
  } catch { return teks.map(() => null); }
}
