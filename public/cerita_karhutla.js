/* cerita_karhutla.js — cerita bergulir "Dari mana mulai, ke mana menyebar" (sub-bagian Insight, tombol "Baca cerita").
   Bab: 1 dua puluh tahun · 2 musim 2026 · 3 cara api menyebar · 4 pendorong · 5 kalau besok ada titik di X ·
        6 uji model pada kejadian lalu · 7 kesimpulan & rekomendasi.
   Semua angka dibaca dari berkas data (tren_karhutla, musim_awal, sebaran_cerita, sebaran_kasus, model_sebaran);
   judul bab dirangkai dari angka itu, bukan ketikan tangan. Butuh maplibregl (sudah dimuat index.html) dan
   sebaran_model.js (bab 5). Pasang: lihat scripts/sebaran/SEBARAN_MODEL.md. */
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
const tglID = s => new Date(s).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"});
const hariKe = d => new Date(Date.UTC(2026, 0, 1) + d * 864e5).toLocaleDateString("id-ID", {day: "numeric", month: "short"});
const panah = (lon, lat, deg, km) => { const r = deg * Math.PI / 180, dx = Math.sin(r) * km / (111.32 * Math.cos(lat * Math.PI / 180)), dy = Math.cos(r) * km / 110.57;
  const x2 = lon + dx, y2 = lat + dy, a1 = r + 2.6, a2 = r - 2.6, h = km * .3;
  return [[lon, lat], [x2, y2], [x2 + Math.sin(a1) * h / (111.32 * Math.cos(lat * Math.PI / 180)), y2 + Math.cos(a1) * h / 110.57], [x2, y2], [x2 + Math.sin(a2) * h / (111.32 * Math.cos(lat * Math.PI / 180)), y2 + Math.cos(a2) * h / 110.57]]; };

