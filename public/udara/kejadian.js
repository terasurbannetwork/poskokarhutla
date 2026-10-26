"use strict";
/* ================================================================ tab Kejadian udara dan laci /udara/k/U0001 */
/* Data: ../banjir/data/kejadian_udara_awal.json (atribut ringan) dan kejadian_udara_geo.json (geometri, dimuat saat satu kejadian dibuka),
   ditulis scripts/umum/kejadian.py: gugus kabupaten/kota bersebelahan yang PM2,5 rata-rata 24 jamnya di atas 55,4 µg/m³ pada prakiraan CAMS.
   SEMUA angka perkiraan model CAMS tanpa stasiun ukur dan belum dikoreksi: pil PIL_MODEL dipasang di tabel dan laci. Deteksi Centurisk97, bukan pernyataan resmi.
   Tanpa berkas, kosong, atau basi lebih dari 1 hari: tab dan kartunya dibuang (A18). Saran kesehatan per kategori TIDAK ditulis: belum ada teks resmi (Kemenkes/KLHK) yang bisa dikutip.
   Pola klik/keydown, paginasi urgent, token _n, dan laci di nanti mengikuti Kejadian cuaca dan gempa. */
const tglSgk = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
const Kejadian = {
  st: {urut: "mulai", turun: true, hal: 0}, PER: 10, K: null, D: null, aktif: null, _buka: false, _p: null,
  KOL: [["kode", "Kode"], ["nama", "Kejadian"], ["tingkat", "Tingkat"], ["pm", `PM2,5 <span style="text-transform:none">(µg/m³)</span>`, 1], ["kab", "Kabupaten/kota", 1], ["jiwa", "Penduduk", 1], ["mulai", "Mulai"], ["aktif", "Status"]],
  kat: k => Murni.katPM(k.besaran?.nilai ?? 0),
  pilTingkat: k => pilKat(Kejadian.kat(k)),
  status: k => `<span class="pl" style="--w:${k.aktif ? "#d4572f" : "#7d8794"}">${k.aktif ? "Aktif" : "Selesai"}</span>`,
  tgl: t => tglSgk(t),
  /* berkas awal, sekali. Hasil: this.K = daftar kejadian segar, atau [] (tab dibuang). */
  muatAwal() { return this._p ||= muatJSON("../banjir/data/kejadian_udara_awal.json").then(d => {
    const segar = d?.hari && Math.abs(Date.parse(tglWIB(SEKARANG()) + "T12:00:00+07:00") - Date.parse(d.hari + "T12:00:00+07:00")) <= 864e5;
    this.D = segar ? d : null; this.K = segar && Array.isArray(d.kejadian) ? d.kejadian : []; return this.K; }).catch(() => (this.K = [])); },
  ada: () => !!Kejadian.K?.length,
  nilai: (k, c) => c === "pm" || c === "tingkat" ? k.besaran?.nilai ?? 0 : c === "kab" ? k.n_kab : c === "jiwa" ? k.jiwa ?? 0 : c === "aktif" ? +k.aktif : c === "mulai" ? Date.parse(k.mulai) : k[c],
  sel: (k, c) => c === "kode" ? `<b translate="no">${esc(k.kode)}</b>` : c === "nama" ? `<span translate="no">${esc(k.nama)}</span>` : c === "tingkat" ? Kejadian.pilTingkat(k)
    : c === "pm" ? fmt(Math.round(k.besaran?.nilai ?? 0)) : c === "kab" ? fmt(k.n_kab) : c === "jiwa" ? (k.jiwa ? "sekitar " + kr(k.jiwa) + " jiwa" : "–") : c === "mulai" ? Kejadian.tgl(k.mulai) : Kejadian.status(k),
  tabel() {
    const st = this.st, s = st.turun ? -1 : 1, R = [...this.K].sort((a, b) => { const x = this.nilai(a, st.urut), y = this.nilai(b, st.urut); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s || Date.parse(b.mulai) - Date.parse(a.mulai); });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / this.PER) - 1));
    return `<p class="fnd">${PIL_MODEL}</p><div class="tw"><table><thead><tr>${this.KOL.map(([c, n, num]) => `<th class="${num ? "n" : ""}" aria-sort="${st.urut === c ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c}">${n}<i>${st.urut === c ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${R.slice(st.hal * this.PER, (st.hal + 1) * this.PER).map(k => `<tr class="klik" data-kode="${esc(k.kode)}" tabindex="0">${this.KOL.map(([c, , num]) => `<td${num ? ' class="n"' : ""}>${this.sel(k, c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, R.length, this.PER, "kejadian")}
      <p class="fnd">Sumber: Deteksi Centurisk97 dari prakiraan Copernicus CAMS lewat Open-Meteo (kabupaten/kota bersebelahan dengan PM2,5 rata-rata 24 jam di atas 55,4 µg/m³), bukan pernyataan resmi. Diperbarui ${esc(jamWIB(this.D?.dibuat || Date.now()))}.</p>`; },
  gambarTabel() { const el = $("#kejadian"); el.innerHTML = this.tabel(); pengurutKepala(this.st, el.querySelector("thead"), () => nanti(() => this.gambarTabel())); },
  async render() {
    const el = $("#kejadian"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      /* paginasi hanya untuk klik; baris untuk klik, Enter, atau Spasi */
      const buka = e => { const h = e.type === "click" && e.target.closest("[data-h]");
        if (h) { if (h.disabled) return; const a = +h.dataset.h; this.st.hal = a; el.querySelectorAll(".pgn-b").forEach(b => { b.classList.toggle("on", /^\d+$/.test(b.textContent) && b === h); if (b !== h) b.removeAttribute("aria-current"); }); h.setAttribute("aria-current", "page");
          return nanti(() => { this.gambarTabel(); el.querySelector(`.pgn-b[data-h="${a}"]`)?.focus(); }); }
        const r = e.target.closest("tr[data-kode]"); if (r && (e.type === "click" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.buka(r.dataset.kode); } };
      el.addEventListener("click", buka); el.addEventListener("keydown", buka); }
    if (!el.children.length) el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat kejadian udara…</div>`;
    await this.muatAwal();
    if (!this.ada()) { el.innerHTML = `<div class="kosong">Tidak ada kejadian udara tidak sehat yang tercatat saat ini.</div>`; return; }
    this.gambarTabel(); },

  /* geometri kejadian (MultiPolygon atau Point), dimuat malas */
  geo() { return this._g ||= muatJSON("../banjir/data/kejadian_udara_geo.json").catch(() => (this._g = null)); },
  /* buka satu kejadian: poligon di peta, kotak pas, laci. dorong = ubah URL jadi /udara/k/U0001 */
  async buka(kode, dorong = true) {
    const n = this._n = (this._n || 0) + 1;   /* dua klik berurutan atau tutup laci: hanya panggilan terakhir yang menang */
    bukaTab("peta", false); if (dorong) history.replaceState(null, "", "/udara/k/" + kode + location.search);
    await this.muatAwal(); if (n !== this._n) return; const k = this.K.find(x => x.kode === kode);
    if (!k) { toast("Kejadian " + kode + " tidak ditemukan"); if (location.pathname.startsWith("/udara/k/")) history.replaceState(null, "", "/udara/peta" + location.search); return; }
    const G = await this.geo(); if (n !== this._n) return;
    const f = G?.features?.find(x => x.properties.kode === kode);
    /* sesudah peta.resize() dari bukaTab (antrean nanti berurutan); hanya panggilan terakhir yang jalan */
    nanti(() => { if (n !== this._n) return; this.aktif = {k, f}; this.pasangLapis();
      peta.fitBounds(f ? kotak([f]) : [[k.pusat[1] - .5, k.pusat[0] - .5], [k.pusat[1] + .5, k.pusat[0] + .5]], {padding: kiriPad(), duration: 700, maxZoom: 9});
      this.laci(k); }); },
  laci(k) {
    const kab = (k.kab || []).map(x => x.split("|")[1] || x), lain = Math.max(0, k.n_kab - kab.length), c = this.kat(k);
    const isi = `<div class="grid g3">${kot("Tingkat", this.pilTingkat(k), "PM2,5 rata-rata 24 jam")}${kot("PM2,5", `<span style="color:${KAT[c].w}">${fmt(k.besaran?.nilai ?? 0)} µg/m³</span>`, esc(k.besaran?.ket || "tertinggi"))}${kot("Wilayah", fmt(k.n_kab), "kabupaten/kota")}</div>
      ${k.jiwa ? `<p class="fnd">Penduduk di kabupaten/kota ini: ${jiwa(k.jiwa)}</p>` : ""}
      <p class="fnd" translate="no"><b>${esc(kab.join(", "))}${lain ? ` dan ${fmt(lain)} lainnya` : ""}</b></p>
      <p class="fnd">Mulai ${this.tgl(k.mulai)}${k.aktif ? "" : `, terakhir terlihat ${this.tgl(k.terakhir)}`}</p>
      <p class="fnd">Sumber: Deteksi Centurisk97 dari prakiraan Copernicus CAMS lewat Open-Meteo, WorldPop; bukan pernyataan resmi, tanpa stasiun ukur. Diperbarui ${esc(jamWIB(this.D?.dibuat || Date.now()))}.</p>`;
    this._buka = true; Laci.buka("Udara tidak sehat", `<span translate="no">${esc(k.nama)}</span>`, `${this.status(k)} ${PIL_MODEL} <span translate="no">${esc(k.kode)}</span>`, isi); this._buka = false;
    const el = $("#laci"); el.dataset.kej = k.kode;
    el.querySelector(".hd-aksi")?.insertAdjacentHTML("afterbegin", `<button class="bagikan ik-btn" aria-label="Bagikan" title="Bagikan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg></button>`);
    el.querySelector(".bagikan").onclick = () => this.bagikan(k); },
  /* tombol bagikan (ikon, A19): tautan /udara/k/U0001 lewat lembar bagikan peramban, atau disalin */
  async bagikan(k) { const u = location.origin + "/udara/k/" + k.kode;
    try { if (navigator.share) return await navigator.share({title: k.nama, url: u}); await navigator.clipboard.writeText(u); toast("Tautan disalin"); } catch (e) { if (e?.name !== "AbortError") toast("Tautan belum bisa dibagikan"); } },

  /* sumber dan lapisan (diulang tiap gaya peta berganti: dipanggil dari Peta.pasang) */
  pasangLapis() {
    if (!this.aktif || !peta) return; const {k, f} = this.aktif; this.cabut();
    const w = KAT[this.kat(k)].w, fc = {type: "FeatureCollection", features: f ? [f] : []};
    peta.addSource("kej", {type: "geojson", data: fc});
    if (f?.geometry.type === "Point") peta.addLayer({id: "kej-titik", type: "circle", source: "kej", paint: {"circle-radius": 9, "circle-color": w, "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
    else { peta.addLayer({id: "kej-isi", type: "fill", source: "kej", paint: {"fill-color": w, "fill-opacity": .32}});
      peta.addLayer({id: "kej-garis", type: "line", source: "kej", paint: {"line-color": w, "line-width": 2.4}}); } },
  cabut() { for (const id of ["kej-garis", "kej-isi", "kej-titik"]) if (peta.getLayer(id)) peta.removeLayer(id); if (peta.getSource("kej")) peta.removeSource("kej"); },
  /* laci ditutup atau laci lain dibuka: lapisan kejadian dan tautan /udara/k/ dibersihkan */
  bersih() { if (this._buka) return; this._n = (this._n || 0) + 1; if (!this.aktif) return; this.aktif = null; if (peta) this.cabut();
    if (location.pathname.startsWith("/udara/k/")) history.replaceState(null, "", "/udara/peta" + location.search); },
};
