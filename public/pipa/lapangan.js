/* SIPPA: layar form lapangan luring /pipa/lapangan (SP-011; PRD §9.9, DS §3.7.2 dan §4.7, DT §6.1). Tanpa akun: kode penugasan 26 heks di
   header x-kode. Dimuat cangkang halamanSippaLapangan (bukan modul layar_*.js router): pasang(akar) dipanggil cangkang, atau berjalan sendiri
   bila ada #lapangan atau #app. Hanya impor relatif ke modul pipa, supaya ikut tersimpan service worker. Semua teks lewat textContent.
   INP: ketukan stopwatch dan Kirim sekarang mengubah tombol seketika, simpan dan kirim lewat nanti() (anggaran form lapangan < 100 ms). */
import {ikon} from "./ikon.js";
import {cekButir, MEDAN, KEDALAMAN_CM, JENIS_FASE2, TAHAP_FOTO, LANGKAH_PERIKSA, MODA_JEJAK, TITIK_TEKANAN, KEBUTUHAN_DEBIT_LPS, SOS_TAHAN_MS, hitungDebit, bandingDebit, TINDAKAN_TUNGGU, peringatanBor, peringatanTekanan, pengingatTekanan, tambahTitikJejak, panjangJejakM} from "./formulir.js";
import {tambah, tambahFoto, hapus, jumlah, daftar, perbaiki, kirimSemua, keluar, buangSemua, kodeTersimpan, idbSiap, buangKadaluarsa} from "./antre.js";

const LS_KODE = "sippa.kode", LS_TERKIRIM = "sippa.terkirim", LS_DRAF = "sippa.draf.", LS_PERIKSA = "sippa.periksa.", LS_TEKANAN = "sippa.tekanan.";
const NOMOR_DARURAT = [["112", "Darurat umum"], ["117", "Call center BNPB"]];
const MELESET_MS = 10 * 60000, KIRIM_BERKALA_MS = 60000;
const MSG_KODE_MATI = "Kode penugasan ini sudah tidak berlaku. Minta kode baru ke perencana.";
const KODE_RE =/(?:^#|^|&)k=([0-9a-f]{26})(?=&|$)/i, KODE_BARE = /^[0-9a-f]{26}$/i;

/* ---------- logika murni (diuji di Node) ---------- */
const angka = n => typeof fmt === "function" ? fmt(n) : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const jam = ms => new Date(ms).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).replace(":", ".");
/* kalimat selesai dengan satu titik: pesan dari antre.js dan cekButir ditulis tanpa titik akhir */
const kal = s => `${String(s).replace(/\.+$/, "")}.`;

/* Ketukan: tombol mati dan label sementara SEKETIKA (INP), kerja sesudah frame tercat. Tombol mati juga menahan ketuk ganda, penting karena
   tambah() membuat id baru tiap panggilan. Hidup lagi dan label dipulihkan di setiap jalan keluar (label hanya bila belum diganti pemanggil). */
export function urgentLalu(btn, label, kerja, jadwal = tunda) {
  if (btn.disabled) return false;
  const asal = btn.textContent;
  btn.disabled = true; btn.textContent = label;
  jadwal(async () => {
    try { await kerja(); } catch (e) { console.error(e); }
    finally { btn.disabled = false; if (btn.textContent === label) btn.textContent = asal; }
  });
  return true;
}

/* Fragmen #k=<26 heks> disimpan lalu SELALU dihapus dari alamat dan riwayat (DT §6.1.2), sah atau tidak. Query tidak pernah dibaca. */
export function ambilKode(lokasi, sejarah, simpanan) {
  const h = lokasi.hash || "";
  if (!/(?:^#|&)k=/.test(h)) return null;
  const m = KODE_RE.exec(h);
  const kode = m ? m[1].toLowerCase() : null;
  if (kode) simpanan.setItem(LS_KODE, kode);
  sejarah.replaceState(null, "", lokasi.pathname);
  return kode;
}
/* teks hasil pindai QR: tautan dengan #k= atau 26 heks telanjang */
export const kodeDariTeks = t => { const s = String(t || "").trim(); if (KODE_BARE.test(s)) return s.toLowerCase(); const m = KODE_RE.exec(s.includes("#") ? s.slice(s.indexOf("#")) : ""); return m ? m[1].toLowerCase() : null; };

export const TAHAP = [
  {medan: "t_tiba", label: "Tiba", aksi: "Catat waktu tiba"}, {medan: "t_mulai_gelar", label: "Mulai gelar", aksi: "Catat waktu mulai gelar"},
  {medan: "t_air_mengalir", label: "Air mengalir", aksi: "Catat waktu air mengalir"}, {medan: "t_mulai_injeksi", label: "Mulai injeksi", aksi: "Catat waktu mulai injeksi"},
  {medan: "t_selesai", label: "Selesai", aksi: "Catat waktu selesai"}, {medan: "t_bongkar_selesai", label: "Bongkar selesai", aksi: "Catat waktu bongkar selesai"},
];
/* indeks tahap yang boleh diketuk sekarang; 6 = semua terisi */
export const tahapAktif = t => { const i = TAHAP.findIndex(x => t[x.medan] == null); return i < 0 ? TAHAP.length : i; };
/* hanya tahap aktif yang menulis; selain itu objek yang sama dikembalikan (tidak ada lompat dan tidak ada ketuk ulang) */
export const tekanTahap = (t, medan, ms) => TAHAP[tahapAktif(t)]?.medan === medan ? {...t, [medan]: ms} : t;

const bersih = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(typeof v === "number" && Number.isNaN(v))));
const satuDesimal = x => Math.round(x * 10) / 10;

/* Isian sesi menjadi butir log. Jam pompa = air mengalir sampai selesai (otomatis, DS §4.7 d); air = totalizer akhir dikurangi awal.
   Nilai yang melanggar batas sengaja TIDAK dipotong di sini: cekButir yang menolaknya. */
export function bangunLog(s, kini = Date.now()) {
  const t = s.tahap || {};
  const jam_pompa = t.t_air_mengalir != null && t.t_selesai != null && t.t_selesai > t.t_air_mengalir ? satuDesimal((t.t_selesai - t.t_air_mengalir) / 36e5) : undefined;
  const air_m3 = typeof s.totalizer_awal === "number" && typeof s.totalizer_akhir === "number" && s.totalizer_akhir >= s.totalizer_awal ? satuDesimal(s.totalizer_akhir - s.totalizer_awal) : undefined;
  return bersih({jenis: s.jenis, kelas_medan: s.kelas_medan, panjang_m: s.panjang_m, n_orang: s.n_orang, ...t, jam_pompa, bbm_l: s.bbm_l, air_m3, petak_id: s.petak_id,
    air_sampai_lance: s.air_sampai_lance, p_ujung_bar: s.p_ujung_bar, p_ujung_menit: s.p_ujung_menit, p_ujung_sumber: s.p_ujung_sumber, kecelakaan: s.kecelakaan,
    bocor_henti_menit: s.bocor_henti_menit, konfigurasi: s.konfigurasi ? JSON.stringify(s.konfigurasi) : undefined, catatan: s.catatan, waktu_klien: kini});
}

/* SP-094 (keputusan 56, DT §6.6 butir 1): inspeksi pra-gelar dan pasca-gelar komponen kit tugas, tersimpan luring seperti butir lain.
   Kontrak GET lapangan/saya (DT §4.3) belum memuat kit.id dan kit.komponen: daftar periksa dibaca dari kit.komponen bila server mengirimnya, selain itu dialog
   menyatakan daftar belum diterima (tidak mengarang butir). pelihara.js tidak ikut tersimpan service worker, jadi kata skor dan awalan K1 disalin di sini; uji menyamakannya. */
