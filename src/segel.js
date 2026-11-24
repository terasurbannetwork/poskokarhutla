/* segel.js: fungsi murni segel dokumen (paket data/kajian-bnpb/segel-dokumen/, SG-03, ALGORITMA bagian 1 dan 3). Fungsi murni di atas; rute di bawah. SQL ada di src/hak.js bagian Segel. */
import {json, gagal, sha, ipHash} from "./worker.js";
import {laju} from "./bnpb.js";
import {adaTabelSegel, segelCari, segelIsiLk, segelIsiLkb, pbDokById, pelakuPbBaca} from "./hak.js";
import {kunciBeku} from "./pb_dokumen.js";

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

/* ---------- SG-04: GET /api/verifikasi/<kode> (publik, DESAIN-TEKNIS 3, ALGORITMA 3-5, KEAMANAN-PRIVASI) ----------
   Batas laju dihitung sebelum kode dibaca, jadi kode salah format ikut terhitung. Kode tidak ada, salah format, dan tabel belum ada dijawab 404 yang sama (D12).
   Sidik dihitung ulang tiap pembukaan, tanpa cache (D15). Jawaban hanya data sampul: tanpa isi, rujukan, dasar, alasan cabut, atau sidik isi penuh. */

const MENIT = 60e3, BATAS = [[10 * MENIT, 60]];   // Q9 bawaan sementara
const PUBLIK = {"x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer"};
const tidakAda = () => json({galat: "Kode tidak ditemukan."}, 404, PUBLIK);

/* teks sumber beku sesuai ALGORITMA 2, atau null bila tidak ada. lk: <tanggal>#<ralat>; lkb: <bencana>/<tanggal>#<ralat>; pb: id pb_dokumen beku */
async function isiSumber(env, s) {
  const m = s.rujukan.match(/^(?:([a-z]+)\/)?(\d{4}-\d{2}-\d{2})#(\d+)$/);
  if (s.jenis === "lk") return m && !m[1] ? (await segelIsiLk(env, m[2], Number(m[3])))?.isi ?? null : null;
  if (s.jenis === "lkb") return m && m[1] ? (await segelIsiLkb(env, m[1], m[2], Number(m[3])))?.isi ?? null : null;
  if (s.jenis === "pb") {
    const d = await pbDokById(env, pelakuPbBaca, s.rujukan);
    const o = d?.status === "beku" ? await env.MEDIA?.get(kunciBeku(d, "json")) : null;
    return o ? o.text() : null;
  }
  return null;   // lj: fase 2 (Q1), belum ada pembacanya; segel lj tidak boleh disisipkan sebelum cabang ini ada (TIKET SG-13), atau publik melihat Tidak cocok
}

async function periksa(env, req, url, kini) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)", PUBLIK);
  const g = await laju(env, await ipHash(env, req), "segel.cari", BATAS, kini);
  if (g) return json({galat: "Terlalu banyak pemeriksaan, coba lagi beberapa menit lagi."}, 429, {...PUBLIK, "retry-after": g.headers.get("retry-after")});
  let mentah = "";
  try { mentah = decodeURIComponent(url.pathname.split("/")[3] ?? ""); } catch { /* % rusak = kode salah format */ }
  const kode = normalKode(mentah);
  if (!kode || !await adaTabelSegel(env)) return tidakAda();
  const s = await segelCari(env, kode);
  if (!s) return tidakAda();
  const isi = await isiSumber(env, s), cocok = isi != null && await sha(isi) === s.sidik;
  if (!cocok) console.warn(JSON.stringify({segel: "tidak_cocok", kode, jenis: s.jenis}));   // tercatat di log Worker (T8); tanpa isi
  const status = statusSegel({dicabut: s.dicabut, cocok, terbaru: s.terbaru});
  return json({kode, status, label: STATUS[status], judul: s.judul, wilayah: s.wilayah, periode: s.periode, versi: s.versi, penerbit: s.penerbit, terbit: s.terbit,
    sidik12: s.sidik.slice(0, 12), sidik_berkas: s.sidik_berkas, ...(s.dicabut != null ? {dicabut: s.dicabut} : {}), ...(s.terbaru ? {terbaru: s.terbaru} : {})}, 200, PUBLIK);
}

/* galat D1 atau R2 tetap dijawab generik dan bertanda noindex (D15); pesan asli hanya ke log */
async function verifikasi(env, req, url, kini) {
  try { return await periksa(env, req, url, kini); } catch (e) { console.error("verifikasi", e); return gagal(500, "galat server", PUBLIK); }
}

export const RUTE_SEGEL = {"GET /api/verifikasi/:kode": verifikasi};
