/* Pantau Bencana BNPB (/lapor): aplikasi pesan dengan tab Beranda, Laporan, Bantuan, dan layar chat berkartu langkah.
   Mesin di server (src/lapor_mesin.js lewat /api/lapor/*); layar ini hanya menampilkan dan mengirim jawaban.
   - Teks bot berformat WA (*tebal*) disisipkan sebagai node teks, tidak pernah sebagai HTML.
   - Kartu langkah mengikuti keadaan mesin: minta (setuju, identitas, lokasi, jenis, sub, foto), form (angka, waktu, RT/RW), pilihan, banyak.
   - Cache: percakapan dan daftar laporan disimpan di localStorage per nomor supaya muat ulang langsung tampil.
   - Suara (id-ID) bila peramban mendukung; foto dikecilkan di peramban (foto_kecil.js), EXIF dibaca dulu (exif.js). */
import {maskot} from "/lapor/maskot.js?v=24"; // bervesi: berkas .js disajikan immutable
import {ilustrasi, adaIlustrasi} from "/lapor/ilustrasi.js?v=3";
import {BAHAYA_ALUN, barisPrakiraan} from "/lapor/dampak_peringatan.js?v=2";   // Alun-alun tampilan Peringatan (DP-11)
import {gabung, saring, teksKartu} from "/lapor/alun_kabar.js?v=1";   // Kabar Alun-alun (KA-05): gabung resmi, warga, berita
/* Pelapor mengetik nomor WhatsApp tanpa kode (KEPUTUSAN-LAPOR-AI K65, D99-D102); di situs, nomor ketikan diikat ke perangkat lewat kuki HttpOnly
   dari Worker. Sesi /masuk yang sudah ada tetap dipakai bila ada. Kiriman POST wajib x-pb: 1. */
const LOKAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
{ const asli = window.fetch.bind(window);
  window.fetch = (u, o = {}) => (String(u).startsWith("/api/lapor/") && (o.method || "GET").toUpperCase() !== "GET") ? asli(u, {...o, credentials: "same-origin", headers: {...(o.headers || {}), "x-pb": "1"}}) : asli(u, o); }
const $ = id => document.getElementById(id);
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const ikon = (id, kelas) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("aria-hidden", "true"); if (kelas) s.setAttribute("class", kelas);
  const u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", `#${id}`); s.append(u); return s; };
const AVATAR = "/lapor/lambang-bnpb.png";   // lambang bulat transparan; sumber-bnpb.png berlatar putih jadi kotak di mode gelap
const IKON_JENIS = {banjir: "b-banjir", longsor: "b-longsor", abrasi: "b-gelombang", cuaca: "b-angin", kekeringan: "b-matahari", karhutla: "b-api", gempa: "b-gempa", tsunami: "b-gelombang", erupsi: "b-gunung", kebakaran_gedung: "b-gedung"};
const ILUS_JENIS = {}; // jenis tanpa foto memakai ilustrasi
const KREDIT = {kekeringan: "Foto: Crisco 1492, CC BY-SA 4.0", kebakaran_gedung: "Foto: CEphoto, Uwe Aranas, CC BY-SA 3.0"}; // foto berlisensi atribusi
const GAMBAR = {kebakaran_gedung: "kebakaran", kekeringan: "kekeringan", banjir: "banjir", longsor: "longsor", abrasi: "rob", cuaca: "cuaca", gempa: "gempa", tsunami: "tsunami", erupsi: "gunungapi", karhutla: "karhutla"};
const KELOMPOK_IKON = {"Kejadian": "i-kejadian", "Korban": "i-korban", "Warga terdampak": "i-orang", "Pengungsian": "i-pengungsian", "Warga terdampak dan mengungsi": "i-pengungsian", "Kerusakan rumah": "i-rumah", "Fasilitas dan jalan": "i-fasilitas", "Data khusus": "i-khusus", "Kebutuhan": "i-kebutuhan", "Penyelamatan dan medis": "i-plus", "Situasi sekarang": "i-status", "Kelompok rentan": "i-orang", "Layanan dasar": "k-listrik"};
const KEPALA = {tempat: ["i-pengungsian", "Titik pengungsian"], pilihan: ["i-daftar", "Pilih salah satu"], setuju: ["i-status", "Persetujuan data"], identitas: ["i-orang", "Data pelapor"], lokasi: ["i-lokasi", "Lokasi kejadian"], jenis: ["i-kejadian", "Jenis bencana"],
  sub: ["i-kejadian", "Karakteristik"], foto: ["i-kamera", "Foto kejadian"]};
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const log = $("log"), gulir = $("gulir"), wadah = $("kartuLangkah"), fPesan = $("fPesan"), iTeks = $("iTeks"), statusEl = $("status"), app = $("app");
let kembaliKe = "beranda", wa = null, sibuk = false, cache = {transkrip: [], laporan: []}, terakhir = null, posisi = null;

const simpan = {
  baca(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  tulis(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* mode privat atau penuh: tanpa cache */ } },
};
const kunciCache = () => `lapor-cache-${wa}`;
const simpanCache = () => simpan.tulis(kunciCache(), cache);

/* ============ navigasi ============ */
function ke(tab) {
  for (const s of document.querySelectorAll(".lp-layar")) s.hidden = s.dataset.tab !== tab;
  if (tab !== "privasi") kembaliKe = tab;
  $("lChat").hidden = tab !== "chat"; $("lMasuk").hidden = tab !== "masuk"; $("lPrivasi").hidden = tab !== "privasi"; $("lInfo").hidden = tab !== "info";
  app.classList.toggle("di-chat", ["chat", "masuk", "info", "privasi"].includes(tab));
  app.classList.toggle("di-lapor", tab === "chat");   // obrolan lapor: tombol Lapor kejadian di menu samping disembunyikan (pemilik 24 Nov 2026)
  app.classList.toggle("di-alun", tab === "alun");   // peta Alun-alun: menu samping ciut sendiri, melebar saat disorot (pemilik 26 Nov 2026)
  for (const b of document.querySelectorAll("#tab button")) b.toggleAttribute("aria-current", b.dataset.ke === tab) || b.removeAttribute("aria-current");
  for (const b of document.querySelectorAll("#tab button")) { if (b.dataset.ke === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
  if (tab === "laporan") { $("titikBaru").hidden = true; tampilDaftarLaporan(); muatCari(); }
  if (tab === "alun") tampilAlun();
  if (tab === "tentang" && !$("heroTentang").querySelector(".lp-hero-tengah")) { // salin maskot dan kartu kontak beranda tanpa id ganda
    for (const k of [".lp-hero-tengah", ".lp-hero-kanan"]) { const c = document.querySelector(`#lBeranda ${k}`)?.cloneNode(true); if (!c) continue; c.querySelectorAll("[id]").forEach(e => e.removeAttribute("id")); c.querySelectorAll("svg.sg").forEach(s => { s.outerHTML = maskot(s.dataset.pose); }); /* gradien salinan merujuk id beranda yang tersembunyi: gambar ulang */ $("heroTentang").append(c); } }
  if (tab === "tentang") panduTentang();
  if (tab === "chat") requestAnimationFrame(() => gulir.scrollTo({top: gulir.scrollHeight}));
  sigapLayar(tab);
}
// menu: Bantuan dilebur ke Beranda, diganti Kebijakan privasi (pemilik 19 Nov 2026)
document.querySelectorAll("#tab button[data-ke]").forEach(b => b.addEventListener("click", () => b.dataset.ke === "lapor" ? bukaChat() : b.dataset.ke === "privasi" ? bukaPrivasi() : ke(b.dataset.ke)));
$("bKembali").addEventListener("click", () => { ke("beranda"); tampilBeranda(); });
$("bLaporBaru").addEventListener("click", () => bukaChat()); $("bDarurat")?.addEventListener("click", () => bukaChat(true));
$("bCekStatus").addEventListener("click", () => { ke("chat"); kirim({teks: "status", tampil: "Cek status laporan"}); });
document.querySelectorAll("[data-aksi]").forEach(b => b.addEventListener("click", () => ({lapor: () => bukaChat(), darurat: () => bukaChat(true), hilang: () => bukaChat("cari"), sekali: () => sekaliKetuk(), info: () => bukaInfo("info"), prediksi: () => bukaInfo("prediksi"),
  penting: () => bukaInfo("penting"), edukasi: () => { ke("bantuan"); pilihGrup("Edukasi"); }})[b.dataset.aksi]()));
$("bSemuaBantu").addEventListener("click", () => ke("bantuan"));
/* Sigap memandu fitur beranda (pemilik 21 Nov 2026): gelembung bergilir 8 detik, berhenti saat disentuh atau difokus,
   tombol Jeda sesuai WCAG 2.2.2; tanpa gilir otomatis bila pengguna meminta gerak dikurangi. Delegasi: salinan di Cara melapor ikut jalan. */
const tipGerak = matchMedia("(prefers-reduced-motion: no-preference)").matches;
for (const w of document.querySelectorAll(".lp-hg-tip")) {   // titik kemajuan menggantikan "1 dari 7" yang tampil (teksnya tetap untuk pembaca layar)
  const n = w.querySelectorAll(".lp-hg-slide").length, t = el("span", "lp-hg-titik"); t.setAttribute("aria-hidden", "true");
  for (let i = 0; i < n; i++) t.append(el("i", i ? null : "aktif")); w.querySelector(".lp-hg-urut").after(t); }
/* gelembung Sigap di Cara melapor berisi panduan halaman itu sendiri, bukan salinan panduan beranda (pemilik 25 Nov 2026: "harus disesuaikan saat itu di halaman apa dia") */
const TIP_TENTANG = [["edukasi", "Mau tahu cara melapor?", "Ikuti enam langkah di bawah. Sebagian besar jawaban cukup dipilih, tidak perlu mengetik panjang.", "#ttCara", "Lihat langkah"],
  ["bahasa", "Melapor lewat WhatsApp?", "Ketik kembali, status, batal, atau lapor kapan saja di tengah percakapan.", "#ttKata", "Lihat kata"],
  ["status", "Ingin laporan cepat ditangani?", "Lapor dari dekat lokasi dan potret kerusakannya, bukan wajah orang.", "#ttCepat", "Lihat caranya"],
  ["penting", "Ada nyawa terancam?", "Jangan menunggu laporan. Telepon 112 sekarang.", "tel:112", "Telepon 112"]];
function panduTentang() {
  const w = $("heroTentang").querySelector(".lp-hg-tip"); if (!w || w.dataset.tentang) return; w.dataset.tentang = "1";
  const isi = w.querySelector(".lp-hg-isi");
  isi.replaceChildren(...TIP_TENTANG.map(([aksi, judul, teks, ke, label], i) => {
    const s = el("div", "lp-hg-slide"); s.setAttribute("role", "group"); s.setAttribute("aria-roledescription", "slide"); s.setAttribute("aria-label", `${i + 1} dari ${TIP_TENTANG.length}`); s.hidden = i > 0; s.dataset.maskot = aksi;
    const b = ke.startsWith("tel:") ? Object.assign(el("a", "lp-hg-buka"), {href: ke}) : el("button", "lp-hg-buka"); if (b.tagName === "BUTTON") { b.type = "button"; b.dataset.tipGulir = ke; }
    b.append(ikon(ke.startsWith("tel:") ? "i-telepon" : "i-daftar", "lp-hg-ikon"), label, ikon("i-panah")); s.append(el("b", null, judul), teks, b); return s; }));
  const titik = w.querySelector(".lp-hg-titik"); titik?.replaceChildren(...TIP_TENTANG.map((_, i) => el("i", i ? null : "aktif")));
  w.querySelector(".lp-hg-urut").textContent = `1 dari ${TIP_TENTANG.length}`;
  const m = w.parentElement.querySelector(".lp-hero-maskot"); if (m) m.innerHTML = maskot("semangat", "", TIP_TENTANG[0][0]);
}
document.addEventListener("click", e => { const b = e.target.closest("[data-tip-gulir]"); if (b) document.querySelector(b.dataset.tipGulir)?.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"}); });
function tipKe(w, arah, pengguna) {
  const sl = [...w.querySelectorAll(".lp-hg-slide")], i = sl.findIndex(x => !x.hidden), j = (i + arah + sl.length) % sl.length;
  sl[i].hidden = true; sl[j].hidden = false;
  w.querySelector(".lp-hg-urut").textContent = `${j + 1} dari ${sl.length}`;
  w.querySelectorAll(".lp-hg-titik i").forEach((t, k) => t.classList.toggle("aktif", k === j));
  w.querySelector(".lp-hg-isi").setAttribute("aria-live", pengguna ? "polite" : "off");
  // maskot di bawah gelembung memegang papan sesuai panduan yang tampil (pemilik 25 Nov 2026)
  const m = w.parentElement.querySelector(".lp-hero-maskot"), aksi = sl[j].dataset.maskot || sl[j].querySelector("[data-tip-aksi]")?.dataset.tipAksi;
  if (m) m.innerHTML = AKSI_MASKOT[aksi] ? maskot("semangat", "", aksi) : maskot("sapa");
}
const AKSI_MASKOT = {darurat: 1, lapor: 1, status: 1, info: 1, edukasi: 1, penting: 1, bahasa: 1};
document.addEventListener("click", e => {
  const b = e.target.closest(".lp-hg-tip button"); if (!b) return;
  const w = b.closest(".lp-hg-tip");
  if (b.dataset.tip) { tipKe(w, +b.dataset.tip, true); return; }   // gilir tetap jalan (pemilik 21 Nov 2026: "jalan aja terus")
  const x = b.dataset.tipAksi;
  if (x === "tur") mulaiTur(); else if (x === "penting") bukaInfo("penting"); else if (x === "status") $("bCekStatus").click(); else document.querySelector(`#lBeranda [data-aksi="${x}"]`)?.click();
});
for (const ev of ["pointerenter", "focusin"]) document.addEventListener(ev, e => { const w = e.target.closest?.(".lp-hg-tip"); if (w) w.dataset.tahan = "1"; }, true);
for (const ev of ["pointerleave", "focusout"]) document.addEventListener(ev, e => { const w = e.target.closest?.(".lp-hg-tip"); if (w && !w.matches(":hover, :focus-within")) w.dataset.tahan = ""; }, true);
if (tipGerak) {
  setInterval(() => { if (document.hidden) return;
    for (const w of document.querySelectorAll(".lp-hg-tip")) if (w.offsetParent && w.dataset.tahan !== "1") tipKe(w, 1, false); }, 8000);
}

/* ============ pesan di log ============ */
function teksWa(e, teks) {
  for (const [i, bagian] of String(teks).split(/\*([^*\n]+)\*/).entries()) {
    if (!bagian) continue;
    if (i % 2) e.append(el("strong", null, bagian)); else e.append(bagian);
  }
}
function tambah(dari, teks, {galat = false, foto = null, berkas = null, simpanKe = true} = {}) {
  if (dari === "bot") teks = trStatis(teks);   // teks bot buatan layar dari kamus statis; balasan server sudah dalam bahasa pilihan
  const li = el("li", dari), sebelum = log.lastElementChild;
  if (galat) li.classList.add("lp-galat");
  const ganti = !sebelum || !sebelum.classList.contains(dari);
  if (ganti) li.classList.add("baru");
  if (dari !== "saya") {
    const img = el("img"); img.src = AVATAR; img.alt = ""; img.width = img.height = 28;
    if (!ganti) sebelum.querySelector(":scope > img")?.classList.add("kosong");
    li.append(img);
  }
  const g = el("div", "lp-gelembung");
  if (foto) { const f = el("img", "lp-foto-kirim"); f.src = foto; f.alt = "Foto yang dikirim"; g.append(f); }
  if (berkas) { const a = el("span", "lp-lampiran"); a.append(el("span", null, "PDF"), berkas); g.append(a); }
  if (teks) teksWa(g, teks);
  li.append(g);
  if (dari !== "saya" && ganti) log.append(el("li", "tengah lp-pengirim-baris", dari === "admin" ? "Admin BNPB" : "Asisten AI Pantau Bencana"));
  log.append(li);
  if (simpanKe) { cache.transkrip.push({dari, teks, foto: foto?.startsWith("data:") ? null : foto, berkas}); cache.transkrip = cache.transkrip.slice(-200); simpanCache(); }
  requestAnimationFrame(() => gulir.scrollTo({top: gulir.scrollHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}));
}

/* ============ kartu langkah ============ */
function kartuBatal(ik = "i-tutup", judul = "Laporan dibatalkan") {
  const isi = kartu(ik, judul), aksi = el("div", "lp-aksi-dua");
  const baru = el("button", "lp-utama"), pulang = el("button", "lp-kedua"); baru.type = pulang.type = "button";
  baru.append(ikon("i-plus"), "Buat laporan baru"); pulang.append(ikon("i-rumah-tab"), "Ke beranda");
  baru.addEventListener("click", () => kirim({teks: "lapor", tampil: "Buat laporan baru"}));
  pulang.addEventListener("click", () => { ke("beranda"); tampilBeranda(); });
  aksi.append(pulang, baru); isi.append(aksi); baru.focus();
}
/* sesudah laporan orang dicari (pemilik 26 Nov 2026: "Jangan cuma chat gini dong"): jalan keluar, lalu kartu Nomor penting terdekat dari lokasi terakhir terlihat */
function kartuCariTerkirim() {
  kartuBatal("i-centang", "Laporan orang dicari diterima"); wadah.querySelector(".lp-kembali-langkah")?.remove();
  wadah.append(kartuPentingLapor(cache.lokasiLapor));
}
/* tempat menunggu orang dicari, dicari seperti di peta (pemilik 26 Nov 2026: "Sekolah atau Jalan apa yang tinggal cari"): posko, sekolah, rumah ibadah,
   dan jalan di sekitar lokasi terakhir terlihat (OpenStreetMap, /api/lapor/sekitar, sumber yang sama dengan titik pengungsian), atau desa/kelurahan
   (/api/lapor/cari, sumber kartu lokasi). Pilihan dikirim ke mesin sebagai teks nama + alamat ringkas; alamat ketikan tetap bisa. */
function kartuAntar(j) {
  const isi = kartu("i-pengungsian", "Tempat menunggu"), dari = ((j.isian || []).find(x => x.nama === "lokasi" && x.tampil)?.tampil || "").replace(/\s*\(.*$/, "").split(", ").slice(0, 3).join(", ");   // desa, kec, kab; tanpa koordinat
  const kp = el("div", "lp-lok-kepala"), ik = el("span", "lp-lok-ikon"); ik.append(ikon("i-lokasi"));
  const tx = el("div"); tx.append(el("b", null, "Cari tempat Anda menunggu"), el("small", null, "Terdekat dari lokasi terakhir terlihat. Petugas mengantar ke tempat yang Anda pilih.")); kp.append(ik, tx);
  const cari = el("label", "lp-cari"), q = el("input"); q.type = "search"; q.placeholder = "Cari posko, sekolah, atau jalan"; q.setAttribute("aria-label", "Cari tempat menunggu");
  Object.assign(q, {spellcheck: false, autocapitalize: "none", enterKeyHint: "search"}); q.setAttribute("autocorrect", "off");
  cari.append(ikon("i-cari"), q);
  const hasil = el("ul", "lp-cari-hasil"), hasilW = el("ul", "lp-cari-hasil"), IK = {Sekolah: "i-fasilitas", "Rumah ibadah": "i-fasilitas", Jalan: "i-lokasi", Jembatan: "i-lokasi"};
  const pakai = (teks, tampil) => kirim({teks: teks.slice(0, 200), tampil});
  let semua = null, ulang = 0, tunda;
  const awalKata = (h, k) => h.toLowerCase().split(/[^\p{L}\p{N}]+/u).some(w => w.startsWith(k));   // "sd" cocok "SD Negeri", tidak cocok "TK Bustanul"
  const gambar = () => { if (!semua) return;
    const kata = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean), cocok = semua.filter(x => kata.every(k => awalKata(`${x.nama} ${x.jenis}`, k)));
    hasil.replaceChildren(...cocok.slice(0, 8).map(x => { const li = el("li"), b = el("button", "lp-hasil"); b.type = "button";
      const u = el("span", "lp-hasil-ikon"); u.append(ikon(IK[x.jenis] || "i-pengungsian"));
      const t = el("span", "lp-hasil-teks"), atas = el("span", "lp-hasil-atas"), km = `${x.jarakKm.toLocaleString("id-ID")} km`;
      atas.append(el("b", null, x.nama)); t.append(atas, el("small", null, `${x.jenis}, ${km}`)); b.append(u, t, ikon("i-panah")); b.title = x.nama;
      b.addEventListener("click", () => pakai(`${x.nama} (${x.jenis.toLowerCase()}), ${km} dari ${dari || "lokasi terakhir terlihat"}`, x.nama)); li.append(b); return li; })); };
  const muat = async () => {
    try { const rs = await Promise.all(["pengungsian", "jalan"].map(jn => fetch(`/api/lapor/sekitar?wa=${encodeURIComponent(wa || "")}&jenis=${jn}&semua=1`, {signal: AbortSignal.timeout(15000)}).then(r => r.ok ? r.json() : {})));
      semua = rs.flatMap(r => r.tempat || []).sort((a, b) => a.jarakKm - b.jarakKm);
      if (rs.some(r => r.sebagian) && ulang++ < 2) setTimeout(muat, 4000);   // rumah ibadah dan jalan menyusul dari Overpass
      gambar(); } catch { semua ||= []; }
  };
  q.addEventListener("input", () => { gambar(); clearTimeout(tunda);
    if (q.value.trim().length < 3) { hasilW.replaceChildren(); return; }
    tunda = setTimeout(() => cariTempat(q.value.trim(), "", hasilW, d => pakai(`${d.judul}, ${d.sub}`, d.judul), false).catch(() => hasilW.replaceChildren()), 300); });
  // alamat yang tidak ketemu: diketik sendiri (min. 5 huruf, sama dengan mesin)
  const sendiri = el("button", "lp-kedua"), lA = el("label", "lp-isi"), alamat = el("input"), simpanA = el("button", "lp-utama");
  sendiri.type = simpanA.type = "button"; sendiri.append(ikon("i-tambah-teks"), "Ketik alamat sendiri"); simpanA.append(ikon("i-centang"), "Simpan alamat");
  alamat.type = "text"; alamat.maxLength = 200; alamat.autocomplete = "street-address"; alamat.enterKeyHint = "done"; alamat.placeholder = "Nama posko atau jalan, RT/RW, dan patokan"; lA.append("Alamat tempat menunggu", alamat); lA.hidden = simpanA.hidden = true;
  sendiri.setAttribute("aria-expanded", "false");
  sendiri.addEventListener("click", () => { sendiri.setAttribute("aria-expanded", "true"); sendiri.hidden = true; lA.hidden = simpanA.hidden = false; if (!alamat.value) alamat.value = q.value.trim(); alamat.focus(); });
  simpanA.addEventListener("click", () => { const v = alamat.value.trim(); if (v.length < 5) { statusEl.textContent = "Tulis nama posko atau alamatnya, paling tidak nama jalan."; alamat.focus(); return; } pakai(v, v); });
  alamat.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) simpanA.click(); });   // Enter = simpan, tidak memotong ketikan IME
  const blok = el("div", "lp-lok lp-lok-antar"); blok.append(kp, cari, hasil, hasilW, sendiri, lA, simpanA);
  isi.append(blok); isi.closest(".lp-langkah").classList.add("lp-langkah-lok");
  muat(); q.focus();
}
function kartu(kunci, judul) {
  const [ik, jd] = KEPALA[kunci] || [kunci, judul];
  const k = el("section", "lp-langkah"), kp = el("div", "lp-langkah-kepala"), isi = el("div", "lp-langkah-isi");
  kp.append(ikon(ik), judul || jd); k.append(kp, isi);
  // salah pilih: kembali ke pertanyaan sebelumnya (pemilik 19 Nov 2026)
  if (terakhir?.bisaKembali && !["setuju", "identitas"].includes(kunci)) { const kb = el("button", "lp-kembali-langkah"); kb.type = "button"; kb.append(ikon("i-kembali"), "Kembali");
    kb.setAttribute("aria-label", "Kembali ke pertanyaan sebelumnya"); kb.addEventListener("click", () => kirim({teks: "kembali", kembali: true, tampil: false})); kp.append(kb); }
  wadah.replaceChildren(k);
  return isi;
}
function tombolOpsi(label, ket, aksi, kelas = "") {
  const b = el("button", kelas); b.type = "button"; b.append(el("b", null, label)); if (ket) b.append(el("small", null, ket));
  b.addEventListener("click", aksi); return b;
}

const ikonKebutuhan = (o, bawaan = "i-kebutuhan") => [  // kelompok rentan dan layanan terganggu berikon sendiri (pemilik 19 Nov 2026 "bagusin")
  [/^tidak ada|^semua masih|^belum ada/i, "i-centang"], [/^tidak tahu|^belum tahu/i, "i-bantuan"],
  // benda yang terdampak bergambar sendiri (pemilik 25 Nov 2026: "rumah warga, jalan, sawah masa sama semua")
  [/terjebak/i, "i-orang"], [/genset|penerangan/i, "k-listrik"], [/bahan atap/i, "i-rumah"], [/gergaji/i, "k-alat"], [/pompa/i, "k-air-turun"],
  [/rumah sakit|puskesmas|klinik/i, "i-plus"], [/rumah/i, "i-rumah"], [/jalan|jembatan/i, "k-jalan"], [/sawah|kebun|ladang|lahan/i, "k-daun"], [/sekolah|ibadah|masjid|gereja/i, "k-sekolah"], [/pasar|toko|warung/i, "k-pasar"], [/kantor|gedung/i, "b-gedung"], [/hamil|menyusui|disabilitas|lansia/i, "i-orang"], [/listrik/i, "k-listrik"], [/sinyal|telepon/i, "i-telepon"],
  [/makan/i, "k-makan"], [/air/i, "b-banjir"], [/selimut|pakaian/i, "k-baju"], [/obat|kesehatan/i, "i-plus"], [/tenda|terpal/i, "k-tenda"],
  [/bayi|lansia/i, "k-bayi"], [/sembako|pangan/i, "k-makan"], [/sandang/i, "k-baju"], [/matras|tikar|kasur/i, "k-kasur"], [/family kit/i, "k-sabun"], [/kidsware/i, "k-bayi"], [/tangki/i, "b-banjir"], [/mandi|kebersihan/i, "b-banjir"], [/tandon|penampungan/i, "b-banjir"], [/mesin|selang|pemadam/i, "b-api"], [/masker/i, "i-plus"], [/karung|bronjong/i, "b-longsor"], [/evakuasi|perahu/i, "k-perahu"], [/alat berat/i, "k-alat"], [/lainnya/i, "i-tambah-teks"], [/belum/i, "i-centang"]].find(([r]) => r.test(o))?.[1] || bawaan;
// sub-jenis bergambar sendiri; yang belum punya gambar memakai ikon jenisnya (pemilik 25 Nov 2026: "biar iconnya beda-beda")
const ikonSub = o => [[/luapan sungai/i, "b-sungai"], [/genangan/i, "b-genangan"], [/bandang/i, "b-bandang"], [/banjir rob/i, "b-rob"], [/lahar/i, "b-lahar"], [/tanggul|waduk|bendungan/i, "b-tanggul"]].find(([r]) => r.test(o))?.[1];
/* batang bertingkat hanya untuk skala berurutan; pilihan kategori (hubungan, jenis) tidak boleh berbatang sinyal */
const RE_LEWATI = /^(lewati|lewat)\b/i;
const bertingkat = ps => { const p = ps.filter(x => !/tidak tahu|ragu|lainnya/i.test(x)); return p.length >= 2 && (p.every(x => /^(tidak ada|sedikit|sedang|banyak|sangat banyak|ringan|berat|rendah|tinggi|kecil|besar)$/i.test(x)) || p.every(x => /^(sekitar |lebih dari |kurang dari )?[\d,.]+/i.test(x))); };
/* isian bebas satu jawaban (pemilik 26 Nov 2026 "bagusin"): kotak bertoken, bukan textarea bawaan peramban; angka = satu baris papan angka;
   Lewati/Tidak tahu tombol kedua sejajar Kirim; hitungan huruf hanya muncul dekat batas */
const isiTeksBebas = (isi, j) => { const angka = j.minta === "angka", maks = angka ? 3 : 300;
  const t = el(angka ? "input" : "textarea", "lp-isian"); t.maxLength = maks; t.autocomplete = "off"; t.setAttribute("aria-label", "Jawaban");
  if (angka) { t.type = "text"; t.inputMode = "numeric"; t.pattern = "[0-9]*"; t.placeholder = "Contoh: 12"; } else { t.rows = 1; t.autocapitalize = "sentences"; t.placeholder = "Ketik di sini"; }
  const h = el("small", "lp-hitung"), k = el("button", "lp-utama", "Kirim"), l = el("button", "lp-kedua", j.pilihan[0]), bawah = el("div", "lp-isian-aksi"); k.type = l.type = "button"; h.hidden = true;
  const sah = () => angka ? /^\d{1,3}$/.test(t.value.trim()) : !!t.value.trim();
  t.addEventListener("input", () => { if (angka) t.value = t.value.replace(/\D/g, ""); const n = t.value.length; h.hidden = angka || n < maks - 60; h.textContent = `${n}/${maks}`; t.removeAttribute("aria-invalid"); });
  t.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && sah()) { e.preventDefault(); k.click(); } });
  k.addEventListener("click", () => { if (!sah()) { t.setAttribute("aria-invalid", "true"); t.focus(); return; } kirim({teks: t.value.trim(), tampil: angka ? `${t.value.trim()} tahun` : t.value.trim()}); });   // Kirim tetap tombol utama (bukan abu); kosong = kursor kembali ke kotak l.addEventListener("click", () => kirim({teks: "1", tampil: j.pilihan[0]}));
  bawah.append(l, k); isi.append(t, h, bawah); };
const ikonOpsi = o => [
  [/^(anak|orang tua|suami|istri|saudara|teman|tetangga|kerabat|keluarga)\b/i, "i-orang"], [/^lainnya$/i, "i-daftar"],
  // dicocokkan dengan pertanyaannya (pemilik 25 Nov 2026: "cari kesesuaian icon dan pertanyaan"); null = skala bertingkat berbatang
  [/^SIG |menutupi tanah/i, null], [/^pelan, sedikit/i, "k-air-naik"], [/merayap/i, "b-longsor"], [/\d+\s*jam\b|setengah hari|sehari|seperempat|setengah jam|minggu|kali ini/i, "k-jam"],
  [/^bisa dilewati/i, "k-jalan"], [/^terputus/i, "i-tutup"], [/^sudah tenang/i, "i-centang"], [/reda dan cerah/i, "b-matahari"], [/^antre/i, "i-orang"], [/tempat jauh/i, "i-lokasi"], [/tertimpa atau terjepit/i, "i-orang"], [/^mulai sulit/i, "k-air-turun"],
  [/lahan kosong|pekarangan/i, "k-daun"], [/membakar/i, "b-api"], [/sangat kering/i, "b-matahari"], [/tidak mengancam/i, "i-centang"], [/getaran|hentakan/i, "b-gempa"], [/detik/i, "k-jam"], [/lari keluar/i, "i-pengungsian"], [/sembako|paket pangan/i, "k-makan"], [/hewan|ternak/i, "k-daun"], [/dentuman|ledakan/i, "b-gunung"], [/kendaraan/i, "k-jalan"], [/kebakaran|lava|belerang/i, "b-api"], [/ikan|biota/i, "b-gelombang"], [/sirene|kentongan/i, "i-sirene"], [/hidran/i, "b-banjir"],
  [/^masih naik|naik cepat/i, "k-air-naik"], [/hitungan menit/i, "k-jam"], [/^bertahan/i, "k-air-tetap"], [/^mulai surut/i, "k-air-turun"], [/^sudah surut/i, "k-air-surut"],
  [/laut pasang/i, "b-rob"], [/tanggul|talud|pintu air|bendungan/i, "b-tanggul"], [/dari arah hulu|tiba-tiba, deras/i, "b-bandang"],
  [/semua kendaraan/i, "k-jalan"], [/motor dan pejalan/i, "i-orang"], [/^putus/i, "i-tutup"], [/^masih cukup/i, "i-centang"], [/^tidak ada air/i, "i-tutup"],
  [/orang tertimbun|warga masih|ternak hanyut/i, "i-orang"], [/arus deras/i, "b-bandang"], [/gemuruh/i, "b-gempa"], [/kendaraan tertimpa/i, "k-jalan"], [/pohon/i, "k-daun"],
  [/^masih bergerak/i, "b-longsor"], [/^sudah berhenti/i, "i-centang"], [/^masih tinggi|surut mendadak|terkikis|garis pantai|sampah laut|bibir pantai/i, "b-gelombang"], [/^masih berlangsung/i, "k-jam"],
  [/awan|gelap/i, "b-hujan"], [/dingin|angin/i, "b-angin"], [/gerah|panas/i, "b-matahari"], [/petir|kilat/i, "b-petir"], [/^hujan/i, "b-hujan"], [/retak|menggantung|miring/i, "b-gempa"], [/dinding|bangunan/i, "b-gedung"], [/peringatan/i, "i-sirene"],
  [/^ganti/i, "i-orang"], [/^benar|^ya\b|^setuju|kirim/i, "i-centang"], [/^bukan|^tidak setuju|batal/i, "i-tutup"], [/tidak tahu|ragu/i, "i-bantuan"],
  [/tanpa foto|lanjut/i, "i-panah"], [/ubah/i, "i-daftar"], [/lokasi|desa|gps/i, "i-lokasi"], [/foto/i, "i-kamera"],
  [/petir/i, "b-petir"], [/hujan es|butiran es/i, "b-es"], [/hujan|kemarau/i, "b-hujan"], [/angin|puting|siklon/i, "b-angin"],
  [/permukiman/i, "i-rumah"], [/jauh ke darat|darat/i, "i-lokasi"], [/pantai saja/i, "b-gelombang"], [/gempa kuat terasa/i, "b-gempa"],
  [/surut|turun|mereda|berhenti|padam/i, "k-turun"], [/naik|masih/i, "k-naik"],
  [/sungai|meluap|tanggul|bendungan|pasang|genang|air|sumur|banjir|tsunami|gelombang|pantai|ombak/i, "b-banjir"],
  [/tanah|lereng|tebing|longsor|timbun/i, "b-longsor"], [/pohon|sawah|kebun|tanaman|ternak|semak/i, "k-daun"], [/listrik|korsleting|baliho|tiang/i, "k-listrik"],
  [/api|terbakar|gambut|hutan|asap|kompor|gas/i, "b-api"], [/guncang|gempa|retak|roboh/i, "b-gempa"], [/abu|erupsi|awan panas|lahar|batu|kerikil|kawah/i, "b-gunung"],
  [/toko|gedung|kantor|pasar/i, "b-gedung"], [/kampung|dusun/i, "i-rumah"], [/satu titik|titik/i, "i-lokasi"], [/rumah|atap/i, "i-rumah"], [/jalan/i, "i-lokasi"], [/mengungsi|tempat tinggi|warga/i, "i-pengungsian"],
  [/menit|bulan|sejak|lama|berlangsung/i, "k-jam"], [/bantuan|beli|membeli|mengambil/i, "i-kebutuhan"], [/tidak ada|tanpa/i, "i-centang"]].find(([r]) => r.test(o))?.[1];
/* pilihan tinggi air: orang dewasa 170 cm dengan air setinggi pilihannya (pemilik 19 Nov 2026: "bagusin") */
/* pilihan bertingkat tanpa ikon: batang naik, yang terisi sebanyak urutan pilihannya (besar kecilnya terlihat sekilas) */
const gambarTingkat = (i, n) => { const k = Math.max(2, Math.min(n, 5)); return `<svg viewBox="0 0 ${k * 8} 24" aria-hidden="true" class="lp-tingkat-svg">${Array.from({length: k}, (_, x) => `<rect x="${x * 8 + 1}" y="${22 - (x + 1) * (20 / k)}" width="6" height="${(x + 1) * (20 / k)}" rx="1.5" class="${x <= i * (k - 1) / Math.max(1, n - 1) ? "isi" : ""}"/>`).join("")}</svg>`; };
// tinggi air dari keterangan opsi, cm atau m ("Sekitar 50 cm", "Sekitar 0,5 m", "Lebih dari 1,7 m"); gambar orang dewasa setinggi 170 cm
const tinggiAir = ket => { const m = /(sekitar|lebih dari) ([\d,.]+) ?(cm|m)\b/i.exec(ket || ""); if (!m) return null;
  const cm = Number(m[2].replace(",", ".")) * (m[3].toLowerCase() === "m" ? 100 : 1); return cm + (/lebih/i.test(m[1]) ? 20 : 0); };
const gambarAir = cm => { const y = 54 - Math.min(cm, 190) / 190 * 50;
  return `<svg viewBox="0 0 40 56" aria-hidden="true" class="lp-air"><circle cx="20" cy="9" r="5" class="lp-air-orang"/><path d="M13 18h14l-2 18h-3l-1 16h-2l-1-16h-3Z" class="lp-air-orang"/><path d="M0 ${y}q5-2 10 0t10 0 10 0 10 0V56H0Z" class="lp-air-air"/></svg>`; };
/* jumlah kolom yang membuat baris rata: 6 = 3+3, 8 = 4+4; sisa diletakkan di tengah lewat flex (pemilik 19 Nov 2026: "harus selalu simetris") */
const kolomSimetris = n => n <= 4 ? n : n % 3 === 0 ? 3 : n % 4 === 0 ? 4 : n % 5 === 0 ? 5 : Math.ceil(n / Math.ceil(n / 4));
function kartuPilihan(j) {
  const isi = kartu(j.minta || "pilihan", j.minta ? null : ((j.inti || j.balasan)?.match(/\*([^*]+)\*/)?.[1]?.replace(/\.$/, "") || (j.banyak ? "Pilih yang sesuai" : "Pilih salah satu")));
  // kalimat pertanyaan ikut tampil di kepala kartu, di bawah judul (pemilik 19 Nov 2026 "harusnya pertanyaan ini muncul di sini")
  const tanyaT = !j.minta && (j.inti || j.balasan || "").replace(/^\*[^*]+\*\s*/, "").split("\n").map(x => x.trim()).filter(Boolean)[0];
  if (tanyaT && tanyaT.length < 200) { const kp = isi.closest(".lp-langkah")?.querySelector(".lp-langkah-kepala"); kp?.classList.add("lp-kepala-tanya"); const jd = el("span", "lp-kepala-teks");
    const nodes = [...(kp?.childNodes || [])].filter(n => n.nodeType === 3); const judulT = nodes.map(n => n.textContent).join(""); nodes.forEach(n => n.remove());
    const sub = tanyaT.replace(/\*/g, ""), lk = sub.match(/^(.+?),\s*langkah (\d+) dari (\d+)\.?$/i);   // "Cerita kejadian, langkah 7 dari 8." jadi label (pemilik 25 Nov 2026)
    let bawah = el("small", null, sub);
    if (lk) { bawah = el("span", "lp-langkah-label"); const t = el("b", null, `${lk[2]}/${lk[3]}`), r = el("span", "lp-langkah-rantai"); r.setAttribute("aria-hidden", "true");
      t.setAttribute("aria-label", `langkah ${lk[2]} dari ${lk[3]}`);
      for (let x = 1; x <= Number(lk[3]); x++) r.append(el("i", x <= Number(lk[2]) ? "isi" : ""));
      // sebaris dengan judul, "Cerita kejadian" jadi "Kronologis", "4 dari 8" jadi "4/8" (pemilik 25 Nov 2026)
      bawah.append(el("span", "lp-langkah-nama", lk[1].replace(/^cerita kejadian$/i, "Kronologis")), t, r); jd.classList.add("sebaris"); }
    jd.append(el("b", null, judulT), bawah); kp?.querySelector("svg")?.after(jd); } // judul = judul pertanyaan, di baris mana pun
  if (j.minta === "jenis" && j.kunci) { // kartu bergambar
    const g = el("div", "lp-jenis");
    j.kunci.forEach((id, i) => {
      const b = el("button"); b.type = "button";
      if (GAMBAR[id]) b.style.backgroundImage = `url(/img/bencana-${GAMBAR[id]}.jpg)`; else { b.classList.add("tanpa-gambar"); if (ILUS_JENIS[id]) b.insertAdjacentHTML("afterbegin", ilustrasi(ILUS_JENIS[id])); }
      const ik = el("span", "lp-jenis-ikon"); ik.append(ikon(IKON_JENIS[id] || "i-kejadian")); b.append(ik);
      if (KREDIT[id]) b.append(el("span", "lp-kredit", KREDIT[id]));
      if (i < (j.saran || 0)) b.append(el("span", "saran", "Paling mirip"));
      b.append(el("b", null, j.pilihan[i]), el("small", null, j.ket?.[i] || ""));
      b.addEventListener("click", () => kirim({teks: String(i + 1), tampil: j.pilihan[i]}));
      g.append(b);
    });
    isi.closest(".lp-langkah").classList.add("lp-langkah-bebas"); // tanpa kontainer berkepala gelap (pemilik 19 Nov 2026)
    isi.append(g); return;
  }
  if (j.minta === "sub" && j.kunci?.[0]) { // karakteristik: ubin berikon jenis, "Tidak tahu" berikon tanya
    const d = el("div", "lp-opsi lp-opsi-ikon lp-simetris"), jid = j.kunci[0]; d.style.setProperty("--kol", kolomSimetris(j.pilihan.length));
    j.pilihan.forEach((o, i) => { const b = tombolOpsi(o, j.ket?.[i], () => kirim({teks: String(i + 1), tampil: o})); const u = el("span", "lp-opsi-ubin"); u.append(ikon(i === j.pilihan.length - 1 ? "i-bantuan" : ikonSub(o) || IKON_JENIS[jid] || "i-kejadian"));
      b.prepend(u); d.append(b); });
    isi.closest(".lp-langkah").classList.add("lp-langkah-bebas"); isi.append(d); return;
  }
  if (j.banyak) { // pilihan ganda berikon; "Lainnya" membuka kotak isian sendiri (pemilik 19 Nov 2026: "kasih icon", "ada lainnya")
    const dipilih = new Set(), d = el("div", "lp-opsi-bagian"), n = j.pilihan.length;
    // tiap bagian (Logistik, Peralatan, Lainnya) kisi simetris sendiri: 9 = 3x3, 2 = sejajar (pemilik 19 Nov 2026: "harus selalu simetris")
    const bagian = new Map(); j.pilihan.forEach((o, i) => { const g = j.grup?.[i] || ""; bagian.set(g, [...(bagian.get(g) || []), i]); });
    const kotak = new Map([...bagian].map(([g, idx]) => { const k = el("div", "lp-opsi lp-opsi-ikon lp-opsi-banyak lp-simetris"); k.style.setProperty("--kol", kolomSimetris(idx.length)); if (g) d.append(el("p", "lp-opsi-grup", g)); d.append(k); return [g, k]; }));
    const lain = el("input"); lain.type = "text"; lain.placeholder = "Tulis kebutuhan lain, misalnya genset atau popok"; lain.maxLength = 120;
    const lLain = el("label", "lp-isi lp-lain"); lLain.append("Kebutuhan lain", lain); lLain.hidden = true;
    // pilihan "tidak ada" dan sejenisnya meniadakan pilihan lain, dan sebaliknya (pemilik 19 Nov 2026: "masa bisa milih belum ada kebutuhan mendesak tapi bisa milih yang lain")
    const TUNGGAL = /^(Belum ada|Tidak ada|Tidak tahu|Semua masih)/i, tombol = [], asli = i => (j.pilihanAsli || j.pilihan)[i];   // aturan memakai label Indonesia, bukan terjemahan
    const segar = () => { tombol.forEach((t, k) => t.setAttribute("aria-pressed", String(dipilih.has(k)))); s.disabled = !dipilih.size;
      const iL = (j.pilihanAsli || j.pilihan).indexOf("Lainnya"); lLain.hidden = !(iL >= 0 && dipilih.has(iL)); };
    j.pilihan.forEach((o, i) => { const b = tombolOpsi(o, j.ket?.[i], () => {
        if (dipilih.has(i)) dipilih.delete(i);
        else { if (TUNGGAL.test(asli(i))) dipilih.clear(); else for (const k of [...dipilih]) if (TUNGGAL.test(asli(k))) dipilih.delete(k); dipilih.add(i); }
        segar(); if (asli(i) === "Lainnya" && !lLain.hidden) lain.focus(); }); tombol[i] = b;
      const u = el("span", "lp-opsi-ubin"); u.append(ikon(ikonKebutuhan(o, null) || ikonOpsi(o) || "i-kebutuhan"));   // pilihan ganda di luar soal kebutuhan memakai peta ikon umum (pemilik 25 Nov 2026) b.prepend(u); b.setAttribute("aria-pressed", "false");
      kotak.get(j.grup?.[i] || "").append(b); });
    const s = el("button", "lp-utama", "Simpan pilihan"); s.type = "button"; s.disabled = true;
    s.addEventListener("click", () => kirim({pilih: [...dipilih], lain: lain.value.trim(), tampil: [...dipilih].map(i => asli(i) === "Lainnya" && lain.value.trim() ? `Lainnya: ${lain.value.trim()}` : j.pilihan[i]).join(", ")}));
    isi.append(d, lLain, s); return;
  }
  if (j.pilihan.join("|") === "Kirim|Ubah|Batal") { // menu ringkasan: tiga aksi berbobot berbeda
    isi.closest(".lp-langkah").classList.add("lp-langkah-ringkas"); const kp = isi.closest(".lp-langkah").querySelector(".lp-langkah-kepala"); if (kp) { kp.replaceChildren(ikon("i-status"), "Periksa lalu kirim"); }
    const d = el("div", "lp-ringkas-aksi");
    for (const [i, t, ket, ik, kls] of [[0, "Kirim laporan", "Diterima BNPB, diteruskan ke BPBD setempat", "i-kirim", "utama"], [1, "Ubah isian", "Perbaiki yang belum tepat", "i-daftar", ""], [2, "Batal", "Laporan ini tidak dikirim", "i-tutup", "bahaya"]]) {
      const b = tombolOpsi(t, ket, () => kirim({teks: String(i + 1), tampil: j.pilihan[i]}), kls); const u = el("span", "lp-opsi-ubin"); u.append(ikon(ik)); b.prepend(u); d.append(b); }
    isi.append(d); return;
  }
  if (j.minta === "angka" || (j.minta !== "setuju" && j.pilihan.length === 1 && RE_LEWATI.test(j.pilihan[0]))) { isiTeksBebas(isi, j); return; }   // pertanyaan isian bebas: kotak ketik, Lewati hanya tautan kecil
  const dua = j.pilihan.length === 2 && !j.ket?.some(Boolean);
  const d = el("div", `lp-opsi${dua ? " dua" : ""}${j.minta === "setuju" ? "" : " lp-opsi-ikon lp-opsi-banyak"}`), n = j.pilihan.length;
  if (j.minta !== "setuju") { d.style.setProperty("--kol", kolomSimetris(n)); d.classList.add("lp-simetris"); if (kolomSimetris(n) >= 5) d.classList.add("lp-tegak"); } // lima sebaris: gambar di atas, teks di bawah supaya tidak terlipat
  j.pilihan.forEach((o, i) => { const b = tombolOpsi(o, j.ket?.[i], () => kirim({teks: String(i + 1), tampil: o}), i === 0 && j.minta === "setuju" ? "utama" : "");
    if (j.minta !== "setuju") { const u = el("span", "lp-opsi-ubin"), air = tinggiAir(j.ket?.[i]), ik = ikonOpsi(o);
      if (air != null) { u.classList.add("lp-ubin-air"); u.innerHTML = gambarAir(air); } else if (ik) u.append(ikon(ik)); else if (bertingkat(j.pilihan)) { u.classList.add("lp-ubin-tingkat"); u.innerHTML = gambarTingkat(i, j.pilihan.filter(x => !/tidak tahu/i.test(x)).length); } else u.append(ikon("i-daftar")); b.prepend(u); } // tinggi air bergambar, ikon bila cocok, selain itu nomor
    d.append(b); });
  isi.append(d);
  if (j.minta === "setuju") isi.append(Object.assign(el("a", "lp-catatan-kecil", "Baca kebijakan privasi"), {href: "/lapor/privasi.html", target: "_blank"}));
}

function kartuSetuju(j) {
  const isi = kartu("setuju"), atas = el("div", "lp-setuju"), m = el("div"); m.innerHTML = maskot("sapa");
  const ul = el("ul");
  for (const [ik, t] of [["i-pesan", "Percakapan, nomor WhatsApp, lokasi, dan foto Anda dicatat untuk penanganan bencana."],
    ["i-orang", "Hanya petugas BNPB dan BPBD yang menangani yang bisa membacanya."], ["i-status", "Data Anda tidak ditampilkan ke publik."]]) { const li = el("li"); li.append(ikon(ik), t); ul.append(li); }
  atas.append(m, ul);
  const d = el("div", "lp-opsi dua");
  j.pilihan.forEach((o, i) => d.append(tombolOpsi(o, null, () => kirim({teks: String(i + 1), tampil: o}), i === 0 ? "utama" : "")));
  const priv = el("button", "lp-catatan-kecil lp-tautan-polos", "Baca kebijakan privasi lengkap"); priv.type = "button"; priv.addEventListener("click", bukaPrivasi);
  isi.append(atas, d, priv);
}

/* lanjutAwal: dipanggil dari tanyaNomor sebelum nomor dikenal (K65). Kolom WhatsApp bisa diisi; isian disimpan di idAwal dan
   dikirim diam-diam saat mesin memintanya sesudah persetujuan (pemilik 20 Nov 2026: "tanya dulu warga atau BPBD terus namanya siapa"). */
let idAwal = null;
function kartuIdentitas(lanjutAwal = null) {
  const isi = kartu("identitas");
  let peran = "warga";
  const nama = el("input"); nama.type = "text"; nama.autocomplete = "name"; nama.maxLength = 80; nama.required = true; nama.placeholder = "Nama lengkap";
  const lNama = el("label", "lp-isi"); lNama.append("Nama", nama);
  const nomor = el("div", "lp-nomor-isi"); const ino = el("input"); ino.setAttribute("aria-label", "Nomor WhatsApp");
  if (lanjutAwal) { Object.assign(ino, {type: "tel", inputMode: "numeric", autocomplete: "tel-national", maxLength: 13, placeholder: "812 3456 7890"});
    ino.addEventListener("input", () => { let v = ino.value.replace(/\D/g, ""); if (v.startsWith("62")) v = v.slice(2); if (v.startsWith("0")) v = v.slice(1); ino.value = v.slice(0, 13); }); }
  else { ino.value = wa.slice(2); ino.readOnly = true; } nomor.append(el("span", "lp-awalan", "+62"), ino);
  const lWa = el("div", "lp-isi"); lWa.append("WhatsApp", nomor);
  const seg = el("div", "lp-segmen lp-peran"), bpbd = el("div", "lp-baris-isian"); bpbd.hidden = true;
  const kab = el("input"); kab.placeholder = "Kabupaten/kota"; kab.maxLength = 80; const jab = el("input"); jab.placeholder = "Jabatan"; jab.maxLength = 80;
  const lK = el("label", "lp-isi"); lK.append("BPBD", kab); const lJ = el("label", "lp-isi"); lJ.append("Jabatan", jab); bpbd.append(lK, lJ);
  for (const [k, t, ik, ket] of [["warga", "Warga", "i-orang", "Saya melihat atau mengalami kejadian"], ["bpbd", "Petugas BPBD", "i-status", "Saya melapor atas nama BPBD"]]) {
    const b = el("button"); b.type = "button"; const u = el("span", "lp-opsi-ubin"); u.append(ikon(ik)); const tx = el("span", "lp-peran-teks"); tx.append(el("b", null, t), el("small", null, ket)); const tanda = el("span", "lp-peran-tanda"); tanda.append(ikon("i-centang")); b.append(u, tx, tanda); b.setAttribute("aria-pressed", String(k === peran));
    b.addEventListener("click", () => { peran = k; seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); bpbd.hidden = k !== "bpbd"; });
    seg.append(b);
  }
  const lPeran = el("div", "lp-isi"); lPeran.append("Melapor sebagai", seg);
  const s = el("button", "lp-utama", "Lanjut"); s.type = "button"; s.append(ikon("i-panah"));
  isi.closest(".lp-langkah").classList.add("lp-langkah-id"); seg.classList.add("lp-peran");
  s.addEventListener("click", () => {
    if (nama.value.trim().length < 2) { nama.focus(); statusEl.textContent = "Tulis nama Anda."; return; }
    if (peran === "bpbd" && (kab.value.trim().length < 3 || jab.value.trim().length < 2)) { statusEl.textContent = "Petugas BPBD, isi kabupaten/kota dan jabatan Anda."; return; }
    const form = {nama: nama.value.trim(), peran, kab: kab.value.trim(), jabatan: jab.value.trim()}, tampil = `${form.nama}, ${peran === "bpbd" ? `Petugas BPBD ${form.kab}` : "warga"}`;
    if (!lanjutAwal) return kirim({form, tampil});
    if (!/^8\d{8,12}$/.test(ino.value)) { ino.focus(); statusEl.textContent = "Nomor WhatsApp dimulai dengan 8, misalnya 812 3456 7890."; return; }
    idAwal = form; wadah.replaceChildren(); tambah("saya", `${tampil}\n+62 ${ino.value}`, {simpanKe: false});
    mulai(`62${ino.value}`, {diChat: true}).then(lanjutAwal);
  });
  const baris = el("div", "lp-id-baris"); baris.append(lNama, lWa);
  isi.append(baris, lPeran, bpbd, s);
  nama.focus();
}

/* kartu lokasi bersama (chat lapor dan layar info): tombol GPS berupa ubin terang, lalu pencarian; galat tampil di dalam kartu
   (pemilik 19 Nov 2026: kepala gelap + tombol gelap selebar layar "aneh banget") */
function isiLokasi(wadahIsi, {judul, ket, pakaiPosisi, pilihCari, kabupatenCukup, terakhir}) {
  const kp = el("div", "lp-lok-kepala"), ik = el("span", "lp-lok-ikon"); ik.append(ikon("i-lokasi"));
  const tx = el("div"); tx.append(el("b", null, judul), el("small", null, ket)); kp.append(ik, tx);
  const gps = el("button", "lp-lok-gps"); gps.type = "button";
  const gIk = el("span", "lp-lok-gps-ikon"); gIk.append(ikon("i-lokasi"));
  const gTx = el("span", "lp-lok-gps-teks"), gB = el("b", null, "Pakai lokasi saat ini"), gS = el("small", null, "Paling cepat, lewat GPS perangkat");
  gTx.append(gB, gS); gps.append(gIk, gTx, ikon("i-panah"));
  const galat = el("p", "lp-lok-galat"); galat.hidden = true;
  gps.addEventListener("click", () => {
    galat.hidden = true; gps.disabled = true; gB.textContent = "Membaca lokasi"; gS.textContent = "Tunggu sebentar";
    bacaPosisi(p => pakaiPosisi(p), pesan => { gps.disabled = false; gB.textContent = "Coba lagi"; gS.textContent = "Pakai lokasi saat ini"; galat.textContent = pesan; galat.hidden = false; });
  });
  const cari = el("label", "lp-cari"), q = el("input"); q.type = "search"; q.placeholder = "Cari kab/kota, kecamatan, desa, atau nama jalan"; q.setAttribute("aria-label", "Cari tempat");
  cari.append(ikon("i-cari"), q);
  const hasil = el("ul", "lp-cari-hasil"); let tunda;
  q.addEventListener("input", () => {
    clearTimeout(tunda);
    if (q.value.trim().length < 3) { hasil.replaceChildren(); return; }
    tunda = setTimeout(async () => {
      try { await cariTempat(q.value.trim(), "", hasil, pilihCari, kabupatenCukup); }
      catch { hasil.replaceChildren(el("li", "lp-catatan-kecil", "Pencarian belum berhasil. Coba lagi.")); }
    }, 300);
  });
  const blok = el("div", "lp-lok"); blok.append(kp);
  if (terakhir) { const t = el("button", "lp-lok-gps terakhir"); t.type = "button"; const tI = el("span", "lp-lok-gps-ikon"); tI.append(ikon("i-centang"));
    const tT = el("span", "lp-lok-gps-teks"); tT.append(el("b", null, terakhir.judul), el("small", null, terakhir.ket ?? `Daerah terakhir, ${terakhir.sub}`)); t.append(tI, tT, ikon("i-panah"));
    t.addEventListener("click", terakhir.aksi); blok.append(t); }
  const baris = el("div", "lp-lok-baris"); baris.append(gps, el("p", "lp-atau", "atau"), cari); // GPS, atau, cari: satu baris tetap
  blok.append(baris, galat, hasil);
  wadahIsi.append(blok);
}
/* GPS: akurasi tinggi dulu, bila gagal coba sekali lagi dengan akurasi biasa (laptop tanpa GPS sering gagal di mode tinggi) */
function bacaPosisi(ok, gagal) {
  if (!("geolocation" in navigator)) return gagal("Peramban ini tidak bisa membaca lokasi. Cari nama tempat di bawah.");
  /* tiga sebab dibedakan (pemilik 24 Nov 2026: "padahal udah diizinkan kenapa ga bisa?"): izin situs di peramban sudah ada tapi sistem operasi belum memberi
     izin lokasi ke aplikasi perambannya memberi kode 2, bukan 1 */
  const mac = /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints < 2, hp = /Android|iPhone|iPad/.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
  const pesan = e => e.code === 1 ? "Izin lokasi untuk situs ini ditolak. Izinkan lokasi lewat ikon di kolom alamat peramban, lalu tekan Coba lagi."
    : e.code === 3 ? "Lokasi terlalu lama terbaca. Pindah ke tempat terbuka atau dekat jendela, lalu tekan Coba lagi. Atau cari nama tempat di bawah."
    : mac ? "Peramban sudah diizinkan, tapi Mac belum memberi izin lokasi ke aplikasi peramban ini. Buka Pengaturan Sistem, Privasi dan Keamanan, Layanan Lokasi, nyalakan untuk peramban ini, lalu buka ulang perambannya. Atau cari nama tempat di bawah."
    : hp ? "Lokasi belum terbaca. Nyalakan GPS atau Lokasi di HP, lalu tekan Coba lagi. Atau cari nama tempat di bawah."
    : "Lokasi belum terbaca. Nyalakan layanan lokasi di pengaturan perangkat untuk peramban ini, lalu tekan Coba lagi. Atau cari nama tempat di bawah.";
  navigator.geolocation.getCurrentPosition(ok, e => {
    if (e.code === 1) return gagal(pesan(e));
    navigator.geolocation.getCurrentPosition(ok, e2 => gagal(pesan(e2)), {enableHighAccuracy: false, maximumAge: 300000, timeout: 15000});
  }, {enableHighAccuracy: true, maximumAge: 0, timeout: 12000});
}
function kartuLokasi() {
  const isi = kartu("lokasi"); isi.closest(".lp-langkah").classList.add("lp-langkah-lok");
  isiLokasi(isi, {judul: "Di mana kejadiannya?", ket: "Paling tepat bila Anda sedang di lokasi kejadian.",
    pakaiPosisi: p => kirim({lokasi: {lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy, sumber: "gps"}, tampil: `Lokasi saat ini, akurasi ${Math.round(p.coords.accuracy).toLocaleString("id-ID")} m`}),
    pilihCari: d => kirim({lokasi: {kode: d.kode}, tampil: `${d.judul}, ${d.sub.split(",")[0]}`}), kabupatenCukup: false,
    terakhir: POSTER ? {judul: "Desa dari poster yang Anda pindai", ket: "Pakai bila kejadiannya di desa ini", aksi: () => kirim({lokasi: {kode: POSTER, poster: true}, tampil: "Lokasi dari poster desa"})} : null});
}
/* poster QR desa (K92, D131): /lapor/?d=<kode desa> menawarkan desa itu di kartu lokasi; pelapor tetap memilih sendiri, desa yang terbaca tampil
   di pesan berikutnya dan bisa dibatalkan dengan Kembali. Kode disimpan per tab supaya bertahan sampai kartu lokasi muncul. */
const POSTER = (() => { const k = s => { const d = String(s || "").replace(/\D/g, ""); return d.length === 10 ? `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}.${d.slice(6)}` : null; };
  let x = k(new URLSearchParams(location.search).get("d"));
  try { if (x) sessionStorage.setItem("lapor-poster", x); else x = k(sessionStorage.getItem("lapor-poster")); } catch {}
  return x; })();

/* hasil pencarian tempat: kab/kota dan kecamatan di atas; memilihnya mempersempit daftar desa di dalamnya (laporan butuh desa),
   atau langsung dipakai bila kabupatenCukup (info dan prediksi per kab/kota) */
async function cariTempat(q, dalam, wadahHasil, pilihDesa, kabupatenCukup) {
  const j = await (await fetch(`/api/lapor/cari?wa=${encodeURIComponent(wa || "")}&q=${encodeURIComponent(q)}&dalam=${encodeURIComponent(dalam)}`, {signal: AbortSignal.timeout(10000)})).json();
  const label = {kab: "Kab/kota", kec: "Kecamatan", desa: "Desa/kel."}, ik = {kab: "i-daftar", kec: "i-lokasi", desa: "i-rumah"};
  // daftar satu kolom: ubin ikon per tingkat, nama dengan bagian yang cocok ditebalkan, panah (pemilik 19 Nov 2026: "bagusin lagi")
  const sorot = t => { const n = t.replace(/^(Desa\/Kel\.|Kecamatan|Kelurahan|Desa)\s+/i, ""), i = q ? n.toLowerCase().indexOf(q.toLowerCase()) : -1, b = el("b");
    if (i < 0) b.append(n); else b.append(n.slice(0, i), el("mark", null, n.slice(i, i + q.length)), n.slice(i + q.length)); return b; };
  const isi = (j.hasil || []).map(d => { const li = el("li"), b = el("button", `lp-hasil ${d.tingkat}`); b.type = "button";
    const u = el("span", "lp-hasil-ikon"); u.append(ikon(ik[d.tingkat]));
    const tx = el("span", "lp-hasil-teks"), atas = el("span", "lp-hasil-atas"); atas.append(sorot(d.judul), el("span", `lp-pil lp-tingkat ${d.tingkat}`, label[d.tingkat]));
    // sub "Kec. X, Kab Y, Provinsi": baris kedua kecamatan dan kab/kota, provinsi jadi label di kanan supaya nama yang sama mudah dibedakan
    const bag = String(d.sub || "").split(", "), prov = bag.length > 1 ? bag.pop() : "";
    tx.append(atas, el("small", null, bag.join(", "))); b.append(u, tx); if (prov) b.append(el("span", "lp-hasil-prov", prov)); b.append(ikon("i-panah"));
    b.addEventListener("click", () => d.tingkat === "desa" || kabupatenCukup ? pilihDesa(d) : cariTempat("", d.kode, wadahHasil, pilihDesa, false).then(() => {
      const k = el("li", "lp-hasil-kepala"), kb = el("button", "lp-teks-tombol"); kb.type = "button"; kb.append(ikon("i-kembali"), "Kembali");
      kb.addEventListener("click", () => cariTempat(q, dalam, wadahHasil, pilihDesa, kabupatenCukup)); k.append(el("span", null, `Pilih desa atau kelurahan di ${d.judul}`), kb); wadahHasil.prepend(k); }));
    li.append(b); return li; });
  // di dalam kab/kec: desa dikelompokkan per kecamatan, tiap desa jadi tombol ringkas (pemilik 19 Nov 2026: "bagusin")
  if (dalam && (j.hasil || []).length && j.hasil.every(d => d.tingkat === "desa")) {
    const per = new Map(); for (const d of j.hasil) { const kec = String(d.sub || "").split(", ")[0].replace(/^Kec\. /, ""); per.set(kec, [...(per.get(kec) || []), d]); }
    const grup = [...per].map(([kec, ds]) => { const li = el("li", "lp-hasil-kec"), h = el("b"); h.append(ikon("i-lokasi"), `Kec. ${kec}`, el("small", null, `${ds.length} desa/kel.`));
      const w = el("div", "lp-hasil-chip"); for (const d of ds) { const b = el("button", null, d.judul.replace(/^(Desa\/Kel\.|Desa|Kelurahan)\s+/i, "")); b.type = "button"; b.addEventListener("click", () => pilihDesa(d)); w.append(b); }
      li.append(h, w); return li; });
    // saring desa di dalam daftar: ketik sebagian nama, tombol yang tidak cocok disembunyikan
    const sar = el("li", "lp-hasil-saring"), lab = el("label", "lp-cari"), q = el("input"); q.type = "search"; q.placeholder = `Cari desa atau kelurahan (${j.hasil.length})`; q.setAttribute("aria-label", "Cari desa");
    lab.append(ikon("i-cari"), q); sar.append(lab);
    q.addEventListener("input", () => { const t = q.value.trim().toLowerCase();
      for (const g of grup) { let ada = 0; for (const b of g.querySelectorAll("button")) { const c = !t || b.textContent.toLowerCase().includes(t); b.hidden = !c; ada += c; } g.hidden = !ada; } });
    wadahHasil.replaceChildren(sar, ...grup); wadahHasil.classList.add("berkelompok"); q.focus(); return;
  }
  wadahHasil.classList.remove("berkelompok");
  wadahHasil.replaceChildren(...isi);
  if (dalam && isi.length > 1) { // di dalam kab: kolom saring sampai ujung di atas daftar (pemilik 19 Nov 2026: "di atasnya agar ada search barnya juga")
    const sar = el("li", "lp-hasil-saring"), lab = el("label", "lp-cari"), qi = el("input"); qi.type = "search"; qi.placeholder = `Cari kecamatan atau desa (${isi.length})`; qi.setAttribute("aria-label", "Saring daftar");
    lab.append(ikon("i-cari"), qi); sar.append(lab); wadahHasil.prepend(sar);
    qi.addEventListener("input", () => { const t = qi.value.trim().toLowerCase(); for (const li of isi) li.hidden = !!t && !li.textContent.toLowerCase().includes(t); });
  }
  if (!isi.length) wadahHasil.replaceChildren(el("li", "lp-catatan-kecil", "Tidak ditemukan. Coba nama kabupaten/kota, kecamatan, desa, atau jalan."));
}

const IKON_ISIAN = {terdampak_kk: "i-orang", terdampak_jiwa: "i-korban", meninggal: "i-korban", hilang: "i-cari", luka: "i-plus", luka_inap: "i-fasilitas", mengungsi_jiwa: "i-pengungsian", mengungsi_kk: "i-orang",
  rumah_berat: "i-rumah", rumah_sedang: "i-rumah", rumah_ringan: "i-rumah", rumah_terendam: "b-banjir", fasilitas_sekolah: "i-fasilitas", fasilitas_kesehatan: "i-plus",
  fasilitas_ibadah: "i-fasilitas", jalan_jembatan: "i-lokasi", luas_terbakar: "b-api", kedalaman_genangan: "b-banjir", tebal_abu: "b-gunung"};
function kartuAngka(j) {
  const f = j.form, judul = (j.inti || j.balasan)?.match(/\*([^*]+)\*/)?.[1]?.replace(/\.$/, "") || "Isi data"; // judul pertanyaan di baris mana pun
  const TINGKAT_RUSAK = {rumah_berat: "berat", rumah_sedang: "sedang", rumah_ringan: "ringan"};
  const isi = kartu("angka", judul); wadah.querySelector(".lp-langkah-kepala").prepend(ikon("i-korban"));
  wadah.querySelector(".lp-langkah-kepala svg + svg")?.remove();
  const daftar = el("div", "lp-angka"), nilai = {};
  for (const x of f.isian) {
    const baris = el("div", "lp-angka-baris"), p = el("div", "lp-penambah");
    const inp = el("input"); inp.type = "text"; inp.inputMode = "numeric"; inp.placeholder = "?"; inp.setAttribute("aria-label", x.label);
    const kurang = el("button"); kurang.type = "button"; kurang.append(ikon("i-kurang")); kurang.setAttribute("aria-label", `Kurangi ${x.label}`);
    const tambahB = el("button", "plus"); tambahB.type = "button"; tambahB.append(ikon("i-plus")); tambahB.setAttribute("aria-label", `Tambah ${x.label}`);
    const set = v => { inp.value = v === "" ? "" : String(Math.max(0, Math.min(x.maks || 1e6, v))); nilai[x.nama] = inp.value; };
    kurang.addEventListener("click", () => set(inp.value === "" ? 0 : Number(inp.value) - 1));
    tambahB.addEventListener("click", () => set(inp.value === "" ? 1 : Number(inp.value) + 1));
    inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 7); nilai[x.nama] = inp.value; });
    if (x.nilai != null) set(x.nilai); // sudah tertangkap dari cerita
    p.append(kurang, inp, tambahB);
    // baris: ikon isian, judul dan definisi, penambah; baris yang sudah terisi diberi tanda (pemilik 19 Nov 2026: "kasih icon, bagusin")
    const u = el("span", "lp-angka-ikon"); u.append(ikon(IKON_ISIAN[x.nama] || "i-daftar"));
    const tx = el("span", "lp-angka-teks"); const atas = el("span", "lp-angka-atas"); atas.append(el("b", null, x.label), ...(x.satuan ? [el("span", "lp-angka-satuan", x.satuan)] : [])); // satuan sebaris dengan judul
    tx.append(atas, ...(x.ket ? [el("small", null, x.ket)] : []));
    if (TINGKAT_RUSAK[x.nama]) u.classList.add(`rusak-${TINGKAT_RUSAK[x.nama]}`); // warna tingkat kerusakan
    baris.append(u, tx, p);
    const tandai = () => baris.classList.toggle("terisi", inp.value !== ""); inp.addEventListener("input", tandai); kurang.addEventListener("click", tandai); tambahB.addEventListener("click", tandai); tandai();
    daftar.append(baris);
  }
  const aksi = el("div", "lp-aksi-dua");
  const nol = el("button", "lp-kedua", f.kosong || "Tidak ada"); nol.type = "button";
  nol.addEventListener("click", () => kirim({form: {kosong: true}, tampil: f.kosong || "Tidak ada"}));
  const s = el("button", "lp-utama", f.kirim || "Simpan"); s.type = "button";
  s.addEventListener("click", () => {
    const ringkas = f.isian.map(x => `${x.label} ${nilai[x.nama] === "" || nilai[x.nama] == null ? "belum tahu" : nilai[x.nama]}`).join(", ");
    kirim({form: Object.fromEntries(f.isian.map(x => [x.nama, nilai[x.nama] ?? ""])), tampil: ringkas});
  });
  aksi.append(nol, s);
  const n = f.isian.length; daftar.style.setProperty("--kol", n === 4 ? 2 : Math.min(n, 3)); // kolom sesuai jumlah isian: tanpa sel kosong
  isi.closest(".lp-langkah").classList.add("lp-langkah-angka", n === 1 ? "satu" : "banyak"); // satu isian: kartu ringkas, tombol sebaris
  isi.append(daftar, el("p", "lp-catatan-kecil", "Biarkan ? bila belum tahu."), aksi);
}

function kartuWaktu(j) {
  const isi = kartu("waktu", j.form.judul || "Waktu kejadian"); wadah.querySelector(".lp-langkah-kepala").prepend(ikon("i-kalender"));   // judul dari mesin: kartu yang sama dipakai "Kapan terakhir terlihat" (pemilik 26 Nov 2026)
  // tanggal dan jam dihitung di zona lokasi kejadian, bukan zona perangkat; zona tertulis di label (pemilik 19 Nov 2026)
  const zona = j.form.zona || "WIB", geser = j.form.geser ?? 7;
  const hari = el("div", "lp-hari"), kini = new Date(Date.now() + geser * 3600e3 + new Date().getTimezoneOffset() * 6e4);
  let tanggal = j.form.isian[0].nilai, jam = "";
  const tgl = el("input"); tgl.type = "date"; tgl.max = tanggal; tgl.min = new Date(Date.now() - (j.form.minHari || 30) * 864e5).toISOString().slice(0, 10); tgl.value = tanggal;
  for (let n = 0; n < 7; n++) {
    const d = new Date(kini - n * 864e5), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const b = el("button", null, n === 0 ? "Hari ini" : n === 1 ? "Kemarin" : `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`); b.type = "button";
    b.setAttribute("aria-pressed", String(n === 0));
    b.addEventListener("click", () => { tanggal = iso; tgl.value = iso; hari.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    hari.append(b);
  }
  const lain = el("button", null, "Tanggal lain"); lain.type = "button"; lain.setAttribute("aria-pressed", "false");
  lain.addEventListener("click", () => { lTgl.hidden = false; tgl.showPicker?.(); }); hari.append(lain);
  tgl.addEventListener("change", () => { tanggal = tgl.value; hari.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === lain))); });
  const lTgl = el("label", "lp-isi"); lTgl.append("Tanggal", tgl); lTgl.hidden = true;
  const jm = el("input"); jm.type = "time"; jm.required = true; jm.addEventListener("input", () => { jam = jm.value; });
  const sek = el("button", "lp-jam-sekarang"); sek.type = "button"; sek.append(ikon("i-kalender"), "Pakai jam sekarang");
  sek.addEventListener("click", () => { jam = `${String(kini.getHours()).padStart(2, "0")}:${String(kini.getMinutes()).padStart(2, "0")}`; jm.value = jam; });
  const bJam = el("span", "lp-jam-baris"); bJam.append(jm, sek, el("span", "lp-zona", zona)); // tombol jam sekarang di dalam bar jam
  const lJam = el("div", "lp-isi"); lJam.append(`Jam, waktu setempat (${zona})`, bJam);
  const s = el("button", "lp-utama", j.form.kirim || "Simpan waktu"); s.type = "button"; if (j.form.jamOpsional) lJam.firstChild.textContent = `Jam bila ingat (${zona})`;
  s.addEventListener("click", () => { if (!jam && j.form.jamOpsional) { kirim({form: {tanggal, jam: ""}, tampil: tanggal.split("-").reverse().join("/")}); return; } if (!jam) { jm.focus(); statusEl.textContent = "Isi jam kejadian. Perkiraan juga boleh."; return; } kirim({form: {tanggal, jam}, tampil: `${tanggal.split("-").reverse().join("/")}, ${jam.replace(":", ".")} ${zona}`}); });
  isi.append(hari, lTgl, lJam, s);
}

function kartuRtRw(j) {
  const isi = kartu("rtrw", "RT dan RW"); wadah.querySelector(".lp-langkah-kepala").prepend(ikon("i-rumah"));
  const baris = el("div", "lp-baris-isian"), nilai = {};
  for (const x of j.form.isian) { const i = el("input"); i.inputMode = "numeric"; i.maxLength = 3; i.placeholder = "000"; i.addEventListener("input", () => { i.value = i.value.replace(/\D/g, ""); nilai[x.nama] = i.value; });
    const l = el("label", "lp-isi"); l.append(x.label, i); baris.append(l); }
  const aksi = el("div", "lp-aksi-dua");
  const tt = el("button", "lp-kedua", "Tidak tahu"); tt.type = "button"; tt.addEventListener("click", () => kirim({form: {kosong: true}, tampil: "Tidak tahu RT dan RW"}));
  const s = el("button", "lp-utama", "Simpan"); s.type = "button";
  s.addEventListener("click", () => { if (!nilai.rt || !nilai.rw) { statusEl.textContent = "Isi RT dan RW, atau pilih Tidak tahu."; return; } kirim({form: {rt: nilai.rt, rw: nilai.rw}, tampil: `RT ${nilai.rt}, RW ${nilai.rw}`}); });
  aksi.append(tt, s); baris.append(aksi); isi.append(baris); isi.closest(".lp-langkah").classList.add("lp-langkah-rtrw"); // satu baris: RT, RW, tombol (pemilik 19 Nov 2026: "agar sebaris")
}

/* titik pengungsian: tempat di sekitar lokasi kejadian dari OpenStreetMap, bisa pilih beberapa, ditambah tempat lain yang diketik (pemilik 19 Nov 2026) */
// jenis pemilih: titik pengungsian, atau nama fasilitas rusak (sekolah, faskes, ibadah, jalan) dengan daftar tempat di sekitar lokasi
const PEMILIH = {tempat: ["Titik pengungsian", "Cari masjid, sekolah, balai desa di sekitar lokasi", "Titik pengungsian", "pengungsian", "Simpan titik pengungsian", "i-pengungsian"],
  "tempat:sekolah": ["Sekolah yang rusak", "Cari nama sekolah, misalnya SD Negeri", "Nama sekolah rusak", "sekolah", "Simpan sekolah", "i-fasilitas"],
  "tempat:faskes": ["Fasilitas kesehatan yang rusak", "Cari puskesmas, klinik, atau rumah sakit", "Nama fasilitas kesehatan rusak", "faskes", "Simpan fasilitas kesehatan", "i-plus"],
  "tempat:ibadah": ["Tempat ibadah yang rusak", "Cari masjid, musala, gereja, pura, vihara", "Nama tempat ibadah rusak", "ibadah", "Simpan tempat ibadah", "i-fasilitas"],
  "tempat:jalan": ["Jalan atau jembatan yang rusak", "Cari nama jalan atau jembatan", "Jalan atau jembatan rusak", "jalan", "Simpan jalan atau jembatan", "i-lokasi"]};
function kartuTempat(j = {}) {
  const [judul, petunjuk, awalan, jenisT, simpanT, ikonT] = PEMILIH[j.minta] || PEMILIH.tempat;
  const isi = kartu("tempat", judul); isi.closest(".lp-langkah").classList.add("lp-langkah-tempat");
  const kp = isi.closest(".lp-langkah")?.querySelector(".lp-langkah-kepala svg use"); if (kp) kp.setAttribute("href", `#${ikonT}`);
  const dipilih = new Map(), cari = el("label", "lp-cari"), q = el("input"); q.type = "search"; q.placeholder = petunjuk; q.setAttribute("aria-label", judul);
  cari.append(ikon("i-cari"), q);
  const daftar = el("div", "lp-tempat-kisi"), pilihan = el("div", "lp-tempat-pilihan"), lain = el("input"); lain.type = "text"; lain.placeholder = "Tempat lain yang tidak ada di daftar, misalnya tenda di lapangan desa"; lain.maxLength = 80;
  const lLain = el("label", "lp-isi"); lLain.append(jenisT === "pengungsian" ? "Tempat lain" : "Tidak ada di daftar? Tulis namanya", lain); if (jenisT !== "pengungsian") lain.placeholder = "Nama yang tidak ada di daftar";
  const s = el("button", "lp-utama"); s.type = "button"; s.append(ikon("i-centang"), simpanT);
  for (const n of j.sudah || []) dipilih.set(n, {nama: n});   // tambah nama: pilihan sebelumnya tetap tercentang (pemilik 25 Nov 2026)
  // tempat yang tidak ada di daftar wajib beralamat (pemilik 25 Nov 2026: "kalau tidak ada di daftar tulis alamatnya")
  const alamat = el("input"); alamat.type = "text"; alamat.maxLength = 120; alamat.placeholder = "Alamat atau nama jalan, misalnya Jl. Merdeka No. 5, RT 02";
  const lAlamat = el("label", "lp-isi"); lAlamat.append("Alamatnya", alamat); lAlamat.hidden = true;
  lain.addEventListener("input", () => { lAlamat.hidden = !lain.value.trim(); });
  const segarPilihan = () => { pilihan.replaceChildren(...[...dipilih.keys()].map(n => { const c = el("button", "lp-tempat-chip"); c.type = "button"; c.append(n, ikon("i-tutup")); c.addEventListener("click", () => { dipilih.delete(n); segarPilihan(); gambarDaftar(q.value.trim()); }); return c; }));
    pilihan.hidden = !dipilih.size; };
  let ulangTempat = 0;
  // teks yang diketik di pencarian bisa langsung dicatat sebagai nama (pemilik 20 Nov 2026: "ketika tidak ada di pilihan kenapa ga bisa diinput")
  const tambahKetik = (t, ada = []) => { const v = String(t || "").trim();
    if (v.length < 3 || ada.some(x => x.nama.toLowerCase() === v.toLowerCase()) || dipilih.has(v)) return [];
    const b = el("button", "lp-tempat lp-tempat-ketik"); b.type = "button"; const ic = el("span", "lp-tempat-ikon"); ic.append(ikon("i-plus"));
    const tx = el("span"); tx.append(el("b", null, `Catat "${v}"`), el("small", null, "Nama yang Anda ketik, tidak ada di daftar")); b.append(ic, tx);
    b.addEventListener("click", () => { dipilih.set(v, {nama: v}); q.value = ""; segarPilihan(); gambarDaftar(""); }); return [b]; };
  /* daftar diambil sekali, disaring di perangkat tiap huruf diketik (pemilik 21 Nov 2026: "gw ketik sd kenapa yang lain ga langsung berubah, harusnya gausah di enter").
     Nama yang memuat semua kata menang; sebutan umum ("sd" = sekolah) hanya dipakai bila tidak ada nama yang cocok. */
  let semuaTempat = null, sebagian = false;
  const SEBUT_T = {"Kantor atau balai": "balai desa kantor kelurahan aula", "Balai warga": "balai warga aula gedung serbaguna", "Rumah ibadah": "masjid musala mushola surau gereja pura vihara klenteng",
    "Sekolah": "sekolah sd smp sma smk madrasah", "Titik kumpul": "titik kumpul lapangan evakuasi", "Puskesmas": "puskesmas faskes", "Rumah sakit": "rs rsud rumah sakit faskes", "Klinik": "klinik faskes", "Jalan": "jalan jl", "Jembatan": "jembatan", "Shelter": "shelter tempat evakuasi"};
  const UMUM_T = new Set(["rusak", "roboh", "putus", "ambruk", "terendam", "yang", "di", "dan", "atau", "dekat", "sekitar", "kena", "terdampak"]);
  const saring = t => { const kata = String(t || "").toLowerCase().split(/\s+/).filter(k => k && !UMUM_T.has(k)); if (!kata.length) return {tempat: semuaTempat};
    const ada = (h, k) => h.split(/[^\p{L}\p{N}]+/u).some(w => w.startsWith(k));   // awal kata: "sd" cocok "SD Negeri", tidak cocok "TK Bustanul"
    const nama = semuaTempat.filter(x => kata.every(k => ada(x.nama.toLowerCase(), k)));
    if (nama.length) return {tempat: nama};
    const luas = semuaTempat.filter(x => { const h = `${x.nama} ${x.jenis} ${SEBUT_T[x.jenis] || ""}`.toLowerCase(); return kata.every(k => ada(h, k)); });
    return luas.length ? {tempat: luas} : {tempat: semuaTempat.slice(0, 12), terdekat: true}; };
  const gambarDaftar = t => {
    if (!semuaTempat) return;
    const j = saring(t);
    if (!j.tempat.length) return daftar.replaceChildren(...tambahKetik(t), el("p", "lp-redup lp-kecil", sebagian && ulangTempat < 3 ? "Mengambil daftar dari OpenStreetMap. Boleh langsung tulis namanya di kolom pencarian atau kolom bawah."
      : sebagian ? "Daftar dari OpenStreetMap sedang tidak bisa diambil. Tulis namanya di kolom bawah." : "Tidak ada tempat seperti ini tercatat di OpenStreetMap dalam 3 km dari lokasi. Tulis namanya di kolom bawah."));
    const kisi = j.tempat.slice(0, 40).map(x => { const b = el("button", "lp-tempat"); b.type = "button"; b.setAttribute("aria-pressed", String(dipilih.has(x.nama)));
      const ic = el("span", "lp-tempat-ikon"); ic.append(ikon(/ibadah|sekolah/i.test(x.jenis) ? "i-fasilitas" : /puskesmas|klinik|sakit/i.test(x.jenis) ? "i-plus" : /jalan|jembatan/i.test(x.jenis) ? "i-lokasi" : "i-rumah"));
      const tx = el("span"); tx.append(el("b", null, x.nama), el("small", null, `${x.jenis}, ${x.jarakKm.toLocaleString("id-ID")} km`)); b.append(ic, tx);
      b.addEventListener("click", () => { dipilih.has(x.nama) ? dipilih.delete(x.nama) : dipilih.set(x.nama, x); b.setAttribute("aria-pressed", String(dipilih.has(x.nama))); segarPilihan(); });
      return b; });
    daftar.replaceChildren(...tambahKetik(t, j.tempat), ...(j.terdekat ? [el("p", "lp-tempat-catatan", `Tidak ada nama yang cocok dengan "${t}". Ini tempat terdekat dari lokasi kejadian.`)] : []), ...kisi);
  };
  const muat = async () => {
    if (!semuaTempat) daftar.replaceChildren(el("p", "lp-redup lp-kecil", "Mencari tempat di sekitar lokasi..."));
    try { const j = await (await fetch(`/api/lapor/sekitar?wa=${encodeURIComponent(wa)}&jenis=${jenisT}&semua=1`, {signal: AbortSignal.timeout(15000)})).json();
      // daftar rumah ibadah dan balai warga menyusul dari OpenStreetMap daring yang kadang penuh: coba lagi sampai tiga kali,
      // dan selama belum lengkap jangan pernah bilang "tidak ada" (pemilik 19 Nov 2026 "kenapa ga ada")
      semuaTempat = j.tempat || []; sebagian = !!j.sebagian;
      if (sebagian && ulangTempat < 3) { ulangTempat++; setTimeout(muat, 4000); }
      gambarDaftar(q.value.trim());
    } catch { if (!semuaTempat) daftar.replaceChildren(el("p", "lp-redup lp-kecil", "Daftar tempat belum bisa dimuat. Tulis di kolom Tempat lain.")); }
  };
  q.addEventListener("input", () => gambarDaftar(q.value.trim()));
  s.addEventListener("click", () => { const ketik = !dipilih.size && !lain.value.trim() && q.value.trim().length >= 3 ? [q.value.trim()] : [];   // hanya mengetik di pencarian = itu namanya
    if (lain.value.trim() && alamat.value.trim().length < 5) { statusEl.textContent = "Tulis alamat tempat lain itu, misalnya nama jalan atau RT."; alamat.focus(); return; }
    const semua = [...dipilih.keys(), ...(lain.value.trim() ? [`${lain.value.trim()} (${alamat.value.trim()})`] : []), ...ketik];
    if (!semua.length) { statusEl.textContent = "Pilih atau tulis setidaknya satu tempat."; return; }
    kirim({teks: `${awalan}:\n${semua.map((n, i) => `${i + 1}. ${n}`).join("\n")}`, tampil: `${awalan}: ${semua.join(", ")}`}); });
  const tt = el("button", "lp-kedua", "Belum tahu"); tt.type = "button"; tt.addEventListener("click", () => kirim({teks: "belum tahu", tampil: `Belum tahu ${awalan.toLowerCase()}`}));
  const aksi = el("div", "lp-aksi-dua"); aksi.append(tt, s); pilihan.hidden = true;
  isi.append(cari, pilihan, daftar, lLain, lAlamat, aksi); segarPilihan(); muat();
}

function kartuFoto(j) {
  const isi = kartu("foto");
  const kisi = el("div", "lp-foto-kisi");
  // standar foto publik (pola /instansi dan /lacak): cap waktu setempat dan koordinat di atas foto, sumber waktu, tautan peta, paling banyak 10 foto
  const daftarFoto = cache.fotoSesi || [], MAKS = 10;
  for (const f of daftarFoto) {
    const fig = el("figure", `lp-foto ${f.lat != null ? "ada-titik" : "tanpa-titik"}`), im = el("img"); im.src = f.src; im.alt = `${f.jenis === "video" ? "Video" : "Foto"} kejadian, ${f.waktuTeks || ""}`;
    const cap = el("figcaption", "lp-foto-cap");
    const w = el("span"); w.append(ikon("i-kalender"), f.waktuTeks || "Waktu tidak terbaca"); cap.append(w);
    const t = el("span"); t.append(ikon("i-lokasi"), f.lat != null ? `${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}` : "Tanpa lokasi"); cap.append(t);
    const ket = el("div", "lp-foto-ket"); ket.append(el("span", `lp-pil ${f.lat != null ? "selesai" : "ditelaah"}`, f.lencanaTeks || f.lencana || ""), el("small", null, f.sumberWaktu || ""));
    if (f.lat != null) { const a = Object.assign(el("a", "lp-teks-tombol"), {href: `https://www.google.com/maps?q=${f.lat},${f.lon}`, target: "_blank", rel: "noopener"}); a.append(ikon("i-lokasi"), "Lihat di peta"); ket.append(a); }
    const g = el("div", "lp-foto-gambar"); g.append(im, cap);
    if (f.jenis === "video") { const v = el("span", "lp-foto-video"); v.append(ikon("i-putar"), f.durasi != null ? `${f.durasi} detik` : "Video"); g.append(v); }
    fig.append(g, ket); kisi.append(fig);
  }
  const nVideo = daftarFoto.filter(f => f.jenis === "video").length, nFoto = daftarFoto.length - nVideo;
  const hitung = el("p", "lp-foto-hitung"); hitung.append(ikon("i-kamera"), `${nFoto} dari ${MAKS} foto, ${nVideo} dari ${VIDEO_MAKS_N} video`, el("small", null, "Ambil langsung dari kamera supaya waktu dan lokasinya terekam. Video paling lama 60 detik."));
  const masukan = el("input"); masukan.type = "file"; masukan.accept = "image/jpeg,image/*"; masukan.capture = "environment"; masukan.hidden = true;
  const rekam = el("input"); rekam.type = "file"; rekam.accept = "video/*"; rekam.capture = "environment"; rekam.hidden = true;   // video (K57)
  const ambil = el("button", "lp-utama"); ambil.type = "button"; ambil.append(ikon("i-kamera"), "Ambil foto");
  const ambilV = el("button", "lp-kedua"); ambilV.type = "button"; ambilV.append(ikon("i-putar"), "Rekam video");
  ambil.addEventListener("click", () => { siapkanGps(); masukan.click(); });
  ambilV.addEventListener("click", () => { siapkanGps(); rekam.click(); });
  // hanya rekaman yang baru diambil: berkas lebih tua dari 5 menit (dari galeri) atau tanpa data kamera (tangkapan layar) ditolak
  const pilihBerkas = async f => { if (!f) return; const salah = await bukanKamera(f); if (salah) { statusEl.textContent = salah; return; } f.type.startsWith("video/") ? unggahVideo(f) : unggahFoto(f); };
  masukan.addEventListener("change", () => pilihBerkas(masukan.files[0]));
  rekam.addEventListener("change", () => pilihBerkas(rekam.files[0]));
  const lanjut = el("div", "lp-opsi"); j.pilihan.forEach((o, i) => lanjut.append(tombolOpsi(o, j.ket?.[i], () => kirim({teks: String(i + 1), tampil: o}))));
  if (nFoto >= MAKS) ambil.disabled = true;
  if (nVideo >= VIDEO_MAKS_N) ambilV.disabled = true;
  const aksi = el("div", "lp-aksi-dua"); aksi.append(ambil, ambilV);   // tanpa galeri (pemilik 21 Nov 2026: langsung dari kamera supaya tidak bisa dipalsukan)
  isi.closest(".lp-langkah").classList.add("lp-langkah-foto");
  for (const b of [...lanjut.children]) { b.classList.add("lp-foto-lanjut"); aksi.append(b); } // tiga aksi sebaris
  aksi.classList.add("lp-foto-aksi");
  if (daftarFoto.length < MAKS) { // ubin tambah foto selalu ada di ujung kisi
    const z = el("button", `lp-foto-ajak${daftarFoto.length ? " kecil" : ""}`); z.type = "button";
    z.append(ikon(daftarFoto.length ? "i-plus" : "i-kamera"), el("b", null, daftarFoto.length ? "Tambah foto" : "Foto keadaan di lokasi"), el("small", null, daftarFoto.length ? `Sisa ${MAKS - daftarFoto.length} foto` : "Kerusakan, genangan, atau pengungsian. Hindari memotret wajah orang."));
    z.addEventListener("click", () => { siapkanGps(); masukan.click(); }); kisi.append(z); }
  for (const b of aksi.querySelectorAll(".lp-foto-lanjut")) b.prepend(ikon("i-panah"));
  isi.append(hitung, kisi, aksi, masukan, rekam);
}

/* foto orang dicari (pemilik 26 Nov 2026): satu foto wajah, boleh dari galeri atau foto lama; tanpa syarat kamera, waktu, atau lokasi, dan tanpa GPS dikirim */
function kartuFotoCari(j) {
  const isi = kartu("foto", "Foto orang yang dicari"), kisi = el("div", "lp-foto-kisi");
  const masukan = el("input"); masukan.type = "file"; masukan.accept = "image/jpeg,image/*"; masukan.hidden = true;
  const z = el("button", "lp-foto-ajak"); z.type = "button";
  z.append(ikon("i-kamera"), el("b", null, "Pilih foto"), el("small", null, "Dari galeri atau kamera. Pilih yang wajahnya terlihat jelas."));
  z.addEventListener("click", () => masukan.click()); kisi.append(z);
  masukan.addEventListener("change", () => { if (masukan.files[0]) unggahFoto(masukan.files[0], {cari: true}); });
  const lanjut = el("div", "lp-opsi"); j.pilihan.forEach((o, i) => lanjut.append(tombolOpsi(o, j.ket?.[i], () => kirim({teks: String(i + 1), tampil: o}))));
  isi.append(kisi, lanjut, masukan);
}

/* layar terima kasih sesudah laporan terkirim (pemilik 19 Nov 2026: "harusnya ada animasi terima kasih, kaya waktu pertama kali buka"):
   gaya sama dengan pembuka (.lp-pembuka), maskot senang; sekali per nomor tiket supaya tidak muncul lagi saat riwayat chat dimuat ulang */
const TEKS_TERIMA = ["Laporan terkirim", "Terima kasih", "Nomor tiket", "Laporan Anda akan kami proses lebih lanjut.", "Ketuk di mana saja untuk lanjut", "Bagaimana pengalaman melapor Anda?", "Terima kasih atas penilaian Anda.", "Pilih satu penilaian untuk melanjutkan"];
/* terjemahan layar terima kasih disiapkan lebih dulu: elemen tersembunyi berisi teksnya ikut diterjemahkan penerjemah halaman dan masuk simpanan */
function hangatkanTerima() { if (bahasaKini() === "id" || document.querySelector(".lp-tr-hangat")) return; const h = el("div", "lp-tr-hangat"); h.hidden = true;
  for (const t of TEKS_TERIMA) h.append(el("span", null, t)); document.body.append(h); }
/* kartu penilaian 5 emoji; hanya di layar terima kasih tahap kedua (wajib) */
function kotakPenilaian(nomor, sesudah) {
  const nilai = el("div", "lp-nilai"), tanya = el("b", null, TEKS_TERIMA[5]);
  ["😠", "🙁", "😐", "🙂", "🤩"].forEach((e, i) => { const b = el("button", null, e); b.dataset.label = ["Buruk", "Kurang", "Biasa", "Baik", "Sangat baik"][i]; b.type = "button"; b.setAttribute("aria-label", `Nilai ${i + 1} dari 5`);
    b.addEventListener("click", async () => { nilai.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); tanya.textContent = TEKS_TERIMA[6]; sesudah?.();
      try { await fetch("/api/lapor/nilai", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, nomor, nilai: i + 1})}); } catch {} }); nilai.append(b); });
  return {tanya, nilai};
}
function ucapanTerimaKasih(nomor) {
  const kunci = `lapor-tk-${nomor}`; try { if (sessionStorage.getItem(kunci) || localStorage.getItem(kunci)) return; } catch { return; }
  if (document.querySelector(".lp-terima")) return;
  const pb = el("div", "lp-pembuka lp-terima"); pb.setAttribute("role", "alertdialog"); pb.setAttribute("aria-modal", "true");
  const riak = el("span", "lp-pb-riak"); riak.setAttribute("aria-hidden", "true"); riak.append(el("i"), el("i"), el("i"));
  const m = el("div", "lp-pembuka-maskot"); m.innerHTML = maskot("senang");
  // teks tetap dipisah dari nama dan nomor supaya terjemahannya sudah ada di perangkat (disiapkan saat chat dibuka, hangatkanTerima)
  const judul = el("p", "lp-pembuka-judul"); judul.append(el("span", null, TEKS_TERIMA[1]), cache.pelapor ? el("span", "lp-nama-orang", `, ${cache.pelapor}!`) : "!");
  const bnpb = el("p", "lp-pembuka-bnpb"); bnpb.append(el("span", null, TEKS_TERIMA[2]), " ", el("b", "lp-tk-nomor", nomor), el("br"), el("span", null, TEKS_TERIMA[3]));
  // dua tahap (pemilik 21 Nov 2026): terima kasih dulu, diketuk baru penilaian besar di tengah, dipilih baru kembali.
  // Penilaian tetap wajib: layar tidak bisa ditutup sebelum satu emoji dipilih (pemilik 20 Nov 2026)
  const tutup = () => { try { localStorage.setItem(kunci, "1"); } catch {} setTimeout(() => { pb.classList.add("pergi"); setTimeout(() => pb.remove(), 400); }, 350); };   // langsung pindah sesudah emoji diketuk (pemilik 21 Nov 2026: "susah banget di hape")
  // kepala BNPB seperti layar pembuka (pemilik 25 Nov 2026: "bagusin kaya halaman welcoming"); dua tahap tetap (21 Nov 2026)
  const merek = () => { const w = el("div", "lp-pb-merek"), lg = Object.assign(el("img"), {src: "/lapor/lambang-bnpb.png", alt: "", width: 44, height: 44}), nm = el("span");
    nm.append(el("b", null, "BNPB"), el("small", null, "Badan Nasional Penanggulangan Bencana")); w.append(lg, nm); return w; };
  const lanjut = el("button", "lp-terima-lanjut", TEKS_TERIMA[4]); lanjut.type = "button";
  let tahap = 1;
  const keNilai = () => { if (tahap !== 1) return; tahap = 2;
    const {tanya, nilai} = kotakPenilaian(nomor, tutup), kotak = el("div", "lp-terima-nilai lp-terima-besar"); tanya.classList.add("lp-terima-tanya"); kotak.append(tanya, nilai);
    const m2 = el("div", "lp-pembuka-maskot"); m2.innerHTML = maskot("sapa");
    pb.replaceChildren(riak, merek(), m2, kotak); pb.classList.add("tahap-nilai"); nilai.querySelector("button")?.focus(); };
  pb.addEventListener("click", () => { if (tahap === 1) keNilai(); });
  pb.append(riak, merek(), m, el("p", "lp-pembuka-sapa", TEKS_TERIMA[0]), judul, bnpb, lanjut);
  document.body.append(pb); lanjut.focus();
}
/* nomor darurat nasional: satu daftar untuk akhir obrolan dan menu Nomor darurat */
const NOMOR_NASIONAL = [["112", "Panggilan darurat", "i-sirene"], ["117", "Call Center BNPB", "i-telepon"], ["115", "Basarnas, pencarian dan pertolongan", "i-cari"], ["119", "Ambulans dan layanan gawat darurat", "i-plus"], ["110", "Polisi", "i-orang"], ["113", "Pemadam kebakaran", "b-api"]];
/* kartu tiket (pemilik 19 Nov 2026: "bagusin maksimal"): pita sukses, tiket bersobek dengan nomor, langkah berikutnya, aksi berikon, penilaian */
function kartuTiket(j) {
  const isi = kartu("tiket", "Laporan terkirim"); const k = isi.closest(".lp-langkah"); k.classList.add("lp-langkah-tiket"); k.querySelector(".lp-langkah-kepala")?.remove();
  const pita = el("div", "lp-tk-pita"), ok = el("span", "lp-ok"); ok.append(ikon("i-centang"));
  const pt = el("div"); pt.append(el("b", null, "Terima kasih, laporan Anda sudah kami terima"), el("span", null, "Tim kami akan menghubungi Anda untuk mengonfirmasi laporan."));
  pita.append(ok, pt);
  const tiket = el("div", "lp-tk"), kiri = el("div", "lp-tk-kiri"), kanan = el("div", "lp-tk-kanan");
  const no = el("span", "lp-tk-nomor", j.nomor), salin = el("button", "lp-tk-salin"); salin.type = "button"; salin.setAttribute("aria-label", `Salin nomor tiket ${j.nomor}`); salin.append(ikon("i-salin"), "Salin");
  salin.addEventListener("click", async () => { try { await navigator.clipboard.writeText(j.nomor); salin.lastChild.textContent = "Tersalin"; } catch { statusEl.textContent = j.nomor; } });
  kiri.append(el("small", null, "Nomor tiket"), no, salin);
  // kode QR ke halaman lacak (pembuat QR yang sama dengan tombol Bagikan, public/bagi.js); dipindai dari HP lain untuk cek status
  try { const qr = window.Bagi?.QR?.kanvas(new URL(j.unduhan.find(u => u.lacak).url, location.href).href, 4); if (qr) { qr.className = "lp-tk-qr"; qr.setAttribute("role", "img"); qr.setAttribute("aria-label", `Kode QR lacak laporan ${j.nomor}`); kiri.prepend(qr); kiri.classList.add("ada-qr"); } } catch { /* tanpa QR */ }
  const lacak = j.unduhan.find(u => u.lacak), dok = j.unduhan.filter(u => !u.lacak);
  const langkah = el("ol", "lp-tk-langkah");
  for (const [t, ket, aktif, ik] of [["Diterima", "Sekarang", true, "i-centang"], ["Dilihat", "Petugas membuka", false, "i-cari"], ["Ditelaah", "Data diperiksa", false, "i-daftar"], ["Ditindaklanjuti", "BPBD bergerak", false, "i-status"], ["Selesai", "Anda diberi kabar", false, "i-centang"]]) { const li = el("li", aktif ? "aktif" : ""), t0 = el("span"); t0.append(ikon(ik)); li.append(t0, el("b", null, t), el("small", null, ket)); langkah.append(li); }
  kanan.append(el("small", null, "Langkah berikutnya"), langkah);
  tiket.append(kiri, kanan);
  const aksi = el("div", "lp-tk-aksi");
  const a = Object.assign(el("a", "lp-utama"), {href: lacak.url}); a.append(ikon("i-status"), "Lacak laporan"); aksi.append(a);
  for (const u of dok) { const b = Object.assign(el("a", "lp-kedua"), {href: u.url}); b.append(ikon("i-unduh"), u.label.replace("Unduh ", "Unduh ")); b.addEventListener("click", e => unduh(e, u.url)); aksi.append(b); }
  ucapanTerimaKasih(j.nomor);
  const baru = el("button", "lp-tk-baru"); baru.type = "button"; baru.append(ikon("i-plus"), "Buat laporan baru"); baru.addEventListener("click", () => kirim({teks: "lapor", tampil: "Buat laporan baru"}));
  // K88 (pemilik 21 Nov 2026: "di akhir diarahkan ke BPBD mereka masing-masing"): nomor dari situs resmi, bila belum tercatat 117
  const bp = j.bpbd, hub = el("div", "lp-tk-bpbd");
  if (bp?.nomor) {
    // pemilik 26 Nov 2026 "Bagusin": ikon di kiri, nama BPBD sebagai judul dengan pil Hubungi, nomor terbaca jelas, tombol telepon; nomor tetap dari data (bp.nomor)
    const nas = bp.tingkat === "nasional", ub = el("span", "lp-tk-bpbd-ik"), t = el("div"); ub.append(ikon("i-telepon"));
    t.append(el("span", "lp-pil", nas ? "Call Center BNPB" : "Hubungi BPBD setempat"), el("b", null, nas ? "BNPB" : bp.nama), el("span", "lp-tk-bpbd-no", bp.nomor));
    if (nas) t.append(el("small", null, "Nomor BPBD daerah Anda belum tercatat."));
    const tel = Object.assign(el("a", "lp-tk-tel"), {href: `tel:${bp.nomor.replace(/[^\d+]/g, "")}`}); tel.append(ikon("i-telepon"), "Telepon"); tel.setAttribute("aria-label", `Telepon ${nas ? "BNPB" : bp.nama} ${bp.nomor}`);
    hub.append(ub, t, tel);
  } else { const t = el("div"); t.append(el("b", null, "Butuh pertolongan sekarang?"), el("span", null, "Telepon 112 untuk keadaan darurat.")); const tel = Object.assign(el("a", "lp-tk-tel"), {href: "tel:112"}); tel.append(ikon("i-telepon"), "Telepon 112"); hub.append(t, tel); }
  // nomor penting di akhir obrolan (pemilik 25 dan 26 Nov 2026): kartu Nomor penting yang sama dengan menunya, terdekat dari lokasi laporan, di bawah tiket
  isi.append(pita, tiket, aksi, hub, baru);   // penilaian hanya di layar terima kasih (pemilik 21 Nov 2026: "disininya gausah ada lagi")
  wadah.append(kartuPentingLapor(cache.lokasiLapor));
}

async function unduh(e, url) { // dokumen dibuat di latar; bila belum jadi, beri tahu, jangan buka halaman kosong
  e.preventDefault();
  try { let r = await fetch(url, {method: "GET"});
    // belum jadi: tunggu di tempat (cek tiap 10 detik, paling lama 6 menit), lalu unduh sendiri (pemilik 21 Nov 2026: yang terbuka malah teks "sedang dibuat")
    for (let i = 0; r.status === 202 && i < 36; i++) { statusEl.textContent = "PDF sedang dibuat, biasanya 3 menit. Berkasnya terunduh sendiri dan juga dikirim ke WhatsApp Anda."; await new Promise(t => setTimeout(t, 10000)); r = await fetch(url, {method: "GET"}); }
    if (r.status === 202) { statusEl.textContent = "PDF belum selesai. Kami kirim ke WhatsApp Anda nanti."; return; }
    statusEl.textContent = "";
    const b = await r.blob(), a = Object.assign(document.createElement("a"), {href: URL.createObjectURL(b), download: decodeURIComponent((r.headers.get("content-disposition") || "").match(/filename="([^"]+)"/)?.[1] || "laporan")}); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  catch { statusEl.textContent = "Unduhan belum berhasil. Coba lagi."; }
}

/* terapkan keadaan mesin ke layar */
/* sesudah "kembali": percakapan digambar ulang dari transkrip server supaya jawaban yang dibatalkan hilang dari layar */
async function ulangChat() {
  const j = await (await fetch(`/api/lapor/sesi?wa=${wa}`, {signal: AbortSignal.timeout(15000)})).json();
  $("mengetik").hidden = true; log.replaceChildren(); cache.transkrip = [];
  for (const t of j.transkrip || []) tambah(t.dari === "pelapor" ? "saya" : t.dari, t.teks || (t.lokasi ? "Lokasi dibagikan" : ""));
  terapkan(j); simpanCache();
}
function terapkan(j, {dariCache = false} = {}) {
  terakhir = j; wadah.replaceChildren(); statusEl.textContent = "";
  let tulis = false;
  if (j.nomor && j.unduhan) kartuTiket(j);
  else if (j.minta === "setuju") kartuSetuju(j);
  else if (j.minta === "identitas") kartuIdentitas();
  else if (j.minta === "lokasi") kartuLokasi();
  else if (j.minta === "foto") kartuFoto(j);
  else if (j.minta === "foto_cari") kartuFotoCari(j);
  else if (j.minta?.startsWith("tempat")) kartuTempat(j);
  else if (j.minta === "antar") kartuAntar(j);
  else if (j.form?.isian?.[0]?.tipe === "tanggal") kartuWaktu(j);
  else if (j.form?.isian?.[0]?.nama === "rt") kartuRtRw(j);
  else if (j.form) kartuAngka(j);
  else if (j.pilihan?.length) kartuPilihan(j);
  else if (j.status === "batal") kartuBatal();
  else if (j.status === "cari_terkirim") kartuCariTerkirim();   // sesudah dibatalkan tetap ada jalan keluar (pemilik 21 Nov 2026: "gw ga bisa klik")
  else tulis = j.status !== "terkirim" && j.status !== "batal";
  fPesan.hidden = !tulis;
  if (tulis && j.isiAwal && !iTeks.value.trim()) { iTeks.value = j.isiAwal; const n1 = iTeks.value.indexOf("\n1. "), t = n1 >= 0 ? n1 + 4 : iTeks.value.indexOf(":") + 2; iTeks.setSelectionRange(t, t); } // daftar bernomor: kursor di belakang "1. "
  if (tulis) iTeks.focus();
  tampilIsian(j.isian || [], j.lengkap || 0);
  suasanaSigap(j);
  if (!dariCache) { cache.keadaan = j; simpanCache(); }
  requestAnimationFrame(() => gulir.scrollTo({top: gulir.scrollHeight}));
}

/* ============ kirim ke server ============ */
async function kirim({teks = "", lokasi = null, form = null, pilih = null, tampil = null, foto = null, lain = null, kembali = false}) {
  if (sibuk) return;
  sibuk = true; statusEl.textContent = "";
  if (lokasi) { cache.lokasiLapor = acuanPenting(lokasi); simpanCache(); }   // nomor penting terdekat sesudah laporan terkirim; dibulatkan ~100 m
  if (tampil !== false && (tampil || teks)) tambah("saya", tampil ? trTampil(tampil) : teks, {foto}); // tampil:false = perintah diam (membuka laporan)
  wadah.replaceChildren(); fPesan.hidden = true; $("mengetik").hidden = false;
  try {
    const r = await fetch("/api/lapor/pesan", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, teks, lokasi, form, pilih, lain, kembali, saluran: "web", bahasa: bahasaKini()}), signal: AbortSignal.timeout(60000)});
    const j = await r.json();
    if (!r.ok) throw new Error(j.galat || "Sambungan terputus");
    if (j.kembali) { await ulangChat(); return; }
    selesaiBalas(j);
  } catch (e) {
    $("mengetik").hidden = true;
    tambah("bot", `Pesan belum terkirim. ${e.name === "TimeoutError" ? "Jaringan lambat" : String(e.message).replace(/[.\s]+$/, "")}. Coba lagi.`, {galat: true, simpanKe: false});
    if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true});
  } finally { sibuk = false; }
}
/* tanda terima ("*Lokasi tercatat*"): satu baris kecil berpusat centang, bukan gelembung percakapan */
function tambahResi(t) { const [judul, ...sisa] = t.split("\n"), li = el("li", "lp-resi"), tx = el("span"); tx.append(el("b", null, trStatis(judul.replace(/\*/g, ""))), ...(sisa.length ? [el("small", null, sisa.join(" "))] : []));
  li.append(ikon("i-centang"), tx); log.append(li); }
function selesaiBalas(j) {
  // identitas sudah diisi di kartu awal: pertanyaan "kenal" (Ganti) dan kartu identitas mesin dijawab diam-diam dengan isian itu
  if (idAwal && (j.minta === "identitas" || (j.pilihanAsli || j.pilihan)?.join("|") === "Ya|Ganti")) {
    const form = idAwal; if (j.minta === "identitas") idAwal = null;
    setTimeout(() => j.minta === "identitas" ? kirim({form, tampil: false}) : kirim({teks: "2", tampil: false}), 0); return; }
  $("mengetik").hidden = true;
  if (j.konfirmasi && j.balasan?.startsWith(j.konfirmasi)) { tambahResi(j.konfirmasi); j = {...j, balasan: j.balasan.slice(j.konfirmasi.length).trim()}; }   // tanda terima terpisah dari pertanyaan
  if (j.balasan) tambah("bot", j.minta === "setuju" ? (idAwal ? "Terima kasih. Sebelum mulai, baca dan setujui pemakaian data di bawah." : "Halo, saya Sigap, asisten AI Pantau Bencana BNPB. Sebelum mulai, baca dan setujui pemakaian data di bawah.") : j.balasan);
  if (j.pelapor?.nama) cache.pelapor = j.pelapor.nama;
  if (j.nomor && j.susulan) { const l = (cache.laporan || []).find(x => x.nomor === j.nomor); if (l) { l.versi = j.susulan; if (j.foto) l.foto = j.foto; } cache.fotoSesi = []; } // susulan: kartu tetap, versi naik
  else if (j.nomor) { cache.laporan = [{nomor: j.nomor, lacak: j.lacak, foto: j.foto || null, status: "baru", statusLabel: "Laporan diterima", waktu: Date.now(), ringkas: ringkasLaporan(j.isian || cache.keadaan?.isian || [])}, ...(cache.laporan || []).filter(l => l.nomor !== j.nomor)]; cache.fotoSesi = []; }
  if (j.unduhan && !j.nomor) { const d = el("div", "lp-langkah-isi"); } // daftar lacak dari "status" tampil di tab Laporan
  terapkan(j);
}

$("bIsian").addEventListener("click", () => $("bIsian").setAttribute("aria-expanded", String($("panelIsian").classList.toggle("buka")))); // ponsel: lembar bawah; layar lebar: selalu tampil
$("bTutupIsian").addEventListener("click", () => { $("panelIsian").classList.remove("buka"); $("bIsian").setAttribute("aria-expanded", "false"); });
/* Sigap di panel isian bereaksi pada keadaan laporan */
let poseSigap = "", sigapKe = 0, sigapPrihatin = false, sigapAkhir = null;
$("sigapPanel")?.addEventListener("click", e => { if (sigapAkhir && !e.target.closest("a")) suasanaSigap(sigapAkhir, 1, true); });
/* perkiraan waktu sisa dari laju pelapor sendiri (detik per isian terjawab, 10 sampai 40 detik), pemilik 21 Nov 2026: "kasih kira-kira estimasi waktunya" */
const lajuIsian = {mulai: 0, awal: 0};
function perkiraan(isian) {
  const jawab = isian.filter(x => !["kosong", "belum"].includes(x.status)).length, sisa = isian.length - jawab;
  if (!lajuIsian.mulai || jawab < lajuIsian.awal) Object.assign(lajuIsian, {mulai: Date.now(), awal: jawab});
  const n = jawab - lajuIsian.awal, laju = n >= 3 ? Math.min(40, Math.max(10, (Date.now() - lajuIsian.mulai) / 1000 / n)) : 20;
  const menit = Math.ceil(sisa * laju / 60);
  return {sisa, menit, teks: !sisa ? "" : menit <= 1 ? "kurang dari 1 menit lagi" : `sekitar ${menit} menit lagi`};
}
/* Sigap di panel isian berganti kalimat tiap pertanyaan baru dan bisa diketuk untuk saran lain (pemilik 21 Nov 2026: "omongannya yang penting berubah-ubah") */
function kalimatSigap(j) {
  const L = j.lengkap || 0, {sisa, teks} = perkiraan(j.isian || []);
  if (j.status === "terkirim") return [["senang", "Terima kasih banyak!", "Laporan Anda sudah sampai ke petugas BNPB dan BPBD setempat."]];
  if (j.status === "cari_terkirim") { muatCari(); return [["senang", "Laporan diterima", "Petugas BNPB dan BPBD wilayah itu ikut mencari. Kabar dikirim lewat WhatsApp."]]; }
  const awal = [["sapa", "Halo, saya Sigap", "Saya bantu sampai laporan lengkap."],
    ["sapa", "Pelan-pelan saja", "Jawab yang Anda tahu. Kalau tidak tahu, pilih Tidak tahu."],
    ["sapa", "Data Anda terlindungi", "Nomor WhatsApp dan identitas Anda tidak tampil ke publik."]];
  const tengah = [["semangat", "Bagus, lanjutkan", "Tiap jawaban membantu petugas menyiapkan bantuan."],
    ["semangat", "Sudah separuh jalan", sisa ? `Tinggal ${sisa} pertanyaan, ${teks}.` : "Tinggal sedikit lagi."],
    ["semangat", "Foto itu penting", "Ambil langsung dari kamera supaya lokasi dan waktunya terekam."]];
  const akhir = [["semangat", "Sedikit lagi, ayo!", sisa ? `Tinggal ${sisa} pertanyaan, ${teks}.` : "Laporan siap dikirim."],
    ["semangat", "Hampir selesai", "Sebentar lagi laporan Anda sampai ke BNPB dan BPBD."],
    ["semangat", "Ada yang belum ditanya?", "Tulis saja di kolom pesan, saya catat di laporan."]];
  return L >= 70 ? akhir : L >= 30 ? tengah : awal;
}
/* kalimat Sigap mengikuti pertanyaan yang sedang tampil (pemilik 25 Nov 2026: "harusnya menyesuaikan"); diketuk = saran umum berikutnya */
function sigapKonteks(j) {
  const f = j.form?.isian?.[0];
  if (j.minta === "jenis") return ["sapa", "Pilih yang paling mirip", "Bila ragu, pilih yang paling mendekati. Petugas bisa membetulkannya nanti."];
  if (j.minta === "sub") return ["sapa", "Seperti apa kejadiannya?", "Baca penjelasan di bawah tiap pilihan. Tidak yakin? Pilih Tidak tahu."];
  if (j.minta === "lokasi") return ["semangat", "Di mana kejadiannya?", "Bila Anda di tempat kejadian, pakai lokasi HP. Bila tidak, cari nama desanya."];
  if (j.minta === "foto_cari") return ["sapa", "Foto memudahkan pencarian", "Pilih foto yang wajahnya jelas. Foto lama dari galeri boleh."];
  if (j.minta === "foto") return ["semangat", "Foto dari kamera", "Potret langsung supaya waktu dan lokasinya terekam. Jaga jarak aman saat memotret."];
  if (j.minta?.startsWith("tempat")) return ["sapa", "Tempat terdekat", "Pilih tempat yang paling dekat dengan lokasi kejadian."];
  if (f?.tipe === "tanggal") return ["sapa", "Kapan terjadinya?", "Perkiraan jam sudah cukup bila Anda tidak ingat persis."];
  if (f?.nama === "rt") return ["sapa", "RT dan RW", "Kosongkan bila tidak tahu. Petugas tetap bisa menemukan lokasinya."];
  if (j.form) return ["sapa", "Isi angka yang Anda tahu", "Kosongkan bila tidak tahu. Kolom kosong tidak dihitung nol."];
  if (j.banyak) return ["semangat", "Boleh pilih lebih dari satu", "Pilih semua yang dibutuhkan, lalu tekan Kirim."];
  return null;
}
/* ringkasan isian untuk kartu Laporan Anda (pemilik 25 Nov 2026: "kartu ini dilengkapi informasi lain yang dilaporkan"); hanya di perangkat pelapor sendiri */
function ringkasLaporan(isian) {
  const ada = n => isian.find(x => x.nama === n && x.status === "isi")?.tampil || "";
  const ANGKA = [["meninggal", "meninggal", "i-korban"], ["hilang", "hilang", "i-cari"], ["luka", "luka", "i-plus"], ["mengungsi_jiwa", "mengungsi", "i-pengungsian"], ["terdampak_jiwa", "terdampak", "i-orang"], ["rumah_berat", "rumah rusak berat", "i-rumah"], ["rumah_terendam", "rumah terendam", "b-banjir"]];
  return {sub: ada("subjenis"), lokasi: ada("lokasi").split("\n")[0].slice(0, 90),
    angka: ANGKA.map(([n, t, ik]) => [Number(String(ada(n)).match(/\d[\d.]*/)?.[0]?.replace(/\./g, "")) || 0, t, ik]).filter(([v]) => v > 0).slice(0, 4)};
}
/* Sigap di menu samping mengikuti layar yang terbuka (pemilik 25 Nov 2026: "harus menyesuaikan dengan halaman yang terbuka"); di obrolan lapor ikut pertanyaan */
const SIGAP_LAYAR = {
  beranda: ["sapa", "Halo, saya Sigap", "Lihat kejadian bencana? Laporkan di sini. Laporan Anda sampai ke BNPB dan BPBD setempat."],
  laporan: ["sapa", "Laporan Anda", "Ketuk satu laporan untuk melihat tindak lanjut petugas. Simpan nomor tiketnya."],
  alun: ["sapa", "Kabar dari warga", "Yang tampil hanya laporan yang sudah ditindaklanjuti petugas, tanpa nama pelapor."],
  tentang: ["sapa", "Cara melapor", "Cukup tiga langkah: pilih jenis kejadian, tandai lokasinya, jawab pertanyaan singkat."],
  privasi: ["sapa", "Data Anda aman bersama kami", "Nomor WhatsApp dan identitas Anda hanya dibaca petugas yang menangani."],
  "info:penting": ["semangat", "Simpan nomor ini", "Dalam keadaan darurat, telepon 112. Untuk tindak lanjut di daerah, hubungi BPBD setempat."],
  "info:info": ["sapa", "Info hari ini", "Waspada berarti bersiap. Ikuti imbauan petugas setempat dan pantau kabar terbaru."],
  "info:prediksi": ["sapa", "Prediksi 3 hari", "Ini prakiraan, bukan peringatan resmi. Peringatan resmi cuaca tetap dari BMKG."],
  "info:edukasi": ["sapa", "Siaga sebelum terjadi", "Siapkan tas siaga, kenali jalur evakuasi, dan simpan nomor penting."],
};
function sigapLayar(tab) { try { sigapLayar1(tab); } catch { /* dipanggil sebelum keadaan Sigap siap saat halaman dimuat */ } }
function sigapLayar1(tab) {
  if (tab === "chat") { if (sigapAkhir) suasanaSigap(sigapAkhir, 0); return; }
  const k = SIGAP_LAYAR[tab === "info" ? `info:${infoMode}` : tab]; if (!k || !$("sigapTeks")) return;
  const [pose, judul, teks] = k;
  if (pose !== poseSigap) { $("sigapMaskot").innerHTML = maskot(pose); poseSigap = pose; }
  $("sigapTeks").replaceChildren(el("b", null, judul), el("span", null, teks)); $("sigapPanel").dataset.pose = pose;
}
function suasanaSigap(j, geser = 1, ketuk = false) {
  sigapAkhir = j;
  const ang = n => Number((j.isian || []).find(x => x.nama === n)?.tampil?.match?.(/\d+/)?.[0] || 0);
  const korban = ang("meninggal") > 0 || ang("hilang") > 0 || j.darurat;
  sigapKe += geser;
  // prihatin tampil saat korban pertama tercatat, lalu muncul lagi tiap empat pertanyaan; di antaranya Sigap memberi semangat dan saran
  const prihatin = j.status !== "terkirim" && korban && (!sigapPrihatin || sigapKe % 4 === 0);
  if (korban) sigapPrihatin = true;
  const pil = kalimatSigap(j), konteks = !ketuk && j.status !== "terkirim" ? sigapKonteks(j) : null, [pose, judul, teks] = prihatin ? ["sedih", "Turut prihatin", "Utamakan keselamatan. Bila ada yang perlu ditolong sekarang, telepon 112."] : konteks || pil[sigapKe % pil.length];
  if (pose !== poseSigap) { $("sigapMaskot").innerHTML = maskot(pose); poseSigap = pose; }
  const isi = [el("b", null, judul), el("span", null, teks)];
  if (pose === "sedih") { const a = el("a", "lp-sigap-tel"); a.href = "tel:112"; a.append(ikon("i-telepon"), "Telepon 112"); isi.push(a); }
  $("sigapTeks").replaceChildren(...isi); $("sigapPanel").dataset.pose = pose;
}
function tampilIsian(isian, lengkap) {
  $("cincin").style.strokeDasharray = `${lengkap} 100`;
  $("persenCincin").textContent = `${lengkap}%`;
  $("progres").style.width = `${lengkap}%`;
  $("lengkapKecil").textContent = `${lengkap}%`;
  // kepala chat: bilah kemajuan kecil + persen, bukan kalimat polos (pemilik 19 Nov 2026: "bagusin")
  // kemajuan cukup satu tempat: kartu Isian laporan di kiri (pemilik 19 Nov 2026: "ini kan sama ya, digabung di yang kiri aja, dilengkapi")
  $("langkahTeks").textContent = "Asisten AI, dipandu sampai lengkap"; $("barIsian").style.width = `${lengkap}%`;
  if (!isian.length) { $("ringkasIsian").textContent = "Terisi otomatis dari percakapan"; $("isian").replaceChildren(el("p", "lp-redup lp-kecil", "Isian muncul begitu Anda mulai melapor.")); return; }
  const jawab = x => !["kosong", "belum"].includes(x.status);
  const belum = isian.filter(x => !jawab(x));
  // 24 Nov 2026 (pemilik: "bagusin"): hitungan dan perkiraan waktu jadi dua keping, isian berikutnya jadi pil, bukan satu kalimat padat
  const pk = perkiraan(isian), rk = $("ringkasIsian"); rk.replaceChildren(el("b", null, `${isian.filter(jawab).length} dari ${isian.length}`), " terjawab");
  if (pk.teks && belum.length) { const w = el("span", "lp-panel-waktu"); w.append(ikon("k-jam"), pk.teks); rk.append(w); }
  $("sisaIsian").hidden = false;
  if (belum.length) $("sisaIsian").hidden = true;   // tanpa daftar "Berikutnya" (pemilik 25 Nov 2026: "terlalu tinggi, gausah ada berikutnya")
  else { const u = el("span", "lp-sisa-ok"); u.append(ikon("i-centang")); const t = el("span"); t.append(el("b", null, "Semua terjawab"), el("small", null, "Laporan siap dikirim")); $("sisaIsian").replaceChildren(u, t); }
  $("sisaIsian").classList.toggle("selesai", !belum.length);
  const per = new Map(); for (const x of isian) per.set(x.kelompok, [...(per.get(x.kelompok) || []), x]);
  const frag = document.createDocumentFragment();
  for (const [kel, daftar] of per) {
    const n = daftar.filter(jawab).length, penuh = n === daftar.length;
    const d = el("details", `lp-kelompok${penuh ? " penuh" : ""}`), sm = el("summary");
    d.open = !penuh && daftar.some(x => x.status !== "kosong");
    // kartu per kelompok: ikon, nama, bilah kemajuan, jumlah; nilai ringkas tanpa koordinat (pemilik 19 Nov 2026: "bagusin")
    const nm = el("span", "lp-kel-nama"), bar = el("span", "lp-kel-bar"), bi = el("i"); bi.style.width = `${Math.round(n / daftar.length * 100)}%`; bar.append(bi); nm.append(el("b", null, kel), bar);
    sm.append(ikon(KELOMPOK_IKON[kel] || "i-kejadian"), nm, el("span", `lp-pil ${penuh ? "selesai" : n ? "ditelaah" : ""}`, `${n}/${daftar.length}`));
    const dl = el("dl");
    for (const x of daftar) { const b = el("div", x.status); b.append(el("span", "lp-titik"), el("dt", null, x.label), el("dd", null, String(x.tampil ?? "").replace(/\s*\(-?\d+\.\d+,\s*-?\d+\.\d+\)$/, ""))); dl.append(b); }
    d.append(sm, dl); frag.append(d);
  }
  if (isian.every(jawab)) { const b = el("div", "lp-isian-selesai"), ic = el("span"); ic.append(ikon("i-centang")); const tx = el("span"); tx.append(el("b", null, "Laporan lengkap"), el("small", null, "Periksa ringkasan lalu kirim.")); b.append(ic, tx); frag.prepend(b); }
  $("isian").replaceChildren(frag);
}

/* ============ kotak tulis, suara ============ */
fPesan.addEventListener("submit", e => { e.preventDefault(); const t = iTeks.value.trim(); if (!t) return; iTeks.value = "";
  if (/^(bahasa|ganti bahasa|language)$/i.test(t)) { tambah("saya", t, {simpanKe: false}); return tanyaBahasa(() => { tambah("bot", "Baik. Pesan berikutnya dijawab dalam bahasa pilihan Anda.", {simpanKe: false}); if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true}); else fPesan.hidden = false; }, true); }
  kirim({teks: t}); });
iTeks.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (e.isComposing || e.keyCode === 229) return; fPesan.requestSubmit(); } });
const Pengenal = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Pengenal) {
  const bMic = $("bMic"), dengar = new Pengenal(); let awal = "", aktif = false;
  dengar.lang = "id-ID"; dengar.interimResults = true; dengar.continuous = true; bMic.hidden = false;
  bMic.addEventListener("click", () => { if (aktif) dengar.stop(); else { awal = iTeks.value; dengar.start(); } });
  dengar.addEventListener("start", () => { aktif = true; bMic.classList.add("aktif"); bMic.setAttribute("aria-pressed", "true"); statusEl.textContent = "Mendengarkan. Ketuk mikrofon lagi untuk berhenti."; });
  dengar.addEventListener("end", () => { aktif = false; bMic.classList.remove("aktif"); bMic.setAttribute("aria-pressed", "false"); if (statusEl.textContent.startsWith("Mendengarkan")) statusEl.textContent = ""; });
  dengar.addEventListener("error", e => { statusEl.textContent = e.error === "not-allowed" ? "Izin mikrofon ditolak." : "Suara belum tertangkap. Coba lagi."; });
  dengar.addEventListener("result", e => { const kata = [...e.results].map(r => r[0].transcript).join(" ").trim(); iTeks.value = awal ? `${awal.replace(/\s+$/, "")} ${kata}` : kata; });
}

/* ============ lokasi dan foto ============ */
function siapkanGps() { // GPS perangkat saat memotret (KEPUTUSAN D11)
  navigator.geolocation?.getCurrentPosition(p => { posisi = {lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy, waktu: Date.now()}; }, () => { posisi = null; }, {enableHighAccuracy: true, maximumAge: 0, timeout: 20000});
}
const SEGAR_MS = 5 * 60e3;
async function bukanKamera(f) {
  const kini = Date.now(), video = f.type.startsWith("video/");
  if (!video) {
    const x = window.bacaExif ? window.bacaExif(await f.slice(0, 262144).arrayBuffer()) : null;
    if (!x || !x.kamera) return "Ambil foto langsung dengan kamera ponsel. Tangkapan layar dan gambar dari galeri tidak diterima.";
    if (x.waktu && Math.abs(kini - x.waktu) > SEGAR_MS) return "Foto ini diambil lebih dari 5 menit lalu. Ambil foto baru langsung dengan kamera.";
  }
  if (f.lastModified && kini - f.lastModified > SEGAR_MS) return `${video ? "Video" : "Foto"} ini bukan rekaman baru. Ambil langsung dengan kamera.`;
  return null;
}
async function unggahFoto(file, {cari = false} = {}) {
  if (!file || sibuk) return;
  statusEl.textContent = "Menyiapkan foto...";
  try {
    const exif = !cari && window.bacaExif ? window.bacaExif(await file.slice(0, 262144).arrayBuffer()) : null;
    const kecil = window.fotoKecil ? await window.fotoKecil(file) : file;
    if (!kecil) throw new Error("Foto tidak terbaca atau terlalu besar. Coba ambil ulang");
    const data = await new Promise((ok, gagal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = gagal; r.readAsDataURL(kecil); });
    tambah("saya", "", {foto: data, simpanKe: false});
    sibuk = true; wadah.replaceChildren(); $("mengetik").hidden = false; statusEl.textContent = "";
    const r = await fetch("/api/lapor/foto", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, data, gps: cari ? null : posisi, exif, bahasa: bahasaKini()}), signal: AbortSignal.timeout(60000)});
    const j = await r.json(); sibuk = false;
    if (!r.ok) throw new Error(j.galat || "Foto belum terkirim");
    const fb = j.fotoBaru || {};
    if (!cari) cache.fotoSesi = [...(cache.fotoSesi || []), {src: data, lencana: fb.lencana, lencanaTeks: fb.lencanaTeks, lat: fb.lat, lon: fb.lon, waktuTeks: fb.waktuTeks, sumberWaktu: fb.sumberWaktu}]; simpanCache();
    selesaiBalas(j);
  } catch (e) { sibuk = false; $("mengetik").hidden = true; tambah("bot", `${e.message}.`, {galat: true, simpanKe: false}); if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true}); }
}

/* ============ video, unggah bersambung (KEPUTUSAN K57, K61, D77, D89, D90) ============
   Berkas disimpan di antrean bersama public/inti/antre.js (saluran "lapor-video", IndexedDB pb-antre; satu-satunya pemegang IndexedDB) sampai
   semua bagian 5 MB diterima server. Sinyal putus atau halaman ditutup = lanjut dari bagian terakhir (GET status), bukan dari nol.
   Nomor unggahan server per butir disimpan di localStorage (butir antrean tidak ditulis ulang saat bagian berjalan). */
const VIDEO_MAKS_N = 3, VIDEO_MB = 30, VIDEO_DETIK = 60, tunggu = ms => new Promise(r => setTimeout(r, ms)), janjiVideo = new Map();
const idUnggah = {baca: k => { try { return localStorage.getItem(`lapor-unggah-${k}`); } catch { return null; } }, tulis: (k, v) => { try { v ? localStorage.setItem(`lapor-unggah-${k}`, v) : localStorage.removeItem(`lapor-unggah-${k}`); } catch {} }};
function metaVideo(file) { // durasi dan sampul bingkai pertama, digambar di kanvas (tanpa metadata asli)
  return new Promise((ok, gagal) => { const v = document.createElement("video"), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
    const habis = setTimeout(() => { URL.revokeObjectURL(u); gagal(new Error("Video tidak terbaca di perangkat ini")); }, 15000);
    v.addEventListener("loadedmetadata", () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); }, {once: true});
    v.addEventListener("seeked", () => { const k = document.createElement("canvas"), sk = Math.min(1, 640 / (v.videoWidth || 640)); k.width = Math.round((v.videoWidth || 640) * sk); k.height = Math.round((v.videoHeight || 360) * sk);
      k.getContext("2d").drawImage(v, 0, 0, k.width, k.height); clearTimeout(habis); URL.revokeObjectURL(u); ok({durasi: v.duration, sampul: k.toDataURL("image/jpeg", 0.7)}); }, {once: true});
    v.addEventListener("error", () => { clearTimeout(habis); URL.revokeObjectURL(u); gagal(new Error("Video tidak terbaca di perangkat ini")); }, {once: true}); });
}
const jsonAman = async r => { try { return await r.json(); } catch { return {}; } };
/* pengunggah saluran: mulai (sekali), kirim bagian yang belum ada, coba cepat 3 kali; sesudah itu antrean yang mengatur jeda (60 dtk ke atas) */
async function unggahBersambung(berkas, x) {
  const d = x.data;
  for (let coba = 0; coba < 3; coba++) {
    try {
      let id = idUnggah.baca(x.klien_id), diterima = [];
      if (id) { const st = await fetch(`/api/lapor/unggah/${id}`, {signal: AbortSignal.timeout(15000)}); if (st.status === 404) { idUnggah.tulis(x.klien_id, null); id = null; } else diterima = (await st.json()).diterima || []; }
      if (!id) { const r = await fetch("/api/lapor/unggah/mulai", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa: d.wa, ukuran: berkas.size, durasi: d.durasi, gps: d.gps, bahasa: d.bahasa}), signal: AbortSignal.timeout(15000)});
        const j = await jsonAman(r); if (!r.ok) { if (r.status < 500) videoSelesai({...d, klien_id: x.klien_id}, null, j.galat); return {s: r.status, j}; } id = j.id; idUnggah.tulis(x.klien_id, id); x.bagian = j.bagian; x.jumlah = j.jumlah; }
      const B = x.bagian || 5 * 1048576, n = Math.ceil(berkas.size / B), sudah = new Set(diterima);
      for (let i = 0; i < n; i++) {
        if (sudah.has(i)) continue;
        statusEl.textContent = `Mengirim video, bagian ${sudah.size + 1} dari ${n}. Bila sinyal putus, kiriman dilanjutkan dari bagian ini.`;
        const r = await fetch(`/api/lapor/unggah/${id}/${i}`, {method: "PUT", body: berkas.slice(i * B, (i + 1) * B), signal: AbortSignal.timeout(120000)});
        if (r.status === 404) { idUnggah.tulis(x.klien_id, null); throw new Error("kedaluwarsa"); }
        if (!r.ok) throw new Error("bagian gagal");
        sudah.add(i);
      }
      return {s: 200, j: {media_id: id}};
    } catch {
      statusEl.textContent = navigator.onLine ? "Sinyal lemah. Mencoba lagi..." : "Tidak ada sinyal. Video tersimpan di HP dan dikirim otomatis saat tersambung lagi.";
      if (!navigator.onLine) break; await tunggu(2000 * 2 ** coba);
    }
  }
  // tetap gagal: butir dan berkas tinggal di antrean (dikirim otomatis saat tersambung), obrolan dilepas supaya pelapor bisa lanjut
  const t = janjiVideo.get(x.klien_id); if (t) { janjiVideo.delete(x.klien_id); t.gagal(Object.assign(new Error("Video tersimpan di HP dan terkirim otomatis saat sinyal kembali. Anda bisa lanjut mengisi laporan"), {tersimpan: true})); }
  return {s: 0, j: {}};
}
const salVideo = window.PbAntre?.saluran("lapor-video", {umurMs: 24 * 3600e3, langsung: true, media: {unggah: unggahBersambung},
  kirim: async (badan) => { // semua bagian sudah diterima: server memeriksa isi dan memasukkan video ke laporan
    const b = badan[0], r = await fetch(`/api/lapor/unggah/${b.media_id}/selesai`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({sampul: b.sampul}), signal: AbortSignal.timeout(60000)});
    const j = await jsonAman(r); if (r.ok || r.status === 400) { idUnggah.tulis(b.klien_id, null); videoSelesai(b, r.ok ? j : null, j.galat); }
    return {s: r.status, j};
  }});
function videoSelesai(b, j, galat) {
  const tunggu = janjiVideo.get(b.klien_id); janjiVideo.delete(b.klien_id);
  if (tunggu) return j ? tunggu.ok(j) : tunggu.gagal(new Error(galat || "Video ditolak"));
  if (j && b.wa === wa) { tambah("bot", "Video yang tadi terputus sudah terkirim.", {simpanKe: false}); simpanVideoCache(b, j); selesaiBalas(j); } // butir sisa dari kunjungan sebelumnya
}
function simpanVideoCache(b, j) { const fb = j.fotoBaru || {};
  cache.fotoSesi = [...(cache.fotoSesi || []), {src: b.sampul, jenis: "video", durasi: fb.durasi ?? b.durasi, lencana: fb.lencana, lencanaTeks: fb.lencanaTeks, lat: fb.lat, lon: fb.lon, waktuTeks: fb.waktuTeks, sumberWaktu: fb.sumberWaktu}]; simpanCache(); }
async function unggahVideo(file) {
  if (!file || sibuk) return;
  try {
    if (!salVideo) throw new Error("Peramban ini belum bisa mengirim video. Kirim foto saja");
    if (file.size > VIDEO_MB * 1048576) throw new Error(`Video ${Math.round(file.size / 1048576)} MB, paling besar ${VIDEO_MB} MB. Rekam lebih pendek`);
    statusEl.textContent = "Menyiapkan video...";
    const m = await metaVideo(file);
    if (!Number.isFinite(m.durasi)) m.durasi = null; // WebM tanpa durasi tercatat: server memeriksa yang bisa dibaca
    if (m.durasi > VIDEO_DETIK + 1) throw new Error(`Video ${Math.round(m.durasi)} detik, paling lama ${VIDEO_DETIK} detik. Potong dulu atau rekam lebih pendek`);
    const data = {wa, durasi: m.durasi == null ? null : Math.round(m.durasi), gps: posisi, bahasa: bahasaKini(), sampul: m.sampul};
    tambah("saya", "", {foto: m.sampul, simpanKe: false});
    sibuk = true; wadah.replaceChildren(); $("mengetik").hidden = false;
    let idButir = null;
    const hasil = new Promise((ok, gagal) => { salVideo.masukkan({data, berkas: file}).then(id => { idButir = id; janjiVideo.set(id, {ok, gagal}); salVideo.kirimSekarang(); }, gagal); });
    const j = await hasil.catch(async e => { if (!e.tersimpan && idButir) { await salVideo.kirimSekarang(); await salVideo.buang(idButir); } throw e; }); // ditolak: jangan ditahan di antrean
    sibuk = false; statusEl.textContent = "";
    simpanVideoCache(data, j); selesaiBalas(j);
  } catch (e) { sibuk = false; statusEl.textContent = ""; $("mengetik").hidden = true; tambah("bot", `${e.message}.`, {galat: !e.tersimpan, simpanKe: false}); if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true}); }
}

/* ============ beranda, laporan saya, bantuan ============ */
const IKON_STATUS = {baru: "i-centang", dilihat: "i-cari", ditelaah: "i-daftar", diteruskan: "i-kirim", ditindaklanjuti: "i-status", selesai: "i-centang", tidak_valid: "i-tutup"};
const STATUS_PIL = s => { const p = el("span", `lp-pil lp-pil-ikon ${s.status}`); p.append(ikon(IKON_STATUS[s.status] || "i-status"), s.statusLabel || "Diterima"); return p; }; // pil status berikon (pemilik 19 Nov 2026)
async function segarkanLaporan() {
  for (const l of cache.laporan || []) {
    const t = new URL(l.lacak, location.href).searchParams.get("t");
    try { const j = await (await fetch(`/api/lapor/lacak?t=${t}`, {signal: AbortSignal.timeout(10000)})).json(); if (j.nomor) Object.assign(l, {waktu: j.terkirimMs || l.waktu, bisaSusul: j.bisaSusulan, versi: j.versi, status: j.status, statusLabel: j.statusLabel, jenis: j.jenis, balasan: j.balasan.length}); } catch {}
  }
  simpanCache();
}
/* sidebar: profil pelapor dan jumlah laporan (pemilik 19 Nov 2026: "bagusin") */
function tampilProfil() {
  const p = cache.pelapor, n = (cache.laporan || []).length;
  $("tabProfil").hidden = !p; if (p) { $("tabNama").textContent = p; $("tabAvatar").textContent = p.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase(); $("tabWa").textContent = wa && /^62\d+$/.test(wa) ? `+62 ${wa.slice(2, 5)}****${wa.slice(-4)}${n ? `, ${n} laporan` : ""}` : (n ? `${n} laporan` : ""); }
  $("tabJumlah").hidden = !n; $("tabJumlah").textContent = String(n);
}
function tampilBeranda() {
  tampilProfil();
  const p = cache.pelapor;
  // simpul teks terpisah: "Halo" dan kalimat ikut kamus terjemahan, nama tidak (pemilik 20 Nov 2026: judul tetap bahasa Indonesia saat English)
  if (p) { const nm = el("span", "lp-nama-orang", ` ${p.split(" ")[0]}`); $("sapa").replaceChildren("Halo", nm, ", lihat kejadian bencana? Laporkan di sini."); } else $("sapa").textContent = "Lihat kejadian bencana? Laporkan di sini.";
  const l = cache.laporan?.[0];
  $("kTerbaru").hidden = !l;
  if (l) { // kartu laporan terbaru: foto jenis bencana, nomor, langkah status, tombol lacak (pemilik 19 Nov 2026: "bagusin")
    const id = {"Banjir": "banjir", "Tanah longsor": "longsor", "Gelombang pasang dan abrasi": "abrasi", "Cuaca ekstrem": "cuaca", "Kekeringan": "kekeringan", "Kebakaran hutan dan lahan": "karhutla", "Gempa bumi": "gempa", "Tsunami": "tsunami", "Erupsi gunung api": "erupsi"}[l.jenis];
    const bulat = $("kTerbaru").querySelector(".lp-bulat"); bulat.style.setProperty("background-image", GAMBAR[id] ? `url(/img/bencana-${GAMBAR[id]}.jpg)` : "none", "important"); bulat.classList.toggle("berfoto", !!GAMBAR[id]);
    const URUT = ["diterima", "dilihat", "ditelaah", "ditindaklanjuti", "selesai"], n = Math.max(0, URUT.indexOf(l.status));
    let lk = $("kTerbaru").querySelector(".lp-terbaru-langkah"); if (!lk) lk = el("span", "lp-terbaru-langkah");
    $("kTerbaru").querySelector(".lp-baris-kartu").insertBefore(lk, $("kTerbaruPil")); // langkah di tengah baris judul, bukan di bawah
    lk.replaceChildren(...[["Diterima", "i-centang"], ["Dilihat", "i-cari"], ["Ditelaah", "i-daftar"], ["Ditindaklanjuti", "i-status"], ["Selesai", "i-centang"]].map(([t, ik], i) => { const sp = el("span", i <= n ? "aktif" : i === n + 1 ? "berikut" : ""); sp.append(ikon(ik), t); return sp; }));
    $("kTerbaru").href = l.lacak; $("kTerbaruJudul").textContent = `${l.jenis || "Laporan"} ${l.nomor}`; $("kTerbaruSub").textContent = l.balasan ? `${l.balasan} balasan dari petugas` : "Ketuk untuk melihat status"; $("kTerbaruPil").replaceWith(Object.assign(STATUS_PIL(l), {id: "kTerbaruPil"})); }
}
/* Laporan saya (pemilik 19 Nov 2026: "jelek banget"): pita dengan ringkasan, kartu bergambar per laporan dengan langkah status dan tombol */
/* warna ikon per jenis dari registri bencana (public/bencana.json), sama dengan meja staf (pemilik 19 Nov 2026: "icon setiap bencana warnanya beda") */
const REG_JENIS = {tsunami: "pesisir", abrasi: "pesisir", erupsi: "gunungapi"}, warnaReg = {};
fetch("/bencana.json").then(r => r.json()).then(j => { for (const b of j.bencana || []) warnaReg[b.id] = b.warna; if (!$("lLaporan").hidden) tampilDaftarLaporan(); }).catch(() => {});
const warnaJenis = id => id === "kebakaran_gedung" ? "var(--bad)" : warnaReg[REG_JENIS[id] || id] || "var(--brand2)";
const ID_JENIS = {"Banjir": "banjir", "Tanah longsor": "longsor", "Gelombang pasang dan abrasi": "abrasi", "Cuaca ekstrem": "cuaca", "Kekeringan": "kekeringan", "Kebakaran hutan dan lahan": "karhutla", "Gempa bumi": "gempa", "Tsunami": "tsunami", "Erupsi gunung api": "erupsi", "Kebakaran gedung dan permukiman": "kebakaran_gedung"};
const URUT_STATUS = ["diterima", "dilihat", "ditelaah", "ditindaklanjuti", "selesai"];
async function mulaiSusulan(nomor) {
  try {
    const r = await fetch("/api/lapor/susulan", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, nomor, saluran: "web"})}), j = await r.json();
    if (!r.ok) { statusEl.textContent = j.galat || "Kabar tambahan belum bisa dimulai."; alert(j.galat || "Kabar tambahan belum bisa dimulai."); return; }
    ke("chat"); await ulangChat();
  } catch { alert("Jaringan bermasalah. Coba lagi."); }
}
const LABEL_CARI = {buka: "Masih dicari", ditemukan_selamat: "Ditemukan selamat", ditemukan_meninggal: "Ditemukan meninggal", ke_sar: "Diteruskan ke tim SAR", tutup: "Ditutup"};
async function muatCari() {   // gagal atau belum masuk (401) = daftar kosong, tanpa galat di layar
  try { const r = await fetch("/api/lapor/selamat/saya", {credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000)}); if (!r.ok) return;
    const j = await r.json(); const lama = JSON.stringify(cache.cari || []); cache.cari = j.cari || []; if (JSON.stringify(cache.cari) !== lama) tampilDaftarLaporan(); } catch {}
}
function tampilDaftarLaporan() {
  const w = $("daftarLaporan"), daftar = cache.laporan || [];
  const aktif = cache.keadaan && !["terkirim", "batal", "cari_terkirim"].includes(cache.keadaan.status) && cache.transkrip.length;
  const selesai = daftar.filter(l => l.status === "selesai").length;
  const ring = $("ringkasLaporan"); ring.replaceChildren(el("b", null, "Ringkasan"));
  for (const [t, n, ik] of [["Laporan terkirim", daftar.length, "i-kirim"], ["Sedang ditangani", daftar.length - selesai, "i-status"], ["Selesai", selesai, "i-centang"]]) {
    const u = el("div", "lp-pita-ubin"), ic = el("span"); ic.append(ikon(ik)); const tx = el("span"); tx.append(el("b", null, String(n)), el("small", null, t)); u.append(ic, tx); ring.append(u); }
  const isi = [];
  if (aktif) { const b = el("button", "lp-lap-kartu draf"); b.type = "button"; const g = el("div", "lp-lap-gambar"); const ic = el("span", "lp-lap-ikon"); ic.append(ikon("i-pesan")); const mk = el("span", "lp-lap-maskot"); mk.innerHTML = maskot("semangat"); g.append(ic, el("span", "lp-pil ditelaah", "Belum dikirim"), mk);
    const tx = el("div", "lp-lap-isi"), bar = el("span", "lp-lap-bar"), bi = el("i"); bi.style.width = `${cache.keadaan.lengkap || 0}%`; bar.append(bi);
    const aksi = el("span", "lp-lap-aksi"); aksi.append(ikon("i-panah"), "Lanjutkan melapor");
    aksi.classList.add("lp-lap-kaki");
    tx.append(el("b", null, "Laporan yang belum selesai"), el("small", null, `Lengkap ${cache.keadaan.lengkap || 0} persen`), bar, aksi); b.append(g, tx); b.addEventListener("click", () => ke("chat")); isi.push(b); }
  for (const l of daftar) {
    const id = ID_JENIS[l.jenis], a = Object.assign(el("a", "lp-lap-kartu"), {href: l.lacak}), g = el("div", "lp-lap-gambar");
    // foto asli yang diunggah pelapor; foto contoh jenis hanya bila laporan tanpa foto (pemilik 19 Nov 2026: "pakai foto real yang diupload")
    if (l.foto) { g.style.setProperty("background-image", `url("${l.foto}")`, "important"); g.classList.add("asli"); } else if (GAMBAR[id]) g.style.backgroundImage = `url(/img/bencana-${GAMBAR[id]}.jpg)`;
    if (!l.foto && l.fotoCek2 !== true && l.lacak) { const t = new URL(l.lacak, location.href).searchParams.get("t"); // laporan lama: ambil foto pertama dari halaman lacak sekali
      fetch(`/api/lapor/lacak?t=${encodeURIComponent(t || "")}`).then(r => r.json()).then(x => { l.fotoCek2 = true; const f = x.fotoPertama; if (f) { l.foto = f; g.style.setProperty("background-image", `url("${f}")`, "important"); g.classList.add("asli"); } simpanCache(); }).catch(() => {}); }
    const ic = el("span", "lp-lap-ikon"); ic.style.setProperty("--jn", warnaJenis(id)); ic.append(ikon(IKON_JENIS[id] || "i-kejadian")); g.append(ic, STATUS_PIL(l));
    const tx = el("div", "lp-lap-isi"), n = Math.max(0, URUT_STATUS.indexOf(l.status)), lk = el("span", "lp-terbaru-langkah");
    lk.append(...[["Diterima", "i-centang"], ["Dilihat", "i-cari"], ["Ditelaah", "i-daftar"], ["Ditindaklanjuti", "i-status"], ["Selesai", "i-centang"]].map(([t, ik], i) => { const sp = el("span", i <= n ? "aktif" : i === n + 1 ? "berikut" : ""); sp.append(ikon(ik), t); return sp; }));
    const aksi = el("span", "lp-lap-aksi"); aksi.append(ikon("i-status"), l.balasan ? `${l.balasan} balasan petugas, lihat` : "Lacak laporan");
    // baris meta: nomor tiket dan waktu kirim berikon (pemilik 19 Nov 2026 "bagusin")
    const meta = el("span", "lp-lap-meta"), m1 = el("span"), m2 = el("span"); m1.append(ikon("i-daftar"), l.nomor);
    m2.append(ikon("i-kalender"), l.waktu ? new Date(l.waktu).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(":", ".") : "Terkirim"); meta.append(m1, m2);
    const rk = l.ringkas, rkEl = [];
    if (rk?.lokasi) { const p = el("span", "lp-lap-lokasi"); p.append(ikon("i-lokasi"), rk.lokasi); rkEl.push(p); }
    if (rk?.angka?.length) { const d = el("span", "lp-lap-angka"); for (const [v, t, ik] of rk.angka) { const c = el("span"); c.append(ikon(ik), el("b", null, v.toLocaleString("id-ID")), ` ${t}`); d.append(c); } rkEl.push(d); }
    // laporan susulan (F-28): Tambah kabar 72 jam sejak terkirim, sebelum laporan selesai (Q26); server memeriksa ulang
    const bisaSusul = l.bisaSusul ?? (l.waktu && Date.now() - l.waktu < 72 * 3600e3 && !["selesai", "tidak_valid"].includes(l.status));
    const kep = el("span", "lp-lap-kep"), tombolKep = el("span", "lp-lap-tombol");
    if (bisaSusul) { const tk = el("button", "lp-lap-susul"); tk.type = "button"; tk.append(ikon("i-tambah-teks"), "Tambah kabar");
      tk.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); mulaiSusulan(l.nomor); }); tombolKep.append(tk); }
    // judul dan meta di atas, langkah di tengah, tombol di kaki kartu supaya semua kartu rata (pemilik 21 Nov 2026: "bagusin lagi")
    tombolKep.append(aksi); tombolKep.classList.add("lp-lap-kaki"); kep.append(el("b", null, l.ringkas?.sub && !/tidak tahu/i.test(l.ringkas.sub) ? l.ringkas.sub : l.jenis || "Laporan"), meta, ...rkEl);
    tx.append(kep, lk, tombolKep); a.append(g, tx); isi.push(a);
  }
  // laporan orang dicari milik nomor ini (pemilik 25 Nov 2026: "disini agar ada masuk juga"), dari /api/lapor/selamat/saya
  for (const c of cache.cari || []) {
    const b = el("div", "lp-lap-kartu lp-lap-cari"), g = el("div", "lp-lap-gambar"); g.style.backgroundImage = "url(/img/foto-pasca.jpg)";
    const ic = el("span", "lp-lap-ikon"); ic.append(ikon("i-cari")); g.append(ic, el("span", `lp-pil ${c.status === "buka" ? "ditelaah" : "selesai"}`, LABEL_CARI[c.status] || c.status));
    const tx = el("div", "lp-lap-isi"), meta = el("span", "lp-lap-meta"), m1 = el("span"), m2 = el("span"); m1.append(ikon("i-lokasi"), c.kab_nama || "");
    m2.append(ikon("i-kalender"), new Date(c.dibuat).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(":", ".")); meta.append(m1, m2);
    tx.append(el("b", null, `Orang dicari: ${c.nama_dicari}`), meta, el("small", "lp-lap-cari-ket", c.status === "buka" ? "Petugas BNPB dan BPBD wilayah ini menerima laporan Anda. Kabar dikirim lewat WhatsApp." : "Laporan ini sudah ditutup petugas."));
    b.append(g, tx); isi.push(b);
  }
  if (!isi.length) {
    const k = el("div", "lp-kosong-besar"), m = el("div", "lp-kosong-maskot"); m.innerHTML = maskot("berpikir");
    const tx = el("div", "lp-kosong-teks"), b = el("button", "lp-utama"); b.type = "button"; b.append(ikon("i-kirim"), "Lapor kejadian"); b.addEventListener("click", bukaChat);
    tx.append(el("h2", null, "Belum ada laporan"), el("p", null, "Laporan yang Anda kirim muncul di sini lengkap dengan nomor tiket, status penanganan, dan balasan petugas."), b); k.append(m, tx); isi.push(k);
  }
  w.replaceChildren(...isi);
}
/* Darurat sekali ketuk (K90, D122-D125): telepon tampil seketika (jalan tanpa data seluler), lokasi terbaik dalam 15 detik dikirim ke petugas,
   lalu Lengkapi laporan membuka Tambah kabar di langkah jenis darurat. Nomor tetap wajib (Q65 belum dijawab).
   Tanpa sinyal (D125): titik dan jam ketukan masuk antrean bersama public/inti/antre.js (saluran "lapor-sekali", IndexedDB) dan terkirim
   otomatis saat tersambung atau saat halaman dibuka lagi; server memakai jam ketukan sebagai waktu kejadian. */
const salSekali = window.PbAntre?.saluran("lapor-sekali", {umurMs: 24 * 3600e3, langsung: true,
  kirim: async badan => { const b = badan[0], r = await fetch("/api/lapor/darurat/cepat", {method: "POST", headers: {"content-type": "application/json"},
    body: JSON.stringify({wa: b.wa, lokasi: b.lokasi, waktu_klien: b.waktu_klien}), signal: AbortSignal.timeout(20000)}), j = await jsonAman(r);
    if (r.ok) { tambah("bot", `*Laporan darurat terkirim*\nLokasi yang Anda kirim saat tanpa sinyal sudah diterima petugas. Nomor laporan ${j.nomor}.`, {simpanKe: false}); segarkanLaporan().then(tampilBeranda).catch(() => {}); }
    return {s: r.status, j}; }});
function sekaliKetuk() {
  if (!wa) { ke("chat"); hangatkanTerima(); return tanyaNomor(() => { ke("beranda"); sekaliKetuk(); }); }
  const d = el("dialog", "lp-sekali"), h = el("h1", null, "Darurat sekali ketuk"); h.id = "lpSekaliJudul"; d.setAttribute("aria-labelledby", h.id);
  const st = el("p", "lp-sekali-status", "Membaca lokasi Anda."); st.setAttribute("role", "status");
  const tel = (no, judul, ket) => { const a = el("a", "lp-sekali-tel"); a.href = `tel:${no}`; const ic = el("span"); ic.append(ikon("i-telepon")); const tx = el("span"); tx.append(el("b", null, judul), el("small", null, ket)); a.append(ic, tx); return a; };
  const telp = el("div", "lp-sekali-telp"), a112 = tel("112", "Telepon 112", "Darurat terpadu"); a112.autofocus = true;
  telp.append(a112, tel("117", "Telepon 117", "Call center BNPB"));
  const lengkapi = el("button", "lp-utama", "Lengkapi laporan"); lengkapi.type = "button"; lengkapi.hidden = true;
  const f = el("form"); f.method = "dialog"; f.append(Object.assign(el("button", "lp-kedua", "Tutup"), {value: "tutup"}));
  d.append(h, st, telp, lengkapi, f); document.body.append(d);
  let terbaik = posisi && Date.now() - posisi.waktu < 120000 ? {lat: posisi.lat, lon: posisi.lon, akurasi: posisi.akurasi} : null, jalan = false, jaga = null;
  const kirimSekarang = async () => {
    if (jalan) return; jalan = true; clearTimeout(batas); if (jaga != null) navigator.geolocation.clearWatch(jaga);
    const simpanHp = async () => {   // antrean luring: bertahan walau halaman ditutup; tanpa antrean (peramban lama) dicoba lagi saat online selama halaman terbuka
      if (salSekali) { try { await salSekali.tambah({wa, lokasi: terbaik}); st.textContent = "Belum ada sinyal. Lokasi tersimpan di HP dan dikirim otomatis begitu ada sinyal. Telepon tetap bisa."; return; } catch { /* penyimpanan HP penuh atau mode privat: cara lama di bawah */ } }
      jalan = false; st.textContent = "Belum ada sinyal. Telepon tetap bisa. Lokasi dikirim otomatis begitu ada sinyal, selama halaman ini tetap terbuka."; addEventListener("online", kirimSekarang, {once: true}); };
    if (!navigator.onLine) return simpanHp();
    st.textContent = "Mengirim lokasi ke petugas.";
    try {
      const r = await fetch("/api/lapor/darurat/cepat", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, lokasi: terbaik}), signal: AbortSignal.timeout(20000)}), j = await r.json();
      if (!r.ok) { st.textContent = j.galat || "Laporan belum terkirim. Telepon 112."; return; }
      st.textContent = `Terkirim ke petugas BNPB dan BPBD. Nomor laporan ${j.nomor}.${j.wilayah ? ` Lokasi: Desa/Kel. ${j.wilayah.desa}, Kec. ${j.wilayah.kec}.` : " Lokasi belum terbaca; sebutkan desa Anda saat menelepon."}`;
      if (j.bpbd?.nomor && j.bpbd.nomor !== "117") telp.append(tel(j.bpbd.nomor.replace(/[^\d+]/g, ""), `Telepon ${j.bpbd.nama}`, j.bpbd.nomor));
      lengkapi.hidden = false; lengkapi.addEventListener("click", () => { d.close(); mulaiSusulan(j.nomor); }, {once: true});
      if (terbaik) f.before(kartuPentingLapor(acuanPenting(terbaik)));   // nomor penting terdekat dari titik yang terkirim (pemilik 26 Nov 2026)
      segarkanLaporan().then(tampilBeranda).catch(() => {});
    } catch { await simpanHp(); }
  };
  const batas = setTimeout(kirimSekarang, 15000);
  d.addEventListener("close", () => { if (jaga != null) navigator.geolocation.clearWatch(jaga); d.remove(); });
  d.showModal();
  if (!("geolocation" in navigator)) { kirimSekarang(); return; }
  jaga = navigator.geolocation.watchPosition(p => { const c = p.coords;
    if (!terbaik || c.accuracy < terbaik.akurasi) terbaik = {lat: c.latitude, lon: c.longitude, akurasi: c.accuracy};
    if (!jalan) st.textContent = `Lokasi terbaca, ketelitian ${Math.round(terbaik.akurasi).toLocaleString("id-ID")} m.`;
    if (terbaik.akurasi <= 50) kirimSekarang(); }, () => kirimSekarang(), {enableHighAccuracy: true, maximumAge: 60000, timeout: 15000});
}
async function bukaChat(darurat = false) {
  if (darurat === "cari") {   // lapor orang hilang lewat obrolan, tanpa kode WA (pemilik 25 Nov 2026)
    ke("chat"); hangatkanTerima();
    if (log.children.length) log.append(el("li", "tengah", "Lapor orang hilang"));
    const mulaiCari = () => kirim({teks: "lapor orang hilang", tampil: false});
    return tanyaBahasa(() => wa ? mulaiCari() : tanyaNomor(mulaiCari));
  }
  if (darurat === true) {   // K68: laporan darurat selalu dimulai baru; draf laporan biasa yang belum terkirim diganti
    ke("chat"); hangatkanTerima();
    if (log.children.length) log.append(el("li", "tengah", "Laporan darurat"));
    const mulaiDarurat = () => kirim({teks: "darurat", tampil: false});
    return tanyaBahasa(() => wa ? mulaiDarurat() : tanyaNomor(mulaiDarurat));
  }
  ke("chat"); hangatkanTerima();
  if (!log.children.length || ["terkirim", "batal", "cari_terkirim"].includes(cache.keadaan?.status)) { if (["terkirim", "batal", "cari_terkirim"].includes(cache.keadaan?.status)) { log.append(el("li", "tengah", "Laporan baru")); } const mulaiLapor = () => kirim({teks: "lapor", tampil: false});
    tanyaBahasa(() => wa ? mulaiLapor() : tanyaNomor(mulaiLapor)); }   // bahasa dipilih di jendela awal; di chat ditanya hanya bila belum
}

/* bantuan: definisi juklak dan pertanyaan umum */
const BANTU = [
  ["Melapor", "Apa saja yang perlu disiapkan?", "Siapkan lokasi kejadian (sebaiknya Anda berada di lokasi), perkiraan waktu kejadian, dan foto keadaan di lokasi bila bisa. Data korban dan kerusakan boleh perkiraan. Bila belum tahu, biarkan kosong."],
  ["Melapor", "Kenapa lokasi wajib?", "Petugas perlu tahu desa yang terdampak untuk mengirim bantuan dan memeriksa laporan. Sistem mencocokkan lokasi otomatis ke desa, kecamatan, kabupaten/kota, dan provinsi."],
  ["Melapor", "Apakah laporan saya langsung dianggap resmi?", "Belum. Petugas BNPB dan BPBD setempat memeriksa laporan warga dulu. Anda bisa melacak status pemeriksaan lewat nomor tiket."],
  ["Istilah", "Apa itu pengungsi?", "Orang yang terpaksa meninggalkan tempat tinggalnya karena bencana, termasuk yang dievakuasi sebelum dampak. Mereka tinggal sementara di tenda, gedung publik, atau rumah kerabat."],
  ["Istilah", "Bagaimana menghitung KK?", "Hitung per Kartu Keluarga, bukan per orang. Satu rumah tangga dengan satu Kartu Keluarga dihitung 1 KK berapa pun anggotanya."],
  ["Istilah", "Rusak berat, sedang, ringan, terendam", "Rusak berat: roboh atau sebagian besar struktur utama, dinding, dan lantai rusak. Rusak sedang: sebagian kecil struktur rusak tetapi bangunan masih berdiri. Rusak ringan: retak pada plesteran, struktur masih bisa dipakai. Terendam: tergenang air tanpa kerusakan struktur."],
  ["Istilah", "Skala guncangan gempa", "Pilih keadaan yang Anda lihat: hampir tidak terasa, terasa tanpa kerusakan, kerusakan ringan, sedang, atau berat. Pilihan mengikuti Skala Intensitas Gempabumi BMKG (SIG I sampai V)."],
  ["Status", "Apa arti status laporan?", "Urutannya: diterima, dilihat petugas, ditelaah, diteruskan ke BPBD setempat, ditindaklanjuti, lalu selesai ditangani. Tanggal setiap perubahan tampil di halaman lacak."],
  /* edukasi siaga (pemilik 19 Nov 2026): teks tetap, bukan jawaban AI. ponytail: disusun dari praktik kesiapsiagaan umum; perlu ditinjau Direktorat Kesiapsiagaan BNPB sebelum publik. */
  ["Edukasi", "Gempa bumi: saat guncangan", "Lindungi kepala dan leher, berlindung di bawah meja yang kuat, jauhi kaca dan lemari. Bila di luar, jauhi bangunan, tiang, dan pohon. Keluar bangunan sesudah guncangan berhenti, lewat tangga, bukan lift."],
  ["Edukasi", "Tsunami: tanda dan tindakan", "Bila di pantai terasa gempa kuat atau lama, atau air laut tiba-tiba surut, segera menjauh dari pantai ke tempat tinggi tanpa menunggu peringatan. Jangan kembali sebelum ada pengumuman resmi."],
  ["Edukasi", "Banjir: sebelum dan saat air naik", "Simpan dokumen penting di wadah kedap air dan di tempat tinggi. Matikan listrik dari meteran saat air mulai masuk. Jangan berjalan atau berkendara melewati arus deras; arus setinggi lutut dapat menghanyutkan orang."],
  ["Edukasi", "Tanah longsor: tanda bahaya", "Waspadai retakan baru di tanah atau dinding, pintu dan jendela yang tiba-tiba sulit dibuka, mata air baru, atau air sungai mendadak keruh. Saat hujan lebat lama di lereng, mengungsilah ke tempat yang lebih aman."],
  ["Edukasi", "Kebakaran hutan dan lahan: asap", "Kurangi kegiatan di luar saat asap tebal, pakai masker yang rapat, dan utamakan perlindungan bayi, lansia, ibu hamil, dan penderita sesak napas. Jangan membakar lahan atau sampah."],
  ["Edukasi", "Erupsi gunung api: hujan abu", "Ikuti radius bahaya dari PVMBG dan perintah petugas. Saat hujan abu, pakai masker dan kacamata, tutup sumber air, dan bersihkan abu dari atap supaya tidak roboh."],
  ["Edukasi", "Tas siaga bencana", "Siapkan tas berisi air minum, makanan tahan lama, obat pribadi, senter, peluit, salinan dokumen penting, uang tunai, dan pakaian ganti. Letakkan di tempat yang mudah diambil."],
  ["Privasi", "Siapa yang bisa membaca laporan saya?", "Hanya petugas BNPB dan BPBD yang menangani laporan. Nomor WhatsApp dan foto tidak tampil ke publik. Rincian ada di kebijakan privasi."],
];
/* FAQ gaya halaman Tentang (details name="faq": satu terbuka sekaligus); edukasi dari edukasi.json bila ada (riset sumber resmi) */
let EDU = null, grupAktif = "Semua";
const GRUP = ["Semua", "Melapor", "Istilah", "Status", "Edukasi", "Privasi"];
/* ikon per pertanyaan, bukan satu ikon per kelompok (pemilik 19 Nov 2026: "iconnya ganti-ganti dong") */
const IKON_TANYA = [[/disiapkan/i, "i-kebutuhan"], [/lokasi/i, "i-lokasi"], [/resmi/i, "i-centang"], [/pengungsi/i, "i-pengungsian"], [/KK/, "i-korban"], [/rusak/i, "i-rumah"],
  [/guncangan|gempa/i, "i-kejadian"], [/status/i, "i-status"], [/tas siaga/i, "i-kebutuhan"], [/membaca|privasi/i, "i-orang"], [/foto/i, "i-kamera"], [/waktu/i, "i-kalender"]];
const ikonTanya = t => IKON_TANYA.find(([r]) => r.test(t))?.[1];
function faqEl(t, isiFn, gambar, {sub, idIlus, ikonGrup} = {}) { const d = el("details", "lp-faq2"); d.name = "faq"; const s = el("summary"), w = el("div", "isi");
  // tiap baris punya visual: foto bencana, ilustrasi topik, atau ikon kelompok (pemilik 19 Nov 2026: "kasih gambar dong")
  if (gambar) { const g = el("span", "lp-faq-gambar"); g.style.backgroundImage = `url(/img/bencana-${gambar}.jpg)`; s.append(g); }
  else if (adaIlustrasi(idIlus)) { const g = el("span", "lp-faq-gambar ilus"); g.innerHTML = ilustrasi(idIlus); s.append(g); }
  else if (ikonGrup) { const g = el("span", "lp-faq-ikon"); g.append(ikon(ikonGrup)); s.append(g); }
  const j = el("span", "lp-faq-judul"); j.append(el("span", null, t)); if (sub) j.append(el("small", null, sub)); s.append(j); d.append(s, w);
  let terisi = false; d.addEventListener("toggle", () => { if (d.open && !terisi) { isiFn(w); terisi = true; } }); // isi dibuat saat dibuka: daftar panjang tetap ringan
  return d; }
function itemBantu() {
  const dasar = BANTU.filter(([g]) => !(EDU && g === "Edukasi")).map(([g, t, i]) => ({g, t, isi: w => w.append(el("p", null, i)), cari: `${t} ${i}`}));
  const edu = (EDU?.topik || []).map(x => ({g: "Edukasi", t: x.judul, cari: `${x.judul} ${x.ringkas || ""} ${[...(x.tanda || []), ...(x.sebelum || []), ...(x.saat || []), ...(x.sesudah || []), ...(x.butir || [])].join(" ")}`,
    gambar: x.gambar, id: x.id, sub: x.ringkas,
    isi: w => {
      // ilustrasi: foto bencana, tanda bahaya menonjol, lalu Sebelum, Saat, Sesudah sebagai langkah bernomor (pemilik 19 Nov 2026: "kasih gambar atau ilustrasi")
      const teks = () => { const t = el("div", "lp-edu-teks"); t.append(el("span", "lp-edu-label", "Siaga bencana"), el("h3", null, x.judul)); if (x.ringkas) t.append(el("p", null, x.ringkas)); return t; };
      if (x.gambar) { const f = el("div", "lp-edu-foto"); f.style.backgroundImage = `url(/img/bencana-${x.gambar}.jpg)`; f.append(teks()); if (x.kredit) f.append(el("span", "lp-kredit", x.kredit)); w.append(f); }
      else if (adaIlustrasi(x.id)) { const f = el("div", "lp-edu-foto ilus"); f.append(teks()); f.insertAdjacentHTML("beforeend", ilustrasi(x.id)); w.append(f); }
      else if (x.ringkas) w.append(el("p", null, x.ringkas));
      if (x.tanda?.length) { const t = el("div", "lp-edu-tanda"), h = el("b"); h.append(ikon("i-kejadian"), "Tanda bahaya"); const ul = el("ul"); x.tanda.forEach(b => ul.append(el("li", null, b))); t.append(h, ul); w.append(t); }
      const fase = [["sebelum", "Sebelum", "i-status"], ["saat", "Saat kejadian", "i-kejadian"], ["sesudah", "Sesudah", "i-centang"]].filter(([k]) => x[k]?.length);
      if (fase.length) { const g = el("div", "lp-edu-fase"); for (const [k, lab, ik] of fase) { const c = el("section", `lp-edu-kolom ${k}`), h = el("b"); h.append(ikon(ik), lab); const ol = el("ol"); x[k].forEach(b => ol.append(el("li", null, b))); c.append(h, ol); g.append(c); } w.append(g); }
      if (x.butir?.length) { const ol = el("ol", "lp-edu-butir"); x.butir.forEach(b => { const m = b.match(/^(\d{3}(?:-\d+)?): (.+)$/s); // "112: ..." jadi kartu bernomor besar
        if (!m) return ol.append(el("li", null, b)); const li = el("li", "nomor"), a = Object.assign(el("a", "lp-edu-no", m[1]), {href: `tel:${m[1].replace(/\D/g, "")}`}); li.append(a, el("span", null, m[2][0].toUpperCase() + m[2].slice(1))); ol.append(li); }); w.append(ol); }
      // sumber sebagai label; nama lembaga yang sama digabung, tautannya tetap satu per sumber (pemilik 19 Nov 2026: "sumber dibuat label")
      if (x.sumber?.length) { const p = el("div", "lp-sumber"); p.append(el("span", "lp-sumber-judul", "Sumber"));
        const per = new Map(); for (const u of x.sumber) per.set(u.lembaga, [...(per.get(u.lembaga) || []), u.url]);
        for (const [lembaga, url] of per) url.forEach((h, i) => { const a = el("a", "lp-sumber-label"); a.href = h; a.target = "_blank"; a.rel = "noopener"; a.append(ikon("i-centang"), url.length > 1 ? `${lembaga} ${i + 1}` : lembaga); p.append(a); });
        w.append(p); } }}));
  return [...dasar, ...edu];
}
function pilihGrup(g) { grupAktif = g; $("iCariBantu2").value = ""; tampilBantu(); }
function tampilBantu(q = "") {
  const kata = q.toLowerCase().trim(), semua = itemBantu();
  const IKON_SARING = {"Semua": "i-daftar", "Melapor": "i-kirim", "Istilah": "i-bantuan", "Status": "i-status", "Edukasi": "i-kejadian", "Privasi": "i-orang"};
  // pilihan kelompok selebar layar, dibagi rata, berikon dan berjumlah (aturan deretan pilihan ujung ke ujung)
  $("saringBantu").replaceChildren(...GRUP.map(g => { const b = el("button"); b.append(ikon(IKON_SARING[g]), el("span", null, g), el("small", null, String(g === "Semua" ? semua.length : semua.filter(x => x.g === g).length))); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(g === grupAktif && !kata)); b.addEventListener("click", () => pilihGrup(g)); return b; }));
  const cocok = semua.filter(x => kata ? x.cari.toLowerCase().includes(kata) : grupAktif === "Semua" || x.g === grupAktif);
  // tiap kelompok satu kompartemen berkepala ikon (pemilik 19 Nov 2026: "kasih icon kompartemen")
  const IKON_GRUP = {"Melapor": "i-kirim", "Istilah": "i-daftar", "Status": "i-status", "Edukasi": "i-bantuan", "Privasi": "i-orang"};
  const per = new Map(); for (const x of cocok) per.set(x.g, [...(per.get(x.g) || []), x]);
  const isi = [...per].map(([g, daftar]) => {
    const k = el("section", "lp-kompartemen"), h = el("h2", "lp-kompartemen-kepala"); h.append(ikon(IKON_GRUP[g] || "i-bantuan"), g, el("span", "lp-kompartemen-jumlah", String(daftar.length)));
    const w = el("div", "lp-kompartemen-isi lp-faq-kisi"); daftar.forEach(x => w.append(faqEl(x.t, x.isi, x.gambar, {sub: x.sub, idIlus: x.id, ikonGrup: ikonTanya(x.t) || IKON_GRUP[g] || "i-bantuan"})));
    if (g === "Privasi") { const b = el("button", "lp-faq-tautan"); b.type = "button"; b.append("Kebijakan privasi lengkap", ikon("i-panah")); b.addEventListener("click", bukaPrivasi); w.append(b); }
    k.append(h, w); return k;
  });
  if (!cocok.length) isi.push(el("p", "lp-redup", "Tidak ada yang cocok. Coba kata lain."));
  $("daftarBantu").replaceChildren(...isi);
  tampilRingkas(semua, grupRingkas);
}
/* ringkasan bantuan di Beranda: deretan pilihan kelompok yang sama dengan layar Bantuan (pemilik 19 Nov 2026: "agar ada kaya gini di sini") */
let grupRingkas = "Semua";
function tampilRingkas(semua, g) {
  grupRingkas = g;
  const IK = {"Semua": "i-daftar", "Melapor": "i-kirim", "Istilah": "i-bantuan", "Status": "i-status", "Edukasi": "i-kejadian", "Privasi": "i-orang"};
  $("saringRingkas").replaceChildren(...GRUP.map(k => { const b = el("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === g));
    b.append(ikon(IK[k]), el("span", null, k), el("small", null, String(k === "Semua" ? semua.length : semua.filter(x => x.g === k).length)));
    b.addEventListener("click", () => tampilRingkas(semua, k)); return b; }));
  const pilih = g === "Semua" ? semua.filter(x => ["Melapor", "Istilah"].includes(x.g)) : semua.filter(x => x.g === g);
  $("daftarBantuRingkas").replaceChildren(...pilih.slice(0, 4).map(x => faqEl(x.t, x.isi, x.gambar, {sub: x.sub, idIlus: x.id, ikonGrup: ikonTanya(x.t) || IK[x.g] || "i-bantuan"})));
}
$("iCariBantu2").addEventListener("input", e => tampilBantu(e.target.value));
fetch("/lapor/edukasi.json", {signal: AbortSignal.timeout(10000)}).then(r => r.ok ? r.json() : null).then(j => { if (j?.topik?.length) { EDU = j; tampilBantu(); } }).catch(() => {});

/* ============ kebijakan privasi di dalam aplikasi (tata letak halaman legal; isi untuk layanan BNPB, draf menunggu tinjauan hukum) ============ */
/* isi kebijakan privasi (pemilik 25 Nov 2026: "lu riset lah gimana kebijakan privasi yang lengkap dan relevan"): urutan unsur pemberitahuan
   UU 27/2022 PDP (identitas pengendali, dasar, tujuan, jenis data, lama simpan, penerima, transfer, hak, kegagalan pelindungan), isi diambil dari
   data/kajian-bnpb/lapor-ai/KEAMANAN-PRIVASI.md. Butir "Label: isi" tampil sebagai ubin berlabel; elemen ketiga = ikon bagian. */
const PRIVASI = [
  ["Siapa kami", [["p", "Pantau Bencana adalah layanan pelaporan kejadian bencana milik Badan Nasional Penanggulangan Bencana (BNPB). BNPB adalah pengendali data pribadi yang Anda kirim lewat layanan ini, sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi dan Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana."]], "i-situs"],
  ["Data yang kami kumpulkan", [["p", "Saat Anda memakai Pantau Bencana BNPB, kami mencatat:"], ["ul", ["Identitas pelapor: nama, nomor WhatsApp, dan peran (warga atau petugas BPBD beserta kabupaten/kota dan jabatan).",
    "Isi laporan: jenis dan karakteristik kejadian, waktu kejadian, lokasi (titik GPS atau desa yang Anda pilih, RT dan RW), jumlah korban, pengungsi, dan kerusakan dalam bentuk angka, serta kebutuhan.",
    "Foto: gambar yang Anda ambil dari kamera beserta waktu dan lokasi pengambilannya.", "Percakapan: pesan dengan asisten AI, waktunya, dan nilai yang Anda berikan.",
    "Pesan suara: diubah menjadi teks di mesin BNPB. Rekaman suaranya tidak disimpan.",
    "Orang hilang dan kabar selamat: nama, ciri, tempat terakhir terlihat, dan nomor yang Anda isi sendiri.",
    "Peringatan dini: kode kecamatan yang Anda pilih dan alamat notifikasi perangkat."]],
    ["p", "Kami tidak meminta nama korban atau Nomor Induk Kependudukan. Nomor telepon, NIK, dan alamat surel yang tertulis di pesan disamarkan sebelum diproses asisten AI."]], "i-daftar"],
  ["Data di perangkat Anda", [["ul", ["Pilihan tampilan: bahasa, tema terang atau gelap, dan tanda tur sudah dilihat disimpan di peramban Anda.",
    "Laporan tanpa sinyal: lokasi, kronologi, dan foto disimpan sementara di HP sampai terkirim, paling lama 14 hari, tanpa nama dan nomor.",
    "Berkas aplikasi: hanya halaman dan gambar layanan yang disimpan supaya bisa dibuka cepat, bukan isi laporan."]],
    ["p", "Anda bisa menghapusnya kapan saja lewat pengaturan peramban atau tombol Buang pada laporan yang belum terkirim."]], "i-unduh"],
  ["Dasar pemrosesan", [["ul", ["Persetujuan: Anda setuju saat mulai melapor. Persetujuan dikabari dan peringatan dini diminta terpisah dan bisa dicabut.",
    "Tugas pelayanan publik: BNPB menjalankan penanggulangan bencana sesuai undang-undang.",
    "Kepentingan vital: menyelamatkan nyawa dan menolong korban saat keadaan darurat."]]], "i-status"],
  ["Untuk apa data dipakai", [["ul", ["Menyusun laporan kejadian bencana dan meneruskannya ke petugas BNPB dan BPBD yang menangani.", "Memeriksa kebenaran laporan dan menghubungi Anda bila perlu konfirmasi.",
    "Mengirim kabar status laporan ke Anda.", "Mengirim peringatan dini ke kecamatan yang Anda pilih.", "Mencocokkan kabar selamat dengan laporan orang dicari.",
    "Menyusun statistik kejadian tanpa identitas pelapor untuk perencanaan penanggulangan bencana."]], ["p", "Data tidak dijual dan tidak dipakai untuk iklan."]], "i-kirim"],
  ["Asisten AI", [["p", "Pesan Anda diproses asisten AI untuk menangkap isian laporan. Hanya teks pesan yang sudah disamarkan yang dikirim ke penyedia layanan AI; identitas, foto, dan koordinat Anda tidak dikirim. Angka hanya diterima bila tertulis di pesan Anda. Asisten AI tidak memutuskan status kejadian. Petugas yang memutuskan."]], "i-pesan"],
  ["Siapa yang dapat melihat", [["ul", ["Petugas: hanya petugas BNPB dan BPBD yang menangani kejadian di wilayah itu yang bisa membaca laporan dan identitas Anda.",
    "Publik: laporan tidak tampil di halaman publik. Laporan orang dicari juga tidak pernah publik.",
    "Pemegang tautan: halaman lacak hanya terbuka bagi pemegang tautan yang kami kirim kepada Anda. Jangan bagikan tautan itu."]]], "i-orang"],
  ["Layanan pihak lain", [["ul", ["Penyimpanan: data disimpan di layanan awan yang dikelola untuk BNPB.", "Pesan: kabar status dikirim lewat WhatsApp ke nomor Anda sendiri.",
    "Asisten AI: penyedia model bahasa menerima teks pesan yang sudah disamarkan."]],
    ["p", "Server penyedia ini bisa berada di luar Indonesia. Kami hanya mengirim data yang perlu untuk tiap layanan."]], "i-situs"],
  ["Penyimpanan dan keamanan", [["ul", ["Akses: terbatas pada petugas yang berwenang dan tercatat.", "Riwayat: status laporan tidak bisa diubah, hanya ditambah.",
    "Foto: data tersembunyi di dalam berkas dibersihkan sebelum disimpan.", "Tautan: kode di tautan disimpan dalam bentuk acak dan punya masa berlaku."]]], "i-kebutuhan"],
  ["Lama penyimpanan", [["ul", ["Laporan: 2 tahun sesudah selesai ditangani, sampai BNPB menetapkan aturan resmi.", "Kabar selamat: 30 hari.",
    "Langganan kabar: dihapus bila 90 hari tanpa laporan atau saat Anda berhenti.", "Teks pesan suara yang belum dikonfirmasi: paling lama 24 jam."]]], "i-kalender"],
  ["Hak Anda", [["p", "Sesuai Undang-Undang Nomor 27 Tahun 2022, Anda berhak:"], ["ul", ["Mendapat informasi: tentang data apa yang dipakai dan untuk apa, seperti di halaman ini.",
    "Melihat dan mendapat salinan: data yang kami simpan tentang Anda.", "Memperbaiki: data yang salah atau tidak lengkap.",
    "Menghapus: ketik \"hapus data\" di percakapan. Identitas dan percakapan Anda dihapus, isian kejadian tanpa data pribadi tetap disimpan untuk penanganan bencana.",
    "Menarik persetujuan: ketik \"berhenti kabar\" atau matikan peringatan dini kapan saja.",
    "Keberatan atas keputusan otomatis: keputusan atas laporan selalu dibuat petugas, bukan mesin."]]], "i-centang"],
  ["Bila terjadi kebocoran", [["p", "Bila data pribadi Anda bocor atau gagal dilindungi, BNPB memberi tahu Anda paling lambat 3 x 24 jam sesudah mengetahuinya, sesuai Undang-Undang Nomor 27 Tahun 2022, beserta data yang terdampak dan langkah yang diambil."]], "i-sirene"],
  ["Laporan palsu", [["p", "Laporan yang sengaja dibuat tidak benar menghambat penanganan bencana. Laporan yang terbukti tidak benar kami tandai tidak bisa ditindaklanjuti."]], "i-kejadian"],
  ["Perubahan kebijakan", [["p", "Kami bisa memperbarui kebijakan ini. Tanggal berlaku ada di bagian atas halaman."]], "i-putar"],
  ["Kontak", [["p", "Ada pertanyaan atau ingin memakai hak Anda? Hubungi BNPB lewat call center 117 atau persuratan@bnpb.go.id."]], "i-telepon"],
];
// ikon tiap butir menurut isinya (pemilik 25 Nov 2026: "kasih icon")
const IK_BUTIR = [[/^Identitas|^Petugas|^Pemegang/, "i-orang"], [/^Isi laporan|^Laporan:|^Menyusun laporan/, "i-daftar"], [/^Foto/, "i-kamera"], [/^Percakapan|^Asisten|^Pesan:/, "i-pesan"],
  [/^Pesan suara|^Teks pesan suara/, "i-mik"], [/^Orang hilang|^Mencocokkan/, "i-cari"], [/^Peringatan|^Mengirim peringatan/, "i-sirene"], [/^Pilihan tampilan/, "i-bahasa"],
  [/^Laporan tanpa sinyal|^Berkas aplikasi/, "i-unduh"], [/^Persetujuan|^Menarik/, "i-centang"], [/^Tugas pelayanan/, "i-situs"], [/^Kepentingan vital/, "i-sirene"],
  [/^Memeriksa/, "i-cari"], [/^Mengirim kabar|^Langganan|^Kabar/, "i-kirim"], [/^Menyusun statistik/, "i-kejadian"], [/^Publik/, "i-situs"], [/^Penyimpanan/, "i-kebutuhan"],
  [/^Akses|^Tautan/, "i-status"], [/^Riwayat/, "i-kalender"], [/^Mendapat informasi/, "i-bantuan"], [/^Melihat/, "i-salin"], [/^Memperbaiki/, "i-tambah-teks"],
  [/^Menghapus/, "i-tutup"], [/^Keberatan/, "i-orang"]];
function bukaPrivasi() {
  const w = $("isiPrivasi");
  if (!w.childElementCount) {
    const kp = el("header", "lp-legal-kepala"), mk = el("div", "lp-pita-maskot"); mk.setAttribute("aria-hidden", "true"); pasangMaskot(mk, "status"); kp.append(mk,el("p", "lp-alis lp-alis-terang", "Pantau Bencana BNPB"), el("h1", null, "Kebijakan privasi"), el("p", "lp-legal-catatan", "Ini draf uji coba. Bagian hukum BNPB akan meninjau isinya sebelum layanan dibuka untuk umum."));
    const daftar = el("ol", "lp-legal-daftar"), isi = el("div", "lp-legal-isi"), meta = el("dl", "lp-legal-meta");
    isi.append(el("p", null, "Kebijakan ini menjelaskan data apa yang dikumpulkan layanan Pantau Bencana BNPB, untuk apa data itu dipakai, siapa yang dapat melihatnya, dan hak Anda atas data tersebut."));
    const IK_LEGAL = PRIVASI.map(x => x[2] || "i-daftar");
    PRIVASI.forEach(([judul, blok], i) => {   // daftar isi berikon sama dengan kartunya (pemilik 25 Nov 2026: "kasih icon")
      const id = `privasi-${i + 1}`, a = Object.assign(el("a"), {href: `#${id}`}), u = el("span"); u.append(ikon(IK_LEGAL[i % IK_LEGAL.length])); a.append(u, judul);
      a.addEventListener("click", e => { e.preventDefault(); $(id).scrollIntoView({behavior: "smooth", block: "start"}); });
      const li = el("li"); li.append(a); daftar.append(li);
      isi.append(Object.assign(el("h2", null, `${i + 1}. ${judul}`), {id}));
      // butir "Label: isi" jadi ubin berlabel, kalimat "Kami tidak ..." jadi catatan tegas (pemilik 25 Nov 2026: "terlalu kata-kata banget")
      for (const [jenis, x] of blok) { if (jenis === "p") isi.append(el("p", /^Kami tidak/.test(x) ? "lp-legal-tegas" : null, x));
        else { const ul = el("ul", "lp-legal-butir"); x.forEach(b => { const m = b.match(/^([^:]{2,24}):\s*(.+)$/), li = el("li");
          li.append(ikon(IK_BUTIR.find(([r]) => r.test(b))?.[1] || "i-centang")); if (m) { const t = el("span"); t.append(el("b", null, m[1]), el("small", null, m[2].replace(/^./, c => c.toUpperCase()))); li.append(t); } else li.append(el("span", null, b));
          ul.append(li); }); isi.append(ul); } }
    });
    for (const [k, v] of [["Berlaku", "25 November 2026"], ["Jenis", "Kebijakan"], ["Untuk", "Pelapor"], ["Bahasa", "Indonesia"]]) meta.append(el("dt", null, k), el("dd", null, v));
    // bagian per h2 jadi kartu berikon (pemilik 19 Nov 2026: "bagusin"); pembuka tetap di atas kartu
    const anak = [...isi.children], kartuL = []; let kini = null, n = 0;
    for (const e of anak) { if (e.tagName === "H2") { kini = el("section", "lp-legal-kartu"); const h = el("h2"), u = el("span"); u.append(ikon(IK_LEGAL[n++ % IK_LEGAL.length])); h.id = e.id; h.append(u, e.textContent); kini.append(h); kartuL.push(kini); } else (kini || (kartuL.pembuka ||= el("div", "lp-legal-pembuka"))).append(e); }
    isi.replaceChildren(...(kartuL.pembuka ? [kartuL.pembuka] : []), ...kartuL);
    w.append(kp, daftar, isi, meta);
  }
  ke("privasi");
}
$("bTutupPrivasi").addEventListener("click", () => ke(kembaliKe || "beranda"));


/* balasan admin dan perubahan status (pemilik 19 Nov 2026: "bisa juga nanti dibalas sama admin") */
async function tarikKotak() {
  if (!wa || document.hidden) return;
  try {
    const j = await (await fetch(`/api/lapor/kotak?wa=${wa}&sejak=${cache.kotakSejak || 0}`, {signal: AbortSignal.timeout(10000)})).json();
    for (const k of j.pesan || []) { tambah("admin", `*${k.nomor}*\n${k.teks}`); cache.kotakSejak = Math.max(cache.kotakSejak || 0, k.waktu); $("titikBaru").hidden = false; }
    if (j.pesan?.length) { await segarkanLaporan(); tampilBeranda(); simpanCache(); }
  } catch {}
}

/* ============ info daerah, prediksi 3 hari, nomor penting: ringkasan langsung di chat (pemilik 19 Nov 2026) ============ */
const INFO = {info: ["Info bencana dan prediksi daerah", "Prakiraan, analisis daerah, dan peringatan dini", "i-lokasi"], prediksi: ["Prediksi 3 hari", "Hujan, banjir, longsor, asap, angin", "i-kalender"], penting: ["Nomor penting", "BPBD, rumah sakit, polisi, pemadam", "i-telepon"]};
let infoMode = "info";
function tambahInfo(dari, teks) {
  const li = el("li", `${dari} baru`);
  if (dari === "bot") { const img = el("img"); img.src = AVATAR; img.alt = ""; img.width = img.height = 28; li.append(img); }
  const g = el("div", "lp-gelembung"); teksWa(g, teks); li.append(g); $("logInfo").append(li);
  requestAnimationFrame(() => $("gulirInfo").scrollTo({top: $("gulirInfo").scrollHeight, behavior: "smooth"}));
}
function bukaInfo(mode) {
  infoMode = mode; ke("info"); sigapLayar("info");
  $("infoJudul").textContent = INFO[mode][0]; $("infoSub").textContent = INFO[mode][1];
  $("infoIkon").className = `lp-info-ikon ${mode}`; $("infoIkon").replaceChildren(ikon(INFO[mode][2])); // ikon layanan, bukan logo (pemilik 19 Nov 2026: "bagusin")
  $("logInfo").replaceChildren(); $("kartuInfo").replaceChildren();
  tambahInfo("bot", mode === "penting" ? "Nomor yang tampil adalah yang terdekat dari lokasi Anda. Pilih lokasinya dulu." : "Pilih daerahnya dulu.");
  if (cache.daerah) pilihDaerahTersimpan(); else kartuLokasiInfo();
}
function pilihDaerahTersimpan() { kartuLokasiInfo(); } // daerah terakhir jadi satu ubin di kartu lokasi, GPS dan cari langsung tersedia (pemilik 19 Nov 2026)
function kartuLokasiInfo() {
  const k = el("section", "lp-langkah lp-langkah-lok"), isi = el("div", "lp-langkah-isi");
  isiLokasi(isi, {judul: "Pilih daerah Anda", ket: "Informasi ditampilkan untuk kabupaten/kota tempat Anda berada.",
    pakaiPosisi: p => ambilDaerah({lat: p.coords.latitude, lon: p.coords.longitude}, "Lokasi saat ini"),
    pilihCari: d => ambilDaerah({kode: d.kode}, d.judul), kabupatenCukup: infoMode !== "penting",
    terakhir: cache.daerah ? (w => ({judul: w.wilayah.desa ? `Desa/Kel. ${w.wilayah.desa}` : w.wilayah.kab, sub: w.wilayah.desa ? `Kec. ${w.wilayah.kec}, ${w.wilayah.kab}` : w.wilayah.prov,
      aksi: () => ambilDaerah(w.q, w.wilayah.desa ? `Desa/Kel. ${w.wilayah.desa}` : w.wilayah.kab)}))(cache.daerah) : null});
  k.append(isi); $("kartuInfo").replaceChildren(k);
}
async function ambilDaerah(q, tampil) {
  const li = el("li", "saya baru"), g = el("div", "lp-gelembung", tampil); li.append(g); $("logInfo").append(li);
  $("kartuInfo").replaceChildren(Object.assign(el("p", "lp-mengetik"), {innerHTML: '<span class="lp-gelembung-titik"><i></i><i></i><i></i></span>'}));
  const qs = new URLSearchParams(q).toString();
  try {
    if (infoMode === "penting") {
      const r = await fetch(`/api/lapor/penting?${qs}`), j = await r.json(); if (!r.ok) throw new Error(j.galat);
      cache.daerah = {q, wilayah: j.wilayah}; simpanCache();
      tambahInfo("bot", j.wilayah.desa ? `*Nomor penting sekitar Desa/Kel. ${j.wilayah.desa}*\nKec. ${j.wilayah.kec}, ${j.wilayah.kab}` : `*Nomor penting di ${j.wilayah.kab}*\nJarak dihitung dari kantor BPBD. Pakai lokasi saat ini untuk jarak dari tempat Anda.`);
      $("kartuInfo").replaceChildren(kartuPenting(j), opsiLanjut(q));
    } else {
      const rap = infoMode === "info" ? fetch(`/api/lapor/rapor?${qs}`).then(r => r.ok ? r.json() : null).catch(() => null) : null;   // rapor daerah ikut di Info (K89), gagal = dilewati
      const r = await fetch(`/api/lapor/daerah?${qs}`), j = await r.json(); if (!r.ok) throw new Error(j.galat);
      cache.daerah = {q, wilayah: j.wilayah}; simpanCache();
      // info dan prediksi digabung (pemilik 19 Nov 2026): hari ini dengan imbauan, lalu prakiraan 3 hari
      if (j.perHari?.length) { if (infoMode !== "prediksi") kartuPrediksi(j, true); kartuPrediksi(j); } else tambahInfo("bot", infoMode === "prediksi" ? j.prediksi : j.info);
      const jr = await rap; if (jr) kartuRapor(jr);
      // peringatan dini kecamatan ikut di Info (pemilik 25 Nov 2026), diisi peringatan.js
      if (infoMode === "info" && window.pbKartuPeringatan) { const li = el("li", "bot baru lp-pred-li"), w = el("div", "lp-pw-info"); li.append(w); $("logInfo").append(li); window.pbKartuPeringatan(w); }
      $("kartuInfo").replaceChildren(opsiLanjut(q));
    }
  } catch (e) { tambahInfo("bot", `${e.message || "Data belum bisa dimuat"}. Coba lagi.`); kartuLokasiInfo(); }
}
/* analisis daerah (pemilik 22 Nov 2026, KEPUTUSAN-LAPOR-AI K89; nama "Analisis daerah" 24 Nov 2026): angka sama dengan tab Wilayah /akademisi; data kosong tidak ditulis 0.
   24 Nov 2026 (pemilik: "jelek banget"): status darurat jadi spanduk dengan daftar ancaman, risiko dan kejadian jadi ubin selebar kartu */
const KELAS_LV = {"Rendah": 0, "Sedang": 1, "Tinggi": 2, "Sangat tinggi": 3};
function kartuRapor(j) {
  const li = el("li", "bot baru lp-pred-li"), w = el("div", "lp-pred lp-an"), kp = el("div", "lp-pred-kepala"), angka = v => v.toLocaleString("id-ID");
  const tgl = t => new Date(`${t}T00:00:00Z`).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
  const kpIk = el("span", "lp-pred-ik"); kpIk.append(ikon("i-kejadian"));
  const kpT = el("span", "lp-pred-judul"); kpT.append(el("b", null, "Analisis daerah"), el("small", null, `${j.kab}, ${j.prov}`)); kp.append(kpIk, kpT); w.append(kp);
  // kondisi sekarang: satu spanduk per status darurat, gunung api, dan titik panas
  for (const x of j.darurat || []) {
    const sp = el("section", "lp-an-status"), ik = el("span", "lp-an-status-ik"); ik.append(ikon("i-sirene"));
    const t = el("div", "lp-an-status-isi"), kep = el("div", "lp-an-status-kep"); kep.append(el("b", null, x.status), ...(x.berakhir ? [el("small", null, `berlaku sampai ${tgl(x.berakhir)}`)] : []));
    const daftar = el("ul", "lp-an-jenis"); for (const jn of String(x.jenis).split(/,\s*/).filter(Boolean)) { const l = el("li"); l.append(ikon(IKON_ANCAMAN(jn)), jn); daftar.append(l); }
    t.append(kep, daftar); sp.append(ik, t); w.append(sp);
  }
  const lain = [];
  for (const g of j.gunung || []) lain.push([`Gunung ${g.nama}`, `${g.tingkat}, ${angka(g.jarakKm)} km`, `lv${g.level - 1}`, "b-gunung"]);
  if (j.titik) lain.push(["Titik panas 24 jam", angka(j.titik.n), j.titik.n ? "lv1" : "", "b-api"]);
  if (lain.length) { const d = el("div", "lp-an-lain"); for (const [nm, nilai, lv, ik] of lain) { const r = el("div", `lp-an-lain-baris ${lv}`); r.append(ikon(ik), el("span", null, nm), el("b", null, nilai)); d.append(r); } w.append(d); }
  // ubin angka: tingkat risiko dan kejadian setahun, mengisi selebar kartu
  const kisi = el("div", "lp-an-kisi"), ubin = (judul, ik) => { const c = el("section", "lp-an-ubin"), h = el("h4"); h.append(ikon(ik), judul); c.append(h); kisi.append(c); return c; };
  const r = j.risiko, c1 = ubin("Tingkat risiko", "i-kejadian");
  if (r) {
    const lv = KELAS_LV[r.kelas] ?? 0, n = el("div", `lp-an-nilai lv${lv}`); n.append(el("b", null, r.kelas), el("small", null, `${angka(r.kecamatan)} kecamatan dinilai`)); c1.append(n);
    const meter = el("div", "lp-an-meter"); meter.setAttribute("aria-hidden", "true"); for (let i = 0; i < 4; i++) meter.append(el("i", i <= lv ? `isi lv${lv}` : "")); c1.append(meter);
    // bahaya utama tiap kecamatan dan semua kecamatan berisiko tinggi (pemilik 25 Nov 2026: "10 kecamatan tapi cuma tiga, ga ngasih bahayanya")
    const NAMA_BAHAYA = {banjir: "Banjir", cuaca: "Cuaca ekstrem", gempa: "Gempa", gunungapi: "Gunung api", karhutla: "Kebakaran hutan dan lahan", kekeringan: "Kekeringan"};
    const IK_BAHAYA = {banjir: "b-banjir", cuaca: "b-angin", gempa: "b-gempa", gunungapi: "b-gunung", karhutla: "b-api", kekeringan: "b-matahari"};
    if (r.bahayaUtama?.length) { const d = el("div", "lp-an-bahaya"); d.append(el("p", "lp-an-sub", "Bahaya utama per kecamatan"));
      const ul = el("ul"); for (const x of r.bahayaUtama) { const l = el("li"); l.append(ikon(IK_BAHAYA[x.bahaya] || "i-kejadian"), el("span", null, NAMA_BAHAYA[x.bahaya] || x.bahaya), el("b", null, `${angka(x.n)} kec.`)); ul.append(l); } d.append(ul); c1.append(d); }
    if (r.kecTinggi) { const d = el("div", "lp-an-tinggi"); d.append(el("p", "lp-an-sub", `${angka(r.kecTinggi)} kecamatan berisiko tinggi`));
      const ul = el("ul"); for (const x of r.daftarTinggi || (r.contohTinggi || []).map(kec => ({kec}))) { const l = el("li");
        l.append(el("b", null, x.kec), ...(x.bahaya ? [(t => (t.append(ikon(IK_BAHAYA[x.bahaya] || "i-kejadian"), NAMA_BAHAYA[x.bahaya] || x.bahaya), t))(el("span", "lp-an-pil"))] : []),
          ...(x.kelas ? [el("span", `lp-an-kelas lv${KELAS_LV[x.kelas] ?? 0}`, x.kelas)] : [])); ul.append(l); }
      d.append(ul); c1.append(d); }
  } else c1.append(el("p", "lp-an-kosong", "Belum ada data"));
  const k = j.kejadian;
  if (k) {
    const c2 = ubin("Kejadian setahun terakhir", "i-kalender"), n = el("div", "lp-an-nilai"); n.append(el("b", null, angka(k.total)), el("small", null, `kejadian di DIBI BNPB, ${tgl(k.dari)} sampai ${tgl(k.sampai)}`)); c2.append(n);
    if (k.jenis.length) { const maks = Math.max(...k.jenis.map(x => x.n)), ul = el("ul", "lp-an-batang");
      for (const x of k.jenis) { const l = el("li"), bar = el("i"); bar.style.inlineSize = `${Math.max(6, x.n / maks * 100)}%`; l.append(ikon(IKON_ANCAMAN(x.jenis)), el("span", null, x.jenis), el("span", "lp-an-batang-jalur", null), el("b", null, angka(x.n))); l.querySelector(".lp-an-batang-jalur").append(bar); ul.append(l); }
      c2.append(ul); }
  }
  w.append(kisi); li.append(w); $("logInfo").append(li);
  requestAnimationFrame(() => $("gulirInfo").scrollTo({top: $("gulirInfo").scrollHeight, behavior: "smooth"}));
}
/* prediksi 3 hari sebagai kartu per hari: curah hujan besar berikon, ancaman berwarna per tingkat (pemilik 19 Nov 2026: "bagusin") */
// ikon pil ancaman (pemilik 21 Nov 2026: "kasih icon")
const IKON_ANCAMAN = t => /asap|pm2/i.test(t) ? "k-daun" : /banjir/i.test(t) ? "b-banjir" : /longsor/i.test(t) ? "b-longsor" : /angin|puting/i.test(t) ? "b-angin"
  : /rob|gelombang|abrasi/i.test(t) ? "b-gelombang" : /panas|api|karhutla/i.test(t) ? "b-api" : /kering/i.test(t) ? "b-matahari" : /petir|hujan/i.test(t) ? "b-hujan" : "i-kejadian";
function kartuPrediksi(j, hariIni = false) { // hariIni: format yang sama untuk Info hari ini, satu hari plus imbauan
  const li = el("li", "bot baru lp-pred-li"), w = el("div", "lp-pred"), kp = el("div", "lp-pred-kepala");
  const lok = j.wilayah?.desa ? `Desa/Kel. ${j.wilayah.desa}, Kec. ${j.wilayah.kec}, ${j.kab}` : `${j.kab}, ${j.prov}`;
  // kepala berikon, lokasi di baris kedua, waktu pembaruan sebagai pil (pemilik 21 Nov 2026: "bagusin")
  const kpIk = el("span", "lp-pred-ik"); kpIk.append(ikon(hariIni ? "i-lokasi" : "i-kalender"));
  const kpT = el("span", "lp-pred-judul"); kpT.append(el("b", null, hariIni ? "Info hari ini" : "Prediksi 3 hari"), el("small", null, hariIni ? lok : j.kab));
  const kpW = el("span", "lp-pred-waktu"); kpW.append(ikon("k-jam"), `Diperbarui ${j.dibuat} WIB`);
  kp.append(kpIk, kpT, kpW); w.append(kp);
  const kisi = el("div", `lp-pred-kisi${hariIni ? " hari-ini" : ""}`);
  for (const h of hariIni ? j.perHari.slice(0, 1) : j.perHari) {
    const c = el("section", "lp-pred-hari"), [hr, ...tg] = String(h.tanggal).split(", "), h4 = el("h4");
    h4.append(el("b", null, hr), ...(tg.length ? [el("small", null, tg.join(", "))] : [])); c.append(h4);
    const mm = h.hujanMm, kat = mm == null ? null : mm < 1 ? "Tidak hujan" : mm > 150 ? "Ekstrem" : mm > 100 ? "Sangat lebat" : mm > 50 ? "Lebat" : mm > 20 ? "Sedang" : "Ringan";
    const hj = el("div", `lp-pred-hujan ${mm > 50 ? "tinggi" : mm > 20 ? "sedang" : ""}`); hj.append(ikon(mm > 50 ? "b-petir" : "b-hujan"));
    const ht = el("span"); ht.append(el("b", null, mm == null ? "Tidak ada data" : `${mm.toLocaleString("id-ID")} mm`), el("small", null, kat ? `Hujan ${kat.toLowerCase()}${mm >= 5 && h.puncak != null ? `, puncak pukul ${String(h.puncak).padStart(2, "0")}.00` : ""}` : "")); hj.append(ht); c.append(hj);
    // ancaman sebagai baris berlabel tingkat, tingkat tertinggi memberi garis warna di kartu hari (pemilik 24 Nov 2026: "bagusin")
    const an = el("ul", "lp-pr-ancaman"), lvMaks = Math.max(0, ...h.ancaman.map(a => a.lv));
    if (!h.ancaman.length) an.append(el("li", "lp-pr-normal", "Semua ancaman di tingkat Normal"));
    for (const a of h.ancaman) { const r = el("li"); r.append(ikon(IKON_ANCAMAN(a.label)), el("span", null, a.label), el("b", `lp-pr-tingkat lv${a.lv}`, a.tingkat)); an.append(r); }
    c.classList.add(`lv${lvMaks}`); c.append(an); kisi.append(c);
  }
  if (hariIni) { // imbauan dari aturan dampak /prediksi, satu kartu dengan cuaca hari ini (pemilik 24 Nov 2026: "bagusin")
    const im = el("section", "lp-pred-imbauan"), h4 = el("h4"); h4.append(ikon("i-sirene"), "Imbauan"); im.append(h4);
    if (!j.waspada?.length) im.append(el("p", "lp-redup", "Belum ada imbauan khusus untuk daerah ini."));
    // imbauan sama di beberapa hari digabung jadi satu baris, imbauan berbeda berjajar sebaris (pemilik 19 Nov 2026: "agar dibuat sebaris")
    const per = new Map(); for (const x of j.waspada || []) per.set(x.maka, [...(per.get(x.maka) || []), x.hari]);
    const baris = el("div", "lp-pred-imb-baris");
    for (const [maka, hari] of per) { const r = el("div", "lp-pred-imb"), ic = el("span"); ic.append(ikon("i-kejadian")); const tx = el("span"); tx.append(el("b", null, maka), el("small", null, hari.join(" dan "))); r.append(ic, tx); baris.append(r); }
    if (per.size) im.append(baris);
    kisi.append(im);
  }
  w.append(kisi); li.append(w); $("logInfo").append(li);
  requestAnimationFrame(() => $("gulirInfo").scrollTo({top: $("gulirInfo").scrollHeight, behavior: "smooth"}));
}
/* pilihan lanjutan di layar info: berikon, selalu ada sesudah info, prediksi, dan nomor penting (pemilik 19 Nov 2026) */
function opsiLanjut(q) {
  const d = el("div", "lp-opsi lp-opsi-ikon lp-opsi-banyak lp-lanjut");
  const pilih = [["info", "Info dan prediksi", "i-lokasi"], ["penting", "Nomor penting", "i-telepon"]].filter(([m]) => m !== infoMode && !(m === "info" && infoMode === "prediksi"))
    .map(([m, t, ik]) => [t, ik, () => { infoMode = m; ambilDaerah(q, t); }]);
  for (const [t, ik, f, kelas] of [...pilih, ["Lapor kejadian", "i-kirim", bukaChat, "utama"], ["Daerah lain", "i-cari", kartuLokasiInfo]]) {
    const b = tombolOpsi(t, null, f, kelas || ""); const u = el("span", "lp-opsi-ubin"); u.append(ikon(ik)); b.prepend(u); d.append(b); }
  d.style.setProperty("--kol", d.children.length); // sebaris sampai ujung (pemilik 19 Nov 2026)
  return d;
}
const peta = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
function kartuPenting(j) {
  const k = el("section", "lp-langkah"), kp = el("div", "lp-langkah-kepala"), isi = el("div", "lp-langkah-isi"); kp.append(ikon("i-telepon"), "Nomor penting");
  const kisi = el("div", "lp-kontak-kisi");
  const IK_NAS = {112: "i-telepon", 113: "i-kejadian", 119: "i-korban", 110: "i-orang", 115: "i-cari", 117: "i-status"};
  for (const n of j.nasional) { const a = Object.assign(el("a"), {href: `tel:${n.nomor}`}); const u = el("span", "lp-nas-ikon"); u.append(ikon(IK_NAS[n.nomor] || "i-telepon")); a.append(u, el("b", null, n.nomor), el("small", null, n.label)); kisi.append(a); }
  // tiap jenis fasilitas satu kompartemen berikon, tersusun berkolom selebar layar (pemilik 19 Nov 2026: "white space di kiri banyak banget")
  const kolom = el("div", "lp-kontak-kolom");
  const grup = (judul, ik, isiFn) => { const g = el("section", `lp-kontak-grup g-${ik.replace("i-", "")}`), h = el("h3"); h.append(ikon(ik), judul); const daftar = el("div", "lp-kontak"); isiFn(daftar); g.append(h, daftar); kolom.append(g); };
  // baris fasilitas: ikon jenis, nama dengan label jarak berikon sebaris, alamat di bawah, tombol berikon (pemilik 19 Nov 2026: "jarak dibuat ikon dan label, satu baris")
  const baris = (judul, {ik, km, alamat}, kanan, href, merah) => { const a = Object.assign(el(href ? "a" : "div", "lp-fas"), href ? {href, target: href.startsWith("http") ? "_blank" : "", rel: "noopener"} : {});
    const u = el("span", "lp-fas-ikon"); u.append(ikon(ik)); const t = el("span", "lp-fas-teks"), atas = el("span", "lp-fas-atas"); atas.append(el("b", null, judul));
    if (km != null) { const l = el("span", "lp-fas-jarak"); l.append(ikon("i-lokasi"), `${km.toLocaleString("id-ID")} km`); atas.append(l); }
    t.append(atas); if (alamat) t.append(el("small", null, alamat)); a.append(u, t);
    if (kanan) { const k = el("span", `no${merah ? " merah" : ""}`); k.append(ikon(merah ? "i-telepon" : "i-arah"), el("span", "lp-no-teks", kanan)); k.title = kanan; a.append(k); } return a; };
  if (j.bpbd) grup("BPBD", "i-status", daftar => {   // tanpa j.bpbd: kartu sementara berisi nomor nasional saja (kartuPentingLapor)
    for (const b of j.bpbd) daftar.append(baris(b.nama, {ik: "i-status", km: b.jarakKm, alamat: b.alamat}, b.nomor ? "Telepon" : "Arah", b.nomor ? `tel:${b.nomor.replace(/[^\d+]/g, "")}` : peta(b.lat, b.lon), !!b.nomor));
    if (!j.bpbd.length) daftar.append(baris("BPBD setempat", {ik: "i-status", alamat: "Nomor belum tercatat di data kami. Hubungi 112."}, "112", "tel:112", true)); });
  for (const [judul, list, ik] of [["Rumah sakit terdekat", j.rs, "i-fasilitas"], ["Puskesmas terdekat", j.puskesmas, "i-korban"], ["Kantor polisi terdekat", j.polisi, "i-orang"]])
    if (list?.length) grup(judul, ik, daftar => { for (const x of list) {
      // nomor dari OpenStreetMap bila tercatat: tombol Telepon di samping Arah (pemilik 25 Nov 2026: "dilengkapi dengan nomor hapenya")
      if (!x.nomor) { daftar.append(baris(x.nama, {ik, km: x.jarakKm}, "Arah", peta(x.lat, x.lon))); continue; }
      const r = baris(x.nama, {ik, km: x.jarakKm, alamat: x.nomor.replace(/^\+62(21|22|24|31|61)/, "0$1 ").replace(/^\+62/, "0")}, null, null); r.classList.add("dua-aksi");   // baris bukan tautan: dua tombol sendiri
      const tombol = (kls, href, ikn, label) => { const t = Object.assign(el("a", kls), {href, title: label}); if (href.startsWith("http")) Object.assign(t, {target: "_blank", rel: "noopener"}); t.setAttribute("aria-label", `${label}, ${x.nama}`); t.append(ikon(ikn), el("span", "lp-no-teks", label)); return t; };
      r.append(tombol("no merah", `tel:${x.nomor}`, "i-telepon", "Telepon"), tombol("no", peta(x.lat, x.lon), "i-arah", "Arah"));
      daftar.append(r); } });
  k.classList.add("lp-langkah-penting");
  kolom.style.setProperty("--kol", kolom.childElementCount);
  const nas = el("section", "lp-kontak-grup nasional"), hn = el("h3"); hn.append(ikon("i-telepon"), "Nomor darurat nasional"); nas.append(hn, kisi);
  isi.append(nas); if (kolom.childElementCount) isi.append(kolom);
  k.append(kp, isi); return k;
}
/* nomor penting sesudah laporan terkirim (pemilik 26 Nov 2026: "harusnya dia dikasih nomor penting ini"): kartu yang sama dengan menu Nomor penting,
   terdekat dari lokasi laporan. Nomor nasional tampil seketika (jalan tanpa data); bila lokasi tidak ada atau gagal dimuat, tombol membuka menu Nomor penting. */
const acuanPenting = L => L?.kode ? {kode: L.kode} : L && Number.isFinite(L.lat) && Number.isFinite(L.lon) ? {lat: +L.lat.toFixed(3), lon: +L.lon.toFixed(3)} : null;
function kartuPentingLapor(lok) {
  const k = kartuPenting({nasional: NOMOR_NASIONAL.map(([nomor, label]) => ({nomor, label}))}), kp = k.querySelector(".lp-langkah-kepala");
  const dekat = () => { const b = el("button", "lp-tk-np-terdekat"); b.type = "button"; b.append(ikon("i-lokasi"), "Lihat yang terdekat"); b.addEventListener("click", () => { b.closest("dialog")?.close(); bukaInfo("penting"); }); kp.append(b); };
  if (!lok) { dekat(); return k; }
  fetch(`/api/lapor/penting?${new URLSearchParams(lok)}`, {signal: AbortSignal.timeout(15000)}).then(r => r.ok ? r.json() : null)
    .then(j => { if (j?.wilayah && k.isConnected) k.replaceWith(kartuPenting(j)); else dekat(); }).catch(dekat);
  return k;
}
$("bTutupInfo").addEventListener("click", () => { ke("beranda"); tampilBeranda(); });

/* ============ Alun-alun (K30, Q14, K59): hanya laporan ditindaklanjuti atau selesai, tanpa identitas pelapor ============
   Peta titik pusat desa (D84), satu kartu per gugus dengan "N warga melapor" (D85), Ikuti kejadian di perangkat tanpa akun (D86):
   daftar id kartu dan status terakhir yang dilihat disimpan di localStorage; kartu yang statusnya berubah ditandai. */
let alunJenis = "", alunJenisPilih = new Set(), alunJenisAda = null, alunPeta = null, alunData = [], alunKabar, alunSumber = "", alunGiliran = 0;   // alunKabar: undefined = belum dicoba, null = tidak ada berkas resmi
const ikutiBaca = () => { try { return JSON.parse(localStorage.getItem("lapor-ikuti") || "{}"); } catch { return {}; } };
const ikutiTulis = x => { try { localStorage.setItem("lapor-ikuti", JSON.stringify(x)); } catch {} };
// MapLibre butuh warna jadi (tanpa var() dan oklch): token tema diubah ke rgb lewat kanvas 1 piksel
const tok = v => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = getComputedStyle(document.body).getPropertyValue(v).trim() || "gray"; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${b})`; };
function muatMaplibre() { // dimuat saat Alun-alun pertama dibuka saja (berkas besar, tidak perlu di beranda)
  if (window.maplibregl) return Promise.resolve();
  return muatMaplibre.janji ||= new Promise((ok, gagal) => { const l = Object.assign(document.createElement("link"), {rel: "stylesheet", href: "/vendor/maplibre/maplibre-gl.css"}); document.head.append(l);
    const sc = Object.assign(document.createElement("script"), {src: "/vendor/maplibre/maplibre-gl.js"}); sc.onload = ok; sc.onerror = gagal; document.head.append(sc); });
}
function kartuAlun(x, ikut) {
  const a = el("article", "lp-alun-kartu"), g = el("div", "lp-alun-gambar"); if (GAMBAR[x.jenisId]) g.style.backgroundImage = `url(/img/bencana-${GAMBAR[x.jenisId]}.jpg)`;
  a.id = `alun-${x.id}`;
  g.append(el("span", `lp-pil ${x.status}`, x.statusLabel));
  const berubah = ikut[x.id] && ikut[x.id] !== x.status; if (berubah) g.append(el("span", "lp-pil lp-alun-berubah", "Status berubah"));
  const isi = el("div", "lp-alun-isi");
  isi.append(el("b", null, `${x.jenis}${x.subjenis ? `, ${x.subjenis.toLowerCase()}` : ""}`),
    el("small", null, [x.lokasi.desa && `Desa/Kel. ${x.lokasi.desa}`, x.lokasi.kec && `Kec. ${x.lokasi.kec}`, x.lokasi.kab, x.lokasi.prov].filter(Boolean).join(", ")),
    el("small", "lp-redup", `${x.waktu || "Waktu belum didata"}, dilaporkan ${x.tingkat.toLowerCase()}`));
  if (x.nWarga) { const n = el("p", "lp-alun-warga"); n.append(ikon("i-orang"), `${x.nWarga.toLocaleString("id-ID")} warga melapor kejadian ini`); isi.append(n); }
  const d = el("div", "lp-alun-dampak");
  for (const [k, t, i] of [["meninggal", "meninggal", "i-korban"], ["hilang", "hilang", "i-cari"], ["luka", "luka", "i-plus"], ["mengungsi", "mengungsi", "i-pengungsian"], ["rumah", "rumah rusak", "i-rumah"], ["terendam", "rumah terendam", "b-banjir"]])
    if (x.dampak[k]) { const p = el("span"); p.append(ikon(i), `${x.dampak[k].toLocaleString("id-ID")} ${t}`); d.append(p); }
  if (d.childElementCount) isi.append(d);
  if (x.bukti?.length) { const bk = el("div", "lp-alun-bukti"); bk.append(el("small", null, "Foto penanganan petugas"));
    const kisi = el("div"); for (const u of x.bukti) { const im = el("img"); im.src = u; im.alt = "Foto penanganan oleh petugas"; im.loading = "lazy"; kisi.append(im); } bk.append(kisi); isi.append(bk); }
  const ik = el("button", `lp-kedua lp-alun-ikuti${ikut[x.id] ? " aktif" : ""}`); ik.type = "button"; ik.setAttribute("aria-pressed", String(!!ikut[x.id]));
  ik.append(ikon(ikut[x.id] ? "i-centang" : "i-plus"), ikut[x.id] ? "Diikuti" : "Ikuti kejadian");
  ik.title = "Disimpan di perangkat ini. Kartu ditandai saat statusnya berubah.";
  ik.addEventListener("click", () => { const m = ikutiBaca(); if (m[x.id]) delete m[x.id]; else m[x.id] = x.status; ikutiTulis(m); gambarAlun(); });
  isi.append(ik);
  a.append(g, isi, kabarWarga(x.id)); return a;
}
/* Kabar warga (K95, LA-87): komentar biasa di tiap kartu, dibaca mesin dan diperiksa petugas. Komentar dimuat saat bagian dibuka, bukan saat peta dimuat
   (GET di-cache tepi 30 detik; komentar sendiri tampil dari jawaban POST). Teks warga selalu lewat textContent.
   Satu node per kartu dibuat sekali lalu dipakai ulang saat daftar digambar ulang (Ikuti kejadian, saringan): draf dan keadaan buka tidak hilang,
   dan kartu yang belum dibuka hanya membawa tombolnya (form dibuat saat pertama dibuka). Daftar menampilkan 30 kabar terbaru; sisanya lewat tombol. */
const kabarNode = new Map(), kabarIsi = new Map(), KABAR_AWAL = 30;
const kapan = ms => { const d = (Date.now() - ms) / 60e3; if (d < 2) return "baru saja"; if (d < 60) return `${Math.floor(d)} menit lalu`; if (d < 1440) return `${Math.floor(d / 60)} jam lalu`;
  const t = new Date(ms); return `${t.getDate()} ${BULAN[t.getMonth()]} ${String(t.getHours()).padStart(2, "0")}.${String(t.getMinutes()).padStart(2, "0")}`; };
const nomorKetik = () => wa && !String(wa).startsWith("sesi-") ? {wa} : {};   // sesi /masuk: nomor dari sesi di server
function kabarWarga(kartu) {
  if (kabarNode.has(kartu)) return kabarNode.get(kartu);
  const w = el("section", "lp-kabar"), buka = el("button", "lp-kabar-buka"), isi = el("div", "lp-kabar-isi"), jumlah = el("span", "lp-kabar-n");
  buka.type = "button"; isi.id = `kabar-${kartu}`; isi.hidden = true; buka.setAttribute("aria-controls", isi.id); buka.setAttribute("aria-expanded", "false");
  buka.append(ikon("i-pesan"), el("span", null, "Kabar warga"), jumlah, ikon("i-panah", "lp-kabar-panah"));   // angka di span sendiri: label tetap diterjemahkan, angka tidak dikirim ke penerjemah
  const hitung = () => { const n = kabarIsi.get(kartu)?.length; jumlah.textContent = n ? n.toLocaleString("id-ID") : ""; };
  let daftar = null, pesan = null, semua = false, memuat = false;
  const gambar = () => { const k = kabarIsi.get(kartu); hitung();
    if (!k) return daftar.replaceChildren(el("li", "lp-redup", "Memuat kabar warga..."));
    if (!k.length) return daftar.replaceChildren(el("li", "lp-redup", "Belum ada kabar. Ceritakan kondisi terbaru di lokasi ini."));
    const tampil = semua ? k : k.slice(-KABAR_AWAL), baris = [];
    if (tampil.length < k.length) { const li = el("li", "lp-kabar-lagi"), lb = el("button", "lp-teks-tombol", `Tampilkan ${(k.length - tampil.length).toLocaleString("id-ID")} kabar sebelumnya`);
      lb.type = "button"; lb.dataset.aksi = "lagi"; li.append(lb); baris.push(li); }
    for (const c of tampil) { const li = el("li"), kp = el("div", "lp-kabar-kepala"), ad = el("button", "lp-teks-tombol lp-kabar-adu", "Laporkan");
      ad.type = "button"; ad.dataset.aksi = "adu"; ad.dataset.id = c.id; ad.title = "Laporkan kabar yang kasar, bohong, atau memuat data pribadi";
      kp.append(el("b", null, "Warga"), el("small", "lp-redup lp-kabar-kapan", kapan(c.waktu)), ad); li.append(kp, el("p", "lp-kabar-teks", c.teks)); baris.push(li); }
    daftar.replaceChildren(...baris); };
  const muat = async () => { if (kabarIsi.has(kartu)) return gambar(); if (memuat) return; memuat = true; gambar();
    try { const j = await (await fetch(`/api/lapor/komen/${kartu}`, {signal: AbortSignal.timeout(10000)})).json(); kabarIsi.set(kartu, j.komen || []); gambar(); }
    catch { daftar.replaceChildren(el("li", "lp-redup", "Kabar warga belum bisa dimuat. Tutup lalu buka lagi.")); }
    finally { memuat = false; } };
  /* isi bagian dibuat saat pertama dibuka; satu pendengar untuk Laporkan dan Tampilkan lagi (delegasi) */
  const bangun = () => {
    daftar = el("ul", "lp-kabar-daftar"); pesan = el("p", "lp-kabar-pesan"); pesan.setAttribute("role", "status");
    daftar.addEventListener("click", e => { const t = e.target.closest("button[data-aksi]"); if (!t) return;
      if (t.dataset.aksi === "lagi") { semua = true; gambar(); } else laporkanKabar(t.dataset.id, t); });
    const f = el("form", "lp-kabar-tulis"), ta = el("textarea"), kirimB = el("button", "lp-utama");
    ta.name = "teks"; ta.maxLength = 500; ta.rows = 2; ta.required = true; ta.placeholder = "Kondisi terbaru di lokasi, misalnya air mulai surut atau jalan masih tertutup";
    ta.setAttribute("aria-label", "Tulis kabar warga");
    /* nomor WA wajib seperti saat melapor (K95); tanpa nomor tersimpan, kolom nomor tampil di atas tombol Kirim */
    const nomor = el("label", "lp-kabar-nomor"), iN = el("input"); iN.type = "tel"; iN.inputMode = "numeric"; iN.autocomplete = "tel-national"; iN.placeholder = "812 3456 7890";
    nomor.append(el("span", null, "Nomor WhatsApp Anda"), el("span", "lp-kabar-62", "+62"), iN); nomor.hidden = !!wa;
    iN.addEventListener("input", () => { let v = iN.value.replace(/\D/g, ""); if (v.startsWith("62")) v = v.slice(2); if (v.startsWith("0")) v = v.slice(1); iN.value = v.slice(0, 13); });
    kirimB.type = "submit"; kirimB.append(ikon("i-kirim"), "Kirim");
    const bawah = el("div", "lp-kabar-bawah"); bawah.append(el("small", "lp-redup", "Nomor HP dan alamat rinci dihapus otomatis. Nomor WhatsApp Anda tidak ditampilkan."), kirimB);
    f.append(ta, nomor, bawah, pesan);
    f.addEventListener("submit", async e => {
      e.preventDefault(); pesan.textContent = "";
      if (!wa && !/^8\d{8,12}$/.test(iN.value)) { pesan.textContent = "Isi nomor WhatsApp yang dimulai dengan 8, misalnya 812 3456 7890."; return iN.focus(); }
      const pakai = wa ? nomorKetik() : {wa: `62${iN.value}`};
      kirimB.disabled = true;
      try {
        const r = await fetch(`/api/lapor/komen/${kartu}`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({teks: ta.value, ...pakai}), signal: AbortSignal.timeout(15000)});
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { pesan.textContent = j.galat || "Kabar belum terkirim. Coba lagi."; return; }
        if (!wa) { wa = pakai.wa; simpan.tulis("lapor-wa", wa); for (const n of document.querySelectorAll(".lp-kabar-nomor")) n.hidden = true; }   // nomor dipakai lagi untuk kabar dan laporan berikutnya
        kabarIsi.set(kartu, [...(kabarIsi.get(kartu) || []), j.komen]); ta.value = ""; gambar();
        pesan.textContent = /dihapus\]/.test(j.komen.teks) ? "Terkirim. Nomor atau alamat rinci di kabar Anda sudah dihapus." : "Terkirim.";
      } catch { pesan.textContent = "Kabar belum terkirim. Periksa sinyal lalu coba lagi."; }
      finally { kirimB.disabled = false; }
    });
    isi.append(daftar, f);
  };
  buka.addEventListener("click", () => { const b = isi.hidden; isi.hidden = !b; buka.setAttribute("aria-expanded", String(b)); if (b) { if (!daftar) bangun(); muat(); } });
  w.append(buka, isi); kabarNode.set(kartu, w);
  return w;
}
/* Laporkan: ketuk dua kali (konfirmasi di tombol yang sama), tanpa jendela konfirmasi peramban */
async function laporkanKabar(id, b) {
  if (!b.dataset.yakin) { b.dataset.yakin = "1"; b.textContent = "Yakin laporkan?"; return; }
  if (!wa) { b.textContent = "Isi nomor WhatsApp di kolom kabar dulu"; delete b.dataset.yakin; return; }
  b.disabled = true;
  try { const r = await fetch(`/api/lapor/komen/${id}/laporkan`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(nomorKetik()), signal: AbortSignal.timeout(10000)});
    const j = await r.json().catch(() => ({})); b.textContent = r.ok ? "Dilaporkan, terima kasih" : j.galat || "Belum terkirim"; }
  catch { b.textContent = "Belum terkirim"; b.disabled = false; delete b.dataset.yakin; }
}
function gambarAlun() {
  const w = $("daftarAlun"), ikut = ikutiBaca();
  const nIkut = alunData.filter(x => ikut[x.id]).length, nUbah = alunData.filter(x => ikut[x.id] && ikut[x.id] !== x.status).length;
  // alunJenis = saringan status (Semua, Diikuti, Selesai); jenis bencana dipilih di legenda peta (alunJenisPilih, boleh lebih dari satu)
  const jenis = [["", "Semua", "i-daftar"], ["diikuti", nIkut ? `Diikuti (${nIkut})` : "Diikuti", "i-centang"], ...(alunKabar ? [["selesai", "Selesai", "i-status"]] : [])];
  $("statusAlun")?.replaceChildren(...jenis.map(([id, t, ik]) => { const b = el("button"); b.append(ikon(ik), el("span", null, t)); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(id === alunJenis));
    if (id === "diikuti" && nUbah) b.append(el("span", "lp-tab-jumlah", String(nUbah)));
    b.addEventListener("click", () => { alunJenis = id; for (const t of b.parentNode.children) t.setAttribute("aria-selected", String(t === b)); gambarAlun(); }); return b; }));   // chrome langsung, daftar ditunda
  if (alunKabar) return gambarKabar(ikut);
  $("sumberAlun").hidden = true;
  const semuaJenis = alunJenis === "diikuti" ? alunData.filter(x => ikut[x.id]) : alunData;
  tandaiJenisAda(semuaJenis.map(x => x.jenis));
  const daftar = alunJenisPilih.size ? semuaJenis.filter(x => alunJenisPilih.has(x.jenis)) : semuaJenis;
  if (alunJenis === "diikuti" && nUbah) { const m = ikutiBaca(); for (const x of daftar) m[x.id] = x.status; ikutiTulis(m); } // dilihat = penanda berubah hilang pada buka berikutnya
  gambarPetaAlun(daftar);
  if (!daftar.length) {
    const k = el("div", "lp-kosong-besar"), m = el("div", "lp-kosong-maskot"); m.innerHTML = maskot("berpikir");
    const tx = el("div", "lp-kosong-teks"), lb = el("button", "lp-utama"); lb.type = "button"; lb.append(ikon("i-kirim"), "Lapor kejadian"); lb.addEventListener("click", bukaChat);
    tx.append(el("h2", null, alunJenis === "diikuti" ? "Belum ada kejadian yang Anda ikuti" : alunJenisPilih.size ? "Belum ada laporan jenis ini" : "Belum ada laporan yang ditindaklanjuti"),
      el("p", null, alunJenis === "diikuti" ? "Ketuk Ikuti kejadian di kartu mana pun. Kartu ditandai saat statusnya berubah." : "Laporan warga muncul di sini sesudah diperiksa dan ditindaklanjuti petugas BNPB atau BPBD. Lihat kejadian di sekitar Anda? Laporkan sekarang."), lb);
    k.append(m, tx); return w.replaceChildren(k);
  }
  w.replaceChildren(...daftar.map(x => kartuAlun(x, ikut)));
  if (alunPeta) requestAnimationFrame(() => alunPeta.resize());
}
const ZOOM_KAB = 6.5;   // di bawah ini gelembung provinsi, di atas titik kab/kota
/* tanda per jenis bencana di peta provinsi, gaya peta Laporan Kejadian Bencana Harian (pemilik 26 Nov 2026): warna = token --kat-* (sama dengan pil tabel), gempa persegi, erupsi segitiga */
const KAT_JENIS = {banjir: "--lh-banjir", longsor: "--lh-longsor", cuaca: "--lh-cuaca", gempa: "--lh-gempa", karhutla: "--kat-karhutla", erupsi: "--lh-gunungapi", abrasi: "--kat-gelombang", kekeringan: "--kat-kering"};
const katJenis = j => KAT_JENIS[j] ? j : "lainnya";
const TANDA_PX = 26;   // diameter tanda untuk 1 kejadian (deck harian: 155k EMU); membesar dengan akar jumlah (2 = 37, 3 = 45, 4 = 52 px)
const ukuranTanda = n => Math.min(2.2, Math.sqrt(Math.max(1, n)));   // dibatasi 57 px supaya provinsi dengan banyak kejadian tidak menutupi tetangganya
/* singkatan nama provinsi seperti peta deck harian: Sum. Utara, Kal. Barat, Sul. Selatan, Jabar, Jateng, Jatim */
const SINGKAT_PROV = {"Jawa Barat": "Jabar", "Jawa Tengah": "Jateng", "Jawa Timur": "Jatim", "Nusa Tenggara Barat": "NTB", "Nusa Tenggara Timur": "NTT", "Daerah Istimewa Yogyakarta": "DI Yogyakarta", "Kepulauan Bangka Belitung": "Babel", "Kepulauan Riau": "Kepri"};
const singkatProv = n => SINGKAT_PROV[n] || n.replace(/^Sumatera /, "Sum. ").replace(/^Kalimantan /, "Kal. ").replace(/^Sulawesi /, "Sul. ");
let alunGrup = new Map(), alunTempat = new Map(), alunProvTerdampak = [];
/* arsiran provinsi satu warna bertingkat menurut total kejadian (pemilik 26 Nov 2026); tanpa kejadian = tanpa isi. Ambang bawah tiap tingkat, sama dengan legenda */
const TINGKAT_PROV = [[1, .07, "1 sampai 2"], [3, .14, "3 sampai 5"], [6, .23, "6 sampai 10"], [11, .34, "lebih dari 10"]];
const tingkatProv = n => TINGKAT_PROV.reduce((o, [a, v]) => n >= a ? v : o, 0);
const isiProv = () => { const m = []; for (const [k, g] of alunGrup) if (/^\d{2}$/.test(k)) m.push(k, tingkatProv(g.n)); return m.length ? ["match", ["get", "kode"], ...m, 0] : 0; };
/* ruang untuk panel daftar (kiri di layar lebar, bawah di HP) dan legenda bersaringan jenis di bawah */
const padPeta = () => matchMedia("(min-width:900px)").matches ? {top: 48, right: 60, bottom: 40 + (document.getElementById("legendaAlun")?.offsetHeight || 130), left: 440} : {top: 64, bottom: 48 + innerHeight * .42, left: 32, right: 32};
/* cincin donat per provinsi (pemilik 26 Nov 2026: "Ya, pakai donat"): satu penanda SVG per provinsi, angka total di tengah, potongan cincin per jenis
   sebanding jumlahnya dengan warna yang sama dengan pil tabel (kelas lp-jenis-*), diameter mengikuti akar total. Penanda DOM ringan, hanya di skala provinsi. */
const ZOOM_NASIONAL = 5.2;   // sama dengan peta karhutla (public/index.html): diperkecil pengguna di bawah ini = tingkat provinsi dilepas ke Indonesia
const NAMA_JENIS_KECIL = {banjir: "banjir", longsor: "tanah longsor", cuaca: "cuaca ekstrem", gempa: "gempa bumi", erupsi: "erupsi", karhutla: "karhutla", abrasi: "gelombang pasang dan abrasi", kekeringan: "kekeringan", lainnya: "lainnya"};
let alunDonat = [], alunGerakProgram = false, alunSudahPas = false;   // penyesuaian peta pertama instan, berikutnya beranimasi
const diameterDonat = n => Math.round(Math.min(52, Math.max(28, 20 + 8 * Math.sqrt(n))));   // 1 kejadian 28 px, 16 ke atas 52 px
/* tanpa tumpukan di zoom berapa pun (pemilik 26 Nov 2026: "Tapi jangan gini ya. Menimpa"): tiap kali peta berhenti, posisi layar dihitung ulang;
   cincin mengecil mengikuti zoom (minimal 28 px supaya angka terbaca), cincin yang masih bersentuhan digabung jadi cincin gugus (per jenis dijumlah)
   dan terpecah lagi saat diperbesar; label nama dan gunung api disembunyikan bila bertabrakan; segitiga gunung api yang menimpa cincin disembunyikan. */
const skalaDonat = z => Math.min(1, Math.max(.62, .62 + (z - 3.6) * .2));
let alunGunung = [];
function elDonat(c) {
  const NS = "http://www.w3.org/2000/svg", d = c.d, w = Math.max(4, Math.round(d * .14)), r = (d - w) / 2, C = 2 * Math.PI * r;
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", `0 0 ${d} ${d}`); svg.setAttribute("width", d); svg.setAttribute("height", d); svg.setAttribute("aria-hidden", "true");
  const isi = document.createElementNS(NS, "circle"); Object.entries({cx: d / 2, cy: d / 2, r: r + w / 2, class: "lp-donat-isi"}).forEach(([k, v]) => isi.setAttribute(k, v)); svg.append(isi);
  const jenis = [...c.j].sort((a, b) => b[1] - a[1]); let jalan = 0;
  for (const [j, n] of jenis) { const pj = C * n / c.n, el2 = document.createElementNS(NS, "circle");
    Object.entries({cx: d / 2, cy: d / 2, r, class: `lp-donat-potong lp-jenis-${j}`, "stroke-width": w, "stroke-dasharray": `${Math.max(0, pj - (jenis.length > 1 ? 1.5 : 0))} ${C}`, "stroke-dashoffset": -jalan, transform: `rotate(-90 ${d / 2} ${d / 2})`}).forEach(([k, v]) => el2.setAttribute(k, v));
    svg.append(el2); jalan += pj; }
  // angka muat di cakram putih: ukuran huruf mengikuti diameter cakram dan banyaknya digit, tidak pernah menyentuh cincin
  const angka = c.n.toLocaleString("id-ID"), dalam = d - 2 * w, fs = Math.max(9, Math.floor(Math.min(dalam * .46, dalam * .74 / (angka.length * .62))));
  const t = document.createElementNS(NS, "text"); Object.entries({x: d / 2, y: d / 2, "text-anchor": "middle", "dominant-baseline": "central", class: "lp-donat-angka", "font-size": fs}).forEach(([k, v]) => t.setAttribute(k, v)); t.textContent = angka; svg.append(t);
  const rinci = jenis.map(([j, n]) => `${NAMA_JENIS_KECIL[j] || j} ${n.toLocaleString("id-ID")}`).join(", "), siapa = c.nama.join(", ") || "Provinsi";
  const b = el("button", "lp-donat"); b.type = "button"; b.style.setProperty("--d", `${d}px`); b.title = `${siapa}: ${rinci}`; b.setAttribute("aria-label", `${siapa}, ${c.n.toLocaleString("id-ID")} kejadian: ${rinci}`);
  const lbl = el("span", "lp-donat-nama", c.label); b.append(svg, lbl);
  const satu = c.kunci.length === 1 && /^\d{2}$/.test(c.kunci[0]);
  const buka = () => satu ? pilihProv(c.kunci[0]) : alunPeta.fitBounds(c.b, {padding: padPeta(), maxZoom: 9});   // gugus: diperbesar sampai terpecah
  b.addEventListener("click", e => {
    if (e.pointerType === "touch") {   // HP: ketuk pertama menampilkan rincian, tombol di dalamnya membuka
      const box = el("div", "lp-alun-pop"), bk = el("button", "lp-alun-pop-baris"), tx = el("span"); bk.type = "button";
      tx.append(el("b", null, siapa), el("small", null, rinci)); bk.append(tx, ikon("i-panah"));
      bk.addEventListener("click", () => { pop.remove(); buka(); }); box.append(bk);
      const pop = new maplibregl.Popup({offset: d / 2 + 4, closeButton: false, maxWidth: "260px"}).setLngLat(c.lngLat).setDOMContent(box).addTo(alunPeta); return; }
    buka(); });
  return {el: b, lbl};
}
function elGunung(g) { const b = el("div", "lp-gunung-tanda"), n = el("span", null, g.nama); b.title = `${g.nama}, ${g.level === 4 ? "Awas" : "Siaga"}`;
  b.innerHTML = '<svg viewBox="0 0 20 18" width="20" height="18" aria-hidden="true"><path d="M10 1.6 18.6 16.4H1.4Z"/></svg>'; b.append(n); return {el: b, lbl: n}; }
/* label peta biasa tanpa kotak (pemilik 26 Nov 2026: pil putih "jelek"): lebar diukur dari huruf sebenarnya, dicoba kanan, kiri, bawah, atas */
const lebarTeks = (s, f) => { const x = lebarTeks.k ||= document.createElement("canvas").getContext("2d"); x.font = f; return x.measureText(s).width; };
const HURUF_LABEL = '600 12px Inter, system-ui, sans-serif', HURUF_GUNUNG = '600 11px Inter, system-ui, sans-serif';
function letakLabel(px, py, rx, ry, teks, huruf, kotak, layar, urut) {
  const lw = Math.ceil(lebarTeks(teks, huruf)) + 4, lh = huruf === HURUF_LABEL ? 16 : 14;
  const calon = {kanan: {x1: px + rx + 3, x2: px + rx + 3 + lw, y1: py - lh / 2, y2: py + lh / 2}, kiri: {x1: px - rx - 3 - lw, x2: px - rx - 3, y1: py - lh / 2, y2: py + lh / 2},
    bawah: {x1: px - lw / 2, x2: px + lw / 2, y1: py + ry + 2, y2: py + ry + 2 + lh}, atas: {x1: px - lw / 2, x2: px + lw / 2, y1: py - ry - 2 - lh, y2: py - ry - 2}};
  for (const pos of urut) { const b = calon[pos]; if (b.x1 >= 0 && b.y1 >= 0 && b.x2 <= layar.w && b.y2 <= layar.h && !kotak.some(k => tabrak(k, b))) return {pos, b}; }
  return null;
}
/* panel daftar, legenda, dan tombol zoom menutupi peta: label tidak diletakkan di bawahnya */
const halangPeta = kv => { const o = kv.getBoundingClientRect();
  return [...kv.closest("#petaAlun").querySelectorAll(".lp-alun-panel, #legendaAlun, #periodeAlun, #menuJenisAlun, .maplibregl-ctrl-top-right")].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect();
    return {x1: r.left - o.left - 4, x2: r.right - o.left + 4, y1: r.top - o.top - 4, y2: r.bottom - o.top + 4}; }); };
const tabrak = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
function pasangDonat() { gambarDonat(); }
let alunTandaGunung = [];
function gambarGunung() {
  for (const m of alunTandaGunung) m.remove(); alunTandaGunung = [];
  if (!alunPeta || alunMode !== "peringatan") return;
  const kv = alunPeta.getContainer(), kotak = halangPeta(kv), layar = {w: kv.clientWidth, h: kv.clientHeight};
  for (const g of [...alunGunung].sort((a, b) => b.level - a.level)) { const p = alunPeta.project([g.lon, g.lat]), tri = {x1: p.x - 10, x2: p.x + 10, y1: p.y - 9, y2: p.y + 9};
    if (kotak.some(k => tabrak(k, tri))) continue; kotak.push(tri);
    const {el: e, lbl} = elGunung(g), tl = letakLabel(p.x, p.y, 10, 9, g.nama, HURUF_GUNUNG, kotak, layar, ["bawah", "kanan", "kiri", "atas"]);
    if (tl) { kotak.push(tl.b); lbl.dataset.pos = tl.pos; } else lbl.hidden = true;
    alunTandaGunung.push(new maplibregl.Marker({element: e, anchor: "center"}).setLngLat([g.lon, g.lat]).addTo(alunPeta)); }
}
function gambarDonat() {
  gambarGunung();
  for (const m of alunDonat) m.remove(); alunDonat = [];
  if (!alunPeta || alunPeta.getZoom() >= ZOOM_KAB || alunMode === "peringatan") return;
  const sk = skalaDonat(alunPeta.getZoom()), ukur = n => Math.max(28, Math.round(diameterDonat(n) * sk));
  let gs = [...alunGrup].map(([kunci, g]) => { const ll = [g.x / g.k, g.y / g.k], p = alunPeta.project(ll);
    return {kunci: [kunci], n: g.n, j: new Map(g.j), lngLat: ll, px: p.x, py: p.y, b: new maplibregl.LngLatBounds(g.b.getSouthWest(), g.b.getNorthEast()), d: ukur(g.n)}; });
  for (let ubah = true; ubah;) { ubah = false;   // gabung cincin yang bersentuhan (jarak tepi < 8 px, termasuk tepi putih) sampai tidak ada lagi
    gs.sort((a, b) => b.n - a.n);
    luar: for (let i = 0; i < gs.length; i++) for (let k = i + 1; k < gs.length; k++) { const a = gs[i], c = gs[k];
      if (Math.hypot(a.px - c.px, a.py - c.py) < (a.d + c.d) / 2 + 8) { const n = a.n + c.n;
        for (const [jj, v] of c.j) a.j.set(jj, (a.j.get(jj) || 0) + v);
        a.px = (a.px * a.n + c.px * c.n) / n; a.py = (a.py * a.n + c.py * c.n) / n; a.lngLat = alunPeta.unproject([a.px, a.py]).toArray();
        a.b.extend(c.b); a.kunci.push(...c.kunci); a.n = n; a.d = ukur(n); gs.splice(k, 1); ubah = true; break luar; } } }
  const kotak = [], kv = alunPeta.getContainer(), layar = {w: kv.clientWidth, h: kv.clientHeight};   // ruang terpakai di layar: cincin dulu, lalu label
  for (const c of gs) { const prov = c.kunci.filter(k => /^\d{2}$/.test(k)); c.nama = prov.map(k => namaProv(k));
    // gugus: dua provinsi disebut namanya, lebih dari dua disebut jumlahnya; bila nama lengkap tidak muat, dicoba singkatannya
    c.label = c.nama.length > 2 ? `${c.nama.length} provinsi` : c.nama.join(" dan ");
    c.labelPendek = c.nama.length > 2 ? c.label : prov.map(k => singkatProv(namaProv(k))).join(" dan ");
    kotak.push({x1: c.px - c.d / 2 - 1, x2: c.px + c.d / 2 + 1, y1: c.py - c.d / 2 - 1, y2: c.py + c.d / 2 + 1}); }
  kotak.push(...halangPeta(kv));
  for (const c of gs) { const {el: e, lbl} = elDonat(c), urut = ["kanan", "kiri", "bawah", "atas"];
    let tl = c.label && letakLabel(c.px, c.py, c.d / 2, c.d / 2, c.label, HURUF_LABEL, kotak, layar, urut);
    if (!tl && c.labelPendek && c.labelPendek !== c.label && (tl = letakLabel(c.px, c.py, c.d / 2, c.d / 2, c.labelPendek, HURUF_LABEL, kotak, layar, urut))) lbl.textContent = c.labelPendek;
    if (!tl && c.nama.length === 2 && (tl = letakLabel(c.px, c.py, c.d / 2, c.d / 2, "2 provinsi", HURUF_LABEL, kotak, layar, urut))) lbl.textContent = "2 provinsi";
    if (tl) { kotak.push(tl.b); lbl.dataset.pos = tl.pos; } else lbl.hidden = true;   // tidak muat di empat sisi: nama tetap di title dan aria-label cincin
    alunDonat.push(new maplibregl.Marker({element: e, anchor: "center"}).setLngLat(c.lngLat).addTo(alunPeta)); }
}
const aturDonat = () => gambarDonat();
const JENIS_CHIP = [["banjir", "Banjir"], ["longsor", "Tanah longsor"], ["cuaca", "Cuaca ekstrem"], ["gempa", "Gempa bumi"], ["karhutla", "Karhutla"], ["erupsi", "Erupsi"], ["abrasi", "Abrasi"], ["kekeringan", "Kekeringan"]];
function segarChipJenis() {
  for (const b of document.querySelectorAll("#legendaAlun .lp-jn-chip")) b.classList.toggle("pudar", !!alunJenisAda && !alunJenisAda.has(b.dataset.jenis));
  for (const b of document.querySelectorAll("#menuJenisAlun .lp-alun-menu-b")) { const j = b.dataset.jenis;
    b.setAttribute("aria-pressed", String(j ? alunJenisPilih.has(j) : !alunJenisPilih.size)); b.classList.toggle("pudar", !!j && !!alunJenisAda && !alunJenisAda.has(j)); }
  const sm = document.querySelector("#menuJenisAlun summary"); if (!sm) return;
  const pil = [...alunJenisPilih], j = pil.length === 1 ? pil[0] : "", teks = pil.length > 1 ? `${pil.length} jenis bencana` : j ? (JENIS_CHIP.find(([k]) => k === j)?.[1] || j) : "Data Bencana", ub = el("span", `lp-alun-menu-ik${j ? ` lp-jenis-${j}` : ""}`);
  ub.append(j ? el("i", "lp-jn-tanda") : ikon("i-kejadian")); sm.replaceChildren(ub, el("span", null, teks), ikon("i-panah", "lp-alun-menu-panah")); }
const tandaiJenisAda = daftarJenis => { alunJenisAda = new Set(daftarJenis); segarChipJenis(); };
const TEKS_JENIS = {};   // diisi saat peta dibuat: warna angka di dalam tanda (gelap untuk warna terang)
async function gambarPetaAlun(daftar) {
  const wp = $("petaAlun"), titik = daftar.filter(x => x.titik), W = {selesai: tok("--ok"), belum: tok("--info"), tanpa: tok("--ink2")}, warnaWarn = tok("--warn");   // peta selalu tampil penuh; tanpa titik = seluruh Indonesia. tok() membaca piksel kanvas: sekali per gambar, bukan per titik
  try { await muatMaplibre(); } catch { return; }
  /* kejadian di kab/kota yang sama berbagi titik pusat: disatukan jadi satu titik bernomor, pop-up mendaftar semuanya; warna = status paling mendesak di titik itu */
  const URUT = {berjalan: 0, belum: 1, tanpa: 2, selesai: 3}, tempat = new Map();
  for (const x of titik) { const kunci = `${x.titik.lon.toFixed(4)},${x.titik.lat.toFixed(4)}`; const t = tempat.get(kunci) || {lon: x.titik.lon, lat: x.titik.lat, prov: x.prov || `t-${kunci}`, isi: []}; t.isi.push(x); tempat.set(kunci, t); }
  alunTempat = tempat;
  const fc = {type: "FeatureCollection", features: [...tempat].map(([kunci, t]) => { const u = t.isi.reduce((a, b) => (URUT[b.status] ?? 0) < (URUT[a.status] ?? 0) ? b : a);
    return {type: "Feature", geometry: {type: "Point", coordinates: [t.lon, t.lat]}, properties: {kunci, n: t.isi.length, warna: W[u.status] || warnaWarn, prov: t.prov}}; })};
  /* gelembung per provinsi seperti peta karhutla (pemilik 26 Nov 2026): skala kecil = satu gelembung per provinsi berisi jumlah kejadian, diperbesar = titik kab/kota */
  const grup = new Map(); for (const f of fc.features) { const g = grup.get(f.properties.prov) || {n: 0, k: 0, x: 0, y: 0, b: new maplibregl.LngLatBounds(), j: new Map()}; g.n += f.properties.n; g.k++; g.x += f.geometry.coordinates[0]; g.y += f.geometry.coordinates[1]; g.b.extend(f.geometry.coordinates); grup.set(f.properties.prov, g); }
  for (const t of tempat.values()) { const g = grup.get(t.prov); if (g) for (const x of t.isi) { const j = katJenis(x.jenisId); g.j.set(j, (g.j.get(j) || 0) + 1); } }
  alunGrup = grup;
  const fp = {type: "FeatureCollection", features: [...grup].flatMap(([kunci, g]) => { const pusat = [g.x / g.k, g.y / g.k], jenis = [...g.j].sort((a, b) => b[1] - a[1]), m = jenis.length;
    // tanda berdampingan rapat: lebar tiap tanda mengikuti jumlahnya, dijajar dari kiri ke kanan dan dipusatkan
    const lebar = jenis.map(([, n]) => TANDA_PX * ukuranTanda(n)), total = lebar.reduce((a, b) => a + b, 0) + 2 * (m - 1); let x0 = -total / 2;
    const tanda = jenis.map(([j, n], i) => { const sz = ukuranTanda(n), dx = x0 + lebar[i] / 2; x0 += lebar[i] + 2;
      return {type: "Feature", geometry: {type: "Point", coordinates: pusat}, properties: {kunci, jenis: j, n, sz, off: [dx / sz, 0], ofs: [dx / (11 + 2 * sz), 0], ts: 11 + 2 * sz, tw: TEKS_JENIS[j]}}; });
    const kanan = total / 2 + 6;   // nama provinsi di kanan deretan tanda
    return [...tanda, {type: "Feature", geometry: {type: "Point", coordinates: pusat}, properties: {kunci, lbl: /^\d{2}$/.test(kunci) ? singkatProv(namaProv(kunci)) : "", ofs: [kanan / 12, 0]}}]; })};
  if (!window.Wilayah) muatWilayah().then(() => { for (const f of fp.features) if ("lbl" in f.properties && /^\d{2}$/.test(f.properties.kunci)) f.properties.lbl = singkatProv(namaProv(f.properties.kunci)); alunPeta?.getSource("alun-prov")?.setData(fp); });
  alunProvTerdampak = [...grup.keys()].filter(k => /^\d{2}$/.test(k));
  alunPeta?.getLayer("prov-terdampak") && alunPeta.setPaintProperty("prov-terdampak", "fill-opacity", isiProv());
  /* pindah ke provinsi atau kembali ke nasional dengan zoom halus seperti peta utama (pemilik 26 Nov 2026: "ketika di klik ga smooth zoom"); muat pertama dan
     kurangi-gerak tetap instan. Selama animasi program, zoomend tidak dianggap zoom pengguna (alunGerakProgram dilepas saat moveend). */
  const pas = () => { const b = new maplibregl.LngLatBounds(); for (const f of fc.features) b.extend(f.geometry.coordinates);
    const cam = fc.features.length ? alunPeta.cameraForBounds(b, {padding: padPeta(), maxZoom: 11}) : {center: [118, -2], zoom: 4};
    if (!cam) return;
    if (alunProv && cam.zoom < ZOOM_KAB + .01) cam.zoom = ZOOM_KAB + .01;   // satu provinsi terpilih: selalu tingkat kab/kota
    const halus = alunSudahPas && !matchMedia("(prefers-reduced-motion: reduce)").matches; alunSudahPas = true;
    alunGerakProgram = true;
    if (!halus) { alunPeta.jumpTo({center: cam.center, zoom: cam.zoom, bearing: 0}); alunGerakProgram = false; return; }
    alunPeta.once("moveend", () => { alunGerakProgram = false; });
    alunPeta.easeTo({center: cam.center, zoom: cam.zoom, bearing: 0, duration: 900, easing: t => 1 - Math.pow(1 - t, 3)}); };   // satu provinsi terpilih: selalu tingkat kab/kota
  if (alunPeta) { alunPeta.getSource("alun")?.setData(fc); alunPeta.getSource("alun-prov")?.setData(fp); if (alunPeta.loaded() || alunDonat.length) pasangDonat(); pas(); return; }
  alunPeta = new maplibregl.Map({container: wp.querySelector(".lp-peta-alun"), style: "https://tiles.openfreemap.org/styles/positron", center: [118, -2], zoom: 4, attributionControl: {compact: true}});
  alunPeta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
  // legenda di bawah peta seperti peta karhutla, bisa dilipat; label sama dengan status di kartu (alun_kabar.js STATUS_LABEL), warna sama dengan W di atas
  const lg = el("section", "lp-alun-legenda"); lg.id = "legendaAlun"; lg.setAttribute("aria-label", "Legenda peta"); lg.hidden = alunMode === "peringatan";
  const lgT = el("button", "lp-alun-legenda-t"); lgT.type = "button"; lgT.setAttribute("aria-expanded", "true"); lgT.append("Legenda", ikon("i-panah", "lp-kb-panah"));
  // status kejadian tidak tergambar di peta (cincin = jenis), jadi tidak masuk legenda; statusnya ada di tabel dan pop-up
  const lgI = el("div", "lp-alun-legenda-isi"), g2 = el("div");
  // legenda: keterangan warna cincin per jenis saja; saringan jenis pindah ke menu Data Bencana di atas peta (pemilik 26 Nov 2026)
  const jl = el("div", "lp-alun-legenda-jenis");
  for (const [j, teks] of JENIS_CHIP) { const b = el("span", "lp-jn-chip lp-jn-ket", teks); b.dataset.jenis = j; b.prepend(el("i", `lp-jn-tanda lp-jenis-${j}`)); jl.append(b); }
  // menu Data Bencana (meniru menu Data Bencana situs utama): centang satu atau beberapa jenis, peta dan tabel ikut tersaring
  const mn = document.createElement("details"); mn.className = "lp-alun-menu"; mn.id = "menuJenisAlun"; mn.hidden = alunMode === "peringatan";
  const sm = document.createElement("summary"); sm.className = "lp-alun-menu-t"; sm.setAttribute("aria-label", "Pilih jenis bencana");
  const ls = el("div", "lp-alun-menu-isi"); ls.setAttribute("role", "group"); ls.setAttribute("aria-label", "Jenis bencana");
  for (const [j, teks] of [["", "Semua bencana"], ...JENIS_CHIP]) { const b = el("button", "lp-alun-menu-b"), ub = el("span", `lp-alun-menu-ik${j ? ` lp-jenis-${j}` : ""}`);
    b.type = "button"; b.dataset.jenis = j; ub.append(j ? el("i", "lp-jn-tanda") : ikon("i-kejadian")); b.append(ub, el("span", null, teks)); ls.append(b); }
  ls.addEventListener("click", e => { const b = e.target.closest("button[data-jenis]"); if (!b) return; const j = b.dataset.jenis;
    if (!j) { alunJenisPilih.clear(); mn.open = false; } else if (!alunJenisPilih.delete(j)) alunJenisPilih.add(j);   // boleh lebih dari satu (pemilik 26 Nov 2026); menu tetap terbuka
    segarChipJenis(); gambarAlun(); });   // chrome langsung, daftar dan peta ditunda di gambarAlun
  document.addEventListener("click", e => { if (mn.open && !mn.contains(e.target)) mn.open = false; });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && mn.open) { mn.open = false; sm.focus(); } });
  mn.append(sm, ls); wp.append(mn);
  const tk = el("ul", "lp-alun-legenda-tingkat");
  for (const [, , teks] of TINGKAT_PROV) { const li = el("li", null, teks); li.prepend(el("i")); tk.append(li); }
  const tkB = el("div", "lp-alun-legenda-baris"); tkB.append(el("b", null, "Kejadian per provinsi"), tk);
  g2.append(el("b", null, "Angka = total kejadian, warna cincin = jenis"), jl, tkB); lgI.append(g2);
  lgT.addEventListener("click", () => { const buka = lgI.hidden; lgI.hidden = !buka; lgT.setAttribute("aria-expanded", String(buka)); });
  if (!matchMedia("(min-width:900px)").matches) { lgI.hidden = true; lgT.setAttribute("aria-expanded", "false"); }   // HP: terlipat, peta tetap lega
  lg.append(lgT, lgI); wp.append(lg); segarChipJenis();
  alunPeta.on("load", () => {
    alunPeta.addSource("alun", {type: "geojson", data: fc});
    alunPeta.addSource("alun-prov", {type: "geojson", data: fp});
    // gambar tanda per jenis sekali: lingkaran, gempa persegi, erupsi segitiga; tepi putih supaya terpisah dari peta
    const putih = tok("--card"), gelap = tok("--ink");
    for (const j of [...Object.keys(KAT_JENIS), "lainnya"]) { const w = tok(KAT_JENIS[j] || "--kat-lain"), c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      x.beginPath(); if (j === "gempa") x.roundRect(6, 6, 52, 52, 8); else if (j === "erupsi") { x.moveTo(32, 3); x.lineTo(61, 58); x.lineTo(3, 58); x.closePath(); } else x.arc(32, 32, 27, 0, 7);
      x.fillStyle = w; x.fill(); x.lineWidth = 6; x.strokeStyle = putih; x.stroke();
      const [r, g, b] = w.match(/\d+/g).map(Number); TEKS_JENIS[j] = (.2126 * r + .7152 * g + .0722 * b) / 255 > .62 ? gelap : putih;   // angka gelap di atas warna terang (gempa kuning)
      if (!alunPeta.hasImage("jn-" + j)) alunPeta.addImage("jn-" + j, x.getImageData(0, 0, 64, 64), {pixelRatio: 64 / TANDA_PX}); }
    for (const f of fp.features) if (f.properties.jenis) f.properties.tw = TEKS_JENIS[f.properties.jenis];
    alunPeta.getSource("alun-prov").setData(fp);
    // arsiran provinsi bertingkat (TINGKAT_PROV), garis batas putih tipis (batas dari /geo/provinsi.json, dimuat sekali)
    const lapisBawah = alunPeta.getStyle().layers.find(l => l.type === "symbol")?.id;
    for (const l of alunPeta.getStyle().layers) if (l.type === "symbol" && l.layout?.["text-field"]) alunPeta.setPaintProperty(l.id, "text-opacity", .38);   // label peta dasar diredupkan supaya cincin dan nama provinsi terbaca
    fetch("/geo/provinsi.json").then(r => r.ok ? r.json() : null).then(gj => { if (!gj || alunPeta.getSource("prov-batas")) return;
      alunPeta.addSource("prov-batas", {type: "geojson", data: gj});
      alunPeta.addLayer({id: "prov-terdampak", type: "fill", source: "prov-batas", paint: {"fill-color": tok("--head-bg"), "fill-opacity": isiProv()}}, lapisBawah);
      alunPeta.addLayer({id: "prov-garis", type: "line", source: "prov-batas", paint: {"line-color": putih, "line-width": 1}}, lapisBawah);
      if (alunMode === "peringatan") for (const l of ["prov-terdampak", "prov-garis"]) alunPeta.setLayoutProperty(l, "visibility", "none"); }).catch(() => {});
    pasangDonat();
    alunPeta.on("moveend", gambarDonat); alunPeta.on("resize", gambarDonat);
    // seperti peta karhutla: diperkecil sendiri oleh pengguna di bawah skala provinsi = pilihan provinsi dilepas, kembali ke tabel semua provinsi
    alunPeta.on("zoomend", () => { if (!alunGerakProgram && alunProv && alunPeta.getZoom() < ZOOM_NASIONAL) pilihProv(""); });   // roda tetikus MapLibre tidak membawa originalEvent; gerak program ditandai di pas()
    // gunung api berstatus Siaga dan Awas: segitiga oranye dengan nama di bawahnya (status MAGMA/PVMBG, public/banjir/data/gunungapi_status.json)
    fetch("/banjir/data/gunungapi_status.json").then(r => r.ok ? r.json() : null).then(d => { const L = (d?.gunung || []).filter(g => g.level >= 3 && Number.isFinite(g.lat) && Number.isFinite(g.lon));
      alunGunung = L; gambarDonat(); }).catch(() => {});
    alunPeta.addLayer({id: "titik", type: "circle", source: "alun", minzoom: ZOOM_KAB, paint: {"circle-color": ["get", "warna"], "circle-radius": ["step", ["get", "n"], 8, 2, 12], "circle-stroke-width": 2, "circle-stroke-color": tok("--card")}});
    alunPeta.addLayer({id: "titik-n", type: "symbol", source: "alun", minzoom: ZOOM_KAB, filter: [">", ["get", "n"], 1], layout: {"text-field": ["to-string", ["get", "n"]], "text-size": 11, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true}, paint: {"text-color": tok("--card")}});
    alunPeta.on("click", "titik", e => { const t = alunTempat.get(e.features[0].properties.kunci); if (!t) return; const box = el("div", "lp-alun-pop lp-pop-kaya");
      // gaya kartu pop-up Pantau Dalops (pemilik 26 Nov 2026: "kaya gini kan bagus, coba diadaptasi"): lambang, nama, kotak angka berikon.
      // isi = dampak Laporan Kejadian Bencana Harian Dirdalops, hanya kolom daftar izin D4; kosong = "belum ada data", tidak pernah 0
      const x0 = t.isi[0], kp = el("div", "lp-pop-kepala"), lb = document.createElement("img"), nm = el("div");
      lb.className = "lp-pop-lambang"; lb.alt = ""; lb.loading = "lazy"; lb.addEventListener("error", () => { lb.hidden = true; }, {once: true});
      lambangAlun().then(L => { const sl = L[`${x0.prov}|${x0.lokasi.kab}`]; lb.src = sl ? `/lambang/kabkota/${sl}.png` : `/lambang/provinsi/${x0.prov}.png`; });
      nm.append(el("b", null, x0.lokasi.kab || "Lokasi belum diketahui"), el("small", null, namaProv(x0.prov))); kp.append(lb, nm); box.append(kp);
      for (const x of t.isi) { const kj = el("section", "lp-pop-kj"), atas = el("div", "lp-pop-atas"), jn = el("span", "lp-pop-jenis", x.jenis);
        jn.prepend(el("i", `lp-jn-tanda lp-jenis-${x.jenisId}`)); atas.append(jn, el("span", `lp-pop-st lp-st-${x.status || "tanpa"}`, x.statusLabel || "Belum ada laporan resmi")); kj.append(atas);
        const k = x.resmi, a = k?.angka || {}, dl = el("div", "lp-pop-dampak");
        for (const [nilai, label, ik] of [[k ? a.kk : undefined, "KK terdampak", "i-orang"], [k ? a.mengungsi : undefined, "mengungsi", "i-pengungsian"], [k ? a.rumah_dampak : undefined, "rumah terdampak", "i-rumah"], [x.nBerita, "berita", "i-pesan"]]) {
          const sel = el("div"), ub = el("span", "lp-pop-ik"), tx = el("span"), ada = nilai != null;
          ub.append(ikon(ik)); tx.append(el("b", ada ? null : "kosong", ada ? Number(nilai).toLocaleString("id-ID") : "belum ada data"), el("small", null, label)); sel.append(ub, tx); dl.append(sel); }
        kj.append(dl);
        kj.append(el("p", "lp-pop-waktu", k ? [k.mulai && `Sejak ${tglPendekId(k.mulai)}`, k.lap_terakhir && `laporan Dirdalops terakhir ${tglPendekId(k.lap_terakhir)}`].filter(Boolean).join(", ") : "Belum ada laporan resmi Dirdalops"));
        const r = el("button", "lp-alun-pop-baris lp-pop-buka"), tx = el("span"); r.type = "button"; tx.append(el("b", null, "Lihat rincian kejadian")); r.append(tx, ikon("i-panah")); kj.append(r);
        r.addEventListener("click", () => {
          if (x.prov && alunProv !== x.prov && typeof pilihProv === "function") pilihProv(x.prov);
          const cari = (n = 0) => { const tr = document.querySelector(`.lp-alun-kj tr[data-id="${CSS.escape(String(x.id))}"]`);
            if (!tr) return n < 20 && requestAnimationFrame(() => cari(n + 1));
            if (tr.getAttribute("aria-expanded") !== "true") tr.click();   // baris memegang data kejadian lengkap; titik peta hanya ringkasan
            tr.scrollIntoView({behavior: "smooth", block: "nearest"}); tr.classList.remove("sorot"); void tr.offsetWidth; tr.classList.add("sorot"); };
          cari(); });
        box.append(kj); }
      new maplibregl.Popup({offset: 12, closeButton: false, maxWidth: "300px", focusAfterOpen: false}).setLngLat(e.features[0].geometry.coordinates).setDOMContent(box).addTo(alunPeta); });
    for (const l of ["kelompok", "titik"]) { alunPeta.on("mouseenter", l, () => { alunPeta.getCanvas().style.cursor = "pointer"; }); alunPeta.on("mouseleave", l, () => { alunPeta.getCanvas().style.cursor = ""; }); }
    pas();
  });
}
/* /lapor/?alun: tujuan /alun-alun lama (dialihkan Worker, KEPUTUSAN-LAPOR-AI K94); langsung ke peta Alun-alun tanpa animasi pembuka */
const BUKA_ALUN = new URLSearchParams(location.search).has("alun");
const layarAwal = () => ke(BUKA_ALUN ? "alun" : "beranda");
/* Kabar Alun-alun (KA-06, KA-07): satu kartu per kejadian, empat pita tetap urutannya: Resmi BNPB, Laporan warga, Berita, Media sosial.
   Angka tiap sumber tampil di pitanya sendiri dan tidak pernah dijumlah (D3). Daftar digambar bertahap lewat requestAnimationFrame supaya klik tidak membeku. */
const SUMBER_ALUN = [["", "Semua", "i-daftar"], ["resmi", "Resmi", "i-status"], ["warga", "Warga", "i-orang"], ["berita", "Berita", "i-pesan"], ["medsos", "Medsos", "i-bantuan"]];
function pitaKabar(nama, ikonId, ...isi) {
  const p = el("div", "lp-kb-pita"), h = el("span", "lp-kb-pil"); h.append(ikon(ikonId), nama); p.append(h, ...isi); return p;
}
const kosongKabar = t => el("p", "lp-redup lp-kb-kosong", t);
function kartuKejadian(x, ikut) {
  const t = teksKartu(x, Date.now()), k = el("section", "ex ex-std lp-kabar"); k.id = `alun-${x.id}`;
  const hd = el("header", "ex-hd"), ey = el("span", "ex-ey"), jd = el("div", "ex-jd");
  // kartu terlipat: kepala jadi tombol buka-tutup, isi baru tampil saat diketuk (pemilik 26 Nov 2026: "jangan langsung muncul")
  const h3 = el("h3"), buka = el("button", "lp-kb-buka"); buka.type = "button"; buka.setAttribute("aria-expanded", "false"); buka.setAttribute("aria-controls", `alun-isi-${x.id}`);
  buka.append(el("span", null, x.kab || "Lokasi belum diketahui"), ikon("i-panah", "lp-kb-panah")); h3.append(buka);
  ey.append(ikon(IKON_JENIS[x.jenis] || "i-kejadian"), x.jenisLabel); jd.append(h3); hd.append(ey, jd);
  if (x.titikKet) hd.append(el("small", "lp-redup", x.titikKet.charAt(0).toUpperCase() + x.titikKet.slice(1)));
  const pk = dpDok && barisPrakiraan(x.kabKode, {...dpDok, DP: window.DampakPeringatan});   // D23: satu baris kecil, hanya tautan; tidak mengubah status atau angka kejadian
  if (pk) { const bp = el("div", "lp-kb-prakiraan"), tb = el("button", "lp-teks-tombol", pk.teks); tb.type = "button"; tb.title = "Lihat di peta Peringatan"; tb.addEventListener("click", () => setModeAlun("peringatan", pk.kode));
    bp.append(tb); if (pk.hipotesis) bp.append(el("span", "lp-pil", "Hipotesis")); hd.append(bp); }
  const bd = el("div", "ex-bd"), belum = [], pita = [];   // pita kosong tidak digambar; sumber yang kosong disebut sekali di baris "Belum ada ..." (pemilik 26 Nov 2026: "Bagusin")
  // Resmi BNPB
  const r = t.resmi, pr = pitaKabar("Resmi BNPB", "i-status");
  if (!r.ada) belum.push("laporan resmi");
  else { pita.push(pr); const st = el("p", "lp-kb-status"); st.append(el("b", null, r.status)); if (r.baru) st.append(el("span", "lp-pil", "Baru")); pr.append(st);
    // hanya angka yang ada; bila semuanya kosong, satu kalimat, bukan tiga kotak "belum ada data"
    const ada = r.angka.filter(a => a.nilai != null), g = ada.length ? el("div", "lp-kb-angka") : el("p", "lp-redup lp-kecil", "Angka dampak belum dilaporkan.");
    // ikon polos per kotak angka (pemilik 26 Nov 2026: "Kasih icon")
    for (const a of ada) { const c = el("div"), tx = el("span"); tx.append(el("b", null, a.teks), el("small", null, a.label));
      c.append(ikon({"KK terdampak": "i-orang", mengungsi: "i-pengungsian", "rumah terdampak": "i-rumah"}[a.label] || "i-status", "lp-kb-angka-ik"), tx); g.append(c); }
    pr.append(g, el("small", "lp-redup", r.kesegaran)); }
  // Laporan warga
  const pw = pitaKabar("Laporan warga", "i-orang");
  if (!t.warga.baris.length) belum.push("laporan warga"); else pita.push(pw);
  for (const b of t.warga.baris) {
    const baris = el("div", "lp-kb-warga"), kep = el("p", "lp-kb-warga-kep");
    kep.append(el("span", null, [b.tempat, b.waktu].filter(Boolean).join(", ")), el("span", `lp-pil ${b.status}`, b.statusLabel)); baris.append(kep);
    if (b.nWarga) baris.append(el("small", "lp-redup", b.nWarga));
    if (b.angka.length) { const d = el("div", "lp-alun-dampak"); for (const a of b.angka) d.append(el("span", null, `${a.teks} ${a.label}`)); baris.append(d); }
    else baris.append(el("small", "lp-redup", b.kosongAngka));
    const on = !!ikut[b.id], ik = el("button", `lp-kedua lp-alun-ikuti${on ? " aktif" : ""}`); ik.type = "button"; ik.setAttribute("aria-pressed", String(on));
    ik.append(ikon(on ? "i-centang" : "i-plus"), on ? "Diikuti" : "Ikuti kejadian"); ik.title = "Disimpan di perangkat ini. Kartu ditandai saat statusnya berubah.";
    ik.addEventListener("click", () => { const m = ikutiBaca(); if (m[b.id]) delete m[b.id]; else m[b.id] = b.status; ikutiTulis(m); gambarAlun(); });
    baris.append(ik); pw.append(baris);
  }
  // Berita: tautan hanya http atau https, dibuka di tab baru
  const pb = pitaKabar("Berita", "i-pesan");
  if (!t.berita.baris.length) { if (/^Belum ada berita/.test(t.berita.kosong)) belum.push("berita"); else { pb.append(kosongKabar(t.berita.kosong)); pita.push(pb); } }   // "berita belum bisa diambil" tetap tampil: itu gangguan, bukan kosong
  else { pita.push(pb); const ul = el("ul", "lp-kb-berita");
    for (const b of t.berita.baris) { const li = el("li"), judul = b.url ? Object.assign(el("a", null, b.judul), {href: b.url, target: "_blank", rel: "noopener noreferrer"}) : el("span", null, b.judul), tx = el("div");
      tx.append(judul, el("small", "lp-redup", [b.media, b.tgl].filter(Boolean).join(", ")));
      // tiap berita punya kotak gambar (pemilik 26 Nov 2026: "Kasih thumbnail berita"): thumbnail kita bila ada, selain itu ikon berita di kotak yang sama, jadi daftar rata
      li.className = "ada-gambar"; const kosongG = () => { const k = el("span", "lp-kb-thumb kosong"); k.append(ikon("i-pesan")); return k; };
      if (b.gambar) { const img = Object.assign(el("img", "lp-kb-thumb"), {src: b.gambar, alt: "", loading: "lazy", decoding: "async", width: 96, height: 64}); img.addEventListener("error", () => img.replaceWith(kosongG())); li.append(img); } else li.append(kosongG());
      li.append(tx); ul.append(li); }
    pb.append(ul); if (t.berita.lebih) pb.append(el("small", "lp-redup", `Dan ${t.berita.lebih.toLocaleString("id-ID")} berita lain yang cocok.`)); }
  // Media sosial (KA-07) belum tersambung: tidak diulang di tiap kartu; keterangannya tampil sekali lewat saringan Medsos
  if (belum.length) bd.append(el("p", "lp-kb-belum", `Belum ada ${belum.length > 2 ? belum.slice(0, -1).join(", ") + ", dan " + belum.at(-1) : belum.join(" dan ")}.`));
  bd.prepend(...pita);
  // ringkasan di kepala kartu terlipat: status resmi dan jumlah tiap sumber, tanpa menjumlah angka antarsumber (D3)
  const nBerita = t.berita.baris.length + (t.berita.lebih || 0), ring = el("p", "lp-kb-ringkas");
  ring.append(el("b", null, r.ada ? r.status : "Belum ada laporan resmi"));
  if (t.warga.baris.length) ring.append(el("span", "lp-pil", `${t.warga.baris.length.toLocaleString("id-ID")} laporan warga`));
  if (nBerita) ring.append(el("span", "lp-pil", `${nBerita.toLocaleString("id-ID")} berita`));
  hd.append(ring);
  bd.id = `alun-isi-${x.id}`; bd.hidden = true;
  buka.addEventListener("click", () => { const b = bd.hidden; bd.hidden = !b; buka.setAttribute("aria-expanded", String(b)); k.classList.toggle("buka", b); });
  k.append(hd, bd); return k;
}
/* Alun-alun per provinsi (pemilik 26 Nov 2026: "harusnya dia ini dikelompokkan kaya gini"): tabel provinsi dulu, klik baris = kartu kejadian provinsi itu.
   Kolom menghitung kejadian per sumber terpisah (D3: angka antarsumber tidak dijumlah). Nama provinsi dari /instansi_wilayah.js (satu tabel nama wilayah). */
let alunProv = "", alunPeriode = 0;   // alunPeriode: 0 = semua data, n = n hari terakhir (pemilik 26 Nov 2026: period picker)
const PERIODE_ALUN = [[1, "Hari ini"], [3, "3 hari"], [7, "7 hari"], [0, "Semua"]];
/* tanggal kegiatan terakhir satu kejadian: laporan resmi terakhir, tanggal mulai, atau laporan warga terbaru */
const akhirKejadian = x => [x.resmi?.lap_terakhir, x.resmi?.mulai, ...x.warga.map(g => String(g.waktu || "").slice(0, 10))].filter(Boolean).sort().pop() || "";
function pitaPeriode() {
  const d = el("div", "lp-alun-periode"); d.setAttribute("role", "radiogroup"); d.setAttribute("aria-label", "Periode kejadian");
  const ref0 = alunKabar?.hari, kini0 = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // data belum hari ini: tombol pertama memakai tanggal datanya, bukan "Hari ini"
  for (const [n, t] of PERIODE_ALUN) { const b = el("button", null, n === 1 && ref0 && ref0 < kini0 ? tglPendekId(ref0) : t); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(n === alunPeriode));
    b.addEventListener("click", () => { if (n === alunPeriode) return; alunPeriode = n; for (const c of d.children) c.setAttribute("aria-checked", String(c === b)); gambarAlun(); }); d.append(b); }
  const ref = alunKabar?.hari; if (ref) { const a = el("small", "lp-redup"); a.textContent = alunPeriode ? `sampai ${tglPendekId(ref)}` : `data ${tglPendekId(akhirAwal())} sampai ${tglPendekId(ref)}`; d.append(a); }
  return d;
}
/* layar lebar: periode jadi kartu "Tanggal data" di kanan atas peta seperti peta utama (pemilik 26 Nov 2026); HP: tetap di atas daftar. Hasil = isi untuk daftar */
function taruhPeriode() {
  const lama = $("periodeAlun"); if (!matchMedia("(min-width:900px)").matches) { lama?.remove(); return [pitaPeriode()]; }
  const k = el("section", "lp-alun-tanggal"); k.id = "periodeAlun"; k.setAttribute("aria-label", "Tanggal data"); k.append(el("b", null, "Tanggal data"), pitaPeriode());
  if (lama) lama.replaceWith(k); else $("petaAlun").append(k); return [];
}
const tglPendekId = iso => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"}) : ""; };
const akhirAwal = () => (alunKabar?.kejadian || []).map(k => k.lap_terakhir).filter(Boolean).sort()[0] || alunKabar?.hari;
const muatWilayah = () => muatWilayah.j ||= new Promise(ok => { if (window.Wilayah) return ok();
  document.head.append(Object.assign(document.createElement("script"), {src: "/instansi_wilayah.js?v=1", onload: ok, onerror: ok})); });
const lambangAlun = () => lambangAlun.j ||= fetch("/lambang/kabkota.json").then(r => r.ok ? r.json() : {}).catch(() => ({}));   // sama dengan /bnpb/dalops
const namaProv = k => !k ? "Provinsi belum diketahui" : window.Wilayah?.PROV?.[k] || `Provinsi ${k}`;
function pilihProv(k) { alunProv = k; gambarAlun(); $("daftarAlun").scrollTop = 0; $("daftarAlun").closest(".lp-alun-panel")?.scrollTo?.({top: 0}); }
function kepalaProvinsi(k, n) {
  const b = el("div", "lp-alun-provkep"), kembali = el("button", "lp-teks-tombol"); kembali.type = "button"; kembali.append(ikon("i-kembali"), "Semua provinsi");
  kembali.addEventListener("click", () => pilihProv("")); b.append(kembali, el("b", null, namaProv(k)), el("span", "lp-pil", `${n.toLocaleString("id-ID")} kejadian`)); return b;
}
/* status gunung api di Alun-alun (pemilik 26 Nov 2026: "Yang siaganya juga dimasukin kesini dong"), isi seperti peta dan halaman gunung api deck harian:
   hitungan Awas, Siaga, Waspada, Normal dan daftar gunung Siaga/Awas dengan radius dan sektor bahaya. Sumber MAGMA/PVMBG apa adanya (gunungapi_status.json); kosong = "belum ada data". */
const muatGunung = () => muatGunung.j ||= fetch("/banjir/data/gunungapi_status.json").then(r => r.ok ? r.json() : null).catch(() => null);
const ARAH_SINGKAT = {utara: "U", selatan: "S", timur: "T", barat: "B", tenggara: "TG", "barat daya": "BD", "barat laut": "BL", "timur laut": "TL"};
function sektorBahaya(g) {   // sektor dan jarak terjauh dari kalimat rekomendasi PVMBG; tanpa kalimat sektor = tidak ditampilkan
  const m = /sektor ((?:barat daya|barat laut|timur laut|tenggara|utara|selatan|timur|barat)(?:[- ](?:barat daya|barat laut|timur laut|tenggara|utara|selatan|timur|barat))*)([^]*?)(?=Pada sektor|\. \d|$)/i.exec(g.rekomendasi || "");
  if (!m) return null;
  const km = Number(g.sektor_km) > 0 ? Number(g.sektor_km) : Math.max(...[...m[2].matchAll(/(\d+(?:,\d+)?)\s*km/gi)].map(x => Number(x[1].replace(",", "."))));   // sektor_km dari PVMBG didahulukan
  if (!Number.isFinite(km) || km <= 0) return null;
  const arah = m[1].toLowerCase(), singkat = arah.split(/[- ](?=utara|selatan|timur|barat|tenggara)/).map(a => ARAH_SINGKAT[a.trim()] || a).join("-");
  return {km, arah, singkat};
}
function kartuGunung() {
  const sec = el("section", "lp-alun-gunung"), kep = el("header"), isi = el("div"); kep.append(el("b", null, "Status gunung api")); sec.append(kep, isi);
  isi.append(el("p", "lp-redup lp-kecil", "Memuat status gunung api."));
  muatGunung().then(d => {
    const L = d?.gunung || [], j = d?.jumlah_level;
    if (!j || !L.length) return isi.replaceChildren(el("p", "lp-redup lp-kecil", "Status gunung api belum ada data."));
    if (d.dibuat) { const t = new Date(d.dibuat); if (!isNaN(t)) kep.append(el("small", "lp-redup", `MAGMA PVMBG, data ${t.toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"})}`)); }
    const kotak = el("div", "lp-alun-gunung-kotak");
    for (const [lv, nama] of [[4, "Awas"], [3, "Siaga"], [2, "Waspada"], [1, "Normal"]]) { const k = el("div", `lv${lv}`), n = j[String(lv)];
      k.append(el("b", null, Number.isFinite(n) ? n.toLocaleString("id-ID") : "–"), el("small", null, nama)); kotak.append(k); }
    const ul = el("ul", "lp-alun-gunung-daftar");
    for (const g of L.filter(g => g.level >= 3).sort((a, b) => b.level - a.level || a.nama.localeCompare(b.nama, "id"))) {
      const li = el("li"), nm = el("div"); nm.append(el("b", null, g.nama), el("small", "lp-redup", [g.level === 4 ? "Awas" : "Siaga", g.prov].filter(Boolean).join(", ")));
      const pil = el("div", "lp-alun-gunung-pil");
      if (Number.isFinite(g.radius_km)) pil.append(el("span", "lp-pil", `Radius ${g.radius_km.toLocaleString("id-ID")} km`));
      const sb = sektorBahaya(g); if (sb) { const p = el("span", "lp-pil lv3", `Bahaya ${sb.km.toLocaleString("id-ID")} km arah ${sb.singkat}`); p.title = `Sektor ${sb.arah}`; pil.append(p); }
      li.append(el("i", `lp-alun-gunung-ikon lv${g.level}`), nm, pil); ul.append(li); }
    isi.replaceChildren(kotak, ...(ul.children.length ? [ul] : [el("p", "lp-redup lp-kecil", "Tidak ada gunung api berstatus Siaga atau Awas.")]));
  });
  return sec;
}
function tabelProvinsi(w, daftar) {
  const g = new Map();
  for (const x of daftar) { const k = x.prov || "", r = g.get(k) || {k, n: 0, jalan: 0, warga: 0, berita: 0}; r.n++; if (x.status === "berjalan") r.jalan++; r.warga += x.warga.length; r.berita += x.nBerita || 0; g.set(k, r); }
  const baris = [...g.values()].sort((a, b) => b.n - a.n || b.jalan - a.jalan || namaProv(a.k).localeCompare(namaProv(b.k), "id"));
  const t = el("table", "ex-tabel lp-alun-prov"), th = el("thead"), tb = el("tbody"), f = v => v ? v.toLocaleString("id-ID") : "–";
  // kolom yang seluruhnya kosong (mis. Warga) tidak digambar; Berita bukan angka resmi, jadi tampil redup supaya tidak tampak setara (D3, pemilik 26 Nov 2026)
  const tot = baris.reduce((a, r) => ({n: a.n + r.n, jalan: a.jalan + r.jalan, warga: a.warga + r.warga, berita: a.berita + r.berita}), {n: 0, jalan: 0, warga: 0, berita: 0});
  const KOL = [["n", "Kejadian", "Jumlah kejadian di provinsi ini", "n"], ["jalan", "Berjalan", "Kejadian berstatus berjalan menurut laporan resmi BNPB", ""],
    ["warga", "Warga", "Klaster laporan warga yang sudah ditindaklanjuti", "lain"], ["berita", "Berita", "Berita yang cocok dengan kejadian", "lain"]].filter(([k]) => k === "n" || tot[k] > 0);
  const kep = el("tr"); for (const [teks, judul] of [["", ""], ["Provinsi", ""], ...KOL.map(([, t, j]) => [t, j])]) { const c = el("th", null, teks); c.scope = "col"; if (judul) c.title = judul; kep.append(c); }
  th.append(kep);
  const rt = el("tr", "lp-alun-prov-total"); rt.append(el("td"), el("td", null, "Total"), ...KOL.map(([k, , , kl]) => el("td", kl || null, f(tot[k])))); tb.append(rt);
  baris.forEach((r, i) => { const tr = el("tr"), nm = el("button", "lp-alun-prov-nama", namaProv(r.k)); nm.type = "button"; nm.addEventListener("click", () => pilihProv(r.k));
    const c = el("td"); c.append(nm); tr.append(el("td", "lp-redup", String(i + 1)), c, ...KOL.map(([k, , , kl]) => el("td", kl || null, f(r[k]))));
    tr.addEventListener("click", e => { if (e.target !== nm) pilihProv(r.k); }); tb.append(tr); });
  t.append(th, tb); w.append(t);
  if (!window.Wilayah) muatWilayah().then(() => { if (!alunProv) for (const [i, r] of baris.entries()) { const b = tb.children[i + 1]?.querySelector(".lp-alun-prov-nama"); if (b) b.textContent = namaProv(r.k); } });
}
/* kejadian dalam satu provinsi sebagai tabel (pemilik 26 Nov 2026); kartu lengkap digambar hanya saat barisnya dibuka, jadi klik ringan */
function bukaBarisKejadian(tr, x, ikut) {
  const lalu = tr.nextElementSibling?.classList.contains("lp-alun-kj-rinci") ? tr.nextElementSibling : null, buka = !lalu;
  tr.setAttribute("aria-expanded", String(buka)); if (lalu) { lalu.remove(); return null; }
  const r = el("tr", "lp-alun-kj-rinci"), td = el("td"); td.colSpan = tr.children.length; r.append(td); tr.after(r);
  requestAnimationFrame(() => { const k = kartuKejadian(x, ikut); td.append(k); k.querySelector(".lp-kb-buka")?.click(); });
  return r;
}
function tabelKejadianProv(w, daftar, ikut, giliran) {
  const t = el("table", "ex-tabel lp-alun-prov lp-alun-kj"), th = el("thead"), tb = el("tbody"), kep = el("tr");
  for (const [teks, judul] of [["Kab/kota", ""], ["Bencana", ""], ["Status", "Status menurut laporan resmi BNPB"], ["Berita", "Berita yang cocok dengan kejadian"]]) { const c = el("th", null, teks); c.scope = "col"; if (judul) c.title = judul; kep.append(c); }
  th.append(kep); t.append(th, tb); w.append(t);
  let i = 0; const lanjut = () => { if (giliran !== alunGiliran) return; const f = document.createDocumentFragment();
    for (const x of daftar.slice(i, i + 40)) {
      const tr = el("tr"), jn = el("span", `lp-alun-kj-jenis lp-jenis-${x.jenis || "lainnya"}`);   // pil berwarna per jenis dari token --kat-* (pemilik 26 Nov 2026: "harusnya ada labelnya dan kasih warna") tr.dataset.id = x.id; tr.tabIndex = 0; tr.setAttribute("aria-expanded", "false");
      jn.append(ikon(IKON_JENIS[x.jenis] || "i-kejadian"), x.jenisLabel);
      const tdJ = el("td"); tdJ.append(jn); const tdS = el("td"); tdS.append(el("span", `lp-pil ${x.status || ""}`, x.statusLabel || "–"));
      tr.append(el("td", "lp-alun-kj-kab", x.kab || "Lokasi belum diketahui"), tdJ, tdS, el("td", null, x.nBerita ? x.nBerita.toLocaleString("id-ID") : "–"));
      const tekan = () => bukaBarisKejadian(tr, x, ikut); tr.addEventListener("click", e => { if (!e.target.closest(".lp-alun-kj-rinci")) tekan(); });
      tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tekan(); } }); f.append(tr);
    }
    tb.append(f); i += 40; if (i < daftar.length) requestAnimationFrame(lanjut); else if (alunPeta) alunPeta.resize(); }; lanjut();
}
function gambarKabar(ikut) {
  muatWilayah();   // nama provinsi dimuat sejak awal supaya tabel tidak sempat menampilkan kode
  const sm = $("sumberAlun"); sm.hidden = false;
  sm.replaceChildren(...SUMBER_ALUN.map(([id, tt, ik]) => { const b = el("button"); b.append(ikon(ik), el("span", null, tt)); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(id === alunSumber));
    b.addEventListener("click", () => { alunSumber = id; for (const c of sm.children) c.setAttribute("aria-selected", String(c === b)); gambarAlun(); }); return b; }));
  const giliran = ++alunGiliran, w = $("daftarAlun");
  requestAnimationFrame(() => {   // kerja berat ditunda: chrome (tab, pil) sudah terpasang
    if (giliran !== alunGiliran) return;
    let daftar = saring(gabung(alunKabar, alunData, Date.now()), {sumber: alunSumber, selesai: alunJenis === "selesai"});
    if (alunJenis === "diikuti") { daftar = daftar.filter(x => x.warga.some(g => ikut[g.id])); const m = ikutiBaca(); for (const x of daftar) for (const g of x.warga) if (m[g.id]) m[g.id] = g.status; ikutiTulis(m); }
    if (alunPeriode) { const ref = alunKabar?.hari || new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), batas = new Date(Date.parse(`${ref}T00:00:00Z`) - (alunPeriode - 1) * 864e5).toISOString().slice(0, 10);
      daftar = daftar.filter(x => akhirKejadian(x) >= batas); }   // aktif dalam periode: laporan resmi atau warga terakhir di dalam rentang
    tandaiJenisAda(daftar.map(x => x.jenis));   // chip jenis tanpa kejadian di periode ini dipudarkan, tetap bisa ditekan
    if (alunJenisPilih.size) daftar = daftar.filter(x => alunJenisPilih.has(x.jenis));
    const semuaProv = daftar;   // tabel per provinsi dihitung dari daftar tersaring, sebelum dipilih satu provinsi
    if (alunProv) daftar = daftar.filter(x => (x.prov || "") === alunProv);
    gambarPetaAlun(daftar.map(x => ({id: x.id, titik: x.titik, jenis: x.jenisLabel, jenisId: x.jenis, lokasi: {kab: x.kab}, statusLabel: x.statusLabel, status: x.status, prov: x.prov, resmi: x.resmi, nBerita: x.nBerita || 0})));
    if (!daftar.length && alunProv) { alunProv = ""; return gambarAlun(); }   // provinsi terpilih kosong setelah saringan diganti: kembali ke tabel
    if (!daftar.length) {
      const k = el("div", "lp-kosong-besar"), m = el("div", "lp-kosong-maskot"); m.innerHTML = maskot("berpikir");
      const tx = el("div", "lp-kosong-teks"); tx.append(el("h2", null, alunJenis === "diikuti" ? "Belum ada kejadian yang Anda ikuti" : alunSumber === "medsos" ? "Media sosial belum tersambung" : "Belum ada kejadian untuk saringan ini"),
        el("p", null, alunSumber === "medsos" ? "Belum ada unggahan media sosial yang ditampilkan." : alunPeriode ? "Coba periode yang lebih panjang, atau ganti saringan jenis atau sumber." : "Coba ganti saringan jenis atau sumber."));
      k.append(m, tx); return w.replaceChildren(...taruhPeriode(), k);
    }
    w.replaceChildren(...taruhPeriode(), ...(alunJenis === "selesai" ? [el("p", "lp-redup lp-kb-catatan", "Kejadian selesai yang tampil hanya yang tercatat dalam 8 hari terakhir.")] : []));
    if (!alunProv) return tabelProvinsi(w, semuaProv);   // Status gunung api pindah ke tampilan Peringatan (pemilik 26 Nov 2026)   // tampilan awal: dikelompokkan per provinsi seperti panel karhutla (pemilik 26 Nov 2026)
    w.append(kepalaProvinsi(alunProv, daftar.length));
    tabelKejadianProv(w, daftar, ikut, giliran);   // pemilik 26 Nov 2026: "ga bisa dibuat kaya tabel gitu aja?": satu baris per kejadian, kartu lengkap terbuka di bawah baris yang diketuk
  });
}
/* ---- tampilan Peringatan (DP-11): modul bersama inti/dampak_peringatan.js dipasang per bahaya; kartu kejadian tidak pernah bercampur dengan kartu prakiraan (D23) ---- */
let alunMode = "kejadian", dpBahaya = "bnj", dpDok;   // dpDok: undefined = belum dicoba, null = tak ada, {status, ringkas}
const dpAlat = {}, dpJson = u => fetch(u, {signal: AbortSignal.timeout(10000)}).then(r => r.ok ? r.json() : null).catch(() => null);
const dpModul = () => dpModul.j ||= new Promise(ok => { if (window.DampakPeringatan) return ok();
  document.head.append(Object.assign(document.createElement("link"), {rel: "stylesheet", href: "/inti/dampak_peringatan.css?v=1"}));
  document.head.append(Object.assign(document.createElement("script"), {src: "/inti/dampak_peringatan.js?v=2", onload: ok, onerror: ok})); });
const muatDp = () => muatDp.j ||= Promise.all([dpModul(), dpJson("/api/dampak-peringatan/status"), dpJson("/api/dampak-peringatan/ringkas")]).then(([, status, ringkas]) => {
  dpDok = window.DampakPeringatan && status?.kab && !status.belum_terukur ? {status, ringkas} : null; });
const LABEL_BAHAYA = {bnj: "Banjir", lsr: "Longsor", cex: "Cuaca", kht: "Karhutla"};
const KAMUS_PETA = ["kelompok", "kelompok-n", "titik", "titik-n", "prov-terdampak", "prov-garis", "gunung-siaga"];
const petaAlunSiap = async () => { for (let i = 0; i < 100 && !alunPeta; i++) await new Promise(r => setTimeout(r, 100));
  if (!alunPeta) return false; if (!alunPeta.getLayer("titik")) await new Promise(r => alunPeta.once("load", r)); return true; };
function tabBahaya() {
  const w = $("bahayaAlun");
  w.replaceChildren(...BAHAYA_ALUN.map(([kode, , ik]) => { const b = el("button"); b.append(ikon(ik), el("span", null, LABEL_BAHAYA[kode])); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.bahaya = kode;
    b.setAttribute("aria-selected", String(kode === dpBahaya)); b.addEventListener("click", () => setModeAlun("peringatan", kode)); return b; }));
}
async function nyalakanPeringatan() {
  const catat = $("catatPeringatan"), kartu = $("kartuPeringatan"), bahaya = dpBahaya;
  catat.textContent = "Memuat status prakiraan...";
  const [siap] = await Promise.all([petaAlunSiap(), muatDp()]);
  if (alunMode !== "peringatan" || bahaya !== dpBahaya) return;   // pengguna sudah pindah lagi
  if (!siap || !dpDok) { catat.textContent = "Status prakiraan belum terukur. Sebagian sumber belum masuk atau sudah basi."; return; }
  for (const l of KAMUS_PETA) if (alunPeta.getLayer(l)) alunPeta.setLayoutProperty(l, "visibility", "none");
  for (const [k, a] of Object.entries(dpAlat)) if (k !== bahaya) a.matikan();
  kartu.hidden = true; kartu.replaceChildren();
  dpAlat[bahaya] ||= window.DampakPeringatan.pasang(alunPeta, {bahaya, kartu});
  const ok = await dpAlat[bahaya].nyalakan();
  if (alunMode !== "peringatan" || bahaya !== dpBahaya) return;
  catat.textContent = !ok ? "Status prakiraan belum terukur. Sebagian sumber belum masuk atau sudah basi."
    : `Prakiraan 3 hari ke depan. Ketuk kabupaten atau kota untuk rincian.${bahaya === "kht" ? " Karhutla tidak punya peringatan BMKG." : ""} Prakiraan Centurisk97 berstatus hipotesis sampai lolos uji balik; peringatan resmi hanya dari BMKG.`;
}
function setModeAlun(mode, bahaya) {
  const per = mode === "peringatan"; alunMode = mode; if (bahaya) dpBahaya = bahaya;
  for (const b of $("modeAlun").children) b.setAttribute("aria-selected", String(b.dataset.mode === mode));   // chrome langsung
  $("saringPanel").hidden = per; $("daftarAlun").hidden = per; if ($("legendaAlun")) $("legendaAlun").hidden = per; if ($("periodeAlun")) $("periodeAlun").hidden = per; if ($("menuJenisAlun")) $("menuJenisAlun").hidden = per; $("isiPeringatan").hidden = !per; $("sumberAlun").hidden = !alunKabar;
  requestAnimationFrame(() => {   // kerja berat ditunda
    if (alunMode !== mode) return;
    if (typeof gambarDonat === "function") gambarDonat();   // cincin dan gunung api penanda DOM: ikut sembunyi di mode Peringatan
    if (per) { tabBahaya(); if (!$("isiPeringatan").querySelector(".lp-alun-gunung")) $("isiPeringatan").append(kartuGunung()); nyalakanPeringatan(); return; }
    for (const a of Object.values(dpAlat)) a.matikan();
    if (alunPeta) for (const l of KAMUS_PETA) if (alunPeta.getLayer(l)) alunPeta.setLayoutProperty(l, "visibility", "visible");
  });
}
new MutationObserver(() => { const k = $("kartuPeringatan"); if (!k.hidden && k.firstChild) k.scrollIntoView({block: "nearest", behavior: "smooth"}); }).observe($("kartuPeringatan"), {childList: true});   // HP: kartu kab di bawah legenda, gulir ke situ
$("modeAlun").addEventListener("click", e => { const b = e.target.closest("button[data-mode]"); if (b && b.dataset.mode !== alunMode) setModeAlun(b.dataset.mode); });
async function tampilAlun() {
  const w = $("daftarAlun");
  if (!alunData.length) w.replaceChildren(el("p", "lp-redup", "Memuat laporan..."));
  try {
    if (alunKabar === undefined) alunKabar = await fetch("/data/alun/kabar.json", {cache: "no-cache", signal: AbortSignal.timeout(10000)}).then(r => r.ok ? r.json() : null).then(j => Array.isArray(j?.kejadian) ? j : null).catch(() => null);   // 404 = belum ada pita resmi
    const j = await fetch(`/api/lapor/alun?jenis=`, {signal: AbortSignal.timeout(10000)}).then(r => r.json()).catch(e => { if (!alunKabar) throw e; return {}; });
    alunData = j.baris || [];
    gambarAlun();
    if (dpDok === undefined) muatDp().then(() => { if (dpDok && alunKabar && alunMode === "kejadian") gambarAlun(); });   // baris prakiraan menyusul, tidak menahan daftar
  } catch { w.replaceChildren(el("p", "lp-redup", "Alun-alun belum bisa dimuat. Coba lagi.")); }
}

/* ============ bahasa (K58, D80): dipilih pelapor, tidak ditebak; disimpan di perangkat. Percakapan diterjemahkan server, data tetap Indonesia ============ */
const bahasaTersimpan = () => { try { return !!localStorage.getItem("lapor-bahasa"); } catch { return true; } };
const bahasaKini = () => { try { return localStorage.getItem("lapor-bahasa") || "id"; } catch { return "id"; } };
/* kartu langkah ikut bahasa pilihan (pemilik 20 Nov 2026: "kenapa masih bahasa Indonesia, kan pilihannya bahasa Sunda"). Teks tetap kartu dikumpulkan,
   diterjemahkan sekali jalan lewat /api/lapor/terjemah, disimpan per bahasa di perangkat. Nama bahasa tidak diterjemahkan. */
// seluruh halaman ikut bahasa pilihan (pemilik 20 Nov 2026: "bahasa itu dari awal, langsung pop up pilih bahasa"), termasuk layar terima kasih di akhir;
// yang dilewati: nama bahasa, isian, balon pesan (bot dari server, pelapor kata-katanya sendiri), nama pelapor, nomor tiket, maskot, animasi pembuka
const sudahTr = new WeakSet(), LEWATI_TR = ".lp-kabar-teks, .lp-kabar-n, .lp-kabar-kapan, .lp-kabar-adu, .lp-kabar-pesan, .lp-bahasa-kisi, .lp-dialog-bahasa, .lp-nama-orang, input, textarea, select, .lp-nomor-chat, #log li:not(.tengah), .lp-tab-profil, .lp-tk-nomor, svg, script, style, noscript, #pembuka";
const trBaca = b => { try { return JSON.parse(localStorage.getItem(`lapor-tr2-${b}`) || "{}"); } catch { return {}; } };
try { for (const k of Object.keys(localStorage)) if (k.startsWith("lapor-tr-")) localStorage.removeItem(k); } catch {}   // cache lama bisa berisi teks asli dari terjemahan gagal
const trTulis = (b, m) => { try { localStorage.setItem(`lapor-tr2-${b}`, JSON.stringify(m)); } catch {} };
// akar yang diterjemahkan: kartu langkah, panel isian kanan, kepala chat, dan pemisah di log (bukan balon pesan: balon bot sudah dari server, balon pelapor kata-katanya sendiri)
const AKAR_TR = () => [document.body];
let trJalan = null, trUlang = false, trCoba = 0;
async function terjemahKartu() {   // satu putaran sekaligus; perubahan selama berjalan memicu satu putaran lagi sesudahnya
  if (trJalan) { trUlang = true; return trJalan; }
  trJalan = terjemahSekali().then(sisa => { if (sisa && ++trCoba <= 4) setTimeout(terjemahKartu, 4000 * trCoba); else if (!sisa) trCoba = 0; })   // ada yang belum terjemah: ulang sampai 4 kali
    .finally(() => { trJalan = null; if (trUlang) { trUlang = false; terjemahKartu(); } });
  return trJalan;
}
/* kamus statis per bahasa (public/lapor/tr/<kode>.json, dibuat scripts/lapor/tr_buat.mjs): semua teks tetap sudah diterjemahkan sebelumnya,
   jadi layar berganti seketika tanpa menunggu AI (pemilik 20 Nov 2026: "semua statis, lu terjemahin aja semua dulu"). API hanya untuk teks tersusun saat jalan. */
const kunciTr = t => String(t).replace(/\s+/g, " ").trim();
const TR_VERSI = "20261125a";   // naikkan tiap kamus public/lapor/tr dibuat ulang
const STATIS = new Map();   // kode -> {kunci: terjemahan} | Promise
function muatStatis(b) {
  if (!STATIS.has(b)) STATIS.set(b, fetch(`/lapor/tr/${b}.json?v=${TR_VERSI}`).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(k => { STATIS.set(b, k); return k; }));
  return STATIS.get(b);
}
if (bahasaKini() !== "id") muatStatis(bahasaKini());   // diambil sejak awal, selagi animasi pembuka
const statisSiap = b => { const k = STATIS.get(b); return k && !(k instanceof Promise) ? k : null; };
const trStatis = t => { const b = bahasaKini(); if (b === "id") return t; const k = statisSiap(b); if (!k) return t; return k[kunciTr(t)] || String(t).split("\n").map(b => k[kunciTr(b)] || b).join("\n"); };   // balon bot (utuh, lalu per baris) buatan layar
/* balon jawaban pelapor yang disusun layar ("Jalan atau jembatan rusak: Jl. X", "Meninggal 1, Hilang 2") ikut bahasa pilihan; nama dan angka tetap.
   Yang dikirim ke mesin tetap teks Indonesia, jadi meja Pantau membaca bahasa Indonesia (pemilik 21 Nov 2026). */
const trTampil = t => { const b = bahasaKini(); if (b === "id") return t; const k = statisSiap(b); if (!k) return t; if (k[kunciTr(t)]) return k[kunciTr(t)];
  const satu = x => { const m = x.match(/^(.*?)(\s+[\d.,]+(?:\s*\S{0,6})?)$/); return k[kunciTr(x)] || (m && k[kunciTr(m[1])] ? k[kunciTr(m[1])] + m[2] : x); };
  const [kepala, ...ekor] = String(t).split(": "); return ekor.length ? `${satu(kepala)}: ${ekor.join(": ")}` : String(t).split(", ").map(satu).join(", "); };
function kumpulSasaran() {
  const sasaran = [];
  for (const akar of AKAR_TR()) {
    const jalan = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT);
    for (let n; (n = jalan.nextNode());) { const t = kunciTr(n.nodeValue); if (t.length > 1 && t.length <= 600 && /\p{L}{2}/u.test(t) && !/^LA-\d/.test(t) && !sudahTr.has(n) && !n.parentElement?.closest(LEWATI_TR)) sasaran.push({n, t}); }
    for (const e of akar.querySelectorAll?.("[placeholder]") || []) if (!sudahTr.has(e)) sasaran.push({e, at: "placeholder", t: kunciTr(e.getAttribute("placeholder"))});
  }
  return sasaran;
}
// teks Indonesia asli tiap simpul yang diterjemahkan, supaya ganti bahasa bisa di tempat tanpa muat ulang (pemilik 20 Nov 2026: "kenapa balik ke animasi")
const ASLI_TR = new Map();   // simpul teks atau elemen -> teks asli
function kembalikanAsli() {
  for (const [x, v] of ASLI_TR) { if (x.isConnected) { if (x.nodeType === 3) x.nodeValue = v; else x.setAttribute("placeholder", v); } sudahTr.delete(x); }
  ASLI_TR.clear();
}
function pasangTr(sasaran, kamus) {
  for (const x of sasaran) { const tr = kamus[x.t]; if (!tr) continue;
    const sp = x.n || x.e; if (sp.isConnected && !ASLI_TR.has(sp)) ASLI_TR.set(sp, x.n ? x.n.nodeValue : x.e.getAttribute(x.at));
    if (x.n) { if (x.n.isConnected) { const v = x.n.nodeValue, kiri = v.match(/^\s*/)[0], kanan = v.match(/\s*$/)[0]; x.n.nodeValue = kiri + tr + kanan; sudahTr.add(x.n); } }
    else if (x.e.isConnected) { x.e.setAttribute(x.at, tr); sudahTr.add(x.e); } }
}
// sinkron dari kamus statis: dipanggil langsung di MutationObserver (sebelum layar dilukis), jadi tidak ada kilasan bahasa Indonesia
function terjemahStatis() { const b = bahasaKini(); if (b === "id") return; const k = statisSiap(b); if (k) pasangTr(kumpulSasaran(), k); }
async function terjemahSekali() {
  const b = bahasaKini(); if (b === "id") return;
  const statis = await muatStatis(b), kamus = {...trBaca(b), ...statis}, sasaran = kumpulSasaran();
  pasangTr(sasaran, kamus);
  const belum = [...new Set(sasaran.filter(x => !kamus[x.t] && x.t.length <= 150).map(x => x.t))];
  if (!belum.length) return 0;
  const potong = []; for (let i = 0; i < belum.length; i += 60) potong.push(belum.slice(i, i + 60));
  const simpan = trBaca(b);
  await Promise.all(potong.map(async bag => {   // potongan dikirim bersamaan; butir null = gagal, dicoba lagi pada putaran berikutnya
    try { const r = await fetch("/api/lapor/terjemah", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({bahasa: b, teks: bag}), signal: AbortSignal.timeout(45000)});
      const j = await r.json(); if (r.ok) bag.forEach((t, k) => { if (typeof j.teks?.[k] === "string" && j.teks[k]) kamus[t] = simpan[t] = j.teks[k]; }); } catch {}
  }));
  trTulis(b, simpan);
  if (bahasaKini() !== b) return;   // bahasa diganti sementara menunggu
  pasangTr(sasaran, kamus);
  return sasaran.filter(x => !kamus[x.t] && x.t.length <= 150 && (x.n ? x.n.isConnected : x.e.isConnected)).length;   // jumlah yang belum terjemah
}
{ let tunda = 0; const ob = new MutationObserver(() => { if (bahasaKini() === "id") return; terjemahStatis(); clearTimeout(tunda); tunda = setTimeout(terjemahKartu, 60); });
  ob.observe(document.body, {childList: true, subtree: true}); setTimeout(terjemahKartu, 0); }
/* jendela pilih bahasa saat pertama membuka situs (sesudah animasi pembuka); dikelompokkan per wilayah (pemilik 20 Nov 2026: "bagusin") */
const WILAYAH_BAHASA = [["Nasional", ["id", "en"]], ["Jawa", ["jv", "su", "mad"]], ["Bali dan Nusa Tenggara", ["ban", "sas"]],
  ["Sumatra", ["min", "bbc", "btx", "btm", "bts", "nia", "ace", "msa", "ljp"]], ["Kalimantan", ["bjn", "nij"]], ["Sulawesi", ["bug", "mak", "sda", "gor"]], ["Maluku dan Papua", ["abs", "pmy"]]];
async function dialogBahasa(selesai = null) {   // selesai(): dipanggil sesudah Lanjut atau Tutup; halaman di belakang tidak diubah
  if (!daftarBahasa) { try { daftarBahasa = (await (await fetch("/api/lapor/bahasa", {signal: AbortSignal.timeout(10000)})).json()).bahasa || []; } catch { daftarBahasa = []; } }
  if (daftarBahasa.length < 2) return selesai?.();
  const d = el("dialog", "lp-dialog-bahasa"), kep = el("div", "lp-db-kepala"), m = el("div", "lp-db-maskot"), tx = el("div"), h = el("h2", null, "Pilih bahasa Anda");
  m.innerHTML = maskot("sapa"); h.id = "judulDialogBahasa"; d.setAttribute("aria-labelledby", h.id);
  tx.append(h);   // cukup "Pilih bahasa Anda" (pemilik 25 Nov 2026)
  // tombol tutup kanan atas (pemilik 20 Nov 2026: "di kanan atas ada buat closenya"); sama dengan Esc
  const bTutup = el("button", "lp-ikon lp-db-tutup"); bTutup.type = "button"; bTutup.setAttribute("aria-label", "Tutup"); bTutup.append(ikon("i-tutup"));
  bTutup.addEventListener("click", () => d.dispatchEvent(new Event("cancel")));
  kep.append(m, tx, bTutup);
  const kode = new Map(daftarBahasa.map(b => [b.kode, b.nama])), kini = bahasaKini(), isi = el("div", "lp-db-isi");
  // klik hanya memilih; baru dipakai sesudah Lanjut (pemilik 20 Nov 2026: "diokein dulu baru dia bisa lanjut")
  let terpilih = kini; const tombol = new Map();
  const pakai = b => { const lama = bahasaKini(); try { localStorage.setItem("lapor-bahasa", b); } catch {} d.close(); d.remove();
    if (lama !== b) kembalikanAsli();   // teks Indonesia asli dipulihkan dulu, lalu diterjemahkan ke bahasa baru; tanpa muat ulang dan tanpa animasi pembuka
    labelBahasaMenu(); terjemahKartu(); selesai?.(); };
  // pratinjau: judul, keterangan, dan tombol Lanjut langsung memakai bahasa yang dipilih (pemilik 20 Nov 2026), dari simpanan atau satu permintaan terjemah
  let urutPratinjau = 0;
  const pratinjau = async k => { const no = ++urutPratinjau, nama = kode.get(k)?.replace(/^Bahasa /, "") || "Indonesia";
    const grup = [...d.querySelectorAll(".lp-db-grup h3")], asli = ["Pilih bahasa Anda", `Lanjut dalam bahasa ${nama}`, ...grup.map(x => x.dataset.asli ||= x.textContent)];
    const pasang = t => { if (no !== urutPratinjau) return; h.textContent = t[0]; lanjut.lastChild.textContent = t[1]; grup.forEach((x, i) => { x.textContent = t[2 + i]; }); };
    if (k === "id") return pasang(asli);
    const kamus = {...trBaca(k), ...await muatStatis(k)}, belum = asli.filter(t => !kamus[t]);   // kamus statis dulu: pratinjau seketika
    pasang(asli.map(t => kamus[t] || t));
    if (!belum.length) return;
    try { const r = await fetch("/api/lapor/terjemah", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({bahasa: k, teks: belum}), signal: AbortSignal.timeout(20000)});
      const j = await r.json(); if (r.ok) belum.forEach((t, i) => { if (typeof j.teks?.[i] === "string" && j.teks[i]) kamus[t] = j.teks[i]; }); trTulis(k, {...trBaca(k), ...Object.fromEntries(belum.filter(t => kamus[t]).map(t => [t, kamus[t]]))}); } catch {}
    pasang(asli.map(t => kamus[t] || t)); };
  const tandai = () => { for (const [k, b] of tombol) { const on = k === terpilih; b.classList.toggle("aktif", on); b.setAttribute("aria-pressed", String(on)); }
    pratinjau(terpilih); };
  const terpakai = new Set();
  for (const [wil, ks] of [...WILAYAH_BAHASA, ["Lainnya", daftarBahasa.map(b => b.kode)]]) {
    const ada = ks.filter(k => kode.has(k) && !terpakai.has(k)); if (!ada.length) continue;
    const g = el("section", "lp-db-grup"), kisi = el("div", "lp-db-kisi"); g.append(el("h3", null, wil), kisi);
    kisi.style.setProperty("--kol", kolomSimetris(ada.length));   // baris penuh ujung ke ujung, dibagi rata per kelompok
    for (const k of ada) { terpakai.add(k); const b = el("button"); b.type = "button";
      b.append(el("b", null, kode.get(k).replace(/^Bahasa /, "")), ikon("i-centang", "lp-db-centang"));
      b.addEventListener("click", () => { terpilih = k; tandai(); }); b.addEventListener("dblclick", () => pakai(k)); tombol.set(k, b); kisi.append(b); }
    isi.append(g);
  }
  const kaki = el("div", "lp-db-kaki"), lanjut = el("button", "lp-utama"); lanjut.type = "button"; lanjut.append(ikon("i-centang"), el("span"));
  lanjut.addEventListener("click", () => pakai(terpilih)); kaki.append(lanjut);
  d.addEventListener("cancel", () => { try { if (!localStorage.getItem("lapor-bahasa")) localStorage.setItem("lapor-bahasa", "id"); } catch {} d.remove(); selesai?.(); });   // Esc = tetap bahasa terakhir (Indonesia bila belum pernah memilih)
  d.append(kep, isi, kaki); document.body.append(d); tandai(); d.showModal(); (d.querySelector("button.aktif") || d.querySelector("button"))?.focus();
}

/* nomor WhatsApp ditanya di chat bila perangkat ini belum punya (K65: tanpa kode). Nama ditanya mesin pada langkah identitas. */
function tanyaNomor(lanjut) {   // sapaan lalu kartu identitas lengkap (peran, nama, WhatsApp) sebelum persetujuan
  tambah("bot", "*Halo, saya Sigap*\nAsisten AI Pantau Bencana BNPB. Saya bantu sampai laporan Anda lengkap dan diterima petugas. Kenalan dulu, ya. Tanpa kode, tanpa sandi.", {simpanKe: false});
  fPesan.hidden = true; kartuIdentitas(lanjut);
}
/* pilihan bahasa di dalam chat (pemilik 20 Nov 2026: "nanti disuruh pilih ada di chat bot nya"): ditanya sekali saat chat pertama dibuka,
   bisa diganti dengan mengetik "bahasa". Daftar dari server: tanpa model AI hanya Indonesia, pertanyaan dilewati. */
let daftarBahasa = null;
/* tombol bahasa di menu samping dan beranda (pemilik 20 Nov 2026: "agar ada pilih bahasa juga kalau tiba-tiba mau ganti") */
async function labelBahasaMenu() {
  if (!daftarBahasa) { try { daftarBahasa = (await (await fetch("/api/lapor/bahasa", {signal: AbortSignal.timeout(10000)})).json()).bahasa || []; } catch { daftarBahasa = []; } }
  const nama = (daftarBahasa.find(x => x.kode === bahasaKini())?.nama || "Bahasa Indonesia").replace(/^Bahasa /, "");
  for (const b of document.querySelectorAll(".lp-bahasa-menu")) { b.hidden = daftarBahasa.length < 2; b.querySelector("span").textContent = nama; }
}
for (const b of document.querySelectorAll(".lp-bahasa-menu")) b.addEventListener("click", () => dialogBahasa());
labelBahasaMenu();
async function tanyaBahasa(lanjut, paksa = false) {   // pop-up yang sama dengan menu samping (pemilik 20 Nov 2026: "keluar pop up tapi halaman belakangnya tidak berubah")
  let sudah = null; try { sudah = localStorage.getItem("lapor-bahasa"); } catch {}
  if (sudah && !paksa) return lanjut();
  dialogBahasa(lanjut);
}


/* ============ mulai ============ */
async function mulai(nomor, {diChat = false} = {}) {
  wa = String(nomor); simpan.tulis("lapor-wa", wa); // localStorage JSON bisa mengembalikan angka; nomor selalu teks
  cache = simpan.baca(kunciCache()) || {transkrip: [], laporan: []};
  // dari chat (nomor baru diisi): riwayat lama tidak ditampilkan, supaya tidak tercampur dengan percakapan baru yang bisa berbahasa lain
  if (!diChat) { for (const t of cache.transkrip) tambah(t.dari, t.teks, {foto: t.foto, berkas: t.berkas, simpanKe: false}); if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true}); }
  tampilBantu(); tampilBeranda(); if (!diChat) layarAwal();
  try {
    const j = await (await fetch(`/api/lapor/sesi?wa=${nomor}`, {signal: AbortSignal.timeout(15000)})).json();
    if (!diChat && j.status && !["terkirim", "batal", "cari_terkirim"].includes(j.status)) {
      if (!cache.transkrip.length) for (const t of j.transkrip || []) tambah(t.dari === "pelapor" ? "saya" : t.dari, t.teks || (t.lokasi ? "Lokasi dibagikan" : ""));
      terapkan(j);
    }
  } catch {}
  await segarkanLaporan(); tampilBeranda(); salVideo?.kirimSekarang(); // video yang terputus pada kunjungan sebelumnya
  setInterval(() => { if (!document.hidden) tarikKotak(); }, 20000); tarikKotak();
}

const iNomor = $("iNomor");
iNomor.addEventListener("input", () => { let v = iNomor.value.replace(/\D/g, ""); if (v.startsWith("62")) v = v.slice(2); if (v.startsWith("0")) v = v.slice(1); iNomor.value = v.slice(0, 13); iNomor.setCustomValidity(""); });
iNomor.addEventListener("beforeinput", e => { if (e.inputType === "insertText" && e.data && /\D/.test(e.data)) e.preventDefault(); });
$("fNomor").addEventListener("submit", e => {
  e.preventDefault();
  if (!/^8\d{8,12}$/.test(iNomor.value)) { iNomor.setCustomValidity("Nomor WhatsApp dimulai dengan 8, misalnya 812 3456 7890"); iNomor.reportValidity(); return; }
  mulai(`62${iNomor.value}`);
});
const tersimpan = simpan.baca("lapor-wa");
/* pembuka: maskot dan sapaan tiap halaman dibuka (pemilik 20 Nov 2026 "animasinya mana yang di awal"); ketuk untuk melewati */
$("maskotHero").innerHTML = maskot("sapa");
// maskot di kepala halaman Laporan, Bantuan, dan Kebijakan privasi, beraksi sesuai halamannya (pemilik 25 Nov 2026)
// gelembung omongan Sigap di kepala halaman (pemilik 25 Nov 2026: "kenapa dia ga ada ngomong?")
const UCAP_MASKOT = {laporan: ["Saya pantau laporan Anda", "Bila petugas mengubah status atau membalas, kabarnya masuk ke WhatsApp Anda."],
  edukasi: ["Cari jawabannya di sini", "Belum ketemu? Telepon 117, call center BNPB."], status: ["Data Anda kami jaga", "Hanya petugas BNPB dan BPBD yang menangani yang bisa membacanya."]};
const pasangMaskot = (m, aksi) => { m.innerHTML = maskot("semangat", "", aksi); const u = UCAP_MASKOT[aksi]; if (!u) return;
  const g = el("div", "lp-pita-ucap"); g.append(el("b", null, u[0]), el("span", null, u[1])); m.prepend(g); };
for (const m of document.querySelectorAll("[data-maskot]")) pasangMaskot(m, m.dataset.maskot);
if (!$("sigapMaskot").childElementCount) { $("sigapMaskot").innerHTML = maskot("sapa"); poseSigap = "sapa"; }   // Sigap di menu samping tampil sejak awal, bukan setelah chat jalan
const pernah = BUKA_ALUN;   // tautan langsung ke Alun-alun: tanpa animasi pembuka
if (!pernah) {
  const pb = $("pembuka"); $("maskotPembuka").innerHTML = maskot("sapa", "Sigap, maskot Pantau Bencana"); pb.hidden = false;
  // tampil lebih lama (pemilik 19 Nov 2026: "agak lamain"); ketuk atau tekan tombol apa saja untuk melewati
  const tutup = () => { if (pb.classList.contains("pergi")) return; pb.classList.add("pergi"); setTimeout(() => { pb.remove(); dialogBahasa(turPertama); }, 700); };   // tiap situs dibuka (pemilik 20 Nov 2026: "kenapa pilih bahasanya ga muncul di awal"); bahasa terakhir ditandai
  setTimeout(tutup, matchMedia("(prefers-reduced-motion: reduce)").matches ? 1200 : 6000);   // pemilik 19 Nov 2026 malam: "masih kurang lama"
  pb.addEventListener("click", tutup); addEventListener("keydown", tutup, {once: true});
} else $("pembuka").remove();
/* tanpa nomor: langsung beranda (pemilik 20 Nov 2026 "masuknya kaya langsung halaman utama"); nomor ditanya bot di chat, seperti bot WA */
function mulaiTamu() { tampilBantu(); tampilBeranda(); layarAwal(); }
if (LOKAL) { if (tersimpan) mulai(tersimpan); else mulaiTamu(); }
else (async () => { // produksi: sesi /masuk; nomor tampil tersamar dari server, tidak pernah diketik ulang di sini
  let j = null; try { j = await (await fetch("/api/masuk/saya?lunak=1", {credentials: "same-origin"})).json(); } catch {}
  if (j?.akun) { await mulai(`sesi-${j.akun.id}`); if (j.akun.nama) cache.pelapor ||= j.akun.nama; $("tabWa").textContent = j.akun.wa || ""; return; }
  if (tersimpan && !String(tersimpan).startsWith("sesi-")) return mulai(tersimpan);   // nomor yang pernah diketik di perangkat ini
  mulaiTamu();   // K65: tanpa kode WA; nomor ditanya di chat
})();

/* ============ tur beranda (pemilik 21 Nov 2026: "dibuat tour gini", rujukan flood-check.dawnstackai.com) ============
   Empat lapis gelap mengelilingi lubang bercincin di elemen yang dijelaskan, kartu "1 dari N" bermaskot Sigap, Lewati tur, Kembali, Lanjut.
   Muncul sekali sesudah pilih bahasa pada kunjungan pertama; bisa diulang dari gelembung Sigap. Langkah yang elemennya tidak tampil (layar HP) dilewati. */
const TUR = [
  [null, "Selamat datang di Pantau Bencana", "Saya SIGAP, Super Intelligence Assistance BNPB. Saya tunjukkan cara melapor kejadian bencana ke BNPB dan BPBD. Tur ini sekitar 30 detik."],
  ["#bDarurat", "Lapor darurat", "Laporkan bencana yang sedang berlangsung dan butuh penanganan cepat. Cukup isi lokasi, jenis kejadian, dan ada korban atau tidak. Petugas BNPB dan BPBD langsung menerimanya dan menindaklanjuti."],
  ["#bLaporBaru", "Lapor kejadian", "Ceritakan lewat obrolan. Saya bertanya satu per satu, Anda cukup memilih jawaban dan memotret dari kamera."],
  ["#bCekStatus", "Cek status laporan", "Simpan nomor laporan Anda. Dari sini Anda bisa melihat tindak lanjut BPBD dan BNPB."],
  // tiga pintu tambahan di hero ikut dijelaskan (pemilik 25 Nov 2026: "ini kenapa ga ada di tur?")
  [".lp-kaca-pasang", "Pasang aplikasi", "Pasang Pantau Bencana di layar utama HP Anda. Bisa dibuka cepat tanpa mengetik alamat."],
  [".lp-kaca-peringatan", "Peringatan dini", "Buka Info, pilih kecamatan Anda, lalu terima notifikasi saat prakiraan banjir, longsor, asap, atau angin naik ke Waspada, Siaga, atau Awas."],
  [".lp-kaca-hilang", "Lapor orang hilang", "Laporkan keluarga atau kerabat yang belum ditemukan lewat obrolan. Saya tanyakan nama, ciri, dan tempat terakhir terlihat, lalu laporan dikirim ke petugas."],
  ['#lBeranda .lp-layanan-kartu[data-aksi="info"]', "Info bencana dan prediksi", "Prakiraan hujan, banjir, longsor, asap, dan angin 3 hari ke depan, peringatan dini kecamatan, dan nomor penting terdekat."],
  ['#lBeranda [data-aksi="edukasi"]', "Edukasi siaga bencana", "Yang perlu dilakukan sebelum, saat, dan sesudah bencana."],
  [".lp-bahasa-menu", "Pilih bahasa", "Saya bisa bertanya dalam bahasa daerah Anda. Laporan tetap diterima petugas dalam bahasa Indonesia."],
  ['#tab [data-ke="laporan"]', "Laporan Anda", "Semua laporan yang pernah Anda kirim dan statusnya ada di sini."],
];
const TUR_AKSI = {"#bDarurat": "darurat", "#bLaporBaru": "lapor", "#bCekStatus": "status", ".lp-kaca-pasang": "pasang", ".lp-kaca-peringatan": "peringatan",
  ".lp-kaca-hilang": "hilang", '#lBeranda .lp-layanan-kartu[data-aksi="info"]': "info", '#lBeranda [data-aksi="edukasi"]': "edukasi", ".lp-bahasa-menu": "bahasa", '#tab [data-ke="laporan"]': "laporan"};
const turTampak = sel => [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; });
try { if (!localStorage.getItem("lapor-tur")) document.body.classList.add("lp-tur-nanti"); } catch {}   // kunjungan pertama: gelembung Sigap menunggu tur selesai
function turPertama() { let sudah = true; try { sudah = !!localStorage.getItem("lapor-tur"); } catch {} if (!sudah && !$("lBeranda").hidden) mulaiTur(); else document.body.classList.remove("lp-tur-nanti"); }
/* deretan geser samping: panah kiri/kanan muncul hanya bila masih ada isi di arah itu, roda mouse menggeser ke samping
   (pemilik 24 Nov 2026: "orang biasa mungkin gaakan tau ada tombol lagi atau gabakal tau itu harus digeser").
   Panah jadi saudara deretan (bukan anak) karena deretan diisi ulang dengan replaceChildren. */
function pasangGeser(d) {
  if (!d || d.dataset.geser) return; d.dataset.geser = "1";
  const induk = d.parentElement; if (getComputedStyle(induk).position === "static") induk.style.position = "relative";
  const buat = (arah, ik, label) => { const b = el("button", `lp-geser-panah lp-geser-${arah}`); b.type = "button"; b.hidden = true; b.setAttribute("aria-label", label); b.append(ikon(ik));
    b.addEventListener("click", () => {
      const tuju = Math.max(0, Math.min(d.scrollWidth - d.clientWidth, d.scrollLeft + (arah === "kiri" ? -1 : 1) * Math.max(120, d.clientWidth * .7)));
      d.scrollTo({ left: tuju, behavior: "smooth" });
      setTimeout(() => { if (Math.abs(d.scrollLeft - tuju) > 2) d.scrollLeft = tuju; }, 450);   // gulir halus kadang tertahan; pastikan sampai
    }); d.after(b); return b; };
  const kiri = buat("kiri", "i-kembali", "Geser ke kiri"), kanan = buat("kanan", "i-panah", "Geser ke kanan");
  let antre = 0;
  const atur = () => { antre = 0;
    const sisaKiri = d.scrollLeft > 2, sisaKanan = d.scrollLeft + d.clientWidth < d.scrollWidth - 2, tampak = d.offsetParent !== null;
    kiri.hidden = !(tampak && sisaKiri); kanan.hidden = !(tampak && sisaKanan);
    d.classList.toggle("lp-geser-ada-kiri", sisaKiri); d.classList.toggle("lp-geser-ada-kanan", sisaKanan);
    if (!tampak) return;
    const t = d.offsetTop + d.offsetHeight / 2;
    kiri.style.top = kanan.style.top = `${t}px`;
    kiri.style.left = `${d.offsetLeft + 6}px`; kanan.style.left = `${d.offsetLeft + d.offsetWidth - 6}px`;
  };
  const jadwal = () => { if (!antre) antre = requestAnimationFrame(atur); };
  d.addEventListener("scroll", jadwal, { passive: true });
  d.addEventListener("wheel", e => { if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; const maks = d.scrollWidth - d.clientWidth;
    if (maks <= 2 || (e.deltaY < 0 && d.scrollLeft <= 0) || (e.deltaY > 0 && d.scrollLeft >= maks - 1)) return;
    e.preventDefault(); d.scrollLeft += e.deltaY; }, { passive: false });
  new ResizeObserver(jadwal).observe(d);
  new MutationObserver(jadwal).observe(d, { childList: true, subtree: true });
  addEventListener("resize", jadwal);
  jadwal();
}
for (const d of document.querySelectorAll(".lp-saring, #saringBantu, #saringRingkas")) pasangGeser(d);

/* tombol tema terang/gelap: kunci "pk-tema" bersama /prediksi dan /lapor/meja, dibaca anti kedip oleh /halaman_awal.js di <head> */
function gelapSekarang() { const a = document.documentElement; return a.dataset.theme ? a.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
function labelTema() { const g = gelapSekarang(); for (const b of document.querySelectorAll(".lp-tema")) { const s = b.querySelector("span"); if (s) s.textContent = g ? "Mode terang" : "Mode gelap"; } }
for (const b of document.querySelectorAll(".lp-tema")) b.addEventListener("click", () => {
  const t = gelapSekarang() ? "light" : "dark"; document.documentElement.dataset.theme = t;
  try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {}
  labelTema();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", labelTema);
labelTema();
$("bMulaiTur")?.addEventListener("click", () => { if ($("lBeranda").hidden) ke("beranda"); setTimeout(mulaiTur, 150); });   // tur menunjuk elemen beranda
function mulaiTur() {
  if (document.querySelector(".lp-tur")) return;
  try { localStorage.setItem("lapor-tur", "1"); } catch {}
  const langkah = TUR.filter(([sel]) => !sel || turTampak(sel)), N = langkah.length;
  const w = el("div", "lp-tur"), gelap = [0, 1, 2, 3].map(() => el("div", "lp-tur-gelap")), lubang = el("div", "lp-tur-lubang");
  const k = el("div", "lp-tur-kartu"); k.setAttribute("role", "dialog"); k.setAttribute("aria-modal", "true"); k.setAttribute("aria-labelledby", "turJudul");
  const m = el("div", "lp-tur-maskot"); m.innerHTML = maskot("sapa");
  const ke = el("p", "lp-tur-ke"), h = el("h2", null), p = el("p", "lp-tur-isi"), titik = el("div", "lp-tur-titik"); h.id = "turJudul";
  for (let i = 0; i < N; i++) titik.append(el("i"));
  const lewat = el("button", "lp-tur-lewat", "Lewati tur"), mundur = el("button", "lp-kedua", "Kembali"), maju = el("button", "lp-utama", "Lanjut");
  for (const b of [lewat, mundur, maju]) b.type = "button";
  const aksi = el("div", "lp-tur-aksi"), kanan = el("div"); kanan.append(mundur, maju); aksi.append(lewat, kanan);
  // maskot setinggi kartu di kiri, isi di kanan (pemilik 21 Nov 2026: "agar setinggi ini full dia")
  const kanan2 = el("div", "lp-tur-kanan"); kanan2.append(ke, h, p, titik, aksi);
  k.append(m, kanan2); w.append(...gelap, lubang, k); document.body.append(w);
  const asal = document.activeElement; let i = 0, sasaran = null, digulir = false;
  const tata = () => {   // lubang dan kartu mengikuti elemen; tanpa elemen = kartu di tengah dan seluruh layar gelap
    const vw = innerWidth, vh = innerHeight, pad = 8;
    const r = sasaran?.getBoundingClientRect(), x = r ? Math.max(0, r.left - pad) : vw / 2, y = r ? Math.max(0, r.top - pad) : vh / 2, rw = r ? r.width + pad * 2 : 0, rh = r ? r.height + pad * 2 : 0;
    Object.assign(gelap[0].style, {left: "0", top: "0", width: "100%", height: `${y}px`});
    Object.assign(gelap[1].style, {left: "0", top: `${y + rh}px`, width: "100%", height: `${Math.max(0, vh - y - rh)}px`});
    Object.assign(gelap[2].style, {left: "0", top: `${y}px`, width: `${x}px`, height: `${rh}px`});
    Object.assign(gelap[3].style, {left: `${x + rw}px`, top: `${y}px`, width: `${Math.max(0, vw - x - rw)}px`, height: `${rh}px`});
    lubang.hidden = !r; if (r) Object.assign(lubang.style, {left: `${x}px`, top: `${y}px`, width: `${rw}px`, height: `${rh}px`});
    k.classList.toggle("tengah", !r);
    if (!r) { k.style.left = k.style.top = ""; return; }
    // kartu tidak boleh menutupi sasaran (pemilik 24 Nov 2026: "bahkan ini nutup yang dihighlight"): coba bawah, atas, kanan, kiri;
    // bila tidak ada yang muat utuh, ambil posisi yang paling sedikit menimpa sasaran
    const kw = k.offsetWidth, kh = k.offsetHeight, jarak = 14, tepi = 8;
    const jepit = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    const tengahX = jepit(x + rw / 2 - kw / 2, tepi, vw - kw - tepi), tengahY = jepit(y + rh / 2 - kh / 2, tepi, vh - kh - tepi);
    const calon = [
      [tengahX, y + rh + jarak], [tengahX, y - jarak - kh],
      [x + rw + jarak, tengahY], [x - jarak - kw, tengahY],
    ];
    const muat = ([l, t]) => l >= tepi && t >= tepi && l + kw <= vw - tepi && t + kh <= vh - tepi;
    const timpa = ([l, t]) => Math.max(0, Math.min(l + kw, x + rw) - Math.max(l, x)) * Math.max(0, Math.min(t + kh, y + rh) - Math.max(t, y));
    const pas = calon.find(muat);
    if (!pas && !digulir) { digulir = true; sasaran.scrollIntoView({block: "start", behavior: "instant"}); return tata(); }   // beri ruang: sasaran naik ke atas, kartu di bawahnya
    let [left, top] = pas || calon.map(([l, t]) => [jepit(l, tepi, vw - kw - tepi), jepit(t, tepi, vh - kh - tepi)]).sort((a, b) => timpa(a) - timpa(b))[0];
    k.style.left = `${left}px`; k.style.top = `${top}px`;
  };
  const tampil = n => {
    i = n; digulir = false; const [sel, judul, isi] = langkah[i]; sasaran = sel ? turTampak(sel) : null;
    ke.textContent = `${i + 1}/${N}`; h.textContent = judul; p.textContent = isi;
    const aksi = TUR_AKSI[sel]; m.innerHTML = aksi ? maskot("semangat", "", aksi) : maskot(i === N - 1 ? "senang" : "sapa");   // gerak maskot ikut langkah (pemilik 25 Nov 2026)
    [...titik.children].forEach((t, j) => t.classList.toggle("aktif", j === i));
    mundur.hidden = i === 0; maju.textContent = i === 0 ? "Mulai" : i === N - 1 ? "Selesai" : "Lanjut";
    if (sasaran) sasaran.style.scrollMarginTop = "16px";   // HP: sasaran di atas agar kartu muat di bawahnya, tidak menutupinya
    const blok = innerWidth <= 560 ? "start" : "center";
    sasaran?.scrollIntoView({block: blok, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
    // sasaran bisa masih bergerak (animasi masuk hero, gulir halus): ukur ulang sampai diam (pemilik 25 Nov 2026: "kenapa ga tepat highlightnya")
    tata(); requestAnimationFrame(tata); for (const t of [150, 400, 800, 1300]) setTimeout(tata, t); maju.focus();
    // gulir halus kadang tertahan dan sasaran tetap di luar layar; pastikan sampai lalu tata ulang
    const s0 = sasaran; setTimeout(() => { if (s0 !== sasaran || !s0) return; const r = s0.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) { s0.scrollIntoView({block: blok, behavior: "instant"}); tata(); } }, 500);
  };
  const selesai = () => { document.body.classList.remove("lp-tur-nanti"); removeEventListener("resize", tata); removeEventListener("scroll", tata, true); removeEventListener("keydown", tombol, true); w.remove(); asal?.focus?.(); };
  const tombol = e => { if (e.key === "Escape") { e.preventDefault(); selesai(); } else if (e.key === "ArrowRight") { e.preventDefault(); i < N - 1 ? tampil(i + 1) : selesai(); } else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); tampil(i - 1); }
    else if (e.key === "Tab") { const f = [...k.querySelectorAll("button:not([hidden])")], a = f.indexOf(document.activeElement); if (e.shiftKey ? a <= 0 : a === f.length - 1) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); } } };
  lewat.addEventListener("click", selesai); mundur.addEventListener("click", () => tampil(i - 1)); maju.addEventListener("click", () => i < N - 1 ? tampil(i + 1) : selesai());
  m.title = "Ketuk Sigap untuk lanjut"; m.addEventListener("click", () => maju.click());   // maskot ikut membawa ke langkah berikutnya (pemilik 26 Nov 2026); tombol Lanjut tetap jalur papan ketik
  addEventListener("resize", tata); addEventListener("scroll", tata, true); addEventListener("keydown", tombol, true);
  tampil(0);
}

/* Menu samping bisa diciutkan jadi kolom ikon di layar lebar (pemilik 26 Nov 2026: "gimana kalo ini dia sebenarnya ga selalu terbuka?").
   Keadaan diingat di perangkat ini; label tiap tombol tetap ada lewat title dan aria-label saat ciut. */
(() => {
  const app = document.querySelector(".lp-app"), nav = $("tab"); if (!app || !nav) return;
  app.classList.add("menu-layang");   // pemilik 26 Nov 2026: "secara otomatis aja ketutup ... ketika di hover baru dia ngebuka lagi"; tombol ciut manual tidak dipakai lagi
  for (const b of nav.querySelectorAll("button")) { const t = b.textContent.trim(); if (t && !b.title) b.title = t; if (t && !b.getAttribute("aria-label")) b.setAttribute("aria-label", t); }
  const tb = el("button", "lp-tab-ciut"); tb.type = "button"; tb.append(ikon("i-kembali"));
  const atur = ciut => { app.classList.toggle("menu-ciut", ciut); tb.setAttribute("aria-expanded", String(!ciut)); const t = ciut ? "Buka menu" : "Ciutkan menu"; tb.setAttribute("aria-label", t); tb.title = t;
    try { localStorage.setItem("lp-menu-ciut", ciut ? "1" : "0"); } catch { /* mode privat: tidak diingat */ }
    if (typeof alunPeta !== "undefined" && alunPeta) requestAnimationFrame(() => alunPeta.resize()); };   // peta Alun-alun ikut melebar
  tb.addEventListener("click", () => atur(!app.classList.contains("menu-ciut")));
  nav.querySelector(".lp-tab-merek")?.after(tb);
  let awal = false; try { awal = localStorage.getItem("lp-menu-ciut") === "1"; } catch { /* tanpa penyimpanan */ }
  atur(awal);
})();

/* Peringatan dini dan Nomor darurat (pemilik 26 Nov 2026: "Langganan + nomor darurat", lalu "Ya, pindahkan"): dua ikon polos di kanan atas kepala beranda,
   di sebelah tombol tema; masing-masing membuka lembar <dialog>. Isi langganan = kartu peringatan.js yang sudah ada (paket pwa-peringatan),
   nomor = daftar nasional + layar nomor terdekat yang sudah ada. Titik oranye di lonceng: kab/kota kecamatan langganan berstatus Waspada atau lebih (status Dampak Peringatan). */
(() => {
  const tema = document.querySelector(".lp-hero > .lp-tema-hp"); if (!tema) return;
  function lembar(judul, ikonId, isi) {
    const d = el("dialog", "lp-lembar"), kep = el("header", "lp-lembar-kepala"), h = el("h2"), x = el("button", "lp-lembar-tutup"), b = el("div", "lp-lembar-isi");
    h.append(ikon(ikonId), judul); x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.append(ikon("i-x")); x.addEventListener("click", () => d.close());
    kep.append(h, x); d.append(kep, b); d.addEventListener("close", () => d.remove()); d.addEventListener("click", e => { if (e.target === d) d.close(); });   // ketuk latar = tutup
    document.body.append(d); isi(b, d); d.showModal(); x.focus(); return d;
  }
  const NS = "http://www.w3.org/2000/svg", lonceng = document.createElementNS(NS, "svg"); lonceng.setAttribute("viewBox", "0 0 24 24"); lonceng.setAttribute("aria-hidden", "true");
  for (const d of ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"]) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); lonceng.append(p); }
  const bLanggan = el("button", "lp-ikon-atas"), bNomor = el("button", "lp-ikon-atas"), titik = el("span", "lp-ikon-atas-titik"); titik.hidden = true;
  bLanggan.type = bNomor.type = "button"; bLanggan.append(lonceng, titik); bNomor.append(ikon("i-telepon"));
  for (const [b, t] of [[bLanggan, "Peringatan dini"], [bNomor, "Nomor darurat"]]) { b.title = t; b.setAttribute("aria-label", t); }
  const grup = el("div", "lp-ikon-atas-grup"); tema.before(grup); grup.append(bLanggan, bNomor, tema);
  // titik oranye: hanya dari data, tanpa tebakan; status belum terukur = tanpa titik
  const cekAktif = () => { let a = null; try { a = JSON.parse(localStorage.getItem("pb-peringatan") || "null"); } catch { /* tanpa penyimpanan */ }
    const kab = [...new Set((a?.kec || []).map(k => String(k.kode || "").slice(0, 4)).filter(k => k.length === 4))];
    const st = typeof dpDok !== "undefined" && dpDok?.status?.kab;
    titik.hidden = !st || !kab.some(k => Object.values(st[k] || {}).some(v => (v?.s ?? 0) >= 1));
    bLanggan.setAttribute("aria-label", titik.hidden ? "Peringatan dini" : "Peringatan dini, ada peringatan aktif di wilayah Anda"); };
  if (typeof muatDp === "function") muatDp().then(cekAktif).catch(() => {});
  bLanggan.addEventListener("click", () => lembar("Peringatan dini", "i-sirene", w => {
    w.append(el("p", "lp-redup lp-lembar-sub", "Pilih sampai tiga kecamatan. Pemberitahuan masuk ke HP ini saat prakiraan di kecamatan itu naik."));
    const k = el("div"); w.append(k);
    if (window.pbKartuPeringatan) window.pbKartuPeringatan(k); else k.append(el("p", "lp-redup", "Layanan peringatan belum termuat. Coba lagi sebentar lagi."));
  }));
  bNomor.addEventListener("click", () => lembar("Nomor darurat", "i-telepon", (w, d) => {
    const kisi = el("div", "lp-tk-np-kisi");
    for (const [n, t, ik] of NOMOR_NASIONAL) { const a = Object.assign(el("a", "lp-tk-np"), {href: `tel:${n}`}), u = el("span", "lp-tk-np-ikon"), tx = el("span"); u.append(ikon(ik)); tx.append(el("b", null, n), el("small", null, t)); a.append(u, tx); kisi.append(a); }
    const dekat = el("button", "lp-kedua lp-lembar-aksi"); dekat.type = "button"; dekat.append(ikon("i-lokasi"), "Nomor BPBD, rumah sakit, dan polisi terdekat");
    dekat.addEventListener("click", () => { d.close(); bukaInfo("penting"); });
    w.append(kisi, dekat);
  }));
})();
