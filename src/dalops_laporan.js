/* Laporan Masuk Dalops (/bnpb/dalops, tab "Laporan Masuk"): tiap rekap WA Koordalops 07.00 diurai di Worker saat masuk (src/wa.js)
   dan ringkasannya disimpan di R2 MEDIA dalops/laporan.json (kontrak versi 1, dibaca layar). HANYA ringkasan kejadian:
   tanpa dampak, kondisi, status penetapan, pendampingan, judul/teks mentah, nama/nomor pengirim, dan tanpa angka luas karhutla dari WA
   (aturan pemilik: luas hanya dari sistem sendiri). Dummy: berkas R2 TERPISAH dalops/laporan_dummy.json, Super Admin saja. */
import "../public/laporan_urai.js";
import {json, gagal, bacaBody} from "./worker.js";
import {superOK} from "./posko.js";
import {PROV} from "./relawan.js";

const KUNCI = "dalops/laporan.json", KUNCI_DUMMY = "dalops/laporan_dummy.json", MAKS_HARI = 30, WIB = 7 * 3600e3, SIFAT = {"kejadian baru": "baru", "pengkinian data": "pengkinian"};
const MAKS_KEJADIAN = 200, MAKS_TEMPAT = 80;
const kosong = () => ({versi: 1, diperbarui: null, hari: []});
const jamWib = ms => new Date(ms + WIB).toISOString().slice(11, 16).replace(":", ".");

/* murni: teks rekap -> satu entri hari. Tidak melempar. */
export function hariDariRekap(teks, {diterima, prov = PROV, tanggal = ""} = {}) {
  const U = globalThis.LaporanUrai, h = U.uraiWa(teks, prov);
  const dasar = {tanggal: h.sampai || tanggal, diterima, jam: jamWib(diterima)};
  const alasan = h.menonjol == null ? "jumlah kejadian menonjol tidak terbaca" : !h.kejadian.length ? "tidak ada kejadian yang terurai" : "";
  if (alasan) return {...dasar, status: "gagal", laporan: null, menonjol: null, lewat: h.lewat.length, kejadian: [], alasan};
  return {...dasar, status: "ok", laporan: h.laporan_masuk, menonjol: h.menonjol, lewat: h.lewat.length,
    kejadian: h.kejadian.slice(0, MAKS_KEJADIAN).map(k => ({jenis: k.jenis, prov: k.prov, lokasi: String(k.lokasi ?? "").slice(0, MAKS_TEMPAT), tempat: String(k.tempat ?? "").slice(0, MAKS_TEMPAT), sifat: SIFAT[String(k.sifat).toLowerCase()] ?? "",
      status: U.statusDari(k.kondisi, /^prov/i.test(k.tempat))}))};
}

/* murni: satu entri per tanggal, terbaru dulu, paling banyak 30. Gagal tidak menimpa ok; selain itu diterima >= tersimpan menimpa. */
export function gabungHari(arsip, hari) {
  const lama = arsip.find(x => x.tanggal === hari.tanggal);
  const ganti = !lama || (hari.status === "ok" && lama.status === "gagal") || (!(hari.status === "gagal" && lama.status === "ok") && hari.diterima >= lama.diterima);
  const semua = ganti ? [...arsip.filter(x => x.tanggal !== hari.tanggal), hari] : arsip;
  return semua.sort((a, b) => b.tanggal < a.tanggal ? -1 : b.tanggal > a.tanggal ? 1 : 0).slice(0, MAKS_HARI);
}

/* murni: tanggal kalender sah dan tidak lewat besok WIB; tanggal masa depan akan mendorong hari nyata keluar dari arsip 30 hari */
export const tanggalWajar = (t, diterima) => /^\d{4}-\d{2}-\d{2}$/.test(t || "") && !Number.isNaN(Date.parse(t)) && new Date(t).toISOString().slice(0, 10) === t
  && t <= new Date(diterima + WIB + 864e5).toISOString().slice(0, 10);

/* ponytail: baca-ubah-tulis R2 tanpa kunci; rekap hanya dari nomor terdaftar, sekitar satu per hari. Pakai onlyIf etag bila pengirim bertambah. */
export async function catatRekap(env, {teks, tanggal, diterima}) {
  if (!env.MEDIA) return null;
  const hari = hariDariRekap(teks, {diterima, tanggal});
  if (!tanggalWajar(hari.tanggal, diterima)) return null;
  const arsip = (await (await env.MEDIA.get(KUNCI))?.json().catch(() => null)) ?? kosong();
  const baru = {versi: 1, diperbarui: Date.now(), hari: gabungHari(Array.isArray(arsip.hari) ? arsip.hari : [], hari)};
  await env.MEDIA.put(KUNCI, JSON.stringify(baru), {httpMetadata: {contentType: "application/json"}});
  return hari.status;
}

