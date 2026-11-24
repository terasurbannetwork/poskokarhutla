"use strict";
/* ================================================================ stasiun ISPU KLH: PM2,5 rata-rata 24 jam (pengukuran, BELUM divalidasi KLH)
   Data: /udara/data/ispu.json (scripts/udara/ispu.py, sumber KLH/BPLH, QC Centurisk97). Berkas hilang atau tanpa stasiun segar = lapisan dibuang (A18).
   Stasiun tanpa PM2,5 tidak digambar dan tidak pernah jadi nol. Nama dan provinsi dari lembaga lewat esc(). Tidak masuk hitungan model CAMS.
   Kategori warna: ambang 24 jam P.14/2020 (KAT), tepat untuk rata-rata 24 jam. */
const SUMBER_ISPU = "Data KLH/BPLH (ispu.kemenlh.go.id), saringan Centurisk97";
const PIL_ISPU = '<span class="kt" style="--c:#3f4a5e;--f:#fff;text-transform:none;letter-spacing:0">rata-rata 24 jam, belum divalidasi KLH</span>';
const IspuKLH = {
  D: null,
  async muat() { this._s = null; this.D = await fetch("/udara/data/ispu.json").then(r => r.ok ? r.json() : null).catch(() => null); },
  /* segar: PM2,5 ada, koordinat sah, dan stempel tidak lebih dari 12 jam sebelum berkas dibuat */
  segar() { if (this._s) return this._s; const b = Date.parse(this.D?.dibuat);
    return this._s = (this.D?.stasiun || []).filter(s => s.pm25 != null && isFinite(s.pm25) && isFinite(s.lat) && isFinite(s.lon) && isFinite(b) && b - Date.parse(s.t) <= 12 * 36e5); },
  geo() { return {type: "FeatureCollection", features: this.segar().map((s, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [s.lon, s.lat]}, properties: {i, k: kat(s.pm25)}}))}; },
  pasangPeta() {
    if (!this.segar().length || peta.getSource("ispu")) return;
    peta.addSource("ispu", {type: "geojson", data: this.geo()});
    peta.addLayer({id: "ispu", type: "circle", source: "ispu", layout: {visibility: Peta.lihat("ispu") ? "visible" : "none", "circle-sort-key": ["get", "k"]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 9, 10], "circle-color": ["match", ["get", "k"], 4, KAT[4].w, 3, KAT[3].w, 2, KAT[2].w, 1, KAT[1].w, KAT[0].w], "circle-stroke-color": "#3f4a5e", "circle-stroke-width": 2.5}}); },
  kartu(i) { const s = this.segar()[i]; if (!s) return ""; const c = kat(s.pm25);
    return PI.kartuTip({judul: `<span translate="no">${esc(s.nama)}</span>`, sub: `<small>${esc(s.prov || "")}, ${esc(jamWIB(s.t))}</small>`, stat: [["debit", dec1(s.pm25) + " µg/m³", "PM2,5 rata-rata 24 jam, " + KAT[c].n, KAT[c].w, c >= 2], ["peta", "KLH", "belum divalidasi", "#3f4a5e"]]}); },
  laci(i) { const s = this.segar()[i]; if (!s) return; const c = kat(s.pm25);
    Laci.buka("Stasiun ISPU KLH", `<span translate="no">${esc(s.nama)}</span>`, PIL_ISPU,
      `<div class="grid" style="grid-template-columns:repeat(2,1fr)">${kot('<span style="text-transform:none">PM2,5 rata-rata 24 jam</span>', `<span style="color:${KAT[c].w}">${dec1(s.pm25)} µg/m³</span>`, KAT[c].n)}${kot('<span style="text-transform:none">PM10</span>', s.pm10 != null && isFinite(s.pm10) ? dec1(s.pm10) + " µg/m³" : "tidak ada data", s.pm10 != null && isFinite(s.pm10) ? "terukur" : "stasiun tidak melapor")}</div>
      <p class="fnd">${esc(s.prov || "")}. Stempel akhir periode ${esc(jamWIB(s.t))}. Nilai ini belum divalidasi KLH dan sudah disaring Centurisk97 (nilai kosong, macet, atau tak masuk akal dibuang). Pengukuran stasiun, tidak dicampur dengan angka model CAMS.</p>
      <p class="fnd">${SUMBER_ISPU}, terbit ${esc(jamWIB(this.D.dibuat))}.</p>`); },
  legenda() { const n = this.segar().length; if (!n) return "";
    return `<div class="lbl">Stasiun ISPU KLH, PM2,5 rata-rata 24 jam <span style="text-transform:none">(µg/m³, bingkai abu tua)</span></div><div class="leg" style="margin:4px 0 4px">${KAT.map(k => `<span><i class="sw dot" style="background:${k.w};box-shadow:0 0 0 2px #3f4a5e"></i>${k.n}</span>`).join("")}</div>
      <div class="fnd" style="margin:0 0 8px">${fmt(n)} stasiun dengan nilai segar, belum divalidasi KLH. ${SUMBER_ISPU}.</div>`; },
};
