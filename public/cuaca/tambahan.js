"use strict";
/* ================================================================ tambahan: overlay Langganan, Observasi bandara, Radar; kartu Insight Uji logbook dan Langganan
   Data (semua boleh hilang, bagian yang datanya tak ada dibuang, A18):
   ../banjir/data/cuaca_langganan.json (scripts/cuaca/langganan.py), cuaca_metar.json (metar.py), cuaca_uji_logbook.json (uji_logbook.py, lewat S.uji);
   radar dari RainViewer (api.rainviewer.com), mati secara bawaan dan gagal diam-diam. Semua overlay mati secara bawaan.
   Titik kab = rata-rata pusat kecamatan di ../banjir/data/pusat_kec.json (peta kabupaten penuh 5 MB tak dimuat di halaman ini). */
const Tambahan = (() => {
  const B = "../banjir/data/", BERKAS = {lg: "cuaca_langganan.json", mt: "cuaca_metar.json"}, D = {}, gagal = {};
  const d2 = (v, n = 2) => Number(v).toLocaleString("id-ID", {minimumFractionDigits: n, maximumFractionDigits: n});
  const lihat = k => !!document.querySelector(`#lapis input[data-l="t-${k}"]`)?.checked;
  const bulanIni = () => +tglWIB(SEKARANG()).slice(5, 7), namaBulan = m => new Date(2000, m - 1, 15).toLocaleDateString("id-ID", {month: "long"});
  const kabNama = k => k.split("|").slice(1).join("|"), kabProv = k => namaProv(k.split("|")[0]);

  /* ---------- data ---------- */
  async function muat(k) {
    if (D[k] || gagal[k]) return D[k];
    try { const d = await muatJSON(B + BERKAS[k]);
      if (k === "mt" && (!d?.stasiun?.length || SEKARANG() - Date.parse(d.dibuat) > 12 * 36e5)) throw 0;   /* observasi lebih tua 12 jam = basi */
      if (k === "lg" && !d?.bulan) throw 0;
      D[k] = d; return d; } catch { gagal[k] = true; return null; }
  }
  /* titik kab: rata-rata pusat kecamatan, dihitung sekali */
  async function titikKab() {
    if (D.kab) return D.kab;
    const p = await muatJSON(B + "pusat_kec.json").catch(() => null); if (!p) return null;
    const a = {}; for (const [key, v] of Object.entries(p)) { const k = key.split("|").slice(0, 2).join("|"), o = a[k] ||= [0, 0, 0]; o[0] += v[0]; o[1] += v[1]; o[2]++; }
    return D.kab = Object.fromEntries(Object.entries(a).map(([k, o]) => [k, [o[0] / o[2], o[1] / o[2]]]));
  }
  const barisBulan = () => D.lg?.bulan?.[bulanIni()] || [];

  /* ---------- geojson ---------- */
  const pt = (lon, lat, p) => ({type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties: p});
  const geoLg = () => ({type: "FeatureCollection", features: barisBulan().flatMap(r => { const c = D.kab?.[r[0]]; return c ? [pt(c[1], c[0], {k: r[0], n: r[1], p: r[2]})] : []; })});
  const geoMt = () => ({type: "FeatureCollection", features: D.mt.stasiun.map((s, i) => pt(s.lon, s.lat, {i, tanda: !!s.tanda}))});

  /* ---------- peta ---------- */
  const RAMP = ["interpolate", ["linear"], ["get", "p"], 0, "#bcd6f0", 1, "#6aa7e3", 2, "#e3b94e", 4, "#e58a45", 7, "#c9503a"];
  async function pasangLapis(k) {
    if (!peta || peta.getSource("tb-" + k)) return;
    if (k === "lg") { if (!(await muat("lg")) || !(await titikKab())) return;
      peta.addSource("tb-lg", {type: "geojson", data: geoLg()});
      peta.addLayer({id: "tb-lg", type: "circle", source: "tb-lg", layout: {visibility: lihat("lg") ? "visible" : "none", "circle-sort-key": ["get", "p"]},
        paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["interpolate", ["linear"], ["get", "p"], 0, 2, 8, 8], 8, ["interpolate", ["linear"], ["get", "p"], 0, 6, 8, 20]],
          "circle-color": RAMP, "circle-opacity": .75, "circle-stroke-color": "#fff", "circle-stroke-width": .6}}); }
    if (k === "mt") { if (!(await muat("mt"))) return;
      peta.addSource("tb-mt", {type: "geojson", data: geoMt()});
      peta.addLayer({id: "tb-mt", type: "circle", source: "tb-mt", layout: {visibility: lihat("mt") ? "visible" : "none", "circle-sort-key": ["case", ["get", "tanda"], 1, 0]},
        paint: {"circle-radius": ["case", ["get", "tanda"], 9, 5.5], "circle-color": ["case", ["get", "tanda"], "#c9503a", "#2b8c86"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5, "circle-opacity": .95}}); }
  }
  /* radar RainViewer: frame terbaru dari weather-maps.json; sumber ditambah saat dinyalakan dan dibuang saat dimatikan (atribusi hanya tampil bila dipakai) */
  async function radar() {
    if (D.rv !== undefined) return D.rv;
    try { const r = await fetch("https://api.rainviewer.com/public/weather-maps.json"); if (!r.ok) throw 0; const j = await r.json(), p = j.radar?.past?.at(-1); if (j.host !== "https://tilecache.rainviewer.com" || !/^\/v2\/radar\/[\w-]+$/.test(p?.path || "")) throw 0;
      return D.rv = {url: `${j.host}${p.path}/256/{z}/{x}/{y}/2/1_1.png`, t: p.time * 1000}; } catch { return D.rv = null; }
  }
  async function pasangRadar() {
    if (!peta || peta.getSource("tb-rv") || !lihat("rv")) return;
    const r = await radar(); if (!r || !lihat("rv") || peta.getSource("tb-rv")) return;
    peta.addSource("tb-rv", {type: "raster", tiles: [r.url], tileSize: 256, maxzoom: 7, attribution: "RainViewer"});
    peta.addLayer({id: "tb-rv", type: "raster", source: "tb-rv", paint: {"raster-opacity": .7, "raster-fade-duration": 0}}, Peta.bawahLabel());
  }
  function lepasRadar() { if (peta.getLayer("tb-rv")) peta.removeLayer("tb-rv"); if (peta.getSource("tb-rv")) peta.removeSource("tb-rv"); }
  function pasang() { for (const k of ["lg", "mt"]) if (D[k] || lihat(k)) pasangLapis(k).then(() => renderLegenda()); pasangRadar().then(() => renderLegenda()); }   /* style.load: gambar ulang */
  async function nyala(k) {
    if (k === "rv") { if (lihat("rv")) { await pasangRadar(); if (!D.rv) { const i = document.querySelector('#lapis input[data-l="t-rv"]'); if (i) i.checked = false; toast("Radar RainViewer tidak terbaca"); } } else lepasRadar(); return renderLegenda(); }
    if (lihat(k)) await pasangLapis(k);
    if (peta.getLayer("tb-" + k)) peta.setLayoutProperty("tb-" + k, "visibility", lihat(k) ? "visible" : "none");
    renderLegenda(); }

  /* ---------- kontrol: hanya overlay yang datanya ada ---------- */
  async function kontrol() {
    const [lg, mt] = await Promise.all([muat("lg"), muat("mt")]);
    const A = {lg: ["#7a4a0b", "#e3b94e", "peringatan", "Langganan cuaca ekstrem", "Langganan"], mt: ["#134e4a", "#4fb3a8", "satelit", "Observasi bandara", "Bandara"], rv: ["#1e3a8a", "#7aa7e8", "hujan", "Radar hujan RainViewer", "Radar"]};
    const ada = Object.keys(A).filter(k => k === "rv" || (k === "lg" ? lg : mt)); if (!ada.length) return;
    for (const k of ada) { UBIN["t-" + k] = A[k].slice(0, 3); UBIN_PENDEK["t-" + k] = A[k][4]; }
    $("#lapis").insertAdjacentHTML("beforeend", `<details open><summary>Pengamatan dan peluang dasar</summary>${ada.map(k => `<label><input type="checkbox" data-l="t-${k}"> ${A[k][3]}</label>`).join("")}</details>`);
    $("#lapis").addEventListener("change", e => { const i = e.target.closest('input[data-l^="t-"]'); if (i) nanti(() => nyala(i.dataset.l.slice(2))); });
  }

  /* ---------- legenda ---------- */
  function legenda() { let h = "";
    if (lihat("lg") && D.lg && peta?.getLayer("tb-lg")) h += `<div class="lbl">Peluang dasar cuaca ekstrem, bulan ${namaBulan(bulanIni())} (kejadian per tahun)</div><div class="legscale">${["#bcd6f0", "#6aa7e3", "#e3b94e", "#e58a45", "#c9503a"].map(c => `<i style="background:${c}"></i>`).join("")}</div><div class="legnum"><span>0</span><span>1</span><span>2</span><span>4</span><span>7 atau lebih</span></div>
      <div class="legnum" style="margin:2px 0 8px"><span>Dari catatan kejadian logbook BNPB, bukan prakiraan</span></div>`;
    if (lihat("mt") && D.mt && peta?.getLayer("tb-mt")) h += `<div class="lbl">Observasi bandara (METAR), ${jamWIB(D.mt.dibuat)}</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw" style="background:#c9503a"></i>Badai petir atau embusan ${D.mt.ambang_embusan_kmj} km/jam atau lebih</span><span><i class="sw" style="background:#2b8c86"></i>Lainnya</span></div>`;
    if (lihat("rv") && D.rv && peta?.getLayer("tb-rv")) h += `<div class="lbl">Radar hujan RainViewer, ${jamWIB(D.rv.t)}</div><div class="legnum" style="margin:2px 0 8px"><span>Komposit radar pihak ketiga, bukan data resmi BMKG</span></div>`;
    return h; }

  /* ---------- interaksi ---------- */
  const WX = {TS: "badai petir", RA: "hujan", SH: "hujan lokal", DZ: "gerimis", FG: "kabut", BR: "kabut tipis", HZ: "kabut asap", FU: "asap", GR: "hujan es", SQ: "badai angin", VC: "di sekitar"};
  const wx = c => (c[0] === "+" ? "deras " : c[0] === "-" ? "ringan " : "") + (c.replace(/^[+-]/, "").match(/../g) || []).map(p => WX[p] || p).join(" ");
  const cuacaMt = s => s.cuaca?.length ? s.cuaca.map(wx).join(", ") : "tidak ada";
  const jarak = m => m == null ? "–" : m >= 9999 ? "10 km atau lebih" : fmt(m / 1000) + " km";
  const aktif = () => ["tb-mt", "tb-lg"].filter(id => peta.getLayer(id) && peta.getLayoutProperty(id, "visibility") === "visible");
  const rangkum = f => f.layer.id === "tb-mt" ? {mt: D.mt.stasiun[f.properties.i]} : {lg: f.properties};
  function tipMt(s) { return PI.kartuTip({judul: `<span translate="no">${esc(s.nama)}</span>`, sub: `<small>${esc(s.icao)}, ${jamWIB(s.waktu)}</small>`,
    stat: [["angin", esc(fmt(s.angin_kmj) + " km/jam"), "angin", "#2b8c86"], ["angin", esc(s.embusan_kmj != null ? fmt(s.embusan_kmj) + " km/jam" : "tidak ada"), "embusan", "#c9503a", s.embusan_kencang],
      ["mata", esc(jarak(s.jarak_pandang_m)), "jarak pandang", "#6b7280"], ["hujan", esc(cuacaMt(s)), "cuaca", "#3f7fb8", s.ts]]}); }
  function tipLg(p) { return PI.kartuTip({judul: `<span translate="no">${esc(kabNama(p.k))}</span>`, sub: `<small>${esc(kabProv(p.k))}, bulan ${namaBulan(bulanIni())}</small>`,
    stat: [["peringatan", fmt(p.p) + " per tahun", "peluang dasar", "#e58a45", p.p >= 4], ["debit", fmt(p.n) + " kejadian", "tercatat di logbook", "#6b7280"]]}); }
  function hover(e) { if (!PI || !peta) return false; const L = aktif(); if (!L.length) return false;
    const f = peta.queryRenderedFeatures(e.point, {layers: L})[0]; if (!f) return false;
    peta.getCanvas().style.cursor = "pointer"; const o = rangkum(f); PI.tampilTip(o.mt ? tipMt(o.mt) : tipLg(o.lg), e.originalEvent); return true; }
  function laciMt(s) {
    Laci.buka("Observasi bandara", `<span translate="no">${esc(s.nama)}</span>`, `<span class="pl" style="--w:${s.tanda ? "#c9503a" : "#2b8c86"}">${s.tanda ? "Cuaca ekstrem teramati" : "Teramati biasa"}</span> <span translate="no">${esc(s.icao)}</span>`,
      `${kvs(kot("Angin", fmt(s.angin_kmj), "km/jam"), kot("Embusan", s.embusan_kmj != null ? fmt(s.embusan_kmj) : "–", "km/jam"), kot("Jarak pandang", jarak(s.jarak_pandang_m), ""))}
      <p class="fnd">Cuaca: ${esc(cuacaMt(s))}</p><p class="fnd" translate="no">${esc(s.raw || "")}</p>
      <p class="fnd">Sumber: aviationweather.gov (NOAA), METAR bandara, pengamatan ${jamWIB(s.waktu)}. Pengamatan satu titik bandara, bukan seluruh wilayah sekitarnya.</p>`); }
  function laciLg(k) { const r = barisBulan().find(x => x[0] === k), m = bulanIni(), urut = [...barisBulan()].sort((a, b) => b[2] - a[2]), n = urut.findIndex(x => x[0] === k) + 1; if (!r) return;
    const tahun = Array.from({length: 12}, (_, i) => D.lg.bulan[i + 1]?.find(x => x[0] === k)?.[2] || 0), mx = Math.max(...tahun, 1);
    Laci.buka("Langganan cuaca ekstrem", `<span translate="no">${esc(kabNama(k))}</span>`, `<span class="pl" style="--w:#e58a45">Peluang dasar</span> <span translate="no">${esc(kabProv(k))}</span>`,
      `${kvs(kot("Per tahun", fmt(r[2]), "kejadian"), kot("Tercatat", fmt(r[1]), `kejadian, ${namaBulan(m)}`), kot("Peringkat", fmt(n), `dari ${fmt(urut.length)} kab`))}
      <svg viewBox="0 0 240 60" role="img" style="width:100%">${tahun.map((v, i) => `<rect x="${i * 20 + 2}" y="${50 - v / mx * 44}" width="16" height="${Math.max(1.5, v / mx * 44)}" rx="2" fill="${i + 1 === m ? "#e58a45" : "#9aa4b2"}" data-tip="<b>${namaBulan(i + 1)}</b><br>${d2(v, 1)} kejadian per tahun"/>`).join("")}</svg>
      <p class="fnd">Peluang dasar dari catatan kejadian logbook BNPB, bukan prakiraan. Ia mencerminkan musim dan kebiasaan lapor kabupaten, bukan bahaya fisik.</p>
      <p class="fnd">Sumber: ${esc(sumberLg())}</p>`); }
  function klik(e) { if (!peta) return false; const L = aktif(); if (!L.length) return false; const f = peta.queryRenderedFeatures(e.point, {layers: L})[0]; if (!f) return false;
    S.pilih = null; renderCrumb(); const o = rangkum(f);
    if (o.mt) { laciMt(o.mt); peta.flyTo({center: [o.mt.lon, o.mt.lat], zoom: Math.max(peta.getZoom(), 7), duration: 600}); }
    else { laciLg(o.lg.k); const c = D.kab[o.lg.k]; peta.flyTo({center: [c[1], c[0]], zoom: Math.max(peta.getZoom(), 8), duration: 600}); }
    return true; }
  /* baris tabel Insight diklik: ke peta, overlay dinyalakan, terbang ke kab dan buka laci */
  async function fokusKab(k) { const i = document.querySelector('#lapis input[data-l="t-lg"]'); if (!i || !D.kab?.[k]) return;
    i.checked = true; await nyala("lg"); const c = D.kab[k]; peta.flyTo({center: [c[1], c[0]], zoom: 8, duration: 700}); laciLg(k); }
  const sumberLg = () => `Logbook Pusdalops BNPB, ${D.lg.n_tahun} tahun penuh (${D.lg.tahun_penuh[0]} sampai ${D.lg.tahun_penuh.at(-1)})`;

  return {kontrol, pasang, legenda, hover, klik, fokusKab, muat, titikKab, D, barisBulan, bulanIni, namaBulan, kabNama, kabProv, d2, sumberLg};
})();

/* ================================================================ kartu Insight: Seberapa tepat prakiraan hujan kita, Langganan cuaca ekstrem */
Insight.T.langganan = {urut: "p", turun: true, hal: 0};
Insight.EX.splice(Insight.EX.indexOf("buktiKita") + 1, 0, "uji"); Insight.EX.splice(Insight.EX.indexOf("peluang") + 1, 0, "langganan");
Object.assign(Insight.LABEL, {uji: "Seberapa tepat prakiraan hujan kita", langganan: "Langganan cuaca ekstrem bulan ini"});
IK.uji = IK.bukti; IK.langganan = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>';
Object.assign(Insight, {
  /* titik skor dengan selang kepercayaan: R = [{label, nilai, lo, hi, warna, tip}], sumbu 0,4 sampai 1, garis putus di 0,5 (tebakan acak) */
  titikCI(R, U) { const {W, L, rh} = U, X = v => L + (v - .4) / .6 * (W - L - 50), H = R.length * rh + 30;
    return `<svg viewBox="0 0 ${W} ${H}" role="img"><line x1="${X(.5)}" x2="${X(.5)}" y1="4" y2="${R.length * rh}" stroke="currentColor" stroke-dasharray="4 3" opacity=".4"/>
      ${R.map((r, i) => { const y = i * rh + rh / 2 + 2;
        return `<g><text translate="no" x="${L - 10}" y="${y + 4}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(this.pendek(r.label, U.M ? 16 : 36))}</text>
          ${r.lo != null ? `<line x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y}" y2="${y}" stroke="${r.warna}" stroke-width="3" stroke-linecap="round" opacity=".45"/>` : ""}
          <circle cx="${X(r.nilai)}" cy="${y}" r="7" fill="${r.warna}" data-tip="${esc(r.tip)}"/><text x="${X(r.hi ?? r.nilai) + 12}" y="${y + 4}" font-size="${U.fs}" font-weight="700">${Tambahan.d2(r.nilai)}</text></g>`; }).join("")}
      ${[.5, .6, .7, .8, .9, 1].map(v => `<text x="${X(v)}" y="${H - 6}" text-anchor="middle" font-size="11" opacity=".6">${Tambahan.d2(v, 1)}</text>`).join("")}</svg>`; },
  exUji() { const u = S.uji?.jenis?.cuaca; if (!u?.auc || !u.auc.klimatologi_kab_bulan) return "";
    const A = u.auc, C = u.auc_selang95 || {}, U = this.uk(), BIRU2 = "#4f8fc4", KB = "#7a4fc4", tg = Tambahan.d2, sel = u.selisih_auc_hujan_klimatologi, lolos = sel?.selang95?.[0] > 0, h = A.hujan_harian_maks, k = A.klimatologi_kab_bulan;
    const ci = x => C[x] ? `<br>Selang 95%: ${tg(C[x][0])} sampai ${tg(C[x][1])}` : "";
    const R = [["Hujan harian terlebat", "hujan_harian_maks", BIRU2], ["Hujan per jam terlebat", "hujan_jam_maks", BIRU2], ["Hujan 3 hari", "hujan_3hari", BIRU2], ["Kebiasaan kab dan bulan", "klimatologi_kab_bulan", KB], ["Kebiasaan bulan, nasional", "klimatologi_bulan_nasional", KB]]
      .filter(r => A[r[1]] != null).map(([label, x, warna]) => ({label, nilai: A[x], lo: C[x]?.[0], hi: C[x]?.[1], warna, tip: `<b>${esc(label)}</b><br>Skor ${tg(A[x])}${ci(x)}`}));
    const a50 = u.ambang_mm?.["50"], hj = a50?.hujan, kl = a50?.klimatologi_alarm_sama, pe = u.persistensi, S50 = u.ets50_selang95 || {};
    const E = hj && kl ? [["Hujan 50 mm", hj, BIRU2, S50.hujan], ["Kebiasaan kab dan bulan", kl, KB, S50.klimatologi_alarm_sama], ...(pe?.ets != null ? [["Ada kejadian kemarin", pe, "#9aa4b2", null]] : [])]
      .filter(r => r[1].ets != null) : [];
    const BAR = E.length ? this.batangH(E.map(([label, o, warna, s]) => ({label, nilai: Math.max(0, o.ets), warna, teks: tg(o.ets, 3), tip: `<b>${esc(label)}</b><br>Skor ETS ${tg(o.ets, 3)}<br>Menangkap ${fmt(pct(o.a, o.a + o.c))}% kejadian, ${fmt(pct(o.b, o.a + o.b))}% alarm palsu${s ? `<br>Selang 95%: ${tg(s[0], 3)} sampai ${tg(s[1], 3)}` : ""}`})), U) : "";
    const kal = hj && kl ? `<p class="fnd">Ambang 50 mm menangkap ${this.hl(fmt(pct(hj.a, hj.a + hj.c)) + "%")} kejadian dengan ${this.hl(fmt(pct(hj.b, hj.a + hj.b)) + "%")} alarm palsu. Kebiasaan kab dan bulan pada jumlah alarm yang sama menangkap ${this.hl(fmt(pct(kl.a, kl.a + kl.c)) + "%")} dengan ${this.hl(fmt(pct(kl.b, kl.a + kl.b)) + "%")} alarm palsu.</p>` : "";
    const ver = `<p class="fnd"><span class="pl" style="--w:${lolos ? "var(--ok)" : "var(--bad)"}">${lolos ? "Lolos uji" : "Belum lolos uji"}</span> ${lolos ? "Hujan menebak kejadian cuaca lebih baik daripada kebiasaan kab dan bulan." : "Kebiasaan kab dan bulan menebak lebih baik daripada hujan."} Selisih skor ${tg(sel?.nilai)}${sel?.selang95 ? `, selang 95% ${tg(sel.selang95[0])} sampai ${tg(sel.selang95[1])}` : ""}.</p>`;
    const cav = `<p class="fnd">Diuji pada ${fmt(u.n_hari)} kab-hari dan ${fmt(u.n_kejadian)} kejadian di ${fmt(S.uji.n_kab)} kabupaten/kota, ${S.uji.periode_uji[0].slice(0, 4)} sampai ${S.uji.periode_uji[1].slice(0, 4)}. Skor atas: 0,5 tebakan acak, 1 sempurna. Catatan:</p><ul class="mt">${(S.uji.caveat || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>`;
    Kartu.leg([[BIRU2, "Hujan"], [KB, "Kebiasaan kab dan bulan"], ["#9aa4b2", "Ada kejadian kemarin"]]);
    return this.ex(`Hujan ${this.hl(tg(h))} lawan kebiasaan kab dan bulan ${this.hl(tg(k))}: prakiraan hujan ${lolos ? "lolos" : "belum lolos"} uji logbook`, "", "",
      this.titikCI(R, U) + ver + (BAR ? `<p class="fnd"><b>Skor ETS ambang 50 mm</b> (0 sama dengan menebak acak)</p>` + BAR : "") + kal + cav, `Sumber: Logbook Pusdalops BNPB 2022-2025, hujan ERA5, dibuat ${jamWIB(S.uji.dibuat)}`); },
  exLangganan() { const D = Tambahan.D.lg, R = Tambahan.barisBulan(); if (!D || !R.length) return "";
    const m = Tambahan.bulanIni(), top = [...R].sort((a, b) => b[2] - a[2]), t = top[0], U = this.uk();
    const kol = [{k: "kab", n: "Kabupaten/kota", v: r => Tambahan.kabNama(r[0]), h: r => `<span translate="no">${esc(Tambahan.kabNama(r[0]))}</span>, ${esc(Tambahan.kabProv(r[0]))}`},
      {k: "n", n: "Kejadian tercatat", num: 1, v: r => r[1], h: r => fmt(r[1])}, {k: "p", n: "Per tahun", num: 1, v: r => r[2], h: r => `<span class="pl" style="--w:${r[2] >= 4 ? WARNA_LV[3] : r[2] >= 2 ? WARNA_LV[2] : BIRU}">${fmt(r[2])}</span>`}];
    Kartu.leg([[WARNA_LV[3], "4 per tahun atau lebih"], [WARNA_LV[2], "2 sampai 4"], [BIRU, "di bawah 2"]]);
    return this.ex(`${this.hl(fmt(t[2]) + " kejadian per tahun")} tercatat di ${this.nm2(t[0])} pada bulan ${Tambahan.namaBulan(m)}, tertinggi dari ${fmt(R.length)} kabupaten/kota`, "", "",
      this.batangH(top.slice(0, 10).map(r => ({label: Tambahan.kabNama(r[0]), nilai: r[2], warna: r[2] >= 4 ? WARNA_LV[3] : r[2] >= 2 ? WARNA_LV[2] : BIRU, teks: fmt(r[2]), tip: `<b>${esc(Tambahan.kabNama(r[0]))}</b>, ${esc(Tambahan.kabProv(r[0]))}<br>${fmt(r[2])} kejadian per tahun<br>${fmt(r[1])} kejadian tercatat`})), U)
      + `<p class="fnd">Peluang dasar dari catatan kejadian, bukan prakiraan. Ia mencerminkan musim dan kebiasaan lapor kabupaten, bukan bahaya fisik; logbook tidak memisahkan puting beliung, angin kencang, dan hujan lebat.</p>`
      + this.tabel("langganan", kol, R, 10, "kabupaten/kota", r => `data-lg="${esc(r[0])}"`), `Sumber: ${esc(Tambahan.sumberLg())}, dibuat ${jamWIB(D.dibuat)}`); },
  nm2: k => `<span translate="no">${esc(Tambahan.kabNama(k))}</span>`,
});
