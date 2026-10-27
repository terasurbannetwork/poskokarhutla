/* Kartu "Satelit berikutnya di <wilayah>" di panel wilayah halaman karhutla (keputusan pemilik 16 Okt 2026,
   docs/multi-bencana/RENCANA-20-JAM.md §6 butir 7).
   - Elemen orbit dibaca dari data/tle.json (scripts/data/tle.py, CelesTrak GP, harian). Lebar sapuan dan jeda data tiap satelit
     DIBACA dari JSON itu; tidak ada angka satelit di berkas ini.
   - Lintasan dihitung di peramban dengan satellite.js (SGP4), dipatok ke versi tepat dari cdnjs dengan SRI. Pustaka dan tle.json baru
     diambil saat wilayah pertama kali dipilih, bukan saat halaman dibuka.
   - Jejak nadir 36 jam (langkah 30 detik) dihitung SEKALI per satelit, dalam irisan <= IRISAN titik dengan jeda di antaranya (tak ada
     tugas panjang di HP lambat), dan dipakai ulang untuk semua wilayah (disegarkan tiap 6 jam); per wilayah cukup memindai jarak.
   - Lintasan = minimum lokal jarak nadir ke pusat kotak batas fitur anak yang sama dengan yang dipakai peta untuk fitBounds wilayah
     terpilih (jam "Lewat"), R = jarak pusat ke sudut terjauh. Cakupan diuji ke geometri sungguhan: simpul batas (selubung cembung +
     cuplikan) yang jaraknya ke jalur nadir sepanjang lintasan <= setengah sapuan. Semua = "seluruh", sebagian = "sebagian",
     tidak ada = lintasan dibuang.
   - kartu() sinkron (dipanggil renderDaftar yang sering jalan): HTML penuh bila sudah ada di cache, kalau belum placeholder tersembunyi
     [data-lintas] yang diisi begitu hitungan selesai. Kerja berat lewat nanti() (rAF + idle) dan irisan ber-await, bukan di handler klik.
   - Galat GLOBAL (pustaka/tle.json gagal atau basi) mematikan kartu untuk sesi: satu console.warn, tanpa galat di layar. Galat satu
     wilayah (geometri kosong, tak ada lintasan) hanya membuang kartu wilayah itu (di-cache sebagai kosong).
   Bahasa Indonesia; EN lewat i18n/en.json (kalimat jam lewat pola, nama satelit/jam translate=no). */
