"use strict";
/* Kepala sidebar kiri /banjir seperti karhutla: kotak cari, segmen utama berikon (Real Time | Riwayat | Wilayah Siaga), baris indikator ringkas (Banjir | Rob | Longsor | Hujan | Sungai).
   Tombol baru memicu tombol lama yang disembunyikan (#modePeta, #bahayaSeg) sehingga logika peta tidak berubah: tidak ada fitur hilang.
   Chrome (aria-pressed) diset urgent saat klik; pekerjaan berat sudah dijadwalkan nanti() oleh penangan lama. Dimuat sesudah peta.js. */
(() => {
  const utama = document.querySelector("#utamaSeg"), ind = document.querySelector("#indikatorSeg"); if (!utama || !ind) return;
  const lama = (sel, kunci, v) => document.querySelector(`${sel} [data-${kunci}="${v}"]`);
  /* keadaan dari S: mode peta dan bahaya */
  const keadaan = () => ({u: S.mode === "riwayat" ? "riw" : "rt", i: S.mode === "status" ? S.b : S.mode === "riwayat" ? null : S.mode});
  function sinkron() { const k = keadaan();
    utama.querySelectorAll("button").forEach(b => { if (b.dataset.u !== "ws") b.setAttribute("aria-pressed", b.dataset.u === k.u); });
    ind.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.i === k.i)); ind.classList.toggle("redup", S.mode === "riwayat"); }
  utama.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.u === "ws") return bukaTab("daftar");   /* daftar gugus Wilayah Siaga prakiraan (tab Wilayah siaga), seperti Cluster api karhutla */
    lama("#modePeta", "mp", b.dataset.u === "riw" ? "riwayat" : "status")?.click(); sinkron(); });
  ind.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const v = b.dataset.i;
    if (v === "b" || v === "l") { lama("#bahayaSeg", "b", v)?.click(); if (S.mode !== "status") lama("#modePeta", "mp", "status")?.click(); }
    else lama("#modePeta", "mp", v)?.click();
    sinkron(); });
  sinkron();
})();
