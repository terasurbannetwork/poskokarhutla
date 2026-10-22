/* Rute untuk pipeline Python (docs/bnpb/RENCANA-LANJUT.md §1.4, W7, W8), semuanya Authorization: Bearer <PIPA_TOKEN> (secret Worker). Token Worker kosong = 503, token salah/tanpa = 401,
   percobaan token salah dihitung per hash IP (laju_bnpb, aksi "pipa_gagal"; laju_posko.aksi dikunci CHECK ke tiga nilai): > 300 per jam = 429, token sah tidak menyentuh penghitung.
   - GET /api/pipa/lapangan?sejak=<ms>: isian lapangan teranonim (kalibrasi koefisien). Tanpa nama, nomor, akun, atau media; koordinat dibulatkan 0,01 derajat (~1 km); id = id tugas acak.
     Data dummy tidak ikut. instansi_hash = 12 huruf awal sha256("instansi|" + id akun pengisi terakhir): hanya untuk dedupe/pengelompokan, tidak bisa dibalik ke akun tanpa daftar id akun.
     ponytail: maks 2000 tugas per panggilan, urut waktu; pipeline memanggil ulang dengan sejak = waktu terbesar yang diterima.
   - GET /api/pipa/jejak?sejak=<ms>: jejak GPS regu TANPA identitas (penugasan_posisi), hanya segmen bergerak, titik dibulatkan 0,0001 derajat (~11 m); dipakai scripts/scrape/akses.py. */
import {json, gagal, sha, ipHash} from "./worker.js";
import {km} from "./titik.js";

const MAKS = 2000, bulat2 = x => Math.round(x * 100) / 100, bulat4 = x => Math.round(x * 1e4) / 1e4;
const parse = s => { try { return s == null ? null : JSON.parse(s); } catch (e) { return null; } };
const tanpaTabel = (e, nama) => new RegExp(`no such (table|column): (main\\.)?${nama}`, "i").test(String(e?.message || e));

async function tolakToken(env, req, kini) {
  if (env.IP_SALT) try {
    const ip = await ipHash(env, req), JAM = 36e5;
    if ((await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = 'pipa_gagal' AND waktu > ?").bind(ip, kini - JAM).first()).n >= 300) return gagal(429, "terlalu banyak token salah dari jaringan ini; coba lagi nanti", {"retry-after": "3600"});
    await env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'pipa_gagal', ?)").bind(ip, kini).run();
  } catch (e) { if (!/no such table/i.test(String(e?.message || e))) throw e; }   // tabel laju_bnpb (0022) belum ada = tanpa batas, tetap 401
  return gagal(401, "token pipeline salah atau tidak ada");
}
/* null = lolos; selain itu Response */
async function periksaToken(env, req) {
  if (!env.PIPA_TOKEN) return gagal(503, "PIPA_TOKEN belum dipasang di Worker");
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "");
  return m && await sha("pipa|" + m[1]) === await sha("pipa|" + env.PIPA_TOKEN) ? null : tolakToken(env, req, Date.now());
}

