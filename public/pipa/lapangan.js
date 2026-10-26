/* SIPPA: layar form lapangan luring /pipa/lapangan (SP-011; PRD §9.9, DS §3.7.2 dan §4.7, DT §6.1). Tanpa akun: kode penugasan 26 heks di
   header x-kode. Dimuat cangkang halamanSippaLapangan (bukan modul layar_*.js router): pasang(akar) dipanggil cangkang, atau berjalan sendiri
   bila ada #lapangan atau #app. Hanya impor relatif ke modul pipa, supaya ikut tersimpan service worker. Semua teks lewat textContent.
   INP: ketukan stopwatch dan Kirim sekarang mengubah tombol seketika, simpan dan kirim lewat nanti() (anggaran form lapangan < 100 ms). */
import {ikon} from "./ikon.js";
import {cekButir, MEDAN, KEDALAMAN_CM} from "./formulir.js";
import {tambah, tambahFoto, jumlah, daftar, perbaiki, kirimSemua, keluar, buangSemua, kodeTersimpan, idbSiap} from "./antre.js";

const LS_KODE = "sippa.kode", LS_TERKIRIM = "sippa.terkirim", LS_DRAF = "sippa.draf.";
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
  akar.replaceChildren(kop, strip, pita, isi);

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
  function ganti(...simpul) { isi.replaceChildren(...simpul); isi.querySelector("h2")?.focus(); }
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
      const k = el("div", "sp-antre-butir"), t = tombol("Perbaiki", "", () => tampilPerbaiki(b));
      k.append(el("p", "", kal(`${JENIS_LABEL[b.jenis] || b.jenis} ditolak: ${b.alasan}`)), t);
      return k;
    }));
  }
  const JENIS_LABEL = {log: "Sesi gelar", probe: "Probe", bbm: "BBM", gerak: "Pindah kit"};

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
    const aksi = [tombol("Mulai sesi gelar", "utama besar", () => tampilSesi()), tombol("Catat probe", "", () => tampilProbe()), tombol("Catat BBM", "", () => tampilBbm())];
    if (kit) aksi.push(tombol("Pindah kit", "", () => tampilGerak()));
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
  pasang.lepas = () => clearInterval(berkala);
  tunda(mulai);
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
