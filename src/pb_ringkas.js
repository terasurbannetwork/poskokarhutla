/* Paritas bencana PB-28: GET /api/pb/papan-sk (F-20). data/kajian-bnpb/paritas-bencana/DESAIN-TEKNIS.md 6.4, KEAMANAN-PRIVASI.md.
   Status darurat HANYA dari SK isian staf (logbook_sk, Q5); tidak ada kesimpulan dari model. Satu baris per kejadian: SK provinsi mengalahkan kabupaten.
   Tanpa nama penandatangan, tanpa tautan, tanpa kolom oleh. Cache isolate 5 menit pada baris mentah (kunci hari|bencana|wilayah terurut atau nasional); filter wilayah di SQL. */
import {json, gagal, adminOK} from "./worker.js";
import {stafSesiSemua, pemirsaLihat, dalamWilayahStaf, wilayahStaf} from "./staf.js";
import {JENIS} from "./logbook.js";
import {PROV} from "./bangunan.js";
import {rute} from "./pb_isian.js";
import {papanSk, pelakuPbBaca} from "./hak.js";

const HARI = 864e5, AMBANG_BERAKHIR = 7, TTL = 5 * 60e3, cache = new Map();   // Q27 bawaan sementara: 7 hari
const TANPA_TABEL = /no such table: (main\.)?logbook_(sk|kejadian)/i;
const TOLAK = "papan status darurat hanya untuk akun centurisk97, staf berperan, atau pemirsa Pusdalops";

async function baris(env, tgl, bencana, wil, kini) {
  const k = `${tgl}|${bencana}|${wil.length ? wil.join(",") : "nasional"}`, c = cache.get(k);
  if (c && kini - c.t < TTL && !env.PB_TANPA_CACHE) return c.r;
  const r = await papanSk(env, pelakuPbBaca, tgl, bencana, wil);
  if (cache.size > 200) cache.clear();
  cache.set(k, {t: kini, r}); return r;
}
const urut = (a, b) => (b.wilayah === "prov") - (a.wilayah === "prov") || (b.tmt_mulai > a.tmt_mulai ? 1 : b.tmt_mulai < a.tmt_mulai ? -1 : 0) || b.perpanjangan_ke - a.perpanjangan_ke;

const papan = rute(async (env, req, url, kini) => {
  const q = url.searchParams, bencana = q.get("bencana") ?? "", prov = q.get("prov") ?? "";
  if (bencana && !JENIS.includes(bencana)) return gagal(400, "bencana tidak dikenal");
  if (prov && !PROV.has(prov)) return gagal(400, "prov harus kode BPS 2 digit yang sah");
  const adm = await adminOK(env, req), s = adm ? null : await stafSesiSemua(env, req);
  if (!adm && !s && !await pemirsaLihat(env, req)) return gagal(403, TOLAK);
  if (s && prov && !dalamWilayahStaf(req, [prov])) return gagal(403, "provinsi di luar wilayah akun Anda");
  const tgl = new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
  let rows;
  try { rows = await baris(env, tgl, bencana, prov ? [prov] : [...wilayahStaf(req)].sort(), kini); }
  catch (e) { if (TANPA_TABEL.test(String(e?.message || e))) return json({tersedia: false, sk: []}, 200, {"cache-control": "private, no-store"}); throw e; }
  const per = new Map();
  for (const r of [...rows].sort(urut)) if (!per.has(r.kejadian_id)) per.set(r.kejadian_id, r);
  const sk = [...per.values()].map(r => {
    const sisa = r.tmt_selesai ? Math.round((Date.parse(r.tmt_selesai + "T00:00:00Z") - Date.parse(tgl + "T00:00:00Z")) / HARI) : null;
    return {bencana: r.jenis, prov: r.prov, kab: r.kab, wilayah: r.wilayah, tingkat: r.tingkat, nomor: r.nomor, tgl_sk: r.tgl_sk, tmt_mulai: r.tmt_mulai, tmt_selesai: r.tmt_selesai, perpanjangan_ke: r.perpanjangan_ke,
      sisa_hari: sisa, sinyal: sisa === null ? "tanpa_tanggal_selesai" : sisa <= AMBANG_BERAKHIR ? "akan_berakhir" : null};
  });
  return json({tersedia: true, tanggal: tgl, ambang_hari: AMBANG_BERAKHIR, terpotong: rows.length >= 500, sk}, 200, {"cache-control": "private, no-store"});
});

/* digabung ke RUTE di src/worker.js; jalur tanpa garis bawah (gerbang cakupan) */
export const RUTE_PB_RINGKAS = {"GET /api/pb/papan-sk": papan};
