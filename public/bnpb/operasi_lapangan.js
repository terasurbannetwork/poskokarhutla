/* Operasi (/bnpb/operasi-lapangan), OP-3: peta operasi udara harian dari GET /api/operasi/peta?tanggal= (src/operasi_udara.js).
   Spek: docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 9. Hitungan penyajian ada di operasi_lapangan_hitung.js (murni, diuji).
   INP: ganti tanggal/segmen/klik base langsung mengecat chrome; peta dan daftar berat sesudah dua rAF. Tanpa skrip/gaya inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {ikon, h} = window.Wilayah, O = window.OperasiLapangan, app = document.getElementById("app"), NS = "http://www.w3.org/2000/svg";
  const st = {tanggal: O.hariIniWIB(), segmen: "pagi", dasar: "citra", tab: "base", api: null, lapis: {hs: true, kl: true, cincin: true, prov: true, vis: false, citra: true, gambut: false, khg: false, konsesi: false}, base: null, data: null, super: false, ...{rentang: O.rentangBawaan()}, nilai: null};
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
  /* foto asli per registrasi (public/img/armada/<REG>.webp): dipotong dari deck Rakor Karhutla Kalteng dan Kalsel 19 Okt 2026 dan foto WA satgas 3 Nov 2026.
     Registrasi tanpa foto memakai siluet. Tambah foto = taruh berkas lalu tambah registrasinya di sini. */
  const FOTO = new Set(["HA-5234", "HA-5235", "N-814AR", "N261BE", "PK-DBM", "PK-FPU", "PK-RTQ", "PK-RTY", "PK-SNK", "PK-SNL", "RA-22747", "RA-22834", "RA-31021", "UR-CSM", "UR-CSN", "VH-HGM", "ZK-HKU"]);
  const gambarArmada = a => { if (FOTO.has(a.registrasi)) { const d = h("div", {class: `ol-foto asli ol-p-${a.peran || "lain"}`, title: a.tipe || ""});
      d.append(h("img", {src: `/img/armada/${a.registrasi}.webp`, alt: `${a.registrasi}, ${a.tipe || "armada"}`, loading: "lazy", decoding: "async", width: 118, height: 72}), h("span", {teks: PERAN[a.peran] || "Armada"})); return d; }
    const kel = KELUARGA(a.tipe), s = svg("svg", {viewBox: "0 0 120 56", "aria-hidden": "true"});
    for (const [tag, att] of SILUET[kel]) s.append(svg(tag, att));
    const d = h("div", {class: `ol-foto ol-p-${a.peran || "lain"}`, title: a.tipe || ""}); d.append(s, h("span", {teks: PERAN[a.peran] || "Armada"})); return d; };

  /* ---------- kegunaan armada: ikon kecil (water bombing = tetes, patroli = teropong, OMC = awan) ---------- */
  const GUNA = [["wb", "Water bombing", "M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z"], ["patroli", "Patroli", "M3 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM13 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM7 10l2-5h6l2 5M11 14h2"],
    ["omc", "OMC (modifikasi cuaca)", "M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18zM9 21l1-2M13 21l1-2"]];
  const ikonGuna = k => { const g = GUNA.find(x => x[0] === k), s = svg("svg", {viewBox: "0 0 24 24", "aria-hidden": "true", class: "ol-ig ol-g-" + k}); s.append(svg("path", {d: g[2]})); return s; };
  /* patroli_wb dihitung di dua kolom (bisa patroli dan water bombing) */
  const hitungGuna = ar => ({wb: ar.filter(a => a.peran === "wb" || a.peran === "patroli_wb").length, patroli: ar.filter(a => a.peran === "patroli" || a.peran === "patroli_wb").length, omc: ar.filter(a => a.peran === "omc").length});
  const lencanaGuna = (g, kelas) => h("div", {class: "ol-guna " + (kelas || "")}, GUNA.filter(([k]) => g[k]).map(([k, t]) => h("span", {title: t}, ikonGuna(k), h("b", {teks: O.fmt(g[k])}))));
  const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  /* sumber api (pola peta utama): cluster aktif dari /data/kluster_awal.json, titik panas 24 jam dari /data/hotspot24.json; dimuat malas sesudah peta tampil */
  const LV = {3: ["Prioritas", "ol-k-3"], 2: ["Siaga", "ol-k-2"], 1: ["Patroli", "ol-k-1"], 0: ["Rutin", "ol-k-0"]};
  const RADIUS_BAWAAN_KM = 200;   // ponytail: radius jangkau base bila jelajah armada tak tercatat; ganti per base bila ada data jelajah resmi
  const radiusBase = b => { const nm = Math.max(0, ...(st.data.armada || []).filter(a => a.base_id === b.id).map(a => a.jelajah_nm || 0)); return nm ? nm * 1.852 : RADIUS_BAWAAN_KM; };
  const apiDekat = b => !st.api ? [] : st.api.kl.map(k => ({...k, km: jarakKm(b.lat, b.lon, k.lat, k.lon)})).filter(k => k.km <= radiusBase(b)).sort((x, y) => y.level - x.level || y.px24 - x.px24);
  /* lapisan pilihan (pola panel Overlay peta utama): yang relevan untuk operasi udara saja. Berkas besar dimuat saat pertama dicentang. */
  /* ubin overlay: [kunci, nama pendek, nama lengkap, warna a, warna b, ikon] (UBIN/UBIN_IK peta utama index.html) */
  const UB_IK = {titik: "M7 8m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M16 7m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M11 15m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M18 16m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
    api: "M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.6.6-2.6 1.5-3.5.3 1.4 1 2 1.8 2.3C11 8 10.8 5.5 12 3z", pesawat: "M10 14 3 12l1-2 7 1 4-6h2l-2 7 5 1 1-2h2l-1 4 1 4h-2l-1-2-5 1 2 7h-2l-4-6-7 1-1-2z",
    mata: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", daun: "M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19 13 11",
    kanal: "M3 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2", pabrik: "M3 21V11l6 4v-4l6 4V5h6v16z",
    satelit: "M9 9h6v6H9zM3 3l5 5M16 16l5 5M9 12H3M21 12h-6M12 9V3M12 21v-6", peta: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"};
  const LAPIS_GRUP = [["Api & respons", [["hs", "Titik panas", "Titik panas 24 jam (NASA FIRMS)", "#2a1d17", "#ff8a3d", "titik"], ["kl", "Cluster", "Cluster api prioritas", "#5a1d1a", "#e0533b", "api"], ["cincin", "Jangkauan", "Jangkauan base (jelajah armada terjauh)", "#1d4e89", "#7fb2e5", "pesawat"]]],
    ["Cuaca", [["vis", "Jarak pandang", "Jarak pandang bandara, METAR BMKG/NOAA jam terakhir", "#0b2545", "#5f6fb0", "mata"]]],
    ["Lahan", [["gambut", "Gambut", "Lahan gambut (BBSDLP)", "#4a3426", "#a0764f", "daun"], ["khg", "KHG", "Kesatuan hidrologis gambut (BRGM PRIMS)", "#5a3a1c", "#c9a27a", "kanal"], ["konsesi", "Konsesi", "Konsesi sawit dan HTI (GFW, bukan bukti pelanggaran)", "#7a4bb0", "#e58a45", "pabrik"]]],
    ["Peta dasar", [["citra", "Satelit", "Citra satelit Esri World Imagery", "#13324d", "#4d8a5e", "satelit"], ["prov", "Provinsi", "Batas provinsi", "#f4c48a", "#d4572f", "peta"]]]];
  const LAPIS_ID = {hs: ["ol-hs"], kl: ["ol-kl", "ol-kl-n", "ol-kl-nt", "ol-kl-1"], cincin: ["ol-cincin"], vis: ["ol-vis", "ol-vis-lbl"], prov: ["ol-prov"], gambut: ["ol-gambut"], khg: ["ol-khg"], konsesi: ["ol-konsesi", "ol-konsesi-g"]};
  const cache = {};
  const ambilJson = async u => cache[u] ||= fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
  const BERKAS = {prov: "/geo/provinsi.json", gambut: "/data/lahan/gambut.geojson", khg: "/data/lahan/khg.geojson", konsesi: "/data/lahan/konsesi.geojson"};
  const bawahTitik = () => peta.getLayer("ol-hs") ? "ol-hs" : undefined;   // poligon di bawah titik dan cluster
  async function pasangBerkas(k) {
    if (peta.getSource("ol-" + k)) return;
    if (k === "vis") { const d = await ambilJson("/api/jarak-pandang").then(x => x || ambilJson("/udara/data/jarak_pandang.json")); if (!d || peta.getSource("ol-vis")) return;
      const f = (d.stasiun || []).map(s => { const j = (s.jam || []).filter(x => x.vis_m != null).pop(); return j ? {type: "Feature", geometry: {type: "Point", coordinates: [s.lon, s.lat]}, properties: {v: j.vis_m, t: `${(j.vis_m / 1000).toLocaleString("id-ID", {maximumFractionDigits: 1})} km${/FU|HZ/.test(j.wx || "") ? " asap" : ""}`}} : null; }).filter(Boolean);
      peta.addSource("ol-vis", {type: "geojson", data: {type: "FeatureCollection", features: f}});
      peta.addLayer({id: "ol-vis", type: "circle", source: "ol-vis", paint: {"circle-radius": 7, "circle-color": ["step", ["get", "v"], "#c9503a", 1500, "#e58a45", 5000, "#e9c46a", 8000, "#4fae7c"], "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
      peta.addLayer({id: "ol-vis-lbl", type: "symbol", source: "ol-vis", layout: {"text-field": ["get", "t"], "text-size": 11, "text-offset": [0, 1.4], "text-anchor": "top", "text-font": ["Noto Sans Bold"]}, paint: {"text-color": "#fff", "text-halo-color": "#0b2545", "text-halo-width": 1.6}}); return; }
    const d = await ambilJson(BERKAS[k]); if (!d || peta.getSource("ol-" + k)) return;
    peta.addSource("ol-" + k, {type: "geojson", data: d});
    if (k === "prov") peta.addLayer({id: "ol-prov", type: "line", source: "ol-prov", paint: {"line-color": "#e6eefa", "line-width": 1, "line-opacity": .55}}, bawahTitik());
    if (k === "gambut") peta.addLayer({id: "ol-gambut", type: "fill", source: "ol-gambut", paint: {"fill-color": "#6b4a2b", "fill-opacity": .4}}, bawahTitik());
    if (k === "khg") peta.addLayer({id: "ol-khg", type: "line", source: "ol-khg", paint: {"line-color": "#f2c879", "line-width": 1.4, "line-dasharray": [3, 2]}}, bawahTitik());
    if (k === "konsesi") { peta.addLayer({id: "ol-konsesi", type: "fill", source: "ol-konsesi", paint: {"fill-color": ["match", ["get", "jenis"], "sawit", "#d9a441", "#7fb069"], "fill-opacity": .22}}, bawahTitik());
      peta.addLayer({id: "ol-konsesi-g", type: "line", source: "ol-konsesi", paint: {"line-color": ["match", ["get", "jenis"], "sawit", "#d9a441", "#7fb069"], "line-width": .8}}, bawahTitik()); }
  }
  async function terapkanLapis(k) { if (!peta) return;
    try { if (st.lapis[k] && (BERKAS[k] || k === "vis")) await pasangBerkas(k);
      for (const id of LAPIS_ID[k] || []) if (peta.getLayer(id)) peta.setLayoutProperty(id, "visibility", st.lapis[k] ? "visible" : "none"); } catch (e) {} }
  const terapkanSemua = () => { for (const k of Object.keys(LAPIS_ID)) terapkanLapis(k); };
  let muatApiJanji = null;
  const muatApi = () => muatApiJanji ||= Promise.all([fetch("/data/kluster_awal.json").then(r => r.ok ? r.json() : fetch("/data/kluster.json").then(x => x.json())), fetch("/data/hotspot24.json").then(r => r.ok ? r.json() : null).catch(() => null)])
    .then(([kl, hs]) => { st.api = {kl: (kl.features || []).map(f => f.properties).filter(p => (p.px24 || 0) > 0 && p.lat != null).map(p => ({id: p.id, lat: p.lat, lon: p.lon, level: p.level || 0, px24: p.px24, hari: p.hari, prov: p.prov, kab: p.kab, kec: p.kec, gambut: p.gambut, luas: p.luas})),
      titik: hs ? (hs.baris || []).map(b => [b[1], b[0], b[2]]) : []};
      st.api.acuan = hs && hs.acuan; if (st.data) render(); })
    .catch(() => { muatApiJanji = null; });

  /* legenda (pola #legenda peta utama): kartu putih, judul LEGENDA, hanya bagian lapisan yang menyala */
  function renderLegenda() {
    const L = (node, t) => h("span", null, node, t), dot = (bg, b) => { const i = h("i", {class: "sw"}); i.style.background = bg; if (b) i.style.border = b; return i; };
    const baseIk = () => { const s_ = svg("svg", {viewBox: "0 0 24 24", "aria-hidden": "true", class: "ol-lg-base"}); s_.append(svg("circle", {cx: 12, cy: 12, r: 11, class: "tanah"}), svg("path", {d: "M6 17V10l6-4 6 4v7M10 17v-4h4v4", class: "garis"})); return s_; };
    const g = (judul, ...isi) => h("div", {class: "lg-g"}, h("div", {class: "lbl", teks: judul}), h("div", {class: "leg"}, isi));
    const prioIk = () => { const i = dot("#c9503a", "2px solid #fff"); i.classList.add("angka"); i.textContent = "2"; return i; };
    el.legenda.replaceChildren(h("summary", {class: "lbl"}, "Legenda ", h("span", {teks: "▾"})), h("div", {class: "lg-isi"},
      g("Base dan kegunaan armada", L(baseIk(), "Base (kode ICAO)"), ...GUNA.map(([k, t]) => L(ikonGuna(k), k === "omc" ? "OMC (modifikasi cuaca)" : t))),
      g("Laporan pilot", L(ikonPeta("segitiga", "ol-t-api"), "Temuan api"), L(ikonPeta("lingkaran", "ol-t-clear"), "Clear"), L(ikonPeta("kotak", "ol-wb"), "Target water bombing")),
      st.lapis.hs ? g("Umur titik panas", L(dot("#fff4a8", "1px solid #4a1209"), "< 6 jam"), L(dot("#ecaa4f"), "6–24 jam"), L(dot("#d4643c"), "1–3 hari"), L(dot("#93352c"), "> 3 hari")) : null,
      st.lapis.kl ? g("Status cluster", L(prioIk(), "Cluster prioritas (angka = jumlah cluster)")) : null,
      st.lapis.vis ? g("Jarak pandang bandara", L(dot("#c9503a"), "< 1,5 km"), L(dot("#e58a45"), "1,5–5 km"), L(dot("#e9c46a"), "5–8 km"), L(dot("#4fae7c"), "≥ 8 km")) : null));
  }

  /* ---------- kerangka: kepala navy (pola Direktori), peta citra lebar + panel melayang ---------- */
  function kerangka() {
    el.tgl = h("input", {type: "date", class: "ol-tgl", value: st.tanggal, "aria-label": "Tanggal operasi"});
    el.seg = h("div", {class: "ol-seg", role: "radiogroup", "aria-label": "Waktu"}, O.SEGMEN.map(([v, t, ik]) => h("label", null, h("input", {type: "radio", name: "segmen", value: v, ...(v === st.segmen ? {checked: ""} : {})}), ikon(ik), t)));
    el.dari = h("input", {type: "date", class: "ol-tgl", value: st.rentang.dari, "aria-label": "Dari tanggal"}); el.sampai = h("input", {type: "date", class: "ol-tgl", value: st.rentang.sampai, "aria-label": "Sampai tanggal"});
    el.rentang = h("div", {class: "ol-rentang", hidden: ""}, h("label", null, "Dari", el.dari), h("label", null, "Sampai", el.sampai));
    el.pesan = h("p", {class: "bn-pesan", role: "status"}); el.bawah = h("div", {class: "ol-bawah"}); el.dummy = h("div", {class: "ol-aksi"}); el.bandera = h("p", {class: "ol-dummy", hidden: "", teks: "DATA DUMMY ditampilkan, bukan laporan nyata."});
    el.kartu = h("div", {class: "bn-grid ol-nilai", hidden: ""});
    el.peta = h("div", {class: "ol-peta", role: "application", "aria-label": "Peta operasi udara"}); el.panel = h("aside", {class: "ol-panel", "aria-label": "Daftar base"}); el.tarik = h("div", {class: "ol-tarik", role: "separator", "aria-orientation": "vertical", "aria-label": "Geser lebar panel", tabindex: "0"}); el.kaki = h("p", {class: "ol-sumber ol-kaki-akhir"});
    const ubin = ([k, pendek, lengkap, a, b, ik]) => { const s_ = svg("svg", {viewBox: "0 0 24 24", "aria-hidden": "true"}); s_.append(svg("path", {d: UB_IK[ik]}));
      const th = h("i", {class: "ub-th"}); th.style.setProperty("--a", a); th.style.setProperty("--b", b); th.append(s_);
      return h("label", {class: "ubin", title: lengkap}, h("input", {type: "checkbox", "data-lapis": k, ...(st.lapis[k] ? {checked: ""} : {})}), th, h("span", {teks: pendek})); };
    el.lapisKartu = h("div", {class: "ol-overlay"}, h("div", {class: "ol-ov-hd", teks: "Overlay"}), LAPIS_GRUP.map(([g, isi]) => h("details", {open: ""}, h("summary", {teks: g}), h("div", {class: "ub-gr"}, isi.map(ubin)))));
    el.dasar = h("div", {class: "ol-kanan"}, el.lapisKartu);
    el.lapisKartu.addEventListener("change", e => { const k = e.target.dataset.lapis; if (!k) return; st.lapis[k] = e.target.checked;   // ubin dicat dulu, lapisan sesudah frame
      if (k === "citra") { st.dasar = e.target.checked ? "citra" : "peta"; return sesudahFrame(pasangCitra); } sesudahFrame(() => { terapkanLapis(k); renderLegenda(); }); });
    el.chip = h("div", {class: "ol-chip", "aria-label": "Ringkasan hari ini"});
    document.getElementById("kepala").replaceChildren(h("div", {class: "ol-kendali"}, el.tgl, el.rentang, el.seg), el.chip, el.dummy);   // satu baris di bar atas (pemilik 3 Nov 2026)
    el.legenda = h("details", {class: "ol-legenda", open: ""});
    app.replaceChildren(el.pesan, el.bandera, el.kartu, el.tengah = h("div", {class: "ol-tengah"}, el.peta, el.dasar, el.panel, el.tarik, el.legenda), el.bawah, el.kaki);
    el.seg.addEventListener("change", e => { if (e.target.name === "segmen") { st.segmen = e.target.value; const n = st.segmen === "nilai"; el.rentang.hidden = !n; el.tgl.hidden = n; render(); } });   // radio sudah dicat peramban; render berat sesudah frame
    const gantiRentang = ubah => { const r = O.klampRentang(el.dari.value || st.rentang.dari, el.sampai.value || st.rentang.sampai, ubah);
      el.dari.value = r.dari; el.sampai.value = r.sampai; st.rentang = r; st.nilai = null; if (st.segmen === "nilai") render(); };   // chrome dicat dulu; fetch sesudah rAF di render
    el.dari.addEventListener("change", () => gantiRentang("dari")); el.sampai.addEventListener("change", () => gantiRentang("sampai"));
    el.tgl.addEventListener("change", () => { if (/^\d{4}-\d{2}-\d{2}$/.test(el.tgl.value)) { st.tanggal = el.tgl.value; st.base = null; muat(); } });

    el.panel.addEventListener("click", e => { if (e.target.closest("[data-semua]")) return pilihBase(null);
      const t = e.target.closest("[data-tab]"); if (t) { st.tab = t.dataset.tab; for (const x of t.parentNode.children) x.setAttribute("aria-pressed", String(x === t)); return sesudahFrame(() => renderPanel(O.saringSegmen(st.data, st.segmen))); }
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
    /* ringkasan di sisi kanan bar atas (pola chip El Nino / Data di peta utama) */
    const r = O.ringkas(d), api_ = r.temuan.fs + r.temuan.berasap + r.temuan.berasap_tipis, pr = st.api ? st.api.kl.filter(k => k.level >= 3).length : null;
    const c = (ik, n, t, kelas) => h("span", {class: "ol-c " + (kelas || ""), title: t}, ikon(ik), h("b", {teks: n}), h("small", {teks: t}));
    el.chip.replaceChildren(c("personel", `${O.fmt(r.siap)}/${O.fmt(r.armada)}`, "armada siap"), c("lanjut", O.fmt(r.sortie), "sortie"), c("peringatan", O.fmt(api_), "temuan api", api_ ? "merah" : ""),
      c("karhutla", pr == null ? "…" : O.fmt(pr), "cluster prioritas", pr ? "merah" : ""));
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
  /* kartu hover base: dibangun saat kursor masuk (bukan saat render), satu popup bersama */
  let popHover = null;
  const hover = (m, isi) => { const el_ = m.getElement();
    el_.addEventListener("mouseenter", () => { popHover ||= new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 18, className: "ol-pop ol-pop-kartu", maxWidth: "320px"});
      popHover.setLngLat(m.getLngLat()).setDOMContent(isi()).addTo(peta); });
    el_.addEventListener("mouseleave", () => popHover && popHover.remove()); };
  function kartuHover(b, ar) {
    const g = hitungGuna(ar), r = O.ringkas({armada: ar}), dk = apiDekat(b), pr = dk.filter(k => k.level >= 3).length, sg = dk.filter(k => k.level === 2).length;
    const urut = ar.slice().sort((x, y) => (x.peran || "").localeCompare(y.peran || "") || x.registrasi.localeCompare(y.registrasi));
    return h("div", {class: "ol-hv"}, h("div", {class: "ol-hv-kepala"}, h("b", {teks: b.nama}), h("span", {teks: b.icao || b.id})),
      h("div", {class: "ol-hv-guna"}, GUNA.map(([k, t]) => h("div", {class: g[k] ? "" : "nol"}, ikonGuna(k), h("b", {teks: O.fmt(g[k])}), h("span", {teks: k === "omc" ? "OMC" : t})))),
      h("ul", {class: "ol-hv-ar"}, urut.slice(0, 8).map(a => h("li", null, h("i", {class: O.kelasArmada(a.status)}), h("b", {teks: a.registrasi}), h("span", {teks: a.tipe && !/tidak diketahui/i.test(a.tipe) ? a.tipe : ""})))),
      urut.length > 8 ? h("p", {class: "ol-hv-lagi", teks: `+${O.fmt(urut.length - 8)} armada lain`}) : null,
      h("div", {class: "ol-hv-kaki"}, h("span", {teks: `${O.fmt(r.siap)} siap dari ${O.fmt(ar.length)}`}),
        st.api ? h("span", {class: pr ? "merah" : "", teks: `${O.fmt(pr)} prioritas, ${O.fmt(sg)} siaga ≤ ${O.fmt(Math.round(radiusBase(b)))} km`}) : null),
      h("p", {class: "ol-hv-klik", teks: "Klik untuk rincian armada"}));
  }
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
      node.append(s, h("span", {class: "ol-nama", teks: b.icao || b.id}), lencanaGuna(hitungGuna(ar), "peta")); tambah(b.lon, b.lat);
      const m = new maplibregl.Marker({element: node, anchor: "top"}).setLngLat([b.lon, b.lat]).addTo(peta); lapis.push(m); node.setAttribute("aria-label", b.nama);
      hover(m, () => kartuHover(b, ar));
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
      if (st.api) {
        /* gaya sama persis dengan peta utama (index.html Peta.pasang): titik = umur jam (kuning baru, merah tua lama); cluster = prioritas saja, digabung saat zoom jauh */
        const dari = st.api.acuan ? (Date.now() - Date.parse(st.api.acuan)) / 36e5 : 0;
        ada("ol-hs", "circle", fc(st.api.titik.map(c => ({type: "Feature", properties: {u: dari - (c[2] || 0)}, geometry: {type: "Point", coordinates: [c[0], c[1]]}}))),
          {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 1.1, 7, 2.2, 12, 6], "circle-color": ["step", ["get", "u"], "#fff4a8", 6, "#ecaa4f", 24, "#d4643c", 72, "#93352c"],
            "circle-stroke-color": "#4a1209", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 4, 0, 9, .6], "circle-opacity": ["interpolate", ["linear"], ["zoom"], 4, .7, 8, .95]});
        if (!peta.getSource("ol-kl")) { peta.addSource("ol-kl", {type: "geojson", data: fc(st.api.kl.filter(k => k.level >= 3).map(k => ({type: "Feature", properties: k, geometry: {type: "Point", coordinates: [k.lon, k.lat]}}))), cluster: true, clusterRadius: 38, clusterMaxZoom: 7});
          peta.addLayer({id: "ol-kl-n", type: "circle", source: "ol-kl", filter: ["has", "point_count"], paint: {"circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 13, 10, 18, 40, 26], "circle-color": "#c9503a", "circle-opacity": .92, "circle-stroke-color": "#fff", "circle-stroke-width": 2.2}});
          peta.addLayer({id: "ol-kl-nt", type: "symbol", source: "ol-kl", filter: ["has", "point_count"], layout: {"text-field": ["to-string", ["get", "point_count"]], "text-size": 12.5, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true}, paint: {"text-color": "#fff"}});
          peta.addLayer({id: "ol-kl", type: "circle", source: "ol-kl", filter: ["!", ["has", "point_count"]], paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["interpolate", ["linear"], ["get", "px24"], 15, 6, 150, 10], 9, ["interpolate", ["linear"], ["get", "px24"], 15, 9, 150, 15]], "circle-color": "#c9503a", "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
          peta.addLayer({id: "ol-kl-1", type: "symbol", source: "ol-kl", filter: ["!", ["has", "point_count"]], layout: {"text-field": "1", "text-size": 10, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true, "text-ignore-placement": true}, paint: {"text-color": "#fff"}});
          peta.on("click", "ol-kl-n", e => peta.easeTo({center: e.features[0].geometry.coordinates, zoom: peta.getZoom() + 2})); }
        if (!peta._olKl) { peta._olKl = true; const pk = new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 10, className: "ol-pop"});
          peta.on("mouseenter", "ol-kl", e => { peta.getCanvas().style.cursor = "pointer"; const k = e.features[0].properties;
            pk.setLngLat(e.lngLat).setText(`Cluster ${k.id} (${LV[k.level]?.[0] || ""}): ${k.kab}, ${k.kec}. ${O.fmt(k.px24)} piksel 24 jam, ${O.fmt(k.hari)} hari${k.gambut === true || k.gambut === "true" ? ", gambut" : ""}`).addTo(peta); });
          peta.on("mouseleave", "ol-kl", () => { peta.getCanvas().style.cursor = ""; pk.remove(); });
          peta.on("click", "ol-kl", e => { const k = e.features[0].properties; open(`https://www.google.com/maps/search/?api=1&query=${(+k.lat).toFixed(5)},${(+k.lon).toFixed(5)}`, "_blank", "noopener"); }); }
      }
      ada("ol-rujukan", "line", fc(garis.map(g => ({type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: [g.dari, g.ke]}}))), {"line-color": warna, "line-width": 2, "line-dasharray": [4, 2]});
    } catch (e) {} };
    const semua = () => { lapisan(); terapkanSemua(); };
    peta.isStyleLoaded() ? semua() : peta.once("load", semua);
    peta.resize(); muatApi();
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
    return {b, guna: hitungGuna(db.armada), dekat: apiDekat(b), armada: r.armada, siap: r.siap, sortie: r.sortie, api: r.temuan.fs + r.temuan.berasap + r.temuan.berasap_tipis, clear: r.temuan.clear, lapor: r.siap + r.tidak}; };
  const statusBase = x => x.api ? ["Ada api", "ol-t-api"] : x.sortie ? ["Terbang", "ol-s-operasi"] : x.siap ? ["Siap", "ol-s-siap"] : x.lapor ? ["Tidak siap", "ol-s-tidak"] : ["Belum lapor", "ol-s-belum"];
  /* tautan Google Maps ke koordinat (tab baru, tanpa rujukan) */
  const gmaps = (lat, lon, teks) => h("a", {class: "ol-gmaps", href: `https://www.google.com/maps/search/?api=1&query=${(+lat).toFixed(5)},${(+lon).toFixed(5)}`, target: "_blank", rel: "noopener noreferrer", title: "Buka di Google Maps"}, ikon("pin"), teks);
  const sel = (t, kelas) => h("span", {class: kelas || "n", teks: t});
  function tabelBase(d) {
    const baris = (st.data.base || []).map(b => ringkasBase(d, b)).sort((a, b) => b.api - a.api || b.sortie - a.sortie || b.armada - a.armada || a.b.nama.localeCompare(b.b.nama));
    const jm = k => baris.reduce((a, x) => a + x[k], 0), jg = k => baris.reduce((a, x) => a + x.guna[k], 0), nol = v => v ? O.fmt(v) : "–";
    const kp = k => h("span", {class: "n", title: GUNA.find(x => x[0] === k)[1]}, ikonGuna(k));
    const prio = x => x.dekat.filter(k => k.level >= 3).length;
    return [h("div", {class: "ol-tb kepala"}, sel(""), sel("Base", ""), kp("wb"), kp("patroli"), kp("omc"), sel("Siap"), h("span", {class: "n", title: "Cluster api prioritas dalam jangkauan base"}, "Prio"), sel("Status")),
      h("div", {class: "ol-tb total"}, sel(""), sel("Grand total", ""), sel(nol(jg("wb"))), sel(nol(jg("patroli"))), sel(nol(jg("omc"))), sel(nol(jm("siap"))), sel(st.api ? "" : "…"), sel("")),
      ...baris.map((x, i) => { const [st_, kl] = statusBase(x);
        return h("button", {type: "button", class: "ol-tb" + (x.b.id === st.base ? " pilih" : "") + (x.api ? " hl" : ""), "data-base": x.b.id, title: `${x.b.nama}, ${x.b.icao || x.b.id}`},
          sel(String(i + 1), "rk"), h("span", {class: "nm"}, h("b", {teks: x.b.nama}), h("small", {teks: [x.b.icao || x.b.id, x.b.iata && x.b.iata !== x.b.id ? x.b.iata : ""].filter(Boolean).join(", ")})),
          sel(nol(x.guna.wb)), sel(nol(x.guna.patroli)), sel(nol(x.guna.omc)), sel(nol(x.siap)), sel(st.api ? nol(prio(x)) : "…", prio(x) ? "n merah" : "n"), h("span", {class: "st"}, pil(st_, kl))); })];
  }
  const kartuArmada = a => h("article", {class: "ol-ar"}, gambarArmada(a),
    h("div", {class: "ol-ar-isi"}, h("div", {class: "ol-ar-atas"}, h("b", {teks: a.registrasi}), pil(O.namaArmada(a.status), O.kelasArmada(a.status))),
      h("p", {class: "ol-ar-tipe", teks: a.tipe && !/tidak diketahui/i.test(a.tipe) ? a.tipe : "Tipe belum tercatat"}),
      h("p", {class: "ol-ar-meta", teks: [a.operator, a.bucket_liter ? `bucket ${O.fmt(a.bucket_liter)} L` : "", a.jelajah_nm ? `jelajah ${O.fmt(a.jelajah_nm)} NM` : ""].filter(Boolean).join(", ") || "Operator belum tercatat"}),
      a.alasan ? h("p", {class: "ol-ar-alasan", teks: a.alasan}) : null));
  /* baris cluster: status, lokasi (Google Maps), piksel 24 jam, umur, jarak dari base */
  const baisKluster = k => h("div", {class: "ol-kl"}, pil(LV[k.level][0], LV[k.level][1]), h("div", {class: "ol-kl-isi"}, gmaps(k.lat, k.lon, `${k.kab}, ${k.kec}`),
    h("small", {teks: [`${k.id}`, `${O.fmt(k.px24)} piksel 24 jam`, `${O.fmt(k.hari)} hari`, k.gambut === true ? "gambut" : "", k.km != null ? `${O.fmt(Math.round(k.km))} km dari base` : ""].filter(Boolean).join(", ")})));
  function daftarApi() {
    if (!st.api) return [kosong("Memuat sumber api…")];
    const per = new Map(); for (const k of st.api.kl) { const a = per.get(k.prov) || {prov: k.prov, n: 0, px: 0, hari: 0, p3: 0, p2: 0, kl: []}; a.n++; a.px += k.px24 || 0; a.hari = Math.max(a.hari, k.hari || 0); if (k.level >= 3) a.p3++; else if (k.level === 2) a.p2++; a.kl.push(k); per.set(k.prov, a); }
    const baris = [...per.values()].sort((x, y) => y.p3 - x.p3 || y.px - x.px);
    if (!baris.length) return [kosong("Tidak ada cluster api aktif 24 jam terakhir.")];
    const pr = st.api.kl.filter(k => k.level >= 3).sort((x, y) => y.px24 - x.px24);
    return [pr.length ? h("div", {class: "ol-prio"}, h("h3", {class: "ol-sub", teks: `Prioritas pemadaman (${O.fmt(pr.length)})`}), ...pr.slice(0, 8).map(k => { const bs = (st.data.base || []).map(b => ({b, km: jarakKm(b.lat, b.lon, k.lat, k.lon)})).sort((x, y) => x.km - y.km)[0];
        return baisKluster({...k, km: undefined, kab: `${k.kab}${bs ? ` (base terdekat ${bs.b.icao || bs.b.id}, ${O.fmt(Math.round(bs.km))} km)` : ""}`}); })) : null,
      h("div", {class: "ol-tb kepala api"}, sel(""), sel("Provinsi", ""), sel("Cluster"), sel("Piksel 24j"), sel("Hari"), sel("Status")),
      ...baris.map((a, i) => h("details", {class: "ol-prov"}, h("summary", {class: "ol-tb api"}, sel(String(i + 1), "rk"), h("span", {class: "nm"}, h("b", {teks: window.Wilayah.PROV[a.prov] || a.prov})),
          sel(O.fmt(a.n)), sel(O.fmt(a.px)), sel(O.fmt(a.hari)), h("span", {class: "st"}, a.p3 ? pil(`${O.fmt(a.p3)} prioritas`, "ol-k-3") : a.p2 ? pil(`${O.fmt(a.p2)} siaga`, "ol-k-2") : pil("Awal", "ol-k-1"))),
        h("div", {class: "ol-kl-daftar"}, a.kl.slice().sort((x, y) => y.level - x.level || y.px24 - x.px24).slice(0, 10).map(baisKluster))))];
  }
  /* jejak navigasi pola peta utama: "Indonesia" = kembali ke semua base */
  const jejak = b => h("nav", {class: "ol-jejak", "aria-label": "Jejak"}, b ? h("button", {type: "button", "data-semua": "1"}, ikon("pin"), "Indonesia") : h("span", {class: "kini"}, ikon("pin"), "Indonesia"),
    b ? h("span", {class: "pisah", teks: "›"}) : null, b ? h("span", {class: "kini", teks: b.nama}) : null);
  function renderPanel(d) {
    const b = (st.data.base || []).find(x => x.id === st.base);
    if (st.segmen === "nilai") return el.panel.replaceChildren(h("h2", {class: "ol-judul"}, ikon("pin"), b ? `Disaring: ${b.nama}` : "Semua base"),
      kosong(b ? "Kartu dan tabel pesawat hanya untuk base ini." : "Klik sebuah base di peta untuk menyaring kartu dan tabel pesawat."), ...b ? [h("button", {class: "ad-tombol", type: "button", "data-semua": "1", teks: "Tampilkan semua base"})] : []);
    if (st.segmen === "renlap") { const rl = st.data.renlap || [];
      return el.panel.replaceChildren(h("h2", {class: "ol-judul"}, ikon("malam"), "Renlap malam"), rl.length ? tabel(["Base", "Versi", "Target"], rl.map(r => [r.base_id, r.versi, O.fmt((r.target || []).length)])) : kosong("Belum ada renlap untuk tanggal ini.")); }
    if (!b) { const tab = h("div", {class: "ol-tab", role: "group", "aria-label": "Daftar"}, [["base", "Base operasi udara"], ["api", "Sumber api"]].map(([v, t]) => h("button", {type: "button", "data-tab": v, "aria-pressed": String(st.tab === v), teks: t})));
      return el.panel.replaceChildren(h("div", {class: "ol-panel-kepala"}, jejak(null), tab, h("p", {class: "ol-sumber", teks: st.tab === "api" ? "Cluster api aktif 24 jam per provinsi (sama dengan peta utama). Buka provinsi untuk daftar cluster prioritas." : "Klik base untuk melihat armadanya. Prio = cluster api prioritas dalam jangkauan base."})),
        st.tab === "api" ? h("div", {class: "ol-gulir-v"}, daftarApi()) : (st.data.base || []).length ? h("div", {class: "ol-gulir-v", role: "list"}, tabelBase(d)) : kosong("Belum ada base.")); }
    const db = O.dataBase(d, b.id), semua = O.dataBase(st.data, b.id).armada.slice().sort((x, y) => (O.STATUS_ARMADA[y.status]?.siap ? 1 : 0) - (O.STATUS_ARMADA[x.status]?.siap ? 1 : 0) || x.registrasi.localeCompare(y.registrasi)), x = ringkasBase(d, b);
    el.panel.replaceChildren(h("div", {class: "ol-panel-kepala"}, jejak(b),
        h("h2", {class: "ol-judul besar"}, gmaps(b.lat, b.lon, b.nama)), h("p", {class: "ol-sumber", teks: [b.icao, b.iata].filter(Boolean).join(", ")}),
        h("div", {class: "ol-mini"}, [["Armada", x.armada], ["Siap", x.siap], ["Sortie", x.sortie], ["Api", x.api]].map(([t, n]) => h("div", null, h("b", {teks: O.fmt(n)}), h("span", {teks: t}))))),
      h("div", {class: "ol-gulir-v"},
        h("h3", {class: "ol-sub", teks: `Armada (${O.fmt(semua.length)})`}), semua.length ? h("div", {class: "ol-ar-daftar"}, semua.map(kartuArmada)) : kosong("Belum ada armada tercatat di base ini."),
        h("h3", {class: "ol-sub", teks: `Sumber api dalam ${O.fmt(Math.round(radiusBase(b)))} km`}), st.api ? (x.dekat.filter(k => k.level >= 2).length ? h("div", {class: "ol-kl-daftar"}, x.dekat.filter(k => k.level >= 2).slice(0, 12).map(baisKluster)) : kosong("Tidak ada cluster siaga atau prioritas di jangkauan base ini.")) : kosong("Memuat sumber api…"),
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

  /* panel bisa ditarik lebarnya (pola .tarik peta utama; pemilik 3 Nov 2026: semua sidebar wajib bisa ditarik). Lebar diingat per peramban. */
  const KUNCI_LEBAR = "ol_lebar_panel", setLebar = w => { w = Math.max(320, Math.min(w, Math.round(innerWidth * .6))); el.tengah.style.setProperty("--lebar-panel", w + "px"); return w; };
  function pasangTarik() {
    try { const w = +localStorage.getItem(KUNCI_LEBAR); if (w) setLebar(w); } catch (e) {}
    let x0 = 0, w0 = 0, w = 0;
    const gerak = e => { w = setLebar(w0 + e.clientX - x0); }, lepas = () => { el.tarik.classList.remove("aktif"); removeEventListener("pointermove", gerak); removeEventListener("pointerup", lepas);
      try { localStorage.setItem(KUNCI_LEBAR, String(w)); } catch (e) {} if (peta) peta.resize(); };
    el.tarik.addEventListener("pointerdown", e => { e.preventDefault(); x0 = e.clientX; w0 = w = el.panel.offsetWidth; el.tarik.classList.add("aktif"); addEventListener("pointermove", gerak); addEventListener("pointerup", lepas); });
    el.tarik.addEventListener("keydown", e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); w = setLebar(el.panel.offsetWidth + (e.key === "ArrowRight" ? 24 : -24)); try { localStorage.setItem(KUNCI_LEBAR, String(w)); } catch (x) {} });
  }
  const ukurAtas = () => document.documentElement.style.setProperty("--tinggi-atas", (document.querySelector(".ad-top")?.offsetHeight || 56) + "px");
  kerangka(); renderLegenda(); pasangTarik(); ukurAtas(); addEventListener("resize", ukurAtas); muat(); tombolDummy();
})();