export async function pipaLapangan(env, req, url) {
  const tolak = await periksaToken(env, req); if (tolak) return tolak;
  const sejak = Math.max(0, Number(url.searchParams.get("sejak")) || 0);
  const I = (kolom, cond = "1") => `(SELECT ${kolom} FROM tugas_isian i WHERE i.tugas_id = t.id AND ${cond} ORDER BY i.dibuat DESC LIMIT 1)`;
  const sql = (garis, awal) => `SELECT t.id, t.prov, t.kab, t.lat, t.lon, t.luas_ha luas_satelit_ha, t.padam_pada, t.padam_verif, t.rekomendasi,
    (SELECT lahan_teramati FROM tugas_isian WHERE tugas_id = t.id AND lahan_teramati IS NOT NULL AND lahan_teramati != 'tidak_tahu' ORDER BY dibuat DESC LIMIT 1) lahan,
    ${I("i.luas_ha", "i.luas_ha IS NOT NULL")} luas_lapangan_ha, ${I("i.padam_ha", "i.padam_ha IS NOT NULL")} padam_ha, ${garis} luas_garis_ha,
    ${I("i.regu", "i.regu IS NOT NULL")} regu, ${I("i.personel", "i.personel IS NOT NULL")} personel, (SELECT min(mulai_padam) FROM tugas_isian WHERE tugas_id = t.id) mulai_padam,
    ${I("i.kedalaman_bara_cm", "i.kedalaman_bara_cm IS NOT NULL")} kedalaman_bara_cm, ${I("i.alat_dipakai", "i.alat_dipakai IS NOT NULL")} alat_dipakai, ${I("i.status_api", "i.status_api IS NOT NULL")} status_api,
    (SELECT max(regu) FROM tugas_isian WHERE tugas_id = t.id) regu_maks, (SELECT round(avg(regu), 1) FROM tugas_isian WHERE tugas_id = t.id AND regu IS NOT NULL) regu_rata,
    (SELECT count(*) FROM tugas_isian WHERE tugas_id = t.id) jumlah_isian, (SELECT akun_id FROM tugas_isian WHERE tugas_id = t.id ORDER BY dibuat DESC LIMIT 1) akun_terakhir,
    ${awal} luas_satelit_awal_ha,
    max(t.dibuat, coalesce(t.isian_terakhir, 0), coalesce(t.padam_pada, 0), coalesce(t.verif_pada, 0)) diubah
    FROM tugas_api t WHERE t.dummy = 0 AND max(t.dibuat, coalesce(t.isian_terakhir, 0), coalesce(t.padam_pada, 0), coalesce(t.verif_pada, 0)) >= ?1 ORDER BY diubah LIMIT ${MAKS}`;
  let garis = true, awal = true, rows;
  for (let i = 0; i < 3 && !rows; i++) {
    try { rows = (await env.DB.prepare(sql(garis ? "(SELECT max(luas_ha) FROM ops_garis g WHERE g.tugas_id = t.id AND g.jenis = 'garis_api')" : "NULL", awal ? "(SELECT luas_ha FROM tugas_luas_awal a WHERE a.tugas_id = t.id)" : "NULL")).bind(sejak).all()).results; }
    catch (e) {
      if (garis && tanpaTabel(e, "ops_garis")) garis = false;
      else if (awal && tanpaTabel(e, "tugas_luas_awal")) awal = false;
      else if (/no such table/i.test(String(e?.message || e))) return gagal(503, "tugas api belum diaktifkan");
      else throw e;
    }
  }
  const tugas = await Promise.all(rows.map(async r => {
    const rek = parse(r.rekomendasi);
    return {id: r.id, prov: r.prov, kab: r.kab, lat: bulat2(r.lat), lon: bulat2(r.lon), lahan: r.lahan, luas_satelit_ha: r.luas_satelit_ha, luas_lapangan_ha: r.luas_lapangan_ha,
      padam_ha: r.padam_ha, luas_garis_ha: r.luas_garis_ha, regu: r.regu, personel: r.personel, mulai_padam: r.mulai_padam, padam_pada: r.padam_pada, padam_verif: r.padam_verif,
      kedalaman_bara_cm: r.kedalaman_bara_cm, alat_dipakai: parse(r.alat_dipakai), status_api: r.status_api,
      regu_maks: r.regu_maks, regu_rata: r.regu_rata, luas_satelit_awal_ha: r.luas_satelit_awal_ha, luas_satelit_maks_ha: r.luas_satelit_ha,
      /* dari peta gambut lewat rekomendasi pipeline: kunci `gambut` bila ada, selain itu bara_cm terukur (hanya dihitung di sel gambut) = true. Selain itu null (tidak diketahui), BUKAN false:
         rekomendasi tanpa bara tidak membuktikan lahan bukan gambut. */
      lahan_peta_gambut: typeof rek?.gambut === "boolean" ? rek.gambut : typeof rek?.bara_cm === "number" ? true : null,
      jumlah_isian: r.jumlah_isian, instansi_hash: r.akun_terakhir ? (await sha("instansi|" + r.akun_terakhir)).slice(0, 12) : null, diubah: r.diubah};
  }));
  return json({sejak, n: tugas.length, maks: MAKS, tugas});
}

