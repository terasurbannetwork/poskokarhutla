/* Fungsi murni layar /bnpb/operasi (public/bnpb/operasi_pusdalops.js): persen, basi, status ringkas, pohon, ketaatan, teks WA Lapsus.
   Jalan: node --test tests/bnpb/operasi_pusdalops.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/bnpb/operasi_pusdalops.js";
const O = globalThis.OperasiPusdalops, JAM = 36e5, KINI = Date.parse("2026-11-01T05:00:00Z");   // 12.00 WIB

test("persen sama dengan server: satu desimal, null bila target 0", () => {
  assert.equal(O.persen(90, 120), 75); assert.equal(O.persen(1, 3), 33.3); assert.equal(O.persen(0, 5), 0); assert.equal(O.persen(5, 0), null);
  assert.equal(O.fmtPersen(75), "75%"); assert.equal(O.fmtPersen(33.3), "33%"); assert.equal(O.fmtPersen(66.6), "67%"); assert.equal(O.fmtPersen(null), "–");
  assert.equal(O.fmt(1234567), "1.234.567"); assert.equal(O.fmt(2400), "2.400"); assert.equal(O.fmt(null), "–");
});

test("basi: lebih dari 24 jam; tepat 24 jam belum basi (aturan src/lapsus.js)", () => {
  assert.equal(O.basi(KINI - 24 * JAM, KINI), false); assert.equal(O.basi(KINI - 24 * JAM - 1, KINI), true); assert.equal(O.basi(KINI - JAM, KINI), false);
  assert.equal(O.BASI_MS, 24 * JAM);
  assert.equal(O.umurTeks(KINI - 30 * 60000, KINI), "kurang dari 1 jam lalu"); assert.equal(O.umurTeks(KINI - 30 * JAM, KINI), "30 jam lalu"); assert.equal(O.umurTeks(KINI - 96 * JAM, KINI), "4 hari lalu");
  assert.equal(O.umurTeks(KINI + JAM, KINI), "kurang dari 1 jam lalu");   // jam komputer maju: tidak negatif
});

test("batas basi sama dengan konstanta server", () => {
  assert.match(readFileSync(new URL("../../src/lapsus.js", import.meta.url), "utf8"), /BASI_MS = 24 \* 36e5/);
});

test("status ringkas per kab/jenis: terhenti menang, selesai hanya bila semua selesai", () => {
  const x = (o) => ({item: 3, rencana: 0, berjalan: 0, selesai: 0, terhenti: 0, ...o});
  assert.equal(O.statusRingkas(x({selesai: 3})), "selesai"); assert.equal(O.statusRingkas(x({selesai: 2, berjalan: 1})), "berjalan");
  assert.equal(O.statusRingkas(x({selesai: 1, terhenti: 1, berjalan: 1})), "terhenti"); assert.equal(O.statusRingkas(x({rencana: 3})), "rencana");
  assert.equal(O.statusRingkas(x({selesai: 2, rencana: 1})), "rencana");
});

test("ketaatan: terendah dulu, null di akhir, label wilayah", () => {
  const baris = [{kategori: "bpbd_prov", prov: "11", dipanggil: 10, hadir: 9, gangguan: 1, tidak: 0, persen: 90}, {kategori: "bpbd_prov", prov: "12", dipanggil: 10, hadir: 4, gangguan: 0, tidak: 6, persen: 40},
    {kategori: "bpbd_kab", prov: "11", kab: "Aceh Tamiang", dipanggil: 4, hadir: 3, gangguan: 0, tidak: 1}, {kategori: "komunitas", prov: "13", nama: "RAPI Sumbar", dipanggil: 0, hadir: 0, gangguan: 0, tidak: 0, persen: null},
    {kategori: "komunitas", prov: "11", nama: "ORARI Aceh", dipanggil: 2, hadir: 2, gangguan: 0, tidak: 0, persen: 100}];
  const k = O.ketaatan(baris, {11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat"});
  assert.deepEqual(k.bpbd_prov.map(x => x.label), ["Sumatera Utara", "Aceh"]);
  assert.equal(k.bpbd_kab[0].label, "Aceh Tamiang (Aceh)"); assert.equal(k.bpbd_kab[0].persen, 75);   // persen dihitung bila server tak mengirim
  assert.deepEqual(k.komunitas.map(x => x.label), ["ORARI Aceh (Aceh)", "RAPI Sumbar (Sumatera Barat)"]);
  assert.equal(O.toneKetaatan(90), "ok"); assert.equal(O.toneKetaatan(60), "tunggu"); assert.equal(O.toneKetaatan(10), "bahaya"); assert.equal(O.toneKetaatan(null), "info");
});

test("slot bawaan roll call dan bulan WIB", () => {
  assert.equal(O.slotBawaan(Date.parse("2026-11-01T00:30:00Z")), "pagi");   // 07.30 WIB
  assert.equal(O.slotBawaan(KINI), "siang"); assert.equal(O.slotBawaan(Date.parse("2026-11-01T12:00:00Z")), "malam");   // 19.00 WIB
  assert.equal(O.bulanIni(Date.parse("2026-10-31T18:00:00Z")), "2026-11");   // sudah 1 Nov di WIB
  assert.equal(O.bulanTeks("2026-11"), "November 2026");
});

test("angka gaya Indonesia: titik hanya ribuan, koma desimal; 3.5 ditolak (bukan 35)", () => {
  for (const [t, n] of [["2400", 2400], ["2.400", 2400], ["1.234.567", 1234567], ["3,5", 3.5], ["1.234,5", 1234.5], [" 90 ", 90], ["0,25", 0.25]]) assert.equal(O.angka(t), n, t);
  for (const t of ["3.5", "1.2,5", "12.34", "1.23", "1,2,3", "abc", "", "-5", "1e3", "1.234.56", ",5"]) assert.ok(Number.isNaN(O.angka(t)), JSON.stringify(t));
});

test("flag server menang atas jam klien: basi, umur_jam, jumlah_basi", () => {
  const k = (o) => ({waktu_data: KINI - JAM, ...o});   // menurut jam klien baru 1 jam
  assert.equal(O.basiK(k({basi: true}), KINI), true); assert.equal(O.basiK(k({basi: false, waktu_data: KINI - 99 * JAM}), KINI), false); assert.equal(O.basiK(k({}), KINI), false);
  assert.equal(O.umurK(k({umur_jam: 50}), KINI), "2 hari lalu"); assert.equal(O.umurK(k({}), KINI), "1 jam lalu");
  const r = {operasi: {nama: "X", jenis: "banjir", mulai: "2026-10-12", status: "aktif"}, jumlah_basi: 1, provinsi: [{prov: "11", nama: "Aceh", tim: [], kejadian: [], kab: [k({kab: "A", basi: true, umur_jam: 30}), k({kab: "B", basi: false, umur_jam: 2})]}]};
  assert.equal(O.hitungBasi(r, KINI), 1); assert.equal(O.hitungBasi({...r, jumlah_basi: 5}, KINI), 5);
  const t = O.teksWa(r, KINI, KINI, j => "Banjir!"); assert.match(t, /- A \(BASI\), data 30 jam lalu/); assert.match(t, /- B, data 2 jam lalu/); assert.match(t, /Jenis Banjir!,/);
  assert.equal(O.tglIndo("2026-10-12"), "12 Okt 2026");
});

const RINCI = {operasi: {id: "a".repeat(16), nama: "Operasi Banjir Sumatera", jenis: "banjir", mulai: "2026-10-12", status: "aktif", dummy: false}, provinsi: [
  {prov: "11", nama: "Aceh", tim: [{id: "t1", nama: "Tim A BNPB"}, {id: "t2", nama: "Tim B Kemensos"}], kejadian: [{kejadian_id: "k1", prov: "11", tim_id: "t1", jenis: "banjir", kab: "Aceh Tamiang"}, {kejadian_id: "k2", prov: "11", tim_id: null, jenis: "banjir", kab: "Aceh Utara"}],
    kab: [{prov: "11", kab: "Aceh Tamiang", waktu_data: KINI - JAM, kebutuhan: [{kelompok: "peralatan", barang: "Sekop", jumlah: 2400, satuan: "buah"}, {kelompok: "logistik", barang: "Terpal", jumlah: 3000, satuan: "lembar"}],
      layanan: {bbm: {status: "terganggu"}, sinyal: {status: "padam"}, air: {status: "normal"}}, catatan: "akses jalan putus"},
      {prov: "11", kab: "Aceh Utara", waktu_data: KINI - 4 * 24 * JAM, kebutuhan: null, layanan: null, catatan: null}]},
  {prov: "13", nama: "Sumatera Barat", tim: [], kejadian: [], kab: []}]};

test("pohon operasi > provinsi > tim > kejadian", () => {
  const p = O.pohon(RINCI.provinsi[0]);
  assert.deepEqual(p.tim.map(t => [t.nama, t.kejadian.map(k => k.kab)]), [["Tim A BNPB", ["Aceh Tamiang"]], ["Tim B Kemensos", []]]);
  assert.deepEqual(p.tanpaTim.map(k => k.kab), ["Aceh Utara"]);
  assert.deepEqual(O.pohon(RINCI.provinsi[1]), {tim: [], tanpaTim: []});
});

test("teks WA Lapsus: basi ditandai, kebutuhan berjumlah, layanan, sumber; tanpa titik tengah, em dash, atau Pantau Bencana", () => {
  assert.equal(O.hitungBasi(RINCI, KINI), 1);
  const t = O.teksWa(RINCI, KINI);
  assert.match(t, /^\*LAPORAN KHUSUS OPERASI BANJIR SUMATERA\*/); assert.match(t, /Jenis banjir, mulai 12 Okt 2026, status aktif/);
  assert.match(t, /PERHATIAN: 1 kabupaten\/kota datanya lebih dari 24 jam \(BASI\)/);
  assert.match(t, /- Aceh Tamiang, data 1 jam lalu\n  Kebutuhan mendesak: Sekop 2\.400 buah; Terpal 3\.000 lembar\n  Layanan dasar: BBM terganggu, Sinyal padam, Air normal\n  Catatan: akses jalan putus/);
  assert.match(t, /- Aceh Utara \(BASI\), data 4 hari lalu/); assert.match(t, /Tim: Tim A BNPB, Tim B Kemensos/); assert.match(t, /\*Sumatera Barat\*\nBelum ada entri harian\./);
  assert.match(t, /Sumber: Pusdalops BNPB, Laporan Khusus, diambil 1 Nov 2026 12\.00 WIB$/);
  assert.ok(!/ · |—|Pantau Bencana|undefined|NaN|null/.test(t));
  const d = O.teksWa({...RINCI, operasi: {...RINCI.operasi, dummy: true}}, KINI); assert.match(d, /^DATA DUMMY, BUKAN LAPORAN NYATA/);
  assert.ok(!/PERHATIAN/.test(O.teksWa({...RINCI, provinsi: [RINCI.provinsi[1]]}, KINI)));
});

