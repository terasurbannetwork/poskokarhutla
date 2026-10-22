/* paparan_slide.js: registri slide "Paparan Rakor Karhutla" + lapisan gambar tunggal.
   Satu fungsi gambar per slide menulis lewat kanvas kecil (teks, kotak, garis, bulat, gambar) ke TIGA keluaran yang identik:
   pptx (pptxgenjs), pdf (jsPDF), html (pratinjau). Satuan: inci, huruf: pt, halaman 13,333 x 7,5.
   Angka dibaca apa adanya dari JSON pipeline (laporan, kumulatif, sejarah, kompleks_konsesi, konsesi2026, operasi_resmi);
   di sini hanya penjumlahan, urutan, dan format. Dipakai paparan.js. */
(() => {
const W = 13.333, H = 7.5;
const C = {navy: "0B1F33", jingga: "D9650B", biru: "0B4EA2", teks: "1A1A1A", abu: "F1F1F1", abu2: "777777", garis: "C9CDD2", putih: "FFFFFF", kremJ: "FBEFE3"};
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const LEVEL = ["Pencegahan rutin", "Patroli terpadu", "Siaga pemadaman awal", "Prioritas pemadaman"];
const JENIS = {sawit: "Sawit", hph: "HPH", hti: "HTI", tambang: "Tambang"};

/* ------------------------------------------------------------ format */
const fmt = (n, d = 0) => n == null || isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
const ringkas = n => n == null ? "–" : n >= 1e6 ? fmt(n / 1e6, 2) + " jt" : n >= 1e5 ? fmt(n / 1e3, 0) + " rb" : n >= 1e4 ? fmt(n / 1e3, 1) + " rb" : fmt(n);
const juta = n => fmt(n / 1e6, 2) + " juta";
const tglP = s => { const [y, m, d] = s.split("-"); return `${+d} ${BULAN[m - 1]} ${y}`; };
const tglK = s => { const [, m, d] = s.split("-"); return `${+d} ${BULAN[m - 1].slice(0, 3)}`; };
const jum = a => (a || []).reduce((x, y) => x + (y || 0), 0);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const R = (t, c, b) => ({t, c, b});   // potongan teks berwarna/tebal

/* ------------------------------------------------------------ kanvas: tiga keluaran */
const rataKanan = {l: "left", c: "center", r: "right"};
const runsDari = r => (typeof r === "string" ? [{t: r}] : Array.isArray(r) ? r : [r]).map(x => typeof x === "string" ? {t: x} : x);
/* hanya data URL gambar raster yang dipakai: menutup sisipan CSS/skrip lewat Content-Type server */
const gambarAman = d => typeof d === "string" && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(d);
const rgb = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));

function KanvasPptx(s) {
  return {
    teks(x, y, w, h, r, o = {}) {
      const runs = runsDari(r).map(p => ({text: p.t, options: {color: p.c || o.c || C.teks, bold: p.b ?? o.b ?? false, italic: !!(p.i ?? o.i), fontSize: o.s || 10, fontFace: "Roboto"}}));
      s.addText(runs, {x, y, w, h, margin: 0, align: rataKanan[o.a || "l"], valign: o.v === "m" ? "middle" : "top", wrap: true, fit: "none", lineSpacingMultiple: 1});
    },
    kotak(x, y, w, h, o = {}) {
      s.addShape(o.r ? "roundRect" : "rect", {x, y, w, h, fill: o.f ? {color: o.f} : {type: "none"}, line: o.l ? {color: o.l, width: o.lw || 0.75} : {type: "none"}, ...(o.r ? {rectRadius: Math.min(o.r, h / 2, w / 2)} : {})});
    },
    garis(x1, y1, x2, y2, o = {}) { s.addShape("line", {x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipV: (y2 < y1) !== (x2 < x1), line: {color: o.c || C.navy, width: o.w || 1}}); },
    bulat(cx, cy, r, o = {}) { s.addShape("ellipse", {x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: {color: o.f || C.navy}, line: {type: "none"}}); },
    gambar(d, x, y, w, h) { if (!gambarAman(d)) return; s.addImage({data: d, x, y, w, h}); },
  };
}

function KanvasPdf(doc) {
  const font = (b, i) => doc.__roboto ? doc.setFont("Roboto", b ? "bold" : "normal") : doc.setFont("helvetica", b ? (i ? "bolditalic" : "bold") : (i ? "italic" : "normal"));   // Roboto ditanam paparan.js
  return {
    teks(x, y, w, h, r, o = {}) {
      const size = o.s || 10, lh = size * 1.2 / 72, runs = runsDari(r), lines = [[]];
      doc.setFontSize(size);
      let cur = 0;   // lebar baris berjalan
      for (const p of runs) {
        font(p.b ?? o.b, p.i ?? o.i);
        for (const tok of p.t.split(/(\s+)/)) {
          if (!tok) continue;
          const wd = doc.getTextWidth(tok);
          if (cur + wd > w + 0.001 && lines.at(-1).length && tok.trim()) { lines.push([]); cur = 0; }
          if (!lines.at(-1).length && !tok.trim()) continue;   // spasi di awal baris
          lines.at(-1).push({t: tok, c: p.c || o.c || C.teks, b: p.b ?? o.b, i: p.i ?? o.i, wd}); cur += wd;
        }
      }
      let yy = o.v === "m" ? y + (h - lines.length * lh) / 2 : y;
      for (const ln of lines) {
        while (ln.length && !ln.at(-1).t.trim()) ln.pop();
        const tot = ln.reduce((a, p) => a + p.wd, 0);
        let xx = o.a === "r" ? x + w - tot : o.a === "c" ? x + (w - tot) / 2 : x;
        for (const p of ln) { font(p.b, p.i); doc.setTextColor(...rgb(p.c)); doc.text(p.t, xx, yy, {baseline: "top"}); xx += p.wd; }
        yy += lh;
      }
    },
    kotak(x, y, w, h, o = {}) {
      if (o.f) doc.setFillColor(...rgb(o.f)); if (o.l) { doc.setDrawColor(...rgb(o.l)); doc.setLineWidth((o.lw || 0.75) / 72); }
      const st = o.f && o.l ? "FD" : o.f ? "F" : o.l ? "S" : null; if (!st) return;
      o.r ? doc.roundedRect(x, y, w, h, Math.min(o.r, h / 2, w / 2), Math.min(o.r, h / 2, w / 2), st) : doc.rect(x, y, w, h, st);
    },
    garis(x1, y1, x2, y2, o = {}) { doc.setDrawColor(...rgb(o.c || C.navy)); doc.setLineWidth((o.w || 1) / 72); doc.line(x1, y1, x2, y2); },
    bulat(cx, cy, r, o = {}) { doc.setFillColor(...rgb(o.f || C.navy)); doc.circle(cx, cy, r, "F"); },
    gambar(d, x, y, w, h) { if (!gambarAman(d)) return; doc.addImage(d, (d.slice(5, d.indexOf(";")).split("/")[1] || "png").toUpperCase().replace("JPG", "JPEG"), x, y, w, h); },
  };
}

