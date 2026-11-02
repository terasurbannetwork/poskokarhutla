/* Ruang Laporan: pilihan di hash (#omc), isi dalam iframe sesama asal. Klik hanya mengubah hash; src diset di hashchange. */
(() => {
  const bingkai = document.getElementById("rlBingkai"), tautan = [...document.querySelectorAll(".rl-rel a[data-ke]")];
  const dari = k => tautan.find(a => a.getAttribute("href") === "#" + k) || tautan[0];
  const dariPath = p => tautan.find(a => a.dataset.ke === p);
  const tandai = a => tautan.forEach(x => { if (x === a) { x.setAttribute("aria-current", "page"); x.scrollIntoView({block: "nearest", inline: "nearest"}); } else x.removeAttribute("aria-current"); });
  const pilih = () => {
    const a = dari(location.hash.slice(1));
    tandai(a);
    let skrg = ""; try { skrg = bingkai.contentWindow.location.pathname; } catch { /* lintas asal: abaikan */ }
    if (skrg === a.dataset.ke) return;
    bingkai.classList.add("rl-muat");
    bingkai.src = a.dataset.ke;
  };
  bingkai.addEventListener("load", () => {
    try {
      const d = bingkai.contentDocument, p = bingkai.contentWindow.location.pathname;
      if (!d || p === "blank") return;
      d.documentElement.classList.add("sematan");
      const a = dariPath(p);
      if (a) { tandai(a); const h = a.getAttribute("href"); if (location.hash !== h) history.replaceState(null, "", h); }
    } catch { /* bingkai tak terbaca: tetap tampilkan */ }
    bingkai.classList.remove("rl-muat");
  });
  addEventListener("hashchange", pilih);
  pilih();
})();
