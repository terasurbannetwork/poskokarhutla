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
  kebakaran_gedung: ["Kebakaran", "b-gedung", null]};
const warnaReg = {};
fetch("/bencana.json").then(r => r.json()).then(j => { for (const b of j.bencana || []) warnaReg[b.id] = b.warna; gambar(); }).catch(() => {});
const warnaJenis = id => warnaReg[JENIS[id]?.[2]] || (id === "kebakaran_gedung" ? "var(--bad)" : "var(--brand2)");
const ikonJenis = id => JENIS[id]?.[1] || "m-kejadian";

const pil = (st, teks) => { const p = el("span", "mj-pil", teks || LABEL[st] || st); p.style.setProperty("--st", WARNA[st] || "var(--line)"); return p; };
const lokasiTeks = b => b.wilayah ? [b.wilayah.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah.kab].filter(Boolean).join(", ") : "Tanpa lokasi";
const pelaporSub = b => [b.peran, /bpbd/i.test(b.peran || "") ? b.instansi : null, b.wa ? `+${b.wa}` : null].filter(Boolean).join(", ");   // instansi hanya untuk petugas BPBD
const durasi = m => m == null ? null : m < 60 ? `${m} menit` : m < 1440 ? `${Math.floor(m / 60)} jam${m % 60 ? ` ${m % 60} menit` : ""}` : `${Math.floor(m / 1440)} hari${Math.floor(m % 1440 / 60) ? ` ${Math.floor(m % 1440 / 60)} jam` : ""}`;
/* gugus (A9): laporan berjenis sama, berdekatan waktu dan tempat, dari paling sedikit dua pelapor berbeda; bukan verifikasi */
const chipGugus = g => { const c = el("span", `mj-gugus${g.label === "gugus kuat" ? " kuat" : ""}`); c.append(ikon("m-gugus"), `${g.label === "gugus kuat" ? "Gugus kuat" : "Gugus"}, ${F(g.n_laporan)} laporan`);
  c.title = `${g.kode}: ${F(g.n_laporan)} laporan dari ${F(g.n_pelapor)} pelapor berbeda, berdekatan waktu dan tempat. Bukan verifikasi.`; return c; };
const adaKorban = b => (b.dampak?.meninggal || 0) + (b.dampak?.hilang || 0) + (b.dampak?.luka || 0) > 0;

let semua = [], saringStatus = null, saringJenis = new Set(), saringKab = "", cepat = new Set(), urut = {k: "waktu", arah: -1}, pilih = null, peta = null, penanda = [], popup = null, petaMini = null;
const fotoCache = new Map(), dlg = $("rinci");

async function muat() {
  try {
    const j = await (await fetch("/api/lapor/meja", {cache: "no-store"})).json();
    semua = j.baris || [];
    $("bSegar").classList.remove("galat"); $("waktuSegar").textContent = `Data diperbarui ${new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(":", ".")}`;
    gambar();
    if (pilih && dlg.open) bukaRinci(pilih, false);
  } catch { $("bSegar").classList.add("galat"); $("waktuSegar").textContent = "Gagal memuat, ketuk untuk ulang"; }
}

/* saringan bertingkat: dasar (periode, cari, kab/kota, cepat) -> + status -> + jenis. Jumlah di tiap kontrol dihitung tanpa saringannya sendiri. */
const dasar = () => {
  const q = $("qCari").value.trim().toLowerCase(), hari = Number($("sPeriode").value), batas = hari ? Date.now() - hari * 864e5 : 0;
  return semua.filter(b => (!batas || b.terkirim >= batas) && (!saringKab || b.wilayah?.kab === saringKab) && (!cepat.has("korban") || adaKorban(b)) && (!cepat.has("gugus") || b.gugus) && (!cepat.has("foto") || b.foto > 0) &&
    (!q || [b.nomor, b.nama, b.wa, b.wilayah?.kab, b.wilayah?.desa, b.wilayah?.prov, b.jenis, b.subjenis].filter(Boolean).join(" ").toLowerCase().includes(q)));
};
const cocokStatus = b => !saringStatus || saringStatus.includes(b.status), cocokJenis = b => !saringJenis.size || saringJenis.has(b.jenisId);

