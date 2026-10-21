/* model.js — logika murni simulasi asap (tanpa DOM, tanpa three, tanpa MapLibre; diuji `node --test tests/udara/`).
   Dispersi Lagrangian partikel di peramban: tiap sumber (kompleks api dari /data/kluster.json, PLTU dari pltu.json) melepas
   partikel bermassa tiap 30 menit (api) atau 60 menit (PLTU); partikel diadveksi angin prakiraan (bilinear ruang-waktu, dicampur
   antar lapis menurut tinggi), digoyang difusi turbulen acak (Box-Muller, seed tetap mulberry32 -> hasil dapat diulang),
   diendapkan (deposisi kering + peluruhan umum). Konsentrasi permukaan = massa partikel di dalam lapisan campuran dibagi
   (luas sel x tinggi lapisan campuran dari blh). Jalan mulai 24 jam SEBELUM jam 0 (spin-up, angin dibekukan di jam 0).
   Linearitas: massa tiap partikel hanya dikalikan faktor skenario, jadi kontribusi per grup sumber ke tiap kota dicatat sekali
   dan "padamkan kompleks X" dihitung tanpa simulasi ulang (pakai bilangan acak yang sama di semua skenario). */

export const KONF = {
  dt: 900,            /* detik per langkah */
  spin: 24,           /* jam spin-up sebelum jam 0 */
  jam: 72,
  sel: 0.25,          /* derajat per sel kisi keluaran */
  /* Emisi api dari energi radiatif (FRE). PM2,5 (g/s) = frp24 / lintasan x koreksiApi x bahan-kering-per-MJ x faktor emisi.
     frp24 di kluster.json = JUMLAH FRP semua deteksi 24 jam; satu api terlihat sekali tiap lintasan satelit, jadi daya rata-rata = frp24 / lintasan.
     lintasan = jumlah lintasan satelit yang MELIHAT api di sekitar kompleks (dihitung dari hotspot24.json per kompleks, lihat lintasanKompleks); cadangan 4 bila tak ada.
     Non-gambut: 0,368 kg/MJ (Wooster dkk. 2005) x 9,1 g/kg (hutan tropis, Andreae dan Merlet 2001; semak/pertanian lebih rendah, jadi ini batas atas).
     Gambut: membara dengan FRP kecil tetapi bahan kering besar, jadi konversi FRE lain: 3,5 kg/MJ (ORDE GFAS, Kaiser dkk. 2012 / Heil 2010; ASUMSI, belum dicek ke tabelnya)
     x 17,3 g/kg (Jayarathne dkk. 2018, gambut Kalimantan Tengah; sama dengan atribusi.py). koreksiApi = api kecil dan tertutup awan/asap tak terdeteksi: ASUMSI. */
  dmFre: 0.368, dmGambut: 3.5, efGambut: 17.3, efMineral: 9.1, lintasanCadangan: 4, koreksiApi: 1.5,
  efPltu: 0.05,       /* g PM2,5 primer per kWh, batu bara dengan ESP; hanya primer */
  kfPltu: 0.6,        /* faktor kapasitas bila pltu.json tak memuat fk */
  khBL: 2500, khAtas: 300, kzBL: 40, kzAtas: 2, /* m2/s */
  vd: 0.002,          /* m/s deposisi kering PM2,5 */
  tau: 5 * 24 * 3600, /* s peluruhan umum (hujan, dll) */
  blhMin: 150,
  ambang: 55.5,       /* µg/m³, batas bawah "Tidak sehat" (P.14/2020) */
  anak: 0.24,         /* porsi penduduk usia sekolah (5-18 th) */
  nApi: 80, nLump: 40, nPltu: 40,
  /* tinggi lapis angin (m di atas tanah, kira-kira) menurut nama lapis */
  zLapis: {"10m": 10, "925hPa": 760, "850hPa": 1500, "700hPa": 3000}
};

/* g PM2,5 per MJ FRE menurut jenis lahan, dan laju emisi (g/s) dari jumlah FRP 24 jam kompleks */
export const efPerMJ = gambut => gambut ? KONF.dmGambut * KONF.efGambut : KONF.dmFre * KONF.efMineral;
export const emisiApi = (frp24, gambut, lintasan) => frp24 / Math.max(1, lintasan || KONF.lintasanCadangan) * KONF.koreksiApi * efPerMJ(gambut);
/* Jumlah lintasan satelit yang melihat api dalam 24 jam terakhir dekat tiap kompleks. rows = hotspot24.json (kolom lat, lon, jam [jam relatif ke acuan, negatif], sensor ...).
   Satu lintasan = satu sensor dengan deteksi berurutan yang selisihnya <= 1 jam; hanya deteksi dalam radius derajat dan jam >= -24. Hasil per id kompleks (>= 1). */
export function lintasanKompleks(kompleks, rows, radius = .5) {
  const r = rows.filter(x => x[2] >= -24), o = {};
  for (const c of kompleks) { const per = new Map();
    for (const x of r) if (Math.abs(x[0] - c.lat) <= radius && Math.abs(x[1] - c.lon) <= radius) { if (!per.has(x[3])) per.set(x[3], []); per.get(x[3]).push(x[2]); }
    let n = 0; for (const t of per.values()) { t.sort((a, b) => a - b); n++; for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] > 1) n++; }
    o[c.id] = Math.max(1, n); }
  return o;
}

export const KAT = [{n: "Baik", s: "Normal", w: "#5a9e74", fg: "#fff", b: 15.5}, {n: "Sedang", s: "Normal", w: "#e3b94e", fg: "#3b2e00", b: 55.4},
  {n: "Tidak sehat", s: "Waspada", w: "#e8743b", fg: "#fff", b: 150.4}, {n: "Sangat tidak sehat", s: "Siaga", w: "#d64545", fg: "#fff", b: 250.4}, {n: "Berbahaya", s: "Awas", w: "#8a2be2", fg: "#fff", b: Infinity}];
/* label ganda status resmi + kategori ISPU, mis. "Siaga (Sangat tidak sehat)"; Normal tanpa ganda berlebih */
export const labelKat = c => KAT[c].s === "Normal" ? `Normal (${KAT[c].n})` : `${KAT[c].s} (${KAT[c].n})`;
export const kategori = v => { let c = 0; while (c < 4 && v > KAT[c].b) c++; return c; };

/* ---------- acak ---------- */
export const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
/* Box-Muller: tiap pasangan seragam menghasilkan DUA normal (cos lalu sin); nilai kedua disimpan di fungsi acak r supaya urutan seed tetap deterministik */
export function gauss(r) { if (r._s !== undefined) { const v = r._s; r._s = undefined; return v; } let u = 0; while (u === 0) u = r(); const a = Math.sqrt(-2 * Math.log(u)), t = 2 * Math.PI * r(); r._s = a * Math.sin(t); return a * Math.cos(t); }

