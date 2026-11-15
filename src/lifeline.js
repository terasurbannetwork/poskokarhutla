/* Status Lifeline LF-05: rute baca kisi, baca sel, tetapkan status. Kontrak: data/kajian-bnpb/lifeline/DESAIN-TEKNIS.md Rute, KEAMANAN-PRIVASI, KEPUTUSAN D3/D4/Q2/Q7.
   TIDAK menyentuh env.DB: SQL ada di bagian Status Lifeline src/hak.js. Digabung ke RUTE_SIKLUS (src/siklus.js); BPBD lewat /api/instansi/siklus/..., di luar kab wilayahnya = 404 seragam.
   Migrasi 0141/0142 belum tentu terapan di produksi: tabel atau indeks hilang = 503 berpesan jelas, bukan 500. */
import {json, gagal} from "./worker.js";
import {tolak} from "./pusdalops_umum.js";
import * as H from "./hak.js";
import {normalWA} from "./nomor.js";
import {NO, bodi, masukan, kab4Sah, lihat, lihatTulis, dalamBP, ujiLaju, polos, bersihNama} from "./siklus_kejadian.js";

const SEGAR_MS = 15 * 60e3, BASI_MS = 24 * 36e5;
const MIGRASI = "Status Lifeline belum diaktifkan (migrasi belum diterapkan)";
const tanpaMigrasi = e => /no such (table|index)/i.test(String(e?.message || e));
const aman = async f => { try { return await f(); } catch (e) { if (tanpaMigrasi(e)) return gagal(503, MIGRASI); throw e; } };
const lihatOleh = h => h.sa || h.pd || h.ko;   // pimpinan, moderator biasa, dan BPBD tidak melihat siapa yang menetapkan
const tanpaOleh = (c, o) => { if (lihatOleh(c.h)) return o; const {oleh, ...sisa} = o; return sisa; };
/* nomor telepon di catatan ditolak (bukan dibuang): tiap rangkaian angka (spasi, strip, titik boleh di dalamnya, huruf memutus) yang lolos normalWA */
const adaNomor = t => (t.match(/\+?\d(?:[\d .\-]*\d)?/g) ?? []).some(m => normalWA(m));
/* hitung ulang usulan paling sering sekali per 15 menit per kejadian (penanda per isolat, juga untuk hasil kosong) dan dibatasi laju per akun; kena batas = layani cache apa adanya */
const TERAKHIR = new Map();
async function hitung(c) {
  if (c.kini - (TERAKHIR.get(c.p.id) ?? 0) < SEGAR_MS) return false;
  if (await ujiLaju(c, "lf.hitung", 20)) return false;
  TERAKHIR.set(c.p.id, c.kini);
  if (TERAKHIR.size > 500) TERAKHIR.delete(TERAKHIR.keys().next().value);
  await H.lfHitungUsulan(c.env, H.pelakuLfTulis, c.p.id, c.kini);
  return true;
}

async function kejadian(c, tulis = false) {
  const k = await H.skKejadianRingkas(c.env, c.h.pelaku, c.p.id);
  return (tulis ? lihatTulis : lihat)(c, k) ? k : null;
}
const segar = (usulan, kini) => usulan.length > 0 && usulan.every(d => d != null && kini - d < SEGAR_MS);

async function kisi(c) {
  if (!(await kejadian(c))) return NO();
  return aman(async () => {
    let g = await H.lfKisi(c.env, H.pelakuLfBaca, c.p.id);
    g = g.filter(x => dalamBP(c, [x.kab4]));
    if (c.h.tipe === "bp" && !g.length) return NO();
    const dihitung = g.flatMap(x => Object.values(x.layanan).map(s => s.usulan?.dihitung ?? null));
    if (g.length && !segar(dihitung, c.kini) && await hitung(c)) {
      g = (await H.lfKisi(c.env, H.pelakuLfBaca, c.p.id)).filter(x => dalamBP(c, [x.kab4]));
    }
    return json({kejadian_id: c.p.id, dasar: "status resmi ditetapkan staf; usulan hanyalah saran dari isyarat",
      kab: g.map(x => ({kab4: x.kab4, layanan: Object.fromEntries(Object.entries(x.layanan).map(([l, s]) => [l, {...s, basi: s.diubah != null && c.kini - s.diubah > BASI_MS}]))}))});
  });
}

async function sel(c) {
  const q = c.url.searchParams, kab4 = q.get("kab4"), layanan = q.get("layanan");
  masukan(() => { kab4Sah(kab4); if (!H.LF_LAYANAN.includes(layanan)) tolak("layanan tidak dikenal"); });
  if (!(await kejadian(c)) || !dalamBP(c, [kab4])) return NO();
  return aman(async () => {
    let s = await H.lfSel(c.env, H.pelakuLfBaca, c.p.id, kab4, layanan);
    if (!s) return NO();
    if (!segar([s.usulan?.dihitung ?? null], c.kini) && await hitung(c)) { s = await H.lfSel(c.env, H.pelakuLfBaca, c.p.id, kab4, layanan); }
    const basi = s.status.diubah != null && c.kini - s.status.diubah > BASI_MS;
    return json({...s, status: {...tanpaOleh(c, s.status), basi}, riwayat: s.riwayat.map(r => tanpaOleh(c, r))});
  });
}

async function tetapkan(c) {
  const b = await bodi(c);
  if (!(await kejadian(c, true))) return NO();
  masukan(() => {
    if (!polos(b)) tolak("badan harus objek");
    kab4Sah(b.kab4);
    if (b.catatan != null && typeof b.catatan !== "string") tolak("catatan harus teks");
    if (b.catatan) b.catatan = bersihNama(b.catatan, 1000);
    if (b.catatan && adaNomor(b.catatan)) tolak("catatan tidak boleh memuat nomor telepon");
  });
  if (!dalamBP(c, [b.kab4])) return NO();
  const lj = await ujiLaju(c, "lf.tetapkan", 60); if (lj) return lj;
  return aman(async () => {
    const ok = await H.lfTetapkan(c.env, H.pelakuLfTulis, {kejadianId: c.p.id, kab4: b.kab4, layanan: b.layanan, warna: b.warna, catatan: b.catatan, bukti: b.bukti, oleh: c.h.oleh}, c.kini);
    return ok ? json({ok: true, kab4: b.kab4, layanan: b.layanan, warna: b.warna}, 201) : NO();
  });
}

export const RUTE_LIFELINE = {
  "GET /api/siklus/kejadian/:id/lifeline": {izin: ["STAF", "BP"], f: kisi},
  "GET /api/siklus/kejadian/:id/lifeline/sel": {izin: ["STAF", "BP"], f: sel},
  "POST /api/siklus/kejadian/:id/lifeline": {izin: ["PDKO", "BP"], f: tetapkan},
};
