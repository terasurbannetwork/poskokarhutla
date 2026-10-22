/* Laporan harian multi-bahaya (src/laporan_bencana.js, public/laporan_bencana_spek.js, public/laporan_bencana_wa.js, migrations/0048_laporan_bencana.sql) di workerd (Miniflare)
   dengan D1 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock). Berkas laporan.json v1 dilayani dari fixture lewat ASSETS (Miniflare service binding), bukan mock klien DB.
   Dibuktikan: skema idempoten dan trigger menahan; registri sama dengan CHECK migrasi; ?bencana= divalidasi (400) di semua rute; adaptor membaca laporan.json NYATA tiap bahaya;
   alur provinsi banjir (draf, kirim, merah menahan setujui, kunci, snapshot, teks WA berangka bersumber); gunungapi (bagian tanpa data dihilangkan, bukan nol); isolasi antarbahaya;
   ralat memakai bagian otomatis beku; karhutla tidak berubah (hash agregasi emas); dummy per bahaya; 503 sopan tanpa 0048.
   Jalankan: node --test tests/warga/laporan_bencana.test.mjs */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import * as K from "../../public/laporan_karhutla_spek.js";
import * as SB from "../../public/laporan_bencana_spek.js";
import {teksWA} from "../../public/laporan_karhutla_wa.js";

const HARI = 24 * 3600e3, PB = {"x-pb": "1"}, uji = berantai();
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");

