"use strict";
/* Lapisan opsional "Genangan historis" di peta /banjir, MATI bawaan. Data statis Google Flood Forecasting (inundation_history,
   turunan GLAD 1999-2020, CC BY 4.0) dari scripts/banjir/genangan_historis.py: poligon per provinsi di data/genangan_historis/<kode>.json
   (+ indeks.json berisi kotak tiap provinsi) dan persen luas per kecamatan di data/genangan_historis_kec.json.
   Berkas dimuat HANYA saat lapisan dinyalakan, dan hanya provinsi yang terlihat di peta pada zoom >= MINZOOM (semua provinsi = 14 MB).
   Bagian murni (LGHm) diuji di tests/banjir/lapis_genangan_historis.test.mjs; bagian peta memakai peta/nanti/muatJSON/Analisa/esc/PI/gelap. */
globalThis.LGHm = (() => {
  const SUMBER = "Google Flood Forecasting, riwayat genangan (GLAD 1999-2020), CC BY 4.0";
  const MINZOOM = 6;
  const fmt = n => n == null || !isFinite(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
  /* urut dari paling ringan ke paling berat; batas = "tergenang minimal X% waktu" pada piksel 128 m */
  const KELAS = {
    rendah: {nama: "Rendah", warna: "#9ecae1", ambang: "0,5%", rentang: "0,5-1% waktu", arti: "tergenang minimal 0,5% waktu, 1999-2020"},
    sedang: {nama: "Sedang", warna: "#3c8fd0", ambang: "1%", rentang: "1-5% waktu", arti: "tergenang minimal 1% waktu, 1999-2020"},
    tinggi: {nama: "Tinggi", warna: "#0b3d8f", ambang: "5%", rentang: "≥5% waktu", arti: "tergenang minimal 5% waktu, 1999-2020"}};
  const URUT = ["rendah", "sedang", "tinggi"];
  const warnaMatch = () => ["match", ["get", "k"], ...URUT.flatMap(k => [k, KELAS[k].warna]), "rgba(0,0,0,0)"];
  const urutGambar = () => ["match", ["get", "k"], "rendah", 0, "sedang", 1, 2];   /* fill-sort-key: kelas berat digambar paling atas */
  const tipKelas = k => KELAS[k] ? `<b>Genangan historis, kelas ${KELAS[k].nama.toLowerCase()}</b><br>${KELAS[k].arti}<br><small>${SUMBER}</small>` : "";
  /* kelas tertinggi dari daftar fitur hasil query (kelas bersarang: tinggi > sedang > rendah) */
  const tertinggi = fs => URUT.slice().reverse().find(k => (fs || []).some(f => f.properties?.k === k)) || null;
  /* persen luas kecamatan: < 0,5 tidak jadi baris, 0,5 sampai < 1 "< 1%", selebihnya dibulatkan */
  const pct = p => p < 1 ? "< 1%" : Math.round(p) + "%";
  /* kode provinsi yang kotaknya beririsan dengan batas peta [w, s, e, n] */
  const provTampak = (indeks, b) => Object.entries(indeks?.prov || {}).filter(([, v]) => v.kotak[0] <= b[2] && v.kotak[2] >= b[0] && v.kotak[1] <= b[3] && v.kotak[3] >= b[1]).map(([k]) => k);
  /* [tinggi, sedang, rendah] persen eksklusif -> baris angka; kelas 0 tidak ditampilkan */
  const barisKec = v => v ? URUT.slice().reverse().map((k, i) => [k, v[i]]).filter(([, p]) => p >= 0.5) : [];
  const kelasAda = fc => URUT.filter(k => (fc?.features || []).some(f => f.properties.k === k));
  return {SUMBER, MINZOOM, fmt, KELAS, URUT, warnaMatch, urutGambar, tipKelas, tertinggi, pct, provTampak, barisKec, kelasAda};
})();

/* ---------- bagian peta ---------- */
const LapisGenhis = {
  K: "genhis", D: {}, P: {}, nyala: false, idx: null, ids: [], ada: new Set(), _wf: null, _t: 0,
  muat(u) { return this.P[u] ||= muatJSON(u).then(x => this.D[u] = x).catch(() => { delete this.P[u]; return null; }); },
  zoomCukup: () => !!peta && peta.getZoom() >= LGHm.MINZOOM,
  ubah(k, on) { if (k !== this.K) return; this.nyala = on; this.ids.forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none"));
    if (on) { this.pasangPeristiwa(); nanti(() => this.segarkan()); } },   /* peta.js memanggil renderLegenda sesudah ubah */
  pasangPeristiwa() { if (this._p || !peta) return; this._p = true;
    peta.on("moveend", () => { if (!this.nyala) return; clearTimeout(this._t); this._t = setTimeout(() => this.segarkan(), 250); });
    /* digambar sekali per frame dan SESUDAH tooltip wilayah (Peta.interaksi mendaftar rAF lebih dulu): kartu wilayah + baris kelas genangan */
    peta.on("mousemove", e => { if (!this.nyala || !this.ids.length) return; this._e = e; this._raf ||= requestAnimationFrame(() => { this._raf = 0; const e = this._e; if (!e || !this.nyala || peta.isMoving()) return;
      const f = peta.queryRenderedFeatures(e.point, {layers: this.ids.filter(l => peta.getLayer(l))}); if (!f.length) { this._tip = false; this._wf = null; return; }
      const kls = LGHm.tertinggi(f), w = peta.getLayer("wil-fill") && peta.queryRenderedFeatures(e.point, {layers: ["wil-fill"]})[0], wf = kls + "|" + (w?.properties.kunci || "");
      this._tip = true; if (wf === this._wf) return; this._wf = wf;   /* kelas dan wilayah sama: tooltip tidak digambar ulang */
      let kartu = ""; try { kartu = w && !Peta.diKej && S.mode !== "riwayat" ? Peta.kartuWilayah(w) : ""; } catch { kartu = ""; }
      PI?.tampilTip(kartu ? kartu + `<hr style="border:0;border-top:1px solid var(--line,#0002);margin:6px 0">` + LGHm.tipKelas(kls) : LGHm.tipKelas(kls), e.originalEvent); }); }); },
  /* muat indeks lalu provinsi yang terlihat; satu provinsi per giliran supaya peta tidak tertahan */
  async segarkan() { if (!this.nyala || !peta) return; if (!this.zoomCukup()) return this.isiKartu();
    this.idx ||= await this.muat("data/genangan_historis/indeks.json"); if (!this.idx) return this.isiKartu();
    const b = peta.getBounds(), perlu = LGHm.provTampak(this.idx, [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]).filter(k => !peta.getSource("gh-" + k));
    for (const k of perlu) { const d = await this.muat(`data/genangan_historis/${k}.json`); if (!d || !this.nyala || peta.getSource("gh-" + k)) continue;
      await new Promise(r => nanti(r)); this.pasang(k, d); }
    this.isiKartu(); },
  pasang(k, d) { const id = "gh-" + k, bawah = peta.getLayer("wil-line") ? "wil-line" : undefined;
    peta.addSource(id, {type: "geojson", data: d});
    peta.addLayer({id, type: "fill", source: id, layout: {visibility: this.nyala ? "visible" : "none", "fill-sort-key": LGHm.urutGambar()}, paint: {"fill-color": LGHm.warnaMatch(), "fill-opacity": ["interpolate", ["linear"], ["zoom"], 8, .55, 13, .35], "fill-antialias": false}}, bawah);
    this.ids.push(id); LGHm.kelasAda(d).forEach(k => this.ada.add(k)); },
  /* klik hanya di zoom >= 10: di bawahnya klik tetap drill-down wilayah. true bila ditangani */
  klik(e) { if (!this.nyala || !peta || peta.getZoom() < 10 || !this.ids.length) return false;
    const f = peta.queryRenderedFeatures(e.point, {layers: this.ids.filter(l => peta.getLayer(l))}); if (!f.length) return false;
    PI?.sembunyiTip(); const kls = LGHm.tertinggi(f), w = peta.getLayer("wil-fill") && peta.queryRenderedFeatures(e.point, {layers: ["wil-fill"]})[0], kunci = w?.properties.kunci, ps = kunci && kunci.split("|").length === 3 ? kunci : null;
    const kec = ps ? this.D["data/genangan_historis_kec.json"] : null, nama = ps ? ps.split("|")[2] : "Genangan historis";
    const tabel = baris => `<table class="tb2"><tbody>${baris.map(([a, b]) => `<tr><td>${a}</td><td class="n">${b}</td></tr>`).join("")}</tbody></table>`;
    const bk = LGHm.barisKec(kec?.kec?.[ps]);
    const isi = `<div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:26px;line-height:1;color:${LGHm.KELAS[kls].warna}">${LGHm.KELAS[kls].nama}</b><span style="font-size:15px">kelas genangan di titik ini</span></div>
      <p class="fnd">Piksel 128 m di sini ${LGHm.KELAS[kls].arti}.</p>
      ${ps ? (bk.length ? tabel(bk.map(([k, p]) => [`Luas kecamatan, kelas ${LGHm.KELAS[k].nama.toLowerCase()} (${LGHm.KELAS[k].rentang})`, LGHm.pct(p)])) + `<p class="fnd">Persen dari sampling kisi ~222 m, galat ±1-2 poin, dari luas kecamatan (termasuk badan air).</p>` : `<p class="fnd">Tidak ada bagian kecamatan ini yang masuk kelas genangan historis.</p>`) : ""}
      <p class="fnd">Sumber: ${LGHm.SUMBER}. Deteksi optik GLAD (Landsat) 1999-2020, badan air tetap tidak digambar. Di kota padat dan sawah, data ini cenderung melebih-lebihkan; bukan prakiraan banjir.</p>`;
    Analisa.buka(isi, `<div><h3 id="dlgJudul">${esc(nama)}</h3><p>Genangan historis</p></div>`);
    if (ps && !kec) this.muat("data/genangan_historis_kec.json");   /* persen kecamatan menyusul untuk klik berikutnya */
    return true; },
  isiKartu() { /* kartu keterangan ada di legenda bersama; hanya perlu digambar ulang */ renderLegenda(); },
  legenda() { if (!this.nyala) return "";
    const ada = this.ada;
    if (!ada.size) return `<div class="lbl">Genangan historis, 1999-2020</div><div>${this.zoomCukup() ? "Memuat..." : `Perbesar peta sampai zoom ${LGHm.MINZOOM} untuk memuat lapisan.`}</div>`;
    return `<div class="lbl">Genangan historis, 1999-2020</div>${LGHm.URUT.filter(k => ada.has(k)).reverse().map(k => `<div><span style="color:${LGHm.KELAS[k].warna}">●</span> ${LGHm.KELAS[k].nama.toLowerCase()}, tergenang minimal ${LGHm.KELAS[k].ambang} waktu</div>`).join("")}<small>${LGHm.SUMBER}</small>`; },
};
