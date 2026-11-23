/* inti/unduh_tabel.js (PB-70, F-34, D15): SATU mesin ekspor tabel ke Excel, Word, PDF, PNG untuk semua bencana.
   Mesin memegang tombol, menu, pemuatan pustaka (malas, saat klik: SheetJS cdnjs, docx jsdelivr, jsPDF + autotable cdnjs), tata letak berkas,
   dan nama berkas. Angka TIDAK dihitung ulang: adaptor hanya memasok apa yang sudah tampil di layar.

   Adaptor (satu per halaman), dipasang dengan UnduhTabel.tema(adaptor):
     {id: "gempa",                         // id bencana, dipakai di nama berkas
      label: "Unduh laporan tiga tabel",   // aria-label tombol (opsional)
      berkas: "laporan-gempa",             // dasar nama berkas (opsional; bawaan `${id}-${tabel||"laporan"}-${iso}`)
      kumpul: async () => ({judul, iso, tanggal, sumber, tabel: [{nama, hari?, ket?, kolom: [...], baris: [[...]], total?: [...]}]})}
   Tombol: UnduhTabel.tombol() menghasilkan HTML tombol; klik membuka menu. Perlu window.unduhBlob dari inti/unduh.js. */
(() => {
const NAVY = [5, 28, 44], NAVY_HEX = "051C2C";
const LIB = {
  xlsx: ["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", () => window.XLSX],
  docx: ["https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js", () => window.docx],
  pdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf],   // sama dengan paparan.js
  tabel: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js", () => window.jspdf?.jsPDF?.API?.autoTable]};
const janji = {};
const muat = k => janji[k] ||= new Promise((ok, gagal) => { const [src, ada] = LIB[k]; if (ada()) return ok();
  const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => { delete janji[k]; gagal(new Error("Gagal memuat " + k)); }; document.head.append(s); });
const tunggu = () => new Promise(r => setTimeout(r, 0));
const IKON = {
  unduh: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"/>', xlsx: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  docx: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 17v-4h1.5a1.2 1.2 0 0 1 0 2.4H9"/>',
  png: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>'};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[k]}</svg>`;
let A = null;   // adaptor aktif
/* gerbang registri (PB-71, D15): tombol hanya dipasang bila kemampuan.layar.unduh_tabel bernilai true untuk id itu di /bencana.json.
   Diambil sekali, janjinya disimpan. Gagal dimuat = tidak dipasang untuk bencana selain karhutla; karhutla selalu tampil agar tidak mundur. */
let REG = null, IZIN = false;
const registri = () => REG ||= typeof fetch === "function" ? fetch("/bencana.json").then(r => r.ok ? r.json() : Promise.reject(new Error("registri " + r.status))).then(j => j.bencana || [], () => []) : Promise.resolve([]);
const izinReg = (daftar, id) => id === "karhutla" || (daftar || []).find(b => b.id === id)?.kemampuan?.layar?.unduh_tabel === true;

/* ---------- model murni (diuji di tests/layar/pb_unduh_tabel.test.mjs) ---------- */
/* angka id-ID dari layar ("1.234", "12,5") jadi number untuk Excel; "–" tetap teks */
const angka = s => /^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s) ? +s.replace(/\./g, "").replace(",", ".") : s;
const baris = t => [...t.baris, ...(t.total ? [t.total] : [])];
const cap = t => t.nama + (t.ket ? ", " + t.ket.replace("Periode: ", "") : "");
const judulTabel = t => cap(t) + (t.hari ? ", data " + t.hari : "");
/* lembar kerja: Ringkasan lalu satu lembar per tabel; hanya baris, tanpa pustaka */
const lembar = L => [{nama: "Ringkasan", kolom: [22, 50],
  aoa: [[L.judul], [L.tanggal], [L.sumber], [], ["Lembar", "Keterangan"], ...L.tabel.map(t => [t.nama, [t.hari && "Data " + t.hari, t.ket].filter(Boolean).join(", ")])]},
  ...L.tabel.map(t => ({nama: t.nama.slice(0, 31), kolom: t.kolom.map((_, i) => i ? 12 : 26),
    aoa: [[t.nama + (t.hari ? ", " + t.hari : "")], t.ket ? [t.ket] : [], t.kolom, ...baris(t).map(r => r.map(angka))]}))];
const bentukPdf = t => ({head: [t.kolom], body: t.baris, foot: t.total ? [t.total] : undefined});
const namaBerkas = (a, L, ext) => `${L.berkas || a.berkas || `${a.id}-${L.namaTabel || "laporan"}`}-${L.iso}.${ext}`;

/* ---------- format ---------- */
async function xlsx(L) { await muat("xlsx"); const X = window.XLSX, wb = X.utils.book_new();
  for (const l of lembar(L)) { const ws = X.utils.aoa_to_sheet(l.aoa); ws["!cols"] = l.kolom.map(wch => ({wch}));
    if (l.nama !== "Ringkasan") for (const a in ws) if (a[0] !== "!" && ws[a].t === "n") ws[a].z = Number.isInteger(ws[a].v) ? "#,##0" : "#,##0.0";
    X.utils.book_append_sheet(wb, ws, l.nama); }
  return new Blob([X.write(wb, {bookType: "xlsx", type: "array"})], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}); }

async function docx(L) { await muat("docx"); const D = window.docx, P = (x, o = {}) => new D.Paragraph({spacing: {after: 80}, ...o, children: [new D.TextRun({text: x, ...(o.run || {})})]});
  const sel = (x, i, kepala, total) => new D.TableCell({shading: kepala ? {type: D.ShadingType.CLEAR, fill: NAVY_HEX, color: "auto"} : total ? {type: D.ShadingType.CLEAR, fill: "E6ECF3", color: "auto"} : undefined,
    margins: {top: 40, bottom: 40, left: 80, right: 80},
    children: [new D.Paragraph({alignment: i ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [new D.TextRun({text: x, bold: kepala || total, color: kepala ? "FFFFFF" : undefined, size: 18})]})]});
  const anak = [P(L.judul, {run: {bold: true, size: 36, color: NAVY_HEX}}), P(L.tanggal), P(L.sumber, {run: {italics: true, size: 18}})];
  for (const t of L.tabel) { anak.push(P(judulTabel(t), {run: {bold: true, size: 24, color: NAVY_HEX}, spacing: {before: 300, after: 100}}));
    anak.push(new D.Table({width: {size: 100, type: D.WidthType.PERCENTAGE}, rows: [new D.TableRow({tableHeader: true, children: t.kolom.map((x, i) => sel(x, i, true))}),
      ...t.baris.map(r => new D.TableRow({cantSplit: true, children: r.map((x, i) => sel(x, i))})), ...(t.total ? [new D.TableRow({children: t.total.map((x, i) => sel(x, i, false, true))})] : [])]})); }
  return D.Packer.toBlob(new D.Document({sections: [{properties: {page: {margin: {top: 900, bottom: 900, left: 900, right: 900}}}, children: anak}]})); }

async function pdf(L) { await muat("pdf"); await muat("tabel"); const d = new window.jspdf.jsPDF({unit: "pt", format: "a4"}), lebar = d.internal.pageSize.getWidth();
  d.setFont("helvetica", "bold").setFontSize(18).setTextColor(...NAVY).text(L.judul, 40, 48);
  d.setFont("helvetica", "normal").setFontSize(10).setTextColor(60).text(L.tanggal, 40, 66).text(L.sumber, 40, 80);
  let y = 100;
  for (const t of L.tabel) { d.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NAVY);
    if (y > 740) { d.addPage(); y = 48; } d.text(judulTabel(t), 40, y);
    d.autoTable({startY: y + 8, margin: {left: 40, right: 40, bottom: 40}, ...bentukPdf(t), showFoot: "lastPage",
      styles: {fontSize: 8.5, cellPadding: 3.5, textColor: 30}, headStyles: {fillColor: NAVY, textColor: 255, fontStyle: "bold"}, footStyles: {fillColor: [230, 236, 243], textColor: NAVY, fontStyle: "bold"},
      didParseCell: h => { h.cell.styles.halign = h.column.index ? "right" : "left"; }, tableWidth: lebar - 80});
    y = d.lastAutoTable.finalY + 26; }
  return d.output("blob"); }