(function (g) {
  "use strict";
  var PUSTAKA = "https://cdnjs.cloudflare.com/ajax/libs/satellite.js/6.0.2/satellite.min.js";
  var SRI = "sha512-mA2o3mzi5hDUPRwVbBTancxx7y12LwOdODA1rPMov8syYjV657AJWZhq9JYyLO1JbUsXYsrwJn/t070HiocdiQ==";
  var DATA = "data/tle.json";
  var HORIZON_JAM = 36, LANGKAH_DTK = 30, SEGAR_MS = 6 * 36e5, IRISAN = 500, SIMPUL_CUPLIK = 400, USIA_MAKS_MS = 14 * 864e5, BARIS = 5, BUMI_KM = 6371.0088, WIB_MS = 7 * 36e5;
  var G = {gagal: false, peringatan: false, pustaka: null, tle: null, jejak: null, hasil: new Map(), menunggu: new Set(), bbox: new WeakMap()};

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var rad = function (d) { return d * Math.PI / 180; };
  /* jeda antar irisan: scheduler.yield bila ada (input didahulukan, tanpa batas bawah timer), kalau tidak setTimeout */
  var tidur = function () { return g.scheduler && typeof g.scheduler.yield === "function" ? g.scheduler.yield() : new Promise(function (ok) { setTimeout(ok, 0); }); };

  /* ---------- hitungan murni (diuji dari node) */
  function jarakKm(lat1, lon1, lat2, lon2) {   // semua radian, lingkaran besar
    var a = Math.pow(Math.sin((lat2 - lat1) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2);
    return 2 * BUMI_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  /* kotak batas semua fitur (derajat, [lon, lat]) -> pusat kotak dan R = jarak pusat ke sudut terjauh (km) */
  function pusatKotak(fitur) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    var jalan = function (c) { if (typeof c[0] === "number") { if (c[0] < b[0]) b[0] = c[0]; if (c[1] < b[1]) b[1] = c[1]; if (c[0] > b[2]) b[2] = c[0]; if (c[1] > b[3]) b[3] = c[1]; } else for (var i = 0; i < c.length; i++) jalan(c[i]); };
    for (var i = 0; i < fitur.length; i++) if (fitur[i].geometry) jalan(fitur[i].geometry.coordinates);
    if (!isFinite(b[0])) return null;
    var lon = (b[0] + b[2]) / 2, lat = (b[1] + b[3]) / 2, R = 0;
    [[b[0], b[1]], [b[0], b[3]], [b[2], b[1]], [b[2], b[3]]].forEach(function (s) { R = Math.max(R, jarakKm(rad(lat), rad(lon), rad(s[1]), rad(s[0]))); });
    return {lat: lat, lon: lon, R: R};
  }
  /* jejak nadir satu satelit: n titik mulai t0 (ms) tiap langkah detik; lat/lon radian geodetik, NaN bila SGP4 gagal.
     isiJejak mengisi irisan [dari, sampai) supaya pemanggil bisa memberi jeda; buatJejak = versi sinkron (uji node) */
  function isiJejak(sat, rec, t0, langkahDtk, lat, lon, dari, sampai) {
    for (var i = dari; i < sampai; i++) {
      var d = new Date(t0 + i * langkahDtk * 1000), pv = sat.propagate(rec, d);
      if (!pv || !pv.position || typeof pv.position !== "object") { lat[i] = lon[i] = NaN; continue; }
      var ge = sat.eciToGeodetic(pv.position, sat.gstime(d));
      lat[i] = ge.latitude; lon[i] = ge.longitude;
    }
  }
  function buatJejak(sat, entri, t0, langkahDtk, n) {
    var rec = sat.twoline2satrec(entri.tle[0], entri.tle[1]), lat = new Float64Array(n), lon = new Float64Array(n);
    isiJejak(sat, rec, t0, langkahDtk, lat, lon, 0, n);
    return {lat: lat, lon: lon};
  }
  async function buatJejakBertahap(sat, entri, t0, langkahDtk, n) {
    var rec = sat.twoline2satrec(entri.tle[0], entri.tle[1]), lat = new Float64Array(n), lon = new Float64Array(n);
    for (var a = 0; a < n; a += IRISAN) { if (a) await tidur(); isiJejak(sat, rec, t0, langkahDtk, lat, lon, a, Math.min(n, a + IRISAN)); }
    return {lat: lat, lon: lon};
  }
  /* lintasan = minimum lokal jarak nadir-titik (interpolasi parabola 3 sampel) <= ambang, waktunya >= dariMs; i = indeks sampel terdekat, lo..hi = jendela sampel jejak di sekitarnya */
  function cariLintasan(jej, t0, langkahDtk, titik, ambangKm, dariMs) {
    var n = jej.lat.length, d = new Float64Array(n), plat = rad(titik.lat), plon = rad(titik.lon), out = [], L = langkahDtk * 1000;
    for (var i = 0; i < n; i++) d[i] = jarakKm(plat, plon, jej.lat[i], jej.lon[i]);
    for (i = 1; i < n - 1; i++) {
      if (!(d[i] <= d[i - 1] && d[i] < d[i + 1]) || d[i] > ambangKm) continue;
      var pen = d[i - 1] - 2 * d[i] + d[i + 1], off = pen > 0 ? 0.5 * (d[i - 1] - d[i + 1]) / pen : 0;
      if (!(off >= -0.5 && off <= 0.5)) off = 0;
      var ms = t0 + i * L + off * L, jr = d[i] - 0.25 * (d[i - 1] - d[i + 1]) * off;
      if (ms < dariMs) continue;
      var lo = i, hi = i;   // jendela sampel yang bisa menyentuh wilayah (<= ambang) + satu sampel di tiap ujung
      while (lo > 0 && d[lo - 1] <= ambangKm) lo--; if (lo > 0) lo--;
      while (hi < n - 1 && d[hi + 1] <= ambangKm) hi++; if (hi < n - 1) hi++;
      out.push({ms: ms, jarak: Math.max(0, jr), i: i, lo: lo, hi: hi});
    }
    return out;
  }
  /* ---------- cakupan: uji ke geometri wilayah sungguhan */
  /* simpul batas wilayah (derajat) -> vektor satuan: seluruh simpul selubung cembung (jaraknya terjauh dari jalur) + cuplikan merata */
  function selubung(xs, ys) {   // indeks simpul selubung cembung (Andrew), setelah menyaring simpul di dalam segi delapan ekstrem
    var n = xs.length, i, k, e = [0, 0, 0, 0, 0, 0, 0, 0], best = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
    var skor = function (j, x, y) { return j === 0 ? x : j === 1 ? x + y : j === 2 ? y : j === 3 ? y - x : j === 4 ? -x : j === 5 ? -x - y : j === 6 ? -y : x - y; };   // E, NE, N, NW, W, SW, S, SE (berlawanan jarum jam)
    for (i = 0; i < n; i++) for (k = 0; k < 8; k++) { var v = skor(k, xs[i], ys[i]); if (v > best[k]) { best[k] = v; e[k] = i; } }
    var keep = [];
    for (i = 0; i < n; i++) {
      var dalam = true;
      for (k = 0; k < 8 && dalam; k++) {
        var a = e[k], b = e[(k + 1) % 8];
        if (!((xs[b] - xs[a]) * (ys[i] - ys[a]) - (ys[b] - ys[a]) * (xs[i] - xs[a]) > 0)) dalam = false;
      }
      if (!dalam) keep.push(i);
    }
    keep.sort(function (p, q) { return xs[p] - xs[q] || ys[p] - ys[q]; });
    var cr = function (o, p, q) { return (xs[p] - xs[o]) * (ys[q] - ys[o]) - (ys[p] - ys[o]) * (xs[q] - xs[o]); }, h = [];
    for (i = 0; i < keep.length; i++) { while (h.length >= 2 && cr(h[h.length - 2], h[h.length - 1], keep[i]) <= 0) h.pop(); h.push(keep[i]); }
    for (i = keep.length - 2, k = h.length + 1; i >= 0; i--) { while (h.length >= k && cr(h[h.length - 2], h[h.length - 1], keep[i]) <= 0) h.pop(); h.push(keep[i]); }
    h.pop();
    return h;
  }
  function simpulWilayah(fitur) {
    var xs = [], ys = [], i;
    var jalan = function (c) { if (typeof c[0] === "number") { xs.push(c[0]); ys.push(c[1]); } else for (var j = 0; j < c.length; j++) jalan(c[j]); };
    for (i = 0; i < fitur.length; i++) if (fitur[i].geometry) jalan(fitur[i].geometry.coordinates);
    var n = xs.length; if (!n) return null;
    var pilih = new Set(), langkah = Math.max(1, Math.ceil(n / SIMPUL_CUPLIK));
    if (n <= SIMPUL_CUPLIK) for (i = 0; i < n; i++) pilih.add(i);
    else { for (i = 0; i < n; i += langkah) pilih.add(i); selubung(xs, ys).forEach(function (j) { pilih.add(j); }); }
    var m = pilih.size, x = new Float64Array(m), y = new Float64Array(m), z = new Float64Array(m), k = 0;
    pilih.forEach(function (j) { var la = rad(ys[j]), lo = rad(xs[j]), c = Math.cos(la); x[k] = c * Math.cos(lo); y[k] = c * Math.sin(lo); z[k] = Math.sin(la); k++; });
    return {n: m, x: x, y: y, z: z};
  }
  /* berapa simpul wilayah yang berjarak <= setengahKm dari jalur nadir (sampel lo..hi jejak): jarak terdekat ke jalur = maksimum hasil kali titik */
  function hitungCakupan(jej, lo, hi, simpul, setengahKm, tengah) {
    var sx = [], sy = [], sz = [], k, v, s, dalam = 0, cosA = Math.cos(setengahKm / BUMI_KM);
    var tambah = function (k) {   // sampel diurut dari tengah ke ujung jendela: simpul di dalam jalur biasanya ketemu di sampel pertama
      if (k < lo || k > hi || !(jej.lat[k] === jej.lat[k])) return;
      var c = Math.cos(jej.lat[k]); sx.push(c * Math.cos(jej.lon[k])); sy.push(c * Math.sin(jej.lon[k])); sz.push(Math.sin(jej.lat[k]));
    };
    for (k = 0; tengah - k >= lo || tengah + k <= hi; k++) { tambah(tengah - k); if (k) tambah(tengah + k); }
    for (v = 0; v < simpul.n; v++) {
      for (s = 0; s < sx.length; s++) if (simpul.x[v] * sx[s] + simpul.y[v] * sy[s] + simpul.z[v] * sz[s] >= cosA) { dalam++; break; }
    }
    return {dalam: dalam, total: simpul.n};
  }
  /* titik acuan wilayah: pusat kotak + R (untuk mendeteksi lintasan) dan simpul batas (untuk cakupan) */
  function titikDari(fitur) {
    var b = pusatKotak(fitur), s = b && simpulWilayah(fitur);
    if (!b || !s) return null;
    b.simpul = s;
    return b;
  }
  /* satu satelit -> lintasan di sekitar wilayah: {ms, nama, sensor, jarak, cakup: "seluruh"|"sebagian", data}; tanpa satu simpul pun di jalur = dibuang */
  function satKeLintasan(hasil, e, j, titik, dariMs) {
    cariLintasan(j.jej, j.t0, LANGKAH_DTK, titik, e.setengah_sapuan_km + titik.R, dariMs).forEach(function (p) {
      var c = hitungCakupan(j.jej, p.lo, p.hi, titik.simpul, e.setengah_sapuan_km, p.i);
      if (!c.dalam) return;
      hasil.push({ms: p.ms, nama: e.nama, sensor: e.sensor, jarak: p.jarak, cakup: c.dalam === c.total ? "seluruh" : "sebagian", data: p.ms + e.jeda_data_menit * 6e4});
    });
  }
  var urutWaktu = function (a, b) { return a.ms - b.ms; };
  /* semua satelit dalam tle.json -> lintasan terurut waktu (sinkron, uji node) */
  function hitungSemua(sat, tle, titik, sekarangMs) {
    var n = HORIZON_JAM * 3600 / LANGKAH_DTK + 1, hasil = [];
    tle.satelit.forEach(function (e) { satKeLintasan(hasil, e, {t0: sekarangMs, jej: buatJejak(sat, e, sekarangMs, LANGKAH_DTK, n)}, titik, sekarangMs); });
    return hasil.sort(urutWaktu);
  }

  /* ---------- format (WIB) */
  var dua = function (x) { return (x < 10 ? "0" : "") + x; };
  function jam(ms) { var d = new Date(ms + WIB_MS); return dua(d.getUTCHours()) + "." + dua(d.getUTCMinutes()); }
  var hariKe = function (ms) { return Math.floor((ms + WIB_MS) / 864e5); };
  /* penanda hari relatif ke sekarang: "" (hari ini), "besok", "lusa", atau nama hari singkat */
  function penanda(ms, now) {
    var s = hariKe(ms) - hariKe(now);
    if (s <= 0) return ""; if (s === 1) return "besok"; if (s === 2) return "lusa";
    return new Date(ms).toLocaleDateString("id-ID", {weekday: "short", timeZone: "Asia/Jakarta"});
  }
  var kataHari = function (p) { return p === "besok" || p === "lusa" ? "<span>" + p + "</span> " : p ? '<span translate="no">' + esc(p) + "</span> " : ""; };
  var teksJam = function (ms, now) { var p = penanda(ms, now); return (p ? p + " " : "") + jam(ms); };
  var celJam = function (ms, now) { return kataHari(penanda(ms, now)) + "<b>" + jam(ms) + "</b>"; };
  var angkaJam = function (menit) { return (menit / 60).toLocaleString("id-ID", {maximumFractionDigits: 1}); };

  /* ---------- kartu */
  var IKON = '<svg class="as-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 7-3 3 4 4 3-3zM9 11 5 7l2-2 4 4M15 13l4 4-2 2-4-4"/><path d="M4 20a8 8 0 0 0 8-8"/></svg>';
  function namaWilayah() {
    var j = S.jalur || [];   // S, nama, nanti: const di skrip inline index.html (bukan properti window), terbaca sebagai lingkup global
    return j.length === 1 ? (typeof namaProv === "function" ? namaProv(j[0]) : j[0]) : j[j.length - 1];
  }
  function htmlKartu(h) {
    if (!h || h.kosong) return "";
    var now = Date.now(), daftar = h.lintas.filter(function (p) { return p.ms > now; }).slice(0, BARIS);
    if (!daftar.length) return "";
    var a = daftar[0], sensor = [], jeda = {}, epoch = Infinity;
    h.satelit.forEach(function (e) { if (!(e.sensor in jeda)) { jeda[e.sensor] = e.jeda_data_menit; sensor.push(e.sensor); } epoch = Math.min(epoch, Date.parse(e.epoch)); });
    var bln = new Date(epoch).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
    var baris = daftar.map(function (p) {
      return "<tr><td>" + celJam(p.ms, now) + '</td><td translate="no">' + esc(p.nama) + "</td><td><span>" + p.cakup + "</span></td><td>" + celJam(p.data, now) + "</td></tr>";
    }).join("");
    return '<div class="asap-k lintas-k kotak-p"><div class="lbl"><span style="font-weight:700;color:var(--ink)">' + IKON + "Satelit berikutnya di " +
      '<span translate="no">' + esc(namaWilayah()) + "</span></span></div>" +
      "<div>" + esc(a.nama) + " lewat " + teksJam(a.ms, now) + " WIB, data biasanya siap " + teksJam(a.data, now) + " WIB.</div>" +
      '<table style="table-layout:auto"><tr><td title="Jam satelit paling dekat ke tengah kotak batas wilayah">Lewat (WIB)</td><td>Satelit</td>' +
      '<td title="seluruh: semua batas wilayah ada di dalam jalur sapuan; sebagian: hanya sebagian wilayah tersapu">Cakupan</td>' +
      '<td title="Perkiraan data satelit sudah bisa diambil (jam lewat + jeda aman)">Data siap (WIB)</td></tr>' +
      baris + "</table>" +
      '<div style="margin-top:6px;font-size:10.5px"><span>Sumber: elemen orbit CelesTrak (epoch tertua</span> <span translate="no">' + esc(bln + " " + jam(epoch)) +
      " WIB</span><span>), dihitung di peramban</span> · <span>jeda aman</span> " +
      sensor.map(function (s) { return "<span>" + esc(s) + " " + angkaJam(jeda[s]) + " jam</span>"; }).join(", ") +
      " <span>(diukur 27 Okt 2026); bisa lebih lama bila satelit telat.</span></div></div>";
  }

  /* ---------- muat malas */
  function peringatkan(e) {   // galat GLOBAL: kartu mati untuk sisa sesi
    G.gagal = true;
    if (!G.peringatan) { G.peringatan = true; console.warn("Satelit berikutnya: kartu tidak ditampilkan:", e && e.message || e); }
    document.querySelectorAll("[data-lintas]").forEach(function (el) { el.remove(); });
  }
  var lokal = function (pesan) { var e = new Error(pesan); e.lokal = true; return e; };   // galat satu wilayah: hanya kartu wilayah itu yang hilang
  function muatPustaka() {
    if (g.satellite && g.satellite.propagate) return Promise.resolve(g.satellite);
    return G.pustaka || (G.pustaka = new Promise(function (ok, no) {
      var s = document.createElement("script");
      s.src = PUSTAKA; s.integrity = SRI; s.crossOrigin = "anonymous";
      s.onload = function () { g.satellite && g.satellite.propagate && g.satellite.twoline2satrec && g.satellite.gstime && g.satellite.eciToGeodetic ? ok(g.satellite) : no(new Error("satellite.js tidak lengkap")); };
      s.onerror = function () { no(new Error("satellite.js gagal dimuat")); };
      document.head.appendChild(s);
    }));
  }
  function muatTle() {
    return G.tle || (G.tle = fetch(DATA, {cache: "no-cache"}).then(function (r) { if (!r.ok) throw new Error(DATA + " " + r.status); return r.json(); }).then(function (d) {
      var sekarang = Date.now(), ok = (d.satelit || []).filter(function (e) {
        return e && e.tle && e.tle.length === 2 && e.setengah_sapuan_km > 0 && e.jeda_data_menit >= 0 && sekarang - Date.parse(e.epoch) <= USIA_MAKS_MS;
      });
      if (!ok.length) throw new Error("elemen orbit kosong atau lebih tua dari 14 hari");
      return {satelit: ok};
    }));
  }
  /* jejak 36 jam semua satelit, irisan <= IRISAN titik dengan jeda di antaranya; dipakai ulang oleh semua wilayah */
  function siapkanJejak(sat, tle) {
    var j = G.jejak;
    if (j && Date.now() - j.t0 < SEGAR_MS) return Promise.resolve(j);
    var selesai = function () { G.janjiJejak = null; };
    return G.janjiJejak || (G.janjiJejak = hitungJejak(sat, tle).then(function (r) { selesai(); return r; }, function (e) { selesai(); throw e; }));
  }
  async function hitungJejak(sat, tle) {
    var t0 = Math.floor(Date.now() / 3e4) * 3e4, n = HORIZON_JAM * 3600 / LANGKAH_DTK + 1, daftar = [];
    for (var k = 0; k < tle.satelit.length; k++) { await tidur(); daftar.push({t0: t0, jej: await buatJejakBertahap(sat, tle.satelit[k], t0, LANGKAH_DTK, n)}); }
    return (G.jejak = {t0: t0, daftar: daftar});
  }
  function titikWilayah(fitur) {
    var b = G.bbox.get(fitur);
    if (!b) { b = titikDari(fitur); if (b) G.bbox.set(fitur, b); }
    return b;
  }
  /* lintasan semua satelit di sekitar satu wilayah, satu satelit per giliran */
  async function lintasWilayah(tle, jejak, titik, now) {
    var lintas = [];
    for (var k = 0; k < tle.satelit.length; k++) { if (k) await tidur(); satKeLintasan(lintas, tle.satelit[k], jejak.daftar[k], titik, now); }
    return lintas.sort(urutWaktu);
  }
  async function kerja(kunci, fitur) {
    try {
      var sat = await muatPustaka(), tle = await muatTle(), jejak = await siapkanJejak(sat, tle);
      await tidur();
      var titik = titikWilayah(fitur); if (!titik) throw lokal("geometri wilayah kosong");
      await tidur();
      var lintas = await lintasWilayah(tle, jejak, titik, Date.now());
      if (!lintas.length) throw lokal("tidak ada lintasan 36 jam ke depan di " + kunci);
      G.hasil.set(kunci, {lintas: lintas, satelit: tle.satelit, t0: jejak.t0});
    } catch (e) {
      if (e && e.lokal) G.hasil.set(kunci, {kosong: true, t0: G.jejak ? G.jejak.t0 : 0});   // cache kosong supaya renderDaftar tidak menjadwalkan ulang terus
      else { peringatkan(e); return; }
    } finally { G.menunggu.delete(kunci); }
    isiPlaceholder(kunci);
  }
  function isiPlaceholder(kunci) {
    var isi = htmlKartu(G.hasil.get(kunci));
    document.querySelectorAll("[data-lintas]").forEach(function (el) {
      if (el.getAttribute("data-lintas") !== kunci) return;
      if (isi) el.insertAdjacentHTML("afterend", isi);
      el.remove();
    });
  }
  function jadwalkan(kunci, fitur) {
    if (G.menunggu.has(kunci)) return;
    G.menunggu.add(kunci);
    var jalan = function () { kerja(kunci, fitur); };
    typeof nanti === "function" ? nanti(jalan) : setTimeout(jalan, 120);
  }

  /* dipanggil renderDaftar: wilayah = S.jalur terpilih (provinsi/kabupaten/kecamatan), geometri = S.fiturWil (anak wilayah itu) */
  function kartu() {
    if (G.gagal || typeof S === "undefined") return "";
    var j = S.jalur, fw = S.fiturWil;
    if (!j || !j.length || !fw || !fw.length) return "";
    var kunci = j.join("|"), p = fw[0].properties && fw[0].properties.kunci;
    if (!p || p.indexOf(kunci + "|") !== 0 || p.split("|").length !== j.length + 1) return "";   // fiturWil masih milik tingkat sebelumnya
    var h = G.hasil.get(kunci);
    if (h) {
      if (G.jejak && (h.t0 !== G.jejak.t0 || Date.now() - G.jejak.t0 >= SEGAR_MS)) jadwalkan(kunci, fw);   // jejak lebih baru atau sudah tua: hitung ulang di belakang layar
      return htmlKartu(h);
    }
    jadwalkan(kunci, fw);
    return '<div hidden data-lintas="' + esc(kunci) + '"></div>';
  }

  g.SatelitLintas = {kartu: kartu, hitung: hitungSemua, buatJejak: buatJejak, cariLintasan: cariLintasan, pusatKotak: pusatKotak, jarakKm: jarakKm, jam: jam, penanda: penanda,
    titik: titikDari, simpul: simpulWilayah, selubung: selubung, cakupan: hitungCakupan, satKeLintasan: satKeLintasan, hitungJejak: hitungJejak, lintasWilayah: lintasWilayah, htmlKartu: htmlKartu,
    konstanta: {pustaka: PUSTAKA, sri: SRI, horizonJam: HORIZON_JAM, langkahDtk: LANGKAH_DTK, irisan: IRISAN, segarMs: SEGAR_MS}};
})(typeof window !== "undefined" ? window : globalThis);
