/* Rumah tunggal tautan bertoken untuk pihak luar tanpa akun (FITUR.md §6, WEBSITE.md §6d): mitra, relawan, pilot, organisasi luar.
   Modul BARU memakai tiga fungsi ini, tidak membuat tabel token sendiri (gerbang tests/agen/gerbang-token.test.mjs).
   - token: 32 bita acak (base64url, 43 karakter), tampil sekali; D1 hanya menyimpan sha-256 (migrasi 0164).
   - kedaluwarsa wajib, 1 menit sampai 90 hari. Cakupan = larik kata pendek yang diperiksa rute (punya(t, "isi_3w")).
   - menebak tidak masuk akal (2^256), jadi tanpa batas laju per token; rute publik tetap memakai laju() per IP seperti rute lain.
   - token berbentuk salah ditolak sebelum menyentuh D1 (tidak memakan kuota baca). */
import {sha} from "./worker.js";
import {tkSimpan, tkPakai, tkCabut, pelakuTkTerbit, pelakuTkPeriksa} from "./hak.js";

const MENIT = 60e3, TTL_MIN = MENIT, TTL_MAKS = 90 * 24 * 60 * MENIT;
const RE_JENIS = /^[a-z0-9_]{2,40}$/, RE_CAKUPAN = /^[a-z0-9_:]{1,40}$/, RE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const b64url = b => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hexAcak = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, "0")).join("");

/* sasaran = objek kecil yang ditunjuk token (mis. {org: "…", kejadian: "…"}); oleh = id staf penerbit. Melempar Error berpesan jelas bila masukan salah. */
export async function terbitkan(env, {jenis, sasaran, cakupan = [], ttlMs, oleh}, kini = Date.now()) {
  if (!RE_JENIS.test(jenis || "")) throw new Error("jenis token harus 2 sampai 40 huruf kecil, angka, atau _");
  if (!(Number.isFinite(ttlMs) && ttlMs >= TTL_MIN && ttlMs <= TTL_MAKS)) throw new Error("masa berlaku token harus 1 menit sampai 90 hari");
  if (!Array.isArray(cakupan) || cakupan.length > 10 || !cakupan.every(c => RE_CAKUPAN.test(c))) throw new Error("cakupan harus larik paling banyak 10 kata pendek");
  const s = JSON.stringify(sasaran ?? null);
  if (!sasaran || typeof sasaran !== "object" || Array.isArray(sasaran) || s.length > 500) throw new Error("sasaran harus objek, paling panjang 500 karakter");
  if (typeof oleh !== "string" || !oleh || oleh.length > 64) throw new Error("oleh (penerbit) wajib");
  const token = b64url(crypto.getRandomValues(new Uint8Array(32))), id = hexAcak(8), kedaluwarsa = kini + ttlMs;
  await tkSimpan(env, pelakuTkTerbit, {id, jenis, token_sha: await sha(token), sasaran: s, cakupan: JSON.stringify([...new Set(cakupan)]), dibuat: kini, kedaluwarsa, oleh});
  return {id, token, kedaluwarsa};
}

/* null = tidak sah (salah bentuk, tidak ada, jenis lain, dicabut, kedaluwarsa); rute menjawab 403 yang sama untuk semuanya. */
export async function periksa(env, jenis, token, kini = Date.now()) {
  if (typeof token !== "string" || !RE_TOKEN.test(token) || !RE_JENIS.test(jenis || "")) return null;
  const r = await tkPakai(env, pelakuTkPeriksa, jenis, await sha(token), kini);
  return r ? {id: r.id, sasaran: JSON.parse(r.sasaran), cakupan: JSON.parse(r.cakupan), kedaluwarsa: r.kedaluwarsa} : null;
}

export const cabut = async (env, jenis, id, kini = Date.now()) => typeof id === "string" && /^[0-9a-f]{16}$/.test(id) && RE_JENIS.test(jenis || "") && (await tkCabut(env, pelakuTkTerbit, jenis, id, kini)) > 0;
export const punya = (t, cakupan) => !!t?.cakupan?.includes(cakupan);
