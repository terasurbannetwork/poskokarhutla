/* sim_data.js — pilihan "Model data (dilatih)" di tab Simulasi, di samping model fisika.
   Tambalan seperti sim_perlakuan.js: membungkus Sim.panel / Sim.jalan / Sim.pasangLapis, tidak mengubah mesin fisika.
   Saat dicentang: setelah skenario fisika selesai, jalankan SebaranModel.ramal() (sebaran_model.js) dari titik api 24 jam
   kompleks, gambar peluang 72 jam di peta Sim (lapisan "sim-data") dan tambah kartu ringkasan di hasil. */
(() => {
if (typeof Sim === "undefined" || typeof SebaranModel === "undefined") return;
const SimData = window.SimData = {
  hasil: null, model: null, lahan: null,
  async jalan(S) {
    const p = S.f.properties, st = $("#simStatus");
    try {
      if (st) st.textContent += " · model data: memuat…";
      this.model ||= await SebaranModel.muat();
      const o = u => muatJSON(u).catch(() => null);
      this.lahan ||= {gambut: Lapis.cache.gambut || await o("data/lahan/gambut.geojson"), kawasan: Lapis.cache.kawasan || await o("data/lahan/kawasan.geojson"),
        konsesi: Lapis.cache.konsesi || await o("data/lahan/konsesi.geojson"), sanksi: await o("data/lahan/sanksi_karhutla.json"), kanal: await o("data/kanal.json"),
        jalan: await o("data/jalan.geojson"), desa: Sim._desa || await o("data/osm/desa.json"), riwayat: await o("data/riwayat_grid.json"), penduduk: await o("data/penduduk.json")};
      const sel0 = [...new Set((p.api24 || []).filter(([lo, la]) => isFinite(lo) && isFinite(la)).map(([lo, la]) => SebaranModel.sel(lo, la)))];
      const cuaca = await SebaranModel.cuaca(p.lat, p.lon);
      const frp = p.frp24 && p.px24 ? p.frp24 / Math.max(1, p.px24) * 3 : undefined; /* FRP maks tak tersedia: kira-kira 3x rata-rata per piksel */
      this.hasil = SebaranModel.ramal({model: this.model, lat: p.lat, lon: p.lon, waktu: Date.now(), cuaca, lahan: this.lahan, sel0, frp, mc: 60, seed: 3});
      this.k = S.k;
      if (st) st.textContent = st.textContent.replace(" · model data: memuat…", " · model data selesai");
    } catch (e) { console.error(e); this.hasil = null; if (st) st.textContent += " · model data gagal: " + e.message; }
  },
  gambar(S) {
    const m = S.peta; if (!m?.isStyleLoaded()) return;
    if (m.getLayer("sim-data")) m.removeLayer("sim-data"); if (m.getSource("sim-data")) m.removeSource("sim-data");
    const r = this.hasil; if (!S.op.data || !r || this.k !== S.k) return;
    const jam = +($("#simT")?.value || 72), d = Math.min(2, Math.max(0, Math.ceil(jam / 24) - 1)), h = .003375 / 2;
    const fs = r.sel.filter(s => s.p[d] >= .05).map(s => { const [x, y] = SebaranModel.pusat(s.k);
      return {type: "Feature", properties: {p: s.p[d]}, geometry: {type: "Polygon", coordinates: [[[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h], [x - h, y - h]]]}}; });
    m.addSource("sim-data", {type: "geojson", data: {type: "FeatureCollection", features: fs}});
    m.addLayer({id: "sim-data", type: "line", source: "sim-data", paint: {"line-color": ["interpolate", ["linear"], ["get", "p"], .05, "#5f6fb0", .5, "#1d1d6b"], "line-width": 1.2, "line-opacity": .9}});
  },
  kartu() {
    const r = this.hasil; if (!r) return "";
    const mata = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
    return `<div class="sop" style="margin:0 0 12px;border-left:4px solid #5f6fb0"><b>Perkiraan utama: model data (dilatih dari 12 musim VIIRS, diuji pada 2024–2026 dan 123 kejadian lalu).</b> Luas 24/48/72 jam (rentang cenderung terlalu sempit; pada uji hanya ± separuh kasus jatuh di dalamnya): ${r.luas.map(x => `${fmt(Math.round(x.p50))} ha (${fmt(Math.round(x.p10))}–${fmt(Math.round(x.p90))})`).join(" · ")}.
      Peluang membesar ≥ ${fmt((this.model.lepas_sel || 10) * 14)} ha: ${fmt(Math.round(r.p_lepas * 100))}%. ${r.arah ? `Arah utama ${mata[Math.round(r.arah.deg / 45) % 8]} (keyakinan rendah: pada uji, arah sebar tidak bisa diramal model mana pun).` : ""}
      Terkena (harapan 72 jam): gambut ${fmt(r.kena.gambut_ha)} ha, kawasan lindung ${fmt(r.kena.lindung_ha)} ha${r.kena.desa.length ? `, desa: ${r.kena.desa.slice(0, 6).map(x => esc(x.nama)).join(", ")}` : ""}.
      Garis biru di peta = sel berpeluang ≥ 5% (makin gelap makin mungkin). Uji 2024–2026: lihat Insight → "Uji model pada kejadian lalu".
      ${Sim.kal?.alasan ? `<br><span style="color:var(--bad)">Model fisika di bawah belum terkalibrasi untuk kompleks ini (${esc(Sim.kal.alasan)}) dan pada uji cenderung melebih-lebihkan luas hingga puluhan kali; pakai hanya sebagai pembanding.</span>` : "Model fisika di bawah (terkalibrasi ke pertumbuhan teramati) ditampilkan sebagai pembanding."}</div>`;
  },
};
Sim.op.data = Sim.op.data ?? true; /* model data jadi perkiraan utama (uji 2024-2026: F1 0,136 vs fisika tak terkalibrasi 0,011) */
const panel = Sim.panel, jalan = Sim.jalan, lapis = Sim.pasangLapis, waktu = Sim.waktu;
Sim.panel = function (...a) {
  const r = panel.apply(this, a);
  const kal = $("#simKal")?.closest("label");
  if (kal && !$("#simData")) { kal.insertAdjacentHTML("afterend", `<label class="simcek"><input type="checkbox" id="simData" ${this.op.data ? "checked" : ""}> Model data (dilatih) sebagai perkiraan utama</label>`);
    $("#simData").onchange = e => { this.op.data = e.target.checked; this.tandaiBasi(); }; }
  if (this.op.data && SimData.hasil && SimData.k === this.k) $("#simHasil")?.insertAdjacentHTML("afterbegin", SimData.kartu());
  return r;
};
Sim.jalan = async function (...a) { const r = await jalan.apply(this, a); if (this.op.data && this.hasil) { await SimData.jalan(this); this.panel(); this.pasangLapis(); } return r; };
Sim.pasangLapis = function (...a) { const r = lapis.apply(this, a); SimData.gambar(this); return r; };
if (typeof waktu === "function") Sim.waktu = function (...a) { const r = waktu.apply(this, a); SimData.gambar(this); return r; };
})();
