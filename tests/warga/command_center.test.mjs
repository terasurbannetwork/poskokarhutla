/* Command center karhutla (src/command_center.js, migrations/0099_command_center.sql, peran staf operator_cc, tab pemirsa dinding) di workerd (Miniflare) dengan D1 lokal sungguhan,
   migrasi apa adanya (TEST.md: tanpa mock klien DB). Dibuktikan: matriks akses tiap rute (tamu 401, akun gerbang 403, operator, koordalops/pimpinan baca saja, pemirsa dinding hanya /api/cc/dinding),
   gerbang halaman centurisk97.id, hak baca baru (monitor/omc/inventaris/sla/pantau) dan penolakan tulis/korban/tagih, semua transisi + CAS 409 tanpa jejak palsu, trigger append-only, wilayah, dummy,
   status by kunci (kunci sama dengan feed peringatan), log + CSV tahan injeksi rumus, shiftDari lintas tengah malam, durasi, kontak tanpa nomor pribadi.
   Halaman (bagian E): gerbang /command-center (meja) dan /command-center/dinding per jenis akun, CSP, kerangka dinding tanpa alarm.js/sapa/asisten, menu admin, node --check berkas klien, pengendali
   bunyi dan pemformat jam/durasi klien di node:vm. Uji di peramban nyata ada di command_center_layar.test.mjs.
   Jalankan: node --test tests/warga/command_center.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {execFileSync} from "node:child_process";
import vm from "node:vm";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, GERBANG_ORANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {shiftDari, rentangShift, median, durasiJejak, selCsv, nomorDari, aksiBoleh, TRANSISI, STATUS, FINAL, SHIFT, BATAS_TENGGAT, BATAS_DAFTAR, BATAS_LOG, BATAS_AKSI_JAM, BATAS_LOG_JAM, MAKS_LOKASI, bersihkanCc} from "../../src/command_center.js";
import {kunciPublikKarhutla, periksaPeringatan} from "../../src/peringatan.js";
import {TERTUTUP_OPERATOR, JENIS, JENIS_CC, bolehBuka} from "../../src/pantau.js";
import {PERAN} from "../../src/staf.js";
import {P_SIPPA_BACA} from "../../src/sippa.js";
import {HALAMAN_STAF, SEMUA_PERAN, CSP_ADMIN, CSP_DINDING} from "../../src/admin_halaman.js";

const MENIT = 6e4, JAM = 36e5, HARI = 24 * JAM, WIB = 7 * JAM, PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const uji = berantai();
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
const U = await siapkan("uji-cc", {r2: true, ikat: {CC_MEMO_DETIK: "0"}}), {DB, api, mf} = U;   // memo dimatikan: tiap GET membaca D1 (uji memo ada di instansi tersendiri)

/* ---------------- penyemai: D1 langsung (tabelnya milik modul lain; rute pembuatnya diuji di modul itu) ---------------- */
let sn = 0, tn = 0;
const hex16 = n => n.toString(16).padStart(4, "0").padEnd(16, "c");
const sisip = (D, tabel, o) => D.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
async function staf(D, nama, peran, {wilayah = [], dummy = 0, wajibGanti = 0} = {}) {
  const i = ++sn, id = "5" + i.toString(16).padStart(3, "0") + "d".repeat(12), tok = sha256("tok-" + id), cookie = "sesi_staf=" + tok;
  await D.batch([D.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy) VALUES (?, ?, ?, ?, 'Unit Uji', ?, ?, ?, ?, ?, ?, ?, 1, 'tes', ?)`)
      .bind(id, "ccstaf" + i + "xx", nama, "9000" + i + "000", `s${i}@b.id`, "62812000" + String(i).padStart(4, "0"), JSON.stringify(peran), JSON.stringify(wilayah), "g".repeat(32), "a".repeat(64), wajibGanti, dummy),
    D.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 5 * JAM)]);
  return {id, nama, cookie, h: {cookie, ...PB}, oleh: "staf:" + id};
}
async function pemirsa(D, nama, tab) {
  const i = ++sn, id = "7" + i.toString(16).padStart(3, "0") + "e".repeat(12), tok = sha256("pm-" + id);
  await D.batch([D.prepare("INSERT INTO pemirsa (id, username, nama, tab, garam, sandi_sha, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, "lihatcc" + i, nama, JSON.stringify(tab), "g".repeat(32), "0".repeat(64), 1),
    D.prepare("INSERT INTO pemirsa_sesi (token_sha, pemirsa_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 5 * JAM)]);
  return {id, h: {cookie: "sesi_pemirsa=" + tok}};
}
async function tugas(D, o = {}) {
  const id = hex16(0x2000 + ++tn), t = Date.now(), r = {prov: "62", kab: "Kotawaringin Timur", kec: "Mentaya Hilir", lat: -2.51237, lon: 113.29876, level: 3, n24: 12, luas_ha: 45.5, dibuat: t - 30 * MENIT, status: "buka", konfirmasi_pada: null, dummy: 0, ...o};
  await D.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, r.prov, r.kab, r.kec, r.lat, r.lon, r.level, r.n24, r.luas_ha, r.dibuat, r.dibuat, r.status, r.konfirmasi_pada, r.dummy).run();
  if (o.banjir) await D.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES (?, 'banjir')").bind(id).run();
  return id;
}
const jejakDari = (D, id) => D.prepare("SELECT dari, ke, oleh, catatan, dummy FROM cc_jejak WHERE tugas_id = ? ORDER BY id").bind(id).all().then(r => r.results);
const statusDari = (D, id) => D.prepare("SELECT status, oleh, sejak, dummy FROM cc_status WHERE tugas_id = ?").bind(id).first();
const aksi = (id, body, h, A = api) => A("POST", `/api/cc/aksi/${id}`, body, h);
const ambil = (j, h, A = api) => A("GET", j, undefined, h);
const wibMs = (tgl, jam, menit = 0, detik = 0, ms = 0) => Date.parse(`${tgl}T00:00:00Z`) - WIB + ((jam * 60 + menit) * 60 + detik) * 1000 + ms;   // jam >= 24 = hari berikutnya
const awalHari = t => Math.floor((t + WIB) / HARI) * HARI - WIB;

/* peserta uji bersama (instansi U) */
const op1 = await staf(DB, "Budi Santoso", ["operator_cc"]), op2 = await staf(DB, "Citra Dewi", ["operator_cc"]), opWil = await staf(DB, "Dewi Wilayah", ["operator_cc"], {wilayah: ["62"]});
const koord = await staf(DB, "Koordinator Uji", ["koordalops"]), pim = await staf(DB, "Pimpinan Uji", ["pimpinan"]), tmc = await staf(DB, "Staf TMC", ["tmc"]), pusd = await staf(DB, "Pusdalops Uji", ["pusdalops"]);
const kampus = await staf(DB, "Staf Kampus", ["kemitraan"]), tertahan = await staf(DB, "Staf Tertahan", ["operator_cc"], {wajibGanti: 1});
const pDinding = await pemirsa(DB, "Layar Dinding", ["dinding"]), pPeta = await pemirsa(DB, "Pemirsa Peta", ["peta"]);

/* ================================================================ skema */
uji("cc skema: migrasi 0099 idempoten; CHECK tabel, cc_jejak hanya menambah (hapus hanya dummy atau > 2 tahun), peran operator_cc dan tab dinding sah", async () => {
  const sql = teks("migrations", "0099_command_center.sql");
  for (let i = 0; i < 2; i++) await DB.batch(pecah(sql).map(s => DB.prepare(s)));   // dijalankan ulang di atas skema yang sudah ada
  const t = hex16(0x9001), s = o => sisip(DB, "cc_status", {tugas_id: t, status: "ada_api", oleh: "staf:abc", sejak: 1, ...o});
  await assert.rejects(() => s({status: "baru"}), /CHECK/);   // 'baru' = tanpa baris
  await assert.rejects(() => s({status: "selesai"}), /CHECK/); await assert.rejects(() => s({tugas_id: "pendek"}), /CHECK/);
  await assert.rejects(() => s({oleh: "ab"}), /CHECK/); await assert.rejects(() => s({oleh: "x".repeat(41)}), /CHECK/); await assert.rejects(() => s({dummy: 2}), /CHECK/);
  await s({status: "dalam_konfirmasi"});   // TANPA FK ke tugas_api: tugasnya tidak perlu ada
  await assert.rejects(() => s({}), /UNIQUE|PRIMARY/);
  const j = o => sisip(DB, "cc_jejak", {waktu: Date.now(), tugas_id: t, oleh: "staf:abc", dari: "baru", ke: "dalam_konfirmasi", ...o});
  await assert.rejects(() => j({dari: "selesai"}), /CHECK/); await assert.rejects(() => j({ke: "selesai"}), /CHECK/); await assert.rejects(() => j({tugas_id: "pendek"}), /CHECK/);
  await assert.rejects(() => j({oleh: "ab"}), /CHECK/); await assert.rejects(() => j({catatan: "x".repeat(301)}), /CHECK/); await assert.rejects(() => j({dummy: 2}), /CHECK/);
  await j({catatan: "x".repeat(300)});   // batas tepat
  await assert.rejects(() => DB.prepare("UPDATE cc_jejak SET catatan = 'ubah' WHERE tugas_id = ?").bind(t).run(), /hanya bisa ditambah/);
  await assert.rejects(() => DB.prepare("DELETE FROM cc_jejak WHERE tugas_id = ?").bind(t).run(), /hanya bisa ditambah/);
  /* INSERT OR REPLACE (dan REPLACE INTO, upsert) dengan id yang sudah ada menimpa baris lama tanpa memicu trigger UPDATE/DELETE (recursive_triggers mati): trigger BEFORE INSERT menolaknya */
  const asli = await DB.prepare("SELECT id, waktu, oleh, catatan FROM cc_jejak WHERE tugas_id = ?").bind(t).first(), palsu = "INSERT OR REPLACE INTO cc_jejak (id, waktu, tugas_id, oleh, dari, ke, catatan, dummy) VALUES (?, 1, ?, 'staf:palsu', 'baru', 'dalam_konfirmasi', 'dipalsukan', 0)";
  await assert.rejects(() => DB.prepare(palsu).bind(asli.id, t).run(), /hanya bisa ditambah/); await assert.rejects(() => DB.prepare(palsu.replace("INSERT OR REPLACE", "REPLACE")).bind(asli.id, t).run(), /hanya bisa ditambah/);
  await assert.rejects(() => DB.prepare(palsu.replace("INSERT OR REPLACE", "INSERT") + " ON CONFLICT (id) DO UPDATE SET catatan = 'dipalsukan'").bind(asli.id, t).run(), /hanya bisa ditambah/);
  await assert.rejects(() => DB.prepare(palsu.replace("INSERT OR REPLACE", "INSERT OR IGNORE")).bind(asli.id, t).run(), /hanya bisa ditambah/, "bahkan IGNORE: id yang sudah ada tidak boleh disentuh");
  assert.deepEqual(await DB.prepare("SELECT id, waktu, oleh, catatan FROM cc_jejak WHERE tugas_id = ?").bind(t).first(), asli, "baris asli utuh");
  const idBaru = asli.id + 1000000, tua = Date.now() - 800 * HARI;   // id eksplisit yang belum dipakai tetap sah (baris 800 hari: boleh dibuang lagi)
  await DB.prepare(palsu.replace("INSERT OR REPLACE", "INSERT").replace(", 1, ?,", ", ?, ?,")).bind(idBaru, tua, t).run(); await DB.prepare("DELETE FROM cc_jejak WHERE id = ?").bind(idBaru).run();
  assert.equal(await DB.prepare("SELECT 1 FROM cc_jejak WHERE id = ?").bind(idBaru).first(), null);
  const t2 = hex16(0x9002), t3 = hex16(0x9003), t4 = hex16(0x9004);
  await j({tugas_id: t2, dummy: 1}); await DB.prepare("DELETE FROM cc_jejak WHERE tugas_id = ?").bind(t2).run();   // dummy boleh dihapus
  await j({tugas_id: t3, waktu: Date.now() - 731 * HARI}); await DB.prepare("DELETE FROM cc_jejak WHERE tugas_id = ?").bind(t3).run();   // > 2 tahun boleh dihapus
  await j({tugas_id: t4, waktu: Date.now() - 700 * HARI}); await assert.rejects(() => DB.prepare("DELETE FROM cc_jejak WHERE tugas_id = ?").bind(t4).run(), /hanya bisa ditambah/);   // belum 2 tahun
  assert.equal((await DB.prepare("SELECT count(*) n FROM cc_jejak WHERE tugas_id IN (?, ?)").bind(t2, t3).first()).n, 0);
  await assert.rejects(() => sisip(DB, "cc_hadir", {staf_id: "ab", terakhir: 1}), /CHECK/); await sisip(DB, "cc_hadir", {staf_id: "staf:uji-skema", terakhir: 1}); await assert.rejects(() => sisip(DB, "cc_hadir", {staf_id: "staf:uji-skema", terakhir: 2}), /UNIQUE|PRIMARY/);
  /* peran dan tab sah lewat trigger yang dibuat ulang; peran liar tetap ditolak */
  const x = await staf(DB, "Peran Ganda", ["operator_cc", "pusdalops"]);
  await assert.rejects(() => DB.prepare("UPDATE staf SET peran = '[\"raja\"]' WHERE id = ?").bind(x.id).run(), /tidak sah/);
  await assert.rejects(() => DB.prepare("UPDATE staf SET peran = '[\"operator_cc\",\"operator_cc\"]' WHERE id = ?").bind(x.id).run(), /tidak sah/);
  await DB.prepare("UPDATE staf SET peran = '[\"operator_cc\"]' WHERE id = ?").bind(x.id).run();
  await pemirsa(DB, "Dinding Ganda", ["dinding", "monitor"]);
  await assert.rejects(() => pemirsa(DB, "Tab Liar", ["dinding", "admin"]), /tab pemirsa tidak sah/);
  assert.ok("operator_cc" in PERAN && SEMUA_PERAN.includes("operator_cc"));
});

uji("cc retensi: bersihkanCc membuang jejak/status > 2 tahun dan kehadiran > 30 hari, hanya sekali sehari jam 04 UTC, toleran tabel belum ada", async () => {
  const now = Date.now(), t = [hex16(0x9101), hex16(0x9102)];
  for (const [tid, umur] of [[t[0], 731 * HARI], [t[1], 10 * HARI]]) {
    await sisip(DB, "cc_status", {tugas_id: tid, status: "ada_api", oleh: "staf:retensi", sejak: now - umur}); await sisip(DB, "cc_jejak", {waktu: now - umur, tugas_id: tid, oleh: "staf:retensi", dari: "dalam_konfirmasi", ke: "ada_api"});
  }
  await sisip(DB, "cc_hadir", {staf_id: "staf:hadir-lama", terakhir: now - 31 * HARI}); await sisip(DB, "cc_hadir", {staf_id: "staf:hadir-baru", terakhir: now - 2 * HARI});
  const tiga = new Date(now); tiga.setUTCHours(3, 0, 0, 0);
  assert.deepEqual(await bersihkanCc({DB}, tiga.getTime()), {lewat: "bukan jamnya"}, "di luar jam 04 UTC tidak menyentuh D1");
  assert.equal(await statusDari(DB, t[0]) !== null, true);
  const r = await bersihkanCc({DB}, now, {paksa: true}); assert.ok(r.jejak >= 1 && r.status >= 1 && r.hadir >= 1, JSON.stringify(r));
  assert.equal(await statusDari(DB, t[0]), null); assert.equal((await jejakDari(DB, t[0])).length, 0);
  assert.notEqual(await statusDari(DB, t[1]), null); assert.equal((await jejakDari(DB, t[1])).length, 1, "yang baru tetap");
  assert.equal(await DB.prepare("SELECT 1 FROM cc_hadir WHERE staf_id = 'staf:hadir-lama'").first(), null); assert.notEqual(await DB.prepare("SELECT 1 FROM cc_hadir WHERE staf_id = 'staf:hadir-baru'").first(), null);
  const empat = new Date(now); empat.setUTCHours(4, 0, 0, 0);
  assert.ok("jejak" in await bersihkanCc({DB}, empat.getTime()), "jam 04 UTC berjalan tanpa paksa");
  const K = await siapkan("uji-cc-retensi-kosong"); await K.DB.exec("DROP TABLE cc_hadir");
  assert.match((await bersihkanCc({DB: K.DB}, now, {paksa: true})).lewat, /belum diterapkan/, "tabel belum ada: dilewati, cron lain tidak terganggu");
  assert.match(teks("src/worker.js"), /await bersihkanCc\(env, sekarang\)/, "dipanggil dari bersih-bersih yang SUDAH ADA, bukan cron baru");
});

/* ================================================================ akses */
uji("cc akses: matriks tiap rute (tamu 401, akun gerbang 403, operator, koordalops/pimpinan baca saja, pemirsa dinding hanya dinding, peran lain 403, moderator)", async () => {
  const idA = await tugas(DB, {dibuat: Date.now() - 2 * MENIT}), kunci = "karhutla:" + await kunciPublikKarhutla(idA) + ":siaga";
  const rutes = {
    antrean: ["GET", "/api/cc/antrean", undefined], dinding: ["GET", "/api/cc/dinding", undefined], status: ["GET", "/api/cc/status?kunci=" + kunci, undefined],
    log: ["GET", "/api/cc/log", undefined], kontak: ["GET", "/api/cc/kontak?prov=12", undefined],
    aksi: ["POST", `/api/cc/aksi/${hex16(0x7777)}`, {}]};   // badan SENGAJA salah: auth harus menang atas validasi
  const aktor = {tamu: {}, gerbang: GERBANG, gerbangOrang: GERBANG_ORANG, tmc: tmc.h, pusdalops: pusd.h, kampus: kampus.h, pemirsaDinding: pDinding.h, pemirsaPeta: pPeta.h, koord: koord.h, pim: pim.h, op: op1.h, mod: ADMIN, mod2: MOD2};
  /* [rute][aktor] -> status. Sel kosong tidak diuji. "ok" = bukan 401/403 */
  const T = {
    antrean: {tamu: 401, gerbang: 403, gerbangOrang: 403, tmc: 403, pusdalops: 403, kampus: 403, pemirsaDinding: 403, pemirsaPeta: 403, koord: 200, pim: 200, op: 200, mod: 200, mod2: 200},
    dinding: {tamu: 401, gerbang: 403, gerbangOrang: 403, tmc: 403, pusdalops: 403, kampus: 403, pemirsaDinding: 200, pemirsaPeta: 403, koord: 200, pim: 200, op: 200, mod: 200, mod2: 200},
    status: {tamu: 401, gerbang: 403, gerbangOrang: 403, tmc: 403, pusdalops: 403, kampus: 403, pemirsaDinding: 401, pemirsaPeta: 401, koord: 200, pim: 200, op: 200, mod: 200, mod2: 200},
    log: {tamu: 401, gerbang: 403, gerbangOrang: 403, tmc: 403, pusdalops: 403, kampus: 403, pemirsaDinding: 403, pemirsaPeta: 403, koord: 200, pim: 200, op: 200, mod: 200, mod2: 200},
    kontak: {tamu: 401, gerbang: 403, gerbangOrang: 403, tmc: 403, pusdalops: 403, kampus: 403, pemirsaDinding: 403, pemirsaPeta: 403, koord: 403, pim: 403, op: 200, mod: 200, mod2: 200},
    aksi: {tamu: 401, gerbang: 403, gerbangOrang: 403, tmc: 403, pusdalops: 403, kampus: 403, pemirsaDinding: 403, pemirsaPeta: 403, koord: 403, pim: 403, op: 400, mod: 400, mod2: 400}};   // 400 = lolos auth, badan salah
  for (const [r, [m, j, b]] of Object.entries(rutes)) for (const [a, h] of Object.entries(aktor)) {
    const x = await api(m, j, b, h); assert.equal(x.s, T[r][a], `${r} oleh ${a}: ${x.s} ${x.t.slice(0, 120)}`);
    if (x.s === 401 || x.s === 403) assert.ok(x.j?.galat && !/id|nama|nomor/i.test(JSON.stringify(Object.keys(x.j))), `${r} ${a}: galat berbentuk JSON tanpa data`);
  }
  /* pemirsa ber-tab dinding: tidak ada rute lain yang terbuka, juga lewat metode lain */
  assert.equal((await api("POST", "/api/cc/antrean", {}, pDinding.h)).s, 405);
  /* sandi awal belum diganti: sesi sah tetapi ditahan, 401 dengan penanda wajib_ganti (layar menawarkan sandi baru) */
  const th = await api("GET", "/api/cc/antrean", undefined, tertahan.h); assert.equal(th.s, 401); assert.ok(th.j.wajib_ganti);
  /* kiriman staf tanpa header x-pb: 1 ditolak (SameSite=Lax saja tidak menahan POST lintas situs) */
  assert.equal((await api("POST", `/api/cc/aksi/${idA}`, {dari: "baru", ke: "dalam_konfirmasi"}, {cookie: op1.cookie, origin: PB.origin})).s, 401);
  assert.equal(await statusDari(DB, idA), null, "tidak ada yang tertulis");
  /* sesi staf palsu */
  assert.equal((await api("GET", "/api/cc/antrean", undefined, {cookie: "sesi_staf=" + "a".repeat(64)})).s, 401);
  assert.deepEqual(await Promise.all(["op", "koord", "pim"].map(async k => (await ambil("/api/cc/antrean", aktor[k])).j.saya.tulis)), [true, false, false]);
  /* penanda hak di respons: akun gerbang AKUN_SITUS BUKAN moderator, jadi tidak pernah menulis */
  assert.equal((await aksi(idA, {dari: "baru", ke: "dalam_konfirmasi"}, GERBANG)).s, 403); assert.equal(await statusDari(DB, idA), null);
});

uji("cc status: tamu 401 tanpa menyentuh D1 (tabel dibuang: tamu tetap 401, moderator 503 karena D1 memang dibaca)", async () => {
  const K = await siapkan("uji-cc-kosong"); await K.DB.exec("DROP TABLE tugas_api");
  const kunci = "karhutla:" + "a".repeat(12) + ":siaga";
  const tamu = await K.api("GET", "/api/cc/status?kunci=" + kunci); assert.equal(tamu.s, 401, tamu.t);
  const palsu = await K.api("GET", "/api/cc/status?kunci=" + kunci, undefined, {cookie: "sesi_pemirsa=" + "b".repeat(64)}); assert.equal(palsu.s, 401, "cookie pemirsa bukan kredensial rute ini");
  const mod = await K.api("GET", "/api/cc/status?kunci=" + kunci, undefined, ADMIN); assert.equal(mod.s, 503, mod.t); assert.doesNotMatch(mod.t, /0029|0099|\.sql/, "503 tanpa nomor migrasi");
});

/* ================================================================ antrean */
uji("cc antrean: hanya alert karhutla level 3 dalam 7 hari yang terbuka; terlama di atas; bidang lengkap; aksi menurut hak", async () => {
  const now = Date.now(), A = {};
  A.tua = await tugas(DB, {dibuat: now - 3 * JAM}); A.muda = await tugas(DB, {dibuat: now - 10 * MENIT}); A.konf = await tugas(DB, {dibuat: now - JAM, konfirmasi_pada: now - 20 * MENIT});
  A.kalbar = await tugas(DB, {prov: "61", kab: "Pontianak", dibuat: now - 2 * JAM});
  const X = {l2: await tugas(DB, {level: 2}), l4: await tugas(DB, {level: 4}), lama: await tugas(DB, {dibuat: now - 8 * HARI}), padam: await tugas(DB, {status: "padam"}), banjir: await tugas(DB, {banjir: true}), dum: await tugas(DB, {dummy: 1})};
  const r = await ambil("/api/cc/antrean", op1.h); assert.equal(r.s, 200, r.t);
  const ids = r.j.alert.map(a => a.id);
  for (const k of Object.keys(A)) assert.ok(ids.includes(A[k]), "alert masuk: " + k);
  for (const k of Object.keys(X)) assert.ok(!ids.includes(X[k]), "bukan alert: " + k);
  assert.ok(ids.indexOf(A.tua) < ids.indexOf(A.kalbar) && ids.indexOf(A.kalbar) < ids.indexOf(A.konf) && ids.indexOf(A.konf) < ids.indexOf(A.muda), "baru: terlama di atas");
  const a = r.j.alert.find(x => x.id === A.konf);
  assert.deepEqual(Object.keys(a).sort(), ["aksi", "dibuat", "id", "kab", "kec", "konfirmasi_lapangan", "luas_ha", "n24", "oleh_nama", "prov", "prov_nama", "sejak", "status"]);
  assert.deepEqual([a.status, a.kab, a.kec, a.prov, a.n24, a.luas_ha, a.oleh_nama, a.sejak, a.konfirmasi_lapangan, a.aksi], ["baru", "Kotawaringin Timur", "Mentaya Hilir", "62", 12, 45.5, null, null, true, ["dalam_konfirmasi"]]);
  assert.equal(r.j.alert.find(x => x.id === A.tua).konfirmasi_lapangan, false);
  assert.deepEqual(r.j.saya, {nama: "Budi Santoso", tulis: true}); assert.deepEqual(r.j.shift, {...shiftDari(r.j.kini), ...rentangShift(shiftDari(r.j.kini).tgl, shiftDari(r.j.kini).shift)});
  assert.ok(!Object.keys(a).some(k => ["lat", "lon", "catatan", "wa", "nip", "dummy", "ip_hash"].includes(k)), "koordinat mentah dan data pribadi tidak ikut");
  /* pembaca: sama daftarnya, tanpa aksi */
  const k = await ambil("/api/cc/antrean", koord.h); assert.deepEqual(k.j.alert.map(x => x.id), ids); assert.ok(k.j.alert.every(x => x.aksi.length === 0)); assert.equal(k.j.saya.tulis, false);
  /* moderator melihat juga yang dummy */
  const m = await ambil("/api/cc/antrean", ADMIN); assert.ok(m.j.alert.map(x => x.id).includes(X.dum)); assert.ok(m.j.alert.find(x => x.id === A.tua).aksi.length === 1);
  assert.deepEqual(Object.fromEntries(STATUS.map(s => [s, aksiBoleh(s, true)])), {baru: ["dalam_konfirmasi"], dalam_konfirmasi: ["ada_api", "tidak_ada_api"], ada_api: ["dalam_konfirmasi"], tidak_ada_api: ["dalam_konfirmasi"]});
  assert.ok(STATUS.every(s => aksiBoleh(s, false).length === 0));
});

uji("cc antrean: dalam_konfirmasi menyusul baru; keputusan akhir 12 jam terakhir tampil; lebih tua atau tugas tutup hilang", async () => {
  const now = Date.now(), t = {baru: await tugas(DB, {dibuat: now - 5 * MENIT}), dalam: await tugas(DB, {dibuat: now - 4 * JAM}), dalam2: await tugas(DB, {dibuat: now - 3 * JAM}),
    final1: await tugas(DB, {dibuat: now - 5 * JAM}), final2: await tugas(DB, {dibuat: now - 6 * JAM}), finalLama: await tugas(DB, {dibuat: now - 20 * JAM}), tutup: await tugas(DB, {dibuat: now - 2 * JAM, status: "padam"})};
  const st = (id, status, sejak, oleh = op2.oleh) => sisip(DB, "cc_status", {tugas_id: id, status, oleh, sejak});
  await st(t.dalam, "dalam_konfirmasi", now - 30 * MENIT); await st(t.dalam2, "dalam_konfirmasi", now - 2 * MENIT, "abcdef123456");   // pelaku moderator: awalan token
  await st(t.final1, "ada_api", now - 2 * JAM); await st(t.final2, "tidak_ada_api", now - 1 * JAM); await st(t.finalLama, "ada_api", now - 13 * JAM);
  await st(t.tutup, "dalam_konfirmasi", now - 10 * MENIT);   // tugas sudah padam: hilang walau belum final
  const r = await ambil("/api/cc/antrean", pim.h), kunciIni = Object.values(t), urutIni = r.j.alert.filter(a => kunciIni.includes(a.id));
  assert.deepEqual(urutIni.map(a => a.id), [t.baru, t.dalam, t.dalam2, t.final2, t.final1], "baru, dalam_konfirmasi (terlama atas), final (terbaru atas); final > 12 jam dan tugas tutup tidak tampil");
  assert.deepEqual(urutIni.map(a => [a.status, a.oleh_nama]), [["baru", null], ["dalam_konfirmasi", "Citra Dewi"], ["dalam_konfirmasi", "Moderator"], ["tidak_ada_api", "Citra Dewi"], ["ada_api", "Citra Dewi"]]);
  assert.ok(urutIni.every(a => a.status === "baru" || typeof a.sejak === "number"));
});

/* ================================================================ aksi */
uji("cc aksi: semua pasangan transisi (16) mengikuti tabel; jejak hanya untuk yang sah; koreksi wajib catatan; rantai jejak tak putus", async () => {
  const JALAN = {baru: [], dalam_konfirmasi: [["baru", "dalam_konfirmasi"]], ada_api: [["baru", "dalam_konfirmasi"], ["dalam_konfirmasi", "ada_api"]], tidak_ada_api: [["baru", "dalam_konfirmasi"], ["dalam_konfirmasi", "tidak_ada_api"]]};
  let sah = 0;
  for (const dari of STATUS) for (const ke of STATUS) {
    const id = await tugas(DB); for (const [d, k] of JALAN[dari]) assert.equal((await aksi(id, {dari: d, ke: k}, op1.h)).s, 200);
    const sebelum = (await jejakDari(DB, id)).length, awal = (await statusDari(DB, id))?.status ?? "baru";
    const r = await aksi(id, {dari, ke, catatan: "koreksi karena salah klik"}, op1.h);
    if (ke !== "baru" && TRANSISI[dari].includes(ke)) {
      sah++; assert.equal(r.s, 200, `${dari}->${ke}: ${r.t}`); assert.deepEqual([r.j.id, r.j.status, r.j.oleh_nama, r.j.aksi], [id, ke, "Budi Santoso", TRANSISI[ke]]);
      assert.equal((await statusDari(DB, id)).status, ke); const j = await jejakDari(DB, id); assert.equal(j.length, sebelum + 1); assert.deepEqual([j.at(-1).dari, j.at(-1).ke, j.at(-1).oleh], [dari, ke, op1.oleh]);
      for (let i = 1; i < j.length; i++) assert.equal(j[i].dari, j[i - 1].ke, "rantai jejak tak putus");
    } else { assert.equal(r.s, 400, `${dari}->${ke}: ${r.t}`); assert.equal((await statusDari(DB, id))?.status ?? "baru", awal); assert.equal((await jejakDari(DB, id)).length, sebelum, "tak sah: tak ada jejak"); }
  }
  assert.equal(sah, 5, "lima transisi sah: baru->dalam (1), dalam->final (2), final->dalam sebagai koreksi (2)");
  /* catatan: opsional di transisi biasa (disimpan), wajib 3+ huruf di koreksi, maks 300 */
  const id = await tugas(DB);
  assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi", catatan: "  telepon Kalaksa 14.05  "}, op1.h)).s, 200); assert.equal((await jejakDari(DB, id))[0].catatan, "telepon Kalaksa 14.05");
  assert.equal((await aksi(id, {dari: "dalam_konfirmasi", ke: "ada_api"}, op1.h)).s, 200); assert.equal((await jejakDari(DB, id))[1].catatan, null);
  for (const c of [undefined, null, "", "  ", "ab", " ab "]) assert.equal((await aksi(id, {dari: "ada_api", ke: "dalam_konfirmasi", catatan: c}, op1.h)).s, 400, "koreksi tanpa catatan 3+ huruf: " + JSON.stringify(c));
  assert.equal((await statusDari(DB, id)).status, "ada_api"); assert.equal((await jejakDari(DB, id)).length, 2);
  assert.equal((await aksi(id, {dari: "ada_api", ke: "dalam_konfirmasi", catatan: "x".repeat(301)}, op1.h)).s, 400);
  assert.equal((await aksi(id, {dari: "ada_api", ke: "dalam_konfirmasi", catatan: "abc"}, op1.h)).s, 200);
  assert.equal((await aksi(id, {dari: "dalam_konfirmasi", ke: "tidak_ada_api", catatan: 5}, op1.h)).s, 400, "catatan bukan teks");
  /* tugas_api tidak disentuh */
  const t = await DB.prepare("SELECT status, konfirmasi_pada, isian_terakhir FROM tugas_api WHERE id = ?").bind(id).first(); assert.deepEqual([t.status, t.konfirmasi_pada, t.isian_terakhir], ["buka", null, null]);
  assert.equal((await DB.prepare("SELECT count(*) n FROM tugas_isian WHERE tugas_id = ?").bind(id).first()).n, 0);
});

uji("cc aksi: compare-and-set; kalah balapan 409 membawa status sekarang dan TIDAK menulis jejak; dua klik serentak satu pemenang", async () => {
  const id = await tugas(DB);
  assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, op1.h)).s, 200);
  const kalah = await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, op2.h);   // operator 2 melihat layar lama: masih 'baru'
  assert.equal(kalah.s, 409); assert.deepEqual([kalah.j.status, kalah.j.oleh_nama], ["dalam_konfirmasi", "Budi Santoso"]); assert.ok(kalah.j.galat);
  assert.equal((await jejakDari(DB, id)).length, 1, "klik yang kalah tidak meninggalkan jejak"); assert.equal((await statusDari(DB, id)).oleh, op1.oleh, "pemegang tetap pemenang");
  assert.equal((await aksi(id, {dari: "dalam_konfirmasi", ke: "ada_api"}, op1.h)).s, 200);
  const k2 = await aksi(id, {dari: "dalam_konfirmasi", ke: "tidak_ada_api"}, op2.h); assert.equal(k2.s, 409); assert.equal(k2.j.status, "ada_api");
  assert.equal((await aksi(id, {dari: "dalam_konfirmasi", ke: "ada_api"}, op2.h)).s, 409, "pasangan sama pun 409 bila statusnya sudah lewat");
  assert.equal((await jejakDari(DB, id)).length, 2); assert.equal((await statusDari(DB, id)).status, "ada_api");
  /* serentak: tepat satu 200, sisanya 409, satu jejak */
  const b = await tugas(DB), hasil = await Promise.all([op1, op2, opWil, koord].map(o => aksi(b, {dari: "baru", ke: "dalam_konfirmasi"}, o.h)));
  assert.deepEqual(hasil.map(h => h.s).sort(), [200, 403, 409, 409], hasil.map(h => h.s).join()); assert.equal((await jejakDari(DB, b)).length, 1);
  const menang = hasil.findIndex(h => h.s === 200); assert.equal((await statusDari(DB, b)).oleh, [op1, op2, opWil][menang].oleh);
  /* invarian: tiap tugas, jejak berantai dari baru dan status akhir = ke terakhir */
  const rantai = await DB.prepare("SELECT tugas_id, group_concat(dari || '>' || ke, ' ') r FROM (SELECT * FROM cc_jejak ORDER BY id) WHERE tugas_id IN (?, ?) GROUP BY tugas_id").bind(id, b).all();
  assert.deepEqual(rantai.results.map(r => r.r).sort(), ["baru>dalam_konfirmasi", "baru>dalam_konfirmasi dalam_konfirmasi>ada_api"]);
});

uji("cc aksi: bukan alert, di luar 7 hari, dummy bagi pelaku nyata, id tak ada = 404; badan salah 400; badan besar 413; tidak menulis", async () => {
  const now = Date.now(), K = {l2: await tugas(DB, {level: 2}), lama: await tugas(DB, {dibuat: now - 8 * HARI}), banjir: await tugas(DB, {banjir: true}), dum: await tugas(DB, {dummy: 1}), ada: hex16(0x7778)};
  for (const [k, id] of Object.entries(K)) { const r = await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, op1.h); assert.equal(r.s, 404, k); assert.equal(await statusDari(DB, id), null, k); assert.equal((await jejakDari(DB, id)).length, 0, k); }
  const id = await tugas(DB);
  for (const [b, pola] of [[{dari: "x", ke: "dalam_konfirmasi"}, /dari harus/], [{ke: "dalam_konfirmasi"}, /dari harus/], [{dari: "baru", ke: "baru"}, /ke harus/], [{dari: "baru"}, /ke harus/], [{dari: "baru", ke: "ada_api"}, /tidak diizinkan/],
    [{dari: 1, ke: 2}, /dari harus/], [{dari: ["baru"], ke: "dalam_konfirmasi"}, /dari harus/], [[1], /objek/], ["{rusak", /JSON/]]) {
    const r = await aksi(id, b, op1.h); assert.equal(r.s, 400, JSON.stringify(b)); assert.match(r.j.galat, pola);
  }
  assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi", catatan: "a".repeat(3000)}, op1.h)).s, 413);
  assert.equal(await statusDari(DB, id), null); assert.equal((await jejakDari(DB, id)).length, 0);
  assert.equal((await api("POST", `/api/cc/aksi/${id}`, {dari: "baru", ke: "dalam_konfirmasi"}, {...ADMIN, origin: "https://jahat.example"})).s, 403, "origin lain ditolak (CSRF)");
  assert.equal((await api("GET", `/api/cc/aksi/${id}`, undefined, op1.h)).s, 405);
});

uji("cc aksi: batas laju 120 per pelaku per jam (429 + Retry-After, tanpa tulisan); salah bentuk tidak memakai jatah; pelaku lain dan jendela lain tidak ikut; moderator juga dibatasi", async () => {
  const lj = await staf(DB, "Laju Aksi", ["operator_cc"]), id = await tugas(DB), laju = (kunci) => DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = 'cc.aksi'").bind(kunci).first().then(r => r.n);
  assert.equal((await aksi(id, {dari: "baru", ke: "selesai"}, lj.h)).s, 400); assert.equal((await aksi(id, {dari: "baru", ke: "ada_api"}, lj.h)).s, 400); assert.equal(await laju(lj.oleh), 0, "salah bentuk: jatah utuh");
  assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, {})).s, 401); assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, koord.h)).s, 403); assert.equal(await laju(koord.oleh), 0, "ditolak sebelum laju: pembaca tidak menulis laju_bnpb");
  /* 118 lama di jendela dan 5 di luar jendela (> 1 jam): hanya yang di jendela dihitung */
  await DB.batch([...Array.from({length: 118}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'cc.aksi', ?)").bind(lj.oleh, Date.now() - 10 * MENIT)),
    ...Array.from({length: 5}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'cc.aksi', ?)").bind(lj.oleh, Date.now() - 2 * JAM))]);
  assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, lj.h)).s, 200, "ke-119");
  assert.equal((await aksi(id, {dari: "dalam_konfirmasi", ke: "ada_api"}, lj.h)).s, 200, "ke-120 masih boleh");
  const tolak = await aksi(id, {dari: "ada_api", ke: "dalam_konfirmasi", catatan: "koreksi uji"}, lj.h); assert.equal(tolak.s, 429, tolak.t); assert.equal(tolak.h.get("retry-after"), "3600"); assert.match(tolak.j.galat, /cc\.aksi.*120/);
  assert.equal((await statusDari(DB, id)).status, "ada_api", "429: status tidak berubah"); assert.equal((await jejakDari(DB, id)).length, 2, "429: tanpa jejak"); assert.equal(await laju(lj.oleh), 118 + 5 + 2, "yang ditolak tidak menambah catatan laju");
  assert.equal((await aksi(id, {dari: "ada_api", ke: "dalam_konfirmasi", catatan: "koreksi uji"}, op2.h)).s, 200, "operator lain tidak ikut terhitung");
  /* moderator: kuncinya hash token (server saja) */
  const mod = sha256("rahasia-admin").slice(0, 12), id2 = await tugas(DB);
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'cc.aksi', ?)").bind(mod, Date.now())));
  const m = await aksi(id2, {dari: "baru", ke: "dalam_konfirmasi"}, ADMIN); assert.equal(m.s, 429); assert.equal(m.h.get("retry-after"), "3600"); assert.ok(!m.t.includes(mod), "hash tidak ikut di badan galat");
  assert.equal((await aksi(id2, {dari: "baru", ke: "dalam_konfirmasi"}, MOD2)).s, 200, "moderator lain (token lain) tidak ikut");
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ? AND aksi = 'cc.aksi'").bind(mod).run();   // supaya uji berikutnya yang memakai ADMIN tidak terhalang
});

/* ================================================================ wilayah dan dummy */
uji("cc wilayah: staf berwilayah hanya melihat dan menindak provinsinya; di luar itu 404/403; log tersaring", async () => {
  const a62 = await tugas(DB, {prov: "62"}), a61 = await tugas(DB, {prov: "61", kab: "Pontianak"});
  const r = await ambil("/api/cc/antrean", opWil.h), ids = r.j.alert.map(a => a.id); assert.ok(ids.includes(a62) && !ids.includes(a61)); assert.ok(r.j.alert.every(a => a.prov === "62"));
  assert.ok((await ambil("/api/cc/antrean", op1.h)).j.alert.some(a => a.id === a61), "operator nasional melihat kedua provinsi");
  const luar = await aksi(a61, {dari: "baru", ke: "dalam_konfirmasi"}, opWil.h); assert.equal(luar.s, 404); assert.equal(await statusDari(DB, a61), null);
  assert.equal((await aksi(a62, {dari: "baru", ke: "dalam_konfirmasi"}, opWil.h)).s, 200);
  const k61 = "karhutla:" + await kunciPublikKarhutla(a61) + ":siaga";
  assert.equal((await ambil("/api/cc/status?kunci=" + k61, opWil.h)).s, 404, "kunci alert provinsi lain: sama dengan tidak ada"); assert.equal((await ambil("/api/cc/status?kunci=" + k61, op1.h)).s, 200);
  assert.equal((await ambil("/api/cc/kontak?prov=61", opWil.h)).s, 403); assert.equal((await ambil("/api/cc/kontak?prov=62", opWil.h)).s, 200);
  /* log: baris tugas provinsi lain tidak terlihat staf berwilayah */
  const tgl = "2026-10-18", w = wibMs(tgl, 9);
  await sisip(DB, "cc_jejak", {waktu: w, tugas_id: a62, oleh: op1.oleh, dari: "baru", ke: "dalam_konfirmasi"}); await sisip(DB, "cc_jejak", {waktu: w + 1, tugas_id: a61, oleh: op1.oleh, dari: "baru", ke: "dalam_konfirmasi"});
  const l1 = await ambil(`/api/cc/log?tgl=${tgl}`, op1.h), l2 = await ambil(`/api/cc/log?tgl=${tgl}`, opWil.h);
  assert.deepEqual(l1.j.jejak.map(j => j.prov), ["62", "61"]); assert.deepEqual(l2.j.jejak.map(j => j.prov), ["62"]);
  /* dinding juga tersaring */
  const d1 = await ambil("/api/cc/dinding", opWil.h); assert.ok(d1.j.antrean.every(x => x.prov === "62"));
});

uji("cc dummy: baris dummy hanya untuk moderator dan staf dummy; pelaku nyata tidak melihat dan tidak menyentuhnya; jejak dummy ikut tugasnya", async () => {
  const dum = await tugas(DB, {dummy: 1}), nyata = await tugas(DB), opDum = await staf(DB, "Operator Dummy", ["operator_cc"], {dummy: 1});
  for (const h of [op1.h, koord.h, pDinding.h]) { const j = (await ambil(h === pDinding.h ? "/api/cc/dinding" : "/api/cc/antrean", h)).j; assert.ok(!(j.alert ?? j.antrean).some(a => a.id === dum), "dummy tak terlihat"); }
  assert.equal((await aksi(dum, {dari: "baru", ke: "dalam_konfirmasi"}, op1.h)).s, 404);
  assert.equal((await ambil("/api/cc/status?kunci=karhutla:" + await kunciPublikKarhutla(dum) + ":siaga", op1.h)).s, 404);
  /* moderator dan staf dummy: boleh; baris ber-tanda dummy sesuai tugasnya */
  assert.equal((await aksi(dum, {dari: "baru", ke: "dalam_konfirmasi"}, ADMIN)).s, 200); assert.equal((await statusDari(DB, dum)).dummy, 1); assert.deepEqual((await jejakDari(DB, dum)).map(j => j.dummy), [1]);
  assert.ok((await ambil("/api/cc/antrean", opDum.h)).j.alert.some(a => a.id === dum), "staf dummy melihat dummy");
  assert.equal((await aksi(dum, {dari: "dalam_konfirmasi", ke: "ada_api"}, opDum.h)).s, 200);
  /* moderator menindak tugas NYATA: barisnya nyata (dummy = 0), terlihat di log nyata */
  assert.equal((await aksi(nyata, {dari: "baru", ke: "dalam_konfirmasi"}, ADMIN)).s, 200); assert.deepEqual((await jejakDari(DB, nyata)).map(j => [j.dummy, j.oleh.length]), [[0, 12]]);
  assert.equal((await statusDari(DB, nyata)).oleh.length, 12, "pelaku moderator = awalan token (12 heks), bukan token");
  /* log: jejak dummy hanya terlihat moderator dan staf dummy */
  const tgl = "2026-10-17", w = wibMs(tgl, 10);
  await sisip(DB, "cc_jejak", {waktu: w, tugas_id: dum, oleh: opDum.oleh, dari: "baru", ke: "dalam_konfirmasi", dummy: 1}); await sisip(DB, "cc_jejak", {waktu: w + 1, tugas_id: nyata, oleh: op1.oleh, dari: "baru", ke: "dalam_konfirmasi"});
  assert.equal((await ambil(`/api/cc/log?tgl=${tgl}`, op1.h)).j.jejak.length, 1); assert.equal((await ambil(`/api/cc/log?tgl=${tgl}`, ADMIN)).j.jejak.length, 2); assert.equal((await ambil(`/api/cc/log?tgl=${tgl}`, opDum.h)).j.jejak.length, 2);
  /* kehadiran dummy tidak tampil di dinding nyata */
  await ambil("/api/cc/antrean", opDum.h); await ambil("/api/cc/antrean", op2.h);
  const d = (await ambil("/api/cc/dinding", pDinding.h)).j.operator_hadir;
  assert.equal((await DB.prepare("SELECT dummy FROM cc_hadir WHERE staf_id = ?").bind(opDum.id).first()).dummy, 1, "baris hadir staf dummy ditandai dummy");
  assert.ok(d.includes("Citra") && !d.includes("Operator"), "dinding nyata: operator nyata saja: " + d);
  assert.ok((await ambil("/api/cc/dinding", ADMIN)).j.operator_hadir.includes("Operator"), "moderator melihat yang dummy");
});

/* ================================================================ status by kunci */
uji("cc status: pop-up alarm menemukan alert lewat kunci publik yang SAMA dengan feed peringatan; 400 salah bentuk, 404 tak cocok; tamu 401", async () => {
  const id = await tugas(DB, {dibuat: Date.now() - 20 * MENIT, kab: "Kapuas"}), kunci = "karhutla:" + await kunciPublikKarhutla(id) + ":siaga";
  assert.match(kunci, /^karhutla:[0-9a-f]{12}:siaga$/); assert.equal(kunciPublikKarhutla.length, 1);
  /* feed peringatan menulis kunci dengan fungsi yang sama: ambil dari tabel peringatan yang diisi aturan karhutla sungguhan */
  let t = Date.now(); if (new Date(t).getUTCMinutes() % 10 === 0) t += 60e3;
  await periksaPeringatan({DB}, t);
  const feed = (await DB.prepare("SELECT kunci FROM peringatan WHERE jenis = 'karhutla'").all()).results.map(r => r.kunci); assert.ok(feed.includes(kunci), "kunci feed == kunci status: " + feed.length);
  assert.doesNotMatch(feed.join(), new RegExp(id), "id tugas tidak keluar di feed");
  const r = await ambil("/api/cc/status?kunci=" + encodeURIComponent(kunci), op1.h); assert.equal(r.s, 200, r.t);
  assert.deepEqual(Object.keys(r.j), ["id", "prov", "kab", "status", "oleh_nama", "sejak", "aksi"]); assert.deepEqual(r.j, {id, prov: "62", kab: "Kapuas", status: "baru", oleh_nama: null, sejak: null, aksi: ["dalam_konfirmasi"]});
  assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, op2.h)).s, 200);
  const s2 = await ambil("/api/cc/status?kunci=" + encodeURIComponent(kunci), op1.h); assert.deepEqual([s2.j.status, s2.j.oleh_nama, typeof s2.j.sejak, s2.j.aksi], ["dalam_konfirmasi", "Citra Dewi", "number", ["ada_api", "tidak_ada_api"]]);
  const sk = await ambil("/api/cc/status?kunci=" + encodeURIComponent(kunci), koord.h); assert.equal(sk.s, 200); assert.deepEqual(sk.j.aksi, [], "pembaca: tanpa aksi");
  assert.equal((await ambil("/api/cc/status?kunci=" + encodeURIComponent(kunci), ADMIN)).s, 200);
  for (const [k, kode] of [["karhutla:" + "0".repeat(12) + ":siaga", 404], ["karhutla:abc:siaga", 400], ["gempa:" + "0".repeat(12) + ":siaga", 400], ["karhutla:" + "A".repeat(12) + ":siaga", 400], ["karhutla:" + "0".repeat(12) + ":awas", 400], ["", 400]])
    assert.equal((await ambil("/api/cc/status?kunci=" + encodeURIComponent(k), op1.h)).s, kode, k);
  assert.equal((await api("GET", "/api/cc/status", undefined, op1.h)).s, 400, "tanpa kunci");
  assert.equal((await ambil("/api/cc/status?kunci=" + encodeURIComponent(kunci))).s, 401); assert.equal((await ambil("/api/cc/status?kunci=" + encodeURIComponent(kunci), tmc.h)).s, 403);
  assert.equal((await ambil("/api/cc/status?kunci=" + encodeURIComponent(kunci), pDinding.h)).s, 401, "cookie pemirsa tidak dihitung");
  /* tugas lewat 7 hari tidak ditemukan walau kuncinya benar */
  const tua = await tugas(DB, {dibuat: Date.now() - 8 * HARI}); assert.equal((await ambil("/api/cc/status?kunci=karhutla:" + await kunciPublikKarhutla(tua) + ":siaga", op1.h)).s, 404);
});

/* ================================================================ kehadiran */
uji("cc hadir: panggilan operator memperbarui cc_hadir paling sering sekali per 5 menit; moderator, koordalops, pimpinan tidak tercatat", async () => {
  const o = await staf(DB, "Hadir Uji", ["operator_cc"]), baris = () => DB.prepare("SELECT terakhir, dummy FROM cc_hadir WHERE staf_id = ?").bind(o.id).first();
  assert.equal(await baris(), null);
  const t0 = Date.now(); assert.equal((await ambil("/api/cc/antrean", o.h)).s, 200);
  const a = await baris(); assert.ok(a.terakhir >= t0 && a.terakhir <= Date.now()); assert.equal(a.dummy, 0);
  await ambil("/api/cc/antrean", o.h); await ambil("/api/cc/antrean", o.h); assert.equal((await baris()).terakhir, a.terakhir, "dalam 5 menit: tidak ditulis ulang");
  await DB.prepare("UPDATE cc_hadir SET terakhir = ? WHERE staf_id = ?").bind(Date.now() - 6 * MENIT, o.id).run();
  await ambil("/api/cc/antrean", o.h); const b = await baris(); assert.ok(b.terakhir > Date.now() - 60e3, "lewat 5 menit: diperbarui");
  await DB.prepare("UPDATE cc_hadir SET terakhir = ? WHERE staf_id = ?").bind(Date.now() - 4 * MENIT, o.id).run(); const c0 = (await baris()).terakhir;
  await ambil("/api/cc/antrean", o.h); assert.equal((await baris()).terakhir, c0, "4 menit: belum");
  const n0 = (await DB.prepare("SELECT count(*) n FROM cc_hadir").first()).n;
  for (const h of [ADMIN, koord.h, pim.h]) await ambil("/api/cc/antrean", h); await ambil("/api/cc/dinding", pDinding.h);
  assert.equal((await DB.prepare("SELECT count(*) n FROM cc_hadir").first()).n, n0);
});

/* ================================================================ kontak */
uji("cc kontak: hanya nomor kantor/Pusdalops BPBD; nomor pribadi, ajudan, e-mail tak pernah keluar; bpbd.json cadangan; ditolak untuk pemirsa/koordalops/pimpinan; batas laju per operator", async () => {
  const kp = (o) => sisip(DB, "kontak_pemangku", {id: hex16(0xa000 + ++tn), kategori: "bpbd", prov: "12", kab: "Kota Medan", jabatan: "Staf", status: "aktif", notif: 1, ambang: "siaga", dibuat: 1, diubah: 1, ...o});
  await kp({nama: "Pusdalops BPBD Kota Medan", jabatan: "Piket 24 jam", lembaga: "BPBD Kota Medan", telepon: "061 4567890", email: "pusdalops@medan.go.id"});
  await kp({nama: "Budi Kalaksa", jabatan: "Kepala Pelaksana", wa: "6281299990000", telepon: "0812-3456-789", ajudan: "Ajudan Rahasia", ajudan_wa: "6281388880000", email: "budi@medan.go.id"});
  await kp({nama: "Posko TNI Medan", kategori: "tni", telepon: "061 1112222", wa: "6281200000001"});
  await kp({nama: "Pusdalops Menunggu", status: "menunggu", setuju_pdp: 1, telepon: "061 3334444", wa: "6281200000002"});
  await kp({nama: "Pusdalops BPBD Provinsi Sumut", jabatan: "Posko", kab: null, telepon: "061 5556666", email: "p@sumut.go.id"});
  /* orang berjabatan Pusdalops/Piket (label HANYA di jabatan) dan unit tanpa telepon kantor (hanya WA): tidak pernah keluar, juga bila punya telepon atau WA */
  await kp({nama: "Rina Operator", jabatan: "Operator Pusdalops", wa: "6285511112222"});
  await kp({nama: "Dian Kepala", jabatan: "Kepala Pusdalops", telepon: "0811 2223 3344", wa: "6281122233344"});
  await kp({nama: "Eko Wibowo", jabatan: "Piket", telepon: "061 7778888", wa: "6281255556666"});
  await kp({nama: "Pusdalops BPBD Cadangan", wa: "6281277778888"});
  await kp({nama: "Posko Siaga Medan", telepon: "061 9990000", wa: "6281266667777"});
  const r = await ambil("/api/cc/kontak?prov=12&kab=kota%20medan", op1.h); assert.equal(r.s, 200, r.t);
  const per = Object.fromEntries(r.j.kontak.map(k => [k.nomor, k]));
  assert.deepEqual(Object.keys(r.j), ["prov", "kab", "kontak"]); assert.ok(r.j.kontak.every(k => Object.keys(k).sort().join() === "label,nomor,sumber,tingkat"), "kolom minimum");
  assert.deepEqual(per["061 4567890"] && [per["061 4567890"].label, per["061 4567890"].tingkat, per["061 4567890"].sumber], ["Pusdalops BPBD Kota Medan", "kabupaten", "buku_kontak"]);
  assert.equal(per["+6285511112222"], undefined, "label Pusdalops hanya di jabatan = orang: WA pribadinya TIDAK keluar (bukan lagi label jabatannya)");
  assert.deepEqual([per["061 9990000"]?.label, per["061 9990000"]?.tingkat, per["061 9990000"]?.sumber], ["Posko Siaga Medan", "kabupaten", "buku_kontak"], "unit bernama posko bertelepon kantor: keluar telepon kantornya, bukan WA-nya");
  assert.deepEqual(r.j.kontak.filter(k => k.sumber === "buku_kontak").map(k => k.nomor).sort(), ["061 4567890", "061 5556666", "061 9990000"], "dari buku kontak HANYA telepon kantor entri bernama unit");
  assert.equal(per["061 5556666"]?.tingkat, "provinsi"); assert.equal(per["0878-6940-0780"]?.sumber, "bpbd_json"); assert.equal(per["0878-6940-0780"]?.tingkat, "kabupaten"); assert.equal(per["0853-5900-0878"]?.tingkat, "provinsi");
  assert.equal(r.j.kontak.findIndex(k => k.tingkat === "provinsi") > r.j.kontak.findLastIndex(k => k.tingkat === "kabupaten"), true, "kabupaten lebih dulu");
  const mentah = JSON.stringify(r.j); for (const rahasia of ["Budi Kalaksa", "Kepala Pelaksana", "6281299990000", "0812-3456-789", "Ajudan", "6281388880000", "@medan.go.id", "p@sumut", "Rina", "Posko TNI", "061 1112222", "Menunggu", "061 3334444", "6281200000001",
    "6285511112222", "Operator Pusdalops", "Kepala Pusdalops", "Dian", "0811 2223 3344", "6281122233344", "Eko Wibowo", "Piket", "061 7778888", "6281255556666", "Cadangan", "6281277778888", "6281266667777"])
    assert.ok(!mentah.includes(rahasia), "tidak boleh keluar: " + rahasia);
  /* tanpa kab: hanya tingkat provinsi */
  const p = await ambil("/api/cc/kontak?prov=12", op1.h); assert.deepEqual(p.j.kontak.map(k => k.tingkat), ["provinsi", "provinsi"]); assert.deepEqual(p.j.kontak.map(k => k.nomor).sort(), ["061 5556666", "0853-5900-0878"]);
  /* bpbd.json: nilai bukan nomor (nama orang, e-mail) dibuang; dua nomor satu sel dipecah */
  assert.deepEqual((await ambil("/api/cc/kontak?prov=11&kab=Aceh%20Besar", op1.h)).j.kontak.map(k => [k.nomor, k.tingkat]), [["0813-6066-9111", "provinsi"]], "'Bp. Iqbal' bukan nomor");
  assert.deepEqual((await ambil("/api/cc/kontak?prov=13", op1.h)).j.kontak.map(k => k.nomor), ["0751-71394", "0751-713944"]);
  assert.deepEqual((await ambil("/api/cc/kontak?prov=13&kab=Kepulauan%20Mentawai", op1.h)).j.kontak.map(k => [k.sumber, k.tingkat]), [["bpbd_json", "provinsi"], ["bpbd_json", "provinsi"]], "e-mail kabupaten bukan nomor: hanya dua nomor provinsi yang tersisa");
  assert.deepEqual((await ambil("/api/cc/kontak?prov=62", ADMIN)).j.kontak.map(k => k.tingkat), []);
  /* validasi dan hak */
  for (const j of ["/api/cc/kontak", "/api/cc/kontak?prov=99", "/api/cc/kontak?prov=1", "/api/cc/kontak?prov=12&kab=a", "/api/cc/kontak?prov=12&kab=" + "x".repeat(61)]) assert.equal((await ambil(j, op1.h)).s, 400, j);
  for (const [h, kode] of [[pDinding.h, 403], [koord.h, 403], [pim.h, 403], [GERBANG, 403], [{}, 401]]) assert.equal((await ambil("/api/cc/kontak?prov=12", h)).s, kode);
  /* batas laju per operator: 120 per jam */
  const lj = await staf(DB, "Laju Uji", ["operator_cc"]);
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'cc.kontak', ?)").bind(lj.oleh, Date.now())));
  const l = await ambil("/api/cc/kontak?prov=12", lj.h); assert.equal(l.s, 429); assert.ok(l.h.get("retry-after")); assert.equal((await ambil("/api/cc/kontak?prov=12", op2.h)).s, 200, "operator lain tidak ikut terhitung");
  assert.deepEqual([nomorDari("Bp. Iqbal"), nomorDari("bpbdmentawai@ymail.com"), nomorDari("12345"), nomorDari(null)], [[], [], [], []]);
  assert.deepEqual(nomorDari("0751-71394  / '0751-713944"), ["0751-71394", "0751-713944"]); assert.deepEqual(nomorDari("+62 812 3456 7890"), ["+62 812 3456 7890"]);
});

uji("cc kontak: beberapa lokasi sekali panggil (maks 20, satu hitungan laju per panggilan); tiap lokasi sama persis dengan panggilan tunggalnya; validasi dan wilayah per lokasi; kolom minimum", async () => {
  const lokasi = ["12|Kota Medan", "12", "12|Kab Tak Ada", "11|Aceh Besar", "13|Kepulauan Mentawai", "13", "62|Kapuas", "62|"];
  const tunggal = await Promise.all(lokasi.map(l => { const [p, k] = l.split("|"); return ambil("/api/cc/kontak?prov=" + p + (k ? "&kab=" + encodeURIComponent(k) : ""), op1.h); }));
  assert.ok(tunggal.every(r => r.s === 200), tunggal.map(r => r.s).join());
  const ujiLaju = await staf(DB, "Laju Banyak", ["operator_cc"]), nLaju = () => DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = 'cc.kontak'").bind(ujiLaju.oleh).first().then(r => r.n);
  const qs = ls => new URLSearchParams(ls.map(l => ["lokasi", l])).toString(), banyak = await ambil("/api/cc/kontak?" + qs(lokasi), ujiLaju.h); assert.equal(banyak.s, 200, banyak.t);
  assert.deepEqual(Object.keys(banyak.j), ["lokasi"]); assert.equal(banyak.j.lokasi.length, lokasi.length, "searah permintaan");
  banyak.j.lokasi.forEach((x, i) => { assert.deepEqual(x, tunggal[i].j, "lokasi " + lokasi[i] + " sama dengan panggilan tunggal"); assert.deepEqual(Object.keys(x), ["prov", "kab", "kontak"]); assert.ok(x.kontak.every(k => Object.keys(k).sort().join() === "label,nomor,sumber,tingkat"), "kolom minimum"); });
  assert.ok(banyak.j.lokasi[0].kontak.length >= 2 && banyak.j.lokasi[0].kab === "Kota Medan", "Medan ada nomornya"); assert.equal(banyak.j.lokasi[1].kab, null); assert.equal(banyak.j.lokasi[7].kab, null, "'62|' = hanya provinsi");
  assert.deepEqual(banyak.j.lokasi[2].kontak.map(k => k.tingkat), banyak.j.lokasi[1].kontak.map(k => k.tingkat), "kabupaten tak dikenal: hanya tingkat provinsi, sama dengan tanpa kab");
  assert.equal(await nLaju(), 1, "SATU hitungan laju untuk delapan lokasi (bukan delapan)");
  const mentah = JSON.stringify(banyak.j); for (const rahasia of ["Budi Kalaksa", "6281299990000", "Ajudan", "@medan.go.id", "Rina", "Posko TNI", "6285511112222", "6281255556666"]) assert.ok(!mentah.includes(rahasia), "tidak boleh keluar: " + rahasia);
  /* 20 lokasi sah, 21 ditolak; satu panggilan tetap satu hitungan */
  const dua0 = Array.from({length: 20}, (_, i) => i % 2 ? "12|Kota Medan" : "13"); const p20 = await ambil("/api/cc/kontak?" + qs(dua0), ujiLaju.h); assert.equal(p20.s, 200); assert.equal(p20.j.lokasi.length, 20); assert.equal(await nLaju(), 2);
  const p21 = await ambil("/api/cc/kontak?" + qs([...dua0, "12"]), ujiLaju.h); assert.equal(p21.s, 400); assert.match(p21.j.galat, /maksimal 20/); assert.equal(await nLaju(), 2, "ditolak sebelum laju");
  /* validasi per lokasi: satu yang salah menggagalkan seluruh panggilan (400), tanpa hitungan laju */
  for (const buruk of [["12|Kota Medan", "99"], ["12|Kota Medan", "1"], ["12|Kota Medan", "12|a"], ["12|Kota Medan", "12|" + "x".repeat(61)], ["", "12"], ["12|Kota Medan", "abc|Medan"]]) { const r = await ambil("/api/cc/kontak?" + qs(buruk), ujiLaju.h); assert.equal(r.s, 400, JSON.stringify(buruk)); }
  assert.equal((await ambil("/api/cc/kontak?lokasi=12&prov=12", ujiLaju.h)).s, 400, "lokasi dan prov/kab jangan dicampur"); assert.equal((await ambil("/api/cc/kontak?lokasi=12&kab=Kota%20Medan", ujiLaju.h)).s, 400);
  assert.equal(await nLaju(), 2, "semua yang ditolak: jatah utuh");
  /* hak: sama dengan panggilan tunggal (auth lebih dulu daripada validasi) */
  for (const [h, kode] of [[pDinding.h, 403], [koord.h, 403], [pim.h, 403], [GERBANG, 403], [{}, 401]]) assert.equal((await ambil("/api/cc/kontak?lokasi=99", h)).s, kode);
  /* wilayah: setiap provinsi diperiksa; staf berwilayah 62 ditolak seluruhnya bila ada provinsi lain */
  assert.equal((await ambil("/api/cc/kontak?" + qs(["62|Kapuas", "62"]), opWil.h)).s, 200); assert.equal((await ambil("/api/cc/kontak?" + qs(["62|Kapuas", "12|Kota Medan"]), opWil.h)).s, 403, "satu provinsi di luar wilayah");
  /* batas laju tetap per panggilan: 120 per jam */
  const lj = await staf(DB, "Laju Banyak Dua", ["operator_cc"]);
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'cc.kontak', ?)").bind(lj.oleh, Date.now())));
  const l = await ambil("/api/cc/kontak?" + qs(["12|Kota Medan"]), lj.h); assert.equal(l.s, 429); assert.ok(l.h.get("retry-after"));
});

/* ================================================================ log */
const A = await staf(DB, "Operator A", ["operator_cc"]), B = await staf(DB, "Operator B", ["operator_cc"]), C = await staf(DB, "=cmd|' /C calc'!A0", ["operator_cc"]);
const TGL = "2026-10-20", w = (jam, menit = 0, detik = 0, ms = 0, tgl = TGL) => wibMs(tgl, jam, menit, detik, ms);
async function semaiLog() {
  const t = {X: await tugas(DB, {dibuat: w(14, 30)}), Y: await tugas(DB, {dibuat: w(6, 50)}), Z: await tugas(DB, {dibuat: w(22, 0), prov: "61", kab: "Pontianak"}), W: await tugas(DB, {dibuat: w(6, 0)}), V: await tugas(DB, {dibuat: w(22, 19, 59, 999)}), Q: await tugas(DB, {dibuat: w(9, 0)})};
  const j = (waktu, tid, oleh, dari, ke, catatan = null) => sisip(DB, "cc_jejak", {waktu, tugas_id: tid, oleh: oleh.oleh, dari, ke, catatan});
  await j(w(14, 58), t.X, A, "baru", "dalam_konfirmasi", "\tTAB awal"); await j(w(15, 3), t.X, A, "dalam_konfirmasi", "ada_api", "\rCR awal");
  await j(w(7, 0), t.Y, A, "baru", "dalam_konfirmasi", "-2+3"); await j(w(7, 6), t.Y, A, "dalam_konfirmasi", "tidak_ada_api", "@SUM(1)");
  await j(w(23, 0), t.Z, B, "baru", "dalam_konfirmasi"); await j(w(26, 0), t.Z, B, "dalam_konfirmasi", "ada_api"); await j(w(30, 59, 59, 999), t.Z, B, "ada_api", "dalam_konfirmasi", '=HYPERLINK("http://x")'); await j(w(31, 0), t.Z, B, "dalam_konfirmasi", "tidak_ada_api");
  await j(w(6, 59, 59, 999), t.W, A, "baru", "dalam_konfirmasi", 'Bilang "ok", lalu koma');
  await j(w(22, 59, 59, 999), t.V, B, "baru", "dalam_konfirmasi", "+1+1");
  await j(w(10, 0), t.Q, C, "baru", "dalam_konfirmasi");
  return t;
}
const mnt = n => n * MENIT;
uji("cc log: jendela shift (07-15, 15-23, 23-07 milik tanggal mulai), batas tepat, operator, durasi lintas jendela, ringkasan per operator", async () => {
  const t = await semaiLog(), L = async q => { const r = await ambil("/api/cc/log?" + q, koord.h); assert.equal(r.s, 200, r.t); return r.j; };
  const ket = j => j.jejak.map(x => `${x.operator_nama[0]}:${x.dari}>${x.ke}`);
  const pagi = await L(`tgl=${TGL}&shift=pagi`); assert.deepEqual(pagi.jejak.map(x => x.waktu), [w(7, 0), w(7, 6), w(14, 58), w(10, 0)].sort((a, b) => a - b), "07.00 masuk, 06.59.59,999 tidak, 15.00 tidak");
  assert.deepEqual([pagi.mulai, pagi.akhir], [w(7), w(15)]);
  const siang = await L(`tgl=${TGL}&shift=siang`); assert.deepEqual(siang.jejak.map(x => x.waktu), [w(15, 3), w(22, 59, 59, 999)], "15.00 masuk, 22.59.59,999 masih siang, 23.00 tidak");
  const malam = await L(`tgl=${TGL}&shift=malam`); assert.deepEqual(malam.jejak.map(x => x.waktu), [w(23, 0), w(26, 0), w(30, 59, 59, 999)], "malam tanggal 20: 23.00 -> 06.59.59,999 tanggal 21; 07.00 tanggal 21 tidak");
  assert.deepEqual([malam.mulai, malam.akhir], [w(23), w(31)]);
  const semua = await L(`tgl=${TGL}`); assert.equal(semua.shift, "semua"); assert.equal(semua.jejak.length, 4 + 2 + 3 + 0 - 0, "semua = sehari kerja 07.00-07.00: W (06.59.59,999) dan Z-final (07.00 hari berikut) di luar");
  const sebelum = await L("tgl=2026-10-19&shift=malam"); assert.deepEqual(sebelum.jejak.map(x => x.waktu), [w(6, 59, 59, 999)], "06.59.59,999 tanggal 20 = malam tanggal 19");
  assert.equal(sebelum.jejak[0].durasi_ms, mnt(59) + 59999, "respons = jejak - dibuat tugas (06.00 -> 06.59.59,999)");
  /* durasi memakai riwayat penuh, juga yang di luar jendela */
  const kf = siang.jejak.find(x => x.ke === "ada_api"); assert.deepEqual([kf.durasi_ms, kf.durasi_jenis], [mnt(5), "konfirmasi"], "14.58 (pagi) -> 15.03 (siang)");
  const dl = pagi.jejak.find(x => x.waktu === w(14, 58)); assert.deepEqual([dl.durasi_ms, dl.durasi_jenis], [mnt(28), "respons"]);
  const zf = malam.jejak.find(x => x.ke === "ada_api"); assert.deepEqual([zf.durasi_ms, zf.durasi_jenis], [mnt(180), "konfirmasi"]);
  assert.deepEqual([malam.jejak.at(-1).durasi_ms, malam.jejak.at(-1).durasi_jenis], [null, null], "koreksi tanpa durasi");
  /* bidang baris */
  assert.deepEqual(Object.keys(pagi.jejak[0]).sort(), ["catatan", "dari", "durasi_jenis", "durasi_ms", "kab", "ke", "operator", "operator_nama", "prov", "prov_nama", "waktu"]);
  assert.deepEqual([malam.jejak[0].operator_nama, malam.jejak[0].kab, malam.jejak[0].prov, malam.jejak[0].prov_nama], ["Operator B", "Pontianak", "61", "Kalimantan Barat"]);
  assert.ok(!JSON.stringify(semua).includes(t.X), "id tugas tidak keluar di log");
  /* filter operator + ringkasan */
  const a = await L(`tgl=${TGL}&operator=${encodeURIComponent(A.oleh)}`); assert.deepEqual(a.jejak.map(x => x.operator), Array(4).fill(A.oleh));
  assert.deepEqual(a.ringkasan, [{operator: A.oleh, nama: "Operator A", aksi: 4, selesai: 2, median_respons_ms: mnt(19), median_konfirmasi_ms: mnt(5) + 30000}], "respons 28 dan 10 menit -> 19; konfirmasi 5 dan 6 menit -> 5,5");
  const b = await L(`tgl=${TGL}&operator=${encodeURIComponent(B.oleh)}`); assert.deepEqual(b.ringkasan, [{operator: B.oleh, nama: "Operator B", aksi: 4, selesai: 1, median_respons_ms: mnt(50), median_konfirmasi_ms: mnt(180)}], "respons 60 dan 40 menit -> 50");
  assert.deepEqual(semua.ringkasan.map(r => [r.nama, r.aksi]).sort(), [["=cmd|' /C calc'!A0", 1], ["Operator A", 4], ["Operator B", 4]].sort(), "semua operator, WIB 07-07: A 4 (W di luar), B 4 (jejak 07.00 hari berikut di luar)");
  assert.deepEqual((await L(`tgl=${TGL}&operator=staf:tidakada`)).jejak, []);
  /* tanpa tgl = hari kerja berjalan (200); tanggal tanpa jejak kosong */
  assert.equal((await ambil("/api/cc/log", pim.h)).s, 200); assert.deepEqual((await L("tgl=2026-01-01")).ringkasan, []);
  /* validasi (400) setelah auth */
  for (const q of ["tgl=2026-02-30", "tgl=20-10-2026", "tgl=2026-10-20x", "tgl=", `tgl=${TGL}&shift=dini`, `tgl=${TGL}&operator=bukan`, `tgl=${TGL}&operator=staf:${"a".repeat(33)}`, `tgl=${TGL}&operator=`, `tgl=${TGL}&format=xml`]) assert.equal((await ambil("/api/cc/log?" + q, koord.h)).s, 400, q);
  assert.equal((await ambil("/api/cc/log?tgl=2026-02-30")).s, 401, "auth lebih dulu daripada validasi");
  assert.deepEqual(ket(a).length, 4);
});

/* penguraian CSV minimal: kutip, kutip ganda, koma dan baris baru di dalam sel */
function urai(csv) {
  const baris = []; let sel = "", b = [], kutip = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (kutip) { if (c === '"' && csv[i + 1] === '"') { sel += '"'; i++; } else if (c === '"') kutip = false; else sel += c; }
    else if (c === '"') kutip = true; else if (c === ",") { b.push(sel); sel = ""; } else if (c === "\r" && csv[i + 1] === "\n") { b.push(sel); baris.push(b); b = []; sel = ""; i++; } else sel += c;
  }
  if (sel || b.length) { b.push(sel); baris.push(b); } return baris;
}
uji("cc log csv: unduhan sah; kutip digandakan; awalan = + - @ TAB CR diberi apostrof (injeksi rumus), juga pada nama operator", async () => {
  const r = await mf.dispatchFetch(`http://bnpb.lokal/api/cc/log?tgl=${TGL}&format=csv`, {headers: koord.h}), buf = new Uint8Array(await r.arrayBuffer());
  assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /^text\/csv; charset=utf-8/); assert.match(r.headers.get("content-disposition"), /^attachment; filename="cc-log-2026-10-20-semua\.csv"$/); assert.equal(r.headers.get("cache-control"), "no-store");
  assert.deepEqual([...buf.slice(0, 3)], [0xEF, 0xBB, 0xBF], "BOM UTF-8 supaya Excel membaca huruf");
  const rows = urai(new TextDecoder().decode(buf).replace(/^\uFEFF/, ""));
  assert.deepEqual(rows[0], ["waktu_wib", "operator", "kab", "provinsi", "dari", "ke", "catatan", "durasi_ms"]); assert.equal(rows.length, 1 + 4 + 2 + 3 + 0 - 0 + 0, "judul + 9 baris (sehari kerja)");
  for (const row of rows.slice(1)) { assert.equal(row.length, 8); for (const sel of row.slice(0, 7)) assert.ok(!/^[=+\-@\t\r]/.test(sel), "sel berbahaya tanpa apostrof: " + JSON.stringify(sel)); assert.match(row[7], /^\d*$/, "durasi angka polos"); assert.match(row[0], /^2026-10-2[01] \d\d:\d\d:\d\d$/); }
  const sel = rows.flat();
  for (const harap of ["'=HYPERLINK(\"http://x\")", "'+1+1", "'-2+3", "'@SUM(1)", "'\tTAB awal", "'\rCR awal", "'=cmd|' /C calc'!A0", "Kotawaringin Timur", "Kalimantan Barat"])
    assert.ok(sel.includes(harap), "sel ada: " + JSON.stringify(harap));
  /* kutip dan koma di dalam sel: satu sel utuh sesudah diurai ulang (malam 19 Okt memuat jejak 06.59.59,999 tanggal 20) */
  const malam19 = urai(await (await mf.dispatchFetch(`http://bnpb.lokal/api/cc/log?tgl=2026-10-19&shift=malam&format=csv`, {headers: koord.h})).text());
  assert.equal(malam19.length, 2); assert.equal(malam19[1][6], 'Bilang "ok", lalu koma'); assert.equal(malam19[1].length, 8);
  assert.equal(rows.find(x => x[0] === "2026-10-20 14:58:00")[7], String(mnt(28)));
  assert.deepEqual(["=1+1", "+1", "-1", "@a", "\tx", "\ry", "aman", 'a"b', null, 5].map(selCsv), ["\"'=1+1\"", "\"'+1\"", "\"'-1\"", "\"'@a\"", "\"'\tx\"", "\"'\ry\"", '"aman"', '"a""b"', "", '"5"']);
  assert.equal((await ambil(`/api/cc/log?tgl=${TGL}&format=csv`, pDinding.h)).s, 403); assert.equal((await ambil(`/api/cc/log?tgl=${TGL}&format=csv`)).s, 401);
});

