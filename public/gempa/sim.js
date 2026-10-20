"use strict";
/* ================================================================ simulasi "bagaimana jika" gempa & tsunami (tab /gempa/sim)
   Sim.render() menggambar ke #sim. Rangka: peta penuh + panel kiri (lembar bawah di HP) + bilah waktu, rupa /sim karhutla.
   Guncangan = guncangan.js (GMPE + MMI, tidak diubah) dengan jarak ke bidang patahan; gelombang P 6,5 km/s dan S 3,7 km/s;
   tsunami = tsunami.js (waktu tiba, tinggi indikatif Abe 1995 + Green, persamaan air dangkal linear untuk animasi).
   Semua klik menunda kerja berat ke nanti(); animasi lewat requestAnimationFrame dengan anggaran langkah per frame.
   Simulasi, bukan prakiraan: tidak ada yang di sini meramal gempa. */
const Sim = (() => {
  /* /gempa/sim?lat=&lon=&m=&dalam= (tombol "Simulasikan" di laci): dibaca saat skrip dimuat, sebelum bukaTab mengganti URL */
  const URL0 = (() => { const q = new URLSearchParams(location.search), v = k => q.has(k) && q.get(k) !== "" ? +q.get(k) : NaN;
    const o = {lat: v("lat"), lon: v("lon"), m: v("m"), dalam: v("dalam")}; return Number.isFinite(o.lat) && Number.isFinite(o.lon) ? o : null; })();
  const VP = 6.5, VS = 3.7, RAD = Math.PI / 180, ANGGARAN_MS = 6, MENIT_TS = 180, CEK_S = 1200; /* titik simpan tiap 20 menit sim (~2 MB sekali simpan) */
  const IK = {
    putar: '<path d="M7 5v14l12-7z"/>', jeda: '<path d="M8 5v14M16 5v14"/>', ulang: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
    miring: '<path d="M3 18 12 6l9 12z"/><path d="M7.5 12h9"/>' };
  const ikon = (d, l) => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>${l ? `<span>${l}</span>` : ""}`;
  /* skenario dikenal: garis = jejak sesar (perkiraan dari peta PuSGeN 2017/literatur); "parit" = indeks fitur subduksi di sesar.geojson + bujur pusat */
  const DIKENAL = [
    {id: "lembang", n: "Sesar Lembang", jenis: "geser", m: 6.8, dalam: 10, garis: [[107.53, -6.815], [107.62, -6.828], [107.73, -6.838]]},
    {id: "cimandiri", n: "Sesar Cimandiri", jenis: "geser", m: 6.9, dalam: 10, garis: [[106.53, -7.0], [106.75, -6.95], [106.95, -6.89]]},
    {id: "opak", n: "Sesar Opak, Yogyakarta", jenis: "geser", m: 6.6, dalam: 10, garis: [[110.28, -8.01], [110.37, -7.9], [110.46, -7.79]]},
    {id: "palukoro", n: "Sesar Palu-Koro", jenis: "geser", m: 7.5, dalam: 10, garis: [[119.84, -0.55], [119.87, -0.95], [119.98, -1.35], [120.12, -1.75]]},
    {id: "flores", n: "Sesar naik belakang busur Flores", jenis: "naik", m: 7.8, dalam: 20, garis: [[119.6, -7.7], [121.0, -7.75], [122.4, -7.75]]},
    {id: "jawa", n: "Megathrust selatan Jawa", jenis: "subduksi", m: 8.5, dalam: 25, parit: [79, 110.6]},
    {id: "mentawai", n: "Megathrust Mentawai", jenis: "subduksi", m: 8.8, dalam: 25, parit: [76, 99.3]},
    {id: "sumba", n: "Megathrust selatan Bali-Sumba", jenis: "subduksi", m: 8.3, dalam: 25, parit: [80, 116.5]},
  ];
  const LAJU = [["lambat", "Lambat", 1, 60], ["sedang", "Sedang", 5, 180], ["cepat", "Cepat", 20, 600]];
  const MMI_W = typeof MMI_WARNA !== "undefined" ? MMI_WARNA : ["", "#d8d2b8", "#d8d2b8", "#e3c77a", "#e0a64f", "#d4802f", "#c9503a", "#a83a2a", "#8f2a1e", "#8f2a1e", "#6e1d14", "#6e1d14", "#6e1d14"];
  const rom = v => (typeof ROMAWI !== "undefined" ? ROMAWI : ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"])[Math.min(12, Math.max(1, Math.round(v)))];
  const mT = m => "M " + Number(m).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  const des = (v, n = 1) => Number(v).toLocaleString("id-ID", {maximumFractionDigits: n});
  const jiwa = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const pilMmi = v => `<span class="sm-mmi" style="--w:${MMI_W[Math.round(v)] || MMI_W[1]};color:${v < 3.5 ? "#3b3320" : "#fff"}">${rom(v)}</span>`;
  /* waktu tiba tampil "sekitar N menit" (kelipatan 5), bukan menit pasti */
  const sekitar = m => m < 1 ? "langsung" : m < 5 ? "kurang dari 5 menit" : `sekitar ${fmt(Math.round(m / 5) * 5)} menit`;
  /* lama berjalan: tidak pernah "langsung" */
  const lamanya = m => m < 5 ? "kurang dari 5 menit" : `sekitar ${fmt(Math.round(m / 5) * 5)} menit`;
  const jamSim = t => t < 120 ? `${fmt(Math.floor(t))} dtk` : `${fmt(Math.floor(t / 60))} mnt${t < 3600 ? ` ${String(Math.floor(t % 60)).padStart(2, "0")} dtk` : ""}`;
  const km2 = (la1, lo1, la2, lo2) => { const x = (lo2 - lo1) * RAD * 6371 * Math.cos((la1 + la2) / 2 * RAD), y = (la2 - la1) * RAD * 6371; return Math.hypot(x, y); };
  const azimut = (a, b) => (Math.atan2((b[0] - a[0]) * Math.cos((a[1] + b[1]) / 2 * RAD), b[1] - a[1]) / RAD + 360) % 360;
  const geser = (lat, lon, az, km) => [lat + km * Math.cos(az * RAD) / 111.19, lon + km * Math.sin(az * RAD) / (111.19 * Math.cos(lat * RAD))];
  const panjang = g => g.slice(1).reduce((s, p, i) => s + km2(g[i][1], g[i][0], p[1], p[0]), 0);
  /* titik di garis pada pecahan f panjangnya, berikut arah segmennya */
  const diGaris = (g, f) => { let sisa = panjang(g) * f;
    for (let i = 0; i < g.length - 1; i++) { const d = km2(g[i][1], g[i][0], g[i + 1][1], g[i + 1][0]);
      if (sisa <= d || i === g.length - 2) { const u = d ? Math.min(1, sisa / d) : 0; return {lat: g[i][1] + u * (g[i + 1][1] - g[i][1]), lon: g[i][0] + u * (g[i + 1][0] - g[i][0]), strike: azimut(g[i], g[i + 1])}; }
      sisa -= d; } };
  const terdekatGaris = (g, lat, lon) => { let best = null;
    for (let i = 0; i < g.length - 1; i++) { const k = Math.cos(lat * RAD), ax = (g[i][0] - lon) * k, ay = g[i][1] - lat, bx = (g[i + 1][0] - lon) * k, by = g[i + 1][1] - lat, dx = bx - ax, dy = by - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0, d = Math.hypot(ax + t * dx, ay + t * dy) * 111.19;
      if (!best || d < best.km) best = {km: d, lat: g[i][1] + t * (g[i + 1][1] - g[i][1]), lon: g[i][0] + t * (g[i + 1][0] - g[i][0]), strike: azimut(g[i], g[i + 1])}; }
    return best; };
  const lingkaran = (lat, lon, km) => { const c = []; for (let a = 0; a <= 360; a += 4) { const p = geser(lat, lon, a, km); c.push([p[1], p[0]]); } return c; };

  const S = {dom: false, peta: null, D: null, sk: null, hasil: null, t: 0, putar: false, laju: "sedang", basi: false, raf: 0, miring: false, gem: [], pilih: "lembang"};

  /* ---------- data ---------- */
  let janji = null;
  const muat = () => janji ||= (async () => {
    if (typeof GempaGuncangan === "undefined") throw new Error("guncangan.js belum dimuat");
    const [model, sesar, pusat, pend, fas, grid] = await Promise.all([muatJSON("data/model_guncangan.json"), muatJSON("data/sesar.geojson"),
      muatJSON("../banjir/data/pusat_kec.json"), muatJSON("../data/penduduk.json"), muatJSON("../data/fasilitas.json"), Tsunami.muat("data/")]);
    const M = GempaGuncangan.pasang(model), cari = Tsunami.pencariKec(pusat, 60);
    /* nama sesar GEM kosong: "<jenis> <panjang> km dekat <kabupaten>" dari pusat kecamatan terdekat titik tengahnya */
    S.gem = sesar.features.map((f, i) => { const g = f.geometry.coordinates, c = diGaris(g, .5), k = cari(c.lat, c.lon), L = panjang(g);
      return {id: "gem" + i, i, jenis: f.properties.jenis, garis: g, L, n: `Sesar ${f.properties.jenis} ${fmt(Math.round(L))} km${k ? " dekat " + k.split("|")[1] : ""}`}; })
      .filter(s => s.jenis !== "pemekaran").sort((a, b) => a.n.localeCompare(b.n, "id"));
    /* fasilitas.json & sekolah.json baru mencakup provinsi karhutla: kartu fasilitas hanya untuk provinsi yang tercakup */
    return {model, M, sesar, pusat, pend: pend.kec || {}, rs: fas.filter(f => f.t === "rs"), provFas: new Set(fas.map(f => f.prov)), grid, cari, sekolah: null}; })().catch(e => { janji = null; throw e; });
  /* ---------- pekerja latar (Web Worker): waktu tiba tsunami (~100-500 ms) dan sekolah.json (7 MB) tidak menahan klik.
     Gagal membuat Worker (CSP, peramban lama) = jatuh ke utas utama lewat nanti(). */
  const KODE_PEKERJA = `let G = null, P = null;
self.onmessage = async e => { const d = e.data;
  try {
    if (d.tugas === "awal") { importScripts(d.src); G = Tsunami.dariBuffer(d.meta, d.buf); P = d.pusat; postMessage({id: d.id}); return; }
    if (d.tugas === "tiba") { const r = Tsunami.waktuTiba(G, d.lat, d.lon, d.m, Object.assign({}, d.opsi, {pusat: P})); postMessage({id: d.id, r}, r ? [r.menit.buffer] : []); return; }
    if (d.tugas === "sekolah") { const j = await (await fetch(d.url)).json(), c = j.kolom, iLa = c.indexOf("lat"), iLo = c.indexOf("lon"), iN = c.indexOf("nama"), iK = c.indexOf("kab"), iP = c.indexOf("prov"), k = d.kotak;
      postMessage({id: d.id, r: j.baris.filter(b => b[iLa] != null && d.prov.includes(b[iP]) && b[iLa] > k[0] && b[iLa] < k[1] && b[iLo] > k[2] && b[iLo] < k[3]).map(b => [b[iLa], b[iLo], b[iN], b[iK], b[iP]])}); }
  } catch (err) { postMessage({id: d.id, galat: String(err && err.message || err)}); } };`;
  let pekerja = null, nomor = 0; const tunggu = new Map();
  const kirim = (pesan, pindahkan) => new Promise((ok, gagal) => { const id = ++nomor; tunggu.set(id, [ok, gagal]); pekerja.postMessage({...pesan, id}, pindahkan || []); });
  const siapPekerja = () => S.pekerjaJanji ||= (async () => {
    const src = document.querySelector('script[src*="tsunami.js"]')?.src; if (!src || typeof Worker === "undefined") return false;
    try { pekerja = new Worker(URL.createObjectURL(new Blob([KODE_PEKERJA], {type: "text/javascript"})));
      pekerja.onmessage = e => { const t = tunggu.get(e.data.id); if (!t) return; tunggu.delete(e.data.id); e.data.galat ? t[1](new Error(e.data.galat)) : t[0](e.data.r); };
      const G = S.D.grid; await kirim({tugas: "awal", src, meta: G.meta, buf: G.z.buffer.slice(0), pusat: S.D.pusat}); return true; }
    catch (e) { console.warn("pekerja tsunami tidak tersedia, dihitung di utas utama", e); pekerja = null; return false; } })();
  const lepas = () => new Promise(r => nanti(r));
  async function waktuTibaLatar(sk) {
    const opsi = {dalam: sk.dalam, jenis: sk.jenis, strike: sk.strike, maksMenit: MENIT_TS};
    if (await siapPekerja()) try { return await kirim({tugas: "tiba", lat: sk.lat, lon: sk.lon, m: sk.m, opsi}); } catch (e) { console.warn(e); }
    await lepas(); return Tsunami.waktuTiba(S.D.grid, sk.lat, sk.lon, sk.m, {...opsi, pusat: S.D.pusat});
  }
  /* sekolah: disaring di pekerja (provinsi tercakup + kotak jendela); tanpa pekerja, diurai saat peramban menganggur */
  async function sekolahLatar(prov, kotak) {
    const url = new URL("../data/sekolah.json", document.baseURI).href;
    if (await siapPekerja()) try { return await kirim({tugas: "sekolah", url, prov, kotak}); } catch (e) { console.warn(e); }
    await new Promise(r => (window.requestIdleCallback || setTimeout)(r));
    const d = await muatJSON(url), c = d.kolom, iLa = c.indexOf("lat"), iLo = c.indexOf("lon"), iN = c.indexOf("nama"), iK = c.indexOf("kab"), iP = c.indexOf("prov");
    return d.baris.filter(b => b[iLa] != null && prov.includes(b[iP]) && b[iLa] > kotak[0] && b[iLa] < kotak[1] && b[iLo] > kotak[2] && b[iLo] < kotak[3]).map(b => [b[iLa], b[iLo], b[iN], b[iK], b[iP]]);
  }

  /* ---------- skenario ---------- */
  const sumber = id => DIKENAL.find(s => s.id === id) || S.gem.find(s => s.id === id);
  const jenisG = sk => sk.jenis === "subduksi" ? (sk.dalam >= 50 ? "intraslab" : "antarmuka") : "kerak";
  /* M bawaan sesar GEM dari panjangnya (Wells & Coppersmith 1994, semua jenis), 6,0-8,0; subduksi 8,5 */
  const mBawaan = s => s.m || (s.jenis === "subduksi" ? 8.5 : Math.round(Math.min(8, Math.max(6, (Math.log10(s.L) + 2.44) / .59)) * 10) / 10);
  /* titik pusat & arah. Subduksi: titik di parit, bidang patahan digeser ke arah darat setengah lebarnya (sisi yang lebih tinggi di grid) */
  function bentuk(src, m, dalam, titik) {
    let garis = src.garis, p;
    if (src.parit) { garis = S.D.sesar.features[src.parit[0]].geometry.coordinates; p = titik || terdekatGaris(garis, -9, src.parit[1]);
      const t2 = titik ? p : (() => { let b = null; for (let f = 0; f <= 1; f += .01) { const q = diGaris(garis, f); if (!b || Math.abs(q.lon - src.parit[1]) < Math.abs(b.lon - src.parit[1])) b = q; } return b; })(); p = t2; }
    else p = titik || diGaris(garis, .5);
    const sk = {src: src.id, n: src.n, jenis: src.jenis, garis, m, dalam, strike: p.strike, lat: p.lat, lon: p.lon, parit: [p.lat, p.lon]};
    if (src.jenis === "subduksi") {
      const r = Tsunami.rupture({lat: p.lat, lon: p.lon, m, jenis: "subduksi", strike: p.strike}), G = S.D.grid;
      const sisi = [90, -90].map(d => { const q = geser(p.lat, p.lon, p.strike + d, 150); return [d, Tsunami.nilai(G, q[0], q[1]) ?? -9999]; }).sort((a, b) => b[1] - a[1])[0][0];
      const c = geser(p.lat, p.lon, p.strike + sisi, r.Wh / 2); sk.lat = c[0]; sk.lon = c[1];
    }
    sk.e = {lat: sk.lat, lon: sk.lon, m, dalam, jenis: sk.jenis, strike: sk.strike};
    sk.r = Tsunami.rupture(sk.e);
    return sk;
  }

  /* ---------- hitung dampak ---------- */
  function hitung(sk) {
    const D = S.D, M = D.M, w = D.model.param.wells_coppersmith94, lw4 = Math.pow(10, w.a + w.b * sk.m) / 4, jg = jenisG(sk), r = sk.r;
    /* guncangan.js memakai Rjb = jarak - L/4 dari pusat; di sini jarak diganti jarak ke bidang patahan, jadi L/4 dikembalikan dulu */
    const mmiDi = (la, lo) => M.mmi(sk.m, Tsunami.jarakRupture(r, la, lo) + lw4, sk.dalam, jg);
    const tDi = (la, lo, v) => Math.hypot(km2(sk.lat, sk.lon, la, lo), sk.dalam) / v;
    const win = M.jendelaKm(sk.m, sk.dalam, jg) + Math.max(r.L, r.Wh) / 2;
    /* raster MMI <= 210 x 210 sel */
    const degLa = win / 111.19, degLo = win / (111.19 * Math.cos(sk.lat * RAD)), d = Math.max(.01, 2 * Math.max(degLa, degLo) / 210);
    const nx = Math.ceil(2 * degLo / d), ny = Math.ceil(2 * degLa / d), lat0 = sk.lat - degLa, lon0 = sk.lon - degLo;
    const mmi = new Float32Array(nx * ny), tS = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const la = lat0 + (j + .5) * d, lo = lon0 + (i + .5) * d, k = j * nx + i, z = Tsunami.nilai(D.grid, la, lo);
      mmi[k] = z == null || z < 0 ? 0 : mmiDi(la, lo); tS[k] = tDi(la, lo, VS); } /* laut tidak diwarnai: guncangan yang dirasakan orang di darat */
    const ras = {nx, ny, lat0, lon0, d, mmi, tS, kotak: [lon0, lat0, lon0 + nx * d, lat0 + ny * d]};
    /* kecamatan: MMI, waktu P/S, penduduk WorldPop */
    const kec = [], perKelas = new Array(13).fill(0);
    for (const [k, [la, lo]] of Object.entries(D.pusat)) { if (km2(sk.lat, sk.lon, la, lo) > win) continue;
      const v = mmiDi(la, lo), p = D.pend[k] || 0, [prov, kab, nm] = k.split("|"), nama = nm && nm !== "None" ? nm : kab; if (v < 2) continue;
      kec.push({k, prov, kab, nama, lat: la, lon: lo, mmi: v, tP: tDi(la, lo, VP), tS: tDi(la, lo, VS), p}); perKelas[Math.round(v)] += p; }
    kec.sort((a, b) => b.mmi - a.mmi);
    /* kota untuk ilustrasi peringatan dini: kecamatan berpenduduk terbanyak per kabupaten/kota */
    const kota = {}; kec.forEach(c => { const a = kota[c.prov + "|" + c.kab]; if (!a || c.p > a.p) kota[c.prov + "|" + c.kab] = c; });
    const provKuat = new Set(kec.filter(c => c.mmi >= 6.5).map(c => c.prov)), provAda = [...provKuat].filter(p => D.provFas.has(p));
    const rs = D.rs.filter(f => provAda.includes(f.prov) && Math.abs(f.lat - sk.lat) < degLa && Math.abs(f.lon - sk.lon) < degLo).map(f => ({...f, mmi: mmiDi(f.lat, f.lon)})).filter(f => f.mmi >= 6.5);
    const H = {ras, kec, perKelas, provKuat, provAda, kota: Object.values(kota).filter(c => c.mmi >= 4).sort((a, b) => a.tS - b.tS), rs, sekolah: null, win, mmiDi,
      tSelesai: Math.hypot(win, sk.dalam) / VS + 4, ts: null, evak: []};
    H.kotakSekolah = [sk.lat - degLa, sk.lat + degLa, sk.lon - degLo, sk.lon + degLo];
    return H;
  }

  /* tsunami: waktu tiba per pantai, stepper, jalur evakuasi dari kecamatan pesisir rendah dan RS ke tanah >= 20 m */
  /* tiga potong kerja dengan jeda di antaranya; basi() = skenario sudah diganti, hasil lama dibuang */
  async function hitungTsunami(sk, H, basi) {
    const G = S.D.grid;
    if (!Tsunami.layak(sk.e, G)) { H.ts = {layak: false, alasan: sk.m < 6.5 ? "kekuatan di bawah M 6,5" : Tsunami.faktorDalam(sk.dalam, sk.jenis) <= 0 ? `pusatnya terlalu dalam untuk mengangkat dasar laut (batas ${sk.jenis === "subduksi" ? 50 : 40} km)` : "bidang patahannya lebih dari 20 km dari laut"}; return; }
    const wt = await waktuTibaLatar(sk); if (basi() || !wt) return;
    await lepas(); if (basi()) return;
    const swe = Tsunami.swe(G, sk.r, {radiusKm: sk.m >= 8 ? 1100 : 700}), cek = [swe.simpan()];
    await lepas(); if (basi()) return;
    /* waktu tiba terdekat dari sel laut <= 2 sel (~11 km) */
    /* evakuasi memakai waktu tiba sisi aman: mentah x 0,61 (rasio SWE/Dijkstra terkecil yang teramati), bukan 0,85 tampilan */
    const AMAN = Tsunami.SISI_AMAN / Tsunami.KALIBRASI;
    const tibaDi = (la, lo) => { const j0 = Math.round((la - G.lat0) / G.d), i0 = Math.round((lo - G.lon0) / G.d); let t = Infinity;
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const j = j0 + a, i = i0 + b; if (j >= 0 && i >= 0 && j < G.ny && i < G.nx) t = Math.min(t, wt.menit[j * G.nx + i]); } return t * AMAN; };
    const kandidat = [];
    for (const [k, [la, lo]] of Object.entries(S.D.pusat)) { if (Math.abs(la - sk.lat) > 12 || Math.abs(lo - sk.lon) > 14) continue;
      const z = Tsunami.nilai(G, la, lo); if (z == null || z > 10) continue; const tb = tibaDi(la, lo); if (tb > MENIT_TS) continue;
      const [, kab, nama] = k.split("|"); kandidat.push({nama, kab, lat: la, lon: lo, z, tiba: tb, rs: false}); }
    S.D.rs.forEach(f => { const z = Tsunami.nilai(G, f.lat, f.lon); if (z == null || z > 10) return; const tb = tibaDi(f.lat, f.lon); if (tb <= MENIT_TS) kandidat.push({nama: f.nama, kab: "", lat: f.lat, lon: f.lon, z, tiba: tb, rs: true}); });
    /* yang tingginya berarti saja: tinggi indikatif atas di pantai terdekat >= 0,5 m */
    const tinggiDi = (la, lo) => { let b = null; for (const p of wt.pantai) { if (Math.abs(p.lat - la) > .15 || Math.abs(p.lon - lo) > .15) continue; if (!b || p.tinggi_hi > b.tinggi_hi) b = p; } return b; };
    H.evak = kandidat.map(c => { const p = tinggiDi(c.lat, c.lon); if (!p || p.tinggi_hi < .5) return null;
      const tuju = Tsunami.tempatTinggi(G, c.lat, c.lon, 20, 40); if (!tuju) return {...c, tuju: null, km: null, jalan: null, tinggi: p, sempat: false, tanpaTujuan: true};
      const km = tuju.km * 1.3; /* faktor belok jalan 1,3 */
      return {...c, tuju, km, jalan: [km / 5 * 60, km / 4 * 60, km / 2.5 * 60], tinggi: p, sempat: km / 4 * 60 < c.tiba}; }).filter(Boolean)
      .sort((a, b) => !!b.tanpaTujuan - !!a.tanpaTujuan || a.sempat - b.sempat || a.tiba - b.tiba);
    H.ts = {layak: true, wt, swe, cek};
  }

  /* ---------- panel ---------- */
  function opsiSumber() {
    const o = (s, grup) => `<option value="${s.id}" ${s.id === S.pilih ? "selected" : ""}>${esc(s.n)}</option>`;
    return `<optgroup label="Skenario dikenal">${DIKENAL.map(o).join("")}</optgroup><optgroup label="Sesar aktif (GEM)">${S.gem.map(o).join("")}</optgroup>`;
  }
  /* kontrol dibangun sekali; sesudahnya panel() hanya memperbarui nilai dan #smHasil (fokus & menu pilih tidak hilang) */
  function panel() {
    const el = $("#simPanel"), sk = S.sk, H = S.hasil;
    if (!$("#smSumber")) kontrol(el);
    $("#smJudul").textContent = `${sk.n} ${mT(sk.m)}`;
    const sel = $("#smSumber"); if (sel.value !== S.pilih) { sel.value = S.pilih; typeof PilihCantik !== "undefined" && PilihCantik.label(sel); }
    [["smM", sk.m, mT(sk.m)], ["smH", sk.dalam, fmt(sk.dalam) + " km"]].forEach(([id, v, t]) => { const i = $("#" + id); if (document.activeElement !== i) i.value = v; $("#" + id + "V").textContent = t; });
    $("#smJalan").textContent = H ? (S.basi ? "Jalankan ulang" : "Ulang dari awal") : "Jalankan simulasi";
    $("#smHasil").innerHTML = H && !S.basi ? hasilHtml() : "";
    $("#smHasil").querySelectorAll("[data-ke]").forEach(b => b.onclick = () => { const [la, lo] = b.dataset.ke.split(",").map(Number); S.peta.easeTo({center: [lo, la], zoom: Math.max(S.peta.getZoom(), 8)}); });
  }
  function kontrol(el) {
    const sk = S.sk;
    el.innerHTML = `<button class="sm-gagang" id="smGagang" aria-label="Perbesar atau perkecil panel"></button><div class="sm-pita"><span class="pill sm-bukan">Simulasi, bukan prakiraan</span></div>
      <h2 id="smJudul"></h2>
      <label class="fld"><span class="lbl">Sumber gempa</span><select id="smSumber" aria-label="Sumber gempa">${opsiSumber()}</select></label>
      <label class="simgeser"><span>Kekuatan</span><input type="range" id="smM" min="5.5" max="9.2" step="0.1" value="${sk.m}" aria-label="Kekuatan"><b class="num" id="smMV">${mT(sk.m)}</b></label>
      <label class="simgeser"><span>Kedalaman</span><input type="range" id="smH" min="5" max="150" step="5" value="${sk.dalam}" aria-label="Kedalaman"><b class="num" id="smHV">${fmt(sk.dalam)} km</b></label>
      <p class="fnd">Klik peta untuk memindah pusat gempa; titik dekat sesar ikut arah dan jenis sesarnya.</p>
      <button class="btn pri" id="smJalan" style="width:100%;margin-top:10px"></button>
      <p class="fnd" id="smStatus" aria-live="polite" style="margin-top:6px"></p>
      <div id="smHasil"></div>`;
    $("#smSumber").onchange = e => { S.pilih = e.target.value; const s = sumber(S.pilih); $("#smStatus").textContent = "Menyiapkan…"; nanti(() => { pasangSkenario(bentuk(s, mBawaan(s), s.dalam || (s.jenis === "subduksi" ? 25 : 10))); jalankan(); }); };
    const ikat = (id, set, t) => { const i = $("#" + id); i.oninput = () => { $("#" + id + "V").textContent = t(+i.value); };
      i.onchange = () => { set(+i.value); nanti(() => S.sk.klik ? pindah(S.sk.klik.lat, S.sk.klik.lon, true, S.sk.tetap) : pasangSkenario(bentuk(sumber(S.sk.src), S.sk.m, S.sk.dalam))); }; };
    ikat("smM", v => S.sk.m = v, mT); ikat("smH", v => S.sk.dalam = v, v => fmt(v) + " km");
    $("#smGagang").onclick = () => el.classList.toggle("lipat");
    $("#smJalan").onclick = () => { $("#smJalan").textContent = "Menghitung…"; nanti(jalankan); };
    if (typeof PilihCantik !== "undefined") PilihCantik.hias?.($("#smSumber"));
  }
  const kartu = (pil, judul, isi, kaki) => `<section class="sm-kartu"><div class="sm-pil">${pil}</div><h3>${judul}</h3>${isi || ""}${kaki ? `<p class="sm-kaki">${kaki}</p>` : ""}</section>`;
  const pil = (t, w) => `<span class="pill sm-p" style="--w:${w}">${t}</span>`;
  function hasilHtml() {
    const sk = S.sk, H = S.hasil, hl = x => `<b class="hl">${x}</b>`, out = [];
    /* 1. penduduk per kelas MMI */
    const kelas = []; for (let v = 10; v >= 4; v--) if (H.perKelas[v] >= 1) kelas.push(v);
    const tujuh = H.perKelas.slice(7).reduce((a, b) => a + b, 0), maks = Math.max(1, ...kelas.map(v => H.perKelas[v]));
    out.push(kartu(pil("Guncangan", "#c9503a"), tujuh ? `${hl(jiwa(tujuh) + " orang")} merasakan guncangan VII atau lebih` : kelas.length ? `Guncangan terkuat di permukiman ${hl("MMI " + rom(kelas[0]))}` : "Tidak ada permukiman yang merasakan guncangan IV atau lebih",
      kelas.length ? `<div class="sm-batang">${kelas.map(v => `<div>${pilMmi(v)}<i><b style="width:${Math.max(1, H.perKelas[v] / maks * 100)}%;background:${MMI_W[v]}"></b></i><span class="num">${rb(H.perKelas[v])}</span></div>`).join("")}</div>` : "",
      "Sumber: WorldPop 2026 per kecamatan; MMI dari model GMPE."));
    /* 2. sekolah & RS di MMI VII+ */
    const ns = H.sekolah ? H.sekolah.length : null;
    if (H.provAda.length) out.push(kartu(pil("Fasilitas", "#a8780c"), ns == null ? `${hl(fmt(H.rs.length))} rumah sakit dan puskesmas di guncangan VII atau lebih; sekolah sedang dimuat` :
      ns || H.rs.length ? `${hl(fmt(ns))} sekolah dan ${hl(fmt(H.rs.length))} rumah sakit atau puskesmas di guncangan VII atau lebih` : "Tidak ada sekolah atau rumah sakit di guncangan VII atau lebih",
      H.rs.length ? `<table class="tb3"><tbody>${H.rs.sort((a, b) => b.mmi - a.mmi).slice(0, 6).map(f => `<tr><td>${esc(f.nama)}</td><td class="n">${pilMmi(f.mmi)}</td></tr>`).join("")}</tbody></table>` : "",
      `Sumber: Dapodik/EMIS, OSM.${H.provAda.length < H.provKuat.size ? ` Data fasilitas baru mencakup ${fmt(H.provAda.length)} dari ${fmt(H.provKuat.size)} provinsi yang terguncang VII atau lebih.` : ""}`));
    /* 3. kecamatan terdampak */
    const k6 = H.kec.filter(c => c.mmi >= 5.5);
    if (H.kec.length) out.push(kartu(pil("Wilayah", "#3f6fa8"), k6.length ? `${hl(fmt(k6.length) + " kecamatan")} di guncangan VI atau lebih` : "Tidak ada kecamatan di guncangan VI atau lebih",
      `<table class="tb3"><thead><tr><th>Kecamatan</th><th class="n">MMI</th><th class="n">Penduduk</th></tr></thead><tbody>${H.kec.slice(0, 8).map(c => `<tr><td><button class="link" data-ke="${c.lat},${c.lon}">${esc(c.nama)}</button><small>${esc(c.kab)}</small></td><td class="n">${pilMmi(c.mmi)}</td><td class="n num">${rb(c.p)}</td></tr>`).join("")}</tbody></table>`));
    /* 4. peringatan dini, ilustrasi */
    if (H.kota.length) { const k = H.kota.filter(c => c.tS - c.tP >= 1).sort((a, b) => b.mmi - a.mmi)[0];
      out.push(kartu(pil("Ilustrasi peringatan dini", "#5a6b85"), k ? `Warga ${esc(k.kab)} punya ${hl(fmt(Math.floor(k.tS - k.tP)) + " detik")} antara gelombang P dan guncangan kuat` : "Guncangan kuat tiba hampir bersamaan dengan gelombang pertama",
        `<table class="tb3"><thead><tr><th>Kota/kabupaten</th><th class="n">MMI</th><th class="n">S tiba</th><th class="n">Jeda P-S</th></tr></thead><tbody>${H.kota.slice(0, 8).map(c => `<tr><td>${esc(c.kab)}</td><td class="n">${pilMmi(c.mmi)}</td><td class="n num">${fmt(Math.round(c.tS))} dtk</td><td class="n num">${fmt(Math.floor(c.tS - c.tP))} dtk</td></tr>`).join("")}</tbody></table>`,
        "Ilustrasi gagasan peringatan dini: belum termasuk waktu deteksi dan siaran."));
    }
    /* 5. tsunami */
    const T = H.ts;
    if (T && !T.layak) out.push(kartu(pil("Tsunami", "#2f6f9f"), "Model ini tidak menghitung tsunami untuk skenario ini", `<p class="sm-1">Alasannya: ${T.alasan}. Status tsunami resmi hanya dari BMKG.</p>`));
    if (T && T.layak) { const pk = T.wt.perKab, p0 = pk[0];
      out.push(kartu(pil("Tsunami", "#2f6f9f"), p0 ? p0.menit < 1 ? `Pantai ${esc(p0.kab)} ${hl("langsung")} terkena karena berada di atas atau tepat di tepi bidang patahan` : `Gelombang pertama tiba di pantai ${esc(p0.kab)} ${hl(sekitar(p0.menit))} sesudah gempa` : `Gelombang tidak mencapai pantai dalam ${MENIT_TS} menit`,
        pk.length ? `<table class="tb3"><thead><tr><th>Pantai</th><th class="n">Tiba</th><th class="n">Tinggi indikatif</th></tr></thead><tbody>${pk.slice(0, 12).map(p => `<tr><td><button class="link" data-ke="${p.lat},${p.lon}">${esc(p.kab)}</button></td><td class="n">${p.menit < 1 ? "langsung, di atas atau tepat di tepi bidang patahan" : sekitar(p.menit)}</td><td class="n num">${des(p.tinggi_lo)} sampai ${des(p.tinggi_hi)} m</td></tr>`).join("")}</tbody></table>${pk.length > 12 ? `<p class="fnd">${fmt(12)} dari ${fmt(pk.length)} kabupaten/kota</p>` : ""}` : "",
        "Rentang tinggi empiris (Abe 1995), bukan angka pasti. Status tsunami resmi hanya dari BMKG."));
      const tidak = H.evak.filter(e => !e.sempat && !e.tanpaTujuan), tanpa = H.evak.filter(e => e.tanpaTujuan);
      if (H.evak.length) out.push(kartu(pil("Evakuasi", "#4d8a5e"), tidak.length ? `${hl(fmt(tidak.length))} dari ${fmt(H.evak.length)} titik pesisir rendah tidak sempat mencapai tanah 20 m berjalan kaki${tanpa.length ? `; ${fmt(tanpa.length)} tanpa tanah 20 m dalam 40 km` : ""}` :
        tanpa.length ? `${hl(fmt(tanpa.length))} dari ${fmt(H.evak.length)} titik pesisir rendah tidak punya tanah 20 m dalam 40 km` : `Semua ${hl(fmt(H.evak.length))} titik pesisir rendah sempat mencapai tanah 20 m berjalan kaki`,
        `<table class="tb3"><thead><tr><th>Titik</th><th class="n">Jalan kaki</th><th class="n">Gelombang paling cepat</th></tr></thead><tbody>${H.evak.slice(0, 12).map(e => `<tr class="${e.sempat ? "" : "sm-tidak"}"><td><button class="link" data-ke="${e.lat},${e.lon}">${esc(e.nama)}</button><small>${e.rs ? "fasilitas kesehatan" : esc(e.kab)}${e.tuju ? ` · ${des(e.km)} km` : " · tidak ada tanah 20 m dalam 40 km"}</small></td><td class="n">${e.jalan ? `${lamanya(e.jalan[1])}${e.jalan[2] >= 7.5 ? `<small>${fmt(Math.max(5, Math.round(e.jalan[0] / 5) * 5))} sampai ${fmt(Math.round(e.jalan[2] / 5) * 5)} menit</small>` : ""}` : "–"}</td><td class="n">${sekitar(e.tiba)}${e.tanpaTujuan ? "<small>tanpa tujuan</small>" : e.sempat ? "" : "<small>tidak sempat</small>"}</td></tr>`).join("")}</tbody></table>`,
        "Jalan kaki 4 km/jam (2,5 sampai 5), jarak lurus x 1,3, tanpa waktu reaksi. Waktu gelombang diambil dari perkiraan tercepat. Garis di peta."));
    }
    out.push(`<p class="fnd sm-metode">Cara menghitung dan batas model ada di <a href="/gempa/metode" id="smMetode">Metode</a>.</p>`);
    return out.join("");
  }

  /* ---------- peta ---------- */
  /* kanvas CPU (willReadFrequently): MapLibre menyalinnya ke tekstur tiap frame, tanpa baca balik GPU */
  const kanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d", {willReadFrequently: true}); return c; };
  /* baris kanvas -> baris raster lat-lon: gambar MapLibre direntang linear dalam Mercator, jadi baris disampel ulang per lintang Mercator */
  const petaBaris = (lat0, d, ny, latS, latN) => { const my = la => Math.log(Math.tan(Math.PI / 4 + la * RAD / 2)), yN = my(latN), yS = my(latS), m = new Int32Array(ny);
    for (let r = 0; r < ny; r++) { const y = yN + (yS - yN) * (r + .5) / ny, la = (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD; m[r] = Math.min(ny - 1, Math.max(0, Math.floor((la - lat0) / d))); } return m; };
  /* ruang peta yang tidak tertutup panel; dibatasi supaya selalu muat */
  const pad = () => { const c = S.peta.getContainer(), w = c.clientWidth, h = c.clientHeight;
    return w <= 900 ? {top: 20, left: 16, right: 16, bottom: Math.min(h * .5, h - 120)} : {top: 30, left: Math.min(420, w - 200), right: 40, bottom: Math.min(110, h - 160)}; };
  const sudut = k => [[k[0], k[3]], [k[2], k[3]], [k[2], k[1]], [k[0], k[1]]];
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const RGB_MMI = MMI_W.map(w => w ? hexRgb(w) : [0, 0, 0]);

  /* satu janji: render() bisa terpanggil dua kali sebelum peta selesai dimuat */
  const siapPeta = () => S.petaJanji ||= buatPeta();
  async function buatPeta() {
    const m = S.peta = new maplibregl.Map({container: "simPeta", style: DASAR(), center: [112, -6], zoom: 5, attributionControl: {compact: true}, dragRotate: false, maxPitch: 60});
    m.touchZoomRotate.disableRotation(); m.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    m.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
    await new Promise(r => m.once("load", r));
    const kos = {type: "FeatureCollection", features: []}, bawah = m.getStyle().layers.find(l => l.type === "symbol")?.id;
    S.cvMmi = kanvas(2, 2); S.cvTs = kanvas(2, 2); S.bawah = bawah;
    ["sm-sesar", "sm-rup", "sm-gel", "sm-pantai", "sm-evak", "sm-pusat"].forEach(id => m.addSource(id, {type: "geojson", data: kos}));
    m.addLayer({id: "sm-sesar", type: "line", source: "sm-sesar", paint: {"line-color": "#d9534f", "line-width": ["case", ["==", ["get", "pilih"], 1], 3, 1], "line-opacity": ["case", ["==", ["get", "pilih"], 1], .95, .45]}});
    m.addLayer({id: "sm-rup", type: "fill", source: "sm-rup", paint: {"fill-color": "#7a3b0b", "fill-opacity": .18, "fill-outline-color": "#7a3b0b"}});
    m.addLayer({id: "sm-gel", type: "line", source: "sm-gel", paint: {"line-color": ["match", ["get", "g"], "P", "#3f6fa8", "#c9503a"], "line-width": ["match", ["get", "g"], "P", 1.6, 2.6], "line-dasharray": [1, 0]}});
    m.addLayer({id: "sm-evak", type: "line", source: "sm-evak", layout: {"line-cap": "round"}, paint: {"line-color": ["case", ["==", ["get", "sempat"], 1], "#2f8a4e", "#c9503a"], "line-width": 2, "line-opacity": .9}});
    m.addLayer({id: "sm-pantai", type: "circle", source: "sm-pantai", paint: {"circle-radius": ["interpolate", ["linear"], ["get", "h"], 0, 3, 3, 6, 10, 10], "circle-color": "#1d4e89", "circle-stroke-color": "#fff", "circle-stroke-width": 1.2, "circle-opacity": ["case", ["==", ["get", "tiba"], 1], 1, 0], "circle-stroke-opacity": ["case", ["==", ["get", "tiba"], 1], 1, 0]}});
    m.addLayer({id: "sm-pusat", type: "circle", source: "sm-pusat", paint: {"circle-radius": 7, "circle-color": "#c9503a", "circle-stroke-color": "#fff", "circle-stroke-width": 2.5}});
    m.on("click", e => { if (S.peta.queryRenderedFeatures(e.point, {layers: ["sm-pantai"]}).length) return; pindah(e.lngLat.lat, e.lngLat.lng); });
    const tip = $("#tip");
    m.on("mousemove", e => { const H = S.hasil; if (!H || S.basi || !tip) return; const f = m.queryRenderedFeatures(e.point, {layers: ["sm-pantai"]})[0], la = e.lngLat.lat, lo = e.lngLat.lng;
      if (f) { const p = f.properties; tip.innerHTML = `<b>${esc(p.kab)}</b><br>tiba ${fmt(Math.round(p.menit))} menit · tinggi ${des(p.lo)} sampai ${des(p.hi)} m`; }
      else { const v = H.mmiDi(la, lo); if (v < 2 || km2(S.sk.lat, S.sk.lon, la, lo) > H.win) { tip.classList.remove("on"); return; }
        tip.innerHTML = `Guncangan <b>MMI ${rom(v)}</b><br>S tiba ${fmt(Math.round(Math.hypot(km2(S.sk.lat, S.sk.lon, la, lo), S.sk.dalam) / VS))} detik`; }
      tip.classList.add("on"); tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.originalEvent.clientX + 14) + "px"; tip.style.top = Math.max(8, e.originalEvent.clientY - tip.offsetHeight - 12) + "px"; });
    m.on("mouseout", () => tip?.classList.remove("on"));
  }

  function lukisStatis() {
    const m = S.peta, sk = S.sk, r = sk.r, kos = {type: "FeatureCollection", features: []};
    m.getSource("sm-sesar").setData({type: "FeatureCollection", features: S.D.sesar.features.map(f => ({type: "Feature", geometry: f.geometry, properties: {pilih: f.geometry.coordinates === sk.garis ? 1 : 0}}))
      .concat(sumber(sk.src)?.garis && !S.gem.some(g => g.garis === sk.garis) ? [{type: "Feature", geometry: {type: "LineString", coordinates: sk.garis}, properties: {pilih: 1}}] : [])});
    /* jejak bidang patahan (proyeksi permukaan) */
    const s = r.strike * RAD, u = [Math.sin(s), Math.cos(s)], v = [Math.cos(s), -Math.sin(s)], titik = [[1, 1], [1, -1], [-1, -1], [-1, 1], [1, 1]].map(([a, b]) => {
      const x = a * r.L / 2 * u[0] + b * r.Wh / 2 * v[0], y = a * r.L / 2 * u[1] + b * r.Wh / 2 * v[1]; return [sk.lon + x / (111.19 * Math.cos(sk.lat * RAD)), sk.lat + y / 111.19]; });
    m.getSource("sm-rup").setData({type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Polygon", coordinates: [titik]}, properties: {}}]});
    m.getSource("sm-pusat").setData({type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Point", coordinates: [sk.lon, sk.lat]}, properties: {}}]});
    ["sm-gel", "sm-pantai", "sm-evak"].forEach(id => m.getSource(id).setData(kos));
    ["sm-mmi", "sm-ts"].forEach(id => { if (m.getLayer(id)) m.removeLayer(id); if (m.getSource(id)) m.removeSource(id); });
  }
  function pasangHasilPeta() {
    const m = S.peta, H = S.hasil, R = H.ras;
    R.baris = petaBaris(R.lat0, R.d, R.ny, R.kotak[1], R.kotak[3]); R.n = -1; pasangKanvas("sm-mmi", S.cvMmi, R.nx, R.ny, R.kotak, .75);
    const T = H.ts;
    if (T?.layak) { const s = T.swe, G = S.D.grid; T.baris = petaBaris(G.lat0 + (s.J0 - .5) * G.d, G.d, s.ny, s.kotak[1], s.kotak[3]);
      pasangKanvas("sm-ts", S.cvTs, s.nx, s.ny, s.kotak, .9);
      m.getSource("sm-pantai").setData({type: "FeatureCollection", features: T.wt.perKab.map((p, i) => ({type: "Feature", id: i, geometry: {type: "Point", coordinates: [p.lon, p.lat]}, properties: {kab: p.kab, menit: p.menit, h: p.tinggi_m, lo: p.tinggi_lo, hi: p.tinggi_hi, tiba: 0}}))});
      m.getSource("sm-evak").setData({type: "FeatureCollection", features: H.evak.filter(e => e.tuju).map(e => ({type: "Feature", geometry: {type: "LineString", coordinates: [[e.lon, e.lat], [e.tuju.lon, e.tuju.lat]]}, properties: {sempat: e.sempat ? 1 : 0}}))}); }
    const k = R.kotak, hp = m.getContainer().clientWidth <= 900, ts = T?.layak ? T.swe.kotak : null, bb = ts && S.sk.m >= 7.5 ? [Math.max(k[0], ts[0] + 3), Math.max(k[1], ts[1] + 3), Math.min(k[2], ts[2] - 3), Math.min(k[3], ts[3] - 3)] : k;
    m.fitBounds([[Math.min(k[0], bb[0]), Math.min(k[1], bb[1])], [Math.max(k[2], bb[2]), Math.max(k[3], bb[3])]], {padding: pad(), duration: 0});
  }
  /* sumber kanvas dibuat ulang tiap ukurannya berubah: MapLibre 4.7 menggambar hitam bila kanvasnya diubah ukurannya sesudah sumber dibuat */
  function pasangKanvas(id, cv, w, h, kotak, op) { const m = S.peta;
    if (m.getLayer(id)) m.removeLayer(id); if (m.getSource(id)) m.removeSource(id);
    cv.width = w; cv.height = h;
    m.addSource(id, {type: "canvas", canvas: cv, coordinates: sudut(kotak), animate: false});
    m.addLayer({id, type: "raster", source: id, paint: {"raster-opacity": op, "raster-fade-duration": 0}}, m.getLayer("sm-sesar") ? "sm-sesar" : S.bawah); }
  /* kanvas dibaca ulang MapLibre hanya saat diputar; sesudah jeda dua frame lagi */
  /* MMI hanya diunggah ulang saat berubah; muka air terus diunggah selama diputar */
  function segarKanvas(ids = ["sm-mmi", "sm-ts"]) { ids.forEach(id => { const s = S.peta.getSource(id); if (!s) return; s.play(); if (id === "sm-mmi" || !S.putar) requestAnimationFrame(() => requestAnimationFrame(() => { if (id === "sm-mmi" || !S.putar) s.pause(); })); }); }

  function lukisWaktu(t) {
    const sk = S.sk, H = S.hasil, m = S.peta; if (!H) return;
    /* muka gelombang P dan S di permukaan */
    const rp = Math.sqrt(Math.max(0, (VP * t) ** 2 - sk.dalam ** 2)), rs = Math.sqrt(Math.max(0, (VS * t) ** 2 - sk.dalam ** 2)), maksR = H.win * 1.05, f = [];
    if (rp > 0 && rp < maksR) f.push({type: "Feature", geometry: {type: "LineString", coordinates: lingkaran(sk.lat, sk.lon, rp)}, properties: {g: "P"}});
    if (rs > 0 && rs < maksR) f.push({type: "Feature", geometry: {type: "LineString", coordinates: lingkaran(sk.lat, sk.lon, rs)}, properties: {g: "S"}});
    m.getSource("sm-gel").setData({type: "FeatureCollection", features: f});
    /* MMI terungkap saat S lewat; gambar ulang hanya bila ada sel baru */
    const R = H.ras; let n = 0; for (let k = 0; k < R.tS.length; k++) if (R.tS[k] <= t) n++;
    if (n !== R.n) { R.n = n; const c = S.cvMmi.getContext("2d"), img = c.createImageData(R.nx, R.ny), px = img.data;
      for (let r = 0; r < R.ny; r++) { const j = R.baris[r]; for (let i = 0; i < R.nx; i++) { const k = j * R.nx + i, v = R.mmi[k]; if (R.tS[k] > t || v < 2.5) continue;
        const w = RGB_MMI[Math.min(10, Math.round(v))], o = (r * R.nx + i) * 4; px[o] = w[0]; px[o + 1] = w[1]; px[o + 2] = w[2]; px[o + 3] = Math.min(230, 60 + (v - 2.5) * 30); } }
      c.putImageData(img, 0, 0); if (S.putar) segarKanvas(["sm-mmi"]); }
    const T = H.ts;
    if (T?.layak) { const s = T.swe, c = S.cvTs.getContext("2d"), img = c.createImageData(s.nx, s.ny), px = img.data;
      for (let r = 0; r < s.ny; r++) { const j = T.baris[r]; for (let i = 0; i < s.nx; i++) { const k = j * s.nx + i, e = s.eta[k]; if (!s.h[k] || Math.abs(e) < .005) continue;
        const a = Math.min(1, Math.abs(e) / .6), o = (r * s.nx + i) * 4;
        if (e > 0) { px[o] = 214; px[o + 1] = 70 + 90 * (1 - a); px[o + 2] = 50 + 60 * (1 - a); } else { px[o] = 40; px[o + 1] = 110; px[o + 2] = 200; }
        px[o + 3] = 40 + 215 * a; } }
      c.putImageData(img, 0, 0);
      const mn = s.t / 60;
      if (T.tibaN !== (T.tibaN = T.wt.perKab.filter(p => p.menit <= mn).length)) m.setPaintProperty("sm-pantai", "circle-opacity", ["case", ["<=", ["get", "menit"], mn], 1, 0]), m.setPaintProperty("sm-pantai", "circle-stroke-opacity", ["case", ["<=", ["get", "menit"], mn], 1, 0]); }
    if (!S.putar) segarKanvas();
  }

  /* ---------- waktu ---------- */
  const tMaks = () => S.hasil?.ts?.layak ? MENIT_TS * 60 : S.hasil?.tSelesai || 60;
  /* penggeser 0-1000: 300 pertama = fase guncangan, sisanya fase tsunami (bila ada) */
  const keGeser = t => { const a = S.hasil.tSelesai, b = tMaks(); return b <= a ? Math.round(t / a * 1000) : t <= a ? Math.round(t / a * 300) : Math.round(300 + (t - a) / (b - a) * 700); };
  const dariGeser = v => { const a = S.hasil.tSelesai, b = tMaks(); return b <= a ? v / 1000 * a : v <= 300 ? v / 300 * a : a + (v - 300) / 700 * (b - a); };
  function keWaktu(t) {
    const H = S.hasil; if (!H) return;
    t = Math.min(tMaks(), Math.max(0, t));
    const T = H.ts;
    if (T?.layak) { const s = T.swe;
      /* mundur: pulihkan titik simpan terakhir sebelum t (tiap CEK_S detik sim), lalu maju */
      if (t < s.t - 1) s.pulih(T.cek[Math.min(T.cek.length - 1, Math.floor(t / CEK_S))]);
      const mulai = performance.now();
      while (s.t + s.dt <= t && performance.now() - mulai < ANGGARAN_MS) { s.langkah(1); if (s.t >= T.cek.length * CEK_S) T.cek.push(s.simpan()); }
      if (T.swe.t + T.swe.dt <= t && t > H.tSelesai) { const tuju = t; t = T.swe.t; /* stepper belum menyusul: jam ikut stepper, bukan sebaliknya */
        if (!S.putar) { cancelAnimationFrame(S.rafK); S.rafK = requestAnimationFrame(() => keWaktu(tuju)); } } }
    S.t = t; lukisWaktu(t);
    $("#smJam").textContent = jamSim(t); const g = $("#smGeser"); if (g && document.activeElement !== g) g.value = keGeser(t);
    $("#smFase").textContent = t <= H.tSelesai ? "Guncangan" : "Tsunami";
    if (t >= tMaks()) jeda();
  }
  function putar() { if (!S.hasil) return; S.putar = true; tombolPutar(); /* ikon dulu; kerja di frame berikut */
    const habis = S.t >= tMaks(); S.peta.getSource("sm-ts")?.play();
    let akhir = performance.now() + 16; if (habis) nanti(ulangi);
    const f = now => { if (!S.putar || !S.hasil) return; const dt = Math.min(.1, (now - akhir) / 1000), L = LAJU.find(l => l[0] === S.laju); akhir = now;
      keWaktu(S.t + dt * (S.t < S.hasil.tSelesai ? L[2] : L[3])); if (S.putar) S.raf = requestAnimationFrame(f); };
    S.raf = requestAnimationFrame(f); }
  function jeda() { S.putar = false; cancelAnimationFrame(S.raf); tombolPutar(); segarKanvas(); }
  function ulangi() { const T = S.hasil?.ts; if (T?.layak) T.swe.pulih(T.cek[0]); if (S.hasil) S.hasil.ras.n = -1; S.t = 0; keWaktu(0); }
  const tombolPutar = () => { const b = $("#smPutar"); if (b) { b.innerHTML = ikon(S.putar ? IK.jeda : IK.putar); b.setAttribute("aria-label", S.putar ? "Jeda" : "Putar"); } };
  function bilahWaktu() {
    $("#simWaktu").innerHTML = `<button class="iconbtn" id="smPutar" aria-label="Putar">${ikon(IK.putar)}</button><button class="iconbtn" id="smUlang" aria-label="Ulang dari awal">${ikon(IK.ulang)}</button>
      <input type="range" id="smGeser" min="0" max="1000" step="1" value="0" aria-label="Waktu sejak gempa"><b class="num" id="smJam">0 dtk</b>
      <div class="sm-laju" role="group" aria-label="Kecepatan">${LAJU.map(l => `<button type="button" data-laju="${l[0]}" aria-pressed="${l[0] === S.laju}">${l[1]}</button>`).join("")}</div>
      <button class="iconbtn" id="smMiring" aria-label="Tampak miring" aria-pressed="${S.miring}" title="Tampak miring">${ikon(IK.miring)}</button><span class="sm-fase" id="smFase">Guncangan</span>`;
    $("#smPutar").onclick = () => S.putar ? jeda() : putar();
    $("#smUlang").onclick = () => { jeda(); nanti(ulangi); };
    $("#smGeser").oninput = e => { const v = +e.target.value; if (S.putar) jeda(); $("#smJam").textContent = jamSim(dariGeser(v)); cancelAnimationFrame(S.rafG); S.rafG = requestAnimationFrame(() => keWaktu(dariGeser(v))); };
    $("#simWaktu").querySelector(".sm-laju").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.laju = b.dataset.laju; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); };
    $("#smMiring").onclick = e => { S.miring = !S.miring; e.currentTarget.setAttribute("aria-pressed", S.miring); S.peta.easeTo({pitch: S.miring ? 55 : 0, duration: 600}); };
  }

  /* ---------- alur ---------- */
  function pasangSkenario(sk) { jeda(); S.sk = sk; S.hasil = null; S.basi = false; panel(); lukisStatis(); $("#simWaktu").hidden = true; }
  function pindah(lat, lon, diam, tetap) {
    if (!S.sk) return;
    /* dekat sesar (<= 40 km; parit subduksi <= 80 km): ikut jenis dan arah sesar itu */
    let best = null;
    S.D.sesar.features.forEach((f, i) => { const g = f.geometry.coordinates, p = terdekatGaris(g, lat, lon), sub = f.properties.jenis === "subduksi";
      if (p.km <= (sub ? 80 : 40) && (!best || p.km < best.p.km)) best = {p, f, i, sub}; });
    let src = sumber(S.sk.src), titik = {lat, lon, strike: S.sk.strike};
    if (best) { src = DIKENAL.find(d => d.parit?.[0] === best.i) || S.gem.find(g => g.i === best.i) || src; titik = best.sub ? best.p : {lat, lon, strike: best.p.strike}; S.pilih = src.id; }
    const sk = bentuk(src, S.sk.m, S.sk.dalam, titik); sk.klik = {lat, lon}; sk.n = best ? src.n : "Titik pilihanmu";
    if (tetap && best) { sk.lat = lat; sk.lon = lon; sk.e = {lat, lon, m: sk.m, dalam: sk.dalam, jenis: sk.jenis, strike: sk.strike}; sk.r = Tsunami.rupture(sk.e); sk.tetap = true; sk.n = "Gempa pilihan"; }
    if (!best) { sk.jenis = S.sk.jenis === "subduksi" ? "naik" : S.sk.jenis; sk.lat = lat; sk.lon = lon; sk.e = {lat, lon, m: sk.m, dalam: sk.dalam, jenis: sk.jenis, strike: sk.strike}; sk.r = Tsunami.rupture(sk.e); }
    if (tetap) { sk.tetap = true; sk.n = "Gempa pilihan"; }
    pasangSkenario(sk); if (!diam) toast("Pusat gempa dipindah. Tekan Jalankan simulasi.");
  }
  /* penjaga balapan: tiap await diperiksa apakah skenario masih sama; yang kalah membuang hasilnya */
  async function jalankan() {
    const sk = S.sk, basi = () => S.sk !== sk, st = () => $("#smStatus"); jeda(); st().textContent = "Menghitung guncangan…";
    await lepas(); if (basi()) return;
    const t0 = performance.now(), H = hitung(sk);
    st().textContent = "Menghitung tsunami…"; await lepas(); if (basi()) return;
    await hitungTsunami(sk, H, basi); if (basi()) return;
    S.hasil = H; S.basi = false; S.waktuHitung = performance.now() - t0;
    panel(); pasangHasilPeta(); $("#simWaktu").hidden = false; S.t = 0; keWaktu(0);
    st().textContent = `Dihitung ${des(S.waktuHitung / 1000)} detik`;
    putar();
    /* sekolah sesudah animasi berjalan: diurai di pekerja latar, hasilnya hanya untuk skenario ini */
    if (H.provAda.length) sekolahLatar(H.provAda, H.kotakSekolah).then(b => { if (S.hasil !== H) return; H.sekolah = b.filter(x => H.mmiDi(x[0], x[1]) >= 6.5); nanti(() => S.hasil === H && panel()); }, e => console.warn(e));
  }

  async function render() {
    const root = $("#sim"); if (!root) return;
    if (!S.dom) { S.dom = true;
      root.innerHTML = `<div id="simPeta" role="img" aria-label="Peta simulasi gempa dan tsunami"></div><div class="card simpanel" id="simPanel"><div class="kosong"><div class="spin"></div>Memuat sesar, penduduk, dan batimetri…</div></div>
        <div class="card waktu" id="simWaktu" hidden></div><div class="dok" id="simDok"><div class="box" id="simLegenda"></div></div>`;
      bilahWaktu(); }
    try { S.D ||= await muat(); } catch (e) { $("#simPanel").innerHTML = `<div class="kosong">Data simulasi gagal dimuat. Coba muat ulang halaman.</div>`; console.warn(e); return; }
    await siapPeta(); S.peta.resize();
    legenda();
    if (!S.sk) { const s = sumber(S.pilih); pasangSkenario(bentuk(s, mBawaan(s), s.dalam));
      if (URL0) { const u = URL0; S.sk.m = Number.isFinite(u.m) ? Math.min(9.2, Math.max(5.5, Math.round(u.m * 10) / 10)) : S.sk.m; S.sk.dalam = Number.isFinite(u.dalam) ? Math.min(150, Math.max(5, Math.round(u.dalam))) : S.sk.dalam;
        pindah(u.lat, u.lon, true, true); S.sk.n = "Gempa pilihan"; panel(); nanti(jalankan); return; }
      S.peta.fitBounds([[S.sk.lon - 1.5, S.sk.lat - 1.2], [S.sk.lon + 1.5, S.sk.lat + 1.2]], {padding: pad(), duration: 0}); }
  }
  function legenda() {
    $("#simLegenda").innerHTML = `<div class="leg row sm-leg"><span><i class="sw" style="background:#3f6fa8;height:3px"></i>Gelombang P</span><span><i class="sw" style="background:#c9503a;height:3px"></i>Gelombang S</span>
      <span>${[4, 5, 6, 7, 8].map(v => `<i class="sw" style="background:${MMI_W[v]};margin-right:1px"></i>`).join("")} MMI IV sampai VIII+</span>
      <span><i class="sw" style="background:linear-gradient(90deg,#286ec8,#d64632)"></i>Muka air turun / naik</span><span><i class="sw" style="background:#2f8a4e;height:3px"></i>Jalur evakuasi</span></div>`;
  }

  return {render, get _s() { return S; }};
})();
