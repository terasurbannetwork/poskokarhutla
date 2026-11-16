/* unduh.js: adaptor gunung api untuk mesin bersama /inti/unduh_tabel.js (PB-79b, F-34). Hanya membaca tabel yang SEDANG TAMPIL di layar:
   daftar gunung panel peta (sesuai level, cari, tanggal, dan ukuran yang dipilih) dan tabel tab Kejadian bila sudah dirender. Angka tidak dihitung ulang;
   tabel yang belum dirender dilewati. Level adalah pernyataan resmi PVMBG apa adanya. Pembuat Excel, Word, PDF, PNG ada di mesin inti. */
(() => {
const rapi = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const BLN_P = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/* daftar gunung panel peta: baris button.tb[data-n] (div), kolom pertama adalah nomor urut */
function gunung(rows, ket) {
  if (!rows) return null;
  const kp = rows.querySelector(".tb.kepala"), br = [...rows.querySelectorAll("button.tb[data-n]")]; if (!kp || !br.length) return null;
  const sel = e => [...e.children].slice(1).map(rapi);
  return {nama: "Gunung api", ket, kolom: sel(kp), baris: br.map(sel)}; }

/* tabel HTML biasa (tab Kejadian): kepala dari th, baris dari tbody */
function tabelHtml(t, nama, ket) {
  if (!t) return null;
  const kolom = [...t.querySelectorAll("thead th")].map(rapi), baris = [...t.querySelectorAll("tbody tr")].map(r => [...r.children].map(rapi));
  return kolom.length && baris.length ? {nama, ket: ket || "", kolom, baris} : null; }

async function kumpul() {
  const d = document, tabel = [], tg = typeof S !== "undefined" && S.tanggal ? S.tanggal : null;
  const lv = typeof S !== "undefined" && S.level && typeof LEVEL !== "undefined" ? "Level " + LEVEL[S.level][0] + " " + LEVEL[S.level][1] : "Semua level";
  const ket = (tg ? "Erupsi pada " + +tg.slice(8) + " " + BLN_P[+tg.slice(5, 7) - 1] + " " + tg.slice(0, 4) + "; " : "") + lv;
  const g = gunung(d.querySelector("#rows"), ket); if (g) tabel.push(g);
  const kj = tabelHtml(d.querySelector("#kejadian table"), "Kejadian", "Gunung berstatus Waspada ke atas, seperti tampil di layar"); if (kj) tabel.push(kj);
  const reg = (await window.UnduhTabel.registri().catch(() => [])).find(b => b.id === "gunungapi"), wib = new Date(Date.now() + 7 * 36e5), iso = tg || wib.toISOString().slice(0, 10);
  return {judul: "Laporan Situasi Gunung Api", iso, namaTabel: tabel.length === 1 ? slug(tabel[0].nama) : "laporan",
    tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB",
    sumber: "Sumber: " + (reg?.bagikan?.sumber || "PVMBG, Badan Geologi KESDM (MAGMA Indonesia)"), tabel}; }

window.UnduhTabel.tema({id: "gunungapi", label: "Unduh tabel gunung api", kumpul});
window.UnduhTabelGunungapi = {gunung, tabelHtml, kumpul};
/* tombol muncul setelah registri terbaca: gambar ulang daftar gunung sekali */
if (typeof document.addEventListener === "function") document.addEventListener("unduh-tabel-siap", e => { if (e.detail?.id === "gunungapi" && typeof renderDaftar === "function" && S?.st) renderDaftar(); });
})();