uji("cc log terpotong: tepat BATAS_LOG utuh; satu lebih = JSON bertanda (terpotong, batas), ringkasan batas bawah, CSV bercatatan + header x-terpotong + nama berkas -terpotong, baris terlama dibaca duluan", async () => {
  assert.equal(BATAS_LOG, 5000);
  const L = await siapkan("uji-cc-log-potong", {ikat: {CC_MEMO_DETIK: "0"}}), kd = await staf(L.DB, "Koordinator Log", ["koordalops"]), od = await staf(L.DB, "Operator Log", ["operator_cc"]);
  const mulai = wibMs(TGL, 8), isi = (dari, sampai) => L.DB.prepare(`WITH RECURSIVE s(n) AS (SELECT ?1 UNION ALL SELECT n + 1 FROM s WHERE n < ?2) INSERT INTO cc_jejak (waktu, tugas_id, oleh, dari, ke, catatan, dummy)
    SELECT ?3 + n * 1000, printf('%016x', 0xc000000 + n % 7), ?4, 'baru', 'dalam_konfirmasi', NULL, 0 FROM s`).bind(dari, sampai, mulai, od.oleh).run();
  const csv = async () => { const r = await L.mf.dispatchFetch(`http://bnpb.lokal/api/cc/log?tgl=${TGL}&format=csv`, {headers: kd.h}); assert.equal(r.status, 200); return {r, baris: (await r.text()).replace(/^\uFEFF/, "").replace(/\r\n$/, "").split("\r\n")}; };
  await isi(1, BATAS_LOG);
  let j = (await ambil(`/api/cc/log?tgl=${TGL}`, kd.h, L.api)).j;
  assert.deepEqual([j.jejak.length, j.terpotong, j.batas, j.ringkasan[0].aksi], [BATAS_LOG, false, BATAS_LOG, BATAS_LOG], "tepat batas: utuh");
  let c = await csv(); assert.equal(c.baris.length, 1 + BATAS_LOG, "judul + semua baris"); assert.equal(c.r.headers.get("x-terpotong"), null); assert.doesNotMatch(c.r.headers.get("content-disposition"), /terpotong/); assert.ok(!c.baris.some(b => b.includes("CATATAN")));
  await isi(BATAS_LOG + 1, BATAS_LOG + 1);   // satu baris lagi, PALING BARU
  j = (await ambil(`/api/cc/log?tgl=${TGL}`, kd.h, L.api)).j;
  assert.deepEqual([j.jejak.length, j.terpotong, j.batas], [BATAS_LOG, true, BATAS_LOG], "dipotong pada batas, bukan batas + 1");
  assert.equal(j.ringkasan[0].aksi, BATAS_LOG, "hitungan ringkasan dari baris yang terbaca = batas bawah; klien menandainya dengan +");
  assert.equal(j.jejak.at(-1).waktu, mulai + BATAS_LOG * 1000, "yang tersisih = yang terbaru (urutan waktu naik)");
  c = await csv();
  assert.equal(c.r.headers.get("x-terpotong"), "1"); assert.match(c.r.headers.get("content-disposition"), /^attachment; filename="cc-log-2026-10-20-semua-terpotong\.csv"$/); assert.equal(c.r.headers.get("cache-control"), "no-store");
  assert.equal(c.baris.length, 1 + BATAS_LOG + 1, "judul + batas baris + satu baris catatan");
  const cat = urai(c.baris.at(-1))[0]; assert.equal(cat.length, 8, "baris catatan selebar judul"); assert.match(cat[0], /^CATATAN: log terpotong, berkas ini hanya memuat 5\.000 baris pertama/); assert.ok(cat.slice(1).every(x => x === ""));
  assert.ok(!c.baris.slice(0, -1).some(b => b.includes("CATATAN")), "catatan hanya sekali, di ujung");
  /* saringan operator memotong pada batas yang sama (batas per permintaan, bukan per hari) */
  assert.equal((await ambil(`/api/cc/log?tgl=${TGL}&operator=${encodeURIComponent(od.oleh)}`, kd.h, L.api)).j.terpotong, true);
  assert.equal((await ambil(`/api/cc/log?tgl=${TGL}&shift=malam`, kd.h, L.api)).j.terpotong, false, "shift lain di tanggal itu sepi: tidak terpotong");
});

