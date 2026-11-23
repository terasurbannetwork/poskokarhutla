/* unduh.js: adaptor gempa untuk mesin bersama /inti/unduh_tabel.js (PB-71, F-34). Hanya membaca tabel yang SEDANG TAMPIL di layar:
   tabel provinsi panel peta (rentang yang dipilih), tabel tab Kejadian, dan tabel Katalog BMKG bila sudah termuat. Angka tidak dihitung ulang;
   tabel yang belum dirender dilewati. Pembuat Excel, Word, PDF, PNG ada di mesin inti. */
(() => {
const rapi = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const RENT = {24: "24 jam", 72: "72 jam", 168: "7 hari"};

/* tabel provinsi panel peta: baris .tb (div), kolom pertama adalah nomor urut */
function provinsi(rows, ket) {
  if (!rows || (typeof S !== "undefined" && S.jalur?.length)) return null;
  const kp = rows.querySelector(".tb.kepala"), br = [...rows.querySelectorAll("button.tb[data-k]")]; if (!kp || !br.length) return null;
  const sel = e => [...e.children].slice(1).map(rapi);
  return {nama: "Provinsi", ket: ket, kolom: sel(kp), baris: br.map(sel)}; }

const tabelHtml = window.UnduhTabel.tabelHtml;

async function kumpul() {
  const d = document, rentang = typeof S !== "undefined" ? S.rentang : 168, tabel = [];
  const tg = typeof S !== "undefined" && S.tanggal ? S.tanggal : null, BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const p = provinsi(d.querySelector("#rows"), tg ? "Tanggal: " + +tg.slice(8) + " " + BLN[+tg.slice(5, 7) - 1] + " " + tg.slice(0, 4) : "Periode: " + (RENT[rentang] || rentang + " jam")); if (p) tabel.push(p);
  const kj = tabelHtml(d.querySelector("#kejadian table"), "Kejadian", typeof Kejadian !== "undefined" && Kejadian.st ? "Halaman " + (Kejadian.st.hal + 1) + ", seperti tampil di layar" : ""); if (kj) tabel.push(kj);
  const jenis = d.querySelector("#katalog .ina-seg [aria-pressed=true]"), kt = tabelHtml(d.querySelector("#inaTabel table"), "Katalog BMKG", jenis ? rapi(jenis) : ""); if (kt) tabel.push(kt);
  return window.UnduhTabel.laporan("gempa", "Laporan Situasi Gempa Bumi", tg, tabel, "BMKG, USGS"); }

window.UnduhTabel.tema({id: "gempa", label: "Unduh tabel gempa", kumpul});
window.UnduhTabelGempa = {provinsi, tabelHtml, kumpul};
/* tombol muncul setelah registri terbaca: gambar ulang daftar provinsi sekali */
if (typeof document.addEventListener === "function") document.addEventListener("unduh-tabel-siap", e => { if (e.detail?.id === "gempa" && typeof renderDaftar === "function") renderDaftar(); });
})();
