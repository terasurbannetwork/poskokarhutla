/* Data dummy SLA (Super Admin; ~/.claude/DUMMY.md). Satu kumpulan data MENTAH yang konsisten: akun, tugas, isian, foto, penugasan, garis, muncul lagi, riwayat status, alarm Himawari.
   Semua angka /api/sla lahir dari rantai yang sama lewat hitungSla (bukan konstanta). Penanda yang dipakai hapus: tugas di kabupaten contoh KAB_D dengan dummy = 1 (isian, foto,
   penugasan, garis ikut lewat ON DELETE CASCADE), akun berawalan dummysla, sumber status berawalan dummy_ (status_riwayat tak punya kolom dummy), alarm dengan id berawalan "dummy". */
import {json, gagal, acak, bacaBody} from "./worker.js";
import {superOK} from "./posko.js";

const MENIT = 60e3, JAM = 60 * MENIT, PROV_D = "62", KAB_D = ["Contoh SLA A", "Contoh SLA B", "Contoh SLA C"], BANYAK_JAM = 168;
/* [umur jam, menit ke konfirmasi (null = belum), menit konfirmasi ke tiba, jam dibuat ke padam, padam_verif, hasil, selang kabar jam, foto (0 tanpa, 1 sah, 2 curiga), [luas sat, lapangan, garis], [saran regu, personel], [nyata regu, personel], status] */
const SKENARIO = [
  [400, 90, 90, 30, "padam_terverifikasi", "api_ada", 20, 1, [100, 80, 90], [4, 60], [3, 45]],
  [300, 400, 200, 60, "padam_dilaporkan", "api_ada", 30, 1, [60, 70, 50], [3, 40], [4, 50]],
  [200, 60, 60, 40, "muncul_lagi", "api_ada", 18, 2, [40, 30, 35], [2, 30], [2, 20]],
  [150, 120, null, null, null, "bukan_api", null, 1, null, null, null, "bukan_api"],
  [100, 45, 55, null, null, "api_ada", 22, 1, [80, 100, 60], [5, 75], [6, 80]],
  [80, 500, null, null, null, "api_ada", null, 0, [30, null, null], [2, 30], null],
  [50, 30, null, null, null, "api_ada", 10, 1, [20, 15, 18], [1, 15], [1, 12]],
  [30, null, null, null, null, "api_ada", null, 0, [50, null, null], [3, 45], null],
  [3, null, null, null, null, "api_ada", null, 0, null, null, null],
  [250, 200, 120, 70, "padam_terverifikasi", "sudah_padam", 15, 2, [90, 85, 80], [4, 60], [4, 55]],
  [120, 75, 100, 50, "padam_terverifikasi", "api_ada", 21, 1, [70, 60, 66], [3, 45], [3, 40]],
  [20, 40, 70, null, null, "api_ada", 12, 1, [25, 22, 24], [2, 30], [2, 28]],
];
async function isi(env, kini, oleh) {
  if ((await env.DB.prepare(`SELECT count(*) n FROM tugas_api WHERE dummy = 1 AND prov = ?1 AND kab IN (${KAB_D.map((_, i) => "?" + (i + 2)).join(",")})`).bind(PROV_D, ...KAB_D).first()).n) return gagal(409, "data dummy SLA sudah ada; hapus dulu dengan 🧹");
  const st = [], akun = KAB_D.map((kab, i) => ({id: acak(8), kab, i}));
  for (const a of akun) st.push(env.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, 'pemkab', 'kab', ?, ?, ?, ?, ?, ?, ?, 'aktif', '[DUMMY] Petugas', '198001012005011001', 'Kepala', 'BPBD', 'dummy@contoh.id', '6281234567890', 1, 1, 0, ?, 1)`)
    .bind(a.id, `dummysla${a.i + 1}`, `[DUMMY] Pemkab ${a.kab}`, `dummysla|${a.kab}`, JSON.stringify([PROV_D]), PROV_D, a.kab, "g".repeat(32), "a".repeat(64), kini - 40 * 24 * JAM));
  const tugasId = [];
  SKENARIO.forEach((S, n) => {
    const [umur, konfMnt, tibaMnt, padamJam, verif, hasil, selang, foto, luas, saran, nyata, statusX] = S, a = akun[n % 3], id = acak(8), dibuat = kini - umur * JAM; tugasId.push(id);
    const konfPada = konfMnt == null ? null : dibuat + konfMnt * MENIT, tiba = konfPada != null && tibaMnt != null ? konfPada + tibaMnt * MENIT : null, padamPada = padamJam == null ? null : dibuat + padamJam * JAM;
    const awalViirs = dibuat - (20 + n * 7) * MENIT, himawari = n % 3 === 0 ? awalViirs - 40 * MENIT : null, lat = -2.5 - n * 0.05, lon = 114 + n * 0.05;
    const kabar = [];
    if (konfPada != null && selang != null) for (let t = konfPada + selang * JAM; t < Math.min(kini, padamPada ?? kini); t += selang * JAM) kabar.push(t);
    const status = statusX ?? (verif === "muncul_lagi" ? "buka" : padamPada != null ? "padam" : "buka");
    const rek = saran ? JSON.stringify({kebutuhan: {total: {regu: [saran[0] - 1, saran[0], saran[0] + 1], personel: [saran[1] - 5, saran[1], saran[1] + 5]}}}) : null;
    st.push(env.DB.prepare(`INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir, rekomendasi, padam_verif, padam_pada, verif_pada, dummy, terdeteksi_awal, himawari_awal, sumber_awal)
      VALUES (?, ?, ?, 'Kec Contoh', ?, ?, 3, 12, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`).bind(id, PROV_D, a.kab, lat, lon, luas ? luas[0] : null, dibuat, dibuat, status, konfPada, kabar.at(-1) ?? konfPada, rek, verif, padamPada,
      verif === "padam_terverifikasi" && padamPada != null ? padamPada + 48 * JAM : null, awalViirs, himawari, himawari ? "himawari" : "viirs"));
    if (verif === "muncul_lagi") st.push(env.DB.prepare("INSERT INTO tugas_muncul (tugas_id, waktu, sumber, jarak_km, keterangan) VALUES (?, ?, 'firms', 1.2, '[DUMMY]')").bind(id, padamPada + 10 * JAM));
    if (konfPada == null) return;
    const ik = acak(8);
    st.push(env.DB.prepare(`INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, akurasi, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa, personel_terlihat, dummy)
      VALUES (?, ?, ?, ?, 'konfirmasi', ?, ?, ?, 20, ?, ?, '[DUMMY] PIC', 'Kepala regu', '6281234567890', 8, 1)`).bind(ik, id, a.id, "dummy" + acak(6), konfPada, lat, lon, konfPada, hasil));
    if (foto) st.push(env.DB.prepare(`INSERT INTO instansi_media (id, akun_id, tugas_id, isian_id, jenis, mime, ukuran, waktu_ambil, sumber_waktu, lat, lon, akurasi, waktu_gps, gps_curiga, dibuat, dummy)
      VALUES (?, ?, ?, ?, 'foto', 'image/jpeg', 1000, ?, 'gps', ?, ?, 20, ?, ?, ?, 1)`).bind(acak(8), a.id, id, ik, konfPada, lat, lon, konfPada, foto === 2 ? "GPS foto berbeda jauh dari GPS perangkat (dummy)" : null, konfPada));
    const tindakan = kabar.length || !nyata || selang == null ? kabar : [konfPada + selang * JAM / 2];   // tugas baru: satu kabar lebih cepat dari selang agar status api tetap terisi
    tindakan.forEach((t, j) => st.push(env.DB.prepare(`INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, status_api, luas_ha, padam_ha, regu, personel, dummy) VALUES (?, ?, ?, ?, 'tindakan', ?, ?, ?, ?, ?, ?, 1)`)
      .bind(acak(8), id, a.id, "dummy" + acak(6), t, padamPada != null && j === tindakan.length - 1 ? "padam" : "menyala", luas?.[1] ?? null, luas?.[1] != null ? luas[1] * 0.5 : null, nyata?.[0] ?? null, nyata?.[1] ?? null)));
    if (tiba != null) st.push(env.DB.prepare(`INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, orang, token_sha, status, dibuat, kedaluwarsa, berangkat_pada, tiba_pada, dummy) VALUES (?, ?, ?, ?, 'ketua_regu', 12, ?, 'selesai', ?, ?, ?, ?, 1)`)
      .bind(acak(8), id, a.id, `[DUMMY] Regu ${n + 1}`, acak(32), konfPada, konfPada + 48 * JAM, tiba - 30 * MENIT, tiba));
    if (luas?.[2] != null) st.push(env.DB.prepare(`INSERT INTO ops_garis (id, tugas_id, jenis, koordinat, n_titik, panjang_km, luas_ha, tertutup, sumber, oleh, dibuat, dummy) VALUES (?, ?, 'garis_api', '[[114,-2.5],[114.01,-2.5],[114.01,-2.51]]', 3, 2, ?, 1, 'kirim', 'dummy', ?, 1)`).bind(acak(8), id, luas[2], konfPada));
  });
  /* riwayat status 7 hari: tiga sumber, tiap 50 jam satu gangguan 3 jam (segar = 0) */
  const slot = Math.floor(kini / JAM);
  for (const [nama, batas, geser] of [["dummy_titik", 480, 0], ["dummy_berita", 1800, 17], ["dummy_himawari", 180, 31]])
    st.push(env.DB.prepare(`WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < ?1)
      INSERT OR REPLACE INTO status_riwayat (slot, sumber, umur_menit, batas_menit, segar) SELECT ?2 - i, ?3, CASE WHEN (i + ?5) % 50 < 3 THEN ?4 + 120 + (i + ?5) % 50 * 30 ELSE ((i * 37 + ?5) % (?4 * 6 / 10)) + 10 END, ?4,
        CASE WHEN (i + ?5) % 50 < 3 THEN 0 ELSE 1 END FROM n`).bind(BANYAK_JAM - 1, slot, nama, batas, geser));
  /* alarm Himawari: terkunci pada tugas dummy yang punya himawari_awal, satu siaga, satu hilang */
  const alarm = (stt, tugas, pertama, terakhir, n, k) => env.DB.prepare(`INSERT INTO alarm_himawari (id, lat, lon, radius_m, pertama, terakhir, n_pindai, frp, status, tugas_id, terkunci_pada, dikabarkan_pada) VALUES (?, ?, ?, 2000, ?, ?, ?, 40, ?, ?, ?, ?)`)
    .bind("dummy" + acak(6).slice(0, 11), -2.5 - k * 0.2, 114.4 + k * 0.1, pertama, terakhir, n, stt, tugas, tugas ? pertama + 90 * MENIT : null, pertama);
  [0, 3, 6, 9].forEach((n, k) => st.push(alarm("terkunci", tugasId[n], kini - SKENARIO[n][0] * JAM - 60 * MENIT, kini - SKENARIO[n][0] * JAM, 4, k)));
  st.push(alarm("siaga", null, kini - 2 * JAM, kini - 20 * MENIT, 3, 5), alarm("hilang", null, kini - 30 * JAM, kini - 24 * JAM, 2, 6));
  for (let i = 0; i < st.length; i += 40) await env.DB.batch(st.slice(i, i + 40));
  return json({ok: true, akun: akun.length, tugas: SKENARIO.length, riwayat_jam: BANYAK_JAM * 3, alarm: 6, oleh}, 201);
}
async function hapus(env) {
  const w = `prov = ?1 AND dummy = 1 AND kab IN (${KAB_D.map((_, i) => "?" + (i + 2)).join(",")})`, ar = [PROV_D, ...KAB_D], mine = `tugas_id IN (SELECT id FROM tugas_api WHERE ${w})`;
  const n = async (t, w2, ...a) => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w2}`).bind(...a).first()).n, RIW = "sumber LIKE 'dummy\\_%' ESCAPE '\\'";
  const hasil = {tugas: await n("tugas_api", w, ...ar), isian: await n("tugas_isian", mine, ...ar), alarm: await n("alarm_himawari", "id LIKE 'dummy%'"), riwayat: await n("status_riwayat", RIW)};
  await env.DB.batch([env.DB.prepare(`DELETE FROM tugas_muncul WHERE ${mine}`).bind(...ar), env.DB.prepare("DELETE FROM alarm_himawari WHERE id LIKE 'dummy%'"),
    env.DB.prepare(`DELETE FROM status_riwayat WHERE ${RIW}`), env.DB.prepare(`DELETE FROM tugas_api WHERE ${w}`).bind(...ar),
    env.DB.prepare("DELETE FROM instansi_akun WHERE dummy = 1 AND username LIKE 'dummysla%'")]);
  return json({ok: true, ...hasil});
}
export async function dummySla(env, req, kini) {
  const oleh = await superOK(env, req); if (!oleh) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi !== "isi" && b.o.aksi !== "hapus") return gagal(400, "aksi harus isi/hapus");
  try { return b.o.aksi === "isi" ? await isi(env, kini, oleh) : await hapus(env); }
  catch (e) { if (/no such (table|column)/i.test(String(e?.message || e))) return gagal(503, "SLA belum aktif (migrasi 0042/0043 belum diterapkan)"); throw e; }
}
