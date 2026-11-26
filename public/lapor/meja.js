/* Meja laporan staf BNPB (TIKET LA-15, KEPUTUSAN K7, K9, D22). Dasbor gaya Pantau Dalops (pemilik 19 Nov 2026 "tiru model BNPB dalops"):
   peta dengan saring jenis berikon + jumlah, saring cepat, periode, panel ringkasan, legenda; tabel di bawah; rincian dalam pop-up <dialog>.
   Kotak angka di kepala = saring status. Semua saringan berlaku serentak untuk peta, ringkasan, dan tabel.
   INP (aturan pemilik 2): tombol saring berganti keadaan seketika, peta dan tabel digambar ulang sesudah cat berikutnya.
   Angka dampak antarlaporan tidak dijumlah (laporan warga bisa ganda untuk satu kejadian): ringkasan menghitung LAPORAN, bukan korban. */
import {labelKode} from "./kode.js";
import {bukaOrangDicari} from "./meja_cari.js?v=5";   // LA-82: orang dicari (K91)
import {pasangDataLanjutan, bukaDaftarData} from "./meja_data.js";   // LJ-16: data lanjutan BPBD (rincian tiket dan daftar lintas kab)
const $ = id => document.getElementById(id);
const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const ikon = id => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", `#${id}`); s.setAttribute("aria-hidden", "true"); s.append(u); return s; };
const F = n => Number(n).toLocaleString("id-ID");
let tunda = 0;   // gambar berat sesudah tombol tercat; klik beruntun digabung jadi satu gambar. Timer cadangan untuk tab latar (rAF berhenti)
const nanti = f => { const n = ++tunda, jalan = () => { if (n === tunda) { tunda++; f(); } }; requestAnimationFrame(() => setTimeout(jalan, 0)); setTimeout(jalan, 120); };

const WARNA = {baru: "var(--info)", dilihat: "var(--accent)", ditelaah: "var(--warn)", diteruskan: "var(--brand2)", ditindaklanjuti: "var(--brand-accent)", selesai: "var(--ok)", tidak_valid: "var(--ink2)"};
const LABEL = {baru: "Baru", dilihat: "Dilihat", ditelaah: "Ditelaah", diteruskan: "Diteruskan", ditindaklanjuti: "Ditindaklanjuti", selesai: "Selesai", tidak_valid: "Tidak valid"};
const TAHAP = ["baru", "dilihat", "ditelaah", "diteruskan", "ditindaklanjuti", "selesai"];
const IKON_TAHAP = {baru: "m-masuk", dilihat: "m-buka", ditelaah: "m-telaah", diteruskan: "m-kirim", ditindaklanjuti: "m-tangan", selesai: "m-centang", tidak_valid: "m-larang"};
/* jenis laporan (src/lapor_spek.js JENIS) -> [label pendek, ikon, id registri public/bencana.json untuk warna] */
const JENIS = {banjir: ["Banjir", "b-banjir", "banjir"], longsor: ["Longsor", "b-longsor", "longsor"], cuaca: ["Cuaca ekstrem", "b-angin", "cuaca"],
  karhutla: ["Karhutla", "b-api", "karhutla"], gempa: ["Gempa", "b-gempa", "gempa"], tsunami: ["Tsunami", "b-gelombang", "pesisir"],
  erupsi: ["Erupsi", "b-gunung", "gunungapi"], abrasi: ["Abrasi", "b-gelombang", "pesisir"], kekeringan: ["Kekeringan", "b-matahari", "kekeringan"],
  kebakaran_gedung: ["Kebakaran", "b-gedung", null], lainnya: ["Lainnya", "m-kejadian", null]};
const warnaReg = {};
fetch("/bencana.json").then(r => r.json()).then(j => { for (const b of j.bencana || []) warnaReg[b.id] = b.warna; gambar(); }).catch(() => {});
const warnaJenis = id => warnaReg[JENIS[id]?.[2]] || (id === "kebakaran_gedung" ? "var(--bad)" : "var(--brand2)");
const ikonJenis = id => JENIS[id]?.[1] || "m-kejadian";

const pil = (st, teks) => { const p = el("span", "mj-pil", teks || LABEL[st] || st); p.style.setProperty("--st", WARNA[st] || "var(--line)"); return p; };
const lokasiTeks = b => b.wilayah ? [b.wilayah.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah.kab].filter(Boolean).join(", ") : "Tanpa lokasi";
const pelaporSub = b => [b.peran, /bpbd/i.test(b.peran || "") ? b.instansi : null, b.wa ? `+${b.wa}` : null].filter(Boolean).join(", ");   // instansi hanya untuk petugas BPBD
// "19 November 2026, 16.49 WIB" -> "19 Nov 26, 16.49 WIB" (pemilik 19 Nov 2026)
const tglRingkas = t => String(t || "").replace(/(\d{1,2}) ([A-Z][a-z]{2})[a-z]* \d{2}(\d{2})/, "$1 $2 $3");
// persen lengkap sebagai lingkaran (pemilik 19 Nov 2026 "gausah progress bar, bentuknya lingkaran"), sama dengan panel isian /lapor
const cincin = p => { const c = el("span", "mj-cincin", `${p}%`); c.style.setProperty("--p", p); c.setAttribute("role", "img"); c.setAttribute("aria-label", `Lengkap ${p} persen`); return c; };
const durasi = m => m == null ? null : m < 60 ? `${m} menit` : m < 1440 ? `${Math.floor(m / 60)} jam${m % 60 ? ` ${m % 60} menit` : ""}` : `${Math.floor(m / 1440)} hari${Math.floor(m % 1440 / 60) ? ` ${Math.floor(m % 1440 / 60)} jam` : ""}`;
/* gugus (A9): laporan berjenis sama, berdekatan waktu dan tempat, dari paling sedikit dua pelapor berbeda; bukan verifikasi */
const adaKj = g => String(g?.kode || "").startsWith("KJ-");   // nomor kejadian dikonfirmasi pelapor (K66), berbeda dari gugus tebakan jarak (GL-)
const chipGugus = g => { if (adaKj(g)) { const k = el("span", "mj-gugus kuat"); k.append(ikon("m-gugus"), labelKode(g.kode)); k.title = `${labelKode(g.kode)}: ${F(g.n_laporan)} laporan dari ${F(g.n_pelapor)} warga yang mengonfirmasi kejadian yang sama.`; return k; }
  const c = el("span", `mj-gugus${g.label === "gugus kuat" ? " kuat" : ""}`); c.append(ikon("m-gugus"), `${g.label === "gugus kuat" ? "Gugus kuat" : "Gugus"}, ${F(g.n_laporan)} laporan`);
  c.title = `${labelKode(g.kode)}: ${F(g.n_laporan)} laporan dari ${F(g.n_pelapor)} pelapor berbeda, berdekatan waktu dan tempat${g.satu_desa ? ", tersambung karena desanya sama" : ""}. Bukan verifikasi.`; return c; };
const adaKorban = b => (b.dampak?.meninggal || 0) + (b.dampak?.hilang || 0) + (b.dampak?.luka || 0) > 0;

const provTutup = new Set(), gugusTutup = new Set();
const JEDA_GABUNG = 72 * 3600e3;   // HIPOTESIS (Q62): sama dengan jendela jenis tanpa aturan di src/lapor_gugus.js
let semua = [], saringStatus = null, saringJenis = new Set(), saringKab = "", cepat = new Set(), urut = {k: "waktu", arah: -1}, pilih = null, peta = null, penanda = [], popup = null, petaMini = null;
const fotoCache = new Map(), dlg = $("rinci");

/* meja BPBD (K63, D94-D98): halaman sama, isinya disaring server menurut wilayah akun lembaga. Tinjau lokal: ?sebagai=kab:31.75 atau prov:31
   (kuki khusus server lokal; ?sebagai=bnpb kembali ke tampilan BNPB). Di situs, akun dibaca dari sesi Ruang Instansi atau /masuk. */
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { const sb = new URLSearchParams(location.search).get("sebagai");
  if (sb) document.cookie = /^(kab:\d{2}\.\d{2}|prov:\d{2})$/.test(sb) ? `lapor_sebagai=${sb}; path=/; SameSite=Strict` : "lapor_sebagai=; path=/; max-age=0"; }
let akunMeja = {jenis: "bnpb", label: "BNPB"};
const akunBpbd = () => akunMeja.jenis === "bpbd";
/* belum masuk atau akun tanpa hak (pemilik 23 Nov 2026 "bagusin"): pil singkat, alasan lengkap di tabel beserta tombol masuk; bukan kalimat galat server di pil */
function belumMasuk(status, galat) {
  const masuk = status === 401 || status === 403;
  $("bSegar").classList.add("galat"); $("bSegar").title = galat || "";
  $("waktuSegar").textContent = masuk ? "Belum masuk" : "Gagal memuat, ketuk untuk ulang";
  if (!masuk) return;
  const td = el("td", "mj-kosong mj-belum-masuk"), ke = encodeURIComponent(location.pathname + location.search);
  const a = el("a", "mj-tombol", "Masuk sebagai BPBD"), s = el("a", "mj-tombol", "Masuk sebagai staf BNPB");
  a.href = "/instansi";   // BPBD: akun lembaga, pilih profil, PIN (KEPUTUSAN-PROFIL K9); kode WA tidak lagi membuka akun pemda
  s.href = "/admin/masuk?ke=" + ke;
  td.colSpan = KOLOM.length;
  td.append(el("b", null, "Masuk dulu untuk melihat laporan"), el("span", null, "Halaman ini untuk staf BNPB (Pusdalops, Koordalops) dan BPBD."), a, s);
  const tr = el("tr"); tr.append(td); $("tbody").replaceChildren(tr);
}
async function muat(latar = false) {
  try {
    const res = await fetch("/api/lapor/meja", {cache: "no-store"}), j = await res.json();
    if (!res.ok) { belumMasuk(res.status, j.galat); return; }
    if (j.akun) { akunMeja = j.akun; document.body.classList.toggle("mj-bpbd", akunBpbd());
      const sub = document.querySelector(".mj-merek small"); if (sub) sub.textContent = akunBpbd() ? `${akunMeja.label}, laporan di wilayah Anda` : "Pantau Bencana, khusus staf"; }
    semua = j.baris || [];
    $("bSegar").classList.remove("galat"); $("waktuSegar").textContent = `Data diperbarui ${new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(":", ".")}`;
    if (!latar) gambar(); gambarDarurat();   // tab di latar: hanya pita darurat, tabel digambar saat tab tampak lagi
    if (pilih && dlg.open) bukaRinci(pilih, false);
  } catch { $("bSegar").classList.add("galat"); $("waktuSegar").textContent = "Gagal memuat, ketuk untuk ulang"; }
}

/* Lapor darurat (K68): pita merah di atas meja untuk laporan darurat yang belum selesai; laporan darurat baru membunyikan nada,
   mengedipkan judul tab, dan memunculkan notifikasi peramban bila diizinkan. Yang sudah pernah terlihat disimpan di perangkat. */
const AKTIF_DARURAT = b => b.darurat && !b.darurat.terlambat && !["selesai", "tidak_valid"].includes(b.status);   // terlambat: butir luring tiba > 2 jam sesudah disimpan, laporan biasa tanpa pita (LR-09, Q3)
/* Lapor tanpa sinyal (LR-09): jam simpan di HP hanya keterangan; waktu kejadian dan waktu lapor tetap dari server */
const teksLuring = d => d.luring.simpan == null ? "Dikirim dari luring, jam HP tidak sah" : `Dikirim dari luring, disimpan di HP ${new Date(d.luring.simpan).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"})}`;
const KORBAN_DARURAT = {ya: "Ada korban atau orang terjebak", tidak: "Tidak ada korban", belum_tahu: "Korban belum diketahui"};
let daruratDikenal = null;
function bunyiDarurat() {
  try { const a = new AudioContext(), g = a.createGain(); g.connect(a.destination); g.gain.value = .15;
    for (const [i, f] of [880, 660, 880, 660].entries()) { const o = a.createOscillator(); o.frequency.value = f; o.connect(g); o.start(a.currentTime + i * .22); o.stop(a.currentTime + i * .22 + .18); } } catch {}
}
function gambarDarurat() {
  const xs = semua.filter(AKTIF_DARURAT).sort((a, b) => b.terkirim - a.terkirim), w = $("pitaDarurat");
  let kenal; try { kenal = new Set(JSON.parse(localStorage.getItem("meja-darurat") || "[]")); } catch { kenal = new Set(); }
  const baru = daruratDikenal === null && !kenal.size ? [] : xs.filter(b => !kenal.has(b.nomor));   // muat pertama di perangkat baru: tidak berbunyi untuk yang lama
  daruratDikenal = true;
  try { localStorage.setItem("meja-darurat", JSON.stringify(xs.map(b => b.nomor).concat([...kenal]).slice(0, 300))); } catch {}
  if (baru.length) {
    bunyiDarurat();
    if ("Notification" in window && Notification.permission === "granted") for (const b of baru.slice(0, 3)) new Notification(`Laporan darurat: ${b.jenis || "kejadian"}`, {body: [b.wilayah?.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah?.kab].filter(Boolean).join(", "), tag: b.nomor});
    let n = 0; const asli = document.title.replace(/^\(\d+\) Darurat, /, ""), t = setInterval(() => { document.title = ++n % 2 ? `(${xs.length}) Darurat, ${asli}` : asli; if (n > 20 || !document.hidden && n > 6) { clearInterval(t); document.title = asli; } }, 900);
  }
  w.hidden = !xs.length; if (!xs.length) return w.replaceChildren();
  /* bisa dikecilkan (pemilik 24 Nov 2026 "agar bisa diminimize"); diingat di peramban, terbuka lagi sendiri bila ada darurat baru */
  let kecil = false; try { const p = localStorage.getItem("meja-darurat-kecil"); kecil = p === null ? matchMedia("(max-width:900px)").matches : p === "1"; } catch {}   // HP: mulai ciut (masih satu baris merah)
  if (baru.length) { kecil = false; try { localStorage.removeItem("meja-darurat-kecil"); } catch {} }
  w.classList.toggle("kecil", kecil);
  /* tampilan (pemilik 24 Nov 2026 "bagusin"): kepala = satu tombol buka/ciut (sirene berdenyut, jumlah, label aksi); kartu = ikon jenis, lokasi, pil korban/waktu/status */
  const kepala = el("div", "mj-darurat-kepala"), lipat = el("button", "mj-darurat-buka"); lipat.type = "button";
  lipat.setAttribute("aria-expanded", String(!kecil)); lipat.setAttribute("aria-controls", "daftarDarurat");
  const sirene = el("span", "mj-darurat-sirene"); sirene.append(ikon("m-sirene"));
  const judul = el("span", "mj-darurat-judul"); judul.append(el("b", null, `${xs.length} laporan darurat`), el("small", null, "belum selesai"));
  const aksi = el("span", "mj-darurat-aksi"); aksi.append(kecil ? "Lihat" : "Ciutkan", ikon("m-bawah"));
  lipat.append(sirene, judul, aksi);
  lipat.addEventListener("click", () => { try { localStorage.setItem("meja-darurat-kecil", kecil ? "0" : "1"); } catch {} gambarDarurat(); });
  kepala.append(lipat);
  /* izin notifikasi = ikon lonceng polos sebaris kepala (pemilik 25 Nov 2026 "ini juga jelek": tombol pil merah sebaris sendiri) */
  if ("Notification" in window && Notification.permission === "default") { const izin = el("button", "mj-darurat-izin"); izin.type = "button"; izin.append(ikon("m-lonceng")); izin.dataset.tip = "Nyalakan notifikasi laporan darurat"; izin.setAttribute("aria-label", "Nyalakan notifikasi laporan darurat"); izin.addEventListener("click", () => Notification.requestPermission().then(() => gambarDarurat())); kepala.append(izin); }
  const daftar = el("div", "mj-darurat-daftar"); daftar.id = "daftarDarurat";
  const PIL_KORBAN = {ya: ["bahaya", "Ada korban atau terjebak"], tidak: ["netral", "Tanpa korban"], belum_tahu: ["waspada", "Korban belum diketahui"]};
  for (const b of xs.slice(0, 8)) { const k = el("button", `mj-darurat-kartu${baru.includes(b) ? " baru" : ""}`); k.type = "button"; k.setAttribute("aria-label", `Buka ${b.nomor}, ${b.jenis || "kejadian"}`);
    const ik = el("span", "mj-darurat-jenis"); ik.style.setProperty("--jn", warnaJenis(b.jenisId)); ik.append(ikon(ikonJenis(b.jenisId)));
    const isi = el("span", "mj-darurat-isi"), w0 = b.wilayah || {};
    const [kls, teks] = PIL_KORBAN[b.darurat.korban] || ["waspada", "Korban belum diisi"];
    const pil = el("span", "mj-darurat-pil"), pk = el("i", kls, teks), pw = el("i", "netral"), ps = el("i", "status");
    pw.append(ikon("m-log"), `${durasi(Math.round((Date.now() - b.terkirim) / 60000))} lalu`); ps.style.setProperty("--st", WARNA[b.status] || "var(--ink2)"); ps.append(b.statusLabel);
    pil.append(pk, pw, ps);
    if (b.darurat.luring) { const pl = el("i", "netral", "Dari luring"); pl.title = teksLuring(b.darurat); pil.append(pl); }
    isi.append(el("b", null, b.jenis || "Kejadian"), el("span", null, [w0.desa, w0.kec && `Kec. ${w0.kec}`, w0.kab].filter(Boolean).join(", ") || "Lokasi belum terbaca"), pil);
    const ke = el("span", "mj-darurat-ke"); ke.append(ikon("m-bawah"));
    k.append(ik, isi, ke); k.addEventListener("click", () => bukaRinci(b.nomor)); daftar.append(k); }
  w.replaceChildren(kepala, daftar);
}

