/* tanggap.js — lapis tanggap simulasi asap (murni, diuji `node --test tests/udara/`): ruang udara bersih, masker N95, beban ISPA terhadap faskes,
   dan peringkat perlakuan menurut orang-hari paparan Tidak sehat yang terhindar dan biaya Rp. Tiap kandidat mengubah deret PM2,5 kota (atau memakai
   hitungan model yang sama untuk padamkan kompleks dan kurangi PLTU), lalu diukur dengan paparan() yang sama. Satuan biaya adalah ASUMSI. */
import {KONF, paparan, ispaHari, deret, pmDariDeret, sekolahHindar, hariKerjaSekolah} from "./model.js";

export const TANGGAP = {
  masker: {harga: 15000, cakupan: .3, patuh: .5, proteksi: .6},
  ruang: {kapRs: 50, kapSekolah: 200, maksUnit: 20, unit: 6e6, opHari: 3e5, rasioIO: .3, pakai: .5},
  pltu: {kurang: .5, selisihKwh: 800},
  api: {reguHari: 12e6, apiPerRegu: .5, ukuranApi: 30, hari: 3},
  sekolah: {perMuridHari: 25000}
};
export const ASUMSI_TANGGAP = [
  {nama: "Masker N95", nilai: `Rp${TANGGAP.masker.harga.toLocaleString("id-ID")} per orang untuk 72 jam, dibagikan ke ${TANGGAP.masker.cakupan * 100}% penduduk kota; ${TANGGAP.masker.patuh * 100}% memakai tepat waktu, mengurangi paparan ${TANGGAP.masker.proteksi * 100}%`, sumber: "asumsi; harga pasar, proteksi nyata masker lapangan berkisar 0,3 sampai 0,7"},
  {nama: "Ruang udara bersih", nilai: `sekolah dan faskes terdekat (maks ${TANGGAP.ruang.maksUnit} per kota), ${TANGGAP.ruang.kapRs} orang per faskes, ${TANGGAP.ruang.kapSekolah} per sekolah, rasio dalam/luar ${TANGGAP.ruang.rasioIO} dengan pembersih HEPA, dipakai ${TANGGAP.ruang.pakai * 100}% waktu; Rp${TANGGAP.ruang.unit / 1e6} juta per ruang + Rp${TANGGAP.ruang.opHari / 1e3} ribu per hari`, sumber: "asumsi; fasilitas dari public/data/fasilitas.json (OSM), kantor belum ada datanya"},
  {nama: "Kurangi PLTU", nilai: `${TANGGAP.pltu.kurang * 100}% keluaran semua PLTU di kisi, biaya selisih pembangkit pengganti Rp${TANGGAP.pltu.selisihKwh} per kWh`, sumber: "asumsi; selisih biaya pokok gas/BBM dengan batu bara"},
  {nama: "Padamkan kompleks", nilai: `kejadian = luas / ${TANGGAP.api.ukuranApi} ha, ${TANGGAP.api.apiPerRegu} kejadian per regu-hari, Rp${TANGGAP.api.reguHari / 1e6} juta per regu-hari`, sumber: "ukuran_api dan api_per_regu_hari dari keputusan.json (asumsi lemah); biaya regu asumsi"},
  {nama: "Libur sekolah", nilai: `Rp${TANGGAP.sekolah.perMuridHari.toLocaleString("id-ID")} per murid-hari pembelajaran pengganti`, sumber: "asumsi"},
  {nama: "ISPA tambahan", nilai: "sama dengan kartu Dampak (RR 1,019 per 10 µg/m³, 9,3% per bulan insidensi dasar)", sumber: "Héroux dkk. 2015; Riskesdas 2018; proksi rawat inap, bukan fungsi ISPA"}
];

