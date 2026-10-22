/* Tab Proyek: daftar, unggah GeoJSON/KML, detail (peta, data satelit, asumsi, kredit, peringatan, tahap) dan laporan pemantauan satelit
   (PDF jspdf vendor + XLSX). Simpan memakai penguncian optimistis: `diubah` dikirim, 409 = minta muat ulang. */
import * as AK from "./akuntansi.js";
import {S, h, ganti, ang, T, tgl, json, hariIni, judul, tombol, pil, kosong, tabel, pilihan, hias, kabar, api, kirim, daftar, pesanGalat, petaBaru, batas, muatLib, keXlsx, CONTOH} from "./alat.js";
import {TAHAP, STATUS_PER, SUMBER_PER, label, prov, statDari, blokStat, penaksir, tabelKredit, ringkasKeuangan, proyeksi, formAsumsi, LABEL_ASUMSI} from "./ranah.js";

let petaD = null;   // satu peta detail hidup; yang lama dilepas sebelum membangun lagi
const LABEL_MRV = "Estimasi satelit pra-verifikasi, bukan kredit tersertifikasi";
export async function muatProyek() { S.proyek = daftar(await api("/api/karbon/proyek"), "proyek"); }
export async function muatDetail(id, paksa) {
  if (!paksa && S.detail.has(id)) return S.detail.get(id);
  const j = await api("/api/karbon/proyek/" + encodeURIComponent(id)), p = j.proyek || j;
  S.detail.set(id, p); return p;
}
/* tarik statistik GFW untuk batas proyek (lambat: beberapa kueri GFW) */
export const tarikStat = id => kirim(`/api/karbon/stat/${encodeURIComponent(id)}`, {});
export const asumsiProyek = p => AK.gabungAsumsi(json(p.asumsi) || {});

export async function render(panel, id) {
  if (id) return detail(panel, id);
  const baru = S.peringatan.reduce((m, x) => (x.status === "baru" && m.set(x.proyek_id, (m.get(x.proyek_id) || 0) + 1), m), new Map());
  const berkas = h("input", {type: "file", accept: ".geojson,.json,.kml,application/geo+json,application/vnd.google-earth.kml+xml", hidden: true, onchange: e => unggah(e.target.files[0])});
  ganti(panel,
    judul("Proyek", "Proyek karbon yang sedang dikembangkan atau dipantau.", h("label", {class: "kb-btn"}, "Unggah batas (GeoJSON/KML)", berkas)),
    S.proyek.length ? tabel([
      {t: "Proyek", kelas: "kb-nama", f: p => p.nama},
      {t: "Tahap", f: p => pil(label(TAHAP, p.tahap), "t-" + p.tahap)},
      {t: "Provinsi", f: p => prov(p.prov)},
      {t: "Kabupaten", kelas: "kb-o", f: p => p.kab || "–"},
      {t: "Luas (ha)", n: 1, f: p => ang(p.luas_ha)},
      {t: "Peringatan baru", n: 1, f: p => ang(baru.get(p.id) || 0)},
      {t: "Data satelit", f: p => p.stat_diambil ? pil("Ada", "ya") : pil("Belum", "tidak")},
      {t: "Diubah", f: p => tgl(p.diubah)},
    ], S.proyek, {klik: p => { location.hash = "#proyek/" + p.id; }}) : kosong("Belum ada proyek. Buat dari tab Penyaringan atau unggah batas areal."));
}

