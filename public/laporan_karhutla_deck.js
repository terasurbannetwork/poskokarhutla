/* laporan_karhutla_deck.js: pratinjau dan unduh PPTX/PDF deck "Penanganan dan Pengendalian Karhutla" dari SNAPSHOT (laporan_karhutla_slide.js).
   Dipakai /admin/laporan-karhutla (CSP script-src 'self': semua pustaka dari /vendor) dan /laporan-bnpb. Skrip slide dimuat malas saat pertama dipakai,
   supaya halaman admin tidak membayar ~100 KB sebelum diklik. Satu fungsi gambar per slide menulis ke pptx, pdf, dan html (pratinjau), jadi ketiganya identik.
   Unduh HANYA untuk snapshot terkunci; sebelum kunci pemanggil memakai opsi {draf: true} untuk pratinjau berwatermark. */
(() => {
const SKRIP = ["/paparan_slide.js", "/laporan_bnpb_slide.js", "/laporan_karhutla_slide.js", "/laporan_bahaya_slide.js"], LIB = {pdf: "/vendor/jspdf/jspdf.umd.min.js", pptx: "/vendor/pptxgenjs/pptxgen.bundle.js"};
const _muat = {};
const skrip = src => _muat[src] ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.async = false; s.onload = ok; s.onerror = () => { delete _muat[src]; gagal(new Error("Gagal memuat " + src)); }; document.head.appendChild(s); });
/* s.bencana (snapshot bencana selain karhutla) memilih deck bahaya (laporan_bahaya_slide.js); tanpa itu = deck karhutla */
async function siap(lib, bencana) {
  const hz = !!bencana && bencana !== "karhutla", nama = hz ? "LaporanBahayaSlide" : "LaporanKarhutlaSlide";
  if (!window[nama]) { if (!window.PaparanSlide) await skrip(SKRIP[0]); if (!window.LaporanBnpbSlide) await skrip(SKRIP[1]); await skrip(SKRIP[hz ? 3 : 2]); }
  if (lib === "pdf" && !window.jspdf) await skrip(LIB.pdf);
  if (lib === "pptx" && !window.PptxGenJS) await skrip(LIB.pptx);
  return window[nama];
}
const jeda = () => new Promise(r => setTimeout(r, 0));
const keDataUrl = u => new Promise(r => { const im = new Image(); im.onload = () => { try { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0); r(c.toDataURL("image/png")); } catch (e) { r(null); } }; im.onerror = () => r(null); im.src = u; });
let _aset = null;
const aset = async () => _aset ||= {logo: await keDataUrl("/img/lembaga/sumber-bnpb.png")};
let _roboto = null;
async function roboto() {
  if (_roboto) return _roboto;
  const b64 = async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ""; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s); };
  try { _roboto = {n: await b64("/vendor/roboto/Roboto-Regular.ttf"), b: await b64("/vendor/roboto/Roboto-Bold.ttf")}; } catch (e) { _roboto = {}; }
  return _roboto;
}
async function tanamRoboto(doc) {
  const rb = await roboto();
  if (rb.n) { doc.addFileToVFS("Roboto-Regular.ttf", rb.n); doc.addFont("Roboto-Regular.ttf", "Roboto", "normal"); doc.addFileToVFS("Roboto-Bold.ttf", rb.b); doc.addFont("Roboto-Bold.ttf", "Roboto", "bold"); doc.__roboto = true; }
}
const ukuran = b => b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.round(b / 1024) + " KB";
const konteks = (s, a, i, n) => ({no: i + 1, total: n, tahun: s.tanggal_laporan.slice(0, 4), aset: a});

/* pratinjau HTML ke dalam wadah; gen = fungsi yang mengembalikan false bila render ini sudah usang (dibatalkan). Satu slide per frame supaya layar tidak membeku. */
async function pratinjau(wadah, s, opsi = {}) {
  const K = await siap(undefined, s.bencana), a = await aset(), d = K.deck(s, opsi), PS = window.PaparanSlide, W = PS.W, H = PS.H;
  wadah.replaceChildren(); let sk = 0;
  for (let i = 0; i < d.slide.length; i++) {
    if (opsi.gen && !opsi.gen()) return d;
    const sl = d.slide[i], fig = document.createElement("figure"), w = document.createElement("div"), st = document.createElement("div"), cap = document.createElement("figcaption");
    w.className = "sl-wrap"; w.dataset.lebar = W; w.style.aspectRatio = `${W} / ${H}`; st.className = "sl-stage"; st.style.width = W * 100 + "px"; st.style.height = H * 100 + "px"; w.append(st); fig.append(w);
    cap.textContent = `${i + 1}. ${sl.judul}`; fig.append(cap); wadah.append(fig);
    sk ||= w.clientWidth / (W * 100) || 0.3; st.style.transform = `scale(${sk})`;
    try { sl.buat(konteks(s, a, i, d.slide.length)).html(st); } catch (e) { console.error("slide", sl.id, e); st.textContent = `Slide gagal digambar: ${sl.id} (${e.message})`; }
    await jeda();
  }
  return d;
}
const skalaUlang = wadah => { const f = wadah.querySelector(".sl-wrap"); if (!f) return; const sk = f.clientWidth / (f.dataset.lebar * 100); wadah.querySelectorAll(".sl-stage").forEach(st => { st.style.transform = `scale(${sk})`; }); };

/* unduh: jenis "pptx" | "pdf". Mengembalikan {blob, nama, slide, dilewati}. status(teks) opsional untuk progres. */
async function buat(jenis, s, opsi = {}) {
  const status = opsi.status || (() => {});
  status("Memuat pustaka…"); const K = await siap(jenis, s.bencana), a = await aset(); await jeda();
  const d = K.deck(s, opsi), n = d.slide.length, PS = window.PaparanSlide, nama = K.namaBerkas(s, jenis); let blob;
  if (jenis === "pptx") {
    const P = new window.PptxGenJS(); P.layout = "LAYOUT_WIDE"; P.title = nama.replace(/\.pptx$/, "").replace(/-/g, " "); P.company = "BNPB";
    for (let i = 0; i < n; i++) { status(`Menyusun slide ${i + 1}/${n}…`); await jeda(); d.slide[i].buat(konteks(s, a, i, n)).pptx(P.addSlide()); }
    status("Mengemas PPTX…"); await jeda(); blob = await P.write({outputType: "blob"});
  } else {
    const doc = new window.jspdf.jsPDF({orientation: "landscape", unit: "in", format: [PS.W, PS.H], compress: true}); await tanamRoboto(doc);
    for (let i = 0; i < n; i++) { status(`Menyusun slide ${i + 1}/${n}…`); await jeda(); if (i) doc.addPage([PS.W, PS.H], "landscape"); d.slide[i].buat(konteks(s, a, i, n)).pdf(doc); }
    status("Mengemas PDF…"); await jeda(); blob = doc.output("blob");
  }
  return {blob, nama, slide: n, dilewati: d.dilewati, ukuran: ukuran(blob.size)};
}
function simpan(blob, nama) {
  const a = document.createElement("a"), u = URL.createObjectURL(blob); a.href = u; a.download = nama; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
window.LaporanKarhutlaDeck = {siap, pratinjau, skalaUlang, buat, simpan};
})();
