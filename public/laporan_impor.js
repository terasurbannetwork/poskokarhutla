/* laporan_impor.js: membaca berkas sumber Pusdalops jadi bahan untuk public/laporan_urai.js.
   Dipakai panel "Bahan Pusdalops" di /laporan-bnpb.

   PDF dibaca dengan pdf.js dan dikembalikan sebagai KOORDINAT kata, bukan hanya teks: tabel
   "Rekapitulasi berdasarkan SK Darurat" di laphar punya sel rata tengah tegak, dan tanpa koordinat
   baris-barisnya tidak bisa dipisahkan (lihat uraiSkDarurat di laporan_urai.js). Teks berjarak
   disusun dari koordinat yang sama lewat LaporanUrai.tataLetak. */
(() => {
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.min.mjs";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.worker.min.mjs";
const MAKS_BERKAS = 40 * 1024 * 1024;
let _pdfjs = null;
const muatPdfjs = () => (_pdfjs ||= import(PDFJS).then(m => { m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return m; })
  .catch(e => { _pdfjs = null; throw new Error("Gagal memuat pembaca PDF: " + e.message); }));

/* bacaPdf(buf) -> [{x, y, w, str}] dengan y menaik ke bawah dan halaman digeser berurutan,
   sehingga satu dokumen bisa diperlakukan sebagai satu kanvas panjang. */
async function bacaPdf(buf) {
  const pdfjs = await muatPdfjs();
  const dok = await pdfjs.getDocument({data: buf, isEvalSupported: false}).promise;
  const items = [];
  let geser = 0;
  try {
    for (let n = 1; n <= dok.numPages; n++) {
      const hal = await dok.getPage(n), vp = hal.getViewport({scale: 1}), isi = await hal.getTextContent();
      for (const it of isi.items) {
        if (!it.str || !it.str.trim()) continue;
        const t = it.transform;
        items.push({x: t[4], y: geser + (vp.height - t[5]), w: it.width, str: it.str});
      }
      geser += vp.height + 40;   // jarak antarhalaman: lebih besar dari jarak baris mana pun
      hal.cleanup();
    }
  } finally { dok.destroy(); }
  return items;
}

/* bacaServer({wa}|{file}) -> {teks, catatan}: Word, Excel, gambar, atau PDF pindai dibaca server (POST /api/laporan-bnpb/baca).
   wa = id lampiran kotak masuk WA (tanpa badan); file = berkas unggahan (badan mentah). */
async function bacaServer({wa, file}) {
  const o = {method: "POST", credentials: "same-origin"};
  if (!wa) o.headers = {"content-type": file.type || "application/octet-stream", "x-nama-berkas": encodeURIComponent(file.name || "berkas")}, o.body = file;
  const r = await fetch("/api/laporan-bnpb/baca" + (wa ? `?wa=${encodeURIComponent(wa)}` : ""), o);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.galat || (r.status === 503 ? "pembaca berkas di server tidak tersedia" : "server menolak (" + r.status + ")"));
  if (!String(j.teks || "").trim()) throw new Error("tidak ada teks yang terbaca");
  return {teks: j.teks, catatan: j.catatan || ""};
}
const PDF_KOSONG = 80;   // di bawah ini (huruf) dianggap hasil pindai
const teksItems = items => items.reduce((n, i) => n + i.str.trim().length, 0);

/* bacaBerkas(file) -> {teks, items, catatan}. PDF bertulisan memberi items (koordinat); jenis lain dibaca server dan tanpa items,
   sehingga tabel status daerah tak ikut terbaca. */
async function bacaBerkas(file) {
  if (!file) throw new Error("Tidak ada berkas");
  if (file.size > MAKS_BERKAS) throw new Error(`Berkas ${Math.round(file.size / 1048576)} MB, maksimal ${MAKS_BERKAS / 1048576} MB`);
  const nama = (file.name || "").toLowerCase();
  if (nama.endsWith(".pdf") || file.type === "application/pdf") {
    const items = await bacaPdf(await file.arrayBuffer());
    if (teksItems(items) >= PDF_KOSONG) return {items, teks: window.LaporanUrai.tataLetak(items), catatan: ""};
    try { return {items: null, ...(await bacaServer({file}))}; }
    catch (e) { throw new Error("PDF ini tidak memuat teks (hasil pindai) dan pembacaan di server gagal: " + e.message); }
  }
  if (/\.(txt|md)$/.test(nama) || /^text\/(plain|markdown)/.test(file.type || "")) return {items: null, teks: await file.text(), catatan: ""};
  if (/\.(docx?|xlsx?|odt|ods|csv|jpe?g|png|webp)$/.test(nama) || /^image\//.test(file.type || "")) return {items: null, ...(await bacaServer({file}))};
  throw new Error("Jenis berkas belum didukung. Unggah PDF, Word, Excel, atau foto, atau tempel teksnya.");
}

window.LaporanImpor = {bacaBerkas, bacaPdf, bacaServer, teksItems, PDF_KOSONG, MAKS_BERKAS};
})();
