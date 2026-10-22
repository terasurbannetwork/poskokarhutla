/* laporan_koordalops.js: Laporan Hasil Pemantauan Dit. Koordalops BNPB dari isian harian /laporan-bnpb (tanpa input ulang).
   Murni, tanpa DOM, diuji di node. Satu model baris (susun) menjadi tiga keluaran: teks WhatsApp (teks), PDF A4 (pdf), DOCX (docx, zip tanpa kompres tulis tangan).
   Angka hanya dari isian: hitungan kejadian, terbilangnya, tanggal periode. Kolom isian per kejadian: sifat, dampak, status_penetapan, pendampingan, kondisi, entry_no, tempat. */
(() => {
const WJ = "⁠";   // word joiner: "1.⁠ ⁠" tampil sama di WhatsApp
const TEMBUSAN = ["Unsur Pengarah BNPB", "Ess I BNPB", "Ess II BNPB", "Tenaga Ahli Ka.BNPB"];
const JENIS_PANJANG = {karhutla: "Kebakaran Hutan dan Lahan", kekeringan: "Kekeringan", banjir: "Banjir", longsor: "Tanah Longsor", cuaca: "Cuaca Ekstrem", gempabumi: "Gempa Bumi",
  gunungapi: "Erupsi Gunung Api", kebakaran_permukiman: "Kebakaran Permukiman", lainnya: "Kejadian Lainnya"};
const SAT = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
function terbilang(n) {
  n = Math.floor(n); const sisa = (m, d) => (m % d ? " " + terbilang(m % d) : "");
  if (n < 12) return SAT[n]; if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh" + sisa(n, 10);
  if (n < 200) return "seratus" + sisa(n, 100); if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus" + sisa(n, 100);
  if (n < 2000) return "seribu" + sisa(n, 1000); if (n < 1e6) return terbilang(Math.floor(n / 1000)) + " ribu" + sisa(n, 1000);
  return String(n);   // ponytail: di atas sejuta tidak terjadi untuk jumlah kejadian
}
const bil = n => `${n} (${terbilang(n)})`;
const tgl = s => s.slice(8) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4);
const tglPanjang = (s, B) => `${+s.slice(8)} ${B[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const sing = n => String(n || "").replace(/^Kepulauan /, "Kep. ");
const tulis = x => String(x ?? "").trim();
const B = t => ({t, b: true, wa: true}), L = t => ({t, b: true}), N = t => ({t});   // B: tebal di WA dan dokumen; L: tebal hanya di dokumen; N: biasa
const ADA_PREFIKS = /^(Gunung|TN|Taman|Kab\.|Kota|Prov\.|Kec\.|Pulau)\b/i;

function judulKejadian(x, prov) {
  const lok = tulis(x.tempat) || (tulis(x.lokasi) ? (ADA_PREFIKS.test(tulis(x.lokasi)) ? tulis(x.lokasi) : "Kab. " + tulis(x.lokasi)) : "");
  return `Bencana Alam ${JENIS_PANJANG[x.jenis] || JENIS_PANJANG.lainnya} di ${lok || "Prov. " + prov}`;
}

/* model baris. Baris: {s: segmen[], ind, gantung, dok (hanya dokumen), jarak (jeda sebelum, dalam pt)} */
function susun(c) {
  const i = c.isi, ks = i.kejadian || [], prov = c.prov || {}, grup = new Map();
  for (const x of ks) { const k = x.prov || ""; if (!grup.has(k)) grup.set(k, []); grup.get(k).push(x); }
  const awal = i.mulai, akhir = c.tanggal, jam = tulis(i.jam) || "07.00";
  const tb = (Array.isArray(i.tembusan) && i.tembusan.length ? i.tembusan : TEMBUSAN).map(tulis).filter(Boolean);
  const r = [];
  r.push({dok: true, kelas: "kop", s: [B((tulis(i.instansi) || "Badan Nasional Penanggulangan Bencana").toUpperCase())]});
  r.push({dok: true, kelas: "judul", s: [B("Laporan Hasil Pemantauan Dit. Koordalops BNPB")]});
  r.push({dok: true, kelas: "garis", s: [N(`Periode ${tglPanjang(awal, BULAN)} pukul ${jam} WIB sampai ${tglPanjang(akhir, BULAN)} pukul ${jam} WIB`)]});
  r.push({s: [B(`Yth. ${tulis(i.kepada) || "Kepala BNPB"}`)], jarak: 6});
  r.push({s: [N("CC:")]});
  for (const t of tb) r.push({s: [N("- " + t)], ind: 1});
  r.push({s: [N(`Mohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal ${tgl(awal)} pkl ${jam} WIB s.d ${tgl(akhir)} pkl ${jam} WIB sebagai berikut:`)], jarak: 10});
  const lm = typeof i.laporan_masuk === "number" ? bil(i.laporan_masuk) : "-";
  r.push({s: [N(`1.${WJ} ${WJ}Laporan kejadian bencana sejumlah ${lm} kejadian.`)], jarak: 8, gantung: 0.25});
  r.push({s: [N(`2.${WJ} ${WJ}Kejadian menonjol/kejadian berdampak signifikan sejumlah ${bil(ks.length)} kejadian.`)], jarak: 8, gantung: 0.25});
  let h = 0;
  for (const [k, xs] of grup) {
    r.push({s: [B(`${String.fromCharCode(65 + h++)}. Prov. ${sing(prov[k] || k) || "Lainnya"}`)], jarak: 12, jaga: 3});
    xs.forEach((x, n) => {
      const sf = tulis(x.sifat), det = x.entry_no == null || x.entry_no === "" ? "-" : `Entry no ${String(x.entry_no).padStart(2, "0")} laphar ${tgl(awal)}`;
      r.push({s: [N(`${n + 1}. ${judulKejadian(x, sing(prov[k] || k))}`), ...(sf ? [N(" "), B(`(${sf})`)] : [])], jarak: n ? 8 : 2, gantung: 0.25, jaga: 3});
      for (const [lb, v] of [["Dampak", tulis(x.dampak) || tulis(x.utama)], ["Penetapan status", tulis(x.status_penetapan)], ["Pendampingan BNPB", tulis(x.pendampingan)],
        ["Kondisi mutakhir", tulis(x.kondisi) || tulis(x.catatan)], ["Detail", det]]) r.push({s: [N("- "), L(lb + ":"), N(" " + (v || "-"))], gantung: 0.14});
    });
  }
  r.push({s: [N(`Koordinator pembuat laporan: ${tulis(i.koordinator) || "-"}`)], jarak: 14});
  r.push({s: [N("Demikian disampaikan. Mohon arahan lebih lanjut")], jarak: 8});
  return r;
}

/* teks WhatsApp: baris kosong antara blok seperti contoh asli (jarak >= 8 atau 10 = baris kosong; butir dalam blok rapat) */
function teks(c) {
  const out = [];
  for (const b of susun(c)) {
    if (b.dok) continue;
    if (b.jarak >= 8 && out.length) out.push("");
    out.push(" ".repeat(5 * (b.ind || 0)) + b.s.map(g => g.wa ? `*${g.t}*` : g.t).join(""));
  }
  return out.join("\n");
}
const polos = t => t.replace(/⁠/g, "");

/* PDF A4 tegak. doc = jsPDF (unit in); fam = "Roboto" atau "helvetica" */
function pdf(doc, c, fam) {
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), mx = 0.85, atas = 0.8, bawah = 0.85, lebar = PW - 2 * mx, uk = 10.5, lh = uk * 1.45 / 72;
  const baris = susun(c); let y = atas;
  const kata = (b, w0) => {   // bungkus kata per segmen; kembalikan baris-baris [[teks, tebal]]
    const ls = [[]]; let x = 0;
    for (const g of b.s) for (const tk of polos(g.t).split(/(\s+)/)) {
      if (!tk) continue; doc.setFont(fam, g.b ? "bold" : "normal"); doc.setFontSize(uk);
      const w = doc.getTextWidth(tk), lim = w0 - (ls.length > 1 ? (b.gantung || 0) : 0);
      if (x + w > lim && x > 0 && !/^\s+$/.test(tk)) { ls.push([]); x = 0; }
      if (x === 0 && /^\s+$/.test(tk)) continue; ls.at(-1).push([tk, g.b]); x += w;
    }
    return ls;
  };
  const gambar = (ls, x0, b) => ls.forEach((l, k) => {
    let x = x0 + (k ? b.gantung || 0 : 0);
    for (const [tk, tb] of l) { doc.setFont(fam, tb ? "bold" : "normal"); doc.text(tk, x, y, {baseline: "top"}); x += doc.getTextWidth(tk); }
    y += lh;
  });
  doc.setTextColor("#1a1a1a");
  for (const b of baris) {
    if (b.kelas === "kop") { doc.setFillColor("#0f1e2d"); doc.rect(0, 0, PW, 0.55, "F"); doc.setTextColor("#ffffff"); doc.setFont(fam, "bold"); doc.setFontSize(13);
      doc.text(polos(b.s[0].t), PW / 2, 0.275, {align: "center", baseline: "middle"}); doc.setTextColor("#1a1a1a"); y = 0.95; continue; }
    if (b.kelas === "judul") { doc.setFont(fam, "bold"); doc.setFontSize(16); doc.text(b.s[0].t, PW / 2, y, {align: "center", baseline: "top"}); y += 0.34; continue; }
    if (b.kelas === "garis") { doc.setFont(fam, "normal"); doc.setFontSize(10); doc.setTextColor("#555555"); doc.text(b.s[0].t, PW / 2, y, {align: "center", baseline: "top"}); doc.setTextColor("#1a1a1a"); y += 0.26;
      doc.setDrawColor("#d9650b"); doc.setLineWidth(0.02); doc.line(mx, y, PW - mx, y); y += 0.2; continue; }
    const x0 = mx + (b.ind || 0) * 0.3, ls = kata(b, lebar - (b.ind || 0) * 0.3), gap = (b.jarak || 0) / 72;
    if (y + gap + lh * Math.max(ls.length, b.jaga || 1) > PH - bawah) { doc.addPage(); y = atas; } else y += gap;
    gambar(ls, x0, b);
  }
  const total = doc.getNumberOfPages(); doc.setFont(fam, "normal"); doc.setFontSize(9); doc.setTextColor("#666666");
  for (let p = 1; p <= total; p++) { doc.setPage(p); doc.text(`Halaman ${p} dari ${total}`, PW / 2, PH - 0.45, {align: "center"}); }
  return total;
}

/* DOCX: zip tanpa kompres (stored) berisi tiga berkas wajib + footer nomor halaman. Mengembalikan Uint8Array. */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = d => { let c = -1; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function zip(berkas) {
  const e = new TextEncoder(), bag = [], pusat = []; let pos = 0;
  for (const [nama, isi] of berkas) {
    const n = e.encode(nama), d = typeof isi === "string" ? e.encode(isi) : isi, crc = crc32(d), h = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, d.length, 4], [22, d.length, 4], [26, n.length, 2], [28, 0, 2]]
      .forEach(([o, v, w]) => w === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
    const p = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, d.length, 4], [24, d.length, 4], [28, n.length, 2],
      [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]].forEach(([o, v, w]) => w === 4 ? p.setUint32(o, v, true) : p.setUint16(o, v, true));
    bag.push(new Uint8Array(h.buffer), n, d); pusat.push(new Uint8Array(p.buffer), n); pos += 30 + n.length + d.length;
  }
  const ukPusat = pusat.reduce((a, b) => a + b.length, 0), a = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, berkas.length, 2], [10, berkas.length, 2], [12, ukPusat, 4], [16, pos, 4]].forEach(([o, v, w]) => w === 4 ? a.setUint32(o, v, true) : a.setUint16(o, v, true));
  const hasil = new Uint8Array(pos + ukPusat + 22); let o = 0; for (const b of [...bag, ...pusat, new Uint8Array(a.buffer)]) { hasil.set(b, o); o += b.length; }
  return hasil;
}
const xml = t => polos(t).replace(/[&<>"]/g, ch => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[ch]));
function docx(c) {
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const run = (g, ekstra = "") => `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${g.b ? "<w:b/>" : ""}${ekstra}<w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${xml(g.t)}</w:t></w:r>`;
  const p = susun(c).map(b => {
    const tengah = b.kelas === "kop" || b.kelas === "judul" || b.kelas === "garis", kiri = Math.round((b.ind || 0) * 432 + (b.gantung || 0) * 1440), gantung = Math.round((b.gantung || 0) * 1440);
    const ekstra = b.kelas === "kop" ? '<w:color w:val="0F1E2D"/>' : b.kelas === "judul" ? '<w:sz w:val="32"/>' : "";
    return `<w:p><w:pPr><w:keepNext w:val="${b.jaga ? 1 : 0}"/><w:spacing w:before="${Math.round((b.jarak || 0) * 20)}" w:after="${b.kelas === "kop" ? 60 : 40}"/>${tengah ? '<w:jc w:val="center"/>' : ""}${kiri ? `<w:ind w:left="${kiri}" w:hanging="${gantung}"/>` : ""}</w:pPr>${b.s.map(g => run(g, ekstra)).join("")}</w:p>`;
  }).join("");
  const dok = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${p}<w:sectPr><w:footerReference w:type="default" r:id="rId1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1224" w:bottom="1134" w:left="1224" w:header="567" w:footer="567"/></w:sectPr></w:body></w:document>`;
  const fld = t => `<w:r><w:fldChar w:fldCharType="${t}"/></w:r>`, kecil = '<w:rPr><w:sz w:val="18"/></w:rPr>';
  const kaki = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${kecil}<w:t xml:space="preserve">Halaman </w:t></w:r>${fld("begin")}<w:r>${kecil}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>${fld("separate")}<w:r>${kecil}<w:t>1</w:t></w:r>${fld("end")}<w:r>${kecil}<w:t xml:space="preserve"> dari </w:t></w:r>${fld("begin")}<w:r>${kecil}<w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>${fld("separate")}<w:r>${kecil}<w:t>1</w:t></w:r>${fld("end")}</w:p></w:ftr>`;
  const RELS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships", H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zip([
    ["[Content_Types].xml", `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`],
    ["_rels/.rels", `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RELS}/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/_rels/document.xml.rels", `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RELS}/footer" Target="footer1.xml"/></Relationships>`],
    ["word/document.xml", dok], ["word/footer1.xml", kaki]]);
}

window.LaporanKoordalops = {susun, teks, pdf, docx, zip, terbilang, bil, TEMBUSAN, JENIS_PANJANG, WJ};
})();
