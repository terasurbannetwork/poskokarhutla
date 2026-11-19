/* Meja laporan staf BNPB (TIKET LA-15, KEPUTUSAN K7, K9, D22). Satu layar: peta di atas, tabel di bawah; kotak angka di kepala = saring status;
   kolom Aksi berikon; rincian dalam pop-up <dialog> dengan tiket, log aktivitas, dan percakapan (pemilik 19 Nov 2026).
   Data dari /api/lapor/meja dan /api/lapor/meja/<nomor>. Diperbarui tiap 60 detik saat layar terlihat. */
const $ = id => document.getElementById(id);
const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const ikon = id => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", `#${id}`); s.setAttribute("aria-hidden", "true"); s.append(u); return s; };
const WARNA = {baru: "var(--info)", dilihat: "var(--accent)", ditelaah: "var(--warn)", diteruskan: "var(--brand2)", ditindaklanjuti: "var(--brand-accent)", selesai: "var(--ok)", tidak_valid: "var(--ink2)"};
const LABEL = {baru: "Baru", dilihat: "Dilihat", ditelaah: "Ditelaah", diteruskan: "Diteruskan", ditindaklanjuti: "Ditindaklanjuti", selesai: "Selesai", tidak_valid: "Tidak valid"};
const pil = (st, teks) => { const p = el("span", "mj-pil", teks || LABEL[st] || st); p.style.setProperty("--st", WARNA[st] || "var(--line)"); return p; };
const lokasiTeks = b => b.wilayah ? [b.wilayah.desa && `Desa/Kel. ${b.wilayah.desa}`, b.wilayah.kab].filter(Boolean).join(", ") : "Tanpa lokasi";
const pelaporSub = b => [b.peran, /bpbd/i.test(b.peran || "") ? b.instansi : null, b.wa ? `+${b.wa}` : null].filter(Boolean).join(", "); // instansi hanya untuk petugas BPBD

let semua = [], saringStatus = null, pilih = null, peta = null, penanda = [], fotoCache = new Map();
const dlg = $("rinci");

async function muat() {
  try {
    const j = await (await fetch("/api/lapor/meja", {cache: "no-store"})).json();
    semua = j.baris || [];
    $("waktuSegar").textContent = `Diperbarui ${new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(":", ".")}`;
    const sj = $("sJenis"), j0 = sj.value;
    sj.replaceChildren(new Option("Semua jenis", ""), ...[...new Set(semua.map(b => b.jenis).filter(Boolean))].sort().map(x => new Option(x, x))); sj.value = j0;
    gambar();
    if (pilih && dlg.open) bukaRinci(pilih, false);
  } catch { $("waktuSegar").textContent = "Gagal memuat, coba segarkan"; }
}
const tersaring = () => {
  const q = $("qCari").value.trim().toLowerCase(), j = $("sJenis").value;
  return semua.filter(b => (!j || b.jenis === j) && (!saringStatus || saringStatus.includes(b.status)) &&
    (!q || [b.nomor, b.nama, b.wa, b.wilayah?.kab, b.wilayah?.desa, b.jenis].filter(Boolean).join(" ").toLowerCase().includes(q)));
};

/* kotak angka = tombol saring status; ketuk lagi untuk melepas */
const KOTAK = [["Semua laporan", null, "var(--on-head)"], ["Baru, belum dibuka", ["baru"], WARNA.baru], ["Sedang ditelaah", ["dilihat", "ditelaah"], WARNA.ditelaah],
  ["Diteruskan dan ditindaklanjuti", ["diteruskan", "ditindaklanjuti"], WARNA.ditindaklanjuti], ["Selesai", ["selesai"], WARNA.selesai]];
function gambarAngka() {
  $("angka").replaceChildren(...KOTAK.map(([t, st, w]) => {
    const b = el("button"), i = el("i"), s = el("span"), n = st ? semua.filter(x => st.includes(x.status)).length : semua.length; b.type = "button";
    b.setAttribute("aria-pressed", String(String(saringStatus) === String(st))); i.style.setProperty("--st", w);
    s.append(el("b", null, String(n)), el("small", null, t)); b.append(i, s);
    b.addEventListener("click", () => { saringStatus = String(saringStatus) === String(st) ? null : st; gambar(); });
    return b;
  }));
}
function gambar() { const d = tersaring(); gambarAngka(); gambarPeta(d); gambarTabel(d); }