/* ---------- angin ---------- */
export function kemasAngin(a) {
  const nx = a.lon.length, ny = a.lat.length, nt = a.jam.length, nl = a.lapis.length, t0 = Date.parse(a.jam[0]);
  const rata = (F, ke) => { const o = []; for (let l = 0; l < nl; l++) { const per = []; for (let t = 0; t < nt; t++) { const g = new Float32Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = (F[l][t][j][i] ?? 0) / 10; per.push(g); } o.push(per); } return o; };
  const B = []; for (let t = 0; t < nt; t++) { const g = new Float32Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = a.blh?.[t]?.[j]?.[i] ?? 800; B.push(g); }
  return {nx, ny, nt, nl, lon0: a.lon[0], lat0: a.lat[0], dlon: a.lon[1] - a.lon[0], dlat: a.lat[1] - a.lat[0], t0, dtJam: (Date.parse(a.jam[1]) - t0) / 36e5,
    z: a.lapis.map(n => KONF.zLapis[n] ?? 1000), U: rata(a.u), V: rata(a.v), B};
}
export const medanKosong = A => ({u: Array.from({length: A.nl}, () => new Float32Array(A.nx * A.ny)), v: Array.from({length: A.nl}, () => new Float32Array(A.nx * A.ny)), b: new Float32Array(A.nx * A.ny)});
/* medan angin pada jam ke-h (dari jam 0), diinterpolasi waktu, lalu diubah skenario: skn.anginKali, skn.anginPutar (radian, berlawanan jarum jam) */
export function medanAngin(A, h, skn, out = medanKosong(A)) {
  const bk = skn?.blhKali ?? 1, km = skn?.anginKali ?? 1, th = skn?.anginPutar || 0, c = Math.cos(th) * km, s = Math.sin(th) * km;
  const ft = Math.min(Math.max(h / A.dtJam, 0), A.nt - 1.000001), t0 = ft | 0, w = ft - t0, t1 = Math.min(t0 + 1, A.nt - 1), n = A.nx * A.ny;
  for (let l = 0; l < A.nl; l++) { const ua = A.U[l][t0], ub = A.U[l][t1], va = A.V[l][t0], vb = A.V[l][t1], ou = out.u[l], ov = out.v[l];
    for (let k = 0; k < n; k++) { const u = ua[k] * (1 - w) + ub[k] * w, v = va[k] * (1 - w) + vb[k] * w; ou[k] = c * u - s * v; ov[k] = s * u + c * v; } }
  const ba = A.B[t0], bb = A.B[t1]; for (let k = 0; k < n; k++) out.b[k] = (ba[k] * (1 - w) + bb[k] * w) * bk;
  return out;
}
/* bilinear pada kisi A; di luar kisi dijepit ke tepi */
export function bil(F, A, lon, lat) {
  let x = (lon - A.lon0) / A.dlon, y = (lat - A.lat0) / A.dlat; x = x < 0 ? 0 : x > A.nx - 1.000001 ? A.nx - 1.000001 : x; y = y < 0 ? 0 : y > A.ny - 1.000001 ? A.ny - 1.000001 : y;
  const i = x | 0, j = y | 0, fx = x - i, fy = y - j, o = j * A.nx + i;
  return (F[o] * (1 - fx) + F[o + 1] * fx) * (1 - fy) + (F[o + A.nx] * (1 - fx) + F[o + A.nx + 1] * fx) * fy;
}
/* angin di (lon,lat) pada tinggi z (m) dan jam h: [u, v] m/s. Dicampur linear antar lapis menurut tinggi. */
export function angin(A, h, lon, lat, z = 10, skn) {
  const m = medanAngin(A, h, skn); let l = 0; while (l < A.nl - 1 && z > A.z[l + 1]) l++;
  const w = A.nl === 1 || z <= A.z[0] ? 0 : z >= A.z[A.nl - 1] ? 1 : (z - A.z[l]) / (A.z[l + 1] - A.z[l]), l2 = Math.min(l + 1, A.nl - 1);
  return [bil(m.u[l], A, lon, lat) * (1 - w) + bil(m.u[l2], A, lon, lat) * w, bil(m.v[l], A, lon, lat) * (1 - w) + bil(m.v[l2], A, lon, lat) * w];
}

/* ---------- sumber ---------- */
const dalam = (A, lon, lat) => lon >= A.lon0 && lon <= A.lon0 + (A.nx - 1) * A.dlon && lat >= A.lat0 && lat <= A.lat0 + (A.ny - 1) * A.dlat;
/* Sumber nyata. Api: tiap kompleks aktif (frp24 > 0) jadi satu sumber; 80 teratas menurut FRP punya grupnya sendiri, sisanya digabung per sel 1 derajat
   (titik berat berbobot FRP, 40 gumpalan terbesar, satu grup "api lain"). PLTU: 40 terbesar menurut MW, satu grup. */
