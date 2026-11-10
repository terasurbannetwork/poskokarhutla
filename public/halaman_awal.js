/* Pengganti skrip sebaris kecil di halaman statis (CSP script-src tanpa 'unsafe-inline'). Dimuat sinkron di posisi skrip aslinya;
   perilaku dipilih lewat atribut data- pada tag <script> ini. data-tema="kunci1,kunci2" = tema anti kedip (bawaan pk-tema). */
(() => {
  const d = document.currentScript.dataset;
  if ("tema" in d) try { for (const n of (d.tema || "pk-tema").split(",")) { const t = JSON.parse(localStorage.getItem(n)); if (t) { document.documentElement.dataset.theme = t; break; } } } catch (e) {}
})();