/* ---------------- jejak GPS regu ---------------- */
const UJUNG_M = 300, MAKS_TITIK = 20000, MAKS_SEGMEN = 2000, GERAK_M = 15, JEDA_MAKS = 10 * 60e3, LAJU_MAKS_KMJ = 120;
/* titik per penugasan (urut waktu) -> segmen bergerak: pasangan berurutan dihitung bergerak bila jarak >= GERAK_M (di bawah itu = derau GPS/diam), selang <= 10 menit, dan laju <= 120 km/jam (loncatan = galat GPS).
   Pasangan bergerak yang bersambung jadi satu segmen; segmen < 2 titik dibuang. Murni, diuji lewat rute. */
export function segmenGerak(titik) {
  const out = []; let cur = null;
  for (let i = 1; i < titik.length; i++) {
    const a = titik[i - 1], b = titik[i], d = km(a.lat, a.lon, b.lat, b.lon) * 1000, dt = b.pada - a.pada;
    const gerak = d >= GERAK_M && dt > 0 && dt <= JEDA_MAKS && d / 1000 / (dt / 36e5) <= LAJU_MAKS_KMJ;
    if (!gerak) { cur = null; continue; }
    if (!cur) { cur = [[bulat4(a.lat), bulat4(a.lon)]]; out.push(cur); }
    const p = [bulat4(b.lat), bulat4(b.lon)], l = cur[cur.length - 1];
    if (p[0] !== l[0] || p[1] !== l[1]) cur.push(p);
  }
  return out.map(potongUjung).filter(s => s.length >= 2);
}
/* ujung perjalanan sering rumah/basis pelacak: buang ~300 m pertama dan terakhir tiap segmen (panjang jalur), segmen yang habis dibuang */
export function potongUjung(seg) {
  const d = (a, b) => km(a[0], a[1], b[0], b[1]) * 1000; let i = 0, j = seg.length - 1, acc = 0;
  while (i < j && acc < UJUNG_M) { acc += d(seg[i], seg[i + 1]); i++; }
  acc = 0; while (j > i && acc < UJUNG_M) { acc += d(seg[j], seg[j - 1]); j--; }
  return seg.slice(i, j + 1);
}
function kocok(a) { const r = crypto.getRandomValues(new Uint32Array(a.length)); for (let i = a.length - 1; i > 0; i--) { const k = r[i] % (i + 1); [a[i], a[k]] = [a[k], a[i]]; } return a; }
export async function pipaJejak(env, req, url) {
  const tolak = await periksaToken(env, req); if (tolak) return tolak;
  const sejak = Math.max(0, Number(url.searchParams.get("sejak")) || 0);
  let rows;
  try { rows = (await env.DB.prepare("SELECT p.penugasan_id, p.lat, p.lon, p.pada FROM penugasan_posisi p JOIN penugasan g ON g.id = p.penugasan_id WHERE g.dummy = 0 AND p.pada >= ? ORDER BY p.pada LIMIT ?").bind(sejak, MAKS_TITIK).all()).results; }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "pelacakan regu belum diaktifkan (migrasi 0035)"); throw e; }
  const per = new Map(); for (const r of rows) (per.get(r.penugasan_id) || per.set(r.penugasan_id, []).get(r.penugasan_id)).push(r);
  const jejak = kocok([...per.values()].flatMap(segmenGerak)).slice(0, MAKS_SEGMEN);   // id penugasan/regu/akun tidak ikut; urutan diacak SEBELUM dipotong: segmen satu perjalanan tak bisa dikelompokkan lewat urutan
  return json({sejak, n: jejak.length, maks_segmen: MAKS_SEGMEN, terpotong: rows.length >= MAKS_TITIK || jejak.length >= MAKS_SEGMEN, jejak});
}
export const RUTE_PIPA = {
  "GET /api/pipa/lapangan": (env, req, url) => pipaLapangan(env, req, url),
  "GET /api/pipa/jejak": (env, req, url) => pipaJejak(env, req, url),
};
