/* GET /api/pipa/lapangan?sejak=<ms>: isian lapangan teranonim untuk pipeline Python (kalibrasi koefisien; docs/bnpb/RENCANA-LANJUT.md §1.4).
   Auth: Authorization: Bearer <PIPA_TOKEN> (secret Worker). Token Worker kosong = 503, token salah/tanpa = 401. Tanpa nama, nomor, akun, atau media; koordinat dibulatkan 0,01 derajat
   (~1 km); id = id tugas acak. Data dummy tidak ikut. ponytail: maks 2000 tugas per panggilan, urut waktu; pipeline memanggil ulang dengan sejak = waktu terbesar yang diterima. */
import {json, gagal, sha} from "./worker.js";

const MAKS = 2000, bulat2 = x => Math.round(x * 100) / 100;
const parse = s => { try { return s == null ? null : JSON.parse(s); } catch (e) { return null; } };

export async function pipaLapangan(env, req, url) {
  if (!env.PIPA_TOKEN) return gagal(503, "PIPA_TOKEN belum dipasang di Worker");
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "");
  if (!m || await sha("pipa|" + m[1]) !== await sha("pipa|" + env.PIPA_TOKEN)) return gagal(401, "token pipeline salah atau tidak ada");
  const sejak = Math.max(0, Number(url.searchParams.get("sejak")) || 0);
  const I = (kolom, cond = "1") => `(SELECT ${kolom} FROM tugas_isian i WHERE i.tugas_id = t.id AND ${cond} ORDER BY i.dibuat DESC LIMIT 1)`;
  const sql = (garis) => `SELECT t.id, t.prov, t.kab, t.lat, t.lon, t.luas_ha luas_satelit_ha, t.padam_pada, t.padam_verif,
    (SELECT lahan_teramati FROM tugas_isian WHERE tugas_id = t.id AND lahan_teramati IS NOT NULL AND lahan_teramati != 'tidak_tahu' ORDER BY dibuat DESC LIMIT 1) lahan,
    ${I("i.luas_ha", "i.luas_ha IS NOT NULL")} luas_lapangan_ha, ${I("i.padam_ha", "i.padam_ha IS NOT NULL")} padam_ha, ${garis} luas_garis_ha,
    ${I("i.regu", "i.regu IS NOT NULL")} regu, ${I("i.personel", "i.personel IS NOT NULL")} personel, (SELECT min(mulai_padam) FROM tugas_isian WHERE tugas_id = t.id) mulai_padam,
    ${I("i.kedalaman_bara_cm", "i.kedalaman_bara_cm IS NOT NULL")} kedalaman_bara_cm, ${I("i.alat_dipakai", "i.alat_dipakai IS NOT NULL")} alat_dipakai, ${I("i.status_api", "i.status_api IS NOT NULL")} status_api,
    max(t.dibuat, coalesce(t.isian_terakhir, 0), coalesce(t.padam_pada, 0), coalesce(t.verif_pada, 0)) diubah
    FROM tugas_api t WHERE t.dummy = 0 AND max(t.dibuat, coalesce(t.isian_terakhir, 0), coalesce(t.padam_pada, 0), coalesce(t.verif_pada, 0)) >= ?1 ORDER BY diubah LIMIT ${MAKS}`;
  let rows;
  try { rows = (await env.DB.prepare(sql("(SELECT max(luas_ha) FROM ops_garis g WHERE g.tugas_id = t.id AND g.jenis = 'garis_api')")).bind(sejak).all()).results; }
  catch (e) { if (!/no such table: (main\.)?ops_garis/i.test(String(e?.message || e))) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "tugas api belum diaktifkan"); throw e; }
    rows = (await env.DB.prepare(sql("NULL")).bind(sejak).all()).results; }
  return json({sejak, n: rows.length, maks: MAKS, tugas: rows.map(r => ({id: r.id, prov: r.prov, kab: r.kab, lat: bulat2(r.lat), lon: bulat2(r.lon), lahan: r.lahan, luas_satelit_ha: r.luas_satelit_ha, luas_lapangan_ha: r.luas_lapangan_ha,
    padam_ha: r.padam_ha, luas_garis_ha: r.luas_garis_ha, regu: r.regu, personel: r.personel, mulai_padam: r.mulai_padam, padam_pada: r.padam_pada, padam_verif: r.padam_verif,
    kedalaman_bara_cm: r.kedalaman_bara_cm, alat_dipakai: parse(r.alat_dipakai), status_api: r.status_api, diubah: r.diubah}))});
}
export const RUTE_PIPA = {"GET /api/pipa/lapangan": (env, req, url) => pipaLapangan(env, req, url)};
