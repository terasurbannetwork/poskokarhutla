/* dokumen.js: generator dokumen /dokumen. Pilih laporan atau data dari KatalogDok (dokumen_katalog.js), saring provinsi, lalu unduh sebagai
   Excel, PDF, Word, atau PowerPoint. Satu model Dok, empat perender; pustaka dimuat saat tombol formatnya ditekan. Tanpa server, tanpa data pribadi. */
"use strict";
const C = {navy: "0B2545", navy2: "1D4E89", oranye: "E58A45", abu: "5B6B82", garis: "DDE4EE", zebra: "F3F6FA"};
const LIB = {
  xlsx: "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js",   // sama dengan bagikan.js
  pdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  tabel: "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
  pptx: "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js",
  docx: "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",
};
/* batas baris per bagian di luar Excel: tabel ribuan baris tidak terbaca di kertas atau slide; Excel selalu lengkap */
const BATAS = {pdf: 400, docx: 400, pptx: 48};
const PER_SLIDE = 12;
const S = {pilih: null, prov: "", json: new Map(), dok: null};
const MERK = document.documentElement.dataset.situs === "w" || /centurisk97/.test(location.hostname) ? "Centurisk97" : "Pantau Bencana";

const muatLib = (() => { const p = {}; return k => p[k] ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = LIB[k]; s.onload = ok; s.onerror = () => { delete p[k]; no(new Error("Pustaka gagal dimuat, periksa koneksi")); }; document.head.append(s); }); })();
const ambil = u => { if (!S.json.has(u)) S.json.set(u, fetch(u, {cache: "no-cache"}).then(r => { if (!r.ok) throw new Error(`${u} tidak tersedia (${r.status})`); return r.json(); }).catch(e => { S.json.delete(u); throw e; })); return S.json.get(u); };
const nilaiTeks = (v, j) => v == null || v === "" ? "–" : typeof v === "number" ? (j === "persen" ? fmt(v) + "%" : fmt(v)) : String(v);
const hariIni = () => new Date().toLocaleDateString("sv-SE", {timeZone: "Asia/Jakarta"});
const namaBerkas = ext => `${S.pilih.id}-${hariIni()}${S.prov ? "-" + Wilayah.prov(S.prov).toLowerCase().replace(/[^a-z0-9]+/g, "-") : ""}.${ext}`;
const dibuatTeks = () => `Dibuat ${new Date().toLocaleString("id-ID", {day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}).replace(" pukul", ",")} WIB dari ${location.host}`;

/* saring provinsi: hanya bagian yang membawa kode provinsi per baris; bagian nasional (tren, ringkasan) tetap utuh */
function saring(dok, kode) {
  if (!kode) return dok;
  const nm = Wilayah.prov(kode);
  return {...dok, sub: `${nm}. ${dok.sub}`, bagian: dok.bagian.map(b => {
    if (!b.prov) return {...b, catatan: [b.catatan, "Tingkat nasional, tidak disaring provinsi."].filter(Boolean).join(" ")};
    const ix = b.baris.map((_, i) => i).filter(i => b.prov[i] === kode);
    return {...b, baris: ix.map(i => b.baris[i]), prov: ix.map(() => kode)};
  }).filter(b => !b.prov || b.baris.length || !b.kolom.length),
  angka: dok.angka, catatanAngka: "Angka kunci tingkat nasional."};
}
const potong = (b, n) => b.baris.length > n ? {...b, baris: b.baris.slice(0, n), catatan: [b.catatan, `Ditampilkan ${fmt(n)} dari ${fmt(b.baris.length)} baris; daftar lengkap ada di versi Excel.`].filter(Boolean).join(" ")} : b;

