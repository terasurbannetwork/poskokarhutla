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
/* slide akhir "Keaslian dokumen" (segel-dokumen SG-09, KEPUTUSAN K5): hanya snapshot terkunci yang bersegel (opsi.segel = {kode, sidik12} dari
   GET snapshot). QR 3,4 inci koreksi galat M ke centurisk97.id/verifikasi/<kode> (K4 Q6), digambar sebagai kotak per deret modul supaya sama di PPTX, PDF,
   dan pratinjau. Kalimat batas hukum K4 Q10. Tanpa segel, tanpa slide ini. */
const DOMAIN = "centurisk97.id", QR = "/vendor/qrcode/qrcode.min.js?v=1";
const tampilKode = k => `${k.slice(0, 5)}-${k.slice(5)}`;
async function tambahSegel(d, s, opsi) {
  const sg = opsi.segel;
  if (opsi.draf || !sg || !/^[0-9A-HJKMNP-TV-Z]{10}$/.test(sg.kode || "")) return d;
  if (typeof window.qrcode !== "function") await skrip(QR);
  const PS = window.PaparanSlide, C = window.LaporanBnpbSlide.C, {W, H} = PS, url = `https://${DOMAIN}/verifikasi/${sg.kode}`;
  const q = window.qrcode(0, "M"); q.addData(url); q.make();
  const n = q.getModuleCount(), sisi = 3.4, m = sisi / (n + 4), x0 = 0.6, y0 = 1.75;
  const ralat = s.ralat ? `ralat ${s.ralat}` : "terbitan awal", [ty, tm, td] = String(s.tanggal_laporan).split("-").map(Number);
  const tgl = `${td} ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][tm - 1]} ${ty}`;
  d.slide.push(PS.lengkapi({id: "segel", judul: "Keaslian dokumen", bagian: "Penutup", gambar: (k, c) => {
    k.kotak(0, 0, W, H, {f: C.putih});
    k.teks(0.6, 0.36, 11.4, 0.95, "Keaslian dokumen", {s: 21, b: true});
    if (c.aset?.logo) k.gambar(c.aset.logo, 12.3, 0.3, 0.46, 0.58);
    k.garis(0.6, 1.34, 12.75, 1.34, {c: C.navy, w: 0.75});
    k.kotak(x0, y0, sisi, sisi, {f: C.putih, l: C.garis, lw: 0.5});
    for (let r = 0; r < n; r++) for (let c0 = 0; c0 < n; c0++) {   // satu kotak per deret modul gelap yang menyambung
      if (!q.isDark(r, c0)) continue;
      let c1 = c0; while (c1 + 1 < n && q.isDark(r, c1 + 1)) c1++;
      k.kotak(x0 + (c0 + 2) * m, y0 + (r + 2) * m, (c1 - c0 + 1) * m, m, {f: "000000"});
      c0 = c1;
    }
    const x = 4.5;
    k.teks(x, 1.75, 8.2, 0.45, "Periksa keaslian laporan ini", {s: 18, b: true});
    k.teks(x, 2.3, 8.2, 0.8, `Pindai QR di samping, atau buka ${DOMAIN}/verifikasi lalu ketik kode di bawah. Halaman itu menunjukkan apakah laporan ini terdaftar dan isinya belum berubah sejak dikunci.`, {s: 13});
    k.teks(x, 3.3, 2.0, 0.3, "Kode", {s: 11, c: C.abu});
    k.teks(x, 3.6, 8.2, 0.6, tampilKode(sg.kode), {s: 30, b: true, c: C.navy});
    k.teks(x, 4.35, 2.0, 0.3, "Sidik", {s: 11, c: C.abu});
    k.teks(x, 4.65, 8.2, 0.4, sg.sidik12 || "", {s: 16, c: C.teks});
    k.teks(x, 5.25, 8.2, 0.4, `Yang disegel: laporan ${tgl}, ${ralat}.`, {s: 13});
    k.teks(0.6, 6.5, 12.1, 0.3, "Segel keaslian sistem, bukan tanda tangan elektronik.", {s: 9, c: C.abu});
    k.garis(0.6, 7.04, 4.3, 7.04, {c: C.navy, w: 0.75});
    k.teks(12.0, 7.1, 0.75, 0.2, String(c.no), {s: 8, b: true, a: "r"});
  }}));
  return d;
}
const ukuran = b => b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.round(b / 1024) + " KB";
const konteks = (s, a, i, n) => ({no: i + 1, total: n, tahun: s.tanggal_laporan.slice(0, 4), aset: a});

/* pratinjau HTML ke dalam wadah; gen = fungsi yang mengembalikan false bila render ini sudah usang (dibatalkan). Satu slide per frame supaya layar tidak membeku. */
async function pratinjau(wadah, s, opsi = {}) {
  const K = await siap(undefined, s.bencana), a = await aset(), d = await tambahSegel(K.deck(s, opsi), s, opsi), PS = window.PaparanSlide, W = PS.W, H = PS.H;
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
  const d = await tambahSegel(K.deck(s, opsi), s, opsi), n = d.slide.length, PS = window.PaparanSlide, nama = K.namaBerkas(s, jenis); let blob;
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
window.LaporanKarhutlaDeck = {siap, pratinjau, skalaUlang, buat, simpan, tambahSegel};
})();
