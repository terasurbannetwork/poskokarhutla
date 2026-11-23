/* Bantuan uji akun BPBD dengan profil PIC (paket data/kajian-bnpb/profil-bpbd/, RENCANA-UJI): menyiapkan profil aktif ber-PIN dan sesi profil lewat sisipan D1
   langsung, tanpa melewati alur kirim dan setuju (PF-04). Dipakai uji profil dan uji lama yang masuk sebagai akun pemda (kini wajib sesi profil). */
import {createHash, createHmac, randomBytes} from "node:crypto";

export const PROFIL_KUNCI = "kunci-profil-uji-0123456789abcdefghijklmnop";   // 43 karakter
export const sha256 = s => createHash("sha256").update(s).digest("hex");
export const PEMDA = ["pemprov", "pemkab", "pemkot"];
const acak = n => randomBytes(n).toString("hex");
/* PIN seperti yang disimpan Worker: HMAC-SHA256(kunci, "pin|profil|garam|pin") */
export const hmacPin = (kunci, profilId, garam, pin) => createHmac("sha256", kunci).update(`pin|${profilId}|${garam}|${pin}`).digest("hex");

/* satu profil aktif ber-PIN untuk akun (dipakai ulang bila sudah ada profil aktif), lalu satu sesi profil baru. Kembalian {id, pin, token, cookie, nama} */
export async function profilAktif(DB, akunId, {kunci = PROFIL_KUNCI, pin = "482915", wajibGanti = 0, nama = "Rina Putri", jabatan = "Kepala Bidang", baru = false} = {}) {
  let p = baru ? null : await DB.prepare("SELECT id, nama FROM instansi_profil WHERE akun_id = ? AND status = 'aktif' ORDER BY dibuat LIMIT 1").bind(akunId).first();
  const kini = Date.now();
  if (!p) {
    const id = acak(8), garam = acak(8), n = String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
    await DB.prepare(`INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, foto, pin_garam, pin_sha, pin_wajib_ganti, status, dibuat, diubah)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'aktif', ?, ?)`).bind(id, akunId, nama, jabatan, "1980" + n + "01", `pic${n}@bpbd.go.id`, "62812" + n.slice(0, 7), garam, hmacPin(kunci, id, garam, pin), wajibGanti, kini, kini).run();
    p = {id, nama};
  }
  const token = acak(32);
  await DB.prepare("INSERT INTO instansi_sesi_profil (sesi_sha, profil_id, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?, ?)").bind(sha256(token), p.id, akunId, kini, kini + 12 * 36e5).run();
  return {id: p.id, pin, token, nama: p.nama, cookie: `sesi_profil=${token}`};
}
/* tambahkan kuki sesi profil ke kuki akun bila akun itu pemda (jenis dibaca dari D1); jenis lain tidak berubah */
export async function denganProfil(DB, akunId, kuki) {
  const a = await DB.prepare("SELECT jenis FROM instansi_akun WHERE id = ?").bind(akunId).first();
  if (!a || !PEMDA.includes(a.jenis)) return kuki;
  const p = await profilAktif(DB, akunId);
  return {...kuki, cookie: [kuki.cookie, p.cookie].filter(Boolean).join("; ")};
}
