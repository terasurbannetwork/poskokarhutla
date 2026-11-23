/* cari.js: adaptor kekeringan untuk mesin bersama /inti/cari.js (F-38) dan /inti/profil_kab.js (F-37), PB-79a. Provinsi dan kabupaten/kota berstatus tetap
   dari daftar halaman (peta.js); di sini hanya lapisan umum dari mesin (desa, faskes, sekolah, bandara, posko, BPBD, kabupaten/kota), dipilih registri
   kemampuan.layar.cari. Hasil kabupaten/kota yang sudah muncul sebagai kabupaten berstatus disembunyikan (satu baris per wilayah). Hasil kab atau desa
   membuka dialog profil (ProfilKab) bila registri menyalakan kemampuan.layar.profil_kab; tanpa itu peta tetap terbang ke lokasinya.
   Dimuat sesudah ../inti/cari.js dan ../inti/profil_kab.js. Tanpa data baru (D16). */
(() => {
if (typeof CariLuas === "undefined") return;
const PLACEHOLDER = "Cari provinsi, kabupaten/kota, desa, faskes, atau sekolah";
let hasil = [], profilAktif = false;
const ada = typeof ProfilKab !== "undefined" ? ProfilKab.pasang("kekeringan") : null;
ada?.diizinkan().then(y => { profilAktif = !!y; if (window.KekCari) window.KekCari.profilAktif = profilAktif; });
CariLuas.tema({id: "kekeringan", nama: k => namaProv(k),
  terbang: t => t.bb ? peta.fitBounds([[t.bb[0], t.bb[1]], [t.bb[2], t.bb[3]]], {padding: kiriPad(), maxZoom: 13, duration: 700}) : peta.flyTo({center: t.c, zoom: 11, duration: 700})});
CariLuas.aktif().then(y => { if (y) $("#cari").placeholder = PLACEHOLDER; });

/* kunci kabupaten berstatus di daftar halaman: "kodeProv|nama" */
const sudahBerstatus = h => h.t === "kab" && !!S.wil?.kab?.[(h.id || "").slice(0, 2) + "|" + h.n];
function ketik(mentah) {
  const q = mentah.trim().toLowerCase();
  CariLuas.ketik(mentah, ({hasil: h}) => {
    if ($("#cari").value.trim().toLowerCase() !== q) return;
    const w = document.getElementById("cariLuas"); if (!w) return;
    hasil = h; w.innerHTML = CariLuas.html(h);
    h.forEach((x, i) => { if (sudahBerstatus(x)) w.querySelector(`[data-ci="${i}"]`)?.setAttribute("hidden", ""); });
    document.getElementById("cariKosong")?.toggleAttribute("hidden", h.some(x => !sudahBerstatus(x))); }); }
/* profil kab/kota; false bila registri mati atau kodenya bukan wilayah */
const profil = async id => (ada ? ada.buka(id) : false);
async function pilih(i) { const h = hasil[i]; if (!h) return false; CariLuas.pilih(i);
  return h.t === "kab" || h.t === "desa" ? profil(h.id) : false; }

window.KekCari = {ketik, pilih, profil, profilAktif, sudahBerstatus};
})();
