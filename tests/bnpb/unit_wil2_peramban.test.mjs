/* RU-099 WIL-2 Pengungsian di Chrome nyata: halaman /bnpb/unit/wil memuat unit.html + wil1.js asli; stub /api/meja/catatan dan laphar_riwayat.json
   (tanpa data produksi, jalan di klon bersih). Sesi tanpa hak: "belum ada data", tanpa galat konsol. Sesi berhak: selisih merah dengan kedua angka,
   tempat < 10 jiwa tidak tampil per tempat, tempat basi tidak dijumlah, ganti kab menyusun ulang kartu, tidak ada tulisan ke server. 1440 dan 390 px.
   Tanpa Chrome: dilewati. Jalan: node --test tests/bnpb/unit_wil2_peramban.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const CSP = readFileSync(AKAR + "src/bnpb.js", "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|403|404)/.test(g);
const hari = n => new Date(Date.now() + 7 * 36e5 - n * 864e5).toISOString().slice(0, 10);
const cat = (kab, nama, jiwa, kk, {buka = hari(2), data = hari(0)} = {}) => ({meja: "pengungsi", prov: "11", kab, dummy: 0, status_efektif: "berjalan", data: {nama_tempat: nama, jiwa_total: jiwa, kk, tgl_buka: buka, tgl_data: data}});
const CATATAN = [cat("Aceh Utara", "Gor A", 18000, 4000), cat("Aceh Utara", "Gor B", 908, 200), cat("Aceh Utara", "Pos Kecil", 9, 3), cat("Aceh Utara", "Lama", 800, 200, {data: hari(5)}),
  cat("Aceh Tamiang", "Masjid C", 120, 40)];
const LAPHAR = {episode: [{tingkat: "kab", prov: "11", kab: "11|Aceh Utara", mulai: hari(3), terakhir: hari(0), puncak: {mengungsi_jiwa: 4385}}]};

for (const [nama, hak] of [["sesi tanpa hak membaca meja", false], ["sesi berhak membaca meja", true]]) {
  test("WIL-2 di peramban: " + nama, {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
    const kini = new Date().toISOString(), tulis = [];
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split("?")[0]);
      if (q.method !== "GET") tulis.push(q.method + " " + u);
      const js = (o, c = 200) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
      if (u === "/api/peta-situs") return js(petaSitus());
      if (u === "/api/unit/indeks") return js({dibuat: kini, berkas: []});
      if (u === "/api/meja/catatan") return hak ? js({meja: "pengungsi", catatan: CATATAN, dipotong: false}) : js({galat: "tidak berhak"}, 403);
      if (u === "/data/laphar_riwayat.json") return js(LAPHAR);
      if (u.startsWith("/api/")) return js({galat: "belum"}, 404);
      const f = path.join(PUB, /^\/bnpb\/unit\/[a-z]{2,4}$/.test(u) ? "/bnpb/unit/unit.html" : u);
      if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { s.writeHead(404); return s.end(); }
      s.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); s.end(readFileSync(f));
    });
    await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
    const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
    try {
      for (const [w, hh] of [[1440, 900], [390, 844]]) {
        await t.ukuran(w, hh);
        await t.buka(asal + "/bnpb/unit/wil", {tunggu: hak ? "#wil2-tempat" : "#wil2-selisih .ex-bd .ad-kosong:last-child"});
        if (!hak) {
          assert.match(await t.eval("document.getElementById('wil2-selisih').innerText"), /Belum ada data: sesimu belum punya hak/);
          assert.equal(await t.eval("document.querySelectorAll('#wil2-selisih tbody tr').length"), 0, "tanpa hak: tanpa angka, bukan nol");
        } else {
          const baris = await t.eval("[...document.querySelectorAll('#wil2-selisih tbody tr')].map(r => r.innerText.replace(/\\s+/g, ' '))");
          assert.equal(baris.length, 2);
          assert.match(baris[0], /Aceh Utara.*18\.917.*4\.385.*76,8.*merah/, "kedua angka dan selisih tampil; merah di atas");
          assert.match(baris[1], /Aceh Tamiang/); assert.match(baris[1], /belum bisa dibandingkan/, "tanpa angka pusat: tidak dihitung, bukan nol");
          const tempat = () => t.eval("[...document.querySelectorAll('#wil2-tempat tbody tr')].map(r => r.innerText.replace(/\\s+/g, ' '))");
          let tb = await tempat();
          assert.ok(tb.some(x => /^Gor A/.test(x)) && tb.some(x => /^Gor B/.test(x)), "tempat 10 jiwa atau lebih tampil");
          assert.ok(!tb.some(x => /Pos Kecil/.test(x)), "tempat di bawah 10 jiwa tidak tampil per tempat");
          assert.ok(tb.some(x => /^Lama.*basi, tidak dijumlah/.test(x)), "tempat basi ditandai");
          assert.match(tb[tb.length - 1], /^Jumlah tempat segar/);
          await t.eval("(() => { const e = document.getElementById('wil2-kab'); e.value = '1'; e.dispatchEvent(new Event('change', {bubbles: true})); })()");
          await t.tungguFungsi("[...document.querySelectorAll('#wil2-tempat tbody tr')].some(r => /^Masjid C/.test(r.innerText))");
          tb = await tempat();
          assert.ok(tb.some(x => /^Masjid C/.test(x)) && !tb.some(x => /^Gor A/.test(x)), "ganti kab menyusun ulang kartu");
        }
        const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
        assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
        assert.equal(await t.eval("/\\b(NaN|undefined)\\b|·|\\[object/.test(document.querySelector('main').innerText)"), false);
      }
      assert.deepEqual(tulis, [], "tidak ada tulisan ke server");
    } finally { await t.tutup(); await br.tutup(); srv.close(); }
  });
}