/* fasilitas.json -> per kota {sekolah, rs, faskes}: titik masuk ke kota prakiraan terdekat dalam 0,55 derajat (Voronoi kasar, bukan batas administrasi) */
export function fasilitasKota(fas, kota, maks = .55) {
  const o = kota.map(() => ({sekolah: 0, rs: 0, faskes: 0})), cs = kota.map(k => Math.cos(k.lat * Math.PI / 180));
  for (const f of fas || []) { if (!(f.t in o[0] || o.length && f.t in o[0])) continue; let b = -1, bd = maks * maks;
    for (let i = 0; i < kota.length; i++) { const dx = (f.lon - kota[i].lon) * cs[i], dy = f.lat - kota[i].lat, d = dx * dx + dy * dy; if (d < bd) { bd = d; b = i; } }
    if (b >= 0) o[b][f.t]++; }
  return o;
}
/* orang-hari = jiwa-jam di atas ambang / 24; ISPA tambahan dari deret yang sama */
const ukur = (pm, jiwa) => ({oh: paparan(pm, jiwa).jj / 24, ispa: ispaHari(pm, jiwa).t});
const skala = (pm, f) => Float32Array.from(pm, v => v * f);
const efek = (pm0, pm1, jiwa) => { const a = ukur(pm0, jiwa), b = ukur(pm1, jiwa); return {oh: a.oh - b.oh, ispa: a.ispa - b.ispa}; };
const rp = v => v >= 1e12 ? (v / 1e12).toLocaleString("id-ID", {maximumFractionDigits: 1}) + " triliun" : v >= 1e9 ? (v / 1e9).toLocaleString("id-ID", {maximumFractionDigits: 1}) + " miliar" : v >= 1e6 ? Math.round(v / 1e6).toLocaleString("id-ID") + " juta" : Math.round(v).toLocaleString("id-ID");
export const rupiah = v => "Rp" + rp(v);

/* Perlakuan yang melindungi sebagian penduduk: bagian f terlindung, PM yang mereka hirup dikali p, sisanya tetap. Diukur per kelompok (bukan PM kota dikali rata-rata)
   karena ambang Tidak sehat bersifat loncatan: mengencerkan PM semua orang sedikit tidak melewati ambang, padahal sebagian orang terlindung penuh. */
export const maskerGrup = (m = TANGGAP.masker, kali = 1) => ({f: Math.min(1, m.cakupan * m.patuh), p: 1 - Math.min(1, m.proteksi * kali)});
export function ruangKota(f, jiwa, r = TANGGAP.ruang, kali = 1) {
  const faskes = Math.min(f.rs + f.faskes, r.maksUnit), sek = Math.min(f.sekolah, r.maksUnit - faskes), kap = faskes * r.kapRs + sek * r.kapSekolah, unit = faskes + sek;
  return {unit, kap, f: jiwa > 0 ? Math.min(1, kap / jiwa) : 0, p: 1 - Math.min(1, r.pakai * (1 - r.rasioIO) * kali), biaya: unit * (r.unit + r.opHari * 3)};
}
export const efekGrup = (pm, jiwa, g) => { const a = ukur(pm, jiwa), x = ukur(pm, jiwa * (1 - g.f)), y = ukur(skala(pm, g.p), jiwa * g.f); return {oh: a.oh - x.oh - y.oh, ispa: a.ispa - x.ispa - y.ispa}; };
/* beban ISPA tambahan per kota terhadap jumlah faskes (rs + faskes di fasilitas.json; cakupan OSM tidak lengkap) */
export function bebanRS(kota, jiwa, pmDasar, fk) {
  return kota.map((c, i) => { const q = ispaHari(pmDasar[i], jiwa[i]), n = fk ? fk[i].rs + fk[i].faskes : 0; return {i, nama: c.nama, ispa: q.t, lo: q.lo, hi: q.hi, faskes: n, perFaskes: n ? q.t / n : null}; })
    .filter(x => x.ispa >= 1).sort((a, b) => b.ispa - a.ispa);
}

/* Kandidat dijalankan semua, diperingkat menurut orang-hari terhindar. in: urut = keluaran urutGen (kompleks dan sekolah, sudah punya jj/lo/hi), fk = fasilitasKota.
   Per jenis hanya yang teratas dipertahankan (kompleks 6, sekolah 4, masker 4, ruang 4) supaya satu jenis tidak memenuhi seluruh daftar. */
