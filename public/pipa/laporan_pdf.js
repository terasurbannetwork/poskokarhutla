/* SIPPA: perender Laporan PDF (DS §3.18, DT §6.4). Blok dari isiLaporan() disusun ke halaman A4 oleh susun() (satu algoritma, dipakai perender
   DAN perkiraan halaman layar), lalu digambar dengan jsPDF lokal /vendor/jspdf (CSP script-src 'self'; laporan_bnpb.js yang memuat jsPDF dari CDN TIDAK disalin)
   dan Roboto (inti/roboto.js). jsPDF disuntik lewat opsi supaya modul ini bisa dijalankan sungguhan di Node. Tanpa data: hanya kode dan teks.
   Butuh global public/inti bila dijalankan di peramban: esc, muatRoboto. */
import {ASET_GAMBAR} from "./laporan_isi.js";

export const HALAMAN = {w: 210, h: 297, kiri: 25, kanan: 20, atas: 25, bawah: 20};
const LEBAR = HALAMAN.w - HALAMAN.kiri - HALAMAN.kanan, X0 = HALAMAN.kiri, Y0 = HALAMAN.atas + 2, Y_MAKS = HALAMAN.h - HALAMAN.bawah;
const PT = 0.3528;   // mm per pt
const WARNA = {teks: [26, 26, 26], teks2: [46, 52, 64], teks3: [107, 114, 128], navy: [5, 28, 44], garis: [191, 197, 204], oranye: [217, 96, 11], muda: [243, 245, 248], putih: [255, 255, 255], slate: [91, 122, 153]};
const WARNA_PIL = {resmi: WARNA.navy, terverifikasi: WARNA.slate, "estimasi-model": WARNA.oranye, "asumsi-kebijakan": WARNA.teks3, hipotesis: WARNA.oranye, menunggu: WARNA.teks3};
const FOTO_LEBAR = 80, FOTO_RASIO = 0.75, FOTO_TINGGI_MAKS = 70;

/* ---------- penyusun halaman: murni, tanpa jsPDF ---------- */
/* ukur = {lebar(teks, pt, tebal) -> mm}. Hasil: larik halaman, tiap halaman larik operasi gambar. bahan.foto = {id: {data, w, h}} bila ada */
const pecah = (ukur, teks, pt, tebal, lebar) => {
  const baris = [];
  for (const para of String(teks).split("\n")) {
    let kini = "";
    for (const kata of para.split(/\s+/).filter(Boolean)) {
      const coba = kini ? `${kini} ${kata}` : kata;
      if (ukur.lebar(coba, pt, tebal) <= lebar) { kini = coba; continue; }
      if (kini) baris.push(kini);
      kini = kata;
      while (ukur.lebar(kini, pt, tebal) > lebar && kini.length > 1) {   // kata tanpa spasi lebih lebar dari kolom: potong per huruf
        let n = kini.length - 1; while (n > 1 && ukur.lebar(kini.slice(0, n), pt, tebal) > lebar) n--;
        baris.push(kini.slice(0, n)); kini = kini.slice(n);
      }
    }
    baris.push(kini);
  }
  return baris;
};

