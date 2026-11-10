"use strict";
/* ================================================================ awan: awan sangat dingin per kabupaten dari Himawari-9 (../udara/data/awan_himawari.json, scripts/udara/awan_himawari.py)
   Pengamatan satelit Centurisk97, BUKAN peringatan dan bukan produk BMKG. Belum diuji terhadap hujan lebat atau kejadian (hanya uji teknis kalibrasi dan proyeksi),
   jadi selalu berpil Hipotesis. Data lebih tua dari 6 jam = seluruh bagian dibuang.
   Kunci kabupaten berkas itu = prov + URUTAN di berkas geo (515), BUKAN kode BPS: digabung lewat prov + NAMA ke titik kab Tambahan.titikKab ("prov|kab"). */
const Awan = (() => {
  const BASI = 6 * 36e5, D = {r: null, gagal: false};
  const lihat = () => !!document.querySelector('#lapis input[data-l="t-aw"]')?.checked;
  const tgl = t => new Date(t).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit"}).replace(":", ".") + " WIB";
  const pil = `<span class="pl" style="--w:#7a4fc4" title="Pengamatan satelit Centurisk97, belum terbukti berkaitan dengan hujan lebat atau kejadian">Hipotesis</span>`;
  const KET = "Awan sangat dingin: suhu kecerahan inframerah 10,4 mikron -65 °C atau lebih dingin. Tinggi puncak perkiraan kasar dari suhu, bukan pengukuran.";
  async function muat() {
    if (D.r || D.gagal) return D.r;
    try { const d = await muatJSON("../udara/data/awan_himawari.json"), t = Date.parse(d.jam_pengamatan_utc);
      if (!t || SEKARANG() - t > BASI || !d.kab) throw 0;
      const kab = await Tambahan.titikKab(); if (!kab) throw 0;
      const baris = Object.entries(d.kab).flatMap(([kode, v]) => { const c = kab[kode.slice(0, 2) + "|" + v.kab];
        return c && v.persen_dingin > 0 ? [{kode, nama: v.kab, prov: kode.slice(0, 2), c, sd: v.persen_sangat_dingin, d: v.persen_dingin, tb: v.tb_min_c, km: v.tinggi_puncak_km_perkiraan, n: v.n_titik}] : []; });
      D.r = {t, baris, sangat: baris.filter(r => r.sd > 0), n: d.n_kab}; return D.r; } catch { D.gagal = true; return null; }
  }
  const geo = () => ({type: "FeatureCollection", features: D.r.baris.map((r, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [r.c[1], r.c[0]]}, properties: {i, sd: r.sd}}))});
  function pasangLapis() {
    if (!peta || !D.r || peta.getSource("tb-aw")) return;
    peta.addSource("tb-aw", {type: "geojson", data: geo()});
    peta.addLayer({id: "tb-aw", type: "circle", source: "tb-aw", layout: {visibility: lihat() ? "visible" : "none", "circle-sort-key": ["get", "sd"]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["interpolate", ["linear"], ["get", "sd"], 0, 2, 100, 7], 8, ["interpolate", ["linear"], ["get", "sd"], 0, 6, 100, 18]],
        "circle-color": ["interpolate", ["linear"], ["get", "sd"], 0, "#cbbbe8", 10, "#a98bd6", 40, "#7a4fc4", 80, "#4a2a8c"], "circle-opacity": .78, "circle-stroke-color": "#fff", "circle-stroke-width": .6}});
  }
  const pasang = () => { if (D.r) pasangLapis(); };
  async function kontrol() {
    if (!await muat()) return;
    UBIN["t-aw"] = ["#2c1a5c", "#a98bd6", "satelit"]; UBIN_PENDEK["t-aw"] = "Awan";
    $("#lapis").insertAdjacentHTML("beforeend", `<details open><summary>Pengamatan satelit</summary><label><input type="checkbox" data-l="t-aw"> Awan sangat dingin Himawari-9</label></details>`);
    $("#lapis").addEventListener("change", e => { if (e.target.closest('input[data-l="t-aw"]')) nanti(nyala); });
  }
  async function nyala() { if (lihat()) pasangLapis(); if (peta.getLayer("tb-aw")) peta.setLayoutProperty("tb-aw", "visibility", lihat() ? "visible" : "none"); renderLegenda(); }
  function legenda() { if (!D.r || !lihat() || !peta?.getLayer("tb-aw")) return "";
    return `<div class="lbl">Awan dingin Himawari-9, citra ${tgl(D.r.t)}</div><div class="legscale">${["#cbbbe8", "#a98bd6", "#7a4fc4", "#4a2a8c"].map(c => `<i style="background:${c}"></i>`).join("")}</div>
      <div class="legnum" style="margin:2px 0 8px"><span>Persen titik sangat dingin di kabupaten. Pengamatan satelit, bukan peringatan</span></div>`; }
  function tip(r) { return PI.kartuTip({judul: `<span translate="no">${esc(r.nama)}</span>`, sub: `<small>${esc(namaProv(r.prov))}, citra ${tgl(D.r.t)}, hipotesis</small>`,
    stat: [["satelit", fmt(r.sd) + "%", `titik sangat dingin, dari ${fmt(r.n)} titik`, "#7a4fc4", r.sd >= 40], ["satelit", fmt(r.d) + "%", "titik dingin (-38 °C)", "#a98bd6"], ["peta", fmt(r.tb) + " °C", "terdingin", "#6b7280"], ["peta", "sekitar " + fmt(Math.round(r.km)) + " km", "tinggi puncak (perkiraan)", "#6b7280"]]}); }
  function cari(e) { if (!PI || !peta || !D.r || !lihat() || !peta.getLayer("tb-aw")) return null; const f = peta.queryRenderedFeatures(e.point, {layers: ["tb-aw"]})[0]; return f && D.r.baris[f.properties.i]; }
  function hover(e) { const r = cari(e); if (!r) return false; peta.getCanvas().style.cursor = "pointer"; PI.tampilTip(tip(r), e.originalEvent); return true; }
  function klik(e) { const r = cari(e); if (!r) return false; S.pilih = null; renderCrumb(); peta.flyTo({center: [r.c[1], r.c[0]], zoom: Math.max(peta.getZoom(), 8), duration: 600}); return true; }
  async function fokus(kode) { const r = D.r?.baris.find(x => x.kode === kode), i = document.querySelector('#lapis input[data-l="t-aw"]'); if (!r || !i) return;
    i.checked = true; await nyala(); peta.flyTo({center: [r.c[1], r.c[0]], zoom: 8, duration: 700}); }
  return {muat, kontrol, pasang, legenda, hover, klik, fokus, tgl, pil, KET, D};
})();
