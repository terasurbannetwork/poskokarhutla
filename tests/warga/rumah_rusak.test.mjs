/* Rumah rusak (src/rumah_rusak.js, migrasi 0024) di workerd + D1 + R2 lokal sungguhan, lewat tests/warga/_rumah_rusak_worker.mjs. TEST.md: yang SALAH harus ditolak. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";

const U = await siapkan("uji-rumah", {r2: true, skrip: "tests/warga/_rumah_rusak_worker.mjs"}), uji = berantai(), {DB, api, adm, n} = U;
const PLK = {lat: -2.21, lon: 113.92}, JKT = {lat: -6.2, lon: 106.82};
const B = (o = {}) => ({bencana: "gempa", tingkat: "berat", ...PLK, ...o});
const kirim = (body, h = ADMIN) => api("POST", "/api/rumah-rusak", body, h);
const buatRegu = async () => { const r = await adm("POST", "/api/posko/regu", {nama: "Regu Rumah", unsur: "BPBD", prov: "62", kab: "Katingan"}); assert.equal(r.s, 201, r.t); return {id: r.j.regu.id, h: {"x-kode-regu": r.j.kode}}; };
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xd9]);
/* unggah byte mentah (api() membungkus non-string jadi JSON) */
const mentah = async (u, isi, h = {}) => { const r = await U.mf.dispatchFetch("http://bnpb.lokal" + u, {method: "POST", headers: h, body: isi}); await r.text(); return {s: r.status}; };

uji("migrasi 0024 rumah_rusak idempoten, CHECK menolak data liar, jejak koreksi hanya-tambah", async () => {
  const f = readFileSync(path.join(AKAR, "migrations/0024_rumah_rusak.sql"), "utf8");
  await DB.batch(pecah(f).map(s => DB.prepare(s)));   // kedua kali di atas migrasi penuh
  const I = (kol, ...v) => DB.prepare(`INSERT INTO rumah_rusak (id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, pelapor, waktu${kol}) VALUES ('aaaaaaaaaaaaaaaa', 'gempa', '2026-10-20', -2, 113, '62', 'Kab', 'Kec', 'berat', 'akun:123456789012', 1${v.length ? ", ?" : ""})`).bind(...v);
  for (const [nama, sql] of [
    ["tingkat", "UPDATE rumah_rusak SET tingkat = 'kritis'"], ["lat", "UPDATE rumah_rusak SET lat = 50"], ["lon", "UPDATE rumah_rusak SET lon = 10"],
    ["pelapor", "UPDATE rumah_rusak SET pelapor = 'orang-asing'"], ["status", "UPDATE rumah_rusak SET status = 'x'"], ["bencana", "UPDATE rumah_rusak SET bencana = 'Gempa Bumi'"]]) {
    await I("").run();
    await assert.rejects(DB.prepare(sql).run(), /CHECK/, nama);
    await DB.prepare("DELETE FROM rumah_rusak").run();
  }
  await DB.prepare("INSERT INTO rumah_rusak_koreksi (rumah_id, waktu, oleh, sebelum, sesudah, alasan) VALUES ('x', 1, '123456789012', '{}', '{}', 'uji')").run();
  await assert.rejects(DB.prepare("UPDATE rumah_rusak_koreksi SET alasan = 'ubah'").run(), /tidak boleh diubah/);
  await assert.rejects(DB.prepare("DELETE FROM rumah_rusak_koreksi").run(), /tidak boleh dihapus/);
  await DB.prepare("DROP TRIGGER rumah_rusak_koreksi_tetap_hapus").run(); await DB.prepare("DELETE FROM rumah_rusak_koreksi").run();
  await DB.batch(pecah(f).map(s => DB.prepare(s)));   // trigger dibangun lagi oleh migrasi idempoten
  assert.equal(await n("rumah_rusak"), 0);
});

