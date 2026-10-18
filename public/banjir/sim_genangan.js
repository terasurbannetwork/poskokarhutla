"use strict";
/* sim_genangan.js: mesin genangan berbasis DEM, murni (tanpa DOM). Dipakai tiga cara: <script> di halaman (window.SimGenangan),
   importScripts di Web Worker sim_kerja.js (self.SimGenangan), dan vm di tests/banjir/sim_genangan.test.mjs.
   Alur: ambilDEM (ubin Terrarium AWS, sama dengan medan 3D MapLibre) -> isiCekungan (Priority-Flood+eps, Barnes dkk. 2014)
   -> arahD8 + akumulasi -> hietograf + limpasan SCS-CN -> jalankan (inersia lokal Bates dkk. 2010, kisi 4-tetangga,
   pembatas fluks supaya kedalaman tak pernah negatif) -> kedalaman per sel per jam + neraca massa.
   Semua angka berasumsi ada di ASUMSI dengan sumbernya; batas model di catatan metode paket C. */
(function (akar) {
const G = 9.81, HMIN = 1e-4, THETA = 0.9;
const ASUMSI = {
  CN: 80,              /* SCS-CN kondisi II, campuran permukiman + sawah di tanah kelompok C (USDA TR-55 1986, tabel 2-2a/2-2b) */
  MANNING: 0.06,       /* n Manning dataran banjir permukiman/bervegetasi (Chow 1959: 0,03-0,12) */
  TERGENANG: 0.1,      /* m; sel dengan air >= 10 cm dihitung tergenang */
  JAM_PUNCAK: 15,      /* jam WIB pusat hujan harian: puncak konvektif sore di Indonesia (asumsi) */
  PASANG_RENTANG: 1.0, /* m; tunggang pasang bila hanya muka laut maks harian yang diketahui (asumsi) */
  PERIODE_PASANG: 12.42, /* jam, komponen M2 */
  ALFA: 0.7, DT_MAKS: 30, /* syarat CFL Bates dkk. 2010: dt = alfa dx / sqrt(g h) */
  LERENG_TEPI: 1e-3,   /* kemiringan minimum aliran keluar bebas di tepi kisi */
  CEKUNGAN_MAKS: 0.5,  /* m; cekungan DEM (4-tetangga) lebih dalam dari ini di bawah ambang luapnya dianggap galat DEM (derau SRTM
                          +-3 m di lahan bervegetasi, alur/ngarai sempit, jembatan) dan diisi sampai sedalam ini. Asumsi. Diuji di
                          Sukajaya, Bogor, hujan 250 mm: tanpa batas lubang 15 m memaksa langkah 3 dtk; 2 m menahan 57 % limpasan
                          di lubang derau sampai jam 72, 0,5 m 21 %. Harga: cekungan nyata (polder) > 0,5 m ikut didangkalkan. */
};
const salah = m => { throw new Error("SimGenangan: " + m); };
const angka = (x, n) => Number.isFinite(x) || salah(`${n} bukan angka (${x})`);

/* ---------- tumpukan-min untuk Priority-Flood ---------- */
function Tumpuk(n) { this.i = new Int32Array(n); this.k = new Float64Array(n); this.n = 0; }
Tumpuk.prototype.dorong = function (x, v) { let c = this.n++; const I = this.i, K = this.k;
  while (c > 0) { const p = (c - 1) >> 1; if (K[p] <= v) break; I[c] = I[p]; K[c] = K[p]; c = p; } I[c] = x; K[c] = v; };
Tumpuk.prototype.ambil = function () { const I = this.i, K = this.k, top = I[0], n = --this.n, x = I[n], v = K[n]; let c = 0;
  for (;;) { let a = 2 * c + 1; if (a >= n) break; if (a + 1 < n && K[a + 1] < K[a]) a++; if (K[a] >= v) break; I[c] = I[a]; K[c] = K[a]; c = a; }
  I[c] = x; K[c] = v; return top; };

const TETANGGA8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
function cekKisi(z, nx, ny) {
  (Number.isInteger(nx) && Number.isInteger(ny) && nx >= 3 && ny >= 3) || salah(`ukuran kisi ${nx}x${ny} tidak sah (min 3x3)`);
  (z && z.length === nx * ny) || salah(`panjang DEM ${z && z.length} != ${nx}x${ny}`);
  for (let k = 0; k < z.length; k++) if (!Number.isFinite(z[k])) salah(`DEM sel ${k} bukan angka (${z[k]})`);
}
/* benih bawaan = semua sel tepi (air boleh keluar kisi) */
function benihTepi(nx, ny, laut) {
  const b = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (!i || !j || i === nx - 1 || j === ny - 1 || (laut && laut[j * nx + i])) b[j * nx + i] = 1;
  return b;
}
/* Priority-Flood+eps (Barnes, Lehman, Mulla 2014): tiap sel bukan benih berakhir dengan tetangga yang lebih rendah tegas,
   jadi DEM hasil tanpa cekungan dan dataran pun mengalir. eps 1e-5 m; jarak BFS <= ~400 sel = tambahan < 4 mm. */
const TETANGGA4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
/* tetangga 8 untuk D8; tetangga 4 untuk menyiapkan DEM mesin inersia (air hanya lewat 4 sisi: cekungan yang hanya bocor
   lewat sudut diagonal adalah perangkap bagi mesin; ditemukan di Sukajaya, Bogor: kolam 7 m tidak pernah surut) */
function isiCekungan(z, nx, ny, benih, eps = 1e-5, tetangga = 8) {
  const TG = tetangga === 4 ? TETANGGA4 : TETANGGA8;
  cekKisi(z, nx, ny); benih ||= benihTepi(nx, ny);
  const N = nx * ny, f = new Float64Array(N), sudah = new Uint8Array(N), T = new Tumpuk(N), pit = new Int32Array(N); let pa = 0, pb = 0;
  for (let k = 0; k < N; k++) if (benih[k]) { f[k] = z[k]; sudah[k] = 1; T.dorong(k, z[k]); }
  T.n || salah("tidak ada sel benih (keluaran)");
  while (T.n || pa < pb) {
    const c = pa < pb ? pit[pa++] : T.ambil(), ci = c % nx, cj = (c / nx) | 0;
    for (const [di, dj] of TG) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
      const n = j * nx + i; if (sudah[n]) continue; sudah[n] = 1;
      if (z[n] <= f[c]) { f[n] = f[c] + eps; pit[pb++] = n; } else { f[n] = z[n]; T.dorong(n, f[n]); } }
  }
  return f;
}
/* angkat dasar cekungan sehingga tidak lebih dari dmaks di bawah ambang luap (f = hasil isiCekungan) */
function batasiCekungan(z, f, dmaks) { (dmaks >= 0) || salah(`kedalaman cekungan maks ${dmaks} tidak sah`);
  const o = Float64Array.from(z); for (let k = 0; k < o.length; k++) if (f[k] - o[k] > dmaks) o[k] = f[k] - dmaks; return o; }
/* DEM siap mesin: cekungan 4-tetangga (mesin aliran hanya lewat 4 sisi) dibatasi ASUMSI.CEKUNGAN_MAKS. Satu pintu dipakai layar
   dan uji, supaya layar tidak bisa diam-diam kembali ke 8-tetangga (pernah terjadi: kolam 7-8 m di Sukajaya tak pernah surut). */
function siapkanDEM(z, nx, ny, benih, dmaks = ASUMSI.CEKUNGAN_MAKS) { return batasiCekungan(z, isiCekungan(z, nx, ny, benih, 1e-5, 4), dmaks); }
/* D8 (O'Callaghan & Mark 1984): penerima = tetangga dengan turunan terbesar; -1 = benih/keluaran */
function arahD8(f, nx, ny, benih) {
  const N = nx * ny, a = new Int32Array(N).fill(-1);
  for (let c = 0; c < N; c++) { if (benih && benih[c]) continue; const ci = c % nx, cj = (c / nx) | 0; let best = 0;
    for (const [di, dj] of TETANGGA8) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
      const n = j * nx + i, s = (f[c] - f[n]) / (di && dj ? Math.SQRT2 : 1); if (s > best) { best = s; a[c] = n; } } }
  return a;
}
/* akumulasi = jumlah sel hulu termasuk dirinya; urut menurun ketinggian terisi */
function akumulasi(f, arah) {
  const N = f.length, o = Array.from({length: N}, (_, k) => k).sort((x, y) => f[y] - f[x]), acc = new Float64Array(N).fill(1);
  for (const c of o) if (arah[c] >= 0) acc[arah[c]] += acc[c];
  return acc;
}