function KanvasHtml(el) {
  const px = v => (v * 100).toFixed(1) + "px";
  const tambah = (css, isi = "") => { const d = document.createElement("div"); d.style.cssText = "position:absolute;" + css; d.innerHTML = isi; el.appendChild(d); return d; };
  return {
    teks(x, y, w, h, r, o = {}) {   // DOM murni (bukan innerHTML bergaya): lolos CSP tanpa 'unsafe-inline' (halaman /admin)
      const kotak = tambah(`left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};font:${o.s || 10}pt/1.2 Roboto,Helvetica,Arial,sans-serif;font-size:${((o.s || 10) * 100 / 72).toFixed(1)}px;text-align:${rataKanan[o.a || "l"]};display:flex;align-items:${o.v === "m" ? "center" : "flex-start"}`), isi = document.createElement("div");
      isi.style.width = "100%";
      for (const p of runsDari(r)) { const sp = document.createElement("span"); sp.textContent = p.t; sp.style.color = "#" + (p.c || o.c || C.teks); sp.style.fontWeight = (p.b ?? o.b) ? "700" : "400"; sp.style.fontStyle = (p.i ?? o.i) ? "italic" : "normal"; isi.appendChild(sp); }
      kotak.appendChild(isi);
    },
    kotak(x, y, w, h, o = {}) { tambah(`left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};box-sizing:border-box;${o.f ? `background:#${o.f};` : ""}${o.l ? `border:${(o.lw || 0.75) * 100 / 72}px solid #${o.l};` : ""}${o.r ? `border-radius:${px(Math.min(o.r, h / 2, w / 2))};` : ""}`); },
    garis(x1, y1, x2, y2, o = {}) {
      const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, t = (o.w || 1) * 100 / 72;
      tambah(`left:${px(x1)};top:${(y1 * 100 - t / 2).toFixed(1)}px;width:${px(len)};height:${t}px;background:#${o.c || C.navy};transform-origin:0 50%;transform:rotate(${a}deg)`);
    },
    bulat(cx, cy, r, o = {}) { tambah(`left:${px(cx - r)};top:${px(cy - r)};width:${px(2 * r)};height:${px(2 * r)};border-radius:50%;background:#${o.f || C.navy}`); },
    gambar(d, x, y, w, h) { if (!gambarAman(d)) return; tambah(`left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:url("${d}") center/contain no-repeat`); },
  };
}

/* ------------------------------------------------------------ komponen: dibangun dari kanvas, jadi identik di semua keluaran */
function batangV(k, x, y, w, h, items, o = {}) {   // kolom tegak berlabel angka; on = jingga
  const atas = 0.22, bawah = 0.3, mx = Math.max(1, ...items.map(i => i.v || 0)), n = items.length, sl = w / n, bw = sl * 0.62, ty = y + h - bawah;
  k.garis(x, ty, x + w, ty, {c: C.navy, w: 0.75});
  items.forEach((it, i) => {
    const bh = (h - atas - bawah) * (it.v || 0) / mx, bx = x + i * sl + (sl - bw) / 2;
    if (bh > 0.005) k.kotak(bx, ty - bh, bw, bh, {f: it.on ? C.jingga : C.navy});
    k.teks(x + i * sl - 0.1, ty - bh - 0.2, sl + 0.2, 0.18, (it.lab ?? (o.lab || ringkas)(it.v)), {s: 7, a: "c", b: !!it.on, c: it.on ? C.jingga : C.teks});
    k.teks(x + i * sl - 0.1, ty + 0.06, sl + 0.2, 0.2, it.l, {s: 7.5, a: "c", b: !!it.on});
  });
}
function batangH(k, x, y, w, h, items, o = {}) {   // batang mendatar: label kiri, angka di ujung batang
  const lw = o.lw || 1.9, n = items.length, rh = h / n, mx = Math.max(1, ...items.map(i => i.v || 0)), bw = w - lw - 0.75, bh = Math.min(0.22, rh * 0.6);
  items.forEach((it, i) => {
    const yy = y + i * rh, bl = Math.max(0.03, bw * (it.v || 0) / mx);
    k.teks(x, yy, lw - 0.1, rh, it.l, {s: o.s || 8.5, v: "m", b: !!it.on});
    k.kotak(x + lw, yy + (rh - bh) / 2, bl, bh, {f: it.on ? C.jingga : C.navy});
    k.teks(x + lw + bl + 0.06, yy, 0.8, rh, (o.lab || fmt)(it.v), {s: o.s || 8.5, v: "m", b: !!it.on, c: it.on ? C.jingga : C.teks});
  });
}
function judulBagian(k, x, y, w, t) {   // judul kecil + garis di bawahnya
  k.teks(x, y, w, 0.3, t, {s: 12}); k.garis(x, y + 0.33, x + w, y + 0.33, {c: C.navy, w: 0.75});
}
function tabel(k, x, y, w, kol, baris, o = {}) {
  const rh = o.rh || 0.3, hh = o.hh || 0.34, s = o.s || 8.5, tot = kol.reduce((a, c) => a + c.w, 0), sk = w / tot;
  let xx = x; const xs = kol.map(c => { const v = xx; xx += c.w * sk; return v; });
  kol.forEach((c, j) => k.teks(xs[j], y, c.w * sk - 0.08, hh - 0.04, c.j, {s: s, b: true, a: c.a || "l", v: "m"}));
  k.garis(x, y + hh, x + w, y + hh, {c: C.navy, w: 1.25});
  baris.forEach((b, i) => {
    const yy = y + hh + i * rh;
    if (i % 2 === 1) k.kotak(x, yy, w, rh, {f: "F3F3F3"});
    b.forEach((cel, j) => { const c = typeof cel === "object" && cel ? cel : {t: cel}; k.teks(xs[j], yy, kol[j].w * sk - 0.08, rh, String(c.t ?? "–"), {s, v: "m", a: kol[j].a || "l", b: c.b, c: c.c}); });
    k.garis(x, yy + rh, x + w, yy + rh, {c: "DDDDDD", w: 0.5});
  });
}

/* kerangka standar: judul aksi 2 baris (angka jingga), sub-judul, garis, sumber, footer, nomor, logo, panel kanan opsional */
function rangka(k, c, o) {
  const pn = !!o.panel, lebar = pn ? 8.75 : 11.4;
  k.teks(0.6, 0.38, lebar, 0.75, o.judul, {s: 20, b: true});
  if (o.sub) k.teks(0.6, 1.07, pn ? 8.75 : 12.1, 0.25, o.sub, {s: 11});
  k.garis(0.6, 1.33, pn ? 9.35 : 12.75, 1.33, {c: "555555", w: 0.75});
  if (o.sumber) k.teks(0.6, 6.78, pn ? 8.75 : 12.15, 0.22, "Sumber: " + o.sumber, {s: 7, c: C.abu2});
  k.garis(0.6, 7.04, pn ? 9.35 : 12.75, 7.04, {c: "555555", w: 0.75});
  k.teks(0.6, 7.12, 6, 0.2, `${c.merek} | Copyright 2026`, {s: 7.5});
  if (pn) {
    k.kotak(9.63, 0, W - 9.63, H, {f: C.navy});
    k.garis(10.0, 1.33, 12.75, 1.33, {c: "55687A", w: 0.75});
    let yy = 1.6;
    for (const it of o.panel) {
      k.teks(10.0, yy, 2.85, 0.45, it.a, {s: 21, b: true, c: C.jingga});
      k.teks(10.0, yy + 0.46, 2.85, 0.6, it.k, {s: 9, c: C.putih});
      yy += it.tinggi || 1.12;
    }
    k.teks(11.9, 7.12, 0.85, 0.2, String(c.no), {s: 7.5, b: true, a: "r", c: C.putih});
  } else k.teks(12.0, 7.12, 0.75, 0.2, String(c.no), {s: 7.5, b: true, a: "r"});
  logo(k, c, pn ? 12.15 : 12.15);
}
function logo(k, c, x) {
  if (!c.logo) { k.teks(x - 0.4, 0.42, 1.0, 0.3, c.merek.toUpperCase(), {s: 7, b: true, c: C.biru, a: "r"}); return; }
  k.kotak(x, 0.3, 0.6, 0.6, {f: C.putih, r: 0.3}); k.gambar(c.logo, x + 0.07, 0.37, 0.46, 0.46);
}

/* ------------------------------------------------------------ data turunan */
const hariIdx = c => { const i = c.D.laporan.hari.indexOf(c.tgl); return i < 0 ? c.D.laporan.hari.length - 1 : i; };
const irisan = (c, a) => a.slice(Math.max(0, hariIdx(c) - 11), hariIdx(c) + 1);
const kabProv = c => c.D.laporan.kab.filter(x => x.prov === c.prov);
const titikTahun = (c, p) => c.D.sejarah.tahun.map(y => jum(p ? (c.D.sejarah.prov[p]?.[y]) : Object.values(c.D.sejarah.prov).flatMap(v => v[y] || [])));
const levelProv = c => LEVEL[c.D.laporan.prov[c.prov]?.level ?? 0];
const namaProv = (c, p) => c.D.laporan.prov[p]?.nama || p;
const tglTambah = (s, n) => new Date(Date.parse(s) + n * 864e5).toISOString().slice(0, 10);
const batasS = c => tglTambah(c.D.sejarah.dibuat.slice(0, 10), -1);   // arsip sejarah.json memuat titik s.d. sehari sebelum dibuat (aturan laporan.py)
function luasNas(c) {   // luas 2026 pada c.tgl: titik S-NPP arsip x ha_titik + luas harian laporan sesudah batas arsip s.d. c.tgl
  const L = c.D.laporan, tb = L.tahun_berjalan, titik = nasionalS(c).at(-1), b = batasS(c), hat = tb.ha_titik; let extra = 0;
  L.hari.forEach((h, i) => { if (h > b && h <= c.tgl) extra += L.nasional.luas[i]; });
  const ha = Math.round(titik * hat + extra);
  return {ha, rendah: Math.round(ha / hat * tb.ha_titik_rendah), tinggi: Math.round(ha / hat * tb.ha_titik_tinggi), titik, batas: b, extra, hat, awal: tglTambah(b, 1)};
}
/* profil perusahaan dipotong ke c.tgl lewat harian per perusahaan; luas indikasi terbakar dan gambut tidak bisa dipotong (posisi akhir data) */
const sdP = c => (c.D.perusahaan?.perusahaan || []).map(p => p.terakhir).sort().at(-1) || c.tgl;
const potongP = (c, p) => { if (!p.harian?.length) return p; const h = p.harian.filter(x => x[0] <= c.tgl), t7 = tglTambah(c.tgl, -6), pk = h.reduce((a, x) => x[1] > (a?.[1] || 0) ? x : a, null);
  return {...p, titik: jum(h.map(x => x[1])), titik_7h: jum(h.filter(x => x[0] >= t7).map(x => x[1])), hari_aktif: h.length, puncak: pk || p.puncak, terakhir: h.at(-1)?.[0] || p.terakhir}; };
const konsesiAda = c => c.D.perusahaan?.perusahaan?.length > 0;
const urut = (c, f) => (c.D.perusahaan?.perusahaan || []).map(p => potongP(c, p)).filter(p => p.titik > 0).sort((a, b) => (b[f] || 0) - (a[f] || 0));
const jenisProv = c => (c.D.kompleks.jenis || []).map(j => ({k: j.jenis, n: j.prov?.[c.prov] || 0})).filter(j => j.n > 0).sort((a, b) => b.n - a.n);

/* ------------------------------------------------------------ slide */
const REGISTRI = [];
const slide = (id, judul, bagian, siap, gambar) => REGISTRI.push({id, judul, bagian, aktif: true, siap, gambar});

slide("sampul", "Sampul", "awal", () => null, (k, c) => {
  const t = c.templat.sampul || {};
  k.kotak(0, 0, W, H, {f: C.putih});
  k.kotak(9.2, 0, W - 9.2, H, {f: C.navy});
  if (c.foto) { k.gambar(c.foto.data, 9.2, 0, W - 9.2, H); k.teks(9.3, 7.17, W - 9.4, 0.18, c.foto.kredit, {s: 6.5, c: C.putih, a: "r"}); }
  else { k.teks(9.9, 2.4, 3.1, 1.3, "Paparan Rakor Karhutla", {s: 20, b: true, c: C.putih}); k.teks(9.9, 3.5, 3.1, 1.0, `Data ${c.namaProv}, ${tglP(c.tgl)}`, {s: 11, c: "B8C4D0"}); }
  logo(k, c, 0.6);
  k.teks(0.6, 2.0, 8.2, 2.0, `Rapat Koordinasi Penanganan dan Pengendalian Darurat Karhutla Provinsi ${c.namaProv} Tahun 2026`, {s: 30, b: true});
  k.teks(0.6, 4.05, 8.2, 0.35, c.merek, {s: 15, b: true, c: C.biru});
  k.teks(0.6, 4.45, 8.2, 0.3, `Ditujukan kepada seluruh pemangku kepentingan pengendalian karhutla ${c.namaProv}`, {s: 11});
  k.garis(0.6, 5.0, 8.2, 5.0, {c: "555555", w: 0.75});
  let y = 5.15;
  if (t.penyaji) { k.teks(0.6, y, 8.2, 0.22, "DIPRESENTASIKAN OLEH", {s: 8, b: true, c: C.jingga}); k.teks(0.6, y + 0.27, 8.2, 0.3, t.penyaji, {s: 13, b: true}); y += 0.62; }
  if (t.jabatan) { k.teks(0.6, y - 0.05, 8.2, 0.25, t.jabatan, {s: 11, c: C.abu2}); y += 0.3; }
  k.kotak(0.6, y + 0.1, 4.6, 0.45, {f: C.navy, r: 0.22});
  k.teks(0.6, y + 0.1, 4.6, 0.45, [t.lokasi, tglP(c.tgl)].filter(Boolean).join(", "), {s: 11, b: true, c: C.putih, a: "c", v: "m"});
  k.teks(0.6, 7.12, 8, 0.2, `${c.merek} | Copyright 2026`, {s: 7.5});
});

slide("daftar", "Daftar isi", "awal", () => null, (k, c) => {
  k.kotak(0, 0, W, H, {f: C.putih}); k.kotak(4.75, 0, W - 4.75, H, {f: "E6E6E6"});
  logo(k, c, 0.6);
  k.teks(0.6, 3.2, 3.8, 0.7, "Daftar isi", {s: 28, b: true});
  const bag = [["situasi", "SITUASI"], ["konsesi", "LAPORAN KONSESI"], ["arahan", "ARAHAN DAN TINDAK LANJUT"], ["lampiran", "LAMPIRAN"]];
  let y = 1.3, n = 0; k.garis(5.1, y, 12.75, y, {c: "555555", w: 0.75}); y += 0.12;
  for (const [b, nama] of bag) {
    const isi = c.urutan.filter(s => s.bagian === b); if (!isi.length) continue;
    k.teks(5.3, y, 6, 0.2, nama, {s: 8, b: true, c: C.jingga}); y += 0.3;
    for (const s of isi) {
      n++; k.teks(5.8, y, 0.5, 0.26, String(n).padStart(2, "0"), {s: 11, b: true, c: C.biru, v: "m"});
      k.teks(6.3, y, 5.5, 0.26, s.judulTampil, {s: 11, v: "m"}); k.teks(11.4, y, 1.35, 0.26, `hal. ${s.hal}`, {s: 10, b: true, a: "r", v: "m", c: C.navy});
      k.garis(5.3, y + 0.28, 12.75, y + 0.28, {c: "DDDDDD", w: 0.5}); y += 0.31;
    }
  }
  k.garis(5.1, 7.04, 12.75, 7.04, {c: "555555", w: 0.75});
  k.teks(0.6, 7.12, 6, 0.2, `${c.merek} | Copyright 2026`, {s: 7.5}); k.teks(12.0, 7.12, 0.75, 0.2, String(c.no), {s: 7.5, b: true, a: "r"});
});

const selisih = (a, b) => `${a >= b ? "+" : "-"}${fmt(Math.abs(Math.round((a / b - 1) * 100)))} persen`;
const nasionalS = c => Object.values(c.D.sejarah.prov).reduce((a, v) => a.map((x, i) => x + jum(v[c.D.sejarah.tahun[i]])), c.D.sejarah.tahun.map(() => 0));

/* label yang berdekatan digeser vertikal supaya tidak bertumpuk (prioritas = urutan dalam daftar) */
function hindariTumpuk(lab, dx = 0.7, dy = 0.21) {
  const ada = [];
  for (const l of lab) {
    const y0 = l.y, x0 = l.x;
    if (!l.fin && ada.some(o => Math.abs(o.x - l.x) < dx && Math.abs(o.y - l.y) < dy)) l.x = x0 + 0.5;   // coba di kanan puncak dulu
    for (let t = 0; t < 12 && ada.some(o => Math.abs(o.x - l.x) < dx && Math.abs(o.y - l.y) < dy); t++) l.y = y0 + (t % 2 ? 1 : -1) * dy * Math.ceil((t + 1) / 2);
    ada.push(l);
  }
  return lab;
}

slide("nasional", "Kondisi nasional", "situasi", c => c.D.laporan.luas_banding && c.D.sejarah?.prov ? null : "data nasional tidak ada", (k, c) => {
  /* satu definisi: titik VIIRS S-NPP. Luas 2018 dst = pipeline (titik x ha_titik); 2015-2017 = titik x ha_titik (pipeline belum punya seri itu);
     2026 = titik arsip s.d. batas sejarah x ha_titik + luas harian laporan sesudahnya s.d. c.tgl (rumus laporan.py, dipotong ke c.tgl) */
  const L = c.D.laporan, lb = L.luas_banding.sumber[0], tb = L.tahun_berjalan, S = c.D.sejarah, th = S.tahun, tn = nasionalS(c), hat = tb.ha_titik, g = luasNas(c);
  const luas = th.map((y, i) => y === th.at(-1) ? g.ha : lb.ha[y] ?? Math.round(tn[i] * hat)), lain = luas.slice(0, -1);
  const rank = [g.rendah, g.ha, g.tinggi].map(v => 1 + lain.filter(o => o > v).length), rmax = Math.max(...rank), kata = ["", "satu", "dua", "tiga", "empat", "lima", "enam"];
  const klaim = rank.every(r => r === rank[0]) ? (rmax === 1 ? `terluas sejak ${th[0]}` : `terluas ke-${rmax} sejak ${th[0]}`) : `termasuk ${kata[rmax] || rmax} terluas sejak ${th[0]}`;
  const prov26 = Object.entries(S.prov).map(([p, v]) => [p, jum(v[th.at(-1)])]).sort((a, b) => b[1] - a[1]), top = prov26.slice(0, 8), me = prov26.find(x => x[0] === c.prov)?.[1] || 0;
  const t26 = tn.at(-1), i19 = th.indexOf("2019"), m26 = Object.values(S.prov).reduce((a, v) => a.map((x, i) => x + (v[th.at(-1)][i] || 0)), Array(12).fill(0)), agsep = m26[7] + m26[8];
  const uji = (L.sumber?.luas || "").match(/uji balik tahunan meleset sampai ([^;]+)/)?.[1]?.replace(/%/g, " persen").replace(/\u2212/g, "-");
  const tambah = g.extra ? `, ditambah luas harian ${tglK(g.awal)} sampai ${tglK(c.tgl)}` : "";
  rangka(k, c, {
    panel: [
      {a: `sekitar ${fmt(g.ha / 1e6, 1)} juta ha`, k: `perkiraan: ${fmt(g.titik)} titik S-NPP s.d. ${tglK(g.batas)} x ${fmt(hat, 1)} ha${tambah} (${fmt(g.ha)} ha); rentang ${fmt(g.rendah / 1e6, 1)} sampai ${fmt(g.tinggi / 1e6, 1)} juta ha`, tinggi: 1.45},
      {a: fmt(t26), k: `titik panas VIIRS S-NPP 2026 s.d. ${tglP(g.batas)}`},
      ...(i19 >= 0 ? [{a: selisih(t26, tn[i19]), k: `titik 2026 s.d. ${tglK(g.batas)} dibanding setahun penuh 2019 (${fmt(tn[i19])} titik)`}] : []),
      ...(t26 ? [{a: `${pct(agsep, t26)} persen`, k: `titik 2026 (s.d. ${tglK(g.batas)}) terjadi pada Agustus sampai September (${fmt(agsep)} titik)`}] : []),
    ],
    judul: [R(`Sampai ${tglP(c.tgl)}, perkiraan luas lahan terbakar nasional `), R(`sekitar ${fmt(g.ha / 1e6, 1)} juta ha`, C.jingga), R(", " + klaim)],
    sub: [R(c.namaProv, C.biru, true), R(" menyumbang "), R(pct(me, t26) + " persen", C.jingga, true), R(` titik panas nasional (${fmt(me)} titik s.d. ${tglP(g.batas)})`)],
    sumber: `NASA FIRMS VIIRS S-NPP 2015 sampai ${tglP(g.batas)} (arsip ${c.merek}); luas = titik x ${fmt(hat, 1)} ha${uji ? `; uji balik tahunan meleset sampai ${uji}` : ""}; 2015-2017 dihitung dengan faktor yang sama`,
  });
  judulBagian(k, 0.6, 1.6, 4.2, "Perkiraan luas terbakar per tahun (ha)");
  batangV(k, 0.6, 2.1, 4.3, 4.6, th.map((y, i) => ({l: "'" + y.slice(2), v: luas[i], on: i === th.length - 1, lab: i === th.length - 1 ? fmt(luas[i]) : undefined})));
  judulBagian(k, 5.2, 1.6, 4.15, "Titik panas 2026, delapan provinsi teratas");
  batangH(k, 5.2, 2.1, 4.15, 4.5, top.map(([p, v]) => ({l: namaProv(c, p), v, on: p === c.prov})), {lw: 1.55});
});

slide("provinsi", "Kondisi {prov}", "situasi", c => c.D.sejarah.prov[c.prov] ? null : "riwayat provinsi tidak ada", (k, c) => {
  const S = c.D.sejarah, L = c.D.laporan, lp = L.prov[c.prov], th = S.tahun, tt = titikTahun(c, c.prov), ini = tt.at(-1), thIni = th.at(-1), b = batasS(c);
  const rank = Object.keys(S.prov).filter(p => jum(S.prov[p][thIni]) > ini).length + 1, i19 = th.indexOf("2019"), kab = kabProv(c), aktif = kab.filter(x => x.kompleks > 0).length;
  const mBln = +b.slice(5, 7), ip = tt.slice(0, -1).indexOf(Math.max(...tt.slice(0, -1))), puncak = th.slice(0, -1).map((y, i) => [y, tt[i]]).sort((a, b2) => b2[1] - a[1]).slice(0, 3).map(a => a[0]), cut = L.cutoff.slice(0, 10);
  rangka(k, c, {
    panel: [
      {a: fmt(ini), k: `titik panas VIIRS S-NPP 2026 s.d. ${tglP(b)}, peringkat ${rank} dari ${Object.keys(S.prov).length} provinsi`},
      ...(i19 >= 0 ? [{a: selisih(ini, tt[i19]), k: `titik 2026 s.d. ${tglK(b)} dibanding setahun penuh 2019 (${fmt(tt[i19])} titik)`}] : []),
      ...(lp.sipongi_ha ? [{a: fmt(lp.sipongi_ha) + " ha", k: `luas terbakar resmi KLHK SiPongi s.d. ${lp.sipongi_sd}`}] : []),
      ...(lp.padam_ha ? [{a: fmt(lp.padam_ha) + " ha", k: `luas dipadamkan, rekap BNPB s.d. ${tglP(c.D.operasi?.per || c.tgl)}`}] : []),
      {a: fmt(lp.luas_kompleks) + " ha", k: `luas ${fmt(lp.kompleks)} kejadian api yang terdeteksi satelit (kluster titik, posisi laporan ${tglK(cut)})`},
    ],
    judul: [R("Titik panas "), R(c.namaProv, C.biru), R(` sampai ${tglK(b)} 2026 sudah `), R(i19 >= 0 ? selisih(ini, tt[i19]).replace(/^[+-]/, "") + (ini >= tt[i19] ? " di atas" : " di bawah") : "", C.jingga), R(" tahun penuh 2019 dan setara "), R(pct(ini, tt[ip]) + " persen", C.jingga), R(" tahun penuh " + th[ip])],
    sub: [R(fmt(lp.kompleks), C.jingga, true), R(` kejadian api di `), R(fmt(aktif), C.jingga, true), R(` kab/kota; status `), R(levelProv(c), C.biru, true), R(` (posisi laporan ${tglK(cut)})`)],
    sumber: `NASA FIRMS VIIRS S-NPP per tahun, arsip s.d. ${tglP(b)}; luas resmi KLHK SiPongi; kejadian api dan status dari laporan harian ${c.merek} posisi ${tglP(cut)}`,
  });
  judulBagian(k, 0.6, 1.6, 4.2, "Titik panas per tahun");
  batangV(k, 0.6, 2.1, 4.3, 4.6, th.map((y, i) => ({l: "'" + y.slice(2), v: tt[i], on: y === thIni, lab: y === thIni ? fmt(tt[i]) : undefined})));
  judulBagian(k, 5.2, 1.6, 4.15, "Titik per bulan, dibanding tahun puncak");
  const x0 = 5.3, y0 = 2.2, pw = 3.5, ph = 4.0, bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const seri = [...[...puncak].reverse().map((y, i) => ({y, v: S.prov[c.prov][y], c: ["B8C0C8", "8795A3", "46586B"][i], w: 1.5})), {y: thIni, v: S.prov[c.prov][thIni].slice(0, mBln), c: C.jingga, w: 3, on: true}];
  const mx = Math.max(1, ...seri.flatMap(s => s.v)), gx = i => x0 + i * pw / 11, gy = v => y0 + ph - ph * v / mx;
  [0, 0.5, 1].forEach(f => k.garis(x0, gy(mx * f), x0 + pw, gy(mx * f), {c: "E2E2E2", w: 0.5}));
  bln.forEach((bb, i) => k.teks(gx(i) - 0.2, y0 + ph + 0.08, 0.4, 0.2, bb, {s: 7.5, a: "c"}));
  const lab = [];
  [...seri].reverse().forEach(s => {   // 2026 paling dulu, supaya labelnya tidak digeser
    s.v.forEach((v, i) => { if (i) k.garis(gx(i - 1), gy(s.v[i - 1]), gx(i), gy(v), {c: s.c, w: s.w}); });
    s.v.forEach((v, i) => k.bulat(gx(i), gy(v), s.on ? 0.045 : 0.03, {f: s.c}));
    const pk = s.v.indexOf(Math.max(...s.v)); lab.push({x: gx(pk) + (s.on ? 0 : 0.42), y: gy(s.v[pk]) - 0.24, t: ringkas(s.v[pk]), s});
    lab.push({x: Math.min(gx(s.v.length - 1) + 0.08, 8.95) + 0.27, y: gy(s.v.at(-1)) - 0.1, t: s.y, s, fin: true});
  });
  hindariTumpuk(lab, 0.5).forEach(l => l.fin ? k.teks(l.x - 0.27, l.y, 0.55, 0.2, l.t, {s: 8, b: true, c: l.s.on ? C.jingga : l.s.c}) : k.teks(l.x - 0.4, l.y, 0.8, 0.2, l.t, {s: 7.5, a: "c", b: !!l.s.on, c: l.s.on ? C.jingga : C.abu2}));
  k.teks(5.2, y0 - 0.12, 1.2, 0.18, ringkas(mx), {s: 7, c: C.abu2});
});

slide("harian", "Laporan harian nasional dan {prov}", "situasi", c => c.D.laporan.nasional?.titik ? null : "laporan harian tidak ada", (k, c) => {
  const L = c.D.laporan, nas = irisan(c, L.nasional.titik), pv = irisan(c, L.prov[c.prov].titik), hr = irisan(c, L.hari);
  const lab = hr.map(tglK), n7 = nas.slice(-7), rata = Math.round(jum(n7) / n7.length), tujuh = jum(pv.slice(-7));
  const mx = (a, i) => a[i] === Math.max(...a);
  const kab = kabProv(c).map(x => ({...x, t7: jum(irisan(c, x.titik).slice(-7)), l7: jum(irisan(c, x.luas).slice(-7))})).sort((a, b) => b.t7 - a.t7).slice(0, 13);
  rangka(k, c, {
    judul: [R(`Dalam 7 hari terakhir, rata-rata titik panas nasional `), R(fmt(rata) + " titik per hari", C.jingga), R("; "), R(c.namaProv + " ", C.biru), R(fmt(tujuh) + " titik", C.jingga), R(" dalam 7 hari")],
    sumber: `Laporan harian ${c.merek} ${tglP(L.hari[Math.max(0, hariIdx(c) - 11)])} sampai ${tglP(c.tgl)} (MODIS, VIIRS S-NPP, NOAA-20); kejadian api, status, dan FWI posisi laporan ${tglP(L.cutoff.slice(0, 10))} (status dari aturan ${c.merek}; FWI dari Open-Meteo)`,
  });
  judulBagian(k, 0.6, 1.55, 5.2, "Nasional: titik panas per hari");
  batangV(k, 0.6, 2.0, 5.3, 1.95, nas.map((v, i) => ({l: lab[i], v, on: mx(nas, i)})));
  judulBagian(k, 0.6, 4.2, 5.2, `${c.namaProv}: titik panas per hari`);
  batangV(k, 0.6, 4.65, 5.3, 1.95, pv.map((v, i) => ({l: lab[i], v, on: mx(pv, i)})));
  k.garis(6.1, 1.6, 6.1, 6.6, {c: "D5D5D5", w: 0.75});
  judulBagian(k, 6.3, 1.55, 6.45, `${c.namaProv}: kab/kota, 7 hari terakhir`);
  tabel(k, 6.3, 2.0, 6.45, [{j: "Kab/kota", w: 2.0}, {j: "Titik", w: 0.8, a: "r"}, {j: "Luas (ha)", w: 1.0, a: "r"}, {j: "Kejadian", w: 0.9, a: "r"}, {j: "FWI", w: 0.6, a: "r"}, {j: "Status", w: 2.0}],
    kab.map(x => [{t: x.nama, b: x.level === 3}, {t: fmt(x.t7), b: x.level === 3}, fmt(x.l7), fmt(x.kompleks), fmt(x.fwi_maks), {t: LEVEL[x.level ?? 0], c: x.level === 3 ? C.jingga : C.teks, b: x.level === 3}]), {rh: 0.33, s: 8});
});

const stale = (c, per) => !per || (Date.parse(c.tgl) - Date.parse(per)) / 864e5 > 3;
slide("operasi", "Rekap operasi pemadaman", "situasi", c => { const o = c.D.operasi; return !o?.per ? "rekap resmi kosong" : stale(c, o.per) ? `rekap resmi basi (${tglP(o.per)})` : null; }, (k, c) => {
  const o = c.D.operasi, ds = Object.entries(o.dipadamkan_ha || {}).map(([p, v]) => ({l: p === "lainnya" ? "Provinsi lainnya" : namaProv(c, p), v, on: p === c.prov})).sort((a, b) => b.v - a.v);
  const au = o.armada_udara || {}, belum = o.belum_padam_ha || {};
  rangka(k, c, {
    panel: [
      {a: fmt(o.dipadamkan_total_ha) + " ha", k: "luas yang sudah dipadamkan sejak awal operasi"},
      {a: fmt(o.personel_darat), k: "personel darat terlibat dalam pemadaman"},
      {a: `${fmt(au.total)} unit`, k: `armada udara: ${fmt(au.water_bombing)} water bombing dan ${fmt(au.patroli_omc)} patroli dan OMC`},
      ...(o.padam_hari_sama_pct != null ? [{a: `${o.padam_hari_sama_pct} persen`, k: "kebakaran yang dipadamkan pada hari yang sama"}] : []),
    ],
    judul: [R("Operasi pemadaman: "), R(fmt(o.dipadamkan_total_ha) + " ha", C.jingga), R(" sudah dipadamkan, "), R(fmt(o.personel_darat), C.jingga), R(" personel darat dan "), R(fmt(au.total), C.jingga), R(" armada udara"), R(` (s.d. ${tglK(o.per)})`)],
    sub: belum.prioritas_6_prov != null ? [R(`Belum padam: ${fmt(belum.prioritas_6_prov)} ha di enam provinsi yang sering mengalami karhutla dan ${fmt(belum.lainnya)} ha di provinsi lain`)] : null,
    sumber: `Rekap BNPB operasi karhutla 2026 s.d. ${tglP(o.per)} (belum diverifikasi ke dokumen resmi BNPB)`,
  });
  judulBagian(k, 0.6, 1.6, 8.7, "Luas dipadamkan per provinsi (ha)");
  batangH(k, 0.6, 2.1, 8.7, 4.5, ds, {lw: 2.2});
});

slide("konsesi", "Titik panas di konsesi per jenis izin", "konsesi", c => (konsesiAda(c) && c.izinPerusahaan) || jenisProv(c).length ? null : "tidak ada titik di konsesi", (k, c) => {
  /* satu periode per slide: dengan data perusahaan = 1 Januari sampai titik terakhir (konsesi2026); tanpa itu = sejak musim_sejak di kompleks_konsesi.json */
  const kd = konsesiAda(c) && c.izinPerusahaan ? c.D.perusahaan.perusahaan.map(p => potongP(c, p)) : null, raw = kd ? c.D.perusahaan.perusahaan : [], izin = {};
  let j, per;
  if (kd) {
    const t = {}; kd.forEach(p => { if (p.titik > 0) izin[p.jenis] = (izin[p.jenis] || 0) + 1; t[p.jenis] = (t[p.jenis] || 0) + (p.titik || 0); });
    j = Object.entries(t).map(([kk, n]) => ({k: kk, n})).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    per = `1 Januari sampai ${tglP(c.tgl)}`;
  } else { j = jenisProv(c); per = `sejak ${tglP(c.D.kompleks.musim_sejak)}`; }
  const tot = jum(j.map(x => x.n)), gambut = jum(raw.map(p => p.gambut_titik)), tk = jum(raw.map(p => p.titik)), bakar = jum(raw.map(p => p.luas_bakar_ha)), sd = sdP(c), jmlAreal = kd ? kd.filter(p => p.titik > 0).length : 0;
  rangka(k, c, {
    panel: [
      {a: fmt(tot), k: `titik panas ${per} di dalam areal konsesi ${c.namaProv}`},
      ...(kd ? [{a: fmt(jmlAreal), k: "areal konsesi yang terdeteksi titik panas pada periode itu"}, {a: fmt(bakar) + " ha", k: `luas piksel berapi di dalam konsesi (indikatif, bukan pengukuran lapangan; posisi data ${tglK(sd)})`}, {a: pct(gambut, tk) + " persen", k: `titik di konsesi berada di lahan gambut (posisi data ${tglK(sd)})`}] : []),
    ],
    judul: [R(fmt(tot), C.jingga), R(` titik panas ${per} berada di areal konsesi `), R(c.namaProv, C.biru), R(j[0] ? `; terbanyak di ${JENIS[j[0].k] || j[0].k}` : "")],
    sub: "Titik panas berada di dalam areal konsesi; letak titik tidak menunjukkan siapa penyebab kebakaran",
    sumber: `NASA FIRMS VIIRS ${per}${kd ? `; luas piksel berapi dan gambut: posisi data ${tglP(sd)}` : ""}; batas konsesi Kemenhut via GFW (sawit, HPH), Trase (HTI), PPKH Kemenhut (tambang)`,
  });
  judulBagian(k, 0.6, 1.6, 8.7, `Titik di dalam konsesi, per jenis izin (${per})`);
  batangH(k, 0.6, 2.2, 8.7, 3.2, j.map((x, i) => ({l: (JENIS[x.k] || x.k) + (izin[x.k] ? ` (${izin[x.k]} izin)` : ""), v: x.n, on: i === 0})), {lw: 2.4, s: 10});
});

slide("konsesi12", "12 konsesi dengan titik terbanyak", "konsesi", c => konsesiAda(c) && c.izinPerusahaan ? null : (!c.izinPerusahaan ? "data perusahaan hanya di alamat Centurisk97" : "profil perusahaan tidak ada"), (k, c) => {
  const t = urut(c, "titik").slice(0, 12), sawit = t.filter(p => p.jenis === "sawit").length, aktif = t.filter(p => p.titik_7h > 0).length;
  rangka(k, c, {
    judul: [R("12 konsesi", C.jingga), R(" dengan titik panas terbanyak di "), R(c.namaProv, C.biru), R(": "), R(sawit + " kebun sawit", C.jingga), R(", "), R(String(aktif), C.jingga), R(" masih terdeteksi titik dalam 7 hari terakhir")],
    sumber: `NASA FIRMS VIIRS S-NPP 1 Januari sampai ${tglP(c.tgl)}; indikasi terbakar dan persen gambut: posisi data ${tglP(sdP(c))}; batas konsesi Kemenhut via GFW; RSPO: GFW rspo_oil_palm (2020)`,
  });
  tabel(k, 0.6, 1.6, 12.15, [{j: "No", w: 0.4}, {j: "Perusahaan", w: 2.6}, {j: "Jenis", w: 0.7}, {j: "Grup", w: 1.35}, {j: "Kab/kota", w: 1.35}, {j: "Luas izin (ha)", w: 1.0, a: "r"}, {j: "Titik 2026", w: 0.85, a: "r"}, {j: "Titik 7 hari", w: 0.85, a: "r"}, {j: "Indikasi terbakar (ha)", w: 1.1, a: "r"}, {j: "Persen terbakar", w: 0.95, a: "r"}, {j: "Persen gambut", w: 0.95, a: "r"}, {j: "RSPO", w: 1.5}],
    t.map((p, i) => [String(i + 1), {t: p.nama, b: true}, JENIS[p.jenis] || p.jenis, (g => g.length > 34 ? g.slice(0, 33) + "…" : g)(p.grup || (p.rspo?.grup) || "–"), (p.kab || []).join(", ") || "–", fmt(p.luas_ha), fmt(p.titik), {t: fmt(p.titik_7h), c: C.jingga, b: true}, fmt(p.luas_bakar_ha), pct(p.luas_bakar_ha, p.luas_ha) + " persen", p.gambut != null ? Math.round(p.gambut * 100) + " persen" : "–",
      p.jenis === "sawit" ? (p.rspo ? {t: p.rspo.sertifikat ? "Anggota" : "Anggota, tanpa sertifikat", c: "2B7A3D", b: true} : {t: "Bukan anggota", c: C.jingga, b: true}) : "–"]), {rh: 0.375, hh: 0.5, s: 8});
});

slide("profil3", "Tiga perusahaan dengan titik terbanyak", "konsesi", c => konsesiAda(c) && c.izinPerusahaan ? null : (!c.izinPerusahaan ? "data perusahaan hanya di alamat Centurisk97" : "profil perusahaan tidak ada"), (k, c) => {
  const t = urut(c, "titik").slice(0, 3);
  rangka(k, c, {
    judul: [R("Tiga perusahaan", C.biru), R(" dengan titik terbanyak di "), R(c.namaProv, C.biru), R(`: ${t.map(p => p.nama).join(", ")}`)],
    sumber: `Titik VIIRS S-NPP per konsesi 1 Januari sampai ${tglP(c.tgl)}; indikasi terbakar dan gambut: posisi data ${tglP(sdP(c))}; batas konsesi Kemenhut via GFW; indikasi terbakar = piksel 375 m berapi (bukan pengukuran lapangan)`,
  });
  t.forEach((p, i) => {
    const x = 0.6 + i * 4.12, w = 3.95, hr = (p.harian || []).filter(h => h[0] <= c.tgl), akhir = c.tgl, mxHari = Math.max(0, ...(p.kejadian || []).map(e => e[2]));
    k.kotak(x, 1.6, w, 5.05, {l: C.garis, lw: 0.75});
    k.kotak(x, 1.6, w, 0.95, {f: C.navy});
    k.teks(x + 0.15, 1.72, 0.4, 0.6, String(i + 1), {s: 24, b: true, c: C.jingga});
    k.teks(x + 0.65, 1.7, w - 0.8, 0.22, (p.kab || []).concat(c.namaProv).join(", ").toUpperCase(), {s: 7, b: true, c: "E8B27C"});
    k.teks(x + 0.65, 1.95, w - 0.8, 0.55, p.nama, {s: 13, b: true, c: C.putih});
    k.kotak(x + 0.15, 2.7, 0.7, 0.28, {f: C.kremJ, r: 0.14}); k.teks(x + 0.15, 2.7, 0.7, 0.28, JENIS[p.jenis] || p.jenis, {s: 8, b: true, a: "c", v: "m", c: C.jingga});
    if (p.titik_7h > 0) { k.kotak(x + 0.95, 2.7, w - 1.1, 0.28, {f: "FBE3E0", r: 0.14}); k.teks(x + 0.95, 2.7, w - 1.1, 0.28, `Masih ada api, ${fmt(p.titik_7h)} titik 7 hari`, {s: 8, b: true, a: "c", v: "m", c: "B8392B"}); }
    const bx = [[`TITIK PANAS 2026`, fmt(p.titik), p.puncak ? `puncak ${tglK(p.puncak[0])} (${fmt(p.puncak[1])} titik)` : "", C.navy], [`INDIKASI TERBAKAR (${tglK(sdP(c))})`, fmt(p.luas_bakar_ha) + " ha", `${pct(p.luas_bakar_ha, p.luas_ha)} persen dari ${fmt(p.luas_ha)} ha konsesi`, C.jingga],
      [`HARI DENGAN TITIK`, fmt(p.hari_aktif) + " hari", `${(p.kejadian || []).length} kejadian, terlama ${fmt(mxHari)} hari`, C.navy], [`AREAL GAMBUT (${tglK(sdP(c))})`, p.gambut != null ? Math.round(p.gambut * 100) + " persen" : "–", `${fmt(p.gambut_ha)} ha dari ${fmt(p.luas_ha)} ha konsesi`, C.navy]];
    bx.forEach(([a, b, d, wr], j) => { const xx = x + 0.15 + (j % 2) * 1.88, yy = 3.12 + Math.floor(j / 2) * 0.98;
      k.kotak(xx, yy, 1.8, 0.9, {f: C.abu}); k.teks(xx + 0.1, yy + 0.08, 1.6, 0.16, a, {s: 6.5, b: true, c: C.abu2}); k.teks(xx + 0.1, yy + 0.27, 1.65, 0.32, b, {s: 15, b: true, c: wr});
      k.teks(xx + 0.1, yy + 0.6, 1.65, 0.28, d, {s: 7}); });
    k.teks(x + 0.15, 5.12, 0.9, 0.2, "Periode api", {s: 8, c: C.abu2}); k.teks(x + 1.05, 5.12, w - 1.2, 0.2, `${tglP(p.pertama)} sampai ${tglP(p.terakhir)}`, {s: 8});
    // titik per minggu: 14 minggu mundur dari data terakhir
    const mg = Array(14).fill(0), t0 = Date.parse(akhir);
    hr.forEach(([d, n]) => { const g = Math.floor((t0 - Date.parse(d)) / 864e5 / 7); if (g >= 0 && g < 14) mg[13 - g] += n; });
    k.teks(x + 0.15, 5.42, 2, 0.18, "Titik panas per minggu", {s: 7, b: true, c: C.abu2});
    batangV(k, x + 0.15, 5.55, w - 0.3, 1.05, mg.map((v, j) => ({l: "", v, on: j === 13})), {lab: v => v ? fmt(v) : ""});
  });
});

slide("lampiran_kab", "Lampiran: titik dan luas per kab/kota", "lampiran", c => kabProv(c).length ? null : "kab/kota tidak ada", (k, c) => {
  const kab = kabProv(c), a = kab.map(x => ({l: x.nama, v: jum(irisan(c, x.titik))})).sort((x, y) => y.v - x.v).slice(0, 15), b = kab.map(x => ({l: x.nama, v: x.luas_kompleks || 0})).sort((x, y) => y.v - x.v).slice(0, 15);
  a[0] && (a[0].on = true); b[0] && (b[0].on = true);
  rangka(k, c, {
    judul: [R("Lampiran: "), R(a[0]?.l || "", C.jingga), R(" paling banyak titik panas dalam 12 hari terakhir di "), R(c.namaProv, C.biru)],
    sumber: `Laporan harian ${c.merek} s.d. ${tglP(c.tgl)} (MODIS, VIIRS S-NPP, NOAA-20); luas kejadian api dari kluster titik VIIRS berdekatan, posisi laporan ${tglP(c.D.laporan.cutoff.slice(0, 10))}`,
  });
  judulBagian(k, 0.6, 1.6, 5.8, "Titik panas, 12 hari terakhir");
  batangH(k, 0.6, 2.1, 5.8, 4.55, a, {lw: 2.0, s: 8});
  judulBagian(k, 6.95, 1.6, 5.8, "Luas kejadian api (ha)");
  batangH(k, 6.95, 2.1, 5.8, 4.55, b, {lw: 2.0, s: 8});
});

/* ------------------------------------------------------------ slide teks bebas (dari templat; isinya TIDAK dikarang) */
function slideTeks(e) {
  const o = {id: e.id, judul: e.judul || "Slide teks", bagian: e.bagian || "arahan", aktif: e.aktif !== false, tambahan: true, siap: () => null};
  o.gambar = (k, c) => {
    const g = c.gambar?.[e.id], poin = (e.isi || []).filter(Boolean), lebar = g ? 6.4 : 11.4;
    rangka(k, c, {judul: e.judul || "", sub: e.sub || null, sumber: e.sumber || `Templat paparan ${c.merek}`});
    let y = 1.65; const cw = lebar / 0.085 / 11 * 1;   // taksiran karakter per baris pada 14 pt
    poin.forEach(p => { const baris = Math.max(1, Math.ceil(p.length / (lebar * 8.2))), h = baris * 14 * 1.2 / 72;
      if (y + h > 6.7) return; k.bulat(0.72, y + 0.12, 0.05, {f: C.jingga}); k.teks(0.95, y, lebar - 0.4, h, p, {s: 14}); y += h + 0.2; });
    if (g) { const bw = 5.2, bh = 4.9, r = Math.min(bw / g.w, bh / g.h), w = g.w * r, h = g.h * r; k.gambar(g.data, 7.2 + (bw - w) / 2, 1.65 + (bh - h) / 2, w, h); }
  };
  return lengkapi(o);
}

/* buat(ctx) -> {pptx(slide), pdf(doc), html(el)}: satu fungsi gambar, tiga keluaran */
const lengkapi = s => (s.buat = c => ({pptx: sl => s.gambar(KanvasPptx(sl), c), pdf: d => s.gambar(KanvasPdf(d), c), html: el => s.gambar(KanvasHtml(el), c)}), s);
REGISTRI.forEach(lengkapi);
const urlAman = u => /^\/(?!\/)[^\s"'()<>\\]{0,300}$/.test(u);   // gambar_url hanya satu situs: IP penonton tidak bocor ke host luar
const BAGIAN = ["situasi", "konsesi", "arahan", "lampiran"], teksOk = (v, maks) => typeof v === "string" && v.length <= maks, bersih = v => v.replace(/[<>]/g, "");
/* cekTemplat: validasi skema sisi klien (id dikenal, tipe, panjang); mengembalikan salinan bersih atau null */
function cekTemplat(t) {
  try {
    if (!t || typeof t !== "object" || typeof t.versi !== "number" || !Array.isArray(t.slide) || !Array.isArray(t.tambahan || []) || t.slide.length > 60 || (t.tambahan || []).length > 30) return null;
    const tamb = [], idT = new Set(), idR = new Set(REGISTRI.map(s => s.id));
    for (const e of t.tambahan || []) {
      if (!e || !/^[\w-]{1,40}$/.test(e.id) || idR.has(e.id) || idT.has(e.id) || ["__proto__", "constructor", "prototype"].includes(e.id) || !teksOk(e.judul, 160) || !(e.sub == null || teksOk(e.sub, 200)) || !Array.isArray(e.isi || []) || (e.isi || []).length > 30 || !(e.isi || []).every(x => teksOk(x, 500))) return null;
      if (e.gambar_url != null && !(teksOk(e.gambar_url, 300) && urlAman(e.gambar_url))) return null;
      if (e.bagian != null && !BAGIAN.includes(e.bagian)) return null;
      idT.add(e.id); tamb.push({id: e.id, judul: bersih(e.judul), sub: bersih(e.sub || ""), isi: (e.isi || []).map(bersih), gambar_url: e.gambar_url || undefined, bagian: e.bagian || "arahan", setelah: teksOk(e.setelah, 40) ? e.setelah : "", aktif: e.aktif !== false});
    }
    const dikenal = new Set([...REGISTRI.map(s => s.id), ...tamb.map(e => e.id)]), slide = [];
    const lihat = new Set();
    for (const x of t.slide) { if (!x || !dikenal.has(x.id) || typeof x.urutan !== "number" || lihat.has(x.id)) return null; lihat.add(x.id); slide.push({id: x.id, aktif: x.aktif !== false, urutan: x.urutan}); }
    const sp = t.sampul || {}; if (typeof sp !== "object" || ["penyaji", "jabatan", "lokasi"].some(k => !(sp[k] == null || teksOk(sp[k], 160)))) return null;
    return {versi: t.versi, sampul: {penyaji: bersih(sp.penyaji || ""), jabatan: bersih(sp.jabatan || ""), lokasi: bersih(sp.lokasi || "")}, slide, tambahan: tamb};
  } catch (e) { return null; }
}

window.PaparanSlide = {urlAman, cekTemplat, lengkapi, W, H, C, REGISTRI, KanvasPptx, KanvasPdf, KanvasHtml, slideTeks, fmt, tglP, LEVEL};
})();