/* ---------- unggah GeoJSON / KML → MultiPolygon ---------- */
function geomDari(teks, nama) {
  const poli = [];
  if (/\.kml$/i.test(nama) || /^\s*<\?xml|<kml/i.test(teks)) {
    const doc = new DOMParser().parseFromString(teks, "application/xml"), cincin = el => [...(el?.querySelectorAll("coordinates") || [])].map(c => c.textContent.trim().split(/\s+/).map(t => t.split(",").slice(0, 2).map(Number)));
    for (const pg of doc.getElementsByTagName("Polygon")) poli.push([...cincin(pg.getElementsByTagName("outerBoundaryIs")[0]), ...[...pg.getElementsByTagName("innerBoundaryIs")].flatMap(cincin)]);
  } else {
    const g = JSON.parse(teks), jalan = x => { if (!x) return; if (x.type === "FeatureCollection") x.features.forEach(jalan); else if (x.type === "Feature") jalan(x.geometry);
      else if (x.type === "GeometryCollection") x.geometries.forEach(jalan); else if (x.type === "Polygon") poli.push(x.coordinates); else if (x.type === "MultiPolygon") poli.push(...x.coordinates); };
    jalan(g);
  }
  const sah = poli.filter(p => p[0]?.length >= 4 && p.flat().every(c => Number.isFinite(c[0]) && Number.isFinite(c[1]) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90));
  if (!sah.length) throw new Error("tidak ada poligon yang terbaca");
  return {type: "MultiPolygon", coordinates: sah};
}
/* ponytail: luas ekuirektangular per cincin (galat < 1% untuk poligon seukuran konsesi); stat GFW memberi luas resmi sesudah ditarik */
function luasHa(g) {
  const cincin = r => { let a = 0; const k = Math.cos(r[0][1] * Math.PI / 180) * 111320, m = 110540; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * k * r[i + 1][1] * m - r[i + 1][0] * k * r[i][1] * m; return Math.abs(a / 2); };
  return g.coordinates.reduce((s, p) => s + cincin(p[0]) - p.slice(1).reduce((x, r) => x + cincin(r), 0), 0) / 1e4;
}
async function unggah(f) {
  if (!f) return;
  let geom;
  try { geom = geomDari(await f.text(), f.name); } catch (e) { kabar("Berkas tidak terbaca: " + e.message); return; }
  if (JSON.stringify(geom).length > 1048576) { kabar("Geometri lebih dari 1 MB. Sederhanakan dulu (misalnya mapshaper) lalu unggah lagi."); return; }
  const d = h("dialog", {class: "dlg", "aria-label": "Proyek baru"}), luas = luasHa(geom);
  const f2 = h("form", {class: "kb-asumsi", method: "dialog"},
    h("fieldset", null, h("legend", null, `Batas terbaca: ${ang(geom.coordinates.length)} poligon, ±${ang(luas)} ha`),
      h("label", {class: "kb-f"}, h("span", null, "Nama proyek"), h("input", {name: "nama", required: true, maxlength: 200, value: f.name.replace(/\.(geo)?json$|\.kml$/i, "")})),
      h("label", {class: "kb-f"}, h("span", null, "Pemegang"), h("input", {name: "pemegang", maxlength: 200})),
      h("label", {class: "kb-f"}, h("span", null, "Provinsi"), pilihan([["", "–"], ...Object.entries(window.Wilayah?.PROV || {})], "", {name: "prov"})),
      h("label", {class: "kb-f"}, h("span", null, "Kabupaten"), h("input", {name: "kab", maxlength: 100}))),
    h("div", {class: "kb-aksi"}, h("button", {class: "kb-btn", value: "ok"}, "Simpan proyek"), h("button", {class: "kb-btn ke2", value: "batal", formnovalidate: true}, "Batal")));
  d.append(h("div", {class: "dh"}, h("div", null, h("h3", null, "Proyek baru dari berkas"), h("p", null, f.name))), h("div", {class: "db"}, f2));
  d.addEventListener("close", async () => {
    d.remove(); if (d.returnValue !== "ok") return;
    const v = Object.fromEntries(new FormData(f2));
    try { const j = await kirim("/api/karbon/proyek", {...v, prov: v.prov || null, tahap: "identifikasi", geom}); await muatProyek(); location.hash = "#proyek/" + j.id; }
    catch (e) { kabar(pesanGalat(e, "membuat proyek")); }
  });
  document.body.append(d); d.showModal();
}