export function buatSumber(kluster, pltu, A, o = {}) {
  const P = (kluster?.features || kluster || []).map(f => f.properties || f).filter(p => p.frp24 > 0 && dalam(A, p.lon, p.lat)).sort((a, b) => b.frp24 - a.frp24);
  const grup = [], sumber = [], nApi = o.nApi ?? KONF.nApi;
  const tinggi = (gambut, frp) => { const s = Math.min(1, frp / 8000); return gambut ? [30, 300 + 500 * s] : [100, 500 + 1500 * s]; };
  const buatApi = (p, g) => { const [lo, hi] = tinggi(p.gambut, p.frp24); sumber.push({g, jenis: "api", id: p.id, lat: p.lat, lon: p.lon, Q: emisiApi(p.frp24, p.gambut, p.lintasan), gambut: !!p.gambut, lintasan: p.lintasan || KONF.lintasanCadangan, zlo: lo, zhi: hi, frp: p.frp24}); };
  P.slice(0, nApi).forEach(p => { grup.push({id: p.id, jenis: "api", nama: p.kab ? `Kompleks ${p.kab} ${p.id}` : `Kompleks ${p.id}`, kab: p.kab || "", prov: p.prov || "", frp: p.frp24, luas: p.luas, lat: p.lat, lon: p.lon, konsesi: p.konsesi || []}); buatApi(p, grup.length - 1); });
  const sisa = new Map(); for (const p of P.slice(nApi)) { const k = Math.round(p.lat) + "|" + Math.round(p.lon), q = sisa.get(k) || {frp: 0, la: 0, lo: 0, gb: 0, daya: 0}; q.frp += p.frp24; q.daya += p.frp24 / Math.max(1, p.lintasan || KONF.lintasanCadangan); q.la += p.lat * p.frp24; q.lo += p.lon * p.frp24; q.gb += p.gambut ? p.frp24 : 0; sisa.set(k, q); }
  const lump = [...sisa.values()].sort((a, b) => b.frp - a.frp).slice(0, o.nLump ?? KONF.nLump);
  if (lump.length) { grup.push({id: "lain", jenis: "api", nama: "Api lain", frp: lump.reduce((s, q) => s + q.frp, 0)}); const g = grup.length - 1;
    for (const q of lump) buatApi({id: "lain", lat: q.la / q.frp, lon: q.lo / q.frp, frp24: q.frp, lintasan: q.frp / q.daya, gambut: q.gb > q.frp / 2}, g); }
  const pl = (pltu || []).filter(p => dalam(A, p.lon, p.lat)).sort((a, b) => b.mw - a.mw).slice(0, o.nPltu ?? KONF.nPltu);
  if (pl.length) { grup.push({id: "pltu", jenis: "pltu", nama: "PLTU", mw: pl.reduce((s, p) => s + p.mw, 0)}); const g = grup.length - 1;
    for (const p of pl) sumber.push({g, jenis: "pltu", id: p.id, nama: p.nama, lat: p.lat, lon: p.lon, Q: p.mw * 1000 * (p.fk ?? KONF.kfPltu) * KONF.efPltu / 3600, zlo: 180, zhi: 400, mw: p.mw, fk: p.fk ?? KONF.kfPltu}); }
  return {grup, sumber};
}

/* ---------- inti simulasi ---------- */
export function buatKisi(A) {
  const s = KONF.sel, nx = Math.round((A.nx - 1) * A.dlon / s), ny = Math.round((A.ny - 1) * A.dlat / s), luas = new Float64Array(ny);
  for (let j = 0; j < ny; j++) { const la = A.lat0 + (j + .5) * s; luas[j] = (s * 111320) ** 2 * Math.cos(la * Math.PI / 180); }
  return {nx, ny, s, lon0: A.lon0, lat0: A.lat0, luas, n: nx * ny};
}
/* kota -> sel; tiap sel menyimpan kota yang berada dalam 3x3 sel di sekitarnya (konsentrasi kota = rata-rata 3x3) */
function petaKota(kisi, kota) {
  const per = new Array(kisi.n), sel = kota.map(k => { const i = Math.floor((k.lon - kisi.lon0) / kisi.s), j = Math.floor((k.lat - kisi.lat0) / kisi.s); return i >= 0 && j >= 0 && i < kisi.nx && j < kisi.ny ? j * kisi.nx + i : -1; });
  sel.forEach((c, ci) => { if (c < 0) return; const i = c % kisi.nx, j = (c / kisi.nx) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= kisi.nx || b >= kisi.ny) continue; (per[b * kisi.nx + a] ||= []).push(ci); } });
  return per;
}
const faktorHarian = hWIB => 1 + .7 * Math.cos(2 * Math.PI * (hWIB - 13.5) / 24); /* api puncak sekitar 13.30 waktu setempat, rata-rata harian = 1 */
export const jamWIB = (A, h) => ((new Date(A.t0 + h * 36e5).getUTCHours() + 7) % 24) + new Date(A.t0 + h * 36e5).getUTCMinutes() / 60;

