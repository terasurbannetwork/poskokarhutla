/* Halaman "Data satelit": tab tersembunyi `satelit` di halaman karhutla (rute /satelit, TIDAK ada di menu; satu-satunya pintu = tautan di kaki popover lintasan satelit, satelit_lintas.js).
   Keputusan pemilik 28 Okt 2026, kontrak: riwayat.json oleh pipa-data, mock v4 disetujui. Dimuat MALAS oleh index.html (muatSatelit) saat tab dibuka; gaya di satelit_data.css.
   Data: /data/satelit/riwayat.json = {dibuat, sumber, mulai, sampai, satelit, hari: {tgl WIB: {NOAA-20|NOAA-21|Terra|Aqua|S-NPP: {d: jumlah deteksi, l: [[menit sejak 00.00 WIB, jumlah]]}, tiba: {N20|N21|M|N:
   {n, lintasan, median, p90, maks (menit)}}}}}. "l" = gugus lintasan dari data (deteksi berurutan satelit itu, celah <= 45 menit). Dibaca apa adanya; tidak ada angka pipeline yang dihitung ulang di sini.
   Berkas belum ada / tidak sah = keadaan kosong jujur ("Riwayat sedang disiapkan"), tanpa galat.
   - Satuan "deteksi" = baris FIRMS (semua tingkat keyakinan), bukan lokasi unik. Tidak ada garis atau angka cut-off laporan (keputusan pemilik).
   - Rentang <= 31 hari: lintasan PERKIRAAN SGP4 dari mesin satelit_lintas.js (SatelitLintas.pop.lintasRentang, elemen orbit terbaru) dicocokkan dengan gugus deteksi (+-20 menit) lewat susunModel yang sama
     dengan popover, jadi tabel Rincian identik dengan tabel popover (tabelKemarin/tabelBesok dipakai ulang, tidak digandakan). Rentang lebih panjang: gugus data saja (perkiraan orbit tidak dihitung dan disebut di kartu).
     Hari sesudah riwayat.sampai (hari ini, kemarin) diambil dari data titik langsung aplikasi (S.titik) lewat jalur popover yang sama.
   - Kerja berat (jejak SGP4, baris kalender setahun) lewat nanti() dan irisan ber-await; handler klik hanya mengubah atribut/isi kecil. Kode tiba: N20 = NOAA-20, N21 = NOAA-21, N = S-NPP, M = MODIS (Terra dan Aqua).
   Bahasa Indonesia; EN lewat i18n/en.json (tanggal lewat toLocaleDateString id-ID yang ditambal i18n.js; nama satelit dan jam di span translate=no). */
