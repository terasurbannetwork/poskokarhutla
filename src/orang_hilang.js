/* Orang hilang publik (paket data/kajian-bnpb/orang-hilang-publik/, K110-K116). OH-03: hanya pembaca sempit penyaring bencana (K116, D25).
   Rute publik lain, meja, dan foto menyusul di OH-05 sampai OH-11. Di belakang bendera OH_PUBLIK (bawaan mati = 404): tanpa bendera tidak ada yang tayang.
   Daftar kejadian untuk warga hanya jenis, kab, tanggal (dan id kejadian untuk memilih): tanpa nama kejadian, titik, sumber, atau data orang.
   Pencocok kejadian tidak ada yang baru: pembaca ini membaca Buku Besar (sk_kejadian_kab) lewat hak.js; kandidat disaring fungsi murni. */
import {json} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {JENIS_SAH} from "./siklus_kejadian.js";
import {NAMA_KAB4} from "./siklus_kab.js";
import * as H from "./hak.js";
import {kandidatKejadian, batasi, JENDELA_HARI} from "./orang_hilang_murni.js";

const JAM = 3600e3;
const HDR = {"cache-control": "private, no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer"};
const kirim = (kode, isi) => json(isi, kode, HDR);
const galat = (kode, pesan) => kirim(kode, {galat: pesan});

async function kejadianGet(env, req, url, kini) {
  if (env.OH_PUBLIK !== "1") return galat(404, "Halaman ini belum dibuka.");
  if (!env.IP_SALT) return galat(503, "server belum dikonfigurasi (IP_SALT)");
  const q = url.searchParams, ks = [...q.keys()], m = /^(\d{2})\.?(\d{2})$/.exec(q.get("kab") ?? "");
  if (ks.length !== 1 || ks[0] !== "kab" || q.getAll("kab").length !== 1 || !m || !Object.hasOwn(NAMA_KAB4, m[1] + m[2])) return galat(400, "Pilih kabupaten atau kota yang dikenal.");
  const lj = await lajuIP(env, req, "oh.kejadian", [[JAM, 60]], kini); if (lj) return lj;
  const kab4 = m[1] + m[2], jendela = batasi(env.OH_JENDELA_HARI, JENDELA_HARI);
  const baris = await H.ohKejadianKab(env, H.pelakuSistem, kab4);
  const kejadian = kandidatKejadian(kab4, kini, baris.map(r => ({id: r.id, jenis: r.jenis, kab4: [r.kab4], mulai: r.mulai, fase: r.fase})), JENIS_SAH, jendela)
    .map(k => ({id: k.id, jenis: k.jenis, kab4: k.kab4, kab: NAMA_KAB4[k.kab4], mulai: k.mulai}));   // kab tanpa kejadian: daftar kosong, bukan 0 atau galat
  return kirim(200, {kab4, kab: NAMA_KAB4[kab4], jendela_hari: jendela, kejadian});
}

export const RUTE_ORANG_HILANG = {
  "GET /api/lapor/hilang/kejadian": kejadianGet,
};
