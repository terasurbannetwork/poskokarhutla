/* Pengetahuan berkas Asisten AI (migrasi 0109): ambil teks dari berkas unggahan lalu potong untuk indeks FTS5. Murni (tanpa D1/R2), diuji lewat tests/warga/ai_pengetahuan.test.mjs.
   Jenis: txt, md, csv, json (teks UTF-8) dan docx, pptx, xlsx (zip OOXML dibaca tangan dengan DecompressionStream). PDF belum: butuh pembaca font/aliran yang tak muat di CPU Worker.
   Berkas tidak dijalankan atau diurai di luar teksnya. Batas keras: ukuran masuk, ukuran per entri zip terurai (anti zip bomb), jumlah entri, jumlah potongan. */
export const MAKS_BERKAS = 2 * 1024 * 1024;   // ponytail: 2 MB karena CPU Worker (paket Free 10 ms); naikkan bila indeks pindah ke antrean/Workflow
export const JENIS = ["txt", "md", "csv", "json", "docx", "pptx", "xlsx"];
const MAKS_ENTRI = 6 * 1024 * 1024, MAKS_TOTAL = 8 * 1024 * 1024, MAKS_SLIDE = 500, MAKS_ENTRI_ZIP = 3000, MAKS_TEKS = 500_000, MAKS_POTONGAN = 600, UKURAN_POTONGAN = 800;

export const jenisDariNama = nama => { const m = /\.([a-z0-9]{1,5})$/i.exec(String(nama || "")); const j = m && m[1].toLowerCase(); return JENIS.includes(j) ? j : null; };
const OOXML = ["docx", "pptx", "xlsx"];
const awalZip = b => b.length > 30 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4;

/* Cek isi sesuai jenis yang diklaim ekstensi: kembalikan teks galat atau null */
export function periksaIsi(jenis, b) {
  if (OOXML.includes(jenis)) return awalZip(b) ? null : `berkas .${jenis} tidak berisi format zip Office yang sah`;
  if (b.includes(0)) return "berkas teks tidak boleh berisi byte biner";
  try { new TextDecoder("utf-8", {fatal: true}).decode(b); } catch (e) { return "berkas teks harus berkode UTF-8"; }
  return null;
}

async function inflasi(data, batas) {
  const rd = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader(), bagian = []; let n = 0;
  for (;;) {
    const {value, done} = await rd.read(); if (done) break;
    n += value.length; if (n > Math.min(MAKS_ENTRI, batas)) { await rd.cancel(); throw new Error("isi zip terlalu besar setelah dibuka"); }
    bagian.push(value);
  }
  const o = new Uint8Array(n); let p = 0; for (const x of bagian) { o.set(x, p); p += x.length; } return o;
}
/* {nama: fungsi ambil-isi} dari direktori pusat zip; hanya yang namanya lolos saring() yang dibuka */
/* Anti zip bomb: total byte terurai se-zip dibatasi (MAKS_TOTAL), nama entri kembar ditolak (direktori pusat berlapis), entri yang menunjuk data sama ditolak, dan paling banyak `maks` entri dibuka (1 = berhenti di cocokan pertama). */
async function bacaZip(b, saring, maks) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let e = -1; for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("direktori zip tidak ditemukan");
  const jumlah = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  if (jumlah > MAKS_ENTRI_ZIP) throw new Error("terlalu banyak entri di dalam zip");
  const hasil = [], dec = new TextDecoder(), nama_ = new Set(), lokal_ = new Set(); let sisa = MAKS_TOTAL;
  for (let i = 0; i < jumlah; i++) {
    if (p + 46 > b.length || v.getUint32(p, true) !== 0x02014b50) throw new Error("direktori zip rusak");
    const metode = v.getUint16(p + 10, true), kecil = v.getUint32(p + 20, true), nm = v.getUint16(p + 28, true), ex = v.getUint16(p + 30, true), ko = v.getUint16(p + 32, true), lokal = v.getUint32(p + 42, true);
    const nama = dec.decode(b.subarray(p + 46, p + 46 + nm)); p += 46 + nm + ex + ko;
    if (nama_.has(nama)) throw new Error("zip memuat nama entri kembar");
    nama_.add(nama);
    if (!saring(nama)) continue;
    if (hasil.length >= maks) { if (maks === 1) continue; throw new Error("terlalu banyak bagian di dalam berkas"); }
    if (lokal_.has(lokal)) throw new Error("zip memuat entri yang menunjuk data sama");
    lokal_.add(lokal);
    if (lokal + 30 > b.length || v.getUint32(lokal, true) !== 0x04034b50) throw new Error("entri zip rusak");
    const mulai = lokal + 30 + v.getUint16(lokal + 26, true) + v.getUint16(lokal + 28, true);
    if (mulai + kecil > b.length) throw new Error("entri zip terpotong");
    const mentah = b.subarray(mulai, mulai + kecil);
    if (metode !== 0 && metode !== 8) throw new Error("metode kompresi zip tidak didukung");
    const isi = metode === 0 ? mentah : await inflasi(mentah, sisa);
    sisa -= isi.length; if (sisa < 0) throw new Error("isi zip terlalu besar setelah dibuka");
    hasil.push([nama, isi]);
  }
  return hasil;
}
const ENT = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'"};
const xmlKeTeks = x => x.replace(/<\/(w:p|a:p|si|row|w:tr)>|<w:br\/>|<w:tab\/>/g, "\n").replace(/<[^>]*>/g, "")
  .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, k) => ENT[k.toLowerCase()] ?? (k[1] === "x" || k[1] === "X" ? String.fromCodePoint(parseInt(k.slice(2), 16) || 32) : String.fromCodePoint(Number(k.slice(1)) || 32)));
