/* Kejadian dari laporan warga (paket data/kajian-bnpb/lapor-kejadian/, tiket LK-02, ALGORITMA A3, keputusan D4, bawaan Q4).
   Fungsi murni tanpa D1: rute meja, halaman publik hari ini (LK-05), dan rekonsiliasi tiga sumber (lapor-ai LA-76) memakai satu penentu yang sama.

   Bentuk penanda pemeriksa (diputuskan di LK-02 dengan bukti kode):
   lapor_periksa.oleh dan lapor_tiket_riwayat.pelaku hanya teks cakupanMeja().pelaku ("BPBD Kabupaten X, Nama" atau nama staf BNPB
   yang bebas, src/lapor_meja_hak.js:16). Nama staf BNPB bisa berbunyi "BPBD ...", dan teks tidak memuat kode wilayah akun, jadi jenis
   dan wilayah pemeriksa TIDAK bisa diturunkan dengan pasti dari teks. Karena itu rute periksa menulis tabel samping lk_periksa_akun
   (migrasi 0169) dari cakupan sesi, dan pengecekan lama tanpa baris samping dihitung belum terverifikasi (aman: tidak pernah tayang). */
import {dalamWilayah} from "./lapor_meja_hak.js";
import {dasarPublik} from "./lapor_tampil.js";
import {NAMA_KAB4} from "./siklus_kab.js";

/* urutan "terakhir": waktu menurun, id menurun bila waktu sama (A3 butir 1) */
const lebihBaru = (a, b) => a.waktu !== b.waktu ? a.waktu > b.waktu : a.id > b.id;
export const terakhir = xs => (xs || []).reduce((m, x) => !m || lebihBaru(x, m) ? x : m, null);

/* pemeriksa BPBD wilayah: akun pemda (cakupanMeja jenis "bpbd") yang wilayahnya mencakup wilayah laporan. Staf BNPB, admin, dan
   peran pelapor yang hanya mengaku (bpbd_klaim) tidak pernah cukup (Q4, D19). */
export function pemeriksaBpbdWilayah(akun, wilayah) {
  if (!akun || akun.jenis !== "bpbd" || !/^\d{2}$/.test(String(akun.prov || ""))) return false;
  if (akun.tingkat !== "prov" && akun.tingkat !== "kab") return false;
  return dalamWilayah({jenis: "bpbd", tingkat: akun.tingkat, prov: akun.prov, kab: akun.kab || null, kabNama: akun.kabNama || akun.kab_nama || null}, wilayah);
}

/* laporan = {status, wilayah: {provKode, kabKode, kab}} dari kode wilayah laporan, bukan isian pelapor;
   periksa = [{id, hasil, waktu, akun: {jenis, tingkat, prov, kab, kabNama} | null}];
   versi = [{waktu}] baris lapor_versi; tarikan = [{id, aktif, waktu}] baris lk_tarik untuk kejadian laporannya.
   Benar hanya bila lima syarat A3 semuanya benar. */
export function syaratPublik(laporan, periksa, versi = [], tarikan = []) {   // lima syarat A3 satu per satu, untuk daftar centang meja (LK-07, DESIGN-SYSTEM 3)
  const p = terakhir(periksa), valid = !!p && p.hasil === "valid";
  return [
    {id: "valid", label: "Pengecekan terakhir Valid", ok: valid},                                                  // 1: sebagian dan tidak_valid salah
    {id: "bpbd", label: "Dicek BPBD wilayah laporan", ok: valid && pemeriksaBpbdWilayah(p.akun, laporan?.wilayah)},  // 2
    {id: "tiket", label: "Tiket bukan Tidak valid", ok: !!laporan && laporan.status !== "tidak_valid"},               // 3
    {id: "versi", label: "Tidak ada perubahan sesudah pengecekan", ok: !(versi || []).some(v => v.waktu > (p?.waktu ?? Infinity))},   // 4: tanpa pengecekan tidak ada "sesudah"; syarat 1 yang menahan
    {id: "tarik", label: "Tidak ditarik dari halaman publik", ok: !terakhir(tarikan)?.aktif}];                      // 5: tarikan terakhir aktif = ditarik
}
export const terverifikasiBpbd = (laporan, periksa, versi = [], tarikan = []) => syaratPublik(laporan, periksa, versi, tarikan).every(x => x.ok);

