/* laphar_arsip.mjs: arsip Laporan Harian Pusdalops / Dit. Koordalops BNPB (satu folder per bulan) -> satu JSON per hari.

   Tahap 1 dari 2. Tahap 2 (kode kab, angka dampak, episode, berkas terbit) ada di laphar_arsip.py.

   Pakai:  node scripts/umum/laphar_arsip.mjs [--arsip DIR] [--keluar DIR] [--ulang]
           node scripts/umum/laphar_arsip.mjs uji        self-check luring (pemilihan berkas)
   Bawaan: --arsip  = $LAPHAR_ARSIP atau "D:/Project/Work/BNPB/Pusat Pengendalian Operasi/LAPORAN HARIAN 2026"
           --keluar = data/raw/laphar (di-.gitignore: teks laporan memuat nama korban dan petugas, tidak pernah di-commit)
   Butuh `pdftotext` (xpdf/poppler) di PATH, atau $PDFTOTEXT.

   Aturan:
   * Satu berkas per tanggal: PDF "Laporan Harian (PUSDALOPS|Dit. Koordalops BNPB) DDMMYYYY*.pdf" di folder bulan.
     Salinan kerja ("1. ", "2. ", "Eks ", "Salinan ") dan subfolder (draf PVMBG/BMKG) dilewati. Bila ada beberapa PDF
     sah untuk satu tanggal (".docx.pdf" dan ".docx (1).pdf"), yang terbesar dipakai (yang kecil biasanya terpotong).
   * Teks diambil `pdftotext -layout`, lalu diurai LaporanUrai.urai (public/laporan_urai.js) -- pengurai yang SAMA
     dengan layar /laporan-bnpb, bukan pengurai kedua.
   * Teks di-cache per tanggal; cache dipakai ulang bila ukuran + waktu ubah PDF sama (--ulang memaksa ulang).
   * Tanggal yang hanya punya .docx dicatat di indeks.json `tanpa_pdf` (belum diurai).

   Keluaran: <keluar>/teks/YYYY-MM-DD.txt, <keluar>/hari/YYYY-MM-DD.json {tanggal, berkas, mulai, sampai, kejadian, lewat},
             <keluar>/indeks.json {dibuat, arsip, hari:[{tanggal, berkas, kejadian, lewat}], tanpa_pdf, ganda, peringatan}. */
import {readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync} from "node:fs";
import {execFileSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARSIP_BAWAAN = process.env.LAPHAR_ARSIP || "D:/Project/Work/BNPB/Pusat Pengendalian Operasi/LAPORAN HARIAN 2026";

const RE_BERKAS = /^Laporan Harian (?:PUSDALOPS|Dit\. Koordalops BNPB)\s*\(?(\d{2})(\d{2})(\d{4})\)?/i;
const RE_SALINAN = /^(\d+\.\s|Eks\s|Salinan\s)/i;

/* pilihBerkas([{dir, nama, ukuran}]) -> {pdf: {tanggal: entri}, docx: Set(tanggal), ganda: [tanggal]} */
export function pilihBerkas(daftar) {
  const pdf = {}, cadangan = {}, docx = new Set(), ganda = [];
  for (const e of daftar) {
    const salinan = RE_SALINAN.test(e.nama);
    const m = e.nama.replace(RE_SALINAN, "").match(RE_BERKAS); if (!m) continue;
    const tgl = `${m[3]}-${m[2]}-${m[1]}`;
    if (/\.docx$/i.test(e.nama)) { docx.add(tgl); continue; }
    if (!/\.pdf$/i.test(e.nama)) continue;
    const ke = salinan ? cadangan : pdf;    // salinan kerja ("1. ", "Eks ") hanya mengisi tanggal yang tak punya PDF utama
    if (ke[tgl]) { if (!salinan) ganda.push(tgl); if (e.ukuran <= ke[tgl].ukuran) continue; }
    ke[tgl] = {...e, tanggal: tgl, salinan};
  }
  for (const [t, e] of Object.entries(cadangan)) pdf[t] ||= e;
  return {pdf, docx, ganda: [...new Set(ganda)].sort()};
}

function daftarArsip(arsip) {
  const out = [];
  for (const d of readdirSync(arsip).sort()) {
    const dp = path.join(arsip, d);
    if (!statSync(dp).isDirectory()) continue;
    for (const f of readdirSync(dp)) {
      const fp = path.join(dp, f), s = statSync(fp);
      if (s.isFile()) out.push({dir: d, nama: f, jalur: fp, ukuran: s.size, ubah: Math.round(s.mtimeMs)});
    }
  }
  return out;
}

function muatPengurai() {
  const win = {};
  new Function("window", readFileSync(path.join(AKAR, "public/laporan_urai.js"), "utf8"))(win);
  const prov = Object.fromEntries(Object.entries(JSON.parse(readFileSync(path.join(AKAR, "public/data/laporan.json"), "utf8")).prov).map(([k, v]) => [k, v.nama]));
  return {U: win.LaporanUrai, prov};
}

function teksPdf(e, fTeks, fMeta, ulang) {
  const tanda = `${e.ukuran}:${e.ubah}`;
  if (!ulang && existsSync(fTeks) && existsSync(fMeta) && readFileSync(fMeta, "utf8") === tanda) return readFileSync(fTeks, "utf8");
  rmSync(fTeks, {force: true});            // jangan pernah membaca teks lama bila pdftotext gagal
  execFileSync(process.env.PDFTOTEXT || "pdftotext", ["-q", "-layout", "-enc", "UTF-8", e.jalur, fTeks], {stdio: "ignore"});
  writeFileSync(fMeta, tanda);
  return readFileSync(fTeks, "utf8");
}

function jalan(arg) {
  const ambil = n => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : null; };
  const arsip = ambil("--arsip") || ARSIP_BAWAAN, keluar = path.resolve(AKAR, ambil("--keluar") || "data/raw/laphar"), ulang = arg.includes("--ulang");
  if (!existsSync(arsip)) { console.error(`arsip tidak ada: ${arsip}`); process.exit(2); }
  for (const d of ["teks", "hari"]) mkdirSync(path.join(keluar, d), {recursive: true});
  const {pdf, docx, ganda} = pilihBerkas(daftarArsip(arsip));
  const {U, prov} = muatPengurai();
  const hari = [], peringatan = [];
  for (const tgl of Object.keys(pdf).sort()) {
    const e = pdf[tgl];
    let teks;
    try { teks = teksPdf(e, path.join(keluar, "teks", `${tgl}.txt`), path.join(keluar, "teks", `${tgl}.tanda`), ulang); }
    catch (err) { peringatan.push(`${tgl}: pdftotext gagal (${e.nama})`); continue; }
    const r = U.urai(teks.replace(/\f/g, "\n"), prov);
    if (r.bentuk !== "laphar") { peringatan.push(`${tgl}: bentuk tidak dikenali (${e.nama})`); continue; }
    if (r.mulai && r.mulai !== tgl) peringatan.push(`${tgl}: periode di isi laporan mulai ${r.mulai}, beda dengan nama berkas`);
    const lewat = r.lewat.filter(s => !/tabel status daerah/.test(s));   // bagian I sengaja tidak diambil (status_darurat.py dari CKAN)
    writeFileSync(path.join(keluar, "hari", `${tgl}.json`), JSON.stringify({tanggal: tgl, berkas: `${e.dir}/${e.nama}`, mulai: r.mulai, sampai: r.sampai, kejadian: r.kejadian, lewat}));
    hari.push({tanggal: tgl, berkas: `${e.dir}/${e.nama}`, kejadian: r.kejadian.length, lewat: lewat.length});
  }
  const tanpa_pdf = [...docx].filter(t => !pdf[t]).sort();
  writeFileSync(path.join(keluar, "indeks.json"), JSON.stringify({dibuat: new Date().toISOString(), arsip, hari, tanpa_pdf, ganda, peringatan}, null, 1));
  const n = hari.reduce((a, h) => a + h.kejadian, 0);
  console.log(`${hari.length} hari terurai, ${n} entri kejadian; tanpa PDF: ${tanpa_pdf.length} (${tanpa_pdf.join(", ")}); peringatan: ${peringatan.length}`);
  for (const p of peringatan) console.log("  ! " + p);
}