export function susun(lap, ukur, bahan = {}) {
  const hal = [[]];
  let y = Y0;
  const op = o => hal[hal.length - 1].push(o);
  const baru = () => { hal.push([]); y = Y0; };
  const butuh = mm => { if (y + mm > Y_MAKS && y > Y0) baru(); };
  const teks = (x, yy, t, pt, o = {}) => op({t: "teks", x, y: yy, teks: t, pt, ...o});
  const garis = (x1, y1, x2, y2, lebar, warna) => op({t: "garis", x1, y1, x2, y2, lebar, warna});
  const kotak = (x, yy, w, h, isi) => op({t: "kotak", x, y: yy, w, h, isi});
  const lh = pt => pt * PT * 1.15;

  const sumberBaris = b => b.sumber ? pecah(ukur, `Sumber: ${b.sumber}; ${b.waktu}.`, 7.5, false, LEBAR) : [];
  const tulisSumber = b => { for (const s of sumberBaris(b)) { teks(X0, y, s, 7.5, {warna: "teks3"}); y += 3.2; } if (b.sumber) y += 1.5; };

  /* judul laporan, halaman 1 */
  const jd = pecah(ukur, lap.judul, 16, true, LEBAR);
  for (const s of jd) { teks(X0, y, s, 16, {tebal: true, warna: "navy"}); y += 7; }
  kotak(X0, y + 0.5, 22, 0.8, "oranye"); y += 5;

  const blok = lap.blok;
  for (let i = 0; i < blok.length; i++) {
    const b = blok[i];
    if (b.tipe === "judul") {
      const s = pecah(ukur, b.teks, 12, true, LEBAR);
      butuh(s.length * 5.4 + 24); y += 3;
      for (const t of s) { teks(X0, y, t, 12, {tebal: true, warna: "navy"}); y += 5.4; }
      y += 1;
    } else if (b.tipe === "paragraf") {
      const s = pecah(ukur, b.teks, 10, false, LEBAR);
      butuh(Math.min(s.length, 3) * lh(10) + (b.sumber ? 4 : 0));
      for (const t of s) { butuh(lh(10)); teks(X0, y, t, 10, {}); y += lh(10); }
      y += 0.8; tulisSumber(b); y += 1.2;
    } else if (b.tipe === "pil") {
      const run = []; while (i < blok.length && blok[i].tipe === "pil") run.push(blok[i++]); i--;
      let x = X0; butuh(8);
      for (const p of run) {
        const w = ukur.lebar(p.teks, 7.5, true) + 5;
        if (x + w > X0 + LEBAR) { x = X0; y += 6.4; butuh(6.4); }
        op({t: "pil", x, y, w, h: 4.8, teks: p.teks, kelas: p.kelas}); x += w + 2;
      }
      y += 8;
    } else if (b.tipe === "angka") {
      const run = []; while (i < blok.length && blok[i].tipe === "angka") run.push(blok[i++]); i--;
      /* kotak ringkasan dua kolom: tint muda, garis kiri navy 3 pt */
      const kol = (LEBAR - 5) / 2 - 4, sumberKol = it => pecah(ukur, `Sumber: ${it.sumber}; ${it.waktu}.`, 7.5, false, kol);
      const tinggiItem = it => 5.2 + 5.8 + sumberKol(it).length * 3.2 + 2.4;
      const baris = []; for (let k = 0; k < run.length; k += 2) baris.push(run.slice(k, k + 2));
      const tinggiBaris = baris.map(r => Math.max(...r.map(tinggiItem)));
      const total = tinggiBaris.reduce((a, h) => a + h, 4);
      butuh(total);
      kotak(X0, y, LEBAR, total, "muda"); kotak(X0, y, 1.06, total, "navy");
      let yy = y + 3.5;
      baris.forEach((r, bi) => {
        r.forEach((it, j) => {
          const x = X0 + 5 + j * (kol + 6); let k = yy;
          teks(x, k, it.label, 9, {warna: "teks2"}); k += 5.2;
          teks(x, k, [it.nilai, it.satuan].filter(Boolean).join(" "), 12, {tebal: true, warna: "oranye"});
          if (it.keyakinan) { const t = it.keyakinan.replace("-", " "), w = ukur.lebar(t, 7.5, true) + 5; op({t: "pil", x: x + kol - w, y: k + 0.2, w, h: 4.8, teks: t, kelas: it.keyakinan}); }
          k += 5.8;
          for (const s of sumberKol(it)) { teks(x, k, s, 7.5, {warna: "teks3"}); k += 3.2; }
        });
        yy += tinggiBaris[bi];
      });
      y += total + 4;
    } else if (b.tipe === "foto") {
      const run = []; while (i < blok.length && blok[i].tipe === "foto") run.push(blok[i++]); i--;
      for (let k = 0; k < run.length; k += 2) {
        const par = run.slice(k, k + 2), tinggi = par.map(f => { const m = bahan.foto?.[f.id]; return m ? Math.min(FOTO_TINGGI_MAKS, FOTO_LEBAR * m.h / m.w) : FOTO_LEBAR * FOTO_RASIO; });   // foto gagal termuat: kotak keterangan tetap seukuran foto biasa supaya tata letak tidak melompat
        const ket = par.map(f => pecah(ukur, f.keterangan, 8, false, FOTO_LEBAR)), h = Math.max(...tinggi) + Math.max(...ket.map(s => s.length)) * 3.4 + 4;
        butuh(h);
        par.forEach((f, j) => {
          const x = X0 + j * (FOTO_LEBAR + 5), m = bahan.foto?.[f.id];
          if (m) op({t: "gambar", data: m.data, x, y, w: FOTO_LEBAR, h: tinggi[j]});
          else { kotak(x, y, FOTO_LEBAR, tinggi[j], "muda"); teks(x + FOTO_LEBAR / 2, y + tinggi[j] / 2, "Foto tidak termuat", 8, {warna: "teks3", rata: "tengah"}); }
          ket[j].forEach((t, n) => teks(x, y + tinggi[j] + 3.4 + n * 3.4, t, 8, {warna: "teks3"}));
        });
        y += h;
      }
    } else if (b.tipe === "tabel") {
      tabel(b);
    }
  }

  function tabel(b) {
    const n = b.kepala.length, kanan = new Set(b.kanan || []);
    let w = b.kepala.map((k, c) => Math.max(4, Math.min(60, String(k).length, 60), ...b.baris.map(r => Math.min(60, String(r[c] ?? "").length))));
    if (b.bobot?.length === n) w = b.bobot.slice();
    const tot = w.reduce((a, c) => a + c, 0); w = w.map(x => x / tot * LEBAR);
    let kurang = 0; w = w.map(x => { if (x < 12) { kurang += 12 - x; return 12; } return x; });
    const besar = w.indexOf(Math.max(...w)); w[besar] -= kurang;
    const pad = 1.5, xs = w.map((_, c) => X0 + w.slice(0, c).reduce((a, d) => a + d, 0));
    const sel = (r, pt, tebal) => r.map((t, c) => pecah(ukur, t ?? "", pt, tebal, w[c] - 2 * pad));
    const tinggi = (s, step, tambah) => Math.max(...s.map(x => x.length)) * step + tambah;
    const kepala = sel(b.kepala, 8, true), hKepala = tinggi(kepala, 3.5, 2.8);
    const gambarKepala = () => {
      kotak(X0, y, LEBAR, hKepala, "navy");
      kepala.forEach((s, c) => s.forEach((t, k) => teks(kanan.has(c) ? xs[c] + w[c] - pad : xs[c] + pad, y + 1.6 + k * 3.5, t, 8, {tebal: true, warna: "putih", rata: kanan.has(c) ? "kanan" : "kiri"})));
      y += hKepala;
    };
    const cap = b.judul ? pecah(ukur, b.judul, 9, true, LEBAR) : [];
    const baris = b.baris.map(r => sel(r, 8.5, false));
    butuh(cap.length * 4 + hKepala + (baris.length ? tinggi(baris[0], 3.7, 2.6) : 0) + 2);
    for (const t of cap) { teks(X0, y, t, 9, {tebal: true, warna: "teks2"}); y += 4; }
    y += 0.8; gambarKepala();
    for (const r of baris) {
      const h = tinggi(r, 3.7, 2.6);
      if (y + h > Y_MAKS) { baru(); gambarKepala(); }
      r.forEach((s, c) => s.forEach((t, k) => teks(kanan.has(c) ? xs[c] + w[c] - pad : xs[c] + pad, y + 1.3 + k * 3.7, t, 8.5, {rata: kanan.has(c) ? "kanan" : "kiri"})));
      y += h; garis(X0, y, X0 + LEBAR, y, 0.18, "garis");
    }
    y += 1.8; tulisSumber(b); y += 1.5;
    void n;
  }

  /* blok tanda tangan kosong di kanan bawah halaman terakhir (tanpa nama terisi) */
  if (lap.tanda_tangan?.length) {
    const tinggi = 46, x = X0 + LEBAR - 70;
    if (y + 6 > Y_MAKS - tinggi) baru();
    const atas = Y_MAKS - tinggi;
    teks(x, atas, lap.tanda_tangan[0], 10, {});
    lap.tanda_tangan.slice(1).forEach((s, k) => { const yy = atas + 20 + k * 7; teks(x, yy, s, 9, {warna: "teks2"}); garis(x + 18, yy + 1.2, x + 70, yy + 1.2, 0.18, "garis"); });
  }
  return hal;
}

