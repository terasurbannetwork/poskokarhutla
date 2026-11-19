/* Pilihan bahasa Lapor Bencana (KEPUTUSAN-LAPOR-AI K58, D80-D83, Q43). Mesin dan data tetap bahasa Indonesia:
   pesan pelapor diterjemahkan ke Indonesia sebelum masuk mesin (teks asli disimpan berdampingan), balasan mesin diterjemahkan ke bahasa pilihan.
   Angka dijaga: terjemahan masuk yang memuat angka yang tidak ada di teks asli ditolak dan teks asli yang dipakai (aturan kutipan angka tetap).
   Tanpa model (tanpa kunci API) hanya bahasa Indonesia (D82). Dipakai server lokal dan nanti Worker; model = buatModel() src/lapor_model.js. */

export const BAHASA = [
  ["id", "Bahasa Indonesia"], ["en", "English"], ["jv", "Basa Jawa"], ["su", "Basa Sunda"], ["min", "Baso Minang"], ["bug", "Basa Ugi (Bugis)"],
  ["mad", "Basa Madura"], ["ban", "Basa Bali"], ["bjn", "Bahasa Banjar"], ["bbc", "Hata Batak Toba"], ["ace", "Bahsa Acèh"], ["mak", "Basa Mangkasara"],
  ["lain", "Bahasa daerah lain (ketik saja)"],
];
const NAMA = {id: "Indonesian", en: "English", jv: "Javanese (ngoko alus, polite)", su: "Sundanese (lemes, polite)", min: "Minangkabau", bug: "Buginese", mad: "Madurese",
  ban: "Balinese (polite register)", bjn: "Banjarese", bbc: "Batak Toba", ace: "Acehnese", mak: "Makassarese"};
export const bahasaSah = b => BAHASA.some(([k]) => k === b) ? b : "id";

const SKEMA = {type: "object", properties: {teks: {type: "string"}}, required: ["teks"], additionalProperties: false};
const angkaDi = t => new Set(String(t).match(/\d+(?:[.,]\d+)?/g) || []);

/* pesan pelapor -> bahasa Indonesia. Hasil {teks, asli, diterjemahkan}. */
export async function keIndonesia(model, teks, bahasa) {
  const asli = String(teks || "");
  if (!model || !asli.trim() || bahasa === "id" || /^\s*\d+\s*$/.test(asli)) return {teks: asli, asli, diterjemahkan: false}; // nomor pilihan tidak diterjemahkan
  try {
    const j = await model({sistem: `You translate a disaster report message from a resident in Indonesia into plain Indonesian. The resident writes in ${NAMA[bahasa] || "an Indonesian regional language or another language"}.
Rules: translate meaning only, add nothing. Keep every number exactly as written: digits stay digits, number words stay number words translated literally (do not convert words to digits or digits to words). Keep place names, people names, and road names unchanged. If the text is already Indonesian, return it unchanged.`, skema: SKEMA, teks: asli});
    const hasil = String(j?.teks || "").trim();
    if (!hasil) return {teks: asli, asli, diterjemahkan: false};
    const a = angkaDi(asli); for (const x of angkaDi(hasil)) if (!a.has(x)) return {teks: asli, asli, diterjemahkan: false}; // angka baru = tolak terjemahan
    return {teks: hasil, asli, diterjemahkan: hasil !== asli};
  } catch { return {teks: asli, asli, diterjemahkan: false}; }
}

/* balasan mesin (Indonesia) -> bahasa pilihan. Teks dan label tombol dalam satu panggilan; gagal = Indonesia apa adanya. */
export async function dariIndonesia(model, {teks, pilihan = null, ket = null}, bahasa) {
  if (!model || bahasa === "id" || !teks) return {teks, pilihan, ket};
  const skema = {type: "object", properties: {teks: {type: "string"}, pilihan: {type: "array", items: {type: "string"}}, ket: {type: "array", items: {type: "string"}}}, required: ["teks", "pilihan", "ket"], additionalProperties: false};
  try {
    const j = await model({sistem: `You translate messages from the BNPB disaster reporting assistant from Indonesian into ${bahasa === "lain" ? "simple Indonesian that a speaker of any Indonesian regional language understands (keep it Indonesian, just simpler)" : NAMA[bahasa]}.
Rules: keep WhatsApp formatting (*bold*, _italic_, line breaks, "- " bullets). Keep all numbers, ticket numbers (like LA-191126-01), phone numbers (112, 117), URLs, and names exactly. Translate "pilihan" (button labels) and "ket" (button hints) item by item, same count and order; empty strings stay empty. Polite register. Output only the translation.`,
      skema, teks: JSON.stringify({teks, pilihan: pilihan || [], ket: ket || []})});
    const a = angkaDi(teks); for (const x of angkaDi(j?.teks || "")) if (!a.has(x)) return {teks, pilihan, ket}; // angka berubah = kirim Indonesia
    return {teks: j?.teks || teks, pilihan: pilihan && j?.pilihan?.length === pilihan.length ? j.pilihan : pilihan, ket: ket && j?.ket?.length === ket.length ? j.ket : ket};
  } catch { return {teks, pilihan, ket}; }
}
