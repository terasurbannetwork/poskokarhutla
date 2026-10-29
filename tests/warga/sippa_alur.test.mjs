/* SIPPA alur lintas-tabel (RENCANA-UJI §2.5), langkah 11 sampai 14 (keputusan 56, SP-096): kit sampai servis dan stok tercatat ujung ke ujung.
   Worker utuh di workerd + D1 + R2 sungguhan, migrasi apa adanya (TEST.md: tanpa mock). Langkah 1 sampai 10 milik SP-054; di sini langkah 1 sampai 3
   hanya prasyarat yang disingkat (kit, tugas, satu log berjam pompa), supaya langkah 11 sampai 14 punya keadaan awal nyata.
   Tiap langkah berantai: gagal di satu langkah menghentikan sisanya. Pesan gagal menyebut langkah, harapan, didapat, tabel asal.
   Jalankan: node --test tests/warga/sippa_alur.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, MOD2} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {jadwal, laikGelar, kelasDari, KELAS_ASET} from "../../public/pipa/pelihara.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1"}, uji = berantai();
const U = await siapkan("uji-sippa-alur", {r2: true}), {mf, DB, api} = U;
const sip = (m, j, b, h) => api(m, "/api/sippa" + j, b, h);
const hitung = async (tabel, where = "1", ...p) => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).bind(...p).first()).n;
const uuid = () => crypto.randomUUID();
let ip = 0;
const bikin = async peran => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1981${++ip}0012005`, unit: "Pusdalops BNPB", email: `al${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie, ...PB}};
};
const pus = await bikin(["pusdalops"]), pim = await bikin(["pimpinan"]);
const T0 = Date.now() - 6 * JAM;
const kirim = (kode, b) => sip("POST", "/lapangan/kirim", {jam_kirim: Date.now(), log: [], probe: [], bbm: [], gerak: [], inspeksi: [], ...b}, {"x-kode": kode});
const logB = (o = {}) => ({id: uuid(), jenis: "karhutla", kelas_medan: "II", petak_id: "PETAK-1", panjang_m: 400, n_orang: 12, t_tiba: T0, t_mulai_gelar: T0 + 60e3, t_air_mengalir: T0 + JAM, t_selesai: T0 + 4 * JAM, jam_pompa: 3, waktu_klien: Date.now() - 1000, ...o});
const pelihara = async (h = pus.h) => { const r = await sip("GET", "/pelihara", undefined, h); assert.equal(r.s, 200, r.t); return r.j; };
const tgl = ms => new Date(ms).toISOString().slice(0, 10);
const csvPelihara = async () => (await (await mf.dispatchFetch("http://bnpb.lokal/api/sippa/pelihara.csv", {headers: pus.h})).text()).split("\n").map(b => b.split(","));

let KIT, KODE, POMPA;
uji("prasyarat (langkah 1 sampai 3 disingkat): kit SIPPA-001 dari templat BOM, tugas, satu log gelar berjam pompa", async () => {
  const k = await sip("POST", "/kit", {kode: "SIPPA-001", jenis: "gambut", templat: "gambut", prov: "62", kab: "Kota Palangka Raya", lokasi: "Gudang Palangka"}, MOD2); assert.equal(k.s, 201, `kit dibuat: ${k.t} (sippa_kit)`); KIT = k.j.kit.id;
  const t = await sip("POST", "/tugas", {kit_id: KIT, nama_regu: "Regu Alur", unsur: "manggala_agni", prov: "62", kab: "Kota Palangka Raya", berlaku_hari: 7}, pus.h); assert.equal(t.s, 201, `tugas: ${t.t} (sippa_tugas)`); KODE = t.j.kode;
  const l = await kirim(KODE, {log: [logB()]}); assert.equal(l.s, 200, l.t); assert.equal(l.j.diterima.length, 1, `log diterima: ${l.t} (sippa_log_gelar)`);
  POMPA = (await DB.prepare("SELECT id, kondisi FROM sippa_komponen WHERE kit_id = ? AND kode_bom = 'P-101'").bind(KIT).first());
  assert.equal(POMPA.kondisi, "baik", "komponen pompa P-101 awal baik (sippa_komponen)");
  const d = await pelihara(); assert.ok(d.jam_sejak_servis[KIT] > 0, `jam pompa sejak servis > 0 sebelum servis, didapat ${d.jam_sejak_servis[KIT]} (sippa_log_gelar)`);
});
uji("langkah 11: operator kirim inspeksi pasca_gelar komponen pompa skor 2 lewat lapangan/kirim; kondisi = rusak_berat; kit tidak laik gelar", async () => {
  const b = {id: uuid(), sasaran_jenis: "komponen", sasaran_id: POMPA.id, jenis: "pasca_gelar", skor: 2, temuan: "Impeller aus", waktu_klien: Date.now() - 1000};
  const r = await kirim(KODE, {inspeksi: [b]}); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.diterima, [b.id], `butir inspeksi diterima, didapat ${r.t} (sippa_inspeksi)`);
  const k = await DB.prepare("SELECT kondisi FROM sippa_komponen WHERE id = ?").bind(POMPA.id).first(); assert.equal(k.kondisi, "rusak_berat", `langkah 11: kondisi harapan rusak_berat, didapat ${k.kondisi} (sippa_komponen, trigger sippa_insp_komp_terapkan)`);
  const d = await pelihara(), laik = laikGelar(d.komponen.filter(c => c.kit_id === KIT), []);
  assert.equal(laik.laik, false, `langkah 11: laikGelar harapan tidak laik, didapat ${JSON.stringify(laik)}`); assert.match(laik.alasan.join(";"), /P-101.*rusak berat/);
  assert.equal((await kirim(KODE, {inspeksi: [b]})).j.ganda[0], b.id, "kirim ulang = ganda (sippa_inspeksi satu baris)"); assert.equal(await hitung("sippa_inspeksi", "id = ?", b.id), 1);
  /* dilanggar: operator tidak boleh jenis servis; skor 4 ditolak; kondisi tidak berubah */
  const salah = await kirim(KODE, {inspeksi: [{...b, id: uuid(), jenis: "servis", skor: 0}, {...b, id: uuid(), skor: 4}]}); assert.equal(salah.j.diterima.length, 0, `langkah 11 dilanggar: harapan nol diterima, didapat ${salah.t}`); assert.equal(salah.j.ditolak.length, 2);
  assert.equal((await DB.prepare("SELECT kondisi FROM sippa_komponen WHERE id = ?").bind(POMPA.id).first()).kondisi, "rusak_berat", "butir tertolak tidak mengubah kondisi");
});
uji("langkah 12: kit ke servis (gerak servis); staf catat inspeksi servis skor 0 dengan jam operasi; kondisi kembali baik; jam_sejak_servis = 0", async () => {
  const g = await sip("POST", "/gerak/" + KIT, {alasan: "servis", ke_status: "servis"}, pus.h); assert.equal(g.s, 201, `gerak servis: ${g.t} (sippa_gerak)`);
  assert.equal((await DB.prepare("SELECT status FROM sippa_kit WHERE id = ?").bind(KIT).first()).status, "servis", "status kit servis (sippa_kit)");
  const sebelum = (await pelihara()).jam_sejak_servis[KIT]; assert.ok(sebelum > 0, `jam sebelum servis > 0, didapat ${sebelum}`);
  assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: POMPA.id, kit_id: KIT, jenis: "servis", skor: 0, jam_operasi: sebelum, tindakan: "ganti"}, pim.h)).s, 403, "pimpinan hanya membaca");
  const i = await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: POMPA.id, kit_id: KIT, jenis: "servis", skor: 0, jam_operasi: sebelum, tindakan: "ganti", temuan: "Impeller diganti"}, pus.h); assert.equal(i.s, 201, `inspeksi servis: ${i.t} (sippa_inspeksi)`);
  const k = await DB.prepare("SELECT kondisi FROM sippa_komponen WHERE id = ?").bind(POMPA.id).first(); assert.equal(k.kondisi, "baik", `langkah 12: kondisi harapan baik, didapat ${k.kondisi} (sippa_komponen)`);
  const d = await pelihara(); assert.equal(d.jam_sejak_servis[KIT], 0, `langkah 12: jam_sejak_servis harapan 0, didapat ${d.jam_sejak_servis[KIT]} (sippa_inspeksi jenis servis memotong sippa_log_gelar)`);
  assert.equal(laikGelar(d.komponen.filter(c => c.kit_id === KIT), []).laik, true, "kit laik gelar lagi");
});
uji("langkah 13: stok terima 10 gasket, pakai 2 untuk kit itu; saldo 8 = SUM(delta); pakai 9 ditolak 409 dan tidak menulis", async () => {
  const s = (b, h = pus.h) => sip("POST", "/stok", {gudang: "Gudang Palangka", kode_bom: "C-101", nama: "Gasket kopling Storz", satuan: "set", ...b}, h);
  const a = await s({delta: 10, alasan: "terima"}); assert.equal(a.s, 201, `terima: ${a.t} (sippa_stok_gerak)`); assert.equal(a.j.stok.saldo, 10);
  const p = await s({delta: -2, alasan: "pakai", kit_id: KIT}); assert.equal(p.s, 201, `pakai: ${p.t}`); assert.equal(p.j.stok.saldo, 8, `langkah 13: saldo harapan 8, didapat ${p.j.stok.saldo}`);
  const jumlah = (await DB.prepare("SELECT sum(delta) n FROM sippa_stok_gerak WHERE gudang = 'Gudang Palangka' AND kode_bom = 'C-101' AND dummy = 0").first()).n; assert.equal(jumlah, 8, `saldo harus sama dengan SUM(delta) di sippa_stok_gerak, didapat ${jumlah}`);
  assert.equal((await DB.prepare("SELECT kit_id FROM sippa_stok_gerak WHERE delta = -2").first()).kit_id, KIT, "pakai tercatat untuk kit itu");
  const n0 = await hitung("sippa_stok_gerak"), x = await s({delta: -9, alasan: "pakai", kit_id: KIT}); assert.equal(x.s, 409, `langkah 13 dilanggar: pakai 9 dari saldo 8 harapan 409, didapat ${x.s} ${x.t}`);
  assert.equal(await hitung("sippa_stok_gerak"), n0, "penolakan tidak menulis baris"); assert.equal((await sip("GET", "/stok", undefined, pus.h)).j.stok.find(r => r.kode_bom === "C-101").saldo, 8, "GET /stok memberi saldo yang sama");
  assert.equal((await s({delta: 1, alasan: "terima"}, pim.h)).s, 403, "pimpinan hanya membaca");
  assert.match(String((await DB.prepare("UPDATE sippa_stok_gerak SET delta = 100").run().then(() => "lolos", e => e.message))), /sippa_stok_tetap/, "buku besar tambah-saja");
});
uji("langkah 14: aset sumur zona rawan; inspeksi serah_terima lalu mutu_air E. coli 0; GET /pelihara dan pelihara.csv memuat butir sumur dengan jatuh tempo sama persis dengan SippaPelihara.jadwal", async () => {
  const a = await sip("POST", "/aset", {kelas: "sumur_bor", nama: "Sumur bor Alur Pahandut", sumber: "badan_geologi", pemilik_aset: "BPBD Kota Palangka Raya", prov: "62", kab: "Kota Palangka Raya", keyakinan: "terverifikasi", atribut: {kedalaman_m: 60, debit_lps: 1.8, zona_konservasi: "rawan"}}, pus.h);
  assert.equal(a.s, 201, `aset: ${a.t} (sippa_aset)`); const aset = a.j.aset; assert.match(aset.kode, /^AS-\d{4}$/);
  assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: aset.id, jenis: "serah_terima", skor: 0, tindakan: "serahkan"}, pus.h)).s, 201, "serah_terima");
  const m = await sip("POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: aset.id, jenis: "mutu_air", skor: 0, hasil: {e_coli_cfu: 0}}, pus.h); assert.equal(m.s, 201, `mutu_air: ${m.t} (sippa_inspeksi)`);
  assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "aset", sasaran_id: aset.id, jenis: "mutu_air", skor: 0}, pus.h)).s, 400, "mutu_air tanpa e_coli_cfu ditolak (CHECK)");
  const d = await pelihara(), ada = d.aset.find(x => x.id === aset.id); assert.ok(ada, "GET /pelihara memuat sumur (sippa_aset)");
  const terakhir = Math.max(...d.inspeksi_terakhir.filter(i => i.sasaran_id === aset.id).map(i => i.waktu)), kini = d.per;
  assert.equal(terakhir, m.j.inspeksi.waktu, "inspeksi terakhir sumur = mutu_air yang baru dicatat");
  const j = jadwal({kelas: KELAS_ASET[ada.kelas]}, terakhir, null, kini); assert.equal(j.kelas, "K7");
  assert.equal(j.status, "aman", `sumur baru diinspeksi harus aman, didapat ${j.status}`);
  const baris = (await csvPelihara()).find(b => b[1] === aset.kode); assert.ok(baris, `pelihara.csv memuat ${aset.kode} (sasaran,kode,kelas,nama,status,jatuh_tempo,alasan)`);
  assert.equal(baris[0], "aset"); assert.equal(baris[2], "K7"); assert.equal(baris[4], j.status, `status CSV ${baris[4]} harus sama dengan jadwal ${j.status}`);
  assert.equal(baris[5], tgl(j.jatuh_tempo), `langkah 14: jatuh_tempo CSV harapan ${tgl(j.jatuh_tempo)} (SippaPelihara.jadwal), didapat ${baris[5]}`);
  /* interval K7 hasil kode: 180 hari (RU §2.5 menulis 30 hari; angka di pelihara.js yang berlaku, dilaporkan sebagai deviasi) */
  assert.equal(Math.round((j.jatuh_tempo - terakhir) / HARI), 180, "interval = konstanta K7 pelihara.js");
  assert.equal(kelasDari("C-101"), "K3"); assert.equal((await sip("POST", "/aset", {kelas: "sumur_bor", nama: "Sumur kritis tanpa rekomendasi", sumber: "bpbd", pemilik_aset: "BPBD Kota", prov: "62", keyakinan: "terverifikasi", atribut: {zona_konservasi: "kritis"}}, pus.h)).s, 400, "sumur kritis tanpa rekomendasi Badan Geologi ditolak");
});