/* perkiraan halaman untuk layar: algoritma yang sama, lebar huruf dari rata-rata Roboto */
const ukurPerkiraan = {lebar: (t, pt, tebal) => String(t).length * pt * PT * (tebal ? 0.54 : 0.5)};
export const perkiraanHalaman = lap => susun(lap, ukurPerkiraan, {}).length;

/* ---------- pratinjau layar: markup dibangun dari teks yang dilolosi esc ---------- */
export function pratinjauHtml(lap) {
  const temuan = lap.blok.filter(b => b.tipe === "angka"), bagian = lap.blok.filter(b => b.tipe === "judul"), pil = lap.blok.filter(b => b.tipe === "pil");
  const n = perkiraanHalaman(lap);
  return `<div class="sp-lap-pra"><h3>${esc(lap.judul)}</h3>
    ${pil.length ? `<div class="sp-pil-baris">${pil.map(p => `<span class="sp-yakin ${esc(p.kelas)}">${esc(p.teks)}</span>`).join("")}</div>` : ""}
    <ul class="sp-lap-temuan">${temuan.map(t => `<li><span>${esc(t.label)}</span><b class="num">${esc([t.nilai, t.satuan].filter(Boolean).join(" "))}</b><small>Sumber: ${esc(t.sumber)}; ${esc(t.waktu)}</small></li>`).join("")}</ul>
    <ol class="sp-lap-bagian">${bagian.map(b => `<li>${esc(b.teks.replace(/^\d+\.\s*/, ""))}</li>`).join("")}</ol>
    <p class="ad-catat">Perkiraan ${esc(String(n))} halaman A4. Nama berkas: <span class="num">${esc(lap.nama_berkas)}</span></p></div>`;
}