uji("cc log: hash token moderator TIDAK PERNAH keluar (JSON, CSV, ringkasan); moderator tampil 'Moderator' berkunci 'moderator'; staf tetap staf:<id> + nama; filter generik; bentuk hash ditolak", async () => {
  const hashA = sha256("rahasia-admin").slice(0, 12), hashB = sha256("moderator-dua").slice(0, 12);
  const m1 = await tugas(DB, {kab: "Kab Moderator Satu"}), m2 = await tugas(DB, {kab: "Kab Moderator Dua"}), s1 = await tugas(DB, {kab: "Kab Staf Satu"});
  for (const [id, h] of [[m1, ADMIN], [m2, MOD2]]) assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, h)).s, 200);
  assert.equal((await aksi(s1, {dari: "baru", ke: "dalam_konfirmasi"}, op1.h)).s, 200);
  assert.deepEqual((await DB.prepare("SELECT oleh FROM cc_jejak WHERE tugas_id IN (?, ?) ORDER BY id").bind(m1, m2).all()).results.map(r => r.oleh), [hashA, hashB], "yang DISIMPAN di D1 memang hash token (itu yang tidak boleh keluar)");
  const tgl = shiftDari(Date.now()).tgl, q = o => "/api/cc/log?" + new URLSearchParams({tgl, ...o});
  const L = await ambil(q({}), koord.h); assert.equal(L.s, 200, L.t);
  for (const hash of [hashA, hashB]) assert.ok(!L.t.includes(hash), "hash tidak ada di JSON log: " + hash);
  const mod = L.j.jejak.filter(x => x.kab?.startsWith("Kab Moderator")), staf = L.j.jejak.find(x => x.kab === "Kab Staf Satu");
  assert.deepEqual(mod.map(x => [x.operator, x.operator_nama]), [["moderator", "Moderator"], ["moderator", "Moderator"]], "dua moderator berbeda = satu kunci generik");
  assert.deepEqual([staf.operator, staf.operator_nama], [op1.oleh, "Budi Santoso"], "staf: kunci staf:<id> dan nama");
  assert.ok(L.j.jejak.every(x => x.operator === "moderator" || /^staf:[0-9a-f]+$/.test(x.operator)), "kunci operator hanya moderator atau staf:<id>");
  const rm = L.j.ringkasan.filter(r => r.operator === "moderator"); assert.equal(rm.length, 1, "ringkasan: semua moderator satu baris"); assert.equal(rm[0].nama, "Moderator");
  const jumlahMod = (await DB.prepare("SELECT count(*) n FROM cc_jejak WHERE oleh NOT LIKE 'staf:%' AND dummy = 0 AND waktu >= ? AND waktu < ?").bind(L.j.mulai, L.j.akhir).first()).n;
  assert.equal(rm[0].aksi, jumlahMod, "tidak ada jejak moderator yang hilang dari ringkasan"); assert.ok(jumlahMod >= 2);
  /* filter: 'moderator' = semua moderator, staf:<id> = satu staf */
  const fm = await ambil(q({operator: "moderator"}), koord.h); assert.equal(fm.s, 200); assert.equal(fm.j.jejak.length, jumlahMod); assert.ok(fm.j.jejak.every(x => x.operator === "moderator")); assert.ok(!fm.t.includes(hashA) && !fm.t.includes(hashB));
  assert.deepEqual(fm.j.ringkasan.map(r => [r.operator, r.nama]), [["moderator", "Moderator"]]);
  const fs = await ambil(q({operator: op1.oleh}), koord.h); assert.ok(fs.j.jejak.length >= 1 && fs.j.jejak.every(x => x.operator === op1.oleh)); assert.ok(!fs.j.jejak.some(x => x.kab?.startsWith("Kab Moderator")));
  /* bentuk lama (awalan hash 12 heks) tidak diterima lagi: klien tidak punya alasan memegangnya */
  for (const o of [hashA, hashB, "Moderator", "MODERATOR", "moderator:1"]) assert.equal((await ambil(q({operator: o}), koord.h)).s, 400, o);
  /* CSV: nama saja, tanpa hash */
  const csv = await mf.dispatchFetch("http://bnpb.lokal" + q({format: "csv"}), {headers: koord.h}), tk = await csv.text(); assert.equal(csv.status, 200);
  assert.ok(!tk.includes(hashA) && !tk.includes(hashB), "hash tidak ada di CSV"); assert.ok(tk.split("\r\n").some(b => b.includes("Kab Moderator Satu") && b.includes('"Moderator"')), "moderator tampil sebagai Moderator di CSV");
  /* moderator sendiri membaca log: tidak melihat hash dirinya */
  const sendiri = await ambil(q({}), ADMIN); assert.equal(sendiri.s, 200); assert.ok(!sendiri.t.includes(hashA) && !sendiri.t.includes(hashB));
  /* dan tidak di tempat lain: antrean, status, dinding, 409 */
  const a1 = await ambil("/api/cc/antrean", ADMIN), d1 = await ambil("/api/cc/dinding", ADMIN); for (const r of [a1, d1]) { assert.equal(r.s, 200); assert.ok(!r.t.includes(hashA) && !r.t.includes(hashB), "hash tak ada di " + r.s); }
  const k409 = await aksi(m1, {dari: "baru", ke: "dalam_konfirmasi"}, op2.h); assert.equal(k409.s, 409); assert.equal(k409.j.oleh_nama, "Moderator"); assert.ok(!k409.t.includes(hashA));
});