function tombolAksi(ik, label, aksi) { const b = el(aksi.href ? "a" : "button", "mj-ikon"); if (aksi.href) Object.assign(b, aksi); else { b.type = "button"; b.addEventListener("click", e => { e.stopPropagation(); aksi(); }); }
  b.setAttribute("aria-label", label); b.title = label; b.append(ikon(ik)); if (aksi.href) b.addEventListener("click", e => e.stopPropagation()); return b; }

function gambarTabel(daftar) {
  $("tbody").replaceChildren(...(daftar.length ? daftar.map(b => {
    const tr = el("tr"); if (b.nomor === pilih) tr.classList.add("pilih");
    const sel = (k, ...isi) => { const td = el("td", k); td.append(...isi); return td; };
    const bar = el("span", "mj-bar"), bi = el("i"); bi.style.width = `${b.lengkap}%`; bar.append(bi);
    const ft = el("span", "mj-mini"); ft.textContent = b.foto ? "" : "Tanpa foto";
    if (b.foto) fotoLaporan(b.nomor).then(fs => { if (fs[0]) { const im = el("img"); im.src = fs[0].url; im.alt = ""; im.loading = "lazy"; ft.append(im); if (fs.length > 1) ft.append(el("small", null, `+${fs.length - 1}`)); } });
    const aksi = el("div", "mj-aksi-baris");
    aksi.append(tombolAksi("m-buka", `Buka ${b.nomor}`, () => bukaRinci(b.nomor)));
    if (b.wa) aksi.append(tombolAksi("m-wa", `Chat WhatsApp ${b.nama || ""}`, {href: `https://wa.me/${b.wa}`, target: "_blank", rel: "noopener"}));
    if (b.lat != null) aksi.append(tombolAksi("m-lokasi", "Lihat di peta", () => { peta?.flyTo({center: [b.lon, b.lat], zoom: 13}); $("peta").scrollIntoView({behavior: "smooth", block: "nearest"}); }));
    tr.append(sel("", el("b", null, b.waktuLapor), el("small", null, b.waktuKejadian ? `Kejadian ${b.waktuKejadian}` : "")), sel("", el("span", "mj-nomor", b.nomor)),
      sel("", el("b", null, b.nama || "Tanpa nama"), el("small", null, pelaporSub(b))), sel("", el("b", null, b.jenis || "Belum dipilih"), el("small", null, b.subjenis || "")),
      sel("", lokasiTeks(b)), sel("angka", el("b", null, `${b.lengkap}%`), bar), sel("angka", ft), sel("angka", pil(b.status)), sel("angka", aksi));
    tr.addEventListener("click", () => bukaRinci(b.nomor));
    return tr;
  }) : [(() => { const tr = el("tr"), td = el("td", "mj-kosong", "Belum ada laporan yang cocok."); td.colSpan = 9; tr.append(td); return tr; })()]));
}

function gambarPeta(daftar) {
  if (!peta) {
    if (!window.maplibregl) { $("peta").replaceChildren(el("p", "mj-kosong", "Peta tidak termuat.")); return; }
    peta = new maplibregl.Map({container: "peta", style: "https://tiles.openfreemap.org/styles/positron", center: [117, -2.5], zoom: 4.2, minZoom: 3, maxZoom: 17,
      dragRotate: false, pitchWithRotate: false, cooperativeGestures: true, attributionControl: {compact: true}});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    $("legenda").replaceChildren(el("b", null, "Status tiket"), ...Object.entries(LABEL).map(([k, v]) => { const s = el("span"), i = el("i"); i.style.setProperty("--st", WARNA[k]); s.append(i, v); return s; }));
    peta.once("load", () => gambarPeta(tersaring()));
    return;
  }
  for (const m of penanda) m.remove(); penanda = [];
  const ada = daftar.filter(b => b.lat != null);
  for (const b of ada) {
    const n = el("button", `mj-titik${b.nomor === pilih ? " pilih" : ""}`); n.type = "button"; n.style.setProperty("--st", WARNA[b.status]); n.append(ikon("m-kejadian"));
    n.setAttribute("aria-label", `${b.nomor}, ${b.jenis || "laporan"}, ${LABEL[b.status]}`); n.title = `${b.nomor} ${b.jenis || ""}, ${lokasiTeks(b)}`;
    n.addEventListener("click", () => bukaRinci(b.nomor));
    penanda.push(new maplibregl.Marker({element: n}).setLngLat([b.lon, b.lat]).addTo(peta));
  }
  if (ada.length && !peta._sudahPas) { peta._sudahPas = true; const bb = new maplibregl.LngLatBounds(); for (const b of ada) bb.extend([b.lon, b.lat]); peta.fitBounds(bb, {padding: 60, maxZoom: 11, duration: 0}); }
}
const fotoLaporan = nomor => { if (!fotoCache.has(nomor)) fotoCache.set(nomor, fetch(`/api/lapor/meja/${nomor}`).then(r => r.json()).then(j => j.foto || []).catch(() => [])); return fotoCache.get(nomor); };

