/* Sambungan antrean luring (antre.js) ke jaringan: kirim ulang absen yang tersimpan, isi simpanan nonce luring, ukur selisih jam server. */
import {simpanIdb, kirimAntre, jumlahAntre, simpanNonce, jumlahNonce, ambilNonce, simpanSelisih, bacaSelisih, tambahAntre, JUMLAH_NONCE_LURING} from "./antre.js";
import {api, kirimForm} from "./umum.js";

export const toko = simpanIdb();
const aman = async (f, ganti) => { try { return await f(); } catch (e) { return ganti; } };   // IndexedDB bisa mati (mode privat lama): jangan jatuhkan layar

export const hitungAntre = () => aman(() => jumlahAntre(toko), 0);
export const selisihTerakhir = () => aman(() => bacaSelisih(toko), 0);
export const nonceLuring = () => aman(() => ambilNonce(toko, Date.now()), null);
export const simpanAbsen = item => tambahAntre(toko, item);

/* badan multipart absen: data (JSON) + foto */
export function bentukForm(data, foto) {
  const f = new FormData();
  f.append("data", JSON.stringify(data));
  f.append("foto", foto, "absen.jpg");
  return f;
}

/* kirim semua yang tertunda; satu penerbangan sekaligus. -> {terkirim, ditolak, sisa} */
let jalan = null;
export function kirimTertunda(kode) {
  return jalan ??= (async () => {
    try {
      return await kirimAntre(toko, async item => {
        const r = await kirimForm("/api/petugas/absen", bentukForm({...item.data, luring: true}, item.foto), {kode});
        return {ok: r.ok, status: r.status, galat: r.data?.galat};
      });
    } catch (e) { return {terkirim: [], ditolak: [], sisa: await hitungAntre()}; }
    finally { jalan = null; }
  })();
}

/* nonce daring 1 buah; ukur selisih jam = waktu_server dikurangi titik tengah t0..t1 (setengah perjalanan pulang-pergi) */
export async function mintaNonce(kode) {
  const t0 = Date.now(), r = await api("/api/petugas/nonce", {metode: "POST", kode, badan: {jumlah: 1}}), t1 = Date.now();
  if (!r.ok) return {ok: false, status: r.status, galat: r.data?.galat};
  const n = r.data.nonce?.[0], ws = Number(r.data.waktu_server);
  if (!n || !Number.isFinite(ws)) return {ok: false, status: 500};
  const selisih = ws - (t0 + t1) / 2;
  await aman(() => simpanSelisih(toko, selisih, t1));
  return {ok: true, nonce: n, selisih};
}

/* saat daring: lengkapi simpanan nonce luring sampai JUMLAH_NONCE_LURING. Gagal diam-diam (hanya persiapan). */
export async function isiNonceLuring(kode) {
  if (!navigator.onLine) return;
  await aman(async () => {
    const ada = await jumlahNonce(toko, Date.now()), perlu = JUMLAH_NONCE_LURING - ada;
    if (perlu <= 0) return;
    const r = await api("/api/petugas/nonce", {metode: "POST", kode, badan: {jumlah: perlu, luring: true}});
    if (r.ok && Array.isArray(r.data.nonce)) await simpanNonce(toko, r.data.nonce, Date.now());
  });
}