uji("cc log: batas laju 120 per pelaku per jam (JSON dan CSV satu jatah, 429 + Retry-After, tanpa kueri jejak); salah bentuk dan ditolak auth tidak memakai jatah; pelaku lain dan jendela lain tidak ikut; jajak antrean/dinding tidak terhambat", async () => {
  assert.equal(BATAS_LOG_JAM, 120);
  const lg = await staf(DB, "Laju Log", ["koordalops"]), laju = kunci => DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = 'cc.log'").bind(kunci).first().then(r => r.n);
  const tgl = shiftDari(Date.now()).tgl, q = o => "/api/cc/log?" + new URLSearchParams({tgl, ...o});
  /* auth dan bentuk lebih dulu: tamu 401, peran tanpa hak 403, salah bentuk 400 = jatah utuh */
  assert.equal((await ambil(q({}), {})).s, 401); assert.equal((await ambil(q({}), pPeta.h)).s, 403); assert.equal((await ambil(q({}), tmc.h)).s, 403);
  for (const o of [{tgl: "2026-02-30"}, {shift: "subuh"}, {operator: "xyz"}, {format: "xml"}]) assert.equal((await ambil(q(o), lg.h)).s, 400, JSON.stringify(o));
  assert.equal(await laju(lg.oleh), 0, "ditolak sebelum laju: jatah utuh");
  /* 118 di jendela dan 5 di luar jendela (> 1 jam): hanya yang di jendela dihitung */
  await DB.batch([...Array.from({length: 118}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'cc.log', ?)").bind(lg.oleh, Date.now() - 10 * MENIT)),
    ...Array.from({length: 5}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'cc.log', ?)").bind(lg.oleh, Date.now() - 2 * JAM))]);
  assert.equal((await ambil(q({}), lg.h)).s, 200, "ke-119 (JSON)");
  const csv = await mf.dispatchFetch("http://bnpb.lokal" + q({format: "csv"}), {headers: lg.h}); assert.equal(csv.status, 200, "ke-120 (CSV) masih boleh"); await csv.text();
  const tolak = await ambil(q({}), lg.h); assert.equal(tolak.s, 429, tolak.t); assert.equal(tolak.h.get("retry-after"), "3600"); assert.match(tolak.j.galat, /cc\.log.*120/); assert.equal(Object.keys(tolak.j).join(), "galat", "tanpa data log");
  const tolakCsv = await mf.dispatchFetch("http://bnpb.lokal" + q({format: "csv"}), {headers: lg.h}); assert.equal(tolakCsv.status, 429, "CSV berbagi jatah dengan JSON"); assert.equal(tolakCsv.headers.get("retry-after"), "3600"); assert.ok(!(tolakCsv.headers.get("content-type") || "").includes("csv")); await tolakCsv.text();
  assert.equal(await laju(lg.oleh), 118 + 5 + 2, "yang ditolak tidak menambah catatan laju");
  /* jajak antrean/dinding (30 dtk) dan POST aksi tidak ikut terhambat oleh jatah log yang habis */
  for (const [r, h] of [["/api/cc/antrean", lg.h], ["/api/cc/dinding", lg.h]]) assert.equal((await ambil(r, h)).s, 200, r + " tetap terbuka");
  assert.equal((await ambil("/api/cc/dinding", pDinding.h)).s, 200);
  assert.equal(await DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi IN ('cc.antrean', 'cc.dinding')").bind(lg.oleh).first().then(r => r.n), 0, "antrean dan dinding tidak punya penghitung laju");
  /* pelaku lain tidak ikut */
  assert.equal((await ambil(q({}), pim.h)).s, 200, "pimpinan lain jatahnya sendiri"); assert.equal((await ambil(q({}), koord.h)).s, 200);
  /* jendela bergeser: catatan > 1 jam tidak dihitung */
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ? AND aksi = 'cc.log' AND waktu > ?").bind(lg.oleh, Date.now() - 20 * MENIT).run();
  assert.equal((await ambil(q({}), lg.h)).s, 200, "jatah pulih begitu catatan keluar dari jendela satu jam");
  /* moderator: kuncinya hash token (server saja); hash tidak ikut di badan galat */
  const mod = sha256("rahasia-admin").slice(0, 12);
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'cc.log', ?)").bind(mod, Date.now())));
  const m = await ambil(q({}), ADMIN); assert.equal(m.s, 429); assert.equal(m.h.get("retry-after"), "3600"); assert.ok(!m.t.includes(mod));
  assert.equal((await ambil(q({}), MOD2)).s, 200, "moderator lain (token lain) tidak ikut"); assert.equal((await ambil("/api/cc/dinding", ADMIN)).s, 200, "moderator yang jatah log-nya habis tetap bisa jajak dinding");
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ? AND aksi = 'cc.log'").bind(mod).run();   // supaya uji berikutnya yang memakai ADMIN tidak terhalang
});

/* ================================================================ fungsi murni */
uji("cc shiftDari: pagi 07-15, siang 15-23, malam 23-07 WIB; malam milik tanggal mulainya; lintas tengah malam, bulan, tahun", () => {
  const s = (tgl, jam, menit = 0, detik = 0, ms = 0) => shiftDari(wibMs(tgl, jam, menit, detik, ms));
  assert.deepEqual(s("2026-11-02", 2), {tgl: "2026-11-01", shift: "malam"}, "02.00 tgl 2 = malam tgl 1");
  assert.deepEqual(s("2026-11-02", 0), {tgl: "2026-11-01", shift: "malam"}); assert.deepEqual(s("2026-11-02", 6, 59, 59, 999), {tgl: "2026-11-01", shift: "malam"});
  assert.deepEqual(s("2026-11-02", 7), {tgl: "2026-11-02", shift: "pagi"}); assert.deepEqual(s("2026-11-02", 14, 59, 59, 999), {tgl: "2026-11-02", shift: "pagi"});
  assert.deepEqual(s("2026-11-02", 15), {tgl: "2026-11-02", shift: "siang"}); assert.deepEqual(s("2026-11-02", 22, 59, 59, 999), {tgl: "2026-11-02", shift: "siang"});
  assert.deepEqual(s("2026-11-02", 23), {tgl: "2026-11-02", shift: "malam"}); assert.deepEqual(s("2026-11-02", 23, 59, 59, 999), {tgl: "2026-11-02", shift: "malam"});
  assert.deepEqual(s("2026-12-01", 3), {tgl: "2026-11-30", shift: "malam"}, "lintas bulan"); assert.deepEqual(s("2027-01-01", 3), {tgl: "2026-12-31", shift: "malam"}, "lintas tahun");
  assert.deepEqual(s("2028-03-01", 1), {tgl: "2028-02-29", shift: "malam"}, "tahun kabisat");
  /* UTC bukan WIB: 20.00 UTC tgl 1 = 03.00 WIB tgl 2 = malam tgl 1 */
  assert.deepEqual(shiftDari(Date.UTC(2026, 10, 1, 20, 0)), {tgl: "2026-11-01", shift: "malam"}); assert.deepEqual(shiftDari(Date.UTC(2026, 10, 1, 0, 0)), {tgl: "2026-11-01", shift: "pagi"});
  /* satu konstanta, berurutan tanpa celah dan tumpang tindih, 8 jam masing-masing, tepat 24 jam */
  assert.deepEqual(Object.keys(SHIFT), ["pagi", "siang", "malam"]); assert.ok(Object.values(SHIFT).every(([a, b]) => b - a === 8)); assert.equal(SHIFT.siang[0], SHIFT.pagi[1]); assert.equal(SHIFT.malam[0], SHIFT.siang[1]); assert.equal(SHIFT.malam[1] - SHIFT.pagi[0], 24);
  assert.deepEqual(rentangShift("2026-11-01", "pagi"), {mulai: wibMs("2026-11-01", 7), akhir: wibMs("2026-11-01", 15)}); assert.deepEqual(rentangShift("2026-11-01", "malam"), {mulai: wibMs("2026-11-01", 23), akhir: wibMs("2026-11-02", 7)});
  assert.deepEqual(rentangShift("2026-11-01", "semua"), {mulai: wibMs("2026-11-01", 7), akhir: wibMs("2026-11-02", 7)});
  /* bulat penuh: tiap menit selama tiga hari jatuh di rentang shift yang dikembalikan shiftDari */
  for (let t = wibMs("2026-10-30", 0); t < wibMs("2026-11-02", 0); t += 17 * MENIT) { const {tgl, shift} = shiftDari(t), r = rentangShift(tgl, shift); assert.ok(t >= r.mulai && t < r.akhir, `${new Date(t).toISOString()} -> ${tgl} ${shift}`); }
});

uji("cc durasi: respons = baru->dalam_konfirmasi PERTAMA - dibuat; konfirmasi = ke final - dalam_konfirmasi TERAKHIR sebelumnya; median", () => {
  const J = [{id: 1, waktu: 10, dari: "baru", ke: "dalam_konfirmasi"}, {id: 2, waktu: 25, dari: "dalam_konfirmasi", ke: "ada_api"}, {id: 3, waktu: 40, dari: "ada_api", ke: "dalam_konfirmasi"}, {id: 4, waktu: 70, dari: "dalam_konfirmasi", ke: "tidak_ada_api"}];
  assert.deepEqual(durasiJejak(J, 0).map(x => [x.jenis, x.ms]), [["respons", 10], ["konfirmasi", 15], [null, null], ["konfirmasi", 30]], "koreksi memulai hitungan konfirmasi baru");
  assert.deepEqual(durasiJejak(J, 4).map(x => x.ms)[0], 6); assert.equal(durasiJejak(J, undefined)[0].ms, null, "tugas sudah dibuang retensi: respons tak diketahui"); assert.equal(durasiJejak(J, undefined)[1].ms, 15, "konfirmasi tidak butuh tugasnya");
  assert.deepEqual(durasiJejak([{id: 1, waktu: 5, dari: "baru", ke: "dalam_konfirmasi"}, {id: 2, waktu: 9, dari: "baru", ke: "dalam_konfirmasi"}], 0).map(x => x.jenis), ["respons", null], "hanya yang PERTAMA");
  assert.equal(durasiJejak([{id: 1, waktu: 5, dari: "baru", ke: "dalam_konfirmasi"}], 99)[0].ms, 0, "tidak negatif");
  assert.equal(durasiJejak([{id: 1, waktu: 5, dari: "dalam_konfirmasi", ke: "ada_api"}], 0)[0].ms, null, "final tanpa dalam_konfirmasi sebelumnya: tidak ada durasi");
  assert.deepEqual(durasiJejak([], 0), []);
  assert.deepEqual([median([]), median([5]), median([1, 3]), median([3, 1, 2]), median([10, 20, 40, 100]), median([NaN, 4])], [null, 5, 2, 2, 30, 4]);
  assert.deepEqual(FINAL, ["ada_api", "tidak_ada_api"]); assert.deepEqual(Object.keys(TRANSISI), STATUS);
});

/* ================================================================ layar dinding */
uji("cc dinding: ringkasan, antrean ringkas, shift, operator hadir; tanpa id, catatan, nomor, nama lengkap; koordinat 0,01; dummy dan bahaya lain tak ikut", async () => {
  const D = await siapkan("uji-cc-dinding", {ikat: {CC_MEMO_DETIK: "0"}}), now = Date.now(), hari0 = awalHari(now);
  const b = await staf(D.DB, "Budi Santoso", ["operator_cc"]), c = await staf(D.DB, "Citra Dewi", ["operator_cc"]), dd = await staf(D.DB, "Dimas Dummy", ["operator_cc"], {dummy: 1}), pm = await pemirsa(D.DB, "Dinding", ["dinding"]);
  const T = {};
  T.baru1 = await tugas(D.DB, {dibuat: now - 50 * MENIT}); T.baru6 = await tugas(D.DB, {dibuat: now - 7 * JAM}); T.baru7 = await tugas(D.DB, {dibuat: now - JAM});
  T.dalam = await tugas(D.DB, {dibuat: now - 2 * JAM, kab: "Kapuas"}); T.final = await tugas(D.DB, {dibuat: now - 3 * JAM, konfirmasi_pada: now - 2.5 * JAM}); T.finalLama = await tugas(D.DB, {dibuat: now - 20 * JAM, konfirmasi_pada: now - 19 * JAM});
  T.l1 = await tugas(D.DB, {level: 1, dibuat: now - 7 * JAM}); T.banjir = await tugas(D.DB, {banjir: true, dibuat: now - 7 * JAM}); T.dum = await tugas(D.DB, {dummy: 1, dibuat: now - 7 * JAM});
  T.kabar = await tugas(D.DB, {level: 2, dibuat: now - 8 * JAM, konfirmasi_pada: now - 7 * JAM}); T.padam = await tugas(D.DB, {dibuat: now - 7 * JAM, status: "padam"});
  const st = (id, status, sejak, oleh) => sisip(D.DB, "cc_status", {tugas_id: id, status, oleh, sejak});
  await st(T.dalam, "dalam_konfirmasi", now - 5 * MENIT, c.oleh); await st(T.final, "ada_api", now - JAM, b.oleh); await st(T.finalLama, "tidak_ada_api", now - 13 * JAM, b.oleh);
  /* respons shift berjalan: dua jejak baru->dalam_konfirmasi di shift ini (tugas level 1 supaya bukan alert): 10 dan 20 menit -> 15 menit */
  const sh = shiftDari(now), rg = rentangShift(sh.tgl, sh.shift), wk = Math.max(rg.mulai, now - 60e3);
  for (const lama of [mnt(10), mnt(20)]) { const r = await tugas(D.DB, {level: 1, dibuat: wk - lama}); await sisip(D.DB, "cc_jejak", {waktu: wk, tugas_id: r, oleh: b.oleh, dari: "baru", ke: "dalam_konfirmasi", catatan: "SECRET-CATATAN 08123456789"}); }
  await sisip(D.DB, "cc_jejak", {waktu: rg.mulai - 1, tugas_id: T.final, oleh: b.oleh, dari: "baru", ke: "dalam_konfirmasi"});   // 1 ms sebelum shift mulai: tidak ikut median (dulu wk - 7 jam - 1, yang jatuh DI DALAM shift pagi sesudah pukul 14.00 WIB sehingga uji merah tiap sore)
  await sisip(D.DB, "cc_hadir", {staf_id: b.id, terakhir: now - 3 * MENIT}); await sisip(D.DB, "cc_hadir", {staf_id: c.id, terakhir: now - 11 * MENIT}); await sisip(D.DB, "cc_hadir", {staf_id: dd.id, terakhir: now, dummy: 1});
  const r = await D.api("GET", "/api/cc/dinding", undefined, pm.h); assert.equal(r.s, 200, r.t);
  assert.deepEqual(Object.keys(r.j), ["kini", "data_pada", "shift", "ringkasan", "operator_hadir", "antrean_total", "antrean"]); assert.equal(r.j.antrean_total, 5, "antrean_total = seluruh antrean sebelum dipotong 60 baris"); assert.ok(Math.abs(r.j.kini - now) < 30e3);
  assert.deepEqual(r.j.shift, {...sh, ...rg});
  const dibuatDari = async id => (await D.DB.prepare("SELECT dibuat FROM tugas_api WHERE id = ?").bind(id).first()).dibuat;
  /* alert hari ini = tugas karhutla level 3 non-dummy yang DIBUAT sejak 00.00 WIB, termasuk yang sudah tutup (padam) */
  const alertHari = (await Promise.all([T.baru1, T.baru6, T.baru7, T.dalam, T.final, T.finalLama, T.padam].map(dibuatDari))).filter(d => d >= hari0).length;
  /* rincian "hari ini" = populasi yang SAMA dengan alert_hari_ini (dibuat sejak 00.00 WIB), bukan antrean 7 hari: baru6 (dibuat 7 jam lalu) hanya ikut bila 7 jam lalu masih hari ini */
  const hariIni = {baru: [T.baru1, T.baru6, T.baru7].length - (await Promise.all([T.baru1, T.baru6, T.baru7].map(dibuatDari))).filter(d => d < hari0).length,
    dalam_konfirmasi: (await dibuatDari(T.dalam)) >= hari0 ? 1 : 0, diputuskan: (await Promise.all([T.final, T.finalLama].map(dibuatDari))).filter(d => d >= hari0).length};
  assert.deepEqual(r.j.ringkasan, {alert_hari_ini: alertHari, hari_ini: hariIni, baru: 3, dalam_konfirmasi: 1, final_hari_ini: [now - JAM, now - 13 * JAM].filter(s => s >= hari0).length, median_respons_ms: mnt(15), lewat_tenggat_konfirmasi: 2, lewat_tenggat_terpotong: false,
    antrean_terpotong: false, final_terpotong: false, median_respons_terpotong: false},
    "lewat tenggat: baru6 dan l1 (> 6 jam tanpa konfirmasi lapangan); bahaya lain, dummy, tugas tutup, dan yang sudah dikonfirmasi tidak dihitung");
  assert.deepEqual(r.j.operator_hadir, ["Budi"], "hanya <= 10 menit, nama depan, dummy tak ikut");
  assert.deepEqual(r.j.antrean.map(a => a.status), ["baru", "baru", "baru", "dalam_konfirmasi", "ada_api"], "final > 12 jam tak tampil");
  assert.deepEqual(r.j.antrean.map(a => a.pemegang), [null, null, null, "Citra", "Budi"]); assert.equal(r.j.antrean[3].kab, "Kapuas");
  assert.deepEqual(Object.keys(r.j.antrean[0]).sort(), ["kab", "lat", "lon", "pemegang", "prov", "prov_nama", "sejak", "status", "umur"]);
  assert.deepEqual([r.j.antrean[0].lat, r.j.antrean[0].lon, r.j.antrean[0].prov_nama], [-2.51, 113.3, "Kalimantan Tengah"]);
  assert.ok(r.j.antrean[0].umur >= 7 * JAM && r.j.antrean[0].umur < 7 * JAM + 2 * MENIT); assert.equal(r.j.antrean[3].sejak > now - 10 * MENIT, true);
  /* tidak ada data yang tak boleh ke dinding */
  const mentah = JSON.stringify(r.j);
  for (const rahasia of [...Object.values(T), "Santoso", "Dewi", "Dimas", "SECRET", "08123456789", "62812", "Unit Uji", "catatan", "telepon", "nip", "2.51237", "113.29876", b.id, c.id]) assert.ok(!mentah.includes(rahasia), "tidak boleh ke dinding: " + rahasia);
  /* pembaca meja (staf nyata) melihat angka yang sama; moderator juga dummy */
  const sama = await D.api("GET", "/api/cc/dinding", undefined, b.h); assert.deepEqual(sama.j.ringkasan, r.j.ringkasan); const tanpaUmur = l => l.map(({umur, ...x}) => x); assert.deepEqual(tanpaUmur(sama.j.antrean), tanpaUmur(r.j.antrean));
  const m = await D.api("GET", "/api/cc/dinding", undefined, ADMIN); assert.equal(m.j.ringkasan.baru, 4, "moderator: alert dummy (level 3) ikut dihitung"); assert.equal(m.j.ringkasan.lewat_tenggat_konfirmasi, 3); assert.deepEqual(m.j.operator_hadir, ["Budi", "Dimas"]);
  /* migrasi: tabel kosong tidak memecahkan layar */
  const kosong = await siapkan("uji-cc-dinding-kosong", {ikat: {CC_MEMO_DETIK: "0"}}), pk = await pemirsa(kosong.DB, "Dinding", ["dinding"]), k = await kosong.api("GET", "/api/cc/dinding", undefined, pk.h);
  assert.equal(k.s, 200); assert.deepEqual([k.j.antrean, k.j.operator_hadir, k.j.ringkasan], [[], [], {alert_hari_ini: 0, hari_ini: {baru: 0, dalam_konfirmasi: 0, diputuskan: 0}, baru: 0, dalam_konfirmasi: 0, final_hari_ini: 0, median_respons_ms: null, lewat_tenggat_konfirmasi: 0, lewat_tenggat_terpotong: false,
    antrean_terpotong: false, final_terpotong: false, median_respons_terpotong: false}]);
  assert.equal(k.j.antrean_total, 0);
});

uji("cc dinding: antrean_total jujur di atas 60 baris; rincian hari_ini hanya alert yang DIBUAT hari ini (antrean 7 hari terpisah); lewat_tenggat_terpotong menandai batas baca tercapai", async () => {
  const D = await siapkan("uji-cc-dinding-lingkup", {ikat: {CC_MEMO_DETIK: "0"}}), now = Date.now(), hari0 = awalHari(now), pm = await pemirsa(D.DB, "Dinding", ["dinding"]), o = await staf(D.DB, "Budi Santoso", ["operator_cc"]);
  const hariIniMs = hari0 + Math.floor((now - hari0) / 2), kemarin = now - 3 * HARI;   // tengah antara 00.00 dan sekarang selalu hari ini dan sudah lewat; 3 hari lalu selalu bukan hari ini
  /* 62 alert baru dibuat HARI INI + 3 alert baru dari 3 hari lalu (masih dalam antrean 7 hari) + 1 alert hari ini yang sudah diputuskan + 1 dipegang dari 3 hari lalu */
  await D.DB.batch(Array.from({length: 62}, (_, i) => D.DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy) VALUES (?, '62', ?, 'Kec', -2.5, 113.3, 3, 5, 10, ?, ?, 'buka', ?, 0)")
    .bind(hex16(0x5000 + i), "Kab " + i, hariIniMs, hariIniMs, hariIniMs)));
  const lama = [await tugas(D.DB, {dibuat: kemarin}), await tugas(D.DB, {dibuat: kemarin}), await tugas(D.DB, {dibuat: kemarin}), await tugas(D.DB, {dibuat: kemarin})];
  const putus = await tugas(D.DB, {dibuat: hariIniMs}), pegangLama = lama[3];
  const tutupHariIni = await tugas(D.DB, {dibuat: hariIniMs, status: "padam"});   // dibuat hari ini lalu ditutup (padam) tanpa keputusan operator: masuk total, bukan tiga bagian (layar menamainya "sudah tutup")
  await sisip(D.DB, "cc_status", {tugas_id: putus, status: "ada_api", oleh: o.oleh, sejak: now - MENIT}); await sisip(D.DB, "cc_status", {tugas_id: pegangLama, status: "dalam_konfirmasi", oleh: o.oleh, sejak: now - 2 * MENIT});
  const r = await D.api("GET", "/api/cc/dinding", undefined, pm.h); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.antrean.length, 60, "layar menerima paling banyak 60 baris"); assert.equal(r.j.antrean_total, 62 + 3 + 1 + 1, "tetapi jumlah seluruh antrean dikirim: '+N alert lagi' = total - baris yang muat, bukan 60 - baris yang muat");
  assert.deepEqual(r.j.ringkasan.hari_ini, {baru: 62, dalam_konfirmasi: 0, diputuskan: 1}, "rincian hari ini TIDAK memuat 3 alert baru dan 1 yang dipegang dari 3 hari lalu"); assert.equal(r.j.ringkasan.alert_hari_ini, 64);
  const h = r.j.ringkasan.hari_ini; assert.equal(r.j.ringkasan.alert_hari_ini - h.baru - h.dalam_konfirmasi - h.diputuskan, 1, "selisih total dan tiga bagian = alert hari ini yang tugasnya sudah tutup (tutupHariIni); layar menampilkannya sebagai bagian 'sudah tutup' supaya sub-teks menjumlah ke angka besar");
  assert.ok(!r.t.includes(tutupHariIni), "id tugas tak pernah ke dinding");
  assert.equal(r.j.ringkasan.baru, 62 + 3, "antrean terbuka 7 hari tetap terpisah: lebih besar dari rincian hari ini, dan itulah yang dilabeli 'antrean' di layar"); assert.equal(r.j.ringkasan.dalam_konfirmasi, 1);
  assert.ok(r.j.ringkasan.hari_ini.baru + r.j.ringkasan.hari_ini.dalam_konfirmasi + r.j.ringkasan.hari_ini.diputuskan <= r.j.ringkasan.alert_hari_ini, "rincian tak pernah melebihi total satu populasi");
  assert.equal(r.j.ringkasan.lewat_tenggat_terpotong, false);
  /* batas baca tile "lewat 6 jam" tercapai: angkanya batas bawah dan ditandai. 3000 tugas 'buka' level 1 (bukan alert) dibuat 7 jam lalu tanpa konfirmasi lapangan. */
  await D.DB.prepare(`WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ${BATAS_TENGGAT}) INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy)
    SELECT printf('%016x', 0x7000000 + n), '62', 'Kab Massal', 'Kec', -2.5, 113.3, 1, 1, 1, ?1, ?1, 'buka', NULL, 0 FROM s`).bind(now - 7 * JAM).run();
  const t = await D.api("GET", "/api/cc/dinding", undefined, pm.h);
  assert.equal(t.j.ringkasan.lewat_tenggat_terpotong, true, "dibaca sampai batas: angka adalah batas bawah"); 
  assert.ok(t.j.ringkasan.lewat_tenggat_konfirmasi <= BATAS_TENGGAT && t.j.ringkasan.lewat_tenggat_konfirmasi >= BATAS_TENGGAT - 1, "paling banyak sebanyak yang dibaca (satu baris hari-ini bisa belum lewat bila tes jalan dini hari)");
});