export function peringkat(A, prak, dasar, K, jiwa, pmDasar, urut, fk, o = {}) {
  const T = TANGGAP, out = [], per = {kompleks: o.kompleks ?? 6, sekolah: o.sekolah ?? 4, masker: o.masker ?? 4, ruang: o.ruang ?? 4};
  for (const x of urut) { if (x.jenis === "kompleks") { const G = dasar.grup[x.g], kej = Math.max(1, Math.round((G.luas || T.api.ukuranApi) / T.api.ukuranApi));
      out.push({jenis: "kompleks", g: x.g, id: x.id, nama: `Padamkan ${x.nama}`, oh: x.jj / 24, lo: (x.lo ?? x.jj) / 24, hi: (x.hi ?? x.jj) / 24, ispa: x.ispa || 0, biaya: kej / T.api.apiPerRegu * T.api.reguHari}); }
    else if (x.jenis === "sekolah") { let hr = new Set(); for (let b = 0; b < KONF.jam; b++) if (hariKerjaSekolah(A, b)) hr.add(Math.floor(b / 24));
      out.push({jenis: "sekolah", ci: x.ci, id: x.id, nama: `Liburkan sekolah di ${x.nama}`, oh: x.jj / 24, lo: (x.lo ?? x.jj) / 24, hi: (x.hi ?? x.jj) / 24, ispa: 0, biaya: jiwa[x.ci] * KONF.anak * hr.size * T.sekolah.perMuridHari}); } }
  const mk = [], rg = [];
  prak.kota.forEach((c, i) => { if (!jiwa[i] || paparan(pmDasar[i], jiwa[i]).jj <= 0) return;
    const m = efekGrup(pmDasar[i], jiwa[i], maskerGrup());
    if (m.oh > 0) mk.push({jenis: "masker", id: c.kode, nama: `Masker N95 untuk ${c.nama}`, oh: m.oh, lo: efekGrup(pmDasar[i], jiwa[i], maskerGrup(T.masker, .5)).oh, hi: efekGrup(pmDasar[i], jiwa[i], maskerGrup(T.masker, 1.5)).oh, ispa: m.ispa, biaya: jiwa[i] * T.masker.cakupan * T.masker.harga});
    const r = fk?.[i] && ruangKota(fk[i], jiwa[i]); if (r?.unit) { const e = efekGrup(pmDasar[i], jiwa[i], r);
      if (e.oh > 0) rg.push({jenis: "ruang", id: c.kode, nama: `Ruang udara bersih di ${r.unit} fasilitas ${c.nama}`, oh: e.oh, lo: efekGrup(pmDasar[i], jiwa[i], ruangKota(fk[i], jiwa[i], T.ruang, .5)).oh, hi: efekGrup(pmDasar[i], jiwa[i], ruangKota(fk[i], jiwa[i], T.ruang, 1.5)).oh, ispa: e.ispa, biaya: r.biaya}); } });
  /* PLTU: kontribusi mentah dikurangi T.pltu.kurang di tiap kota (nilai fisik langsung, sama seperti skenario PLTU mati) */
  let oh = 0, ispa = 0, ada = false;
  prak.kota.forEach((c, i) => { if (!jiwa[i]) return; const pl = deret(dasar, i, "pltu"), api = deret(dasar, i, "api"); if (!pl.some(v => v > .05)) return;
    const pS = Float32Array.from(pl, v => v * (1 - T.pltu.kurang)), n = pmDariDeret(prak, i, A, api, api, pl, pS, K), e = efek(pmDasar[i], n, jiwa[i]); oh += e.oh; ispa += e.ispa; ada = true; });
  const mwh = dasar.sumber.filter(q => q.jenis === "pltu").reduce((s, q) => s + q.mw * q.fk * KONF.jam * T.pltu.kurang, 0);
  if (ada && oh > 0) out.push({jenis: "pltu", id: "pltu", nama: `Kurangi keluaran PLTU ${T.pltu.kurang * 100}%`, oh, lo: oh * .7, hi: oh * 1.3, ispa, biaya: mwh * 1000 * T.pltu.selisihKwh});
  const ambil = (a, jenis) => a.sort((x, y) => y.oh - x.oh).slice(0, per[jenis]);
  const semua = [...out.filter(x => x.jenis === "pltu"), ...ambil(out.filter(x => x.jenis === "kompleks"), "kompleks"), ...ambil(out.filter(x => x.jenis === "sekolah"), "sekolah"), ...ambil(mk, "masker"), ...ambil(rg, "ruang")];
  for (const x of semua) { if (x.lo > x.oh) x.lo = x.oh; if (x.hi < x.oh) x.hi = x.oh; x.perOh = x.biaya > 0 && x.oh > 0 ? x.biaya / x.oh : null; }
  return semua.filter(x => x.oh >= 1).sort((a, b) => b.oh - a.oh);
}
