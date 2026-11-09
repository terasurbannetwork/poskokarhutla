/* Penampil PDF katalog dokumen: PDF.js menggambar tiap halaman ke kanvas, jadi tidak bergantung pada penampil bawaan peramban yang direbut pengelola unduhan (IDM).
   Halaman digambar saat mendekati layar dan dilepas saat jauh, supaya deck puluhan halaman tidak menghabiskan memori. isEvalSupported dimatikan (CVE-2024-4367, CSP juga melarang eval). */
"use strict";
window.KatalogPdf = (() => {
  const LEBAR_GAMBAR = 1600;
  let pustaka = null;
  const muat = () => pustaka ||= import("/vendor/pdfjs/pdf.min.mjs").then(p => { p.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs"; return p; }).catch(e => { pustaka = null; throw e; });

  async function tampil(data, wadah) {
    const pdfjs = await muat(), tugas = pdfjs.getDocument({data, isEvalSupported: false}), doc = await tugas.promise;
    const awal = (await doc.getPage(1)).getViewport({scale: 1}), rasio = `${awal.width} / ${awal.height}`, hidup = new Map();
    let selesai = false;
    const lepas = c => { hidup.get(c)?.cancel(); hidup.delete(c); delete c.dataset.gambar; c.width = 1; c.height = 1; c.style.setProperty("aspect-ratio", rasio); };
    const gambar = async c => {
      if (selesai || c.dataset.gambar) return;
      c.dataset.gambar = "1";
      try {
        const hal = await doc.getPage(Number(c.dataset.hal)); if (selesai || !c.dataset.gambar) return;
        const dasar = hal.getViewport({scale: 1}), vp = hal.getViewport({scale: LEBAR_GAMBAR / dasar.width});
        c.width = vp.width; c.height = vp.height; c.style.setProperty("aspect-ratio", `${dasar.width} / ${dasar.height}`);
        const r = hal.render({canvasContext: c.getContext("2d"), viewport: vp}); hidup.set(c, r);
        await r.promise; hidup.delete(c);
      } catch (e) { if (e?.name !== "RenderingCancelledException") console.error("pdf", e); }
    };
    const pantau = new IntersectionObserver(ms => { for (const m of ms) m.isIntersecting ? gambar(m.target) : lepas(m.target); }, {root: wadah.closest(".kd-p-isi"), rootMargin: "1200px 0px"});
    for (let i = 1; i <= doc.numPages; i++) {
      const c = document.createElement("canvas"); c.dataset.hal = i; c.width = 1; c.height = 1; c.style.setProperty("aspect-ratio", rasio);
      c.setAttribute("role", "img"); c.setAttribute("aria-label", `Halaman ${i} dari ${doc.numPages}`);
      wadah.append(c); pantau.observe(c);
    }
    return {halaman: doc.numPages, hancur() { selesai = true; pantau.disconnect(); for (const r of hidup.values()) r.cancel(); hidup.clear(); tugas.destroy(); }};
  }
  return {tampil};
})();
