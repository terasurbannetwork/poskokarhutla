"use strict";
/* ================================================================ tab Kejadian cuaca dan laci /cuaca/k/C0001 */
/* Data: ../banjir/data/kejadian_cuaca_awal.json (atribut ringan) dan kejadian_cuaca_geo.json (geometri, dimuat saat satu kejadian dibuka),
   ditulis scripts/umum/kejadian.py: peringatan CAP BMKG yang berlaku (status resmi, label BMKG) dan gugus kecamatan Siaga/Awas
   (deteksi Pantau Bencana dari prakiraan model, bukan pernyataan resmi). Tanpa berkas, kosong, atau basi lebih dari 1 hari: tab dan kartunya dibuang (A18).
   Tabel standar (kepala gelap, urut, paginasi) seperti Kejadian gempa; klik baris = peta + laci. Kontak BPBD dibuat tetapi disembunyikan (A24), sama seperti gempa dan karhutla. */
const Kontak = {
  _p: null,
  muat() { return this._p ||= muatJSON("../data/bpbd.json").then(d => d.kantor).catch(() => (this._p = null)); },
  /* kantor BPBD terdekat dari titik (lat, lon), jarak km garis lurus; kantor tanpa nomor Pusdalops tetap dimuat */
  async dekat(lat, lon, n = 3) { const K = await this.muat(); if (!K?.length) return [];
    const rad = Math.PI / 180, jarak = b => { const a = Math.sin((b.lat - lat) * rad / 2) ** 2 + Math.cos(lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - lon) * rad / 2) ** 2; return 12742 * Math.asin(Math.sqrt(a)); };
    return K.filter(b => b.lat && b.lon).map(b => ({...b, km: jarak(b)})).sort((a, b) => a.km - b.km).slice(0, n); },
};
const Kejadian = {
  st: {urut: "mulai", turun: true, hal: 0}, PER: 10, K: null, D: null, aktif: null, _ia: false, _buka: false, _p: null,
  KOL: [["kode", "Kode"], ["nama", "Kejadian"], ["sumber", "Sumber"], ["tingkat", "Tingkat"], ["kab", "Kabupaten/kota", 1], ["mulai", "Mulai"], ["aktif", "Status"]],
  cap: k => String(k.jenis || "").startsWith("cap:"),
  SEV: ["Minor", "Moderate", "Severe", "Extreme"],
  /* tingkat urutan 0..3 untuk diurut: CAP menurut severity, deteksi menurut tingkat Pantau Bencana */
  rank: k => Kejadian.cap(k) ? Kejadian.SEV.indexOf(k.besaran?.nilai) : (k.besaran?.nilai ?? 0),
  pilTingkat: k => Kejadian.cap(k) ? pilSev(k.besaran?.nilai || "") : pilT(k.besaran?.nilai ?? 0),
  sumber: k => Kejadian.cap(k) ? "BMKG" : "Deteksi Pantau Bencana",
  status: k => `<span class="pl" style="--w:${k.aktif ? "#d4572f" : "#7d8794"}">${k.aktif ? "Aktif" : "Selesai"}</span>`,
  tgl: t => tglSgk(t),
  /* berkas awal, sekali. Hasil: this.K = daftar kejadian segar, atau [] (tab dibuang). */
  muatAwal() { return this._p ||= muatJSON("../banjir/data/kejadian_cuaca_awal.json").then(d => {
    const segar = d?.hari && Math.abs(Date.parse(tglWIB(SEKARANG()) + "T12:00:00+07:00") - Date.parse(d.hari + "T12:00:00+07:00")) <= 864e5;
    this.D = segar ? d : null; this.K = segar && Array.isArray(d.kejadian) ? d.kejadian : []; return this.K; }).catch(() => (this.K = [])); },
  ada: () => !!Kejadian.K?.length,
  nilai: (k, c) => c === "kab" ? k.n_kab : c === "aktif" ? +k.aktif : c === "mulai" ? Date.parse(k.mulai) : c === "tingkat" ? Kejadian.rank(k) : c === "sumber" ? Kejadian.sumber(k) : k[c],
  sel: (k, c) => c === "kode" ? `<b translate="no">${esc(k.kode)}</b>` : c === "nama" ? `<span translate="no">${esc(k.nama)}</span>` : c === "sumber" ? esc(Kejadian.sumber(k))
    : c === "tingkat" ? Kejadian.pilTingkat(k) : c === "kab" ? fmt(k.n_kab) : c === "mulai" ? Kejadian.tgl(k.mulai) : Kejadian.status(k),
  tabel() {
    const st = this.st, s = st.turun ? -1 : 1, R = [...this.K].sort((a, b) => { const x = this.nilai(a, st.urut), y = this.nilai(b, st.urut); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s || Date.parse(b.mulai) - Date.parse(a.mulai); });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / this.PER) - 1));
    return `<div class="tw"><table><thead><tr>${this.KOL.map(([c, n, num]) => `<th class="${num ? "n" : ""}" aria-sort="${st.urut === c ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c}">${n}<i>${st.urut === c ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${R.slice(st.hal * this.PER, (st.hal + 1) * this.PER).map(k => `<tr class="klik" data-kode="${esc(k.kode)}" tabindex="0">${this.KOL.map(([c, , num]) => `<td${num ? ' class="n"' : ""}>${this.sel(k, c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, R.length, this.PER, "kejadian")}
      <p class="fnd">Sumber: BMKG (peringatan dini), Deteksi Pantau Bencana dari prakiraan model (kecamatan Siaga dan Awas)${this.K.some(k => !this.cap(k)) ? ". " + AMBANG_PIL() : ""}. Diperbarui ${esc(jamWIB(this.D?.dibuat || Date.now()))}.</p>`; },
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
    if (!el.children.length) el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat kejadian cuaca…</div>`;
    await this.muatAwal();
    if (!this.ada()) { el.innerHTML = `<div class="kosong">Tidak ada kejadian cuaca yang tercatat saat ini.</div>`; return; }
    this.gambarTabel(); },

  /* geometri kejadian (MultiPolygon atau Point), dimuat malas */
  geo() { return this._g ||= muatJSON("../banjir/data/kejadian_cuaca_geo.json").catch(() => (this._g = null)); },
  /* buka satu kejadian: poligon di peta, kotak pas, laci. dorong = ubah URL jadi /cuaca/k/C0001 */
  async buka(kode, dorong = true) {
    const n = this._n = (this._n || 0) + 1;   /* dua klik berurutan atau tutup laci: hanya panggilan terakhir yang menang */
    bukaTab("peta", false); if (dorong) history.replaceState(null, "", "/cuaca/k/" + kode + location.search);
    await this.muatAwal(); if (n !== this._n) return; const k = this.K.find(x => x.kode === kode);
    if (!k) { toast("Kejadian " + kode + " tidak ditemukan"); if (location.pathname.startsWith("/cuaca/k/")) history.replaceState(null, "", "/cuaca/peta" + location.search); return; }
    const G = await this.geo(); if (n !== this._n) return;
    const f = G?.features?.find(x => x.properties.kode === kode);
    /* sesudah peta.resize() dari bukaTab (antrean nanti berurutan); hanya panggilan terakhir yang jalan */
    nanti(() => { if (n !== this._n) return; this.aktif = {k, f}; this.pasangLapis();
      peta.fitBounds(f ? kotak([f]) : [[k.pusat[1] - .5, k.pusat[0] - .5], [k.pusat[1] + .5, k.pusat[0] + .5]], {padding: kiriPad(), duration: 700, maxZoom: 9});
      this.laci(k); }); },
  laci(k) {
    const cap = this.cap(k), kab = (k.kab || []).map(x => x.split("|")[1] || x), lain = Math.max(0, k.n_kab - kab.length);
    const kot3 = (cap ? kot("Tingkat", this.pilTingkat(k), "BMKG") : kot("Tingkat", this.pilTingkat(k), "deteksi Pantau Bencana")) + kot("Wilayah", fmt(k.n_kab), "kabupaten/kota")
      + (k.jiwa ? kot("Penduduk", rb(k.jiwa) + " jiwa", cap ? "di kabupaten/kota terkait" : "di kecamatan yang terdeteksi") : "");
    const isi = `<div class="grid g3">${kot3}</div>
      <p class="fnd" translate="no"><b>${esc(kab.join(", "))}${lain ? ` dan ${fmt(lain)} lainnya` : ""}</b></p>
      <p class="fnd">Mulai ${this.tgl(k.mulai)}${k.aktif ? "" : `, terakhir terlihat ${this.tgl(k.terakhir)}`}</p>
      <div id="kejKontak"></div>
      <p class="fnd">${cap ? `Sumber: BMKG, peringatan dini diteruskan apa adanya. Diperbarui ${esc(jamWIB(this.D?.dibuat || Date.now()))}.`
        : `Sumber: Deteksi Pantau Bencana dari prakiraan model (Open-Meteo), bukan peringatan resmi BMKG. ${AMBANG_PIL()}. Diperbarui ${esc(jamWIB(this.D?.dibuat || Date.now()))}.`}</p>`;
    this._buka = true; Laci.buka("Peringatan dini cuaca", `<span translate="no">${esc(k.nama)}</span>`, `${this.status(k)} · <span translate="no">${esc(k.kode)}</span>`, isi); this._buka = false;
    const el = $("#laci"); el.dataset.kej = k.kode;
    el.querySelector(".hd-aksi")?.insertAdjacentHTML("afterbegin", `<button class="bagikan ik-btn" aria-label="Bagikan" title="Bagikan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg></button>`);
    el.querySelector(".bagikan").onclick = () => this.bagikan(k);
    /* kantor BPBD terdekat (bpbd.json BNPB). DISEMBUNYIKAN (A24) lewat cuaca.css [data-j="Kontak BPBD"]: data kantor lama, nomor perlu dicek */
    if (k.pusat) Kontak.dekat(k.pusat[0], k.pusat[1]).then(K => { const s = $("#kejKontak"); if (!K.length || !s?.isConnected || el.dataset.kej !== k.kode) return;
      s.innerHTML = `<h4 class="lc-h" data-j="Kontak BPBD">Kontak BPBD terdekat</h4><table class="tb2" data-j="Kontak BPBD"><tbody>${K.map(b => `<tr><td>${esc(b.nama)}</td><td class="n" translate="no">${fmt(Math.round(b.km))} km${b.pusdalops ? ", " + esc(b.pusdalops) : ""}</td></tr>`).join("")}</tbody></table>
        <p class="fnd" data-j="Kontak BPBD">Sumber: BNPB (data kantor, perlu dicek ulang)</p>`; }).catch(() => {}); },
  /* tombol bagikan (ikon, A19): tautan /cuaca/k/C0001 lewat lembar bagikan peramban, atau disalin */
  async bagikan(k) { const u = location.origin + "/cuaca/k/" + k.kode;
    try { if (navigator.share) return await navigator.share({title: k.nama, url: u}); await navigator.clipboard.writeText(u); toast("Tautan disalin"); } catch (e) { if (e?.name !== "AbortError") toast("Tautan belum bisa dibagikan"); } },

  /* sumber dan lapisan (diulang tiap gaya peta berganti: dipanggil dari Peta.pasang) */
  pasangLapis() {
    if (!this.aktif || !peta) return; const {k, f} = this.aktif; this.cabut();
    const w = this.cap(k) ? sevWarna(k.besaran?.nilai) : warnaT(k.besaran?.nilai ?? 2), fc = f ? {type: "FeatureCollection", features: [f]} : {type: "FeatureCollection", features: []};
    peta.addSource("kej", {type: "geojson", data: fc});
    if (f?.geometry.type === "Point") peta.addLayer({id: "kej-titik", type: "circle", source: "kej", paint: {"circle-radius": 9, "circle-color": w, "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
    else { peta.addLayer({id: "kej-isi", type: "fill", source: "kej", paint: {"fill-color": w, "fill-opacity": .32}});
      peta.addLayer({id: "kej-garis", type: "line", source: "kej", paint: {"line-color": w, "line-width": 2.4}}); } },
  cabut() { for (const id of ["kej-garis", "kej-isi", "kej-titik"]) if (peta.getLayer(id)) peta.removeLayer(id); if (peta.getSource("kej")) peta.removeSource("kej"); },
  /* laci ditutup atau laci lain dibuka: lapisan kejadian dan tautan /cuaca/k/ dibersihkan */
  bersih() { if (this._buka) return; this._n = (this._n || 0) + 1; if (!this.aktif) return; this.aktif = null; if (peta) this.cabut();
    if (location.pathname.startsWith("/cuaca/k/")) history.replaceState(null, "", "/cuaca/peta" + location.search); },
};
