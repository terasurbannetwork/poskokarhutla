/* Kabar selamat dan orang dicari: fungsi murni tanpa DOM (KEPUTUSAN-LAPOR-AI K91, D126-D130; TIKET LA-81, LA-82).
   Dipakai selamat.js (beranda /lapor), s/s.js (halaman tautan), meja_cari.js (meja). Uji: tests/lapor/layar_selamat.test.mjs.
   Larangan D126 berlaku untuk teks fitur ini. */
export const LABEL_STATUS = {selamat: "Selamat", butuh_bantuan: "Selamat, butuh bantuan"};
export const STATUS_CARI = [["buka", "Buka"], ["ditemukan_selamat", "Ditemukan selamat"], ["ditemukan_meninggal", "Ditemukan meninggal"], ["ke_sar", "Diteruskan ke tim SAR"], ["tutup", "Ditutup"]];
export const labelCari = s => (STATUS_CARI.find(x => x[0] === s) || [, s])[1];
/* aksi yang ditawarkan di baris: semua status selain yang sedang dipakai; laporan yang sudah ditutup mendapat "Buka lagi" */
export const aksiCari = s => STATUS_CARI.filter(([k]) => k !== s).map(([k, t]) => [k, s !== "buka" && k === "buka" ? "Buka lagi" : t]);

export const TIDAK_BERLAKU = "Tautan ini tidak ditemukan atau sudah tidak berlaku.";
export const digit = t => String(t ?? "").replace(/\D/g, "");
export const nomorSah = t => { const d = digit(t); return d.length >= 9 && d.length <= 15 && /^(?:0|62)8/.test(d); };
export const nomor62 = t => { const d = digit(t); return d.startsWith("0") ? "62" + d.slice(1) : d; };
/* nama panggilan: singkat, tanpa nomor telepon (server menolak 6 angka berurutan) */
export const namaPanggilSah = t => { const s = String(t ?? "").trim(); return s.length >= 1 && s.length <= 40 && !/\d{6,}/.test(s); };
export const namaDicariSah = t => { const s = String(t ?? "").trim(); return s.length >= 2 && s.length <= 80; };
export const tokenSah = t => typeof t === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(t);

/* token dari jalur /lapor/s/<token>; berkas statis (index.html) memakai ?t= sebagai cadangan */
export function tokenDariJalur(pathname, search = "") {
  const bagian = String(pathname).split("/").filter(Boolean), akhir = bagian[bagian.length - 1] || "";
  const t = akhir === "index.html" || akhir === "s" ? new URLSearchParams(search).get("t") || "" : akhir;
  return tokenSah(t) ? t : "";
}

const WIB = "Asia/Jakarta";
const FMT_TGL = new Intl.DateTimeFormat("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: WIB});   // dibuat sekali, dipakai ulang tiap baris
const FMT_JAM = new Intl.DateTimeFormat("id-ID", {hour: "2-digit", minute: "2-digit", timeZone: WIB});
/* "24 November 2026, 14.05 WIB"; menerima ms epoch, detik epoch, atau teks tanggal ISO */
export function waktuWib(t) {
  if (t == null || t === "") return "";
  const n = typeof t === "number" ? (t < 1e11 ? t * 1000 : t) : Date.parse(t);
  if (!Number.isFinite(n)) return "";
  const d = new Date(n);
  return `${FMT_TGL.format(d)}, ${FMT_JAM.format(d)} WIB`;
}

export const tautanUtuh = (origin, tautan) => String(origin).replace(/\/+$/, "") + tautan;
export function pesanBagikan(nama, status, url) {
  return `${nama} mengabarkan: ${(LABEL_STATUS[status] || "Selamat").toLowerCase()}. Lihat kabarnya di ${url}`;
}
export const tautanWa = (origin, tautan, nama, status) => "https://wa.me/?text=" + encodeURIComponent(pesanBagikan(nama, status, tautanUtuh(origin, tautan)));

export const badanKabar = ({nama, status, kab}) => ({nama_panggil: String(nama).trim(), status, kab});
export function badanCari(f) {
  const o = {nama_dicari: String(f.nama || "").trim(), kab: f.kab};
  for (const [k, v] of [["ciri", f.ciri], ["lokasi_terakhir", f.lokasi], ["waktu_terakhir", f.waktu], ["hubungan", f.hubungan]]) { const s = String(v || "").trim(); if (s) o[k] = s; }
  if (String(f.nomorDicari || "").trim()) o.nomor_dicari = nomor62(f.nomorDicari);
  return o;
}
/* pesan galat bahasa polos; teks dari server dipakai bila ada */
export function teksGalat(status, galat, tunggu = 0) {
  if (status === 0) return "Tidak ada sinyal. Coba lagi saat sinyal kembali.";
  if (status === 401) return "Nomor Anda belum terbukti. Minta kode lewat WhatsApp dulu.";
  if (status === 429) return tunggu ? `Terlalu sering mencoba. Tunggu ${tunggu} detik, lalu coba lagi.` : "Terlalu sering mencoba. Tunggu sebentar, lalu coba lagi.";
  if (status === 503) return "Masuk dengan nomor WhatsApp belum aktif. Hubungi 117 bila butuh bantuan segera.";
  return galat || "Belum berhasil. Coba lagi.";
}

/* Kartu ajakan di beranda (Q68, bawaan sementara): hanya bila kab pengguna sudah diketahui dari lokasi yang pernah diberikan
   DAN rapor daerah (/api/lapor/rapor, status_darurat.json) memuat status keadaan darurat yang masih berlaku. Tanpa sinyal, tanpa kartu. */
export function daerahTersimpan(entri) {   // entri: pasangan [kunci, teks JSON] dari localStorage; kembalian: kueri daerah terakhir atau null
  for (const [k, v] of entri) {
    if (!String(k).startsWith("lapor-cache-")) continue;
    try { const q = JSON.parse(v)?.daerah?.q; if (q && typeof q === "object" && (q.kode || (q.lat != null && q.lon != null))) return q; } catch { /* abaikan */ }
  }
  return null;
}
export function ajakanDari(rapor, ditutup = "") {   // rapor: badan /api/lapor/rapor; ditutup: kab yang sudah ditutup di sesi ini
  const kab = String(rapor?.kab || "").trim();
  if (!kab || !Array.isArray(rapor?.darurat) || !rapor.darurat.length || kab === ditutup) return null;
  return {kab, teks: `Ada status keadaan darurat di ${kab}. Bila Anda berada di sana, kabari keluarga bahwa Anda selamat.`};
}