/* saringan bertingkat: dasar (periode, cari, kab/kota, cepat) -> + status -> + jenis. Jumlah di tiap kontrol dihitung tanpa saringannya sendiri. */
const dasar = () => {
  const q = $("qCari").value.trim().toLowerCase(), hari = periode0(), batas = typeof hari === "number" && hari ? Date.now() - hari * 864e5 : 0;
  return semua.filter(b => (!batas || b.terkirim >= batas) && (!rentang || (wibIso(b.terkirim) >= rentang[0] && wibIso(b.terkirim) <= rentang[1])) && (!saringKab || b.wilayah?.kab === saringKab) && (!cepat.has("korban") || adaKorban(b)) && (!cepat.has("gugus") || b.gugus) && (!cepat.has("foto") || b.foto > 0) &&
    (!q || [b.nomor, b.nama, b.wa, b.wilayah?.kab, b.wilayah?.desa, b.wilayah?.prov, b.jenis, b.subjenis].filter(Boolean).join(" ").toLowerCase().includes(q)));
};
const cocokStatus = b => !saringStatus || saringStatus.includes(b.status), cocokJenis = b => !saringJenis.size || saringJenis.has(b.jenisId);

function gambar() {
  const d0 = dasar(), dSt = d0.filter(cocokStatus), dJn = d0.filter(cocokJenis), d = dSt.filter(cocokJenis);
  gambarAngka(dJn); gambarJenis(dSt); gambarCepat(d); gambarPilihan(); gambarNav(dJn);
  nanti(() => { try { gambarPeta(d); } catch (e) { $("peta").replaceChildren(el("p", "mj-kosong", "Peta tidak bisa ditampilkan di perangkat ini. Daftar laporan tetap tersedia.")); }   // tanpa WebGL peta melempar galat; daftar dan tabel jangan ikut mati
    gambarRingkas(d); gambarLegenda(d); gambarTabel(d); });
}

/* ---------- dua tampilan terpisah: Peta laporan dan Daftar laporan (pemilik 19 Nov 2026 "di halaman lain, jangan satu halaman sama peta"); alamat #peta / #daftar ---------- */
let tampil = location.hash === "#daftar" ? "daftar" : "peta";
function pindahTampil(v) {
  tampil = v; $("isi").dataset.tampil = v; letakSaring(); if (location.hash !== `#${v}`) history.replaceState(null, "", `#${v}`);
  if (v === "peta" && peta) requestAnimationFrame(() => { peta.resize(); if (!peta._sudahPas) gambarPeta(tersaringSekarang()); });
  gambar();
}
// baris saring mengambang di dalam peta (pemilik 19 Nov 2026 "ini agar di dalam peta"); di Daftar pindah ke atas tabel. Satu elemen, tidak disalin.
function letakSaring() { const sr = $("saring"); if (tampil === "peta") document.querySelector(".mj-peta-atas").prepend(sr); else $("kepalaDaftar").after(sr); }
$("isi").dataset.tampil = tampil; letakSaring();
/* tombol tema: simpan di "pk-tema" (kunci bersama /prediksi), dibaca anti kedip oleh /halaman_awal.js di <head> */
$("bTema")?.addEventListener("click", () => {
  const akar = document.documentElement, gelap = akar.dataset.theme ? akar.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches, t = gelap ? "light" : "dark";
  akar.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {}
});
/* laci menu di layar sempit (QA 24 Nov 2026): menu samping yang sama dibuka sebagai laci; tutup lewat latar, Escape, atau memilih menu */
{ const bm = $("bMenu"), latar = $("laciLatar"), laci = $("menuSamping");
  const atur = buka => { document.body.classList.toggle("mj-laci-buka", buka); latar.hidden = !buka; bm.setAttribute("aria-expanded", String(buka)); bm.setAttribute("aria-label", buka ? "Tutup menu" : "Buka menu");
    if (buka) laci.querySelector("button, a")?.focus(); };
  bm.addEventListener("click", () => atur(!document.body.classList.contains("mj-laci-buka")));
  latar.addEventListener("click", () => atur(false));
  addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("mj-laci-buka")) { atur(false); bm.focus(); } });
  $("nav").addEventListener("click", e => { if (e.target.closest(".mj-nav-b") && matchMedia("(max-width:900px)").matches) atur(false); }); }
/* tinggi kotak saring di atas peta -> --tinggi-saring (HP): Ringkasan duduk sebaris tombol peta tepat di bawah saring, tidak melayang di tengah (pemilik 24 Nov 2026 "floating gajelas") */
{ const sr = $("saring"), wadah = $("bagPeta");
  if (sr && wadah && "ResizeObserver" in window) new ResizeObserver(() => { if (sr.closest("#bagPeta")) wadah.style.setProperty("--tinggi-saring", `${Math.round(sr.getBoundingClientRect().height)}px`); }).observe(sr); }
/* HP: pilihan saring mulai ciut (cari tetap tampil); ketuk "Filter" untuk membuka */
{ const sr = $("saring"), b = $("bSaringLipat"), atur = buka => { sr.classList.toggle("ciut", !buka); b.setAttribute("aria-expanded", String(buka)); b.setAttribute("aria-label", buka ? "Ciutkan pilihan filter" : "Tampilkan pilihan filter"); };
  const hp = matchMedia("(max-width:900px)");
  atur(!hp.matches); b.addEventListener("click", () => atur(sr.classList.contains("ciut")));
  /* HP: Filter, Ringkasan, legenda bawaannya ciut, juga saat layar BERUBAH jadi sempit (pemilik 24 Nov 2026 "kalau di hp ini defaultnya minimize aja");
     kembali lebar = dibuka lagi. Pilihan pengguna di layar yang sama tidak diganggu (hanya saat ambang 900 px dilewati). */
  hp.addEventListener("change", e => { atur(!e.matches); const det = document.querySelector("#ringkas details"); if (det) det.open = !e.matches;
    legendaBuka = !e.matches; gambar(); gambarDarurat(); }); }   // darurat ikut ciut di HP bila pengguna belum memilih sendiri
window.pasangTip?.();   // tooltip [data-tip] sekali per halaman
addEventListener("hashchange", () => pindahTampil(location.hash === "#daftar" ? "daftar" : "peta"));

/* ---------- menu samping: tampilan, antrean kerja (= saring status), pintu lain ---------- */
const ANTREAN = [["Semua laporan", null, "m-daftar"], ["Baru, belum dibuka", ["baru"], "m-masuk"], ["Dilihat", ["dilihat"], "m-buka"], ["Ditelaah", ["ditelaah"], "m-telaah"],
  ["Diteruskan", ["diteruskan"], "m-kirim"], ["Ditindaklanjuti", ["ditindaklanjuti"], "m-tangan"], ["Selesai", ["selesai"], "m-centang"], ["Tidak valid", ["tidak_valid"], "m-larang"]];
function gambarNav(daftar) {
  const grup = t => el("p", "mj-nav-grup", t);
  const item = (ik, t, aksi, {n, aktif, st, href} = {}) => { const b = el(href ? "a" : "button", "mj-nav-b"); if (href) b.href = href; else { b.type = "button"; b.addEventListener("click", aksi); }
    if (aktif != null) b.setAttribute("aria-current", String(aktif)); if (st) b.style.setProperty("--st", st);
    b.append(ikon(ik), el("span", null, t), ...(n != null ? [el("b", null, F(n))] : [])); return b; };
  const ke = v => () => pindahTampil(v);
  $("nav").replaceChildren(
    grup("Tampilan"), item("m-lokasi", "Peta laporan", ke("peta"), {aktif: tampil === "peta"}), item("m-daftar", "Daftar laporan", ke("daftar"), {aktif: tampil === "daftar", n: daftar.filter(cocokJenis).filter(cocokStatus).length}),
    grup("Antrean kerja"), ...ANTREAN.map(([t, st, ik]) => item(ik, t, () => { saringStatus = st; gambar(); },
      {n: st ? daftar.filter(b => st.includes(b.status)).length : daftar.length, aktif: String(saringStatus) === String(st), st: st ? WARNA[st[0]] : null})),
    grup("Pintu lain"), item("m-orang", "Orang dicari", () => { bukaOrangDicari(); }), item("m-tiket", "Data lanjutan BPBD", () => { bukaDaftarData(new Map(semua.map(b => [b.nomor, b.wilayah?.kab]))); }), item("m-pesan", "Form lapor warga", null, {href: "/lapor/"}), item("m-daftar", "Poster QR desa", null, {href: "/lapor/poster.html"}),   // K92, LA-84
    // Pantau Dalops halaman internal BNPB: tidak untuk akun BPBD (pemilik 20 Nov 2026 "ya sembunyikan")
    ...(akunBpbd() ? [] : [item("m-ringkas", "Pantau Dalops", null, {href: "/bnpb/dalops"})]));
}

/* ---------- kepala: kotak angka = saring status ---------- */
const IKON_KOTAK = ["m-daftar", "m-masuk", "m-telaah", "m-kirim", "m-centang"];
const KOTAK = [["Semua laporan", null, "var(--head-bg)"], ["Baru, belum dibuka", ["baru"], WARNA.baru], ["Sedang ditelaah", ["dilihat", "ditelaah"], WARNA.ditelaah],
  ["Diteruskan, ditindaklanjuti", ["diteruskan", "ditindaklanjuti"], WARNA.ditindaklanjuti], ["Selesai", ["selesai"], WARNA.selesai]];
/* baris panel (Ringkasan dan Status tiket): ikon berwarna, label, angka besar rata kanan, batang tipis bila ada pembanding */
const barisPanel = (ik, warna, label, nilai, {maks, el: tag = "div"} = {}) => {
  const r = el(tag, "mj-pb"), i = el("span", "mj-pb-ik"); i.style.setProperty("--w", warna); i.append(ikon(ik));
  r.append(i, el("span", "mj-pb-t", label), el("b", typeof nilai === "number" ? "mj-pb-n" : "mj-pb-n teks", typeof nilai === "number" ? F(nilai) : nilai));
  if (maks != null && tag === "bar") { const t = el("span", "mj-pb-bar"), u = el("i"); u.style.width = `${Math.round((typeof nilai === "number" ? nilai : 0) / Math.max(1, maks) * 100)}%`; u.style.setProperty("--w", warna); t.append(u); r.append(t); }
  return r;
};
function gambarAngka(daftar) {
  if (!$("angka")) return;   // panel Status tiket dihapus (pemilik 19 Nov 2026 "hilangkan"); status lewat Antrean kerja di menu samping
  // satu batang bertumpuk sebaran status di atas daftar (tinggi baris seragam, tanpa batang per baris)
  const tumpuk = el("div", "mj-tumpuk"); tumpuk.setAttribute("aria-hidden", "true");
  for (const [, st, w] of KOTAK.slice(1)) { const n = daftar.filter(x => st.includes(x.status)).length; if (!n) continue; const i = el("i"); i.style.flexGrow = n; i.style.setProperty("--w", w); tumpuk.append(i); }
  $("angka").replaceChildren(tumpuk, ...KOTAK.map(([t, st, w], k) => {
    const n = st ? daftar.filter(x => st.includes(x.status)).length : daftar.length, b = barisPanel(IKON_KOTAK[k], w, t, n, {maks: st ? daftar.length : null, el: "button"});
    b.type = "button"; b.setAttribute("aria-pressed", String(String(saringStatus) === String(st)));
    b.addEventListener("click", () => { saringStatus = String(saringStatus) === String(st) ? null : st; gambar(); });
    return b;
  }));
}

/* ---------- di atas peta: saring jenis (pilih banyak), saring cepat, periode ---------- */
/* pil jenis berangka (pilih banyak); jenis tanpa laporan tampil ikon saja supaya baris muat */
function gambarJenis(daftar) {
  const n = id => daftar.filter(b => b.jenisId === id).length, tb = (id, t, ik, k) => {
    const b = el("button"); b.type = "button"; if (id) b.style.setProperty("--jn", warnaJenis(id));
    b.setAttribute("aria-pressed", String(id ? saringJenis.has(id) : !saringJenis.size)); b.setAttribute("aria-label", `${t}, ${F(k)} laporan`); b.dataset.tip = `<b>${t}</b><br>${F(k)} laporan`;   // tooltip langsung (/inti/tip.js), bukan title yang tertunda
    /* bukan disabled: tombol disabled tidak menerima hover, tooltip jadi tidak muncul */
    const mati = !!id && !k && !saringJenis.has(id); if (mati) b.setAttribute("aria-disabled", "true");
    b.append(ikon(ik), ...(k || !id || saringJenis.has(id) ? [el("span", null, t), el("b", null, F(k))] : []));
    b.addEventListener("click", () => { if (mati) return; if (!id) saringJenis.clear(); else saringJenis.has(id) ? saringJenis.delete(id) : saringJenis.add(id); gambar(); }); return b; };
  $("pilihJenis").replaceChildren(tb(null, "Semua", "m-semua", daftar.length), ...Object.entries(JENIS).map(([id, [t, ik]]) => tb(id, t, ik, n(id))));
}
/* deretan geser samping (pemilik 24 Nov 2026 "orang biasa gaakan tau ada tombol lagi"): pola pasangGeser /lapor (public/lapor/lapor.js).
   Panah kiri/kanan muncul hanya bila masih ada isi ke arah itu, tanpa pinggir memudar; roda mouse menggeser ke samping.
   Panah jadi saudara deretan (deretan diisi ulang dengan replaceChildren). Menempel otomatis pada deretan baru (pop-up rincian, tabel). */
const GESER = "#pilihJenis, #saringCepat, #legenda, .mj-tabel-gulung";
function pasangGeser(d) {
  if (!d || d.dataset.geser) return; d.dataset.geser = "1";
  const induk = d.parentElement; if (getComputedStyle(induk).position === "static") induk.style.position = "relative";
  const buat = (arah, label) => { const b = el("button", `mj-geser-panah mj-geser-${arah}`); b.type = "button"; b.hidden = true; b.setAttribute("aria-label", label); b.dataset.tip = "<b>Masih ada lagi</b><br>klik untuk menggeser"; b.append(ikon("m-panah"));
    b.addEventListener("click", () => { const tuju = Math.max(0, Math.min(d.scrollWidth - d.clientWidth, d.scrollLeft + (arah === "kiri" ? -1 : 1) * Math.max(120, d.clientWidth * .7)));
      d.scrollTo({left: tuju, behavior: "smooth"}); setTimeout(() => { if (Math.abs(d.scrollLeft - tuju) > 2) d.scrollLeft = tuju; }, 450); });
    d.after(b); return b; };
  const kiri = buat("kiri", "Geser ke kiri"), kanan = buat("kanan", "Geser ke kanan"); let antre = 0;
  const atur = () => { antre = 0; const sisaKiri = d.scrollLeft > 2, sisaKanan = d.scrollLeft + d.clientWidth < d.scrollWidth - 2, tampak = d.offsetParent !== null;
    kiri.hidden = !(tampak && sisaKiri); kanan.hidden = !(tampak && sisaKanan); if (!tampak) return;
    const t = d.offsetTop + Math.min(d.offsetHeight / 2, 60); kiri.style.top = kanan.style.top = `${t}px`;
    kiri.style.left = `${d.offsetLeft + 4}px`; kanan.style.left = `${d.offsetLeft + d.offsetWidth - 4}px`; };
  const jadwal = () => { if (!antre) antre = requestAnimationFrame(atur); };
  d.addEventListener("scroll", jadwal, {passive: true});
  d.addEventListener("wheel", e => { if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; const maks = d.scrollWidth - d.clientWidth;
    if (maks <= 2 || (e.deltaY < 0 && d.scrollLeft <= 0) || (e.deltaY > 0 && d.scrollLeft >= maks - 1)) return; e.preventDefault(); d.scrollLeft += e.deltaY; }, {passive: false});
  new ResizeObserver(jadwal).observe(d); new MutationObserver(jadwal).observe(d, {childList: true, subtree: true}); addEventListener("resize", jadwal); jadwal();
}
{ let antre = 0; const sapu = () => { antre = 0; document.querySelectorAll(GESER).forEach(pasangGeser); };
  new MutationObserver(() => { if (!antre) antre = requestAnimationFrame(sapu); }).observe(document.body, {childList: true, subtree: true}); sapu(); }
