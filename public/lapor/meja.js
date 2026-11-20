/* Meja laporan staf BNPB (TIKET LA-15, KEPUTUSAN K7, K9, D22). Dasbor gaya Pantau Dalops (pemilik 19 Nov 2026 "tiru model BNPB dalops"):
   peta dengan saring jenis berikon + jumlah, saring cepat, periode, panel ringkasan, legenda; tabel di bawah; rincian dalam pop-up <dialog>.
   Kotak angka di kepala = saring status. Semua saringan berlaku serentak untuk peta, ringkasan, dan tabel.
   INP (aturan pemilik 2): tombol saring berganti keadaan seketika, peta dan tabel digambar ulang sesudah cat berikutnya.
   Angka dampak antarlaporan tidak dijumlah (laporan warga bisa ganda untuk satu kejadian): ringkasan menghitung LAPORAN, bukan korban. */
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
const chipGugus = g => { const c = el("span", `mj-gugus${g.label === "gugus kuat" ? " kuat" : ""}`); c.append(ikon("m-gugus"), `${g.label === "gugus kuat" ? "Gugus kuat" : "Gugus"}, ${F(g.n_laporan)} laporan`);
  c.title = `${g.kode}: ${F(g.n_laporan)} laporan dari ${F(g.n_pelapor)} pelapor berbeda, berdekatan waktu dan tempat. Bukan verifikasi.`; return c; };
const adaKorban = b => (b.dampak?.meninggal || 0) + (b.dampak?.hilang || 0) + (b.dampak?.luka || 0) > 0;

const provTutup = new Set(), gugusTutup = new Set();
let semua = [], saringStatus = null, saringJenis = new Set(), saringKab = "", cepat = new Set(), urut = {k: "waktu", arah: -1}, pilih = null, peta = null, penanda = [], popup = null, petaMini = null;
const fotoCache = new Map(), dlg = $("rinci");

/* meja BPBD (K63, D94-D98): halaman sama, isinya disaring server menurut wilayah akun lembaga. Tinjau lokal: ?sebagai=kab:31.75 atau prov:31
   (kuki khusus server lokal; ?sebagai=bnpb kembali ke tampilan BNPB). Di situs, akun dibaca dari sesi Ruang Instansi atau /masuk. */
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { const sb = new URLSearchParams(location.search).get("sebagai");
  if (sb) document.cookie = /^(kab:\d{2}\.\d{2}|prov:\d{2})$/.test(sb) ? `lapor_sebagai=${sb}; path=/; SameSite=Strict` : "lapor_sebagai=; path=/; max-age=0"; }
let akunMeja = {jenis: "bnpb", label: "BNPB"};
const akunBpbd = () => akunMeja.jenis === "bpbd";
async function muat() {
  try {
    const res = await fetch("/api/lapor/meja", {cache: "no-store"}), j = await res.json();
    if (!res.ok) { $("waktuSegar").textContent = j.galat || "Tidak berhak"; return; }
    if (j.akun) { akunMeja = j.akun; document.body.classList.toggle("mj-bpbd", akunBpbd());
      const sub = document.querySelector(".mj-merek small"); if (sub) sub.textContent = akunBpbd() ? `${akunMeja.label}, laporan di wilayah Anda` : "Lapor Bencana, khusus staf"; }
    semua = j.baris || [];
    $("bSegar").classList.remove("galat"); $("waktuSegar").textContent = `Data diperbarui ${new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(":", ".")}`;
    gambar();
    if (pilih && dlg.open) bukaRinci(pilih, false);
  } catch { $("bSegar").classList.add("galat"); $("waktuSegar").textContent = "Gagal memuat, ketuk untuk ulang"; }
}

/* saringan bertingkat: dasar (periode, cari, kab/kota, cepat) -> + status -> + jenis. Jumlah di tiap kontrol dihitung tanpa saringannya sendiri. */
const dasar = () => {
  const q = $("qCari").value.trim().toLowerCase(), hari = periode0(), batas = hari ? Date.now() - hari * 864e5 : 0;
  return semua.filter(b => (!batas || b.terkirim >= batas) && (!saringKab || b.wilayah?.kab === saringKab) && (!cepat.has("korban") || adaKorban(b)) && (!cepat.has("gugus") || b.gugus) && (!cepat.has("foto") || b.foto > 0) &&
    (!q || [b.nomor, b.nama, b.wa, b.wilayah?.kab, b.wilayah?.desa, b.wilayah?.prov, b.jenis, b.subjenis].filter(Boolean).join(" ").toLowerCase().includes(q)));
};
const cocokStatus = b => !saringStatus || saringStatus.includes(b.status), cocokJenis = b => !saringJenis.size || saringJenis.has(b.jenisId);

