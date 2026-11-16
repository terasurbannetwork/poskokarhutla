/* tanggal.js: adaptor gempa untuk mesin bersama /inti/pilih_tanggal.js (PB-73, F-36). Pilihan tambahan di bawah segmen 24 jam/72 jam/7 hari:
   Hari ini, Kemarin, Tanggal lain = tanggal WIB yang PUNYA gempa di S.gempa (data 7 hari dari /api/gempa/terbaru?jam=168), tanpa tanggal kosong (D16).
   Memilih tanggal menyaring panel dan peta lewat S.tanggal (dalamRentang/geoGempa di peta.js). Real Time/Riwayat tampil hanya bila riwayat_prov.json
   termuat: Riwayat = M 5+ per provinsi sejak 1900 di panel. Dimuat sesudah peta.js. Berjalan hanya bila registri menyalakan kemampuan.layar.pilih_tanggal. */
(() => {
if (typeof PilihTanggal === "undefined" || typeof S === "undefined") return;
const rentang = document.querySelector("#rentang");
let host = document.getElementById("pilihTanggal");
if (!host && rentang) { host = document.createElement("div"); host.id = "pilihTanggal"; host.style.width = "100%"; rentang.after(host); }
const segar = () => { S.hal = 0; Peta.segarkan(); renderDaftar(); renderPita(); renderLegenda(); renderRentang(); };

PilihTanggal.pasang({id: "gempa", host: () => host,
  tanggal: () => (S.gempa || []).map(g => g.t),
  ubah: iso => { S.tanggal = iso; if (iso && S.riwayat) S.riwayat = false; segar(); },
  get riwayat() { return S.riwProv ? {ubah: r => { S.riwayat = r; S.urut = {k: !r && typeof ukAktif === "function" ? ukAktif().kunci : "n", turun: true}; renderDaftar(); }} : null; }});
/* riwayat per provinsi dimuat sekali, di luar jalur kritis; segmen Riwayat muncul bila datanya ada */
const ambil = () => typeof muatJSON === "function" && muatJSON("data/riwayat_prov.json").then(p => { if (p?.prov) { S.riwProv = p.prov; PilihTanggal.gambar(); } }).catch(() => {});
typeof nanti === "function" ? nanti(ambil) : setTimeout(ambil, 0);
/* data hidup diperbarui tiap 5 menit: tanggal yang datanya hilang dilepas, daftar tanggal digambar ulang */
setInterval(() => { if (!document.hidden) PilihTanggal.gambar(); }, 60e3);
window.TanggalGempa = {};
})();
