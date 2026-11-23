/* PB-68.9: ?bencana=<id> di /tentang: isi untuk bencana itu; tanpa parameter atau karhutla = tampilan lama.
   Dimuat sinkron di <head> supaya kelas bc-lain terpasang sebelum isi tergambar. Kepala bencana dan sumber data
   diambil dari registri (bagikan.sumber); id tak dikenal = kembali ke tampilan karhutla. */
(() => {
  const m = /[?&]bencana=([a-z0-9_-]+)/.exec(location.search);
  if (!m || m[1] === "karhutla") return;
  const akar = document.documentElement, id = m[1];
  akar.classList.add("bc-lain"); akar.dataset.bencana = id;
  fetch("/bencana.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : Promise.reject()).then(r => {
    const b = (r.bencana || []).find(x => x.id === id);
    if (!b) { akar.classList.remove("bc-lain"); return; }
    const pasang = () => {
      const t = document.getElementById("bcTag"); if (!t) return;
      if (/^#[0-9a-fA-F]{3,8}$/.test(b.warna || "")) t.style.setProperty("--bc", b.warna);
      const nama = document.createElement("b"), dot = document.createElement("i");
      dot.className = "bc-titik"; nama.append(dot, b.nama || id); t.append(nama);
      const sm = b.bagikan && b.bagikan.sumber; if (sm) t.append("Sumber data: " + sm);
    };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", pasang, {once: true}) : pasang();
  }).catch(() => {});
})();
