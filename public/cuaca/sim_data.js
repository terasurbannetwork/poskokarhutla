/* sim_data.js: medan cuaca per jam (cuaca_medan.json) jadi medan kontinu. Fungsi murni tanpa DOM:
   dimuat peramban (window.SimCuaca) dan node (`node public/cuaca/sim_data.js` menjalankan uji sendiri).
   Satuan keluaran: angin m/s, hujan mm/jam, embusan km/jam. Tidak ada data karangan: medan kosong = null. */
(function (root, buat) { root.SimCuaca = buat(); })(typeof self !== "undefined" ? self : globalThis, function () {
  const AMBANG = {hujan: [1, 5, 20, 50, 100], angin: [54, 72, 90], hs: [2.5, 4, 6]};
  /* skala warna: [batas bawah, r, g, b, alfa] */
  const RAMP_HUJAN = [[0.1, 120, 190, 235, .35], [1, 70, 150, 225, .5], [5, 40, 110, 205, .6], [20, 120, 70, 190, .7], [50, 200, 50, 150, .78], [100, 220, 30, 40, .85]];
  const RAMP_EMBUS = [[40, 250, 220, 90, .3], [54, 245, 170, 50, .55], [72, 235, 100, 40, .7], [90, 200, 30, 40, .82]];
  const RAMP_HS = [[0, 90, 190, 200], [1.25, 70, 150, 220], [2.5, 240, 190, 60], [4, 235, 100, 40], [6, 190, 30, 50]];

  function warna(ramp, v) { /* interpolasi linear antar titik skala: medan halus, bukan kotak kelas */
    if (!(v >= ramp[0][0])) return null;
    let i = 0; while (i < ramp.length - 1 && v >= ramp[i + 1][0]) i++;
    const a = ramp[i], b = ramp[i + 1]; if (!b) return a;
    const f = (v - a[0]) / (b[0] - a[0]); return [v, ...[1, 2, 3, 4].map(k => (a[k] ?? 1) + ((b[k] ?? 1) - (a[k] ?? 1)) * f)];
  }

  /* validasi bentuk berkas; kembalikan teks alasan atau null */
  function periksa(m) {
    if (!m || typeof m !== "object") return "berkas kosong";
    const {n, nx, ny} = m;
    if (!(n > 0 && nx > 1 && ny > 1)) return "ukuran grid tidak valid";
    for (const k of ["u", "v", "r", "g"]) {
      if (!Array.isArray(m[k]) || m[k].length < n) return `medan ${k} kurang dari ${n} jam`;
      if (!m[k][0] || m[k][0].length !== nx * ny) return `medan ${k} tidak sesuai grid ${nx} x ${ny}`;
    }
    return null;
  }

  /* kerangka waktu t (jam, pecahan, 0..n-1) -> medan Float32 dicampur linear antar dua jam. buf dipakai ulang. */
  function bingkai(m, t, buf) {
    const n = m.n, c = Math.max(0, Math.min(n - 1, t)), a = Math.floor(c), b = Math.min(n - 1, a + 1), f = c - a, N = m.nx * m.ny;
    const o = buf || {u: new Float32Array(N), v: new Float32Array(N), r: new Float32Array(N), g: new Float32Array(N)};
    const sk = {u: .1, v: .1, r: .1, g: 1}; /* dm/s -> m/s, 0,1 mm -> mm, km/j */
    for (const k of ["u", "v", "r", "g"]) {
      const A = m[k][a], B = m[k][b], O = o[k], s = sk[k];
      for (let i = 0; i < N; i++) O[i] = ((A[i] ?? 0) * (1 - f) + (B[i] ?? 0) * f) * s;
    }
    return o;
  }

  /* bilinear di (lon, lat); null di luar grid */
  function cuplik(m, arr, lon, lat) {
    const x = (lon - m.lon0) / m.d, y = (lat - m.lat0) / m.d;
    if (!(x >= 0 && y >= 0 && x <= m.nx - 1 && y <= m.ny - 1)) return null;
    const x0 = Math.min(m.nx - 2, Math.floor(x)), y0 = Math.min(m.ny - 2, Math.floor(y)), fx = x - x0, fy = y - y0, i = y0 * m.nx + x0;
    return (arr[i] * (1 - fx) + arr[i + 1] * fx) * (1 - fy) + (arr[i + m.nx] * (1 - fx) + arr[i + m.nx + 1] * fx) * fy;
  }

  /* tabel warna 256 langkah (RGBA) untuk satu skala: pencarian murah tanpa alokasi per piksel; indeks = nilai / vmaks * 255 */
  function lut(ramp, vmaks) {
    const t = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) { const k = warna(ramp, i / 255 * vmaks); if (k) { t[i * 4] = k[1]; t[i * 4 + 1] = k[2]; t[i * 4 + 2] = k[3]; t[i * 4 + 3] = Math.round(k[4] * 255); } }
    return {t, vmaks, min: ramp[0][0]};
  }
  const TAB_HUJAN = lut(RAMP_HUJAN, 120), TAB_EMBUS = lut(RAMP_EMBUS, 130);
  /* gambar nilai ke piksel RGBA (ukuran grid x skala): bilinear nilai, lalu warna dari tabel */
  function lukis(m, arr, tab, skala, data) {
    const W = (m.nx - 1) * skala + 1, H = (m.ny - 1) * skala + 1, T = tab.t, f = 255 / tab.vmaks;
    for (let py = 0; py < H; py++) {
      const lat = m.lat0 + (H - 1 - py) / skala * m.d;
      for (let px = 0; px < W; px++) {
        const v = cuplik(m, arr, m.lon0 + px / skala * m.d, lat), o = (py * W + px) * 4;
        if (v == null || v < tab.min) { data[o + 3] = 0; continue; }
        const k = (v >= tab.vmaks ? 255 : Math.max(1, Math.round(v * f))) * 4; /* indeks minimal 1: 0,1-0,23 mm/jam tidak transparan */ data[o] = T[k]; data[o + 1] = T[k + 1]; data[o + 2] = T[k + 2]; data[o + 3] = T[k + 3];
      }
    }
    return [W, H];
  }

  /* ringkas satu bingkai: maksimum nasional */
  function ringkas(fr) {
    let r = 0, g = 0, w = 0;
    for (let i = 0; i < fr.r.length; i++) { if (fr.r[i] > r) r = fr.r[i]; if (fr.g[i] > g) g = fr.g[i]; const s = Math.hypot(fr.u[i], fr.v[i]); if (s > w) w = s; }
    return {hujan: r, embus: g, angin: w};
  }

  /* lingkaran geografis (polygon GeoJSON) radius km, untuk kerucut ketidakpastian siklon */
  function lingkaran(lat, lon, km, sisi) {
    const p = [], dl = km / 111.32, dn = km / (111.32 * Math.cos(lat * Math.PI / 180));
    for (let i = 0; i <= (sisi || 48); i++) { const a = i / (sisi || 48) * 2 * Math.PI; p.push([lon + dn * Math.cos(a), lat + dl * Math.sin(a)]); }
    return p;
  }

  /* ---------- sel hujan lebat: deteksi per jam pada medan yang diinterpolasi, lacak antar jam ---------- */
  const KMD = 111.32, rad = Math.PI / 180;
  function jarak(la1, lo1, la2, lo2) { const x = (lo2 - lo1) * Math.cos((la1 + la2) / 2 * rad), y = la2 - la1; return Math.hypot(x, y) * KMD; }
  /* arr = hujan mm/jam satu jam (grid asli). Komponen terhubung dari piksel >= ambang pada grid 3x lebih halus. */
  function sel(m, arr, ambang, up) {
    up = up || 3; const W = (m.nx - 1) * up + 1, H = (m.ny - 1) * up + 1, v = new Float32Array(W * H), tanda = new Uint8Array(W * H), out = [], st = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) v[y * W + x] = cuplik(m, arr, m.lon0 + x / up * m.d, m.lat0 + y / up * m.d);
    for (let i0 = 0; i0 < v.length; i0++) {
      if (tanda[i0] || v[i0] < ambang) continue;
      let sw = 0, sx = 0, sy = 0, pk = 0, n = 0, luas = 0; st.length = 0; st.push(i0); tanda[i0] = 1;
      while (st.length) {
        const i = st.pop(), x = i % W, y = (i - x) / W, w = v[i], la = m.lat0 + y / up * m.d;
        sw += w; sx += w * x; sy += w * y; n++; if (w > pk) pk = w; luas += (m.d / up * KMD) ** 2 * Math.cos(la * rad);
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && !tanda[j] && v[j] >= ambang) { tanda[j] = 1; st.push(j); }
      }
      out.push({lat: m.lat0 + sy / sw / up * m.d, lon: m.lon0 + sx / sw / up * m.d, pk, luas});
    }
    return out;
  }
  /* satu jalur = sel yang sama dari jam ke jam: pasangan terdekat dalam batas km (serakah, terdekat dulu) */
  function lacak(perJam, maks) {
    maks = maks || 150; const jalur = [], hidup = [];
    perJam.forEach((cs, h) => {
      const pas = []; hidup.forEach((j, ji) => { cs.forEach((c, ci) => { const d = jarak(j.pts[j.pts.length - 1].lat, j.pts[j.pts.length - 1].lon, c.lat, c.lon); if (d <= maks) pas.push([d, ji, ci]); }); });
      pas.sort((a, b) => a[0] - b[0]); const pj = new Set(), pc = new Set(), baru = [];
      for (const [, ji, ci] of pas) { if (pj.has(ji) || pc.has(ci)) continue; pj.add(ji); pc.add(ci); hidup[ji].pts.push({h, ...cs[ci]}); baru.push(hidup[ji]); }
      cs.forEach((c, ci) => { if (!pc.has(ci)) { const j = {id: jalur.length, pts: [{h, ...c}]}; jalur.push(j); baru.push(j); } });
      hidup.length = 0; hidup.push(...baru);
    });
    return jalur;
  }
  /* posisi dan intensitas satu jalur pada jam pecahan t; null bila di luar umurnya */
  function jalurPada(j, t) {
    const p = j.pts, a = p[0].h, z = p[p.length - 1].h;
    if (p.length === 1) return Math.abs(t - a) <= .5 ? {...p[0], u: 1 - Math.abs(t - a) * 2 * .6} : null;
    if (t < a || t > z) return null;
    let i = 0; while (i < p.length - 2 && p[i + 1].h < t) i++;
    const A = p[i], B = p[i + 1], f = (t - A.h) / (B.h - A.h || 1), mix = k => A[k] + (B[k] - A[k]) * f;
    return {lat: mix("lat"), lon: mix("lon"), pk: mix("pk"), luas: mix("luas"), u: 1};
  }

  /* ---------- siklon: profil angin Holland (1980) ---------- */
  const HOLLAND_B = 1.5, MASUK = 20 * rad, KT = 0.514444;
  /* angin permukaan (m/s) pada jarak r km dari pusat: V = Vmaks * sqrt((Rm/r)^B * exp(1 - (Rm/r)^B)) */
  function holland(r, vmaks, rmaks) { if (r < 1) return 0; const q = Math.pow(rmaks / r, HOLLAND_B); return vmaks * Math.sqrt(q * Math.exp(1 - q)); }
  /* vektor angin (u timur, v utara; m/s) di (lat, lon) oleh pusar di (pla, plo): berputar melawan jarum jam di utara ekuator, searah di selatan, miring masuk 20 derajat */
  function anginSiklon(lat, lon, pla, plo, vmaks, rmaks) {
    const dx = (lon - plo) * Math.cos((lat + pla) / 2 * rad) * KMD, dy = (lat - pla) * KMD, r = Math.hypot(dx, dy); if (r < 1) return [0, 0];
    const V = holland(r, vmaks, rmaks), s = pla >= 0 ? 1 : -1, tx = -s * dy / r, ty = s * dx / r, ix = -dx / r, iy = -dy / r;
    return [V * (Math.cos(MASUK) * tx + Math.sin(MASUK) * ix), V * (Math.cos(MASUK) * ty + Math.sin(MASUK) * iy)];
  }
  /* siklon nyata: prakiraan kisi sudah memuat siklon di tempat aslinya, jadi yang ditambahkan hanya selisih
     Holland(lintasan geser) - Holland(lintasan asli). Tanpa geser selisihnya nol. asli = null (siklon pengandaian): ditambah penuh. */
  function anginSelisih(lat, lon, rmaks, pla, plo, pv, ala, alo, av) {
    const a = anginSiklon(lat, lon, pla, plo, pv, rmaks); if (ala == null) return a;
    const b = anginSiklon(lat, lon, ala, alo, av, rmaks); return [a[0] - b[0], a[1] - b[1]];
  }
  /* jarak (km) tempat angin Holland turun ke v (m/s); null bila Vmaks < v */
  function radiusAngin(v, vmaks, rmaks) { if (vmaks < v) return null; let lo = rmaks, hi = rmaks * 60; if (holland(hi, vmaks, rmaks) > v) return hi;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; holland(mid, vmaks, rmaks) > v ? lo = mid : hi = mid; } return lo; }
  /* tinggi gelombang batas atas laut berkembang penuh (Pierson-Moskowitz, 1964): Hs = 0,21 U^2 / g */
  const hsPenuh = u => 0.21 * u * u / 9.81;

  /* ---------- status sarana per jam (0 Buka, 1 Terganggu, 2 Tutup) ---------- */
  /* HIPOTESIS, belum disetel ke kejadian nyata dan tanpa sumber resmi yang bisa dicek. Pelabuhan: Terganggu gelombang 1,5 m / angin 16 knot, Tutup 2,5 m / 21 knot. */
  const PELABUHAN = {terganggu: {hs: 1.5, kt: 16}, tutup: {hs: 2.5, kt: 21}}, NELAYAN = {hs: 1.25, kt: 15};
  function statusPelabuhan(hs, kt) {
    const a = PELABUHAN.tutup, b = PELABUHAN.terganggu;
    if ((hs != null && hs >= a.hs) || (kt != null && kt >= a.kt)) return 2;
    return (hs != null && hs >= b.hs) || (kt != null && kt >= b.kt) ? 1 : 0;
  }
  /* HIPOTESIS kami: embusan 54 km/jam Terganggu, 72 km/jam Tutup, hujan 10 mm/jam Terganggu. Embusan dipakai utuh, bukan komponen melintang landasan (arah landasan tak ada di berkas). */
  const BANDARA = {terganggu: {g: 54, r: 10}, tutup: {g: 72}};
  function statusBandara(g, r) { return g >= BANDARA.tutup.g ? 2 : g >= BANDARA.terganggu.g || r >= BANDARA.terganggu.r ? 1 : 0; }
  const berisikoNelayan = (hs, kt) => (hs != null && hs >= NELAYAN.hs) || (kt != null && kt >= NELAYAN.kt);
  /* ringkas deret status: jam mulai terganggu, lama terganggu (jam, termasuk tutup), jam mulai tutup, lama tutup */
  function ringkasStatus(s) {
    const o = {mulai: -1, lama: 0, tMulai: -1, tLama: 0};
    s.forEach((v, h) => { if (v >= 1) { o.lama++; if (o.mulai < 0) o.mulai = h; } if (v === 2) { o.tLama++; if (o.tMulai < 0) o.tMulai = h; } });
    return o;
  }
  /* perlakuan: jam di mana sarana ditutup/ditunda = jam berstatus >= 1, diperlebar penyangga jam di depan */
  function jamTutup(s, depan) { const o = new Uint8Array(s.length); s.forEach((v, h) => { if (v >= 1) for (let k = Math.max(0, h - depan); k <= h; k++) o[k] = 1; }); return o; }

  function uji() {
    const assert = {strictEqual: (a, b, m) => { if (a !== b) throw new Error(m || `${a} != ${b}`); }, ok: (a, m) => { if (!a) throw new Error(m || "gagal"); }}, nx = 3, ny = 2;
    const m = {n: 2, nx, ny, lat0: -1, lon0: 100, d: 1.5, u: [[10, 10, 10, 10, 10, 10], [30, 30, 30, 30, 30, 30]], v: [new Array(6).fill(0), new Array(6).fill(0)],
      r: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 500]], g: [new Array(6).fill(60), new Array(6).fill(100)]};
    assert.strictEqual(periksa(m), null);
    assert.ok(periksa({...m, nx: 4}), "grid salah harus ditolak");
    const f = bingkai(m, .5), ps = {u: f.u[0], r: bingkai(m, 1).r[5]};
    assert.ok(Math.abs(ps.u - 2) < 1e-6, "u: 10 dm/s dan 30 dm/s di tengah = 2 m/s");
    assert.ok(Math.abs(ps.r - 50) < 1e-6, "r: 500 x 0,1 = 50 mm");
    assert.strictEqual(cuplik(m, f.g, 99, -1), null, "di luar grid = null");
    assert.ok(Math.abs(cuplik(m, f.g, 101.5, -0.25) - 80) < 1e-6, "embusan campuran 60 dan 100 = 80");
    assert.strictEqual(warna(RAMP_HUJAN, 0.05), null);
    assert.ok(Math.abs(warna(RAMP_HUJAN, 75)[1] - (200 + (220 - 200) * .5)) < 1e-9, "interpolasi warna antar 50 dan 100");
    /* sel dan jalur: satu gumpalan 6 mm/jam bergeser satu sel per jam */
    const mm = {n: 3, nx: 5, ny: 4, lat0: 0, lon0: 100, d: 1.5, u: [], v: [], r: [], g: []}, buat = x => { const a = new Float32Array(20); a[1 * 5 + x] = 150; return a; };
    const pj = [0, 1, 2].map(h => sel(mm, buat(h + 1).map(v => v * .1), 10));
    assert.ok(pj.every(c => c.length === 1 && Math.abs(c[0].pk - 15) < 1e-6), "satu sel 15 mm/jam tiap jam");
    const jl = lacak(pj, 300); assert.strictEqual(jl.length, 1, "tiga jam, satu jalur"); assert.strictEqual(jl[0].pts.length, 3);
    assert.ok(Math.abs(jalurPada(jl[0], 0.5).lon - 102.25) < 0.3, "interpolasi posisi antar jam");
    assert.strictEqual(jalurPada(jl[0], 2.6), null, "di luar umur jalur");
    assert.strictEqual(sel(mm, buat(1).map(v => v * .1), 20).length, 0, "di bawah ambang");
    /* Holland: puncak di Rmaks sama dengan Vmaks, turun di luarnya; arah putar utara melawan jarum jam */
    assert.ok(Math.abs(holland(40, 60, 40) - 60) < 1e-9, "V(Rmaks)=Vmaks");
    assert.ok(holland(400, 60, 40) < 25 && holland(400, 60, 40) > 0, "turun di luar Rmaks");
    const w = anginSiklon(5, 100.36, 5, 100, 50, 40); assert.ok(w[1] > 0, "di timur pusat belahan utara: angin ke utara (melawan jarum jam)");
    const ws = anginSiklon(-5, 100.36, -5, 100, 50, 40); assert.ok(ws[1] < 0, "belahan selatan: searah jarum jam");
    const r34 = radiusAngin(17.5, 60, 40); assert.ok(Math.abs(holland(r34, 60, 40) - 17.5) < .01, "radius 34 kt");
    assert.strictEqual(radiusAngin(70, 60, 40), null);
    const nolw = anginSelisih(6, 101, 40, 5, 100, 50, 5, 100, 50); assert.ok(nolw[0] === 0 && nolw[1] === 0, "tanpa geser: selisih nol, medan kisi persis");
    const pen = anginSelisih(6, 101, 40, 5, 100, 50, null), dir = anginSiklon(6, 101, 5, 100, 50, 40); assert.ok(pen[0] === dir[0] && pen[1] === dir[1], "pengandaian ditambah penuh");
    const geser = anginSelisih(6, 101, 40, 6, 101.3, 50, 5, 100, 50); assert.ok(Math.hypot(...geser) > 0, "geser mengubah angin");
    const tb = lut(RAMP_HUJAN, 120), pk = new Uint8ClampedArray(4 * 8), mk = {nx: 2, ny: 2, lat0: 0, lon0: 0, d: 1}; lukis(mk, [0, 0, 60, 60], tb, 1, pk);
    assert.ok(pk[11] === 0 && pk[3] > 150, "lukis dengan tabel: kosong di 0 mm, berwarna di 60 mm");
    /* status */
    assert.strictEqual(statusPelabuhan(1.0, 10), 0); assert.strictEqual(statusPelabuhan(1.6, 10), 1); assert.strictEqual(statusPelabuhan(2.5, 5), 2); assert.strictEqual(statusPelabuhan(null, 22), 2);
    assert.strictEqual(statusBandara(40, 3), 0); assert.strictEqual(statusBandara(40, 12), 1); assert.strictEqual(statusBandara(80, 0), 2);
    const rs = ringkasStatus([0, 1, 2, 2, 1, 0]); assert.ok(rs.mulai === 1 && rs.lama === 4 && rs.tMulai === 2 && rs.tLama === 2, "ringkas status");
    assert.strictEqual(jamTutup(Int8Array.of(0, 0, 0, 1, 0), 2).join(""), "01110", "penyangga 2 jam di depan");
    console.log("sim_data: lolos");
  }

  return {AMBANG, RAMP_HUJAN, RAMP_EMBUS, RAMP_HS, warna, periksa, bingkai, cuplik, lukis, ringkas, lingkaran, lut, TAB_HUJAN, TAB_EMBUS, anginSelisih, jarak, sel, lacak, jalurPada, holland, anginSiklon, radiusAngin, hsPenuh, KT, PELABUHAN, NELAYAN, BANDARA, statusPelabuhan, statusBandara, berisikoNelayan, ringkasStatus, jamTutup, uji};
});
if (typeof process !== "undefined" && /sim_data\.js$/.test(process.argv[1] || "")) globalThis.SimCuaca.uji();