uji("cc terpotong: alert terbuka, keputusan akhir, dan jejak shift dibaca sampai BATAS_DAFTAR; tepat batas = utuh, satu lebih = terpotong ditandai di antrean dan dinding; yang belum dipegang tak tersisih", async () => {
  assert.equal(BATAS_DAFTAR, 500); assert.equal(BATAS_AKSI_JAM, 120); assert.equal(MAKS_LOKASI, 20);
  const D = await siapkan("uji-cc-potong", {ikat: {CC_MEMO_DETIK: "0"}}), now = Date.now(), pm = await pemirsa(D.DB, "Dinding", ["dinding"]), o = await staf(D.DB, "Budi Santoso", ["operator_cc"]);
  const id = n => n.toString(16).padStart(16, "0");
  /* tugas level 3 berurut n = dari..sampai, id = tanda + n */
  const buka = (dari, sampai, tanda, dibuat, level = 3) => D.DB.prepare(`WITH RECURSIVE s(n) AS (SELECT ?1 UNION ALL SELECT n + 1 FROM s WHERE n < ?2) INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy)
    SELECT printf('%016x', ?3 + n), '62', 'Kab Massal', 'Kec', -2.5, 113.3, ?5, 4, 10, ?4, ?4, 'buka', NULL, 0 FROM s`).bind(dari, sampai, tanda, dibuat, level).run();
  const baca = async () => { const [d, a] = await Promise.all([D.api("GET", "/api/cc/dinding", undefined, pm.h), D.api("GET", "/api/cc/antrean", undefined, o.h)]); assert.equal(d.s, 200, d.t); assert.equal(a.s, 200, a.t); return {d: d.j, a: a.j}; };
  /* (1) alert terbuka: tepat BATAS_DAFTAR belum terpotong */
  await buka(1, BATAS_DAFTAR, 0x8000000, now - 30 * MENIT);
  let {d, a} = await baca(); assert.equal(a.alert.length, BATAS_DAFTAR); assert.deepEqual([a.antrean_terpotong, a.final_terpotong, d.ringkasan.antrean_terpotong, d.ringkasan.final_terpotong], [false, false, false, false]); assert.equal(d.antrean_total, BATAS_DAFTAR);
  /* satu lagi, BARU dibuat: terpotong; yang tersisih adalah yang terbaru (urutan tampil: terlama dulu) */
  await buka(BATAS_DAFTAR + 1, BATAS_DAFTAR + 1, 0x8000000, now - 5 * MENIT);
  ({d, a} = await baca()); assert.equal(a.antrean_terpotong, true); assert.equal(a.final_terpotong, false); assert.equal(a.alert.length, BATAS_DAFTAR, "dipotong pada batas, bukan BATAS + 1");
  assert.deepEqual([d.ringkasan.antrean_terpotong, d.ringkasan.final_terpotong, d.ringkasan.baru, d.antrean_total], [true, false, BATAS_DAFTAR, BATAS_DAFTAR], "hitungan dari daftar terpotong = batas bawah, dan ditandai");
  assert.ok(a.alert.every(x => x.dibuat < now - 20 * MENIT), "yang tersisih = yang terbaru");
  /* yang sudah dipegang tidak menggusur yang belum dipegang: 500 'baru' (499 lama + 1 terbaru) lebih didahulukan daripada satu yang dipegang walau paling lama */
  await sisip(D.DB, "cc_status", {tugas_id: id(0x8000000 + 1), status: "dalam_konfirmasi", oleh: o.oleh, sejak: now - MENIT});
  ({d, a} = await baca()); assert.equal(a.antrean_terpotong, true); assert.equal(a.alert.filter(x => x.status === "baru").length, BATAS_DAFTAR, "semua kursi untuk yang belum dipegang"); assert.equal(a.alert.some(x => x.status === "dalam_konfirmasi"), false);
  assert.ok(a.alert.some(x => x.dibuat > now - 10 * MENIT), "alert terbaru yang belum dipegang tampil (alarm tidak boleh melewatkannya)"); assert.equal(d.ringkasan.antrean_terpotong, true);
  /* (2) keputusan akhir: tepat BATAS_DAFTAR utuh; satu lebih = terpotong, yang terlama sejak tersisih */
  await D.DB.batch([D.DB.prepare("DELETE FROM tugas_api"), D.DB.prepare("DELETE FROM cc_status")]);
  await buka(1, BATAS_DAFTAR, 0x9000000, now - 2 * JAM);
  await D.DB.prepare("INSERT INTO cc_status (tugas_id, status, oleh, sejak, dummy) SELECT id, 'ada_api', ?1, ?2, 0 FROM tugas_api").bind(o.oleh, now - 10 * MENIT).run();
  ({d, a} = await baca()); assert.deepEqual([a.alert.length, a.antrean_terpotong, a.final_terpotong, d.ringkasan.final_terpotong], [BATAS_DAFTAR, false, false, false]);
  await buka(BATAS_DAFTAR + 1, BATAS_DAFTAR + 1, 0x9000000, now - 2 * JAM); await sisip(D.DB, "cc_status", {tugas_id: id(0x9000000 + BATAS_DAFTAR + 1), status: "tidak_ada_api", oleh: o.oleh, sejak: now - MENIT});
  ({d, a} = await baca()); assert.deepEqual([a.alert.length, a.antrean_terpotong, a.final_terpotong, d.ringkasan.final_terpotong, d.ringkasan.antrean_terpotong], [BATAS_DAFTAR, false, true, true, false]);
  assert.ok(a.alert.some(x => x.status === "tidak_ada_api"), "keputusan terbaru dibaca duluan; yang terlama yang tersisih");
  /* (3) jejak shift untuk median respons (cc_jejak hanya menambah, jadi instansi tersendiri) */
  const J = await siapkan("uji-cc-potong-jejak", {ikat: {CC_MEMO_DETIK: "0"}}), pj = await pemirsa(J.DB, "Dinding", ["dinding"]), oj = await staf(J.DB, "Budi Santoso", ["operator_cc"]);
  const sh = shiftDari(now), rg = rentangShift(sh.tgl, sh.shift), wk = Math.max(rg.mulai, now - 60e3), median10 = () => J.api("GET", "/api/cc/dinding", undefined, pj.h).then(r => r.j.ringkasan);
  await J.DB.prepare(`WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ?1) INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, dummy)
    SELECT printf('%016x', 0xa000000 + n), '62', 'Kab Jejak', 'Kec', -2.5, 113.3, 1, 1, 1, ?2 - 600000, ?2, 'buka', NULL, 0 FROM s`).bind(BATAS_DAFTAR, wk).run();
  await J.DB.prepare("INSERT INTO cc_jejak (waktu, tugas_id, oleh, dari, ke, dummy) SELECT ?1, id, ?2, 'baru', 'dalam_konfirmasi', 0 FROM tugas_api").bind(wk, oj.oleh).run();
  let r = await median10(); assert.deepEqual([r.median_respons_ms, r.median_respons_terpotong], [mnt(10), false], "tepat batas: utuh");
  await tugas(J.DB, {level: 1, dibuat: wk - mnt(10)}).then(tid => sisip(J.DB, "cc_jejak", {waktu: wk, tugas_id: tid, oleh: oj.oleh, dari: "baru", ke: "dalam_konfirmasi"}));
  r = await median10(); assert.deepEqual([r.median_respons_ms, r.median_respons_terpotong], [mnt(10), true], "satu lebih: median dari 500 jejak pertama, ditandai");
});

uji("cc memo: dinding dan antrean di-memo per kombinasi dummy+wilayah; aksi di isolat yang sama menyegarkan; TTL mengikuti CC_MEMO_DETIK", async () => {
  const M = await siapkan("uji-cc-memo", {ikat: {CC_MEMO_DETIK: "60"}}), pm = await pemirsa(M.DB, "Dinding", ["dinding"]), o = await staf(M.DB, "Memo Uji", ["operator_cc"]);
  const a1 = await tugas(M.DB, {dibuat: Date.now() - 20 * MENIT});
  const d1 = await M.api("GET", "/api/cc/dinding", undefined, pm.h); assert.equal(d1.j.ringkasan.baru, 1);
  await tugas(M.DB, {dibuat: Date.now() - 10 * MENIT});
  const d2 = await M.api("GET", "/api/cc/dinding", undefined, pm.h); assert.equal(d2.j.ringkasan.baru, 1, "memo: alert baru belum terlihat"); assert.equal(d2.j.data_pada, d1.j.data_pada); assert.ok(d2.j.kini >= d1.j.kini);
  assert.equal((await M.api("GET", "/api/cc/antrean", undefined, o.h)).j.alert.length, 2, "antrean memo-nya sendiri (5 dtk bawaan, di sini 60): dibangun baru, tidak memakai memo dinding");
  assert.equal((await aksi(a1, {dari: "baru", ke: "dalam_konfirmasi"}, o.h, M.api)).s, 200);
  const d3 = await M.api("GET", "/api/cc/dinding", undefined, pm.h); assert.deepEqual([d3.j.ringkasan.baru, d3.j.ringkasan.dalam_konfirmasi], [1, 1], "aksi membuang memo isolat ini");
  assert.notEqual(d3.j.data_pada, d1.j.data_pada);
});

uji("cc tanpa migrasi pendukung: tugas_bencana (0047) belum ada = semua tugas karhutla; tabel cc_* belum ada = 503 sopan tanpa nomor migrasi", async () => {
  const N = await siapkan("uji-cc-tanpa-0047", {ikat: {CC_MEMO_DETIK: "0"}}), o = await staf(N.DB, "Operator Lama", ["operator_cc"]), pm = await pemirsa(N.DB, "Dinding", ["dinding"]);
  await N.DB.exec("DROP TABLE tugas_bencana");
  const id = await tugas(N.DB), kunci = "karhutla:" + await kunciPublikKarhutla(id) + ":siaga";
  assert.ok((await N.api("GET", "/api/cc/antrean", undefined, o.h)).j.alert.some(a => a.id === id));
  assert.equal((await aksi(id, {dari: "baru", ke: "dalam_konfirmasi"}, o.h, N.api)).s, 200);
  assert.equal((await N.api("GET", "/api/cc/status?kunci=" + kunci, undefined, o.h)).j.status, "dalam_konfirmasi");
  assert.equal((await N.api("GET", "/api/cc/dinding", undefined, pm.h)).j.ringkasan.dalam_konfirmasi, 1);
  /* Meja Pantau tanpa tugas_bencana: kartu api tetap alert (semua tugas karhutla) */
  const lamaN = await tugas(N.DB, {dibuat: Date.now() - 8 * JAM}), pn = (await N.api("GET", "/api/pantau", undefined, o.h)).j.butir.find(b => b.id === "api-konf:" + lamaN);
  assert.deepEqual([pn.cc.alert, pn.cc.status, pn.cc.aksi], [true, "baru", ["dalam_konfirmasi"]]);
  /* tabel cc_* belum dimigrasi: 503 untuk rute yang membutuhkannya, bukan 500 */
  const K = await siapkan("uji-cc-tanpa-cc", {ikat: {CC_MEMO_DETIK: "0"}}), ko = await staf(K.DB, "Operator Baru", ["operator_cc"]), kid = await tugas(K.DB);
  for (const t of ["cc_hadir", "cc_status", "cc_jejak"]) await K.DB.exec(`DROP TABLE ${t}`);
  for (const [m, j, b] of [["GET", "/api/cc/antrean"], ["GET", "/api/cc/log?tgl=2026-10-20"], ["POST", `/api/cc/aksi/${kid}`, {dari: "baru", ke: "dalam_konfirmasi"}]]) {
    const r = await K.api(m, j, b, ko.h); assert.equal(r.s, 503, `${m} ${j}: ${r.t}`); assert.doesNotMatch(r.t, /0099|\.sql|cc_/, "503 tanpa nomor migrasi atau nama tabel");
  }
  assert.equal((await K.api("GET", "/api/cc/kontak?prov=12", undefined, ko.h)).s, 200, "kontak tidak butuh tabel cc_*");
  /* Meja Pantau tanpa tabel cc_*: tetap 200, kartu api ada tanpa blok cc, riwayat butir tetap terbaca (migrasi 0099 belum diterapkan di produksi) */
  const lamaK = await tugas(K.DB, {dibuat: Date.now() - 8 * JAM}), pk = await K.api("GET", "/api/pantau", undefined, ko.h); assert.equal(pk.s, 200, pk.t);
  const bk = pk.j.butir.find(b => b.id === "api-konf:" + lamaK); assert.ok(bk && !("cc" in bk), "kartu api tanpa kunci cc bila tabel cc belum ada");
  const jk = await K.api("GET", "/api/pantau/jejak?id=" + encodeURIComponent(bk.id), undefined, ko.h); assert.equal(jk.s, 200, jk.t); assert.deepEqual(jk.j.jejak, []);
});

