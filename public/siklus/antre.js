/* Siklus F4: antrean luring formulir baris Jitupasna (SK-078, KP-10). Penyimpanan, kirim ulang, mundur, dan pita ada di public/inti/antre.js (window.PbAntre).
   Di sini hanya: periksa() isian, bentuk butir (klien_id dibuat SEKALI saat tambah; server UNIQUE jitupasna_id+klien_id menjawab duplikat, bukan baris kedua),
   kirim per Jitupasna (POST /api/siklus/pulih/:id/baris, 100 per paket lewat opsi batch), dan pemindahan butir dari IndexedDB "siklus-antre". */
const RE_KLIEN = /^[A-Za-z0-9_-]{8,40}$/;

const BARIS = {rusak: ["tingkat", "unit"], rugi: ["komponen", "arus_rp", "bulan"]};
/* isian formulir -> baris siap kirim, atau {galat}. Angka kosong tidak pernah menjadi 0. */
export function periksa(b) {
  if (!b || (b.jenis !== "rusak" && b.jenis !== "rugi")) return {galat: "Jenis baris harus rusak atau rugi"};
  if (typeof b.sektor !== "string" || !/^[a-z][a-z0-9_]{1,39}$/.test(b.sektor)) return {galat: "Pilih sektor"};
  for (const k of BARIS[b.jenis]) if (b[k] == null || b[k] === "") return {galat: `Isian ${k.replace("_rp", " (Rp)")} belum diisi`};
  const o = {jenis: b.jenis, sektor: b.sektor};
  if (b.jenis === "rusak") { if (!["rb", "rs", "rr", "hancur", "unit"].includes(b.tingkat)) return {galat: "Tingkat tidak dikenal"}; const u = Number(b.unit); if (!Number.isFinite(u) || u < 0) return {galat: "Unit harus angka nol atau lebih"}; Object.assign(o, {tingkat: b.tingkat, unit: u}); }
  else { const a = Number(b.arus_rp), n = Number(b.bulan); if (!Number.isInteger(a) || a < 0) return {galat: "Arus harus bilangan bulat rupiah"}; if (!Number.isInteger(n) || n < 1 || n > 120) return {galat: "Bulan 1 sampai 120"}; Object.assign(o, {komponen: String(b.komponen).trim().toLowerCase().replace(/\s+/g, "_"), arus_rp: a, bulan: n}); }
  if (b.asumsi) o.asumsi = String(b.asumsi).slice(0, 300);
  return {baris: o};
}

/* kirimJp(jpId, baris) -> {ok, status, j} (api() inti.js). Paket PbAntre dibagi per jp_id; gagal pertama menentukan jawaban, sisanya dikirim ulang aman (idempoten). */
export const pengirim = kirimJp => async butir => {
  const per = new Map(); for (const {jp_id, ...baris} of butir) { delete baris.waktu_klien; (per.get(jp_id) ?? per.set(jp_id, []).get(jp_id)).push(baris); }
  for (const [jp, baris] of per) { const r = await kirimJp(jp, baris); if (!r.ok) return {s: r.status, j: r.j ?? {}}; }
  return {s: 200, j: {}};
};
export const saluran = (kirimJp, o = {}) => globalThis.PbAntre.saluran("siklus", {kirim: pengirim(kirimJp), batch: 100, ...o});

/* -> {ok, id} atau {ok: false, pesan}; klien_id bawaan dibuat sekali di sini */
export async function tambah(s, jpId, isian, {klien_id} = {}) {
  const c = periksa(isian); if (c.galat) return {ok: false, pesan: c.galat};
  const id = klien_id ?? globalThis.crypto.randomUUID(); if (!RE_KLIEN.test(id)) return {ok: false, pesan: "klien_id tidak sah"};
  try { await s.masukkan({klien_id: id, data: {...c.baris, jp_id: jpId}}); } catch { return {ok: false, pesan: "Penyimpanan peramban penuh atau diblokir. Isian tidak tersimpan."}; }
  return {ok: true, id};
}

/* butir lama {klien_id, jp_id, baris, dibuat} -> butir saluran; klien_id dipertahankan (T6/T7). Basis lama dihapus pindahDari hanya bila semua butir terbaca ulang. */
export const petakan = b => ({klien_id: b.klien_id, dibuat: b.dibuat, data: {...b.baris, jp_id: b.jp_id}});
export const pindahkan = s => globalThis.PbAntre.pindahDari({db: "siklus-antre", store: "butir", petakan, ke: s});
