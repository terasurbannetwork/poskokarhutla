/* Ruas sungai berwarna di zoom jauh. Ruas asli (PosUkur.ruas) mewarnai waterway ubin vektor peta dasar, padahal sungai kecil/tak bernama
   (mis. Cirarab) baru ada di ubin mulai zoom 12. Modul ini memuat data/sungai_pos.json (OSM sekitar pos berambang, scripts/banjir/sungai_pos.py)
   sebagai source GeoJSON "sungai-pos" dan menggambar lapis berwarna yang sama (PosAir.ruasLapis, PosAir.WARNA_KELAS) dengan maxzoom 12;
   mulai zoom 12 lapisan vektor asli mengambil alih. Skrip klasik, dimuat sesudah pos_air.js (global: PosAir, PosUkur, peta, nanti). */
const RuasJauh = (() => {
  const SUMBER = "sungai-pos", BERKAS = "data/sungai_pos.json", MAXZ = 12, KUNING = "#f2c14e", BIRU = "#5b9bd8", ID = k => "sp-" + k.replace(" ", "");
  const campur = (a, b, t) => "#" + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");
  const KELAS_OK = ["literal", ["river", "canal", "stream", "drain"]];
  /* murni: it = hasil PosAir.ruasLapis, WARNA = PosAir.WARNA_KELAS. Hasil [{id, filter, warna, op}] dari bawah ke atas (urutan sama dengan alir-st-*) */
  const spesifikasi = (it, WARNA) => {
    const kosong = ["==", ["literal", 1], 0], dasar = ["in", ["get", "class"], KELAS_OK];
    const bagian = a => it.filter(a).map(x => ["all", ["within", x.g], ...(x.nama ? [["==", ["get", "name"], x.nama]] : [])]);
    const sel = a => { const b = bagian(a); return b.length ? ["all", dasar, ["any", ...b]] : kosong; };
    const out = [{id: "sp-dasar", filter: sel(() => true), warna: BIRU, op: .9},   /* biru tipis hanya di ruas yang diwarnai, bukan seluruh jaringan */
      {id: "sp-peralihan", filter: sel(x => x.lapis === 0), warna: campur(KUNING, BIRU, .5), op: .55},
      {id: "sp-luar", filter: sel(x => x.lapis === 1), warna: KUNING, op: .9}];
    for (const k of ["Siaga 3", "Siaga 2", "Siaga 1", "naik"]) {
      out.push({id: ID(k) + "-m", filter: sel(x => x.kelas === k && x.lapis === 2), warna: campur(WARNA[k], KUNING, .5), op: .92});
      out.push({id: ID(k), filter: sel(x => x.kelas === k && x.lapis === 3), warna: WARNA[k], op: .95});
    }
    return out;
  };
  let janji = null, geo = null;
  const muat = () => janji ||= fetch(BERKAS).then(r => r.ok ? r.json() : null).then(d => { geo = d?.features?.length ? d : null; return geo; }).catch(() => null);
  const lebar = ["interpolate", ["linear"], ["zoom"], 4, 1.2, 8, 2.5, 12, 4];
  const semua = () => (peta.getStyle()?.layers || []).filter(l => l.id.startsWith("sp-"));
  const tampil = () => { if (!peta?.getSource(SUMBER)) return; const v = PosUkur.menyala() ? "visible" : "none"; for (const l of semua()) peta.setLayoutProperty(l.id, "visibility", v); };
  const pasang = () => {
    if (!peta || !PosUkur.menyala() || !peta.getLayer("alir-gerak")) return tampil();
    if (!geo) return void muat().then(d => d && nanti(pasang));   /* malas: baru diunduh saat lapisan pos menyala */
    const it = PosAir.ruasLapis(PosUkur.D?.pos, p => PosUkur._nm?.get(p.id)), sp = spesifikasi(it, PosAir.WARNA_KELAS), atas = peta.getLayer("alir-panah") ? "alir-panah" : undefined;
    if (!peta.getSource(SUMBER)) peta.addSource(SUMBER, {type: "geojson", data: geo});
    for (const s of sp) {
      if (peta.getLayer(s.id)) { peta.setFilter(s.id, s.filter); continue; }
      peta.addLayer({id: s.id, type: "line", source: SUMBER, maxzoom: MAXZ, filter: s.filter, layout: {visibility: "visible", "line-cap": "round", "line-join": "round"},
        paint: {"line-color": s.warna, "line-width": lebar, "line-opacity": s.op}}, atas);
    }
  };
  const asli = PosUkur.ruas;
  PosUkur.ruas = function () { const h = asli.apply(this, arguments); nanti(pasang); return h; };   /* data pos segar dan ganti tema (style.load -> pasang) lewat ruas() */
  document.addEventListener("change", e => { if (e.target?.matches?.('#lapis input[data-l="pos"]')) nanti(() => e.target.checked ? pasang() : tampil()); });
  return {spesifikasi, MAXZ, muat};
})();
