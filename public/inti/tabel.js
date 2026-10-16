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
