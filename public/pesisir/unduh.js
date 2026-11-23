/* unduh.js: adaptor pesisir untuk mesin bersama /inti/unduh_tabel.js (PB-86, F-34). Hanya membaca tabel yang SEDANG TAMPIL: daftar panel peta (mode Abrasi, Rob, Pasang, atau Ombak,
   mengikuti hari dan kotak cari) dan tabel kartu tab Dampak bila sudah dirender. Angka tidak dihitung ulang, hanya teks yang tampil. Status rob model diberi keterangan hipotesis
   dan abrasi diberi keterangan perkiraan satelit (D6). Pembuat Excel, Word, PDF, PNG ada di mesin inti. Dimuat SESUDAH pesisir.js (butuh S, tglSgk, renderPanel). */
(() => {
const rapi = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const MODE = {abrasi: "Abrasi garis pantai", rob: "Status rob", pasang: "Pasang surut", ombak: "Gelombang"};
const KET = {abrasi: "Perkiraan satelit dari citra Landsat, belum dikoreksi pasang surut dan belum dicek lapangan",
  rob: "Hipotesis: status dari muka laut model terhadap ambang persentil, belum lolos uji balik, bukan peringatan resmi",
  pasang: "Prediksi astronomis BMKG Maritim", ombak: "Peringatan resmi BMKG Maritim dan keluaran model gelombang di titik pesisir (model bukan peringatan)"};
const KOLOM = {abrasi: ["Situs", "Laju median", "Kab/kota, provinsi", "Rincian"], rob: ["Kecamatan", "Status", "Kab/kota, provinsi", "Rincian"],
  pasang: ["Stasiun", "Pasang tertinggi", "Provinsi", "Rincian"], ombak: ["Lokasi", "Tingkat", "Wilayah", "Rincian", "Kelompok"]};
const teks = (e, k) => { const x = e.querySelector(k); return x ? rapi(x) : ""; };

/* daftar panel: tiap tombol .rw jadi satu baris; judul kelompok .gp-sub (mode Ombak) jadi kolom Kelompok */
function panel(rows) {
  if (!rows || typeof S === "undefined") return null; const mode = S.mode, baris = []; let grup = "";
  for (const e of rows.children) {
    if (e.classList?.contains("gp-sub")) { grup = rapi(e); continue; }
    if (!e.classList?.contains("rw")) continue;
    const b = [teks(e, ".rw-hd b"), teks(e, ".rw-hd .pl"), teks(e, ".rw-wil"), teks(e, ".rw-jam")];
    if (mode === "ombak") b.push(grup); baris.push(b); }
  return baris.length ? {nama: MODE[mode] || "Panel", ket: KET[mode] + ". Tanggal data: " + tglSgk(S.hari), kolom: KOLOM[mode], baris} : null; }

const tabelHtml = window.UnduhTabel.tabelHtml;
function dampak(el) {
  if (!el) return []; const T = [];
  el.querySelectorAll("article.ex-std").forEach(k => { const hip = k.querySelector(".ex-ey .pl"), src = k.querySelector("th[title]")?.title || "",
    t = tabelHtml(k.querySelector("table"), rapi(k.querySelector("h3") || k), (hip ? rapi(hip) + ". " : "") + src); if (t) T.push(t); });
  return T; }

async function kumpul() {
  const d = document, tabel = [], p = panel(d.querySelector("#rows")); if (p) tabel.push(p);
  tabel.push(...dampak(d.querySelector("#dampak")));
  return window.UnduhTabel.laporan("pesisir", "Laporan Gelombang Pasang dan Abrasi", (typeof S !== "undefined" && S.hari), tabel, "BMKG Maritim, Open-Meteo, USGS Landsat, DIBI BNPB"); }

window.UnduhTabel.tema({id: "pesisir", label: "Unduh tabel pesisir", kumpul});
window.UnduhTabelPesisir = {panel, tabelHtml, dampak, kumpul};
/* tombol muncul setelah registri terbaca: gambar ulang panel dan tombol tab Dampak sekali */
if (typeof document.addEventListener === "function") document.addEventListener("unduh-tabel-siap", e => { if (e.detail?.id !== "pesisir") return; if (typeof renderPanel === "function") renderPanel(); window.DampakUnduh?.(); });
})();