/* ================================================================ Meja Pantau */
const sisipKe = (tabel, o) => sisip(DB, tabel, o);
uji("cc pantau: operator_cc membaca semua jenis KECUALI regu dan akun; baca saja; tanpa tagih; gabungan dengan pusdalops tetap sah", async () => {
  const now = Date.now(), akun = hex16(0xb000 + ++tn);
  await sisipKe("instansi_akun", {id: akun, username: "akuncc" + tn, jenis: "pemkab", tingkat: "kab", wilayah: "Pemerintah Kabupaten Contoh", kunci_wilayah: "k" + akun, cakupan: '["62"]', prov: "62", kab: "Contoh", garam: "a".repeat(32), sandi_sha: "0".repeat(64),
    status: "menunggu", nama: "Budi Rahasia", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1, dikirim: now - 2 * JAM, wajib_ganti: 0, dibuat: now - 3 * JAM, dummy: 0});
  const tid = await tugas(DB, {status: "buka", konfirmasi_pada: null, dibuat: now - 30 * JAM}), pid = hex16(0xb100 + tn);
  await sisipKe("penugasan", {id: pid, tugas_id: tid, akun_id: akun, nama: "Regu Alfa", peran: "ketua_regu", orang: 4, token_sha: "a".repeat(63) + "1", status: "aktif", dibuat: now - 3 * JAM, kedaluwarsa: now + 5 * JAM, berangkat_pada: now - 2 * JAM, dummy: 0});
  await sisipKe("penugasan_darurat", {penugasan_id: pid, jenis: "terkepung_api", lat: -2.5, lon: 113.2, pada: now - 5 * MENIT});
  const gab = await staf(DB, "Operator Pusdalops", ["operator_cc", "pusdalops"]);
  const pus = (await ambil("/api/pantau", pusd.h)).j, op = await ambil("/api/pantau", op1.h); assert.equal(op.s, 200, op.t);
  /* premis: pusdalops memang melihat butir regu dan akun dari data yang sama */
  for (const k of ["darurat", "regu_sunyi", "akun_menunggu", "api_konfirmasi"]) assert.ok(pus.butir.some(b => b.jenis === k), "pusdalops melihat " + k);
  /* gerbang daftar: setiap jenis butir HARUS ditinjau untuk operator_cc (nama/posisi orang regu, koordinat mentah, dokumen akun); jenis baru membuat uji ini merah sampai ditinjau */
  const TERBUKA = ["api_konfirmasi", "api_kabar", "konsesi_tanpa_kontak", "panggilan_baru", "panggilan_lambat", "usulan_kontak", "laporan_harian", "omc_tanpa_hasil", "inventaris_lama", "api_muncul_lagi", "cek_ulang_jatuh_tempo",
    "korban_baru", "p3k_kedaluwarsa", "p3k_stok", "sippa_alarm", "sippa_titik", "sippa_mingguan_siap", "sippa_mingguan"];
  assert.deepEqual([...TERBUKA, ...TERTUTUP_OPERATOR].sort(), Object.keys(JENIS).sort(), "tiap jenis butir sudah digolongkan terbuka/tertutup untuk operator_cc");
  assert.deepEqual([...TERTUTUP_OPERATOR].sort(), ["akun_menunggu", "angin_ke_regu", "darurat", "regu_rotasi", "regu_sunyi", "sippa_selesai", "sippa_sos"]);
  assert.deepEqual(Object.keys(op.j.jenis).sort(), [...TERBUKA].sort()); assert.ok(op.j.butir.some(b => b.jenis === "api_konfirmasi"));
  for (const k of TERTUTUP_OPERATOR) assert.ok(!op.j.butir.some(b => b.jenis === k) && !(k in op.j.jenis), "tertutup: " + k);
  assert.ok(!JSON.stringify(op.j).includes("Regu Alfa") && !JSON.stringify(op.j).includes("Rahasia"), "nama regu dan data akun tidak ikut");
  assert.deepEqual([op.j.saya.baca_saja, op.j.saya.koordinator, op.j.saya.admin, op.j.staf], [true, false, false, []]);
  assert.ok(op.j.butir.every(b => !b.tagih || b.tagih.length === 0), "tautan tagih (nomor WA) tertutup");
  /* baca saja: semua aksi tulis ditolak, tidak ada yang tertulis */
  const idButir = op.j.butir.find(b => b.jenis === "api_konfirmasi").id, n0 = (await DB.prepare("SELECT count(*) n FROM pantau_tugas").first()).n;
  for (const aksiB of ["ambil", "tugaskan", "lepas", "abaikan", "selesai", "buka"]) { const r = await api("POST", "/api/pantau/butir", {id: idButir, aksi: aksiB, alasan: "tidak penting"}, op1.h); assert.equal(r.s, 403, aksiB); assert.match(r.j.galat, /pimpinan hanya membaca/); }
  assert.equal((await DB.prepare("SELECT count(*) n FROM pantau_tugas").first()).n, n0);
  assert.equal((await api("POST", "/api/pantau/dummy", {aksi: "isi"}, op1.h)).s, 403);
  const darurat = pus.butir.find(b => b.jenis === "darurat").id; assert.equal((await ambil("/api/pantau/jejak?id=" + encodeURIComponent(darurat), op1.h)).s, 404, "jejak butir tertutup: tidak ada");
  /* operator + pusdalops: gabungan hak, termasuk menulis dan jenis regu */
  const g = await ambil("/api/pantau", gab.h); assert.equal(g.s, 200); assert.ok(g.j.butir.some(b => b.jenis === "darurat")); assert.equal(g.j.saya.baca_saja, false);
  assert.equal((await api("POST", "/api/pantau/butir", {id: idButir, aksi: "ambil"}, gab.h)).s, 200);
  await DB.prepare("DELETE FROM pantau_tugas WHERE butir_id = ?").bind(idButir).run();
  assert.equal(HALAMAN_STAF.pantau, null, "halaman Meja Pantau terbuka bagi semua staf");
  await DB.prepare("DELETE FROM penugasan_darurat WHERE penugasan_id = ?").bind(pid).run(); await DB.prepare("DELETE FROM penugasan WHERE id = ?").bind(pid).run();
});

/* ================================================================ Meja Pantau: tautan kerja disaring server, blok tindak lanjut cc pada kartu api, riwayat memuat cc_jejak */
const idKonf = t => "api-konf:" + t, kartuPantau = (j, id) => j.butir.find(b => b.id === id);
uji("cc pantau tautan: tautan kerja hanya bila pemanggil boleh membuka halaman tujuannya (operator_cc, koordalops, pimpinan tanpa tautan instansi); pusdalops dan moderator tetap", async () => {
  const t1 = await tugas(DB, {dibuat: Date.now() - 8 * JAM}), gab = await staf(DB, "Operator Pusdalops Tautan", ["operator_cc", "pusdalops"]);
  const hasil = {};
  for (const [k, h] of Object.entries({pusdalops: pusd.h, gabungan: gab.h, mod: ADMIN, mod2: MOD2, operator: op1.h, koord: koord.h, pimpinan: pim.h})) {
    const r = await ambil("/api/pantau", h); assert.equal(r.s, 200, k); const b = kartuPantau(r.j, idKonf(t1)); assert.ok(b, k + " melihat butir api"); hasil[k] = b.tautan;
    if (hasil[k] === null) assert.ok(!r.t.includes("/admin/instansi"), k + ": tidak ada jejak tautan instansi di respons");
  }
  assert.deepEqual(hasil, {pusdalops: "/admin/instansi", gabungan: "/admin/instansi", mod: "/admin/instansi", mod2: "/admin/instansi", operator: null, koord: null, pimpinan: null});
  /* butirnya sendiri tidak berubah: tetap terlihat, hanya tautannya yang tidak dikirim */
  assert.ok(kartuPantau((await ambil("/api/pantau", op1.h)).j, idKonf(t1)) && kartuPantau((await ambil("/api/pantau", koord.h)).j, idKonf(t1)));
  /* matriks murni: tiap JENIS dikenal HALAMAN_STAF, tiap peran penanganannya berhak membuka layar kerjanya sendiri (perilaku peran yang memang berhak tidak berubah) */
  const buka = (peran, t) => bolehBuka({admin: false, peran}, t);
  for (const [j, d] of Object.entries(JENIS)) {
    assert.ok(bolehBuka({admin: true, peran: []}, d.tautan), "admin/moderator selalu berhak: " + j);
    assert.ok(buka(Object.keys(PERAN), d.tautan), `tautan ${d.tautan} (${j}) dikenal HALAMAN_STAF; jenis baru dengan halaman baru wajib didaftarkan di sana`);
    for (const p of d.peran) assert.ok(buka([p], d.tautan), `${p} menangani ${j} dan harus bisa membuka ${d.tautan}`);
  }
  for (const p of ["operator_cc", "koordalops", "pimpinan"]) for (const t of ["/admin/instansi", "/admin/posko"]) assert.ok(!buka([p], t), `${p} tidak boleh membuka ${t}`);
  for (const t of ["/admin/korban", "/pipa/peta", "/pipa/laporan?jenis=mingguan&minggu=2026-W44"]) { assert.ok(!buka(["operator_cc"], t), "operator_cc: " + t); assert.ok(buka(["koordalops"], t) && buka(["pimpinan"], t), "koordalops dan pimpinan: " + t); }
  for (const t of ["/admin/inventaris", "/admin/omc", "/admin/laporan-karhutla", "/admin/pantau", "/admin/laporan"]) assert.ok(buka(["operator_cc"], t), "operator_cc: " + t);   // /admin/laporan = Ruang Laporan (null = semua staf): kerangka bingkai tanpa data
  for (const t of [null, "", "/admin/tidak-ada", "/command-center", "/admin/instansi/x", "/pipax", "https://contoh.invalid/admin/instansi", "//contoh.invalid/pipa/x"]) assert.ok(!buka(Object.keys(PERAN), t) && !bolehBuka({admin: false, peran: ["pusdalops"]}, t), "tidak dikenal = tidak dibuka: " + t);
  assert.ok(!bolehBuka({admin: true, peran: []}, null), "tanpa tautan tetap tanpa tautan");
  await DB.prepare("DELETE FROM tugas_api WHERE id = ?").bind(t1).run();
});

uji("cc pantau kartu api: butir.cc = alert (karhutla, level 3, <= 7 hari, juga yang diputuskan > 12 jam lalu) atau bukan; aksi menurut hak tulis; pembaca tanpa aksi; peran tanpa hak baca tanpa blok; wilayah dan dummy mengikuti cc", async () => {
  const now = Date.now(), sk = {dibuat: now - 8 * JAM}, ids = {};
  for (const [k, o] of Object.entries({baru: {}, dipegang: {}, finalLama: {}, level2: {level: 2}, sepekan: {dibuat: now - 8 * HARI}, banjir: {banjir: true}, banjirLama: {banjir: true, dibuat: now - 8 * HARI}, aceh: {prov: "11", kab: "Aceh Besar"}, dummy: {dummy: 1}})) ids[k] = await tugas(DB, {...sk, ...o});
  assert.equal((await aksi(ids.dipegang, {dari: "baru", ke: "dalam_konfirmasi"}, op1.h)).s, 200);
  for (const [dari, ke, h] of [["baru", "dalam_konfirmasi", op2.h], ["dalam_konfirmasi", "ada_api", op2.h]]) assert.equal((await aksi(ids.finalLama, {dari, ke}, h)).s, 200);
  await DB.prepare("UPDATE cc_status SET sejak = ? WHERE tugas_id = ?").bind(now - 20 * JAM, ids.finalLama).run();
  assert.ok(!(await ambil("/api/cc/antrean", op1.h)).j.alert.some(a => a.id === ids.finalLama), "premis: keputusan > 12 jam hilang dari antrean cc, tetapi tugasnya masih terbuka dan tetap alert");
  const opDum = await staf(DB, "Operator Dummy Pantau", ["operator_cc"], {dummy: 1}), tulisCc = {baru: ["dalam_konfirmasi"], dipegang: ["ada_api", "tidak_ada_api"], finalLama: ["dalam_konfirmasi"]};
  const cc = (j, k) => kartuPantau(j, idKonf(ids[k]))?.cc, dasar = (j, k) => { const { sejak, aksi: _a, ...sisa } = cc(j, k); return [sisa, sejak]; };
  /* operator_cc: penulis */
  const op = (await ambil("/api/pantau", op1.h)).j;
  assert.deepEqual(dasar(op, "baru"), [{alert: true, tugas: ids.baru, status: "baru", oleh_nama: null}, null]); assert.deepEqual(cc(op, "baru").aksi, tulisCc.baru);
  let [d, sejak] = dasar(op, "dipegang"); assert.deepEqual(d, {alert: true, tugas: ids.dipegang, status: "dalam_konfirmasi", oleh_nama: "Budi Santoso"}); assert.ok(sejak > now - MENIT && sejak <= Date.now()); assert.deepEqual(cc(op, "dipegang").aksi, tulisCc.dipegang);
  [d, sejak] = dasar(op, "finalLama"); assert.deepEqual(d, {alert: true, tugas: ids.finalLama, status: "ada_api", oleh_nama: "Citra Dewi"}); assert.ok(Math.abs(sejak - (now - 20 * JAM)) < 5 * MENIT); assert.deepEqual(cc(op, "finalLama").aksi, tulisCc.finalLama);
  /* sebab dikirim server, bukan ditebak klien: level 3 yang lewat 7 hari BUKAN "bukan level 3" (dulu satu kalimat salah untuk dua sebab) */
  for (const [k, sebab] of Object.entries({level2: "level", sepekan: "umur", banjir: "bencana", banjirLama: "bencana"})) assert.deepEqual(cc(op, k), {alert: false, sebab}, k + " bukan alert cc, sebabnya " + sebab);
  assert.ok(op.butir.filter(b => b.cc?.alert === false).every(b => ["level", "umur", "bencana"].includes(b.cc.sebab)), "tiap butir api non-alert membawa sebab yang dikenal");
  assert.equal(kartuPantau(op, idKonf(ids.banjir)).bencana, "banjir"); assert.equal(kartuPantau(op, idKonf(ids.dummy)), undefined, "dummy tak terlihat oleh operator nyata");
  assert.deepEqual(Object.keys(cc(op, "baru")).sort(), ["aksi", "alert", "oleh_nama", "sejak", "status", "tugas"]);
  /* pembaca (koordalops, pimpinan): status dan pemegang yang sama, tanpa aksi */
  for (const h of [koord.h, pim.h]) { const j = (await ambil("/api/pantau", h)).j; for (const k of Object.keys(tulisCc)) { assert.equal(cc(j, k).status, cc(op, k).status); assert.equal(cc(j, k).oleh_nama, cc(op, k).oleh_nama); assert.deepEqual(cc(j, k).aksi, [], "pembaca tanpa tombol: " + k); } assert.deepEqual(cc(j, "level2"), {alert: false, sebab: "level"}); assert.deepEqual(cc(j, "sepekan"), {alert: false, sebab: "umur"}, "pembaca juga menerima sebab (klien yang memutuskan siapa yang melihat keterangannya)"); }
  /* moderator menulis; pelakunya tampil 'Moderator', hash tokennya tidak pernah ikut */
  for (const h of [ADMIN, MOD2]) { const j = (await ambil("/api/pantau", h)).j; for (const [k, a] of Object.entries(tulisCc)) assert.deepEqual(cc(j, k).aksi, a, "moderator menulis: " + k); }
  assert.equal((await aksi(ids.baru, {dari: "baru", ke: "dalam_konfirmasi"}, ADMIN)).s, 200);
  const hash = (await statusDari(DB, ids.baru)).oleh, mj = await ambil("/api/pantau", pim.h); assert.match(hash, /^[0-9a-f]{12}$/);
  assert.equal(cc(mj.j, "baru").oleh_nama, "Moderator"); assert.ok(!mj.t.includes(hash), "hash token moderator tidak keluar dari /api/pantau");
  await DB.prepare("DELETE FROM cc_status WHERE tugas_id = ?").bind(ids.baru).run();   // kembali 'baru' untuk pembanding berikut (jejaknya append-only dan tetap)
  /* peran tanpa hak baca cc: tanpa blok apa pun; butir api yang sama tetap sama seperti sebelum cc */
  const pj = await ambil("/api/pantau", pusd.h); assert.ok(kartuPantau(pj.j, idKonf(ids.baru)) && pj.j.butir.every(b => !("cc" in b)), "pusdalops (tanpa hak cc): tidak ada kunci cc"); assert.ok(!pj.t.includes('"cc"'));
  const gab = (await ambil("/api/pantau", (await staf(DB, "Gabungan Pantau", ["operator_cc", "pusdalops"])).h)).j; assert.deepEqual(cc(gab, "baru").aksi, ["dalam_konfirmasi"], "operator + pusdalops: hak gabungan");
  /* hanya butir api yang membawa cc */
  assert.deepEqual(JENIS_CC, ["api_konfirmasi", "api_kabar", "api_muncul_lagi"]); assert.ok(op.butir.filter(b => !JENIS_CC.includes(b.jenis)).every(b => !("cc" in b)));
  /* wilayah: operator provinsi 62 hanya melihat butir provinsinya; yang di 11 tak ada, jadi tak ada blok */
  const ow = (await ambil("/api/pantau", opWil.h)).j; assert.ok(cc(ow, "baru") && !kartuPantau(ow, idKonf(ids.aceh)), "wilayah 62: tugas prov 11 tak terlihat"); assert.ok(kartuPantau(op, idKonf(ids.aceh)).cc.alert);
  /* dummy: hanya staf dummy dan moderator */
  assert.equal(cc((await ambil("/api/pantau", opDum.h)).j, "dummy").alert, true); assert.equal(cc((await ambil("/api/pantau", ADMIN)).j, "dummy").alert, true);
  /* aksi dari kartu = rute cc yang sama, kunci tugas dari butir.cc.tugas; stale -> 409 membawa status sekarang (dasar pesan singkat di layar) */
  const k0 = cc(op, "dipegang"), ok = await aksi(k0.tugas, {dari: k0.status, ke: "ada_api"}, op1.h); assert.equal(ok.s, 200);
  const kini = cc((await ambil("/api/pantau", op1.h)).j, "dipegang"); assert.deepEqual([kini.status, kini.oleh_nama, kini.aksi], ["ada_api", "Budi Santoso", ["dalam_konfirmasi"]], "muat ulang Meja Pantau langsung melihat keadaan baru (bukan memo antrean)");
  const basi = await aksi(k0.tugas, {dari: k0.status, ke: "tidak_ada_api"}, op2.h); assert.equal(basi.s, 409); assert.deepEqual([basi.j.status, basi.j.oleh_nama], ["ada_api", "Budi Santoso"]); assert.ok(Number.isFinite(basi.j.sejak));
  await DB.prepare("DELETE FROM tugas_api WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(Object.values(ids))).run(); await DB.prepare("DELETE FROM cc_status WHERE tugas_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(Object.values(ids))).run();
});

uji("cc pantau riwayat: kartu api yang tugasnya alert memuat cc_jejak digabung urut waktu dengan riwayat butir; nama pelaku saja (moderator 'Moderator', tanpa hash); hanya pembaca cc; bukan alert, wilayah, dummy mengikuti cc", async () => {
  const now = Date.now(), t = await tugas(DB, {dibuat: now - 8 * JAM}), bukan = await tugas(DB, {dibuat: now - 8 * JAM, level: 2}), lama = await tugas(DB, {dibuat: now - 8 * HARI}), aceh = await tugas(DB, {dibuat: now - 8 * JAM, prov: "11"});
  const gab = await staf(DB, "Pegawai Gabungan", ["operator_cc", "pusdalops"]), id = idKonf(t);
  /* urutan nyata: gab mengambil butir, op1 menindak, moderator memutuskan, op2 mengoreksi dengan catatan */
  assert.equal((await api("POST", "/api/pantau/butir", {id, aksi: "ambil"}, gab.h)).s, 200);
  assert.equal((await aksi(t, {dari: "baru", ke: "dalam_konfirmasi", catatan: "Telepon Kalak BPBD"}, op1.h)).s, 200);
  assert.equal((await aksi(t, {dari: "dalam_konfirmasi", ke: "ada_api", catatan: "Api terlihat dari pos"}, ADMIN)).s, 200);
  assert.equal((await aksi(t, {dari: "ada_api", ke: "dalam_konfirmasi", catatan: "Salah lokasi"}, op2.h)).s, 200);
  const hash = (await DB.prepare("SELECT oleh FROM cc_jejak WHERE tugas_id = ? AND oleh NOT LIKE 'staf:%'").bind(t).first()).oleh; assert.match(hash, /^[0-9a-f]{12}$/);
  const baca = async (h, i = id) => ambil("/api/pantau/jejak?id=" + encodeURIComponent(i), h);
  for (const [k, h] of Object.entries({operator: op1.h, koord: koord.h, pimpinan: pim.h, gabungan: gab.h, moderator: ADMIN})) {
    const r = await baca(h); assert.equal(r.s, 200, k); const j = r.j.jejak;
    assert.deepEqual(j.filter(x => x.cc).map(x => [x.oleh_nama, x.cc.dari, x.cc.ke, x.catatan]), [["Citra Dewi", "ada_api", "dalam_konfirmasi", "Salah lokasi"], ["Moderator", "dalam_konfirmasi", "ada_api", "Api terlihat dari pos"], ["Budi Santoso", "baru", "dalam_konfirmasi", "Telepon Kalak BPBD"]], k + ": log cc terbaru dulu");
    assert.deepEqual(j.filter(x => !x.cc).map(x => [x.aksi, x.oleh_nama]), [["ambil", "Pegawai Gabungan"]], k + ": riwayat butir tetap ada");
    assert.ok(j.every((x, i) => i === 0 || j[i - 1].waktu >= x.waktu), k + ": satu daftar urut waktu, terbaru dulu"); assert.ok(j.filter(x => x.cc).every(x => x.aksi === "tindak lanjut" && x.ke_nama === null));
    assert.ok(!r.t.includes(hash), k + ": hash token moderator tidak keluar"); assert.ok(j.every(x => !("oleh" in x)), k + ": kunci pelaku mentah tidak dikirim");
  }
  /* digabung urut waktu sungguhan: butir yang ditulis sesudah jejak cc terakhir naik ke atas */
  await sisip(DB, "pantau_jejak", {waktu: Date.now() + 1, oleh: "staf:" + gab.id, obyek: "butir:" + id, aksi: "lepas"});
  assert.deepEqual((await baca(op1.h)).j.jejak.map(x => x.cc ? "cc" : x.aksi), ["lepas", "cc", "cc", "cc", "ambil"], "lepas (terbaru) di atas, ambil (terlama) di bawah, tiga log cc di antaranya");
  /* peran tanpa hak baca cc melihat riwayat butir saja */
  const pj = (await baca(pusd.h)).j.jejak; assert.ok(pj.length >= 1 && pj.every(x => !x.cc), "pusdalops: tanpa log cc"); assert.ok(!(await baca(pusd.h)).t.includes("tindak lanjut"));
  /* bukan alert (level 2 / > 7 hari): jejak cc yang ada tidak ikut, walau butirnya terlihat */
  for (const x of [bukan, lama]) { await sisip(DB, "cc_jejak", {waktu: now - JAM, tugas_id: x, oleh: op1.oleh, dari: "baru", ke: "dalam_konfirmasi", catatan: "tidak boleh tampil", dummy: 0}); const r = await baca(op1.h, idKonf(x)); assert.equal(r.s, 200); assert.ok(r.j.jejak.every(y => !y.cc) && !r.t.includes("tidak boleh tampil"), "bukan alert: tanpa log cc"); }
  /* wilayah: operator provinsi 62 tidak melihat butir (jadi riwayat) tugas provinsi 11; operator nasional melihat */
  assert.equal((await baca(opWil.h, idKonf(aceh))).s, 404); assert.equal((await baca(op1.h, idKonf(aceh))).s, 200);
  /* dummy: jejak cc dummy hanya untuk staf dummy dan moderator */
  const dum = await tugas(DB, {dibuat: now - 8 * JAM, dummy: 1}), opDum = await staf(DB, "Operator Dummy Riwayat", ["operator_cc"], {dummy: 1});
  assert.equal((await aksi(dum, {dari: "baru", ke: "dalam_konfirmasi", catatan: "latihan"}, opDum.h)).s, 200);
  assert.deepEqual((await baca(opDum.h, idKonf(dum))).j.jejak.filter(x => x.cc).map(x => x.catatan), ["latihan"]); assert.equal((await baca(op1.h, idKonf(dum))).s, 404, "dummy bagi pelaku nyata: tak ada");
  /* tanpa autentikasi dan akun gerbang: rute lama menolak seperti semula */
  assert.equal((await baca({})).s, 401); assert.equal((await baca(GERBANG)).s, 403);
  await DB.prepare("DELETE FROM pantau_tugas WHERE butir_id = ?").bind(id).run();
  await DB.prepare("DELETE FROM tugas_api WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify([t, bukan, lama, aceh, dum])).run(); await DB.prepare("DELETE FROM cc_status WHERE tugas_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify([t, dum])).run();
});