/* ---------- masukan hujan, sungai, laut ---------- */
/* hari = [{p mm/hari, jam lama hujan, imax mm/jam}] -> mm per jam (24 x hari). Hujan ditaruh di jam-jam berurutan berpusat
   ASUMSI.JAM_PUNCAK; jam puncak = imax, sisanya rata. Jumlah per hari = p persis. */
function hietograf(hari, jamPuncak = ASUMSI.JAM_PUNCAK) {
  Array.isArray(hari) || salah("hari hujan harus larik");
  const o = new Float64Array(24 * hari.length);
  hari.forEach((d, i) => { const p = +d.p || 0; angka(p, "hujan harian"); p >= 0 || salah(`hujan harian negatif (${p})`); if (!p) return;
    const n = Math.max(1, Math.min(24, Math.round(+d.jam || 1))), pk = Math.max(p / n, Math.min(p, d.imax > 0 ? +d.imax : p / n)), a = Math.max(0, Math.min(24 - n, jamPuncak - Math.floor(n / 2)));
    for (let q = 0; q < n; q++) o[i * 24 + a + q] = n === 1 ? p : q === Math.floor(n / 2) ? pk : (p - pk) / (n - 1); });
  return o;
}
/* kelas kelembapan anteseden SCS (Chow, Maidment, Mays 1988 tabel 5.5.1). Basah (AMC III) = definisi "jenuh" status.py
   (sm >= 0,45 dan a7 >= 25 mm; tanpa sm: a7 >= 150 mm) supaya tab status dan genangan tidak berbeda menilai tanah;
   kering (AMC I) = hujan 7 hari < 36 mm (batas 5 hari SCS, asumsi setara) */
