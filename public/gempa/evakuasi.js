"use strict";
/* Overlay Evakuasi tsunami: TES, TEA, titik kumpul, rambu, sirine, jalur evakuasi, dan jangkauan sirine.
   Data: ../cuaca/data/evakuasi_tsunami.json (BNPB, gis.bnpb.go.id; scripts/cuaca/bangun_bnpb.py), dibaca bersama dengan layar cuaca.
   Hanya 4 wilayah rintisan dan sirine di Bali, BUKAN seluruh pesisir: legenda menyebut cakupannya. Dimuat saat overlay pertama dinyalakan.
   Ini data kesiapsiagaan, bukan status tsunami; status resmi hanya dari BMKG. */
const Evakuasi = (() => {
  const BERKAS = "../cuaca/data/evakuasi_tsunami.json";
  const WARNA = {tes: "#0e7490", tea: "#15803d", kumpul: "#7c3aed", rambu: "#c2410c", sirine: "#d64545"};
  const NAMA = {tes: "TES", tea: "TEA", kumpul: "Titik kumpul", rambu: "Rambu evakuasi", sirine: "Sirine tsunami"};
  const IKON = {tes: "posko", tea: "perisai", kumpul: "orang", rambu: "jalan", sirine: "bel"};
  let D = null;
  const on = () => { const i = document.querySelector('#lapis input[data-l="evakuasi"]'); return !!i && i.checked; };

  let _p = null;
  const muat = () => _p ||= muat1().then(d => { if (!d) _p = null; return d; });
  async function muat1() {
    try { const d = await muatJSON(BERKAS); if (!d?.wilayah?.length) throw 0;
      const titik = [], rute = [], area = [], n = {}, wil = {};
      d.wilayah.forEach(w => { wil[w.id] = {nama: w.nama, n: 0};
        w.titik.forEach(t => { titik.push({type: "Feature", geometry: {type: "Point", coordinates: [t[0], t[1]]}, properties: {j: t[2], nama: t[3], ket: t[4], st: t[5], w: w.nama}}); n[t[2]] = (n[t[2]] || 0) + 1; wil[w.id].n++; });
        (w.rute || []).forEach(r => rute.push({type: "Feature", geometry: {type: "LineString", coordinates: r}, properties: {w: w.nama}}));
        (w.cakupan || []).forEach(r => area.push({type: "Feature", geometry: {type: "Polygon", coordinates: [r]}, properties: {w: w.nama}})); });
      D = {d, titik, rute, area, n, wil, jml: {rute: rute.length}}; return D; } catch { return null; }
  }

  /* lapisan dipasang sekali; style.load memanggil pasang() lagi dan lapisan dipasang ulang bila data sudah dimuat */
  function pasang() {
    if (!D || peta.getSource("evak")) return; const v = Peta.vis(on());
    peta.addSource("evak", {type: "geojson", data: {type: "FeatureCollection", features: [...D.area, ...D.rute, ...D.titik]}});
    Peta.taruh({id: "evak-area", type: "fill", source: "evak", filter: ["==", ["geometry-type"], "Polygon"], layout: v, paint: {"fill-color": WARNA.sirine, "fill-opacity": .14, "fill-outline-color": WARNA.sirine}});
    Peta.taruh({id: "evak-rute", type: "line", source: "evak", filter: ["==", ["geometry-type"], "LineString"], layout: {...v, "line-cap": "round", "line-join": "round"},
      paint: {"line-color": "#15803d", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.2, 14, 3], "line-opacity": .85}});
    Peta.taruh({id: "evak", type: "circle", source: "evak", filter: ["==", ["geometry-type"], "Point"], layout: {...v, "circle-sort-key": ["match", ["get", "j"], "rambu", 0, "kumpul", 1, "tea", 2, "tes", 3, 4]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5, 15, 8], "circle-color": ["match", ["get", "j"], ...Object.entries(WARNA).flat(), "#6b7280"],
        "circle-stroke-color": "#fff", "circle-stroke-width": 1.2}});
  }
  async function nyala() {
    if (on()) { await muat(); if (!D) { toast("Data evakuasi belum bisa dimuat"); const i = document.querySelector('#lapis input[data-l="evakuasi"]'); if (i) i.checked = false; } else pasang(); }
    ["evak-area", "evak-rute", "evak"].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on() ? "visible" : "none"));
    renderLegenda(); }

  /* ---------- pop-up: kartu di dekat penunjuk (hover) atau di titik sentuh (klik) ---------- */
  const ringkas = p => { const t = [p.ket, p.st].filter(Boolean).join(", "); return t.length > 26 ? t.slice(0, 25) + "…" : t; };
  const PENDEK = {tes: "TES", tea: "TEA", kumpul: "Kumpul", rambu: "Rambu", sirine: "Sirine"};
  const kartu = p => { const k = ringkas(p), wil = /^Sirine/.test(p.w) ? "Bali" : p.w.split(",")[0];
    return PI.kartuTip({judul: `<span translate="no">${esc(p.nama)}</span>`, sub: k ? `<small>${esc(k)}</small>` : "", stat: [
      [IKON[p.j], PENDEK[p.j], NAMA[p.j], WARNA[p.j], true], ["peta", wil, "wilayah", "#6b7280"], ["perisai", "BNPB", "sumber", "#6b7280"]]}); };
  const ambil = e => peta.getLayer("evak") && on() ? peta.queryRenderedFeatures(e.point, {layers: ["evak"]})[0] : null;
  let _ia = false, _pt = false;
  function interaksi() { if (_ia) return; _ia = true;
    peta.on("mousemove", e => { const f = ambil(e); if (!f || !PI) { if (_pt) { _pt = false; peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); } return; } _pt = true; peta.getCanvas().style.cursor = "pointer"; PI.tampilTip(kartu(f.properties), e.originalEvent); });
    peta.on("mouseleave", "evak", () => { _pt = false; peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); });
  }
  /* klik: kembalikan true bila mengenai titik (peta.js berhenti di situ) */
  function klik(e) { const f = ambil(e); if (!f || !PI) return false; PI.tampilTip(kartu(f.properties), e.originalEvent); return true; }

  /* ---------- legenda: hanya jenis yang tergambar ---------- */
  function legenda() { if (!on() || !D) return "";
    const sw = (w, t = "") => `<i class="sw dot" style="background:${w}"></i>${t}`, n = D.n;
    const baris = Object.keys(NAMA).filter(j => n[j]).map(j => `<span>${sw(WARNA[j], NAMA[j])} <b style="color:var(--f2)">${fmt(n[j])}</b></span>`);
    if (D.jml.rute) baris.push(`<span><i class="sw" style="height:0;border-top:3px solid #15803d;border-radius:0;background:none;vertical-align:3px"></i>jalur evakuasi <b style="color:var(--f2)">${fmt(D.jml.rute)}</b></span>`);
    if (D.area.length) baris.push(`<span><i class="sw" style="background:${WARNA.sirine}33;border:1px solid ${WARNA.sirine}"></i>jangkauan sirine</span>`);
    const wil = Object.values(D.wil).filter(w => w.n && !/^Sirine/.test(w.nama)).map(w => esc(w.nama.split(",")[0]));
    return `<div class="lbl">Evakuasi tsunami</div><div class="leg" style="margin:4px 0 4px">${baris.join("")}</div>
      <div class="legnum" style="margin:0 0 8px"><span>Hanya ${wil.join(", ")}, dan sirine di Bali</span></div>`; }

  return {nyala, pasang, interaksi, klik, legenda, muat, get dimuat() { return !!D; }};
})();
