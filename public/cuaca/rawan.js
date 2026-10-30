"use strict";
/* ================================================================ overlay Infrastruktur rawan longsor dan Jaringan peringatan dini
   Data statis: data/gerakan_tanah_pu.json (PUPR, prakiraan Badan Geologi; scripts/cuaca/gerakan_tanah_pu.py, bulanan) dan
   data/jaringan_peringatan.json (BNPB; scripts/cuaca/bangun_bnpb.py). Dimuat saat overlay pertama dinyalakan; berkas hilang = overlay dibuang (A18).
   Pilihan jenis = pil di legenda dock; hanya setFilter, tanpa data digambar ulang (INP aman). */
const Rawan = (() => {
  const BERKAS = {ls: "data/gerakan_tanah_pu.json", ews: "data/jaringan_peringatan.json"};
  const JUDUL = {ls: "Infrastruktur rawan longsor", ews: "Jaringan peringatan dini"}, PENDEK = {ls: "Rawan longsor", ews: "Peringatan dini"};
  const SUMBER = {ls: "Sumber: PUPR, Badan Geologi (prakiraan gerakan tanah)", ews: "Sumber: BNPB"};
  /* kelompok -> [nama, warna, kunci ikon bersama, jalur SVG garis 24x24 bila ikon bersama tak ada] */
  const KEL = {
    jalan: ["Jalan dan lereng", "#b45309", "jalan"], jembatan: ["Jembatan", "#92400e", null, "M2 17h20M5 17V9M19 17V9M5 9c4 6 10 6 14 0"],
    air: ["Bendungan, embung, dan irigasi", "#0e7490", null, "M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"], pantai: ["Pengaman pantai", "#1d4ed8", "ombak"], sarana: ["Sarana lain", "#6b7280", "gedung"],
    aws: ["AWS dan AAWS", "#0f766e", "hujan"], arg: ["ARG (hujan)", "#2563eb", null, "M7 14a4 4 0 0 1-.5-8A6 6 0 0 1 18 5M12 10v10M9 17l3 3 3-3"],
    bmkg: ["Stasiun BMKG", "#7a1f2b", "satelit"], pga: ["PGA gunung api", "#c2410c", null, "M3 20 10 6l4 7 3-4 4 11z"],
    akc: ["Akselerograf", "#6d28d9", null, "M2 12h4l2-6 4 12 3-9 2 3h5"], lews: ["LEWS longsor", "#b91c1c", "peringatan"]};
  const DAFTAR = {ls: ["jalan", "jembatan", "air", "pantai", "sarana"], ews: ["aws", "arg", "bmkg", "pga", "akc", "lews"]};
  const D = {}, mati = {ls: new Set(), ews: new Set()}, gagal = {};
  const lihat = k => { const i = document.querySelector(`#lapis input[data-l="r-${k}"]`); return !!i && i.checked; };
  const ikon = g => { const [, , k, d] = KEL[g]; return k ? PI.IKON[k] : `<path d="${d}"/>`; };
  const svg = (g, w = "currentColor") => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${w}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ikon(g)}</svg>`;
  const kelompokJenis = (j, ls) => ls ? j.kel : j.k;

  /* ---------- data ---------- */
  async function muat(k) {
    if (D[k] || gagal[k]) return D[k];
    try { const d = await muatJSON(BERKAS[k]); if (!d?.t?.length) throw 0; D[k] = d; return d; } catch { gagal[k] = true; return null; }
  }
  const geo = k => { const d = D[k], ls = k === "ls";
    return {type: "FeatureCollection", features: d.t.map((r, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [r[0], r[1]]}, properties: {i, g: kelompokJenis(d.jenis[r[2]], ls)}}))}; };

  /* ---------- peta ---------- */
  function gambarIkon() {   /* bulatan berwarna + ikon garis putih, satu gambar per kelompok; ditambah ulang tiap style.load */
    for (const g in KEL) { const id = "rw-" + g; if (peta.hasImage(id)) continue;
      const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      x.beginPath(); x.arc(32, 32, 29, 0, 7); x.fillStyle = KEL[g][1]; x.fill(); x.lineWidth = 4; x.strokeStyle = "#fff"; x.stroke();
      x.translate(17, 17); x.scale(1.2, 1.2); x.lineWidth = 2; x.lineCap = x.lineJoin = "round"; x.strokeStyle = "#fff";
      const d = KEL[g][3] || null, p = d ? [d] : [...ikon(g).matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
      p.forEach(s => x.stroke(new Path2D(s)));
      peta.addImage(id, x.getImageData(0, 0, 64, 64), {pixelRatio: 2}); }
  }
  const filtro = k => ["!", ["in", ["get", "g"], ["literal", [...mati[k]]]]];
  async function pasangLapis(k) {
    if (peta.getSource("rw-" + k) || !(await muat(k))) return;
    gambarIkon();
    peta.addSource("rw-" + k, {type: "geojson", data: geo(k)});
    peta.addLayer({id: "rw-" + k, type: "symbol", source: "rw-" + k, filter: filtro(k), layout: {"icon-image": ["concat", "rw-", ["get", "g"]], "icon-allow-overlap": true, "icon-ignore-placement": true,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 3, .3, 7, .5, 11, .8], visibility: lihat(k) ? "visible" : "none"}});
  }
  function pasang() { for (const k in BERKAS) if (D[k] || lihat(k)) pasangLapis(k).then(() => renderLegenda()); }   /* style.load: gambar ulang yang sudah dimuat */
  async function nyala(k) {
    if (lihat(k)) await pasangLapis(k);
    if (peta.getLayer("rw-" + k)) peta.setLayoutProperty("rw-" + k, "visibility", lihat(k) ? "visible" : "none");
    if (lihat(k) && !D[k]) { const i = document.querySelector(`#lapis input[data-l="r-${k}"]`); if (i) i.checked = false; }   /* berkas tak terbaca: hentikan */
    renderLegenda(); }

  /* ---------- kontrol ---------- */
  function kontrol() {
    const A = {ls: ["#92400e", "#e0a56b", "peringatan"], ews: ["#0f3d66", "#5b9bd5", "bel"]};
    for (const k in A) { UBIN["r-" + k] = A[k]; UBIN_PENDEK["r-" + k] = PENDEK[k]; }
    $("#lapis").insertAdjacentHTML("beforeend", `<details open><summary>Kerawanan dan peringatan dini</summary>${Object.keys(A).map(k => `<label><input type="checkbox" data-l="r-${k}"> ${JUDUL[k]}</label>`).join("")}</details>`);
    $("#lapis").addEventListener("change", e => { const i = e.target.closest('input[data-l^="r-"]'); if (i) nanti(() => nyala(i.dataset.l.slice(2))); });
    $("#legenda").addEventListener("click", e => { const b = e.target.closest("button[data-rg]"); if (!b) return; const [k, g] = b.dataset.rg.split(":");
      mati[k].has(g) ? mati[k].delete(g) : mati[k].add(g); b.setAttribute("aria-pressed", !mati[k].has(g));
      nanti(() => peta.getLayer("rw-" + k) && peta.setFilter("rw-" + k, filtro(k))); });
  }

  /* ---------- legenda: pil per jenis, bisa dimatikan ---------- */
  function legenda() { let h = "";
    for (const k of ["ls", "ews"]) { if (!lihat(k) || !D[k]) continue; const d = D[k], ls = k === "ls", n = {};
      d.t.forEach(r => { const g = kelompokJenis(d.jenis[r[2]], ls); n[g] = (n[g] || 0) + 1; });
      h += `<div class="lbl">${JUDUL[k]}${ls ? `, prakiraan ${esc(d.bulan_nama)}` : ""}</div><div class="rw-pil">${DAFTAR[k].filter(g => n[g]).map(g =>
        `<button type="button" class="rw-chip" data-rg="${k}:${g}" aria-pressed="${!mati[k].has(g)}" style="--w:${KEL[g][1]}">${svg(g)}${KEL[g][0]} <b>${fmt(n[g])}</b></button>`).join("")}</div>
        <div class="legnum" style="margin:2px 0 8px"><span>${SUMBER[k]}</span></div>`; }
    return h; }

  /* ---------- interaksi ---------- */
  const aktif = () => ["rw-ews", "rw-ls"].filter(id => peta.getLayer(id) && peta.getLayoutProperty(id, "visibility") === "visible");
  const baris = f => { const k = f.layer.id.slice(3), d = D[k], r = d.t[f.properties.i], ls = k === "ls", g = f.properties.g;
    return {k, d, r, g, ls, nama: r[3], jenis: ls ? d.jenis[r[2]].nama : KEL[g][0], wil: ls ? [r[4], r[5]].filter(Boolean).join(", ") : r[4], sub: ls ? "" : d.jenis[r[2]].pemilik, ket: ls ? "" : r[4]}; };
  function hover(e) { if (!PI) return false; const L = aktif(); if (!L.length) return false;
    const f = peta.queryRenderedFeatures(e.point, {layers: L})[0]; if (!f) return false;
    const o = baris(f); peta.getCanvas().style.cursor = "pointer";
    PI.tampilTip(PI.kartuTip({judul: `<span translate="no">${esc(o.nama)}</span>`, stat: [[o.ls ? "peringatan" : "bel", o.jenis, o.ls ? "jenis infrastruktur" : "jenis", KEL[o.g][1], true],
      ...(o.ls ? [["posko", o.wil || "-", "kabupaten", "#6b7280"], ["peta", o.d.bulan_nama, "prakiraan bulan", "#92400e"]] : [["perisai", o.d.jenis[o.r[2]].pemilik, "pemilik", "#6b7280"]])]}), e.originalEvent); return true; }
  function klik(e) { const L = aktif(); if (!L.length) return false; const f = peta.queryRenderedFeatures(e.point, {layers: L})[0]; if (!f) return false;
    const o = baris(f); S.pilih = null; renderCrumb();
    Laci.buka(o.ls ? "Infrastruktur rawan longsor" : "Jaringan peringatan dini", `<span translate="no">${esc(o.nama)}</span>`, `<span class="pl" style="--w:${KEL[o.g][1]}">${esc(o.jenis)}</span>`,
      `<div class="grid g4">${kot("Jenis", esc(o.jenis), o.ls ? "infrastruktur" : "alat")}${o.ls ? kot("Prakiraan", esc(o.d.bulan_nama), "Badan Geologi") : kot("Pemilik", esc(o.d.jenis[o.r[2]].pemilik), "menurut sumber")}</div>
      ${o.wil ? `<p class="fnd" translate="no"><b>${esc(o.wil)}</b></p>` : ""}
      <p class="fnd">${o.ls ? `Berada di zona potensi gerakan tanah tinggi pada prakiraan ${esc(o.d.bulan_nama)}. Ini prakiraan zona, bukan kejadian longsor.` : "Lokasi alat menurut data BNPB; status operasi alat tidak tercatat di sumber."}</p>
      <p class="fnd">${SUMBER[o.k]}, diambil ${esc(o.d.diambil)}</p>`);
    peta.flyTo({center: [o.r[0], o.r[1]], zoom: Math.max(peta.getZoom(), 9), duration: 600}); return true; }

  return {pasang, kontrol, legenda, hover, klik};
})();
