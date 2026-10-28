/* Cari: perluasan kotak cari peta (kawasan bernama, desa, pabrik sawit, konsesi sawit/HTI/HPH/tambang, Daops, posko, BPBD, faskes, sekolah, bandara,
   tempat lain lewat Photon).
   Indeks dari data/cari.json + data/kawasan_cari.json (scripts/scrape/kawasan_cari.py) dimuat malas saat kotak cari pertama difokus;
   indeks besar (desa_cari.json dari scripts/scrape/desa_cari.py, sekolah.json, daops/posko/bpbd/fasilitas/metar) baru saat ketikan pertama >= 3 huruf.
   Titik (pabrik, Daops, posko, ...): buffer per jenis (BUF); konsesi, kawasan, desa: poligon disorot, angka di dalamnya lewat AngkaKawasan (angka_kawasan.js, rumus peta_karhutla.py).
   Hitungan titik panas hanya saat memilih atau rentang berganti (bukan per ketikan). Global dari index.html: S, peta, muatJSON, Lapis, kiriPad, nanti, esc, fmt, namaProv, Laci. */
(() => {
  const GRUP = [["desa", "Desa / kelurahan"], ["tn", "Taman nasional"], ["tahura sm ca twa tb", "Kawasan konservasi"], ["gunung", "Gunung api"], ["danau", "Danau"], ["metro", "Wilayah metropolitan"],
    ["khg", "Kesatuan hidrologis gambut"], ["restorasi", "Target restorasi gambut"], ["hl hp", "Kawasan hutan"], ["sungai", "Sungai"], ["daops", "Daops Manggala Agni"], ["posko", "Posko"], ["bpbd", "BPBD"], ["bandara", "Bandara"], ["faskes", "Fasilitas kesehatan"],
    ["sekolah", "Sekolah"], ["pabrik", "Pabrik sawit"], ["sawit", "Konsesi sawit"], ["hti", "HTI"], ["hph", "HPH"], ["tambang", "Tambang"]];
  const JENIS = {sawit: "Konsesi sawit", hti: "HTI", hph: "HPH", tambang: "Tambang", tn: "Taman nasional", tahura: "Taman hutan raya", sm: "Suaka margasatwa",
    ca: "Cagar alam", twa: "Taman wisata alam", tb: "Taman buru", gunung: "Gunung api", danau: "Danau", metro: "Wilayah metropolitan", khg: "Kesatuan hidrologis gambut",
    hl: "Hutan lindung", hp: "Hutan produksi", sungai: "Sungai (koridor 2 km kiri-kanan)", restorasi: "Target restorasi gambut BRGM",
    desa: "Desa / kelurahan", pabrik: "Pabrik sawit", daops: "Daops Manggala Agni", posko: "Posko karhutla", bpbd: "Kantor BPBD", faskes: "Fasilitas kesehatan", sekolah: "Sekolah", bandara: "Bandara"};
  /* singkatan yang biasa diketik (TN Berbak, Tahura, SM, KHG) + kata "kawasan" (Kawasan Bromo Tengger Semeru) */
  const SINGKAT = {tn: [/^Taman Nasional/, "TN"], tahura: [/^Taman Hutan Raya/, "Tahura"], sm: [/^Suaka Margasatwa/, "SM"], ca: [/^Cagar Alam/, "CA"], twa: [/^Taman Wisata Alam/, "TWA"], tb: [/^Taman Buru/, "TB"]};
  const GRUP_T = Object.fromEntries(GRUP.flatMap(([t]) => t.split(" ").map(x => [x, t])));   /* jenis -> kunci grup */
  /* titik: buffer km per jenis; kawasan: poligon; sisanya konsesi */
  const BUFJ = {pabrik: [10, 25, 50], daops: [10, 25, 50], bpbd: [10, 25, 50], bandara: [10, 25, 50], posko: [5, 15, 30], faskes: [5, 10, 25], sekolah: [5, 10, 25]};
  const TITIK = new Set(Object.keys(BUFJ));
  const KAW = new Set(Object.keys(JENIS).filter(t => !(t in {sawit: 1, hti: 1, hph: 1, tambang: 1}) && !TITIK.has(t)));
  const R = 6371;
  const PHOTON = "https://photon.komoot.io/api/";
  let item = [], siap = null, lain = null, pabrik = null, kons = null, kwGeo = null, khg = null, catatan = "", terpilih = null, buka = new Set(), qTerakhir = "", foto = [], tFoto = 0, ctrl = null;

  const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\b(pt|cv|tbk)\b\.?/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const muat = () => siap ||= Promise.all([muatJSON("data/cari.json"), muatJSON("data/kawasan_cari.json").catch(e => (console.warn("kawasan", e), {item: []}))]).then(([d, kw]) => {
    for (const i of kw.item) { const s = SINGKAT[i.t]; i.a = (s ? i.n.replace(s[0], s[1]) : "") + (i.t === "khg" ? "" : " kawasan"); }
    item = [...kw.item, ...d.item]; for (const i of item) { i.s = " " + norm(i.n + " " + (i.g || "") + " " + (i.a || "")) + " "; i.nn = norm(i.n); } $("#cari").dispatchEvent(new Event("input")); }).catch(e => { siap = null; console.warn("cari", e); });
  document.addEventListener("focusin", e => { if (e.target.id === "cari") muat(); });
  /* indeks besar: tiap sumber berdiri sendiri (satu gagal, yang lain tetap masuk); selesai memuat memicu ulang hasil ketikan */
  const kap = s => (s || "").toLowerCase().replace(/(^|[\s(.\/-])\p{Ll}/gu, c => c.toUpperCase());
  const SUMBER = {
    "data/desa_cari.json": d => d.baris.map(([kd, n, kc]) => ({t: "desa", n, p: kd.slice(0, 2), k: [kc && "Kec. " + kc, d.kab[kd.slice(0, 5)]].filter(Boolean).join(" · "), id: kd})),
    "data/daops.json": d => d.map(x => ({t: "daops", n: x.nama, p: x.prov, k: x.kab, c: [x.lon, x.lat], x: [["Balai", x.balai], ["Brigdalkarhutla", x.brigdal], ["Regu", x.regu], ["Alamat", x.alamat]]})),
    "data/posko.json": d => [...d.pusat.map(x => ({t: "posko", n: "Posko Pusat " + x.nama, p: x.prov, c: [x.lon, x.lat], x: [["Tingkat", "Pusat (provinsi)"]]})),
      ...d.menengah.map(x => ({t: "posko", n: "Posko Menengah " + x.nama, p: x.prov, k: x.kab, c: [x.lon, x.lat], x: [["Tingkat", "Menengah (kabupaten)"]]})),
      ...d.posko.map(x => ({t: "posko", n: "Posko " + x.nama.split(",")[0], p: x.prov, k: [x.nama.split(", ")[1], x.kab].filter(Boolean).join(" · "), c: [x.lon, x.lat],
        x: [["Tingkat", x.jenis_posko === "aju" ? "Lapangan (aju)" : "Lapangan"]]}))],
    "data/bpbd.json": d => d.kantor.filter(x => x.prov).map(x => ({t: "bpbd", n: /provinsi/i.test(x.nama) ? "BPBD Provinsi " + namaProv(x.prov) : "BPBD " + kap(x.nama).replace(/^Kab\.?\s+/, ""), p: x.prov, k: x.kab,
      c: [x.lon, x.lat], x: [["Alamat", x.alamat], ["Pusdalops", /^[\d\s()+'/-]{6,}$/.test(x.pusdalops) ? x.pusdalops.replace(/'/g, "") : ""]]})),
    "data/fasilitas.json": d => d.filter(x => (x.t === "rs" || x.t === "faskes") && x.nama && x.nama.length > 5 && !/tanpa nama|^klini[ck]$/i.test(x.nama))
      .map(x => ({t: "faskes", n: x.nama.length > 12 && x.nama === x.nama.toUpperCase() ? kap(x.nama) : x.nama, p: x.prov, c: [x.lon, x.lat], x: [["Data", "OpenStreetMap"]]})),
    "data/metar.json": d => d.map(x => ({t: "bandara", n: x.nama, p: x.prov, c: [x.lon, x.lat], x: [["ICAO", x.icao], ["Jarak pandang", x.vis_m != null ? `${fmt(x.vis_m / 1000)} km (METAR ${x.waktu?.slice(11, 16)} UTC)` : ""]]})),
    "data/sekolah.json": d => { const K = Object.fromEntries(d.kolom.map((c, k) => [c, k]));
      return d.baris.map(r => ({t: "sekolah", n: r[K.nama], p: r[K.prov], k: [r[K.desa] === r[K.desa]?.toUpperCase() ? kap(r[K.desa]) : r[K.desa], r[K.kab]].filter(Boolean).join(" · "), c: [r[K.lon], r[K.lat]],
        x: [["Jenjang", r[K.jenjang]], ["Status", {N: "Negeri", S: "Swasta"}[r[K.status]] || r[K.status]], ["Siswa", r[K.siswa] ? fmt(r[K.siswa]) : ""], ["NPSN", r[K.npsn]]]})); },
  };
  /* fetch langsung, bukan muatJSON: data wilayah/fasilitas tanpa teks WALHI, dan tanpaWalhi atas 240 ribu baris makan ratusan ms */
  const ambil = u => fetch(u).then(r => r.ok ? r.json() : Promise.reject(new Error(u + " " + r.status)));
  const jeda = () => new Promise(r => setTimeout(r));
  /* norm per potongan 3.000 dengan jeda supaya ketikan tetap terlayani saat indeks besar dibangun */
  const muatLain = () => lain ||= Promise.all(Object.entries(SUMBER).map(([u, f]) => ambil(u).then(async d => { const xs = f(d);
    for (let a = 0; a < xs.length; a += 3000) { for (const i of xs.slice(a, a + 3000)) { i.s = " " + norm(i.n + " " + (i.k || "")) + " "; i.nn = norm(i.n); item.push(i); } await jeda(); }
  }).catch(e => console.warn("cari", u, e)))).then(() => ulang());

  /* ---------- hasil ---------- */
  function cocok(q) {
    const t = norm(q).split(" ").filter(Boolean), n = norm(q), out = [];
    if (n.length < 3) return out;
    /* peringkat: -1 nama persis, 0 diawali ketikan, 1 kata pertama di awal kata, 2 sisanya; disimpan di i.rk untuk mengurutkan grup */
    for (const i of item) { if (!t.every(w => i.s.includes(w))) continue; out.push([i.nn === n ? -1 : i.s.indexOf(" " + t[0]) >= 0 ? (i.s.startsWith(" " + n) ? 0 : 1) : 2, i]); }
    return out.sort((a, b) => a[0] - b[0] || a[1].n.length - b[1].n.length).map(x => (x[1].rk = x[0], x[1]));
  }
  /* chip tengah: jenis hanya di grup campuran (Kawasan konservasi); grup sejenis sudah bernama di judulnya */
  const chip = s => s ? `<span class="hs-in"><i>${esc(s)}</i></span>` : "<span></span>";
  const baris = (i, k) => `<button class="hs-c" data-cari="${k}"><b>${esc(i.n)}</b>${chip(KAW.has(i.t) && !i.k ? (GRUP.some(g => g[0] === i.t) ? "" : JENIS[i.t]) : [i.g, i.k].filter(Boolean).join(" · "))}<span class="hs-lv hs-provinsi">${esc(namaProv(i.p))}</span></button>`;
  let daftar = [], tRender = 0, qJadi = "", hJadi = "", segera = false;
  /* dipanggil dari penanganan input di index.html; mengembalikan HTML tambahan untuk #hasil.
     Pindai 240 ribu nama ditunda 120 ms setelah ketikan terakhir (wadah #cariLain diisi kemudian); picu dari dalam (Lihat semua, indeks selesai dimuat) langsung */
  const ulang = () => { segera = true; $("#cari").dispatchEvent(new Event("input")); };
  window.Cari = {
    html(q, nWil) {
      clearTimeout(tFoto); clearTimeout(tRender);
      if (norm(q).length < 3) return "";
      if (!siap) { muat(); return ""; }   /* cadangan bila fokus tak terpicu */
      siap.then(muatLain);
      if (segera && q === qJadi) { segera = false; return `<div id="cariLain">${hJadi = this.isi(q, nWil)}</div>`; }
      tRender = setTimeout(() => { const w = document.getElementById("cariLain"); if (w && $("#cari").value.trim() === q) { qJadi = q; w.innerHTML = hJadi = this.isi(q, nWil); } }, 120);
      return `<div id="cariLain"></div>`;
    },
    isi(q, nWil) {
      if (q !== qTerakhir) { buka = new Set(); qTerakhir = q; foto = []; }
      const m = cocok(q); daftar = []; let h = "";
      /* grup dengan kecocokan terbaik naik ("sungai kapuas": Sungai Kapuas di atas desa Sungai Alai, Kec. Kapuas); seri: urutan GRUP */
      const ember = new Map(); for (const i of m) { const t = GRUP_T[i.t]; if (t) (ember.get(t) || ember.set(t, []).get(t)).push(i); }
      const G = GRUP.map(([t, nama], k) => { const xs = ember.get(t) || []; return [t, nama, xs, xs.length ? xs[0].rk * 100 + k : 1e9]; })
        .filter(g => g[2].length).sort((a, b) => a[3] - b[3]);
      for (const [t, nama, xs] of G) {
        const semua = buka.has(t), tampil = xs.slice(0, semua ? 30 : 5);
        h += `<div class="hs-jd">${nama}<small>${fmt(xs.length)}</small></div>` + tampil.map(i => baris(i, daftar.push(i) - 1)).join("")
          + (xs.length > 5 ? `<button class="hs-lagi" data-cari-semua="${t}">${semua ? "Tampilkan sedikit" : `Lihat semua ${fmt(xs.length)}`}</button>` : ""); }
      const lokal = m.length + (nWil || 0);
      if (lokal < 3) this.foto(q); else h += `<button class="hs-lagi" data-cari-foto="1">Cari tempat lain</button>`;
      return h + `<div id="cariFoto">${fotoHtml()}</div>`;
    },
    foto(q) { clearTimeout(tFoto); tFoto = setTimeout(() => cariFoto(q), 300); },
    klik(b) {
      if (b.dataset.cariSemua) { const t = b.dataset.cariSemua; buka.has(t) ? buka.delete(t) : buka.add(t); ulang(); return true; }
      if (b.dataset.cariFoto) { b.hidden = true; cariFoto(qTerakhir); return true; }
      if (b.dataset.cari != null) { pilih(daftar[+b.dataset.cari]); return false; }
      if (b.dataset.foto != null) { terbangFoto(foto[+b.dataset.foto]); return false; }
      return null;   /* bukan milik Cari */
    },
    /* hasil wilayah dari index.html (kunci "11", "11|Kab", "11|Kab|Kec"): kartu kecil berisi status banjir saja; peta sudah diatur turun() */
    wilayah(kunci, nama) {
      const [p, kab, kec] = kunci.split("|"), T = terpilih = {i: {t: "wil", n: nama, p}};
      bukaKartu(nama, [["Jenis", kec ? "Kecamatan" : kab ? "Kabupaten/kota" : "Provinsi"], ["Lokasi", kec ? `${kab}, ${namaProv(p)}` : kab ? namaProv(p) : ""]], "Sumber: Centurisk97, model banjir");
      const k = kartu(); k.querySelector(".ck-b").innerHTML = `<p class="ck-n">Memuat…</p>`; k.querySelector("[data-timelapse]")?.remove();
      statusBanjir({p, kab, kec}).then(h => { if (terpilih !== T) return; if (h) k.querySelector(".ck-b").innerHTML = h; else k.hidden = true; })
        .catch(e => { console.warn("status banjir", e); if (terpilih === T) k.hidden = true; });
    },
    statusBanjir: (w, pusat) => statusBanjir(w, pusat),   /* w = {p, kab?, kec?}; HTML lipat "Status banjir" atau "" */
    segar: () => terpilih && nanti(statistik),
    hapus: () => terpilih && hapusGaris(),
  };

  /* ---------- Photon: hanya Indonesia, hanya teks ketikan, tanpa data lain ---------- */
  /* jenis OSM ke bahasa Indonesia: nilai dulu, lalu kunci; selebihnya "Tempat" (jangan tampilkan kode mentah) */
  const OSM = {national_park: "Taman nasional", nature_reserve: "Cagar alam", protected_area: "Kawasan lindung", city: "Kota", town: "Kota", village: "Desa", hamlet: "Dusun",
    suburb: "Kelurahan", neighbourhood: "Lingkungan", county: "Kabupaten", state: "Provinsi", island: "Pulau", peak: "Gunung", volcano: "Gunung api", lake: "Danau",
    river: "Sungai", aerodrome: "Bandara", parking: "Parkir", school: "Sekolah", hospital: "Rumah sakit", place_of_worship: "Rumah ibadah", forest: "Hutan", wood: "Hutan",
    highway: "Jalan", waterway: "Sungai", natural: "Alam", building: "Bangunan", amenity: "Fasilitas", tourism: "Wisata", landuse: "Lahan", leisure: "Rekreasi", boundary: "Wilayah", shop: "Toko", office: "Kantor"};
  const jenisOsm = p => OSM[p.osm_value] || OSM[p.osm_key] || "Tempat";
  const kapital = s => (s || "").replace(/(^|\s)\p{Ll}/gu, c => c.toUpperCase());
  function fotoHtml() { return foto.length ? `<div class="hs-jd">Cari tempat</div>` + foto.map((f, k) => { const p = f.properties;
    return `<button class="hs-c" data-foto="${k}"><b>${esc(p.name || "")}</b>${chip([p.city || p.county, p.state].filter(Boolean).map(kapital).join(" · "))}<span class="hs-lv hs-kecamatan">${esc(jenisOsm(p))}</span></button>`; }).join("") + `<div class="hs-atr">© OpenStreetMap, Photon</div>` : ""; }
  async function cariFoto(q) {
    if (norm(q).length < 3) return; ctrl?.abort(); ctrl = new AbortController();
    try { const r = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&lat=-2&lon=118&limit=5&lang=default&bbox=94,-11.5,141.5,6.5`, {signal: ctrl.signal});
      if (!r.ok) throw new Error(r.status); const ada = new Set(cocok(q).map(i => norm(i.n)));   /* yang sudah tampil di grup lokal tidak diulang */
      foto = (await r.json()).features.filter(f => (f.properties.countrycode || "ID") === "ID" && !ada.has(norm(f.properties.name)));
      const w = document.getElementById("cariFoto"); if (w && q === qTerakhir) { w.innerHTML = fotoHtml() || `<div class="hs-atr">Tempat tidak ditemukan. © OpenStreetMap, Photon</div>`; $("#hasil").hidden = false; }
    } catch (e) { if (e.name !== "AbortError") console.warn("photon", e); } }
  function terbangFoto(f) { const p = f.properties, e = p.extent; $("#hasil").hidden = true; $("#cari").value = "";
    e ? peta.fitBounds([[e[0], e[3]], [e[2], e[1]]], {padding: kiriPad(), maxZoom: 14, duration: 700}) : peta.flyTo({center: f.geometry.coordinates, zoom: 11}); }

  /* ---------- geometri ---------- */
  const rad = Math.PI / 180;
  const jarak = (la1, lo1, la2, lo2) => { const a = Math.sin((la2 - la1) * rad / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin((lo2 - lo1) * rad / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(a)); };
  function tujuan(la, lo, km, brg) { const d = km / R, b = brg * rad, p1 = la * rad, l1 = lo * rad;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    return [(l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2))) / rad, p2 / rad]; }
  const cincin = (la, lo, km) => Array.from({length: 65}, (_, k) => tujuan(la, lo, km, k * 360 / 64));
  const dalam = (x, y, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const polys = g => g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  const dalamPoli = (x, y, P) => P.some(rings => rings.reduce((c, r) => c ^ dalam(x, y, r), 0));
  function bboxPoli(P) { const b = [180, 90, -180, -90]; for (const r of P) for (const [x, y] of r[0]) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } return b; }

  /* ---------- lapisan peta (dipasang ulang setelah ganti tema) ---------- */
  const KOSONG = {type: "FeatureCollection", features: []};
  function lapis() {
    if (peta.getSource("cari-buf")) return;
    peta.addSource("cari-buf", {type: "geojson", data: KOSONG}); peta.addSource("cari-lab", {type: "geojson", data: KOSONG}); peta.addSource("cari-ks", {type: "geojson", data: KOSONG});
    peta.addLayer({id: "cari-ks-fill", type: "fill", source: "cari-ks", paint: {"fill-color": "#7a4bb0", "fill-opacity": .14}});
    peta.addLayer({id: "cari-ks-line", type: "line", source: "cari-ks", paint: {"line-color": "#7a4bb0", "line-width": 3}});
    peta.addLayer({id: "cari-buf", type: "line", source: "cari-buf", paint: {"line-color": "#c9503a", "line-width": 2, "line-dasharray": [3, 2]}});
    peta.addLayer({id: "cari-lab", type: "symbol", source: "cari-lab", layout: {"text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true},
      paint: {"text-color": "#c9503a", "text-halo-color": "#fff", "text-halo-width": 2}});
    peta.addLayer({id: "cari-pin", type: "circle", source: "cari-lab", filter: ["==", ["get", "t"], ""], paint: {"circle-radius": 6, "circle-color": "#c9503a", "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
  }
  function gambar() { if (!terpilih) return; try { lapis(); } catch (e) { return; }   /* gaya belum siap: style.load memanggil ulang */
    const T = terpilih, ks = T.poli ? {type: "FeatureCollection", features: [T.poli]} : KOSONG;
    peta.getSource("cari-ks").setData(ks);
    if (TITIK.has(T.i.t)) { const [lo, la] = T.i.c, BUF = BUFJ[T.i.t];
      peta.getSource("cari-buf").setData({type: "FeatureCollection", features: BUF.map(km => ({type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: cincin(la, lo, km)}}))});
      peta.getSource("cari-lab").setData({type: "FeatureCollection", features: [...BUF.map(km => ({type: "Feature", properties: {t: km + " km"}, geometry: {type: "Point", coordinates: tujuan(la, lo, km, 0)}})), {type: "Feature", properties: {t: ""}, geometry: {type: "Point", coordinates: [lo, la]}}]}); }
    else { peta.getSource("cari-buf").setData(KOSONG); peta.getSource("cari-lab").setData(KOSONG); } }
  const hapusGaris = () => { terpilih = null; for (const s of ["cari-buf", "cari-lab", "cari-ks"]) peta.getSource(s)?.setData(KOSONG); kartu().hidden = true; };
  let terikat = false;   /* peta baru ada setelah init; ikat saat pertama dipakai */

  /* ---------- kartu info ---------- */
  function kartu() { let k = document.getElementById("cariKartu"); if (!k) { k = document.createElement("div"); k.id = "cariKartu"; k.className = "card laci on"; k.hidden = true;   /* bentuk laci cluster di kanan (pemilik, 26 Okt 2026) */
    k.onclick = e => { const kb = e.target.closest("[data-kom]"); if (kb) return Laci.buka(kb.dataset.kom);
      if (e.target.closest("[data-hapus]")) hapusGaris(); else if (e.target.closest("[data-timelapse]") && terpilih) { const T = terpilih, b = TITIK.has(T.i.t) ? [tujuan(T.i.c[1], T.i.c[0], 25, 270)[0], tujuan(T.i.c[1], T.i.c[0], 25, 180)[1], tujuan(T.i.c[1], T.i.c[0], 25, 90)[0], tujuan(T.i.c[1], T.i.c[0], 25, 0)[1]] : (T.bb || T.i.b); b ? window.Timelapse?.buka({bbox: b, nama: T.i.n}) : window.Timelapse?.buka(); } }; $("#p-peta").appendChild(k); } return k; }
  const lipat = (judul, isi) => `<details class="lipat" open><summary>${judul}</summary><div class="isi">${isi}</div></details>`;
  const tb2 = baris => `<table class="tb2"><tbody>${baris.map(([k, v]) => `<tr><td>${k}</td><td class="n">${v}</td></tr>`).join("")}</tbody></table>`;
  const tab = (judul, kolom, baris) => `<table class="ck-t"><thead><tr><th>${judul}</th>${kolom.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map((c, k) => k ? `<td>${c}</td>` : `<th>${c}</th>`).join("")}</tr>`).join("")}</tbody></table>`;
  function statistik() {
    const T = terpilih; if (!T || (!TITIK.has(T.i.t) && T.poli === undefined)) return; const k = kartu(); let bd = "";
    const ren = namaHot();   /* satu hari WIB terpilih: "hari ini" | "kemarin" | "Sen 19 Okt"; Hotspot mundur (pemilik, 28 Okt 2026) = hari terakhir berdata, sama dengan S.hariPilih di bawah */
    if (TITIK.has(T.i.t)) { const [lo, la] = T.i.c, BUF = BUFJ[T.i.t], t = BUF.map(() => 0), kp = BUF.map(() => 0);
      const dl = .5, dlo = .5 / Math.max(.2, Math.cos(la * rad));
      for (const b of S.titik) { if (Math.abs(b[0] - la) > dl || Math.abs(b[1] - lo) > dlo || !S.dihitung(b) || !masuk(b)) continue; const d = jarak(la, lo, b[0], b[1]); BUF.forEach((km, j) => d <= km && t[j]++); }
      for (const f of S.kluster.features) { const p = f.properties; if (Math.abs(p.lat - la) > dl || Math.abs(p.lon - lo) > dlo) continue; const d = jarak(la, lo, p.lat, p.lon); BUF.forEach((km, j) => d <= km && kp[j]++); }
      bd = lipat("Di sekitar", tab("Radius", [`Titik panas ${ren}`, "Cluster aktif (72 jam, tak ikut hari terpilih)"], BUF.map((km, j) => [km + " km", fmt(t[j]) + " titik", fmt(kp[j]) + " cluster"]))); }
    else if (T.poli) { const P = polys(T.poli.geometry), b = T.bb, di = (x, y) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && dalamPoli(x, y, P);
      /* mesin yang sama dengan Luas terbakar / Belum padam panel peta (peta_karhutla.py), dihitung di dalam batas ini */
      const a = AngkaKawasan.hitung(S.titik, b, (x, y) => dalamPoli(x, y, P), S.dihitung, S.hariPilih);
      const KL = S.kluster.features.map(f => f.properties).filter(p => di(p.lon, p.lat)), kp = KL.length;
      const tl = `<span title="(Titik NOAA-20 × 4,22 ha + titik NOAA-21 × 4,36 ha) ÷ 2, per hari kalender WIB. Bukan angka regu darat">`;
      bd = lipat(`Di dalam batas, ${ren}`, tb2([[`Titik panas`, fmt(a.hot) + " titik"], [`${tl}Luas terbakar</span>`, fmt(a.luas) + " ha"],
        [`<span title="Luas yang titiknya masih terdeteksi 12–36 jam sebelumnya">Belum padam</span>`, S.titikPenuh ? fmt(a.belum) + " ha" : "memuat…"], ["Cluster aktif (72 jam)", fmt(kp) + " cluster"]]))
        + (T.i.t === "desa" ? `<div id="ckBanjir"></div>` : "") + apiKawasan(KL, di)
        + (catatan && !KAW.has(T.i.t) ? `<p class="ck-n">${esc(catatan.split(". Batas")[0].replace("; ini bukan", "; bukan"))}.</p>` : ""); }
    else bd = `<p class="ck-n">Poligon konsesi tidak ditemukan di data.</p>`;
    k.querySelector(".ck-b").innerHTML = bd; if (T.i.t === "desa" && T.i.id) isiBanjir(T, wilDesa(T.i)); }
  /* isi setara laci cluster ("Api saat ini") untuk satu poligon: jumlah dari cluster di dalam batas, tren titik 7 hari, daftar cluster yang membuka lacinya
     (citra satelit ada di laci). Tren = lokasi unik yang dihitung (S.dihitung) per hari WIB, butuh hotspot.json 7 hari (S.titikPenuh) */
  function apiKawasan(KL, di) {
    let h = "";
    if (KL.length) { const j = k => KL.reduce((s, p) => s + (p[k] || 0), 0), ini = j("ini"), kmrn = j("kmrn"), luas = j("luas");
      const wk = WaktuKluster.gabung(KL, S.meta.dibuat);
      const vs = kmrn ? (ini >= kmrn ? "+" : "") + Math.round((ini / kmrn - 1) * 100) + "%" : ini ? "baru" : "–";
      h += lipat("Api saat ini", `<div class="kv"><div><b>${fmt(j("px24"))}</b><span>piksel aktif 24 jam</span></div><div><b>${fmt(Math.max(...KL.map(p => p.hari || 0)))}</b><span>hari menyala (terlama)</span></div><div><b>${vs}</b><span>deteksi vs kemarin</span></div></div>`
        + tb2([["Luas indikatif", `${fmt(Math.round(luas * .3))}–${fmt(Math.round(luas))} ha`], ["Deteksi VIIRS (7 hari)", fmt(j("n"))], ...(KL.some(p => Number.isFinite(p.frp)) ? [["Daya radiasi api (FRP)", fmt(Math.round(j("frp"))) + " MW"]] : []),
          ["Pertama terdeteksi", wk.awal ? jamWIB(wk.awal) : WaktuKluster.TANPA], ["Terakhir terdeteksi", wk.akhir ? `${jamWIB(wk.akhir)}, ${fmt(wk.lalu)} jam lalu` : WaktuKluster.TANPA]]) + `<p class="ck-n">Jumlah dari ${fmt(KL.length)} cluster di dalam batas.</p>`); }
    if (S.titikPenuh) { const hr = [...hariLain().reverse(), hariSebelum(S.meta.hari_wib), S.meta.hari_wib], n = new Map(hr.map(t => [t.slice(5), 0]));
      for (const r of S.titik) if (n.has(r[7]) && di(r[1], r[0]) && S.dihitung(r)) n.set(r[7], n.get(r[7]) + 1);
      const v = hr.map(t => n.get(t.slice(5))), m = Math.max(...v, 1), bw = 100 / v.length;
      /* Hotspot mundur (pemilik, 28 Okt 2026): belum ada data hari ini, batang hari ini = "–" tanpa batang (0 terbaca "tidak ada api") */
      h += lipat(`Titik panas ${v.length} hari`, `<svg viewBox="0 0 100 34" width="100%" role="img" aria-label="Titik panas per hari di dalam batas">${v.map((x, k) => { const kosong = S.hariKosong && k === v.length - 1, hh = kosong ? 0 : Math.max(.6, x / m * 18);
        return `${kosong ? "" : `<rect x="${k * bw + bw * .15}" y="${24 - hh}" width="${bw * .7}" height="${hh}" rx=".8" fill="${k === v.length - 1 ? "#c9503a" : "#e58a45"}"/>`}<text x="${k * bw + bw / 2}" y="${22 - hh}" text-anchor="middle" font-size="3.2" font-weight="700" fill="var(--ink2)">${kosong ? "–" : fmt(x)}</text><text x="${k * bw + bw / 2}" y="31" text-anchor="middle" font-size="3" fill="var(--ink2)">${+hr[k].slice(8)}</text>`; }).join("")}</svg>`
        + `<p class="ck-n">${S.hariKosong ? "Belum ada data titik panas NASA FIRMS untuk hari ini." : "Hari ini belum sehari penuh."}</p>`); }
    if (KL.length) { const urut = [...KL].sort((x, y) => y.level - x.level || (y.px24 || 0) - (x.px24 || 0)), tampil = urut.slice(0, 8);
      h += lipat(`Cluster di dalam batas`, `<div class="ck-kl">${tampil.map(p => `<button type="button" data-kom="${esc(p.id)}"><b>${esc(p.kec || p.id)}</b><span class="pill l${p.level}">${esc(S.meta.status[p.level])}</span><small>${esc(p.id)}, ${fmt(p.px24 || 0)} piksel 24 jam</small></button>`).join("")}</div>`
        + `<p class="ck-n">${urut.length > 8 ? `8 teratas dari ${fmt(urut.length)} cluster. ` : ""}Klik cluster untuk rincian lengkap dan citra satelit terbaru.</p>`); }
    return h; }
  /* STATUS BANJIR wilayah (desa; kec/kab/prov lewat Cari.statusBanjir): dimuat malas hanya saat hasil wilayah dipilih, hitungan murni di AngkaKawasan.statusWilayah.
     Hari = hari WIB ini bila ada di status.json, bila tidak hari terakhir yang tidak melewati hari ini, bila tidak hari pertama. */
  const SB = ["Aman", "Waspada", "Siaga", "Awas"], SB_IK = ["M5 12l5 5L20 7", "M12 8v5M12 16.5v.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z", "M12 8v5M12 16.5v.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z", "M12 3 2 21h20L12 3zM12 10v5M12 18v.01"];
  let sbData = null;
  const sbMuat = () => sbData ||= Promise.all([ambil("/banjir/data/status.json"), ambil("/banjir/data/kejadian_aktif_awal.json").catch(() => ({kejadian: []}))]).catch(e => { sbData = null; throw e; });
  const sbHari = (hari, ini) => { const t = hari.indexOf(ini); if (t >= 0) return t; let k = 0; hari.forEach((h, j) => { if (h <= ini) k = j; }); return k; };
  const sbPil = lv => `<span class="sb-pil sb${lv}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${SB_IK[lv]}"/></svg>${SB[lv]}</span>`;
  async function statusBanjir(w, pusat) {
    const [st, kj] = await sbMuat(), d = sbHari(st.hari, S.meta.hari_wib), r = AngkaKawasan.statusWilayah(st.kec, w, d, "b");
    if (!r.total) return "";   /* wilayah tak ada di status.json (bukan wilayah berstatus): tidak ditulis, bukan "Aman" */
    const e = AngkaKawasan.kejadianTerdekat(kj.kejadian, r.keys, pusat), rinci = [3, 2, 1].filter(v => r.n[v]).map(v => `${fmt(r.n[v])} kecamatan ${SB[v]}`).join(", ") || `${fmt(r.total)} kecamatan Aman`;
    return lipat("Status banjir", tb2([["Status", sbPil(r.lv)], ["Kecamatan", rinci],
      ["Kejadian aktif", e ? `<a href="/banjir/k/${esc(e.kode)}" target="_blank" rel="noopener">${esc(e.kode)}</a>, ${e.km ? `${fmt(Math.round(e.km))} km dari sini` : "di wilayah ini"}, sejak ${esc(tglPendekSB(e.sejak))}` : "tidak ada"]])
      + `<p class="ck-n">${st.hari[d] === S.meta.hari_wib ? "Prakiraan" : "Data"} ${esc(tglPendekSB(st.hari[d]))}.</p>`);
  }
  const tglPendekSB = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"});
  /* kab desa = nama di desa_cari.json; kec = "Kec. X" dari teks k */
  const wilDesa = i => ({p: i.id.slice(0, 2), kab: (i.k || "").split(" · ")[1], kec: ((i.k || "").split(" · ")[0] || "").replace(/^Kec\.\s*/, "")});
  const isiBanjir = (T, w) => { const k = document.getElementById("ckBanjir"); if (!k) return;
    statusBanjir(w, T.bb && [(T.bb[1] + T.bb[3]) / 2, (T.bb[0] + T.bb[2]) / 2]).then(h => { if (terpilih === T) k.innerHTML = h; }).catch(e => console.warn("status banjir", e)); };
  /* kepala dan tombol ikon sama dengan laci cluster: jenis sebagai eyebrow, nama, baris profil sebagai label; isi per bagian lipat */
  function bukaKartu(judul, baris, atr) {
    const k = kartu(); k.hidden = false; const jenis = baris.find(r => r[0] === "Jenis")?.[1] || "", lain = baris.filter(r => r[1] && r[0] !== "Jenis"), buf = TITIK.has(terpilih.i.t) ? "Hapus buffer dan tutup" : "Tutup";
    k.innerHTML = `<div class="hd"><div class="hd-isi">${jenis ? `<span class="hd-ey">${esc(jenis)}</span>` : ""}<h2 title="${esc(judul)}">${esc(judul)}</h2>${lain.length ? `<div class="hd-meta">${lain.map(([a, b]) => `<span class="hd-ko" title="${esc(a)}">${esc(String(b))}</span>`).join("")}</div>` : ""}</div>
      <div class="hd-aksi"><button class="ik-btn" type="button" data-timelapse title="Timelapse citra harian" aria-label="Timelapse citra harian"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/></svg></button>
        <button class="tutup ik-btn" type="button" data-hapus title="${buf}" aria-label="${buf}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <div class="bd" style="display:grid;gap:10px"><div class="ck-b" style="display:grid;gap:10px"></div><p class="fnd">${atr}</p></div>`; }

  async function pilih(i) {
    $("#hasil").hidden = true; $("#cari").value = ""; terpilih = {i};
    if (!terikat) { terikat = true; peta.on("style.load", gambar); }
    try { lapis(); } catch (e) { /* gaya belum siap: style.load memanggil gambar() */ }
    if (i.t === "pabrik") {
      kartuMuat(i);
      pabrik ||= await muatJSON("data/pabrik_sawit.json").then(d => new Map(d.pabrik.map(p => [p.id, p])));
      if (!terpilih || terpilih.i !== i) return;
      const p = pabrik.get(i.id) || {}, [lo, la] = i.c;
      peta.fitBounds([tujuan(la, lo, 55, 270), tujuan(la, lo, 55, 90)].reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds()).extend(tujuan(la, lo, 55, 0)).extend(tujuan(la, lo, 55, 180)), {padding: kiriPad(), duration: 700});
      bukaKartu(i.n, [["Perusahaan", p.perusahaan], ["Grup", p.grup || i.g], ["Kapasitas", p.kapasitas ? `${fmt(p.kapasitas)} ${p.kapasitas_satuan || ""}` : ""], ["Tahun (data Trase)", p.tahun], ["Lokasi", [i.k, namaProv(i.p)].filter(Boolean).join(", ")]], "Trase (CC BY 4.0) · titik panas: NASA FIRMS");
      gambar(); nanti(statistik); return; }
    if (TITIK.has(i.t)) { const [lo, la] = i.c, km = BUFJ[i.t][2] + 5;
      peta.fitBounds([tujuan(la, lo, km, 270), tujuan(la, lo, km, 90)].reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds()).extend(tujuan(la, lo, km, 0)).extend(tujuan(la, lo, km, 180)), {padding: kiriPad(), duration: 700});
      bukaKartu(i.n, [["Jenis", JENIS[i.t]], ...i.x, ["Lokasi", [i.k, namaProv(i.p)].filter(Boolean).join(", ")]], ATR[i.t] + " · titik panas: NASA FIRMS");
      gambar(); nanti(statistik); return; }
    kartuMuat(i);
    if (KAW.has(i.t)) {
      const f = await poliKawasan(i).catch(e => (console.warn("kawasan", e), null));
      if (!terpilih || terpilih.i !== i) return;
      terpilih.poli = f; terpilih.bb = f ? bboxPoli(polys(f.geometry)) : i.b;
      const b = terpilih.bb; peta.fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding: kiriPad(), maxZoom: 12, duration: 700});
      bukaKartu(i.n, [["Jenis", JENIS[i.t] + (i.r ? `, radius ${i.r} km dari puncak` : "")], ["Lokasi", i.t === "desa" ? i.k : ""], ["Provinsi", namaProv(i.p)]],
        `Batas: ${esc(i.t === "desa" ? "Kepmendagri 300.2.2-2430/2025 lewat cahyadsn/wilayah_boundaries (MIT), disederhanakan" : i.sb)} · titik panas: NASA FIRMS`);
      gambar(); nanti(statistik); muatTitik(168); return; }   /* belum padam butuh 36 jam ke belakang: hotspot.json 7 hari; selesai memuat memanggil Cari.segar */
    try { kons ||= await (Lapis.cache.konsesiP ||= muatJSON("data/lahan/konsesi.geojson").then(d => Lapis.cache.konsesi = d));
      if (!catatan) catatan = await muatJSON("data/kompleks_konsesi.json").then(d => d.catatan || "").catch(() => "");
    } catch (e) { console.warn("konsesi", e); }
    if (!terpilih || terpilih.i !== i) return;
    const f = kons?.features.find(x => x.properties.id === i.id); terpilih.poli = f || null; terpilih.bb = f ? bboxPoli(polys(f.geometry)) : i.b;
    const b = terpilih.bb || i.b; if (b) peta.fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding: kiriPad(), maxZoom: 13, duration: 700}); else peta.flyTo({center: i.c, zoom: 10});
    const pr = f?.properties || {};
    bukaKartu(i.n, [["Jenis", JENIS[i.t]], ["Grup", i.g || pr.grup], ["Lokasi", [i.k, namaProv(i.p)].filter(Boolean).join(", ")], ["Luas peta", pr.luas_peta_ha ? fmt(pr.luas_peta_ha) + " ha" : ""], ["Data tahun", pr.tahun_data]], "Batas konsesi: Kemenhut/GFW, Trase (CC BY 4.0) · titik panas: NASA FIRMS");
    gambar(); nanti(statistik); }
  /* poligon kawasan: OSM (kawasan_cari.geojson), KHG (lahan/khg.geojson), gunung = lingkaran dari puncak, metro = gabungan kab/kota */
  async function poliKawasan(i) {
    const F = coords => ({type: "Feature", properties: {}, geometry: {type: "MultiPolygon", coordinates: coords}});
    if (i.t === "gunung") return F([[cincin(i.c[1], i.c[0], i.r)]]);
    if (i.t === "desa") { const u = `geo/desa/${i.id.slice(0, 5)}.json`, fc = await (desaGeo[u] ||= ambil(u).catch(e => { delete desaGeo[u]; throw e; })); return fc.features.find(f => f.properties.kd === i.id) || null; }
    if (i.t === "khg") { khg ||= Lapis.cache.khg ||= await muatJSON("data/lahan/khg.geojson"); return khg.features.find(f => "khg:" + f.properties.kode === i.id) || null; }
    if (i.t === "metro") { const out = [];
      for (const k of i.kab) { const [p, kb] = k.split("|"), fc = S.geo.kab[p] ||= await muatJSON(`geo/kabupaten/${p}.json`), f = fc.features.find(f => f.properties.kab === kb);
        if (f) out.push(...polys(f.geometry)); }
      return out.length ? F(out) : null; }
    kwGeo ||= await muatJSON("data/kawasan_cari.geojson");
    return kwGeo.features.find(f => f.properties.id === i.id) || null;
  }
  const desaGeo = {};
  const ATR = {daops: "Daops: SiPongi opsroom KLHK", posko: "Posko: rancangan posko Centurisk97 (scripts/data/posko.py)", bpbd: "Kantor BPBD: gis.bnpb.go.id",
    faskes: "Faskes: OpenStreetMap (ODbL)", sekolah: "Sekolah: Dapodik Kemendikbud, EMIS Kemenag", bandara: "Bandara dan jarak pandang: METAR (NOAA AWC)"};
  function kartuMuat(i) { bukaKartu(i.n, [["Jenis", JENIS[i.t]], ["Lokasi", [i.k, namaProv(i.p)].filter(Boolean).join(", ")]], ""); kartu().querySelector(".ck-b").innerHTML = `<p class="ck-n">Memuat…</p>`; }
})();
