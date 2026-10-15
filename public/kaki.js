/* kaki.js — footer situs untuk halaman Insight, Berita, Tren, Dampak (pemilik, 14 Okt 2026).
   Merek + ringkasan di kiri, tiga kolom tautan, ikon sosial dari data/kontak.json, lalu baris hak cipta. */
(() => {
  const D = document, HAL = ["insight", "berita", "tren", "dampak", "foto"];
  const IK = {x: "M4 4l16 16M20 4 4 20", linkedin: "M6 9v10M6 5v.5M10 19v-6a3 3 0 0 1 6 0v6M10 13v6", facebook: "M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8z",
    instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5v.01", youtube: "M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM10 9l5 3-5 3z", tiktok: "M14 3v11a3 3 0 1 1-3-3M14 3a5 5 0 0 0 5 5"};
  D.head.insertAdjacentHTML("beforeend", `<style>
.page.scroll:has(> .kaki-situs){padding-bottom:0!important}
.page.scroll > .kaki-situs{margin:40px -18px 0!important}
.kaki-situs{margin:40px -16px 0;padding:44px 16px 24px;background:#0b1b33;color:#cfd8e6;font-size:13.5px}
.kaki-situs .kk{max-width:1120px;margin:0 auto}
.kaki-situs .kk-g{display:grid;grid-template-columns:1.6fr repeat(3,1fr);gap:28px}
.kaki-situs .kk-tum{display:inline-flex;align-items:center;gap:10px;text-decoration:none!important;}
.kaki-situs .kk-tum img{width:46px;height:auto}
.kaki-situs .kk-tum span{display:inline-block;font:900 20px/0.95 var(--display,Inter),sans-serif;letter-spacing:.02em;color:#fff}
.kaki-situs .kk-sl{color:#f5a06b!important;font-weight:600}
.kaki-situs .kk-al{display:flex;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid rgb(255 255 255 / .1);line-height:1.6;font-size:12.5px;color:inherit;text-decoration:none;transition:color .2s}
.kaki-situs .kk-al:hover span{text-decoration:underline;text-underline-offset:3px}
.kaki-situs .kk-al svg{flex:none;width:16px;height:16px;margin-top:2px;color:#f5a06b}
.kaki-situs .kk-m{display:flex;align-items:center;gap:10px;font:800 17px var(--display,Inter),sans-serif;color:#fff}
.kaki-situs .kk-m img{width:30px;height:30px}
.kaki-situs p{margin:10px 0 0;line-height:1.55;color:#a9b5c8;max-width:34ch}
.kaki-situs h4{margin:4px 0 10px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7f8ca3}
.kaki-situs ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.kaki-situs a{color:#e6ecf5;text-decoration:none}.kaki-situs a:hover{color:#fff;text-decoration:underline}
.kaki-situs .kk-s{display:flex;gap:10px;margin-top:20px}
.kaki-situs .kk-s a{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:transparent;border:1px solid rgb(255 255 255 / .22);color:#fff;transition:background .3s,border-color .3s,transform .3s}
.kaki-situs .kk-s a:hover{background:#e8742e;border-color:#e8742e;transform:translateY(-2px);text-decoration:none}
.kaki-situs .kk-s svg{width:16px;height:16px}
.kaki-situs .kk-b{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:32px;padding-top:16px;border-top:1px solid rgb(255 255 255 / .1);font-size:12px;color:#7f8ca3}
@media (max-width:760px){.kaki-situs .kk-g{grid-template-columns:1fr 1fr}.kaki-situs .kk-g > :first-child{grid-column:1/-1}}
</style>`);
  let sos = "";
  fetch("data/kontak.json").then(r => r.ok ? r.json() : {}).catch(() => ({})).then(k => {
    sos = Object.entries(k.sosial || {}).filter(([, u]) => /^https:\/\//.test(u || "")).map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener" aria-label="${n}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[n] ? `<path d="${IK[n]}"/>` : ""}</svg></a>`).join("");
    /* situs Teras Urban selalu ada sebagai ikon pertama */
    sos = `<a href="https://terasurban.com/" target="_blank" rel="noopener" aria-label="Situs Teras Urban" title="terasurban.com"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></a>` + sos;
    D.querySelectorAll(".kaki-situs .kk-s").forEach(el => el.innerHTML = sos);
  });
  const html = () => `<footer class="kaki-situs"><div class="kk"><div class="kk-g">
    <div class="kk-tu"><a class="kk-tum" href="https://terasurban.com/" target="_blank" rel="noopener" aria-label="Teras Urban"><img src="/img/teras-urban-mark.png" alt="" width="46" height="34"><span>TERAS<br>URBAN</span></a>
      <p>Unit socio-urban intelligence dan geospatial advisory. Jakarta, Indonesia.</p><p class="kk-sl">Di antara ruang dan manusia.</p>
      <div class="kk-s">${sos}</div><a class="kk-al" href="https://www.google.com/maps/search/?api=1&query=Jl.%20Plumpang%20Semper%20Raya%20No.%2022%2C%20Tugu%20Selatan%2C%20Koja%2C%20Jakarta%20Utara%2014260" target="_blank" rel="noopener" title="Buka di Google Maps"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg><span>Jl. Plumpang Semper Raya No. 22, RT.10/RW.2, Tugu Selatan, Kec. Koja, Jakarta Utara, DKI Jakarta 14260</span></a></div>
    <div><h4>Pantau</h4><ul><li><a href="/peta">Peta</a></li><li><a href="/insight">Insight</a></li><li><a href="/berita">Berita</a></li><li><a href="/tren">Tren</a></li><li><a href="/dampak">Dampak</a></li><li><a href="/foto">Foto</a></li></ul></div>
    <div><h4>Alat</h4><ul><li><a href="/sim">Simulasi</a></li></ul></div>
    <div><h4>Tentang</h4><ul><li><a href="/tentang">Tentang</a></li><li><a href="#" data-pesan>Hubungi kami</a></li></ul></div>
  </div></div></footer>`;
  /* di halaman tanpa tab (tentang.html) footer dipasang di akhir body */
  const pasang = () => { if (!D.querySelector(".page")) { if (!D.querySelector(".kaki-situs")) D.body.insertAdjacentHTML("beforeend", html()); return; }
    HAL.forEach(id => { const p = D.getElementById("p-" + id); if (p && !p.querySelector(":scope > .kaki-situs")) p.insertAdjacentHTML("beforeend", html()); }); };
  D.addEventListener("click", e => { if (e.target.closest?.("[data-pesan]")) { e.preventDefault(); D.getElementById("kirimPesan")?.click(); } });
  D.readyState === "loading" ? D.addEventListener("DOMContentLoaded", pasang) : pasang();
})();