const kelasAMC = (a7, sm) => (sm != null ? sm >= .45 && a7 >= 25 : a7 >= 150) ? 3 : a7 < 36 ? 1 : 2;
const cnAMC = (cn, amc) => amc === 1 ? 4.2 * cn / (10 - .058 * cn) : amc === 3 ? 23 * cn / (10 + .13 * cn) : cn;
/* SCS-CN kumulatif: Q = (P - 0,2S)^2 / (P + 0,8S), S = 25400/CN - 254 mm. Kembali limpasan efektif & resapan kumulatif per jam */
function limpasan(hujan, cn, amc = 2) {
  angka(cn, "CN"); (cn > 30 && cn <= 100) || salah(`CN ${cn} di luar 30-100`);
  const c = Math.min(100, cnAMC(cn, amc)), S = 25400 / c - 254, Ia = .2 * S, Q = P => P > Ia ? (P - Ia) ** 2 / (P + .8 * S) : 0;
  const ef = new Float64Array(hujan.length), resap = new Float64Array(hujan.length + 1); let P = 0, q0 = 0;
  for (let t = 0; t < hujan.length; t++) { const x = hujan[t]; angka(x, "hujan jam"); x >= 0 || salah(`hujan negatif jam ${t}`);
    P += x; const q = Q(P); ef[t] = q - q0; q0 = q; resap[t + 1] = P - q; }
  return {efektif: ef, resap, cn: c, S};
}
/* muka laut per jam dari maks harian: kosinus M2 berpuncak di maks hari itu (fase tak diketahui = asumsi) */
function pasang(maksHarian, rentang = ASUMSI.PASANG_RENTANG, periode = ASUMSI.PERIODE_PASANG) {
  const J = 24 * maksHarian.length, o = new Float64Array(J + 1);
  for (let t = 0; t <= J; t++) { const m = maksHarian[Math.min(maksHarian.length - 1, Math.floor(t / 24))]; angka(m, "muka laut");
    o[t] = m - rentang / 2 * (1 - Math.cos(2 * Math.PI * t / periode)); }
  return o;
}
/* laut = sel <= 0 m yang tersambung ke tepi lewat sel <= 0 m (cekungan darat di bawah 0 m tetap darat) */
function topengLaut(z, nx, ny, batas = 0) {
  const N = nx * ny, m = new Uint8Array(N), q = new Int32Array(N); let a = 0, b = 0;
  for (let k = 0; k < N; k++) { const i = k % nx, j = (k / nx) | 0; if ((!i || !j || i === nx - 1 || j === ny - 1) && z[k] <= batas) { m[k] = 1; q[b++] = k; } }
  while (a < b) { const c = q[a++], ci = c % nx, cj = (c / nx) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue; const n = j * nx + i; if (!m[n] && z[n] <= batas) { m[n] = 1; q[b++] = n; } } }
  return m;
}
/* tanggul: garis [[i,j],...] dalam koordinat sel (pecahan boleh) -> topeng 8-tersambung. Aliran di mesin hanya lewat 4 sisi,
   jadi garis 8-tersambung sudah kedap. */