/* waktu verifikasi laporan = waktu pengecekan Valid terakhirnya; null bila belum terverifikasi */
export const waktuVerifikasi = (laporan, periksa, versi, tarikan) => terverifikasiBpbd(laporan, periksa, versi, tarikan) ? terakhir(periksa).waktu : null;

/* kejadian laporan: terverifikasi bila paling sedikit satu anggota terverifikasi; hanya anggota terverifikasi yang memberi angka (A3, A5).
   anggota = [{nomor, laporan, periksa, versi}]; tarikan berlaku untuk kejadian laporannya. */
export function kejadianTerverifikasi(anggota, tarikan = []) {
  const sah = (anggota || []).map(a => ({nomor: a.nomor, waktu: waktuVerifikasi(a.laporan, a.periksa, a.versi, tarikan)})).filter(a => a.waktu != null);
  return {terverifikasi: sah.length > 0, waktu: sah.length ? Math.max(...sah.map(a => a.waktu)) : null, anggota: sah.map(a => a.nomor)};
}

/* penanda samping untuk lk_periksa_akun dari cakupan sesi meja (cakupanMeja); hanya kolom wilayah, tanpa nama orang */
export const penandaPemeriksa = c => c?.jenis === "bpbd"
  ? {jenis: "bpbd", tingkat: c.tingkat, prov: c.prov, kab: c.kab || null, kab_nama: c.kabNama ? String(c.kabNama).slice(0, 100) : null}
  : {jenis: "bnpb", tingkat: null, prov: null, kab: null, kab_nama: null};

/* ---------- kartu publik halaman hari ini (LK-04, DESAIN-TEKNIS bagian 5, ALGORITMA A5) ----------
   Dibangun dari NOL dengan daftar putih, bukan baris D1 dikurangi kolom. Masukan:
   id = hash 10 karakter dari id laporan paling awal kejadian (dihitung pemanggil, pola alunBuat);
   anggota = HANYA anggota terverifikasi BPBD (A3), tiap {r: baris lapor_sesi (jenis, ringkas, wa, terkirim), verifikasi: {waktu, tingkat, kab_nama}}
   (kab_nama dari lk_periksa_akun pemeriksa);
   pusat = pusat desa dari register wilayah ({lat, lon}) atau null. Koordinat laporan tidak pernah dipakai. */
export const DAMPAK_PUBLIK = ["meninggal", "hilang", "luka", "mengungsi", "rumah"];
const JAM_MS = 3600e3, empat = x => Math.round(x * 1e4) / 1e4, angka = x => typeof x === "number" && Number.isFinite(x) && x >= 0;
export function kartuPublik({id, anggota, pusat}) {
  const sah = (anggota || []).filter(a => a?.r && angka(a.verifikasi?.waktu));
  if (!sah.length || !/^[0-9a-f]{10}$/.test(String(id || ""))) return null;
  const dasar = sah.map(a => { const k = a.r.ringkas ? JSON.parse(a.r.ringkas) : {}; return {...dasarPublik(a.r, k), k, wa: a.r.wa, v: a.verifikasi}; });
  const terbaru = dasar.reduce((m, x) => (x.k.waktuMs || 0) > (m.k.waktuMs || 0) ? x : m), nWarga = new Set(dasar.map(x => x.wa).filter(Boolean)).size;
  const mulai = dasar.map(x => x.k.waktuMs).filter(angka), w0 = mulai.length ? Math.min(...mulai) : null;
  const v = dasar.reduce((m, x) => x.v.waktu > m.v.waktu ? x : m).v, L = terbaru.lokasi;
  const dampak = {};   // Q6: rentang per isian antarlaporan terverifikasi; isian kosong (null) dilewati, tidak pernah jadi 0; tidak dijumlah
  for (const n of DAMPAK_PUBLIK) { const xs = dasar.map(x => x.k.dampakMeja?.[n]).filter(angka); if (xs.length) dampak[n] = {min: Math.min(...xs), max: Math.max(...xs)}; }
  return {id, jenis: terbaru.jenis, subjenis: terbaru.subjenis,
    waktu: w0 == null ? null : Math.round(w0 / JAM_MS) * JAM_MS,   // Q19 diperketat: selalu ke jam terdekat, supaya pelapor kedua tidak membuka menit asli pelapor pertama
    lokasi: {desa: L.desa, kec: L.kec, kab: L.kab, prov: L.prov},
    titik: pusat && Number.isFinite(pusat.lat) && Number.isFinite(pusat.lon) ? {lat: empat(pusat.lat), lon: empat(pusat.lon)} : null,
    ...(nWarga >= 2 ? {nWarga} : {}),
    verifikasi: {oleh: v.tingkat === "prov" ? (L.prov ? `BPBD Provinsi ${L.prov}` : "BPBD Provinsi") : (v.kab_nama || L.kab ? `BPBD ${v.kab_nama || L.kab}` : "BPBD"), waktu: v.waktu},
    dampak};
}

