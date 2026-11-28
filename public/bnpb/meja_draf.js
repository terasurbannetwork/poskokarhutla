/* WIL-3 draf laporan awal kaji cepat di isian meja (tiket RU-081; kedeputian DESAIN-TEKNIS 6.16, ALUR WIL-3). Modul ES murni plus pembangun panel DOM:
   susun(d) mengubah jawaban GET /api/meja/kaji_cepat/draf?kab= (src/meja.js, dari JSON statis, tanpa D1) menjadi bagian-bagian teks; angka dan kalimat
   tidak dihitung ulang di layar. Semua isi berlabel "saran": yang menetapkan status tetap kepala daerah setelah kaji cepat. Sumber yang belum terbaca
   ditulis "belum ada data" (tidak pernah 0), dan bahaya tanpa sinyal ditulis "belum ada sinyal", tidak pernah "aman".
   Ekspor PDF meniru gaya ekspor Dalops (kepala navy, logo BNPB, Roboto, jspdf lokal). Berisi bagian draf yang terisi; isian Format-4 lain diisi TRC. */
const BELUM = "belum ada data";
const NAMA_JENIS = {karhutla: "Kebakaran hutan dan lahan", banjir: "Banjir", longsor: "Tanah longsor", kekeringan: "Kekeringan", gunungapi: "Gunung api", gempa: "Gempa bumi", gempabumi: "Gempa bumi", tsunami: "Tsunami", cuaca: "Cuaca ekstrem"};
const NAMA_KOLOM = {jiwa_sedang_plus: "terpapar sedang ke atas", rentan_sedang_plus: "rentan sedang ke atas", jiwa_tinggi: "terpapar tinggi", rentan_tinggi: "rentan tinggi"};
/* nilai status dari data: garis bawah jadi spasi, huruf awal kapital ("siaga_darurat" -> "Siaga darurat") */
const label = v => { const t = String(v ?? "").replace(/_/g, " ").trim(); return t ? t[0].toUpperCase() + t.slice(1) : BELUM; };
const jiwa = v => typeof v === "number" && Number.isFinite(v) ? `${angka(v)} jiwa` : BELUM;
const jenis = j => NAMA_JENIS[j] || String(j || BELUM);
const angka = v => typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("id-ID", {maximumFractionDigits: 0}) : BELUM;
const tgl = s => /^\d{4}-\d{2}-\d{2}/.test(s || "") ? new Date(String(s).slice(0, 10) + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}).replace(/\./g, "") : BELUM;

/* kode kab 4 digit dari kode provinsi dan nama kab petugas (wilayah.json); tepat satu cocok, selain itu null (tidak ditebak) */
export function kodeKab(prov, nama, wilayah) {
  const n = String(nama || "").trim().toLowerCase(); if (!n || !prov) return null;
  const c = (wilayah || []).filter(w => String(w.prov) === String(prov) && String(w.nama).trim().toLowerCase() === n);
  return c.length === 1 ? String(c[0].kode) : null;
}

