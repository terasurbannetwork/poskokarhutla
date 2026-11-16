/* unduh.js: adaptor gempa untuk mesin bersama /inti/unduh_tabel.js (PB-71, F-34). Hanya membaca tabel yang SEDANG TAMPIL di layar:
   tabel provinsi panel peta (rentang yang dipilih), tabel tab Kejadian, dan tabel Katalog BMKG bila sudah termuat. Angka tidak dihitung ulang;
   tabel yang belum dirender dilewati. Pembuat Excel, Word, PDF, PNG ada di mesin inti. */
(() => {
const rapi = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const RENT = {24: "24 jam", 72: "72 jam", 168: "7 hari"};
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* tabel provinsi panel peta: baris .tb (div), kolom pertama adalah nomor urut */
function provinsi(rows, ket) {
  if (!rows || (typeof S !== "undefined" && S.jalur?.length)) return null;
  const kp = rows.querySelector(".tb.kepala"), br = [...rows.querySelectorAll("button.tb[data-k]")]; if (!kp || !br.length) return null;
  const sel = e => [...e.children].slice(1).map(rapi);
  return {nama: "Provinsi", ket: "Periode: " + ket, kolom: sel(kp), baris: br.map(sel)}; }

/* tabel HTML biasa (tab Kejadian, Katalog BMKG): kepala dari th, baris dari tbody */
function tabelHtml(t, nama, ket) {
  if (!t) return null;
  const kolom = [...t.querySelectorAll("thead th")].map(rapi), baris = [...t.querySelectorAll("tbody tr")].map(r => [...r.children].map(rapi));
  return kolom.length && baris.length ? {nama, ket: ket || "", kolom, baris} : null; }

async function kumpul() {
  const d = document, rentang = typeof S !== "undefined" ? S.rentang : 168, tabel = [];
  const p = provinsi(d.querySelector("#rows"), RENT[rentang] || rentang + " jam"); if (p) tabel.push(p);
  const kj = tabelHtml(d.querySelector("#kejadian table"), "Kejadian", typeof Kejadian !== "undefined" && Kejadian.st ? "Halaman " + (Kejadian.st.hal + 1) + ", seperti tampil di layar" : ""); if (kj) tabel.push(kj);
  const jenis = d.querySelector("#katalog .ina-seg [aria-pressed=true]"), kt = tabelHtml(d.querySelector("#inaTabel table"), "Katalog BMKG", jenis ? rapi(jenis) : ""); if (kt) tabel.push(kt);
  const reg = (await window.UnduhTabel.registri().catch(() => [])).find(b => b.id === "gempa"), wib = new Date(Date.now() + 7 * 36e5), iso = wib.toISOString().slice(0, 10);
  return {judul: "Laporan Situasi Gempa Bumi", iso, namaTabel: tabel.length === 1 ? slug(tabel[0].nama) : "laporan",
    tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB",
    sumber: "Sumber: " + (reg?.bagikan?.sumber || "BMKG, USGS"), tabel}; }

window.UnduhTabel.tema({id: "gempa", label: "Unduh tabel gempa", kumpul});
window.UnduhTabelGempa = {provinsi, tabelHtml, kumpul};
/* tombol muncul setelah registri terbaca: gambar ulang daftar provinsi sekali */
if (typeof document.addEventListener === "function") document.addEventListener("unduh-tabel-siap", e => { if (e.detail?.id === "gempa" && typeof renderDaftar === "function") renderDaftar(); });
})();