const CEPAT = [["korban", "m-korban", "Ada korban"], ["foto", "m-foto", "Ada foto"], ["gugus", "m-gugus", "Bergugus"]];
/* waktu: tombol, semua pilihan tampil (pemilik 19 Nov 2026 "tampilin aja semua pilihan ini") */
let periode = 0, rentang = null;   // rentang = ["YYYY-MM-DD", "YYYY-MM-DD"] tanggal WIB dari kalender; menggantikan periode saat terisi
const PERIODE = [[1, "24 jam"], [7, "7 hari"], [30, "30 hari"], [0, "Semua waktu"]];
const periode0 = () => rentang ? null : periode;
const wibIso = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const BLN_P = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], tglP = iso => +iso.slice(8) + " " + BLN_P[+iso.slice(5, 7) - 1];
const labelRentang = ([a, z]) => a === z ? tglP(a) : a.slice(0, 7) === z.slice(0, 7) ? `${+a.slice(8)}–${tglP(z)}` : `${tglP(a)} – ${tglP(z)}`;
/* pilih tanggal (pemilik 24 Nov 2026 "date picker yang bagus"): kalender inti mode rentang; angka per hari = laporan sesuai saringan lain kecuali waktu */
function bukaKalender(tombol) {
  if (!window.Kalender) return;
  const simpan = rentang; rentang = null; const pr = periode; periode = 0; const dasarTanpaWaktu = dasar(); rentang = simpan; periode = pr;
  Kalender.buka({tombol, rentang: true, hariIni: wibIso(Date.now()), terpilih: rentang || undefined, judul: "Pilih rentang tanggal", satuan: "laporan",
    awal: dasarTanpaWaktu.length ? wibIso(Math.min(...dasarTanpaWaktu.map(b => b.terkirim))) : undefined, bisa: () => true,
    muat: async () => { const jumlah = {}; for (const b of dasarTanpaWaktu) { const t = wibIso(b.terkirim); jumlah[t] = (jumlah[t] || 0) + 1; } return {jumlah}; },
    terbanyak: {judul: "Hari dengan laporan terbanyak", n: 5},
    pilih: (a, z) => { rentang = [a, z]; periode = 0; gambar(); }});
}
/* waktu = satu tombol dropdown (pemilik 24 Nov 2026 "bikin dropdown aja biar hemat space"): label = pilihan aktif; menu berisi periode cepat dan Pilih tanggal (kalender inti) */
let waktuBuka = false;
function tutupWaktu() { if (waktuBuka) { waktuBuka = false; gambarPilihan(); } }
function gambarPilihan() {
  const label = rentang ? labelRentang(rentang) : PERIODE.find(([v]) => v === periode)?.[1] || "Semua waktu";
  const tb = el("button", `mj-waktu-b${periode || rentang ? " aktif" : ""}`); tb.type = "button"; tb.id = "bWaktu";
  tb.setAttribute("aria-haspopup", "menu"); tb.setAttribute("aria-expanded", String(waktuBuka)); tb.setAttribute("aria-label", `Periode laporan: ${label}`);
  tb.append(ikon("m-kalender"), el("span", null, label), ikon("m-bawah"));
  tb.addEventListener("click", () => { waktuBuka = !waktuBuka; gambarPilihan(); if (waktuBuka) $("menuWaktu").querySelector("[aria-checked=true], button")?.focus(); });
  const menu = el("div", "mj-waktu-menu"); menu.id = "menuWaktu"; menu.setAttribute("role", "menu"); menu.hidden = !waktuBuka;
  const item = (teks, pilih, aktif, ik) => { const m = el("button", "mj-waktu-i"); m.type = "button"; m.setAttribute("role", "menuitemradio"); m.setAttribute("aria-checked", String(aktif));
    m.append(...(ik ? [ikon(ik)] : [el("i")]), el("span", null, teks)); if (aktif) m.append(ikon("m-centang")); m.addEventListener("click", pilih); return m; };
  menu.append(...PERIODE.map(([v, t]) => item(t, () => { periode = v; rentang = null; waktuBuka = false; gambar(); $("bWaktu")?.focus(); }, !rentang && periode === v)),
    el("hr"), item(rentang ? `Rentang ${labelRentang(rentang)}` : "Pilih tanggal...", () => { waktuBuka = false; gambarPilihan(); bukaKalender($("bWaktu")); }, !!rentang, "m-kalender"));
  $("saringWaktu").replaceChildren(tb, menu);
  $("bUlang").disabled = !(saringJenis.size || saringStatus || saringKab || cepat.size || $("qCari").value || periode || rentang);
  const nAktif = saringJenis.size + cepat.size + (periode || rentang ? 1 : 0); $("nSaringAktif").hidden = !nAktif; $("nSaringAktif").textContent = nAktif;
}
document.addEventListener("click", e => { if (waktuBuka && !e.composedPath().some(n => n.id === "saringWaktu")) tutupWaktu(); });   // jalur asli: tombol digambar ulang saat diklik, target sudah lepas dari halaman
document.addEventListener("keydown", e => { if (e.key === "Escape" && waktuBuka) { tutupWaktu(); $("bWaktu")?.focus(); } });
function gambarCepat(daftar) {   // chip berangka ala dalops; angka = laporan tersaring yang cocok
  const uji = {korban: adaKorban, foto: b => b.foto > 0, gugus: b => !!b.gugus};
  $("saringCepat").replaceChildren(...CEPAT.map(([k, ik, t]) => { const b = el("button"), n = daftar.filter(uji[k]).length; b.type = "button"; b.setAttribute("aria-pressed", String(cepat.has(k)));
    b.dataset.tip = `<b>${t}</b><br>${F(n)} laporan`; b.setAttribute("aria-label", `${t}, ${F(n)} laporan`);   // nama tetap terbaca saat label disembunyikan di layar sedang
    b.append(ikon(ik), el("span", null, t), el("b", null, F(n)));
    b.addEventListener("click", () => { cepat.has(k) ? cepat.delete(k) : cepat.add(k); gambar(); }); return b; }));
}

