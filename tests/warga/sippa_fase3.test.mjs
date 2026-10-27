/* SIPPA fase 3 sisi server (keputusan 61; SP-145 anggaran T0-T4 dan akses per provinsi, SP-140 Renlap Generator; migrasi 0073).
   Worker utuh di workerd + D1 + R2 sungguhan; satu-satunya tiruan: api.github.com (eksternal). Jalankan: node --test tests/warga/sippa_fase3.test.mjs */
import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import {siapkan, berantai, ADMIN, MOD2, sha256} from "./_bnpb.mjs";
import {createHmac} from "node:crypto";
import "../../src/worker.js";
import {mingguSiap} from "../../src/pantau.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1"}, uji = berantai();
const panggilan = [];
const luar = async req => {   // tiruan api.github.com saja
  const u = new URL(req.url);
  if (u.host !== "api.github.com") return new Response("diblok di uji", {status: 599});
  panggilan.push({url: req.url, auth: req.headers.get("authorization"), body: JSON.parse(await req.text())});
  return new Response(null, {status: mesinStatus});
};
let mesinStatus = 204;
const U = await siapkan("uji-sippa-fase3", {r2: true, luar, ikat: {RENLAP_KUNCI: "kunci-renlap-uji"}}), {mf, DB, api} = U;
const sip = (m, j, b, h) => api(m, "/api/sippa" + j, b, h);
const R2 = await mf.getR2Bucket("MEDIA");
let ip = 0;
const bikin = async (peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1982${++ip}0012005`, unit: "BPBD", email: `f3${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie, ...PB}};
};
const nas = await bikin(["pusdalops"]), p62 = await bikin(["pusdalops"], ["62"]), p16 = await bikin(["pusdalops"], ["16"]), p16b = await bikin(["pimpinan"], ["16"]), pim = await bikin(["pimpinan"]), ver = await bikin(["verifikator"]);
const kini = () => Date.now();
const kunci = (id, w) => createHmac("sha256", "kunci-renlap-uji").update(`${id}|${w}`).digest("hex");
const detik = () => String(Math.floor(Date.now() / 1000));

uji("migrasi 0073: lima tingkat awal, hanya T0 terbuka; realisasi ke tingkat terkunci ditolak trigger", async () => {
  const t = (await DB.prepare("SELECT tingkat, status, pagu_rp FROM sippa_anggaran_tingkat ORDER BY tingkat").all()).results;
  assert.deepEqual(t.map(x => [x.tingkat, x.status]), [["T0", "terbuka"], ["T1", "terkunci"], ["T2", "terkunci"], ["T3", "terkunci"], ["T4", "terkunci"]]); assert.ok(t.every(x => x.pagu_rp === null), "angka tidak dikarang");
  await assert.rejects(DB.prepare("INSERT INTO sippa_anggaran_realisasi (id, tingkat, uraian, rp, tanggal, oleh, waktu) VALUES (?, 'T1', 'tes', 1, 1, 'x:1', 1)").bind("a".repeat(16)).run(), /sippa_realisasi_terkunci/);
  await assert.rejects(DB.prepare("UPDATE sippa_anggaran_tingkat SET status = 'terkunci' WHERE tingkat = 'T0'").run(), /sippa_anggaran_tetap/);
  await assert.rejects(DB.prepare("DELETE FROM sippa_anggaran_tingkat WHERE tingkat = 'T0'").run(), /sippa_anggaran_tetap/);
  const idem = (await import("node:fs")).readFileSync("migrations/0073_sippa_fase3.sql", "utf8");
  const { pecah } = await import("./_bantu.mjs"); await DB.batch(pecah(idem).map(s => DB.prepare(s))); assert.equal((await DB.prepare("SELECT count(*) n FROM sippa_anggaran_tingkat").first()).n, 5, "idempoten");
});

