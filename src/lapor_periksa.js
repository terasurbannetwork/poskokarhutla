/* Pengecekan lapangan dan jenis tindakan di meja Lapor Bencana (KEPUTUSAN-LAPOR-AI K69-K70, D108-D113). Fungsi murni: dipakai server lokal
   sekarang dan rute Worker /api/lapor/meja/<nomor>/periksa|tindakan nanti (LA-73).
   Pengecekan tidak pernah menimpa isian pelapor: revisi angka menjadi versi baru berasal "petugas" dengan kutipan catatan pengecek (D110). */

import {berlakuSesi} from "./lapor_spek.js";

export const HASIL_PERIKSA = {valid: "Valid", sebagian: "Sebagian benar", tidak_valid: "Tidak valid"};

/* angka yang boleh direvisi petugas (D110): korban, pengungsi, rumah, fasilitas. Jenis, lokasi, dan waktu kejadian tidak (D37 induk). */
export const ISIAN_REVISI = ["meninggal", "hilang", "luka", "mengungsi_jiwa", "rumah_berat", "rumah_sedang", "rumah_ringan", "rumah_terendam",
  "fasilitas_sekolah", "fasilitas_kesehatan", "fasilitas_ibadah", "jalan_jembatan"];

/* jenis laporan ke id registri public/bencana.json (sama dengan JENIS di public/lapor/meja.js) */
export const JENIS_REGISTRI = {banjir: "banjir", longsor: "longsor", cuaca: "cuaca", karhutla: "karhutla", gempa: "gempa", tsunami: "pesisir",
  erupsi: "gunungapi", abrasi: "pesisir", kekeringan: "kekeringan"};

/* daftar tindakan per jenis dari registri (katalog logbook Pusdalops, AGENTS 2.28; D111): [{kode, label}]. Jenis tanpa katalog = [] (hanya isian lain). */
export function tindakanUntuk(jenisId, registri) {
  const id = JENIS_REGISTRI[jenisId], b = (registri?.bencana || []).find(x => x.id === id), kode = b?.kemampuan?.tindakan || [];
  return kode.filter(k => registri.tindakan?.[k]).map(k => ({kode: k, label: registri.tindakan[k]}));
}

const bersih = (t, n) => String(t ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

/* tindakan kiriman staf: kode harus dari katalog jenis itu; "lain" teks bebas paling banyak 120 huruf. Hasil {tindakan: [{kode, label}]} atau {galat}. */
export function sahkanTindakan(body, jenisId, registri) {
  const boleh = new Map(tindakanUntuk(jenisId, registri).map(x => [x.kode, x.label]));
  const kode = [...new Set(Array.isArray(body?.tindakan) ? body.tindakan.filter(k => typeof k === "string") : [])];
  if (kode.some(k => !boleh.has(k))) return {galat: "Jenis tindakan tidak dikenal untuk jenis bencana ini."};
  const lain = bersih(body?.tindakanLain, 120);
  const tindakan = [...kode.map(k => ({kode: k, label: boleh.get(k)})), ...(lain.length >= 3 ? [{kode: "lain", label: lain}] : [])];
  return tindakan.length ? {tindakan} : {galat: "Pilih minimal satu tindakan yang dilakukan, atau tulis tindakan lain."};
}

/* pengecekan: {hasil, catatan, ubah: {nama: angka}}. Catatan wajib (minimal 5 huruf) karena jadi kutipan revisi dan alasan tidak valid.
   ubah hanya ISIAN_REVISI yang berlaku untuk laporan itu (berlaku = daftar nama isian sesi), bilangan bulat 0..1.000.000. */
export function sahkanPeriksa(body, berlaku) {
  const hasil = body?.hasil, catatan = bersih(body?.catatan, 1000);
  if (!HASIL_PERIKSA[hasil]) return {galat: "Pilih hasil pengecekan: Valid, Sebagian benar, atau Tidak valid."};
  if (catatan.length < 5) return {galat: "Tulis catatan pengecekan (apa yang dilihat di lapangan)."};
  const ubah = {};
  for (const [k, v] of Object.entries(body?.ubah && typeof body.ubah === "object" ? body.ubah : {})) {
    if (!ISIAN_REVISI.includes(k) || !berlaku.has(k)) return {galat: "Isian itu tidak bisa direvisi di sini."};
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 1e6) return {galat: "Angka revisi harus bilangan bulat 0 atau lebih."};
    ubah[k] = n;
  }
  if (hasil === "valid" && Object.keys(ubah).length) return {galat: "Ada angka yang direvisi: pilih Sebagian benar."};
  if (hasil === "tidak_valid" && Object.keys(ubah).length) return {galat: "Laporan tidak valid tidak direvisi."};
  return {hasil, catatan, ubah};
}