/* ---------- peta ---------- */
function gambarPeta(daftar) {
  if (!peta) {
    if (!window.maplibregl) { $("peta").replaceChildren(el("p", "mj-kosong", "Peta tidak termuat.")); return; }
    peta = new maplibregl.Map({container: "peta", style: "https://tiles.openfreemap.org/styles/positron", center: [117, -2.5], zoom: 4.2, minZoom: 3, maxZoom: 17,
      dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.once("load", () => { peta.resize(); gambarPeta(tersaringSekarang()); });
    new ResizeObserver(() => peta.resize()).observe($("peta"));
    return;
  }
  // ponytail: penanda DOM, cukup sampai ratusan titik; ganti ke lapisan GeoJSON berkluster bila laporan aktif menembus ~500
  for (const m of penanda) m.remove(); penanda = [];
  const ada = daftar.filter(b => b.lat != null);
  for (const b of ada) {
    const n = el("button", `mj-titik${b.nomor === pilih ? " pilih" : ""}`); n.type = "button";
    n.style.setProperty("--jn", warnaJenis(b.jenisId)); n.style.setProperty("--st", WARNA[b.status]); n.append(ikon(ikonJenis(b.jenisId)), el("i"));
    n.setAttribute("aria-label", `${b.nomor}, ${b.jenis || "laporan"}, ${LABEL[b.status]}`);
    n.addEventListener("click", e => { e.stopPropagation(); bukaPopup(b); });
    penanda.push(new maplibregl.Marker({element: bungkusPenanda(n)}).setLngLat([b.lon, b.lat]).addTo(peta));
  }
  if (ada.length && !peta._sudahPas && $("peta").clientWidth) {   // peta tersembunyi (tampilan Daftar): pas nanti saat dibuka
    peta._sudahPas = true; pasPeta(ada, 0); }
}
const bungkusPenanda = n => { const w = el("div"); w.append(n); return w; };   // lihat meja.css: gaya hanya pada anak
const tersaringSekarang = () => dasar().filter(cocokStatus).filter(cocokJenis);
function pasPeta(ada = tersaringSekarang().filter(b => b.lat != null), durasi = 600) {
  if (!peta || !ada.length) return;
  const bb = new maplibregl.LngLatBounds(); for (const b of ada) bb.extend([b.lon, b.lat]);
  // ruang untuk panel: ringkasan kiri, status kanan, deret jenis atas, legenda bawah (panel yang tersembunyi di layar sempit tidak dihitung)
  const w = document.querySelector(".mj-kiri-peta")?.offsetWidth ? document.querySelector(".mj-kiri-peta").offsetWidth + 24 : 40;
  /* layar sempit (QA 24 Nov 2026): Ringkasan ada di bawah baris saring, bukan di samping; padding samping ala desktop menyisakan ~40 px dan peta terlempar ke Pasifik */
  const hp = matchMedia("(max-width:900px)").matches, atas = document.querySelector(".mj-peta-atas")?.offsetHeight || 64;
  const tinggi = peta.getContainer().clientHeight, dr = $("pitaDarurat"), bawah = 70 + (hp && dr && !dr.hidden ? dr.offsetHeight + 12 : 0);   // panel darurat menutup bagian bawah peta di HP
  const pad = hp ? {top: Math.min(atas + 70, tinggi * .4), bottom: Math.min(bawah, tinggi * .4), left: 24, right: 24} : {top: 100, bottom: 100, left: 60, right: w};
  peta.fitBounds(bb, {padding: pad, maxZoom: 11, duration: durasi});
}
/* pop-up titik (pemilik 19 Nov 2026 "bagusin lagi"): foto lebar dengan nomor tiket di atasnya, dampak berlabel (angka tanpa label tidak terbaca),
   aksi: Buka rincian selebar kartu, Arah dan Bagikan sejajar di bawahnya */
/* dampak berikon dalam dua kelompok selebar kartu (pemilik 20 Nov 2026 "kasih icon"); kolom = jumlah sel, jadi baris selalu rata */
const SEL_POP = [["Korban dan pengungsi", [["meninggal", "meninggal", "m-meninggal"], ["hilang", "hilang", "m-hilang"], ["luka", "luka-luka", "m-luka"], ["mengungsi", "mengungsi", "m-tenda"]]],
  ["Kerusakan", [["rumah", "rumah rusak", "m-rumah"], ["fasilitas", "fasilitas rusak", "m-fasilitas"], ["jalan", "jalan, jembatan", "m-jalan"]]]];
function bukaPopup(b) {
  popup?.remove();
  const w = el("div", "mj-pop"), kep = el("div", "mj-pop-kepala"); kep.style.setProperty("--jn", warnaJenis(b.jenisId));
  const ik = el("span", "mj-pop-ik"); ik.append(ikon(ikonJenis(b.jenisId)));
  const t = el("div"); t.append(el("b", null, b.jenis || "Laporan"), ...(b.subjenis ? [el("small", null, b.subjenis)] : [])); kep.append(ik, t, pil(b.status));
  const foto = el("div", `mj-pop-foto${b.foto ? "" : " kosong"}`), tanda = el("span", "mj-pop-tiket"); tanda.append(ikon("m-tiket"), b.nomor); foto.append(tanda);
  if (b.foto) fotoLaporan(b.nomor).then(fs => { if (!fs[0]) return; const im = el("img"); im.src = fs[0].sampul || fs[0].url; im.alt = "Foto laporan"; foto.prepend(im);
    const nv = fs.filter(f => f.jenis === "video").length, nf = fs.length - nv;
    if (fs.length > 1 || nv) foto.append(el("small", null, [nf && `${nf} foto`, nv && `${nv} video`].filter(Boolean).join(", "))); });
  const baris = (ikk, teks) => { const r = el("div", "mj-pop-baris"); r.append(ikon(ikk), el("span", null, teks)); return r; };
  const isi = el("div", "mj-pop-isi");
  isi.append(baris("m-lokasi", [b.wilayah?.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah?.kab?.replace(/^Kota Administrasi /, "Kota ")].filter(Boolean).join(", ") || "Tanpa lokasi"),
    baris("m-log", b.waktuLapor), baris("m-orang", [b.nama || "Tanpa nama", b.peran].filter(Boolean).join(", ")));
  const d = b.dampak || {}, dp = el("div", "mj-pop-dampak");
  for (const [judul, sel] of SEL_POP) {
    const ada = sel.filter(([k]) => d[k] != null); if (!ada.length) continue;
    const g = el("div", "mj-pop-grup"); g.style.setProperty("--n", ada.length);
    for (const [k, lb, ik] of ada) { const c = el("div", `mj-pop-sel ${k}${d[k] > 0 ? " isi" : ""}`), a = el("span", "mj-pop-angka"); a.append(ikon(ik), el("b", null, F(d[k]))); c.append(a, el("small", null, lb)); g.append(c); }
    dp.append(el("p", "mj-pop-judul", judul), g);
  }
  if (!dp.childElementCount) dp.append(el("p", "mj-pop-kosong", "Dampak belum didata"));
  isi.append(dp);
  const buka = el("button", "mj-pop-buka"); buka.type = "button"; buka.append(el("span", null, "Buka rincian"), ikon("m-panah")); buka.addEventListener("click", () => { popup?.remove(); bukaRinci(b.nomor); });
  // Arah: Google Maps menuntun ke titik; Bagikan: ringkasan tanpa nomor WA pelapor (D12), lewat lembar bagikan perangkat atau salin
  const arah = Object.assign(el("a", "mj-pop-kecil"), {href: `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`, target: "_blank", rel: "noopener"});
  arah.append(ikon("m-arah"), el("span", null, "Arah")); arah.title = "Petunjuk arah ke lokasi di Google Maps";
  const bagi = el("button", "mj-pop-kecil"); bagi.type = "button"; bagi.append(ikon("m-bagi"), el("span", null, "Bagikan")); bagi.title = "Bagikan ringkasan laporan";
  bagi.addEventListener("click", () => bagikan(b, bagi));
  const kaki = el("div", "mj-pop-kaki"); kaki.append(buka, arah, bagi);
  const tp = el("div", "mj-pop-tempat"); if (b.tempat) isi.append(tp);
  w.append(kep, foto, isi, kaki);
  popup = new maplibregl.Popup({offset: 22, maxWidth: "330px", className: "mj-popup", closeButton: false}).setLngLat([b.lon, b.lat]).setDOMContent(w).addTo(peta);
  const ini = popup; ini.on("close", () => { if (tandaUntuk === ini) hapusTanda(); });
  tandaiTempat(b, tp, ini);
}
/* sekolah, faskes, tempat ibadah, jalan rusak, dan titik pengungsian yang disebut pelapor ditandai di peta saat pop-up dibuka
   (pemilik 21 Nov 2026: "langsung ditandai ya disini"). Titik dicari dari data OSM per provinsi (public/data/osm_nasional) dalam 5 km dari laporan;
   jalan dari OpenStreetMap daring (hanya koordinat laporan dan nama jalan yang dikirim). Nama yang tidak ketemu tetap ditulis di pop-up. */
const JSON_OSM = new Map();
const muatJson = u => { if (!JSON_OSM.has(u)) JSON_OSM.set(u, fetch(u).then(r => r.ok ? r.json() : null).catch(() => null)); return JSON_OSM.get(u); };
const TANDA = {sekolah: ["Sekolah rusak", "m-fasilitas", "--bad"], faskes: ["Fasilitas kesehatan rusak", "m-fasilitas", "--bad"], ibadah: ["Tempat ibadah rusak", "m-fasilitas", "--bad"],
  jalan: ["Jalan rusak", "m-jalan", "--bad"], pengungsian: ["Titik pengungsian", "m-tenda", "--warn"]};
let tandaTempat = [], tandaUntuk = null;
function hapusTanda() { for (const m of tandaTempat) m.remove(); tandaTempat = []; tandaUntuk = null;
  if (peta?.getLayer("mj-jalan")) peta.removeLayer("mj-jalan"); if (peta?.getSource("mj-jalan")) peta.removeSource("mj-jalan"); }
const normNama = t => String(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371; };
async function tandaiTempat(b, wadah, ini) {
  hapusTanda(); tandaUntuk = ini;
  if (!b.tempat || b.lat == null || !peta) return;
  const prov = b.wilayah?.provKode;
  const [osm, ib] = await Promise.all([prov ? muatJson(`/data/osm_nasional/${prov}.json`) : null, prov ? muatJson(`/data/osm_nasional/ibadah/${prov}.json`) : null]);
  if (tandaUntuk !== ini) return;
  const titik = []; for (const v of Object.values(osm || {})) if (Array.isArray(v)) for (const x of v) if (x?.[2]) titik.push(x);
  for (const x of ib || []) if (x?.[2]) titik.push(x);
  const cari = nama => { const n = normNama(nama); let hasil = null, dekat = 5;
    for (const [la, lo, nm] of titik) { const m = normNama(nm); if (m !== n && !(n.length >= 6 && m.includes(n)) && !(m.length >= 6 && n.includes(m))) continue;
      const d = jarakKm(b.lat, b.lon, la, lo); if (d <= dekat) { hasil = [la, lo]; dekat = d; } }
    return hasil; };
  const warna = k => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(k).trim() || "red";   // token oklch -> rgb untuk MapLibre
    c.fillRect(0, 0, 1, 1); const [r, g, bl] = c.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${bl})`; };
  const ringkas = [];
  for (const [jenis, daftar] of Object.entries(b.tempat)) {
    const [lb, ik, tk] = TANDA[jenis] || TANDA.sekolah, ada = [];
    if (jenis !== "jalan") for (const nama of daftar) { const t = cari(nama); if (!t) continue; ada.push(nama);
      const n = el("span", "mj-tanda"); n.style.setProperty("--tw", `var(${tk})`); n.append(ikon(ik), el("b", null, nama)); n.title = `${lb}: ${nama}`;
      tandaTempat.push(new maplibregl.Marker({element: bungkusPenanda(n), anchor: "left", offset: [-14, 0]}).setLngLat([t[1], t[0]]).addTo(peta)); }
    ringkas.push({jenis, lb, ik, tk, daftar, ada});
  }
  const tulis = () => wadah.replaceChildren(el("p", "mj-pop-judul", "Ditandai di peta"), ...ringkas.map(r => { const g = el("div", "mj-pop-tempat-baris"); g.style.setProperty("--tw", `var(${r.tk})`);
    const t = el("span"); t.append(el("b", null, `${r.lb}: `), ...r.daftar.flatMap((n, i) => [i ? ", " : "", r.ada.includes(n) ? n : el("em", null, `${n} (belum ketemu di peta)`)]));
    g.append(ikon(r.ik), t); return g; }));
  tulis();
  const jalan = b.tempat.jalan; if (!jalan) return;
  try {
    const J = await (await fetch(`/api/lapor/meja/${encodeURIComponent(b.nomor)}/jalan`, {credentials: "same-origin", signal: AbortSignal.timeout(35000)})).json();   // Overpass dicari server (src/lapor_jalan.js)
    if (tandaUntuk !== ini) return;
    const r = ringkas.find(x => x.jenis === "jalan"), kena = new Set((J.ketemu || []).map(normNama));
    r.ada = jalan.filter(n => kena.has(normNama(n))); tulis();
    if (!J.fitur?.length) return;
    peta.addSource("mj-jalan", {type: "geojson", data: {type: "FeatureCollection", features: J.fitur}});
    peta.addLayer({id: "mj-jalan", type: "line", source: "mj-jalan", layout: {"line-cap": "round", "line-join": "round"}, paint: {"line-color": warna("--bad"), "line-width": 6, "line-opacity": 0.85}});
  } catch { /* OSM daring gagal: nama jalan tetap tertulis di pop-up */ }
}

async function bagikan(b, tombol) {
  const d = b.dampak || {}, korban = [["meninggal", "meninggal"], ["hilang", "hilang"], ["luka", "luka-luka"]].filter(([k]) => d[k] > 0).map(([k, t]) => `${F(d[k])} ${t}`).join(", ");
  const teks = [`${b.jenis || "Laporan bencana"}${b.subjenis ? `, ${b.subjenis}` : ""}`, lokasiTeks(b), `Dilaporkan ${b.waktuLapor}`, korban && `Korban: ${korban}`,
    `Status: ${LABEL[b.status]} (${b.nomor}), laporan warga belum terverifikasi`, b.lat != null && `Lokasi: https://www.google.com/maps?q=${b.lat},${b.lon}`].filter(Boolean).join("\n");
  const lbl = tombol.querySelector("span");
  try {
    if (navigator.share) { await navigator.share({title: `${b.jenis || "Laporan"} ${b.nomor}`, text: teks}); return; }
    await navigator.clipboard.writeText(teks); lbl.textContent = "Tersalin";
  } catch (e) { if (e?.name !== "AbortError") lbl.textContent = "Gagal"; }
  setTimeout(() => { lbl.textContent = "Bagikan"; }, 1800);
}

/* ---------- panel ringkasan di kiri peta: jumlah LAPORAN, bukan jumlah korban ---------- */
function gambarRingkas(daftar) {
  const r = $("ringkas"), det = r.querySelector("details") || (() => { const d = el("details"); d.open = matchMedia("(min-width: 900px)").matches; const s = el("summary"); s.append(ikon("m-ringkas"), "Ringkasan"); d.append(s, el("div", "mj-ringkas-isi")); r.append(d); return d; })();
  const n = f => daftar.filter(f).length, baris = (ik, t, v, w) => { const p = el("div", "mj-rk-baris"), i = el("span", "mj-rk-ik"); if (w) i.style.setProperty("--jn", w); i.append(ikon(ik)); p.append(i, el("span", null, t), el("b", null, F(v))); return p; };
  const kab = new Map(); for (const b of daftar) if (b.wilayah?.kab) { const k = kab.get(b.wilayah.kab) || {n: 0, b}; k.n++; kab.set(b.wilayah.kab, k); }
  const atas = [...kab].sort((a, b) => b[1].n - a[1].n).slice(0, 5), maks = atas[0]?.[1].n || 1;
  const ol = el("ol", "mj-rk-kab"); for (const [nama, {n: k, b}] of atas) { const li = el("li"), bt = el("button"), bar = el("i"); bt.type = "button"; bar.style.width = `${Math.round(k / maks * 100)}%`;
    bt.append(el("em", null, String(ol.childElementCount + 1)), el("span", null, nama.replace(/^Kota Administrasi /, "Kota ")), el("b", null, F(k)), bar);   // batang tipis di bawah nama bt.title = `Dekatkan peta ke ${nama}`;
    if (saringKab === nama) bt.setAttribute("aria-pressed", "true");
    bt.title = saringKab === nama ? "Lepas filter kab/kota" : `Tampilkan hanya ${nama}`;
    bt.addEventListener("click", () => { saringKab = saringKab === nama ? "" : nama; gambar(); if (saringKab) peta?.flyTo({center: [b.lon, b.lat], zoom: 10}); }); li.append(bt); ol.append(li); }
  const dib = daftar.map(b => b.tanggap?.dibuka).filter(v => v != null).sort((a, b) => a - b), med = dib.length ? (dib.length % 2 ? dib[dib.length >> 1] : (dib[dib.length / 2 - 1] + dib[dib.length / 2]) / 2) : null, ngugus = new Set(daftar.map(b => b.gugus?.kode).filter(Boolean)).size;
  const tanpa = n(b => b.lat == null), kepala = el("div", "mj-rk-total"); kepala.append(el("b", null, F(daftar.length)), el("span", null, "laporan sesuai filter"));
  const L = daftar.length;
  // dikelompokkan seperti tabel: manusia, bangunan, penanganan (pemilik 19 Nov 2026 "bagusin", "dipisahkan manusia dan bangunan")
  const sub = t => el("p", "mj-rk-label", t);
  det.querySelector(".mj-ringkas-isi").replaceChildren(kepala,
    sub("Laporan dengan dampak ke warga"),
    barisPanel("m-korban", "var(--bad)", "Korban jiwa atau luka", n(adaKorban), {maks: L}),
    barisPanel("m-tenda", "var(--warn)", "Warga mengungsi", n(b => b.dampak?.mengungsi > 0), {maks: L}),
    sub("Laporan dengan kerusakan"),
    barisPanel("m-rumah", "var(--brand2)", "Rumah rusak", n(b => b.dampak?.rumah > 0), {maks: L}),
    barisPanel("m-fasilitas", "var(--brand2)", "Fasilitas rusak", n(b => b.dampak?.fasilitas > 0), {maks: L}),
    barisPanel("m-jalan", "var(--brand2)", "Jalan atau jembatan rusak", n(b => b.dampak?.jalan > 0), {maks: L}),
    sub("Penanganan"),
    barisPanel("m-foto", "var(--ok)", "Berfoto", n(b => b.foto > 0), {maks: L}),
    barisPanel("m-gugus", "var(--brand2)", "Gugus laporan", ngugus),
    barisPanel("m-log", "var(--ink2)", "Median dibuka", med == null ? "–" : durasi(med)),
    ...(tanpa ? [el("p", "mj-rk-catat", `${F(tanpa)} laporan tanpa titik lokasi, tidak tampil di peta`)] : []),
    ...(atas.length ? [el("p", "mj-rk-label", "Kab/kota terbanyak"), ol] : []));
}
let legendaBuka = !matchMedia("(max-width:900px)").matches;   // HP: legenda mulai ciut jadi satu pil (tombolnya hanya tampil di layar sempit)
function gambarLegenda(daftar) {
  const ids = [...new Set(daftar.map(b => b.jenisId).filter(Boolean))];
  const jn = ids.map(id => { const s = el("span"), i = el("i", "mj-lg-jn"); i.style.setProperty("--jn", warnaJenis(id)); i.append(ikon(ikonJenis(id))); s.append(i, JENIS[id]?.[0] || id); return s; });
  const st = Object.entries(LABEL).map(([k, v]) => { const s = el("span"), i = el("i", "mj-lg-st"); i.style.setProperty("--st", WARNA[k]); s.append(i, v); return s; });
  const lp = el("button", "mj-lg-lipat"); lp.type = "button"; lp.setAttribute("aria-expanded", String(legendaBuka)); lp.setAttribute("aria-label", legendaBuka ? "Ciutkan legenda" : "Tampilkan legenda");
  lp.append(legendaBuka ? ikon("m-tutup") : "Legenda"); lp.addEventListener("click", () => { legendaBuka = !legendaBuka; gambarLegenda(daftar); });
  $("legenda").classList.toggle("ciut", !legendaBuka);
  $("legenda").replaceChildren(lp, ...(jn.length ? [el("b", null, "Jenis"), ...jn, el("hr")] : []), el("b", null, "Status"), ...st);
}

/* ---------- tabel ---------- */
function tombolAksi(ik, label, aksi) { const b = el(aksi.href ? "a" : "button", "mj-ikon"); if (aksi.href) Object.assign(b, aksi); else { b.type = "button"; b.addEventListener("click", e => { e.stopPropagation(); aksi(); }); }
  b.setAttribute("aria-label", label); b.title = label; b.append(ikon(ik)); if (aksi.href) b.addEventListener("click", e => e.stopPropagation()); return b; }
/* dampak ringkas di tabel (pemilik 19 Nov 2026 "kurang komprehensif, rumah, pengungsi"): korban, mengungsi, rumah rusak; ikon berlabel, kosong = strip */
const DAMPAK_SEL = [["meninggal", "Meninggal", "m-meninggal", "orang"], ["hilang", "Hilang", "m-hilang", "orang"], ["luka", "Luka-luka", "m-luka", "orang"],
  ["mengungsi", "Mengungsi", "m-tenda", "orang"], ["rumah", "Rumah rusak", "m-rumah", "rumah"], ["fasilitas", "Sekolah, faskes, atau tempat ibadah rusak", "m-fasilitas", "unit"],
  ["jalan", "Jalan atau jembatan rusak", "m-jalan", "titik"]];
/* dipisah manusia dan bangunan (pemilik 19 Nov 2026 "dipisahkan aja yang manusia dan bangunan") */
const MANUSIA = ["meninggal", "hilang", "luka", "mengungsi"], BANGUNAN = ["rumah", "fasilitas", "jalan"];
function korbanSel(b, kunci = MANUSIA) {
  const d = b.dampak || {}, w = el("div", "mj-korban"), daftar = DAMPAK_SEL.filter(([k]) => kunci.includes(k));
  if (daftar.every(([k]) => d[k] == null)) { w.append(el("small", null, "belum didata")); return w; }
  for (const [k, t, ik, sat] of daftar) {
    const s = el("span", d[k] > 0 ? `isi ${k}` : ""), v = d[k] == null ? "–" : F(d[k]); s.title = `${t}: ${d[k] == null ? "belum didata" : `${v} ${sat}`}`; s.setAttribute("aria-label", s.title);
    s.append(ikon(ik), el("b", null, v)); w.append(s); }
  return w;
}
/* urut tabel: kepala kolom = tombol; ketuk lagi membalik arah */
const KOLOM = [["waktu", "Waktu lapor", b => b.terkirim], ["tiket", "Tiket", b => b.nomor], ["jenis", "Jenis", b => b.jenis || ""], ["lokasi", "Lokasi", b => b.wilayah?.kab || ""],
  ["korban", "Korban", b => (b.dampak?.meninggal || 0) * 1e9 + (b.dampak?.hilang || 0) * 1e6 + (b.dampak?.luka || 0) * 1e3 + (b.dampak?.mengungsi || 0)],
  ["rusak", "Kerusakan", b => (b.dampak?.rumah || 0) + (b.dampak?.fasilitas || 0) + (b.dampak?.jalan || 0)],
  ["lengkap", "Lengkap", b => b.lengkap], ["foto", "Foto", b => b.foto], ["status", "Status", b => b.status === "tidak_valid" ? -1 : TAHAP.indexOf(b.status)], ["aksi", "Aksi", null]];
function gambarKepala() {
  $("kepalaTabel").replaceChildren(...KOLOM.map(([k, t, f]) => {
    const th = el("th"); if (!f) { th.textContent = t; return th; }
    if (k === "korban") th.title = "Meninggal, hilang, luka-luka, mengungsi"; if (k === "rusak") th.title = "Rumah, fasilitas (sekolah, faskes, tempat ibadah), jalan atau jembatan";
    th.setAttribute("aria-sort", urut.k === k ? (urut.arah > 0 ? "ascending" : "descending") : "none");
    const b = el("button", "mj-urut"); b.type = "button"; b.append(el("span", null, t), ikon("m-urut"));
    b.addEventListener("click", () => { urut = urut.k === k ? {k, arah: -urut.arah} : {k, arah: k === "waktu" || k === "korban" || k === "lengkap" || k === "foto" ? -1 : 1}; gambarKepala(); nanti(() => gambarTabel(tersaringSekarang())); });
    th.append(b); return th;
  }));
}
gambarKepala();
function gambarTabel(daftar) {
  const f = KOLOM.find(x => x[0] === urut.k)[2];
  daftar = [...daftar].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === "string" ? x.localeCompare(y, "id") : x - y) * urut.arah || b.terkirim - a.terkirim; });
  $("nTabel").textContent = `${F(daftar.length)} dari ${F(semua.length)}`;
  // dikelompokkan per provinsi, kepala bisa dilipat (pemilik 19 Nov 2026 "ada collapsible provinsinya"); urutan provinsi = urutan baris pertamanya
  const per = new Map(); for (const b of daftar) { const p = b.wilayah?.prov || "Tanpa provinsi"; per.set(p, [...(per.get(p) || []), b]); }
  const kepalaProv = (p, xs) => { const tr = el("tr", "mj-prov"), td = el("td"), bt = el("button"); td.colSpan = KOLOM.length; bt.type = "button";
    const tutup = provTutup.has(p); bt.setAttribute("aria-expanded", String(!tutup)); // pil berikon dengan angka tebal (pemilik 19 Nov 2026 "bagusin"); angka = jumlah LAPORAN, bukan jumlah korban
    const pilP = (ik, n, t, k) => { const x = el("span", `mj-prov-pil${k ? ` ${k}` : ""}`); x.append(ikon(ik), el("b", null, F(n)), t); return x; };
    const nK = xs.filter(adaKorban).length, nU = xs.filter(b => b.dampak?.mengungsi > 0).length, nR = xs.filter(b => (b.dampak?.rumah || 0) + (b.dampak?.fasilitas || 0) + (b.dampak?.jalan || 0) > 0).length;
    bt.append(ikon("m-bawah"), el("b", null, p), pilP("m-daftar", xs.length, "laporan"), ...(nK ? [pilP("m-korban", nK, "ada korban", "merah")] : []),
      ...(nU ? [pilP("m-tenda", nU, "ada pengungsi", "kuning")] : []), ...(nR ? [pilP("m-rumah", nR, "ada kerusakan", "biru")] : []));
    bt.addEventListener("click", () => { provTutup.has(p) ? provTutup.delete(p) : provTutup.add(p); gambarTabel(tersaringSekarang()); }); td.append(bt); tr.append(td); return tr; };
  const baris = b => {
    const tr = el("tr"); if (b.nomor === pilih) tr.classList.add("pilih");
    const sel = (k, ...isi) => { const td = el("td", k); td.append(...isi); return td; };
    const bar = el("span", "mj-bar"), bi = el("i"); bi.style.width = `${b.lengkap}%`; bar.append(bi);
    const ft = el("span", "mj-mini"); ft.textContent = b.foto ? "" : "Tanpa foto";
    if (b.foto) fotoLaporan(b.nomor).then(fs => { if (fs[0]) { const im = el("img"); im.src = fs[0].sampul || fs[0].url; im.alt = ""; im.loading = "lazy"; ft.append(im); if (fs.length > 1) ft.append(el("small", null, `+${fs.length - 1}`)); } });
    const jn = el("div", "mj-sel-jenis"), ik = el("span", "mj-jenis-ikon kecil"); ik.style.setProperty("--jn", warnaJenis(b.jenisId)); ik.append(ikon(ikonJenis(b.jenisId)));
    const jt = el("div");
    if (b.darurat?.luring) jt.append(Object.assign(el("span", "mj-chip-luring", b.darurat.terlambat ? "Dikirim terlambat" : "Dari luring"), {title: teksLuring(b.darurat)}));
    if (b.darurat && !b.darurat.terlambat) { tr.classList.add("mj-baris-darurat"); jt.append(el("span", "mj-chip-darurat", "Darurat")); if (b.darurat.cara === "sekali_ketuk") jt.append(el("span", "mj-chip-sekali", "Sekali ketuk")); if (b.darurat.tertunda) jt.append(Object.assign(el("span", "mj-chip-sekali", "Tertunda"), {title: "Dikirim dari antrean HP sesudah sinyal kembali; waktu kejadian = jam ketukan"})); }
    if (b.dikenal === false) jt.append(Object.assign(el("span", "mj-chip-sekali", "Belum dikenal"), {title: "Pelapor belum mengisi nama"}));   // K90, D124
    jt.append(el("b", null, b.jenis || "Belum dipilih"), el("small", null, b.subjenis || ""), ...(b.bahasa ? [el("span", "mj-pil-bahasa", b.bahasa)] : []), ...(b.gugus ? [chipGugus(b.gugus)] : [])); jn.append(ik, jt);
    const lok = el("div"); lok.append(el("b", null, b.wilayah?.kab || "Tanpa lokasi"), el("small", null, [b.wilayah?.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah?.prov].filter(Boolean).join(", "))); if (b.ditangani) lok.append(el("small", "mj-ditangani-kecil", b.ditangani));   // PF-08
    const aksi = el("div", "mj-aksi-baris");
    // verifikasi (pemilik 20 Nov 2026: "di kanan ada aksinya untuk memverifikasi"): membuka rincian langsung di kartu Pengecekan lapangan
    if (!["selesai", "tidak_valid"].includes(b.status)) { const v = tombolAksi("m-telaah", `Verifikasi ${b.nomor}`, () => bukaRinci(b.nomor, true, "periksa")); v.classList.add("mj-verif"); if (b.periksa) v.dataset.hasil = b.periksa; aksi.append(v); }
    aksi.append(tombolAksi("m-buka", `Buka ${b.nomor}`, () => bukaRinci(b.nomor)));
    if (b.wa) aksi.append(tombolAksi("m-wa", `Chat WhatsApp ${b.nama || ""}`, {href: `https://wa.me/${b.wa}`, target: "_blank", rel: "noopener"}));
    if (b.lat != null) aksi.append(tombolAksi("m-lokasi", "Lihat di peta", () => { peta?.flyTo({center: [b.lon, b.lat], zoom: 13}); pindahTampil("peta"); requestAnimationFrame(() => bukaPopup(b)); }));
    tr.append(sel("", el("b", null, tglRingkas(b.waktuLapor))), sel("", el("span", "mj-nomor", b.nomor)),
      sel("", jn), sel("", lok), sel("angka", korbanSel(b)), sel("angka", korbanSel(b, BANGUNAN)), sel("angka", cincin(b.lengkap)), sel("angka", ft), sel("angka", pil(b.status), ...(b.periksa ? [el("small", `mj-cek ${b.periksa}`, ({valid: "Dicek: valid", sebagian: "Dicek: sebagian benar", tidak_valid: "Dicek: tidak valid"})[b.periksa])] : []), ...(b.tanggap?.dibuka != null ? [el("small", "mj-tanggap", `dibuka ${durasi(b.tanggap.dibuka)}`)] : b.status === "baru" ? [el("small", "mj-tanggap belum", `belum dibuka, ${durasi(Math.round((Date.now() - b.terkirim) / 60000))}`)] : [])), sel("angka", aksi));
    tr.addEventListener("click", () => bukaRinci(b.nomor));
    return tr;
  };
  /* laporan satu gugus (kejadian yang sama) dikumpulkan berurutan di bawah satu kepala gugus (pemilik 20 Nov 2026: "harusnya ada kaya merge,
     dilihat sebagai satu bencana atau dibuat saling dekat"). Angka di kepala = tertinggi antarlaporan, tidak dijumlah (D28, D107). */
  const kepalaGugus = (g, xs) => { const tr = el("tr", "mj-gugus-kepala"), td = el("td"), bt = el("button"); td.colSpan = KOLOM.length; bt.type = "button";
    const tutup = gugusTutup.has(g.kode); bt.setAttribute("aria-expanded", String(!tutup));
    const ik = el("span", "mj-jenis-ikon kecil"); ik.style.setProperty("--jn", warnaJenis(xs[0].jenisId)); ik.append(ikon(ikonJenis(xs[0].jenisId)));
    const desa = [...new Set(xs.map(b => b.wilayah?.desa).filter(Boolean))], waktu = xs.map(b => b.terkirim).sort((a, b) => a - b);
    const maks = k => Math.max(...xs.map(b => b.dampak?.[k] ?? -1)), angka = [["meninggal", "meninggal", "m-meninggal"], ["hilang", "hilang", "m-hilang"], ["luka", "luka", "m-luka"], ["mengungsi", "mengungsi", "m-tenda"], ["rumah", "rumah rusak", "m-rumah"]]
      .map(([k, t, ik]) => [maks(k), t, ik]).filter(([n]) => n > 0);
    const pil = () => { const p = el("span", "mj-gugus-angka"); p.title = "Angka tertinggi antarlaporan, tidak dijumlah"; p.append(el("small", null, "Tertinggi"));
      for (const [n, t, ik] of angka) { const s = el("span"); s.append(ikon(ik), `${F(n)} ${t}`); p.append(s); } return p; };
    const tx = el("div", "mj-gugus-teks"); tx.append(el("b", null, `${xs[0].jenis || "Kejadian"}, ${xs.length} laporan`),
      el("small", null, [desa.length ? `Desa/Kel. ${desa.join(", ")}` : null, xs[0].wilayah?.kab, `${tglRingkas(xs.find(b => b.terkirim === waktu[0])?.waktuLapor || "")} sampai ${tglRingkas(xs.find(b => b.terkirim === waktu.at(-1))?.waktuLapor || "")}`].filter(Boolean).join(", ")));
    const pelapor = () => { const p = el("span", "mj-gugus mj-pelapor"); p.append(ikon("m-orang"), `${F(g.n_pelapor)} pelapor`); p.title = "Nomor WhatsApp berbeda yang melapor kejadian ini"; return p; };   // LK-08
    const desaChip = () => { const p = el("span", "mj-gugus mj-satu-desa"); p.append(ikon("m-lokasi"), "satu desa"); p.title = "Laporan ini tersambung karena desanya sama, bukan karena jaraknya dekat (aturan satu desa)"; return p; };
    const kanan = el("div", "mj-gugus-kanan"); kanan.append(...(angka.length ? [pil()] : []), ...(g.n_pelapor >= 2 ? [pelapor()] : []), ...(g.chip?.satu_desa ? [desaChip()] : []), ...(g.chip ? [chipGugus(g.chip)] : []));
    bt.append(ikon("m-bawah"), ik, tx, kanan);
    bt.addEventListener("click", () => { gugusTutup.has(g.kode) ? gugusTutup.delete(g.kode) : gugusTutup.add(g.kode); gambarTabel(tersaringSekarang()); });
    td.append(bt); tr.append(td); return tr; };
  /* gabung di meja (pemilik 20 Nov 2026: "kalo bencananya sama yaudah di merge", D119): jenis sama di kab/kota yang sama, berantai selama jarak
     antarlaporan paling lama JEDA_GABUNG; tidak valid tetap baris sendiri. Hanya tampilan: nomor KJ (K66) dan gugus (A9) tidak berubah. */
  const susun = xs => { const per = new Map();
    for (const b of xs) { const kab = b.wilayah?.kabKode || b.wilayah?.kab, k = b.jenisId && kab && b.status !== "tidak_valid" ? `${b.jenisId}|${kab}` : `#${b.nomor}`; per.set(k, [...(per.get(k) || []), b]); }
    const grup = [...per.values()].flatMap(ys => { const r = []; for (const y of [...ys].sort((a, b) => a.terkirim - b.terkirim)) { const g = r.at(-1); if (g && y.terkirim - g.at(-1).terkirim <= JEDA_GABUNG) g.push(y); else r.push([y]); }
      return r.map(g => ys.filter(b => g.includes(b))); });   // urutan dalam kelompok ikut urutan daftar
    return grup.flatMap(g => { if (g.length < 2) return g.map(baris);
      const ada = g.find(b => b.kejadian)?.kejadian || g.find(b => b.gugus)?.gugus, wa = g.map(b => b.wa);
      const kepala = {kode: `${g[0].jenisId}|${g[0].wilayah?.kabKode || g[0].wilayah?.kab}|${Math.min(...g.map(b => b.terkirim))}`, n_pelapor: wa.every(Boolean) ? new Set(wa).size : null, chip: ada || null};
      return [kepalaGugus(kepala, g), ...(gugusTutup.has(kepala.kode) ? [] : g.map(b => { const tr = baris(b); tr.classList.add("mj-anggota"); return tr; }))]; }); };
  $("tbody").replaceChildren(...(daftar.length ? [...per].flatMap(([p, xs]) => [kepalaProv(p, xs), ...(provTutup.has(p) ? [] : susun(xs))]) : [(() => { const tr = el("tr"), td = el("td", "mj-kosong", "Belum ada laporan yang cocok dengan filter."); td.colSpan = KOLOM.length; tr.append(td); return tr; })()]));
}
const fotoLaporan = nomor => { if (!fotoCache.has(nomor)) fotoCache.set(nomor, fetch(`/api/lapor/meja/${nomor}`).then(r => r.json()).then(j => j.foto || []).catch(() => [])); return fotoCache.get(nomor); };

