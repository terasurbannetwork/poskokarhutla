/* unduh.js: adaptor gunung api untuk mesin bersama /inti/unduh_tabel.js (PB-79b, F-34). Hanya membaca tabel yang SEDANG TAMPIL di layar:
   daftar gunung panel peta (sesuai level, cari, tanggal, dan ukuran yang dipilih) dan tabel tab Kejadian bila sudah dirender. Angka tidak dihitung ulang;
   tabel yang belum dirender dilewati. Level adalah pernyataan resmi PVMBG apa adanya. Pembuat Excel, Word, PDF, PNG ada di mesin inti. */
(() => {
const rapi = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const BLN_P = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/* daftar gunung panel peta: baris button.tb[data-n] (div), kolom pertama adalah nomor urut */
function gunung(rows, ket) {
  if (!rows) return null;
  const kp = rows.querySelector(".tb.kepala"), br = [...rows.querySelectorAll("button.tb[data-n]")]; if (!kp || !br.length) return null;
  const sel = e => [...e.children].slice(1).map(rapi);
  return {nama: "Gunung api", ket, kolom: sel(kp), baris: br.map(sel)}; }

const tabelHtml = window.UnduhTabel.tabelHtml;

async function kumpul() {
  const d = document, tabel = [], tg = typeof S !== "undefined" && S.tanggal ? S.tanggal : null;
  const lv = typeof S !== "undefined" && S.level && typeof LEVEL !== "undefined" ? "Level " + LEVEL[S.level][0] + " " + LEVEL[S.level][1] : "Semua level";
  const ket = (tg ? "Erupsi pada " + +tg.slice(8) + " " + BLN_P[+tg.slice(5, 7) - 1] + " " + tg.slice(0, 4) + "; " : "") + lv;
  const g = gunung(d.querySelector("#rows"), ket); if (g) tabel.push(g);
  const kj = tabelHtml(d.querySelector("#kejadian table"), "Kejadian", "Gunung berstatus Waspada ke atas, seperti tampil di layar"); if (kj) tabel.push(kj);
  return window.UnduhTabel.laporan("gunungapi", "Laporan Situasi Gunung Api", tg, tabel, "PVMBG, Badan Geologi KESDM (MAGMA Indonesia)"); }

window.UnduhTabel.tema({id: "gunungapi", label: "Unduh tabel gunung api", kumpul});
window.UnduhTabelGunungapi = {gunung, tabelHtml, kumpul};
/* tombol muncul setelah registri terbaca: gambar ulang daftar gunung sekali */
if (typeof document.addEventListener === "function") document.addEventListener("unduh-tabel-siap", e => { if (e.detail?.id === "gunungapi" && typeof renderDaftar === "function" && S?.st) renderDaftar(); });
})();