export const KATA_SKOR = ["Baik", "Rusak ringan", "Rusak berat", "Hilang atau afkir"];
export const AWALAN_K1 = ["P", "PB", "E"];
const awalanK1 = kode => AWALAN_K1.includes(/^([A-Z]{1,4})-/.exec(kode)?.[1]);
export function daftarPeriksa(kit) {
  if (!kit || !Array.isArray(kit.komponen)) return [];
  return kit.komponen.filter(c => c && typeof c.id === "string" && c.id.length === 16 && typeof c.kode_bom === "string")
    .map(c => ({sasaran_jenis: "komponen", sasaran_id: c.id, kode_bom: c.kode_bom, nama: String(c.nama ?? c.kode_bom), skor: null}));
}
/* satu butir per komponen yang dinilai; temuan hanya melekat pada skor > 0; jam operasi hanya komponen K1 (pompa) */
export function bangunInspeksi({jenis, nilai, jam = {}, temuan = "", tunggu = new Set()}, kini = Date.now()) {
  const t = String(temuan).trim();
  return nilai.filter(n => Number.isInteger(n.skor)).map(n => bersih({jenis, sasaran_jenis: n.sasaran_jenis, sasaran_id: n.sasaran_id, skor: n.skor,
    jam_operasi: awalanK1(n.kode_bom) && typeof jam[n.sasaran_id] === "number" ? jam[n.sasaran_id] : undefined, temuan: n.skor > 0 && t ? t : undefined, tindakan: n.skor > 0 && tunggu.has(n.sasaran_id) ? TINDAKAN_TUNGGU : undefined, waktu_klien: kini}));
}

/* SP-123: titik kumpul dari data tugas bila server mengirimnya (teks, atau {nama, lat, lon}); selain itu null dan layar bilang belum dicatat */
export function titikKumpul(tugas) {
  const t = tugas?.titik_kumpul;
  if (typeof t === "string" && t.trim()) return {nama: t.trim()};
  if (t && typeof t === "object" && typeof t.nama === "string" && t.nama.trim()) return {nama: t.nama.trim(), lat: Number.isFinite(t.lat) ? t.lat : undefined, lon: Number.isFinite(t.lon) ? t.lon : undefined};
  return null;
}
/* SP-127: daftar alat selesai gelar dari kit.komponen (kode BOM unik, urut); tanpa komponen dari server daftarnya kosong dan layar meminta kode alat hilang diketik */
export function daftarAlat(kit) {
  if (!kit || !Array.isArray(kit.komponen)) return [];
  const lihat = new Set(); const hasil = [];
  for (const c of kit.komponen) if (c && typeof c.kode_bom === "string" && !lihat.has(c.kode_bom)) { lihat.add(c.kode_bom); hasil.push({kode_bom: c.kode_bom, nama: String(c.nama ?? c.kode_bom)}); }
  return hasil.sort((a, b) => a.kode_bom.localeCompare(b.kode_bom));
}
/* butir selesai: yang tidak ditandai hilang dianggap kembali; kode ketikan dibersihkan (huruf besar, tanpa duplikat) */
export function bangunSelesai({alat = [], hilang = [], ketik = "", catatan = ""}, kini = Date.now()) {
  const tambahan = String(ketik).split(/[\s,;]+/).map(k => k.trim().toUpperCase()).filter(Boolean);
  const hilangSemua = [...new Set([...hilang, ...tambahan])];
  return bersih({waktu: kini, alat_kembali: alat.map(a => a.kode_bom).filter(k => !hilangSemua.includes(k)), alat_hilang: hilangSemua, catatan: String(catatan).trim()});
}

/* SP-129: kalimat hasil debit; null = isian belum lengkap */
export function kalimatDebit(lps) {
  const b = bandingDebit(lps);
  if (!b) return "Isi semua kolom dengan angka lebih dari 0 untuk melihat debit.";
  return `Debit ${angka(b.lps)} liter per detik, ${b.cukup ? "cukup" : "kurang"} untuk satu kit (butuh ${angka(KEBUTUHAN_DEBIT_LPS)} liter per detik).`;
}

/* Pita sinkron (DS §2.1.3, §3.7.2): empat keadaan, satu kalimat. Alasan penolakan hanya ditampilkan bila tepat satu butir ditolak. */
export function kalimatSinkron({menunggu = 0, ditolak = 0, mengirim = false, terakhir = null, alasan = ""}) {
  if (mengirim) return {keadaan: "kirim", ikon: "refresh-cw", teks: `Mengirim ${angka(menunggu)} isian.`};
  if (ditolak) return {keadaan: "tolak", ikon: "circle-x", teks: ditolak === 1 && alasan ? `1 isian ditolak: ${String(alasan).replace(/\.+$/, "")}.` : `${angka(ditolak)} isian ditolak. Ketuk Perbaiki.`};
  if (menunggu) return {keadaan: "tunggu", ikon: "cloud-off", teks: `${angka(menunggu)} isian menunggu sinyal. Dikirim otomatis saat ada sinyal.`};
  return {keadaan: "terkirim", ikon: "cloud-check", teks: terakhir ? `Semua isian terkirim, ${jam(terakhir)} WIB.` : "Belum ada isian."};
}

/* scope tanpa garis miring akhir: halaman /pipa/lapangan dan /pipa/lapangan/ sama-sama terkendali (DT §6.1.1) */
export function daftarSW(nav = globalThis.navigator) {
  try { nav?.serviceWorker?.register("/sw-lapangan.js", {scope: "/pipa/lapangan"})?.catch(() => { /* tanpa service worker form tetap jalan selama halaman terbuka */ }); }
  catch { /* peramban tanpa dukungan */ }
}

/* ---------- DOM ---------- */
const el = (tag, kelas, teks, attr = {}) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v); return e; };
const ikonEl = nama => { const s = el("span", "sp-ikon-bungkus"); s.innerHTML = ikon(nama); return s; };
/* nanti() milik public/inti bila dimuat; selain itu padanannya (dua rAF + jaring 120 ms untuk tab tersembunyi, sama dengan inti/nanti.js) */
const tunda = f => {
  if (typeof nanti === "function") return nanti(f);
  let sudah = false; const jalan = () => { if (!sudah) { sudah = true; f(); } };
  requestAnimationFrame(() => requestAnimationFrame(jalan)); setTimeout(jalan, 120);
};
const baca = k => { try { return localStorage.getItem(k); } catch { return null; } };
const tulis = (k, v) => { try { localStorage.setItem(k, v); } catch { /* diblokir: draf tidak tersimpan, form tetap jalan */ } };
const hapusLs = k => { try { localStorage.removeItem(k); } catch { /* diblokir */ } };
const tanggal = ms => new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
const keLokal = ms => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
const dariLokal = s => { const m = Date.parse(s); return Number.isNaN(m) ? null : m; };

const tombol = (teks, kelas = "", klik) => { const b = el("button", `lp-tombol ${kelas}`.trim(), teks, {type: "button"}); if (klik) b.addEventListener("click", klik); return b; };
function isian(label, o = {}) {
  const l = el("label"), i = el("input");
  l.append(el("span", "", label));
  i.type = o.type || "text"; if (o.mode) i.inputMode = o.mode; if (o.maks) i.maxLength = o.maks; if (o.nilai != null) i.value = o.nilai; if (o.daftar) i.setAttribute("list", o.daftar);
  l.append(i);
  return {el: l, input: i};
}
/* angka dari isian: kosong = tidak ada; koma desimal diterima; yang bukan angka dibiarkan teks supaya cekButir menolaknya */
const angkaDari = i => { const s = i.value.trim().replace(",", "."); if (s === "") return undefined; const n = Number(s); return Number.isFinite(n) ? n : s; };
function pil(nama, opsi, awal) {
  const g = el("div", "lp-pilihan", null, {role: "radiogroup", "aria-label": nama});
  let nilai = awal;
  for (const [v, l] of opsi) {
    const w = el("label", "lp-pil"), r = el("input");
    r.type = "radio"; r.name = nama; r.checked = v === awal; r.addEventListener("change", () => { nilai = v; });
    w.append(r, el("span", "", l)); g.append(w);
  }
  return {el: g, nilai: () => nilai};
}
const blok = (judul, ...isi) => { const b = el("section", "lp-blok"); b.append(el("h2", "", judul, {tabindex: "-1"}), ...isi); return b; };
function tulisGalat(wadah, jenis, galat) {
  wadah.replaceChildren(...galat.map(g => el("p", "", kal(`${MEDAN[jenis]?.[g.medan]?.label || g.medan}: ${g.pesan}`))));
}

