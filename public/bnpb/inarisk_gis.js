"use strict";
/* Tab Web GIS (PRD F-5, F-6, F-7): peta MapLibre, lapisan raster ArcGIS BNPB lewat proksi ubin bercache
   (/api/inarisk/ubin/<layanan>), alat gambar titik/lingkaran/poligon -> /api/inarisk/dampak, titik Lapor Kegiatan per provinsi. */
Ir.tab.gis = {
  pasang() {
    const {H} = Ir;
    if (!window.maplibregl) { $("#gsPesan").textContent = "Peta tidak bisa dimuat."; return; }
    const B = [["banjir", "Banjir"], ["banjir_bandang", "Banjir bandang"], ["gempabumi", "Gempa bumi"], ["kekeringan", "Kekeringan"], ["letusan_gunungapi", "Letusan gunung api"],
      ["tanah_longsor", "Tanah longsor"], ["likuefaksi", "Likuefaksi"], ["tsunami", "Tsunami"], ["gelombang_ekstrim_dan_abrasi", "Gelombang ekstrem dan abrasi"],
      ["kebakaran_hutan_dan_lahan", "Kebakaran hutan dan lahan"], ["cuaca_ekstrim", "Cuaca ekstrem"], ["multi", "Multi bahaya"]];
    /* layanan berkunci token di gis.bnpb.go.id dilewati (DESAIN-TEKNIS, katalog 23 Nov 2026) */
    const GRUP = [
      {id: "bahaya", nama: "Lapisan bahaya", isi: B.map(([k, n]) => ["layer_bahaya_" + k, n])},
      {id: "risiko", nama: "Lapisan risiko", isi: B.filter(([k]) => k !== "tanah_longsor").map(([k, n]) => ["layer_risiko_" + k, n])},
      {id: "kerentanan", nama: "Lapisan kerentanan", isi: B.filter(([k]) => k !== "banjir").map(([k, n]) => ["layer_kerentanan_" + k, n])},
      {id: "kapasitas", nama: "Lapisan kapasitas", isi: [["layer_peta_kapasitas", "Kapasitas daerah"]]},
    ];
    const pilih = {}, opas = {};
    const M = new maplibregl.Map({container: "gsPeta", style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]], fitBoundsOptions: {padding: 20},
      attributionControl: {compact: true}, dragRotate: false, doubleClickZoom: false});
    M.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    M.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-left");
    const ubin = l => `${location.origin}/api/inarisk/ubin/${l}?bbox={bbox-epsg-3857}`;
    const lapisDulu = () => M.getStyle().layers.find(l => l.type === "symbol")?.id;   // overlay di bawah label peta dasar

    /* panel lapisan: peta dasar + tiap grup satu pilihan (radio) dengan opasitas sendiri */
    $("#gsLapis").innerHTML = `<fieldset class="ir-gis-grup"><legend>Peta dasar</legend>` +
      `<label><input type="radio" name="gsDasar" value="terang" checked>Peta terang</label><label><input type="radio" name="gsDasar" value="citra">Citra satelit</label>` +
      `<label><input type="checkbox" id="gsBatas" checked>Batas administrasi</label></fieldset>` +
      GRUP.map(g => `<fieldset class="ir-gis-grup" data-grup="${g.id}"><legend>${esc(g.nama)}</legend>` +
        `<label class="ir-opas">Opasitas<input type="range" min="10" max="100" value="80" data-opas="${g.id}" aria-label="Opasitas ${esc(g.nama)}"><output>80%</output></label>` +
        `<label><input type="radio" name="gs-${g.id}" value="" checked>Tanpa lapisan</label>` +
        g.isi.map(([v, n]) => `<label><input type="radio" name="gs-${g.id}" value="${v}">${esc(n)}</label>`).join("") + `</fieldset>`).join("");

    function pasangLapis(g) {
      const id = "ov-" + g, nilai = pilih[g];
      if (M.getLayer(id)) M.removeLayer(id);
      if (M.getSource(id)) M.removeSource(id);
      if (nilai) {
        M.addSource(id, {type: "raster", tiles: [ubin(nilai)], tileSize: 256, attribution: "Lapisan: InaRISK BNPB"});
        M.addLayer({id, type: "raster", source: id, paint: {"raster-opacity": (opas[g] ?? 80) / 100, "raster-fade-duration": 0}}, lapisDulu());
      }
      const n = Object.values(pilih).filter(Boolean).length;
      $("#gsAktif").textContent = `${n} aktif`;
    }
    function dasar(v) {
      if (!M.getSource("citra")) {
        M.addSource("citra", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 18, attribution: "Citra: Esri"});
        M.addLayer({id: "citra", type: "raster", source: "citra", layout: {visibility: "none"}}, M.getStyle().layers[1]?.id);
      }
      M.setLayoutProperty("citra", "visibility", v === "citra" ? "visible" : "none");
    }
    function batas(on) {
      if (on && !M.getSource("batas")) {
        M.addSource("batas", {type: "raster", tiles: [ubin("batas_administrasi")], tileSize: 256});
        M.addLayer({id: "batas", type: "raster", source: "batas", paint: {"raster-opacity": 0.9}}, lapisDulu());
      }
      if (M.getLayer("batas")) M.setLayoutProperty("batas", "visibility", on ? "visible" : "none");
    }
    $("#gsLapis").addEventListener("change", e => {
      const t = e.target;
      if (t.name === "gsDasar") return dasar(t.value);
      if (t.id === "gsBatas") return batas(t.checked);
      const g = t.closest("[data-grup]")?.dataset.grup;
      if (g && t.type === "radio") { pilih[g] = t.value; pasangLapis(g); }
    });
    $("#gsLapis").addEventListener("input", e => {
      const g = e.target.dataset.opas; if (!g) return;
      opas[g] = +e.target.value; e.target.nextElementSibling.textContent = e.target.value + "%";
      if (M.getLayer("ov-" + g)) M.setPaintProperty("ov-" + g, "raster-opacity", opas[g] / 100);
    });
    $("#gsMati").addEventListener("click", () => {
      for (const g of Object.keys(pilih)) { pilih[g] = ""; pasangLapis(g); }
      for (const r of document.querySelectorAll('#gsLapis input[type=radio][value=""]')) r.checked = true;
    });
    /* ubin yang gagal (server ArcGIS sering 503): beri tahu sekali, peta tetap jalan */
    let galatTerakhir = 0;
    M.on("error", e => { if (/\/api\/inarisk\/ubin\//.test(e?.error?.url || e?.error?.message || "") && Date.now() - galatTerakhir > 8000) { galatTerakhir = Date.now(); pesan("Sebagian ubin lapisan dari server GIS BNPB gagal dimuat. Geser atau perbesar peta untuk mencoba lagi."); } });

    /* ===== alat gambar ===== */
    const KOSONG = {type: "FeatureCollection", features: []};
    let alat = "", titik = [], pusat = null;
    const lingkaran = (c, r, n = 64) => {
      const [lng, lat] = c, dy = r / 111320, dx = r / (111320 * Math.cos(lat * Math.PI / 180));
      const ring = Array.from({length: n + 1}, (_, i) => { const a = (i % n) / n * 2 * Math.PI; return [lng + dx * Math.cos(a), lat + dy * Math.sin(a)]; });
      return {type: "Polygon", coordinates: [ring]};
    };
    const jarak = (a, b) => { const R = 6371008, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
    const gambarData = fitur => M.getSource("gambar")?.setData({type: "FeatureCollection", features: fitur});
    function pesan(t) { $("#gsPesan").textContent = t; }
    function setAlat(a) {
      alat = alat === a ? "" : a; titik = []; pusat = null;
      for (const b of document.querySelectorAll("[data-alat]")) b.setAttribute("aria-pressed", String(b.dataset.alat === alat));
      M.getCanvas().style.cursor = alat ? "crosshair" : "";
      pesan({titik: "Klik peta untuk menaruh titik (radius 1 km).", lingkaran: "Klik pusat lingkaran, lalu klik tepinya.", poligon: "Klik titik sudut. Klik ganda untuk selesai.", "": ""}[alat]);
    }
    document.querySelector(".ir-gis-alat").addEventListener("click", e => {
      const b = e.target.closest("[data-alat]"); if (!b) return;
      if (b.dataset.alat === "hapus") { setAlat(""); gambarData([]); return; }
      setAlat(b.dataset.alat);
    });
    M.on("click", e => {
      if (!alat) return;
      const c = [e.lngLat.lng, e.lngLat.lat];
      if (alat === "titik") { selesai({type: "circle", center: c, r: 1000}, "Titik"); return; }
      if (alat === "lingkaran") {
        if (!pusat) { pusat = c; gambarData([{type: "Feature", geometry: {type: "Point", coordinates: c}}]); pesan("Klik tepi lingkaran."); return; }
        selesai({type: "circle", center: pusat, r: Math.min(50000, Math.max(50, jarak(pusat, c)))}, "Lingkaran"); return;
      }
      titik.push(c);
      gambarData([{type: "Feature", geometry: titik.length > 2 ? {type: "Polygon", coordinates: [[...titik, titik[0]]]} : {type: "LineString", coordinates: titik.length > 1 ? titik : [c, c]}}]);
    });
    M.on("dblclick", e => {
      if (alat !== "poligon") return;
      e.preventDefault();
      if (titik.length < 3) { pesan("Poligon butuh minimal tiga titik sudut."); return; }
      selesai({type: "polygon", ring: [...titik.slice(0, 2000), titik[0]]}, "Poligon");
    });
    async function selesai(g, bentuk) {
      setAlat("");
      const geom = g.type === "circle" ? lingkaran(g.center, g.r) : {type: "Polygon", coordinates: [g.ring]};
      gambarData([{type: "Feature", geometry: geom}]);
      const badan = g.type === "circle"
        ? {type: "circle", crs: "EPSG:4326", center: {lat: g.center[1], lng: g.center[0]}, radius_meter: Math.round(g.r), geometry: {type: "Point", coordinates: g.center}}
        : {type: "polygon", crs: "EPSG:4326", geometry: geom};
      const isi = $("#dlgDampakIsi"), dlg = $("#dlgDampak");
      const ket = g.type === "circle" ? `${bentuk}, radius ${H.angka0(g.r)} m` : `${bentuk}, ${g.ring.length - 1} titik sudut`;
      isi.innerHTML = `<header class="ir-dlg-hd ir-dlg-hd-kecil"><div><h2 id="dlgDampakJ">Informasi gambar</h2><p>${esc(ket)}</p></div><button type="button" class="ir-tutup" data-tutup aria-label="Tutup">×</button></header><p class="ir-p" role="status">Menghitung dampak…</p>`;
      if (!dlg.open) dlg.showModal();
      try {
        const j = await Ir.api("dampak", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(badan)});
        const r = j.result || j.hasil || j;
        const NAMA = [["penduduk", "Penduduk"], ["sekolah", "Sekolah"], ["rs", "Rumah sakit"], ["puskesmas", "Puskesmas"], ["madrasah", "Madrasah"], ["bandara", "Bandara"], ["bangunan", "Bangunan"],
          ["kantor_ojk", "Kantor OJK"], ["kantor_pajak", "Kantor pajak"], ["obvitnas", "Objek vital nasional"], ["pariwisata", "Pariwisata"], ["pelabuhan", "Pelabuhan"], ["perguruan_tinggi", "Perguruan tinggi"]];
        isi.querySelector("[role=status]").outerHTML = `<section class="ir-k"><h3>Dampak penduduk dan sarana</h3><table class="ir-tabel ir-tabel-kv"><tbody>` +
          NAMA.map(([k, n]) => `<tr><td class="ir-lbl">${n}</td><td class="n${Number(r[k]) > 0 ? " ir-tebal" : ""}">${r[k] == null || r[k] === "" || !Number.isFinite(Number(r[k])) ? "–" : H.angka0(Number(r[k]))}</td></tr>`).join("") +
          `</tbody></table></section><p class="ir-ket">Sumber: InaRISK BNPB, kueri spasial dasbor Web GIS.</p>`;
      } catch (err) { isi.querySelector("[role=status]").textContent = err.message; }
    }

    /* ===== Lapor Kegiatan per provinsi dan rentang tanggal ===== */
    const alatBar = document.querySelector(".ir-gis-alat");
    alatBar.insertAdjacentHTML("beforeend", `<label class="ir-gis-tgl">Titik kegiatan<select id="gsKeg"><option value="">Tidak ditampilkan</option><option value="20">Lapor kegiatan</option><option value="4">Sosialisasi</option></select></label>` +
      `<label class="ir-gis-tgl">di<select id="gsKegProv"></select></label>`);
    const kini = new Date(), awalTahun = `${kini.getFullYear()}-01-01`;
    $("#gsDari").value = awalTahun; $("#gsSampai").value = kini.toISOString().slice(0, 10);
    Ir.muat("irbi.json").then(d => { Ir.isiOpsi($("#gsKegProv"), Object.entries(d.prov).sort((a, b) => a[0].localeCompare(b[0]))); $("#gsKegProv").value = "31"; });
    let urlUnduh = "", minta = 0;
    async function kegiatan() {
      const id = $("#gsKeg").value, p = $("#gsKegProv").value, no = ++minta;
      if (urlUnduh) { URL.revokeObjectURL(urlUnduh); urlUnduh = ""; }
      $("#gsUnduh").hidden = true;
      if (!id || !p) { M.getSource("keg")?.setData(KOSONG); return; }
      pesan("Memuat titik kegiatan…");
      try {
        /* hulu tidak menyaring tanggal: saring kolom Tgl (YYYY-MM-DD ...) di sini, rentang inklusif */
        const semua = await Ir.api(`kegiatan/${id}/${p}`), dari = $("#gsDari").value, sampai = $("#gsSampai").value;
        if (no !== minta) return;
        const gj = {type: "FeatureCollection", features: (semua.features || []).filter(f => { const t = String(f.properties?.Tgl || "").slice(0, 10); return (!dari || t >= dari) && (!sampai || t <= sampai); })};
        M.getSource("keg").setData(gj);
        const n = gj.features?.length || 0;
        pesan(`${H.angka0(n)} titik ${id === "20" ? "lapor kegiatan" : "sosialisasi"} pada rentang tanggal ini, dari ${H.angka0(semua.features?.length || 0)} titik di provinsi.`);
        if (n) {
          urlUnduh = URL.createObjectURL(new Blob([JSON.stringify(gj)], {type: "application/geo+json"}));
          Object.assign($("#gsUnduh"), {href: urlUnduh, hidden: false, download: `kegiatan-${p}.geojson`});
          const b = new maplibregl.LngLatBounds(); for (const f of gj.features) if (f.geometry?.type === "Point") b.extend(f.geometry.coordinates);
          if (!b.isEmpty()) M.fitBounds(b, {padding: 60, maxZoom: 12, duration: 500});
        }
      } catch (err) { if (no === minta) pesan(err.message); }
    }
    for (const el of ["#gsKeg", "#gsKegProv", "#gsDari", "#gsSampai"]) $(el).addEventListener("change", kegiatan);

    M.on("load", () => {
      M.addSource("gambar", {type: "geojson", data: KOSONG});
      M.addLayer({id: "gambar-isi", type: "fill", source: "gambar", filter: ["==", ["geometry-type"], "Polygon"], paint: {"fill-color": Ir.warna("--brand2"), "fill-opacity": 0.18}});
      M.addLayer({id: "gambar-garis", type: "line", source: "gambar", paint: {"line-color": Ir.warna("--brand2"), "line-width": 2}});
      M.addLayer({id: "gambar-titik", type: "circle", source: "gambar", filter: ["==", ["geometry-type"], "Point"], paint: {"circle-radius": 5, "circle-color": Ir.warna("--brand2")}});
      M.addSource("keg", {type: "geojson", data: KOSONG});
      M.addLayer({id: "keg", type: "circle", source: "keg", paint: {"circle-radius": 6, "circle-color": Ir.warna("--accent"), "circle-stroke-color": Ir.warna("--card"), "circle-stroke-width": 1.5}});
      batas(true);
      const pop = new maplibregl.Popup({maxWidth: "300px", className: "ir-pop"});
      M.on("click", "keg", e => {
        if (alat) return;
        const p = e.features[0].properties, foto = (() => { try { return JSON.parse(p.Foto || "[]"); } catch { return []; } })();
        pop.setLngLat(e.lngLat).setHTML(`<b>${esc(p.Kegiatan || "Kegiatan")}</b><br>${esc(p.Tgl || "")}<br>${esc(p.Lokasi || "")}<p>${esc(p.Deskripsi || "")}</p>` +
          (foto.length ? foto.map((u, i) => `<a href="${escUrl(u)}" target="_blank" rel="noopener noreferrer">Foto ${i + 1}</a>`).join(" ") : "")).addTo(M);
      });
      M.on("mouseenter", "keg", () => { if (!alat) M.getCanvas().style.cursor = "pointer"; });
      M.on("mouseleave", "keg", () => { if (!alat) M.getCanvas().style.cursor = ""; });
    });
    this.peta = M;
  },
  tampil() { this.peta?.resize(); },
};