function gambar() {
  const d0 = dasar(), dSt = d0.filter(cocokStatus), dJn = d0.filter(cocokJenis), d = dSt.filter(cocokJenis);
  gambarAngka(dJn); gambarJenis(dSt); gambarCepat(); gambarPilihan(d0, dSt, dJn); gambarNav(dJn);
  nanti(() => { gambarPeta(d); gambarRingkas(d); gambarLegenda(d); gambarTabel(d); });
}

/* ---------- dua tampilan terpisah: Peta laporan dan Daftar laporan (pemilik 19 Nov 2026 "di halaman lain, jangan satu halaman sama peta"); alamat #peta / #daftar ---------- */
let tampil = location.hash === "#daftar" ? "daftar" : "peta";
function pindahTampil(v) {
  tampil = v; $("isi").dataset.tampil = v; if (location.hash !== `#${v}`) history.replaceState(null, "", `#${v}`);
  if (v === "peta" && peta) requestAnimationFrame(() => { peta.resize(); if (!peta._sudahPas) gambarPeta(tersaringSekarang()); });
  gambar();
}
$("isi").dataset.tampil = tampil;
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
const KOTAK = [["Semua laporan", null, "var(--head-bg)"], ["Baru, belum dibuka", ["baru"], WARNA.baru], ["Sedang ditelaah", ["dilihat", "ditelaah"], WARNA.ditelaah],
  ["Diteruskan dan ditindaklanjuti", ["diteruskan", "ditindaklanjuti"], WARNA.ditindaklanjuti], ["Selesai", ["selesai"], WARNA.selesai]];
function gambarAngka(daftar) {
  $("angka").replaceChildren(...KOTAK.map(([t, st, w]) => {
    const b = el("button"), i = el("i"), s = el("span"), n = st ? daftar.filter(x => st.includes(x.status)).length : daftar.length; b.type = "button";
    b.setAttribute("aria-pressed", String(String(saringStatus) === String(st))); i.style.setProperty("--st", w);
    const maks = Math.max(1, daftar.length), bar = el("u"); bar.style.width = `${Math.round(n / maks * 100)}%`; bar.style.setProperty("--st", w);
    b.append(i, el("span", null, t), el("b", null, F(n)), bar);
    b.addEventListener("click", () => { saringStatus = String(saringStatus) === String(st) ? null : st; gambar(); });
    return b;
  }));
}

