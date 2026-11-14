/* Ekspor tabel seksi Pantau Dalops (/bnpb/dalops) ke Excel, CSV, PDF, dan PPT (pemilik 13 Nov 2026 "tambahin fungsi ekspor dalam bentuk excel pdf csv dan ppt").
   Sumber = tabel yang sedang tampil di seksi itu: baris yang tersaring (kelas dl-sar-x) tidak ikut, baris yang hanya tertutup (provinsi belum dibuka) ikut.
   Kepala bertingkat (Terdampak > KK) jadi satu label "Terdampak KK"; kolom Aksi dibuang. Excel lewat DalopsHitung.xlsx (diuji), PDF lewat /vendor/jspdf,
   PPT lewat /vendor/pptxgenjs; pustaka dimuat saat pertama diklik. Teks sel diambil lewat textContent, tidak pernah disisipkan sebagai HTML. */
(() => {
  "use strict";
  const {h, ikon} = window.Wilayah, H = window.DalopsHitung;
  const LIB = {pdf: "/vendor/jspdf/jspdf.umd.min.js", ppt: "/vendor/pptxgenjs/pptxgen.bundle.js"}, _muat = {};
  const skrip = src => _muat[src] ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => { delete _muat[src]; no(new Error("Gagal memuat " + src)); }; document.head.append(s); });

  /* teks sel: daun teks digabung berspasi supaya "Aceh" + "3 kab/kota" tidak menempel */
  const teks = el => { const xs = []; const jalan = n => { for (const c of n.childNodes) { if (c.nodeType === 3) xs.push(c.nodeValue); else if (c.nodeType === 1 && c.tagName.toLowerCase() !== "svg") jalan(c); } }; jalan(el);
    return xs.join(" ").replace(/\s+/g, " ").trim().replace(/^–$/, ""); };
  const angka = s => /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(s) ? Number(s.replace(/\./g, "").replace(",", ".")) : s;
  const TINGKAT = [["dl-prov", "Provinsi"], ["dl-kab-baris", "Kab/kota"], ["dl-kec-baris", "Kecamatan"], ["dl-desa-baris", "Desa/kel."]];

  /* kepala bertingkat -> label per kolom daun (rowspan/colspan dipetakan ke kisi) */
  function kepala(t) {
    const kisi = [];
    [...(t.tHead?.rows || [])].forEach((tr, r) => { let c = 0; kisi[r] ||= [];
      for (const th of tr.cells) { while (kisi[r][c]) c++; const cs = +th.colSpan || 1, rs = +th.rowSpan || 1, isi = teks(th);
        for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) (kisi[r + i] ||= [])[c + j] = {isi, akar: i === 0 && j === 0, rs}; c += cs; } });
    const n = Math.max(0, ...kisi.map(r => r.length));
    return Array.from({length: n}, (_, c) => [...new Set(kisi.map(r => r[c]?.isi).filter(Boolean))].join(" "));
  }
  function data(t) {
    const kep = kepala(t), buang = new Set(kep.map((k, i) => /^aksi$/i.test(k) ? i : -1).filter(i => i >= 0));
    const baris = [];
    for (const tr of t.querySelectorAll(":scope > tbody > tr, :scope > tfoot > tr")) {
      if (tr.classList.contains("dl-sar-x") || tr.parentElement.classList.contains("dl-sar-x") || tr.closest("[hidden]:not(tr)")) continue;
      const sel = []; for (const td of tr.cells) { const v = teks(td); sel.push(v); for (let j = 1; j < (+td.colSpan || 1); j++) sel.push(""); }
      if (!sel.some(Boolean)) continue;
      const tk = tr.parentElement.tagName === "TFOOT" ? "Jumlah" : TINGKAT.find(([k]) => tr.classList.contains(k))?.[1] || "";
      baris.push({tk, sel: sel.filter((_, i) => !buang.has(i))});
    }
    const pakaiTk = baris.some(b => b.tk && b.tk !== "Jumlah");
    return {kepala: [...(pakaiTk ? ["Tingkat"] : []), ...kep.filter((_, i) => !buang.has(i))], baris: baris.map(b => [...(pakaiTk ? [b.tk] : []), ...b.sel])};
  }

  const unduh = (blob, nama) => { const a = h("a", {href: URL.createObjectURL(blob), download: nama}); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
  const tglIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const tglPanjang = t => new Date(t + "T12:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
  const keDataUrl = u => new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0); r(c.toDataURL("image/png")); }; im.onerror = () => r(null); im.src = u; });
  let _rb = null;
  const roboto = async () => _rb ||= await (async () => { const b64 = async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ""; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s); };
    try { return {n: await b64("/vendor/roboto/Roboto-Regular.ttf"), b: await b64("/vendor/roboto/Roboto-Bold.ttf")}; } catch (e) { return {}; } })();

  function csv(D, nama) {
    const q = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };   // pemisah titik koma: Excel berbahasa Indonesia membukanya per kolom
    unduh(new Blob(["﻿" + [D.kepala, ...D.baris].map(r => r.map(q).join(";")).join("\r\n")], {type: "text/csv;charset=utf-8"}), nama + ".csv");
  }
  function xlsx(D, nama, judul) {
    unduh(new Blob([H.xlsx([{nama: judul.slice(0, 31), kepala: D.kepala, baris: D.baris.map(r => r.map(angka))}])], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), nama + ".xlsx");
  }
  /* lebar kolom sebanding panjang teks terpanjang, dibatasi supaya kolom Wilayah tidak memakan halaman */
  const lebar = (D, total) => { const p = D.kepala.map((k, i) => Math.min(28, Math.max(5, ...String(k).split(" ").map(w => w.length), ...D.baris.map(b => String(b[i] ?? "").length)))), s = p.reduce((a, b) => a + b, 0); return p.map(x => x / s * total); };

  async function pdf(D, nama, judul, sub) {
    await skrip(LIB.pdf);
    const doc = new window.jspdf.jsPDF({orientation: "landscape", unit: "mm", format: "a4"}), rb = await roboto();
    if (rb.n) { doc.addFileToVFS("Roboto-Regular.ttf", rb.n); doc.addFont("Roboto-Regular.ttf", "Roboto", "normal"); doc.addFileToVFS("Roboto-Bold.ttf", rb.b); doc.addFont("Roboto-Bold.ttf", "Roboto", "bold"); }
    const font = (b, z) => { doc.setFont(rb.n ? "Roboto" : "helvetica", b ? "bold" : "normal"); doc.setFontSize(z); };
    const logo = await keDataUrl("/img/lembaga/sumber-bnpb.png"), W = 297, M = 12, lw = lebar(D, W - 2 * M), rowH = 6.2;
    let y = 0, hal = 0;
    const kepalaHal = () => { hal++; if (hal > 1) doc.addPage();
      if (logo) doc.addImage(logo, "PNG", W - M - 12, 7, 12, 12);
      font(true, 13); doc.setTextColor(11, 37, 69); doc.text(judul, M, 13); font(false, 9); doc.setTextColor(91, 107, 133); doc.text(sub, M, 18.5);
      y = 24; doc.setFillColor(11, 37, 69); doc.rect(M, y, W - 2 * M, 8, "F"); font(true, 7.5); doc.setTextColor(255, 255, 255);
      let x = M; D.kepala.forEach((k, i) => { doc.text(doc.splitTextToSize(String(k), lw[i] - 2)[0], x + lw[i] / 2, y + 5.2, {align: "center"}); x += lw[i]; }); y += 8; };
    kepalaHal();
    D.baris.forEach((b, r) => { if (y + rowH > 200) kepalaHal();
      const jml = b[0] === "Jumlah" || b.includes("Jumlah"), prov = b[0] === "Provinsi";
      if (jml) { doc.setFillColor(11, 37, 69); doc.rect(M, y, W - 2 * M, rowH, "F"); } else if (r % 2) { doc.setFillColor(243, 247, 253); doc.rect(M, y, W - 2 * M, rowH, "F"); }
      font(jml || prov, 7.5); doc.setTextColor(...(jml ? [255, 255, 255] : [11, 37, 69]));
      let x = M; b.forEach((v, i) => { const s = doc.splitTextToSize(String(v ?? ""), lw[i] - 2)[0] || "", n = typeof angka(String(v)) === "number"; doc.text(s, n ? x + lw[i] - 1.5 : x + 1.5, y + 4.2, {align: n ? "right" : "left"}); x += lw[i]; });
      doc.setDrawColor(219, 229, 243); doc.line(M, y + rowH, W - M, y + rowH); y += rowH; });
    for (let i = 1; i <= hal; i++) { doc.setPage(i); font(false, 7); doc.setTextColor(91, 107, 133); doc.text("Badan Nasional Penanggulangan Bencana  |  Copyright " + tglIni().slice(0, 4), M, 205); doc.text(`${i} / ${hal}`, W - M, 205, {align: "right"}); }
    doc.save(nama + ".pdf");
  }

  async function ppt(D, nama, judul, sub) {
    await skrip(LIB.ppt);
    const p = new window.PptxGenJS(); p.layout = "LAYOUT_WIDE"; p.title = judul;
    const [logo, kris] = await Promise.all([keDataUrl("/img/lembaga/sumber-bnpb.png"), keDataUrl("/img/logo-kris.png")]);
    const PER = 13, lw = lebar(D, 12.53), hal = Math.max(1, Math.ceil(D.baris.length / PER)), F = "Roboto";
    const sel = (v, o = {}) => ({text: String(v ?? ""), options: {fontFace: F, fontSize: 9, color: "0B2545", valign: "middle", margin: [1, 4, 1, 4], ...o}});
    for (let k = 0; k < hal; k++) {
      const s = p.addSlide(); s.background = {color: "FFFFFF"};
      s.addShape(p.ShapeType.rect, {x: 0, y: 0, w: 13.33, h: .12, fill: {color: "0B2545"}, line: {color: "0B2545"}});
      if (logo) s.addImage({data: logo, x: 12.35, y: .25, w: .62, h: .62});
      if (kris) s.addImage({data: kris, x: 11.6, y: .25, w: .62, h: .62});
      s.addText(judul + (hal > 1 ? ` (${k + 1}/${hal})` : ""), {x: .4, y: .25, w: 11, h: .45, fontFace: F, fontSize: 20, bold: true, color: "0B2545"});
      s.addText(sub, {x: .4, y: .7, w: 11, h: .3, fontFace: F, fontSize: 11, color: "5B6B85"});
      const rows = [D.kepala.map(x => sel(x, {bold: true, color: "FFFFFF", fill: {color: "0B2545"}, align: "center", fontSize: 9})),
        ...D.baris.slice(k * PER, (k + 1) * PER).map((b, r) => { const jml = b[0] === "Jumlah" || b.includes("Jumlah"), prov = b[0] === "Provinsi";
          return b.map(v => sel(v, {bold: jml || prov, color: jml ? "FFFFFF" : "0B2545", fill: {color: jml ? "0B2545" : r % 2 ? "F3F7FD" : "FFFFFF"}, align: typeof angka(String(v)) === "number" ? "right" : "left"})); })];
      s.addTable(rows, {x: .4, y: 1.15, w: 12.53, colW: lw, rowH: .36, border: {type: "solid", pt: .5, color: "DBE5F3"}, autoPage: false});
      s.addText("Badan Nasional Penanggulangan Bencana  |  Copyright " + tglIni().slice(0, 4), {x: .4, y: 7.05, w: 9, h: .3, fontFace: F, fontSize: 9, color: "5B6B85"});
      s.addText(String(k + 1), {x: 12.3, y: 7.05, w: .6, h: .3, fontFace: F, fontSize: 9, color: "5B6B85", align: "right"});
    }
    await p.writeFile({fileName: nama + ".pptx"});
  }

  const JENIS = [["xlsx", "Excel"], ["csv", "CSV"], ["pdf", "PDF"], ["ppt", "PPT"]];
  /* tombol(section, info): menu Ekspor di kepala seksi; info() -> {jenis, hari} dibaca saat diklik (tab dan tanggal bisa berganti) */
  function tombol(section, info) {
    const m = h("div", {class: "dl-ek-menu", role: "menu", hidden: true}, ...JENIS.map(([k, t]) => h("button", {type: "button", role: "menuitem", "data-ek": k}, ikon("simpan"), h("span", {teks: t}))));
    const b = h("button", {type: "button", class: "dl-semua dl-ek-btn", "aria-haspopup": "menu", "aria-expanded": "false"}, ikon("simpan"), h("span", {teks: "Ekspor"}));
    const w = h("div", {class: "dl-ek"}, b, m), tutup = () => { m.hidden = true; b.setAttribute("aria-expanded", "false"); };
    b.addEventListener("click", e => { e.stopPropagation(); m.hidden = !m.hidden; b.setAttribute("aria-expanded", String(!m.hidden)); });
    document.addEventListener("click", e => { if (!w.contains(e.target)) tutup(); });
    m.addEventListener("click", async e => { const o = e.target.closest("[data-ek]"); if (!o) return; tutup();
      const t = section.querySelector(".ex-bd table"); if (!t) return alert("Tabel seksi ini belum termuat.");
      const D = data(t); if (!D.baris.length) return alert("Tidak ada baris untuk saringan ini.");
      const {jenis = "", hari = tglIni()} = info?.() || {}, seksi = section.querySelector(".ex-jd h3")?.textContent.trim() || "Tabel";
      const judul = `${seksi} ${jenis}`.trim(), sub = "Pantau Dalops, logbook Pusdalops BNPB sampai " + tglPanjang(hari);
      const nama = ["dalops", jenis, seksi, hari].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      b.setAttribute("aria-busy", "true");
      try { await ({xlsx, csv, pdf, ppt})[o.dataset.ek](D, nama, judul, sub); } catch (err) { alert("Ekspor gagal: " + err.message); } finally { b.removeAttribute("aria-busy"); } });
    return w;
  }
  window.DalopsEkspor = {tombol, data, kepala};
})();
