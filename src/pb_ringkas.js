/* Paritas bencana PB-28: GET /api/pb/papan-sk (F-20). data/kajian-bnpb/paritas-bencana/DESAIN-TEKNIS.md 6.4, KEAMANAN-PRIVASI.md.
   Status darurat HANYA dari SK isian staf (logbook_sk, Q5); tidak ada kesimpulan dari model. Satu baris per kejadian: SK provinsi mengalahkan kabupaten.
   Tanpa nama penandatangan, tanpa tautan, tanpa kolom oleh. Cache isolate 5 menit pada baris mentah (kunci hari|bencana|wilayah terurut atau nasional); filter wilayah di SQL. */
import {json, gagal, adminOK} from "./worker.js";
import {stafSesiSemua, pemirsaLihat, dalamWilayahStaf, wilayahStaf} from "./staf.js";
import {JENIS} from "./logbook.js";
import {PROV} from "./bangunan.js";
import {rute} from "./pb_isian.js";
import {papanSk, pelakuPbBaca, pbRingkasRenlap, pbRingkasTindakan} from "./hak.js";
import REGISTRY from "./bencana.generated.js";

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

const unik = rows => { const per = new Map(); for (const r of [...rows].sort(urut)) if (!per.has(r.kejadian_id)) per.set(r.kejadian_id, r); return [...per.values()]; };
const sisaHari = (r, tgl) => r.tmt_selesai ? Math.round((Date.parse(r.tmt_selesai + "T00:00:00Z") - Date.parse(tgl + "T00:00:00Z")) / HARI) : null;

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
  const sk = unik(rows).map(r => {
    const sisa = sisaHari(r, tgl);
    return {bencana: r.jenis, prov: r.prov, kab: r.kab, wilayah: r.wilayah, tingkat: r.tingkat, nomor: r.nomor, tgl_sk: r.tgl_sk, tmt_mulai: r.tmt_mulai, tmt_selesai: r.tmt_selesai, perpanjangan_ke: r.perpanjangan_ke,
      sisa_hari: sisa, sinyal: sisa === null ? "tanpa_tanggal_selesai" : sisa <= AMBANG_BERAKHIR ? "akan_berakhir" : null};
  });
  return json({tersedia: true, tanggal: tgl, ambang_hari: AMBANG_BERAKHIR, terpotong: rows.length >= 500, sk}, 200, {"cache-control": "private, no-store"});
});

/* PB-30 GET /api/pb/ringkas (F-18, F-19; DESAIN-TEKNIS 6.3, 9). Per bencana: (a) berkas statis public/data/ringkas/<id>.json apa adanya (mati/basi tetap tampil, angka null tetap null; angka antarsumber tidak dijumlah),
   (b) hitungan operasi D1 yang murah, tiap angka {nilai, sumber, waktu}; null bila tabelnya belum ada. Hitungan D1 di-cache isolate 5 menit, kunci = hak|hari|wilayah terurut (atau nasional); filter wilayah di SQL. */
