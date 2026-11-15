/* Dashboard pimpinan lintas bencana (PB-31, model A). Semua angka dan kartu dibangun PbPimpinan (public/inti/dasbor_pimpinan.js) dari GET /api/pb/ringkas;
   halaman ini hanya memasang cangkang DasborA, pilihan provinsi, dan tautan masuk bila 403. */
(() => {
  "use strict";
  const pesan = document.getElementById("pesan");
  const prov = new URLSearchParams(location.search).get("prov") || "";
  const ambil = async (u, o) => {
    const r = await fetch(u, o);
    if (r.status === 401 || r.status === 403) {
      const a = document.createElement("a"); a.className = "bn-tombol"; a.textContent = "Masuk staf";
      a.href = "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search);
      pesan.replaceChildren(a);
    }
    return r;
  };
  DasborA.pasang({nama: "Pimpinan", sub: "Centurisk97, Ruang Koordinasi"});
  PbPimpinan.pasang(document.getElementById("isi"), {prov, provDaftar: Object.entries(RingkasBencana.PROV), ambil});
})();
