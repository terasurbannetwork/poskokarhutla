"use strict";
/* ================================================================ satelit: TROPOMI (lapisan peta + kartu seri) dan rapor model PM2,5
   Data: /udara/data/{tropomi_kisi,tropomi_seri,uji_panen_pm25,openaq_mos}.json. Dimuat malas (lapisan saat dinyalakan, kartu saat Insight dibuka);
   berkas hilang = lapisan/kartu dibuang (A18). Semua angka dibaca dari berkas, tidak ada angka uji yang ditulis tangan di sini.
   TROPOMI = pengamatan satelit, bukan prakiraan dan bukan ISPU; modelnya TAK TERUJI (status dibaca dari tropomi_seri.model). */
const K_CO = 1e22 / 6.02214076e23;   /* 1e18 molekul/cm2 -> mol/m2 (1e4 cm2/m2, bilangan Avogadro) */
const SUMBER_TROPOMI = "Copernicus Sentinel-5P TROPOMI lewat NASA GES DISC";
const dec = (v, n) => v == null || isNaN(v) ? "–" : Number(v).toLocaleString("id-ID", {minimumFractionDigits: n, maximumFractionDigits: n});
const tglS = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
const Satelit = {
  _p: {}, st: {},
  muatBerkas(n) { return this._p[n] ||= fetch("/udara/data/" + n + ".json").then(r => r.ok ? r.json() : null).catch(() => null); },
  /* ---------- lapisan peta ---------- */
  async ganti(on) { if (on) { const K = this._k = await this.muatBerkas("tropomi_kisi"); if (!K?.baris?.length) { const i = document.querySelector('#lapis input[data-l="tropomi"]'); if (i) { i.checked = false; i.closest("label").hidden = true; } return renderLegenda(); } this.pasangPeta(); }
    if (peta?.getLayer("tropo")) peta.setLayoutProperty("tropo", "visibility", on ? "visible" : "none"); renderLegenda(); },
  async pasangPeta() {
    const K = await this.muatBerkas("tropomi_kisi"); if (!K?.baris?.length || !peta?.isStyleLoaded() || peta.getSource("tropo")) return;
    const fitur = K.baris.filter(b => b[2] != null && b[4] >= 10).map(b => ({type: "Feature", geometry: {type: "Point", coordinates: [b[1], b[0]]}, properties: {co: +(b[2] * K_CO).toFixed(4), ai: b[3]}}));
    peta.addSource("tropo", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
    peta.addLayer({id: "tropo", type: "circle", source: "tropo", layout: {visibility: Peta.lihat("tropomi") ? "visible" : "none"},
      paint: {"circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 3, .8, 10, 100], "circle-opacity": .62,
        "circle-color": ["interpolate", ["linear"], ["get", "co"], ...this.WARNA.flat()]}}, Peta.bawahLabel());
    if (this._ia) return; this._ia = true;
    peta.on("mousemove", "tropo", e => { Peta._diKota = true; peta.getCanvas().style.cursor = "crosshair"; PI?.tampilTip(this.kartuSel(e.features[0].properties), e.originalEvent); });
    peta.on("mouseleave", "tropo", () => { Peta._diKota = false; peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); }); },
  WARNA: [[.04, "#f3e3a3"], [.06, "#f0a05f"], [.09, "#e8743b"], [.13, "#c0392b"], [.2, "#6a1b9a"]],   /* mol/m2; sebaran nilai, bukan ambang kesehatan */
  kartuSel(p) { const co = +p.co, ai = p.ai == null || p.ai === "null" ? null : +p.ai, K = this._k;
    return PI.kartuTip({judul: "Kolom CO satelit", sub: `<small>pengamatan ${tglS(K.hari)}</small>`, stat: [["satelit", dec(co, 3) + " mol/m²", "kolom CO", "#c0392b"], ...(ai == null ? [] : [["angin", dec(ai, 2), "indeks aerosol (di atas 1 = asap)", "#7d8ca3"]])]}); },
  legenda() { const K = this._k; if (!K) return "";
    return `<div class="lbl">Kolom CO satelit <span style="text-transform:none">(mol/m²)</span></div><div class="leg" style="margin:4px 0 8px">${this.WARNA.map(([v, w]) => `<span><i class="sw" style="background:${w}"></i>${dec(v, 2)}${v === this.WARNA.at(-1)[0] ? " ke atas" : ""}</span>`).join("")}</div>
      <div class="fnd" style="margin:0 0 8px">Pengamatan ${tglS(K.hari)}, bukan prakiraan. ${SUMBER_TROPOMI}. Model TAK TERUJI.</div>`; },
  /* ---------- kartu seri per provinsi ---------- */
  async muatKartu() { const [S5, K, U, O] = await Promise.all([this.muatBerkas("tropomi_seri"), this.muatBerkas("tropomi_kisi"), this.muatBerkas("uji_panen_pm25"), this.muatBerkas("openaq_mos")]);
    this._k = K; this._s = S5; this._u = U; this._o = O; this._p.tropomi_kisi = K; },
  deret(k) { const S5 = this._s, ko = S5.kolom, i = n => ko.indexOf(n), mn = S5.min_piksel || 10;
    return Object.entries(S5.prov[k] || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([t, r]) => ({t, co: r[i("n_co")] >= mn ? r[i("co")] * K_CO : null, ai: r[i("n_ai")] >= mn ? r[i("ai")] : null, an: r[i("anom")]})); },
  exTropo() {
    const S5 = this._s; if (!S5?.prov) return "";
    const kode = Object.keys(S5.prov).filter(k => this.deret(k).some(d => d.co != null)); if (!kode.length) return "";
    const akhir = k => this.deret(k).filter(d => d.co != null).at(-1), teratas = [...kode].sort((a, b) => akhir(b).co - akhir(a).co)[0];
    const pilih = kode.includes(this.st.tropoK) ? this.st.tropoK : teratas, D = this.deret(pilih), L = akhir(pilih);
    const M = innerWidth < 640, W = M ? 520 : 940, Lk = 70, h = 70, n = D.length, bw = Math.min(70, (W - Lk - 20) / n - 14);
    const barisCO = D.filter(d => d.co != null), mxCO = Math.max(.001, ...barisCO.map(d => d.co)), aiAda = D.filter(d => d.ai != null), mxAI = Math.max(.5, ...aiAda.map(d => Math.abs(d.ai)));
    const X = i => Lk + 10 + i * ((W - Lk - 20) / n);
    const co = D.map((d, i) => d.co == null ? "" : `<rect class="gx" style="--i:${i}" x="${X(i)}" y="${h - d.co / mxCO * (h - 24) + 10}" width="${bw}" height="${d.co / mxCO * (h - 24)}" fill="#c0392b" data-tip="<b>${esc(namaProv(pilih))}</b>, ${tglS(d.t)}<br>Kolom CO: ${dec(d.co, 3)} mol/m²${d.an == null ? "" : `<br>Selisih dari provinsi bersih: ${dec(d.an, 1)} simpangan`}"/>
      <g class="gf" style="--i:${i}">${Kartu.pil(X(i) + bw / 2 - (dec(d.co, 3).length * 6.6 + 16) / 2, h - d.co / mxCO * (h - 24) - 12, dec(d.co, 3), "#c0392b", "#fff", 11)[0]}</g>`).join("");
    const ai = D.map((d, i) => d.ai == null ? "" : `<rect class="gx" style="--i:${i}" x="${X(i)}" y="${d.ai >= 0 ? 40 - d.ai / mxAI * 28 : 40}" width="${bw}" height="${Math.max(1, Math.abs(d.ai) / mxAI * 28)}" fill="${d.ai > 1 ? "#6a1b9a" : "#8a94a6"}" data-tip="<b>${esc(namaProv(pilih))}</b>, ${tglS(d.t)}<br>Indeks aerosol: ${dec(d.ai, 2)} (di atas 1 = asap)"/>
      <text x="${X(i) + bw / 2}" y="${d.ai >= 0 ? 38 - d.ai / mxAI * 28 : 40 + Math.abs(d.ai) / mxAI * 28 + 13}" text-anchor="middle" font-size="11" font-weight="700">${dec(d.ai, 2)}</text>`).join("");
    const tg = D.map((d, i) => `<text x="${X(i) + bw / 2}" y="14" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">${tglS(d.t)}</text>`).join("");
    const svg = `<svg viewBox="0 0 ${W} ${h + 10 + 130}" role="img" aria-label="Kolom CO dan indeks aerosol satelit ${esc(namaProv(pilih))}">
      <text x="0" y="${h - 8}" font-size="12" font-weight="600">CO (mol/m²)</text>${co}
      <g transform="translate(0,${h + 14})"><text x="0" y="30" font-size="12" font-weight="600">Aerosol</text><line x1="${Lk}" x2="${W - 10}" y1="40" y2="40" stroke="currentColor" opacity=".25"/>${ai}</g>
      <g transform="translate(0,${h + 104})">${tg}</g></svg>`;
    return Kartu.ex(`${Kartu.hl(dec(L.co, 3) + " mol/m²")} kolom CO terbaca satelit di ${esc(namaProv(pilih))} pada ${tglS(L.t)}${L.an != null ? `, ${Kartu.hl(dec(L.an, 1) + " simpangan")} dari provinsi bersih` : ""}`, "", "",
      `<div style="margin:0 0 6px"><span class="kt" style="--c:#6b7280;--f:#fff;text-transform:none;letter-spacing:0">pengamatan satelit, bukan prakiraan</span> <span class="kt" style="--c:#b5651d;--f:#fff;text-transform:none;letter-spacing:0" title="${esc(S5.model?.alasan || "")}">model ${esc(S5.model?.status || "TAK TERUJI")}</span></div>` + svg
      + `<p class="fnd">Hanya ${fmt(n)} hari terbaca${S5.model?.alasan ? `; ${esc(S5.model.alasan)}` : ""}, jadi tidak ada ramalan dan belum bisa dipakai menilai tren. Hari tanpa cukup piksel (kurang dari ${fmt(S5.min_piksel || 10)}) dibuang. Data ${jamWIB(S5.dibuat)}.</p>`,
      `Sumber: ${SUMBER_TROPOMI}, kontrol Centurisk97`, Kartu.selProv("tropoK", "Provinsi", kode.sort((a, b) => namaProv(a).localeCompare(namaProv(b), "id")), namaProv, {tropoK: pilih})).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${Insight.eyIk("jarak", "Satelit CO")}</span>`); },
  /* ---------- rapor model PM2,5 ---------- */
  exRapor() {
    const U = this._u, m = U?.mos, e = U?.ensambel; if (!m?.mae_uji) return "";
    const NAMA = {cams_mentah: "CAMS mentah", mos: "MOS (CAMS dikoreksi)", klimatologi_stasiun: "Rata-rata stasiun", persistensi_24j: "Sama seperti 24 jam lalu", klimatologi_stasiun_jam: "Rata-rata stasiun per jam"};
    const NAMA_E = {cams: "CAMS", geoscf: "GEOS-CF", ensambel: "Gabungan", ensambel_koreksi_bias: "Gabungan + koreksi bias", persistensi_obs_kemarin: "Sama seperti kemarin", klimatologi_stasiun_jam: "Rata-rata stasiun per jam"};
    const bar = (mae, nama, sorot) => { const r = Object.entries(mae).filter(([k]) => nama[k]).sort((a, b) => a[1] - b[1]), mx = Math.max(...r.map(x => x[1])), M = innerWidth < 640, W = M ? 520 : 940, L = M ? 160 : 230, rh = 28, X = v => v / mx * (W - L - 100);
      return `<svg viewBox="0 0 ${W} ${r.length * rh + 6}" role="img" aria-label="Galat rata-rata mutlak (MAE) per metode">${r.map(([k, v], i) => { const y = i * rh, w = sorot.includes(k) ? "#c9503a" : "#8a94a6";
        return `<text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${M ? 12 : 13}" font-weight="${sorot.includes(k) ? 700 : 500}">${nama[k]}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(v))}" height="${rh - 10}" fill="${w}" data-tip="<b>${nama[k]}</b><br>Galat rata-rata ${dec(v, 1)} µg/m³"/><g class="gf" style="--i:${i}">${Kartu.pil(L + Math.max(3, X(v)) + 8, y + 5, dec(v, 1), w, "#fff")[0]}</g>`; }).join("")}</svg>`; };
    const a = m.mae_uji, kalah = Object.keys(NAMA).filter(k => k !== "mos" && a[k] != null && a[k] < a.mos).map(k => NAMA[k].toLowerCase());
    const pilVonis = v => `<span class="kt" style="--c:${v === "LOLOS" ? "#2b8c86" : "#c9503a"};--f:#fff;text-transform:none;letter-spacing:0">${esc(v)}</span>`;
    const lokal = (U.stasiun || []).filter(s => (s.lat > -6.9 && s.lat < -5.9 && s.lon > 106.5 && s.lon < 107.2) || (s.lat > -9 && s.lat < -8 && s.lon > 114.9 && s.lon < 115.8)).length, nst = (U.stasiun || []).length || m.n_stasiun;
    const O = this._o?.mos, ci = m.selisih_mae_mos_vs_mentah_ci95;
    const bagE = e?.mae_uji ? `<p class="fnd"><b>Gabungan CAMS dan GEOS-CF</b> ${pilVonis(e.vonis)}: dengan koreksi bias galatnya ${dec(e.mae_uji.ensambel_koreksi_bias, 1)} µg/m³, lebih buruk dari ${NAMA_E[e.anggota_terbaik] || e.anggota_terbaik} sendiri (${dec(e.mae_uji[e.anggota_terbaik], 1)}). ${fmt(e.n_stasiun)} stasiun, ${fmt(e.n_uji)} jam uji.</p>${bar(e.mae_uji, NAMA_E, ["ensambel_koreksi_bias"])}` : "";
    const bagO = O ? `<p class="fnd">Uji ulang dengan data lebih pendek (${esc(this._o.sumber_obs || "stasiun pengganti")}, ${fmt(O.n_stasiun)} stasiun, ${fmt(O.n_latih)} jam latih): MOS ${pilVonis(O.vonis)}, galat ${dec(O.mae_uji.mos, 1)} lawan CAMS mentah ${dec(O.mae_uji.cams_mentah, 1)} µg/m³. Hasil MOS tidak stabil antarkumpulan data.</p>` : "";
    Kartu.leg([["#c9503a", "disorot"], ["#8a94a6", "pembanding"]]);
    return Kartu.ex(`Koreksi MOS ${m.vonis === "LOLOS" ? "mengalahkan" : "gagal mengalahkan"} CAMS mentah (${Kartu.hl(dec(a.mos, 1) + " lawan " + dec(a.cams_mentah, 1) + " µg/m³")})${kalah.length ? `, tetapi kalah dari ${kalah.join(" dan ")}` : ""}`, "", "",
      `<div style="margin:0 0 6px">${pilVonis(m.vonis)} <span class="kt" style="--c:#6b7280;--f:#fff;text-transform:none;letter-spacing:0">uji pada data yang tidak dipakai melatih</span></div>` + bar(a, NAMA, ["mos"])
      + `<p class="fnd">Galat rata-rata mutlak (makin kecil makin baik), ${fmt(m.n_uji)} jam uji di ${fmt(m.n_stasiun)} stasiun, ${esc((m.rentang?.[0] || "").slice(0, 7))} sampai ${esc((m.rentang?.[1] || "").slice(0, 7))}.${ci ? ` Selisih terhadap CAMS mentah ${dec(ci[0], 1)} sampai ${dec(ci[1], 1)} µg/m³ (selang 95%).` : ""}</p>`
      + bagE + bagO
      + `<p class="fnd"><b>Batas:</b> ${lokal && nst ? `${fmt(lokal)} dari ${fmt(nst)} stasiun ada di Jabodetabek dan Bali` : "stasiun tidak tersebar merata"}, jadi angka ini belum mewakili wilayah asap karhutla di Sumatera dan Kalimantan. Hasil di sini tidak boleh dibaca sebagai ketepatan di sana. Data ${jamWIB(U.dibuat)}.</p>`,
      "Sumber: OpenAQ dan penyedia asalnya, CAMS lewat Open-Meteo, NASA GMAO GEOS-CF; uji Centurisk97").replace('<span class="ex-ey"></span>', `<span class="ex-ey">${Insight.eyIk("pel", "Rapor model")}</span>`); },
};
