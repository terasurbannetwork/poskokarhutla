/* Pembaca berkas media murni (tanpa env), dipakai src/foto.js (foto publik) dan Lapor Bencana (KEPUTUSAN-LAPOR-AI D77).
   Semua dari byte berkas, bukan dari nama atau Content-Type kiriman. */

/* jenis berkas dari byte awal */
export function jenisBerkas(b) {
  const s = (i, n) => String.fromCharCode(...b.subarray(i, i + n));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "image/webp";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  if (s(4, 4) === "ftyp") return s(8, 2) === "qt" ? "video/quicktime" : "video/mp4";
  return null;
}

// ponytail: pindai linear byte demi byte; video Lapor paling besar 30 MB, cukup cepat. Pakai pembaca kotak bila batasnya naik.
const cariKotak = (b, a, c, d, e) => { for (let i = 4; i < b.length - 32; i++) if (b[i] === a && b[i + 1] === c && b[i + 2] === d && b[i + 3] === e) return i; return -1; };

/* durasi MP4/MOV dari kotak mvhd (detik). null = tidak ketemu (WebM, berkas rusak): durasi kiriman peramban yang dipakai. */
export function durasiMP4(b) {
  const i = cariKotak(b, 0x6d, 0x76, 0x68, 0x64);   // "mvhd"
  if (i < 0) return null;
  const v = new DataView(b.buffer, b.byteOffset + i + 4), versi = v.getUint8(0);
  const skala = versi === 1 ? v.getUint32(20) : v.getUint32(12), durasi = versi === 1 ? Number(v.getBigUint64(24)) : v.getUint32(16);
  return skala ? durasi / skala : null;
}

/* waktu rekam dari mvhd creation_time (detik sejak 1904, UTC) -> ms. null bila nol atau tidak masuk akal (kamera tanpa jam). */
export function waktuMP4(b) {
  const i = cariKotak(b, 0x6d, 0x76, 0x68, 0x64);
  if (i < 0) return null;
  const v = new DataView(b.buffer, b.byteOffset + i + 4), versi = v.getUint8(0);
  const dtk = versi === 1 ? Number(v.getBigUint64(4)) : v.getUint32(4);
  const ms = (dtk - 2082844800) * 1000;
  return ms > Date.UTC(2015, 0, 1) && ms < Date.now() + 86400e3 ? ms : null;
}

/* lokasi rekam dari kotak udta "©xyz" (ISO 6709, mis. "-6.2088+106.8456/"), ditulis iPhone dan banyak ponsel Android. null bila tidak ada. */
export function lokasiMP4(b) {
  const i = cariKotak(b, 0xa9, 0x78, 0x79, 0x7a);   // "©xyz"
  if (i < 0) return null;
  const t = String.fromCharCode(...b.subarray(i + 4, i + 64)), m = /([+-]\d{1,2}(?:\.\d+)?)([+-]\d{1,3}(?:\.\d+)?)/.exec(t);
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat || lon) ? {lat, lon} : null;
}