/* ================================================================ hak baca modul lain */
uji("cc hak: operator_cc membaca monitor (tanda baca), SLA, OMC, inventaris; PIC/koordinat foto dan WA PIC tertutup; semua tulis, korban, buku kontak, SIPPA, akun staf tetap tertutup", async () => {
  /* monitor: akun instansi + groundcheck berfoto sebagai sumber */
  const akun = hex16(0xb200 + ++tn), tid = await tugas(DB, {dibuat: Date.now() - 2 * JAM}), isi = hex16(0xb300 + tn), foto = hex16(0xb400 + tn);
  await sisipKe("instansi_akun", {id: akun, username: "akunmon" + tn, jenis: "pemkab", tingkat: "kab", wilayah: "Pemerintah Kabupaten Contoh", kunci_wilayah: "k" + akun, cakupan: '["62"]', prov: "62", kab: "Contoh", garam: "a".repeat(32), sandi_sha: "0".repeat(64),
    status: "aktif", nama: "Budi Uji", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1, dikirim: 1, diputus: 1, wajib_ganti: 0, dibuat: 1, dummy: 0});
  await DB.prepare(`INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa, jarak_km) VALUES (?, ?, ?, 'klien-cc-1', 'konfirmasi', ?, -2.2, 113.9, 1, 'api_ada', 'Pak PIC', 'Kasi', '628123456780', 0.4)`).bind(isi, tid, akun, Date.now()).run();
  await DB.prepare(`INSERT INTO instansi_media (id, akun_id, tugas_id, isian_id, jenis, mime, ukuran, waktu_ambil, sumber_waktu, lat, lon, waktu_gps, dibuat) VALUES (?, ?, ?, ?, 'foto', 'image/jpeg', 10, ?, 'exif', -2.2, 113.9, ?, ?)`).bind(foto, akun, tid, isi, Date.now(), Date.now(), Date.now()).run();
  const gm = r => r.j.tugas.find(t => t.id === tid).groundcheck;
  const mo = await ambil("/api/monitor", op1.h); assert.equal(mo.s, 200, mo.t); assert.equal(mo.j.pihak, "dalops");
  assert.deepEqual([gm(mo).hasil, gm(mo).pic_nama, gm(mo).media[0].lat, gm(mo).media[0].lon, gm(mo).media[0].thumb], ["api_ada", null, null, null, `/api/monitor/thumb/${foto}`], "operator saja: PIC dan koordinat foto tertutup, fotonya sendiri terlihat");
  const mp = await ambil("/api/monitor", pusd.h); assert.deepEqual([gm(mp).pic_nama, gm(mp).media[0].lat], ["Pak PIC", -2.2], "peran dalops lain tetap seperti semula");
  const gab = (await staf(DB, "Operator Dalops", ["operator_cc", "pimpinan"])); assert.equal(gm(await ambil("/api/monitor", gab.h)).pic_nama, "Pak PIC", "operator + pimpinan: hak pimpinan berlaku");
  assert.ok(!JSON.stringify(mo.j).includes("628123456780") && !JSON.stringify(mo.j).includes("Budi Uji"), "WA PIC dan data akun tidak ikut");
  assert.equal((await ambil("/api/monitor", tmc.h)).s, 403);
  const tb = await api("POST", "/api/monitor/baca", {tugas: [tid]}, op1.h); assert.deepEqual([tb.s, tb.j.dicatat], [200, 1]);
  assert.deepEqual(await DB.prepare("SELECT pihak, nama FROM monitor_baca WHERE tugas_id = ?").bind(tid).first(), {pihak: "dalops", nama: "Budi Santoso"});
  assert.equal((await api("POST", "/api/monitor/baca", {tugas: [tid]}, tmc.h)).s, 403);
  /* SLA: peran apa pun termasuk operator_cc, kecuali peran modul lain (kemitraan) */
  assert.equal((await ambil("/api/sla", op1.h)).s, 200); assert.equal((await ambil("/api/sla", kampus.h)).s, 403);
  /* OMC: baca saja */
  const om = await ambil("/api/omc/admin", op1.h); assert.equal(om.s, 200); assert.equal(om.j.boleh_tulis, false); assert.equal((await ambil("/api/omc/admin", tmc.h)).j.boleh_tulis, true);
  assert.equal((await api("POST", "/api/omc/sortie", {}, op1.h)).s, 403); assert.equal((await api("POST", "/api/omc/operasi", {}, op1.h)).s, 403);
  /* inventaris: lihat saja; WA PIC gudang tertutup (data contoh lewat staf dummy karena dummy tak terlihat staf nyata) */
  const d = await api("POST", "/api/inventaris/dummy", {aksi: "isi"}, ADMIN); assert.ok([200, 201].includes(d.s), d.t);
  const od = await staf(DB, "Operator Dummy Inv", ["operator_cc"], {dummy: 1}), vd = await staf(DB, "Verifikator Dummy Inv", ["verifikator"], {dummy: 1});
  const io = await ambil("/api/inventaris", od.h), iv = await ambil("/api/inventaris", vd.h); assert.equal(io.s, 200, io.t); assert.ok(io.j.gudang.length > 0);
  assert.ok(io.j.gudang.every(g => g.pic_wa === null), "operator_cc: bukan bolehPic"); assert.ok(iv.j.gudang.some(g => typeof g.pic_wa === "string" && g.pic_wa.length > 5), "verifikator melihat WA PIC (pembanding)");
  assert.equal((await ambil(`/api/inventaris/gudang/${io.j.gudang[0].id}`, od.h)).j.gudang.pic_wa, null);
  assert.equal((await api("POST", "/api/inventaris/dummy", {aksi: "hapus"}, op1.h)).s, 403); assert.equal((await ambil("/api/inventaris", op1.h)).s, 200, "operator nyata: lihat tanpa dummy");
  assert.equal((await api("POST", "/api/instansi/gudang", {nama: "x"}, op1.h)).s, 401, "tulis inventaris hanya akun instansi pemilik");
  /* tetap tertutup */
  for (const [m, j, b] of [["GET", "/api/korban"], ["GET", "/api/korban/jejak/" + hex16(0x1)], ["POST", "/api/korban/dummy", {aksi: "isi"}], ["GET", "/api/kontak/admin"], ["GET", "/api/staf/admin/daftar"], ["POST", "/api/staf/admin/buat", {}],
    ["GET", "/api/sippa/kit"], ["GET", "/api/sippa/log"], ["POST", "/api/sippa/kit", {}], ["GET", "/api/instansi/admin/antrean"], ["POST", "/api/omc/dummy", {aksi: "isi"}], ["POST", "/api/posko/dummy", {aksi: "isi"}],
    /* modul Pusdalops (Juklak 7/2023, 1 Nov 2026): logbook, operasi (pemulihan, Laporan Khusus, roll call), sensor, daftar petugas lapangan (nama/NIP/wajah) = pusdalops/koordalops/pimpinan saja */
    ["GET", "/api/logbook/hari"], ["GET", "/api/logbook/buka"], ["POST", "/api/logbook/kejadian", {}], ["POST", "/api/logbook/dummy", {aksi: "isi"}], ["GET", "/api/pusdalops/rollcall"], ["POST", "/api/pusdalops/rollcall", {}], ["GET", "/api/pusdalops/lapsus"],
    ["POST", "/api/pusdalops/lapsus", {}], ["GET", "/api/pusdalops/pemulihan"], ["POST", "/api/pusdalops/pemulihan", {}], ["GET", "/api/sensor/status"], ["GET", "/api/petugas/panel/orang"],
    /* Pusdalops Gelombang 3 (migrasi 0098): wajib tutup dan papan SK aktif (logbook), peringatan berantai, antrean medsos/TV: semua tulis dan baca pusdalops/koordalops/pimpinan saja */
    ["POST", "/api/logbook/kejadian/" + hex16(0x2) + "/tutup", {}], ["POST", "/api/logbook/kejadian/" + hex16(0x2) + "/entri", {}], ["POST", "/api/logbook/kejadian/" + hex16(0x2) + "/sk", {}], ["GET", "/api/logbook/kejadian/" + hex16(0x2) + "/sk"], ["GET", "/api/logbook/sk/aktif"],
    ["GET", "/api/pusdalops/berantai?aktif=1"], ["POST", "/api/pusdalops/berantai/dummy", {aksi: "isi"}],
    ["GET", "/api/pusdalops/medsos"], ["POST", "/api/pusdalops/medsos", {}], ["POST", "/api/pusdalops/medsos/verifikasi", {}], ["GET", "/api/pusdalops/medsos/jeda"], ["POST", "/api/pusdalops/medsos/dummy", {aksi: "isi"}]]) {
    const r = await api(m, j, b, op1.h); assert.ok([401, 403].includes(r.s), `${m} ${j} harus tertutup bagi operator_cc: ${r.s} ${r.t.slice(0, 100)}`);
  }
  /* SIPPA: keputusan 1 Nov 2026 meminta operator membaca SIPPA, tetapi DESAIN-TEKNIS SIPPA §9.8 mengunci P_SIPPA_BACA = pusdalops/koordalops/pimpinan dan GET kit/log memuat nama regu: tidak diubah */
  assert.deepEqual(P_SIPPA_BACA, ["pusdalops", "koordalops", "pimpinan"]); assert.deepEqual(HALAMAN_STAF.pipa, P_SIPPA_BACA);
  /* Ruang Laporan (/admin/laporan, upstream 1 Nov 2026): kerangka sidebar + iframe terbuka bagi operator_cc; isinya dijaga hak masing-masing (logbook 403 di atas, laporan_bnpb adminOK) */
  const rl = await ambil("/admin/laporan", op1.h); assert.equal(rl.s, 200, rl.t.slice(0, 100)); assert.match(rl.t, /<iframe id="rlBingkai"/);
  /* hak halaman */
  const hal = k => HALAMAN_STAF[k]; assert.ok(["kinerja", "inventaris", "omc"].every(k => hal(k).includes("operator_cc")) && ["instansi", "korban", "posko", "pipa"].every(k => !hal(k).includes("operator_cc")));
});

/* ================================================================ gerbang halaman centurisk97.id */
uji("cc gerbang: sesi staf operator_cc melihat halaman terkunci centurisk97.id (GET/HEAD); peran staf lain, tamu, sesi palsu tetap dialihkan ke login", async () => {
  const situs = (j, h = {}, metode = "GET") => mf.dispatchFetch("https://centurisk97.id" + j, {method: metode, redirect: "manual", headers: h});
  const o = await situs("/monitor", {cookie: op1.cookie}); assert.equal(o.status, 200, "operator masuk"); assert.match(o.headers.get("cache-control"), /no-store/); assert.match(await o.text(), /<html/i);
  assert.equal((await situs("/monitor", {cookie: op1.cookie}, "HEAD")).status, 200); assert.equal((await situs("/laporan", {cookie: op2.cookie})).status, 200); assert.equal((await situs("/direktori", {cookie: opWil.cookie})).status, 200, "operator berwilayah juga");
  for (const [nama, h] of [["pusdalops", pusd.cookie], ["koordalops", koord.cookie], ["pimpinan", pim.cookie], ["tmc", tmc.cookie], ["kemitraan", kampus.cookie], ["operator dengan sandi awal belum diganti", tertahan.cookie], ["tamu", ""], ["sesi palsu", "sesi_staf=" + "c".repeat(64)], ["pemirsa dinding", pDinding.h.cookie]]) {
    const r = await situs("/monitor", h ? {cookie: h} : {}); assert.equal(r.status, 303, nama); assert.ok(/^\/admin\/masuk\?ke=|^\/(command-center\/dinding|berita|peta)/.test(r.headers.get("location")), `${nama}: ${r.headers.get("location")}`);
    if (nama !== "pemirsa dinding") assert.match(r.headers.get("location"), /^\/admin\/masuk\?ke=%2Fmonitor/, nama);
  }
  assert.equal((await situs("/monitor", {cookie: pDinding.h.cookie})).headers.get("location"), "/command-center/dinding", "pemirsa dinding diarahkan ke halaman dinding, bukan /dinding");
  assert.equal((await situs("/monitor", {cookie: pPeta.h.cookie})).headers.get("location"), "/peta");
  /* sesi staf yang dicabut atau kedaluwarsa tidak lagi lolos */
  await DB.prepare("UPDATE staf_sesi SET kedaluwarsa = 2 WHERE staf_id = ?").bind(op2.id).run(); assert.equal((await situs("/monitor", {cookie: op2.cookie})).status, 303);
  const cabut = await staf(DB, "Operator Cabut", ["operator_cc"]); assert.equal((await situs("/monitor", {cookie: cabut.cookie})).status, 200);
  await DB.prepare("UPDATE staf SET status = 'dicabut' WHERE id = ?").bind(cabut.id).run(); assert.equal((await situs("/monitor", {cookie: cabut.cookie})).status, 303);
  /* gerbang lain tidak melonggar: tulis lewat host terkunci tetap lewat auth rute, dan peran lain tak menembus */
  assert.equal((await mf.dispatchFetch("https://centurisk97.id/api/cc/kontak?prov=12", {headers: pusd.h})).status, 403);
});

/* ================================================================ peran dan akun */
uji("cc peran: Super Admin memberi peran operator_cc dan tab dinding lewat API; peran liar tetap ditolak; operator_cc muncul di /api/staf/saya dan daftar akses", async () => {
  const buat = (peran) => api("POST", "/api/staf/admin/buat", {nama: "Operator Via API", nip: `1979${++sn}0012005`, unit: "Command Center", email: `o${sn}@bnpb.go.id`, wa: "081234567890", peran, wilayah: ["62"]}, ADMIN);
  assert.equal((await buat(["operator_cc", "raja"])).s, 400); const r = await buat(["operator_cc"]); assert.equal(r.s, 201, r.t); assert.deepEqual(r.j.staf.peran, ["operator_cc"]);
  const daftar = await api("GET", "/api/staf/admin/daftar", undefined, ADMIN); assert.equal(daftar.j.peran.operator_cc, "Operator command center");
  assert.deepEqual(daftar.j.akses.operator_cc.map(a => a.k).sort(), ["command-center", "inventaris", "kinerja", "laporan", "laporan-karhutla", "omc", "pantau"].sort(), "halaman yang dibuka operator_cc (baca saja, plus meja command center; Ruang Laporan = kerangka tanpa data, tiap bingkai menjaga hak sendiri)");
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": "198.51.100.77"}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  const s = await api("GET", "/api/staf/saya", undefined, {cookie}); assert.equal(s.s, 200); assert.deepEqual(s.j.staf.peran, ["operator_cc"]);
  assert.equal((await api("GET", "/api/cc/antrean", undefined, {cookie})).s, 200, "operator dari alur akun sungguhan masuk ke meja");
  assert.equal((await api("POST", "/api/pemirsa/admin/buat", {nama: "Layar Dinding Ruang", tab: ["dinding"]}, ADMIN)).s, 201); assert.equal((await api("POST", "/api/pemirsa/admin/buat", {nama: "Tab Liar", tab: ["dinding", "x"]}, ADMIN)).s, 400);
  const pm = (await api("GET", "/api/pemirsa/admin/daftar", undefined, ADMIN)).j; assert.equal(pm.tab.dinding, "Layar dinding"); assert.deepEqual(pm.pemirsa.find(p => p.nama === "Layar Dinding Ruang").tab, ["dinding"]);
});


/* ================================================================ halaman: meja operator (/command-center) dan layar dinding (/command-center/dinding) */
const man = async (j, h = {}, host = "http://bnpb.lokal", metode = "GET") => { const r = await mf.dispatchFetch(host + j, {method: metode, redirect: "manual", headers: h}); return {s: r.status, h: r.headers, t: await r.text()}; };
const SITUS = "https://centurisk97.id", KE_MEJA = "/admin/pantau?ke=%2Fcommand-center", KE_DINDING = "/admin/masuk?ke=%2Fcommand-center%2Fdinding";
const berkasKlien = t => [...t.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))(?:\?v=\d+)?"/g)].map(m => m[1]);

uji("cc halaman meja: /command-center terbuka bagi operator, koordalops, pimpinan, moderator; tamu ke Meja Pantau; sesi tanpa hak 403 polos; CSP_ADMIN tanpa sebaris", async () => {
  const tamu = await man("/command-center"); assert.equal(tamu.s, 303); assert.equal(tamu.h.get("location"), KE_MEJA); assert.match(tamu.h.get("cache-control"), /no-store/);
  const kasus = [["moderator", ADMIN, 200], ["operator", op1.h, 200], ["operator berwilayah", opWil.h, 200], ["koordalops", koord.h, 200], ["pimpinan", pim.h, 200],
    ["akun gerbang situs", GERBANG, 403], ["pusdalops", pusd.h, 403], ["tmc", tmc.h, 403], ["kemitraan", kampus.h, 403], ["pemirsa dinding", pDinding.h, 403], ["pemirsa peta", pPeta.h, 403], ["operator sandi awal belum diganti", tertahan.h, 303]];
  for (const [nama, h, s] of kasus) { const r = await man("/command-center", h); assert.equal(r.s, s, `${nama}: ${r.s} ${r.t.slice(0, 80)}`); if (s === 403) { assert.match(r.t, /tidak punya akses/); assert.doesNotMatch(r.t, /command_center\.js/, nama + ": 403 polos tanpa skrip"); } }
  assert.equal((await man("/command-center", tertahan.h)).h.get("location"), KE_MEJA, "sandi awal belum diganti: ke layar masuk staf untuk menggantinya");
  /* header dan isi */
  const r = await man("/command-center", op1.h), h = r.h;
  assert.match(h.get("content-type"), /text\/html/); assert.match(h.get("cache-control"), /private, no-store/); assert.match(h.get("vary"), /cookie/i); assert.equal(h.get("x-frame-options"), "DENY"); assert.match(h.get("x-robots-tag"), /noindex/);
  assert.equal(h.get("content-security-policy"), CSP_ADMIN); assert.doesNotMatch(CSP_ADMIN, /unsafe-inline|unsafe-eval/);
  assert.match(r.t, /data-staf="1" data-peran="operator_cc"/); assert.match(r.t, /<span class="ad-sep staf">Staf<\/span>/); assert.match(r.t, /data-staf-keluar/); assert.match(r.t, /href="\/admin\/command-center" aria-current="page"/);
  assert.doesNotMatch(r.t, /\sstyle=|<style|\son[a-z]+=|<script(?![^>]*\ssrc=)/i, "tanpa gaya dan skrip sebaris");
  const klien = berkasKlien(r.t);
  assert.ok(["/admin/command_bersama.css", "/admin/command_center.css", "/admin/command_bersama.js", "/admin/command_center.js"].every(x => klien.includes(x)), klien.join(" "));
  for (const f of klien) assert.ok(existsSync(path.join(AKAR, "public", f)), "berkas klien ada: " + f);
  /* moderator: kerangka admin penuh; koordalops/pimpinan: kerangka staf */
  const m = await man("/command-center", ADMIN); assert.match(m.t, /<span class="ad-sep">Admin<\/span>/); assert.match(m.t, /action="\/admin\/keluar"/); assert.doesNotMatch(m.t, /data-staf="1"/);
  assert.match((await man("/command-center", koord.h)).t, /data-peran="koordalops"/); assert.match((await man("/command-center", pim.h)).t, /data-peran="pimpinan"/);
  /* host terkunci centurisk97.id: halaman menjaga dirinya sendiri (tamu ke Meja Pantau, bukan /admin/masuk); operator tidak perlu akun gerbang; peran lain 403 polos */
  const s0 = await man("/command-center", {}, SITUS); assert.equal(s0.s, 303); assert.equal(s0.h.get("location"), KE_MEJA);
  assert.equal((await man("/command-center", {cookie: op1.cookie}, SITUS)).s, 200); assert.equal((await man("/command-center", {cookie: koord.cookie}, SITUS)).s, 200);
  assert.equal((await man("/command-center", {cookie: pusd.cookie}, SITUS)).s, 403); assert.equal((await man("/command-center", pDinding.h, SITUS)).s, 403);
  assert.equal((await man("/command-center/", {cookie: op1.cookie}, SITUS)).s, 200, "garis miring penutup sama saja");
  assert.equal((await man("/command-center", {cookie: "sesi_staf=" + "c".repeat(64)}, SITUS)).s, 303, "sesi palsu = tamu");
  /* sesi dicabut atau kedaluwarsa: tidak lagi masuk */
  const cabut = await staf(DB, "Operator Halaman Cabut", ["operator_cc"]); assert.equal((await man("/command-center", cabut.h)).s, 200);
  await DB.prepare("UPDATE staf SET status = 'dicabut' WHERE id = ?").bind(cabut.id).run(); assert.equal((await man("/command-center", cabut.h)).s, 303);
  /* POST ke halaman: 405, bukan jatuh ke aset */
  assert.equal((await man("/command-center", op1.h, "http://bnpb.lokal", "POST")).s, 405);
});

uji("cc halaman dinding: /command-center/dinding bagi pemirsa tab dinding, operator, koordalops, pimpinan, moderator; tamu ke /admin/masuk; CSP_DINDING; kerangka tanpa alarm.js/sapa/asisten", async () => {
  for (const host of ["http://bnpb.lokal", SITUS]) {
    const tamu = await man("/command-center/dinding", {}, host); assert.equal(tamu.s, 303, host); assert.equal(tamu.h.get("location"), KE_DINDING, "tamu ke form tempat pemirsa masuk");
    const kasus = [["pemirsa dinding", pDinding.h, 200], ["moderator", ADMIN, 200], ["operator", {cookie: op1.cookie}, 200], ["koordalops", {cookie: koord.cookie}, 200], ["pimpinan", {cookie: pim.cookie}, 200],
      ["pemirsa peta", pPeta.h, 403], ["akun gerbang situs", GERBANG, 403], ["pusdalops", {cookie: pusd.cookie}, 403], ["tmc", {cookie: tmc.cookie}, 403], ["kemitraan", {cookie: kampus.cookie}, 403], ["operator sandi awal", {cookie: tertahan.cookie}, 303]];
    for (const [nama, h, s] of kasus) { const r = await man("/command-center/dinding", h, host); assert.equal(r.s, s, `${host} ${nama}: ${r.s}`); }
  }
  const r = await man("/command-center/dinding", pDinding.h), h = r.h;
  assert.equal(h.get("content-security-policy"), CSP_DINDING); assert.match(h.get("cache-control"), /private, no-store/); assert.equal(h.get("x-frame-options"), "DENY"); assert.match(h.get("vary"), /cookie/i);
  assert.doesNotMatch(CSP_DINDING, /unsafe-inline|unsafe-eval|googleapis|gstatic/); assert.match(CSP_DINDING, /script-src 'self';/); assert.match(CSP_DINDING, /style-src 'self';/);
  assert.match(CSP_DINDING, /img-src [^;]*https:\/\/\*\.openfreemap\.org/); assert.match(CSP_DINDING, /connect-src [^;]*https:\/\/\*\.openfreemap\.org/); assert.match(CSP_DINDING, /worker-src 'self' blob:/);
  assert.doesNotMatch(r.t, /\sstyle=|<style|\son[a-z]+=|<script(?![^>]*\ssrc=)/i, "tanpa gaya dan skrip sebaris");
  /* tanpa pop-up alarm, sapaan, asisten, persetujuan, statistik: layar dinding tidak boleh membuka modal */
  const skrip = [...r.t.matchAll(/<script src="([^"]+)"/g)].map(m => m[1].replace(/\?v=\d+$/, ""));
  assert.deepEqual(skrip, ["/inti/format.js", "/angka_kawasan.js", "/admin/command_bersama.js", "/admin/command_dinding.js"]);
  assert.doesNotMatch(r.t, /alarm\.js|sapa\.js|asisten|persetujuan|jejak\.js|i18n\.js|tema\.css/);
  for (const f of berkasKlien(r.t)) assert.ok(existsSync(path.join(AKAR, "public", f)), "berkas klien ada: " + f);
  assert.match(r.t, /class="dd-html"/); assert.match(r.t, /<meta name="color-scheme" content="dark">/);
  /* tautan masuk ulang menurut jenis akun: pemirsa dan moderator di /admin/masuk, staf di Meja Pantau */
  assert.match(r.t, new RegExp(`data-akun="pemirsa" data-masuk="${KE_DINDING.replace(/[?]/g, "\\?")}"`));
  assert.match((await man("/command-center/dinding", {cookie: op1.cookie})).t, /data-akun="staf" data-masuk="\/admin\/pantau\?ke=%2Fcommand-center%2Fdinding"/);
  assert.match((await man("/command-center/dinding", ADMIN)).t, /data-akun="mod" data-masuk="\/admin\/masuk\?ke=/);
  assert.equal((await man("/command-center/dinding", pDinding.h, "http://bnpb.lokal", "POST")).s, 405);
});

uji("cc halaman login: pemirsa tab dinding masuk lewat /admin/masuk dan diarahkan ke layar dinding (bukan /dinding); pemirsa multi-tab tetap ke tab pertamanya", async () => {
  const cp = (nama, tab) => api("POST", "/api/pemirsa/admin/buat", {nama, tab}, ADMIN);
  const masuk = (user, sandi, ke = "", ip = "198.51.100.201") => mf.dispatchFetch(SITUS + "/admin/masuk" + (ke ? "?ke=" + encodeURIComponent(ke) : ""), {method: "POST", redirect: "manual",
    headers: {"content-type": "application/x-www-form-urlencoded", origin: SITUS, "cf-connecting-ip": ip}, body: new URLSearchParams({email: user, sandi}).toString()});
  const a = await cp("Layar Dinding Login", ["dinding"]); assert.equal(a.s, 201, a.t);
  const r1 = await masuk(a.j.username, a.j.sandi, "/command-center/dinding"); assert.equal(r1.status, 303); assert.equal(r1.headers.get("location"), "/command-center/dinding");
  const kuki = r1.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0]; assert.ok(kuki);
  const r2 = await masuk(a.j.username, a.j.sandi, "", "198.51.100.202"); assert.equal(r2.headers.get("location"), "/command-center/dinding", "tanpa ?ke=: ke tab pertamanya yang mandiri");
  const r3 = await masuk(a.j.username, a.j.sandi, "/monitor", "198.51.100.203"); assert.equal(r3.headers.get("location"), "/command-center/dinding", "?ke= di luar tabnya diabaikan");
  assert.equal((await man("/command-center/dinding", {cookie: kuki}, SITUS)).s, 200, "sesi pemirsa baru membuka layar dinding");
  assert.equal((await man("/command-center", {cookie: kuki}, SITUS)).s, 403, "tetapi bukan meja");
  assert.equal((await mf.dispatchFetch(SITUS + "/api/cc/antrean", {headers: {cookie: kuki}})).status, 403, "dan bukan API meja");
  assert.equal((await mf.dispatchFetch(SITUS + "/api/cc/dinding", {headers: {cookie: kuki}})).status, 200);
  const b = await cp("Peta dan Dinding", ["peta", "dinding"]); assert.equal(b.s, 201, b.t);
  assert.equal((await masuk(b.j.username, b.j.sandi, "", "198.51.100.204")).headers.get("location"), "/peta", "tab pertama biasa tetap /peta");
  assert.equal((await masuk(b.j.username, b.j.sandi, "/command-center/dinding", "198.51.100.205")).headers.get("location"), "/command-center/dinding");
});

uji("cc halaman menu: entri Command center di menu admin untuk operator_cc, koordalops, pimpinan dan moderator; /admin/command-center meneruskan; ?ke= diikuti sesudah masuk staf", async () => {
  assert.deepEqual([...HALAMAN_STAF["command-center"]].sort(), ["koordalops", "operator_cc", "pimpinan"], "sama dengan peran yang diterima pelaku() untuk meja");
  for (const [nama, h] of [["tamu", {}], ["operator", op1.h], ["tmc", tmc.h], ["moderator", ADMIN]]) { const r = await man("/admin/command-center", h); assert.equal(r.s, 303, nama); assert.equal(r.h.get("location"), "/command-center", nama); assert.equal(r.t, ""); }
  const nav = async h => (await man("/admin/pantau", h)).t;
  for (const h of [op1.h, koord.h, pim.h]) assert.match(await nav(h), /href="\/admin\/command-center"/);
  for (const h of [tmc.h, pusd.h, kampus.h]) assert.doesNotMatch(await nav(h), /href="\/admin\/command-center"/, "peran lain tidak melihat menunya");
  assert.match((await man("/admin/statistik", ADMIN)).t, /href="\/admin\/command-center"/);
  const src = teks("public/admin/pantau.js"), m = src.match(/const KE_PIPA = (\/\^[^\n;]+\/);/); assert.ok(m); const re = eval(m[1]);
  for (const ok of ["/command-center", "/command-center/dinding", "/command-center?x=1", "/pipa/peta", "/admin/drone"]) assert.ok(re.test(ok), ok);
  for (const salah of ["/command-centerX", "//command-center", "https://x.id/command-center", "/x/command-center", "/\\command-center", "command-center"]) assert.ok(!re.test(salah), salah);
});

