"use strict";
/* ================================================================ stasiun BMKG: PM2,5 PENGUKURAN (bukan model)
   Data: /udara/data/bmkg_pm25.json (scripts/udara/bmkg_pm25.py, sumber BMKG). Dimuat di mulai.js; berkas hilang atau tanpa stasiun segar = lapisan dan kartu dibuang (A18).
   Stasiun tanpa nilai segar (v null) tidak digambar dan tidak pernah jadi nol. Angka ini TIDAK masuk hitungan model CAMS (jiwa, kategori provinsi, kota).
   Kategori warna memakai ambang 24 jam P.14/2020 (KAT) sebagai acuan; nilai BMKG di sini per jam. */
const dec1 = v => Number(v).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const SUMBER_BMKG = "Sumber: BMKG, pengukuran stasiun";
const PIL_UKUR = '<span class="kt" style="--c:#0b2545;--f:#fff;text-transform:none;letter-spacing:0">pengukuran stasiun BMKG, bukan model</span>';
const Stasiun = {
  D: null,
  async muat() { this.D = await fetch("/udara/data/bmkg_pm25.json").then(r => r.ok ? r.json() : null).catch(() => null); },
  segar() { return (this.D?.stasiun || []).filter(s => s.v != null && isFinite(s.lat) && isFinite(s.lon)); },
  geo() { return {type: "FeatureCollection", features: this.segar().map((s, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [s.lon, s.lat]}, properties: {i, k: kat(s.v)}}))}; },
  pasangPeta() {
    if (!this.segar().length || peta.getSource("bmkg")) return;
    peta.addSource("bmkg", {type: "geojson", data: this.geo()});
    peta.addLayer({id: "bmkg", type: "circle", source: "bmkg", layout: {visibility: Peta.lihat("bmkg") ? "visible" : "none", "circle-sort-key": ["get", "k"]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 7, 9, 12], "circle-color": ["match", ["get", "k"], 4, KAT[4].w, 3, KAT[3].w, 2, KAT[2].w, 1, KAT[1].w, KAT[0].w], "circle-stroke-color": "#0b2545", "circle-stroke-width": 3}}); },
  kartu(i) { const s = this.segar()[i]; if (!s) return ""; const c = kat(s.v);
    return PI.kartuTip({judul: esc(s.nama), sub: `<small>Stasiun BMKG, ${esc(jamWIB(s.t))}</small>`, stat: [["debit", dec1(s.v) + " µg/m³", "PM2,5 terukur, " + KAT[c].n, KAT[c].w, c >= 2], ["satelit", "BMKG", "pengukuran stasiun", "#0b2545"]]}); },
  /* deret 5 hari per jam: batang per jam berwarna kategori, hover menyebut jam WIB; jam tanpa nilai kosong (bukan nol) */
  laci(i) { const s = this.segar()[i]; if (!s) return;
    const M = innerWidth < 640, W = M ? 360 : 400, H = 150, L = 34, T0 = Date.parse(s.t0), n = s.deret.length, bw = (W - L - 6) / n, mx = Math.max(60, ...s.deret.filter(v => v != null)), Y = v => H - 22 - v / mx * (H - 40);
    const bar = s.deret.map((v, j) => { if (v == null) return ""; const c = kat(v), t = new Date(T0 + j * 36e5).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(/\./g, ":") + " WIB";
      return `<rect class="gx" style="--i:${Math.min(j, 30)}" x="${(L + j * bw).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${Math.max(1, bw - .6).toFixed(1)}" height="${(H - 22 - Y(v)).toFixed(1)}" fill="${KAT[c].w}" data-tip="<b>${esc(s.nama)}</b><br>${t}<br>${dec1(v)} µg/m³, ${KAT[c].n}"/>`; }).join("");
    const hari = []; for (let j = 0; j < n; j++) { const d = new Date(T0 + j * 36e5), jam = +d.toLocaleString("en-GB", {timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false}) % 24; if (jam === 0) hari.push([j, d.toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short"})]); }
    const garis = [15.5, 55.4].filter(b => b < mx).map(b => `<line x1="${L}" x2="${W}" y1="${Y(b)}" y2="${Y(b)}" stroke="currentColor" opacity=".3" stroke-dasharray="3 3"/><text x="${L - 4}" y="${Y(b) + 4}" text-anchor="end" font-size="10" fill="currentColor" opacity=".7">${dec1(b).replace(",0", "")}</text>`).join("");
    const sb = hari.map(([j, l]) => `<line x1="${L + j * bw}" x2="${L + j * bw}" y1="${H - 22}" y2="${H - 17}" stroke="currentColor" opacity=".5"/><text x="${L + j * bw + 2}" y="${H - 6}" font-size="10" fill="currentColor" opacity=".75">${l}</text>`).join("");
    const nilai = s.deret.filter(v => v != null), rata = nilai.reduce((a, b) => a + b, 0) / nilai.length;
    Laci.buka("Stasiun BMKG", `<span translate="no">${esc(s.nama)}</span>`, PIL_UKUR,
      `<div class="grid" style="grid-template-columns:repeat(3,1fr)">${kot("Terbaru", `<span style="color:${KAT[kat(s.v)].w}">${dec1(s.v)} µg/m³</span>`, KAT[kat(s.v)].n)}${kot("Rata 5 hari", dec1(rata) + " µg/m³", KAT[kat(rata)].n)}${kot("Tertinggi", dec1(Math.max(...nilai)) + " µg/m³", "per jam")}</div>
      <p class="fnd">PM2,5 per jam, ${fmt(nilai.length)} jam terukur (${esc(jamWIB(s.t0))} sampai ${esc(jamWIB(s.t))}). Jam tanpa data dikosongkan, bukan nol.</p>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="PM2,5 per jam stasiun ${esc(s.nama)}" style="width:100%">${garis}${bar}${sb}</svg>
      <p class="fnd">Warna memakai ambang kategori 24 jam (garis putus: 15,5 dan 55,4 µg/m³) sebagai acuan; nilai BMKG di sini per jam. Pengukuran stasiun, tidak dicampur dengan angka model CAMS di halaman ini.</p>
      <p class="fnd">${SUMBER_BMKG}, terbit ${esc(jamWIB(this.D.terbit))}.</p>`); },
  legenda() { const n = this.segar().length; if (!n) return "";
    return `<div class="lbl">Stasiun BMKG, PM2,5 terukur <span style="text-transform:none">(µg/m³, bingkai gelap)</span></div><div class="leg" style="margin:4px 0 4px">${KAT.map(k => `<span><i class="sw dot" style="background:${k.w};box-shadow:0 0 0 2px #0b2545"></i>${k.n}</span>`).join("")}</div>
      <div class="fnd" style="margin:0 0 8px">${fmt(n)} stasiun dengan nilai segar. Pengukuran, bukan model. ${SUMBER_BMKG}, terbit ${esc(jamWIB(this.D.terbit))}.</div>`; },
  /* kartu Insight */
  ex() { const A = this.segar(); if (!A.length) return "";
    const R = [...A].sort((a, b) => b.v - a.v), top = R[0], baik = A.filter(s => kat(s.v) === 0).length, M = innerWidth < 640, W = M ? 520 : 940, L = M ? 150 : 210, rh = 24, X = v => v / Math.max(60, top.v) * (W - L - 100);
    const svg = `<svg viewBox="0 0 ${W} ${R.length * rh + 6}" role="img" aria-label="PM2,5 terukur stasiun BMKG">${R.map((s, i) => { const y = i * rh, c = kat(s.v), w = KAT[c].w;
      return `<text x="${L - 10}" y="${y + 17}" text-anchor="end" font-size="${M ? 12 : 13}" translate="no">${esc(s.nama)}</text><rect class="gx" style="--i:${Math.min(i, 30)}" x="${L}" y="${y + 4}" width="${Math.max(3, X(s.v))}" height="${rh - 8}" fill="${w}" data-tip="<b>${esc(s.nama)}</b><br>${dec1(s.v)} µg/m³, ${KAT[c].n}<br>${esc(jamWIB(s.t))}, BMKG"/><g class="gf" style="--i:${Math.min(i, 30)}">${Kartu.pil(L + Math.max(3, X(s.v)) + 8, y + 2, dec1(s.v), w, KAT[c].fg)[0]}</g>`; }).join("")}</svg>`;
    Kartu.leg(KAT.map(k => [k.w, k.n]));
    const lama = A.length < this.D.n_stasiun ? ` ${fmt(this.D.n_stasiun - A.length)} stasiun lain tidak melapor dalam ${fmt(this.D.segar_jam)} jam terakhir dan tidak ditampilkan.` : "";
    return Kartu.ex(`${Kartu.hl(dec1(top.v) + " µg/m³")} PM2,5 tertinggi terukur di stasiun BMKG ${esc(top.nama)}, ${Kartu.hl(fmt(baik) + " dari " + fmt(A.length))} stasiun berkategori Baik`, "", "",
      `<div style="margin:0 0 6px">${PIL_UKUR}</div>${svg}<p class="fnd">Nilai terbaru per stasiun (per jam), diurutkan dari tertinggi.${lama} Warna memakai ambang kategori 24 jam sebagai acuan. Ini hasil alat ukur dan tidak dicampur dengan angka model CAMS di kartu lain. Data ${esc(jamWIB(this.D.terbit))}.</p>`,
      `${SUMBER_BMKG}, terbit ${jamWIB(this.D.terbit)}`).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${Insight.eyIk("stasiun", "Stasiun BMKG")}</span>`); },
};