/* -> {label, catatan, bagian: [{id, judul, baris: [[label, nilai]], kosong}]}; bagian tanpa isi punya `kosong` (alasan) dan baris kosong */
export function susun(d) {
  const ada = d?.sumber_ada || {};
  const out = [];
  const t = d?.penduduk;
  out.push(t ? {id: "penduduk", judul: "Penduduk terpapar", baris: [["Penduduk kabupaten", jiwa(t.total)], ...Object.entries(t.terpapar || {}).map(([b, v]) =>
      [jenis(b), Object.entries(v || {}).filter(([, x]) => typeof x === "number").map(([k, x]) => `${NAMA_KOLOM[k] || k} ${jiwa(x)}`).join("; ") || BELUM])]}
    : {id: "penduduk", judul: "Penduduk terpapar", baris: [], kosong: ada.terpapar === false ? "berkas keterpaparan belum terbaca" : "kabupaten ini tidak ada di data keterpaparan"});
  const s = Array.isArray(d?.saran_status) ? d.saran_status : [];
  out.push({id: "saran", judul: "Saran status dari sinyal", baris: s.map(x => [jenis(x.jenis), `${x.saran ? label(x.saran) : BELUM}${x.alasan ? `. ${x.alasan}` : ""}${x.basi ? " (sinyal sudah basi)" : ""}${x.tanggal_sinyal ? `, sinyal ${tgl(x.tanggal_sinyal)}` : ""}`]),
    kosong: s.length ? null : ada.saran_status === false ? "berkas saran status belum terbaca" : "belum ada sinyal untuk kabupaten ini; ini bukan tanda keadaan baik-baik saja"});
  const sk = Array.isArray(d?.sk_terkini) ? d.sk_terkini : [];
  out.push({id: "sk", judul: "SK status darurat terkini", baris: sk.map(x => [`${jenis(x.jenis)}, ${label(x.status)}`, `${x.nomor || "nomor belum tercatat"}; ${tgl(x.mulai)} sampai ${tgl(x.berakhir)}${typeof x.hari === "number" ? `, ${angka(x.hari)} hari` : ""}`]),
    kosong: sk.length ? null : ada.status_darurat === false ? "berkas SK status darurat belum terbaca" : "belum ada SK tingkat kabupaten tercatat untuk kabupaten ini"});
  const m = d?.perkiraan_masa && typeof d.perkiraan_masa === "object" ? Object.entries(d.perkiraan_masa) : [];
  out.push({id: "masa", judul: "Perkiraan masa status", baris: m.map(([j, v]) => [jenis(j), v ? `median ${angka(v.median_hari)} hari dari ${angka(v.n)} SK sejenis di provinsi ini${v.n < 3 ? "; contoh sedikit, jangan dipegang kuat" : ""}` : "belum ada SK sejenis di provinsi ini untuk jadi pembanding"]),
    kosong: m.length ? null : "belum ada saran status, jadi belum ada yang diperkirakan masanya"});
  const k = Array.isArray(d?.kejadian_terkini) ? d.kejadian_terkini : [];
  out.push({id: "kejadian", judul: "Kejadian terkini dari laporan harian", baris: k.map(x => [`${jenis(x.jenis)}, ${x.tempat || "tempat belum tercatat"}`, `${tgl(x.mulai)} sampai ${tgl(x.terakhir)}${typeof x.hari === "number" ? `, ${angka(x.hari)} hari` : ""}${x.status ? `, ${label(x.status).toLowerCase()}` : ""}`]),
    kosong: k.length ? null : ada.laphar === false ? "berkas laporan harian belum terbaca" : "belum ada kejadian tingkat kabupaten di laporan harian"});
  return {label: "saran", catatan: d?.catatan || "Draf untuk rapat koordinasi; yang menetapkan status adalah kepala daerah setelah kaji cepat.", bagian: out};
}

const h = (tag, a, ...anak) => { const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
  e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };

/* panel DOM: pil "Saran, bukan penetapan", bagian-bagian, tombol Unduh PDF dan Tutup (data-draf-pdf, data-draf-tutup); teks hanya lewat textContent */
export function panel(d, nama) {
  const r = susun(d);
  return h("section", {class: "mj-draf", id: "mjDrafPanel", "aria-labelledby": "mjDrafJ"},
    h("div", {class: "mj-draf-hd"}, h("h2", {id: "mjDrafJ", teks: `Draf kaji cepat, ${nama || "kabupaten"}`}), h("span", {class: "mj-pil t-tunggu", teks: "Saran, bukan penetapan"})),
    h("p", {class: "mj-redup", teks: r.catatan}),
    ...r.bagian.map(b => h("div", {class: "mj-draf-bag"}, h("h3", {teks: b.judul}),
      b.baris.length ? h("dl", null, ...b.baris.flatMap(([l, v]) => [h("dt", {teks: l}), h("dd", {teks: v})])) : h("p", {class: "mj-redup", role: "status", teks: b.kosong || BELUM}))),
    h("div", {class: "mj-aksi"}, h("button", {type: "button", class: "mj-btn utama kecil", "data-draf-pdf": "1", teks: "Unduh PDF draf"}), h("button", {type: "button", class: "mj-btn kecil", "data-draf-tutup": "1", teks: "Tutup draf"})));
}

