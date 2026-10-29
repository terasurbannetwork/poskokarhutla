/* Uji LAYAR /pendataan (Pendataan Satu Data BNPB, Fase 1): Chrome sungguhan membuka public/bnpb/pendataan.html dari server node kecil
   (berkas statis dari public/, header CSP yang sama dengan src/bnpb.js) dengan API /api/pendataan/* DIPALSUKAN di server itu.
   Yang diuji: layar, bukan worker (itu tests/warga). Tanpa Chrome seluruh berkas dilewati dengan pesan. Jalan: node --test tests/bnpb/pendataan.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import {existsSync, readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {KOLOM} from "../../public/bnpb/pendataan_spek.js";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..", "public");
const CHROME = cariChrome();
const TERLARANG = /\bNaN\b|\bundefined\b|\bnull\b|\[object|\bfalse\b|\btrue\b|—|·|\bAnda\b/g;
const bukanLuar = g => !/favicon\.ico|api\/pendataan\/saya|fonts\.(googleapis|gstatic)\.com|ERR_(INTERNET|NAME|CONNECTION)/.test(g);
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml"};

const S = {masuk: false, log: [], isian: [], n: 0};
const awal = () => ({
  akun: {id: "ak1", username: "budi12345", nama: "Budi Uji", nip: "", jabatan: "Staf", unit: "pusdatin", unit_lain: "", email: "b@x.id", wa: "0812", status: "aktif", wajib_ganti: 0},
  isian: S.isian,
  rekan: [{id: "r1", jenis: "data", isi: {nama: "Data logistik gudang", frekuensi: "Harian", bencana: ["Banjir", "Lainnya"], bencana_lain: "Badai"}, dikirim: Date.now() - 3600e3, pengisi: "Siti Rekan",
    berkas: [{id: "b1", nama: "contoh.pdf", mime: "application/pdf", ukuran: 2048, dibuat: Date.now()}]}],
});
let server, base;
function jalankan() {
  return new Promise(ok => {
    server = http.createServer(async (req, res) => {
      const u = new URL(req.url, "http://x"), p = u.pathname;
      const json = (s, o) => { res.writeHead(s, {"content-type": "application/json"}); res.end(JSON.stringify(o)); };
      if (p.startsWith("/api/")) {
        const chunks = []; for await (const c of req) chunks.push(c); const raw = Buffer.concat(chunks);
        let body = null; if ((req.headers["content-type"] || "").includes("json")) { try { body = JSON.parse(raw.toString()); } catch (e) {} }
        S.log.push({m: req.method, p, body, h: req.headers, ukuran: raw.length});
        if (p === "/api/warga/konfig") return json(200, {});
        if (p === "/api/pendataan/daftar") return json(201, {status: "menunggu"});
        if (p === "/api/pendataan/masuk") { S.masuk = true; return json(200, {akun: awal().akun}); }
        if (p === "/api/pendataan/keluar") { S.masuk = false; return json(200, {ok: true}); }
        if (p === "/api/pendataan/saya") return S.masuk ? json(200, awal()) : json(401, {galat: "Belum masuk"});
        if (p === "/api/pendataan/isian") {
          const id = body.id || "n" + (++S.n), ada = S.isian.find(x => x.id === id), kirim = !!body.kirim;
          const rec = {id, jenis: body.jenis, status: kirim ? "terkirim" : "draf", isi: body.isi, dibuat: Date.now(), diubah: Date.now(), dikirim: kirim ? Date.now() : null, berkas: ada?.berkas || []};
          if (ada) Object.assign(ada, rec); else S.isian.push(rec);
          return json(200, {isian: rec});
        }
        if (p.startsWith("/api/pendataan/berkas/")) {
          const b = {id: "f" + (++S.n), nama: decodeURIComponent(req.headers["x-nama"]), mime: req.headers["content-type"], ukuran: raw.length, dibuat: Date.now()};
          S.isian.find(x => x.id === p.split("/").pop())?.berkas.push(b); return json(201, {berkas: b});
        }
        return json(404, {galat: "tidak ada"});
      }
      if (p === "/pendataan") { res.writeHead(200, {"content-type": MIME[".html"], "content-security-policy": CSP}); return res.end(readFileSync(path.join(AKAR, "bnpb/pendataan.html"))); }
      const f = path.join(AKAR, decodeURIComponent(p));
      if (f.startsWith(AKAR) && existsSync(f) && !p.endsWith("/")) { res.writeHead(200, {"content-type": MIME[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); return res.end(readFileSync(f)); }
      res.writeHead(404); res.end("tidak ada");
    }).listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; ok(); });
  });
}

if (!CHROME) test("layar /pendataan", {skip: "Chrome tidak ditemukan (set CHROME_BIN)"}, () => {});
else {
  let br, tab;
  before(async () => { await jalankan(); br = await bukaPeramban(CHROME); tab = await br.tab(); });
  after(async () => { await tab?.tutup(); await br?.tutup(); server?.close(); });
  const bersih = async (label) => {
    const teks = await tab.eval("document.body.innerText + ' ' + [...document.querySelectorAll('dialog')].map(d => d.textContent).join(' ')");
    assert.deepEqual([...new Set(teks.match(TERLARANG) || [])], [], label + ": teks terlarang");
    assert.deepEqual(tab.galat().filter(bukanLuar), [], label + ": galat konsol");
  };
  const tanpaGulirSamping = async label => { for (const [w, hh] of [[1440, 900], [390, 844]]) { await tab.ukuran(w, hh); const l = await tab.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `${label} ${w}px: gulir mendatar ${l.sw} > ${l.iw}`); } await tab.ukuran(1440, 900); };
  const isiTeks = (sel, v) => tab.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", {bubbles: true})); e.dispatchEvent(new Event("change", {bubbles: true})); })()`);
  const dlgKlik = (sel) => tab.eval(`(() => { const e = document.querySelector("dialog[open] " + ${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
  const lihatDlg = js => tab.eval(`(() => { const d = document.querySelector("dialog[open]"); return ${js}; })()`);

  test("belum masuk: dua tab Masuk dan Daftar akun, bersih di 1440 dan 390", async () => {
    await tab.ukuran(1440, 900); await tab.buka(base + "/pendataan", {tunggu: ".pd-auth form"});
    const t = await tab.teks(); assert.match(t, /Masuk/); assert.match(t, /Daftar akun/);
    await bersih("masuk"); await tanpaGulirSamping("masuk");
    await tab.eval("document.querySelector('.pd-auth').scrollIntoView()");
  });

  test("daftar dengan unit Lainnya mengirim unit_lain, lalu tampil pesan menunggu", async () => {
    await tab.klikTeks(".ad-tabs button", "^Daftar akun$"); await tab.tunggu("select[name=unit]");
    assert.equal(await tab.eval("document.querySelector('input[name=unit_lain]').closest('label').hidden"), true);
    for (const [n, v] of [["nama", "Citra Uji"], ["jabatan", "Analis"], ["email", "c@x.id"], ["wa", "08123456789"], ["username", "citra123"], ["sandi", "rahasia-panjang-1"]]) await isiTeks(`[name=${n}]`, v);
    await tab.pilih("select[name=unit]", "lainnya");
    assert.equal(await tab.eval("document.querySelector('input[name=unit_lain]').closest('label').hidden"), false);
    await isiTeks("[name=unit_lain]", "Biro Uji");
    await tab.klik(".pd-auth form button[type=submit]"); await tab.tungguFungsi("/Menunggu persetujuan/.test(document.body.innerText)");
    const d = S.log.filter(x => x.p === "/api/pendataan/daftar").pop();
    assert.equal(d.body.unit, "lainnya"); assert.equal(d.body.unit_lain, "Biro Uji"); assert.equal(d.body.username, "citra123"); assert.equal(d.h["x-pb"], "1");
    await bersih("daftar");
  });

  test("masuk: kepala nama + pil unit, tiga tab berhitungan", async () => {
    await tab.buka(base + "/pendataan", {tunggu: ".pd-auth form"});
    await isiTeks("[name=username]", "budi12345"); await isiTeks("[name=sandi]", "rahasia-panjang-1");
    await tab.klik(".pd-auth form button[type=submit]"); await tab.tunggu(".pd-kepala");
    const t = await tab.eval("document.querySelector('.pd-kepala').innerText");
    assert.match(t, /Budi Uji/); assert.match(t, /Pusdatin/); assert.match(t, /Keluar/); assert.match(t, /Ganti sandi/);
    assert.deepEqual(await tab.eval("[...document.querySelectorAll('.ad-tabs button')].map(b => b.innerText.replace(/\\s+/g, ' '))"), ["Data dan dokumen 0", "Aplikasi 0", "Kebutuhan dan kendala 0"]);
    await bersih("masuk berhasil");
  });

  test("tab Data: rekan hanya baca (pop-up lihat tanpa input, tautan unduh)", async () => {
    assert.match(await tab.eval("document.querySelector('.pd-isi').innerText"), /Isian rekan satu unit/);
    assert.match(await tab.eval("document.querySelector('.pd-isi').innerText"), /Siti Rekan/);
    await tab.klikTeks(".pd-isi .pd-judul", "Data logistik gudang");
    await tab.tunggu("dialog[open] .pd-lihat");
    assert.equal(await lihatDlg("d.querySelectorAll('input,textarea,select').length"), 0);
    assert.match(await lihatDlg("d.innerText"), /Lainnya: Badai/);
    assert.match(await lihatDlg("d.querySelector('a[href=\"/api/pendataan/berkas/b1\"]').getAttribute('download')"), /contoh\.pdf/);
    await bersih("lihat rekan"); await tanpaGulirSamping("lihat rekan");
    await dlgKlik(".pd-dlg-kepala button"); await tab.tungguFungsi("!document.querySelector('dialog')");
  });

  test("form Data: semua label KOLOM.data, Lainnya, syarat langsung, kirim tanpa wajib menandai kolom", async () => {
    await tab.klikTeks(".pd-isi .ad-tombol", "^Tambah$"); await tab.tunggu("dialog[open] .pd-form");
    const teks = await lihatDlg("d.textContent");
    for (const c of KOLOM.data) assert.ok(teks.includes(c.label), `label hilang: ${c.label}`);
    assert.equal(await lihatDlg("d.querySelectorAll('.pd-kolom').length"), KOLOM.data.length);
    /* pil Lainnya memunculkan input teks */
    const lainTampil = k => lihatDlg(`!d.querySelector('[data-k=${k}] .pd-lain').hidden`);
    assert.equal(await lainTampil("bencana"), false);
    await dlgKlik("[data-k=bencana] input[value=Lainnya]"); assert.equal(await lainTampil("bencana"), true);
    await dlgKlik("[data-k=bencana] input[value=Lainnya]"); assert.equal(await lainTampil("bencana"), false);
    /* kolom pilih tunggal juga punya Lainnya */
    assert.equal(await lihatDlg("!!d.querySelector('[data-k=frekuensi] input[value=Lainnya]')"), true);
    /* syarat: jam_siap hanya saat Harian */
    const tampil = k => lihatDlg(`!d.querySelector('[data-k=${k}]').hidden`);
    assert.equal(await tampil("jam_siap"), false);
    await dlgKlik("[data-k=frekuensi] input[value=Harian]"); assert.equal(await tampil("jam_siap"), true);
    await dlgKlik("[data-k=frekuensi] input[value=Mingguan]"); assert.equal(await tampil("jam_siap"), false);
    /* syarat: alasan saat bukan "Ada dan rutin" */
    assert.equal(await tampil("alasan"), false);
    await dlgKlik("[data-k=ketersediaan] input[value='Ada sebagian']"); assert.equal(await tampil("alasan"), true);
    await dlgKlik("[data-k=ketersediaan] input[value='Ada dan rutin']"); assert.equal(await tampil("alasan"), false);
    await dlgKlik("[data-k=ketersediaan] input[value='Belum ada']"); assert.equal(await tampil("alasan"), true);
    await bersih("form data"); await tanpaGulirSamping("form data");
    /* kirim kosong: kolom wajib pertama ditandai, tidak ada POST isian */
    const sebelum = S.log.filter(x => x.p === "/api/pendataan/isian").length;
    await dlgKlik(".pd-dlg-kaki .ad-tombol.utama");
    assert.equal(await lihatDlg("d.querySelector('.pd-kolom.galat')?.dataset.k"), "nama");
    assert.match(await lihatDlg("d.querySelector('.bn-pesan').textContent"), /Nama data, dokumen, atau laporan wajib diisi/);
    assert.equal(S.log.filter(x => x.p === "/api/pendataan/isian").length, sebelum);
  });

  test("simpan draf, unggah berkas, tutup dengan perubahan memunculkan konfirmasi", async () => {
    await isiTeks("#pd-data-nama", "Rekap korban uji");
    await dlgKlik(".pd-dlg-kaki .ad-tombol:not(.utama)");   // Simpan draf
    await tab.tungguFungsi(("/Draf tersimpan/.test(document.querySelector('dialog[open] .bn-pesan').textContent)"));
    const d = S.log.filter(x => x.p === "/api/pendataan/isian").pop();
    assert.equal(d.body.kirim, false); assert.equal(d.body.jenis, "data"); assert.equal(d.body.isi.nama, "Rekap korban uji");
    /* unggah (dua berkas sekaligus) lewat input file */
    await tab.eval(`(() => { const dt = new DataTransfer(); dt.items.add(new File(["%PDF-1.4 uji"], "laporan uji.pdf", {type: "application/pdf"})); dt.items.add(new File(["a,b\\n1,2"], "tabel.csv", {type: "text/csv"}));
      const i = document.querySelector("dialog[open] .pd-berkas input[type=file]"); i.files = dt.files; i.dispatchEvent(new Event("change", {bubbles: true})); })()`);
    await tab.tungguFungsi("document.querySelectorAll('dialog[open] .pd-berkas li').length === 2");
    const up = S.log.filter(x => x.p.startsWith("/api/pendataan/berkas/") && x.m === "POST");
    assert.equal(up.length, 2); assert.equal(decodeURIComponent(up[0].h["x-nama"]), "laporan uji.pdf"); assert.equal(up[0].h["content-type"], "application/pdf"); assert.equal(up[0].h["x-pb"], "1");
    /* ubah tanpa simpan lalu tutup: ada konfirmasi */
    await isiTeks("#pd-data-nama", "Rekap korban uji ubah");
    await dlgKlik(".pd-dlg-kepala button"); await tab.tungguFungsi("document.querySelectorAll('dialog').length === 2");
    assert.match(await tab.eval("[...document.querySelectorAll('dialog')].pop().textContent"), /belum tersimpan/);
    await tab.eval("[...document.querySelectorAll('dialog')].pop().querySelector('.ad-tombol:not(.utama)').click()");   // Batal: form tetap
    await tab.tungguFungsi("document.querySelectorAll('dialog').length === 1");
    await dlgKlik(".pd-dlg-kepala button"); await tab.tungguFungsi("document.querySelectorAll('dialog').length === 2");
    await tab.eval("[...document.querySelectorAll('dialog')].pop().querySelector('.ad-tombol.utama').click()");   // Tutup tanpa menyimpan
    await tab.tungguFungsi("document.querySelectorAll('dialog').length === 0");
    await tab.tungguFungsi("/Rekap korban uji/.test(document.querySelector('.pd-isi').innerText) && /Draf/.test(document.querySelector('.pd-isi').innerText)");
    assert.match(await tab.eval("document.querySelectorAll('.ad-tabs b')[0].textContent"), /^1$/);
    await bersih("sesudah draf"); await tanpaGulirSamping("tabel data");
  });

  test("tab Aplikasi dirender dari KOLOM.aplikasi; tab umum satu form langsung tanpa tabel", async () => {
    await tab.klikTeks(".ad-tabs button", "^Aplikasi"); await tab.klikTeks(".pd-isi .ad-tombol", "^Tambah$"); await tab.tunggu("dialog[open] .pd-form");
    const teks = await lihatDlg("d.textContent"); for (const c of KOLOM.aplikasi) assert.ok(teks.includes(c.label), `label aplikasi hilang: ${c.label}`);
    await dlgKlik(".pd-dlg-kepala button"); await tab.tungguFungsi("!document.querySelector('dialog')");
    await tab.klikTeks(".ad-tabs button", "^Kebutuhan dan kendala"); await tab.tunggu(".pd-inline .pd-form");
    assert.equal(await tab.eval("document.querySelectorAll('.pd-isi table').length"), 0);
    assert.equal(await tab.eval("document.querySelectorAll('.pd-inline .pd-kolom').length"), KOLOM.umum.length);
    assert.equal(await tab.eval("document.querySelector('.pd-inline [data-k=setuju_catatan]').hidden"), true);
    await tab.eval("document.querySelector('.pd-inline [data-k=setuju] input[value=\"Ya, dengan catatan\"]').click()");
    assert.equal(await tab.eval("document.querySelector('.pd-inline [data-k=setuju_catatan]').hidden"), false);
    await bersih("tab umum"); await tanpaGulirSamping("tab umum");
    /* lebar penuh: form umum mengisi lebar kolom, bukan kotak sempit di tengah */
    const l = await tab.eval("document.querySelector('.pd-inline').getBoundingClientRect().width / document.querySelector('.bn-wrap').getBoundingClientRect().width");
    assert.ok(l > 0.9, "form umum tidak selebar halaman: " + l);
  });

  test("ponsel 390: form pop-up layar penuh dan tombol terjangkau", async () => {
    await tab.klikTeks(".ad-tabs button", "^Data dan dokumen"); await tab.ukuran(390, 844);
    await tab.klikTeks(".pd-isi .ad-tombol", "^Tambah$"); await tab.tunggu("dialog[open] .pd-form");
    const r = await lihatDlg("(({width, height}) => ({width, height}))(d.getBoundingClientRect())");
    assert.ok(r.width >= 388 && r.height >= 840, JSON.stringify(r));
    const l = await tab.lebihLebar(); assert.ok(l.sw <= l.iw + 1, "gulir mendatar di form 390: " + JSON.stringify(l));
    await dlgKlik(".pd-dlg-kepala button"); await tab.ukuran(1440, 900);
  });

  test("keluar mengembalikan layar masuk; tangkapan layar", async () => {
    const dir = process.env.TANGKAP; 
    if (dir) {
      const { writeFileSync } = await import("node:fs");
      for (const [w, hh] of [[1440, 900], [390, 844]]) {
        await tab.ukuran(w, hh); await tab.klikTeks(".pd-isi .ad-tombol", "^Tambah$"); await tab.tunggu("dialog[open] .pd-form");
        await tab.eval("document.querySelector('dialog[open] [data-k=frekuensi] input[value=Harian]').click()");
        const a = await tab.kirim("Page.captureScreenshot", {format: "png"}); writeFileSync(path.join(dir, `pendataan-form-${w}.png`), Buffer.from(a.data, "base64"));
        await dlgKlik(".pd-dlg-kepala button"); await tab.tungguFungsi("document.querySelectorAll('dialog').length === 2");
        await tab.eval("[...document.querySelectorAll('dialog')].pop().querySelector('.ad-tombol.utama').click()"); await tab.tungguFungsi("!document.querySelector('dialog')");
        const b = await tab.kirim("Page.captureScreenshot", {format: "png"}); writeFileSync(path.join(dir, `pendataan-tabel-${w}.png`), Buffer.from(b.data, "base64"));
      }
      await tab.ukuran(1440, 900);
    }
    await tab.klikTeks(".pd-kepala .ad-tombol", "^Keluar$"); await tab.tunggu(".pd-auth form");
    assert.equal(S.masuk, false);
  });
}
