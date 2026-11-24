/* tanggal.js: adaptor pesisir untuk mesin bersama /inti/pilih_tanggal.js dan /inti/kalender.js (PB-86, F-36, D16). Tanggal yang ditawarkan HANYA tanggal yang ada di data yang sudah
   dimuat halaman: hari model rob (rob.json) dan hari prediksi pasang surut (pasut_30h.json). Hari ini atau Kemarin tanpa data = tombol mati; tanggal lain lewat kalender.
   Memilih tanggal mengubah S.hari, sama seperti garis waktu "Hari (rob, pasang, ombak)": daftar panel dan lapisan peta ikut berganti. Data gelombang model hanya mencakup
   beberapa hari ke depan; di luar itu panel menulis alasannya (bukan daftar kosong). Angka kalender = jumlah titik rob berstatus Waspada atau lebih (hipotesis model) pada hari itu,
   bukan peringatan resmi. Dimuat sesudah peta.js. Berjalan hanya bila registri menyalakan kemampuan.layar.pilih_tanggal. */
(() => {
if (typeof PilihTanggal === "undefined" || typeof S === "undefined") return;
const HARI = 864e5, awal = iso => Date.parse(iso + "T12:00:00+07:00");
let host = document.getElementById("pilihTanggal");
const panel = document.querySelector("#panelMode");
if (!host && panel) { host = document.createElement("div"); host.id = "pilihTanggal"; host.style.cssText = "width:100%;margin-bottom:8px"; (panel.closest(".gp-bar") || panel).after(host); }

/* semua tanggal berdata: hari model rob dan hari prediksi pasang surut */
function tanggalBerdata() {
  const T = new Set((S.rob?.hari || []).filter(Boolean));
  for (const s of S.pas?.stasiun || []) for (const h of s.hari || []) if (h?.[0]) T.add(h[0]);
  return [...T].sort(); }
/* jumlah titik rob Waspada atau lebih per hari model; hari yang hanya punya pasang surut bernilai 0 (tetap bisa dibuka) */
function jumlahPerTanggal() {
  const j = {}; for (const t of tanggalBerdata()) j[t] = 0;
  (S.rob?.hari || []).forEach((h, i) => { j[h] = (S.rob.titik || []).filter(t => t.lv?.[i] > 0).length; }); return j; }

const kalender = {satuan: "titik rob", get awal() { return tanggalBerdata()[0]; },
  ket: "Angka = jumlah titik pesisir berstatus rob Waspada atau lebih menurut model (hipotesis, bukan peringatan resmi). Yang bisa dibuka: tanggal yang punya data rob atau pasang surut.",
  terbanyak: {judul: "Terbanyak", n: 3}, muat: async () => ({jumlah: jumlahPerTanggal()}), bisa: t => t in jumlahPerTanggal()};

/* memilih tanggal = mengatur hari data halaman; null kembali ke hari ini */
function pilihHari(iso) {
  S.hari = iso || HARI_INI(); if (typeof Laci !== "undefined") Laci.tutup?.();
  if (typeof renderHari === "function") renderHari();
  nanti(() => { renderPanel(); Peta?.segarkan?.(); }); }

PilihTanggal.pasang({id: "pesisir", host: () => host, kalender, tanggal: () => tanggalBerdata().map(awal), ubah: pilihHari});
/* garis waktu bawaan dipakai: pilihan di pemilih dilepas supaya tidak menyala ganda */
document.querySelector("#hariSeg")?.addEventListener("click", () => PilihTanggal.lepas());
setInterval(() => { if (!document.hidden) PilihTanggal.gambar(); }, 60e3);
/* data termuat sebelum skrip ini jalan: gambar sekali sesudah registri terbaca */
nanti(() => PilihTanggal.gambar());
window.TanggalPesisir = {tanggalBerdata, jumlahPerTanggal, kalender, pilihHari};
})();
