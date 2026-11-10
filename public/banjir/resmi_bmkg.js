"use strict";
/* Kartu Insight "Peringatan resmi BMKG": Peringatan Dini Curah Hujan Tinggi per dasarian, gambar resmi apa adanya.
   Gambar = peta WMS milik BMKG (layer pcht_das, parameter date + num, persis yang dipakai halaman cews.bmkg.go.id/peringatancurahhujan.php).
   Warna TIDAK didigitalkan jadi angka; kita hanya menampilkan. Ini status resmi, terpisah dari deteksi dan prakiraan kita.
   Daftar dasarian tidak bisa dibaca peramban (halaman BMKG tanpa CORS): dihitung dari kalender, dimulai dari dasarian terakhir yang sudah selesai
   (10 Nov 2026: BMKG masih menjadikan Dasarian III Oktober yang terbaru). Dasarian yang belum terbit tampil sebagai peta kosong tanpa isian.
   ponytail: daftar dari kalender, bukan dari BMKG; bila BMKG menerbitkan lebih awal, geser mulai() satu dasarian. */
const ResmiBMKG = (() => {
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"], ROMAWI = ["", "I", "II", "III"];
  const WMS = "https://cews.bmkg.go.id/cgi-bin/mapserv?map=bmkg", SUMBER = "https://cews.bmkg.go.id/peringatancurahhujan.php", HALAMAN = "https://www.bmkg.go.id/peringatan-dini/curah-hujan";
  const KODE = (t, n) => `${t}#${n}`;
  /* tgl "YYYY-MM-DD" (WIB) -> dasarian yang sedang berjalan {t: "YYYY-MM-01", n} */
  const kini = tgl => ({t: tgl.slice(0, 8) + "01", n: +tgl.slice(8, 10) <= 10 ? 1 : +tgl.slice(8, 10) <= 20 ? 2 : 3});
  const mundur = ({t, n}) => { if (n > 1) return {t, n: n - 1}; const d = new Date(Date.parse(t + "T12:00:00Z")); d.setUTCMonth(d.getUTCMonth() - 1); return {t: d.toISOString().slice(0, 8) + "01", n: 3}; };
  const label = ({t, n}) => `Dasarian ${ROMAWI[n]} ${BULAN[+t.slice(5, 7) - 1]} ${t.slice(0, 4)}`;
  /* daftar dasarian terbaru dulu, mulai dari yang terakhir selesai */
  function daftar(tgl, jml = 9) { const L = []; let d = mundur(kini(tgl)); for (let i = 0; i < jml; i++, d = mundur(d)) L.push({...d, kode: KODE(d.t, d.n), nama: label(d)}); return L; }
  const gambar = ({t, n}) => `${WMS}&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=pcht_das,prov,kabkot&date=${t}&num=${n}&CRS=EPSG:4326&BBOX=-11.5,94,6.5,142&WIDTH=1600&HEIGHT=600&STYLES=`;
  const ikon = i => `${WMS}&mode=legendicon&icon=pcht_das,${i}`;
  const LEGENDA = ["Tidak ada peringatan", "Waspada", "Siaga", "Awas"];
  return {kini, mundur, label, daftar, gambar, ikon, LEGENDA, SUMBER, HALAMAN};
})();
if (typeof window !== "undefined" && typeof Insight !== "undefined") {
  const css = document.createElement("style");
  css.textContent = `.rb-peta{margin:0;background:#fff;border:1px solid var(--line);border-radius:8px;overflow:hidden}.rb-peta img{display:block;width:100%;height:auto;aspect-ratio:8/3}
.rb-leg{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12.5px}.rb-leg span{display:inline-flex;align-items:center;gap:6px}.rb-leg img{width:26px;height:13px;border:1px solid var(--line)}
.rb-aksi{display:flex;gap:8px}.rb-aksi a{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;border:1px solid var(--line);border-radius:8px;color:inherit;text-decoration:none;font-size:13px;font-weight:600}
.rb-aksi a:hover{background:color-mix(in oklch,var(--surface),currentColor 6%)}.rb-aksi svg{width:15px;height:15px;flex:none}
.rb-cat{margin:0;font-size:12.5px}@media(max-width:600px){.rb-aksi{flex-direction:column}}`;
  document.head.appendChild(css);
  /* error img tidak bubble: dengarkan fase capture. Peta gagal = kartu dibuang; ikon legenda gagal = disembunyikan */
  document.addEventListener("error", e => { const i = e.target; if (i?.tagName !== "IMG" || !i.closest('[data-ex="resmi"]')) return;
    if (i.closest(".rb-peta")) i.closest("[data-ex]").remove(); else i.style.display = "none"; }, true);
  Insight.LABEL.resmi = "Resmi BMKG";
  Insight.EX.splice(Insight.EX.indexOf("status") + 1, 0, "resmi");
  const IK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>';
  Insight.exResmi = function () {
    const L = ResmiBMKG.daftar(Dini.wib()), d = L.find(x => x.kode === this.st.resmi) || L[0], nama = esc(d.nama);
    const sel = `<select data-set="resmi" aria-label="Dasarian peringatan BMKG">${L.map(x => `<option value="${x.kode}"${x.kode === d.kode ? " selected" : ""}>${esc(x.nama)}</option>`).join("")}</select>`;
    const isi = `<figure class="rb-peta"><img src="${ResmiBMKG.gambar(d)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="1600" height="600" alt="Peta Peringatan Dini Curah Hujan Tinggi BMKG, berlaku ${nama}"></figure>
      <div class="rb-leg" aria-label="Legenda peringatan">${ResmiBMKG.LEGENDA.map((n, i) => `<span><img src="${ResmiBMKG.ikon(i)}" alt="" loading="lazy">${n}</span>`).join("")}</div>
      <p class="rb-cat">Peta peringatan dini curah hujan tinggi BMKG untuk ${nama} (label dasarian dihitung dari kalender, bukan dibaca dari BMKG). Ini status resmi BMKG, terpisah dari deteksi dan prakiraan kami; peta ditampilkan utuh dan tidak kami ubah menjadi angka.</p>
      <div class="rb-aksi"><a href="${ResmiBMKG.SUMBER}" target="_blank" rel="noopener">${IK}Peta interaktif dan arsip dasarian</a><a href="${ResmiBMKG.HALAMAN}" target="_blank" rel="noopener">${IK}Halaman peringatan BMKG</a></div>`;
    return Kartu.ex(`Peringatan dini curah hujan tinggi BMKG, ${this.hl(nama)}`, "", "", isi, `Sumber: BMKG, diambil ${Dini.tglIndo(Dini.wib())}`, sel).replace('class="ex"', 'class="ex ex-std"');
  };
}
