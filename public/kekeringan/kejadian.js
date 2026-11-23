"use strict";
/* Lapisan Kejadian kekeringan di peta /kekeringan (PB-68: D0001 dan seterusnya).
   Data: ../banjir/data/kejadian_kekeringan_awal.json (atribut) dan kejadian_kekeringan_geo.json (geometri, dimuat saat ubin dinyalakan),
   ditulis scripts/umum/kejadian.py dari kekeringan_wilayah.json. Satu kejadian = gugus kabupaten/kota Siaga atau Awas dalam satu provinsi.
   Status (Aktif atau Selesai) dan tingkat dipakai apa adanya dari berkas; ini deteksi Centurisk97 dari model, bukan status resmi BNPB.
   Tanpa berkas, kosong, atau basi lebih dari 1 hari: ubin tidak ditampilkan (bukan daftar kosong). Tanpa data baru, tanpa rute baru. */
const KekKejadian = {
  K: null, G: null, D: null, _p: null, _pg: null, _ia: false,
  muat() { return this._p ||= muatJSON("../banjir/data/kejadian_kekeringan_awal.json").then(d => {
    const wib = t => new Date(t).toLocaleDateString("sv-SE", {timeZone: "Asia/Jakarta"}), kini = wib(Date.now());
    const segar = d?.hari && Math.abs(Date.parse(kini + "T12:00:00+07:00") - Date.parse(d.hari + "T12:00:00+07:00")) <= 864e5;
    this.D = segar ? d : null; return this.K = segar && Array.isArray(d.kejadian) ? d.kejadian : []; }).catch(() => (this.K = [])); },
  geo() { return this._pg ||= muatJSON("../banjir/data/kejadian_kekeringan_geo.json").then(g => (this.G = g)).catch(() => { this._pg = null; return null; }); },
  lv: k => Math.min(3, Math.max(1, +k.besaran?.nilai || 2)),
  warna: k => WARNA_LV[KekKejadian.lv(k)],
  pil: k => `<span class="pill" style="background:${k.aktif ? "#d4572f" : "#7d8794"};color:#fff">${k.aktif ? "Aktif" : "Selesai"}</span>`,
  tgl: t => t ? tglPendek(t) + " " + t.slice(0, 4) : "–",
  /* ubin Overlay muncul hanya bila ada kejadian segar */
  async siap() {
    const L = await this.muat(), lb = document.querySelector('#lapis input[data-l="kejadian"]')?.closest("label"); if (!lb) return;
    const ada = !!L.length; lb.hidden = !ada; lb.style.display = ada ? "" : "none"; if (lb.closest("details")) lb.closest("details").hidden = !ada;
    if (ada) lb.dataset.tip = `<b>Kejadian kekeringan (${fmt(L.length)})</b>`;
    if (ada && this.lihat()) this.pasang(); },
  lihat() { const i = document.querySelector('#lapis input[data-l="kejadian"]'); return !!i && i.checked; },
  fitur() { const G = this.G, per = new Map((this.K || []).map(k => [k.kode, k]));
    return (G?.features || []).filter(f => per.has(f.properties?.kode)).map(f => { const k = per.get(f.properties.kode);
      return {type: "Feature", geometry: f.geometry, properties: {kode: k.kode, aktif: k.aktif ? 1 : 0, lv: this.lv(k), c: this.warna(k)}}; }); },
  /* dipanggil dari Peta.pasang (tiap gaya peta berganti) dan saat ubin dinyalakan */
  async pasang() {
    if (!peta || !this.lihat() || !this.K?.length) return;
    const G = await this.geo(); if (!G) return;
    if (peta.getSource("kej")) { peta.getSource("kej").setData({type: "FeatureCollection", features: this.fitur()}); this.tampil(true); return; }
    const bl = peta.getLayer("prov-line") ? "prov-line" : undefined;
    peta.addSource("kej", {type: "geojson", data: {type: "FeatureCollection", features: this.fitur()}});
    peta.addLayer({id: "kej-isi", type: "fill", source: "kej", paint: {"fill-color": ["get", "c"], "fill-opacity": ["case", ["==", ["get", "aktif"], 1], .34, .14]}}, bl);
    peta.addLayer({id: "kej-garis", type: "line", source: "kej", paint: {"line-color": ["get", "c"], "line-width": ["case", ["==", ["get", "aktif"], 1], 2, 1.2], "line-opacity": ["case", ["==", ["get", "aktif"], 1], .95, .6]}}, bl);
    this.interaksi(); renderLegenda(); },
  tampil(on) { for (const id of ["kej-isi", "kej-garis"]) if (peta.getLayer(id)) peta.setLayoutProperty(id, "visibility", on ? "visible" : "none"); },
  kartu(k) { return PI.kartuTip({judul: `<span translate="no">${esc(k.kode)}</span> ${esc(k.nama.replace(/^Kekeringan\s+/, ""))}`,
    sub: `<small>${k.aktif ? "Aktif" : "Selesai"}, mulai ${esc(this.tgl(k.mulai))}</small>`,
    stat: [["perisai", LEVEL[this.lv(k)], "tingkat tertinggi", this.warna(k), this.lv(k) >= 3], ["peta", fmt(k.n_kab), "kabupaten/kota", "#5f6fb0"], ...(k.jiwa ? [["orang", rb(k.jiwa), "penduduk", "#8a6d4e"]] : [])]}); },
  interaksi() {
    if (this._ia) return; this._ia = true;
    const ambil = e => { const kode = e.features?.[0]?.properties?.kode; return this.K?.find(k => k.kode === kode); };
    peta.on("mousemove", "kej-isi", e => { const k = ambil(e); if (!k || !PI) return; peta.getCanvas().style.cursor = "pointer"; PI.tampilTip(this.kartu(k), e.originalEvent); });
    peta.on("mouseleave", "kej-isi", () => { peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); });
    peta.on("click", "kej-isi", e => { const k = ambil(e); if (k) this.laci(k); }); },
  /* klik yang jatuh di kejadian dibuka sebagai kejadian, bukan wilayah (dipakai peta.js sebelum membuka wilayah) */
  diKlik(e) { if (!this.lihat() || !peta.getLayer("kej-isi")) return false; return peta.queryRenderedFeatures(e.point, {layers: ["kej-isi"]}).length > 0; },
  laci(k) {
    const kab = (k.kab || []).map(x => x.split("|")[1] || x), lain = Math.max(0, k.n_kab - kab.length), lv = this.lv(k);
    const kepala = `<div><h3 id="dlgJudul"><span translate="no">${esc(k.nama)}</span></h3><p><span translate="no">${esc(k.kode)}</span>, ${k.aktif ? "aktif" : "selesai"}</p></div>`;
    const isi = `<div class="grid g4">${kot("Tingkat", `<span style="color:${WARNA_LV[lv]}">${LEVEL[lv]}</span>`, "tertinggi di gugus")}${kot("Wilayah", fmt(k.n_kab), "kabupaten/kota")}${k.jiwa ? kot("Penduduk", rb(k.jiwa) + " jiwa", "di kabupaten/kota terkait") : ""}${kot("Status", this.pil(k), "dari berkas kejadian")}</div>
      <p class="fnd" translate="no"><b>${esc(kab.join(", "))}${lain ? ` dan ${fmt(lain)} lainnya` : ""}</b></p>
      <p class="fnd">Mulai ${esc(this.tgl(k.mulai))}${k.aktif ? "" : `, terakhir terlihat ${esc(this.tgl(k.terakhir))}`}</p>
      <p class="fnd"><em class="sp-p oranye">${BELUM_UJI}</em> Deteksi Centurisk97 dari model kekeringan, bukan status resmi BNPB. Diperbarui ${esc(jamWIB(this.D?.dibuat || Date.now()))}.</p>`;
    Analisa.buka(`<section class="bk">${isi}</section>`, kepala);
    const f = (this.G?.features || []).find(x => x.properties.kode === k.kode);
    if (f) peta.fitBounds(kotak([f]), {padding: kiriPad(), duration: 700, maxZoom: 8}); },
  legenda() { if (!this.lihat() || !this.K?.length) return "";
    const n = this.K.filter(k => k.aktif).length;
    return `<div class="lbl">Kejadian kekeringan (${fmt(this.K.length)}, ${fmt(n)} aktif)</div><div class="leg" style="margin:4px 0 8px">${[3, 2].map(l => `<span><i class="sw" style="background:${WARNA_LV[l]}"></i>${LEVEL[l]}</span>`).join("")}<span>garis tebal = aktif, tipis = selesai; ${BELUM_UJI.toLowerCase()}</span></div>`; },
};
$("#lapis")?.addEventListener("change", e => { const i = e.target.closest("input"); if (!i || i.dataset.l !== "kejadian" || !peta) return;
  if (i.checked) KekKejadian.pasang().then(() => { KekKejadian.tampil(true); renderLegenda(); }); else { KekKejadian.tampil(false); renderLegenda(); } });
window.KekKejadian = KekKejadian;
if (typeof peta !== "undefined") nanti(() => KekKejadian.siap());
