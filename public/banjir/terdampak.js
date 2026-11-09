"use strict";
/* Kejadian banjir yang SUDAH terjadi (bukan prakiraan), ringkas per kab/kota, dari data/terdampak.json (scripts/banjir/terdampak.py).
   Dipakai dua tempat: lapis peta "Sudah banjir" (titik per kab/kota, terpisah dari gelembung prakiraan Siaga/Awas) dan kolom "Terdampak" tabel provinsi (wilayah.js).
   Berkas hanya memuat kode, provinsi, kab/kota, status, tanggal, sumber; tidak ada angka dampak atau nama petugas, jadi layar pun tidak menampilkannya.
   Data lama tidak boleh tampak mutakhir: ambang 14 hari (sama dengan pipeline). Belum surut tanpa kabar lebih dari 14 hari jadi "Belum diketahui";
   Sudah surut lebih tua dari 14 hari tidak digambar. Tanggal keadaan selalu tampil di kartu hover.
   Bagian murni (TDm) diuji di tests/banjir/terdampak.test.mjs; bagian peta memakai peta, S, nanti, muatJSON, Gelembung, PI, esc, renderLegenda dari skrip lain. */
globalThis.TDm = (() => {
  const AMBANG = 14, BELUM = "Belum surut", SUDAH = "Sudah surut", TAK = "Belum diketahui";
  const WARNA = {[BELUM]: "#1d4e89", [SUDAH]: "#2b8c86", [TAK]: "#8a94a6"};
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const umur = (t, h = hariIni()) => Math.round((Date.parse(h) - Date.parse(t)) / 864e5);
  const tgl = t => { const [y, m, d] = t.split("-").map(Number); return `${d} ${BLN[m - 1]} ${y}`; };
  /* baris tayang pada hari h: status dihitung ulang dari tanggalnya (berkas bisa lebih tua dari halaman), yang terlalu tua dibuang */
  function tayang(doc, h = hariIni()) {
    return (doc?.baris || []).flatMap(b => {
      const u = umur(b.tanggal, h); let status = b.status;
      if (status === SUDAH && u > AMBANG) return [];
      if (status === BELUM && u > AMBANG) status = TAK;
      return [{...b, status, umur: u}]; });
  }
  /* jumlah kab/kota terdampak (Belum surut + Sudah surut) per kode provinsi; Belum diketahui tidak dihitung */
  function perProvinsi(baris) {
    const o = {}; for (const b of baris) if (b.status !== TAK) o[b.prov_kode] = (o[b.prov_kode] || 0) + 1;
    return o; }
  const total = baris => baris.filter(b => b.status !== TAK).length;
  const umurTeks = u => u <= 0 ? "hari ini" : u === 1 ? "kemarin" : `${u} hari lalu`;
  const fitur = (baris, titik) => ({type: "FeatureCollection", features: baris.flatMap(b => { const c = titik?.[b.kode]; if (!c) return [];
    return [{type: "Feature", geometry: {type: "Point", coordinates: c}, properties: {kode: b.kode, kab: b.kab, status: b.status, tanggal: b.tanggal, umur: b.umur, sumber: b.sumber}}]; })});
  return {AMBANG, BELUM, SUDAH, TAK, WARNA, umur, tgl, tayang, perProvinsi, total, umurTeks, fitur};
})();