uji("POST /api/rumah-rusak: akun masuk dan regu berkode diterima, wilayah ditentukan server", async () => {
  const a = await kirim(B({prov: "99", kab: "Palsu", catatan: "  atap roboh  "}));
  assert.equal(a.s, 201, a.t); assert.equal(a.j.prov, "62");
  const baris = await DB.prepare("SELECT * FROM rumah_rusak WHERE id = ?").bind(a.j.id).first();
  assert.equal(baris.prov, "62"); assert.notEqual(baris.kab, "Palsu"); assert.equal(baris.catatan, "atap roboh"); assert.match(baris.pelapor, /^akun:[0-9a-f]{12}$/); assert.equal(baris.status, "sah");
  const g = await buatRegu();
  const r = await kirim(B({tingkat: "sedang", lat: JKT.lat, lon: JKT.lon}), g.h);
  assert.equal(r.s, 201, r.t); assert.equal(r.j.prov, "31");
  assert.equal((await DB.prepare("SELECT pelapor FROM rumah_rusak WHERE id = ?").bind(r.j.id).first()).pelapor, `regu:${g.id}`);
  assert.equal((await kirim(B({tingkat: "ringan", lat: -2.3}), GERBANG)).s, 201, "akun gerbang situs juga adminOK");
  const c = await kirim(B({lat: -2.31, catatan: "hubungi 0812 3456 7890 atau https://x.com/a, atap roboh"})); assert.equal(c.s, 201, c.t);
  const cat = (await DB.prepare("SELECT catatan FROM rumah_rusak WHERE id = ?").bind(c.j.id).first()).catatan;
  assert.ok(!/0812|https|x\.com/.test(cat) && cat.includes("atap roboh"), `nomor dan tautan dibuang: ${cat}`);
  assert.equal((await kirim(B({lat: -2.32, catatan: "dasar bangsat"}))).s, 400, "kata kasar ditolak");
});

uji("POST /api/rumah-rusak: tanpa auth, token salah, kode salah/dicabut ditolak dan tidak menulis", async () => {
  const sebelum = await n("rumah_rusak"), g = await buatRegu();
  for (const h of [{}, {"x-admin-token": "salah"}, {"x-kode-regu": "0".repeat(26)}, {"x-kode-regu": "pendek"}, {"x-kode-regu": ADMIN["x-admin-token"]}]) {
    const r = await kirim(B({lat: -2.5}), h); assert.equal(r.s, 403, JSON.stringify(h) + r.t);
  }
  assert.equal((await adm("POST", `/api/posko/regu/${g.id}`, {aksi: "cabut"})).s, 200);
  assert.equal((await kirim(B({lat: -2.5}), g.h)).s, 403, "kode dicabut");
  assert.equal(await n("rumah_rusak"), sebelum);
});

uji("POST /api/rumah-rusak: isian salah ditolak 400", async () => {
  const sebelum = await n("rumah_rusak"), hari = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  for (const [nama, o] of [["tingkat liar", {tingkat: "kritis"}], ["tingkat kosong", {tingkat: undefined}], ["bencana liar", {bencana: "tsunami9"}], ["bencana bukan teks", {bencana: 7}],
    ["lat di luar bbox", {lat: 20}], ["lon di luar bbox", {lon: 10}], ["lat teks", {lat: "abc"}], ["lat hilang", {lat: undefined}], ["lat tak hingga", {lat: 1e999}],
    ["laut dalam bbox", {lat: -10.5, lon: 100}], ["tanggal masa depan", {tanggal: hari}], ["tanggal ngawur", {tanggal: "2026-13-45"}], ["tanggal 2 tahun lalu", {tanggal: "2024-01-01"}],
    ["catatan 301", {catatan: "x".repeat(301)}], ["catatan bukan teks", {catatan: {a: 1}}]]) {
    const r = await kirim(B({lat: -2.6, ...o})); assert.equal(r.s, 400, `${nama}: ${r.t}`);
  }
  assert.equal((await kirim("[1]", ADMIN)).s, 400, "body bukan objek");
  assert.equal((await kirim("bukan json", ADMIN)).s, 400);
  assert.equal(await n("rumah_rusak"), sebelum);
});

uji("duplikat: pelapor + tingkat sama dalam ~10 m ditolak 409; tingkat lain, titik jauh, pelapor lain lolos", async () => {
  const p = {lat: -2.4, lon: 113.9}, a = await kirim(B(p)); assert.equal(a.s, 201, a.t);
  const sebelum = await n("rumah_rusak");
  assert.equal((await kirim(B({...p, lat: p.lat + 0.00005}))).s, 409, "~5 m");
  assert.equal(await n("rumah_rusak"), sebelum);
  assert.equal((await kirim(B({...p, tingkat: "ringan"}))).s, 201, "tingkat lain");
  assert.equal((await kirim(B({...p, lat: p.lat + 0.0005}))).s, 201, "~55 m");
  assert.equal((await kirim(B(p), MOD2)).s, 201, "pelapor lain");
  assert.equal((await kirim(B({...p, bencana: "banjir"}))).s, 201, "bencana lain");
  assert.equal((await adm("POST", `/api/rumah-rusak/${a.j.id}`, {status: "ditolak", alasan: "salah titik"})).s, 200);
  assert.equal((await kirim(B(p))).s, 201, "setelah ditolak admin boleh lapor ulang");
});

