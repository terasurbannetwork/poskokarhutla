/* Satu siklus api karhutla dari ujung ke ujung lewat jalur nyata worker, lalu angka SLA-nya:
   cron membuat tugas dari tugas_kompleks.json -> akun pemkab (dibuat massal, verifikasi, disetujui admin, ganti sandi) melihatnya, akun kabupaten lain tidak
   -> konfirmasi -> kabar tindakan -> laporan padam -> cron memverifikasi padam (titik panas FIRMS disuntik) -> GET /api/sla.
   Jam: cron memakai scheduledTime (jam tiruan yang dimajukan); route instansi memakai Date.now() asli, jadi tahap yang dilewati rute diukur terhadap kolom D1 yang ditulisnya.
   Jalankan: node --test --test-concurrency=1 tests/warga/siklus_insiden.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR, JPEG_SAH, WEBP_SAH, badanPanjang} from "./_bantu.mjs";
import "../../src/worker.js";   // worker dulu: instansi.js dan worker.js saling impor
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";

const MENIT = 60e3, JAM = 3600e3;
const uji = berantai();
let KOMPLEKS = null;
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/tugas_kompleks.json") return KOMPLEKS ? Response.json(KOMPLEKS) : new Response("tidak ada", {status: 404});
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const U = await siapkan("uji-siklus", {r2: true, asetKu: aset}), {mf, DB, api} = U;
const W = await mf.getWorker();
const cron = ms => W.scheduled({cron: "* * * * *", scheduledTime: ms});
const menit = (jamMs, m) => { const d = new Date(jamMs); d.setUTCMinutes(m, 0, 0); return d.getTime(); };   // menit yang tidak punya tugas cron lain (bukan 15-18, 23, >= 25)

/* rute instansi persis seperti layar /instansi: header anti-CSRF x-pb pada POST */
const PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
let ipN = 0;
const ins = async (metode, j, body, h = {}) => {
  const f = body instanceof FormData;
  if (f) { const b = await badanPanjang(body, h); return tutup(await mf.dispatchFetch("http://instansi.lokal" + j, {method: metode, headers: {...PB, ...b.headers}, body: b.body})); }
  return tutup(await mf.dispatchFetch("http://instansi.lokal" + j, {method: metode, headers: {...(metode === "POST" ? PB : {}), ...(body !== undefined ? {"content-type": "application/json"} : {}), ...h}, body: body === undefined ? undefined : JSON.stringify(body)}));
};
const tutup = async r => { const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {} return {s: r.status, j: x, t, sc: r.headers.getSetCookie?.() ?? []}; };
const kuki = r => ({cookie: r.sc.map(c => c.split(";")[0]).join("; ")});
const SANDI = new Map();
const masuk = async u => { const r = await ins("POST", "/api/instansi/masuk", {username: u, sandi: SANDI.get(u)}, {"cf-connecting-ip": `198.51.100.${++ipN}`}); assert.equal(r.s, 200, r.t); return kuki(r); };
const adm = (metode, j, body) => api(metode, j, body, ADMIN);

