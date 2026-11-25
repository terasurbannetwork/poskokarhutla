/* laporan_berkala_hitung.js: modul ES murni Laporan Berkala (data/kajian-bnpb/laporan-berkala/ALGORITMA.md bagian 10, 11).
   Dipakai layar (public/laporan_berkala.js) dan nanti Worker (src/laporan_berkala.js, LB-07) lewat impor ../public/.
   Angka sudah dibulatkan hitung.py; di sini hanya format tampilan, kelengkapan sebelum Bekukan, dan beda versi.
   Bentuk isian staf (kunci yang dibaca kelengkapan dan halaman cetak; layar isian LB-06 menulis bentuk yang sama):
     pembuka, kota, tanggal, arahan, penutup: teks
     action: {bab1..bab5: {sudah, sedang, akan}}   catatan: {bab1..bab5: teks}   operasi: teks (Bab 2.4, Q15)
     dukungan: [{langkah, rincian, pj, waktu}]   temuan_ringkas, temuan_bab7: [{pil, judul, kalimat, sumber}]
     kegiatan: [{tanggal, kegiatan, lokasi, pelaksana, tautan}]   laporan_situasi: bilangan   foto: [{bab, id, ket, kredit, media, izin}]
   Temuan dari usulan mesin membawa `kode` usulan (T1 sampai T7); temuan yang ditulis staf tanpa `kode`. */

export const KEPALA_BNPB = "Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)";   // K3, dijaga uji L7
export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const MAKS_TEMUAN = {temuan_ringkas: 4, temuan_bab7: 8};   // F-4, ALGORITMA 9 (Q18)

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
  for (const [k, nama] of [["temuan_ringkas", "Ringkasan Eksekutif"], ["temuan_bab7", "Bab 7.3"]]) {
    const t = Array.isArray(s[k]) ? s[k] : [];
    if (t.length > MAKS_TEMUAN[k]) kurang.push(`${nama}: paling banyak ${MAKS_TEMUAN[k]} temuan`);
    if (t.some(x => !isi(x?.kalimat) || !isi(x?.sumber))) kurang.push(`${nama}: temuan tanpa kalimat atau sumber`);
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

/* ---------------------------------------------------------------- kode periode (D11; fixture bersama tests/berkala/fixtures/kode_periode.json, sama dengan hitung.py) */
const hari = ms => new Date(ms).toISOString().slice(0, 10);
const utc = (y, m, d) => Date.UTC(y, m - 1, d);
const HARI = 864e5;
/* Senin minggu ISO pertama tahun y (minggu yang memuat 4 Januari) */
const seninW1 = y => { const j4 = utc(y, 1, 4); return j4 - ((new Date(j4).getUTCDay() + 6) % 7) * HARI; };
/* tanggal "YYYY-MM-DD" -> kode minggu ISO "YYYY-Www" */
export function mingguIso(t) {
  const d = Date.parse(t + "T00:00:00Z"), kamis = d + (3 - (new Date(d).getUTCDay() + 6) % 7) * HARI, y = new Date(kamis).getUTCFullYear();
  return `${y}-W${String(Math.floor((kamis - seninW1(y)) / (7 * HARI)) + 1).padStart(2, "0")}`;
}
/* [awal, akhir] sebagai "YYYY-MM-DD", atau null bila periode atau kode tidak sah */
export function rentang(periode, kode) {
  const k = String(kode ?? ""); let m;
  if (periode === "harian" && (m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k))) {
    const d = utc(+m[1], +m[2], +m[3]);
    return hari(d) === k ? [k, k] : null;
  }
  if (periode === "mingguan" && (m = /^(\d{4})-W(\d{2})$/.exec(k))) {
    const a = seninW1(+m[1]) + (+m[2] - 1) * 7 * HARI;
    return +m[2] >= 1 && mingguIso(hari(a)) === k ? [hari(a), hari(a + 6 * HARI)] : null;
  }
  if (periode === "bulanan" && (m = /^(\d{4})-(\d{2})$/.exec(k)) && +m[2] >= 1 && +m[2] <= 12)
    return [hari(utc(+m[1], +m[2], 1)), hari(utc(+m[1], +m[2] + 1, 1) - HARI)];
  if (periode === "tahunan" && /^\d{4}$/.test(k)) return [`${k}-01-01`, `${k}-12-31`];
  return null;
}
export const kodeSah = (periode, kode) => rentang(periode, kode) !== null;
/* periode sudah selesai bila akhirnya sebelum hariIni (H13: periode berjalan dan masa depan ditolak) */
export const selesai = (periode, kode, hariIni) => { const r = rentang(periode, kode); return !!r && r[1] < hariIni; };
/* kode periode lengkap terakhir sebelum hariIni ("YYYY-MM-DD", tanggal WIB) */
export function kodeTerakhir(periode, hariIni) {
  const d = Date.parse(hariIni + "T00:00:00Z");
  if (periode === "harian") return hari(d - HARI);
  if (periode === "mingguan") return mingguIso(hari(d - 7 * HARI));
  if (periode === "bulanan") return hari(utc(+hariIni.slice(0, 4), +hariIni.slice(5, 7), 1) - HARI).slice(0, 7);
  if (periode === "tahunan") return String(+hariIni.slice(0, 4) - 1);
  return null;
}
export const NAMA_PERIODE = {harian: "Laporan Harian", mingguan: "Laporan Mingguan", bulanan: "Laporan Bulanan", tahunan: "Laporan Tahunan"};
/* "Laporan Bulanan Oktober 2026", "Laporan Mingguan 2026-W46 (9 sampai 15 November 2026)"; ALUR 3: periode dan kode selalu disebut */
export function judulPeriode(periode, kode) {
  const r = rentang(periode, kode); if (!r) return "";
  const nama = NAMA_PERIODE[periode];
  if (periode === "mingguan") return `${nama} ${kode} (${tanggal(r[0])} sampai ${tanggal(r[1])})`;
  return `${nama} ${periode === "tahunan" ? kode : tanggal(kode)}`;
}