/* draf Logbook Pusdalops dari laporan warga (K56): diisi ke draf perangkat logbook (localStorage "logbook_draf_v1", bentuk kumpul() di public/bnpb/logbook.js),
   lalu logbook dibuka. Tidak ada rute dan tabel baru; petugas memeriksa, melengkapi bagian khusus BPBD, dan menyimpan sendiri. Angka hanya dari isian pelapor. */
const JENIS_LOGBOOK = {banjir: "banjir", longsor: "longsor", cuaca: "cuaca", karhutla: "karhutla", gempa: "gempabumi", erupsi: "gunungapi", kekeringan: "kekeringan", tsunami: "tsunami",
  abrasi: "gelombang_pasang", kebakaran_gedung: "kebakaran_permukiman", lainnya: "lainnya"};
const KENDALA_LOGBOOK = [["Jalan putus", "akses"], ["Listrik padam", "listrik"], ["Sinyal telepon putus", "sinyal"], ["Air bersih terhenti", "air"]];
const KEBUTUHAN_LOGBOOK = [["Makanan siap saji", "makanan"], ["Paket pangan", "makanan"], ["Air bersih", "air_bersih"], ["Paket sandang", "sandang"], ["Tenda", "tenda"], ["Obat", "obat"],
  ["Perahu", "perahu"], ["Pompa", "pompa"], ["Alat berat", "alat_berat"], ["Bahan atap", "material"], ["Karung", "material"]];
function drafLogbook(j, tombol) {
  const n = j.nilai || {}, w = n.lokasi?.wilayah || j.wilayah || {}, s = v => v == null ? "" : String(v);
  const pilihan = (teks, peta) => [...new Set(peta.filter(([cari]) => String(teks || "").includes(cari)).map(([, k]) => k))];
  const mulai = j.waktuKejadianMs ? new Date(j.waktuKejadianMs + 7 * 36e5).toISOString().slice(0, 16) : "";
  const d = {jenis: JENIS_LOGBOOK[n.jenis] || "", prov: s(w.provKode), kab: s(w.kabKode).replace(".", ""), kec: s(w.kec), desa: s(w.desa), lanjut: null, mulai, lat: s(j.lat), lon: s(j.lon),
    dampak: {md: s(n.meninggal), hilang: s(n.hilang), luka: s(n.luka), mengungsi_jiwa: s(n.mengungsi_jiwa), mengungsi_kk: s(n.mengungsi_kk), rumah_rb: s(n.rumah_berat), rumah_rs: s(n.rumah_sedang),
      rumah_rr: s(n.rumah_ringan), rumah_terendam: s(n.rumah_terendam), luas_ha: ""},
    kendala: [...new Set([...pilihan(n.layanan_terganggu, KENDALA_LOGBOOK), ...(/putus|hanya motor/i.test(n.akses_jalan || "") ? ["akses"] : [])])], kebutuhan: pilihan(n.kebutuhan, KEBUTUHAN_LOGBOOK), sumber_instansi: "",
    catatan: `Dari laporan warga ${j.nomor} (Pantau Bencana), belum terverifikasi. ${String(n.kronologi || "").slice(0, 400)}`.trim()};
  let lama = null; try { lama = localStorage.getItem("logbook_draf_v1"); } catch {}
  if (lama && tombol.dataset.yakin !== "1") { tombol.dataset.yakin = "1"; tombol.lastChild.textContent = "Ganti draf lama? Ketuk lagi"; return; }   // jangan diam-diam menimpa draf petugas
  try { localStorage.setItem("logbook_draf_v1", JSON.stringify(d)); } catch { tombol.lastChild.textContent = "Draf tidak bisa disimpan"; return; }
  window.open("/bnpb/logbook", "_blank", "noopener");
}

/* kejadian yang sama (K66, D106): nomor KJ dari konfirmasi pelapor; staf BNPB bisa melepas laporan ini bila salah kelompok (tercatat di riwayat) */
function kartuKejadianRinci(kj, kartu, kirim) {
  const w = el("div", "mj-isi-kartu"), info = el("p", "mj-label", `${labelKode(kj.kode)}, ${F(kj.n_laporan)} laporan dari ${F(kj.n_pelapor)} warga yang mengonfirmasi kejadian yang sama. Angka tiap laporan tidak dijumlah.`);
  w.append(info);
  if (!akunBpbd()) { const bt = el("button", "mj-tombol"); bt.type = "button"; bt.append(ikon("m-larang"), "Lepas dari kejadian"); bt.title = "Laporan ini tidak lagi dihitung bagian kejadian itu; tercatat di riwayat tiket";
    bt.addEventListener("click", () => kirim("lepas", {}, bt)); w.append(bt); }
  return kartu(labelKode(kj.kode), "m-gugus", w);
}
/* gugus di rincian: anggota dengan angka dampak per laporan, tidak dijumlah (D28) */
function kartuGugusRinci(g, kartu) {
  const w = el("div", "mj-isi-kartu"), info = el("p", "mj-label", `${labelKode(g.kode)}, ${F(g.n_laporan)} laporan dari ${F(g.n_pelapor)} pelapor berbeda. Angka tiap laporan tidak dijumlah.`);
  const t = el("table", "mj-gugus-tabel"), h = el("tr"); for (const x of ["Tiket", "Desa/Kel.", "Meninggal", "Hilang", "Luka", "Status"]) h.append(el("th", null, x)); t.append(h);
  for (const a of g.anggota) { const r = el("tr", a.saya ? "saya" : ""), v = k => a.dampak?.[k] == null ? "–" : F(a.dampak[k]);
    const nomorSel = el("td"); if (a.saya) nomorSel.append(el("b", "mj-nomor", a.nomor)); else { const bt = el("button", "mj-tautan mj-nomor", a.nomor); bt.type = "button"; bt.addEventListener("click", () => bukaRinci(a.nomor)); nomorSel.append(bt); }
    r.append(nomorSel, el("td", null, a.desa || "–"), el("td", "angka", v("meninggal")), el("td", "angka", v("hilang")), el("td", "angka", v("luka"))); const ps = el("td"); ps.append(pil(a.status)); r.append(ps); t.append(r); }
  w.append(info, t);
  const k = kartu(g.label === "gugus kuat" ? "Gugus kuat" : "Gugus laporan", "m-gugus", w); return k;
}
/* teruskan ke BPBD (fitur 2): kontak BPBD kab dan provinsi dari data BPBD BNPB; staf sendiri yang menekan kirim di WhatsApp (tindakan keluar tetap manusia, D25),
   lalu tiket ditandai Diteruskan dengan catatan nama BPBD. Kirim otomatis ke kontak terdaftar menunggu F1 (Q16, Q38). */
function kartuTeruskan(j, b, kirim) {
  const w = el("div", "mj-isi-kartu"), isi = el("div", "mj-teruskan"); isi.append(el("p", "mj-label", "Mencari BPBD setempat..."));
  // tombol utama (K63, D97): tiket masuk meja BPBD wilayahnya dan akun lembaga dikabari lewat WhatsApp; kontak WA manual di bawah tetap jadi cadangan
  const lewatUtama = !(j.pindah || []).includes("diteruskan") && (j.pindah || []).includes("ditelaah"), utama = el("button", "mj-tombol isi lebar"), hasil = el("p", "mj-label");
  utama.type = "button"; utama.append(ikon("m-kirim"), "Teruskan ke meja BPBD"); utama.disabled = !(j.pindah || []).includes("diteruskan") && !lewatUtama;
  utama.title = utama.disabled ? "Tiket tidak bisa diteruskan dari tahap ini" : "BPBD kab/kota membuka laporan ini di meja mereka dan dikabari lewat WhatsApp tanpa isi laporan";
  utama.addEventListener("click", async () => {
    utama.disabled = true; hasil.textContent = "";
    try {
      const kirimKe = (aksi, badan) => fetch(`/api/lapor/meja/${j.nomor}/${aksi}`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
      if (lewatUtama) { const a = await kirimKe("status", {ke: "ditelaah", catatan: "Ditelaah untuk diteruskan ke meja BPBD"}); if (!a.ok) throw 0; }   // aturan tahap A8
      const r = await kirimKe("teruskan", {}), h = await r.json(); if (!r.ok) { hasil.textContent = h.galat || "Gagal meneruskan."; utama.disabled = false; return; }
      hasil.textContent = h.bpbdTerdaftar ? (h.antre ? "Diteruskan. Akun BPBD wilayah ini dikabari lewat WhatsApp." : "Diteruskan. Akun BPBD wilayah ini sudah dikabari hari ini (batas harian), tiket tetap ada di meja mereka.")
        : "Diteruskan, tetapi BPBD wilayah ini belum punya akun. Hubungi lewat WhatsApp di bawah.";
      fotoCache.delete(j.nomor); muat();
    } catch { hasil.textContent = "Gagal meneruskan, periksa sambungan."; utama.disabled = false; }
  });
  w.append(utama, hasil, isi);
  const k = el("section", "mj-kartu"), h = el("h3"); h.append(ikon("m-kirim"), "Teruskan ke BPBD"); k.append(h, w);
  if (j.lat == null) { isi.replaceChildren(el("p", "mj-label", "Lokasi belum ada, BPBD setempat belum bisa ditentukan.")); return k; }
  fetch(`/api/lapor/penting?lat=${j.lat}&lon=${j.lon}`).then(r => r.json()).then(p => {
    const d = j.dampak || {}, korban = [["meninggal", "meninggal"], ["hilang", "hilang"], ["luka", "luka-luka"], ["mengungsi", "mengungsi"]].filter(([x]) => d[x] > 0).map(([x, t]) => `${F(d[x])} ${t}`).join(", ");
    const jenis = j.isian.find(x => x.nama === "jenis")?.tampil, lok = j.isian.find(x => x.nama === "lokasi")?.tampil;
    const teks = [`*Teruskan laporan warga ${j.nomor || ""}*`.replace(" *", "*"), `${jenis || "Kejadian"}, ${lok || ""}`, `Dilaporkan ${j.waktuLapor}`, korban && `Dampak menurut pelapor: ${korban}`,
      `Lokasi: https://www.google.com/maps?q=${j.lat},${j.lon}`, "Laporan warga lewat Pantau Bencana BNPB, belum terverifikasi. Mohon cek lapangan dan kabari BNPB."].filter(Boolean).join("\n");
    const baris = (p.bpbd || []).map(x => { const r = el("div", "mj-bpbd"), t = el("div"); t.append(el("b", null, x.nama), el("small", null, [x.nomor ? `Pusdalops ${x.nomor}` : "Nomor Pusdalops belum tercatat", x.jarakKm != null ? `${String(x.jarakKm).replace(".", ",")} km` : null].filter(Boolean).join(", ")));
      const aksi = el("div", "mj-deret"), wa = x.nomor && x.nomor.replace(/\D/g, "").replace(/^0/, "62");
      if (wa && wa.length >= 9) { const a = Object.assign(el("a", "mj-tombol"), {href: `https://wa.me/${wa}?text=${encodeURIComponent(teks)}`, target: "_blank", rel: "noopener"}); a.append(ikon("m-wa"), "Kirim WA"); aksi.append(a); }
      const tandai = el("button", "mj-tombol"); tandai.type = "button"; tandai.append(ikon("m-centang"), "Tandai diteruskan");
      // dari Baru atau Dilihat tiket lewat Ditelaah dulu (aturan tahap A8), dua baris riwayat tercatat
      const lewat = !(j.pindah || []).includes("diteruskan") && (j.pindah || []).includes("ditelaah");
      tandai.disabled = !(j.pindah || []).includes("diteruskan") && !lewat; tandai.title = tandai.disabled ? "Tiket tidak bisa diteruskan dari tahap ini" : `Pindahkan tiket ke Diteruskan, catatan: diteruskan ke ${x.nama}`;
      tandai.addEventListener("click", async () => { if (lewat) { tandai.disabled = true;
          const r = await fetch(`/api/lapor/meja/${j.nomor}/status`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify({ke: "ditelaah", catatan: `Ditelaah untuk diteruskan ke ${x.nama}`})}).catch(() => null);
          if (!r?.ok) { tandai.disabled = false; return; } }
        kirim("status", {ke: "diteruskan", catatan: `Diteruskan ke ${x.nama}`}, tandai); }); aksi.append(tandai);
      r.append(t, aksi); return r; });
    isi.replaceChildren(...(baris.length ? baris : [el("p", "mj-label", "BPBD setempat tidak ditemukan di data BPBD BNPB.")]));
  }).catch(() => isi.replaceChildren(el("p", "mj-label", "Data BPBD gagal dimuat.")));
  return k;
}