/* akun lewat rute admin sungguhan, halaman demi halaman sampai kedua akun uji terbuat */
const buatAkun = async (...nama) => {
  for (let mulai = 0; mulai != null && !nama.every(u => SANDI.has(u));) {
    const r = await adm("POST", "/api/instansi/admin/buat", {mulai, batas: 200}); assert.equal(r.s, 200, r.t);
    for (const a of r.j.dibuat) SANDI.set(a.username, a.sandi); mulai = r.j.berikut;
  }
  for (const u of nama) assert.ok(SANDI.has(u), `akun ${u} tidak terbentuk oleh /api/instansi/admin/buat`);
};
const VERIF = {nama: "Budi Santoso", nip: "198001012005011001", pangkat: "Pembina IV/a", jabatan: "Kepala Pelaksana BPBD", unit: "BPBD Kabupaten", email: "budi@seruyankab.go.id", wa: "081234567890", telepon_kantor: "0536 3001234"};
/* jalur aktivasi penuh: masuk, surat + kartu, verifikasi, admin setuju, ganti sandi */
const aktifkan = async u => {
  let h = await masuk(u);
  assert.equal((await ins("GET", "/api/instansi/tugas", undefined, h)).s, 403, `${u} belum aktif tidak boleh melihat tugas`);
  const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n"), mentah = async (j, b) => (await mf.dispatchFetch("http://instansi.lokal" + j, {method: "POST", headers: {...PB, ...h, "content-length": String(b.length)}, body: b}));
  const pdf = await mentah("/api/instansi/surat", PDF); assert.equal(pdf.status, 200, await pdf.text());
  const kartu = await mentah("/api/instansi/kartu", JPEG_SAH); assert.equal(kartu.status, 200, await kartu.text());
  assert.equal((await ins("POST", "/api/instansi/verifikasi", VERIF, h)).s, 201);
  const q = (await adm("GET", "/api/instansi/admin/antrean")).j.akun.find(x => x.username === u); assert.ok(q, `${u} ada di antrean admin`);
  assert.equal((await adm("POST", `/api/instansi/admin/akun/${q.id}`, {aksi: "setuju", dikirim: q.dikirim})).s, 200);
  const g = await ins("POST", "/api/instansi/gantisandi", {}, h); assert.equal(g.s, 200, g.t); SANDI.set(u, g.j.sandi);
  h = await masuk(u); assert.equal((await ins("GET", "/api/instansi/tugas", undefined, h)).s, 200, `${u} aktif melihat daftar tugas`);
  return h;
};
/* media bergeotag di titik tugas, lewat /api/instansi/media */
const foto = async (h, tid, lat, lon) => {
  const t = Date.now(), f = new FormData();
  f.append("tugas_id", tid); f.append("media", new File([JPEG_SAH], "a.bin")); f.append("thumb", new File([WEBP_SAH], "t.bin"));
  for (const [k, v] of Object.entries({lat, lon, akurasi: 12, waktu_gps: t})) f.append(k, String(v));
  f.append("sampel", JSON.stringify([[lat + 0.00001, lon, 10, t - 2000], [lat + 0.00002, lon + 0.00001, 11, t - 1000], [lat, lon, 12, t]]));
  const r = await ins("POST", "/api/instansi/media", f, h); assert.equal(r.s, 201, r.t); return r.j.id;
};

const LAT = -2.55, LON = 112.0, KAB = "Seruyan";
const T0 = menit(Date.now() - 3 * JAM - 7 * MENIT, 7), AWAL = T0 - 40 * MENIT;   // tugas dibuat 3 sampai 4 jam lalu (menit 7 terakhir sebelum jam itu, di menit berapa pun uji jalan); satelit mendeteksi insiden 40 menit sebelum tugas
const INSIDEN = "62-261022-101";
let tid, hSeruyan, hKatingan, kini2;
let K = {};

uji("cron: tugas_kompleks.json level 3 otomatis membuat satu tugas dengan kunci insiden, front, dan terdeteksi awal", async () => {
  KOMPLEKS = {dibuat: new Date(T0 - 5 * MENIT).toISOString(), kompleks: [{id: "K-uji", lat: LAT, lon: LON, prov: "62", kab: KAB, kec: "Seruyan Hilir", level: 3, n24: 9, jam_sejak: 1, luas: 40, otomatis: true,
    insiden: INSIDEN, front: {lat: LAT, lon: LON, waktu: new Date(T0).toISOString(), sensor: "VIIRS", radius_m: 375}, insiden_awal_ms: AWAL, konsesi: []}]};
  const o = await cron(T0); assert.equal(o.outcome, "ok");
  const t = (await DB.prepare("SELECT * FROM tugas_api").all()).results; assert.equal(t.length, 1, "satu kompleks = satu tugas");
  const x = t[0]; tid = x.id;
  assert.equal(x.status, "buka"); assert.equal(x.prov, "62"); assert.equal(x.kab, KAB); assert.equal(x.level, 3); assert.equal(x.dibuat, T0, "dibuat = jam tiruan cron");
  assert.equal(x.terdeteksi_awal, AWAL, "jam deteksi pertama dari kontrak insiden_awal_ms"); assert.equal(x.sumber_awal, "viirs");
  assert.deepEqual([x.lat, x.lon], [LAT, LON], "lokasi = front");
  const k = await DB.prepare("SELECT insiden, kartu FROM tugas_kartu WHERE tugas_id = ?").bind(tid).first(); assert.equal(k.insiden, INSIDEN); assert.equal(JSON.parse(k.kartu).front.sensor, "VIIRS");
});