/* skn: {fApi, fPltu, f:{idKompleks: faktor}, anginKali, anginPutar}. Mengembalikan pekerja bertahap: maju(ms) -> true bila selesai. */
export function buatSim(A, src, kota, skn = {}, seed = 20261018) {
  const kisi = buatKisi(A), perSel = petaKota(kisi, kota), nK = kota.length, nG = src.grup.length, NB = KONF.jam + 1, nc = kisi.n;
  const sfcA = new Float32Array(NB * nc), sfcP = new Float32Array(NB * nc), atsA = new Float32Array(NB * nc), atsP = new Float32Array(NB * nc);
  const kon = new Float32Array(nG * nK * NB), cnt = new Float32Array(NB);
  const rnd = mulberry32(seed), dt = KONF.dt, mdl = medanKosong(A), dpL = 111320;
  const rel = src.sumber.map(s => s.jenis === "api" ? 2 : 4); /* langkah antar pelepasan */
  const faktor = src.sumber.map(s => s.jenis === "pltu" ? (skn.fPltu ?? 1) : (skn.fApi ?? 1) * (skn.f?.[s.id] ?? 1));
  const cap = src.sumber.reduce((n, s, i) => n + Math.ceil((KONF.jam + KONF.spin) * 3600 / dt / rel[i]) + 2, 0);
  const px = new Float32Array(cap), py = new Float32Array(cap), pz = new Float32Array(cap), pm = new Float32Array(cap), ps = new Int32Array(cap);
  let n = 0, k = -KONF.spin * 3600 / dt, kAkhir = KONF.jam * 3600 / dt, selesai = false;
  const lx = A.lon0 + (A.nx - 1) * A.dlon, ly = A.lat0 + (A.ny - 1) * A.dlat;
  /* langkah dibagi dua: mulai() (angin, pelepasan) dan gerak(batas) yang bisa berhenti di tengah dan dilanjutkan, supaya satu potongan utas utama tetap pendek */
  let dalam = false, qq = 0, C = null;
  function mulai() {
    const t = k * dt / 3600, tw = Math.max(t, 0); /* spin-up: angin dibekukan di jam 0 */
    medanAngin(A, tw, skn, mdl);
    const hw = jamWIB(A, t);
    if (k % 1 === 0) src.sumber.forEach((s, i) => { if (((k % rel[i]) + rel[i]) % rel[i] !== 0) return;
      const m = s.Q * faktor[i] * (s.jenis === "api" ? faktorHarian(hw) : 1) * dt * rel[i], q = n++;
      px[q] = s.lon + (rnd() - .5) * .04; py[q] = s.lat + (rnd() - .5) * .04; pz[q] = s.zlo + rnd() * (s.zhi - s.zlo); pm[q] = m; ps[q] = i; });
    const sKh = Math.sqrt(2 * KONF.khBL * dt), sKhA = Math.sqrt(2 * KONF.khAtas * dt), sKz = Math.sqrt(2 * KONF.kzBL * dt), sKzA = Math.sqrt(2 * KONF.kzAtas * dt), ftau = Math.exp(-dt / KONF.tau);
    const tn = t + dt / 3600, bin = Math.round(tn), catat = tn >= 0 && bin <= KONF.jam; if (catat) cnt[bin]++;
    C = {sKh, sKhA, sKz, sKzA, ftau, bin, catat}; qq = 0; dalam = true;
  }
  function gerak(batas) {
    const {sKh, sKhA, sKz, sKzA, ftau, bin, catat} = C;
    for (let q = qq, tik = 0; q < n; q++) {
      if (++tik === 256) { tik = 0; if (nowMs() > batas) { qq = q; return false; } }
      const lon = px[q], lat = py[q], z = pz[q];
      let l = 0; while (l < A.nl - 1 && z > A.z[l + 1]) l++;
      const w = A.nl === 1 || z <= A.z[0] ? 0 : z >= A.z[A.nl - 1] ? 1 : (z - A.z[l]) / (A.z[l + 1] - A.z[l]), l2 = Math.min(l + 1, A.nl - 1);
      const u = bil(mdl.u[l], A, lon, lat) * (1 - w) + bil(mdl.u[l2], A, lon, lat) * w, v = bil(mdl.v[l], A, lon, lat) * (1 - w) + bil(mdl.v[l2], A, lon, lat) * w;
      let H = bil(mdl.b, A, lon, lat); if (H < KONF.blhMin) H = KONF.blhMin;
      const dalamBL = z < H, sh = dalamBL ? sKh : sKhA, sz = dalamBL ? sKz : sKzA;
      const nlat = lat + (v * dt + sh * gauss(rnd)) / dpL, nlon = lon + (u * dt + sh * gauss(rnd)) / (dpL * Math.cos(lat * Math.PI / 180));
      let nz = z + sz * gauss(rnd); if (nz < 0) nz = -nz; if (nz > 5000) nz = 10000 - nz;
      let m = pm[q] * ftau; if (dalamBL) m *= Math.exp(-KONF.vd * dt / H);
      if (nlon < A.lon0 || nlon > lx || nlat < A.lat0 || nlat > ly) { n--; px[q] = px[n]; py[q] = py[n]; pz[q] = pz[n]; pm[q] = pm[n]; ps[q] = ps[n]; q--; continue; }
      px[q] = nlon; py[q] = nlat; pz[q] = nz; pm[q] = m;
      if (!catat) continue;
      const fx = (nlon - kisi.lon0) / kisi.s - .5, fy = (nlat - kisi.lat0) / kisi.s - .5, i = Math.floor(fx), j = Math.floor(fy), ax = fx - i, ay = fy - j, api = src.sumber[ps[q]].jenis === "api";
      const jn = Math.min(kisi.ny - 1, Math.max(0, Math.round(fy))), nzDalam = nz < Math.max(H, KONF.blhMin) ? 1 : 0, hh = nzDalam ? Math.max(H, KONF.blhMin) : 1000;
      const c = m * 1e6 / (kisi.luas[jn] * hh), alas = bin * nc, tujuan = nzDalam ? (api ? sfcA : sfcP) : (api ? atsA : atsP);
      for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= kisi.nx || b >= kisi.ny) continue; tujuan[alas + b * kisi.nx + a] += c * (di ? ax : 1 - ax) * (dj ? ay : 1 - ay); }
      if (nzDalam) { const sel = perSel[Math.min(kisi.ny - 1, Math.max(0, Math.round(fy))) * kisi.nx + Math.min(kisi.nx - 1, Math.max(0, Math.round(fx)))];
        if (sel) for (let r = 0; r < sel.length; r++) kon[(src.sumber[ps[q]].g * nK + sel[r]) * NB + bin] += c / 9; }
    }
    k++; dalam = false; return true;
  }
  const nowMs = () => typeof performance !== "undefined" ? performance.now() : Date.now();
  /* normalisasi akhir (bagi per jumlah langkah) dibagi per potongan supaya tidak menjadi satu blok panjang di utas utama */
  let fase = null;
  function* normal() {
    let t = 0; const rem = () => { if (++t >= 40000) { t = 0; return true; } return false; };
    for (let b = 0; b < NB; b++) { const d = cnt[b] || 1; for (let c = 0; c < nc; c++) { sfcA[b * nc + c] /= d; sfcP[b * nc + c] /= d; atsA[b * nc + c] /= d; atsP[b * nc + c] /= d; if (rem()) yield; } }
    for (let g = 0; g < nG; g++) for (let c = 0; c < nK; c++) { for (let b = 0; b < NB; b++) kon[(g * nK + c) * NB + b] /= (cnt[b] || 1); if (rem()) yield; }
    selesai = true;
  }
  function akhiri() { fase = normal(); }
  return {
    kisi, NB, nK, nG, progres: () => (k + KONF.spin * 3600 / dt) / ((KONF.jam + KONF.spin) * 3600 / dt),
    maju(ms = 8) { const batas = nowMs() + ms; while (!selesai) { if (fase) { while (!selesai && nowMs() < batas) fase.next(); break; } if (!dalam) mulai(); if (!gerak(batas)) break; if (k >= kAkhir) { akhiri(); continue; } if (nowMs() > batas) break; } return selesai; },
    hasil: () => selesai ? {kisi, NB, nK, nG, grup: src.grup, sumber: src.sumber, sfcA, sfcP, atsA, atsP, kon, skn} : null
  };
}
export function jalankan(A, src, kota, skn, seed) { const s = buatSim(A, src, kota, skn, seed); while (!s.maju(1e9)); return s.hasil(); }

/* ---------- kalibrasi skala ---------- */
/* Konsentrasi api mentah model bergantung pada faktor emisi dan duty-cycle FRP yang tidak pasti. Maka skalanya dikalikan K tunggal
   sehingga PM2,5 asal api di kota (rata-rata 24 jam hari 1 dari model) cocok orde besarnya dengan atribusi pipeline:
   target_kota = r24[0] x asap[0] (prakiraan.json). K = median(target / model) atas kota dengan target >= 3 µg/m³ dan model >= 0,05 µg/m³,
   dijepit ke [0,01; 50]. Tanpa kota yang memenuhi, K = 1 dan terkalibrasi = false. K dibekukan: skenario memakai K dasar. */