/* kartu Halaman publik (LK-07, D8): status tayang, lima syarat, tarik atau tampilkan lagi; backend menjaga hak wilayah */
function kartuPublik(j, nomor, kartu) {
  const p = j.publik; if (!p) return null;
  const w = el("div", "mj-isi-kartu"), st = el("p", "mj-pub-status", p.tayang ? "Tayang di halaman kejadian hari ini" : p.ditarik ? "Ditarik dari halaman publik" : "Belum tayang");
  w.append(st);
  if (!p.tayang) { const ul = el("ul", "mj-pub-syarat");
    for (const s of p.syarat || []) { const li = el("li", s.ok ? "ok" : "belum"); li.append(ikon(s.ok ? "m-centang" : "m-tutup"), el("span", null, s.label)); ul.append(li); }
    w.append(ul);
    if (!p.ditarik && (p.syarat || []).every(s => s.ok) && !p.dalam24jam) w.append(el("p", "mj-label", "Pengecekan Valid lebih dari 24 jam lalu"));
  }
  if (!p.halamanBuka) w.append(el("small", "mj-pub-kecil", "Halaman publik belum dibuka pemilik."));
  const alasan = el("input"); alasan.type = "text"; alasan.maxLength = 300; alasan.placeholder = "Alasan (boleh kosong)"; alasan.setAttribute("aria-label", "Alasan menarik dari halaman publik"); alasan.hidden = p.ditarik;
  const galat = el("p", "mj-pesan-galat"); galat.setAttribute("role", "alert");
  const t = el("button", "mj-tombol"); t.type = "button";
  const isi = () => { t.replaceChildren(ikon(p.ditarik ? "m-centang" : "m-larang"), p.ditarik ? "Tampilkan lagi" : "Tarik dari halaman publik"); }; isi();
  t.addEventListener("click", async () => {
    galat.textContent = ""; t.disabled = true; t.replaceChildren("Menyimpan...");   // chrome urgent, kerja jaringan sesudahnya
    try {
      const badan = {aktif: !p.ditarik}; if (!p.ditarik && alasan.value.trim()) badan.alasan = alasan.value.trim();
      const r = await fetch(`/api/lapor/meja/${nomor}/tarik`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
      const h = await r.json().catch(() => ({})); if (!r.ok) { galat.textContent = h.galat || "Gagal menyimpan."; t.disabled = false; isi(); return; }
      fotoCache.delete(nomor); await muat();   // muat() membuka ulang rincian bila dialog terbuka; panggilan kedua membuat POST lihat ganda (inp-reviewer LK-07)
    } catch { galat.textContent = "Gagal menyimpan, periksa sambungan."; t.disabled = false; isi(); }
  });
  w.append(alasan, t, galat);
  return kartu("Halaman publik", "m-buka", w);
}
/* kartu Buku Besar (LK-09, K87): satu klik mengusulkan kejadian laporan ke Buku Besar Kejadian; hanya usulan, staf Siklus yang memutuskan.
   Tampil hanya bila Worker mengirim j.usulan (akun BNPB, saklar LAPOR_USUL menyala); hak peran diperiksa Worker */
function kartuUsulan(j, nomor, kartu) {
  const u = j.usulan; if (!u) return null;
  const w = el("div", "mj-isi-kartu"), st = u.status;
  /* LK-11 (A7, D11): status dari sk_kejadian_sumber lewat Worker; tanpa usulan (st null) tidak pernah "Diusulkan" */
  if (st && st.keadaan !== "ditolak") {
    w.append(el("p", "mj-pub-status", st.keadaan === "terpasang" ? `Terpasang ke ${st.kejadian_id}` : st.keadaan === "tinjau" ? "Menunggu staf Siklus memilih kejadian" : "Diusulkan, menunggu pencocokan"),
      el("p", "mj-pub-kecil", st.keadaan === "terpasang" ? `Usulan ${labelKode(st.kode)} sudah masuk Buku Besar Kejadian.` : st.keadaan === "tinjau" ? `Usulan ${labelKode(st.kode)} cocok dengan lebih dari satu kejadian atau belum berwilayah. Staf Siklus yang memutuskan.` : `Usulan ${labelKode(st.kode)} dicocokkan pada jalan terjadwal berikutnya, tiap 3 jam.`));
    if (st.keadaan === "terpasang") { const a = el("a", "mj-tombol"); a.href = `/siklus/kejadian/${encodeURIComponent(st.kejadian_id)}`; a.append(ikon("m-buka"), "Buka kejadian"); w.append(a); }
    return kartu("Buku Besar", "m-kejadian", w);
  }
  if (st) w.append(el("p", "mj-pub-status", "Ditolak staf Siklus"), el("p", "mj-pub-kecil", u.siap ? `Usulan ${labelKode(st.kode)} ditolak. Kejadian ini boleh diusulkan lagi.` : `Usulan ${labelKode(st.kode)} ditolak.`));
  if (u.ada) { w.append(el("p", "mj-pub-status", "Diusulkan, menunggu pencocokan")); return kartu("Buku Besar", "m-kejadian", w); }
  if (!u.siap) { w.append(el("p", "mj-label", u.alasan || "Belum bisa diusulkan.")); return kartu("Buku Besar", "m-kejadian", w); }
  w.append(el("p", "mj-label", "Usulan masuk antrean pencocokan Buku Besar Kejadian. Staf Siklus yang memutuskan."));
  const galat = el("p", "mj-pesan-galat"); galat.setAttribute("role", "alert");
  const t = el("button", "mj-tombol"); t.type = "button";
  const isi = () => t.replaceChildren(ikon("m-kirim"), "Usulkan ke Buku Besar"); isi();
  t.addEventListener("click", async () => {
    galat.textContent = ""; t.disabled = true; t.replaceChildren("Mengirim...");   // chrome urgent, kerja jaringan sesudahnya
    try {
      const r = await fetch(`/api/lapor/meja/${nomor}/usulkan`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: "{}"});
      const h = await r.json().catch(() => ({})); if (!r.ok && r.status !== 409) { galat.textContent = h.galat || "Gagal mengusulkan."; t.disabled = false; isi(); return; }
      await muat();   // 409 = sudah diusulkan staf lain: muat ulang menampilkan statusnya
    } catch { galat.textContent = "Gagal mengusulkan, periksa sambungan."; t.disabled = false; isi(); }
  });
  w.append(t, galat);
  return kartu("Buku Besar", "m-kejadian", w);
}
/* ---------- pop-up rincian: membuka = tiket "Dilihat" (pelapor melihat tahapnya di halaman lacak) ---------- */
// light dismiss: closedby="any"; peramban tanpa dukungan (Safari) memakai klik di luar kotak dialog
if (!("closedBy" in HTMLDialogElement.prototype)) dlg.addEventListener("click", e => { if (e.target !== dlg) return; const r = dlg.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close(); });
dlg.addEventListener("close", () => { pilih = null; petaMini?.remove(); petaMini = null; gambar(); });

function tahapan(status) {
  const ol = el("ol", "mj-tahap"); ol.setAttribute("aria-label", "Tahap tiket");
  if (status === "tidak_valid") { const li = el("li", "kini"); li.style.setProperty("--st", WARNA.tidak_valid); li.append((() => { const i = el("i"); i.append(ikon("m-larang")); return i; })(), el("span", null, "Ditandai tidak valid")); ol.append(li); return ol; }
  const k = TAHAP.indexOf(status);
  TAHAP.forEach((t, i) => { const li = el("li", i < k ? "lewat" : i === k ? "kini" : ""); li.style.setProperty("--st", WARNA[t]); if (i === k) li.setAttribute("aria-current", "step"); const bul = el("i"); bul.append(ikon(i < k ? "m-centang" : IKON_TAHAP[t])); li.append(bul, el("span", null, LABEL[t])); ol.append(li); });
  return ol;
}

/* bukti tindak lanjut (K60, D87, D88): foto penanganan petugas, kamera dengan GPS perangkat; tampil di halaman lacak pelapor,
   di Alun-alun hanya yang dicentang per foto (jangan memuat wajah korban atau pelat kendaraan) */
function kartuBukti(j, nomor, kirim) {
  const k = el("section", "mj-kartu"), h = el("h3"); h.append(ikon("m-foto"), `Foto penanganan${j.bukti?.length ? ` (${j.bukti.length})` : ""}`);
  const w = el("div", "mj-isi-kartu"), kisi = el("div", "mj-bukti");
  for (const b of j.bukti || []) { const f = el("figure"), im = el("img"); im.src = b.url; im.alt = "Foto penanganan"; im.loading = "lazy";
    const lb = el("label"), cb = el("input"); cb.type = "checkbox"; cb.checked = b.publik; lb.append(cb, "Tampil di Situasi bencana"); lb.title = "Pastikan tidak ada wajah korban atau pelat kendaraan";
    cb.addEventListener("change", () => kirim("bukti-publik", {id: b.id, publik: cb.checked}, cb));
    f.append(im, el("small", null, `${b.waktu}${b.lokasi ? "" : ", tanpa lokasi"}`), lb); kisi.append(f); }
  const masuk = el("input"); masuk.type = "file"; masuk.accept = "image/jpeg,image/*"; masuk.capture = "environment"; masuk.hidden = true;
  const tb = el("button", "mj-tombol isi lebar"); tb.type = "button"; tb.append(ikon("m-foto"), j.bukti?.length ? "Tambah foto penanganan" : "Lampirkan foto penanganan");
  let gps = null; tb.addEventListener("click", () => { navigator.geolocation?.getCurrentPosition(p => { gps = {lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy, waktu: Date.now()}; }, () => {}, {enableHighAccuracy: true, maximumAge: 0, timeout: 20000}); masuk.click(); });
  masuk.addEventListener("change", async () => { const f = masuk.files[0]; if (!f) return;
    const data = await kecilkanFoto(f); if (!data) return; kirim("bukti", {data, gps}, tb); });
  w.append(...(j.bukti?.length ? [kisi] : [el("p", "mj-redup", j.status === "ditindaklanjuti" ? "Sebelum Selesai, lampirkan minimal satu foto penanganan. Pelapor melihatnya di halaman lacak." : "Foto penanganan dilihat pelapor di halaman lacak.")]), tb, masuk);
  k.append(h, w); return k;
}
/* pilihan tindakan (K70, D111): checkbox berlabel dari katalog jenis bencana (bencana.json, AGENTS 2.28) + tindakan lain; nilai() = badan kiriman */
function pemilihTindakan(pilihan, judul) {
  const fs = el("fieldset", "mj-pilih"), lg = el("legend", "mj-label", judul), kisi = el("div", "mj-pilih-kisi");
  for (const t of pilihan || []) { const lb = el("label"), cb = el("input"); cb.type = "checkbox"; cb.name = "tindakan"; cb.value = t.kode; lb.append(cb, t.label); kisi.append(lb); }
  const lain = el("input"); lain.type = "text"; lain.name = "tindakanLain"; lain.maxLength = 120; lain.placeholder = pilihan?.length ? "Tindakan lain (opsional)" : "Tulis tindakan yang dilakukan"; lain.setAttribute("aria-label", "Tindakan lain");
  fs.append(lg, ...(pilihan?.length ? [kisi] : []), lain);
  return {el: fs, nilai: () => ({tindakan: [...fs.querySelectorAll("input[name=tindakan]:checked")].map(x => x.value), tindakanLain: lain.value})};
}
/* daftar tindakan tercatat: label, pelaku, waktu */
function daftarTindakan(xs) {
  const ul = el("ul", "mj-tindakan"); for (const t of xs) { const li = el("li"); li.append(ikon("m-centang"), el("b", null, t.label), el("small", null, [t.waktu, t.oleh].filter(Boolean).join(", "))); ul.append(li); }
  return ul;
}
/* pengecekan lapangan (K69, D108-D110): hasil Valid, Sebagian benar, atau Tidak valid; catatan wajib; revisi angka hanya bila Sebagian benar.
   Revisi tidak menimpa isian pelapor: server menulis versi baru berasal petugas. */