async function png(L) { const W = 1200, M = 40, RH = 32, F = 'Roboto, "Helvetica Neue", Arial, sans-serif';
  let H = M + 120; for (const t of L.tabel) H += 50 + RH * (1 + t.baris.length + (t.total ? 1 : 0)) + 30; H += M - 10;
  const sk = Math.min(2, Math.sqrt(15e6 / (W * H))), cv = document.createElement("canvas"); cv.width = Math.round(W * sk); cv.height = Math.round(H * sk);
  const g = cv.getContext("2d"); g.scale(sk, sk); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.textBaseline = "middle";
  const tx = (s, x, y, o = {}) => { g.font = `${o.b ? 700 : 400} ${o.s || 15}px ${F}`; g.fillStyle = o.c || "#1a2733"; g.textAlign = o.a || "left"; g.fillText(s, x, y); };
  tx(L.judul, M, M + 12, {b: 1, s: 30, c: "#" + NAVY_HEX}); tx(L.tanggal, M, M + 52, {s: 15, c: "#44525f"}); tx(L.sumber, M, M + 76, {s: 13, c: "#44525f"});
  let y = M + 120;
  for (const t of L.tabel) { tx(judulTabel(t), M, y + 14, {b: 1, s: 19, c: "#" + NAVY_HEX}); y += 40;
    const n = t.kolom.length, c0 = 280, cw = (W - 2 * M - c0) / (n - 1), xs = i => i ? M + c0 + cw * (i - 1) : M;
    const rr = (r, st) => { if (st.bg) { g.fillStyle = st.bg; g.fillRect(M, y, W - 2 * M, RH); } r.forEach((x, i) => tx(x, i ? xs(i) + cw - 12 : M + 10, y + RH / 2, {a: i ? "right" : "left", b: st.b, c: st.c, s: 14})); y += RH; };
    rr(t.kolom, {bg: "#" + NAVY_HEX, c: "#fff", b: 1});
    t.baris.forEach((r, k) => { rr(r, {bg: k % 2 ? "#f4f7fa" : null}); });
    if (t.total) rr(t.total, {bg: "#E6ECF3", b: 1, c: "#" + NAVY_HEX});
    y += 30; }
  return new Promise((ok, gagal) => cv.toBlob(b => b ? ok(b) : gagal(new Error("Kanvas terlalu besar")), "image/png")); }

