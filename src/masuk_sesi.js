/* Satu Pintu Masuk: pembaca sesi akun umum (cookie sesi_masuk), dipisah dari masuk.js supaya lapangan.js dan relawan.js bisa memakainya tanpa
   menarik modul akun lain (siklus impor: masuk.js -> kemitraan_akun.js -> kemitraan.js -> relawan.js). Tanpa SQL di sini (semua di hak.js). */
import {sha} from "./worker.js";
import {mkSesiDari} from "./hak.js";

export const tokenDari = req => /(?:^|;\s*)sesi_masuk=([0-9a-f]{64})(?:;|$)/.exec(req.headers.get("cookie") || "")?.[1] ?? null;
/* baris {kode_pada, id, wa, nama, prov, kab, setuju_pdp} atau null. Tanpa cookie: tanpa kueri. Melempar bila tabel mk_* belum ada (pemanggil menangkap). */
export async function sesiMasuk(env, req, kini = Date.now()) {
  const t = tokenDari(req); if (!t) return null;
  return mkSesiDari(env, await sha(t), kini);
}
