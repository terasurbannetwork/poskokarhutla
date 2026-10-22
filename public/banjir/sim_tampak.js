"use strict";
/* sim_tampak.js: mode "Genangan 3D" tab Simulasi. Area persegi di sekitar kecamatan/titik pilihan, DEM Terrarium (sama dengan medan
   3D MapLibre), genangan 72 jam dari sim_genangan.js di Web Worker sim_kerja.js (unduh DEM, siapkan area, hitung), indeks kerawanan
   longsor dari sim_longsor.js, perlakuan tanggul/pompa/pintu air, banding tanpa/dengan perlakuan. Masukan dari data halaman:
   hujan.json (sel terdekat), hujan_ansambel.json (hujan harian pada peluang >= 10 %), sungai.json (debit di atas Q2 = luapan),
   rob.json (muka laut). Dipanggil dari Simulasi.render() bila Simulasi.mode === "genangan". Pola kamera & medan: public/sim_3d.js.
   Tambahan (20 Okt 2026): tutupan lahan nyata per sel (sim_lahan.js: CN dan Manning), pita ketidakpastian dari 51 anggota ECMWF, lapis tanggap
   (sim_tanggap.js: pangkalan, jalan OSM yang tak terendam, titik aman) dan peringkat perlakuan; titik awal = kejadian aktif paling genting (Simulasi.awal).
   INP: klik hanya mengubah fragmen panel; kerja berat di worker; animasi berlaju adaptif dan berhenti sendiri bila frame > 300 ms. */
