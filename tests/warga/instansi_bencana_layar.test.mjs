/* Uji LAYAR /instansi multi-bahaya di Chrome sungguhan (server Node kecil melayani public/ dan fixture /api/instansi/*, tanpa D1; rute nyata diuji tugas_bencana.test.mjs).
   Kartu per bahaya juga diuji murni di node:vm (tanpa Chrome). Tanpa Chrome bagian layar DILEWATI. Jalan: node --test tests/warga/instansi_bencana_layar.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import vm from "node:vm";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public");
const MIME = {".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".html": "text/html; charset=utf-8", ".webmanifest": "application/json"};
const TERLARANG = /\bNaN\b|\bundefined\b|\bnull\b|\[object|—|·/g;
const kini = Date.now();
const T = (id, bencana, nama, kab, o = {}) => ({id, prov: "16", kab, kec: "Kec " + kab, lat: -3.1, lon: 104.2, level: 2, status: "buka", terlambat: false, dibuat: kini - 36e5, tenggat: kini + 5 * 36e5, konfirmasi_pada: null, n24: 4, luas_ha: 12,
  rekomendasi: null, akses: null, kartu: null, padam: null, ciri: "Contoh ciri", bencana, bencana_nama: nama, jenis: "pemadaman", judul: null, arahan: null, ...o});
const TUGAS = [
  T("t_k", "karhutla", "Karhutla", "Ogan Ilir", {kartu: {insiden: "K0001", luas_koreksi: {ha: 12, min: 8, maks: 20}}}),
  T("t_b", "banjir", "Banjir", "Muara Enim", {kartu: {insiden: "B0038", jiwa_terdampak: 12345, hujan_mm: 187.4}}),
  T("t_g", "gunungapi", "Gunungapi", "Agam", {level: 3, kartu: {insiden: "V0001", level: 4, radius_krb_km: 3.5, jiwa_krb: 4321, dasar: "radius rekomendasi PVMBG, penduduk WorldPop 1 km"},
    rekomendasi: {cara: [{metode: "rekomendasi_pvmbg", peran: "utama", alasan: "Jauhi radius 3,5 km dari kawah."}], sumber: "PVMBG, MAGMA Indonesia (22 Okt 2026)"}}),
  T("t_e", "gempa", "Gempa", "Pidie", {kartu: {insiden: "G0007", mag: 6.2, mmi_maks: 7, jiwa_mmi6: 98765, dalam_km: 10.4, dasar: "model USGS ShakeMap"}}),
  T("t_d", "kekeringan", "Kekeringan", "Gunung Kidul", {hipotesis: true, kartu: {insiden: "D0002", spi3: -1.84, hari_tanpa_hujan: 31, jiwa_kab_terlibat: 750000, dasar: "ambang hipotesis SPI"}}),
  T("t_c", "cuaca", "Cuaca ekstrem", "Bogor", {kartu: {insiden: "C0003", jenis_peringatan: "hujan_lebat", berlaku_hingga: new Date(kini + 36e5).toISOString()}}),
];
const SAYA = {akun: {id: "a1", username: "x", wilayah: "Sumatera Selatan", status: "aktif", wajib_ganti: false, verifikasi: {}, jenis: "pemkab"}, cakupan: {}, kab: [], bantuan: {}, kendala: {}, hasil: {}, lahan: {}};

/* ---------- kartu per bahaya, murni ---------- */
function muatKartu() {
  const win = {}; vm.runInNewContext(readFileSync(path.join(PUB, "instansi_kartu.js"), "utf8"), {window: win, Number, Math, Date, String, Object, Array, Intl, encodeURIComponent});
  return win.KartuApi;
}
test("Kartu bahaya: label Indonesia, satuan, angka id-ID, pil model/hipotesis, tanpa titik tengah", () => {
  const K = muatKartu(), kar = x => K.html(x, x.kartu), tek = x => K.teks(x, x.kartu);
  const [k, b, g, e, d, c] = TUGAS;
  assert.match(kar(b), /Kartu Banjir/); assert.match(kar(b), /sekitar 12\.000 jiwa/); assert.match(kar(b), /187 mm/); assert.match(kar(b), /Penduduk terdampak/);
  assert.match(kar(g), /Level PVMBG/); assert.match(kar(g), /4, Awas/); assert.match(kar(g), /3,5 km/); assert.match(kar(g), /WorldPop/);
  assert.match(kar(e), /Magnitudo/); assert.match(kar(e), /6,2/); assert.match(kar(e), /MMI/); assert.match(kar(e), /perkiraan model, belum diuji/); assert.match(kar(e), /10 km/);
  assert.match(kar(d), /Hipotesis/); assert.match(kar(d), /Penduduk kabupaten terlibat/); assert.match(kar(d), /-1,84|−1,84/); assert.doesNotMatch(kar(d), /Penduduk (terdampak|terpapar)/);
  assert.match(kar(c), /Jenis peringatan/); assert.match(kar(c), /hujan lebat/); assert.match(kar(c), /WIB/);
  assert.match(kar(k), /Kartu Api/);   // karhutla tidak berubah
  for (const x of TUGAS) { assert.doesNotMatch(kar(x) + tek(x), TERLARANG, x.id); assert.match(tek(x), /Sumber|Belum divalidasi/); }
  assert.match(tek(e), /\(perkiraan model, belum diuji\)/);
});
test("Kartu bahaya: kunci hilang tidak melempar dan tidak mencetak NaN", () => {
  const K = muatKartu();
  for (const bc of ["banjir", "gempa", "gunungapi", "cuaca", "kekeringan", "udara"]) { const h = K.html({bencana: bc, lat: 1, lon: 2, kab: "X"}, {}) + K.teks({bencana: bc}, null); assert.doesNotMatch(h, TERLARANG); }
  assert.equal(K.idBencana({bencana: "ngawur"}), "karhutla"); assert.equal(K.idBencana({}), "karhutla");
  assert.equal(K.KAMUS.gempa.st.padam, undefined, "gempa tanpa tombol selesai");
  assert.deepEqual(["banjir", "gempa", "gunungapi", "cuaca", "kekeringan"].map(x => K.KAMUS[x].selesai), ["surut", "selesai", "turun status", "berakhir", "membaik"]);
});
test("Kamus klien sama dengan src/tugas_bencana.js (kata, nama)", async () => {
  const {BENCANA} = await import("../../src/tugas_bencana.js"), K = muatKartu();
  for (const [id, m] of Object.entries(BENCANA)) { assert.equal(K.KAMUS[id].nama, m.nama, id); assert.equal(K.KAMUS[id].selesai, m.kata === "padam" ? "padam" : m.kata, id); }
});