function pasanganKal(hasil, prak) {
  const p = [], NB = hasil.NB;
  prak.kota.forEach((c, ci) => { const tgt = (c.r24?.[0] ?? 0) * (c.asap?.[0] ?? 0); if (!(tgt >= 3)) return; let m = 0;
    for (let g = 0; g < hasil.nG; g++) if (hasil.grup[g].jenis === "api") for (let b = 0; b < 24; b++) m += hasil.kon[(g * hasil.nK + ci) * NB + b] / 24;
    if (m >= .05) p.push({ci, tgt, m}); });
  return p;
}
const median = a => { const b = Array.from(a).sort((x, y) => x - y), n = b.length; return n % 2 ? b[n >> 1] : (b[n / 2 - 1] + b[n / 2]) / 2; };
export function kalibrasi(hasil, prak) {
  const r = pasanganKal(hasil, prak).map(x => x.tgt / x.m);
  if (!r.length) return {K: 1, n: 0, terkalibrasi: false};
  r.sort((a, b) => a - b); const K = Math.min(50, Math.max(.01, r[r.length >> 1]));
  return {K, n: r.length, terkalibrasi: true};
}

/* Kecocokan skala dengan atribusi CAMS (BUKAN validasi): PM2,5 asal api model x K dibanding target atribusi pipeline (r24 x asap) di tiap kota. K dan target sama-sama
   berasal dari atribusi pipeline, jadi sebagian MELINGKAR; K dihitung tanpa kota yang dinilai (tinggalkan-satu) supaya tidak dikecilkan oleh pencocokan, tetapi pembanding
   independen (alat ukur) tetap tidak ada. galat = faktor kali/bagi (median |ln(model/target)|); bias > 1 = model terlalu pekat; luar2 = porsi kota di luar faktor 2. */
export function kecocokanSkala(hasil, prak) {
  const p = pasanganKal(hasil, prak); if (p.length < 2) return {n: p.length, ok: false};
  const e = p.map((x, i) => { const K = Math.min(50, Math.max(.01, median(p.filter((_, j) => j !== i).map(y => y.tgt / y.m)))); return Math.log(x.m * K / x.tgt); });
  const dalam2 = e.filter(v => Math.abs(v) <= Math.LN2).length / e.length;
  return {ok: true, n: p.length, galat: Math.exp(median(e.map(Math.abs))), bias: Math.exp(median(e)), dalam2, luar2: 1 - dalam2,
    terburuk: p.map((x, i) => ({ci: x.ci, f: Math.exp(e[i])})).sort((a, b) => Math.abs(Math.log(b.f)) - Math.abs(Math.log(a.f))).slice(0, 3)};
}

/* ---------- ensemble ---------- */
/* n-1 anggota (anggota 0 = dasar): angin, arah, tinggi lapisan campuran, emisi diganggu lognormal terpotong, benih sendiri. Deterministik menurut seed. */
export function anggotaEnsemble(n = ENS.n, seed = 7, sdApi = ENS.sdApi) {
  const r = mulberry32(seed), ln = (sd, lo, hi) => Math.min(hi, Math.max(lo, Math.exp(sd * gauss(r)))), o = [];
  for (let i = 1; i < n; i++) o.push({seed: seed * 1000 + i, skn: {anginKali: ln(ENS.sdAngin, .5, 1.6), anginPutar: gauss(r) * ENS.sdArah * Math.PI / 180, blhKali: ln(ENS.sdBlh, .5, 2), fApi: ln(sdApi, .2, 5), fPltu: ln(ENS.sdPltu, .5, 2)}});
  return o;
}
/* simpangan log emisi api dari galat kecocokan skala (median |ln| = 0,6745 sd untuk sebaran normal), dijepit .2 sampai 1 */
export const sdApiDariGalat = galat => Math.min(1, Math.max(.2, Math.log(galat) / .6745));
export function kuantil(v, q) { const a = Float64Array.from(v).sort(), x = (a.length - 1) * q, i = x | 0; return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (x - i); }
/* pita per kota: deret p10/p50/p90 per jam, puncak 72 jam tiap kuantil, dan peluang (porsi anggota) puncaknya di atas ambang. hasilAnggota = [hasil simulasi anggota 1..n-1] */
export function pitaDariSeri(seri) {
  const NB = KONF.jam + 1, o = {p10: new Float32Array(NB), p50: new Float32Array(NB), p90: new Float32Array(NB)};
  for (let b = 0; b < NB; b++) { const v = seri.map(x => x[b]); o.p10[b] = kuantil(v, .1); o.p50[b] = kuantil(v, .5); o.p90[b] = kuantil(v, .9); }
  const pk = seri.map(x => { let m = 0; for (let b = 0; b < KONF.jam; b++) if (x[b] > m) m = x[b]; return m; });
  return {...o, n: seri.length, puncak: {p10: kuantil(pk, .1), p50: kuantil(pk, .5), p90: kuantil(pk, .9)}, peluang: pk.filter(v => v > KONF.ambang).length / pk.length};
}
export const pitaKota = (prak, dasar, hasilAnggota, pmDasar, K, A, ci) => pitaDariSeri([pmDasar[ci], ...hasilAnggota.map(h => pmKota(prak, dasar, h, K, ci, A))]);

/* ---------- kota: PM2,5 per jam ---------- */
/* deret mentah (belum diskalakan) api atau PLTU di kota ci per jam 0..72; abaikan = grup yang dibuang (untuk "padamkan kompleks X") */
export function deret(h, ci, jenis, abaikan = -1) { const o = new Float32Array(h.NB); for (let g = 0; g < h.nG; g++) if (g !== abaikan && h.grup[g].jenis === jenis) for (let b = 0; b < h.NB; b++) o[b] += h.kon[(g * h.nK + ci) * h.NB + b]; return o; }
/* kontribusi sumber di kota ci pada bin b: K x api + pltu (dipakai uji dan tampilan awan) */
export function kontribKota(h, K, ci, b) { let s = 0; for (let g = 0; g < h.nG; g++) s += (h.grup[g].jenis === "api" ? K : 1) * h.kon[(g * h.nK + ci) * h.NB + b]; return s; }
/* PM2,5 kota per jam untuk skenario. Dasar = prakiraan model apa adanya. Porsi api di dasar diambil dari atribusi pipeline (asap[hari]); skenario mengubahnya
   menurut NISBAH model api_skenario/api_dasar per hari WIB (nisbah dijepit 0..3, jadi tidak tergantung skala mutlak model yang kasar di dekat sumber):
   pm_skn = pm x (1 + porsi x (nisbah - 1)). Bila model dasar di kota itu ~0 (asap baru tiba karena angin berubah) ditambah K x api_skenario, tidak melebihi pm.
   PLTU: selisih mentah ditambahkan (sumbangannya sudah dalam µg/m³ fisik). Hasil tidak negatif. */