/* ================= layar ================= */
function daftar() {
  const G = {};
  for (const e of KatalogDok.DAFTAR) (G[e.kelompok] ||= []).push(e);
  $("#dkDaftar").innerHTML = Object.entries(G).map(([g, L]) => `<div class="dk-grup"><div class="lbl">${esc(g)}</div>${L.map(e =>
    `<button type="button" class="dk-item" data-id="${e.id}" aria-pressed="false"><span class="pill pill-${esc(e.bencana)}">${esc(e.bencana === "semua" ? "Semua bencana" : e.bencana === "gunungapi" ? "Gunung api" : e.bencana === "udara" ? "Kualitas udara" : e.bencana === "cuaca" ? "Cuaca ekstrem" : e.bencana.replace(/^./, c => c.toUpperCase()))}</span><b>${esc(e.judul)}</b><small>${esc(e.ket)}</small></button>`).join("")}</div>`).join("");
  $("#dkProv").innerHTML = `<option value="">Seluruh Indonesia</option>` + Object.entries(Wilayah.PROV).sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
}
async function pilih(id) {
  const e = KatalogDok.DAFTAR.find(x => x.id === id); if (!e) return;
  S.pilih = e; S.dok = null;
  document.querySelectorAll(".dk-item").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
  history.replaceState(null, "", `?d=${id}${S.prov ? "&prov=" + S.prov : ""}`);
  $("#dkPratinjau").innerHTML = `<div class="kosong">Memuat data…</div>`; aturTombol(true);
  try {
    const js = await Promise.all(e.sumber.map(ambil));
    if (S.pilih !== e) return;
    S.dok = e.bangun(js); pratinjau();
  } catch (er) { console.warn(er); $("#dkPratinjau").innerHTML = `<div class="kosong">Data belum bisa dimuat: ${esc(er.message)}</div>`; }
}
function pratinjau() {
  const d = saring(S.dok, S.prov), N = 8;
  const ang = a => a?.length ? `<div class="dk-angka">${a.map(x => `<div><b>${esc(nilaiTeks(x.nilai))}</b><span>${esc(x.satuan || "")}</span><small>${esc(x.label)}</small></div>`).join("")}</div>` : "";
  $("#dkPratinjau").innerHTML = `<article class="dk-dok">
    <header><div class="lbl">Pratinjau</div><h2>${esc(d.judul)}</h2><p>${esc(d.sub)}</p></header>${ang(d.angka)}${d.catatanAngka && S.prov ? `<p class="dk-cat">${esc(d.catatanAngka)}</p>` : ""}
    ${d.bagian.map(b => `<section><h3>${esc(b.judul)}</h3>${(b.teks || []).map(t => `<p>${esc(t)}</p>`).join("")}${ang(b.angka)}
      ${b.kolom.length ? b.baris.length ? `<div class="dk-tabel"><table class="tabel"><thead><tr>${b.kolom.map(k => `<th${k.jenis !== "teks" ? ' class="num"' : ""}>${esc(k.label)}</th>`).join("")}</tr></thead>
        <tbody>${b.baris.slice(0, N).map(r => `<tr>${r.map((v, i) => `<td${b.kolom[i]?.jenis !== "teks" ? ' class="num"' : ""}>${esc(nilaiTeks(v, b.kolom[i]?.jenis))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        ${b.baris.length > N ? `<p class="dk-cat">${fmt(b.baris.length - N)} baris lagi di berkas unduhan.</p>` : ""}` : `<p class="dk-cat">Tidak ada baris.</p>` : ""}
      ${b.catatan ? `<p class="dk-cat">${esc(b.catatan)}</p>` : ""}</section>`).join("")}
    <footer class="dk-cat">Sumber: ${esc(d.sumber.map(s => s.nama + (s.catatan ? ` (${s.catatan})` : "")).join("; ") || "–")}</footer></article>`;
  aturTombol(false);
}
function aturTombol(mati) { document.querySelectorAll("[data-fmt]").forEach(b => { b.disabled = mati; }); }
async function unduh(btn) {
  if (!S.dok) return;
  const f = btn.dataset.fmt, label = btn.innerHTML;
  btn.disabled = true; btn.classList.add("sibuk"); btn.querySelector("small").textContent = "Menyusun…";
  await new Promise(r => requestAnimationFrame(() => setTimeout(r)));   // biar tombol sempat dicat sebelum kerja berat
  try {
    const d = saring(S.dok, S.prov), blob = await PERENDER[f](d);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = namaBerkas(f); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4e4); toast(`${a.download} diunduh`);
  } catch (er) { console.error(er); toast("Gagal menyusun berkas: " + er.message); }
  btn.innerHTML = label; btn.classList.remove("sibuk"); btn.disabled = false;
}
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.w); toast.w = setTimeout(() => el.classList.remove("on"), 3500); }