uji("GET /api/rumah-rusak: wajib auth; admin memfilter; regu hanya miliknya tanpa kolom pelapor", async () => {
  assert.equal((await api("GET", "/api/rumah-rusak")).s, 403);
  assert.equal((await api("GET", "/api/rumah-rusak", undefined, {"x-kode-regu": "1".repeat(26)})).s, 403);
  const g = await buatRegu(), tgl = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const m = await kirim(B({lat: -3.1, lon: 114.3, bencana: "banjir", tingkat: "ringan"}), g.h); assert.equal(m.s, 201, m.t);
  const semua = await adm("GET", "/api/rumah-rusak"); assert.equal(semua.s, 200); assert.ok(semua.j.laporan.length > 1 && semua.j.laporan.every(x => x.pelapor));
  assert.ok(semua.j.laporan.some(x => x.id === m.j.id));
  const b = await adm("GET", "/api/rumah-rusak?bencana=banjir"); assert.ok(b.j.laporan.length && b.j.laporan.every(x => x.bencana === "banjir"));
  assert.equal((await adm("GET", `/api/rumah-rusak?dari=${tgl}&sampai=${tgl}&bbox=-3.2,114.2,-3.0,114.4`)).j.laporan.map(x => x.id).join(), m.j.id);
  assert.equal((await adm("GET", "/api/rumah-rusak?bbox=-3.2,114.2,-3.0,114.4&sampai=2020-01-01")).j.laporan.length, 0);
  for (const q of ["bencana=xx", "dari=kemarin", "status=lain", "bbox=1,2,3", "bbox=-3,114,-4,115", "bbox=a,b,c,d"]) assert.equal((await adm("GET", "/api/rumah-rusak?" + q)).s, 400, q);
  const s = await api("GET", "/api/rumah-rusak", undefined, g.h);
  assert.equal(s.s, 200); assert.deepEqual(s.j.laporan.map(x => x.id), [m.j.id]);
  assert.ok(!("pelapor" in s.j.laporan[0]) && !("dikoreksi_oleh" in s.j.laporan[0]), "regu tidak melihat identitas pelapor/admin");
  assert.equal((await adm("GET", "/api/rumah-rusak?saya=1")).j.laporan.every(x => x.pelapor.startsWith("akun:")), true);
});

uji("GET /api/rumah-rusak/rekap: hitung RB/RS/RR per kab dan kec, hanya sah, wajib auth, rentang diperiksa", async () => {
  await DB.prepare("DELETE FROM rumah_rusak").run();
  const t = {lat: -2.21, lon: 113.92};
  for (const [tg, d] of [["berat", 0], ["berat", 0.001], ["sedang", 0.002], ["ringan", 0.003], ["ringan", 0.004]]) assert.equal((await kirim(B({tingkat: tg, lat: t.lat + d, bencana: "banjir"}))).s, 201);
  const x = await kirim(B({tingkat: "berat", lat: t.lat + 0.005, bencana: "banjir"}));
  await adm("POST", `/api/rumah-rusak/${x.j.id}`, {status: "ditolak", alasan: "ganda dengan laporan lain"});
  const r = await adm("GET", "/api/rumah-rusak/rekap?bencana=banjir"); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.total, {berat: 2, sedang: 1, ringan: 2, total: 5}, "yang ditolak tidak ikut");
  assert.equal(r.j.kab.reduce((a, k) => a + k.total, 0), 5); assert.equal(r.j.kec.reduce((a, k) => a + k.total, 0), 5);
  assert.ok(r.j.kec.every(k => k.bencana === "banjir" && k.prov === "62" && k.berat + k.sedang + k.ringan === k.total));
  assert.equal((await adm("GET", "/api/rumah-rusak/rekap?bencana=gempa")).j.total.total, 0);
  assert.equal((await adm("GET", "/api/rumah-rusak/rekap?dari=2020-01-01&sampai=2020-01-02")).j.total.total, 0);
  const g = await buatRegu(); assert.equal((await api("GET", "/api/rumah-rusak/rekap", undefined, g.h)).s, 200, "regu boleh melihat agregat");
  assert.equal((await api("GET", "/api/rumah-rusak/rekap")).s, 403);
  for (const q of ["dari=2026-10-20&sampai=2026-10-01", "dari=2020-01-01&sampai=2026-10-20", "dari=x", "bencana=zzz", "prov=6"]) assert.equal((await adm("GET", "/api/rumah-rusak/rekap?" + q)).s, 400, q);
});