/* ---------- perender jsPDF ---------- */
function tanamRoboto(doc, r) {
  if (!r || !r.n || !r.b) return false;
  doc.addFileToVFS("Roboto-Regular.ttf", r.n); doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", r.b); doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  return true;
}

/* opsi: {jsPDF (kelas), roboto: {n, b} base64, logo: dataURL PNG atau null, logoRasio, foto: {id: {data, w, h}}} -> {byte: Uint8Array, halaman, nama, huruf} */
export async function buatPdf(lap, opsi) {
  const {jsPDF} = opsi;
  const doc = new jsPDF({unit: "mm", format: "a4", orientation: "portrait", compress: true});
  const pakaiRoboto = tanamRoboto(doc, opsi.roboto), huruf = pakaiRoboto ? "Roboto" : "helvetica";
  if (!pakaiRoboto) console.warn("Roboto tidak tersedia, PDF memakai Helvetica");
  const atur = (pt, tebal, warna) => { doc.setFont(huruf, tebal ? "bold" : "normal"); doc.setFontSize(pt); doc.setTextColor(...WARNA[warna || "teks"]); };
  const ukur = {lebar: (t, pt, tebal) => { atur(pt, tebal); return doc.getTextWidth(String(t)); }};
  const halaman = susun(lap, ukur, {foto: opsi.foto || {}});
  doc.setProperties({title: lap.judul, subject: "Laporan SIPPA", author: "BNPB", creator: "SIPPA"});

  const kepala = () => {
    doc.setFillColor(...WARNA.oranye); doc.rect(X0, 10, 0.7, 7, "F");
    atur(8, true); doc.text(pecah(ukur, lap.judul, 8, true, 140)[0], X0 + 3, 13.2);
    atur(8, false, "teks2"); doc.text(`BNPB | ${lap.bulan}`, X0 + 3, 16.8);
    if (opsi.logo) { const r = opsi.logoRasio || 1, h = 8, w = Math.min(24, h * r); doc.addImage(opsi.logo, "PNG", HALAMAN.w - HALAMAN.kanan - w, 10, w, h); }
    doc.setDrawColor(...WARNA.teks); doc.setLineWidth(0.265); doc.line(X0, 20, HALAMAN.w - HALAMAN.kanan, 20);
  };
  const kaki = no => {
    doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.176); doc.line(X0, Y_MAKS + 4, HALAMAN.w - HALAMAN.kanan, Y_MAKS + 4);
    atur(8, false, "teks3"); pecah(ukur, lap.kaki, 8, false, 140).forEach((s, k) => doc.text(s, X0, Y_MAKS + 8 + k * 3.4));
    atur(9, true); doc.text(String(no), HALAMAN.w - HALAMAN.kanan, Y_MAKS + 8, {align: "right"});
  };
  const gambarOp = o => {
    if (o.t === "teks") { atur(o.pt, o.tebal, o.warna); doc.text(o.teks, o.x, o.y + o.pt * PT * 0.78, o.rata ? {align: o.rata === "tengah" ? "center" : o.rata === "kanan" ? "right" : "left"} : undefined); }
    else if (o.t === "garis") { doc.setDrawColor(...WARNA[o.warna]); doc.setLineWidth(o.lebar); doc.line(o.x1, o.y1, o.x2, o.y2); }
    else if (o.t === "kotak") { doc.setFillColor(...WARNA[o.isi]); doc.rect(o.x, o.y, o.w, o.h, "F"); }
    else if (o.t === "gambar") doc.addImage(o.data, "JPEG", o.x, o.y, o.w, o.h);
    else if (o.t === "pil") {
      const c = WARNA_PIL[o.kelas] || WARNA.teks3, putus = o.kelas === "hipotesis" || o.kelas === "menunggu", isi = o.kelas === "resmi";
      doc.setLineWidth(0.26); doc.setDrawColor(...c); if (putus) doc.setLineDashPattern([1, 0.8], 0);
      if (isi) { doc.setFillColor(...WARNA.navy); doc.roundedRect(o.x, o.y, o.w, o.h, 2.4, 2.4, "FD"); } else doc.roundedRect(o.x, o.y, o.w, o.h, 2.4, 2.4, "S");
      if (putus) doc.setLineDashPattern([], 0);
      atur(7.5, true, isi ? "putih" : "teks"); doc.text(o.teks, o.x + o.w / 2, o.y + 3.3, {align: "center"});
    }
  };
  halaman.forEach((ops, i) => { if (i) doc.addPage(); kepala(); ops.forEach(gambarOp); kaki(i + 1); });
  return {byte: new Uint8Array(doc.output("arraybuffer")), halaman: halaman.length, nama: lap.nama_berkas, huruf};
}