const urutAngka = (a, b) => (parseInt(/(\d+)\.xml$/.exec(a[0])?.[1] || 0) - parseInt(/(\d+)\.xml$/.exec(b[0])?.[1] || 0));

/* Teks polos dari berkas; melempar Error berpesan Indonesia bila gagal */
export async function ekstrakTeks(jenis, b) {
  let t;
  if (OOXML.includes(jenis)) {
    const ambil = jenis === "docx" ? n => n === "word/document.xml" : jenis === "pptx" ? n => /^ppt\/slides\/slide\d+\.xml$/.test(n) : n => n === "xl/sharedStrings.xml";
    const dec = new TextDecoder(), isi = (await bacaZip(b, ambil, jenis === "pptx" ? MAKS_SLIDE : 1)).sort(urutAngka);
    t = isi.map(([, d]) => xmlKeTeks(dec.decode(d))).join("\n");
  } else t = new TextDecoder().decode(b);
  t = t.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!t) throw new Error("tidak ada teks yang bisa dibaca di berkas ini");
  return t.slice(0, MAKS_TEKS);
}

/* Rahasia jelas di dalam berkas: tolak daripada diindeks lalu dikutip ke jawaban. Hanya pola berbentuk pasti, supaya dokumen kebijakan biasa lolos. */
const RAHASIA = [[/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/, "token JWT"], [/\bBearer\s+[A-Za-z0-9._~+\/-]{20,}=*/, "token Bearer"],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s\/:@]+:[^\s\/@]+@/i, "URL berisi nama pengguna dan sandi"], [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "kunci privat"], [/\bAKIA[0-9A-Z]{16}\b/, "kunci akses AWS"], [/\b(?:sk|ghp|gho|xox[bp])[-_][A-Za-z0-9_-]{20,}/, "token API"],
  [/\b(?:secret|token|password|passwd|api[_-]?key)\b["']?\s*[:=]\s*["']?[A-Za-z0-9+\/_-]{16,}/i, "isian rahasia (secret/token/password)"]];
export const cariRahasia = t => RAHASIA.find(([re]) => re.test(t))?.[1] || null;

/* Potongan ~800 huruf, dipotong di batas paragraf; paragraf panjang dipotong keras */
export function potong(t) {
  const out = []; let cur = "";
  const dorong = () => { if (cur.trim()) out.push(cur.trim()); cur = ""; };
  for (let para of t.split(/\n+/)) {
    para = para.trim(); if (!para) continue;
    while (para.length > UKURAN_POTONGAN) { dorong(); out.push(para.slice(0, UKURAN_POTONGAN)); para = para.slice(UKURAN_POTONGAN); }
    if (cur && cur.length + para.length > UKURAN_POTONGAN) dorong();
    cur += (cur ? "\n" : "") + para;
  }
  dorong();
  return out.slice(0, MAKS_POTONGAN);
}

/* Kata kunci dari pertanyaan -> ekspresi MATCH FTS5 (tiap kata dikutip: tanda baca tak bisa menyuntikkan operator) */
export function ekspresiCari(q) {
  const kata = [...new Set((String(q).toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) || []))].slice(0, 12);
  return kata.length ? kata.map(k => `"${k}"`).join(" OR ") : null;
}