/* PF-09 (profil-bpbd K13): PIC aktif BPBD wilayah laporan untuk Pusdalops. GET tersamar; "Tampilkan nomor" memanggil POST yang tercatat di lapor_akses. Tanpa PIC: kontak situs resmi. */
function kartuPic(nomor) {
  const w = el("div", "mj-pic"); w.append(el("p", "mj-redup", "Memuat PIC..."));
  fetch(`/api/lapor/meja/${nomor}/pic`, {signal: AbortSignal.timeout(15000)}).then(r => r.json().then(d => ({ok: r.ok, d}))).then(({ok, d}) => {
    w.replaceChildren(); if (!ok) return w.append(el("p", "mj-redup", d.galat || "PIC belum bisa dimuat."));
    for (const p of d.pic || []) {
      const baris = el("div", "mj-pic-baris"), t = el("div"), nomorEl = el("small", null, p.wa_samar), tb = el("button", "mj-tombol"); tb.type = "button"; tb.append("Tampilkan nomor");
      t.append(el("b", null, p.nama), el("small", null, `${p.jabatan}, ${p.bpbd}, disetujui admin`), nomorEl);
      tb.addEventListener("click", async () => { tb.disabled = true;
        try { const r = await fetch(`/api/lapor/meja/${nomor}/pic`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify({profil_id: p.profil_id}), signal: AbortSignal.timeout(15000)}), x = await r.json();
          if (!r.ok) { nomorEl.textContent = x.galat || "Gagal membuka nomor."; tb.disabled = false; return; }
          const a = el("a", null, `+${x.wa}`); a.href = `https://wa.me/${x.wa}`; a.target = "_blank"; a.rel = "noopener"; nomorEl.replaceChildren(a); tb.remove();
        } catch { nomorEl.textContent = "Gagal membuka nomor."; tb.disabled = false; } });
      baris.append(t, tb); w.append(baris);
    }
    /* tanpa PIC (pemilik 25 Nov 2026 "itu jelek"): baris kontak berikon, nama lembaga, asal nomor, tombol hubungi; bukan kalimat polos */
    if (d.kontak_situs) { const ks = d.kontak_situs, baris = el("div", "mj-pic-situs"), av = el("span", "mj-pic-av"), t = el("div", "mj-pic-teks");
      av.append(ikon("m-telepon"));
      const JENIS = {call_center: "Call center", pusdalops: "Pusdalops", wa: "WhatsApp", kantor: "Telepon kantor"};
      t.append(el("b", null, ks.nama), el("small", null, [JENIS[ks.jenis], "dari situs resmi"].filter(Boolean).join(", ")));
      baris.append(av, t);
      if (ks.nomor) { const digit = ks.nomor.replace(/[^\d+]/g, ""), a = el("a", "mj-tombol mj-pic-hub");
        if (ks.jenis === "wa") { a.href = `https://wa.me/${digit.replace(/^\+/, "").replace(/^0/, "62")}`; a.target = "_blank"; a.rel = "noopener"; a.append(ikon("m-wa"), ks.nomor); }
        else { a.href = `tel:${digit}`; a.append(ikon("m-telepon"), ks.nomor); }
        baris.append(a); }
      w.append(el("p", "mj-pic-catatan", "Belum ada PIC aktif di BPBD ini."), baris); }
  }).catch(() => { w.replaceChildren(el("p", "mj-redup", "PIC belum bisa dimuat.")); });
  return w;
}
function kartuPeriksa(j, kirim) {
  const k = el("section", "mj-kartu"), h = el("h3"), akhir = j.periksa?.at(-1); h.append(ikon("m-telaah"), "Pengecekan lapangan");
  if (akhir) { const p = el("span", `mj-periksa-pil ${akhir.hasil}`, akhir.label); h.append(p); }
  const w = el("div", "mj-isi-kartu"), tutup = ["selesai", "tidak_valid"].includes(j.status);
  if (j.periksa?.length) { const ol = el("ol", "mj-periksa-riwayat");
    for (const x of [...j.periksa].reverse()) { const li = el("li"); li.append(el("b", null, x.label), el("small", null, [x.waktu, x.oleh].filter(Boolean).join(", ")), el("p", null, x.catatan));
      if (x.perubahan?.length) li.append(el("p", "mj-redup", `Direvisi: ${x.perubahan.map(p => `${(j.revisi.find(r => r.nama === p.nama)?.label || p.nama)} ${p.dari ?? "belum didata"} menjadi ${F(p.ke)}`).join(", ")}`));
      ol.append(li); } w.append(ol); }
  if (tutup) { if (!j.periksa?.length) w.append(el("p", "mj-redup", "Tiket sudah ditutup.")); k.append(h, w); return k; }
  const f = el("form", "mj-periksa"); f.noValidate = false;
  const hs = el("fieldset", "mj-pilih"), lg = el("legend", "mj-label", "Hasil cek di lokasi"), kisi = el("div", "mj-hasil");
  for (const [v, t] of [["valid", "Valid"], ["sebagian", "Sebagian benar"], ["tidak_valid", "Tidak valid"]]) { const lb = el("label", v), r = el("input"); r.type = "radio"; r.name = "hasil"; r.value = v; r.required = true; lb.append(r, t); kisi.append(lb); }
  hs.append(lg, kisi);
  const cat = el("textarea"); cat.name = "catatan"; cat.required = true; cat.minLength = 5; cat.maxLength = 1000; cat.placeholder = "Apa yang dilihat di lokasi, siapa yang ditemui"; cat.setAttribute("aria-label", "Catatan pengecekan");
  // revisi angka: nilai awal = isian sekarang; hanya yang diubah dikirim
  const rv = el("details", "mj-revisi"), sm = el("summary", null, "Revisi angka laporan"), rk = el("div", "mj-revisi-kisi"), input = [];
  for (const r of j.revisi || []) { const lb = el("label"), i = el("input"); i.type = "number"; i.inputMode = "numeric"; i.min = "0"; i.max = "1000000"; i.step = "1"; i.name = r.nama; i.placeholder = "belum didata";
    if (r.nilai != null) i.value = String(r.nilai); i.dataset.awal = i.value; lb.append(el("span", null, r.label), i); rk.append(lb); input.push(i); }
  rv.append(sm, el("p", "mj-redup", "Angka asli pelapor tetap tersimpan sebagai versi sebelumnya. Isi ini hanya bila hasilnya Sebagian benar."), rk);
  const gl = el("p", "mj-pesan-galat"); gl.setAttribute("role", "alert");
  const sb = el("button", "mj-tombol isi lebar"); sb.type = "submit"; sb.append(ikon("m-centang"), "Simpan pengecekan");
  f.append(hs, cat, ...(input.length ? [rv] : []), gl, sb);
  f.addEventListener("submit", e => { e.preventDefault(); gl.textContent = "";
    const hasil = f.elements.hasil.value, ubah = Object.fromEntries(input.filter(i => i.value !== i.dataset.awal && i.value !== "").map(i => [i.name, Number(i.value)]));
    if (hasil !== "sebagian" && Object.keys(ubah).length) { gl.textContent = "Ada angka yang diubah: pilih Sebagian benar, atau kembalikan angkanya."; return; }
    kirim("periksa", {hasil, catatan: cat.value, ubah}, sb, gl); });
  w.append(f); k.append(h, w); return k;
}
/* kabar warga di kartu Alun-alun (LA-88, D139): komentar, usulan angka berkutipan, Terima/Tolak, sembunyikan/tampilkan. Diisi sesudah rincian tercat;
   kartu disembunyikan bila laporan ini tidak sedang tampil di Alun-alun. Terima menulis angka ke laporan terbaru kejadian itu (yang dibaca kartu) atas nama petugas. */