/* ---------- halaman: CSP bersih + cek asap Chrome dengan stub API ---------- */
import http from "node:http";
import path from "node:path";
import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {before, after} from "node:test";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public"), CHROME = cariChrome();

test("operasi.html/js: CSP bersih, kepala situs bersama, tanpa innerHTML, titik tengah, em dash, atau nama lama", () => {
  const html = readFileSync(`${PUB}/bnpb/operasi.html`, "utf8"), js = readFileSync(`${PUB}/bnpb/operasi.js`, "utf8") + readFileSync(`${PUB}/bnpb/operasi_pusdalops.js`, "utf8") + readFileSync(`${PUB}/bnpb/operasi_g3.js`, "utf8");
  assert.ok(!/<script(?![^>]*\bsrc=)/i.test(html), "skrip inline"); assert.ok(!/<style|\sstyle=|\son[a-z]+=/i.test(html), "gaya/atribut inline");
  assert.match(html, /class="ad-top"/); assert.match(html, /bnpb\.css/);
  assert.ok(!/innerHTML|insertAdjacentHTML|eval\(|\.style\./.test(js), "innerHTML atau gaya inline lewat JS");
  assert.ok(!/ · |—|Pantau Bencana/.test(js + html), "titik tengah, em dash, atau nama lama");
  assert.ok(!/migrasi|0096|0098/i.test(js), "nomor migrasi bocor ke pesan layar");
  assert.ok(html.indexOf("operasi_g3.js") > 0 && html.indexOf("operasi_g3.js") < html.indexOf("operasi.js"), "operasi_g3.js harus dimuat sebelum operasi.js");
});

test("Gelombang 3 murni: sisa SK, nada, alasan cek, urut sisa_jam (bukan lift), lift dua desimal, jeda", () => {
  assert.equal(O.sisaHariTeks(12), "12 hari"); assert.equal(O.sisaHariTeks(0), "berakhir hari ini"); assert.equal(O.sisaHariTeks(-3), "lewat 3 hari"); assert.equal(O.sisaHariTeks(null), "TMT selesai belum diisi");
  assert.equal(O.skTone({perlu_cek: true, sisa_hari: 30}), "bahaya"); assert.equal(O.skTone({perlu_cek: false, sisa_hari: 5}), "tunggu"); assert.equal(O.skTone({perlu_cek: false, sisa_hari: 30}), "ok"); assert.equal(O.skTone({perlu_cek: false, sisa_hari: null}), "ok");
  assert.equal(O.alasanCek({perlu_cek: false}), ""); assert.equal(O.alasanCek({perlu_cek: true, kejadian_selesai: true, tanpa_entri_hari: 9}), "Kejadian sudah selesai"); assert.equal(O.alasanCek({perlu_cek: true, kejadian_selesai: false, tanpa_entri_hari: 1234}), "Tanpa entri 1.234 hari");
  const a = [{kab: "B", susulan: "banjir", sisa_jam: 20, lift: 2.12}, {kab: "A", susulan: "longsor", sisa_jam: 5, lift: 1.38}, {kab: "C", susulan: "banjir", sisa_jam: 40, lift: 1.98}], asal = a.map(x => x.kab).join("");
  assert.deepEqual(O.urutSisaJam(a).map(x => x.kab), ["A", "B", "C"]); assert.equal(a.map(x => x.kab).join(""), asal, "masukan tak diubah");
  assert.equal(O.sisaJamTeks(0), "kurang dari 1 jam lagi"); assert.equal(O.sisaJamTeks(20), "20 jam lagi"); assert.equal(O.sisaJamTeks(60), "2 hari lagi");
  assert.equal(O.liftTeks({lift: 2.12, ci95: [1.97, 2.27], n: 9831}), "lift 2,1 kali, ci95 2 sampai 2,3, n 9.831"); assert.equal(O.liftTeks({lift: 2, ci95: null, n: 5}), "lift 2 kali, ci95 –, n 5");
  assert.equal(O.menitTeks(null), "–"); assert.equal(O.menitTeks(45), "45 menit"); assert.equal(O.menitTeks(90), "1,5 jam"); assert.equal(O.menitTeks(2880), "2 hari"); assert.equal(O.bulanSingkat("2026-10"), "Okt 2026");
});

const MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json"};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const S = {log: [], masuk: true, pemulihan: [], dummy: false};
const hex = n => String(n).padStart(16, "0").replace(/\d/g, d => "abcdef0123"[d % 10]).slice(0, 16);
const OP = {id: "ab".repeat(8), nama: "Operasi Banjir Sumatera (dummy)", jenis: "banjir", mulai: "2026-10-12", status: "aktif", dummy: true};
const RINCI_STUB = () => ({operasi: OP, basi_jam: 24, jumlah_basi: 1, provinsi: [{prov: "11", nama: "Aceh", tim: [{id: "cd".repeat(8), nama: "Tim A BNPB (dummy)"}], kejadian: [{kejadian_id: "ef".repeat(8), prov: "11", tim_id: "cd".repeat(8), jenis: "banjir", kab: "Aceh Tamiang", status: "buka"}],
  kab: [{id: "1", prov: "11", kab: "Aceh Tamiang", waktu_data: Date.now() - 36e5, basi: false, kebutuhan: [{kelompok: "peralatan", barang: "Sekop", jumlah: 2400, satuan: "buah"}], layanan: {bbm: {status: "terganggu"}, sinyal: {status: "padam"}, listrik: {status: "normal"}, air: {status: "normal"}}, catatan: null},
    {id: "2", prov: "11", kab: "Aceh Utara", waktu_data: Date.now() - 4 * 864e5, basi: true, kebutuhan: null, layanan: {air: {status: "terganggu"}}, catatan: "Dummy basi"}]}]});
const PEMULIHAN = [{id: hex(1), jenis: "huntara", prov: "11", kab: "Aceh Tamiang", desa: "Kampung Dalam", lat: null, lon: null, target: 120, realisasi: 90, satuan: "unit", pelaksana: "PT Contoh (dummy)", sumber_dana: "APBN", status: "berjalan", dummy: true}];
const RINGKAS = [{prov: "11", kab: "Aceh Tamiang", jenis: "huntara", satuan: "unit", item: 1, target: 120, realisasi: 90, rencana: 0, berjalan: 1, selesai: 0, terhenti: 0, berkoordinat: 0, persen: 75}];
const SK = (o) => ({id: "s1", kejadian_id: "ef".repeat(8), jenis: "banjir", prov: "33", kab: "Cilacap", tingkat: "tanggap", wilayah: "kab", nomor: "100/2026", tmt_mulai: "2026-10-20", tmt_selesai: "2026-11-10", perpanjangan_ke: 0, sisa_hari: 8, kejadian_selesai: false, tanpa_entri_hari: 1, perlu_cek: false, dummy: false, ...o});
const SK_AKTIF = {tanggal: "2026-11-02", terpotong: false, jumlah: 3, perlu_cek: 2, per_tingkat: [{tingkat: "siaga", sk: 1, perlu_cek: 0}, {tingkat: "tanggap", sk: 2, perlu_cek: 2}], per_provinsi: [{prov: "33", sk: 2, perlu_cek: 1}, {prov: "11", sk: 1, perlu_cek: 1}],
  sk: [SK({id: "s1", nomor: "100/2026", sisa_hari: 8}), SK({id: "s2", nomor: "200/2026", prov: "11", kab: "Aceh Tamiang", sisa_hari: -4, kejadian_selesai: true, perlu_cek: true, dummy: true}), SK({id: "s3", nomor: "300/2026", tingkat: "siaga", wilayah: "prov", kab: null, sisa_hari: null, tmt_selesai: null, tanpa_entri_hari: 12, perlu_cek: true})]};
const PB = (kab, prov, susulan, pemicu, sisa, lift, ci) => ({prov, kab, susulan, pemicu, kejadian_id: null, mulai: Date.now() - 36e5, berlaku_sampai: Date.now() + sisa * 36e5, sisa_jam: sisa, laju: 0.083, lift, ci95: ci, n: 9831, teks: `Setelah ${pemicu} tercatat di kab ini, ${susulan} tercatat dalam 1-3 hari. Pola deskriptif dari laporan Pusdalops, bukan ramalan.`, dummy: kab === "Agam"});
const BERANTAI = [PB("Agam", "13", "banjir", "banjir", 40, 1.98, [1.88, 2.1]), PB("Cilacap", "33", "longsor", "cuaca", 5, 1.38, [1.25, 1.52]), PB("Banjarnegara", "33", "longsor", "banjir", 20, 2.12, [1.97, 2.27])];
const BUTIR = [{id: "1a".repeat(8), sumber: "medsos", tautan: "https://contoh.invalid/p/1", judul: "Video banjir menggenangi jalan raya", prov: "33", kab: "Cilacap", jenis: "banjir", waktu_pantau: Date.now() - 36e5, status: "baru", dummy: true},
  {id: "2b".repeat(8), sumber: "tv", tautan: "https://contoh.invalid/p/2", judul: "Liputan asap di lahan", prov: "14", kab: null, jenis: null, waktu_pantau: Date.now() - 72e5, status: "baru", dummy: false}];
const JEDA = {terpotong: false, keseluruhan: {n: 5, median_menit: 45, logbook_lebih_dulu: 1}, per_bulan: [{bulan: "2026-10", n: 3, logbook_lebih_dulu: 1, median_menit: 45}, {bulan: "2026-09", n: 2, logbook_lebih_dulu: 0, median_menit: 130}]};
let server, base;
const jalankan = () => new Promise(ok => {
  server = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://x"), p = u.pathname, json = (s, o) => { res.writeHead(s, {"content-type": "application/json"}); res.end(JSON.stringify(o)); };
    if (p.startsWith("/api/")) {
      const c = []; for await (const x of req) c.push(x); let body = null; try { body = JSON.parse(Buffer.concat(c).toString()); } catch (e) {}
      S.log.push({m: req.method, p, q: u.search, body});
      if (p === "/api/akademisi/saya") return json(200, {peran: "admin", super: true});
      if (p.startsWith("/api/pusdalops") && !S.masuk) return json(401, {galat: "belum masuk"});
      if (p === "/api/pusdalops/pemulihan/ringkasan") return json(200, {ringkasan: RINGKAS});
      if (p === "/api/pusdalops/pemulihan" && req.method === "GET") return json(200, {terpotong: false, pemulihan: PEMULIHAN});
      if (p === "/api/pusdalops/pemulihan" || p === "/api/pusdalops/pemulihan/progres") return json(201, {ok: true});
      if (p === "/api/pusdalops/lapsus" && req.method === "GET") return json(200, {operasi: [{...OP, jumlah_prov: 1, jumlah_entri: 2, diubah: Date.now()}]});
      if (p === "/api/pusdalops/lapsus/" + OP.id) return json(200, RINCI_STUB());
      if (/^\/api\/pusdalops\/lapsus/.test(p)) return json(201, {ok: true});
      if (p === "/api/pusdalops/rollcall/ringkasan") return json(200, {bulan: u.searchParams.get("bulan"), sesi: 2, hari: 2, per_kategori: [{kategori: "bpbd_prov", dipanggil: 20, hadir: 15, gangguan: 2, tidak: 3, persen: 75}],
        per_peserta: [{kategori: "bpbd_prov", prov: "11", kab: null, nama: null, dipanggil: 2, hadir: 2, gangguan: 0, tidak: 0, persen: 100}, {kategori: "bpbd_prov", prov: "12", kab: null, nama: null, dipanggil: 2, hadir: 0, gangguan: 1, tidak: 1, persen: 0}]});
      if (p === "/api/pusdalops/rollcall" && req.method === "GET") return json(200, {bulan: u.searchParams.get("bulan"), sesi: [{id: hex(2), tgl: "2026-11-01", slot: "pagi", dummy: 1, dipanggil: 10, hadir: 8, tidak: 1, gangguan: 1}]});
      if (p === "/api/pusdalops/rollcall") return json(201, {sesi: {}});
      if (p === "/api/pusdalops/berantai" && req.method === "GET") return S.g3_503 ? json(503, {galat: "tabel belum ada"}) : json(200, {terpotong: false, catatan: "Pola deskriptif dari arsip logbook Pusdalops 2014-2025, bukan ramalan.", peringatan: BERANTAI});
      if (p === "/api/logbook/sk/aktif") return json(200, SK_AKTIF);
      if (p === "/api/pusdalops/medsos" && req.method === "GET") return json(200, {status: "baru", terpotong: false, butir: BUTIR});
      if (p === "/api/pusdalops/medsos/jeda") return json(200, JEDA);
      if (p === "/api/pusdalops/medsos/verifikasi") return S.verif409 ? json(409, {galat: "butir sudah diverifikasi"}) : json(200, {butir: {}});
      if (p === "/api/pusdalops/medsos") return json(201, {butir: {}});
      if (/\/dummy$/.test(p)) return json(201, {ok: true});
      if (p === "/api/logbook/buka") return json(200, {kejadian: [{id: "ef".repeat(8), jenis: "banjir", kec: "Kroya", desa: "Pesahangan"}]});
      return json(404, {galat: "tidak ada"});
    }
    const f = path.join(PUB, decodeURIComponent(p));
    if (f.startsWith(PUB) && existsSync(f) && !p.endsWith("/")) { res.writeHead(200, {"content-type": MIME[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); return res.end(readFileSync(f)); }
    res.writeHead(404); res.end("tidak ada");
  }).listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; ok(); });
});

