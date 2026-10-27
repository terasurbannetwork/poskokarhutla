"use strict";
/* Pos tinggi air sungai terukur (SIHKA, Kementerian PU) di peta /banjir: pin kapsul, sungai mengalir, kartu pos, daftar pos macet.
   Bagian murni (PosAir) diuji di tests/banjir/pos_air.test.mjs; bagian peta (PosUkur, Alir) memakai peta/Analisa/nanti dari skrip lain. */
globalThis.PosAir = (() => {
  const R = 6378137, DEG = 180 / Math.PI;
  const NAMA = {biasa: "Biasa", naik_di_atas_biasa: "Naik di atas biasa", tertinggi: "Tertinggi", lama: "Data lama", macet: "Macet", bukan_tinggi: "Bukan tinggi air", riwayat_kurang: "Riwayat kurang", pantauan_terbatas: "Pantauan terbatas", data_bolong: "Data bolong"};
  const WARNA = {biasa: "#3f7fb8", naik_di_atas_biasa: "#e58a45", tertinggi: "#c9503a", lama: "#8d9aa9", macet: "#8d9aa9", bukan_tinggi: "#8d9aa9", riwayat_kurang: "#c3ccd6", pantauan_terbatas: "#c3ccd6", data_bolong: "#8d9aa9"};
  /* isi air di kapsul: penanda relatif per status, bukan ukuran; pos tanpa pembanding tidak punya tinggi relatif */
  const ISI = {biasa: .5, naik_di_atas_biasa: .75, tertinggi: 1, lama: .3, macet: .3, bukan_tinggi: .3, riwayat_kurang: .4, pantauan_terbatas: .4, data_bolong: .3};
  const SATUAN = {centimeter: "cm", "m3/s": "m³/s"};
  /* status resmi (ambang siaga pengelola) menang atas status persentil, kecuali data lama atau macet */
  const RESMI = {"Normal": ["#3f7fb8", .5], "Siaga 3": ["#e3b94e", .65], "Siaga 2": ["#e58a45", .8], "Siaga 1": ["#c9503a", 1]};
  const PENGELOLA = "Kementerian PU, Ditjen SDA (SIHKA)";
  const resmi = p => p && !["lama", "macet", "bukan_tinggi", "data_bolong"].includes(p.status) && RESMI[p.status_resmi] ? p.status_resmi : null;
  const ikonKunci = p => resmi(p) ? "r-" + resmi(p).replace(" ", "") : p.status;
  const warnaPos = p => resmi(p) ? RESMI[resmi(p)][0] : warna(p.status);
  const isiPos = p => resmi(p) ? RESMI[resmi(p)][1] : ISI[p.status] ?? .3;
  const pengelola = p => p?.pengelola || PENGELOLA;
  const titik = p => typeof p.lon === "number" && typeof p.lat === "number" ? [p.lon, p.lat] : lonlat(p.x, p.y);
  const lonlat = (x, y) => [x / R * DEG, (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * DEG];
  const warna = s => WARNA[s] || WARNA.data_bolong;
  const nama = s => NAMA[s] || s;
  const redup = s => s === "lama" || s === "macet" || s === "bukan_tinggi" || s === "data_bolong";
  const denyut = s => s === "naik_di_atas_biasa" || s === "tertinggi";
  const denyutPos = p => resmi(p) ? p.status_resmi !== "Normal" : denyut(p.status);   /* semua Siaga berdenyut, juga Siaga 3 */
  const angkaId = v => v == null || isNaN(v) ? "–" : Number(v).toLocaleString("id-ID", {maximumFractionDigits: Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2});
  const satuan = s => s == null ? "" : (SATUAN[s] || s);
  /* satuan null: angka saja, tanpa konversi */
  const angka = (v, s) => v == null || isNaN(v) ? "–" : angkaId(v) + (satuan(s) ? " " + satuan(s) : "");
  const delta = (d, s) => d == null ? "–" : d > 0 ? "▲ " + angka(d, s) : d < 0 ? "▼ " + angka(Math.abs(d), s) : "tetap";
  const deltaKelas = d => d == null ? "" : d > 0 ? "naik" : d < 0 ? "turun" : "tetap";
  const detik = t => t > 1e12 ? t / 1000 : t;
  /* "Dibaca Sen 27 Okt 16.00 WIB" */
  const waktuBaca = t => { if (t == null) return "–";
    const p = Object.fromEntries(new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).formatToParts(new Date(detik(t) * 1000)).map(x => [x.type, x.value]));
    return `Dibaca ${p.weekday.replace(".", "")} ${p.day} ${p.month.replace(".", "")} ${p.hour}.${p.minute} WIB`; };
  const lalu = (t, now) => { if (t == null) return "–"; const j = Math.max(0, (now - detik(t)) / 3600); return j < 1 ? "kurang dari 1 jam lalu" : j < 48 ? Math.floor(j) + " jam lalu" : Math.floor(j / 24) + " hari lalu"; };
  /* pos lama dan macet, terlama mengirim di atas */
  const pilihMacet = pos => { const u = (s) => pos.filter(p => p.status === s).sort((a, b) => a.t - b.t); return {lama: u("lama"), macet: u("macet")}; };
  /* daftar macet per pengelola: [[pengelola, [pos lama dan macet, terlama dulu]]], kelompok terbanyak dulu */
  const macetPerPengelola = pos => { const m = pilihMacet(pos), g = new Map(); for (const p of [...m.macet, ...m.lama].sort((a, b) => a.t - b.t)) { const k = pengelola(p); g.set(k, [...(g.get(k) || []), p]); }
    return [...g].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])); };
  /* skala tegak ambang: tiga batas (cm) dan posisi nilai; null bila ambang tidak ada */
  const skala = p => { const a = p?.ambang; if (!a || a.siaga3 == null || a.siaga2 == null || a.siaga1 == null) return null;
    const b = [["Siaga 1", a.siaga1], ["Siaga 2", a.siaga2], ["Siaga 3", a.siaga3], ["Normal", null]]; return b.map(([n, v]) => ({nama: n, batas: v, warna: RESMI[n][0]})); };
  const geojson = pos => ({type: "FeatureCollection", features: (pos || []).map(p => ({type: "Feature", geometry: {type: "Point", coordinates: titik(p)},
    properties: {id: p.id, nama: p.nama, s: p.status, i: ikonKunci(p), a: p.v == null ? "" : angkaId(p.v), w: warnaPos(p), p: denyutPos(p) ? 1 : 0, u: denyutPos(p) ? 0 : redup(p.status) ? 2 : 1}}))});
  /* sorot pendek-panjang yang bergeser sepanjang garis tengah: 14 langkah, tiap pola berjumlah 7 */
  const T = 7, DS = 1.5, DASH = Array.from({length: 14}, (_, k) => { const g = k * T / 14; return g + DS <= T ? [0, +g.toFixed(2), DS, +(T - g - DS).toFixed(2)] : [+(g + DS - T).toFixed(2), T - DS, +(DS - (g + DS - T)).toFixed(2)]; });
  const JEDA = 90; /* ms antar pembaruan paint, sekitar 11 fps */
  const dash = ts => DASH[Math.floor(ts / JEDA) % DASH.length];
  const fase = ts => (ts % 1800) / 1800;
  const KEMBAR = p => ["lama", "macet", "bukan_tinggi", "data_bolong"].includes(p.status);
  const SIAGA = ["Siaga 1", "Siaga 2", "Siaga 3"];
  const kelas = p => KEMBAR(p) ? "mati" : resmi(p) || (p.status === "naik_di_atas_biasa" || p.status === "tertinggi" ? "naik" : "Normal");
  const WARNA_KELAS = {"Normal": RESMI["Normal"][0], "Siaga 3": RESMI["Siaga 3"][0], "Siaga 2": RESMI["Siaga 2"][0], "Siaga 1": RESMI["Siaga 1"][0], mati: "#8d9aa9", naik: "#e58a45"};
  /* hitungan untuk panel ringkas dan batang bertumpuk; pos yang naik masuk batang Normal tetapi dihitung terpisah */
  const ringkas = pos => { const h = {"Normal": 0, "Siaga 3": 0, "Siaga 2": 0, "Siaga 1": 0, mati: 0, naik: 0}; for (const p of pos || []) { const k = kelas(p); h[k === "naik" ? "Normal" : k]++; if (k === "naik") h.naik++; }
    return {...h, total: (pos || []).length, kirim: (pos || []).length - h.mati}; };
  const urutBerat = (a, b) => { const w = p => SIAGA.indexOf(kelas(p)) >= 0 ? SIAGA.indexOf(kelas(p)) : 3; return w(a) - w(b) || String(a.nama).localeCompare(String(b.nama), "id"); };
  const perluPantau = pos => (pos || []).filter(p => { const k = kelas(p); return SIAGA.includes(k) || k === "naik"; }).sort(urutBerat);
  const kalimat = pos => { const a = perluPantau(pos).filter(p => SIAGA.includes(kelas(p))), n = ringkas(pos).naik, t = [];
    if (a.length) t.push(`${angkaId(a.length)} pos di atas batas normal: ${a.slice(0, 3).map(p => `${p.nama} (${kelas(p)})`).join(", ")}${a.length > 3 ? ` dan ${angkaId(a.length - 3)} lainnya` : ""}.`);
    if (n) t.push(`${angkaId(n)} pos sedang naik.`); return t.join(" ") || "Tidak ada pos di atas batas normal."; };
  const cmNilai = p => p.v == null ? null : p.v * (p.satuan === "m" ? 100 : 1);
  /* posisi nilai terhadap Siaga 1 (0..1) untuk batang tipis; null bila tanpa ambang */
  const rasio = p => { const a = p?.ambang, c = cmNilai(p); return !a || a.siaga1 == null || c == null ? null : Math.max(0, Math.min(1, c / a.siaga1)); };
  /* kelompok per sungai; tanpa nama sungai jatuh ke kabupaten atau kota */
  const kelompok = pos => { const g = new Map(); for (const p of pos || []) { const k = p.sungai || (p.kab || p.kota ? "Kab. " + (p.kab || p.kota) : "Tanpa nama sungai"); g.set(k, [...(g.get(k) || []), p]); }
    return [...g].map(([k, l]) => [k, l.sort(urutBerat)]).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "id")); };
  const arah = (d, s) => d == null || d === 0 ? "" : (d > 0 ? "naik " : "turun ") + angka(Math.abs(d), s);
  const subjudul = p => [p.sungai, p.kota || p.kab].filter(Boolean).join(", ") || "Pos tinggi air";
  /* geometri skala tegak (viewBox 0..H): pita Normal, Siaga 3, 2, 1 dan garis air; null bila tanpa ambang */
  const skalaGeom = (p, H = 150) => { const a = p?.ambang, c = cmNilai(p); if (!a || a.siaga3 == null || a.siaga2 == null || a.siaga1 == null) return null;
    const mx = Math.max(a.siaga1 * 1.2, c ?? 0), y = v => +(H - Math.max(0, Math.min(v, mx)) / mx * H).toFixed(1), b = [[0, a.siaga3, "Normal"], [a.siaga3, a.siaga2, "Siaga 3"], [a.siaga2, a.siaga1, "Siaga 2"], [a.siaga1, mx, "Siaga 1"]];
    return {H, mx, pita: b.map(([lo, hi, n]) => ({nama: n, y0: y(hi), y1: y(lo), warna: RESMI[n][0], batas: n === "Normal" ? null : lo})), yAir: c == null ? null : y(c)}; };
  /* lingkaran kecil (radius km) sebagai cincin poligon untuk filter within */
  const lingkar = (lon, lat, km, n = 16) => { const dl = km / 111.32, dg = km / (111.32 * Math.cos(lat * Math.PI / 180)), r = [];
    for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI; r.push([+(lon + dg * Math.cos(a)).toFixed(5), +(lat + dl * Math.sin(a)).toFixed(5)]); } r.push(r[0]); return r; };
  /* ruas sungai berwarna: pos Siaga, atau naik_di_atas_biasa tanpa ambang; satu MultiPolygon per kelas */
  const ruas = (pos, km = 6) => { const o = {}; for (const p of pos || []) { const k = kelas(p); if (!SIAGA.includes(k) && !(k === "naik" && !p.ambang)) continue; const [lo, la] = titik(p); (o[k] ||= {type: "MultiPolygon", coordinates: []}).coordinates.push([lingkar(lo, la, km)]); } return o; };
  /* pasang surut BMKG (pasut.json): waktu dibaca sebagai WIB */
  const wibDetik = t => Date.parse(String(t).slice(0, 10) + "T" + String(t).slice(11, 16) + ":00+07:00") / 1000;
  const pasutSekarang = (st, now) => { const d = st?.deret; if (!d?.cm?.length) return null; const i = (now - wibDetik(d.t0)) / (d.langkah_menit * 60), a = Math.floor(i);
    if (i < 0 || a >= d.cm.length - 1) return null; const v = d.cm[a] + (d.cm[a + 1] - d.cm[a]) * (i - a); return {cm: Math.round(v), arah: d.cm[a + 1] >= d.cm[a] ? "pasang" : "surut"}; };
  const pasutKartu = (st, now, n = 4) => (st?.puncak || []).filter(x => wibDetik(x.t) > now).sort((a, b) => wibDetik(a.t) - wibDetik(b.t)).slice(0, n).map(x => {
    const dt = new Date(wibDetik(x.t) * 1000), f = new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", weekday: "short"}).format(dt).replace(".", "");
    return {jenis: x.jenis === "tinggi" ? "Pasang" : "Surut", hari: f, jam: String(x.t).slice(11, 16).replace(":", "."), cm: x.cm}; });
  const jamWib = ts => new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).format(new Date(detik(ts) * 1000)).replace(":", ".");
  const tglJamWib = ts => new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short"}).format(new Date(detik(ts) * 1000)).replace(".", "") + " " + jamWib(ts) + " WIB";
  /* kaki panel ringkas: pengelola yang ada dan jam baca terbaru */
  const kakiPanel = pos => { const ada = (pos || []).filter(p => p.t != null), peng = [...new Set((pos || []).map(pengelola))]; return peng.length ? `Sumber: ${peng.join(", ")}${ada.length ? `, dibaca terbaru ${jamWib(Math.max(...ada.map(p => detik(p.t))))} WIB` : ""}` : ""; };
  /* titik di dalam cincin luar poligon (ray casting; lubang diabaikan) */
  const dalamCincin = (c, lo, la) => { let d = false; for (let i = 0, j = c.length - 1; i < c.length; j = i++) { const [xi, yi] = c[i], [xj, yj] = c[j]; if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) d = !d; } return d; };
  const dalam = (pos, g) => { const pl = g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []; return (pos || []).filter(p => { const [lo, la] = titik(p); return pl.some(r => dalamCincin(r[0], lo, la)); }); };
  /* selisih ke batas Siaga berikutnya yang belum tercapai; null bila tanpa ambang atau sudah di atas Siaga 1 */
  const menujuBatas = p => { const a = p?.ambang, c = cmNilai(p); if (!a || c == null) return null; for (const [n, v] of [["Siaga 3", a.siaga3], ["Siaga 2", a.siaga2], ["Siaga 1", a.siaga1]]) if (v != null && c < v) return {nama: n, cm: v - c}; return null; };
  return {dalam, menujuBatas, cmNilai, jamWib, tglJamWib, kakiPanel, deltaKelas, KEMBAR, SIAGA, kelas, WARNA_KELAS, ringkas, perluPantau, kalimat, rasio, kelompok, arah, subjudul, skalaGeom, lingkar, ruas, wibDetik, pasutSekarang, pasutKartu, lonlat, titik, resmi, ikonKunci, warnaPos, isiPos, pengelola, denyutPos, macetPerPengelola, skala, RESMI, PENGELOLA, warna, nama, redup, denyut, angka, angkaId, satuan, delta, waktuBaca, lalu, pilihMacet, geojson, dash, fase, ISI, NAMA, WARNA, JEDA, detik};
})();

