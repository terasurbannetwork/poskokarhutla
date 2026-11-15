/* KP-24 GET /api/orang/:id/jejak?dari=&sampai= (K9): jejak kerja per hari, hanya untuk orangnya sendiri (kode petugas atau sesi staf yang dipetakan di orang_akun) dan Super Admin.
   Semua selain itu 404 yang sama dengan orang tak ada. Tiap baca dicatat di pantau_jejak. Isinya hitungan saja (tanggal, jenis, n); dibaca lewat hak.js. */
import {gagal, json} from "./worker.js";
import {superOK} from "./posko.js";
import {stafSesiSemua} from "./staf.js";
import {petugas} from "./lapangan.js";
import {tanggalWIB, awalHariWIB} from "./lapangan_konst.js";
import {oaAkunDari, oaJejakBaca, oaJejakCatat} from "./hak.js";

const HARI = 864e5, MAKS_HARI = 31, tidakAda = () => gagal(404, "tidak ditemukan");
async function pelaku(env, req, id, kini) {
  const adm = await superOK(env, req); if (adm) return "admin:" + adm;
  if (req.headers.get("x-kode")) { const o = await petugas(env, req, kini); if (!(o instanceof Response) && !o.regu && o.id === id) return "orang:" + id; }
  const s = await stafSesiSemua(env, req, kini);
  return s && await oaAkunDari(env, "staf", s.id, id) ? "staf:" + s.id : null;
}
const tgl = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && tanggalWIB(awalHariWIB(v)) === v ? v : null;

export async function jejakOrang(env, req, url, kini, ctx, id) {
  const oleh = /^[0-9a-f]{16}$/.test(id) ? await pelaku(env, req, id, kini) : null; if (!oleh) return tidakAda();
  const sampai = tgl(url.searchParams.get("sampai") ?? tanggalWIB(kini)), dari = sampai && tgl(url.searchParams.get("dari") ?? tanggalWIB(awalHariWIB(sampai) - 6 * HARI));
  if (!dari || dari > sampai) return gagal(400, "dari dan sampai harus tanggal YYYY-MM-DD, dari tidak melewati sampai");
  const ms0 = awalHariWIB(dari), ms1 = awalHariWIB(sampai) + HARI - 1;
  if (Math.round((ms1 - ms0) / HARI) > MAKS_HARI) return gagal(400, `rentang maksimal ${MAKS_HARI} hari`);
  const r = await oaJejakBaca(env, id, dari, sampai, ms0, ms1); if (!r) return tidakAda();
  await oaJejakCatat(env, oleh, id, kini);
  const baris = [...["absen", "logbook", "tugas"].flatMap(j => r[j].map(x => ({tanggal: x.tanggal, jenis: j, n: x.n})))].sort((a, b) => a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : a.jenis < b.jenis ? -1 : 1);
  return json({dari, sampai, baris}, 200, {"cache-control": "private, no-store"});
}
