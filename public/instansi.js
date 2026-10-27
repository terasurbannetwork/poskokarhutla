/* Instansi: Tugas Api (/instansi). Wakil pemda, polisi, TNI masuk dengan username dan sandi dari admin, mengisi verifikasi, lalu mengerjakan tugas api:
   Konfirmasi (6 jam, GPS + foto + PIC lapangan) dan Kabar tindakan (tiap 24 jam sampai padam). Semua pemeriksaan wewenang ada di Worker (src/instansi.js).
   Konsesi dicocokkan DI SINI (point-in-polygon atas /data/konsesi2026/<prov>.json, dimuat hanya saat form dibuka).
   INP: tombol tab menandai chrome (aria-pressed) lebih dulu, isi digambar sesudah satu frame tercat. CSP: tanpa skrip/gaya inline; teks data lewat esc().
   Antrean luring di IndexedDB pb_instansi: isian (berkas sudah diproses + GPS) disimpan dulu lalu dikirim; server menerima GPS sampai 6 jam. Antrean dan draf form diberi id akun:
   di ponsel bersama tiap akun hanya mengirim dan melihat miliknya sendiri, dan draf (isian + berkas) tahan muat ulang halaman. */
(() => {
  "use strict";
  const KENDALA = {air_jauh: "Air jauh", akses_sulit_rawa: "Akses sulit di rawa", roda_empat_sulit: "Roda empat sulit masuk", air_tidak_cukup: "Air tidak cukup", asap_tebal: "Asap tebal", angin_kencang: "Angin kencang"};
  const BANTUAN = {personel: "Personel", air_pompa: "Air dan pompa", alat_berat: "Alat berat", heli_water_bombing: "Helikopter water bombing", logistik: "Logistik", medis: "Medis", lainnya: "Lainnya"};
  const HASIL = {api_ada: "Api ada di lokasi", bukan_api: "Bukan api", sudah_padam: "Sudah padam"};
  const STATUS_API = {menyala: "Masih menyala", bara: "Tinggal bara", padam: "Sudah padam"};
  const ALASAN_BA = {tidak_ada_bekas: "Tidak ada bekas terbakar", bekas_lama: "Bekas terbakar lama", sumber_panas_lain: "Pabrik, suar gas, atau tungku"};   // = ALASAN_BUKAN_API src/instansi.js
  const olehPetugas = i => i.petugas ? `, dilaporkan ${esc(i.petugas.nama || "petugas")}${i.petugas.peran ? ` (${esc(i.petugas.peran.toLowerCase())})` : ""} lewat tautan petugas` : "";
  const NAMA_ALAT = {pompa: "pompa", selang_m: "selang (m)", jet_shooter: "jet shooter", heli_wb: "helikopter water bombing", alat_berat: "alat berat", drone_termal: "drone termal", pembasah_l: "bahan pembasah (liter konsentrat)"};
  const UNSUR = {bpbd: "BPBD", tni: "TNI", polri: "Polri", manggala_agni: "Manggala Agni", mpa: "MPA", damkar: "Damkar", swasta: "Swasta", relawan: "Relawan", lainnya: "Lainnya"};
  const LAHAN = {gambut: "Gambut", mineral: "Mineral", campuran: "Campuran", tidak_tahu: "Tidak tahu"};
  const NAMA_STATUS = {belum_klaim: "Belum diklaim", menunggu: "Menunggu persetujuan admin", aktif: "Aktif", ditolak: "Ditolak", dicabut: "Dicabut"};
  const LEVEL = ["Rutin", "Patroli", "Siaga", "Prioritas"];   // nama status yang sama dengan layar publik (index.html LV)
  const MAKS_FOTO = 1.4 * 1048576;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const angka = n => fmt(n);   // formatter repo (/inti/format.js)
  const ukuranTeks = b => b >= 1048576 ? `${angka(b / 1048576, 1)} MB` : `${angka(Math.max(1, Math.round(b / 1024)), 0)} KB`;   // berkas kecil tampil KB, bukan "0 MB"
  const pesan = (t, k) => { $("pesan").textContent = t || ""; $("pesan").className = "lp-pesan " + (k || ""); };
  const idAcak = () => [...crypto.getRandomValues(new Uint8Array(10))].map(b => b.toString(16).padStart(2, "0")).join("");
  /* serahkan kerja berat SESUDAH satu frame tercat (dua rAF, setTimeout sebagai jaring untuk tab tersembunyi) */
  const sesudahCat = fn => { let jalan = false; const f = () => { if (!jalan) { jalan = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(f)); setTimeout(f, 120); };

  let saya = null, tugas = [], tab = "tugas", terpilih = null, konsesi = {}, sibuk = false, muatStatus = "memuat", posisi = null, filter = {kab: "", status: "aktif", bencana: ""}, berkas = [], peta = null, penanda = new Map(), picKab = {}, panelSig = "", petaGagal = false, petaMemuat = false;
  const draf = new Map();   // tugasId -> isian form yang belum terkirim, akun yang sedang masuk saja (salinan di IndexedDB store draf, tahan muat ulang)
  let akunTerakhir = null;

  /* galat jaringan tidak dilempar: status 0 (luring); 401 di tengah sesi mengembalikan ke layar masuk */
  async function api(metode, url, body, hx = {}) {
    const raw = body instanceof Blob || body instanceof Uint8Array;
    const h = {...(metode === "POST" ? {"x-pb": "1"} : {}), ...(body === undefined || raw ? {} : {"content-type": "application/json"}), ...(saya ? {"x-akun": saya.akun.id} : {}), ...hx};   // x-akun: server menolak 401 bila sesi milik akun lain (tab lain di ponsel bersama)   // x-pb: header anti-CSRF yang diwajibkan server pada kiriman bersesi
    let r; try { r = await fetch(url, {method: metode, headers: h, body: body === undefined ? undefined : raw ? body : JSON.stringify(body)}); }
    catch (e) { return {ok: false, status: 0, j: {galat: GALAT[0]}}; }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && saya) { saya = null; bersihkanAkun(); tampil(); pesan(GALAT[401], "galat"); }
    if (r.status === 403 && j.wajib_ganti && saya && !saya.akun.wajib_ganti) { saya.akun.wajib_ganti = true; tampil(); }   // sandi awal masih diketahui admin: wajib dibuat baru
    return {ok: r.ok, status: r.status, j};
  }
  /* kalimat galat untuk manusia, bukan kode */
  const GALAT = {0: "Tidak ada sinyal. Isian disimpan di ponsel dan dikirim otomatis saat sinyal kembali.", 401: "Sesi berakhir. Masuk lagi; isian yang belum terkirim tetap tersimpan.", 403: "Akun ini tidak berwenang untuk tugas itu.",
    413: "Berkas terlalu besar. Pilih foto yang lebih kecil atau video yang lebih pendek.", 429: "Terlalu banyak kiriman dalam waktu singkat. Tunggu sebentar; dicoba lagi otomatis."};
  const manusiawi = (r, cadangan) => r.j?.galat || GALAT[r.status] || cadangan || `Gagal (${r.status}). Coba lagi sebentar lagi.`;
  const pil = (t, k = "") => `<span class="in-pil ${k}">${esc(t)}</span>`;
  /* ---- multi-bahaya (kamus kata di instansi_kartu.js, cermin src/tugas_bencana.js): tugas tanpa `bencana` = karhutla; modul khusus api disembunyikan untuk bahaya lain ---- */
  const bid = t => window.KartuApi.idBencana(t), kam = t => window.KartuApi.KAMUS[bid(t)], apiTugas = t => bid(t) === "karhutla";
  const kapital = s => String(s).replace(/^./, c => c.toUpperCase());
  let bcMeta = {}, bcIkon = {};   // warna dan tingkat dari /bencana.json (registry bersama, hanya dibaca); penanda = titik berwarna (modul ikon kepala.js tidak dimuat: ES module, uji statis lama menolaknya)
  const banyakBencana = () => new Set(tugas.map(bid)).size > 1;
  const warnaBc = id => bcMeta[id]?.warna || "#8a94a3";
  async function muatBencanaMeta() {
    try { const j = await (await fetch("/bencana.json")).json(); bcMeta = Object.fromEntries((j.bencana || []).map(b => [b.id, b])); } catch (e) {}
    if ($("fBencana")) segarkanChip();
  }
  const titikBc = id => `<svg class="in-bc-ik" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>`;
  const metodeNama = m => m === "rekomendasi_pvmbg" ? "Rekomendasi PVMBG" : String(m ?? "");
  /* ikon garis (SVG), gaya Ruang Koordinasi; dipakai di baris tugas dan layar kosong */
  const IK = {jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', api: '<path d="M12 3c1 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3 2-4 .3 1.2 1 1.8 1.8 2C11.5 8.5 11.2 5.5 12 3z"/>', galat: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>', panah: '<path d="M15 6l-6 6 6 6"/>', kamera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', luring: '<path d="M3 3l18 18M8.5 8.5A8 8 0 0 0 5 12M16 11.2a8 8 0 0 1 3 1.8M12 17h.01M9 14.2a5 5 0 0 1 3-1.2"/>'};
  const ik = n => `<svg class="in-ik" viewBox="0 0 24 24" aria-hidden="true">${IK[n]}</svg>`;
  const kosongHtml = (teks, tombol, aksi, galat) => `<div class="in-kosong ${galat ? "galat" : ""}"><span class="in-ikon" aria-hidden="true"><svg viewBox="0 0 24 24">${galat ? IK.galat : IK.api}</svg></span><p>${esc(teks)}</p><button type="button" class="lp-tombol utama" data-aksi="${aksi}">${esc(tombol)}</button></div>`;

  /* ================= tampilan utama ================= */
  function tampil() {
    window.InstansiSaya = saya;   // dibaca instansi_laporan.js (satu panggilan /saya saja)
    for (const v of ["vMasuk", "vVerif", "vUtama", "vGanti"]) $(v).hidden = true;
    $("keluar").hidden = !saya; $("akun").hidden = !saya;
    if (!saya) { $("vMasuk").hidden = false; return; }
    $("akun").textContent = saya.akun.wilayah;
    if (saya.akun.status === "aktif" && saya.akun.wajib_ganti) { $("vGanti").hidden = false; return; }
    if (saya.akun.status === "aktif") { $("vUtama").hidden = false; siapIsi(); gantiTab(tab, true); prosesAntrean(); muatDraf(); return; }
    $("vVerif").hidden = false; isiVerif();
  }
  /* wadah tab dibuat SEKALI dan hanya disembunyikan/ditampilkan: pindah tab, muat ulang, atau kirim tidak menghancurkan peta maupun isian form yang belum terkirim */
  function siapIsi() { if (!$("tabTugas")) $("isi").innerHTML = `<div id="tabTugas"></div><div id="tabKontak" hidden></div>`; }
  /* ---- buat sandi baru: sandi awal (CSV) atau hasil reset diketahui admin, jadi wajib diganti; sandi baru tampil SEKALI ---- */
  $("gBuat").addEventListener("click", async () => {
    const t = $("gBuat"); t.disabled = true; pesan("Membuat sandi baru…");
    const r = await api("POST", "/api/instansi/gantisandi", {});
    if (!r.ok) { t.disabled = false; return pesan(manusiawi(r, "Sandi baru belum bisa dibuat."), "galat"); }
    pesan(""); $("gSandi").textContent = r.j.sandi; $("gHasil").hidden = false; $("gAwal").hidden = true;
  });
  $("gSalin").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("gSandi").textContent); pesan("Sandi disalin.", "ok"); } catch (e) { pesan("Salin manual: tekan lama pada sandi.", "galat"); } });
  $("gLanjut").addEventListener("click", async () => { $("gSandi").textContent = ""; $("gHasil").hidden = true; $("gAwal").hidden = false; $("gBuat").disabled = false; await muatSaya(); });
  muatBencanaMeta();
  async function muatSaya() {
    const r = await api("GET", "/api/instansi/saya");
    saya = r.ok ? r.j : null;
    if (saya && saya.akun.id !== akunTerakhir) { bersihkanAkun(); akunTerakhir = saya.akun.id; }   // akun lain di ponsel yang sama tidak melihat form, draf, atau berkas akun sebelumnya
    tampil();
  }
  $("fMasuk").addEventListener("submit", async e => {
    e.preventDefault(); const t = $("mKirim"); t.disabled = true; pesan("Memeriksa…");
    if (!$("mUser").value.trim() || !$("mSandi").value) { t.disabled = false; return pesan("Isi username dan sandi dulu.", "galat"); }
    const r = await api("POST", "/api/instansi/masuk", {username: $("mUser").value.trim(), sandi: $("mSandi").value});
    t.disabled = false;
    if (!r.ok) return pesan(r.status === 401 ? "Username atau sandi salah. Periksa huruf besar dan kecil, lalu coba lagi. Bila tetap gagal, minta admin mengatur ulang sandi." : manusiawi(r, "Belum bisa masuk. Coba lagi sebentar lagi."), "galat");
    $("mSandi").value = ""; pesan(""); await muatSaya();
  });
  $("mMata").addEventListener("click", () => { const buka = $("mSandi").type === "password"; $("mSandi").type = buka ? "text" : "password"; $("mMata").setAttribute("aria-pressed", String(buka)); $("mMata").setAttribute("aria-label", buka ? "Sembunyikan sandi" : "Tampilkan sandi"); });
  $("keluar").addEventListener("click", async () => {
    const n = (await semuaAntrean()).filter(x => milikKu(x) && !x.galat).length;
    const r = await api("POST", "/api/instansi/keluar", {});
    /* tanpa sinyal sesi di server belum dicabut: jangan pura-pura keluar (orang berikutnya di ponsel ini akan masuk sebagai akun ini) */
    if (!r.ok && r.status !== 401) return pesan(r.status === 0 ? "Tidak ada sinyal, belum bisa keluar. Sesi masih aktif di ponsel ini; tekan Keluar lagi saat ada sinyal." : manusiawi(r, "Belum bisa keluar. Coba lagi."), "galat");
    saya = null; bersihkanAkun(); akunTerakhir = null;
    pesan(n ? `${n} isian akunmu belum terkirim. Isian itu tetap tersimpan di ponsel ini dan terkirim saat akun ini masuk lagi, paling lambat 6 jam sesudah foto diambil (lokasi yang lebih tua ditolak server).` : ""); tampil();
  });
  /* keluar, sesi habis, atau akun lain masuk: tidak ada form, berkas, daftar, banner, atau draf akun lama yang tersisa di layar maupun memori; antrean yang sedang jalan berhenti */
  function bersihkanAkun() {
    clearTimeout(tmDraf); generasi++;
    draf.clear(); berkas = []; for (const u of urlBerkas.values()) URL.revokeObjectURL(u); urlBerkas.clear();
    terpilih = null; tugas = []; picKab = {}; panelSig = ""; rincianMem.clear();
    for (const p of penanda.values()) { try { p.m?.remove(); } catch (e) {} } penanda.clear();
    for (const id of ["panel", "daftar", "banner", "tabKontak"]) { const e = $(id); if (e) e.replaceChildren(); }
    if ($("banner")) $("banner").hidden = true;
    window.UjiLapangan?.lepas();
  }

  /* ================= verifikasi ================= */
  const KOL = {vNama: "nama", vNip: "nip", vPangkat: "pangkat", vJabatan: "jabatan", vUnit: "unit", vEmail: "email", vWa: "wa", vTelp: "telepon_kantor"};
  function isiVerif() {
    const a = saya.akun, v = a.verifikasi || {};
    $("verifBanner").className = "lp-banner " + (a.status === "menunggu" ? "menunggu" : a.status === "ditolak" ? "ditolak" : "");
    $("verifBanner").textContent = a.status === "menunggu" ? "Data sudah terkirim dan menunggu persetujuan admin. Kamu masih boleh memperbaiki dan mengirim ulang."
      : a.status === "ditolak" ? `Verifikasi ditolak: ${a.alasan || "tanpa alasan"}. Perbaiki data lalu kirim ulang.` : "Akun belum diklaim. Isi data verifikasi di bawah. Tugas api baru terbuka setelah admin menyetujui.";
    for (const [id, k] of Object.entries(KOL)) if (!$(id).value && v[k]) $(id).value = v[k];
    $("vSuratInfo").textContent = v.surat ? "Surat tugas sudah terunggah. Pilih berkas lagi untuk menggantinya." : "Belum ada surat tugas.";
    $("vKartuInfo").textContent = v.kartu ? "Foto kartu sudah terunggah. Pilih foto lagi untuk menggantinya." : "Belum ada foto kartu.";
  }
  /* foto -> JPEG <= 1,4 MB (sisi terpanjang 1280 px); canvas membuang EXIF */
  async function kecilkan(file) {
    if (!file) return null;
    try {
      const bmp = await createImageBitmap(file), skala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
      c.width = Math.round(bmp.width * skala); c.height = Math.round(bmp.height * skala); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      for (const q of [0.72, 0.55, 0.4]) { const b = await new Promise(r => c.toBlob(r, "image/jpeg", q)); if (b && b.size <= MAKS_FOTO) return b; }
    } catch (e) {}
    return file.size <= MAKS_FOTO && file.type === "image/jpeg" ? file : null;
  }
  async function unggahDok(jenis, file, info) {
    if (!file) return;
    let isi = file;
    if (file.type !== "application/pdf") { isi = await kecilkan(file); if (!isi) return pesan("Foto terlalu besar atau tidak terbaca. Coba foto lain.", "galat"); }
    else if (file.size > 3 * 1048576) return pesan("PDF lebih dari 3 MB.", "galat");
    info.textContent = "Mengunggah…";
    const r = await api("POST", "/api/instansi/" + jenis, isi);
    info.textContent = r.ok ? "Berkas terunggah." : (r.j.galat || "Gagal mengunggah");
    if (r.ok) saya.akun.verifikasi[jenis] = true;
  }
  $("vSurat").addEventListener("change", e => unggahDok("surat", e.target.files[0], $("vSuratInfo")));
  $("vKartu").addEventListener("change", e => unggahDok("kartu", e.target.files[0], $("vKartuInfo")));
  $("fVerif").addEventListener("submit", async e => {
    e.preventDefault(); const t = $("vKirim"); t.disabled = true; pesan("Mengirim…");
    const body = Object.fromEntries(Object.entries(KOL).map(([id, k]) => [k, $(id).value.trim()]));
    const r = await api("POST", "/api/instansi/verifikasi", body);
    t.disabled = false;
    if (!r.ok) return pesan(r.j.galat || "Gagal mengirim", "galat");
    pesan("Verifikasi terkirim. Menunggu persetujuan admin.", "ok"); await muatSaya();
  });

  /* ================= tab ================= */
  $("tab").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { pesan(""); gantiTab(b.dataset.tab); } });
  function gantiTab(k, paksa) {
    tab = k;
    for (const b of $("tab").children) b.setAttribute("aria-pressed", String(b.dataset.tab === k));   // chrome urgent
    for (const [id, w] of [["tabTugas", "tugas"], ["tabKontak", "kontak"]]) if ($(id)) $(id).hidden = w !== k;
    if (!paksa) $("isi").setAttribute("aria-busy", "true");
    sesudahCat(async () => { await TAMPIL[k](); $("isi").removeAttribute("aria-busy"); });
  }
  const skeleton = n => `<div class="in-skel-daftar" aria-hidden="true">${Array.from({length: n}, () => `<div class="in-skel"></div>`).join("")}</div>`;
  const desktop = () => window.matchMedia("(min-width: 1024px)").matches;
  async function muatTugas() {
    muatStatus = "memuat"; const g = generasi;
    const r = await api("GET", "/api/instansi/tugas"); if (g !== generasi) return false;   // akun berganti selama menunggu: jawaban akun lama dibuang
    if (!r.ok) { muatStatus = "galat:" + manusiawi(r, "Tugas belum bisa dimuat."); return false; }
    tugas = r.j.tugas; picKab = r.j.pic_kab || {}; muatStatus = "ok"; return true;
  }
  const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371; };
  const jarakKe = t => posisi ? jarakKm(posisi.lat, posisi.lon, t.lat, t.lon) : null;
  /* terlambat dulu, lalu terdekat dari GPS (bila diizinkan), lalu terbaru */
  const urut = (x, y) => (y.terlambat - x.terlambat) || ((jarakKe(x) ?? 0) - (jarakKe(y) ?? 0)) || (y.dibuat - x.dibuat);
  function tampilan() {
    return tugas.filter(t => (!filter.kab || t.kab === filter.kab) && (!filter.bencana || bid(t) === filter.bencana) && (filter.status === "" || (filter.status === "aktif" ? t.status === "buka" : filter.status === "terlambat" ? t.terlambat : t.status !== "buka"))).sort(urut);
  }
  /* ---- Tugas ---- */
  /* bahaya selain karhutla: rekomendasi resmi (gunungapi: teks PVMBG dari MAGMA) dengan sumbernya, tanpa pil "Perkiraan" karena bukan hitungan mesin */
  function rekomendasiResmi(r) {
    const cara = Array.isArray(r?.cara) ? r.cara.filter(c => c && c.alasan) : []; if (!cara.length) return "";
    return `<div class="in-cara">${cara.map(c => `<p><span class="k">${esc(metodeNama(c.metode))}</span><b>${esc(c.alasan)}</b></p>`).join("")}${r.sumber ? `<p class="lp-kecil">Sumber: ${esc(r.sumber)}</p>` : ""}</div>`;
  }
  function rekomendasi(r, tanpaPil) {
    if (!r || typeof r !== "object") return "";
    const cara = Array.isArray(r.cara) ? r.cara : [], alat = Array.isArray(r.alat) ? r.alat : [], b = Array.isArray(r.bara_cm) ? r.bara_cm : null;
    if (!cara.length && !alat.length && !(b && b.length === 3) && !r.catatan) return "";
    return `<div class="in-rek">${tanpaPil ? "" : `<div>${pil("Perkiraan, belum divalidasi lapangan", "emas")}</div>`}
      ${cara.length ? `<h3>Cara pemadaman</h3><ol>${cara.map(c => `<li><b>${esc(c.metode)}</b>${c.alasan ? `: ${esc(c.alasan)}` : ""}</li>`).join("")}</ol>` : ""}
      ${alat.length ? `<h3>Alat</h3><ul>${alat.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${b && b.length === 3 ? `<p><b>Perkiraan kedalaman bara:</b> ${b.map(x => angka(x, 0)).join(", ")} cm (rendah, tengah, tinggi)</p>` : ""}
      ${r.catatan ? `<p>${esc(r.catatan)}</p>` : ""}</div>`;
  }
  /* "di lapangan sekarang" (kabar terakhir) dan waktu terdokumentasi; kebutuhan dan selisihnya digambar Kebutuhan.html */
  function lapanganSekarang(t) {
    const kamT = kam(t), s = t.sekarang, d = t.dokumentasi || {};
    if (!s && d.mulai == null) return "";
    const al = s?.alat || {}, per = s?.personel_efektif;
    return `<div class="in-rek"><h3>Di lapangan sekarang</h3>${s ? `<p>${esc(kamT.st[s.status_api] || "-")}, ${per != null ? `${angka(per, 0)} personel` : "personel belum diisi"}${s.personel_terlihat != null ? `, minimal ${angka(s.personel_terlihat, 0)} orang terlihat di foto (hitungan mesin, bisa kurang karena asap atau di luar bingkai)` : ""}, ${s.regu != null ? angka(s.regu, 0) + " regu" : "regu belum diisi"}.
        ${Object.keys(al).length ? `Alat: ${esc(Object.entries(al).map(([a, n]) => `${NAMA_ALAT[a] || a} ${angka(n, 0)}`).join(", "))}.` : ""}</p>` : `<p>Belum ada kabar tindakan.</p>`}
      ${d.mulai != null ? `<p>Pemadaman terdokumentasi mulai ${esc(jamWIB(d.mulai))}${d.padam != null ? `, padam terdokumentasi ${esc(jamWIB(d.padam))}${d.durasi_ms != null ? `, selang ${fmt.durasi(d.durasi_ms)}` : ""}` : ""}. Ini waktu foto atau video, bukan jam mulai atau padam yang sebenarnya.</p>` : ""}</div>`;
  }
  const statusPil = t => (t.status === "padam" ? pil(kapital(kam(t).selesai), "hijau") : t.status === "bukan_api" ? pil(kam(t).st.bukan_api) : t.terlambat ? pil("Terlambat", "merah") : pil("Aktif", "emas")) + (t.hipotesis || bid(t) === "kekeringan" ? pil("Hipotesis") : "") + (apiTugas(t) && window.Tugaskan ? window.Tugaskan.padamPil(t) : "");   // pil verifikasi padam di samping status
  const langkahNama = t => t.konfirmasi_pada == null ? "Konfirmasi" : "Kabar tindakan";
  /* cara pemadaman dari rekomendasi: utama = urutan pertama, pelengkap = sisanya (perkiraan pipeline, bukan hasil validasi lapangan) */
  const caraTeks = r => { const c = (Array.isArray(r?.cara) ? r.cara : []).map(x => x && x.metode).filter(Boolean); return c.length ? {utama: c[0], lengkap: c.slice(1)} : null; };
  function baris(t) {
    const kini = Date.now(), j = jarakKe(t), c = caraTeks(t.rekomendasi), api = apiTugas(t);
    const batas = t.status !== "buka" ? "Selesai" : `${langkahNama(t)} ${t.terlambat ? "terlambat" : "sisa"} ${fmt.durasi(t.tenggat - kini)}`;
    return `<button type="button" class="in-baris ${t.terlambat ? "telat" : ""} ${t.id === terpilih ? "aktif" : ""}" data-id="${esc(t.id)}" aria-pressed="${t.id === terpilih}">
      <span class="in-c-nama"><b>${esc(Wilayah.kab(t.kab))}</b>${t.kec ? `<small>Kecamatan ${esc(t.kec)}</small>` : ""}${!api || banyakBencana() ? `<small class="in-bc" data-bc="${esc(bid(t))}">${titikBc(bid(t))}${esc(t.bencana_nama || kam(t).nama)}</small>` : ""}</span><span class="in-c-status">${statusPil(t)}</span>
      <span class="in-c-ciri">${t.judul ? `<b>${esc(t.judul)}</b>. ` : ""}${esc(t.ciri || "")}</span>
      <span class="in-c-batas ${t.terlambat && t.status === "buka" ? "telat" : ""}">${t.status === "buka" ? ik("jam") : ""}${esc(batas)}</span>
      <span class="in-c-umur">Umur ${fmt.durasi(kini - t.dibuat)}</span><span class="in-c-jarak">${j == null ? "" : `sekitar ${angka(j, 1)} km`}</span>
      <span class="in-c-cara">${c ? (api ? `<span>Cara utama: <b>${esc(c.utama)}</b></span>${pil("Perkiraan, belum divalidasi lapangan", "emas")}` : `<span><b>${esc(metodeNama(c.utama))}</b></span>`) : ""}</span></button>`;
  }
  function daftarHtml() {
    const d = tampilan();
    if (muatStatus === "memuat") return skeleton(5);
    if (muatStatus.startsWith("galat:")) return kosongHtml(muatStatus.slice(6), "Coba lagi", "muat", true);
    if (!tugas.length) return kosongHtml("Belum ada tugas api di wilayahmu. Tugas baru muncul otomatis tiap 3 jam bila ada titik api.", "Muat ulang", "muat");
    if (!d.length) return kosongHtml(filter.bencana ? `Tidak ada tugas ${window.KartuApi.KAMUS[filter.bencana].nama.toLowerCase()} yang cocok dengan penyaring.` : "Tidak ada tugas yang cocok dengan penyaring.", "Tampilkan semua tugas", "semua");
    return d.slice(0, 150).map(baris).join("");
  }
  async function tampilTugas() {
    const w = $("tabTugas");
    if (!w.firstChild) { muatStatus = "memuat"; w.innerHTML = tataLetak(); segarkanDaftar(); }   // kerangka dibuat SEKALI; sesudahnya hanya daftar dan (bila berubah) panel yang disegarkan
    else $("daftar").setAttribute("aria-busy", "true");
    await muatTugas();
    if (terpilih && !tugas.some(t => t.id === terpilih)) terpilih = null;
    segarkanDaftar(); isiPanel(); bukaPeta(); cobaPosisi();
    if (muatStatus === "ok" && window.Tugaskan) sesudahCat(() => window.Tugaskan.popupMasuk({saya, tugas, lihatTugas: () => { filter = {kab: "", status: "aktif", bencana: ""}; segarkanDaftar(); $("daftar")?.scrollIntoView?.({block: "start"}); }}).catch(() => {}));   // pop-up peta wilayah sekali per sesi
  }
  function tataLetak() {
    return `<div class="in-app tanpa-peta" data-pilih="0"><div class="in-kiri">
      <div id="fBencana" class="in-chips" role="group" aria-label="Jenis bencana" hidden></div>
      <div class="in-filter"><label>Kabupaten<select id="fKab"><option value="">Semua</option></select></label>
        <label>Status<select id="fStatus">${[["aktif", "Aktif"], ["terlambat", "Terlambat"], ["selesai", "Selesai"], ["", "Semua"]].map(([k, v]) => `<option value="${k}" ${k === filter.status ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <button type="button" class="lp-tombol" id="bJarak" data-aksi="jarak">Urut terdekat</button></div>
      <div id="daftar" class="in-daftar"></div></div>
      <div class="in-tengah" id="petaWadah" hidden></div><div class="in-kanan" id="panel"></div></div>`;
  }
  /* daftar saja: opsi kabupaten dijaga pilihannya, baris diganti, penanda peta diperbarui lewat diff */
  function segarkanDaftar() {
    const kab = [...new Set(tugas.map(t => t.kab))].sort(), f = $("fKab"); if (!f) return;
    if (filter.kab && !kab.includes(filter.kab)) filter.kab = "";
    f.innerHTML = `<option value="">Semua</option>` + kab.map(k => `<option ${k === filter.kab ? "selected" : ""}>${esc(k)}</option>`).join("");
    segarkanChip(); $("bJarak").textContent = posisi ? "Jarak darimu aktif" : "Urut terdekat";
    $("daftar").innerHTML = daftarHtml(); $("daftar").removeAttribute("aria-busy");
    perbaruiPenanda();
  }
  /* chip jenis bencana: Semua dan bahaya yang punya tugas; hanya muncul bila ada lebih dari satu bahaya. Keadaan aktif diperbarui seketika oleh penangan klik (chrome urgent). */
  function segarkanChip() {
    const w = $("fBencana"); if (!w) return;
    const n = new Map(); for (const t of tugas) n.set(bid(t), (n.get(bid(t)) || 0) + 1);
    const tabT = document.querySelector('#tab [data-tab="tugas"]'); if (tabT) tabT.textContent = [...n.keys()].some(k => k !== "karhutla") ? "Tugas" : "Tugas api";
    if (filter.bencana && !n.has(filter.bencana)) filter.bencana = "";
    w.hidden = n.size < 2; const sig = [...n].join("|") + "|" + Object.keys(bcMeta).length + "|" + filter.bencana;
    if (w.dataset.sig === sig) return;
    w.dataset.sig = sig; w.replaceChildren();
    const tombol = (id, nama, jumlah) => { const b = document.createElement("button"); b.type = "button"; b.className = "in-chip"; b.dataset.bc = id; b.setAttribute("aria-pressed", String(filter.bencana === id));
      if (id) { b.innerHTML = titikBc(id); b.firstChild.style.color = warnaBc(id); }
      b.append(document.createTextNode(`${nama} ${angka(jumlah, 0)}`)); w.append(b); };
    tombol("", "Semua", tugas.length);
    for (const [id, jml] of n) tombol(id, window.KartuApi.KAMUS[id].nama, jml);
  }
  /* GPS hanya dibaca bila izin sudah diberikan (tanpa meminta izin tiba-tiba); selain itu lewat tombol "Urut terdekat" */
  async function cobaPosisi() {
    if (posisi || !navigator.geolocation || !navigator.permissions) return;
    try { if ((await navigator.permissions.query({name: "geolocation"})).state === "granted") ambilPosisi(); } catch (e) {}
  }
  function ambilPosisi() {
    navigator.geolocation.getCurrentPosition(p => { posisi = {lat: p.coords.latitude, lon: p.coords.longitude}; if ($("daftar")) segarkanDaftar(); },
      () => pesan("Lokasi belum terbaca. Izinkan akses lokasi lalu ketuk Urut terdekat.", "galat"), {enableHighAccuracy: false, timeout: 15000, maximumAge: 120000});
  }

  /* ---- panel tugas terpilih: kebutuhan, riwayat, dan formulir lapor ---- */
  function pilihTugas(id) {
    simpanDrafPanel();
    terpilih = id;
    for (const b of document.querySelectorAll(".in-baris[data-id]")) { const on = b.dataset.id === id; b.classList.toggle("aktif", on); b.setAttribute("aria-pressed", String(on)); }   // chrome urgent
    $("tabTugas").querySelector(".in-app").dataset.pilih = id ? "1" : "0";
    sesudahCat(() => { isiPanel(); soroti(); if (!desktop()) window.scrollTo(0, 0); });
  }
  const ingatKunci = t => `pb_pic:${akunKu()}|${t.prov}|${String(t.kab).toLowerCase()}`;   // per akun: PIC akun lain di ponsel yang sama tidak terisi otomatis
  /* PIC terakhir: dari server (isian akun ini di kabupaten yang sama), cadangan localStorage perangkat */
  const ingatPIC = t => { const d = picKab[`${t.prov}|${String(t.kab).toLowerCase()}`]; if (d?.nama && d.jabatan && d.wa) return d; try { const x = JSON.parse(localStorage.getItem(ingatKunci(t)) || "null"); return x && x.nama && x.jabatan && x.wa ? x : null; } catch (e) { return null; } };
  const mediaWidget = () => `<div class="in-media-aksi"><label class="lp-tombol utama in-ambil">${ik("kamera")}Ambil foto atau video<input id="mAmbil" type="file" accept="image/*,video/*" capture="environment"></label>
      <label class="lp-tombol in-galeri-pilih">Pilih dari galeri<input id="mGaleri" type="file" accept="image/*,video/*" multiple></label></div>
    <div id="mDrop" class="in-drop">Seret dan lepas foto atau video di sini, maksimal 10 berkas</div><div id="mPrev" class="in-prev"></div>`;
  /* alat inventaris siap (modul instansi_alat.js, window.AlatInv.siap): opsional, id-nya dikirim sebagai alat_inventaris */
  async function alatInvMuat(tid) {
    const w = $("alatInvWadah"); if (!w) return;
    let L = []; try { L = window.AlatInv ? await window.AlatInv.siap() : []; } catch (e) { L = []; }
    if (!$("alatInvWadah") || terpilih !== tid) return;
    const pilihan = new Set(draf.get(tid)?.cek?.alatInv || []);
    w.innerHTML = L.length ? L.map(a => `<label class="lp-cek"><input type="checkbox" name="alatInv" value="${esc(a.id)}"${pilihan.has(a.id) ? " checked" : ""}>${esc(`${a.label || String(a.kategori).replace(/_/g, " ")}${a.merek_model ? " " + a.merek_model : ""}, ${angka(a.jumlah, 0)} unit, ${a.gudang}`)}</label>`).join("")
      : `<p class="lp-kecil">Tidak ada alat siap di inventarismu. Catat alat di tab Peralatan.</p>`;
  }
  /* cek ulang lapangan sesudah dilaporkan padam: foto kedua di lokasi (satelit tidak melihat bara bawah permukaan) */
  const formCekUlang = t => `<form id="fLapor" class="in-form in-blok" data-akun="${esc(akunKu())}" data-tugas="${esc(t.id)}" data-langkah="cekulang" novalidate><h2>Cek ulang lapangan</h2>
    <p class="lp-kecil">Laporan padam ditutup dengan foto kedua di lokasi. Periksa tanah dan gambut dengan tangan atau tongkat, lalu foto lokasi yang sudah padam.</p>${mediaWidget()}${apiTugas(t) && window.UjiLapangan ? window.UjiLapangan.bidangCek() : ""}
    <div class="in-bar"><ul id="progBerkas" class="in-up"></ul><p id="progres" class="in-progres" role="status" aria-live="polite"></p><button type="submit" id="kirim" class="lp-tombol utama besar">Kirim foto cek ulang</button></div></form>`;
  const KENDALA_API = ["air_jauh", "akses_sulit_rawa", "air_tidak_cukup", "asap_tebal"];   // kendala khas pemadaman; bahaya lain memakai sisanya
  const langkahHtml = (n, teks) => `<h3 class="in-langkah"><i>${n}</i>${esc(teks)}</h3>`;
  function formLapor(t) {
    const konf = t.konfirmasi_pada == null, pic = ingatPIC(t), api = apiTugas(t), km = kam(t);
    const kunci = (konf ? ["menyala", "bara", "padam", "bukan_api"] : ["menyala", "bara", "padam"]).filter(k => km.st[k]);   // gempa: tanpa tombol selesai
    const st = kunci.map(k => `<label class="in-st st-${k}"><input type="radio" name="sapi" value="${k}"><span>${esc(km.st[k])}</span></label>`).join("");
    return `<form id="fLapor" class="in-form in-blok" data-akun="${esc(akunKu())}" data-tugas="${esc(t.id)}" data-langkah="${konf ? "konfirmasi" : "kabar"}" novalidate>
      <h2>${konf ? "Konfirmasi di lokasi" : "Kabar tindakan"}</h2>
      ${langkahHtml(1, "Foto atau video")}${mediaWidget()}
      ${langkahHtml(2, km.kondisi)}<div class="in-status ${kunci.length === 4 ? "empat" : kunci.length === 3 ? "tiga" : "dua"}" role="radiogroup" aria-label="${esc(km.kondisi)}">${st}</div>
      ${konf && api ? `<label id="wadahAlasanBA" class="in-alasan" hidden>Kenapa bukan api? Wajib<select id="alasanBA"><option value="">Pilih alasan</option>${Object.entries(ALASAN_BA).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label>` : ""}
      ${konf ? `<details class="in-rinci" ${pic ? "" : "open"}><summary>PIC lapangan, wajib${pic ? " (terisi dari kiriman sebelumnya di kabupaten ini)" : ""}</summary>
        <label>Nama PIC lapangan<input id="picNama" maxlength="80" autocomplete="name" value="${esc(pic?.nama)}"></label><label>Jabatan atau instansi<input id="picJabatan" maxlength="80" value="${esc(pic?.jabatan)}"></label>
        <label>Nomor WhatsApp<input id="picWa" inputmode="tel" maxlength="30" autocomplete="tel" value="${esc(pic?.wa)}"></label></details>` : ""}
      <details class="in-rinci" id="rinci"><summary>Tambah keterangan, boleh dilewati</summary>
        ${konf ? "" : `<label>Tindakan yang dilakukan<textarea id="tindakan" rows="3" maxlength="1000"></textarea></label>
          <h3 class="in-sub">Kendala</h3><div class="lp-centang">${Object.entries(KENDALA).filter(([k]) => api || !KENDALA_API.includes(k)).map(([k, v]) => `<label class="lp-cek"><input type="checkbox" name="kendala" value="${k}">${v}</label>`).join("")}</div>
          <label>Kendala lain<input id="kendalaLain" maxlength="300"></label>
          <h3 class="in-sub">Bantuan yang dibutuhkan</h3><div class="lp-centang">${Object.entries(BANTUAN).filter(([k]) => api || k !== "heli_water_bombing").map(([k, v]) => `<label class="lp-cek"><input type="checkbox" name="bantuan" value="${k}">${v}</label>`).join("")}</div>
          <label>Bantuan lain<input id="bantuanLain" maxlength="300"></label>
          <h3 class="in-sub">Alat dari inventaris yang dipakai</h3><div id="alatInvWadah" class="lp-centang"><p class="lp-kecil">Memuat alat siap…</p></div>`}
        ${api ? `<label>Luas terbakar di lokasi (hektare)<input id="luas" inputmode="decimal"></label><label>Sudah dipadamkan (hektare)<input id="padam" inputmode="decimal"></label>` : ""}
        ${bidangPemadaman(api)}${api ? gambutBidang() : ""}
        ${konf && api ? `<h3 class="in-sub">Perusahaan konsesi</h3><div id="ptWadah" class="in-baris-isi"><p class="lp-kecil">Dicocokkan dengan peta konsesi saat bagian ini dibuka.</p></div>` : ""}</details>
      ${api && window.UjiLapangan ? window.UjiLapangan.bidang(t.id, konf) : ""}
      ${langkahHtml(3, "Kirim")}
      <div class="in-bar"><ul id="progBerkas" class="in-up"></ul><p id="progres" class="in-progres" role="status" aria-live="polite"></p>
        <button type="submit" id="kirim" class="lp-tombol utama besar">Kirim laporan</button></div></form>`;
  }
  /* kebutuhan pemadaman dan kondisi lapangan: selalu terlihat (tanpa dibuka), kartu hanya bila ada isinya */
  function kebutuhanKartu(t, pilSudah) {   // pil "Perkiraan, belum divalidasi lapangan" cukup sekali per rincian: yang pertama tampil menang
    if (!apiTugas(t)) return `<div class="in-kartu"><h2 class="in-sub">Kondisi lapangan dan gudang terdekat</h2>${lapanganSekarang(t)}<div id="gudangTugas" class="in-gudang"></div></div>`;
    const rek = rekomendasi(t.rekomendasi, pilSudah), h = rek + window.Kebutuhan.html(t, pilSudah || !!rek) + lapanganSekarang(t);
    return `<div class="in-kartu"><h2 class="in-sub">Kebutuhan pemadaman dan kondisi lapangan</h2>${h}<div id="gudangTugas" class="in-gudang"></div></div>`;
  }
  /* rincian tugas (isian, media, gudang terdekat) dimuat SEKALI per keadaan tugas: dipakai gudang terdekat dan riwayat */
  const rincianMem = new Map();
  const ambilRincian = id => { if (!rincianMem.has(id)) rincianMem.set(id, api("GET", "/api/instansi/tugas/" + id).then(r => { if (!r.ok) rincianMem.delete(id); return r; })); return rincianMem.get(id); };
  async function gudangMuat(id) {
    const w = $("gudangTugas"); if (!w) return;
    w.innerHTML = `<p class="lp-kecil">Mencari gudang terdekat…</p>`;
    const r = await ambilRincian(id); if (terpilih !== id || !$("gudangTugas")) return;
    $("gudangTugas").innerHTML = r.ok ? window.Kebutuhan.gudang(r.j.gudang_terdekat) : "";
  }
  /* Kartu Api (instansi_kartu.js): `kartu` ada di detail tugas; sebelum detail datang, kartu dari data tugas yang ada (kartu null = tampilkan yang ada saja) */
  async function kartuMuat(t) {
    if (!window.KartuApi || !$("kartuApi")) return;
    window.KartuApi.pasang($("kartuApi"), t, t.kartu ?? null);
    const r = await ambilRincian(t.id); if (terpilih !== t.id || !$("kartuApi") || !r.ok) return;
    const k = r.j?.kartu ?? r.j?.tugas?.kartu; if (k) window.KartuApi.pasang($("kartuApi"), t, k);
  }
  /* ---- draf isian per tugas (memori): menyimpan semua isian form yang belum terkirim supaya tidak hilang ---- */
  function simpanDrafPanel(berkasBerubah = false) {
    const f = $("fLapor"); if (!f || f.dataset.akun !== akunKu() || f.dataset.terkirim) return;   // form yang sudah masuk antrean tidak menjadi draf lagi
    const d = {diubah: Date.now(), sapi: (f.querySelector('input[name="sapi"]:checked') || {}).value || null, nilai: {}, cek: {}, rinci: !!$("rinci")?.open, berkas: [...berkas]};
    for (const e of f.querySelectorAll("input,textarea,select")) {
      if (e.type === "file" || e.type === "radio" || e.type === "checkbox") continue;
      const kunci = e.id || (e.dataset.unsur ? "u:" + e.dataset.unsur : e.dataset.alat ? "a:" + e.dataset.alat : null); if (kunci && e.value) d.nilai[kunci] = e.value;
    }
    for (const e of f.querySelectorAll('input[type="checkbox"]:checked')) (d.cek[e.name] ||= []).push(e.value);
    if (!d.sapi && !d.rinci && !d.berkas.length && !Object.keys(d.nilai).length && !Object.keys(d.cek).length) return buangDraf(f.dataset.tugas);   // form belum disentuh: tidak ada draf
    draf.set(f.dataset.tugas, d); simpanDrafIdb(f.dataset.tugas, d, berkasBerubah);
  }
  function pulihDraf(tid) {
    const d = draf.get(tid); berkas = d ? [...d.berkas] : []; pratinjau();
    const f = $("fLapor"); if (!d || !f) return;
    if (d.sapi) { const r = f.querySelector(`input[name="sapi"][value="${d.sapi}"]`); if (r) r.checked = true; }
    for (const [k, v] of Object.entries(d.nilai)) { const e = k.startsWith("u:") ? f.querySelector(`[data-unsur="${k.slice(2)}"]`) : k.startsWith("a:") ? f.querySelector(`[data-alat="${k.slice(2)}"]`) : $(k); if (e && f.contains(e)) e.value = v; }
    for (const [nama, daftar] of Object.entries(d.cek)) for (const e of f.querySelectorAll(`input[type="checkbox"][name="${nama}"]`)) e.checked = daftar.includes(e.value);
    if (d.rinci && $("rinci")) $("rinci").open = true;
    tampilAlasanBA();
  }
  const tampilAlasanBA = () => { const w = $("wadahAlasanBA"); if (w) w.hidden = (document.querySelector('input[name="sapi"]:checked') || {}).value !== "bukan_api"; };
  /* panel digambar ulang HANYA bila tugas terpilih berganti atau keadaannya berubah (status, konfirmasi, kabar): muat ulang daftar tidak menyentuh form yang sedang diisi */
  function isiPanel(paksa) {
    const w = $("panel"); if (!w) return;
    const t = tugas.find(x => x.id === terpilih), sig = t ? `${t.id}|${t.status}|${t.konfirmasi_pada}|${t.isian_terakhir}|${t.padam_verif}|${t.cek_ulang_pada}` : "";
    if (!paksa && sig === panelSig && w.firstChild) return;
    simpanDrafPanel(); panelSig = sig; rincianMem.clear();
    if (!t) { w.innerHTML = desktop() ? `<div class="in-kosong"><p>Pilih satu tugas di daftar untuk melapor.</p></div>` : ""; berkas = []; pratinjau(); return; }
    const buka = t.status === "buka", c = caraTeks(t.rekomendasi), kini = Date.now(), j = jarakKe(t), api = apiTugas(t), km = kam(t), tingkat = bcMeta[bid(t)]?.tingkat?.find(x => x.kode === t.level)?.nama;
    w.innerHTML = `<button type="button" class="lp-tombol in-kembali" data-aksi="kembali">${ik("panah")}Kembali ke daftar</button>
      <div class="in-kartu ${t.terlambat && buka ? "terlambat" : ""}"><div class="in-kepala"><div><b class="in-kab">${esc(Wilayah.kab(t.kab))}</b>${t.kec ? `<span class="in-kec">Kecamatan ${esc(t.kec)}</span>` : ""}</div>${statusPil(t)}</div>
        ${t.judul ? `<p class="in-ciri"><b>${esc(t.judul)}</b>. ${esc(t.arahan || "")}</p>` : ""}
        ${t.ciri ? `<p class="in-ciri">${esc(t.ciri)}</p>` : ""}
        <a class="lp-tombol in-nav" href="https://www.google.com/maps/dir/?api=1&amp;destination=${esc(t.lat)},${esc(t.lon)}&amp;travelmode=driving" target="_blank" rel="noopener noreferrer">${ik("panah")}Navigasi ke ${esc(km.titik)} (Google Maps)</a>
        <p class="lp-kecil in-nav-cat">Google Maps berhenti di ujung jalan yang bisa dilalui; sisanya jalan kaki, lihat kartu akses.</p>
        ${buka ? `<div class="in-tenggat ${t.terlambat ? "telat" : ""}"><span class="in-t-label">${langkahNama(t)} ${t.terlambat ? "terlambat" : "sisa waktu"}</span><b class="in-t-angka">${fmt.durasi(t.tenggat - kini)}</b></div>` : ""}
        <dl class="in-stat"><div><dt>Umur tugas</dt><dd>${fmt.durasi(kini - t.dibuat)}</dd></div>${j == null ? "" : `<div><dt>Jarak darimu</dt><dd>${angka(j, 1)}<small>km</small></dd></div>`}
          ${api ? `<div><dt>Titik 24 jam</dt><dd>${angka(t.n24, 0)}</dd></div><div><dt>Luas satelit</dt><dd>${angka(t.luas_ha, 0)}<small>ha</small></dd></div><div><dt>Status karhutla</dt><dd>${LEVEL[Math.min(3, Math.max(0, t.level | 0))]}</dd></div>`
            : `<div><dt>Jenis</dt><dd>${esc(t.bencana_nama || km.nama)}</dd></div>${tingkat ? `<div><dt>Tingkat</dt><dd>${esc(tingkat)}</dd></div>` : ""}`}</dl>
        ${!api ? rekomendasiResmi(t.rekomendasi) : c ? `<div class="in-cara"><div>${pil("Perkiraan, belum divalidasi lapangan", "emas")}</div><p><span class="k">Cara padam utama</span><b>${esc(c.utama)}</b></p>${c.lengkap.length ? `<p><span class="k">Pelengkap</span>${esc(c.lengkap.join(", "))}</p>` : ""}</div>` : ""}</div>
      ${buka ? formLapor(t) : `<p class="in-kosong">Tugas ini sudah ditutup (${t.status === "padam" ? km.tutup : km.st.bukan_api.toLowerCase()}).</p>`}
      ${api && window.Tugaskan ? window.Tugaskan.padamBlok(t) : ""}${api && t.padam?.boleh_cek_ulang ? formCekUlang(t) : ""}
      <div id="kartuApi"></div>
      ${window.AksesKartu ? window.AksesKartu.html(t.akses) : ""}
      <div id="tgWadah"></div>
      ${kebutuhanKartu(t, !!c)}
      <details class="in-rinci in-kartu in-detail" id="detailTugas"><summary>Riwayat isian dan galeri</summary><div class="in-riwayat" id="riwayat"></div></details>`;
    pulihDraf(t.id); alatInvMuat(t.id); gudangMuat(t.id); kartuMuat(t);
    if (window.Tugaskan && $("tgWadah")) window.Tugaskan.pasang(t, $("tgWadah"));   // penugasan dan pelacak posisi (instansi_tugaskan.js)
  }
  /* ---- media terpilih: satu objectURL per berkas (Map), figure ditambah atau dihapus satu per satu, URL dilepas saat dihapus ---- */
  const urlBerkas = new Map();
  let kameraLangsung = false;   // berkas dari tombol Ambil foto (capture) = diambil langsung lewat kamera; dari galeri tidak
  function tambahBerkas(files) {
    for (const f of files) { if (kameraLangsung) f._kamera = true; if (berkas.length >= 10) { pesan("Maksimal 10 berkas per isian.", "galat"); break; } if (/^(image|video)\//.test(f.type)) berkas.push(f); else pesan(`${f.name}: bukan foto atau video.`, "galat"); }
    pratinjau(); simpanDrafPanel(true);
  }
  function pratinjau() {
    const ada = new Set(berkas);
    for (const [f, u] of urlBerkas) if (!ada.has(f)) { URL.revokeObjectURL(u); urlBerkas.delete(f); }
    const w = $("mPrev"); if (!w) return;
    for (const fig of [...w.children]) if (!ada.has(fig._f)) fig.remove();
    const sudah = new Set([...w.children].map(x => x._f));
    for (const f of berkas) {
      if (sudah.has(f)) continue;
      if (/^image\//.test(f.type) && !urlBerkas.has(f)) urlBerkas.set(f, URL.createObjectURL(f));
      const fig = document.createElement("figure"); fig.className = "in-pv"; fig._f = f;
      fig.innerHTML = `${/^image\//.test(f.type) ? `<img alt="Pratinjau ${esc(f.name.slice(0, 20))}" decoding="async" src="${urlBerkas.get(f)}">` : `<div class="in-vid">Video</div>`}<figcaption>${esc(f.name.slice(0, 18))}<br>${ukuranTeks(f.size)}</figcaption><button type="button" data-hapus="1" aria-label="Hapus ${esc(f.name.slice(0, 20))}">Hapus</button>`;
      w.append(fig);
    }
  }
  /* ---- peta desktop: SATU instans, dibuat sekali; penanda diperbarui lewat diff (tambah, ubah kelas, hapus) ---- */
  const CDN = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.";
  const SRI_JS = "sha512-dXgoFR02YHJ9Fa29P3D/1umNaZ0EXS2N0w29Lm3b/1BK8UDLMdLWDFwuujIyJJdU27/PLuk3dmS1V9NO8ABX1A==", SRI_CSS = "sha512-qN/uDg9bS3IAldWq4lswyC+9ZSoShtfyNDp+FaJhdtXJqdgubHA+s4nB8BajW0m90Y0+RBGbqu2anzbxiQYdHA==";
  const sisip = (tag, atribut) => new Promise((ok, no) => { const e = document.createElement(tag); Object.assign(e, atribut); e.onload = () => ok(); e.onerror = () => no(new Error(atribut.src || atribut.href)); document.head.append(e); });
  /* pemuat MapLibre dipakai bersama modul penugasan dan pop-up (instansi_tugaskan.js): sekali muat, janji dipakai ulang */
  let janjiPeta = null;
  window.InstansiPeta = {muat() {
    if (window.maplibregl) return Promise.resolve();
    return janjiPeta ||= (async () => { sisip("link", {rel: "stylesheet", href: CDN + "css", integrity: SRI_CSS, crossOrigin: "anonymous"}).catch(() => {}); await sisip("script", {src: CDN + "js", integrity: SRI_JS, crossOrigin: "anonymous"}); })().catch(e => { janjiPeta = null; throw e; });
  }};
  async function bukaPeta() {
    const w = $("petaWadah"); if (!w || !desktop() || !tugas.length || petaGagal || petaMemuat) { if (peta) perbaruiPenanda(); return; }
    if (peta) return perbaruiPenanda();
    petaMemuat = true; w.hidden = false; const app = w.parentElement; app.classList.remove("tanpa-peta");
    try {
      await window.InstansiPeta.muat();
      peta = new maplibregl.Map({container: w, style: "https://tiles.openfreemap.org/styles/positron", center: [tugas[0].lon, tugas[0].lat], zoom: 8, minZoom: 3, maxZoom: 18, dragRotate: false, attributionControl: {compact: true}});
      peta.addControl(new maplibregl.NavigationControl({showCompass: false}));
      perbaruiPenanda(true);
    } catch (e) { petaGagal = true; w.hidden = true; app.classList.add("tanpa-peta"); }   // peta opsional: tanpa jaringan CDN, daftar dan formulir tetap jalan
    petaMemuat = false;
  }
  function perbaruiPenanda(cocokkan) {
    if (!peta) return;
    const d = new Map(tampilan().map(t => [t.id, t]));
    for (const [id, p] of penanda) if (!d.has(id)) { p.m.remove(); penanda.delete(id); }
    for (const [id, t] of d) {
      let p = penanda.get(id);
      if (!p) { const el = document.createElement("button"); el.type = "button"; el.setAttribute("aria-label", `Tugas ${t.kab}`); el.addEventListener("click", () => pilihTugas(id)); p = {el, m: new maplibregl.Marker({element: el}).setLngLat([t.lon, t.lat]).addTo(peta)}; penanda.set(id, p); }
      p.el.className = `in-pin ${t.terlambat ? "telat" : t.status === "buka" ? "aktif" : "selesai"} ${id === terpilih ? "pilih" : ""}`;
    }
    if (cocokkan && d.size) { const b = new maplibregl.LngLatBounds(); for (const t of d.values()) b.extend([t.lon, t.lat]); peta.fitBounds(b, {padding: 50, maxZoom: 10, duration: 0}); }
  }
  function soroti() {
    for (const [id, p] of penanda) p.el.classList.toggle("pilih", id === terpilih);
    const t = tugas.find(x => x.id === terpilih); if (t && peta) peta.easeTo({center: [t.lon, t.lat], zoom: Math.max(peta.getZoom(), 10)});
  }

  /* ---- klik dan perubahan di daftar dan panel (satu penangan; kerja berat sesudah cat) ---- */
  $("isi").addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.hapus != null) { const fig = t.closest(".in-pv"); berkas.splice(berkas.indexOf(fig._f), 1); pratinjau(); return simpanDrafPanel(true); }
    if (t.classList.contains("in-chip")) {
      filter.bencana = t.dataset.bc; for (const c of t.parentNode.children) c.setAttribute("aria-pressed", String(c === t));   // chip urgent
      $("daftar").setAttribute("aria-busy", "true"); return sesudahCat(segarkanDaftar);   // daftar menyusul sesudah cat
    }
    const baris = t.closest(".in-baris[data-id]"); if (baris) return pilihTugas(baris.dataset.id);
    const a = t.dataset.aksi;
    if (a === "kembali") return pilihTugas(null);
    if (a === "muat") { muatStatus = "memuat"; $("daftar").innerHTML = skeleton(5); return gantiTab("tugas"); }
    if (a === "semua") { filter = {kab: "", status: "", bencana: ""}; return gantiTab("tugas"); }
    if (a === "jarak") { if (!navigator.geolocation) return pesan("Peramban ini tidak bisa membaca lokasi.", "galat"); pesan("Membaca lokasi…"); return ambilPosisi(); }
  });
  $("isi").addEventListener("change", e => {
    if (e.target.id === "fKab") { filter.kab = e.target.value; $("daftar").setAttribute("aria-busy", "true"); sesudahCat(segarkanDaftar); }
    else if (e.target.id === "fStatus") { filter.status = e.target.value; $("daftar").setAttribute("aria-busy", "true"); sesudahCat(segarkanDaftar); }
    else if (e.target.id === "mAmbil" || e.target.id === "mGaleri") { kameraLangsung = e.target.id === "mAmbil"; tambahBerkas([...e.target.files]); kameraLangsung = false; e.target.value = ""; }
  });
  let tmDraf = null;
  $("isi").addEventListener("input", e => { if (e.target.closest("#fLapor")) { clearTimeout(tmDraf); tmDraf = setTimeout(simpanDrafPanel, 400); } });
  $("isi").addEventListener("change", e => { if (e.target.closest("#fLapor")) { if (e.target.name === "sapi") tampilAlasanBA(); simpanDrafPanel(); } });
  $("isi").addEventListener("dragover", e => { if (e.target.closest("#mDrop")) { e.preventDefault(); $("mDrop").classList.add("aktif"); } });
  $("isi").addEventListener("dragleave", e => { if (e.target.closest("#mDrop")) $("mDrop").classList.remove("aktif"); });
  $("isi").addEventListener("drop", e => { if (!e.target.closest("#mDrop")) return; e.preventDefault(); $("mDrop").classList.remove("aktif"); tambahBerkas([...e.dataTransfer.files]); });
  /* bagian yang berat dimuat saat dibuka: riwayat dan galeri, konsesi */
  $("isi").addEventListener("toggle", e => {
    if (!e.target.open) return;
    if (e.target.id === "detailTugas") riwayat(terpilih, $("riwayat"));
    if (e.target.id === "rinci" && $("ptWadah")) ptMuat();
  }, true);
  $("isi").addEventListener("submit", e => { if (e.target.id === "fLapor") kirimLapor(e); else if (e.target.id === "fKontak") kirimKontak(e); });

  const SUMBER = {exif: "waktu EXIF foto", gps: "waktu GPS perangkat", unggah: "waktu unggah"};
  function galeri(media) {
    if (!media.length) return "";
    return `<div class="in-galeri">${media.map(m => `<figure class="in-media"><a href="/api/instansi/media/${esc(m.id)}" target="_blank" rel="noopener"><img src="/api/instansi/thumb/${esc(m.id)}" alt="${m.jenis === "video" ? "Video" : "Foto"} lapangan" loading="lazy"></a>
      <figcaption>${m.jenis === "video" ? `Video ${angka(m.durasi, 0)} detik<br>` : ""}${esc(jamWIB(m.waktu_ambil))}, ${esc(SUMBER[m.sumber_waktu])}<br>${m.orang_terdeteksi != null ? `minimal ${angka(m.orang_terdeteksi, 0)} orang terlihat (mesin${m.orang_sumber === "bingkai_klien" ? ", dari bingkai video kiriman peramban yang tak bisa diperiksa server" : ", dari thumbnail tersimpan"})` : "orang tidak dihitung"}${window.Tugaskan ? `<br>${window.Tugaskan.exifInfo(m)}` : ""}${m.gps_curiga ? `<br>${pil("GPS curiga", "merah")}` : ""}${m.jauh ? `<br>${pil("Jauh dari cluster", "merah")}` : ""}</figcaption></figure>`).join("")}</div>`;
  }
  async function riwayat(id, wadah) {
    if (!wadah || wadah.dataset.muat === id) return;
    wadah.textContent = "Memuat…";
    const r = await ambilRincian(id);
    if (!r.ok) { wadah.textContent = manusiawi(r); return; }
    wadah.dataset.muat = id;
    wadah.innerHTML = (r.j.isian.length ? r.j.isian.map(i => `<p class="in-meta"><b>${i.langkah === "konfirmasi" ? "Konfirmasi" : "Kabar"}</b>, ${esc(jamWIB(i.dibuat))},
      ${esc(i.oleh.wilayah)}${olehPetugas(i)}. ${i.langkah === "konfirmasi" ? `${esc(HASIL[i.hasil])}${i.alasan_bukan_api ? ` (${esc(ALASAN_BA[i.alasan_bukan_api] || i.alasan_bukan_api)})` : ""}${i.petugas ? "" : `, PIC ${esc(i.pic_nama)} (${esc(i.pic_jabatan)})`}${i.jauh ? ", lokasi isian jauh dari pusat cluster" : ""}`
      : `${i.tindakan ? esc(i.tindakan) + (/[.!?]$/.test(i.tindakan) ? " " : ". ") : ""}Status ${esc(STATUS_API[i.status_api])}${i.personel_efektif != null ? `, ${angka(i.personel_efektif, 0)} personel${i.personel != null && i.personel_terlihat != null ? ` (isian manual, mesin melihat minimal ${angka(i.personel_terlihat, 0)})` : ""}` : ""}.`}</p>`).join("") : `<p class="in-meta">Belum ada isian.</p>`) + galeri(r.j.media);
  }

  /* ---- GPS dan media (satu isian boleh 1-10 foto atau video; aturan per berkas sama dengan foto lapangan warga) ---- */
  const posisiGPS = (umur, tunggu) => new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, {enableHighAccuracy: true, timeout: tunggu, maximumAge: umur}));
  /* titik segar dulu; bila GPS tidak memberi titik baru (ponsel diam: Safari iOS bisa tidak memperbarui sama sekali), pakai titik terakhir <= 60 dtk.
     Bacaan yang sama persis ditandai curiga di server (src/gps.js), tidak ditolak. */
  const bacaGPS = tunggu => posisiGPS(0, tunggu).catch(e => e.code === 3 ? posisiGPS(60000, 5000) : Promise.reject(e)).catch(e => {
    throw new Error(e.code === 1 ? "Izin lokasi ditolak. Izinkan akses lokasi di pengaturan peramban, lalu coba lagi." : "Lokasi belum terbaca. Coba di tempat terbuka.");
  });
  async function ambilGPS() {
    if (!navigator.geolocation) throw new Error("Peramban ini tidak bisa membaca lokasi");
    const s = [];
    for (let i = 0; i < 3; i++) { if (i) await new Promise(r => setTimeout(r, 1000)); const p = await bacaGPS(i ? 3000 : 15000); s.push([p.coords.latitude, p.coords.longitude, p.coords.accuracy, Date.now()]); }
    const [lat, lon, akurasi, waktu] = s[2];
    if (akurasi > 1000) throw new Error("Sinyal GPS terlalu lemah (lebih dari 1 km). Coba di tempat terbuka.");
    return {lat, lon, akurasi, waktu_gps: waktu, sampel: s, zona: Intl.DateTimeFormat().resolvedOptions().timeZone};
  }
  const nilai = id => ($(id)?.value || "").trim();
  const angkaIsian = (id, bulat) => { const v = nilai(id).replace(",", "."); if (!v) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0 || (bulat && !Number.isInteger(n))) throw new Error(`Isian harus angka 0 atau lebih${bulat ? " (bulat)" : ""}.`); return n; };
  /* EXIF JPEG: DateTimeOriginal dan GPS (sama dengan public/foto.js). null bila tidak ada. */
  function bacaExif(buf) {
    try {
      const v = new DataView(buf); if (v.getUint16(0) !== 0xffd8) return null;
      let o = 2;
      while (o < v.byteLength - 4) { const m = v.getUint16(o), n = v.getUint16(o + 2);
        if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) { const t = o + 10, le = v.getUint16(t) === 0x4949;
          const u16 = p => v.getUint16(t + p, le), u32 = p => v.getUint32(t + p, le), ifd = p => { const out = {}, k = u16(p); for (let i = 0; i < k; i++) { const e = p + 2 + i * 12; out[u16(e)] = {n: u32(e + 4), nilai: e + 8}; } return out; };
          const str = e => { const p = e.n > 4 ? u32(e.nilai) : e.nilai; let s = ""; for (let i = 0; i < e.n - 1; i++) s += String.fromCharCode(v.getUint8(t + p + i)); return s; };
          const rat = e => { const p = u32(e.nilai); return [0, 1, 2].map(i => u32(p + i * 8) / (u32(p + i * 8 + 4) || 1)); };
          const ifd0 = ifd(u32(4)), hasil = {};
          if (ifd0[0x8769]) { const ex = ifd(u32(ifd0[0x8769].nilai)), dt = ex[0x9003] && str(ex[0x9003]), off = ex[0x9011] && str(ex[0x9011]), m2 = dt && dt.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
            if (m2) { const w = Date.parse(`${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}` + (off && /^[+-]\d\d:\d\d$/.test(off) ? off : "")); if (Number.isFinite(w)) hasil.waktu = w; } }
          if (ifd0[0x8825]) { const g = ifd(u32(ifd0[0x8825].nilai));
            if (g[2] && g[4]) { const dms = a => a[0] + a[1] / 60 + a[2] / 3600, la = dms(rat(g[2])), lo = dms(rat(g[4]));
              const sLa = g[1] ? String.fromCharCode(v.getUint8(g[1].nilai + t)) : "N", sLo = g[3] ? String.fromCharCode(v.getUint8(g[3].nilai + t)) : "E";
              if (la || lo) { hasil.lat = sLa === "S" ? -la : la; hasil.lon = sLo === "W" ? -lo : lo; } } }
          return hasil; }
        if (m === 0xffda) break; o += 2 + n; }
    } catch (e) {}
    return null;
  }
  const keBlob = (c, tipe, q) => new Promise(r => c.toBlob(r, tipe, q));
  function gambar(src, sisi) { const s = Math.min(1, sisi / Math.max(src.width || src.videoWidth, src.height || src.videoHeight)), c = document.createElement("canvas"), w = src.width || src.videoWidth, h = src.height || src.videoHeight;
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s)); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c; }
  async function kompres(src, sisi, q) { const c = gambar(src, sisi), w = await keBlob(c, "image/webp", q); return w?.type === "image/webp" ? w : keBlob(c, "image/jpeg", q); }   // WebP bila bisa, selain itu JPEG
  const jpegKecil = (src, sisi = 800) => keBlob(gambar(src, sisi), "image/jpeg", 0.7);   // bingkai untuk hitungan mesin
  /* video: durasi, thumbnail, dan TIGA bingkai (awal, tengah, akhir) untuk hitungan orang */
  function bacaVideo(file) {
    return new Promise((ok, no) => {
      const v = document.createElement("video"), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
      const cari = t => new Promise(r => { v.onseeked = () => r(); v.currentTime = t; });
      v.onloadedmetadata = async () => {
        try { const d = v.duration, bingkai = [];
          for (const t of [Math.min(0.5, d / 2), d / 2, Math.max(d - 0.5, d / 2)]) { await cari(t); bingkai.push(await jpegKecil(v)); }
          await cari(Math.min(0.5, d / 2)); const thumb = await kompres(v, 480, 0.72); URL.revokeObjectURL(u); ok({durasi: d, bingkai, thumb});
        } catch (e) { URL.revokeObjectURL(u); no(new Error("Video tidak bisa dibaca peramban ini")); } };
      v.onerror = () => { URL.revokeObjectURL(u); no(new Error("Video tidak bisa dibaca peramban ini")); };
    });
  }
  /* satu berkas -> bagian-bagian unggahan; menolak lebih awal yang pasti ditolak server (video > 60 detik, foto lama, ukuran) */
  async function siapkanBerkas(f) {
    if (/^video\//.test(f.type)) {
      if (f.size > 30 * 1048576) throw new Error(`${f.name}: video lebih dari 30 MB.`);
      const v = await bacaVideo(f);
      if (v.durasi > 60.5) throw new Error(`${f.name}: video ${Math.round(v.durasi)} detik, maksimal 60 detik. Potong dulu.`);
      return {media: f, thumb: v.thumb, bingkai: v.bingkai, durasi: v.durasi, kamera: !!f._kamera};
    }
    const exif = /jpe?g$/i.test(f.type) ? bacaExif(await f.slice(0, 256 * 1024).arrayBuffer()) : null;
    if (exif?.waktu && Date.now() - exif.waktu > 48 * 3600e3) throw new Error(`${f.name}: diambil ${Math.round((Date.now() - exif.waktu) / 864e5)} hari lalu, hanya 48 jam terakhir.`);
    let bmp; try { bmp = await createImageBitmap(f); } catch (e) { throw new Error(`${f.name}: bukan foto atau video yang bisa dibaca.`); }
    const o = {media: await kompres(bmp, 1600, 0.8), thumb: await keBlob(gambar(bmp, 640), "image/jpeg", 0.7), exif, kamera: !!f._kamera}; bmp.close?.();   // thumbnail JPEG: server menghitung orang dari thumbnail yang DISIMPAN, bukan dari kiriman klien   // canvas membuang EXIF dari berkas yang diunggah
    return o;
  }
  /* ---- unggahan: media diproses di peramban lalu disimpan di IndexedDB (antrean luring), dikirim bila ada sinyal ---- */
  const bidangMedia = () => "";
  /* antrean di pb_instansi (versi tidak dinaikkan: tab lama yang masih terbuka saat rilis tetap bisa membukanya), draf di pb_instansi_draf. open tanpa versi = versi yang ada */
  const DB_NAMA = "pb_instansi", ST = "antrean", SD = "draf", DB_DRAF = "pb_instansi_draf";
  const idb = st => new Promise((ok, no) => { if (!window.indexedDB) return no(new Error("tanpa IndexedDB")); const r = indexedDB.open(st === SD ? DB_DRAF : DB_NAMA);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(st)) d.createObjectStore(st, {keyPath: st === SD ? "k" : "id"}); };
    r.onsuccess = () => { const d = r.result; if (d.objectStoreNames.contains(st)) return ok(d); d.close(); no(new Error("penyimpanan ponsel belum siap")); }; r.onerror = () => no(r.error); });
  async function transaksi(mode, fn, st = ST) { const d = await idb(st); return new Promise((ok, no) => { const t = d.transaction(st, mode), r = fn(t.objectStore(st)); t.oncomplete = () => { d.close(); ok(r?.result); }; t.onerror = t.onabort = ev => { d.close(); no(ev?.target?.error || t.error); }; }); }
  const akunKu = () => saya?.akun?.id || "";
  /* antrean lama tanpa id akun: diambil hanya oleh akun yang memegang tugasnya; tanpa akun yang masuk tidak ada pemilik */
  const milikKu = it => !!akunKu() && (it.akun ? it.akun === akunKu() : tugas.some(t => t.id === it.tugasId));
  const UMUR_DRAF = 3 * 864e5, UMUR_ANTRE = 7 * 864e5;
  let generasi = 0;
  const semuaAntrean = () => transaksi("readonly", s => s.getAll()).catch(() => []);
  /* draf di IndexedDB: dua baris per (akun, tugas). Isian ditulis tiap perubahan; berkas (bisa video besar) hanya saat ditambah atau dihapus. Draf > 7 hari dibuang. */
  const kunciDraf = (tid, akun = akunKu()) => `${akun}|${tid}`;
  function simpanDrafIdb(tid, d, berkasBerubah) {
    if (!akunKu()) return;
    const {berkas: b, ...isi} = d, k = kunciDraf(tid);
    transaksi("readwrite", s => { s.put({k, akun: akunKu(), tid, ...isi, diubah: Date.now()}); if (berkasBerubah) return s.put({k: k + "#berkas", akun: akunKu(), tid, diubah: Date.now(), berkas: b.map(f => ({f, kamera: !!f._kamera}))}); }, SD)
      .catch(e => { if (e?.name === "QuotaExceededError") pesan("Penyimpanan ponsel penuh: draf belum tersimpan. Kirim isian ini atau hapus berkas lain di ponsel.", "galat"); });
  }
  function buangDraf(tid, akun = akunKu()) { if (akun === akunKu()) draf.delete(tid); const k = kunciDraf(tid, akun); transaksi("readwrite", s => { s.delete(k); return s.delete(k + "#berkas"); }, SD).catch(() => {}); }
  /* dijalankan saat halaman dimuat, tanpa menunggu masuk: draf (isian + berkas, dibuang berpasangan) > 3 hari dan antrean > 7 hari dihapus dari ponsel */
  async function bersihkanSimpanan() {
    const kini = Date.now(), d = await transaksi("readonly", s => s.getAll(), SD).catch(() => []), segar = new Map();
    for (const x of d) { const k = x.k.replace(/#berkas$/, ""); segar.set(k, Math.max(segar.get(k) ?? 0, x.diubah ?? 0)); }
    const buang = d.filter(x => (segar.get(x.k.replace(/#berkas$/, "")) ?? 0) < kini - UMUR_DRAF).map(x => x.k);
    if (buang.length) await transaksi("readwrite", s => { for (const k of buang) s.delete(k); }, SD).catch(() => {});
    const tua = (await semuaAntrean()).filter(x => !(x.dibuat > kini - UMUR_ANTRE)).map(x => x.id);
    if (tua.length) await transaksi("readwrite", s => { for (const id of tua) s.delete(id); }).catch(() => {});
  }
  async function muatDraf() {
    const ak = akunKu(); if (!ak) return;
    const semua = await transaksi("readonly", s => s.getAll(), SD).catch(() => []), lama = Date.now() - UMUR_DRAF;
    if (akunKu() !== ak) return;   // akun berganti selama IndexedDB dibaca
    const berkasPer = new Map(semua.filter(x => x.akun === ak && x.k.endsWith("#berkas")).map(x => [x.tid, x.berkas || []]));
    for (const x of semua) if (x.akun === ak && x.diubah >= lama && !x.k.endsWith("#berkas") && !draf.has(x.tid))
      draf.set(x.tid, {diubah: x.diubah, sapi: x.sapi ?? null, nilai: x.nilai || {}, cek: x.cek || {}, rinci: !!x.rinci, berkas: (berkasPer.get(x.tid) || []).filter(b => b?.f).map(b => { if (b.kamera) b.f._kamera = true; return b.f; })});
    if (terpilih && draf.has(terpilih) && $("fLapor")?.dataset.tugas === terpilih && !berkas.length) pulihDraf(terpilih);
  }
  const simpanAntrean = it => transaksi("readwrite", s => s.put(it));
  const hapusAntrean = id => transaksi("readwrite", s => s.delete(id));
  function unggahXHR(fd, onP, akun) {
    return new Promise(ok => { const x = new XMLHttpRequest(); x.open("POST", "/api/instansi/media"); x.setRequestHeader("x-pb", "1"); if (akun) x.setRequestHeader("x-akun", akun); x.timeout = 300000;
      x.upload.onprogress = e => { if (e.lengthComputable) onP(e.loaded / e.total); };
      x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch (e) {} ok({ok: x.status >= 200 && x.status < 300, status: x.status, j}); };
      x.onerror = x.ontimeout = () => ok({ok: false, status: 0, j: {}}); x.send(fd); });
  }
  const bisaUlang = s => s === 0 || s === 401 || s === 429 || s >= 500;   // sinyal hilang, sesi habis, terlalu cepat, atau server sibuk: simpan dan coba lagi
  const infoAntre = (it, t) => { it.info = t; const p = $("progres"); if (p && p.dataset.id === it.id) p.textContent = t; tampilBanner(); };
  /* satu isian: unggah tiap berkas (id media diingat), lalu kirim isian dengan klien_id tetap (idempoten) */
  const namaBerkas = (b, i) => `${b.durasi ? "Video" : "Foto"} ${i + 1}`;
  /* daftar progres per berkas di bilah bawah form (hanya bila form tugas ini masih terbuka) */
  function daftarProgres(it) {
    const u = $("progBerkas"), p = $("progres"); if (!u || !p || p.dataset.id !== it.id) return;
    u.innerHTML = it.berkas.map((b, i) => `<li data-i="${i}" class="${b.mediaId ? "ok" : ""}"><span>${esc(namaBerkas(b, i))}</span><em>${b.mediaId ? "terunggah" : "menunggu"}</em><progress max="1" value="${b.mediaId ? 1 : 0}"></progress></li>`).join("");
  }
  function progresBerkas(it, i, f, teks) {
    const li = $("progBerkas")?.querySelector(`li[data-i="${i}"]`); if (!li || $("progres")?.dataset.id !== it.id) return;
    li.querySelector("progress").value = f; li.querySelector("em").textContent = teks; li.classList.toggle("ok", f >= 1);
  }
  async function kirimItem(it) {
    daftarProgres(it);
    for (const [i, b] of it.berkas.entries()) {
      if (b.mediaId) continue;
      const fd = new FormData(); fd.append("tugas_id", it.tugasId); fd.append("media", b.media, b.durasi ? "video" : "foto"); fd.append("thumb", b.thumb, "thumb");
      (b.bingkai || []).forEach((x, k) => fd.append("bingkai" + k, x, "bingkai"));
      for (const k of ["lat", "lon", "akurasi", "waktu_gps", "zona"]) fd.append(k, it.gps[k]); fd.append("sampel", JSON.stringify(it.gps.sampel));
      if (b.durasi) fd.append("durasi", b.durasi); if (b.exif?.waktu) fd.append("exif_waktu", b.exif.waktu); if (b.exif?.lat != null) { fd.append("exif_lat", b.exif.lat); fd.append("exif_lon", b.exif.lon); }
      if (b.kamera) fd.append("kamera", "1");
      if (!milikKu(it)) return {tunda: "akun berganti"};   // pagar: tiap kiriman memakai sesi pemilik isian
      const r = await unggahXHR(fd, f => { infoAntre(it, `Mengunggah berkas ${i + 1} dari ${it.berkas.length}: ${Math.round(f * 100)}%`); progresBerkas(it, i, f, `${Math.round(f * 100)}%`); }, it.akun || akunKu());
      if (r.status === 401 && saya) { saya = null; bersihkanAkun(); tampil(); pesan(GALAT[401], "galat"); }
      if (!r.ok) { progresBerkas(it, i, 0, r.status === 0 ? "menunggu sinyal" : "gagal"); } if (!r.ok) return bisaUlang(r.status) ? {tunda: manusiawi(r)} : {tolak: manusiawi(r, "Berkas ditolak.")};
      b.mediaId = r.j.id; progresBerkas(it, i, 1, "terunggah"); await simpanAntrean(it).catch(() => {});
    }
    infoAntre(it, "Mengirim isian…");
    if (!milikKu(it)) return {tunda: "akun berganti"};
    const r = await api("POST", `/api/instansi/${it.langkah}/${it.tugasId}`, {...it.body, media: it.berkas.map(b => b.mediaId)}, {"x-akun": it.akun || akunKu()});   // server menolak bila sesi bukan pemilik isian (tab lain, ganti akun)
    if (r.ok) return {ok: r.j};
    return bisaUlang(r.status) ? {tunda: manusiawi(r)} : {tolak: manusiawi(r, "Isian ditolak.")};
  }
  let memproses = false;
  async function prosesAntrean() {
    if (memproses || !saya || saya.akun.status !== "aktif") return; memproses = true;
    try {
      const gen = generasi;
      for (const it of (await semuaAntrean()).filter(milikKu).sort((a, b) => a.dibuat - b.dibuat)) {
        if (gen !== generasi) break;   // keluar atau ganti akun di tengah antrean
        if (!it.akun) { it.akun = akunKu(); await simpanAntrean(it).catch(() => {}); }
        if (it.galat) continue;
        const h = await kirimItem(it);
        if (h.ok) {
          await hapusAntrean(it.id).catch(() => {});
          if (it.pic) { try { localStorage.setItem(it.pic.kunci, JSON.stringify(it.pic.nilai)); } catch (e) {} }
          pesan(`Terkirim.${h.ok.personel_terlihat != null ? ` Minimal ${angka(h.ok.personel_terlihat, 0)} orang terlihat di foto (hitungan mesin).` : ""}${h.ok.jauh ? " Lokasimu lebih dari 5 km dari pusat cluster, admin akan melihat tanda ini." : ""}`, "ok");
          const dr = draf.get(it.tugasId); if (!dr || (dr.diubah ?? 0) <= it.dibuat) buangDraf(it.tugasId, it.akun);   // draf yang dimulai sesudah isian ini (mis. kabar sesudah konfirmasi) tetap ada
          await muatTugas(); if ($("daftar")) { segarkanDaftar(); isiPanel(); }
        } else if (h.tolak) { it.galat = h.tolak; await simpanAntrean(it).catch(() => {}); }
        else { it.info = h.tunda; await simpanAntrean(it).catch(() => {}); break; }   // masih tertunda: berhenti, coba lagi nanti
      }
    } finally { memproses = false; tampilBanner(); }
  }
  async function tampilBanner() {
    const b = $("banner"); if (!b) return;
    const semua = await semuaAntrean(), q = semua.filter(milikKu), lain = semua.filter(x => !milikKu(x) && !x.galat).length, luring = navigator.onLine === false;
    const baris = [luring ? "Kamu sedang luring. Isian disimpan di ponsel dan terkirim otomatis saat sinyal kembali." : "",
      lain ? `${angka(lain, 0)} isian akun lain tersimpan di ponsel ini dan terkirim saat akun itu masuk lagi.` : ""];
    const tunggu = q.filter(x => !x.galat);
    if (tunggu.length) baris.push(`${angka(tunggu.length, 0)} isian menunggu sinyal, terkirim otomatis.${tunggu[0].info ? " " + esc(tunggu[0].info) : ""}`);
    b.hidden = !baris.some(Boolean) && !q.some(x => x.galat); b.classList.toggle("luring", luring);
    b.innerHTML = baris.filter(Boolean).map(x => `<p>${x}</p>`).join("") + q.filter(x => x.galat).map(x => `<p class="galat">Isian untuk ${esc(x.nama)} ditolak: ${esc(x.galat)} <button type="button" data-buang="${esc(x.id)}">Buang</button></p>`).join("");
  }
  $("banner").addEventListener("click", async e => { const b = e.target.closest("[data-buang]"); if (b) { await hapusAntrean(b.dataset.buang).catch(() => {}); tampilBanner(); } });
  window.addEventListener("online", () => { tampilBanner(); prosesAntrean(); });
  window.addEventListener("offline", tampilBanner);
  setInterval(() => { if (navigator.onLine !== false) prosesAntrean(); }, 60000);
  tampilBanner();

  async function kirimLapor(e) {
    e.preventDefault(); if (sibuk) return;
    const f = e.target, t = $("kirim"), tid = f.dataset.tugas, langkah = f.dataset.langkah, tg = tugas.find(x => x.id === tid), konf = langkah === "konfirmasi", cek = langkah === "cekulang";
    let body, tersimpan = false;
    try {
      const sapi = (document.querySelector('input[name="sapi"]:checked') || {}).value;
      if ((konf || cek) && !berkas.length) throw new Error("Ambil minimal satu foto atau video di lokasi.");
      if (!konf && !cek && sapi === "padam" && !berkas.length) throw new Error(`Melaporkan ${tg ? kam(tg).selesai : "padam"} wajib berfoto: ambil foto lokasi.`);
      if (!sapi && !cek) throw new Error(`Pilih ${(tg ? kam(tg).kondisi : "Kondisi api").toLowerCase()}: ketuk salah satu tombol besar.`);
      if (cek) { body = {klien_id: f.dataset.klien ||= idAcak()}; if (tg && apiTugas(tg) && window.UjiLapangan) window.UjiLapangan.bacaCek(body); }
      else {
      if (konf && (!nilai("picNama") || !nilai("picJabatan") || !nilai("picWa"))) { $("picNama")?.closest("details")?.setAttribute("open", ""); throw new Error("PIC lapangan wajib: nama, jabatan, dan nomor WhatsApp."); }
      body = {klien_id: f.dataset.klien ||= idAcak()};
      if (konf && sapi === "bukan_api" && $("alasanBA")) { if (!nilai("alasanBA")) { $("alasanBA").focus(); throw new Error("Pilih alasan kenapa bukan api."); } body.alasan_bukan_api = nilai("alasanBA"); }
      if (konf) { body.hasil = sapi === "bukan_api" ? "bukan_api" : sapi === "padam" ? "sudah_padam" : "api_ada"; if (body.hasil === "api_ada") body.status_api = sapi; Object.assign(body, {pic_nama: nilai("picNama"), pic_jabatan: nilai("picJabatan"), pic_wa: nilai("picWa")}); }
      else {
        Object.assign(body, {status_api: sapi, kendala: [...document.querySelectorAll('input[name="kendala"]:checked')].map(i => i.value), bantuan: [...document.querySelectorAll('input[name="bantuan"]:checked')].map(i => i.value)});
        if (nilai("tindakan")) body.tindakan = nilai("tindakan"); if (nilai("kendalaLain")) body.kendala_lain = nilai("kendalaLain"); if (nilai("bantuanLain")) body.bantuan_lain = nilai("bantuanLain");
      }
      const lk = angkaIsian("luas"), pk = angkaIsian("padam"); if (lk != null) body.luas_ha = lk; if (pk != null) body.padam_ha = pk;
      if (pk != null && lk != null && pk > lk) throw new Error("Luas padam tidak boleh melebihi luas terbakar.");
      if (!konf) { const ai = [...document.querySelectorAll('input[name="alatInv"]:checked')].map(i => i.value); if (ai.length) body.alat_inventaris = ai; }
      bacaGambut(body); bacaPemadaman(body); if (konf && $("ptWadah")) { const pt = bacaPT("pt", false); if (pt) body.pt = pt; }
      if (tg && apiTugas(tg) && window.UjiLapangan) window.UjiLapangan.baca(body, body.luas_ha != null);   // uji lapangan: tutupan + metode luas wajib bila luas diisi
      }
    } catch (x) { const g = $("progres"); if (g) { g.className = "in-progres galat"; g.textContent = x.message; g.scrollIntoView({block: "nearest"}); } return; }
    sibuk = true; t.disabled = true; pesan(""); const prog = $("progres"), it = {id: idAcak(), akun: akunKu(), tugasId: tid, langkah, body, dibuat: Date.now(), nama: tg ? tg.kab : "tugas", berkas: []}; prog.className = "in-progres";
    prog.dataset.id = it.id;
    try {
      prog.textContent = "Membaca lokasi, tahan ponsel diam sebentar…"; await new Promise(r => sesudahCat(r));
      if (berkas.length) it.gps = await ambilGPS();
      for (const [i, file] of berkas.entries()) { prog.textContent = `Menyiapkan berkas ${i + 1} dari ${berkas.length}…`; await new Promise(r => sesudahCat(r)); it.berkas.push(await siapkanBerkas(file)); }
      if (konf && tg) it.pic = {kunci: ingatKunci(tg), nilai: {nama: body.pic_nama, jabatan: body.pic_jabatan, wa: body.pic_wa}};
      try { await simpanAntrean(it); tersimpan = true; } catch (x) {}
    } catch (x) { sibuk = false; t.disabled = false; prog.textContent = ""; return pesan(x.message, "galat"); }
    sibuk = false; t.disabled = false;
    const selesaiForm = () => { clearTimeout(tmDraf); f.dataset.terkirim = "1"; buangDraf(tid); berkas = []; pratinjau(); window.UjiLapangan?.lepas(); };
    if (!tersimpan) {   // tanpa IndexedDB atau penyimpanan ponsel penuh: kirim langsung; bila gagal, form dan berkasnya tetap supaya bisa dikirim lagi
      prog.textContent = "Penyimpanan ponsel tidak tersedia, mengirim langsung…";
      const h = await kirimItem(it);
      if (!h.ok) { prog.textContent = ""; return pesan(`${h.tolak || h.tunda} Isian belum terkirim dan tidak tersimpan di ponsel; form tetap terbuka, ketuk Kirim lagi saat ada sinyal.`, "galat"); }
      selesaiForm(); pesan("Terkirim.", "ok"); await muatTugas(); pilihTugas(null); return gantiTab("tugas");
    }
    prog.textContent = "Tersimpan di ponsel, mengirim…"; selesaiForm();
    await prosesAntrean(); tampilBanner(); pilihTugas(null); gantiTab("tugas");
  }

  const bidangPemadaman = (api = true) => `<details class="in-rinci"><summary>Koreksi manual personel, regu${api ? ", alat" : ""} (boleh kosong)</summary>
    <p class="lp-kecil">Bila diisi, angka ini dipakai dan hitungan mesin ditampilkan berdampingan.</p>
    ${Object.entries(UNSUR).map(([k, v]) => `<label>Personel ${v}<input data-unsur="${k}" inputmode="numeric"></label>`).join("")}
    <label>Jumlah regu<input id="regu" inputmode="numeric"></label>
    ${api ? Object.entries(NAMA_ALAT).map(([k, v]) => `<label>Alat dipakai, ${v}<input data-alat="${k}" inputmode="numeric"></label>`).join("") + `<label>Pemadaman mulai (boleh kosong)<input id="mulaiPadam" type="datetime-local"></label>` : ""}</details>`;
  function bacaPemadaman(body) {
    const un = {}, al = {};
    for (const i of document.querySelectorAll("[data-unsur]")) if (i.value.trim()) { const n = Number(i.value); if (!Number.isInteger(n) || n < 0 || n > 5000) throw new Error(`Personel ${UNSUR[i.dataset.unsur]} harus bilangan bulat 0-5000.`); un[i.dataset.unsur] = n; }
    for (const i of document.querySelectorAll("[data-alat]")) if (i.value.trim()) { const n = Number(i.value); if (!Number.isInteger(n) || n < 0) throw new Error(`Alat ${NAMA_ALAT[i.dataset.alat]} harus bilangan bulat 0 atau lebih.`); al[i.dataset.alat] = n; }
    if (Object.keys(un).length) body.personel_unsur = un; if (Object.keys(al).length) body.alat_dipakai = al;
    const r = angkaIsian("regu", true); if (r != null) { if (r > 500) throw new Error("Regu maksimal 500."); body.regu = r; }
    if (nilai("mulaiPadam")) { const t = Date.parse(nilai("mulaiPadam")); if (!Number.isFinite(t)) throw new Error("Waktu mulai pemadaman tidak sah."); body.mulai_padam = t; }
  }

  /* ---- konsesi: titik pusat kompleks dicocokkan ke poligon di peramban ---- */
  const dalam = (x, y, cincin) => { let ok = false; for (const r of cincin) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok; } return ok; };
  async function konsesiProv(prov) {
    if (konsesi[prov]) return konsesi[prov];
    try { const r = await fetch(`/data/konsesi2026/${encodeURIComponent(prov)}.json`); konsesi[prov] = r.ok ? (await r.json()).perusahaan || [] : []; } catch (e) { konsesi[prov] = []; }
    return konsesi[prov];
  }
  /* bbox perusahaan dihitung sekali; hanya yang bbox-nya memuat titik diuji poligon; jeda sesudahCat tiap 20 perusahaan supaya layar tak membeku; hasil di-cache per titik */
  const kotakPT = new WeakMap(), cocokCache = new Map();
  function bboxPT(p) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const g of p.geom || []) for (const c of g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []) for (const [x, y] of c?.[0] || []) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < x0 ? null : [x0, y0, x1, y1];
  }
  async function cocokKonsesi(P, lat, lon) {
    const kunci = `${lat},${lon},${P.length}`; if (cocokCache.has(kunci)) return cocokCache.get(kunci);
    const hasil = []; let n = 0;
    for (const p of P) {
      if (++n % 20 === 0) await new Promise(r => sesudahCat(r));
      let k = kotakPT.get(p); if (k === undefined) { k = bboxPT(p); kotakPT.set(p, k); }
      if (!k || lon < k[0] || lon > k[2] || lat < k[1] || lat > k[3]) continue;
      let kena = false;
      for (const g of p.geom || []) for (const c of g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []) if (!kena && c?.[0]?.length && dalam(lon, lat, c)) kena = true;
      if (kena) hasil.push({id: p.id, nama: p.nama});
    }
    cocokCache.set(kunci, hasil); return hasil;
  }
  const bidangPT = pre => `<label>Nama PIC perusahaan<input id="${pre}Kontak" maxlength="80"></label><label>Jabatan PIC perusahaan<input id="${pre}Jabatan" maxlength="60"></label>
    <label>WhatsApp PIC perusahaan<input id="${pre}Wa" inputmode="tel" maxlength="30"></label><label>Email PIC perusahaan<input id="${pre}Email" type="email" maxlength="254" autocapitalize="none"></label>`;
  function bacaPT(pre, perlu) {   // pre: "pt" (form lapor) atau "kt" (tab kontak): id tidak boleh kembar karena kedua tab ada di halaman bersamaan
    const nama = nilai(pre + "Nama") || (($(pre + "Pilih") && $(pre + "Pilih").value) ? $(pre + "Pilih").selectedOptions[0].dataset.nama : "");
    if (!nama) { if (perlu) throw new Error("Pilih atau isi nama perusahaan konsesi."); return null; }
    const pt = {nama_pt: nama, perusahaan_id: ($(pre + "Pilih") && $(pre + "Pilih").value) || undefined, kontak: nilai(pre + "Kontak"), jabatan: nilai(pre + "Jabatan"), wa: nilai(pre + "Wa"), email: nilai(pre + "Email")};
    if (!pt.wa && !pt.email) throw new Error("Kontak perusahaan konsesi butuh minimal satu: WhatsApp atau email.");
    return pt;
  }
  const gambutBidang = () => `<label>Kedalaman bara terukur, cm (boleh kosong)<input id="bara" inputmode="numeric" placeholder="0 sampai 300, dari tongkat atau injektor yang ditusuk ke gambut sampai terasa panas"></label>
    <label>Lahan yang teramati<select id="lahan"><option value="">Tidak diisi</option>${Object.entries(LAHAN).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>`;
  const bacaGambut = body => { const b = angkaIsian("bara", true); if (b != null) { if (b > 300) throw new Error("Kedalaman bara maksimal 300 cm."); body.kedalaman_bara_cm = b; } if (nilai("lahan")) body.lahan_teramati = nilai("lahan"); };
  async function ptMuat() {
    const t = tugas.find(x => x.id === terpilih), w = $("ptWadah"); if (!t || !w) return;
    w.innerHTML = `<p class="lp-kecil">Memeriksa konsesi di titik ini…</p>`;
    const cocok = await cocokKonsesi(await konsesiProv(t.prov), t.lat, t.lon);
    if (terpilih !== t.id || !$("ptWadah")) return;
    w.innerHTML = (cocok.length ? `<p class="lp-kecil">Titik ini berada di area konsesi. Mohon isi PIC perusahaannya.</p><label>Perusahaan<select id="ptPilih">${cocok.map(c => `<option value="${esc(c.id)}" data-nama="${esc(c.nama)}">${esc(c.nama)}</option>`).join("")}</select></label>`
      : `<p class="lp-kecil">Tidak ada konsesi yang cocok di titik ini. Kalau ada perusahaan yang terkait, isi manual (boleh kosong).</p><label>Nama perusahaan<input id="ptNama" maxlength="120"></label>`) + bidangPT("pt");
  }

  /* ---- Kontak konsesi ---- */
  async function tampilKontak() {
    const u = await api("GET", "/api/instansi/kontak"), provs = saya.cakupan || [], w = $("tabKontak");
    w.innerHTML = `<div class="in-kontak"><form id="fKontak" class="in-blok" novalidate><h2>Usulkan PIC perusahaan konsesi</h2>
      <p class="lp-kecil">Admin memeriksa usulan sebelum masuk ke daftar kontak perusahaan. Kontak tidak ditampilkan ke publik.</p>
      ${provs.length > 1 ? `<label>Provinsi (kode)<select id="kProv">${provs.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select></label>` : ""}
      <div id="ktWadah" class="in-baris-isi"><p class="lp-kecil">Memuat daftar perusahaan…</p></div>
      <button type="submit" id="kKirim" class="lp-tombol utama">Kirim usulan</button></form>
      <h2 class="in-sub">Usulanmu</h2><div class="in-usulan">${u.ok && u.j.usulan.length ? u.j.usulan.map(x => `<div class="in-kartu"><div class="in-kepala"><b>${esc(x.nama_pt)}</b>${pil(x.status, x.status === "diterima" ? "hijau" : x.status === "ditolak" ? "merah" : "emas")}</div>${x.alasan ? `<p class="in-meta">${esc(x.alasan)}</p>` : ""}</div>`).join("") : `<div class="in-kosong"><p>Belum ada usulan. Isi formulir di atas bila kamu tahu PIC perusahaan konsesi di wilayahmu.</p></div>`}</div></div>`;
    if ($("kProv")) $("kProv").addEventListener("change", kontakDaftar);
    kontakDaftar();
  }
  async function kontakDaftar() {
    const prov = $("kProv") ? $("kProv").value : (saya.cakupan || [])[0]; if (!prov) return;
    const P = await konsesiProv(prov), kab = (saya.kab || "").toLowerCase();
    const dekat = kab ? P.filter(p => (p.kab || []).some(k => String(k).toLowerCase() === kab)) : P, daftar = (dekat.length ? dekat : P).slice().sort((a, b) => String(a.nama).localeCompare(String(b.nama)));
    $("ktWadah").innerHTML = `<label>Perusahaan<select id="ktPilih"><option value="">Tidak ada di daftar (isi manual)</option>${daftar.map(p => `<option value="${esc(p.id)}" data-nama="${esc(p.nama)}">${esc(p.nama)}</option>`).join("")}</select></label>
      <label>Nama perusahaan bila manual<input id="ktNama" maxlength="120"></label>${bidangPT("kt")}`;
  }
  async function kirimKontak(e) {
    e.preventDefault(); if (sibuk) return;
    let pt; try { pt = bacaPT("kt", true); } catch (x) { return pesan(x.message, "galat"); }
    sibuk = true; $("kKirim").disabled = true;
    const r = await api("POST", "/api/instansi/kontak", pt);
    sibuk = false; $("kKirim").disabled = false;
    if (!r.ok) return pesan(manusiawi(r, "Usulan belum terkirim."), "galat");
    pesan("Usulan terkirim, menunggu admin.", "ok"); gantiTab("kontak");
  }

  const TAMPIL = {tugas: tampilTugas, kontak: tampilKontak};
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && saya) api("GET", "/api/instansi/saya"); });   // akun lain masuk di tab lain: 401 menutup tampilan basi
  bersihkanSimpanan();   // draf dan antrean basi dibuang tanpa menunggu siapa pun masuk
  try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/^pb_pic:[^|]*\|[^|]*$/.test(k)) localStorage.removeItem(k); } } catch (e) {}   // PIC lama tanpa id akun
  muatSaya();
})();