/* ---------- detail ---------- */
async function detail(panel, id) {
  ganti(panel, h("p", {class: "kb-st"}, "Memuat proyek…"));
  let p;
  try { p = await muatDetail(id); } catch (e) { ganti(panel, tombol("← Semua proyek", () => { location.hash = "#proyek"; }, "ke2"), kosong(e.status === 404 ? "Proyek tidak ditemukan." : pesanGalat(e, "memuat proyek"))); return; }
  let a = asumsiProyek(p);
  const st = json(p.stat), geom = json(p.geom), per = S.peringatan.filter(x => x.proyek_id === id);
  const simpan = async (isi, apa) => {
    try { const j = await kirim("/api/karbon/proyek", {id, ...isi, diubah: p.diubah}); Object.assign(p, isi, {diubah: j.diubah ?? p.diubah}); if (isi.asumsi) p.asumsi = JSON.stringify(isi.asumsi); await muatProyek(); kabar(`${apa} tersimpan.`); }
    catch (e) { kabar(pesanGalat(e, "menyimpan " + apa.toLowerCase())); }
  };
  /* identitas + tahap */
  const fId = h("form", {class: "kb-asumsi", onsubmit: e => { e.preventDefault(); const v = Object.fromEntries(new FormData(fId)); simpan(v, "Data proyek"); }},
    h("fieldset", null, h("legend", null, "Data proyek"),
      h("label", {class: "kb-f"}, h("span", null, "Tahap"), pilihan(TAHAP, p.tahap, {name: "tahap"})),
      h("label", {class: "kb-f"}, h("span", null, "Nama"), h("input", {name: "nama", value: p.nama, required: true, maxlength: 200})),
      h("label", {class: "kb-f"}, h("span", null, "Pemegang"), h("input", {name: "pemegang", value: p.pemegang ?? "", maxlength: 200})),
      h("label", {class: "kb-f"}, h("span", null, "Kegiatan"), h("input", {name: "jenis_kegiatan", value: p.jenis_kegiatan ?? "", maxlength: 80})),
      h("label", {class: "kb-f"}, h("span", null, "Metodologi"), h("input", {name: "metodologi", value: p.metodologi ?? "", maxlength: 120})),
      h("label", {class: "kb-f kb-lebar"}, h("span", null, "Catatan"), h("textarea", {name: "catatan", maxlength: 2000, rows: 2}, p.catatan ?? ""))),
    h("div", {class: "kb-aksi"}, h("button", {class: "kb-btn"}, "Simpan data proyek")));
  /* data satelit */
  const btnStat = tombol(st ? "Tarik ulang data satelit" : "Tarik data satelit", async () => {
    if (!geom) { kabar("Proyek ini belum punya batas areal."); return; }
    btnStat.disabled = true; btnStat.textContent = "Menarik data satelit… bisa 1–2 menit";
    try { await tarikStat(id); await muatDetail(id, true); await muatProyek(); kabar("Data satelit diperbarui."); detail(panel, id); }
    catch (e) { btnStat.disabled = false; btnStat.textContent = "Tarik data satelit"; kabar(pesanGalat(e, "menarik data satelit")); }
  }, st ? "ke2" : "");
  const hasil = h("div");
  const hitung = () => {
    if (!st) return ganti(hasil);
    const pr = proyeksi(st, a);
    ganti(hasil, pr.galat ? h("p", {class: "kb-galat"}, pr.galat) : [
      ringkasKeuangan(st, a, pr), h("h3", null, "Dua penaksir faktor emisi"), penaksir(st, a), h("h3", null, `Estimasi kredit per tahun (${T})`), tabelKredit(pr)]);
  };
  const petaEl = h("div", {class: "kb-peta"}, h("div", {class: "kb-peta-k"}));
  ganti(panel,
    tombol("← Semua proyek", () => { location.hash = "#proyek"; }, "ke2 kecil"),
    judul(p.nama, [p.pemegang, prov(p.prov), p.kab, p.luas_ha ? ang(p.luas_ha) + " ha" : null].filter(Boolean).join(" · "), pil(label(TAHAP, p.tahap), "t-" + p.tahap)),
    h("div", {class: "grid g2"}, geom ? petaEl : kosong("Belum ada batas areal."), fId),
    h("section", {class: "kb-bag"}, judul("Data satelit", st ? `Diambil ${tgl(p.stat_diambil)}.` : "Belum ada statistik satelit untuk batas ini.", btnStat), st ? blokStat(st, a) : null),
    st ? h("section", {class: "kb-bag"}, judul("Asumsi proyek", "Ubah angka, hasil di bawah ikut berubah; simpan bila sudah sesuai.", tombol("Simpan asumsi", () => simpan({asumsi: a}, "Asumsi"))),
      h("details", {class: "lipat kb-lipat", open: true}, h("summary", null, "Asumsi"), h("div", {class: "isi"}, formAsumsi(a, st, b => { a = b; hitung(); }))), hasil) : null,
    h("section", {class: "kb-bag"}, judul("Peringatan di proyek ini", "Peringatan deforestasi dan titik api di dalam batas proyek."),
      per.length ? tabel([{t: "Tanggal", f: x => tgl(x.tanggal)}, {t: "Sumber", f: x => label(SUMBER_PER, x.sumber)}, {t: "Luas (ha)", n: 1, f: x => x.luas_ha == null ? "–" : ang(x.luas_ha, 1)},
        {t: "Keyakinan", f: x => x.keyakinan || "–"}, {t: "Status", f: x => pil(label(STATUS_PER, x.status), x.status)}, {t: "Catatan", kelas: "kb-nama", f: x => x.catatan || "–"}],
      per.slice(0, 50)) : kosong("Belum ada peringatan.")),
    laporanMRV(p, () => a, st, per));
  hias(panel); hitung();
  petaD?.remove(); petaD = null;
  if (geom) petaBaru(petaEl.firstChild).then(m => {
    petaD = m;
    m.addSource("p", {type: "geojson", data: {type: "Feature", properties: {}, geometry: geom}});
    m.addLayer({id: "p-isi", type: "fill", source: "p", paint: {"fill-color": "#2f5c97", "fill-opacity": .25}});
    m.addLayer({id: "p-garis", type: "line", source: "p", paint: {"line-color": "#0b2545", "line-width": 1.5}});
    m.addSource("w", {type: "geojson", data: {type: "FeatureCollection", features: per.map(x => ({type: "Feature", properties: {s: x.status}, geometry: {type: "Point", coordinates: [x.lon, x.lat]}}))}});
    m.addLayer({id: "w", type: "circle", source: "w", paint: {"circle-radius": 5, "circle-color": ["match", ["get", "s"], "baru", "#c9503a", "valid", "#0b2545", "dicek", "#4f9be0", "#9aa3ad"], "circle-stroke-color": "#fff", "circle-stroke-width": 1}});
    const b = batas(geom); if (b) m.fitBounds(b, {padding: 24, duration: 0});
  }).catch(e => console.warn(e));
}