function garisSel(garis, nx, ny) {
  const m = new Uint8Array(nx * ny);
  for (let s = 1; s < garis.length; s++) { const [x0, y0] = garis[s - 1], [x1, y1] = garis[s], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4));
    for (let q = 0; q <= n; q++) { const i = Math.round(x0 + (x1 - x0) * q / n), j = Math.round(y0 + (y1 - y0) * q / n); if (i >= 0 && j >= 0 && i < nx && j < ny) m[j * nx + i] = 1; } }
  return m;
}
function naikkan(z, topeng, tinggi) { angka(tinggi, "tinggi tanggul"); tinggi >= 0 || salah(`tinggi tanggul negatif (${tinggi})`);
  const o = Float64Array.from(z); for (let k = 0; k < o.length; k++) if (topeng[k]) o[k] += tinggi; return o; }

/* ---------- inersia lokal (Bates, Horritt, Fewtrell 2010, pers. 11) ----------
   q' = (q - g hf dt dEta/dx) / (1 + g dt n^2 |q| / hf^(7/3)), q per lebar sisi (m2/dtk). cfg:
   nx, ny, dx (m), z (DEM), laut (topeng sel muka-tetap, opsional), muka (m per jam, J+1), hujan (mm/jam efektif, J),
   masuk [{k, q: m3/dtk per jam J+1}], pompa [{k, q m3/dtk, mulai jam}], tutup (topeng sel = pintu air tertutup: dinding, tanpa tepi
   terbuka), jam J. Pompa membuang air ke luar kisi (saluran/laut di balik tanggul). */