function uji() {
  const e = (dir, nama, ukuran = 1) => ({dir, nama, ukuran});
  const r = pilihBerkas([
    e("01", "Laporan Harian PUSDALOPS 01012026.docx"), e("01", "Laporan Harian PUSDALOPS 01012026.docx.pdf", 5),
    e("01", "Laporan Harian PUSDALOPS 15012026.docx .pdf"),
    e("08", "Laporan Harian Dit. Koordalops BNPB (08082026).pdf", 3), e("08", "Laporan Harian Dit. Koordalops BNPB 08082026.pdf", 9),
    e("10", "1. Laporan Harian Dit. Koordalops BNPB 17102026.docx"), e("10", "Eks Laporan Harian Dit. Koordalops BNPB 11102026.docx"),
    e("10", "Laporan Harian Dit. Koordalops BNPB 29102026.docx"), e("04", "28042026 - Laporan Pelaksanaan Shift Piket.xlsx - Shift 3.pdf"),
    e("10", "1. Laporan Harian Dit. Koordalops BNPB 18102026.docx.pdf", 99), e("10", "Laporan Harian Dit. Koordalops BNPB 18102026.pdf", 2),
    e("10", "1. Laporan Harian Dit. Koordalops BNPB 20102026.docx.pdf", 4),
  ]);
  const ok = (c, m) => { if (!c) { console.error("GAGAL: " + m); process.exit(1); } };
  ok(Object.keys(r.pdf).sort().join() === "2026-01-01,2026-01-15,2026-08-08,2026-10-18,2026-10-20", "tanggal PDF terpilih: " + Object.keys(r.pdf));
  ok(r.pdf["2026-08-08"].ukuran === 9, "PDF ganda: yang terbesar dipakai");
  ok(r.pdf["2026-10-18"].ukuran === 2 && !r.pdf["2026-10-18"].salinan, "PDF utama menang atas salinan kerja walau lebih kecil");
  ok(r.pdf["2026-10-20"].salinan, "salinan kerja mengisi tanggal tanpa PDF utama");
  ok(r.ganda.join() === "2026-08-08", "ganda tercatat");
  ok([...r.docx].sort().join() === "2026-01-01,2026-10-11,2026-10-17,2026-10-29", "tanggal yang hanya punya docx (termasuk salinan) tercatat: " + [...r.docx]);
  console.log("uji laphar_arsip.mjs: lulus");
}

const [cmd, ...sisa] = process.argv.slice(2);
if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) cmd === "uji" ? uji() : jalan([cmd, ...sisa].filter(Boolean));