(function (g) {
  "use strict";
  const URL_RIWAYAT = "/data/satelit/riwayat.json";
  const WIB_MS = 7 * 36e5, HARI_MS = 864e5, JAM_MS = 36e5, COCOK_MS = 20 * 6e4;
  const MAKS_PERKIRAAN = 31, MAKS_HARIAN = 62, KEJADIAN_MENIT = 360, TUA_MS = 10 * 6e4;
  const AWAL_KEDATANGAN = "2026-10-28";   // catatan kedatangan data (tiba) dimulai hari ini (kontrak); dipakai hanya untuk keterangan bila belum ada hari bertiba
  const KODE = {"NOAA-20": "N20", "NOAA-21": "N21", Terra: "M", Aqua: "M", "S-NPP": "N"};
  const URUT_SAT = ["NOAA-20", "NOAA-21", "Terra", "Aqua", "S-NPP"], URUT_KODE = ["N20", "N21", "M", "N"];
  const WARNA = {N20: "#2a78d6", N21: "#eb6834", M: "#1baf7a", N: "#eda100"};
  const NAMA_KODE = {N20: "NOAA-20", N21: "NOAA-21", M: "MODIS (Terra dan Aqua)", N: "S-NPP"}, NAMA_PENDEK = {N20: "NOAA-20", N21: "NOAA-21", M: "MODIS", N: "S-NPP"};
  const STATUS = {masuk: "Data masuk", masuk0: "Tanpa deteksi", tertunda: "Tertunda", menunggu: "Menunggu masuk", perkiraan: "Perkiraan", belumMuat: "Belum termuat"};

  const id = n => Number(n).toLocaleString("id-ID"), dua = n => String(n).padStart(2, "0");
  const tn = x => '<span translate="no">' + esc(x) + "</span>";
  const sah = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T12:00:00Z"));
  const geser = (s, n) => new Date(Date.parse(s + "T12:00:00Z") + n * HARI_MS).toISOString().slice(0, 10);
  const memoIso = new Map();   // indeks hari WIB -> "YYYY-MM-DD": ribuan lintasan/gugus hanya berbeda hari, jadi tak perlu satu Date per pemanggilan
  const isoWib = ms => { const d = Math.floor((ms + WIB_MS) / HARI_MS); let v = memoIso.get(d); if (v === undefined) { v = new Date(d * HARI_MS).toISOString().slice(0, 10); if (memoIso.size > 4000) memoIso.clear(); memoIso.set(d, v); } return v; };   // tanggal WIB dari ms
  const awalMs = s => Date.parse(s + "T00:00:00+07:00");   // 00.00 WIB tanggal itu
  const daftarHari = (a, b) => { const o = []; for (let h = a; h <= b; h = geser(h, 1)) o.push(h); return o; };
  const jamKe = ms => Math.floor(((ms + WIB_MS) % HARI_MS) / JAM_MS);
  const jamTeks = ms => dua(jamKe(ms)) + "." + dua(new Date(ms + WIB_MS).getUTCMinutes());
  /* tanggal lewat toLocaleDateString("id-ID"): i18n.js menambalnya jadi en-GB saat EN, jadi bulan/hari ikut terjemah tanpa kamus */
  const tglFmt = (s, o) => new Date(s + "T12:00:00Z").toLocaleDateString("id-ID", Object.assign({timeZone: "UTC"}, o));
  /* memo per jenis + tanggal + bahasa (kunci bahasa: i18n.js menambal toLocaleDateString saat EN); kalender setahun memanggil ini ribuan kali */
  const memoTgl = new Map(), bahasa = () => typeof document !== "undefined" && document.documentElement && document.documentElement.lang || "id";
  const tglMemo = (jenis, s, o) => { const k = bahasa() + "|" + jenis + "|" + s; let v = memoTgl.get(k); if (v === undefined) { v = tglFmt(s, o); if (memoTgl.size > 4000) memoTgl.clear(); memoTgl.set(k, v); } return v; };
  const tglPendek = s => tglMemo("p", s, {day: "numeric", month: "short"}), namaHari = s => tglMemo("h", s, {weekday: "short"}), tglPanjang = s => tglMemo("l", s, {day: "numeric", month: "short", year: "numeric"});
  const bulanFmt = ym => tglMemo("b", ym + "-15", {month: "short"});
  const bil = x => typeof x === "number" && isFinite(x);   // data riwayat.json dibaca apa adanya, tetapi bukan angka = ditolak/dilewati
  const gugusSah = gg => Array.isArray(gg) && bil(gg[0]) && gg[0] >= 0 && gg[0] < 1440;
  const jmlGugus = gg => { const n = +gg[1]; return isFinite(n) && n > 0 ? n : 0; };
  const jamAngka = menit => (menit / 60).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const durasi = menit => !isFinite(menit) ? "-" : typeof fmt === "function" && fmt.durasi ? fmt.durasi(menit * 6e4) : Math.round(menit) + " menit";   // fmt.durasi (inti/format.js): "45 menit", "6 jam 24 menit"
  const tidur = () => typeof scheduler !== "undefined" && scheduler.yield ? scheduler.yield() : new Promise(ok => setTimeout(ok, 0));
  const hl = t => '<span class="hl">' + t + "</span>";
  const jumlah = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
  const AMBANG_BIRU = [50, 500, 3000];   // batas kelas warna kotak kalender (deteksi per jam): b1 < 50 <= b2 < 500 <= b3 < 3.000 <= b4
  const biru = n => n >= AMBANG_BIRU[2] ? "b4" : n >= AMBANG_BIRU[1] ? "b3" : n >= AMBANG_BIRU[0] ? "b2" : "b1";
  const kosong = teks => '<div class="sd-kosong">' + teks + "</div>";
  const lintasP = () => g.SatelitLintas && g.SatelitLintas.pop;

  /* ---------- rentang tanggal: validasi (pesan seperti mock v4). Murni. min/maks = tanggal paling awal/akhir yang bisa dipilih.
     Hasil: {dari, sampai, ket: HTML pesan, galat: bool, tak: "dari" | "sampai" | ""} ; galat = rentang tidak diterapkan */
  function cekRentang(dari, sampai, sumber, min, maks) {
    const tgl = t => tn(tglPanjang(t));
    if (!sah(dari) || !sah(sampai)) return {dari, sampai, ket: "<span>Isi kedua tanggal.</span>", galat: true, tak: sah(dari) ? "sampai" : "dari"};
    let ket = "", tak = "";
    if (dari < min) { dari = min; ket = "<span>Data paling awal</span> " + tgl(min) + "<span>, tanggal sebelumnya belum ada datanya.</span>"; if (sumber === "dari") tak = "dari"; }
    if (sampai > maks) { sampai = maks; ket = "<span>Data paling akhir</span> " + tgl(maks) + " <span>(hari ini).</span>"; }
    if (sampai < min) { sampai = min; ket = "<span>Data paling awal</span> " + tgl(min) + "<span>.</span>"; }
    if (dari > sampai) return {dari, sampai, ket: "<span>Tanggal awal harus sebelum atau sama dengan tanggal akhir.</span>", galat: true, tak: sumber === "sampai" ? "sampai" : "dari"};
    return {dari, sampai, ket: ket || "<span>Data tersedia mulai</span> " + tgl(min) + "<span>.</span>", galat: false, tak};
  }
  /* rentang cepat n hari berakhir di `maks`; dipotong ke `min` bila data belum sepanjang itu */
  function rentangCepat(n, min, maks, label) {
    const mau = geser(maks, -(n - 1)), dari = mau < min ? min : mau, r = cekRentang(dari, maks, "preset", min, maks);
    if (mau < min) r.ket = "<span>" + label + " terakhir dimulai</span> " + tn(tglPanjang(mau)) + "<span>, dipotong ke</span> " + tn(tglPanjang(min)) + "<span>: data paling awal.</span>";
    return r;
  }

  /* ---------- riwayat.json */
  function sahkanRiwayat(d) {
    if (!d || typeof d !== "object" || !d.hari || typeof d.hari !== "object" || !sah(d.mulai) || !sah(d.sampai) || d.sampai < d.mulai) return null;
    for (const iso of Object.keys(d.hari)) {   // satelit: {d: deteksi >= 0, l: [[menit, jumlah], ...]}; yang bukan bilangan = berkas ditolak seluruhnya (keadaan kosong), bukan dipakai separuh
      const h = d.hari[iso]; if (!h || typeof h !== "object") return null;
      for (const nama of Object.keys(h)) {
        if (!KODE[nama]) continue;
        const x = h[nama]; if (!x || typeof x !== "object") return null;
        if (x.d !== undefined && !(bil(x.d) && x.d >= 0)) return null;
        if (x.l !== undefined) { if (!Array.isArray(x.l)) return null; for (const gg of x.l) if (!Array.isArray(gg) || !bil(gg[0]) || !bil(gg[1])) return null; }
      }
    }
    return d;
  }
  /* index.html (muatSatelit) sudah memulai fetch bersamaan dengan memuat skrip ini dan menaruh janjinya di window.__riwayatSatelit (dipakai sekali); tanpa itu fetch di sini */
  function muatRiwayat() {
    const awal = g.__riwayatSatelit; g.__riwayatSatelit = null;
    const p = (awal || fetch(URL_RIWAYAT, {cache: "no-cache"}).then(r => r.ok ? r.json() : null)).then(sahkanRiwayat).catch(() => null);   // 404 / bukan JSON / skema tak sah = belum ada, tanpa galat
    return p;
  }

  /* ---------- model rentang. p = {ms, nama, kode, n, status, riwayat?, data?, telatMenit?, ...} (bentuk sama dengan lintasan popover) */
  /* gugus riwayat -> kel (bentuk kelompokTitik): waktu[k] = jam deteksi pertama tiap gugus, hit[k] = BOBOT (jumlah deteksi gugus), Terra dan Aqua bersama di "M" (diatribusikan ke lintasan terdekat) */
  function kelDariRiwayat(R, dari) {
    const kel = {waktu: {N20: [], N21: [], M: [], N: []}, hit: {N20: [], N21: [], M: [], N: []}, terakhir: {}};
    Object.keys(R.hari).sort().forEach(iso => {
      if (iso < geser(dari, -1) || iso > R.sampai) return;   // sehari sebelum rentang ikut: lintasan 00.xx bisa bertetangga dengan deteksi 23.xx hari sebelumnya (+-20 menit)
      const t0 = awalMs(iso), h = R.hari[iso] || {};
      Object.keys(h).forEach(nama => {
        const k = KODE[nama], l = h[nama] && h[nama].l;
        if (!k || !Array.isArray(l)) return;
        l.forEach(gg => { if (!gugusSah(gg)) return; const t = t0 + gg[0] * 6e4; kel.waktu[k].push(t); kel.hit[k].push(jmlGugus(gg)); if (!(kel.terakhir[k] >= t)) kel.terakhir[k] = t; });
      });
    });
    return kel;
  }
  /* baris titik langsung (kelompokTitik) sejak batasMs ditambahkan ke kel */
  function gabungLive(kel, live, batasMs) {
    Object.keys(live.waktu).forEach(k => {
      const ts = live.waktu[k], ht = live.hit[k];
      for (let i = 0; i < ts.length; i++) {
        if (ts[i] < batasMs) continue;
        (kel.waktu[k] || (kel.waktu[k] = [])).push(ts[i]); (kel.hit[k] || (kel.hit[k] = [])).push(ht[i]);
        if (!(kel.terakhir[k] >= ts[i])) kel.terakhir[k] = ts[i];
      }
    });
    return kel;
  }
  /* tanpa perkiraan orbit: tiap gugus riwayat = satu lintasan (jam = jam deteksi pertama), Terra dan Aqua terpisah */
  function modelGugus(R, hariList, now) {
    const semua = [];
    hariList.forEach(iso => {
      if (iso > R.sampai) return;
      const t0 = awalMs(iso), h = R.hari[iso] || {};
      Object.keys(h).forEach(nama => {
        const k = KODE[nama], l = h[nama] && h[nama].l;
        if (!k || !Array.isArray(l)) return;
        l.forEach(gg => { if (!gugusSah(gg)) return; const n = jmlGugus(gg); semua.push({ms: t0 + gg[0] * 6e4, nama, kode: k, n, status: n ? "masuk" : "masuk0", riwayat: true}); });
      });
    });
    semua.sort((a, b) => a.ms - b.ms);
    return selesaikan({perkiraan: false, hariList, semua, now, tle: null, jedaR: null, batasArsip: awalMs(geser(R.sampai, 1))});
  }
  function selesaikan(M) {
    M.perHari = new Map();
    M.semua.forEach(p => { const iso = isoWib(p.ms); let a = M.perHari.get(iso); if (!a) M.perHari.set(iso, a = []); a.push(p); });
    M.lalu = M.semua.filter(p => p.status !== "perkiraan");
    return M;
  }
  /* model dengan perkiraan orbit (<= 31 hari). opsi.kemajuan(0..1); opsi.batal(): true = hasil sudah basi (rentang diganti, tab ditinggalkan), berhenti dengan galat ber-.batal.
     Data titik langsung TIDAK dilengkapi otomatis (hotspot.json 10,7 MB): lintasan yang jamnya tak terjangkau S.titik = "Belum termuat" (popover Kemarin yang meminta muatTitik(168) bila pengguna membukanya) */
  async function modelPerkiraan(R, dari, sampai, opsi) {
    const P = lintasP(), now = Date.now(), hariList = daftarHari(dari, sampai), batasArsip = awalMs(geser(R.sampai, 1));
    const batal = opsi && opsi.batal, cek = () => { if (batal && batal()) throw galatBatal(); };
    const r = await P.lintasRentang(dari, sampai, {kemajuan: opsi && opsi.kemajuan, batal});   // galat (pustaka/tle.json/geometri) dilempar ke pemanggil: jatuh ke mode gugus; galat ber-.batal diteruskan
    cek();
    const kel = kelDariRiwayat(R, dari), mulaiLive = Math.max(awalMs(dari), batasArsip), butuhLive = sampai > R.sampai;
    let dataLive = false;
    if (butuhLive && P.sigData()) {
      const live = await P.kelompokTitikBertahap(mulaiLive - COCOK_MS - 6e4); cek();
      if (P.sigData()) { gabungLive(kel, live, mulaiLive); dataLive = true; }
    }
    const m = P.susunModel({now, jendela: {mode: "kemarin", dari: awalMs(dari), sampai: awalMs(sampai) + HARI_MS}, lintas: r.lintas, satelit: r.tle.satelit, jeda: r.tle.jeda, kel, diambil: P.waktuDiambil(), cakup: 0});
    const cak = dataLive ? P.cakupDari() : 0;
    m.semua.forEach(p => {
      if (p.ms < batasArsip) {   // hari yang sudah di arsip: data lengkap, jadi lintasan tanpa deteksi = "Tanpa deteksi", bukan tertunda/menunggu
        if (p.status !== "belumMuat") p.status = p.n ? "masuk" : "masuk0";
        delete p.telatMenit; delete p.sejak;
      } else if (p.ms <= now && (!dataLive || (cak > 0 && p.ms - COCOK_MS < cak))) {   // sesudah arsip tetapi data titik langsung tak menjangkau jam itu: belum bisa dinilai
        p.status = "belumMuat"; p.n = 0; delete p.telatMenit; delete p.sejak;
      }
    });
    return selesaikan({perkiraan: true, hariList, semua: m.semua, now, tle: r.tle, jedaR: m.jedaR, batasArsip});
  }
  const galatBatal = () => { const e = new Error("dibatalkan"); e.batal = true; return e; };
  async function bangunModel(R, dari, sampai, opsi) {
    const hariList = daftarHari(dari, sampai);
    if (hariList.length <= MAKS_PERKIRAAN && lintasP() && lintasP().lintasRentang) {
      try { return await modelPerkiraan(R, dari, sampai, opsi); }
      catch (e) { if (e && e.batal) throw e; console.warn("Data satelit: perkiraan orbit tidak dihitung:", e && e.message || e); const M = modelGugus(R, hariList, Date.now()); M.orbitGagal = true; return M; }
    }
    return modelGugus(R, hariList, Date.now());
  }

  /* ---------- agregat */
  /* urutan satelit di tabel: urutan elemen orbit, lalu urutan baku; hanya yang punya lintasan dalam rentang */
  function ringkasSat(M, R) {
    const per = new Map(), tiba = tibaKode(R, M.hariList), urut = (M.tle ? M.tle.satelit.map(e => e.nama) : []).concat(URUT_SAT);
    M.lalu.forEach(p => {
      let r = per.get(p.nama);
      if (!r) per.set(p.nama, r = {nama: p.nama, kode: p.kode, lintas: 0, bawa: 0, deteksi: 0, tunda: 0, riwayat: !!p.riwayat});
      r.lintas++;
      if (p.status === "masuk") { r.bawa++; r.deteksi += p.n; }
      if (p.status === "tertunda") r.tunda++;
    });
    const rows = [...per.values()].sort((a, b) => (urut.indexOf(a.nama) < 0 ? 99 : urut.indexOf(a.nama)) - (urut.indexOf(b.nama) < 0 ? 99 : urut.indexOf(b.nama)));
    rows.forEach(r => { const t = tiba[r.kode]; r.jeda = t && t.length ? mediana(t.map(x => x.median)) : null; });
    return rows;
  }
  /* tiba per kode sensor dalam rentang: {N20: [{iso, n, lintasan, median, p90, maks}], ...} (menit); hanya hari yang punya catatan */
  function tibaKode(R, hariList) {
    const out = {};
    hariList.forEach(iso => {
      const t = R && R.hari[iso] && R.hari[iso].tiba;
      if (!t || typeof t !== "object") return;
      URUT_KODE.forEach(k => {
        const x = t[k];
        if (x && typeof x === "object" && isFinite(x.median)) (out[k] || (out[k] = [])).push({iso, n: +x.n || 0, lintasan: +x.lintasan || 0, median: +x.median, p90: +x.p90, maks: +x.maks});
      });
    });
    return out;
  }
  function mediana(xs) { const s = xs.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  /* skala sumbu Y empat selang dengan langkah "bulat" (1, 1,5, 2, 2,5, 3, 4, 5, 6, 8, 10 x 10^n) */
  function skalaNice(maks) {
    if (!isFinite(maks)) maks = 0;
    if (!(maks > 0)) return {langkah: 1, skala: 4};
    const kasar = maks / 4, pow = Math.pow(10, Math.floor(Math.log10(kasar)));
    let langkah = pow * 10;
    for (const f of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (f * pow * 4 >= maks) { langkah = f * pow; break; }
    return {langkah, skala: langkah * 4};
  }

  /* ---------- kartu. Kartu.kartu(pil, judul, isi, sumber, ctl, legenda) dari inti/kartu.js; angka merah lewat Kartu.hl */
  const legNama = k => k === "M" ? NAMA_KODE.M : tn(NAMA_KODE[k]);   // MODIS (Terra dan Aqua) diterjemahkan lewat kamus; nama lain tetap
  const namaSel = k => k === "M" ? esc(NAMA_KODE.M) : tn(NAMA_KODE[k]);
  const lbl = s => '<span class="sd-lb">' + s + "</span>";
  const tabel = html => '<div class="sd-tw">' + html + "</div>";   // tabel kartu setengah lebar: tak pernah terpotong, bergulir mendatar bila sempit
  /* tooltip bermarkup tp2 sendiri (judul + pasangan label/nilai), seperti penanda lintasan di popover: tiap label dan nilai simpul teks sendiri supaya i18n.js menerjemahkannya; nama satelit/tanggal di span translate=no */
  const tipKv = (judul, baris) => '<div class="tp2-h"><b>' + judul + '</b></div><div class="tp2-kv">' + baris.map(r => "<span>" + r[0] + "</span><b>" + r[1] + "</b>").join("") + "</div>";
  /* tooltip malas: elemen grafik hanya membawa penanda data-tl; teks tooltip (dan terjemahannya saat EN) disusun saat pointer pertama kali di atasnya (pasangEvent), bukan untuk ratusan batang sekaligus */
  let tlSeq = 0; const tlMap = new Map();
  const lazyTip = fn => ' data-tl="' + (tlMap.set(++tlSeq, fn), tlSeq) + '"';
  const LABEL_PRESET = {7: "7 hari", 30: "30 hari", 90: "90 hari", 365: "1 tahun"};
  const titleLintas = n => hl(id(n) + " lintasan"), titleGugus = n => hl(id(n) + " gugus deteksi");
  /* sumber di kaki kartu = potongan pendek digabung "; " (i18n.js menerjemahkan tiap potongan sendiri, jadi potongan yang sama dipakai ulang di semua kartu) */
  const PS = {orbit: "orbit CelesTrak (SGP4)", firms: "NASA FIRMS (arsip dan NRT), semua tingkat keyakinan", cocok: "dicocokkan ±20 menit", gugus: "gugus deteksi per satelit", klik: "klik tanggal atau kotak untuk rincian lintasan",
    panjang: "rentang lebih dari 31 hari: tanpa perkiraan orbit, hanya gugus deteksi dari data FIRMS", gagal: "perkiraan orbit tidak tersedia saat ini", jedaMed: "jeda median = median dari median harian riwayat kedatangan (MODIS: Terra dan Aqua bersama)",
    jedaMulai: "jeda median dari riwayat kedatangan mulai 28 Okt 2026", tiba: "riwayat kedatangan data FIRMS di aplikasi (mulai 28 Okt 2026)", jedaArti: "jeda = waktu dari akuisisi satelit sampai data terlihat di aplikasi",
    perkiraan: "perkiraan", utuh: "per hari kalender WIB utuh", parsial: "* bulan belum utuh (sebagian hari)", kosong: "NASA FIRMS", kosong2: "orbit CelesTrak"};
  const gabung = (...a) => a.filter(Boolean).join("; ");
  const SUMBER_ORBIT = gabung(PS.orbit, PS.firms, PS.cocok), SUMBER_GUGUS = gabung(PS.firms, PS.gugus), SUMBER_TIBA = PS.tiba;
  const catatanSumber = M => gabung(M.perkiraan ? SUMBER_ORBIT : SUMBER_GUGUS, M.perkiraan ? "" : M.orbitGagal ? PS.gagal : PS.panjang, PS.klik);
  const kosongKartu = (pil, judul, teks, sumber) => Kartu.kartu(pil, judul, kosong(teks), sumber);
  const hariBerjalan = M => M.hariList[M.hariList.length - 1] === isoWib(M.now);   // rentang memuat hari ini: angkanya "sejauh ini"
  const akhirArsip = M => isoWib(M.batasArsip - 1);   // hari terakhir arsip riwayat

  /* sel kalender -> kelas + tooltip. ps = lintasan pada jam itu */
  function kelasSel(ps, mulaiMs, M) {
    const ada = s => ps.some(p => p.status === s);
    if (ada("tertunda")) return "c t";
    if (ada("masuk")) return "c " + biru(jumlah(ps.filter(p => p.status === "masuk"), p => p.n));
    if (ada("masuk0")) return "c k";
    if (ada("menunggu")) return "c w";
    if (ada("belumMuat")) return "c bm";
    if (ada("perkiraan")) return "c f";
    return mulaiMs > M.now ? "c x" : "c";
  }
  const nilaiLintas = p => p.status === "masuk" ? id(p.n) + " deteksi" : STATUS[p.status] || p.status;
  function tipSel(iso, j, ps, M) {
    const kepala = '<div class="tp2-h"><b>' + tn(namaHari(iso) + " " + tglPendek(iso)) + ", " + tn(dua(j) + ".00") + " <span>hingga</span> " + tn(dua(j + 1) + ".00 WIB") + "</b></div>";
    if (!ps.length) return kepala + '<div class="tp2-t">' + (M.perkiraan ? "Tidak ada satelit melintas" : "Tidak ada gugus deteksi") + "</div>";
    return kepala + '<div class="tp2-kv">' + ps.map(p => "<span translate=\"no\">" + esc(p.nama + " " + jamTeks(p.ms)) + "</span><b>" + nilaiLintas(p) + "</b>").join("") + "</div>";
  }
  /* tooltip sel tidak ditulis ke HTML (ribuan sel, dan di EN tiap atribut diurai i18n.js): hanya penanda data-lazy pada sel berisi lintasan (dan sel kosong bila rentang <= 62 hari), tooltip disusun saat
     pointer pertama kali di atasnya (pasangEvent). semua = sel kosong pun bertooltip */
  function barisKalender(iso, M, sel, semua) {
    const mulai = awalMs(iso), tanpaRiwayat = !M.perkiraan && iso > akhirArsip(M);
    let k = '<div class="r" data-hari="' + iso + '"><button type="button" class="d" title="Lihat rincian lintasan">' + tn(tglPendek(iso)) + " <small>" + tn(namaHari(iso)) + "</small></button>";
    for (let j = 0; j < 24; j++) {
      const ps = sel.get(iso + "|" + j) || [], cls = tanpaRiwayat ? "c x" : kelasSel(ps, mulai + j * JAM_MS, M);
      k += '<div class="' + cls + '"' + (ps.length || semua && cls === "c" ? ' data-lazy="1"' : "") + "></div>";
    }
    return k + "</div>";
  }
  /* angka legenda lewat id() (id-ID, en-GB saat EN) dari AMBANG_BIRU, bukan teks tetap: "2.999" akan terbaca desimal di EN; tiap entri bersatuan */
  const legKalender = () => [["var(--b1)", "1 sampai " + id(AMBANG_BIRU[0] - 1) + " deteksi"], ["var(--b2)", id(AMBANG_BIRU[0]) + " sampai " + id(AMBANG_BIRU[1] - 1) + " deteksi"], ["var(--b3)", id(AMBANG_BIRU[1]) + " sampai " + id(AMBANG_BIRU[2] - 1) + " deteksi"],
    ["var(--b4)", id(AMBANG_BIRU[2]) + " atau lebih deteksi"], ["var(--k0)", "Tanpa deteksi"], ["#f5a524", "Tertunda (!)"]];
  function jam24() { let h = '<div class="h"></div>'; for (let j = 0; j < 24; j++) h += '<div class="h">' + (j % 3 === 0 ? dua(j) : "") + "</div>"; return h; }
  function judulKalender(M) {
    const n = M.hariList.length, L = M.lalu, bawa = L.filter(p => p.status === "masuk").length, tunda = L.filter(p => p.status === "tertunda").length;
    const rent = n === 1 ? "<span>Pada</span> " + tn(tglPendek(M.hariList[0])) : "<span>Dalam " + id(n) + " hari ada</span>", ada = n === 1 ? " <span>ada</span> " : " ";
    if (!M.perkiraan) return rent + ada + titleGugus(L.length);
    return rent + ada + titleLintas(L.length) + "; " + hl(id(bawa)) + " <span>membawa deteksi</span>" + (tunda ? " <span>dan</span> " + hl(id(tunda)) + " <span>tertunda</span>" : "");
  }
  /* kartu Kalender: kerangka + potongan baris pertama (awalBaris); sisanya lewat lengkapiKalender */
  function kartuKalender(M, awalBaris) {
    const sel = M.sel || (M.sel = selKalender(M)), n = M.hariList.length, rapat = n > MAKS_HARIAN ? "sd-rp" : n > 14 ? "sd-pdk" : "";
    const kal = '<div class="sd-kalwrap' + (rapat ? " " + rapat : "") + '"><div class="sdk ' + rapat + '" role="group" aria-label="Kalender lintasan satelit per jam">' + jam24() +
      M.hariList.slice(0, awalBaris || n).map(h => barisKalender(h, M, sel, n <= MAKS_HARIAN)).join("") + "</div></div>";
    return Kartu.kartu("Kalender lintasan", judulKalender(M), kal, catatanSumber(M), "", legKalender());
  }
  function selKalender(M) {
    const sel = new Map();
    M.semua.forEach(p => { const k = isoWib(p.ms) + "|" + jamKe(p.ms); let a = sel.get(k); if (!a) sel.set(k, a = []); a.push(p); });
    return sel;
  }
  /* sisa baris kalender (rentang panjang) ditambahkan per potongan dengan jeda, supaya satu giliran tidak lama */
  async function lengkapiKalender(slot, M, dariBaris, gen, masihAktif) {
    const kal = slot.querySelector(".sdk"), sel = M.sel || (M.sel = selKalender(M));
    for (let i = dariBaris; i < M.hariList.length; i += 40) {
      await tidur();
      if (!masihAktif(gen) || !kal.isConnected) return;
      kal.insertAdjacentHTML("beforeend", M.hariList.slice(i, i + 40).map(h => barisKalender(h, M, sel, M.hariList.length <= MAKS_HARIAN)).join(""));
    }
  }

  /* kartu Rincian: judul + badan tergantung hari; dipakai untuk gambar awal dan pembaruan sebagian (h3 + .ex-bd) saat hari berganti */
  function legendaRincian(ps, M) {
    const P = lintasP(), ada = {}; ps.forEach(p => { ada[p.riwayat && p.status === "masuk" ? "masuk" : p.status] = 1; });
    const leg = P.legenda.filter(l => ada[l[0]]); if (!leg.length) return "";
    return '<div class="lp-leg">' + leg.map(l => { const ket = P.ketLegenda(l, {jedaR: M.jedaR}); return "<span" + (ket ? ' title="' + esc(ket) + '"' : "") + ">" + P.swatch(l[0]) + "<span>" + l[1] + "</span></span>"; }).join("") + "</div>";
  }
  function isiRincian(M, hari, besok) {
    const P = lintasP();
    if (!P) return {judul: "<span>Rincian lintasan belum bisa ditampilkan.</span>", badan: kosong("<span>Mesin lintasan satelit gagal dimuat. Muat ulang halaman.</span>")};
    if (hari === "besok") {
      if (!besok) return {judul: "<span>Menghitung lintasan besok…</span>", badan: ""};
      const sem = besok.semua || [];
      if (!sem.length) return {judul: "<span>Tidak ada perkiraan lintasan besok.</span>", badan: ""};
      return {judul: "<span>Besok diperkirakan</span> " + titleLintas(sem.length) + " <span>di atas Indonesia</span>",
        badan: '<div class="sd-ri">' + P.tabelBesok(besok) + '</div><p class="sd-cat"><span>' + P.ketSiapBesok(besok) + "</span> " + (besok.perkiraan && besok.jedaR && (besok.jedaR.terukur.length || besok.jedaR.bawaan.length) ? P.htmlJeda(besok.jedaR, true) : "") + "</p>"};   // jeda dibaca dari tle.json lewat model (htmlJeda), tanpa angka satelit di sini
    }
    const ps = (M.perHari.get(hari) || []).slice().sort((a, b) => a.ms - b.ms), bawa = ps.filter(p => p.status === "masuk"), tot = jumlah(bawa, p => p.n);
    const kepala = tn(namaHari(hari) + " " + tglPendek(hari)) + ": ";
    if (!ps.length) {
      const belum = !M.perkiraan && hari > akhirArsip(M);   // sesudah riwayat.sampai: datanya memang belum ada (bukan "tidak ada gugus")
      return {judul: kepala + "<span>" + (M.perkiraan ? "tidak ada lintasan" : belum ? "belum masuk riwayat" : "tidak ada gugus deteksi") + "</span>",
        badan: kosong(M.perkiraan ? "<span>Tidak ada satelit melintas di atas Indonesia pada hari itu.</span>" : belum ? "<span>Data hari itu belum masuk riwayat.</span>" : "<span>Tidak ada gugus deteksi pada hari itu.</span>")};
    }
    if (!M.perkiraan) return {judul: kepala + titleGugus(ps.length) + " <span>dengan</span> " + hl(id(tot) + " deteksi"),
      badan: legendaRincian(ps, M) + '<div class="sd-ri">' + P.tabelKemarin({semua: ps}) + '</div><p class="sd-cat"><span>Jam = jam deteksi pertama tiap gugus; perkiraan orbit hanya untuk rentang sampai 31 hari.</span></p>'};
    return {judul: kepala + titleLintas(ps.length) + ", " + hl(id(bawa.length)) + " <span>membawa</span> " + hl(id(tot) + " deteksi"),
      badan: '<p class="sd-ket"><span>Sama dengan tabel di popover lintasan, untuk hari mana pun dalam rentang.</span></p>' + legendaRincian(ps, M) + '<div class="sd-ri">' + P.tabelKemarin({semua: ps}) + "</div>"};
  }
  /* opsi hari: rentang panjang hanya memuat opsi terpilih sampai pemilih disentuh pertama kali (lengkapiOpsi); ratusan <option> tidak dibangun untuk gambar awal */
  function opsiHari(M, hari, tampilBesok, penuh) {
    const hariIni = isoWib(M.now), besok = geser(hariIni, 1), opt = h => '<option value="' + h + '"' + (h === hari ? " selected" : "") + ">" + esc(namaHari(h) + " " + tglPendek(h)) + (h === hariIni ? " (hari ini)" : "") + "</option>";
    const o = (penuh || hari === "besok" ? M.hariList.slice().reverse() : [hari]).map(opt).join("");
    return o + (tampilBesok ? '<option value="besok"' + (hari === "besok" ? " selected" : "") + ">" + esc(namaHari(besok) + " " + tglPendek(besok)) + " (besok, perkiraan)</option>" : "");
  }
  function kartuRincian(M, hari, besok, tampilBesok) {
    const r = isiRincian(M, hari, besok), penuh = M.hariList.length <= MAKS_HARIAN;
    return Kartu.kartu("Rincian lintasan", r.judul, r.badan, hari === "besok" ? gabung(PS.orbit, PS.perkiraan) : M.perkiraan ? gabung(PS.orbit, PS.firms) : SUMBER_GUGUS,
      '<select id="sdHari" aria-label="Pilih hari"' + (penuh ? ' data-lengkap="1"' : "") + ">" + opsiHari(M, hari, tampilBesok, penuh) + "</select>");
  }

  /* kartu Ringkasan per satelit */
  function kartuRingkas(M, R) {
    const rows = ringkasSat(M, R), gug = !M.perkiraan;
    if (!rows.length) return gug ? kosongKartu("Ringkasan per satelit", "<span>Belum ada gugus deteksi dalam rentang ini</span>", "<span>Pilih rentang yang mencakup hari dengan data deteksi.</span>", SUMBER_GUGUS)
      : kosongKartu("Ringkasan per satelit", "<span>Belum ada data lintasan dalam rentang ini</span>", "<span>Pilih rentang yang mencakup hari dengan data lintasan.</span>", SUMBER_GUGUS);
    const tle = rows.filter(r => !r.riwayat), riw = rows.filter(r => r.riwayat), dasar = gug ? rows : tle;   // satu basis: X, Y, dan deteksi di judul dari baris yang sama; satelit tanpa data orbit disebut terpisah
    const totL = jumlah(dasar, r => r.lintas), totB = jumlah(dasar, r => r.bawa), totD = jumlah(dasar, r => r.deteksi), totN = gug ? 0 : jumlah(riw, r => r.deteksi);
    const jedaAda = rows.some(r => r.jeda !== null), sejauh = hariBerjalan(M) ? " <span>(sejauh ini)</span>" : "";
    let b = "";
    rows.forEach(r => {
      const v = x => '<span class="sd-v">' + x + "</span>", jd = r.jeda !== null ? durasi(r.jeda) : "-";   // nilai satu simpul: di layar sempit sel jadi baris "label ... nilai"
      b += "<tr><td><b>" + tn(r.nama) + "</b></td>";
      b += '<td class="n">' + lbl(gug ? "Gugus dengan deteksi" : "Lintasan") + v(id(r.lintas)) + "</td>";
      if (!gug) b += '<td class="n">' + lbl("Membawa deteksi") + v(id(r.bawa) + ' <small class="sd-pr">(' + (r.lintas ? Math.round(r.bawa / r.lintas * 100) : 0) + "%)</small>") + "</td>";
      b += '<td class="n">' + lbl("Deteksi") + v(id(r.deteksi)) + "</td>";
      if (!gug) b += '<td class="n">' + lbl("Tertunda") + v(r.tunda ? id(r.tunda) : "-") + "</td>";
      b += '<td class="n sd-sl">' + lbl("Jeda median") + v(jd) + "</td></tr>";
    });
    const kep = '<thead><tr><th>Satelit</th><th class="n">' + (gug ? "Gugus dengan deteksi" : "Lintasan") + "</th>" + (gug ? "" : '<th class="n">Membawa deteksi</th>') + '<th class="n">Deteksi</th>' + (gug ? "" : '<th class="n">Tertunda</th>') + '<th class="n">Jeda median</th></tr></thead>';
    const judul = gug ? titleGugus(totL) + " <span>dengan</span> " + hl(id(totD) + " deteksi") + sejauh
      : hl(id(totB) + " dari " + id(totL)) + " <span>lintasan membawa</span> " + hl(id(totD) + " deteksi") + (totN ? "; " + hl(id(totN) + " deteksi") + " <span>dari satelit tanpa data orbit</span> (" + tn(riw.map(r => r.nama).join(", ")) + ")" : "") + sejauh;
    const sumber = gabung(gug ? SUMBER_GUGUS : SUMBER_ORBIT, jedaAda ? PS.jedaMed : PS.jedaMulai);
    return Kartu.kartu("Ringkasan per satelit", judul, tabel('<table class="sd-t">' + kep + "<tbody>" + b + "</tbody></table>"), sumber);
  }

  /* kartu Status lintasan per hari (hanya dengan perkiraan orbit) */
  function kartuStatus(M) {
    if (!M.perkiraan) return kosongKartu("Status lintasan per hari", "<span>Status lintasan per hari tersedia untuk rentang sampai 31 hari</span>", "<span>Perkiraan orbit hanya dihitung untuk rentang sampai 31 hari. Pilih rentang yang lebih pendek.</span>", SUMBER_ORBIT);
    const hari = M.hariList, per = hari.map(h => (M.perHari.get(h) || []).filter(p => !p.riwayat));
    const maks = Math.max(1, ...per.map(a => a.length)), sk = skalaNice(maks);
    const Wd = 560, Hd = 200, L = 34, B = 24, T = 26, lb = (Wd - L - 10) / hari.length, bw = Math.min(40, lb * .6), langkahX = Math.max(1, Math.ceil(hari.length / 12));
    const warna = {masuk: "var(--b3)", masuk0: "var(--k0)", tertunda: "#f5a524", lain: "var(--line)"}, namaS = {masuk: "Data masuk", masuk0: "Tanpa deteksi", tertunda: "Tertunda", lain: "Menunggu masuk atau perkiraan"};
    let s = '<svg viewBox="0 0 ' + Wd + " " + Hd + '" role="img" aria-label="Status lintasan per hari">';
    for (let v = 0; v <= sk.skala + 1e-9; v += sk.langkah) { const y = Hd - B - v / sk.skala * (Hd - B - T); s += '<line x1="' + L + '" x2="' + Wd + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10.5" opacity=".7">' + id(v) + "</text>"; }
    hari.forEach((h, i) => {
      let y = Hd - B; const x = L + i * lb + (lb - bw) / 2, ps = per[i];
      ["masuk", "masuk0", "tertunda", "lain"].forEach(k => {
        const n = ps.filter(p => k === "lain" ? p.status !== "masuk" && p.status !== "masuk0" && p.status !== "tertunda" : p.status === k).length;
        if (!n) return;
        const t = n / sk.skala * (Hd - B - T); y -= t;
        s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(0, t - 1.5) + '" rx="3" fill="' + warna[k] + '"' + lazyTip(() => tipKv(tn(namaHari(h) + " " + tglPendek(h)), [[namaS[k], id(n) + " lintasan"]])) + "/>";
      });
      if (hari.length <= 14) s += Kartu.pil(x + bw / 2 - (String(ps.length).length * 7.2 + 16) / 2, y - 24, String(ps.length), "var(--card)", "var(--ink)", 12)[0];   // total per hari hanya bila batang cukup lebar; selebihnya ada di tooltip
      if (i % langkahX === 0) s += '<text x="' + (x + bw / 2) + '" y="' + (Hd - 6) + '" text-anchor="middle" font-size="11">' + esc(tglPendek(h)) + "</text>";
    });
    s += "</svg>";
    const tunda = jumlah(per, a => a.filter(p => p.status === "tertunda").length);
    return Kartu.kartu("Status lintasan per hari", tunda ? hl(id(tunda) + " lintasan") + " <span>tertunda dalam rentang ini</span>" : "<span>Tidak ada lintasan tertunda dalam rentang ini</span>", s, SUMBER_ORBIT, "",
      [["var(--b3)", "Data masuk"], ["var(--k0)", "Tanpa deteksi"], ["#f5a524", "Tertunda"], ["var(--line)", "Menunggu masuk atau perkiraan"]]);
  }

  /* kartu Kejadian: jeda terpanjang (tiba.maks) > 6 jam per satelit per hari; ditulis apa adanya sebagai "jeda terpanjang", penyebab tidak diketahui dari data */
  function kartuKejadian(R, hariList) {
    const tiba = tibaKode(R, hariList), ada = Object.keys(tiba).length, kej = [];
    URUT_KODE.forEach(k => (tiba[k] || []).forEach(x => { if (x.maks > KEJADIAN_MENIT) kej.push({iso: x.iso, k, maks: x.maks, median: x.median}); }));
    kej.sort((a, b) => a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : URUT_KODE.indexOf(a.k) - URUT_KODE.indexOf(b.k));
    const sumber = SUMBER_TIBA;
    if (!ada) return Kartu.kartu("Kejadian", "<span>Belum ada catatan kedatangan data dalam rentang ini</span>", kosong("<span>Catatan kedatangan data tersedia mulai</span> " + tn(tglPanjang(AWAL_KEDATANGAN)) + "<span>; rentang sebelum tanggal itu tampil kosong.</span>"), sumber);
    if (!kej.length) return Kartu.kartu("Kejadian", hl("0 kejadian") + " <span>jeda data lebih dari 6 jam dalam rentang ini</span>", kosong("<span>Tidak ada kejadian dalam rentang ini.</span>"), sumber);
    const b = kej.map(x => "<tr><td>" + lbl("Tanggal") + "<b>" + tn(namaHari(x.iso) + " " + tglPanjang(x.iso)) + "</b></td><td>" + lbl("Satelit") + '<span class="sd-v">' + namaSel(x.k) + "</span></td><td>" + lbl("Jeda terpanjang") +
      '<span class="sd-chip">' + esc(durasi(x.maks)) + "</span></td><td>" + lbl("Jeda median") + '<span class="sd-v">' + esc(durasi(x.median)) + "</span></td></tr>").join("");
    return Kartu.kartu("Kejadian", hl(id(kej.length) + " kejadian") + " <span>jeda data lebih dari 6 jam dalam rentang ini</span>",
      tabel('<table class="sd-t"><thead><tr><th>Tanggal</th><th>Satelit</th><th>Jeda terpanjang</th><th>Jeda median</th></tr></thead><tbody>' + b + "</tbody></table>"), sumber);
  }

  /* kartu Jeda data: median per hari per satelit dari tiba; kosong dengan keterangan sebelum 28 Okt 2026. Judul memakai satu format durasi di seluruh halaman ("3 jam 25 menit"); sumbu grafik boleh desimal jam */
  function kartuJeda(R, hariList) {
    const tiba = tibaKode(R, hariList), kodes = URUT_KODE.filter(k => tiba[k] && tiba[k].length), sumber = SUMBER_TIBA;
    if (!kodes.length) return Kartu.kartu("Jeda data", "<span>Belum ada catatan jeda data dalam rentang ini</span>", kosong("<span>Catatan kedatangan data tersedia mulai</span> " + tn(tglPanjang(AWAL_KEDATANGAN)) + "<span>; rentang sebelum tanggal itu tampil kosong.</span>"), sumber);
    const n = hariList.length, Wd = 560, Hd = 220, L = 52, B = 26, T = 18, lb = (Wd - L - 14) / Math.max(1, n), indeks = new Map(hariList.map((h, i) => [h, i])), X = h => L + indeks.get(h) * lb + lb / 2;
    const maksJam = Math.max(...kodes.map(k => Math.max(...tiba[k].map(x => x.median))), 60) / 60, sk = skalaNice(maksJam), langkahX = Math.max(1, Math.ceil(n / 8));
    const Y = jam => Hd - B - jam / sk.skala * (Hd - B - T);
    let s = '<svg viewBox="0 0 ' + Wd + " " + Hd + '" role="img" aria-label="Jeda median data sampai di aplikasi per hari">';
    for (let v = 0; v <= sk.skala + 1e-9; v += sk.langkah) s += '<line x1="' + L + '" x2="' + Wd + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)"/><text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="10.5" opacity=".7">' + v.toLocaleString("id-ID") + " jam</text>";
    hariList.forEach((h, i) => { if (i % langkahX === 0) s += '<text x="' + X(h) + '" y="' + (Hd - 6) + '" text-anchor="middle" font-size="11">' + esc(tglPendek(h)) + "</text>"; });
    kodes.forEach(k => {
      const t = tiba[k];
      if (t.length > 1) s += '<polyline fill="none" stroke="' + WARNA[k] + '" stroke-width="2" stroke-linejoin="round" points="' + t.map(x => X(x.iso).toFixed(1) + "," + Y(x.median / 60).toFixed(1)).join(" ") + '"/>';
      t.forEach(x => {
        s += '<circle cx="' + X(x.iso).toFixed(1) + '" cy="' + Y(x.median / 60).toFixed(1) + '" r="5" fill="' + WARNA[k] + '" stroke="var(--card)" stroke-width="1.5"' +
          lazyTip(() => tipKv(tn(NAMA_PENDEK[k] + " · " + tglPendek(x.iso)), [["Median", esc(durasi(x.median))], ["P90", esc(durasi(x.p90))], ["Terpanjang", esc(durasi(x.maks))], ["Jumlah granul FIRMS", id(x.n)]])) + "/>";
      });
    });
    s += "</svg>";
    const akhir = kodes.map(k => tiba[k][tiba[k].length - 1]).reduce((a, x) => x.iso > a ? x.iso : a, ""), nilai = kodes.map(k => tiba[k].filter(x => x.iso === akhir).map(x => x.median)).reduce((a, x) => a.concat(x), []);
    const lo = Math.min(...nilai), hi = Math.max(...nilai);
    return Kartu.kartu("Jeda data", "<span>Jeda median terbaru</span> " + (hi - lo < 6 ? hl(durasi(hi)) : hl(durasi(lo)) + " <span>hingga</span> " + hl(durasi(hi))) + " (" + tn(tglPendek(akhir)) + ")", s,
      gabung(SUMBER_TIBA, PS.jedaArti), "", kodes.map(k => [WARNA[k], legNama(k)]));
  }

  /* kartu Deteksi per satelit: harian <= 62 hari, bulanan bila lebih. Dari d tiap satelit di riwayat.json (hanya hari utuh sampai riwayat.sampai; hari berjalan tidak dihitung dan dikatakan di judul).
     Bulan yang tak lengkap hari bertanda "*"; "bulan tertinggi" hanya dari bulan utuh */
  const hariBulan = ym => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
  function kartuDeteksi(R, hariList) {
    const hari = hariList.filter(h => R.hari[h] && h <= R.sampai), bulanan = hari.length > MAKS_HARIAN, sumber = gabung(PS.firms, PS.utuh);
    const kosongKrt = () => kosongKartu("Deteksi per satelit", "<span>Belum ada hari utuh dalam rentang ini</span>", "<span>Deteksi per satelit dihitung per hari utuh; pilih rentang yang mencakup hari sebelum hari ini.</span>", sumber);
    if (!hari.length) return kosongKrt();
    const kel = new Map();
    hari.forEach(h => {
      const kunci = bulanan ? h.slice(0, 7) : h; let o = kel.get(kunci);
      if (!o) kel.set(kunci, o = {N20: 0, N21: 0, M: 0, N: 0, T: 0, A: 0, total: 0, hari: 0});
      o.hari++;
      Object.keys(R.hari[h]).forEach(nama => { const k = KODE[nama], d = R.hari[h][nama] && +R.hari[h][nama].d; if (!k || !(d >= 0)) return; o[k] += d; o.total += d; if (nama === "Terra") o.T += d; if (nama === "Aqua") o.A += d; });
    });
    const ks = [...kel.keys()], tt = ks.map(k => kel.get(k).total), parsial = k => bulanan && kel.get(k).hari < hariBulan(k), adaParsial = ks.some(parsial);
    const maks = Math.max(...tt), sk = skalaNice(maks);
    const Wd = 1100, Hd = 260, L = 64, B = 26, T = 28, lb = (Wd - L - 10) / ks.length, bw = Math.max(3, Math.min(44, lb * .7)), langkahX = Math.max(1, Math.ceil(ks.length / 14));
    const lblx = k => (bulanan ? bulanFmt(k) : tglPendek(k)) + (parsial(k) ? "*" : ""), tipJudul = k => bulanan ? tn(tglFmt(k + "-15", {month: "long", year: "numeric"})) : tn(namaHari(k) + " " + tglPanjang(k));
    let s = '<svg viewBox="0 0 ' + Wd + " " + Hd + '" role="img" aria-label="Deteksi per satelit">';
    for (let v = 0; v <= sk.skala + 1e-9; v += sk.langkah) { const y = Hd - B - v / sk.skala * (Hd - B - T); s += '<line x1="' + L + '" x2="' + Wd + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" opacity=".7">' + id(v) + "</text>"; }
    ks.forEach((k, i) => {
      const o = kel.get(k), x = L + i * lb + (lb - bw) / 2, tj = tipJudul(k); let y = Hd - B;
      URUT_KODE.forEach(q => {
        const t = o[q] / sk.skala * (Hd - B - T); if (!t) return; y -= t;
        s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(0, t - 1.5) + '" rx="' + (bw > 8 ? 3 : 1) + '" fill="' + WARNA[q] + '"' + lazyTip(() => {
          const baris = [["Deteksi", id(o[q])]];
          if (q === "M" && (o.T || o.A)) baris.push([tn("Terra"), id(o.T)], [tn("Aqua"), id(o.A)]);
          if (parsial(k)) baris.push(["Hari terhitung", id(o.hari)]);
          return tipKv(tn(NAMA_PENDEK[q]) + " · " + tj, baris);
        }) + "/>";
      });
      if (ks.length <= 31 || bulanan) s += Kartu.pil(x + bw / 2 - (id(o.total).length * 7.2 + 16) / 2, y - 24, id(o.total), "var(--card)", "var(--ink)", 12)[0];
      if (i % langkahX === 0 || ks.length <= 31) s += '<text x="' + (x + bw / 2) + '" y="' + (Hd - 7) + '" text-anchor="middle" font-size="11">' + esc(lblx(k)) + "</text>";
    });
    s += "</svg>";
    const terakhir = hari[hari.length - 1], total = jumlah(tt, x => x), sampai = hariList[hariList.length - 1];
    const sesudah = sampai > terakhir ? " (<span>data sampai</span> " + tn(tglPendek(terakhir)) + "<span>; hari yang belum utuh tidak dihitung</span>)" : "";   // hari berjalan belum utuh: tidak ikut grafik
    let judul;
    if (bulanan) {
      const utuh = ks.filter(k => !parsial(k)), puncak = utuh.length ? utuh.reduce((a, k) => kel.get(k).total > kel.get(a).total ? k : a, utuh[0]) : null;
      judul = hl(id(total) + " deteksi") + (puncak ? " <span>dalam rentang ini; bulan utuh tertinggi</span> " + hl(id(kel.get(puncak).total)) + " (" + tn(lblx(puncak)) + ")" : " <span>dalam rentang ini</span>") + sesudah;
    } else {
      const iMaks = tt.indexOf(maks);
      judul = "<span>Deteksi harian terbanyak</span> " + hl(id(maks)) + " (" + tn(lblx(ks[iMaks])) + "), <span>terakhir</span> " + hl(id(tt[tt.length - 1])) + " (" + tn(lblx(ks[ks.length - 1])) + ")" + sesudah;
    }
    return Kartu.kartu("Deteksi per satelit", judul, s, gabung(sumber, bulanan && adaParsial ? PS.parsial : ""), "", URUT_KODE.filter(q => ks.some(k => kel.get(k)[q] > 0)).map(q => [WARNA[q], legNama(q)]));
  }

  /* ---------- halaman: kerangka, pemilih rentang, penggambaran bertahap */
  const St = {R: null, tR: 0, dari: null, sampai: null, preset: 7, hari: null, gen: 0, M: null, besok: null, besokGen: 0, hariMuat: "", ada: false, pasang: false, janji: null, tertahan: false};
  const SLOT = [["kalender", "lebar"], ["rincian", "lebar"], ["ringkas", ""], ["status", ""], ["kejadian", ""], ["jeda", ""], ["deteksi", "lebar"]];
  const $s = s => document.querySelector("#satelit " + s);
  const slot = k => $s('[data-slot="' + k + '"]');
  /* hitungan/penggambaran hanya berjalan selama tab ini terlihat dan gen-nya masih yang terbaru. Tab ditinggalkan di tengah jalan = berhenti, St.tertahan = true, dan render() berikutnya melanjutkan
     (blok orbit yang sudah selesai tetap di cache lintasRentang) */
  const terlihat = () => { const p = document.getElementById("p-satelit"); return !!p && p.classList.contains("on"); };
  const aktif = gen => { if (gen !== St.gen) return false; if (!terlihat()) { St.tertahan = true; return false; } return true; };
  const placeholderHal = '<p class="sd-muat-hal" role="status">Memuat data satelit…</p>';
  const KEPALA = '<div class="sd-kepala"><div><a class="sd-kembali" href="/" data-kembali>‹ Kembali ke peta</a><h2 class="sd-jd">Data satelit</h2>' +
    "<p>Kapan satelit melintas di atas Indonesia, apakah datanya sudah sampai di aplikasi, dan berapa deteksi FIRMS (semua tingkat keyakinan) yang dibawanya. Diperbarui harian.</p></div>";

  function kerangka(el) {
    el.innerHTML = KEPALA +
      '<div class="sd-rentang"><div class="seg" role="group" aria-label="Rentang cepat" id="sdPreset">' + Object.keys(LABEL_PRESET).map(n => '<button type="button" data-n="' + n + '">' + LABEL_PRESET[n] + "</button>").join("") + "</div>" +
      '<div class="sd-tgl"><label>Dari <input type="date" id="sdDari" aria-describedby="sdKet"></label><label>sampai <input type="date" id="sdSampai" aria-describedby="sdKet"></label></div>' +
      '<div class="sd-ket-tgl" id="sdKet" aria-live="polite"></div></div></div>' +
      '<p class="sd-status" id="sdStatus" role="status" hidden></p><div class="sd-grid" id="sdGrid">' + SLOT.map(([k, c]) => '<div class="sd-slot' + (c ? " " + c : "") + '" data-slot="' + k + '"></div>').join("") + "</div>";
  }
  function setStatus(html) { const e = $s("#sdStatus"); if (!e) return; e.hidden = !html; e.innerHTML = html || ""; }
  function setKet(r) {
    const k = $s("#sdKet"); if (k) { k.innerHTML = r.ket; k.classList.toggle("galat", !!r.galat); }
    [["dari", "#sdDari"], ["sampai", "#sdSampai"]].forEach(([w, q]) => { const i = $s(q); if (!i) return; if (r.tak === w) i.setAttribute("aria-invalid", "true"); else i.removeAttribute("aria-invalid"); });
  }
  function tandaiPreset() { document.querySelectorAll("#satelit #sdPreset button").forEach(b => b.setAttribute("aria-pressed", String(St.preset === +b.dataset.n))); }
  /* terapkan rentang yang sudah divalidasi lalu gambar; r = hasil cekRentang / rentangCepat, preset = n hari (rentang cepat) atau null.
     Nilai terpotong ditulis kembali ke kolom tanggal HANYA bila kolom itu tidak sedang diketik (atau komit akhir: blur/Enter): menulis .value di tengah ketikan memotong tahun yang belum selesai */
  function terapkan(r, preset, akhir) {
    setKet(r);
    if (r.galat) return;
    const sama = r.dari === St.dari && r.sampai === St.sampai && St.M;
    St.dari = r.dari; St.sampai = r.sampai; St.preset = preset || null;
    [["#sdDari", r.dari], ["#sdSampai", r.sampai]].forEach(([q, v]) => { const i = $s(q); if (i.value !== v && (akhir || document.activeElement !== i)) i.value = v; });
    tandaiPreset();
    if (!sama) gambarSemua();
  }
  const batas = () => St.R ? {min: St.R.mulai, maks: isoWib(Date.now())} : null;
  const cepat = n => { const b = batas(); if (b) terapkan(rentangCepat(n, b.min, b.maks, LABEL_PRESET[n]), n, true); };
  /* kolom tanggal: perubahan tiap ketikan (input/change per segmen) hanya menjadwalkan komit 700 ms kemudian; kosong atau tahun < 1000 (mis. "0002" di tengah mengetik tahun) diabaikan; blur/Enter komit langsung */
  const TUNDA_TGL_MS = 700, tglOk = v => !!v && v >= "1000-01-01";
  function komitTanggal(i, akhir) {
    clearTimeout(i._h); const b = batas(); if (!b) return;
    const d = $s("#sdDari"), s = $s("#sdSampai");
    if (akhir && !tglOk(i.value)) { i.value = i === d ? St.dari || "" : St.sampai || ""; return; }   // dikosongkan/ditinggalkan setengah jadi: kembali ke tanggal yang berlaku
    if (!tglOk(d.value) || !tglOk(s.value)) return;
    terapkan(cekRentang(d.value, s.value, i === d ? "dari" : "sampai", b.min, b.maks), null, akhir);
  }
  const lengkapiOpsi = () => {   // pemilih hari: opsi lengkap dibangun saat pemilih pertama kali disentuh (rentang panjang)
    const sel = $s("#sdHari"), M = St.M; if (!sel || !M || sel.dataset.lengkap === "1") return;
    sel.dataset.lengkap = "1"; sel.innerHTML = opsiHari(M, St.hari, M.perkiraan && St.sampai === isoWib(M.now), true);
  };
  /* satu rangkaian pendengar pada #satelit, dipasang sekali; klik hanya mengubah atribut/isi kecil, kerja berat lewat nanti() di gambarSemua */
  function pasangEvent(el) {
    if (St.pasang) return; St.pasang = true;
    el.addEventListener("click", e => {
      const p = e.target.closest("#sdPreset button[data-n]");
      if (p) { cepat(+p.dataset.n); return; }
      if (e.target.closest("[data-kembali]")) { if (typeof bukaTab === "function" && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button)) { e.preventDefault(); bukaTab("peta"); } return; }
      const r = e.target.closest(".sdk [data-hari]"); if (r) pilihHari(r.dataset.hari, true);
    });
    /* tooltip disusun saat pointer pertama kali di atas elemen (fase tangkap, sebelum pendengar #tip bersama di document membacanya): sel kalender (data-lazy, dari M.sel) dan batang/titik grafik (data-tl, dari penutup lazyTip) */
    el.addEventListener("pointerover", e => {
      const z = e.target.closest && e.target.closest("[data-tl]");
      if (z) { const f = tlMap.get(+z.dataset.tl); z.removeAttribute("data-tl"); if (f) z.setAttribute("data-tip", f()); return; }
      const c = e.target.closest && e.target.closest(".sdk .c[data-lazy]"), M = St.M; if (!c || !M || !M.sel) return;
      const baris = c.parentElement, iso = baris.dataset.hari, j = Array.prototype.indexOf.call(baris.children, c) - 1;
      c.removeAttribute("data-lazy"); c.setAttribute("data-tip", tipSel(iso, j, M.sel.get(iso + "|" + j) || [], M));
    }, true);
    ["pointerdown", "keydown", "focusin"].forEach(t => el.addEventListener(t, e => { if (e.target.closest && e.target.closest('[data-slot="rincian"] .pc, #sdHari')) lengkapiOpsi(); }, true));
    const tgl = e => e.target && (e.target.id === "sdDari" || e.target.id === "sdSampai") ? e.target : null;
    const tunda = e => { const i = tgl(e); if (!i) return; clearTimeout(i._h); if (tglOk(i.value)) i._h = setTimeout(() => komitTanggal(i, false), TUNDA_TGL_MS); };
    el.addEventListener("input", tunda); el.addEventListener("change", e => {
      const b = batas(); if (!b) return;
      if (tgl(e)) { tunda(e); return; }
      if (e.target.id === "sdHari") pilihHari(e.target.value, false);
    });
    el.addEventListener("focusout", e => { const i = tgl(e); if (i) komitTanggal(i, true); });
    el.addEventListener("keydown", e => { const i = tgl(e); if (i && e.key === "Enter") komitTanggal(i, true); });
  }

  /* ganti hari di kartu Rincian: hanya h3 + isi kartu yang diganti (pemilih hari dan fokusnya tetap), kalender hanya mengganti tanda .pilih */
  function pilihHari(hari, gulir) {
    const M = St.M; if (!M || !M.perHari) return;
    if (hari === "besok" ? !M.perkiraan : !M.hariList.includes(hari)) return;
    St.hari = hari;
    document.querySelectorAll("#satelit .sdk .r.pilih").forEach(x => x.classList.remove("pilih"));
    const baris = $s('.sdk .r[data-hari="' + hari + '"]'); if (baris) baris.classList.add("pilih");
    const sel = $s("#sdHari"); if (sel && sel.value !== hari) sel.value = hari;
    isiRincianDom(M);
    if (gulir) { const k = slot("rincian"); if (k) k.scrollIntoView({behavior: "smooth", block: "start"}); }
  }
  async function isiRincianDom(M) {
    const k = slot("rincian"), art = k && k.querySelector("article.ex"); if (!art) return;
    const set = r => { art.querySelector("h3").innerHTML = r.judul; art.querySelector(".ex-bd").innerHTML = r.badan; };
    if (St.hari !== "besok") { set(isiRincian(M, St.hari, null)); return; }
    const gen = ++St.besokGen;
    set(isiRincian(M, "besok", St.besok));
    if (St.besok) return;
    try {
      const m = await lintasP().modelNasional("besok");
      if (gen !== St.besokGen || St.hari !== "besok") return;
      St.besok = m; set(isiRincian(M, "besok", m));
    } catch (e) { if (gen === St.besokGen) set({judul: "<span>Perkiraan lintasan besok belum bisa dihitung.</span>", badan: ""}); }
  }

  /* gambar semua kartu untuk rentang St.dari..St.sampai, satu kartu per giliran (jeda di antaranya): kartu dari riwayat.json (Kejadian, Jeda data, Deteksi) lebih dulu, lalu yang butuh perkiraan orbit.
     Slot yang masih kosong diberi "Memuat…"; isi lama tetap tampak (redup) sampai diganti */
  function gambarSemua() {
    const R = St.R, gen = ++St.gen, hariList = daftarHari(St.dari, St.sampai), grid = $s("#sdGrid");
    if (!R || !grid) return;
    if (!terlihat()) { St.tertahan = true; return; }   // tab ditinggalkan: tak ada hitungan latar; render() berikutnya melanjutkan
    St.tertahan = false;
    grid.setAttribute("aria-busy", "true"); grid.classList.add("sibuk");
    St.besok = null; St.besokGen++;
    const mulaiTl = tlSeq, perkiraan = hariList.length <= MAKS_PERKIRAAN;
    SLOT.forEach(([k]) => { const sl = slot(k); if (sl && !sl.firstElementChild) sl.innerHTML = '<div class="sd-muat" role="status">Memuat…</div>'; });
    setStatus(perkiraan ? "<span>Menghitung perkiraan lintasan…</span>" : "");
    nanti(async () => {
      const selesai = () => { setStatus(""); grid.removeAttribute("aria-busy"); grid.classList.remove("sibuk"); };
      const lanjut = async () => { await tidur(); return aktif(gen); };   // jeda satu giliran, lalu: masih perlu?
      if (!aktif(gen)) return;
      slot("kejadian").innerHTML = kartuKejadian(R, hariList); if (!await lanjut()) return;
      slot("jeda").innerHTML = kartuJeda(R, hariList); if (!await lanjut()) return;
      slot("deteksi").innerHTML = kartuDeteksi(R, hariList); if (!await lanjut()) return;
      let M;
      try {
        M = await bangunModel(R, St.dari, St.sampai, {kemajuan: f => { if (aktif(gen)) setStatus("<span>Menghitung perkiraan lintasan…</span> " + Math.round(f * 100) + "%"); }, batal: () => !aktif(gen)});
      } catch (e) { if (e && e.batal) return; console.warn("Data satelit:", e); if (aktif(gen)) selesai(); return; }
      if (!await lanjut()) return;   // hitungan model dan penyusunan kartu tak dalam satu giliran
      St.M = M;
      const hariIni = isoWib(M.now), kemarin = geser(hariIni, -1), tampilBesok = M.perkiraan && St.sampai === hariIni;
      if (St.hari === "besok" ? !tampilBesok : !M.hariList.includes(St.hari)) St.hari = M.hariList.includes(kemarin) ? kemarin : St.sampai;
      const awalBaris = Math.min(40, M.hariList.length);
      slot("kalender").innerHTML = kartuKalender(M, awalBaris); if (!await lanjut()) return;
      slot("rincian").innerHTML = kartuRincian(M, St.hari, null, tampilBesok); if (!await lanjut()) return;
      slot("ringkas").innerHTML = kartuRingkas(M, R);
      slot("status").innerHTML = kartuStatus(M);
      selesai();
      for (const k of [...tlMap.keys()]) if (k <= mulaiTl) tlMap.delete(k);   // penutup tooltip dari gambar sebelumnya sudah tak terpakai
      const tandai = () => { const b = $s('.sdk .r[data-hari="' + St.hari + '"]'); if (b) b.classList.add("pilih"); };
      tandai();
      if (St.hari === "besok") isiRincianDom(M);
      if (awalBaris < M.hariList.length) { await lengkapiKalender(slot("kalender"), M, awalBaris, gen, aktif); if (aktif(gen)) tandai(); }
    });
  }

  /* keadaan kosong jujur: berkas belum ada di produksi atau tidak sah */
  function kerangkaKosong(el) {
    el.innerHTML = KEPALA + "</div>" + '<div class="sd-grid"><div class="sd-slot lebar">' + Kartu.kartu("Data satelit", "<span>Riwayat sedang disiapkan</span>",
      kosong("<span>Riwayat lintasan dan deteksi per satelit belum tersedia. Lintasan hari ini, kemarin, dan besok tetap bisa dilihat lewat jam data di bagian atas halaman.</span>"), gabung(PS.kosong, PS.kosong2)) + "</div></div>";
  }

  /* titik masuk: dipanggil bukaTab("satelit") setiap tab dibuka. Pertama kali memuat riwayat.json; selanjutnya hanya menyegarkan bila sudah > 10 menit atau hari WIB berganti; hitungan yang tertahan karena tab
     ditinggalkan dilanjutkan di sini */
  async function jalankan() {
    const el = document.getElementById("satelit"); if (!el) return;
    pasangEvent(el);
    const sekarang = Date.now();
    if (St.ada && St.R && sekarang - St.tR < TUA_MS && St.hariMuat === isoWib(sekarang)) { if (St.tertahan) gambarSemua(); return; }
    if (!St.ada && !el.firstElementChild) el.innerHTML = placeholderHal;
    el.setAttribute("aria-busy", "true");
    const R = await muatRiwayat();
    el.removeAttribute("aria-busy");
    if (!R) { if (!St.ada) kerangkaKosong(el); return; }
    if (St.R && (R.dibuat !== St.R.dibuat || R.sampai !== St.R.sampai) || St.tertahan) St.M = null;   // berkas diperbarui atau hitungan tertahan: gambar ulang walau rentangnya sama
    St.R = R; St.tR = Date.now(); St.hariMuat = isoWib(St.tR);
    if (!St.ada) { kerangka(el); St.ada = true; }
    const b = batas(), d = $s("#sdDari"), s = $s("#sdSampai");
    d.min = s.min = b.min; d.max = s.max = b.maks;
    if (St.preset) { cepat(St.preset); return; }
    if (St.dari && St.dari >= b.min && St.sampai <= b.maks) terapkan(cekRentang(St.dari, St.sampai, "preset", b.min, b.maks), null, true); else cepat(7);
  }
  function render() {
    if (St.janji) return St.janji;
    const p = St.janji = jalankan().then(() => { St.janji = null; }, e => { St.janji = null; throw e; });
    return p;
  }

  g.SatelitData = {render, _u: {cekRentang, rentangCepat, sahkanRiwayat, kelDariRiwayat, gabungLive, modelGugus, modelPerkiraan, bangunModel, ringkasSat, tibaKode, mediana, skalaNice, kartuKalender, kartuRincian, isiRincian, kartuRingkas,
    kartuStatus, kartuKejadian, kartuJeda, kartuDeteksi, kerangka, kerangkaKosong, daftarHari, geser, isoWib, awalMs, selesaikan, tipSel, tlMap, St}};
})(typeof window !== "undefined" ? window : globalThis);
