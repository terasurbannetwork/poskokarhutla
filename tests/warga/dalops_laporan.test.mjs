/* Laporan Masuk Dalops (src/dalops_laporan.js): rekap WA Koordalops 07.00 diurai di Worker saat masuk lewat POST /api/wa/gateway sungguhan,
   ringkasan di R2 dalops/laporan.json. Worker utuh di workerd + D1 + R2 (TEST.md: tanpa mock). Jalankan: node --test tests/warga/dalops_laporan.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {siapkan, berantai, ADMIN, MOD2} from "./_bnpb.mjs";
import "../../src/worker.js";
import {gabungHari, hariDariRekap} from "../../src/dalops_laporan.js";
import {IZIN_PEMIRSA_PUSDALOPS} from "../../src/staf.js";

const uji = berantai();
const FIX = readFileSync(new URL("./fixtures/koordalops-wa-24okt.txt", import.meta.url), "utf8");
const U = await siapkan("uji-dalops-laporan", {r2: true, ikat: {WA_KUNCI: "kunci-wa", WA_IZIN: "628123"}}), {DB, api, mf} = U;
const R2 = () => mf.getR2Bucket("MEDIA");
const berkas = async k => { const o = await (await R2()).get(k); return o ? o.text() : null; };
const kirim = async (teks, dari = "628123", extra = {}) => { const f = new FormData(); f.set("dari", dari); f.set("teks", teks); for (const [k, v] of Object.entries(extra)) f.set(k, v);
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: {"x-wa-kunci": "kunci-wa"}, body: f}); assert.equal(r.status, 200); return r.json(); };
const rekap = (jam, tgl = "24/10/2026", sd = "25/10/2026") => `*Yth. Kepala BNPB*\nMohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal ${tgl} pkl 07.00 WIB s.d ${sd} pkl ${jam}.00 WIB sebagai berikut:`;
let pemirsa;

uji("pengurai murni cocok dengan pengurai laporan_urai.js (laporan_urai.test.mjs: 23/21/5): 23 laporan, 21 menonjol (kepala rekap), 5 kejadian (selisih dibiarkan), sifat dari judul", () => {
  const h = hariDariRekap(FIX, {diterima: Date.parse("2026-10-25T00:42:00Z")});
  assert.equal(h.status, "ok"); assert.equal(h.tanggal, "2026-10-25"); assert.equal(h.jam, "07.42");
  assert.equal(h.laporan, 23); assert.equal(h.menonjol, 21); assert.equal(h.kejadian.length, 5);
  assert.ok(h.kejadian.every(k => k.sifat === "pengkinian"));
  const b = hariDariRekap(FIX.replace("Banjir Bandang di Kab. Solok *(Pengkinian Data)*", "Banjir Bandang di Kab. Solok *(Kejadian Baru)*"), {diterima: 1});
  assert.equal(b.kejadian.filter(k => k.sifat === "baru").length, 1);
  assert.deepEqual(Object.keys(h.kejadian[0]).sort(), ["jenis", "lokasi", "prov", "sifat", "status", "tempat"]);
  assert.equal(hariDariRekap("halo", {diterima: 1, tanggal: "2026-10-25"}).status, "gagal");
});

uji("gabungHari: satu per tanggal, terbaru dulu, 30 tanggal; gagal tidak menimpa ok; lebih lama tidak menimpa", () => {
  const ok = (t, d) => ({tanggal: t, status: "ok", diterima: d}), gg = (t, d) => ({tanggal: t, status: "gagal", diterima: d});
  assert.deepEqual(gabungHari([ok("2026-10-25", 5)], gg("2026-10-25", 9)), [ok("2026-10-25", 5)]);
  assert.deepEqual(gabungHari([ok("2026-10-25", 5)], ok("2026-10-25", 9)), [ok("2026-10-25", 9)]);
  assert.deepEqual(gabungHari([ok("2026-10-25", 5)], ok("2026-10-25", 3)), [ok("2026-10-25", 5)]);
  assert.deepEqual(gabungHari([gg("2026-10-25", 5)], ok("2026-10-25", 3)), [ok("2026-10-25", 3)]);
  let a = []; for (let i = 1; i <= 35; i++) a = gabungHari(a, ok(`2026-09-${String(i).padStart(2, "0")}`.replace("09-3", "10-0"), i));
  assert.ok(a.length <= 30); assert.ok(a.every((x, i) => !i || a[i - 1].tanggal > x.tanggal));
});

uji("anonim ditolak; belum ada berkas: 200 kosong, bukan 404", async () => {
  assert.equal((await api("GET", "/api/dalops/laporan")).s, 401);
  const r = await api("GET", "/api/dalops/laporan", undefined, ADMIN); assert.equal(r.s, 200); assert.deepEqual(r.j, {versi: 1, diperbarui: null, hari: []});
});

uji("rekap 24 jam lewat gateway sungguhan tersimpan terstruktur; teks mentah dan angka luas tidak ada", async () => {
  const m = await kirim(FIX.replace("Detail: Entry no 15", "Detail: Sipongi 20.709 ha, Entry no 15")); assert.equal(m.disimpan, true);
  const r = await api("GET", "/api/dalops/laporan", undefined, ADMIN); assert.equal(r.s, 200); assert.equal(r.j.versi, 1);
  assert.equal(r.j.hari.length, 1); const h = r.j.hari[0];
  assert.equal(h.tanggal, "2026-10-25"); assert.equal(h.status, "ok"); assert.equal(h.laporan, 23); assert.equal(h.menonjol, 21); assert.equal(h.kejadian.length, 5);
  assert.equal(h.kejadian.filter(k => k.sifat === "pengkinian").length, 5); assert.match(h.jam, /^\d\d\.\d\d$/);
  const mentah = await berkas("dalops/laporan.json");
  for (const t of ["Sipongi", "20.709", "20.714", "Dampak", "Pengkinian Data", "Kondisi", "jiwa", "628123", "Yth."]) assert.ok(!mentah.includes(t), "tidak boleh ada: " + t);
});

uji("kirim ulang tanggal sama tetap satu entri; rekap 19.00 diabaikan; teks rusak berkepala rekap gagal dan tidak menimpa ok", async () => {
  await kirim(FIX, "628123", {waktu: String(Date.now() + 1000)});
  await kirim(rekap("19", "25/10/2026", "25/10/2026") + "\n\n1. Laporan kejadian bencana sejumlah 9 kejadian.");
  let r = await api("GET", "/api/dalops/laporan", undefined, ADMIN); assert.equal(r.j.hari.length, 1); assert.equal(r.j.hari[0].menonjol, 21);
  await kirim(rekap("07") + "\n\nrusak tanpa isi", "628123", {waktu: String(Date.now() + 2000)});
  r = await api("GET", "/api/dalops/laporan", undefined, ADMIN); assert.equal(r.j.hari.length, 1); assert.equal(r.j.hari[0].status, "ok", "gagal tidak menimpa ok");
  await kirim(rekap("07", "25/10/2026", "26/10/2026") + "\n\nrusak tanpa isi", "628123", {waktu: String(Date.now() + 3000)});
  r = await api("GET", "/api/dalops/laporan", undefined, ADMIN); assert.equal(r.j.hari.length, 2);
  const g = r.j.hari[0]; assert.equal(g.tanggal, "2026-10-26"); assert.equal(g.status, "gagal"); assert.deepEqual(g.kejadian, []); assert.equal(g.menonjol, null); assert.ok(g.alasan);
});

uji("rekap sebagai lampiran .txt tanpa teks ikut terurai", async () => {
  const f = new FormData(); f.set("dari", "628123"); f.set("waktu", String(Date.now() + 4000)); f.set("berkas", new File([FIX.replace("24/10/2026 pkl 07.00 WIB s.d 25/10/2026", "26/10/2026 pkl 07.00 WIB s.d 27/10/2026")], "rekap.txt", {type: "text/plain"}));
  assert.equal((await mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: {"x-wa-kunci": "kunci-wa"}, body: f})).status, 200);
  const r = await api("GET", "/api/dalops/laporan", undefined, ADMIN); assert.equal(r.j.hari[0].tanggal, "2026-10-27"); assert.equal(r.j.hari[0].status, "ok");
});

uji("pengirim tak terdaftar dan obrolan grup tidak mencapai kait", async () => {
  const sebelum = await berkas("dalops/laporan.json");
  assert.equal((await kirim(FIX, "620000")).disimpan, false);
  assert.equal((await kirim("rekapnya mana? sudah dikirim belum", "620000", {grup: "123-456@g.us"})).disimpan, false);   // obrolan grup tidak dikenali: dibuang sebelum kait
  assert.equal(await berkas("dalops/laporan.json"), sebelum);
});

uji("rekap berkepala resmi dari anggota grup dan rekap bertanggal jauh ke depan tidak mengubah arsip", async () => {
  const sebelum = await berkas("dalops/laporan.json");
  assert.equal((await kirim(rekap("07"), "620000", {grup: "123-456@g.us"})).disimpan, true);   // tersimpan sebagai pesan, tapi tidak sampai ke kait
  assert.equal(await berkas("dalops/laporan.json"), sebelum);
  await kirim(rekap("07", "31/12/2098", "01/01/2099"));
  assert.equal(await berkas("dalops/laporan.json"), sebelum);
});

uji("contoh rekap utuh repo sama dengan pengurai Python: 23 laporan, 17 menonjol, 3 baru; tempat dibatasi 80 huruf", () => {
  const contoh = readFileSync(new URL("../../data/laporan-bnpb/generator/contoh/koordalops_241026.txt", import.meta.url), "utf8");
  const h = hariDariRekap(contoh, {diterima: 1});
  assert.deepEqual([h.laporan, h.menonjol, h.kejadian.length, h.kejadian.filter(k => k.sifat === "baru").length], [23, 17, 17, 3]);
  assert.equal(h.kejadian.find(k => k.tempat === "Kota Malang").label, "Kebakaran TPA Supit Urung");
  const panjang = hariDariRekap(contoh.replace("di Prov. Riau *(Pengkinian Data)*", `di ${"Kab. Panjang".repeat(40)} *(Pengkinian Data)*`), {diterima: 1});
  assert.ok(panjang.kejadian.every(k => k.tempat.length <= 80 && k.lokasi.length <= 80));
});

uji("staf (moderator) dan pemirsa pusdalops membaca; pemirsa ditolak di bahan WA dan tidak bisa POST dummy", async () => {
  assert.equal((await api("GET", "/api/dalops/laporan", undefined, MOD2)).s, 200);
  const b = await api("POST", "/api/pemirsa/admin/buat", {nama: "Dir Dalops", tab: ["pusdalops"]}, ADMIN); assert.equal(b.s, 201, b.t);
  const m = await mf.dispatchFetch("http://bnpb.lokal/admin/masuk", {method: "POST", redirect: "manual", headers: {"content-type": "application/x-www-form-urlencoded", origin: "http://bnpb.lokal", "cf-connecting-ip": "198.51.100.7"},
    body: new URLSearchParams({email: b.j.username, sandi: b.j.sandi}).toString()});
  assert.equal(m.status, 303); pemirsa = {cookie: m.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0]};
  const r = await api("GET", "/api/dalops/laporan", undefined, pemirsa); assert.equal(r.s, 200); assert.equal(r.j.hari.length, 3);
  for (const j of ["/api/wa/masuk?tanggal=2026-10-25", "/api/wa/berkas?id=1"]) assert.ok([401, 403].includes((await api("GET", j, undefined, pemirsa)).s), j);
  assert.ok([401, 403, 404, 405].includes((await api("POST", "/api/dalops/laporan/dummy", {aksi: "isi"}, pemirsa)).s));
  assert.ok([401, 403, 404, 405].includes((await api("POST", "/api/dalops/laporan", {}, pemirsa)).s));
  assert.ok(IZIN_PEMIRSA_PUSDALOPS.some(re => re.test("/api/dalops/laporan")) && !IZIN_PEMIRSA_PUSDALOPS.some(re => re.test("/api/dalops/laporan/dummy")));
});

uji("dummy: Super Admin saja, berkas R2 terpisah, berkas asli tidak tersentuh, ?dummy=1 ditolak non Super Admin", async () => {
  const asli = await berkas("dalops/laporan.json");
  assert.equal((await api("POST", "/api/dalops/laporan/dummy", {aksi: "isi"})).s, 403);
  assert.equal((await api("POST", "/api/dalops/laporan/dummy", {aksi: "isi"}, MOD2)).s, 403);
  assert.equal((await api("GET", "/api/dalops/laporan?dummy=1", undefined, MOD2)).s, 403);
  assert.equal((await api("GET", "/api/dalops/laporan?dummy=1", undefined, pemirsa)).s, 403);
  assert.equal((await api("POST", "/api/dalops/laporan/dummy", {aksi: "salah"}, ADMIN)).s, 400);
  const i = await api("POST", "/api/dalops/laporan/dummy", {aksi: "isi"}, ADMIN); assert.equal(i.s, 200, i.t);
  const d = await api("GET", "/api/dalops/laporan?dummy=1", undefined, ADMIN); assert.equal(d.s, 200); assert.equal(d.j.dummy, true);
  assert.equal(d.j.hari.length, 6, "7 hari kalender dikurangi satu hari tanpa rekap");
  assert.ok(d.j.hari.every(h => h.id.startsWith("dummy-")));
  assert.ok(d.j.hari.some(h => h.status === "gagal") && d.j.hari.some(h => h.kejadian.some(k => k.sifat === "baru")) && d.j.hari.some(h => h.kejadian.some(k => k.sifat === "pengkinian")));
  assert.deepEqual(new Set(d.j.hari.flatMap(h => h.kejadian.map(k => k.status))), new Set(["berjalan", "belum", "selesai"]));
  assert.equal(await berkas("dalops/laporan.json"), asli, "berkas asli tak berubah");
  assert.equal((await api("GET", "/api/dalops/laporan", undefined, ADMIN)).j.dummy, undefined);
  assert.equal((await api("POST", "/api/dalops/laporan/dummy", {aksi: "hapus"}, ADMIN)).s, 200);
  assert.equal(await berkas("dalops/laporan_dummy.json"), null); assert.equal(await berkas("dalops/laporan.json"), asli);
  assert.deepEqual((await api("GET", "/api/dalops/laporan?dummy=1", undefined, ADMIN)).j.hari, []);
});
