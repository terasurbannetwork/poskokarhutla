/* Pintu Masuk PM-09: dua tanda untuk antrean tinjau akun yang SUDAH ada (instansi, pendataan, kampus), tanpa mengubah keputusan siapa pun:
   cocok_kontak = nomor pemohon ada di kontak pemangku aktif yang kategori dan wilayahnya cocok (ALGORITMA §4);
   nomor_terbukti = nomor itu pernah lolos kode sekali pakai (punya akun umum). Tanpa SQL di sini (semua di hak.js); tabel belum ada = kedua tanda false. */
import {mkTandaNomor, mkWaKampus} from "./hak.js";
import * as K from "./masuk_konst.js";

const KOSONG = {cocok_kontak: false, nomor_terbukti: false};
const huruf = s => String(s ?? "").toLowerCase();
const tanpaTabel = e => /no such table/i.test(String(e?.message || e));
const sajaWa = (wa, daftar) => daftar.filter(k => k.wa === wa);

/* murni: akun instansi {jenis, tingkat, prov, kab, cakupan (teks JSON)} dan kontak [{kategori, prov, kab}] */
export function kontakCocokAkun(a, kontak) {
  const kategori = K.PETA_KATEGORI[a.jenis]; if (!kategori) return false;
  let cakupan = []; try { cakupan = JSON.parse(a.cakupan || "[]"); } catch (e) {}
  return kontak.some(k => kategori.includes(k.kategori) && (a.tingkat === "kab" ? k.prov === a.prov && huruf(k.kab) === huruf(a.kab) : k.kab == null && cakupan.includes(k.prov)));
}
/* baris instansi_akun mentah (wa, jenis, tingkat, prov, kab, cakupan) -> larik tanda, urutan sama */
export async function tandaInstansi(env, baris) {
  if (!baris.length) return [];
  try {
    const t = await mkTandaNomor(env, baris.map(a => a.wa));
    return baris.map(a => ({cocok_kontak: !!a.wa && kontakCocokAkun(a, sajaWa(a.wa, t.kontak)), nomor_terbukti: !!a.wa && t.terbukti.has(a.wa)}));
  } catch (e) { if (tanpaTabel(e)) return baris.map(() => KOSONG); throw e; }
}
/* pendataan: yang cocok hanya kontak berkategori bnpb (nasional, tanpa wilayah); diundang_staf = ada undangan pendataan terkirim yang masih berlaku. Hanya tanda: persetujuan tetap Super Admin (D19) */
export async function tandaPendataan(env, baris) {
  if (!baris.length) return [];
  try {
    const t = await mkTandaNomor(env, baris.map(a => a.wa));
    return baris.map(a => ({cocok_kontak: !!a.wa && sajaWa(a.wa, t.kontak).some(k => k.kategori === "bnpb"), nomor_terbukti: !!a.wa && t.terbukti.has(a.wa), diundang_staf: !!a.wa && t.diundang.has(a.wa)}));
  } catch (e) { if (tanpaTabel(e)) return baris.map(() => ({...KOSONG, diundang_staf: false})); throw e; }
}
/* kampus: tak ada peta kategori kontak untuk kampus (ALGORITMA §4), jadi cocok_kontak selalu false; nomor_terbukti dari nomor akun kampus (km_akun) milik tiap institusi */
export async function tandaKampus(env, idInstitusi) {
  const peta = new Map(idInstitusi.map(i => [i, {...KOSONG}]));
  if (!idInstitusi.length) return peta;
  try {
    const wa = await mkWaKampus(env, idInstitusi), t = await mkTandaNomor(env, wa.map(r => r.wa));
    for (const r of wa) if (t.terbukti.has(r.wa)) peta.get(r.institusi_id).nomor_terbukti = true;
  } catch (e) { if (!tanpaTabel(e)) throw e; }
  return peta;
}