/* ---------- usulan ke Buku Besar (LK-09, ALGORITMA A6, D9, K87) ----------
   jenis tiket Lapor -> jenis kejadian Buku Besar (JENIS_SAH src/siklus_kejadian.js); satu sumber dengan ingest modul lapor_ai (src/kejadian_tautan.js).
   "lainnya" tidak punya padanan: tidak diusulkan, tidak dikirim. */
export const JENIS_BUKU_BESAR = Object.freeze({banjir: "banjir", longsor: "longsor", cuaca: "cuaca", kekeringan: "kekeringan", karhutla: "karhutla", gempa: "gempa",
  tsunami: "tsunami", abrasi: "gelombang", erupsi: "gunungapi", kebakaran_gedung: "kebakaran_permukiman"});
/* penentu murni, dipakai rute Worker dan mesin lokal. anggota = semua anggota kejadian laporan, urut waktu (anggota[0] = paling awal):
   [{nomor, jenis, laporan: {status, wilayah}, periksa, versi}]; lama = baris lk_usulan yang kejadian_laporan-nya salah satu anggota;
   ditolak = Set kode usulan yang ditolak staf Siklus (sk_kejadian_sumber). Tarikan halaman publik tidak menahan usulan (A8).
   Hasil {status, galat, ada?} atau {usulan: {kejadian_laporan, putaran, anggota, jenis, kab4}}. Tanpa data pribadi: hanya nomor tiket, jenis, kab. */
export function usulanDari(anggota, lama = [], ditolak = new Set()) {
  const xs = anggota || [], akhir = (lama || []).reduce((m, u) => !m || u.putaran > m.putaran ? u : m, null);
  if (akhir && !ditolak.has(akhir.kode)) return {status: 409, galat: "Kejadian ini sudah diusulkan ke Buku Besar.", ada: {kode: akhir.kode, putaran: akhir.putaran, waktu: akhir.waktu}};
  if (!xs.length || !kejadianTerverifikasi(xs).terverifikasi) return {status: 422, galat: "Belum ada laporan yang diverifikasi BPBD wilayahnya."};
  const jenis = new Set(xs.map(a => JENIS_BUKU_BESAR[a.jenis] ?? null));
  if (jenis.has(null) || jenis.size !== 1) return {status: 422, galat: "Jenis bencana laporan ini tidak ada padanannya di Buku Besar Kejadian."};
  const kab = new Set(xs.map(a => String(a.laporan?.wilayah?.kabKode ?? "").replace(".", "")));
  if (kab.size !== 1) return {status: 422, galat: "Laporan dalam kejadian ini berada di lebih dari satu kabupaten/kota. Pisahkan dulu."};
  const [kab4] = kab;
  if (!Object.hasOwn(NAMA_KAB4, kab4)) return {status: 422, galat: "Kabupaten/kota laporan tidak dikenal."};
  return {usulan: {kejadian_laporan: akhir?.kejadian_laporan ?? xs[0].nomor, putaran: (akhir?.putaran || 0) + 1, anggota: xs.map(a => a.nomor).slice(0, 200), jenis: [...jenis][0], kab4}};
}