/* ---------- laporan pemantauan satelit per periode ---------- */
function laporanMRV(p, asumsiNow, st, per) {
  const th = new Date().getFullYear(), awal = h("input", {type: "date", value: `${th}-01-01`, "aria-label": "Periode awal"}), akhir = h("input", {type: "date", value: hariIni(), "aria-label": "Periode akhir"});
  const isi = () => {
    const a0 = awal.value, a1 = akhir.value; if (!a0 || !a1 || a1 < a0) throw new Error("periode tidak sah");
    const [y0, y1] = [+a0.slice(0, 4), +a1.slice(0, 4)], a = asumsiNow(), pr = st ? proyeksi(st, a) : null;
    const w = per.filter(x => x.tanggal >= a0 && x.tanggal <= a1).sort((x, y) => x.tanggal.localeCompare(y.tanggal));
    const hil = st ? Object.entries(st.hilang || {}).filter(([t]) => +t >= y0 && +t <= y1).map(([t, v]) => [+t, v.ha, v.co2_t]) : [];
    return {a0, a1, a, pr: pr && !pr.galat ? pr : null, w, hil, kredit: pr && !pr.galat ? pr.baris.filter(r => r.tahun >= y0 && r.tahun <= y1) : []};
  };
  const nama = ext => `pantau-satelit-${p.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${awal.value}-${akhir.value}.${ext}`;
  const xlsx = async () => {
    try {
      const d = isi(), K = ["tahun", "hutan_ha", "hilang_ha", "emisi_baseline_t", "reduksi_t", "kebocoran_t", "pot_ketidakpastian_t", "buffer_t", "bagian_negara_t", "kredit_t"];
      await keXlsx([
        {nama: "Info", kepala: ["Kunci", "Nilai"], baris: [["Status", LABEL_MRV], ["Proyek", p.nama], ["Pemegang", p.pemegang ?? ""], ["Provinsi", prov(p.prov)], ["Kabupaten", p.kab ?? ""], ["Luas (ha)", p.luas_ha],
          ["Tahap", label(TAHAP, p.tahap)], ["Periode", `${d.a0} s.d. ${d.a1}`], ["Data satelit diambil", st?.diambil ?? ""], ["Dibuat", new Date().toISOString()]]},
        {nama: "Estimasi kredit per tahun", kepala: ["Tahun", "Hutan (ha)", "Hilang baseline (ha)", `Emisi baseline (${T})`, `Reduksi (${T})`, `Kebocoran (${T})`, `Ketidakpastian (${T})`, `Buffer (${T})`, `Bagian negara (${T})`, `Estimasi kredit (${T})`],
          baris: (d.pr?.baris || []).map(r => K.map(k => k === "tahun" ? r.tahun : Math.round(r[k] * 100) / 100))},
        {nama: "Peringatan periode", kepala: ["Tanggal", "Sumber", "Lintang", "Bujur", "Luas (ha)", "Keyakinan", "Status", "Catatan"], baris: d.w.map(x => [x.tanggal, label(SUMBER_PER, x.sumber), x.lat, x.lon, x.luas_ha, x.keyakinan, label(STATUS_PER, x.status), x.catatan ?? ""])},
        {nama: "Kehilangan teramati", kepala: ["Tahun", "Hilang (ha)", `Emisi GFW (${T})`], baris: d.hil},
        {nama: "Asumsi", kepala: ["Asumsi", "Nilai"], baris: Object.entries(d.a).map(([k, v]) => [LABEL_ASUMSI[k] || k, Array.isArray(v) ? v.join("–") : v ?? "otomatis"])},
      ], nama("xlsx"));
    } catch (e) { kabar("Gagal membuat XLSX: " + e.message); }
  };
  const pdf = async () => {
    try { const d = isi(); await muatLib("pdf"); tulisPdf(p, st, d).save(nama("pdf")); } catch (e) { kabar("Gagal membuat PDF: " + e.message); }
  };
  return h("section", {class: "kb-bag"}, judul("Laporan pemantauan satelit", "Belum diverifikasi pihak ketiga."),
    h("div", {class: "kb-saring kb-mrv"}, h("label", {class: "kb-f"}, h("span", null, "Dari"), awal), h("label", {class: "kb-f"}, h("span", null, "Sampai"), akhir),
      h("div", {class: "kb-f"}, h("span", null, "Unduh"), h("div", {class: "kb-aksi"}, tombol("PDF", pdf), tombol("XLSX", xlsx, "ke2")))));
}

