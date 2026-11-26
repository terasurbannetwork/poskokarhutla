"use strict";
/* DP-17: lapisan status prakiraan karhutla di peta utama; dipindah dari skrip inline public/index.html (gerbang CSP inline, 26 Nov 2026) (modul bersama, dimuat malas saat kotak dinyalakan; chrome urgent, kerja berat di rAF) */
(() => { const L = document.getElementById("lapis"); if (!L) return; let h = null;
  const muatSkrip = u => new Promise((ok, no) => { const e = document.createElement("script"); e.src = u; e.onload = ok; e.onerror = no; document.head.append(e); });
  async function siapkan() {
    if (!document.getElementById("dpCss")) document.head.insertAdjacentHTML("beforeend", '<link id="dpCss" rel="stylesheet" href="/inti/dampak_peringatan.css?v=1">');
    if (!window.DampakPeringatan) await muatSkrip("/inti/dampak_peringatan.js?v=2");
    const nama = await fetch("/bencana.json").then(r => r.json()).then(j => (j.bencana || j).find?.(b => b.id === "karhutla")?.tingkat?.map(t => t.nama) || null, () => null);
    let kartu = document.getElementById("dpKartu");
    if (!kartu) { kartu = document.createElement("div"); kartu.id = "dpKartu"; kartu.hidden = true; kartu.style.cssText = "width:min(520px,100%)"; document.getElementById("dok").prepend(kartu); }
    h = DampakPeringatan.pasang(peta, {bahaya: "kht", nama, kartu});
  }
  L.addEventListener("change", e => { const i = e.target.closest('input[data-l="dampakstatus"]'); if (!i) return;
    e.stopImmediatePropagation();
    requestAnimationFrame(async () => { try { if (!h) await siapkan();
      if (i.checked) { if (!(await h.nyalakan())) { i.checked = false; typeof toast === "function" && toast("Status prakiraan belum tersedia"); } } else h.matikan();
    } catch (er) { console.warn("status prakiraan", er); i.checked = false; } }); }, true); })();
