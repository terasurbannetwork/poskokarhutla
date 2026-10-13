/* cerita_karhutla.js — cerita data di bagian bawah tab Insight. Kartu berurutan: penempatan regu · cerita data (pembuka) ·
   25 tahun · musim 2026 (awal musim, kompleks pertama, video sebaran + garis waktu + putar ulang peristiwa) · pendorong ·
   model sebaran (coming soon) · uji model (tersembunyi bila sebaran_kasus.json tidak ada).
   Semua angka dibaca dari berkas data (tren_karhutla, musim_awal, sebaran_cerita, sebaran_kasus, model_sebaran);
   judul dirangkai dari angka itu, bukan ketikan tangan. Butuh maplibregl (sudah dimuat index.html). */
(function () {
"use strict";
const $q = (s, el = document) => el.querySelector(s);
const nf = (v, d = 0) => v == null || !isFinite(v) ? "–" : Number(v).toLocaleString("id-ID", {maximumFractionDigits: d, minimumFractionDigits: 0});
const pc = (v, d = 0) => v == null ? "–" : nf(v * 100, d) + "%";
const es = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const ambil = u => fetch(u).then(r => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
const PROV = {"14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "53": "Nusa Tenggara Timur", "93": "Papua Selatan"};
const nmP = k => PROV[k] || (typeof namaProv === "function" ? namaProv(k) : k);
const WP = {"62": "#c9503a", "16": "#e58a45", "61": "#5f6fb0", "14": "#1d4e89", "15": "#4f8fc4", "63": "#2b8c86", "64": "#9a7448", "53": "#a8566e", "93": "#5b6f86"};
const HARI = ["#fde7a7", "#f6c56a", "#ef9a4a", "#e0663a", "#c63b2f", "#8f1d2c"];
const gaya = () => (typeof DASAR === "function" ? DASAR() : (matchMedia("(prefers-color-scheme: dark)").matches ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron"));
const D_SEL = 0.003375, X0 = 94, Y0 = -12, NX = 14300;
const kotakSel = k => { const i = k % NX, j = Math.floor(k / NX), x = X0 + i * D_SEL, y = Y0 + j * D_SEL; return [[x, y], [x + D_SEL, y], [x + D_SEL, y + D_SEL], [x, y + D_SEL], [x, y]]; };
const pusatSel = k => [X0 + (k % NX + .5) * D_SEL, Y0 + (Math.floor(k / NX) + .5) * D_SEL];
const fc = fs => ({type: "FeatureCollection", features: fs});
const poli = (k, p) => ({type: "Feature", geometry: {type: "Polygon", coordinates: [kotakSel(k)]}, properties: p});
const tgD = s => new Date(s.length <= 10 ? s + "T12:00:00" : s);   /* "2026-08-22" tanpa geseran zona waktu */
const tglID = s => tgD(s).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"});
const tglP = s => tgD(s).toLocaleDateString("id-ID", {day: "numeric", month: "short"});
const hariKe = d => new Date(Date.UTC(2026, 0, 1) + d * 864e5).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"});
const doy = s => Math.floor((Date.parse(s.slice(0, 10)) - Date.UTC(2026, 0, 1)) / 864e5);   /* hari ke-n sejak 1 Jan 2026 */
const TL0 = 151;   /* 1 Jun */
const panah = (lon, lat, deg, km) => { const r = deg * Math.PI / 180, dx = Math.sin(r) * km / (111.32 * Math.cos(lat * Math.PI / 180)), dy = Math.cos(r) * km / 110.57;
  const x2 = lon + dx, y2 = lat + dy, a1 = r + 2.6, a2 = r - 2.6, h = km * .3;
  return [[lon, lat], [x2, y2], [x2 + Math.sin(a1) * h / (111.32 * Math.cos(lat * Math.PI / 180)), y2 + Math.cos(a1) * h / 110.57], [x2, y2], [x2 + Math.sin(a2) * h / (111.32 * Math.cos(lat * Math.PI / 180)), y2 + Math.cos(a2) * h / 110.57]]; };

/* ---------------- grafik SVG gaya Insight ---------------- */
const NAVY = "oklch(25.5% .075 256)";
const hl = t => `<span class="hl">${t}</span>`;
const rbk = v => v >= 1e6 ? nf(Math.round(v / 1e5) / 10, 1) + " jt" : v >= 1e4 ? nf(Math.round(v / 1e3)) + " rb" : v >= 1e3 ? nf(Math.round(v / 100) / 10, 1) + " rb" : nf(Math.round(v));
/* label pil SVG (salinan Insight.pil: lebar ditaksir dari jumlah huruf) */
const pil = (x, y, t, bg, fg, fs = 12, h = 20) => { const w = String(t).length * fs * .58 + h * .8;
  return [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}"/><text x="${x + w / 2}" y="${y + h / 2 + fs * .36}" text-anchor="middle" font-size="${fs}" font-weight="700" style="fill:${fg}">${es(t)}</text>`, w]; };
function batang(data, o = {}) { /* data [{l, v, w (warna), tip, ci:[lo,hi]}]; o.rata = garis rata-rata */
  const W = 940, H = o.h || 300, m = {l: 46, r: 8, t: 36, b: 28}, n = data.length, maks = o.maks || Math.max(...data.map(d => d.ci ? d.ci[1] : d.v), 1) * 1.05;
  const bw = (W - m.l - m.r) / n, y = v => H - m.b - (H - m.t - m.b) * v / maks, fy = o.fy || rbk;
  let g = [0, .25, .5, .75, 1].map(f => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(f * maks)}" y2="${y(f * maks)}" stroke="currentColor" opacity=".08"/><text x="${m.l - 6}" y="${y(f * maks) + 4}" font-size="11" text-anchor="end" opacity=".6">${fy(f * maks)}</text>`).join("");
  data.forEach((d, i) => { const x = m.l + i * bw + bw * .15, w = bw * .7, top = y(d.ci ? d.ci[1] : d.v);
    g += `<rect x="${x}" y="${y(d.v)}" width="${w}" height="${Math.max(2, H - m.b - y(d.v))}" rx="4" fill="${d.w || "#1d4e89"}" data-tip="${es(d.tip || `<b>${d.l}</b><br>Nilai: ${nf(d.v)}`)}"/>`;
    if (d.ci) g += `<line x1="${x + w / 2}" x2="${x + w / 2}" y1="${y(d.ci[0])}" y2="${top}" stroke="currentColor" stroke-width="1.6" opacity=".7"/><line x1="${x + w * .3}" x2="${x + w * .7}" y1="${top}" y2="${top}" stroke="currentColor" stroke-width="1.6" opacity=".7"/>`;
    g += `<text x="${x + w / 2}" y="${top - 6}" text-anchor="middle" font-size="${n > 16 ? 10 : 12}" font-weight="800" opacity=".85" pointer-events="none">${es(d.t ?? rbk(d.v)).replace(" ", " ")}</text>
      <text x="${x + w / 2}" y="${H - m.b + 16}" font-size="${n > 16 ? 11 : 12.5}" text-anchor="middle" opacity=".75">${es(d.l)}</text>`; });
  if (o.rata != null) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(o.rata)}" y2="${y(o.rata)}" stroke="${NAVY}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".55"/>${pil(m.l + 2, y(o.rata) - 24, o.rataT || "rata-rata " + rbk(o.rata), NAVY, "#fff", 11)[0]}`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${es(o.label || "grafik batang")}">${g}</svg>`;
}
function hbatang(data, o = {}) { /* horizontal; data [{l, v, w, t, tip}]; o.garis = acuan (garis putus + pil) */
  const W = 940, ket = data.some(d => d.ket), rh = ket ? 46 : 34, L = o.ml || 260, T = o.garis != null ? 30 : 0, H = T + data.length * rh + 6, g0 = o.garis ?? 0, maks = o.maks || Math.max(...data.map(d => d.v), g0, 1e-9), X = v => L + (W - L - 150) * v / maks;
  let g = o.garis != null ? `<line x1="${X(g0)}" x2="${X(g0)}" y1="${T - 6}" y2="${H}" stroke="${NAVY}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".55"/>${pil(X(g0) - 30, 0, o.garisT || "acuan", NAVY, "#fff", 11)[0]}` : "";
  data.forEach((d, i) => { const y = T + i * rh, a = X(Math.min(d.v, g0)), b = X(Math.max(d.v, g0)), w = d.w || "#1d4e89";
    g += `<text x="${L - 10}" y="${d.ket ? y + rh / 2 - 2 : y + 21}" text-anchor="end" font-size="13" font-weight="600">${es(d.l)}</text>${d.ket ? `<text x="${L - 10}" y="${y + rh / 2 + 13}" text-anchor="end" font-size="11" opacity=".6">${es(d.ket)}</text>` : ""}
      <rect x="${a}" y="${y + (d.ket ? 12 : 7)}" width="${Math.max(2, b - a)}" height="${rh - (d.ket ? 24 : 14)}" rx="4" fill="${w}" data-tip="${es(d.tip || `<b>${d.l}</b><br>Nilai: ${d.t ?? nf(d.v, 2)}`)}"/>
      ${pil(b + 8, y + (rh - 20) / 2, d.t ?? nf(d.v, 2), w, "#fff", 12.5)[0]}`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${es(o.label || "grafik")}">${g}</svg>`;
}
function garisK(series, o = {}) { /* series [{xy:[[x,y]], w}] */
  const W = o.w || 300, H = o.h || 150, m = {l: 38, r: 8, t: 8, b: 26};
  const xs = series.flatMap(s => s.xy.map(p => p[0])), ys = series.flatMap(s => s.xy.map(p => p[1]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = o.y0 ?? Math.min(...ys), y1 = Math.max(...ys);
  const X = v => m.l + (W - m.l - m.r) * (v - x0) / ((x1 - x0) || 1), Y = v => H - m.b - (H - m.t - m.b) * (v - y0) / ((y1 - y0) || 1);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${es(o.label || "kurva")}">
    ${[y0, (y0 + y1) / 2, y1].map(v => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".08"/>`).join("")}
    <text x="${m.l - 4}" y="${Y(y1) + 4}" font-size="9.5" text-anchor="end" opacity=".7">${o.fy ? o.fy(y1) : nf(y1, 2)}</text><text x="${m.l - 4}" y="${Y(y0) + 4}" font-size="9.5" text-anchor="end" opacity=".7">${o.fy ? o.fy(y0) : nf(y0, 2)}</text>
    <text x="${m.l}" y="${H - 8}" font-size="9.5" opacity=".7">${nf(x0, 1)}</text><text x="${W - m.r}" y="${H - 8}" font-size="9.5" text-anchor="end" opacity=".7">${nf(x1, 1)}</text>
    <text x="${(W + m.l) / 2}" y="${H - 8}" font-size="10" text-anchor="middle">${es(o.xl || "")}</text>
    ${series.map(s => `<polyline fill="none" stroke="${s.w || "#c9503a"}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${s.xy.map(p => X(p[0]) + "," + Y(p[1])).join(" ")}"/>`).join("")}
  </svg>`;
}
const chip = (k, v) => `<span class="ct-chip">${v == null ? "" : `<b>${v}</b>`}${k}</span>`;

/* ---------------- peta ---------------- */
function peta(el, pusat, zoom) {
  if (typeof maplibregl === "undefined") { el.innerHTML = `<p class="ct-cat">Peta butuh MapLibre.</p>`; return null; }
  const m = new maplibregl.Map({container: el, style: gaya(), center: pusat, zoom, attributionControl: {compact: true}, dragRotate: false, cooperativeGestures: true});
  m.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
  m.siap = new Promise(r => m.once("load", r));
  m.siap.then(() => el.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show"));  /* atribusi diringkas */
  return m;
}
function setSumber(m, id, data, lapis) {
  if (m.getSource(id)) return m.getSource(id).setData(data);
  m.addSource(id, {type: "geojson", data});
  for (const l of lapis) m.addLayer({...l, source: id});
}

/* ================================================================ */
const Cerita = {
  D: {}, peta: {}, st: {mode: "nas", replay: 0, kasus: 0, hariRe: 1, hariMusim: 284},
  async muat() {
    const D = this.D;
    if (D.siap) return;
    const opsional = u => ambil(u).catch(() => null);
    [D.tren, D.musim, D.c, D.kasus, D.model] = await Promise.all([ambil("data/tren_karhutla.json"), ambil("data/musim_awal.json"), ambil("data/sebaran_cerita.json"),
      opsional("data/sebaran_kasus.json"), opsional("data/model_sebaran.json")]);
    D.siap = true;
  },
  bab(ey, id, judul, isi, {leg, sumber} = {}) {
    /* format kartu Insight: pita bab + judul satu kalimat, badan, kaki berisi legenda (tengah) dan sumber (miring) */
    const lg = (leg || []).map(([w, n]) => `<span>${w ? `<i style="${/[:;]/.test(w) ? w : "background:" + w}"></i>` : ""}${n}</span>`).join("");
    return `<section class="ct-bab ex" id="ct-${id}"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div><footer class="ex-ft">${lg ? `<span class="ex-leg">${lg}</span>` : "<span></span>"}${sumber ? `<em>Sumber: ${sumber}</em>` : ""}</footer></section>`;
  },
  async buka(el) {
    el.innerHTML = `<div class="ct-muat">Menyiapkan cerita…</div>`;
    try { await this.muat(); } catch (e) { el.innerHTML = `<div class="ct-muat">Data cerita belum tersedia (${es(e.message)}).</div>`; return; }
    this.el = el;
    el.innerHTML = `<article class="cerita">${this.regu()}${this.hero()}${this.bab1()}${this.musim()}${this.bab4()}${this.model()}${this.bab6()}</article>`;
    el.onclick = e => this.klik(e);
    el.oninput = e => this.ubah(e);
    el.onchange = e => this.ubah(e);
    this.infoMusim(this.nSel(this.st.hariMusim));
    /* peta dibuat saat bab terlihat */
    const io = new IntersectionObserver(es_ => es_.forEach(x => { if (x.isIntersecting) { io.unobserve(x.target); this.petaBab(x.target.dataset.peta); } }), {rootMargin: "200px"});
    el.querySelectorAll("[data-peta]").forEach(x => io.observe(x));
  },

  /* ---------- hero ---------- */
  hero() {
    const T = this.D.tren, M = this.D.musim, i26 = T.tahun.indexOf(2026), n26 = T.nasional[i26];
    const lebih = T.tahun.filter((y, i) => y < 2026 && T.nasional[i] > n26);
    const awal = M.urutan.map(p => M.prov[p]).filter(o => o.selisih_hari != null);
    const lebihAwal = awal.filter(o => o.selisih_hari < 0).length;
    /* pembuka bergaya kartu Insight: angka-angka utama masuk ke judul, tanpa kotak angka */
    const hl = t => `<span class="hl">${t}</span>`;
    return `<section class="ct-bab ex ct-buka"><header class="ex-hd"><span class="ex-ey">Cerita data</span><div class="ex-jd"><h3>Dari mana mulai, ke mana menyebar: ${hl(nf(n26) + " titik")} MODIS di 2026${lebih.length ? `, hanya ${lebih.length} tahun sejak 2002 yang lebih banyak` : ", terbanyak sejak 2002"}; ${hl(lebihAwal + " dari " + awal.length)} provinsi memulai musim lebih awal, dan ${hl(pc(T.ulang_2026.sel_pernah))} titik jatuh di tempat yang pernah terbakar</h3></div></header>
      <footer class="ex-ft"><span></span><em>Sumber: NASA FIRMS 2002–2026, ERA5, 12 musim VIIRS</em></footer></section>`;
  },

  /* ---------- bab 1: 20 tahun ---------- */
  bab1() {
    const T = this.D.tren, en = new Set(T.el_nino), AVG = "#a9402f", BIASA = "#e58a45", INI = "#c9503a";
    const lalu = T.tahun.map((y, i) => [y, T.nasional[i]]).filter(([y]) => y < 2026), rata = lalu.reduce((a, [, v]) => a + v, 0) / lalu.length;
    const data = T.tahun.map((y, i) => ({l: String(y).slice(2), v: T.nasional[i], w: y === 2026 ? INI : en.has(y) ? AVG : BIASA,
      tip: `<b>${y}</b>${en.has(y) ? " · tahun El Niño" : ""}${y === 2026 ? " · belum selesai" : ""}<br>Titik MODIS: ${nf(T.nasional[i])}`}));
    const pr = Object.entries(T.prov).filter(([k, o]) => o.prioritas);
    const rasio = pr.map(([k, o]) => o.rasio_el_nino).filter(Boolean).sort((a, b) => a - b), rmed = rasio[Math.floor(rasio.length / 2)];
    const top = [...pr].sort((a, b) => (b[1].rasio_el_nino || 0) - (a[1].rasio_el_nino || 0))[0];
    const sg = (v, p) => v == null ? "–" : `${v > 0 ? "+" : ""}${nf(v, 1)}${p != null && p < .05 ? "*" : ""}`;
    const tabel = `<div class="ct-tw"><table><thead><tr><th>Provinsi</th><th>Tren titik/th</th><th>El Niño ÷ biasa</th><th>Awal musim (hari/dekade)</th><th>Akhir musim (hari/dekade)</th></tr></thead><tbody>
      ${pr.map(([k, o]) => `<tr><td>${es(o.nama)}</td><td>${o.tren_persen_per_tahun == null ? "–" : nf(o.tren_persen_per_tahun, 1) + "%"}${o.mk_p < .05 ? "*" : ""}</td><td>${o.rasio_el_nino == null ? "–" : nf(o.rasio_el_nino, 1) + "×"}</td>
        <td>${sg(o.geser_awal_hari_per_dekade, o.geser_awal_p)}</td><td>${sg(o.geser_akhir_hari_per_dekade, o.geser_akhir_p)}</td></tr>`).join("")}</tbody></table></div><div class="ct-kecil">* signifikan (p &lt; 0,05)</div>`;
    const g = T.gambut_porsi_viirs, gEN = ["2015", "2019", "2023"].map(y => g[y]).filter(Boolean), gBi = ["2016", "2017", "2020", "2021", "2022", "2024", "2025"].map(y => g[y]).filter(Boolean);
    const rt = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
    const besar = T.tahun_terbesar.map(y => { const p = Object.entries(T.porsi_prov[y] || {}).sort((a, b) => b[1] - a[1]).slice(0, 2); return chip(p.map(([k, v]) => `${es(nmP(k))} ${pc(v)}`).join(" · "), y); }).join("");
    return this.bab("25 tahun", "tren", `Tahun El Niño membakar ${hl(nf(rmed, 1) + " kali lipat")} tahun biasa, dan 2026 sudah masuk golongan itu`,
      `${batang(data, {label: "titik MODIS per tahun", rata})}
      <div class="ct-dua"><div><div class="ct-sub">Titik VIIRS di lahan gambut</div><div class="ct-chips">${chip("tahun El Niño", pc(rt(gEN)))}${chip("tahun biasa", pc(rt(gBi)))}${chip("2026", pc(g["2026"]))}${chip("rasio El Niño terbesar: " + es(top[1].nama), nf(top[1].rasio_el_nino, 1) + "×")}</div>
        <div class="ct-sub">Penyumbang terbesar tahun-tahun besar</div><div class="ct-chips">${besar}</div></div>
      <div><div class="ct-sub">Terbakar hampir tiap tahun</div><ol class="ct-rank">${T.keberulangan.slice(0, 8).map((h, i) => `<li><i>${i + 1}</i><span>${es(h.kab)} <small>${es(nmP(h.prov))}</small></span><b data-tip="${es(`<b>${h.kab}</b> · ${nmP(h.prov)}<br>Tahun terbakar: ${h.tahun_terbakar} dari 24<br>Rata-rata: ${nf(h.rata_titik)} titik/th`)}">${h.tahun_terbakar}/24 th</b></li>`).join("")}</ol></div></div>
      ${tabel}`,
      {leg: [[AVG, "tahun El Niño"], [BIASA, "tahun biasa"], [INI, "2026 (belum selesai)"]], sumber: "NASA FIRMS MODIS 2002–2026, VIIRS 2015–2026"});
  },

  /* ---------- musim 2026: awal musim, kompleks pertama, video sebaran, putar ulang peristiwa ---------- */
  musim() {
    const M = this.D.musim, R = this.D.c.replay, ur = M.urutan.map(k => ({...M.prov[k], k})), dasar = (M.dasar || [2015, 2025]).join("–");
    const med = o => o.selisih_hari != null && o.awal_2026_iso ? doy(o.awal_2026_iso) - o.selisih_hari : null;
    /* --- dumbbell: awal musim 2026 vs median; label di kolom kanan --- */
    const W = 940, rh = 32, x0 = 190, x1 = 640, xc = 668, H = ur.length * rh + 30;
    const ds = ur.flatMap(o => [o.awal_2026_iso ? doy(o.awal_2026_iso) : null, med(o)]).filter(v => v != null), d0 = Math.min(Math.min(...ds) - 6, 150), d1 = Math.max(...ds) + 6, X = d => x0 + (x1 - x0) * (d - d0) / (d1 - d0);
    let g = [151, 181, 212, 243, 273].filter(d => d >= d0 && d <= d1).map(d => `<line x1="${X(d)}" x2="${X(d)}" y1="0" y2="${H - 26}" stroke="currentColor" opacity=".08"/><text x="${X(d)}" y="${H - 8}" font-size="11" text-anchor="middle" opacity=".6">${hariKe(d)}</text>`).join("");
    ur.forEach((o, i) => { const a = o.awal_2026_iso ? doy(o.awal_2026_iso) : null, m = med(o), y = i * rh + rh / 2 + 2, awal = o.selisih_hari != null && o.selisih_hari < 0, w = o.selisih_hari == null ? "#8a94a6" : awal ? "#c9503a" : "#2b8c86";
      g += `<text x="${x0 - 14}" y="${y + 4}" font-size="13" font-weight="600" text-anchor="end">${es(o.nama)}</text>`;
      if (a == null) { g += pil(xc, y - 9, "belum mulai", "#8a94a6", "#fff", 11, 18)[0]; return; }
      if (m != null) g += `<line x1="${X(m)}" x2="${X(a)}" y1="${y}" y2="${y}" stroke="${w}" stroke-width="3" stroke-linecap="round" opacity=".45"/><circle cx="${X(m)}" cy="${y}" r="5.5" fill="var(--card,#fff)" stroke="currentColor" stroke-width="2" opacity=".7" data-tip="${es(`<b>${o.nama}</b> · median ${dasar}<br>Awal musim: ${hariKe(m)}`)}"/>`;
      g += `<circle cx="${X(a)}" cy="${y}" r="7" fill="${WP[o.k] || "#c9503a"}" data-tip="${es(`<b>${o.nama}</b> · musim 2026<br>Awal musim: ${tglP(o.awal_2026_iso)}${o.selisih_hari != null ? `<br>${Math.abs(o.selisih_hari)} hari ${awal ? "lebih awal" : "lebih lambat"} dari median` : ""}`)}"/>`;
      const [p1, w1] = pil(xc, y - 9, tglP(o.awal_2026_iso), NAVY, "#fff", 11, 18); g += p1;
      if (o.selisih_hari != null) g += pil(xc + w1 + 6, y - 9, `${Math.abs(o.selisih_hari)} hari ${awal ? "lebih awal" : "lebih lambat"}`, w, "#fff", 11, 18)[0]; });
    /* --- kompleks besar pertama + daftar kejadian untuk garis waktu --- */
    const kompleks = ur.flatMap(o => (o.pertama || []).slice(0, 1).map(e => ({...e, prov: o.nama, pk: o.k}))).sort((a, b) => a.t0 < b.t0 ? -1 : 1);
    this.nProv = ur.length;
    this.ev = [...ur.filter(o => o.awal_2026_iso).map(o => ({d: doy(o.awal_2026_iso), jenis: "awal", prov: o.nama, pk: o.k, iso: o.awal_2026_iso, selisih: o.selisih_hari})),
      ...kompleks.map(e => ({d: doy(e.t0), jenis: "besar", prov: e.prov, kab: e.kab, ha: e.ha, t0: e.t0}))].sort((a, b) => a.d - b.d);
    this.DMAX = Math.max(...this.D.c.musim26.map(s => s[2])); this.st.hariMusim = this.DMAX;
    const tabel = `<div class="ct-tw kiri"><table><thead><tr><th>Tanggal</th><th>Provinsi</th><th>Kabupaten</th><th class="r">Luas (ha)</th></tr></thead><tbody>${kompleks.map(e => `<tr><td>${tglID(e.t0)}</td><td>${es(e.prov)}</td><td>${es(e.kab || "–")}</td><td class="r">${nf(e.ha)}</td></tr>`).join("")}</tbody></table></div>`;
    /* --- garis waktu --- */
    const f = d => this.px((d - TL0) / (this.DMAX - TL0));
    const api = `<svg viewBox="0 0 12 16" width="11" height="15" aria-hidden="true"><path d="M6 0C6 4 11 6 11 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-10z" fill="#e0663a" stroke="#fff" stroke-width=".8"/></svg>`;
    const tl = `<div class="ct-tl" id="ct-tl"><div class="ct-tl-tr" data-aksi="tl" aria-label="Garis waktu musim 2026">
      ${[151, 181, 212, 243, 273].filter(d => d <= this.DMAX).map(d => `<i class="ct-tl-t" style="left:${f(d)}"></i><span class="ct-tl-b" style="left:${f(d)}">${hariKe(d)}</span>`).join("")}
      <i class="ct-tl-kepala" id="ct-kepala" style="left:${f(this.st.hariMusim)}"></i>
      ${this.ev.map(x => x.jenis === "awal"
        ? `<button class="ct-mk awal" style="left:${f(x.d)};background:${WP[x.pk] || "#c9503a"}" data-aksi="ke-hari" data-hari="${x.d}" aria-label="Awal musim ${es(x.prov)}" data-tip="${es(`<b>${x.prov}</b> · awal musim 2026<br>${tglP(x.iso)}${x.selisih != null ? ` · ${Math.abs(x.selisih)} hari ${x.selisih < 0 ? "lebih awal" : "lebih lambat"} dari median` : ""}`)}"></button>`
        : `<button class="ct-mk besar" style="left:${f(x.d)}" data-aksi="ke-hari" data-hari="${x.d}" aria-label="Kompleks besar pertama ${es(x.prov)}" data-tip="${es(`<b>Kompleks besar pertama</b> · ${x.prov}<br>${x.kab || ""} · ${tglP(x.t0)}<br>Luas: ${nf(x.ha)} ha`)}">${api}</button>`).join("")}
      </div></div><div class="ct-cap" id="ct-cap"></div>`;
    this.urutRe = R.map((r, i) => i).sort((a, b) => R[b].ha - R[a].ha);
    const pilih = `<select data-ubah="peristiwa" aria-label="Lihat peristiwa terbesar"><option value="-1">Lihat peristiwa terbesar</option>${this.urutRe.map(i => `<option value="${i}">${es(R[i].kab || nmP(R[i].prov))} · ${tglID(R[i].t0)} · ${nf(R[i].ha)} ha</option>`).join("")}</select>`;
    return this.bab("Musim 2026", "musim", `Video sebaran api wilayah Indonesia di ${hl("2026")}`,
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Awal musim 2026 dibanding median">${g}</svg>
      <div class="ct-sub">Kompleks besar pertama tiap provinsi</div>${tabel}
      <div class="ct-sub">Sebaran titik api harian sejak ${hariKe(TL0)}</div>
      <div class="ct-kontrol">${pilih}
        <span class="ct-grp" id="ct-nas"><button class="ct-btn" id="ct-btnM" data-aksi="putar-musim">▶ Putar musim</button><input type="range" min="${TL0}" max="${this.DMAX}" value="${this.DMAX}" data-ubah="hariMusim" aria-label="Tanggal"></span>
        <span class="ct-grp" id="ct-re" hidden><button class="ct-btn lawan" data-aksi="kembali">← Kembali ke Indonesia</button><button class="ct-btn" id="ct-btnR" data-aksi="putar-sebar">▶ Putar</button><input type="range" min="1" max="1" value="1" data-ubah="hariRe" aria-label="Hari ke"><output id="ct-hariRe"></output></span></div>
      <div class="ct-pw"><div class="ct-peta" data-peta="musim"></div><div class="ct-ovl" id="ct-ovl"></div></div>
      <div id="ct-nasBawah">${tl}</div>
      <div id="ct-reBawah" hidden><div class="ct-cap" id="ct-reJudul"></div><div id="ct-sebarInfo" class="ct-chips satu"></div></div>`,
      {leg: [["background:#c9503a;border-radius:50%", "titik terisi: awal musim 2026"], [`background:none;border:2px solid currentColor;border-radius:50%`, `titik kosong: median ${dasar}`], ["background:#e0663a;clip-path:polygon(50% 0,90% 45%,100% 70%,80% 100%,20% 100%,0 70%,15% 40%)", "kompleks besar pertama"], ["#fde7a7", "sel awal musim"], ["#5c0f1f", "sel baru menyala"]], sumber: "NASA FIRMS VIIRS 2015–2026"});
  },
  infoSebar() {
    const r = this.D.c.replay[this.st.replay], n = Math.min(this.st.hariRe, r.hari.length), h = r.hari.slice(0, n);
    const ha = h.reduce((a, x) => a + x.sel.length, 0) * 14.06, arah = h.filter(x => x.arah != null);
    const mata = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"], ke = d => mata[Math.round(d / 45) % 8];
    const out = $q("#ct-sebarInfo", this.el); if (!out) return;
    const o = $q("#ct-hariRe", this.el); if (o) o.textContent = `hari ${n} dari ${r.hari.length} · ${tglP(h[n - 1].tgl)}`;
    const ov = $q("#ct-ovl", this.el); if (ov) ov.textContent = `Hari ${n} · ${tglID(h[n - 1].tgl)} · ${nf(ha)} ha`;
    out.innerHTML = chip(`${es(r.kab || "")}, ${es(nmP(r.prov))}`, tglID(r.t0)) + chip(`luas sampai hari ke-${n}`, nf(ha) + " ha") + chip("sel awal", r.hari[0].sel.length) + chip("arah pergeseran harian", arah.slice(-4).map(x => ke(x.arah)).join(", ") || "–");
  },

  /* ---------- bab 4: pendorong ---------- */
  bab4() {
    const P = this.D.c.angka.pendorong;
    if (!P) return "";
    const K = P.kelas, r = (f, i) => K[f]?.tabel?.[i];
    const pick = [["gambut", 1, "Di gambut (vs mineral)", "terbakar di lahan gambut, dibanding tanah mineral"], ["malam", 1, "Pertama terlihat malam", "api pertama terdeteksi pada lintasan malam"],
      ["n0", 3, "≥ 5 sel di lintasan pertama (vs 1)", "sudah luas saat pertama terlihat satelit, dibanding 1 sel"], ["frp0", 4, "FRP awal ≥ 50 MW (vs < 5)", "panas api awal sangat tinggi, dibanding api lemah"],
      ["dc", K.dc?.tabel?.length - 1, "DC tertinggi (vs < 100)", "tanah dan gambut sangat kering (indeks kekeringan DC)"], ["hujan24", 2, "Hujan 5–20 mm 24 jam ke depan (vs 0)", "turun hujan dalam 24 jam berikutnya, dibanding tanpa hujan"],
      ["rh_min", 3, "RH minimum ≥ 60% (vs < 40%)", "udara lembap, dibanding udara kering"], ["ws", 2, "Angin 15–20 km/jam (vs < 10)", "angin sedang-kencang, dibanding angin pelan"],
      ["jalan_km", 3, "≥ 10 km dari jalan (vs < 1)", "lokasi jauh dari jalan, dibanding dekat jalan"], ["desa_km", 3, "≥ 6 km dari desa (vs < 1)", "lokasi jauh dari desa, dibanding dekat desa"],
      ["kanal_km", 3, "Kanal ≥ 3 km per sel (vs tanpa)", "banyak kanal/parit di sekitar, dibanding tanpa kanal"], ["bekas", 1, "Bekas terbakar 1–3 th (vs belum)", "lahan terbakar 1–3 tahun sebelumnya, dibanding belum"],
      ["lereng", 3, "Lereng ≥ 8% (vs < 1%)", "lereng curam, dibanding lahan datar"], ["oni", 3, "El Niño ≥ 1 (vs La Niña)", "tahun El Niño kuat, dibanding tahun La Niña"]].filter(([f, i]) => r(f, i)?.rasio != null);
    const data = pick.map(([f, i, l, ket]) => ({l, ket, v: r(f, i).rasio, w: r(f, i).rasio >= 1 ? "#c9503a" : "#2b8c86", t: nf(r(f, i).rasio, 1) + "×",
      tip: `<b>${l}</b><br>Lolos: ${pc(r(f, i).laju, 1)} (n = ${nf(r(f, i).n)})<br>Acuan: ${pc(K[f].tabel[0].laju, 1)}`})).sort((a, b) => b.v - a.v);
    const imp = P.gbdt.permutasi.slice(0, 10).map(x => ({l: x.nama, v: Math.max(0, x.turun_auc), t: nf(x.turun_auc, 3), w: "#1d4e89", tip: `<b>${x.nama}</b><br>Penurunan AUC: ${nf(x.turun_auc, 3)}`}));
    const pd = Object.entries(P.ketergantungan_parsial || {}).slice(0, 6).map(([f, xy]) => `<figure>${garisK([{xy}], {xl: P.gbdt.permutasi.find(x => x.fitur === f)?.nama || f, fy: v => pc(v, 1), w: 260, h: 140})}</figure>`).join("");
    const A = P.arah, angin = A.angin || [], kuat = angin.at(-1), lemah = angin[0];
    const rn0 = r("n0", 3)?.rasio ?? data[0]?.v, arahLemah = (A.semua?.bawah_angin_45 ?? 0) < .35;
    return this.bab("Pendorong", "dorong", `Api yang sejak awal sudah besar (≥ 5 sel di lintasan pertama) ${hl(nf(rn0, 0) + " kali")} lebih mungkin membesar; ${arahLemah ? `angin hanya menjelaskan sedikit arah pergeseran (${hl(pc(A.semua?.bawah_angin_45))} searah, acak 25%)` : `api cenderung bergeser searah angin (${hl(pc(A.semua?.bawah_angin_45))} searah)`}`,
      `<div class="ct-sub">Peluang titik baru lolos, dibanding kelas acuan (${nf(P.n_lolos)} dari ${nf(P.n_peristiwa)} titik, ${pc(P.laju_dasar, 1)})</div>
      ${hbatang(data, {label: "rasio peluang lolos", garis: 1, garisT: "acuan 1×", ml: 390})}
      <div class="ct-sub">Seberapa penting tiap variabel (penurunan AUC; AUC model ${nf(P.gbdt.auc_uji, 3)})</div>
      ${hbatang(imp, {ml: 300, label: "penurunan AUC"})}
      <div class="ct-sub">Arah dan jarak pergeseran</div><div class="ct-chips">${chip("searah angin ±45° (acak 25%), pergeseran ≥ 750 m", pc(A.semua.bawah_angin_45))}${A.bersih ? chip("pergeseran ≥ 2 km, angin ≥ 10 km/jam", pc(A.bersih.bawah_angin_45)) : ""}</div>
      ${angin.length ? `<div class="ct-sub">Persentase pergeseran searah angin (±45°) per kelas kecepatan angin, km/jam</div>` + batang(angin.map(a => ({l: a.kelas, v: a.bawah_angin_45, w: "#e58a45", t: pc(a.bawah_angin_45), tip: `<b>Angin ${a.kelas} km/jam</b><br>Searah angin: ${pc(a.bawah_angin_45, 1)}<br>Pergeseran median: ${nf(a.median_m)} m<br>Sampel: ${nf(a.n)}`})), {h: 230, label: "searah angin per kelas angin", rata: .25, rataT: "acak 25%", fy: v => pc(v), maks: .4}) : ""}
      <div class="ct-sub">Kurva ketergantungan parsial (peluang lolos)</div><div class="ct-pd">${pd}</div>`,
      {leg: [["#c9503a", "merah: menaikkan peluang membesar"], ["#2b8c86", "teal: menurunkan"], [null, "× = berapa kali lebih mungkin dibanding kelompok pembanding"], ["#1d4e89", "kepentingan model"], ["#e58a45", "searah angin"]], sumber: "NASA FIRMS VIIRS 2015–2026, ERA5, SRTM"});
  },

  /* ---------- model sebaran: belum dibuka ---------- */
  model() {
    return this.bab("Model sebaran", "model", "Simulasi sebaran dari titik api pilihan Anda",
      `<div class="ct-soon"><span class="ct-badge">Coming soon</span><p>Pilih satu titik di peta, lalu model memperkirakan ke arah mana api menyebar dan berapa hektare yang terbakar dalam 72 jam.</p></div>`,
      {sumber: "model sebaran data 2015–2026"});
  },

  /* ---------- bab 6: uji pada kejadian lalu (disembunyikan bila berkas ujinya belum ada) ---------- */
  bab6() {
    const K = this.D.kasus;
    if (!K) return "";
    const R = K.ringkasan;
    const ci = x => x ? `${nf(x[0], 2)} (${nf(x[1], 2)}–${nf(x[2], 2)})` : "–";
    return this.bab("Uji model", "uji", `Diuji pada ${hl(R.n + " kejadian")} lalu: model menebak benar ${hl(pc(R.lepas_akurasi?.[0]))} titik yang akan lolos atau padam, tetapi bentuk perimeternya masih kasar`,
      `<div class="ct-kontrol"><select data-ubah="kasus" aria-label="Kasus">${K.kasus.map((x, i) => `<option value="${i}" ${i === this.st.kasus ? "selected" : ""}>${x.th} · ${es(x.nama_prov)} · ${x.kelas} · ${nf(x.ha_akhir)} ha</option>`).join("")}</select></div>
      <div class="ct-dua rapat"><div><div class="ct-sub">Teramati (VIIRS)</div><div class="ct-peta" data-peta="uji-obs"></div></div><div><div class="ct-sub">Ramalan model (peluang 72 jam)</div><div class="ct-peta" data-peta="uji-pred"></div></div></div>
      <div id="ct-ujiInfo" class="ct-chips"></div>
      <div class="ct-chips">${chip("IoU 24 jam (95%)", ci(R.iou_24))}${chip("F1 sel baru 24 jam", ci(R.f1_24))}${chip("salah arah", nf(R.arah_err?.[0]) + "°")}${chip("luas 72 jam dalam P10–P90 (ideal 80%)", pc(R.cakupan_72))}</div>
      <div class="ct-tw tinggi"><table><thead><tr><th>Th</th><th>Provinsi</th><th>Kelas</th><th>Gambut</th><th>ha awal</th><th>Teramati 72 j</th><th>Ramalan 72 j (P10–P90)</th><th>IoU 24/72</th><th>Arah</th><th>P(lolos)</th><th>Benar?</th></tr></thead><tbody>
        ${K.kasus.map((x, i) => `<tr data-kasus="${i}" class="${i === this.st.kasus ? "on" : ""}"><td>${x.th}</td><td>${es(x.nama_prov)}</td><td>${x.kelas}</td><td>${x.gambut ? "ya" : "–"}</td><td>${nf(x.ha_awal)}</td><td>${nf(x.obs_ha[2])}</td>
          <td>${nf(x.pred_ha[2][1])} (${nf(x.pred_ha[2][0])}–${nf(x.pred_ha[2][2])})</td><td>${nf(x.iou[0], 2)} / ${nf(x.iou[2], 2)}</td><td>${x.arah_err == null ? "–" : nf(x.arah_err) + "°"}</td><td>${pc(x.p_lepas)}</td><td>${x.lepas_benar ? "✓" : "✗"}</td></tr>`).join("")}</tbody></table></div>`,
      {leg: [["#1d1d1d", "deteksi awal"], [HARI[1], "hari 1"], [HARI[5], "hari 3"]], sumber: "NASA FIRMS VIIRS, Open-Meteo, model sebaran data"});
  },
  gambarKasus() {
    const K = this.D.kasus; if (!K) return; const c = K.kasus[this.st.kasus], s = c.sel;
    const obs = [...s.awal.map(k => poli(k, {h: 0})), ...s.obs.flatMap((xs, d) => xs.map(k => poli(k, {h: d + 1})))];
    const pred = [...s.awal.map(k => poli(k, {p: 1})), ...Object.entries(s.frek).map(([k, f]) => poli(+k, {p: f[2] / 40}))];
    const isiO = {"fill-color": ["match", ["get", "h"], 0, "#1d1d1d", 1, HARI[1], 2, HARI[3], HARI[5]], "fill-opacity": .8};
    const isiP = {"fill-color": ["interpolate", ["linear"], ["get", "p"], .1, "#fde7a7", .4, "#ef9a4a", .7, "#c63b2f", 1, "#1d1d1d"], "fill-opacity": .75};
    for (const [id, data, paint] of [["uji-obs", obs, isiO], ["uji-pred", pred, isiP]]) { const m = this.peta[id]; if (!m) continue;
      m.siap.then(() => { setSumber(m, "k", fc(data), [{id: "k", type: "fill", paint}]); m.jumpTo({center: [c.lon0, c.lat0], zoom: c.kelas === "besar" ? 10.5 : 12}); }); }
    const info = $q("#ct-ujiInfo", this.el);
    if (info) info.innerHTML = chip(`${es(c.nama_prov)}, mulai ${tglID(c.t0)} (${c.gambut ? "gambut" : "mineral"})`, c.th) + chip(`angin ${nf(c.cuaca.ws, 1)} km/jam · RH min ${c.cuaca.rh_min}% · FFMC ${nf(c.cuaca.ffmc, 1)} · DC ${nf(c.cuaca.dc)} · ${c.cuaca.hari_kering} hari kering`)
      + chip("teramati 24/48/72 jam", c.obs_ha.map(v => nf(v)).join(" / ") + " ha") + chip("ramalan median", c.pred_ha.map(v => nf(v[1])).join(" / ") + " ha") + chip(`P(lolos) → ${c.lepas ? "memang lolos" : "tetap kecil"} ${c.lepas_benar ? "(benar)" : "(salah)"}`, pc(c.p_lepas));
  },

  /* ---------- penempatan regu (kartu pertama) ---------- */
  regu() {
    const kab = [...this.D.c.kab].sort((a, b) => b.n - a.n), top = kab.slice(0, 12), k0 = kab[0], k1 = kab[1];
    const W = 940, rh = 30, L = 300, H = top.length * rh + 4, maks = top[0].n, X = v => L + (W - L - 70) * v / maks;
    const g = top.map((k, i) => { const y = 2 + i * rh, b = X(k.n), w = WP[k.prov] || "#1d4e89";
      return `<text x="20" y="${y + 20}" text-anchor="end" font-size="12" font-weight="800" opacity=".5">${i + 1}</text>
        <text x="32" y="${y + 20}" font-size="13" font-weight="600">${es(k.kab)}</text>
        <rect x="${L}" y="${y + 6}" width="${Math.max(2, b - L)}" height="${rh - 12}" rx="4" fill="${w}" data-tip="${es(`<b>${k.kab}</b> · ${nmP(k.prov)}<br>Peristiwa ≥ 1.000 ha: ${nf(k.n)}`)}"/>
        ${pil(b + 6, y + (rh - 18) / 2, nf(k.n), w, "#fff", 11, 18)[0]}`; }).join("");
    const prov = [...new Set(top.map(k => k.prov))];
    return this.bab("Penempatan regu", "regu", `${es(k0.kab)} dan ${es(k1.kab)} paling sering mengalami kebakaran besar (≥ 1.000 ha) sejak 2015: ${hl(nf(k0.n))} dan ${hl(nf(k1.n))} peristiwa`,
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kabupaten dengan peristiwa kebakaran 1.000 ha atau lebih terbanyak">${g}</svg>`,
      {leg: prov.map(p => [WP[p] || "#1d4e89", es(nmP(p))]), sumber: "NASA FIRMS VIIRS 2015–2026"});
  },

  /* ---------- peta (satu peta: sebaran musim nasional + putar ulang peristiwa) ---------- */
  petaBab(id) {
    const box = this.el.querySelector(`[data-peta="${id}"]`); if (!box) return;
    if (id === "musim") { const m = this.peta.musim = peta(box, [113, -2], 3.6); if (!m) return; m.siap.then(() => { m.sedia = true; this.gambarPeta(true); }); }
    if (id === "uji-obs" || id === "uji-pred") { this.peta[id] = peta(box, [113, -2], 11); this.gambarKasus(); }
  },
  gambarPeta(pusat) { this.st.mode === "re" ? this.gambarSebar(pusat) : this.gambarMusim(); },
  vis(m, ids, v) { for (const id of ids) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", v); },
  nSel(d) { return this.D.c.musim26.filter(s => s[2] <= d && s[2] >= 150 && s[3] >= 3).length; },
  gambarMusim() {
    const m = this.peta.musim, d = this.st.hariMusim;
    if (!m?.sedia) return this.infoMusim(this.nSel(d));
    const C = this.D.c, g = C.grid;
    const fs = C.musim26.filter(s => s[2] <= d && s[2] >= 150 && s[3] >= 3).map(([ix, iy, h, n]) => ({type: "Feature", geometry: {type: "Point", coordinates: [g.x0 + (ix + .5) * g.sel, g.y1 - (iy + .5) * g.sel]}, properties: {h, n}}));
    setSumber(m, "musim", fc(fs), [{id: "musim", type: "circle", paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["interpolate", ["linear"], ["get", "n"], 3, .7, 300, 2.6], 8, 7],
      "circle-color": ["interpolate", ["linear"], ["get", "h"], 150, "#fde7a7", 200, "#ef9a4a", 240, "#c63b2f", 285, "#5c0f1f"], "circle-opacity": .8}}]);
    this.infoMusim(fs.length);
  },
  px: f => `calc(8px + (100% - 16px) * ${f})`,
  infoMusim(n) { /* penggeser, kepala putar di garis waktu, pil di peta, keterangan */
    const d = this.st.hariMusim, e = this.el;
    const sl = $q('[data-ubah="hariMusim"]', e); if (sl) sl.value = d;
    const k = $q("#ct-kepala", e); if (k) k.style.left = this.px((d - TL0) / (this.DMAX - TL0));
    const o = $q("#ct-ovl", e); if (o && this.st.mode === "nas") o.textContent = `${hariKe(d)} 2026 · ${nf(n)} sel terbakar`;
    const c = $q("#ct-cap", e); if (c) c.innerHTML = this.caption(d, n);
  },
  caption(d, n) {
    const ev = this.ev, N = this.nProv, tepat = ev.filter(x => x.d === d), awal = ev.filter(x => x.jenis === "awal" && x.d <= d);
    const tx = x => x.jenis === "awal" ? `Awal musim di ${es(x.prov)}` : `Kompleks besar pertama di ${es(x.kab)}, ${es(x.prov)} (${nf(x.ha)} ha)`;
    const t = tepat.length ? tepat.map(tx).join("; ") : awal.length ? `${awal.length} dari ${N} provinsi sudah memulai musim, terakhir ${es(awal.at(-1).prov)} (${hariKe(awal.at(-1).d)})` : "Belum ada provinsi yang memulai musim";
    return `<b>${hariKe(d)} 2026</b> · ${t} · ${nf(n)} sel terbakar sejak ${hariKe(TL0)}`;
  },
  gambarSebar(pusatkan) {
    const m = this.peta.musim, r = this.D.c.replay[this.st.replay], n = Math.min(this.st.hariRe, r.hari.length);
    if (m?.sedia) {
      const fs = r.hari.slice(0, n).flatMap((h, d) => h.sel.map(k => poli(k, {d: Math.min(5, Math.floor(d * 6 / Math.max(1, r.hari.length)))})));
      setSumber(m, "sebar", fc(fs), [{id: "sebar", type: "fill", paint: {"fill-color": ["match", ["get", "d"], 0, HARI[0], 1, HARI[1], 2, HARI[2], 3, HARI[3], 4, HARI[4], HARI[5]], "fill-opacity": .85}}]);
      let lama = []; const ar = [];
      for (const h of r.hari.slice(0, n)) { if (lama.length && h.arah != null) { const c0 = lama.reduce((a, k) => { const p = pusatSel(k); return [a[0] + p[0], a[1] + p[1]]; }, [0, 0]).map(v => v / lama.length);
          const km = Math.max(.4, (h.jauh || 500) / 1000); ar.push({type: "Feature", geometry: {type: "LineString", coordinates: panah(c0[0], c0[1], h.arah, km)}, properties: {}}); } lama = lama.concat(h.sel); }
      setSumber(m, "sebar-arah", fc(ar.slice(-6)), [{id: "sebar-arah-l", type: "line", paint: {"line-color": "#111", "line-width": 4.5}}, {id: "sebar-arah", type: "line", paint: {"line-color": "#fff", "line-width": 2}}]);
      setSumber(m, "sebar-awal", fc([{type: "Feature", geometry: {type: "Point", coordinates: [r.lon0, r.lat0]}, properties: {}}]), [{id: "sebar-awal", type: "circle", paint: {"circle-radius": 7, "circle-color": "#fff", "circle-stroke-color": "#1d1d1d", "circle-stroke-width": 3}}]);
      if (pusatkan) { this.vis(m, ["sebar", "sebar-arah-l", "sebar-arah", "sebar-awal"], "visible"); this.vis(m, ["musim"], "none");
        const xs = r.hari.flatMap(h => h.sel.map(pusatSel)); const b = xs.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [180, 90, -180, -90]);
        m.fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding: 40, duration: 900, maxZoom: 12}); }
    }
    this.infoSebar();
  },

  /* ---------- interaksi ---------- */
  ubah(e) {
    const t = e.target, k = t.dataset.ubah; if (!k) return;
    if (k === "hariMusim") { this.henti(); this.st.hariMusim = +t.value; return this.gambarMusim(); }
    if (k === "hariRe") { this.henti(); this.st.hariRe = +t.value; return this.gambarSebar(false); }
    if (k === "peristiwa") return +t.value < 0 ? this.kembali() : this.masukRe(+t.value);
    if (k === "kasus") { this.pilihKasus(+t.value); }
  },
  pilihKasus(i) { this.st.kasus = i; this.el.querySelectorAll("tr[data-kasus]").forEach(tr => tr.classList.toggle("on", +tr.dataset.kasus === i));
    const s = this.el.querySelector('[data-ubah="kasus"]'); if (s) s.value = i; this.gambarKasus(); },
  jalan(key, min, max, gambar, ms, btn) { /* putar / jeda; di ujung, putar ulang dari awal */
    if (this.animKey === key) return this.henti();
    this.henti();
    if (this.st[key] >= max) this.st[key] = min - 1;
    this.animKey = key; $q(btn, this.el).textContent = "❚❚ Jeda";
    this.anim = setInterval(() => { this.st[key] = Math.min(max, this.st[key] + 1); const sl = $q(`[data-ubah="${key}"]`, this.el); if (sl) sl.value = this.st[key]; gambar(); if (this.st[key] >= max) this.henti(); }, ms);
  },
  henti() { clearInterval(this.anim); this.anim = null; this.animKey = null;
    const a = $q("#ct-btnM", this.el), b = $q("#ct-btnR", this.el); if (a) a.textContent = "▶ Putar musim"; if (b) b.textContent = "▶ Putar"; },
  tampilMode() { const re = this.st.mode === "re"; for (const [id, h] of [["ct-nas", re], ["ct-nasBawah", re], ["ct-re", !re], ["ct-reBawah", !re]]) { const x = $q("#" + id, this.el); if (x) x.hidden = h; } },
  masukRe(i) {
    this.henti(); const r = this.D.c.replay[i], st = this.st, m = this.peta.musim, n = r.hari.length;
    st.mode = "re"; st.replay = i; st.hariRe = 1;
    const sl = $q('[data-ubah="hariRe"]', this.el); sl.max = n; sl.value = 1;
    const rank = this.urutRe.indexOf(i), ak = r.hari.at(-1).tgl;
    $q("#ct-reJudul", this.el).innerHTML = `${rank === 0 ? "Peristiwa terbesar" : "Peristiwa besar"}: ${es(r.kab || nmP(r.prov))}, ${tglP(r.t0)}–${tglID(ak)}, ${hl(nf(r.ha) + " ha")} dalam ${hl(n + " hari")}`;
    this.tampilMode(); this.gambarSebar(true);
    if (n > 1) this.jalan("hariRe", 1, n, () => this.gambarSebar(false), 450, "#ct-btnR");
  },
  kembali() {
    this.henti(); this.st.mode = "nas"; const s = $q('select[data-ubah="peristiwa"]', this.el); if (s) s.value = -1; this.tampilMode();
    const m = this.peta.musim;
    if (m?.sedia) { this.vis(m, ["sebar", "sebar-arah-l", "sebar-arah", "sebar-awal"], "none"); this.vis(m, ["musim"], "visible"); m.flyTo({center: [113, -2], zoom: 3.6, duration: 900}); }
    this.gambarMusim();
  },
  keHari(d) { this.henti(); this.st.hariMusim = Math.max(TL0, Math.min(this.DMAX, d)); this.gambarMusim(); },
  klik(e) {
    const a = e.target.closest("[data-aksi]"), tr = e.target.closest("tr[data-kasus]");
    if (tr) return this.pilihKasus(+tr.dataset.kasus);
    if (!a) return;
    const z = a.dataset.aksi;
    if (z === "putar-musim") this.jalan("hariMusim", TL0, this.DMAX, () => this.gambarMusim(), 90, "#ct-btnM");
    if (z === "putar-sebar") this.jalan("hariRe", 1, this.D.c.replay[this.st.replay].hari.length, () => this.gambarSebar(false), 450, "#ct-btnR");
    if (z === "kembali") this.kembali();
    if (z === "ke-hari") this.keHari(+a.dataset.hari);
    if (z === "tl") { const b = a.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - b.left - 8) / (b.width - 16))); this.keHari(Math.round(TL0 + f * (this.DMAX - TL0))); }
  },
};
window.Cerita = Cerita;

/* sambungan ke Insight (bila ada): kartu pembuka "Baca cerita" paling atas; cerita terbuka di tempat */
if (typeof Insight !== "undefined" && Array.isArray(Insight.EX) && !Insight.EX.includes("cerita")) {
  /* cerita di bawah kartu-kartu Insight, selebar penuh */
  Insight.EX.push("cerita"); Insight.PENUH?.add("cerita");
  /* langsung tampil semua (tanpa tombol "Baca cerita"): wadah dibuka begitu Insight selesai digambar */
  Insight.exCerita = function () {
    setTimeout(() => { const el = document.querySelector('#insight [data-ex="cerita"]'); if (el && !el.querySelector(".cerita")) Cerita.buka(el); }, 0);
    return `<div class="ct-muat">Menyiapkan cerita…</div>`;
  };
}
})();