uji("anggaran: realisasi ke T0 sah, T1 terkunci 409, validasi, peran baca 403, tamu 401", async () => {
  const ok = {tingkat: "T0", uraian: "BBM pilot Kalteng", rp: 1500000, tanggal: kini() - HARI, bukti: "kuitansi 001"};
  const a = await sip("POST", "/anggaran/realisasi", ok, nas.h); assert.equal(a.s, 201, a.t); assert.equal(a.j.realisasi.prov, null, "akun nasional = buku nasional"); assert.equal(a.j.realisasi.oleh.startsWith("staf:"), true);
  const b = await sip("POST", "/anggaran/realisasi", {...ok, uraian: "Transport regu"}, p62.h); assert.equal(b.s, 201, b.t); assert.equal(b.j.realisasi.prov, "62", "prov dari wilayah staf, kiriman prov diabaikan");
  assert.equal((await sip("POST", "/anggaran/realisasi", {...ok, prov: "11"}, p62.h)).j.realisasi.prov, "62");
  assert.equal((await sip("POST", "/anggaran/realisasi", {...ok, tingkat: "T1"}, nas.h)).s, 409, "terkunci");
  for (const [k, v] of [["tingkat", "T9"], ["uraian", "ab"], ["uraian", "x".repeat(201)], ["rp", 0], ["rp", -5], ["rp", 1.5], ["rp", "100"], ["tanggal", kini() + 3 * HARI], ["tanggal", "kemarin"], ["bukti", "b".repeat(301)]]) assert.equal((await sip("POST", "/anggaran/realisasi", {...ok, [k]: v}, nas.h)).s, 400, k);
  assert.equal((await sip("POST", "/anggaran/realisasi", ok, pim.h)).s, 403); assert.equal((await sip("POST", "/anggaran/realisasi", ok)).s, 401);
  assert.equal((await sip("POST", "/anggaran/realisasi", {...ok, uraian: "😀".repeat(200)}, nas.h)).s, 201, "200 titik kode emoji lolos");
  assert.equal((await sip("POST", "/anggaran/realisasi", {...ok, uraian: "‮ab\u0000"}, nas.h)).s, 400, "kontrol dan bidi dibuang sebelum hitung panjang");
  await assert.rejects(DB.prepare("UPDATE sippa_anggaran_realisasi SET rp = 1").run(), /sippa_realisasi_tetap/); await assert.rejects(DB.prepare("DELETE FROM sippa_anggaran_realisasi WHERE dummy = 0").run(), /sippa_realisasi_tetap/);
});

uji("anggaran: buka tingkat hanya admin, atomik, berjejak; sesudahnya realisasi diterima; GET menghitung realisasi dan sisa", async () => {
  assert.equal((await sip("POST", "/anggaran/buka", {tingkat: "T1", gerbang_bukti: "nota putusan pimpinan 5 Nov"}, nas.h)).s, 403, "staf biasa bukan admin");
  assert.equal((await sip("POST", "/anggaran/buka", {tingkat: "T1", gerbang_bukti: "ab"}, MOD2)).s, 400); assert.equal((await sip("POST", "/anggaran/buka", {tingkat: "T7", gerbang_bukti: "nota"}, MOD2)).s, 400);
  assert.equal((await sip("POST", "/anggaran/buka", {tingkat: "T0", gerbang_bukti: "nota putusan"}, MOD2)).s, 409, "sudah terbuka");
  const j0 = (await DB.prepare("SELECT count(*) n FROM pantau_jejak WHERE aksi = 'buka_tingkat'").first()).n;
  const r = await sip("POST", "/anggaran/buka", {tingkat: "T1", gerbang_bukti: "nota putusan pimpinan 5 Nov"}, MOD2); assert.equal(r.s, 200, r.t); assert.equal(r.j.tingkat.status, "terbuka"); assert.equal(r.j.tingkat.dibuka_oleh.length > 2, true);
  assert.equal((await DB.prepare("SELECT count(*) n FROM pantau_jejak WHERE aksi = 'buka_tingkat'").first()).n, j0 + 1);
  assert.equal((await sip("POST", "/anggaran/buka", {tingkat: "T1", gerbang_bukti: "nota putusan pimpinan 5 Nov"}, MOD2)).s, 409, "dua kali = 409, jejak tidak ganda");
  assert.equal((await DB.prepare("SELECT count(*) n FROM pantau_jejak WHERE aksi = 'buka_tingkat'").first()).n, j0 + 1);
  assert.equal((await sip("POST", "/anggaran/realisasi", {tingkat: "T1", uraian: "Survei tapak", rp: 2000000, tanggal: kini()}, nas.h)).s, 201);
  await DB.prepare("UPDATE sippa_anggaran_tingkat SET pagu_rp = 10000000 WHERE tingkat = 'T1'").run();   // pagu belum punya rute tulis: diisi pemilik lewat D1
  const g = await sip("GET", "/anggaran", undefined, pim.h); assert.equal(g.s, 200, g.t);
  const t1 = g.j.tingkat.find(x => x.tingkat === "T1"); assert.deepEqual([t1.status, t1.realisasi_rp, t1.sisa_rp, t1.pagu_rp], ["terbuka", 2000000, 8000000, 10000000]);
  assert.deepEqual(Object.keys(t1).sort(), ["dibuka_oleh", "dibuka_waktu", "gerbang_bukti", "gerbang_pembuka", "nama", "pagu_rp", "realisasi_rp", "sisa_rp", "status", "tingkat"].sort());
  assert.equal(g.j.tingkat.find(x => x.tingkat === "T3").status, "terkunci"); assert.equal(g.j.tingkat.find(x => x.tingkat === "T3").sisa_rp, null);
  assert.equal(g.j.realisasi.length >= 5, true); assert.equal(g.j.terpotong, false);
  assert.equal((await sip("GET", "/anggaran", undefined, ver.h)).s, 403); assert.equal((await sip("GET", "/anggaran")).s, 401);
});

