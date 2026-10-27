"use strict";
/* Tabel bersama (public/inti): paginasi dan pengurut kepala kolom. Butuh format.js (fmt). */
/* paginasi bergaya pangantara: "Menampilkan a–b dari n", Sebelumnya, nomor (dengan jeda …), Berikutnya; tombol membawa data-h (0-basis) */
function paginasi(hal, total, per, satuan = "baris") {
  const jml = Math.max(1, Math.ceil(total / per)); if (jml <= 1) return `<nav class="pgn"><p>${fmt(total)} ${satuan}</p></nav>`;
  const a = Math.min(Math.max(0, hal), jml - 1) + 1, dari = (a - 1) * per + 1, sampai = Math.min(a * per, total);
  const nomor = new Set([1, jml, a - 1, a, a + 1]); if (a <= 3) [2, 3, 4].forEach(n => nomor.add(n)); if (a >= jml - 2) [jml - 1, jml - 2, jml - 3].forEach(n => nomor.add(n));
  let prev = 0, deret = ""; [...nomor].filter(n => n >= 1 && n <= jml).sort((x, y) => x - y).forEach(n => { if (prev && n - prev > 1) deret += `<span class="pgn-j">…</span>`;
    deret += `<button type="button" class="pgn-b${n === a ? " on" : ""}" data-h="${n - 1}"${n === a ? ' aria-current="page"' : ""}>${n}</button>`; prev = n; });
  return `<nav class="pgn" aria-label="Paginasi"><p>Menampilkan ${fmt(dari)}–${fmt(sampai)} dari ${fmt(total)} ${satuan}</p><div>
    <button type="button" class="pgn-b" data-h="${a - 2}" ${a <= 1 ? "disabled" : ""}>‹ Sebelumnya</button>${deret}<button type="button" class="pgn-b" data-h="${a}" ${a >= jml ? "disabled" : ""}>Berikutnya ›</button></div></nav>`;
}
/* kepala kolom yang bisa diurut: <th><button data-k="kolom"><i></i></button></th>; st = {urut, turun, hal}; ulang() menggambar ulang */
function pengurutKepala(st, th, ulang) {
  th.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const k = b.dataset.k;
        st.turun = st.urut === k ? !st.turun : true; st.urut = k; st.hal = 0;
        th.querySelectorAll("button").forEach(x => x.querySelector("i").textContent = x === b ? (st.turun ? "↓" : "↑") : "");
    ulang(); });
}
/* tabel standar siap pakai: o = {kolom:[[kunci,judul,kanan?]], sel(r,kunci)->html, nilai(r,kunci)->nilai urut, urut, turun, per=10, satuan, pilih?(r), kosong?}
   Menggambar ke el; baris klik (pilih) membawa kelas .on. Pengurut & paginasi: chrome urgent, isi lewat nanti(). Mengembalikan {set(baris)}. */
function pasangTabel(el, o) {
  const st = {urut: o.urut, turun: !!o.turun, hal: 0}, per = o.per || 10, tunda = window.nanti || (f => setTimeout(f, 0)); let B = [], F = [], pilih = -1, kotor = true;
  const gambar = () => {
    if (kotor) F = B.map((r, i) => [r, i]).sort((x, y) => { const a = o.nilai(x[0], st.urut), b = o.nilai(y[0], st.urut); return (a < b ? -1 : a > b ? 1 : 0) * (st.turun ? -1 : 1); });
    kotor = false;
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(F.length / per) - 1));
    const bar = F.slice(st.hal * per, (st.hal + 1) * per).map(([r, i]) => `<tr data-i="${i}"${o.pilih ? ' class="klik' + (i === pilih ? " on" : "") + '" tabindex="0"' : ""}>${o.kolom.map(([k, , n]) => `<td${n ? ' class="n"' : ""}>${o.sel(r, k)}</td>`).join("")}</tr>`).join("");
    el.innerHTML = F.length ? `<div class="tw kj-tw"><table class="kj-tb"><thead><tr>${o.kolom.map(([k, t, n]) => `<th${n ? ' class="n"' : ""}><button data-k="${k}">${t}<i>${st.urut === k ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead><tbody>${bar}</tbody></table></div>${paginasi(st.hal, F.length, per, o.satuan)}` : `<p class="kosong">${o.kosong || "Tidak ada data."}</p>`;
    const th = el.querySelector("thead"); if (th) pengurutKepala(st, th, () => { kotor = true; tunda(gambar); });
  };
  el.addEventListener("click", e => {
    const b = e.target.closest(".pgn-b[data-h]"); if (b) { if (!b.disabled) {
      el.querySelectorAll(".pgn-b.on").forEach(x => { x.classList.remove("on"); x.removeAttribute("aria-current"); });
      if (/^\d+$/.test(b.textContent.trim())) { b.classList.add("on"); b.setAttribute("aria-current", "page"); }
      st.hal = +b.dataset.h; tunda(gambar); } return; }
    const tr = e.target.closest("tr.klik"); if (!tr || e.target.closest("a")) return;
    el.querySelectorAll("tr.on").forEach(x => x.classList.remove("on")); tr.classList.add("on"); pilih = +tr.dataset.i; o.pilih(B[pilih]); });
  el.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches?.("tr.klik")) e.target.click(); });
  return {set(baris) { B = baris; st.hal = 0; pilih = -1; kotor = true; gambar(); }};
}