const LABEL_KOMEN = {tampil: "Tampil", dilaporkan: "Diadukan warga", tersembunyi: "Disembunyikan"};
const LABEL_ISIAN = {rumah_berat: "Rusak berat", rumah_sedang: "Rusak sedang", rumah_ringan: "Rusak ringan"};
const LABEL_PUTUS = {terima: "Diterima", tolak: "Ditolak", sembunyi: "Disembunyikan", tampil: "Ditampilkan lagi"};
function kartuKabarWarga(nomor, kartu, segarkan) {
  const w = el("div", "mj-isi-kartu"), k = kartu("Kabar warga di Situasi bencana", "m-pesan", w); k.hidden = true;
  const waktu = ms => new Date(ms).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});
  const gambarKomen = j => {
    if (!j.kartu) { k.hidden = true; return; }
    k.hidden = false; k.querySelector("h3").lastChild.textContent = `Kabar warga di Situasi bencana (${F(j.komen.length)})`;
    const gl = el("p", "mj-pesan-galat"); gl.setAttribute("role", "alert");
    const putus = async (badan, tb) => { gl.textContent = ""; tb.disabled = true;
      try { const r = await fetch(`/api/lapor/meja/${nomor}/komen`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)}), h = await r.json();
        if (!r.ok) { gl.textContent = h.galat || "Gagal menyimpan."; tb.disabled = false; return; }
        if (badan.aksi === "terima") segarkan(); else gambarKomen(h); }
      catch { gl.textContent = "Gagal menyimpan, periksa sambungan."; tb.disabled = false; } };
    const pengantar = el("p", "mj-redup", j.kartu.anggota > 1 ? `Kejadian ini menggabungkan ${F(j.kartu.anggota)} laporan. Angka yang diterima ditulis ke ${j.kartu.sasaran}, laporan yang angkanya tampil di kartu.` : "Angka yang diterima ditulis ke laporan ini sebagai versi baru atas nama Anda.");
    if (!j.komen.length) { w.replaceChildren(el("p", "mj-redup", "Belum ada kabar warga di kartu kejadian ini.")); return; }
    const ol = el("ol", "mj-komen");
    for (const c of j.komen) {
      const li = el("li", c.status), kep = el("div", "mj-komen-kep");
      kep.append(el("span", `mj-komen-pil ${c.status}`, LABEL_KOMEN[c.status] || c.status), el("small", null, [waktu(c.waktu), c.penulis.wa ? `+${c.penulis.wa}` : "Warga", c.aduan ? `${F(c.aduan)} aduan` : null].filter(Boolean).join(", ")));
      li.append(kep, el("p", "mj-komen-teks", c.teks));
      if (c.penulis.tersembunyi) li.append(el("p", "mj-redup", `${F(c.penulis.tersembunyi)} komentar dari nomor ini sudah disembunyikan.`));   // Q74: tanpa blokir otomatis
      for (const u of c.usulan) {
        const r = el("div", `mj-usul ${u.status}`), isi = el("div"); isi.append(el("b", null, `${u.label.charAt(0).toUpperCase()}${u.label.slice(1)}: ${u.nilai === 0 ? "tidak ada" : F(u.nilai)}`), el("small", null, `"${u.kutipan}"`));
        r.append(isi);
        if (u.status === "usul") {
          const deret = el("div", "mj-deret");
          let pilih = null;
          if (u.isian.length > 1) { pilih = el("select"); pilih.setAttribute("aria-label", "Tingkat kerusakan rumah"); for (const n of u.isian) pilih.append(Object.assign(el("option", null, LABEL_ISIAN[n] || n), {value: n})); deret.append(pilih); }
          const ya = el("button", "mj-tombol isi"), tidak = el("button", "mj-tombol"); ya.type = tidak.type = "button";
          ya.append(ikon("m-centang"), "Terima"); tidak.append(ikon("m-larang"), "Tolak");
          ya.addEventListener("click", () => putus({aksi: "terima", id: u.id, ...(pilih ? {isian: pilih.value} : {})}, ya));
          tidak.addEventListener("click", () => putus({aksi: "tolak", id: u.id}, tidak));
          deret.append(ya, tidak); r.append(deret);
        } else r.append(el("small", "mj-redup", [u.status === "terima" ? "Diterima" : "Ditolak", u.oleh].filter(Boolean).join(", ")));
        li.append(r);
      }
      const tb = el("button", "mj-tombol"); tb.type = "button";
      if (c.status === "tersembunyi") { tb.append(ikon("m-buka"), "Tampilkan lagi"); tb.addEventListener("click", () => putus({aksi: "tampil", id: c.id}, tb)); }
      else { tb.append(ikon("m-larang"), "Sembunyikan"); tb.addEventListener("click", () => putus({aksi: "sembunyi", id: c.id}, tb)); }
      li.append(tb);
      if (c.riwayat.length) li.append(el("small", "mj-redup", c.riwayat.map(x => `${LABEL_PUTUS[x.aksi]} ${x.oleh}, ${waktu(x.waktu)}`).join("; ")));
      ol.append(li);
    }
    w.replaceChildren(pengantar, gl, ol);
  };
  const muat = () => fetch(`/api/lapor/meja/${nomor}/komen`, {cache: "no-store"}).then(r => r.ok ? r.json() : null).then(j => j && gambarKomen(j)).catch(() => {});
  return {k, muat};
}
/* kecilkan ke JPEG sisi terpanjang 1600 px (metadata asli tidak ikut) */
async function kecilkanFoto(f) {
  try { const bmp = await createImageBitmap(f), sk = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
    c.width = Math.round(bmp.width * sk); c.height = Math.round(bmp.height * sk); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.82); }
  catch { return null; }
}
async function bukaRinci(nomor, lihat = true, fokus = null) {
  pilih = nomor;
  if (lihat) { petaMini?.remove(); petaMini = null; dlg.replaceChildren(el("p", "mj-kosong", "Memuat rincian...")); if (!dlg.open) dlg.showModal(); }
  // BPBD: rincian selalu lewat POST lihat, karena identitas pelapor hanya diberikan pada pembukaan yang tercatat (D95)
  let j; try { j = await (await (lihat || akunBpbd()   // membuka = tanda dilihat lewat POST .../lihat (kontrak Worker: GET tidak menulis); jawabannya berbentuk sama dengan rincian
    ? fetch(`/api/lapor/meja/${nomor}/lihat`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: "{}"})
    : fetch(`/api/lapor/meja/${nomor}`, {cache: "no-store"}))).json(); } catch { dlg.replaceChildren(el("p", "mj-kosong", "Rincian gagal dimuat.")); return; }
  if (j.galat) { dlg.replaceChildren(el("p", "mj-kosong", j.galat)); return; }
  const b = semua.find(x => x.nomor === nomor); if (b && b.status !== j.status) { b.status = j.status; gambar(); }
  const jenisId = j.jenisId || b?.jenisId, nilai = n => j.isian.find(x => x.nama === n);
  const kartu = (judul, ik, ...isi) => { const k = el("section", "mj-kartu"), h = el("h3"); h.append(ikon(ik), judul); k.append(h, ...isi); return k; };
  const dl = baris => { const d = el("dl"); for (const [t, v] of baris) d.append(el("dt", null, t), el("dd", v ? "" : "kosong", v || "belum didata")); return d; };
  const wadah = cls => el("div", cls || "mj-isi-kartu");

  // kepala: ikon jenis, judul, data tiket, tahap
  const kep = el("header", "mj-rinci-kepala"), atas = el("div", "mj-rk-atas"), ik = el("span", "mj-jenis-ikon besar"); ik.style.setProperty("--jn", warnaJenis(jenisId)); ik.append(ikon(ikonJenis(jenisId)));
  const kt = el("div", "mj-rk-judul"), h2 = el("h2", null, nilai("jenis")?.tampil || "Laporan"); h2.id = "rinciJudul";
  const sub = nilai("subjenis")?.tampil, meta = el("p", "mj-rk-meta"), w = j.wilayah || b?.wilayah;
  meta.append(el("span", "mj-nomor", nomor), el("span", null, [w?.kab, w?.prov].filter(Boolean).join(", ") || "Tanpa lokasi"), el("span", null, `Dilaporkan ${j.waktuLapor}`), el("span", null, `Lengkap ${j.lengkap}%`));
  { const bh = j.bahasa || b?.bahasa; if (bh && bh !== "Bahasa Indonesia") { const pb = el("span", "mj-pil-bahasa", bh); pb.title = "Bahasa yang dipakai pelapor; isi laporan tetap Bahasa Indonesia"; meta.append(pb); } }   // pemilik 20 Nov 2026
  kt.append(h2, ...(sub ? [el("p", "mj-rk-sub", sub)] : []), meta);
  const tutup = el("button", "mj-tutup"); tutup.type = "button"; tutup.setAttribute("aria-label", "Tutup rincian"); tutup.append(ikon("m-tutup")); tutup.addEventListener("click", () => dlg.close());
  atas.append(ik, kt, pil(j.status, j.statusLabel[j.status]), tutup); kep.append(atas, tahapan(j.status));

  // angka dampak laporan ini (kosong = "belum didata", tidak pernah nol)
  const d = j.dampak || b?.dampak || {}, angka = el("div", "mj-rk-angka");
  for (const [k, t, ikk, wr] of [["meninggal", "Meninggal", "m-korban", "var(--bad)"], ["hilang", "Hilang", "m-korban", "var(--warn)"], ["luka", "Luka-luka", "m-korban", "var(--brand-accent)"],
    ["mengungsi", "Mengungsi", "m-tenda", "var(--brand2)"], ["rumah", "Rumah rusak", "m-rumah", "var(--brand2)"]]) {
    const s = el("div", d[k] == null ? "kosong" : d[k] > 0 ? "isi" : ""), i = el("span", "mj-rk-ik"); i.style.setProperty("--jn", wr); i.append(ikon(ikk));
    const v = el("div"); v.append(el("b", null, d[k] == null ? "–" : F(d[k])), el("small", null, d[k] == null ? `${t}, belum didata` : `${t}${k === "rumah" ? "" : " (orang)"}`)); s.append(i, v); angka.append(s);
  }

  // tiket: catatan, pindah status, balas, dokumen
  const tk = wadah(), catatan = el("textarea"); catatan.placeholder = "Tulis catatan tiket atau balasan untuk pelapor"; catatan.maxLength = 1000; catatan.setAttribute("aria-label", "Catatan atau balasan");
  const galat = el("p", "mj-pesan-galat"); galat.setAttribute("role", "alert");
  const st = el("div", "mj-deret");
  const kirim = async (aksi, badan, tombol, gEl = galat) => {   // gEl: kartu lain (pengecekan, tindakan) menampilkan galatnya sendiri
    gEl.textContent = ""; tombol.disabled = true;
    try {
      const res = await fetch(`/api/lapor/meja/${nomor}/${aksi}`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
      const h = await res.json(); if (!res.ok) { gEl.textContent = h.galat || "Gagal menyimpan."; return; }
      catatan.value = ""; fotoCache.delete(nomor); await muat(); bukaRinci(nomor, false);
    } catch { gEl.textContent = "Gagal menyimpan, periksa sambungan."; } finally { tombol.disabled = false; }
  };
  // Ditindaklanjuti wajib menyebut tindakan (K70, D112): ketukan pertama membuka pilihan tindakan, ketukan kedua menyimpan
  const pmTindak = (j.pindah || []).includes("ditindaklanjuti") ? pemilihTindakan(j.tindakanPilihan, "Tindakan yang dilakukan") : null; if (pmTindak) pmTindak.el.hidden = true;
  for (const ke of j.pindah || []) { const bt = el("button", `mj-tombol status${ke === "tidak_valid" ? " lemah" : ""}`); bt.type = "button"; bt.style.setProperty("--st", WARNA[ke]); bt.append(el("i"), LABEL[ke]);
    if (ke === "tidak_valid") bt.title = "Tulis alasannya di kotak catatan. Untuk hasil cek di lokasi, pakai kartu Pengecekan lapangan.";
    // Selesai tanpa foto penanganan: tulis alasan di kotak catatan, lalu ketuk Selesai lagi (K60, D87); server menolak tanpa salah satunya
    bt.addEventListener("click", () => {
      if (ke === "ditindaklanjuti" && pmTindak.el.hidden) { pmTindak.el.hidden = false; bt.lastChild.textContent = "Simpan, tindaklanjuti"; pmTindak.el.querySelector("input")?.focus(); return; }
      kirim("status", {ke, catatan: catatan.value, ...(ke === "ditindaklanjuti" ? pmTindak.nilai() : {}), ...(ke === "selesai" && !(j.bukti || []).length ? {tanpaBukti: catatan.value} : {})}, bt); });
    st.append(bt); }
  const balas = el("button", "mj-tombol isi lebar"); balas.type = "button"; balas.append(ikon("m-pesan"), "Kirim balasan ke pelapor"); balas.addEventListener("click", () => kirim("balas", {teks: catatan.value}, balas));
  const dok = el("div", "mj-dok-kisi"); for (const u of j.unduhan || []) { const a = Object.assign(el("a", "mj-tombol"), {href: u.url}); a.append(ikon("m-unduh"), `Unduh ${u.label}`); dok.append(a); }
  const draf = el("button", "mj-tombol"); draf.type = "button"; draf.append(ikon("m-daftar"), "Draf logbook"); draf.title = "Buka Logbook Pusdalops dengan isian dari laporan ini"; draf.addEventListener("click", () => drafLogbook(j, draf)); if (!akunBpbd()) dok.append(draf); // Logbook Pusdalops milik BNPB
  const lacak = Object.assign(el("a", "mj-tombol"), {href: `/lapor/lacak.html?t=${j.token}`, target: "_blank", rel: "noopener"}); lacak.append(ikon("m-tiket"), "Lacak"); lacak.title = "Halaman lacak yang dilihat pelapor"; dok.append(lacak);
  const lbl = t => el("p", "mj-label", t);
  // PF-08: penangan laporan (profil BPBD). Label dari server; tombol hanya untuk BPBD pada laporan yang belum ditangani dan belum ditutup.
  const pegang = j.ditangani ? el("p", "mj-ditangani", j.ditangani) : null;
  let ambilTb = null;
  if (akunBpbd() && !j.ditangani && !["selesai", "tidak_valid"].includes(j.status)) { ambilTb = el("button", "mj-tombol isi lebar"); ambilTb.type = "button"; ambilTb.append(ikon("m-tangan"), "Saya yang menangani laporan ini"); ambilTb.addEventListener("click", async () => { const teks = ambilTb.lastChild.textContent; ambilTb.setAttribute("aria-busy", "true"); ambilTb.lastChild.textContent = "Menyimpan…";   // chrome urgent dulu, jaringan sesudahnya
      try { await kirim("ambil", {}, ambilTb); } finally { ambilTb.removeAttribute("aria-busy"); if (ambilTb.isConnected) ambilTb.lastChild.textContent = teks; } }); }
  tk.append(...(pegang ? [pegang] : []), ...(ambilTb ? [ambilTb] : []), catatan, balas, ...(st.childElementCount ? [lbl("Pindahkan status ke"), st] : []), ...(pmTindak ? [pmTindak.el] : []), galat, lbl("Dokumen"), dok);
  const kTiket = kartu("Tindak lanjut", "m-tiket", tk);
  const kPeriksa = kartuPeriksa(j, kirim);
  const kPic = !akunBpbd() ? kartu("PIC BPBD setempat", "m-orang", kartuPic(nomor)) : null;   // PF-09: hanya staf BNPB; nomor tersamar sampai dibuka (tercatat)
  // tindakan tercatat; saat Ditindaklanjuti bisa ditambah (D111)
  const kTindakan = j.tindakan?.length || j.status === "ditindaklanjuti" ? kartu(`Tindakan${j.tindakan?.length ? ` (${j.tindakan.length})` : ""}`, "m-tangan", (() => { const wt = wadah();
    if (j.tindakan?.length) wt.append(daftarTindakan(j.tindakan));
    if (j.status === "ditindaklanjuti") { const pm = pemilihTindakan(j.tindakanPilihan, "Tambah tindakan"), gt = el("p", "mj-pesan-galat"), bt = el("button", "mj-tombol lebar"); gt.setAttribute("role", "alert");
      bt.type = "button"; bt.append(ikon("m-tangan"), "Catat tindakan"); bt.addEventListener("click", () => kirim("tindakan", pm.nilai(), bt, gt)); wt.append(pm.el, gt, bt); }
    return wt; })()) : null;
  const kBukti = kartuBukti(j, nomor, kirim);
  const kPublik = kartuPublik(j, nomor, kartu), kUsulan = kartuUsulan(j, nomor, kartu);
  const kKabar = kartuKabarWarga(nomor, kartu, async () => { await muat(); bukaRinci(nomor, false); });

  // pelapor
  const p = j.pelapor, bpbd = /bpbd/i.test(p.peran || ""), wp = wadah(), siapa = el("div", "mj-siapa");
  const av = el("span", "mj-avatar", (p.nama || "?").trim().charAt(0).toUpperCase()), sn = el("div"); sn.append(el("b", null, p.nama || "Tanpa nama"), el("small", null, [p.peran, bpbd && p.kab ? `BPBD ${p.kab}` : null, bpbd ? p.jabatan : null, p.wa ? `+${p.wa}` : null].filter(Boolean).join(", ")));
  siapa.append(av, sn);
  const kontak = el("div", "mj-deret");
  if (p.wa) { const a1 = Object.assign(el("a", "mj-tombol"), {href: `https://wa.me/${p.wa}`, target: "_blank", rel: "noopener"}); a1.append(ikon("m-wa"), "Chat WhatsApp");
    const a2 = Object.assign(el("a", "mj-tombol"), {href: `tel:+${p.wa}`}); a2.append(ikon("m-telepon"), "Telepon"); kontak.append(a1, a2); }
  siapa.append(kontak); wp.append(siapa);
  const kPelapor = kartu("Pelapor", "m-orang", wp);
  const wLanjut = wadah();   // diisi sesudah rincian tercat (deferred): satu GET daftar berkas, lalu rincian berkas bila ada

  // log aktivitas: pindah status, catatan, dan balasan petugas dalam satu linimasa (pemilik 19 Nov 2026: "agar ada log-nya")
  const log = [...j.riwayat.map(x => ({w: x.waktu, ke: x.ke, judul: x.label || LABEL[x.ke], oleh: x.pelaku, ket: x.catatan})),
    ...j.balasan.map(x => ({w: x.waktu, ke: "balasan", judul: "Balasan ke pelapor", oleh: x.oleh || "Petugas", ket: x.teks}))];
  const ol = el("ol", "mj-riwayat"); for (const x of log.reverse()) { const li = el("li"); li.style.setProperty("--st", WARNA[x.ke] || "var(--brand2)"); const dv = el("div");
    dv.append(el("b", null, x.judul), el("small", null, [x.w, x.oleh].filter(Boolean).join(", ")), ...(x.ket ? [el("p", null, x.ket)] : [])); li.append(dv); ol.append(li); }
  const wl = wadah(); wl.append(ol); const kLog = kartu("Log aktivitas", "m-log", wl);

  // lokasi dengan peta kecil
  const lokTeks = nilai("lokasi")?.tampil, wPeta = el("div", "mj-peta-mini"), wLok = wadah("mj-lokasi");
  wLok.append(...(j.lat != null ? [wPeta] : []), el("p", null, lokTeks || "Lokasi belum didata"));
  const kLokasi = kartu("Lokasi", "m-lokasi", wLok);

  // isian per kelompok (lokasi sudah punya kartu sendiri)
  const per = new Map(); for (const x of j.isian) if (x.nama !== "lokasi") per.set(x.kelompok, [...(per.get(x.kelompok) || []), x]);
  const IKON_KEL = {Kejadian: "m-kejadian", Korban: "m-korban", Pengungsian: "m-tenda", "Kerusakan rumah": "m-rumah", "Warga terdampak": "m-orang"};
  const kartuKel = ([kel, xs]) => kartu(kel, IKON_KEL[kel] || "m-daftar", dl(xs.map(x => [x.label, x.status === "nihil" ? "Tidak ada" : ["kosong", "belum", "tidaktahu"].includes(x.status) ? null : x.tampil])));
  // Kejadian selebar kolom (kronologi panjang); kelompok lain dalam kisi dua kolom yang barisnya sama tinggi (memori tanpa-ruang-kosong)
  const kIsian = [...per].filter(([k]) => k === "Kejadian").map(kartuKel), kisi = el("div", "mj-isian-kisi"); kisi.append(...[...per].filter(([k]) => k !== "Kejadian").map(kartuKel));
  if (kisi.childElementCount) kIsian.push(kisi);
  const nVid = j.foto.filter(f => f.jenis === "video").length;
  const kFoto = j.foto.length ? kartu(nVid ? `Foto dan video (${j.foto.length})` : `Foto (${j.foto.length})`, "m-foto", (() => { const wf = wadah(), g = el("div", "mj-foto-kecil");
    for (const f of j.foto) {
      const ket = el("small", null, [f.lencana, f.jenis === "video" && f.durasi != null ? `${f.durasi} detik` : null].filter(Boolean).join(", "));
      if (f.jenis === "video") { // video (K57): pemutar dengan sampul; berkas dilayani dengan Range supaya bisa digeser
        const fig = el("figure", "mj-video"), v = el("video"); v.controls = true; v.preload = "none"; v.poster = f.sampul; v.src = f.url; v.playsInline = true; v.title = [f.lencana, f.waktu].filter(Boolean).join(", ");
        fig.append(v, ket); g.append(fig); continue; }
      const a = Object.assign(el("a"), {href: f.url, target: "_blank", rel: "noopener", title: [f.lencana, f.waktu].filter(Boolean).join(", ")}); const im = el("img"); im.src = f.url; im.alt = "Foto laporan"; im.loading = "lazy"; a.append(im, ket); g.append(a); }
    wf.append(g); return wf; })()) : null;
  const kTr = kartu("Percakapan", "m-pesan", (() => { const wt = el("div", "mj-transkrip");
    for (const t of j.transkrip) if (t.teks) { const pp = el("div", t.dari === "pelapor" ? "pelapor" : ""); pp.append(el("p", null, t.teks.replace(/\*/g, "")));
      if (t.asli) { const d = el("details", "mj-asli"), sm = el("summary"); sm.append(el("span", "mj-pil-ai", "diterjemahkan AI"), "Lihat teks asli"); d.append(sm, el("p", null, t.asli)); pp.append(d); } // K58, D81
      pp.append(el("small", null, t.waktu || "")); wt.append(pp); }
    return wt; })());

  // dua kolom: kiri tindakan (menempel saat digulir), kanan isi laporan
  const kiri = el("div", "mj-kolom kiri"), kanan = el("div", "mj-kolom"); const pilKiri = el("p", "mj-bagian-pil"); pilKiri.append(ikon("m-tiket"), "Penanganan"); kiri.append(pilKiri, kTiket, ...(kPic ? [kPic] : []), kPeriksa, ...(kTindakan ? [kTindakan] : []), kBukti, ...(kPublik ? [kPublik] : []), ...(kUsulan ? [kUsulan] : []), kKabar.k, ...(akunBpbd() ? [] : [kartuTeruskan(j, b, kirim)]), kPelapor, kLog); // BPBD sudah penerima terusan
  /* isi laporan dikategorikan (pemilik 19 Nov 2026 "harus dikategoriin, ada bagian dengan pill"): tiap bagian berpil berikon,
     deret pil di atas untuk lompat ke bagian; kartu tiap kelompok isian masuk bagiannya */
  const kartuKelompok = new Map([...per].map(([kel, xs]) => [kel, kartuKel([kel, xs])]));
  const ambil = (...nama) => nama.map(n => kartuKelompok.get(n)).filter(Boolean);
  const BAGIAN = [
    ["kejadian", "Kejadian dan lokasi", "m-kejadian", [...ambil("Kejadian"), (() => { const lf = el("div", "mj-isian-kisi"); lf.append(kLokasi, ...(kFoto ? [kFoto] : [])); return kFoto ? lf : kLokasi; })()]],
    ["dampak", "Dampak", "m-korban", ambil("Korban", "Warga terdampak", "Pengungsian", "Kerusakan rumah", "Fasilitas dan jalan", "Data khusus")],
    ["kebutuhan", "Kebutuhan dan layanan", "m-tenda", ambil("Kelompok rentan", "Layanan dasar", "Kebutuhan")],
    ["lanjut", "Data lanjutan", "m-daftar", [kartu("Data lanjutan BPBD", "m-daftar", wLanjut)]],   // LJ-16: muncul hanya bila tiket ini induk sebuah berkas
    ["lain", "Gugus dan percakapan", "m-pesan", [...(j.kejadian ? [kartuKejadianRinci(j.kejadian, kartu, kirim)] : []), ...(j.gugus ? [kartuGugusRinci(j.gugus, kartu)] : []), kTr]]];
  /* penduduk dan sarana dalam 1, 5, 10 km dari titik laporan (data/kajian-bnpb/inarisk KEPUTUSAN D15), lewat proksi InaRISK; diisi saat terlihat */
  if (j.lat != null && globalThis.DampakRadius) { const wr = wadah("mj-isi-kartu mj-dr"); wr.append(DampakRadius.tabel(j.lat, j.lon, [1, 5, 10], {judul: false, kaki: false, kelasTabel: "mj-tabel", kelasWadah: "mj-tabel-gulung"}));
    BAGIAN[1][3].push(kartu("Penduduk dan sarana di sekitar", "m-lokasi", wr)); }
  const terpakai = new Set(BAGIAN.flatMap(x => x[3]));   // kelompok baru yang belum dipetakan tetap tampil di Dampak
  for (const k of kartuKelompok.values()) if (!terpakai.has(k)) BAGIAN[1][3].push(k);
  const deret = el("nav", "mj-bagian-nav"); deret.setAttribute("aria-label", "Bagian laporan");
  const hidupkanLanjut = [];
  for (const [id, judul, ik, isi] of BAGIAN) {
    if (!isi.length) continue;
    const sec = el("section", "mj-bagian"); sec.id = `bag-${id}`;
    const pilJ = el("p", "mj-bagian-pil"); pilJ.append(ikon(ik), judul); sec.append(pilJ);
    const kisiB = el("div", id === "kejadian" || id === "lain" ? "mj-bagian-isi tunggal" : "mj-bagian-isi"); kisiB.append(...isi); sec.append(kisiB); kanan.append(sec);
    const bt = el("button", null); bt.type = "button"; bt.append(ikon(ik), judul); bt.addEventListener("click", () => sec.scrollIntoView({behavior: "smooth", block: "start"})); deret.append(bt);
    if (id === "lanjut") { sec.hidden = bt.hidden = true; hidupkanLanjut.push(() => { sec.hidden = bt.hidden = false; }); }
  }
  kanan.prepend(deret);
  const badan = el("div", "mj-rinci-badan"), gulung = el("div", "mj-rinci-gulung"); badan.append(kiri, kanan); gulung.append(angka, badan);
  const posisi = dlg.querySelector(".mj-rinci-gulung")?.scrollTop || 0;
  petaMini?.remove(); petaMini = null;
  dlg.replaceChildren(kep, gulung); if (!lihat) gulung.scrollTop = posisi;
  requestAnimationFrame(() => pasangDataLanjutan(nomor, wLanjut, () => hidupkanLanjut.forEach(f => f())));
  requestAnimationFrame(kKabar.muat);   // LA-88: kabar warga sesudah rincian tercat   // LJ-16: sesudah rincian tercat; daftar berkas disimpan 20 detik
  if (fokus === "periksa") { const k = dlg.querySelector(".mj-periksa"); if (k) { k.closest(".mj-kartu").scrollIntoView({block: "start"}); k.querySelector("input")?.focus({preventScroll: true}); } }
  if (j.lat != null && window.maplibregl) try {
    petaMini = new maplibregl.Map({container: wPeta, style: "https://tiles.openfreemap.org/styles/positron", center: [j.lon, j.lat], zoom: 13, interactive: false, attributionControl: false});
    const t = el("span", "mj-titik"); t.style.setProperty("--jn", warnaJenis(jenisId)); t.style.setProperty("--st", WARNA[j.status]); t.append(ikon(ikonJenis(jenisId)), el("i"));
    new maplibregl.Marker({element: bungkusPenanda(t)}).setLngLat([j.lon, j.lat]).addTo(petaMini);
  } catch (e) { wPeta.replaceChildren(); }   // tanpa WebGL: rincian tetap terbuka, tanpa peta mini
  if (lihat && peta && j.lat != null) peta.easeTo({center: [j.lon, j.lat], zoom: Math.max(peta.getZoom(), 11)});
}

$("qCari").addEventListener("input", () => gambar());
$("bUlang").addEventListener("click", () => { saringJenis.clear(); saringStatus = null; saringKab = ""; cepat.clear(); $("qCari").value = ""; periode = 0; rentang = null; gambar(); });
$("bPas").addEventListener("click", () => pasPeta());
$("bSegar").addEventListener("click", () => muat());
/* lebar menu samping bisa ditarik (memori sidebar-bisa-ditarik; pola pasangTarik di public/bnpb/operasi_lapangan.js); peta menyesuaikan lewat ResizeObserver */
{ const mj = document.querySelector(".mj"), t = $("tarikMenu"), KUNCI = "meja-lebar-menu";
  const atur = w => { w = Math.round(Math.min(420, Math.max(200, w))); mj.style.setProperty("--lebar-menu", w + "px"); return w; };
  const simpanLebar = w => { try { localStorage.setItem(KUNCI, String(w)); } catch {} };
  try { const w = +localStorage.getItem(KUNCI); if (w) atur(w); } catch {}
  let x0 = 0, w0 = 0, w = 0;
  const gerak = e => { const d = e.clientX - x0; w = atur(w0 + d); };
  const lepas = () => { t.classList.remove("aktif"); mj.classList.remove("menu-tarik"); removeEventListener("pointermove", gerak); removeEventListener("pointerup", lepas); simpanLebar(w); };
  t.addEventListener("pointerdown", e => { e.preventDefault(); x0 = e.clientX; w0 = w = t.parentElement.offsetWidth; t.classList.add("aktif"); mj.classList.add("menu-tarik"); addEventListener("pointermove", gerak); addEventListener("pointerup", lepas); });
  t.addEventListener("dblclick", () => { mj.style.removeProperty("--lebar-menu"); try { localStorage.removeItem(KUNCI); } catch {} });
  t.addEventListener("keydown", e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault();
    const tambah = e.key === "ArrowRight"; simpanLebar(atur(t.parentElement.offsetWidth + (tambah ? 24 : -24))); }); }
setInterval(() => { if (!dlg.open) muat(document.hidden); }, 20000);   // 20 detik, juga saat tab di latar: laporan darurat harus cepat terlihat (K68); di latar hanya pita darurat
document.addEventListener("visibilitychange", () => { if (!document.hidden && !dlg.open) muat(); });
muat();
