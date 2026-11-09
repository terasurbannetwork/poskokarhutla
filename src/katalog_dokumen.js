/* Katalog dokumen repo untuk halaman /bnpb/katalog-dokumen (public/bnpb/katalog-dokumen.*).
   Isi = indeks statis keluaran scripts/bnpb/katalog_dokumen.py, dibundel Worker. Terbuka tanpa login untuk sementara (permintaan pemilik 9 Nov 2026).
   Tanpa D1 dan tanpa tulisan, jadi tidak perlu batas laju. Bila nanti ditutup lagi: pakai modAtauStaf (bukan stafOK, akun gerbang AKUN_SITUS* tidak boleh lolos), di KEDUA rute.
   Penayang berkas: raw.githubusercontent.com membalas dengan CSP sandbox yang memblokir penampil PDF peramban, jadi Markdown dan PDF lewat sini.
   Hanya jalur yang tercatat di indeks yang diambil, jadi rute ini bukan proksi bebas. */
import {json} from "./worker.js";
import KATALOG from "../data/bnpb/katalog_dokumen.js";

const RAW = "https://raw.githubusercontent.com/terasurbannetwork/poskokarhutla/main/";
/* Semua text/plain, jalur dikirim terkode (k), tanpa content-disposition: pengelola unduhan (Internet Download Manager) merebut respons yang tampak seperti PDF atau biner.
   Layar membaca byte lewat fetch lalu menggambarnya dengan PDF.js (public/bnpb/katalog-dokumen-pdf.js). */
const JENIS = new Set(["md", "pdf"]), TIPE = "text/plain; charset=utf-8";
const jalurDari = k => { try { return new TextDecoder().decode(Uint8Array.from(atob(k.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))); } catch (e) { return ""; } };
const BALAS = {"content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "x-content-type-options": "nosniff"};
let badan, jalur;   // satu kali per isolate; isinya tidak berubah sampai terbit berikutnya

const semuaJalur = () => jalur ||= new Set(KATALOG.dok.flatMap(e => [...e.b, ...(e.v || []).flatMap(v => v.b)].map(b => b[1])));

async function berkas(url) {
  const p = jalurDari(url.searchParams.get("k") || "");
  if (!JENIS.has(p.split(".").pop().toLowerCase()) || !semuaJalur().has(p)) return json({ok: false, kode: "berkas_tidak_ada", pesan: "Berkas tidak ada di katalog atau tidak bisa dipratinjau."}, 404);
  let r;
  try { r = await fetch(RAW + p.split("/").map(encodeURIComponent).join("/"), {cf: {cacheTtl: 3600, cacheEverything: true}}); }
  catch (e) { console.error("katalog berkas", String(e?.message || e)); return json({ok: false, kode: "sumber_galat", pesan: "Berkas belum bisa diambil."}, 502); }
  if (!r.ok) { r.body?.cancel(); return json({ok: false, kode: "sumber_galat", pesan: "Berkas belum bisa diambil."}, 502); }
  return new Response(r.body, {headers: {"content-type": TIPE, "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer"}});
}

export const RUTE_KATALOG_DOKUMEN = {
  "GET /api/bnpb/katalog-dokumen": () => { badan ||= JSON.stringify({ok: true, ...KATALOG}); return new Response(badan, {headers: BALAS}); },
  "GET /api/bnpb/katalog-dokumen/berkas": (env, req, url) => berkas(url),
};