/* GET /api/dalops/laporan (gerbang staf/pemirsa ada di dalops.js `data`); ?dummy=1: Super Admin saja */
export async function bacaLaporan(env, req, url, data) {
  if (url.searchParams.get("dummy") === "1") {
    if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin");
    if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
    const d = (await (await env.MEDIA.get(KUNCI_DUMMY))?.json().catch(() => null)) ?? kosong();
    return json({...d, dummy: true}, 200, {"cache-control": "private, no-store"});
  }
  return data(env, req, "laporan");
}

/* dummy: 7 hari terakhir dari hari WIB saat diklik. Urut umur: A, B, C ada terus; D baru muncul kemarin; E hilang dari rekap 2 hari terakhir;
   F selesai lalu hilang; satu hari gagal; satu hari tanpa rekap. Tiap entri berid "dummy-<tanggal>". */
const K = {
  A: {jenis: "karhutla", prov: "14", lokasi: "", tempat: "Prov. Riau"}, B: {jenis: "banjir", prov: "13", lokasi: "Solok", tempat: "Kab. Solok"},
  C: {jenis: "karhutla", prov: "62", lokasi: "", tempat: "Prov. Kalimantan Tengah"}, D: {jenis: "longsor", prov: "32", lokasi: "Cianjur", tempat: "Kab. Cianjur"},
  E: {jenis: "banjir", prov: "35", lokasi: "Lamongan", tempat: "Kab. Lamongan"}, F: {jenis: "cuaca", prov: "33", lokasi: "Cilacap", tempat: "Kab. Cilacap"},
};
const ISI = [  // umur 0 (hari ini) .. 6
  [["A", "pengkinian", "berjalan"], ["B", "pengkinian", "belum"], ["C", "pengkinian", "berjalan"], ["D", "baru", "belum"]],
  [["A", "pengkinian", "berjalan"], ["B", "pengkinian", "belum"], ["C", "pengkinian", "belum"], ["D", "baru", "belum"]],
  "gagal", null,
  [["A", "pengkinian", "berjalan"], ["B", "baru", "belum"], ["C", "pengkinian", "belum"], ["E", "pengkinian", "selesai"], ["F", "pengkinian", "selesai"]],
  [["A", "pengkinian", "berjalan"], ["B", "baru", "belum"], ["C", "baru", "belum"], ["E", "baru", "belum"], ["F", "baru", "berjalan"]],
  [["A", "baru", "berjalan"], ["C", "baru", "belum"], ["E", "baru", "berjalan"]],
];
export function dummyHari(kini) {
  const hari = [];
  ISI.forEach((isi, umur) => {
    if (!isi) return;
    const tanggal = new Date(kini + WIB - umur * 864e5).toISOString().slice(0, 10), diterima = Date.parse(tanggal) + 42 * 60e3;   // 07.42 WIB = 00.42 UTC
    const dasar = {id: `dummy-${tanggal}`, tanggal, diterima, jam: "07.42"};
    hari.push(isi === "gagal" ? {...dasar, status: "gagal", laporan: null, menonjol: null, lewat: 0, kejadian: [], alasan: "dummy: rekap terpotong, jumlah kejadian menonjol tidak terbaca"}
      : {...dasar, status: "ok", laporan: isi.length + 6, menonjol: isi.length, lewat: 0, kejadian: isi.map(([k, sifat, status]) => ({...K[k], sifat, status}))});
  });
  return hari;
}
export async function dummyLaporan(env, req, kini) {   // pola dummyStaf (pusdalops_umum.js), ditulis lokal: mengimpornya membuat siklus modul dengan berantai.js
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const aksi = b.o.aksi; if (aksi !== "isi" && aksi !== "hapus") return gagal(400, "aksi harus isi/hapus");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  if (aksi === "hapus") { await env.MEDIA.delete(KUNCI_DUMMY); return json({ok: true}); }
  const hari = dummyHari(kini);
  await env.MEDIA.put(KUNCI_DUMMY, JSON.stringify({versi: 1, diperbarui: kini, hari}), {httpMetadata: {contentType: "application/json"}});
  return json({ok: true, hari: hari.length});
}
