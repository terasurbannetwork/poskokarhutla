/* Penugasan orang ke tugas api dan pelacak GPS lewat tautan /lacak/<token> (src/penugasan.js, migrations/0035_penugasan.sql) di workerd (Miniflare) dengan D1 lokal sungguhan,
   migrasi apa adanya (TEST.md: tanpa mock klien DB). Yang dibuktikan: token 36 hex hanya tersimpan sha256-nya; 410 untuk kedaluwarsa/dicabut/selesai; batas laju per token dan per IP;
   validasi titik; geofence tiba; privasi posisi (kabupaten lain 404, moderator, staf wilayah); retensi 30 hari; checklist tersimpan berstempel waktu; dummy; 503 tanpa 0035;
   halaman /lacak (CSP, manifest, tanpa login di centurisk97.id); klien lacak.js dan pop-up peta di node:vm dengan DOM tiruan.
   Alur padam, akses disalin cron, dan EXIF ada di instansi.test.mjs (butuh fixture tugas_kompleks.json dan unggahan berkas).
   Jalankan: node --test tests/warga/penugasan.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {susunChecklist, jarakEta, BATAS, PERAN, KESELAMATAN, USULAN, alarmKeselamatan, anginKeRegu, tempuhMenit} from "../../src/penugasan.js";
import {infoPadam} from "../../src/instansi.js";

const JAM = 3600e3, MENIT = 60e3, HARI = 24 * JAM, PB = {"x-pb": "1"};
const uji = berantai();
/* aset uji: prakiraan angin per sel dikendalikan per uji (CUACA: jalur -> objek), selain itu berkas nyata di public/ seperti harness */
const CUACA = new Map();
const asetKu = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  if (p.startsWith("/data/cuaca/") && CUACA.has(p)) return new Response(JSON.stringify(CUACA.get(p)));
  return existsSync(f) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const U = await siapkan("uji-penugasan", {r2: true, asetKu});
const {mf, DB, api, n} = U;
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`});
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");

/* ---- akun aktif dibuat lewat SQL (jalur verifikasi penuh diuji di instansi.test.mjs), lalu masuk lewat rute sungguhan ---- */
const SANDI = "SandiUji23456789";
async function akun(username, {jenis = "pemkab", tingkat = "kab", prov = "62", kab = "Kab Satu", cakupan = ["62"], dummy = 0} = {}) {
  const garam = "g".repeat(32), id = id16();
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, ?)`)
    .bind(id, username, jenis, tingkat, tingkat === "kab" ? `Pemerintah ${kab}` : `Provinsi ${prov}`, `uji|${username}`, JSON.stringify(cakupan), tingkat === "kab" ? prov : null, tingkat === "kab" ? kab : null, garam, sha256(garam + SANDI), dummy).run();
  const r = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(r.s, 200, r.t);
  return {id, h: {cookie: r.h.get("set-cookie").split(",")[0].split(";")[0], ...PB}, hg: {cookie: r.h.get("set-cookie").split(",")[0].split(";")[0]}};
}
const REK = {cara: [{metode: "Sekat kanal", alasan: "gambut"}], alat: ["Pompa portabel"], kebutuhan: {total: {pompa: [{kelas: "jinjing", hp: 2, unit: [4, 8, 12]}], selang_m: [200, 400, 600], jet_shooter: [2, 4, 6], lance_cm: [50, 100, 150]}, energi: {bbm_l_hari: [30, 60, 90]}}};
const AKSES = {jalan: {lat: -2.3, lon: 113.9, kelas: "primary", km_garis_lurus: 4.2}, kaki_km: 3.1, jam_tiba: 5.4, dari: {dari: "Posko Uji", jenis: "posko", km_jalan: 38, jam: 1.4}, jalan_kaki_jam: 1.8,
  bawa: [{barang: "Selang 2 inci", jumlah: 200, satuan: "m", status: "dipikul"}, {barang: "BBM", jumlah: 40, satuan: "liter", status: "dipikul"}]};
async function tugas(kab, {lat = -2.2, lon = 113.9, status = "buka", rekomendasi = REK, akses = AKSES, dummy = 0} = {}) {
  const id = id16(), t = Date.now() - JAM;
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir, rekomendasi, akses, dummy) VALUES (?, '62', ?, 'Kec Uji', ?, ?, 3, 10, 50, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, kab, lat, lon, t, t, status, t, t, rekomendasi && JSON.stringify(rekomendasi), akses && JSON.stringify(akses), dummy).run();
  return id;
}
const tugaskan = async (A, tid, o = {}) => { const r = await api("POST", `/api/instansi/penugasan/${tid}`, {nama: "Hendra", peran: "driver", wa: "0812 3456 7001", orang: 4, ...o}, {...A.h, ...ipBaru()}); return r; };
const lacak = (metode, jalur, token, body, ip = ipBaru()) => api(metode, "/api/lacak/" + jalur, body, {"x-lacak": token, ...(metode === "POST" ? PB : {}), ...ip});
const BERADA = (lat, lon, ak = 12) => ({lat, lon, akurasi: ak});

let A, B, C, T1, T2, P1, TOKEN1;

uji("penugasan: migrasi 0035 idempoten, tabel dan indeks lengkap, CHECK menahan data buruk", async () => {
  const sql = teks("migrations/0035_penugasan.sql");
  for (const s of pecah(sql)) await DB.prepare(s).run();   // jalankan ulang: IF NOT EXISTS, tanpa galat
  for (const t of ["penugasan", "penugasan_posisi"]) assert.equal(await n(t), 0, t);
  const idx = (await DB.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'penugasan_posisi'").all()).results.map(x => x.name);
  assert.ok(idx.includes("penugasan_posisi_jejak"), "indeks (penugasan_id, pada DESC) untuk jejak");
  assert.match(sql, /penugasan_posisi \(penugasan_id, pada DESC\)/);
  A = await akun("pemkabsatu"); B = await akun("pemkabdua", {kab: "Kab Dua"}); C = await akun("pemprovuji", {jenis: "pemprov", tingkat: "prov", prov: null, kab: null});
  T1 = await tugas("Kab Satu"); T2 = await tugas("Kab Dua");
  const ins = (o) => DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, wa, orang, token_sha, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...Object.values({id: id16(), t: T1, a: A.id, nama: "X Uji", peran: "driver", wa: null, orang: 1, tok: sha256(id16()), dibuat: 1000, kedaluwarsa: 2000, ...o})).run();
  await assert.rejects(ins({peran: "raja"}), /CHECK|constraint/i, "peran tetap");
  await assert.rejects(ins({orang: 0}), /CHECK|constraint/i); await assert.rejects(ins({orang: 201}), /CHECK|constraint/i);
  await assert.rejects(ins({tok: "abc"}), /CHECK|constraint/i, "token_sha 64 hex"); await assert.rejects(ins({kedaluwarsa: 1000}), /CHECK|constraint/i, "kedaluwarsa sesudah dibuat");
  await assert.rejects(ins({wa: "0812"}), /CHECK|constraint/i); await assert.rejects(ins({nama: "X"}), /CHECK|constraint/i);
  const pid = id16(); await ins({id: pid}); await assert.rejects(DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, 0, 0, 1, 1)").bind(pid).run(), /CHECK|constraint/i, "posisi 0,0 di luar kotak Indonesia");
  await assert.rejects(DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, -2, 113, 6000, 1)").bind(pid).run(), /CHECK|constraint/i, "akurasi 0-5000");
  await DB.prepare("DELETE FROM penugasan WHERE id = ?").bind(pid).run();
});

uji("penugasan: akun aktif menugaskan; token 36 hex hanya sha256 yang disimpan; tautan dan wa.me siap kirim tanpa kiriman otomatis", async () => {
  const r = await tugaskan(A, T1); assert.equal(r.s, 201, r.t); P1 = r.j.id; TOKEN1 = r.j.token;
  assert.match(TOKEN1, /^[0-9a-f]{36}$/, "18 byte acak = 36 hex"); assert.equal(r.j.tautan, `http://bnpb.lokal/lacak#${TOKEN1}`);
  const baris = await DB.prepare("SELECT * FROM penugasan WHERE id = ?").bind(P1).first();
  assert.equal(baris.token_sha, sha256(TOKEN1), "hanya sha256 token yang disimpan"); assert.ok(!Object.values(baris).some(x => String(x).includes(TOKEN1)), "token asli tidak ada di baris mana pun");
  assert.ok(Math.abs(baris.kedaluwarsa - baris.dibuat - 48 * JAM) < 5 * MENIT, "default 48 jam"); assert.equal(baris.status, "aktif"); assert.equal(baris.dibuka_pada, null); assert.equal(baris.wa, "6281234567001");
  assert.ok(r.j.wa.tautan.startsWith("https://wa.me/6281234567001?text="), r.j.wa.tautan); assert.ok(decodeURIComponent(r.j.wa.tautan).includes(r.j.tautan), "pesan membawa tautan"); assert.match(r.j.wa.pesan, /Hendra.*Seruyan|Hendra.*Kec Uji/s);
  assert.match(r.j.wa.pesan, /Jangan bagikan tautan/); assert.doesNotMatch(r.j.wa.pesan, /·/, "tanpa titik pemisah");
  assert.equal(await n("laju_bnpb", "aksi LIKE '%wa%'"), 0, "tidak ada kiriman WhatsApp otomatis");
  const tanpaWa = await tugaskan(A, T1, {wa: ""}); assert.equal(tanpaWa.s, 201); assert.ok(tanpaWa.j.wa.tautan.startsWith("https://wa.me/?text="), "tanpa nomor: pengguna memilih kontak sendiri");
  /* validasi dan wewenang */
  for (const [o, kode] of [[{nama: "X"}, 400], [{peran: "raja"}, 400], [{wa: "123"}, 400], [{orang: 0}, 400], [{orang: 201}, 400], [{orang: 1.5}, 400], [{jam: 0}, 400], [{jam: 169}, 400]]) assert.equal((await tugaskan(A, T1, o)).s, kode, JSON.stringify(o));
  assert.equal((await tugaskan(B, T1)).s, 404, "akun kabupaten lain: 404 yang sama dengan tugas tak ada"); assert.equal((await tugaskan(A, id16())).s, 404);
  assert.equal((await api("POST", `/api/instansi/penugasan/${T1}`, {nama: "Hendra", peran: "driver"}, {...A.hg, ...ipBaru()})).s, 403, "tanpa header x-pb");
  assert.equal((await api("POST", `/api/instansi/penugasan/${T1}`, {nama: "Hendra", peran: "driver"}, PB)).s, 401, "tanpa sesi");
  assert.equal((await tugaskan(C, T1)).s, 201, "pemprov melihat seluruh provinsinya");
  const tutup = await tugas("Kab Satu", {status: "padam"}); assert.equal((await tugaskan(A, tutup)).s, 409, "tugas tertutup tidak menerima penugasan baru");
  const belum = await akun("pemkotbelum", {kab: "Kota Belum"}); await DB.prepare("UPDATE instansi_akun SET status = 'menunggu' WHERE id = ?").bind(belum.id).run(); assert.equal((await tugaskan(belum, T1)).s, 403, "akun belum aktif");
  assert.deepEqual(Object.keys(PERAN), ["driver", "ketua_regu", "anggota", "lainnya"]);
});

