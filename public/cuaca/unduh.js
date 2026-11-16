/* unduh.js: adaptor cuaca ekstrem untuk mesin bersama /inti/unduh_tabel.js (PB-79c, F-34). Memasok apa yang SEDANG TAMPIL di layar:
   daftar nowcast BMKG dan daftar gelombang tinggi BMKG (mengikuti kotak cari dan tanggal terpilih), serta tabel tab Kejadian bila sudah dirender.
   Angka tidak dihitung ulang. Prakiraan model Centurisk97 tidak ikut; baris Kejadian bersumber deteksi Centurisk97 diberi keterangan hipotesis (D6).
   Pembuat Excel, Word, PDF, PNG ada di mesin inti. Dimuat SESUDAH peta.js dan tanggal.js (butuh S, namaProv, SEV_ID, GEL, waktuBerlaku, hurufJudul). */
(() => {
const rapi = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tglId = iso => +iso.slice(8) + " " + BLN[+iso.slice(5, 7) - 1] + " " + iso.slice(0, 4);
const pd = () => window.TanggalCuaca;
const ketWaktu = () => S.tanggal ? "Berlaku pada " + tglId(S.tanggal) : "Peringatan yang berlaku saat ini";
const kotakCari = () => (document.querySelector("#cari")?.value || "").trim().toLowerCase();

/* nowcast: urutan dan penyaringan sama dengan renderPanel di peta.js */
function nowcast() {
  const q = kotakCari(), p = pd(), baris = (S.nc || []).filter(a => (!q || (a.wilayah + " " + a.headline + " " + a.event).toLowerCase().includes(q)) && (!p || p.nc(a)))
    .map(a => [a.headline?.match(/\bdi (.+)$/)?.[1] || namaProv(a.prov?.[0]) || a.event, a.event, SEV_ID[a.severity] || a.severity, a.n, waktuBerlaku(a.mulai, a.selesai), hurufJudul(a.wilayah)]);
  return baris.length ? {nama: "Nowcast BMKG", ket: ketWaktu(), kolom: ["Wilayah", "Peringatan", "Tingkat", "Kecamatan", "Berlaku", "Daftar kecamatan"], baris} : null; }

function gelombang() {
  const q = kotakCari(), p = pd(), baris = [...(S.gl || [])].sort((a, b) => b.lv - a.lv || b.total - a.total)
    .filter(o => (!q || namaProv(o.prov).toLowerCase().includes(q)) && (!p || p.gl(o))).map(o => [namaProv(o.prov), GEL[o.lv - 1][1], o.kelas[0], o.kelas[1], o.kelas[2], o.total]);
  return baris.length ? {nama: "Gelombang tinggi", ket: ketWaktu(), kolom: ["Provinsi", "Tingkat tertinggi", "Tinggi", "Sangat tinggi", "Ekstrem", "Total perairan"], baris} : null; }

/* tabel HTML biasa (tab Kejadian) */
function tabelHtml(t, nama, ket) {
  if (!t) return null;
  const kolom = [...t.querySelectorAll("thead th")].map(rapi), baris = [...t.querySelectorAll("tbody tr")].map(r => [...r.children].map(rapi));
  return kolom.length && baris.length ? {nama, ket: ket || "", kolom, baris} : null; }

async function kumpul() {
  const d = document, tabel = [], tg = typeof S !== "undefined" && S.tanggal ? S.tanggal : null;
  const nc = nowcast(); if (nc) tabel.push(nc);
  const gl = gelombang(); if (gl) tabel.push(gl);
  const kj = tabelHtml(d.querySelector("#kejadian table"), "Kejadian", (typeof Kejadian !== "undefined" && Kejadian.st ? "Halaman " + (Kejadian.st.hal + 1) + ", seperti tampil di layar. " : "")
    + "Baris bersumber Deteksi Centurisk97 adalah hipotesis dari prakiraan model, bukan pernyataan BMKG"); if (kj) tabel.push(kj);
  const reg = (await window.UnduhTabel.registri().catch(() => [])).find(b => b.id === "cuaca"), wib = new Date(Date.now() + 7 * 36e5), iso = tg || wib.toISOString().slice(0, 10);
  return {judul: "Laporan Peringatan Dini Cuaca Ekstrem", iso, namaTabel: tabel.length === 1 ? slug(tabel[0].nama) : "laporan",
    tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB",
    sumber: "Sumber: " + (reg?.bagikan?.sumber || "BMKG"), tabel}; }

window.UnduhTabel.tema({id: "cuaca", label: "Unduh tabel cuaca ekstrem", kumpul});
window.UnduhTabelCuaca = {nowcast, gelombang, tabelHtml, kumpul};
/* tombol muncul setelah registri terbaca: gambar ulang daftar sekali */
if (typeof document.addEventListener === "function") document.addEventListener("unduh-tabel-siap", e => { if (e.detail?.id === "cuaca" && typeof renderPanel === "function" && S.per) renderPanel(); });
})();
