/* Keterpaduan KP-23: layar tinjau pasangan akun ke orang (D10). GET /api/orang/tinjau (antrean, data bernomor selalu disamarkan),
   POST /api/orang/tinjau {id, keputusan: "pasang"|"tolak", orang_id} (Super Admin). Tiap keputusan dicatat di pantau_jejak.
   SQL di src/hak.js (oa*). Antrean dibatasi 200 baris oleh oaTinjauAntre; halaman 50 lewat ?dari= (subrequest Free 50). */
import {json, gagal, bacaBody} from "./worker.js";
import {superOK} from "./posko.js";
import * as H from "./hak.js";

const HAL = 50, RE_ID = /^[0-9a-zA-Z]{16}$/;
const aman = f => async (...a) => { try { return await f(...a); } catch (e) { if (/no such table: orang_(tinjau|akun)/i.test(String(e?.message || e))) return gagal(503, "Pasangan akun belum diaktifkan"); throw e; } };
/* 6281234567789 -> 6281*****789 */
export const samarWa = w => !w ? null : String(w).length < 10 ? "*".repeat(String(w).length) : String(w).slice(0, 4) + "*****" + String(w).slice(-3);
/* semua digit disamarkan kecuali 4 terakhir */
export const samarNip = n => !n ? null : String(n).length < 10 ? "*".repeat(String(n).length) : "*".repeat(Math.max(String(n).length - 4, 0)) + String(n).slice(-4);
const kandidatDari = r => { try { const k = JSON.parse(r.kandidat); return Array.isArray(k) ? k.filter(x => typeof x === "string") : []; } catch { return []; } };

async function daftar(env, req, url) {
  if (!await superOK(env, req)) return gagal(403, "hanya Super Admin");
  const dari = Math.max(0, Number.parseInt(url.searchParams.get("dari") ?? "0", 10) || 0);
  const semua = await H.oaTinjauAntre(env), baris = semua.slice(dari, dari + HAL);
  const [akun, orang] = await Promise.all([H.oaAkunBanyak(env, baris), H.oaOrangRingkas(env, [...new Set(baris.flatMap(kandidatDari))])]);
  const per = new Map(orang.map(o => [o.id, {id: o.id, jenis: o.jenis, unit: o.unit, jabatan: o.jabatan, nip: samarNip(o.nip), wa: samarWa(o.wa)}]));
  return json({total: semua.length, dari, berikut: dari + HAL < semua.length ? dari + HAL : null, tinjau: baris.map((r, i) => ({
    id: r.id, akun_tabel: r.akun_tabel, akun_id: r.akun_id, alasan: r.alasan, dibuat: r.dibuat,
    akun: akun[i] ? {unit: akun[i].unit, nip: samarNip(akun[i].nip), wa: samarWa(akun[i].wa)} : null,
    kandidat: kandidatDari(r).map(id => per.get(id)).filter(Boolean),
  }))});
}

async function putus(env, req, url, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "hanya Super Admin");
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const {id, keputusan, orang_id: oid} = b.o, x = Object.keys(b.o).find(k => !["id", "keputusan", "orang_id"].includes(k)); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  if (typeof id !== "string" || !RE_ID.test(id)) return gagal(400, "id tinjau tidak sah");
  if (keputusan !== "pasang" && keputusan !== "tolak") return gagal(400, "keputusan harus pasang atau tolak");
  const t = await H.oaTinjauById(env, id); if (!t) return gagal(404, "baris tinjau tidak ada");
  if (t.keputusan) return gagal(409, "baris ini sudah diputus");
  if (keputusan === "pasang") {
    if (typeof oid !== "string" || !kandidatDari(t).includes(oid)) return gagal(400, "orang_id harus salah satu kandidat");
    if (!(await H.oaOrangRingkas(env, [oid])).length) return gagal(400, "orang tidak ada");
  } else if (oid != null) return gagal(400, "tolak tidak memakai orang_id");
  if (!await H.oaPutusBatch(env, t, keputusan, oid ?? null, "admin:" + mod, kini)) return gagal(409, "baris sudah diputus atau akun ini sudah berpasangan");
  return json({ok: true, id, keputusan});
}

export const RUTE_ORANG_TINJAU = {
  "GET /api/orang/tinjau": aman(daftar),
  "POST /api/orang/tinjau": aman(putus),
};