function gambar() {
  const d0 = dasar(), dSt = d0.filter(cocokStatus), dJn = d0.filter(cocokJenis), d = dSt.filter(cocokJenis);
  gambarAngka(dJn); gambarJenis(dSt); gambarCepat(d); gambarPilihan(); gambarNav(dJn);
  nanti(() => { gambarPeta(d); gambarRingkas(d); gambarLegenda(d); gambarTabel(d); });
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
    grup("Pintu lain"), item("m-pesan", "Form lapor warga", null, {href: "/lapor/"}), item("m-ringkas", "Pantau Dalops", null, {href: "/bnpb/dalops"}));
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
    b.setAttribute("aria-pressed", String(id ? saringJenis.has(id) : !saringJenis.size)); b.setAttribute("aria-label", `${t}, ${F(k)} laporan`); b.title = `${t}: ${F(k)} laporan`;
    b.disabled = !!id && !k && !saringJenis.has(id); b.append(ikon(ik), ...(k || !id || saringJenis.has(id) ? [el("span", null, t), el("b", null, F(k))] : []));
    b.addEventListener("click", () => { if (!id) saringJenis.clear(); else saringJenis.has(id) ? saringJenis.delete(id) : saringJenis.add(id); gambar(); }); return b; };
  $("pilihJenis").replaceChildren(tb(null, "Semua", "m-semua", daftar.length), ...Object.entries(JENIS).map(([id, [t, ik]]) => tb(id, t, ik, n(id))));
}
const CEPAT = [["korban", "m-korban", "Ada korban"], ["foto", "m-foto", "Ada foto"], ["gugus", "m-gugus", "Bergugus"]];
/* waktu: tombol, semua pilihan tampil (pemilik 19 Nov 2026 "tampilin aja semua pilihan ini") */
let periode = 0;
const PERIODE = [[1, "24 jam"], [7, "7 hari"], [30, "30 hari"], [0, "Semua waktu"]];
const periode0 = () => periode;
function gambarPilihan() {
  $("saringWaktu").replaceChildren(...PERIODE.map(([v, t]) => { const b = el("button", null, t); b.type = "button"; b.setAttribute("aria-pressed", String(periode === v));
    b.addEventListener("click", () => { periode = v; gambar(); }); return b; }));
  $("bUlang").disabled = !(saringJenis.size || saringStatus || saringKab || cepat.size || $("qCari").value || periode);
}
function gambarCepat(daftar) {   // chip berangka ala dalops; angka = laporan tersaring yang cocok
  const uji = {korban: adaKorban, foto: b => b.foto > 0, gugus: b => !!b.gugus};
  $("saringCepat").replaceChildren(...CEPAT.map(([k, ik, t]) => { const b = el("button"); b.type = "button"; b.setAttribute("aria-pressed", String(cepat.has(k)));
    b.append(ikon(ik), el("span", null, t), el("b", null, F(daftar.filter(uji[k]).length)));
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
  const w = document.querySelector(".mj-kiri-peta")?.offsetWidth ? document.querySelector(".mj-kiri-peta").offsetWidth + 24 : 40, kiri = sisi.ringkas === "kiri";
  peta.fitBounds(bb, {padding: {top: 100, bottom: 100, left: kiri ? w : 60, right: kiri ? 60 : w}, maxZoom: 11, duration: durasi});
}
/* pop-up titik (pemilik 19 Nov 2026 "bagusin lagi"): foto lebar dengan nomor tiket di atasnya, dampak berlabel (angka tanpa label tidak terbaca),
   aksi: Buka rincian selebar kartu, Arah dan Bagikan sejajar di bawahnya */
const SEL_POP = [["meninggal", "meninggal"], ["hilang", "hilang"], ["luka", "luka-luka"], ["mengungsi", "mengungsi"], ["rumah", "rumah rusak"]];
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
  const d = b.dampak || {}, ada = SEL_POP.filter(([k]) => d[k] != null), dp = el("div", "mj-pop-dampak");
  if (ada.length) for (const [k, lb] of ada) { const c = el("div", d[k] > 0 ? `isi ${k}` : ""); c.append(el("b", null, F(d[k])), el("small", null, lb)); dp.append(c); }
  else dp.append(el("p", null, "Dampak belum didata"));
  isi.append(dp);
  const buka = el("button", "mj-pop-buka"); buka.type = "button"; buka.append(el("span", null, "Buka rincian"), ikon("m-panah")); buka.addEventListener("click", () => { popup?.remove(); bukaRinci(b.nomor); });
  // Arah: Google Maps menuntun ke titik; Bagikan: ringkasan tanpa nomor WA pelapor (D12), lewat lembar bagikan perangkat atau salin
  const arah = Object.assign(el("a", "mj-pop-kecil"), {href: `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`, target: "_blank", rel: "noopener"});
  arah.append(ikon("m-arah"), el("span", null, "Arah")); arah.title = "Petunjuk arah ke lokasi di Google Maps";
  const bagi = el("button", "mj-pop-kecil"); bagi.type = "button"; bagi.append(ikon("m-bagi"), el("span", null, "Bagikan")); bagi.title = "Bagikan ringkasan laporan";
  bagi.addEventListener("click", () => bagikan(b, bagi));
  const kaki = el("div", "mj-pop-kaki"); kaki.append(buka, arah, bagi);
  w.append(kep, foto, isi, kaki);
  popup = new maplibregl.Popup({offset: 22, maxWidth: "310px", className: "mj-popup", closeButton: false}).setLngLat([b.lon, b.lat]).setDOMContent(w).addTo(peta);
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
    bt.title = saringKab === nama ? "Lepas saringan kab/kota" : `Saring ke ${nama}`;
    bt.addEventListener("click", () => { saringKab = saringKab === nama ? "" : nama; gambar(); if (saringKab) peta?.flyTo({center: [b.lon, b.lat], zoom: 10}); }); li.append(bt); ol.append(li); }
  const dib = daftar.map(b => b.tanggap?.dibuka).filter(v => v != null).sort((a, b) => a - b), med = dib.length ? dib[dib.length >> 1] : null, ngugus = new Set(daftar.map(b => b.gugus?.kode).filter(Boolean)).size;
  const tanpa = n(b => b.lat == null), kepala = el("div", "mj-rk-total"); kepala.append(el("b", null, F(daftar.length)), el("span", null, "laporan tersaring"));
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
function gambarLegenda(daftar) {
  const ids = [...new Set(daftar.map(b => b.jenisId).filter(Boolean))];
  const jn = ids.map(id => { const s = el("span"), i = el("i", "mj-lg-jn"); i.style.setProperty("--jn", warnaJenis(id)); i.append(ikon(ikonJenis(id))); s.append(i, JENIS[id]?.[0] || id); return s; });
  const st = Object.entries(LABEL).map(([k, v]) => { const s = el("span"), i = el("i", "mj-lg-st"); i.style.setProperty("--st", WARNA[k]); s.append(i, v); return s; });
  $("legenda").replaceChildren(...(jn.length ? [el("b", null, "Jenis"), ...jn, el("hr")] : []), el("b", null, "Status"), ...st);
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
    const jt = el("div"); jt.append(el("b", null, b.jenis || "Belum dipilih"), el("small", null, b.subjenis || ""), ...(b.gugus ? [chipGugus(b.gugus)] : [])); jn.append(ik, jt);
    const lok = el("div"); lok.append(el("b", null, b.wilayah?.kab || "Tanpa lokasi"), el("small", null, [b.wilayah?.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah?.prov].filter(Boolean).join(", ")));
    const aksi = el("div", "mj-aksi-baris");
    aksi.append(tombolAksi("m-buka", `Buka ${b.nomor}`, () => bukaRinci(b.nomor)));
    if (b.wa) aksi.append(tombolAksi("m-wa", `Chat WhatsApp ${b.nama || ""}`, {href: `https://wa.me/${b.wa}`, target: "_blank", rel: "noopener"}));
    if (b.lat != null) aksi.append(tombolAksi("m-lokasi", "Lihat di peta", () => { peta?.flyTo({center: [b.lon, b.lat], zoom: 13}); pindahTampil("peta"); requestAnimationFrame(() => bukaPopup(b)); }));
    tr.append(sel("", el("b", null, tglRingkas(b.waktuLapor))), sel("", el("span", "mj-nomor", b.nomor)),
      sel("", jn), sel("", lok), sel("angka", korbanSel(b)), sel("angka", korbanSel(b, BANGUNAN)), sel("angka", cincin(b.lengkap)), sel("angka", ft), sel("angka", pil(b.status), ...(b.tanggap?.dibuka != null ? [el("small", "mj-tanggap", `dibuka ${durasi(b.tanggap.dibuka)}`)] : b.status === "baru" ? [el("small", "mj-tanggap belum", `belum dibuka, ${durasi(Math.round((Date.now() - b.terkirim) / 60000))}`)] : [])), sel("angka", aksi));
    tr.addEventListener("click", () => bukaRinci(b.nomor));
    return tr;
  };
  /* laporan satu gugus (kejadian yang sama) dikumpulkan berurutan di bawah satu kepala gugus (pemilik 20 Nov 2026: "harusnya ada kaya merge,
     dilihat sebagai satu bencana atau dibuat saling dekat"). Angka di kepala = tertinggi antarlaporan, tidak dijumlah (D28, D107). */
  const kepalaGugus = (g, xs) => { const tr = el("tr", "mj-gugus-kepala"), td = el("td"), bt = el("button"); td.colSpan = KOLOM.length; bt.type = "button";
    const tutup = gugusTutup.has(g.kode); bt.setAttribute("aria-expanded", String(!tutup));
    const ik = el("span", "mj-jenis-ikon kecil"); ik.style.setProperty("--jn", warnaJenis(xs[0].jenisId)); ik.append(ikon(ikonJenis(xs[0].jenisId)));
    const desa = [...new Set(xs.map(b => b.wilayah?.desa).filter(Boolean))], waktu = xs.map(b => b.terkirim).sort((a, b) => a - b);
    const maks = k => Math.max(...xs.map(b => b.dampak?.[k] ?? -1)), angka = [["meninggal", "meninggal"], ["hilang", "hilang"], ["luka", "luka"], ["mengungsi", "mengungsi"], ["rumah", "rumah rusak"]]
      .map(([k, t]) => [maks(k), t]).filter(([n]) => n > 0).map(([n, t]) => `${F(n)} ${t}`);
    const tx = el("div", "mj-gugus-teks"); tx.append(el("b", null, `${xs[0].jenis || "Kejadian"}, ${xs.length} laporan dari ${F(g.n_pelapor || xs.length)} warga`),
      el("small", null, [desa.length ? `Desa/Kel. ${desa.join(", ")}` : null, xs[0].wilayah?.kab, `${tglRingkas(xs.find(b => b.terkirim === waktu[0])?.waktuLapor || "")} sampai ${tglRingkas(xs.find(b => b.terkirim === waktu.at(-1))?.waktuLapor || "")}`].filter(Boolean).join(", ")));
    const kanan = el("div", "mj-gugus-kanan"); kanan.append(...(angka.length ? [el("span", "mj-gugus-angka", `Tertinggi: ${angka.join(", ")}`)] : []), chipGugus(g));
    bt.append(ikon("m-bawah"), ik, tx, kanan);
    bt.addEventListener("click", () => { gugusTutup.has(g.kode) ? gugusTutup.delete(g.kode) : gugusTutup.add(g.kode); gambarTabel(tersaringSekarang()); });
    td.append(bt); tr.append(td); return tr; };
  const susun = xs => { const grup = new Map(); for (const b of xs) { const k = b.gugus?.kode || `#${b.nomor}`; grup.set(k, [...(grup.get(k) || []), b]); }
    return [...grup.values()].flatMap(g => g.length < 2 ? g.map(baris)
      : [kepalaGugus(g[0].gugus, g), ...(gugusTutup.has(g[0].gugus.kode) ? [] : g.map(b => { const tr = baris(b); tr.classList.add("mj-anggota"); return tr; }))]); };
  $("tbody").replaceChildren(...(daftar.length ? [...per].flatMap(([p, xs]) => [kepalaProv(p, xs), ...(provTutup.has(p) ? [] : susun(xs))]) : [(() => { const tr = el("tr"), td = el("td", "mj-kosong", "Belum ada laporan yang cocok dengan saringan."); td.colSpan = KOLOM.length; tr.append(td); return tr; })()]));
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
    catatan: `Dari laporan warga ${j.nomor} (Lapor Bencana), belum terverifikasi. ${String(n.kronologi || "").slice(0, 400)}`.trim()};
  let lama = null; try { lama = localStorage.getItem("logbook_draf_v1"); } catch {}
  if (lama && tombol.dataset.yakin !== "1") { tombol.dataset.yakin = "1"; tombol.lastChild.textContent = "Ganti draf lama? Ketuk lagi"; return; }   // jangan diam-diam menimpa draf petugas
  try { localStorage.setItem("logbook_draf_v1", JSON.stringify(d)); } catch { tombol.lastChild.textContent = "Draf tidak bisa disimpan"; return; }
  window.open("/bnpb/logbook", "_blank", "noopener");
}

