/* Laphar dan Sitrep dari logbook (public/bnpb/dokumen_laphar.js): fungsi murni + uji balik ke pengurai laphar (public/laporan_urai.js).
   Jalan: node --test tests/bnpb/dokumen_laphar.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/bnpb/dokumen_pusdalops.js";
import "../../public/bnpb/dokumen_laphar.js";
const PROV = {14: "Riau", 33: "Jawa Tengah", 53: "Nusa Tenggara Timur"};
globalThis.Wilayah = {PROV};
const win = {};
new Function("window", readFileSync(new URL("../../public/laporan_urai.js", import.meta.url), "utf8"))(win);   // sama dengan tests/warga/laporan_urai.test.mjs
const U = win.LaporanUrai, L = globalThis.DokumenLaphar, D = globalThis.DokumenPusdalops;
const WIB = (tgl, jam, mnt = 0) => Date.parse(`${tgl}T00:00:00Z`) + ((jam - 7) * 60 + mnt) * 6e4;
const ent = (kid, waktu, o = {}) => ({kejadian_id: kid, waktu, jenis: "longsor", prov: "33", kab: "Banjarnegara", kec: "Pandanarum", desa: "Tulis", status: "buka", dummy: false, ...o});
const JK = {kerugian_juta: 4500.5, korban: {md: {"0-17": {L: 0, P: 1}, "18-59": {L: 1, P: 1}}, mengungsi: {"0-17": {L: 40, P: 38}}}, rentan: {bayi: 6, lansia: 20},
  prasarana: [{kode: "jalan", tingkat: "rb", jumlah: 1.8}, {kode: "sawah", jumlah: 12.5}], kebutuhan_rinci: [{kelompok: "logistik", barang: "Beras", jumlah: 5, satuan: "ton"}], pemberi: ["BPBD Banjarnegara"],
  posko: {ada: true, sk: "360/112/2026", berlaku_mulai: "2026-10-30", berlaku_sampai: "2026-11-13"}};
const E = [
  ent("a1", WIB("2026-10-30", 9), {md: 1, hilang: 4, luka: 3, mengungsi_jiwa: 120, mengungsi_kk: 38, rumah_rb: 3, kendala: ["akses"], kebutuhan: ["tenda"], catatan: "Longsor menimbun 12 rumah"}),
  ent("a1", WIB("2026-10-30", 14, 30), {md: 3, hilang: 2, luka: 6, mengungsi_jiwa: 210, mengungsi_kk: 66, rumah_rb: 5, rumah_rs: 4, kendala: ["akses", "alat_berat"], kebutuhan: ["tenda", "makanan"], catatan: "Pencarian korban dilanjutkan, ekskavator tiba", kib: "3304-101-002", ...JK}),
  ent("k1", WIB("2026-10-30", 10), {jenis: "karhutla", prov: "14", kab: "Rokan Hilir", kec: "", desa: "", luas_ha: 31.4, catatan: "Api di lahan gambut"}),   // 31 ha >= 2 = menonjol
  ent("b1", WIB("2026-10-30", 11), {jenis: "banjir", prov: "33", kab: "Cilacap", md: 0, mengungsi_kk: 2})];                                               // di bawah ambang
const SK = {a1: [{tingkat: "tanggap", wilayah: "prov", nomor: "188/445/2026", tgl_sk: "2026-10-31", tmt_mulai: "2026-10-31", tmt_selesai: "2026-11-14", perpanjangan_ke: 1, tautan: "https://contoh.invalid/sk"},
  {tingkat: "tanggap", wilayah: "kab", nomor: "360/101/2026", tmt_mulai: "2026-10-30", tmt_selesai: "2026-11-05", perpanjangan_ke: 0}]};

test("laphar: hanya menonjol secara bawaan, semua bila diminta; urut provinsi", () => {
  const m = L.laphar(E, "2026-10-30", {sk: SK});
  assert.deepEqual(m.kejadian.map(k => k.jenis), ["karhutla", "longsor"]);          // 14 Riau sebelum 33 Jawa Tengah
  assert.equal(m.total, 3); assert.equal(m.nMenonjol, 2);
  assert.equal(L.laphar(E, "2026-10-30", {semua: true}).kejadian.length, 3);
});

test("laphar: uji balik, teks yang disusun diurai kembali oleh LaporanUrai.urai dengan medan kunci yang sama", () => {
  const m = L.laphar(E, "2026-10-30", {sk: SK}), teks = L.teksLaphar(m, WIB("2026-10-31", 6, 5)), u = U.urai(teks, PROV);
  assert.equal(u.bentuk, "laphar");
  assert.equal(u.tanggal, "2026-10-31"); assert.equal(u.mulai, "2026-10-30"); assert.equal(u.sampai, "2026-10-31"); assert.equal(u.jam, "07.00");
  assert.equal(u.kejadian.length, m.kejadian.length);
  const lg = u.kejadian.find(k => k.jenis === "longsor"), kh = u.kejadian.find(k => k.jenis === "karhutla");
  assert.ok(lg && kh, "jenis kembali sama");
  assert.equal(lg.prov, "33"); assert.equal(kh.prov, "14");
  assert.match(lg.lokasi, /^Banjarnegara, Kec\. Pandanarum, Desa Tulis/); assert.match(kh.lokasi, /^Rokan Hilir/);
  assert.match(lg.korban, /3 meninggal, 2 hilang, 6 luka/); assert.match(lg.korban, /Meninggal menurut umur: 0-17 tahun \(laki-laki 0, perempuan 1\)/);
  assert.match(lg.pengungsi, /210 jiwa \(66 KK\)/); assert.match(lg.kerugian, /5 rumah rusak berat, 4 rumah rusak sedang/); assert.match(lg.kerugian, /Rp4\.500,5 juta/);
  assert.match(lg.kronologi, /09\.00 WIB: Longsor menimbun 12 rumah/); assert.match(lg.kronologi, /14\.30 WIB: Pencarian korban dilanjutkan/);
  assert.match(lg.update, /30 Okt 2026 pukul 14\.30 WIB/);
  assert.match(lg.upaya, /Penanganan oleh BPBD Banjarnegara/); assert.match(lg.upaya, /Posko berdiri, SK 360\/112\/2026/);
  assert.match(lg.pengungsi, /bayi 6 jiwa, lansia 20 jiwa/); assert.match(lg.kerugian, /jalan rusak berat 1,8 km/);
  assert.match(lg.kebutuhan, /tenda, makanan/); assert.match(lg.kebutuhan, /Logistik: Beras 5 ton/); assert.match(lg.kendala, /akses, alat berat/);
  assert.equal(lg.status_penetapan, "Perpanjangan Tanggap Darurat TMT 31 Okt 2026 s.d 14 Nov 2026");
  assert.match(kh.kerugian, /31 ha terbakar/); assert.equal(kh.status_penetapan, "");
  assert.match(lg.kondisi, /masih dalam penanganan/); assert.match(lg.lokasi_rinci, /KIB 3304-101-002/);
  assert.match(teks, /Sumber: logbook Pusdalops \(input piket\), diambil pukul 06\.05 WIB, 31 Okt 2026$/);
  assert.ok(!/ · | — |Pantau Bencana/.test(teks));
});

test("laphar: hari tanpa kejadian dan jenis tanpa kata judul tetap terurai; dummy bertanda", () => {
  const kosong = L.teksLaphar(L.laphar([], "2026-10-30"), WIB("2026-10-31", 6));
  assert.match(kosong, /A\. Kejadian Bencana\nTidak ada kejadian/); assert.equal(U.urai(kosong, PROV).kejadian.length, 0);
  const lain = [ent("w1", WIB("2026-10-30", 9), {jenis: "kecelakaan", dummy: true}), ent("t1", WIB("2026-10-30", 9), {jenis: "gempabumi", prov: "53", kab: "Sumba Barat Daya", md: 2})];
  const m = L.laphar(lain, "2026-10-30", {semua: true}), teks = L.teksLaphar(m), u = U.urai(teks, PROV);
  assert.match(teks, /^\[DATA DUMMY, BUKAN LAPORAN NYATA\]/); assert.equal(u.kejadian.length, 2);
  assert.deepEqual(u.kejadian.map(k => k.jenis).sort(), ["gempabumi", "lainnya"]); assert.equal(u.kejadian.find(k => k.jenis === "gempabumi").prov, "53");
});

test("laphar: catatan beraroma label atau butir tidak merusak uraian", () => {
  const e = [ent("z", WIB("2026-10-30", 9), {md: 2, catatan: "➢ Korban Jiwa: 99\n1. Banjir di Kab. X, Provinsi Riau  \n​sisa"})];
  const u = U.urai(L.teksLaphar(L.laphar(e, "2026-10-30", {semua: true})), PROV);
  assert.equal(u.kejadian.length, 1); assert.match(u.kejadian[0].korban, /^2 meninggal/); assert.ok(!/99/.test(u.kejadian[0].korban));
});

test("sitrep: kronologi semua entri, dampak terkini, SK, posko; kandidat besar", () => {
  const kand = L.kandidatSitrep(E, "2026-10-30");
  assert.deepEqual(kand.map(k => k.id), ["a1", "k1"]);                               // banjir b1 di bawah ambang tidak ditawarkan
  const s = L.sitrep(E, "a1", "2026-10-30", SK.a1);
  assert.equal(s.nEntri, 2); assert.equal(s.kronologi.length, 2); assert.equal(s.kronologi[0].waktu, "30 Okt 2026 pukul 09.00 WIB");
  assert.equal(s.dampak[0][1][0], "3 meninggal, 2 hilang, 6 luka"); assert.equal(s.sk.length, 2); assert.equal(s.sk[0][2], "188/445/2026");
  assert.match(s.posko, /Posko berdiri, SK 360\/112\/2026/); assert.equal(s.kib, "3304-101-002");
  assert.equal(L.sitrep(E, "a1", "2026-10-29", []), null, "belum ada entri sebelum tanggal itu");
  const t = L.teksSitrep(s, WIB("2026-10-31", 6, 5));
  assert.match(t, /\*SITUASI TERKINI: LONGSOR|\*SITUASI TERKINI: TANAH LONGSOR/); assert.match(t, /Data dilaporkan sampai 30 Okt 2026 pukul 14\.30 WIB/);
  assert.match(t, /Perpanjangan|ke-1/); assert.match(t, /Sumber: logbook Pusdalops/); assert.ok(!/undefined|null|\[object/.test(t));
});

test("sitrep: gunung api dari status PVMBG dan gempa dari katalog M5+", () => {
  const status = JSON.parse(readFileSync(new URL("../../public/banjir/data/gunungapi_status.json", import.meta.url)));
  const ga = [ent("g1", WIB("2026-10-30", 8), {jenis: "gunungapi", prov: "53", kab: "Flores Timur", kec: "Wulanggitang", desa: "", mengungsi_jiwa: 3200, catatan: "Erupsi Lewotobi Laki-laki, kolom abu 2.000 m"})];
  const kej = D.kelompokKejadian(ga).get("g1"), kg = L.kandidatGunung(kej, status);
  assert.equal(kg[0].nama, "Lewotobi Laki-laki", "disebut di catatan, didahulukan");
  assert.ok(kg.every(x => /Nusa Tenggara Timur/.test(x.prov)) && kg.length >= 3, "sisanya gunung serumpun provinsi");
  const s = L.sitrep(ga, "g1", "2026-10-30", [], {gunung: kg[0], data: status});
  assert.match(s.gunung.periode, /00\.00-24\.00/); assert.match(s.gunung.penduduk, /^[\d.]+ jiwa/); assert.match(s.gunung.level, /^Level (II|III|IV)|^Level I /); assert.match(s.gunung.radius, /km$/);
  const t = L.teksSitrep(s); assert.match(t, /\*Data PVMBG: Gunung Lewotobi Laki-laki\*/); assert.match(t, /Sumber: MAGMA Indonesia/);
  const lap = {dibuat: "2026-11-01T09:17+07:00", tambahan: [{id: "m5", baris: [["29 Okt 02.56 WIB", 5.3, 35, "laut dekat Sumba Barat Daya, Nusa Tenggara Timur"], ["30 Okt 03.32 WIB", 5, 10, "laut dekat Seram Bagian Timur, Maluku"]]}]};
  const gm = [ent("q1", WIB("2026-10-30", 8), {jenis: "gempabumi", prov: "53", kab: "Sumba Barat Daya", md: 1})], kq = D.kelompokKejadian(gm).get("q1");
  const rows = L.kandidatGempa(kq, lap); assert.equal(rows.length, 1); assert.equal(rows[0].magnitudo, 5.3);
  const sg = L.sitrep(gm, "q1", "2026-10-30", [], {gempa: rows, gempaPer: L.perGempa(lap)}); assert.match(L.teksSitrep(sg), /arsip Centurisk97, per 1 Nov 2026/); assert.match(L.teksSitrep(sg), /- 29 Okt 2026 02\.56 WIB: M 5,3, kedalaman 35 km, laut dekat Sumba Barat Daya/);
  assert.deepEqual(L.kandidatGempa(kq, {}), []);
});