/* ---------- PDF (jspdf lokal), gaya ekspor Dalops ---------- */
const _lib = {};
const skrip = src => _lib[src] ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => { delete _lib[src]; no(new Error("Gagal memuat " + src)); }; document.head.append(s); });
const keDataUrl = u => new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0); r(c.toDataURL("image/png")); }; im.onerror = () => r(null); im.src = u; });
const b64 = async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ""; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s); };

export async function pdf(d, nama) {
  await skrip("/vendor/jspdf/jspdf.umd.min.js");
  const r = susun(d), doc = new window.jspdf.jsPDF({orientation: "portrait", unit: "mm", format: "a4"});
  let rb = {}; try { rb = {n: await b64("/vendor/roboto/Roboto-Regular.ttf"), b: await b64("/vendor/roboto/Roboto-Bold.ttf")}; } catch (e) { rb = {}; }
  if (rb.n) { doc.addFileToVFS("Roboto-Regular.ttf", rb.n); doc.addFont("Roboto-Regular.ttf", "Roboto", "normal"); doc.addFileToVFS("Roboto-Bold.ttf", rb.b); doc.addFont("Roboto-Bold.ttf", "Roboto", "bold"); }
  const font = (b, z) => { doc.setFont(rb.n ? "Roboto" : "helvetica", b ? "bold" : "normal"); doc.setFontSize(z); };
  const logo = await keDataUrl("/img/lembaga/sumber-bnpb.png"), M = 14, W = 210, LEBAR = W - 2 * M;
  let y = 0, hal = 0;
  const kepala = () => { hal++; if (hal > 1) doc.addPage(); doc.setFillColor(11, 37, 69); doc.rect(0, 0, W, 4, "F");
    if (logo) doc.addImage(logo, "PNG", W - M - 12, 8, 12, 12);
    font(true, 14); doc.setTextColor(11, 37, 69); doc.text(`Draf laporan awal kaji cepat, ${nama || "kabupaten"}`, M, 14);
    font(false, 9); doc.setTextColor(91, 107, 133); doc.text("Saran, bukan penetapan. " + new Date().toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric"}), M, 19.5); y = 28; };
  const tulis = (teks, b, z, warna) => { font(b, z); doc.setTextColor(...warna); for (const l of doc.splitTextToSize(String(teks), LEBAR)) { if (y > 280) kepala(); doc.text(l, M, y); y += z * 0.46; } };
  kepala();
  tulis(r.catatan, false, 9, [11, 37, 69]); y += 3;
  for (const b of r.bagian) {
    if (y > 262) kepala();
    doc.setFillColor(11, 37, 69); doc.rect(M, y - 4, LEBAR, 6.5, "F"); font(true, 10); doc.setTextColor(255, 255, 255); doc.text(b.judul, M + 2, y + 0.5); y += 7;
    if (!b.baris.length) tulis(b.kosong || BELUM, false, 9, [91, 107, 133]);
    for (const [l, v] of b.baris) { tulis(l, true, 9, [11, 37, 69]); tulis(v, false, 9, [11, 37, 69]); y += 1.2; }
    y += 3;
  }
  tulis("Isian Format-4 lain diisi Tim Reaksi Cepat (TRC); kepala daerah menetapkan status setelah kaji cepat. Draf dibuat dari data Centurisk97 dan bukan pengganti kaji cepat di lapangan.", false, 8, [91, 107, 133]);
  for (let i = 1; i <= hal; i++) { doc.setPage(i); font(false, 7); doc.setTextColor(91, 107, 133); doc.text("Badan Nasional Penanggulangan Bencana  |  Copyright " + new Date().toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", year: "numeric"}), M, 291); doc.text(`${i} / ${hal}`, W - M, 291, {align: "right"}); }
  doc.save(`draf-kaji-cepat-${String(nama || "kab").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`);
}
