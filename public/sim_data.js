/* sim_data.js — pilihan "Model data (dilatih)" di tab Simulasi, di samping model fisika.
   Tambalan seperti sim_perlakuan.js: membungkus Sim.panel / Sim.jalan / Sim.pasangLapis, tidak mengubah mesin fisika.
   Saat dicentang: setelah skenario fisika selesai, jalankan SebaranModel.ramal() (sebaran_model.js) dari titik panas 24 jam
   kompleks, gambar peluang 72 jam di peta Sim (lapisan "sim-data") dan tambah kartu ringkasan di hasil. */
(() => {
if (typeof Sim === "undefined" || typeof SebaranModel === "undefined") return;
const SimData = window.SimData = {
  hasil: null, model: null, lahan: null,
  async jalan(S) {
    const p = S.f.properties, st = $("#simStatus");
    try {
      if (st) st.textContent += ", model data: memuat…";
      this.model ||= await SebaranModel.muat();
      this.prosp ||= await muatJSON("data/prospektif.json").catch(() => null); /* gerbang peluang "akan membesar": tampil hanya bila prospektif.teruji (scripts/sebaran/prospektif.py: recall prospektif lolos DAN terkalibrasi, ECE_MAKS + Brier skill > 0) */
      this.hist ||= await muatJSON("data/prospektif_historis.json").catch(() => null); /* uji balik historis: hanya ditampilkan, TIDAK membuka gerbang */
      const o = u => muatJSON(u).catch(() => null);
      this.lahan ||= {gambut: Lapis.cache.gambut || await o("data/lahan/gambut.geojson"), kawasan: Lapis.cache.kawasan || await o("data/lahan/kawasan.geojson"),
        konsesi: Lapis.cache.konsesi || await o("data/lahan/konsesi.geojson"), kanal: await o("data/kanal.json"),
        jalan: await o("data/jalan.geojson"), desa: Sim._desa || await o("data/osm/desa.json"), riwayat: await o("data/riwayat_grid.json"), penduduk: await o("data/penduduk.json")};
      const sel0 = [...new Set((p.api24 || []).filter(([lo, la]) => isFinite(lo) && isFinite(la)).map(([lo, la]) => SebaranModel.sel(lo, la)))];
      const cuaca = await SebaranModel.cuaca(p.lat, p.lon);
      const frp = p.frp24 && p.px24 ? p.frp24 / Math.max(1, p.px24) * 3 : undefined; /* FRP maks tak tersedia: kira-kira 3x rata-rata per piksel */
      const titik = await this.titik(sel0);
      this.hasil = SebaranModel.ramal({model: this.model, lat: p.lat, lon: p.lon, waktu: Date.now(), cuaca, lahan: this.lahan, sel0, frp, frpJumlah: p.frp24, titik, mc: 60, seed: 3});
      this.k = S.k;
      if (st) st.textContent = st.textContent.replace(", model data: memuat…", ", model data selesai");
    } catch (e) { console.error(e); this.hasil = null; if (st) st.textContent += ", model data gagal: " + e.message; }
  },
  /* deteksi S-NPP/NOAA-20/NOAA-21 7 hari (hotspot.json) untuk model "akan membesar" (NOAA-21 = pendamping sesudah S-NPP pensiun); titik kompleks ini sendiri (<= 750 m dari sel awal)
     dibuang karena model dilatih pada titik panas BARU yang belum punya riwayat di tempatnya */
  async titik(sel0) {
    try {
      let rows = typeof S !== "undefined" && S.titikPenuh ? S.titik : null, acuan = typeof S !== "undefined" ? S.acuan : null;
      if (!rows) { const hs = await muatJSON("data/hotspot.json"); rows = hs.baris; acuan = new Date(hs.acuan); }
      if (!rows || !acuan) return undefined;
      const a = +acuan, pus = sel0.map(k => SebaranModel.pusat(k)), km = (x, y, u, v) => Math.hypot((u - x) * 111.32 * Math.cos(y * Math.PI / 180), (v - y) * 110.57);
      return rows.filter(r => (r[3] === "N" || r[3] === "N20" || r[3] === "N21") && r[5] >= 1).map(r => ({t: a + r[2] * 36e5, lat: r[0], lon: r[1], s: r[3]}))
        .filter(p => !pus.some(([x, y]) => km(x, y, p.lon, p.lat) <= .75));
    } catch (e) { return undefined; }
  },
  gambar(S) {
    const m = S.peta; if (!m?.isStyleLoaded()) return;
    if (m.getLayer("sim-data")) m.removeLayer("sim-data"); if (m.getSource("sim-data")) m.removeSource("sim-data");
    const r = this.hasil; if (!S.op.data || !r || this.k !== S.k) return;
    const jam = +($("#simT")?.value || 72), d = Math.min(2, Math.max(0, Math.ceil(jam / 24) - 1)), h = .003375 / 2;
    const fs = r.sel.filter(s => s.p[d] >= .05).map(s => { const [x, y] = SebaranModel.pusat(s.k);
      return {type: "Feature", properties: {p: s.p[d]}, geometry: {type: "Polygon", coordinates: [[[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h], [x - h, y - h]]]}}; });
    m.addSource("sim-data", {type: "geojson", data: {type: "FeatureCollection", features: fs}});
    m.addLayer({id: "sim-data", type: "line", source: "sim-data", paint: {"line-color": ["interpolate", ["linear"], ["get", "p"], .05, "#5f6fb0", .5, "#1d1d6b"], "line-width": 1.2, "line-opacity": .9}});
  },
  kartu() {
    const r = this.hasil; if (!r) return "";
    const mata = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
    const ha = fmt((this.model.lepas_sel || 10) * 14), L = this.model.lolos, K = L?.kinerja || {};
    const PR = this.prosp, teruji = PR?.teruji === true, d2 = x => x == null ? "–" : (Math.round(x * 100) / 100).toString().replace(".", ","), p1 = x => x == null ? "–" : (x * 100).toFixed(1).replace(".", ",") + "%"; /* ECE: satu desimal (0,6%), bukan dibulatkan ke 0 */
    const bulat = x => { if (!x) return 0; const d = Math.floor(Math.log10(Math.abs(x))), p = 10 ** Math.max(0, d - 1); return Math.round(x / p) * p; }; /* 2 angka bermakna */
    const tahunUji = (L?.laporan || []).map(x => /Uji (\d{4})-(\d{4})/.exec(x.himpunan || "")).find(Boolean)?.slice(1, 3).join("–") || "2024–2026";
    const dari10 = K.cv_recall != null ? Math.round(K.cv_recall * 10) : 7;
    const membesar = r.sudah_besar ? `Sudah ≥ ${ha} ha (≥ ${this.model.lepas_sel || 10} sel aktif 24 jam): perlakukan sebagai kebakaran besar.`
      : !teruji ? `Peluang membesar ≥ ${ha} ha: <b>belum teruji</b>, ${!PR ? "belum ada data penilaian." : !PR.teruji_recall ? `baru ${fmt(PR.mode?.awal?.dinilai || 0)} dari ${fmt(PR.n_min || 300)} ramalan yang sudah dinilai 72 jam kemudian.`
        : `penangkapan api besar sudah teruji, tetapi ${!PR.kalibrasi_ok ? `peluangnya belum terkalibrasi (galat kalibrasi ${p1(PR.mode?.awal?.kalibrasi?.ece)}, batas atas bootstrap ${p1(PR.mode?.awal?.kalibrasi?.ece_p90)} dari batas ${p1(PR.ece_maks ?? .08)}, skill Brier ${d2(PR.mode?.awal?.kalibrasi?.brier_skill)}${PR.mode?.awal?.kalibrasi?.di_besar?.ok === false ? `, rata-rata peluang ${p1(PR.mode.awal.kalibrasi.di_besar.rata_p)} tidak sesuai laju teramati ${p1(PR.mode.awal.kalibrasi.di_besar.teramati)}` : ""}).`
          : !PR.laju_dasar_ok ? `laju api besar prospektif ${p1(PR.mode?.awal?.laju_teramati)} berbeda ${PR.rasio_laju != null ? `${d2(PR.rasio_laju)} kali ` : ""}dari laju ${p1(PR.laju_model)} saat model dikalibrasi, dan model belum dikalibrasi ulang pada data prospektif.`
          : "semua syarat sudah lulus satu kali; menunggu penilaian ulang kedua dengan data baru."}`}`
      : r.lolos ? `${r.lolos.waspada ? `<b style="display:inline-block;padding:1px 8px;border-radius:6px;background:var(--bad);color:#fff">WASPADA: berpotensi membesar</b> ` : ""}Peluang membesar ≥ ${ha} ha dalam 72 jam: <b>${fmt(Math.round(r.lolos.p * 100))}%</b> (model khusus titik panas baru, terkalibrasi).
        Tanda WASPADA dipasang mulai ${fmt(Math.round(r.lolos.ambang * 100))}% agar sedikitnya ${dari10} dari 10 api yang benar-benar membesar tertangkap${K.uji2_presisi != null ? `; akibatnya hanya ${fmt(Math.round(K.uji2_presisi * 100))}% tanda yang benar-benar membesar (uji ${tahunUji}: ${fmt(Math.round(K.uji2_recall * 100))}% api besar tertangkap)` : ""}. Model ini untuk api yang baru muncul; cluster yang sudah lama menyala bisa dinilai terlalu rendah.`
      : `Peluang membesar ≥ ${ha} ha: ${fmt(Math.round(r.p_lepas * 100))}% (dari Monte Carlo; data titik sekitar tidak termuat, model khusus tidak dijalankan).`;
    const H = this.hist?.mode?.awal?.[this.hist?.kelompok_tampil], Hk = H?.kalibrasi; /* kelompok & tahun dibaca dari JSON: tahun yang kalibrasinya terlalu sedikit api besar tidak ikut */
    const tahunH = H?.tahun?.length ? [Math.min(...H.tahun), Math.max(...H.tahun)].filter((x, i, a) => a.indexOf(x) === i).join("–") : tahunUji;
    const historis = Hk ? `<br><span class="fnd">Uji balik historis, bukan uji prospektif (${tahunH}, ${fmt(H.dinilai)} titik, cuaca reanalisis): galat kalibrasi ${p1(Hk.ece)}, skill Brier ${d2(Hk.brier_skill)} terhadap laju dasar ${p1(Hk.laju_dasar)}. Angka ini tidak membuka peluang di atas.</span>` : "";
    return `<div class="sop" style="margin:0 0 12px;border-left:4px solid #5f6fb0"><b>Perkiraan utama: model data (dilatih dari 12 musim VIIRS, diuji pada ${tahunUji} dan 123 kejadian lalu).</b> Luas median (rentang 80%${this.model.selang ? ", dikalibrasi pada 2015–2023" : ""}): ${r.luas.map((x, i) => `${(i + 1) * 24} jam ${fmt(bulat(x.p50))} ha (${fmt(bulat(x.p10))}–${fmt(bulat(x.p90))})`).join("; ")}.
      ${membesar} ${historis} ${r.arah ? `Arah utama ${mata[Math.round(r.arah.deg / 45) % 8]} (keyakinan rendah: pada uji, arah sebar tidak bisa diramal model mana pun).` : ""}
      Terkena (harapan 72 jam): gambut ${fmt(bulat(r.kena.gambut_ha))} ha, kawasan lindung ${fmt(bulat(r.kena.lindung_ha))} ha${r.kena.desa.length ? `, desa: ${r.kena.desa.slice(0, 6).map(x => esc(x.nama)).join(", ")}` : ""}.
      Garis biru di peta = sel berpeluang ≥ 5% (makin gelap makin mungkin). Uji ${tahunUji}: lihat Insight → "Uji model pada kejadian lalu".
      ${Sim.kal?.alasan ? `<br><span style="color:var(--bad)">Model fisika di bawah belum terkalibrasi untuk cluster ini (${esc(Sim.kal.alasan)}) dan pada uji cenderung melebih-lebihkan luas hingga puluhan kali; pakai hanya sebagai pembanding.</span>` : "Model fisika di bawah (terkalibrasi ke pertumbuhan teramati) ditampilkan sebagai pembanding."}</div>`;
  },
};
Sim.op.data = Sim.op.data ?? true; /* model data jadi perkiraan utama (uji 2024-2026: F1 0,136 vs fisika tak terkalibrasi 0,011) */
const panel = Sim.panel, jalan = Sim.jalan, lapis = Sim.pasangLapis, waktu = Sim.waktu;
Sim.panel = function (...a) {
  const r = panel.apply(this, a);
  const kal = $("#simKal")?.closest("label");
  if (kal && !$("#simData")) { kal.insertAdjacentHTML("afterend", `<label class="simcek"><input type="checkbox" id="simData" ${this.op.data ? "checked" : ""}> Model data (dilatih) sebagai perkiraan utama</label>`);
    $("#simData").onchange = e => { this.op.data = e.target.checked; this.tandaiBasi(); }; }
  if (this.op.data && SimData.hasil && SimData.k === this.k) $("#simHasil")?.insertAdjacentHTML("afterbegin", SimData.kartu());
  return r;
};
Sim.jalan = async function (...a) { const r = await jalan.apply(this, a); if (this.op.data && this.hasil) { await SimData.jalan(this); this.panel(); this.pasangLapis(); } return r; };
Sim.pasangLapis = function (...a) { const r = lapis.apply(this, a); SimData.gambar(this); return r; };
if (typeof waktu === "function") Sim.waktu = function (...a) { const r = waktu.apply(this, a); SimData.gambar(this); return r; };
})();