/* ================= perender ================= */
const lebarKolom = b => b.kolom.map((k, c) => Math.min(60, Math.max(String(k.label).length > 18 ? 14 : String(k.label).length + 2, ...b.baris.slice(0, 300).map(r => String(nilaiTeks(r[c], k.jenis)).length + 2))));
const PERENDER = {
  async xlsx(d) {
    await muatLib("xlsx"); const X = window.XLSX, wb = X.utils.book_new(), nama = new Set();
    const judulSt = {font: {bold: true, sz: 14, color: {rgb: C.navy}}}, kepSt = {font: {bold: true, color: {rgb: "FFFFFF"}}, fill: {fgColor: {rgb: C.navy}}, alignment: {vertical: "center", wrapText: true}};
    const namaLembar = j => { let n = String(j).replace(/[\[\]:*?/\\]/g, " ").slice(0, 28).trim() || "Lembar", m = n, i = 2; while (nama.has(m)) m = `${n.slice(0, 25)} ${i++}`; nama.add(m); return m; };
    const ring = [[d.judul], [d.sub], [dibuatTeks()], [], ["Angka kunci", "Nilai", "Satuan"], ...d.angka.map(a => [a.label, a.nilai, a.satuan || ""]), [], ["Isi dokumen", "Baris"], ...d.bagian.map(b => [b.judul, b.baris.length])];
    const ws0 = X.utils.aoa_to_sheet(ring); ws0.A1.s = judulSt;
    for (const r of [4, 6 + d.angka.length]) for (let c = 0; c < 3; c++) { const a = ws0[X.utils.encode_cell({r, c})]; if (a) a.s = kepSt; }
    ws0["!cols"] = [{wch: 60}, {wch: 16}, {wch: 14}]; X.utils.book_append_sheet(wb, ws0, namaLembar("Ringkasan"));
    for (const b of d.bagian) {
      const atas = [[b.judul], ...(b.teks || []).map(t => [t])], h = atas.length + 1;
      const ws = X.utils.aoa_to_sheet([...atas, [], b.kolom.map(k => k.label), ...b.baris.map(r => r.map(v => v ?? "")), ...(b.catatan ? [[], [b.catatan]] : [])]);
      ws.A1.s = judulSt;
      b.kolom.forEach((k, c) => { const a = ws[X.utils.encode_cell({r: h, c})]; if (a) a.s = kepSt; });
      b.baris.forEach((r, i) => r.forEach((v, c) => { if (typeof v !== "number") return; const a = ws[X.utils.encode_cell({r: h + 1 + i, c})]; if (a) a.z = Number.isInteger(v) ? "#,##0" : "#,##0.0#"; }));
      ws["!cols"] = lebarKolom(b).map(wch => ({wch}));
      if (b.baris.length) ws["!autofilter"] = {ref: X.utils.encode_range({s: {r: h, c: 0}, e: {r: h + b.baris.length, c: b.kolom.length - 1}})};
      X.utils.book_append_sheet(wb, ws, namaLembar(b.judul));
    }
    const ws9 = X.utils.aoa_to_sheet([["Sumber", "Catatan", "Tautan"], ...d.sumber.map(s => [s.nama, s.catatan || "", s.url || ""]), [], [dibuatTeks()], ["Angka diambil apa adanya dari berkas data pipeline saat dokumen dibuat."]]);
    for (let c = 0; c < 3; c++) ws9[X.utils.encode_cell({r: 0, c})].s = kepSt; ws9["!cols"] = [{wch: 50}, {wch: 60}, {wch: 50}];
    X.utils.book_append_sheet(wb, ws9, namaLembar("Sumber"));
    return new Blob([X.write(wb, {bookType: "xlsx", type: "array", compression: true})], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  },

  async pdf(d) {
    await muatLib("pdf"); await muatLib("tabel");
    const lebar = d.bagian.some(b => b.kolom.length >= 6), doc = new window.jspdf.jsPDF({unit: "mm", format: "a4", orientation: lebar ? "landscape" : "portrait", compress: true});
    const rb = await muatRoboto(); pasangRoboto(doc, rb); const F = doc.__roboto ? "Roboto" : "helvetica";
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 14, LW = W - 2 * M, rgb = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    const T = s => String(s ?? "").replace(/[–—−]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/→/g, "->").replace(/[^\x00-\xFF]/g, "");
    const kepala = () => { doc.setFillColor(...rgb(C.navy)); doc.rect(0, 0, W, 12, "F"); doc.setFillColor(...rgb(C.oranye)); doc.rect(0, 12, W, .7, "F");
      doc.setFont(F, "bold"); doc.setFontSize(10); doc.setTextColor(255); doc.text(T(d.judul), M, 8); doc.setFont(F, "normal"); doc.setFontSize(8); doc.text(T(MERK), W - M, 8, {align: "right"}); return 20; };
    const ubin = (A, y) => { const n = Math.min(4, A.length), w = (LW - (n - 1) * 4) / n;
      A.forEach((a, i) => { const x = M + (i % n) * (w + 4), yy = y + Math.floor(i / n) * 24; doc.setDrawColor(...rgb(C.garis)); doc.setFillColor(255); doc.roundedRect(x, yy, w, 20, 2, 2, "FD");
        doc.setFont(F, "bold"); doc.setFontSize(15); doc.setTextColor(...rgb(C.oranye)); const v = T(nilaiTeks(a.nilai)); doc.text(v, x + 4, yy + 9);
        doc.setFont(F, "normal"); doc.setFontSize(8); doc.setTextColor(...rgb(C.abu)); doc.text(T(a.satuan || ""), x + 5 + doc.getStringUnitWidth(v) * 15 / doc.internal.scaleFactor, yy + 9);
        doc.setTextColor(...rgb(C.navy)); doc.text(doc.splitTextToSize(T(a.label), w - 8).slice(0, 2), x + 4, yy + 14.5); });
      return y + Math.ceil(A.length / n) * 24; };
    /* sampul */
    doc.setFillColor(...rgb(C.navy)); doc.rect(0, 0, W, 62, "F"); doc.setFillColor(...rgb(C.oranye)); doc.rect(0, 62, W, 1, "F");
    doc.setTextColor(255); doc.setFont(F, "normal"); doc.setFontSize(10); doc.text(T(MERK), M, 16);
    doc.setFont(F, "bold"); doc.setFontSize(24); doc.text(doc.splitTextToSize(T(d.judul), LW), M, 34);
    doc.setFont(F, "normal"); doc.setFontSize(10); doc.setTextColor(210, 222, 238); doc.text(doc.splitTextToSize(T(d.sub), LW), M, 52);
    let y = d.angka.length ? ubin(d.angka, 72) : 72;
    if (d.catatanAngka && S.prov) { doc.setFontSize(8); doc.setTextColor(...rgb(C.abu)); doc.text(T(d.catatanAngka), M, y); y += 5; }
    doc.setFont(F, "bold"); doc.setFontSize(11); doc.setTextColor(...rgb(C.navy)); doc.text("Isi dokumen", M, y + 6); y += 11; doc.setFont(F, "normal"); doc.setFontSize(9.5);
    d.bagian.forEach((b, i) => { if (y > H - 20) { doc.addPage(); y = kepala(); } doc.text(T(`${i + 1}. ${b.judul}`), M, y); y += 5.2; });
    let baru = true;
    for (const b0 of d.bagian) {
      const b = potong(b0, BATAS.pdf);
      if (baru || y > H - 90) { doc.addPage(); y = kepala(); } else y += 8;   // bagian pendek berbagi halaman, sisa < 9 cm pindah halaman
      baru = false;
      doc.setFont(F, "bold"); doc.setFontSize(14); doc.setTextColor(...rgb(C.navy)); const jl = doc.splitTextToSize(T(b.judul), LW); doc.text(jl, M, y); y += jl.length * 6 + 1;
      doc.setFont(F, "normal"); doc.setFontSize(9.5);
      for (const t of b.teks || []) { const l = doc.splitTextToSize(T(t), LW); if (y + l.length * 4.4 > H - 16) { doc.addPage(); y = kepala(); } doc.text(l, M, y); y += l.length * 4.4 + 1.5; }
      if (b.angka?.length) y = ubin(b.angka, y + 1) + 2;
      if (b.kolom.length && b.baris.length) {
        doc.autoTable({startY: y + 1, margin: {top: 20, left: M, right: M, bottom: 16}, head: [b.kolom.map(k => T(k.label))],
          body: b.baris.map(r => r.map((v, c) => T(nilaiTeks(v, b.kolom[c]?.jenis)))),
          styles: {font: F, fontSize: b.kolom.length > 9 ? 6.8 : 7.8, cellPadding: 1.5, textColor: rgb(C.navy), lineColor: rgb(C.garis), lineWidth: .1, overflow: "linebreak"},
          headStyles: {fillColor: rgb(C.navy), textColor: 255, fontStyle: "bold"}, alternateRowStyles: {fillColor: rgb(C.zebra)},
          columnStyles: Object.fromEntries(b.kolom.map((k, c) => [c, k.jenis !== "teks" ? {halign: "right"} : {}])), didDrawPage: z => { if (z.pageNumber > 1) kepala(); }});
        y = doc.lastAutoTable.finalY + 5;
      } else if (b.kolom.length) { doc.setTextColor(...rgb(C.abu)); doc.text("Tidak ada baris.", M, y + 3); y += 8; }
      if (b.catatan) { doc.setFontSize(8); doc.setTextColor(...rgb(C.abu)); const l = doc.splitTextToSize(T(b.catatan), LW); if (y + l.length * 3.6 > H - 14) { doc.addPage(); y = kepala(); } doc.text(l, M, y); }
    }
    doc.addPage(); y = kepala(); doc.setFont(F, "bold"); doc.setFontSize(14); doc.setTextColor(...rgb(C.navy)); doc.text("Sumber data", M, y); y += 8; doc.setFont(F, "normal"); doc.setFontSize(9.5);
    for (const s of d.sumber) { const l = doc.splitTextToSize(T(`${s.nama}${s.catatan ? `, ${s.catatan}` : ""}${s.url ? `. ${s.url}` : ""}`), LW - 4); doc.text("•", M, y); doc.text(l, M + 4, y); y += l.length * 4.4 + 2; }
    doc.setFontSize(8.5); doc.setTextColor(...rgb(C.abu)); doc.text(doc.splitTextToSize(T(`${dibuatTeks()}. Angka diambil apa adanya dari berkas data saat dokumen dibuat.`), LW), M, y + 4);
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont(F, "normal"); doc.setFontSize(7.5); doc.setTextColor(...rgb(C.abu)); doc.text(T(`${MERK}, ${location.host}`), M, H - 7); doc.text(`Halaman ${i} dari ${n}`, W - M, H - 7, {align: "right"}); }
    return doc.output("blob");
  },

  async docx(d) {
    await muatLib("docx"); const D = window.docx, FONT = "Arial", lebar = d.bagian.some(b => b.kolom.length >= 6);
    const run = (text, o = {}) => new D.TextRun({text: String(text ?? ""), font: FONT, ...o});
    const par = (text, o = {}, p = {}) => new D.Paragraph({spacing: {after: 80}, ...p, children: [run(text, o)]});
    const sel = (text, o = {}) => new D.TableCell({margins: {top: 40, bottom: 40, left: 80, right: 80}, shading: o.isi ? {type: D.ShadingType.CLEAR, color: "auto", fill: o.isi} : undefined,
      children: [new D.Paragraph({alignment: o.kanan ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [run(text, {size: o.uk || 16, bold: o.tebal, color: o.warna || C.navy})]})]});
    const tabel = (kolom, baris) => new D.Table({width: {size: 100, type: D.WidthType.PERCENTAGE}, rows: [
      new D.TableRow({tableHeader: true, children: kolom.map(k => sel(k.label, {isi: C.navy, warna: "FFFFFF", tebal: true, kanan: k.jenis !== "teks"}))}),
      ...baris.map((r, i) => new D.TableRow({children: r.map((v, c) => sel(nilaiTeks(v, kolom[c]?.jenis), {kanan: kolom[c]?.jenis !== "teks", isi: i % 2 ? C.zebra : undefined}))}))]});
    const angka = A => tabel([{label: "Angka kunci", jenis: "teks"}, {label: "Nilai", jenis: "angka"}, {label: "Satuan", jenis: "teks"}], A.map(a => [a.label, a.nilai, a.satuan || ""]));
    const isi = [par(MERK, {size: 20, color: C.abu}), par(d.judul, {size: 44, bold: true, color: C.navy}, {spacing: {after: 120}}), par(d.sub, {size: 20, color: C.abu}, {spacing: {after: 240}})];
    if (d.angka.length) isi.push(angka(d.angka), par(d.catatanAngka && S.prov ? d.catatanAngka : "", {size: 16, color: C.abu}));
    for (const b0 of d.bagian) {
      const b = potong(b0, BATAS.docx);
      isi.push(new D.Paragraph({heading: D.HeadingLevel.HEADING_2, spacing: {before: 320, after: 120}, children: [run(b.judul, {size: 28, bold: true, color: C.navy})]}));
      for (const t of b.teks || []) isi.push(par(t, {size: 20, color: C.navy}));
      if (b.angka?.length) isi.push(angka(b.angka), par(""));
      if (b.kolom.length) isi.push(b.baris.length ? tabel(b.kolom, b.baris) : par("Tidak ada baris.", {size: 18, color: C.abu}));
      if (b.catatan) isi.push(par(b.catatan, {size: 16, italics: true, color: C.abu}, {spacing: {before: 80}}));
    }
    isi.push(new D.Paragraph({heading: D.HeadingLevel.HEADING_2, spacing: {before: 320, after: 120}, children: [run("Sumber data", {size: 28, bold: true, color: C.navy})]}),
      ...d.sumber.map(s => new D.Paragraph({bullet: {level: 0}, children: [run(`${s.nama}${s.catatan ? `, ${s.catatan}` : ""}${s.url ? `. ${s.url}` : ""}`, {size: 20, color: C.navy})]})),
      par(`${dibuatTeks()}. Angka diambil apa adanya dari berkas data saat dokumen dibuat.`, {size: 16, color: C.abu}, {spacing: {before: 160}}));
    const doc = new D.Document({creator: MERK, title: d.judul, styles: {default: {document: {run: {font: FONT}}}},
      sections: [{properties: {page: {size: {width: 11906, height: 16838, ...(lebar ? {orientation: D.PageOrientation.LANDSCAPE} : {})}   /* docx menukar lebar-tinggi sendiri saat lanskap */, margin: {top: 1000, bottom: 1000, left: 1000, right: 1000}}},
        headers: {default: new D.Header({children: [new D.Paragraph({alignment: D.AlignmentType.RIGHT, children: [run(`${d.judul}, ${MERK}`, {size: 14, color: C.abu})]})]})},
        footers: {default: new D.Footer({children: [new D.Paragraph({alignment: D.AlignmentType.RIGHT, children: [run("Halaman ", {size: 14, color: C.abu}), new D.TextRun({children: [D.PageNumber.CURRENT], size: 14, color: C.abu, font: FONT}), run(" dari ", {size: 14, color: C.abu}), new D.TextRun({children: [D.PageNumber.TOTAL_PAGES], size: 14, color: C.abu, font: FONT})]})]})},
        children: isi}]});
    return D.Packer.toBlob(doc);
  },

  async pptx(d) {
    await muatLib("pptx"); const p = new window.PptxGenJS(), FONT = "Arial";
    p.layout = "LAYOUT_WIDE"; p.author = MERK; p.title = d.judul;
    p.defineSlideMaster({title: "ISI", background: {color: "FFFFFF"}, objects: [{rect: {x: 0, y: 0, w: 13.333, h: .8, fill: {color: C.navy}}}, {rect: {x: 0, y: .8, w: 13.333, h: .05, fill: {color: C.oranye}}},
      {text: {text: `${MERK}, ${location.host}`, options: {x: .5, y: 7.06, w: 10, h: .3, fontFace: FONT, fontSize: 9, color: C.abu}}}],
      slideNumber: {x: 12.35, y: 7.06, w: .6, h: .3, fontFace: FONT, fontSize: 9, color: C.abu}});
    const isi = j => { const s = p.addSlide({masterName: "ISI"}); s.addText(j, {x: .5, y: .1, w: 12.3, h: .6, fontFace: FONT, fontSize: 22, bold: true, color: "FFFFFF", fit: "shrink"}); return s; };
    const ubin = (s, A, y) => { const n = Math.min(4, A.length), w = (12.33 - (n - 1) * .25) / n;
      A.slice(0, 8).forEach((a, i) => { const x = .5 + (i % n) * (w + .25), yy = y + Math.floor(i / n) * 1.45;
        s.addShape(p.ShapeType.roundRect, {x, y: yy, w, h: 1.3, fill: {color: "FFFFFF"}, line: {color: C.garis, width: 1}, rectRadius: .08});
        s.addText([{text: nilaiTeks(a.nilai), options: {fontSize: 26, bold: true, color: C.oranye}}, {text: a.satuan ? "  " + a.satuan : "", options: {fontSize: 12, color: C.abu}}], {x: x + .15, y: yy + .1, w: w - .3, h: .65, fontFace: FONT, fit: "shrink"});
        s.addText(a.label, {x: x + .15, y: yy + .72, w: w - .3, h: .5, fontFace: FONT, fontSize: 11, color: C.navy, fit: "shrink", valign: "top"}); });
      return y + Math.ceil(Math.min(8, A.length) / n) * 1.45; };
    const s0 = p.addSlide(); s0.background = {color: C.navy};
    s0.addShape(p.ShapeType.rect, {x: 0, y: 6.9, w: 13.333, h: .6, fill: {color: C.navy2}});
    s0.addText(MERK, {x: .8, y: .8, w: 11, h: .4, fontFace: FONT, fontSize: 16, bold: true, color: "FFFFFF"});
    s0.addText(d.judul, {x: .8, y: 2.4, w: 11.7, h: 1.6, fontFace: FONT, fontSize: 40, bold: true, color: "FFFFFF", fit: "shrink"});
    s0.addText(d.sub, {x: .8, y: 4.1, w: 11.7, h: .6, fontFace: FONT, fontSize: 16, color: "FFB37A", fit: "shrink"});
    s0.addText(dibuatTeks(), {x: .8, y: 6.95, w: 11.7, h: .5, fontFace: FONT, fontSize: 11, color: "DDE6F2"});
    if (d.angka.length) { const s = isi("Angka kunci"); ubin(s, d.angka, 1.2); if (d.catatanAngka && S.prov) s.addText(d.catatanAngka, {x: .5, y: 6.5, w: 12, h: .3, fontFace: FONT, fontSize: 10, color: C.abu}); }
    for (const b0 of d.bagian) {
      const b = potong(b0, BATAS.pptx), teks = (b.teks || []).slice(0, 3);
      let s = isi(b.judul), y = 1.1;
      if (teks.length) { s.addText(teks.map(t => ({text: t, options: {breakLine: true}})), {x: .5, y, w: 12.3, h: .35 * teks.length + .2, fontFace: FONT, fontSize: 13, color: C.navy, fit: "shrink", valign: "top"}); y += .35 * teks.length + .3; }
      if (b.angka?.length) y = ubin(s, b.angka, y) + .1;
      if (!b.kolom.length || !b.baris.length) { if (b.kolom.length) s.addText("Tidak ada baris.", {x: .5, y, w: 12, h: .4, fontFace: FONT, fontSize: 12, color: C.abu}); }
      const fs = b.kolom.length > 8 ? 8 : 10, kep = b.kolom.map(k => ({text: k.label, options: {bold: true, color: "FFFFFF", fill: {color: C.navy}, align: k.jenis !== "teks" ? "right" : "left"}}));
      for (let i = 0; i < b.baris.length;) {
        if (i) { s = isi(`${b.judul} (lanjutan)`); y = 1.1; }
        const rows = b.baris.slice(i, i + Math.min(PER_SLIDE, Math.max(3, Math.floor((6.5 - y) / .36) - 1))); i += rows.length;   // slide pertama berbagi tempat dengan teks dan ubin
        s.addTable([kep, ...rows.map((r, j) => r.map((v, c) => ({text: nilaiTeks(v, b.kolom[c]?.jenis), options: {align: b.kolom[c]?.jenis !== "teks" ? "right" : "left", fill: {color: j % 2 ? C.zebra : "FFFFFF"}}})))],
          {x: .5, y, w: 12.33, fontFace: FONT, fontSize: fs, color: C.navy, border: {type: "solid", pt: .5, color: C.garis}, rowH: .32, autoPage: false});
      }
      if (b.catatan) s.addText(b.catatan, {x: .5, y: 6.62, w: 12.3, h: .4, fontFace: FONT, fontSize: 9, color: C.abu, fit: "shrink"});
    }
    const sz = isi("Sumber data");
    sz.addText(d.sumber.map(x => ({text: `${x.nama}${x.catatan ? `, ${x.catatan}` : ""}`, options: {bullet: true, breakLine: true}})), {x: .5, y: 1.2, w: 12.3, h: 5.2, fontFace: FONT, fontSize: 14, color: C.navy, valign: "top", fit: "shrink"});
    return p.write({outputType: "blob", compression: true});
  },
};


/* ================= mulai ================= */
daftar();
$("#dkDaftar").addEventListener("click", e => { const b = e.target.closest(".dk-item"); if (b) pilih(b.dataset.id); });
$("#dkProv").addEventListener("change", e => { S.prov = e.target.value; if (S.pilih) history.replaceState(null, "", `?d=${S.pilih.id}${S.prov ? "&prov=" + S.prov : ""}`); if (S.dok) pratinjau(); });
document.querySelectorAll("[data-fmt]").forEach(b => b.addEventListener("click", () => unduh(b)));
{ const q = new URLSearchParams(location.search); if (Wilayah.PROV[q.get("prov")]) { S.prov = q.get("prov"); $("#dkProv").value = S.prov; } pilih(q.get("d") || KatalogDok.DAFTAR[0].id); }