/* ---------- bahan peramban: jsPDF, Roboto, logo, foto (tidak jalan di Node) ---------- */
const muatSkrip = src => new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => gagal(new Error(`Gagal memuat ${src}`)); document.head.append(s); });
const keDataUrl = (blob, lebarMaks, jenis) => new Promise((ok, gagal) => {
  const u = URL.createObjectURL(blob), im = new Image();
  im.onload = () => {
    const k = Math.min(1, lebarMaks / im.naturalWidth), c = document.createElement("canvas");
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const g = c.getContext("2d"); if (jenis === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
    ok({data: c.toDataURL(jenis, 0.85), w: c.width, h: c.height});
  };
  im.onerror = () => { URL.revokeObjectURL(u); gagal(new Error("gambar tidak terbaca")); };
  im.src = u;
});
export async function siapkanBahan(lap, sinyal) {
  if (!globalThis.jspdf) await muatSkrip("/vendor/jspdf/jspdf.umd.min.js");
  if (typeof globalThis.muatRoboto !== "function") await muatSkrip("/inti/roboto.js");
  const roboto = await globalThis.muatRoboto();
  let logo = null, logoRasio = 1;
  try { const r = await fetch(ASET_GAMBAR[0], {signal: sinyal}); const m = await keDataUrl(await r.blob(), 400, "image/png"); logo = m.data; logoRasio = m.w / m.h; } catch (e) { if (e.name === "AbortError") throw e; }
  const foto = {};
  for (const b of lap.blok.filter(x => x.tipe === "foto")) {
    try { const r = await fetch(`/api/sippa/foto/${b.id}`, {credentials: "same-origin", signal: sinyal}); if (r.ok) foto[b.id] = await keDataUrl(await r.blob(), 1200, "image/jpeg"); }
    catch (e) { if (e.name === "AbortError") throw e; }
  }
  return {jsPDF: globalThis.jspdf.jsPDF, roboto, logo, logoRasio, foto};
}
