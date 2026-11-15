/* Sambungan antrean luring (antre.js) ke jaringan: kirim ulang absen yang tersimpan, isi simpanan nonce luring, ukur selisih jam server. */
import {buatToko, JUMLAH_NONCE_LURING} from "./antre.js";
import {api, kirimForm} from "./umum.js";

/* antrean bersama PbAntre (/inti/antre.js, skrip klasik di index.html); dibuat malas supaya modul ini bisa diimpor tanpa jaringan */
let kodeKini = null, _toko = null, _lama = null;
const toko = () => _toko ??= buatToko({
  kirimAbsen: async (data, foto) => { const r = await kirimForm("/api/petugas/absen", bentukForm({...data, luring: true}, foto), {kode: kodeKini}); return {s: r.status, j: r.data}; },
  header: () => ({"x-kode": kodeKini}),
});
/* IndexedDB bisa mati (mode privat lama): jangan jatuhkan layar. Butir basis lama dipindah sekali per muatan halaman. */
const aman = async (f, ganti) => { try { _lama ??= toko().pindahkanLama().catch(() => 0); await _lama; return await f(); } catch (e) { return ganti; } };

export const hitungAntre = () => aman(() => toko().jumlahAbsen(), 0);
export const selisihTerakhir = () => aman(() => toko().bacaSelisih(), 0);
export const nonceLuring = () => aman(() => toko().ambilNonce(Date.now()), null);
export const simpanAbsen = async item => { await aman(() => 0); await toko().tambahAbsen(item); };

/* badan multipart absen: data (JSON) + foto */
export function bentukForm(data, foto) {
  const f = new FormData();
  f.append("data", JSON.stringify(data));
  f.append("foto", foto, "absen.jpg");
  return f;
}

/* kirim semua yang tertunda; satu penerbangan sekaligus (dijaga saluran). -> {terkirim, ditolak, sisa} */
export async function kirimTertunda(kode) {
  kodeKini = kode;
  try { await aman(() => 0); return await toko().kirimTertunda(); }
  catch (e) { return {terkirim: [], ditolak: [], sisa: await hitungAntre()}; }
}

/* nonce daring 1 buah; ukur selisih jam = waktu_server dikurangi titik tengah t0..t1 (setengah perjalanan pulang-pergi) */
export async function mintaNonce(kode) {
  const t0 = Date.now(), r = await api("/api/petugas/nonce", {metode: "POST", kode, badan: {jumlah: 1}}), t1 = Date.now();
  if (!r.ok) return {ok: false, status: r.status, galat: r.data?.galat};
  const n = r.data.nonce?.[0], ws = Number(r.data.waktu_server);
  if (!n || !Number.isFinite(ws)) return {ok: false, status: 500};
  const selisih = ws - (t0 + t1) / 2;
  await aman(() => toko().simpanSelisih(selisih, t1));
  return {ok: true, nonce: n, selisih};
}

/* saat daring: lengkapi simpanan nonce luring sampai JUMLAH_NONCE_LURING. Gagal diam-diam (hanya persiapan). */
export async function isiNonceLuring(kode) {
  if (!navigator.onLine) return;
  await aman(async () => {
    const ada = await toko().jumlahNonce(Date.now()), perlu = JUMLAH_NONCE_LURING - ada;
    if (perlu <= 0) return;
    const r = await api("/api/petugas/nonce", {metode: "POST", kode, badan: {jumlah: perlu, luring: true}});
    if (r.ok && Array.isArray(r.data.nonce)) await toko().simpanNonce(r.data.nonce, Date.now());
  });
}
