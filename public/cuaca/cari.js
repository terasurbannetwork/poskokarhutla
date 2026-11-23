/* cari.js: adaptor cuaca ekstrem untuk kotak cari luas dan profil kab/kota (PB-79c, F-38 dan F-37). Mesin ada di public/inti/cari.js dan
   public/inti/profil_kab.js. Kotak #cari tetap menyaring daftar peringatan di panel (peta.js); di sini hasil lapisan umum (kab/kota, desa, faskes,
   sekolah, bandara, posko, BPBD) muncul di #hasil bila registri menyalakan kemampuan.layar.cari. Memilih hasil menerbangkan peta; hasil kab atau desa
   membuka profil kab/kota bila registri menyalakan kemampuan.layar.profil_kab. Tanpa lapisan di registri, berkas ini tidak melakukan apa pun.
   Dimuat sesudah peta.js. */
(() => {
if (typeof CariLuas === "undefined" || typeof S === "undefined") return;
const kotak = document.querySelector("#cari"), hasil = document.querySelector("#hasil"); if (!kotak || !hasil) return;
const PLACEHOLDER_LUAS = "Cari provinsi, kecamatan, desa, faskes, atau sekolah";
let siap = false;
const pasang = () => { if (siap) return; siap = true;
  CariLuas.tema({id: "cuaca", nama: k => (typeof namaProv === "function" ? namaProv(k) : k),
    terbang: t => t.bb ? peta.fitBounds([[t.bb[0], t.bb[1]], [t.bb[2], t.bb[3]]], {padding: kiriPad(), maxZoom: 13, duration: 700}) : peta.flyTo({center: t.c, zoom: 11, duration: 700})});
  if (window.ProfilKab) window.ProfilKab.pasang("cuaca"); };
const aktif = () => { pasang(); return CariLuas.aktif(); };
aktif().then(y => { if (y) kotak.placeholder = PLACEHOLDER_LUAS; }).catch(() => {});
const tutup = () => { hasil.hidden = true; hasil.innerHTML = ""; };
let td = 0;
kotak.addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase(); clearTimeout(td);
  if (q.length < 2) return tutup();
  td = setTimeout(async () => {
    if (!(await aktif().catch(() => false)) || kotak.value.trim().toLowerCase() !== q) return;
    CariLuas.ketik(e.target.value, ({hasil: h}) => { if (kotak.value.trim().toLowerCase() !== q) return;
      S.hasilLuas = h; hasil.innerHTML = h.length ? CariLuas.html(h) : ""; hasil.hidden = !h.length; }); }, 150); });
hasil.addEventListener("click", e => { const b = e.target.closest("button[data-ci]"); if (!b) return;
  const h = S.hasilLuas?.[+b.dataset.ci]; tutup(); kotak.value = ""; CariLuas.pilih(+b.dataset.ci);
  nanti(() => { if (h && (h.t === "kab" || h.t === "desa") && window.ProfilKab) window.ProfilKab.buka(h.id); }); /* mesin menolak sendiri bila profil_kab mati di registri */
  if (typeof renderPanel === "function") nanti(renderPanel); });
document.addEventListener("click", e => { if (!hasil.hidden && !e.target.closest(".cari")) tutup(); });
window.CariCuaca = {aktif, tutup};
})();
