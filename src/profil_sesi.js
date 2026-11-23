/* Sesi profil (kuki sesi_profil): pembaca tanpa SQL, dipisah dari instansi.js supaya lapor_ai.js tidak mengimpor instansi.js (impor melingkar), pola masuk_sesi.js.
   Token 64 heks di kuki; yang disimpan di D1 hanya sha256-nya (instansi_sesi_profil). Melempar bila tabel belum ada (pemanggil menangkap). */
import {sha} from "./worker.js";
import {pfSesiDari} from "./hak.js";
import {K} from "./profil_konst.js";

export const tokenProfil = req => new RegExp(`(?:^|;\\s*)${K.KUKI}=([0-9a-f]{64})(?:;|$)`).exec(req.headers.get("cookie") || "")?.[1] ?? null;
/* baris {profil_id, profil_nama, profil_jabatan, pin_wajib_ganti, akun_id, jenis, tingkat, wilayah, prov, kab, cakupan, username} atau null */
export async function sesiProfilDari(env, req, kini = Date.now()) {
  const t = tokenProfil(req); if (!t) return null;
  return pfSesiDari(env, await sha(t), kini);
}
/* satu Set-Cookie per Path: peramban hanya mengirim kuki ke Path-nya, jadi /api/lapor ikut menerima sesi profil tanpa membuka kuki akun ke sana */
export const kukiProfil = (nilai, umurDetik) => K.KUKI_PATH.map(p => `${K.KUKI}=${nilai}; Path=${p}; HttpOnly; Secure; SameSite=Lax; Max-Age=${umurDetik}`);