/* gugus di rincian: anggota dengan angka dampak per laporan, tidak dijumlah (D28) */
function kartuGugusRinci(g, kartu) {
  const w = el("div", "mj-isi-kartu"), info = el("p", "mj-label", `${g.kode}, ${F(g.n_laporan)} laporan dari ${F(g.n_pelapor)} pelapor berbeda. Angka tiap laporan tidak dijumlah.`);
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
      `Lokasi: https://www.google.com/maps?q=${j.lat},${j.lon}`, "Laporan warga lewat Lapor Bencana BNPB, belum terverifikasi. Mohon cek lapangan dan kabari BNPB."].filter(Boolean).join("\n");
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
    const lb = el("label"), cb = el("input"); cb.type = "checkbox"; cb.checked = b.publik; lb.append(cb, "Tampil di Alun-alun"); lb.title = "Pastikan tidak ada wajah korban atau pelat kendaraan";
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
/* kecilkan ke JPEG sisi terpanjang 1600 px (metadata asli tidak ikut) */
async function kecilkanFoto(f) {
  try { const bmp = await createImageBitmap(f), sk = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
    c.width = Math.round(bmp.width * sk); c.height = Math.round(bmp.height * sk); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.82); }
  catch { return null; }
}
async function bukaRinci(nomor, lihat = true) {
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
  const kirim = async (aksi, badan, tombol) => {
    galat.textContent = ""; tombol.disabled = true;
    try {
      const res = await fetch(`/api/lapor/meja/${nomor}/${aksi}`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
      const h = await res.json(); if (!res.ok) { galat.textContent = h.galat || "Gagal menyimpan."; return; }
      catatan.value = ""; fotoCache.delete(nomor); await muat(); bukaRinci(nomor, false);
    } catch { galat.textContent = "Gagal menyimpan, periksa sambungan."; } finally { tombol.disabled = false; }
  };
  for (const ke of j.pindah || []) { const bt = el("button", `mj-tombol status${ke === "tidak_valid" ? " lemah" : ""}`); bt.type = "button"; bt.style.setProperty("--st", WARNA[ke]); bt.append(el("i"), LABEL[ke]);
    // Selesai tanpa foto penanganan: tulis alasan di kotak catatan, lalu ketuk Selesai lagi (K60, D87); server menolak tanpa salah satunya
    bt.addEventListener("click", () => kirim("status", {ke, catatan: catatan.value, ...(ke === "selesai" && !(j.bukti || []).length ? {tanpaBukti: catatan.value} : {})}, bt)); st.append(bt); }
  const balas = el("button", "mj-tombol isi lebar"); balas.type = "button"; balas.append(ikon("m-pesan"), "Kirim balasan ke pelapor"); balas.addEventListener("click", () => kirim("balas", {teks: catatan.value}, balas));
  const dok = el("div", "mj-dok-kisi"); for (const u of j.unduhan || []) { const a = Object.assign(el("a", "mj-tombol"), {href: u.url}); a.append(ikon("m-unduh"), `Unduh ${u.label}`); dok.append(a); }
  const draf = el("button", "mj-tombol"); draf.type = "button"; draf.append(ikon("m-daftar"), "Draf logbook"); draf.title = "Buka Logbook Pusdalops dengan isian dari laporan ini"; draf.addEventListener("click", () => drafLogbook(j, draf)); if (!akunBpbd()) dok.append(draf); // Logbook Pusdalops milik BNPB
  const lacak = Object.assign(el("a", "mj-tombol"), {href: `/lapor/lacak.html?t=${j.token}`, target: "_blank", rel: "noopener"}); lacak.append(ikon("m-tiket"), "Lacak"); lacak.title = "Halaman lacak yang dilihat pelapor"; dok.append(lacak);
  const lbl = t => el("p", "mj-label", t);
  tk.append(catatan, balas, ...(st.childElementCount ? [lbl("Pindahkan status ke"), st] : []), galat, lbl("Dokumen"), dok);
  const kTiket = kartu("Tindak lanjut", "m-tiket", tk);
  const kBukti = kartuBukti(j, nomor, kirim);

  // pelapor
  const p = j.pelapor, bpbd = /bpbd/i.test(p.peran || ""), wp = wadah(), siapa = el("div", "mj-siapa");
  const av = el("span", "mj-avatar", (p.nama || "?").trim().charAt(0).toUpperCase()), sn = el("div"); sn.append(el("b", null, p.nama || "Tanpa nama"), el("small", null, [p.peran, bpbd && p.kab ? `BPBD ${p.kab}` : null, bpbd ? p.jabatan : null, p.wa ? `+${p.wa}` : null].filter(Boolean).join(", ")));
  siapa.append(av, sn);
  const kontak = el("div", "mj-deret");
  if (p.wa) { const a1 = Object.assign(el("a", "mj-tombol"), {href: `https://wa.me/${p.wa}`, target: "_blank", rel: "noopener"}); a1.append(ikon("m-wa"), "Chat WhatsApp");
    const a2 = Object.assign(el("a", "mj-tombol"), {href: `tel:+${p.wa}`}); a2.append(ikon("m-telepon"), "Telepon"); kontak.append(a1, a2); }
  siapa.append(kontak); wp.append(siapa);
  const kPelapor = kartu("Pelapor", "m-orang", wp);

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
  const kiri = el("div", "mj-kolom kiri"), kanan = el("div", "mj-kolom"); const pilKiri = el("p", "mj-bagian-pil"); pilKiri.append(ikon("m-tiket"), "Penanganan"); kiri.append(pilKiri, kTiket, kBukti, ...(akunBpbd() ? [] : [kartuTeruskan(j, b, kirim)]), kPelapor, kLog); // BPBD sudah penerima terusan
  /* isi laporan dikategorikan (pemilik 19 Nov 2026 "harus dikategoriin, ada bagian dengan pill"): tiap bagian berpil berikon,
     deret pil di atas untuk lompat ke bagian; kartu tiap kelompok isian masuk bagiannya */
  const kartuKelompok = new Map([...per].map(([kel, xs]) => [kel, kartuKel([kel, xs])]));
  const ambil = (...nama) => nama.map(n => kartuKelompok.get(n)).filter(Boolean);
  const BAGIAN = [
    ["kejadian", "Kejadian dan lokasi", "m-kejadian", [...ambil("Kejadian"), (() => { const lf = el("div", "mj-isian-kisi"); lf.append(kLokasi, ...(kFoto ? [kFoto] : [])); return kFoto ? lf : kLokasi; })()]],
    ["dampak", "Dampak", "m-korban", ambil("Korban", "Warga terdampak", "Pengungsian", "Kerusakan rumah", "Fasilitas dan jalan", "Data khusus")],
    ["kebutuhan", "Kebutuhan dan layanan", "m-tenda", ambil("Kelompok rentan", "Layanan dasar", "Kebutuhan")],
    ["lain", "Gugus dan percakapan", "m-pesan", [...(j.gugus ? [kartuGugusRinci(j.gugus, kartu)] : []), kTr]]];
  const terpakai = new Set(BAGIAN.flatMap(x => x[3]));   // kelompok baru yang belum dipetakan tetap tampil di Dampak
  for (const k of kartuKelompok.values()) if (!terpakai.has(k)) BAGIAN[1][3].push(k);
  const deret = el("nav", "mj-bagian-nav"); deret.setAttribute("aria-label", "Bagian laporan");
  for (const [id, judul, ik, isi] of BAGIAN) {
    if (!isi.length) continue;
    const sec = el("section", "mj-bagian"); sec.id = `bag-${id}`;
    const pilJ = el("p", "mj-bagian-pil"); pilJ.append(ikon(ik), judul); sec.append(pilJ);
    const kisiB = el("div", id === "kejadian" || id === "lain" ? "mj-bagian-isi tunggal" : "mj-bagian-isi"); kisiB.append(...isi); sec.append(kisiB); kanan.append(sec);
    const bt = el("button", null); bt.type = "button"; bt.append(ikon(ik), judul); bt.addEventListener("click", () => sec.scrollIntoView({behavior: "smooth", block: "start"})); deret.append(bt);
  }
  kanan.prepend(deret);
  const badan = el("div", "mj-rinci-badan"), gulung = el("div", "mj-rinci-gulung"); badan.append(kiri, kanan); gulung.append(angka, badan);
  const posisi = dlg.querySelector(".mj-rinci-gulung")?.scrollTop || 0;
  petaMini?.remove(); petaMini = null;
  dlg.replaceChildren(kep, gulung); if (!lihat) gulung.scrollTop = posisi;
  if (j.lat != null && window.maplibregl) {
    petaMini = new maplibregl.Map({container: wPeta, style: "https://tiles.openfreemap.org/styles/positron", center: [j.lon, j.lat], zoom: 13, interactive: false, attributionControl: false});
    const t = el("span", "mj-titik"); t.style.setProperty("--jn", warnaJenis(jenisId)); t.style.setProperty("--st", WARNA[j.status]); t.append(ikon(ikonJenis(jenisId)), el("i"));
    new maplibregl.Marker({element: bungkusPenanda(t)}).setLngLat([j.lon, j.lat]).addTo(petaMini);
  }
  if (lihat && peta && j.lat != null) peta.easeTo({center: [j.lon, j.lat], zoom: Math.max(peta.getZoom(), 11)});
}

$("qCari").addEventListener("input", () => gambar());
$("bUlang").addEventListener("click", () => { saringJenis.clear(); saringStatus = null; saringKab = ""; cepat.clear(); $("qCari").value = ""; periode = 0; gambar(); });
$("bPas").addEventListener("click", () => pasPeta());
$("bSegar").addEventListener("click", muat);
/* sidebar fleksibel kiri atau kanan (pemilik 19 Nov 2026 "semua sidebar bisa fleksibel dibuat kiri kanan"); pilihan diingat per perangkat */
const sisi = {menu: "kiri", ringkas: "kanan"};
try { Object.assign(sisi, JSON.parse(localStorage.getItem("meja-sisi") || "{}")); } catch {}
function terapSisi() {
  document.querySelector(".mj").classList.toggle("menu-kanan", sisi.menu === "kanan");
  document.querySelector(".mj-kiri-peta").classList.toggle("di-kiri", sisi.ringkas === "kiri");
  const lab = (id, nama, ke) => { const b = $(id); b.setAttribute("aria-label", `Pindahkan ${nama} ke ${ke}`); b.title = `Pindahkan ${nama} ke ${ke}`; };
  lab("sisiMenu", "menu", sisi.menu === "kanan" ? "kiri" : "kanan"); lab("sisiRingkas", "ringkasan", sisi.ringkas === "kiri" ? "kanan" : "kiri");
  try { localStorage.setItem("meja-sisi", JSON.stringify(sisi)); } catch {}
  if (peta) requestAnimationFrame(() => peta.resize());
}
$("sisiMenu").addEventListener("click", () => { sisi.menu = sisi.menu === "kanan" ? "kiri" : "kanan"; terapSisi(); });
$("sisiRingkas").addEventListener("click", e => { e.stopPropagation(); sisi.ringkas = sisi.ringkas === "kiri" ? "kanan" : "kiri"; terapSisi(); });
terapSisi();
setInterval(() => { if (!document.hidden && !dlg.open) muat(); }, 60000);
muat();