uji("koreksi: hanya admin, alasan wajib, tercatat di jejak; regu dan tanpa auth ditolak", async () => {
  const g = await buatRegu(), m = await kirim(B({lat: -2.7, tingkat: "ringan"}), g.h); assert.equal(m.s, 201);
  const url = `/api/rumah-rusak/${m.j.id}`;
  assert.equal((await api("POST", url, {tingkat: "berat", alasan: "cek ulang"}, g.h)).s, 403, "pemiliknya sendiri bukan admin");
  assert.equal((await api("POST", url, {tingkat: "berat", alasan: "cek ulang"})).s, 403);
  assert.equal((await api("POST", url, {tingkat: "berat", alasan: "cek ulang"}, {"x-admin-token": "salah"})).s, 403);
  assert.equal((await adm("POST", url, {tingkat: "berat"})).s, 400, "tanpa alasan");
  assert.equal((await adm("POST", url, {tingkat: "kritis", alasan: "cek ulang"})).s, 400);
  assert.equal((await adm("POST", url, {status: "hapus", alasan: "cek ulang"})).s, 400);
  assert.equal((await adm("POST", url, {alasan: "tanpa perubahan"})).s, 400);
  assert.equal((await adm("POST", url, {tingkat: "ringan", alasan: "sama saja"})).s, 400);
  assert.equal((await adm("POST", "/api/rumah-rusak/ffffffffffffffff", {tingkat: "berat", alasan: "tidak ada"})).s, 404);
  assert.equal(await n("rumah_rusak_koreksi", `rumah_id = '${m.j.id}'`), 0);
  const ok = await adm("POST", url, {tingkat: "berat", catatan: "rangka roboh", alasan: "foto menunjukkan rangka roboh"}); assert.equal(ok.s, 200, ok.t);
  const b = await DB.prepare("SELECT tingkat, catatan, dikoreksi_oleh FROM rumah_rusak WHERE id = ?").bind(m.j.id).first();
  assert.equal(b.tingkat, "berat"); assert.equal(b.catatan, "rangka roboh"); assert.match(b.dikoreksi_oleh, /^[0-9a-f]{12}$/);
  const j = await DB.prepare("SELECT * FROM rumah_rusak_koreksi WHERE rumah_id = ?").bind(m.j.id).first();
  assert.equal(JSON.parse(j.sebelum).tingkat, "ringan"); assert.equal(JSON.parse(j.sesudah).tingkat, "berat"); assert.equal(j.alasan, "foto menunjukkan rangka roboh");
});

uji("batas laju: 60 laporan per jam per pelapor, ke-61 ditolak 429; pelapor lain tidak ikut", async () => {
  const g = await buatRegu(); let terakhir;
  for (let i = 0; i < 61; i++) terakhir = await kirim(B({lat: -2.0 - i * 0.0003, lon: 113.5, tingkat: "sedang"}), g.h);
  assert.equal(terakhir.s, 429, terakhir.t);
  assert.equal(await n("rumah_rusak", `pelapor = 'regu:${g.id}'`), 60);
  assert.equal((await kirim(B({lat: -2.9, lon: 113.1, tingkat: "sedang"}))).s, 201);
});