/* revisi menjadi isian baru (salinan): nilai beda saja yang diganti, asal "petugas" berkutipan catatan; 0 = nihil (tidak ada), bukan kosong.
   Hasil {isian, perubahan: [{nama, dari, ke}]}; perubahan kosong = tidak ada versi baru. */
export function terapkanRevisi(isian, ubah, {pelaku, catatan, waktu}) {
  const baru = structuredClone(isian), perubahan = [];
  for (const [k, n] of Object.entries(ubah)) {
    const x = isian[k], lama = !x || x.belum ? null : x.nihil ? 0 : x.nilai;
    if (lama === n) continue;
    baru[k] = {...(n === 0 ? {nilai: 0, nihil: true} : {nilai: n}), asal: {sumber: "petugas", waktu, pelaku, kutipan: `Koreksi lapangan ${pelaku}: ${catatan}`.slice(0, 300)}};
    perubahan.push({nama: k, dari: lama, ke: n});
  }
  return {isian: baru, perubahan};
}

/* angka yang bisa direvisi di rincian meja: nilai sekarang (null = belum didata, 0 = tidak ada) dan tanda sudah dikoreksi petugas */
export const revisiTampil = s => berlakuSesi(s).filter(i => ISIAN_REVISI.includes(i.nama)).map(i => { const x = s.isian[i.nama];
  return {nama: i.nama, label: i.label, nilai: !x || x.belum ? null : x.nihil ? 0 : x.nilai, petugas: x?.asal?.sumber === "petugas"}; });

/* status tujuan dari hasil: tidak_valid memindah tiket (dari status yang boleh, PINDAH); valid dan sebagian tidak mengubah status (D109). */
export const statusDariHasil = (hasil, dari, PINDAH) => hasil === "tidak_valid" && PINDAH[dari]?.includes("tidak_valid") ? "tidak_valid" : null;

export function demo() {
  const reg = {tindakan: {evakuasi: "Evakuasi warga", logistik: "Distribusi logistik"}, bencana: [{id: "banjir", kemampuan: {tindakan: ["evakuasi", "logistik", "tak_ada"]}}]};
  console.assert(tindakanUntuk("banjir", reg).length === 2 && tindakanUntuk("lainnya", reg).length === 0);
  console.assert(sahkanTindakan({tindakan: ["evakuasi"]}, "banjir", reg).tindakan[0].label === "Evakuasi warga");
  console.assert(sahkanTindakan({tindakan: ["sar"]}, "banjir", reg).galat && sahkanTindakan({}, "banjir", reg).galat);
  console.assert(sahkanTindakan({tindakanLain: "Sedot sumur"}, "lainnya", reg).tindakan[0].kode === "lain");
  const B = new Set(["meninggal", "rumah_berat"]);
  console.assert(sahkanPeriksa({hasil: "sebagian", catatan: "dicek ke RT", ubah: {meninggal: 2}}, B).ubah.meninggal === 2);
  console.assert(sahkanPeriksa({hasil: "valid", catatan: "dicek ke RT", ubah: {meninggal: 2}}, B).galat);
  console.assert(sahkanPeriksa({hasil: "sebagian", catatan: "dicek", ubah: {luka: 1}}, B).galat);
  console.assert(sahkanPeriksa({hasil: "sebagian", catatan: "dicek ke RT", ubah: {meninggal: -1}}, B).galat);
  const r = terapkanRevisi({meninggal: {nilai: 3}, rumah_berat: {nilai: 5}}, {meninggal: 2, rumah_berat: 5}, {pelaku: "BPBD X", catatan: "cek", waktu: 1});
  console.assert(r.perubahan.length === 1 && r.isian.meninggal.nilai === 2 && r.isian.meninggal.asal.sumber === "petugas");
  console.assert(terapkanRevisi({}, {hilang: 0}, {pelaku: "p", catatan: "c", waktu: 1}).isian.hilang.nihil === true);
  console.assert(statusDariHasil("tidak_valid", "ditindaklanjuti", {ditindaklanjuti: ["selesai", "tidak_valid"]}) === "tidak_valid");
  console.assert(statusDariHasil("valid", "dilihat", {}) === null);
}
