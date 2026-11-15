/* SIPPA fase 2 (keputusan 61, SP-120 sampai SP-129): validasi murni butir form lapangan HP. Tanpa D1, tanpa permintaan; dipakai src/sippa.js (lapanganKirim, lapanganFoto).
   Kontrak medan = tiket (jangan ganti nama). Kembalian {data, waktu} (data = objek yang disimpan, hanya medan dikenal) atau {galat}.
   Panjang teks dihitung titik kode ([...s].length) = length() SQLite. Waktu perangkat di luar 30 hari ke belakang atau 10 menit ke depan diganti jam server (SOS tidak boleh hilang karena jam HP meleset). */
import {periksaFase2} from "../public/pipa/formulir.js";
const HARI = 864e5, MELESET_MS = 600000;
export const JENIS_LAP = ["periksa", "sos", "tekanan", "jejak", "selesai", "bor", "debit"];   // dikirim lewat /lapangan/kirim; 'foto' lewat /lapangan/foto
export const TAHAP_FOTO = ["tiba", "pompa", "gelar", "injeksi", "selesai"];
export const MAKS_DATA = 32768;
const RE_PETAK = /^[A-Za-z0-9._ -]{1,40}$/;
const ada = (v, a, z) => typeof v === "number" && Number.isFinite(v) && v >= a && v <= z;
export const lat = v => ada(v, -11.5, 6.5), lon = v => ada(v, 94.5, 141.5);   // kotak Indonesia, sama dengan MEDAN.log
const teks = (v, maks) => { if (v == null) return null; if (typeof v !== "string") return undefined; const t = v.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "").trim(); return [...t].length <= maks ? t : undefined; };   // kontrol dan bidi dibuang (pemalsuan tampilan)
const waktuOK = (v, kini) => ada(v, 1, 9e15) ? (v > kini - 30 * HARI && v <= kini + MELESET_MS ? Math.round(v) : kini) : null;
const r3 = x => Math.round(x * 1000) / 1000, r6 = x => Math.round(x * 1e6) / 1e6;
const g = galat => ({galat});
const petak = v => v == null ? null : typeof v === "string" && RE_PETAK.test(v) ? v : undefined;
export const hitungDebit = d => d.metode === "pelampung" ? r3(d.lebar_m * d.dalam_m * d.kecepatan_ms * 0.85 * 1000) : r3(d.volume_l / d.detik);

export function cekLapangan(jenis, b, kini) {
  const r = periksaFase2(jenis, b, {longgar: true});   // validasi = spek bersama (KP-18 b); di bawah hanya pembulatan dan bentuk simpan
  if (!r.ok) return g(r.galat.map(x => `${x.medan}: ${x.pesan}`).join("; "));
  const w = waktuOK(b.waktu, kini), p = petak(b.petak_id);
  if (jenis === "jejak") {
    const titik = b.titik.map(t => [r6(t[0]), r6(t[1]), Math.round(t[2])]);
    return {data: {titik, moda: b.moda}, waktu: waktuOK(titik.at(-1)[2], kini) ?? kini};
  }
  const pt = p ? {petak_id: p} : {};
  if (jenis === "periksa") return {data: {langkah: b.langkah, waktu: w, ...pt}, waktu: w};
  if (jenis === "tekanan") return {data: {titik: b.titik, bar: r3(b.bar), waktu: w, ...pt}, waktu: w};
  if (jenis === "selesai") {
    const c = teks(b.catatan, 500);
    return {data: {waktu: w, alat_kembali: [...new Set(b.alat_kembali ?? [])], alat_hilang: [...new Set(b.alat_hilang ?? [])], ...(c ? {catatan: c} : {})}, waktu: w};
  }
  const pos = {lat: r6(b.lat), lon: r6(b.lon)};
  if (jenis === "sos") { const m = teks(b.pesan, 200); return {data: {...pos, waktu: w, ...(m ? {pesan: m} : {})}, waktu: w}; }
  if (jenis === "bor") { const c = teks(b.catatan, 200); return {data: {...pos, kedalaman_cm: r3(b.kedalaman_cm), waktu: w, ...pt, ...(c ? {catatan: c} : {})}, waktu: w}; }
  const d = b.metode === "pelampung" ? {metode: "pelampung", lebar_m: b.lebar_m, dalam_m: b.dalam_m, kecepatan_ms: b.kecepatan_ms} : {metode: "ember", volume_l: b.volume_l, detik: b.detik};
  return {data: {...pos, ...d, debit_lps: hitungDebit(d), waktu: w}, waktu: w};
}
