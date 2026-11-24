/* unduh.js: adaptor kualitas udara untuk mesin bersama /inti/unduh_tabel.js (PB-85, F-34) dan segmen ukuran tabel provinsi (F-39, mesin inti/tabel.js).
   Memasok apa yang SEDANG TAMPIL: baris tabel provinsi di panel (mengikuti kotak cari, urutan kolom, dan hari terpilih), tabel Kejadian bila sudah dirender,
   dan stasiun BMKG yang mengukur PM2,5 (pengukuran dipisah dari model, D6). Angka tidak dihitung ulang.
   Semua angka provinsi dan kejadian = perkiraan model CAMS (hipotesis), belum dikoreksi ke alat ukur, bukan ISPU resmi.
   Dimuat SESUDAH peta.js dan tanggal.js (butuh S, KAT, kat, Stasiun, renderDaftar). Berjalan hanya bila registri menyalakan kemampuan.layar.unduh_tabel / ukuran_provinsi. */
(() => {
if (typeof UnduhTabel === "undefined" || typeof S === "undefined") return;
const rapi = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tglId = iso => +iso.slice(8) + " " + BLN[+iso.slice(5, 7) - 1] + " " + iso.slice(0, 4);
const hariAktif = () => S.uk?.hari?.[S.hari] || null;
const KET_MODEL = "Perkiraan model CAMS (hipotesis), belum dikoreksi ke alat ukur, bukan ISPU resmi";

/* tabel provinsi persis seperti di panel (saringan cari dan urutan kolom ikut); kolom nilai memakai teks yang tampil */
function provinsi() {
  const baris = [...document.querySelectorAll("#rows button.tb")].map(b => { const c = [...b.children].map(rapi);
    return [c[0], c[1], c[2], c[3], c[4] || "–", c[5]]; });
  const h = hariAktif();
  return baris.length ? {nama: "Provinsi", ket: KET_MODEL + (h ? ". Hari prakiraan " + tglId(h) : ""),
    kolom: ["No", "Provinsi", "PM2,5 rata-rata 24 jam (µg/m³)", "Jiwa di Tidak sehat atau lebih (perkiraan)", "Tren", "Kategori"], baris} : null; }

/* stasiun BMKG yang melapor PM2,5 (pengukuran, bukan model) */
function stasiun() {
  const A = typeof Stasiun !== "undefined" ? Stasiun.segar() : [];
  return A.length ? {nama: "Stasiun BMKG (terukur)", ket: "Pengukuran stasiun BMKG per jam, bukan model; tidak dicampur dengan angka model CAMS",
    kolom: ["Stasiun", "PM2,5 terbaru (µg/m³)", "Kategori acuan", "Waktu"],
    baris: [...A].sort((a, b) => b.v - a.v).map(s => [s.nama, Math.round(s.v * 10) / 10, KAT[kat(s.v)].n, typeof jamWIB === "function" ? jamWIB(s.t) : s.t])} : null; }

/* stasiun ISPU KLH: rata-rata 24 jam, belum divalidasi KLH */
function stasiunIspu() {
  const A = typeof IspuKLH !== "undefined" ? IspuKLH.segar() : [];
  return A.length ? {nama: "Stasiun ISPU KLH (terukur)", ket: "PM2,5 rata-rata 24 jam stasiun KLH, belum divalidasi KLH; tidak dicampur dengan angka model CAMS",
    kolom: ["Stasiun", "Provinsi", "PM2,5 rata-rata 24 jam (µg/m³)", "Kategori", "Waktu"],
    baris: [...A].sort((a, b) => b.pm25 - a.pm25).map(s => [s.nama, s.prov || "", Math.round(s.pm25 * 10) / 10, KAT[kat(s.pm25)].n, typeof jamWIB === "function" ? jamWIB(s.t) : s.t])} : null; }

const tabelHtml = window.UnduhTabel.tabelHtml;

async function kumpul() {
  const tabel = [], p = provinsi(); if (p) tabel.push(p);
  const kj = tabelHtml(document.querySelector("#kejadian table"), "Kejadian", "Deteksi Centurisk97 dari prakiraan model CAMS (hipotesis), bukan pernyataan resmi"); if (kj) tabel.push(kj);
  const st = stasiun(); if (st) tabel.push(st);
  const si = stasiunIspu(); if (si) tabel.push(si);
  return window.UnduhTabel.laporan("udara", "Laporan Kualitas Udara dan Asap", hariAktif(), tabel, "Copernicus CAMS lewat Open-Meteo (model); BMKG (pengukuran stasiun)"); }
UnduhTabel.tema({id: "udara", label: "Unduh tabel kualitas udara", kumpul});

/* ---------- ukuran tabel provinsi (F-39): urutan kolom yang sudah ada di panel ---------- */
const KAT_UKURAN = [{slug: "pm25", label: "PM2,5", urut: {i: 2, d: -1}}, {slug: "jiwa", label: "Jiwa terpapar", urut: {i: 3, d: -1}}];
const ukAktif = () => { const i = S.urut?.i; return !S.urut || i === 2 ? "pm25" : i === 3 ? "jiwa" : null; };
function pilihUkuran(slug) { const u = KAT_UKURAN.find(x => x.slug === slug); if (!u || !(S.ukuranIzin || []).some(x => x.slug === slug)) return false;
  S.urut = {...u.urut}; nanti(() => { renderDaftar(); gambarBar(); }); return true; }

/* bilah alat di panel: segmen ukuran (bila registri menyalakan) dan tombol unduh; ditulis ulang hanya bila isinya berubah */
let bar = null, tadi = "";
function gambarBar() {
  if (!bar) { const t = document.querySelector("#panel .top .cari"); if (!t) return; bar = document.createElement("div"); bar.id = "udBar";
    bar.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:0 0 8px"; t.before(bar);
    bar.addEventListener("click", e => { const b = e.target.closest("[data-ukuran-k]"); if (b) pilihUkuran(b.dataset.ukuranK); }); }
  const seg = typeof segmenUkuran === "function" ? segmenUkuran(S.ukuranIzin || [], ukAktif()) : "", ud = UnduhTabel.tombol() || "";
  const x = (seg ? `<div style="flex:1;min-width:0">${seg}</div>` : "") + ud;
  if (x === tadi) return; tadi = x; bar.innerHTML = x; bar.hidden = !x; }
document.addEventListener("unduh-tabel-siap", e => { if (e.detail?.id === "udara") gambarBar(); });
if (typeof ukuranRegistri === "function") ukuranRegistri().then(r => { S.ukuranIzin = typeof ukuranDiizinkan === "function" ? ukuranDiizinkan(r, "udara", KAT_UKURAN) : []; gambarBar(); }).catch(() => {});
/* panel digambar ulang tiap hari, kotak cari, atau kolom diurut: sorotan segmen dan tombol ikut */
if (typeof renderDaftar === "function") { const asli = renderDaftar; window.renderDaftar = function (...a) { const r = asli.apply(this, a); gambarBar(); return r; }; }
document.querySelector("#rows")?.addEventListener("click", e => { if (e.target.closest(".kepala span[data-s]")) nanti(gambarBar); });
gambarBar();
window.UnduhTabelUdara = {provinsi, stasiun, tabelHtml, kumpul, pilihUkuran, KAT_UKURAN, ukAktif};
})();
