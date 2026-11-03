/* Operasi (/bnpb/operasi-lapangan), OP-3: peta operasi udara harian dari GET /api/operasi/peta?tanggal= (src/operasi_udara.js).
   Spek: docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 9. Hitungan penyajian ada di operasi_lapangan_hitung.js (murni, diuji).
   INP: ganti tanggal/segmen/klik base langsung mengecat chrome; peta dan daftar berat sesudah dua rAF. Tanpa skrip/gaya inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {ikon, h} = window.Wilayah, O = window.OperasiLapangan, app = document.getElementById("app"), NS = "http://www.w3.org/2000/svg";
  const st = {tanggal: O.hariIniWIB(), segmen: "pagi", base: null, data: null, super: false, ...{rentang: O.rentangBawaan()}, nilai: null};
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

  /* ---------- kerangka ---------- */
  function kerangka() {
    el.tgl = h("input", {type: "date", class: "ol-tgl", value: st.tanggal, "aria-label": "Tanggal operasi"});
    el.seg = h("div", {class: "ol-pilih ol-seg", role: "radiogroup", "aria-label": "Waktu"}, O.SEGMEN.map(([v, t, ik]) => h("label", null, h("input", {type: "radio", name: "segmen", value: v, ...(v === st.segmen ? {checked: ""} : {})}), ikon(ik), t)));
    el.dari = h("input", {type: "date", class: "ol-tgl", value: st.rentang.dari, "aria-label": "Dari tanggal"}); el.sampai = h("input", {type: "date", class: "ol-tgl", value: st.rentang.sampai, "aria-label": "Sampai tanggal"});
    el.rentang = h("div", {class: "ol-rentang", hidden: ""}, h("label", null, "Dari", el.dari), h("label", null, "Sampai", el.sampai), h("p", {class: "ol-sumber", teks: "Rentang paling lama 31 hari."}));
    el.pesan = h("p", {class: "bn-pesan", role: "status"}); el.bawah = h("div", {class: "ol-bawah"}); el.dummy = h("div", {class: "ol-aksi"}); el.bandera = h("p", {class: "ol-dummy", hidden: "", teks: "DATA DUMMY ditampilkan, bukan laporan nyata."});
    el.kartu = h("div", {class: "bn-grid ol-ringkas"}); el.peta = h("div", {class: "ol-peta", role: "application", "aria-label": "Peta operasi udara"}); el.panel = h("div", {class: "ol-panel"}); el.kaki = h("p", {class: "ol-sumber"});
    app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Operasi"}), h("div", {class: "bn-aksi"}, el.dummy)),
      h("section", {class: "bn-blok"}, h("div", {class: "ol-baris"}, el.tgl, el.seg), el.rentang, el.pesan), el.bandera, el.kartu,
      el.tengah = h("div", {class: "ol-tengah"}, el.peta, el.panel), el.bawah, el.kaki);
    el.seg.addEventListener("change", e => { if (e.target.name === "segmen") { st.segmen = e.target.value; const n = st.segmen === "nilai"; el.rentang.hidden = !n; el.tgl.hidden = n; render(); } });   // radio sudah dicat peramban; render berat sesudah frame
    const gantiRentang = ubah => { const r = O.klampRentang(el.dari.value || st.rentang.dari, el.sampai.value || st.rentang.sampai, ubah);
      el.dari.value = r.dari; el.sampai.value = r.sampai; st.rentang = r; st.nilai = null; if (st.segmen === "nilai") render(); };   // chrome dicat dulu; fetch sesudah rAF di render
    el.dari.addEventListener("change", () => gantiRentang("dari")); el.sampai.addEventListener("change", () => gantiRentang("sampai"));
    el.tgl.addEventListener("change", () => { if (/^\d{4}-\d{2}-\d{2}$/.test(el.tgl.value)) { st.tanggal = el.tgl.value; st.base = null; muat(); } });
  }
  function masuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}), h("p", {teks: s === 403 ? "Akunmu belum berhak membuka halaman ini. Hanya staf Pusdalops, Koordalops, Pimpinan, Udara, dan TMC." : "Halaman operasi hanya untuk staf. Masuk dulu."}),
      h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search), teks: "Masuk staf"})));
  }

  /* ---------- muat data ---------- */
  const muat = () => new Promise(selesai => {
    const n = ++nomor; tampil("Memuat…"); el.tgl.value = st.tanggal;
    sesudahFrame(async () => { try {
      const r = await api("GET", "/api/operasi/peta?tanggal=" + encodeURIComponent(st.tanggal)); if (n !== nomor) return;
      if (!r.ok) { if (r.s === 401 || r.s === 403) return masuk(r.s); st.data = null; el.bandera.hidden = true; el.kartu.replaceChildren(); el.tengah.hidden = true; el.kaki.textContent = ""; return tampil(galatTeks(r), false); }
      tampil(""); el.tengah.hidden = false; st.data = r.j; render();
    } finally { selesai(); } });
  });

  /* ---------- render ---------- */
  function render() {
    const n = ++nomor; if (!st.data) return;
    sesudahFrame(() => { if (n !== nomor) return;
      const d = O.saringSegmen(st.data, st.segmen), adaDummy = [st.data.armada, st.data.gerak, st.data.temuan].some(l => (l || []).some(x => x.dummy));
      el.bandera.hidden = !adaDummy; renderKartu(d); renderPeta(d); renderPanel(d);
      el.kaki.textContent = `Tanggal ${O.tanggalIndo(st.data.tanggal)}. Sumber: ${O.sumberTeks(st.data)}. Luas dari pilot hanya klaim pilot, bukan angka luas terbakar sistem. Tanpa jam tercatat dihitung di Pagi.`;
    });
  }
  function renderKartu(d) {
    if (st.segmen === "nilai") return renderNilai();
    el.bawah.replaceChildren(); el.kaki.hidden = false; el.kartu.className = "bn-grid ol-ringkas";
    const r = O.ringkas(d), seg = st.segmen;
    const temuanKartu = h("article", {class: "bn-kartu ol-kartu"}, h("h2", null, ikon("peringatan"), "Temuan patroli"), h("div", {class: "bn-angka", teks: O.fmt(r.temuanTotal)}),
      h("div", {class: "ol-pils"}, O.URUT_TEMUAN.map(s => pil(`${O.STATUS_TEMUAN[s].nama} ${O.fmt(r.temuan[s])}`, O.kelasTemuan(s)))), h("p", {class: "ol-sumber", teks: "Sumber: " + O.sumberTeks(d, "temuan")}));
    const armadaKartu = h("article", {class: "bn-kartu ol-kartu"}, h("h2", null, ikon("personel"), "Armada siap"), h("div", {class: "bn-angka", teks: `${O.fmt(r.siap)} dari ${O.fmt(r.armada)}`}),
      h("div", {class: "ol-pils"}, pil(`Tidak siap ${O.fmt(r.tidak)}`, "ol-s-tidak"), pil(`Belum ada laporan ${O.fmt(r.belum)}`, "ol-s-belum")), h("p", {class: "ol-sumber", teks: "Sumber: " + O.sumberTeks(d, "armada")}));
    const sortieKartu = h("article", {class: "bn-kartu ol-kartu"}, h("h2", null, ikon("lanjut"), "Sortie berangkat"), h("div", {class: "bn-angka", teks: O.fmt(r.sortie)}),
      h("p", {class: "ol-sumber", teks: "Sumber: " + O.sumberTeks(d, "gerak") + (seg === "pagi" || seg === "siang" ? `, segmen ${seg}` : "")}));
    el.kartu.replaceChildren(temuanKartu, armadaKartu, sortieKartu);
  }

  /* peta: penanda DOM (jalan walau gaya dasar gagal dimuat), garis dan cincin sebagai lapisan sesudah gaya siap */
  function bersihPeta() { for (const m of lapis) m.remove(); lapis = []; }
  const popup = (m, teks) => { const p = new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 14, className: "ol-pop"});
    m.getElement().addEventListener("mouseenter", () => p.setLngLat(m.getLngLat()).setText(teks).addTo(peta)); m.getElement().addEventListener("mouseleave", () => p.remove()); };
  const titik = (lon, lat, node, teks, anchor) => { const m = new maplibregl.Marker({element: node, anchor: anchor || "center"}).setLngLat([lon, lat]).addTo(peta); lapis.push(m); popup(m, teks); node.setAttribute("title", teks); return m; };
  function renderPeta(d) {
    if (!peta) { if (!window.maplibregl) { el.peta.replaceChildren(kosong("Peta tidak termuat.")); return; }
      peta = new maplibregl.Map({container: el.peta, style: "https://tiles.openfreemap.org/styles/positron", center: [112, -1.5], zoom: 4.5, minZoom: 3, maxZoom: 16, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
      peta.on("error", () => {});   // gaya dasar gagal (offline): penanda tetap tampil
      peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right"); }
    bersihPeta(); const batas = new maplibregl.LngLatBounds(), tambah = (lon, lat) => batas.extend([lon, lat]);
    for (const b of st.data.base || []) {
      const ar = (st.data.armada || []).filter(a => a.base_id === b.id), node = h("div", {class: "ol-m ol-base" + (b.id === st.base ? " pilih" : ""), "data-base": b.id});
      const s = svg("svg", {viewBox: "0 0 24 24", "aria-hidden": "true"}); s.append(svg("circle", {cx: 12, cy: 12, r: 11, class: "tanah"}), svg("path", {d: "M6 17V10l6-4 6 4v7M10 17v-4h4v4", class: "garis"}));
      node.append(s, h("div", {class: "ol-titik"}, ar.map(a => h("b", {class: O.kelasArmada(a.status)})))); tambah(b.lon, b.lat);
      const bs = O.ringkas({armada: ar});
      titik(b.lon, b.lat, node, `${b.nama} (${b.icao || b.id}): ${O.fmt(ar.length)} armada, ${O.fmt(bs.siap)} siap`, "center");
      node.addEventListener("click", () => pilihBase(b.id)); }
    for (const t of d.temuan || []) { const s = O.STATUS_TEMUAN[t.status] || O.STATUS_TEMUAN.clear; tambah(t.lon, t.lat);
      titik(t.lon, t.lat, ikonPeta(s.bentuk, s.kelas), [t.registrasi, s.nama, t.lokasi, O.klaimTeks(t)].filter(Boolean).join(", ")); }
    for (const x of d.gerak || []) if (x.lat != null && x.lon != null) { tambah(x.lon, x.lat);
      titik(x.lon, x.lat, ikonPeta("kotak", "ol-wb"), [x.registrasi, x.misi || "target", x.lokasi, x.jam_utc ? O.jamWIB(x.jam_utc) : ""].filter(Boolean).join(", ")); }
    if (!batas.isEmpty()) peta.fitBounds(batas, {padding: 60, maxZoom: 9, duration: 0});
    const garis = O.garisRujukan(d), cin = (st.data.base || []).map(b => { const nm = Math.max(0, ...(st.data.armada || []).filter(a => a.base_id === b.id).map(a => a.jelajah_nm || 0)); return nm ? {type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [O.cincin(b.lat, b.lon, nm)]}} : null; }).filter(Boolean);
    const lapisan = () => { try {
      const warna = getComputedStyle(document.documentElement).getPropertyValue("--c5").trim() || "#2563eb", fc = f => ({type: "FeatureCollection", features: f});
      const ada = (id, jenis, data, paint) => { if (peta.getSource(id)) peta.getSource(id).setData(data); else { peta.addSource(id, {type: "geojson", data}); peta.addLayer({id, source: id, type: jenis, paint}); } };
      ada("ol-cincin", "line", fc(cin), {"line-color": warna, "line-width": 1, "line-dasharray": [2, 2], "line-opacity": .6});
      ada("ol-rujukan", "line", fc(garis.map(g => ({type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: [g.dari, g.ke]}}))), {"line-color": warna, "line-width": 2, "line-dasharray": [4, 2]});
    } catch (e) {} };
    peta.isStyleLoaded() ? lapisan() : peta.once("load", lapisan);
    peta.resize();
  }
  function pilihBase(id) {   // chrome dulu: sorot base langsung; panel sesudah frame
    st.base = id === st.base && st.segmen === "nilai" ? null : id; for (const n of el.peta.querySelectorAll(".ol-base")) n.classList.toggle("pilih", n.dataset.base === st.base);
    sesudahFrame(() => { renderPanel(O.saringSegmen(st.data, st.segmen)); if (st.segmen === "nilai") tampilNilai(); });
  }
  function renderPanel(d) {
    const out = [], b = (st.data.base || []).find(x => x.id === st.base);
    if (st.segmen === "nilai") { const nb = (st.data.base || []).find(x => x.id === st.base);
      return el.panel.replaceChildren(h("h2", {class: "ol-judul"}, ikon("pin"), nb ? `Disaring: ${nb.nama}` : "Semua base"),
        kosong(nb ? "Kartu dan tabel pesawat hanya untuk base ini." : "Klik sebuah base di peta untuk menyaring kartu dan tabel pesawat."),
        ...nb ? [h("button", {class: "ad-tombol", type: "button", "data-semua": "1", teks: "Tampilkan semua base"})] : []); }
    if (st.segmen === "renlap") { const rl = st.data.renlap || [];
      return el.panel.replaceChildren(h("h2", {class: "ol-judul"}, ikon("malam"), "Renlap malam"), rl.length ? tabel(["Base", "Versi", "Target"], rl.map(r => [r.base_id, r.versi, O.fmt((r.target || []).length)])) : kosong("Belum ada renlap untuk tanggal ini.")); }
    if (!b) return el.panel.replaceChildren(h("h2", {class: "ol-judul"}, ikon("pin"), "Base"), kosong((st.data.base || []).length ? "Klik sebuah base di peta untuk melihat armada, gerak, dan temuannya." : "Belum ada base."));
    const db = O.dataBase(d, b.id), semua = O.dataBase(st.data, b.id).armada;
    out.push(h("h2", {class: "ol-judul"}, ikon("pin"), `${b.nama} (${b.icao || b.id})`));
    out.push(semua.length ? tabel(["Armada", "Status", "Alasan"], semua.map(a => [`${a.registrasi}, ${a.tipe}`, pil(O.namaArmada(a.status), O.kelasArmada(a.status)), a.alasan || ""])) : kosong("Belum ada armada tercatat di base ini."));
    out.push(h("h2", {class: "ol-judul"}, ikon("lanjut"), "Gerak"));
    out.push(db.gerak.length ? tabel(["Jam", "Armada", "Jenis", "Misi"], db.gerak.map(x => [O.jamWIB(x.jam_utc), x.registrasi, x.jenis, [x.misi, x.lokasi].filter(Boolean).join(", ")])) : kosong("Tidak ada gerak tercatat."));
    out.push(h("h2", {class: "ol-judul"}, ikon("peringatan"), "Temuan"));
    out.push(db.temuan.length ? tabel(["Armada", "Status", "Lokasi"], db.temuan.map(t => [t.registrasi, pil(O.STATUS_TEMUAN[t.status]?.nama || t.status, O.kelasTemuan(t.status)), [t.lokasi, O.klaimTeks(t)].filter(Boolean).join(", ")])) : kosong("Tidak ada temuan oleh armada base ini."));
    el.panel.replaceChildren(...out);
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

  kerangka(); el.panel.addEventListener("click", e => { if (e.target.closest("[data-semua]")) pilihBase(st.base); }); muat(); tombolDummy();
})();