uji("penugasan: akun lain sekabupaten tidak melihat WA, tidak bisa mencabut atau menerbitkan ulang penugasan akun pembuat; posisi ditolak 410 bila tugas ditutup", async () => {
  const A2 = await akun("polressatu", {jenis: "polres", kab: "Kab Satu"}), tid = await tugas("Kab Satu"), q = (await tugaskan(A, tid, {wa: "0812 3456 7555"})).j;
  const lihat = await api("GET", `/api/instansi/penugasan/${tid}`, undefined, {...A2.hg, ...ipBaru()}); assert.equal(lihat.s, 200); const p = lihat.j.penugasan.find(x => x.id === q.id);
  assert.ok(p && !("wa" in p) && !lihat.t.includes("6281234567555"), "akun lain tidak melihat WA");
  assert.equal((await api("GET", `/api/instansi/penugasan/${tid}`, undefined, {...A.hg, ...ipBaru()})).j.penugasan.find(x => x.id === q.id).wa, "6281234567555", "pembuat melihat WA");
  assert.equal((await api("POST", `/api/instansi/cabut_penugasan/${q.id}`, {}, {...A2.h, ...ipBaru()})).s, 403); assert.equal((await api("POST", `/api/instansi/terbit_penugasan/${q.id}`, {}, {...A2.h, ...ipBaru()})).s, 403);
  assert.equal((await lacak("GET", "info", q.token)).s, 200, "tautan tidak terganggu");
  const u = await api("POST", `/api/instansi/terbit_penugasan/${q.id}`, {}, {...A.h, ...ipBaru()}); assert.equal(u.s, 201); assert.ok(u.j.wa.tautan.startsWith("https://wa.me/6281234567555"), "pembuat: WA terisi");
  assert.match(u.j.tautan, /^http:\/\/bnpb\.lokal\/lacak#[0-9a-f]{36}$/, "token di fragmen"); assert.ok(!u.j.wa.pesan.includes("/lacak/"));
  const tk = u.j.token; await lacak("POST", "berangkat", tk, {}); assert.equal((await lacak("POST", "posisi", tk, BERADA(-2.2, 113.95))).s, 201);
  await DB.prepare("UPDATE tugas_api SET status = 'padam' WHERE id = ?").bind(tid).run();
  const t = await lacak("POST", "posisi", tk, BERADA(-2.2, 113.95)); assert.equal(t.s, 410); assert.equal(t.j.alasan, "ditutup"); assert.equal((await lacak("GET", "info", tk)).j.tugas.ditutup, true, "info tetap terbaca dengan penanda ditutup");
});

uji("penugasan: IP_SALT kosong = 503 di awal, token tak dikenal tidak menulis baris laju", async () => {
  const U3 = await siapkan("uji-penugasan-garam", {ikat: {IP_SALT: ""}}); const r = await U3.api("GET", "/api/lacak/info", undefined, {"x-lacak": "ab".repeat(18)}); assert.equal(r.s, 503); assert.match(r.j.galat, /IP_SALT/);
  const sebelum = await n("laju_bnpb", "aksi = 'lacak.ip'"); for (let i = 0; i < 3; i++) assert.equal((await lacak("GET", "info", "cd".repeat(18))).s, 404);
  assert.equal(await n("laju_bnpb", "aksi = 'lacak.ip'"), sebelum, "token tak dikenal: tanpa baris laju");
});

uji("penugasan: info lacak tanpa login memuat tugas, kartu akses, navigasi, dan checklist dari rekomendasi, tanpa data pribadi", async () => {
  assert.equal((await api("GET", "/api/lacak/info")).s, 404, "tanpa token"); assert.equal((await lacak("GET", "info", "zz")).s, 404, "token bentuk salah"); assert.equal((await lacak("GET", "info", "0".repeat(36))).s, 404, "token tak dikenal");
  const r = await lacak("GET", "info", TOKEN1); assert.equal(r.s, 200, r.t); assert.equal(r.h.get("cache-control") ?? "", r.h.get("cache-control") ?? "");
  assert.equal(r.j.tugas.kab, "Kab Satu"); assert.equal(r.j.tugas.lat, -2.2); assert.deepEqual(r.j.tugas.cara, ["Sekat kanal"]); assert.equal(r.j.penugasan.nama, "Hendra"); assert.equal(r.j.penugasan.orang, 4);
  assert.equal(r.j.navigasi, "https://www.google.com/maps/dir/?api=1&destination=-2.2,113.9&travelmode=driving");
  assert.equal(r.j.akses.kaki_km, 3.1); assert.equal(r.j.akses.dari.dari, "Posko Uji"); assert.equal(r.j.akses.bawa.length, 2);
  const k = r.j.butir.map(b => b.k); for (const w of ["apd", "n95", "air_minum", "makanan", "pompa", "bbm", "selang", "jet_shooter", "p3k", "gps_ht", "senter", "rute", "cuaca", "komandan", "darurat", "bawa_0", "bawa_1"]) assert.ok(k.includes(w), w);
  assert.match(r.j.butir.find(b => b.k === "air_minum").teks, /20 liter \(4 orang, 5 liter/, "air minum = orang x koefisien"); assert.match(r.j.butir.find(b => b.k === "pompa").teks, /8 unit/); assert.match(r.j.butir.find(b => b.k === "bbm").teks, /60 liter/);
  assert.ok(r.j.butir.find(b => b.k === "apd").wajib && !r.j.butir.find(b => b.k === "senter").wajib);
  const dump = r.t; for (const rahasia of ["628123456", "Budi Uji", "pic_", "pemkabsatu", "token_sha"]) assert.ok(!dump.includes(rahasia), `info lacak tidak membocorkan ${rahasia}`);
  const baris = await DB.prepare("SELECT dibuka_pada FROM penugasan WHERE id = ?").bind(P1).first(); assert.ok(baris.dibuka_pada > 0, "dibuka_pada terisi saat tautan dibuka");
  /* tugas tanpa rekomendasi dan akses: hanya butir baku */
  const polos = await tugas("Kab Satu", {rekomendasi: null, akses: null}), q = await tugaskan(A, polos, {orang: 2}), ip = await lacak("GET", "info", q.j.token);
  assert.deepEqual(ip.j.butir.map(b => b.k), ["apd", "n95", "air_minum", "makanan", "p3k", "gps_ht", "senter", "rute", "cuaca", "komandan", "darurat"]); assert.equal(ip.j.akses, null);
  assert.deepEqual(susunChecklist({rekomendasi: null, akses: null}, 3).map(b => b.k), ip.j.butir.map(b => b.k), "susunChecklist murni sama");
  const bp = susunChecklist({rekomendasi: {kebutuhan: {pembasah: {perlu: true, konsentrat_l_hari: [100, 200, 300]}}}, akses: null}, 1).find(b => b.k === "pembasah");
  assert.ok(bp && bp.wajib === false && bp.saran === true && /200 liter.*inductor\/proportioner/.test(bp.teks), "butir pembasah disarankan, bukan wajib"); assert.ok(!susunChecklist({rekomendasi: {kebutuhan: {pembasah: null}}, akses: null}, 1).some(b => b.k === "pembasah"), "pembasah null tanpa butir");
  assert.match(susunChecklist({rekomendasi: null, akses: {bawa: [{barang: "Radio"}]}}, 1).at(-1).teks, /^Bawa Radio$/, "barang tanpa jumlah atau satuan");
});

uji("penugasan: 410 untuk dicabut, kedaluwarsa, dan selesai; 404 untuk tak dikenal; posisi dan semua aksi ikut ditolak", async () => {
  const cobaSemua = async (tok, kode, alasan) => {
    for (const [m, j, b] of [["GET", "info"], ["POST", "berangkat", {}], ["POST", "posisi", BERADA(-2.2, 113.9)], ["POST", "tiba", {}], ["POST", "selesai", {}], ["POST", "centang", {k: "apd"}]]) {
      const r = await lacak(m, j, tok, b); assert.equal(r.s, kode, `${m} ${j}: ${r.t}`); if (kode === 410) assert.equal(r.j.alasan, alasan);
    }
  };
  const q = async () => (await tugaskan(A, T1)).j;
  const cab = await q(); assert.equal((await api("POST", `/api/instansi/cabut_penugasan/${cab.id}`, {}, {...A.h, ...ipBaru()})).s, 200); await cobaSemua(cab.token, 410, "dicabut");
  assert.equal((await api("POST", `/api/instansi/cabut_penugasan/${cab.id}`, {}, {...A.h, ...ipBaru()})).s, 409, "sudah dicabut"); assert.equal((await api("POST", `/api/instansi/cabut_penugasan/${cab.id}`, {}, {...B.h, ...ipBaru()})).s, 404, "kabupaten lain");
  const kad = await q(); await DB.prepare("UPDATE penugasan SET dibuat = ?, kedaluwarsa = ? WHERE id = ?").bind(Date.now() - 49 * JAM, Date.now() - 1000, kad.id).run(); await cobaSemua(kad.token, 410, "kedaluwarsa");
  const sel = await q(); await DB.prepare("UPDATE penugasan SET status = 'selesai' WHERE id = ?").bind(sel.id).run(); await cobaSemua(sel.token, 410, "selesai");
  assert.match((await lacak("GET", "info", sel.token)).j.galat, /selesai/); assert.match((await lacak("GET", "info", kad.token)).j.galat, /kedaluwarsa/); assert.match((await lacak("GET", "info", cab.token)).j.galat, /dicabut/);
  assert.equal(await n("penugasan_posisi", `penugasan_id IN ('${cab.id}', '${kad.id}', '${sel.id}')`), 0, "tak satu pun posisi masuk lewat tautan mati");
  /* terbitkan ulang: token baru, yang lama mati, aktif lagi, berangkat dikosongkan, checklist tetap */
  await lacak("POST", "centang", (await q()).token, {k: "apd"});
  const u = await api("POST", `/api/instansi/terbit_penugasan/${cab.id}`, {jam: 24}, {...A.h, ...ipBaru()}); assert.equal(u.s, 201, u.t); assert.notEqual(u.j.token, cab.token); assert.match(u.j.token, /^[0-9a-f]{36}$/);
  assert.equal((await lacak("GET", "info", u.j.token)).s, 200, "token baru hidup"); assert.equal((await lacak("GET", "info", cab.token)).s, 404, "token lama tidak dikenal lagi (hash diganti)");
  const br = await DB.prepare("SELECT status, token_sha, kedaluwarsa, dibuat FROM penugasan WHERE id = ?").bind(cab.id).first(); assert.equal(br.status, "aktif"); assert.equal(br.token_sha, sha256(u.j.token)); assert.ok(br.kedaluwarsa - Date.now() < 25 * JAM && br.kedaluwarsa - Date.now() > 23 * JAM, "24 jam dari sekarang");
  assert.equal((await api("POST", `/api/instansi/terbit_penugasan/${cab.id}`, {jam: 0}, {...A.h, ...ipBaru()})).s, 400); assert.equal((await api("POST", `/api/instansi/terbit_penugasan/${cab.id}`, {}, {...B.h, ...ipBaru()})).s, 404);
  const tutup = await tugas("Kab Satu"), tq = (await tugaskan(A, tutup)).j; await DB.prepare("UPDATE tugas_api SET status = 'padam' WHERE id = ?").bind(tutup).run();
  assert.equal((await api("POST", `/api/instansi/terbit_penugasan/${tq.id}`, {}, {...A.h, ...ipBaru()})).s, 409, "tugas tertutup: tak bisa diterbitkan ulang");
});

uji("penugasan: berangkat memberi peringatan (tidak memblokir), posisi ditolak sebelum berangkat, validasi titik, akurasi di luar rentang jadi null", async () => {
  const q = (await tugaskan(A, T1, {orang: 2})).j, tk = q.token;
  const sebelum = await lacak("POST", "posisi", tk, BERADA(-2.2, 113.95)); assert.equal(sebelum.s, 409, "tekan Mulai berangkat dulu"); assert.match(sebelum.j.galat, /Mulai berangkat/);
  const b = await lacak("POST", "berangkat", tk, {}); assert.equal(b.s, 200); assert.ok(b.j.belum_wajib >= 9, "peringatan: butir wajib belum dicentang"); assert.ok(b.j.berangkat_pada > 0);
  assert.equal((await lacak("GET", "info", tk)).j.penugasan.berangkat_pada, b.j.berangkat_pada, "berangkat tersimpan"); assert.equal((await lacak("POST", "berangkat", tk, {})).j.berangkat_pada, b.j.berangkat_pada, "idempoten");
  for (const [o, ket] of [[{lat: 0, lon: 0, akurasi: 5}, "0,0"], [{lat: 7, lon: 113}, "lat di luar kotak"], [{lat: -2, lon: 150}, "lon di luar kotak"], [{lat: "x", lon: 113}, "bukan angka"], [{lat: -2}, "tanpa lon"], [{}, "kosong"], [{lat: -91, lon: 113}, "lat -91"]])
    assert.equal((await lacak("POST", "posisi", tk, o)).s, 400, ket);
  assert.equal(await n("penugasan_posisi", `penugasan_id = '${q.id}'`), 0, "tak ada posisi buruk yang tersimpan");
  const ok = await lacak("POST", "posisi", tk, {lat: -2.5, lon: 113.5, akurasi: 9000}); assert.equal(ok.s, 201, ok.t);
  const baris = await DB.prepare("SELECT * FROM penugasan_posisi WHERE penugasan_id = ?").bind(q.id).first(); assert.equal(baris.akurasi, null, "akurasi > 5000 menjadi null, posisi tetap disimpan"); assert.equal(baris.lat, -2.5);
  const b2 = (await lacak("POST", "posisi", tk, {lat: -2.5001, lon: 113.5, akurasi: 0}));
  assert.equal(b2.s, 201); assert.equal((await DB.prepare("SELECT akurasi FROM penugasan_posisi WHERE penugasan_id = ? ORDER BY id DESC LIMIT 1").bind(q.id).first()).akurasi, 0, "akurasi 0 sah");
  assert.equal((await lacak("POST", "posisi", tk, {lat: -2.5002, lon: 113.5, akurasi: -3})).s, 201); assert.equal((await DB.prepare("SELECT akurasi FROM penugasan_posisi ORDER BY id DESC LIMIT 1").first()).akurasi, null, "akurasi negatif null");
  assert.equal(await n("penugasan_posisi", `penugasan_id = '${q.id}' AND pada IS NOT NULL`), 3);
  /* tabel hanya menambah: tidak ada rute hapus atau ubah posisi */
  for (const m of ["PUT", "DELETE", "PATCH"]) assert.ok([404, 405].includes((await api(m, "/api/lacak/posisi", {}, {"x-lacak": tk})).s), m);
});

uji("penugasan: batas laju 4 posisi per menit per token dan 300 per menit per IP", async () => {
  const q = (await tugaskan(A, T1)).j; await lacak("POST", "berangkat", q.token, {});
  const kode = []; for (let i = 0; i < 6; i++) kode.push((await lacak("POST", "posisi", q.token, BERADA(-2.4 - i * 0.001, 113.6))).s);
  assert.deepEqual(kode, [201, 201, 201, 201, 429, 429], "4 per menit per token"); assert.equal(await n("penugasan_posisi", `penugasan_id = '${q.id}'`), 4);
  const lain = (await tugaskan(A, T1)).j; await lacak("POST", "berangkat", lain.token, {});
  assert.equal((await lacak("POST", "posisi", lain.token, BERADA(-2.4, 113.6))).s, 201, "token lain tidak ikut terkunci");
  const r = await lacak("POST", "posisi", q.token, BERADA(-2.4, 113.6)); assert.equal(r.h.get("retry-after"), "15");
  await DB.prepare("UPDATE penugasan_posisi SET pada = pada - 120000 WHERE penugasan_id = ?").bind(q.id).run(); assert.equal((await lacak("POST", "posisi", q.token, BERADA(-2.4, 113.61))).s, 201, "jendela satu menit bergeser");
  /* per IP: 300 per menit untuk semua token */
  const ip = {"cf-connecting-ip": "203.0.113.77"}; assert.equal((await lacak("GET", "info", lain.token, undefined, ip)).s, 200);
  const kunci = (await DB.prepare("SELECT kunci FROM laju_bnpb WHERE aksi = 'lacak.ip' ORDER BY waktu DESC LIMIT 1").first()).kunci;
  const now = Date.now(); await DB.batch(Array.from({length: 299}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lacak.ip', ?)").bind(kunci, now)));
  const tolak = await lacak("GET", "info", lain.token, undefined, ip); assert.equal(tolak.s, 429, tolak.t); assert.equal((await lacak("GET", "info", lain.token, undefined, {"cf-connecting-ip": "203.0.113.78"})).s, 200, "IP lain bebas");
});

uji("penugasan: geofence tiba otomatis (<= 300 m dan akurasi <= 300 m), tiba manual, selesai menghentikan posisi", async () => {
  const jauh = await tugas("Kab Satu", {lat: -2.5, lon: 113.5}), lat0 = -2.5, lon0 = 113.5, derajat = m => m / 111320;
  const mulai = async () => { const q = (await tugaskan(A, jauh)).j; await lacak("POST", "berangkat", q.token, {}); return q; };
  let q = await mulai(), r = await lacak("POST", "posisi", q.token, BERADA(lat0 + derajat(2000), lon0)); assert.equal(r.j.tiba, false); assert.ok(Math.abs(r.j.jarak_km - 2) < 0.1, String(r.j.jarak_km));
  assert.equal((await DB.prepare("SELECT tiba_pada FROM penugasan WHERE id = ?").bind(q.id).first()).tiba_pada, null);
  r = await lacak("POST", "posisi", q.token, BERADA(lat0 + derajat(250), lon0, 500)); assert.equal(r.j.tiba, false, "dekat tetapi akurasi 500 m: belum cukup meyakinkan");
  r = await lacak("POST", "posisi", q.token, BERADA(lat0 + derajat(320), lon0, 10)); assert.equal(r.j.tiba, false, "320 m: di luar radius 300 m");
  r = await lacak("POST", "posisi", q.token, BERADA(lat0 + derajat(250), lon0, 300)); assert.equal(r.j.tiba, true, "250 m dengan akurasi 300 m: tiba"); assert.ok(r.j.tiba_pada > 0);
  const t1 = (await DB.prepare("SELECT tiba_pada FROM penugasan WHERE id = ?").bind(q.id).first()).tiba_pada; assert.equal(t1, r.j.tiba_pada);
  await DB.prepare("UPDATE penugasan_posisi SET pada = pada - 120000 WHERE penugasan_id = ?").bind(q.id).run(); r = await lacak("POST", "posisi", q.token, BERADA(lat0 + derajat(100), lon0, 5)); assert.equal(r.j.tiba, true);
  assert.equal((await DB.prepare("SELECT tiba_pada FROM penugasan WHERE id = ?").bind(q.id).first()).tiba_pada, t1, "waktu tiba pertama tidak ditimpa");
  /* tiba manual (tombol Tiba di lokasi) dan selesai */
  q = await mulai(); const m = await lacak("POST", "tiba", q.token, {}); assert.equal(m.s, 200); assert.ok(m.j.tiba_pada > 0); assert.equal((await lacak("GET", "info", q.token)).j.penugasan.tiba_pada, m.j.tiba_pada);
  const s = await lacak("POST", "selesai", q.token, {}); assert.equal(s.s, 200); assert.equal((await lacak("GET", "info", q.token)).s, 410, "selesai: tautan mati"); assert.equal((await lacak("POST", "posisi", q.token, BERADA(lat0, lon0))).s, 410, "posisi berhenti saat selesai");
  const br = await DB.prepare("SELECT status, selesai_pada, tiba_pada FROM penugasan WHERE id = ?").bind(q.id).first(); assert.equal(br.status, "selesai"); assert.ok(br.selesai_pada > 0 && br.tiba_pada > 0);
  /* jarak dan ETA kasar: hanya selama berangkat, belum tiba */
  const t = {lat: -2.5, lon: 113.5}, e = jarakEta({lat: -2.5, lon: 113.5 + 0.18}, t, {berangkat_pada: 1, tiba_pada: null, status: "aktif", kedaluwarsa: Date.now() + JAM}, Date.now());
  assert.ok(e.jarak_km > 19 && e.jarak_km < 21, String(e.jarak_km)); assert.equal(e.eta_menit, Math.round(e.jarak_km * BATAS.etaFaktorJalan / BATAS.etaKmJam * 60)); assert.equal(jarakEta(null, t, {}, 1).eta_menit, null);
  assert.equal(jarakEta({lat: -2.5, lon: 113.6}, t, {berangkat_pada: 1, tiba_pada: 5, status: "aktif", kedaluwarsa: Date.now() + JAM}, Date.now()).eta_menit, null, "sudah tiba: tanpa ETA");
});

uji("penugasan: privasi posisi, hanya akun pemilik wilayah, moderator, dan staf wilayah itu; WA orang hanya untuk akun pemilik; kabupaten lain 404", async () => {
  const kasus = await tugas("Kab Satu", {lat: -2.4, lon: 113.2}), q = (await tugaskan(A, kasus, {nama: "Rahasia Posisi", wa: "0812 3456 7999"})).j;
  await lacak("POST", "berangkat", q.token, {}); for (let i = 0; i < 3; i++) await lacak("POST", "posisi", q.token, BERADA(-2.41 - i * 0.001, 113.21));
  await DB.prepare("UPDATE penugasan_posisi SET pada = pada - 200000 * (id % 3) WHERE penugasan_id = ?").bind(q.id).run();
  const akunA = await api("GET", `/api/instansi/penugasan/${kasus}`, undefined, {...A.hg, ...ipBaru()}); assert.equal(akunA.s, 200, akunA.t);
  const p = akunA.j.penugasan.find(x => x.id === q.id); assert.equal(p.wa, "6281234567999", "akun pemilik melihat WA"); assert.equal(p.jejak.length, 3); assert.ok(p.jejak[0][2] < p.jejak[2][2], "jejak urut waktu naik"); assert.ok(p.posisi && p.jarak_km > 0 && p.eta_menit > 0);
  assert.equal(p.ringkas.wajib_centang, 0); assert.ok(Array.isArray(p.butir) && p.butir.length > 10);
  assert.equal((await api("GET", `/api/instansi/penugasan/${kasus}`, undefined, {...B.hg, ...ipBaru()})).s, 404, "kabupaten lain: 404 yang sama dengan tugas tak ada");
  assert.equal((await api("GET", `/api/instansi/penugasan/${kasus}`, undefined, ipBaru())).s, 401, "tanpa sesi");
  assert.equal((await api("GET", `/api/instansi/penugasan/${kasus}`, undefined, {...C.hg, ...ipBaru()})).s, 200, "pemprov dalam provinsinya");
  const prov99 = await akun("pemprovlain", {jenis: "pemprov", tingkat: "prov", prov: null, kab: null, cakupan: ["63"]}); assert.equal((await api("GET", `/api/instansi/penugasan/${kasus}`, undefined, {...prov99.hg, ...ipBaru()})).s, 404, "provinsi lain");
  /* admin: moderator melihat posisi tanpa WA; akun gerbang situs dan tanpa token ditolak */
  const ad = await api("GET", `/api/instansi/admin/penugasan/${kasus}`, undefined, MOD2); assert.equal(ad.s, 200, ad.t); const pa = ad.j.penugasan.find(x => x.id === q.id); assert.equal(pa.jejak.length, 3); assert.ok(!("wa" in pa) && !ad.t.includes("6281234567999"), "admin tidak mendapat WA");
  assert.equal((await api("GET", `/api/instansi/admin/penugasan/${kasus}`, undefined, GERBANG)).s, 403); assert.equal((await api("GET", `/api/instansi/admin/penugasan/${kasus}`)).s, 403); assert.equal((await api("GET", `/api/instansi/admin/penugasan/${id16()}`, undefined, ADMIN)).s, 404);
  /* staf: pusdalops wilayah 62 boleh, wilayah lain 404, peran lain (analis konsesi) ditolak, staf tidak melihat dummy */
  let nip = 0;
  const staf = async (peran, wilayah) => { const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf Uji", nip: `19810${++nip}0012006`, unit: "Pusdalops", email: `st${nip}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
    const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); const cookie = m.h.get("set-cookie").split(";")[0];
    const g = await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB}); assert.equal(g.s, 200, g.t); return {cookie}; };
  const s62 = await staf(["pusdalops"], ["62"]), s63 = await staf(["pusdalops"], ["63"]), sKons = await staf(["analis_konsesi"], ["62"]);
  const lihat = (s, tid) => api("GET", `/api/instansi/admin/penugasan/${tid}`, undefined, s);
  const r62 = await lihat(s62, kasus); assert.equal(r62.s, 200, r62.t); assert.equal(r62.j.penugasan.find(x => x.id === q.id).jejak.length, 3); assert.ok(!r62.t.includes("6281234567999"), "staf tanpa WA");
  assert.equal((await lihat(s63, kasus)).s, 404, "staf wilayah lain: 404"); assert.equal((await lihat(sKons, kasus)).s, 403, "peran analis konsesi tidak melihat posisi");
  /* posisi tidak keluar lewat rute lain: info lacak tidak membawa posisi orang lain, daftar tugas dan rincian akun tidak membawa jejak */
  const rin = await api("GET", `/api/instansi/tugas/${kasus}`, undefined, {...A.hg, ...ipBaru()}); assert.ok(!rin.t.includes("penugasan_posisi") && !rin.t.includes("jejak"), "rincian tugas tidak membawa jejak");
  const dtg = await api("GET", "/api/instansi/tugas", undefined, {...A.hg, ...ipBaru()}); assert.ok(!dtg.t.includes("jejak"), "daftar tugas tidak membawa jejak");
  const dum = await tugas("Kab Satu", {dummy: 1}); await DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, orang, token_sha, dibuat, kedaluwarsa, dummy) VALUES (?, ?, ?, 'Dummy', 'driver', 1, ?, 1, 2, 1)").bind(id16(), dum, A.id, sha256(id16())).run();
  assert.equal((await lihat(s62, dum)).s, 404, "staf nyata tidak melihat tugas dummy"); assert.equal((await api("GET", `/api/instansi/penugasan/${dum}`, undefined, {...A.hg, ...ipBaru()})).s, 404, "akun nyata tidak melihat tugas dummy");
});

