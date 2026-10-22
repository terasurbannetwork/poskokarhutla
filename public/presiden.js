"use strict";
/* /presiden: satu fetch ke /data/presiden/semua.json, kartu Insight dari skema widget (docs/presiden/KONTRAK.md).
   ?w=<id> = satu widget tanpa kepala untuk iframe; tinggi dilaporkan ke induk lewat postMessage. */
const ID = new URLSearchParams(location.search).get("w") || null;
const WARNA = ["var(--f3)", "var(--f2)", "var(--brand2)", "var(--info)"];
const tgl = iso => { const d = new Date(iso); if (/T23:59|^\d{4}-\d\d-\d\d$/.test(iso)) return isNaN(d) ? "–" : d.toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}); return isNaN(d) ? "–" : d.toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}).replace(",", "").replace(/(\d\d):(\d\d)$/, "$1.$2") + " WIB"; };
const lab = v => fmt(v);
const pl = (t, w = "var(--brand2)") => `<span class="pl" style="--w:${w}">${esc(t)}</span>`;
const sorot = s => esc(s).replace(/\[\[(.+?)\]\]/g, (_, x) => Kartu.hl(x));
const kunci = a => {
  const b = Math.abs(a.ubah), u = a.ubah == null ? "" : `, ${a.ubah > 0 ? "naik" : a.ubah < 0 ? "turun" : "tetap"}${a.ubah ? " " + fmt(b >= 100 ? Math.round(b) : b) + "%" : ""}`;
  const n = a.tampil ?? `${fmt(a.nilai)}${a.satuan ? (a.satuan.startsWith("%") ? "" : " ") + a.satuan : ""}`;   /* tampil = teks jadi untuk perkiraan ("sekitar 85 juta orang") */
  return pl(`${a.label} ${n}${u}`, a.ubah > 0 ? "var(--bad)" : a.ubah < 0 ? "var(--ok)" : "var(--brand2)");
};

