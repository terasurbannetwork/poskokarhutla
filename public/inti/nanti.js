/* nanti(fn): jalankan kerja berat SESUDAH frame berikutnya tercat (chrome kontrol yang baru diubah tampil dulu = INP rendah).
   Dua rAF bersarang + jaring setTimeout 120 ms untuk tab tersembunyi (rAF berhenti). Sama dengan nanti di index.html. */
window.nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } };
  requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