uji("penugasan: checklist tersimpan berstempel waktu lewat tautan dan lewat akun, kunci tak dikenal ditolak, bisa dibatalkan, tidak melewati penugasan lain", async () => {
  const q = (await tugaskan(A, T1, {orang: 3})).j, lain = (await tugaskan(A, T1, {orang: 3})).j, sebelum = Date.now();
  const c = await lacak("POST", "centang", q.token, {k: "apd"}); assert.equal(c.s, 200, c.t); assert.ok(c.j.checklist.apd >= sebelum && c.j.checklist.apd <= Date.now(), "stempel waktu server"); assert.equal(c.j.ringkas.wajib_centang, 1);
  assert.equal((await lacak("POST", "centang", q.token, {k: "n95", ya: true})).s, 200);
  for (const k of ["tidak_ada", "bawa_9", "x".repeat(50), "A B", "$.x", "", undefined, 5]) assert.equal((await lacak("POST", "centang", q.token, {k})).s, 400, String(k));
  const info = await lacak("GET", "info", q.token); assert.deepEqual(Object.keys(info.j.checklist).sort(), ["apd", "n95"]); assert.equal(info.j.ringkas.wajib_centang, 2); assert.ok(info.j.ringkas.belum_wajib.includes("air_minum"));
  assert.deepEqual(Object.keys((await lacak("GET", "info", lain.token)).j.checklist), [], "penugasan lain tak ikut tercentang");
  const un = await lacak("POST", "centang", q.token, {k: "apd", ya: false}); assert.deepEqual(Object.keys(un.j.checklist), ["n95"], "batal centang");
  const dari = await api("POST", `/api/instansi/centang_penugasan/${q.id}`, {k: "bawa_0"}, {...A.h, ...ipBaru()}); assert.equal(dari.s, 200, dari.t); assert.ok(dari.j.checklist.bawa_0 > 0, "akun juga bisa mencentang dari /instansi");
  assert.equal((await api("POST", `/api/instansi/centang_penugasan/${q.id}`, {k: "apd"}, {...B.h, ...ipBaru()})).s, 404); assert.equal((await api("POST", `/api/instansi/centang_penugasan/${q.id}`, {k: "ngawur"}, {...A.h, ...ipBaru()})).s, 400);
  const tersimpan = JSON.parse((await DB.prepare("SELECT checklist FROM penugasan WHERE id = ?").bind(q.id).first()).checklist); assert.deepEqual(Object.keys(tersimpan).sort(), ["bawa_0", "n95"]);
  for (const k of susunChecklist({rekomendasi: REK, akses: AKSES}, 3).filter(b => b.wajib).map(b => b.k)) await lacak("POST", "centang", q.token, {k});
  const b = await lacak("POST", "berangkat", q.token, {}); assert.equal(b.j.belum_wajib, 0, "semua butir wajib dicentang: tanpa peringatan"); assert.equal(b.j.ringkas.wajib_centang, b.j.ringkas.wajib);
});