/* grafik batang (tegak bila label pendek dan sedikit, selain itu mendatar) dan garis; angka di ujung batang, total di atasnya */
function grafik(g, W) {
  const n = g.label.length, S = g.seri, tot = g.label.map((_, i) => S.reduce((a, s) => a + (s.nilai[i] || 0), 0));
  const m = Math.max(1, ...(g.jenis === "garis" ? S.flatMap(s => s.nilai.map(v => v || 0)) : tot)), t = (x, y, s, a = "middle", ekstra = "") => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="11" ${ekstra}>${esc(s)}</text>`;
  const gris = (c, i, y, h, x, w) => `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(0, h)}" rx="3" style="fill:${c}"/>`;
  let h, isi = "";
  if (g.jenis === "garis") {
    h = 170; const P = 22, B = 26, X = i => 14 + (n < 2 ? (W - 28) / 2 : i / (n - 1) * (W - 28)), Y = v => h - B - (v || 0) / m * (h - B - P), skip = Math.ceil(n / Math.max(2, Math.min(6, Math.floor(W / 70))));
    S.forEach((s, k) => { const c = WARNA[k % 4], pts = s.nilai.map((v, i) => `${X(i)},${Y(v)}`).join(" "), mx = Math.max(...s.nilai.map(v => v || 0));
      isi += `<polyline points="${pts}" fill="none" stroke-width="2.2" stroke-linejoin="round" style="stroke:${c}"/>` + s.nilai.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3" style="fill:${c}"/>` + (n <= 8 || i === n - 1 || v === mx ? t(Math.min(W - 14, Math.max(14, X(i))), Y(v) - 8, lab(v), "middle", 'font-weight="700"') : "")).join(""); });
    isi += g.label.map((l, i) => (i % skip === 0 && n - 1 - i >= skip) || i === n - 1 ? t(X(i), h - 8, l, i === 0 ? "start" : i === n - 1 ? "end" : "middle", 'style="fill:var(--ink2)"') : "").join("");
  } else if (n <= 12 && Math.max(...g.label.map(l => String(l).length)) <= 7) {
    h = 190; const P = 22, B = 26, bw = W / n, w = Math.min(52, bw * .62);
    g.label.forEach((l, i) => { let y = h - B; const x = i * bw + (bw - w) / 2;
      S.forEach((s, k) => { const v = s.nilai[i] || 0, hh = v / m * (h - B - P); y -= hh; isi += gris(WARNA[k % 4], k, y, hh, x, w) + (S.length > 1 && hh >= 15 ? t(x + w / 2, y + hh / 2 + 4, lab(v), "middle", 'font-weight="700" style="fill:#fff"') : ""); });
      isi += t(x + w / 2, y - 6, lab(tot[i]), "middle", 'font-weight="700"') + t(x + w / 2, h - 8, l, "middle", 'style="fill:var(--ink2)"'); });
  } else {
    const rh = 26, L = Math.min(150, W * .38), R = 54; h = n * rh;
    g.label.forEach((l, i) => { let x = L; const y = i * rh, mx = Math.floor(L / 6.4);
      isi += t(L - 8, y + 17, String(l).length > mx ? String(l).slice(0, mx - 1) + "…" : l, "end", 'font-weight="600"');
      S.forEach((s, k) => { const ww = (s.nilai[i] || 0) / m * (W - L - R); isi += gris(WARNA[k % 4], k, y + 5, rh - 10, x, ww); x += ww; });
      isi += t(x + 6, y + 17, lab(tot[i]), "start", 'font-weight="700"'); });
  }
  return `<svg viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${esc(g.satuan || "")}">${isi}</svg>`;
}

const sel = (k, v) => v == null ? "–" : k.jenis === "angka" ? fmt(v) : k.jenis === "persen" ? fmt(v) + "%" : k.jenis === "pill" ? pl(v) : esc(v);
function tabel(w) {
  const K = w.kolom, num = k => k.jenis === "angka" || k.jenis === "persen";
  return `<div class="tw"><table><thead><tr>${K.map(k => `<th${num(k) ? ' class="n"' : ""}>${esc(k.label)}</th>`).join("")}</tr></thead><tbody>${w.baris.map(b =>
    `<tr>${K.map(k => `<td class="${num(k) ? "n" : "t"}"${k.jenis === "teks" && b[k.k] != null ? ` title="${esc(b[k.k])}"` : ""}>${sel(k, b[k.k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function kartu(w) {
  const kosong = w.status === "kosong", basi = w.status === "basi";   /* basi: kartu diredupkan + tanggal data (pemilik 22 Okt) */
  const tl = w.tindak_lanjut?.length ? `<div class="pr-tl"><span class="lbl">Tindak lanjut</span>${w.tindak_lanjut.map(x => `<div>${pl(x.siapa, "var(--brand2)")}<span>${esc(x.apa)}</span></div>`).join("")}</div>` : "";
  const g = !kosong && w.grafik?.label?.length ? w.grafik : null;
  if (g && g.seri.length > 1) Kartu.leg(g.seri.map((s, i) => [WARNA[i % 4], esc(s.nama)]));
  const isi = (kosong ? `<div class="pr-kosong">Belum ada data</div>` : "") + (g ? `<div class="pr-gr"><div class="pr-sat">${esc(g.satuan || "")}</div><div data-g="${esc(w.id)}"></div></div>` : "")
    + (!kosong && w.baris?.length ? tabel(w) : "") + tl + (w.catatan ? `<p class="pr-cat">${esc(w.catatan)}</p>` : "");
  const angka = !kosong && w.angka?.length ? `<div class="pr-angka">${w.angka.map(kunci).join("")}</div>` : "";
  return Kartu.ex(sorot(w.judul) + "", "", "", isi, "Sumber: " + esc(w.sumber || "–"))
    .replace('<span class="ex-ey"></span>', () => `<div class="pr-ey"><span class="ex-ey">${esc(w.label)}</span>${basi ? pl(w.per ? "Data terakhir " + tgl(w.per.slice(0, 10) + "T23:59+07:00") : "Data lama", "var(--warn)") : ""}</div>`)
    .replace("</header>", () => angka + "</header>")
    .replace("</footer>", () => w.per ? `<span class="per">Per ${tgl(w.per)}</span></footer>` : "</footer>")
    .replace("<article", () => `<article data-w="${esc(w.id)}"${basi ? " data-basi" : ""}`);
}

let W = [], WM = new Map();
function grafikSemua() {
  const els = [...document.querySelectorAll("[data-g]")], lebar = els.map(e => Math.floor(e.clientWidth));   /* fase baca, lalu tulis */
  els.forEach((e, i) => { const w = WM.get(e.dataset.g); if (w && lebar[i] > 0) try { e.innerHTML = grafik(w.grafik, lebar[i]); } catch (x) { e.innerHTML = ""; } });
}
function tampil(j) {
  const baru = Array.isArray(j) ? j : j.widget || j.widgets || Object.values(j).filter(x => x && x.id);
  const pilih = ID ? baru.filter(w => w.id === ID) : baru, y = scrollY;
  /* satu widget cacat jadi kartu pesan; kartu lain tetap tampil */
  const aman = w => { try { return kartu(w); } catch (e) { Kartu.leg([]); return `<article class="ex" data-w="${esc(w.id)}"><div class="kosong">Data ${esc(w.label || w.id)} sedang bermasalah.</div></article>`; } };
  $("#insight").innerHTML = pilih.length ? pilih.map(aman).join("") : `<div class="kosong">${ID ? "Widget tidak ditemukan." : "Belum ada data."}</div>`;
  W = baru; WM = new Map(W.map(w => [w.id, w]));
  const dibuat = j.dibuat || j.per || W.map(w => w.per).filter(Boolean).sort().pop();
  $("#upd").textContent = dibuat ? "Diperbarui " + tgl(dibuat) : "";
  grafikSemua(); if (y) scrollTo(0, y);   /* pembaruan data tidak melempar pembaca ke atas */
}
let lastW = innerWidth, lastH = 0, lastTeks = "";
async function muat() {
  if (ID === "peta") return;
  try {
    const r = await fetch("/data/presiden/semua.json", {signal: AbortSignal.timeout?.(15000)}); if (!r.ok) throw 0;
    const t = await r.text(); if (t === lastTeks) return;   /* sama = tidak render ulang */
    if (lastTeks && Pt.peta) return location.reload();   /* data baru saat peta terbuka: peta dan legenda ikut segar */
    tampil(JSON.parse(t)); lastTeks = t; if (!Pt.peta) nanti(() => "requestIdleCallback" in window ? requestIdleCallback(() => Pt.ambil().catch(() => {}), {timeout: 3000}) : setTimeout(() => Pt.ambil().catch(() => {}), 1500));
  }
  catch (e) { if (!W.length) { $("#insight").innerHTML = `<div class="kosong">Data belum bisa dimuat. Mencoba lagi…</div>`; setTimeout(muat, 30000); } }
}
setInterval(() => { if (!document.hidden) muat(); }, 10 * 60 * 1000);
addEventListener("visibilitychange", () => { if (!document.hidden) muat(); }); addEventListener("online", () => muat());
/* grafik digambar ulang hanya saat lebar berubah; tinggi dilaporkan ke iframe induk hanya bila berubah */
new ResizeObserver(() => {
  if (innerWidth !== lastW) { lastW = innerWidth; nanti(grafikSemua); }
  const h = Math.ceil(document.body.getBoundingClientRect().height);
  if (top !== window && ID !== "peta" && h !== lastH) { lastH = h; parent.postMessage({presiden: "tinggi", w: ID, tinggi: h}, "*"); }
}).observe(document.body);

/* ===== tampilan peta: MapLibre lokal dimuat malas saat tab Peta pertama dibuka ===== */
const IKON = {
  provinsi: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  cuaca: "M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z",
  kejadian: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  konsesi: "M4 20V8l8-4 8 4v12zM9 20v-6h6v6",
  gambut: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  asap: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8",
  penerbangan: "M10 14L3 11l1-2 8 1 4-5 2 1-2 6 5 3-1 2-6-1-3 5-2-1z",
  posko: "M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  berulang: "M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4",
};
const WARNA_L = {provinsi: "#d9381e", cuaca: "#d9381e", kejadian: "#f5b700", konsesi: "#7b4ab8", gambut: "#8a5a2b", asap: "#4f6a8f", penerbangan: "#1d6fb8", posko: "#16895c", berulang: "#b97a06"};
const RAMP = ["#fde3c8", "#fcbc86", "#f78c58", "#e04a30", "#a80d12"];
const gelapTema = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
const DASAR = () => gelapTema() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const ptSimpan = {
  baca() { try { return localStorage.getItem("pr-tampil"); } catch (e) { return null; } },
  tulis(v) { try { localStorage.setItem("pr-tampil", v); } catch (e) {} },
};
const lapisDiminta = new URLSearchParams(location.search).get("lapis");
const Pt = {
  siap: null, ambilP: null, peta: null, data: null, geo: null, nama: {}, aktif: new Set(), L: [], vis: [], tunggu: false,
  /* data peta diambil lebih dulu (hover tombol Peta, atau idle sesudah kartu tampil); pustaka hanya saat Peta dibuka */
  ambil() {
    return this.ambilP ||= Promise.all([fetch("/data/presiden/peta.json").then(r => r.json()), fetch("/geo/provinsi.json").then(r => r.json()), fetch("/data/meta.json").then(r => r.json()).catch(() => ({}))])
      .catch(e => { this.ambilP = null; throw e; });
  },
  muatLib() {
    if (this.siap) return this.siap;
    $("#pr-leg").innerHTML = `<div class="pr-lg">Memuat peta…</div>`;
    return this.siap = Promise.all([new Promise((ok, gagal) => {
      const c = document.createElement("link"); c.rel = "stylesheet"; c.href = "/vendor/maplibre/maplibre-gl.css"; document.head.append(c);
      const s = document.createElement("script"); s.src = "/vendor/maplibre/maplibre-gl.js"; s.onload = ok; s.onerror = gagal; document.head.append(s);
    }), this.ambil()])
      .then(([, [d, g, m]]) => { this.data = d; this.geo = g; this.nama = m.provinsi || {}; this.L = d.lapisan || []; nanti(() => this.mulai()); })
      .catch(() => { this.siap = null; $("#pr-leg").innerHTML = `<div class="pr-lg">Peta belum bisa dimuat.</div>`; });
  },
  susun() { this.vis = this.L.filter(l => this.aktif.has(l.id)).map(l => ({l, ids: this.ids(l)})); },
  mulai() {
    const ada = new Set(this.L.map(l => l.id)), minta = (lapisDiminta || "").split(",").filter(x => ada.has(x)), jenis = x => this.L.find(l => l.id === x).jenis;
    minta.splice(0, minta.length, ...minta.filter((x, i) => jenis(x) !== "provinsi" || minta.findIndex(y => jenis(y) === "provinsi") === i));   /* satu lapisan provinsi saja */
    (minta.length ? minta : ada.has("provinsi") ? ["provinsi"] : this.L.slice(0, 1).map(l => l.id)).forEach(i => this.aktif.add(i));
    this.L.forEach(l => { l.warna = WARNA_L[l.id] || "#d9481f"; });
    this.susun();
    $("#pr-lapis").innerHTML = this.L.map(l => `<button type="button" data-l="${esc(l.id)}" style="--c:${l.warna}" aria-pressed="${this.aktif.has(l.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[l.id] || IKON.provinsi}"/></svg><span>${esc(l.label)}</span></button>`).join("");
    let m; try { m = this.peta = new maplibregl.Map({container: "pr-map", style: DASAR(), bounds: [[95, -11], [141, 6]], fitBoundsOptions: {padding: {top: 90, bottom: 70, left: 10, right: 10}}, minZoom: 2.5, maxZoom: 14, attributionControl: {compact: true}, dragRotate: false}); }
    catch (e) { $("#pr-leg").innerHTML = `<div class="pr-lg">Peta tidak didukung peramban ini. Buka tampilan Kartu.</div>`; return; }
    let jadi = false; const pasangSekali = () => { if (jadi) return; jadi = true; this.pasang(); this.legenda(); };
    /* peta dasar (tiles.openfreemap.org) diblokir jaringan: lapisan tetap tampil di atas latar polos */
    const polos = () => { if (!jadi) { m.setStyle({version: 8, sources: {}, layers: [{id: "bg", type: "background", paint: {"background-color": gelapTema() ? "#1b2230" : "#eef1f5"}}]}); m.once("style.load", pasangSekali); } };
    m.on("error", e => { if (!jadi && /\/styles\//.test(e.error?.url || e.error?.message || "")) polos(); }); setTimeout(polos, 8000);   /* hanya gaya dasar yang gagal; galat ubin biasa diabaikan */
    m.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    m.once("style.load", pasangSekali);
    m.on("click", e => this.klik(e));
    m.on("mousemove", e => {   /* satu per frame, lewati saat seret */
      if (this.tunggu || e.originalEvent.buttons) return; this.tunggu = true;
      requestAnimationFrame(() => { this.tunggu = false; m.getCanvas().style.cursor = this.cari(e.point).length ? "pointer" : ""; });
    });
  },
  /* provinsi: kelas kuantil (batas unik), nol atau kosong = abu muda; legenda dihitung dari batas yang sama */
  kelas(l) {
    const v = Object.values(l.nilai || {}).filter(x => x > 0).sort((a, b) => a - b);
    if (!v.length) return {ts: [], rentang: [], c: () => null};
    const ts = [...new Set([1, 2, 3, 4].map(i => v[Math.floor(v.length * i / 5)]).filter(t => t > v[0]))], n = ts.length + 1, bulat = v.every(Number.isInteger);
    const warna = Array.from({length: n}, (_, i) => RAMP[n < 2 ? 3 : Math.round(i * 4 / (n - 1))]), e = [v[0], ...ts, Infinity];
    const rentang = warna.map((w, i) => { const a = e[i], b = e[i + 1], akhir = i === n - 1 ? v[v.length - 1] : bulat ? b - 1 : b;
      return [w, a === akhir ? fmt(a) : fmt(a) + (i === n - 1 || bulat ? " sampai " : " sampai kurang dari ") + fmt(akhir)]; });
    return {ts, rentang, c: x => x == null || x <= 0 ? null : warna[ts.filter(t => x >= t).length]};
  },
  /* titik berkelas (lapisan.kelas): warna dan ukuran legenda mengikuti kelas */
  warnaKelas(l, x) { const K = l.kelas; if (x < K[0].dari) return "#9aa5b5"; const i = K.reduce((a, k, j) => x >= k.dari ? j : a, 0); return RAMP[K.length < 2 ? 3 : Math.round(i * 4 / (K.length - 1))]; },
  pasang() {
    const m = this.peta, abu = gelapTema() ? "#3a4659" : "#e6e9ee";
    [...this.L.filter(l => l.jenis === "provinsi"), ...this.L.filter(l => l.jenis !== "provinsi")].forEach(l => {
      const vis = this.aktif.has(l.id) ? "visible" : "none";
      if (l.jenis === "provinsi") {
        const K = l.k = this.kelas(l);
        m.addSource("s-" + l.id, {type: "geojson", data: {type: "FeatureCollection", features: this.geo.features.map(f => { const n = l.nilai?.[f.properties.kode]; return {type: "Feature", geometry: f.geometry, properties: {kode: f.properties.kode, nama: this.nama[f.properties.kode] || f.properties.kode, n: n ?? null, c: K.c(n) || abu}}; })}});
        m.addLayer({id: "f-" + l.id, type: "fill", source: "s-" + l.id, layout: {visibility: vis}, paint: {"fill-color": ["get", "c"], "fill-opacity": .8}});
        m.addLayer({id: "o-" + l.id, type: "line", source: "s-" + l.id, layout: {visibility: vis}, paint: {"line-color": gelapTema() ? "#8ea2c4" : "#ffffff", "line-width": .8}});
      } else {
        const F = (l.fitur || []).filter(f => isFinite(f.lat) && isFinite(f.lon)), mx = Math.max(1, ...F.map(f => f.nilai || 0)), kl = l.kelas?.length > 0;
        F.sort((a, b) => (b.nilai || 0) - (a.nilai || 0));
        m.addSource("s-" + l.id, {type: "geojson", data: {type: "FeatureCollection", features: F.map((f, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [f.lon, f.lat]}, properties: {i, r: 4 + 16 * Math.sqrt((f.nilai || 0) / mx), c: kl ? this.warnaKelas(l, f.nilai || 0) : l.warna}}))}});
        l.F = F; l.mx = mx;
        m.addLayer({id: "c-" + l.id, type: "circle", source: "s-" + l.id, layout: {visibility: vis}, paint: {"circle-radius": ["get", "r"], "circle-color": ["get", "c"], "circle-opacity": .62, "circle-stroke-color": l.id === "kejadian" ? "#6b2a00" : "#fff", "circle-stroke-width": 1}});
      }
    });
  },
  ids(l) { return l.jenis === "provinsi" ? ["f-" + l.id] : ["c-" + l.id]; },
  cari(pt) {
    if (!this.vis.length) return [];
    return this.peta.queryRenderedFeatures(pt, {layers: this.vis.flatMap(v => v.ids)}).map(f => ({f, l: this.vis.find(v => v.ids[0] === f.layer.id)?.l})).filter(h => h.l);
  },
  klik(e) {
    const h = this.cari(e.point)[0]; if (!h) return;
    const {f, l} = h, p = f.properties;
    let judul, nilai, pill, teks = [];
    if (l.jenis === "provinsi") { judul = p.nama; nilai = p.n == null || p.n === "null" ? null : +p.n; }
    else { const x = l.F[+p.i]; judul = x.nama; nilai = x.nilai; pill = x.pill; teks = x.teks || []; }
    const lihat = l.widget && ID !== "peta" ? `<div><button type="button" data-lihat="${esc(l.widget)}">Lihat kartu</button></div>` : "";
    const sat = l.satuan ? " " + l.satuan : "", ci = pill || (nilai == null ? null : typeof l.pill === "string" ? l.pill.replace("{nilai}", () => fmt(nilai)) : fmt(nilai) + sat);
    const isi = `<div class="pr-ph" style="--c:${l.warna}">${esc(l.label)}</div><div class="pr-pb"><h4>${esc(judul)}</h4>${ci == null ? `<p>Tidak ada data</p>` : pl(ci, l.warna)}${teks.map(t => `<p>${esc(t)}</p>`).join("")}${lihat}</div>`;
    new maplibregl.Popup({className: "pr-pop", maxWidth: "320px", closeButton: true}).setLngLat(l.jenis === "provinsi" ? e.lngLat : f.geometry.coordinates).setHTML(isi).addTo(this.peta);
  },
  legenda() {
    const dot = (w, d, x = "") => `<i class="bl" style="background:${w};width:${d}px;height:${d}px;${x}"></i>`;
    $("#pr-leg").innerHTML = this.vis.map(({l}) => {
      const dobel = l.satuan && l.label.toLowerCase().includes(l.satuan.toLowerCase()), ket = `<span><b>${esc(l.label)}</b>${l.satuan && !dobel ? ", " + esc(l.satuan) : ""}</span>`;
      let isi;
      if (l.jenis === "provinsi") isi = l.k.rentang.map(([w, t]) => `<span class="kl"><i style="background:${w}"></i>${esc(t)}</span>`).join("")
        + (this.geo.features.some(f => !(l.nilai?.[f.properties.kode] > 0)) ? `<span class="kl"><i style="background:${gelapTema() ? "#3a4659" : "#e6e9ee"}"></i>Nol atau tanpa data</span>` : "");
      else if (l.kelas?.length) isi = l.kelas.map((k, i) => `<span class="kl">${dot(this.warnaKelas(l, k.dari), 8 + i * 3)}${esc(k.label)}, dari ${fmt(k.dari)}</span>`).join("");
      else if (!l.F?.length) isi = `<span class="nl">Tidak ada titik</span>`;
      else isi = `<span class="nl">${dot(l.warna, 7)}kecil${dot(l.warna, 16, "margin-left:8px")}${fmt(l.mx)}</span>`;
      const per = [l.per ? "per " + tgl(l.per) : "", l.sumber ? "Sumber: " + esc(l.sumber) : ""].filter(Boolean).join(", ");
      return `<div class="pr-lg">${ket}${isi}${per ? `<span class="per">${per}</span>` : ""}${l.catatan ? `<span class="cat">${esc(l.catatan)}</span>` : ""}</div>`;
    }).join("");
  },
  pilih(id) {
    const l = this.L.find(x => x.id === id); if (!l) return;
    const lama = new Set(this.aktif);
    if (!this.aktif.has(id)) { this.aktif.add(id); if (l.jenis === "provinsi") this.L.filter(x => x.jenis === "provinsi" && x.id !== id).forEach(x => this.aktif.delete(x.id)); }
    else if (this.aktif.size > 1) this.aktif.delete(id);   /* minimal satu lapisan tetap menyala */
    document.querySelectorAll("#pr-lapis button").forEach(b => b.setAttribute("aria-pressed", this.aktif.has(b.dataset.l)));   /* chrome seketika */
    nanti(() => {
      this.susun();
      this.L.filter(x => lama.has(x.id) !== this.aktif.has(x.id)).forEach(x => this.ids(x).concat(x.jenis === "provinsi" ? ["o-" + x.id] : []).forEach(i => { if (this.peta.getLayer(i)) this.peta.setLayoutProperty(i, "visibility", this.aktif.has(x.id) ? "visible" : "none"); }));
      this.legenda();
    });
  },
};
let cur = null;
function mode(t, simpan = true) {
  if (t === cur) return;   /* segmen yang sudah aktif: tidak melakukan apa-apa */
  cur = t;
  document.querySelectorAll("#tampil button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === t));   /* urgent */
  nanti(() => {
    if (cur !== t) return;
    $("#peta").hidden = t !== "peta"; $("#insight").hidden = t === "peta";
    if (t === "peta") { Pt.muatLib(); Pt.peta?.resize(); } else grafikSemua();   /* grafik digambar ulang: lebar 0 saat tersembunyi */
    if (simpan && !ID) { ptSimpan.tulis(t); history.replaceState(null, "", location.pathname + location.search + (t === "peta" ? "#peta" : "")); }
  });
}
document.addEventListener("click", e => {
  const b = e.target.closest("#tampil button"), l = e.target.closest("#pr-lapis button"), a = e.target.closest("[data-lihat]");
  if (b) mode(b.dataset.t);
  else if (l) Pt.pilih(l.dataset.l);
  else if (a) { mode("kartu"); nanti(() => document.querySelector(`[data-w="${CSS.escape(a.dataset.lihat)}"]`)?.scrollIntoView({block: "start", behavior: "smooth"})); }
});
const prefetch = e => { if (e.target.closest?.('#tampil [data-t="peta"]')) Pt.ambil().catch(() => {}); };
document.addEventListener("pointerover", prefetch); document.addEventListener("focusin", prefetch);
addEventListener("hashchange", () => { if (ID !== "peta") mode(location.hash === "#peta" ? "peta" : "kartu", false); });
if (ID === "peta") { $("#peta").hidden = false; $("#insight").hidden = true; Pt.muatLib(); }
else { mode(!ID && (location.hash === "#peta" || (!location.hash && ptSimpan.baca() === "peta")) ? "peta" : "kartu", false); muat(); }
