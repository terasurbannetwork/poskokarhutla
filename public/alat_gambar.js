"use strict";
/* alat_gambar.js: alat gambar wilayah di peta utama (poligon, kotak, buffer 1-50 km). Paket data/kajian-bnpb/alat-gambar/.
   Hitung di peramban dari S.titik yang sudah dimuat peta; jaringan hanya ke berkas JSON milik situs (data/, geo/) tanpa koordinat gambar di alamat; gambar tidak disimpan dan tidak masuk URL (D10, D11).
   Luas = "luas wilayah digambar", bukan luas terbakar. Geometri murni di alat_gambar_geo.js. Tidak menyentuh ukurAktif, S.ukur, lapisan api 3D. */
(function () {
const Geo = window.AlatGambarGeo, tombol = document.getElementById("alatGambarBtn");
if (!Geo || !tombol) return;
const fmt = (n, d = 0) => n.toLocaleString("id-ID", {maximumFractionDigits: d});
const PERIODE = [["24j", 24, "24 jam"], ["3h", 72, "3 hari"], ["7h", 168, "7 hari"]];
const BENTUK = [["poligon", "Poligon", '<path d="M5 7l8-3 6 6-3 9-10-2z"/>'], ["kotak", "Kotak", '<rect x="4" y="5" width="16" height="14" rx="1"/>'], ["buffer", "Buffer", '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.5"/>']];
const IKON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const K = {aktif: false, bentuk: "poligon", simpul: [], tutup: false, r: 10, periode: "7h", kursor: null, nomor: 0, kartu: null, terpasang: false};

/* MapLibre belum mengerti oklch(): baca token lewat kanvas 1 piksel, jadi tidak ada literal warna baru */
function warna(token) {
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const x = c.getContext("2d", {willReadFrequently: true});
  x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim() || "#000"; x.fillRect(0, 0, 1, 1);
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${b})`;
}

/* ---------- peta ---------- */
function geojson() {
  const f = [], s = K.simpul, ada = s.length;
  const poly = c => ({type: "Feature", properties: {j: "isi"}, geometry: {type: "Polygon", coordinates: [[...c, c[0]]]}});
  if (K.bentuk === "buffer") {
    if (ada === 1) f.push(poly(Geo.lingkaran(s[0], K.r)));
    else if (ada > 1) { Geo.bidangKapsul(s, K.r).forEach(c => f.push(poly(c))); f.push({type: "Feature", properties: {j: "garis"}, geometry: {type: "LineString", coordinates: s}}); }
  } else {
    let t = [...s]; const kur = K.kursor;
    if (K.bentuk === "kotak") { if (ada === 1 && kur) t = [s[0], kur]; if (t.length === 2) { const [a, b] = t; f.push({type: "Feature", properties: {j: "garis"}, geometry: {type: "LineString", coordinates: [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]]}}); f.push(poly([[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]])); } }
    else if (t.length > 1) { const u = K.tutup ? [...t, t[0]] : (kur ? [...t, kur] : t); f.push({type: "Feature", properties: {j: "garis"}, geometry: {type: "LineString", coordinates: u}}); if (K.tutup && t.length > 2) f.push(poly(t)); }
  }
  s.forEach((p, i) => f.push({type: "Feature", properties: {j: "simpul", p: i === 0 ? 1 : 0}, geometry: {type: "Point", coordinates: p}}));
  return {type: "FeatureCollection", features: f};
}
function pasangLapisan() {
  if (typeof peta === "undefined" || !peta || peta.getSource("gambar")) return;
  const w = warna("--brand2"), putih = warna("--card"), sebelum = typeof Peta !== "undefined" ? Peta.lapisAwal?.() : undefined;
  peta.addSource("gambar", {type: "geojson", data: geojson()});
  peta.addLayer({id: "gambar-isi", type: "fill", source: "gambar", filter: ["==", ["get", "j"], "isi"], paint: {"fill-color": w, "fill-opacity": 0.14}}, sebelum);
  peta.addLayer({id: "gambar-garis", type: "line", source: "gambar", filter: ["==", ["get", "j"], "garis"], paint: {"line-color": w, "line-width": 2.5}}, sebelum);
  peta.addLayer({id: "gambar-simpul", type: "circle", source: "gambar", filter: ["==", ["get", "j"], "simpul"], paint: {"circle-radius": ["case", ["==", ["get", "p"], 1], 7, 5], "circle-color": putih, "circle-stroke-color": w, "circle-stroke-width": 2.5}}, sebelum);
}
let rafId = 0;
const gambarUlang = () => { if (rafId) return; rafId = requestAnimationFrame(() => { rafId = 0; pasangLapisan(); peta?.getSource("gambar")?.setData(geojson()); }); };
const cabutLapisan = () => { for (const l of ["gambar-simpul", "gambar-garis", "gambar-isi"]) if (peta?.getLayer(l)) peta.removeLayer(l); if (peta?.getSource("gambar")) peta.removeSource("gambar"); };

/* ---------- penangan klik: hanya saat mode gambar menyala, ditahan di fase capture agar klik peta utama tidak ikut jalan ---------- */
let turun = null;
const lokasi = e => { const r = peta.getCanvasContainer().getBoundingClientRect(), px = [e.clientX - r.left, e.clientY - r.top]; return {px, ll: peta.unproject(px)}; };
const PESAN_SILANG = "Garis itu memotong garis lain. Pilih titik lain.";
const pesan = t => { const p = K.kartu?.querySelector("[data-ag-pesan]"); if (p) p.textContent = t; toast?.(t); };
const tahan = e => { e.stopPropagation(); e.preventDefault(); };
function onTurun(e) { turun = [e.clientX, e.clientY]; }
function onKlik(e) {
  if (e.target.closest?.(".maplibregl-ctrl, .maplibregl-popup, .maplibregl-marker")) return;
  tahan(e);
  if (turun && Math.hypot(e.clientX - turun[0], e.clientY - turun[1]) > 5) return;   /* geser peta, bukan klik */
  const {px, ll} = lokasi(e), p = [ll.lng, ll.lat];
  if (K.bentuk === "poligon") {
    if (K.tutup) return;
    const dekat = (q, r) => { const o = peta.project(q); return Math.hypot(o.x - px[0], o.y - px[1]) < r; };
    if (K.simpul.length >= 3 && dekat(K.simpul[0], 12)) { if (Geo.silangBaru(K.simpul, null, true)) return pesan(PESAN_SILANG); K.tutup = true; }
    else { if (K.simpul.length && dekat(K.simpul.at(-1), 4)) return; if (Geo.silangBaru(K.simpul, p)) return pesan(PESAN_SILANG); K.simpul.push(p); }
  } else if (K.bentuk === "kotak") {
    if (K.simpul.length >= 2) return;
    K.simpul.push(p);
  } else { const a = K.simpul.at(-1); if (a && Math.hypot(peta.project(a).x - px[0], peta.project(a).y - px[1]) < 4) return; K.simpul.push(p); }
  perbarui();
}
function onDobel(e) { if (e.target.closest?.(".maplibregl-ctrl")) return; tahan(e); if (K.bentuk === "poligon" && K.simpul.length >= 3 && !K.tutup) { if (Geo.silangBaru(K.simpul, null, true)) return pesan(PESAN_SILANG); K.tutup = true; perbarui(); } }
function onGerak(e) { if (K.tutup || !K.simpul.length || K.bentuk === "buffer") return; K.kursor = [e.lngLat.lng, e.lngLat.lat]; gambarUlang(); }
const onKey = e => { if (e.key === "Escape") { if (K.simpul.length) hapus(); else matikan(); } };

/* ---------- hasil ---------- */
const siap = () => K.bentuk === "poligon" ? K.tutup : K.bentuk === "kotak" ? K.simpul.length === 2 : K.simpul.length > 0;
function perbarui() { gambarUlang(); segarKartu(); if (siap()) hitung(); }
const cache = new Map();
const muat = u => { if (!cache.has(u)) cache.set(u, fetch(u).then(r => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }).catch(e => { cache.delete(u); throw e; })); return cache.get(u); };
const tunda = f => typeof nanti === "function" ? nanti(f) : setTimeout(f, 0);
/* penguji dan luas disimpan per bentuk (tanpa periode), jadi ganti periode tidak memanggil penguji lagi */
function ujiDari() {
  const kunci = JSON.stringify([K.bentuk, K.simpul, K.r]);
  if (K.ujiKunci !== kunci) { K.ujiKunci = kunci; K.uji = Geo.penguji({bentuk: K.bentuk, simpul: K.simpul, r_km: K.r}); K.luas = K.uji?.luas_km2 ?? null; }
  return K.uji;
}
async function hitung() {
  const no = ++K.nomor, batal = () => no !== K.nomor, g = {bentuk: K.bentuk, simpul: K.simpul, r_km: K.r}, tolak = Geo.tolak(g);
  if (tolak) return tampilHasil(null, tolak);
  const uji = ujiDari(), per = PERIODE.find(x => x[0] === K.periode), kunci = K.ujiKunci;
  if (kunci !== K.kunci) { K.kunci = kunci; K.ins = K.wil = undefined; clearTimeout(K.tunda); K.tunda = setTimeout(() => lengkapi(no, kunci, uji), 350); }   /* desa dan insiden hanya bila bentuknya berubah, dan sesudah slider berhenti */
  K.h = {luas: K.luas, titik: undefined}; tampilHasil(K.h, null, true);
  if (K.luas == null && uji.luasA) { const l = await uji.luasA(160, batal); if (batal() || l == null) return; if (K.ujiKunci === kunci) K.luas = l; K.h = {luas: l, titik: undefined}; tampilHasil(K.h, null, true); }
  try { if (typeof muatTitik === "function") await muatTitik(per[1]); } catch (e) { /* data tidak termuat: jatuh ke menunggu */ }
  if (batal()) return;
  const siapData = S.titik && (S.titikPenuh || (S.jamTitik || 0) >= per[1]);
  const t0 = performance.now();
  const r = siapData ? await Geo.hitungTitik(S.titik, uji, {horizon: per[1], acuanMs: +S.acuan, dihitung: S.dihitung, batal}) : null;
  if (batal() || r?.dibatalkan) return;
  K.ms = Math.round(performance.now() - t0);
  K.h = {luas: K.luas, titik: r}; tampilHasil(K.h);
}
/* slider digeser: gambar saja yang bergerak; angka menyusul 350 ms sesudah berhenti. Luas kapsul sementara N=48 lewat timer */
function geserR(r) {
  K.r = r; segarKartu(); gambarUlang();
  if (!siap()) return;
  const no = ++K.nomor; clearTimeout(K.tundaH); K.tundaH = setTimeout(hitung, 350);
  K.h = {luas: null, titik: undefined}; tampilHasil(K.h, null, true);
  if (K.bentuk === "buffer" && K.simpul.length > 1) setTimeout(async () => { const u = Geo.penguji({bentuk: "buffer", simpul: K.simpul, r_km: K.r}), l = u && await u.luasA(48, () => no !== K.nomor); if (l != null && no === K.nomor) { K.h = {luas: l, titik: undefined}; tampilHasil(K.h, null, true); } }, 0);
}
/* insiden dengan luas dNBR dan desa/kecamatan beririsan: jalan di belakang, kartu utama sudah tampil */
async function lengkapi(no, kunci, uji) {
  const [i, l] = await Promise.all([muat("data/insiden.json").catch(() => null), muat("data/luas_citra.json").catch(() => null)]);
  if (kunci !== K.kunci) return;
  K.ins = i && l ? Geo.insidenDalam(i, l, uji) : []; tampilHasil(K.h);
  let w = null; try { w = await Geo.wilayah(uji, muat); } catch (e) { /* tak terukur */ }
  if (kunci !== K.kunci) return;
  K.wil = w; tampilHasil(K.h);
}

/* ---------- kartu ---------- */
const el = (t, a = {}, ...anak) => { const n = document.createElement(t); for (const [k, v] of Object.entries(a)) k === "teks" ? n.textContent = v : n.setAttribute(k, v); n.append(...anak); return n; };
function buatKartu() {
  const k = el("section", {class: "ex ex-std ag-kartu", "aria-label": "Alat gambar wilayah", hidden: ""});
  k.innerHTML = `<header class="ex-hd"><span class="ex-ey">Alat gambar</span><div class="ex-jd"><h3>Wilayah digambar</h3><button type="button" class="ag-tutup" data-ag="tutup" aria-label="Tutup alat gambar" title="Tutup">${IKON}<path d="M6 6l12 12M18 6 6 18"/></svg></button></div></header>
    <div class="ex-bd"><div class="seg penuh" role="group" aria-label="Bentuk gambar" data-ag-seg="bentuk">${BENTUK.map(([v, n, i]) => `<button type="button" data-ag="bentuk" data-v="${v}">${IKON}${i}</svg>${n}</button>`).join("")}</div>
    <div class="ag-baris" data-ag-r hidden><label for="agR">Jari-jari</label><input id="agR" type="range" min="${Geo.BUFFER_MIN_KM}" max="${Geo.BUFFER_MAX_KM}" step="1" value="${K.r}"><output id="agRo" for="agR"></output></div>
    <div class="seg penuh" role="group" aria-label="Periode data" data-ag-seg="periode">${PERIODE.map(([v, , n]) => `<button type="button" data-ag="periode" data-v="${v}">${n}</button>`).join("")}</div>
    <p class="ag-pesan" role="status" data-ag-pesan></p>
    <div class="ag-hasil-ruang" data-ag-hasil></div>
    <div><button type="button" class="ag-hapus" data-ag="hapus">Hapus gambar</button></div></div>`;
  k.addEventListener("click", e => {
    const b = e.target.closest("[data-ag]"); if (!b) return;
    const a = b.dataset.ag;
    if (a === "tutup") matikan();
    else if (a === "hapus") hapus();
    else if (a === "bentuk" && b.dataset.v !== K.bentuk) { K.bentuk = b.dataset.v; hapus(); }
    else if (a === "periode") { K.periode = b.dataset.v; segarKartu(); if (siap()) { ++K.nomor; tampilHasil({luas: K.luas, titik: undefined}, null, true); tunda(hitung); } }
  });
  k.querySelector("#agR").addEventListener("input", e => geserR(+e.target.value));
  return k;
}
function segarKartu() {
  const k = K.kartu; if (!k) return;
  k.querySelectorAll('[data-ag="bentuk"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === K.bentuk));
  k.querySelectorAll('[data-ag="periode"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === K.periode));
  k.querySelector("[data-ag-r]").hidden = K.bentuk !== "buffer";
  k.querySelector("#agRo").textContent = K.r + " km";
  const ps = k.querySelector("[data-ag-pesan]"), n = K.simpul.length;
  ps.textContent = siap() ? "" : K.bentuk === "poligon" ? (n < 3 ? "Klik peta untuk menaruh titik sudut. Tutup dengan klik titik pertama atau klik dua kali." : "Klik titik pertama atau klik dua kali untuk menutup.")
    : K.bentuk === "kotak" ? (n ? "Klik sudut yang berseberangan." : "Klik sudut pertama.") : "Klik peta untuk menaruh titik. Tambah klik untuk garis.";
  if (!siap()) k.querySelector("[data-ag-hasil]").replaceChildren();
}
const TAK = "tak terukur";
const pilKasar = t => el("span", {class: "ag-pil", teks: t});
function tabel(kepala, baris, dataNama) {
  return el("div", {class: "tw ex-tabel"}, el("table", {}, el("thead", {}, el("tr", {}, ...kepala.map(k => el("th", {teks: k})))), el("tbody", {}, ...baris.flatMap(([a, b, tip, pil]) => [el("tr", tip ? {title: tip} : {}, el("td", dataNama ? {teks: a, translate: "no"} : {teks: a}), el("td", {teks: b})), ...(pil ? [el("tr", {}, el("td", {colspan: "2"}, pilKasar("perkiraan kasar")))] : [])]))));
}
function tampilHasil(h, galat, menghitung) {
  const k = K.kartu, w = k.querySelector("[data-ag-hasil]"), ps = k.querySelector("[data-ag-pesan]");
  if (galat) { ps.textContent = galat; w.replaceChildren(); return; }
  ps.textContent = menghitung ? "Menghitung…" : !h.titik ? "Menunggu data titik panas." : "";
  const ha = h.luas == null ? null : h.luas < 1 ? Math.round(h.luas * 100) : Geo.bulatLuas(h.luas * 100);   /* ha bulat */
  const baris = [["Luas wilayah digambar", h.luas == null ? "Menghitung…" : `${fmt(Geo.bulatLuas(h.luas), h.luas < 100 ? 1 : 0)} km²`, "Dihitung pada bola dari garis yang digambar. Bukan luas terbakar."], ["Luas dalam hektare", ha == null ? "Menghitung…" : `${fmt(ha)} ha`, "Seratus kali luas dalam km²."]];
  const t = h.titik;
  if (t) {
    baris.push(["Titik panas", `${fmt(t.titik_unik)}`, "Lokasi unik per hari WIB, semua satelit, semua keyakinan: definisi yang sama dengan angka di panel peta."],
      ["FRP jumlah", t.frp_jumlah == null ? TAK : `${fmt(t.frp_jumlah, 1)} MW`, "Jumlah daya radiasi api dari titik yang punya FRP." + (t.frp_tanpa ? ` ${fmt(t.frp_tanpa)} titik tanpa FRP tidak dijumlah.` : "")],
      ["FRP tertinggi", t.frp_maks == null ? TAK : `${fmt(t.frp_maks, 1)} MW`, "Satu titik dengan FRP terbesar."],
      ["Siang", fmt(t.siang), "Terdeteksi 06.00 sampai 18.00 WIB."], ["Malam", fmt(t.malam), "Terdeteksi 18.00 sampai 06.00 WIB. Hanya angka, tanpa tafsir."],
      ["Sel berdeteksi", fmt(t.sel), "Sel 0,375 km (ukuran sama dengan penghitung titik unik) yang punya sedikitnya satu deteksi pada periode ini."],
      ["Jejak sel", `${fmt(t.jejak_ha)} ha`, `Sel berdeteksi dikali luas satu sel, ${fmt(t.piksel_ha, 2)} ha (sisi 0,375 km). Titik panas bukan luas bakar.`]);
    if (!t.titik_unik) ps.textContent = "0 titik dalam data periode ini. Satelit punya jeda lintasan dan awan bisa menutup.";
  }
  const bagian = [tabel(["Ukuran", "Nilai"], baris)];
  /* insiden dengan luas dNBR: hanya bila ada, per insiden, tidak dijumlah (D7) */
  if (K.ins?.length) {
    const tampil = K.ins.slice(0, 8);
    bagian.push(tabel(["Insiden dalam gambar", "Luas dNBR"], tampil.map(r => [r.nama, `${fmt(r.luas_ha)} ha`, `Perkiraan citra Sentinel-2 (dNBR), batas bawah, awan tidak dihitung${r.cakupan_pct == null ? "" : `. Cakupan citra ${r.cakupan_pct} persen`}.`]), true));
    bagian.push(el("p", {class: "ag-pesan", teks: K.ins.length > 8 ? `Perkiraan batas bawah per insiden, tidak dijumlah. ${fmt(K.ins.length - 8)} insiden lain tidak ditampilkan.` : "Perkiraan batas bawah per insiden, tidak dijumlah."}));
  }
  /* desa dan kecamatan (AG-05) */
  const W = K.wil;
  if (W === undefined) bagian.push(el("p", {class: "ag-pesan", teks: "Memuat desa dan kecamatan…"}));
  else if (W?.terlalu_luas) bagian.push(el("p", {class: "ag-pesan", teks: `Gambar terlalu luas untuk daftar desa: beririsan dengan ${fmt(W.n_kab)} kabupaten atau kota, batasnya ${Geo.MAKS_KAB}. Titik panas tetap dihitung.`}));
  else if (!W || !W.desa) bagian.push(tabel(["Wilayah", "Nilai"], [["Desa beririsan", TAK, "Gambar di luar batas daratan yang kita punya, atau berkas batas desa belum bisa dimuat."], ["Penduduk kecamatan", TAK, "Tidak ada kecamatan yang bisa dicocokkan."]]));
  else {
    bagian.push(tabel(["Wilayah", "Nilai"], [["Desa beririsan", fmt(W.desa.length), "Desa yang batasnya bersentuhan dengan gambar. Batas desa disederhanakan, bukan SK batas."], ["Kecamatan beririsan", fmt(W.kec.length), "Kecamatan yang batasnya bersentuhan dengan gambar."],
      ["Penduduk kecamatan", W.pend == null ? TAK : fmt(W.pend), "Jumlah penduduk SELURUH kecamatan yang beririsan (WorldPop 2026), bukan penduduk di dalam gambar.", W.pend != null]]));
    bagian.push(el("p", {class: "ag-pesan"}, " Seluruh penduduk kecamatan yang beririsan, bukan penduduk di dalam gambar." + (W.pend != null && !W.pend_lengkap ? " Sebagian kecamatan tanpa data." : "")));
    const daftar = (judul, isi) => isi.length ? el("details", {class: "ag-daftar"}, el("summary", {teks: `${judul} (${fmt(isi.length)})`}), el("ul", {}, ...isi.slice(0, 300).map(x => el("li", {teks: x, translate: "no"})))) : null;
    bagian.push(...[daftar("Daftar desa", W.desa.map(d => [d.nama || d.kd, d.kec && "Kec. " + d.kec].filter(Boolean).join(", "))), daftar("Daftar kecamatan", W.kec.map(c => `${c.kec}, ${c.kab}`))].filter(Boolean));
  }
  w.replaceChildren(...bagian);
}

/* ---------- hidup-mati ---------- */
function hapus() { K.simpul = []; K.tutup = false; K.kursor = null; K.nomor++; segarKartu(); gambarUlang(); }
function nyalakan() {
  if (typeof peta === "undefined" || !peta) { toast?.("Peta belum siap"); return; }
  K.aktif = true; tombol.setAttribute("aria-pressed", "true");
  if (!K.kartu) { K.kartu = buatKartu(); document.getElementById("lapis").before(K.kartu); }   // kartu tetap di tumpukan alat peta, tombolnya di panel Real Time
  K.kartu.hidden = false; peta.doubleClickZoom.disable();
  const c = peta.getCanvasContainer(); c.addEventListener("mousedown", onTurun, true); c.addEventListener("click", onKlik, true); c.addEventListener("dblclick", onDobel, true);
  peta.on("mousemove", onGerak); document.addEventListener("keydown", onKey);
  peta.getCanvas().style.cursor = "crosshair"; segarKartu(); pasangLapisan();
  if (!K.terpasang) { K.terpasang = true; peta.on("style.load", () => { if (K.aktif) gambarUlang(); }); }
}
function matikan() {
  K.aktif = false; tombol.setAttribute("aria-pressed", "false"); K.nomor++;
  const c = peta.getCanvasContainer(); c.removeEventListener("mousedown", onTurun, true); c.removeEventListener("click", onKlik, true); c.removeEventListener("dblclick", onDobel, true);
  peta.off("mousemove", onGerak); document.removeEventListener("keydown", onKey); peta.doubleClickZoom.enable(); peta.getCanvas().style.cursor = "";
  K.simpul = []; K.tutup = false; K.kursor = null; cabutLapisan(); if (K.kartu) K.kartu.hidden = true;
}
tombol.addEventListener("click", () => K.aktif ? matikan() : nyalakan());
const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "/alat_gambar.css"; document.head.append(css);
window.AlatGambar = {status: () => ({aktif: K.aktif, bentuk: K.bentuk, simpul: K.simpul.length, ms: K.ms}), K};
})();
