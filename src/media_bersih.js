/* Pembersih metadata berkas media (foto dan video) untuk Akun Instansi. Versi KETAT, terpisah dari buangExif di posko.js:
   - JPEG: hanya segmen yang perlu untuk memecah gambar (SOF, DHT, DQT, DRI, DAC, SOS, APP0 JFIF, APP14 Adobe) yang dipertahankan. APP1 (EXIF/XMP), APP2 (ICC/MPF), APP13 (IPTC), komentar, dan segmen asing dibuang;
     data sesudah EOI dipotong; struktur tak biasa (tanpa SOF/SOS/EOI, panjang segmen melewati berkas, byte liar di antara segmen) = ditolak (null).
   - WebP: hanya chunk gambar (VP8, VP8L, VP8X, ALPH, ANIM, ANMF, ICCP) yang dipertahankan; chunk EXIF dan XMP dibuang dan bendera VP8X-nya dimatikan; ukuran RIFF dihitung ulang.
   - MP4/MOV: atom udta, meta (termasuk keys/ilst dan ©xyz lokasi), dan uuid di tingkat atas diganti atom `free` berukuran SAMA berisi nol, jadi offset stco/co64 tidak bergeser dan video tetap bisa diputar.
   - WebM: tidak dibersihkan (keterbatasan; Tags EBML tidak diurai).
   Kembalian: Uint8Array baru, atau null bila struktur tidak sah. */
const tag = (b, i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
const u32le = (b, i) => (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0;
const u32be = (b, i) => (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
const gabung = bagian => { const r = new Uint8Array(bagian.reduce((a, x) => a + x.length, 0)); let p = 0; for (const x of bagian) { r.set(x, p); p += x.length; } return r; };

export function bersihJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const out = [b.subarray(0, 2)];
  let i = 2, sof = false, sos = false;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;                   // byte liar di antara segmen
    while (i + 1 < b.length && b[i + 1] === 0xff) i++;   // byte isi 0xFF diizinkan, tidak disalin
    if (i + 1 >= b.length) return null;
    const m = b[i + 1];
    if (m === 0xd9) { if (!sof || !sos) return null; out.push(Uint8Array.of(0xff, 0xd9)); return gabung(out); }   // EOI: sisanya dipotong
    if (m === 0x00 || m === 0x01 || (m >= 0xd0 && m <= 0xd8)) return null;
    if (i + 4 > b.length) return null;
    const len = b[i + 2] << 8 | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return null;
    const seg = b.subarray(i, i + 2 + len);
    const isSof = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    const jfif = m === 0xe0 && len >= 7 && tag(b, i + 4) === "JFIF" && b[i + 8] === 0;
    const adobe = m === 0xee && len >= 7 && tag(b, i + 4) === "Adob";
    if (isSof || m === 0xc4 || m === 0xcc || m === 0xdb || m === 0xdd || m === 0xda || jfif || adobe) out.push(seg);
    if (isSof) sof = true;
    i += 2 + len;
    if (m === 0xda) {
      sos = true; let j = i;   // data entropi: salin sampai penanda berikutnya yang bukan RSTn atau byte isian 0xFF00
      for (; j + 1 < b.length; j++) if (b[j] === 0xff && b[j + 1] !== 0x00 && b[j + 1] !== 0xff && !(b[j + 1] >= 0xd0 && b[j + 1] <= 0xd7)) break;
      if (j + 1 >= b.length) return null;             // tanpa EOI
      out.push(b.subarray(i, j)); i = j;
    }
  }
  return null;
}

export function bersihWebp(b) {
  if (b.length < 20 || tag(b, 0) !== "RIFF" || tag(b, 8) !== "WEBP") return null;
  const akhir = u32le(b, 4) + 8;
  if (akhir > b.length || akhir < 20) return null;
  const IZIN = ["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF", "ICCP"], bagian = []; let i = 12, gambar = false;
  while (i < akhir) {
    if (i + 8 > akhir) return null;
    const id = tag(b, i), ukuran = u32le(b, i + 4), isi = ukuran + (ukuran & 1);
    if (i + 8 + isi > akhir) return null;
    if (IZIN.includes(id)) {
      const c = b.slice(i, i + 8 + isi);
      if (id === "VP8X") { if (ukuran < 10) return null; c[8] &= ~0x0c; }   // matikan bendera EXIF dan XMP
      if (id === "VP8 " || id === "VP8L" || id === "ANMF") gambar = true;
      bagian.push(c);
    }
    i += 8 + isi;
  }
  if (!gambar) return null;
  const tubuh = gabung(bagian), r = new Uint8Array(12 + tubuh.length);
  r.set(b.subarray(0, 12)); r.set(tubuh, 12);
  const n = r.length - 8; r[4] = n & 255; r[5] = n >> 8 & 255; r[6] = n >> 16 & 255; r[7] = n >> 24 & 255;
  return r;
}

export function bersihMp4(b) {
  if (b.length < 16 || tag(b, 4) !== "ftyp") return null;
  const out = new Uint8Array(b), WADAH = ["moov", "trak", "mdia"];
  const jalan = (a, z, dalam) => {
    let i = a;
    while (i < z) {
      if (i + 8 > z) return false;
      let ukuran = u32be(b, i), kepala = 8; const tipe = tag(b, i + 4);
      if (ukuran === 1) { if (i + 16 > z || u32be(b, i + 8) !== 0) return false; ukuran = u32be(b, i + 12); kepala = 16; }
      else if (ukuran === 0) ukuran = z - i;
      if (ukuran < kepala || i + ukuran > z) return false;
      if (tipe === "udta" || tipe === "meta" || (dalam === 0 && tipe === "uuid")) { out.fill(0, i + kepala, i + ukuran); out.set([0x66, 0x72, 0x65, 0x65], i + 4); }   // 'free'
      else if (WADAH.includes(tipe) && dalam < 4 && !jalan(i + kepala, i + ukuran, dalam + 1)) return false;
      i += ukuran;
    }
    return true;
  };
  return jalan(0, b.length, 0) ? out : null;
}

/* mime hasil jenisBerkas -> berkas bersih, atau null bila struktur tidak sah */
export function bersihMedia(mime, b) {
  if (mime === "image/jpeg") return bersihJpeg(b);
  if (mime === "image/webp") return bersihWebp(b);
  if (mime === "video/mp4" || mime === "video/quicktime") return bersihMp4(b);
  return b;   // video/webm: apa adanya
}
