/* Peringatan bencana berantai (G3, migrasi 0098): entri logbook banjir/cuaca di satu kab membuka peringatan longsor dan banjir susulan 3 hari untuk kab itu.
   Ini pola DESKRIPTIF dari arsip logbook Pusdalops, BUKAN ramalan. Angka = lift nasional dari public/data/bnpb/logbook_susulan.json (dibuat 2026-11-01, tahun dasar 2014-2020, 2024, 2025),
   disalin ke konstanta supaya tak ada fetch aset per entri; tests/warga/pusdalops_gelombang3.test.mjs membandingkannya dengan berkas itu (angka melenceng = uji merah).
   Satu baris per (prov, kab, susulan): entri baru memperpanjang baris (upsert), jadi kab yang sama tak pernah dobel dalam jendela aktif dan tabel terbatas. */
import {laju} from "./bnpb.js";
import {json, gagal, NO_JSON, HARI, cek, tolak, kodeProv, bacaStaf, dummyStaf, tabelBelum3} from "./pusdalops_umum.js";

export const BERLAKU_HARI = 3, MAKS_DAFTAR = 500;
/* pemicu>susulan -> {n, k, laju, dasar, lift, ci95} nasional; sumber: logbook_susulan.json pasangan[...].nasional */
export const POLA = {
  "banjir>longsor": {n: 9831, k: 815, laju: 0.083, dasar: 0.039, lift: 2.12, ci95: [1.97, 2.27]},
  "banjir>banjir": {n: 9831, k: 1187, laju: 0.121, dasar: 0.061, lift: 1.98, ci95: [1.88, 2.1]},
  "cuaca>longsor": {n: 8550, k: 1007, laju: 0.118, dasar: 0.077, lift: 1.53, ci95: [1.4, 1.65]},
  "cuaca>banjir": {n: 8550, k: 560, laju: 0.065, dasar: 0.047, lift: 1.38, ci95: [1.25, 1.52]},
};
const SUSULAN = {banjir: ["longsor", "banjir"], cuaca: ["longsor", "banjir"]};
const pct = x => String(Math.round(x * 1000) / 10).replace(".", ",");
const koma = x => String(x).replace(".", ",");
export const teksPola = (pemicu, susulan) => {
  const p = POLA[pemicu + ">" + susulan];
  return `Setelah ${pemicu} tercatat di kab ini, ${susulan} tercatat di kab yang sama dalam 1-3 hari pada ${pct(p.laju)}% kasus di arsip logbook 2014-2025, ${koma(p.lift)} kali lipat peluang hari biasa (ci95 ${koma(p.ci95[0])}-${koma(p.ci95[1])}). Pola deskriptif dari laporan Pusdalops, bukan ramalan.`;
};

/* dipanggil src/logbook.js sesudah entri tersimpan; galat apa pun ditelan (logbook tak boleh gagal karena peringatan), tanpa migrasi 0098 diam saja */
export async function catatBerantai(env, {jenis, prov, kab, kejadian, kini}) {
  const daftar = SUSULAN[jenis]; if (!daftar) return;
  try {
    await env.DB.batch(daftar.map(s => env.DB.prepare(`INSERT INTO berantai_peringatan (prov, kab, susulan, pemicu, kejadian_id, mulai, berlaku_sampai, dibuat, diperbarui, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT (prov, kab, susulan) DO UPDATE SET pemicu = excluded.pemicu, kejadian_id = excluded.kejadian_id, diperbarui = excluded.diperbarui, berlaku_sampai = excluded.berlaku_sampai, dummy = 0,
        mulai = CASE WHEN berantai_peringatan.berlaku_sampai > excluded.diperbarui AND berantai_peringatan.dummy = 0 THEN berantai_peringatan.mulai ELSE excluded.mulai END`)
      .bind(prov, kab, s, jenis, kejadian, kini, kini + BERLAKU_HARI * HARI, kini, kini)));
  } catch (e) { if (!/no such table/i.test(String(e?.message || e))) console.error("berantai", e); }
}

const keluar = r => { const p = POLA[r.pemicu + ">" + r.susulan]; return {prov: r.prov, kab: r.kab, susulan: r.susulan, pemicu: r.pemicu, kejadian_id: r.kejadian_id, mulai: r.mulai, berlaku_sampai: r.berlaku_sampai,
  sisa_jam: Math.max(0, Math.round((r.berlaku_sampai - Date.now()) / 36e5)), laju: p.laju, lift: p.lift, ci95: p.ci95, n: p.n, teks: teksPola(r.pemicu, r.susulan), dummy: !!r.dummy}; };
async function daftar(env, req, url, kini) {
  return bacaStaf(env, req, async oleh => {
    const lj = await laju(env, "pd:" + oleh, "pusdalops_baca", [[3600e3, 120]], kini); if (lj) return lj;
    const a = url.searchParams.get("aktif"), p = cek(() => { if (a != null && a !== "1") tolak("aktif hanya boleh 1 (peringatan yang masih berlaku)"); const pv = url.searchParams.get("prov"); return pv == null ? null : kodeProv(pv); }); if (p.r) return p.r;
    const r = (await env.DB.prepare(`SELECT prov, kab, susulan, pemicu, kejadian_id, mulai, berlaku_sampai, dummy FROM berantai_peringatan WHERE berlaku_sampai > ?${p.v ? " AND prov = ?" : ""} ORDER BY berlaku_sampai DESC LIMIT ${MAKS_DAFTAR + 1}`)
      .bind(...p.v ? [kini, p.v] : [kini]).all()).results;
    return json({terpotong: r.length > MAKS_DAFTAR, catatan: "Pola deskriptif dari arsip logbook Pusdalops 2014-2025, bukan ramalan.", peringatan: r.slice(0, MAKS_DAFTAR).map(keluar)}, 200, NO_JSON);
  });
}
/* dummy: kab contoh; baris nyata (dummy = 0) tak pernah ditimpa */
async function dummy(env, req, kini) {
  return dummyStaf(env, req, async aksi => {
    if (aksi === "hapus") return json({ok: true, peringatan: (await env.DB.prepare("DELETE FROM berantai_peringatan WHERE dummy = 1").run()).meta.changes});
    if ((await env.DB.prepare("SELECT 1 x FROM berantai_peringatan WHERE dummy = 1 LIMIT 1").first())) return gagal(409, "data dummy peringatan berantai sudah ada; hapus dulu lewat tombol Hapus data dummy (Super Admin)");
    const C = [["33", "Banjarnegara", "banjir", 5], ["33", "Cilacap", "cuaca", 20], ["13", "Agam", "banjir", 40]], st = [];
    for (const [prov, kab, pemicu, jam] of C) for (const s of SUSULAN[pemicu]) st.push(env.DB.prepare("INSERT OR IGNORE INTO berantai_peringatan (prov, kab, susulan, pemicu, kejadian_id, mulai, berlaku_sampai, dibuat, diperbarui, dummy) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 1)")
      .bind(prov, kab, s, pemicu, kini - jam * 36e5, kini - jam * 36e5 + BERLAKU_HARI * HARI, kini, kini));
    await env.DB.batch(st);
    return json({ok: true, peringatan: st.length}, 201);
  });
}
const T = tabelBelum3;
export const RUTE_BERANTAI = {
  "GET /api/pusdalops/berantai": T((env, req, url, kini) => daftar(env, req, url, kini)),
  "POST /api/pusdalops/berantai/dummy": T((env, req, url, kini) => dummy(env, req, kini)),
};