/* ---------------------------------------------------------------- akses per provinsi (butir 48): peran pusdalops/koordalops/pimpinan + wilayah ["16"] */
let KIT, TUGAS, KODE;
uji("wilayah 16 tidak melihat data 62 di rute baca SIPPA (kit, log, lapangan, jejak, pinjam, suku cadang, anggaran, renlap); wilayah 62 melihat", async () => {
  const k = await sip("POST", "/kit", {kode: "SIPPA-001", jenis: "gambut", templat: "gambut", prov: "62", kab: "Kota Palangka Raya", lokasi: "Gudang"}, MOD2); assert.equal(k.s, 201, k.t); KIT = k.j.kit.id;
  const t = await sip("POST", "/tugas", {kit_id: KIT, nama_regu: "Regu F3", unsur: "manggala_agni", prov: "62", kab: "Kota Palangka Raya", kompleks_id: "K0129", berlaku_hari: 7}, p62.h); assert.equal(t.s, 201, t.t); TUGAS = t.j.tugas.id; KODE = t.j.kode;
  const T0 = kini() - 3 * JAM;
  const lg = await sip("POST", "/log", {jenis: "latihan", kelas_medan: "I", petak_id: "PETAK-K1", panjang_m: 120, n_orang: 6, t_tiba: T0, t_mulai_gelar: T0 + 60e3, t_air_mengalir: T0 + JAM, t_selesai: T0 + 2 * JAM, jam_pompa: 2, bbm_l: 88, air_m3: 36, lat: -2.12, lon: 113.98, prov: "62", kit_id: KIT}, p62.h); assert.equal(lg.s, 201, lg.t);
  const lp = await api("POST", "/api/sippa/lapangan/kirim", {jam_kirim: kini(), sos: [{id: crypto.randomUUID(), lat: -2.1, lon: 113.5, waktu: kini() - 1000}]}, {"x-kode": KODE}); assert.equal(lp.j.diterima.length, 1, lp.t);
  const pj = await sip("POST", "/pinjam", {kit_id: KIT, pemilik_asal: "Daops", penerima: "BPBD Kalteng", mulai: kini(), selesai_rencana: kini() + 3 * HARI}, p62.h); assert.equal(pj.s, 201, pj.t);
  const komp = (await DB.prepare("SELECT id FROM sippa_komponen WHERE kit_id = ? AND kode_bom = 'P-101'").bind(KIT).first()).id;
  assert.equal((await sip("POST", "/inspeksi", {sasaran_jenis: "komponen", sasaran_id: komp, kit_id: KIT, jenis: "berkala", skor: 2, tindakan: "tunggu_suku_cadang"}, p62.h)).s, 201);
  await R2.put("sippa/kelayakan_kompleks.json", JSON.stringify({kompleks: [{id: "K0129", prov: "62"}, {id: "K0130", prov: "62"}, {id: "K0777", prov: "16"}, {id: "K0500", prov: "61"}]}));
  const rl = await sip("POST", "/renlap", {kompleks_ids: ["K0129"]}, p62.h); assert.equal(rl.s, 201, rl.t);
  const lihat = async (h, anggaranSaja) => ({
    kit: (await sip("GET", "/kit", undefined, h)).j.kit.length, kitRinci: (await sip("GET", "/kit/" + KIT, undefined, h)).s,
    log: (await sip("GET", "/log", undefined, h)).j.log.length, lap: (await sip("GET", `/lapangan?kompleks_id=K0129`, undefined, h)).j?.butir?.length ?? -1, lapTugas: (await sip("GET", `/lapangan?tugas_id=${TUGAS}`, undefined, h)).s,
    jejak: (await sip("GET", "/jejak?sejak=0", undefined, h)).j.jejak.filter(x => /sippa_(kit|log_gelar|pinjam|tugas|renlap|anggaran_realisasi):/.test(x.obyek) && x.prov === "62").length,
    pinjam: (await sip("GET", "/pinjam", undefined, h)).j.pinjam.length, suku: (await sip("GET", "/suku-cadang", undefined, h)).j.komponen.length,
    real: (await sip("GET", "/anggaran", undefined, h)).j.realisasi.filter(x => x.prov === "62").length, renlap: (await sip("GET", "/renlap", undefined, h)).j.renlap.length, pdf: (await sip("GET", `/renlap/${rl.j.renlap.id}/pdf`, undefined, h)).s});
  const s16 = await lihat(p16.h), s16b = await lihat(p16b.h), s62 = await lihat(p62.h);
  for (const x of [s16, s16b]) assert.deepEqual(x, {kit: 0, kitRinci: 404, log: 0, lap: 0, lapTugas: 404, jejak: 0, pinjam: 0, suku: 0, real: 0, renlap: 0, pdf: 404}, JSON.stringify(x));
  assert.equal(s62.kit, 1); assert.equal(s62.log, 1); assert.equal(s62.lap, 1); assert.equal(s62.pinjam, 1); assert.equal(s62.suku, 1); assert.ok(s62.real >= 1); assert.equal(s62.renlap, 1); assert.ok(s62.jejak >= 3); assert.equal(s62.pdf, 409, "belum siap");
  const idAda = rl.j.renlap.id, tak = "0".repeat(16);
  const a = await sip("GET", `/renlap/${idAda}/pdf`, undefined, p16.h), b = await sip("GET", `/renlap/${tak}/pdf`, undefined, p16.h); assert.equal(a.t, b.t, "tidak ada dan di luar wilayah: badan identik");
  assert.equal((await sip("POST", "/renlap", {kompleks_ids: ["K0129"]}, p16.h)).s, 404, "kompleks provinsi lain");
  assert.equal((await sip("POST", "/renlap", {kompleks_ids: ["K0999"]}, p16.h)).t, (await sip("POST", "/renlap", {kompleks_ids: ["K0129"]}, p16.h)).t, "tidak ada = di luar wilayah");
  const g16 = await sip("GET", "/anggaran", undefined, p16.h); assert.ok(g16.j.tingkat.every(x => x.sisa_rp === null), "sisa nasional tak dihitung dari sebagian"); assert.equal(g16.j.tingkat.find(x => x.tingkat === "T0").realisasi_rp, 0);
  const gn = await sip("GET", "/anggaran", undefined, nas.h); assert.ok(gn.j.tingkat.find(x => x.tingkat === "T0").realisasi_rp > 0);
});

