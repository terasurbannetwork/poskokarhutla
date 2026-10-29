/* Kartu "Satelit berikutnya di <wilayah>" di panel wilayah halaman karhutla (keputusan pemilik 16 Okt 2026,
   docs/multi-bencana/RENCANA-20-JAM.md §6 butir 7).
   - Elemen orbit dibaca dari data/tle.json (scripts/data/tle.py, CelesTrak GP, harian). Lebar sapuan dan jeda data tiap satelit
     DIBACA dari JSON itu (jeda_data_menit + jeda_sumber terukur/bawaan + blok jeda; kaki: terukur = waktu sampai data tampil di aplikasi (median), bawaan = "jeda aman");
     tidak ada angka satelit di berkas ini.
   - Lintasan dihitung di peramban dengan satellite.js (SGP4), dipatok ke versi tepat dari cdnjs dengan SRI. Pustaka dan tle.json baru
     diambil saat wilayah pertama kali dipilih, bukan saat halaman dibuka.
   - Jejak nadir (langkah 30 detik) dihitung SEKALI per satelit dan per hari WIB, dalam irisan <= IRISAN titik dengan jeda di antaranya (tak ada
     tugas panjang di HP lambat). Jangkauannya tetap 72 jam sejajar hari WIB: 00.00 WIB kemarin sampai 24.00 WIB besok, jadi SATU jejak melayani
     kartu wilayah (Hari ini dan Besok, selalu sampai besok 24.00 berapa pun jam dibuka) dan popover (Kemarin, Sekarang, Besok); per wilayah cukup
     memindai jarak pada irisan jejak (subarray, tanpa salin). Ganti hari WIB = jejak dan kartu dihitung ulang.
   - Lintasan = minimum lokal jarak nadir ke pusat kotak batas fitur anak yang sama dengan yang dipakai peta untuk fitBounds wilayah
     terpilih (jam "Lewat"), R = jarak pusat ke sudut terjauh. Cakupan diuji ke geometri sungguhan: simpul batas (selubung cembung +
     cuplikan) yang jaraknya ke jalur nadir sepanjang lintasan <= setengah sapuan. Semua = "seluruh", sebagian = "sebagian",
     tidak ada = lintasan dibuang.
   - kartu() sinkron (dipanggil renderDaftar yang sering jalan): HTML penuh bila sudah ada di cache, kalau belum placeholder tersembunyi
     [data-lintas] yang diisi begitu hitungan selesai. Kerja berat lewat nanti() (rAF + idle) dan irisan ber-await, bukan di handler klik.
   - Galat GLOBAL (pustaka/tle.json gagal atau basi) mematikan kartu untuk sesi: satu console.warn, tanpa galat di layar. Galat satu
     wilayah (geometri kosong, tak ada lintasan) hanya membuang kartu wilayah itu (di-cache sebagai kosong).
   - Berkas yang sama juga menggerakkan popover "Lintasan satelit di atas Indonesia" dari pil jam data di header (bagian bawah berkas; gaya di satelit_lintas.css).
   Bahasa Indonesia; EN lewat i18n/en.json (kalimat jam lewat pola, nama satelit/jam translate=no). */
