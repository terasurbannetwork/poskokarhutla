/* tanggal.js: adaptor kualitas udara untuk mesin bersama /inti/pilih_tanggal.js (PB-85, F-36, D16).
   Tanggal yang ditawarkan HANYA hari prakiraan yang datanya sudah dimuat halaman (S.uk.hari mulai hari ini, S.h0); kemarin dan tanggal lampau tidak ditawarkan
   karena halaman tidak memuat arsip prakiraan per kab/kota (riwayat hanya analisis tingkat provinsi untuk kolom Tren). Tanggal tanpa nilai = tombol mati.
   Memilih tanggal = menekan tombol hari di garis waktu "Prakiraan udara (hari)" yang sama (satu jalur render: peta, panel, laci), bukan jalur kedua.
   Angka kalender = jumlah kab/kota berstatus Tidak sehat atau lebih menurut model CAMS (hipotesis). Dimuat sesudah peta.js. */
(() => {
if (typeof PilihTanggal === "undefined" || typeof S === "undefined") return;
const tengah = iso => Date.parse(iso + "T12:00:00+07:00");
/* indeks hari prakiraan yang punya nilai r24 sedikitnya satu kab/kota dan belum lewat */
const adaNilai = i => !!S.prak?.kota?.some(k => k.r24?.[i] != null);
const hariBerdata = () => (S.uk?.hari || []).map((t, i) => [t, i]).filter(([, i]) => i >= S.h0 && adaNilai(i));
/* jumlah kab/kota Tidak sehat atau lebih per tanggal (BATAS[1] = 55,4 µg/m³ rata-rata 24 jam); tanggal tanpa nilai tidak ada di peta ini */
function jumlahPerTanggal() { const j = {}; for (const [t, i] of hariBerdata()) j[t] = S.prak.kota.filter(k => k.r24?.[i] > BATAS[1]).length; return j; }
const tanggalBerdata = () => hariBerdata().map(([t]) => tengah(t));
const kalender = {satuan: "kab/kota", ket: "Angka = jumlah kabupaten/kota berstatus Tidak sehat atau lebih menurut perkiraan model CAMS (hipotesis, bukan ISPU resmi). Yang bisa dibuka: hari prakiraan yang datanya sudah dimuat.",
  terbanyak: {judul: "Terbanyak", n: 3}, muat: async () => ({jumlah: jumlahPerTanggal()}), bisa: t => t in jumlahPerTanggal()};

let dariMesin = false;
/* pilih hari = menekan tombol hari yang ada; null = kembali ke hari ini (S.h0) */
function pilihHari(iso) {
  const i = iso ? (S.uk?.hari || []).indexOf(iso) : S.h0; if (i < S.h0 || !adaNilai(i)) return false;   /* hari lampau (i < S.h0) dan hari tanpa nilai tidak pernah dipilih */
  const b = document.querySelector(`#hariSeg button[data-i="${i}"]`); if (!b) return false;
  if (S.hari !== i) { dariMesin = true; try { b.click(); } finally { dariMesin = false; } } return true; }

const panel = document.querySelector("#panel .top");
let host = document.getElementById("pilihTanggal");
if (!host && panel) { host = document.createElement("div"); host.id = "pilihTanggal"; host.style.cssText = "width:100%;margin-bottom:8px"; (panel.querySelector(".cari") || panel.lastChild).before(host); }

PilihTanggal.pasang({id: "udara", host: () => host, kalender, tanggal: tanggalBerdata, ubah: iso => { pilihHari(iso); }});
/* hari ditekan langsung di garis waktu: pilihan tanggal dilepas supaya tidak menggantung pada hari lain */
document.querySelector("#hariSeg")?.addEventListener("click", e => { if (!dariMesin && e.target.closest("button")) PilihTanggal.lepas(); });
/* data baru datang sesudah halaman dibuka: gambar ulang tiap garis waktu hari digambar */
if (typeof renderHari === "function") { const asli = renderHari; window.renderHari = function (...a) { const r = asli.apply(this, a); PilihTanggal.gambar(); return r; }; }
setInterval(() => { if (!document.hidden) PilihTanggal.gambar(); }, 60e3);
window.TanggalUdara = {hariBerdata, jumlahPerTanggal, tanggalBerdata, pilihHari, kalender};
})();
