/* unduh_tabel.js: ekspor satu laporan berisi empat tabel panel Real Time (Hotspot, Cluster, Luas terbakar, Belum padam)
   ke Excel, Word, PDF, PNG. Angka TIDAK dihitung ulang: tiap tabel dirender oleh renderDaftar() milik index.html lalu barisnya dibaca dari #rows,
   jadi sama dengan layar. Pustaka dimuat malas saat klik (SheetJS cdnjs, docx jsdelivr, jsPDF + autotable cdnjs). */
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
window.UnduhTabel = {tombol: () => `<button type="button" class="ud-btn" data-unduh aria-haspopup="menu" aria-label="Unduh laporan empat tabel">${svg("unduh")}<span class="ud-t"></span></button>`};

/* ---------- ambil data dari layar ---------- */
const teks = e => (e.querySelector(".nm-pjg") || e).textContent.replace(/\s+/g, " ").trim();
const PER = {hari: "Sehari", 7: "7 hari terakhir", 30: "30 hari terakhir", th: "Tahun ini"};
function periodeLabel() { const p = S.periode;
  if (PER[p]) return PER[p];
  if (/^\d{4}-\d{2}/.test(p)) return "Bulan " + p.split(",").map(b => ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][+b.slice(5) - 1] + " " + b.slice(0, 4)).join(", ");
  return p; }
function bacaTabel(nama, ket) {
  const box = document.querySelector("#rows"), kp = box.querySelector(".tb.kepala"); if (!kp) return null;
  const sel = e => [...e.children].slice(1).map((c, i) => i === 0 ? teks(c) : c.querySelector(".pill") ? teks(c.querySelector(".pill")) : teks(c));
  const hari = (box.querySelector(".tr-hari b")?.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
  return {nama, hari, ket, kolom: sel(kp), baris: [...box.querySelectorAll(".tb:not(.kepala):not(.tb-total)")].map(sel), total: (t => t ? sel(t) : null)(box.querySelector(".tb-total"))}; }
async function kumpul() {
  if (S.panel !== "wil" || S.jalur.length) throw new Error("Buka daftar provinsi (tingkat nasional) dulu");
  if (!S.pk) [S.pk, S.pkKini] = await Promise.all([muatJSON("data/peta_karhutla.json").catch(() => null), muatJSON("data/belum_kini.json").catch(() => null)]);
  const sebelum = S.ukur, scr = document.querySelector("#rows").parentElement, y = scr.scrollTop, hasil = [];
  try { for (const [u, nama] of Object.entries(UKUR)) { if ((u === "luas" || u === "belum") && !S.pk) continue;
      S.ukur = u; renderDaftar(); const t = bacaTabel(nama, u === "luas" ? "Periode: " + periodeLabel() : ""); if (t) hasil.push(t); } }
  finally { S.ukur = sebelum; renderDaftar(); scr.scrollTop = y; }
  const wib = new Date(Date.now() + 7 * 36e5), iso = wib.toISOString().slice(0, 10);
  return {judul: "Laporan Situasi Karhutla", iso, tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB",
    sumber: "Sumber: NASA FIRMS, Copernicus CAMS, BMKG", tabel: hasil}; }

/* angka id-ID dari layar ("1.234", "12,5") jadi number untuk Excel; "–" tetap teks */
const angka = s => /^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s) ? +s.replace(/\./g, "").replace(",", ".") : s;
const baris = t => [...t.baris, ...(t.total ? [t.total] : [])];
const cap = t => t.nama + (t.ket ? ", " + t.ket.replace("Periode: ", "") : "");

/* ---------- format ---------- */
async function xlsx(L) { await muat("xlsx"); const X = window.XLSX, wb = X.utils.book_new();
  const ringkas = [[L.judul], [L.tanggal], [L.sumber], [], ["Lembar", "Keterangan"], ...L.tabel.map(t => [t.nama, [t.hari && "Data " + t.hari, t.ket].filter(Boolean).join(", ")])];
  const w0 = X.utils.aoa_to_sheet(ringkas); w0["!cols"] = [{wch: 22}, {wch: 50}]; X.utils.book_append_sheet(wb, w0, "Ringkasan");
  for (const t of L.tabel) { const ws = X.utils.aoa_to_sheet([[t.nama + (t.hari ? ", " + t.hari : "")], t.ket ? [t.ket] : [], t.kolom, ...baris(t).map(r => r.map(angka))]);
    ws["!cols"] = t.kolom.map((_, i) => ({wch: i ? 12 : 26}));
    for (const a in ws) if (a[0] !== "!" && ws[a].t === "n") ws[a].z = Number.isInteger(ws[a].v) ? "#,##0" : "#,##0.0";
    X.utils.book_append_sheet(wb, ws, t.nama.slice(0, 31)); }
  return new Blob([X.write(wb, {bookType: "xlsx", type: "array"})], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}); }

