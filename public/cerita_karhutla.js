/* cerita_karhutla.js — cerita data di bagian bawah tab Insight. Kartu berurutan: penempatan regu ·
   25 tahun · musim 2026 (video sebaran: label provinsi muncul sesuai tanggal, kartu samping, kontrol di dasar peta, putar ulang peristiwa) ·
   pendorong (coming soon) · model sebaran (coming soon) · uji model (tersembunyi bila sebaran_kasus.json tidak ada).
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
const KEC = [.5, 1, 2], kc = v => String(v).replace(".", ",");
const bd = s => s < 0 ? `${-s} hari lebih awal` : s > 0 ? `${s} hari lebih lambat` : "sama dengan median";
const API = `<svg viewBox="0 0 12 16" width="11" height="15" aria-hidden="true"><path d="M6 0C6 4 11 6 11 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-10z" fill="#e0663a" stroke="#fff" stroke-width=".8"/></svg>`;
const PUTAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>`, JEDA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>`;
/* titik tengah provinsi (tempat label "awal musim" muncul di peta) */
const CEN = {"14": [101.8, .5], "15": [102.6, -1.6], "16": [104.2, -3.2], "61": [110.6, -.2], "62": [113.5, -1.7], "63": [115.3, -3], "64": [116.5, .9], "53": [121.2, -9.6], "93": [139.8, -6.9]};
const panah = (lon, lat, deg, km) => { const r = deg * Math.PI / 180, dx = Math.sin(r) * km / (111.32 * Math.cos(lat * Math.PI / 180)), dy = Math.cos(r) * km / 110.57;
  const x2 = lon + dx, y2 = lat + dy, a1 = r + 2.6, a2 = r - 2.6, h = km * .3;
  return [[lon, lat], [x2, y2], [x2 + Math.sin(a1) * h / (111.32 * Math.cos(lat * Math.PI / 180)), y2 + Math.cos(a1) * h / 110.57], [x2, y2], [x2 + Math.sin(a2) * h / (111.32 * Math.cos(lat * Math.PI / 180)), y2 + Math.cos(a2) * h / 110.57]]; };

