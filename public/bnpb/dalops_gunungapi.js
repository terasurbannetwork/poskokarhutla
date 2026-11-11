/* Tab Gunung Api di Pantau Dalops (/bnpb/dalops), pemilik 5 Nov 2026: "pemantauan gunung api dan bencana lain di satu halaman yang sama".
   Data publik tanpa rute baru: /banjir/data/gunungapi_status.json (scripts/banjir/gunungapi.py; level resmi PVMBG apa adanya).
   Kartu per gunung Awas/Siaga: diagram cincin 5/10/15 km + radius rekomendasi + kipas sektor, jarak dan arah, chip ancaman dan kawasan dihindari,
   semuanya diurai dari teks rekomendasi PVMBG oleh urai() (murni, diuji tests/bnpb/dalops.test.mjs; port data/laporan-bnpb/generator/harian.py
   ga_ancaman/ga_kawasan). Daftar kecamatan terdampak tidak ada: public/gunungapi/data/paparan.json hanya memuat desa tanpa kecamatan.
   Helper layar (h, bagian, tbodyProv, ...) disuntik dari dalops.js. Warna level sama dengan public/gunungapi/app.js (WARNA_LV). */
(g => {
  "use strict";
  const NAMA = {1: "Normal", 2: "Waspada", 3: "Siaga", 4: "Awas"}, ROMAWI = {1: "I", 2: "II", 3: "III", 4: "IV"};
  const SUDUT = {"utara": 0, "timur laut": 45, "timur": 90, "tenggara": 135, "selatan": 180, "barat daya": 225, "barat": 270, "barat laut": 315};
  const km = s => parseFloat(String(s).replace(",", "."));

  /* arah tertulis -> daftar sudut mata angin (derajat dari utara). "barat laut dan tenggara" = dua sudut; "selatan-barat daya" = satu sudut di antaranya. */
  function sudut(arah) {
    return String(arah || "").toLowerCase().split(/\s+dan\s+|,\s*/).map(p => {
      const t = p.match(/barat laut|barat daya|timur laut|tenggara|selatan|utara|barat|timur/g);
      if (!t) return null;
      const r = t.map(a => SUDUT[a] * Math.PI / 180), y = r.reduce((s, a) => s + Math.sin(a), 0), x = r.reduce((s, a) => s + Math.cos(a), 0);
      return (Math.round(Math.atan2(y, x) * 1800 / Math.PI) / 10 + 360) % 360;
    }).filter(a => a != null);
  }

  const ANCAMAN = [[/awan\s*panas/, "Awan panas"], [/guguran lava/, "Guguran lava"], [/aliran lava/, "Aliran lava"], [/batu pijar|batu \(pijar\)/, "Lontaran batu pijar"],
    [/lontaran material/, "Lontaran material"], [/hujan abu|abu vulkanik/, "Hujan abu"], [/lahar/, "Lahar"], [/erupsi sekunder/, "Erupsi sekunder"]];
  const IK_ANCAMAN = {"Awan panas": "gunungapi", "Guguran lava": "longsor", "Aliran lava": "karhutla", "Lontaran batu pijar": "karhutla", "Lontaran material": "peringatan",
    "Hujan abu": "cuaca", "Lahar": "banjir", "Erupsi sekunder": "peringatan"};

  /* teks rekomendasi PVMBG (string atau larik butir) -> {radius, sektor:{arah,km}|null, sudut:[...], ancaman:[...], kawasan:[...]}.
     radius = radius terbesar "dari puncak/kawah/pusat erupsi" (radius dari "pulau baru" bukan radius utama, masuk kawasan);
     sektor utama = sektor dengan jarak terbesar yang melebihi radius, jaraknya dibaca dari kalimat sektor itu saja (sampai sektor/radius berikutnya). */
  function urai(teks) {
    const t = (Array.isArray(teks) ? teks.join(" ") : String(teks || "")).replace(/\s+/g, " "), low = t.toLowerCase();
    let radius = null;
    for (const m of low.matchAll(/radius\s+(\d+(?:[.,]\d+)?)\s*km\s+dari\s+(?!pulau baru)/g)) radius = Math.max(radius ?? 0, km(m[1]));
    const sek = [];
    for (const m of low.matchAll(/sektor\s+([a-z][a-z\- ]*?)(?=\s+(?:meliputi|di|dari|gunung\w*|sejauh)\b|[.,])/g)) {
      const sisa = low.slice(m.index + m[0].length), potong = sisa.search(/sektor|radius|di luar jarak|\.\s+\d+\./), seg = potong < 0 ? sisa : sisa.slice(0, potong);
      const jarak = [...seg.matchAll(/(\d+(?:[.,]\d+)?)\s*km\b/g)].map(x => km(x[1]));
      sek.push({arah: m[1].trim(), km: jarak.length ? Math.max(...jarak) : null});
    }
    const utama = sek.filter(s => s.km != null && s.km > (radius ?? 0)).sort((a, b) => b.km - a.km)[0] || null;
    const ancaman = ANCAMAN.filter(([re]) => re.test(low)).map(([, n]) => n);
    const arahUnik = [...new Set(sek.map(s => s.arah))], kawasan = [];
    if (arahUnik.length) kawasan.push("Sektor " + (arahUnik.length > 1 ? arahUnik.slice(0, -1).join(", ") + " dan " + arahUnik.at(-1) : arahUnik[0]));
    const sg = {};
    for (const m of t.matchAll(/\b(Sungai|Besuk|Kali)\s+([A-Z][a-z]+)((?:\s*,\s*(?!Sungai|Besuk|Kali|dan\b)[A-Z][a-z]+)*)/g))
      for (const n of [m[2], ...m[3].split(",").map(x => x.trim()).filter(Boolean)]) { const a = sg[m[1]] || (sg[m[1]] = []); if (!a.includes(n)) a.push(n); }
    for (const [k, v] of Object.entries(sg)) kawasan.push(`${k} ${v.join(", ")}`);
    for (const m of t.matchAll(/radius\s+(\d+(?:[.,]\d+)?)\s*km dari\s+([a-z ]+?)(?:\s+di sektor\s+([a-z ]+?))?(?=\s+(?:Gunung\w*|di|sektor)\b|[.,])/g))
      if (km(m[1]) < (radius ?? 0)) { const s = `${m[1]} km dari ${m[2].trim()}` + (m[3] ? ` (${m[3].trim()})` : ""); if (!kawasan.includes(s)) kawasan.push(s); }
    return {radius, sektor: utama, sudut: utama ? sudut(utama.arah) : [], ancaman, kawasan};
  }

  /* tanggal status berlaku: perubahan ke level sekarang (tgl pasti); kalau gunung tidak tercatat berubah, hanya diketahui "sebelum awal riwayat" */
  function tglBerlaku(gn, d) {
    const p = (d.perubahan || []).filter(x => x.nama === gn.nama && x.ke === gn.level).sort((a, b) => b.tgl.localeCompare(a.tgl))[0];
    return p ? {tgl: p.tgl, pasti: true} : {tgl: (d.riwayat || [])[0]?.tgl || null, pasti: false};
  }

  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tglPendek = (s, tahun) => s ? `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1]}${tahun ? " " + s.slice(0, 4) : ""}` : "";
  const labelBerlaku = b => b.tgl ? (b.pasti ? "Berlaku " + tglPendek(b.tgl) : "Sebelum " + tglPendek(b.tgl, true)) : "Tanggal berlaku belum diketahui";
  const namaGn = n => "Gn. " + n.replace(/^(Gn\.|Gunung)\s*/i, "");
  const IK_LEVEL = {4: "peringatan", 3: "gunungapi", 2: "tunggu", 1: "ok"};

  /* diagram SVG: cincin tiap 5 km (sampai 15 km, lebih bila sektor lebih jauh), lingkaran radius rekomendasi, kipas sektor, panah Utara */
  function diagram(gn, u) {
    const NS = "http://www.w3.org/2000/svg", W = 190, C = W / 2, R = 84, maks = Math.max(15, Math.ceil((u.sektor?.km || 0) / 5) * 5), s = R / maks;
    const el = (n, a, teks) => { const e = document.createElementNS(NS, n); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); if (teks != null) e.textContent = teks; return e; };
    const svg = el("svg", {viewBox: `0 0 ${W} ${W}`, class: "dl-ga-svg dl-ga-l" + gn.level, role: "img",
      "aria-label": `Zona bahaya Gn. ${gn.nama}: ` + (u.radius ? `radius ${u.radius} km` : "radius tidak disebut") + (u.sektor ? `, sektor ${u.sektor.arah} ${u.sektor.km} km` : "")});
    for (let k = 5; k <= maks; k += 5) { svg.append(el("circle", {cx: C, cy: C, r: k * s, class: "cincin"}), el("text", {x: C + 3, y: C - k * s + 9, class: "tk"}, k + " km")); }
    if (u.radius) svg.append(el("circle", {cx: C, cy: C, r: Math.min(u.radius, maks) * s, class: "zona"}));
    if (u.sektor) for (const a of u.sudut) {
      const r = u.sektor.km * s, p = d => [C + r * Math.sin((a + d) * Math.PI / 180), C - r * Math.cos((a + d) * Math.PI / 180)].map(v => v.toFixed(1));
      const [x1, y1] = p(-22.5), [x2, y2] = p(22.5);
      svg.append(el("path", {d: `M${C} ${C}L${x1} ${y1}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x2} ${y2}Z`, class: "kipas"}));
    }
    svg.append(el("circle", {cx: C, cy: C, r: 2.6, class: "puncak"}),
      el("path", {d: `M${W - 14} 27V9M${W - 18} 14l4-6 4 6`, class: "utara"}), el("text", {x: W - 14, y: 38, class: "tu", "text-anchor": "middle"}, "U"));
    return svg;
  }

  function render(p, d, U) {
    const {bagian, hl, h, F, ikon, label, kosong, td, tdv, tbodyProv, pasangUrut, pasangTip} = U;
    const gunung = d?.gunung || [];
    if (!gunung.length) return p.replaceChildren(kosong("peringatan", "Data gunung api kosong, coba muat ulang."));
    const jl = d.jumlah_level || {}, n = l => jl[l] ?? gunung.filter(x => x.level === l).length;
    const tinggi = gunung.filter(x => x.level >= 3).sort((a, b) => b.level - a.level || a.nama.localeCompare(b.nama));
    const waspada = gunung.filter(x => x.level === 2);

    /* peta gunung api (pemilik 11 Nov 2026 "peta gunung apinya ya"): titik per gunung berwarna level, lingkar radius larangan Siaga/Awas,
       saring level dan ubin jumlah per level di dalam peta, sama dengan peta Banjir */
    const WARNA = {1: "#9aa4b2", 2: "#e0b400", 3: "#e8743b", 4: "#d64545"};
    const ubin = h("div", {class: "db-ubin-grid k4"}, [4, 3, 2, 1].map(l => h("div", {class: "db-ubin" + (l >= 3 && n(l) ? (l === 4 ? " merah" : " oranye") : "")},
      h("header", null, h("i", null, ikon(IK_LEVEL[l])), h("span", {teks: `${NAMA[l]} (${ROMAWI[l]})`})), h("b", {teks: F(n(l))}), h("small", {teks: "gunung api"}))));
    const wadah = h("div", {class: "dl-peta"}, h("p", {class: "bn-pesan", teks: "Memuat peta…"}));
    const ringkas = bagian("gunungapi-ringkas", "gunungapi", "Peta gunung api",
      tinggi.length ? [hl(`${F(tinggi.length)} gunung api`), " berstatus Siaga atau Awas, ", hl(`${F(n(2))}`), " Waspada"] : ["Tidak ada gunung api berstatus Siaga atau Awas, ", hl(`${F(n(2))}`), " Waspada"],
      wadah, h("div", {class: "dl-legenda-peta dl-ga-leg"}, ...[4, 3, 2, 1].map(l => h("span", {class: "dl-leg dl-ga-leg" + l, teks: NAMA[l]})),
        d.dibuat ? label("Status PVMBG per " + tglPendek(d.dibuat.slice(0, 10), true), "kalender", "garis") : null));
    requestAnimationFrame(() => petaGunung(wadah, gunung, WARNA, ubin, U));
    const kartu = tinggi.map(gn => {
      const u = urai(gn.rekomendasi), radius = u.radius ?? gn.radius_km ?? null;
      const baris = [];
      if (radius) baris.push(h("p", null, h("b", {teks: `${F(radius)} km`}), " ke segala arah dari puncak"));
      if (u.sektor) baris.push(h("p", null, h("b", {teks: `${F(u.sektor.km)} km`}), ` ke arah ${u.sektor.arah}`));
      if (!baris.length) baris.push(h("p", {class: "dl-redup", teks: "Jarak larangan tidak disebut dalam rekomendasi."}));
      const grup = (judul, xs, ik, nada) => xs.length ? h("div", {class: "dl-ga-grup"}, h("b", {class: "dl-ga-jdl", teks: judul}), h("div", {class: "dl-chips"}, xs.map(t => label(t, ik(t), nada)))) : null;
      const tengah = h("div", {class: "dl-ga-tengah"}, h("h4", {teks: namaGn(gn.nama)}),
        h("div", {class: "dl-chips"}, label(labelBerlaku(tglBerlaku(gn, d)), "kalender", "garis"), h("span", {class: "dl-tag dl-ga-pil dl-ga-l" + gn.level}, ikon("gunungapi"), `${NAMA[gn.level]} (Level ${ROMAWI[gn.level]})`)),
        ...baris);
      return bagian("gunungapi-" + gn.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-"), "gunungapi", namaGn(gn.nama),
        [hl(namaGn(gn.nama)), ` berstatus ${NAMA[gn.level]}`, ...radius ? [", dilarang beraktivitas dalam radius ", hl(`${F(radius)} km`)] : []],
        h("div", {class: "dl-ga-kartu"}, h("div", {class: "dl-ga-diagram"}, diagram(gn, {...u, radius})), tengah,
          h("div", {class: "dl-ga-kanan"}, grup("ANCAMAN", u.ancaman, t => IK_ANCAMAN[t] || "peringatan", "merah") || h("p", {class: "dl-redup", teks: "Ancaman tidak disebut dalam rekomendasi."}),
            grup("KAWASAN DIHINDARI", u.kawasan, () => "pin", "kuning"))));
    });

    /* gunung Waspada per provinsi, tertutup sampai diklik */
    let tabel = null;
    if (waspada.length) {
      const per = new Map();
      for (const x of waspada) (per.get(x.prov || "Provinsi tidak tercatat") || per.set(x.prov || "Provinsi tidak tercatat", []).get(x.prov || "Provinsi tidak tercatat")).push(x);
      const kolom = (t, i) => h("th", {scope: "col", teks: t, "data-i": String(i)});
      const t = h("table", {class: "ad-tabel dl-tabel dl-ga-tabel"}, h("thead", null, h("tr", null, kolom("Gunung api", 0), kolom("Provinsi", 1), kolom("Radius, km", 2))));
      t.append(...[...per.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([prov, xs]) =>
        tbodyProv(prov, `${F(xs.length)} gunung`, [td(""), td("")], 1, xs.sort((a, b) => a.nama.localeCompare(b.nama)).map(x => {
          const r = x.radius_km ?? urai(x.rekomendasi).radius;
          return h("tr", null, h("td", {class: "dl-wil", teks: namaGn(x.nama)}), td(x.prov || "–"), tdv(r ? F(r) : "–", r));
        }))));
      pasangUrut(t); tabel = h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t);
    }
    const kartuWaspada = bagian("gunungapi-waspada", "gunungapi", "Waspada",
      waspada.length ? [hl(`${F(waspada.length)} gunung api`), " berstatus Waspada, radius dari rekomendasi PVMBG"] : "Tidak ada gunung api berstatus Waspada",
      tabel || kosong("ok", "Tidak ada gunung api berstatus Waspada."));
    p.replaceChildren(ringkas, ...kartu, kartuWaspada);
    pasangTip();
  }

  /* lingkar radius (km) sebagai poligon 64 sisi */
  const lingkar = (lon, lat, r) => [[...Array(65)].map((_, i) => { const a = i / 64 * 2 * Math.PI; return [lon + r / (111.32 * Math.cos(lat * Math.PI / 180)) * Math.sin(a), lat + r / 110.57 * Math.cos(a)]; })];
  function petaGunung(wadah, gunung, WARNA, ubin, U) {
    const {h, F, ikon} = U, ml = g.maplibregl;
    if (!ml) return wadah.replaceChildren(U.kosong("peringatan", "Peta gagal dimuat, coba muat ulang."));
    wadah.replaceChildren();
    const titik = gunung.filter(x => x.lat != null && x.lon != null);
    const peta = new ml.Map({container: wadah, style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]],
      fitBoundsOptions: {padding: 16}, minZoom: 3, maxZoom: 13, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    peta.addControl(new ml.NavigationControl({showCompass: false}), "top-right");
    peta.touchZoomRotate.disableRotation();
    const saring = new Set();
    const tombol = [4, 3, 2, 1].map(l => { const b = h("button", {type: "button", class: "dl-saring-btn dl-ga-s" + l, "aria-pressed": "false"}, ikon("gunungapi"), NAMA[l]);
      b.addEventListener("click", () => { saring.has(l) ? saring.delete(l) : saring.add(l); b.setAttribute("aria-pressed", String(saring.has(l)));
        const f = saring.size ? ["in", ["get", "lv"], ["literal", [...saring]]] : null; for (const id of ["ga-titik", "ga-radius", "ga-radius-garis"]) if (peta.getLayer(id)) peta.setFilter(id, f); });
      return b; });
    wadah.append(h("div", {class: "dl-peta-alat"}, h("div", {class: "dl-saring", role: "group", "aria-label": "Saring level gunung api"}, tombol)));
    ubin.classList.add("dl-peta-ubin"); wadah.append(ubin);
    peta.on("load", () => {
      peta.addSource("ga", {type: "geojson", data: {type: "FeatureCollection", features: titik.map((x, i) => ({type: "Feature", id: i, geometry: {type: "Point", coordinates: [x.lon, x.lat]}, properties: {lv: x.level, i}}))}});
      peta.addSource("ga-r", {type: "geojson", data: {type: "FeatureCollection", features: titik.filter(x => x.level >= 3).map(x => {
        const r = urai(x.rekomendasi).radius ?? x.radius_km; return r ? {type: "Feature", geometry: {type: "Polygon", coordinates: lingkar(x.lon, x.lat, r)}, properties: {lv: x.level}} : null; }).filter(Boolean)}});
      const warna = ["match", ["get", "lv"], 4, WARNA[4], 3, WARNA[3], 2, WARNA[2], WARNA[1]];
      peta.addLayer({id: "ga-radius", type: "fill", source: "ga-r", paint: {"fill-color": warna, "fill-opacity": .18}});
      peta.addLayer({id: "ga-radius-garis", type: "line", source: "ga-r", paint: {"line-color": warna, "line-width": 1.5}});
      peta.addLayer({id: "ga-titik", type: "circle", source: "ga", layout: {"circle-sort-key": ["get", "lv"]},
        paint: {"circle-color": warna, "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["match", ["get", "lv"], 4, 8, 3, 7, 2, 5.5, 4.5], 9, ["match", ["get", "lv"], 4, 13, 3, 12, 2, 10, 8]],
          "circle-stroke-color": "#fff", "circle-stroke-width": 1.6}});
      const pop = new ml.Popup({closeButton: false, closeOnClick: false, offset: 12, className: "dl-popup"});
      peta.on("mouseenter", "ga-titik", e => { peta.getCanvas().style.cursor = "pointer"; const x = titik[e.features[0].properties.i], r = urai(x.rekomendasi).radius ?? x.radius_km;
        const baris = (t, v) => h("div", {class: "dl-aw-baris"}, h("span", {teks: t}), h("div", null, v));
        pop.setLngLat([x.lon, x.lat]).setDOMContent(h("div", {class: "dl-pop dl-pop-awas"},
          h("div", {class: "dl-aw-kepala"}, h("div", null, h("b", {class: "dl-tip-nama", teks: namaGn(x.nama)}), h("small", {teks: x.prov || ""}))),
          h("div", {class: "dl-aw-isi"}, baris("Status", h("span", {class: "dl-tag dl-ga-pil dl-ga-l" + x.level}, ikon("gunungapi"), `${NAMA[x.level]} (Level ${ROMAWI[x.level]})`)),
            r ? baris("Radius", h("b", {teks: `${F(r)} km`})) : null, x.tinggi ? baris("Tinggi", h("b", {teks: `${F(x.tinggi)} m`})) : null))).addTo(peta); });
      peta.on("mouseleave", "ga-titik", () => { pop.remove(); peta.getCanvas().style.cursor = ""; });
      peta.on("click", "ga-titik", e => { const x = titik[e.features[0].properties.i]; if (x.laporan) g.open(x.laporan, "_blank", "noopener"); });
    });
  }
  g.DalopsGunungApi = {urai, sudut, tglBerlaku, labelBerlaku, render};
})(globalThis);