/* ---------- bagian peta ---------- */
const LapisTerdampak = {
  K: "terdampak", ID: "td-titik", doc: null, baris: [], nyala: true, siap: false,
  warna: () => ["match", ["get", "status"], TDm.BELUM, TDm.WARNA[TDm.BELUM], TDm.SUDAH, TDm.WARNA[TDm.SUDAH], TDm.WARNA[TDm.TAK]],
  /* dipanggil dari Gelembung.segarkan (peta dan titik kab siap); dimuat sekali, tabel provinsi (wilayah.js) digambar ulang lewat renderDaftar */
  muat() { return this.P ||= muatJSON("data/terdampak.json").then(d => { this.doc = d; this.baris = TDm.tayang(d); this.siap = true; this.gambar();
    if (typeof renderDaftar === "function" && S.jalur.length < 2) renderDaftar(); renderLegenda(); }).catch(() => { this.P = null; }); },
  gambar() {
    if (!this.siap || !peta?.getSource("wil")) return;
    const titik = Gelembung.titikKab; if (!titik) return;   /* Gelembung.muatPusat memanggil segarkan lagi begitu titik kab siap */
    /* segarkan jalan di tiap ganti hari/jalur/mode: setData hanya bila isinya berubah; sumber hilang sesudah ganti tema tetap dipasang ulang */
    if (peta.getSource(this.ID) && this._b === this.baris && this._t === titik) return;
    this._b = this.baris; this._t = titik;
    const data = TDm.fitur(this.baris, titik);
    if (!this._dengar) { this._dengar = true;   /* listener peta bertahan lintas setStyle, jadi dipasang sekali */
      peta.on("mouseenter", this.ID, () => { peta.getCanvas().style.cursor = "pointer"; });
      peta.on("mouseleave", this.ID, () => { peta.getCanvas().style.cursor = ""; this._p = null; PI?.sembunyiTip(); });
      peta.on("mousemove", this.ID, e => { const p = e.features[0].properties, was = !this._p; this._p = {p, ev: e.originalEvent}; if (!was) return;
        requestAnimationFrame(() => { const q = this._p; this._p = null; if (q && PI) PI.tampilTip(this.kartu(q.p), q.ev); }); }); }
    if (!peta.getSource(this.ID)) {
      peta.addSource(this.ID, {type: "geojson", data});
      /* cincin dengan titik isi: bentuk lain dari gelembung berangka prakiraan (lingkaran penuh berangka) */
      peta.addLayer({id: this.ID, type: "circle", source: this.ID, layout: {visibility: this.nyala ? "visible" : "none"},
        paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 8, 8], "circle-color": this.warna(), "circle-stroke-color": "#fff", "circle-stroke-width": 2,
          "circle-opacity": ["match", ["get", "status"], TDm.SUDAH, .55, 1]}});
    } else peta.getSource(this.ID).setData(data);
  },
  kartu(p) {
    const w = TDm.WARNA[p.status];
    return PI.kartuTip({judul: esc(p.kab), sub: `<small class="tp-sub">Sudah banjir (laporan), bukan prakiraan</small>`,
      stat: [["sungai", esc(p.status), "status", w], ["peta", TDm.tgl(p.tanggal), `keadaan terakhir, ${TDm.umurTeks(+p.umur)}`, "#4f8fc4"]]}).replace("tp-gr tp-satu", "tp-gr tp-kisi")
      + `<div class="tp-sub" style="padding:4px 10px 8px"><small>Sumber: ${esc(p.sumber)}</small></div>`; },
  ubah(k, on) { if (k !== this.K) return; this.nyala = on; if (peta?.getLayer(this.ID)) peta.setLayoutProperty(this.ID, "visibility", on ? "visible" : "none"); },
  legenda() {
    if (!this.nyala || !this.baris.length) return "";
    const ada = [TDm.BELUM, TDm.SUDAH, TDm.TAK].filter(s => this.baris.some(b => b.status === s));
    return `<div class="lbl" title="Kab/kota yang sudah dilaporkan kena banjir (Laporan harian Koordalops), terpisah dari status prakiraan Siaga/Awas. Laporan lebih tua dari ${TDm.AMBANG} hari tidak ditampilkan (Sudah surut) atau jadi Belum diketahui (Belum surut).">Sudah banjir (laporan)</div>
      <div class="leg" style="margin:4px 0 8px">${ada.map(s => `<span><i class="sw dot" style="background:${TDm.WARNA[s]}"></i>${s}</span>`).join("")}</div>`; },
};