/* ---------- layar ---------- */
const CHROME = cariChrome();
if (!CHROME) test("uji layar instansi multi-bahaya DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN)"}, () => {});
else {
  let srv, base, br, tab, daftar = TUGAS;
  const bukanFavicon = g => !/favicon\.ico|maplibre|openfreemap|cdnjs|fonts\.g/.test(g);
  before(async () => {
    srv = http.createServer((q, s) => {
      const u = new URL(q.url, "http://x"), j = (o, st = 200) => { s.statusCode = st; s.setHeader("content-type", "application/json"); s.end(JSON.stringify(o)); };
      if (u.pathname === "/instansi") { s.setHeader("content-type", MIME[".html"]); return s.end(readFileSync(path.join(PUB, "instansi.html"))); }
      if (u.pathname === "/api/instansi/saya") return j(SAYA);
      if (u.pathname === "/api/instansi/tugas") return j({kini: Date.now(), tugas: daftar, pic_kab: {}});
      const m = u.pathname.match(/^\/api\/instansi\/tugas\/(\w+)$/); if (m) { const t = daftar.find(x => x.id === m[1]); return t ? j({tugas: t, kartu: t.kartu, isian: [], media: [], gudang_terdekat: []}) : j({}, 404); }
      if (u.pathname === "/api/instansi/push/status") return j({tersedia: false});
      if (u.pathname === "/api/titik") return j({titik: []});
      if (u.pathname.startsWith("/api/instansi/penugasan/")) return j({kini: Date.now(), penugasan: []});
      if (u.pathname.startsWith("/api/")) return j({galat: "tidak ada di fixture"}, 404);
      const f = path.join(PUB, u.pathname);
      if (f.startsWith(PUB) && existsSync(f) && !f.endsWith("/")) { s.setHeader("content-type", MIME[path.extname(f)] || "application/octet-stream"); return s.end(readFileSync(f)); }
      s.statusCode = 404; s.end();
    });
    await new Promise(ok => srv.listen(0, "127.0.0.1", ok)); base = "http://127.0.0.1:" + srv.address().port;
    br = await bukaPeramban(CHROME); tab = await br.tab();
  });
  after(async () => { await tab?.tutup(); await br?.tutup(); srv?.close(); });
  const buka = async (w, d = TUGAS) => { daftar = d; await tab.ukuran(w, 900); await tab.buka(base + "/instansi"); await tab.tungguFungsi?.("document.querySelectorAll('.in-baris').length > 0").catch(() => {}); await new Promise(r => setTimeout(r, 1200)); };
  const bersih = async w => { assert.ok((await tab.lebihLebar()).sw <= w + 1, "scroll horizontal"); assert.deepEqual([...new Set((await tab.teks()).match(TERLARANG) || [])], []); };
  const pilihChip = async id => { await tab.klik(`.in-chip[data-bc="${id}"]`); await new Promise(r => setTimeout(r, 400)); };
  const baris = () => tab.eval("[...document.querySelectorAll('.in-baris')].map(b => b.dataset.id)");
  const panel = async id => { await tab.klik(`.in-baris[data-id="${id}"]`); await new Promise(r => setTimeout(r, 700)); return tab.eval("document.getElementById('panel').textContent"); };

  for (const w of [1440, 375]) test(`Instansi multi-bahaya di ${w}px: chip, daftar, panel tiap bahaya, tanpa galat dan tanpa scroll horizontal`, async () => {
    await buka(w);
    assert.equal(await tab.eval("document.querySelectorAll('.in-chip').length"), 7, "Semua + 6 bahaya");
    assert.equal(await tab.eval("document.querySelector('.in-chip[data-bc=\"\"]').getAttribute('aria-pressed')"), "true");
    assert.equal((await baris()).length, 6); assert.match(await tab.eval("document.querySelector('.in-baris[data-id=t_b] .in-bc').innerText"), /Banjir/); await bersih(w);
    // chip: keadaan aktif seketika, daftar menyaring
    await pilihChip("banjir"); assert.equal(await tab.eval("document.querySelector('.in-chip[data-bc=banjir]').getAttribute('aria-pressed')"), "true"); assert.deepEqual(await baris(), ["t_b"]);
    let p = await panel("t_b"); assert.match(p, /Kondisi banjir/i); assert.match(p, /Masih tergenang/i); assert.match(p, /Sudah surut/i); assert.match(p, /Bukan banjir/i); assert.match(p, /Kartu Banjir/i); assert.match(p, /12\.000/i);
    for (const kata of [/Luas terbakar/, /Kedalaman bara/, /Perusahaan konsesi/, /Sudah padam belum/, /Cek ulang lapangan/, /helikopter water bombing/i, /drone termal/i, /Air jauh/, /Kebutuhan pemadaman/]) assert.doesNotMatch(p, kata, String(kata));
    assert.match(p, /Penugasan dan pelacak posisi/i); assert.match(p, /Navigasi ke lokasi banjir/i); await bersih(w);
    await tab.klik('[data-aksi="kembali"]'); await new Promise(r => setTimeout(r, 300));
    await pilihChip("gunungapi"); p = await panel("t_g"); assert.match(p, /Rekomendasi PVMBG/i); assert.match(p, /Jauhi radius 3,5 km/i); assert.match(p, /Sumber: PVMBG, MAGMA/i); assert.match(p, /Level PVMBG/i); assert.doesNotMatch(p, /Perkiraan, belum divalidasi lapangan[\s\S]*Rekomendasi PVMBG/); await bersih(w);
    await tab.klik('[data-aksi="kembali"]'); await new Promise(r => setTimeout(r, 300));
    await pilihChip("gempa"); p = await panel("t_e"); assert.match(p, /Hasil kaji cepat/i); assert.match(p, /Ada kerusakan/i); assert.doesNotMatch(p, /Sudah (padam|selesai|surut)/i); assert.equal(await tab.eval("document.querySelectorAll('input[name=sapi]').length"), 3, "konfirmasi gempa: ada, ringan, tanpa dampak"); assert.match(p, /perkiraan model, belum diuji/i); await bersih(w);
    await tab.klik('[data-aksi="kembali"]'); await new Promise(r => setTimeout(r, 300));
    await pilihChip("kekeringan"); p = await panel("t_d"); assert.match(p, /Hipotesis/i); assert.match(p, /Penduduk kabupaten terlibat/i); assert.match(p, /ambang hipotesis SPI/i); await bersih(w);
    await tab.klik('[data-aksi="kembali"]'); await new Promise(r => setTimeout(r, 300));
    await pilihChip("karhutla"); p = await panel("t_k"); assert.match(p, /Kondisi api/i); assert.match(p, /Luas terbakar/i); assert.match(p, /Kartu Api/i); assert.match(p, /Masih menyala/i); assert.match(p, /Navigasi ke titik api/i); await bersih(w);
    assert.deepEqual(tab.galat().filter(bukanFavicon), []);
  });
  test("Hanya karhutla: tanpa chip, tampilan lama (Tugas api)", async () => {
    await buka(1440, [TUGAS[0]]);
    assert.equal(await tab.eval("document.getElementById('fBencana').hidden"), true); assert.match(await tab.eval("document.querySelector('[data-tab=tugas]').innerText"), /Tugas api/);
    assert.equal(await tab.eval("!!document.querySelector('.in-baris .in-bc')"), false);
  });
}