/* ---------------------------------------------------------------- Renlap Generator */
const KOMP = ["K0129", "K0130"];
const renlap = (b, h = p62.h) => sip("POST", "/renlap", b, h);
let RID, TOKEN;
uji("Renlap tanpa GITHUB_TOKEN: baris antre, pesan 'mesin belum disambungkan' (bukan 500), token ditampilkan sekali", async () => {
  const n0 = panggilan.length, r = await renlap({kompleks_ids: KOMP}); assert.equal(r.s, 201, r.t);
  assert.equal(r.j.pesan, "mesin belum disambungkan"); assert.equal(r.j.renlap.status, "antre"); assert.equal(panggilan.length, n0, "tanpa token tidak ada panggilan keluar");
  assert.match(r.j.token, /^[0-9a-f]{36}$/); assert.equal(r.j.hp, `/renlap#t=${r.j.token}&id=${r.j.renlap.id}`); assert.deepEqual(r.j.renlap.kompleks_ids, KOMP); assert.equal(r.j.renlap.prov, "62");
  const row = await DB.prepare("SELECT token_hp_sha, status FROM sippa_renlap WHERE id = ?").bind(r.j.renlap.id).first(); assert.equal(row.token_hp_sha, sha256(r.j.token), "hanya sha256 token disimpan");
  assert.doesNotMatch(JSON.stringify((await sip("GET", "/renlap", undefined, p62.h)).j), new RegExp(r.j.token.slice(0, 12)), "daftar tidak membocorkan token");
  assert.doesNotMatch((await sip("GET", "/renlap", undefined, p62.h)).t, /token_hp_sha/);
  RID = r.j.renlap.id; TOKEN = r.j.token;
});
uji("Renlap validasi: 1..10 id, bentuk K..., satu provinsi, wilayah dari server, peran tulis, laju", async () => {
  for (const b of [{}, {kompleks_ids: []}, {kompleks_ids: "K0129"}, {kompleks_ids: ["x"]}, {kompleks_ids: Array.from({length: 11}, (_, i) => "K" + (100 + i))}, {kompleks_ids: [1]}]) assert.equal((await renlap(b)).s, 400, JSON.stringify(b).slice(0, 40));
  assert.equal((await renlap({kompleks_ids: ["K0129", "K0777"]}, nas.h)).s, 400, "dua provinsi"); assert.equal((await renlap({kompleks_ids: ["K0129", "K0129"]})).j.renlap.kompleks_ids.length, 1, "duplikat disatukan");
  assert.equal((await renlap({kompleks_ids: ["K0129"]}, pim.h)).s, 403); assert.equal((await renlap({kompleks_ids: ["K0129"]}, p16b.h)).s, 403); assert.equal((await renlap({kompleks_ids: ["K0129"]}, {})).s, 401);
  assert.equal((await renlap({kompleks_ids: ["K0777"]}, nas.h)).s, 201, "akun nasional boleh di provinsi mana pun");
});
const mf2 = await siapkan("uji-sippa-fase3-gh", {r2: true, luar, ikat: {RENLAP_KUNCI: "kunci-renlap-uji", GITHUB_TOKEN: "ghp_uji_token"}});
uji("Renlap dengan GITHUB_TOKEN: workflow_dispatch renlap.yml dengan input renlap_id dan kompleks_ids (koma); gagal pemicu = tetap antre dengan galat", async () => {
  const s = (m, j, b, h) => mf2.api(m, "/api/sippa" + j, b, h);
  const h = MOD2;
  const B2 = await mf2.mf.getR2Bucket("MEDIA"); await B2.put("sippa/kelayakan_kompleks.json", JSON.stringify({kompleks: [{id: "K0129", prov: "62"}, {id: "K0130", prov: "62"}]}));
  const n0 = panggilan.length, r = await s("POST", "/renlap", {kompleks_ids: KOMP}, h); assert.equal(r.s, 201, r.t); assert.equal(r.j.pesan, undefined);
  assert.equal(panggilan.length, n0 + 1); const c = panggilan.at(-1);
  assert.equal(c.url, "https://api.github.com/repos/terasurbannetwork/poskokarhutla/actions/workflows/renlap.yml/dispatches"); assert.equal(c.auth, "Bearer ghp_uji_token");
  assert.deepEqual(c.body, {ref: "main", inputs: {renlap_id: r.j.renlap.id, kompleks_ids: "K0129,K0130"}}); assert.equal(r.j.renlap.status, "antre");
  mesinStatus = 404; const g = await s("POST", "/renlap", {kompleks_ids: ["K0129"]}, h); mesinStatus = 204;
  assert.equal(g.s, 201, g.t); assert.equal(g.j.renlap.status, "antre"); assert.match(g.j.pesan, /ditolak \(HTTP 404\)/); assert.match((await mf2.DB.prepare("SELECT galat FROM sippa_renlap WHERE id = ?").bind(g.j.renlap.id).first()).galat, /HTTP 404/);
});