async function docx(L) { await muat("docx"); const D = window.docx, P = (x, o = {}) => new D.Paragraph({spacing: {after: 80}, ...o, children: [new D.TextRun({text: x, ...(o.run || {})})]});
  const sel = (x, i, kepala, total) => new D.TableCell({shading: kepala ? {type: D.ShadingType.CLEAR, fill: NAVY_HEX, color: "auto"} : total ? {type: D.ShadingType.CLEAR, fill: "E6ECF3", color: "auto"} : undefined,
    margins: {top: 40, bottom: 40, left: 80, right: 80},
    children: [new D.Paragraph({alignment: i ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [new D.TextRun({text: x, bold: kepala || total, color: kepala ? "FFFFFF" : undefined, size: 18})]})]});
  const anak = [P(L.judul, {run: {bold: true, size: 36, color: NAVY_HEX}}), P(L.tanggal), P(L.sumber, {run: {italics: true, size: 18}})];
  for (const t of L.tabel) { anak.push(P(cap(t) + (t.hari ? ", data " + t.hari : ""), {run: {bold: true, size: 24, color: NAVY_HEX}, spacing: {before: 300, after: 100}}));
    anak.push(new D.Table({width: {size: 100, type: D.WidthType.PERCENTAGE}, rows: [new D.TableRow({tableHeader: true, children: t.kolom.map((x, i) => sel(x, i, true))}),
      ...t.baris.map(r => new D.TableRow({cantSplit: true, children: r.map((x, i) => sel(x, i))})), ...(t.total ? [new D.TableRow({children: t.total.map((x, i) => sel(x, i, false, true))})] : [])]})); }
  return D.Packer.toBlob(new D.Document({sections: [{properties: {page: {margin: {top: 900, bottom: 900, left: 900, right: 900}}}, children: anak}]})); }

async function pdf(L) { await muat("pdf"); await muat("tabel"); const d = new window.jspdf.jsPDF({unit: "pt", format: "a4"}), lebar = d.internal.pageSize.getWidth();
  d.setFont("helvetica", "bold").setFontSize(18).setTextColor(...NAVY).text(L.judul, 40, 48);
  d.setFont("helvetica", "normal").setFontSize(10).setTextColor(60).text(L.tanggal, 40, 66).text(L.sumber, 40, 80);
  let y = 100;
  for (const t of L.tabel) { d.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NAVY);
    if (y > 740) { d.addPage(); y = 48; } d.text(cap(t) + (t.hari ? ", data " + t.hari : ""), 40, y);
    d.autoTable({startY: y + 8, margin: {left: 40, right: 40, bottom: 40}, head: [t.kolom], body: t.baris, foot: t.total ? [t.total] : undefined, showFoot: "lastPage",
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
  for (const t of L.tabel) { tx(cap(t) + (t.hari ? ", data " + t.hari : ""), M, y + 14, {b: 1, s: 19, c: "#" + NAVY_HEX}); y += 40;
    const n = t.kolom.length, c0 = 280, cw = (W - 2 * M - c0) / (n - 1), xs = i => i ? M + c0 + cw * (i - 1) : M;
    const rr = (r, st) => { if (st.bg) { g.fillStyle = st.bg; g.fillRect(M, y, W - 2 * M, RH); } r.forEach((x, i) => tx(x, i ? xs(i) + cw - 12 : M + 10, y + RH / 2, {a: i ? "right" : "left", b: st.b, c: st.c, s: 14})); y += RH; };
    rr(t.kolom, {bg: "#" + NAVY_HEX, c: "#fff", b: 1});
    t.baris.forEach((r, k) => { rr(r, {bg: k % 2 ? "#f4f7fa" : null}); });
    if (t.total) rr(t.total, {bg: "#E6ECF3", b: 1, c: "#" + NAVY_HEX});
    y += 30; }
  return new Promise((ok, gagal) => cv.toBlob(b => b ? ok(b) : gagal(new Error("Kanvas terlalu besar")), "image/png")); }

const FORMAT = {xlsx: ["xlsx", xlsx], docx: ["docx", docx], pdf: ["pdf", pdf], png: ["png", png]};
async function ekspor(f) {
  document.body.classList.add("ud-sibuk"); await tunggu();
  try { const L = await kumpul(); await tunggu(); const [ext, fn] = FORMAT[f];
    if (!L.tabel.length) throw new Error("Tabel belum terisi");
    window.unduhBlob(await fn(L), `laporan-karhutla-${L.iso}.${ext}`); }
  catch (e) { console.error(e); toast(e.message || "Gagal membuat laporan"); }
  finally { document.body.classList.remove("ud-sibuk"); } }

/* ---------- menu pil ---------- */
const tutup = () => document.querySelector(".ud-menu")?.remove();
document.addEventListener("click", e => {
  const b = e.target.closest("[data-unduh]"), p = e.target.closest("[data-ud-f]");
  if (p) { tutup(); return nanti ? nanti(() => ekspor(p.dataset.udF)) : setTimeout(() => ekspor(p.dataset.udF)); }
  const ada = document.querySelector(".ud-menu"); tutup(); if (!b || ada) return;
  const r = b.getBoundingClientRect(), m = document.createElement("div"); m.className = "ud-menu"; m.setAttribute("role", "menu");
  m.innerHTML = [["xlsx", "Excel"], ["docx", "Word"], ["pdf", "PDF"], ["png", "PNG"]].map(([k, n]) => `<button type="button" role="menuitem" data-ud-f="${k}">${svg(k)}${n}</button>`).join("");
  m.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - 180)) + "px"; m.style.left = Math.max(8, Math.min(r.left, innerWidth - 166)) + "px"; document.body.append(m); m.querySelector("button").focus(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") tutup(); });
/* tabel provinsi bisa sudah digambar sebelum skrip ini dimuat: gambar ulang sekali supaya tombol Unduh ikut tampil */
if (document.querySelector(".tr-sw") && !document.querySelector("[data-unduh]") && typeof renderDaftar === "function") renderDaftar();
})();
