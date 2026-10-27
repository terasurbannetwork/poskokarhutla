/* SIPPA fase 2 (keputusan 61, SP-120 sampai SP-129): validasi murni butir form lapangan HP. Tanpa D1, tanpa permintaan; dipakai src/sippa.js (lapanganKirim, lapanganFoto).
   Kontrak medan = tiket (jangan ganti nama). Kembalian {data, waktu} (data = objek yang disimpan, hanya medan dikenal) atau {galat}.
   Panjang teks dihitung titik kode ([...s].length) = length() SQLite. Waktu perangkat di luar 30 hari ke belakang atau 10 menit ke depan diganti jam server (SOS tidak boleh hilang karena jam HP meleset). */
const HARI = 864e5, MELESET_MS = 600000;
export const JENIS_LAP = ["periksa", "sos", "tekanan", "jejak", "selesai", "bor", "debit"];   // dikirim lewat /lapangan/kirim; 'foto' lewat /lapangan/foto
export const TAHAP_FOTO = ["tiba", "pompa", "gelar", "injeksi", "selesai"];
export const MAKS_DATA = 32768;
const RE_LANGKAH = /^[a-z0-9_]{2,40}$/, RE_PETAK = /^[A-Za-z0-9._ -]{1,40}$/, RE_BOM = /^[A-Z]{1,4}-\d{1,6}$/;
const ada = (v, a, z) => typeof v === "number" && Number.isFinite(v) && v >= a && v <= z;
export const lat = v => ada(v, -11.5, 6.5), lon = v => ada(v, 94.5, 141.5);   // kotak Indonesia, sama dengan MEDAN.log
const teks = (v, maks) => { if (v == null) return null; if (typeof v !== "string") return undefined; const t = v.normalize("NFC").trim(); return [...t].length <= maks ? t : undefined; };
const waktuOK = (v, kini) => ada(v, 1, 9e15) ? (v > kini - 30 * HARI && v <= kini + MELESET_MS ? Math.round(v) : kini) : null;
const r3 = x => Math.round(x * 1000) / 1000, r6 = x => Math.round(x * 1e6) / 1e6;
const g = galat => ({galat});
const petak = v => v == null ? null : typeof v === "string" && RE_PETAK.test(v) ? v : undefined;
const kodeDaftar = (v, nama) => {
  if (!Array.isArray(v) || v.length > 100) return g(`${nama} harus larik paling banyak 100 kode_bom`);
  if (!v.every(k => typeof k === "string" && RE_BOM.test(k))) return g(`${nama} berisi kode_bom tidak sah (contoh P-101)`);
  return {v: [...new Set(v)]};
};
export const hitungDebit = d => d.metode === "pelampung" ? r3(d.lebar_m * d.dalam_m * d.kecepatan_ms * 0.85 * 1000) : r3(d.volume_l / d.detik);

export function cekLapangan(jenis, b, kini) {
  const w = waktuOK(b.waktu, kini), p = petak(b.petak_id);
  if (jenis === "jejak") {
    if (!Array.isArray(b.titik) || b.titik.length < 2 || b.titik.length > 500) return g("titik harus larik 2 sampai 500 baris [lat, lon, ms]");
    if (!["jalan_kaki", "perahu", "kendaraan"].includes(b.moda)) return g("moda harus salah satu dari jalan_kaki, perahu, kendaraan");
    for (const t of b.titik) if (!Array.isArray(t) || t.length !== 3 || !lat(t[0]) || !lon(t[1]) || !ada(t[2], 1, 9e15)) return g("tiap titik harus [lat, lon, ms] di dalam Indonesia");
    const titik = b.titik.map(t => [r6(t[0]), r6(t[1]), Math.round(t[2])]);
    return {data: {titik, moda: b.moda}, waktu: waktuOK(titik.at(-1)[2], kini) ?? kini};
  }
  if (w === null) return g("waktu harus milidetik epoch");
  if (p === undefined) return g("petak_id 1 sampai 40 karakter huruf, angka, titik, garis, spasi");
  const cat = (maks) => { const c = teks(b.catatan, maks); return c; };
  if (jenis === "periksa") {
    if (typeof b.langkah !== "string" || !RE_LANGKAH.test(b.langkah)) return g("langkah harus 2 sampai 40 karakter [a-z0-9_]");
    return {data: {langkah: b.langkah, waktu: w, ...(p ? {petak_id: p} : {})}, waktu: w};
  }
  if (jenis === "tekanan") {
    if (!["pompa", "manifold", "lance"].includes(b.titik)) return g("titik harus salah satu dari pompa, manifold, lance");
    if (!ada(b.bar, 0, 25)) return g("bar harus angka 0 sampai 25");
    return {data: {titik: b.titik, bar: r3(b.bar), waktu: w, ...(p ? {petak_id: p} : {})}, waktu: w};
  }
  if (jenis === "selesai") {
    const k = kodeDaftar(b.alat_kembali ?? [], "alat_kembali"); if (k.galat) return k;
    const h = kodeDaftar(b.alat_hilang ?? [], "alat_hilang"); if (h.galat) return h;
    const c = cat(500); if (c === undefined) return g("catatan paling banyak 500 karakter");
    return {data: {waktu: w, alat_kembali: k.v, alat_hilang: h.v, ...(c ? {catatan: c} : {})}, waktu: w};
  }
  if (!lat(b.lat) || !lon(b.lon)) return g("lat dan lon harus di dalam Indonesia");
  const pos = {lat: r6(b.lat), lon: r6(b.lon)};
  if (jenis === "sos") {
    const m = teks(b.pesan, 200); if (m === undefined) return g("pesan paling banyak 200 karakter");
    return {data: {...pos, waktu: w, ...(m ? {pesan: m} : {})}, waktu: w};
  }
  if (jenis === "bor") {
    if (!ada(b.kedalaman_cm, 0, 1500)) return g("kedalaman_cm harus angka 0 sampai 1500");
    const c = cat(200); if (c === undefined) return g("catatan paling banyak 200 karakter");
    return {data: {...pos, kedalaman_cm: r3(b.kedalaman_cm), waktu: w, ...(p ? {petak_id: p} : {}), ...(c ? {catatan: c} : {})}, waktu: w};
  }
  if (jenis === "debit") {
    let d;
    if (b.metode === "pelampung") {
      if (!ada(b.lebar_m, 0.01, 500) || !ada(b.dalam_m, 0.01, 50) || !ada(b.kecepatan_ms, 0.01, 20)) return g("pelampung wajib lebar_m 0,01 sampai 500, dalam_m 0,01 sampai 50, kecepatan_ms 0,01 sampai 20");
      d = {metode: "pelampung", lebar_m: b.lebar_m, dalam_m: b.dalam_m, kecepatan_ms: b.kecepatan_ms};
    } else if (b.metode === "ember") {
      if (!ada(b.volume_l, 0.01, 100000) || !ada(b.detik, 0.5, 3600)) return g("ember wajib volume_l 0,01 sampai 100000 dan detik 0,5 sampai 3600");
      d = {metode: "ember", volume_l: b.volume_l, detik: b.detik};
    } else return g("metode harus pelampung atau ember");
    return {data: {...pos, ...d, debit_lps: hitungDebit(d), waktu: w}, waktu: w};
  }
  return g("jenis tidak dikenal");
}