function jalankan(cfg, kabar) {
  const {nx, ny, dx} = cfg, z = cfg.z; cekKisi(z, nx, ny); angka(dx, "dx"); dx > 0 || salah(`dx ${dx} harus > 0`);
  const J = cfg.jam ?? 72; (Number.isInteger(J) && J > 0 && J <= 240) || salah(`jam ${J} tidak sah`);
  const N = nx * ny, A = dx * dx, n2 = (cfg.manning ?? ASUMSI.MANNING) ** 2, laut = cfg.laut || new Uint8Array(N), tutup = cfg.tutup || new Uint8Array(N);
  const hujan = cfg.hujan || new Float64Array(J); hujan.length >= J || salah(`hujan ${hujan.length} jam < ${J}`);
  for (let t = 0; t < J; t++) { angka(hujan[t], "hujan"); hujan[t] >= 0 || salah(`hujan negatif jam ${t}`); }
  const adaLaut = laut.some(v => v); let muka = null;
  if (adaLaut) { muka = cfg.muka; (muka && muka.length >= J + 1) || salah("ada sel laut tetapi muka laut per jam tidak lengkap"); for (let t = 0; t <= J; t++) angka(muka[t], "muka laut"); }
  const sah = (k, n) => (Number.isInteger(k) && k >= 0 && k < N && !laut[k]) || salah(`${n}: sel ${k} di luar kisi atau di laut`);
  const masuk = (cfg.masuk || []).map(m => { sah(m.k, "aliran masuk"); (m.q && m.q.length >= J + 1) || salah("debit masuk per jam tidak lengkap");
    for (let t = 0; t <= J; t++) { angka(m.q[t], "debit masuk"); m.q[t] >= 0 || salah(`debit masuk negatif jam ${t}`); } return m; });
  const pq = new Float64Array(N), pompa = cfg.pompa || [];
  for (const p of pompa) { sah(p.k, "pompa"); angka(p.q, "laju pompa"); p.q >= 0 || salah(`laju pompa negatif (${p.q})`); angka(p.mulai || 0, "jam mulai pompa"); }
  const aturPompa = s => { pq.fill(0); for (const p of pompa) if ((p.mulai || 0) * 3600 <= s + 1e-9) pq[p.k] += p.q; };

  const h = new Float64Array(N), hmaks = new Float64Array(N), qx = new Float64Array((nx - 1) * ny), qy = new Float64Array(nx * (ny - 1)), sk = new Float64Array(N);
  /* hujan jatuh di sel darat yang bukan pintu tertutup (sel tertutup = dinding: kalau ikut menerima hujan airnya terkurung di sana) */
  const kena = new Uint8Array(N); let nDarat = 0; for (let k = 0; k < N; k++) if (!laut[k] && !tutup[k]) { kena[k] = 1; nDarat++; }
  /* tepi terbuka: aliran normal Manning q = h^(5/3) sqrt(S)/n, S = max(LERENG_TEPI, lereng dasar ke arah luar) */
  const ek = [], es = [];
  const sudah = new Uint8Array(N); /* sel sudut cukup satu sisi keluar, tidak dihitung dua kali */
  const tepi = (k, kd) => { if (laut[k] || tutup[k] || sudah[k]) return; sudah[k] = 1; ek.push(k); es.push(Math.sqrt(Math.max(ASUMSI.LERENG_TEPI, (z[kd] - z[k]) / dx))); };
  for (let i = 0; i < nx; i++) { tepi(i, i + nx); tepi((ny - 1) * nx + i, (ny - 2) * nx + i); }
  for (let j = 0; j < ny; j++) { tepi(j * nx, j * nx + 1); tepi(j * nx + nx - 1, j * nx + nx - 2); }
  const nE = ek.length, qe = new Float64Array(nE), eo = new Float64Array(N);
  let zPantai = Infinity;
  if (adaLaut) for (let k = 0; k < N; k++) if (laut[k]) { const i = k % nx, j = (k / nx) | 0;
    for (const n of [i > 0 && k - 1, i < nx - 1 && k + 1, j > 0 && k - nx, j < ny - 1 && k + nx]) if (n !== false && !laut[n]) zPantai = Math.min(zPantai, z[n]); }
  const V = {hujan: 0, sungai: 0, lautMasuk: 0, lautKeluar: 0, tepi: 0, pompa: 0, pompaMinta: 0, koreksi: 0}; /* pompaMinta = laju x waktu; pompa < pompaMinta bila sumur pompa kering */
  const ked = new Float32Array(N * (J + 1)), luas = new Float64Array(J + 1), vol = new Float64Array(J + 1), Tend = J * 3600;
  let t = 0, simpanBerikut = 3600, langkah = 0;
  const K = {nx, ny, dx, A, n2, z, h, hmaks, qx, qy, px: new Float64Array(qx.length), py: new Float64Array(qy.length), theta: cfg.theta ?? THETA, sk, laut, tt: tutup, ek, es, qe, eo, pq, V};
  const etaLaut = s => { const a = Math.min(J, Math.floor(s / 3600)), b = Math.min(J, a + 1), f = s / 3600 - a; return muka[a] + (muka[b] - muka[a]) * f; };
  const debit = (m, s) => { const a = Math.min(J, Math.floor(s / 3600)), b = Math.min(J, a + 1), f = s / 3600 - a; return m.q[a] + (m.q[b] - m.q[a]) * f; };
  let hAkhir = 0;
  while (t < Tend - 1e-9) {
    /* CFL dari kedalaman maks langkah lalu, ditambah perkiraan masukan sungai langkah ini (debit x DT_MAKS / luas sel, batas atas)
       karena air sungai disuntik SEBELUM fluks dihitung; hujan per langkah <= mm, diabaikan */
    let hm = Math.max(.01, hAkhir);
    for (const m of masuk) { const d = h[m.k] + debit(m, t) * ASUMSI.DT_MAKS / A; if (d > hm) hm = d; }
    const es0 = adaLaut ? etaLaut(t) : 0; if (adaLaut && es0 - zPantai > hm) hm = es0 - zPantai;
    const dt = Math.min(ASUMSI.DT_MAKS, (cfg.alfa ?? ASUMSI.ALFA) * dx / Math.sqrt(G * hm), simpanBerikut - t);
    const jam = Math.min(J - 1, Math.floor(t / 3600)), r = hujan[jam] / 1000 / 3600 * dt;
    if (r > 0) { for (let k = 0; k < N; k++) if (kena[k]) h[k] += r; V.hujan += r * A * nDarat; }
    for (const m of masuk) { const v = debit(m, t + dt / 2) * dt; h[m.k] += v / A; V.sungai += v; }
    const eta = adaLaut ? etaLaut(t + dt / 2) : 0; if (pompa.length) aturPompa(t);
    hAkhir = langkahAir(K, dt, eta);
    t += dt; langkah++;
    if (t >= simpanBerikut - 1e-9) { const s = Math.round(simpanBerikut / 3600), o = s * N; let lu = 0, vo = 0;
      for (let k = 0; k < N; k++) { if (laut[k]) continue; ked[o + k] = h[k]; vo += h[k] * A; if (h[k] >= ASUMSI.TERGENANG) lu += A; }
      luas[s] = lu; vol[s] = vo; t = simpanBerikut; simpanBerikut += 3600; if (kabar) kabar(s / J); }
  }
  let simpan = 0; for (let k = 0; k < N; k++) if (!laut[k]) simpan += h[k] * A;
  const masukV = V.hujan + V.sungai + V.lautMasuk, keluarV = V.tepi + V.lautKeluar + V.pompa;
  const galat = Math.abs(masukV - keluarV - simpan) / Math.max(masukV, 1e-9);
  return {nx, ny, dx, jam: J, kedalaman: ked, hmaks: Float32Array.from(hmaks), luas, volume: vol, langkah,
    neraca: {...V, masuk: masukV, keluar: keluarV, simpan, galat}};
}

