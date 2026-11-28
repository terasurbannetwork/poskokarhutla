/* Foto publik turunan orang hilang (OH-05; paket data/kajian-bnpb/orang-hilang-publik/, D5, D29). Murni: tanpa D1, R2, atau jaringan.
   Klien (kanvas) sudah mengecilkan ke sisi panjang 800 px dan membuang metadata; Worker tidak mempercayainya dan memeriksa ulang dari byte:
   jenis dari byte awal (bukan header), sisi panjang paling 800 px, dan TOLAK (bukan bersihkan) bila ada blok EXIF atau XMP. */
export const MAKS_BYTE = 300 * 1024, MAKS_SISI = 800, MAKS_FOTO = 3;
const tag = (b, i, n = 4) => String.fromCharCode(...b.subarray(i, i + n));
const u16 = (b, i) => b[i] << 8 | b[i + 1], u32 = (b, i) => (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0, u32le = (b, i) => (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0;
const TOLAK = "Foto memuat metadata (EXIF atau XMP). Pilih ulang dari foto lewat tombol unggah di layar.";

const RUSAK = {galat: "Berkas JPEG rusak."};
/* semua segmen sampai EOI: marker tanpa panjang dilewati (FF01, FFD0..FFD7), semua APP selain APP0 JFIF dan COM ditolak (EXIF, XMP, ICC, IPTC, MPF), dan tidak boleh ada byte sesudah EOI */
function jpeg(b) {
  let i = 2, dim = null;
  while (i + 2 <= b.length) {
    if (b[i] !== 0xff) return RUSAK;
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    if (m === 0xd9) return !dim ? RUSAK : i + 2 === b.length ? dim : {galat: "Ada byte sesudah akhir foto."};
    if (m === 0xd8 || i + 4 > b.length) return RUSAK;
    const len = u16(b, i + 2); if (len < 2 || i + 2 + len > b.length) return RUSAK;
    if (m === 0xe0 ? !(len >= 16 && tag(b, i + 4, 5) === "JFIF\0") : (m >= 0xe1 && m <= 0xef) || m === 0xfe) return {galat: TOLAK};
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m) && len >= 8) dim ||= {jenis: "image/jpeg", h: u16(b, i + 5), w: u16(b, i + 7)};
    i += 2 + len;
    if (m === 0xda) while (i + 1 < b.length && !(b[i] === 0xff && b[i + 1] !== 0 && b[i + 1] !== 0xff && !(b[i + 1] >= 0xd0 && b[i + 1] <= 0xd7))) i++;   // data entropi
  }
  return RUSAK;
}
function png(b) {
  if (b.length < 33 || tag(b, 12) !== "IHDR") return {galat: "Berkas PNG rusak."};
  let i = 8; const r = {jenis: "image/png", w: u32(b, 16), h: u32(b, 20)};
  while (i + 8 <= b.length) { const t = tag(b, i + 4); if (["eXIf", "iTXt", "tEXt", "zTXt"].includes(t)) return {galat: TOLAK}; if (t === "IEND") return i + 12 === b.length ? r : {galat: "Ada byte sesudah akhir foto."}; i += 12 + u32(b, i); }
  return {galat: "Berkas PNG rusak."};
}
function webp(b) {
  const akhir = u32le(b, 4) + 8; let i = 12, r = null;
  if (akhir !== b.length) return {galat: "Ukuran berkas WebP tidak cocok."};
  while (i + 8 <= akhir) {
    const id = tag(b, i), n = u32le(b, i + 4), d = i + 8;
    if (id === "EXIF" || id === "XMP ") return {galat: TOLAK};
    if (id === "VP8X" && n >= 10) { if (b[d] & 0x0c) return {galat: TOLAK}; r ||= {jenis: "image/webp", w: 1 + (b[d + 4] | b[d + 5] << 8 | b[d + 6] << 16), h: 1 + (b[d + 7] | b[d + 8] << 8 | b[d + 9] << 16)}; }
    else if (id === "VP8 " && n >= 10) r ||= {jenis: "image/webp", w: (b[d + 6] | b[d + 7] << 8) & 0x3fff, h: (b[d + 8] | b[d + 9] << 8) & 0x3fff};
    else if (id === "VP8L" && n >= 5) { const v = u32le(b, d + 1); r ||= {jenis: "image/webp", w: 1 + (v & 0x3fff), h: 1 + (v >> 14 & 0x3fff)}; }
    i = d + n + (n & 1);
  }
  return r || {galat: "Berkas WebP rusak."};
}
/* b: Uint8Array. Keluaran {jenis, w, h} bila sah, selain itu {galat: pesan untuk pelapor} */
export function periksaFotoPublik(b) {
  if (!(b instanceof Uint8Array) || b.length < 24) return {galat: "Berkas bukan foto."};
  if (b.length > MAKS_BYTE) return {galat: `Foto lebih dari ${MAKS_BYTE / 1024} KB. Kecilkan dulu.`};
  const r = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? jpeg(b) : tag(b, 1, 3) === "PNG" && b[0] === 0x89 ? png(b) : tag(b, 0) === "RIFF" && tag(b, 8) === "WEBP" ? webp(b) : {galat: "Hanya foto JPEG, PNG, atau WebP."};
  if (r.galat) return r;
  if (!(r.w > 0 && r.h > 0)) return {galat: "Ukuran foto tidak terbaca."};
  return Math.max(r.w, r.h) > MAKS_SISI ? {galat: `Sisi terpanjang foto paling ${MAKS_SISI} px. Kecilkan dulu.`} : r;
}
