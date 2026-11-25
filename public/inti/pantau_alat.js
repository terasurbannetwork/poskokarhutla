/* Panel pemantauan alat (EWS) banjir dan gunung api: bagian murni (EW-01).
   Paket data/kajian-bnpb/ews: ALGORITMA G1 tingkat, G2 basi, G3 ringkasan, G4 seri, G5 urutan.
   Uji: tests/inti/pantau_alat.test.mjs (U1, U12). Tanpa DOM; komponen layar menyusul di EW-05. */

const MENIT = 6e4;
/* KEPUTUSAN Q4 (bawaan diterima pemilik 25 Nov 2026). Jenis tanpa batas: basi hanya dari sumber (pos.basi) atau waktu kosong */
export const BATAS = {tma: 30 * MENIT, hujan: 30 * MENIT, geofon: 10 * MENIT};
/* KEPUTUSAN Q8, HIPOTESIS: interval kirim alat sendiri, dasar deteksi celah grafik */
export const INTERVAL = {tma: 5 * MENIT, hujan: 5 * MENIT, geofon: MENIT};
export const TINGKAT = ["waspada", "siaga", "awas"];
/* DESIGN-SYSTEM: label tingkat; kata "aman" tidak pernah dipakai (D3) */
export const LABEL = {normal: "Normal", waspada: "Waspada", siaga: "Siaga", awas: "Awas", tanpa_data: "Tidak ada data terkini"};
const PENGELOLA = {sihka: "Kementerian PU, Ditjen SDA (SIHKA)", pvmbg: "PVMBG, Badan Geologi"};
const LEVEL_PVMBG = {normal: "normal", waspada: "waspada", siaga: "siaga", awas: "awas"};

/* tingkat tertinggi yang terlewati: {tingkat, kunci} | null. Salinan PERSIS src/sensor.js tingkatAmbang;
   kesamaannya dijaga uji U1. ponytail: dua definisi sampai src/sensor.js mengimpor dari sini (warga-api). */
export function tingkatAmbang(ambang, nilai) {
  let t = -1, kunci = null;
  for (const [k, a] of Object.entries(ambang || {})) {
    const v = nilai?.[k]; if (typeof v !== "number" || !a || typeof a !== "object") continue;
    TINGKAT.forEach((n, i) => { if (typeof a[n] === "number" && v >= a[n] && i > t) { t = i; kunci = k; } });
  }
  return t < 0 ? null : {tingkat: TINGKAT[t], kunci};
}

/* G2: basi tidak mengubah nilai; umur tepat di batas belum basi. SIHKA mengikuti status "lama" pipeline (pos_air.js) */
export function basi(pos, kini) {
  if (!pos || pos.waktu == null || !Number.isFinite(pos.waktu)) return true;
  if (pos.basi === true || (pos.sumber === "sihka" && pos.status === "lama")) return true;
  const b = BATAS[pos.jenis];
  return b != null && kini - pos.waktu > b;
}

/* G1: {kode, label, kunci?, resmi?, pengelola?} | null (nilai tampil tanpa warna tingkat).
   kode: normal|waspada|siaga|awas|tanpa_data|resmi. Status resmi sumber luar ditulis apa adanya (D3, Q7) */
export function tingkat(pos, kini) {
  if (basi(pos, kini)) return {kode: "tanpa_data", label: LABEL.tanpa_data};
  const r = typeof pos.status_resmi === "string" && pos.status_resmi.trim() ? pos.status_resmi.trim() : null;
  if (pos.sumber === "pvmbg" || pos.sumber === "sihka") {
    if (!r) return null;
    const kode = pos.sumber === "pvmbg" ? LEVEL_PVMBG[r.toLowerCase()] || "resmi" : "resmi";
    return {kode, label: r, resmi: r, pengelola: pos.pengelola || PENGELOLA[pos.sumber]};
  }
  const amb = pos.ambang && typeof pos.ambang === "object" ? pos.ambang : null;
  if (!amb || !Object.keys(amb).length) return null;
  const t = tingkatAmbang(amb, pos.nilai);
  if (t) return {kode: t.tingkat, label: LABEL[t.tingkat], kunci: t.kunci};
  /* Normal hanya bila sedikitnya satu besaran berambang benar-benar terukur; selain itu tidak dinilai */
  const dinilai = Object.keys(amb).some(k => typeof pos.nilai?.[k] === "number");
  return dinilai ? {kode: "normal", label: LABEL.normal} : null;
}

/* di atas ambang = Waspada ke atas, tidak basi. SIHKA: tiap "Siaga n" resmi berada di atas ambang pengelola */
const diAtas = t => !!t && (TINGKAT.includes(t.kode) || (t.kode === "resmi" && /^siaga\b/i.test(t.resmi || "")));

/* G3: angka hanya dari daftar yang ada. Daftar kosong karena semua sumber gagal -> jumlah null, bukan 0 */
export function ringkasan(pos, kini, {gagal = [], kamera = null} = {}) {
  const daftar = Array.isArray(pos) ? pos : [];
  const kosongKarenaGagal = !daftar.length && gagal.length > 0;
  if (kosongKarenaGagal) return {jumlah_pos: null, di_atas_ambang: null, terputus: null, kamera, gagal: [...gagal]};
  let atas = 0, putus = 0;
  for (const p of daftar) { const t = tingkat(p, kini); if (t?.kode === "tanpa_data") putus++; else if (diAtas(t)) atas++; }
  return {jumlah_pos: daftar.length, di_atas_ambang: atas, terputus: putus, kamera, gagal: [...gagal]};
}

/* G5: tingkat tertinggi dulu, lalu basi, lalu sisanya; dalam kelompok menurut nama (stabil antar-pembaruan) */
const PERINGKAT = {awas: 0, siaga: 1, waspada: 2, resmi: 3, tanpa_data: 4, normal: 5};
export function urut(pos, kini) {
  const kunci = p => { const t = tingkat(p, kini); return t?.kode === "resmi" && !diAtas(t) ? 5 : PERINGKAT[t?.kode] ?? 5; };
  return [...pos].map(p => [kunci(p), String(p.nama ?? p.id ?? ""), p])
    .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1], "id"))
    .map(x => x[2]);
}

/* G4: titik [waktu, nilai, ...] -> segmen garis. Celah > 2x interval atau nilai kosong memutus garis;
   nilai kosong tidak pernah jadi 0 dan tidak ikut digambar */
export function seri(titik, interval) {
  if (!Array.isArray(titik) || !(interval > 0)) return [];
  const sah = titik.filter(t => Array.isArray(t) && Number.isFinite(t[0])).sort((a, b) => a[0] - b[0]);
  const segmen = []; let kini = null, lalu = null;
  for (const t of sah) {
    if (typeof t[1] !== "number" || !Number.isFinite(t[1])) { kini = null; lalu = t[0]; continue; }
    if (!kini || (lalu != null && t[0] - lalu > 2 * interval)) segmen.push(kini = []);
    kini.push(t); lalu = t[0];
  }
  return segmen;
}