/* akar pangkat tiga cepat (Kahan: tebakan dari bit eksponen + 2 langkah Newton, galat relatif < 1e-5): Math.cbrt memakan
   separuh waktu langkah. Hanya dipakai di suku gesekan, bukan di neraca massa. */
const F64 = new Float64Array(1), U32 = new Uint32Array(F64.buffer), HI = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? 1 : 0;
function cbrt(a) { F64[0] = a; U32[HI] = ((U32[HI] / 3) | 0) + 715094163; U32[1 - HI] = 0; let x = F64[0];
  x = (2 * x + a / (x * x)) / 3; return (2 * x + a / (x * x)) / 3; }
/* satu langkah inersia: fluks sisi, aliran tepi, pembatas, perbarui h. Fungsi terpisah tanpa closure: ~10x lebih cepat di V8 */
function langkahAir(K, dt, eta) {
  const {nx, ny, dx, A, n2, z, h, hmaks, qx, qy, px, py, sk, laut, tt, ek, es, qe, eo, pq, V} = K, N = nx * ny, nE = ek.length, gdt = G * dt, sn = Math.sqrt(n2);
  /* skema q-terpusat de Almeida dkk. 2012: q lama dirata-rata dengan sisi sejajar tetangga. Diuji di mangkuk n 0,013-0,03,
     48 jam: theta 1 (Bates asli) dengan alfa 0,7 berosilasi lalu pecah sesudah ~6 jam; theta 0,7 membeku jadi pola papan
     catur; theta 0,9 alfa 0,7 rata sampai 0,1 mm. */
  px.set(qx); py.set(qy); const TH = K.theta, TL = (1 - TH) / 2;
  for (let j = 0; j < ny; j++) for (let i = 0; i < 2 * nx - 1; i++) {
    /* i < nx-1: sisi x (a, a+1); sisanya sisi y (a, a+nx) untuk j < ny-1 */
    let a, b, f, arr;
    let qm;
    if (i < nx - 1) { a = j * nx + i; b = a + 1; f = j * (nx - 1) + i; arr = qx; qm = TH * px[f] + TL * ((i > 0 ? px[f - 1] : px[f]) + (i < nx - 2 ? px[f + 1] : px[f])); }
    else { if (j === ny - 1) break; a = j * nx + i - (nx - 1); b = a + nx; f = a; arr = qy; qm = TH * py[f] + TL * ((j > 0 ? py[f - nx] : py[f]) + (j < ny - 2 ? py[f + nx] : py[f])); }
    const la = laut[a], lb = laut[b]; if (la && lb) continue; if (tt[a] || tt[b]) { arr[f] = 0; continue; } /* pintu air tertutup = dinding */
    const za = z[a], zb = z[b], ea = la ? (za > eta ? za : eta) : za + h[a], eb = lb ? (zb > eta ? zb : eta) : zb + h[b];
    const hf = (ea > eb ? ea : eb) - (za > zb ? za : zb);
    if (hf <= HMIN) { arr[f] = 0; continue; }
    const q = arr[f]; arr[f] = (qm - gdt * hf * (eb - ea) / dx) / (1 + gdt * n2 * (q < 0 ? -q : q) / (hf * hf * cbrt(hf)));
  }
  eo.fill(0);
  for (let e = 0; e < nE; e++) { const k = ek[e], d = h[k]; const v = d > HMIN ? d * cbrt(d * d) * es[e] / sn : 0; qe[e] = v; eo[k] += v; }
  for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) { sk[k] = 1; if (laut[k]) continue; let o = eo[k];
    const fx = j * (nx - 1) + i;
    if (i < nx - 1) { const q = qx[fx]; if (q > 0) o += q; }
    if (i > 0) { const q = qx[fx - 1]; if (q < 0) o -= q; }
    if (j < ny - 1) { const q = qy[k]; if (q > 0) o += q; }
    if (j > 0) { const q = qy[k - nx]; if (q < 0) o -= q; }
    if (o === 0 && pq[k] === 0) continue;
    const keluar = (o * dx + pq[k]) * dt, isi = h[k] * A; if (keluar > isi) sk[k] = isi / keluar; }
  let lm = 0, lk = 0; const w = dx * dt;
  for (let j = 0; j < ny; j++) for (let i = 0; i < 2 * nx - 1; i++) {
    let a, b, f, arr;
    if (i < nx - 1) { a = j * nx + i; b = a + 1; f = j * (nx - 1) + i; arr = qx; }
    else { if (j === ny - 1) break; a = j * nx + i - (nx - 1); b = a + nx; f = a; arr = qy; }
    let q = arr[f]; if (q === 0) continue;
    q *= q > 0 ? sk[a] : sk[b]; arr[f] = q; const dv = q * w;
    if (laut[a]) { if (dv < 0) lk -= dv; else lm += dv; h[b] += dv / A; }
    else if (laut[b]) { if (dv > 0) lk += dv; else lm -= dv; h[a] -= dv / A; }
    else { h[a] -= dv / A; h[b] += dv / A; }
  }
  V.lautMasuk += lm; V.lautKeluar += lk;
  for (let e = 0; e < nE; e++) { const k = ek[e], v = qe[e] * sk[k] * w; h[k] -= v / A; V.tepi += v; }
  let hm = 0;
  for (let k = 0; k < N; k++) { if (pq[k]) { const v = pq[k] * sk[k] * dt; h[k] -= v / A; V.pompa += v; V.pompaMinta += pq[k] * dt; }
    const d = h[k]; if (d < 0) { V.koreksi -= d * A; h[k] = 0; } else { if (d > hmaks[k]) hmaks[k] = d; if (d > hm) hm = d; } }
  return hm;
}

