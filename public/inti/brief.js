"use strict";
/* inti/brief.js (PB-72, F-35, D15): SATU mesin brief pimpinan dua halaman A4 untuk semua bencana, dicetak lewat window.print
   dengan lembar gaya cetak (inti/brief.css), pola `cetak`/`hCetak` karhutla (public/ringkasan.js): wadah #bf-cetak disisipkan,
   kelas bf-mencetak dipasang pada <html> saat mencetak, dilepas pada afterprint.
   Mesin memegang tata letak: kepala (nama bencana + waktu cut-off data), KPI, tabel, daftar, kaki sumber. Angka TIDAK dihitung ulang
   dan tidak ada kalimat kebijakan atau rekomendasi buatan mesin: adaptor hanya memasok angka dari data yang sudah dimuat halaman.
   Nilai yang tidak ada ditulis "belum tersedia", tidak pernah nol.

   Adaptor (satu per halaman), dipasang dengan Brief.tema({id, siap, data}):
     {id: "gempa",
      siap: () => boolean,                // data halaman sudah dimuat
      data: async () => ({
        nama: "Gempa bumi",               // nama bencana di kepala
        subjudul: "Ringkasan 7 hari",     // opsional
        cutoff: "16 Nov 2026 10.00 WIB",  // waktu cut-off data
        tanggal: "Senin, 16 November 2026",
        kpi: [{l, v, k?}],                // maksimal 4
        tabel1: {judul, kolom: [...], baris: [[...]], kosong?},   // halaman 1
        tabel2: {judul, kolom, baris, kosong?},                   // halaman 2 (opsional)
        daftar: {judul, item: [teks, ...], kosong?},              // halaman 2 (opsional)
        sumber: "teks sumber", catatan: "teks catatan"})}
   Tombol hanya dipasang bila `kemampuan.layar.brief` bernilai true untuk id itu di /bencana.json (diambil sekali; gagal = tidak dipasang). */
(() => {
const KOSONG = "belum tersedia";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const ada = v => v !== null && v !== undefined && v !== "" && !(typeof v === "number" && !isFinite(v));
const nilai = v => ada(v) ? esc(v) : KOSONG;
let A = null, reg = null;   // adaptor aktif; janji registri

/* ---------- model murni (diuji di tests/layar/pb_brief.test.mjs) ---------- */
/* boleh dipasang? hanya bila registri memuat bencana itu dan kemampuan.layar.brief === true */
const diizinkan = (r, id) => !!r && Array.isArray(r.bencana) && r.bencana.some(b => b.id === id && b.kemampuan?.layar?.brief === true);
const tabel = t => {
  if (!t) return "";
  const kepala = t.judul ? `<h2>${esc(t.judul)}</h2>` : "";
  if (!t.baris?.length) return `${kepala}<p class="bf-kosong">${esc(t.kosong || KOSONG)}</p>`;
  return `${kepala}<table><thead><tr>${(t.kolom || []).map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${t.baris.map(b => `<tr>${b.map(c => `<td>${nilai(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
};
const daftar = d => {
  if (!d) return "";
  const kepala = d.judul ? `<h2>${esc(d.judul)}</h2>` : "";
  return d.item?.length ? `${kepala}<ol class="bf-li">${d.item.map(t => `<li>${nilai(t)}</li>`).join("")}</ol>` : `${kepala}<p class="bf-kosong">${esc(d.kosong || KOSONG)}</p>`;
};
const kpi = K => `<div class="bf-kpi">${(K || []).slice(0, 4).map(q => `<div><span>${esc(q.l)}</span><b>${nilai(q.v)}</b>${q.k ? `<i>${esc(q.k)}</i>` : ""}</div>`).join("")}</div>`;
/* dua halaman A4 dari data adaptor */
const html = d => {
  d = d || {};
  const kop = `<header class="bf-kop"><div><b>${esc((d.nama || "").toUpperCase())}</b><span>${esc(d.subjudul || "Brief pimpinan")}</span></div><div class="bf-kr">${esc(d.tanggal || "")}<br>Data per ${nilai(d.cutoff)}</div></header>`;
  const p1 = `<section class="bf-hal">${kop}<h2>I. Angka utama</h2>${kpi(d.kpi)}${tabel(d.tabel1)}</section>`;
  const p2 = `<section class="bf-hal">${tabel(d.tabel2)}${daftar(d.daftar)}<h2>Sumber dan catatan</h2><p class="bf-ket">${nilai(d.sumber)}${d.catatan ? " " + esc(d.catatan) : ""}</p><p class="bf-ket">Waktu cut-off data: ${nilai(d.cutoff)}. Angka diambil dari data yang tampil di halaman saat dicetak.</p></section>`;
  return p1 + p2;
};

/* ---------- ambil registri sekali ---------- */
const muatReg = () => reg ||= fetch("/bencana.json").then(r => r.ok ? r.json() : null).catch(() => null);

/* ---------- cetak ---------- */
async function cetak() {
  if (!A || !A.siap()) return;
  const tb = document.querySelector("[data-brief]"); if (tb) tb.disabled = true;
  let d; try { d = await A.data(); } catch { d = null; }
  let c = document.getElementById("bf-cetak"); if (!c) { c = document.createElement("div"); c.id = "bf-cetak"; document.body.appendChild(c); }
  c.innerHTML = html(d); document.documentElement.classList.add("bf-mencetak");
  if (tb) tb.disabled = false;
  const lepas = () => { document.documentElement.classList.remove("bf-mencetak"); removeEventListener("afterprint", lepas); };
  addEventListener("afterprint", lepas); setTimeout(() => print(), 50);
}
const IKON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v7H7z"/></svg>';
const tombol = () => `<button type="button" class="iconbtn" data-brief aria-label="Unduh brief pimpinan" title="Unduh brief pimpinan">${IKON}</button>`;
/* pasang tombol di dekat elemen acuan (selector); hanya bila registri mengizinkan untuk id adaptor */
async function pasang(acuan) {
  if (!A || document.querySelector("[data-brief]")) return false;
  if (!diizinkan(await muatReg(), A.id)) return false;
  const ref = typeof acuan === "string" ? document.querySelector(acuan) : acuan; if (!ref?.parentNode) return false;
  const t = document.createElement("div"); t.innerHTML = tombol(); const b = t.firstChild; b.onclick = () => cetak();
  ref.parentNode.insertBefore(b, ref); return true;
}

window.Brief = {
  tema: a => { A = a; return a; },
  tombol, pasang, cetak,
  model: {diizinkan, html, tabel, daftar, kpi, KOSONG}};
})();
