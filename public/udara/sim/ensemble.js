/* ensemble.js — ensemble di luar utas utama (dipanggil ensemble.worker.js; murni, diuji lewat model.js dan tanggap.js).
   Tiap anggota: simulasi penuh dengan angin/arah/tinggi lapisan campuran/emisi diganggu, deret PM2,5 tiap kota, dan orang-hari tiap kandidat perlakuan
   (peringkat dijalankan ulang di anggota itu, memakai kontribusi per grup sumber anggota itu), supaya kestabilan urutan bisa dinilai. */
import * as M from "./model.js";
import * as T from "./tanggap.js";
export function jalankanEnsemble(c, lapor = () => {}) {
  const ang = M.anggotaEnsemble(c.n, 7, c.sdApi), seri = c.kota.map((_, i) => [c.pmDasar[i]]), ohAng = [];
  ang.forEach((a, m) => {
    const h = M.jalankan(c.A, c.src, c.kota, a.skn, a.seed), pm = c.kota.map((_, i) => M.pmKota(c.prak, c.dasar, h, c.K, i, c.A));
    pm.forEach((p, i) => seri[i].push(p));
    const urut = M.urutPerlakuan(c.A, c.prak, h, c.K, c.jiwa, pm), lis = T.peringkat(c.A, c.prak, h, c.K, c.jiwa, pm, urut, c.fk, {semua: true}), peta = new Map(lis.map(x => [x.jenis + "|" + x.id, x.oh]));
    ohAng.push(c.kunci.map(k => peta.get(k) ?? 0)); lapor(m + 2, ang.length + 1);
  });
  return {seri, ohAng};
}