/* ---------- penyiapan area (dijalankan di Web Worker; murni) ----------
   dem dari ambilDEM; lereng = SimLongsor.lereng (dioper supaya berkas ini tetap tanpa ketergantungan). Hasil: z siap mesin, topeng
   laut, akumulasi D8, lereng, sel keluaran utama + sel pintu air, relief, jumlah sel yang didangkalkan. */
function siapkanArea(dem, lereng) {
  const {nx, ny, dx} = dem, z0 = dem.z, N = nx * ny, laut = topengLaut(z0, nx, ny), benih = benihTepi(nx, ny, laut), z = siapkanDEM(z0, nx, ny, benih);
  const f = isiCekungan(z, nx, ny, benih), acc = akumulasi(f, arahD8(f, nx, ny, benih)), lr = lereng ? lereng(z0, nx, ny, dx) : new Float32Array(N);
  const tepiK = k => { const i = k % nx, j = (k / nx) | 0; return !i || !j || i === nx - 1 || j === ny - 1; };
  let kel = -1; for (let k = 0; k < N; k++) if (tepiK(k) && !laut[k] && (kel < 0 || acc[k] > acc[kel])) kel = k;
  const pintu = new Uint8Array(N), ki = kel % nx, kj = (kel / nx) | 0;
  for (let k = 0; k < N; k++) if (laut[k] || (kel >= 0 && tepiK(k) && Math.abs(k % nx - ki) <= 3 && Math.abs(((k / nx) | 0) - kj) <= 3)) pintu[k] = 1;
  const dar = []; let isi = 0, nLaut = 0; for (let k = 0; k < N; k++) { if (laut[k]) nLaut++; else dar.push(z[k]); if (z[k] > z0[k]) isi++; }
  dar.sort((a, b) => a - b); const relief = dar.length ? dar[Math.floor(dar.length * .95)] - dar[Math.floor(dar.length * .05)] : 0;
  return {z, isi, laut, acc, lr, kel, pintu, relief: Math.max(1, relief), nLaut};
}

/* ---------- DEM: ubin Terrarium (s3 elevation-tiles-prod, ber-CORS, sumber medan 3D MapLibre di sim_3d) ----------
   Kisi persegi nxn berpusat (lat, lon), sisi `sisi` m, dicuplik bilinear dalam ruang Mercator di zoom paling kasar yang
   pikselnya <= ukuran sel (z 10-13; sumber SRTM ~30 m di Indonesia). */
