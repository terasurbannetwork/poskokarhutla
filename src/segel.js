/* segel.js: fungsi murni segel dokumen (paket data/kajian-bnpb/segel-dokumen/, SG-03, ALGORITMA bagian 1 dan 3). Tanpa D1: SQL ada di src/hak.js bagian Segel. */

export const ABJAD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // Crockford base32: tanpa I, L, O, U
const POLA = /^[0-9A-HJKMNP-TV-Z]{10}$/;

/* 10 huruf acak (50 bit). 256 habis dibagi 32, jadi byte & 31 tidak berat sebelah. */
export const buatKode = (acak = b => crypto.getRandomValues(b)) => Array.from(acak(new Uint8Array(10)), b => ABJAD[b & 31]).join("");

/* masukan pengguna: huruf besar, buang spasi dan tanda hubung, O jadi 0, I dan L jadi 1. null bila hasilnya bukan kode sah. */
export const normalKode = s => {
  const k = String(s ?? "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return POLA.test(k) ? k : null;
};

/* tampilan di lembar cetak dan halaman: ABCDE-FGHJK */
export const tampilKode = k => `${k.slice(0, 5)}-${k.slice(5)}`;

/* rujukan dasar = rujukan tanpa bagian #<ralat> atau #<versi> */
export const dasarRujukan = r => String(r).split("#")[0];

/* urutan ALGORITMA 3: Dicabut menang atas Tidak cocok, lalu versi lebih baru, lalu Berlaku */
export const STATUS = {dicabut: "Dicabut", tidak_cocok: "Tidak cocok", lebih_baru: "Ada versi lebih baru", berlaku: "Berlaku"};
export const statusSegel = ({dicabut, cocok, terbaru}) =>
  dicabut != null ? "dicabut" : !cocok ? "tidak_cocok" : terbaru ? "lebih_baru" : "berlaku";