/* ---------- pop-up rincian: membuka = tiket "Dilihat" (pelapor melihat tahapnya di halaman lacak) ---------- */
// light dismiss: closedby="any"; peramban tanpa dukungan (Safari) memakai klik di luar kotak dialog
if (!("closedBy" in HTMLDialogElement.prototype)) dlg.addEventListener("click", e => { if (e.target !== dlg) return; const r = dlg.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close(); });
dlg.addEventListener("close", () => { pilih = null; gambar(); });

async function bukaRinci(nomor, lihat = true) {
  pilih = nomor;
  if (lihat) { dlg.replaceChildren(el("p", "mj-kosong", "Memuat rincian...")); if (!dlg.open) dlg.showModal(); }
  let j; try { j = await (await fetch(`/api/lapor/meja/${nomor}${lihat ? "?lihat=1" : ""}`, {cache: "no-store"})).json(); } catch { dlg.replaceChildren(el("p", "mj-kosong", "Rincian gagal dimuat.")); return; }
  if (j.galat) { dlg.replaceChildren(el("p", "mj-kosong", j.galat)); return; }
  const b = semua.find(x => x.nomor === nomor); if (b && b.status !== j.status) { b.status = j.status; gambar(); }
  const kartu = (judul, ik, ...isi) => { const k = el("section", "mj-kartu"), h = el("h3"); h.append(ikon(ik), judul); k.append(h, ...isi); return k; };
  const dl = baris => { const d = el("dl"); for (const [t, v] of baris) d.append(el("dt", null, t), el("dd", v ? "" : "kosong", v || "belum didata")); return d; };
  const wadah = cls => el("div", cls || "mj-isi-kartu");

  // kepala
  const kep = el("header", "mj-rinci-kepala"), kt = el("div"), tutup = el("button", "mj-tutup"); tutup.type = "button"; tutup.setAttribute("aria-label", "Tutup rincian"); tutup.append(ikon("m-tutup")); tutup.addEventListener("click", () => dlg.close());
  const jenis = j.isian.find(x => x.nama === "jenis")?.tampil, h2 = el("h2", null, jenis || "Laporan"); h2.id = "rinciJudul";
  const sub = el("p"); sub.append(el("span", "mj-nomor", nomor), `  Dilaporkan ${j.waktuLapor}, lengkap ${j.lengkap}%`);
  kt.append(h2, sub, pil(j.status, j.statusLabel[j.status])); kep.append(kt, tutup);

  // tiket: catatan, pindah status, balas, dokumen
  const tk = wadah(), catatan = el("textarea"); catatan.placeholder = "Catatan untuk tiket atau balasan untuk pelapor"; catatan.maxLength = 1000; catatan.setAttribute("aria-label", "Catatan atau balasan");
  const galat = el("p", "mj-pesan-galat"), st = el("div", "mj-aksi");
  const kirim = async (aksi, badan) => {
    galat.textContent = "";
    const res = await fetch(`/api/lapor/meja/${nomor}/${aksi}`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
    const h = await res.json(); if (!res.ok) { galat.textContent = h.galat || "Gagal menyimpan."; return; }
    catatan.value = ""; fotoCache.delete(nomor); await muat(); bukaRinci(nomor, false);
  };
  for (const ke of j.pindah || []) { const bt = el("button", `mj-tombol${ke === "tidak_valid" ? " lemah" : " utama"}`); bt.type = "button"; bt.style.setProperty("--st", WARNA[ke]); bt.append(el("i"), LABEL[ke]);
    bt.addEventListener("click", () => kirim("status", {ke, catatan: catatan.value})); st.append(bt); }
  const balas = el("button", "mj-tombol"); balas.type = "button"; balas.append(ikon("m-pesan"), "Kirim balasan"); balas.addEventListener("click", () => kirim("balas", {teks: catatan.value}));
  const dok = el("div", "mj-aksi"); for (const u of j.unduhan || []) { const a = Object.assign(el("a", "mj-tombol"), {href: u.url}); a.append(ikon("m-unduh"), u.label); dok.append(a); }
  const lacak = Object.assign(el("a", "mj-tombol"), {href: `/lapor/lacak.html?t=${j.token}`, target: "_blank", rel: "noopener"}); lacak.append(ikon("m-tiket"), "Halaman lacak"); dok.append(lacak);
  const lbl = t => el("p", "mj-label", t), bBalas = el("div", "mj-aksi"); bBalas.append(balas);
  tk.append(catatan, lbl("Pindahkan status ke"), st, bBalas, galat, lbl("Dokumen"), dok);
  const kTiket = kartu("Tiket dan tindak lanjut", "m-tiket", tk);

  // pelapor
  const p = j.pelapor, kontak = el("div", "mj-aksi");
  if (p.wa) { const a1 = Object.assign(el("a", "mj-tombol"), {href: `https://wa.me/${p.wa}`, target: "_blank", rel: "noopener"}); a1.append(ikon("m-wa"), "Chat WhatsApp");
    const a2 = Object.assign(el("a", "mj-tombol"), {href: `tel:+${p.wa}`}); a2.append(ikon("m-telepon"), "Telepon"); kontak.append(a1, a2); }
  const bpbd = /bpbd/i.test(p.peran || ""), wp = wadah(); wp.append(kontak);
  const kPelapor = kartu("Pelapor", "m-orang", dl([["Nama", p.nama], ["Melapor sebagai", p.peran], ...(bpbd ? [["Instansi", p.kab ? `BPBD ${p.kab}` : null], ["Jabatan", p.jabatan]] : []), ["Nomor WA", p.wa ? `+${p.wa}` : null]]), wp);

  // log aktivitas: pindah status, catatan, dan balasan petugas dalam satu linimasa (pemilik 19 Nov 2026: "agar ada log-nya")
  const log = [...j.riwayat.map(x => ({w: x.waktu, ke: x.ke, judul: x.label || LABEL[x.ke], ket: [x.pelaku, x.catatan].filter(Boolean).join(": "), urut: x.waktuMs})),
    ...j.balasan.map(x => ({w: x.waktu, ke: "balasan", judul: "Balasan ke pelapor", ket: `${x.oleh || "Petugas"}: ${x.teks}`}))];
  const ol = el("ol", "mj-riwayat"); for (const x of log.reverse()) { const li = el("li"); li.style.setProperty("--st", WARNA[x.ke] || "var(--brand2)"); const d = el("div"); d.append(el("b", null, x.judul), el("small", null, [x.w, x.ket].filter(Boolean).join(", "))); li.append(d); ol.append(li); }
  const wl = wadah(); wl.append(ol); const kLog = kartu("Log aktivitas", "m-log", wl);

  // isian per kelompok
  const per = new Map(); for (const x of j.isian) per.set(x.kelompok, [...(per.get(x.kelompok) || []), x]);
  const kIsian = [...per].map(([kel, xs]) => kartu(kel, kel === "Kejadian" ? "m-kejadian" : "m-daftar", dl(xs.map(x => [x.label, ["kosong", "belum"].includes(x.status) ? null : x.tampil]))));
  const kFoto = j.foto.length ? kartu(`Foto (${j.foto.length})`, "m-foto", (() => { const w = wadah(), g = el("div", "mj-foto-kecil");
    for (const f of j.foto) { const a = Object.assign(el("a"), {href: f.url, target: "_blank", rel: "noopener", title: [f.lencana, f.waktu].filter(Boolean).join(", ")}); const im = el("img"); im.src = f.url; im.alt = "Foto laporan"; im.loading = "lazy"; a.append(im, el("small", null, f.lencana || "")); g.append(a); }
    w.append(g); return w; })()) : null;
  const kTr = kartu("Percakapan", "m-pesan", (() => { const w = el("div", "mj-transkrip"); for (const t of j.transkrip) if (t.teks) w.append(el("p", t.dari === "pelapor" ? "pelapor" : "", t.teks.replace(/\*/g, ""))); return w; })());

  // dua kolom: kiri tindakan (tiket, pelapor, log), kanan isi laporan
  const kiri = el("div", "mj-kolom"), kanan = el("div", "mj-kolom"); kiri.append(kTiket, kPelapor, kLog); kanan.append(...(kFoto ? [kFoto] : []), ...kIsian, kTr);
  const badan = el("div", "mj-rinci-badan"); badan.append(kiri, kanan);
  dlg.replaceChildren(kep, badan);
  if (lihat && peta && j.lat != null) peta.easeTo({center: [j.lon, j.lat], zoom: Math.max(peta.getZoom(), 11)});
}

for (const id of ["qCari", "sJenis"]) $(id).addEventListener("input", () => gambar());
$("bSegar").addEventListener("click", muat);
setInterval(() => { if (!document.hidden && !dlg.open) muat(); }, 60000);
muat();