/* ---------------- grafik SVG gaya Insight ---------------- */
const NAVY = "oklch(25.5% .075 256)";
const hl = (t, p) => `<span class="hl${p ? " pil" : ""}">${t}</span>`;
const rbk = v => v >= 1e6 ? nf(Math.round(v / 1e5) / 10, 1) + " jt" : v >= 1e4 ? nf(Math.round(v / 1e3)) + " rb" : v >= 1e3 ? nf(Math.round(v / 100) / 10, 1) + " rb" : nf(Math.round(v));
/* label pil SVG (salinan Insight.pil: lebar ditaksir dari jumlah huruf) */
const pil = (x, y, t, bg, fg, fs = 12, h = 20) => { const w = String(t).length * fs * .58 + h * .8;
  return [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}"/><text x="${x + w / 2}" y="${y + h / 2 + fs * .36}" text-anchor="middle" font-size="${fs}" font-weight="700" style="fill:${fg}">${es(t)}</text>`, w]; };
function hbatang(data, o = {}) { /* horizontal; data [{l, ket, v, w, t, tip}]; kolom label rata kiri; o.garis = acuan (garis putus + pil navy di atas) */
  const W = o.w || 940, ket = data.some(d => d.ket), rh = ket ? 50 : 34, L = o.ml || 260, T = o.garis != null ? 30 : 0, H = T + data.length * rh + 6, g0 = o.garis ?? 0, maks = o.maks || Math.max(...data.map(d => d.v), g0, 1e-9), X = v => L + (W - L - 90) * v / maks;
  let g = o.garis != null ? `<line x1="${X(g0)}" x2="${X(g0)}" y1="${T - 6}" y2="${H}" stroke="${NAVY}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".55"/>${pil(X(g0) - 30, 0, o.garisT || "acuan", NAVY, "#fff", 11)[0]}` : "";
  data.forEach((d, i) => { const y = T + i * rh, w = d.w || "#1d4e89", b = X(d.v), a = X(g0), x0 = Math.min(a, b), x1 = Math.max(a, b);
    /* ikon berlingkar opsional (d.ik = path SVG 24×24) di kiri label */
    const ix = d.ik ? 38 : 0;
    if (d.ik) g += `<circle cx="15" cy="${y + rh / 2}" r="15" fill="${w}" opacity=".14"/><g transform="translate(6,${y + rh / 2 - 9}) scale(.75)" fill="none" stroke="${w}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d.ik}</g>`;
    g += `<text x="${ix}" y="${d.ket ? y + rh / 2 - 3 : y + 21}" font-size="13" font-weight="700">${es(d.l)}</text>${d.ket ? `<text x="${ix}" y="${y + rh / 2 + 12}" font-size="11" opacity=".6">${es(d.ket)}</text>` : ""}
      <rect x="${x0}" y="${y + 10}" width="${Math.max(2, x1 - x0)}" height="${rh - 20}" rx="4" fill="${w}" data-tip="${es(d.tip || `<b>${d.l}</b><br>${d.t ?? nf(d.v, 2)}`)}"/>
      ${pil(x1 + 8, y + (rh - 20) / 2, d.t ?? nf(d.v, 2), w, "#fff", 12.5)[0]}`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${es(o.label || "grafik")}">${g}</svg>`;
}
const chip = (k, v) => `<span class="ct-chip">${v == null ? "" : `<b>${v}</b>`}${k}</span>`;

/* ---------------- peta ---------------- */
function peta(el, pusat, zoom) {
  if (typeof maplibregl === "undefined") { el.innerHTML = `<p class="ct-cat">Peta butuh MapLibre.</p>`; return null; }
  /* preserveDrawingBuffer: kanvas peta bisa difoto untuk gambar bagikan */
  const m = new maplibregl.Map({container: el, style: gaya(), center: pusat, zoom, attributionControl: {compact: true}, dragRotate: false, cooperativeGestures: true, preserveDrawingBuffer: true});
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
  D: {}, peta: {}, st: {mode: "nas", replay: 0, kasus: 0, hariRe: 1, hariMusim: 284}, ki: 1, tf: 0, raf: 0, kam: true, tahan: 0, dJeda: -1, zoom: false, nTampil: 0, penuh: [],
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
    return `<section class="ct-bab ex" id="ct-${id}"><header class="ex-hd">${id === "musim" ? `<button type="button" class="ct-vid-btn" data-ctvideo="1" title="Rekam dan unduh video sebaran"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>Bagikan video</button>` : ""}<button type="button" class="ct-bagi" data-ctbagi="${id}" aria-label="Bagikan bagian ini" title="Bagikan"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg></button><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div><footer class="ex-ft">${lg ? `<span class="ex-leg">${lg}</span>` : "<span></span>"}${sumber ? `<em>Sumber: ${sumber}</em>` : ""}</footer></section>`;
  },
  async buka(el) {
    el.innerHTML = `<div class="ct-muat">Menyiapkan cerita…</div>`;
    try { await this.muat(); } catch (e) { el.innerHTML = `<div class="ct-muat">Data cerita belum tersedia (${es(e.message)}).</div>`; return; }
    this.el = el;
    el.innerHTML = `<article class="cerita">${this.regu()}${this.musim()}${this.bab4()}${""/* bab6 "Uji model" disembunyikan dulu (pemilik, 14 Okt 2026) */}</article>`;
    el.onclick = e => this.klik(e);
    el.oninput = e => this.ubah(e);
    el.onchange = e => this.ubah(e);
    this.tombol(); this.kepala(); this.pasangScr(); this.infoMusim();
    /* peta dibuat saat bab terlihat */
    const io = new IntersectionObserver(es_ => es_.forEach(x => { if (x.isIntersecting) { io.unobserve(x.target); this.petaBab(x.target.dataset.peta); } }), {rootMargin: "200px"});
    el.querySelectorAll("[data-peta]").forEach(x => io.observe(x));
  },

  /* ---------- fakta gambut/El Niño untuk dipakai kartu lain (kartu "25 tahun" cerita dihapus karena sama dengan Insight) ---------- */
  faktaGambut() {
    const T = this.D.tren; if (!T) return null;
    const g = T.gambut_porsi_viirs, rt = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
    const ambilG = ys => ys.map(y => g[y]).filter(v => v != null);
    const pr = Object.values(T.prov).filter(o => o.prioritas && o.rasio_el_nino), top = pr.sort((a, b) => b.rasio_el_nino - a.rasio_el_nino)[0];
    return {elNino: rt(ambilG(["2015", "2019", "2023"])) * 100, biasa: rt(ambilG(["2016", "2017", "2020", "2021", "2022", "2024", "2025"])) * 100, th2026: g["2026"] != null ? g["2026"] * 100 : null, rasioMaksProv: top ? [top.nama, top.rasio_el_nino] : null};
  },

  /* ---------- musim 2026: video sebaran. Peta = panggung; label provinsi muncul sesuai tanggal; kontrol menempel di dasar peta ---------- */
  musim() {
    const M = this.D.musim, C = this.D.c, R = C.replay, g = C.grid, ur = M.urutan.map(k => ({...M.prov[k], k})), dasar = (M.dasar || [2015, 2025]).join("–");
    /* sel terbakar diurut menurut hari, jadi tiap bingkai cukup mengiris */
    this.f26 = C.musim26.filter(s => s[2] >= 150 && s[3] >= 3).sort((a, b) => a[2] - b[2]).map(([ix, iy, h, n]) => ({type: "Feature", geometry: {type: "Point", coordinates: [g.x0 + (ix + .5) * g.sel, g.y1 - (iy + .5) * g.sel]}, properties: {h, n}}));
    this.h26 = this.f26.map(f => f.properties.h);
    this.harian = []; this.f26.forEach(f => { const i = Math.max(0, f.properties.h - TL0); this.harian[i] = (this.harian[i] || 0) + 1; });
    this.hmax = Math.max(1, ...this.harian.filter(Boolean));
    const kompleks = ur.flatMap(o => (o.pertama || []).slice(0, 1).map(e => ({...e, prov: o.nama, pk: o.k}))), kmp = Object.fromEntries(kompleks.map(e => [e.pk, e]));
    this.ev = [...ur.filter(o => o.awal_2026_iso && CEN[o.k]).map(o => ({d: doy(o.awal_2026_iso), jenis: "awal", prov: o.nama, pk: o.k, iso: o.awal_2026_iso, selisih: o.selisih_hari, lon: CEN[o.k][0], lat: CEN[o.k][1]})),
      ...kompleks.filter(e => e.lon0 != null).map(e => ({d: doy(e.t0), jenis: "besar", prov: e.prov, pk: e.pk, kab: e.kab, ha: e.ha, t0: e.t0, lon: e.lon0, lat: e.lat0}))].sort((a, b) => a.d - b.d);
    this.DMAX = Math.max(...C.musim26.map(s => s[2])); this.st.hariMusim = this.tf = this.DMAX;
    const f = d => this.px((d - TL0) / (this.DMAX - TL0));
    /* kartu samping: provinsi berurutan menurut awal musim (gantinya grafik dumbbell dan tabel kompleks pertama) */
    const sisi = ur.map(o => { const k = kmp[o.k], s = o.selisih_hari, kt = k ? `Kompleks: ${k.kab} · ${tglP(k.t0)} · ${nf(k.ha)} ha` : "";
      return `<div class="ct-sd" data-pk="${o.k}" data-a="${o.awal_2026_iso ? doy(o.awal_2026_iso) : 9999}" data-b="${k ? doy(k.t0) : 9999}"><i style="background:${WP[o.k] || "#c9503a"}"></i><b>${es(o.nama)}</b><span class="dt">${o.awal_2026_iso ? tglP(o.awal_2026_iso) : "belum mulai"}</span>
        ${s == null ? "" : `<span class="ct-pl ${s < 0 ? "awal" : "lambat"}">${bd(s)}</span>`}${k ? `<small class="kp" title="${es(kt)}">${es(kt)}</small>` : ""}</div>`; }).join("");
    /* penggeser: tanda bulan + penanda bab (awal musim = titik, kompleks besar pertama = api) */
    const tick = [151, 181, 212, 243, 273].filter(d => d <= this.DMAX).map(d => `<i class="ct-scr-t" style="left:${f(d)}"></i><span class="ct-scr-b" style="left:${f(d)}">${hariKe(d)}</span>`).join("");
    const marks = this.ev.map(x => `<i class="ct-mk ${x.jenis}" style="left:${f(x.d)};--c:${WP[x.pk] || "#c9503a"}" data-hari="${x.d}" data-t="${es(x.jenis === "awal" ? `${hariKe(x.d)} · awal musim ${x.prov}` : `${hariKe(x.d)} · kompleks besar ${x.kab || x.prov} (${nf(x.ha)} ha)`)}">${x.jenis === "besar" ? API : ""}</i>`).join("");
    this.urutRe = R.map((r, i) => i).sort((a, b) => R[b].ha - R[a].ha);
    const pilih = `<select data-ubah="peristiwa" aria-label="Lihat peristiwa terbesar"><option value="-1">Lihat peristiwa terbesar</option>${this.urutRe.map(i => `<option value="${i}">${es(R[i].kab || nmP(R[i].prov))} · ${tglID(R[i].t0)} · ${nf(R[i].ha)} ha</option>`).join("")}</select>`;
    return this.bab("Musim 2026", "musim", "Video sebaran api wilayah Indonesia di 2026",
      `<div class="ct-vid" id="ct-vid"><div class="ct-peta" data-peta="musim"></div>
        <div class="ct-ovl" id="ct-ovl"></div>
        <div class="ct-side" id="ct-side"><div class="ct-side-h">Awal musim tiap provinsi</div>${sisi}</div>
        <div class="ct-ft"><div class="ct-cap" id="ct-cap"></div>
          <div class="ct-bar"><button type="button" class="ct-ib" id="ct-btnP" data-aksi="putar"></button><button type="button" class="ct-kec" id="ct-kec" data-aksi="kec" aria-label="Kecepatan putar">1×</button>
            <div class="ct-scr" id="ct-scr" role="slider" tabindex="0" aria-label="Tanggal"><div class="ct-scr-tr"><i class="ct-scr-fill" id="ct-fill"></i></div><div class="ct-nasx">${tick}${marks}</div><i class="ct-scr-head" id="ct-kepala"></i></div>
            <button type="button" class="ct-kec on" id="ct-kam" data-aksi="kam" aria-pressed="true">Kamera otomatis</button><span id="ct-nas">${pilih}</span><span id="ct-re" hidden><button type="button" class="ct-kec lbl" data-aksi="kembali">← Kembali ke Indonesia</button></span></div></div></div>
      <div id="ct-reBawah" hidden><div id="ct-sebarInfo" class="ct-chips satu"></div></div>`,
      {leg: [["background:#1d4e89;border-radius:50%", "label awal musim provinsi"], ["background:#e0663a;clip-path:polygon(50% 0,90% 45%,100% 70%,80% 100%,20% 100%,0 70%,15% 40%)", "label kompleks besar pertama"], ["background:linear-gradient(90deg,#fde7a7,#ef9a4a,#c63b2f,#5c0f1f)", "sel terbakar: makin tua makin baru"]], sumber: "NASA FIRMS VIIRS 2015–2026"});
  },
  ovl(k, d, n) { return `<span class="ct-ov-k">${k}</span><b class="ct-ov-d">${d}</b><span class="ct-ov-n">${n}</span>`; },
  infoSebar() {
    const r = this.D.c.replay[this.st.replay], n = Math.min(this.st.hariRe, r.hari.length), h = r.hari.slice(0, n);
    const ha = h.reduce((a, x) => a + x.sel.length, 0) * 14.06, arah = h.filter(x => x.arah != null);
    const mata = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"], ke = d => mata[Math.round(d / 45) % 8];
    const out = $q("#ct-sebarInfo", this.el); if (!out) return;
    const ov = $q("#ct-ovl", this.el); if (ov) ov.innerHTML = this.ovl(`Hari ${n} dari ${r.hari.length}`, `${tglP(h[n - 1].tgl)} <small>${tgD(h[n - 1].tgl).getFullYear()}</small>`, `<b>${nf(ha)}</b> ha terbakar`);
    out.innerHTML = chip(`${es(r.kab || "")}, ${es(nmP(r.prov))}`, tglID(r.t0)) + chip(`luas sampai hari ke-${n}`, nf(ha) + " ha") + chip("sel awal", r.hari[0].sel.length) + chip("arah pergeseran harian", arah.slice(-4).map(x => ke(x.arah)).join(", ") || "–");
  },

  /* ---------- bab 4: pendorong (belum dibuka) ---------- */
  bab4() {
    const P = this.D.c.angka?.pendorong;
    if (!P) return "";
    const K = P.kelas, r = (f, i) => K[f]?.tabel?.[i];
    const pick = [["gambut", 1, "Di gambut (vs mineral)", "terbakar di lahan gambut, dibanding tanah mineral"], ["malam", 1, "Pertama terlihat malam", "api pertama terdeteksi pada lintasan malam"],
      ["n0", 3, "≥ 5 sel di lintasan pertama (vs 1)", "sudah luas saat pertama terlihat satelit, dibanding 1 sel"], ["frp0", 4, "FRP awal ≥ 50 MW (vs < 5)", "panas api awal sangat tinggi, dibanding api lemah"],
      ["dc", K.dc?.tabel?.length - 1, "DC tertinggi (vs < 100)", "tanah dan gambut sangat kering (indeks kekeringan DC)"], ["hujan24", 2, "Hujan 5–20 mm 24 jam ke depan (vs 0)", "turun hujan dalam 24 jam berikutnya, dibanding tanpa hujan"],
      ["rh_min", 3, "RH minimum ≥ 60% (vs < 40%)", "udara lembap, dibanding udara kering"], ["ws", 2, "Angin 15–20 km/jam (vs < 10)", "angin sedang-kencang, dibanding angin pelan"],
      ["jalan_km", 3, "≥ 10 km dari jalan (vs < 1)", "lokasi jauh dari jalan, dibanding dekat jalan"], ["desa_km", 3, "≥ 6 km dari desa (vs < 1)", "lokasi jauh dari desa, dibanding dekat desa"],
      ["kanal_km", 3, "Kanal ≥ 3 km per sel (vs tanpa)", "banyak kanal/parit di sekitar, dibanding tanpa kanal"], ["bekas", 1, "Bekas terbakar 1–3 th (vs belum)", "lahan terbakar 1–3 tahun sebelumnya, dibanding belum"],
      ["lereng", 3, "Lereng ≥ 8% (vs < 1%)", "lereng curam, dibanding lahan datar"], ["oni", 3, "El Niño ≥ 1 (vs La Niña)", "tahun El Niño kuat, dibanding tahun La Niña"]].filter(([f, i]) => r(f, i)?.rasio != null);
    const IK = {gambut: '<path d="M5 19c8 0 14-6 14-14C11 5 5 11 5 19zM5 19l7-7"/>', malam: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', n0: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
      frp0: '<path d="M12 3c1.5 3.3 5 5.3 5 9.6a5 5 0 0 1-10 0c0-2 .9-3.5 2.2-4.7.2 1.7 1.2 2.7 2.2 3C10.6 8.3 11.2 5.6 12 3z"/>', dc: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M4 4l16 16"/>', hujan24: '<path d="M7 15a5 5 0 1 1 1-9.9A6 6 0 0 1 19 8a4 4 0 0 1-1 7.9"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>',
      rh_min: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', ws: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>', jalan_km: '<path d="M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v2"/>', desa_km: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
      kanal_km: '<path d="M3 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/>', bekas: '<path d="M4 20h16M7 20l2-7 3 3 3-6 2 10"/>', lereng: '<path d="M3 20 10 8l4 6 3-4 4 10z"/>', oni: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>'};
    const data = pick.map(([f, i, l, ket]) => ({l, ket, ik: IK[f], v: r(f, i).rasio, w: r(f, i).rasio >= 1 ? "#c9503a" : "#2b8c86", t: nf(r(f, i).rasio, 1) + "×",
      tip: `<b>${l}</b><br>Lolos: ${pc(r(f, i).laju, 1)} (n = ${nf(r(f, i).n)})<br>Acuan: ${pc(K[f].tabel[0].laju, 1)}`})).sort((a, b) => b.v - a.v);
    const imp = P.gbdt.permutasi.slice(0, 8).map(x => ({l: x.nama, v: Math.max(0, x.turun_auc), t: nf(x.turun_auc, 3), w: NAVY, tip: `<b>${x.nama}</b><br>Kontribusi ke model: ${nf(x.turun_auc, 3)}`}));
    const A = P.arah, rn0 = r("n0", 3)?.rasio ?? data[0]?.v;
    const lain = [["gambut", 1, "gambut"], ["oni", 3, "El Niño"], ["malam", 1, "terdeteksi malam hari"]].filter(([f, i]) => r(f, i)?.rasio > 1).map(([f, i, n]) => `${n} (${hl(nf(r(f, i).rasio, 1) + "×")})`);
    const daftar = lain.length > 1 ? lain.slice(0, -1).join(", ") + " dan " + lain.at(-1) : lain[0];
    return this.bab("Pendorong", "dorong", `Api yang sejak awal sudah besar ${hl(nf(rn0, 0) + " kali")} lebih mungkin membesar${daftar ? `; ${daftar} juga menaikkan peluang` : ""}`,
      `<div class="ct-sub2"><span>Berapa kali lebih mungkin api membesar dibanding kelompok pembandingnya (teks di dalam kurung)</span><em>${nf(P.n_lolos)} dari ${nf(P.n_peristiwa)} titik api membesar · ${pc(P.laju_dasar, 1)}</em></div>
      ${hbatang(data, {label: "rasio peluang membesar", garis: 1, garisT: "1× = sama", ml: 440})}
      `,
      {leg: [["#c9503a", "menaikkan peluang membesar"], ["#2b8c86", "menurunkan"]], sumber: "NASA FIRMS VIIRS 2015–2026, ERA5, SRTM"});
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
    if (id === "musim") { const m = this.peta.musim = peta(box, [113, -2], 3.6); if (!m) return; m.siap.then(() => { m.sedia = true; this.fit(0); this.labelPeta(m); this.gambarPeta(true); }); }
    if (id === "uji-obs" || id === "uji-pred") { this.peta[id] = peta(box, [113, -2], 11); this.gambarKasus(); }
  },
  pad() { const w = innerWidth > 760; return {top: w ? 24 : 96, left: w ? 96 : 40, bottom: w ? 130 : 190, right: w ? 280 : 24}; },
  fit(ms) { /* seluruh Indonesia; ruang kosong untuk kartu samping (kanan) dan kontrol (bawah) */
    const m = this.peta.musim; if (!m) return; this.zoom = false;
    m.fitBounds([[94.5, -11.5], [141.5, 6.7]], {padding: this.pad(), duration: ms});
  },
  kamera(x) { const m = this.peta.musim; if (!this.kam || !m?.sedia || this.st.mode !== "nas") return; this.zoom = true; const q = this.pad(); m.easeTo({center: [x.lon, x.lat], zoom: x.jenis === "besar" ? 6.2 : 5.2, offset: [(q.left - q.right) / 2, (q.top - q.bottom) / 2], duration: 1500}); },
  labelPeta(m) { /* penanda bernama: titik kecil selalu ada; kartu nama hanya untuk 3 peristiwa terbaru, ditata agar tidak bertumpuk */
    this.lb = this.ev.map(x => {
      const el = document.createElement("div"), judul = x.jenis === "awal" ? x.prov + " · awal musim " + tglP(x.iso) : (x.kab || x.prov) + ", " + x.prov + " · " + nf(x.ha) + " ha";
      el.className = "ct-lbw"; x.l1 = x.jenis === "awal" ? x.prov : x.kab || x.prov; x.l2 = x.jenis === "awal" ? "Awal musim · " + tglP(x.iso) : x.prov + " · " + nf(x.ha) + " ha";
      el.innerHTML = `<div class="ct-lb ${x.jenis}" style="--c:${WP[x.pk] || "#c9503a"}"><i class="ln"></i><span class="pin" title="${es(judul)}">${x.jenis === "besar" ? API : ""}</span><span class="tx"><b>${es(x.l1)}</b><small>${es(x.l2)}</small></span></div>`;
      new maplibregl.Marker({element: el, anchor: "center"}).setLngLat([x.lon, x.lat]).addTo(m);
      return el.firstChild; });
    m.on("moveend", () => this.susun());
    this.infoMusim();
  },
  susun() { /* tata letak kartu nama: coba 8 arah x 3 jarak, ambil yang tidak menabrak kartu lain / kartu samping / kontrol; garis penunjuk ke titiknya */
    const m = this.peta.musim; if (!m?.sedia || !this.lb) return;
    const c = m.getContainer(), W = c.clientWidth, H = c.clientHeight, wide = innerWidth > 760;
    const pakai = [[0, 0, 210, 130], [0, H - 112, W, H], ...(wide ? [[W - 272, 0, W, H]] : [])], ada = [];
    const tabrak = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    this.lb.forEach((l, i) => { if (!this.penuh.includes(i)) l.classList.remove("full"); });
    [...this.penuh].reverse().forEach(i => {
      const x = this.ev[i], l = this.lb[i], p = m.project([x.lon, x.lat]), w = Math.max(x.l1.length * 7.4, x.l2.length * 6.1) + 22, h = 38; let pilih = null;
      loop: for (const dist of [24, 56, 92]) for (const [dx, dy] of [[1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]]) {
        const rx = dx > 0 ? dist : dx < 0 ? -dist - w : -w / 2, ry = dy > 0 ? dist : dy < 0 ? -dist - h : -h / 2, b = [p.x + rx, p.y + ry, p.x + rx + w, p.y + ry + h];
        if (!pilih) pilih = [rx, ry];
        if (b[0] < 4 || b[1] < 4 || b[2] > W - 4 || b[3] > H - 4 || pakai.some(q => tabrak(b, q)) || ada.some(q => tabrak(b, q))) continue;
        pilih = [rx, ry]; ada.push(b); break loop; }
      const [rx, ry] = pilih, tx = Math.max(rx, Math.min(0, rx + w)), ty = Math.max(ry, Math.min(0, ry + h)), len = Math.hypot(tx, ty), t = $q(".tx", l), ln = $q(".ln", l);
      t.style.left = rx + "px"; t.style.top = ry + "px"; ln.style.width = len + "px"; ln.style.transform = `rotate(${Math.atan2(ty, tx)}rad)`;
      l.classList.add("full"); l.parentNode.style.zIndex = 3; });
    this.lb.forEach((l, i) => { if (!this.penuh.includes(i)) l.parentNode.style.zIndex = 1; });
  },
  gambarPeta(pusat) { this.st.mode === "re" ? this.gambarSebar(pusat) : this.gambarMusim(); },
  vis(m, ids, v) { for (const id of ids) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", v); },
  nSel(d) { const h = this.h26; let a = 0, b = h.length; while (a < b) { const t = (a + b) >> 1; h[t] <= d ? a = t + 1 : b = t; } return a; },
  gambarMusim() {
    const m = this.peta.musim, d = this.st.hariMusim;
    this.infoMusim();
    if (!m?.sedia) return;
    const dt = fc(this.f26.slice(0, this.nSel(d))), umur = ["-", d, ["get", "h"]];
    const warna = ["interpolate", ["linear"], umur, 0, "#fff6c2", 4, "#ffc233", 14, "#f0701f", 35, "#b92a1c", 80, "#5a1712"];
    const r = (a, b, c) => ["interpolate", ["linear"], ["zoom"], 3, ["interpolate", ["linear"], ["get", "n"], 3, a, 300, a * 3.4], 6, ["interpolate", ["linear"], ["get", "n"], 3, b, 300, b * 2.4], 9, c];
    if (!m.getSource("gelap")) { /* basemap digelapkan sedikit supaya api menonjol, seperti citra satelit malam */
      m.addSource("gelap", {type: "geojson", data: {type: "Feature", geometry: {type: "Polygon", coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]]}}});
      m.addLayer({id: "gelap", type: "fill", source: "gelap", paint: {"fill-color": "#0a1226", "fill-opacity": .42}}); }
    setSumber(m, "musim", dt, [{id: "musim-glow", type: "circle", paint: {"circle-radius": r(1.6, 4, 16), "circle-blur": 1, "circle-opacity": .4, "circle-color": warna}},
      {id: "musim", type: "circle", paint: {"circle-radius": r(.8, 2.5, 8), "circle-color": warna, "circle-opacity": .92}}]);
    m.setPaintProperty("musim", "circle-color", warna); m.setPaintProperty("musim-glow", "circle-color", warna);
  },
  px: f => `calc(8px + (100% - 16px) * ${f})`,
  hitung(el, n) { /* angka berjalan naik/turun ke nilai baru */
    cancelAnimationFrame(this.rc); const a = this.nTampil, t0 = performance.now();
    const f = now => { const k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3); this.nTampil = a + (n - a) * e; el.textContent = nf(Math.round(this.nTampil)); if (k < 1) this.rc = requestAnimationFrame(f); }; f(t0);
  },
  spark(d) { /* sel baru per hari sampai hari ini (bayangan = seluruh musim) */
    const N = this.DMAX - TL0 + 1, H = 30, y = i => (H - 1 - (H - 4) * Math.sqrt((this.harian[i] || 0) / this.hmax)).toFixed(1), n = Math.max(0, Math.min(N - 1, Math.floor(d) - TL0));
    const all = Array.from({length: N}, (_, i) => `${i},${y(i)}`), sd = all.slice(0, n + 1);
    return `<svg class="ct-sp" viewBox="0 0 ${N - 1} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${all.join(" ")}" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="1.2" vector-effect="non-scaling-stroke"/><polygon points="0,${H} ${sd.join(" ")} ${n},${H}" fill="#e58a45" fill-opacity=".35"/><polyline points="${sd.join(" ")}" fill="none" stroke="#e0663a" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  },
  infoMusim() { /* kartu tanggal, label peta, daftar samping, keterangan; dipanggil tiap ganti hari */
    if (this.st.mode !== "nas") return;
    const d = this.st.hariMusim, e = this.el, o = $q("#ct-ovl", e);
    if (o) { o.innerHTML = this.ovl("Sebaran titik api", `${hariKe(d)} <small>2026</small>`, `<b id="ct-cnt"></b> sel terbakar sejak ${hariKe(TL0)}`) + this.spark(d); this.hitung($q("#ct-cnt", e), this.nSel(d)); }
    const on = [];
    this.ev.forEach((x, i) => { const a = d - x.d, l = this.lb?.[i]; if (a >= 0 && (x.jenis === "besar" || a < 10)) on.push(i);
      if (l) { l.classList.toggle("on", a >= 0); l.classList.toggle("baru", a >= 0 && a < 10); } });
    this.penuh = on.slice(-3); this.susun();
    const lalu = this.ev.filter(x => x.d <= d).at(-1);
    e.querySelectorAll(".ct-sd").forEach(r => { const a = d - r.dataset.a; r.classList.toggle("on", a >= 0); r.classList.toggle("baru", a >= 0 && a < 10); r.classList.toggle("kmp", d >= +r.dataset.b); r.classList.toggle("kini", !!lalu && r.dataset.pk === lalu.pk); });
    const kini = $q(".ct-sd.kini", e), sd = $q("#ct-side", e);
    if (kini !== this.rowKini) { this.rowKini = kini; if (kini && sd) sd.scrollTo({top: Math.max(0, kini.offsetTop - 44), behavior: "smooth"}); }
    this.setCap(this.caption(d));
  },
  caption(d) { /* kalimat peristiwa terakhir yang sudah dilewati */
    const sudah = this.ev.filter(x => x.d <= d);
    if (!sudah.length) return `<b>${hariKe(d)} 2026</b><span>Belum ada provinsi yang memulai musim</span>`;
    const dd = sudah.at(-1).d, tx = x => x.jenis === "awal" ? `Awal musim di ${es(x.prov)}${x.selisih != null ? ` (${bd(x.selisih)} dari median)` : ""}` : `Kompleks besar pertama di ${es(x.kab)}, ${es(x.prov)} (${nf(x.ha)} ha)`;
    return `<b>${hariKe(dd)} 2026</b><span>${sudah.filter(x => x.d === dd).map(tx).join("; ")}</span>`;
  },
  setCap(h) { const c = $q("#ct-cap", this.el); if (!c || h === this.capTxt) return; this.capTxt = h; c.innerHTML = h; c.classList.remove("ganti"); void c.offsetWidth; c.classList.add("ganti"); },
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
      if (pusatkan) { this.vis(m, ["sebar", "sebar-arah-l", "sebar-arah", "sebar-awal"], "visible"); this.vis(m, ["musim", "musim-glow"], "none");
        const xs = r.hari.flatMap(h => h.sel.map(pusatSel)); const b = xs.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [180, 90, -180, -90]);
        m.fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding: {top: 100, left: 40, right: 40, bottom: 150}, duration: 900, maxZoom: 12}); }
    }
    this.infoSebar();
  },

  /* ---------- interaksi ---------- */
  ubah(e) {
    const t = e.target, k = t.dataset.ubah; if (!k) return;
    if (k === "peristiwa") { if (e.type === "input") return; return +t.value < 0 ? this.kembali() : this.masukRe(+t.value); }
    if (k === "kasus") { this.pilihKasus(+t.value); }
  },
  pilihKasus(i) { this.st.kasus = i; this.el.querySelectorAll("tr[data-kasus]").forEach(tr => tr.classList.toggle("on", +tr.dataset.kasus === i));
    const s = this.el.querySelector('[data-ubah="kasus"]'); if (s) s.value = i; this.gambarKasus(); },
  rentang() { return this.st.mode === "re" ? [1, this.D.c.replay[this.st.replay].hari.length] : [TL0, this.DMAX]; },
  set(v) { /* posisi video (boleh pecahan); gambar ulang peta hanya saat harinya berganti */
    const re = this.st.mode === "re", [lo, hi] = this.rentang(), k = re ? "hariRe" : "hariMusim";
    this.tf = Math.max(lo, Math.min(hi, v));
    const i = Math.floor(this.tf + 1e-9);
    if (i !== this.st[k]) { this.st[k] = i; re ? this.gambarSebar(false) : this.gambarMusim(); }
    this.kepala();
  },
  kepala() { const [lo, hi] = this.rentang(), f = hi > lo ? (this.tf - lo) / (hi - lo) : 0, h = $q("#ct-kepala", this.el), l = $q("#ct-fill", this.el);
    if (h) h.style.left = this.px(f); if (l) l.style.width = f * 100 + "%";
    $q("#ct-scr", this.el)?.setAttribute("aria-valuetext", this.st.mode === "re" ? `hari ${this.st.hariRe}` : hariKe(this.st.hariMusim) + " 2026"); },
  putar() { /* putar / jeda; di ujung, putar ulang dari awal. Di mode nasional berhenti ~1,5 dtk tiap ada peristiwa */
    if (this.raf) return this.henti();
    const [lo, hi] = this.rentang(); if (hi <= lo) return;
    if (this.tf >= hi - 1e-6) this.set(lo);
    const nas = this.st.mode === "nas"; this.tahan = 0;
    if (nas) { this.dJeda = Math.floor(this.tf); if (this.zoom) this.fit(600); }
    let t0 = performance.now();
    const f = now => {
      if (!this.el.isConnected || !$q("#ct-vid", this.el)?.offsetParent) return this.henti();
      if (now < this.tahan) { t0 = now; this.raf = requestAnimationFrame(f); return; }
      if (this.tahan) { this.tahan = 0; $q("#ct-cap", this.el)?.classList.remove("sorot"); if (this.zoom) this.fit(1200); }
      this.set(this.tf + Math.min(.1, (now - t0) / 1000) * (nas ? 1.4 : 2.2) * KEC[this.ki]); t0 = now;
      if (nas) { const d = Math.floor(this.tf), e = d !== this.dJeda ? this.ev.filter(x => x.d === d) : [];
        if (d !== this.dJeda) this.dJeda = d;
        if (e.length) { this.tahan = now + 1500; $q("#ct-cap", this.el)?.classList.add("sorot"); this.kamera(e.at(-1)); } }
      if (this.tf >= hi - 1e-6 && !this.tahan) return this.henti();
      this.raf = requestAnimationFrame(f);
    };
    this.raf = requestAnimationFrame(f); this.tombol();
  },
  henti() { cancelAnimationFrame(this.raf); this.raf = 0; this.tahan = 0; $q("#ct-cap", this.el)?.classList.remove("sorot"); this.tombol(); },
  tombol() { const b = $q("#ct-btnP", this.el); if (b) { b.innerHTML = this.raf ? JEDA : PUTAR; b.setAttribute("aria-label", this.raf ? "Jeda" : "Putar"); } },
  pasangScr() { /* penggeser buatan sendiri: seret, klik penanda, panah kiri/kanan, spasi */
    const s = $q("#ct-scr", this.el); if (!s) return;
    const lihat = ev => { const b = s.getBoundingClientRect(), [lo, hi] = this.rentang(); this.set(lo + Math.max(0, Math.min(1, (ev.clientX - b.left - 8) / (b.width - 16))) * (hi - lo)); };
    s.onpointerdown = ev => { this.henti(); const mk = ev.target.closest("[data-hari]"); if (mk) return this.set(+mk.dataset.hari); s.setPointerCapture(ev.pointerId); this.seret = true; lihat(ev); };
    s.onpointermove = ev => { if (this.seret) lihat(ev); };
    s.onpointerup = s.onpointercancel = () => { this.seret = false; };
    s.onkeydown = ev => { const k = {ArrowLeft: -1, ArrowRight: 1}[ev.key]; if (k) { this.henti(); this.set(Math.round(this.tf) + k); } else if (ev.key === " ") this.putar(); else return; ev.preventDefault(); };
  },
  tampilMode() { const re = this.st.mode === "re"; $q("#ct-vid", this.el)?.classList.toggle("re", re);
    for (const [id, h] of [["ct-nas", re], ["ct-re", !re], ["ct-reBawah", !re]]) { const x = $q("#" + id, this.el); if (x) x.hidden = h; } },
  masukRe(i) {
    this.henti(); const r = this.D.c.replay[i], st = this.st, n = r.hari.length;
    st.mode = "re"; st.replay = i; st.hariRe = 1; this.tf = 1;
    const rank = this.urutRe.indexOf(i), ak = r.hari.at(-1).tgl;
    this.capTxt = null; this.setCap(`<b>${rank === 0 ? "Peristiwa terbesar" : "Peristiwa besar"}</b> · ${es(r.kab || nmP(r.prov))}, ${tglP(r.t0)}–${tglID(ak)} · ${nf(r.ha)} ha dalam ${n} hari`);
    this.tampilMode(); this.gambarSebar(true); this.kepala();
    if (n > 1) this.putar();
  },
  kembali() {
    this.henti(); this.st.mode = "nas"; const s = $q('select[data-ubah="peristiwa"]', this.el); if (s) s.value = -1; this.tampilMode();
    const m = this.peta.musim; this.tf = this.st.hariMusim; this.capTxt = null;
    if (m?.sedia) { this.vis(m, ["sebar", "sebar-arah-l", "sebar-arah", "sebar-awal"], "none"); this.vis(m, ["musim", "musim-glow"], "visible"); this.fit(900); }
    this.gambarMusim(); this.kepala();
  },
  klik(e) {
    const a = e.target.closest("[data-aksi]"), tr = e.target.closest("tr[data-kasus]");
    if (tr) return this.pilihKasus(+tr.dataset.kasus);
    if (!a) return;
    const z = a.dataset.aksi;
    if (z === "putar") this.putar();
    if (z === "kec") { this.ki = (this.ki + 1) % KEC.length; a.textContent = kc(KEC[this.ki]) + "×"; }
    if (z === "kam") { this.kam = !this.kam; a.classList.toggle("on", this.kam); a.setAttribute("aria-pressed", this.kam); if (!this.kam && this.zoom) this.fit(900); }
    if (z === "kembali") this.kembali();
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

/* bagikan bab cerita (peta bergerak tidak bisa jadi gambar): lembar bagikan tautan ke bab itu */
document.addEventListener("click", e => { const b = e.target.closest?.("[data-ctbagi]"); if (!b) return;
  const h = b.closest(".ct-bab")?.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() || "Pantau Bencana";
  const url = location.origin + "/insight#ct-" + b.dataset.ctbagi;
  if (window.Bagi?.buka) window.Bagi.buka({judul: h, teks: h + ". " + (window.T ? T("Lihat di Pantau Bencana:") : "Lihat di Pantau Bencana:"), url, kampanye: "cerita"});
  else if (navigator.share) navigator.share({title: h, url}).catch(() => {}); else navigator.clipboard?.writeText(url); });

/* rekam bab peta bergerak (Musim 2026) jadi video 1080×1350: kanvas peta + tanggal, angka, judul, merek; diputar dari awal sampai selesai */
Cerita.rekamVideo = async function (onProg) {
  const m = this.peta.musim, src = m?.getCanvas?.(); if (!src || !window.MediaRecorder) throw new Error("Perekaman video tidak didukung peramban ini");
  const W = 1080, H = 1350, cv = Object.assign(document.createElement("canvas"), {width: W, height: H}), x = cv.getContext("2d");
  const tipe = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(t => MediaRecorder.isTypeSupported(t));
  const rek = new MediaRecorder(cv.captureStream(30), {mimeType: tipe, videoBitsPerSecond: 6e6}), bag = [];
  rek.ondataavailable = e => e.data.size && bag.push(e.data);
  const judul = $q("#ct-musim h3", this.el)?.textContent.trim() || "Sebaran api 2026", tx = s => (s || "").replace(/\s+/g, " ").trim();
  const logo = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = "/img/logo.svg?v=2"; });
  const bungkus = (t, maks) => { const k = t.split(" "), out = []; let l = ""; for (const w of k) { if (x.measureText(l + w).width > maks && l) { out.push(l.trim()); l = ""; } l += w + " "; } out.push(l.trim()); return out.slice(0, 3); };
  const gambar = () => {
    const g = x.createLinearGradient(0, 0, W, 300); g.addColorStop(0, "#1d4e89"); g.addColorStop(1, "#0b2545");
    x.fillStyle = "#eef2f7"; x.fillRect(0, 0, W, H); x.fillStyle = g; x.fillRect(0, 0, W, 300);
    if (logo) x.drawImage(logo, 60, 50, 64, 64);
    x.fillStyle = "#fff"; x.font = "800 30px Inter, sans-serif"; x.fillText("Pantau Bencana · Karhutla", 140, 84);
    x.font = "800 46px Inter, sans-serif"; bungkus(judul, W - 120).forEach((l, i) => x.fillText(l, 60, 175 + i * 54));
    /* peta, dipotong cover ke kotak 960×860 */
    const bx = 60, by = 330, bw = 960, bh = 860, s = Math.max(bw / src.width, bh / src.height), sw = bw / s, sh = bh / s;
    x.save(); x.beginPath(); x.roundRect(bx, by, bw, bh, 24); x.clip();
    x.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, bx, by, bw, bh); x.restore();
    /* kartu tanggal & angka dari overlay halaman */
    const ov = $q("#ct-ovl", this.el), d = tx(ov?.querySelector(".ct-ov-d")?.textContent), n = tx(ov?.querySelector(".ct-ov-n")?.textContent);
    x.fillStyle = "rgba(255,255,255,.94)"; x.beginPath(); x.roundRect(bx + 24, by + 24, 360, 150, 18); x.fill();
    x.fillStyle = "#0b2545"; x.font = "800 56px Inter, sans-serif"; x.fillText(d, bx + 48, by + 98); x.font = "600 24px Inter, sans-serif"; x.fillStyle = "#4a5a72"; x.fillText(n, bx + 48, by + 144);
    x.fillStyle = "#0b2545"; x.font = "700 28px Inter, sans-serif"; x.fillText("pantau.terasurban.com", 60, H - 70);
    x.fillStyle = "#4a5a72"; x.font = "500 22px Inter, sans-serif"; x.textAlign = "right"; x.fillText("Sumber: NASA FIRMS VIIRS", W - 60, H - 70); x.textAlign = "left";
  };
  const [lo] = this.rentang(); this.henti(); this.set(lo); await new Promise(r => setTimeout(r, 600));
  rek.start(500); let jalan = true;
  const loop = () => { if (!jalan) return; gambar(); onProg?.(); requestAnimationFrame(loop); }; loop();
  await new Promise(r => setTimeout(r, 400)); this.putar();
  await new Promise(r => { const t = setInterval(() => { if (!this.raf) { clearInterval(t); setTimeout(r, 1200); } }, 300); });
  jalan = false; rek.stop(); await new Promise(r => rek.onstop = r);
  return new File([new Blob(bag, {type: tipe})], `sebaran-api-2026.${tipe.startsWith("video/mp4") ? "mp4" : "webm"}`, {type: tipe.split(";")[0]});
};
document.addEventListener("click", async e => { const b = e.target.closest?.("[data-ctvideo]"); if (!b || b.disabled) return;
  const t0 = b.innerHTML; b.disabled = true; b.innerHTML = "Merekam video…";
  try { const f = await Cerita.rekamVideo();
    if (navigator.canShare?.({files: [f]})) await navigator.share({files: [f], title: f.name}).catch(() => {});
    else { const a = Object.assign(document.createElement("a"), {href: URL.createObjectURL(f), download: f.name}); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  } catch (err) { alert(err.message); } finally { b.disabled = false; b.innerHTML = t0; } });
