/* perlakuan.js (KI-40): mesin peringkat perlakuan bersama, fungsi murni tanpa DOM. Jalan di peramban (window.Perlakuan), Worker (importScripts), dan node.
   Diekstrak dari public/gunungapi/sim_tanggap.js. Baris perlakuan = {nama, biaya (Rp), selamat (manfaat: jiwa terselamatkan / orang-hari terbantu)}.
   Isi: front Pareto (tak ada baris lain yang manfaatnya >= dan biayanya <=), manfaat marginal per Rp miliar, bilangan acak bersama (common random numbers),
   kestabilan peringkat ansambel. Angka satuan (biaya, kapasitas) selalu dari pemanggil dan berstatus ASUMSI sampai ada sumbernya. Hasil simulasi, bukan prakiraan. */
(function (root, buat) {
  const P = buat();
  if (typeof module === "object" && module.exports) module.exports = P; else root.Perlakuan = P;
})(typeof self !== "undefined" ? self : globalThis, function () {
"use strict";
const mengalahkan = (c, b) => c.selamat >= b.selamat && c.biaya <= b.biaya && (c.selamat > b.selamat || c.biaya < b.biaya);

/* b.pareto = tak ada baris lain yang mengalahkannya */
function tandaiPareto(baris) { baris.forEach(b => { b.pareto = !baris.some(c => c !== b && mengalahkan(c, b)); }); return baris; }

/* front tampil: anggota pareto selain dasar yang menambah manfaat > minTambah, urut biaya naik; hasil kembar (manfaat dan biaya sama pada pembulatan) sekali saja;
   per_miliar = manfaat tambahan per Rp miliar biaya tambahan terhadap anggota front sebelumnya (dasar untuk yang pertama), null bila tak ada tambahan */
function front(baris, dasar, minTambah = 0.5) {
  const lihat = new Set(), par = baris.filter(b => b.pareto && b !== dasar && b.selamat > dasar.selamat + minTambah).sort((a, b) => a.biaya - b.biaya || b.selamat - a.selamat)
    .filter(b => { const k = Math.round(b.selamat) + "|" + Math.round(b.biaya / 1e5); return lihat.has(k) ? false : (lihat.add(k), true); });
  par.forEach((b, i) => { const p = i ? par[i - 1] : dasar, db = b.biaya - p.biaya, ds = b.selamat - p.selamat; b.per_miliar = db > 0 && ds > 0 ? ds / (db / 1e9) : null; });
  return par;
}

/* bilangan acak berbiji (mulberry32): biji sama, deret sama */
function acak(biji) { let a = biji >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* bilangan acak bersama: n undian x dim bilangan seragam, dibuat SEKALI lalu dipakai semua opsi, jadi beda hasil antar opsi murni karena opsinya, bukan nasib undian */
function undian(biji, n, dim) { const r = acak(biji); return Array.from({length: n}, () => Array.from({length: dim}, r)); }
const kuantil = (a, q) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };

/* kestabilan peringkat: tiap undian (sama untuk semua opsi) menghitung {selamat, biaya} lewat hitung(opsi, u); opsi diperingkat menurut manfaat per Rp (biaya 0 dan manfaat > 0 = terbaik).
   Keluaran per opsi: rank_rata (1 = terbaik), p_teratas, p_pareto (peluang ada di front), selamat {p10, med, p90}. */
function kestabilan(opsi, hitung, {biji = 1, n = 200, dim = 3} = {}) {
  const U = undian(biji, n, dim), rank = opsi.map(() => 0), atas = opsi.map(() => 0), par = opsi.map(() => 0), sel = opsi.map(() => []);
  for (const u of U) {
    const h = opsi.map(o => { const r = hitung(o, u); return {selamat: r.selamat, biaya: r.biaya}; });
    tandaiPareto(h);
    const rasio = x => x.biaya > 0 ? x.selamat / x.biaya : x.selamat > 0 ? Infinity : 0, urut = h.map((x, i) => i).sort((a, b) => rasio(h[b]) - rasio(h[a]) || a - b);
    urut.forEach((i, r) => { rank[i] += r + 1; if (r === 0) atas[i]++; });
    h.forEach((x, i) => { if (x.pareto) par[i]++; sel[i].push(x.selamat); });
  }
  return opsi.map((o, i) => ({nama: o.nama, rank_rata: rank[i] / n, p_teratas: atas[i] / n, p_pareto: par[i] / n, selamat: {p10: kuantil(sel[i], .1), med: kuantil(sel[i], .5), p90: kuantil(sel[i], .9)}}));
}

return {tandaiPareto, front, acak, undian, kestabilan};
});