const SimTampak = (() => {
/* sim_longsor.js dimuat SESUDAH berkas ini (urutan index.html): SL diisi saat render pertama */
const SG = window.SimGenangan, J = 72, DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
let SL = window.SimLongsor;
const SKN = [{id: "dasar", n: "Prakiraan", w: "#5f6fb0"}, {id: "ansambel", n: "Ansambel basah", w: "#4f8fc4"}, {id: "ekstrem", n: "Hujan ekstrem", w: "#c9503a"},
  {id: "sungai", n: "Sungai meluap", w: "#3f7fb8"}, {id: "pasang", n: "Pasang tinggi", w: "#5a9e74"}];
const T = {k: null, titik: null, sisi: 6000, n: 100, sk: "dasar", op: {ekstrem: 250, sungai: 3, pasang: .5}, cn: SG.ASUMSI.CN,
  tanggul: [], pompa: [], pintu: false, tinggi: 2, laju: .5, alat: null, draf: [],
  dem: null, demKunci: "", prep: null, hasil: null, lihat: "dengan", t: 0, main: false, basi: false,
  lapis: {air: true, longsor: true, citra: true}, kanvas: {}, peta: null, sibuk: false, kerja: undefined, tanpaWorker: false, ex: 1.5, pend: undefined, raf: 0,
  alatVer: 0, cache: {}, lahan: undefined, lahanKunci: "", dcn: 0, tg: null, tgCtx: null, pm: null, pita: null, vek: null, unitDaftar: undefined, awalJalan: false};
const SLh = () => window.SimLahan, STg = () => window.SimTanggap;
const ik = d => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IK = {main: '<path d="M7 5l12 7-12 7z"/>', jeda: '<path d="M8 5v14M16 5v14"/>'};
const jeda = () => new Promise(r => nanti(r));
const ha = m2 => m2 / 1e4;
const angka1 = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const bulat = x => fmt(Math.round(x));
/* orde besaran: satu angka penting (476 -> 500), tanpa singkatan */
const orde = x => { if (!(x > 0)) return "0"; const p = 10 ** Math.floor(Math.log10(x)); return fmt(Math.round(x / p) * p); };
const tglWIB = d => new Date(d).toLocaleDateString("id-ID", {...WIB, day: "numeric", month: "short", year: "numeric"});
const hariIniWIB = () => new Date().toLocaleDateString("en-CA", WIB);
const pukul = t => new Date(new Date(S.hujan.hari_ini + "T00:00:00+07:00").getTime() + t * 36e5).toLocaleString("id-ID", {...WIB, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "");
const LABEL_LONGSOR = "indeks kerawanan relatif (rentang parameter), bukan peluang kejadian dan bukan prakiraan teruji";

/* ---------- worker ---------- */
let idN = 0; const tunggu = new Map();
function kerja(pesan, kabar) {
  if (T.kerja === undefined) try {
    T.kerja = new Worker("sim_kerja.js");
    T.kerja.onmessage = e => { const d = e.data, w = tunggu.get(d.id); if (!w) return; if ("kabar" in d) return w.kabar?.(d.kabar); tunggu.delete(d.id); d.ok ? w.ok(d) : w.gagal(new Error(d.galat)); };
    T.kerja.onerror = e => { e.preventDefault(); for (const w of tunggu.values()) w.gagal(new Error(e.message || "worker gagal")); tunggu.clear(); T.kerja = null; };
  } catch { T.kerja = null; }
  if (!T.kerja) { /* cadangan tanpa worker: utas utama. Animasi dihentikan dan layar memberi tahu */
    T.tanpaWorker = true; berhenti();
    return jeda().then(() => pesan.jenis === "dem" ? SG.ambilDEM(pesan.lat, pesan.lon, pesan.sisi, pesan.n).then(dem => ({dem}))
      : pesan.jenis === "lahan" ? SLh().kisiLahan(pesan.K).then(lahan => ({lahan}))
      : pesan.jenis === "siap" ? {prep: SG.siapkanArea(pesan.dem, SL.lereng)} : {hasil: SG.jalankan(pesan.cfg, kabar)}); }
  return new Promise((ok, gagal) => { const id = ++idN; tunggu.set(id, {ok, gagal, kabar}); T.kerja.postMessage({...pesan, id}); });
}

/* ---------- area & masukan ---------- */
function pusat() {
  if (T.titik) return T.titik;
  const c = Simulasi.kec?.[T.k]; return c ? {lat: c.lat, lon: c.lon, nama: c.nama, kab: c.kab} : null;
}
function kecAwal() { /* kejadian aktif paling genting hari ini (Simulasi.awal); bila di provinsi lain: kecamatan dengan hujan 3 hari prakiraan tertinggi */
  const a = Simulasi.awalInfo?.k; if (a && Simulasi.kec?.[a]) return a;
  const D = Simulasi.dasar || {}; let best = null, v = -1;
  for (const k of Object.keys(Simulasi.kec || {})) { const h = D[k]?.h3 ?? 0; if (h > v) { v = h; best = k; } }
  return best;
}
/* lebar kotak mengikuti kecamatan terpilih: sisi terpanjang kotak pembatasnya x 1,1, dibulatkan ke km, dibatasi 6-24 km (sel 60-240 m pada 100 x 100 sel).
   Lebih besar dari 24 km tak dihitung (sel > 240 m tak lagi melihat parit dan tanggul), jadi kecamatan raksasa hanya sebagian tercakup: dilaporkan di layar. */
function sisiKec(k) {
  const [pv] = String(k).split("|"), fs = (S.geo.kec[pv]?.features || []).filter(f => `${pv}|${f.properties.kab}|${f.properties.kec}` === k); if (!fs.length) return null;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const tiap = c => typeof c[0] === "number" ? (x0 = Math.min(x0, c[0]), x1 = Math.max(x1, c[0]), y0 = Math.min(y0, c[1]), y1 = Math.max(y1, c[1])) : c.forEach(tiap);
  fs.forEach(f => tiap(f.geometry.coordinates)); const lat = (y0 + y1) / 2, km = Math.max((x1 - x0) * 111.32 * Math.cos(lat * Math.PI / 180), (y1 - y0) * 111.32);
  return Math.max(6, Math.min(24, Math.round(km * 1.1))) * 1000;
}
const autoSisi = () => { if (!T.sisiManual && !T.titik && T.k) { const v = sisiKec(T.k); if (v) T.sisi = v; } };
const dekat = (xs, la, lo) => xs.reduce((m, g) => !m || (g.lat - la) ** 2 + (g.lon - lo) ** 2 < (m.lat - la) ** 2 + (m.lon - lo) ** 2 ? g : m, null);
function masukan(P) {
  const kunci = P.lat + "," + P.lon; if (T.cache.M?.kunci === kunci) return T.cache.M.v;
  const H = S.hujan, i0 = H.hari.indexOf(H.hari_ini), g = dekat(H.grid, P.lat, P.lon);
  const hari = [0, 1, 2].map(d => ({p: g.h[i0 + d] ?? 0, jam: g.jam?.[i0 + d] ?? 1, imax: g.imax?.[i0 + d] ?? 0}));
  const E = Simulasi.ens && Simulasi.ens.hari.includes(H.hari_ini) ? Simulasi.ens : null, e = E && dekat(E.grid, P.lat, P.lon);
  const ens = e && Math.abs(e.lat - P.lat) <= 1 && Math.abs(e.lon - P.lon) <= 1 ? {e, e0: E.hari.indexOf(H.hari_ini)} : null;
  let sg = null, js = 25; (S.sungai?.titik || []).forEach(t => { const d = km(P.lat, P.lon, t.lat, t.lon); if (d <= js) { js = d; sg = t; } });
  let rob = null, jr = 50; (S.rob?.titik || []).forEach(t => { const d = km(P.lat, P.lon, t.lat, t.lon); if (d <= jr) { jr = d; rob = t; } });
  const v = {g, i0, hari, ens, sg, js, rob, jr, sm: g.sm?.[i0] ?? null, a7: g.a7 ?? 0};
  T.cache.M = {kunci, v}; return v;
}
/* hujan per hari skenario; ubah = hari itu berbeda dari prakiraan.
   Ansambel basah: hujan harian pada peluang ansambel >= 10 % (P(>=100 mm) >= 0,1 -> 100 mm, P(>=50 mm) >= 0,1 -> 50 mm), batas bawah
   P90 PER HARI, bukan P90 jumlah 3 hari. Hari yang peluangnya < 10 % atau prakiraannya sudah lebih basah tidak berubah. */
function hariSkenario(M) {
  let h = M.hari.map(x => ({...x, ubah: false}));
  if (T.sk === "ansambel" && M.ens) h = h.map((x, d) => { const j = M.ens.e0 + d, e = M.ens.e, lb = (e.p100?.[j] || 0) >= .1 ? 100 : (e.p50?.[j] || 0) >= .1 ? 50 : 0;
    return lb > x.p ? {p: lb, jam: Math.max(x.jam, 6), imax: x.p > 0 ? x.imax * lb / x.p : lb / 4, ubah: true} : x; });
  if (T.sk === "ekstrem") { const tot = h.reduce((a, x) => a + x.p, 0), X = T.op.ekstrem;
    h = tot > 0 ? h.map(x => ({p: x.p * X / tot, jam: Math.max(x.jam, 3), imax: x.imax * X / tot, ubah: true})) : h.map(() => ({p: X / 3, jam: 6, imax: X / 12, ubah: true})); }
  return h;
}
/* debit per jam di atas Q2 (kapasitas alur penuh = Q2, asumsi Leopold 1964: alur terisi penuh ~1,5-2 tahun sekali).
   Debit TIDAK ikut dikali skenario hujan; hanya skenario "Sungai meluap" memaksa puncak Q5/Q20 */
function luapan(sg) {
  const R = S.sungai, j0 = R.hari.indexOf(S.hujan.hari_ini), q = sg.q, o = new Float64Array(J + 1);
  const harian = d => q[Math.max(0, Math.min(q.length - 1, j0 + d))] ?? 0, tgt = T.sk === "sungai" ? (T.op.sungai === 3 ? sg.q20 : sg.q5) : 0;
  for (let t = 0; t <= J; t++) { const x = (t - 12) / 24, a = Math.floor(x), f = x - a; let v = harian(a) * (1 - f) + harian(a + 1) * f;
    if (tgt) v = Math.max(v, sg.q2 + (tgt - sg.q2) * (t <= 30 ? t / 30 : Math.max(0, 1 - (t - 30) / 42))); /* hidrograf segitiga, puncak jam 30 (asumsi) */
    o[t] = Math.max(0, v - sg.q2); }
  return o;
}
function susun() {
  const P = pusat(), D = T.dem, pr = T.prep, M = masukan(P), hari = hariSkenario(M), amc = SG.kelasAMC(M.a7, M.sm);
  const hu = SG.hietograf(hari), L = limpasanX(hu, amc);
  let sungai = null;
  if (M.sg) { const [i, j] = SG.keSel(D, M.sg.lon, M.sg.lat), r = 3000 / D.dx;
    if (i > -r && j > -r && i < D.nx + r && j < D.ny + r) {
      if (!M.sg.q2) sungai = {catat: "tanpa ambang Q2"};
      else { let k = -1; for (let jj = Math.max(0, Math.floor(j - r)); jj <= Math.min(D.ny - 1, Math.ceil(j + r)); jj++) for (let ii = Math.max(0, Math.floor(i - r)); ii <= Math.min(D.nx - 1, Math.ceil(i + r)); ii++) {
          const kk = jj * D.nx + ii; if (!pr.laut[kk] && (ii - i) ** 2 + (jj - j) ** 2 <= r * r && (k < 0 || pr.acc[kk] > pr.acc[k])) k = kk; }
        if (k >= 0) sungai = {k, q: luapan(M.sg), sg: M.sg}; } } }
  let muka = null, mukaSumber = null;
  if (pr.nLaut) { const R = S.rob, r0 = M.rob && R ? R.hari.indexOf(S.hujan.hari_ini) : -1;
    const maks = [0, 1, 2].map(d => M.rob && r0 >= 0 && M.rob.h[r0 + d] != null ? M.rob.h[r0 + d] : .5).map(v => v + (T.sk === "pasang" ? T.op.pasang : 0));
    mukaSumber = M.rob && r0 >= 0 ? "rob" : "asumsi"; muka = SG.pasang(maks); }
  return {P, M, hari, amc, cn: L.cn, hujan: hu, efektif: L.efektif, resap: L.resap, seri: L.seri, kelas: L.kelas, manning: T.lahan?.n || null, sungai, muka, mukaSumber};
}
/* limpasan SCS-CN: per sel dari tutupan lahan bila termuat (CN digeser T.dcn, air tetap 100), kalau tidak satu CN seragam T.cn */
function limpasanX(hu, amc) {
  const lh = T.lahan; if (!lh) return SG.limpasan(hu, T.cn, amc);
  const laut = T.prep.laut, cn = Float32Array.from(lh.cn, c => c >= 100 ? 100 : Math.max(40, Math.min(98, c + T.dcn))), darat = Uint8Array.from(laut, v => v ? 0 : 1);
  return SG.limpasanSel(hu, cn, amc, darat);
}
function cfgDari(X, perlakuan, spec) {
  const D = T.dem, pr = T.prep, N = D.nx * D.ny; let z = pr.z; const tutup = new Uint8Array(N), pompa = [];
  if (spec) { /* kandidat peringkat (koordinat sel dari sim_tanggap.kandidatPerlakuan) */
    for (const tg of spec.tanggul) z = SG.naikkan(z, SG.garisSel(tg.garis, D.nx, D.ny), tg.tinggi);
    for (const p of spec.pompa) pompa.push({k: p.k, q: p.q}); if (spec.pintu) tutup.set(pr.pintu); }
  else if (perlakuan) {
    for (const tg of T.tanggul) z = SG.naikkan(z, SG.garisSel(tg.garis.map(([lo, la]) => SG.keSel(D, lo, la)), D.nx, D.ny), tg.tinggi);
    for (const p of T.pompa) { const [i, j] = SG.keSel(D, p.lon, p.lat).map(Math.round), k = j * D.nx + i; if (i >= 0 && j >= 0 && i < D.nx && j < D.ny && !pr.laut[k]) pompa.push({k, q: p.q}); }
    if (T.pintu) tutup.set(pr.pintu); }
  return {nx: D.nx, ny: D.ny, dx: D.dx, z, laut: pr.laut, muka: X.muka, hujan: X.seri ? undefined : X.efektif, hujanKelas: X.seri, kelas: X.kelas, manning: X.manning || undefined, masuk: X.sungai?.k != null ? [{k: X.sungai.k, q: X.sungai.q}] : [], pompa, tutup, jam: J};
}
const adaPerlakuan = () => T.tanggul.length || T.pompa.length || T.pintu;

/* ---------- jalan ---------- */
function status(s) { const el = $("#gnStatus"); if (el) el.textContent = s; }
async function jalan() {
  if (T.sibuk) return; const P = pusat(); if (!P) return toast("Pilih kecamatan atau titik dulu");
  T.sibuk = true; berhenti(); const b = $("#gnJalan"); if (b) b.disabled = true;
  try {
    autoSisi(); const kunci = [P.lat.toFixed(4), P.lon.toFixed(4), T.sisi, T.n].join("|");
    if (T.demKunci !== kunci) { status("Mengunduh medan (DEM)…"); const r = await kerja({jenis: "dem", lat: P.lat, lon: P.lon, sisi: T.sisi, n: T.n}); T.dem = r.dem; T.prep = null; T.demKunci = kunci; }
    if (!T.prep) { status("Menyiapkan medan…"); T.prep = (await kerja({jenis: "siap", dem: T.dem})).prep; }
    const lk = T.demKunci + "|lahan"; /* tutupan lahan: gagal = CN 80 dan n 0,06 seragam (dilaporkan di panel), bukan galat */
    if (T.lahanKunci !== lk && SLh()) { status("Memuat tutupan lahan (ESA WorldCover)…"); const {z: _z, ...meta} = T.dem; T.lahan = await kerja({jenis: "lahan", K: meta}).then(r => r.lahan).catch(e => { console.warn("SimTampak: tutupan lahan tidak termuat", e); return null; }); T.lahanKunci = lk; }
    T.tg = T.pm = T.pita = null; T.tgCtx = null;
    T.ex = Math.round(Math.min(10, Math.max(1.5, 250 / T.prep.relief)) * 2) / 2;
    const X = susun(), ada = adaPerlakuan(), tahap = ada ? 2 : 1;
    const run = (pl, i) => kerja({jenis: "jalan", cfg: cfgDari(X, pl)}, p => status(`Menghitung genangan 72 jam${tahap > 1 ? ` (${i}/${tahap})` : ""}… ${fmt(Math.round(p * 100))} %`)).then(r => r.hasil);
    const dasar = await run(false, 1), dengan = ada ? await run(true, 2) : null;
    T.hasil = {dasar, dengan, X}; T.nJalan = (T.nJalan || 0) + 1; T.lihat = dengan ? "dengan" : "dasar"; T.basi = false;
    const R = dengan || dasar; T.t = R.luas.indexOf(Math.max(...R.luas)); status(T.tanpaWorker ? "Peramban ini tanpa Web Worker: hitungan berjalan di halaman, layar bisa tersendat dan animasi dimatikan." : "");
    muatPenduduk();
  } catch (e) { console.warn("SimTampak:", e); status("Gagal: " + e.message); T.sibuk = false; if (b) { b.disabled = false; b.textContent = "Jalankan ulang"; } return; }
  T.sibuk = false; panel(); await petaSiap(); pasangArea(true); T.lsKunci = null; gambar(true);
}
function tandaiBasi() { if (!T.hasil) return; T.basi = true; const b = $("#gnJalan"); if (b) b.textContent = "Jalankan ulang"; }

/* ---------- penduduk (public/data/penduduk.json, WorldPop 2026 sel 0,25 derajat + total per kecamatan) ---------- */
function muatPenduduk() {
  if (T.pend !== undefined) return;
  T.pend = null; muatJSON("../data/penduduk.json").then(d => { T.pend = d; T.cache.kp = null; if (T.hasil) { segarHasil(); segarLanjut(); } }).catch(() => {});
}
function luasKec(k) { const f = S.geo.kec[Simulasi.kode]?.features.filter(x => `${Simulasi.kode}|${x.properties.kab}|${x.properties.kec}` === k) || []; let a = 0;
  for (const x of f) for (const pol of x.geometry.type === "MultiPolygon" ? x.geometry.coordinates : [x.geometry.coordinates]) { const r = pol[0], c = Math.cos(r[0][1] * Math.PI / 180);
    let s = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; } a += Math.abs(s) / 2 * 111.32 * 111.32 * c; }
  return a; }
/* kepadatan (jiwa/km2), rentang orde besaran. Kecamatan: antara sel 0,25 derajat terdekat dan rata-rata kecamatan. Titik pilihan:
   hanya sel 0,25 derajat (~770 km2) yang diketahui, jadi rentang dilebarkan 1/3 sampai 3 kali (asumsi). null = tak ada estimasi */
function kepadatan(P) {
  const d = T.pend; if (!d) return null; const kunci = P.lat + "," + P.lon + "|" + (T.titik ? "" : T.k); if (T.cache.kp?.kunci === kunci) return T.cache.kp.v;
  const sel = d.sel, la = Math.floor(P.lat / sel) * sel + sel / 2, lo = Math.floor(P.lon / sel) * sel + sel / 2;
  const jml = d.grid.filter(g => Math.abs(g[0] - la) < 1e-6 && Math.abs(g[1] - lo) < 1e-6).reduce((a, g) => a + g[2], 0), luasSel = (sel * 111.32) ** 2 * Math.cos(la * Math.PI / 180);
  let v = null; const ds = jml / luasSel, k = T.titik ? null : T.k;
  if (k && d.kec[k]) { const a = luasKec(k); v = a > .5 ? [Math.min(ds, d.kec[k] / a), Math.max(ds, d.kec[k] / a)] : null; }
  else if (jml > 0) v = [ds / 3, ds * 3];
  T.cache.kp = {kunci, v}; return v;
}

/* penduduk per sel [lo, hi]: total kotak = kepadatan (rentang) x luas darat kotak, disebar menurut bobot permukiman tutupan lahan (asumsi; bukan peta penduduk).
   null = tak ada estimasi penduduk */
function popSel() {
  const H = T.hasil; if (!H || !SLh()) return null; const kp = kepadatan(H.X.P); if (!kp) return null;
  const kunci = T.nJalan + "|" + kp.join() + "|" + !!T.lahan; if (T.cache.ps?.kunci === kunci) return T.cache.ps.v;
  let dar = 0; for (const l of T.prep.laut) if (!l) dar++; const km2 = dar * T.dem.dx ** 2 / 1e6, v = SLh().sebarPenduduk([kp[0] * km2, kp[1] * km2], T.lahan?.bobot, T.prep.laut);
  T.cache.ps = {kunci, v}; return v;
}
/* jiwa [lo, hi] di sel dengan air >= ambang pada jam t */
function jiwaJam(R, pop, t, ambang) { const N = R.nx * R.ny, o = t * N; let lo = 0, hi = 0; for (let k = 0; k < N; k++) if (R.kedalaman[o + k] >= ambang) { lo += pop.lo[k]; hi += pop.hi[k]; } return [lo, hi]; }
const tengah = r => (r[0] + r[1]) / 2, rentang = r => { const a = orde(r[0]), b = orde(r[1]); return a === b ? a : `${a}–${b}`; };
const rpS = (lo, hi) => { const u = hi >= 1e9 ? 1e9 : 1e6, f = x => u === 1e9 || x / u < 10 ? angka1(x / u) : bulat(x / u), a = f(lo), b = f(hi); return `Rp ${a === b ? a : `${a}–${b}`} ${u === 1e9 ? "miliar" : "juta"}`; };
const waktu = h => !Number.isFinite(h) ? "tak terjangkau" : h < 1 ? `${bulat(h * 60)} menit` : `${angka1(h)} jam`;
const kuantil = (xs, q) => { const a = xs.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(q * (a.length - 1))] : null; };

/* ---------- peta 3D ---------- */
async function petaSiap() {
  let el = $("#simPeta3"); if (!el) { $("#simPeta").insertAdjacentHTML("afterend", `<div id="simPeta3" role="img" aria-label="Peta 3D genangan dan indeks kerawanan longsor"></div>`); el = $("#simPeta3"); }
  $("#simPeta").hidden = true; el.hidden = false;
  if (T.peta && document.body.contains(T.peta.getContainer())) { const u = el.clientWidth + "x" + el.clientHeight; if (u !== T.ukuran) { T.ukuran = u; T.peta.resize(); } return; }
  const P = pusat() || {lat: -6.2, lon: 106.8};
  const m = T.peta = new maplibregl.Map({container: "simPeta3", style: DASAR(), center: [P.lon, P.lat], zoom: 12, pitch: 55, maxPitch: 75, attributionControl: {compact: true}});
  T.ukuran = el.clientWidth + "x" + el.clientHeight; T.exAktif = null; T.demPasang = null; T.alatPasang = -1;
  m.addControl(new maplibregl.NavigationControl({visualizePitch: true}), "bottom-right");
  await new Promise(r => m.once("load", r));
  m.addSource("gn-dem", {type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 13, attribution: "Medan © Mapzen, NASA SRTM, USGS"});
  m.addSource("gn-dem2", {type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 13}); /* hillshade terpisah dari medan (saran MapLibre) */
  m.addSource("gn-sat", {type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Citra © Esri, Maxar, Earthstar"});
  const atas = m.getStyle().layers.find(l => l.type === "symbol")?.id;
  m.addLayer({id: "gn-sat", type: "raster", source: "gn-sat", layout: {visibility: T.lapis.citra ? "visible" : "none"}}, atas);
  m.addLayer({id: "gn-hill", type: "hillshade", source: "gn-dem2", paint: {"hillshade-exaggeration": .3, "hillshade-shadow-color": "#3a3020"}}, atas);
  terrain(m);
  m.addSource("gn-alat", {type: "geojson", data: dataAlat()}); T.alatPasang = T.alatVer;
  m.addLayer({id: "gn-kotak", type: "line", source: "gn-alat", filter: ["==", ["get", "j"], "kotak"], paint: {"line-color": "#ffffff", "line-width": 1.5, "line-dasharray": [3, 2], "line-opacity": .9}});
  m.addLayer({id: "gn-tanggul", type: "line", source: "gn-alat", filter: ["in", ["get", "j"], ["literal", ["tanggul", "draf"]]], layout: {"line-cap": "round", "line-join": "round"},
    paint: {"line-color": ["case", ["==", ["get", "j"], "draf"], "#ffd24a", "#7a4a1f"], "line-width": 5}});
  m.addLayer({id: "gn-titik", type: "circle", source: "gn-alat", filter: ["==", ["geometry-type"], "Point"], paint: {"circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "#fff",
    "circle-color": ["match", ["get", "j"], "pompa", "#c9503a", "sungai", "#1d6fd1", "unit", "#2e9e5b", "aman", "#8e5bd1", "#ffd24a"]}});
  m.addLayer({id: "gn-titik-lbl", type: "symbol", source: "gn-alat", filter: ["==", ["geometry-type"], "Point"], layout: {"text-field": ["get", "n"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.3], "text-anchor": "top"},
    paint: {"text-color": "#fff", "text-halo-color": "#0b2545", "text-halo-width": 1.4}});
  m.on("click", klik); m.on("dblclick", e => { if (T.alat === "tanggul") { e.preventDefault(); selesaiTanggul(); } });
  m.on("mousemove", e => { T.tipE = e; if (!T.rafTip) T.rafTip = requestAnimationFrame(tip); });
  m.on("mouseout", () => { T.tipKunci = ""; $("#tip").classList.remove("on"); });
}
const terrain = m => { if (T.exAktif === T.ex) return; T.exAktif = T.ex; m.setTerrain({source: "gn-dem", exaggeration: T.ex}); };
const segarAlat = () => { T.alatVer++; const s = T.peta?.getSource("gn-alat"); if (s && T.alatPasang !== T.alatVer) { T.alatPasang = T.alatVer; s.setData(dataAlat()); } };
function pasangArea(terbang) {
  const m = T.peta, D = T.dem; if (!m || !D || !m.getSource("gn-alat")) return;
  terrain(m);
  /* sumber kanvas (bukan image + dataURL: updateImage beruntun membatalkan muatan sebelumnya dan mengotori konsol) */
  const baru = T.demPasang !== D;
  for (const id of ["gn-air", "gn-longsor"]) { let c = T.kanvas[id];
    if (!c || c.cv.width !== D.nx) { const cv = document.createElement("canvas"); cv.width = D.nx; cv.height = D.ny; const cx = cv.getContext("2d", {willReadFrequently: true}); /* tetap di CPU: tanpa baca-balik GPU */ c = T.kanvas[id] = {cv, cx, img: cx.createImageData(D.nx, D.ny)};
      if (m.getLayer(id)) m.removeLayer(id); if (m.getSource(id)) m.removeSource(id); }
    const s = m.getSource(id); if (s) { if (baru) s.setCoordinates(D.sudut); }
    else { m.addSource(id, {type: "canvas", canvas: c.cv, coordinates: D.sudut, animate: false}); m.addLayer({id, type: "raster", source: id, paint: {"raster-opacity": 1, "raster-fade-duration": 0, "raster-resampling": id === "gn-air" ? "linear" : "nearest"}}, "gn-kotak"); } }
  T.demPasang = D; segarAlat();
  if (terbang) { const hp = innerWidth <= 900, xs = D.sudut.map(c => c[0]), ys = D.sudut.map(c => c[1]);
    m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {padding: hp ? {top: 210, left: 16, right: 16, bottom: innerHeight * .42} : {top: 60, left: 420, right: 60, bottom: 130},
      pitch: 55, bearing: -20, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900}); }
  terapkanLapis();
}
function dataAlat() {
  const fs = [], D = T.dem, X = T.hasil?.X;
  if (D) fs.push({type: "Feature", properties: {j: "kotak"}, geometry: {type: "LineString", coordinates: [...D.sudut, D.sudut[0]]}});
  T.tanggul.forEach(tg => fs.push({type: "Feature", properties: {j: "tanggul"}, geometry: {type: "LineString", coordinates: tg.garis}}));
  if (T.draf.length > 1) fs.push({type: "Feature", properties: {j: "draf"}, geometry: {type: "LineString", coordinates: T.draf}});
  T.pompa.forEach(p => fs.push({type: "Feature", properties: {j: "pompa", n: `Pompa ${angka1(p.q)} m³/dtk`}, geometry: {type: "Point", coordinates: [p.lon, p.lat]}}));
  const sn = T.tg?.ada && T.tg.snapshot.at(-1);
  if (sn && D) { (T.tg.unit || []).forEach(u => fs.push({type: "Feature", properties: {j: "unit", n: namaUnit(u)}, geometry: {type: "Point", coordinates: [u.lon, u.lat]}}));
    if (sn.aman) { const [lo, la] = SG.dariSel(D, sn.aman.k % D.nx, Math.floor(sn.aman.k / D.nx)); fs.push({type: "Feature", properties: {j: "aman", n: `Titik aman: ${sn.aman.nama}`}, geometry: {type: "Point", coordinates: [lo, la]}}); }
    fs.push({type: "Feature", properties: {j: "sasaran", n: "Pusat permukiman tergenang"}, geometry: {type: "Point", coordinates: sn.pusat}}); }
  if (X?.sungai?.k != null) { const [lo, la] = SG.dariSel(D, X.sungai.k % D.nx, Math.floor(X.sungai.k / D.nx)); fs.push({type: "Feature", properties: {j: "sungai", n: "Luapan sungai masuk"}, geometry: {type: "Point", coordinates: [lo, la]}}); }
  return {type: "FeatureCollection", features: fs};
}
function terapkanLapis() { const m = T.peta; if (!m?.getLayer("gn-sat")) return;
  const v = (id, on) => m.getLayer(id) && m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  v("gn-sat", T.lapis.citra); v("gn-air", T.lapis.air); v("gn-longsor", T.lapis.longsor);
  m.setPaintProperty("gn-kotak", "line-color", T.lapis.citra || gelap() ? "#ffffff" : "#0b2545"); }
const hasilLihat = () => T.hasil && (T.lihat === "dengan" && T.hasil.dengan ? T.hasil.dengan : T.hasil.dasar);
/* warna kedalaman (m) dan indeks kerawanan longsor */
const RAMP = [[.02, [170, 215, 255, 60]], [.1, [120, 190, 250, 150]], [.5, [60, 140, 230, 190]], [1, [30, 95, 200, 210]], [2, [15, 55, 150, 225]], [4, [8, 25, 90, 235]]];
function warnaAir(d) { if (d < RAMP[0][0]) return null; for (let q = 1; q < RAMP.length; q++) if (d <= RAMP[q][0]) { const [a, ca] = RAMP[q - 1], [b, cb] = RAMP[q], f = (d - a) / (b - a); return ca.map((c, i) => c + (cb[i] - c) * f); } return RAMP[RAMP.length - 1][1]; }
const warnaLongsor = p => p < .05 ? null : p < .2 ? [242, 200, 75, 120] : p < .4 ? [229, 138, 69, 165] : [201, 80, 58, 200];
/* ember: hujan 7 hari lalu yang tersimpan + resapan; sm hanya penanda "jenuh" seperti status.py (sim_longsor.js) */
const basahStatus = M => M.sm != null ? M.sm >= .45 && M.a7 >= 25 : M.a7 >= 150;
const mJam = t => { const X = T.hasil.X; return SL.kejenuhan(X.M.a7, X.resap[Math.min(J, Math.round(t))], basahStatus(X.M)); };
const petaLongsor = t => SL.peta(T.prep.lr, mJam(t));
/* kanvas berubah -> unggah tekstur: sumber kanvas MapLibre hanya mengunggah ulang saat "play"; jeda lagi sesudahnya */
function segarKanvas(id) { const s = T.peta.getSource(id); if (!s) return; s.play(); clearTimeout(T.jedaK?.[id]); (T.jedaK ||= {})[id] = setTimeout(() => s.pause(), 120); }
function lukis(id, N, warna) { const c = T.kanvas[id]; if (!c) return; const px = c.img.data; px.fill(0);
  for (let k = 0; k < N; k++) { const w = warna(k); if (w) { const o = k * 4; px[o] = w[0]; px[o + 1] = w[1]; px[o + 2] = w[2]; px[o + 3] = w[3]; } }
  c.cx.putImageData(c.img, 0, 0); segarKanvas(id); }
/* t dikuantisasi 0,25 jam; lukis dilewati bila bingkai sama; longsor hanya bila jam bulat berubah */
function gambar(paksa) {
  T.raf = 0; const m = T.peta, R = hasilLihat(); if (!m || !R || !m.getSource("gn-air")) return 0;
  const t0 = performance.now(), t = Math.round(T.t * 4) / 4, kunci = t + "|" + T.lihat + "|" + T.nJalan;
  if (!paksa && kunci === T.lukisKunci) return 0; T.lukisKunci = kunci;
  const N = R.nx * R.ny, a = Math.floor(t), b = Math.min(J, a + 1), f = t - a, K = R.kedalaman;
  lukis("gn-air", N, k => warnaAir(K[a * N + k] * (1 - f) + K[b * N + k] * f));
  const lk = Math.round(t) + "|" + T.nJalan; if (T.lapis.longsor && (paksa || lk !== T.lsKunci)) { T.lsKunci = lk; const L = petaLongsor(t); lukis("gn-longsor", N, k => warnaLongsor(L[k])); }
  const lb = $("#gnJam"); if (lb) lb.textContent = `+${a} j · ${pukul(a)}`;
  const lu = $("#gnLuasT"); if (lu) lu.textContent = `${bulat(ha(R.luas[a]))} ha tergenang`;
  const g = $("#gnT"); if (g && +g.value !== a) g.value = a;
  return performance.now() - t0;
}
const jadwal = () => { if (!T.raf) T.raf = requestAnimationFrame(() => gambar()); };
function tip() {
  T.rafTip = 0; const e = T.tipE, D = T.dem, R = hasilLihat(), el = $("#tip");
  if (T.main || !e || !D || !R || T.alat) { T.tipKunci = ""; return el.classList.remove("on"); }
  const [fi, fj] = SG.keSel(D, e.lngLat.lng, e.lngLat.lat), i = Math.round(fi), j = Math.round(fj);
  if (i < 0 || j < 0 || i >= D.nx || j >= D.ny) { T.tipKunci = ""; return el.classList.remove("on"); }
  /* ukur dulu (ukuran isi sebelumnya), baru tulis; isi hanya diganti bila sel/jam berubah */
  const w = el.offsetWidth || 220, hgt = el.offsetHeight || 70, x = e.originalEvent.clientX, y = e.originalEvent.clientY;
  const k = j * D.nx + i, a = Math.floor(T.t), kunci = k + "|" + a + "|" + T.lihat + "|" + T.nJalan;
  if (kunci !== T.tipKunci) { T.tipKunci = kunci; const N = D.nx * D.ny, d = R.kedalaman[a * N + k], p = SL.peluang(T.prep.lr[k], mJam(a));
    el.innerHTML = T.prep.laut[k] ? "<b>Laut</b>" : `<b>${d >= .02 ? `Air ${angka1(d)} m` : "Kering"}</b><br>Ketinggian tanah ${angka1(T.prep.z[k])} m (DEM simulasi) · air maks 72 jam ${angka1(R.hmaks[k])} m<br>Lereng ${bulat(T.prep.lr[k])}° · indeks kerawanan longsor ${F2(p)} (relatif)`; }
  el.classList.add("on"); el.style.left = Math.min(innerWidth - w - 8, x + 14) + "px"; el.style.top = Math.max(8, y - hgt - 12) + "px";
}

/* ---------- animasi: laju adaptif, berhenti sendiri bila frame > 300 ms ---------- */
function putar() {
  if (T.main) return berhenti(); if (!hasilLihat()) return;
  if (T.tanpaWorker) return toast("Animasi dimatikan: peramban ini tanpa Web Worker");
  if (T.t >= J) T.t = 0; T.main = true; ikonMain(); $("#tip")?.classList.remove("on");
  let lalu = performance.now(), akhir = 0, biaya = 16;
  const lup = s => { if (!T.main) return;
    T.t = Math.min(J, T.t + (s - lalu) / 1000 * 6); lalu = s;
    if (s - akhir >= Math.max(100, 2 * biaya) || T.t >= J) { akhir = s; const c = gambar(); if (c) biaya = c;
      if (c > 300) { berhenti(); status("Animasi dijeda: perangkat ini lambat menggambar. Geser penggeser jam untuk melihat."); return; } }
    if (T.t >= J) return berhenti(); requestAnimationFrame(lup); };
  requestAnimationFrame(lup);
}
function berhenti() { if (!T.main) return; T.main = false; ikonMain(); }
function ikonMain() { const b = $("#gnMain"); if (b) { b.innerHTML = ik(T.main ? IK.jeda : IK.main); b.setAttribute("aria-label", T.main ? "Jeda" : "Putar 72 jam"); } }

/* ---------- alat perlakuan ---------- */
function klik(e) {
  const {lng, lat} = e.lngLat;
  if (T.alat === "titik") { if (lat < -11.5 || lat > 6.5 || lng < 94 || lng > 141.5) return toast("Pilih titik di wilayah Indonesia");
    T.alat = null; T.titik = {lat, lon: lng, nama: "Titik pilihan", kab: `${Math.abs(lat).toLocaleString("id-ID", {maximumFractionDigits: 3})}° ${lat < 0 ? "LS" : "LU"}, ${lng.toLocaleString("id-ID", {maximumFractionDigits: 3})}° BT`};
    T.hasil = null; T.tanggul = []; T.pompa = []; T.peta.getCanvas().style.cursor = ""; nanti(() => { panel(); jalan(); }); return; }
  if (T.alat === "tanggul") { T.draf.push([lng, lat]); segarAlat(); return; }
  if (T.alat === "pompa") { const D = T.dem; if (D) { const [i, j] = SG.keSel(D, lng, lat).map(Math.round); if (i < 0 || j < 0 || i >= D.nx || j >= D.ny) return toast("Pompa harus di dalam kotak area");
      if (T.prep.laut[j * D.nx + i]) return toast("Pompa harus di darat"); }
    T.pompa.push({lon: lng, lat, q: T.laju}); T.alat = null; T.peta.getCanvas().style.cursor = ""; segarAlat(); tandaiBasi(); segarPerlakuan(); }
}
function selesaiTanggul() {
  if (T.draf.length > 1) { T.tanggul.push({garis: T.draf, tinggi: T.tinggi}); tandaiBasi(); }
  T.draf = []; T.alat = null; if (T.peta) { T.peta.getCanvas().style.cursor = ""; T.peta.doubleClickZoom.enable(); } segarAlat();
  segarPerlakuan();
}
function pakaiAlat(a) {
  if (T.alat === "tanggul") return selesaiTanggul();
  if (!T.dem && a !== "titik") return toast("Jalankan simulasi sekali dulu supaya medan termuat");
  T.alat = T.alat === a ? null : a; T.draf = [];
  if (T.peta) { T.peta.getCanvas().style.cursor = T.alat ? "crosshair" : ""; T.alat === "tanggul" ? T.peta.doubleClickZoom.disable() : T.peta.doubleClickZoom.enable(); }
  if (T.alat) toast({tanggul: "Klik titik-titik tanggul di peta, klik dua kali untuk selesai", pompa: "Klik lokasi pompa di peta", titik: "Klik pusat area di peta"}[T.alat]);
  segarPerlakuan();
}

/* ---------- panel ---------- */
const geser = (id, lbl, min, max, step, v, tampil) => `<label class="simgeser"><span>${lbl}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"><b class="num" id="${id}V">${tampil(v)}</b></label>`;
const tampilQ = v => v === 3 ? "Q20" : "Q5", tampilCN = v => T.lahan ? (v > 0 ? "+" : "") + fmt(v) : fmt(v);
const adaEns = () => { const P = pusat(); return !!(P && masukan(P).ens); };
function aturHtml() {
  const g = {ekstrem: geser("gnE", "Hujan 3 hari", 100, 500, 25, T.op.ekstrem, v => fmt(v) + " mm"),
    sungai: geser("gnS", "Debit puncak", 2, 3, 1, T.op.sungai, tampilQ) + `<p class="fnd" id="gnSK">${T.op.sungai === 3 ? "Q20 (sekali dalam 20 tahun)" : "Q5 (sekali dalam 5 tahun)"}, puncak jam +30</p>`,
    pasang: geser("gnP", "Muka laut naik", .2, 1.5, .1, T.op.pasang, v => angka1(v) + " m"),
    ansambel: `<p class="fnd">Hujan harian pada peluang ansambel ≥ 10 % (batas bawah P90 per hari, bukan P90 total). Hari yang peluangnya di bawah 10 % tetap memakai prakiraan.</p>`}[T.sk];
  return g ? `<div class="simatur">${g}</div>` : "";
}
const rangkumPl = () => [T.tanggul.length && `${fmt(T.tanggul.length)} tanggul`, T.pompa.length && `${fmt(T.pompa.length)} pompa`, T.pintu && "pintu air tertutup"].filter(Boolean).join(" · ") || "Belum ada perlakuan.";
const sumber = () => { const H = S.hujan, basi = H.hari_ini !== hariIniWIB();
  return `<p class="fnd" id="gnData">Data s.d. ${tglPendek(H.hari_ini)}${basi ? ` <span class="pill l2" style="height:17px;font-size:9.5px">bukan hari ini</span> jam 0 = ${tglPendek(H.hari_ini)} 00.00 WIB, prakiraan terbaru belum masuk` : ""}</p>`; };
function panel() {
  const el = $("#simPanel"); if (!el) return; autoSisi(); const atas = el.scrollTop, P = pusat(), H = T.hasil;
  const kecs = Object.entries(Simulasi.kec || {}).sort((a, b) => a[1].kab.localeCompare(b[1].kab) || a[1].nama.localeCompare(b[1].nama)), ens = adaEns();
  if (T.sk === "ansambel" && !ens) T.sk = "dasar";
  el.innerHTML = `<div class="lbl">Simulasi genangan 72 jam · model</div><h2><span translate="no">${esc(P?.nama || "Pilih area")}</span></h2>
    <div style="font-size:12.5px;color:var(--ink2)"><span translate="no">${esc(P?.kab || "")}</span>${T.dem ? ` · sel ${bulat(T.dem.dx)} m · ketinggian ×${fmt(T.ex)}` : ""}</div>
    ${sumber()}
    ${Simulasi.awalHtml(T.titik ? "-" : T.k)}
    ${Simulasi.modeHtml()}
    <label class="fld"><span class="lbl">Provinsi</span><select id="gnProv" aria-label="Provinsi">${Object.entries(S.meta.provinsi).map(([k, n]) => `<option value="${k}" ${k === Simulasi.prov ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="fld"><span class="lbl">Kecamatan</span><select id="gnKec" aria-label="Kecamatan">${T.titik ? `<option value="" selected>Titik pilihan</option>` : ""}${kecs.map(([k, c]) => `<option value="${esc(k)}" ${!T.titik && k === T.k ? "selected" : ""}>${esc(c.nama)} · ${esc(c.kab)}</option>`).join("")}</select></label>
    <div class="simchips" style="margin-top:8px"><button type="button" data-alat="titik" aria-pressed="${T.alat === "titik"}">Pilih titik di peta</button><span></span></div>
    ${geser("gnSisi", "Lebar area", 3, 30, 1, T.sisi / 1000, v => fmt(v) + " km")}
    <div class="lbl" style="margin:12px 0 6px">Skenario</div>
    <div class="simchips" role="group" aria-label="Skenario genangan">${SKN.map(s => `<button type="button" data-gsk="${s.id}" aria-pressed="${T.sk === s.id}" ${s.id === "ansambel" && !ens ? `disabled title="Tidak ada titik ansambel ≤ 1 derajat untuk hari ini"` : ""}><i style="background:${s.w}"></i>${s.n}</button>`).join("")}</div>
    ${ens ? "" : `<p class="fnd">Ansambel basah tidak tersedia: tidak ada titik ansambel untuk area dan tanggal ini.</p>`}
    <div id="gnAtur">${aturHtml()}</div>
    <div class="lbl" style="margin:12px 0 6px">Perlakuan</div>
    <div class="simchips" role="group" aria-label="Perlakuan">
      <button type="button" data-alat="tanggul" aria-pressed="${T.alat === "tanggul"}">${T.alat === "tanggul" ? "Selesai menggambar" : "Gambar tanggul"}</button>
      <button type="button" data-alat="pompa" aria-pressed="${T.alat === "pompa"}">Pasang pompa</button>
      <button type="button" data-pintu aria-pressed="${T.pintu}">Pintu air tertutup</button>
      <button type="button" data-hapus ${adaPerlakuan() ? "" : "disabled"}>Hapus perlakuan</button></div>
    <div class="simatur">${geser("gnTg", "Tinggi tanggul", .5, 4, .5, T.tinggi, v => angka1(v) + " m")}${geser("gnPq", "Laju pompa", .1, 3, .1, T.laju, v => angka1(v) + " m³/dtk")}
      <p class="fnd" id="gnPl">${esc(rangkumPl())}</p></div>
    <details class="simatur-grup"><summary class="lbl">Asumsi model</summary><div class="simatur">${T.lahan ? geser("gnCN", "Geser CN semua sel", -15, 15, 1, T.dcn, tampilCN) : geser("gnCN", "Bilangan kurva CN", 60, 95, 1, T.cn, tampilCN)}</div></details>
    <button class="btn pri" id="gnJalan" style="width:100%;margin-top:10px" ${T.sibuk ? "disabled" : ""}>${H ? (T.basi ? "Jalankan ulang" : "Jalankan lagi") : "Jalankan simulasi"}</button>
    <p class="fnd" id="gnStatus" aria-live="polite" style="margin-top:6px"></p>
    <div id="gnHasil">${hasilLihat() ? hasilHtml() : ""}</div>
    <div id="gnLanjut">${hasilLihat() ? lanjutHtml() : ""}</div>`;
  if (!el._gnPasang) { el._gnPasang = true; /* animasi berhenti saat jari/klik menyentuh panel: klik tidak bersaing dengan lukisan */
    el.addEventListener("pointerdown", () => { if (T.main) berhenti(); }, true); }
  el.onclick = klikPanel;
  $("#gnProv").onchange = async e => { Simulasi.prov = e.target.value; Simulasi.kab = ""; T.titik = null; T.hasil = null; status("Menyiapkan kecamatan…"); await Simulasi.siapkan(Simulasi.prov); T.k = kecAwal(); panel(); };
  $("#gnKec").onchange = e => { if (!e.target.value) return; T.k = e.target.value; T.titik = null; T.hasil = null; T.tanggul = []; T.pompa = []; nanti(() => { panel(); jalan(); }); };
  pasangGeser(); el.scrollTop = atas; dok();
}
function pasangGeser() {
  const gs = (id, set, t, ikut) => { const i = $("#" + id); if (i) i.oninput = () => { set(+i.value); $("#" + id + "V").textContent = t(+i.value); ikut?.(); tandaiBasi(); }; };
  gs("gnSisi", v => { T.sisi = v * 1000; T.sisiManual = true; }, v => fmt(v) + " km"); gs("gnE", v => T.op.ekstrem = v, v => fmt(v) + " mm");
  gs("gnS", v => T.op.sungai = v, tampilQ, () => { const p = $("#gnSK"); if (p) p.textContent = `${T.op.sungai === 3 ? "Q20 (sekali dalam 20 tahun)" : "Q5 (sekali dalam 5 tahun)"}, puncak jam +30`; });
  gs("gnP", v => T.op.pasang = v, v => angka1(v) + " m"); gs("gnTg", v => T.tinggi = v, v => angka1(v) + " m"); gs("gnPq", v => T.laju = v, v => angka1(v) + " m³/dtk"); gs("gnCN", v => { if (T.lahan) T.dcn = v; else T.cn = v; }, tampilCN);
}
/* fragmen kecil, bukan panel penuh */
function segarPerlakuan() {
  const el = $("#simPanel"); if (!el) return;
  el.querySelectorAll("[data-alat]").forEach(x => x.setAttribute("aria-pressed", T.alat === x.dataset.alat));
  const tg = el.querySelector('[data-alat="tanggul"]'); if (tg) tg.textContent = T.alat === "tanggul" ? "Selesai menggambar" : "Gambar tanggul";
  const pi = el.querySelector("[data-pintu]"); if (pi) pi.setAttribute("aria-pressed", T.pintu);
  const hp = el.querySelector("[data-hapus]"); if (hp) hp.disabled = !adaPerlakuan();
  const pl = $("#gnPl"); if (pl) pl.textContent = rangkumPl();
}
function klikPanel(e) {
  const b = e.target.closest("button"); if (!b || b.disabled) return; const d = b.dataset;
  if (d.mode) return Simulasi.gantiMode(d.mode);
  if (d.gsk) { T.sk = d.gsk; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); tandaiBasi();
    return nanti(() => { $("#gnAtur").innerHTML = aturHtml(); pasangGeser(); }); }
  if (d.alat) return pakaiAlat(d.alat);
  if ("pintu" in d) { T.pintu = !T.pintu; tandaiBasi(); return segarPerlakuan(); }
  if ("hapus" in d) { T.tanggul = []; T.pompa = []; T.pintu = false; T.draf = []; tandaiBasi(); segarPerlakuan(); return nanti(segarAlat); }
  if (d.glihat) { if (T.lihat === d.glihat) return; T.lihat = d.glihat; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); return nanti(() => { segarHasil(); jadwal(); }); }
  if (d.glapis) { const k = d.glapis; T.lapis[k] = !T.lapis[k]; b.setAttribute("aria-pressed", T.lapis[k]); return nanti(() => { terapkanLapis(); if (k === "longsor" && T.lapis.longsor) { T.lsKunci = null; T.lukisKunci = null; jadwal(); } }); }
  if (b.id === "gnJalan") { b.textContent = "Menghitung…"; return nanti(jalan); }
  if (b.id === "gnPita") { b.textContent = "Menghitung…"; return nanti(pita); }
  if (b.id === "gnTanggap") { b.textContent = "Menghitung…"; return nanti(tanggap); }
  if (b.id === "gnPeringkat") { b.textContent = "Menghitung…"; return nanti(peringkatan); }
  if (b.id === "gnKamera") return nanti(() => T.peta?.easeTo({bearing: T.peta.getBearing() + 90, pitch: 60, duration: 1200}));
}
function segarHasil() { const h = $("#gnHasil"); if (h && hasilLihat()) h.innerHTML = hasilHtml(); }
function ringkas(R) {
  const lu = Math.max(...R.luas), tp = R.luas.indexOf(lu); let dm = 0; for (let k = 0; k < R.hmaks.length; k++) if (!T.prep.laut[k] && R.hmaks[k] > dm) dm = R.hmaks[k];
  const pop = popSel(), kp = T.hasil && kepadatan(T.hasil.X.P), jiwa = pop ? jiwaJam(R, pop, tp, .1) : kp ? [lu / 1e6 * kp[0], lu / 1e6 * kp[1]] : null;
  return {lu, tp, dm, vol: Math.max(...R.volume), l72: R.luas[J], kerja: R.neraca.pompaMinta > 0 ? R.neraca.pompa / R.neraca.pompaMinta : 1, jiwa};
}
function lahanHtml() {
  const L = T.lahan, S0 = SLh(); if (!S0) return ""; const sb = (t, d) => `<p class="fnd" style="margin-top:4px">Sumber: ${t}, data s.d. ${d}</p>`;
  if (!L) return `<p class="fnd" style="margin-top:6px">Tutupan lahan tidak termuat (jaringan atau layanan ESA): CN 80 dan n Manning 0,06 dipakai seragam di seluruh area. <span class="pill l2" style="height:17px;font-size:9.5px">asumsi seragam</span></p>`;
  let nm = 0, c = 0; for (let k = 0; k < L.n.length; k++) if (!T.prep.laut[k]) { nm += L.n[k]; c++; }
  return `<table class="tb2" style="margin-top:6px"><tbody><tr><td>Tutupan lahan (${S0.ringkasLahan(L).slice(0, 4).map(x => `${x.nama} ${bulat(x.bagian * 100)} %`).join(", ")})</td><td class="n">n Manning rata-rata ${F2(c ? nm / c : 0)}</td></tr></tbody></table>
    ${sb("ESA WorldCover 2021 v200 (10 m, CC BY 4.0) lewat Microsoft Planetary Computer", "2021")}<p class="fnd" style="margin-top:4px">CN dan n tiap kelas adalah asumsi (tanah kelompok C; USDA TR-55, Chow 1959), lihat halaman Metode.</p>`;
}
function hasilHtml() {
  const kunci = [T.nJalan, T.lihat, !!T.pend].join("|"); if (T.cache.html?.kunci === kunci) return T.cache.html.v;
  const H = T.hasil, X = H.X, a = ringkas(H.dasar), b = H.dengan ? ringkas(H.dengan) : null, R = hasilLihat(), r = R === H.dengan ? b : a, P = X.P, kp = kepadatan(P);
  const orang = s => !s.jiwa ? "tak ada estimasi" : s.lu ? rentang(s.jiwa) : "0", rumah = s => !s.jiwa ? "tak ada estimasi" : s.lu ? rentang(s.jiwa.map(x => x / STg().ASUMSI.JIWA_RUMAH)) : "0", n = R.neraca, sk = SKN.find(s => s.id === T.sk);
  const persen = x => x < 1e-4 ? "< 0,01 %" : F2(x * 100) + " %";
  const tot = X.hari.reduce((s, x) => s + x.p, 0), M = X.M, ens = T.sk === "ansambel";
  const nL = (() => { const L = petaLongsor(J); let c = 0; for (let k = 0; k < L.length; k++) if (L[k] >= .4 && !T.prep.laut[k]) c++; return c * T.dem.dx ** 2; })();
  const sel = (x, p) => { const r = p ? Math.round(x * 10) / 10 : Math.round(x); return r === 0 ? "0" : (r > 0 ? "+" : "") + (p ? angka1(r) : fmt(r)); }; /* tanpa "-0" */
  const baris = (nm, f, sat, p) => `<tr><td>${nm}</td><td class="n num">${p ? angka1(f(a)) : bulat(f(a))}${sat}</td><td class="n num">${p ? angka1(f(b)) : bulat(f(b))}${sat}</td><td class="n num">${sel(f(b) - f(a), p)}${sat}</td></tr>`;
  const sb = (t, s) => `<p class="fnd" style="margin-top:4px">Sumber: ${t}${s ? `, data s.d. ${s}` : ""}</p>`;
  const v = `<p class="fnd" style="margin-top:12px"><span class="pill l3" style="height:17px;font-size:9.5px">eksperimental</span> Model eksperimental. Belum divalidasi terhadap peta genangan nyata. DEM permukaan SRTM ~30 m (tajuk/atap ikut terukur), tanpa drainase kota, ${fmt(T.prep.isi)} sel cekungan didangkalkan.</p>
    <div class="simringkas"><p style="margin:0">${r.lu ? `${esc(sk.n)}: genangan 10 cm ke atas terluas <b>${bulat(ha(r.lu))} ha</b> pada jam +${fmt(r.tp)} (${pukul(r.tp)})` : `${esc(sk.n)}: tidak ada genangan 10 cm ke atas dalam 72 jam`}${b ? `, ${bulat(ha(a.lu))} ha tanpa perlakuan` : ""}.</p></div>
    <table class="tb2" style="margin-top:8px"><tbody>
      <tr><td>Luas tergenang puncak (≥ 10 cm)</td><td class="n">${bulat(ha(r.lu))} ha</td></tr>
      <tr><td>Kedalaman maks</td><td class="n">${angka1(r.dm)} m</td></tr>
      <tr><td>Orang di genangan ≥ 10 cm saat puncak (orde besaran${T.lahan ? ", disebar menurut permukiman" : ", kepadatan rata-rata"})</td><td class="n">${orang(r)}</td></tr>
      <tr><td>Rumah terendam <span class="pill l1" style="height:17px;font-size:9.5px">asumsi</span> (jiwa ÷ ${angka1(STg().ASUMSI.JIWA_RUMAH)} per rumah)</td><td class="n">${rumah(r)}</td></tr>
      <tr><td>Lereng dengan indeks kerawanan longsor ≥ 0,4 di jam +72</td><td class="n">${bulat(ha(nL))} ha</td></tr></tbody></table>
    <p class="fnd" style="margin-top:4px">Indeks longsor: ${LABEL_LONGSOR}.</p>
    <div class="simchips" role="group" aria-label="Lapisan peta" style="margin-top:10px">${[["air", "Genangan"], ["longsor", "Kerawanan longsor"], ["citra", "Citra satelit"]].map(([k, nm]) => `<button type="button" data-glapis="${k}" aria-pressed="${T.lapis[k]}">${nm}</button>`).join("")}
      <button type="button" id="gnKamera">Putar kamera</button></div>
    ${b ? `<div class="simchips" role="group" aria-label="Hasil yang dilihat" style="margin-top:6px"><button type="button" data-glihat="dasar" aria-pressed="${T.lihat === "dasar"}">Tanpa perlakuan</button><button type="button" data-glihat="dengan" aria-pressed="${T.lihat === "dengan"}">Dengan perlakuan</button></div>
    <div class="lbl" style="margin-top:12px">Sebelum dan sesudah perlakuan</div>
    <table class="tb3" style="margin-top:4px"><thead><tr><th></th><th class="n">Tanpa</th><th class="n">Dengan</th><th class="n">Selisih</th></tr></thead><tbody>
      ${baris("Luas puncak", s => ha(s.lu), " ha")}${baris("Luas jam +72", s => ha(s.l72), " ha")}
      ${baris("Kedalaman maks", s => s.dm, " m", true)}${baris("Volume puncak", s => s.vol, " m³")}
      ${a.jiwa && b.jiwa ? baris("Orang di genangan (tengah rentang)", s => tengah(s.jiwa), "") : ""}</tbody></table>
    ${b.kerja < .999 ? `<p class="fnd">Pompa hanya bekerja ${bulat(b.kerja * 100)} % dari kapasitas.</p>` : ""}` : ""}
    <div class="lbl" style="margin-top:12px">Masukan dari data</div>
    <table class="tb2" style="margin-top:4px"><tbody>
      ${X.hari.map((x, d) => `<tr><td>Hujan ${tglPendek(S.hujan.hari[M.i0 + d])}${ens && !x.ubah ? " (tetap prakiraan)" : ""}</td><td class="n">${angka1(x.p)} mm</td></tr>`).join("")}
      <tr><td>Hujan menjadi limpasan (${T.lahan ? `CN rata-rata ${fmt(Math.round(X.cn))} dari tutupan lahan${T.dcn ? `, digeser ${T.dcn > 0 ? "+" : ""}${fmt(T.dcn)}` : ""}` : `CN ${fmt(T.cn)} seragam`} <span class="pill l1" style="height:17px;font-size:9.5px">asumsi</span>, tanah ${["", "kering", "normal", "basah"][X.amc]})</td><td class="n">${bulat(X.efektif.reduce((s, v) => s + v, 0))} mm</td></tr></tbody></table>
    ${sb("Open-Meteo (prakiraan hujan), hujan_ansambel ECMWF IFS", tglPendek(S.hujan.hari_ini))}
    ${lahanHtml()}
    <table class="tb2" style="margin-top:6px"><tbody>
      <tr><td>Sungai${X.sungai?.sg ? ` <span translate="no">${esc(X.sungai.sg.kec)}</span>` : ""}</td><td class="n">${X.sungai?.k != null ? `luapan puncak ${bulat(Math.max(...X.sungai.q))} m³/dtk` : X.sungai?.catat || (M.sg ? "di luar area" : "tidak ada titik ≤ 25 km")}</td></tr></tbody></table>
    <p class="fnd" style="margin-top:4px">Debit sungai tidak ikut dikali skenario hujan; luapan disuntik di satu titik.</p>
    ${sb("GloFAS lewat Open-Meteo Flood", S.sungai?.hari?.length ? tglPendek(S.hujan.hari_ini) : "")}
    <table class="tb2" style="margin-top:6px"><tbody>
      <tr><td>Muka laut maks</td><td class="n">${X.muka ? `${angka1(Math.max(...X.muka))} m${X.mukaSumber === "asumsi" ? " (asumsi)" : ""}` : "bukan pesisir"}</td></tr></tbody></table>
    ${X.muka && X.mukaSumber === "rob" ? sb("Open-Meteo Marine (rob.json)", S.rob?.dibuat ? tglWIB(S.rob.dibuat) : "") : ""}
    ${T.pend ? sb(esc(T.pend.sumber || "WorldPop"), "") : ""}
    <div class="lbl" style="margin-top:12px">Neraca massa</div>
    <table class="tb2" style="margin-top:4px"><tbody>
      <tr><td>Masuk: limpasan + sungai + laut</td><td class="n">${bulat(n.masuk)} m³</td></tr>
      <tr><td>Keluar: tepi area + laut + pompa</td><td class="n">${bulat(n.keluar)} m³</td></tr>
      <tr><td>Tersimpan di jam +72</td><td class="n">${bulat(n.simpan)} m³</td></tr>
      <tr><td>Galat numerik hitungan (bukan akurasi model)</td><td class="n">${persen(n.galat)}</td></tr></tbody></table>`;
  T.cache.html = {kunci, v}; return v;
}
/* ---------- pita ketidakpastian, tanggap darurat, peringkat perlakuan ---------- */
const NAMA_JENIS = {basarnas: "Basarnas", bpbd: "BPBD", pos: "Pos"};
const judulKata = t => String(t).toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
const namaUnit = u => u.jenis === "bpbd" ? "BPBD " + judulKata(u.nama) : u.nama;
const rpSatu = x => x >= 1e9 ? `Rp ${angka1(x / 1e9)} miliar` : x >= 1e6 ? `Rp ${angka1(x / 1e6)} juta` : `Rp ${bulat(x / 1e3)} ribu`;
const adaM3 = () => (T.hasil?.X.M.ens?.e.m3?.[0] || []).filter(Number.isFinite).length >= 30;
function lanjutHtml() {
  const H = T.hasil; if (!H) return ""; const pop = popSel(), ok = adaM3() && T.sk === "dasar";
  return `${bandingHtml()}<div class="lbl" style="margin-top:14px">Pita ketidakpastian hujan</div>
    <p class="fnd">Tiga hitungan dengan hujan 3 hari persentil 10, 50 dan 90 dari 51 anggota ECMWF.</p>
    <button class="btn sec" id="gnPita" style="width:100%" ${ok ? "" : "disabled"}>${T.pita ? "Hitung ulang pita" : "Hitung pita (3 hitungan)"}</button>
    ${!adaM3() ? `<p class="fnd">Tidak tersedia: tak ada sebaran per anggota ansambel untuk area dan tanggal ini.</p>` : T.sk !== "dasar" ? `<p class="fnd">Pilih skenario Prakiraan untuk menghitung pita.</p>` : ""}
    <div id="gnPitaH">${pitaHtml()}</div>
    <div class="lbl" style="margin-top:14px">Tanggap darurat</div>
    <p class="fnd">Waktu tiba pangkalan terdekat ke permukiman yang tergenang, lewat jalan yang tidak terendam.</p>
    <button class="btn sec" id="gnTanggap" style="width:100%" ${pop ? "" : "disabled"}>${T.tg ? "Hitung ulang tanggap" : "Hitung tanggap"}</button>
    ${pop ? "" : `<p class="fnd">Butuh estimasi penduduk area ini (penduduk.json).</p>`}
    <div id="gnTanggapH">${tanggapHtml()}</div>
    <div class="lbl" style="margin-top:14px">Peringkat perlakuan</div>
    <p class="fnd">Tiap kandidat dijalankan lewat model yang sama lalu diurutkan menurut jiwa yang terselamatkan.</p>
    <button class="btn sec" id="gnPeringkat" style="width:100%" ${pop ? "" : "disabled"}>${T.pm ? "Hitung ulang peringkat" : "Peringkatkan perlakuan (6 hitungan)"}</button>
    <div id="gnPeringkatH">${peringkatHtml()}</div>`;
}
/* pembanding dengan kejadian tercatat: DIBI (kejadian.json kejadian_dibi) di kabupaten yang sama, +-7 hari dari tanggal data. DIBI hanya memuat jumlah
   orang, bukan luas atau kedalaman genangan, jadi yang dibandingkan jiwa terdampak vs jiwa model di genangan >= 10 cm saat puncak. */
function bandingHtml() {
  const d = S.kejadian?.kejadian_dibi; if (!d || T.titik || !T.k) return ""; const [pv, kb] = T.k.split("|"), t0 = Date.parse(S.hujan.hari_ini);
  const ev = d.filter(e => e.prov === pv && e.kab === kb && /banjir/.test(e.jenis) && Math.abs(Date.parse(e.tanggal) - t0) <= 7 * 864e5);
  if (!ev.length) return `<p class="fnd" style="margin-top:6px">Pembanding tercatat: tidak ada kejadian banjir DIBI di ${esc(kb)} dalam 7 hari dari ${tglPendek(S.hujan.hari_ini)}.</p>`;
  const luasK = luasKec(T.k), td = ev.reduce((a, e) => a + (e.terdampak || 0), 0), mg = ev.reduce((a, e) => a + (e.mengungsi || 0), 0), r = ringkas(T.hasil.dasar), m = r.jiwa ? tengah(r.jiwa) : null;
  return `<div class="lbl" style="margin-top:14px">Dibanding kejadian tercatat</div>
    <table class="tb2" style="margin-top:4px"><tbody><tr><td>DIBI di <span translate="no">${esc(kb)}</span>, ${fmt(ev.length)} kejadian</td><td class="n">${fmt(td)} terdampak, ${fmt(mg)} mengungsi</td></tr>
    ${m != null ? `<tr><td>Model, orang di genangan ≥ 10 cm (satu kotak, tengah rentang)</td><td class="n">${orde(m)}${(td || mg) ? `<small>${m / Math.max(td, mg) * 100 >= 100 ? fmt(Math.round(m / Math.max(td, mg) * 100)) : angka1(m / Math.max(td, mg) * 100)} % dari tercatat</small>` : ""}</td></tr>` : ""}</tbody></table>
    <p class="fnd" style="margin-top:4px">Kotak ${fmt(Math.round(T.dem.sisi / 1000))} km${luasK > 0 ? (T.dem.sisi ** 2 / 1e6 >= luasK ? ", mencakup seluruh kecamatan" : ` = ${fmt(Math.round(T.dem.sisi ** 2 / 1e6 / luasK * 100))} % luas kecamatan`) : ""}, DIBI mencatat satu kabupaten dan jumlah orang saja, jadi rasio ini cuma pemeriksaan orde besaran. Selisih belum dipakai mengkalibrasi apa pun karena DIBI tak memuat luas atau kedalaman.</p>`;
}
const segarLanjut = () => { const el = $("#gnLanjut"); if (el && T.hasil) el.innerHTML = lanjutHtml(); };
function pitaHtml() {
  const p = T.pita; if (!p) return ""; let pb = "";
  try { const pk = Simulasi.perKejadian?.(); if (S.kejadian && pk && pk.terdampak[1] > 0) pb = `<p class="fnd" style="margin-top:6px">Pembanding tercatat (DIBI, provinsi ini): median ${orde(pk.terdampak[1])} orang terdampak per kejadian banjir, P25–P75 ${orde(pk.terdampak[0])}–${orde(pk.terdampak[2])}. Satu kejadian DIBI mencakup satu kabupaten, jadi ini pembanding kasar. Belum ada peta genangan hasil pengamatan di data, jadi model belum divalidasi.</p>`; } catch {}
  return `<table class="tb3" style="margin-top:6px"><thead><tr><th></th><th class="n">P10</th><th class="n">P50</th><th class="n">P90</th></tr></thead><tbody>
    <tr><td>Hujan 3 hari</td>${p.mm.map(v => `<td class="n num">${bulat(v)} mm</td>`).join("")}</tr>
    <tr><td>Luas genangan puncak</td>${p.ha.map(v => `<td class="n num">${bulat(v)} ha</td>`).join("")}</tr>
    ${p.jiwa.every(Boolean) ? `<tr><td>Orang di genangan (tengah rentang)</td>${p.jiwa.map(v => `<td class="n num">${orde(tengah(v))}</td>`).join("")}</tr>` : ""}</tbody></table>
    <p class="fnd" style="margin-top:4px">Prakiraan tunggal: ${bulat(p.det.mm)} mm, ${bulat(p.det.ha)} ha. Persentil per jumlah 3 hari semua anggota; sebaran spasial dan sungai tidak ikut berubah.</p>${pb}`;
}
async function pita() {
  if (T.sibuk || !T.hasil || !adaM3() || T.sk !== "dasar") return;
  T.sibuk = true; berhenti();
  try {
    const H = T.hasil, X = H.X, m3 = X.M.ens.e.m3[0], mm = [.1, .5, .9].map(q => kuantil(m3, q)), base = X.hari.reduce((a, x) => a + x.p, 0), rs = [];
    for (let i = 0; i < 3; i++) {
      const sk = base > 0 ? mm[i] / base : 0, hari = base > 0 ? X.hari.map(x => ({p: x.p * sk, jam: x.jam, imax: x.imax * sk})) : [0, 1, 2].map(() => ({p: mm[i] / 3, jam: 6, imax: mm[i] / 12}));
      const hu = SG.hietograf(hari), L = limpasanX(hu, X.amc), Xq = {...X, hari, hujan: hu, efektif: L.efektif, seri: L.seri, kelas: L.kelas};
      const r = (await kerja({jenis: "jalan", cfg: cfgDari(Xq, false)}, p => status(`Pita ${i + 1}/3 (persentil ${[10, 50, 90][i]})… ${fmt(Math.round(p * 100))} %`))).hasil; rs.push(ringkas(r));
    }
    T.pita = {mm, ha: rs.map(r => ha(r.lu)), jiwa: rs.map(r => r.jiwa), det: {mm: base, ha: ha(ringkas(H.dasar).lu)}}; status("");
  } catch (e) { console.warn("SimTampak pita:", e); status("Gagal: " + e.message); }
  T.sibuk = false; segarLanjut();
}
/* jalan, titik aman: peta MapLibre tersembunyi (sumber openmaptiles = ubin OSM yang sama dengan peta dasar), seperti public/sim_adegan.js */
async function muatVektor() {
  if (T.vek?.kunci === T.demKunci) return T.vek.v;
  const D = T.dem, src = T.peta?.getStyle?.().sources?.openmaptiles; if (!src || !window.maplibregl) return null;
  let el, m, v = null; const KELAS_POI = {school: "sekolah", college: "sekolah", kindergarten: "sekolah", hospital: "faskes", clinic: "faskes", doctors: "faskes"};
  try {
    const zm = D.sisi > 12000 ? 13 : 14, mpp = 78271.52 * Math.cos(D.lat * Math.PI / 180) / 2 ** zm, px = Math.min(2400, Math.ceil(D.sisi * 1.1 / mpp));
    el = document.createElement("div"); el.style.cssText = `position:fixed;left:-9999px;top:0;width:${px}px;height:${px}px;visibility:hidden`; document.body.append(el);
    const ly = (id, sl, type) => ({id, type, source: "openmaptiles", "source-layer": sl, paint: {[type + "-opacity"]: 0}});
    m = new maplibregl.Map({container: el, interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: 1, center: [D.lon, D.lat], zoom: zm,
      style: {version: 8, sources: {openmaptiles: src}, layers: [ly("t", "transportation", "line"), ly("p", "poi", "circle")]}});
    await new Promise(res => { const to = setTimeout(res, 15000); m.once("idle", () => { clearTimeout(to); res(); }); });
    const q = sl => m.querySourceFeatures("openmaptiles", {sourceLayer: sl}), garis = [], poi = [], lihat = new Set();
    if (!q("transportation").length) await new Promise(r => setTimeout(r, 5000)); /* idle kadang datang sebelum ubin vektor terurai */
    for (const f of q("transportation")) { const g = f.geometry, k = f.properties.class; if (!STg().LAJU_JALAN[k]) continue; for (const ln of g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []) garis.push({p: ln, k}); }
    for (const f of q("poi")) { const c = f.properties.class, j = KELAS_POI[c]; if (!j || f.geometry.type !== "Point") continue; const [lon, lat] = f.geometry.coordinates, id = lon.toFixed(5) + "," + lat.toFixed(5); if (lihat.has(id)) continue; lihat.add(id);
      poi.push({nama: f.properties.name || (j === "sekolah" ? "Sekolah" : "Fasilitas kesehatan"), jenis: j, lat, lon}); }
    v = garis.length || poi.length ? {garis, poi} : null;
  } catch (e) { console.warn("SimTampak: ubin OSM (jalan, titik aman) tidak termuat", e); }
  finally { try { m?.remove(); } catch {} el?.remove(); }
  if (v) T.vek = {kunci: T.demKunci, v}; return v;
}
async function pilihUnit() {
  T.unitDaftar ||= (async () => { const [u, pk] = await Promise.all([muatJSON("data/unit_respons.json").catch(() => null), S.posko ? Promise.resolve(S.posko) : muatJSON("data/posko.json").catch(() => null)]);
    return [...(u?.unit || []).filter(x => NAMA_JENIS[x.j]).map(x => ({nama: x.n, jenis: x.j, lat: x.lat, lon: x.lon})),
      ...(pk?.lapangan || []).filter(x => x.lat != null).map(x => ({nama: `Posko ${x.desa ? "desa " + x.desa : "kec. " + x.kec}`, jenis: "pos", lat: x.lat, lon: x.lon}))]; })();
  const semua = await T.unitDaftar, P = pusat(), o = [];
  for (const j of ["basarnas", "bpbd", "pos"]) o.push(...semua.filter(x => x.jenis === j).map(x => ({...x, km: km(P.lat, P.lon, x.lat, x.lon)})).filter(x => x.km <= 150).sort((a, b) => a.km - b.km).slice(0, j === "pos" ? 1 : 2));
  return o;
}
async function tanggap() {
  if (T.sibuk || !T.hasil) return; const pop = popSel(); if (!pop) return toast("Tanggap butuh estimasi penduduk area ini");
  T.sibuk = true; berhenti();
  try {
    status("Memuat jalan dan titik aman (OSM)…"); const vek = await muatVektor(); status("Memuat pangkalan…"); const unit = await pilihUnit(); status("Menghitung waktu tempuh…"); await jeda();
    const D = T.dem, pr = T.prep, R = T.hasil.dasar, N = D.nx * D.ny, keSel = (lo, la) => SG.keSel(D, lo, la), dariSel = (i, j) => SG.dariSel(D, i, j);
    const ctx = {nx: D.nx, ny: D.ny, dx: D.dx, laut: pr.laut, laju: vek ? STg().rasterJalan(vek.garis, keSel, D.nx, D.ny) : new Float32Array(N), kedalaman: R.kedalaman, hmaks: R.hmaks, z: pr.z, J, pop, keSel, dariSel, unit, poi: vek?.poi || []};
    const r = STg().analisisTanggap(ctx); T.tgCtx = ctx; if (r.ada) unit.forEach(u => { u.luarKm = r.snapshot[0].unit.find(y => y.nama === u.nama && y.jenis === u.jenis)?.luarKm; });
    T.tg = {...r, jalan: !!vek, nPoi: vek?.poi.length || 0, nUnit: unit.length, unit}; status(""); segarAlat();
  } catch (e) { console.warn("SimTampak tanggap:", e); status("Gagal: " + e.message); }
  T.sibuk = false; segarLanjut();
}
function tanggapHtml() {
  const g = T.tg; if (!g) return ""; if (!g.ada) return `<p class="fnd" style="margin-top:6px">${esc(g.alasan)}</p>`;
  const [a, b] = [g.snapshot[0], g.snapshot.at(-1)], dua = g.snapshot.length > 1, A = STg().ASUMSI;
  const baris = u => `<tr><td>${esc(namaUnit(u))}<small>${NAMA_JENIS[u.jenis]} · ${fmt(Math.round(u.km))} km${u.luarKm ? `, ${fmt(Math.round(u.luarKm))} km jalan ke tepi area` : ", di dalam area"}</small></td>${[a, ...(dua ? [b] : [])].map(s => { const x = s.unit.find(y => y.nama === u.nama && y.jenis === u.jenis); return `<td class="n num">${waktu(x.tiba)}</td>`; }).join("")}</tr>`;
  return `<table class="tb3" style="margin-top:6px"><thead><tr><th>Pangkalan</th><th class="n">Jam +${fmt(a.jam)}</th>${dua ? `<th class="n">Jam +${fmt(b.jam)}</th>` : ""}</tr></thead><tbody>${g.unit.map(baris).join("") || `<tr><td colspan="3">Tidak ada pangkalan BPBD, Basarnas atau pos dalam 150 km.</td></tr>`}</tbody></table>
    <p class="fnd" style="margin-top:4px">Waktu tiba di permukiman tergenang; kolom kedua memakai jalan yang terendam pada jam puncak.</p>
    <table class="tb2" style="margin-top:6px"><tbody>
      <tr><td>Orang di genangan ≥ 30 cm (jam +${fmt(b.jam)})</td><td class="n">${rentang(b.jiwa)}</td></tr>
      <tr><td>Titik aman terdekat${b.aman ? ` <span translate="no">${esc(b.aman.nama)}</span>` : ""}</td><td class="n">${b.aman ? `${b.aman.jenis === "dem" ? "tanah tinggi DEM" : b.aman.jenis}, ${waktu(b.aman.jam)}` : "tidak ada"}</td></tr>
      <tr><td>Warga ke titik aman (median, 90 %)</td><td class="n">${waktu(b.evak)}, ${waktu(b.evak90)}</td></tr>
      <tr><td>Perahu karet: jiwa terangkut dalam ${fmt(A.JENDELA)} jam <span class="pill l1" style="height:17px;font-size:9.5px">asumsi</span></td><td class="n">${rentang([b.angkut, b.angkut])}${b.angkut ? ` (${fmt(Math.round(b.bagian * 100))} % dari sasaran)` : ""}</td></tr></tbody></table>
    <p class="fnd" style="margin-top:4px">Perahu per pangkalan (Basarnas ${A.PERAHU.basarnas}, BPBD ${A.PERAHU.bpbd}, pos ${A.PERAHU.pos}) dan ${fmt(A.KAPASITAS)} jiwa per perahu adalah asumsi, bukan inventaris. Jalan tak bisa dilewati bila air ≥ ${fmt(A.AMBANG_JALAN * 100)} cm.</p>
    <p class="fnd" style="margin-top:4px">Sumber: ${g.jalan ? `OpenStreetMap (ODbL): jalan dan ${fmt(g.nPoi)} sekolah/faskes sebagai titik aman` : "jaringan jalan OSM tidak termuat, perjalanan dihitung jalan kaki dan perahu"}; pangkalan dari unit_respons.json (BNPB, OSM) dan posko.json.</p>`;
}
async function peringkatan() {
  if (T.sibuk || !T.hasil) return; if (!T.tg) await tanggap(); const g = T.tg; if (!g || T.sibuk) return;
  T.sibuk = true; berhenti();
  try {
    const H = T.hasil, X = H.X, R0 = H.dasar, D = T.dem, pr = T.prep, N = D.nx * D.ny, pop = popSel(), Tg = STg(), ks = Tg.kandidatPerlakuan({nx: D.nx, ny: D.ny, dx: D.dx, hmaks: R0.hmaks, pop, laut: pr.laut, z: pr.z, sungaiK: X.sungai?.k ?? -1, adaLaut: pr.nLaut > 0});
    if (!ks.kandidat.length) { T.pm = {alasan: ks.alasan}; T.sibuk = false; return segarLanjut(); }
    const dasar = Tg.jiwaTerpapar(R0.hmaks, pop, .5), hasil = [];
    for (let i = 0; i < ks.kandidat.length; i++) { const c = ks.kandidat[i];
      const r = (await kerja({jenis: "jalan", cfg: cfgDari(X, false, c)}, p => status(`Kandidat ${i + 1}/${ks.kandidat.length}: ${c.nama}… ${fmt(Math.round(p * 100))} %`))).hasil;
      hasil.push({id: c.id, nama: c.nama, ket: c.ket, biaya: c.biaya, berat: Tg.jiwaTerpapar(r.hmaks, pop, .5), lu: Math.max(...r.luas)}); }
    /* evakuasi dini: bukan hitungan hidrolika; hanya soal waktu (air tiba 30 cm vs peringatan + mobilisasi + jalan ke titik aman) */
    const aman = g.ada && g.snapshot.at(-1).aman, ctx = T.tgCtx;
    if (aman && ctx) { const tiba = new Float64Array(N).fill(Infinity), K = R0.kedalaman; for (let k = 0; k < N; k++) for (let t = 0; t <= J; t++) if (K[t * N + k] >= .3) { tiba[k] = t; break; }
      const {v, air} = Tg.kecepatan(ctx.laju, K.subarray(0, N), pr.laut), ke = Tg.waktuTempuh(D.nx, D.ny, D.dx, v, air, [{k: aman.k, t: 0}]), ev = Tg.evakuasiDini(R0.hmaks, pop, tiba, ke), b = Tg.BIAYA.evakuasiJiwa;
      hasil.push({id: "evak", nama: "Evakuasi dini", ket: `peringatan, warga bergerak ${fmt(Tg.ASUMSI.MOBILISASI)} jam kemudian ke ${aman.nama}; ${fmt(Math.round(Tg.ASUMSI.PATUH[0] * 100))}–${fmt(Math.round(Tg.ASUMSI.PATUH[1] * 100))} % warga patuh`, biaya: [ev.diungsikan[0] * b[0], ev.diungsikan[1] * b[1]], selamat: ev.diungsikan, lu: Math.max(...R0.luas)}); }
    T.pm = {dasar, urut: Tg.peringkat(dasar, hasil), luDasar: Math.max(...R0.luas)}; status("");
  } catch (e) { console.warn("SimTampak peringkat:", e); status("Gagal: " + e.message); }
  T.sibuk = false; segarLanjut();
}
function peringkatHtml() {
  const m = T.pm; if (!m) return ""; if (m.alasan) return `<p class="fnd" style="margin-top:6px">${esc(m.alasan)}</p>`;
  return `<p class="fnd" style="margin-top:6px">Tanpa perlakuan: ${rentang(m.dasar)} jiwa di sel dengan air maks ≥ 50 cm.</p>
    <table class="tb3" style="margin-top:4px"><thead><tr><th>Perlakuan</th><th class="n">Jiwa selamat</th><th class="n">Biaya</th></tr></thead><tbody>
    ${m.urut.map((x, i) => `<tr><td>${fmt(i + 1)}. ${esc(x.nama)}<small>${esc(x.ket)}</small></td><td class="n num">${tengah(x.selamat) > 0 ? rentang(x.selamat) : "0"}<small>${tengah(x.rumah) > 0 ? rentang(x.rumah) + " rumah" : ""}</small></td><td class="n num">${rpS(x.biaya[0], x.biaya[1])}<small>${x.rpPerJiwa ? rpSatu(x.rpPerJiwa) + " per jiwa" : "tanpa manfaat"}</small></td></tr>`).join("")}</tbody></table>
    <p class="fnd" style="margin-top:4px">Jiwa selamat = penduduk di sel yang tak lagi tergenang ≥ 50 cm, rentang dari rentang penduduk. Biaya adalah asumsi rentang, belum dari harga satuan resmi (HSPK). Penduduk disebar menurut tutupan permukiman.</p>`;
}

/* dok jam + legenda: dibangun sekali per hasil; #gnMain/#gnT tidak diganti (fokus tetap) */
function dok() {
  const el = $("#simLegenda"); if (!el) return; const R = hasilLihat(), kunci = R ? "h" + T.nJalan + T.lapis.longsor : "kosong";
  if (T.dokKunci === kunci && el.querySelector(R ? "#gnT" : ".fnd")) return jadwal(); T.dokKunci = kunci;
  el.innerHTML = R ? `<div class="gn-waktu"><button type="button" class="gn-ib" id="gnMain" aria-label="Putar 72 jam">${ik(IK.main)}</button>
      <input type="range" id="gnT" min="0" max="${J}" step="1" value="${Math.floor(T.t)}" aria-label="Jam simulasi"><b id="gnJam" class="num"></b></div>
    <div class="leg row"><span id="gnLuasT" class="num"></span>${[[.1, "10 cm"], [.5, "50 cm"], [1, "1 m"], [2, "2 m"], [4, "≥ 4 m"]].map(([d, n]) => `<span><i class="sw" style="background:rgba(${warnaAir(d).slice(0, 3).join(",")},.9)"></i>${n}</span>`).join("")}
      ${T.lapis.longsor ? `<span><i class="sw" style="background:#c9503a"></i>indeks longsor ≥ 0,4 (relatif)</span>` : ""}</div>`
    : `<div class="lbl" style="margin:0">Genangan 72 jam</div><div class="fnd">Pilih area lalu jalankan simulasi.</div>`;
  if (!R) return;
  ikonMain(); $("#gnMain").onclick = putar;
  $("#gnT").oninput = e => { berhenti(); T.t = +e.target.value; jadwal(); };
  T.lukisKunci = null; jadwal();
}

/* ---------- masuk / keluar mode ---------- */
async function render() {
  const pa = $("#simPanel"); if (!pa) return; SL = window.SimLongsor;
  if (!Simulasi.kec || Simulasi.kode !== Simulasi.prov) { pa.innerHTML = `<div class="kosong"><div class="spin"></div>Menyiapkan kecamatan…</div>`; await Simulasi.siapkan(Simulasi.prov); }
  if (!T.k || !Simulasi.kec[T.k]) T.k = kecAwal();
  $("#p-sim").classList.add("gn"); T.dokKunci = null;
  panel(); await petaSiap(); if (T.dem) { pasangArea(false); T.lukisKunci = null; jadwal(); }
  /* kejadian nyata terpilih: hitung sekali begitu mode dibuka, supaya layar tidak mulai kosong */
  if (Simulasi.awalInfo && !T.awalJalan && !T.hasil && !T.titik && T.k === Simulasi.awalInfo.k) { T.awalJalan = true; nanti(jalan); }
}
function lepas() { berhenti(); $("#p-sim")?.classList.remove("gn"); const el = $("#simPeta3"); if (el) el.hidden = true; const p = $("#simPeta"); if (p) p.hidden = false; $("#tip")?.classList.remove("on"); }
return {render, lepas, jalan, T, _uji: {sisiKec, muatVektor, susun, cfgDari, masukan, hariSkenario, kepadatan, luapan, orde, popSel, jiwaJam, rpS, waktu, kuantil, limpasanX}};
})();
window.SimTampak = SimTampak;
