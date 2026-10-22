/* Lapor Lapangan (regu): kode dari tautan /lapangan#k=… disimpan di localStorage; GPS 3 bacaan (server memeriksa getarannya, src/gps.js);
   foto dikecilkan lalu dikirim sesudah laporan; tanpa sinyal -> draf di localStorage, dikirim ulang saat online (klien_id mencegah ganda).
   CSP: tanpa skrip/gaya inline. Semua teks dari server lewat textContent. */
(() => {
  "use strict";
  const STATUS = ["menyala", "bara", "padam", "tidak_ditemukan"];
  const NAMA_STATUS = {menyala: "Masih menyala", bara: "Tinggal bara", padam: "Sudah padam", tidak_ditemukan: "Titik tidak ditemukan"};
  const KENDALA_KODE = ["air_jauh", "akses_sulit_rawa", "roda_empat_sulit", "air_tidak_cukup", "asap_tebal", "angin_kencang"];
  const NAMA_KENDALA = {air_jauh: "Air jauh", akses_sulit_rawa: "Akses sulit di rawa", roda_empat_sulit: "Roda empat sulit masuk", air_tidak_cukup: "Air tidak cukup", asap_tebal: "Asap tebal", angin_kencang: "Angin kencang"};
  const SUMBER_AIR = ["sungai", "kanal", "embung", "sumur_bor", "hidran", "mobil_tangki", "tidak_ada", "lainnya"];
  const NAMA_AIR = {sungai: "Sungai", kanal: "Kanal", embung: "Embung", sumur_bor: "Sumur bor", hidran: "Hidran", mobil_tangki: "Mobil tangki", tidak_ada: "Tidak ada", lainnya: "Lainnya"};
  const K_KODE = "pb_kode_regu", K_DRAF = "pb_draf_lapangan", MAKS_DRAF = 20, MAKS_FOTO = 1.4 * 1048576;
  const $ = id => document.getElementById(id);
  const baca = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const tulis = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const buang = k => { try { localStorage.removeItem(k); } catch (e) {} };

  let kode = null, kh = null, lokasi = null, sedangKirim = false;   // kh = 16 hex pertama sha256(kode): pengikat draf & peta luring ke satu kode regu
  /* draf milik kode aktif disimpan, sisanya dibuang (ponsel bersama: draf Regu A tidak boleh terkirim atas nama Regu B) */
  const saringDraf = (a, h) => { const l = Array.isArray(a) ? a : []; const milik = h ? l.filter(d => d && d.h === h) : []; return {milik, buang: l.length - milik.length}; };
  const hashKode = async k => { try { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(k)))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16); } catch (e) { return null; } };
  const capLama = (a, h) => (Array.isArray(a) ? a : []).map(d => d && !d.h && h ? {...d, h} : d);   // draf sebelum ada cap: milik kode yang tersimpan waktu itu
  window.LapanganDraf = {saringDraf, capLama};
  const pesan = (t, k) => { $("pesan").textContent = t || ""; $("pesan").className = "lp-pesan " + (k || ""); };

  /* ---- kode regu: dari fragmen tautan (tidak ikut ke server/log), lalu localStorage; tanpa localStorage tetap jalan selama tab terbuka ---- */
  const dariHash = (location.hash.match(/^#k=([0-9a-fA-F]{26})$/) || [])[1];
  const kodeLama = baca(K_KODE);   // kode tersimpan SEBELUM tautan baru menimpanya: pemilik draf lama tanpa cap
  if (dariHash) { kode = dariHash.toLowerCase(); tulis(K_KODE, kode); try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  else { const b = baca(K_KODE); if (b && /^[0-9a-f]{26}$/.test(b)) kode = b; }

  /* ---- form dari daftar tetap ---- */
  $("status").innerHTML = STATUS.map(s => `<label class="lp-pil"><input type="radio" name="status" value="${s}"><span>${NAMA_STATUS[s]}</span></label>`).join("");
  $("kendala").innerHTML = KENDALA_KODE.map(k => `<label class="lp-cek"><input type="checkbox" value="${k}">${NAMA_KENDALA[k]}</label>`).join("");
  $("air").innerHTML = `<option value="">Tidak diisi</option>` + SUMBER_AIR.map(a => `<option value="${a}">${NAMA_AIR[a]}</option>`).join("");

  /* ---- GPS: tiga bacaan segar berurutan ---- */
  const bacaGPS = () => new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok,
    e => no(new Error(e.code === 1 ? "Izin lokasi ditolak. Izinkan akses lokasi di pengaturan peramban, lalu coba lagi." : "Lokasi belum terbaca. Coba di tempat terbuka.")),
    {enableHighAccuracy: true, timeout: 20000, maximumAge: 0}));
  async function ambilGPS() {
    if (!navigator.geolocation) throw new Error("Peramban ini tidak bisa membaca lokasi");
    const s = [];
    for (let i = 0; i < 3; i++) { if (i) await new Promise(r => setTimeout(r, 1000)); const p = await bacaGPS(); s.push([p.coords.latitude, p.coords.longitude, p.coords.accuracy, Date.now()]); }
    const [lat, lon, akurasi, waktu] = s[2];
    return {lat, lon, akurasi, waktu_gps: waktu, sampel: s};
  }
  $("gps").addEventListener("click", async () => {
    const t = $("gps"); t.disabled = true; pesan("Membaca lokasi… tahan ponsel diam sebentar.");
    try {
      lokasi = await ambilGPS();
      $("lokasi").textContent = `Lokasi terbaca: ${lokasi.lat.toFixed(5)}, ${lokasi.lon.toFixed(5)} (akurasi ±${Math.round(lokasi.akurasi)} m)` + (lokasi.akurasi > 1000 ? ". Terlalu lemah, coba di tempat terbuka." : "");
      if (lokasi.akurasi > 1000) lokasi = null;
      pesan(""); if (lokasi && window.LapanganTugas) window.LapanganTugas.lokasiBaru();
    } catch (e) { lokasi = null; pesan(e.message, "galat"); }
    t.disabled = false;
  });

  /* ---- draf (offline) ---- */
  const drafSemua = () => { try { const a = JSON.parse(baca(K_DRAF) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const drafAda = () => saringDraf(drafSemua(), kh).milik;
  const drafSimpan = a => tulis(K_DRAF, JSON.stringify(a));
  /* indikator jaringan: navigator.onLine sering bohong (sinyal ada, internet tidak), jadi hasil fetch ikut menentukan */
  let daring = navigator.onLine;
  function jaringan(ya) { if (ya === daring) return; daring = ya; gambarJaringan(); }
  function gambarJaringan() {
    const n = drafAda().length, b = $("jaringan");
    b.className = "lp-jaringan " + (daring ? "daring" : "luring");
    $("jaringanTeks").textContent = daring ? "Online" : n ? "Tanpa sinyal. Laporan disimpan di ponsel dan dikirim saat sinyal kembali." : "Tanpa sinyal. Formulir tetap bisa diisi, laporan disimpan di ponsel.";
    $("jaringanN").hidden = !n; $("jaringanN").textContent = n ? `${n} antre` : "";
  }
  function tampilAntrean() {
    const n = drafAda().length;
    gambarJaringan();
    $("antrean").hidden = !n;
    if (n) $("antreanTeks").textContent = `${n} laporan tersimpan di ponsel dan menunggu sinyal. Akan dikirim otomatis saat online.`;
  }
  const idAcak = () => [...crypto.getRandomValues(new Uint8Array(10))].map(b => b.toString(16).padStart(2, "0")).join("");
  const angka = (id, bulat) => {
    const v = $(id).value.trim().replace(",", "."); if (!v) return null;
    const n = Number(v); if (!Number.isFinite(n) || n < 0 || (bulat && !Number.isInteger(n))) throw new Error(`Isian "${id}" harus angka 0 atau lebih${bulat ? " (bulat)" : ""}.`);
    return n;
  };

  /* foto -> JPEG <= 1,4 MB (sisi terpanjang 1280 px); gagal mengecilkan = pakai aslinya bila cukup kecil */
  async function kecilkan(file) {
    if (!file) return null;
    try {
      const bmp = await createImageBitmap(file), skala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
      c.width = Math.round(bmp.width * skala); c.height = Math.round(bmp.height * skala); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      for (const q of [0.72, 0.55, 0.4]) { const b = await new Promise(r => c.toBlob(r, "image/jpeg", q)); if (b && b.size <= MAKS_FOTO) return b; }
    } catch (e) {}
    return file.size <= MAKS_FOTO && /^image\/(jpeg|webp)$/.test(file.type) ? file : null;
  }
  const keDataUrl = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.onerror = () => r(null); f.readAsDataURL(b); });
  const dariDataUrl = async u => (await fetch(u)).blob();

  const hdr = () => ({"x-kode-regu": kode});
  async function kirimSatu(d) {
    let r;
    try { r = await fetch("/api/lapangan", {method: "POST", headers: {...hdr(), "content-type": "application/json"}, body: JSON.stringify(d.body)}); }
    catch (e) { jaringan(false); return {tunda: "Tidak ada sinyal."}; }
    jaringan(true);
    const j = await r.json().catch(() => ({}));
    if (r.status === 201 || r.status === 200) {
      let catatFoto = "";
      if (d.foto && j.id) {
        try {
          const f = await fetch(`/api/lapangan/foto/${j.id}`, {method: "POST", headers: hdr(), body: await dariDataUrl(d.foto)});
          if (!f.ok && f.status !== 409) catatFoto = " Foto belum terkirim" + (f.status === 503 ? " (penyimpanan foto belum aktif)." : ".");
        } catch (e) { catatFoto = " Foto belum terkirim."; }
      }
      return {ok: true, catat: catatFoto};
    }
    if (r.status === 403) return {kodeMati: true};
    if (r.status === 429 || r.status >= 500) return {tunda: j.galat || "Server sibuk."};
    return {tolak: j.galat || `Ditolak (${r.status})`};
  }
  async function kirimAntrean() {
    if (sedangKirim || !kode || !kh) return; sedangKirim = true;
    try {
      let a = drafAda(), terkirim = 0, catat = "";
      while (a.length) {
        const h = await kirimSatu(a[0]);
        if (h.tunda) { pesan(`Tersimpan sebagai draf. ${h.tunda} Dikirim otomatis saat sinyal kembali.`, "galat"); break; }
        if (h.kodeMati) { kodeTidakBerlaku(); break; }
        if (h.tolak) pesan(`Laporan ditolak: ${h.tolak}`, "galat");
        else { terkirim++; catat += h.catat || ""; }
        a.shift(); drafSimpan(a);
      }
      if (terkirim) pesan(`✅ ${terkirim} laporan terkirim.${catat}`, "ok");
    } finally { sedangKirim = false; tampilAntrean(); }
  }
  function kodeTidakBerlaku() {
    buang(K_KODE); kode = null; kh = null; window.LapanganTugas?.hapusPeta?.(); $("regu").textContent = "Kode tidak berlaku";
    $("tanpaKode").hidden = false; $("tanpaKode").textContent = "Kode regu ini sudah dicabut atau salah. Minta tautan baru dari posko."; $("kirim").disabled = true;
  }

  $("f").addEventListener("submit", async e => {
    e.preventDefault();
    if (!kode || !kh) return pesan("Buka dulu tautan dari posko.", "galat");
    const status = (document.querySelector('input[name="status"]:checked') || {}).value;
    if (!lokasi) return pesan("Ambil lokasi dulu (tombol 1).", "galat");
    if (!status) return pesan("Pilih kondisi api (bagian 2).", "galat");
    let luas, padam, personel;
    try { luas = angka("luas"); padam = angka("padam"); personel = angka("personel", true); } catch (x) { return pesan(x.message.replace('"luas"', '"luas terbakar"').replace('"padam"', '"dipadamkan"'), "galat"); }
    if (padam != null && (luas == null || padam > luas)) return pesan("Dipadamkan harus diisi bersama luas dan tidak boleh lebih besar dari luas.", "galat");
    if (drafAda().length >= MAKS_DRAF) return pesan("Terlalu banyak draf menunggu. Cari sinyal dulu.", "galat");
    const t = $("kirim"); t.disabled = true; pesan("Menyiapkan laporan…");
    const body = {klien_id: idAcak(), status, lat: lokasi.lat, lon: lokasi.lon, akurasi: lokasi.akurasi, waktu_gps: lokasi.waktu_gps, sampel: lokasi.sampel,
      kendala: [...document.querySelectorAll("#kendala input:checked")].map(i => i.value)};
    if (luas != null) body.luas_ha = luas; if (padam != null) body.padam_ha = padam; if (personel != null) body.personel = personel;
    if ($("air").value) body.sumber_air = $("air").value;
    /* placeholder mosaik drone (OpenDroneMap): tautan https ditulis ke catatan, tanpa kolom baru di server. Dipasang di catatan.length <= 500 */
    let drone = $("drone").value.trim();
    if (drone && !/^https:\/\/[^\s]{4,200}$/.test(drone)) { t.disabled = false; return pesan("Tautan drone harus diawali https:// dan tanpa spasi.", "galat"); }
    const cat = [$("catatan").value.trim(), drone && `Mosaik drone: ${drone}`].filter(Boolean).join("\n");
    if (cat.length > 500) { t.disabled = false; return pesan("Catatan dan tautan drone lebih dari 500 huruf. Persingkat salah satunya.", "galat"); }
    if (cat) body.catatan = cat;
    const foto = await kecilkan($("foto").files[0]), rec = {h: kh, body, foto: foto ? await keDataUrl(foto) : null, dibuat: Date.now()}, a = drafAda();
    a.push(rec);
    if (!drafSimpan(a)) {   // kuota localStorage: coba tanpa foto, lalu menyerah
      const adaFoto = !!rec.foto; rec.foto = null;
      if (!drafSimpan(a)) { t.disabled = false; return pesan("Ponsel menolak menyimpan draf (penyimpanan penuh atau mode pribadi).", "galat"); }
      if (adaFoto) pesan("Foto tidak ikut draf (penyimpanan ponsel penuh). Laporan tetap dikirim.", "galat");
    }
    $("f").reset(); lokasi = null; $("lokasi").textContent = "Belum ada lokasi. Berdiri di dekat titik api, lalu tekan tombol.";
    t.disabled = false;
    await kirimAntrean();
  });

  $("kirimLagi").addEventListener("click", kirimAntrean);
  /* ---- lapor rumah rusak: formulirnya modul rumah_rusak.js; MapLibre (lokal, /vendor/maplibre) dan modul dimuat HANYA saat tombol diketuk, jadi form lapangan tidak melambat ---- */
  const PETA_JS = "/vendor/maplibre/maplibre-gl.js?v=4.7.1", PETA_CSS = "/vendor/maplibre/maplibre-gl.css?v=4.7.1";   // lokal (tanpa CDN) supaya terbuka luring; disalin ke cache oleh sw-lapangan.js
  const sisip = (tag, atribut) => new Promise((ok, gagal) => {
    const e = document.createElement(tag); Object.assign(e, atribut); e.onload = () => ok(); e.onerror = () => gagal(new Error(atribut.src || atribut.href));
    document.head.append(e);
  });
  let janjiPeta = null;
  const muatMapLibre = () => window.maplibregl ? Promise.resolve() : janjiPeta || (janjiPeta = Promise.all([sisip("link", {rel: "stylesheet", href: PETA_CSS}).catch(() => {}), sisip("script", {src: PETA_JS})]).then(() => {}, e => { janjiPeta = null; throw e; }));
  $("bukaRR").addEventListener("click", async () => {
    const t = $("bukaRR"); t.disabled = true; $("rrWadah").hidden = false;
    try {
      sisip("link", {rel: "stylesheet", href: "/rumah_rusak.css?v=1"}).catch(() => {});
      sisip("link", {rel: "stylesheet", href: "/inti/lapor-gelap.css?v=1&k=2"}).catch(() => {});   // ulang SESUDAH rumah_rusak.css: :root terang-nya menimpa mode gelap bila yang pertama
      await Promise.all([muatMapLibre().catch(() => {}), sisip("script", {src: "/rumah_rusak.js?v=1"})]);
      window.RumahRusak.pasang($("rrWadah"), {kode});
      t.hidden = true;
    } catch (e) { pesan("Formulir rumah rusak belum termuat. Periksa sinyal lalu ketuk lagi.", "galat"); t.disabled = false; $("rrWadah").hidden = true; }
  });

  window.addEventListener("online", kirimAntrean);
  setInterval(() => { if (drafAda().length) kirimAntrean(); }, 60000);

  window.addEventListener("online", () => { jaringan(true); if (window.LapanganTugas && kode) window.LapanganTugas.segar(); });
  window.addEventListener("offline", () => jaringan(false));
  /* service worker: cangkang halaman + jawaban terakhir (saya, tugas) + peta luring; ditunda sampai halaman siap supaya tidak bersaing dengan muat awal */
  const sudahDikendalikan = "serviceWorker" in navigator && !!navigator.serviceWorker.controller;
  if ("serviceWorker" in navigator) addEventListener("load", () => setTimeout(() => navigator.serviceWorker.register("/sw-lapangan.js", {scope: "/lapangan"}).then(() => navigator.serviceWorker.ready).then(() => navigator.serviceWorker.controller || new Promise(r => { navigator.serviceWorker.addEventListener("controllerchange", r, {once: true}); setTimeout(r, 5000); })).then(() => { if (!sudahDikendalikan && kode) { fetch("/api/lapangan/saya", {headers: hdr()}).catch(() => {}); window.LapanganTugas?.segar(); } }).catch(() => {}), 1500));   // kunjungan pertama: jawaban dimuat sekali lagi lewat service worker supaya tersimpan untuk luring

  /* ---- mulai: periksa kode ke server; gagal jaringan = tetap boleh mengisi (draf) dan tugas terakhir tampil dari simpanan ---- */
  (async () => {
    if (kode) {
      kh = await hashKode(kode);
      const hl = kodeLama && /^[0-9a-f]{26}$/.test(kodeLama) ? await hashKode(kodeLama) : null;
      const {milik, buang: n} = saringDraf(capLama(drafSemua(), hl), kh);
      if (n && kh) { drafSimpan(milik); pesan(`${n} laporan antre milik kode regu sebelumnya dihapus dari ponsel ini.`, "galat"); }
    }
    tampilAntrean();
    if (!kode) { $("regu").textContent = "Belum ada kode regu"; $("tanpaKode").hidden = false; $("kirim").disabled = true; return; }
    $("tugas").hidden = false;
    window.LapanganTugas?.mulai({kode: () => kode, kh: () => kh, lokasi: () => lokasi, jaringan, kodeMati: kodeTidakBerlaku, muatMapLibre});
    try {
      const r = await fetch("/api/lapangan/saya", {headers: hdr()});
      jaringan(!r.headers.get("x-dari-cache"));
      if (r.status === 403) return kodeTidakBerlaku();
      const j = await r.json(); $("regu").textContent = `${j.regu.nama}, ${j.regu.unsur}, ${j.regu.kab}` + (r.headers.get("x-dari-cache") ? " (data tersimpan)" : "");
    } catch (e) { jaringan(false); $("regu").textContent = "Regu (kode tersimpan, sedang offline)"; }
    kirimAntrean();
  })();
})();
