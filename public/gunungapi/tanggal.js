/* tanggal.js: adaptor gunung api untuk mesin bersama /inti/pilih_tanggal.js (PB-79b, F-36). Tanggal yang bisa dipilih HANYA tanggal pada jendela data erupsi
   (S.st.letusan_cakupan, dari status MAGMA); Hari ini atau Kemarin tanpa erupsi tercatat = tombol mati (D16: tidak menawarkan tanggal tanpa data).
   Memilih tanggal menyaring daftar dan peta ke gunung yang erupsi pada tanggal itu (S.tanggal, saring() di peta.js); level yang tampil tetap level terkini PVMBG.
   Berjalan hanya bila registri menyalakan kemampuan.layar.pilih_tanggal. Dimuat sesudah peta.js. */
(() => {
if (typeof PilihTanggal === "undefined" || typeof S === "undefined") return;
const host = () => document.getElementById("pilihTanggal");
const wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const segar = () => Peta.segarkan();   /* menggambar ulang titik, radius, dan daftar */
const waktu = () => (S.st?.letusan || []).map(e => Date.parse(e.waktu)).filter(Number.isFinite);
/* jendela data: dari tanggal pertama sampai tanggal terakhir cakupan erupsi; tanpa cakupan, hanya tanggal yang punya erupsi */
const jendela = () => { const c = S.st?.letusan_cakupan, a = c?.dari && Date.parse(c.dari), b = c?.sampai && Date.parse(c.sampai); return Number.isFinite(a) && Number.isFinite(b) ? {awal: wib(a), akhir: wib(b)} : null; };
const hitung = () => { const j = {}, w = jendela(); if (w) for (let t = w.awal; t <= w.akhir; t = wib(Date.parse(t + "T00:00:00Z") + 864e5)) j[t] = 0; for (const ms of waktu()) { const t = wib(ms); if (!w || t in j) j[t] = (j[t] || 0) + 1; } return j; };
const kalender = {satuan: "erupsi", get awal() { return jendela()?.awal; },
  ket: "Angka = jumlah erupsi tercatat hari itu (MAGMA, PVMBG). Yang bisa dibuka: tanggal pada jendela data erupsi.",
  terbanyak: {judul: "Terbanyak", n: 6},
  muat: async () => ({jumlah: hitung()}),
  bisa: t => { const w = jendela(); return w ? t >= w.awal && t <= w.akhir : t in hitung(); } };
PilihTanggal.pasang({id: "gunungapi", host, kalender, tanggal: waktu,
  ubah: iso => { S.tanggal = iso; segar(); }});
window.TanggalGunungapi = {hitung, kalender};
})();
