/* Seksi "Prakiraan dan kejadian" di Pantau Dalops (data/kajian-bnpb/prediksi-kejadian/, PK-5 dan PK-6): prakiraan /prediksi pada tanggal lampau
   dibandingkan dengan kejadian logbook Pusdalops dan laporan Lapor Bencana, empat kotak per kab/kota (Kena, Luput, Belum ada laporan, Tenang).
   Dalops hanya MEMBACA prakiraan: /prediksi/data/prediksi.json dan lalu.json, level sel dari window.Besok.levelSel (besok_inti.js). Hitungan murni
   di dalops_hitung.js (pasangkan, ubin, levelTanggal), diuji tests/bnpb/dalops_prakiraan.test.mjs. Titik laporan dari GET /api/dalops/lapor (sesi staf,
   tanpa nama dan nomor WA). Laporan warga hanya bukti terjadi, bukan bukti tidak terjadi. Teks data lewat textContent; tanpa gaya/skrip inline (CSP).
   Peta dibuat malas (satu konteks WebGL per tab terlalu banyak bila semua tab membuatnya): baru saat seksi terlihat. */
(g => {
  "use strict";
  const H = g.DalopsHitung;
  const kache = {};
  const baca = n => kache[n] ||= fetch(`/prediksi/data/${n}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
  const LAPOR = new Set(["banjir", "longsor", "cuaca", "gelombang", "karhutla"]);   // jenis yang dikenal rute /api/dalops/lapor
  const lapor = {};
  const ambilLapor = (jenis, sejak) => lapor[jenis] ||= fetch(`/api/dalops/lapor?jenis=${jenis}&sejak=${sejak}`, {credentials: "same-origin"})
    .then(r => r.ok ? r.json() : null).then(j => Array.isArray(j?.laporan) ? j.laporan : null).catch(() => null);
  const IK_LEVEL = ["ok", "peringatan", "peringatan", "peringatan"];
  const KOTAK = {
    kena: ["Kena", "centang", "Diprakirakan Siaga atau Awas, dan ada kejadian atau laporan dalam satu hari dari tanggal itu"],
    luput: ["Luput", "peringatan", "Tidak diprakirakan Siaga atau Awas, tetapi ada kejadian atau laporan dalam satu hari dari tanggal itu"],
    belum: ["Belum ada laporan", "tunggu", "Diprakirakan Siaga atau Awas, belum ada kejadian atau laporan. Belum tentu tidak terjadi: cakupan logbook tidak merata"],
    tenang: ["Tenang", "ok", "Tidak diprakirakan Siaga atau Awas, dan belum ada kejadian atau laporan"]};
  const WARNA_JENIS = {banjir: "--kat-banjir", longsor: "--kat-longsor", cuaca: "--kat-cuaca", gelombang: "--kat-gelombang", karhutla: "--kat-karhutla", udara: "--kat-lain"};
  const WARNA_LEVEL = ["--dp-belum", "--f1", "--f2", "--f3"];
  const MAKS_BARIS = 120;

  /* token CSS -> "rgb(r, g, b)": MapLibre tidak mengurai oklch, jadi diratakan lewat kanvas */
  const rgb = (() => { const c = document.createElement("canvas").getContext("2d", {willReadFrequently: true}); c.canvas.width = c.canvas.height = 1;
    return nama => { const v = getComputedStyle(document.documentElement).getPropertyValue(nama).trim(); if (!v) return "rgb(128, 128, 128)";
      c.clearRect(0, 0, 1, 1); c.fillStyle = v; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]}, ${d[1]}, ${d[2]})`; }; })();
  /* titik tengah kotak batas dari koordinat bersarang (loop rekursif, tanpa JSON.stringify); dihitung malas, hanya untuk kab yang dipakai */
  const bbox = geom => { let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    const jalan = a => { if (typeof a[0] === "number") { if (a[0] < x0) x0 = a[0]; if (a[0] > x1) x1 = a[0]; if (a[1] < y0) y0 = a[1]; if (a[1] > y1) y1 = a[1]; } else for (const b of a) jalan(b); };
    jalan(geom.coordinates); return [(x0 + x1) / 2, (y0 + y1) / 2]; };
  const disposer = {};   // jenis -> pembersih seksi sebelumnya (render ulang membuat seksi baru; peta lama harus remove())

  function seksi(U, {jenis, kejadian = [], hariIni = H.tglWIB(Date.now())}) {
    const {h, F, ikon} = U, LS = g.Besok?.levelSel;
    let peta = null, ro = null, io = null;
    disposer[jenis]?.(); disposer[jenis] = () => { io?.disconnect(); ro?.disconnect(); peta?.remove(); peta = null; };   // pola wadah._peta dalops.js: peta lama dilepas
    const isi = h("div", {class: "pk-isi"}, h("p", {class: "bn-pesan", role: "status", teks: "Memuat prakiraan…"}));
    const sec = U.bagian("pk-" + jenis, "peringatan", "Prakiraan dan kejadian", "", isi);
    const sejak = H.tglWIB(Date.parse(hariIni + "T00:00:00+07:00") - 9 * 864e5);   // paling jauh 14 hari (rute); cukup untuk 7 hari lalu plus jendela satu hari
    Promise.all([baca("prediksi"), baca("lalu"), LAPOR.has(jenis) ? ambilLapor(jenis, sejak) : Promise.resolve([])])
      .then(([pred, lalu, lap]) => mulai(pred, lalu, lap)).catch(() => isi.replaceChildren(U.kosong("peringatan", "Prakiraan gagal dimuat, coba muat ulang.")));
    return sec;

    function mulai(pred, lalu, lap) {
      if (!LS || !pred?.kab || !lalu?.hari) return isi.replaceChildren(U.kosong("peringatan", "Prakiraan belum termuat, coba muat ulang."));
      const kodes = H.PRAK_KUNCI[H.PRAK[jenis]] || [];
      const tanggal = Object.keys(lalu.hari).filter(t => t < hariIni && H.selisih(hariIni, t) <= 7 && kodes.some(c => lalu.hari[t]?.[c])).sort().reverse();
      if (!tanggal.length) return isi.replaceChildren(U.kosong("kalender", "Belum ada prakiraan tersimpan untuk tujuh hari terakhir."));
      const geoId = new Map(pred.kab.map(k => [k.geo, k.id])), info = new Map(pred.kab.map(k => [k.id, k]));
      const kej = kejadian.map(k => ({...k, kab: (k.kab_kode || []).map(c => geoId.get(c)).filter(Boolean)}));
      const lapAll = (lap || []).map(l => ({...l, kab: String(l.kab || "").replace(".", ""), tanggal: H.tglWIB(l.waktu)}));
      let T = tanggal[0], saring = null, baris = [];
      const hitung = () => H.pasangkan({T, hariIni, level: H.levelTanggal(jenis, lalu, T, LS), kejadian: kej, laporan: lapAll})
        .sort((a, b) => b.level - a.level || String(info.get(a.id)?.nama).localeCompare(String(info.get(b.id)?.nama), "id"));

      /* kepala: pemilih tanggal (segmen); chrome bereaksi seketika, hitung dan gambar ditunda sesudah frame (INP) */
      const tombolTgl = tanggal.map(t => { const b = h("button", {type: "button", class: "dl-saring-btn pk-tgl-btn", "aria-pressed": String(t === T), "data-tgl": t}, ikon("kalender"), H.tglPendek(t));
        b.addEventListener("click", () => { if (t === T) return; T = t; tombolTgl.forEach(x => x.setAttribute("aria-pressed", String(x === b))); g.nanti(perbarui); }); return b; });
      sec.querySelector(".ex-jd")?.append(h("div", {class: "dl-saring pk-tgl", role: "group", "aria-label": "Tanggal prakiraan"}, tombolTgl));

      /* empat ubin; klik = saring tabel dan peta, klik lagi = lepas */
      const angka = {}, tUbin = Object.entries(KOTAK).map(([k, [nama, ik, ket]]) => {
        const n = h("b", {teks: "0"}), sub = h("small"), b = h("button", {type: "button", class: "pk-ubin pk-ubin-" + k, "aria-pressed": "false", title: ket}, h("i", null, ikon(ik)), h("span", {teks: nama}), n, sub);
        angka[k] = {n, sub};
        b.addEventListener("click", () => { saring = saring === k ? null : k; tUbin.forEach(x => x.setAttribute("aria-pressed", String(x.dataset.kotak === saring))); g.nanti(() => { gambarTabel(); g.nanti(terapPeta); }); });
        b.dataset.kotak = k; return b; });
      const catatan = h("p", {class: "pk-catatan"});
      const wadahPeta = h("div", {class: "dl-peta pk-peta"}, h("p", {class: "bn-pesan", teks: "Peta dimuat saat terlihat…"})), wadahTabel = h("div", {class: "pk-tabel"});
      isi.replaceChildren(h("div", {class: "pk-ubin-grid", role: "group", "aria-label": "Kotak prakiraan lawan kejadian"}, tUbin), catatan, wadahPeta, wadahTabel);

      const pilLevel = lv => h("span", {class: "dl-st dl-l" + lv}, ikon(IK_LEVEL[lv]), H.NAMA_LEVEL[lv]);
      const pilKotak = (k, menunggu) => h("span", {class: "dl-tag pk-kotak pk-kotak-" + k}, ikon(KOTAK[k][1]), menunggu ? "Menunggu laporan" : KOTAK[k][0]);
      const adaLap = lap !== null && LAPOR.has(jenis);   // false = laporan tidak tersedia (gagal dimuat atau jenis tanpa padanan)
      const tampilBaris = () => baris.filter(b => saring ? b.kotak === saring : b.kotak === "kena" || b.kotak === "luput");

      function gambarUbin() {
        const u = H.ubin(baris);
        for (const k of Object.keys(KOTAK)) { angka[k].n.textContent = F(u[k]); angka[k].sub.textContent = k === "belum" && u.menunggu ? "sebagian menunggu laporan" : "kab/kota"; }
        if (lap === null) { angka.tenang.n.textContent = "–"; angka.tenang.sub.textContent = "belum lengkap"; angka.belum.sub.textContent = "tanpa laporan warga"; }   // tanpa laporan, Tenang dan Belum ada laporan tidak bisa dibedakan
        const ketLap = lap === null ? "Titik laporan warga dan BPBD belum tersedia." : LAPOR.has(jenis) ? "" : "Kualitas udara tidak punya padanan di Lapor Bencana.";
        catatan.textContent = "Kab/kota tanpa prakiraan pada tanggal itu tidak dihitung. Kejadian dan laporan dalam satu hari dari tanggal itu dihitung terjadi. " + ketLap;
      }

      function gambarTabel(semua = false, fokus = -1) {
        const xs = tampilBaris(), potong = semua ? xs : xs.slice(0, MAKS_BARIS);
        if (!xs.length) return wadahTabel.replaceChildren(U.kosong("ok", saring ? `Tidak ada kab/kota di kotak ${KOTAK[saring][0]} pada ${H.tglPendek(T)}.` : `Tidak ada kab/kota Kena atau Luput pada ${H.tglPendek(T)}.`));
        const tr = potong.map((b, i) => { const k = info.get(b.id), nL = n => b.laporan.filter(l => l.tingkat === n).length;
          const kejCel = [...b.kejadian.map(x => h("div", {teks: "Mulai " + H.tglPendek(x.mulai)})), ...b.berlangsung.map(x => h("div", {class: "bn-label", teks: "Masih berlangsung sejak " + H.tglPendek(x.mulai)}))];
          return h("tr", {class: "pk-baris", tabindex: "0", "data-kab": b.id}, U.td(F(i + 1), true), h("td", null, h("b", {teks: k.nama})), h("td", {teks: k.pn || ""}), U.tdv(pilLevel(b.level), b.level),
            h("td", null, ...(kejCel.length ? kejCel : ["–"])), U.tdv(adaLap ? `${F(nL("warga"))} warga, ${F(nL("bpbd"))} BPBD` : "–", adaLap ? b.laporan.length : -1), U.tdv(pilKotak(b.kotak, b.menunggu), ["kena", "luput", "belum", "tenang"].indexOf(b.kotak))); });
        const tbody = h("tbody", null, ...tr);   // satu pendengar di tbody, bukan satu per baris
        tbody.addEventListener("click", e => { const r = e.target.closest("tr.pk-baris"); if (r) bukaKab(r.dataset.kab); });
        tbody.addEventListener("keydown", e => { const r = e.key === "Enter" && e.target.closest("tr.pk-baris"); if (r) bukaKab(r.dataset.kab); });
        const tb = U.tabelStd(["No", "Kab/kota", "Provinsi", "Prakiraan", "Kejadian Dalops", "Laporan", "Kotak"], tbody);
        const semuaBtn = xs.length > potong.length ? h("button", {type: "button", class: "dl-saring-btn pk-semua"}, ikon("daftar"), `Tampilkan semua ${F(xs.length)} kab/kota`) : null;
        semuaBtn?.addEventListener("click", () => { semuaBtn.disabled = true; semuaBtn.lastChild.textContent = "Memuat…"; g.nanti(() => gambarTabel(true, potong.length)); });   // chrome tombol seketika, baris menyusul
        wadahTabel.replaceChildren(tb, ...(semuaBtn ? [semuaBtn] : []));
        if (fokus >= 0) tbody.rows[fokus]?.focus({preventScroll: false});   // fokus kembali ke baris pertama yang baru
        U.pasangTip?.();
      }

      /* ---------- peta (malas) ---------- */
      let petaJanji = null, pop = null; const fid = new Map(), geom = new Map(), pusat = new Map(), terap = new Map();
      const titik = id => pusat.get(id) || (geom.has(id) ? (pusat.set(id, bbox(geom.get(id))), pusat.get(id)) : null);
      const mulaiPeta = () => petaJanji ||= buatPeta().catch(() => { wadahPeta.replaceChildren(U.kosong("peringatan", "Peta gagal dimuat, coba muat ulang.")); return null; });
      async function buatPeta() {
        if (!g.maplibregl) throw new Error("tanpa maplibre");
        const provs = [...new Set(pred.kab.map(k => k.prov))], geo = await Promise.all(provs.map(p => U.ambilGeo(`/geo/kabupaten/${p}.json`))), fitur = [];
        geo.forEach((gj, i) => (gj?.features || []).forEach(f => { const id = geoId.get(provs[i] + "|" + f.properties.kab); if (!id) return;
          fid.set(id, fitur.length); geom.set(id, f.geometry); fitur.push({type: "Feature", id: fitur.length, properties: {kode: id}, geometry: f.geometry}); }));
        wadahPeta.replaceChildren();
        peta = new maplibregl.Map({container: wadahPeta, style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]], fitBoundsOptions: {padding: 16},
          minZoom: 3, maxZoom: 12, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
        peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right"); peta.touchZoomRotate.disableRotation();
        ro = new ResizeObserver(() => peta?.resize()); ro.observe(wadahPeta);   // panel tersembunyi saat lahir: ukur ulang saat tampil
        const c = WARNA_LEVEL.map(rgb), navy = rgb("--ink"), putih = rgb("--card"), wJenis = rgb(WARNA_JENIS[jenis] || "--kat-lain");
        await new Promise(ok => peta.on("load", ok));
        peta.addSource("kab", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
        peta.addLayer({id: "pk-isi", type: "fill", source: "kab", paint: {"fill-color": ["match", ["coalesce", ["feature-state", "lv"], -1], 0, c[0], 1, c[1], 2, c[2], 3, c[3], "rgba(0, 0, 0, 0)"],
          "fill-opacity": ["case", ["==", ["coalesce", ["feature-state", "ok"], 1], 0], .12, .75]}});
        peta.addLayer({id: "pk-garis", type: "line", source: "kab", paint: {"line-color": putih, "line-width": .6}});
        for (const id of ["kej", "lap"]) peta.addSource(id, {type: "geojson", data: {type: "FeatureCollection", features: []}});
        const segitiga = (isi, tepi) => { const r = devicePixelRatio > 1 ? 2 : 1, n = 22 * r, cv = document.createElement("canvas"); cv.width = cv.height = n; const x = cv.getContext("2d"); x.scale(r, r);
          x.beginPath(); x.moveTo(11, 2); x.lineTo(20, 19); x.lineTo(2, 19); x.closePath(); x.fillStyle = isi; x.strokeStyle = tepi; x.lineWidth = 2; x.fill(); x.stroke();
          return {width: n, height: n, data: x.getImageData(0, 0, n, n).data}; };
        peta.addImage("pk-bpbd", segitiga(wJenis, putih), {pixelRatio: devicePixelRatio > 1 ? 2 : 1});
        peta.addLayer({id: "pk-kej", type: "circle", source: "kej", paint: {"circle-color": navy, "circle-radius": 6, "circle-stroke-color": putih, "circle-stroke-width": 1.5}});
        peta.addLayer({id: "pk-warga", type: "circle", source: "lap", filter: ["==", ["get", "tingkat"], "warga"], paint: {"circle-color": putih, "circle-radius": 5.5, "circle-stroke-color": wJenis, "circle-stroke-width": 2.5}});
        peta.addLayer({id: "pk-bpbd", type: "symbol", source: "lap", filter: ["==", ["get", "tingkat"], "bpbd"], layout: {"icon-image": "pk-bpbd", "icon-allow-overlap": true}});
        peta.addLayer({id: "pk-belum", type: "circle", source: "lap", filter: ["==", ["get", "belum"], 1], paint: {"circle-color": navy, "circle-radius": 1.8}});
        pop = new maplibregl.Popup({closeButton: true, closeOnClick: false, maxWidth: "300px", offset: 12, className: "dl-popup"});
        peta.on("click", "pk-isi", e => bukaKab(e.features[0].properties.kode, e.lngLat));
        peta.on("mouseenter", "pk-isi", () => { peta.getCanvas().style.cursor = "pointer"; }); peta.on("mouseleave", "pk-isi", () => { peta.getCanvas().style.cursor = ""; });
        wadahPeta.append(h("div", {class: "pk-leg pk-j-" + jenis},
          ...[["Waspada", 1], ["Siaga", 2], ["Awas", 3]].map(([t, lv]) => h("span", {class: "pk-leg-i"}, h("i", {class: "pk-w" + lv}), "Prakiraan " + t)),
          h("span", {class: "pk-leg-i"}, h("i", {class: "pk-leg-kej"}), "Kejadian Dalops"), ...LAPOR.has(jenis) ? [h("span", {class: "pk-leg-i"}, h("i", {class: "pk-leg-bpbd"}), "Laporan BPBD"),
            h("span", {class: "pk-leg-i"}, h("i", {class: "pk-leg-warga"}), "Laporan warga"), h("span", {class: "pk-leg-i"}, h("i", {class: "pk-leg-belum"}), "Belum diperiksa")] : []),
          h("span", {class: "pk-pil"}));
        terapPeta();
        return peta;
      }
      function terapPeta() {
        if (!peta || !peta.getSource("kej")) return;
        const per = new Map(baris.map(b => [b.id, b]));
        for (const [id, i] of fid) { const b = per.get(id), lv = b ? b.level : -1, ok = !b || (saring && b.kotak !== saring) ? 0 : 1, k = lv + "|" + ok;
          if (terap.get(id) !== k) { terap.set(id, k); peta.setFeatureState({source: "kab", id: i}, {lv, ok}); } }   // hanya kab yang berubah
        const pt = [], lp = [];
        for (const b of baris) { if (saring && b.kotak !== saring) continue; const p = b.kejadian.length ? titik(b.id) : null;
          if (p) pt.push({type: "Feature", properties: {kab: b.id}, geometry: {type: "Point", coordinates: p}});
          for (const l of b.laporan) if (Number.isFinite(l.lat) && Number.isFinite(l.lon)) lp.push({type: "Feature", properties: {tingkat: l.tingkat, belum: l.periksa ? 0 : 1, kab: b.id}, geometry: {type: "Point", coordinates: [l.lon, l.lat]}}); }
        peta.getSource("kej").setData({type: "FeatureCollection", features: pt}); peta.getSource("lap").setData({type: "FeatureCollection", features: lp});
        const pil = wadahPeta.querySelector(".pk-pil"); if (pil) pil.textContent = `${F(pt.length)} kab/kota berkejadian, ${adaLap ? F(lp.length) : "–"} laporan`;
      }
      async function bukaKab(id, lngLat) {
        const p = await mulaiPeta(); if (!p || !peta) return; const k = info.get(id), b = baris.find(x => x.id === id), at = lngLat || titik(id); if (!k || !at) return;
        const daftar = (judul, xs, teks) => xs.length ? h("div", {class: "pk-pop-b"}, h("b", {teks: judul}), ...xs.map(x => h("div", {teks: teks(x)}))) : null;
        const kartu = h("div", {class: "pk-pop"}, h("div", {class: "pk-pop-k"}, h("b", {teks: k.nama}), h("span", {class: "bn-label", teks: k.pn || ""})),
          h("div", {class: "dl-chips"}, b ? pilLevel(b.level) : label("Tanpa prakiraan"), b ? pilKotak(b.kotak, b.menunggu) : null),
          b ? daftar("Kejadian Dalops", b.kejadian, x => `${x.id ? x.id + ", " : ""}mulai ${H.tglPendek(x.mulai)}`) : null,
          b ? daftar("Masih berlangsung", b.berlangsung, x => `${x.id ? x.id + ", " : ""}sejak ${H.tglPendek(x.mulai)}`) : null,
          b ? daftar("Laporan", b.laporan, x => `${x.tiket}, ${x.tingkat === "bpbd" ? "BPBD" : "warga"}, ${x.periksa ? "periksa: " + x.periksa : "belum diperiksa"}`) : null);
        pop.setLngLat(at).setDOMContent(kartu).addTo(p);
      }
      const label = t => h("span", {class: "dl-tag", teks: t});

      function perbarui() { baris = hitung(); gambarUbin(); gambarTabel(); g.nanti(terapPeta); }   // tabel dan peta dua tugas berurutan (INP)
      perbarui();
      /* peta lahir saat seksi terlihat (panel aktif dan di layar), bukan saat tab lain dirender di latar */
      io = new IntersectionObserver((es, ob) => { if (es.some(e => e.isIntersecting)) { ob.disconnect(); mulaiPeta(); } }, {rootMargin: "200px"}); io.observe(wadahPeta);
    }
  }

  g.DalopsPrakiraan = {seksi, prediksi: () => baca("prediksi")};
})(window);