(function (g) {
  "use strict";
  var PUSTAKA = "https://cdnjs.cloudflare.com/ajax/libs/satellite.js/6.0.2/satellite.min.js";
  var SRI = "sha512-mA2o3mzi5hDUPRwVbBTancxx7y12LwOdODA1rPMov8syYjV657AJWZhq9JYyLO1JbUsXYsrwJn/t070HiocdiQ==";
  var DATA = "data/tle.json";
  var HORIZON_JAM = 36, LANGKAH_DTK = 30, IRISAN = 500, SIMPUL_CUPLIK = 400, USIA_MAKS_MS = 14 * 864e5, BARIS = 5, BUMI_KM = 6371.0088, WIB_MS = 7 * 36e5;   // HORIZON_JAM: hanya hitungSemua (uji node)
  var JEJAK_MUNDUR_JAM = 24, JEJAK_MAJU_JAM = 48;   // jejak bersama: dari 00.00 WIB kemarin (= awal hari - 24 jam) sampai 24.00 WIB besok (= awal hari + 48 jam)
  var G = {gagal: false, peringatan: false, pustaka: null, tle: null, jejak: null, hasil: new Map(), menunggu: new Set(), bbox: new WeakMap(), pop: {}, popJanji: {}};

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
  /* galat pembatalan: pemanggil yang hasilnya sudah basi (rentang diganti, tab ditinggalkan) memberi batal() = true; hitungan berhenti di jeda berikutnya, galatnya ber-.batal dan diabaikan diam-diam */
  function galatBatal() { var e = new Error("hitungan dibatalkan"); e.batal = true; return e; }
  async function buatJejakBertahap(sat, entri, t0, langkahDtk, n, batal) {
    var rec = sat.twoline2satrec(entri.tle[0], entri.tle[1]), lat = new Float64Array(n), lon = new Float64Array(n);
    for (var a = 0; a < n; a += IRISAN) { if (a) { await tidur(); if (batal && batal()) throw galatBatal(); } isiJejak(sat, rec, t0, langkahDtk, lat, lon, a, Math.min(n, a + IRISAN)); }
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
  /* irisan jejak satu satelit ({t0, jej}) untuk waktu dariMs..sampaiMs (+ satu sampel di tiap ujung): subarray, tanpa salin, supaya per wilayah hanya jendela yang
     dibutuhkan yang dipindai; t0 irisan ikut digeser, jadi indeks lo/hi/i di cariLintasan dan hitungCakupan tetap relatif ke irisan yang sama */
  function potong(j, dariMs, sampaiMs) {
    var L = LANGKAH_DTK * 1000, n = j.jej.lat.length, a = Math.max(0, Math.floor((dariMs - j.t0) / L) - 1), b = Math.min(n, Math.ceil((sampaiMs - j.t0) / L) + 2);
    if (b <= a) return {t0: j.t0, jej: {lat: j.jej.lat.subarray(0, 0), lon: j.jej.lon.subarray(0, 0)}};
    return {t0: j.t0 + a * L, jej: {lat: j.jej.lat.subarray(a, b), lon: j.jej.lon.subarray(a, b)}};
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
  function cakupLintasan(hasil, e, j, titik, p) {
    var c = hitungCakupan(j.jej, p.lo, p.hi, titik.simpul, e.setengah_sapuan_km, p.i);
    if (!c.dalam) return;
    hasil.push({ms: p.ms, nama: e.nama, sensor: e.sensor, jarak: p.jarak, cakup: c.dalam === c.total ? "seluruh" : "sebagian", data: p.ms + e.jeda_data_menit * 6e4});
  }
  function satKeLintasan(hasil, e, j, titik, dariMs) {
    cariLintasan(j.jej, j.t0, LANGKAH_DTK, titik, e.setengah_sapuan_km + titik.R, dariMs).forEach(function (p) { cakupLintasan(hasil, e, j, titik, p); });
  }
  /* sama, tetapi uji cakupan dipecah per 4 lintasan dengan jeda (jejak 72 jam nasional: ~17 lintasan per satelit, satu giliran bisa > 8 ms di laptop, jadi 30+ ms di HP lambat) */
  async function satKeLintasanBertahap(hasil, e, j, titik, dariMs, batal) {
    var ps = cariLintasan(j.jej, j.t0, LANGKAH_DTK, titik, e.setengah_sapuan_km + titik.R, dariMs);
    for (var i = 0; i < ps.length; i++) { if (i && i % 4 === 0) { await tidur(); if (batal && batal()) throw galatBatal(); } cakupLintasan(hasil, e, j, titik, ps[i]); }
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
  /* ---------- hari WIB: awal hari, tanggal singkat, empat periode 6 jam (dipakai popover Kemarin/Besok dan kartu Besok) */
  var HARI_MS = 864e5, ENAM_JAM = 6 * 36e5, PERIODE = ["Dini hari", "Pagi sampai siang", "Siang sampai sore", "Malam"];   // PERIODE[i] = jam mulai i * 6 WIB
  var awalHari = function (ms) { return hariKe(ms) * HARI_MS - WIB_MS; };   // 00.00 WIB hari yang memuat ms
  var tglPendek = function (ms) { return new Date(ms).toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta"}).replace(",", ""); };
  var periodeKe = function (ms) { return Math.floor(((ms + WIB_MS) % HARI_MS) / ENAM_JAM); };
  var jamBatas = function (i) { return dua(i * 6) + ".00"; };   // 0 -> "00.00", 4 -> "24.00"
  var siang = function (p) { var i = periodeKe(p.ms); return i === 1 || i === 2; };   // siang = 06.00 sampai 18.00 WIB, selain itu malam
  /* lintasan SATU hari WIB (urut waktu) -> periode yang tidak kosong: [{i, nama, dari, sampai, baris}] */
  function kelompokPeriode(daftar) {
    var out = [];
    daftar.forEach(function (p) {
      var i = periodeKe(p.ms), g = out[out.length - 1];
      if (!g || g.i !== i) { g = {i: i, nama: PERIODE[i], dari: jamBatas(i), sampai: jamBatas(i + 1), baris: []}; out.push(g); }
      g.baris.push(p);
    });
    return out;
  }
  /* jendela tampilan popover: kemarin / besok = 00.00 sampai 24.00 WIB hari itu; sekarang = 24 jam ke belakang sampai 12 jam ke depan */
  function jendelaHari(mode, now) {
    var a = awalHari(now);
    if (mode === "kemarin") return {mode: "kemarin", dari: a - HARI_MS, sampai: a};
    if (mode === "besok") return {mode: "besok", dari: a + HARI_MS, sampai: a + 2 * HARI_MS};
    return {mode: "sekarang", dari: now - MUNDUR_JAM * 36e5, sampai: now + MAJU_JAM * 36e5};
  }
  /* tampilan awal popover = pilihan "Tanggal data" halaman (S.rentang): "kemarin" -> Kemarin, "hari" atau tanggal lain -> Sekarang */
  var modeAwal = function (rentang) { return rentang === "kemarin" ? "kemarin" : "sekarang"; };
  /* penanda hari relatif ke sekarang: "" (hari ini), "besok", "lusa", atau nama hari singkat */
  function penanda(ms, now) {
    var s = hariKe(ms) - hariKe(now);
    if (s <= 0) return ""; if (s === 1) return "besok"; if (s === 2) return "lusa";
    return new Date(ms).toLocaleDateString("id-ID", {weekday: "short", timeZone: "Asia/Jakarta"});
  }
  var kataHari = function (p) { return p === "besok" || p === "lusa" || p === "kemarin" ? "<span>" + p + "</span> " : p ? '<span translate="no">' + esc(p) + "</span> " : ""; };
  var teksJam = function (ms, now) { var p = penanda(ms, now); return (p ? p + " " : "") + jam(ms); };
  var celJam = function (ms, now) { return kataHari(penanda(ms, now)) + "<b>" + jam(ms) + "</b>"; };
  var angkaJam = function (menit) { return (menit / 60).toLocaleString("id-ID", {maximumFractionDigits: 1}); };

  /* ---------- jeda per sensor: kaki kartu, kaki popover, tooltip "Data siap", legenda "Menunggu masuk".
     tle.json (scripts/data/tle.py): tiap satelit membawa jeda_data_menit (terukur: median "sampai data TAMPIL DI APLIKASI" = latensi FIRMS + tunggu putaran ambil ±3 jam, dari riwayat
     Worker; bawaan: latensi FIRMS yang diukur 27 Okt 2026; dua besaran berbeda, jangan disebut "latensi satelit") dan tingkat atas jeda = {hari, dari, sampai, bawaan_diukur, asal, arti}
     (tanggal WIB; asal dan arti tak dibaca di sini). tle.json lama (tanpa blok jeda) = semua bawaan dengan tanggal ukur DIUKUR_LAMA: keluaran tidak berubah. Blok jeda ada tetapi
     hari / dari-sampai / bawaan_diukur tak sah: klausa itu dibuang (tanggal 27 Okt 2026 hanya untuk tle.json tanpa blok jeda). */
  var DIUKUR_LAMA = "27 Okt 2026", PUTARAN_JAM = 3;   // PUTARAN_JAM: Worker mengambil FIRMS tiap ±3 jam (menit 15 tiap 3 jam UTC)
  var TIP_SIAP = {bawaan: "Perkiraan data satelit sudah bisa diambil (jam lewat + jeda aman)", terukur: "Perkiraan data tampil di aplikasi (jam lewat + median)",
    campuran: "Perkiraan data satelit sudah bisa diambil (jam lewat + jeda tiap satelit, lihat keterangan di bawah)"};
  /* batas status = p90 bila ada (terukur), kalau tidak jeda_data_menit (jeda aman bawaan): "batas tunggu" pada terukur dan campuran */
  var KET_MENUNGGU = {bawaan: "Belum ada deteksi yang masuk sesudah lintasan ini; jeda aman belum lewat, atau data FIRMS belum diambil lagi sesudah jeda itu",
    terukur: "Belum ada deteksi yang masuk sesudah lintasan ini; batas tunggu belum lewat, atau data FIRMS belum diambil lagi sesudah batas itu"};
  KET_MENUNGGU.campuran = KET_MENUNGGU.terukur;
  /* "YYYY-MM-DD" (tanggal WIB dari tle.py) -> ms siang UTC tanggal itu; null bila bukan tanggal kalender */
  function tanggalIso(s) {
    var m = typeof s === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3], 12), d = new Date(t);
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t : null;
  }
  var tglJeda = function (t, tahun) { return new Date(t).toLocaleDateString("id-ID", tahun ? {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"} : {day: "numeric", month: "short", timeZone: "UTC"}); };
  /* satelit tle.json + blok jeda + sekarang (ms) -> {mode: "bawaan"|"terukur"|"campuran", terukur: [{nama, awal, lo, hi}], bawaan: [...], hari, dari, sampai, diukur}.
     Satu entri per label dan sumber (urutan kemunculan). Label = sensor (VIIRS/MODIS); bila satu sensor punya satelit terukur DAN bawaan, label = nama satelit (NOAA-20 terukur,
     NOAA-21 bawaan: tak ada dua kalimat "VIIRS"). Terukur membawa rentang menit antarsatelit label itu (NOAA-20 dan NOAA-21 bisa beda; Terra dan Aqua berbagi kode M, jadi
     rentangnya hanya teoretis), bawaan nilai satelit pertama. hari = null bila tak sah; dari/sampai = null bila tak sah, dari > sampai, atau sampai > 1 hari sesudah hari WIB ini;
     diukur = tanggal nilai bawaan diukur: DIUKUR_LAMA tanpa blok jeda, null bila bawaan_diukur di blok jeda tak sah */
  function ringkasJeda(satelit, jeda, now) {
    var r = {mode: "bawaan", terukur: [], bawaan: [], hari: null, dari: null, sampai: null, diukur: DIUKUR_LAMA}, idx = {}, ada = {};
    (satelit || []).forEach(function (e) { var k = e.sensor + "|" + (e.jeda_sumber === "terukur" ? 1 : 0); ada[k] = 1; });
    (satelit || []).forEach(function (e) {
      var ukur = e.jeda_sumber === "terukur", campur = ada[e.sensor + "|1"] && ada[e.sensor + "|0"], label = campur ? e.nama : e.sensor, kunci = label + "|" + (ukur ? 1 : 0), g = idx[kunci];
      if (!g) { g = idx[kunci] = {nama: label, awal: e.jeda_data_menit, lo: e.jeda_data_menit, hi: e.jeda_data_menit}; (ukur ? r.terukur : r.bawaan).push(g); }
      else { g.lo = Math.min(g.lo, e.jeda_data_menit); g.hi = Math.max(g.hi, e.jeda_data_menit); }
    });
    r.mode = r.terukur.length ? (r.bawaan.length ? "campuran" : "terukur") : "bawaan";
    if (!jeda || typeof jeda !== "object") return r;
    var a = tanggalIso(jeda.dari), b = tanggalIso(jeda.sampai), x = tanggalIso(jeda.bawaan_diukur);
    if (typeof jeda.hari === "number" && jeda.hari >= 1 && jeda.hari <= 366) r.hari = Math.floor(jeda.hari);
    if (a !== null && b !== null && a <= b && Math.floor(b / 864e5) <= hariKe(now > 0 ? now : Date.now()) + 1) { r.dari = tglJeda(a, new Date(a).getUTCFullYear() !== new Date(b).getUTCFullYear()); r.sampai = tglJeda(b, true); }
    r.diukur = x !== null ? tglJeda(x, true) : null;
    return r;
  }
  /* kalimat jeda di kaki (r = ringkasJeda). Semua bawaan = "jeda aman VIIRS 3 jam, MODIS 2 jam (latensi FIRMS, diukur ...); bisa lebih lama bila satelit telat." (selera-angka 28 Okt: bawaan disebut "latensi FIRMS");
     huruf kecil di kartu (sesudah " · "), kapital di popover (awal kalimat). Ada yang terukur: "waktu sampai data tampil di aplikasi, median 14 hari terakhir (14 Okt sampai 27 Okt 2026;
     aplikasi mengambil data tiap 3 jam): VIIRS 3,5 jam, MODIS 2,5 jam. Bisa lebih lama bila satelit telat."; satelit bawaan menyusul sebagai kalimat sendiri */
  function htmlJeda(r, kapital) {
    var item = function (g, nilai) { return "<span>" + esc(g.nama) + " " + nilai + " jam</span>"; };
    var aman = function (awal) {
      return "<span>" + (awal ? "Jeda aman" : "jeda aman") + "</span> " + r.bawaan.map(function (g) { return item(g, angkaJam(g.awal)); }).join(", ") +
        (r.diukur ? " <span>(latensi FIRMS, diukur " + esc(r.diukur) + "); bisa lebih lama bila satelit telat.</span>" : ". <span>Bisa lebih lama bila satelit telat.</span>");
    };
    if (!r.terukur.length) return aman(kapital);
    var h = "<span>" + (kapital ? "Waktu" : "waktu") + " sampai data tampil di aplikasi, median " + (r.hari ? r.hari + " hari terakhir" : "riwayat terakhir") + "</span> (" +
      (r.sampai ? '<span translate="no">' + esc(r.dari) + "</span> <span>sampai</span> <span translate=\"no\">" + esc(r.sampai) + "</span>; " : "") +
      "<span>aplikasi mengambil data tiap " + PUTARAN_JAM + " jam</span>): " +
      r.terukur.map(function (g) {
        var lo = angkaJam(g.lo), hi = angkaJam(g.hi);
        return item(g, lo + (hi !== lo ? " sampai " + hi : ""));
      }).join(", ");
    return h + (r.bawaan.length ? ". " + aman(true) : ". <span>Bisa lebih lama bila satelit telat.</span>");
  }

  /* ---------- kartu */
  var IKON = '<svg class="as-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 7-3 3 4 4 3-3zM9 11 5 7l2-2 4 4M15 13l4 4-2 2-4-4"/><path d="M4 20a8 8 0 0 0 8-8"/></svg>';
  function namaWilayah() {
    var j = S.jalur || [];   // S, nama, nanti: const di skrip inline index.html (bukan properti window), terbaca sebagai lingkup global
    return j.length === 1 ? (typeof namaProv === "function" ? namaProv(j[0]) : j[0]) : j[j.length - 1];
  }
  /* tab kartu: "hari" = lintasan berikutnya mulai sekarang (maks BARIS baris); "besok" = SEMUA lintasan di atas wilayah 00.00 sampai 24.00 WIB besok.
     Pilihan diingat per sesi (sessionStorage), satu untuk semua wilayah. */
  var KUNCI_TAB = "pb-satelit-hari", KARTU_TAB = [["hari", "Hari ini"], ["besok", "Besok"]];
  /* satu istilah per mode jeda (tle.json): bawaan = "jeda aman", terukur = median waktu sampai data tampil di aplikasi (sama dengan TIP_SIAP dan kaki) */
  var KET_SIAP_BESOK = {bawaan: "Jam data siap hanya perkiraan: jam lewat ditambah jeda aman. Bisa mundur bila FIRMS telat memproses data.",
    terukur: "Jam data siap hanya perkiraan: jam lewat ditambah median waktu sampai data tampil di aplikasi. Bisa mundur bila FIRMS telat memproses data.",
    campuran: "Jam data siap hanya perkiraan: jam lewat ditambah jeda tiap satelit (lihat keterangan di bawah). Bisa mundur bila FIRMS telat memproses data."};
  function tabKartu() {
    if (G.tab === undefined) { try { G.tab = sessionStorage.getItem(KUNCI_TAB) === "besok" ? "besok" : "hari"; } catch (e) { G.tab = "hari"; } }
    return G.tab;
  }
  function simpanTab(v) { G.tab = v === "besok" ? "besok" : "hari"; try { sessionStorage.setItem(KUNCI_TAB, G.tab); } catch (e) {} }
  /* di hari yang sedang ditampilkan jam saja; di luar itu penanda relatif ke sekarang ("lusa" untuk jam siap yang melewati tengah malam) */
  var teksDi = function (ms, now, acuanMs) { return hariKe(ms) === hariKe(acuanMs) ? jam(ms) : teksJam(ms, now); };
  var celDi = function (ms, now, acuanMs) { return hariKe(ms) === hariKe(acuanMs) ? "<b>" + jam(ms) + "</b>" : celJam(ms, now); };
  /* baris tabel kartu; acuanMs (opsional) = hari tab Besok: jam di hari itu tanpa penanda "besok" di tiap sel */
  function barisKartu(p, now, acuanMs) {
    var c = acuanMs === undefined ? celJam : function (ms, n) { return celDi(ms, n, acuanMs); };
    return "<tr><td>" + c(p.ms, now) + '</td><td translate="no">' + esc(p.nama) + "</td><td><span>" + p.cakup + "</span></td><td>" + c(p.data, now) + "</td></tr>";
  }
  /* isi kartu per tab (ringkasan + tabel); jd = ringkasJeda. "" bila tab hari tak punya lintasan berikutnya */
  function isiKartu(h, tab, now, jd) {
    var kepala = '<table style="table-layout:auto"><tr><td title="Jam satelit paling dekat ke tengah kotak batas wilayah">Lewat (WIB)</td><td>Satelit</td>' +
      '<td title="seluruh: semua batas wilayah ada di dalam jalur sapuan; sebagian: hanya sebagian wilayah tersapu">Cakupan</td>' +
      '<td title="' + esc(TIP_SIAP[jd.mode]) + '">Data siap (WIB)</td></tr>';
    if (tab === "besok") {
      /* hasil wilayah masih milik hari WIB lama (lewat tengah malam, hitung ulang berjalan): daftarnya tak mencakup besok yang sebenarnya, jangan klaim "tidak ada lintasan" */
      if (h.hari !== undefined && h.hari !== hariKe(now)) return "<div><span>Menghitung lintasan besok…</span></div>";
      var b0 = awalHari(now) + HARI_MS, besok = h.lintas.filter(function (p) { return p.ms >= b0 && p.ms < b0 + HARI_MS; });
      if (!besok.length) return "<div><span>Besok tidak ada lintasan satelit di atas wilayah ini.</span></div>";
      var pertama = besok.filter(siang)[0], a = pertama || besok[0];
      return "<div>Besok " + besok.length.toLocaleString("id-ID") + " lintasan; " + (pertama ? "lintasan siang pertama " : "lintasan pertama ") + '<span translate="no">' + esc(a.nama) + "</span> " + jam(a.ms) + " WIB (" + a.cakup +
        "), data biasanya siap " + teksDi(a.data, now, b0) + " WIB.</div>" + kepala + kelompokPeriode(besok).map(function (g) {
          return '<tr class="lk-pr"><td colspan="4"><span>' + g.nama + "</span> <span>" + g.dari + " sampai " + g.sampai + "</span></td></tr>" +
            g.baris.map(function (p) { return barisKartu(p, now, b0); }).join("");
        }).join("") + '</table><div class="lk-kap"><span>' + KET_SIAP_BESOK[jd.mode] + "</span></div>";
    }
    var daftar = h.lintas.filter(function (p) { return p.ms > now; }).slice(0, BARIS);
    if (!daftar.length) return "";
    return "<div>" + esc(daftar[0].nama) + " lewat " + teksJam(daftar[0].ms, now) + " WIB, data biasanya siap " + teksJam(daftar[0].data, now) + " WIB.</div>" + kepala +
      daftar.map(function (p) { return barisKartu(p, now); }).join("") + "</table>";
  }
  /* kontrol segmen di kepala kartu: tombol .seg app (aria-pressed); tab = tab aktif */
  var htmlSegKartu = function (tab) {
    return '<div class="seg penuh lk-seg" role="group" aria-label="Hari lintasan">' + KARTU_TAB.map(function (t) {
      return '<button type="button" data-lk="' + t[0] + '" aria-pressed="' + (t[0] === tab) + '">' + t[1] + "</button>";
    }).join("") + "</div>";
  };
  /* tab dan nowOpt (ms) opsional: uji node; default = pilihan sesi dan Date.now() */
  function htmlKartu(h, tab, nowOpt) {
    if (!h || h.kosong) return "";
    var now = nowOpt || Date.now();
    if (!h.lintas.some(function (p) { return p.ms > now; })) return "";
    tab = tab || tabKartu();
    var epoch = Infinity, jd = ringkasJeda(h.satelit, h.jeda, now);
    h.satelit.forEach(function (e) { epoch = Math.min(epoch, Date.parse(e.epoch)); });
    var bln = new Date(epoch).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
    return '<div class="asap-k lintas-k kotak-p" data-kunci="' + esc(h.kunci || "") + '"><div class="lbl"><span style="font-weight:700;color:var(--ink)">' + IKON + "Satelit berikutnya di " +
      '<span translate="no">' + esc(namaWilayah()) + "</span></span></div>" + htmlSegKartu(tab) +
      '<div class="lk-isi">' + isiKartu(h, tab, now, jd) + "</div>" +
      '<div style="margin-top:6px;font-size:10.5px"><span>Sumber: elemen orbit CelesTrak (epoch tertua</span> <span translate="no">' + esc(bln + " " + jam(epoch)) +
      " WIB</span><span>), dihitung di peramban</span> · " + htmlJeda(jd, false) + "</div></div>";
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
      var gagal = function (pesan) { G.pustaka = null; no(new Error(pesan)); };   // janji gagal dilepas: pemanggil berikutnya (popover) mencoba lagi; kartu wilayah tetap mati lewat G.gagal
      s.onload = function () { g.satellite && g.satellite.propagate && g.satellite.twoline2satrec && g.satellite.gstime && g.satellite.eciToGeodetic ? ok(g.satellite) : gagal("satellite.js tidak lengkap"); };
      s.onerror = function () { gagal("satellite.js gagal dimuat"); };
      document.head.appendChild(s);
    }));
  }
  function muatTle() {
    return G.tle || (G.tle = fetch(DATA, {cache: "no-cache"}).then(function (r) { if (!r.ok) throw new Error(DATA + " " + r.status); return r.json(); }).then(function (d) {
      var sekarang = Date.now(), ok = (d.satelit || []).filter(function (e) {
        return e && e.tle && e.tle.length === 2 && e.setengah_sapuan_km > 0 && e.jeda_data_menit >= 0 && sekarang - Date.parse(e.epoch) <= USIA_MAKS_MS;
      });
      if (!ok.length) throw new Error("elemen orbit kosong atau lebih tua dari 14 hari");
      return {satelit: ok, jeda: d.jeda && typeof d.jeda === "object" ? d.jeda : null};
    }).catch(function (e) { G.tle = null; throw e; }));   // janji gagal dilepas (lihat muatPustaka)
  }
  /* jejak 72 jam semua satelit (00.00 WIB kemarin sampai 24.00 WIB besok), irisan <= IRISAN titik dengan jeda di antaranya; SATU jejak untuk semua wilayah dan popover,
     berlaku sepanjang hari WIB yang sama (jangkauannya sejajar hari, jadi dibuka jam berapa pun tetap sampai besok 24.00) */
  function siapkanJejak(sat, tle) {
    var j = G.jejak;
    if (j && j.hari === hariKe(Date.now()) && j.tle === tle) return Promise.resolve(j);
    var selesai = function () { G.janjiJejak = null; };
    return G.janjiJejak || (G.janjiJejak = hitungJejak(sat, tle).then(function (r) { selesai(); return r; }, function (e) { selesai(); throw e; }));
  }
  async function hitungJejak(sat, tle) {
    var sekarang = Date.now(), t0 = awalHari(sekarang) - JEJAK_MUNDUR_JAM * 36e5, n = (JEJAK_MUNDUR_JAM + JEJAK_MAJU_JAM) * 3600 / LANGKAH_DTK + 1, daftar = [];
    for (var k = 0; k < tle.satelit.length; k++) { await tidur(); daftar.push({t0: t0, jej: await buatJejakBertahap(sat, tle.satelit[k], t0, LANGKAH_DTK, n)}); }
    return (G.jejak = {hari: hariKe(sekarang), tle: tle, t0: t0, daftar: daftar});
  }
  function titikWilayah(fitur) {
    var b = G.bbox.get(fitur);
    if (!b) { b = titikDari(fitur); if (b) G.bbox.set(fitur, b); }
    return b;
  }
  /* lintasan semua satelit di sekitar satu wilayah dari now sampai besok 24.00 WIB (hari WIB jejak), satu satelit per giliran; hanya irisan jejak itu yang dipindai */
  async function lintasWilayah(tle, jejak, titik, now) {
    var lintas = [], akhir = jejak.t0 + (JEJAK_MUNDUR_JAM + JEJAK_MAJU_JAM) * 36e5;
    for (var k = 0; k < tle.satelit.length; k++) { if (k) await tidur(); satKeLintasan(lintas, tle.satelit[k], potong(jejak.daftar[k], now, akhir), titik, now); }
    return lintas.sort(urutWaktu);
  }
  async function kerja(kunci, fitur) {
    try {
      var sat = await muatPustaka(), tle = await muatTle(), jejak = await siapkanJejak(sat, tle);
      await tidur();
      var titik = titikWilayah(fitur); if (!titik) throw lokal("geometri wilayah kosong");
      await tidur();
      var lintas = await lintasWilayah(tle, jejak, titik, Date.now());
      if (!lintas.length) throw lokal("tidak ada lintasan sampai besok 24.00 WIB di " + kunci);
      G.hasil.set(kunci, {kunci: kunci, lintas: lintas, satelit: tle.satelit, jeda: tle.jeda, hari: jejak.hari});
    } catch (e) {
      if (e && e.lokal) G.hasil.set(kunci, {kunci: kunci, kosong: true, hari: hariKe(Date.now())});   // cache kosong supaya renderDaftar tidak menjadwalkan ulang terus
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
    /* kartu yang SUDAH tampil dari hasil hari WIB lama (hitung ulang sesudah tengah malam): ganti dengan hasil baru, fokus tombol tab dipertahankan */
    document.querySelectorAll(".lintas-k").forEach(function (el) {
      if (el.getAttribute("data-kunci") !== kunci) return;
      var fokus = el.contains(document.activeElement) ? document.activeElement.getAttribute("data-lk") : null;
      if (isi) el.insertAdjacentHTML("afterend", isi);
      var baru = isi ? el.nextElementSibling : null;
      el.remove();
      if (fokus && baru) { var b = baru.querySelector('[data-lk="' + fokus + '"]'); if (b) b.focus(); }
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
      if (h.hari !== hariKe(Date.now())) jadwalkan(kunci, fw);   // ganti hari WIB: lintasan sampai besok 24.00 berubah, hitung ulang di belakang layar
      return htmlKartu(h);
    }
    jadwalkan(kunci, fw);
    return '<div hidden data-lintas="' + esc(kunci) + '"></div>';
  }

  /* tab Hari ini | Besok di kepala kartu: satu pendengar klik di document (renderDaftar menggambar ulang kartu, jadi bukan per tombol). Tombol berubah seketika (aria-pressed),
     isi diganti dari hasil wilayah yang sudah di-cache (hanya menyusun string, tanpa hitungan); pilihan diingat per sesi untuk semua wilayah */
  if (typeof document !== "undefined") document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".lintas-k [data-lk]");
    if (!b) return;
    var kel = b.closest(".lintas-k"), h = G.hasil.get(kel.getAttribute("data-kunci")), isi = kel.querySelector(".lk-isi");
    simpanTab(b.getAttribute("data-lk"));
    kel.querySelectorAll("[data-lk]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    if (h && !h.kosong && isi) { var now = Date.now(); isi.innerHTML = isiKartu(h, tabKartu(), now, ringkasJeda(h.satelit, h.jeda, now)); }
  });

  /* ================= Popover "Lintasan satelit di atas Indonesia" (pil jam data di header; pemilik, 28 Okt 2026) =================
     Garis waktu NASIONAL per satelit: 24 jam ke belakang + 12 jam ke depan dari sekarang. Jejak SGP4 mulai now-24 jam (terpisah dari jejak kartu
     wilayah yang mulai now; kartu tak berubah), titik acuan = pusat kotak Indonesia dari S.geo.prov; lintasan di-cache 30 menit, model status 5 menit.
     Status lintasan lampau dari deteksi terakhir SATELITNYA di S.titik (baris [lat, lon, jam, sensor, frp, keyakinan, ...]; jam = jam relatif ke S.acuan).
     Kode hanya tahu ada/tidaknya deteksi sesudah lintasan, bukan apakah "data sudah dikirim": rumusan di layar dibuat netral.
       masuk    = deteksi terakhir satelit itu >= jam lintasan - 20 menit (tak ada deteksi di jendela lintasan = "masuk, tanpa deteksi", BUKAN "tidak ada api");
                  N20/N21 = deteksi terakhir kode sensornya; Terra dan Aqua sama-sama "M": deteksi M diatribusikan ke lintasan Terra/Aqua terdekat (+-20 menit) dan
                  deteksi terakhir dihitung PER SATELIT dari baris yang teratribusi;
       tertunda = belum masuk DAN pengambilan data terakhir (waktuDiambil: yang lebih baru dari S.meta.dibuat dan S.titikDiambil) terjadi sesudah lintasan + ambang,
                  ambang = jeda_p90_menit satelit itu di tle.json bila ada, kalau tidak jeda_data_menit (sistem hanya mengambil FIRMS tiap +-3 jam: tanpa pengambilan
                  sesudah ambang kita belum tahu apakah FIRMS sudah punya datanya);
       menunggu = belum masuk dan belum tertunda; bila ambang sudah lewat tetapi belum ada pengambilan sesudahnya, p.sejak = waktu pengambilan terakhir ("belum diambil
                  lagi sejak"); depan = perkiraan. Waktu diambil tak valid (0/NaN): dianggap baru diambil (perilaku lama, now > lintasan + ambang = tertunda), supaya
                  lintasan tidak menunggu selamanya; "Data siap" dan telat tetap dari jeda_data_menit.
     Sensor N (S-NPP) tak punya TLE: hanya riwayat dari baris N (jam = median jam deteksi), otomatis hilang bila pipeline berhenti menulis N.
     "Deteksi" = baris keyakinan >= S.kmin (dari data: 0 = semua tingkat sejak 28 Okt 2026, sama dengan halaman metode); semua baris tetap menentukan deteksi terakhir.
     Fungsi murni (kelompokTitik, cocokkan, klasifikasi, susunModel, htmlPop) tanpa DOM supaya bisa diuji dari node; DOM hanya di pasang(). */
  var MUNDUR_JAM = 24, MAJU_JAM = 12, IRISAN_BARIS = 40000, COCOK_MS = 20 * 6e4, CELAH_MS = 45 * 6e4, MODEL_SEGAR_MS = 5 * 6e4, DEPAN = 5, KISI_MS = 6 * 36e5, LEMBAR_PX = 768;
  /* ambang keterlambatan (28 Okt 2026): FIRMS terlambat = >= 2 lintasan tertunda dari >= 2 satelit, ATAU satu lintasan tertunda dengan telat >= 3 jam; pengambilan aplikasi basi = > 4 jam;
     daftar Tertunda > LIPAT_DI baris dilipat (ringkasan + TERBARU_BARIS baris terbaru, sisanya dibuka/tutup); pil #upd bertanda bila deteksi terbaru > 10 jam
     (celah lintasan terpanjang ~7 jam + latensi FIRMS ~3 jam; sama dengan TITIK_SEGAR di titik_live.js), diperiksa tiap 5 menit */
  var TELAT_SATU_MENIT = 180, AMBIL_BASI_MS = 4 * 36e5, LIPAT_DI = 5, TERBARU_BARIS = 3, PIL_TELAT_MS = 10 * 36e5, PIL_PERIODE_MS = 5 * 6e4;
  /* kode sensor di baris titik (harian.py PETA_SENSOR): N = S-NPP, N20, N21, M = MODIS (Terra dan Aqua tak dibedakan) */
  function kodeSensor(e) { var m = /^NOAA-(\d+)$/.exec(e.nama || ""); return e.sensor === "MODIS" ? "M" : m ? "N" + m[1] : null; }
  function namaKode(k) { var m = /^N(\d+)$/.exec(k); return m ? "NOAA-" + m[1] : k === "N" ? "S-NPP" : k === "M" ? "MODIS" : k; }
  var urutKode = function (a, b) { var r = function (k) { var m = /^N(\d+)$/.exec(k); return m ? +m[1] : k === "M" ? 1e3 : 2e3; }; return r(a) - r(b); };

  /* baris titik -> per kode sensor: waktu deteksi (>= dariMs) dengan penanda dihitung (keyakinan >= kmin), dan deteksi terakhir (semua baris, termasuk keyakinan
     rendah = bukti data masuk); baris [dari, sampai) ditambahkan ke acc supaya bisa diiris */
  function kelompokTitik(baris, acuanMs, dariMs, kmin, acc, dari, sampai) {
    acc = acc || {waktu: {}, hit: {}, terakhir: {}};
    var waktu = acc.waktu, hit = acc.hit, terakhir = acc.terakhir, n = sampai === undefined ? baris.length : Math.min(sampai, baris.length);
    for (var i = dari || 0; i < n; i++) {
      var b = baris[i], k = b[3], t = acuanMs + b[2] * 36e5;
      if (!(t === t)) continue;
      if (terakhir[k] === undefined || t > terakhir[k]) terakhir[k] = t;
      if (t >= dariMs) { (waktu[k] || (waktu[k] = [])).push(t); (hit[k] || (hit[k] = [])).push(b[5] === undefined || b[5] >= kmin ? 1 : 0); }
    }
    return acc;
  }
  /* sama, tetapi per 40 ribu baris dengan jeda (S.titik bisa ratusan ribu baris saat 7 hari dimuat). Bila titik_live mengganti S.titik/menggeser S.acuan di tengah
     jalan, diulang (3 kali); kalau masih berubah, satu putaran penuh SINKRON (konsisten, tak ada data campur) */
  async function kelompokTitikBertahap(dariMs) {
    var kmin = S.kmin === undefined ? 1 : S.kmin;
    for (var coba = 0; coba < 3; coba++) {
      var baris = S.titik, acuanMs = +S.acuan, acc = {waktu: {}, hit: {}, terakhir: {}};
      for (var a = 0; a < baris.length; a += IRISAN_BARIS) { if (a) await tidur(); kelompokTitik(baris, acuanMs, dariMs, kmin, acc, a, a + IRISAN_BARIS); }
      if (baris === S.titik && acuanMs === +S.acuan) return acc;
    }
    return kelompokTitik(S.titik, +S.acuan, dariMs, kmin);
  }
  /* tiap deteksi -> lintasan terdekat bersensor sama dalam +-20 menit (Terra dan Aqua sama-sama "M": diatribusikan ke yang terdekat). Hasil: cacah deteksi
     DIHITUNG per indeks lintasan dan terakhir[i] = waktu deteksi terbaru (apa pun keyakinannya) yang teratribusi ke lintasan i (-Infinity bila tak ada).
     hit[k][a] boleh bobot (bilangan bulat > 1) selain 0/1: halaman Data satelit memberi tiap gugus deteksi (jam deteksi pertama) bobot = jumlah deteksinya */
  function cocokkan(lintas, waktu, hit) {
    var cacah = lintas.map(function () { return 0; }), terakhir = lintas.map(function () { return -Infinity; }), per = {};
    lintas.forEach(function (p, i) { (per[p.kode] || (per[p.kode] = [])).push(i); });
    Object.keys(waktu).forEach(function (k) {
      var idx = per[k], ts = waktu[k], ht = hit && hit[k];
      if (!idx) return;
      idx.sort(function (a, b) { return lintas[a].ms - lintas[b].ms; });
      var ms = idx.map(function (i) { return lintas[i].ms; });
      for (var a = 0; a < ts.length; a++) {
        var lo = 0, hi = ms.length;   // lintasan pertama dengan ms >= waktu deteksi; terdekat = dia atau pendahulunya
        while (lo < hi) { var mid = (lo + hi) >> 1; if (ms[mid] < ts[a]) lo = mid + 1; else hi = mid; }
        var best = -1, bd = COCOK_MS + 1;
        for (var j = lo - 1; j <= lo; j++) if (j >= 0 && j < ms.length) { var d = Math.abs(ts[a] - ms[j]); if (d < bd) { bd = d; best = idx[j]; } }
        if (best < 0) continue;
        if (!ht) cacah[best]++; else if (ht[a]) cacah[best] += ht[a];   // hit[k][a] = 0/1 (baris titik) atau bobot (halaman Data satelit: jumlah deteksi satu gugus); 0/1 menghasilkan hitungan yang sama seperti dulu
        if (ts[a] > terakhir[best]) terakhir[best] = ts[a];
      }
    });
    return {cacah: cacah, terakhir: terakhir};
  }
  /* deteksi satu sensor tanpa lintasan terhitung (S-NPP, atau semua bila TLE gagal) -> lintasan-riwayat: urutan waktu dipecah di celah > 45 menit, jam = median jam deteksi */
  function lintasDariWaktu(kode, ts, hit) {
    var ix = ts.map(function (_, i) { return i; }).sort(function (a, b) { return ts[a] - ts[b]; }), out = [], ke = [], n = 0;
    var tutup = function () { if (ke.length) out.push({ms: ke[ke.length >> 1], nama: namaKode(kode), kode: kode, n: n, status: n ? "masuk" : "masuk0", riwayat: true}); ke = []; n = 0; };
    ix.forEach(function (i) { if (ke.length && ts[i] - ke[ke.length - 1] > CELAH_MS) tutup(); ke.push(ts[i]); n += hit ? hit[i] : 1; });
    tutup();
    return out;
  }
  /* jeda (ms) sesudah lintasan yang dipakai menimbang pengambilan: jeda_p90_menit bila ada di entri tle.json (diisi pipeline dari riwayat), kalau tidak jeda_data_menit */
  function ambangMs(e) {
    var p90 = e.jeda_p90_menit;
    return (typeof p90 === "number" && isFinite(p90) && p90 > 0 ? p90 : e.jeda_data_menit) * 6e4;
  }
  /* status tiap lintasan (diubah di tempat): perkiraan | masuk | masuk0 (tanpa deteksi) | tertunda (+telatMenit) | menunggu (+sejak); ters[i] = deteksi terakhir satelit lintasan i;
     diambil = ms pengambilan data terakhir (null/0/NaN = tak diketahui: dianggap baru diambil); p.ambang = ms (tanpa p.ambang: p.data - p.ms) */
  function klasifikasi(lintas, cacah, ters, now, diambil) {
    var tahu = diambil > 0 && isFinite(diambil), ambil = tahu ? Math.min(diambil, now) : now;
    lintas.forEach(function (p, i) {
      p.n = cacah[i];
      if (p.ms > now) { p.status = "perkiraan"; return; }
      var ter = ters[i];
      if (ter !== undefined && ter >= p.ms - COCOK_MS) { p.status = p.n ? "masuk" : "masuk0"; return; }
      var batas = p.ms + (p.ambang >= 0 ? p.ambang : p.data - p.ms);
      p.batas = batas;
      if (ambil > batas) { p.status = "tertunda"; p.telatMenit = Math.max(0, (now - batas) / 6e4); }
      else { p.status = "menunggu"; if (tahu && now > batas) p.sejak = ambil; }
    });
  }
  /* ringkasan tampilan Kemarin: cacah per status (cacah "masuk" = lintasan yang membawa deteksi), total deteksi, dan satelit penyumbang deteksi terbanyak (seri: yang lebih awal) */
  function ringkasKemarin(semua) {
    var r = {total: 0, masuk: 0, masuk0: 0, tertunda: 0, menunggu: 0, belumMuat: 0, deteksi: 0, atas: null, riwayat: []}, per = {}, urut = [], riw = {};
    semua.forEach(function (p) {
      var n = p.status === "masuk" ? p.n : 0;
      if (per[p.nama] === undefined) { per[p.nama] = 0; urut.push(p.nama); }
      per[p.nama] += n;
      if (p.riwayat) {   // tanpa data orbit (S-NPP): kelompok jam deteksi, dilaporkan terpisah dari lintasan ber-TLE
        if (!riw[p.nama]) { riw[p.nama] = {nama: p.nama, kelompok: 0, deteksi: 0}; r.riwayat.push(riw[p.nama]); }
        riw[p.nama].kelompok++; riw[p.nama].deteksi += p.n || 0;
        return;
      }
      r.total++; r.deteksi += n;
      if (p.status === "masuk" || p.status === "masuk0" || p.status === "tertunda" || p.status === "menunggu" || p.status === "belumMuat") r[p.status]++;
    });
    urut.forEach(function (nama) { if (per[nama] > 0 && (!r.atas || per[nama] > r.atas.n)) r.atas = {nama: nama, n: per[nama]}; });
    return r;
  }
  /* ringkasan tampilan Besok: total, lintasan pertama dan terakhir, rentang jam siang (06.00 sampai 18.00 WIB) dan malam (dini hari + malam: dua rentang) */
  function ringkasBesok(semua) {
    var rentang = function (xs) { return xs.length ? {n: xs.length, awal: xs[0].ms, akhir: xs[xs.length - 1].ms} : null; };
    return {total: semua.length, pertama: semua[0] || null, terakhir: semua[semua.length - 1] || null, siang: rentang(semua.filter(siang)),
      dini: rentang(semua.filter(function (p) { return periodeKe(p.ms) === 0; })), petang: rentang(semua.filter(function (p) { return periodeKe(p.ms) === 3; }))};
  }
  /* o = {now, jendela: jendelaHari(mode, now) (tanpa = sekarang), lintas: lintasan hitungan SGP4 | null (gagal), satelit: tle.satelit | null, baris: S.titik, acuanMs: +S.acuan, kmin,
     kel: hasil kelompokTitik (opsional), diambil: ms pengambilan data terakhir (opsional), jeda: blok jeda tle.json (opsional),
     cakup: ms awal cakupan baris titik yang termuat (opsional, untuk Kemarin; 0 = anggap lengkap)} -> model untuk htmlPop (model.diambil = ms | null; model.jedaR = ringkasJeda).
     Kemarin/Besok: model.semua = SEMUA lintasan hari itu urut waktu, model.ringkas = ringkasKemarin | ringkasBesok. cakup > awal jendela - COCOK_MS = model.kurang = true, dan lintasan yang
     jendela deteksinya jatuh sebelum cakup berstatus "belumMuat" (bukan "tanpa deteksi": barisnya memang belum ada) */
  function susunModel(o) {
    var now = o.now, jd = o.jendela || jendelaHari("sekarang", now), hari = jd.mode !== "sekarang", dari = jd.dari, sampai = jd.sampai, satelit = o.lintas ? o.satelit || [] : [];
    var kel = o.kel || kelompokTitik(o.baris || [], o.acuanMs, dari - COCOK_MS, o.kmin === undefined ? 1 : o.kmin);
    var ambangSat = {}, diambil = o.diambil > 0 && isFinite(o.diambil) ? Math.min(o.diambil, now) : null, cakup = o.cakup > 0 && isFinite(o.cakup) ? o.cakup : 0;
    satelit.forEach(function (e) { ambangSat[e.nama] = ambangMs(e); });
    /* atribusi deteksi ke lintasan dan "deteksi terakhir per satelit" memakai SEMUA lintasan jejak (72 jam) dan semua baris termuat, bukan hanya lintasan di jendela tampilan:
       Terra 20.59 kemarin sudah "masuk" bila ada deteksi Terra sesudahnya (pagi ini), meski lintasan itu di luar jendela Kemarin */
    var todos = (o.lintas || []).map(function (p) { return {ms: p.ms, nama: p.nama, kode: p.kode, data: p.data, ambang: ambangSat[p.nama]}; });
    var cc = cocokkan(todos, kel.waktu, kel.hit), bersama = {}, terSat = {}, ters, idx = [];
    satelit.forEach(function (e) { var k = kodeSensor(e); if (k) bersama[k] = (bersama[k] || 0) + 1; });   // kode dipakai > 1 satelit (M): deteksi terakhir per satelit dari baris teratribusi
    todos.forEach(function (p, i) {
      if (cc.terakhir[i] > (terSat[p.nama] === undefined ? -Infinity : terSat[p.nama])) terSat[p.nama] = cc.terakhir[i];
      if (p.ms >= dari && (hari ? p.ms < sampai : p.ms <= sampai)) idx.push(i);
    });
    var lintas = idx.map(function (i) { return todos[i]; }), cacah = idx.map(function (i) { return cc.cacah[i]; });
    ters = lintas.map(function (p) { return bersama[p.kode] > 1 ? terSat[p.nama] : kel.terakhir[p.kode]; });
    klasifikasi(lintas, cacah, ters, now, diambil);
    /* deteksi terbaru (keyakinan apa pun) semua satelit dan per satelit, dibaca analisisTelat; per satelit = ters yang sama dengan status lintasan */
    var detSemua = null, detSat = {};
    Object.keys(kel.terakhir).forEach(function (k) { var t = kel.terakhir[k]; if (t > -Infinity && (detSemua === null || t > detSemua)) detSemua = t; });
    satelit.forEach(function (e) { var k = kodeSensor(e), t = k ? (bersama[k] > 1 ? terSat[e.nama] : kel.terakhir[k]) : undefined; if (t > -Infinity) detSat[e.nama] = t; });
    if (cakup) lintas.forEach(function (p) { if (p.ms - COCOK_MS < cakup) { p.status = "belumMuat"; p.n = 0; delete p.telatMenit; delete p.sejak; } });
    var baris = satelit.map(function (e) { return {nama: e.nama, kode: kodeSensor(e), riwayat: false, lintas: lintas.filter(function (p) { return p.nama === e.nama; })}; });
    var punya = {}, akhirRiwayat = hari ? Math.min(now, sampai - 1) : now;
    satelit.forEach(function (e) { var k = kodeSensor(e); if (k) punya[k] = true; });
    Object.keys(kel.waktu).filter(function (k) { return !punya[k] && namaKode(k) !== k; }).sort(urutKode).forEach(function (k) {
      baris.push({nama: namaKode(k), kode: k, riwayat: true, lintas: lintasDariWaktu(k, kel.waktu[k], kel.hit[k]).filter(function (p) { return p.ms >= dari && p.ms <= akhirRiwayat; })});
    });
    var semua = [], epoch = null;
    baris.forEach(function (b) { semua = semua.concat(b.lintas); });
    satelit.forEach(function (e) {   // untuk kaki: rentang epoch elemen orbit, dibaca dari tle.json
      var t = Date.parse(e.epoch);
      if (t === t) epoch = epoch ? [Math.min(epoch[0], t), Math.max(epoch[1], t)] : [t, t];
    });
    var oleh = function (st) { return semua.filter(function (p) { return p.status === st; }).sort(urutWaktu); }, ada = {};
    semua.forEach(function (p) { ada[p.status] = true; });
    var masuk = oleh("masuk"), terbaru = masuk[masuk.length - 1];
    if (!terbaru) { masuk = oleh("masuk0"); terbaru = masuk[masuk.length - 1]; }
    /* "Berikutnya": paling banyak DEPAN baris, dua kelompok (sudah lewat dan menunggu masuk | akan lewat); sedikitnya dua "akan lewat" selalu tampil bila ada */
    var lewatMenunggu = oleh("menunggu"), akanLewat = oleh("perkiraan"), mw = lewatMenunggu.slice(0, DEPAN - Math.min(2, akanLewat.length)), ak = akanLewat.slice(0, DEPAN - mw.length);
    var m = {now: now, dari: dari, sampai: sampai, perkiraan: satelit.length > 0, baris: baris, tertunda: oleh("tertunda"), berikutnya: mw.concat(ak), menunggu: mw, akan: ak,
      terbaru: terbaru || null, ada: ada, epoch: epoch, jedaR: ringkasJeda(satelit, o.jeda, now), diambil: diambil, mode: jd.mode, deteksi: {semua: detSemua, per: detSat}};
    if (hari) {
      m.semua = semua.slice().sort(urutWaktu);
      m.cakup = cakup; m.kurang = jd.mode === "kemarin" && cakup > 0 && cakup > dari - COCOK_MS;
      m.ringkas = jd.mode === "kemarin" ? ringkasKemarin(m.semua) : ringkasBesok(m.semua);
    }
    return m;
  }

  /* ---------- tampilan (string HTML, tanpa DOM) */
  var penandaHari = function (ms, now) { return hariKe(now) - hariKe(ms) === 1 ? "kemarin" : penanda(ms, now); };
  var teksHari = function (ms, now) { var p = penandaHari(ms, now); return (p ? p + " " : "") + jam(ms); };
  var celHari = function (ms, now) { return kataHari(penandaHari(ms, now)) + "<b>" + jam(ms) + "</b>"; };
  /* telat = sekarang - batas tunggu, dibulatkan ke 0,5 jam, maksimal satu desimal: "sekitar 1 jam", "sekitar 1,5 jam"; di bawah 0,5 jam "kurang dari 0,5 jam" */
  var teksTelat = function (menit) {
    var j = menit / 60;
    return j < 0.5 ? "kurang dari 0,5 jam" : "sekitar " + (Math.round(j * 2) / 2).toLocaleString("id-ID", {minimumFractionDigits: 0, maximumFractionDigits: 1}) + " jam";
  };
  /* judul penanda (tooltip). masuk/masuk0/tertunda: "<satelit> <jam> WIB: <keterangan>"; menunggu/perkiraan: kalimat kartu wilayah "<satelit> lewat <jam> WIB, data biasanya
     siap <jam> WIB." (+ " Menunggu masuk." bila sudah lewat, + " Belum diambil lagi sejak <jam> WIB." bila ambang lewat tanpa pengambilan baru); lintasan-riwayat (tanpa TLE): "<satelit>, jam deteksi <jam> WIB: N deteksi". Pola EN ada di i18n/en.json */
  function judulLintas(p, now) {
    if (p.riwayat) return p.nama + ", jam deteksi " + teksHari(p.ms, now) + " WIB: " + (p.n ? p.n.toLocaleString("id-ID") + " deteksi" : "data masuk, tanpa deteksi");
    var awal = p.nama + " " + teksHari(p.ms, now) + " WIB: ";
    if (p.status === "masuk") return awal + p.n.toLocaleString("id-ID") + " deteksi";
    if (p.status === "masuk0") return awal + "data masuk, tanpa deteksi";   // kata yang sama dengan label legenda ("Data masuk, tanpa deteksi")
    if (p.status === "tertunda") return awal + "tertunda, telat " + teksTelat(p.telatMenit);
    if (p.status === "belumMuat") return awal + "data titik panas jam itu belum termuat";
    return p.nama + " lewat " + teksHari(p.ms, now) + " WIB, data biasanya siap " + teksHari(p.data, now) + " WIB." + (p.status === "menunggu" ? " Menunggu masuk." + (p.sejak ? " Belum diambil lagi sejak " + teksHari(p.sejak, now) + " WIB." : "") : "");
  }
  /* ---------- keterlambatan (tampilan Sekarang saja: kalimatnya tentang keadaan sekarang, bukan hari yang sudah lewat). Kata di layar = FAKTA (data belum masuk), bukan sebab pasti.
     kita  = aplikasi belum mengambil FIRMS lagi > 4 jam (waktu ambil terakhir = max(S.meta.dibuat, S.titikDiambil); masalah di sisi kita): {sejak, menit}.
     firms = >= 2 lintasan tertunda dari >= 2 satelit, ATAU ada lintasan tertunda dengan telat >= 3 jam. {satelit: null | [nama satelit yang tertunda], sejak, menit}:
             kalimat UMUM (satelit null, "sejak" = deteksi terbaru semua satelit) hanya bila >= 2 satelit tertunda DAN deteksi terbaru semua satelit sudah >= 3 jam (atau tak ada deteksi sama sekali);
             selain itu kalimat menyebut satelit yang tertunda, dan "sejak" = deteksi terbaru yang TERBARU di antara satelit itu: itulah satu-satunya waktu yang jujur untuk "belum masuk sejak X"
             (satelit yang deteksinya lebih lama tak masuk sejak lebih awal; memakai yang paling tua akan keliru bagi satelit yang masih mengirim sesudahnya). sejak null = belum ada deteksi di data termuat. */
  function analisisTelat(m) {
    var out = {kita: null, firms: null};
    if (!m || m.mode !== "sekarang") return out;
    var now = m.now, tt = m.tertunda || [], nama = {}, urut = [], lama = false, det = m.deteksi || {}, per = det.per || {};
    if (m.diambil > 0 && now - m.diambil > AMBIL_BASI_MS) out.kita = {sejak: m.diambil, menit: (now - m.diambil) / 6e4};
    tt.forEach(function (p) { if (!nama[p.nama]) { nama[p.nama] = 1; urut.push(p.nama); } if (p.telatMenit >= TELAT_SATU_MENIT) lama = true; });
    if ((tt.length >= 2 && urut.length >= 2) || lama) {
      var pos = {}; (m.baris || []).forEach(function (b, i) { pos[b.nama] = i; });   // urutan nama = urutan baris grafik (NOAA-20, NOAA-21, Terra, Aqua)
      urut.sort(function (a, b) { return (pos[a] === undefined ? 99 : pos[a]) - (pos[b] === undefined ? 99 : pos[b]); });
      var umum = urut.length >= 2 && !(det.semua > 0 && now - det.semua < TELAT_SATU_MENIT * 6e4), t = null;
      if (umum) t = det.semua;
      else urut.forEach(function (n) { if (per[n] > 0 && (t === null || per[n] > t)) t = per[n]; });
      out.firms = {satelit: umum ? null : urut, sejak: t > 0 ? t : null, menit: t > 0 ? Math.max(0, (now - t) / 6e4) : null};
    }
    return out;
  }
  /* kotak peringatan ringan: ikon segitiga + kalimat berkepala tebal (bukan warna saja); sisi kita dulu. Tiap kalimat = dua simpul teks (kepala tebal | sisanya) supaya EN lewat pola di en.json */
  var IKON_PERINGATAN = '<svg class="lp-ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
  var gabungNama = function (n) { return n.length < 3 ? n.join(" dan ") : n.slice(0, -1).join(", ") + ", dan " + n[n.length - 1]; };
  function htmlTelat(a, now) {
    var p = [], sejak = function (x) { return "sejak " + teksHari(x.sejak, now) + "\u00a0WIB (" + teksTelat(x.menit) + ")"; };   // spasi tak terputus: jam dan WIB tak terpisah di akhir baris
    var kosong = "tidak ada titik panas baru dalam " + MUNDUR_JAM + " jam terakhir.";
    if (a.kita) p.push("<p><b>Aplikasi belum mengambil data FIRMS lagi</b> " + sejak(a.kita) + ".</p>");
    if (a.firms) {
      var f = a.firms, sat = f.satelit;
      p.push(sat ? "<p><b>Data " + gabungNama(sat.map(esc)) + " belum masuk" + (f.sejak ? "</b> " + sejak(f) + ". Titik panas " + (sat.length > 1 ? "satelit-satelit itu" : "satelit itu") + " di peta baru sampai jam tersebut." : ":</b> " + kosong) + "</p>"
        : "<p><b>Data FIRMS belum masuk:</b> " + (f.sejak ? "tidak ada titik panas baru " + sejak(f) + ". Peta masih menampilkan titik panas sampai jam itu." : kosong) + "</p>");
    }
    return p.length ? '<div class="lp-telat">' + IKON_PERINGATAN + '<div class="lp-tt">' + p.join("") + "</div></div>" : "";
  }
  var JARI = {masuk: 5, masuk0: 2.8, tertunda: 4.5, menunggu: 4.5, perkiraan: 4.5, belumMuat: 4};
  var KET_TUNDA = "Belum ada deteksi yang masuk sesudah lintasan ini, padahal biasanya sudah siap.";
  var LEGENDA = [["masuk", "Data masuk", ""], ["masuk0", "Data masuk, tanpa deteksi", "Ada deteksi yang masuk sesudah lintasan ini, tetapi tidak ada satu pun di jendela lintasan ini; bukan bukti tidak ada api"],
    ["tertunda", "Tertunda", KET_TUNDA], ["menunggu", "Menunggu masuk", KET_MENUNGGU.bawaan], ["perkiraan", "Perkiraan lintasan", ""],
    ["belumMuat", "Data belum termuat", "Data titik panas jam lintasan ini belum termuat, jadi lintasan ini belum bisa dinilai; bukan bukti tidak ada deteksi"]];   // keterangan "menunggu" menurut m.jedaR.mode (ketLegenda)
  var ketLegenda = function (l, m) { return l[0] === "menunggu" ? KET_MENUNGGU[m.jedaR ? m.jedaR.mode : "bawaan"] : l[2]; };
  /* tooltip penanda grafik: #tip bersama (inti/tip.js, [data-tip] muncul seketika saat pointerover, juga ketuk di HP), bukan <title> bawaan peramban yang lambat.
     Markup tp2 sendiri (berisi <div>, jadi rapikanTip tidak mengubahnya); tiap label simpul teks sendiri supaya i18n.js menerjemahkannya */
  function tipLintas(p, m) {
    var now = m.now, st = p.riwayat && p.status !== "belumMuat" ? (p.n ? "masuk" : "masuk0") : p.status, kv = [];
    var hr = function (ms) { var d = penandaHari(ms, now); return (d ? "<span>" + d + "</span> " : "") + jam(ms) + " WIB"; };
    var lab = LEGENDA.filter(function (l) { return l[0] === st; })[0];
    kv.push([p.riwayat ? "Jam deteksi" : "Lewat", hr(p.ms)]);
    if (st === "masuk") kv.push(["Deteksi", p.n.toLocaleString("id-ID")]);
    if (st === "masuk0") kv.push(["Deteksi", "0"]);
    if (!p.riwayat && p.data && (st === "menunggu" || st === "perkiraan")) kv.push(["Data siap", hr(p.data)]);
    if (st === "tertunda") { if (p.batas) kv.push(["Batas tunggu", hr(p.batas)]); kv.push(["Telat", teksTelat(p.telatMenit)]); }
    if (st === "menunggu" && p.sejak) kv.push(["Belum diambil lagi sejak", hr(p.sejak)]);
    return '<div class="tp2-h"><b translate="no">' + esc(p.nama) + "</b><small>" + (lab ? lab[1] : st) + '</small></div><div class="tp2-kv">' +
      kv.map(function (r) { return "<span>" + r[0] + "</span><b>" + r[1] + "</b>"; }).join("") + "</div>";
  }

  /* Kemarin/Besok: sumbu 00.00 sampai 24.00 WIB (tanda 06/12/18), tanpa garis "sekarang" dan baris tanggal; Sekarang: 24 jam ke belakang sampai 12 jam ke depan */
  function svgGrafik(m, W) {
    var hari = m.mode === "kemarin" || m.mode === "besok", L = 64, R = hari ? 16 : 12, T = hari ? 8 : 22, RH = 26, B = hari ? 20 : 30, n = m.baris.length, dasar = T + n * RH, H = dasar + B, lebar = W - L - R, rentang = m.sampai - m.dari;
    var X = function (ms) { return Math.round((L + (ms - m.dari) / rentang * lebar) * 10) / 10; }, Y = function (i) { return T + i * RH + RH / 2; };
    var s = '<svg class="lp-g" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(hari ? "Garis waktu lintasan satelit " + m.mode + ", 00.00 sampai 24.00 WIB" :
      "Garis waktu lintasan satelit: " + MUNDUR_JAM + " jam ke belakang sampai " + MAJU_JAM + " jam ke depan") + '">';
    m.baris.forEach(function (b, i) { if (i % 2 === 0) s += '<rect class="lp-z" x="0" y="' + (T + i * RH) + '" width="' + W + '" height="' + RH + '"/>'; });
    for (var t = Math.ceil((m.dari + WIB_MS) / KISI_MS) * KISI_MS - WIB_MS; t <= m.sampai; t += KISI_MS) {
      var x = X(t), tengah = jam(t) === "00.00";
      s += '<line class="lp-k' + (tengah ? " lp-k0" : "") + '" x1="' + x + '" y1="' + T + '" x2="' + x + '" y2="' + dasar + '"/><text class="lp-tk" translate="no" x="' + x + '" y="' + (dasar + 12) + '" text-anchor="middle">' +
        (hari && t === m.sampai ? "24.00" : jam(t)) + "</text>";
      if (tengah && !hari) s += '<text class="lp-tk lp-tg" translate="no" x="' + x + '" y="' + (dasar + 24) + '" text-anchor="middle">' +
        esc(new Date(t).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"})) + "</text>";
    }
    var xn = X(m.now);
    if (!hari) s += '<line class="lp-now" x1="' + xn + '" y1="' + (T - 5) + '" x2="' + xn + '" y2="' + dasar + '"/><text class="lp-nowt" x="' + xn + '" y="' + (T - 9) + '" text-anchor="middle">sekarang</text>';
    m.baris.forEach(function (b, i) {
      var y = Y(i);
      s += '<text class="lp-n" translate="no" x="6" y="' + (y + 3.5) + '">' + esc(b.nama) + "</text>";
      if (b.riwayat && m.perkiraan && !hari) s += '<text class="lp-tp" x="' + (xn + 8) + '" y="' + (y + 3.5) + '">tanpa perkiraan</text>';
      b.lintas.forEach(function (p) {
        var cx = X(p.ms);
        if (!hari && p === m.terbaru) s += '<circle class="lp-halo" cx="' + cx + '" cy="' + y + '" r="9"/><text class="lp-tb" translate="no" x="' + cx + '" y="' + (y - 11) + '" text-anchor="middle">' + jam(p.ms) + "</text>";
        s += '<g class="lp-t" data-tip="' + esc(tipLintas(p, m)) + '"><circle class="lp-hit" cx="' + cx + '" cy="' + y + '" r="11"/><circle class="m-' + p.status + '" cx="' + cx + '" cy="' + y + '" r="' + JARI[p.status] + '"/></g>';
      });
    });
    return s + "</svg>";
  }
  /* ikut S.kmin dari data (keyakinan_min hotspot*.json): 0 sejak keputusan pemilik 28 Okt 2026 (keyakinan rendah ikut dihitung) */
  var ketDeteksi = function () {
    var k = typeof S !== "undefined" && S && S.kmin !== undefined ? S.kmin : 1;
    return k <= 0 ? "Deteksi = baris FIRMS semua tingkat keyakinan, bukan lokasi unik." : "Deteksi = baris FIRMS berkeyakinan sedang dan tinggi, bukan lokasi unik.";
  };
  var swatch = function (st) { return '<svg class="lp-sw" viewBox="0 0 14 14" aria-hidden="true"><circle class="m-' + st + '" cx="7" cy="7" r="' + JARI[st] + '"/></svg>'; };
  /* kepala = [teks, tooltip?]; kolom pertama = satelit; kolom ke-`kanan` (bila ada) rata kanan (kolom Telat), selebihnya rata kiri */
  function tabelPop(kepala, isi, kanan, kelas) {   // isi = HTML baris (satu tbody) atau [[HTML, atribut tbody], ...] (beberapa tbody, mis. bagian yang bisa dibuka/tutup)
    var badan = typeof isi === "string" ? "<tbody>" + isi + "</tbody>" : isi.map(function (b) { return "<tbody" + (b[1] || "") + ">" + b[0] + "</tbody>"; }).join("");
    return '<table class="lp-t' + (kelas ? " " + kelas : "") + '"><thead><tr>' + kepala.map(function (h, i) {
      return '<th scope="col"' + (i === kanan ? ' class="t"' : i ? ' class="n"' : "") + (h[1] ? ' title="' + esc(h[1]) + '"' : "") + ">" + h[0] + "</th>";
    }).join("") + "</tr></thead>" + badan + "</table>";
  }
  var sel = function (x, kanan) { return '<td class="' + (kanan ? "t" : "n") + '">' + x + "</td>"; };
  var namaSel = function (p) { return '<td translate="no">' + esc(p.nama) + "</td>"; };
  /* kaki: sumber, epoch elemen orbit dan jeda (terukur/bawaan) dibaca dari tle.json (lewat model), definisi jam dan deteksi */
  function htmlKaki(m) {
    var tgl = function (ms) { return new Date(ms).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"}); }, h = "", besok = m.mode === "besok";   // Besok: tanpa kalimat status/deteksi/pengambilan (tak ada yang dinilai)
    if (m.perkiraan && m.epoch) {
      var a = m.epoch[0], b = m.epoch[1];
      h += '<span>Sumber: elemen orbit CelesTrak, epoch</span> <span translate="no">' + esc(tgl(a) + " " + jam(a)) + "</span> <span>sampai</span> <span translate=\"no\">" +
        esc((tgl(b) !== tgl(a) ? tgl(b) + " " : "") + jam(b)) + " WIB</span>. <span>Dihitung di peramban.</span> ";
    }
    if (!besok) h += "<span>Status dari deteksi terakhir tiap satelit di NASA FIRMS.</span> ";
    if (m.diambil && !besok) h += "<span>Data FIRMS terakhir diambil</span> " + kataHari(penandaHari(m.diambil, m.now)) + '<span translate="no">' + jam(m.diambil) + " WIB</span>. ";
    if (m.perkiraan) h += "<span>Jam lintasan = saat satelit paling dekat ke tengah Indonesia (perkiraan).</span> ";
    if (m.baris.some(function (b) { return b.riwayat; })) h += "<span>Baris tanpa perkiraan memakai jam deteksi (median).</span> ";
    if (!besok) h += "<span>" + ketDeteksi() + "</span>";
    if (m.perkiraan && m.jedaR && (m.jedaR.terukur.length || m.jedaR.bawaan.length)) h += " " + htmlJeda(m.jedaR, true);
    return h;
  }
  /* ---------- tampilan Kemarin dan Besok: ringkasan, grafik 00.00 sampai 24.00 WIB, lalu SEMUA lintasan hari itu urut waktu per periode 6 jam */
  var angka = function (n) { return Number(n).toLocaleString("id-ID"); };
  var chip = function (teks, kelas) { return '<span class="lp-c' + (kelas ? " " + kelas : "") + '">' + teks + "</span>"; };
  var PISAH = ' <span class="lp-sep" aria-hidden="true">·</span> ';
  var rentangJam = function (x) { return x.awal === x.akhir ? jam(x.awal) : jam(x.awal) + " sampai " + jam(x.akhir); };   // satu lintasan: satu jam saja
  var ringKosong = function (teks) { return '<p class="lp-ring"><span>' + teks + "</span></p>"; };
  /* Kemarin: cacah lintasan, yang membawa deteksi (+ total deteksi), tanpa deteksi, tertunda; menunggu dan belum termuat hanya bila ada; lalu satelit penyumbang deteksi terbanyak.
     Angka dan kata satu simpul ("7 membawa deteksi") supaya EN bisa "1 pass" / "9 passes" lewat kamus */
  function ringKemarin(m) {
    var r = m.ringkas, h = "";
    if (!r.total && !r.riwayat.length) return ringKosong("Tidak ada lintasan untuk ditampilkan kemarin.");
    if (r.total) {   // hanya lintasan ber-TLE: S-NPP (tanpa orbit) dilaporkan di baris sendiri
      var c = [chip(angka(r.total) + " lintasan", "lp-c0"), chip(angka(r.masuk) + " ada deteksi" + (r.deteksi ? " <span>(" + angka(r.deteksi) + " deteksi)</span>" : "")),
        chip(angka(r.masuk0) + " tanpa deteksi"), chip(angka(r.tertunda) + " tertunda")];
      if (r.menunggu) c.push(chip(angka(r.menunggu) + " menunggu masuk"));
      if (r.belumMuat) c.push(chip(angka(r.belumMuat) + " belum termuat"));
      h += '<p class="lp-ring lp-rk">' + c.join(PISAH) + "</p>";
    }
    r.riwayat.forEach(function (x) {
      h += '<p class="lp-ring lp-r2"><b translate="no">' + esc(x.nama) + "</b> <span>(tanpa data orbit):</span> <span>" + angka(x.kelompok) + " kelompok jam deteksi,</span> <span>" + angka(x.deteksi) + " deteksi</span></p>";
    });
    return h + (r.atas ? '<p class="lp-ring lp-r2"><span>Deteksi terbanyak:</span> <b translate="no">' + esc(r.atas.nama) + "</b> <span>(" + angka(r.atas.n) + " deteksi)</span>.</p>" : "");
  }
  /* Besok: cacah perkiraan lintasan, pertama dan terakhir, rentang jam siang (06.00 sampai 18.00 WIB) dan malam (dini hari dan malam: dua rentang) */
  function ringBesok(m) {
    var r = m.ringkas;
    if (!r.total) return ringKosong("Tidak ada perkiraan lintasan besok.");
    var tanda = function (p) { return esc(p.nama) + " " + jam(p.ms) + " WIB"; }, c = [chip(angka(r.total) + " perkiraan lintasan", "lp-c0"), chip("pertama " + tanda(r.pertama))];
    if (r.total > 1) c.push(chip("terakhir " + tanda(r.terakhir)));
    var baris = function (judul, segmen) {
      var n = segmen.reduce(function (a, x) { return a + x.n; }, 0);
      return '<p class="lp-ring lp-r2"><span>' + judul + "</span> " + (n ? segmen.map(function (x) { return "<b>" + rentangJam(x) + "</b>"; }).join(" <span>dan</span> ") + ' <span translate="no">WIB</span> <span class="lp-jml">(' + angka(n) + " lintasan)</span>"
        : "<span>tidak ada lintasan</span>") + "</p>";
    };
    return '<p class="lp-ring lp-rk">' + c.join(PISAH) + "</p>" + baris("Siang (06.00 sampai 18.00):", r.siang ? [r.siang] : []) +
      baris("Dini hari dan malam (00.00 sampai 06.00 dan 18.00 sampai 24.00):", [r.dini, r.petang].filter(Boolean));   // kronologis, sama dengan sub-kepala tabel
  }
  /* label status di tabel dipendekkan (penanda bentuk + legenda menjelaskan artinya); baris tanpa orbit (S-NPP) = "Ada deteksi", bukan "Masuk": jam-nya jam deteksi, bukan jam lintas */
  var STATUS_KEMARIN = {masuk: "Masuk", masuk0: "Tanpa deteksi", tertunda: "Tertunda", menunggu: "Menunggu masuk", belumMuat: "Belum termuat"};
  var labelStatus = function (p) { return p.riwayat ? (p.n ? "Ada deteksi" : "Tanpa deteksi") : STATUS_KEMARIN[p.status] || "Perkiraan lintasan"; };
  /* satu baris tabel: kepala periode (kolom penuh) lalu lintasan; jam lintasan selalu di hari yang ditampilkan, jadi tanpa penanda hari */
  function barisHari(m, kol, baris) {
    return kelompokPeriode(m.semua).map(function (g) {
      return '<tr class="lp-pr"><th scope="colgroup" colspan="' + kol + '"><span>' + g.nama + "</span> <span>" + g.dari + " sampai " + g.sampai + "</span></th></tr>" + g.baris.map(baris).join("");
    }).join("");
  }
  function tabelKemarin(m) {
    return tabelPop([["Lewat (WIB)"], ["Satelit"], ["Deteksi", ketDeteksi()], ["Status"]], barisHari(m, 4, function (p) {
      var det = p.status === "masuk" ? angka(p.n) : p.status === "masuk0" ? "0" : "-";
      return '<tr><td class="n"><b>' + jam(p.ms) + '</b></td><td><span translate="no">' + esc(p.nama) + "</span>" + (p.riwayat ? ' <span class="lp-sl">jam deteksi</span>' : "") + "</td>" + sel(det, true) +
        '<td class="lp-st">' + swatch(p.status) + "<span>" + labelStatus(p) + "</span>" + (p.status === "tertunda" ? ' <span class="lp-sl">telat ' + teksTelat(p.telatMenit) + "</span>" : "") + "</td></tr>";
    }), 2, "lp-th lp-kem");
  }
  function tabelBesok(m) {
    return tabelPop([["Lewat (WIB)"], ["Satelit"], ["Data siap (WIB)", TIP_SIAP[m.jedaR ? m.jedaR.mode : "bawaan"]]], barisHari(m, 3, function (p) {
      return '<tr><td class="n"><b>' + jam(p.ms) + "</b></td>" + namaSel(p) + sel(celDi(p.data, m.now, p.ms)) + "</tr>";
    }), undefined, "lp-th");
  }
  /* ops = {memuat: true} saat data titik yang lebih panjang sedang diminta (Kemarin) */
  function htmlHari(m, W, ops) {
    var besok = m.mode === "besok", h = besok ? ringBesok(m) : ringKemarin(m);
    if (besok && !m.perkiraan) return '<p class="lp-cat"><span>Perkiraan lintasan belum bisa dihitung.</span></p>';
    if (!m.perkiraan) h += '<p class="lp-cat"><span>Perkiraan lintasan belum bisa dihitung.</span></p>';
    if (m.kurang) h += '<p class="lp-cat">' + (ops && ops.memuat ? "<span>Memuat data titik panas yang lebih panjang…</span>"
      : "<span>Lintasan sebelum " + jam(Math.min(Math.max(m.cakup + COCOK_MS, m.dari), m.sampai)) + " WIB belum bisa dinilai: data titik panas jam itu belum termuat.</span>") + "</p>";   // lintasan pertama yang bisa dinilai = awal cakupan + 20 menit
    var leg = LEGENDA.filter(function (l) { return m.ada[l[0]]; });
    if (leg.length) h += '<div class="lp-leg">' + leg.map(function (l) { var ket = ketLegenda(l, m); return "<span" + (ket ? ' title="' + esc(ket) + '"' : "") + ">" + swatch(l[0]) + "<span>" + l[1] + "</span></span>"; }).join("") + "</div>";
    if (m.baris.length) h += svgGrafik(m, W);
    if (m.semua.length) {
      if (besok) h += '<p class="lp-kos lp-kap lp-kb"><span>' + KET_SIAP_BESOK[m.jedaR ? m.jedaR.mode : "bawaan"] + "</span></p>";
      h += besok ? tabelBesok(m) : tabelKemarin(m);
    }
    return h + '<p class="lp-kaki">' + htmlKaki(m) + "</p>";
  }
  /* daftar Tertunda: <= LIPAT_DI baris tampil semua; lebih dari itu = ringkasan "N lintasan tertunda, <awal> sampai <akhir> WIB" di atas tabel, TERBARU_BARIS baris terbaru terlihat dan sisanya
     (lebih awal, urutan waktu tetap naik) di tbody#lpLebih di balik tombol aria-expanded (pola .fold index.html: tombol + chevron, bukan paginasi: daftar terbatas 24 jam, ringkasan dan baris
     terbaru harus terlihat sekaligus). ops.lebih = terbuka (dipegang pasang() supaya gambar ulang tak menutupnya) */
  var KEPALA_TUNDA = [["Satelit"], ["Lewat (WIB)"], ["Batas tunggu (WIB)"], ["Telat"]];
  var CHEVRON = '<svg class="lp-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  function tabelTunda(m, lebih) {
    var tt = m.tertunda, now = m.now, baris = function (xs) { return xs.map(function (p) { return "<tr>" + namaSel(p) + sel(celHari(p.ms, now)) + sel(celHari(p.batas, now)) + sel(teksTelat(p.telatMenit), true) + "</tr>"; }).join(""); };
    if (tt.length <= LIPAT_DI) return tabelPop(KEPALA_TUNDA, baris(tt), 3);
    var awal = tt.slice(0, tt.length - TERBARU_BARIS), n = awal.length;
    var tombol = '<tr class="lp-lb"><td colspan="4"><button type="button" class="lp-lebih" aria-expanded="' + (lebih ? "true" : "false") + '" aria-controls="lpLebih"><span class="lp-lb-buka">Lihat ' + n +
      ' lintasan lebih awal</span><span class="lp-lb-tutup">Sembunyikan ' + n + " lintasan lebih awal</span>" + CHEVRON + "</button></td></tr>";
    return tabelPop(KEPALA_TUNDA, [[tombol], [baris(awal), ' id="lpLebih"' + (lebih ? "" : " hidden")], [baris(tt.slice(n))]], 3);
  }
  var ringTunda = function (m) { var tt = m.tertunda; return '<p class="lp-ring lp-tl"><span>' + tt.length.toLocaleString("id-ID") + " lintasan tertunda, " + teksHari(tt[0].ms, m.now) + " sampai " + teksHari(tt[tt.length - 1].ms, m.now) + "\u00a0WIB</span></p>"; };
  /* m = susunModel(...) | {belumMuat: true}; W = lebar gambar (px); ops = {memuat} (hanya Kemarin), {lebih} (daftar Tertunda panjang terbuka) */
  function htmlPop(m, W, ops) {
    if (!m || m.belumMuat) return '<p class="lp-ring"><span>Data titik panas belum selesai dimuat.</span></p>';
    if (m.mode === "kemarin" || m.mode === "besok") return htmlHari(m, W, ops);
    var now = m.now, tb = m.terbaru, tl = analisisTelat(m), h = (tl.kita || tl.firms ? htmlTelat(tl, now) : "") + '<p class="lp-ring">';
    h += tb ? "<span>Lintasan terakhir yang datanya sudah masuk:</span> <span>" + (penandaHari(tb.ms, now) || "hari ini") + "</span> <b>" + jam(tb.ms) + '</b> <span translate="no">WIB (' + esc(tb.nama) + ")</span>."
      : "<span>Belum ada lintasan yang datanya masuk dalam " + MUNDUR_JAM + " jam terakhir.</span>";
    if (m.tertunda.length) h += " <span>Lintasan tertunda:</span> <b>" + m.tertunda.length.toLocaleString("id-ID") + "</b>.";
    h += "</p>";
    if (!m.perkiraan) h += '<p class="lp-cat"><span>Perkiraan lintasan belum bisa dihitung.</span></p>';
    var leg = LEGENDA.filter(function (l) { return m.ada[l[0]]; });
    if (leg.length) h += '<div class="lp-leg">' + leg.map(function (l) { var ket = ketLegenda(l, m); return "<span" + (ket ? ' title="' + esc(ket) + '"' : "") + ">" + swatch(l[0]) + "<span>" + l[1] + "</span></span>"; }).join("") + "</div>";
    if (m.baris.length) h += svgGrafik(m, W);
    if (m.perkiraan) {
      h += '<h3 class="lbl lp-h">Tertunda</h3>' + (m.tertunda.length
        ? (m.tertunda.length > LIPAT_DI ? ringTunda(m) : "") + '<p class="lp-kos lp-kap"><span>' + KET_TUNDA + "</span></p>" + tabelTunda(m, ops && ops.lebih)
        : '<p class="lp-kos"><span>Tidak ada lintasan tertunda.</span></p>');
      var kelompokBaris = function (judul, daftar) {
        return daftar.length ? '<tr class="lp-pr"><th scope="rowgroup" colspan="3">' + judul + "</th></tr>" + daftar.map(function (p) {
          return "<tr" + (p.sejak ? ' class="lp-r1"' : "") + ">" + namaSel(p) + sel(celHari(p.ms, now)) + sel(celHari(p.data, now)) + "</tr>" +
            (p.sejak ? '<tr class="lp-r2"><td class="lp-ket" colspan="3"><span>Belum diambil lagi sejak</span> ' + kataHari(penandaHari(p.sejak, now)) + '<span translate="no">' + jam(p.sejak) + " WIB</span>.</td></tr>" : ""); }).join("") : "";
      };
      h += '<h3 class="lbl lp-h">Berikutnya</h3>' + (m.berikutnya.length
        ? tabelPop([["Satelit"], ["Lewat (WIB)"], ["Data siap (WIB)", TIP_SIAP[m.jedaR ? m.jedaR.mode : "bawaan"]]], kelompokBaris("Sudah lewat, menunggu masuk", m.menunggu) + kelompokBaris("Akan lewat", m.akan))
        : '<p class="lp-kos"><span>Tidak ada lintasan dalam ' + MAJU_JAM + " jam ke depan.</span></p>");
    }
    return h + '<p class="lp-kaki">' + htmlKaki(m) + "</p>";
  }

  /* ---------- hitungan (async, irisan + tidur() seperti kartu wilayah; tidak ada tugas panjang) */
  var dataSiap = function () { return typeof S !== "undefined" && S && S.meta && Array.isArray(S.titik) && S.acuan && !isNaN(+S.acuan); };
  /* ms pengambilan data titik terakhir: yang lebih baru dari jam pipeline statis jalan (S.meta.dibuat, ISO +07:00) dan pengambilan /api/titik terakhir yang digabung (S.titikDiambil,
     ditulis titik_live.js); 0 = tak diketahui. Ikut tanda data (sig): cache model 5 menit segar lagi begitu ada pengambilan baru */
  function waktuDiambil() {
    if (typeof S === "undefined" || !S) return 0;
    var t = Math.max(Date.parse(S.meta && S.meta.dibuat) || 0, S.titikDiambil || 0);
    return t > 0 && isFinite(t) ? t : 0;
  }
  var sigData = function () { return dataSiap() ? S.titik.length + "|" + (+S.acuan) + "|" + waktuDiambil() : ""; };
  /* titik acuan nasional (janji di-cache): kotak batas dari SEMUA simpul, simpul uji cakupan dari simpul yang ditipiskan (tiap ke-4); 17 ribu simpul provinsi membuat
     titikDari ~22 ms dingin (tugas panjang di HP), padahal ia toh hanya mengambil ~400 simpul untuk dites ke sapuan seribu kilometer. pusatKotak dan simpulWilayah
     dipisah jeda; gagal tidak di-cache */
  function titikNasional() {
    if (G.nasTitik) return G.nasTitik;
    var janji = G.nasTitik = (async function () {
      var f = typeof S !== "undefined" && S.geo && S.geo.prov && S.geo.prov.features, b = f && pusatKotak(f);
      if (!b) throw new Error("geometri Indonesia kosong");
      await tidur();
      var pts = [], k = 0, jalan = function (c) { if (typeof c[0] === "number") { if (k++ % 4 === 0) pts.push(c); } else for (var i = 0; i < c.length; i++) jalan(c[i]); };
      for (var i = 0; i < f.length; i++) if (f[i].geometry) jalan(f[i].geometry.coordinates);
      var s = simpulWilayah([{geometry: {coordinates: pts}}]);
      if (!s) throw new Error("geometri Indonesia kosong");
      b.simpul = s;
      return b;
    })();
    janji.catch(function () { if (G.nasTitik === janji) G.nasTitik = null; });
    return janji;
  }
  /* lintasan 3 hari WIB (00.00 kemarin sampai 24.00 besok) semua satelit di atas Indonesia, dari jejak yang SAMA dengan kartu wilayah (siapkanJejak); di-cache sepanjang
     hari WIB yang sama (jejak dan elemen orbit tetap), satu hitungan berjalan dipakai bersama. Tiap tampilan (Kemarin, Sekarang, Besok) menyaring jendelanya sendiri di susunModel */
  async function lintasNasional(sat, tle, now) {
    var c = G.nas, hari = hariKe(now);
    if (c && c.tle === tle && c.hari === hari) return c.lintas;
    if (G.nasJanji && G.nasJanji.hari === hari) return G.nasJanji;
    var janji = G.nasJanji = (async function () {
      var titik = await titikNasional(), jejak = await siapkanJejak(sat, tle), hasil = [];
      for (var k = 0; k < tle.satelit.length; k++) {
        var e = tle.satelit[k], kode = kodeSensor(e), tmp = [];
        await tidur();
        await satKeLintasanBertahap(tmp, e, jejak.daftar[k], titik, jejak.t0);
        tmp.forEach(function (p) { p.kode = kode; hasil.push(p); });
      }
      hasil.sort(urutWaktu);
      G.nas = {tle: tle, hari: jejak.hari, lintas: hasil};
      return hasil;
    })();
    janji.hari = hari;
    var lepas = function () { if (G.nasJanji === janji) G.nasJanji = null; };
    janji.then(lepas, lepas);
    return janji;
  }
  /* ms awal cakupan baris S.titik: acuan harian dikurangi jam yang dimuat (hotspot24.json 48 jam, hotspot.json 168 jam; harian.py menambah seluruh hari kemarin, jadi ini batas aman);
     0 = tak diketahui (dianggap lengkap, perilaku lama). Ikut S.acuan0 (acuan harian), bukan S.acuan yang digeser titik_live.js */
  function cakupDari() {
    if (typeof S === "undefined" || !S || !(S.jamTitik > 0)) return 0;
    var a = +(S.acuan0 || S.acuan);
    return a > 0 && isFinite(a) ? a - S.jamTitik * 36e5 : 0;
  }
  /* tanda cache per tampilan: Besok tak bergantung pada data titik (hanya hari WIB); Sekarang = tanda data; Kemarin = tanda data + hari WIB */
  var sigPop = function (mode, now) { return mode === "besok" ? "b|" + hariKe(now) : sigData() + (mode === "kemarin" ? "|k" + hariKe(now) : ""); };
  function modelSegar(mode) {
    var c = G.pop[mode], now = Date.now();
    return c && c.sig === sigPop(mode, now) && now - c.ms < MODEL_SEGAR_MS ? c.model : null;
  }
  async function hitungModel(mode) {
    var besok = mode === "besok";
    if (!besok && !dataSiap()) return {belumMuat: true};
    var segar = modelSegar(mode);
    if (segar) return segar;
    var t0 = Date.now(), sig = sigPop(mode, t0), jd = jendelaHari(mode, t0), tle = null, lintas = null, kel = null;
    try {
      var sat = await muatPustaka(); tle = await muatTle(); await tidur();
      lintas = await lintasNasional(sat, tle, t0);
    } catch (e) {   // pustaka/tle.json/geometri gagal: popover tetap menampilkan riwayat dari baris titik; janji gagal sudah dilepas, jadi buka berikutnya mencoba lagi
      tle = lintas = null;
      if (!G.peringatanPop) { G.peringatanPop = true; console.warn("Lintasan satelit: perkiraan tidak dihitung:", e && e.message || e); }
    }
    await tidur();
    if (!besok) {
      if (!dataSiap()) return {belumMuat: true};
      kel = await kelompokTitikBertahap(jd.dari - COCOK_MS - 6e4);   // Sekarang: now - 24 jam - 21 menit, sama seperti sebelum ada Kemarin/Besok
      await tidur();
      if (!dataSiap()) return {belumMuat: true};
    }
    var now = Date.now(), model = susunModel({now: now, jendela: mode === "sekarang" ? jendelaHari("sekarang", now) : jd, lintas: lintas, satelit: tle && tle.satelit, jeda: tle && tle.jeda, kel: kel || {waktu: {}, hit: {}, terakhir: {}},
      diambil: waktuDiambil(), cakup: mode === "kemarin" ? cakupDari() : 0});
    if (lintas) G.pop[mode] = {ms: Date.now(), sig: sig, model: model};   // sig dari AWAL hitungan: bila data/pengambilan berganti selagi menghitung, buka berikutnya menghitung ulang   // model tanpa perkiraan (gagal) TIDAK di-cache: buka berikutnya mencoba lagi
    return model;
  }
  /* satu hitungan per tampilan berjalan dipakai bersama (buka-tutup-buka cepat); dilepas lewat then, bukan finally: hitungModel bisa selesai sebelum penugasan G.popJanji */
  function modelNasional(mode) {
    mode = mode || "sekarang";
    if (G.popJanji[mode]) return G.popJanji[mode];
    var janji = G.popJanji[mode] = hitungModel(mode), lepas = function () { if (G.popJanji[mode] === janji) delete G.popJanji[mode]; };
    janji.then(lepas, lepas);
    return janji;
  }

  /* ---------- lintasan untuk rentang hari WIB (halaman Data satelit, public/satelit_data.js; keputusan pemilik 28 Okt 2026)
     Jejak nadir SGP4 yang sama dengan popover (langkah 30 detik, sampel sejajar kelipatan 30 detik, jadi lintasan hari yang sama identik), dihitung BLOK demi blok (<= RENTANG_BLOK_HARI hari, tepi
     3 jam di kiri-kanan supaya lintasan di batas blok tidak hilang) dengan jeda tidur() di antara irisan; hasil di-cache per hari WIB selama elemen orbit (tle) yang sama, jadi 7 hari -> 30 hari
     hanya menghitung hari yang belum ada. Elemen orbit TERBARU dipakai untuk hari lampau: ketelitian turun makin jauh ke belakang, karena itu pemanggil hanya memakainya untuk <= RENTANG_MAKS_HARI hari.
     Pemanggilan diantrekan (satu hitungan pada satu waktu). dari/sampai = "YYYY-MM-DD" (tanggal WIB); opsi.kemajuan(0..1) opsional. Hasil: {tle, lintas: [{ms, nama, sensor, jarak, cakup, data, kode}]} urut waktu. */
  var RENTANG_MAKS_HARI = 31, RENTANG_BLOK_HARI = 8, RENTANG_TEPI_MS = 3 * 36e5;
  var awalHariIso = function (s) { var t = tanggalIso(s); return t === null ? null : t - 12 * 36e5 - WIB_MS; };   // 00.00 WIB tanggal itu (ms); null bila bukan tanggal kalender
  async function hitungRentang(dari, sampai, opsi) {
    var batal = opsi && typeof opsi.batal === "function" ? opsi.batal : null, cek = function () { if (batal && batal()) throw galatBatal(); };
    var a = awalHariIso(dari), b = awalHariIso(sampai);
    if (a === null || b === null || b < a) throw new Error("rentang tanggal tidak sah");
    if ((b - a) / HARI_MS + 1 > RENTANG_MAKS_HARI) throw new Error("rentang > " + RENTANG_MAKS_HARI + " hari: perkiraan orbit tidak dihitung");
    var sat = await muatPustaka(), tle = await muatTle(), titik = await titikNasional(), h;
    cek();
    if (!G.rentang || G.rentang.tle !== tle) G.rentang = {tle: tle, hari: {}};
    var C = G.rentang.hari, hariMs = [], blok = [], cur = null;
    for (h = a; h <= b; h += HARI_MS) { hariMs.push(h); if (C[h]) continue; if (cur && h === cur.akhir + HARI_MS && cur.n < RENTANG_BLOK_HARI) { cur.akhir = h; cur.n++; } else blok.push(cur = {awal: h, akhir: h, n: 1}); }
    var total = blok.length * tle.satelit.length, selesai = 0;
    for (var i = 0; i < blok.length; i++) {
      var bl = blok[i], t0 = bl.awal - RENTANG_TEPI_MS, t1 = bl.akhir + HARI_MS + RENTANG_TEPI_MS, n = Math.ceil((t1 - t0) / (LANGKAH_DTK * 1000)) + 1, lintas = [];
      for (var k = 0; k < tle.satelit.length; k++) {
        await tidur(); cek();
        var e = tle.satelit[k], j = {t0: t0, jej: await buatJejakBertahap(sat, e, t0, LANGKAH_DTK, n, batal)}, tmp = [], kode = kodeSensor(e);
        await tidur(); cek();
        await satKeLintasanBertahap(tmp, e, j, titik, t0, batal);
        tmp.forEach(function (p) { p.kode = kode; lintas.push(p); });
        selesai++; if (opsi && typeof opsi.kemajuan === "function") opsi.kemajuan(selesai / total);
      }
      lintas.sort(urutWaktu);
      for (h = bl.awal; h <= bl.akhir; h += HARI_MS) C[h] = [];
      lintas.forEach(function (p) { var d = awalHari(p.ms); if (d >= bl.awal && d <= bl.akhir) C[d].push(p); });
    }
    var out = []; hariMs.forEach(function (d) { out = out.concat(C[d]); });
    return {tle: tle, lintas: out};
  }
  /* opsi.batal() = true -> berhenti di jeda berikutnya dengan galat ber-.batal (antrean basi dilewati tanpa menghitung); blok yang sudah selesai tetap di cache */
  function lintasRentang(dari, sampai, opsi) {
    var jalan = function () { return opsi && typeof opsi.batal === "function" && opsi.batal() ? Promise.reject(galatBatal()) : hitungRentang(dari, sampai, opsi); }, p = (G.rentangRantai || Promise.resolve()).then(jalan, jalan);
    G.rentangRantai = p.catch(function () {});   // galat satu pemanggil tidak memutus antrean
    return p;
  }
  /* kalimat "Jam data siap hanya perkiraan..." di bawah tabel Besok (sama dengan popover/kartu wilayah) */
  var ketSiapBesok = function (m) { return KET_SIAP_BESOK[m && m.jedaR ? m.jedaR.mode : "bawaan"]; };

  /* ---------- DOM: pil #upd (tombol) + #lintasPop. Klik membuka SINKRON (placeholder), hitungan menyusul lewat nanti().
     Kontrol hari Kemarin | Sekarang | Besok (tombol segmen, aria-pressed) dibuat di sini dan, bersama kepala, dibungkus .lp-atas yang lengket di atas saat isi bergulir. Tampilan awal
     mengikuti "Tanggal data" halaman (S.rentang); mengganti hari TIDAK mengubah S.rentang atau peta. Kemarin yang barisnya belum memuat seluruh hari memanggil muatTitik(168) (pemuat index.html) sekali per buka.
     Pendengar keydown/pointerdown/resize/focusout hanya terpasang selama terbuka (satu AbortController, dilepas saat tutup) */
  var HARI_TAB = [["kemarin", "Kemarin"], ["sekarang", "Sekarang"], ["besok", "Besok"]];
  /* ---------- tanda data terlambat di pil #upd: deteksi terbaru (S.acuan) lebih tua dari PIL_TELAT_MS = kelas upd-telat (titik kuning kecil lewat CSS, tetap ada walau titik_live.js menulis ulang
     innerHTML pil) + title dan aria-label diperbarui. Hanya membaca S.acuan, tanpa pustaka orbit. Diperiksa tiap PIL_PERIODE_MS, saat tab tampak lagi, dan saat isi/title pil ditulis (muatData, titik_live):
     MutationObserver hanya membaca dan menulis bila berbeda, jadi tak berputar dengan i18n.js (title EN = terjemahan teks kita: dikenali lewat window.T). Hilang sendiri begitu data baru masuk;
     title aplikasi dipulihkan hanya bila masih tulisan kita (titik_live yang menulis ulang title dibiarkan) */
  function statusPil(acuanMs, now) { var umur = now - acuanMs; return {telat: acuanMs > 0 && isFinite(acuanMs) && umur > PIL_TELAT_MS, umur: umur}; }
  /* title = aria-label: diawali label yang TAMPAK di pil (WCAG 2.5.3 label in name), lalu fakta; "data diolah" = waktu ambil terakhir (menggantikan info title titik_live yang ditimpa) */
  var teksPil = function (acuanMs, now, label, diolahMs) {
    return label + ". Titik panas terbaru " + teksTelat((now - acuanMs) / 6e4) + " lalu; belum ada data baru dari FIRMS" + (diolahMs > 0 ? "; data diolah " + teksHari(diolahMs, now) + " WIB" : "");
  };
  function pasangTanda(pil) {
    var ditulis = null, terj = function (t) { return typeof window !== "undefined" && typeof window.T === "function" ? window.T(t) : t; };
    var milikku = function (v) { return ditulis !== null && v !== null && (v === ditulis || v === terj(ditulis)); };
    var periksa = function () {
      var ms = typeof S !== "undefined" && S && S.acuan ? +S.acuan : NaN, now = Date.now(), st = statusPil(ms, now), cur = pil.getAttribute("title");
      if (st.telat) {
        var label = (pil.textContent || "").replace(/\s+/g, " ").trim();
        if (!label || /Memuat/.test(label)) label = "Data " + teksHari(ms, now) + " WIB";
        var t = teksPil(ms, now, label, waktuDiambil());
        pil.classList.add("upd-telat");
        if (t !== ditulis || !milikku(cur) || !milikku(pil.getAttribute("aria-label"))) { ditulis = t; pil.setAttribute("title", t); pil.setAttribute("aria-label", t); }
      } else if (ditulis !== null) {
        var punya = milikku(cur), ac = waktuDiambil();
        pil.classList.remove("upd-telat"); if (milikku(pil.getAttribute("aria-label"))) pil.removeAttribute("aria-label");
        ditulis = null;
        if (punya) { if (ac > 0 && typeof jamWIB === "function") pil.setAttribute("title", "Lintasan satelit terakhir; diolah " + jamWIB(ac)); else pil.removeAttribute("title"); }
      }
    };
    periksa();
    if (typeof MutationObserver === "function") new MutationObserver(periksa).observe(pil, {childList: true, attributes: true, attributeFilter: ["title"]});
    setInterval(function () { if (!document.hidden) periksa(); }, PIL_PERIODE_MS);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) periksa(); });
  }
  function pasang() {
    var pil = document.getElementById("upd"), pop = document.getElementById("lintasPop");
    if (!pil || !pop || pil.tagName !== "BUTTON" || pil._lintas) return;
    pil._lintas = true; pasangTanda(pil);
    var isi = pop.querySelector(".lp-isi"), kepala = pop.querySelector(".lp-kepala"), tombolX = pop.querySelector(".lp-x"), buka = false, gen = 0, model = null, lebarGbr = 0, rz = 0, ulang = 0, ac = null;
    var mode = "sekarang", muatJalan = false, sudahMuat = false, lebih = false;   // lebih = daftar Tertunda panjang terbuka (reset tiap popover dibuka)
    var atas = document.createElement("div"), seg = document.createElement("div");
    atas.className = "lp-atas"; seg.className = "seg penuh lp-seg"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Hari lintasan");
    seg.innerHTML = HARI_TAB.map(function (t) { return '<button type="button" data-hari="' + t[0] + '" aria-pressed="false"><span class="lp-hl">' + t[1] + '</span><span class="lp-ht" translate="no"></span></button>'; }).join("");
    pop.insertBefore(atas, kepala); atas.appendChild(kepala); atas.appendChild(seg);
    var tombolHari = Array.prototype.slice.call(seg.querySelectorAll("button"));
    var segarSeg = function () {   // aria-pressed + tanggal singkat tiap hari (dihitung tiap dibuka: hari WIB bisa berganti)
      var now = Date.now(), a = awalHari(now), tgl = {kemarin: a - HARI_MS / 2, sekarang: now, besok: a + HARI_MS * 1.5};
      tombolHari.forEach(function (b) { var v = b.getAttribute("data-hari"), t = b.querySelector(".lp-ht"), s = tglPendek(tgl[v]); b.setAttribute("aria-pressed", String(v === mode)); if (t.textContent !== s) t.textContent = s; });
    };
    var lebar = function () { var v = window.innerWidth; return Math.max(300, (v <= LEMBAR_PX ? v : Math.min(560, v)) - 28); };   // lebar isi: lembar penuh <= 768 px, selain itu popover 560 px
    var gambar = function () { lebarGbr = lebar(); isi.innerHTML = htmlPop(model, lebarGbr, {memuat: muatJalan, lebih: lebih}); };
    var taruh = function () {   // desktop: tepi kanan popover = tepi kanan pil; <= 768 px: CSS membuat lembar selebar layar dan mengabaikan variabel ini
      var r = pil.getBoundingClientRect(), w = Math.min(560, window.innerWidth - 16);
      pop.style.setProperty("--lp-x", Math.round(Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))) + "px");
      pop.style.setProperty("--lp-y", Math.round(r.bottom + 8) + "px");
    };
    var tutup = function (fokus) {
      if (!buka) return;
      buka = false; gen++; clearTimeout(ulang); ac.abort(); ac = null;
      pop.hidden = true; pil.setAttribute("aria-expanded", "false");
      if (fokus) pil.focus();
    };
    /* Kemarin yang barisnya belum memuat seluruh hari (data awal 48 jam tak cukup): minta data lebih panjang SEKALI per buka lewat pemuat index.html, tampilkan status memuat, lalu hitung ulang.
       Gagal = catatan "belum termuat" tetap tampil dan lintasan yang barisnya hilang bertanda "Data belum termuat" (bukan "tanpa deteksi") */
    var perluData = function () {
      if (mode !== "kemarin" || !model || !model.kurang || sudahMuat || typeof muatTitik !== "function" || (typeof S !== "undefined" && S.titikPenuh)) return;
      sudahMuat = muatJalan = true; gambar();
      var selesai = function () { muatJalan = false; if (buka && mode === "kemarin") tampilkan(); };
      Promise.resolve().then(function () { return muatTitik(168); }).then(selesai, selesai);
    };
    /* hitung lalu gambar; data titik belum ada saat pil diklik: coba lagi tiap detik selama popover masih terbuka (tidak terkunci di pesan "belum dimuat") */
    var isiPop = function (id) {
      modelNasional(mode).then(function (m) {
        if (id !== gen || !buka) return;
        model = m; gambar();
        if (m.belumMuat) ulang = setTimeout(function () { if (id === gen && buka) isiPop(id); }, 1000);
        else perluData();
      }, function (e) { console.warn("Lintasan satelit:", e && e.message || e); });
    };
    /* tampilan hari aktif: dari cache bila segar (sinkron, hanya menyusun string), kalau tidak placeholder lalu hitung lewat nanti() */
    var tampilkan = function () {
      var id = ++gen, c = modelSegar(mode);
      clearTimeout(ulang);
      if (c) { model = c; gambar(); perluData(); return; }
      model = null; isi.innerHTML = '<p class="lp-ring"><span>Menghitung lintasan…</span></p>';
      var jalan = function () { isiPop(id); };
      typeof nanti === "function" ? nanti(jalan) : setTimeout(jalan, 120);
    };
    var bukaPop = function () {
      buka = true; sudahMuat = false; lebih = false;
      mode = modeAwal(typeof S !== "undefined" && S ? S.rentang : "hari");
      ac = new AbortController();
      var sg = {signal: ac.signal}, keluar = function (e) { var t = e.relatedTarget; if (buka && t && !pop.contains(t) && t !== pil) tutup(false); };   // papan ketik: Tab keluar dari popover/pil menutupnya
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); tutup(true); } }, sg);
      document.addEventListener("pointerdown", function (e) { if (!pop.contains(e.target) && !pil.contains(e.target)) tutup(false); }, {signal: ac.signal, capture: true});
      pop.addEventListener("focusout", keluar, sg); pil.addEventListener("focusout", keluar, sg);
      window.addEventListener("resize", function () {   // gambar ulang hanya bila lebar gambar berubah; taruh() hanya untuk popover desktop
        if (rz) return;
        rz = requestAnimationFrame(function () { rz = 0; if (!buka) return; if (window.innerWidth > LEMBAR_PX) taruh(); if (model && lebar() !== lebarGbr) gambar(); });
      }, sg);
      pil.setAttribute("aria-expanded", "true"); segarSeg(); taruh(); pop.hidden = false;
      tampilkan();
      pop.focus({preventScroll: true});
    };
    /* ganti hari: tombol berubah seketika (aria-pressed), isi dari cache atau dihitung menyusul; peta dan "Tanggal data" tidak disentuh */
    seg.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-hari]"), v = b && b.getAttribute("data-hari");
      if (!buka || !v || v === mode) return;
      mode = v; segarSeg(); pop.scrollTop = 0; tampilkan();
    });
    /* daftar Tertunda yang panjang: baris lebih awal dibuka/ditutup hanya lewat atribut (aria-expanded + hidden), tanpa menggambar ulang, jadi klik langsung terasa */
    isi.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button.lp-lebih"), t = b && isi.querySelector("#lpLebih");
      if (!b) return;
      lebih = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", String(lebih)); if (t) t.hidden = !lebih;
    });
    /* kaki popover: tautan ke tab tersembunyi Data satelit (riwayat lintasan, kedatangan data, deteksi per satelit). Klik biasa menutup popover lalu membuka tab tanpa memuat ulang halaman
       (bukaTab dari index.html); klik dengan Ctrl/Cmd/Shift atau tombol tengah dibiarkan membuka /satelit di tab peramban baru */
    var lanjut = document.createElement("p"), tautan;
    lanjut.className = "lp-lanjut"; lanjut.innerHTML = '<a class="lp-detail" href="/satelit">Lihat detail data satelit →</a>'; pop.appendChild(lanjut);
    tautan = lanjut.firstChild;
    tautan.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || typeof bukaTab !== "function") return;
      e.preventDefault(); tutup(false); bukaTab("satelit");
    });
    pil.addEventListener("click", function () { buka ? tutup(false) : bukaPop(); });
    tombolX.addEventListener("click", function () { tutup(true); });
    var pra = function (e) { if (pra.s || (e.pointerType && e.pointerType !== "mouse")) return; pra.s = 1; muatPustaka().catch(function () {}); muatTle().catch(function () {}); };   // pustaka + tle.json dimuat begitu pil disentuh
    pil.addEventListener("pointerenter", pra); pil.addEventListener("focus", pra);
    window.addEventListener("bahasa", function () { segarSeg(); if (buka && model) gambar(); });   // ID <-> EN: tanggal singkat tombol dan isi digambar ulang dengan format locale baru
  }
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang); else pasang(); }

  g.SatelitLintas = {kartu: kartu, hitung: hitungSemua, buatJejak: buatJejak, cariLintasan: cariLintasan, pusatKotak: pusatKotak, jarakKm: jarakKm, jam: jam, penanda: penanda,
    titik: titikDari, simpul: simpulWilayah, selubung: selubung, cakupan: hitungCakupan, satKeLintasan: satKeLintasan, hitungJejak: hitungJejak, lintasWilayah: lintasWilayah, htmlKartu: htmlKartu,
    potong: potong, isiKartu: isiKartu, siapkanJejak: siapkanJejak,
    pop: {ambangMs: ambangMs, waktuDiambil: waktuDiambil, sigData: sigData, kodeSensor: kodeSensor, namaKode: namaKode, kelompokTitik: kelompokTitik, kelompokTitikBertahap: kelompokTitikBertahap, cocokkan: cocokkan, lintasDariWaktu: lintasDariWaktu, klasifikasi: klasifikasi, susunModel: susunModel, htmlPop: htmlPop, svgGrafik: svgGrafik, judulLintas: judulLintas, teksTelat: teksTelat, htmlKaki: htmlKaki, ringkasJeda: ringkasJeda, htmlJeda: htmlJeda,
      analisisTelat: analisisTelat, htmlTelat: htmlTelat, tabelTunda: tabelTunda, statusPil: statusPil, teksPil: teksPil,
      jendelaHari: jendelaHari, awalHari: awalHari, modeAwal: modeAwal, kelompokPeriode: kelompokPeriode, ringkasKemarin: ringkasKemarin, ringkasBesok: ringkasBesok, cakupDari: cakupDari, tglPendek: tglPendek,
      lintasNasional: lintasNasional, modelNasional: modelNasional, titikNasional: titikNasional, pasang: pasang,
      /* halaman Data satelit (public/satelit_data.js): tabel yang sama dengan popover (hari lampau/hari ini = tabelKemarin, besok = tabelBesok), legenda status, perkiraan lintasan satu rentang */
      lintasRentang: lintasRentang, tabelKemarin: tabelKemarin, tabelBesok: tabelBesok, swatch: swatch, labelStatus: labelStatus, legenda: LEGENDA, ketLegenda: ketLegenda, ketDeteksi: ketDeteksi,
      ketSiapBesok: ketSiapBesok, tanggalIso: tanggalIso, awalHariIso: awalHariIso},
    konstanta: {pustaka: PUSTAKA, sri: SRI, horizonJam: HORIZON_JAM, jejakJam: JEJAK_MUNDUR_JAM + JEJAK_MAJU_JAM, langkahDtk: LANGKAH_DTK, irisan: IRISAN, mundurJam: MUNDUR_JAM, majuJam: MAJU_JAM, cocokMs: COCOK_MS, rentangMaksHari: RENTANG_MAKS_HARI}};
})(typeof window !== "undefined" ? window : globalThis);