uji("foto rumah: hanya pelapor aslinya mengunggah, JPEG/WebP saja, EXIF dibuang, baca butuh pemilik atau admin", async () => {
  const g = await buatRegu(), g2 = await buatRegu(), m = await kirim(B({lat: -2.95, lon: 113.2}), g.h); assert.equal(m.s, 201);
  const u = `/api/rumah-rusak/foto/${m.j.id}`, exif = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 8, 69, 120, 105, 102, 0, 0, 0xff, 0xda, 0, 2, 1, 2, 0xff, 0xd9]);
  assert.equal((await mentah(u,JPG)).s, 403);
  assert.equal((await mentah(u,JPG, g2.h)).s, 404, "regu lain");
  assert.equal((await mentah(u,JPG, ADMIN)).s, 404, "admin pun bukan pelapor aslinya");
  assert.equal((await mentah(u,"GIF89a-bukan-foto", g.h)).s, 400);
  assert.equal((await mentah(u, new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "), g.h)).s, 400, "WebP ditolak: hanya JPEG");
  const m2 = await kirim(B({lat: -2.96, lon: 113.21}), g.h), u2 = `/api/rumah-rusak/foto/${m2.j.id}`;
  const balap = await Promise.all([mentah(u2, JPG, g.h), mentah(u2, JPG, g.h)]);
  assert.deepEqual(balap.map(x => x.s).sort(), [200, 409], "unggahan serentak: satu menang, satu 409");
  assert.equal(await n("rumah_rusak", `id = '${m2.j.id}' AND foto = 1`), 1);
  assert.equal((await mentah(u,new Uint8Array(2 * 1048576).fill(0xff), g.h)).s, 413);
  assert.equal((await mentah(u,exif, g.h)).s, 200);
  assert.equal((await mentah(u,JPG, g.h)).s, 409, "satu foto per laporan");
  const simpan = await U.mf.getR2Bucket("MEDIA").then(b => b.get(`rumah/${m.j.id}`)); const bytes = new Uint8Array(await simpan.arrayBuffer());
  assert.ok(!bytes.includes(0x45) || bytes[3] !== 0xe1, "segmen APP1 (EXIF) dibuang"); assert.equal(bytes[3], 0xda);
  assert.equal((await api("GET", u)).s, 403);
  assert.equal((await api("GET", u, undefined, g2.h)).s, 404);
  const ok = await U.mf.dispatchFetch("http://bnpb.lokal" + u, {headers: g.h}); assert.equal(ok.status, 200); assert.equal(ok.headers.get("cache-control"), "private, no-store");
  assert.equal((await U.mf.dispatchFetch("http://bnpb.lokal" + u, {headers: ADMIN})).status, 200);
});

uji("halaman /rumah-rusak: ada CSP ketat di situs Centurisk97 dan localhost, 404 di alamat lain", async () => {
  const p = h => U.mf.dispatchFetch(`http://${h}/rumah-rusak`);
  for (const h of ["centurisk97.id", "centurisk97.abc.workers.dev", "localhost"]) {
    const r = await p(h); assert.equal(r.status, 200, h); const csp = r.headers.get("content-security-policy");
    assert.ok(csp.includes("script-src 'self' https://cdnjs.cloudflare.com") && !csp.includes("unsafe-inline") && csp.includes("frame-ancestors 'none'"), csp);
    assert.ok((await r.text()).includes("Lapor Rumah Rusak"));
  }
  for (const h of ["pantau.terasurban.com", "contoh.com"]) assert.equal((await p(h)).status, 404, h);
  for (const h of ["centurisk97.id", "contoh.com", "localhost"]) {   // berkas statis tidak boleh lolos tanpa CSP di host mana pun
    const r = await U.mf.dispatchFetch(`http://${h}/rumah_rusak.html`, {redirect: "manual"});
    assert.equal(r.status, 303, h); assert.equal(r.headers.get("location"), "/rumah-rusak", h);
  }
});

uji("kabel worker.js: RUTE_RUMAH_RUSAK digabung ke RUTE; /rumah-rusak TIDAK bebas sesi, regu masuk lewat /lapangan", () => {
  const w = readFileSync(path.join(AKAR, "src/worker.js"), "utf8");
  assert.match(w, /import \{RUTE_RUMAH_RUSAK\} from "\.\/rumah_rusak\.js"/, "import hilang");
  assert.match(w, /\.\.\.RUTE_RUMAH_RUSAK/, "spread ke RUTE hilang");
  const wl = w.match(/PUBLIK_TANPA_SESI = new Map\(\[[^\n]*/)[0];
  assert.doesNotMatch(wl, /rumah-rusak/, "keputusan pemilik 20 Okt 2026: whitelist tetap persis /lapangan, /rumah-rusak butuh sesi");
  const h = readFileSync(path.join(AKAR, "public/lapangan.html"), "utf8"), j = readFileSync(path.join(AKAR, "public/lapangan.js"), "utf8");
  assert.match(h, /id="bukaRR"/, "tombol Lapor rumah rusak hilang dari lapangan.html");
  assert.match(j, /rumah_rusak\.js/, "lapangan.js tidak memuat formulir rumah rusak");
  const csp = readFileSync(path.join(AKAR, "src/posko.js"), "utf8").match(/CSP_LAPANGAN = "([^"]*)"/)[1];
  assert.match(csp, /script-src[^;]*cdnjs\.cloudflare\.com/, "CSP lapangan harus mengizinkan MapLibre dari cdnjs");
  assert.match(csp, /worker-src blob:/, "MapLibre butuh worker blob:");
});