export function pmDariDeret(prak, ci, A, apiB, apiS, pltB, pltS, K, skala = 1) {
  const c = prak.kota[ci], pm = c.pm, o = new Float32Array(KONF.jam + 1), h0 = jamWIB(A, 0), hr = b => Math.min(Math.floor((h0 + b) / 24), (c.asap?.length || 1) - 1), nd = hr(KONF.jam) + 1;
  const sb = new Float64Array(nd), ss = new Float64Array(nd); for (let b = 0; b <= KONF.jam; b++) { sb[hr(b)] += apiB[b]; ss[hr(b)] += apiS[b]; }
  for (let b = 0; b <= KONF.jam; b++) { const p = pm[Math.min(b, pm.length - 1)], d = hr(b); let v = p;
    const porsi = c.asap?.[d];
    /* porsi null = pipeline menolak atribusi hari itu (model > 1,5x CAMS): tidak dipakai sebagai 0 dan tidak ditebak dari model; PM hari itu dibiarkan apa adanya (tanda di label) */
    if (porsi == null) v = p;
    else if (sb[d] > .05 * 24) { const r = Math.min(3, Math.max(0, ss[d] / sb[d])); v = p * (1 + Math.min(1, porsi * skala) * (r - 1)); }
    else v = p + Math.min(K * (apiS[b] - apiB[b]), p);
    o[b] = Math.max(0, v + (pltS[b] - pltB[b])); }
  return o;
}
/* jam ke-b (0..72) di kota ci tidak terpercaya bila porsi api hari WIB-nya null */
export const takTerpercaya = (prak, ci, A, b) => { const c = prak.kota[ci], d = Math.min(Math.floor((jamWIB(A, 0) + b) / 24), (c.asap?.length || 1) - 1); return c.asap?.[d] == null; };
export function pmKota(prak, dasar, skn, K, ci, A) {
  if (skn === dasar) return Float32Array.from({length: KONF.jam + 1}, (_, b) => prak.kota[ci].pm[Math.min(b, prak.kota[ci].pm.length - 1)]);
  return pmDariDeret(prak, ci, A, deret(dasar, ci, "api"), deret(skn, ci, "api"), deret(dasar, ci, "pltu"), deret(skn, ci, "pltu"), K);
}

/* ---------- paparan & perlakuan ---------- */
/* penduduk per kota: sel kisi penduduk.json dimasukkan ke kota prakiraan terdekat dalam 0,55 derajat (Voronoi kasar; bukan batas administrasi) */
export function pendudukKota(pend, kota, maks = .55) {
  const o = new Float64Array(kota.length); const cs = kota.map(k => Math.cos(k.lat * Math.PI / 180));
  for (const [la, lo, p] of pend.grid || pend) { let b = -1, bd = maks * maks; for (let i = 0; i < kota.length; i++) { const dx = (lo - kota[i].lon) * cs[i], dy = la - kota[i].lat, d = dx * dx + dy * dy; if (d < bd) { bd = d; b = i; } } if (b >= 0) o[b] += p; }
  return o;
}
/* jiwa-jam terpapar: jam (0..71) dengan PM2,5 di atas ambang x penduduk. dosis = jiwa x µg/m³ x jam di atas ambang (penentu seri). */
export function paparan(pm, jiwa, ambang = KONF.ambang, saring = null) {
  let jam = 0, dosis = 0; for (let b = 0; b < KONF.jam; b++) { if (saring && !saring(b)) continue; if (pm[b] > ambang) { jam++; dosis += pm[b] - ambang; } }
  return {jj: jam * jiwa, dosis: dosis * jiwa};
}
/* ISPA tambahan 3 hari (tiga blok 24 jam dari jam 0): jiwa x y0 x (1 - exp(-b x min(100, maks(0, pm - 15)))), b = ln(RR)/10, fungsi mulus tanpa ambang hari.
   RR dan insidensi dasar sama dengan scripts/udara/rentan.py (Heroux dkk. 2015, HRAPIE: RR rawat inap pernapasan, PROKSI untuk ISPA); batas bawah RR 0,9982 tidak dijepit,
   jadi rentang bawah bisa negatif (selang kepercayaan RR memuat 1). rentan.py masih memakai ambang 55,4 per hari: angka di sini tidak sama dengan kartu Dampak. */
export const ISPA = {y0: .093 / 30, rr: [.9982, 1.019, 1.0402], c0: 15, dcMaks: 100};
export function ispaHari(pm, jiwa) {
  const o = {t: 0, lo: 0, hi: 0};
  for (let d = 0; d < 3; d++) { let m = 0; for (let b = d * 24; b < d * 24 + 24; b++) m += pm[b] / 24; const dc = Math.min(ISPA.dcMaks, Math.max(0, m - ISPA.c0));
    const f = rr => jiwa * ISPA.y0 * (1 - Math.exp(-Math.log(rr) / 10 * dc)); o.t += f(ISPA.rr[1]); o.lo += f(ISPA.rr[0]); o.hi += f(ISPA.rr[2]); }
  return o;
}
/* kota dengan penduduk, PM, dan paparan per skenario. pmDasar/pmSkn: larik Float32Array(73) per kota */
export function bandingKota(prak, jiwa, pmDasar, pmSkn) {
  return prak.kota.map((c, i) => { const a = paparan(pmDasar[i], jiwa[i]), b = paparan(pmSkn[i], jiwa[i]); const mx = v => v.reduce((m, x) => x > m ? x : m, 0);
    return {i, kode: c.kode, nama: c.nama, jiwa: jiwa[i], puncakDasar: mx(pmDasar[i]), puncakSkn: mx(pmSkn[i]), jjDasar: a.jj, jjSkn: b.jj, hindar: a.jj - b.jj, dosisHindar: a.dosis - b.dosis}; });
}

/* sekolah: jam sekolah (Sen-Jum 07.00-13.59 WIB). Anak di sekolah ventilasi alami: sebagian waktu di luar (upacara, istirahat, perjalanan), sisanya di kelas dengan faktor infiltrasi FS.
   Libur: di rumah, lebih sedikit di luar dan faktor infiltrasi rumah FR lebih rendah. Faktor paparan efektif = luar + (1 - luar) x infiltrasi, dikalikan ke jiwa-jam dan dosis. */
