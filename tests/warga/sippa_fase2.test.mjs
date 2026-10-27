/* SIPPA fase 2 sisi server (keputusan 61; SP-120 sampai SP-131; migrasi 0070). Worker utuh di workerd + D1 + R2 sungguhan, semua migrasi apa adanya (TEST.md: tanpa mock).
   Jalankan: node --test tests/warga/sippa_fase2.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {siapkan, berantai, ADMIN, MOD2} from "./_bnpb.mjs";
import "../../src/worker.js";
import {hitungDebit} from "../../src/sippa_lapangan.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1"}, uji = berantai();
const U = await siapkan("uji-sippa-fase2", {r2: true}), {mf, DB, api} = U;
const sip = (m, j, b, h) => api(m, "/api/sippa" + j, b, h);
const uuid = () => crypto.randomUUID();
let ip = 0;
const bikin = async (peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1981${++ip}0012005`, unit: "Pusdalops BNPB", email: `f2${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie, ...PB}};
};
const pus = await bikin(["pusdalops"]), pim = await bikin(["pimpinan"]), pus61 = await bikin(["pusdalops"], ["61"]), ver = await bikin(["verifikator"]);
const kirim = (kode, b) => sip("POST", "/lapangan/kirim", {jam_kirim: Date.now(), ...b}, {"x-kode": kode});
const lap = (kode, jenis, b) => kirim(kode, {[jenis]: [b]});
const n = async (tabel, w = "1", ...p) => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${w}`).bind(...p).first()).n;
const kini = () => Date.now();
const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi];
const JPEG = new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...new TextEncoder().encode("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(300).fill(7), 0xff, 0xd9]);
const foto = async (kode, medan) => {
  const f = new FormData(); f.append("berkas", new File([JPEG], "x.jpg", {type: "image/jpeg"})); for (const [k, v] of Object.entries(medan)) f.append(k, v);
  const rq = new Request("http://x/", {method: "POST", body: f}), buf = await rq.arrayBuffer();
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/sippa/lapangan/foto", {method: "POST", body: buf, headers: {"content-type": rq.headers.get("content-type"), "content-length": String(buf.byteLength), "x-kode": kode}});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return {s: r.status, j, t};
};

let KIT, KODE, TUGAS, KODE61, TUGAS61, KOMP;
uji("prasyarat: kit dengan komponen, tugas provinsi 62 (kompleks K0129) dan tugas provinsi 61", async () => {
  const k = await sip("POST", "/kit", {kode: "SIPPA-001", jenis: "gambut", templat: "gambut", prov: "62", kab: "Kota Palangka Raya", lokasi: "Gudang"}, MOD2); assert.equal(k.s, 201, k.t); KIT = k.j.kit.id;
  const t = await sip("POST", "/tugas", {kit_id: KIT, nama_regu: "Regu F2", unsur: "manggala_agni", prov: "62", kab: "Kota Palangka Raya", kompleks_id: "K0129", berlaku_hari: 7}, pus.h); assert.equal(t.s, 201, t.t); KODE = t.j.kode; TUGAS = t.j.tugas.id;
  const t2 = await sip("POST", "/tugas", {nama_regu: "Regu 61", unsur: "bpbd", prov: "61", kab: "Pontianak", kompleks_id: "K0500", berlaku_hari: 7}, pus.h); assert.equal(t2.s, 201, t2.t); KODE61 = t2.j.kode; TUGAS61 = t2.j.tugas.id;
  KOMP = (await DB.prepare("SELECT id, kode_bom FROM sippa_komponen WHERE kit_id = ?").bind(KIT).all()).results;
  assert.ok(KOMP.find(c => c.kode_bom === "P-101"));
});

uji("SP-120/125/126/128: periksa, tekanan, jejak, bor lolos; data tersimpan hanya medan dikenal; kirim ulang = ganda; prov dan kompleks dari tugas bukan klien", async () => {
  const w = kini() - 1000, a = uuid(), b = uuid(), c = uuid(), d = uuid();
  const r = await kirim(KODE, {
    periksa: [{id: a, langkah: "pompa_dicek", waktu: w, petak_id: "PETAK-1", prov: "11", tambahan: "x"}],
    tekanan: [{id: b, titik: "lance", bar: 1.7, waktu: w}],
    jejak: [{id: c, titik: [[-2.1, 113.5, w - 5000], [-2.101, 113.501, w]], moda: "jalan_kaki"}],
    bor: [{id: d, lat: -2.2, lon: 113.6, kedalaman_cm: 320.5, waktu: w, catatan: "gambut dalam"}]});
  assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.ditolak, [], r.t); assert.equal(r.j.diterima.length, 4);
  const p = await DB.prepare("SELECT * FROM sippa_lapangan WHERE id = ?").bind(a).first();
  assert.equal(p.prov, "62", "prov dari tugas"); assert.equal(p.kompleks_id, "K0129"); assert.equal(p.kit_id, KIT); assert.equal(p.tugas_id, TUGAS); assert.equal(p.waktu, w);
  assert.deepEqual(JSON.parse(p.data), {langkah: "pompa_dicek", waktu: w, petak_id: "PETAK-1"}, "medan asing dibuang");
  assert.equal((await lap(KODE, "periksa", {id: a, langkah: "pompa_dicek", waktu: w})).j.ganda[0], a);
  assert.equal(await n("sippa_lapangan", "id = ?", a), 1);
  const g = await DB.prepare("SELECT data, waktu FROM sippa_lapangan WHERE id = ?").bind(c).first(); assert.equal(g.waktu, w, "waktu jejak = titik terakhir"); assert.equal(JSON.parse(g.data).titik.length, 2);
});
uji("validasi per jenis: batas dan enum ditolak dengan alasan, tidak menulis", async () => {
  const w = kini(), x = (jenis, b, re) => lap(KODE, jenis, {id: uuid(), waktu: w, ...b}).then(r => { assert.equal(r.s, 200); assert.equal(r.j.diterima.length, 0, `${jenis} ${JSON.stringify(b)} harus ditolak: ${r.t}`); assert.match(r.j.ditolak[0].alasan, re); });
  const n0 = await n("sippa_lapangan");
  await x("periksa", {langkah: "A"}, /langkah/); await x("periksa", {langkah: "x"}, /langkah/); await x("periksa", {langkah: "a".repeat(41)}, /langkah/); await x("periksa", {langkah: "ok_ok", petak_id: "a/b"}, /petak_id/);
  await x("tekanan", {titik: "pipa", bar: 1}, /titik/); await x("tekanan", {titik: "lance", bar: 25.1}, /bar/); await x("tekanan", {titik: "lance", bar: -1}, /bar/);
  await x("jejak", {titik: [[-2, 113, w]], moda: "perahu"}, /titik/); await x("jejak", {titik: [[-2, 113, w], [-2, 113, w]], moda: "terbang"}, /moda/);
  await x("jejak", {titik: Array(501).fill([-2, 113, w]), moda: "perahu"}, /titik/); await x("jejak", {titik: [[-2, 113, w], [50, 113, w]], moda: "perahu"}, /titik/);
  await x("bor", {lat: -2, lon: 113, kedalaman_cm: 1501}, /kedalaman/); await x("bor", {lat: 0, lon: 0, kedalaman_cm: 10}, /lat dan lon/); await x("bor", {lat: -2, lon: 113, kedalaman_cm: 10, catatan: "c".repeat(201)}, /catatan/);
  await x("sos", {lat: -2, lon: 113, pesan: "p".repeat(201)}, /pesan/); await x("sos", {lat: 99, lon: 113}, /lat dan lon/);
  await x("selesai", {alat_kembali: ["abc"], alat_hilang: []}, /kode_bom/); await x("selesai", {alat_kembali: [], alat_hilang: [], catatan: "c".repeat(501)}, /catatan/);
  await x("debit", {metode: "pelampung", lat: -2, lon: 113, lebar_m: 2, dalam_m: 1}, /pelampung wajib/); await x("debit", {metode: "ember", lat: -2, lon: 113, volume_l: 10}, /ember wajib/); await x("debit", {metode: "cebok", lat: -2, lon: 113}, /metode/);
  assert.equal(await n("sippa_lapangan"), n0);
  assert.equal([..."😀".repeat(200)].length, 200); const e = await lap(KODE, "sos", {id: uuid(), waktu: w, lat: -2, lon: 113, pesan: "😀".repeat(200)}); assert.equal(e.j.diterima.length, 1, "200 titik kode emoji lolos (SQLite length() sama)");
  const j = await lap(KODE, "jejak", {id: uuid(), titik: Array(500).fill(0).map((_, i) => [-2.1 + i * 1e-5, 113.5, w - 500 + i]), moda: "kendaraan"}); assert.equal(j.j.diterima.length, 1, j.t);
});
uji("jam perangkat meleset: waktu di luar rentang diganti jam server (SOS tidak hilang)", async () => {
  const t0 = kini(), r = await lap(KODE, "sos", {id: uuid(), waktu: t0 + 5 * HARI, lat: -2, lon: 113}); assert.equal(r.j.diterima.length, 1, r.t);
  const row = await DB.prepare("SELECT waktu FROM sippa_lapangan WHERE id = ?").bind(r.j.diterima[0]).first(); assert.ok(Math.abs(row.waktu - t0) < 60e3);
});

uji("SP-129 debit: server menghitung debit_lps; pelampung dan ember", async () => {
  const w = kini(), p = uuid(), e = uuid();
  const r = await kirim(KODE, {debit: [{id: p, metode: "pelampung", lat: -2, lon: 113, waktu: w, lebar_m: 3, dalam_m: 0.5, kecepatan_ms: 0.4, debit_lps: 99999}, {id: e, metode: "ember", lat: -2, lon: 113, waktu: w, volume_l: 12, detik: 8}]});
  assert.equal(r.j.diterima.length, 2, r.t);
  const dp = JSON.parse((await DB.prepare("SELECT data FROM sippa_lapangan WHERE id = ?").bind(p).first()).data), de = JSON.parse((await DB.prepare("SELECT data FROM sippa_lapangan WHERE id = ?").bind(e).first()).data);
  assert.equal(dp.debit_lps, 510, "3 x 0,5 x 0,4 x 0,85 x 1000 = 510 (nilai klien diabaikan)"); assert.equal(de.debit_lps, 1.5); assert.equal(hitungDebit({metode: "ember", volume_l: 12, detik: 8}), 1.5);
  assert.equal(dp.volume_l, undefined, "medan metode lain tidak disimpan");
});

uji("SP-121 foto bertahap: tahap dan GPS wajib berpasangan, tahap enum, tanpa tahap tetap sah (lama), tahap tersimpan ber-GPS", async () => {
  assert.equal((await foto(KODE, {tahap: "tiba"})).s, 400, "tahap tanpa lat/lon"); assert.equal((await foto(KODE, {tahap: "ngopi", lat: "-2.1", lon: "113.5"})).s, 400);
  assert.equal((await foto(KODE, {tahap: "tiba", lat: "0", lon: "0"})).s, 400, "titik di luar Indonesia"); assert.equal((await foto(KODE, {tahap: "tiba", lat: "abc", lon: "113.5"})).s, 400);
  assert.equal(await n("sippa_foto"), 0, "penolakan tidak menulis foto"); assert.equal((await mf.getR2Bucket("MEDIA").then(b => b.list())).objects.length, 0, "dan tidak menyisakan berkas R2");
  const ok = await foto(KODE, {tahap: "injeksi", lat: "-2.1234", lon: "113.5678"}); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.tahap, "injeksi");
  const row = await DB.prepare("SELECT * FROM sippa_lapangan WHERE id = ?").bind(ok.j.foto_id).first(); assert.equal(row.jenis, "foto"); assert.equal(row.prov, "62");
  assert.deepEqual({...JSON.parse(row.data), waktu: 0}, {foto_id: ok.j.foto_id, tahap: "injeksi", lat: -2.1234, lon: 113.5678, waktu: 0});
  const lama = await foto(KODE, {}); assert.equal(lama.s, 201, lama.t); assert.equal(lama.j.tahap, undefined); assert.equal(await n("sippa_lapangan", "id = ?", lama.j.foto_id), 0);
  for (const th of ["tiba", "pompa", "gelar", "selesai"]) assert.equal((await foto(KODE, {tahap: th, lat: "-2.1", lon: "113.5"})).s, 201, th);
});

uji("SP-123 SOS: disimpan dan jadi butir Meja Pantau prioritas 1 untuk provinsi tugas; staf provinsi lain dan peran lain tidak melihat", async () => {
  const id = uuid(), r = await lap(KODE, "sos", {id, waktu: kini(), lat: -2.15, lon: 113.55, pesan: "api mendekat"}); assert.equal(r.j.diterima[0], id, r.t);
  const butir = async h => (await api("GET", "/api/pantau", undefined, h)).j.butir.filter(b => b.jenis === "sippa_sos");
  const semua = await butir(pus.h), b = semua.filter(x => x.id === `sippa-sos:${id}`); assert.equal(b.length, 1, "satu butir per SOS (tiga SOS di berkas ini)"); assert.equal(semua.length, 3); assert.equal(b[0].prioritas, 1); assert.equal(b[0].tautan, "/pipa/peta"); assert.equal(b[0].prov, "62"); assert.match(b[0].judul, /^SOS dari regu Regu F2 \(K0129\)$/); assert.match(b[0].rincian, /-2.15, 113.55\. api mendekat/);
  assert.equal((await butir(pus61.h)).length, 0, "wilayah 61 tidak melihat 62"); assert.equal((await butir(ver.h)).length, 0, "verifikator bukan penangan");
  await lap(KODE61, "sos", {id: uuid(), waktu: kini(), lat: 0.0, lon: 109.3}); assert.equal((await butir(pus61.h)).length, 1, "SOS provinsi 61 untuk staf 61");
});

uji("SP-127 selesai: disimpan, butir Meja Pantau, alat_hilang menandai komponen kit hilang (kode asing diabaikan); kirim ulang tidak menggandakan", async () => {
  const id = uuid(), w = kini();
  const r = await lap(KODE, "selesai", {id, waktu: w, alat_kembali: ["P-101", "H-101"], alat_hilang: ["I-101", "ZZ-999"], catatan: "satu lance hilang"}); assert.equal(r.j.diterima[0], id, r.t);
  const hil = (await DB.prepare("SELECT kode_bom, kondisi FROM sippa_komponen WHERE kit_id = ? AND kondisi = 'hilang'").bind(KIT).all()).results; assert.deepEqual(hil.map(x => x.kode_bom), ["I-101"]);
  assert.equal((await DB.prepare("SELECT kondisi FROM sippa_komponen WHERE kit_id = ? AND kode_bom = 'P-101'").bind(KIT).first()).kondisi, "baik");
  const b = (await api("GET", "/api/pantau", undefined, pus.h)).j.butir.filter(x => x.jenis === "sippa_selesai"); assert.equal(b.length, 1); assert.equal(b[0].judul, "Gelar selesai di K0129, 2 alat kembali, 2 hilang"); assert.equal(b[0].prioritas, 2);
  assert.equal((await lap(KODE, "selesai", {id, waktu: w, alat_kembali: [], alat_hilang: []})).j.ganda[0], id);
  const k = await lap(KODE61, "selesai", {id: uuid(), waktu: w, alat_kembali: [], alat_hilang: ["I-101"]}); assert.equal(k.j.diterima.length, 1, "tugas tanpa kit tetap boleh melapor selesai");
  assert.equal(hil.length, 1, "kit provinsi 62 tidak tersentuh oleh tugas lain");
});

uji("GET /api/sippa/lapangan: saring tugas, kompleks, jenis; urut terbaru dulu; peran baca; wilayah; 404 identik; batas 500; CSV", async () => {
  const q = (s, h = pus.h) => sip("GET", "/lapangan?" + s, undefined, h);
  const a = await q(`tugas_id=${TUGAS}&jenis=tekanan,bor`); assert.equal(a.s, 200, a.t); assert.deepEqual(a.j.butir.map(x => x.jenis).sort(), ["bor", "tekanan"]);
  const x = a.j.butir.find(y => y.jenis === "bor"); assert.deepEqual(Object.keys(x).sort(), ["data", "id", "jenis", "kit_id", "kompleks_id", "oleh", "prov", "tugas_id", "waktu"].sort()); assert.equal(x.data.kedalaman_cm, 320.5); assert.equal(x.oleh, "tugas:" + TUGAS);
  const k = await q("kompleks_id=K0129&jenis=foto"); assert.equal(k.j.butir.length, 5, k.t); assert.ok(k.j.butir.every(y => y.jenis === "foto"));
  const semua = await q(`tugas_id=${TUGAS}`); assert.ok(semua.j.butir.length > 10); assert.deepEqual(semua.j.butir.map(y => y.waktu), [...semua.j.butir.map(y => y.waktu)].sort((p, r) => r - p), "terbaru dulu");
  assert.equal((await q(`tugas_id=${TUGAS}`, pim.h)).s, 200, "pimpinan boleh baca");
  assert.equal((await q("jenis=sos")).s, 400, "tanpa tugas_id dan kompleks_id"); assert.equal((await q(`tugas_id=${TUGAS}&jenis=ngawur`)).s, 400); assert.equal((await q("tugas_id=zz")).s, 400); assert.equal((await q("kompleks_id=X1")).s, 400);
  const luar = await q(`tugas_id=${TUGAS}`, pus61.h), tidak = await q("tugas_id=" + "0".repeat(16), pus61.h);
  assert.equal(luar.s, 404); assert.equal(tidak.s, 404); assert.equal(luar.t, tidak.t, "di luar wilayah = tidak ada, badan identik");
  assert.equal((await q("kompleks_id=K0129", pus61.h)).j.butir.length, 0, "kompleks provinsi lain: kosong");
  assert.equal((await q(`tugas_id=${TUGAS}`, ver.h)).s, 403); assert.equal((await sip("GET", `/lapangan?tugas_id=${TUGAS}`)).s, 401);
  const csv = await mf.dispatchFetch(`http://bnpb.lokal/api/sippa/lapangan.csv?tugas_id=${TUGAS}&jenis=sos`, {headers: pus.h}); assert.equal(csv.status, 200); const t = await csv.text();
  assert.match(t.split("\r\n")[0], /^id,jenis,tugas_id,kit_id,kompleks_id,prov,waktu,oleh,dummy,data$/); assert.match(t, /sos/);
  assert.equal((await mf.dispatchFetch(`http://bnpb.lokal/api/sippa/lapangan.csv?tugas_id=${TUGAS}`, {headers: ver.h})).status, 403);
  await DB.batch(Array.from({length: 520}, (_, i) => DB.prepare("INSERT INTO sippa_lapangan (id, jenis, tugas_id, kit_id, kompleks_id, prov, data, waktu, diterima, oleh) VALUES (?, 'periksa', ?, NULL, NULL, '62', '{}', ?, ?, 'tugas:x1')").bind(uuid(), TUGAS, i, i)));
  assert.equal((await q(`tugas_id=${TUGAS}&jenis=periksa`)).j.butir.length, 500, "batas 500");
});

uji("sippa_lapangan: tambah-saja (UPDATE ditolak, DELETE ditolak untuk data asli); dummy ikut tugas dan bisa dihapus Super Admin", async () => {
  await assert.rejects(DB.prepare("UPDATE sippa_lapangan SET prov = '11'").run(), /sippa_lap_tetap/); await assert.rejects(DB.prepare("DELETE FROM sippa_lapangan WHERE dummy = 0").run(), /sippa_lap_hapus/);
  const td = await sip("POST", "/tugas", {nama_regu: "Regu Dum", unsur: "lain", prov: "62", kab: "Kota Palangka Raya", berlaku_hari: 7}, MOD2); assert.equal(td.s, 201);
  await DB.prepare("UPDATE sippa_tugas SET dummy = 1 WHERE id = ?").bind(td.j.tugas.id).run();
  const id = uuid(); assert.equal((await lap(td.j.kode, "periksa", {id, langkah: "dummy_ok", waktu: kini()})).j.diterima[0], id);
  assert.equal((await DB.prepare("SELECT dummy FROM sippa_lapangan WHERE id = ?").bind(id).first()).dummy, 1, "dummy ikut tugas");
  const h = await sip("POST", "/dummy/hapus", {}, ADMIN); assert.equal(h.s, 200, h.t); assert.equal(await n("sippa_lapangan", "id = ?", id), 0); assert.ok(await n("sippa_lapangan", "dummy = 0") > 0, "baris asli utuh");
});

uji("SP-130 pinjam: POST kit (provinsi dari kit), nomor BA berurut, GET ?prov=, kembali 409 kedua, wilayah, validasi", async () => {
  const mulai = kini() - 5 * HARI, b = {kit_id: KIT, kode_bom: ["P-101"], pemilik_asal: "BPBD Kota", penerima: "Manggala Agni Daops", mulai, selesai_rencana: mulai + 7 * HARI, prov: "11"};
  assert.equal((await sip("POST", "/pinjam", b, pim.h)).s, 403); assert.equal((await sip("POST", "/pinjam", b, pus61.h)).s, 404, "kit di luar wilayah = tidak ada");
  const a = await sip("POST", "/pinjam", b, pus.h); assert.equal(a.s, 201, a.t); const tahun = new Date(kini() + 7 * JAM).getUTCFullYear();
  assert.equal(a.j.pinjam.nomor_ba, `BA-SIPPA-${tahun}-0001`); assert.equal(a.j.pinjam.prov, "62", "prov kiriman klien diabaikan"); assert.deepEqual(a.j.pinjam.kode_bom, ["P-101"]); assert.equal(a.j.pinjam.kembali, null);
  const c = await sip("POST", "/pinjam", {kit_id: KIT, pemilik_asal: "TNI AD", penerima: "Kodim", mulai, selesai_rencana: mulai + HARI}, pus.h); assert.equal(c.j.pinjam.nomor_ba, `BA-SIPPA-${tahun}-0002`);
  const d = await sip("POST", "/pinjam", {kode_bom: ["PB-101"], prov: "61", pemilik_asal: "Pemda", penerima: "BPBD Prov", mulai, selesai_rencana: mulai + HARI}, pus61.h); assert.equal(d.s, 201, d.t); assert.equal(d.j.pinjam.prov, "61"); assert.equal(d.j.pinjam.nomor_ba, `BA-SIPPA-${tahun}-0003`);
  const bad = [[{kit_id: undefined, kode_bom: undefined}, /kit_id atau kode_bom/], [{pemilik_asal: "x"}, /pemilik_asal/], [{penerima: "y".repeat(81)}, /penerima/], [{selesai_rencana: mulai}, /selesai_rencana/], [{kode_bom: ["ngawur"]}, /kode_bom/], [{kode_bom: ["Q-999"]}, /bukan komponen/], [{catatan: "c".repeat(501)}, /catatan/], [{kit_id: "zz"}, /kit_id/]];
  for (const [o, re] of bad) { const r = await sip("POST", "/pinjam", {...b, ...o}, pus.h); assert.equal(r.s, 400, JSON.stringify(o) + r.t); assert.match(r.t, re); }
  assert.equal((await sip("POST", "/pinjam", {kode_bom: ["PB-101"], prov: "62", pemilik_asal: "Pemda", penerima: "BPBD", mulai, selesai_rencana: mulai + HARI}, pus61.h)).s, 404, "prov kiriman di luar wilayah staf");
  assert.equal(await n("sippa_pinjam"), 3, "penolakan tidak menulis"); assert.equal(await n("sippa_ba_urut", "terakhir = 3"), 1, "penghitung tidak terpakai oleh penolakan");
  const l = await sip("GET", "/pinjam?prov=62", undefined, pim.h); assert.equal(l.s, 200); assert.equal(l.j.pinjam.length, 2); assert.equal((await sip("GET", "/pinjam", undefined, pus61.h)).j.pinjam.length, 1, "wilayah 61 hanya miliknya");
  assert.equal((await sip("GET", "/pinjam?prov=6", undefined, pus.h)).s, 400);
  const id = a.j.pinjam.id, kb = (i, o, h = pus.h) => sip("POST", "/pinjam-kembali/" + i, o, h);
  assert.equal((await kb(id, {waktu: mulai + HARI}, pim.h)).s, 403); assert.equal((await kb(id, {waktu: mulai + HARI}, pus61.h)).s, 404); assert.equal((await kb("0".repeat(16), {waktu: mulai})).s, 404);
  assert.equal((await kb(id, {waktu: mulai - 1})).s, 400); assert.equal((await kb(id, {waktu: kini() + HARI})).s, 400); assert.equal((await kb(id, {waktu: mulai + 1000, kondisi: "k".repeat(201)})).s, 400);
  const ok = await kb(id, {waktu: mulai + 2 * JAM, kondisi: "baik, selang lecet"}); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.pinjam.kembali, mulai + 2 * JAM); assert.equal(ok.j.pinjam.kondisi_kembali, "baik, selang lecet");
  assert.equal((await kb(id, {waktu: mulai + 3 * JAM})).s, 409, "sudah kembali");
  await assert.rejects(DB.prepare("UPDATE sippa_pinjam SET penerima = 'lain' WHERE id = ?").bind(id).run(), /sippa_pinjam_tetap/);
  assert.equal((await DB.prepare("SELECT count(*) n FROM pantau_jejak WHERE obyek = ?").bind("sippa_pinjam:" + id).first()).n, 2, "jejak pinjam dan kembali");
  const j = (await sip("GET", "/jejak?sejak=0", undefined, pus61.h)).j.jejak; assert.ok(!j.some(x => x.obyek === "sippa_pinjam:" + id), "jejak pinjam provinsi 62 tidak tampil bagi staf 61");
});
uji("SP-130 nomor BA: admin ikut penghitung yang sama, nomor tetap unik dan berurut", async () => {
  const mulai = kini(), r = await sip("POST", "/pinjam", {kit_id: KIT, pemilik_asal: "Dum", penerima: "Dum", mulai, selesai_rencana: mulai + HARI}, MOD2); assert.equal(r.s, 201, r.t);
  assert.match(r.j.pinjam.nomor_ba, /-0004$/);
  const hasilUnik = await DB.prepare("SELECT count(DISTINCT nomor_ba) a, count(*) b FROM sippa_pinjam").first(); assert.equal(hasilUnik.a, hasilUnik.b);
});

uji("SP-131 suku cadang: tindakan tunggu_suku_cadang diterima staf dan operator; hanya tindakan TERAKHIR per komponen; umur hari; wilayah", async () => {
  const pompa = KOMP.find(c => c.kode_bom === "P-101").id, lance = KOMP.find(c => c.kode_bom === "I-101").id, selang = KOMP.find(c => c.kode_bom === "H-301").id;
  const ins = (sasaran, tindakan, h = pus.h, jenis = "berkala") => sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: sasaran, kit_id: KIT, jenis, skor: 2, tindakan}, h);
  assert.equal((await ins(pompa, "tunggu_suku_cadang")).s, 201); assert.equal((await ins(pompa, "ngawur")).s, 400);
  const w = kini() - 10 * HARI; const op = await kirim(KODE, {inspeksi: [{id: uuid(), sasaran_jenis: "komponen", sasaran_id: lance, jenis: "pasca_gelar", skor: 2, tindakan: "tunggu_suku_cadang", waktu_klien: w}]}); assert.equal(op.j.diterima.length, 1, op.t);
  assert.equal((await ins(selang, "tunggu_suku_cadang")).s, 201); assert.equal((await ins(selang, "ganti")).s, 201, "tindakan sesudahnya menutup antrean");
  const r = await sip("GET", "/suku-cadang", undefined, pus.h); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.komponen.map(x => x.kode_bom).sort(), ["I-101", "P-101"]);
  const l = r.j.komponen.find(x => x.kode_bom === "I-101"); assert.equal(l.umur_hari, 10, "umur dari waktu_klien yang masuk akal (aturan butirInspeksi): " + JSON.stringify(l)); assert.equal(r.j.komponen.find(x => x.kode_bom === "P-101").umur_hari, 0); assert.equal(l.kit_kode, "SIPPA-001"); assert.equal(l.komponen_id, lance); assert.equal(l.kondisi, "rusak_berat");
  assert.equal((await sip("GET", "/suku-cadang", undefined, pus61.h)).j.komponen.length, 0); assert.equal((await sip("GET", "/suku-cadang", undefined, pim.h)).s, 200); assert.equal((await sip("GET", "/suku-cadang", undefined, ver.h)).s, 403); assert.equal((await sip("GET", "/suku-cadang")).s, 401);
});

uji("migrasi 0070 idempoten: dijalankan ulang, isi sippa_inspeksi, indeks, dan trigger utuh", async () => {
  const {pecah} = await import("./_bantu.mjs");
  const n0 = await n("sippa_inspeksi"); assert.ok(n0 > 0);
  const sql = readFileSync(new URL("../../migrations/0070_sippa_lapangan_pinjam.sql", import.meta.url), "utf8");
  await DB.batch(pecah(sql).map(s => DB.prepare(s)));
  assert.equal(await n("sippa_inspeksi"), n0); assert.equal(await n("sqlite_master", "type = 'trigger' AND name LIKE 'sippa_insp_%'"), 4); assert.equal(await n("sqlite_master", "name = 'idx_sippa_insp_sasaran'"), 1);
  assert.equal(await n("sqlite_master", "name = 'sippa_inspeksi_cad'"), 0);
  await assert.rejects(DB.prepare("UPDATE sippa_inspeksi SET skor = 0").run(), /sippa_insp_tetap/);
  const pompa = KOMP.find(c => c.kode_bom === "P-101").id; assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: pompa, kit_id: KIT, jenis: "berkala", skor: 0, tindakan: "uji_ulang"}, pus.h)).s, 201, "trigger terapkan masih jalan");
  assert.equal((await DB.prepare("SELECT kondisi FROM sippa_komponen WHERE id = ?").bind(pompa).first()).kondisi, "baik");
});

uji("koordinat lapangan: peran baca (pimpinan) dapat 0,01 di data, titik jejak, CSV, dan SOS Meja Pantau; peran tulis penuh", async () => {
  const w = kini() - 500, idB = uuid(), idJ = uuid(), idS = uuid();
  const r = await kirim(KODE, {bor: [{id: idB, lat: -2.12345, lon: 113.65432, kedalaman_cm: 100, waktu: w}], sos: [{id: idS, lat: -2.55555, lon: 113.44444, waktu: w}],
    jejak: [{id: idJ, titik: [[-2.11111, 113.22222, w - 1000], [-2.33333, 113.77777, w]], moda: "perahu"}]});
  assert.equal(r.j.diterima.length, 3, r.t);
  const q = h => sip("GET", `/lapangan?tugas_id=${TUGAS}&jenis=bor,jejak`, undefined, h);
  const tulis = (await q(pus.h)).j.butir, baca = (await q(pim.h)).j.butir;
  assert.equal(tulis.find(x => x.id === idB).data.lat, -2.12345); assert.deepEqual(tulis.find(x => x.id === idJ).data.titik[1].slice(0, 2), [-2.33333, 113.77777]);
  assert.equal(baca.find(x => x.id === idB).data.lat, -2.12); assert.equal(baca.find(x => x.id === idB).data.lon, 113.65);
  assert.deepEqual(baca.find(x => x.id === idJ).data.titik, [[-2.11, 113.22, w - 1000], [-2.33, 113.78, w]], "tiap titik dibulatkan, waktu utuh");
  const csv = (h, p = "") => mf.dispatchFetch(`http://bnpb.lokal/api/sippa/lapangan.csv?tugas_id=${TUGAS}&jenis=bor${p}`, {headers: h}).then(async x => ({s: x.status, t: await x.text()}));
  assert.match((await csv(pim.h)).t, /-2\.12,/); assert.doesNotMatch((await csv(pim.h)).t, /-2\.12345/);
  assert.equal((await csv(pim.h, "&presisi=penuh")).s, 403); assert.match((await csv(pus.h, "&presisi=penuh")).t, /-2\.12345/);
  const sos = async h => (await api("GET", "/api/pantau", undefined, h)).j.butir.find(b => b.id === "sippa-sos:" + idS);
  assert.match((await sos(pim.h)).rincian, /^Koordinat -2\.56, 113\.44/); assert.match((await sos(pus.h)).rincian, /^Koordinat -2\.55555, 113\.44444/);
});
uji("lapangan: wilayah disaring di SQL (butir provinsi lain tidak memakan batas), terpotong ditandai", async () => {
  const b = await sip("GET", `/lapangan?tugas_id=${TUGAS}&jenis=periksa`, undefined, pus.h); assert.equal(b.j.butir.length, 500); assert.equal(b.j.terpotong, true);
  const k = await sip("GET", "/lapangan?kompleks_id=K0500", undefined, pus61.h); assert.equal(k.s, 200); assert.equal(k.j.terpotong, false);
});
uji("pinjam tanpa kit_id: kode_bom harus ada di templat komponen; suku cadang pra-0070 = 503", async () => {
  const dasar = {pemilik_asal: "Pemda A", penerima: "BPBD B", mulai: kini(), selesai_rencana: kini() + 5 * HARI, prov: "62"};
  assert.equal((await sip("POST", "/pinjam", {...dasar, kode_bom: ["ZZ-999"]}, pus.h)).s, 400);
  assert.equal((await sip("POST", "/pinjam", {...dasar, kode_bom: ["P-101"]}, pus.h)).s, 201);
  await DB.prepare("ALTER TABLE sippa_lapangan RENAME TO sippa_lapangan_x").run();
  try { const r = await sip("GET", "/suku-cadang", undefined, pus.h); assert.equal(r.s, 503, r.t); assert.match(r.j.galat, /Migrasi SIPPA/); }
  finally { await DB.prepare("ALTER TABLE sippa_lapangan_x RENAME TO sippa_lapangan").run(); }
});
