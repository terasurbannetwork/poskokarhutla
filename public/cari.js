/* Cari: perluasan kotak cari peta (pabrik sawit, konsesi sawit/HTI/HPH/tambang, tempat lain lewat Photon).
   Indeks dari data/cari.json dimuat malas saat kotak cari pertama difokus. Pabrik: buffer 10/25/50 km; konsesi: poligon disorot.
   Hitungan titik panas hanya saat memilih atau rentang berganti (bukan per ketikan). Global dari index.html: S, peta, muatJSON, Lapis, kiriPad, nanti, esc, fmt, namaProv, Laci. */
(() => {
  const GRUP = [["pabrik", "Pabrik sawit"], ["sawit", "Konsesi sawit"], ["hti", "HTI"], ["hph", "HPH"], ["tambang", "Tambang"]];
  const JENIS = {sawit: "Konsesi sawit", hti: "HTI", hph: "HPH", tambang: "Tambang"};
  const BUF = [10, 25, 50], R = 6371;
  const PHOTON = "https://photon.komoot.io/api/";
  let item = [], siap = null, pabrik = null, kons = null, catatan = "", terpilih = null, buka = new Set(), qTerakhir = "", foto = [], tFoto = 0, ctrl = null;

  const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\b(pt|cv|tbk)\b\.?/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const muat = () => siap ||= muatJSON("data/cari.json").then(d => { item = d.item; for (const i of item) i.s = " " + norm(i.n + " " + (i.g || "") + " " + (i.a || "")) + " "; $("#cari").dispatchEvent(new Event("input")); }).catch(e => { siap = null; console.warn("cari", e); });
  document.addEventListener("focusin", e => { if (e.target.id === "cari") muat(); });

  /* ---------- hasil ---------- */
  function cocok(q) {
    const t = norm(q).split(" ").filter(Boolean), n = norm(q), out = [];
    if (n.length < 3) return out;
    for (const i of item) { if (!t.every(w => i.s.includes(w))) continue; out.push([i.s.indexOf(" " + t[0]) >= 0 ? (i.s.startsWith(" " + n) ? 0 : 1) : 2, i]); }
    return out.sort((a, b) => a[0] - b[0] || a[1].n.length - b[1].n.length).map(x => x[1]);
  }
  const baris = (i, k) => `<button data-cari="${k}"><b>${esc(i.n)}</b><span class="hs-in"><i>${esc([i.g, i.k].filter(Boolean).join(" · "))}</i></span><span class="hs-lv hs-provinsi">${esc(namaProv(i.p))}</span></button>`;
  let daftar = [];
  /* dipanggil dari penanganan input di index.html; mengembalikan HTML tambahan untuk #hasil */
  window.Cari = {
    html(q, nWil) {
      clearTimeout(tFoto);
      if (norm(q).length < 3) return "";
      if (!siap) { muat(); return ""; }   /* cadangan bila fokus tak terpicu */
      if (q !== qTerakhir) { buka = new Set(); qTerakhir = q; foto = []; }
      const m = cocok(q); daftar = []; let h = "";
      for (const [t, nama] of GRUP) { const xs = m.filter(i => i.t === t); if (!xs.length) continue;
        const semua = buka.has(t), tampil = xs.slice(0, semua ? 30 : 5);
        h += `<div class="hs-jd">${nama}<small>${fmt(xs.length)}</small></div>` + tampil.map(i => baris(i, daftar.push(i) - 1)).join("")
          + (xs.length > 5 ? `<button class="hs-lagi" data-cari-semua="${t}">${semua ? "Tampilkan sedikit" : `Lihat semua ${fmt(xs.length)}`}</button>` : ""); }
      const lokal = m.length + (nWil || 0);
      if (lokal < 3) this.foto(q); else h += `<button class="hs-lagi" data-cari-foto="1">Cari tempat lain</button>`;
      return h + `<div id="cariFoto">${fotoHtml()}</div>`;
    },
    foto(q) { clearTimeout(tFoto); tFoto = setTimeout(() => cariFoto(q), 300); },
    klik(b) {
      if (b.dataset.cariSemua) { const t = b.dataset.cariSemua; buka.has(t) ? buka.delete(t) : buka.add(t); $("#cari").dispatchEvent(new Event("input")); return true; }
      if (b.dataset.cariFoto) { b.hidden = true; cariFoto(qTerakhir); return true; }
      if (b.dataset.cari != null) { pilih(daftar[+b.dataset.cari]); return false; }
      if (b.dataset.foto != null) { terbangFoto(foto[+b.dataset.foto]); return false; }
      return null;   /* bukan milik Cari */
    },
    segar: () => terpilih && nanti(statistik),
  };

  /* ---------- Photon: hanya Indonesia, hanya teks ketikan, tanpa data lain ---------- */
  function fotoHtml() { return foto.length ? `<div class="hs-jd">Cari tempat</div>` + foto.map((f, k) => { const p = f.properties;
    return `<button data-foto="${k}"><b>${esc(p.name || "")}</b><span class="hs-in"><i>${esc([p.city || p.county, p.state].filter(Boolean).join(" · "))}</i></span><span class="hs-lv hs-kecamatan">${esc(p.osm_value || "")}</span></button>`; }).join("") + `<div class="hs-atr">© OpenStreetMap, Photon</div>` : ""; }
  async function cariFoto(q) {
    if (norm(q).length < 3) return; ctrl?.abort(); ctrl = new AbortController();
    try { const r = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&lat=-2&lon=118&limit=5&lang=default&bbox=94,-11.5,141.5,6.5`, {signal: ctrl.signal});
      if (!r.ok) throw new Error(r.status); foto = (await r.json()).features.filter(f => (f.properties.countrycode || "ID") === "ID");
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
    if (T.i.t === "pabrik") { const [lo, la] = T.i.c;
      peta.getSource("cari-buf").setData({type: "FeatureCollection", features: BUF.map(km => ({type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: cincin(la, lo, km)}}))});
      peta.getSource("cari-lab").setData({type: "FeatureCollection", features: [...BUF.map(km => ({type: "Feature", properties: {t: km + " km"}, geometry: {type: "Point", coordinates: tujuan(la, lo, km, 0)}})), {type: "Feature", properties: {t: ""}, geometry: {type: "Point", coordinates: [lo, la]}}]}); }
    else { peta.getSource("cari-buf").setData(KOSONG); peta.getSource("cari-lab").setData(KOSONG); } }
  const hapusGaris = () => { terpilih = null; for (const s of ["cari-buf", "cari-lab", "cari-ks"]) peta.getSource(s)?.setData(KOSONG); kartu().hidden = true; };
  let terikat = false;   /* peta baru ada setelah init; ikat saat pertama dipakai */

  /* ---------- kartu info ---------- */
  function kartu() { let k = document.getElementById("cariKartu"); if (!k) { k = document.createElement("div"); k.id = "cariKartu"; k.className = "box"; k.hidden = true;
    k.onclick = e => { if (e.target.closest("[data-hapus]")) hapusGaris(); else if (e.target.closest("[data-timelapse]") && terpilih) { const T = terpilih, b = T.i.t === "pabrik" ? [tujuan(T.i.c[1], T.i.c[0], 25, 270)[0], tujuan(T.i.c[1], T.i.c[0], 25, 180)[1], tujuan(T.i.c[1], T.i.c[0], 25, 90)[0], tujuan(T.i.c[1], T.i.c[0], 25, 0)[1]] : (T.bb || T.i.b); b ? window.Timelapse?.buka({bbox: b, nama: T.i.n}) : window.Timelapse?.buka(); } }; $("#p-peta").appendChild(k); } return k; }
  const tab = (judul, kolom, baris) => `<table class="ck-t"><thead><tr><th>${judul}</th>${kolom.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map((c, k) => k ? `<td>${c}</td>` : `<th>${c}</th>`).join("")}</tr>`).join("")}</tbody></table>`;
  function statistik() {
    const T = terpilih; if (!T || (T.i.t !== "pabrik" && T.poli === undefined)) return; const k = kartu(); let bd = "";
    const ren = namaRentang();   /* satu hari WIB terpilih: "hari ini" | "kemarin" | "Sen 19 Okt" */
    if (T.i.t === "pabrik") { const [lo, la] = T.i.c, t = BUF.map(() => 0), kp = BUF.map(() => 0);
      const dl = .5, dlo = .5 / Math.max(.2, Math.cos(la * rad));
      for (const b of S.titik) { if (Math.abs(b[0] - la) > dl || Math.abs(b[1] - lo) > dlo || !S.utama.has(b[3]) || !masuk(b)) continue; const d = jarak(la, lo, b[0], b[1]); BUF.forEach((km, j) => d <= km && t[j]++); }
      for (const f of S.kluster.features) { const p = f.properties; if (Math.abs(p.lat - la) > dl || Math.abs(p.lon - lo) > dlo) continue; const d = jarak(la, lo, p.lat, p.lon); BUF.forEach((km, j) => d <= km && kp[j]++); }
      bd = tab("Radius", [`Titik panas ${ren}`, "Cluster aktif (72 jam, tak ikut hari terpilih)"], BUF.map((km, j) => [km + " km", fmt(t[j]) + " titik", fmt(kp[j]) + " cluster"])); }
    else if (T.poli) { const P = polys(T.poli.geometry), b = T.bb; let t = 0, kp = 0;
      for (const r of S.titik) if (r[1] >= b[0] && r[1] <= b[2] && r[0] >= b[1] && r[0] <= b[3] && S.utama.has(r[3]) && masuk(r) && dalamPoli(r[1], r[0], P)) t++;
      for (const f of S.kluster.features) { const p = f.properties; if (p.lon >= b[0] && p.lon <= b[2] && p.lat >= b[1] && p.lat <= b[3] && dalamPoli(p.lon, p.lat, P)) kp++; }
      bd = tab("Di dalam poligon", [`Titik panas ${ren}`, "Cluster aktif (72 jam, tak ikut hari terpilih)"], [["Jumlah", fmt(t) + " titik", fmt(kp) + " cluster"]]) + (catatan ? `<p class="ck-n">${esc(catatan.split(". Batas")[0].replace("; ini bukan", "; bukan"))}.</p>` : ""); }
    else bd = `<p class="ck-n">Poligon konsesi tidak ditemukan di data.</p>`;
    k.querySelector(".ck-b").innerHTML = bd; }
  function bukaKartu(judul, baris, atr) {
    const k = kartu(); k.hidden = false;
    k.innerHTML = `<div class="ck-h"><b>${esc(judul)}</b><button type="button" data-hapus aria-label="Hapus buffer dan tutup" title="${terpilih.i.t === "pabrik" ? "Hapus buffer" : "Tutup"}"><span class="ck-tx">${terpilih.i.t === "pabrik" ? "Hapus buffer" : "Tutup"}</span><span class="ck-x" aria-hidden="true">&times;</span></button></div>`
      + `<dl class="ck-d">${baris.filter(r => r[1]).map(([a, b]) => `<dt>${a}</dt><dd>${esc(String(b))}</dd>`).join("")}</dl><div class="ck-b"></div><button type="button" class="ck-tl" data-timelapse>Timelapse citra harian</button><div class="hs-atr">${atr}</div>`; }

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
    kartuMuat(i);
    try { kons ||= await (Lapis.cache.konsesiP ||= muatJSON("data/lahan/konsesi.geojson").then(d => Lapis.cache.konsesi = d));
      if (!catatan) catatan = await muatJSON("data/kompleks_konsesi.json").then(d => d.catatan || "").catch(() => "");
    } catch (e) { console.warn("konsesi", e); }
    if (!terpilih || terpilih.i !== i) return;
    const f = kons?.features.find(x => x.properties.id === i.id); terpilih.poli = f || null; terpilih.bb = f ? bboxPoli(polys(f.geometry)) : i.b;
    const b = terpilih.bb || i.b; if (b) peta.fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding: kiriPad(), maxZoom: 13, duration: 700}); else peta.flyTo({center: i.c, zoom: 10});
    const pr = f?.properties || {};
    bukaKartu(i.n, [["Jenis", JENIS[i.t]], ["Grup", i.g || pr.grup], ["Lokasi", [i.k, namaProv(i.p)].filter(Boolean).join(", ")], ["Luas peta", pr.luas_peta_ha ? fmt(pr.luas_peta_ha) + " ha" : ""], ["Data tahun", pr.tahun_data]], "Batas konsesi: Kemenhut/GFW, Trase (CC BY 4.0) · titik panas: NASA FIRMS");
    gambar(); nanti(statistik); }
  function kartuMuat(i) { bukaKartu(i.n, [["Jenis", JENIS[i.t]], ["Lokasi", [i.k, namaProv(i.p)].filter(Boolean).join(", ")]], ""); kartu().querySelector(".ck-b").innerHTML = `<p class="ck-n">Memuat…</p>`; }
})();
