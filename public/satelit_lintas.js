/* Kartu "Satelit berikutnya di <wilayah>" di panel wilayah halaman karhutla (keputusan pemilik 16 Okt 2026,
   docs/multi-bencana/RENCANA-20-JAM.md §6 butir 7).
   - Elemen orbit dibaca dari data/tle.json (scripts/data/tle.py, CelesTrak GP, harian). Lebar sapuan dan jeda data tiap satelit
     DIBACA dari JSON itu (jeda_data_menit + jeda_sumber terukur/bawaan + blok jeda; kaki: terukur = waktu sampai data tampil di aplikasi (median), bawaan = "jeda aman");
     tidak ada angka satelit di berkas ini.
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
   - Berkas yang sama juga menggerakkan popover "Lintasan satelit di atas Indonesia" dari pil jam data di header (bagian bawah berkas; gaya di satelit_lintas.css).
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
  /* kalimat jeda di kaki (r = ringkasJeda). Semua bawaan = kalimat lama persis ("jeda aman VIIRS 3 jam, MODIS 2 jam (diukur ...); bisa lebih lama bila satelit telat.");
     huruf kecil di kartu (sesudah " · "), kapital di popover (awal kalimat). Ada yang terukur: "waktu sampai data tampil di aplikasi, median 14 hari terakhir (14 Okt sampai 27 Okt 2026;
     aplikasi mengambil data tiap 3 jam): VIIRS 3,5 jam, MODIS 2,5 jam. Bisa lebih lama bila satelit telat."; satelit bawaan menyusul sebagai kalimat sendiri */
  function htmlJeda(r, kapital) {
    var item = function (g, nilai) { return "<span>" + esc(g.nama) + " " + nilai + " jam</span>"; };
    var aman = function (awal) {
      return "<span>" + (awal ? "Jeda aman" : "jeda aman") + "</span> " + r.bawaan.map(function (g) { return item(g, angkaJam(g.awal)); }).join(", ") +
        (r.diukur ? " <span>(diukur " + esc(r.diukur) + "); bisa lebih lama bila satelit telat.</span>" : ". <span>Bisa lebih lama bila satelit telat.</span>");
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
  function htmlKartu(h) {
    if (!h || h.kosong) return "";
    var now = Date.now(), daftar = h.lintas.filter(function (p) { return p.ms > now; }).slice(0, BARIS);
    if (!daftar.length) return "";
    var a = daftar[0], epoch = Infinity, jd = ringkasJeda(h.satelit, h.jeda, now);
    h.satelit.forEach(function (e) { epoch = Math.min(epoch, Date.parse(e.epoch)); });
    var bln = new Date(epoch).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
    var baris = daftar.map(function (p) {
      return "<tr><td>" + celJam(p.ms, now) + '</td><td translate="no">' + esc(p.nama) + "</td><td><span>" + p.cakup + "</span></td><td>" + celJam(p.data, now) + "</td></tr>";
    }).join("");
    return '<div class="asap-k lintas-k kotak-p"><div class="lbl"><span style="font-weight:700;color:var(--ink)">' + IKON + "Satelit berikutnya di " +
      '<span translate="no">' + esc(namaWilayah()) + "</span></span></div>" +
      "<div>" + esc(a.nama) + " lewat " + teksJam(a.ms, now) + " WIB, data biasanya siap " + teksJam(a.data, now) + " WIB.</div>" +
      '<table style="table-layout:auto"><tr><td title="Jam satelit paling dekat ke tengah kotak batas wilayah">Lewat (WIB)</td><td>Satelit</td>' +
      '<td title="seluruh: semua batas wilayah ada di dalam jalur sapuan; sebagian: hanya sebagian wilayah tersapu">Cakupan</td>' +
      '<td title="' + esc(TIP_SIAP[jd.mode]) + '">Data siap (WIB)</td></tr>' +
      baris + "</table>" +
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
      G.hasil.set(kunci, {lintas: lintas, satelit: tle.satelit, jeda: tle.jeda, t0: jejak.t0});
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
     "Deteksi" = baris keyakinan >= S.kmin (sedang+tinggi, sama dengan halaman metode); baris keyakinan rendah tetap menentukan deteksi terakhir.
     Fungsi murni (kelompokTitik, cocokkan, klasifikasi, susunModel, htmlPop) tanpa DOM supaya bisa diuji dari node; DOM hanya di pasang(). */
  var MUNDUR_JAM = 24, MAJU_JAM = 12, IRISAN_BARIS = 40000, COCOK_MS = 20 * 6e4, CELAH_MS = 45 * 6e4, MODEL_SEGAR_MS = 5 * 6e4, NASIONAL_SEGAR_MS = 30 * 6e4, DEPAN = 5, KISI_MS = 6 * 36e5, LEMBAR_PX = 768;
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
     DIHITUNG per indeks lintasan dan terakhir[i] = waktu deteksi terbaru (apa pun keyakinannya) yang teratribusi ke lintasan i (-Infinity bila tak ada) */
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
        if (!ht || ht[a]) cacah[best]++;
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
  /* o = {now, lintas: lintasan hitungan SGP4 | null (gagal), satelit: tle.satelit | null, baris: S.titik, acuanMs: +S.acuan, kmin, kel: hasil kelompokTitik (opsional),
     diambil: ms pengambilan data terakhir (opsional), jeda: blok jeda tle.json (opsional)} -> model untuk htmlPop (model.diambil = ms | null; model.jedaR = ringkasJeda) */
  function susunModel(o) {
    var now = o.now, dari = now - MUNDUR_JAM * 36e5, sampai = now + MAJU_JAM * 36e5, satelit = o.lintas ? o.satelit || [] : [];
    var kel = o.kel || kelompokTitik(o.baris || [], o.acuanMs, dari - COCOK_MS, o.kmin === undefined ? 1 : o.kmin);
    var ambangSat = {}, diambil = o.diambil > 0 && isFinite(o.diambil) ? Math.min(o.diambil, now) : null;
    satelit.forEach(function (e) { ambangSat[e.nama] = ambangMs(e); });
    var lintas = (o.lintas || []).filter(function (p) { return p.ms >= dari && p.ms <= sampai; }).map(function (p) { return {ms: p.ms, nama: p.nama, kode: p.kode, data: p.data, ambang: ambangSat[p.nama]}; });
    var cc = cocokkan(lintas, kel.waktu, kel.hit), bersama = {}, terSat = {}, ters;
    satelit.forEach(function (e) { var k = kodeSensor(e); if (k) bersama[k] = (bersama[k] || 0) + 1; });   // kode dipakai > 1 satelit (M): deteksi terakhir per satelit dari baris teratribusi
    lintas.forEach(function (p, i) { if (cc.terakhir[i] > (terSat[p.nama] === undefined ? -Infinity : terSat[p.nama])) terSat[p.nama] = cc.terakhir[i]; });
    ters = lintas.map(function (p) { return bersama[p.kode] > 1 ? terSat[p.nama] : kel.terakhir[p.kode]; });
    klasifikasi(lintas, cc.cacah, ters, now, diambil);
    var baris = satelit.map(function (e) { return {nama: e.nama, kode: kodeSensor(e), riwayat: false, lintas: lintas.filter(function (p) { return p.nama === e.nama; })}; });
    var punya = {};
    satelit.forEach(function (e) { var k = kodeSensor(e); if (k) punya[k] = true; });
    Object.keys(kel.waktu).filter(function (k) { return !punya[k] && namaKode(k) !== k; }).sort(urutKode).forEach(function (k) {
      baris.push({nama: namaKode(k), kode: k, riwayat: true, lintas: lintasDariWaktu(k, kel.waktu[k], kel.hit[k]).filter(function (p) { return p.ms >= dari && p.ms <= now; })});
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
    return {now: now, dari: dari, sampai: sampai, perkiraan: satelit.length > 0, baris: baris, tertunda: oleh("tertunda"), berikutnya: oleh("menunggu").concat(oleh("perkiraan")).slice(0, DEPAN),
      terbaru: terbaru || null, ada: ada, epoch: epoch, jedaR: ringkasJeda(satelit, o.jeda, now), diambil: diambil};
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
    if (p.riwayat) return p.nama + ", jam deteksi " + teksHari(p.ms, now) + " WIB: " + (p.n ? p.n.toLocaleString("id-ID") + " deteksi" : "masuk, tanpa deteksi");
    var awal = p.nama + " " + teksHari(p.ms, now) + " WIB: ";
    if (p.status === "masuk") return awal + p.n.toLocaleString("id-ID") + " deteksi";
    if (p.status === "masuk0") return awal + "masuk, tanpa deteksi";
    if (p.status === "tertunda") return awal + "tertunda, telat " + teksTelat(p.telatMenit);
    return p.nama + " lewat " + teksHari(p.ms, now) + " WIB, data biasanya siap " + teksHari(p.data, now) + " WIB." + (p.status === "menunggu" ? " Menunggu masuk." + (p.sejak ? " Belum diambil lagi sejak " + teksHari(p.sejak, now) + " WIB." : "") : "");
  }
  var JARI = {masuk: 5, masuk0: 2.8, tertunda: 4.5, menunggu: 4.5, perkiraan: 4.5};
  var KET_TUNDA = "Belum ada deteksi yang masuk sesudah lintasan ini, padahal biasanya sudah siap.";
  var LEGENDA = [["masuk", "Data masuk", ""], ["masuk0", "Data masuk, tanpa deteksi", "Ada deteksi yang masuk sesudah lintasan ini, tetapi tidak ada satu pun di jendela lintasan ini; bukan bukti tidak ada api"],
    ["tertunda", "Tertunda", KET_TUNDA], ["menunggu", "Menunggu masuk", KET_MENUNGGU.bawaan], ["perkiraan", "Perkiraan lintasan", ""]];   // keterangan "menunggu" menurut m.jedaR.mode (ketLegenda)
  var ketLegenda = function (l, m) { return l[0] === "menunggu" ? KET_MENUNGGU[m.jedaR ? m.jedaR.mode : "bawaan"] : l[2]; };

  function svgGrafik(m, W) {
    var L = 64, R = 12, T = 22, RH = 26, B = 30, n = m.baris.length, dasar = T + n * RH, H = dasar + B, lebar = W - L - R, rentang = m.sampai - m.dari;
    var X = function (ms) { return Math.round((L + (ms - m.dari) / rentang * lebar) * 10) / 10; }, Y = function (i) { return T + i * RH + RH / 2; };
    var s = '<svg class="lp-g" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc("Garis waktu lintasan satelit: " + MUNDUR_JAM + " jam ke belakang sampai " + MAJU_JAM + " jam ke depan") + '">';
    m.baris.forEach(function (b, i) { if (i % 2 === 0) s += '<rect class="lp-z" x="0" y="' + (T + i * RH) + '" width="' + W + '" height="' + RH + '"/>'; });
    for (var t = Math.ceil((m.dari + WIB_MS) / KISI_MS) * KISI_MS - WIB_MS; t <= m.sampai; t += KISI_MS) {
      var x = X(t), tengah = jam(t) === "00.00";
      s += '<line class="lp-k' + (tengah ? " lp-k0" : "") + '" x1="' + x + '" y1="' + T + '" x2="' + x + '" y2="' + dasar + '"/><text class="lp-tk" translate="no" x="' + x + '" y="' + (dasar + 12) + '" text-anchor="middle">' + jam(t) + "</text>";
      if (tengah) s += '<text class="lp-tk lp-tg" translate="no" x="' + x + '" y="' + (dasar + 24) + '" text-anchor="middle">' +
        esc(new Date(t).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"})) + "</text>";
    }
    var xn = X(m.now);
    s += '<line class="lp-now" x1="' + xn + '" y1="' + (T - 5) + '" x2="' + xn + '" y2="' + dasar + '"/><text class="lp-nowt" x="' + xn + '" y="' + (T - 9) + '" text-anchor="middle">sekarang</text>';
    m.baris.forEach(function (b, i) {
      var y = Y(i);
      s += '<text class="lp-n" translate="no" x="6" y="' + (y + 3.5) + '">' + esc(b.nama) + "</text>";
      if (b.riwayat && m.perkiraan) s += '<text class="lp-tp" x="' + (xn + 8) + '" y="' + (y + 3.5) + '">tanpa perkiraan</text>';
      b.lintas.forEach(function (p) {
        var cx = X(p.ms);
        if (p === m.terbaru) s += '<circle class="lp-halo" cx="' + cx + '" cy="' + y + '" r="9"/><text class="lp-tb" translate="no" x="' + cx + '" y="' + (y - 11) + '" text-anchor="middle">' + jam(p.ms) + "</text>";
        s += '<circle class="m-' + p.status + '" cx="' + cx + '" cy="' + y + '" r="' + JARI[p.status] + '"><title>' + esc(judulLintas(p, m.now)) + "</title></circle>";
      });
    });
    return s + "</svg>";
  }
  var swatch = function (st) { return '<svg class="lp-sw" viewBox="0 0 14 14" aria-hidden="true"><circle class="m-' + st + '" cx="7" cy="7" r="' + JARI[st] + '"/></svg>'; };
  /* kepala = [teks, tooltip?]; kolom pertama = satelit; kolom ke-`kanan` (bila ada) rata kanan (kolom Telat), selebihnya rata kiri */
  function tabelPop(kepala, isi, kanan) {
    return '<table class="lp-t"><thead><tr>' + kepala.map(function (h, i) {
      return '<th scope="col"' + (i === kanan ? ' class="t"' : i ? ' class="n"' : "") + (h[1] ? ' title="' + esc(h[1]) + '"' : "") + ">" + h[0] + "</th>";
    }).join("") + "</tr></thead><tbody>" + isi + "</tbody></table>";
  }
  var sel = function (x, kanan) { return '<td class="' + (kanan ? "t" : "n") + '">' + x + "</td>"; };
  var namaSel = function (p) { return '<td translate="no">' + esc(p.nama) + "</td>"; };
  /* kaki: sumber, epoch elemen orbit dan jeda (terukur/bawaan) dibaca dari tle.json (lewat model), definisi jam dan deteksi */
  function htmlKaki(m) {
    var tgl = function (ms) { return new Date(ms).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"}); }, h = "";
    if (m.perkiraan && m.epoch) {
      var a = m.epoch[0], b = m.epoch[1];
      h += '<span>Sumber: elemen orbit CelesTrak, epoch</span> <span translate="no">' + esc(tgl(a) + " " + jam(a)) + "</span> <span>sampai</span> <span translate=\"no\">" +
        esc((tgl(b) !== tgl(a) ? tgl(b) + " " : "") + jam(b)) + " WIB</span>. <span>Dihitung di peramban.</span> ";
    }
    h += "<span>Status dari deteksi terakhir tiap satelit di NASA FIRMS.</span> ";
    if (m.diambil) h += "<span>Data FIRMS terakhir diambil</span> " + kataHari(penandaHari(m.diambil, m.now)) + '<span translate="no">' + jam(m.diambil) + " WIB</span>. ";
    if (m.perkiraan) h += "<span>Jam lintasan = saat satelit paling dekat ke tengah Indonesia (perkiraan).</span> ";
    if (m.baris.some(function (b) { return b.riwayat; })) h += "<span>Baris tanpa perkiraan memakai jam deteksi (median).</span> ";
    h += "<span>Deteksi = baris FIRMS berkeyakinan sedang dan tinggi, bukan lokasi unik.</span>";
    if (m.perkiraan && m.jedaR && (m.jedaR.terukur.length || m.jedaR.bawaan.length)) h += " " + htmlJeda(m.jedaR, true);
    return h;
  }
  /* m = susunModel(...) | {belumMuat: true}; W = lebar gambar (px) */
  function htmlPop(m, W) {
    if (!m || m.belumMuat) return '<p class="lp-ring"><span>Data titik panas belum selesai dimuat.</span></p>';
    var now = m.now, tb = m.terbaru, h = '<p class="lp-ring">';
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
        ? '<p class="lp-kos lp-kap"><span>' + KET_TUNDA + "</span></p>" + tabelPop([["Satelit"], ["Lewat (WIB)"], ["Batas tunggu (WIB)"], ["Telat"]],
          m.tertunda.map(function (p) { return "<tr>" + namaSel(p) + sel(celHari(p.ms, now)) + sel(celHari(p.batas, now)) + sel(teksTelat(p.telatMenit), true) + "</tr>"; }).join(""), 3)
        : '<p class="lp-kos"><span>Tidak ada lintasan tertunda.</span></p>');
      h += '<h3 class="lbl lp-h">Berikutnya</h3>' + (m.berikutnya.length
        ? tabelPop([["Satelit"], ["Lewat (WIB)"], ["Data siap (WIB)", TIP_SIAP[m.jedaR ? m.jedaR.mode : "bawaan"]]], m.berikutnya.map(function (p) {
          return "<tr" + (p.sejak ? ' class="lp-r1"' : "") + ">" + namaSel(p) + sel(celHari(p.ms, now) + (p.status === "menunggu" ? ' <span class="lp-sl">sudah lewat</span>' : "")) + sel(celHari(p.data, now)) + "</tr>" +
            (p.sejak ? '<tr class="lp-r2"><td class="lp-ket" colspan="3"><span>Belum diambil lagi sejak</span> ' + kataHari(penandaHari(p.sejak, now)) + '<span translate="no">' + jam(p.sejak) + " WIB</span>.</td></tr>" : ""); }).join(""))
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
  /* lintasan 36 jam (now-24 jam .. now+12 jam) semua satelit di atas Indonesia; di-cache 30 menit, satu hitungan berjalan dipakai bersama */
  async function lintasNasional(sat, tle, now) {
    var c = G.nas;
    if (c && c.tle === tle && now - c.dibuat < NASIONAL_SEGAR_MS) return c.lintas;
    if (G.nasJanji) return G.nasJanji;
    var janji = G.nasJanji = (async function () {
      var titik = await titikNasional();
      var t0 = Math.floor((now - MUNDUR_JAM * 36e5) / 3e4) * 3e4, n = (MUNDUR_JAM + MAJU_JAM) * 3600 / LANGKAH_DTK + 1, hasil = [];
      for (var k = 0; k < tle.satelit.length; k++) {
        var e = tle.satelit[k], kode = kodeSensor(e), tmp = [];
        await tidur();
        var jej = await buatJejakBertahap(sat, e, t0, LANGKAH_DTK, n);
        await tidur();
        satKeLintasan(tmp, e, {t0: t0, jej: jej}, titik, t0);
        tmp.forEach(function (p) { p.kode = kode; hasil.push(p); });
      }
      hasil.sort(urutWaktu);
      G.nas = {tle: tle, dibuat: now, lintas: hasil};
      return hasil;
    })();
    var lepas = function () { if (G.nasJanji === janji) G.nasJanji = null; };
    janji.then(lepas, lepas);
    return janji;
  }
  async function hitungModel() {
    if (!dataSiap()) return {belumMuat: true};
    var sig = sigData(), c = G.pop;
    if (c && c.sig === sig && Date.now() - c.ms < MODEL_SEGAR_MS) return c.model;
    var tle = null, lintas = null;
    try {
      var sat = await muatPustaka(); tle = await muatTle(); await tidur();
      lintas = await lintasNasional(sat, tle, Date.now());
    } catch (e) {   // pustaka/tle.json/geometri gagal: popover tetap menampilkan riwayat dari baris titik; janji gagal sudah dilepas, jadi buka berikutnya mencoba lagi
      tle = lintas = null;
      if (!G.peringatanPop) { G.peringatanPop = true; console.warn("Lintasan satelit: perkiraan tidak dihitung:", e && e.message || e); }
    }
    await tidur();
    if (!dataSiap()) return {belumMuat: true};
    var kel = await kelompokTitikBertahap(Date.now() - (MUNDUR_JAM * 36e5 + COCOK_MS) - 6e4);
    await tidur();
    if (!dataSiap()) return {belumMuat: true};
    var model = susunModel({now: Date.now(), lintas: lintas, satelit: tle && tle.satelit, jeda: tle && tle.jeda, kel: kel, diambil: waktuDiambil()});
    if (lintas) G.pop = {ms: Date.now(), sig: sig, model: model};   // sig dari AWAL hitungan: bila data/pengambilan berganti selagi menghitung, buka berikutnya menghitung ulang   // model tanpa perkiraan (gagal) TIDAK di-cache: buka berikutnya mencoba lagi
    return model;
  }
  /* satu hitungan berjalan dipakai bersama (buka-tutup-buka cepat); dilepas lewat then, bukan finally: hitungModel bisa selesai sebelum penugasan G.popJanji */
  function modelNasional() {
    if (G.popJanji) return G.popJanji;
    var janji = G.popJanji = hitungModel(), lepas = function () { if (G.popJanji === janji) G.popJanji = null; };
    janji.then(lepas, lepas);
    return janji;
  }

  /* ---------- DOM: pil #upd (tombol) + #lintasPop. Klik membuka SINKRON (placeholder), hitungan menyusul lewat nanti().
     Pendengar keydown/pointerdown/resize/focusout hanya terpasang selama terbuka (satu AbortController, dilepas saat tutup) */
  function pasang() {
    var pil = document.getElementById("upd"), pop = document.getElementById("lintasPop");
    if (!pil || !pop || pil.tagName !== "BUTTON" || pil._lintas) return;
    pil._lintas = true;
    var isi = pop.querySelector(".lp-isi"), tombolX = pop.querySelector(".lp-x"), buka = false, gen = 0, model = null, lebarGbr = 0, rz = 0, ulang = 0, ac = null;
    var lebar = function () { var v = window.innerWidth; return Math.max(300, (v <= LEMBAR_PX ? v : Math.min(560, v)) - 28); };   // lebar isi: lembar penuh <= 768 px, selain itu popover 560 px
    var gambar = function () { lebarGbr = lebar(); isi.innerHTML = htmlPop(model, lebarGbr); };
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
    /* hitung lalu gambar; data titik belum ada saat pil diklik: coba lagi tiap detik selama popover masih terbuka (tidak terkunci di pesan "belum dimuat") */
    var isiPop = function (id) {
      modelNasional().then(function (m) {
        if (id !== gen || !buka) return;
        model = m; gambar();
        if (m.belumMuat) ulang = setTimeout(function () { if (id === gen && buka) isiPop(id); }, 1000);
      }, function (e) { console.warn("Lintasan satelit:", e && e.message || e); });
    };
    var bukaPop = function () {
      buka = true; var id = ++gen, c = G.pop;
      ac = new AbortController();
      var sg = {signal: ac.signal}, keluar = function (e) { var t = e.relatedTarget; if (buka && t && !pop.contains(t) && t !== pil) tutup(false); };   // papan ketik: Tab keluar dari popover/pil menutupnya
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); tutup(true); } }, sg);
      document.addEventListener("pointerdown", function (e) { if (!pop.contains(e.target) && !pil.contains(e.target)) tutup(false); }, {signal: ac.signal, capture: true});
      pop.addEventListener("focusout", keluar, sg); pil.addEventListener("focusout", keluar, sg);
      window.addEventListener("resize", function () {   // gambar ulang hanya bila lebar gambar berubah; taruh() hanya untuk popover desktop
        if (rz) return;
        rz = requestAnimationFrame(function () { rz = 0; if (!buka) return; if (window.innerWidth > LEMBAR_PX) taruh(); if (model && lebar() !== lebarGbr) gambar(); });
      }, sg);
      pil.setAttribute("aria-expanded", "true"); taruh(); pop.hidden = false;
      if (c && c.sig === sigData() && Date.now() - c.ms < MODEL_SEGAR_MS) { model = c.model; gambar(); }
      else {
        model = null; isi.innerHTML = '<p class="lp-ring"><span>Menghitung lintasan…</span></p>';
        var jalan = function () { isiPop(id); };
        typeof nanti === "function" ? nanti(jalan) : setTimeout(jalan, 120);
      }
      pop.focus({preventScroll: true});
    };
    pil.addEventListener("click", function () { buka ? tutup(false) : bukaPop(); });
    tombolX.addEventListener("click", function () { tutup(true); });
    var pra = function (e) { if (pra.s || (e.pointerType && e.pointerType !== "mouse")) return; pra.s = 1; muatPustaka().catch(function () {}); muatTle().catch(function () {}); };   // pustaka + tle.json dimuat begitu pil disentuh
    pil.addEventListener("pointerenter", pra); pil.addEventListener("focus", pra);
  }
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang); else pasang(); }

  g.SatelitLintas = {kartu: kartu, hitung: hitungSemua, buatJejak: buatJejak, cariLintasan: cariLintasan, pusatKotak: pusatKotak, jarakKm: jarakKm, jam: jam, penanda: penanda,
    titik: titikDari, simpul: simpulWilayah, selubung: selubung, cakupan: hitungCakupan, satKeLintasan: satKeLintasan, hitungJejak: hitungJejak, lintasWilayah: lintasWilayah, htmlKartu: htmlKartu,
    pop: {ambangMs: ambangMs, waktuDiambil: waktuDiambil, sigData: sigData, kodeSensor: kodeSensor, namaKode: namaKode, kelompokTitik: kelompokTitik, kelompokTitikBertahap: kelompokTitikBertahap, cocokkan: cocokkan, lintasDariWaktu: lintasDariWaktu, klasifikasi: klasifikasi, susunModel: susunModel, htmlPop: htmlPop, svgGrafik: svgGrafik, judulLintas: judulLintas, teksTelat: teksTelat, htmlKaki: htmlKaki, ringkasJeda: ringkasJeda, htmlJeda: htmlJeda,
      lintasNasional: lintasNasional, modelNasional: modelNasional, titikNasional: titikNasional, pasang: pasang},
    konstanta: {pustaka: PUSTAKA, sri: SRI, horizonJam: HORIZON_JAM, langkahDtk: LANGKAH_DTK, irisan: IRISAN, segarMs: SEGAR_MS, mundurJam: MUNDUR_JAM, majuJam: MAJU_JAM, cocokMs: COCOK_MS}};
})(typeof window !== "undefined" ? window : globalThis);