const pasangBerkas = async id => { await R2.put(`sippa/renlap/${id}/renlap.pdf`, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])); await R2.put(`sippa/renlap/${id}/data.json`, JSON.stringify({kompleks: KOMP, judul: "Renlap uji"})); };
const selesai = (id, b, kunciHdr, w = detik()) => sip("POST", `/renlap/${id}/selesai`, b, {"x-renlap-waktu": w, ...(kunciHdr === null ? {} : {"x-renlap-kunci": kunciHdr ?? kunci(id, w)})});
uji("Renlap selesai: kunci HMAC wajib, siap hanya bila berkas R2 ada, status akhir terkunci", async () => {
  assert.equal((await selesai(RID, {status: "siap"}, null)).s, 403); assert.equal((await selesai(RID, {status: "siap"}, "0".repeat(64))).s, 403); assert.equal((await selesai(RID, {status: "siap"}, kunci("f".repeat(16), detik()))).s, 403, "HMAC id lain");
  const lama = String(Math.floor(Date.now() / 1000) - 400); assert.equal((await selesai(RID, {status: "siap"}, kunci(RID, lama), lama)).s, 403, "replay: waktu lewat 300 detik");
  const depan = String(Math.floor(Date.now() / 1000) + 400); assert.equal((await selesai(RID, {status: "siap"}, kunci(RID, depan), depan)).s, 403, "waktu terlalu maju");
  const w1 = detik(); assert.equal((await selesai(RID, {status: "siap"}, kunci(RID, "1" + w1), w1)).s, 403, "HMAC tidak cocok dengan waktu yang dikirim"); assert.equal((await sip("POST", `/renlap/${RID}/selesai`, {status: "siap"}, {"x-renlap-kunci": kunci(RID, w1)})).s, 403, "tanpa x-renlap-waktu");
  assert.equal((await selesai(RID, {status: "ngawur"})).s, 400); assert.equal((await selesai(RID, {status: "siap"})).s, 409, "berkas R2 belum ada");
  assert.equal((await selesai(RID, {status: "jalan"})).j.renlap.status, "jalan");
  for (let i = 0; i < 9; i++) assert.equal((await selesai(RID, {status: "jalan"})).s, 200); assert.equal((await selesai(RID, {status: "jalan"})).s, 429, "jalan berulang dibatasi per id");
  await pasangBerkas(RID);
  assert.equal((await sip("GET", `/renlap/${RID}/pdf`, undefined, p62.h)).s, 409, "belum siap walau berkas ada");
  const r = await selesai(RID, {status: "siap", pdf_kunci: "sippa/rahasia/lain.pdf"}); assert.equal(r.s, 200, r.t); assert.equal(r.j.renlap.status, "siap"); assert.equal(r.j.renlap.ada_pdf, true);
  assert.equal((await DB.prepare("SELECT pdf_kunci, data_kunci FROM sippa_renlap WHERE id = ?").bind(RID).first()).pdf_kunci, `sippa/renlap/${RID}/renlap.pdf`, "kunci R2 dibentuk server");
  assert.equal((await selesai(RID, {status: "gagal"})).s, 409, "siap tidak berubah lagi");
  const ga = await renlap({kompleks_ids: ["K0129"]}); assert.equal((await selesai(ga.j.renlap.id, {status: "gagal", galat: "playwright habis waktu"})).j.renlap.galat, "playwright habis waktu");
  assert.equal((await selesai("e".repeat(16), {status: "gagal"})).s, 404);
  const mf3 = await siapkan("uji-sippa-fase3-tanpakunci", {r2: false}); assert.equal((await mf3.api("POST", "/api/sippa/renlap/" + "a".repeat(16) + "/selesai", {status: "gagal"}, {"x-renlap-kunci": "x"})).s, 503, "tanpa RENLAP_KUNCI");
});
uji("Renlap PDF: dialirkan dari R2 ke peran baca di wilayah; luar wilayah 404", async () => {
  const r = await mf.dispatchFetch(`http://bnpb.lokal/api/sippa/renlap/${RID}/pdf`, {headers: pim.h}); assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "application/pdf"); assert.match(r.headers.get("cache-control"), /no-store/);
  assert.equal(new TextDecoder().decode(new Uint8Array(await r.arrayBuffer())).slice(0, 5), "%PDF-");
  assert.equal((await sip("GET", `/renlap/${RID}/pdf`, undefined, p16.h)).s, 404); assert.equal((await sip("GET", `/renlap/${RID}/pdf`)).s, 401); assert.equal((await sip("GET", `/renlap/${RID}/pdf`, undefined, ver.h)).s, 403);
  assert.equal((await sip("GET", "/renlap", undefined, p62.h)).j.renlap.find(x => x.id === RID).status, "siap");
});
uji("Renlap versi HP: /api/renlap/data hanya dengan token header yang cocok; salah/tak ada identik; belum siap 409; CSP ketat, no-store, noindex", async () => {
  const d = (id, t) => api("GET", `/api/renlap/data?id=${id}`, undefined, t === null ? {} : {"x-renlap-token": t});
  const ok = await d(RID, TOKEN); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.judul, "Renlap uji"); assert.match(ok.h.get("cache-control"), /no-store/); assert.match(ok.h.get("x-robots-tag"), /noindex/);
  assert.equal((await api("GET", `/api/renlap/data?id=${RID}&t=${TOKEN}`)).s, 404, "token di query tidak diterima");
  const salah = await d(RID, "0".repeat(36)), tak = await d("1".repeat(16), TOKEN), rusak = await d(RID, "xyz"), tanpa = await d(RID, null);
  for (const x of [salah, tak, rusak, tanpa]) assert.equal(x.s, 404); assert.equal(salah.t, tak.t, "id tak ada = token salah"); assert.equal((await d("zz", TOKEN)).s, 404);
  const tunggu = await renlap({kompleks_ids: ["K0129"]}); assert.equal((await d(tunggu.j.renlap.id, tunggu.j.token)).s, 409, "token benar, belum siap"); assert.equal((await d(tunggu.j.renlap.id, TOKEN)).s, 404, "token renlap lain tidak berlaku");
  /* tebakan salah dihitung per IP */
  for (let i = 0; i < 125; i++) await d(RID, "0".repeat(36)); assert.equal((await d(RID, "0".repeat(36))).s, 429); const n0 = (await DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE aksi = 'renlap.gagal'").first()).n;
  assert.equal((await d(RID, TOKEN)).s, 429, "IP yang melewati batas ditolak dari memori isolat, termasuk token sah"); assert.equal((await d("1".repeat(16), "0".repeat(36))).s, 429);
  assert.equal((await DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE aksi = 'renlap.gagal'").first()).n, n0, "setelah batas tak ada tulis D1 lagi");
  assert.equal((await mf.dispatchFetch(`http://bnpb.lokal/api/renlap/data?id=${RID}`, {headers: {"x-renlap-token": TOKEN, "cf-connecting-ip": "203.0.113.77"}})).status, 200, "IP lain tak terganggu");
  const h = await mf.dispatchFetch("http://bnpb.lokal/renlap", {headers: {"cf-connecting-ip": "203.0.113.9"}});
  if (existsSync("public/renlap.html")) { assert.equal(h.status, 200); assert.match(h.headers.get("content-security-policy"), /default-src 'self'/); assert.match(h.headers.get("cache-control"), /no-store/); assert.match(h.headers.get("x-robots-tag"), /noindex/); } else assert.equal(h.status, 404, "halaman statis dibuat layar (public/renlap.html)");
  await h.body?.cancel();
});

uji("dummy hapus membuang renlap dan realisasi dummy; tabel baru punya kolom dummy", async () => {
  for (const t of ["sippa_anggaran_tingkat", "sippa_anggaran_realisasi", "sippa_renlap"]) assert.ok((await DB.prepare(`SELECT 1 FROM pragma_table_info('${t}') WHERE name = 'dummy'`).first()), t);
  await DB.prepare("INSERT INTO sippa_anggaran_realisasi (id, tingkat, uraian, rp, tanggal, oleh, waktu, dummy) VALUES (?, 'T0', 'dummy uji', 5, 1, 'dummy', 1, 1)").bind("d".repeat(16)).run();
  await DB.prepare("INSERT INTO sippa_renlap (id, kompleks_ids, prov, token_hp_sha, oleh, waktu, dummy) VALUES (?, '[\"K1\"]', '62', ?, 'dummy', 1, 1)").bind("c".repeat(16), "a".repeat(64)).run();
  const r = await sip("POST", "/dummy/hapus", {}, ADMIN); assert.equal(r.s, 200, r.t); assert.ok(r.j.dihapus.sippa_renlap >= 1 && r.j.dihapus.sippa_anggaran_realisasi >= 1);
  assert.equal((await DB.prepare("SELECT count(*) n FROM sippa_renlap WHERE dummy = 0").first()).n > 0, true, "yang asli tetap");
});

uji("Meja Pantau: butir 'Laporan mingguan SIPPA siap' Jumat 08.00 WIB sampai Senin 08.00 WIB, id per minggu ISO, tautan berminggu", () => {
  const w = s => mingguSiap(Date.parse(s));
  assert.equal(w("2026-10-30T07:59:00+07:00"), null); assert.equal(w("2026-10-30T08:00:00+07:00").minggu, "2026-W44"); assert.equal(w("2026-11-02T07:59:00+07:00").minggu, "2026-W44"); assert.equal(w("2026-11-02T08:01:00+07:00"), null);
  assert.equal(w("2026-01-02T09:00:00+07:00").minggu, "2026-W01"); assert.equal(w("2027-01-01T09:00:00+07:00").minggu, "2026-W53", "1 Jan 2027 Jumat masih minggu ISO 53 tahun 2026"); assert.equal(w("2026-10-28T12:00:00+07:00"), null);
});

uji("lapangan.csv bertanda x-terpotong; pinjam daftar menyaring wilayah di SQL dan menandai terpotong; SOS Meja Pantau: koordinat penuh hanya peran tulis SIPPA", async () => {
  const pjg = Array.from({length: 520}, (_, i) => DB.prepare("INSERT INTO sippa_pinjam (id, nomor_ba, kit_id, kode_bom, prov, pemilik_asal, penerima, mulai, selesai_rencana, oleh, waktu) VALUES (?, ?, NULL, '[\"P-101\"]', ?, 'Asal', 'Penerima', 1000, 2000, 'staf:x', 1)").bind(("b" + String(i)).padStart(16, "0"), "BA-SIPPA-2020-" + i, i < 510 ? "62" : "16"));
  await DB.batch(pjg);
  const a = await sip("GET", "/pinjam", undefined, nas.h); assert.equal(a.j.pinjam.length, 500); assert.equal(a.j.terpotong, true);
  const b = await sip("GET", "/pinjam", undefined, p16.h); assert.equal(b.j.pinjam.length, 10, "510 baris 62 tidak memakan batas wilayah 16"); assert.equal(b.j.terpotong, false);
  await DB.prepare("DELETE FROM sippa_pinjam WHERE nomor_ba LIKE 'BA-SIPPA-2020-%'").run().catch(() => {});
  const w = kini() - 100, idS = crypto.randomUUID();
  await api("POST", "/api/sippa/lapangan/kirim", {jam_kirim: kini(), sos: [{id: idS, lat: -2.55555, lon: 113.44444, waktu: w}]}, {"x-kode": KODE});
  const kor = await bikin(["koordalops"]), sos = async h => (await api("GET", "/api/pantau", undefined, h)).j.butir.find(x => x.id === "sippa-sos:" + idS)?.rincian;
  assert.match(await sos(nas.h), /Koordinat -2\.55555, 113\.44444/); assert.match(await sos(kor.h), /Koordinat -2\.55555/); assert.match(await sos(pim.h), /Koordinat -2\.56, 113\.44/);
});
uji("dummy hapus membuang objek R2 renlap dummy (renlap.pdf, data.json, img/*) dan memecah delete", async () => {
  await DB.prepare("INSERT INTO sippa_renlap (id, kompleks_ids, prov, token_hp_sha, oleh, waktu, dummy) VALUES (?, '[\"K1\"]', '62', ?, 'dummy', 1, 1)").bind("9".repeat(16), "a".repeat(64)).run();
  for (const k of ["renlap.pdf", "data.json", "img/a.png", "img/b.png"]) await R2.put(`sippa/renlap/${"9".repeat(16)}/${k}`, "x");
  await R2.put(`sippa/renlap/${RID}/lain.txt`, "tetap");
  assert.equal((await sip("POST", "/dummy/hapus", {}, ADMIN)).s, 200);
  assert.equal((await R2.list({prefix: `sippa/renlap/${"9".repeat(16)}/`})).objects.length, 0); assert.ok(await R2.get(`sippa/renlap/${RID}/lain.txt`), "renlap asli tetap");
});
