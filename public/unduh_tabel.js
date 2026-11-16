/* unduh_tabel.js: adaptor karhutla untuk mesin bersama /inti/unduh_tabel.js (PB-70). Hanya membaca empat tabel panel Real Time
   (Hotspot, Cluster, Luas terbakar, Belum padam). Angka TIDAK dihitung ulang: tiap tabel dirender oleh renderDaftar() milik index.html
   lalu barisnya dibaca dari #rows, jadi sama dengan layar. Pembuat Excel, Word, PDF, PNG ada di mesin inti, bukan di sini. */
(() => {
const teks = e => (e.querySelector(".nm-pjg") || e).textContent.replace(/\s+/g, " ").trim();
const PER = {hari: "Sehari", 7: "7 hari terakhir", 30: "30 hari terakhir", th: "Tahun ini"};
function periodeLabel() { const p = S.periode;
  if (PER[p]) return PER[p];
  if (/^\d{4}-\d{2}/.test(p)) return "Bulan " + p.split(",").map(b => ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][+b.slice(5) - 1] + " " + b.slice(0, 4)).join(", ");
  return p; }
function bacaTabel(nama, ket) {
  const box = document.querySelector("#rows"), kp = box.querySelector(".tb.kepala"); if (!kp) return null;
  const sel = e => [...e.children].slice(1).map((c, i) => i === 0 ? teks(c) : c.querySelector(".pill") ? teks(c.querySelector(".pill")) : teks(c));
  const hari = (box.querySelector(".tr-hari b")?.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
  return {nama, hari, ket, kolom: sel(kp), baris: [...box.querySelectorAll(".tb:not(.kepala):not(.tb-total)")].map(sel), total: (t => t ? sel(t) : null)(box.querySelector(".tb-total"))}; }
async function kumpul() {
  if (S.panel !== "wil" || S.jalur.length) throw new Error("Buka daftar provinsi (tingkat nasional) dulu");
  if (!S.pk) [S.pk, S.pkKini] = await Promise.all([muatJSON("data/peta_karhutla.json").catch(() => null), muatJSON("data/belum_kini.json").catch(() => null)]);
  const sebelum = S.ukur, scr = document.querySelector("#rows").parentElement, y = scr.scrollTop, hasil = [];
  try { for (const [u, nama] of Object.entries(UKUR)) { if ((u === "luas" || u === "belum") && !S.pk) continue;
      S.ukur = u; renderDaftar(); const t = bacaTabel(nama, u === "luas" ? "Periode: " + periodeLabel() : ""); if (t) hasil.push(t); } }
  finally { S.ukur = sebelum; renderDaftar(); scr.scrollTop = y; }
  const wib = new Date(Date.now() + 7 * 36e5), iso = wib.toISOString().slice(0, 10);
  return {judul: "Laporan Situasi Karhutla", iso, tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB",
    sumber: "Sumber: NASA FIRMS, Copernicus CAMS, BMKG", tabel: hasil}; }

window.UnduhTabel.tema({id: "karhutla", label: "Unduh laporan empat tabel", berkas: "laporan-karhutla", kumpul});
window.UnduhTabelKarhutla = {bacaTabel, kumpul, periodeLabel};
/* tabel provinsi bisa sudah digambar sebelum skrip ini dimuat: gambar ulang sekali supaya tombol Unduh ikut tampil */
if (document.querySelector(".tr-sw") && !document.querySelector("[data-unduh]") && typeof renderDaftar === "function") renderDaftar();
})();