/* ---------------- fixture laporan.json v1 (angka kecil dan jelas) ---------------- */
const metrik = (k, label, satuan, o = {}) => ({k, label, satuan, agregat: "maks", arah: "naik_buruk", desimal: 0, ...o});
const FX = {
  banjir: () => ({v: 1, bencana: "banjir", judul: "Laporan Harian Banjir, Longsor dan Rob", dibuat: "2026-10-20T02:47+07:00", cutoff: "2026-10-20T02:30+07:00", hari: ["2026-10-17", "2026-10-18", "2026-10-19"], hari_lengkap: "2026-10-19",
    metrik: [metrik("banjir_sa", "Siaga atau awas banjir", "kecamatan", {utama: true}), metrik("penduduk", "Terpapar banjir", "jiwa")],
    nasional: {banjir_sa: [2, 4, 5], penduduk: [null, 8000, 9823]},
    prov: {"72": {nama: "Sulawesi Tengah", banjir_sa: [1, 3, 3], penduduk: [null, 5000, 6000]}, "62": {nama: "Kalimantan Tengah", banjir_sa: [1, 1, 2], penduduk: [null, 3000, 3823]}, "11": {nama: "Aceh", banjir_sa: [0, 0, 0], penduduk: [null, 0, 0]}},
    sorot: [{tingkat: "siaga", judul: "Sulawesi Tengah: 3 kecamatan siaga banjir", teks: "Hujan lebat tiga hari", prov: "72"}],
    sumber: [{nama: "BMKG", url: "https://www.bmkg.go.id", catatan: "prakiraan hujan"}, {nama: "InaRISK BNPB"}]}),
  gunungapi: () => ({v: 1, bencana: "gunungapi", judul: "Laporan Harian Gunung Api", dibuat: "2026-10-20T04:41+07:00", cutoff: "2026-10-20T04:38+07:00", hari: ["2026-10-17", "2026-10-18", "2026-10-19"], hari_lengkap: "2026-10-18",
    metrik: [metrik("siaga_awas", "Gunung Siaga + Awas", "gunung"), metrik("erupsi", "Erupsi tercatat", "erupsi", {utama: true, agregat: "jumlah"}), metrik("bandara_abu", "Bandara di jalur abu 72 jam", "bandara")],
    nasional: {siaga_awas: [null, null, 3], erupsi: [null, 13, 2], bandara_abu: [null, null, null]},
    prov: {"35": {nama: "Jawa Timur", siaga_awas: [null, null, 1], erupsi: [null, 4, 2], bandara_abu: [null, null, null]}, "18": {nama: "Lampung", siaga_awas: [null, null, 1], erupsi: [null, 9, 0], bandara_abu: [null, null, null]}},
    sorot: [{tingkat: "siaga", judul: "G. Semeru berstatus Level III (Siaga)", teks: "PVMBG", prov: "35"}],
    sumber: [{nama: "MAGMA Indonesia, PVMBG (Badan Geologi)"}]}),
};
const AKTIF = {banjir: FX.banjir(), gunungapi: FX.gunungapi()};
const URLS = Object.fromEntries(K.DAFTAR_BENCANA.map(b => [K.BENCANA[b].url, b]));
const asetKu = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), b = URLS[p];
  if (b && AKTIF[b]) return new Response(JSON.stringify(AKTIF[b]), {headers: {"content-type": "application/json"}});
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const U = await siapkan("uji-lkb", {asetKu});
const {DB, api, mf} = U;
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const n = async (tabel, where = "1", ...ikat) => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).bind(...ikat).first()).n;
let ipN = 0, kidN = 0;
const ipBaru = () => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`});
const kid = () => "kid" + String(++kidN).padStart(8, "0");
const P = "/api/laporan-karhutla/", SANDI = "SandiUji123456";

/* akun pemprov aktif lewat rute masuk sungguhan; cookie sesi instansi hanya terkirim ke /api/instansi, jadi memakai alias /api/instansi/laporan/* */
const pemprov = async (kode, nama, U_ = U) => {
  const {DB, api} = U_, sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
  const garam = "c".repeat(32), id = id16(), username = "pemprov" + kode + id.slice(0, 4);
  await sisip("instansi_akun", {id, username, jenis: "pemprov", tingkat: "prov", wilayah: "Provinsi " + nama, kunci_wilayah: "k" + id, cakupan: JSON.stringify([kode]), prov: null, kab: null, garam, sandi_sha: sha256(garam + SANDI),
    status: "aktif", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD Provinsi", email: "budi@contoh.go.id", wa: "6281234500" + kode, surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat: Date.now() - 3 * HARI, dummy: 0});
  const m = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0];
  return {pemprov: true, h: {cookie}, hp: {cookie, ...PB}};
};
const via = (a, j) => a.pemprov && /^\/api\/laporan-karhutla\/(draf|kirim|kiriman)(\?|$)/.test(j) ? j.replace("/api/laporan-karhutla/", "/api/instansi/laporan/") : j;
const GET = (a, j) => api("GET", via(a, j), undefined, a.h), POST = (a, j, b) => api("POST", via(a, j), b, a.hp);
const AD = {h: ADMIN, hp: ADMIN};
const q = b => `bencana=${b}`;
const kirim = (a, b, tanggal, sumber, isi, dasar = 0) => POST(a, `${P}kirim?${q(b)}`, {tanggal, sumber, isi, versi_dasar: dasar, klien_id: kid()});
const draf = (a, b, tanggal, sumber, isi, dasar = 0) => POST(a, `${P}draf?${q(b)}`, {tanggal, sumber, isi, versi_dasar: dasar, klien_id: kid()});
const setuju = (b, tanggal, sumber, versi) => POST(AD, `${P}verifikasi?${q(b)}`, {tanggal, sumber, aksi: "setujui", versi});
const kunci = (b, tanggal, lanjut = []) => POST(AD, `${P}kunci?${q(b)}`, {tanggal, lanjut_tanpa: lanjut});
const hari = async (b, tanggal) => (await GET(AD, `${P}hari?${q(b)}&tanggal=${tanggal}`)).j;
const snap = (b, tanggal, ekstra = "") => GET(AD, `${P}snapshot/${tanggal}?${q(b)}${ekstra}`);
const SULTENG = {ringkasan: "Banjir di tiga kecamatan, air mulai surut", dampak: {meninggal: 3, hilang: 1, luka: 5, mengungsi: 200, terdampak: 1500}, upaya: "Evakuasi dan dapur umum", hambatan: "Jembatan putus", catatan: "Korban meninggal di Kecamatan Palu Barat"};
let A72, A62;

/* ================================================================ skema dan registri */
uji("migrasi 0048 idempoten; CHECK dan trigger menahan bencana liar, sumber bukan provinsi, riwayat dan snapshot beku, hari terkunci tidak dibuka", async () => {
  const sql = teks("migrations/0048_laporan_bencana.sql");
  for (let i = 0; i < 2; i++) await DB.batch(pecah(sql).map(s => DB.prepare(s)));
  const sql49 = teks("migrations/0049_laporan_bencana_jaga.sql"); for (let i = 0; i < 2; i++) await DB.batch(pecah(sql49).map(s => DB.prepare(s)));   // susulan, idempoten
  const k = (o = {}) => sisip("lkb_kiriman", {bencana: "banjir", tanggal_laporan: "2026-01-01", sumber: "prov:72", status: "draf", versi: 1, isi: "{}", pengirim: "uji", diubah: 1, ...o});
  await assert.rejects(() => k({bencana: "karhutla"}), /CHECK/, "karhutla bukan penghuni lkb_*"); await assert.rejects(() => k({bencana: "tsunami"}), /CHECK/);
  await assert.rejects(() => k({sumber: "udara"}), /CHECK/); await assert.rejects(() => k({sumber: "prov:7"}), /CHECK/); await assert.rejects(() => k({isi: "bukan json"}), /CHECK/); await assert.rejects(() => k({isi: JSON.stringify({x: "a".repeat(262200)})}), /CHECK/);
  await assert.rejects(() => k({status: "disetujui"}), /CHECK/, "disetujui wajib punya verifikator");
  await k(); await assert.rejects(() => k(), /UNIQUE|PRIMARY/); await k({bencana: "gempa"});   // kunci utama memuat bencana
  await sisip("lkb_hari", {bencana: "banjir", tanggal_laporan: "2026-01-01", prioritas: '["72"]', dibuat: 1});
  await assert.rejects(() => sisip("lkb_hari", {bencana: "banjir", tanggal_laporan: "2026-01-01x", dibuat: 1}), /CHECK/); await assert.rejects(() => sisip("lkb_hari", {bencana: "banjir", tanggal_laporan: "2026-01-02", prioritas: "{}", dibuat: 1}), /CHECK/);
  await assert.rejects(() => sisip("lkb_hari", {bencana: "banjir", tanggal_laporan: "2026-01-03", status: "dikunci", dibuat: 1}), /CHECK/, "dikunci wajib punya hash dan penguncinya");
  await sisip("lkb_hari", {bencana: "banjir", tanggal_laporan: "2026-01-04", status: "dikunci", hash: "a".repeat(64), dikunci_oleh: "x", dikunci_pada: 1, dibuat: 1});
  await assert.rejects(() => DB.prepare("UPDATE lkb_hari SET status = 'terbuka' WHERE tanggal_laporan = '2026-01-04'").run(), /dikunci/); await assert.rejects(() => DB.prepare("UPDATE lkb_hari SET prioritas = '[\"11\"]' WHERE tanggal_laporan = '2026-01-04'").run(), /dikunci/);
  const v = {bencana: "banjir", tanggal_laporan: "2026-01-01", sumber: "prov:72", versi: 1, aksi: "kirim", status: "terkirim", isi: "{}", oleh: "uji", waktu: 1};
  await sisip("lkb_versi", v); await assert.rejects(() => sisip("lkb_versi", {...v, klien_id: "pendek"}), /CHECK/); await assert.rejects(() => DB.prepare("UPDATE lkb_versi SET oleh = 'x' WHERE dummy = 0").run(), /hanya bisa ditambah/); await assert.rejects(() => DB.prepare("DELETE FROM lkb_versi WHERE dummy = 0").run(), /hanya bisa ditambah/);
  const s = {bencana: "banjir", tanggal_laporan: "2026-01-01", ralat: 0, hash: "b".repeat(64), isi: "{}", oleh: "uji", waktu: 1};
  await sisip("lkb_snapshot", s); await assert.rejects(() => sisip("lkb_snapshot", {...s, tanggal_laporan: "2026-01-02", ralat: 1}), /CHECK/, "ralat wajib beralasan"); await assert.rejects(() => DB.prepare("UPDATE lkb_snapshot SET isi = '[]'").run(), /beku/); await assert.rejects(() => DB.prepare("DELETE FROM lkb_snapshot WHERE dummy = 0").run(), /beku/);
  /* 0049: hari terkunci nyata tidak bisa dihapus langsung; kiriman hari terkunci tidak bisa dihapus dan hanya bisa diubah menjadi disetujui (ralat) */
  await assert.rejects(() => DB.prepare("DELETE FROM lkb_hari WHERE tanggal_laporan = '2026-01-04'").run(), /tidak bisa dihapus/);
  await k({tanggal_laporan: "2026-01-04", status: "terkirim"});
  await assert.rejects(() => DB.prepare("DELETE FROM lkb_kiriman WHERE tanggal_laporan = '2026-01-04'").run(), /tidak bisa dihapus/);
  await assert.rejects(() => DB.prepare("UPDATE lkb_kiriman SET status = 'draf' WHERE tanggal_laporan = '2026-01-04'").run(), /hanya bisa diubah lewat ralat/);
  await DB.prepare("UPDATE lkb_kiriman SET status = 'disetujui', verif_oleh = 'x', verif_pada = 1 WHERE tanggal_laporan = '2026-01-04'").run();   // jalur ralat tetap jalan
  await DB.prepare("UPDATE lkb_kiriman SET status = 'draf' WHERE tanggal_laporan = '2026-01-01'").run(); await DB.prepare("DELETE FROM lkb_kiriman WHERE tanggal_laporan = '2026-01-01' AND bencana = 'gempa'").run();   // hari terbuka bebas
  await sisip("lkb_hari", {bencana: "gempa", tanggal_laporan: "2026-01-05", status: "dikunci", hash: "a".repeat(64), dikunci_oleh: "x", dikunci_pada: 1, dibuat: 1, dummy: 1}); await DB.prepare("DELETE FROM lkb_hari WHERE tanggal_laporan = '2026-01-05'").run();   // dummy boleh dihapus
  /* dummy boleh dihapus */
  await sisip("lkb_versi", {...v, tanggal_laporan: "2026-01-09", dummy: 1}); await DB.prepare("DELETE FROM lkb_versi WHERE dummy = 1").run();
});

uji("registri bencana: daftar sama dengan CHECK migrasi 0048, tiap bahaya punya adaptor, karhutla membungkus spek lama apa adanya (hash agregasi emas)", async () => {
  const sql = teks("migrations/0048_laporan_bencana.sql"), cek = [...sql.matchAll(/CHECK \(bencana IN \(([^)]*)\)\)/g)];
  assert.equal(cek.length, 4, "empat tabel membawa CHECK bencana");
  for (const [, daftar] of cek) assert.deepEqual(daftar.split(",").map(x => x.trim().replace(/'/g, "")), K.DAFTAR_BENCANA.filter(b => b !== "karhutla"));
  assert.deepEqual(Object.keys(SB.SPEK), K.DAFTAR_BENCANA); assert.deepEqual(K.DAFTAR_BENCANA, ["karhutla", "banjir", "gempa", "gunungapi", "cuaca", "kekeringan", "udara"]);
  for (const b of K.DAFTAR_BENCANA) { const sp = SB.spek(b); for (const f of ["normalisasi", "cek", "agregasi", "kurangMinimal", "galatManusia", "sumberWajib", "statusHari", "teksWA", "labelSumber", "bedaSnapshot"]) assert.equal(typeof sp[f], "function", `${b}.${f}`); assert.ok(K.BENCANA[b].url.startsWith("/")); }
  assert.equal(SB.spek("tsunami"), null); assert.equal(K.bencanaSah("__proto__"), false); assert.equal(K.bencanaSah("banjir"), true);
  assert.equal(SB.SPEK.karhutla.agregasi, K.agregasi); assert.equal(SB.SPEK.karhutla.normalisasi, K.normalisasi); assert.equal(SB.SPEK.karhutla.teksWA, teksWA);
  /* keluaran agregasi karhutla persis sama dengan sebelum registri (hash dihitung dari public/laporan_karhutla_spek.js versi sebelum perubahan, masukan tetap) */
  const T = "2026-10-21", tot = (fs, fs_padam, target_ha, padam_ha) => ({fs, fs_padam, target_ha, padam_ha}), prov = (kode, d) => K.normalisasiProvinsi(d, {kode, tanggal_laporan: T}, true).isi;
  const satelit = {hari: ["2026-10-19", "2026-10-20"], prov: {"62": {titik: [10, 20], luas: [1, 2], kompleks: 3, luas_kompleks: 4}, "63": {titik: [5, 6], luas: [1, 1], kompleks: 1, luas_kompleks: 2}}, luas_banding: {prov: {"62": {perkiraan: {"2024": 100}, sipongi: {"2024": 90}}}}};
  const kiriman = {"prov:62": {isi: prov("62", {total: tot(98, 38, 431.66, 110.31), blok: [{kawasan: "Di luar TNTP", ...tot(46, 33, 74.77, 58.31)}, {kawasan: "TNTP", ...tot(52, 5, 356.89, 52)}], hotspot: {total: 2083}, personel: {total: 16387}})},
    "prov:63": {isi: prov("63", {total: tot(32, 28, 61.14, 57.42), hotspot: {total: 896}, personel: {total: 7927}})},
    udara: {isi: K.normalisasiUdara({armada: [{prov: "62", pemilik: "BNPB", jenis: "heli", registrasi: "PK-SNK", status: "operasi"}], sortie: [{jenis: "wb", registrasi: "PK-SNK", jam_mulai: "08:15", provs: ["62", "63"], lintas: true, bom: 6, liter: 3000, padam_ha: 2.5}]}, {tanggal_laporan: T}, true).isi},
    omc: {isi: K.normalisasiOmc({sortie: [{registrasi: "PK-OMC", jam_mulai: "10:00", bahan: "dry_ice", kg: 800, sasaran: ["Kapuas"], provs: ["62"]}], hasil: [{sasaran: "Kapuas", hujan: "ya", curah_mm: 5}]}, {tanggal_laporan: T}, true).isi}};
  const s = SB.spek("karhutla").agregasi({tanggal_laporan: T, prioritas: ["62", "63"], pengecualian: [], kiriman, sebelumnya: [], satelit, ralat: 0, dikunci_oleh: "admin", dikunci_pada: 1});
  assert.equal(createHash("sha256").update(JSON.stringify(s)).digest("hex"), "f1afdc5d331d520b7159c60f9f7a68c6a30f08c9d618c8d1318e78190c406ca5");
  assert.equal("bencana" in s, false, "snapshot karhutla tidak membawa kunci bencana"); assert.match(teksWA(s).laporan_karhutla, /LAPORAN KARHUTLA/);
});

uji("adaptor membaca laporan.json v1 NYATA tiap bahaya: bagian tanpa angka dihilangkan, prioritas dari metrik utama, tidak ada nol karangan", async () => {
  for (const b of K.DAFTAR_BENCANA.filter(x => x !== "karhutla")) {
    const L = JSON.parse(teks("public" + K.BENCANA[b].url)); assert.equal(L.v, 1, b); assert.equal(L.bencana, b, "berkas " + K.BENCANA[b].url + " bukan milik " + b);
    const td = L.hari.at(-1), d = SB.dariLaporan(L, td); assert.ok(d, `${b}: laporan mencakup hari terakhir`);
    assert.equal(d.metrik.filter(m => m.utama).length, 1, `${b}: tepat satu metrik utama`);
    for (const m of d.nasional ?? []) { assert.ok(Number.isFinite(m.nilai), `${b}.${m.k}`); assert.ok(L.nasional[m.k].at(-1) === m.nilai, `${b}.${m.k} sama dengan berkas`); }
    const nulls = d.metrik.filter(m => !(d.nasional ?? []).some(x => x.k === m.k)).map(m => m.k); for (const k of nulls) assert.ok(L.nasional[k].at(-1) == null, `${b}.${k} dihilangkan hanya bila null di berkas`);
    const pr = SB.pilihPrioritas(L, td), u = d.utama; assert.ok(pr.length <= 6); for (const k of pr) assert.ok(L.prov[k][u].at(-1) > 0, `${b}: prioritas ${k} bernilai > 0`);
    const sn = SB.spek(b).agregasi({tanggal_laporan: K.geserHari(td, 1), prioritas: pr, kiriman: {}, laporan: L, dikunci_oleh: "admin", dikunci_pada: 1});
    assert.equal(sn.bencana, b); assert.deepEqual(sn.provinsi.map(p => p.kode), pr); assert.equal(sn.dampak_provinsi, null, "tanpa kiriman provinsi tidak ada dampak karangan");
    const wa = SB.spek(b).teksWA(sn).laporan; assert.match(wa, new RegExp("LAPORAN HARIAN " + K.BENCANA[b].nama.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); assert.doesNotMatch(wa, /undefined|NaN|null/);
  }
  assert.equal(SB.dariLaporan(JSON.parse(teks("public/gempa/data/laporan.json")), "1999-01-01"), null, "hari di luar berkas = null");
  assert.equal(SB.dariLaporan({v: 2}, "2026-01-01"), null);
  /* besaran berdesimal (magnitudo) tidak dipersenkan: presisi palsu */
  const mag = SB.dariLaporan({v: 1, hari: ["2026-01-01", "2026-01-02"], metrik: [{k: "m", label: "M terbesar", satuan: "M", desimal: 1, utama: true}, {k: "n", label: "Jumlah", satuan: "kejadian", desimal: 0}], nasional: {m: [4.9, 5], n: [0, 3]}, prov: {}, sumber: []}, "2026-01-02");
  assert.deepEqual(mag.nasional.map(m => m.ubah.teks), ["naik dari 4,9 pada hari sebelumnya", "naik dari nol"]); assert.equal(mag.nasional[0].ubah.persen, null);
  assert.match(SB.spek("gempa").teksWA(SB.spek("gempa").agregasi({tanggal_laporan: "2026-01-03", prioritas: [], kiriman: {}, laporan: {v: 1, bencana: "gempa", hari: ["2026-01-01", "2026-01-02"], metrik: [{k: "m", label: "M terbesar", satuan: "M", desimal: 1, utama: true}], nasional: {m: [4.9, 5]}, prov: {}, sumber: [{nama: "BMKG"}]}, dikunci_oleh: "a", dikunci_pada: 1})).laporan, /\*5,0 M\* \(M terbesar\), naik dari 4,9 pada hari sebelumnya/, "desimal sesuai berkas: 5,0 bukan 5");
});

/* ================================================================ deck dan paparan (skrip klasik dijalankan nyata di vm, kanvas perekam) */
const win = {}, ctxVm = {window: win, document: {}, Intl, Date, Math};
vm.createContext(ctxVm);
for (const f of ["paparan_slide", "laporan_bnpb_slide", "laporan_bahaya_slide"]) vm.runInContext(teks(`public/${f}.js`), ctxVm, {filename: f});
const PS = win.PaparanSlide, BS = win.LaporanBahayaSlide;
const rekam = () => { const t = [], k = {teks: (x, y, w, h, r, o = {}) => t.push((typeof r === "string" ? [{t: r}] : Array.isArray(r) ? r : [r]).map(p => p.t ?? p).join("")), kotak() {}, garis() {}, bulat() {}, gambar() {}}; return {k, t}; };
const ar = x => JSON.parse(JSON.stringify(x));   // salin lintas realm sebelum deepEqual
const isiSlide = (sl, c) => { const r = rekam(); sl.gambar(r.k, c); return r.t.join(" | "); };
const bersih = (x, id) => assert.ok(!/undefined|NaN|\[object|\bnull\b| · /.test(x), `slide ${id} bersih dari undefined, NaN, null, dan titik tengah: ${x.slice(0, 300)}`);

uji("deck bahaya dari snapshot: slide mengikuti data, angka dan sumber tercetak, bagian null dilewati beralasan, DRAF berwatermark, tanpa nol karangan", async () => {
  const SPB = SB.spek("banjir"), isiKiriman = SPB.normalisasi("prov:72", SULTENG, "2026-10-20", true).isi;
  const snapB = SPB.agregasi({tanggal_laporan: "2026-10-20", prioritas: ["72", "62"], kiriman: {"prov:72": {isi: isiKiriman}}, pengecualian: [{sumber: "prov:62", alasan: "Kalteng belum mengirim laporan"}], laporan: FX.banjir(), dikunci_oleh: "admin", dikunci_pada: 1});
  const d = BS.deck(snapB), lewatB = Object.fromEntries(d.dilewati.map(y => [y.id, y.alasan])), t = d.slide.map((x, i) => isiSlide(x, {no: i + 1, total: d.slide.length, aset: {}, s: snapB, ex: {lewat: lewatB}, tahun: "2026"}));
  assert.deepEqual(ar(d.slide.map(x => x.id)), ["utama", "tren", "provinsi", "lapprov", "sorot", "metode"]); assert.deepEqual(ar(d.dilewati.map(x => x.id)), ["prakiraan"]); assert.match(d.dilewati[0].alasan, /tidak memuat prakiraan/);
  for (const x of ["5 kecamatan", "siaga atau awas banjir", "9.823", "naik 25 persen dari hari sebelumnya", "BMKG, InaRISK BNPB"]) assert.ok(t[0].includes(x), `utama memuat "${x}"`);
  assert.ok(t[1].includes("2 menjadi 5 kecamatan") && t[1].includes("17 Oktober 2026"), "tren dari tiga hari fixture"); assert.ok(t[2].includes("Sulawesi Tengah") && t[2].includes("Kalimantan Tengah") && t[2].includes("lanjut tanpa laporan: Kalteng belum mengirim laporan"), "provinsi dan pengecualian");
  assert.ok(t[3].includes("3 meninggal, 1 hilang, 5 luka, 200 mengungsi, 1.500 jiwa terdampak") && t[3].includes("Evakuasi dan dapur umum"), "laporan provinsi"); assert.ok(t[4].includes("Sulawesi Tengah: 3 kecamatan siaga banjir")); assert.ok(t[5].includes("Prakiraan: berkas otomatis tidak memuat prakiraan") && t[5].includes("Kalimantan Tengah: data terakhir tidak ada"), "metode mencatat slide dilewati dan pengecualian");
  d.slide.forEach((x, i) => bersih(t[i], x.id));
  const draf = rekam(); BS.deck(snapB, {draf: true}).slide[0].gambar(draf.k, {no: 1, aset: {}, s: snapB, ex: {lewat: {}}, tahun: "2026", draf: true}); assert.ok(draf.t.includes("DRAF"), "watermark DRAF");
  assert.match(BS.namaBerkas({...snapB, ralat: 2}, "pptx"), /^Laporan-Harian-Banjir-20-Okt-2026-Ralat-2\.pptx$/);
  /* gunungapi jarang: tanpa kiriman, metrik null tidak jadi nol; tanpa berkas otomatis semua bagian dilewati beralasan dan utama menulis belum ada data */
  const sg = SB.spek("gunungapi").agregasi({tanggal_laporan: "2026-10-20", prioritas: ["35"], kiriman: {}, laporan: FX.gunungapi(), dikunci_oleh: "a", dikunci_pada: 1}), dg = BS.deck(sg), tg = dg.slide.map((x, i) => isiSlide(x, {no: i + 1, aset: {}, s: sg, ex: {lewat: {}}, tahun: "2026"}));
  assert.deepEqual(ar(dg.slide.map(x => x.id)), ["utama", "tren", "provinsi", "sorot", "metode"], "tanpa laporan provinsi: slide lapprov dilewati"); assert.ok(dg.dilewati.find(x => x.id === "lapprov").alasan.length > 10); assert.ok(!tg[0].includes("bandara"), "bandara_abu null tidak digambar"); tg.forEach((x, i) => bersih(x, dg.slide[i].id));
  const kosong = SB.spek("gunungapi").agregasi({tanggal_laporan: "2026-10-25", prioritas: [], kiriman: {}, laporan: FX.gunungapi(), dikunci_oleh: "a", dikunci_pada: 1}), dk = BS.deck(kosong), tk = dk.slide.map((x, i) => isiSlide(x, {no: i + 1, aset: {}, s: kosong, ex: {lewat: Object.fromEntries(dk.dilewati.map(y => [y.id, y.alasan]))}, tahun: "2026"}));
  assert.deepEqual(ar(dk.slide.map(x => x.id)), ["utama", "metode"]); assert.ok(tk[0].includes("belum ada data") && tk[0].includes("tidak mencakup 24 Oktober 2026")); assert.ok(tk[1].includes("Slide yang dilewati") && tk[1].includes("Tiga hari terakhir")); dk.slide.forEach((x, i) => bersih(tk[i], x.id));
  /* semua bahaya dari berkas NYATA: deck terbangun dan bersih */
  for (const b of K.DAFTAR_BENCANA.filter(x => x !== "karhutla")) {
    const L = JSON.parse(teks("public" + K.BENCANA[b].url)), td = L.hari.at(-1), sn = SB.spek(b).agregasi({tanggal_laporan: K.geserHari(td, 1), prioritas: SB.pilihPrioritas(L, td), kiriman: {}, laporan: L, dikunci_oleh: "a", dikunci_pada: 1}), dd = BS.deck(sn);
    assert.ok(dd.slide.length >= 3, `${b}: deck punya isi`); dd.slide.forEach((x, i) => bersih(isiSlide(x, {no: i + 1, aset: {}, s: sn, ex: {lewat: {}}, tahun: "2026"}), `${b}/${x.id}`));
  }
});

uji("paparan ?bencana=: slide karhutla khusus karhutla, slide b_* hanya bencana lain dengan bahan dari spek, sampul memakai nama bahaya, karhutla tetap utuh", async () => {
  const L = FX.banjir(), td = "2026-10-19", B = SB.dariLaporan(L, td), dasar = {D: {laporan: L}, B, prov: "72", namaProv: "Sulawesi Tengah", tgl: td, merek: "Pantau Bencana", templat: {sampul: {}}, gambar: {}};
  const c = {...dasar, bencana: "banjir", namaB: "Banjir, longsor dan rob"}, karhutla = {...dasar, bencana: undefined, B: null};
  const reg = PS.REGISTRI, khusus = reg.filter(s => s.khusus === "karhutla").map(s => s.id), bahaya = reg.filter(s => s.khusus === "bahaya").map(s => s.id);
  assert.deepEqual(ar(khusus), ["nasional", "provinsi", "harian", "operasi", "konsesi", "konsesi12", "profil3", "lampiran_kab"]); assert.deepEqual(ar(bahaya), ["b_nasional", "b_provinsi", "b_peringkat", "b_sorot", "b_prakiraan", "b_sumber"]);
  for (const id of khusus) { assert.equal(reg.find(x => x.id === id).siap(c), "khusus karhutla"); assert.equal(PS.berlaku(reg.find(x => x.id === id), "banjir"), false); assert.equal(PS.berlaku(reg.find(x => x.id === id), "karhutla"), true); assert.equal(PS.berlaku(reg.find(x => x.id === id), undefined), true); }
  for (const id of bahaya) { const sl = reg.find(x => x.id === id); assert.equal(PS.berlaku(sl, "karhutla"), false, id + " tidak tampil di paparan karhutla"); assert.equal(PS.berlaku(sl, "banjir"), true); assert.ok(sl.siap(karhutla), id + " dilewati bila dipanggil di konteks karhutla"); }
  assert.equal(PS.berlaku(reg.find(x => x.id === "sampul"), "gempa"), true); assert.equal(PS.berlaku(reg.find(x => x.id === "daftar"), "karhutla"), true);
  const aktif = reg.filter(s => PS.berlaku(s, "banjir") && !s.siap(c)), lewat = reg.filter(s => PS.berlaku(s, "banjir") && s.siap(c)).map(s => s.id);
  assert.deepEqual(ar(aktif.map(s => s.id)), ["sampul", "daftar", "b_nasional", "b_provinsi", "b_peringkat", "b_sorot", "b_sumber"]); assert.deepEqual(ar(lewat), ["b_prakiraan"]);
  const urutan = aktif.map((s, i) => ({id: s.id, bagian: s.bagian, judulTampil: s.judul.replace("{prov}", c.namaProv), hal: i + 1})), tt = Object.fromEntries(aktif.map((s, i) => [s.id, isiSlide(s, {...c, no: i + 1, urutan})]));
  assert.ok(tt.sampul.includes("Paparan Rakor Banjir, longsor dan rob") && tt.sampul.includes("Pengendalian Darurat Banjir, longsor dan rob Provinsi Sulawesi Tengah Tahun 2026") && tt.sampul.includes("pengendalian banjir, longsor dan rob Sulawesi Tengah"), "sampul memakai nama bahaya");
  assert.ok(tt.b_nasional.includes("5 kecamatan siaga atau awas banjir pada 19 Oktober 2026") && tt.b_nasional.includes("9.823 jiwa") && tt.b_nasional.includes("naik 25 persen dari hari sebelumnya") && tt.b_nasional.includes("BMKG, InaRISK BNPB"), "angka dan sumber dari spek");
  assert.ok(tt.b_provinsi.includes("Sulawesi Tengah") && tt.b_provinsi.includes("3 kecamatan siaga atau awas banjir") && tt.b_provinsi.includes("6.000 jiwa")); assert.ok(tt.b_peringkat.indexOf("Sulawesi Tengah") < tt.b_peringkat.indexOf("Kalimantan Tengah"), "urut menurun menurut metrik utama"); assert.ok(tt.b_peringkat.includes("Aceh"), "nol yang dilaporkan sumber tetap tampil (bukan nol karangan)");
  assert.ok(tt.b_sorot.includes("Sulawesi Tengah: 3 kecamatan siaga banjir")); assert.ok(tt.b_sumber.includes("BMKG") && tt.b_sumber.includes("InaRISK BNPB") && tt.b_sumber.includes("Arti tanda –")); assert.ok(tt.daftar.includes("Situasi nasional") && tt.daftar.includes("Kondisi Sulawesi Tengah"));
  for (const [id, x] of Object.entries(tt)) bersih(x, id);
  /* karhutla: sampul persis seperti dulu */
  const sk = isiSlide(reg.find(x => x.id === "sampul"), {...karhutla, namaProv: "Kalimantan Tengah", no: 1, urutan: []});
  assert.ok(sk.includes("Paparan Rakor Karhutla") && sk.includes("Rapat Koordinasi Penanganan dan Pengendalian Darurat Karhutla Provinsi Kalimantan Tengah Tahun 2026") && sk.includes("pengendalian karhutla Kalimantan Tengah"), "sampul karhutla tak berubah");
  /* tanggal di luar berkas: bahan null, semua slide b_* dilewati beralasan */
  const kosong = {...c, B: SB.dariLaporan(L, "2030-01-01")}; for (const id of bahaya) assert.match(reg.find(x => x.id === id).siap(kosong), /tidak mencakup tanggal/);
  /* sparse: bahaya tanpa nilai provinsi pada hari itu, b_provinsi dilewati */
  const g = FX.gunungapi(), cg = {...c, D: {laporan: g}, B: SB.dariLaporan(g, "2026-10-17"), tgl: "2026-10-17", bencana: "gunungapi", prov: "35"}; assert.equal(cg.B.nasional, null); assert.match(reg.find(x => x.id === "b_nasional").siap(cg), /tidak ada angka nasional/); assert.match(reg.find(x => x.id === "b_provinsi").siap(cg), /tidak ada angka provinsi/);
});

/* ================================================================ validasi ?bencana= */
uji("?bencana= divalidasi terhadap registri di semua rute: tak dikenal 400, kosong 400, karhutla eksplisit = jalur lama", async () => {
  const rute = [["GET", "hari?tanggal=2026-10-20"], ["GET", "kiriman?tanggal=2026-10-20&sumber=prov:72"], ["GET", "snapshot/2026-10-20"], ["POST", "draf"], ["POST", "kirim"], ["POST", "verifikasi"], ["POST", "prioritas"], ["POST", "kunci"], ["POST", "ralat"], ["POST", "dummy"]];
  for (const salah of ["tsunami", "", "BANJIR", "__proto__", "banjir,gempa"]) for (const [m, j] of rute) {
    const r = await api(m, `${P}${j}${j.includes("?") ? "&" : "?"}bencana=${encodeURIComponent(salah)}`, m === "POST" ? {} : undefined, ADMIN);
    assert.equal(r.s, 400, `${m} ${j} bencana=${JSON.stringify(salah)}: ${r.t}`); assert.match(r.j.galat, /bencana tidak dikenal/); assert.match(r.j.galat, /karhutla.*banjir.*gempa/);
  }
  const lama = await api("GET", `${P}hari?tanggal=2026-10-20`, undefined, ADMIN), eksplisit = await api("GET", `${P}hari?tanggal=2026-10-20&bencana=karhutla`, undefined, ADMIN);
  assert.equal(lama.s, 200, lama.t); assert.equal(eksplisit.s, 200); assert.deepEqual(eksplisit.j, {...lama.j, kini: eksplisit.j.kini}, "bencana=karhutla sama persis dengan tanpa parameter");
  assert.ok("udara" in Object.fromEntries(lama.j.kiriman.map(k => [k.sumber, 1])), "bentuk karhutla: sumber udara tetap ada");
  const banjir = await api("GET", `${P}hari?tanggal=2026-10-20&bencana=banjir`, undefined, ADMIN); assert.equal(banjir.s, 200, banjir.t); assert.equal(banjir.j.bencana, "banjir");
  assert.ok(!banjir.j.kiriman.some(k => ["udara", "omc", "koordalops"].includes(k.sumber)), "banjir tidak punya sumber udara/omc/koordalops");
  /* alias instansi menerima parameter yang sama */
  assert.equal((await api("GET", "/api/instansi/laporan/kiriman?tanggal=2026-10-20&sumber=prov:72&bencana=tsunami", undefined, ADMIN)).s, 400);
});

/* ================================================================ alur provinsi banjir dari fixture */
uji("banjir: prioritas dari fixture (hanya nilai > 0), draf otomatis memuat angka sumber, kirim wajib ringkasan, hak provinsi", async () => {
  A72 = await pemprov("72", "Sulawesi Tengah"); A62 = await pemprov("62", "Kalimantan Tengah"); const T = "2026-10-20";
  const h = await hari("banjir", T); assert.deepEqual(h.prioritas, ["72", "62"], "Aceh bernilai 0 tidak jadi prioritas"); assert.equal(h.tersimpan, false); assert.equal(h.status, "belum_lengkap");
  assert.equal(h.tanggal_data, "2026-10-19"); assert.equal(h.data_otomatis.tersedia, true); assert.equal(h.nama_prov["72"], "Sulawesi Tengah");
  const d = (await GET(A72, `${P}kiriman?${q("banjir")}&tanggal=${T}&sumber=prov:72`)).j;
  assert.equal(d.draf_otomatis, true); assert.equal(d.ada, false); assert.equal(d.wajib, true); assert.equal(d.isi.tanggal_data, "2026-10-19"); assert.deepEqual(d.isi.dampak, {}, "dampak tidak diisi otomatis");
  assert.deepEqual(d.otomatis.metrik.map(m => [m.k, m.nilai]), [["banjir_sa", 3], ["penduduk", 6000]], "angka otomatis provinsi dari fixture"); assert.deepEqual(d.otomatis.sumber, ["BMKG", "InaRISK BNPB"]);
  assert.equal((await GET(A72, `${P}kiriman?${q("banjir")}&tanggal=${T}&sumber=prov:62`)).s, 404, "provinsi lain 404"); assert.equal((await draf(A72, "banjir", T, "prov:62", SULTENG)).s, 404);
  assert.equal((await draf(AD, "banjir", T, "prov:72", SULTENG)).s, 403, "admin tidak menulis atas nama provinsi"); assert.equal((await api("POST", `${P}draf?${q("banjir")}`, {tanggal: T, sumber: "prov:72", isi: {}, versi_dasar: 0})).s, 401, "tamu");
  assert.equal((await draf(A72, "banjir", T, "udara", {})).s, 400, "sumber non-provinsi ditolak"); assert.equal((await GET(A72, `${P}hari?${q("banjir")}&tanggal=${T}`)).s, 403, "pemprov tidak membaca kelengkapan");
  const tanpaRingkasan = await kirim(A72, "banjir", T, "prov:72", {dampak: {meninggal: 1}}); assert.equal(tanpaRingkasan.s, 400, tanpaRingkasan.t); assert.match(tanpaRingkasan.j.galat, /Ringkasan situasi: wajib diisi/);
  const liar = await kirim(A72, "banjir", T, "prov:72", {ringkasan: "ok", dampak: {gempa: 1}}); assert.equal(liar.s, 400); const negatif = await kirim(A72, "banjir", T, "prov:72", {ringkasan: "ok", dampak: {meninggal: -2}}); assert.equal(negatif.s, 400);
  assert.equal((await draf(A72, "banjir", T, "prov:72", {ringkasan: "masih draf"})).s, 201); assert.equal(await n("lkb_hari", "bencana = 'banjir' AND tanggal_laporan = '2026-10-20'"), 1, "hari lahir saat draf pertama, prioritas beku");
  const lagi = await hari("banjir", T); assert.equal(lagi.tersimpan, true); assert.deepEqual(lagi.prioritas, ["72", "62"]);
  AKTIF.banjir.nasional.banjir_sa[2] = 99;   // berkas berubah sesudah hari dibuat: prioritas tidak bergeser
  assert.deepEqual((await hari("banjir", T)).prioritas, ["72", "62"], "prioritas dibekukan saat hari dibuat"); AKTIF.banjir = FX.banjir();
});

uji("banjir: konflik 409, kirim ulang idempoten, merah menahan setujui dan kunci, kunci menolak yang belum lengkap, lanjut tanpa beralasan tercetak", async () => {
  const T = "2026-10-20", kd = kid();
  const salah = await POST(A72, `${P}kirim?${q("banjir")}`, {tanggal: T, sumber: "prov:72", isi: {...SULTENG, dampak: {terdampak: 5, meninggal: 3, luka: 4}}, versi_dasar: 1, klien_id: kd});
  assert.equal(salah.s, 201, salah.t); assert.equal(salah.j.hitung.merah, 1); assert.equal(salah.j.cek[0].k, "terdampak_kurang_dari_korban"); assert.match(salah.j.cek[0].p, /Jiwa terdampak 5 lebih kecil dari jumlah korban 7/);
  const ulang = await POST(A72, `${P}kirim?${q("banjir")}`, {tanggal: T, sumber: "prov:72", isi: SULTENG, versi_dasar: 1, klien_id: kd}); assert.equal(ulang.s, 200, "klien_id sama = kirim ulang tidak menggandakan"); assert.equal(ulang.j.ulang, true);
  assert.equal((await kirim(A72, "banjir", T, "prov:72", SULTENG, 1)).s, 409, "versi_dasar usang"); const versi = (await GET(A72, `${P}kiriman?${q("banjir")}&tanggal=${T}&sumber=prov:72`)).j.versi; assert.equal(versi, 2);
  /* ulang kirim dengan isi merah: setujui ditolak 422 */
  const m = await setuju("banjir", T, "prov:72", 2); assert.equal(m.s, 422, m.t); assert.match(m.j.galat, /cek merah/); assert.equal((await kunci("banjir", T)).s, 409, "belum lengkap");
  const baik = await kirim(A72, "banjir", T, "prov:72", SULTENG, 2); assert.equal(baik.s, 201); assert.equal(baik.j.hitung.merah, 0);
  assert.equal((await POST(AD, `${P}verifikasi?${q("banjir")}`, {tanggal: T, sumber: "prov:72", aksi: "kembalikan", versi: 3})).s, 400, "kembalikan butuh catatan");
  assert.equal((await setuju("banjir", T, "prov:72", 99)).s, 409, "versi usang"); const ok = await setuju("banjir", T, "prov:72", 3); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.status, "disetujui");
  const belum = await kunci("banjir", T); assert.equal(belum.s, 409); assert.match(belum.j.galat, /belum bisa dikunci/); assert.equal(belum.j.belum[0].label, "Kalimantan Tengah");
});

uji("banjir: kunci dengan 'lanjut tanpa' beralasan menghasilkan snapshot beku, teks WA berangka bersumber, baca ulang utuh", async () => {
  const T = "2026-10-20";
  assert.equal((await kunci("banjir", T, [{sumber: "prov:62", alasan: "pendek"}])).s, 400, "alasan minimal 10 huruf"); assert.equal((await kunci("banjir", T, [{sumber: "prov:99", alasan: "bukan provinsi wajib hari itu"}])).s, 400);
  assert.equal((await POST(A72, `${P}kunci?${q("banjir")}`, {tanggal: T})).s, 404, "pemprov tidak mengunci");
  const r = await kunci("banjir", T, [{sumber: "prov:62", alasan: "Kalteng belum mengirim, data terakhir belum ada"}]); assert.equal(r.s, 201, r.t); assert.equal(r.j.status, "dikunci_pengecualian"); assert.equal(r.j.hash.length, 64);
  assert.equal((await draf(A72, "banjir", T, "prov:72", SULTENG, 3)).s, 409, "hari terkunci"); assert.equal((await kunci("banjir", T)).s, 409, "tidak dikunci dua kali");
  assert.equal(await n("lk_hari", "tanggal_laporan = ?", T), 0, "karhutla tidak tersentuh"); assert.equal(await n("lkb_snapshot", "bencana = 'banjir' AND tanggal_laporan = ?", T), 1);
  const s = await snap("banjir", T); assert.equal(s.s, 200, s.t); assert.equal(s.j.utuh, true); assert.equal(s.j.terbaru, true); const sn = s.j.snapshot;
  assert.equal(sn.bencana, "banjir"); assert.equal(sn.tanggal_data, "2026-10-19"); assert.equal(sn.status, "dikunci_pengecualian"); assert.deepEqual(sn.prioritas, ["72", "62"]);
  assert.deepEqual(sn.nasional.map(m => [m.k, m.nilai, m.kemarin]), [["banjir_sa", 5, 4], ["penduduk", 9823, 8000]]); assert.deepEqual(sn.nasional[0].ubah, {arah: "naik", persen: 25, dari: 4, teks: "naik 25 persen dari hari sebelumnya"}); assert.deepEqual(sn.tiga_hari.map(x => x.nilai), [2, 4, 5]);
  assert.deepEqual(sn.dampak_provinsi, {provinsi: 1, meninggal: 3, hilang: 1, luka: 5, mengungsi: 200, terdampak: 1500}, "dampak hanya dari provinsi yang melapor (disetujui)");
  assert.equal(sn.provinsi[0].kiriman.ringkasan, SULTENG.ringkasan); assert.equal(sn.provinsi[1].kiriman, null, "Kalteng tanpa kiriman: kiriman null, bukan nol"); assert.equal(sn.provinsi[1].lanjut_tanpa.alasan, "Kalteng belum mengirim, data terakhir belum ada");
  assert.deepEqual(sn.provinsi[1].metrik, {banjir_sa: 2, penduduk: 3823}, "angka otomatis Kalteng tetap dari sumber"); assert.equal(sn.sorot[0].prov, "72"); assert.equal(sn.prakiraan, null, "tanpa prakiraan di berkas: bagian null"); assert.equal(sn.tambahan, null);
  const wa = s.j.teks_wa.laporan; assert.equal(wa, SB.spek("banjir").teksWA(sn).laporan, "teks WA dihitung dari snapshot, deterministik");
  assert.ok(wa.startsWith("*LAPORAN HARIAN BANJIR, LONGSOR DAN ROB*\n_Selasa, 20 Oktober 2026_"));
  assert.ok(wa.includes("*5 kecamatan* (Siaga atau awas banjir), naik 25 persen dari hari sebelumnya"), "angka kunci lebih dulu, tebal, dengan perubahan"); assert.ok(wa.includes("*9.823 jiwa* (Terpapar banjir)"), "format angka Indonesia");
  assert.ok(wa.includes("_Sumber: BMKG, InaRISK BNPB_"), "sumber tiap bagian"); assert.ok(wa.includes("*3 meninggal*, 1 hilang, 5 luka, 200 mengungsi, 1.500 jiwa terdampak"), "dampak provinsi, angka kunci tebal di depan");
  assert.ok(wa.includes("> belum ada laporan provinsi. _(data terakhir tidak ada; Kalteng belum mengirim, data terakhir belum ada)_"), "pengecualian tercetak"); assert.ok(wa.includes("_Sumber: laporan Pemerintah Provinsi, diverifikasi Pusdalops BNPB_"));
  assert.ok(!wa.includes("D. PRAKIRAAN"), "bagian tanpa data dihilangkan"); assert.ok(!/ · /.test(wa), "tanpa titik tengah pemisah"); assert.doesNotMatch(wa, /undefined|NaN|\bnull\b/);
  assert.ok(wa.includes("1 dari 2 provinsi yang wajib mengirim laporan sudah mengirim"));
  assert.equal((await snap("banjir", T, "&ralat=7")).s, 404); assert.equal((await snap("banjir", T, "&ralat=x")).s, 400); assert.equal((await snap("banjir", "2026-10-19")).s, 404, "hari belum dikunci"); assert.equal((await GET(A72, `${P}snapshot/${T}?${q("banjir")}`)).s, 403, "pemprov tidak membaca snapshot");
  /* isolasi antarbahaya: gunungapi pada tanggal yang sama tidak melihat apa pun dari banjir */
  const g = await hari("gunungapi", T); assert.equal(g.tersimpan, false); assert.ok(g.kiriman.every(x => x.status === "belum"), "tak ada kiriman gunungapi dari banjir"); assert.equal((await snap("gunungapi", T)).s, 404);
});

/* ================================================================ gunungapi: bagian tanpa data dihilangkan */
uji("gunungapi: metrik null dihilangkan (bukan nol), prioritas dari erupsi, kiriman provinsi disetujui, tanggal tanpa data otomatis menyebut alasan", async () => {
  const T = "2026-10-20", h = await hari("gunungapi", T); assert.deepEqual(h.prioritas, ["35"], "hanya Jawa Timur punya erupsi > 0 pada 19 Okt");
  const a35 = await pemprov("35", "Jawa Timur");
  assert.equal((await kirim(a35, "gunungapi", T, "prov:35", {ringkasan: "G. Semeru Siaga, erupsi 2 kali, tidak ada korban", dampak: {meninggal: 0, mengungsi: 0}, upaya: "Pemantauan PVMBG"})).s, 201);
  assert.equal((await setuju("gunungapi", T, "prov:35", 1)).s, 200);
  const k = await kunci("gunungapi", T); assert.equal(k.s, 201, k.t); assert.equal(k.j.status, "dikunci"); const sn = (await snap("gunungapi", T)).j.snapshot;
  assert.deepEqual(sn.nasional.map(m => [m.k, m.nilai]), [["siaga_awas", 3], ["erupsi", 2]], "bandara_abu null dihilangkan, tidak ditulis 0"); assert.equal(sn.nasional.find(m => m.k === "erupsi").kemarin, 13); assert.equal(sn.nasional.find(m => m.k === "siaga_awas").ubah, null, "kemarin null: tanpa ubah");
  assert.equal(sn.tiga_hari.length, 2, "hari tanpa nilai tidak diisi nol"); assert.equal(sn.otomatis.berjalan, true, "19 Okt melewati hari_lengkap 18 Okt"); assert.deepEqual(sn.provinsi[0].metrik, {siaga_awas: 1, erupsi: 2}); assert.deepEqual(sn.dampak_provinsi, {provinsi: 1, meninggal: 0, mengungsi: 0}, "nol yang DILAPORKAN provinsi tetap tampil");
  const wa = (await snap("gunungapi", T)).j.teks_wa.laporan; assert.ok(wa.includes("*2 erupsi* (Erupsi tercatat), turun 85 persen dari hari sebelumnya")); assert.ok(wa.includes("hari berjalan dan belum final")); assert.ok(!wa.includes("bandara"), "metrik tanpa data tidak ditulis"); assert.ok(wa.includes("_Sumber: MAGMA Indonesia, PVMBG (Badan Geologi)_"));
  /* tanggal yang tidak dicakup berkas: seluruh bagian otomatis null dan alasannya tertulis */
  const T2 = "2026-10-25", a = await hari("gunungapi", T2); assert.deepEqual(a.prioritas, []); assert.equal(a.data_otomatis.tersedia, false); assert.equal(a.data_otomatis.hari_lengkap, "2026-10-18");
  assert.equal((await kunci("gunungapi", T2)).s, 400, "tanggal belum tiba"); const kosong = SB.spek("gunungapi").agregasi({tanggal_laporan: T2, prioritas: [], kiriman: {}, laporan: AKTIF.gunungapi, dikunci_oleh: "a", dikunci_pada: 1});
  assert.equal(kosong.nasional, null); assert.equal(kosong.sorot, null); assert.equal(kosong.metrik, null); assert.match(kosong.data_otomatis.alasan, /tidak mencakup 24 Oktober 2026/); assert.match(kosong.kesimpulan[0], /tidak tersedia.*hari lengkap terakhir 18 Oktober 2026/);
  const waKosong = SB.spek("gunungapi").teksWA(kosong).laporan; assert.ok(waKosong.includes("belum ada data (berkas otomatis tidak mencakup 24 Oktober 2026, hari lengkap terakhir 18 Oktober 2026)")); assert.ok(!waKosong.includes("B. PROVINSI")); assert.ok(!waKosong.includes("C. PERLU"));
  const hilang = SB.spek("gunungapi").agregasi({tanggal_laporan: T2, prioritas: [], kiriman: {}, laporan: null, dikunci_oleh: "a", dikunci_pada: 1}); assert.match(hilang.data_otomatis.alasan, /tidak terbaca/);
});

/* ================================================================ ralat, hak, dummy */
uji("ralat banjir: snapshot baru, lama utuh, bagian otomatis tetap beku walau berkas berubah, kiriman baru ikut hitung", async () => {
  const T = "2026-10-20", lama = (await snap("banjir", T)).j; AKTIF.banjir.nasional.banjir_sa[2] = 77;   // berkas berubah sesudah kunci
  assert.equal((await POST(AD, `${P}ralat?${q("banjir")}`, {tanggal: T, alasan: "pendek", ganti: {"prov:62": {ringkasan: "x"}}})).s, 400);
  assert.equal((await POST(AD, `${P}ralat?${q("banjir")}`, {tanggal: T, alasan: "Kalteng mengirim terlambat lewat telepon", ganti: {"prov:62": {}}})).s, 400, "ralat memakai validasi kirim: ringkasan wajib");
  assert.equal((await POST(AD, `${P}ralat?${q("banjir")}`, {tanggal: T, alasan: "Kalteng mengirim terlambat lewat telepon", ganti: {"prov:62": {ringkasan: "ok", dampak: {terdampak: 1, meninggal: 5}}}})).s, 422, "merah menahan ralat");
  assert.equal((await POST(AD, `${P}ralat?${q("banjir")}`, {tanggal: T, alasan: "Tanpa perubahan angka sama sekali ya", ganti: {"prov:72": SULTENG}})).s, 400, "tanpa perubahan angka ditolak");
  /* kiriman hidup prov:72 diubah diam-diam sesudah kunci (UPDATE langsung ke D1): ralat tidak boleh menyerapnya, sumber yang tak dikoreksi dibaca dari snapshot sebelumnya */
  await DB.prepare("UPDATE lkb_kiriman SET isi = json_set(isi, '$.ringkasan', 'DIUBAH DIAM-DIAM', '$.dampak.meninggal', 999) WHERE bencana = 'banjir' AND tanggal_laporan = ? AND sumber = 'prov:72'").bind(T).run();
  const r = await POST(AD, `${P}ralat?${q("banjir")}`, {tanggal: T, alasan: "Kalteng mengirim terlambat lewat telepon", ganti: {"prov:62": {ringkasan: "Banjir ringan di dua kecamatan", dampak: {terdampak: 400, mengungsi: 50}}}});
  assert.equal(r.s, 201, r.t); assert.equal(r.j.ralat, 1); assert.ok(r.j.perubahan.some(x => x.jalur.startsWith("provinsi.1.kiriman")), "perubahan tercatat per jalur");
  const baru = (await snap("banjir", T)).j; assert.equal(baru.ralat, 1); assert.equal(baru.terbaru, true); assert.equal(baru.snapshot.nasional[0].nilai, 5, "bagian otomatis tetap 5, bukan 77 dari berkas yang kini berubah"); assert.equal(baru.snapshot.provinsi[1].kiriman.dampak.terdampak, 400); assert.equal(baru.snapshot.provinsi[0].kiriman.ringkasan, SULTENG.ringkasan, "prov:72 tetap dari snapshot lama"); assert.equal(baru.snapshot.provinsi[0].kiriman.dampak.meninggal, 3); assert.ok(!JSON.stringify(baru.snapshot).includes("DIUBAH DIAM-DIAM"));
  assert.equal(baru.snapshot.status, "dikunci", "pengecualian Kalteng gugur karena kini dikoreksi"); assert.equal(baru.snapshot.dampak_provinsi.provinsi, 2); assert.equal(baru.snapshot.dampak_provinsi.terdampak, 1900); assert.ok(baru.teks_wa.laporan.includes("Ralat-1"));
  const awal = (await snap("banjir", T, "&ralat=0")).j; assert.equal(awal.hash, lama.hash, "snapshot lama utuh"); assert.equal(awal.terbaru, false); assert.equal(awal.ralat_tersedia.length, 2); AKTIF.banjir = FX.banjir();
});

uji("hak laporan bencana: pimpinan non-verifikator ditolak, dummy hanya Super Admin, hari dummy tidak menimpa dan dihapus per bahaya", async () => {
  assert.equal((await api("POST", `${P}verifikasi?${q("banjir")}`, {tanggal: "2026-10-20", sumber: "prov:72", aksi: "setujui", versi: 1}, {cookie: A72.h.cookie, ...PB})).s, 404, "pemprov: 404");
  assert.equal((await api("GET", `${P}hari?${q("banjir")}&tanggal=2026-10-20`)).s, 401); assert.equal((await api("POST", `${P}dummy?${q("banjir")}`, {aksi: "isi"}, {"x-admin-token": "moderator-dua"})).s, 403, "moderator biasa bukan Super Admin");
  const d = await api("POST", `${P}dummy?${q("gempa")}`, {aksi: "isi"}, ADMIN); assert.equal(d.s, 201, d.t); assert.equal(d.j.tanggal, "2026-10-21"); assert.ok(d.j.kiriman >= 1);
  assert.equal((await api("POST", `${P}dummy?${q("gempa")}`, {aksi: "isi"}, ADMIN)).s, 409, "dummy kedua ditolak"); const hd = await hari("gempa", "2026-10-21"); assert.equal(hd.dummy, 1); assert.ok(hd.kiriman.every(x => x.status === "disetujui"));
  assert.equal((await hari("banjir", "2026-10-21")).tersimpan, false, "dummy gempa tidak bocor ke banjir"); assert.equal(await n("lkb_hari", "dummy = 1"), 1);
  const dk = await kunci("gempa", "2026-10-21"); assert.equal(dk.s, 201, dk.t); const sn = (await snap("gempa", "2026-10-21")).j; assert.equal(sn.utuh, true); assert.ok(sn.snapshot.provinsi.every(p => /DUMMY/.test(p.kiriman.ringkasan)), "isi dummy berlabel DUMMY, tanpa angka dampak karangan"); assert.equal(sn.snapshot.dampak_provinsi, null);
  const x = await api("POST", `${P}dummy?${q("gempa")}`, {aksi: "hapus"}, ADMIN); assert.equal(x.s, 200); assert.equal(x.j.hari, 1); assert.equal(await n("lkb_hari", "dummy = 1"), 0); assert.equal(await n("lkb_snapshot", "dummy = 1"), 0);
  assert.equal(await n("lkb_hari", "bencana = 'banjir' AND tanggal_laporan = '2026-10-20'"), 1, "baris nyata banjir tidak tersentuh"); assert.equal((await api("POST", `${P}dummy?${q("gempa")}`, {aksi: "x"}, ADMIN)).s, 400);
});

uji("karhutla tidak berubah oleh sumbu bencana: rute lama menulis lk_*, lkb_* tak bertambah, snapshot karhutla tanpa kunci bencana", async () => {
  const sebelum = [await n("lkb_hari"), await n("lkb_kiriman"), await n("lkb_snapshot")], T = "2026-10-18";
  const p = await api("POST", `${P}prioritas`, {tanggal: T, provinsi: ["62"]}, ADMIN); assert.equal(p.s, 200, p.t); assert.equal(await n("lk_hari", "tanggal_laporan = ?", T), 1);
  const x = await api("POST", `${P}prioritas?bencana=karhutla`, {tanggal: "2026-10-17", provinsi: ["63"]}, ADMIN); assert.equal(x.s, 200, x.t); assert.equal(await n("lk_hari", "tanggal_laporan = '2026-10-17'"), 1, "bencana=karhutla menulis lk_hari");
  assert.deepEqual([await n("lkb_hari"), await n("lkb_kiriman"), await n("lkb_snapshot")], sebelum, "tabel lkb_* tak tersentuh oleh karhutla");
  const k = await api("GET", `${P}kiriman?tanggal=${T}&sumber=udara`, undefined, ADMIN); assert.equal(k.s, 200, k.t); assert.equal(k.j.sumber, "udara");
  assert.equal((await api("GET", `${P}kiriman?${q("banjir")}&tanggal=${T}&sumber=udara`, undefined, ADMIN)).s, 400, "udara bukan sumber banjir");
});

/* ================================================================ batas akun provinsi, tanggal tanpa ISO mentah */
uji("akun provinsi: tanggal lebih dari 14 hari ke belakang ditolak, tulis dibatasi 60 per jam, karhutla juga; admin dan verifikator tidak terkena", async () => {
  const U2 = await siapkan("uji-lkb-batas", {ikat: {LAPORAN_MUNDUR_HARI: "14"}, asetKu}), a = await pemprov("72", "Sulawesi Tengah", U2);
  const GET2 = (j) => U2.api("GET", j, undefined, a.h), POST2 = (j, b) => U2.api("POST", j, b, a.hp), wib = ms => new Date(Date.now() + 7 * 36e5 + ms).toISOString().slice(0, 10);
  const lama = wib(-20 * HARI), ok = wib(-10 * HARI);
  for (const [b, sumber] of [["banjir", "prov:72"], ["karhutla", "prov:62"]]) {
    const akhiran = b === "karhutla" ? "" : `?bencana=${b}`, isi = b === "karhutla" ? {total: {fs: 0, fs_padam: 0, target_ha: 0, padam_ha: 0}, personel: {total: 1}} : {ringkasan: "ok"};
    const r = await POST2(`/api/instansi/laporan/draf${akhiran}`, {tanggal: lama, sumber, isi, versi_dasar: 0, klien_id: kid()}); assert.equal(r.s, b === "karhutla" ? 404 : 400, `${b}: ${r.t}`);   // karhutla: akun 72 bukan provinsi 62, 404 lebih dulu; bahaya lain: tanggal
    if (b !== "karhutla") assert.match(r.j.galat, /lebih dari 14 hari/);
  }
  const lamaK = await U2.api("POST", "/api/instansi/laporan/draf", {tanggal: lama, sumber: "prov:72", isi: {}, versi_dasar: 0, klien_id: kid()}, a.hp); assert.equal(lamaK.s, 409, "karhutla: provinsi bukan prioritas ditolak sebelum batas; batas tanggal dicek sesudah hak");
  assert.equal((await POST2("/api/instansi/laporan/draf?bencana=banjir", {tanggal: ok, sumber: "prov:72", isi: {ringkasan: "ok"}, versi_dasar: 0, klien_id: kid()})).s, 201, "10 hari lalu sah");
  /* batas laju: 60 tulis per jam per akun; sisa kuota habis -> 429 */
  await U2.DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'laporan.tulis'").run();
  const akun = (await U2.DB.prepare("SELECT id FROM instansi_akun LIMIT 1").first()).id;
  await U2.DB.batch(Array.from({length: 59}, () => U2.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'laporan.tulis', ?)").bind("instansi:" + akun, Date.now())));
  const s60 = await POST2("/api/instansi/laporan/draf?bencana=banjir", {tanggal: ok, sumber: "prov:72", isi: {ringkasan: "ke-60"}, versi_dasar: 1, klien_id: kid()}); assert.equal(s60.s, 201, s60.t);
  const s61 = await POST2("/api/instansi/laporan/draf?bencana=banjir", {tanggal: ok, sumber: "prov:72", isi: {ringkasan: "ke-61"}, versi_dasar: 2, klien_id: kid()}); assert.equal(s61.s, 429, s61.t); assert.match(s61.j.galat, /laporan\.tulis/);
  const k61 = await POST2("/api/instansi/laporan/kirim", {tanggal: ok, sumber: "prov:72", isi: {}, versi_dasar: 0, klien_id: kid()}); assert.notEqual(k61.s, 201, "jalur karhutla memakai kuota yang sama");
  assert.equal((await U2.api("GET", `${P}hari?bencana=banjir&tanggal=${ok}`, undefined, ADMIN)).s, 200, "admin tidak terkena batas");
  void GET2;
});

uji("tanggal ditulis 'd Bulan yyyy' di kesimpulan, WA, slide, dan paparan (tanpa ISO mentah); tanda – untuk sel kosong; desimal prakiraan menurut data; judul menjaga singkatan; tanpa 'provinsi prioritas'", async () => {
  const L = FX.banjir(); L.metrik.push(metrik("fwi", "FWI maksimum", "indeks", {desimal: 1}), metrik("pm", "PM2,5 rerata", "µg/m³"));
  L.nasional.fwi = [1.5, 2, 3.25]; L.nasional.pm = [10, 11, 12]; L.prov["72"].fwi = [1, 1, 2]; L.prov["72"].pm = [null, null, null];
  L.prakiraan = {judul: "Peluang hujan lebat 3 hari", hari: ["2026-10-20", "2026-10-21"], baris: [{label: "Sulawesi Tengah", prov: "72", nilai: [0.12, null], satuan: "peluang"}, {label: "Kalimantan Tengah", prov: "62", nilai: [40, 55], satuan: "mm"}]};
  const sn = SB.spek("banjir").agregasi({tanggal_laporan: "2026-10-20", prioritas: ["72"], pengecualian: [{sumber: "prov:62", alasan: "Belum mengirim laporan"}], kiriman: {"prov:62": {isi: null, data_terakhir: "2026-10-12"}}, laporan: L, dikunci_oleh: "a", dikunci_pada: 1});
  const wa = SB.spek("banjir").teksWA(sn).laporan, kes = sn.kesimpulan.join("\n"), kosong = SB.spek("banjir").agregasi({tanggal_laporan: "2026-11-20", prioritas: [], kiriman: {}, laporan: L, dikunci_oleh: "a", dikunci_pada: 1});
  for (const t of [wa, kes, kosong.kesimpulan.join("\n"), kosong.data_otomatis.alasan]) assert.doesNotMatch(t.replace(/\d{4}-\d{2}-\d{2}T/g, ""), /\d{4}-\d{2}-\d{2}/, "tanpa tanggal ISO mentah: " + t.slice(0, 200));
  assert.ok(kes.includes("Data 19 Oktober 2026:") && /tidak mencakup 19 November 2026/.test(kosong.kesimpulan[0]) && /hari lengkap terakhir 19 Oktober 2026/.test(kosong.kesimpulan[0]));
  assert.match(sn.pengecualian[0].data_terakhir, /2026-10-12/, "nilai di snapshot tetap ISO (data), hanya tampilan yang diformat"); assert.ok(sn.kesimpulan.some(x => x.includes("data terakhir 12 Oktober 2026")));
  assert.equal(SB.waktuWIB("2026-10-21T04:41+07:00"), "21 Okt 2026, 04.41 WIB"); assert.equal(SB.waktuWIB("2026-10-20T21:05:00Z"), "21 Okt 2026, 04.05 WIB"); assert.equal(SB.waktuWIB("bukan waktu"), null); assert.equal(sn.otomatis.cutoff_teks, "20 Okt 2026, 02.30 WIB");
  assert.deepEqual(sn.prakiraan.baris.map(b => b.desimal), [2, 0], "peluang dua desimal, curah bulat"); assert.ok(wa.includes("Sulawesi Tengah: 0,12; belum ada data peluang") && wa.includes("Kalimantan Tengah: 40; 55 mm"), wa);
  assert.deepEqual(sn.metrik.map(m => m.judul), ["siaga atau awas banjir", "terpapar banjir", "FWI maksimum", "PM2,5 rerata"], "singkatan terjaga"); assert.equal(SB.labelKalimat("Gempa M 4 atau lebih"), "gempa M 4 atau lebih");
  assert.ok(kes.includes("0 dari 1 provinsi yang wajib mengirim laporan sudah mengirim")); assert.ok(!/provinsi prioritas/i.test(wa + kes));
  /* slide dan paparan memakai judul, tanda –, waktu terformat, desimal data, tanpa kata teknis */
  const d = BS.deck(sn), t = d.slide.map((x, i) => isiSlide(x, {no: i + 1, aset: {}, s: sn, ex: {lewat: Object.fromEntries(d.dilewati.map(y => [y.id, y.alasan]))}, tahun: "2026"})).join("\n");
  assert.doesNotMatch(t, /JSON|\bNA\b|provinsi prioritas|\d{4}-\d{2}-\d{2}/); assert.ok(t.includes("0,12") && t.includes("–") && t.includes("40") && !t.includes("40,00"), "prakiraan: desimal data, sel kosong –");
  const c = {D: {laporan: L}, B: SB.dariLaporan(L, "2026-10-19"), bencana: "banjir", namaB: "Banjir, longsor dan rob", prov: "72", namaProv: "Sulawesi Tengah", tgl: "2026-10-19", merek: "Pantau Bencana", templat: {sampul: {}}, gambar: {}};
  const p = ["b_nasional", "b_peringkat", "b_prakiraan", "b_sumber"].map(id => isiSlide(PS.REGISTRI.find(x => x.id === id), {...c, no: 1, urutan: []})).join("\n");
  assert.ok(p.includes("20 Okt 2026, 02.30 WIB") && p.includes("0,12") && p.includes("–") && p.includes("Arti tanda –") && p.includes("fwi") === false, p); assert.doesNotMatch(p, /\bNA\b|\d{4}-\d{2}-\d{2}/);
  assert.ok(isiSlide(PS.REGISTRI.find(x => x.id === "b_nasional"), {...c, B: SB.dariLaporan(L, "2026-10-19")}).includes("siaga atau awas banjir pada 19 Oktober 2026"));
});

/* ================================================================ degrade tanpa migrasi */
uji("503 sopan tanpa migrasi 0048: semua rute ?bencana=, karhutla tetap jalan", async () => {
  for (const t of ["lkb_snapshot", "lkb_versi", "lkb_kiriman", "lkb_hari"]) await DB.prepare(`DROP TABLE ${t}`).run();
  const T = "2026-10-20";
  for (const b of ["banjir", "gempa", "gunungapi", "cuaca", "kekeringan", "udara"]) {
    for (const [m, j, bd] of [["GET", `hari?tanggal=${T}`], ["GET", `kiriman?tanggal=${T}&sumber=prov:72`], ["GET", `snapshot/${T}`], ["POST", "kirim", {tanggal: T, sumber: "prov:72", isi: {ringkasan: "x"}, versi_dasar: 0}], ["POST", "draf", {tanggal: T, sumber: "prov:72", isi: {}, versi_dasar: 0}],
      ["POST", "verifikasi", {tanggal: T, sumber: "prov:72", aksi: "setujui", versi: 1}], ["POST", "kunci", {tanggal: T}], ["POST", "ralat", {tanggal: T, alasan: "Tanpa tabel sama sekali", ganti: {"prov:72": {ringkasan: "x"}}}], ["POST", "prioritas", {tanggal: T, provinsi: ["72"]}], ["POST", "dummy", {aksi: "isi"}]]) {
      const ak = ["kirim", "draf"].includes(j) ? A72 : AD, url = via(ak, `${P}${j}${j.includes("?") ? "&" : "?"}${q(b)}`), r = await api(m, url, bd, ak.hp ?? ADMIN); assert.equal(r.s, 503, `${b} ${m} ${j}: ${r.t}`); assert.match(r.j.galat, /migrasi 0048/); assert.ok(r.j.galat.toLowerCase().includes(K.BENCANA[b].nama.toLowerCase()), "pesan menyebut bahayanya");
    }
  }
  const lewat = await api("GET", `${P}hari?tanggal=${T}`, undefined, ADMIN); assert.equal(lewat.s, 200, "karhutla tak terpengaruh"); assert.equal((await api("GET", "/admin/laporan-karhutla", undefined, ADMIN)).s, 200);
  assert.equal((await api("GET", "/api/pantau", undefined, ADMIN)).s, 200, "Meja Pantau tetap jalan"); await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 23, 0, 1)});
  for (const f of ["0048_laporan_bencana", "0049_laporan_bencana_jaga"]) await DB.batch(pecah(teks(`migrations/${f}.sql`)).map(s => DB.prepare(s)));
  assert.equal((await api("GET", `${P}hari?${q("banjir")}&tanggal=${T}`, undefined, ADMIN)).s, 200, "begitu migrasi diterapkan rute hidup tanpa deploy ulang");
});
