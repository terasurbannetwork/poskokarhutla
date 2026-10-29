"use strict";
/* ================================================================ kejadian banjir aktif: lapisan peta + laci + tautan /banjir/k/B0007 */
/* Data (scripts/banjir/kejadian_aktif.py): data/kejadian_aktif_awal.json (atribut ringan, dimuat sekali) dan kejadian_aktif_geo.json (poligon gabungan,
   dimuat malas saat peta siap). Kejadian = gugus kecamatan BERSEBELAHAN berstatus banjir >= Siaga hari ini: deteksi Centurisk97 dari prakiraan model,
   BUKAN pernyataan resmi. Berkas basi lebih dari 1 hari atau kosong: lapisan tidak digambar (A18).
   Respons terdekat (data/unit_respons.json, OSM + BNPB, scripts/banjir/unit_respons.py) dibuat tetapi disembunyikan lewat kejadian.css (A24), seperti karhutla. */
const KejAktif = {
  /* false = URL kejadian berbentuk /banjir/?k=B0007 (hidup tanpa perubahan worker). Ubah ke true setelah src/bencana.js melayani /banjir/k/B0007 (registry banjir tak lagi `warisan`). */
  PATH_K: true,
  K: null, D: null, G: null, U: null, aktif: null, _ia: false, _p: null, _g: null, _u: null, _n: 0, _buka: false,
  url: kode => KejAktif.PATH_K ? "/banjir/k/" + kode : "/banjir/?k=" + kode,
  muatAwal() { return this._p ||= muatJSON("data/kejadian_aktif_awal.json").then(d => {
    const segar = d?.hari && Math.abs(Date.parse(hariWIB() + "T12:00:00+07:00") - Date.parse(d.hari + "T12:00:00+07:00")) <= 864e5;
    this.D = segar ? d : null; return this.K = segar && Array.isArray(d.kejadian) ? d.kejadian : []; }).catch(() => (this.K = [])); },
  geo() { return this._g ||= muatJSON("data/kejadian_aktif_geo.json").then(d => this.G = d).catch(() => (this._g = null)); },
  unit() { return this._u ||= muatJSON("data/unit_respons.json").then(d => this.U = d.unit || []).catch(() => (this._u = null)); },
  warna: lv => WARNA_LV[Math.min(3, Math.max(2, lv || 2))],
  /* nama dari kabupaten anggota: "Aceh Barat Daya" atau "Aceh Jaya dan 2 lainnya" */
  kab(k) { const a = [...new Set(k.kec.map(x => x.split("|")[1]))]; return a.length > 2 ? `${a.slice(0, 2).join(", ")} dan ${fmt(a.length - 2)} lainnya` : a.join(" dan "); },
  nama: k => "Wilayah Siaga " + KejAktif.kab(k),
  tgl: t => tglPendek(t),

  /* lapisan di peta (dipanggil dari Peta.pasang, juga tiap gaya peta berganti): titik pusat selalu, poligon bila zoom cukup */
  async lapis() {
    if (!peta || peta.getSource("kejpusat")) return;
    const K = await this.muatAwal(); if (!K.length || !peta || peta.getSource("kejpusat")) return;   /* dua lapis() bersamaan (ganti gaya cepat): periksa ulang sesudah await */
    const bl = Peta.bawahLabel(), vis = {visibility: Peta.lihat("kejadian") ? "visible" : "none"}, W = ["match", ["get", "lv"], 3, WARNA_LV[3], WARNA_LV[2]];
    peta.addSource("kejpusat", {type: "geojson", data: {type: "FeatureCollection", features: K.map(k => ({type: "Feature", geometry: {type: "Point", coordinates: [k.pusat[1], k.pusat[0]]},
      properties: {kode: k.kode, lv: k.level_tertinggi, skor: k.skor}}))}});
    peta.addLayer({id: "kej-titik", type: "circle", source: "kejpusat", minzoom: Gelembung.ZOOM.kabMin, maxzoom: 8,   /* zoom nasional: hanya gelembung berangka (gelembung.js); titik Wilayah Siaga muncul terinci saat zoom masuk */ layout: {...vis, "circle-sort-key": ["get", "skor"]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 5, 8, 11], "circle-color": W, "circle-opacity": .9, "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
    this.garis(bl, vis, W); renderLegenda();
    if (this._ia) return; this._ia = true;
    /* pendengar terpisah dari klik wilayah: hanya kursor dan kartu hover */
    for (const id of ["kej-titik", "kej-isi"]) {
      peta.on("mousemove", id, e => { Peta.diKej = true; peta.getCanvas().style.cursor = "pointer"; const k = this.K?.find(x => x.kode === e.features[0].properties.kode); if (k && PI) PI.tampilTip(this.kartu(k), e.originalEvent); });
      peta.on("mouseleave", id, () => { Peta.diKej = false; peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); }); } },
  /* poligon gabungan kecamatan (geo dimuat malas, sesudah titik) */
  async garis(bl, vis, W) {
    const G = await this.geo(); if (!G?.features?.length || !peta || peta.getSource("kejgeo")) return;
    peta.addSource("kejgeo", {type: "geojson", data: {type: "FeatureCollection", features: G.features.map(f => ({...f, properties: {kode: f.properties.kode, lv: this.K.find(k => k.kode === f.properties.kode)?.level_tertinggi || 2}}))}});
    peta.addLayer({id: "kej-isi", type: "fill", source: "kejgeo", minzoom: 5, layout: vis, paint: {"fill-color": W, "fill-opacity": .3}}, bl);
    peta.addLayer({id: "kej-garis", type: "line", source: "kejgeo", minzoom: 5, layout: vis, paint: {"line-color": W, "line-width": 2.2}}, bl);
    peta.addLayer({id: "kej-pilih", type: "line", source: "kejgeo", filter: ["==", ["get", "kode"], this.aktif?.k.kode || ""], layout: vis, paint: {"line-color": gelap() ? "#fff" : "#0b2545", "line-width": 4}}, bl); },
  tampil(on) { for (const id of ["kej-titik", "kej-isi", "kej-garis", "kej-pilih"]) peta?.getLayer(id) && peta.setLayoutProperty(id, "visibility", on ? "visible" : "none"); },
  /* klik di peta: kode kejadian di titik, atau null */
  hit(titik, poligon = false) { const L = [poligon ? "kej-isi" : "kej-titik"].filter(id => peta.getLayer(id) && peta.getLayoutProperty(id, "visibility") !== "none"); if (!L.length) return null;
    return peta.queryRenderedFeatures(titik, {layers: L})[0]?.properties.kode || null; },
  kartu: k => PI.kartuTip({judul: esc(KejAktif.nama(k)), stat: [["perisai", LEVEL[k.level_tertinggi], "tingkat tertinggi", KejAktif.warna(k.level_tertinggi), k.level_tertinggi >= 3],
    ["mata", fmt(k.n_kec), "kecamatan", "#3f7fb8"], ["hujan", k.h3_mm != null ? fmt(Math.round(k.h3_mm)) + " mm" : "–", "hujan 3 hari", "#3f7fb8"]], kaki: "Prakiraan model, bukan kejadian teramati"}),

  /* buka satu kejadian: peta fit ke poligon + laci. dorong = ubah URL */
  async buka(kode, dorong = true) {
    const n = this._n = (this._n || 0) + 1;   /* dua klik berurutan atau tutup laci: hanya panggilan terakhir yang menang */
    if (!document.querySelector("#p-peta.on")) bukaTab("peta", false);
    const K = await this.muatAwal(); if (n !== this._n) return; const k = K.find(x => x.kode === kode);
    if (!k) { toast("Wilayah Siaga " + kode + " tidak ditemukan atau sudah selesai"); this.url_bersih(); return; }
    if (dorong) history.replaceState(null, "", this.url(kode));
    peta?.getLayer("kej-pilih") && peta.setFilter("kej-pilih", ["==", ["get", "kode"], kode]);
    const G = await this.geo(); if (n !== this._n) return;
    nanti(() => { if (n !== this._n) return; this.aktif = {k}; peta?.getLayer("kej-pilih") && peta.setFilter("kej-pilih", ["==", ["get", "kode"], kode]);
      const f = G?.features?.find(x => x.properties.kode === kode);
      peta?.fitBounds(f ? kotak([f]) : [[k.bbox[0], k.bbox[1]], [k.bbox[2], k.bbox[3]]], {padding: kiriPad(), duration: 700, maxZoom: 10});
      this.laci(k); this.responsDekat(k, n); }); },
  laci(k) {
    const lv = k.level_tertinggi, kab = this.kab(k), ps = (k.prov || []).map(namaProv).join(", ");
    const kec = k.kec.map(x => x.split("|")), ada = kec.slice(0, 8);
    const isi = `<div class="grid g4">${kot("Tingkat", `<span style="color:${this.warna(lv)}">${LEVEL[lv]}</span>`, "tertinggi di gugus")}${kot("Kecamatan", fmt(k.n_kec), "berdampingan, Siaga atau lebih")}
      ${k.penduduk ? kot("Penduduk", rb(k.penduduk) + " jiwa", "di kecamatan terdeteksi") : ""}${k.h3_mm != null ? kot("Hujan 3 hari", fmt(Math.round(k.h3_mm)) + " mm", fmt(Math.round(k.h3_mm / 3)) + " mm/hari rata-rata") : ""}</div>
      <p class="fnd" translate="no"><b>${ada.map(x => esc(x[2])).join(", ")}${kec.length > ada.length ? ` dan ${fmt(kec.length - ada.length)} lainnya` : ""}</b><br>${esc(kab)}</p>
      <p class="fnd">Mulai terdeteksi ${this.tgl(k.sejak)}. Skor indeks ${fmt(Math.round(k.skor))} dari 100 <span class="pill" style="background:var(--surface);color:var(--ink2)">belum dikalibrasi</span>${k.bahaya_banjir != null ? `; bahaya banjir InaRISK ${k.bahaya_banjir >= .66 ? "tinggi" : k.bahaya_banjir >= .33 ? "sedang" : "rendah"}` : ""}${k.sungai ? `; ${fmt(k.sungai.titik)} titik sungai di dekatnya` : ""}.</p>
      <div id="kejRespons" data-j="Respons terdekat"></div>
      <details class="lipat"><summary>Cara skor dihitung</summary><div class="isi"><p class="fnd">Indeks 0 sampai 100 untuk mengurutkan wilayah Siaga, bukan peluang atau ukuran kerusakan. Terdiri dari tingkat peringatan (40 poin; Awas bernilai penuh), jumlah penduduk di kecamatan terdeteksi (30; makin banyak makin tinggi, naik pelan), jumlah kecamatan (15; penuh pada 10 kecamatan atau lebih), dan bahaya banjir InaRISK (15). Bagian yang datanya tidak ada dibuang, bobotnya dibagi ulang. Status banjir sendiri masih sering memberi alarm palsu, jadi indeks ini belum dikalibrasi.</p></div></details>
      <p class="fnd">Sumber: Open-Meteo, GloFAS, InaRISK. Prakiraan model, bukan kejadian teramati dan bukan pernyataan resmi BNPB/BMKG. Diperbarui ${esc(jamWIB(this.D?.dibuat || Date.now()))}.</p>`;
    this._buka = true; Analisa.buka(isi, `<div><h3 id="dlgJudul" translate="no">${esc(this.nama(k))}</h3><p>Wilayah Siaga (prakiraan)<br><span translate="no">${esc(k.kode)}</span>, ${esc(ps)}</p></div>`); this._buka = false;
    const el = $("#laci"); el.dataset.kej = k.kode;
    const t = el.querySelector(".tutup"); if (t) { const lama = t.onclick; t.onclick = ev => { lama?.(ev); this.bersih(); }; }
    el.querySelector(".hd-aksi")?.insertAdjacentHTML("afterbegin", `<button class="bagikan ik-btn" aria-label="Bagikan" title="Bagikan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg></button>`);
    el.querySelector(".bagikan").onclick = () => this.bagikan(k); },
  /* unit respons terdekat dari pusat kejadian: Basarnas, pos SAR, BPBD. DISEMBUNYIKAN (A24, kejadian.css) seperti "Respons terdekat" karhutla: cakupan OSM tidak lengkap, nomor belum diverifikasi */
  async responsDekat(k, n) {
    const el = $("#laci"), s = $("#kejRespons"); if (!s || getComputedStyle(s).display === "none") return;   /* disembunyikan (A24): tidak memuat unit_respons.json */
    const U = await this.unit(); if (!U?.length || n !== this._n || !s?.isConnected || el.dataset.kej !== k.kode) return;
    const [la, lo] = k.pusat, jauh = u => km(la, lo, u.lat, u.lon), dekat = (j, m) => U.filter(u => u.j === j).map(u => ({...u, d: jauh(u)})).sort((a, b) => a.d - b.d).slice(0, m);
    const R = [...dekat("basarnas", 1), ...dekat("pos", 1), ...dekat("bpbd", 2)].sort((a, b) => a.d - b.d), J = {basarnas: "Basarnas", pos: "Pos SAR", bpbd: "BPBD"};
    s.innerHTML = `<details class="lipat" data-j="Respons terdekat" open><summary>Respons terdekat</summary><div class="isi"><table class="tb2"><tbody>${R.map(u => `<tr><td><b>${J[u.j]}</b> <span translate="no">${esc(u.n)}</span></td><td class="n" translate="no">${fmt(Math.round(u.d))} km${u.t ? ", " + esc(u.t) : ""}</td></tr>`).join("")}</tbody></table>
      <p class="fnd">Jarak garis lurus dari pusat wilayah Siaga. Sumber: OpenStreetMap dan BNPB; cakupan tidak lengkap, nomor perlu dicek ulang.</p></div></details>`; },
  async bagikan(k) { const u = location.origin + this.url(k.kode);
    try { if (navigator.share) return await navigator.share({title: this.nama(k), url: u}); await navigator.clipboard.writeText(u); toast("Tautan disalin"); } catch (e) { if (e?.name !== "AbortError") toast("Tautan belum bisa dibagikan"); } },
  url_bersih() { if (/^\/banjir\/k\//.test(location.pathname) || /[?&]k=B\d+/.test(location.search)) history.replaceState(null, "", "/banjir/peta"); },
  /* laci ditutup atau laci lain dibuka: sorotan dan tautan kejadian dibersihkan */
  bersih() { if (this._buka) return; this._n = (this._n || 0) + 1; if (!this.aktif) return; this.aktif = null;
    peta?.getLayer("kej-pilih") && peta.setFilter("kej-pilih", ["==", ["get", "kode"], ""]); this.url_bersih(); },
  /* kode dari URL: /banjir/k/B0007 atau ?k=B0007 */
  dariUrl() { return (location.pathname.match(/^\/banjir\/k\/(B\d+)\/?$/) || location.search.match(/[?&]k=(B\d+)/) || [])[1] || null; },
};
/* laci lain (wilayah, sungai) dibuka: kejadian aktif dilepas */
{ const buka0 = Analisa.buka; Analisa.buka = function (...a) { KejAktif.bersih(); return buka0.apply(this, a); }; }