uji("akun pemkab Seruyan aktif lewat jalur penuh melihat tugas itu; akun Katingan tidak melihatnya dan tidak bisa membukanya", async () => {
  await buatAkun("pemkabseruyan", "pemkabkatingan");
  hSeruyan = await aktifkan("pemkabseruyan"); hKatingan = await aktifkan("pemkabkatingan");
  const dari = await ins("GET", "/api/instansi/tugas", undefined, hSeruyan), t = dari.j.tugas.find(x => x.id === tid);
  assert.ok(t, `tugas ${tid} ada di daftar Seruyan: ${dari.t.slice(0, 300)}`); assert.equal(t.kab, KAB); assert.equal(t.status ?? "buka", "buka"); assert.equal(t.dibuat, T0);
  const rinci = await ins("GET", `/api/instansi/tugas/${tid}`, undefined, hSeruyan); assert.equal(rinci.s, 200); assert.equal(rinci.j.tugas.kartu.insiden, INSIDEN, "kartu insiden ikut ke layar");
  const lain = await ins("GET", "/api/instansi/tugas", undefined, hKatingan); assert.equal(lain.s, 200); assert.ok(!lain.j.tugas.some(x => x.id === tid), "Katingan tidak melihat tugas Seruyan");
  assert.equal((await ins("GET", `/api/instansi/tugas/${tid}`, undefined, hKatingan)).s, 404, "rincian tugas kabupaten lain 404");
  assert.equal((await ins("POST", `/api/instansi/konfirmasi/${tid}`, {klien_id: "k-lain-1", hasil: "api_ada", pic_nama: "Pak X", pic_jabatan: "Kades", pic_wa: "0812 1111 2222", media: []}, hKatingan)).s, 404, "Katingan tidak bisa mengonfirmasi");
});

uji("konfirmasi (PIC + media sah) lalu kabar tindakan; konfirmasi tanpa PIC atau media ditolak", async () => {
  const m1 = await foto(hSeruyan, tid, LAT, LON), KONF = (o = {}) => ({klien_id: "k-siklus-1", hasil: "api_ada", pic_nama: "Pak Joko", pic_jabatan: "Kepala Desa", pic_wa: "0812 1111 2222", lahan_teramati: "mineral", media: [m1], ...o});
  assert.equal((await ins("POST", `/api/instansi/konfirmasi/${tid}`, KONF({media: []}), hSeruyan)).s, 400, "tanpa media");
  assert.equal((await ins("POST", `/api/instansi/konfirmasi/${tid}`, KONF({pic_nama: undefined}), hSeruyan)).s, 400, "tanpa PIC");
  const k = await ins("POST", `/api/instansi/konfirmasi/${tid}`, KONF(), hSeruyan); assert.equal(k.s, 201, k.t);
  let t = await DB.prepare("SELECT status, konfirmasi_pada FROM tugas_api WHERE id = ?").bind(tid).first(); assert.equal(t.status, "buka"); assert.ok(t.konfirmasi_pada >= T0 && t.konfirmasi_pada <= Date.now());
  assert.equal((await DB.prepare("SELECT pic_nama FROM tugas_isian WHERE id = ?").bind(k.j.id).first()).pic_nama, "Pak Joko");
  const kabar = await ins("POST", `/api/instansi/kabar/${tid}`, {klien_id: "k-siklus-2", tindakan: "Pemadaman darat dengan pompa", status_api: "bara", kendala: [], bantuan: [], media: [await foto(hSeruyan, tid, LAT, LON)]}, hSeruyan);
  assert.equal(kabar.s, 201, kabar.t); assert.equal(kabar.j.status, "buka", "bara: tugas tetap buka");
  t = await DB.prepare("SELECT status, isian_terakhir FROM tugas_api WHERE id = ?").bind(tid).first(); assert.equal(t.status, "buka"); assert.ok(t.isian_terakhir);
});