/* ================================================================ klien: sintaks, larangan, pemformat, pengendali bunyi */
const KLIEN_JS = ["command_bersama", "command_center", "command_dinding"].map(n => `public/admin/${n}.js`), KLIEN_CSS = ["command_bersama", "command_center", "command_dinding"].map(n => `public/admin/${n}.css`);
function muatBersama({aktif = true, tolak = false, ambil = async () => { throw new Error("tanpa jaringan"); }} = {}) {
  const log = [], tik = [], jam = {t: Date.UTC(2026, 10, 1, 0, 0)};
  class AudioPalsu { constructor(src) { log.push("baru " + src); } play() { log.push("play"); return tolak ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve(); } pause() { log.push("pause"); } set currentTime(v) {} get currentTime() { return 0; } }
  class Dt extends Date { static now() { return jam.t; } }
  const ctx = vm.createContext({window: {}, document: {addEventListener() {}, createElement() { throw new Error("DOM tidak dipakai di uji ini"); }}, navigator: {userActivation: {hasBeenActive: aktif}}, Audio: AudioPalsu,
    setInterval: f => { tik.push(f); return tik.length; }, Intl, Date: Dt, console, setTimeout, clearTimeout, AbortController, fetch: ambil});
  vm.runInContext(teks("public/inti/format.js").replace(/const \$ = .*\n/, "") + "\nthis.fmt = fmt;", ctx);
  vm.runInContext(teks("public/admin/command_bersama.js"), ctx);
  return {Cc: ctx.window.Cc, log, tik, jam, ctx, mundur: ms => { jam.t += ms; tik.forEach(f => f()); }, plays: () => log.filter(x => x === "play").length};
}
uji("cc klien berkas: sintaks lolos node --check; tanpa innerHTML/eval/gaya sebaris; dinding tanpa aksi; CSS tanpa zoom dan hormati prefers-reduced-motion; alarm-api.mp3 ada", () => {
  for (const f of [...KLIEN_JS, "public/admin/pantau.js"]) execFileSync(process.execPath, ["--check", path.join(AKAR, f)], {stdio: "pipe"});
  for (const f of KLIEN_JS) assert.doesNotMatch(teks(f), /\.(?:innerHTML|outerHTML)\b|insertAdjacentHTML|document\.write|\beval\(|new Function|setAttribute\(\s*["']style|\bstyle\s*=|\.style\./, f + ": teks API tidak boleh lewat innerHTML; CSP tanpa gaya sebaris");
  const css = f => teks(f).replace(/\/\*[\s\S]*?\*\//g, "");
  for (const f of KLIEN_CSS) assert.doesNotMatch(css(f), /(?:^|[;{\s])zoom\s*:|@import|url\(\s*["']?https?:|googleapis/, f);
  assert.match(css("public/admin/command_dinding.css"), /prefers-reduced-motion:\s*reduce/); assert.match(css("public/admin/command_bersama.css"), /prefers-reduced-motion:\s*reduce/);
  assert.match(css("public/admin/command_dinding.css"), /html\.dd-html\{font-size:clamp\([^}]*vw[^}]*vh/, "skala huruf dari vw dan vh (1920 dan 3840), bukan zoom");
  assert.match(css("public/admin/command_dinding.css"), /grid-template-rows:auto minmax\(0,1fr\) auto auto/); assert.match(css("public/admin/command_dinding.css"), /body\.dd\{[^}]*height:100vh;overflow:hidden/, "satu layar penuh tanpa gulir");
  assert.match(css("public/admin/command_bersama.css"), /\[hidden\]\{display:none/);
  const din = teks("public/admin/command_dinding.js");
  assert.doesNotMatch(din, /\bkirim\b|\/api\/cc\/aksi|method: "POST"|\/api\/cc\/kontak|alarm\.js|sapa\.js|new Notification|\balert\(|\bconfirm\(|\bprompt\(/, "layar dinding: baca saja, tanpa tombol aksi, nomor telepon, atau modal");
  assert.doesNotMatch(din, /\b(?:catatan_bebas|nomor_telepon|nama_regu|tugas_id)\b/, "layar dinding tidak membaca bidang pribadi atau id tugas mentah");
  for (const k of ["navigator.wakeLock", "visibilitychange", 'matchMedia("(prefers-reduced-motion: reduce)")', "location.reload()", "/api/cc/dinding", "/api/titik", "/api/peringatan/aktif", "/api/omc/sortie", "Sesi habis — masuk ulang",
    "Gagal menyegarkan sejak", "AngkaKawasan.selUnik", "https://tiles.openfreemap.org/styles/dark", "POLOS", "jajak(muatCc, 30e3)", "jajak(muatTitik, 5 * MENIT)", "jajak(muatPeringatan, 5 * MENIT)", "jajak(muatOmc, 5 * MENIT)", "interactive: false"])
    assert.ok(din.includes(k), "dinding memuat " + k);
  assert.match(din, /cc: 2 \* MENIT, titik: 4 \* JAM/, "ambang basi: cc 2 menit, titik 4 jam");
  /* hemat kerja layar yang menyala 24 jam (perilaku diukur di command_center_layar.test.mjs): titik dan alert dipasang terpisah, tak ada pengukuran tata letak di dalam putaran hapus */
  assert.match(din, /function isiTitik\(\)/); assert.match(din, /function isiAlert\(\)/); assert.doesNotMatch(din, /function isiPeta|isiPeta\(/, "isiPeta lama memasang ulang SEMUA titik panas tiap jajak antrean");
  assert.doesNotMatch(din.replace(/\/\*[\s\S]*?\*\//g, ""), /while \([^)]*scrollHeight/, "potong() tidak boleh membaca tata letak di dalam putaran hapus (layout thrashing)");
  assert.match(din, /clearTimeout\(S\.tundaUkur\)/, "event resize ditunda (debounce)");
  assert.doesNotMatch(din, /±/, "375 m = ukuran sel, bukan galat: tanpa ±"); assert.ok(din.includes("lokasi unik (sel 375 m, semua satelit)"));
  assert.ok(din.includes("r.antrean_terpotong || r.final_terpotong") && din.includes("median_respons_terpotong"), "dinding menandai daftar yang dipotong server");
  const mj = teks("public/admin/command_center.js");
  assert.doesNotMatch(mj, /String\(hit\(|String\(final\)/, "chip hitungan lewat fmt (pemisah ribuan), bukan String()"); assert.ok(mj.includes('fmt(hit("baru"))') && mj.includes("d.antrean_terpotong") && mj.includes("d.final_terpotong"));
  assert.match(mj, /const TUNDA_LOG|TUNDA_LOG = 400/); assert.ok(mj.includes('"change", () => ubah(true, TUNDA_LOG)') && mj.includes("L.batal?.abort()") && mj.includes("{batal: batal.signal}"), "filter tanggal log didebounce dan jawaban usang dibatalkan");
  assert.ok(mj.includes("/api/cc/kontak?") && mj.includes("MAKS_KONTAK = 20") && mj.includes('["lokasi"'), "nomor BPBD dimuat bersama (maks 20 lokasi per panggilan)"); assert.doesNotMatch(mj, /\/api\/cc\/kontak\?prov=/, "tak ada lagi satu panggilan per lokasi");
  assert.doesNotMatch(mj, /replaceChildren\(\.\.\.baru\)/, "daftar kartu tidak boleh melepas SEMUA kartu (memutus fokus ketikan)"); assert.ok(mj.includes("catatFokus") && mj.includes("pulihkanFokus") && mj.includes("Math.round(a.luas_ha)"));
  for (const k of ["jajak(muat, 30e3)", "/api/cc/antrean", "/api/cc/kontak", "/api/cc/aksi/", "/api/cc/log?", "tel:", "r.status === 409", "Koreksi wajib bercatatan", "suara.gerbang(PEMBACA)", "suara.perbarui("]) assert.ok(mj.includes(k), "meja memuat " + k);
  assert.ok(existsSync(path.join(AKAR, "public/suara/alarm-api.mp3")) && teks("public/admin/command_bersama.js").includes('"/suara/alarm-api.mp3"'));
  /* tidak ada pemformat durasi lokal (SATU formatter: fmt.durasi) dan baris 403 + /admin/masuk?ke= (pantulan) */
  for (const f of KLIEN_JS) { assert.doesNotMatch(teks(f), /const (?:jamTeks|durasiTeks|lama) = ms =>/, f); teks(f).split("\n").forEach((b, i) => assert.ok(!(/403/.test(b) && /\/admin\/masuk\?ke=/.test(b)), `${f}:${i + 1}`)); }
  /* SHIFT_JAM di meja (tampilan) sama dengan SHIFT server */
  const sj = Object.fromEntries([...mj.match(/const SHIFT_JAM = (\{[^}]+\})/)[1].matchAll(/(\w+): "([^"]+)"/g)].map(m => [m[1], m[2]]));
  assert.deepEqual(sj, Object.fromEntries(Object.entries(SHIFT).map(([k, [a, b]]) => [k, `${String(a % 24).padStart(2, "0")}.00–${String(b % 24).padStart(2, "0")}.00`])));
});

uji("cc klien format: jam WIB 07.42, durasi 18 menit / 1 jam 5 menit, ribuan bertitik, nama shift, lokasi", () => {
  const B = muatBersama(), C = B.Cc;
  assert.equal(C.jam(Date.UTC(2026, 10, 1, 0, 42)), "07.42"); assert.equal(C.jam(Date.UTC(2026, 10, 1, 16, 5)), "23.05"); assert.equal(C.jam(Date.UTC(2026, 10, 1, 17, 0)), "00.00", "tengah malam = 00.00, bukan 24.00"); assert.equal(C.jam(null), "–");
  assert.equal(C.durasi(18 * MENIT), "18 menit"); assert.equal(C.durasi(65 * MENIT), "1 jam 5 menit"); assert.equal(C.durasi(30e3), "kurang dari 1 menit"); assert.equal(C.durasi(NaN), "–");
  const pecah = ms => JSON.stringify(C.durasiPecah(ms));
  assert.equal(pecah(18 * MENIT), '["18","menit"]'); assert.equal(pecah(65 * MENIT), '["1 jam 5","menit"]'); assert.equal(pecah(120 * MENIT), '["2","jam"]'); assert.equal(pecah(null), '["–",""]');
  /* di bawah semenit: sama dengan durasi() ("kurang dari 1 menit"), BUKAN dilantai ke "1 menit"; tepat semenit = 1 */
  assert.equal(pecah(30e3), '["< 1","menit"]'); assert.equal(pecah(0), '["< 1","menit"]'); assert.equal(pecah(59999), '["< 1","menit"]'); assert.equal(pecah(-20e3), '["< 1","menit"]'); assert.equal(pecah(60e3), '["1","menit"]'); assert.equal(pecah(89e3), '["1","menit"]'); assert.equal(pecah(90e3), '["2","menit"]');
  assert.equal(C.durasi(59999), "kurang dari 1 menit"); assert.equal(C.durasi(60e3), "1 menit", "durasi() dan durasiPecah() sepakat di batas semenit");
  assert.equal(B.ctx.fmt(12345), "12.345", "ribuan bertitik"); assert.equal(B.ctx.fmt(45.5), "45,5");
  const w = (jamMulai, jamAkhir) => ({mulai: wibMs("2026-11-01", jamMulai), akhir: wibMs("2026-11-01", jamAkhir)});
  assert.equal(C.teksShift({shift: "siang", ...w(15, 23)}), "Siang 15.00–23.00"); assert.equal(C.teksShift({shift: "malam", ...w(23, 31)}), "Malam 23.00–07.00"); assert.equal(C.teksShift({shift: "pagi", ...w(7, 15)}), "Pagi 07.00–15.00");
  assert.equal(C.lokasi({kec: "Mentaya Hilir", kab: "Kotawaringin Timur", prov_nama: "Kalimantan Tengah"}), "Mentaya Hilir, Kotawaringin Timur"); assert.equal(C.lokasi({kab: "Kapuas", prov_nama: "Kalimantan Tengah"}), "Kapuas"); assert.equal(C.lokasi({prov_nama: "Riau"}), "Riau");
  assert.equal(C.lokasi({}), "Lokasi belum diketahui");
  assert.deepEqual(Object.keys(C.NAMA_STATUS), STATUS);
  /* jamTgl: jam saja untuk hari WIB yang sama dengan jam server (1 Nov 07.00 WIB di uji ini), selain itu bertanggal; status yang dipegang berhari-hari tak terbaca sebagai pagi ini */
  assert.equal(C.jamTgl(Date.UTC(2026, 10, 1, 0, 42)), "07.42"); assert.equal(C.jamTgl(Date.UTC(2026, 9, 31, 17, 30)), "00.30", "00.30 WIB 1 Nov = hari yang sama walau tanggal UTC-nya 31 Okt");
  assert.equal(C.jamTgl(Date.UTC(2026, 9, 31, 16, 59)), "31 Okt 23.59", "semenit sebelum tengah malam WIB = kemarin: bertanggal"); assert.equal(C.jamTgl(Date.UTC(2026, 9, 30, 2, 15)), "30 Okt 09.15"); assert.equal(C.jamTgl(null), "–");
  assert.equal(C.jamTgl(Date.UTC(2026, 10, 1, 16, 59)), "23.59", "hari ini sampai 23.59 WIB"); assert.equal(C.jamTgl(Date.UTC(2026, 10, 1, 17, 0)), "2 Nov 00.00", "tengah malam berikutnya sudah hari lain");
});

uji("cc klien kirim: POST berbatas waktu (koneksi menggantung tidak mengunci tombol selamanya); status 0 untuk jaringan putus atau tak ada jawaban; sukses membawa x-pb dan signal", async () => {
  const gantung = (u, o) => new Promise((_, tolak) => o.signal.addEventListener("abort", () => tolak(new Error("AbortError"))));
  const t0 = Date.now(), r = await muatBersama({ambil: gantung}).Cc.kirim("/api/cc/aksi/x", {dari: "baru", ke: "dalam_konfirmasi"}, {batas: 40});
  assert.deepEqual([r.ok, r.status], [false, 0], "tak ada jawaban: status 0 (lakukan() lalu memuat ulang antrean dan melepas tombol)"); assert.match(r.j.galat, /tidak ada jawaban dari server.*periksa statusnya/);
  assert.ok(Date.now() - t0 < 2000, "selesai segera sesudah batas, tidak menunggu selamanya");
  const putus = await muatBersama({ambil: async () => { throw new Error("jaringan"); }}).Cc.kirim("/x", {}); assert.deepEqual([putus.ok, putus.status, putus.j.galat], [false, 0, "jaringan putus; coba lagi"]);
  let dipanggil; const ok = await muatBersama({ambil: async (u, o) => { dipanggil = {u, o}; return {ok: true, status: 200, json: async () => ({id: "a"})}; }}).Cc.kirim("/api/cc/aksi/a", {dari: "baru"});
  assert.deepEqual([ok.ok, ok.status, ok.j], [true, 200, {id: "a"}]); assert.equal(dipanggil.o.method, "POST"); assert.equal(dipanggil.o.headers["x-pb"], "1"); assert.ok(dipanggil.o.signal, "tiap POST membawa signal batas waktu");
  const baca = await muatBersama({ambil: async () => ({ok: false, status: 409, json: async () => { throw new Error("bukan json"); }})}).Cc.kirim("/x", {}); assert.deepEqual([baca.ok, baca.status, JSON.stringify(baca.j)], [false, 409, "{}"], "badan bukan JSON tidak melempar");
});

uji("cc klien ambil: permintaan usang bisa dibatalkan lewat signal pemanggil (status 0, tanpa menunggu batas waktu), signal yang sudah batal tidak mengirim, pendengar dilepas", async () => {
  let pasang = 0, lepas = 0, fetchDipanggil = 0;
  const gantung = (u, o) => { fetchDipanggil++; return new Promise((_, tolak) => { if (o.signal.aborted) tolak(new Error("AbortError")); else o.signal.addEventListener("abort", () => tolak(new Error("AbortError"))); }); };   // seperti fetch sungguhan: signal yang sudah batal menolak segera
  const Cc = muatBersama({ambil: gantung}).Cc;
  const ac = new AbortController(), t0 = Date.now(), p = Cc.ambil("/api/cc/log?tgl=2026-11-01", {batal: ac.signal, batas: 30000});
  setTimeout(() => ac.abort(), 20); const r = await p; assert.deepEqual([r.ok, r.status], [false, 0]); assert.ok(Date.now() - t0 < 2000, "diputus segera oleh pemanggil, bukan menunggu batas 30 detik");
  const sudah = new AbortController(); sudah.abort(); const awal = fetchDipanggil, r2 = await Cc.ambil("/x", {batal: sudah.signal, batas: 30000}); assert.deepEqual([r2.ok, r2.status], [false, 0]);
  /* tanpa batal: perilaku lama (batas waktu) tetap; pendengar abort pada signal pemanggil dilepas sesudah selesai (tidak menumpuk di jajak panjang) */
  const sig = {aborted: false, addEventListener() { pasang++; }, removeEventListener() { lepas++; }}, ok = await muatBersama({ambil: async () => ({ok: true, status: 200, json: async () => ({a: 1})})}).Cc.ambil("/x", {batal: sig});
  assert.deepEqual([ok.ok, ok.j], [true, {a: 1}]); assert.deepEqual([pasang, lepas], [1, 1]);
  const lama = await muatBersama({ambil: gantung}).Cc.ambil("/x", {batas: 30}); assert.deepEqual([lama.ok, lama.status], [false, 0]);
  assert.ok(awal >= 1);
});

/* uraiTitik dinding: jumlah lokasi unik tak bergantung urutan, jadi urut waktu (.sort) dibuang; dibuktikan terhadap versi lama (dengan sort) pada semua permutasi */
function muatUraiTitik() {
  const kode = teks("public/admin/command_dinding.js"), mulai = kode.indexOf("  function uraiTitik(j, kini) {"), akhir = kode.indexOf("  async function muatTitik()");
  assert.ok(mulai > 0 && akhir > mulai, "uraiTitik ditemukan di command_dinding.js");
  const ctx = vm.createContext({window: {}, Number, Date, Set, Math});
  vm.runInContext(teks("public/angka_kawasan.js") + "\nthis.AngkaKawasan = window.AngkaKawasan; var JAM = 36e5, JENDELA_TITIK = 24 * JAM;", ctx);
  vm.runInContext(kode.slice(mulai, akhir) + "\nthis.uraiTitik = uraiTitik;", ctx);
  return {uraiTitik: ctx.uraiTitik, selUnik: ctx.AngkaKawasan.selUnik, sumber: kode.slice(mulai, akhir)};
}
uji("cc klien dinding: uraiTitik tanpa .sort tetap benar: lokasi unik sama untuk SEMUA permutasi masukan dan sama dengan versi lama yang diurutkan; lebih tua dari 24 jam dan bukan angka dibuang", () => {
  const {uraiTitik, selUnik, sumber} = muatUraiTitik(), kini = Date.UTC(2026, 10, 1, 5, 0), acuan = new Date(kini).toISOString();
  assert.doesNotMatch(sumber.replace(/\/\*[\s\S]*?\*\//g, ""), /\.sort\(/, "tanpa urut waktu");
  /* tiga lokasi unik: (5.55,95.32) tiga kali (dua satelit + 1 jam kemudian), (4.30,98.00) dua kali, (-2.50,113.30) sekali; satu lebih tua 24 jam; satu bukan angka; satu sel tetangga ~800 m */
  const baris = [[5.55, 95.32, -1], [5.5501, 95.3201, -0.5], [5.55, 95.32, -3], [4.3, 98.0, -2], [4.3001, 98.0001, -26], [-2.5, 113.3, -3], [-3.1, 114.1, -30], ["x", 1, -1], [5.56, 95.33, -2]];
  const lama = (j, k) => { const t0 = Date.parse(j.acuan), lihat = new Set(), titik = [];   // salinan versi lama: dengan .sort
    for (const b of (j.baris || []).map(b => ({lat: b[0], lon: b[1], ms: t0 + Math.round(b[2] * 36e5)})).filter(b => Number.isFinite(b.lat) && Number.isFinite(b.lon) && b.ms >= k - 24 * 36e5).sort((a, c) => a.ms - c.ms)) { const key = selUnik(b.lat, b.lon); if (!lihat.has(key)) { lihat.add(key); titik.push(b); } }
    return titik; };
  const kunci = t => Array.from(t, b => selUnik(b.lat, b.lon)).sort(), acuanKunci = kunci(lama({acuan, baris}, kini));
  assert.equal(acuanKunci.length, 4, "(5.55,95.32), (4.30,98.00), (-2.50,113.30), (5.56,95.33); duplikat sel, >24 jam, dan non-angka tidak dihitung");
  const permutasi = a => a.length <= 1 ? [a] : a.flatMap((x, i) => permutasi([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
  const semua = permutasi(baris.slice(0, 6)); let n = 0;   // enam baris pertama diacak semua urutannya (720); tiga sisanya (lebih tua dari 24 jam, bukan angka, sel tetangga) tetap di ekor
  for (const p of semua) { const j = {acuan, baris: [...p, ...baris.slice(6)]}, baru = uraiTitik(j, kini); n++; assert.deepEqual(kunci(baru), kunci(lama(j, kini)), "sama dengan versi lama untuk permutasi " + n); assert.equal(baru.length, kunci(lama(j, kini)).length); assert.equal(new Set(Array.from(baru, b => selUnik(b.lat, b.lon))).size, baru.length, "tidak ada lokasi ganda"); }
  assert.equal(n, 720); assert.deepEqual(kunci(uraiTitik({acuan, baris}, kini)), acuanKunci); assert.equal(uraiTitik({acuan, baris: []}, kini).length, 0); assert.equal(uraiTitik({acuan}, kini).length, 0);
  /* titik wakil sel tetap berada di sel yang sama (selisih < satu sel) walau bukan yang paling awal */
  for (const b of uraiTitik({acuan, baris}, kini)) assert.ok(acuanKunci.includes(selUnik(b.lat, b.lon)));
});

uji("cc klien bunyi: segera untuk alert baru, diulang tiap 60 dtk selama ada alert baru, berhenti begitu semua dipegang; ditolak peramban = SENYAP; sebelum diketuk tidak berbunyi", async () => {
  const B = muatBersama(), s = B.Cc.suara; assert.equal(s.status, "hidup", "halaman yang sudah pernah diketuk tidak butuh gerbang");
  s.perbarui([]); assert.equal(B.plays(), 0, "tanpa alert baru: senyap");
  s.perbarui(["a"]); assert.equal(B.plays(), 1, "segera untuk alert baru");
  B.mundur(30e3); assert.equal(B.plays(), 1, "belum semenit"); B.mundur(31e3); assert.equal(B.plays(), 2, "diulang sesudah 60 dtk");
  s.perbarui(["a"]); assert.equal(B.plays(), 2, "alert yang sama tidak membunyikan lagi di luar jadwal");
  s.perbarui(["a", "b"]); assert.equal(B.plays(), 3, "alert baru lain: segera");
  B.mundur(59e3); assert.equal(B.plays(), 3); B.mundur(2e3); assert.equal(B.plays(), 4, "jadwal 60 dtk dihitung dari bunyi terakhir");
  s.perbarui([]); assert.ok(B.log.at(-1) === "pause", "semua sudah dipegang: berhenti"); B.mundur(180e3); assert.equal(B.plays(), 4, "dan tidak berbunyi lagi");
  s.perbarui(["c"]); assert.equal(B.plays(), 5, "alert baru sesudah hening berbunyi lagi (keadaan dari server, bukan ingatan peramban)");
  /* halaman baru dibuka (belum pernah diketuk): menunggu ketukan, tidak mencoba berbunyi */
  const M = muatBersama({aktif: false}); assert.equal(M.Cc.suara.status, "menunggu"); M.Cc.suara.perbarui(["a"]); M.mundur(120e3); assert.equal(M.log.length, 0, "tanpa elemen Audio dan tanpa play() sebelum ketukan");
  /* peramban menolak play(): SENYAP, tetap mencoba lagi tiap 60 dtk */
  const T = muatBersama({tolak: true}); T.Cc.suara.perbarui(["a"]); await Promise.resolve(); await Promise.resolve(); assert.equal(T.Cc.suara.status, "senyap");
  assert.equal(T.plays(), 1); T.mundur(61e3); assert.equal(T.plays(), 2, "senyap bukan berhenti: mencoba lagi bila peramban mengizinkan");
  assert.match(teks("public/admin/command_bersama.js"), /for \(const ev of \["pointerdown", "keydown"\]\) document\.addEventListener\(ev, \(\) => \{ if \(status === "senyap"\) nyalakan\(\); \}\)/, "ketukan di mana pun mencoba menyalakan lagi saat senyap");
  assert.doesNotMatch(teks("public/admin/command_bersama.js").replace(/\/\*[\s\S]*?\*\//g, ""), /localStorage|sessionStorage/, "keadaan bunyi dari server, bukan penyimpanan peramban");
});
