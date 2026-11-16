"use strict";
/* cari.js: adaptor gunung api untuk mesin cari luas /inti/cari.js (PB-79b, F-38) dan profil kab/kota /inti/profil_kab.js (F-37).
   Kotak cari panel tetap menyaring daftar gunung dan provinsi seperti biasa (peta.js); di bawahnya, hasil lapisan umum (kab, desa, faskes, sekolah, bandara, posko, BPBD)
   muncul bila registri menyalakan kemampuan.layar.cari (lapisan dipilih registri). Memilih kab atau desa menerbangkan peta dan membuka profil bila
   kemampuan.layar.profil_kab menyala. Tanpa data baru, tanpa rute baru. Dimuat sesudah peta.js dan mesin inti (defer). */
(() => {
const PLACEHOLDER_LUAS = "Cari gunung, provinsi, desa, faskes, atau sekolah";
let hasilLuas = [];
const pasangCariLuas = () => { if (typeof CariLuas === "undefined" || pasangCariLuas.sudah) return typeof CariLuas !== "undefined";
  pasangCariLuas.sudah = true;
  CariLuas.tema({id: "gunungapi", nama: k => namaProv(k),
    terbang: t => { if (!peta) return; t.bb ? peta.fitBounds([[t.bb[0], t.bb[1]], [t.bb[2], t.bb[3]]], {padding: kiriPad(), maxZoom: 13, duration: 700}) : peta.flyTo({center: t.c, zoom: 11, duration: 700}); }});
  CariLuas.aktif().then(y => { if (y) $("#cari").placeholder = PLACEHOLDER_LUAS; }); return true; };
const muatProfilKab = () => muatProfilKab.p ||= new Promise(ok => { if (window.ProfilKab) return ok(window.ProfilKab.pasang("gunungapi"));
  const sc = document.createElement("script"); sc.src = "../inti/profil_kab.js"; sc.async = true;
  sc.onload = () => ok(window.ProfilKab?.pasang("gunungapi") || null); sc.onerror = () => { muatProfilKab.p = null; ok(null); }; document.head.appendChild(sc); });
const bukaProfilKab = async h => { if (!h || (h.t !== "kab" && h.t !== "desa")) return false; const P = await muatProfilKab(); return P ? P.buka(h.id) : false; };
const kotak = $("#cari"), hasil = $("#hasil");
if (!kotak || !hasil) return;
kotak.addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase(); hasil.hidden = true; hasilLuas = [];
  if (q.length < 2 || !pasangCariLuas()) return;
  /* lapisan umum dimuat malas, ditunda, dan hanya dirender bila ketikan masih sama */
  CariLuas.ketik(e.target.value, ({hasil: h}) => { if (kotak.value.trim().toLowerCase() !== q) return;
    hasilLuas = h || []; hasil.innerHTML = hasilLuas.length ? CariLuas.html(hasilLuas) : ""; hasil.hidden = !hasilLuas.length; }); });
hasil.addEventListener("click", e => { const b = e.target.closest("button[data-ci]"); if (!b) return; const h = hasilLuas[+b.dataset.ci];
  hasil.hidden = true; kotak.value = ""; S.q = ""; Peta.segarkan();
  CariLuas.pilih(+b.dataset.ci); nanti(() => bukaProfilKab(h)); });
document.addEventListener("click", e => { if (!hasil.hidden && !e.target.closest(".cari")) hasil.hidden = true; });
window.CariGunungapi = {muatProfilKab, bukaProfilKab};
})();