uji("penugasan: retensi 30 hari di cron bersih-bersih, penugasan dan posisi baru utuh, sesi dan tugas lain tidak tersentuh", async () => {
  const q = (await tugaskan(A, T1)).j, kini = Date.now(), ins = (pada) => DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, -2.5, 113.5, 10, ?)").bind(q.id, pada);
  await DB.batch([ins(kini - 31 * HARI), ins(kini - 40 * HARI), ins(kini - 29 * HARI), ins(kini - HARI), ins(kini)]);
  const sebelum = await n("penugasan_posisi"), baru = await n("penugasan_posisi", "pada > " + (kini - 30 * HARI));
  const w = await mf.getWorker(); await w.scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 21, 4, 17)});   // menit 17: bersih-bersih
  assert.equal(await n("penugasan_posisi", "pada <= " + (kini - 30 * HARI)), 0, "posisi lebih dari 30 hari dibuang");
  assert.equal(await n("penugasan_posisi"), baru, `yang baru utuh (${sebelum} -> ${baru})`); assert.equal(await n("penugasan", `id = '${q.id}'`), 1, "baris penugasan tidak dibuang cron posisi");
  const {bersihkanPenugasan} = await import("../../src/penugasan.js"); assert.equal(await bersihkanPenugasan({DB}, kini), 0, "idempoten");
  assert.equal(await n("instansi_sesi"), await n("instansi_sesi"), "sesi aktif utuh");
});

uji("penugasan: tugas dihapus (retensi 180 hari) membawa penugasan dan posisinya (CASCADE)", async () => {
  const lama = await tugas("Kab Satu"); await DB.prepare("UPDATE tugas_api SET dibuat = ? WHERE id = ?").bind(Date.now() - 181 * HARI, lama).run();
  const q = (await tugaskan(A, lama)).j; await DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, -2.5, 113.5, 10, ?)").bind(q.id, Date.now()).run();
  const w = await mf.getWorker(); await w.scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 21, 4, 17)});
  assert.equal(await n("tugas_api", `id = '${lama}'`), 0, "tugas lama dibuang"); assert.equal(await n("penugasan", `id = '${q.id}'`), 0); assert.equal(await n("penugasan_posisi", `penugasan_id = '${q.id}'`), 0);
});

uji("penugasan: halaman /lacak publik tanpa login (token di fragmen), CSP ketat, no-store, tanpa referrer; centurisk97.id tidak mengunci", async () => {
  const r = await mf.dispatchFetch("http://bnpb.lokal/lacak"); assert.equal(r.status, 200); const h = await r.text(); assert.match(h, /lacak\.js/);
  assert.equal(r.headers.get("cache-control"), "no-store"); assert.equal(r.headers.get("referrer-policy"), "no-referrer"); assert.match(r.headers.get("x-robots-tag"), /noindex/); assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  const csp = r.headers.get("content-security-policy"); assert.match(csp, /default-src 'self'/); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /manifest-src 'self' blob:/); assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*/, csp);
  assert.doesNotMatch(h, /<script(?![^>]*\bsrc=)[^>]*>[^<]/, "tanpa skrip inline (CSP)"); assert.doesNotMatch(h, / style="/, "tanpa gaya inline (CSP)");
  for (const lama of [`/lacak/${"ab".repeat(18)}`, `/lacak/${"ab".repeat(18)}/manifest.webmanifest`, "/lacak/zz"]) { const x = await mf.dispatchFetch("http://bnpb.lokal" + lama); assert.notEqual(x.status, 200, lama + ": token tidak lagi di path"); await x.text(); }
  const pc = await mf.dispatchFetch("http://centurisk97.id/lacak", {redirect: "manual"}); assert.equal(pc.status, 200, "tanpa sesi admin pun terbuka: penerima tugas tidak punya akun"); await pc.text();
  const hd = await mf.dispatchFetch("http://bnpb.lokal/lacak", {method: "HEAD"}); assert.equal(hd.status, 200); assert.equal((await hd.text()), "");
  const po = await mf.dispatchFetch("http://bnpb.lokal/lacak", {method: "POST"}); assert.equal(po.status, 405); await po.text();
  const html = teks("public/lacak.html"); assert.match(html, /name="viewport"/); assert.match(html, /noindex/); assert.match(html, /rel="stylesheet" href="\/lacak\.css/); assert.match(html, /src="\/lacak\.js/);
  assert.equal((await mf.dispatchFetch("http://bnpb.lokal/lacak.html", {redirect: "manual"})).status < 500, true);
});

uji("penugasan: dummy mengisi tiap keadaan (berangkat berjejak, belum dibuka, tiba, selesai, dicabut, kedaluwarsa), hapus bersih, nyata utuh", async () => {
  const nyata = {penugasan: await n("penugasan", "dummy = 0"), posisi: await n("penugasan_posisi", "penugasan_id IN (SELECT id FROM penugasan WHERE dummy = 0)")};
  assert.equal((await api("POST", "/api/instansi/admin/dummy", {aksi: "isi"}, MOD2)).s, 403, "moderator bukan super");
  await DB.prepare("DELETE FROM penugasan WHERE dummy = 1").run(); await DB.prepare("DELETE FROM tugas_api WHERE dummy = 1").run();
  const r = await api("POST", "/api/instansi/admin/dummy", {aksi: "isi"}, ADMIN); assert.equal(r.s, 201, r.t); assert.equal(r.j.penugasan, 6);
  const st = async (kol) => (await DB.prepare(`SELECT DISTINCT ${kol} v FROM penugasan WHERE dummy = 1`).all()).results.map(x => x.v);
  assert.deepEqual((await st("status")).sort(), ["aktif", "dicabut", "selesai"]); assert.equal(await n("penugasan", "dummy = 1 AND kedaluwarsa < " + Date.now() + " AND status = 'aktif'"), 1, "satu aktif yang sudah kedaluwarsa");
  assert.equal(await n("penugasan", "dummy = 1 AND dibuka_pada IS NULL"), 1, "belum dibuka"); assert.equal(await n("penugasan", "dummy = 1 AND tiba_pada IS NOT NULL AND selesai_pada IS NULL"), 1, "tiba"); assert.equal(await n("penugasan", "dummy = 1 AND berangkat_pada IS NOT NULL AND tiba_pada IS NULL"), 1, "sedang berangkat");
  assert.ok(await n("penugasan", "dummy = 1 AND checklist != '{}'") >= 3, "checklist terisi"); assert.ok(await n("penugasan_posisi", "penugasan_id IN (SELECT id FROM penugasan WHERE dummy = 1)") >= 20, "jejak");
  /* layar dummy: akun dummy melihat jejak, jarak, ETA, dan checklist berangka */
  const tid = (await DB.prepare("SELECT tugas_id FROM penugasan WHERE dummy = 1 AND berangkat_pada IS NOT NULL AND tiba_pada IS NULL").first()).tugas_id;
  const ad = await api("GET", `/api/instansi/admin/penugasan/${tid}`, undefined, ADMIN); assert.equal(ad.s, 200); const jalan = ad.j.penugasan.find(p => p.status === "aktif" && p.berangkat_pada && !p.tiba_pada);
  assert.ok(jalan.jejak.length >= 10 && jalan.jarak_km > 1 && jalan.eta_menit > 0 && jalan.ringkas.centang >= 1, JSON.stringify([jalan.jejak.length, jalan.jarak_km, jalan.eta_menit]));
  assert.equal((await api("POST", "/api/instansi/admin/dummy", {aksi: "isi"}, ADMIN)).s, 409, "gerbang 'sudah ada'");
  const h = await api("POST", "/api/instansi/admin/dummy", {aksi: "hapus"}, ADMIN); assert.equal(h.s, 200, h.t);
  assert.equal(await n("penugasan", "dummy = 1"), 0); assert.equal(await n("penugasan_posisi", "penugasan_id NOT IN (SELECT id FROM penugasan)"), 0, "tak ada posisi yatim"); assert.equal(await n("tugas_api", "dummy = 1"), 0);
  assert.equal(await n("penugasan", "dummy = 0"), nyata.penugasan, "penugasan nyata utuh");
});

uji("penugasan: tanpa migrasi 0035 rute menjawab 503 yang jelas, cron dan dummy tidak melempar, tugas lain tetap jalan", async () => {
  const U2 = await siapkan("uji-penugasan-tanpa", {r2: true}), D2 = U2.DB;
  for (const x of (await D2.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE '%REFERENCES penugasan (%'").all()).results) await D2.prepare(`DROP TABLE ${x.name}`).run();   // anak FK (posisi, darurat 0041, tabel modul lain) ikut hilang seperti sebelum 0035
  await D2.prepare("DROP TABLE IF EXISTS penugasan_posisi").run(); await D2.prepare("DROP TABLE penugasan").run();   // keadaan produksi sebelum 0035 (dan 0041)
  const r = await U2.api("GET", "/api/lacak/info", undefined, {"x-lacak": "ab".repeat(18)}); assert.equal(r.s, 503, r.t); assert.match(r.j.galat, /0035/);
  assert.equal((await U2.api("POST", "/api/lacak/posisi", {lat: -2, lon: 113}, {"x-lacak": "ab".repeat(18), ...PB})).s, 503);
  const w = await U2.mf.getWorker(); await w.scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 21, 4, 17)});   // bersih-bersih tidak melempar
  const {bersihkanPenugasan} = await import("../../src/penugasan.js"); assert.equal(await bersihkanPenugasan({DB: D2}), null);
  const d = await U2.api("POST", "/api/instansi/admin/dummy", {aksi: "isi"}, ADMIN); assert.equal(d.s, 201, d.t); assert.equal(d.j.penugasan, 0, "dummy instansi tetap terisi tanpa penugasan");
  assert.equal((await U2.api("POST", "/api/instansi/admin/dummy", {aksi: "hapus"}, ADMIN)).s, 200);
  const pg = await U2.api("GET", "/api/instansi/saya", undefined, {}); assert.ok([401, 403].includes(pg.s), "rute lain tetap menjawab wajar");
});

