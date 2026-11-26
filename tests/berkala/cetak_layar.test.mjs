/* Uji CETAK Laporan Berkala di Chrome sungguhan (RENCANA-UJI 2 dan 6; pola tests/warga/kinerja_layar.test.mjs).
   Server Node kecil menyajikan public/ apa adanya, /laporan-bnpb dari public/laporan_bnpb.html, dan berkas angka dari fixture
   tests/berkala/fixtures/angka_bulanan.json sebagai jawaban /api/laporan-berkala/angka (rute nyata LB-07 diuji di uji worker).
   Dicek: tiap kertas A4 tidak meluap, PDF A4 punya halaman sebanyak kertas, daftar isi cocok, L7 gelar, L8 tanpa kapital,
   L9 kepala tabel rata tengah, L11 tanda air draf dan tanpa tanda air di versi beku, L12 tanpa localStorage, dua angka Q28.
   Tanpa Chrome seluruh berkas DILEWATI. Jalan: node --test tests/berkala/cetak_layar.test.mjs (PDF disimpan di LB_PDF bila diisi). */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, writeFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUB = path.join(AKAR, "public");
const MIME = {".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".html": "text/html; charset=utf-8"};
const ANGKA = JSON.parse(readFileSync(path.join(AKAR, "tests/berkala/fixtures/angka_bulanan.json"), "utf8"));
const KEPALA = "Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)";
const TERLARANG = /\bNaN\b|\bundefined\b|\bnull\b|\[object|·|\bAnda\b|\baman\b/g;
/* singkatan resmi dan angka Romawi yang boleh kapital (Q5) */
const SINGKATAN = new Set(["BNPB", "BPBD", "DIBI", "OMC", "BMKG", "PVMBG", "MAGMA", "KRIS", "TNI", "DKI", "DI", "NTT", "WIB", "GIS", "ENSO", "CHIRPS", "NOAA", "RONI", "DMI", "PDF", "JSON", "SK", "II", "III", "IV", "U", "A4", "ASO", "OND", "CPC", "HTH", "KLHK", "GWIS", "MODIS", "BBM"]);   // ASO, OND: kode musim tiga bulan dari iklim_outlook.json; HTH: hari tanpa hujan (tangga.json); KLHK, GWIS, MODIS: sumber luas tahunan; BBM: layanan lifeline
const CHROME = cariChrome();
const salin = o => JSON.parse(JSON.stringify(o));

/* berkas angka dengan tiap daftar di batas tampilan Q21 (14 baris banjir, 12 cuaca, 10 provinsi), supaya luapan terlihat */
function penuh() {
  const a = salin(ANGKA), kab = (k, i) => ({...salin(k), kode: `${k.prov_kode}.${String(50 + i).padStart(2, "0")}`, nama: `Kabupaten Contoh Bernama Panjang ${i + 1}`});
  const bj = a.bab3.banjir; bj.kab = Array.from({length: 14}, (_, i) => ({...kab(bj.kab[i % bj.kab.length], i), surut: ["sudah", "belum", "belum_dilaporkan"][i % 3]})); bj.tabel = bj.kab.map(k => k.kode);
  a.bab3.longsor.kab = Array.from({length: 14}, (_, i) => kab(a.bab3.longsor.kab[0], i));
  a.bab4.cuaca_ekstrem.kab = Array.from({length: 12}, (_, i) => kab(a.bab4.cuaca_ekstrem.kab[0], i)); a.bab4.tabel = a.bab4.cuaca_ekstrem.kab.map(k => ({jenis: "cuaca_ekstrem", kode: k.kode}));
  const provs = Array.from({length: 38}, (_, i) => ({...salin(a.bab1.prov[i % a.bab1.prov.length]), kode: String(11 + i), nama: `Provinsi Contoh ${i + 1}`}));
  a.bab1.prov = provs; a.bab1.prov_teratas = provs.slice(0, 10).map(p => p.kode);
  a.bab2.prov = provs.map((p, i) => ({...salin(ANGKA.bab2.prov[i % ANGKA.bab2.prov.length]), kode: p.kode, nama: p.nama}));
  a.lampiran.prov_jenis = provs.map(p => ({kode: p.kode, nama: p.nama, kejadian: 9, jenis: {karhutla: 1, banjir: 1, longsor: 1, cuaca_ekstrem: 1, kekeringan: 1, gelombang: 1, gempa: 1, erupsi: 1}}));
  a.bab1.bukan_alam.kab_teratas = Array.from({length: 10}, (_, i) => kab(a.bab1.bukan_alam.kab_teratas[0], i));
  a.bab5.gempa = Array.from({length: 8}, () => salin(ANGKA.bab5.gempa[0]));
  a.usulan_temuan = Array.from({length: 7}, (_, i) => ({...salin(ANGKA.usulan_temuan[i % ANGKA.usulan_temuan.length]), kode: "T" + (i + 1)}));
  return a;
}

if (!CHROME) test("uji cetak laporan berkala DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN)"}, () => {});
else {
  let srv, base, br, tab, mode = {angka: ANGKA, baris: null};
  before(async () => {
    srv = http.createServer((q, s) => {
      const u = new URL(q.url, "http://x"), json = (o, st = 200) => { s.statusCode = st; s.setHeader("content-type", "application/json"); s.end(JSON.stringify(o)); };
      if (u.pathname === "/laporan-bnpb") { s.setHeader("content-type", MIME[".html"]); return s.end(readFileSync(path.join(PUB, "laporan_bnpb.html"))); }
      if (u.pathname === "/api/laporan-berkala/angka") return mode.angka ? json(mode.angka) : json({galat: "belum ada"}, 404);
      if (u.pathname === "/api/laporan-berkala") return mode.baris ? json(mode.baris) : json({galat: "belum ada"}, 404);
      const f = path.join(PUB, u.pathname);
      if (f.startsWith(PUB) && existsSync(f) && !f.endsWith("/")) { s.setHeader("content-type", MIME[path.extname(f)] || "application/octet-stream"); return s.end(readFileSync(f)); }
      s.statusCode = 404; s.end();
    });
    await new Promise(ok => srv.listen(0, "127.0.0.1", ok)); base = "http://127.0.0.1:" + srv.address().port;
    br = await bukaPeramban(CHROME); tab = await br.tab();
  });
  after(async () => { await tab?.tutup(); await br?.tutup(); srv?.close(); });
  const URL_LB = "/laporan-bnpb?jenis=berkala&periode=bulanan&kode=2026-10";
  const buka = async (w = 1440, url = URL_LB) => { await tab.ukuran(w, 900); await tab.buka(base + url); await tab.tungguFungsi("!document.querySelector('#lbkCetak')?.disabled", 15000); };
  const luap = () => tab.eval(`[...document.querySelectorAll('.lbk-kertas')].map((k, i) => { const b = k.querySelector('.lbk-badan'); return b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1 || k.scrollHeight > k.clientHeight + 1 ? i + 1 : 0; }).filter(Boolean)`);
  const halamanPdf = async (nama) => {
    const pdf = await tab.kirim("Page.printToPDF", {preferCSSPageSize: true, printBackground: true});
    const buf = Buffer.from(pdf.data, "base64"), t = buf.toString("latin1");
    if (process.env.LB_PDF) { mkdirSync(process.env.LB_PDF, {recursive: true}); writeFileSync(path.join(process.env.LB_PDF, nama), buf); }
    const kotak = [...t.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map(m => [+m[1], +m[2]]);
    return {n: (t.match(/\/Type\s*\/Page[^s]/g) || []).length, kotak};
  };

  test("draf: halaman A4 tanpa luapan, PDF sama banyak dengan kertas, daftar isi cocok, tanda air di tiap halaman", async () => {
    mode = {angka: ANGKA, baris: null}; await buka();
    const jml = await tab.eval("document.querySelectorAll('.lbk-kertas').length");
    assert.ok(jml >= 12, `hanya ${jml} halaman`);
    assert.deepEqual(await luap(), [], "kertas meluap");
    assert.equal(await tab.eval("document.querySelectorAll('.lbk-kertas .lbk-air').length"), jml, "L11: draf wajib bertanda air di tiap halaman");
    assert.match(await tab.eval("document.querySelector('.lbk-air').textContent"), /^Draf, belum dibekukan$/);
    const di = await tab.eval(`[...document.querySelectorAll('#lbDi li')].map(li => [li.querySelector('span').textContent, +li.querySelector('b').textContent])`);
    assert.ok(di.length >= 9, "daftar isi terlalu pendek");
    for (const [judul, hal] of di) {
      const h2 = await tab.eval(`(() => { const k = document.querySelectorAll('.lbk-kertas')[${hal - 1}]; const b = k?.querySelector('.lbk-bab'); return b ? (b.querySelector('small')?.textContent ? b.querySelector('small').textContent + ' ' : '') + b.querySelector('h2').textContent : ''; })()`);
      assert.equal(h2, judul, `daftar isi "${judul}" menunjuk halaman ${hal} yang tidak membuka bab itu`);
    }
    const {n, kotak} = await halamanPdf("draf.pdf");
    assert.equal(n, jml, `PDF ${n} halaman, kertas ${jml}: ada isi yang tumpah ke halaman berikutnya`);
    for (const [w, h] of kotak) { assert.ok(Math.abs(w - 595.3) < 2 && Math.abs(h - 841.9) < 2, `bukan A4: ${w} x ${h}`); }
    assert.deepEqual(tab.galat().filter(g => !/favicon|status of 404/.test(g)), []);
  });

  test("isi: gelar (L7), kepala tabel rata tengah (L9), tanpa kapital (L8), dua angka Q28, kosong bukan nol, tanpa localStorage (L12)", async () => {
    mode = {angka: ANGKA, baris: null}; await buka();
    const kepala = await tab.eval("[...document.querySelectorAll('.lbk-kepala')].map(e => e.textContent)");
    assert.equal(kepala.length, 2, "gelar di sampul dan tanda tangan"); for (const k of kepala) assert.equal(k, KEPALA);
    assert.deepEqual(await tab.eval("[...new Set([...document.querySelectorAll('.lbk-kertas th')].map(th => getComputedStyle(th).textAlign))]"), ["center"]);
    const teks = await tab.eval("[...document.querySelectorAll('.lbk-kertas')].map(k => k.innerText).join('\\n')");
    assert.deepEqual([...new Set(teks.match(TERLARANG) || [])], []);
    const kapital = [...new Set((teks.replaceAll(KEPALA, "").match(/\b[A-Z][A-Z.]+\b/g) || []).filter(x => x.length > 1 || x === "U"))].filter(x => !SINGKATAN.has(x));
    assert.deepEqual(kapital, [], "kata kapital di luar daftar singkatan (Q5)");
    assert.doesNotMatch(await tab.eval("[...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (e) { return []; } }).filter(t => /lb-/.test(t)).join(' ')"), /uppercase/);
    assert.match(teks, /Semua laporan/); assert.match(teks, /Resmi DIBI/);
    assert.match(teks, /Angka 58 memuat semua laporan DIBI, termasuk 1 laporan di bawah ambang bencana\. Angka resmi DIBI tanpa laporan itu 57 kejadian\./);
    assert.match(teks, /tanpa data/, "riwayat bulan tanpa data tampil 'tanpa data', bukan 0");
    assert.match(teks, /0\/31 hari/, "bulan hotspot tanpa data menyebut banyak hari, bukan 0");
    assert.match(teks, /belum diisi/); assert.match(teks, /41\.613/); assert.match(teks, /33\.290 ha/);
    assert.equal(await tab.eval("localStorage.length"), 0, "L12: jenis berkala tidak menulis localStorage");
  });

  test("berkas penuh di batas Q21: tetap tanpa luapan, PDF sama banyak dengan kertas", async () => {
    mode = {angka: penuh(), baris: null}; await buka();
    const jml = await tab.eval("document.querySelectorAll('.lbk-kertas').length");
    assert.deepEqual(await luap(), [], "kertas meluap pada berkas penuh");
    assert.equal((await halamanPdf("penuh.pdf")).n, jml);
    const lanjut = await tab.eval("[...document.querySelectorAll('.lbk-tb')].filter(t => /\\(lanjutan\\)$/.test(t.querySelector('.lbk-cap').textContent)).map(t => t.querySelectorAll('thead th').length)");
    assert.ok(lanjut.length >= 1 && lanjut.every(x => x > 0), "tabel panjang dipecah dengan kepala kolom diulang");
  });

  test("versi beku: tanpa tanda air (L11), isian staf tampil sebagai teks", async () => {
    mode = {angka: ANGKA, baris: {versi: 1, isian: {pembuka: "<img src=x onerror=alert(1)>Kalimat pembuka staf.", kota: "Jakarta", tanggal: "2026-11-12", arahan: "Arahan staf."}}}; await buka();
    assert.equal(await tab.eval("document.querySelectorAll('.lbk-air').length"), 0);
    const teks = await tab.eval("document.querySelector('#lbkKertas').innerText");
    assert.match(teks, /<img src=x onerror=alert\(1\)>Kalimat pembuka staf\./); assert.equal(await tab.eval("document.querySelectorAll('#lbkKertas img[src=x]').length"), 0);
    assert.match(teks, /Jakarta, 12 November 2026/); assert.match(teks, /Versi 1, dibekukan/);
    assert.deepEqual(await luap(), []);
  });

  /* LB-11: halaman cetak ringkas harian (2 sampai 4 halaman, tanpa daftar isi) dan mingguan (daftar isi, satu kertas per bagian) */
  const fxR = p => JSON.parse(readFileSync(path.join(AKAR, `tests/berkala/fixtures/angka_${p}.json`), "utf8"));
  for (const [per, kode, bawah, atas] of [["harian", "2026-10-31", 2, 4], ["mingguan", "2026-W43", 6, 10]]) {
    test(`${per}: A4 tanpa luapan, ${bawah} sampai ${atas} halaman, PDF sama banyak, tanpa kapital dan kata terlarang, prakiraan berlabel`, async () => {
      mode = {angka: fxR(per), baris: null}; await buka(1440, `/laporan-bnpb?jenis=berkala&periode=${per}&kode=${kode}`);
      const jml = await tab.eval("document.querySelectorAll('.lbk-kertas').length");
      assert.ok(jml >= bawah && jml <= atas, `${per}: ${jml} halaman`);
      assert.deepEqual(await luap(), [], "kertas meluap");
      assert.equal((await halamanPdf(`${per}.pdf`)).n, jml);
      assert.equal(await tab.eval("document.querySelectorAll('.lbk-kertas .lbk-air').length"), jml, "draf bertanda air");
      assert.equal(await tab.eval("!!document.querySelector('#lbDi')"), per === "mingguan", "daftar isi hanya mingguan");
      assert.equal(await tab.eval("document.querySelectorAll('.lbk-foto-sampul').length"), 0, "sampul ringkas tanpa foto");
      const teks = await tab.eval("[...document.querySelectorAll('.lbk-kertas')].map(k => k.innerText).join('\\n')");
      assert.deepEqual([...new Set(teks.match(TERLARANG) || [])], []);
      const kapital = [...new Set((teks.replaceAll(KEPALA, "").match(/\b[A-Z][A-Z.]+\b/g) || []).filter(x => x.length > 1))].filter(x => !SINGKATAN.has(x));
      assert.deepEqual(kapital, [], "kata kapital di luar daftar singkatan (Q5)");
      assert.deepEqual(await tab.eval("[...new Set([...document.querySelectorAll('.lbk-kertas th')].map(th => getComputedStyle(th).textAlign))]"), ["center"]);
      assert.equal(await tab.eval("document.querySelectorAll('.lbk-kepala').length"), 1); assert.match(teks, /Kepada Kepala Badan Nasional Penanggulangan Bencana|Kepala Badan Nasional Penanggulangan Bencana,/);
      assert.doesNotMatch(teks, /Dukungan yang dimohon|Arahan yang dimohon/, "Q27: bagian kebijakan hanya bulanan dan tahunan");
      assert.match(teks, /Tentang laporan ini/);
      if (per === "harian") {
        assert.match(teks, /Rerata 7 hari sebelumnya/); assert.match(teks, /bukan pernyataan BMKG/); assert.match(teks, /masih bertambah/, "Q26");
        assert.match(teks, /1\.123\.348|Kota Pekanbaru/);
        assert.match(teks, /Prakiraan untuk 2 November 2026/); assert.match(teks, /sementara, angka DIBI hari itu masih bertambah/, "Q26 banding sementara");
      } else {
        assert.match(teks, /Prediksi model Centurisk97/); assert.match(teks, /Daftar isi/);
        assert.match(teks, /Factsheet monitoring dan potensi karhutla/); assert.match(teks, /Masa/); assert.doesNotMatch(teks, /Awan dingin/, "analisis bukan prediksi kita");
      }
      assert.deepEqual(tab.galat().filter(g => !/favicon|status of 404/.test(g)), []);
    });
  }

  /* LB-12: tahunan memakai halaman cetak bulanan (sampul lengkap, daftar isi) ditambah riwayat 10 tahun, luas tiga sumber, lampiran selisih (D13);
     LF-09 dan KU-10: tabel status layanan dasar dan ringkasan rekomendasi kaji ulang, belum tersedia di bulanan tanpa masukan */
  test("tahunan: A4 tanpa luapan, PDF sama banyak, riwayat 10 tahun, luas berdampingan, selisih lawan versi beku, lifeline dan kaji ulang", async () => {
    mode = {angka: fxR("tahunan"), baris: null}; await buka(1440, "/laporan-bnpb?jenis=berkala&periode=tahunan&kode=2025");
    const jml = await tab.eval("document.querySelectorAll('.lbk-kertas').length");
    assert.deepEqual(await luap(), [], "kertas meluap");
    assert.equal((await halamanPdf("tahunan.pdf")).n, jml);
    const teks = await tab.eval("[...document.querySelectorAll('.lbk-kertas')].map(k => k.innerText).join('\\n')");
    assert.deepEqual([...new Set(teks.match(TERLARANG) || [])], []);
    const kapital = [...new Set((teks.replaceAll(KEPALA, "").match(/\b[A-Z][A-Z.]+\b/g) || []).filter(x => x.length > 1))].filter(x => !SINGKATAN.has(x));
    assert.deepEqual(kapital, [], "kata kapital di luar daftar singkatan (Q5)");
    assert.match(teks, /Laporan tahunan Kepala BNPB/); assert.match(teks, /Daftar isi/); assert.match(teks, /Riwayat 10 tahun/);
    assert.match(teks, /KLHK SiPongi/); assert.match(teks, /GWIS satelit/); assert.match(teks, /tidak dijumlah/);
    assert.match(teks, /324 \(versi 2\)/, "H19 versi beku Oktober"); assert.match(teks, /beda sumber/, "status beda sumber tampil"); assert.match(teks, /angka resmi tahun ini tidak diketahui/, "H20b"); assert.match(teks, /belum ada versi beku/, "bulan tanpa beku bukan 0");
    assert.match(teks, /Banjir Aceh Desember 2025/); assert.match(teks, /lumpuh/); assert.match(teks, /belum diketahui/, "abu tanpa status");
    assert.match(teks, /rekomendasi lewat tenggat/); assert.match(teks, /Siaran pers BNPB per bulan menurut usulan pelaksana/); assert.match(teks, /belum dipanen/, "LB-09: bulan tak dipanen bukan 0");
    assert.match(teks, /Dukungan yang dimohon/, "Q27: bagian kebijakan ada di tahunan");
    assert.deepEqual(tab.galat().filter(g => !/favicon|status of 404/.test(g)), []);
    mode = {angka: ANGKA, baris: null}; await buka();
    const tb = await tab.eval("[...document.querySelectorAll('.lbk-kertas')].map(k => k.innerText).join('\\n')");
    assert.match(tb, /status layanan dasar belum tersedia/); assert.match(tb, /ringkasan rekomendasi kaji ulang belum tersedia/);
  });

  test("tanpa berkas angka di server: pesan jelas, tanpa kertas, tanpa galat", async () => {
    mode = {angka: null, baris: null}; await tab.ukuran(1440, 900); await tab.buka(base + URL_LB);
    await tab.tungguFungsi("/belum tersedia/.test(document.querySelector('#lbkSt')?.textContent || '')");
    assert.equal(await tab.eval("document.querySelectorAll('.lbk-kertas').length"), 0);
    assert.deepEqual(tab.galat().filter(g => !/favicon|status of 404/.test(g)), []);
  });
}
