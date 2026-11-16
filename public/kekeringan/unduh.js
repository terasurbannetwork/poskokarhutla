/* unduh.js: adaptor kekeringan untuk mesin bersama /inti/unduh_tabel.js (PB-79a, F-34). Hanya membaca tabel panel yang SEDANG TAMPIL di layar:
   daftar provinsi (atau kabupaten/kota bila satu provinsi dibuka), atau daftar harian bila satu tanggal dipilih (tanggal.js). Angka tidak dihitung ulang.
   Keterangan tabel memuat bulan SPI dan pil ambang ("Ambang masih hipotesis") supaya berkas unduhan tidak membawa angka tanpa label.
   Pembuat Excel, Word, PDF, PNG ada di mesin inti. Tombol muncul hanya bila registri menyalakan kemampuan.layar.unduh_tabel. */
(() => {
const rapi = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tgl = iso => +iso.slice(8) + " " + BLN[+iso.slice(5, 7) - 1] + " " + iso.slice(0, 4);

/* tabel panel: baris .tb (kolom pertama = nomor urut, dibuang); baris tanpa tombol (kabupaten tanpa status) ikut terbaca */
function panel(rows, nama, ket, hari) {
  if (!rows) return null;
  const kp = rows.querySelector(".tb.kepala"), br = [...rows.querySelectorAll(".tb:not(.kepala)")]; if (!kp || !br.length) return null;
  const sel = e => [...e.children].slice(1).map(rapi);
  return {nama, ket, hari, kolom: sel(kp), baris: br.map(sel)}; }

async function kumpul() {
  const S_ = typeof S !== "undefined" ? S : null, d = document, tg = S_?.tanggal || null, j = S_?.jalur || [];
  const nm = j.length ? "Kabupaten/kota " + (S_.meta?.provinsi?.[j[0]] || j[0]) : "Provinsi";
  const ket = tg ? "Tanggal: " + tgl(tg) + ", hari tanpa hujan dari laporan harian"
    : (typeof spiBulan === "function" && S_?.meta?.spi ? "SPI " + spiBulan() + "; " : "") + (typeof AMBANG_PIL === "function" ? AMBANG_PIL() : "");
  const hari = S_?.meta?.hari_ini ? tgl(S_.meta.hari_ini) : "";
  const p = panel(d.querySelector("#rows"), nm, ket, tg ? tgl(tg) : hari), tabel = p ? [p] : [];
  const reg = (await window.UnduhTabel.registri().catch(() => [])).find(b => b.id === "kekeringan"), wib = new Date(Date.now() + 7 * 36e5), iso = tg || S_?.meta?.hari_ini || wib.toISOString().slice(0, 10);
  return {judul: "Laporan Situasi Kekeringan", iso, namaTabel: tabel.length === 1 ? slug(tabel[0].nama) : "laporan",
    tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB",
    sumber: "Sumber: " + (reg?.bagikan?.sumber || "Deteksi Centurisk97"), tabel}; }

window.UnduhTabel.tema({id: "kekeringan", label: "Unduh tabel kekeringan", kumpul});
window.UnduhTabelKekeringan = {panel, kumpul};
/* tombol muncul setelah registri terbaca: gambar ulang daftar sekali */
if (typeof document.addEventListener === "function") document.addEventListener("unduh-tabel-siap", e => { if (e.detail?.id === "kekeringan" && typeof renderDaftar === "function" && typeof S !== "undefined" && S.wil) renderDaftar(); });
})();