uji("laporan padam wajib foto lokasi, lalu tugas padam_dilaporkan dan tampil begitu di layar", async () => {
  const tanpa = await ins("POST", `/api/instansi/kabar/${tid}`, {klien_id: "k-siklus-3", tindakan: "Api padam", status_api: "padam", kendala: [], bantuan: [], media: []}, hSeruyan); assert.equal(tanpa.s, 400, "padam tanpa foto ditolak");
  const r = await ins("POST", `/api/instansi/kabar/${tid}`, {klien_id: "k-siklus-4", tindakan: "Api padam", status_api: "padam", kendala: [], bantuan: [], media: [await foto(hSeruyan, tid, LAT, LON)]}, hSeruyan);
  assert.equal(r.s, 201, r.t); assert.equal(r.j.status, "padam");
  const t = await DB.prepare("SELECT status, padam_verif, padam_pada FROM tugas_api WHERE id = ?").bind(tid).first();
  assert.deepEqual([t.status, t.padam_verif], ["padam", "padam_dilaporkan"]); assert.ok(t.padam_pada >= T0);
  const rinci = (await ins("GET", `/api/instansi/tugas/${tid}`, undefined, hSeruyan)).j.tugas; assert.equal(rinci.padam.status, "padam_dilaporkan"); assert.match(rinci.padam.label, /Padam dilaporkan/);
  K = await DB.prepare("SELECT dibuat, terdeteksi_awal, konfirmasi_pada, padam_pada, (SELECT min(dibuat) FROM tugas_isian WHERE tugas_id = t.id AND langkah = 'tindakan') kabar FROM tugas_api t WHERE id = ?").bind(tid).first();
  assert.ok(K.dibuat <= K.konfirmasi_pada && K.konfirmasi_pada <= K.kabar && K.kabar <= K.padam_pada, "urutan jam konfirmasi, kabar, padam");
});