/* ensemble: anggota 0 = dasar; anggota lain = perturbasi acak bersebaran lognormal (sd pada log) */
export const ENS = {n: 24, sdAngin: .2, sdArah: 10, sdBlh: .25, sdApi: .35, sdPltu: .2};
export const SEKOLAH = {luarS: .25, fs: .8, luarR: .1, fr: .6};
export const ASUMSI = [
  {nama: "Emisi api (non-gambut)", nilai: `jumlah FRP 24 jam / lintasan teramati (cadangan ${KONF.lintasanCadangan}) x koreksi ${String(KONF.koreksiApi).replace(".", ",")} x ${String(KONF.dmFre).replace(".", ",")} kg/MJ x ${String(KONF.efMineral).replace(".", ",")} g PM2,5/kg`, sumber: "Wooster dkk. 2005 (kg per MJ); Andreae dan Merlet 2001, hutan tropis (semak dan pertanian lebih rendah, ini batas atas); lintasan dari hotspot24.json per kompleks"},
  {nama: "Emisi api (gambut)", nilai: `jumlah FRP 24 jam / lintasan teramati x koreksi ${String(KONF.koreksiApi).replace(".", ",")} x ${String(KONF.dmGambut).replace(".", ",")} kg/MJ x ${String(KONF.efGambut).replace(".", ",")} g PM2,5/kg`, sumber: "ASUMSI untuk kg/MJ: orde GFAS (Kaiser dkk. 2012, Heil 2010), belum dicek ke tabelnya; gambut membara ber-FRP kecil tetapi bahan kering besar. 17,3 g/kg: Jayarathne dkk. 2018, sama dengan atribusi pipeline"},
  {nama: "Koreksi api kecil dan tertutup awan", nilai: `x ${String(KONF.koreksiApi).replace(".", ",")}`, sumber: "ASUMSI: VIIRS 375 m tidak melihat api kecil dan awan atau asap menutup sebagian; belum dikalibrasi"},
  {nama: "Faktor skala K", nilai: "satu pengali terpisah pada asap api di kota, dihitung dari median target/model; ditampilkan di kartu Kecocokan skala", sumber: "K jauh dari 1 (di atas 3 atau di bawah 1/3) berarti emisi model salah skala secara struktural, bukan galat satuan"},
  {nama: "Emisi PLTU", nilai: `${String(KONF.efPltu).replace(".", ",")} g per kWh x kapasitas (MW) x faktor kapasitas tiap PLTU (cadangan ${KONF.kfPltu * 100}%), hanya partikel primer`, sumber: "WRI Global Power Plant Database untuk lokasi, MW, dan faktor kapasitas; faktor emisi tipikal batu bara ber-ESP"},
  {nama: "Ensemble", nilai: `${ENS.n} anggota: angin x lognormal ${ENS.sdAngin}, arah ${ENS.sdArah} derajat, tinggi lapisan campuran x lognormal ${ENS.sdBlh}, emisi api x lognormal ${ENS.sdApi}, emisi PLTU x lognormal ${ENS.sdPltu}, benih acak berbeda`, sumber: "sebaran diatur dari galat tipikal prakiraan angin dan faktor emisi (asumsi), bukan diukur"},
  {nama: "Infiltrasi sekolah", nilai: `${SEKOLAH.luarS * 100}% waktu di luar, kelas ${SEKOLAH.fs}`, sumber: "Chen dan Zhao 2011, rasio dalam/luar ruang ventilasi alami; disesuaikan"},
  {nama: "Infiltrasi rumah (libur)", nilai: `${SEKOLAH.luarR * 100}% waktu di luar, rumah ${SEKOLAH.fr}`, sumber: "Chen dan Zhao 2011; disesuaikan"},
  {nama: "Usia sekolah", nilai: `${KONF.anak * 100}% penduduk`, sumber: "Struktur umur BPS, perkiraan kasar"},
  {nama: "Ambang terpapar", nilai: `${String(KONF.ambang).replace(".", ",")} µg/m³`, sumber: "Batas bawah Tidak sehat, PermenLHK P.14/2020"}
];
export const hariKerjaSekolah = (A, b) => { const w = new Date(A.t0 + b * 36e5 + 7 * 36e5), d = w.getUTCDay(), j = w.getUTCHours(); return d >= 1 && d <= 5 && j >= 7 && j < 14; };
export function sekolahHindar(A, pm, jiwa) {
  const anak = jiwa * KONF.anak, fS = SEKOLAH.luarS + (1 - SEKOLAH.luarS) * SEKOLAH.fs, fR = SEKOLAH.luarR + (1 - SEKOLAH.luarR) * SEKOLAH.fr, s = b => hariKerjaSekolah(A, b);
  /* jiwa-jam setara-luar-ruang: jam dengan PM2,5 luar di atas ambang dihitung sebesar faktor paparan efektif (fS di sekolah, fR di rumah) */
  const a = paparan(pm, anak * fS, KONF.ambang, s), b = paparan(pm, anak * fR, KONF.ambang, s);
  return {jj: a.jj - b.jj, dosis: a.dosis - b.dosis};
}
/* tembolok deret dasar per kota (api, PLTU) sekali per urutPerlakuan; api tanpa grup g = api - kontribusi g */
function hindarGrup(A, prak, dasar, K, jiwa, pmDasar, g, skala, tb) {
  let jj = 0, dosis = 0, ispa = 0;
  for (let ci = 0; ci < dasar.nK; ci++) { if (!jiwa[ci]) continue; const base = (g * dasar.nK + ci) * dasar.NB; let ada = false; for (let b = 0; b < dasar.NB; b++) if (dasar.kon[base + b] > .05) { ada = true; break; } if (!ada) continue;
    const c = tb[ci] ||= {api: deret(dasar, ci, "api"), pl: deret(dasar, ci, "pltu")}, apiS = new Float32Array(dasar.NB); for (let b = 0; b < dasar.NB; b++) apiS[b] = Math.max(0, c.api[b] - dasar.kon[base + b]);
    const o2 = pmDariDeret(prak, ci, A, c.api, apiS, c.pl, c.pl, K, skala), a = paparan(pmDasar[ci], jiwa[ci]), b2 = paparan(o2, jiwa[ci]); jj += a.jj - b2.jj; dosis += a.dosis - b2.dosis; ispa += ispaHari(pmDasar[ci], jiwa[ci]).t - ispaHari(o2, jiwa[ci]).t; }
  return {jj, dosis, ispa};
}
/* Daftar perlakuan terurut menurut jiwa-jam yang dihindari dalam 72 jam (perkiraan). Kompleks: kontribusi dasar dikurangi seluruhnya; hanya kota-jam dengan porsi api terpercaya
   (asap tidak null) yang ikut dihitung, jadi kota tak terpercaya tidak menurunkan peringkat. Rentang: porsi api x0,7 dan x1,3 (kompleks), selisih infiltrasi x0,5 dan x1,5 (sekolah). */