const URL_DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/";
const MERC = 156543.03392804097;
const keDunia = (lon, lat, z) => { const n = 256 * 2 ** z, r = lat * Math.PI / 180; return [(lon + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n]; };
const dariDunia = (x, y, z) => { const n = 256 * 2 ** z; return [x / n * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI]; };
function rencanaKisi(lat, lon, sisi, n) {
  angka(lat, "lintang"); angka(lon, "bujur"); (Math.abs(lat) < 80) || salah(`lintang ${lat} di luar jangkauan`);
  (sisi >= 500 && sisi <= 50000) || salah(`sisi area ${sisi} m di luar 500-50.000`); (Number.isInteger(n) && n >= 8 && n <= 400) || salah(`sel per sisi ${n} tidak sah`);
  const dx = sisi / n, c = Math.cos(lat * Math.PI / 180); let z = 10; while (z < 13 && MERC * c / 2 ** z > dx) z++;
  const s = dx / (MERC * c / 2 ** z), [cx, cy] = keDunia(lon, lat, z), x0 = cx - n * s / 2, y0 = cy - n * s / 2;
  const sudut = [dariDunia(x0, y0, z), dariDunia(x0 + n * s, y0, z), dariDunia(x0 + n * s, y0 + n * s, z), dariDunia(x0, y0 + n * s, z)];
  return {nx: n, ny: n, dx, zoom: z, s, x0, y0, sudut, lat, lon, sisi};
}
async function ubin(z, x, y, ambil) {
  const r = await (ambil || fetch)(`${URL_DEM}${z}/${x}/${y}.png`); if (!r.ok) salah(`ubin DEM ${z}/${x}/${y} HTTP ${r.status}`);
  const bm = await createImageBitmap(await r.blob(), {colorSpaceConversion: "none", premultiplyAlpha: "none"});
  const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement("canvas"), {width: 256, height: 256});
  const g = cv.getContext("2d", {willReadFrequently: true}); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, 256, 256).data;
}
const terrarium = (d, o) => d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768;
async function ambilDEM(lat, lon, sisi, n, ambil) {
  const K = rencanaKisi(lat, lon, sisi, n), {zoom, s, x0, y0} = K, tx0 = Math.floor((x0 - 1) / 256), ty0 = Math.floor((y0 - 1) / 256),
    tx1 = Math.floor((x0 + n * s + 1) / 256), ty1 = Math.floor((y0 + n * s + 1) / 256), U = new Map();
  ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) <= 36) || salah("area terlalu besar untuk diunduh");
  await Promise.all([...Array(tx1 - tx0 + 1).keys()].flatMap(a => [...Array(ty1 - ty0 + 1).keys()].map(async b => U.set(`${tx0 + a},${ty0 + b}`, await ubin(zoom, tx0 + a, ty0 + b, ambil)))));
  const tinggi = (x, y) => { const tx = Math.floor(x / 256), ty = Math.floor(y / 256), d = U.get(`${tx},${ty}`), px = Math.min(255, Math.max(0, Math.floor(x - tx * 256))), py = Math.min(255, Math.max(0, Math.floor(y - ty * 256)));
    return terrarium(d, (py * 256 + px) * 4); };
  const zz = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = x0 + (i + .5) * s - .5, y = y0 + (j + .5) * s - .5, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    zz[j * n + i] = (tinggi(xi, yi) * (1 - fx) + tinggi(xi + 1, yi) * fx) * (1 - fy) + (tinggi(xi, yi + 1) * (1 - fx) + tinggi(xi + 1, yi + 1) * fx) * fy; }
  return {...K, z: zz};
}
/* koordinat <-> sel pada kisi rencanaKisi (j = 0 baris utara) */
const keSel = (K, lon, lat) => { const [x, y] = keDunia(lon, lat, K.zoom); return [(x - K.x0) / K.s - .5, (y - K.y0) / K.s - .5]; };
const dariSel = (K, i, j) => dariDunia(K.x0 + (i + .5) * K.s, K.y0 + (j + .5) * K.s, K.zoom);

const API = {ASUMSI, isiCekungan, batasiCekungan, siapkanDEM, siapkanArea, benihTepi, arahD8, akumulasi, hietograf, kelasAMC, cnAMC, limpasan, pasang, topengLaut, garisSel, naikkan, jalankan,
  rencanaKisi, ambilDEM, keSel, dariSel, terrarium};
if (typeof module !== "undefined" && module.exports) module.exports = API; else akar.SimGenangan = API;
})(typeof self !== "undefined" ? self : globalThis);
