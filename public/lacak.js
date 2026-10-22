/* Halaman /lacak/<token>: penerima tugas (driver, regu, petugas) membuka tautan dari WhatsApp, tanpa login. Token diambil dari alamat halaman dan dikirim ke API lewat
   header x-lacak (bukan di URL API). Pola gemah-ripah useKirimPosisi: watchPosition akurasi tinggi, kirim paling sering tiap 45 detik (throttle klien), fetch keepalive,
   clearWatch saat halaman tersembunyi dan menyala lagi saat terlihat, Screen Wake Lock bila didukung. Posisi berhenti saat layar mati: dikatakan terus terang di halaman.
   CSP: tanpa skrip/gaya inline; teks data lewat esc(). INP: handler ringan, kerja jaringan tidak memblokir ketukan berikutnya. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const ang = (n, d = 1) => Number(n).toLocaleString("id-ID", {maximumFractionDigits: d});
  const TOKEN = (String(location.hash).match(/^#([0-9a-f]{36})$/) || [])[1] || "";   // token di fragmen: tidak dikirim ke server, tidak masuk log atau Referer
  const JEDA_MS = 45000;   // paling sering satu kiriman per 45 detik; server membatasi 4 per menit per tautan
  const OPSI_GPS = {enableHighAccuracy: true, maximumAge: 30000, timeout: 60000};
  let info = null, watchId = null, terakhirKirim = 0, berangkat = false, sudahPeringatan = false, wake = null, mati = false, kirimBerjalan = false, tibaSudah = false, selesaiSiap = false, posisiAkhir = null;

  async function api(metode, jalur, body, keepalive) {
    const h = {"x-lacak": TOKEN, ...(metode === "POST" ? {"x-pb": "1"} : {}), ...(body === undefined ? {} : {"content-type": "application/json"})};
    let r; try { r = await fetch("/api/lacak/" + jalur, {method: metode, headers: h, body: body === undefined ? undefined : JSON.stringify(body), keepalive: !!keepalive}); }
    catch (e) { return {ok: false, status: 0, j: {galat: "Tidak ada sinyal."}}; }
    const j = await r.json().catch(() => ({}));
    return {ok: r.ok, status: r.status, j};
  }
  const pesan = (t, k) => { const p = $("pesanUtama"); p.textContent = t || ""; p.className = "lk-pesan " + (k || ""); p.hidden = !t; };
  const jamLokal = () => new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"});
  const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371; };
  const status = (t, k) => { const s = $("statusPosisi"); s.textContent = t; s.className = "lk-status " + (k || ""); };

  /* ---- tampilan ---- */
  function matikan(j) {
    mati = true; berangkat = false; hentikanWatch();
    $("isi").hidden = true; $("tampilanMati").hidden = false; $("matiTeks").textContent = j.galat || "Tautan ini tidak bisa dipakai lagi.";
    pesan(j.galat || "Tautan ini tidak bisa dipakai lagi.", j.alasan === "selesai" ? "ok" : "galat");
  }
  /* peringatan angin dihitung server (info dimuat ulang tiap 5 menit selagi berangkat); arah mata angin dan arah menjauh dari api */
  function gambarAngin() {
    const a = info.angin, w = $("angin"); w.hidden = !a;
    if (a) w.textContent = `Angin mengarah ke posisimu. ${a.jam_ke ? `Dalam ${a.jam_ke} jam` : "Sekarang"} angin dari ${a.dari_arah} ${ang(a.ws, 0)} km/jam${a.gust != null ? `, hembusan ${ang(a.gust, 0)}` : ""} membawa api dan asap ke arahmu. Bergeserlah ke arah ${a.menjauh_arah}, jauhi arah angin, dan lapor komandan.`;
  }
  async function segarkanInfo() {
    if (mati || !berangkat || document.visibilityState === "hidden") return;
    const r = await api("GET", "info"); if (r.status === 410) return matikan(r.j); if (r.ok) { info.angin = r.j.angin; gambarAngin(); }
  }
  setInterval(segarkanInfo, 5 * 60e3);
  function gambar() {
    const t = info.tugas, p = info.penugasan;
    $("judul").textContent = `${t.kec ? t.kec + ", " : ""}${t.kab}`; $("ciri").textContent = `Koordinat ${ang(t.lat, 4)}, ${ang(t.lon, 4)}`;
    $("siapa").textContent = `${p.nama}, ${(p.peran_nama || p.peran || "").toLowerCase()}, ${ang(p.orang, 0)} orang. Ditugaskan oleh ${info.oleh}. Tautan berlaku sampai ${new Date(p.kedaluwarsa).toLocaleString("id-ID", {day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"})}.`;
    const nav = typeof info.navigasi === "string" && info.navigasi.startsWith("https://www.google.com/maps/dir/") ? info.navigasi : `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}&travelmode=driving`;
    $("navWadah").innerHTML = `<a class="lk-tombol utama" href="${esc(nav)}" target="_blank" rel="noopener noreferrer">Navigasi ke lokasi (Google Maps)</a>`;
    $("kartuAkses").innerHTML = window.AksesKartu ? window.AksesKartu.html(info.akses) : "";
    $("cara").innerHTML = t.cara?.length ? `<section class="lk-kartu"><h2>Cara pemadaman</h2><span class="ak-pil">Perkiraan, belum divalidasi lapangan</span><ol>${t.cara.map(c => `<li>${esc(c)}</li>`).join("")}</ol>${t.alat?.length ? `<p class="lk-kecil">Alat: ${esc(t.alat.join(", "))}</p>` : ""}</section>` : "";
    if (t.ditutup) pesan("Tugas ini sudah ditutup oleh pihak yang menugaskan. Hubungi mereka sebelum berangkat.", "galat");
    gambarCek(); gambarAngin();
  }
  function gambarCek() {
    const c = info.checklist || {}, r = info.ringkas;
    $("ringkasCek").textContent = `${r.wajib_centang} dari ${r.wajib} butir wajib sudah dicentang.${r.wajib_centang < r.wajib ? " Berangkat tanpa butir wajib tetap bisa, tetapi kamu akan diingatkan." : " Siap berangkat."}`;
    $("daftarCek").innerHTML = info.butir.map(b => `<li><label class="${c[b.k] ? "ya" : ""}"><input type="checkbox" data-k="${esc(b.k)}"${c[b.k] ? " checked" : ""}><span>${esc(b.teks)}${b.wajib ? "" : ` <em>(${b.saran ? "disarankan" : "opsional"})</em>`}${c[b.k] ? ` <small>dicentang ${esc(new Date(c[b.k]).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}))}</small>` : ""}</span></label></li>`).join("");
  }
  function tombolJalan() {
    const b = $("bBerangkat");
    b.textContent = berangkat ? "Sedang berangkat, posisi dikirim" : sudahPeringatan ? "Tetap berangkat" : "Mulai berangkat"; b.disabled = berangkat || mati;
    $("bTiba").disabled = !berangkat || tibaSudah; $("bTiba").textContent = tibaSudah ? "Sudah tiba" : "Tiba di lokasi"; $("bSelesai").disabled = !berangkat && !tibaSudah;
    $("bSelesai").textContent = selesaiSiap ? "Ketuk lagi untuk menyelesaikan" : "Selesai";
  }

  /* ---- checklist ---- */
  $("daftarCek").addEventListener("change", async e => {
    const k = e.target?.dataset?.k; if (!k) return;
    const r = await api("POST", "centang", {k, ya: !!e.target.checked});
    if (!r.ok) { e.target.checked = !e.target.checked; return r.status === 410 ? matikan(r.j) : pesan(r.j.galat || "Centang belum tersimpan. Coba lagi.", "galat"); }
    info.checklist = r.j.checklist; info.ringkas = r.j.ringkas; gambarCek();
    if (!r.j.ringkas.belum_wajib.length) { $("peringatan").hidden = true; sudahPeringatan = false; tombolJalan(); }
  });

  /* ---- pelacakan ---- */
  const GALAT_GPS = {1: "Izin lokasi ditolak. Buka pengaturan peramban lalu izinkan lokasi untuk situs ini.", 2: "Posisi tidak tersedia. Pindah ke tempat terbuka dan pastikan GPS menyala.", 3: "Mencari posisi terlalu lama. Pindah ke tempat terbuka; pencarian terus berjalan."};
  function mulaiWatch() {
    if (watchId != null || mati) return;
    if (!navigator.geolocation) return status("Peramban ini tidak bisa membaca lokasi. Pakai Chrome atau Safari terbaru.", "galat");
    watchId = navigator.geolocation.watchPosition(onPos, e => status(GALAT_GPS[e && e.code] || "Lokasi belum terbaca. Coba lagi.", "galat"), OPSI_GPS);
  }
  function hentikanWatch() { if (watchId != null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} watchId = null; } lepasLayar(); }
  async function jagaLayar() {
    if (!("wakeLock" in navigator) || !navigator.wakeLock || wake) { if (!("wakeLock" in navigator) || !navigator.wakeLock) $("statusLayar").textContent = "Peramban ini tidak bisa menjaga layar tetap menyala: jangan kunci layar selama di jalan."; return; }
    try { wake = await navigator.wakeLock.request("screen"); $("statusLayar").textContent = "Layar dijaga tetap menyala selama halaman ini terbuka."; wake.addEventListener("release", () => { wake = null; }); }
    catch (e) { wake = null; $("statusLayar").textContent = "Layar tidak bisa dijaga menyala. Jangan kunci layar selama di jalan."; }
  }
  function lepasLayar() { if (wake) { try { wake.release(); } catch (e) {} wake = null; } }
  function onPos(p) {
    const c = p.coords; posisiAkhir = {lat: c.latitude, lon: c.longitude, akurasi: c.accuracy};
    if (info) $("jarak").textContent = `Jarak ke api sekitar ${ang(jarakKm(c.latitude, c.longitude, info.tugas.lat, info.tugas.lon))} km (garis lurus, bukan jalan).`;
    const kini = Date.now(); if (kini - terakhirKirim < JEDA_MS || kirimBerjalan) return;   // throttle klien
    kirim();
  }
  async function kirim() {
    if (!posisiAkhir || kirimBerjalan || mati) return; kirimBerjalan = true; terakhirKirim = Date.now();
    const p = posisiAkhir, r = await api("POST", "posisi", {lat: p.lat, lon: p.lon, akurasi: Number.isFinite(p.akurasi) ? Math.round(p.akurasi) : null}, true);
    kirimBerjalan = false;
    if (r.ok) { status(`Posisi terkirim ${jamLokal()}`, "ok"); if (r.j.tiba && !tibaSudah) { tibaSudah = true; tombolJalan(); pesan("Kamu sudah dekat titik api. Tiba tercatat otomatis.", "ok"); } }
    else if (r.status === 410) matikan(r.j.alasan === "ditutup" ? {galat: "Tugas api ini sudah ditutup. Posisimu tidak lagi dikirim, terima kasih.", alasan: "ditutup"} : r.j);
    else if (r.status === 429) status("Terlalu sering; posisi dikirim lagi sebentar lagi.", "");
    else status(`Posisi belum terkirim (${r.j.galat || "tidak ada sinyal"}). Dicoba lagi otomatis.`, "galat");
  }
  document.addEventListener("visibilitychange", () => {
    if (mati || !berangkat) return;
    if (document.visibilityState === "hidden") hentikanWatch();   // hemat baterai; GPS tidak dibaca di latar belakang oleh sebagian peramban
    else { mulaiWatch(); jagaLayar(); }
  });

  /* ---- tombol ---- */
  $("bBerangkat").addEventListener("click", async () => {
    if (berangkat || mati) return;
    const belum = info.ringkas.belum_wajib.length;
    if (belum && !sudahPeringatan) {   // peringatan, bukan pemblokir: ketuk kedua tetap berangkat
      sudahPeringatan = true; const p = $("peringatan"); p.hidden = false;
      p.textContent = `${belum} butir wajib belum dicentang. Lengkapi dulu bila sempat. Ketuk Tetap berangkat bila harus berangkat sekarang.`; return tombolJalan();
    }
    $("bBerangkat").disabled = true;
    const r = await api("POST", "berangkat", {});
    if (r.status === 410) return matikan(r.j);
    if (!r.ok) { $("bBerangkat").disabled = false; return pesan(r.j.galat || "Belum bisa mulai. Coba lagi.", "galat"); }
    berangkat = true; $("peringatan").hidden = true; pesan(""); tombolJalan(); status("Mencari posisi…", ""); mulaiWatch(); jagaLayar();
  });
  $("bTiba").addEventListener("click", async () => {
    const r = await api("POST", "tiba", {}); if (r.status === 410) return matikan(r.j);
    if (r.ok) { tibaSudah = true; tombolJalan(); pesan("Tiba di lokasi tercatat. Tetap kirim posisi sampai kamu menekan Selesai.", "ok"); }
  });
  $("bSelesai").addEventListener("click", async () => {
    if (!selesaiSiap) { selesaiSiap = true; tombolJalan(); return; }   // dua ketukan: Selesai mengakhiri tautan
    const r = await api("POST", "selesai", {}); selesaiSiap = false;
    if (r.ok) return matikan({galat: "Tugas selesai. Terima kasih, posisimu tidak lagi dikirim.", alasan: "selesai"});
    if (r.status === 410) return matikan(r.j); tombolJalan();
  });

  /* ---- darurat: dua ketukan (buka pilihan, pilih jenis) supaya tidak terkirim tak sengaja; posisi dibaca sekali lagi, bila gagal terkirim tanpa posisi ---- */
  const posisiSekali = () => new Promise(res => { if (!navigator.geolocation) return res(posisiAkhir); navigator.geolocation.getCurrentPosition(p => res({lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy}), () => res(posisiAkhir), {enableHighAccuracy: true, maximumAge: 15000, timeout: 6000}); });
  $("bDarurat").addEventListener("click", () => { $("pilihDarurat").hidden = false; $("bDarurat").hidden = true; });
  $("bDarBatal").addEventListener("click", () => { $("pilihDarurat").hidden = true; $("bDarurat").hidden = false; });
  $("pilihDarurat").addEventListener("click", async e => {
    const jenis = e.target?.dataset?.dar; if (!jenis || mati) return;
    const s = $("statusDarurat"); s.hidden = false; s.className = "lk-status"; s.textContent = "Mengirim panggilan darurat…"; $("pilihDarurat").hidden = true;
    const p = await posisiSekali(), r = await api("POST", "darurat", {jenis, ...(p ? {lat: p.lat, lon: p.lon, akurasi: Number.isFinite(p.akurasi) ? Math.round(p.akurasi) : null} : {})}, true);
    if (r.ok) { s.className = "lk-status ok"; s.textContent = `Panggilan darurat terkirim ${jamLokal()}${r.j.posisi_tercatat ? " beserta posisimu" : " tanpa posisi (GPS belum terbaca)"}. Telepon 112 atau komandanmu bila bisa.`; }
    else { s.className = "lk-status galat"; s.textContent = `Panggilan belum terkirim (${r.j.galat || "tidak ada sinyal"}). Telepon 112 atau komandanmu sekarang. Ketuk Darurat untuk mencoba lagi.`; }
    $("bDarurat").hidden = false;
  });

  /* ---- mulai ---- */
  (async function muat() {
    if (!TOKEN) return matikan({galat: "Alamat tautan tidak lengkap. Buka lagi tautan dari WhatsApp."});
    try { const m = {name: "Tugas api", short_name: "Tugas api", start_url: "/lacak#" + TOKEN, scope: "/lacak", display: "standalone", orientation: "portrait", background_color: "#0b2545", theme_color: "#0b2545", icons: [{src: "/img/logo.svg", sizes: "any", type: "image/svg+xml"}]};
      const l = document.createElement("link"); l.rel = "manifest"; l.href = URL.createObjectURL(new Blob([JSON.stringify(m)], {type: "application/manifest+json"})); document.head.append(l); } catch (e) {}   // PWA per token (start_url membawa fragmen): bisa dipasang di layar utama
    const r = await api("GET", "info");
    if (r.status === 404) return matikan({galat: "Tautan ini tidak dikenal. Periksa lagi tautan dari WhatsApp."});
    if (r.status === 410) return matikan(r.j);
    if (!r.ok) { pesan(r.j.galat || "Tugas belum bisa dimuat. Periksa sinyal lalu muat ulang halaman.", "galat"); return; }
    info = r.j; $("isi").hidden = false; pesan(""); gambar();
    if (info.penugasan.berangkat_pada) { berangkat = true; tibaSudah = !!info.penugasan.tiba_pada; status("Melanjutkan pengiriman posisi…", ""); mulaiWatch(); jagaLayar(); }
    tombolJalan();
  })();
})();