export function urutPerlakuan(...a) { const g = urutGen(...a); let r; while (!(r = g.next()).done); return r.value; }
/* generator: yield setelah tiap grup/kelompok kota, supaya pemanggil di peramban bisa membaginya per potongan rAF */
export function* urutGen(A, prak, dasar, K, jiwa, pmDasar, o = {}) {
  const out = [], tb = [];
  for (let g = 0; g < dasar.nG; g++) { const G = dasar.grup[g]; if (G.jenis !== "api" || G.id === "lain") continue; const h = hindarGrup(A, prak, dasar, K, jiwa, pmDasar, g, 1, tb);
    if (h.jj > 0 || h.dosis > 0) out.push({jenis: "kompleks", id: G.id, nama: G.nama, jj: h.jj, dosis: h.dosis, ispa: h.ispa, g}); yield; }
  for (let ci = 0; ci < prak.kota.length; ci++) { if (!jiwa[ci]) continue; const h = sekolahHindar(A, pmDasar[ci], jiwa[ci]); if (h.jj > 0 || h.dosis > 0) out.push({jenis: "sekolah", id: prak.kota[ci].kode, nama: prak.kota[ci].nama, jj: h.jj, dosis: h.dosis, ci}); if (ci % 64 === 0) yield; }
  out.sort((a, b) => b.jj - a.jj || b.dosis - a.dosis);
  const top = out.slice(0, o.sekolahTop ?? 400);
  for (const x of top.slice(0, o.rentangTop ?? 12)) { yield; if (x.jenis === "kompleks") { x.lo = hindarGrup(A, prak, dasar, K, jiwa, pmDasar, x.g, .7, tb).jj; x.hi = hindarGrup(A, prak, dasar, K, jiwa, pmDasar, x.g, 1.3, tb).jj; } else { x.lo = x.jj * .5; x.hi = x.jj * 1.5; } if (x.lo > x.jj) [x.lo, x.jj] = [x.jj, x.lo]; }
  return top;
}

/* ---------- skenario ---------- */
export const SKENARIO = [
  {id: "dasar", nama: "Dasar", skn: {}},
  {id: "api50", nama: "Api padam 50%", skn: {fApi: .5}},
  {id: "kompleks", nama: "Padamkan kompleks", skn: null},
  {id: "balik", nama: "Angin berbalik", skn: {anginPutar: Math.PI}},
  {id: "lemah", nama: "Angin melemah", skn: {anginKali: .5}},
  {id: "pltu", nama: "PLTU mati", skn: {fPltu: 0}}
];
export const kunciSkn = s => JSON.stringify([s.fApi ?? 1, s.fPltu ?? 1, s.anginKali ?? 1, s.anginPutar ?? 0, s.blhKali ?? 1, Object.entries(s.f || {}).sort()]);

/* ---------- batas model (teks untuk halaman Metode) ---------- */
export const BATAS = [
  "Hanya partikel primer: tanpa kimia sekunder (sulfat, nitrat, aerosol organik sekunder), jadi sumbangan PLTU dan asap yang menua terhitung rendah.",
  "Angin dari kisi 1 derajat (sekitar 110 km) per 3 jam, interpolasi ke ruang dan waktu; lembah, pantai, dan angin darat-laut tidak tertangkap.",
  "Emisi api dari energi radiatif (FRE) deteksi satelit 24 jam dengan faktor emisi gambut dan mineral, bukan inventaris; gambut yang membara rendah FRP terdeteksi kurang. Emisi PLTU dari MW dan faktor kapasitas tiap unit, faktor emisi satu nilai tipikal. Skala awan dikalikan satu faktor supaya porsi api di kota cocok orde besarnya dengan atribusi pipeline; angka kota memakai porsi atribusi itu dan model hanya memberi nisbah perubahan per skenario, jadi dekat sumber model cenderung terlalu pekat dan jauh dari sumber terlalu tipis.",
  "Tinggi plume api dan PLTU diundi dari rentang tetap menurut jenis lahan dan besar api, tanpa daya apung yang dihitung.",
  "Hujan tidak dimodelkan khusus: hanya deposisi kering dan peluruhan umum 5 hari, jadi hari hujan deras akan terhitung terlalu pekat.",
  "Batas lapisan campuran dari blh prakiraan, minimum 150 m; asap di atasnya baru turun saat lapisan itu menebal.",
  "Penduduk diambil dari kisi 0,25 derajat dan dibagi ke kota prakiraan terdekat, bukan batas administrasi; jiwa-jam memakai ambang 55,5 µg/m³ pada nilai per jam.",
  "Bila pipeline menolak atribusi api suatu hari di suatu kota (model lebih dari 1,5 kali CAMS, porsi null), PM2,5 kota itu dibiarkan apa adanya di skenario dan diberi tanda bintang di label; kota itu tidak ikut menentukan peringkat perlakuan.",
  "Jiwa-jam yang dihindari adalah perkiraan kasar dengan rentang (porsi api x0,7 sampai x1,3; infiltrasi sekolah x0,5 sampai x1,5), bukan hitungan pasti.",
  "Skenario mengubah prakiraan model (belum dikoreksi ke alat ukur) di tiap kota menurut nisbah model; nilainya perkiraan, bukan nasihat medis.",
  "Sumber di luar 80 kompleks terbesar digabung per sel 1 derajat; kompleks dan PLTU di luar kisi angin dibuang.",
  `Pita ketidakpastian dari ensemble ${ENS.n} anggota (benih, tinggi lapisan campuran, angin, emisi diganggu; simpangan emisi api diturunkan dari galat kecocokan skala): p10 dan p90 adalah sebaran anggota, bukan selang kepercayaan statistik, dan galat model fisikanya sendiri tidak ikut tercakup.`,
  "Kecocokan skala dibandingkan dengan atribusi CAMS di kota (tinggalkan-satu); sebagian melingkar karena K dan target sama-sama dari atribusi, dan itu bukan validasi terhadap alat ukur di tanah, yang belum ada.",
  "Peringkat perlakuan memakai biaya satuan asumsi (masker, pembersih udara, regu pemadam, selisih biaya pembangkit) yang bukan angka resmi; orang-hari terpapar = jam di atas 55,5 µg/m³ dibagi 24 dikali penduduk kota, tanpa membedakan umur atau kecamatan.",
  "Ruang udara bersih dan beban faskes memakai sekolah, rumah sakit, dan puskesmas dari OpenStreetMap di sembilan provinsi (Riau, Jambi, Sumsel, Kalbar, Kalteng, Kalsel, Kaltim, NTT, Papua Selatan); kota di luarnya tidak dinilai ruang bersihnya, kantor belum ada datanya, dan pembagian masker per kecamatan belum bisa karena penduduk dipecah per kota, bukan per kecamatan."
];
