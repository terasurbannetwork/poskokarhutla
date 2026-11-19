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
const adaKorban = b => (b.dampak?.meninggal || 0) + (b.dampak?.hilang || 0) + (b.dampak?.luka || 0) > 0;

let semua = [], saringStatus = null, saringJenis = new Set(), cepat = new Set(), pilih = null, peta = null, penanda = [], popup = null, petaMini = null;
const fotoCache = new Map(), dlg = $("rinci");

async function muat() {
  try {
    const j = await (await fetch("/api/lapor/meja", {cache: "no-store"})).json();
    semua = j.baris || [];
    $("waktuSegar").textContent = `Diperbarui ${new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(":", ".")}`;
    gambar();
    if (pilih && dlg.open) bukaRinci(pilih, false);
  } catch { $("waktuSegar").textContent = "Gagal memuat, coba segarkan"; }
}

/* saringan bertingkat: dasar (periode, cari, cepat) -> + status -> + jenis. Jumlah di tiap kontrol dihitung tanpa saringannya sendiri. */
const dasar = () => {
  const q = $("qCari").value.trim().toLowerCase(), hari = Number($("sPeriode").value), batas = hari ? Date.now() - hari * 864e5 : 0;
  return semua.filter(b => (!batas || b.terkirim >= batas) && (!cepat.has("korban") || adaKorban(b)) && (!cepat.has("foto") || b.foto > 0) &&
    (!q || [b.nomor, b.nama, b.wa, b.wilayah?.kab, b.wilayah?.desa, b.wilayah?.prov, b.jenis, b.subjenis].filter(Boolean).join(" ").toLowerCase().includes(q)));
};
const cocokStatus = b => !saringStatus || saringStatus.includes(b.status), cocokJenis = b => !saringJenis.size || saringJenis.has(b.jenisId);

function gambar() {
  const d0 = dasar(), dSt = d0.filter(cocokStatus), dJn = d0.filter(cocokJenis), d = dSt.filter(cocokJenis);
  gambarAngka(dJn); gambarJenis(dSt); gambarCepat();
  nanti(() => { gambarPeta(d); gambarRingkas(d); gambarLegenda(d); gambarTabel(d); });
}

/* ---------- kepala: kotak angka = saring status ---------- */
const KOTAK = [["Semua laporan", null, "var(--on-head)"], ["Baru, belum dibuka", ["baru"], WARNA.baru], ["Sedang ditelaah", ["dilihat", "ditelaah"], WARNA.ditelaah],
  ["Diteruskan dan ditindaklanjuti", ["diteruskan", "ditindaklanjuti"], WARNA.ditindaklanjuti], ["Selesai", ["selesai"], WARNA.selesai]];