export function pasang(akar) {
  if (!akar || akar.dataset.terpasang) return;
  akar.dataset.terpasang = "1"; akar.classList.add("sp-lapangan");
  const S = {kode: null, tugas: null, mengirim: false, terakhir: Number(baca(LS_TERKIRIM)) || null, j: {menunggu: 0, ditolak: 0}, alasan: "", draf: null, tampil: "masuk"};
  const tid = () => S.tugas?.tugas?.id ?? null;
  const opsiTugas = () => ({lengan_dalam: S.tugas?.tugas?.lengan_dalam ? 1 : 0});

  const kop = el("header", "lp-kop"), regu = el("p", "lp-regu", "Belum masuk");
  kop.append(el("h1", "", "SIPPA Lapangan"), regu);
  const strip = el("div", "sp-sinkron terkirim", null, {role: "status", "aria-live": "polite", hidden: ""});
  const tulisStripIkon = el("span", "sp-sinkron-ikon"), tulisStripTeks = el("span", "sp-sinkron-teks");
  const kirimSekarang = tombol("Kirim sekarang");
  kirimSekarang.addEventListener("click", () => urgentLalu(kirimSekarang, "Mengirim...", kirim));
  strip.append(tulisStripIkon, tulisStripTeks, kirimSekarang);
  const pita = el("div", "sp-pita-lp", null, {role: "status"});
  const isi = el("main", "lp-isi", null, {id: "lp-isi"});
  const sos = tombol("SOS: tahan 2 detik", "lp-sos besar", null); sos.hidden = true;
  const panelSos = el("section", "lp-sos-panel", null, {role: "alert", hidden: ""}), pengingat = el("div", "lp-pengingat", null, {role: "status", hidden: ""});
  akar.replaceChildren(kop, strip, sos, panelSos, pengingat, pita, isi);

  const pitaTulis = (...teks) => pita.replaceChildren(...teks.filter(Boolean).map(t => el("p", "lp-banner", kal(t))));
  function tulisStrip() {
    const k = kalimatSinkron({...S.j, mengirim: S.mengirim, terakhir: S.terakhir, alasan: S.alasan});
    strip.className = `sp-sinkron ${k.keadaan}`;
    tulisStripIkon.replaceChildren(ikonEl(k.ikon)); tulisStripTeks.textContent = k.teks;
    kirimSekarang.hidden = S.mengirim || !S.j.menunggu; strip.hidden = !S.kode;
  }
  async function segarkan() {
    const d = await daftar({tugas_id: tid()}), tolak = d.filter(b => b.keadaan === "ditolak");   // satu pembacaan untuk jumlah dan daftar ditolak
    S.j = {menunggu: d.length - tolak.length, ditolak: tolak.length, total: d.length};
    S.alasan = tolak[0]?.alasan || "";
    tulisStrip();
    if (S.tampil === "tugas") gambarAntre(tolak);
  }
  async function kirim() {
    if (S.mengirim || !S.kode || !S.tugas) return;   // tanpa tugas dimuat tidak ada yang dikirim: kode tugas lain tidak boleh membawa butir tugas ini
    S.mengirim = true; tulisStrip();
    let h;
    try { h = await kirimSemua({tugas_id: tid()}); } finally { S.mengirim = false; }
    if (h.berhenti === "kode") { S.tugas = null; S.kode = null; return tampilMasuk(MSG_KODE_MATI); }   // antre.js sudah menghapus kode dari penyimpanan; butir tetap
    if (h.diterima + h.ganda > 0) { S.terakhir = Date.now(); tulis(LS_TERKIRIM, String(S.terakhir)); }
    const meleset = h.jam_server != null && Math.abs(h.jam_server - Date.now()) > MELESET_MS;
    pitaTulis(h.berhenti === "kode" ? h.pesan : null, meleset ? "Jam ponsel berbeda dari jam server. Isian tetap diterima dan ditandai." : null, h.berhenti === "tunda" ? h.pesan : null, S.penyimpananLemah);
    await segarkan();
  }

  /* ----- layar ----- */
  function ganti(...simpul) { sos.hidden = !S.tugas; isi.replaceChildren(...simpul); isi.querySelector("h2")?.focus(); }
  const kembaliKeTugas = () => { S.tampil = "tugas"; tampilTugas(); };

  async function tampilMasuk(pesan) {
    S.tampil = "masuk"; S.kode = null; S.tugas = null; regu.textContent = "Belum masuk";
    S.j = await jumlah(); tulisStrip();
    const err = el("p", "lp-pesan galat", pesan ? kal(pesan) : "", {role: "alert"});
    const kodeIsi = isian("Kode penugasan", {mode: "text", maks: 80});
    const berkas = el("input", "", null, {type: "file", accept: "image/*", capture: "environment", hidden: ""});
    const blokIsi = [el("p", "lp-kecil", "Buka tautan dari perencana atau pindai QR penugasan."), err];
    if (typeof BarcodeDetector !== "undefined") {
      const t = tombol("Pindai QR", "utama besar", () => berkas.click());
      berkas.addEventListener("change", () => {
        if (!berkas.files[0]) return;
        urgentLalu(t, "Membaca QR...", async () => {
          try {
            const hasil = await new BarcodeDetector({formats: ["qr_code"]}).detect(await createImageBitmap(berkas.files[0]));
            const k = kodeDariTeks(hasil[0]?.rawValue);
            if (!k) { err.textContent = "QR ini bukan kode penugasan. Pindai QR penugasan yang benar atau ketik kodenya."; return; }
            tulis(LS_KODE, k); await mulai();
          } catch { err.textContent = "QR tidak terbaca. Coba lagi atau ketik kodenya."; }
        });
      });
      blokIsi.push(t, berkas);
    }
    const masuk = tombol("Masuk", "utama");
    masuk.addEventListener("click", () => {
      const k = kodeDariTeks(kodeIsi.input.value);
      if (!k) { err.textContent = "Kode harus 26 karakter heksadesimal (0 sampai 9, a sampai f). Ketik ulang kodenya."; return; }
      urgentLalu(masuk, "Masuk...", async () => { tulis(LS_KODE, k); await mulai(); });
    });
    blokIsi.push(kodeIsi.el, masuk);
    /* jalan keluar bila kode sudah mati dan butir tidak mungkin terkirim: buang antrean dengan konfirmasi dua langkah */
    if (S.j.total) {
      let yakin = false;
      const buang = tombol(`Buang ${angka(S.j.total)} isian dan keluar`, "tautan");
      buang.addEventListener("click", () => {
        if (!yakin) { yakin = true; buang.textContent = "Ketuk lagi untuk membuang isian yang belum terkirim"; return; }
        urgentLalu(buang, "Membuang...", async () => { await buangSemua(); await tampilMasuk(); });
      });
      blokIsi.push(el("p", "lp-kecil", `${angka(S.j.total)} isian belum terkirim tetap tersimpan. Masuk lagi dengan kode tugas yang sama untuk mengirimnya, atau buang.`), buang);
    }
    ganti(blok("Masuk", ...blokIsi));
  }

  function cobaLagi() { const b = tombol("Coba lagi", "utama"); b.addEventListener("click", () => urgentLalu(b, "Memuat...", mulai)); return b; }

  async function mulai() {
    S.tugas = null; S.kode = kodeTersimpan();
    if (!S.kode) return tampilMasuk();
    ganti(el("p", "lp-kecil", "Memuat tugas...", {role: "status"}));
    let r = null;
    try { r = await fetch("/api/sippa/lapangan/saya", {headers: {"x-kode": S.kode, accept: "application/json"}}); } catch { /* luring tanpa simpanan */ }
    if (!r) return ganti(blok("Tugas", el("p", "lp-pesan galat", "Butuh sinyal untuk pertama kali membuka tugas.", {role: "alert"}), cobaLagi()));
    if (r.status === 401 || r.status === 403) { hapusLs(LS_KODE); return tampilMasuk(MSG_KODE_MATI); }
    S.tugas = r.ok ? await r.json().catch(() => null) : null;
    if (!S.tugas?.tugas) { S.tugas = null; return ganti(blok("Tugas", el("p", "lp-pesan galat", "Tugas tidak bisa dimuat. Coba lagi.", {role: "alert"}), cobaLagi())); }
    await segarkan(); kembaliKeTugas(); tunda(kirim);
  }

  const wadahAntre = el("div", "sp-antre");
  function gambarAntre(tolak) {
    wadahAntre.replaceChildren(...tolak.map(b => {
      const k = el("div", "sp-antre-butir"), t = JENIS_FASE2.includes(b.jenis) ? tombol("Buang", "", () => urgentLalu(t, "Membuang...", async () => { await hapus(b.id); await segarkan(); })) : tombol("Perbaiki", "", () => tampilPerbaiki(b));
      k.append(el("p", "", kal(`${JENIS_LABEL[b.jenis] || b.jenis} ditolak: ${b.alasan}`)), t);
      return k;
    }));
  }
  const JENIS_LABEL = {log: "Sesi gelar", probe: "Probe", bbm: "BBM", gerak: "Pindah kit", inspeksi: "Inspeksi", periksa: "Daftar periksa", sos: "SOS", tekanan: "Tekanan", jejak: "Jejak", selesai: "Laporan selesai", bor: "Bor", debit: "Debit air"};

  function tampilTugas() {
    const t = S.tugas.tugas, kit = S.tugas.kit;
    regu.textContent = `Regu ${t.nama_regu}${kit ? `, ${kit.kode}` : ""}`;
    const info = [t.kompleks_id ? el("p", "", `Kompleks tujuan ${t.kompleks_id}`) : null, el("p", "", `Berlaku sampai ${tanggal(t.berakhir)}`)].filter(Boolean);
    let yakin = false;
    const keluarT = tombol("Keluar dari tugas", "tautan");
    keluarT.addEventListener("click", () => {
      if (!yakin) { yakin = true; keluarT.textContent = "Ketuk lagi untuk keluar"; return; }
      urgentLalu(keluarT, "Keluar...", async () => {
        const r = await keluar({tugas_id: tid()});
        if (!r.ok) { yakin = false; keluarT.textContent = "Keluar dari tugas"; pitaTulis(`${r.pesan}. Kirim dulu saat ada sinyal`); return; }
        await tampilMasuk();
      });
    });
    const aksi = [tombol("Mulai sesi gelar", "utama besar", () => tampilSesi()), tombol("Daftar periksa", "", () => tampilPeriksa()), tombol("Foto bukti", "", () => tampilFoto()), tombol("Catat tekanan", "", () => tampilTekanan()),
      tombol("Catat probe", "", () => tampilProbe()), tombol("Catat bor", "", () => tampilBor()), tombol("Ukur debit air", "", () => tampilDebit()), tombol(rek ? "Jejak sedang direkam" : "Rekam jejak", "", () => tampilJejak()), tombol("Catat BBM", "", () => tampilBbm())];
    if (kit) aksi.push(tombol("Inspeksi komponen", "", () => tampilInspeksi()), tombol("Pindah kit", "", () => tampilGerak()));
    aksi.push(tombol("Lapor selesai gelar", "", () => tampilSelesai()));
    ganti(blok("Tugas", ...info), wadahAntre, blok("Catat", ...aksi), keluarT);
    segarkan();
  }

  /* sesi gelar: pilihan, stopwatch enam tahap, angka sesi (DS §4.7 c dan d) */
  function tampilSesi() {
    S.tampil = "sesi";
    const draf = (() => { try { return JSON.parse(baca(LS_DRAF + tid())) || {}; } catch { return {}; } })();
    const tahap = {...(draf.tahap || {})}, koreksi = [...(draf.koreksi || [])];
    const simpanDraf = () => tunda(() => tulis(LS_DRAF + tid(), JSON.stringify({tahap, koreksi})));
    const jenis = pil("Jenis", [["karhutla", "Karhutla"], ["banjir", "Banjir"], ["latihan", "Latihan"]], "karhutla");
    const kelas = pil("Kelas medan", [["I", "I jalan 4x4, gambut dangkal"], ["II", "II darat + sungai, sedang"], ["III", "III perahu/portage, dalam"]], null);
    const sw = el("ol", "sp-stopwatch", null, {"aria-label": "Enam tahap sesi"});
    function gambarSw() {
      const aktif = tahapAktif(tahap);
      sw.replaceChildren(...TAHAP.map((h, i) => {
        const li = el("li");
        if (tahap[h.medan] != null) {
          li.className = "sudah"; li.append(el("span", "", h.label), el("time", "", jam(tahap[h.medan])));
          li.append(tombol("Koreksi", "kecil", () => koreksiTahap(li, h)));
        } else {
          const b = el("button", "", h.label, {type: "button", "aria-label": h.aksi});
          if (i !== aktif) b.setAttribute("aria-disabled", "true");
          b.addEventListener("click", () => {
            if (i !== aktif) return;
            const ms = Date.now(); b.textContent = `${h.label} ${jam(ms)}`;   // jam tampil seketika
            if (navigator.vibrate) navigator.vibrate(30);
            tunda(() => { Object.assign(tahap, tekanTahap(tahap, h.medan, ms)); gambarSw(); simpanDraf(); });
          });
          li.append(b);
        }
        return li;
      }));
    }
    function koreksiTahap(li, h) {
      const w = isian(`Waktu ${h.label.toLowerCase()}`, {type: "datetime-local", nilai: keLokal(tahap[h.medan])}), a = isian("Alasan koreksi", {maks: 120}), e = el("p", "lp-pesan galat", "", {role: "alert"});
      li.replaceChildren(w.el, a.el, e, tombol("Terapkan", "utama", () => {
        const ms = dariLokal(w.input.value);
        if (ms == null) { e.textContent = "Waktu tidak sah. Pilih tanggal dan jam dari daftar."; return; }
        if (!a.input.value.trim()) { e.textContent = "Alasan koreksi wajib diisi."; return; }
        tahap[h.medan] = ms; koreksi.push(`Koreksi ${h.label}: ${a.input.value.trim()}`); gambarSw(); simpanDraf();
      }), tombol("Batal", "", gambarSw));
    }
    gambarSw();

    const f = {
      panjang: isian("Panjang trase (m)", {mode: "decimal"}), orang: isian("Jumlah orang", {mode: "numeric"}), bbm: isian("BBM (L)", {mode: "decimal"}),
      awal: isian("Totalizer awal (m3)", {mode: "decimal"}), akhir: isian("Totalizer akhir (m3)", {mode: "decimal"}), petak: isian("Petak", {daftar: "lp-petak", maks: 40}),
      bar: isian("Tekanan ujung (bar)", {mode: "decimal"}), menit: isian("Bertahan 2 bar atau lebih (menit)", {mode: "numeric"}), bocor: isian("Henti karena bocor (menit)", {mode: "numeric"}),
    };
    const daftarPetak = el("datalist", "", null, {id: "lp-petak"});
    for (const p of S.tugas.petak || []) daftarPetak.append(Object.assign(el("option"), {value: p}));
    const sampai = pil("Air sampai ujung lance", [[1, "Ya"], [0, "Tidak"]], null), sumber = pil("Sumber tekanan", [["gauge", "Gauge"], ["operator", "Operator"]], null), celaka = pil("Kecelakaan", [[0, "Tidak"], [1, "Ya"]], 0);
    const catatan = el("textarea", "", null, {maxlength: "1000", "aria-label": "Catatan", rows: "3"}), hitung = el("small", "lp-kecil", "0/1.000");
    catatan.addEventListener("input", () => { hitung.textContent = `${angka(catatan.value.length)}/1.000`; });
    const foto = el("input", "", null, {type: "file", accept: "image/jpeg,image/webp", "aria-label": "Tambah foto"});
    const err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan sesi", "utama besar");
    const jamPompa = el("p", "lp-kecil");
    const tulisJam = () => { const h = bangunLog({tahap}); jamPompa.textContent = h.jam_pompa != null ? `Jam pompa ${angka(h.jam_pompa)} jam (otomatis)` : "Jam pompa terisi otomatis sesudah air mengalir dan selesai"; };
    tulisJam(); sw.addEventListener("click", () => tunda(tulisJam));

    simpan.addEventListener("click", () => urgentLalu(simpan, "Menyimpan...", async () => {
      const s = {jenis: jenis.nilai(), kelas_medan: kelas.nilai(), panjang_m: angkaDari(f.panjang.input), n_orang: angkaDari(f.orang.input), bbm_l: angkaDari(f.bbm.input), totalizer_awal: angkaDari(f.awal.input), totalizer_akhir: angkaDari(f.akhir.input),
        petak_id: f.petak.input.value.trim(), air_sampai_lance: sampai.nilai(), p_ujung_bar: angkaDari(f.bar.input), p_ujung_menit: angkaDari(f.menit.input), p_ujung_sumber: sumber.nilai(), kecelakaan: celaka.nilai(),
        bocor_henti_menit: angkaDari(f.bocor.input), catatan: [catatan.value.trim(), ...koreksi].filter(Boolean).join(" | "), tahap, konfigurasi: S.tugas.kit ? {kit: S.tugas.kit.kode} : undefined};
      const r = await tambah({jenis: "log", data: bangunLog(s), tugas_id: tid()}, opsiTugas());
      if (!r.ok) { if (r.galat) tulisGalat(err, "log", r.galat); else err.replaceChildren(el("p", "", r.pesan)); return; }
      hapusLs(LS_DRAF + tid());
      if (foto.files[0]) { const fr = await tambahFoto(foto.files[0], r.id); if (!fr.ok) pitaTulis(fr.pesan); }
      await segarkan(); kembaliKeTugas(); if (navigator.onLine !== false) tunda(kirim);
    }));
    ganti(blok("Sesi gelar", jenis.el), blok("Kelas medan", kelas.el), blok("Tahap", sw), blok("Angka sesi", f.panjang.el, f.orang.el, jamPompa, f.bbm.el, f.awal.el, f.akhir.el, f.petak.el, daftarPetak,
      sampai.el, f.bar.el, f.menit.el, sumber.el, celaka.el, f.bocor.el, blok("Catatan", catatan, hitung), foto), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  /* probe suhu gambut: satu butir per kedalaman yang diisi (DS §4.7 e) */
  function tampilProbe() {
    S.tampil = "probe";
    const kedalaman = [...KEDALAMAN_CM.biasa, ...(S.tugas.tugas.lengan_dalam ? KEDALAMAN_CM.lengan_dalam : [])];
    const petak = isian("Petak", {daftar: "lp-petak2", maks: 40}), titik = isian("Titik", {maks: 20});
    const daftarPetak = el("datalist", "", null, {id: "lp-petak2"});
    for (const p of S.tugas.petak || []) daftarPetak.append(Object.assign(el("option"), {value: p}));
    const tahap = pil("Tahap", [["sebelum", "Sebelum"], ["sesudah", "Sesudah"], ["24j", "24 jam"], ["72j", "72 jam"], ["7h", "7 hari"], ["30h", "30 hari"], ["90h", "90 hari"]], "sebelum");
    const papan = el("div", "sp-probe"), sel = [];
    for (const cm of kedalaman) {
      const i = isian(`${angka(cm)} cm (°C)`, {mode: "decimal"}), p = el("span", "sp-yakin menunggu", "belum dingin", {hidden: ""});
      i.input.addEventListener("input", () => { const v = angkaDari(i.input); p.hidden = !(typeof v === "number" && v > 50); });
      papan.append(i.el, p); sel.push([cm, i.input]);
    }
    const err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan probe", "utama besar");
    simpan.addEventListener("click", () => urgentLalu(simpan, "Menyimpan...", async () => {
      const waktu = Date.now(), butir = sel.map(([cm, i]) => [cm, angkaDari(i)]).filter(([, v]) => v !== undefined)
        .map(([cm, v]) => ({petak_id: petak.input.value.trim() || undefined, titik: titik.input.value.trim(), tahap: tahap.nilai(), kedalaman_cm: cm, suhu_c: v, waktu}));
      if (!butir.length) { err.replaceChildren(el("p", "", "Isi minimal satu kedalaman.")); return; }
      /* semua kedalaman diperiksa dulu: satu yang salah = tidak ada yang tersimpan setengah */
      const salah = butir.map(b => cekButir("probe", {id: "0".repeat(16), ...bersih(b)}, opsiTugas())).find(c => !c.ok);
      if (salah) { tulisGalat(err, "probe", salah.galat); return; }
      for (const b of butir) { const r = await tambah({jenis: "probe", data: bersih(b), tugas_id: tid()}, opsiTugas()); if (!r.ok) { if (r.galat) tulisGalat(err, "probe", r.galat); else err.replaceChildren(el("p", "", r.pesan)); return; } }
      await segarkan(); kembaliKeTugas(); if (navigator.onLine !== false) tunda(kirim);
    }));
    ganti(blok("Probe suhu", petak.el, daftarPetak, titik.el, tahap.el, papan), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  function tampilBbm() {
    S.tampil = "bbm";
    const aksi = pil("Aksi", [["terima", "Terima"], ["keluar", "Keluar"], ["kembali", "Kembali"], ["koreksi", "Koreksi"]], "terima"), jenis = pil("Jenis BBM", [["solar", "Solar"], ["bensin", "Bensin"]], "solar");
    const liter = isian("Liter", {mode: "decimal"}), tiket = isian("Nomor tiket", {maks: 40});
    const err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan BBM", "utama besar");
    simpan.addEventListener("click", () => urgentLalu(simpan, "Menyimpan...", async () => {
      const r = await tambah({jenis: "bbm", data: bersih({jenis: jenis.nilai(), aksi: aksi.nilai(), liter: angkaDari(liter.input), tiket: tiket.input.value.trim(), waktu: Date.now()}), tugas_id: tid()}, opsiTugas());
      if (!r.ok) { if (r.galat) tulisGalat(err, "bbm", r.galat); else err.replaceChildren(el("p", "", r.pesan)); return; }
      await segarkan(); kembaliKeTugas(); if (navigator.onLine !== false) tunda(kirim);
    }));
    ganti(blok("BBM", aksi.el, jenis.el, liter.el, tiket.el), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  const cekTunggu = w => { const l = el("label", "lp-pil"); l.append(w, el("span", "", "Menunggu suku cadang")); return l; };
  /* inspeksi pra/pasca gelar: kondisi tiap komponen sebagai segmen berlabel kata, komponen yang tak dinilai dilewati (DS §4.15, DT §6.6) */
  function tampilInspeksi() {
    S.tampil = "inspeksi";
    const daftarK = daftarPeriksa(S.tugas.kit), kembali = tombol("Kembali", "", kembaliKeTugas);
    if (!daftarK.length) { ganti(blok("Inspeksi komponen", el("p", "lp-pesan galat", "Daftar komponen kit belum diterima dari server. Hubungi perencana untuk memperbarui tugas ini.", {role: "alert"})), kembali); return; }
    const jenis = pil("Jenis inspeksi", [["pra_gelar", "Pra-gelar"], ["pasca_gelar", "Pasca-gelar"]], "pra_gelar");
    const baris = daftarK.map(c => ({c, g: pil(`Kondisi ${c.kode_bom}`, KATA_SKOR.map((k, i) => [i, k]), null), w: Object.assign(el("input"), {type: "checkbox"}), j: awalanK1(c.kode_bom) ? isian(`Jam operasi ${c.kode_bom} sejak servis`, {mode: "decimal"}) : null}));
    const temuan = el("textarea", "", null, {maxlength: "1000", "aria-label": "Temuan", rows: "3"});
    const err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan inspeksi", "utama besar");
    simpan.addEventListener("click", () => urgentLalu(simpan, "Menyimpan...", async () => {
      const dinilai = baris.map(({c, g}) => ({...c, skor: g.nilai()})), jam = {};
      for (const {c, j} of baris) if (j) { const v = angkaDari(j.input); if (typeof v === "string") { err.replaceChildren(el("p", "", kal(`Jam operasi ${c.kode_bom} harus angka`))); return; } if (v !== undefined) jam[c.sasaran_id] = v; }
      const tunggu = new Set(baris.filter(b => b.w.checked).map(b => b.c.sasaran_id));
      const butir = bangunInspeksi({jenis: jenis.nilai(), nilai: dinilai, jam, temuan: temuan.value, tunggu});
      if (!butir.length) { err.replaceChildren(el("p", "", "Nilai kondisi minimal satu komponen.")); return; }
      /* semua butir diperiksa dulu: satu yang salah = tidak ada yang tersimpan setengah */
      const salah = butir.map(b => cekButir("inspeksi", {id: "0".repeat(16), ...b}, opsiTugas())).find(c => !c.ok);
      if (salah) { tulisGalat(err, "inspeksi", salah.galat); return; }
      for (const b of butir) { const r = await tambah({jenis: "inspeksi", data: b, tugas_id: tid()}, opsiTugas()); if (!r.ok) { if (r.galat) tulisGalat(err, "inspeksi", r.galat); else err.replaceChildren(el("p", "", r.pesan)); return; } }
      await segarkan(); kembaliKeTugas(); if (navigator.onLine !== false) tunda(kirim);
    }));
    ganti(blok("Inspeksi komponen", jenis.el), ...baris.map(({c, g, j, w}) => blok(`${c.kode_bom} ${c.nama}`, g.el, ...(j ? [j.el] : []), cekTunggu(w))), blok("Temuan", temuan), err, simpan, kembali);
  }

  /* pindah kit: hanya gelar, bongkar, kembali (DT §6.2 kolom K); dari_status dari kit tugas, server menolak bila staf sudah memindahnya */
  const ARAH = {gelar: ["gelar", "gelar"], bongkar: ["depot", "bongkar"], kembali: ["gudang", "kembali"]};
  function tampilGerak() {
    S.tampil = "gerak";
    const aksi = pil("Pindah kit", [["gelar", "Gelar"], ["bongkar", "Bongkar"], ["kembali", "Kembali"]], "gelar");
    const lokasi = isian("Lokasi", {maks: 120}), gps = {}, infoGps = el("p", "lp-kecil", "", {role: "status"});
    const lima = n => n.toLocaleString("id-ID", {minimumFractionDigits: 5, maximumFractionDigits: 5});   // DS §6.2: koordinat lima desimal
    const ambil = tombol("Ambil GPS", "", () => {
      if (!navigator.geolocation) { infoGps.textContent = "GPS tidak tersedia. Ketik lokasinya."; return; }
      infoGps.textContent = "Mengambil GPS...";
      navigator.geolocation.getCurrentPosition(p => { gps.lat = p.coords.latitude; gps.lon = p.coords.longitude; infoGps.textContent = `GPS: ${lima(gps.lat)}; ${lima(gps.lon)}`; },
        () => { infoGps.textContent = "GPS ditolak. Ketik lokasinya."; });
    });
    const err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan gerak", "utama besar");
    simpan.addEventListener("click", () => urgentLalu(simpan, "Menyimpan...", async () => {
      const [ke, alasan] = ARAH[aksi.nilai()], kini = Date.now();
      const r = await tambah({jenis: "gerak", data: bersih({dari_status: S.tugas.kit.status, ke_status: ke, alasan, ke_lokasi: lokasi.input.value.trim(), ...gps, waktu: kini, tiba: kini}), tugas_id: tid()}, opsiTugas());
      if (!r.ok) { if (r.galat) tulisGalat(err, "gerak", r.galat); else err.replaceChildren(el("p", "", r.pesan)); return; }
      await segarkan(); kembaliKeTugas(); if (navigator.onLine !== false) tunda(kirim);
    }));
    ganti(blok("Pindah kit", aksi.el, lokasi.el, ambil, infoGps), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  /* ====== fase 2 (keputusan 61): daftar periksa, foto bukti, SOS, tekanan, jejak, selesai, bor, debit ====== */
  /* posisi: satu bacaan GPS dengan batas 10 detik; null bila ditolak atau tidak ada */
  const posisi = () => new Promise(ok => {
    if (!navigator.geolocation) return ok(S.gps || null);
    navigator.geolocation.getCurrentPosition(p => { S.gps = {lat: p.coords.latitude, lon: p.coords.longitude}; ok(S.gps); }, () => ok(S.gps || null), {enableHighAccuracy: true, timeout: 10000, maximumAge: 30000});
  });
  const GALAT_GPS = "Lokasi belum terbaca. Pindah ke tempat terbuka lalu coba lagi.";
  const lima = n => n.toLocaleString("id-ID", {minimumFractionDigits: 5, maximumFractionDigits: 5});
  async function simpanButir(jenis, data, err) {
    const r = await tambah({jenis, data: bersih(data), tugas_id: tid()}, opsiTugas());
    if (!r.ok) { if (r.galat) tulisGalat(err, jenis, r.galat); else err.replaceChildren(el("p", "", r.pesan)); return false; }
    return true;
  }
  const selesaiSimpan = async () => { await segarkan(); kembaliKeTugas(); if (navigator.onLine !== false) tunda(kirim); };
  const petakIsi = (id) => { const i = isian("Petak", {daftar: id, maks: 40}), d = el("datalist", "", null, {id}); for (const p of S.tugas.petak || []) d.append(Object.assign(el("option"), {value: p})); return {el: i.el, input: i.input, daftar: d}; };

  /* SP-120 daftar periksa: satu ketukan satu langkah berjam, tersimpan di ponsel dan masuk antrean seketika */
  function tampilPeriksa() {
    S.tampil = "periksa";
    const kunci = LS_PERIKSA + tid(), sudah = (() => { try { return JSON.parse(baca(kunci)) || {}; } catch { return {}; } })();
    const petak = petakIsi("lp-petak3"), err = el("div", "lp-pesan galat", null, {role: "alert"}), daftarEl = el("ol", "sp-stopwatch", null, {"aria-label": "Langkah kerja"});
    const gambarDaftar = () => daftarEl.replaceChildren(...LANGKAH_PERIKSA.map(([kode, label]) => {
      const li = el("li");
      if (sudah[kode] != null) { li.className = "sudah"; li.append(el("span", "", label), el("time", "", jam(sudah[kode]))); return li; }
      const b = el("button", "", label, {type: "button"});
      b.addEventListener("click", () => {
        if (b.disabled) return;
        const ms = Date.now(); b.disabled = true; b.textContent = `${label} ${jam(ms)}`;   // jam tampil seketika
        if (navigator.vibrate) navigator.vibrate(30);
        tunda(async () => {
          const ok = await simpanButir("periksa", {langkah: kode, waktu: ms, petak_id: petak.input.value.trim()}, err);
          if (!ok) { b.disabled = false; b.textContent = label; return; }
          sudah[kode] = ms; tulis(kunci, JSON.stringify(sudah)); gambarDaftar(); segarkan(); if (navigator.onLine !== false) tunda(kirim);
        });
      });
      li.append(b); return li;
    }));
    gambarDaftar();
    ganti(blok("Daftar periksa", el("p", "lp-kecil", "Ketuk tiap langkah saat selesai. Jamnya tercatat otomatis."), petak.el, petak.daftar, daftarEl), err, tombol("Kembali", "", kembaliKeTugas));
  }

  /* SP-121 foto bukti per tahap dengan lokasi GPS; berangkat lewat antrean foto, server membuat butirnya */
  function tampilFoto() {
    S.tampil = "foto";
    const tahap = pil("Tahap", TAHAP_FOTO, "tiba"), berkas = el("input", "", null, {type: "file", accept: "image/jpeg,image/webp", capture: "environment", "aria-label": "Ambil foto"});
    const info = el("p", "lp-kecil", "", {role: "status"}), err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan foto", "utama besar");
    simpan.addEventListener("click", () => urgentLalu(simpan, "Mengambil lokasi...", async () => {
      const f = berkas.files[0];
      if (!f) { err.replaceChildren(el("p", "", "Ambil foto dulu.")); return; }
      const p = await posisi();
      if (!p) { err.replaceChildren(el("p", "", GALAT_GPS)); return; }
      const r = await tambahFoto(f, null, {tahap: tahap.nilai(), lat: p.lat, lon: p.lon, tugas_id: tid()});
      if (!r.ok) { err.replaceChildren(el("p", "", kal(r.pesan))); return; }
      info.textContent = kal(`Foto tersimpan, lokasi ${lima(p.lat)}; ${lima(p.lon)}`); berkas.value = "";
      if (navigator.onLine !== false) tunda(kirim);
    }));
    ganti(blok("Foto bukti", tahap.el, berkas, info), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  /* SP-125 tekanan; pengingat tiap 10 menit saat sesi aktif (sudah air mengalir, belum selesai) */
  const sesiAktif = () => { try { const t = JSON.parse(baca(LS_DRAF + tid()))?.tahap || {}; return t.t_air_mengalir != null && t.t_selesai == null ? t.t_air_mengalir : null; } catch { return null; } };
  const tekananTerakhir = () => Number(baca(LS_TEKANAN + tid())) || null;
  let pengingatDiam = 0, konteksBunyi = null;   // satu AudioContext bersama
  function periksaPengingat() {
    if (!S.tugas) { pengingat.hidden = true; return; }
    const mulaiAir = sesiAktif(), pe = pengingatTekanan({aktif: mulaiAir != null, terakhir: Math.max(tekananTerakhir() || 0, mulaiAir || 0), kini: Date.now()});
    if (!pe.perlu) { pengingat.hidden = true; return; }
    if (!pengingat.hidden) return;
    pengingat.replaceChildren(el("p", "", "Sudah 10 menit. Catat tekanan sekarang."), tombol("Catat tekanan", "utama", () => tampilTekanan()), tombol("Nanti", "kecil", () => { pengingat.hidden = true; pengingatDiam = Date.now(); }));
    if (Date.now() - pengingatDiam < 180000) return;
    pengingat.hidden = false;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    try { const a = (konteksBunyi ||= new AudioContext()), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.25); } catch { /* bunyi butuh izin peramban; getar dan banner tetap muncul */ }
  }
  const pengingatTimer = setInterval(() => tunda(periksaPengingat), 30000);
  function tampilTekanan() {
    S.tampil = "tekanan"; pengingat.hidden = true;
    const titik = pil("Titik ukur", TITIK_TEKANAN, "lance"), bar = isian("Tekanan (bar)", {mode: "decimal"}), petak = petakIsi("lp-petak4");
    const awas = el("p", "lp-pesan galat", "", {role: "status"}), err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan tekanan", "utama besar");
    const tulisAwas = () => { const v = angkaDari(bar.input); awas.textContent = typeof v === "number" ? peringatanTekanan(titik.nilai(), v) || "" : ""; };
    bar.input.addEventListener("input", tulisAwas); titik.el.addEventListener("change", tulisAwas);
    simpan.addEventListener("click", () => urgentLalu(simpan, "Menyimpan...", async () => {
      const ms = Date.now();
      if (!(await simpanButir("tekanan", {titik: titik.nilai(), bar: angkaDari(bar.input), waktu: ms, petak_id: petak.input.value.trim()}, err))) return;
      tulis(LS_TEKANAN + tid(), String(ms)); await selesaiSimpan();
    }));
    ganti(blok("Tekanan", titik.el, bar.el, awas, petak.el, petak.daftar), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  /* SP-128 bor: kedalaman gambut per petak dengan peringatan aturan ganti petak */
  function tampilBor() {
    S.tampil = "bor";
    const cm = isian("Tebal gambut (cm)", {mode: "decimal"}), petak = petakIsi("lp-petak5"), cat = isian("Catatan", {maks: 200});
    const awas = el("p", "lp-pesan galat", "", {role: "status"}), err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan bor", "utama besar");
    cm.input.addEventListener("input", () => { const v = angkaDari(cm.input); awas.textContent = typeof v === "number" ? peringatanBor(v) || "" : ""; });
    simpan.addEventListener("click", () => urgentLalu(simpan, "Mengambil lokasi...", async () => {
      const p = await posisi(); if (!p) { err.replaceChildren(el("p", "", GALAT_GPS)); return; }
      if (await simpanButir("bor", {petak_id: petak.input.value.trim(), lat: p.lat, lon: p.lon, kedalaman_cm: angkaDari(cm.input), waktu: Date.now(), catatan: cat.input.value.trim()}, err)) await selesaiSimpan();
    }));
    ganti(blok("Bor tebal gambut", petak.el, petak.daftar, cm.el, awas, cat.el), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  /* SP-129 debit air: pelampung atau ember, hasil L/s langsung dibanding kebutuhan satu kit */
  function tampilDebit() {
    S.tampil = "debit";
    const metode = pil("Cara ukur", [["pelampung", "Pelampung di kanal"], ["ember", "Ember"]], "pelampung");
    const f = {lebar: isian("Lebar kanal (m)", {mode: "decimal"}), dalam: isian("Dalam air (m)", {mode: "decimal"}), kec: isian("Kecepatan pelampung (m per detik)", {mode: "decimal"}),
      vol: isian("Isi ember (liter)", {mode: "decimal"}), detik: isian("Waktu terisi (detik)", {mode: "decimal"})};
    const kolomPelampung = el("div", "", null), kolomEmber = el("div", "", null);
    kolomPelampung.append(f.lebar.el, f.dalam.el, f.kec.el); kolomEmber.append(f.vol.el, f.detik.el);
    const hasil = el("p", "lp-hasil", "", {role: "status"}), err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan debit", "utama besar");
    const ambilIsi = () => metode.nilai() === "ember" ? {metode: "ember", volume_l: angkaDari(f.vol.input), detik: angkaDari(f.detik.input)}
      : {metode: "pelampung", lebar_m: angkaDari(f.lebar.input), dalam_m: angkaDari(f.dalam.input), kecepatan_ms: angkaDari(f.kec.input)};
    const tulisHasil = () => { kolomPelampung.hidden = metode.nilai() === "ember"; kolomEmber.hidden = !kolomPelampung.hidden; hasil.textContent = kalimatDebit(hitungDebit(ambilIsi())); };
    tulisHasil();
    for (const k of Object.values(f)) k.input.addEventListener("input", tulisHasil);
    metode.el.addEventListener("change", tulisHasil);
    simpan.addEventListener("click", () => urgentLalu(simpan, "Mengambil lokasi...", async () => {
      const p = await posisi(); if (!p) { err.replaceChildren(el("p", "", GALAT_GPS)); return; }
      if (await simpanButir("debit", {...ambilIsi(), lat: p.lat, lon: p.lon, waktu: Date.now()}, err)) await selesaiSimpan();
    }));
    ganti(blok("Debit air", metode.el, kolomPelampung, kolomEmber, hasil), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  /* SP-126 jejak GPS: tetap direkam walau layar lain dibuka; berhenti dan kirim dari layar ini */
  let rek = null;
  function mulaiRekam(moda) {
    if (!navigator.geolocation) return false;
    rek = {moda, titik: [], id: null};
    rek.id = navigator.geolocation.watchPosition(p => { const t = tambahTitikJejak(rek.titik, [p.coords.latitude, p.coords.longitude, Date.now()]); if (t !== rek.titik) { rek.titik = t; S.gps = {lat: p.coords.latitude, lon: p.coords.longitude}; rek.ubah?.(); } }, () => { /* izin ditolak: layar Jejak menampilkan 0 titik */ }, {enableHighAccuracy: true, maximumAge: 5000});
    return true;
  }
  function tampilJejak() {
    S.tampil = "jejak";
    const moda = pil("Moda", MODA_JEJAK, rek?.moda || "jalan_kaki"), status = el("p", "lp-hasil", "", {role: "status"}), err = el("div", "lp-pesan galat", null, {role: "alert"});
    const tulisStatus = () => { status.textContent = rek ? `Merekam: ${angka(rek.titik.length)} titik, ${angka(Math.round(panjangJejakM(rek.titik)))} m` : "Belum merekam."; };
    const mulai = tombol("Mulai rekam", "utama besar"), henti = tombol("Berhenti dan simpan", "besar");
    const atur = () => { mulai.hidden = !!rek; henti.hidden = !rek; tulisStatus(); if (rek) rek.ubah = tulisStatus; };
    mulai.addEventListener("click", () => { if (!mulaiRekam(moda.nilai())) { err.replaceChildren(el("p", "", "GPS tidak tersedia di peramban ini.")); return; } atur(); });
    henti.addEventListener("click", () => urgentLalu(henti, "Menyimpan...", async () => {
      const r = rek; if (!r) return;
      if (r.titik.length < 2) { err.replaceChildren(el("p", "", "Titik belum cukup. Berjalan dulu beberapa langkah, atau batalkan.")); return; }
      if (!(await simpanButir("jejak", {titik: r.titik, moda: r.moda}, err))) return;
      navigator.geolocation.clearWatch(r.id); rek = null; await selesaiSimpan();
    }));
    const batal = tombol("Batalkan rekaman", "kecil", () => { if (rek) { navigator.geolocation.clearWatch(rek.id); rek = null; } atur(); });
    atur();
    ganti(blok("Rekam jejak", el("p", "lp-kecil", "Titik disimpan tiap 20 m atau 30 detik, paling banyak 500. Biarkan layar ini aktif."), moda.el, status, mulai, henti, batal), err, tombol("Kembali", "", kembaliKeTugas));
  }

  /* SP-127 laporan selesai gelar: alat kit dicentang kembali atau hilang */
  function tampilSelesai() {
    S.tampil = "selesai";
    const alat = daftarAlat(S.tugas.kit), baris = alat.map(a => { const w = Object.assign(el("input"), {type: "checkbox"}), l = el("label", "lp-pil"); l.append(w, el("span", "", `${a.kode_bom} ${a.nama} hilang`)); return {a, w, l}; });
    const ketik = isian("Kode alat hilang (pisahkan koma)", {maks: 200}), cat = el("textarea", "", null, {maxlength: "500", "aria-label": "Catatan", rows: "3"});
    const err = el("div", "lp-pesan galat", null, {role: "alert"}), simpan = tombol("Simpan laporan selesai", "utama besar");
    simpan.addEventListener("click", () => urgentLalu(simpan, "Menyimpan...", async () => {
      const d = bangunSelesai({alat, hilang: baris.filter(b => b.w.checked).map(b => b.a.kode_bom), ketik: alat.length ? "" : ketik.input.value, catatan: cat.value});
      if (await simpanButir("selesai", d, err)) await selesaiSimpan();
    }));
    ganti(blok("Laporan selesai gelar", alat.length ? el("p", "lp-kecil", "Semua alat dianggap kembali. Centang yang hilang.") : el("p", "lp-kecil", "Daftar alat kit belum diterima dari server. Ketik kode alat yang hilang, atau kosongkan bila semua kembali."),
      ...(alat.length ? baris.map(b => b.l) : [ketik.el]), blok("Catatan", cat)), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  /* SP-123 SOS: tahan 2 detik, lokasi diambil, butir masuk antrean dan langsung dicoba kirim */
  async function kirimSos() {
    sos.textContent = "Mengambil lokasi..."; sos.disabled = true;
    const p = await posisi(); sos.disabled = false; sos.textContent = SOS_LABEL;
    const kumpul = titikKumpul(S.tugas?.tugas), baris = [];
    if (!p) baris.push(el("p", "lp-pesan galat", "Lokasi belum terbaca, SOS belum tersimpan. Hubungi nomor di bawah, lalu tahan tombol SOS lagi di tempat terbuka."));
    else {
      const err = el("div"), ok = await simpanButir("sos", {lat: p.lat, lon: p.lon, waktu: Date.now()}, err);
      baris.push(ok ? el("p", "lp-sos-ok", "SOS tersimpan dan dikirim begitu ada sinyal. Tetap di tempat aman.") : err);
      if (ok) { segarkan(); tunda(kirim); }
    }
    baris.push(el("p", "", kumpul ? `Titik kumpul: ${kumpul.nama}${kumpul.lat != null && kumpul.lon != null ? ` (${lima(kumpul.lat)}; ${lima(kumpul.lon)})` : ""}` : "Titik kumpul: ujung jalan tempat kendaraan siaga."));
    for (const [no, nama] of NOMOR_DARURAT) baris.push(Object.assign(el("a", "lp-tombol", `${nama}: ${no}`), {href: `tel:${no}`}));
    baris.push(tombol("Tutup", "kecil", () => { panelSos.hidden = true; }));
    panelSos.replaceChildren(el("h2", "", "SOS", {tabindex: "-1"}), ...baris); panelSos.hidden = false; panelSos.querySelector("h2").focus();
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
  }
  const SOS_LABEL = "SOS: tahan 2 detik";
  let tahanSos = null, terkirimSos = false;
  const lepasSos = () => { if (tahanSos) { clearTimeout(tahanSos); tahanSos = null; } sos.classList.remove("menahan"); if (!sos.disabled) sos.textContent = SOS_LABEL; };
  const mulaiSos = () => { if (tahanSos || sos.disabled) return; sos.classList.add("menahan"); sos.textContent = "Tahan terus..."; tahanSos = setTimeout(() => { tahanSos = null; terkirimSos = true; lepasSos(); kirimSos(); }, SOS_TAHAN_MS); };
  sos.addEventListener("click", () => { if (terkirimSos) { terkirimSos = false; return; } pitaTulis("Tahan tombol SOS selama 2 detik untuk mengirim, jangan hanya diketuk"); });
  sos.addEventListener("pointerdown", mulaiSos); sos.addEventListener("contextmenu", e => e.preventDefault());
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) sos.addEventListener(ev, lepasSos);
  sos.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); mulaiSos(); } });
  sos.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") lepasSos(); });

  /* Perbaiki butir ditolak: satu isian per medan butir (dari MEDAN), lalu cekButir dan kembali menunggu */
  function tampilPerbaiki(b) {
    S.tampil = "perbaiki";
    const def = MEDAN[b.jenis], kolom = [];
    for (const [nama, v] of Object.entries(b.data)) {
      const m = def[nama]; if (!m || nama === "id") continue;
      const tipeWaktu = m.tipe === "waktu", i = isian(m.label, {type: tipeWaktu ? "datetime-local" : "text", mode: m.tipe === "angka" || m.tipe === "bulat" ? "decimal" : undefined, nilai: tipeWaktu ? keLokal(v) : String(v)});
      kolom.push([nama, m, i]);
    }
    const err = el("div", "lp-pesan galat", null, {role: "alert"}), alasan = el("p", "lp-pesan galat", kal(`Alasan server: ${b.alasan}`));
    const simpan = tombol("Simpan perbaikan", "utama besar");
    simpan.addEventListener("click", () => urgentLalu(simpan, "Menyimpan...", async () => {
      const data = {};
      for (const [nama, m, i] of kolom) {
        const mentah = i.input.value.trim(); if (mentah === "") continue;
        data[nama] = m.tipe === "waktu" ? dariLokal(mentah) : m.tipe === "angka" || m.tipe === "bulat" || m.tipe === "bool" ? (Number.isFinite(Number(mentah.replace(",", "."))) ? Number(mentah.replace(",", ".")) : mentah) : mentah;
      }
      const r = await perbaiki(b.id, data, opsiTugas());
      if (!r.ok) { if (r.galat) tulisGalat(err, b.jenis, r.galat); else err.replaceChildren(el("p", "", r.pesan)); return; }
      await segarkan(); kembaliKeTugas(); if (navigator.onLine !== false) tunda(kirim);
    }));
    ganti(blok("Perbaiki isian", alasan, ...kolom.map(k => k[2].el)), err, simpan, tombol("Kembali", "", kembaliKeTugas));
  }

  /* ----- masuk ----- */
  ambilKode(location, history, localStorage);
  idbSiap().then(ok => { if (!ok) { S.penyimpananLemah = "Foto tidak bisa disimpan luring di peramban ini."; pitaTulis(S.penyimpananLemah); } });
  const berkala = setInterval(() => { if (document.visibilityState === "visible") tunda(kirim); }, KIRIM_BERKALA_MS);
  addEventListener("online", () => tunda(kirim));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") tunda(kirim); });
  pasang.lepas = () => { clearInterval(berkala); clearInterval(pengingatTimer); if (rek) navigator.geolocation.clearWatch(rek.id); };
  /* isian lebih dari 14 hari milik kode yang mustahil terkirim: dibuang dan jumlahnya diberitahukan (SP-015) */
  tunda(async () => { const k = await buangKadaluarsa().catch(() => null); if (k?.butir) pitaTulis(`${angka(k.butir)} isian lebih dari 14 hari dibuang dari antrean karena tidak mungkin terkirim lagi.`); await mulai(); });
}

export const lepas = () => pasang.lepas?.();

/* masuk: hanya di halaman cangkang, bukan saat diimpor uji Node */
if (typeof document !== "undefined") {
  const akar = document.getElementById("lapangan") || document.getElementById("app");
  if (akar) {
    pasang(akar);
    const daftarkan = () => setTimeout(() => daftarSW(), 1500);   // sesudah load, supaya pemasangan cangkang tidak berebut jaringan dengan muat awal
    if (document.readyState === "complete") daftarkan(); else addEventListener("load", daftarkan);
  }
}
