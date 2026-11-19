/* Tombol Keluar di kepala setiap halaman (pemilik, 17 Nov 2026: "Setiap halaman agar ada ini").
   Disisipkan Worker ke semua HTML bersesi (src/worker.js pasangKeluar); halaman yang sudah punya Keluar sendiri dilewati.
   Klik = cabut semua jenis sesi (staf, akun umum, instansi, kemitraan, pendataan), lalu /admin/keluar mencabut sesi admin dan pemirsa
   dan mengalihkan ke /admin/masuk. Gaya: ikon polos tanpa garis luar, warna ikut kepala. */
(() => {
  /* halaman pelapor publik (/lapor) menolak tombol ini lewat <body data-tanpa-keluar> (pemilik 19 Nov 2026: "gausah ada yang di atas untuk logout") */
  if (document.body?.hasAttribute("data-tanpa-keluar") || document.getElementById("keluar") || document.querySelector('form[action="/admin/keluar"]')) return;
  const kepala = document.querySelector("body > header") || document.querySelector(".ad-top")
    || [...document.querySelectorAll("header")].find(h => !h.closest("article, section, details, dialog"));
  if (!kepala) return;
  const b = document.createElement("button");
  b.type = "button"; b.id = "keluar"; b.className = "pb-keluar"; b.title = "Keluar"; b.setAttribute("aria-label", "Keluar");
  b.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg>';
  b.style.cssText = "display:inline-flex;align-items:center;justify-content:center;flex:none;width:34px;height:34px;padding:0;margin-left:auto;border:0;border-radius:8px;background:transparent;color:inherit;cursor:pointer";
  if (!/flex|grid/.test(getComputedStyle(kepala).display)) {   // kepala bukan flex: tempel di kanan tanpa mendorong isi ke baris baru
    if (getComputedStyle(kepala).position === "static") kepala.style.position = "relative";
    Object.assign(b.style, {position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)"});
  }
  b.addEventListener("click", async () => {
    b.disabled = true;
    await Promise.allSettled(["staf", "masuk", "instansi", "kemitraan", "pendataan"].map(k =>
      fetch(`/api/${k}/keluar`, {method: "POST", headers: {"x-pb": "1"}, credentials: "same-origin"})));
    const f = document.createElement("form"); f.method = "post"; f.action = "/admin/keluar"; document.body.append(f); f.submit();
  });
  kepala.append(b);
})();
