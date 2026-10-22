/* Fixture GET /api/sla (docs/bnpb/RENCANA-LANJUT.md §1.3 + Tambahan 22 Okt) untuk uji layar.
   SEMUA angka diturunkan dari satu data mentah (gangguan sumber, daftar tugas), bukan dikarang per widget. */
const MENIT = 60000, HARI = 864e5;
const persen = (gg, hari) => Math.round((1 - gg.reduce((a, g) => a + g.menit, 0) / (hari * 1440)) * 1000) / 10;
const pers = (xs, p) => { const s = xs.filter(x => x != null).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] : null; };
const pc = (xs, f) => xs.length ? Math.round(xs.filter(f).length / xs.length * 1000) / 10 : null;
export const KINI = Date.UTC(2026, 9, 22, 5, 0);
const gangguanMentah = {titik: [[3, 600], [11, 540]], cuaca: [[20, 130]], himawari: []};   // [hari lalu, menit]
/* satu tugas mentah: dt = menit deteksi ke tugas; flag tahap; akun = instansi */
const T = (prov, dt, o = {}) => ({prov, dt, konf: 1, tiba: 1, padam: 1, verif: 1, lagi: 0, lengkap: 1, gpsSah: 1, tepat: 1, bukanApi: 0, luasL: 10, luasS: 8, regu: 2, saran: 2, akun: "a1", ...o});
const TUGAS = [
  T("16", 20), T("16", 35), T("16", 50, {verif: 0}), T("16", 90, {lagi: 1}), T("16", 400, {tiba: 0, padam: 0, verif: 0, lengkap: 0, tepat: 0, luasL: null, regu: 1, akun: "a2"}),
  T("64", 15, {akun: "a2"}), T("64", 25, {gpsSah: 0, akun: "a2"}), T("64", 40, {bukanApi: 1, padam: 0, verif: 0, luasL: null, akun: "a2"}),
  T("62", 30), T("62", 60, {konf: 0, tiba: 0, padam: 0, verif: 0, lengkap: 0}), T("62", 75, {lengkap: 0, regu: 3, saran: 2}), T("62", 300, {tepat: 0, akun: "a3"}), T("62", 30, {akun: "a3"}), T("62", 45, {akun: "a3", luasL: 20, luasS: 8}),
];
const NAMA_PROV = {"16": "Sumatera Selatan", "64": "Kalimantan Timur", "62": "Kalimantan Tengah", "14": "Riau"}, INSTANSI = {a1: "Manggala Agni Sumsel", a2: "BPBD Kalimantan Timur", a3: "BPBD Kalimantan Tengah"};
export function fixture({hari = 30, prov = ""} = {}) {
  const sumber = [["titik", "Titik panas", 480, 99], ["cuaca", "Cuaca", 360, 98], ["himawari", "Himawari", 30, 95]].map(([id, nama, batas, slo]) => {
    const gg = (gangguanMentah[id] || []).filter(([h]) => h < hari).map(([h, m]) => ({mulai: KINI - h * HARI, selesai: KINI - h * HARI + m * MENIT, menit: m}));
    return {id, nama, batas_menit: batas, slo_target_pct: slo, segar_pct: persen(gg, hari), umur_p50: Math.round(batas / 5), umur_p95: Math.round(batas * 0.85), gangguan: gg};
  });
  const dalam = prov ? TUGAS.filter(t => t.prov === prov).map((t, i) => ({...t, kab: i % 2 ? ["1602", "Kabupaten Musi Banyuasin"] : ["1601", "Kabupaten Ogan Komering Ilir"]})) : TUGAS;
  const kel = prov ? Object.values(Object.groupBy(dalam, t => t.kab[0])).map(g => [g[0].kab[0], g[0].kab[1], g]) : Object.entries(Object.groupBy(dalam, t => t.prov)).map(([k, g]) => [k, NAMA_PROV[k], g]);
  const wilayah = kel.map(([kode, nama, g]) => ({kode, nama, n: g.length, tahap: {deteksi_tugas: {p50: pers(g.map(t => t.dt), .5), p90: pers(g.map(t => t.dt), .9)}}, terlambat_buka: g.filter(t => t.dt > 180).length}));
  if (!prov) wilayah.push({kode: "14", nama: "Riau", n: 0, tahap: {deteksi_tugas: {p50: null, p90: null}}, terlambat_buka: 0});
  const dt = dalam.map(t => t.dt), konf = dalam.filter(t => t.konf), tiba = konf.filter(t => t.tiba), padam = tiba.filter(t => t.padam), verif = padam.filter(t => t.verif);
  const proses = [["deteksi", dalam], ["tugas", dalam], ["konfirmasi", konf], ["tiba", tiba], ["padam", padam], ["terverifikasi", verif], ["muncul_lagi", dalam.filter(t => t.lagi)]].map(([tahap, l]) => ({tahap, n: l.length}));
  const tren = Array.from({length: Math.min(hari, 14)}, (_, i) => ({tanggal: new Date(KINI - (Math.min(hari, 14) - 1 - i) * HARI).toISOString().slice(0, 10), segar_pct: i === 5 ? 94.1 : 99.2 - (i % 3) * 0.4, deteksi_tugas_p50: i === 3 ? null : 40 + i * 4}));
  const dgLuas = dalam.filter(t => t.luasL != null), rasio = pers(dgLuas.map(t => Math.round(t.luasL / t.luasS * 10) / 10), .5);
  const akunIds = [...new Set(dalam.map(t => t.akun))];
  const lapangan = {isian_lengkap_pct: pc(dalam, t => t.lengkap), foto_gps_sah_pct: pc(dalam, t => t.gpsSah), gps_curiga_n: dalam.filter(t => !t.gpsSah).length, kabar_tepat_pct: pc(dalam, t => t.tepat),
    padam_terverifikasi_pct: pc(padam, t => t.verif), muncul_lagi_pct: pc(padam, t => t.lagi), bukan_api_pct: pc(dalam, t => t.bukanApi),
    n: {isian: dalam.length, foto: dalam.length * 3, kabar: dalam.length - 1, padam: padam.length, konfirmasi: konf.length},
    luas: {n: dgLuas.length, rasio_lapangan_satelit_p50: rasio, rasio_garis_satelit_p50: dgLuas.length ? 0.8 : null},
    taktik: {n: dalam.length, regu_nyata_per_saran_p50: pers(dalam.map(t => Math.round(t.regu / t.saran * 10) / 10), .5), personel_nyata_per_saran_p50: 0.9},
    regu: akunIds.map(a => { const g = dalam.filter(t => t.akun === a); return {akun: a, nama: INSTANSI[a], n: g.length, tiba_p50_menit: g.some(t => t.tiba) ? 120 : null, padam_p50_jam: null, isian_lengkap_pct: pc(g, t => t.lengkap), kabar_tepat_pct: pc(g, t => t.tepat)}; })};
  return {kini: KINI, hari, ...(prov ? {prov_nama: NAMA_PROV[prov]} : {}), sumber, tahap: [
    {dari: "deteksi", ke: "tugas", n: dalam.length, p50_menit: pers(dt, .5), p90_menit: pers(dt, .9), target_menit: null, dalam_target_pct: null},
    {dari: "tugas", ke: "konfirmasi", n: konf.length, p50_menit: 25, p90_menit: 140, target_menit: 60, dalam_target_pct: 83.3},
    {dari: "konfirmasi", ke: "tiba", n: tiba.length, p50_menit: 190, p90_menit: 700, target_menit: null, dalam_target_pct: null},
    {dari: "tiba", ke: "padam", n: 0, p50_menit: null, p90_menit: null, target_menit: null, dalam_target_pct: null}], wilayah, tren, proses,
    macet: [{tahap: "konfirmasi", n_menunggu: dalam.length - konf.length, n_lewat_target: dalam.length - konf.length}, {tahap: "tiba", n_menunggu: konf.length - tiba.length, n_lewat_target: null}], lapangan,
    himawari: {alarm: 14, terkunci: 9, hilang: 3, selisih_viirs_p50_menit: 55}, catatan: ["Tahap deteksi untuk 4 tugas dihitung dari saat tugas dibuat (perkiraan)."]};
}