uji("verifikasi padam lewat cron: 25 jam tanpa titik panas belum terverifikasi; 50 jam dengan putaran FIRMS yang mencakup 48 jam = padam_terverifikasi", async () => {
  const titik = (dibuat, baris) => DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(dibuat, JSON.stringify({kolom: ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib"], acuan: new Date(dibuat).toISOString(), dibuat: new Date(dibuat).toISOString(), wilayah: [], sensor_utama: ["N"], galat: [], baris})).run();
  const kini1 = menit(K.padam_pada + 25 * JAM, 9); await titik(kini1 - 30 * MENIT, []);
  assert.equal((await cron(kini1)).outcome, "ok");
  let t = await DB.prepare("SELECT status, padam_verif FROM tugas_api WHERE id = ?").bind(tid).first(); assert.deepEqual([t.status, t.padam_verif], ["padam", "padam_dilaporkan"], "25 jam: belum 48 jam");
  kini2 = menit(K.padam_pada + 50 * JAM, 9); assert.ok(kini2 - 30 * MENIT >= K.padam_pada + 48 * JAM, "putaran titik mencakup 48 jam sejak padam");
  await titik(kini2 - 30 * MENIT, []);   // putaran terbaru mencakup 48 jam penuh, tidak ada titik dalam 2 km
  KOMPLEKS = {dibuat: new Date(kini2 - 5 * MENIT).toISOString(), kompleks: []};   // versi baru berkas: cron memproses (dan memverifikasi padam) di menit mana pun
  assert.equal((await cron(kini2)).outcome, "ok");
  t = await DB.prepare("SELECT status, padam_verif, verif_pada FROM tugas_api WHERE id = ?").bind(tid).first();
  assert.deepEqual([t.status, t.padam_verif], ["padam", "padam_terverifikasi"], "tidak ada titik panas baru 48 jam: terverifikasi"); assert.equal(t.verif_pada, kini2, "verif_pada = jam cron");
  assert.equal((await DB.prepare("SELECT count(*) n FROM tugas_api").first()).n, 1, "tidak ada tugas baru dari versi kosong");
  const rinci = (await ins("GET", `/api/instansi/tugas/${tid}`, undefined, hSeruyan)).j.tugas; assert.equal(rinci.padam.status, "padam_terverifikasi"); assert.match(rinci.padam.label, /tidak terdeteksi satelit 48 jam/);
});

uji("GET /api/sla: durasi tiap tahap siklus ini cocok dengan jam yang dimajukan", async () => {
  assert.equal((await api("GET", "/api/sla?prov=62&kab=Seruyan")).s, 403, "tanpa masuk");
  const r = await adm("GET", "/api/sla?prov=62&kab=Seruyan&hari=30"); assert.equal(r.s, 200, r.t);
  const T = Object.fromEntries(r.j.tahap.map(t => [`${t.dari}_${t.ke}`, t])), mnt = ms => Math.round(ms / MENIT);
  assert.equal(T.deteksi_tugas.n, 1); assert.equal(T.deteksi_tugas.p50_menit, 40, "satelit mendeteksi 40 menit sebelum tugas dibuat");
  assert.equal(T.tugas_konfirmasi.n, 1); assert.equal(T.tugas_konfirmasi.p50_menit, mnt(K.konfirmasi_pada - T0)); assert.ok(T.tugas_konfirmasi.p50_menit >= 180 && T.tugas_konfirmasi.p50_menit <= 245, `tugas dibuat 3 sampai 4 jam lalu (dibulatkan ke menit 7): ${T.tugas_konfirmasi.p50_menit} menit`);
  assert.equal(T.tugas_konfirmasi.dalam_target_pct, 100, "180 menit dalam target 360");
  assert.equal(T.konfirmasi_kabar.n, 1); assert.equal(T.konfirmasi_kabar.p50_menit, mnt(K.kabar - K.konfirmasi_pada)); assert.equal(T.konfirmasi_kabar.dalam_target_pct, 100);
  assert.equal(T.konfirmasi_tiba.n, 0, "tanpa penugasan regu: tahap tiba kosong, bukan nol"); assert.strictEqual(T.konfirmasi_tiba.p50_menit, null);
  assert.equal(T.padam_terverifikasi.n, 1); assert.equal(T.padam_terverifikasi.p50_menit, mnt(kini2 - K.padam_pada)); assert.ok(T.padam_terverifikasi.p50_menit >= 48 * 60 && T.padam_terverifikasi.p50_menit <= 50 * 60 + 9, `padam ke terverifikasi ${T.padam_terverifikasi.p50_menit} menit`);
  const P = Object.fromEntries(r.j.proses.map(p => [p.tahap, p.n])); assert.deepEqual([P.deteksi, P.tugas, P.konfirmasi, P.padam, P.terverifikasi, P.muncul_lagi], [1, 1, 1, 1, 1, 0]);
  const w = r.j.wilayah.find(x => x.nama === "Seruyan" || x.kode === "Seruyan" || x.kode === "62"); assert.ok(w, JSON.stringify(r.j.wilayah)); assert.equal(w.n, 1);
  assert.equal(r.j.lapangan.n.padam, 1); assert.equal(r.j.lapangan.padam_terverifikasi_pct, 100);
  const lain = await adm("GET", "/api/sla?prov=62&kab=Katingan"); assert.ok(lain.j.tahap.every(t => t.n === 0), "kabupaten lain tidak ikut terhitung");
});