if (!CHROME) test("layar operasi", {skip: "Chrome tidak ditemukan (set CHROME_BIN)"}, () => {});
else {
  let br, tab;
  before(async () => { await jalankan(); br = await bukaPeramban(CHROME); tab = await br.tab(); });
  after(async () => { await tab?.tutup(); await br?.tutup(); server?.close(); });
  const luar = g => !/favicon\.ico|fonts\.(googleapis|gstatic)\.com|ERR_(INTERNET|NAME|CONNECTION)|401|404/.test(g);
  const bersih = async l => {
    const t = await tab.teks(); assert.deepEqual([...new Set(t.match(/\bNaN\b|\bundefined\b|\bnull\b|\[object|—| · |Pantau Bencana|migrasi/g) || [])], [], l + ": teks terlarang");
    assert.deepEqual(tab.galat().filter(luar), [], l + ": galat konsol");
  };
  const tanpaGulir = async l => { for (const [w, hh] of [[1440, 900], [390, 844]]) { await tab.ukuran(w, hh); const x = await tab.lebihLebar(); assert.ok(x.sw <= x.iw + 1, `${l} ${w}px gulir mendatar ${x.sw}>${x.iw}`); } await tab.ukuran(1440, 900); };
  const isi_filter = v => tab.eval(`(() => { const e = document.querySelector('select[aria-label="Filter provinsi"]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("change", {bubbles: true})); })()`);
  const pilihTab = async k => { await tab.klik(`[data-tab="${k}"]`); await tab.tungguFungsi(`document.querySelector('[data-tab="${k}"]').getAttribute('aria-selected') === 'true' && !document.querySelector('.op-isi').hasAttribute('aria-busy')`, 15000); };

  test("tanpa sesi tampil kartu masuk", async () => {
    S.masuk = false; await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".bn-blok a[href^='/admin/masuk?ke=%2Fbnpb%2Foperasi']"});
    assert.match(await tab.teks(), /Masuk staf/); S.masuk = true;
  });

  test("pemulihan: ringkasan, daftar, penanda dummy, form tambah item dan progres terkirim", async () => {
    S.log.length = 0; tab.kosongkanGalat();
    await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"});
    await tab.tungguFungsi("!document.querySelector('.op-isi').hasAttribute('aria-busy')");
    const t = await tab.teks(); assert.match(t, /Hunian sementara/); assert.match(t, /75%/); assert.match(t, /90 unit/); assert.match(t, /DATA DUMMY/);
    assert.equal(await tab.eval("document.querySelectorAll('.op-tabel th').length > 0 && [...document.querySelectorAll('.op-tabel th')].every(x => getComputedStyle(x).textAlign === 'center')"), true, "header tabel tidak rata tengah");
    await bersih("pemulihan"); await tanpaGulir("pemulihan");
    /* tambah item */
    await tab.eval("document.querySelector('[data-form=progres]').open = true; document.querySelector('details.op-tak-cetak:not([data-form])').open = true");
    await tab.eval(`(() => { const d = document.querySelector('details.op-tak-cetak:not([data-form])'), s = (n, v) => { const e = d.querySelector('[name="' + n + '"]'); e.value = v; e.dispatchEvent(new Event('change', {bubbles: true})); };
      s('prov', '11'); })()`);
    await tab.tungguFungsi("document.querySelector('details.op-tak-cetak:not([data-form]) select[name=kab]').options.length > 3", 10000);
    await tab.eval(`(() => { const d = document.querySelector('details.op-tak-cetak:not([data-form])'), s = (n, v) => { const e = d.querySelector('[name="' + n + '"]'); e.value = v; e.dispatchEvent(new Event('change', {bubbles: true})); };
      s('kab', d.querySelector('select[name=kab]').options[1].value); s('target', '1.200'); s('realisasi', '300'); s('satuan', 'unit'); d.querySelector('form').requestSubmit(); })()`);
    await new Promise(r => setTimeout(r, 600));
    const kirim = S.log.find(x => x.m === "POST" && x.p === "/api/pusdalops/pemulihan"); assert.ok(kirim, "POST pemulihan tidak terkirim");
    assert.equal(kirim.body.target, 1200); assert.equal(kirim.body.realisasi, 300); assert.match(kirim.body.kab, /^11\|/); assert.equal(kirim.body.jenis, "huntara");
    /* "3.5" ditolak di layar, tidak terkirim */
    const n0 = S.log.filter(x => x.m === "POST").length;
    await tab.eval(`(() => { const d = document.querySelector('[data-form=progres]'); d.open = true; d.querySelector('select[name=id]').value = document.querySelector('[data-progres]').dataset.progres; const s = (n, v) => { d.querySelector('[name="' + n + '"]').value = v; }; s('realisasi', '3.5'); s('catatan', 'x'); d.querySelector('form').requestSubmit(); })()`);
    await tab.tungguFungsi("/pakai koma untuk desimal/.test(document.body.innerText)", 5000);
    assert.equal(S.log.filter(x => x.m === "POST").length, n0, "angka 3.5 terkirim");
    /* progres lewat tombol baris */
    await tab.tungguFungsi("!document.querySelector('.op-isi').hasAttribute('aria-busy')");
    await tab.klik("[data-progres]");
    await tab.eval(`(() => { const d = document.querySelector('[data-form=progres]'), s = (n, v) => { const e = d.querySelector('[name="' + n + '"]'); e.value = v; }; s('realisasi', '100'); s('catatan', 'dinding terpasang'); d.querySelector('form').requestSubmit(); })()`);
    await new Promise(r => setTimeout(r, 600));
    const pr = S.log.find(x => x.p === "/api/pusdalops/pemulihan/progres"); assert.ok(pr, "POST progres tidak terkirim"); assert.equal(pr.body.id, hex(1)); assert.equal(pr.body.realisasi, 100);
    await bersih("pemulihan sesudah kirim");
  });

  test("laporan khusus: daftar, rincian, penanda basi mencolok, kebutuhan dan layanan terkirim, teks WA", async () => {
    S.log.length = 0; tab.kosongkanGalat();
    await pilihTab("lapsus");
    assert.match(await tab.teks(), /Operasi Banjir Sumatera/);
    await tab.klikTeks("button", "^Buka$"); await tab.tunggu(".op-basi");
    await tab.tungguFungsi("!document.querySelector('.op-isi').hasAttribute('aria-busy') && document.getElementById('opWa') && document.getElementById('opWa').value.length > 50", 10000);
    const t = await tab.teks(); assert.match(t, /1 kabupaten\/kota datanya lebih dari 24 jam \(BASI\)/); assert.match(t, /Sekop 2\.400 buah/); assert.match(t, /Tim A BNPB/); assert.match(t, /Aceh Tamiang/);
    assert.equal(await tab.eval("document.querySelectorAll('tr.op-basi-baris').length"), 1); assert.equal(await tab.eval("getComputedStyle(document.querySelector('.op-basi')).borderTopWidth"), "2px");
    assert.match(await tab.eval("document.getElementById('opWa').value"), /Aceh Utara \(BASI\)/);
    await bersih("lapsus"); await tanpaGulir("lapsus");
    /* entri harian */
    const ent = "[...document.querySelectorAll('details.op-tak-cetak')].find(d => /Entri harian/.test(d.innerText))";
    await tab.eval(`(() => { const d = ${ent}; d.open = true; const e = d.querySelector('select[name=prov]'); e.value = '11'; e.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    await tab.tungguFungsi(`${ent}.querySelector('select[name=kab]').options.length > 3`, 10000);
    await tab.eval(`(() => { const d = ${ent}, s = (e, v) => { e.value = v; e.dispatchEvent(new Event('change', {bubbles: true})); }; s(d.querySelector('select[name=kab]'), d.querySelector('select[name=kab]').options[1].value);
      const b = d.querySelector('.op-baris'); s(b.querySelector('[data-k=barang]'), 'Terpal'); s(b.querySelector('[data-k=jumlah]'), '3.000'); s(b.querySelector('[data-k=satuan]'), 'lembar');
      d.querySelector('input[name=l_bbm][value=padam]').click(); d.querySelector('input[name=l_air][value=normal]').click(); d.querySelector('form').requestSubmit(); })()`);
    await new Promise(r => setTimeout(r, 600));
    const e = S.log.find(x => x.p === "/api/pusdalops/lapsus/entri"); assert.ok(e, "POST entri tidak terkirim");
    assert.equal(e.body.operasi_id, OP.id); assert.deepEqual(e.body.kebutuhan, [{kelompok: "logistik", barang: "Terpal", jumlah: 3000, satuan: "lembar"}]); assert.deepEqual(e.body.layanan, {bbm: {status: "padam"}, air: {status: "normal"}}); assert.ok(Number.isFinite(e.body.waktu_data));
    /* salin WA dan cetak tersedia */
    await tab.tungguFungsi("!document.querySelector('.op-isi').hasAttribute('aria-busy') && document.querySelector('[data-aksi=salin]')", 10000);
    assert.equal(await tab.eval("!!document.querySelector('[data-aksi=cetak]') && !!document.querySelector('[data-aksi=salin]')"), true);
    await bersih("lapsus sesudah kirim");
  });

  test("roll call: form sesi terkirim sesuai klik, ketaatan per bulan tampil", async () => {
    S.log.length = 0; tab.kosongkanGalat();
    await pilihTab("rollcall");
    const t = await tab.teks(); assert.match(t, /Ketaatan/); assert.match(t, /2 sesi/); assert.match(t, /BPBD provinsi, terendah dulu/); assert.match(t, /0%/); assert.match(t, /100%/);
    assert.equal(await tab.eval("document.querySelectorAll('.op-rc-baris').length"), 38);
    await bersih("rollcall"); await tanpaGulir("rollcall");
    await tab.eval(`(() => { const d = document.querySelector('details.op-tak-cetak'); d.open = true; })()`);
    await tab.klik('details.op-tak-cetak .op-rc-baris [data-hasil="hadir"]'); await tab.klik('details.op-tak-cetak .op-rc-baris:nth-child(2) [data-hasil="gangguan"]');
    await tab.klikTeks("details.op-tak-cetak button", "^Semua provinsi hadir$"); await tab.klik('details.op-tak-cetak .op-rc-baris:nth-child(3) [data-hasil="tidak"]');
    /* Tambah dengan isian belum valid memberi pesan; tambah kab menambah tepat satu baris */
    await tab.klikTeks("details.op-tak-cetak button", "^Tambah kabupaten/kota$"); assert.match(await tab.teks(), /Pilih provinsi dan kabupaten\/kota dulu/);
    await tab.klikTeks("details.op-tak-cetak button", "^Tambah komunitas$"); assert.match(await tab.teks(), /Isi nama komunitas/);
    await tab.eval(`(() => { const d = document.querySelector('details.op-tak-cetak'); const sp = d.querySelector('.bn-baris select[name=prov]'); sp.value = '11'; sp.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    await tab.tungguFungsi("document.querySelector('details.op-tak-cetak .bn-baris select[name=kab]').options.length > 3", 10000);
    await tab.eval(`(() => { const d = document.querySelector('details.op-tak-cetak'); window.__baris = d.querySelector('.op-rc-baris'); const k = d.querySelector('.bn-baris select[name=kab]'); k.value = k.options[1].value; k.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    const sebelum = await tab.eval("document.querySelectorAll('details.op-tak-cetak .op-rc-baris').length");
    await tab.klikTeks("details.op-tak-cetak button", "^Tambah kabupaten/kota$");
    assert.equal(await tab.eval("document.querySelectorAll('details.op-tak-cetak .op-rc-baris').length"), sebelum + 1); assert.equal(await tab.eval("window.__baris.isConnected"), true, "baris lama dirender ulang");
    await tab.klikTeks("details.op-tak-cetak button", "^Tambah kabupaten/kota$"); assert.match(await tab.teks(), /sudah ada di daftar/);
    await tab.eval("document.querySelector('details.op-tak-cetak .op-rc-baris:last-of-type [aria-label=\"Hapus peserta\"]')?.click()");
    await tab.klik("details.op-tak-cetak form button[type=submit]"); await new Promise(r => setTimeout(r, 600));
    const k = S.log.find(x => x.m === "POST" && x.p === "/api/pusdalops/rollcall"); assert.ok(k, "POST roll call tidak terkirim");
    assert.match(k.body.tgl, /^\d{4}-\d\d-\d\d$/); assert.ok(["pagi", "siang", "malam"].includes(k.body.slot));
    assert.equal(k.body.peserta.length, 38); assert.equal(k.body.peserta.filter(x => x.hasil === "tidak").length, 1); assert.equal(k.body.peserta.filter(x => x.kategori === "bpbd_prov").length, 38);
    await bersih("rollcall sesudah kirim");
  });

  test("dummy: Super Admin melihat dua ikon; isi memakai rute tab yang terbuka, hapus memakai keenam rute", async () => {
    S.log.length = 0; tab.kosongkanGalat();
    await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"}); await tab.tunggu("[data-dummy=isi]");
    assert.equal(await tab.eval("document.querySelectorAll('[data-dummy]').length"), 2);
    await tab.klik("[data-dummy=isi]"); await new Promise(r => setTimeout(r, 500));
    assert.ok(S.log.some(x => x.m === "POST" && x.p === "/api/pusdalops/pemulihan/dummy" && x.body.aksi === "isi"), "dummy pemulihan tidak dipanggil");
    await pilihTab("rollcall"); S.log.length = 0; await tab.klik("[data-dummy=isi]"); await new Promise(r => setTimeout(r, 500));
    assert.deepEqual(S.log.filter(x => x.m === "POST").map(x => x.p), ["/api/pusdalops/rollcall/dummy"]);
    await tab.eval("window.confirm = () => true"); S.log.length = 0; await tab.klik("[data-dummy=hapus]"); await new Promise(r => setTimeout(r, 500));
    assert.deepEqual(S.log.filter(x => x.m === "POST").map(x => x.p).sort(), ["/api/logbook/dummy", "/api/pusdalops/berantai/dummy", "/api/pusdalops/lapsus/dummy", "/api/pusdalops/medsos/dummy", "/api/pusdalops/pemulihan/dummy", "/api/pusdalops/rollcall/dummy"]);
    assert.ok(S.log.filter(x => x.m === "POST").every(x => x.body.aksi === "hapus"));
    await bersih("dummy");
  });

  test("enam tab: satu baris penuh lebar di 1440, dua baris rata di 390, tanpa meluap, semua berikon", async () => {
    await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"});
    assert.deepEqual(await tab.eval("[...document.querySelectorAll('[data-tab]')].map(b => b.dataset.tab)"), ["pemulihan", "lapsus", "rollcall", "sk", "berantai", "medsos"]);
    assert.equal(await tab.eval("[...document.querySelectorAll('[data-tab]')].every(b => b.querySelector('svg'))"), true, "tiap tab berikon");
    const ukur = "(() => { const r = [...document.querySelectorAll('[data-tab]')].map(b => b.getBoundingClientRect()), w = document.querySelector('.op-tabs').getBoundingClientRect(); return {tops: new Set(r.map(x => Math.round(x.top))).size, lebar: new Set(r.map(x => Math.round(x.width))).size, kiri: Math.round(r[0].left - w.left), kanan: Math.round(w.right - Math.max(...r.map(x => x.right))), meluap: document.querySelector('.op-tabs').scrollWidth > document.querySelector('.op-tabs').clientWidth + 1}; })()";
    await tab.ukuran(1440, 900); let u = await tab.eval(ukur); assert.equal(u.tops, 1, "1440: satu baris"); assert.equal(u.lebar, 1, "1440: lebar sama"); assert.ok(Math.abs(u.kanan) <= 2 && Math.abs(u.kiri) <= 2, "1440: penuh lebar"); assert.equal(u.meluap, false);
    await tab.ukuran(390, 844); u = await tab.eval(ukur); assert.equal(u.tops, 2, "390: dua baris"); assert.equal(u.lebar, 1, "390: lebar sama"); assert.ok(Math.abs(u.kanan) <= 2, "390: penuh lebar"); assert.equal(u.meluap, false);
    assert.equal(await tab.eval("[...document.querySelectorAll('[data-tab]')].every(b => b.scrollWidth <= b.clientWidth + 1)"), true, "label tab tidak terpotong di 390");
    await tab.ukuran(1440, 900);
  });

  test("SK Aktif: papan per tingkat dan provinsi, sisa hari, perlu cek menonjol di atas, tanggal singkat, Sumber", async () => {
    await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"}); await pilihTab("sk");
    const t = await tab.teks(); assert.match(t, /Per 2 Nov 2026/); assert.match(t, /3 SK aktif/); assert.match(t, /2 perlu dicek/); assert.match(t, /Siaga darurat/); assert.match(t, /Tanggap darurat/);
    assert.match(t, /8 hari/); assert.match(t, /lewat 4 hari/); assert.match(t, /TMT selesai belum diisi/); assert.match(t, /Kejadian sudah selesai/); assert.match(t, /Tanpa entri 12 hari/); assert.match(t, /20 Okt 2026/); assert.match(t, /Sumber: SK status darurat.*per 2 Nov 2026/);
    assert.equal(await tab.eval("document.querySelectorAll('.op-papan .op-kartu').length"), 2);
    const nomor = await tab.eval("[...document.querySelectorAll('.op-tabel')].pop().querySelectorAll('tbody tr')").then(() => tab.eval("[...[...document.querySelectorAll('.op-tabel')].pop().querySelectorAll('tbody tr')].map(r => r.cells[3].innerText)"));
    assert.deepEqual(nomor, ["200/2026", "300/2026", "100/2026"], "perlu cek dulu, lalu sisa hari terkecil");
    assert.equal(await tab.eval("[...document.querySelectorAll('.op-tabel tr.op-basi-baris')].length"), 2);
    assert.equal(await tab.eval("[...document.querySelectorAll('.op-tabel th')].every(th => getComputedStyle(th).textAlign === 'center')"), true);
    assert.equal(await tab.eval("!!document.querySelector('.op-tak-cetak [data-dummy=isi]') || !!document.querySelector('[data-dummy=isi]')"), true);
    await bersih("sk"); await tanpaGulir("sk");
  });

  test("Berantai: urut sisa_jam bukan lift, jendela 3 hari, lift dan ci95, 'bukan ramalan' terlihat, dummy bertanda", async () => {
    S.log.length = 0; await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"}); await pilihTab("berantai");
    assert.deepEqual(await tab.eval("[...document.querySelectorAll('.op-kartu[data-kab]')].map(k => k.dataset.kab)"), ["Cilacap", "Banjarnegara", "Agam"], "urut sisa jam: 5, 20, 40; urut lift akan terbalik");
    const t = await tab.teks(); assert.match(t, /jendela 3 hari/); assert.match(t, /Pola deskriptif, bukan ramalan\./); assert.match(t, /lift 1,4 kali, ci95 1,3 sampai 1,5, n 9\.831/); assert.match(t, /lift 2,1 kali, ci95 2 sampai 2,3/);
    assert.match(t, /5 jam lagi/); assert.match(t, /Longsor susulan/); assert.match(t, /bukan menurut besar lift/); assert.match(t, /DATA DUMMY/); assert.match(t, /Sumber: pola susulan.*per \d+ \w+ 2026/); assert.match(t, /Selang tanpa koreksi perbandingan berganda/); assert.equal(await tab.eval("document.querySelector('.op-kaki[title]').title.length > 0"), true);
    assert.ok(S.log.some(x => x.p === "/api/pusdalops/berantai" && x.q === "?aktif=1"));
    assert.equal(await tab.eval("(() => { const e = document.querySelector('.op-pola'); const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()"), true, "teks bukan ramalan terlihat");
    await isi_filter("13"); await tab.tungguFungsi("!document.querySelector('.op-isi').hasAttribute('aria-busy')");
    assert.ok(S.log.some(x => x.p === "/api/pusdalops/berantai" && x.q === "?aktif=1&prov=13"), "filter provinsi lewat parameter prov");
    await bersih("berantai"); await tanpaGulir("berantai");
  });

  test("Medsos: jeda median per bulan, antrean, tolak/tautkan/buat terkirim sesuai klik, tambah butir, galat server tampil", async () => {
    await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"}); await pilihTab("medsos"); S.log.length = 0; tab.kosongkanGalat();
    let t = await tab.teks(); assert.match(t, /Median 45 menit/); assert.match(t, /5 butir ditautkan/); assert.match(t, /1 logbook lebih dulu/); assert.match(t, /Okt 2026/); assert.match(t, /2,2 jam/); assert.match(t, /Video banjir/); assert.match(t, /2 butir menunggu/);
    assert.equal(await tab.eval("document.querySelector('a[href=\"https://contoh.invalid/p/1\"]').rel"), "noopener noreferrer");
    /* tolak dari tombol baris */
    S.log.length = 0; await tab.klik("[data-butir='" + "1a".repeat(8) + "'][data-aksi-v=tolak]");
    assert.equal(await tab.eval("document.querySelector('[data-form=medsos-verif]').open"), true);
    await tab.eval("(() => { const e = document.querySelector('[data-form=medsos-verif] input[name=catatan]'); e.value = 'ab'; })()");
    await tab.klik("[data-form=medsos-verif] button[type=submit]"); await tab.tungguFungsi("/minimal 3/.test(document.body.innerText)");
    assert.equal(S.log.filter(x => x.p === "/api/pusdalops/medsos/verifikasi").length, 0, "catatan 2 huruf tidak terkirim");
    await tab.eval("document.querySelector('[data-form=medsos-verif] input[name=catatan]').value = 'Bukan kejadian nyata'");
    S.verif409 = true; await tab.klik("[data-form=medsos-verif] button[type=submit]"); await tab.tungguFungsi("/butir sudah diverifikasi/.test(document.body.innerText)"); S.verif409 = false; tab.kosongkanGalat();   // 409 tiruan dicatat konsol peramban sebagai galat jaringan, sengaja
    let v = S.log.filter(x => x.p === "/api/pusdalops/medsos/verifikasi").pop(); assert.deepEqual(v.body, {id: "1a".repeat(8), aksi: "tolak", catatan: "Bukan kejadian nyata"});
    await tab.klik("[data-form=medsos-verif] button[type=submit]"); await tab.tungguFungsi("!document.querySelector('.op-isi').hasAttribute('aria-busy') && /Butir ditolak/.test(document.body.innerText)");
    /* tautkan: kejadian terbuka kab itu dari logbook/buka */
    S.log.length = 0; await tab.klik("[data-butir='" + "1a".repeat(8) + "'][data-aksi-v=tautkan]");
    await tab.tungguFungsi("document.querySelector('[data-form=medsos-verif] select[name=kejadian_id]').options.length === 2");
    assert.match(S.log.find(x => x.p === "/api/logbook/buka").q, /kab=33%7CCilacap/);
    await tab.eval("(() => { const e = document.querySelector('[data-form=medsos-verif] select[name=kejadian_id]'); e.value = e.options[1].value; })()");
    const nBuka = S.log.filter(x => x.p === "/api/logbook/buka").length; await tab.eval("document.querySelector('[data-form=medsos-verif] select[name=kejadian_id]').dispatchEvent(new Event('change', {bubbles: true}))");
    assert.equal(await tab.eval("document.querySelector('[data-form=medsos-verif] select[name=kejadian_id]').value"), "ef".repeat(8), "change select tidak mengosongkan pilihan"); assert.equal(S.log.filter(x => x.p === "/api/logbook/buka").length, nBuka, "tidak fetch ulang");
    await tab.klik("[data-form=medsos-verif] button[type=submit]"); await tab.tungguFungsi("/ditautkan ke kejadian/.test(document.body.innerText)");
    v = S.log.filter(x => x.p === "/api/pusdalops/medsos/verifikasi").pop(); assert.deepEqual(v.body, {id: "1a".repeat(8), aksi: "tautkan", kejadian_id: "ef".repeat(8)});
    /* butir hanya provinsi: tautkan menjelaskan, buat meminta jenis */
    await tab.klik("[data-butir='" + "2b".repeat(8) + "'][data-aksi-v=tautkan]"); await tab.tungguFungsi("/hanya punya provinsi/.test(document.body.innerText)");
    await tab.klik("[data-butir='" + "2b".repeat(8) + "'][data-aksi-v=buat]"); await tab.klik("[data-form=medsos-verif] button[type=submit]"); await tab.tungguFungsi("/Pilih jenis kejadian/.test(document.body.innerText)");
    await tab.eval("(() => { const e = document.querySelector('[data-form=medsos-verif] select[name=jenis]'); e.value = 'karhutla'; })()");
    S.log.length = 0; await tab.klik("[data-form=medsos-verif] button[type=submit]"); await tab.tungguFungsi("/Kejadian dibuat dari butir/.test(document.body.innerText)");
    v = S.log.filter(x => x.p === "/api/pusdalops/medsos/verifikasi").pop(); assert.deepEqual(v.body, {id: "2b".repeat(8), aksi: "buat", kejadian: {jenis: "karhutla"}});
    /* tambah butir */
    await tab.eval(`(() => { const d = [...document.querySelectorAll('details.bn-blok')].find(x => /Tambah butir/.test(x.innerText)); d.open = true; d.dataset.ts = 'ya'; })()`);
    const ts = "details[data-ts=ya]";
    await tab.klik(`${ts} button[type=submit]`); await tab.tungguFungsi("/Tautan harus diawali https/.test(document.body.innerText)");
    await tab.eval(`(() => { const d = document.querySelector('${ts}'); d.querySelector('[name=tautan]').value = 'https://contoh.invalid/p/9'; d.querySelector('[name=judul]').value = 'Unggahan banjir bandang'; const sp = d.querySelector('select[name=prov]'); sp.value = '33'; sp.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    S.log.length = 0; await tab.klik(`${ts} button[type=submit]`); await tab.tungguFungsi("/Butir masuk antrean/.test(document.body.innerText)");
    v = S.log.find(x => x.m === "POST" && x.p === "/api/pusdalops/medsos"); assert.deepEqual(v.body, {sumber: "medsos", tautan: "https://contoh.invalid/p/9", judul: "Unggahan banjir bandang", prov: "33"});
    await bersih("medsos"); await tanpaGulir("medsos");
  });

  test("tab baru: tabel belum ada (503) memberi pesan umum, bukan layar kosong atau nomor migrasi", async () => {
    S.g3_503 = true; await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"}); await pilihTab("berantai");
    assert.match(await tab.teks(), /Data belum tersedia\. Hubungi admin\./); assert.doesNotMatch(await tab.teks(), /migrasi|0098/i); S.g3_503 = false;
  });

  test("dummy: isi memakai rute sesuai tab SK, Berantai, Medsos", async () => {
    await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"}); await tab.tunggu("[data-dummy=isi]");
    for (const [k, rute] of [["sk", "/api/logbook/dummy"], ["berantai", "/api/pusdalops/berantai/dummy"], ["medsos", "/api/pusdalops/medsos/dummy"]]) {
      await pilihTab(k); S.log.length = 0; await tab.klik("[data-dummy=isi]"); await tab.tungguFungsi("!document.querySelector('.op-isi').hasAttribute('aria-busy')", 15000); await new Promise(r => setTimeout(r, 300));
      assert.deepEqual(S.log.filter(x => x.m === "POST").map(x => x.p), [rute], k);
    }
  });

  test("klik tab langsung mengecat chrome (INP): aria-selected berubah sebelum data datang", async () => {
    await tab.buka(base + "/bnpb/operasi.html", {tunggu: ".op-tabel"});
    const r = await tab.eval(`(() => { const b = document.querySelector('[data-tab=lapsus]'); b.click(); return [b.getAttribute('aria-selected'), document.querySelector('.op-isi').hasAttribute('aria-busy')]; })()`);
    assert.deepEqual(r, ["true", true]);
  });
}
