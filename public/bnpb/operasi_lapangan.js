/* Operasi (/bnpb/operasi-lapangan), OP-3: peta operasi udara harian dari GET /api/operasi/peta?tanggal= (src/operasi_udara.js).
   Spek: docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 9. Hitungan penyajian ada di operasi_lapangan_hitung.js (murni, diuji).
   INP: ganti tanggal/segmen/klik base langsung mengecat chrome; peta dan daftar berat sesudah dua rAF. Tanpa skrip/gaya inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {ikon, h} = window.Wilayah, O = window.OperasiLapangan, app = document.getElementById("app"), NS = "http://www.w3.org/2000/svg";
  const st = {tanggal: O.hariIniWIB(), segmen: "pagi", dasar: "citra", base: null, data: null, super: false, ...{rentang: O.rentangBawaan()}, nilai: null};
  let nomorNilai = 0;
  let nomor = 0, peta = null, lapis = [], el = {};

  const api = async (m, u, b) => {
    try { const r = await fetch(u, {method: m, headers: b ? {"content-type": "application/json", "x-pb": "1"} : {}, body: b ? JSON.stringify(b) : undefined});
      return {ok: r.ok, s: r.status, j: await r.json().catch(() => ({}))}; } catch (e) { return {ok: false, s: 0, j: {}}; }
  };
  const sesudahFrame = f => { let jalan = false; const go = () => { if (!jalan) { jalan = true; f(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
  const galatTeks = r => r.s === 503 ? "Fitur Operasi Lapangan belum diaktifkan." : r.s === 0 ? "Tidak ada sinyal. Coba lagi." : r.s === 401 || r.s === 403 ? "Akunmu belum berhak untuk ini." : "Belum berhasil. Coba lagi.";
  const tampil = (t, ok) => { el.pesan.textContent = t || ""; el.pesan.className = "bn-pesan" + (t ? (ok === true ? " ok" : ok === false ? " galat" : "") : ""); };
  const pil = (teks, kelas) => h("span", {class: "ol-pil " + kelas}, h("i"), teks);
  const kosong = t => h("p", {class: "ol-kosong"}, ikon("senyap"), t);
  const svg = (tag, att) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(att)) e.setAttribute(k, v); return e; };
  const ikonPeta = (bentuk, kelas) => { const s = svg("svg", {viewBox: "0 0 24 24", "aria-hidden": "true"});
    s.append(bentuk === "segitiga" ? svg("path", {d: "M12 3L22 20H2z", class: "isi"}) : bentuk === "kotak" ? svg("rect", {x: 4, y: 4, width: 16, height: 16, rx: 2, class: "isi"}) : svg("circle", {cx: 12, cy: 12, r: 8, class: "isi"}));
    const d = h("div", {class: "ol-m " + kelas}); d.append(s); return d; };

  /* ---------- gambar armada: siluet per keluarga pesawat (tanpa foto pihak luar; SVG di DOM, aman CSP) ---------- */
  const KELUARGA = tipe => { const t = String(tipe || "");
    return /Hercules|C-130|CN-?295/i.test(t) ? "angkut" : /Cessna|Caravan|C208|CASA|NC-?212/i.test(t) ? "pesawat"
      : /Mi-|Ka-32|Kamov|UH-60|EH-60|Blackhawk|Puma|H225|S-61|412/i.test(t) ? "heli_besar" : /tidak diketahui/i.test(t) || !t ? "lain" : "heli"; };
  const SILUET = {
    heli: [["rect", {x: 8, y: 12, width: 92, height: 2.6, rx: 1.3}], ["rect", {x: 51, y: 13, width: 4, height: 7}], ["path", {d: "M30 33c0-9 7-14 18-14h14c9 0 15 6 17 14v3c0 3-2 5-5 5H37c-4 0-7-3-7-8z"}],
      ["path", {d: "M76 27l34-3v4l-33 6z"}], ["path", {d: "M104 14h5l3 14h-6z"}], ["path", {d: "M34 47h44M42 41v6M68 41v6", fill: "none", "stroke-width": 2.6, "stroke-linecap": "round"}], ["path", {d: "M33 30c1-5 5-8 11-8v8z", class: "kaca"}]],
    heli_besar: [["rect", {x: 2, y: 10, width: 104, height: 2.8, rx: 1.4}], ["rect", {x: 50, y: 11, width: 5, height: 7}], ["path", {d: "M18 34c0-10 8-16 20-16h36c8 0 13 5 15 12l1 6c0 4-3 7-7 7H28c-6 0-10-4-10-9z"}],
      ["path", {d: "M86 25l26-2v5l-26 8z"}], ["path", {d: "M106 12h5l3 16h-6z"}], ["circle", {cx: 30, cy: 47, r: 3.6}], ["circle", {cx: 72, cy: 47, r: 3.6}], ["path", {d: "M21 30c1-6 6-9 13-9v9z", class: "kaca"}], ["path", {d: "M44 24h8v6h-8zM56 24h8v6h-8z", class: "kaca"}]],
    pesawat: [["path", {d: "M6 33c1-5 6-8 14-8h78c8 0 13 3 15 7v1c-2 4-7 5-15 5H20c-8 0-13-1-14-5z"}], ["path", {d: "M92 26l10-16h7l-5 17z"}], ["path", {d: "M36 21h46v4H36z"}], ["path", {d: "M50 25h4v3h-4z"}],
      ["circle", {cx: 26, cy: 44, r: 3}], ["circle", {cx: 60, cy: 44, r: 3}], ["path", {d: "M26 38v3M60 38v3", fill: "none", "stroke-width": 2}], ["path", {d: "M9 31c2-3 5-4 10-4v4z", class: "kaca"}], ["path", {d: "M98 31h16v3H98z"}]],
    angkut: [["path", {d: "M4 32c1-7 8-11 18-11h70c10 0 16 4 18 10v2c-2 6-8 8-18 8H22c-10 0-17-2-18-9z"}], ["path", {d: "M86 22l12-17h8l-4 19z"}], ["path", {d: "M30 16h52v5H30z"}], ["path", {d: "M38 13h6v4h-6zM66 13h6v4h-6z"}],
      ["circle", {cx: 30, cy: 45, r: 3.4}], ["circle", {cx: 64, cy: 45, r: 3.4}], ["circle", {cx: 72, cy: 45, r: 3.4}], ["path", {d: "M7 29c2-4 6-6 12-6v6z", class: "kaca"}]],
    lain: [["circle", {cx: 60, cy: 30, r: 14, fill: "none", "stroke-width": 3}], ["path", {d: "M55 26c0-3 2-5 5-5s5 2 5 5c0 4-5 4-5 8M60 38v1", fill: "none", "stroke-width": 3, "stroke-linecap": "round"}]]};
  const PERAN = {wb: "Water bombing", patroli: "Patroli", patroli_wb: "Patroli + WB", omc: "OMC"};
  const gambarArmada = a => { const kel = KELUARGA(a.tipe), s = svg("svg", {viewBox: "0 0 120 56", "aria-hidden": "true"});
    for (const [tag, att] of SILUET[kel]) s.append(svg(tag, att));
    const d = h("div", {class: `ol-foto ol-p-${a.peran || "lain"}`, title: a.tipe || ""}); d.append(s, h("span", {teks: PERAN[a.peran] || "Armada"})); return d; };

  /* ---------- kerangka: kepala navy (pola Direktori), peta citra lebar + panel melayang ---------- */
  function kerangka() {
    el.tgl = h("input", {type: "date", class: "ol-tgl", value: st.tanggal, "aria-label": "Tanggal operasi"});
    el.seg = h("div", {class: "ol-seg", role: "radiogroup", "aria-label": "Waktu"}, O.SEGMEN.map(([v, t, ik]) => h("label", null, h("input", {type: "radio", name: "segmen", value: v, ...(v === st.segmen ? {checked: ""} : {})}), ikon(ik), t)));
    el.dari = h("input", {type: "date", class: "ol-tgl", value: st.rentang.dari, "aria-label": "Dari tanggal"}); el.sampai = h("input", {type: "date", class: "ol-tgl", value: st.rentang.sampai, "aria-label": "Sampai tanggal"});
    el.rentang = h("div", {class: "ol-rentang", hidden: ""}, h("label", null, "Dari", el.dari), h("label", null, "Sampai", el.sampai));
    el.pesan = h("p", {class: "bn-pesan", role: "status"}); el.bawah = h("div", {class: "ol-bawah"}); el.dummy = h("div", {class: "ol-aksi"}); el.bandera = h("p", {class: "ol-dummy", hidden: "", teks: "DATA DUMMY ditampilkan, bukan laporan nyata."});
    el.kartu = h("div", {class: "bn-grid ol-nilai", hidden: ""});
    el.peta = h("div", {class: "ol-peta", role: "application", "aria-label": "Peta operasi udara"}); el.panel = h("aside", {class: "ol-panel", "aria-label": "Daftar base"}); el.kaki = h("p", {class: "ol-sumber ol-kaki-akhir"});
    el.dasar = h("div", {class: "ol-dasar", role: "group", "aria-label": "Peta dasar"}, h("button", {type: "button", "data-dasar": "citra", "aria-pressed": "true", teks: "Satelit"}), h("button", {type: "button", "data-dasar": "peta", "aria-pressed": "false", teks: "Peta"}));
    document.getElementById("kepala").replaceChildren(h("div", {class: "ol-kendali"}, el.tgl, el.rentang, el.seg), el.dummy);   // satu baris di bar atas (pemilik 3 Nov 2026)
    app.replaceChildren(el.pesan, el.bandera, el.kartu, el.tengah = h("div", {class: "ol-tengah"}, el.peta, el.dasar, el.panel), el.bawah, el.kaki);
    el.seg.addEventListener("change", e => { if (e.target.name === "segmen") { st.segmen = e.target.value; const n = st.segmen === "nilai"; el.rentang.hidden = !n; el.tgl.hidden = n; render(); } });   // radio sudah dicat peramban; render berat sesudah frame
    const gantiRentang = ubah => { const r = O.klampRentang(el.dari.value || st.rentang.dari, el.sampai.value || st.rentang.sampai, ubah);
      el.dari.value = r.dari; el.sampai.value = r.sampai; st.rentang = r; st.nilai = null; if (st.segmen === "nilai") render(); };   // chrome dicat dulu; fetch sesudah rAF di render
    el.dari.addEventListener("change", () => gantiRentang("dari")); el.sampai.addEventListener("change", () => gantiRentang("sampai"));
    el.tgl.addEventListener("change", () => { if (/^\d{4}-\d{2}-\d{2}$/.test(el.tgl.value)) { st.tanggal = el.tgl.value; st.base = null; muat(); } });
    el.dasar.addEventListener("click", e => { const b = e.target.closest("[data-dasar]"); if (!b) return; st.dasar = b.dataset.dasar;   // chrome dulu, lapisan sesudah frame
      for (const x of el.dasar.children) x.setAttribute("aria-pressed", String(x === b)); sesudahFrame(pasangCitra); });
    el.panel.addEventListener("click", e => { if (e.target.closest("[data-semua]")) return pilihBase(null);
      const r = e.target.closest("[data-base]"); if (r) pilihBase(r.dataset.base); });
  }
  function masuk(s) {
    document.getElementById("kepala").replaceChildren();
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk dulu"}), h("p", {teks: s === 403 ? "Akunmu belum berhak membuka halaman ini. Pakai akun centurisk97, atau akun staf Pusdalops, Koordalops, Pimpinan, Udara, dan TMC." : "Halaman operasi butuh akun. Masuk dulu."}),
      h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search), teks: "Masuk"})));
  }

  /* ---------- muat data ---------- */
  const muat = () => new Promise(selesai => {
    const n = ++nomor; tampil("Memuat…"); el.tgl.value = st.tanggal;
    sesudahFrame(async () => { try {
      const r = await api("GET", "/api/operasi/peta?tanggal=" + encodeURIComponent(st.tanggal)); if (n !== nomor) return;
      if (!r.ok) { if (r.s === 401 || r.s === 403) return masuk(r.s); st.data = null; el.bandera.hidden = true; el.tengah.hidden = true; el.kaki.textContent = ""; return tampil(galatTeks(r), false); }
      tampil(""); el.tengah.hidden = false; st.data = r.j; render();
    } finally { selesai(); } });
  });

  /* ---------- render ---------- */
  function render() {
    const n = ++nomor; if (!st.data) return;
    sesudahFrame(() => { if (n !== nomor) return;
      const d = O.saringSegmen(st.data, st.segmen), adaDummy = [st.data.armada, st.data.gerak, st.data.temuan].some(l => (l || []).some(x => x.dummy));
      el.bandera.hidden = !adaDummy; renderKartu(d); renderPeta(d); renderPanel(d);
      el.kaki.textContent = `Tanggal ${O.tanggalIndo(st.data.tanggal)}. Sumber: ${O.sumberTeks(st.data)}. Luas dari pilot hanya klaim pilot, bukan angka luas terbakar sistem. Tanpa jam tercatat dihitung di Pagi. Citra © Esri, Maxar, Earthstar.`;
    });
  }
  function renderKartu(d) {
    el.kartu.hidden = st.segmen !== "nilai"; if (st.segmen === "nilai") return renderNilai();
    el.bawah.replaceChildren(); el.kaki.hidden = false;
  }

  /* peta: citra satelit Esri (pola peta utama) di bawah label; penanda DOM jalan walau gaya dasar gagal dimuat */
  function pasangCitra() { if (!peta) return; el.peta.classList.toggle("gelap", st.dasar !== "peta"); try {   // gaya belum siap: dipasang lagi oleh style.load
    if (!peta.getSource("citra")) { const label = (peta.getStyle().layers || []).find(l => l.type === "symbol");
      peta.addSource("citra", {type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Citra © Esri, Maxar, Earthstar"});
      peta.addLayer({id: "citra", type: "raster", source: "citra"}, label && label.id); }
    peta.setLayoutProperty("citra", "visibility", st.dasar === "peta" ? "none" : "visible"); } catch (e) {} }
  function bersihPeta() { for (const m of lapis) m.remove(); lapis = []; }
  const popup = (m, teks) => { const p = new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 14, className: "ol-pop"});
    m.getElement().addEventListener("mouseenter", () => p.setLngLat(m.getLngLat()).setText(teks).addTo(peta)); m.getElement().addEventListener("mouseleave", () => p.remove()); };
  const titik = (lon, lat, node, teks, anchor) => { const m = new maplibregl.Marker({element: node, anchor: anchor || "center"}).setLngLat([lon, lat]).addTo(peta); lapis.push(m); popup(m, teks); node.setAttribute("title", teks); return m; };
  let batasSemua = null;
  function renderPeta(d) {
    if (!peta) { if (!window.maplibregl) { el.peta.replaceChildren(kosong("Peta tidak termuat.")); return; }
      peta = new maplibregl.Map({container: el.peta, style: "https://tiles.openfreemap.org/styles/positron", center: [112, -1.5], zoom: 4.5, minZoom: 3, maxZoom: 16, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
      peta.on("error", () => {});   // gaya dasar atau ubin citra gagal (offline): penanda tetap tampil
      peta.touchZoomRotate.disableRotation();
      peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right"); peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
      peta.on("style.load", pasangCitra); }
    bersihPeta(); const batas = new maplibregl.LngLatBounds(), tambah = (lon, lat) => batas.extend([lon, lat]);
    for (const b of st.data.base || []) {
      const ar = (st.data.armada || []).filter(a => a.base_id === b.id), node = h("div", {class: "ol-m ol-base" + (b.id === st.base ? " pilih" : ""), "data-base": b.id});
      const s = svg("svg", {viewBox: "0 0 24 24", "aria-hidden": "true"}); s.append(svg("circle", {cx: 12, cy: 12, r: 11, class: "tanah"}), svg("path", {d: "M6 17V10l6-4 6 4v7M10 17v-4h4v4", class: "garis"}));
      node.append(s, h("span", {class: "ol-nama", teks: b.icao || b.id}), h("div", {class: "ol-titik"}, ar.map(a => h("b", {class: O.kelasArmada(a.status)})))); tambah(b.lon, b.lat);
      const bs = O.ringkas({armada: ar});
      titik(b.lon, b.lat, node, `${b.nama} (${b.icao || b.id}): ${O.fmt(ar.length)} armada, ${O.fmt(bs.siap)} siap`, "top");
      node.addEventListener("click", () => pilihBase(b.id)); }
    for (const t of d.temuan || []) { const s = O.STATUS_TEMUAN[t.status] || O.STATUS_TEMUAN.clear; tambah(t.lon, t.lat);
      titik(t.lon, t.lat, ikonPeta(s.bentuk, s.kelas), [t.registrasi, s.nama, t.lokasi, O.klaimTeks(t)].filter(Boolean).join(", ")); }
    for (const x of d.gerak || []) if (x.lat != null && x.lon != null) { tambah(x.lon, x.lat);
      titik(x.lon, x.lat, ikonPeta("kotak", "ol-wb"), [x.registrasi, x.misi || "target", x.lokasi, x.jam_utc ? O.jamWIB(x.jam_utc) : ""].filter(Boolean).join(", ")); }
    batasSemua = batas.isEmpty() ? null : batas;
    const b0 = (st.data.base || []).find(x => x.id === st.base);
    if (b0) peta.jumpTo({center: [b0.lon, b0.lat], zoom: Math.max(peta.getZoom(), 6.5)}); else if (batasSemua) peta.fitBounds(batasSemua, {padding: lebarPanel(), maxZoom: 9, duration: 0});
    const garis = O.garisRujukan(d), cin = (st.data.base || []).map(b => { const nm = Math.max(0, ...(st.data.armada || []).filter(a => a.base_id === b.id).map(a => a.jelajah_nm || 0)); return nm ? {type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [O.cincin(b.lat, b.lon, nm)]}} : null; }).filter(Boolean);
    const lapisan = () => { try {
      const warna = "#7cc4ff", fc = f => ({type: "FeatureCollection", features: f});
      const ada = (id, jenis, data, paint) => { if (peta.getSource(id)) peta.getSource(id).setData(data); else { peta.addSource(id, {type: "geojson", data}); peta.addLayer({id, source: id, type: jenis, paint}); } };
      ada("ol-cincin", "line", fc(cin), {"line-color": warna, "line-width": 1.2, "line-dasharray": [2, 2], "line-opacity": .7});
      ada("ol-rujukan", "line", fc(garis.map(g => ({type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: [g.dari, g.ke]}}))), {"line-color": warna, "line-width": 2, "line-dasharray": [4, 2]});
    } catch (e) {} };
    peta.isStyleLoaded() ? lapisan() : peta.once("load", lapisan);
    peta.resize();
  }
  /* panel melayang menutup sisi kiri peta: padding kiri supaya base tidak tersembunyi di baliknya */
  const lebarPanel = () => { const w = el.panel.offsetParent && getComputedStyle(el.panel).position === "absolute" ? el.panel.offsetWidth + 40 : 40; return {top: 60, bottom: 50, right: 60, left: w}; };
  function pilihBase(id) {   // chrome dulu: sorot base dan baris langsung; panel dan kamera sesudah frame
    st.base = id; for (const n of el.peta.querySelectorAll(".ol-base")) n.classList.toggle("pilih", n.dataset.base === st.base);
    for (const n of el.panel.querySelectorAll(".ol-tb[data-base]")) n.classList.toggle("pilih", n.dataset.base === st.base);
    sesudahFrame(() => { renderPanel(O.saringSegmen(st.data, st.segmen)); if (st.segmen === "nilai") tampilNilai();
      const b = (st.data.base || []).find(x => x.id === id);
      if (peta && b) peta.easeTo({center: [b.lon, b.lat], zoom: Math.max(peta.getZoom(), 7), padding: lebarPanel(), duration: 500});
      else if (peta && batasSemua) peta.fitBounds(batasSemua, {padding: lebarPanel(), maxZoom: 9, duration: 500}); });
  }

  /* ---------- panel: daftar base (gaya tabel provinsi peta utama) atau rincian satu base ---------- */
  const ringkasBase = (d, b) => { const db = O.dataBase(d, b.id), r = O.ringkas({armada: db.armada, gerak: db.gerak, temuan: db.temuan});
    return {b, armada: r.armada, siap: r.siap, sortie: r.sortie, api: r.temuan.fs + r.temuan.berasap + r.temuan.berasap_tipis, clear: r.temuan.clear, lapor: r.siap + r.tidak}; };
  const statusBase = x => x.api ? ["Ada api", "ol-t-api"] : x.sortie ? ["Terbang", "ol-s-operasi"] : x.siap ? ["Siap", "ol-s-siap"] : x.lapor ? ["Tidak siap", "ol-s-tidak"] : ["Belum lapor", "ol-s-belum"];
  /* tautan Google Maps ke koordinat (tab baru, tanpa rujukan) */
  const gmaps = (lat, lon, teks) => h("a", {class: "ol-gmaps", href: `https://www.google.com/maps/search/?api=1&query=${(+lat).toFixed(5)},${(+lon).toFixed(5)}`, target: "_blank", rel: "noopener noreferrer", title: "Buka di Google Maps"}, ikon("pin"), teks);
  const sel = (t, kelas) => h("span", {class: kelas || "n", teks: t});
  function tabelBase(d) {
    const baris = (st.data.base || []).map(b => ringkasBase(d, b)).sort((a, b) => b.api - a.api || b.sortie - a.sortie || b.armada - a.armada || a.b.nama.localeCompare(b.b.nama));
    const jm = k => baris.reduce((a, x) => a + x[k], 0), nol = v => v ? O.fmt(v) : "–";
    return [h("div", {class: "ol-tb kepala"}, sel(""), sel("Base", ""), sel("Armada"), sel("Siap"), sel("Sortie"), sel("Api"), sel("Status")),
      h("div", {class: "ol-tb total"}, sel(""), sel("Grand total", ""), sel(O.fmt(jm("armada"))), sel(nol(jm("siap"))), sel(nol(jm("sortie"))), sel(nol(jm("api"))), sel("")),
      ...baris.map((x, i) => { const [st_, kl] = statusBase(x);
        return h("button", {type: "button", class: "ol-tb" + (x.b.id === st.base ? " pilih" : "") + (x.api ? " hl" : ""), "data-base": x.b.id, title: `${x.b.nama}, ${x.b.icao || x.b.id}`},
          sel(String(i + 1), "rk"), h("span", {class: "nm"}, h("b", {teks: x.b.nama}), h("small", {teks: [x.b.icao || x.b.id, x.b.iata && x.b.iata !== x.b.id ? x.b.iata : ""].filter(Boolean).join(", ")})),
          sel(O.fmt(x.armada)), sel(nol(x.siap)), sel(nol(x.sortie)), sel(nol(x.api)), h("span", {class: "st"}, pil(st_, kl))); })];
  }
  const kartuArmada = a => h("article", {class: "ol-ar"}, gambarArmada(a),
    h("div", {class: "ol-ar-isi"}, h("div", {class: "ol-ar-atas"}, h("b", {teks: a.registrasi}), pil(O.namaArmada(a.status), O.kelasArmada(a.status))),
      h("p", {class: "ol-ar-tipe", teks: a.tipe && !/tidak diketahui/i.test(a.tipe) ? a.tipe : "Tipe belum tercatat"}),
      h("p", {class: "ol-ar-meta", teks: [a.operator, a.bucket_liter ? `bucket ${O.fmt(a.bucket_liter)} L` : "", a.jelajah_nm ? `jelajah ${O.fmt(a.jelajah_nm)} NM` : ""].filter(Boolean).join(", ") || "Operator belum tercatat"}),
      a.alasan ? h("p", {class: "ol-ar-alasan", teks: a.alasan}) : null));
  function renderPanel(d) {
    const b = (st.data.base || []).find(x => x.id === st.base);
    if (st.segmen === "nilai") return el.panel.replaceChildren(h("h2", {class: "ol-judul"}, ikon("pin"), b ? `Disaring: ${b.nama}` : "Semua base"),
      kosong(b ? "Kartu dan tabel pesawat hanya untuk base ini." : "Klik sebuah base di peta untuk menyaring kartu dan tabel pesawat."), ...b ? [h("button", {class: "ad-tombol", type: "button", "data-semua": "1", teks: "Tampilkan semua base"})] : []);
    if (st.segmen === "renlap") { const rl = st.data.renlap || [];
      return el.panel.replaceChildren(h("h2", {class: "ol-judul"}, ikon("malam"), "Renlap malam"), rl.length ? tabel(["Base", "Versi", "Target"], rl.map(r => [r.base_id, r.versi, O.fmt((r.target || []).length)])) : kosong("Belum ada renlap untuk tanggal ini.")); }
    if (!b) return el.panel.replaceChildren(h("div", {class: "ol-panel-kepala"}, h("h2", {class: "ol-judul"}, ikon("pin"), "Base operasi udara"), h("p", {class: "ol-sumber", teks: "Klik base untuk melihat armadanya."})),
      (st.data.base || []).length ? h("div", {class: "ol-gulir-v", role: "list"}, tabelBase(d)) : kosong("Belum ada base."));
    const db = O.dataBase(d, b.id), semua = O.dataBase(st.data, b.id).armada.slice().sort((x, y) => (O.STATUS_ARMADA[y.status]?.siap ? 1 : 0) - (O.STATUS_ARMADA[x.status]?.siap ? 1 : 0) || x.registrasi.localeCompare(y.registrasi)), x = ringkasBase(d, b);
    el.panel.replaceChildren(h("div", {class: "ol-panel-kepala"}, h("button", {type: "button", class: "ol-kembali", "data-semua": "1"}, "‹ Semua base"),
        h("h2", {class: "ol-judul besar"}, gmaps(b.lat, b.lon, b.nama)), h("p", {class: "ol-sumber", teks: [b.icao, b.iata].filter(Boolean).join(", ")}),
        h("div", {class: "ol-mini"}, [["Armada", x.armada], ["Siap", x.siap], ["Sortie", x.sortie], ["Api", x.api]].map(([t, n]) => h("div", null, h("b", {teks: O.fmt(n)}), h("span", {teks: t}))))),
      h("div", {class: "ol-gulir-v"},
        h("h3", {class: "ol-sub", teks: `Armada (${O.fmt(semua.length)})`}), semua.length ? h("div", {class: "ol-ar-daftar"}, semua.map(kartuArmada)) : kosong("Belum ada armada tercatat di base ini."),
        h("h3", {class: "ol-sub", teks: "Gerak"}), db.gerak.length ? tabel(["Jam", "Armada", "Jenis", "Misi"], db.gerak.map(g => { const t = [g.misi, g.lokasi].filter(Boolean).join(", "); return [O.jamWIB(g.jam_utc), g.registrasi, g.jenis, g.lat != null && g.lon != null ? gmaps(g.lat, g.lon, t || "Lihat target") : t]; })) : kosong("Tidak ada gerak tercatat."),
        h("h3", {class: "ol-sub", teks: "Temuan"}), db.temuan.length ? tabel(["Armada", "Status", "Lokasi"], db.temuan.map(t => [t.registrasi, pil(O.STATUS_TEMUAN[t.status]?.nama || t.status, O.kelasTemuan(t.status)), gmaps(t.lat, t.lon, [t.lokasi, O.klaimTeks(t)].filter(Boolean).join(", ") || "Lihat lokasi")])) : kosong("Tidak ada temuan oleh armada base ini.")));
  }

  /* ---------- segmen Nilai: GET /api/operasi/nilai?dari=&sampai= ---------- */
  function renderNilai() {
    el.kaki.hidden = true; el.bandera.hidden = true;
    if (st.nilai) return tampilNilai();
    const n = ++nomorNilai, {dari, sampai} = st.rentang; tampil("Memuat nilai…"); el.kartu.replaceChildren(); el.bawah.replaceChildren();
    sesudahFrame(async () => { const r = await api("GET", `/api/operasi/nilai?dari=${dari}&sampai=${sampai}`);
      if (n !== nomorNilai || st.segmen !== "nilai") return;
      if (!r.ok) { st.nilai = null; return tampil(r.s === 400 ? "Rentang tanggal tidak sah." : galatTeks(r), false); }
      tampil(""); st.nilai = r.j; tampilNilai(); });
  }
  function tampilNilai() {
    const v = st.nilai; if (!v) return;
    const dummyAda = !!v.dummy; el.bandera.hidden = !dummyAda;
    const metrik = (st.base ? (v.base || {})[st.base] : v.semua) || {}, judul = st.base ? ((st.data.base || []).find(b => b.id === st.base) || {}).nama : "Semua base";
    el.kartu.className = "bn-grid ol-nilai";
    el.kartu.replaceChildren(...O.KODE_NILAI.map(k => { const m = O.METRIK[k], t = O.tampilMetrik(k, metrik[k]);
      return h("article", {class: "bn-kartu ol-kartu" + (t.kosong ? " ol-redup" : "")}, h("h2", null, ikon(m.ikon), m.nama), pil(k, "ol-s-belum"),
        t.kosong ? h("div", {class: "ol-angka-kosong", teks: t.pesan}) : h("div", {class: "bn-angka", teks: t.angka}), h("p", {class: "ol-sumber", teks: t.rincian || judul || ""})); }));
    const reg = O.registrasiBase(st.data.armada, st.base), armada = Object.fromEntries((st.data.armada || []).map(a => [a.registrasi, a.tipe]));
    const bagian = (ikn, teks, peta, label) => { const kunci = O.urutKunci(peta);
      return [h("h2", {class: "ol-judul"}, ikon(ikn), teks), kunci.length ? tabelNilai(peta, kunci, label) : kosong("Belum ada nilai untuk bagian ini.")]; };
    const namaBase = id => ((st.data.base || []).find(b => b.id === id) || {}).nama || id;
    el.bawah.replaceChildren(...bagian("pin", "Nilai per base", v.base || {}, k => namaBase(k)), ...bagian("personel", "Nilai per pesawat", O.saringPeta(v.registrasi || {}, reg), k => armada[k] ? `${k}, ${armada[k]}` : k));
    el.bawah.append(h("p", {class: "ol-sumber", teks: `Rentang ${O.tanggalIndo(v.dari)} sampai ${O.tanggalIndo(v.sampai)}, ${O.fmt(v.hari)} hari. Dihitung dari laporan WA satgas udara. Sel kosong berarti data kurang atau belum tersedia. Hijau terbaik, merah terendah di kolomnya.${v.galat_titik ? " Titik panas sistem tidak terbaca, padam bertahan tidak dinilai." : ""}`}));
  }
  const tabelNilai = (peta, kunci, label) => { const baris = O.tabelNilai(peta, kunci);
    return h("div", {class: "ol-gulir"}, h("table", {class: "ol-tabel ol-tabel-nilai"}, h("thead", null, h("tr", null, h("th", {teks: "Nama"}), O.KODE_TABEL.map(k => h("th", {title: O.METRIK[k].nama, teks: O.METRIK[k].pendek})))),
      h("tbody", null, baris.map(b => h("tr", null, h("td", {teks: label(b.kunci)}), b.sel.map(c => h("td", {class: "ol-nl" + (c.sorot ? " ol-" + c.sorot : ""), title: c.rincian}, h("b", {teks: c.teks}), c.n ? h("small", {teks: `n=${O.fmt(c.n)}`}) : null)))))));
  };
  const tabel = (kepala, baris) => h("div", {class: "ol-gulir"}, h("table", {class: "ol-tabel"}, h("thead", null, h("tr", null, kepala.map(t => h("th", {teks: t})))),
    h("tbody", null, baris.map(b => h("tr", null, b.map(c => h("td", {...(c instanceof Node ? {} : {teks: c == null ? "" : String(c)})}, c instanceof Node ? c : null)))))));

  /* ---------- dummy (Super Admin saja): isi dan hapus ---------- */
  async function dummy(aksi) {
    if (aksi === "hapus" && !confirm("Hapus semua data dummy operasi lapangan? Data asli tidak tersentuh.")) return;
    const tb = [...el.dummy.querySelectorAll("[data-dummy]")]; tb.forEach(x => { x.disabled = true; x.setAttribute("aria-busy", "true"); });
    try { const r = await api("POST", "/api/operasi/dummy", {aksi});
      if (!r.ok && !(aksi === "isi" && r.s === 409)) return tampil(r.s === 404 ? "Rute dummy belum ada di server." : galatTeks(r), false);
      if (aksi === "isi") st.tanggal = "2026-11-02";   // tanggal data dummy
      await muat(); tampil(aksi === "isi" ? (r.s === 409 ? "Data dummy sudah ada. Hapus dulu bila ingin mengisi ulang." : "Data dummy terisi.") : "Data dummy dihapus.", true);
    } finally { tb.forEach(x => { x.disabled = false; x.removeAttribute("aria-busy"); }); }
  }
  async function tombolDummy() {
    const r = await api("GET", "/api/akademisi/saya"); if (!r.ok || !r.j.super) return; st.super = true;
    el.dummy.append(h("button", {class: "ad-tombol ad-bulat", type: "button", "data-dummy": "isi", title: "Isi data dummy operasi lapangan", "aria-label": "Isi data dummy"}, "🧪"),
      h("button", {class: "ad-tombol ad-bulat", type: "button", "data-dummy": "hapus", title: "Hapus semua data dummy", "aria-label": "Hapus data dummy"}, "🧹"));
    el.dummy.addEventListener("click", e => { const b = e.target.closest("[data-dummy]"); if (b && !b.disabled) dummy(b.dataset.dummy); });
  }

  const ukurAtas = () => document.documentElement.style.setProperty("--tinggi-atas", (document.querySelector(".ad-top")?.offsetHeight || 56) + "px");
  kerangka(); ukurAtas(); addEventListener("resize", ukurAtas); muat(); tombolDummy();
})();
