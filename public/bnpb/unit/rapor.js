"use strict";
/* MB-6 perender kartu rapor Ruang Unit (DESAIN-TEKNIS 4.6, DESIGN-SYSTEM 5.2 dan 7.6; tiket RU-030).
   Skema kartu dibuat dan diperiksa scripts/bnpb/unit/rapor.py; layar hanya menampilkan, tidak menghitung ulang.
   Kepala kartu = nama seksi berikon, tanpa kalimat temuan (AGENTS.md 3.5, 11 Nov 2026). Angka temuan di baris ringkas isi
   kartu, satu-satunya tempat .hl. Tiap .hl dan sel angka membawa data-sumber dan title. Kosong tampil "belum ada data", tidak pernah 0.
   Butuh /inti/format.js (esc, fmt). Tanpa gaya atau skrip inline (CSP); semua teks data lewat esc().
   Pakai: UnitRapor.render(kartu, {dibuat, basi_jam}) -> <section>; UnitRapor.html(...) -> teks HTML yang sama. */
(() => {
  const IKON = {data: "M4 6h16M4 12h16M4 18h10", gudang: "M3 21V9l9-6 9 6v12|M7 21v-7h10v7", rumah: "M3 11l9-7 9 7|M5 10v10h14V10|M10 20v-5h4v5",
    timbang: "M12 3v18|M5 7h14|M5 7l-3 6h6z|M19 7l-3 6h6z", toga: "M22 10 12 5 2 10l10 5 10-5z|M6 12v5c3 2 9 2 12 0v-5",
    kaca: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z|M21 21l-5-5", kalender: "M4 6h16v14H4z|M4 10h16|M8 3v4|M16 3v4",
    resmi: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4", hitung: "M5 4h14v16H5z|M8 8h8|M8 12h2|M14 12h2|M8 16h2|M14 16h2",
    peta: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z|M9 4v14|M15 6v14", uang: "M3 7h18v10H3z|M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    orang: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M4 21c1-4 4-6 8-6s7 2 8 6",
    koran: "M4 5h13v14H6a2 2 0 0 1-2-2z|M17 9h3v8a2 2 0 0 1-2 2|M8 9h5|M8 13h5", proksi: "M4 9c3-3 5 3 8 0s5-3 8 0|M4 15c3-3 5 3 8 0s5-3 8 0",
    tanya: "M9 9a3 3 0 1 1 4 2.8c-.7.3-1 1-1 1.7V14|M12 18h.01", kosong: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M8 12h8"};
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${(Object.hasOwn(IKON, k) ? IKON[k] : IKON.data).split("|").map(d => `<path d="${d}"/>`).join("")}</svg>`;
  /* kata pil persis DESIGN-SYSTEM 11.4; kunci label P-7 */
  const LABEL = {resmi: ["Angka resmi", "resmi", "un-resmi"], sekunder: ["Sekunder, berita", "koran", "un-sekunder"],
    hitungan_kita: ["Hitungan kita", "hitung", "un-hitungan"], proksi: ["Proksi", "proksi", "un-proksi"]};
  const KOSONG = "belum ada data";
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = ms => { const d = new Date(ms); return isNaN(d) ? null : d.toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}).replace(/\./g, ""); };
  const pasal = p => !p.acuan ? "tanpa pasal (asumsi)" : [p.acuan, p.letak].filter(Boolean).join(" ") + (p.kutipan ? `: "${p.kutipan}"` : "") + (p.asumsi ? " (asumsi)" : "");
  const asal = k => (k.sumber || []).join(", ");
  /* isi tooltip tiap angka: asal, rumus, pasal; satu baris per hal, tanpa kata yang ditolak gerbang kartu standar */
  const tipAngka = (k, extra) => [extra, "Asal angka: " + asal(k), k.rumus && "Rumus: " + k.rumus, ...(k.aturan || []).map(p => "Pasal: " + pasal(p))].filter(Boolean).join("\n");

  function pilLabel(k) {
    const daftar = Array.isArray(k.label) ? k.label : [k.label];
    const pil = daftar.filter(l => Object.hasOwn(LABEL, l)).map(l => { const [kata, ik, kls] = LABEL[l];
      return `<button type="button" class="bn-pil un-lbl ${kls}" data-tip="${esc(tipAngka(k, kata))}" title="${esc(tipAngka(k, kata))}">${svg(ik)}${esc(kata)}</button>`; });
    const asumsi = (k.aturan || []).filter(p => p.asumsi);
    if (asumsi.length) { const t = asumsi.map(p => "Pasal: " + pasal(p)).join("\n");
      pil.push(`<button type="button" class="bn-pil un-lbl un-asumsi" data-tip="${esc(t)}" title="${esc(t)}">${svg("tanya")}Asumsi</button>`); }
    return pil.join("");
  }
  function pilPer(b, sekarang) {
    const dibuat = b && Date.parse(b.dibuat);
    if (!dibuat) return {pil: "", basi: false};
    const batas = b.basi_jam == null ? null : dibuat + b.basi_jam * 36e5, basi = batas != null && sekarang > batas;
    const kata = basi ? `basi sejak ${tgl(batas)}` : `per ${tgl(dibuat)}`;
    return {basi, pil: `<span class="bn-pil un-per${basi ? " un-basi" : ""}">${svg("kalender")}${esc(kata)}</span>`};
  }
  const angkaHtml = (k, v, judul) => v == null
    ? `<span class="un-kosong" data-sumber="${esc(asal(k))}" title="${esc(tipAngka(k, judul))}">${esc(KOSONG)}</span>`
    : `<span class="hl" data-sumber="${esc(asal(k))}" title="${esc(tipAngka(k, judul))}">${esc(fmt(v))}</span>`;

  function ringkas(k) {
    if (!(k.angka || []).length) return "";
    return `<dl class="un-ringkas">${k.angka.map(a => `<div><dt>${esc(a.label)}</dt><dd>${angkaHtml(k, a.nilai, a.title || a.label)}</dd></div>`).join("")}</dl>`;
  }
  function tabel(k) {
    const ko = k.kolom || [], ba = k.baris || [];
    if (!ko.length) return "";
    if (!ba.length) return `<p class="ad-kosong">${svg("kosong")}Belum ada data.</p>`;
    const th = ko.map(c => `<th scope="col"${c.title ? ` title="${esc(c.title)}"` : ""}>${esc(c.label)}</th>`).join("");
    const sel = (b, c, i) => {
      const v = b[c.k], lbl = ` data-label="${esc(c.label)}"`;
      if (c.angka) return v == null
        ? `<td class="n un-kosong"${lbl} data-sumber="${esc(asal(k))}" title="${esc(tipAngka(k, c.title || c.label))}">${esc(KOSONG)}</td>`
        : `<td class="n"${lbl} data-sumber="${esc(asal(k))}" title="${esc(tipAngka(k, c.title || c.label))}">${esc(fmt(v))}</td>`;
      const t = v == null || v === "" ? "–" : esc(v);
      return i === 0 ? `<th scope="row"${lbl}>${t}</th>` : `<td${lbl}>${t}</td>`;
    };
    return `<div class="ad-tabel-wadah ex-tabel" role="region" tabindex="0" aria-labelledby="${esc(k.id)}-j"><table class="ad-tabel"><thead><tr>${th}</tr></thead><tbody>${
      ba.map(b => `<tr>${ko.map((c, i) => sel(b, c, i)).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function html(k, b, sekarang = Date.now()) {
    const id = esc(k.id), per = pilPer(b, sekarang);
    const isi = [per.basi ? `<p class="ad-spanduk" role="status">Data belum diperbarui sejak batas waktunya; angka di bawah adalah angka terakhir.</p>` : "", ringkas(k), tabel(k)].join("");
    return `<section class="ex ex-std" id="${id}" aria-labelledby="${id}-j"><header class="ex-hd"><div class="ex-pl"><span class="ex-ey">${esc(k.pil)}</span>${pilLabel(k)}${per.pil}</div>` +
      `<div class="ex-jd"><h3 id="${id}-j">${svg(k.ikon)}${esc(k.judul)}</h3></div></header>` +
      `<div class="ex-bd">${isi || `<p class="ad-kosong">${svg("kosong")}Belum ada data.</p>`}</div></section>`;
  }
  function render(k, b, sekarang) {
    const t = document.createElement("template");
    t.innerHTML = html(k, b, sekarang);   // semua teks data sudah lewat esc()
    return t.content.firstElementChild;
  }
  window.UnitRapor = {html, render, LABEL, IKON, KOSONG};
})();
