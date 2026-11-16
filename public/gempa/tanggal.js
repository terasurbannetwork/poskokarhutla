/* tanggal.js: adaptor gempa untuk mesin bersama /inti/pilih_tanggal.js (PB-73, F-36). Pilihan tambahan di bawah segmen 24 jam/72 jam/7 hari:
   Hari ini, Kemarin = tanggal WIB yang PUNYA gempa di S.gempa (data 7 hari dari /api/gempa/terbaru?jam=168). Tanggal lain = kalender (inti/kalender.js, PB-79):
   30 hari terakhir semuanya bisa dibuka (hari 0 gempa sah); jumlah per tanggal WIB dari /api/gempa/terbaru?jam=720, dimuat SEKALI saat kalender pertama dibuka
   dan disimpan di S.gempa30 (peta.js memakainya untuk tanggal yang lebih tua dari 7 hari).
   Memilih tanggal menyaring panel dan peta lewat S.tanggal (dalamRentang/geoGempa di peta.js). Real Time/Riwayat tampil hanya bila riwayat_prov.json
   termuat: Riwayat = M 5+ per provinsi sejak 1900 di panel. Dimuat sesudah peta.js. Berjalan hanya bila registri menyalakan kemampuan.layar.pilih_tanggal. */
(() => {
if (typeof PilihTanggal === "undefined" || typeof S === "undefined") return;
const rentang = document.querySelector("#rentang");
let host = document.getElementById("pilihTanggal");
if (!host && rentang) { host = document.createElement("div"); host.id = "pilihTanggal"; host.style.width = "100%"; rentang.after(host); }
const segar = () => { S.hal = 0; Peta.segarkan(); renderDaftar(); renderPita(); renderLegenda(); renderRentang(); };

/* kalender 30 hari (PB-79): jumlah per tanggal WIB dihitung dari data 720 jam; gagal muat = hanya 7 hari dari S.gempa yang bisa dibuka */
const HARI = 864e5, wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const awal30 = () => wib(Date.now() - 29 * HARI), awal7 = () => wib(Date.now() - 6 * HARI);
let muat30 = null, gagal30 = false;
const hitungPerTanggal = daftar => { const j = {}; for (let i = 0; i < 30; i++) j[wib(Date.now() - i * HARI)] = 0; for (const g of daftar) { const t = wib(g.t); if (t in j) j[t]++; } return j; };
const ambil30 = () => muat30 ||= fetch("/api/gempa/terbaru?jam=720").then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
  if (!d?.dibuat) { muat30 = null; gagal30 = true; return null; }
  S.gempa30 = (d.gempa || []).map(g => ({...g, t: Date.parse(g.waktu)})); gagal30 = false; return S.gempa30; });
const kalender = {satuan: "gempa", get awal() { return awal30(); },
  ket: "Angka = jumlah gempa tercatat hari itu (BMKG, USGS). Yang bisa dibuka: 30 hari terakhir.",
  terbanyak: {judul: "Terbanyak 30 hari", n: 6},
  muat: async () => { const d = await ambil30(); return {jumlah: hitungPerTanggal(d || S.gempa || [])}; },
  bisa: t => t <= wib(Date.now()) && t >= (gagal30 ? awal7() : awal30()) };

PilihTanggal.pasang({id: "gempa", host: () => host, kalender,
  tanggal: () => (S.gempa || []).map(g => g.t),
  ubah: iso => { S.tanggal = iso; if (iso && S.riwayat) S.riwayat = false; segar(); },
  get riwayat() { return S.riwProv ? {ubah: r => { S.riwayat = r; S.urut = {k: !r && typeof ukAktif === "function" ? ukAktif().kunci : "n", turun: true}; renderDaftar(); }} : null; }});
/* riwayat per provinsi dimuat sekali, di luar jalur kritis; segmen Riwayat muncul bila datanya ada */
const ambil = () => typeof muatJSON === "function" && muatJSON("data/riwayat_prov.json").then(p => { if (p?.prov) { S.riwProv = p.prov; PilihTanggal.gambar(); } }).catch(() => {});
typeof nanti === "function" ? nanti(ambil) : setTimeout(ambil, 0);
/* data hidup diperbarui tiap 5 menit: tanggal yang datanya hilang dilepas, daftar tanggal digambar ulang */
setInterval(() => { if (!document.hidden) PilihTanggal.gambar(); }, 60e3);
window.TanggalGempa = {hitungPerTanggal, kalender};
})();