function gambarAngka(daftar) {
  $("angka").replaceChildren(...KOTAK.map(([t, st, w]) => {
    const b = el("button"), i = el("i"), s = el("span"), n = st ? daftar.filter(x => st.includes(x.status)).length : daftar.length; b.type = "button";
    b.setAttribute("aria-pressed", String(String(saringStatus) === String(st))); i.style.setProperty("--st", w);
    s.append(el("b", null, F(n)), el("small", null, t)); b.append(i, s);
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
const CEPAT = [["korban", "m-korban", "Ada korban"], ["foto", "m-foto", "Ada foto"]];
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
    peta.once("load", () => gambarPeta(tersaringSekarang()));
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
  if (ada.length && !peta._sudahPas) { peta._sudahPas = true; pasPeta(ada, 0); }
}
const bungkusPenanda = n => { const w = el("div"); w.append(n); return w; };   // lihat meja.css: gaya hanya pada anak
const tersaringSekarang = () => dasar().filter(cocokStatus).filter(cocokJenis);
function pasPeta(ada = tersaringSekarang().filter(b => b.lat != null), durasi = 600) {
  if (!peta || !ada.length) return;
  const bb = new maplibregl.LngLatBounds(); for (const b of ada) bb.extend([b.lon, b.lat]);
  peta.fitBounds(bb, {padding: {top: 120, bottom: 120, left: 300, right: 70}, maxZoom: 11, duration: durasi});
}
function bukaPopup(b) {
  popup?.remove();
  const w = el("div", "mj-pop"), kep = el("div", "mj-pop-kepala"), ik = el("span", "mj-jenis-ikon"); ik.style.setProperty("--jn", warnaJenis(b.jenisId)); ik.append(ikon(ikonJenis(b.jenisId)));
  const t = el("div"); t.append(el("b", null, b.jenis || "Laporan"), el("small", null, b.subjenis || "")); kep.append(ik, t);
  const dl = el("dl"); for (const [k, v] of [["Tiket", b.nomor], ["Lokasi", lokasiTeks(b)], ["Dilaporkan", b.waktuLapor], ["Pelapor", [b.nama, b.peran].filter(Boolean).join(", ")]]) dl.append(el("dt", null, k), el("dd", null, v || "belum didata"));
  const kaki = el("div", "mj-pop-kaki"), buka = el("button", "mj-tombol isi"); buka.type = "button"; buka.append(ikon("m-buka"), "Buka rincian"); buka.addEventListener("click", () => { popup?.remove(); bukaRinci(b.nomor); });
  kaki.append(pil(b.status), buka);
  const mini = el("div", "mj-pop-foto");
  if (b.foto) fotoLaporan(b.nomor).then(fs => { if (fs[0]) { const im = el("img"); im.src = fs[0].url; im.alt = "Foto laporan"; mini.append(im); } });
  w.append(kep, mini, dl, kaki);
  popup = new maplibregl.Popup({offset: 20, maxWidth: "300px", className: "mj-popup"}).setLngLat([b.lon, b.lat]).setDOMContent(w).addTo(peta);
}

/* ---------- panel ringkasan di kiri peta: jumlah LAPORAN, bukan jumlah korban ---------- */
function gambarRingkas(daftar) {
  const r = $("ringkas"), det = r.querySelector("details") || (() => { const d = el("details"); d.open = matchMedia("(min-width: 900px)").matches; const s = el("summary"); s.append(ikon("m-ringkas"), "Ringkasan"); d.append(s, el("div", "mj-ringkas-isi")); r.append(d); return d; })();
  const n = f => daftar.filter(f).length, baris = (ik, t, v, w) => { const p = el("div", "mj-rk-baris"), i = el("span", "mj-rk-ik"); if (w) i.style.setProperty("--jn", w); i.append(ikon(ik)); p.append(i, el("span", null, t), el("b", null, F(v))); return p; };
  const kab = new Map(); for (const b of daftar) if (b.wilayah?.kab) { const k = kab.get(b.wilayah.kab) || {n: 0, b}; k.n++; kab.set(b.wilayah.kab, k); }
  const atas = [...kab].sort((a, b) => b[1].n - a[1].n).slice(0, 5), maks = atas[0]?.[1].n || 1;
  const ol = el("ol", "mj-rk-kab"); for (const [nama, {n: k, b}] of atas) { const li = el("li"), bt = el("button"), bar = el("i"); bt.type = "button"; bar.style.width = `${Math.round(k / maks * 100)}%`;
    bt.append(el("span", null, nama.replace(/^Kota Administrasi /, "Kota ")), el("b", null, F(k)), bar); bt.title = `Dekatkan peta ke ${nama}`;
    bt.addEventListener("click", () => peta?.flyTo({center: [b.lon, b.lat], zoom: 10})); li.append(bt); ol.append(li); }
  det.querySelector(".mj-ringkas-isi").replaceChildren(
    el("p", "mj-rk-label", "Laporan tersaring"),
    baris("m-daftar", "Laporan", daftar.length),
    baris("m-korban", "Ada korban jiwa atau luka", n(adaKorban), "var(--bad)"),
    baris("m-tenda", "Ada warga mengungsi", n(b => b.dampak?.mengungsi > 0), "var(--warn)"),
    baris("m-rumah", "Ada rumah rusak", n(b => b.dampak?.rumah > 0), "var(--brand2)"),
    baris("m-foto", "Berfoto", n(b => b.foto > 0)),
    baris("m-lokasi", "Tanpa titik lokasi", n(b => b.lat == null), "var(--ink2)"),
    ...(atas.length ? [el("p", "mj-rk-label", "Kab/kota terbanyak"), ol] : []));
}
function gambarLegenda(daftar) {
  const ids = [...new Set(daftar.map(b => b.jenisId).filter(Boolean))];
  const jn = ids.map(id => { const s = el("span"), i = el("i", "mj-lg-jn"); i.style.setProperty("--jn", warnaJenis(id)); i.append(ikon(ikonJenis(id))); s.append(i, JENIS[id]?.[0] || id); return s; });
  const st = Object.entries(LABEL).map(([k, v]) => { const s = el("span"), i = el("i", "mj-lg-st"); i.style.setProperty("--st", WARNA[k]); s.append(i, v); return s; });
  $("legenda").replaceChildren(...(jn.length ? [el("b", null, "Jenis"), ...jn, el("hr")] : []), el("b", null, "Titik kecil = status"), ...st);
}

/* ---------- tabel ---------- */
function tombolAksi(ik, label, aksi) { const b = el(aksi.href ? "a" : "button", "mj-ikon"); if (aksi.href) Object.assign(b, aksi); else { b.type = "button"; b.addEventListener("click", e => { e.stopPropagation(); aksi(); }); }
  b.setAttribute("aria-label", label); b.title = label; b.append(ikon(ik)); if (aksi.href) b.addEventListener("click", e => e.stopPropagation()); return b; }
function korbanSel(b) {
  const d = b.dampak || {}, w = el("div", "mj-korban");
  if ([d.meninggal, d.hilang, d.luka].every(v => v == null)) { w.append(el("small", null, "belum didata")); return w; }
  for (const [k, t] of [["meninggal", "MD"], ["hilang", "H"], ["luka", "L"]]) { const s = el("span", d[k] > 0 ? "isi" : "", `${d[k] == null ? "–" : F(d[k])} ${t}`); s.title = {meninggal: "Meninggal", hilang: "Hilang", luka: "Luka-luka"}[k]; w.append(s); }
  return w;
}
function gambarTabel(daftar) {
  $("nTabel").textContent = `${F(daftar.length)} dari ${F(semua.length)}`;
  $("tbody").replaceChildren(...(daftar.length ? daftar.map(b => {
    const tr = el("tr"); if (b.nomor === pilih) tr.classList.add("pilih");
    const sel = (k, ...isi) => { const td = el("td", k); td.append(...isi); return td; };
    const bar = el("span", "mj-bar"), bi = el("i"); bi.style.width = `${b.lengkap}%`; bar.append(bi);
    const ft = el("span", "mj-mini"); ft.textContent = b.foto ? "" : "Tanpa foto";
    if (b.foto) fotoLaporan(b.nomor).then(fs => { if (fs[0]) { const im = el("img"); im.src = fs[0].url; im.alt = ""; im.loading = "lazy"; ft.append(im); if (fs.length > 1) ft.append(el("small", null, `+${fs.length - 1}`)); } });
    const jn = el("div", "mj-sel-jenis"), ik = el("span", "mj-jenis-ikon kecil"); ik.style.setProperty("--jn", warnaJenis(b.jenisId)); ik.append(ikon(ikonJenis(b.jenisId)));
    const jt = el("div"); jt.append(el("b", null, b.jenis || "Belum dipilih"), el("small", null, b.subjenis || "")); jn.append(ik, jt);
    const lok = el("div"); lok.append(el("b", null, b.wilayah?.kab || "Tanpa lokasi"), el("small", null, [b.wilayah?.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah?.prov].filter(Boolean).join(", ")));
    const aksi = el("div", "mj-aksi-baris");
    aksi.append(tombolAksi("m-buka", `Buka ${b.nomor}`, () => bukaRinci(b.nomor)));
    if (b.wa) aksi.append(tombolAksi("m-wa", `Chat WhatsApp ${b.nama || ""}`, {href: `https://wa.me/${b.wa}`, target: "_blank", rel: "noopener"}));
    if (b.lat != null) aksi.append(tombolAksi("m-lokasi", "Lihat di peta", () => { peta?.flyTo({center: [b.lon, b.lat], zoom: 13}); bukaPopup(b); $("peta").scrollIntoView({behavior: "smooth", block: "nearest"}); }));
    tr.append(sel("", el("b", null, b.waktuLapor), el("small", null, b.waktuKejadian ? `Kejadian ${b.waktuKejadian}` : "")), sel("", el("span", "mj-nomor", b.nomor)),
      sel("", jn), sel("", lok), sel("angka", korbanSel(b)), sel("", el("b", null, b.nama || "Tanpa nama"), el("small", null, pelaporSub(b))),
      sel("angka", el("b", null, `${b.lengkap}%`), bar), sel("angka", ft), sel("angka", pil(b.status)), sel("angka", aksi));
    tr.addEventListener("click", () => bukaRinci(b.nomor));
    return tr;
  }) : [(() => { const tr = el("tr"), td = el("td", "mj-kosong", "Belum ada laporan yang cocok dengan saringan."); td.colSpan = 10; tr.append(td); return tr; })()]));
}
const fotoLaporan = nomor => { if (!fotoCache.has(nomor)) fotoCache.set(nomor, fetch(`/api/lapor/meja/${nomor}`).then(r => r.json()).then(j => j.foto || []).catch(() => [])); return fotoCache.get(nomor); };

/* ---------- pop-up rincian: membuka = tiket "Dilihat" (pelapor melihat tahapnya di halaman lacak) ---------- */
// light dismiss: closedby="any"; peramban tanpa dukungan (Safari) memakai klik di luar kotak dialog
if (!("closedBy" in HTMLDialogElement.prototype)) dlg.addEventListener("click", e => { if (e.target !== dlg) return; const r = dlg.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close(); });
dlg.addEventListener("close", () => { pilih = null; petaMini?.remove(); petaMini = null; gambar(); });

function tahapan(status) {
  const ol = el("ol", "mj-tahap"); ol.setAttribute("aria-label", "Tahap tiket");
  if (status === "tidak_valid") { const li = el("li", "kini"); li.style.setProperty("--st", WARNA.tidak_valid); li.append(el("i"), el("span", null, "Ditandai tidak valid")); ol.append(li); return ol; }
  const k = TAHAP.indexOf(status);
  TAHAP.forEach((t, i) => { const li = el("li", i < k ? "lewat" : i === k ? "kini" : ""); li.style.setProperty("--st", WARNA[t]); if (i === k) li.setAttribute("aria-current", "step"); li.append(el("i"), el("span", null, LABEL[t])); ol.append(li); });
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
  const av = el("span", "mj-avatar", (p.nama || "?").trim().charAt(0).toUpperCase()), sn = el("div"); sn.append(el("b", null, p.nama || "Tanpa nama"), el("small", null, [p.peran, bpbd && p.kab ? `BPBD ${p.kab}` : null, bpbd ? p.jabatan : null].filter(Boolean).join(", ")));
  siapa.append(av, sn);
  const kontak = el("div", "mj-deret");
  if (p.wa) { const a1 = Object.assign(el("a", "mj-tombol"), {href: `https://wa.me/${p.wa}`, target: "_blank", rel: "noopener"}); a1.append(ikon("m-wa"), "Chat WhatsApp");
    const a2 = Object.assign(el("a", "mj-tombol"), {href: `tel:+${p.wa}`}); a2.append(ikon("m-telepon"), "Telepon"); kontak.append(a1, a2); }
  wp.append(siapa, dl([["Nomor WA", p.wa ? `+${p.wa}` : null]]), kontak);
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
  const kiri = el("div", "mj-kolom kiri"), kanan = el("div", "mj-kolom"); kiri.append(kTiket, kPelapor, kLog);
  kanan.append(kLokasi, ...(kFoto ? [kFoto] : []), ...kIsian, kTr);
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
$("bPas").addEventListener("click", () => pasPeta());
$("bSegar").addEventListener("click", muat);
setInterval(() => { if (!document.hidden && !dlg.open) muat(); }, 60000);
muat();