const FORMAT = {xlsx: ["xlsx", xlsx], docx: ["docx", docx], pdf: ["pdf", pdf], png: ["png", png]};
async function ekspor(f) {
  if (!A) return;
  document.body.classList.add("ud-sibuk"); await tunggu();
  try { const L = await A.kumpul(); await tunggu(); const [ext, fn] = FORMAT[f];
    if (!L.tabel.length) throw new Error("Tabel belum terisi");
    window.unduhBlob(await fn(L), namaBerkas(A, L, ext)); }
  catch (e) { console.error(e); if (typeof toast === "function") toast(e.message || "Gagal membuat laporan"); }
  finally { document.body.classList.remove("ud-sibuk"); } }

/* ---------- menu pil ---------- */
const tutup = () => document.querySelector(".ud-menu")?.remove();
document.addEventListener("click", e => {
  const b = e.target.closest("[data-unduh]"), p = e.target.closest("[data-ud-f]");
  /* menu sudah tertutup sebelum kerja berat jalan; kerja ditunda lewat nanti() agar klik tidak membekukan layar */
  if (p) { tutup(); return typeof nanti === "function" ? nanti(() => ekspor(p.dataset.udF)) : setTimeout(() => ekspor(p.dataset.udF)); }
  const ada = document.querySelector(".ud-menu"); tutup(); if (!b || ada) return;
  const r = b.getBoundingClientRect(), m = document.createElement("div"); m.className = "ud-menu"; m.setAttribute("role", "menu");
  m.innerHTML = [["xlsx", "Excel"], ["docx", "Word"], ["pdf", "PDF"], ["png", "PNG"]].map(([k, n]) => `<button type="button" role="menuitem" data-ud-f="${k}">${svg(k)}${n}</button>`).join("");
  m.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - 180)) + "px"; m.style.left = Math.max(8, Math.min(r.left, innerWidth - 166)) + "px"; document.body.append(m); m.querySelector("button").focus(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") tutup(); });

/* bagian bersama adaptor (PB-79): tabel HTML biasa (kepala dari th, baris dari tbody) dan kepala laporan. Dulu disalin di tiap <bencana>/unduh.js. */
const rapiSel = e => e.textContent.replace(/\s+/g, " ").replace(/\s*[↑↓]$/, "").trim();
const slugNama = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function tabelHtml(t, nama, ket) {
  if (!t) return null;
  const kolom = [...t.querySelectorAll("thead th")].map(rapiSel), baris = [...t.querySelectorAll("tbody tr")].map(r => [...r.children].map(rapiSel));
  return kolom.length && baris.length ? {nama, ket: ket || "", kolom, baris} : null; }
/* kepala laporan: hari = tanggal terpilih di layar (kosong = hari ini WIB); sumber = registri bagikan.sumber, bawaan bila tak ada */
async function laporan(id, judul, hari, tabel, bawaan) {
  const reg = (await window.UnduhTabel.registri().catch(() => [])).find(b => b.id === id), wib = new Date(Date.now() + 7 * 36e5), iso = hari || wib.toISOString().slice(0, 10);
  return {judul, iso, namaTabel: tabel.length === 1 ? slugNama(tabel[0].nama) : "laporan",
    tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB",
    sumber: "Sumber: " + (reg?.bagikan?.sumber || bawaan), tabel}; }
window.UnduhTabel = {
  tabelHtml, laporan,
  /* adaptor mendengarkan "unduh-tabel-siap" untuk menggambar ulang tombolnya setelah registri terbaca */
  tema: a => { A = a; IZIN = a.id === "karhutla";
    registri().then(d => { const ok = izinReg(d, a.id); if (ok !== IZIN) { IZIN = ok; if (typeof CustomEvent === "function") document.dispatchEvent?.(new CustomEvent("unduh-tabel-siap", {detail: {id: a.id}})); } });
    return a; },
  registri, diizinkan: () => IZIN,
  tombol: () => !IZIN ? "" : `<button type="button" class="ud-btn" data-unduh aria-haspopup="menu" aria-label="${A?.label || "Unduh laporan tabel"}">${svg("unduh")}<span class="ud-t"></span></button>`,
  model: {izinReg, angka, baris, cap, judulTabel, lembar, bentukPdf, namaBerkas},
  format: {xlsx, docx, pdf, png}};
})();
