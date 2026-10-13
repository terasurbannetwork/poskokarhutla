/* lapisan5.js — lima produk data tambahan untuk peta karhutla.
   Dimuat SETELAH skrip utama index.html (skrip klasik, jadi const/function globalnya terbaca di sini):
     peta, Peta, Lapis, S, Laci, muatJSON, esc, fmt, km, namaProv, toast, gelap, gradasi, ST_PM, gambarGrid, renderLegenda, $.
   Tidak mengubah index.html selain dua tag (lihat LAPISAN5.md): kotak centang, legenda, popup, laci, lencana iklim
   semuanya dipasang dari sini. */
(() => {
  const WARNA = {merah: "#c9503a", oranye: "#e58a45", kuning: "#e3b94e", hijau: "#5a9e74", biru: "#4f8fc4", ungu: "#5f6fb0"};
  const KELAS = ["Baik", "Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"];
  const AMBANG = [15.5, 55.4, 150.4, 250.4];
  const W_KELAS = [WARNA.hijau, WARNA.kuning, WARNA.oranye, WARNA.merah, "#7a2b3f"];
  const kelasPM = v => AMBANG.filter(a => v > a).length;
  /* janji di C5 (dua klik cepat tidak memuat dua kali); data jadi di Lapis.cache, dipakai bersama skrip utama (asap) */
  const C5 = {};
  const muat = (k, u) => C5[k] ||= (Lapis.cache[k] ? Promise.resolve(Lapis.cache[k]) : muatJSON(u).then(d => Lapis.cache[k] ||= d)).catch(e => { delete C5[k]; throw e; });
  const GFW = () => muat("lapisan_tambahan", "data/lapisan_tambahan.json");

  /* ---------- kotak centang: disisipkan ke #lapis bila belum ada (boleh juga ditulis statis, lihat LAPISAN5.md) ---------- */
  const GRUP = [
    ["Akses", [["jalan", "Jalan & sungai (OSM)"]]],
  ];
  const LAHAN = [["hilang", "Kehilangan tutupan hutan 2021–2025"], ["hilang_api", "Hutan hilang akibat kebakaran"], ["peringatan", "Peringatan gangguan hutan 90 hari"], ["kanal", "Kepadatan kanal & parit"]];
  const KUNCI = new Set([...GRUP.flatMap(g => g[1].map(x => x[0])), ...LAHAN.map(x => x[0])]);
  const kotak = ([k, n]) => `<label><input type="checkbox" data-l="${k}"> ${n}</label>`;
  function sisipKotak() {
    const L = $("#lapis"); if (!L || L.querySelector('[data-l="jalan"]')) return;
    const lahan = [...L.querySelectorAll("details")].find(d => d.querySelector("summary")?.textContent.trim() === "Lahan");
    lahan ? lahan.insertAdjacentHTML("beforeend", LAHAN.map(kotak).join("")) : null;
    const dasar = [...L.querySelectorAll("details")].find(d => d.querySelector("summary")?.textContent.trim() === "Peta dasar");
    const html = GRUP.map(([j, xs]) => `<details><summary>${j}</summary>${xs.map(kotak).join("")}</details>`).join("");
    dasar ? dasar.insertAdjacentHTML("beforebegin", html) : L.insertAdjacentHTML("beforeend", html);
    if (!lahan) L.insertAdjacentHTML("beforeend", `<details><summary>Lahan</summary>${LAHAN.map(kotak).join("")}</details>`);
  }
  const nyala = k => !!document.querySelector(`#lapis input[data-l="${k}"]:checked`);
  const LAYER = {penduduk: ["l5-penduduk"], fasilitas: ["l5-fasilitas"], jalan: ["l5-jalan", "l5-sungai"],
    hilang: ["l5-hilang"], hilang_api: ["l5-hilang_api"], satelit: ["l5-satelit"], peringatan: ["l5-peringatan"], kanal: ["l5-kanal"]};

  /* ---------- data turunan ---------- */
  const hariAsap = a => { const tgl = S.fwi?.grid[0].hari[S.fwiHari]?.tgl; return Math.max(0, a.hari.indexOf(tgl)); };
  function pmDi(a, lat, lon) { const s = a.sel || 1, la = Math.floor(lat / s) * s + s / 2, lo = Math.floor(lon / s) * s + s / 2;
    a._idx ||= new Map(a.grid.map(r => [r[0] + "," + r[1], r[2]])); return a._idx.get(la + "," + lo) || null; }
  /* jiwa per kelas ISPU per hari; prov kosong = semua provinsi */
  async function paparan(prov) {
    const [pen, a] = await Promise.all([muat("penduduk", "data/penduduk.json"), muat("asap", "data/asap.json")]);
    const jiwa = a.hari.map(() => [0, 0, 0, 0, 0]);
    for (const [la, lo, n, p] of pen.grid) { if (!p || (prov && p !== prov)) continue; const pm = pmDi(a, la, lo); if (!pm) continue;
      pm.forEach((v, i) => v != null && (jiwa[i][kelasPM(v)] += n)); }
    return {prov: prov || null, hari: a.hari, kelas: KELAS, jiwa, tidak_sehat: jiwa.map(j => j[2] + j[3] + j[4]),
      catatan: "PM2.5 = maksimum harian CAMS per sel 1°, dibandingkan ambang ISPU (rata-rata 24 jam): cenderung melebih-lebihkan. Penduduk WorldPop 2026."};
  }
  window.paparan = paparan;
  /* kalender musim berbobot iklim: peluang tiap dasarian (36) = w*p_el_nino + (1-w)*p_biasa, w dari iklim.json */
  window.peluangMusim = async o => { const ik = await muat("iklim", "data/iklim.json").catch(() => null); const w = ik?.bobot_el_nino || Array(36).fill(0);
    return o.p_el_nino.map((p, d) => +(w[d] * p + (1 - w[d]) * o.p_biasa[d]).toFixed(2)); };

  function geoPenduduk(pen, a) {
    const i = hariAsap(a), sel = new Map();
    for (const [la, lo, n] of pen.grid) { const k = la + "," + lo; sel.set(k, (sel.get(k) || 0) + n); }
    const f = [];
    for (const [k, n] of sel) { const [la, lo] = k.split(",").map(Number), pm = pmDi(a, la, lo)?.[i]; if (pm == null || n < 500) continue;
      const c = kelasPM(pm); if (c < 1) continue;
      f.push({type: "Feature", geometry: {type: "Point", coordinates: [lo, la]}, properties: {n, pm, c}}); }
    return {type: "FeatureCollection", features: f};
  }
  const kompleksDekat = (lat, lon) => { let b = null; for (const f of S.kluster.features) { const p = f.properties; if (!p.level) continue;
    const d = km(lat, lon, p.lat, p.lon); if (!b || d < b.d) b = {d, p}; } return b; };

  /* ---------- pasang lapisan ---------- */
  const pasang = {
    async penduduk() { const [pen, a] = await Promise.all([muat("penduduk", "data/penduduk.json"), muat("asap", "data/asap.json")]);
      peta.addSource("l5-penduduk", {type: "geojson", data: geoPenduduk(pen, a)});
      peta.addLayer({id: "l5-penduduk", type: "circle", source: "l5-penduduk", paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 20, 2, 1000, 12], 8, ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 20, 6, 1000, 34]],
        "circle-color": ["match", ["get", "c"], 1, W_KELAS[1], 2, W_KELAS[2], 3, W_KELAS[3], W_KELAS[4]], "circle-opacity": .55,
        "circle-stroke-color": gelap() ? "#0b1424" : "#fff", "circle-stroke-width": .8}}, Peta.lapisAwal());
      klikSekali("l5-penduduk", e => { const p = e.features[0].properties;
        return `<b>± ${fmt(Math.round(p.n / 1000) * 1000)} jiwa</b> di sel ± 28 km ini<br>PM2.5 maks. ${fmt(p.pm)} µg/m³ · <b>${KELAS[p.c]}</b><br><small>Prakiraan CAMS; penduduk WorldPop 2026</small>`; }); },
    async fasilitas() { const d = await muat("fasilitas", "data/fasilitas.json");
      peta.addSource("l5-fasilitas", {type: "geojson", data: {type: "FeatureCollection", features: d.map((x, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]}, properties: {i, t: x.t}}))}});
      const w = ["match", ["get", "t"], "rs", WARNA.ungu, "faskes", WARNA.biru, WARNA.kuning];
      peta.addLayer({id: "l5-fasilitas", type: "circle", source: "l5-fasilitas", paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["match", ["get", "t"], "rs", 3.5, 2], 10, ["match", ["get", "t"], "rs", 8, 5.5]],
        "circle-color": w, "circle-stroke-color": "#fff", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 5, .5, 10, 1.5]}});
      klikSekali("l5-fasilitas", async e => { const x = d[e.features[0].properties.i], a = await muat("asap", "data/asap.json").catch(() => null), k = kompleksDekat(x.lat, x.lon);
        const pm = a && pmDi(a, x.lat, x.lon), kb = (k, v, pn) => `<div class="kb${pn ? " penuh" : ""}"><span>${k}</span><b>${v}</b></div>`;
        const hari = pm ? a.hari.map((t, i) => pm[i] == null ? "" : `<span class="l5-pm" style="background:${W_KELAS[kelasPM(pm[i])]}" title="${KELAS[kelasPM(pm[i])]}">${new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short"})} ${Math.round(pm[i])}</span>`).join("") : "–";
        return `<div class="kartu"><div class="kp" style="background:linear-gradient(135deg,${x.t === "rs" ? WARNA.ungu : x.t === "faskes" ? WARNA.biru : "#b8902c"},rgba(11,37,69,.95))"><div>
          <small>${{rs: "Rumah sakit", faskes: "Fasilitas kesehatan", sekolah: "Sekolah"}[x.t]}</small><b>${esc(x.nama)}</b></div></div>
          <div class="kg">${kb("Provinsi", esc(namaProv(x.prov)))}${kb("Kompleks terdekat", k ? `${fmt(Math.round(k.d))} km` : "–")}
          ${k ? kb("Status kompleks", `${esc(k.p.id)} · ${esc(S.meta.status[k.p.level])}`, 1) : ""}</div>
          <div class="kk">PM2.5 maks. harian (µg/m³), prakiraan CAMS:<div class="l5-hari">${hari}</div>
          ${pm && pm.some(v => v > 55.4) ? `<b>${x.t === "sekolah" ? "Pertimbangkan belajar dari rumah atau kurangi kegiatan luar ruang." : "Siapkan layanan ISPA, masker, dan ruang bersih udara."}</b>` : ""}
          ${k?.p.level ? `<button class="btn sec" data-l5k="${esc(k.p.id)}">Buka kompleks ${esc(k.p.id)}</button>` : ""}</div></div>`; }, 330); },
    async jalan() { const d = await muat("jalan", "data/jalan.geojson"), bawah = Peta.lapisAwal();
      peta.addSource("l5-jalan", {type: "geojson", data: d, attribution: "Jalan & sungai © kontributor OpenStreetMap (ODbL)"});
      peta.addLayer({id: "l5-sungai", type: "line", source: "l5-jalan", filter: ["==", ["get", "k"], 6], paint: {"line-color": WARNA.biru, "line-width": ["interpolate", ["linear"], ["zoom"], 5, .6, 10, 2], "line-opacity": .8}}, bawah);
      peta.addLayer({id: "l5-jalan", type: "line", source: "l5-jalan", filter: ["<=", ["get", "k"], 3], layout: {"line-cap": "round", "line-join": "round"},
        paint: {"line-color": ["match", ["get", "k"], 1, WARNA.merah, 2, WARNA.oranye, WARNA.kuning], "line-width": ["interpolate", ["linear"], ["zoom"], 5, ["match", ["get", "k"], 1, 1.2, .6], 11, ["match", ["get", "k"], 1, 4, 2.5]]}}, bawah); },
    async kanal() { const d = await muat("kanal", "data/kanal.json"), s = d.sel;
      let x0 = 180, x1 = -180, y0 = 90, y1 = -90; for (const [la, lo] of d.grid) { x0 = Math.min(x0, lo); x1 = Math.max(x1, lo); y0 = Math.min(y0, la); y1 = Math.max(y1, la); }
      x0 -= s / 2; y0 -= s / 2; x1 += s / 2; y1 += s / 2;
      const ST = [[0, [107, 74, 43, 0]], [1, [143, 111, 72, 110]], [5, [79, 143, 196, 190]], [15, [95, 111, 176, 230]], [40, [60, 50, 120, 245]]];
      const g = gambarGrid(s, x0, x1, y0, y1, put => d.grid.forEach(([la, lo, v]) => put(lo, la, gradasi(ST, v))));
      C5.kanalST = ST;
      peta.addSource("l5-kanal", {type: "image", url: g.url, coordinates: g.kor});
      peta.addLayer({id: "l5-kanal", type: "raster", source: "l5-kanal", paint: {"raster-opacity": .8, "raster-resampling": "nearest", "raster-fade-duration": 0}}, Peta.lapisAwal()); },
  };
  for (const k of ["hilang", "hilang_api", "peringatan", "satelit"]) pasang[k] = async () => { const c = (await GFW()).lapisan[k];
    const akhir = new Date().toISOString().slice(0, 10), mulai = new Date(Date.now() - (c.hari || 90) * 864e5).toISOString().slice(0, 10);
    peta.addSource("l5-" + k, {type: "raster", tiles: c.tiles.map(t => t.replace("{mulai}", mulai).replace("{akhir}", akhir).replace("{kemarin}", new Date(Date.now() - 864e5).toISOString().slice(0, 10))), tileSize: c.tileSize, minzoom: c.minzoom, maxzoom: c.maxzoom, attribution: c.atribusi});
    peta.addLayer({id: "l5-" + k, type: "raster", source: "l5-" + k, paint: {"raster-opacity": .85, "raster-fade-duration": 0}}, Peta.lapisAwal()); };

  const klik = new Set();
  function klikSekali(id, isi, lebar = 280) { if (klik.has(id)) return; klik.add(id);
    peta.on("click", id, async e => { const html = await isi(e); const pop = new maplibregl.Popup({maxWidth: lebar + "px"}).setLngLat(e.lngLat).setHTML(html).addTo(peta);
      pop.getElement().querySelector("[data-l5k]")?.addEventListener("click", b => { pop.remove(); Laci.buka(b.currentTarget.dataset.l5k); }); });
    peta.on("mouseenter", id, () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", id, () => peta.getCanvas().style.cursor = ""); }

  async function pasangSatu(k) { if (peta.getLayer(LAYER[k][0])) return; try { await pasang[k](); } catch (e) { console.warn(k, e); toast("Lapisan " + k + " gagal dimuat"); } }
  function lihat(k, on) { if (on && !peta.getLayer(LAYER[k][0])) return pasangSatu(k).then(renderLegenda);
    LAYER[k].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none")); renderLegenda(); }

  /* ---------- kejadian ---------- */
  function hubungkan() {
    sisipKotak();
    /* fase tangkap: kunci baru tidak diteruskan ke penangan lama (petanya tidak mengenal kunci ini) */
    $("#lapis").addEventListener("change", e => { const i = e.target.closest("input"); if (!i || !KUNCI.has(i.dataset.l)) return;
      e.stopImmediatePropagation(); if (!peta) return; lihat(i.dataset.l, i.checked); garisWaktu(); garis(); }, true);
    $("#lapis").addEventListener("change", garis); /* setelah penangan lama: jangan sembunyikan garis waktu saat penduduk menyala */
    $("#fwiHari")?.addEventListener("click", () => requestAnimationFrame(async () => { const s = peta?.getSource("l5-penduduk"); if (!s) return;
      const [pen, a] = await Promise.all([muat("penduduk", "data/penduduk.json"), muat("asap", "data/asap.json")]); s.setData(geoPenduduk(pen, a)); }));
    tungguPeta();
    lencanaIklim();
  }
  const garis = () => { if (nyala("penduduk")) $("#garisWaktu")?.classList.add("on"); };
  /* ganti tema = setStyle(diff:false): semua lapisan hilang, pasang ulang yang dicentang */
  function tungguPeta() { if (!peta) return setTimeout(tungguPeta, 300);
    peta.on("style.load", () => setTimeout(() => KUNCI.forEach(k => nyala(k) && pasangSatu(k)), 50)); }

  /* ---------- legenda: ditempel di akhir legenda bawaan ---------- */
  const _leg = renderLegenda;
  renderLegenda = function () { _leg(); const box = document.querySelector("#legDet > div"); if (!box) return; let h = "";
    if (nyala("penduduk")) h += `<div class="lbl" style="margin-top:8px">Penduduk terpapar asap (hari terpilih)</div><div class="leg" style="margin-top:4px">${[1, 2, 3, 4].map(c => `<span><i class="sw dot" style="background:${W_KELAS[c]}"></i>${KELAS[c]}</span>`).join("")}<span>Lingkaran makin besar = makin banyak jiwa</span></div>`;
    if (nyala("fasilitas")) h += `<div class="lbl" style="margin-top:8px">Sekolah & faskes (OSM)</div><div class="leg" style="margin-top:4px"><span><i class="sw dot" style="background:${WARNA.ungu};border:1px solid #fff"></i>Rumah sakit</span><span><i class="sw dot" style="background:${WARNA.biru};border:1px solid #fff"></i>Puskesmas, klinik</span><span><i class="sw dot" style="background:${WARNA.kuning};border:1px solid #fff"></i>Sekolah, PAUD</span><span>Hanya yang terpeta di OSM; banyak sekolah belum ada</span></div>`;
    if (nyala("jalan")) h += `<div class="lbl" style="margin-top:8px">Jalan & sungai</div><div class="leg" style="margin-top:4px">${[[WARNA.merah, "Jalan nasional/primer"], [WARNA.oranye, "Sekunder"], [WARNA.kuning, "Tersier"], [WARNA.biru, "Sungai, rute perahu"]].map(([c, n]) => `<span><i class="sw" style="background:${c};height:3px"></i>${n}</span>`).join("")}<span>Jalan desa & jalan tanah tidak digambar, tetap dihitung di waktu tempuh regu</span></div>`;
    if (nyala("hilang")) h += `<div class="leg" style="margin-top:8px"><span><i class="sw" style="background:#dc6c9c"></i>Hutan hilang 2021–2025 (makin pekat makin baru)</span></div>`;
    if (nyala("hilang_api")) h += `<div class="leg" style="margin-top:8px"><span><i class="sw" style="background:${WARNA.oranye}"></i>Hutan hilang akibat kebakaran 2015–2025</span></div>`;
    if (nyala("satelit")) h += `<div class="leg" style="margin-top:8px"><span>Citra VIIRS NOAA-20 warna asli kemarin (NASA GIBS); asap tampak kelabu-cokelat, awan putih</span></div>`;
    if (nyala("peringatan")) h += `<div class="leg" style="margin-top:8px"><span><i class="sw" style="background:#dc6c9c"></i>Peringatan gangguan hutan 90 hari terakhir (GFW)</span></div>`;
    if (nyala("kanal") && C5.kanalST) h += `<div class="lbl" style="margin-top:8px">Kanal & parit (km per sel ± 2 km)</div><div class="legscale">${[1, 3, 8, 20, 40].map(v => `<i style="background:rgb(${gradasi(C5.kanalST, v).slice(0, 3).join(",")})"></i>`).join("")}</div><div class="legnum"><span>1</span><span>3</span><span>8</span><span>20</span><span>40+</span></div>`;
    if (h) box.insertAdjacentHTML("beforeend", h); };

  /* ---------- laci kompleks: waktu tempuh regu + kanal & fasilitas sekitar ---------- */
  const _buka = Laci.buka.bind(Laci);
  Laci.buka = function (id) { _buka(id); tambahLaci(id); };
  async function tambahLaci(id) {
    const f = S.kluster.features.find(f => f.properties.id === id); if (!f) return; const p = f.properties;
    const ak = await muat("akses", "data/akses.json").catch(() => null);
    if (S.pilihK !== id) return; /* laci sudah pindah ke kompleks lain selama memuat */
    const sesudah = [...document.querySelectorAll("#laci details.lipat")].find(d => d.querySelector("summary")?.textContent.startsWith("Respons terdekat"));
    if (!sesudah || document.querySelector("#laci .l5-akses")) return;
    const fj = j => j < 1 ? Math.round(j * 60) + " menit" : String(Math.round(j * 2) / 2).replace(".", ",") + " jam";
    const a = ak?.[id];
    const tabel = a ? `<table class="tb3"><thead><tr><th>Dari</th><th class="n">Lewat jalan/sungai</th><th class="n">Waktu</th></tr></thead><tbody>
        ${a.dari.map(x => `<tr><td><b>${esc(x.dari)}</b><small>${x.jenis === "daops" ? "Markas Daops" : "Posko disarankan"}</small></td><td class="n num">${fmt(x.km_jalan)} km</td><td class="n num"><b>± ${fj(x.jam)}</b></td></tr>`).join("") || `<tr><td colspan="3">Tidak ada jalur jalan/sungai terpeta dari markas mana pun dalam ${fmt(ak._meta.batas_jam)} jam. Pertimbangkan perahu lewat pesisir atau dukungan udara.</td></tr>`}</tbody></table>
        <p class="fnd">Termasuk ± ${fmt(a.kaki_km)} km jalan kaki dari jalan/sungai terdekat ke titik tengah kompleks (4 km/jam). Laju: primer 50, sekunder 40, tersier 30, jalan tanah 15 km/jam, perahu 15 km/jam. Kondisi jalan, banjir, dan portal kebun tidak dimodelkan. Data jalan © OpenStreetMap.</p>`
      : `<p class="fnd">${ak ? "Belum dihitung: waktu tempuh hanya untuk kompleks prioritas di 9 provinsi pantauan." : "Data waktu tempuh belum tersedia."} Perkiraan garis lurus ada di tabel di atas.</p>`;
    let sekitar = "";
    const kn = Lapis.cache.kanal, fs = Lapis.cache.fasilitas; /* hanya bila lapisannya pernah dinyalakan: laci tidak memaksa unduhan besar */
    if (kn?.provinsi?.includes(p.prov)) { const r = 5; let t = 0; for (const [la, lo, v] of kn.grid) if (Math.abs(la - p.lat) < .06 && Math.abs(lo - p.lon) < .06 && km(p.lat, p.lon, la, lo) <= r) t += v;
      sekitar += `<tr><td>Kanal & parit dalam 5 km</td><td class="n num">${fmt(Math.round(t))} km</td></tr>`; }
    if (fs) { const n = {sekolah: 0, faskes: 0, rs: 0}; for (const x of fs) if (Math.abs(x.lat - p.lat) < .2 && Math.abs(x.lon - p.lon) < .2 && km(p.lat, p.lon, x.lat, x.lon) <= 15) n[x.t]++;
      sekitar += `<tr><td>Sekolah dalam 15 km (OSM)</td><td class="n num">${fmt(n.sekolah)}</td></tr><tr><td>Faskes & RS dalam 15 km</td><td class="n num">${fmt(n.faskes + n.rs)}</td></tr>`; }
    sesudah.insertAdjacentHTML("afterend", `<details class="lipat l5-akses" open><summary>Waktu tempuh regu</summary><div class="isi">${tabel}
      ${sekitar ? `<table class="tb2"><tbody>${sekitar}</tbody></table>` : ""}</div></details>`);
  }

  /* ---------- lencana iklim di kepala halaman ---------- */
  async function lencanaIklim() {
    const ik = await muat("iklim", "data/iklim.json").catch(() => null); if (!ik) return;
    const o = ik.oni_terakhir.nilai, kuat = o >= 2 ? " sangat kuat" : o >= 1.5 ? " kuat" : o >= 1 ? " sedang" : o >= .5 ? " lemah" : "";
    const teks = ik.status === "El Niño" ? "El Niño" + kuat : ik.status === "La Niña" ? "La Niña" : "ENSO netral";
    const iod = ik.iod_status === "IOD positif" ? " · IOD positif" : ik.iod_status === "IOD negatif" ? " · IOD negatif" : "";
    const kering = ik.status === "El Niño" || ik.iod_status === "IOD positif";
    const el = document.createElement("span"); el.className = "l5-iklim" + (kering ? " kering" : "");
    el.textContent = teks + iod; el.title = `ONI ${ik.oni_terakhir.musim} ${ik.oni_terakhir.tahun}: ${o > 0 ? "+" : ""}${o.toFixed(2)} °C · DMI 8 minggu ${ik.dmi_8_minggu > 0 ? "+" : ""}${ik.dmi_8_minggu} °C\n${ik.cpc_status || ""}${kering ? "\nKemarau lebih kering dari biasa: kalender musim memakai pola tahun El Niño." : ""}\nSumber: NOAA CPC & OSMC`;
    const upd = $("#upd"); upd ? upd.before(el) : null;
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", hubungkan) : hubungkan();
})();
