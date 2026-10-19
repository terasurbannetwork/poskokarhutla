"use strict";
/* ================================================================ tab Kejadian gempa dan lapisan kejadian di peta */
/* Tabel kejadian G (gempa utama M 5+ dan susulannya, /api/gempa/kejadian, 30 hari) dengan kolom standar: kepala gelap, bisa diurut, paginasi (A10).
   Klik baris = peta + laci gempa utama + titik susulan + lapisan isoseismal MMI (model guncangan, perkiraan). Tautan bersih: /gempa/k/G0016. */
const Kejadian = {
  st: {urut: "mulai", turun: true, hal: 0}, PER: 10, aktif: null, _ia: false,
  KOL: [["kode", "Kode"], ["nama", "Gempa utama"], ["m", "Kekuatan", 1], ["sus", "Susulan", 1], ["mulai", "Mulai"], ["aktif", "Status"]],
  nilai: (k, c) => c === "sus" ? Math.max(0, k.jumlah - 1) : c === "aktif" ? +k.aktif : c === "mulai" ? Date.parse(k.mulai) : c === "nama" ? wilayahPendek(k.nama) : k[c],
  sel: (k, c) => c === "kode" ? `<b translate="no">${esc(k.kode)}</b>` : c === "nama" ? `<span translate="no">${esc(wilayahPendek(k.nama))}</span>` : c === "m" ? pilM(k.m) : c === "sus" ? fmt(Math.max(0, k.jumlah - 1))
    : c === "mulai" ? `<span translate="no">${esc(waktuGempa(k.mulai))}</span>` : `<span class="pill pm" style="--w:${k.aktif ? "#d4572f" : "#7d8794"}">${k.aktif ? "Aktif" : "Selesai"}</span>`,
  tabel() {
    const st = this.st, s = st.turun ? -1 : 1, R = [...this.K].sort((a, b) => { const x = this.nilai(a, st.urut), y = this.nilai(b, st.urut); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s || Date.parse(b.mulai) - Date.parse(a.mulai); });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / this.PER) - 1));
    return `<div class="tw"><table><thead><tr>${this.KOL.map(([c, n, num]) => `<th class="${num ? "n" : ""}" aria-sort="${st.urut === c ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c}">${n}<i>${st.urut === c ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${R.slice(st.hal * this.PER, (st.hal + 1) * this.PER).map(k => `<tr class="klik" data-kode="${esc(k.kode)}" tabindex="0">${this.KOL.map(([c, , num]) => `<td${num ? ' class="n"' : ""}>${this.sel(k, c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, R.length, this.PER, "kejadian")}<p class="fnd">Sumber: BMKG, USGS. 30 hari terakhir, per ${esc(jamWIB(new Date(Sus._daftar?.t || Date.now()).toISOString()))}</p>`; },
  gambarTabel() { const el = $("#kejadian"); el.innerHTML = this.tabel(); pengurutKepala(this.st, el.querySelector("thead"), () => nanti(() => this.gambarTabel())); },
  async render() {
    const el = $("#kejadian"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      /* paginasi hanya untuk klik (Tab/panah tidak mengganti halaman); baris untuk klik, Enter, atau Spasi */
      const buka = e => { const h = e.type === "click" && e.target.closest("[data-h]");
        if (h) { if (h.disabled) return; const a = +h.dataset.h; this.st.hal = a; el.querySelectorAll(".pgn-b").forEach(b => { b.classList.toggle("on", b === h && !b.disabled); if (b !== h) b.removeAttribute("aria-current"); }); h.setAttribute("aria-current", "page");
          return nanti(() => { this.gambarTabel(); el.querySelector(`.pgn-b[data-h="${a}"]`)?.focus(); }); }
        const r = e.target.closest("tr[data-kode]"); if (r && (e.type === "click" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.buka(r.dataset.kode); } };
      el.addEventListener("click", buka); el.addEventListener("keydown", buka); }
    if (!el.children.length) el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat kejadian gempa…</div>`;
    this.K = await Sus.daftar();
    if (!this.K?.length) { el.innerHTML = `<div class="kosong">${this.K ? "Tidak ada kejadian gempa 30 hari terakhir." : "Data kejadian gempa belum tersedia."}</div>`; return; }
    this.gambarTabel(); },

  /* buka satu kejadian di peta: gempa utama di laci, susulan sebagai titik, isoseismal MMI; dorong = ubah URL jadi /gempa/k/G0016 */
  async buka(kode, dorong = true) {
    const n = this._n = (this._n || 0) + 1;   /* dua klik berurutan atau tutup laci: hanya panggilan terakhir yang menang */
    bukaTab("peta", false); if (dorong) history.replaceState(null, "", "/gempa/k/" + kode);
    toast("Memuat kejadian…");
    const k = await Sus.kej(kode); if (n !== this._n) return;
    if (!k?.gempa?.length) { toast("Kejadian " + kode + " tidak ditemukan"); history.replaceState(null, "", "/gempa/kejadian"); return bukaTab("kejadian", false); }
    const u = k.gempa.find(x => x.id === k.utama_id) || k.gempa[0];
    nanti(async () => { if (n !== this._n) return; Laci.buka(u); S.pilih = u.id; peta.getSource("pilih")?.setData({type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Point", coordinates: [u.lon, u.lat]}, properties: {}}]});
      const iso = await this.isoseismal(u).catch(() => null); if (n !== this._n) return;
      this.aktif = {k, u, iso}; this.pasangLapis(); renderLegenda();
      const R = this.aktif.iso?.[0]; peta.fitBounds(R ? this.kotakLingkaran(u, R.r) : [[u.lon - 1, u.lat - 1], [u.lon + 1, u.lat + 1]], {padding: kiriPad(), duration: 700, maxZoom: 9}); }); },

  /* jari-jari tiap kelas MMI 3 sampai 9 dari model guncangan (BSSA14/Zhao06 + Worden12): bisection pada MMI(r) yang menurun terhadap jarak. [{k, r}] dari terluas ke terdalam; perkiraan, bukan pengukuran */
  async isoseismal(g) {
    if (g.m < 4.5 || typeof GempaGuncangan === "undefined") return null; const X = await Guncang.muat(); if (!X) return null;
    const dalam = g.dalam ?? 10, jenis = X.M.tebakJenis(dalam, g.m, g.lat, g.lon), f = r => X.M.mmi(g.m, r, dalam, jenis), maks = X.M.jendelaKm(g.m, dalam, jenis) * 1.2, out = [];
    for (let k = 3; k <= 9; k++) { if (f(1) < k) break; let lo = 1, hi = maks; if (f(hi) >= k) { out.push({k, r: hi}); continue; }
      for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (f(mid) >= k) lo = mid; else hi = mid; } out.push({k, r: lo}); }
    return out.length ? out : null; },
  lingkaran(g, r) { const la = g.lat, k = 111.32 * Math.cos(la * Math.PI / 180), P = [];
    for (let i = 0; i <= 72; i++) { const a = i / 72 * 2 * Math.PI; P.push([g.lon + r * Math.sin(a) / k, la + r * Math.cos(a) / 111.2]); } return P; },
  kotakLingkaran(g, r) { const k = 111.32 * Math.cos(g.lat * Math.PI / 180); return [[g.lon - r / k, g.lat - r / 111.2], [g.lon + r / k, g.lat + r / 111.2]]; },

  /* sumber dan lapisan (diulang tiap gaya peta berganti: dipanggil juga dari Peta.pasang) */
  pasangLapis() {
    if (!this.aktif || !peta) return; const {k, u, iso} = this.aktif; this.cabut();
    if (iso) { peta.addSource("iso", {type: "geojson", data: {type: "FeatureCollection", features: iso.map(o => ({type: "Feature", geometry: {type: "Polygon", coordinates: [this.lingkaran(u, o.r)]}, properties: {k: o.k}}))}});
      const w = ["match", ["get", "k"], ...iso.flatMap(o => [o.k, MMI_WARNA[o.k]]), "#d8d2b8"];
      Peta.taruh({id: "iso", type: "fill", source: "iso", paint: {"fill-color": w, "fill-opacity": .3}});
      Peta.taruh({id: "iso-garis", type: "line", source: "iso", paint: {"line-color": w, "line-width": 1.4, "line-opacity": .9}}); }
    peta.addSource("susulan", {type: "geojson", data: {type: "FeatureCollection", features: k.gempa.map((g, i) => g.id === u.id ? null : {type: "Feature", geometry: {type: "Point", coordinates: [g.lon, g.lat]}, properties: {i, m: g.m, d: kelasDalam(g.dalam)}}).filter(Boolean)}});
    Peta.taruh({id: "susulan", type: "circle", source: "susulan", paint: {"circle-radius": radius(.8), "circle-color": "#5f6fb0", "circle-opacity": .85, "circle-stroke-color": "#fff", "circle-stroke-width": 1}});
    if (this._ia) return; this._ia = true;
    peta.on("mousemove", "susulan", e => { peta.getCanvas().style.cursor = "pointer"; const g = this.aktif?.k.gempa[e.features[0].properties.i]; if (g) PI?.tampilTip(Peta.kartuGempa(g), e.originalEvent); });
    peta.on("mouseleave", "susulan", () => { peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); }); },
  cabut() { for (const id of ["iso-garis", "iso", "susulan"]) if (peta.getLayer(id)) peta.removeLayer(id); for (const id of ["iso", "susulan"]) if (peta.getSource(id)) peta.removeSource(id); },
  pilihSusulan(i) { const g = this.aktif?.k.gempa[i]; if (g) { S.pilih = g.id; peta.getSource("pilih")?.setData({type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Point", coordinates: [g.lon, g.lat]}, properties: {}}]}); Laci.buka(g); } },
  /* laci ditutup: lapisan kejadian dan tautan /gempa/k/ dibersihkan */
  bersih() { this._n = (this._n || 0) + 1; if (!this.aktif) return; this.aktif = null; if (peta) { this.cabut(); peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); } renderLegenda(); if (location.pathname.startsWith("/gempa/k/")) history.replaceState(null, "", "/gempa/peta"); },
};
