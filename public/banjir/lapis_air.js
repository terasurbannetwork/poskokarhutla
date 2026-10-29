"use strict";
/* Empat overlay air dan pantai di peta /banjir, SEMUA mati sampai diklik (pola LapisEkstra): bendungan dan embung PUPR (SIGI),
   pasang tertinggi 30 hari ke depan (BMKG, data/pasut_30h.json dari scripts/banjir/pasut.py), letak pos duga air dan curah hujan PU
   (data/pos_pu.json: HANYA lokasi, tanpa nilai karena satuan SIHKA tidak seragam). Data dimuat malas saat pertama dinyalakan.
   Bagian murni (LAm) diuji di tests/banjir/lapis_air.test.mjs; bagian peta memakai peta/S/nanti/muatJSON/Analisa/esc/PI/gelap dari skrip lain.
   Ambang "pasang tinggi" = 10% hari tertinggi stasiun itu sendiri (persentil 90), BUKAN batas banjir rob. Validasi terhadap UHSLC ada di
   kepala scripts/banjir/pasut_validasi.py; layar tidak mengklaim ketepatan tinggi muka air. */
globalThis.LAm = (() => {
  const fmt = n => n == null || !isFinite(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = iso => `${+iso.slice(8, 10)} ${BLN[+iso.slice(5, 7) - 1]}`;
  const tambah = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const OR = "#e58a45", WARNA_PASUT = {tinggi: OR, sedang: "#e8c25a", biasa: "#6f9fc8"}, KOSONG = "#9aa6b2";
  const warnaPasut = s => WARNA_PASUT[s] || KOSONG;
  const NAMA_STATUS = {tinggi: "Pasang tinggi", sedang: "Pasang sedang", biasa: "Pasang biasa"};
  const titik = (lon, lat, p) => ({type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties: p});
  const koleksi = f => ({type: "FeatureCollection", features: f});
  /* ukuran ikon bendungan menurut volume (juta m3, logaritmik); tanpa volume = terkecil */
  const ukuran = v => v == null || !(v > 0) ? 0.55 : Math.min(1.15, 0.55 + Math.log10(1 + v) / 5);
  const beroperasi = s => /^Sudah Terbangun \/ Beroperasi|Sedang Dibangun \/ Beroperasi/.test(s || "");
  const fiturBendungan = d => koleksi((d?.bendungan || []).map((r, i) => titik(r[0], r[1], {i, u: ukuran(r[6]), o: beroperasi(r[10]) ? 1 : 0, n: r[2]})));
  const fiturEmbung = d => koleksi((d?.embung || []).map((r, i) => titik(r[0], r[1], {i, n: r[2]})));
  const fiturPos = d => koleksi((d?.pos || []).map((r, i) => titik(r[0], r[1], {i, j: r[3], n: r[2]})));
  const fiturPasut = d => koleksi((d?.stasiun || []).map((s, i) => titik(s.lon, s.lat, {i, s: s.status7 || "", w: warnaPasut(s.status7), n: s.nama})));

  /* ringkas 7 hari pertama: berapa stasiun per status */
  const ringkasPasut = d => { const r = {n: 0, tinggi: 0, sedang: 0, biasa: 0, tanpa: 0, mulai: d?.mulai || null};
    for (const s of d?.stasiun || []) { r.n++; if (s.status7) r[s.status7]++; else r.tanpa++; } return r; };

  /* hari di atas p90 per stasiun: [{tgl, cm, jam, lebih}] */
  const hariTinggi = s => s.p90 == null ? [] : s.hari.filter(x => x[1] > s.p90).map(x => ({tgl: x[0], cm: x[1], jam: x[2], lebih: x[1] - s.p90}));

  /* per provinsi: rentang hari beruntun yang punya stasiun di atas p90; tiap rentang membawa puncak (selisih terbesar di atas p90) */
  const jendelaProv = d => { const per = {};
    for (const s of d?.stasiun || []) for (const h of hariTinggi(s)) { const p = per[s.prov || "Lainnya"] ||= {}; const b = p[h.tgl];
      if (!b || h.lebih > b.lebih) p[h.tgl] = {...h, stasiun: s.nama}; }
    const out = [];
    for (const [prov, hh] of Object.entries(per)) { const tg = Object.keys(hh).sort(), runs = [];
      for (const t of tg) { const r = runs.at(-1); if (r && tambah(r.sampai, 1) === t) { r.sampai = t; r.hari.push(hh[t]); } else runs.push({dari: t, sampai: t, hari: [hh[t]]}); }
      for (const r of runs) { r.puncak = r.hari.reduce((a, b) => b.lebih > a.lebih ? b : a); delete r.hari; }
      out.push({prov, runs}); }
    return out.sort((a, b) => a.runs[0].dari.localeCompare(b.runs[0].dari) || b.runs[0].puncak.lebih - a.runs[0].puncak.lebih); };
  const rentang = r => r.dari === r.sampai ? tgl(r.dari) : `${tgl(r.dari)} sampai ${tgl(r.sampai)}`;
  return {fmt, tgl, tambah, warnaPasut, NAMA_STATUS, OR, ukuran, beroperasi, fiturBendungan, fiturEmbung, fiturPos, fiturPasut, ringkasPasut, hariTinggi, jendelaProv, rentang};
})();

/* ---------- bagian peta ---------- */
const LapisAir = {
  DAFTAR: [["bendungan", "Bendungan (PUPR)"], ["embung", "Embung (PUPR)", true], ["pasut30", "Pasang tertinggi 30 hari (BMKG)"], ["pospu", "Pos duga air dan curah hujan PU"]],
  ID: {bendungan: ["air-bendungan"], embung: ["air-embung"], pasut30: ["air-pasut", "air-pasut-nama"], pospu: ["air-pos"]},
  URL: {bendungan: "data/bendungan.json", embung: "data/bendungan.json", pasut30: "data/pasut_30h.json", pospu: "data/pos_pu.json"},
  D: {}, P: {}, nyala: {},
  menu() { const kotak = $("#lapis"); if (!kotak || $("#airMenu")) return;
    const d = document.createElement("details"); d.id = "airMenu"; d.open = true;
    d.innerHTML = `<summary>Air dan pantai</summary>${this.DAFTAR.map(([k, n, sub]) => `<label${sub ? ' style="margin-left:18px"' : ""}><input type="checkbox" data-l="${k}"> ${n}</label>`).join("")}`;
    kotak.appendChild(d); },
  muat(k) { const u = this.URL[k]; return this.P[u] ||= muatJSON(u).then(x => this.D[u] = x).catch(() => { delete this.P[u]; return null; }); },
  data: k => LapisAir.D[LapisAir.URL[k]],
  vis: k => LapisAir.nyala[k] ? "visible" : "none",
  ubah(k, on) { if (!this.ID[k]) return; this.nyala[k] = on; this.isiKartu();
    if (this.ID[k].some(l => peta?.getLayer(l))) this.ID[k].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none"));
    else if (on) nanti(() => this.pasang(k)); },
  ikonBendungan() { const c = document.createElement("canvas"); c.width = c.height = 44; const g = c.getContext("2d");
    g.beginPath(); g.arc(22, 22, 20, 0, 7); g.fillStyle = "#fff"; g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 3; g.fill(); g.shadowBlur = 0;
    g.beginPath(); g.moveTo(9, 12); g.lineTo(35, 12); g.lineTo(31, 31); g.lineTo(13, 31); g.closePath(); g.fillStyle = "#1c4f82"; g.fill();   /* tubuh bendungan */
    g.beginPath(); g.moveTo(8, 36); g.bezierCurveTo(14, 31, 18, 40, 24, 35); g.bezierCurveTo(29, 31, 33, 39, 38, 35); g.strokeStyle = "#3f9bd6"; g.lineWidth = 2.6; g.lineCap = "round"; g.stroke();   /* air hilir */
    return g.getImageData(0, 0, 44, 44); },
  async pasang(k) { if (!peta) return; const d = await this.muat(k); if (!d || this.ID[k].some(l => peta.getLayer(l))) return this.isiKartu();
    const gl = gelap(), ink = gl ? "#fff" : "#0b2545", halo = gl ? "#0b1424" : "#fff", ke = (id, f) => peta.addSource(id, {type: "geojson", data: f}), ring = {"circle-stroke-color": "#fff", "circle-stroke-width": 1.2};
    if (k === "bendungan") { if (!peta.hasImage("air-dam")) peta.addImage("air-dam", this.ikonBendungan(), {pixelRatio: 2}); ke("air-bendungan", LAm.fiturBendungan(d));
      peta.addLayer({id: "air-bendungan", type: "symbol", source: "air-bendungan", layout: {visibility: this.vis(k), "icon-image": "air-dam", "icon-allow-overlap": true, "icon-size": ["interpolate", ["linear"], ["zoom"], 4, ["*", ["get", "u"], .55], 10, ["get", "u"]]},
        paint: {"icon-opacity": ["case", ["==", ["get", "o"], 1], 1, .55]}}); }
    if (k === "embung") { ke("air-embung", LAm.fiturEmbung(d));
      peta.addLayer({id: "air-embung", type: "circle", source: "air-embung", layout: {visibility: this.vis(k)}, paint: {...ring, "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 12, 7], "circle-color": "#2b8c86"}}); }
    if (k === "pasut30") { ke("air-pasut", LAm.fiturPasut(d));
      peta.addLayer({id: "air-pasut", type: "circle", source: "air-pasut", layout: {visibility: this.vis(k)}, paint: {...ring, "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 10, 11], "circle-color": ["get", "w"]}});
      peta.addLayer({id: "air-pasut-nama", type: "symbol", source: "air-pasut", minzoom: 7, layout: {visibility: this.vis(k), "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-offset": [0, 1.4], "text-optional": true},
        paint: {"text-color": ink, "text-halo-color": halo, "text-halo-width": 1.6}}); }
    if (k === "pospu") { ke("air-pos", LAm.fiturPos(d));
      peta.addLayer({id: "air-pos", type: "circle", source: "air-pos", layout: {visibility: this.vis(k)}, paint: {...ring, "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2.5, 12, 6], "circle-color": ["match", ["get", "j"], "d", "#1f64a8", "#7a4fbf"], "circle-opacity": .85}}); }
    if (!this._hover) { this._hover = true; this.hover(); }
    this.isiKartu(); },
  /* tooltip saat kursor di atas titik (tampilTip bersama); klik membuka rincian */
  hover() { const tip = {"air-bendungan": (p, d) => { const r = d.bendungan[p.i]; return `<b>${esc(r[2])}</b><br>${r[6] != null ? LAm.fmt(r[6]) + " juta m³" : "volume belum tercatat"}`; },
      "air-embung": (p, d) => `<b>${esc(d.embung[p.i][2])}</b><br>Embung`, "air-pasut": (p, d) => { const s = d.stasiun[p.i]; return `<b>${esc(s.nama)}</b><br>${LAm.NAMA_STATUS[s.status7] || "Belum bisa dinilai"}, 7 hari ke depan`; },
      "air-pos": (p, d) => `<b>${esc(d.pos[p.i][2])}</b><br>${p.j === "d" ? "Pos duga air" : "Pos klimatologi dan curah hujan"}`}, kunci = {"air-bendungan": "bendungan", "air-embung": "embung", "air-pasut": "pasut30", "air-pos": "pospu"};
    for (const [l, f] of Object.entries(tip)) { peta.on("mousemove", l, e => { peta.getCanvas().style.cursor = "pointer"; const x = e.features?.[0]; if (x) PI?.tampilTip(f(x.properties, this.data(kunci[l])), e.originalEvent); });
      peta.on("mouseleave", l, () => { peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); }); } },
  /* dipanggil peta.on("click") sesudah LapisEkstra; true bila ditangani */
  klik(e) { if (!peta) return false; const kotak = [[e.point.x - 7, e.point.y - 7], [e.point.x + 7, e.point.y + 7]];
    for (const [l, k, buka] of [["air-pasut", "pasut30", "kartuPasut"], ["air-bendungan", "bendungan", "kartuBendungan"], ["air-embung", "embung", "kartuEmbung"], ["air-pos", "pospu", "kartuPos"]]) {
      const f = this.nyala[k] && peta.getLayer(l) && peta.queryRenderedFeatures(kotak, {layers: [l]})[0]; if (f) { PI?.sembunyiTip(); this[buka](f.properties.i); return true; } }
    return false; },
  kepala: (judul, jenis, ik) => `<span class="pa-ikbulat">${ik}</span><div><h3 id="dlgJudul">${esc(judul)}</h3><p>${jenis}</p></div>`,
  tabel: baris => `<table class="tb2"><tbody>${baris.filter(b => b[1] !== "" && b[1] != null).map(([a, b]) => `<tr><td>${a}</td><td class="n">${esc(String(b))}</td></tr>`).join("")}</tbody></table>`,
  pil: (t, w = "#2b8c86") => `<span class="pill" style="background:${w};color:#fff">${t}</span>`,
  IK: {dam: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16l-2.5 12h-11zM2 20c2.5-3 5-3 7.5 0s5 3 7.500 0 3-2 5-1"/></svg>',
    pos: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M8 7h4M8 11h4M8 15h4M2 18c2.500-3 5-3 7.500 0M15 18c2-2 4-2 7 0"/></svg>',
    ombak: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12c2.500-4 5-4 7.500 0s5 4 7.500 0 3-2.500 5-2M2 18c2.500-4 5-4 7.500 0s5 4 7.500 0 3-2.500 5-2M7 6c1.500-2 3-2 4.500 0"/></svg>'},
  kartuBendungan(i) { const d = this.D[this.URL.bendungan], r = d?.bendungan?.[i]; if (!r) return; const ok = LAm.beroperasi(r[10]);
    Analisa.buka(`<div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:34px;line-height:1;color:${LAm.OR}">${r[6] != null ? LAm.fmt(r[6]) : "–"}</b><span style="font-size:15px">${r[6] != null ? "juta m³ volume tampungan" : "volume belum tercatat"}</span></div>
      ${this.pil(r[10] || "Status belum tercatat", ok ? "#2b8c86" : "#7a8794")}${this.tabel([["Sungai atau DAS", r[3]], ["Kabupaten atau kota", r[5]], ["Provinsi", r[4]], ["Tinggi bendungan", r[7] != null ? LAm.fmt(r[7]) + " m" : ""], ["Tahun", r[8]], ["Pengelola", r[9]]])}
      <p class="fnd">Sumber: ${esc(d.sumber_bendungan)}, diambil ${LAm.tgl(d.tanggal)} ${d.tanggal.slice(0, 4)}. Letak dan atribut dari data PUPR apa adanya; status operasi dan isi waduk saat ini tidak dipantau di sini.</p>`, this.kepala(r[2], "Bendungan", this.IK.dam)); },
  kartuEmbung(i) { const d = this.D[this.URL.embung], r = d?.embung?.[i]; if (!r) return;
    Analisa.buka(`${this.tabel([["Kelurahan", r[3]], ["Kecamatan", r[4]], ["Kabupaten atau kota", r[5]], ["Provinsi", r[6]], ["Kewenangan", r[7]]])}<p class="fnd">Sumber: ${esc(d.sumber_embung)}, diambil ${LAm.tgl(d.tanggal)} ${d.tanggal.slice(0, 4)}. Data embung 2025 baru memuat letak, bukan volume atau kondisi.</p>`, this.kepala(r[2] || "Embung", "Embung", this.IK.dam)); },
  kartuPos(i) { const d = this.D[this.URL.pospu], r = d?.pos?.[i]; if (!r) return; const duga = r[3] === "d";
    Analisa.buka(`${this.pil(duga ? "Pos duga air" : "Pos klimatologi dan curah hujan", duga ? "#1f64a8" : "#7a4fbf")}${this.tabel([["DAS", r[4]]])}<p class="fnd">Hanya letak pos. Angka tinggi muka air dan hujan tidak ditampilkan karena satuan yang dilaporkan belum seragam. Sumber: ${esc(d.sumber)}, diambil ${LAm.tgl(d.tanggal)} ${d.tanggal.slice(0, 4)}.</p>`, this.kepala(r[2] || "Pos", duga ? "Pos duga air" : "Pos klimatologi", this.IK.pos)); },
  /* batang 30 hari, oranye bila di atas p90 stasiun itu; tooltip data-tip tiap batang */
  grafikPasut(s) { const h = s.hari, W = 420, B = 130, L = 34, R = 8, lo = Math.min(0, ...h.map(x => x[1])), hi = Math.max(...h.map(x => x[1]), s.p90 || 0), m = hi - lo || 1, bw = (W - L - R) / h.length;
    const Y = c => 10 + (1 - (c - lo) / m) * (B - 22), mm = c => c < 0 ? "−" + Math.abs(c) : String(c);
    const bar = h.map((x, k) => { const atas = s.p90 != null && x[1] > s.p90, y0 = Y(0), y1 = Y(x[1]), t = esc(`<b>${LAm.tgl(x[0])}, ${x[2]} WIB</b><br>${mm(x[1])} cm${atas ? `<br>${x[1] - s.p90} cm di atas batas pasang tinggi (${s.p90} cm)` : ""}`);
      return `<rect x="${(L + k * bw + 1).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${Math.max(1.5, Math.abs(y0 - y1)).toFixed(1)}" rx="2" fill="${atas ? LAm.OR : "#6f9fc8"}" tabindex="0" data-tip="${t}" aria-label="${LAm.tgl(x[0])}: ${mm(x[1])} cm"/>`; }).join("");
    const sumbu = h.map((x, k) => k % 7 === 0 ? `<text x="${(L + (k + .5) * bw).toFixed(1)}" y="${B + 4}" font-size="10" text-anchor="middle" opacity=".65">${LAm.tgl(x[0])}</text>` : "").join("");
    const grs = [lo, (lo + hi) / 2, hi].map(c => `<line x1="${L}" x2="${W - R}" y1="${Y(c).toFixed(1)}" y2="${Y(c).toFixed(1)}" stroke="currentColor" stroke-opacity=".15"/><text x="${L - 5}" y="${(Y(c) + 3.5).toFixed(1)}" font-size="10" text-anchor="end" opacity=".65">${mm(Math.round(c))}</text>`).join("");
    const batas = s.p90 != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(s.p90).toFixed(1)}" y2="${Y(s.p90).toFixed(1)}" stroke="#c9503a" stroke-dasharray="4 3"/><text x="${W - R}" y="${(Y(s.p90) - 3).toFixed(1)}" font-size="9.5" font-weight="700" fill="#c9503a" text-anchor="end">batas pasang tinggi ${s.p90}</text>` : "";
    return `<div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 2px"><span class="lbl">Pasang tertinggi tiap hari, WIB</span><small>cm</small></div><svg viewBox="0 0 ${W} ${B + 10}" style="width:100%;height:auto;display:block" role="img" aria-label="Pasang tertinggi harian 30 hari ke depan">${grs}${bar}${batas}${sumbu}</svg>`; },
  kartuPasut(i) { const d = this.D[this.URL.pasut30], s = d?.stasiun?.[i]; if (!s) return; const th = LAm.hariTinggi(s), w = LAm.warnaPasut(s.status7);
    const maks = s.hari.reduce((a, b) => b[1] > a[1] ? b : a);
    Analisa.buka(`<div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:34px;line-height:1;color:${LAm.OR}">${s.p90 != null ? th.length : "–"}</b><span style="font-size:15px">${s.p90 != null ? "dari 30 hari di atas batas pasang tinggi stasiun ini" : "hari, batas stasiun belum bisa dihitung"}</span></div>
      ${s.status7 ? this.pil(LAm.NAMA_STATUS[s.status7] + ", 7 hari ke depan", w) : ""}${this.grafikPasut(s)}
      ${this.tabel([["Tertinggi 30 hari", `${LAm.fmt(maks[1])} cm, ${LAm.tgl(maks[0])} pukul ${maks[2]} WIB`], ["Hari di atas batas", th.length ? th.map(x => LAm.tgl(x.tgl)).join(", ") : "tidak ada"], ["Provinsi", s.prov]])}
      <p class="fnd">Prediksi astronomis BMKG Maritim terhadap muka laut rata-rata (MSL), dibuat ${LAm.tgl(d.dibuat.slice(0, 10))}. Batas pasang tinggi adalah 10% hari tertinggi stasiun ini sendiri selama sekitar satu tahun prediksi, bukan batas banjir rob. Surja badai, gelombang, dan penurunan tanah tidak termasuk.</p>`, this.kepala(s.nama, "Pasang 30 hari ke depan", this.IK.ombak)); },
  kartu() { let k = $("#airKartu"); if (k) return k; k = document.createElement("div"); k.id = "airKartu"; k.className = "box"; k.hidden = true; ($("#ekstraKartu") || $("#eksKartu") || $("#lapis")).after(k); return k; },
  isiKartu() { const k = this.kartu(), n = this.nyala, h = [];
    if (n.pasut30) { const d = this.D[this.URL.pasut30]; if (!d) h.push(`<div class="lbl">Pasang tertinggi 30 hari ke depan</div><small>Memuat...</small>`); else { const r = LAm.ringkasPasut(d), jp = LAm.jendelaProv(d), lipat = jp.slice(6);
      const baris = a => a.map(p => `<tr><td>${esc(p.prov)}</td><td style="white-space:nowrap">${p.runs.slice(0, 1).map(x => `<span data-tip="${esc(`<b>${p.prov}</b><br>puncak ${LAm.tgl(x.puncak.tgl)}, ${x.puncak.cm} cm di ${x.puncak.stasiun}<br>${x.puncak.lebih} cm di atas batas pasang tinggi`)}" tabindex="0">${LAm.rentang(x)}</span>`).join("; ")}</td></tr>`).join("");
      h.push(`<div class="lbl">Pasang tertinggi 30 hari ke depan (BMKG)</div><div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:26px;line-height:1;color:${LAm.OR};white-space:nowrap;flex:none">${r.tinggi} dari ${r.n}</b><span style="font-size:14px">stasiun di atas batas pasang tinggi dalam 7 hari ke depan</span></div>
        <div class="legscale">${["tinggi", "sedang", "biasa"].map(s => `<i style="background:${LAm.warnaPasut(s)}"></i>`).join("")}</div><div class="legnum"><span>tinggi</span><span>sedang</span><span>biasa</span></div>
        <div style="overflow-x:auto;margin-top:6px"><table class="tb2"><thead><tr><th>Provinsi</th><th>Pasang tinggi berikutnya</th></tr></thead><tbody>${baris(jp.slice(0, 6))}</tbody></table></div>
        ${lipat.length ? `<details><summary>Semua provinsi (${jp.length})</summary><div style="overflow-x:auto"><table class="tb2"><tbody>${baris(lipat)}</tbody></table></div></details>` : ""}
        <small>Klik stasiun untuk grafik 30 hari. Tinggi rendahnya dinilai terhadap kebiasaan stasiun itu sendiri, bukan batas banjir.</small>`); } }
    if (n.pospu) h.push(`<div class="lbl">Pos duga air dan curah hujan PU</div><div><span style="color:#1f64a8">●</span> pos duga air, <span style="color:#7a4fbf">●</span> pos klimatologi dan curah hujan</div><small>Hanya letak pos, tanpa nilai.</small>`);
    k.hidden = !h.length; k.innerHTML = h.join('<hr style="border:0;border-top:1px solid var(--line,#0002);margin:8px 0">'); },
  legenda() { const n = this.nyala, h = [];
    if (n.bendungan) h.push(`<div class="lbl">Bendungan PUPR</div><div>Ikon bendungan, makin besar makin besar volume; pudar = belum beroperasi</div>`);
    if (n.embung) h.push(`<div class="lbl">Embung PUPR</div><div><span style="color:#2b8c86">●</span> embung</div>`);
    if (n.pasut30) h.push(`<div class="lbl">Pasang 7 hari ke depan (BMKG)</div><div>${["tinggi", "sedang", "biasa"].map(s => `<span style="color:${LAm.warnaPasut(s)}">●</span> ${s}`).join(", ")}</div>`);
    return h.join(""); },
};
typeof document !== "undefined" && typeof $ === "function" && LapisAir.menu();