/* ---------------- grafik SVG kecil ---------------- */
function batang(data, o = {}) { /* data [{l, v, w (warna), tip}] */
  const W = o.w || 640, H = o.h || 220, m = {l: 44, r: 8, t: 10, b: 34}, n = data.length, maks = o.maks || Math.max(...data.map(d => d.v), 1);
  const bw = (W - m.l - m.r) / n, y = v => H - m.b - (H - m.t - m.b) * v / maks;
  const tk = [0, .25, .5, .75, 1].map(f => f * maks);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${es(o.label || "grafik batang")}">
    ${tk.map(t => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="currentColor" stroke-opacity=".12"/><text x="${m.l - 6}" y="${y(t) + 4}" font-size="10" text-anchor="end" opacity=".7">${o.fy ? o.fy(t) : nf(t)}</text>`).join("")}
    ${data.map((d, i) => `<rect x="${m.l + i * bw + bw * .12}" y="${y(d.v)}" width="${bw * .76}" height="${Math.max(0, H - m.b - y(d.v))}" fill="${d.w || "var(--brand2,#3f5fa0)"}" data-tip="${es(d.tip || d.l + ": " + nf(d.v))}"/>
      ${n <= 30 || i % 2 === 0 ? `<text x="${m.l + i * bw + bw / 2}" y="${H - m.b + 13}" font-size="${n > 16 ? 9 : 10.5}" text-anchor="middle" opacity=".8">${es(d.l)}</text>` : ""}`).join("")}
  </svg>`;
}
function hbatang(data, o = {}) { /* horizontal, nilai bisa negatif/rasio */
  const W = o.w || 640, rh = 22, H = data.length * rh + 26, m = {l: o.ml || 210, r: 50}, maks = o.maks || Math.max(...data.map(d => Math.abs(d.v)), 1e-9), x0 = o.nol ?? 0;
  const x = v => m.l + (W - m.l - m.r) * (v - Math.min(0, x0)) / (maks - Math.min(0, x0));
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${es(o.label || "grafik")}">
    ${o.garis != null ? `<line x1="${x(o.garis)}" x2="${x(o.garis)}" y1="0" y2="${H - 20}" stroke="currentColor" stroke-dasharray="3 3" opacity=".5"/>` : ""}
    ${data.map((d, i) => { const a = x(Math.min(d.v, o.garis ?? 0)), b = x(Math.max(d.v, o.garis ?? 0));
      return `<text x="${m.l - 8}" y="${i * rh + 15}" font-size="11" text-anchor="end">${es(d.l)}</text>
      <rect x="${a}" y="${i * rh + 4}" width="${Math.max(1, b - a)}" height="${rh - 8}" fill="${d.w || "var(--brand2,#3f5fa0)"}" data-tip="${es(d.tip || "")}"/>
      ${d.ci ? `<line x1="${x(d.ci[0])}" x2="${x(d.ci[1])}" y1="${i * rh + 11}" y2="${i * rh + 11}" stroke="currentColor" stroke-width="1.4"/>` : ""}
      <text x="${b + 4}" y="${i * rh + 15}" font-size="10.5" opacity=".85">${es(d.t ?? nf(d.v, 2))}</text>`; }).join("")}
  </svg>`;
}
function garisK(series, o = {}) { /* series [{n, xy:[[x,y]], w}] */
  const W = o.w || 300, H = o.h || 150, m = {l: 38, r: 8, t: 8, b: 26};
  const xs = series.flatMap(s => s.xy.map(p => p[0])), ys = series.flatMap(s => s.xy.map(p => p[1]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = o.y0 ?? Math.min(...ys), y1 = Math.max(...ys);
  const X = v => m.l + (W - m.l - m.r) * (v - x0) / ((x1 - x0) || 1), Y = v => H - m.b - (H - m.t - m.b) * (v - y0) / ((y1 - y0) || 1);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${es(o.label || "kurva")}">
    <line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" stroke="currentColor" opacity=".3"/>
    <text x="${m.l - 4}" y="${Y(y1) + 4}" font-size="9.5" text-anchor="end" opacity=".7">${o.fy ? o.fy(y1) : nf(y1, 2)}</text><text x="${m.l - 4}" y="${Y(y0) + 4}" font-size="9.5" text-anchor="end" opacity=".7">${o.fy ? o.fy(y0) : nf(y0, 2)}</text>
    <text x="${m.l}" y="${H - 8}" font-size="9.5" opacity=".7">${nf(x0, 1)}</text><text x="${W - m.r}" y="${H - 8}" font-size="9.5" text-anchor="end" opacity=".7">${nf(x1, 1)}</text>
    <text x="${(W + m.l) / 2}" y="${H - 8}" font-size="10" text-anchor="middle">${es(o.xl || "")}</text>
    ${series.map(s => `<polyline fill="none" stroke="${s.w || "var(--bad,#c9503a)"}" stroke-width="2" points="${s.xy.map(p => X(p[0]) + "," + Y(p[1])).join(" ")}"/>`).join("")}
  </svg>`;
}

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
  D: {}, peta: {}, st: {replay: 0, kasus: 0, hariRe: 99, hariMusim: 365},
  async muat() {
    const D = this.D;
    if (D.siap) return;
    const opsional = u => ambil(u).catch(() => null);
    [D.tren, D.musim, D.c, D.kasus, D.model] = await Promise.all([ambil("data/tren_karhutla.json"), ambil("data/musim_awal.json"), ambil("data/sebaran_cerita.json"),
      opsional("data/sebaran_kasus.json"), opsional("data/model_sebaran.json")]);
    D.siap = true;
  },
  bab(no, id, judul, isi, catatan) {
    return `<section class="ct-bab" id="ct-${id}"><div class="ct-no">Bab ${no}</div><h2>${judul}</h2>${isi}${catatan ? `<p class="ct-cat">${catatan}</p>` : ""}</section>`;
  },
  async buka(el) {
    el.innerHTML = `<div class="ct-muat">Menyiapkan cerita…</div>`;
    try { await this.muat(); } catch (e) { el.innerHTML = `<div class="ct-muat">Data cerita belum tersedia (${es(e.message)}).</div>`; return; }
    this.el = el;
    el.innerHTML = `<article class="cerita">${this.hero()}${this.bab1()}${this.bab2()}${this.bab3()}${this.bab4()}${this.bab5()}${this.bab6()}${this.bab7()}</article>`;
    el.onclick = e => this.klik(e);
    el.oninput = e => this.ubah(e);
    el.onchange = e => this.ubah(e);
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
    return `<header class="ct-hero"><div><p class="ct-kicker">Cerita data · NASA FIRMS 2002–2026, ERA5, 12 musim VIIRS</p>
      <h1>Dari mana mulai, ke mana menyebar</h1>
      <p>Dua puluh lima tahun titik panas, musim 2026 hari demi hari, dan model yang dilatih dari ribuan kebakaran lalu untuk menjawab satu pertanyaan: kalau besok ada titik api di sini, ke mana ia akan pergi?</p></div>
      <div class="ct-angka">
        <div><b>${nf(n26)}</b><span>titik MODIS 2026 s.d. ${es(this.D.c.dibuat)}${lebih.length ? `; hanya ${lebih.length} tahun sejak 2002 yang lebih banyak` : "; terbanyak sejak 2002"}</span></div>
        <div><b>${lebihAwal} dari ${awal.length}</b><span>provinsi prioritas memulai musim 2026 lebih awal dari median 2015–2025</span></div>
        <div><b>${pc(T.ulang_2026.sel_pernah)}</b><span>titik VIIRS 2026 jatuh di sel 375 m yang pernah terbakar 2015–2025</span></div>
      </div></header>`;
  },

  /* ---------- bab 1: 20 tahun ---------- */
  bab1() {
    const T = this.D.tren, en = new Set(T.el_nino);
    const data = T.tahun.map((y, i) => ({l: String(y).slice(2), v: T.nasional[i], w: y === 2026 ? "var(--bad,#c9503a)" : en.has(y) ? "#e58a45" : "var(--brand2,#3f5fa0)",
      tip: `${y}: ${nf(T.nasional[i])} titik${en.has(y) ? " · El Niño" : ""}${y === 2026 ? " · belum selesai" : ""}`}));
    const pr = Object.entries(T.prov).filter(([k, o]) => o.prioritas);
    const rasio = pr.map(([k, o]) => o.rasio_el_nino).filter(Boolean).sort((a, b) => a - b), rmed = rasio[Math.floor(rasio.length / 2)];
    const top = [...pr].sort((a, b) => (b[1].rasio_el_nino || 0) - (a[1].rasio_el_nino || 0))[0];
    const geser = pr.filter(([, o]) => o.geser_awal_hari_per_dekade != null);
    const tabel = `<div class="ct-tw"><table><thead><tr><th>Provinsi</th><th>Tren titik/th</th><th>El Niño ÷ biasa</th><th>Awal musim bergeser</th><th>Akhir musim bergeser</th></tr></thead><tbody>
      ${pr.map(([k, o]) => `<tr><td>${es(o.nama)}</td><td>${o.tren_persen_per_tahun == null ? "–" : nf(o.tren_persen_per_tahun, 1) + "%"}${o.mk_p < .05 ? "*" : ""}</td><td>${o.rasio_el_nino == null ? "–" : nf(o.rasio_el_nino, 1) + "×"}</td>
        <td>${o.geser_awal_hari_per_dekade == null ? "–" : (o.geser_awal_hari_per_dekade > 0 ? "+" : "") + nf(o.geser_awal_hari_per_dekade, 1) + " hari/dekade"}${o.geser_awal_p != null && o.geser_awal_p < .05 ? "*" : ""}</td>
        <td>${o.geser_akhir_hari_per_dekade == null ? "–" : (o.geser_akhir_hari_per_dekade > 0 ? "+" : "") + nf(o.geser_akhir_hari_per_dekade, 1) + " hari/dekade"}${o.geser_akhir_p != null && o.geser_akhir_p < .05 ? "*" : ""}</td></tr>`).join("")}</tbody></table></div>`;
    const porsiBesar = T.tahun_terbesar.map(y => { const p = Object.entries(T.porsi_prov[y] || {}).sort((a, b) => b[1] - a[1]).slice(0, 2); return `${y}: ${p.map(([k, v]) => `${nmP(k)} ${pc(v)}`).join(", ")}`; }).join(" · ");
    const g = T.gambut_porsi_viirs, gEN = ["2015", "2019", "2023"].map(y => g[y]).filter(Boolean), gBi = ["2016", "2017", "2020", "2021", "2022", "2024", "2025"].map(y => g[y]).filter(Boolean);
    const rata = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
    return this.bab(1, "tren", `Tahun El Niño membakar ${nf(rmed, 1)} kali lipat tahun biasa, dan 2026 sudah masuk golongan itu`,
      `<p class="ct-lead">Jumlah titik MODIS per tahun, 9 provinsi prioritas dan provinsi lain. Oranye = tahun El Niño (ONI Sep–Nov ≥ 0,5), merah = 2026 (belum selesai).</p>
      ${batang(data, {label: "titik MODIS per tahun", h: 230})}
      <div class="ct-dua"><div><h3>Lahan gambut menentukan tahun besar</h3><p>Di tahun El Niño (2015, 2019, 2023) rata-rata ${pc(rata(gEN))} titik VIIRS jatuh di gambut, di tahun biasa ${pc(rata(gBi))}; 2026: ${pc(g["2026"])}. Rasio El Niño terbesar: ${es(top[1].nama)} (${nf(top[1].rasio_el_nino, 1)}×).</p>
        <h3>Siapa yang menyumbang tahun besar</h3><p class="ct-kecil">${es(porsiBesar)}</p></div>
      <div><h3>Tempat yang terbakar hampir tiap tahun</h3><ol class="ct-ol">${T.keberulangan.slice(0, 8).map(h => `<li>${es(h.kab)} (${es(nmP(h.prov))}): ${h.tahun_terbakar} dari 24 tahun, rata-rata ${nf(h.rata_titik)} titik/th</li>`).join("")}</ol></div></div>
      ${tabel}`,
      `Tren = kemiringan Theil–Sen jumlah titik 2002–2025 (log); * = Mann–Kendall p < 0,05. Pergeseran awal/akhir musim memakai definisi yang sama dengan bab 2 pada MODIS. Sebagian penurunan titik MODIS setelah ~2020 bisa berasal dari orbit Terra/Aqua yang bergeser (jam lintas berubah), bukan api yang berkurang; VIIRS 2015–2025 menunjukkan arah yang sama tetapi lebih pendek. ${es(T.catatan)}`);
  },

  /* ---------- bab 2: musim 2026 ---------- */
  bab2() {
    const M = this.D.musim, ur = M.urutan.map(p => M.prov[p]);
    const pertama = ur[0], cepat = ur.filter(o => o.selisih_hari != null).sort((a, b) => a.selisih_hari - b.selisih_hari)[0];
    const W = 640, H = 26 * ur.length + 30, x0 = 150, x1 = 630, d0 = 150, d1 = 290, X = d => x0 + (x1 - x0) * (d - d0) / (d1 - d0);
    const doy = s => s ? Math.round((Date.parse("2026 " + s.replace("Aug", "Aug").replace("Agu", "Aug")) - Date.UTC(2026, 0, 1)) / 864e5) : null;
    const isoDoy = s => s ? Math.round((Date.parse(s) - Date.UTC(2026, 0, 1)) / 864e5) : null;
    const med = o => { const ys = Object.values(o.per_tahun || {}).map(v => v.awal).filter(Boolean); return o.selisih_hari != null ? isoDoy(o.awal_2026_iso) - o.selisih_hari : null; };
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Awal musim 2026 dibanding median">
      ${[160, 182, 213, 244, 274].map(d => `<line x1="${X(d)}" x2="${X(d)}" y1="0" y2="${H - 22}" stroke="currentColor" opacity=".1"/><text x="${X(d)}" y="${H - 6}" font-size="10" text-anchor="middle" opacity=".7">${hariKe(d)}</text>`).join("")}
      ${ur.map((o, i) => { const a = isoDoy(o.awal_2026_iso), m = med(o), y = 18 + i * 26;
        return `<text x="${x0 - 8}" y="${y + 4}" font-size="11.5" text-anchor="end">${es(o.nama)}</text>
          ${m != null ? `<line x1="${X(m)}" x2="${X(a)}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".35"/><circle cx="${X(m)}" cy="${y}" r="4.5" fill="none" stroke="currentColor" opacity=".6" data-tip="median 2015–2025: ${hariKe(m)}"/>` : ""}
          <circle cx="${X(a)}" cy="${y}" r="6" fill="${WP[M.urutan[i]] || "var(--bad)"}" data-tip="${es(o.nama)} 2026: ${es(o.awal_2026)}${o.selisih_hari != null ? ` (${Math.abs(o.selisih_hari)} hari ${o.selisih_hari < 0 ? "lebih awal" : "lebih lambat"})` : ""}"/>`; }).join("")}</svg>`;
    const kompleks = ur.flatMap(o => (o.pertama || []).slice(0, 1).map(e => ({...e, prov: o.nama}))).sort((a, b) => a.t0 < b.t0 ? -1 : 1);
    return this.bab(2, "musim", `Musim 2026 dimulai di ${es(pertama.nama)} pada ${es(pertama.awal_2026)}; ${es(cepat.nama)} paling maju, ${Math.abs(cepat.selisih_hari)} hari lebih awal dari biasanya`,
      `<p class="ct-lead">Titik bulat = hari pertama jumlah titik VIIRS 7 hari bertahan di atas 2× median 2015–2025 selama ≥ 14 hari; lingkaran kosong = median tahun 2015–2025.</p>${svg}
      <div class="ct-peta" data-peta="musim"></div>
      <div class="ct-kontrol"><button class="ct-btn" data-aksi="putar-musim">▶ Putar musim</button><input type="range" min="150" max="290" value="290" data-ubah="hariMusim" aria-label="Hari"><output id="ct-hariMusim">${hariKe(290)}</output></div>
      <p class="ct-kecil">Sel 5 km (≥ 3 titik) yang pertama terbakar sejak Juni, diwarnai menurut hari pertamanya: kuning = awal musim, merah tua = baru menyala. Pembakaran sebelum Juni tidak ditampilkan. Kompleks besar pertama tiap provinsi: ${kompleks.map(e => `${es(e.prov)} — ${es(e.kab || "")} ${tglID(e.t0)} (${nf(e.ha)} ha)`).join("; ")}.</p>`,
      `${es(M.catatan)} Celah data FIRMS 8 Mei–1 Jun 2026: rangkaian 14 hari tidak boleh melewatinya. ${es(M.narasi)}`);
  },

  /* ---------- bab 3: cara menyebar ---------- */
  bab3() {
    const R = this.D.c.replay, r = R[this.st.replay];
    const hariMed = [...R].map(x => x.hari.length).sort((a, b) => a - b)[Math.floor(R.length / 2)];
    return this.bab(3, "sebar", `Peristiwa terbesar terus bertambah luas selama ${hariMed} hari (median) dan tumbuh dari tepi ke tepi, bukan satu garis api yang melaju`,
      `<p class="ct-lead">Ulang tayang peristiwa terbesar 2026 (dan pembanding 2015/2019/2023). Warna = hari terdeteksi; bintang = deteksi pertama; panah = pergeseran pusat sel baru hari itu.</p>
      <div class="ct-kontrol"><select data-ubah="replay" aria-label="Peristiwa">${R.map((x, i) => `<option value="${i}" ${i === this.st.replay ? "selected" : ""}>${es(x.kab || nmP(x.prov))} · ${tglID(x.t0)} · ${nf(x.ha)} ha</option>`).join("")}</select>
        <button class="ct-btn" data-aksi="putar-sebar">▶ Putar</button><input type="range" min="1" max="${r.hari.length}" value="${r.hari.length}" data-ubah="hariRe" aria-label="Hari ke"><output id="ct-hariRe"></output></div>
      <div class="ct-peta" data-peta="sebar"></div><div id="ct-sebarInfo" class="ct-kecil"></div>`,
      "Perimeter = sel 375 m yang pernah memuat titik VIIRS S-NPP (≈ 2 lintasan sehari). Awan dan asap tebal menyembunyikan api, jadi hari tanpa titik belum tentu hari tanpa api; sel yang terbakar tanpa terdeteksi tidak muncul.");
  },
  infoSebar() {
    const r = this.D.c.replay[this.st.replay], n = Math.min(this.st.hariRe, r.hari.length), h = r.hari.slice(0, n);
    const sel = h.reduce((a, x) => a + x.sel.length, 0), arah = h.filter(x => x.arah != null);
    const mata = ["U", "TL", "T", "Tg", "S", "BD", "B", "BL"], ke = d => mata[Math.round(d / 45) % 8];
    const out = $q("#ct-sebarInfo", this.el); if (!out) return;
    $q("#ct-hariRe", this.el).textContent = `hari ${n} · ${tglID(h[n - 1].tgl)}`;
    out.innerHTML = `${es(r.kab || "")}, ${es(nmP(r.prov))}. Dimulai ${tglID(r.t0)} dari ${r.hari[0].sel.length} sel; sampai hari ke-${n}: ${nf(sel * 14.06)} ha (${sel} sel). Arah pergeseran harian: ${arah.slice(-8).map(x => ke(x.arah)).join(" → ") || "–"}.`;
  },

  /* ---------- bab 4: pendorong ---------- */
  bab4() {
    const P = this.D.c.angka.pendorong;
    if (!P) return this.bab(4, "dorong", "Pendorong penjalaran", `<p class="ct-lead">Analisis pendorong belum dijalankan.</p>`);
    const K = P.kelas, r = (f, i) => K[f]?.tabel?.[i];
    const pick = [["gambut", 1, "Di gambut (vs mineral)"], ["malam", 1, "Pertama terlihat malam"], ["n0", 3, "≥ 5 sel di lintasan pertama (vs 1)"], ["frp0", 4, "FRP awal ≥ 50 MW (vs < 5)"],
      ["dc", K.dc?.tabel?.length - 1, "DC tertinggi (vs < 100)"], ["hujan24", 2, "Hujan 5–20 mm 24 jam ke depan (vs 0)"], ["rh_min", 3, "RH minimum ≥ 60% (vs < 40%)"], ["ws", 2, "Angin 15–20 km/jam (vs < 10)"],
      ["jalan_km", 3, "≥ 10 km dari jalan (vs < 1)"], ["desa_km", 3, "≥ 6 km dari desa (vs < 1)"], ["kanal_km", 3, "Kanal ≥ 3 km per sel (vs tanpa)"], ["bekas", 1, "Bekas terbakar 1–3 th (vs belum)"],
      ["lereng", 3, "Lereng ≥ 8% (vs < 1%)"], ["oni", 3, "El Niño ≥ 1 (vs La Niña)"]].filter(([f, i]) => r(f, i)?.rasio != null);
    const data = pick.map(([f, i, l]) => ({l, v: r(f, i).rasio, w: r(f, i).rasio >= 1 ? "var(--bad,#c9503a)" : "var(--ok,#5a9e74)", t: nf(r(f, i).rasio, 1) + "×",
      tip: `${l}: ${pc(r(f, i).laju, 1)} lolos (n = ${nf(r(f, i).n)}); acuan ${pc(K[f].tabel[0].laju, 1)}`})).sort((a, b) => b.v - a.v);
    const imp = P.gbdt.permutasi.slice(0, 10).map(x => ({l: x.nama, v: Math.max(0, x.turun_auc), t: nf(x.turun_auc, 3)}));
    const pd = Object.entries(P.ketergantungan_parsial || {}).slice(0, 6).map(([f, xy]) => `<figure>${garisK([{xy}], {xl: P.gbdt.permutasi.find(x => x.fitur === f)?.nama || f, fy: v => pc(v, 1), w: 260, h: 140})}</figure>`).join("");
    const A = P.arah, angin = A.angin || [], kuat = angin.at(-1), lemah = angin[0];
    const besar = data[0];
    const top3 = P.gbdt.permutasi.slice(0, 3).map(x => x.nama).join(", "), arahLemah = (A.semua?.bawah_angin_45 ?? 0) < .35;
    return this.bab(4, "dorong", `Yang paling menentukan titik api membesar: ${es(top3)}. ${arahLemah ? `Arah angin hanya sedikit menjelaskan ke mana api bergeser (${pc(A.semua?.bawah_angin_45)} searah ±45°, acak 25%)` : `Api cenderung bergeser searah angin (${pc(A.semua?.bawah_angin_45)} dalam ±45°)`}`,
      `<p class="ct-lead">Dari ${nf(P.n_peristiwa)} titik api baru di 9 provinsi (Jul–Nov, 2015–2026), ${nf(P.n_lolos)} (${pc(P.laju_dasar, 1)}) lolos menjadi ${es(P.definisi_lolos)}. Batang = berapa kali peluang lolos dibanding kelas acuan.</p>
      ${hbatang(data, {label: "rasio peluang lolos", garis: 1, ml: 250, maks: Math.max(...data.map(d => d.v)) * 1.1})}
      <div class="ct-dua"><div><h3>Seberapa penting tiap variabel (model boosting, uji 2023–2026)</h3>${hbatang(imp, {ml: 200, label: "penurunan AUC"})}
        <p class="ct-kecil">Penurunan AUC bila nilai variabel diacak; AUC model ${nf(P.gbdt.auc_uji, 3)} (regresi logistik ${nf(P.logistik.auc_uji, 3)}).</p></div>
      <div><h3>Arah dan jarak</h3><p>Pada hari api bergeser ≥ 750 m, ${pc(A.semua.bawah_angin_45)} pergeseran jatuh dalam ±45° arah angin bertiup (acak = 25%); pada pergeseran ≥ 2 km dengan angin ≥ 10 km/jam: ${pc(A.bersih?.bawah_angin_45)}.
        ${kuat && lemah ? `Pada angin ${es(kuat.kelas)} km/jam api bertambah rata-rata ${nf(kuat.ha_rata)} ha/hari, ${nf(kuat.rasio_ha, 1)}× angin ${es(lemah.kelas)} km/jam.` : ""}</p>
        ${angin.length ? batang(angin.map(a => ({l: a.kelas, v: a.ha_rata, tip: `angin ${a.kelas} km/jam: ${nf(a.ha_rata)} ha/hari rata-rata, ${pc(a.bawah_angin_45)} searah angin ±45° (n = ${nf(a.n)})`})), {h: 170, label: "ha per hari per kelas angin"}) : ""}
        <p class="ct-kecil">Luas baru per hari (ha) per kelas kecepatan angin rata-rata 24 jam.</p></div></div>
      <h3>Kurva ketergantungan parsial (peluang lolos, model boosting)</h3><div class="ct-pd">${pd}</div>`,
      `Rasio dari tabel silang sederhana: variabel saling terkait (gambut terpencil juga jauh dari jalan), jadi baca bersama urutan kepentingan model. Kemiringan dari SRTM 90 m (OpenTopoData) pada sampel peristiwa. Ini hubungan, bukan sebab-akibat yang dibuktikan. Variabel terkuat, ${es(besar?.l || "")}, sebagian adalah ukuran api itu sendiri saat pertama terlihat.`);
  },

  /* ---------- bab 5: kalau besok ---------- */
  bab5() {
    const M = this.D.model, K = M?.kinerja_uji;
    const hari = new Date().toISOString().slice(0, 10);
    return this.bab(5, "model", "Kalau besok ada titik di sini: ke mana ia menyebar, seberapa besar, apa yang terkena",
      `<p class="ct-lead">Klik peta untuk menaruh titik api, pilih tanggal, lalu jalankan. Model memakai cuaca per jam Open-Meteo (30 hari lalu + 3 hari ke depan), peta gambut, kawasan, konsesi, kanal, jalan, desa, dan riwayat terbakar, lalu menjalankan 60 kemungkinan.</p>
      <div class="ct-kontrol"><label>Tanggal <input type="date" value="${hari}" max="${new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)}" id="ct-tgl"></label>
        <label>Jam lokal <input type="number" min="0" max="23" value="14" id="ct-jam" style="width:60px"></label><button class="ct-btn" data-aksi="ramal" disabled id="ct-ramalBtn">Jalankan model</button><span id="ct-ramalSt" class="ct-kecil">Klik peta dulu.</span></div>
      <div class="ct-peta tinggi" data-peta="model"></div><div id="ct-ramalHasil"></div>`,
      M ? `Model data (gradient boosting ${M.pohon.length} pohon) dilatih pada 2015–2026; pada uji 2024–2026 (model 2015–2022) F1 sel baru 24 jam ${nf(K?.f1_24?.[0], 2)} (95%: ${nf(K?.f1_24?.[1], 2)}–${nf(K?.f1_24?.[2], 2)}), salah arah ${nf(K?.arah_24?.[0])}°, AUC lolos ${nf(K?.lepas_auc, 2)}. Peluang per jam = luas harian dibagi menurut ISI per jam, bukan pengamatan. Penduduk terpapar dihitung dari kepadatan rata-rata sel 0,25° (kasar).` : "Model belum tersedia.");
  },
  async ramal() {
    const st = $q("#ct-ramalSt", this.el), out = $q("#ct-ramalHasil", this.el), b = $q("#ct-ramalBtn", this.el), [lon, lat] = this.titik;
    if (typeof SebaranModel === "undefined") { st.textContent = "sebaran_model.js belum dimuat."; return; }
    b.disabled = true; st.textContent = "Mengambil cuaca dan lahan…";
    try {
      const tz = Math.round(lon / 15), tgl = $q("#ct-tgl", this.el).value, jam = +$q("#ct-jam", this.el).value;
      const waktu = Date.parse(tgl + "T00:00:00Z") + (jam - tz) * 36e5;
      const L = this.lahan ||= await (async () => { const o = u => ambil(u).catch(() => null);
        const [gambut, kawasan, konsesi, kanal, jalan, desa, riwayat, penduduk, sanksi] = await Promise.all(["data/lahan/gambut.geojson", "data/lahan/kawasan.geojson", "data/lahan/konsesi.geojson", "data/kanal.json", "data/jalan.geojson", "data/osm/desa.json", "data/riwayat_grid.json", "data/penduduk.json", "data/lahan/sanksi_karhutla.json"].map(o));
        return {gambut, kawasan, konsesi, kanal, jalan, desa, riwayat, penduduk, sanksi}; })();
      const cuaca = await SebaranModel.cuacaTanggal(lat, lon, waktu);
      st.textContent = "Menjalankan 60 kemungkinan…"; await new Promise(r => setTimeout(r, 30));
      const t0 = performance.now(), r = SebaranModel.ramal({model: this.D.model, lat, lon, waktu, cuaca, lahan: L, mc: 60, seed: 7});
      st.textContent = `Selesai dalam ${nf((performance.now() - t0) / 1000, 1)} detik.`;
      this.gambarRamal(r);
      const mata = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"], ke = d => mata[Math.round(d / 45) % 8];
      const lu = r.luas, k = r.kena;
      out.innerHTML = `<div class="ct-kartu3">${lu.map((x, i) => `<div><span>${24 * (i + 1)} jam</span><b>${nf(x.p50)} ha</b><small>80% kemungkinan ${nf(x.p10)}–${nf(x.p90)} ha · rata-rata ${nf(x.rata)}</small></div>`).join("")}
        <div><span>Peluang lolos (≥ ${nf((this.D.model.lepas_sel || 10) * 14)} ha dalam 72 jam)</span><b>${pc(r.p_lepas)}</b><small>${r.arah ? `arah utama ${ke(r.arah.deg)} (${r.arah.deg}°), pusat bergeser ${nf(r.arah.km, 1)} km` : "tidak ada arah dominan"}</small></div></div>
        <p>Cuaca 24 jam pertama: angin ${nf(r.cuaca[0].ws, 1)} km/jam ke ${ke(r.cuaca[0].ke)}, RH minimum ${r.cuaca[0].rh_min}%, hujan ${nf(r.cuaca[0].hujan24, 1)} mm, FFMC ${nf(r.cuaca[0].ffmc, 1)}, DC ${nf(r.cuaca[0].dc)}, FWI ${nf(r.cuaca[0].fwi, 1)}.</p>
        <h3>Yang terkena dalam 72 jam (harapan)</h3><ul class="ct-ol"><li>Gambut ${nf(k.gambut_ha)} ha, kawasan lindung/konservasi ${nf(k.lindung_ha)} ha, dari ${nf(k.ha_harapan)} ha harapan terbakar.</li>
        <li>Sel bersinggungan dengan jalan: ${nf(k.sel_jalan)}; penduduk di area terbakar (kasar): ${k.jiwa == null ? "–" : nf(k.jiwa)} jiwa.</li>
        <li>Desa dalam ±750 m dari sel berpeluang ≥ 10%: ${k.desa.length ? k.desa.slice(0, 10).map(d => `${es(d.nama)} (${pc(d.p)}, hari ke-${d.hari}, ${nf(d.km, 1)} km)`).join("; ") : "tidak ada"}.</li></ul>`;
    } catch (e) { st.textContent = "Gagal: " + e.message; }
    b.disabled = false;
  },
  gambarRamal(r) {
    const m = this.peta.model; if (!m) return;
    const fs = r.sel.filter(s => s.p[2] >= .05).map(s => poli(s.k, {p: s.p[2], p1: s.p[0]}));
    setSumber(m, "ramal", fc(fs), [{id: "ramal", type: "fill", paint: {"fill-color": ["interpolate", ["linear"], ["get", "p"], .05, "#fde7a7", .3, "#ef9a4a", .6, "#c63b2f", 1, "#6e1323"], "fill-opacity": .75}}]);
    const ar = r.arah ? [{type: "Feature", geometry: {type: "LineString", coordinates: panah(this.titik[0], this.titik[1], r.arah.deg, Math.max(.6, r.arah.km))}, properties: {}}] : [];
    setSumber(m, "ramal-arah", fc(ar), [{id: "ramal-arah-l", type: "line", paint: {"line-color": "#111", "line-width": 5}}, {id: "ramal-arah", type: "line", paint: {"line-color": "#fff", "line-width": 2.5}}]);
  },

  /* ---------- bab 6: uji pada kejadian lalu ---------- */
  bab6() {
    const K = this.D.kasus;
    if (!K) return this.bab(6, "uji", "Uji model pada kejadian lalu", `<p class="ct-lead">Pustaka uji-balik belum dibuat.</p>`);
    const R = K.ringkasan, c = K.kasus[this.st.kasus];
    const ci = x => x ? `${nf(x[0], 2)} (95%: ${nf(x[1], 2)}–${nf(x[2], 2)})` : "–";
    return this.bab(6, "uji", `Diuji pada ${R.n} kejadian lalu: model menebak benar ${pc(R.lepas_akurasi?.[0])} titik yang akan lolos atau padam, tetapi bentuk perimeternya masih kasar`,
      `<p class="ct-lead">Tiap kasus dimulai dari deteksi pertama saja, dengan cuaca hari itu dan model yang tidak pernah melihat tahun kasus. Kiri: yang dilihat satelit 72 jam kemudian; kanan: peluang ramalan.</p>
      <div class="ct-kontrol"><select data-ubah="kasus" aria-label="Kasus">${K.kasus.map((x, i) => `<option value="${i}" ${i === this.st.kasus ? "selected" : ""}>${x.th} · ${es(x.nama_prov)} · ${x.kelas} · ${nf(x.ha_akhir)} ha</option>`).join("")}</select></div>
      <div class="ct-dua rapat"><div><div class="ct-label">Teramati (VIIRS)</div><div class="ct-peta" data-peta="uji-obs"></div></div><div><div class="ct-label">Ramalan model (peluang 72 jam)</div><div class="ct-peta" data-peta="uji-pred"></div></div></div>
      <div id="ct-ujiInfo" class="ct-kecil"></div>
      <div class="ct-kartu3"><div><span>IoU 24 jam</span><b>${ci(R.iou_24)}</b><small>persistensi ${nf(R.iou_persistensi_24?.[0], 2)}</small></div><div><span>F1 sel baru 24 jam</span><b>${ci(R.f1_24)}</b><small>Sim hibrida ${nf(R.f1_hibrida_24?.[0], 2)}</small></div>
        <div><span>Salah arah</span><b>${nf(R.arah_err?.[0])}°</b><small>bawah angin saja ${nf(R.arah_angin_err?.[0])}°</small></div><div><span>Luas 72 jam dalam rentang P10–P90</span><b>${pc(R.cakupan_72)}</b><small>ideal 80%</small></div></div>
      <div class="ct-tw tinggi"><table><thead><tr><th>Th</th><th>Provinsi</th><th>Kelas</th><th>Gambut</th><th>ha awal</th><th>Teramati 72 j</th><th>Ramalan 72 j (P10–P90)</th><th>IoU 24/72</th><th>Arah</th><th>P(lolos)</th><th>Benar?</th></tr></thead><tbody>
        ${K.kasus.map((x, i) => `<tr data-kasus="${i}" class="${i === this.st.kasus ? "on" : ""}"><td>${x.th}</td><td>${es(x.nama_prov)}</td><td>${x.kelas}</td><td>${x.gambut ? "ya" : "–"}</td><td>${nf(x.ha_awal)}</td><td>${nf(x.obs_ha[2])}</td>
          <td>${nf(x.pred_ha[2][1])} (${nf(x.pred_ha[2][0])}–${nf(x.pred_ha[2][2])})</td><td>${nf(x.iou[0], 2)} / ${nf(x.iou[2], 2)}</td><td>${x.arah_err == null ? "–" : nf(x.arah_err) + "°"}</td><td>${pc(x.p_lepas)}</td><td>${x.lepas_benar ? "✓" : "✗"}</td></tr>`).join("")}</tbody></table></div>`,
      `${es(K.aturan)} Kasus 2023 dinilai dengan model yang hiperparameternya disetel di 2023 (bukan uji murni).`);
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
    if (info) info.innerHTML = `${c.th} ${es(c.nama_prov)}, mulai ${tglID(c.t0)} (${c.gambut ? "gambut" : "tanah mineral"}). Cuaca: angin ${nf(c.cuaca.ws, 1)} km/jam, RH min ${c.cuaca.rh_min}%, FFMC ${nf(c.cuaca.ffmc, 1)}, DC ${nf(c.cuaca.dc)}, ${c.cuaca.hari_kering} hari tanpa hujan.
      Teramati 24/48/72 jam: ${c.obs_ha.map(v => nf(v)).join(" / ")} ha; ramalan median ${c.pred_ha.map(v => nf(v[1])).join(" / ")} ha. IoU ${c.iou.map(v => nf(v, 2)).join(" / ")}, F1 ${c.f1.map(v => nf(v, 2)).join(" / ")}${c.arah_err != null ? `, salah arah ${nf(c.arah_err)}°` : ""}. P(lolos) ${pc(c.p_lepas)} → ${c.lepas ? "memang lolos" : "memang tetap kecil"} ${c.lepas_benar ? "(benar)" : "(salah)"}. Model: ${c.model === "lipat" ? "tidak melihat tahun ini (lipatan)" : "2015–2022"}.`;
  },

  /* ---------- bab 7: kesimpulan ---------- */
  bab7() {
    const A = this.D.c.angka, P = A.pendorong, U = A.uji, K = this.D.kasus?.ringkasan, T = this.D.tren, kab = this.D.c.kab;
    const g = U?.gbdt?.["24"], s = U?.sim?.["24"], h = U?.hibrida?.["24"], pers = U?.persistensi?.["24"];
    const poin = [];
    if (P) { const gb = P.kelas.gambut.tabel; poin.push(`Titik di gambut ${nf(gb[1].rasio, 1)}× lebih mungkin lolos daripada di tanah mineral (${pc(gb[1].laju, 1)} vs ${pc(gb[0].laju, 1)}). Patroli dan pemadaman awal di gambut membayar paling besar.`);
      const hu = P.kelas.hujan24.tabel; poin.push(`Hujan ≥ 5 mm dalam 24 jam memangkas peluang lolos menjadi ${nf(hu[2].rasio, 2)}× — jendela kering tanpa hujan adalah saat siaga tertinggi.`); }
    if (g && s) poin.push(`Untuk 24 jam ke depan, model data mengenai sel baru dengan F1 ${nf(g.f1_mikro, 2)} (mikro) dibanding mesin fisika tanpa kalibrasi ${nf(s.f1_mikro, 2)}${h ? ` dan hibrida ${nf(h.f1_mikro, 2)}` : ""}; persistensi (tidak tumbuh) F1 ${nf(pers?.f1_mikro, 2)}. Peta peluang lebih tepat dipakai untuk "di mana bersiap" daripada garis api yang pasti.`);
    if (K) poin.push(`Pada ${K.n} kejadian lalu, ramalan "akan lolos/tetap kecil" benar ${pc(K.lepas_akurasi?.[0])}; luas 72 jam jatuh dalam rentang P10–P90 pada ${pc(K.cakupan_72)} kasus.`);
    poin.push(`${pc(T.ulang_2026.sel_pernah)} titik 2026 berada di lahan yang pernah terbakar; kabupaten dengan kebakaran besar (≥ 1.000 ha) terbanyak sejak 2015: ${kab.slice(0, 5).map(k => `${es(k.kab)} (${k.n})`).join(", ")}. Di sinilah regu, sekat kanal, dan stok air layak ditaruh sebelum musim.`);
    return this.bab(7, "simpul", "Kesimpulan: siapkan diri di gambut yang pernah terbakar, sebelum hujan berhenti",
      `<ol class="ct-simpul">${poin.map(p => `<li>${p}</li>`).join("")}</ol>
      <h3>Di mana menempatkan regu (kabupaten dengan peristiwa ≥ 1.000 ha terbanyak 2015–2026)</h3>
      ${hbatang(kab.slice(0, 12).map(k => ({l: `${k.kab} (${nmP(k.prov).replace("Kalimantan", "Kal.").replace("Sumatera", "Sum.")})`, v: k.n, t: `${k.n} peristiwa · ${nf(k.ha)} ha`, w: WP[k.prov]})), {ml: 230, label: "peristiwa besar per kabupaten"})}
      <h3>Batas yang perlu diingat</h3><ul class="ct-ol"><li>VIIRS S-NPP melihat ~2 kali sehari; ramalan per jam adalah pembagian, bukan pengamatan. Data geostasioner Himawari (10 menit) dibutuhkan untuk per jam sungguhan.</li>
        <li>Titik panas ≠ perimeter: piksel 375 m melebihkan api kecil dan awan/asap menyembunyikan api besar.</li><li>Uji memakai cuaca reanalisis (seolah prakiraan sempurna); prakiraan sungguhan menurunkan ketepatan.</li>
        <li>Sel yang dibakar sengaja untuk membuka lahan tidak bisa diramal oleh cuaca; model menangkapnya hanya lewat pola tempat & waktu.</li></ul>`);
  },

  /* ---------- peta per bab ---------- */
  petaBab(id) {
    const box = this.el.querySelector(`[data-peta="${id}"]`); if (!box) return;
    if (id === "musim") { const m = this.peta.musim = peta(box, [113, -2], 3.6); if (!m) return; m.siap.then(() => this.gambarMusim()); }
    if (id === "sebar") { const m = this.peta.sebar = peta(box, [113, -2], 9); if (!m) return; m.siap.then(() => this.gambarSebar(true)); }
    if (id === "model") { const m = this.peta.model = peta(box, [113.9, -2.2], 8); if (!m) return;
      m.on("click", e => { this.titik = [e.lngLat.lng, e.lngLat.lat]; $q("#ct-ramalBtn", this.el).disabled = false; $q("#ct-ramalSt", this.el).textContent = `Titik ${nf(e.lngLat.lat, 3)}, ${nf(e.lngLat.lng, 3)}`;
        m.siap.then(() => setSumber(m, "titik", fc([{type: "Feature", geometry: {type: "Point", coordinates: this.titik}, properties: {}}]), [{id: "titik", type: "circle", paint: {"circle-radius": 6, "circle-color": "#c9503a", "circle-stroke-color": "#fff", "circle-stroke-width": 2}}])); }); }
    if (id === "uji-obs" || id === "uji-pred") { this.peta[id] = peta(box, [113, -2], 11); this.gambarKasus(); }
  },
  gambarMusim() {
    const m = this.peta.musim, C = this.D.c, g = C.grid, d = this.st.hariMusim;
    const fs = C.musim26.filter(s => s[2] <= d && s[2] >= 150 && s[3] >= 3).map(([ix, iy, h, n]) => ({type: "Feature", geometry: {type: "Point", coordinates: [g.x0 + (ix + .5) * g.sel, g.y1 - (iy + .5) * g.sel]}, properties: {h, n}}));
    setSumber(m, "musim", fc(fs), [{id: "musim", type: "circle", paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["interpolate", ["linear"], ["get", "n"], 3, .7, 300, 2.6], 8, 7],
      "circle-color": ["interpolate", ["linear"], ["get", "h"], 150, "#fde7a7", 200, "#ef9a4a", 240, "#c63b2f", 285, "#5c0f1f"], "circle-opacity": .8}}]);
    const o = $q("#ct-hariMusim", this.el); if (o) o.textContent = hariKe(d) + ` · ${nf(fs.length)} sel`;
  },
  gambarSebar(pusatkan) {
    const m = this.peta.sebar, r = this.D.c.replay[this.st.replay], n = Math.min(this.st.hariRe, r.hari.length);
    const fs = r.hari.slice(0, n).flatMap((h, d) => h.sel.map(k => poli(k, {d: Math.min(5, Math.floor(d * 6 / Math.max(1, r.hari.length)))})));
    setSumber(m, "sebar", fc(fs), [{id: "sebar", type: "fill", paint: {"fill-color": ["match", ["get", "d"], 0, HARI[0], 1, HARI[1], 2, HARI[2], 3, HARI[3], 4, HARI[4], HARI[5]], "fill-opacity": .85}}]);
    let lama = []; const ar = [];
    for (const h of r.hari.slice(0, n)) { if (lama.length && h.arah != null) { const c0 = lama.reduce((a, k) => { const p = pusatSel(k); return [a[0] + p[0], a[1] + p[1]]; }, [0, 0]).map(v => v / lama.length);
        const km = Math.max(.4, (h.jauh || 500) / 1000); ar.push({type: "Feature", geometry: {type: "LineString", coordinates: panah(c0[0], c0[1], h.arah, km)}, properties: {}}); } lama = lama.concat(h.sel); }
    setSumber(m, "sebar-arah", fc(ar.slice(-6)), [{id: "sebar-arah-l", type: "line", paint: {"line-color": "#111", "line-width": 4.5}}, {id: "sebar-arah", type: "line", paint: {"line-color": "#fff", "line-width": 2}}]);
    setSumber(m, "sebar-awal", fc([{type: "Feature", geometry: {type: "Point", coordinates: [r.lon0, r.lat0]}, properties: {}}]), [{id: "sebar-awal", type: "circle", paint: {"circle-radius": 7, "circle-color": "#fff", "circle-stroke-color": "#1d1d1d", "circle-stroke-width": 3}}]);
    if (pusatkan) { const xs = r.hari.flatMap(h => h.sel.map(pusatSel)); const b = xs.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [180, 90, -180, -90]);
      m.fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding: 30, duration: 0}); }
    this.infoSebar();
  },

  /* ---------- interaksi ---------- */
  ubah(e) {
    const t = e.target, k = t.dataset.ubah; if (!k) return;
    if (k === "hariMusim") { this.st.hariMusim = +t.value; return this.peta.musim && this.gambarMusim(); }
    if (k === "hariRe") { this.st.hariRe = +t.value; return this.peta.sebar && this.gambarSebar(false); }
    if (k === "replay") { this.st.replay = +t.value; const r = this.D.c.replay[this.st.replay]; this.st.hariRe = r.hari.length;
      const sl = this.el.querySelector('[data-ubah="hariRe"]'); sl.max = r.hari.length; sl.value = r.hari.length; return this.peta.sebar && this.gambarSebar(true); }
    if (k === "kasus") { this.pilihKasus(+t.value); }
  },
  pilihKasus(i) { this.st.kasus = i; this.el.querySelectorAll("tr[data-kasus]").forEach(tr => tr.classList.toggle("on", +tr.dataset.kasus === i));
    const s = this.el.querySelector('[data-ubah="kasus"]'); if (s) s.value = i; this.gambarKasus(); },
  klik(e) {
    const a = e.target.closest("[data-aksi]"), tr = e.target.closest("tr[data-kasus]");
    if (tr) return this.pilihKasus(+tr.dataset.kasus);
    if (!a) return;
    const putar = (key, max, min, gambar) => { clearInterval(this.anim); this.st[key] = min; this.anim = setInterval(() => { this.st[key]++; const sl = this.el.querySelector(`[data-ubah="${key}"]`); if (sl) sl.value = this.st[key]; gambar();
      if (this.st[key] >= max) clearInterval(this.anim); }, key === "hariMusim" ? 90 : 450); };
    if (a.dataset.aksi === "putar-musim") putar("hariMusim", 290, 150, () => this.gambarMusim());
    if (a.dataset.aksi === "putar-sebar") putar("hariRe", this.D.c.replay[this.st.replay].hari.length, 1, () => this.gambarSebar(false));
    if (a.dataset.aksi === "ramal") this.ramal();
  },
};
window.Cerita = Cerita;

/* sambungan ke Insight (bila ada): kartu pembuka "Baca cerita" paling atas; cerita terbuka di tempat */
if (typeof Insight !== "undefined" && Array.isArray(Insight.EX) && !Insight.EX.includes("cerita")) {
  Insight.EX.unshift("cerita");
  Insight.exCerita = function () {
    return `<article class="ex ct-masuk"><h3>Dari mana mulai, ke mana menyebar: cerita 25 tahun karhutla dan model penjalaran api</h3>
      <p class="sub">Tujuh bab: tren, musim 2026, ulang tayang, pendorong, model "kalau besok ada titik di X", uji pada kejadian lalu, kesimpulan.</p>
      <button class="ct-btn" onclick="Cerita.buka(this.closest('[data-ex]'))">Baca cerita</button></article>`;
  };
}
})();