/* ---------- di atas peta: saring jenis (pilih banyak), saring cepat, periode ---------- */
function gambarJenis(daftar) {
  const n = id => daftar.filter(b => b.jenisId === id).length;
  const semuaB = el("button", "mj-jenis-b"); semuaB.type = "button"; semuaB.setAttribute("aria-pressed", String(!saringJenis.size));
  semuaB.append(ikon("m-semua"), el("span", null, "Semua"), el("b", null, F(daftar.length)));
  semuaB.addEventListener("click", () => { saringJenis.clear(); gambar(); });
  const bs = Object.entries(JENIS).map(([id, [t, ik]]) => {
    const b = el("button", "mj-jenis-b"), k = n(id); b.type = "button"; b.style.setProperty("--jn", warnaJenis(id));
    b.setAttribute("aria-pressed", String(saringJenis.has(id))); b.disabled = !k && !saringJenis.has(id); b.title = `${t}: ${F(k)} laporan`;
    b.append(ikon(ik), ...(k || saringJenis.has(id) ? [el("span", null, t), el("b", null, F(k))] : []));   // jenis tanpa laporan: ikon saja, deret muat sebaris
    b.setAttribute("aria-label", `${t}, ${F(k)} laporan`);
    b.addEventListener("click", () => { saringJenis.has(id) ? saringJenis.delete(id) : saringJenis.add(id); gambar(); });
    return b;
  });
  $("saringJenis").replaceChildren(semuaB, ...bs);
}
const CEPAT = [["korban", "m-korban", "Ada korban"], ["foto", "m-foto", "Ada foto"], ["gugus", "m-gugus", "Bergugus"]];
/* baris saring: pilihan jenis, status, dan kab/kota memakai keadaan yang sama dengan deret jenis di peta dan kotak angka di kepala */
const opsi = (sel, daftar, nilai) => { sel.replaceChildren(...daftar.map(([v, t, mati]) => { const o = new Option(t, v); o.disabled = !!mati; return o; })); sel.value = nilai; };
function gambarPilihan(d0, dSt, dJn) {
  const nJ = id => dSt.filter(b => b.jenisId === id).length, nS = st => dJn.filter(b => b.status === st).length;
  opsi($("sJenis"), [["", "Semua jenis"], ...(saringJenis.size > 1 ? [["*", `${saringJenis.size} jenis dipilih di peta`, true]] : []),
    ...Object.entries(JENIS).map(([id, [t]]) => [id, `${t} (${F(nJ(id))})`, !nJ(id) && !saringJenis.has(id)])], saringJenis.size === 1 ? [...saringJenis][0] : saringJenis.size ? "*" : "");
  const stSatu = saringStatus?.length === 1 ? saringStatus[0] : saringStatus ? "*" : "";
  opsi($("sStatus"), [["", "Semua status"], ...(stSatu === "*" ? [["*", KOTAK.find(k => String(k[1]) === String(saringStatus))?.[0] || "Beberapa status", true]] : []),
    ...Object.entries(LABEL).map(([k, t]) => [k, `${t} (${F(nS(k))})`])], stSatu);
  const kab = new Map(); for (const b of semua) if (b.wilayah?.kab) kab.set(b.wilayah.kab, (kab.get(b.wilayah.kab) || 0) + 1);
  opsi($("sKab"), [["", "Semua kab/kota"], ...[...kab].sort((a, b) => a[0].localeCompare(b[0], "id")).map(([k]) => [k, k.replace(/^Kota Administrasi /, "Kota ")])], saringKab);
  const aktif = saringJenis.size || saringStatus || saringKab || cepat.size || $("qCari").value || $("sPeriode").value !== "0";
  $("bUlang").disabled = !aktif;
}
function gambarCepat() {
  $("saringCepat").replaceChildren(...CEPAT.map(([k, ik, t]) => { const b = el("button"); b.type = "button"; b.setAttribute("aria-pressed", String(cepat.has(k)));
    b.append(ikon(ik), t); b.addEventListener("click", () => { cepat.has(k) ? cepat.delete(k) : cepat.add(k); gambar(); }); return b; }));
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
  const w = () => document.querySelector(".mj-kiri-peta")?.offsetWidth ? document.querySelector(".mj-kiri-peta").offsetWidth + 24 : 40;
  peta.fitBounds(bb, {padding: {top: 100, bottom: 100, left: w("ringkas"), right: 60}, maxZoom: 11, duration: durasi});
}
function bukaPopup(b) {
  popup?.remove();
  const w = el("div", "mj-pop"), kep = el("div", "mj-pop-kepala"); kep.style.setProperty("--jn", warnaJenis(b.jenisId));
  const ik = el("span", "mj-pop-ik"); ik.append(ikon(ikonJenis(b.jenisId)));
  const t = el("div"); t.append(el("b", null, b.jenis || "Laporan"), el("small", null, b.subjenis || "")); kep.append(ik, t, pil(b.status));
  const foto = el("div", "mj-pop-foto");
  if (b.foto) fotoLaporan(b.nomor).then(fs => { if (fs[0]) { const im = el("img"); im.src = fs[0].url; im.alt = "Foto laporan"; foto.append(im); if (fs.length > 1) foto.append(el("small", null, `${fs.length} foto`)); } });
  const baris = (ikk, teks, k) => { const r = el("div", `mj-pop-baris${k ? ` ${k}` : ""}`); r.append(ikon(ikk), el("span", null, teks)); return r; };
  const isi = el("div", "mj-pop-isi");
  isi.append(baris("m-tiket", b.nomor, "nomor"), baris("m-lokasi", [b.wilayah?.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah?.kab?.replace(/^Kota Administrasi /, "Kota ")].filter(Boolean).join(", ") || "Tanpa lokasi"),
    baris("m-log", b.waktuLapor), baris("m-orang", [b.nama || "Tanpa nama", b.peran].filter(Boolean).join(", ")), korbanSel(b));
  const buka = el("button", "mj-pop-buka"); buka.type = "button"; buka.append(el("span", null, "Buka rincian"), ikon("m-panah")); buka.addEventListener("click", () => { popup?.remove(); bukaRinci(b.nomor); });
  // Arah: Google Maps menuntun ke titik; Bagikan: ringkasan tanpa nomor WA pelapor (D12), lewat lembar bagikan perangkat atau salin
  const arah = Object.assign(el("a", "mj-pop-kecil"), {href: `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`, target: "_blank", rel: "noopener"});
  arah.append(ikon("m-arah"), el("span", null, "Arah")); arah.title = "Petunjuk arah ke lokasi di Google Maps";
  const bagi = el("button", "mj-pop-kecil"); bagi.type = "button"; bagi.append(ikon("m-bagi"), el("span", null, "Bagikan")); bagi.title = "Bagikan ringkasan laporan";
  bagi.addEventListener("click", () => bagikan(b, bagi));
  const kaki = el("div", "mj-pop-kaki"); kaki.append(buka, arah, bagi);
  w.append(kep, foto, isi, kaki);
  popup = new maplibregl.Popup({offset: 22, maxWidth: "290px", className: "mj-popup", closeButton: false}).setLngLat([b.lon, b.lat]).setDOMContent(w).addTo(peta);
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
    bt.addEventListener("click", () => peta?.flyTo({center: [b.lon, b.lat], zoom: 10})); li.append(bt); ol.append(li); }
  const ubin = (ik, t, v, w) => { const u = el("div", `mj-rk-ubin${v ? "" : " nol"}`); u.style.setProperty("--jn", w); const i = el("span", "mj-rk-ik"); i.style.setProperty("--jn", w); i.append(ikon(ik)); u.append(i, el("b", null, F(v)), el("small", null, t)); return u; };
  const kisi = el("div", "mj-rk-kisi"); kisi.append(ubin("m-korban", "ada korban jiwa atau luka", n(adaKorban), "var(--bad)"), ubin("m-tenda", "ada warga mengungsi", n(b => b.dampak?.mengungsi > 0), "var(--warn)"),
    ubin("m-rumah", "ada rumah rusak", n(b => b.dampak?.rumah > 0), "var(--brand2)"), ubin("m-foto", "berfoto", n(b => b.foto > 0), "var(--ok)"));
  const tanpa = n(b => b.lat == null), kepala = el("div", "mj-rk-total"); kepala.append(el("b", null, F(daftar.length)), el("span", null, "laporan tersaring"));
  const dib = daftar.map(b => b.tanggap?.dibuka).filter(v => v != null).sort((a, b) => a - b), med = dib.length ? dib[dib.length >> 1] : null, ngugus = new Set(daftar.map(b => b.gugus?.kode).filter(Boolean)).size;
  const tg = el("div", "mj-rk-tanggap"); tg.append(el("span", null, "Median sampai dibuka"), el("b", null, med == null ? "belum ada" : durasi(med)), el("span", null, "Gugus laporan"), el("b", null, F(ngugus)));
  det.querySelector(".mj-ringkas-isi").replaceChildren(kepala, kisi, tg, ...(tanpa ? [el("p", "mj-rk-catat", `${F(tanpa)} laporan tanpa titik lokasi, tidak tampil di peta`)] : []),
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
function korbanSel(b) {
  const d = b.dampak || {}, w = el("div", "mj-korban");
  if ([d.meninggal, d.hilang, d.luka].every(v => v == null)) { w.append(el("small", null, "belum didata")); return w; }
  for (const [k, t] of [["meninggal", "Meninggal"], ["hilang", "Hilang"], ["luka", "Luka-luka"]]) {   // ikon berlabel, tanpa singkatan (pemilik 19 Nov 2026 "kasih icon")
    const s = el("span", d[k] > 0 ? `isi ${k}` : ""), v = d[k] == null ? "–" : F(d[k]); s.title = `${t}: ${d[k] == null ? "belum didata" : `${v} orang`}`; s.setAttribute("aria-label", s.title);
    s.append(ikon(`m-${k}`), el("b", null, v)); w.append(s); }
  return w;
}
/* urut tabel: kepala kolom = tombol; ketuk lagi membalik arah */
const KOLOM = [["waktu", "Waktu lapor", b => b.terkirim], ["tiket", "Tiket", b => b.nomor], ["jenis", "Jenis", b => b.jenis || ""], ["lokasi", "Lokasi", b => b.wilayah?.kab || ""],
  ["korban", "Korban", b => (b.dampak?.meninggal || 0) * 1e6 + (b.dampak?.hilang || 0) * 1e3 + (b.dampak?.luka || 0)], ["pelapor", "Pelapor", b => b.nama || ""],
  ["lengkap", "Lengkap", b => b.lengkap], ["foto", "Foto", b => b.foto], ["status", "Status", b => b.status === "tidak_valid" ? -1 : TAHAP.indexOf(b.status)], ["aksi", "Aksi", null]];
function gambarKepala() {
  $("kepalaTabel").replaceChildren(...KOLOM.map(([k, t, f]) => {
    const th = el("th"); if (!f) { th.textContent = t; return th; }
    if (k === "korban") th.title = "Meninggal, hilang, luka-luka";
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
  $("tbody").replaceChildren(...(daftar.length ? daftar.map(b => {
    const tr = el("tr"); if (b.nomor === pilih) tr.classList.add("pilih");
    const sel = (k, ...isi) => { const td = el("td", k); td.append(...isi); return td; };
    const bar = el("span", "mj-bar"), bi = el("i"); bi.style.width = `${b.lengkap}%`; bar.append(bi);
    const ft = el("span", "mj-mini"); ft.textContent = b.foto ? "" : "Tanpa foto";
    if (b.foto) fotoLaporan(b.nomor).then(fs => { if (fs[0]) { const im = el("img"); im.src = fs[0].url; im.alt = ""; im.loading = "lazy"; ft.append(im); if (fs.length > 1) ft.append(el("small", null, `+${fs.length - 1}`)); } });
    const jn = el("div", "mj-sel-jenis"), ik = el("span", "mj-jenis-ikon kecil"); ik.style.setProperty("--jn", warnaJenis(b.jenisId)); ik.append(ikon(ikonJenis(b.jenisId)));
    const jt = el("div"); jt.append(el("b", null, b.jenis || "Belum dipilih"), el("small", null, b.subjenis || ""), ...(b.gugus ? [chipGugus(b.gugus)] : [])); jn.append(ik, jt);
    const lok = el("div"); lok.append(el("b", null, b.wilayah?.kab || "Tanpa lokasi"), el("small", null, [b.wilayah?.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah?.prov].filter(Boolean).join(", ")));
    const aksi = el("div", "mj-aksi-baris");
    aksi.append(tombolAksi("m-buka", `Buka ${b.nomor}`, () => bukaRinci(b.nomor)));
    if (b.wa) aksi.append(tombolAksi("m-wa", `Chat WhatsApp ${b.nama || ""}`, {href: `https://wa.me/${b.wa}`, target: "_blank", rel: "noopener"}));
    if (b.lat != null) aksi.append(tombolAksi("m-lokasi", "Lihat di peta", () => { peta?.flyTo({center: [b.lon, b.lat], zoom: 13}); pindahTampil("peta"); requestAnimationFrame(() => bukaPopup(b)); }));
    tr.append(sel("", el("b", null, b.waktuLapor)), sel("", el("span", "mj-nomor", b.nomor)),
      sel("", jn), sel("", lok), sel("angka", korbanSel(b)), sel("", el("b", null, b.nama || "Tanpa nama"), el("small", null, pelaporSub(b))),
      sel("angka", el("b", null, `${b.lengkap}%`), bar), sel("angka", ft), sel("angka", pil(b.status), ...(b.tanggap?.dibuka != null ? [el("small", "mj-tanggap", `dibuka ${durasi(b.tanggap.dibuka)}`)] : b.status === "baru" ? [el("small", "mj-tanggap belum", `belum dibuka, ${durasi(Math.round((Date.now() - b.terkirim) / 60000))}`)] : [])), sel("angka", aksi));
    tr.addEventListener("click", () => bukaRinci(b.nomor));
    return tr;
  }) : [(() => { const tr = el("tr"), td = el("td", "mj-kosong", "Belum ada laporan yang cocok dengan saringan."); td.colSpan = 10; tr.append(td); return tr; })()]));
}
const fotoLaporan = nomor => { if (!fotoCache.has(nomor)) fotoCache.set(nomor, fetch(`/api/lapor/meja/${nomor}`).then(r => r.json()).then(j => j.foto || []).catch(() => [])); return fotoCache.get(nomor); };

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
  w.append(isi);
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

async function bukaRinci(nomor, lihat = true) {
  pilih = nomor;
  if (lihat) { petaMini?.remove(); petaMini = null; dlg.replaceChildren(el("p", "mj-kosong", "Memuat rincian...")); if (!dlg.open) dlg.showModal(); }
  let j; try { j = await (await fetch(`/api/lapor/meja/${nomor}${lihat ? "?lihat=1" : ""}`, {cache: "no-store"})).json(); } catch { dlg.replaceChildren(el("p", "mj-kosong", "Rincian gagal dimuat.")); return; }
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
    bt.addEventListener("click", () => kirim("status", {ke, catatan: catatan.value}, bt)); st.append(bt); }
  const balas = el("button", "mj-tombol isi lebar"); balas.type = "button"; balas.append(ikon("m-pesan"), "Kirim balasan ke pelapor"); balas.addEventListener("click", () => kirim("balas", {teks: catatan.value}, balas));
  const dok = el("div", "mj-deret"); for (const u of j.unduhan || []) { const a = Object.assign(el("a", "mj-tombol"), {href: u.url}); a.append(ikon("m-unduh"), u.label); dok.append(a); }
  const lacak = Object.assign(el("a", "mj-tombol"), {href: `/lapor/lacak.html?t=${j.token}`, target: "_blank", rel: "noopener"}); lacak.append(ikon("m-tiket"), "Lacak"); lacak.title = "Halaman lacak yang dilihat pelapor"; dok.append(lacak);
  const lbl = t => el("p", "mj-label", t);
  tk.append(catatan, balas, ...(st.childElementCount ? [lbl("Pindahkan status ke"), st] : []), galat, lbl("Dokumen"), dok);
  const kTiket = kartu("Tindak lanjut", "m-tiket", tk);

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
  const kFoto = j.foto.length ? kartu(`Foto (${j.foto.length})`, "m-foto", (() => { const wf = wadah(), g = el("div", "mj-foto-kecil");
    for (const f of j.foto) { const a = Object.assign(el("a"), {href: f.url, target: "_blank", rel: "noopener", title: [f.lencana, f.waktu].filter(Boolean).join(", ")}); const im = el("img"); im.src = f.url; im.alt = "Foto laporan"; im.loading = "lazy"; a.append(im, el("small", null, f.lencana || "")); g.append(a); }
    wf.append(g); return wf; })()) : null;
  const kTr = kartu("Percakapan", "m-pesan", (() => { const wt = el("div", "mj-transkrip");
    for (const t of j.transkrip) if (t.teks) { const pp = el("div", t.dari === "pelapor" ? "pelapor" : ""); pp.append(el("p", null, t.teks.replace(/\*/g, "")), el("small", null, t.waktu || "")); wt.append(pp); }
    return wt; })());

  // dua kolom: kiri tindakan (menempel saat digulir), kanan isi laporan
  const kiri = el("div", "mj-kolom kiri"), kanan = el("div", "mj-kolom"); kiri.append(kTiket, kartuTeruskan(j, b, kirim), kPelapor, kLog);
  if (j.gugus) kanan.append(kartuGugusRinci(j.gugus, kartu));
  const lf = el("div", "mj-isian-kisi"); lf.append(kLokasi, ...(kFoto ? [kFoto] : []));   // lokasi dan foto berdampingan: pop-up lebih pendek
  kanan.append(kFoto ? lf : kLokasi, ...kIsian, kTr);
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
$("sPeriode").addEventListener("change", () => gambar());
$("sJenis").addEventListener("change", e => { const v = e.target.value; if (v === "*") return; saringJenis = new Set(v ? [v] : []); gambar(); });
$("sStatus").addEventListener("change", e => { const v = e.target.value; if (v === "*") return; saringStatus = v ? [v] : null; gambar(); });
$("sKab").addEventListener("change", e => { saringKab = e.target.value; gambar(); nanti(() => pasPeta(undefined, 600)); });
$("bUlang").addEventListener("click", () => { saringJenis.clear(); saringStatus = null; saringKab = ""; cepat.clear(); $("qCari").value = ""; $("sPeriode").value = "0"; gambar(); });
$("bPas").addEventListener("click", () => pasPeta());
$("bSegar").addEventListener("click", muat);
setInterval(() => { if (!document.hidden && !dlg.open) muat(); }, 60000);
muat();