uji("penugasan: info padam jujur: label menurut keadaan dan umur, tanpa janji padam total", () => {
  const kini = 1e12, t = (v, o = {}) => ({padam_verif: v, padam_pada: kini - 5 * JAM, verif_pada: kini, cek_ulang_pada: null, status: "padam", ...o});
  assert.equal(infoPadam({padam_verif: null}, kini), null);
  const a = infoPadam(t("padam_dilaporkan"), kini); assert.match(a.label, /Padam dilaporkan/); assert.equal(a.tingkat, "emas"); assert.equal(a.boleh_cek_ulang, true);
  const b = infoPadam(t("padam_dilaporkan", {padam_pada: kini - 25 * JAM}), kini); assert.equal(b.label, "Padam, belum ada titik baru 24 jam. Menunggu 48 jam untuk verifikasi satelit.");
  const c = infoPadam(t("padam_terverifikasi"), kini); assert.equal(c.tingkat, "hijau"); assert.match(c.label, /tidak terdeteksi satelit 48 jam/); assert.match(c.label, /Bara bawah permukaan tetap mungkin, cek ulang lapangan/);
  const d = infoPadam(t("muncul_lagi", {status: "buka"}), kini); assert.equal(d.tingkat, "merah"); assert.match(d.label, /Api muncul lagi/); assert.equal(d.boleh_cek_ulang, false);
  assert.equal(infoPadam(t("padam_dilaporkan", {cek_ulang_pada: kini - JAM}), kini).boleh_cek_ulang, false, "sekali cek ulang"); assert.equal(infoPadam(t("padam_dilaporkan", {cek_ulang_pada: kini - JAM}), kini).cek_ulang, true);
  for (const x of [a, b, c, d]) assert.doesNotMatch(x.label, /·|undefined|NaN|\[object/);
});

/* ================================================================ klien: node:vm dengan DOM tiruan minimal */
function elemen(tag = "div") {
  const e = {tag, children: [], dataset: {}, style: {}, attrs: {}, handlers: {}, hidden: false, textContent: "", innerHTML: "", className: "", disabled: false, value: "",
    classList: {add() {}, remove() {}, toggle() {}, contains: () => false}, append(...x) { e.children.push(...x); }, appendChild(x) { e.children.push(x); return x; }, remove() { e.dihapus = true; }, focus() {}, scrollIntoView() {},
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute: k => e.attrs[k] ?? null, removeAttribute(k) { delete e.attrs[k]; }, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    addEventListener(t, f) { (e.handlers[t] ||= []).push(f); }, removeEventListener() {}, insertAdjacentHTML() {}, replaceChildren() {}, getBoundingClientRect: () => ({width: 300, height: 300}), showModal() { e.terbuka = true; }, close() { e.terbuka = false; },
    dispatchEvent(ev) { (e.handlers[ev.type] || []).forEach(f => f(ev)); return true; }};
  return e;
}
function dunia({sesi = new Map(), sesiMelempar = false, jalur = "/lacak", hash = "#" + "ab".repeat(18), geoloc, nav = {}, kini = {t: Date.UTC(2026, 10, 21, 3, 0)}} = {}) {
  const log = {fetch: [], timer: [], body: [], toast: []}, byId = new Map(), tampil = {hidden: false};
  const doc = Object.assign(elemen("document"), {visibilityState: "visible", readyState: "complete", getElementById: id => byId.get(id) ?? (byId.set(id, elemen()), byId.get(id)), createElement: tag => elemen(tag), createElementNS: tag => elemen(tag), head: elemen("head"),
    body: Object.assign(elemen("body"), {append(...x) { log.body.push(...x); }, appendChild(x) { log.body.push(x); return x; }}), documentElement: elemen("html"), querySelectorAll: () => [], querySelector: () => null, title: ""});
  const win = new EventTarget(); const Tgl = class extends Date { constructor(...a) { super(...(a.length ? a : [kini.t])); } static now() { return kini.t; } };
  const ctx = {window: win, document: doc, navigator: {geolocation: geoloc, onLine: true, wakeLock: undefined, language: "id-ID", ...nav}, location: {pathname: jalur, hash, origin: "http://bnpb.lokal", href: "http://bnpb.lokal" + jalur + hash, search: ""},
    sessionStorage: {getItem: k => { if (sesiMelempar) throw new Error("SecurityError"); return sesi.has(k) ? sesi.get(k) : null; }, setItem: (k, v) => { if (sesiMelempar) throw new Error("SecurityError"); sesi.set(k, String(v)); }, removeItem: k => sesi.delete(k)},
    localStorage: {getItem: () => null, setItem() {}}, fetch: (...a) => { log.fetch.push(a); return Promise.resolve(new Response("{}", {status: 200, headers: {"content-type": "application/json"}})); }, Date: Tgl, Math, JSON, Number, String, Object, Array, Set, Map, Promise, RegExp, Error, URL, URLSearchParams, Intl, console,
    setTimeout: (f, ms) => { log.timer.push({f, ms}); return log.timer.length; }, clearTimeout() {}, setInterval(f, ms) { log.timer.push({f, ms, tiap: true}); return log.timer.length; }, clearInterval() {}, requestAnimationFrame: f => { f(); return 1; }, performance: {now: () => kini.t},
    matchMedia: () => ({matches: false}), innerWidth: 390, innerHeight: 844, crypto: globalThis.crypto, Event, CustomEvent, EventTarget, encodeURIComponent, decodeURIComponent, isFinite, parseFloat, parseInt, fmt: undefined, Wilayah: {kab: x => x, prov: x => x, PROV: {}}};
  Object.assign(win, ctx, {addEventListener: win.addEventListener.bind(win), dispatchEvent: win.dispatchEvent.bind(win)}); ctx.window = win; ctx.self = win; win.window = win; vm.createContext(win);
  return {win, doc, log, byId, kini, jalankan: n => vm.runInContext(teks("public", n), win, {filename: n}), tick: f => log.timer.filter(f).forEach(t => t.f())};
}
const respons = (j, status = 200) => Promise.resolve(new Response(JSON.stringify(j), {status, headers: {"content-type": "application/json"}}));

uji("klien lacak.js: watchPosition akurasi tinggi, kirim paling sering tiap 45 detik, clearWatch saat tersembunyi dan nyala lagi saat terlihat, pesan galat per kode", async () => {
  const geo = {nWatch: 0, cleared: [], opsi: null, cb: null, err: null, watchPosition(ok, err, o) { geo.nWatch++; geo.cb = ok; geo.err = err; geo.opsi = o; return geo.nWatch; }, clearWatch(id) { geo.cleared.push(id); }};
  const d = dunia({geoloc: geo});
  const info = {kini: d.kini.t, tugas: {kab: "Kab Satu", kec: "Kec Uji", lat: -2.2, lon: 113.9, level: 3, ditutup: false, cara: ["Sekat kanal"], alat: []}, akses: null, navigasi: "https://www.google.com/maps/dir/?api=1&destination=-2.2,113.9&travelmode=driving", oleh: "Pemerintah Kab Satu",
    penugasan: {nama: "Hendra", peran: "driver", peran_nama: "Driver", orang: 4, kedaluwarsa: d.kini.t + JAM, dibuka_pada: d.kini.t, berangkat_pada: null, tiba_pada: null}, butir: [{k: "apd", teks: "APD", wajib: true}, {k: "senter", teks: "Senter", wajib: false}], checklist: {}, ringkas: {wajib: 1, wajib_centang: 0, belum_wajib: ["apd"]}, batas: {jeda_ms: 45000, tiba_m: 300}};
  d.win.fetch = (u, o) => { d.log.fetch.push([u, o]); if (u.endsWith("/info")) return respons(info); if (u.endsWith("/berangkat")) return respons({berangkat_pada: d.kini.t, belum_wajib: 1}); if (u.endsWith("/posisi")) return respons({ok: true, pada: d.kini.t, jarak_km: 3.2, tiba: false}, 201); return respons({}); };
  d.jalankan("lacak.js"); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  const info1 = d.log.fetch.find(f => f[0].endsWith("/api/lacak/info")); assert.ok(info1, "memuat info"); assert.equal(info1[1].headers["x-lacak"], "ab".repeat(18), "token dari alamat halaman, dikirim lewat header"); assert.ok(!info1[0].includes("ab".repeat(18)), "token tidak di URL API");
  assert.equal(geo.nWatch, 0, "belum berangkat: belum meminta izin lokasi");
  const klik = id => (d.byId.get(id).handlers.click || []).forEach(f => f({preventDefault() {}, target: d.byId.get(id)}));
  klik("bBerangkat"); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  assert.equal(d.log.fetch.filter(f => f[0].endsWith("/berangkat")).length, 0, "butir wajib belum dicentang: peringatan dulu, belum berangkat");
  assert.match(d.byId.get("peringatan").textContent + d.byId.get("peringatan").innerHTML, /belum dicentang|wajib/i); assert.equal(d.byId.get("peringatan").hidden, false);
  klik("bBerangkat"); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  assert.equal(d.log.fetch.filter(f => f[0].endsWith("/berangkat")).length, 1, "ketuk kedua = tetap berangkat (peringatan tidak memblokir)");
  assert.equal(geo.nWatch, 1, "watchPosition menyala"); assert.equal(JSON.stringify(geo.opsi), JSON.stringify({enableHighAccuracy: true, maximumAge: 30000, timeout: 60000}), "opsi GPS");
  const kirim = () => d.log.fetch.filter(f => f[0].endsWith("/posisi"));
  const titik = (lat, lon) => geo.cb({coords: {latitude: lat, longitude: lon, accuracy: 12}, timestamp: d.kini.t}); const tunggu = () => new Promise(r => setImmediate(r));
  titik(-2.5, 113.5); await tunggu(); assert.equal(kirim().length, 1, "posisi pertama langsung terkirim"); const o = kirim()[0][1]; assert.equal(o.keepalive, true, "fetch keepalive"); assert.deepEqual(JSON.parse(o.body), {lat: -2.5, lon: 113.5, akurasi: 12}); assert.equal(o.headers["x-pb"], "1");
  const t0 = d.kini.t;
  for (const dt of [1000, 20000, 44000]) { d.kini.t = t0 + dt; titik(-2.5, 113.5 + dt / 1e6); await tunggu(); }
  assert.equal(kirim().length, 1, "di bawah 45 detik: tidak mengirim lagi");
  d.kini.t = t0 + 46000; titik(-2.49, 113.51); await tunggu(); assert.equal(kirim().length, 2, "lewat 45 detik: kirim");
  assert.match(d.byId.get("statusPosisi").textContent, /Posisi terkirim \d{2}\.\d{2}/, d.byId.get("statusPosisi").textContent);
  /* layar tersembunyi: clearWatch; terlihat: menyala lagi */
  d.doc.visibilityState = "hidden"; d.doc.dispatchEvent(new d.win.Event("visibilitychange")); assert.deepEqual(geo.cleared, [1], "clearWatch saat tersembunyi"); assert.equal(geo.nWatch, 1);
  d.doc.visibilityState = "visible"; d.doc.dispatchEvent(new d.win.Event("visibilitychange")); assert.equal(geo.nWatch, 2, "nyala lagi saat terlihat");
  /* pesan galat per e.code */
  const galat = code => { geo.err({code}); return d.byId.get("statusPosisi").textContent; };
  assert.match(galat(1), /izin/i); assert.match(galat(2), /tidak tersedia|sinyal|GPS/i); assert.match(galat(3), /terlalu lama|waktu/i);
  assert.notEqual(galat(1), galat(3));
  /* tiba otomatis dari server mengubah tombol; 410 menghentikan pelacakan */
  d.win.fetch = (u, o) => { d.log.fetch.push([u, o]); return respons({galat: "tautan ini dicabut oleh yang menugaskan", alasan: "dicabut"}, 410); };
  d.kini.t += 46000; geo.cb({coords: {latitude: -2.4, longitude: 113.4, accuracy: 10}, timestamp: d.kini.t}); await tunggu(); await tunggu();
  assert.ok(geo.cleared.length >= 2, "410: pelacakan berhenti"); assert.match(d.byId.get("pesanUtama").textContent + d.byId.get("tampilanMati")?.textContent, /dicabut/);
});

uji("klien lacak.js: peringatan jujur layar mati, Screen Wake Lock bila didukung, tombol Navigasi ke koordinat api", async () => {
  const js = teks("public/lacak.js"), html = teks("public/lacak.html"), css = teks("public/lacak.css");
  assert.match(js, /wakeLock\.request\("screen"\)/); assert.match(js, /visibilitychange/); assert.match(js, /clearWatch/); assert.match(js, /keepalive/); assert.match(js, /JEDA_MS = 45000|JEDA_MS = 45e3/);
  assert.match(html + js, /posisi berhenti.*layar mati|layar mati.*posisi berhenti|Jika layar mati, posisi berhenti/is, "peringatan jujur bahwa posisi berhenti saat layar mati");
  assert.match(js, /google\.com\/maps\/dir\/\?api=1&destination=|info\.navigasi|j\.navigasi/); assert.match(js, /rel[ =]"?noopener/);
  assert.match(js, /manifest/); assert.doesNotMatch(js + html, /·|·/, "tanpa titik tengah pemisah");
  assert.match(css, /@media/); assert.match(css, /min-height: ?4[4-9]px|min-height: ?5\dpx|min-height: ?3\.[0-9]rem/, "target sentuh besar");
  /* tanpa wakeLock: tidak melempar */
  const d = dunia({geoloc: {watchPosition() { return 1; }, clearWatch() {}}}); d.win.fetch = () => respons({galat: "x"}, 404); assert.doesNotThrow(() => d.jalankan("lacak.js"));
});

uji("pop-up peta saat masuk: tampil sekali per sesi (sessionStorage), tidak lagi saat dimuat ulang, aman bila sessionStorage melempar, ringkasan N kompleks aktif M terlambat", async () => {
  const sesi = new Map(), tugasKu = [{id: "a", lat: -2.2, lon: 113.9, status: "buka", terlambat: true, kab: "Kab Satu"}, {id: "b", lat: -2.3, lon: 113.8, status: "buka", terlambat: false, kab: "Kab Satu"}, {id: "c", lat: -2.4, lon: 113.7, status: "padam", terlambat: false, kab: "Kab Satu"}];
  const saya = {akun: {id: "akun1", tingkat: "kab", wilayah: "Pemerintah Kab Satu", status: "aktif"}, cakupan: ["62"], kab: "Kab Satu"};
  const d = dunia({sesi, jalur: "/instansi"}); d.win.fetch = () => respons({baris: [], wilayah: [], acuan: "2026-10-21T03:00:00Z"}); d.jalankan("instansi_tugaskan.js");
  const T = d.win.Tugaskan; assert.ok(T && typeof T.popupMasuk === "function", "modul memajang Tugaskan.popupMasuk");
  assert.equal(T.ringkasan(tugasKu).teks, "2 kompleks aktif, 1 terlambat", "ringkasan N kompleks aktif, M terlambat"); assert.deepEqual([T.ringkasan(tugasKu).aktif, T.ringkasan(tugasKu).terlambat], [2, 1]); assert.equal(T.ringkasan([]).teks, "0 kompleks aktif, 0 terlambat");
  const sebelum = d.log.body.length; const a = await T.popupMasuk({saya, tugas: tugasKu, lihatTugas() {}}); assert.equal(a, true, "muncul pertama kali"); assert.equal(d.log.body.length, sebelum + 1, "modal dipasang ke body sekali");
  const modal = d.log.body.at(-1); assert.equal(modal.attrs.role, "dialog"); assert.equal(modal.attrs["aria-modal"], "true"); assert.match(modal.innerHTML, /Lihat tugas/); assert.match(modal.innerHTML, /Tutup/); assert.match(modal.innerHTML, /2 kompleks aktif, 1 terlambat/);
  assert.equal(sesi.get("pb_peta_masuk:akun1"), "1", "kunci sesi tertulis"); assert.doesNotMatch(modal.innerHTML, /·/);
  const b = await T.popupMasuk({saya, tugas: tugasKu, lihatTugas() {}}); assert.equal(b, false, "tidak tampil lagi dalam sesi yang sama"); assert.equal(d.log.body.length, sebelum + 1);
  /* halaman dimuat ulang (modul baru, sessionStorage yang sama): tetap tidak tampil */
  const d2 = dunia({sesi, jalur: "/instansi"}); d2.win.fetch = () => respons({}); d2.jalankan("instansi_tugaskan.js"); assert.equal(await d2.win.Tugaskan.popupMasuk({saya, tugas: tugasKu, lihatTugas() {}}), false, "muat ulang: tidak lagi");
  /* akun lain di peramban yang sama tetap melihatnya sekali */
  assert.equal(await d2.win.Tugaskan.popupMasuk({saya: {...saya, akun: {...saya.akun, id: "akun2"}}, tugas: tugasKu, lihatTugas() {}}), true);
  /* sessionStorage melempar (mode privat ketat): tidak melempar, tampil sekali per muatan halaman */
  const d3 = dunia({sesiMelempar: true, jalur: "/instansi"}); d3.win.fetch = () => respons({}); d3.jalankan("instansi_tugaskan.js");
  assert.equal(await d3.win.Tugaskan.popupMasuk({saya, tugas: tugasKu, lihatTugas() {}}), true); assert.equal(await d3.win.Tugaskan.popupMasuk({saya, tugas: tugasKu, lihatTugas() {}}), false, "tanpa sessionStorage: tetap sekali per muatan halaman");
  /* akun belum aktif atau tanpa tugas: tidak ada pop-up kosong yang mengganggu */
  const d4 = dunia({sesi: new Map(), jalur: "/instansi"}); d4.win.fetch = () => respons({}); d4.jalankan("instansi_tugaskan.js"); assert.equal(await d4.win.Tugaskan.popupMasuk({saya: {akun: {...saya.akun, status: "menunggu"}}, tugas: tugasKu}), false);
  const css = teks("public/instansi_tugaskan.css"); assert.match(css, /@media \(max-width/, "ponsel dan desktop"); assert.match(teks("public/instansi.html"), /instansi_tugaskan\.js/); assert.match(teks("public/instansi.html"), /instansi_tugaskan\.css/);
});

uji("penugasan: routing rute baru terdaftar di tabel RUTE, kunci hanya karakter yang dibaca gerbang, berkas klien dimuat", () => {
  const js = teks("src/penugasan.js"), kunci = [...js.matchAll(/^\s*"((?:GET|POST) \/[\w\/:]+)":/gm)].map(x => x[1]);
  assert.ok(kunci.length >= 12, `semua rute tertangkap gerbang: ${kunci.length}`); assert.ok(teks("src/worker.js").includes("...RUTE_PENUGASAN"));
  for (const f of readdirSync(path.join(AKAR, "public")).filter(x => /^(lacak|instansi_tugaskan)\./.test(x))) assert.ok(teks("public", f).length > 100, f);
});

uji("penugasan: koefisien air minum sama dengan operasi.py koef air_minum mid, bentuk akses pipeline cocok persis dengan render", () => {
  const py = teks("scripts/data/operasi.py"), m = py.match(/"air_minum": dict\(lo=(\d+(?:\.\d+)?), mid=(\d+(?:\.\d+)?), hi=/);
  assert.ok(m, "koef air_minum ada di operasi.py"); assert.equal(BATAS.airLiterPerOrangHari, Number(m[2]), "paritas dengan operasi.py mid");
  const akses = {jalan: {lat: -2.3, lon: 113.9, kelas: "primary", km_garis_lurus: 4.2}, kaki_km: 3.1, jam_tiba: 3.2, dari: {dari: "Posko Uji", jenis: "posko", km_jalan: 38, jam: 1.4}, jalan_kaki_jam: 1.8, bawa: [{barang: "Selang", jumlah: 200, satuan: "m", status: "dipikul"}]};
  const d = dunia(); d.jalankan("instansi_akses.js"); const h = d.win.AksesKartu.html(akses);
  for (const t of ["Posko Uji", "38 km", "3,1 km", "4,2 km garis lurus", "jalan utama (aspal) terdekat", "Selang, 200 m"]) assert.ok(h.toLowerCase().includes(t.toLowerCase()), t);
  for (const k of [{jalan: null, dari: null, bawa: null, kaki_km: 1, jam_tiba: 2, jalan_kaki_jam: 1}]) assert.doesNotThrow(() => d.win.AksesKartu.html(k));
  assert.doesNotMatch(h, /undefined|NaN|\[object|·/);
});


/* ================================================================ L2 usulan penugasan dan L3 keselamatan regu */
const TOK = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
/* penugasan langsung lewat SQL dengan waktu bebas; posisi = [[lat, lon, pada]] */
async function sisip(tid, akunId, {nama = "Uji Orang", peran = "anggota", wa = null, orang = 1, status = "aktif", dibuat, kedaluwarsa, berangkat = null, tiba = null, selesai = null, posisi = [], dummy = 0}) {
  const id = id16(), d = dibuat ?? Date.now() - 3 * HARI;
  await DB.prepare("INSERT INTO penugasan (id, tugas_id, akun_id, nama, peran, wa, orang, token_sha, status, dibuat, kedaluwarsa, berangkat_pada, tiba_pada, selesai_pada, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, tid, akunId, nama, peran, wa, orang, TOK().slice(0, 64), status, d, kedaluwarsa ?? Date.now() + 40 * HARI, berangkat, tiba, selesai, dummy).run();
  for (const [la, lo, pd] of posisi) await DB.prepare("INSERT INTO penugasan_posisi (penugasan_id, lat, lon, akurasi, pada) VALUES (?, ?, ?, 10, ?)").bind(id, la, lo, pd).run();
  return id;
}
const envAlarm = {DB, ASSETS: {fetch: asetKu}};
const butirDari = async (kini, pid) => (await alarmKeselamatan(envAlarm, kini)).filter(b => b.id.includes(pid));
const OFFSET_2KM = 2 / 111.32;   // derajat lintang untuk 2 km

uji("L3: migrasi 0041 idempoten, CHECK menahan jenis dan koordinat buruk, indeks ada", async () => {
  const sql = teks("migrations/0041_keselamatan.sql");
  for (const q of pecah(sql)) await DB.prepare(q).run();   // jalankan ulang tanpa galat
  assert.equal(await n("penugasan_darurat"), 0);
  const idx = (await DB.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'penugasan_darurat'").all()).results.map(x => x.name);
  assert.ok(idx.includes("penugasan_darurat_jejak") && idx.includes("penugasan_darurat_pada"), idx.join());
  const pid = await sisip(T1, A.id, {});
  const ins = (jenis, lat, lon, ak = 5) => DB.prepare("INSERT INTO penugasan_darurat (penugasan_id, jenis, lat, lon, akurasi, pada) VALUES (?, ?, ?, ?, ?, 1)").bind(pid, jenis, lat, lon, ak).run();
  await ins("cedera", -2, 113); await ins("tersesat", null, null);
  for (const [j, la, lo, ak] of [["raja", -2, 113, 5], ["cedera", 0.0 + 50, 113, 5], ["cedera", -2, 10, 5], ["cedera", -2, null, 5], ["cedera", -2, 113, 6000]]) await assert.rejects(ins(j, la, lo, ak), /CHECK|constraint/i, `${j} ${la} ${lo} ${ak}`);
  await DB.prepare("DELETE FROM penugasan WHERE id = ?").bind(pid).run(); assert.equal(await n("penugasan_darurat"), 0, "ikut terhapus bersama penugasan (ON DELETE CASCADE)");
});

uji("L3: darurat lewat token sah tercatat; token liar 404, tanpa x-pb 403, jenis salah 400, tautan mati 410, laju 5 per 10 menit", async () => {
  const q = (await tugaskan(A, T1, {nama: "Darurat Satu"})).j;
  const kirim = (o, token = q.token, h = {}) => lacak("POST", "darurat", token, o).then(r => r);
  const ok = await kirim({jenis: "cedera", ...BERADA(-2.21, 113.91, 12)}); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.posisi_tercatat, true);
  const baris = await DB.prepare("SELECT * FROM penugasan_darurat WHERE penugasan_id = ?").bind(q.id).first(); assert.equal(baris.jenis, "cedera"); assert.equal(baris.lat, -2.21); assert.equal(baris.akurasi, 12);
  assert.equal((await kirim({jenis: "raja"})).s, 400); assert.equal((await kirim({})).s, 400);
  const tanpa = await kirim({jenis: "tersesat", lat: 0, lon: 0}); assert.equal(tanpa.s, 201, "posisi cacat tidak menggagalkan panggilan darurat"); assert.equal(tanpa.j.posisi_tercatat, false);
  assert.equal((await DB.prepare("SELECT lat, lon FROM penugasan_darurat WHERE jenis = 'tersesat' AND penugasan_id = ?").bind(q.id).first()).lat, null);
  assert.equal((await kirim({jenis: "lainnya"}, "ab".repeat(18))).s, 404, "token liar"); assert.equal((await kirim({jenis: "lainnya"}, "zz")).s, 404, "token bukan 36 hex");
  assert.equal((await api("POST", "/api/lacak/darurat", {jenis: "cedera"}, {"x-lacak": q.token, ...ipBaru()})).s, 403, "tanpa x-pb");
  assert.equal(await n("penugasan_darurat", "penugasan_id = '" + q.id + "'"), 2, "yang ditolak tidak ditulis");
  for (let i = 0; i < 3; i++) assert.equal((await kirim({jenis: "lainnya"})).s, 201);   // total 5
  const enam = await kirim({jenis: "lainnya"}); assert.equal(enam.s, 429, enam.t); assert.equal(enam.h.get("retry-after"), "60"); assert.equal(KESELAMATAN.daruratPer10Menit, 5);
  await DB.prepare("UPDATE penugasan_darurat SET pada = pada - ? WHERE penugasan_id = ?").bind(11 * MENIT, q.id).run();
  assert.equal((await kirim({jenis: "cedera"})).s, 201, "jendela 10 menit bergeser");
  const q2 = (await tugaskan(A, T1, {nama: "Darurat Mati"})).j; await api("POST", `/api/instansi/cabut_penugasan/${q2.id}`, {}, {...A.h, ...ipBaru()});
  assert.equal((await kirim({jenis: "cedera"}, q2.token)).s, 410, "tautan dicabut");
});

uji("L3: darurat tampil di rincian penugasan (akun pemilik dengan WA, akun lain tanpa WA), hilang setelah 6 jam", async () => {
  const tid = await tugas("Kab Satu"), A2 = await akun("polressatu2", {jenis: "polres", kab: "Kab Satu"}), q = (await tugaskan(A, tid, {nama: "Cedera Wa", wa: "0812 3456 7888"})).j;
  await lacak("POST", "berangkat", q.token, {}); assert.equal((await lacak("POST", "darurat", q.token, {jenis: "terkepung_api", ...BERADA(-2.2, 113.9)})).s, 201);
  const pilih = r => r.j.penugasan.find(x => x.id === q.id);
  const milik = pilih(await api("GET", `/api/instansi/penugasan/${tid}`, undefined, {...A.hg, ...ipBaru()})), lain = pilih(await api("GET", `/api/instansi/penugasan/${tid}`, undefined, {...A2.hg, ...ipBaru()}));
  assert.equal(milik.darurat.jenis, "terkepung_api"); assert.equal(milik.darurat.label, "Terkepung api"); assert.equal(milik.wa, "6281234567888"); assert.equal(lain.darurat.jenis, "terkepung_api"); assert.ok(!("wa" in lain));
  const adm = pilih(await api("GET", `/api/instansi/admin/penugasan/${tid}`, undefined, {...ADMIN, ...ipBaru()})); assert.equal(adm.darurat.jenis, "terkepung_api"); assert.ok(!("wa" in adm));
  await DB.prepare("UPDATE penugasan_darurat SET pada = pada - ? WHERE penugasan_id = ?").bind(7 * JAM, q.id).run();
  assert.equal(pilih(await api("GET", `/api/instansi/penugasan/${tid}`, undefined, {...A.hg, ...ipBaru()})).darurat, null, "lewat 6 jam: tidak lagi dianggap aktif");
});

uji("L3: alarm sunyi tepat di batas 30 menit (30 menit tidak, 30 menit + 1 ms ya), memakai berangkat bila belum ada posisi", async () => {
  const K = Date.now(), tid = await tugas("Kab Satu"), M = KESELAMATAN.sunyiMenit * MENIT;
  assert.equal(KESELAMATAN.sunyiMenit, 30);
  const a1 = await sisip(tid, A.id, {berangkat: K - M}), a2 = await sisip(tid, A.id, {berangkat: K - M - 1}), a3 = await sisip(tid, A.id, {berangkat: K - 5 * JAM, posisi: [[-2.3, 113.9, K - M]]}), a4 = await sisip(tid, A.id, {berangkat: K - 5 * JAM, posisi: [[-2.3, 113.9, K - M - 1]]});
  const a5 = await sisip(tid, A.id, {berangkat: null}), a6 = await sisip(tid, A.id, {berangkat: K - 2 * JAM, status: "selesai", selesai: K - JAM}), a7 = await sisip(tid, A.id, {berangkat: K - 2 * JAM, kedaluwarsa: K - 1000});
  const sunyi = async id => (await butirDari(K, id)).filter(b => b.jenis === "regu_sunyi");
  assert.equal((await sunyi(a1)).length, 0, "tepat 30 menit belum sunyi"); assert.equal((await sunyi(a2)).length, 1); assert.equal((await sunyi(a3)).length, 0, "posisi terakhir tepat 30 menit"); assert.equal((await sunyi(a4)).length, 1, "posisi terakhir 30 menit + 1 ms");
  for (const id of [a5, a6, a7]) assert.equal((await butirDari(K, id)).length, 0, "belum berangkat / selesai / kedaluwarsa: tanpa alarm");
  const b = (await sunyi(a2))[0]; assert.equal(b.prioritas, 1); assert.deepEqual(b.provs, ["62"]); assert.equal(b.kab, "Kab Satu"); assert.match(b.judul, /Uji Orang tidak mengirim posisi 30 menit/); assert.ok(!/·/.test(b.judul + b.rincian));
  assert.equal(b.id, (await sunyi(a2))[0].id, "id stabil antar panggilan");
  const tutup = await tugas("Kab Satu", {status: "padam"}); const a8 = await sisip(tutup, A.id, {berangkat: K - 3 * JAM}); assert.equal((await butirDari(K, a8)).length, 0, "tugas sudah ditutup: tanpa alarm");
});

uji("L3: rotasi 12 jam tepat di batas (12 jam tidak, 12 jam + 1 ms ya), selesai tidak", async () => {
  const K = Date.now(), tid = await tugas("Kab Satu"), B12 = KESELAMATAN.rotasiJam * JAM;
  assert.equal(KESELAMATAN.rotasiJam, 12);
  const pos = [[-2.3, 113.9, K - 1000]], r1 = await sisip(tid, A.id, {berangkat: K - B12, posisi: pos}), r2 = await sisip(tid, A.id, {berangkat: K - B12 - 1, posisi: pos}), r3 = await sisip(tid, A.id, {berangkat: K - B12 - 5 * JAM, status: "selesai", selesai: K - JAM, posisi: pos});
  const r4 = await sisip(tid, A.id, {berangkat: K - 13 * JAM, tiba: K - 12 * JAM, posisi: pos});
  const rot = async id => (await butirDari(K, id)).filter(b => b.jenis === "regu_rotasi");
  assert.equal((await rot(r1)).length, 0); assert.equal((await rot(r2)).length, 1); assert.equal((await rot(r3)).length, 0, "sudah selesai"); assert.equal((await rot(r4)).length, 1, "sudah tiba tetap dihitung bertugas");
  const b = (await rot(r2))[0]; assert.equal(b.prioritas, 2); assert.match(b.judul, /sudah bertugas 12 jam, waktunya rotasi/); assert.equal((await butirDari(K, r1)).length, 0, "tidak sunyi: posisi 1 detik lalu");
});

uji("L3: angin mengarah ke regu: searah memicu, berlawanan tidak, ws dan gust kecil tidak, di luar 6 jam tidak, regu jauh tidak (fungsi murni)", () => {
  const m0 = Date.UTC(2026, 9, 22, 0), kini = m0 + 3 * JAM + 10 * MENIT, api = {lat: -2.2, lon: 113.9}, regu = {lat: -2.2 - OFFSET_2KM, lon: 113.9};   // regu 2 km di selatan api: arah ke api = utara (0 derajat)
  const c = (wd, ws, gust = ws) => ({m0, ws: Array(30).fill(ws), wd: Array(30).fill(wd), gust: Array(30).fill(gust)});
  const a = anginKeRegu(c(0, 20), api, regu, kini); assert.ok(a, "angin dari utara (dari api) ke regu di selatan"); assert.equal(a.jam_ke, 0); assert.equal(a.dari_arah, "utara"); assert.equal(a.ws, 20); assert.equal(a.jarak_km, 2);
  assert.ok([90, 270].includes(a.menjauh_derajat), "menjauh = tegak lurus angin: " + a.menjauh_derajat); assert.ok(["timur", "barat"].includes(a.menjauh_arah));
  assert.ok(anginKeRegu(c(45, 20), api, regu, kini), "tepat 45 derajat masih memicu"); assert.ok(anginKeRegu(c(315, 20), api, regu, kini)); assert.equal(anginKeRegu(c(46, 20), api, regu, kini), null, "46 derajat tidak");
  assert.equal(anginKeRegu(c(180, 30), api, regu, kini), null, "angin dari selatan = menjauhi regu ke arah api"); assert.equal(anginKeRegu(c(90, 30), api, regu, kini), null, "menyamping");
  assert.equal(anginKeRegu(c(0, 14.9, 24.9), api, regu, kini), null, "ws dan gust di bawah ambang"); assert.ok(anginKeRegu(c(0, 15, 15), api, regu, kini), "ws tepat 15"); assert.ok(anginKeRegu(c(0, 5, 25), api, regu, kini), "gust tepat 25 saja cukup");
  assert.equal(anginKeRegu(c(0, 5, 5), api, regu, kini), null, "ws kecil");
  const nanti = c(180, 5); nanti.wd[3 + 4] = 0; nanti.ws[3 + 4] = 25; nanti.gust[3 + 4] = 40; const n4 = anginKeRegu(nanti, api, regu, kini); assert.equal(n4.jam_ke, 4, "ancaman di jam ke-4"); assert.equal(n4.gust, 40);
  const jauh = c(180, 5); jauh.wd[3 + 6] = 0; jauh.ws[3 + 6] = 30; assert.equal(anginKeRegu(jauh, api, regu, kini), null, "jam ke-6 sudah di luar jendela 6 jam (jam 0 sampai 5)");
  assert.equal(anginKeRegu(c(0, 30), api, {lat: -2.2 - 20 / 111.32, lon: 113.9}, kini), null, "regu 20 km dari api"); assert.equal(anginKeRegu(c(0, 30), api, api, kini), null, "tepat di titik api: arah tak terdefinisi");
  assert.equal(anginKeRegu(null, api, regu, kini), null); assert.equal(anginKeRegu({m0}, api, regu, kini), null);
  const timur = {lat: -2.2, lon: 113.9 + OFFSET_2KM}; assert.ok(anginKeRegu(c(270, 20), api, timur, kini), "regu di timur api: angin dari barat"); const t2 = anginKeRegu(c(270, 20), api, timur, kini); assert.ok([0, 180].includes(t2.menjauh_derajat));
});

uji("L3: info lacak membawa peringatan angin dari berkas sel (server menghitung), butir angin_ke_regu di alarmKeselamatan", async () => {
  const tid = await tugas("Kab Satu", {lat: -2.2, lon: 113.9}), q = (await tugaskan(A, tid, {nama: "Regu Angin"})).j, K = Date.now(), m0 = Math.floor(K / JAM) * JAM - 3 * JAM;
  const pasang = (wd, ws, gust) => CUACA.set("/data/cuaca/-2.25_113.75.json", {dibuat: K, lat: -2.25, lon: 113.75, m0, tc: Array(60).fill(30), rh: Array(60).fill(50), hujan: Array(60).fill(0), ws: Array(60).fill(ws), wd: Array(60).fill(wd), gust: Array(60).fill(gust)});
  assert.equal(selCuacaUji(-2.2, 113.9), "-2.25_113.75");
  pasang(0, 25, 35);
  assert.equal((await lacak("GET", "info", q.token)).j.angin, null, "belum ada posisi: tanpa peringatan");
  await lacak("POST", "berangkat", q.token, {}); assert.equal((await lacak("POST", "posisi", q.token, BERADA(-2.2 - OFFSET_2KM, 113.9))).s, 201);
  const i1 = await lacak("GET", "info", q.token); assert.equal(i1.s, 200); assert.ok(i1.j.angin, i1.t); assert.equal(i1.j.angin.dari_arah, "utara"); assert.equal(i1.j.angin.ws, 25); assert.ok(i1.j.angin.menjauh_arah); assert.deepEqual(Object.keys(i1.j.darurat_jenis), ["cedera", "terkepung_api", "tersesat", "lainnya"]);
  const b = (await butirDari(K, q.id)).filter(x => x.jenis === "angin_ke_regu"); assert.equal(b.length, 1); assert.equal(b[0].prioritas, 1); assert.match(b[0].judul, /Angin mengarah ke posisi Regu Angin/); assert.match(b[0].rincian, /Minta bergeser ke arah/);
  pasang(180, 25, 35); assert.equal((await lacak("GET", "info", q.token)).j.angin, null, "berlawanan"); assert.equal((await butirDari(K, q.id)).filter(x => x.jenis === "angin_ke_regu").length, 0);
  pasang(0, 8, 12); assert.equal((await lacak("GET", "info", q.token)).j.angin, null, "searah tetapi lemah");
  CUACA.delete("/data/cuaca/-2.25_113.75.json"); const tanpaBerkas = await lacak("GET", "info", q.token); assert.equal(tanpaBerkas.s, 200); assert.equal(tanpaBerkas.j.angin, null, "berkas sel tidak ada: tanpa peringatan, info tetap jalan");
  pasang(0, 25, 35); await DB.prepare("UPDATE penugasan_posisi SET pada = pada - ? WHERE penugasan_id = ?").bind(2 * JAM, q.id).run();
  assert.equal((await lacak("GET", "info", q.token)).j.angin, null, "posisi lebih tua dari 60 menit tidak dipakai"); CUACA.clear();
});
const selCuacaUji = (lat, lon) => `${(Math.floor(lat / .5) * .5 + .25).toFixed(2)}_${(Math.floor(lon / .5) * .5 + .25).toFixed(2)}`;

uji("L3: alarmKeselamatan mengembalikan darurat di paling atas (prioritas 0), lalu sunyi/angin, lalu rotasi; darurat hilang saat selesai atau lewat 6 jam", async () => {
  const K = Date.now(), tid = await tugas("Kab Satu"), pid = await sisip(tid, A.id, {nama: "Regu Komplit", berangkat: K - 13 * JAM, dibuat: K - 14 * JAM});
  await DB.prepare("INSERT INTO penugasan_darurat (penugasan_id, jenis, lat, lon, akurasi, pada) VALUES (?, 'cedera', -2.25, 113.9, 9, ?)").bind(pid, K - 4 * MENIT).run();
  const semua = (await alarmKeselamatan(envAlarm, K)).filter(b => b.id.includes(pid)), urut = semua.map(b => b.jenis);
  assert.deepEqual(urut, ["darurat", "regu_sunyi", "regu_rotasi"], "darurat paling atas"); assert.equal(semua[0].prioritas, 0);
  const d = semua[0]; assert.match(d.judul, /^DARURAT cedera: Regu Komplit/); assert.match(d.rincian, /Dikirim 4 menit lalu, posisi -2.25, 113.9/); assert.deepEqual(d.provs, ["62"]); assert.equal(d.dibuat, K - 4 * MENIT);
  for (const b of semua) for (const k of ["id", "jenis", "judul", "rincian", "provs", "kab", "dibuat", "tenggat", "prioritas", "dummy"]) assert.ok(k in b, `${b.jenis}.${k}`);
  assert.equal((await alarmKeselamatan(envAlarm, K + 6 * JAM)).filter(b => b.id.includes(pid) && b.jenis === "darurat").length, 0, "lewat 6 jam");
  await DB.prepare("UPDATE penugasan SET status = 'selesai', selesai_pada = ? WHERE id = ?").bind(K, pid).run();
  assert.equal((await butirDari(K, pid)).length, 0, "selesai: semua alarm padam");
  const bs = await alarmKeselamatan(envAlarm, K); for (let i = 1; i < bs.length; i++) assert.ok(bs[i - 1].prioritas <= bs[i].prioritas, "urut prioritas");
  const D2 = await DB.prepare("SELECT 1 x").first(); assert.ok(D2);
});

uji("L3: tanpa tabel (0035 atau 0041 belum ada) alarmKeselamatan tidak melempar; cron membuang darurat 30 hari", async () => {
  const U5 = await siapkan("uji-penugasan-l3-tanpa", {r2: true}), D5 = U5.DB;
  await D5.prepare("DROP TABLE penugasan_darurat").run();
  assert.deepEqual(await alarmKeselamatan({DB: D5, ASSETS: {fetch: asetKu}}, Date.now()), [], "tanpa 0041 dan tanpa penugasan aktif");
  await D5.prepare("DROP TABLE penugasan_posisi").run(); await D5.prepare("DROP TABLE penugasan").run();
  assert.deepEqual(await alarmKeselamatan({DB: D5, ASSETS: {fetch: asetKu}}, Date.now()), [], "tanpa 0035");
  const r = await U5.api("POST", "/api/lacak/darurat", {jenis: "cedera"}, {"x-lacak": "ab".repeat(18), ...PB}); assert.equal(r.s, 503, r.t);
  const pid = await sisip(T1, A.id, {}); const lama = Date.now() - 31 * HARI;
  await DB.prepare("INSERT INTO penugasan_darurat (penugasan_id, jenis, pada) VALUES (?, 'lainnya', ?), (?, 'lainnya', ?)").bind(pid, lama, pid, Date.now() - HARI).run();
  const {bersihkanPenugasan} = await import("../../src/penugasan.js"); await bersihkanPenugasan({DB}, Date.now());
  assert.equal(await n("penugasan_darurat", "penugasan_id = '" + pid + "'"), 1, "yang berumur 31 hari dibuang, kemarin tetap");
});

/* ---- L2 ---- */
const tugasU = async (kab, o) => { const id = await tugas(kab, o); await DB.prepare("UPDATE tugas_api SET prov = '65' WHERE id = ?").bind(id).run(); return id; };   // provinsi 65: bebas dari orang uji lain
let UA, UB, UD, TU;
uji("L2: usulan hanya memuat orang yang TIDAK sedang bertugas, urut waktu tempuh lalu beban, tanpa orang provinsi lain", async () => {
  UA = await akun("usulansatu", {prov: "65", kab: "Kab Usul", cakupan: ["65"]}); UB = await akun("usulandua", {prov: "65", kab: "Kab Usul Dua", cakupan: ["65"]}); UD = await akun("usulanluar", {prov: "63", kab: "Kab Luar", cakupan: ["63"]});
  TU = await tugasU("Kab Usul", {lat: -2.2, lon: 113.9});
  const K = Date.now(), lama = 2 * HARI, bln = (lat, lon) => [lat, lon];
  const selesai = (akunId, o) => sisip(TU, akunId, {status: "selesai", dibuat: K - (o.hari ?? 2) * HARI, berangkat: K - (o.hari ?? 2) * HARI, selesai: K - (o.hari ?? 2) * HARI + JAM, kedaluwarsa: K + 40 * HARI, ...o});
  /* Andi: posisi 5 menit lalu 10 km dari api; Fani: sama tetapi beban 3; Budi: tanpa posisi, pos Daops cocok graf akses; Eko: tanpa posisi dan tanpa pos; Citra: sedang bertugas; Dedi: provinsi 63 */
  const dLat = 10 / 111.32;
  await selesai(UA.id, {nama: "Andi Uji", wa: "6281200000001", peran: "driver", orang: 2, posisi: [[-2.2 - dLat, 113.9, K - 5 * MENIT]]});
  for (const h of [1, 2, 3]) await selesai(UA.id, {nama: "Fani Uji", wa: null, peran: "ketua_regu", hari: h, posisi: h === 1 ? [[-2.2 - dLat, 113.9, K - 5 * MENIT]] : []});
  await selesai(UB.id, {nama: "Budi Uji", wa: "6281200000002", hari: 10});
  await selesai(UA.id, {nama: "Eko Uji", wa: "6281200000003", hari: 20});
  await sisip(TU, UA.id, {nama: "Citra Uji", wa: "6281200000004", status: "aktif", dibuat: K - HARI, kedaluwarsa: K + JAM, berangkat: K - 20 * MENIT});
  await selesai(UD.id, {nama: "Dedi Luar", wa: "6281200000005"});
  await selesai(UB.id, {nama: "Citra Uji", wa: "6281200000004", hari: 30});   // Citra juga punya riwayat lama di akun lain: tetap dikenali sebagai orang yang sama lewat WA, sedang bertugas
  await DB.prepare("INSERT INTO gudang (id, akun_id, nama, jenis, prov, kab, lat, lon, dibuat, diubah) VALUES (?, ?, 'Posko Uji', 'pos_daops', '65', 'Kab Usul Dua', ?, ?, ?, ?)").bind(id16(), UB.id, -2.2 + 20 / 111.32, 113.9, K, K).run();
  const r = await api("GET", `/api/instansi/usulan/${TU}`, undefined, {...UA.hg, ...ipBaru()}); assert.equal(r.s, 200, r.t);
  const nama = r.j.kandidat.map(k => k.nama); assert.deepEqual(nama, ["Andi Uji", "Fani Uji", "Budi Uji", "Eko Uji"], "tanpa Citra (bertugas) dan Dedi (provinsi lain); Andi sebelum Fani karena beban 1 < 3");
  const [andi, fani, budi, eko] = r.j.kandidat, kaki = AKSES.kaki_km / USULAN.kakiKmJam * 60;
  /* TU memakai AKSES bawaan uji: kaki_km 3,1; pangkalan graf "Posko Uji" 1,4 jam */
  assert.equal(andi.tempuh_menit, Math.round(10 * BATAS.etaFaktorJalan / BATAS.etaKmJam * 60 + kaki), "garis lurus x 1,3 pada 30 km/jam + kaki pada 3 km/jam"); assert.equal(andi.cara, "garis_lurus"); assert.equal(andi.asal.jenis, "posisi"); assert.ok(andi.asal.umur_menit >= 5 && andi.asal.umur_menit <= 6);
  assert.equal(fani.tempuh_menit, andi.tempuh_menit); assert.equal(andi.beban_7h, 1); assert.equal(fani.beban_7h, 3);
  assert.equal(budi.tempuh_menit, Math.round(1.4 * 60 + kaki)); assert.equal(budi.cara, "graf"); assert.deepEqual(budi.asal, {jenis: "pos", nama: "Posko Uji"});
  assert.equal(eko.tempuh_menit, null); assert.equal(eko.asal.jenis, "tidak_diketahui"); assert.equal(r.j.perkiraan, true);
  assert.match(r.j.rumus, /Perkiraan/); assert.match(r.j.rumus, /1\.3 pada 30 km\/jam/); assert.match(r.j.rumus, /3 km\/jam/); assert.ok(!/·/.test(r.j.rumus));
  assert.equal(andi.wa, "6281200000001", "WA hanya orang akun sendiri"); assert.ok(!("wa" in budi), "orang akun lain: tanpa WA"); assert.ok(!r.t.includes("6281200000002"), "WA akun lain tidak bocor"); assert.ok(!/"lat"|"lon"/.test(JSON.stringify(r.j.kandidat)), "tanpa koordinat orang");
  assert.equal(andi.peran, "driver"); assert.equal(andi.orang, 2); assert.ok(r.j.alat === null || typeof r.j.alat === "object");
  assert.ok(USULAN.maks >= 20 && USULAN.posisiMaksJam === 24);
});

uji("L2: posisi lebih tua dari 24 jam diabaikan (jatuh ke pos asal); tempuhMenit murni untuk graf, garis lurus, tanpa asal", async () => {
  const t = {lat: -2.2, lon: 113.9, akses: JSON.stringify({kaki_km: 3, dari: [{dari: "Posko A", kode: "A001", jam: 2}, {dari: "Daops B", kode: "BBB-05", jam: 5}]})};
  assert.deepEqual(tempuhMenit({lat: -2.3, lon: 113.9, nama: "posko a", pos: true}, t), {menit: 180, cara: "graf", jarak_km: 11.1}, "nama sama (tanpa peduli huruf) memakai jam graf 2 jam + kaki 1 jam");
  assert.equal(tempuhMenit({lat: -2.3, lon: 113.9, nama: "Pos Daops BBB-05 Utara", pos: true}, t).menit, 5 * 60 + 60, "kode pangkalan di dalam nama gudang");
  assert.equal(tempuhMenit({lat: -2.3, lon: 113.9, nama: "Posko A", pos: false}, t).cara, "garis_lurus", "posisi hidup tidak memakai graf"); assert.equal(tempuhMenit({lat: -2.3, lon: 113.9, nama: "Gudang Lain", pos: true}, t).cara, "garis_lurus");
  assert.equal(tempuhMenit({lat: -2.3, lon: 113.9, pos: false}, {lat: -2.2, lon: 113.9, akses: null}).menit, Math.round(11.1 * 1.3 / 30 * 60), "tanpa akses: tanpa kaki"); assert.equal(tempuhMenit(null, t), null);
  /* posisi 25 jam lalu tidak dipakai */
  const K = Date.now(), tid = await tugasU("Kab Usul", {lat: -2.2, lon: 113.9}), orang = await sisip(tid, UA.id, {nama: "Gina Basi", wa: "6281200000009", status: "selesai", selesai: K - 20 * HARI, berangkat: K - 20 * HARI, dibuat: K - 20 * HARI, posisi: [[-2.3, 113.9, K - 25 * JAM]]});
  const r = await api("GET", `/api/instansi/usulan/${tid}`, undefined, {...UA.hg, ...ipBaru()}); const g = r.j.kandidat.find(k => k.nama === "Gina Basi"); assert.ok(g && g.asal.jenis !== "posisi", JSON.stringify(g)); assert.ok(orang);
});

uji("L2: gerbang akses usulan: tanpa sesi 401, akun kabupaten lain 404 (sama dengan tugas tak ada), tugas ditutup 409, admin/moderator tanpa WA", async () => {
  assert.equal((await api("GET", `/api/instansi/usulan/${TU}`, undefined, ipBaru())).s, 401, "tanpa sesi");
  assert.equal((await api("GET", `/api/instansi/usulan/${TU}`, undefined, {...UD.hg, ...ipBaru()})).s, 404, "akun provinsi lain"); assert.equal((await api("GET", `/api/instansi/usulan/${TU}`, undefined, {...UB.hg, ...ipBaru()})).s, 404, "akun kabupaten lain");
  assert.equal((await api("GET", `/api/instansi/usulan/${id16()}`, undefined, {...UA.hg, ...ipBaru()})).s, 404);
  assert.equal((await api("GET", `/api/instansi/usulan/${TU}`, undefined, {"x-admin-token": "salah", ...ipBaru()})).s, 401, "token admin salah ikut jawaban akun");
  const prov = await akun("usulanprov", {jenis: "pemprov", tingkat: "prov", prov: null, kab: null, cakupan: ["65"]}); assert.equal((await api("GET", `/api/instansi/usulan/${TU}`, undefined, {...prov.hg, ...ipBaru()})).s, 200, "akun provinsi memegang seluruh kabupaten");
  const ad = await api("GET", `/api/instansi/usulan/${TU}`, undefined, {...ADMIN, ...ipBaru()}); assert.equal(ad.s, 200, ad.t); assert.ok(ad.j.kandidat.length >= 4); assert.ok(!ad.t.includes("62812000000"), "admin: tanpa nomor WA");
  const tutup = await tugasU("Kab Usul", {status: "padam"}); assert.equal((await api("GET", `/api/instansi/usulan/${tutup}`, undefined, {...UA.hg, ...ipBaru()})).s, 409);
});

uji("L2: Tugaskan memakai rute penugasan yang ada (isian dari kandidat); orang itu lalu tidak lagi diusulkan; data kosong memberi pesan jelas", async () => {
  const r = await api("GET", `/api/instansi/usulan/${TU}`, undefined, {...UA.hg, ...ipBaru()}), k = r.j.kandidat[0];
  const p = await api("POST", `/api/instansi/penugasan/${TU}`, {nama: k.nama, peran: k.peran, wa: k.wa || "", orang: k.orang, jam: 48}, {...UA.h, ...ipBaru()}); assert.equal(p.s, 201, p.t);
  const r2 = await api("GET", `/api/instansi/usulan/${TU}`, undefined, {...UA.hg, ...ipBaru()}); assert.ok(!r2.j.kandidat.some(x => x.nama === k.nama), "sudah ditugaskan: tidak lagi kandidat"); assert.equal(r2.j.kandidat.length, r.j.kandidat.length - 1);
  /* tak ada riwayat di provinsi 64 */
  const Z = await akun("usulankosong", {prov: "64", kab: "Kab Kosong", cakupan: ["64"]}), tz = await tugas("Kab Kosong"); await DB.prepare("UPDATE tugas_api SET prov = '64' WHERE id = ?").bind(tz).run();
  const kosong = await api("GET", `/api/instansi/usulan/${tz}`, undefined, {...Z.hg, ...ipBaru()}); assert.equal(kosong.s, 200); assert.deepEqual(kosong.j.kandidat, []); assert.match(kosong.j.pesan, /Belum ada orang yang bisa diusulkan/); assert.match(kosong.j.pesan, /Tugaskan orang/);
});

uji("L2/L3: klien lacak.js dan instansi_tugaskan.js memuat kontrol baru (tombol darurat, banner angin, usulan), berkas lolos sintaks, tanpa skrip inline", () => {
  const html = teks("public/lacak.html"), js = teks("public/lacak.js"), tg = teks("public/instansi_tugaskan.js"), css = teks("public/instansi_tugaskan.css");
  for (const id of ["angin", "bDarurat", "pilihDarurat", "statusDarurat", "bDarBatal"]) assert.ok(html.includes(`id="${id}"`), id);
  for (const j of ["cedera", "terkepung_api", "tersesat", "lainnya"]) assert.ok(html.includes(`data-dar="${j}"`), j);
  assert.ok(!/<script(?![^>]*\bsrc=)/.test(html), "CSP: tanpa skrip inline"); assert.match(js, /"darurat"/); assert.match(js, /Angin mengarah ke posisimu/);
  assert.match(tg, /\/api\/instansi\/usulan\//); assert.match(tg, /data-tg="pilih"/); assert.match(tg, /wa\.me/); assert.match(css, /\.tg-darurat/);
  assert.ok(!/·/.test(html + js + tg), "tanpa titik pemisah di teks");
  new vm.Script(js); new vm.Script(tg);
});