const D1_CACHE = new Map();
const iso = t => new Date(t).toISOString();
async function operasi(env, hak, tgl, wil, kini) {
  const k = `${hak}|${tgl}|${wil.length ? wil.join(",") : "nasional"}`, c = D1_CACHE.get(k);
  if (c && kini - c.t < TTL && !env.PB_TANPA_CACHE) return c.r;
  const dari = new Date(Date.parse(tgl) - 30 * HARI).toISOString().slice(0, 10), kosong = () => new Map(), per = {};
  const tanpa = async (f, a) => { try { return await f(); } catch (e) { if (a(String(e?.message || e))) return null; throw e; } };
  const rl = await tanpa(() => pbRingkasRenlap(env, pelakuPbBaca, dari, tgl, tgl, wil), m => /no such table: (main\.)?pb_renlap/i.test(m));
  const tk = await tanpa(() => pbRingkasTindakan(env, kini, wil), m => /no such table: (main\.)?(pb_tindakan|peringatan)\b/i.test(m));
  const sk = await tanpa(() => papanSk(env, pelakuPbBaca, tgl, "", wil), m => TANPA_TABEL.test(m));
  const rn = new Map((rl?.renlap ?? []).map(r => [r.bencana, r])), dd = new Map((rl?.didatangi ?? []).map(r => [r.bencana, r.n])), tn = new Map((tk ?? []).map(r => [r.bencana, r.n]));
  const skj = kosong(), skb = kosong();
  for (const r of unik(sk ?? [])) { skj.set(r.jenis, (skj.get(r.jenis) ?? 0) + 1); const s = sisaHari(r, tgl); if (s !== null && s <= AMBANG_BERAKHIR) skb.set(r.jenis, (skb.get(r.jenis) ?? 0) + 1); }
  const a = (nilai, sumber) => ({nilai, sumber, waktu: iso(kini)});
  for (const {id} of REGISTRY.bencana) {
    const r = rn.get(id), target = r?.target ?? 0;
    per[id] = {
      renlap_terbit_hari_ini: a(rl ? r?.hari_ini ?? 0 : null, "d1:pb_renlap"), renlap_terbit_30h: a(rl ? r?.renlap ?? 0 : null, "d1:pb_renlap"),
      kepatuhan_persen: a(rl && target > 0 ? Math.round(1000 * (dd.get(id) ?? 0) / target) / 10 : null, "d1:pb_renlap_hasil"),
      tindakan_terbuka: a(tk ? tn.get(id) ?? 0 : null, "d1:pb_tindakan"),
      sk_berlaku: a(sk ? skj.get(id) ?? 0 : null, "d1:logbook_sk"), sk_berakhir_7h: a(sk ? skb.get(id) ?? 0 : null, "d1:logbook_sk")};
  }
  const r = {per, terpotong: (sk?.length ?? 0) >= 500};
  if (D1_CACHE.size > 200) D1_CACHE.clear();
  D1_CACHE.set(k, {t: kini, r}); return r;
}
async function berkas(env, url, id) {
  try {
    const r = env.ASSETS ? await env.ASSETS.fetch(new Request(new URL(`/data/ringkas/${id}.json`, url))) : null;
    if (!r?.ok) { r?.body?.cancel(); return null; }
    const j = await r.json(); return j && typeof j === "object" ? j : null;
  } catch (e) { return null; }
}
const ringkas = rute(async (env, req, url, kini) => {
  const q = url.searchParams, bencana = q.get("bencana") ?? "", prov = q.get("prov") ?? "";
  if (bencana && !REGISTRY.bencana.some(b => b.id === bencana)) return gagal(400, "bencana tidak dikenal");
  if (prov && !PROV.has(prov)) return gagal(400, "prov harus kode BPS 2 digit yang sah");
  const adm = await adminOK(env, req), s = adm ? null : await stafSesiSemua(env, req);
  if (!adm && !s && !await pemirsaLihat(env, req)) return gagal(403, TOLAK);
  if (s && prov && !dalamWilayahStaf(req, [prov])) return gagal(403, "provinsi di luar wilayah akun Anda");
  const tgl = new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
  const op = await operasi(env, adm ? "a" : s ? "s" : "p", tgl, prov ? [prov] : [...wilayahStaf(req)].sort(), kini);
  const ids = REGISTRY.bencana.map(b => b.id).filter(id => !bencana || id === bencana);
  const hasil = await Promise.all(ids.map(async id => ({id, ringkas: await berkas(env, url, id), operasi: op.per[id]})));
  return json({kini: iso(kini), tanggal: tgl, terpotong: op.terpotong, bencana: hasil}, 200, {"cache-control": "private, no-store", vary: "cookie"});
});

/* digabung ke RUTE di src/worker.js; jalur tanpa garis bawah (gerbang cakupan) */
export const RUTE_PB_RINGKAS = {"GET /api/pb/papan-sk": papan, "GET /api/pb/ringkas": ringkas};
