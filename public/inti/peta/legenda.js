"use strict";
/* Susun isi #legenda mendatar seperti karhutla: tiap judul (.lbl) membuka kelompok .lg-g baru, keterangan .leg lepas kelompok sendiri;
   tinggi isi bisa ditarik lewat pegangan dan diingat per perangkat. Dipanggil sesudah innerHTML #legenda diisi
   (<details id="legDet"><summary>..</summary><div class="lg-isi">). Karhutla masih punya salinan sendiri di index.html. */
export function susunLegenda(lg, {saatBuka}) {
  const det = lg.querySelector("#legDet"), isi = lg.querySelector(".lg-isi"); if (!det || !isi) return;
  det.ontoggle = e => saatBuka(e.target.open);
  let g = null;
  [...isi.children].forEach(x => { const lepas = x.classList.contains("leg") && g?.lastElementChild?.classList.contains("leg");
    if (!g || x.classList.contains("lbl") || lepas) { g = document.createElement("div"); g.className = "lg-g"; isi.appendChild(g); } g.appendChild(x); });
  let th = null; try { th = JSON.parse(localStorage.getItem("tinggi-legenda")); } catch (e) {}
  if (th) lg.style.setProperty("--tl", th + "px");
  const h = document.createElement("div"); h.className = "tarik-v"; h.title = "Tarik untuk mengubah tinggi"; lg.appendChild(h);
  h.onpointerdown = e => { e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add("aktif"); const y0 = e.clientY, t0 = isi.getBoundingClientRect().height;
    h.onpointermove = ev => lg.style.setProperty("--tl", Math.max(60, Math.min(innerHeight * .6, t0 + y0 - ev.clientY)) + "px");
    h.onpointerup = () => { h.classList.remove("aktif"); h.onpointermove = h.onpointerup = null; try { localStorage.setItem("tinggi-legenda", Math.round(isi.getBoundingClientRect().height)); } catch (e) {} }; };
}