/* ---------- bagian peta (butuh peta, Analisa, nanti, gelap, esc dari skrip lain) ---------- */
const Alir = {
  id: 0, terakhir: 0, dipasang: false,
  kurangGerak: () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  boleh() { return !document.hidden && !this.kurangGerak() && PosUkur.menyala() && !!peta?.getLayer("alir-gerak"); },
  mulai() { if (this.id || !this.boleh()) return; this.id = requestAnimationFrame(this.langkah); },
  henti() { if (this.id) cancelAnimationFrame(this.id); this.id = 0; },
  /* satu frame rAF murah; paint hanya diubah tiap JEDA ms (sekitar 11 fps) */
  langkah: ts => {
    if (!Alir.boleh()) { Alir.id = 0; return; }
    Alir.id = requestAnimationFrame(Alir.langkah);
    if (ts - Alir.terakhir < PosAir.JEDA) return; Alir.terakhir = ts;
    if (peta.isMoving()) return;   /* geser atau zoom sedang jalan: peta sudah sibuk, lewati pembaruan paint */
    peta.setPaintProperty("alir-gerak", "line-dasharray", PosAir.dash(ts));
    if (peta.getLayer("pos-cincin")) { const f = PosAir.fase(ts); peta.setPaintProperty("pos-cincin", "circle-stroke-opacity", .6 * (1 - f)); peta.setPaintProperty("pos-cincin", "circle-radius", 11 + f * 12); } },
  pasang() { if (this.dipasang) return; this.dipasang = true;
    document.addEventListener("visibilitychange", () => document.hidden ? this.henti() : this.mulai());
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", () => this.kurangGerak() ? (this.henti(), this.diam()) : this.mulai()); },
  /* tanpa animasi: garis aliran statis, cincin diam */
  diam() { if (!peta?.getLayer("alir-gerak")) return; peta.setPaintProperty("alir-gerak", "line-dasharray", [0, 1.5, 1.5, 4]);
    if (peta.getLayer("pos-cincin")) { peta.setPaintProperty("pos-cincin", "circle-radius", 15); peta.setPaintProperty("pos-cincin", "circle-stroke-opacity", .4); } },
};

const PosUkur = {
  D: null, p: null, t0: 0,
  menyala: () => !!document.querySelector('#lapis input[data-l="pos"]')?.checked,
  muat() { return this.p ||= fetch("/api/banjir/sungai-ukur", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).then(d => { this.D = d?.pos ? d : null; this.t0 = Date.now(); return this.D; }).catch(() => null); },
  /* kapsul berisi air: gambar kanvas, satu sprite per status */
  ikon(w, isi) {
    const c = document.createElement("canvas"); c.width = 40; c.height = 62; const g = c.getContext("2d");
    const kapsul = (x, y, lebar, tinggi) => { g.beginPath(); g.roundRect(x, y, lebar, tinggi, lebar / 2); };
    g.beginPath(); g.moveTo(13, 46); g.lineTo(20, 60); g.lineTo(27, 46); g.closePath(); g.fillStyle = "#fff"; g.fill();
    kapsul(5, 3, 30, 46); g.fillStyle = "#fff"; g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 4; g.fill(); g.shadowBlur = 0;
    g.save(); kapsul(9, 7, 22, 38); g.clip(); g.fillStyle = "rgba(160,190,215,.28)"; g.fillRect(9, 7, 22, 38);
    const y = 45 - 38 * isi; g.fillStyle = w; g.fillRect(9, y, 22, 45 - y);
    g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(9, y, 22, 2); g.restore();
    return g.getImageData(0, 0, 40, 62); },
  lapis() {
    if (!peta || peta.getSource("pos")) return;
    for (const s of Object.keys(PosAir.NAMA)) if (!peta.hasImage("pa-" + s)) peta.addImage("pa-" + s, this.ikon(PosAir.warna(s), PosAir.ISI[s]), {pixelRatio: 2});
    for (const [n, [w, isi]] of Object.entries(PosAir.RESMI)) { const k = "pa-r-" + n.replace(" ", ""); if (!peta.hasImage(k)) peta.addImage(k, this.ikon(w, isi), {pixelRatio: 2}); }
    if (!peta.hasImage("pa-pasut")) peta.addImage("pa-pasut", this.ikon("#2b8c86", .5), {pixelRatio: 2});
    const bl = Peta.bawahLabel(), gl = gelap(), vis = this.menyala() ? "visible" : "none";
    /* sungai: badan air biru muda dan garis aliran bergerak di atas waterway basemap */
    const sumber = peta.getStyle().layers.find(l => l["source-layer"] === "waterway")?.source;
    if (sumber) {
      const kls = ["match", ["get", "class"], "river", 1, .55], filter = ["any", ["==", ["get", "class"], "river"], ["all", ["in", ["get", "class"], ["literal", ["canal", "stream"]]], [">=", ["zoom"], 8]]];
      const lebar = (a, b, c, d) => ["interpolate", ["linear"], ["zoom"], 4, ["*", kls, a], 8, ["*", kls, b], 12, ["*", kls, c], 15, ["*", kls, d]];
      peta.addLayer({id: "alir-badan", type: "line", source: sumber, "source-layer": "waterway", filter, layout: {visibility: vis, "line-cap": "round", "line-join": "round"},
        paint: {"line-color": gl ? "#2f6f9f" : "#b9dcf3", "line-width": lebar(2.2, 4.6, 13, 36), "line-opacity": .9}}, bl);
      peta.addLayer({id: "alir-garis", type: "line", source: sumber, "source-layer": "waterway", filter, layout: {visibility: vis, "line-cap": "round", "line-join": "round"},
        paint: {"line-color": gl ? "#5aa6e8" : "#3f86cf", "line-width": ["interpolate", ["linear"], ["zoom"], 4, ["*", kls, .6], 9, ["*", kls, 1.2], 12, ["*", kls, 2.2], 15, ["*", kls, 3]]}}, bl);
      peta.addLayer({id: "alir-gerak", type: "line", source: sumber, "source-layer": "waterway", filter, layout: {visibility: vis, "line-join": "round"},
        paint: {"line-color": gl ? "#e6f3ff" : "#1d5aa0", "line-width": ["interpolate", ["linear"], ["zoom"], 4, ["*", kls, .6], 9, ["*", kls, 1.3], 12, ["*", kls, 2.6], 15, ["*", kls, 3.6]], "line-opacity": .85, "line-blur": 1, "line-dasharray": [0, 1.5, 1.5, 4]}}, bl); }
    peta.addSource("pos", {type: "geojson", data: PosAir.geojson(this.D?.pos)});
    peta.addLayer({id: "pos-cincin", type: "circle", source: "pos", filter: ["==", ["get", "p"], 1], layout: {visibility: vis},
      paint: {"circle-radius": 15, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": ["get", "w"], "circle-stroke-width": 2, "circle-stroke-opacity": .4, "circle-translate": [0, -14], "circle-pitch-alignment": "map"}});
    peta.addSource("pos-pilih", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    peta.addLayer({id: "pos-pilih", type: "circle", source: "pos-pilih", layout: {visibility: vis}, paint: {"circle-radius": 17, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#0b2545", "circle-stroke-width": 2.5, "circle-translate": [0, -14]}});
    peta.addLayer({id: "pos", type: "symbol", source: "pos", layout: {visibility: vis, "icon-image": ["concat", "pa-", ["get", "i"]], "icon-anchor": "bottom", "icon-allow-overlap": false,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .5, 9, .8, 13, 1], "symbol-sort-key": ["get", "u"]}});
    peta.addLayer({id: "pos-angka", type: "symbol", source: "pos", minzoom: 8.5, filter: ["!=", ["get", "a"], ""],
      layout: {visibility: vis, "text-field": ["get", "a"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-anchor": "left", "text-offset": [1, -1.3], "text-optional": true},
      paint: {"text-color": ["match", ["get", "s"], "lama", "#7a8796", "macet", "#7a8796", "bukan_tinggi", "#7a8796", "data_bolong", "#7a8796", gl ? "#ffffff" : "#0b2545"], "text-halo-color": gl ? "#0b1424" : "#ffffff", "text-halo-width": 1.8}});
    if (!this._ev) { this._ev = 1;
      peta.on("mouseenter", "pos", () => peta.getCanvas().style.cursor = "pointer");
      peta.on("mousemove", "pos", e => { const p = e.features[0]?.properties, x = this.cari(p?.id); if (x) PI?.tampilTip(PI.kartuTip({judul: esc(x.nama), stat: [["sungai", PosAir.angka(x.v, x.satuan), PosAir.nama(x.status), PosAir.warnaPos(x), PosAir.denyutPos(x)]]}), e.originalEvent); });
      peta.on("mouseleave", "pos", () => { peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); }); }
    this.ruas(); Alir.pasang(); Alir.kurangGerak() ? Alir.diam() : Alir.mulai(); this.daftar(); renderLegenda(); },
  cari(id) { return this.D?.pos?.find(p => p.id === id) || null; },
  /* sakelar: chrome urgent (penanda memuat, hidden panel, animasi); 12 lapisan dan daftar menyusul sesudah satu frame */
  tampil(on) { const lb = document.querySelector('#lapis input[data-l="pos"]')?.closest("label"); if (lb) { lb.classList.add("memuat"); lb.setAttribute("aria-busy", "true"); }
    const pn = $("#posPanel"); if (pn && !on) pn.hidden = true; on ? Alir.mulai() : Alir.henti();
    nanti(() => { this.lapisan(on); this.daftar(); if (lb) { lb.classList.remove("memuat"); lb.removeAttribute("aria-busy"); } }); },
  lapisan(on) { for (const l of ["alir-badan", "alir-garis", "alir-st-Siaga3", "alir-st-Siaga2", "alir-st-Siaga1", "alir-st-naik", "alir-gerak", "pos-cincin", "pos-pilih", "pos", "pos-angka", "pasut"]) peta?.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none"); },
  hit(pt) { const f = peta.getLayer("pos") && peta.queryRenderedFeatures(pt, {layers: ["pos"]}); return f?.length ? f[0].properties.id : null; },
  legenda() { if (!Peta.lihat("pos") || !this.D) return "";
    return `<div class="lbl">Pos tinggi air</div><div class="leg" style="margin:4px 0 8px">${[["biasa", "Biasa"], ["naik_di_atas_biasa", "Naik di atas biasa"], ["tertinggi", "Tertinggi"], ["lama", "Lama atau macet"]].map(([s, n]) => `<span><i class="sw dot" style="background:${PosAir.warna(s)}"></i>${n}</span>`).join("")}</div>`; },
  pil(s) { const t = s === "riwayat_kurang" || s === "pantauan_terbatas"; return `<span class="pill" style="background:${PosAir.warna(s)};color:${t ? "#4a5868" : "#fff"}">${esc(PosAir.nama(s))}</span>`; },
  pilPos(x) { const r = PosAir.resmi(x); return r ? `<span class="pill" style="background:${PosAir.warnaPos(x)};color:${r === "Siaga 3" ? "#3b2f06" : "#fff"}">${r}</span>` : this.pil(x.status); },
  kapsul(x) { const w = PosAir.warnaPos(x), h = Math.round(PosAir.isiPos(x) * 100); return `<i style="display:inline-block;flex:none;width:10px;height:18px;border-radius:6px;border:1.5px solid ${w};background:linear-gradient(to top,${w} ${h}%,transparent ${h}%)"></i>`; },
  /* tabung ukur tegak: pita ambang di dalam tabung, sumbu cm di kiri, label Siaga di kanan, garis air bergelombang; sentuh pita atau air untuk rentangnya */
  skala(x) { const g = PosAir.skalaGeom(x, 170); if (!g) return ""; const T = 8, y = v => +(g.H - Math.max(0, Math.min(v, g.mx)) / g.mx * g.H).toFixed(1), st = [10, 20, 25, 50, 100, 200, 500, 1000].find(q => g.mx / q <= 6) || 1000, ti = [];
    for (let v = 0; v <= g.mx; v += st) ti.push(v);
    const tip = (n, t) => `data-tip="${esc(`<b>${n}</b><br>${t}`)}"`, sat = "cm", ang = v => PosAir.angka(v, sat), top = g.pita.length - 1;
    const rng = (t, i) => i === 0 ? `Rentang: 0 sampai ${ang(g.pita[1].batas)}` : i === top ? `Rentang: di atas ${ang(t.batas)}` : `Rentang: ${ang(t.batas)} sampai ${ang(g.pita[i + 1].batas)}`;
    const gel = yy => `M38,${yy} q5,-4 10,0 t10,0 t10,0 t10,0 V${g.H} H38 Z`, c = PosAir.cmNilai(x);
    return `<svg viewBox="0 0 190 ${g.H + 2 * T}" width="190" height="${g.H + 2 * T}" role="img" aria-label="Tabung ukur ambang"><defs><clipPath id="paTb"><rect x="38" y="0" width="40" height="${g.H}" rx="20"/></clipPath></defs><g transform="translate(0,${T})">
      <g clip-path="url(#paTb)">${g.pita.map((t, i) => `<rect x="38" y="${t.y0}" width="40" height="${Math.max(0, t.y1 - t.y0)}" fill="${t.warna}" opacity=".4" ${tip(t.nama, rng(t, i))}/>`).join("")}${g.yAir == null ? "" : `<path d="${gel(g.yAir)}" fill="#3f7fb8" opacity=".7" ${tip("Tinggi air", "Sekarang: " + ang(c))}/>`}</g>
      <rect x="38" y="0" width="40" height="${g.H}" rx="20" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>
      ${ti.map(v => `<line x1="30" x2="36" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" stroke-opacity=".5"/><text x="27" y="${y(v) + 3.5}" font-size="10" text-anchor="end" opacity=".7">${PosAir.angkaId(v)}</text>`).join("")}
      ${g.pita.slice(1).map(t => `<line x1="78" x2="86" y1="${t.y1}" y2="${t.y1}" stroke="${t.warna}" stroke-width="3" stroke-linecap="round"/><text x="90" y="${t.y1 + 4}" font-size="11" font-weight="700" style="fill:${t.warna}">${esc(t.nama.replace("Siaga ", "S"))} ${PosAir.angka(t.batas, sat)}</text>`).join("")}
      ${g.yAir == null ? "" : `<line x1="34" x2="82" y1="${g.yAir}" y2="${g.yAir}" stroke="#1d5aa0" stroke-width="1.5" stroke-dasharray="3 2"/>`}</g></svg>`; },
  /* kartu di laci kiri: isi ringan langsung, grafik menyusul sesudah satu frame */
  buka(id, terbang, asal) {
    const x = this.cari(id); if (!x) return; const w = PosAir.redup(x.status) ? "#7a8796" : PosAir.warnaPos(x), u = PosAir.satuan(x.satuan), a = PosAir.arah(x.d3, x.satuan);
    if (terbang) { const [lo, la] = PosAir.titik(x); peta.flyTo({center: [lo, la], zoom: Math.max(peta.getZoom(), 10), padding: kiriPad()}); }
    this.pilih(x); this._g = x.id; const nb = PosAir.menujuBatas(x);
    const sg = x.ambang ? [["Siaga 3", x.ambang.siaga3], ["Siaga 2", x.ambang.siaga2], ["Siaga 1", x.ambang.siaga1]] : [];
    const isi = `${asal ? `<button class="tb" data-semua style="justify-self:start">‹ Semua pos</button>` : ""}<small>${esc(PosAir.subjudul(x))}</small>
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><b style="font-size:34px;line-height:1;color:${w}">${PosAir.angkaId(x.v)}</b>${u ? `<span style="font-size:15px;color:var(--ink2)">${esc(u)}</span>` : ""}<span style="margin-left:auto;display:flex;align-items:center;gap:8px">${a ? `<small>${a}</small>` : ""}${this.pilPos(x)}</span></div>
      ${nb && !PosAir.redup(x.status) ? `<p class="fnd" style="margin:0"><b>${PosAir.angkaId(nb.cm)} cm</b> lagi ke batas ${nb.nama}</p>` : ""}
      ${this.skala(x)}
      <table class="tb2"><tbody>${sg.map(([n, v]) => `<tr><td>${n}</td><td class="n">${PosAir.angka(v, "cm")}</td></tr>`).join("")}<tr><td>Perubahan 3 jam</td><td class="n"><span class="${PosAir.deltaKelas(x.d3)}" style="color:${x.d3 > 0 ? "#c9503a" : x.d3 < 0 ? "#3f7fb8" : "inherit"}">${PosAir.delta(x.d3, x.satuan)}</span></td></tr>${x.t != null ? `<tr><td>Dibaca</td><td class="n">${PosAir.waktuBaca(x.t).replace("Dibaca ", "")}</td></tr>` : ""}<tr><td>Pengelola</td><td class="n">${esc(PosAir.pengelola(x))}</td></tr></tbody></table>
      <div id="paGrafik"></div>`;
    Analisa.buka(isi, `<div><h3 id="dlgJudul">${esc(x.nama)}</h3><p>Pos tinggi air</p></div>`);
    nanti(() => this.grafik(x)); },
  /* tepi gelap di pos terpilih */
  pilih(x) { const [lo, la] = x ? PosAir.titik(x) : [0, 0]; peta.getSource("pos-pilih")?.setData({type: "FeatureCollection", features: x ? [{type: "Feature", geometry: {type: "Point", coordinates: [lo, la]}, properties: {}}] : []}); },
  async grafik(x) {
    const r = await fetch("/api/banjir/sungai-ukur/pos/" + encodeURIComponent(x.id), {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null), el = $("#paGrafik");
    if (this._g !== x.id) return;   /* pos lain dibuka selama menunggu */
    if (!el || !r?.v?.length || r.v.length < 2) return;
    const W = 660, B = 120, L = 46, Rm = 14, v = r.v, ts = (r.t || []).map(PosAir.detik), k = x.satuan === "m" ? 100 : 1, a = x.ambang, ba = a ? [["Normal", 0, a.siaga3], ["Siaga 3", a.siaga3, a.siaga2], ["Siaga 2", a.siaga2, a.siaga1], ["Siaga 1", a.siaga1, 1e9]] : [];
    const sp = Math.max(...v) - Math.min(...v), lo = Math.min(...v) - sp * .1, hi = Math.max(...v) + sp * .1 || lo + 1, m = hi - lo || 1, t0 = ts[0], t1 = ts.at(-1), pakaiT = ts.length === v.length && t1 > t0;
    const X = i => L + (pakaiT ? (ts[i] - t0) / (t1 - t0) : i / (v.length - 1)) * (W - L - Rm), Y = q => B - 10 - Math.max(0, Math.min(1, (q - lo) / m)) * (B - 30);
    const pita = a ? ba.map(([n, l, h]) => { const y0 = Y(h / k), y1 = Y(l / k); return y1 - y0 > .5 ? `<rect x="${L}" y="${y0}" width="${W - L - Rm}" height="${y1 - y0}" fill="${PosAir.RESMI[n][0]}" opacity=".22"/>` : ""; }).join("") : "";
    const grid = [0, 1, 2, 3].map(i => { const q = lo + m * i / 3; return `<line x1="${L}" x2="${W - Rm}" y1="${Y(q)}" y2="${Y(q)}" stroke="currentColor" stroke-opacity=".15"/><text x="${L - 6}" y="${Y(q) + 3.5}" font-size="10" text-anchor="end" opacity=".65">${PosAir.angkaId(q)}</text>`; }).join("");
    const jam = []; if (pakaiT) for (let q = Math.ceil((t0 + 25200) / 21600) * 21600 - 25200; q <= t1; q += 21600) jam.push(q);
    const sumbu = jam.map(q => `<text x="${(L + (q - t0) / (t1 - t0) * (W - L - Rm)).toFixed(1)}" y="${B + 12}" font-size="10" text-anchor="middle" opacity=".65">${PosAir.jamWib(q)}</text>`).join("");
    const lw = Math.max(2, (W - L - Rm) / v.length), n = v.length - 1;
    const kena = v.map((q, i) => `<g class="pg"><line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="6" y2="${B - 10}" stroke="currentColor" stroke-opacity=".5"/><circle cx="${X(i).toFixed(1)}" cy="${Y(q).toFixed(1)}" r="4" fill="#fff" stroke="#3f7fb8" stroke-width="2"/><rect x="${(X(i) - lw / 2).toFixed(1)}" y="0" width="${lw.toFixed(1)}" height="${B}" fill="transparent" data-tip="${esc(`<b>${pakaiT ? PosAir.jamWib(ts[i]) + " WIB" : "Bacaan " + (i + 1)}</b><br>Tinggi: ${PosAir.angka(q, x.satuan)}`)}"/></g>`).join("");
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 2px"><span class="lbl">Beberapa jam terakhir</span><small>${esc(PosAir.satuan(x.satuan) || "cm")}</small></div><svg viewBox="0 0 ${W} ${B + 18}" width="100%" role="img" aria-label="Tinggi air beberapa jam terakhir"><style>.pg>line,.pg>circle{opacity:0;pointer-events:none}.pg:hover>line,.pg:hover>circle{opacity:1}</style>${pita}${grid}
      <path d="${v.map((q, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(q).toFixed(1)).join("")}" fill="none" stroke="#3f7fb8" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="${X(n).toFixed(1)}" cy="${Y(v[n]).toFixed(1)}" r="4.5" fill="#3f7fb8" stroke="#fff" stroke-width="1.5"/>${sumbu}${kena}</svg>`; },
  /* ruas waterway sekitar pos Siaga diwarnai: lapisan garis berfilter within poligon kecil, di bawah garis aliran bergerak */
  ruas() {
    if (!peta.getLayer("alir-gerak")) return; const o = PosAir.ruas(this.D?.pos), base = peta.getLayer("alir-badan");
    for (const k of ["Siaga 3", "Siaga 2", "Siaga 1", "naik"]) { const id = "alir-st-" + k.replace(" ", ""), f = ["all", peta.getFilter("alir-badan"), o[k] ? ["within", o[k]] : ["==", ["literal", 1], 0]];   /* ["==", 1, 0] polos dibaca filter lama oleh MapLibre, seluruh "all" ikut ditolak */
      if (peta.getLayer(id)) peta.setFilter(id, f);
      else peta.addLayer({id, type: "line", source: base.source, "source-layer": "waterway", filter: f, layout: {visibility: this.menyala() ? "visible" : "none", "line-cap": "round", "line-join": "round"},
        paint: {"line-color": PosAir.WARNA_KELAS[k], "line-width": peta.getPaintProperty("alir-badan", "line-width"), "line-opacity": .95}}, "alir-garis"); } },
  /* pasang surut BMKG: kartu dan pin stasiun pantai; berkas belum ada = tidak ada pin */
  async pasut() {
    this.PS ||= await fetch("data/pasut.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null); if (!this.PS?.stasiun?.length || peta.getSource("pasut")) return;
    peta.addSource("pasut", {type: "geojson", data: {type: "FeatureCollection", features: this.PS.stasiun.map(s => ({type: "Feature", geometry: {type: "Point", coordinates: [s.lon, s.lat]}, properties: {id: s.id, nama: s.nama}}))}});
    peta.addLayer({id: "pasut", type: "symbol", source: "pasut", layout: {visibility: this.menyala() ? "visible" : "none", "icon-image": "pa-pasut", "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .5, 9, .8, 13, 1]}});
    peta.on("mouseenter", "pasut", () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", "pasut", () => peta.getCanvas().style.cursor = ""); },
  hitPasut(pt) { const f = peta.getLayer("pasut") && peta.queryRenderedFeatures(pt, {layers: ["pasut"]}); return f?.length ? f[0].properties.id : null; },
  bukaPasut(id) { const s = this.PS?.stasiun?.find(x => x.id === id); if (!s) return; const now = Date.now() / 1000, k = PosAir.pasutSekarang(s, now), pk = PosAir.pasutKartu(s, now);
    const isi = `<div class="lbl">Prediksi pukul ${PosAir.jamWib(now)} WIB</div><div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:34px;line-height:1;color:#2b8c86">${k ? PosAir.angkaId(k.cm) : "–"}</b>${k ? `<span style="font-size:15px;color:var(--ink2)">cm</span><span class="pill" style="margin-left:auto;background:#2b8c86;color:#fff">Sedang ${k.arah}</span>` : ""}</div>
      <table class="tb2"><tbody>${pk.map(x => `<tr><td>${x.jenis}, ${x.hari} ${x.jam} WIB</td><td class="n">${PosAir.angka(x.cm, "cm")}</td></tr>`).join("")}</tbody></table>
      <p class="fnd">Sumber: BMKG Maritim, prediksi pasang surut${this.PS.dibuat ? ", dibuat " + PosAir.tglJamWib(Date.parse(this.PS.dibuat) / 1000) : ""}.</p>`;
    Analisa.buka(isi, `<div><h3 id="dlgJudul">Pasang surut ${esc(s.nama)}</h3><p>${esc(s.prov || "Stasiun pasut BMKG")}</p></div>`); },
  /* jumlah, batang status berlegenda, kalimat, daftar perlu dipantau: dipakai panel nasional dan laci provinsi */
  ringkasHtml(pos) {
    const R = PosAir.ringkas(pos), K = PosAir.WARNA_KELAS, bt = [["Normal", "Normal"], ["Siaga 3", "Siaga 3"], ["Siaga 2", "Siaga 2"], ["Siaga 1", "Siaga 1"], ["mati", "Tidak mengirim"]], pantau = PosAir.perluPantau(pos).slice(0, 20);
    return `<div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:30px;line-height:1">${PosAir.angkaId(R.total)}</b><span>pos tinggi air</span><span style="margin-left:auto">${PosAir.angkaId(R.kirim)} mengirim data</span></div>
      <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin:8px 0 4px">${bt.map(([k]) => R[k] ? `<i style="flex:${R[k]};background:${K[k]}"></i>` : "").join("")}</div>
      <div class="leg" style="margin:0 0 8px">${bt.map(([k, n]) => `<span><i class="sw dot" style="background:${K[k]}"></i>${n} <b>${PosAir.angkaId(R[k])}</b></span>`).join("")}</div>
      <p class="fnd">${esc(PosAir.kalimat(pos))}</p>
      ${pantau.length ? `<div class="lbl" style="margin:8px 0 2px">Perlu dipantau</div>${pantau.map(x => { const q = PosAir.rasio(x); return `<button class="tb" data-pos="${esc(x.id)}" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left">${this.kapsul(x)}<span style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.nama)}</b><small>${esc(PosAir.subjudul(x))}</small>${q == null ? "" : `<i style="display:block;height:3px;border-radius:2px;background:var(--line);margin-top:3px"><i style="display:block;height:3px;border-radius:2px;width:${Math.round(q * 100)}%;background:${PosAir.warnaPos(x)}"></i></i>`}</span><b>${PosAir.angka(x.v, x.satuan)}</b>${this.pilPos(x)}</button>`; }).join("")}` : ""}`; },
  /* laci provinsi: pos di provinsi yang diklik, gaya Oyen; tanpa pos jatuh ke rincian wilayah. Kerangka urgent, daftar menyusul satu frame */
  provinsi(kunci, geom) {
    if (kunci) this._prov = {kunci, nama: namaProv(kunci), pos: PosAir.dalam(this.D?.pos, geom)};
    const pr = this._prov; if (!pr) return; if (!pr.pos.length) return Analisa.wilayah(pr.kunci);
    this._g = null; this.pilih(null);
    Analisa.buka(`<div id="paProv"></div>`, `<div><h3 id="dlgJudul">${esc(pr.nama)}</h3><p>Pos tinggi air</p></div>`);
    nanti(() => { const el = $("#paProv"); if (!el || this._prov !== pr) return;
      el.innerHTML = this.ringkasHtml(pr.pos) + `<div class="lbl" style="margin:8px 0 2px">Per sungai</div>` + PosAir.kelompok(pr.pos).map(([k, l]) => `<details><summary>${esc(k)} <small>${PosAir.angkaId(l.length)} pos</small></summary>${this.baris(l)}</details>`).join(""); }); },
  /* panel ringkas di kiri: jumlah, batang bertumpuk, kalimat, perlu dipantau, per sungai, pos tidak mengirim */
  daftar() {
    let el = $("#posPanel");
    if (!el) { el = document.createElement("details"); el.id = "posPanel"; el.className = "lipat"; el.open = true; $("#rows").after(el);
      el.addEventListener("click", e => { const b = e.target.closest("[data-pos]"); if (b) this.buka(b.dataset.pos, true); });
      el.addEventListener("toggle", e => { const d = e.target; if (d.dataset.g != null && d.open && !d.dataset.isi) { d.dataset.isi = 1; d.querySelector(".gr").innerHTML = this.baris(this.grup[+d.dataset.g][1]); } }, true); }
    const pos = this.D?.pos; el.hidden = !pos?.length || !this.menyala(); if (el.hidden) return;
    this.grup = PosAir.kelompok(pos); const now = Date.now() / 1000;
    el.innerHTML = `<summary>Pos tinggi air</summary><div class="isi" style="max-height:46vh;overflow:auto">
      ${this.ringkasHtml(pos)}
      <div class="lbl" style="margin:8px 0 2px">Per sungai</div>${this.grup.map(([k, l], i) => `<details data-g="${i}"><summary>${esc(k)} <small>${PosAir.angkaId(l.length)} pos</small></summary><div class="gr"></div></details>`).join("")}
      ${PosAir.macetPerPengelola(pos).map(([k, l]) => `<details><summary>Tidak mengirim, ${esc(k)} <small>${PosAir.angkaId(l.length)} pos</small></summary>${l.map(p => `<button class="tb" data-pos="${esc(p.id)}" style="display:flex;justify-content:space-between;gap:8px;width:100%"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.nama)}</span><small style="white-space:nowrap">${PosAir.lalu(p.t, now)}</small></button>`).join("")}</details>`).join("")}
      <p class="fnd">${esc(PosAir.kakiPanel(pos))}</p></div>`; },
  baris(l) { return l.map(x => `<button class="tb" data-pos="${esc(x.id)}" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left">${this.kapsul(x)}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.nama)}</span><b style="color:${PosAir.redup(x.status) ? "#7a8796" : "inherit"}">${PosAir.angka(x.v, x.satuan)}</b>${this.pilPos(x)}</button>`).join(""); },
  async mulai() { await this.muat(); const sm = peta.getSource("pos"); sm ? sm.setData(PosAir.geojson(this.D?.pos)) : this.lapis(); this.ruas(); this.daftar(); nanti(() => this.pasut()); },
};
/* data dimuat sesudah peta siap; segar lagi saat tab kembali terlihat dan data lebih tua dari 5 menit */
document.addEventListener("visibilitychange", () => { if (!document.hidden && PosUkur.D && Date.now() - PosUkur.t0 > 3e5) { PosUkur.p = null; PosUkur.muat().then(() => { peta?.getSource("pos")?.setData(PosAir.geojson(PosUkur.D?.pos)); PosUkur.ruas(); PosUkur.daftar(); }); } });
