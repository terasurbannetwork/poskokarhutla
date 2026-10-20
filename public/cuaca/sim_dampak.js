/* sim_dampak.js: model dampak simulasi cuaca. Fungsi murni tanpa DOM (peramban: window.SimDampak; node: import lewat tests/cuaca).
   Angin kencang -> kerusakan atap dan pohon tumbang (kurva kerapuhan lognormal, bentuk HAZUS-MH Hurricane, FEMA).
   Hujan -> limpasan SCS-CN (USDA-NRCS TR-55) dengan CN disesuaikan lereng DEM (Sharpley-Williams 1990), pita p10/p50/p90 dari ansambel ECMWF.
   Siklon -> defisit tekanan Holland (1980), Vmaks-tekanan Atkinson-Holliday (1977), gelombang badai = barometer terbalik + pembendungan angin.
   Gelombang laut -> batas operasi kapal per kelas GT.
   Semua parameter yang tidak punya sumber yang bisa dicek ditulis ASUMSI di PARAM dan ikut tampil di kartu Asumsi. */
(function (root, buat) { const o = buat(); root.SimDampak = o; if (typeof module !== "undefined" && module.exports) module.exports = o; })(typeof self !== "undefined" ? self : globalThis, function () {
  const KMD = 111.32, rad = Math.PI / 180;
  const jarak = (la1, lo1, la2, lo2) => Math.hypot((lo2 - lo1) * Math.cos((la1 + la2) / 2 * rad), la2 - la1) * KMD;

  /* ---------- parameter: [tengah, rendah, tinggi, satuan, sumber/asumsi] ---------- */
  const PARAM = {
    atap: [95, 80, 110, "km/jam embusan, median kerusakan atap", "ASUMSI: bentuk lognormal HAZUS-MH; median disetel ke permukiman atap seng/genteng, belum dicek ke kejadian Indonesia"],
    atap_b: [.25, .2, .3, "sebaran log", "ASUMSI: kisaran beta HAZUS 0,2 sampai 0,3"],
    pohon: [75, 60, 90, "km/jam embusan, median pohon tumbang", "ASUMSI: pohon peneduh berakar dangkal; belum dicek ke kejadian Indonesia"],
    pohon_b: [.25, .2, .3, "sebaran log", "ASUMSI"],
    jiwa_rumah: [3.9, 3.5, 4.2, "jiwa/rumah", "ASUMSI mengacu rata-rata ukuran rumah tangga BPS"],
    cn: [75, 65, 85, "bilangan kurva (CN) lahan campuran", "ASUMSI: tutupan lahan per sel tidak dipakai, CN tunggal tanpa koreksi lereng (DEM 2,4 km terlalu kasar untuk koreksi lereng)"],
    genang_q: [30, 15, 60, "mm limpasan 72 jam", "ASUMSI: ambang sel dataran rendah dianggap tergenang"],
    genang_elev: [25, 10, 40, "m dpl", "ASUMSI: dataran banjir"],
    genang_lereng: [1.5, 1, 3, "derajat", "ASUMSI"],
    rusak_genang: [.2, .1, .3, "porsi rumah rusak di sel tergenang", "ASUMSI"],
    pohon_per_jiwa: [.01, .005, .02, "pohon dipangkas per jiwa di zona", "ASUMSI"],
    pangkas_rp: [250000, 150000, 500000, "Rp/pohon", "ASUMSI: tarif jasa pangkas pohon besar"],
    pangkas_ef: [.5, .2, .7, "porsi kerusakan atap karena pohon yang dicegah", "ASUMSI"],
    pangkas_porsi: [.3, .1, .5, "porsi rumah tertimpa bila pohon di selnya tumbang", "ASUMSI"],
    evak_ef: [.7, .5, .9, "porsi jiwa zona yang benar-benar mengungsi", "ASUMSI"],
    evak_hari: [2, 1, 3, "hari mengungsi per evakuasi", "ASUMSI"],
    evak_angkut: [50000, 25000, 100000, "Rp/jiwa angkut", "ASUMSI"],
    evak_mati: [5e-4, 1e-5, 2e-3, "peluang meninggal di zona bila tidak mengungsi", "ASUMSI lemah: tidak ada kurva kedalaman-korban bersumber untuk Indonesia, jadi rata di seluruh zona dan evakuasi tidak diperingkat menurut manfaat/biaya"],
    logistik_hari: [3, 3, 3, "hari persediaan", "Perka BNPB 7/2008 (standar minimal)"],
    logistik_porsi: [.3, .15, .5, "porsi nilai stok yang terpakai atau kedaluwarsa", "ASUMSI (sama dengan paket D di Keputusan banjir)"],
    setup_L: [50, 20, 100, "km lebar paparan", "ASUMSI: tanpa batimetri"],
    setup_h: [15, 10, 30, "m kedalaman paparan", "ASUMSI: tanpa batimetri"],
    ambang_p: [.02, .01, .05, "peluang kerusakan di bawah ini dianggap nol", "ASUMSI: tanpa batas ini ekor lognormal pada embusan 50 km/jam dikali jutaan rumah memberi ribuan kerusakan semu. Median atap dan pohon di atas juga ASUMSI, bukan HAZUS asli (HAZUS memakai embusan 3 detik dalam mph per tipe bangunan)"],
    holland_b: [1.5, 1, 2.5, "parameter bentuk Holland B", "ASUMSI: sama dengan profil angin di sim_data.js; B nyata berkisar 1 sampai 2,5"],
    cd: [2.6e-3, 1.5e-3, 3e-3, "koefisien seret angin", "ASUMSI: kisaran literatur angin badai"],
    rho_a: [1.2, 1.1, 1.3, "kg/m3 massa jenis udara", "fisika baku, dekat permukaan laut tropis"],
    kapal_kecil_hs: [1.25, 1, 1.5, "m gelombang, perahu di bawah 10 GT", "HIPOTESIS, belum dicek ke dokumen BMKG Maritim"],
    kapal_kecil_kt: [15, 12, 18, "knot angin, perahu di bawah 10 GT", "HIPOTESIS"],
    kapal_sedang_hs: [1.5, 1.25, 2, "m gelombang, kapal 10 sampai 100 GT", "HIPOTESIS"],
    kapal_sedang_kt: [16, 14, 20, "knot angin, kapal 10 sampai 100 GT", "HIPOTESIS"],
    kapal_besar_hs: [2.5, 2, 3.5, "m gelombang, kapal 100 sampai 1.000 GT", "HIPOTESIS"],
    kapal_besar_kt: [21, 18, 25, "knot angin, kapal 100 sampai 1.000 GT", "HIPOTESIS"],
    kapal_raksasa_hs: [4, 3, 5, "m gelombang, kapal di atas 1.000 GT", "HIPOTESIS"],
    kapal_raksasa_kt: [27, 24, 30, "knot angin, kapal di atas 1.000 GT", "HIPOTESIS"],
    pesisir_km: [20, 10, 30, "km dari pelabuhan", "ASUMSI: jarak dampak gelombang badai"],
  };
  const P = k => PARAM[k][0];
  /* kelas kapal: ambang gelombang (m) dan angin (knot). HIPOTESIS acuan umum peringatan gelombang, belum dicek ke dokumen resmi BMKG Maritim. */
  const KAPAL = [["kecil", "Perahu nelayan dan kapal di bawah 10 GT"], ["sedang", "Kapal 10 sampai 100 GT, tongkang"], ["besar", "Feri dan kapal 100 sampai 1.000 GT"], ["raksasa", "Kapal barang di atas 1.000 GT"]]
    .map(([id, nama]) => ({id, nama, hs: P(`kapal_${id}_hs`), kt: P(`kapal_${id}_kt`)}));


  /* ---------- fungsi dasar ---------- */
  /* fungsi sebaran normal baku, Abramowitz-Stegun 26.2.17 (galat < 7,5e-8) */
  function phi(z) { const t = 1 / (1 + .2316419 * Math.abs(z)), d = .3989423 * Math.exp(-z * z / 2), p = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  /* peluang melampaui keadaan kerusakan pada embusan v (km/jam) */
  /* peluang di bawah ambang_p (PARAM, ASUMSI) dianggap nol */
  const rapuh = (v, med, beta) => { const p = v > 0 ? phi(Math.log(v / med) / beta) : 0; return p < P("ambang_p") ? 0 : p; };
  const pAtap = v => rapuh(v, P("atap"), P("atap_b")), pPohon = v => rapuh(v, P("pohon"), P("pohon_b"));
  /* SCS-CN: Q = (P - 0,2S)^2 / (P + 0,8S), S = 25400/CN - 254 (mm) */
  function scsQ(p, cn) { const s = 25400 / cn - 254, ia = .2 * s; return p > ia ? (p - ia) ** 2 / (p + .8 * s) : 0; }
  const tergenang = (p72, elev, lereng) => elev != null && elev <= P("genang_elev") && lereng <= P("genang_lereng") && scsQ(p72, P("cn")) >= P("genang_q");
  /* tekanan siklon: Vmaks (knot) = 6,7 (1010 - Pc)^0,644 -> defisit pusat (hPa); defisit di jarak r = dp (1 - exp(-(Rm/r)^1,5)) pada profil Holland */
  const dpPusat = kt => Math.pow(Math.max(kt, 0) / 6.7, 1 / .644);
  const dpDi = (kt, r, rm) => r < 1 ? dpPusat(kt) : dpPusat(kt) * (1 - Math.exp(-Math.pow(rm / r, P("holland_b"))));
  /* gelombang badai (m): barometer terbalik 1 hPa ~ 1,01 cm ditambah pembendungan angin Cd rho_a U^2 L / (rho_w g h) */
  function badai(dp, u) { const ib = dp * 100 / (1025 * 9.81), cd = P("cd"), ws = cd * P("rho_a") * u * u * P("setup_L") * 1000 / (1025 * 9.81 * P("setup_h")); return {ib, ws, total: ib + ws}; }
  const jamKapal = (hs, kt, k) => (hs != null && hs >= k.hs) || (kt != null && kt >= k.kt);

  /* ---------- terrarium ---------- */
  const mdpl = (r, g, b) => r * 256 + g + b / 256 - 32768;
  const ubin = (lon, lat, z) => { const n = 2 ** z, fx = (lon + 180) / 360 * n, q = lat * rad, fy = (1 - Math.log(Math.tan(q) + 1 / Math.cos(q)) / Math.PI) / 2 * n; return {x: Math.floor(fx), y: Math.floor(fy), px: Math.min(255, Math.floor((fx - Math.floor(fx)) * 256)), py: Math.min(255, Math.floor((fy - Math.floor(fy)) * 256))}; };

  /* ---------- titik: bobot bilinear ke medan sekali, dipakai tiap jam ---------- */
  function bobot(M, pts) {
    const n = pts.length, ix = new Int32Array(n).fill(-1), w = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const x = (pts[i].lon - M.lon0) / M.d, y = (pts[i].lat - M.lat0) / M.d;
      if (!(x >= 0 && y >= 0 && x <= M.nx - 1 && y <= M.ny - 1)) continue;
      const x0 = Math.min(M.nx - 2, Math.floor(x)), y0 = Math.min(M.ny - 2, Math.floor(y)), fx = x - x0, fy = y - y0;
      ix[i] = y0 * M.nx + x0; w[i * 4] = (1 - fx) * (1 - fy); w[i * 4 + 1] = fx * (1 - fy); w[i * 4 + 2] = (1 - fx) * fy; w[i * 4 + 3] = fx * fy;
    }
    return {ix, w, nx: M.nx};
  }
  const nilai = (B, a, i) => { const o = B.ix[i]; return a[o] * B.w[i * 4] + a[o + 1] * B.w[i * 4 + 1] + a[o + B.nx] * B.w[i * 4 + 2] + a[o + B.nx + 1] * B.w[i * 4 + 3]; };
  /* hari WIB ke-berapa (0 = hari jam pertama) untuk jam h */
  const hariKe = (jam0, h) => Math.floor((jam0 + 7 * 36e5 + h * 36e5) / 864e5) - Math.floor((jam0 + 7 * 36e5) / 864e5);
  const tglWib = (jam0, d) => new Date(Math.floor((jam0 + 7 * 36e5) / 864e5) * 864e5 + d * 864e5).toISOString().slice(0, 10);

  /* satu putaran: jam [h0, h1) dari bingkai F (u,v m/s; r mm/jam; g km/jam). vorAt(lon,lat,h) -> [du,dv] atau null.
     Keadaan S terus ditambah: gmax (km/jam), hujan per hari (mm), jumlah titik di luar medan tidak dihitung. */
  function langkah(S, B, pts, F, jam0, h0, h1, vorAt) {
    const n = pts.length;
    for (let h = h0; h < h1; h++) {
      const f = F[h], d = hariKe(jam0, h);
      for (let i = 0; i < n; i++) {
        if (B.ix[i] < 0) continue;
        let g = nilai(B, f.g, i);
        if (vorAt) { const w = vorAt(pts[i].lon, pts[i].lat, h); if (w) g = Math.max(g, Math.hypot(nilai(B, f.u, i) + w[0], nilai(B, f.v, i) + w[1]) * 3.6); }
        if (g > S.gmax[i]) S.gmax[i] = g;
        S.hujan[d * n + i] += Math.max(0, nilai(B, f.r, i));
      }
    }
  }
  const baru = (n, nd) => ({gmax: new Float32Array(n), hujan: new Float32Array(n * nd), nd});

  /* ---------- ansambel: selisih persentil harian terhadap median (mm), titik terdekat dalam 1,2 derajat ---------- */
  function petaAnsambel(pts, ens) {
    const g = ens?.grid || [], o = new Int32Array(pts.length).fill(-1);
    pts.forEach((p, i) => { let b = -1, bd = 1.2 * KMD; for (let j = 0; j < g.length; j++) { if (Math.abs(g[j].lat - p.lat) > 1.2 || Math.abs(g[j].lon - p.lon) > 1.2) continue; const d = jarak(p.lat, p.lon, g[j].lat, g[j].lon); if (d < bd) { bd = d; b = j; } } o[i] = b; });
    return o;
  }
  /* BATAS LEBAR: p10 dan p90 adalah jumlah kuantil harian (mengandaikan anggota ansambel berkorelasi sempurna antar hari), bukan kuantil jumlah. */
  /* jumlah hujan 72 jam (mm) tiap titik pada pita 0 (p10), 1 (p50 = prakiraan), 2 (p90); tanpa ansambel pada hari itu pitanya sama dengan prakiraan */
  function hujanPita(S, n, jam0, ens, peta) {
    const idx = new Map((ens?.hari || []).map((t, i) => [t, i])), out = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    let hariAda = 0; for (let d = 0; d < S.nd; d++) if (idx.has(tglWib(jam0, d))) hariAda++;
    for (let i = 0; i < n; i++) for (let d = 0; d < S.nd; d++) {
      const p = S.hujan[d * n + i], di = idx.get(tglWib(jam0, d)), q = di != null && peta[i] >= 0 ? ens.grid[peta[i]].q : null;
      out[1][i] += p;
      out[0][i] += q ? Math.max(0, p + q[0][di] - q[1][di]) : p;
      out[2][i] += q ? p + Math.max(0, q[2][di] - q[1][di]) : p;
    }
    return {pita: out, hariAda};
  }

  /* ---------- ringkasan dampak ---------- */
  const bulat = x => Math.round(x);
  /* pts[i] = {lat, lon, w, k: "p" penduduk | "s" sekolah | "f" faskes, elev, lereng}. surge: [{lat, lon, m}] titik pelabuhan dengan gelombang badai maksimum */
  function ringkas(pts, S, pita, surge) {
    const n = pts.length, o = {rumahAtap: 0, jiwaAtap: 0, jiwaPohon: 0, sekolah: {atap: 0, genang: [0, 0, 0], n: 0}, faskes: {atap: 0, genang: [0, 0, 0], n: 0}, genang: [0, 0, 0], rumahGenang: 0, pesisir: 0, zonaPohon: 0, zonaEvak: 0, rumahPohon: 0};
    const rumah = P("jiwa_rumah"), sur = (surge || []).filter(s => s.m > .05);
    for (let i = 0; i < n; i++) {
      const p = pts[i], g = S.gmax[i], pa = pAtap(g), pp = pPohon(g), sarana = p.k === "s" ? o.sekolah : p.k === "f" ? o.faskes : null;
      if (sarana) { sarana.n++; if (pa >= .5) sarana.atap++; }
      else { o.rumahAtap += p.w / rumah * pa; o.jiwaAtap += pa >= .5 ? p.w : 0; if (pp >= .5) o.jiwaPohon += p.w; if (pp >= .2) o.zonaPohon += p.w; o.rumahPohon += p.w / rumah * pp; }
      let ev = false;
      for (let b = 0; b < 3; b++) if (tergenang(pita[b][i], p.elev, p.lereng ?? 0)) { if (sarana) sarana.genang[b]++; else o.genang[b] += p.w; if (b === 1) ev = !sarana && p.elev <= 10; }
      if (!sarana && tergenang(pita[1][i], p.elev, p.lereng ?? 0)) o.rumahGenang += p.w / rumah * P("rusak_genang");
      if (!sarana) { let pes = false; for (const s of sur) if (p.elev != null && p.elev <= s.m && jarak(p.lat, p.lon, s.lat, s.lon) <= P("pesisir_km")) { pes = true; break; } if (pes) { o.pesisir += p.w; ev = true; } if (ev) o.zonaEvak += p.w; }
    }
    return o;
  }

  /* ---------- perlakuan: tiap kandidat dijalankan pada hasil model yang sama, lalu diperingkat ---------- */
  /* uang: {rr, rrRendah, rrTinggi, nyawa, nyawaRendah, nyawaTinggi, pengungsiHari} dari param_banjir.json (null = Rp tidak dihitung).
     Pangkas pohon diperingkat menurut manfaat/biaya. Evakuasi TIDAK: manfaatnya bergantung peluang meninggal yang tak punya sumber, jadi hanya rentang (bcrRendah..bcrTinggi);
     tumpang = rentangnya menimpa rentang pangkas pohon, urutan keduanya tidak bermakna. */
  function perlakuan(r, uang) {
    const lo = k => PARAM[k][1], hi = k => PARAM[k][2], mid = k => PARAM[k][0];
    const rp = !!uang, o = [], batas = (m, b) => b > 0 ? m / b : null;
    const hit = (nama, zona, rumah, biaya, manfaat, bcr, catatan, peringkat) => { const x = {nama, jiwa: zona, rumah, biaya, manfaat, bcr, catatan, peringkat}; o.push(x); return x; };
    const pohon = r.zonaPohon * mid("pohon_per_jiwa"), rumahOK = r.rumahPohon * mid("pangkas_porsi") * mid("pangkas_ef");
    const q = hit("Pangkas pohon di zona angin kencang", r.zonaPohon, rumahOK, rp ? pohon * mid("pangkas_rp") : null, rp ? rumahOK * uang.rr : null, null, `${new Intl.NumberFormat("id-ID").format(bulat(pohon))} pohon`, true);
    const ev = r.zonaEvak * mid("evak_ef");
    const e = hit("Evakuasi dataran rendah dan pesisir", r.zonaEvak, 0, rp ? ev * (mid("evak_hari") * uang.pengungsiHari + mid("evak_angkut")) : null, rp ? ev * mid("evak_mati") * uang.nyawa : null, null, `${new Intl.NumberFormat("id-ID").format(bulat(ev))} jiwa mengungsi`, false);
    hit("Pra-posisi logistik pengungsi", r.genang[1], 0, rp ? r.genang[1] * mid("logistik_hari") * uang.pengungsiHari * mid("logistik_porsi") : null, null, null, "manfaat belum bisa dihitung: tidak ada studi yang mengukurnya", false);
    if (rp) {
      q.bcr = batas(q.manfaat, q.biaya);
      q.bcrRendah = batas(r.rumahPohon * lo("pangkas_porsi") * lo("pangkas_ef") * (uang.rrRendah ?? uang.rr), r.zonaPohon * hi("pohon_per_jiwa") * hi("pangkas_rp"));
      q.bcrTinggi = batas(r.rumahPohon * hi("pangkas_porsi") * hi("pangkas_ef") * (uang.rrTinggi ?? uang.rr), r.zonaPohon * lo("pohon_per_jiwa") * lo("pangkas_rp"));
      e.bcrRendah = batas(ev * lo("evak_mati") * (uang.nyawaRendah ?? uang.nyawa), ev * (hi("evak_hari") * uang.pengungsiHari + hi("evak_angkut")));
      e.bcrTinggi = batas(ev * hi("evak_mati") * (uang.nyawaTinggi ?? uang.nyawa), ev * (lo("evak_hari") * uang.pengungsiHari + lo("evak_angkut")));
      e.tumpang = q.bcrRendah != null && e.bcrRendah != null && e.bcrRendah <= q.bcrTinggi && q.bcrRendah <= e.bcrTinggi;
    }
    return o.filter(x => x.jiwa > 0 || x.rumah > 0).sort((a, b) => (b.peringkat - a.peringkat) || (b.bcr ?? -1) - (a.bcr ?? -1) || b.jiwa - a.jiwa);
  }

  /* ---------- gelombang per kelas kapal: titik perairan x jam yang melampaui batas ---------- */
  function kapal(HS, WK) {
    return KAPAL.map(k => { let titik = 0, jam = 0; HS.forEach((hs, ti) => { let n = 0; for (let h = 0; h < hs.length; h++) if (jamKapal(isNaN(hs[h]) ? null : hs[h], WK[ti][h], k)) n++; if (n) { titik++; jam += n; } }); return {...k, titik, jam, total: HS.length}; });
  }

  function uji() {
    const ok = (a, m) => { if (!a) throw new Error(m || "gagal"); }, dekat = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m || ""} ${a} != ${b}`);
    dekat(phi(0), .5, 1e-6, "phi(0)"); dekat(phi(1.96), .975, 1e-3, "phi(1,96)");
    dekat(pAtap(95), .5, 1e-6, "median kerapuhan = 0,5"); ok(pAtap(50) === 0 && pAtap(150) > .95, "kerapuhan naik monoton"); ok(pPohon(75) > pAtap(75), "pohon tumbang lebih dulu dari atap");
    dekat(scsQ(100, 75), 41.14, .05, "SCS-CN P=100 CN=75"); ok(scsQ(10, 75) === 0, "di bawah abstraksi awal = 0");
    ok(tergenang(200, 5, .5) && !tergenang(200, 300, .5) && !tergenang(200, 5, 8) && !tergenang(10, 5, .5), "ambang genangan: rendah, datar, dan hujan cukup");
    dekat(dpPusat(100), Math.pow(100 / 6.7, 1 / .644), 1e-9); dekat(dpDi(100, 40, 40), (1 - Math.exp(-1)) * dpPusat(100), 1e-9, "dp di r=Rm = 0,632 dp pusat"); ok(dpDi(100, 500, 40) < dpDi(100, 40, 40), "defisit tekanan turun menjauh");
    dekat(badai(50, 0).ib, .4975, .01, "50 hPa ~ 0,5 m"); ok(badai(50, 40).total > badai(50, 20).total, "angin menambah gelombang badai");
    ok(jamKapal(1.3, 5, KAPAL[0]) && !jamKapal(1.3, 5, KAPAL[1]), "1,3 m menghentikan perahu kecil, bukan kapal sedang");
    dekat(mdpl(128, 0, 0), 0, 1e-9); dekat(mdpl(128, 10, 128), 10.5, 1e-9);
    const M = {lon0: 100, lat0: 0, d: 1.5, nx: 3, ny: 2}, pts = [{lat: .75, lon: 101.5, w: 1000, k: "p", elev: 5, lereng: .2}, {lat: 50, lon: 50, w: 9, k: "p", elev: 5, lereng: 0}];
    const B = bobot(M, pts), S = baru(2, 1), F = [{u: new Float32Array(6), v: new Float32Array(6), r: new Float32Array(6).fill(4), g: new Float32Array(6).fill(100)}];
    langkah(S, B, pts, F, Date.UTC(2026, 9, 18), 0, 1, null);
    dekat(S.gmax[0], 100, 1e-4, "embusan interpolasi"); ok(S.gmax[1] === 0, "titik di luar medan diabaikan"); dekat(S.hujan[0], 4, 1e-4);
    const pita = [[10], [250], [400]].map(a => Float32Array.of(a[0], 0)), r = ringkas(pts, S, pita, []);
    ok(r.rumahAtap > 100 && r.genang[0] === 0 && r.genang[1] === 1000 && r.genang[2] === 1000, "pita p10 tidak tergenang, p50 dan p90 tergenang");
    /* gabungan ringkas() -> perlakuan() pada satu titik 3.900 jiwa (1.000 rumah) dengan embusan 75 km/jam: pohon tumbang 50%, atap 17,2% */
    const t1 = [{lat: 0, lon: 0, w: 3900, k: "p", elev: 100, lereng: 0}], S1 = baru(1, 1); S1.gmax[0] = 75;
    const r1 = ringkas(t1, S1, [Float32Array.of(0), Float32Array.of(0), Float32Array.of(0)], []), uang = {rr: 15e6, nyawa: 13.9e9, pengungsiHari: 35000};
    dekat(r1.rumahPohon, 500, 1e-2, "rumah di sel pohon tumbang = rumah x peluang pohon (bukan atap)"); dekat(r1.rumahAtap, 1000 * pAtap(75), 1e-6); dekat(r1.zonaPohon, 3900, 1e-9);
    const pg = perlakuan(r1, uang)[0]; dekat(pg.rumah, 500 * .3 * .5, 1e-2, "porsi pangkas dikalikan satu kali"); dekat(pg.manfaat, 75 * 15e6, 2e5, "manfaat = rumah terhindar x stimulan"); dekat(pg.biaya, 3900 * .01 * 250000, 1e-3);
    /* sensitivitas evakuasi: peluang meninggal 1e-5 vs 5e-4 menggeser manfaat/biaya 50x, jadi evakuasi tidak boleh diperingkat menurut angka itu */
    const rz = {...r1, zonaEvak: 500}, ev = perlakuan(rz, uang).find(x => x.nama.startsWith("Evakuasi")), pk = perlakuan(rz, uang).find(x => x.nama.startsWith("Pangkas"));
    ok(ev.bcr === null && ev.peringkat === false && pk.peringkat === true, "evakuasi tanpa bcr tunggal dan diurut di bawah yang bersumber");
    ok(ev.bcrTinggi / ev.bcrRendah > 100, `rentang evakuasi harus lebar: ${ev.bcrRendah}..${ev.bcrTinggi}`);
    dekat(ev.bcrRendah, 500 * .7 * 1e-5 * 13.9e9 / (500 * .7 * (3 * 35000 + 100000)), 1e-6, "batas rendah memakai evak_mati 1e-5 dan biaya tertinggi");
    ok(ev.tumpang === (pk.bcrRendah <= ev.bcrTinggi && ev.bcrRendah <= pk.bcrTinggi), "tanda tumpang konsisten dengan rentang");
    const tp = perlakuan(rz, {...uang, nyawaRendah: 6e9, nyawaTinggi: 15.7e9}).find(x => x.nama.startsWith("Evakuasi"));
    dekat(tp.bcrRendah / ev.bcrRendah, 6 / 13.9, 1e-9, "rentang ikut VSL rendah param_banjir"); dekat(tp.bcrTinggi / ev.bcrTinggi, 15.7 / 13.9, 1e-9);
    ok(perlakuan(rz, null).every(x => x.bcr == null && x.biaya == null && x.bcrRendah === undefined), "tanpa param uang: Rp tidak dikarang");
  }
  return {PARAM, KAPAL, phi, rapuh, pAtap, pPohon, scsQ, tergenang, dpPusat, dpDi, badai, jamKapal, mdpl, ubin, bobot, langkah, baru, petaAnsambel, hujanPita, ringkas, perlakuan, kapal, hariKe, tglWib, jarak, uji};
});
if (typeof process !== "undefined" && /sim_dampak\.js$/.test(process.argv[1] || "")) globalThis.SimDampak.uji(), console.log("sim_dampak: lolos");