function tulisPdf(p, st, d) {
  const doc = new window.jspdf.jsPDF({unit: "mm", format: "a4", compress: true}), L = 15, W = 180;
  let y = 18;
  const baru = () => { if (y > 275) { doc.addPage(); y = 18; } };
  const teks = (t, uk = 10, tebal = false, warna = [11, 37, 69]) => { doc.setFont("helvetica", tebal ? "bold" : "normal"); doc.setFontSize(uk); doc.setTextColor(...warna);
    for (const b of doc.splitTextToSize(String(t), W)) { baru(); doc.text(b, L, y); y += uk * .45; } y += 1.5; };
  const tab = (kepala, baris, lebar, kanan = []) => {
    const x0 = lebar.reduce((a, w, i) => (a.push((a[i - 1] ?? L) + (lebar[i - 1] ?? 0)), a), []);
    const satu = (r, kp) => { baru(); if (kp) { doc.setFillColor(11, 37, 69); doc.rect(L, y - 4, W, 6, "F"); doc.setTextColor(255); doc.setFont("helvetica", "bold"); } else { doc.setTextColor(30); doc.setFont("helvetica", "normal"); }
      r.forEach((v, i) => { const s = doc.splitTextToSize(String(v ?? "–"), lebar[i] - 2)[0] ?? ""; kanan.includes(i) ? doc.text(s, x0[i] + lebar[i] - 1, y, {align: "right"}) : doc.text(s, x0[i] + 1, y); }); y += 5.5; };
    doc.setFontSize(8.5); satu(kepala, true); baris.forEach(r => { if (y > 275) { doc.addPage(); y = 18; satu(kepala, true); } satu(r); }); y += 3;
  };
  doc.setFillColor(11, 37, 69); doc.rect(0, 0, 210, 8, "F");
  teks("Laporan pemantauan satelit: " + p.nama, 15, true);
  teks("Belum diverifikasi pihak ketiga.", 10, false, [60, 70, 90]);
  teks(LABEL_MRV + ".", 10, true, [201, 80, 58]);
  teks(`Periode ${tgl(d.a0)} s.d. ${tgl(d.a1)}. ${[p.pemegang, prov(p.prov), p.kab].filter(Boolean).join(", ")}. Luas ${ang(p.luas_ha)} ha. Tahap: ${label(TAHAP, p.tahap)}.`, 9.5, false, [60, 70, 90]);
  teks(`Dibuat ${new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"})} WIB dari ${location.host}${CONTOH ? " (data contoh)" : ""}. Data satelit diambil ${st?.diambil ?? "–"}.`, 8.5, false, [90, 100, 120]);
  teks("Peringatan dalam periode", 12, true);
  const n = k => d.w.filter(x => x.status === k).length;
  teks(`${ang(d.w.length)} peringatan: ${STATUS_PER.map(([k, t]) => `${t.toLowerCase()} ${ang(n(k))}`).join(", ")}.`, 9.5);
  if (d.w.length) tab(["Tanggal", "Sumber", "Lintang", "Bujur", "Luas (ha)", "Status", "Catatan"], d.w.slice(0, 60).map(x => [x.tanggal, label(SUMBER_PER, x.sumber), ang(x.lat, 4), ang(x.lon, 4), x.luas_ha == null ? "–" : ang(x.luas_ha, 1), label(STATUS_PER, x.status), x.catatan || ""]),
    [22, 26, 20, 22, 18, 18, 54], [2, 3, 4]);
  teks("Kehilangan hutan teramati satelit", 12, true);
  if (d.hil.length) tab(["Tahun", "Hilang (ha)", `Emisi GFW (${T})`], d.hil.map(([t, a, c]) => [t, ang(a, 1), ang(c)]), [30, 50, 60], [1, 2]);
  else teks("Belum ada data kehilangan hutan untuk tahun dalam periode ini.", 9.5);
  teks(`Estimasi kredit tahun dalam periode (${T})`, 12, true);
  if (d.kredit.length) tab(["Tahun", `Emisi baseline (${T})`, `Reduksi (${T})`, `Buffer (${T})`, `Bagian negara (${T})`, `Estimasi kredit (${T})`], d.kredit.map(r => [r.tahun, ang(r.emisi_baseline_t), ang(r.reduksi_t), ang(r.buffer_t), ang(r.bagian_negara_t), ang(r.kredit_t)]),
    [20, 34, 30, 30, 34, 32], [1, 2, 3, 4, 5]);
  else teks(d.pr ? `Periode kredit dimulai ${d.pr.tahun_mulai}; belum ada tahun kredit di periode ini.` : "Belum ada data satelit atau asumsi tidak sah.", 9.5);
  teks("Asumsi yang dipakai", 12, true);
  tab(["Asumsi", "Nilai"], Object.entries(d.a).map(([k, v]) => [LABEL_ASUMSI[k] || k, Array.isArray(v) ? v.join("–") : v == null ? "otomatis" : typeof v === "number" ? ang(v, Number.isInteger(v) ? 0 : 3) : v]), [110, 70], [1]);
  return doc;
}
