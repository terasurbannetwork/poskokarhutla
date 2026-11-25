/* laporan_berkala_hitung.js: modul ES murni Laporan Berkala (data/kajian-bnpb/laporan-berkala/ALGORITMA.md bagian 10, 11).
   Dipakai layar (public/laporan_berkala.js) dan nanti Worker (src/laporan_berkala.js, LB-07) lewat impor ../public/.
   Angka sudah dibulatkan hitung.py; di sini hanya format tampilan, kelengkapan sebelum Bekukan, dan beda versi.
   Bentuk isian staf (kunci yang dibaca kelengkapan dan halaman cetak; layar isian LB-06 menulis bentuk yang sama):
     pembuka, kota, tanggal, arahan, penutup: teks
     action: {bab1..bab5: {sudah, sedang, akan}}   catatan: {bab1..bab5: teks}   operasi: teks (Bab 2.4, Q15)
     dukungan: [{langkah, rincian, pj, waktu}]   temuan_ringkas, temuan_bab7: [{pil, judul, kalimat, sumber}]
     kegiatan: [{tanggal, kegiatan, lokasi, pelaksana}]   laporan_situasi: bilangan   foto: [{bab, id, ket, kredit, media, izin}] */

export const KEPALA_BNPB = "Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)";   // K3, dijaga uji L7
export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const ada = v => typeof v === "number" && Number.isFinite(v);

/* 183316 -> "183.316"; kosong (null/undefined) tidak pernah jadi 0 */
export function angka(v, des = 0, kosong = "tidak diketahui") {
  if (!ada(v)) return kosong;
  return v.toLocaleString("id-ID", {minimumFractionDigits: 0, maximumFractionDigits: des});
}
/* 68.5 -> "68,5%" */
export const persen = (v, kosong = "tidak diketahui") => ada(v) ? angka(v, 1) + "%" : kosong;
/* luas hektare dibulatkan: 854069.4 -> "854.069" */
export const luas = (v, kosong = "tidak diketahui") => angka(ada(v) ? Math.round(v) : v, 0, kosong);

/* "2026-10-06" -> "6 Oktober 2026"; "2026-10" -> "Oktober 2026" */
export function tanggal(s) {
  const m = /^(\d{4})-(\d\d)(?:-(\d\d))?/.exec(s || "");
  if (!m) return "";
  return (m[3] ? +m[3] + " " : "") + BULAN[+m[2] - 1] + " " + m[1];
}

/* pembanding {arah, kini, lalu, persen} -> "naik 300%", "turun 16,1%", "baru", "tetap 0", "tetap" */
export function banding(b) {
  if (!b || !ada(b.kini) || !ada(b.lalu)) return "tidak bisa dibandingkan";
  if (b.arah === "naik" || b.arah === "turun") return b.arah + " " + persen(b.persen);
  return b.arah || "tidak bisa dibandingkan";
}

/* ALGORITMA 10: daftar kekurangan; kosong = boleh dibekukan. Pesan menyebut bagian yang kurang. */
const BAB = [["bab1", "Bab 1 Gambaran umum", a => a.bab1?.alam?.kejadian],
  ["bab2", "Bab 2 Karhutla", a => a.bab1?.jenis?.karhutla?.kejadian],
  ["bab3", "Bab 3 Banjir dan longsor", a => (a.bab1?.jenis?.banjir?.kejadian || 0) + (a.bab1?.jenis?.longsor?.kejadian || 0)],
  ["bab4", "Bab 4 Cuaca ekstrem dan kekeringan", a => (a.bab1?.jenis?.cuaca_ekstrem?.kejadian || 0) + (a.bab1?.jenis?.kekeringan?.kejadian || 0)],
  ["bab5", "Bab 5 Geologi", a => (a.bab1?.jenis?.gempa?.kejadian || 0) + (a.bab1?.jenis?.erupsi?.kejadian || 0)]];
const isi = v => typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : v != null;
export function kelengkapan(angkaBerkas, isian = {}, periode = angkaBerkas?.periode || "bulanan") {
  const a = angkaBerkas || {}, s = isian || {}, kurang = [];
  if (a.sumber?.dibi?.status !== "ok") kurang.push("Sumber DIBI belum lengkap");
  if (!isi(s.pembuka)) kurang.push("Ringkasan Eksekutif: kalimat pembuka");
  if (periode !== "harian" && !isi(s.temuan_ringkas)) kurang.push("Ringkasan Eksekutif: temuan utama");
  for (const [k, nama, n] of BAB) {
    if (!(a[k] || k === "bab1") || !(n(a) > 0)) continue;
    const ap = s.action?.[k] || {};
    if (!isi(ap.sudah) && !isi(ap.sedang) && !isi(ap.akan)) kurang.push(nama + ": action plan");
  }
  if ((periode === "bulanan" || periode === "tahunan") && !isi(s.dukungan)) kurang.push("Bab 7.2: dukungan yang dimohon");
  const foto = Array.isArray(s.foto) ? s.foto : [];
  if (foto.some(f => !isi(f?.kredit))) kurang.push("Dokumentasi: foto tanpa kredit");
  if (foto.some(f => f?.media && !f?.izin)) kurang.push("Dokumentasi: foto media tanpa tanda izin");
  return kurang;
}

/* ALGORITMA 11: ratakan berkas angka jadi jalur -> nilai (bilangan dan teks pendek saja) */
export function ratakan(o, awal = "", keluar = {}) {
  if (Array.isArray(o)) o.forEach((x, i) => ratakan(x, `${awal}[${i}]`, keluar));
  else if (o && typeof o === "object") for (const [k, x] of Object.entries(o)) ratakan(x, awal ? `${awal}.${k}` : k, keluar);
  else if (ada(o) || (typeof o === "string" && o.length <= 80) || o === null) keluar[awal] = o;
  return keluar;
}
/* jalur yang berubah, urut perubahan relatif terbesar; jalur baru, hilang, atau teks berubah dianggap tak terhingga */
export function beda(lama, baru) {
  const a = ratakan(lama), b = ratakan(baru), hasil = [];
  for (const j of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (j === "dirakit" || a[j] === b[j]) continue;
    const rel = ada(a[j]) && ada(b[j]) ? (a[j] === 0 ? Infinity : Math.abs(b[j] - a[j]) / Math.abs(a[j])) : Infinity;
    hasil.push({jalur: j, lama: a[j] ?? null, baru: b[j] ?? null, relatif: rel});
  }
  return hasil.sort((x, y) => y.relatif - x.relatif || x.jalur.localeCompare(y.jalur));
}
