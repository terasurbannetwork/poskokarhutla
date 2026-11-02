/* Stempel foto (ALGORITMA §6, KEPUTUSAN D8): empat baris di pita gelap bawah foto JPEG. Hanya tampilan untuk manusia; kebenaran ada di kolom D1.
   Waktu = waktu server: jam HP + selisih (waktu_server nonce dikurangi jam HP saat nonce diterima). Fungsi murni di atas, kanvas di bawah. */

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const SISI_FOTO = 1280, KUALITAS_JPEG = 0.82;
const d2 = n => String(n).padStart(2, "0");

/* offset menit dari UTC (WIB +420) -> singkatan zona; zona lain tertulis UTC+h */
export function namaZona(offsetMenit) {
  if (offsetMenit === 420) return "WIB";
  if (offsetMenit === 480) return "WITA";
  if (offsetMenit === 540) return "WIT";
  const a = Math.abs(offsetMenit), m = a % 60;
  return `UTC${offsetMenit < 0 ? "-" : "+"}${Math.floor(a / 60)}${m ? ":" + d2(m) : ""}`;
}

/* "Sab, 01 Nov 2026 09:25:06 WIB" dari ms epoch (waktu sudah dikoreksi selisih server) dan offset menit perangkat */
export function teksWaktu(ms, offsetMenit) {
  const t = new Date(ms + offsetMenit * 60e3);
  return `${HARI[t.getUTCDay()]}, ${d2(t.getUTCDate())} ${BULAN[t.getUTCMonth()]} ${t.getUTCFullYear()} ${d2(t.getUTCHours())}:${d2(t.getUTCMinutes())}:${d2(t.getUTCSeconds())} ${namaZona(offsetMenit)}`;
}

/* jam saja untuk hasil absen: "07.42 WIB" */
export function teksJam(ms, offsetMenit) {
  const t = new Date(ms + offsetMenit * 60e3);
  return `${d2(t.getUTCHours())}.${d2(t.getUTCMinutes())} ${namaZona(offsetMenit)}`;
}

/* tanggal "YYYY-MM-DD" menurut offset perangkat */
export const tanggalLokal = (ms, offsetMenit) => new Date(ms + offsetMenit * 60e3).toISOString().slice(0, 10);

/* desimal koma Indonesia, 5 angka di belakang koma */
const des5 = n => n.toFixed(5).replace(".", ",");

/* -> empat baris. gps = {lat, lon, akurasi} atau null (belum dapat). Nama dan judul dipisah koma; baris kosong dibuang tanpa meninggalkan koma. */
export function barisStempel({waktuMs, selisihMs = 0, offsetMenit, gps, wilayah, nama, tugas}) {
  const lok = gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lon)
    ? `${des5(gps.lat)} ${des5(gps.lon)}${Number.isFinite(gps.akurasi) ? `  ±${Math.round(gps.akurasi)} m` : ""}` : "Lokasi belum didapat";
  const bersih = s => String(s ?? "").replace(/\s+/g, " ").trim();
  return [
    teksWaktu(waktuMs + selisihMs, offsetMenit),
    lok,
    bersih(wilayah) || "Wilayah belum diisi",
    [bersih(nama), bersih(tugas)].filter(Boolean).join(", "),
  ];
}

/* potong teks bertumpu ukuran ukur(teks) <= lebar, berakhir "..." bila terpotong. ukur dipisah supaya bisa diuji tanpa kanvas. */
export function potongLebar(teks, lebar, ukur) {
  if (ukur(teks) <= lebar) return teks;
  let a = 0, b = teks.length;
  while (a < b) { const m = (a + b + 1) >> 1; if (ukur(teks.slice(0, m) + "...") <= lebar) a = m; else b = m - 1; }
  return teks.slice(0, a) + "...";
}

/* gambar pita gelap + teks di kanvas (diubah di tempat); kanvas = salinan foto, bukan pratinjau video */
export function gambarStempel(kanvas, baris) {
  const c = kanvas.getContext("2d"), w = kanvas.width, h = kanvas.height;
  const px = Math.max(14, Math.round(Math.min(w, h) / 32)), gap = Math.round(px * 0.35), pad = Math.round(px * 0.7), tinggi = baris.length * (px + gap) + pad * 2 - gap;
  c.fillStyle = "rgba(10,18,36,0.72)"; c.fillRect(0, h - tinggi, w, tinggi);
  c.font = `600 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; c.textBaseline = "top"; c.fillStyle = "#fff";
  const ukur = t => c.measureText(t).width;
  baris.forEach((b, i) => c.fillText(potongLebar(b, w - pad * 2, ukur), pad, h - tinggi + pad + i * (px + gap)));
  return kanvas;
}

export const keJpeg = (kanvas, kualitas = KUALITAS_JPEG) => new Promise((ok, gagal) => kanvas.toBlob(b => b ? ok(b) : gagal(new Error("foto tidak bisa dibuat")), "image/jpeg", kualitas));

/* kanvas -> JPEG berstempel */
export async function fotoBerstempel(kanvas, baris) { return keJpeg(gambarStempel(kanvas, baris)); }
