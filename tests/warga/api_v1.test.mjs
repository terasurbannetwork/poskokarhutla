/* API terbuka v1 (src/api_v1.js, migrations/0040_kunci_api.sql): data publik tanpa kunci, data berkunci dengan X-API-Key bercakupan, penerbitan oleh admin.
   Worker utuh di workerd + D1 + R2 sungguhan (TEST.md: tanpa mock). Jalankan: node --test tests/warga/api_v1.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {siapkan, berantai, ADMIN, GERBANG_ORANG, sha256} from "./_bnpb.mjs";
import {AKAR, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // dulu: worker.js dan api_v1.js saling impor (pola semua modul rute)
import {CAKUPAN, DATA} from "../../src/api_v1.js";

const uji = berantai();
const U = await siapkan("uji-api-v1", {r2: true});
const {DB, api, n, mf} = U;
const R2 = await mf.getR2Bucket("MEDIA");
const SQL = readFileSync(path.join(AKAR, "migrations/0040_kunci_api.sql"), "utf8"), SQL54 = readFileSync(path.join(AKAR, "migrations/0054_kunci_api_konsesi.sql"), "utf8");
const K = k => ({"x-api-key": k});
let ipN = 0;
const ip = () => ({"cf-connecting-ip": `203.0.113.${++ipN % 250}`});
const terbit = async (nama, cakupan) => { const r = await api("POST", "/api/kunci-api/admin/buat", {nama, cakupan}, ADMIN); assert.equal(r.s, 201, r.t); return r.j; };
const tunggu = ms => new Promise(r => setTimeout(r, ms));
let semua, hanyaRumah, hanyaBangunan;

uji("migrasi 0040 idempoten; trigger dan CHECK menolak cakupan, nama, dan hash yang salah", async () => {
  await DB.batch(pecah(SQL).map(s => DB.prepare(s)));
  const sisip = (cakupan, nama = "Mitra Uji", kunciSha = "a".repeat(64)) => DB.prepare("INSERT INTO kunci_api (id, nama, kunci_sha, cakupan, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?)")
    .bind("f".repeat(16), nama, kunciSha, cakupan, Date.now(), "moderator1").run();
  await assert.rejects(sisip('["rumah_rusak","admin"]'), /cakupan kunci api tidak sah/);
  await assert.rejects(sisip('["bangunan","bangunan"]'), /cakupan kunci api tidak sah/);
  await assert.rejects(sisip("[]"), /CHECK/);
  await assert.rejects(sisip('["bangunan"]', "ab"), /CHECK/);
  await assert.rejects(sisip('["bangunan"]', "Mitra Uji", "XYZ"), /CHECK/);
  assert.equal(await n("kunci_api"), 0);
  const diTrigger = SQL54.match(/NOT IN \(([^)]+)\)/)[1].split(",").map(x => x.trim().replace(/'/g, ""));
  assert.deepEqual(diTrigger, CAKUPAN, "cakupan di trigger (0054) sama dengan CAKUPAN di src/api_v1.js");
});

uji("migrasi 0054 idempoten; kunci lama selamat, cakupan asing ditolak, 'konsesi' sah, maksimal 4 cakupan", async () => {
  const sisip = (id, cakupan) => DB.prepare("INSERT INTO kunci_api (id, nama, kunci_sha, cakupan, dibuat, oleh) VALUES (?, 'Mitra Lama', ?, ?, 1, 'moderator1')").bind(id.repeat(16), id.repeat(64), cakupan).run();
  await sisip("c", '["bangunan","laporan_bnpb"]');
  for (let i = 0; i < 2; i++) await DB.batch(pecah(SQL54).map(s => DB.prepare(s)));
  const b = await DB.prepare("SELECT * FROM kunci_api WHERE id = ?").bind("c".repeat(16)).first(); assert.equal(b.cakupan, '["bangunan","laporan_bnpb"]'); assert.equal(b.kunci_sha, "c".repeat(64));
  await sisip("d", '["rumah_rusak","bangunan","laporan_bnpb","konsesi"]');
  await assert.rejects(sisip("e", '["rumah_rusak","bangunan","laporan_bnpb","konsesi","x"]'), /CHECK|tidak sah/);
  await assert.rejects(sisip("e", '["konsesi","admin"]'), /cakupan kunci api tidak sah/);
  await assert.rejects(sisip("e", '["konsesi","konsesi"]'), /cakupan kunci api tidak sah/);
  await assert.rejects(DB.prepare("UPDATE kunci_api SET cakupan = '[\"admin\"]' WHERE id = ?").bind("c".repeat(16)).run(), /cakupan kunci api tidak sah/);
  assert.equal(await n("kunci_api"), 2); await DB.prepare("DELETE FROM kunci_api").run();
  assert.equal(await n("sqlite_master", "name = 'kunci_api_baru'"), 0, "tabel sementara sudah berganti nama");
});

uji("preflight OPTIONS 204 dengan CORS, tanpa Allow-Credentials, di semua jalur /api/v1", async () => {
  for (const j of ["/api/v1", "/api/v1/data/meta", "/api/v1/rumah-rusak", "/api/v1/apa-saja"]) {
    const r = await api("OPTIONS", j, undefined, {origin: "https://mitra.example", "access-control-request-headers": "x-api-key"});
    assert.equal(r.s, 204, j); assert.equal(r.h.get("access-control-allow-origin"), "*"); assert.equal(r.h.get("access-control-allow-headers"), "X-API-Key");
    assert.equal(r.h.get("access-control-allow-methods"), "GET, OPTIONS"); assert.equal(r.h.get("access-control-allow-credentials"), null);
  }
});

uji("data publik: tiap nama dalam daftar putih 200 tanpa kunci, isinya berkas aset, dengan CORS dan cache publik", async () => {
  for (const [nama, jalur] of Object.entries(DATA)) {
    const r = await api("GET", "/api/v1/data/" + nama);
    assert.equal(r.s, 200, `${nama} (${jalur}) harus ada di public/`); assert.ok(r.j && typeof r.j === "object", `${nama} JSON sah`);
    assert.equal(r.h.get("access-control-allow-origin"), "*", nama); assert.match(r.h.get("cache-control"), /public/, nama); assert.equal(r.h.get("access-control-allow-credentials"), null);
  }
  const meta = await api("GET", "/api/v1/data/meta"), asli = JSON.parse(readFileSync(path.join(AKAR, "public/data/meta.json"), "utf8"));
  assert.equal(meta.j.jumlah_titik, asli.jumlah_titik);
});

uji("riwayat sel: publik, sel berisi dikembalikan, sel kosong data null, koordinat salah atau di luar bbox 400", async () => {
  const tile = JSON.parse(readFileSync(path.join(AKAR, "public/data/riwayat_sel/10_10.json"), "utf8")), sel = Object.keys(tile.c)[0], [ix, iy] = sel.split("_").map(Number);
  assert.equal(`${Math.trunc(ix * 0.05)}_${Math.trunc(iy * 0.05)}`, "10_10", "sel contoh berada di ubin 10_10");
  const lat = (6.5 - (iy + 0.5) * 0.05).toFixed(4), lon = (94.5 + (ix + 0.5) * 0.05).toFixed(4);
  const r = await api("GET", `/api/v1/riwayat?lat=${lat}&lon=${lon}`); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.sel, sel); assert.equal(r.j.th0, tile.th0); assert.equal(r.j.sd, tile.sd); assert.deepEqual(r.j.data, tile.c[sel]); assert.equal(r.j.catatan, undefined);
  assert.equal(r.h.get("access-control-allow-origin"), "*"); assert.match(r.h.get("cache-control"), /public/); assert.equal(r.h.get("access-control-allow-credentials"), null);
  const kosong = await api("GET", "/api/v1/riwayat?lat=-10.9&lon=94.6"); assert.equal(kosong.s, 200); assert.equal(kosong.j.data, null); assert.match(kosong.j.catatan, /riwayat|ubin/);
  for (const q of ["", "lat=-2", "lon=113", "lat=abc&lon=113", "lat=&lon=113", "lat=-2&lon=", "lat=NaN&lon=113", "lat=Infinity&lon=113", "lat=1e1&lon=113", "lat=0x10&lon=113", "lat=-2,5&lon=113",
    "lat=7&lon=113", "lat=-11.6&lon=113", "lat=-2&lon=94.4", "lat=-2&lon=141.6", "lat=-2&lon=500", "lat=%20-2&lon=113", "lat=-2&lat2=1&lon=1e400"]) {
    const x = await api("GET", "/api/v1/riwayat?" + q); assert.equal(x.s, 400, `${q} harus 400, dapat ${x.s}`); assert.equal(x.h.get("access-control-allow-origin"), "*");
  }
  assert.equal((await api("POST", "/api/v1/riwayat?lat=-2&lon=113", {})).s, 405);
  assert.ok((await api("GET", "/api/v1")).j.endpoint.some(e => e.jalur === "/api/v1/riwayat" && e.kunci === false));
});

uji("riwayat sel: laju per hash IP, panggilan ke-601 dalam sejam 429 dengan CORS; IP lain tidak ikut; IP mentah tidak disimpan", async () => {
  const alamat = "198.51.100.77", kunci = (await import("node:crypto")).createHash("sha256").update("garam-uji|" + alamat).digest("hex");
  await DB.batch(Array.from({length: 600}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'riwayat.ip', ?)").bind(kunci, Date.now())));
  const r = await api("GET", "/api/v1/riwayat?lat=-2&lon=113", undefined, {"cf-connecting-ip": alamat});
  assert.equal(r.s, 429, r.t); assert.equal(r.h.get("access-control-allow-origin"), "*"); assert.equal(r.h.get("retry-after"), "3600");
  assert.equal((await api("GET", "/api/v1/riwayat?lat=-2&lon=113", undefined, ip())).s, 200, "IP lain tidak ikut");
  assert.equal(await n("laju_bnpb", `kunci = '${alamat}'`), 0, "IP mentah tidak disimpan");
});

uji("data publik: nama tak dikenal dan upaya keluar jalur 404; daftar nama sah ikut dijawab", async () => {
  for (const nama of ["tidak_ada", "..%2fmeta", "%2e%2e%2fmeta", "meta%2f..%2ffwi", "meta.json", "meta/x", "berita", "data/meta", "constructor", "__proto__", "toString", ""]) {
    const r = await api("GET", "/api/v1/data/" + nama);
    assert.equal(r.s, 404, `/data/${nama} → ${r.s} ${r.t.slice(0, 80)}`); assert.equal(r.h.get("access-control-allow-origin"), "*");
  }
  const r = await api("GET", "/api/v1/data/xx"); assert.deepEqual(r.j.nama_sah, Object.keys(DATA));
});

uji("indeks /api/v1 mencantumkan semua endpoint beserta kebutuhan kuncinya; /api menyajikan dokumentasi", async () => {
  const r = await api("GET", "/api/v1"); assert.equal(r.s, 200);
  const j = r.j.endpoint.map(e => e.jalur);
  for (const nama of Object.keys(DATA)) assert.ok(j.includes(`/api/v1/data/${nama}`), nama);
  for (const x of ["/api/v1/rumah-rusak", "/api/v1/rumah-rusak/rekap", "/api/v1/bangunan/terpapar", "/api/v1/bangunan/kec", "/api/v1/bangunan/grid", "/api/v1/laporan-bnpb"]) assert.equal(r.j.endpoint.find(e => e.jalur === x)?.kunci, true, x);
  assert.equal(r.j.endpoint.find(e => e.jalur === "/api/v1/data/meta").kunci, false);
  const d = await api("GET", "/api"); assert.equal(d.s, 200); assert.match(d.t, /API data Centurisk97/); assert.match(d.h.get("content-type"), /text\/html/);
  assert.equal((await api("GET", "/api/v1/tidak-ada")).s, 404);
  assert.equal((await api("POST", "/api/v1/data/meta", {})).s, 405);
});

uji("admin: hanya admin menerbitkan, melihat daftar, mencabut; isian salah 400; CSRF origin lain 403", async () => {
  for (const [m, j, b] of [["POST", "/api/kunci-api/admin/buat", {nama: "Mitra Uji", cakupan: ["bangunan"]}], ["GET", "/api/kunci-api/admin/daftar"], ["POST", "/api/kunci-api/admin/cabut/" + "a".repeat(16), {}]]) {
    assert.equal((await api(m, j, b)).s, 403, `${j} tanpa token`); assert.equal((await api(m, j, b, {"x-admin-token": "salah"})).s, 403, `${j} token salah`);
  }
  for (const b of [{nama: "ab", cakupan: ["bangunan"]}, {nama: "Mitra Uji", cakupan: []}, {nama: "Mitra Uji", cakupan: ["admin"]}, {nama: "Mitra Uji", cakupan: ["bangunan", "bangunan"]}, {nama: "Mitra Uji"}, {nama: "Mitra Uji", cakupan: "bangunan"}])
    assert.equal((await api("POST", "/api/kunci-api/admin/buat", b, ADMIN)).s, 400, JSON.stringify(b));
  assert.equal(await n("kunci_api"), 0);
  assert.equal((await api("POST", "/api/kunci-api/admin/buat", {nama: "Mitra Uji", cakupan: ["bangunan"]}, {...ADMIN, origin: "https://jahat.example"})).s, 403, "CSRF: origin lain");
  assert.doesNotMatch((await api("GET", "/admin/kunci-api")).t, /kunci_api\.js/, "tanpa masuk: formulir login, bukan halaman kunci");
  const h = await api("GET", "/admin/kunci-api", undefined, ADMIN); assert.equal(h.s, 200); assert.match(h.t, /kunci_api\.js/);
});

uji("admin buat: kunci tampil sekali, D1 hanya menyimpan sha256, daftar tanpa kunci atau hash", async () => {
  semua = await terbit("Mitra Semua", ["rumah_rusak", "bangunan", "laporan_bnpb"]);
  hanyaRumah = await terbit("Mitra Rumah", ["rumah_rusak"]);
  hanyaBangunan = await terbit("Mitra Bangunan", ["bangunan"]);
  assert.match(semua.kunci, /^pb_[0-9a-f]{64}$/); assert.notEqual(semua.kunci, hanyaRumah.kunci);
  const baris = await DB.prepare("SELECT * FROM kunci_api WHERE id = ?").bind(semua.id).first();
  assert.equal(baris.kunci_sha, sha256(semua.kunci)); assert.deepEqual(JSON.parse(baris.cakupan), ["rumah_rusak", "bangunan", "laporan_bnpb"]);
  const dump = JSON.stringify((await DB.prepare("SELECT * FROM kunci_api").all()).results);
  assert.ok(!dump.includes(semua.kunci.slice(3)), "kunci mentah tidak ada di tabel D1");
  const d = await api("GET", "/api/kunci-api/admin/daftar", undefined, ADMIN);
  assert.equal(d.s, 200); assert.equal(d.j.kunci.length, 3); assert.ok(!d.t.includes(semua.kunci) && !d.t.includes("kunci_sha") && !d.t.includes(baris.kunci_sha), "daftar tanpa kunci dan hash");
  assert.deepEqual(d.j.kunci.find(k => k.id === hanyaRumah.id).cakupan, ["rumah_rusak"]);
});

uji("berkunci: tanpa kunci, salah, di query string, atau format asing 401 (dengan CORS, no-store); POST 405", async () => {
  const j = "/api/v1/rumah-rusak/rekap";
  for (const h of [{}, K(""), K("pb_" + "0".repeat(64)), K("salah"), K(semua.kunci.toUpperCase()), K(semua.kunci + "x")]) {
    const r = await api("GET", j, undefined, {...ip(), ...h}); assert.equal(r.s, 401, JSON.stringify(h)); assert.equal(r.h.get("access-control-allow-origin"), "*"); assert.match(r.h.get("cache-control"), /no-store/);
  }
  for (const q of ["x-api-key", "api_key", "key", "apikey", "kunci"]) assert.equal((await api("GET", `${j}?${q}=${semua.kunci}`, undefined, ip())).s, 401, "kunci di query string tidak dibaca: " + q);
  assert.equal((await api("POST", j, {}, K(semua.kunci))).s, 405);
});

uji("kunci sah 200; cakupan kurang 403; jawaban berkunci private no-store dengan CORS", async () => {
  assert.equal((await api("GET", "/api/v1/rumah-rusak/rekap", undefined, K(semua.kunci))).s, 200);
  const r = await api("GET", "/api/v1/rumah-rusak/rekap", undefined, K(hanyaRumah.kunci));
  assert.equal(r.s, 200, r.t); assert.equal(r.h.get("cache-control"), "private, no-store"); assert.equal(r.h.get("access-control-allow-origin"), "*"); assert.equal(r.h.get("access-control-allow-credentials"), null);
  for (const j of ["/api/v1/bangunan/terpapar", "/api/v1/bangunan/kec", "/api/v1/bangunan/grid?prov=62", "/api/v1/laporan-bnpb?jenis=harian"]) {
    const x = await api("GET", j, undefined, K(hanyaRumah.kunci)); assert.equal(x.s, 403, j); assert.match(x.j.galat, /tidak mencakup/); assert.equal(x.h.get("access-control-allow-origin"), "*");
  }
  for (const j of ["/api/v1/rumah-rusak", "/api/v1/rumah-rusak/rekap", "/api/v1/laporan-bnpb?jenis=harian"]) assert.equal((await api("GET", j, undefined, K(hanyaBangunan.kunci))).s, 403, j);
});

uji("rumah rusak: hanya status sah, tanpa pelapor, dikoreksi_oleh, foto, dan baris ditolak; filter jalan", async () => {
  const sisip = (id, o) => DB.prepare("INSERT INTO rumah_rusak (id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, foto, catatan, pelapor, waktu, status, dikoreksi_oleh, dikoreksi_waktu) VALUES (?, 'banjir', ?, -2, 114, ?, ?, 'Kec A', ?, 1, 'catatan biasa', 'akun:rahasiapelapor', ?, ?, ?, ?)")
    .bind(id, o.tgl, o.prov, o.kab, o.tingkat, o.waktu, o.status, o.koreksi ?? null, o.koreksi ? 1 : null);
  await DB.batch([
    sisip("1".repeat(16), {tgl: "2026-10-10", prov: "62", kab: "Kapuas", tingkat: "berat", waktu: 3, status: "sah"}),
    sisip("2".repeat(16), {tgl: "2026-10-12", prov: "62", kab: "Kapuas", tingkat: "sedang", waktu: 2, status: "sah", koreksi: "abcdef123456"}),
    sisip("3".repeat(16), {tgl: "2026-10-12", prov: "62", kab: "Kapuas", tingkat: "ringan", waktu: 1, status: "ditolak", koreksi: "abcdef123456"}),
    sisip("4".repeat(16), {tgl: "2026-10-15", prov: "63", kab: "Banjar", tingkat: "berat", waktu: 4, status: "sah"})]);
  const r = await api("GET", "/api/v1/rumah-rusak", undefined, K(hanyaRumah.kunci));
  assert.equal(r.s, 200, r.t); assert.equal(r.j.jumlah, 3);
  assert.deepEqual(r.j.laporan.map(x => x.id[0]), ["4", "1", "2"], "terbaru dulu (waktu menurun); yang ditolak tidak ada");
  for (const k of ["pelapor", "dikoreksi_oleh", "dikoreksi_waktu", "foto", "status"]) assert.ok(r.j.laporan.every(x => !(k in x)), `kolom ${k} tidak ada`);
  assert.ok(!r.t.includes("rahasiapelapor") && !r.t.includes("abcdef123456") && !r.t.includes("ditolak"), "tidak ada data pelapor/koreksi/status ditolak di badan jawaban");
  assert.equal((await api("GET", "/api/v1/rumah-rusak?status=ditolak", undefined, K(hanyaRumah.kunci))).j.jumlah, 3, "?status=ditolak diabaikan, tetap hanya sah");
  assert.equal((await api("GET", "/api/v1/rumah-rusak?prov=63", undefined, K(hanyaRumah.kunci))).j.jumlah, 1);
  assert.equal((await api("GET", "/api/v1/rumah-rusak?kab=Kapuas&dari=2026-10-11&sampai=2026-10-14", undefined, K(hanyaRumah.kunci))).j.jumlah, 1);
  assert.equal((await api("GET", "/api/v1/rumah-rusak?bencana=banjir", undefined, K(hanyaRumah.kunci))).j.jumlah, 3);
  for (const q of ["prov=6", "prov=abc", "dari=kemarin", "bencana=nol", "kab=" + "x".repeat(81)]) assert.equal((await api("GET", "/api/v1/rumah-rusak?" + q, undefined, K(hanyaRumah.kunci))).s, 400, q);
  const rk = await api("GET", "/api/v1/rumah-rusak/rekap?dari=2026-10-01&sampai=2026-10-31", undefined, K(hanyaRumah.kunci));
  assert.equal(rk.j.total.total, 3); assert.equal(rk.j.total.berat, 2); assert.equal(rk.j.total.ringan, 0, "yang ditolak tidak dihitung"); assert.ok(!rk.t.includes("pelapor"));
});

uji("bangunan dan laporan BNPB: dilayani dari R2 dan D1 dengan kunci bercakupan yang benar; parameter salah 400/404", async () => {
  await R2.put("bangunan/kec.json", JSON.stringify({kec: {"62|01|01": 7}})); await R2.put("bangunan/grid_62.json", JSON.stringify({sel: [[1, 2, 3]]}));
  const kec = await api("GET", "/api/v1/bangunan/kec", undefined, K(hanyaBangunan.kunci)); assert.equal(kec.s, 200, kec.t); assert.deepEqual(kec.j, {kec: {"62|01|01": 7}});
  assert.equal((await api("GET", "/api/v1/bangunan/grid?prov=62", undefined, K(semua.kunci))).s, 200);
  for (const p of ["", "zz", "../x", "99"]) assert.equal((await api("GET", "/api/v1/bangunan/grid?prov=" + p, undefined, K(semua.kunci))).s, 400, p);
  assert.equal((await api("GET", "/api/v1/bangunan/terpapar", undefined, K(semua.kunci))).s, 404, "berkas belum diunggah");
  await DB.prepare("INSERT INTO laporan_bnpb (jenis, tanggal, isi, diubah, oleh) VALUES ('harian', '2026-10-20', ?, 1, 'moderator1')").bind('{"rumah_rusak":5}').run();
  const l = await api("GET", "/api/v1/laporan-bnpb?jenis=harian&tanggal=2026-10-20", undefined, K(semua.kunci)); assert.equal(l.s, 200, l.t); assert.deepEqual(l.j.isi, {rumah_rusak: 5});
  assert.equal((await api("GET", "/api/v1/laporan-bnpb?jenis=harian", undefined, K(semua.kunci))).j.daftar[0].tanggal, "2026-10-20");
  assert.equal((await api("GET", "/api/v1/laporan-bnpb?jenis=lain", undefined, K(semua.kunci))).s, 400);
  assert.equal((await api("GET", "/api/v1/laporan-bnpb?jenis=harian&tanggal=2026-10-21", undefined, K(semua.kunci))).s, 404);
});

uji("kunci API TIDAK membuka rute lama: /api/rumah-rusak, /api/bangunan/*, /api/laporan-bnpb tetap 403", async () => {
  for (const j of ["/api/rumah-rusak", "/api/rumah-rusak/rekap", "/api/bangunan/terpapar", "/api/bangunan/kec", "/api/bangunan/grid?prov=62", "/api/laporan-bnpb?jenis=harian", "/api/kunci-api/admin/daftar"]) {
    for (const h of [K(semua.kunci), {authorization: "Bearer " + semua.kunci}, {"x-admin-token": semua.kunci}, {"x-kode-regu": semua.kunci}]) {
      const r = await api("GET", j, undefined, {...ip(), ...h}); assert.equal(r.s, 403, `${j} ${Object.keys(h)[0]}`);
    }
  }
  assert.equal((await api("POST", "/api/kunci-api/admin/buat", {nama: "Curang", cakupan: ["bangunan"]}, K(semua.kunci))).s, 403, "kunci tidak bisa menerbitkan kunci");
});

uji("dicabut: langsung 401; mencabut dua kali 409, id tak ada 404; kunci lain tetap hidup", async () => {
  const c = await api("POST", "/api/kunci-api/admin/cabut/" + hanyaBangunan.id, {}, ADMIN); assert.equal(c.s, 200, c.t);
  const r = await api("GET", "/api/v1/bangunan/kec", undefined, {...K(hanyaBangunan.kunci), ...ip()}); assert.equal(r.s, 401); assert.equal(r.h.get("access-control-allow-origin"), "*");
  assert.equal((await api("POST", "/api/kunci-api/admin/cabut/" + hanyaBangunan.id, {}, ADMIN)).s, 409);
  assert.equal((await api("POST", "/api/kunci-api/admin/cabut/" + "e".repeat(16), {}, ADMIN)).s, 404);
  assert.equal((await api("GET", "/api/v1/rumah-rusak/rekap", undefined, K(hanyaRumah.kunci))).s, 200);
  const d = await api("GET", "/api/kunci-api/admin/daftar", undefined, ADMIN); assert.ok(d.j.kunci.find(k => k.id === hanyaBangunan.id).dicabut > 0);
});

uji("terakhir diperbarui paling sering sekali per jam, bukan tiap permintaan", async () => {
  const baca = async () => (await DB.prepare("SELECT terakhir FROM kunci_api WHERE id = ?").bind(hanyaRumah.id).first()).terakhir;
  await tunggu(200); const t0 = await baca();   // pemakaian di uji sebelumnya sudah mengisinya
  assert.ok(t0 > 0, "terisi sesudah pemakaian pertama");
  await tunggu(30); await api("GET", "/api/v1/rumah-rusak/rekap", undefined, K(hanyaRumah.kunci)); await tunggu(200);
  assert.equal(await baca(), t0, "pemakaian lagi dalam sejam tidak menulis ulang");
  await DB.prepare("UPDATE kunci_api SET terakhir = ? WHERE id = ?").bind(Date.now() - 2 * 3600e3, hanyaRumah.id).run();
  await api("GET", "/api/v1/rumah-rusak/rekap", undefined, K(hanyaRumah.kunci)); await tunggu(200);
  assert.ok(await baca() > Date.now() - 60e3, "lewat sejam: diperbarui");
});

uji("batas laju: kunci salah dihitung per hash IP (300 per jam, 429); 1.000 per jam per kunci 429; IP dan kunci lain tidak ikut", async () => {
  const alamat = "198.51.100.77", kunci = sha256("garam-uji|" + alamat);   // sama dengan ipHash() di worker.js untuk IPv4
  const salah = {"cf-connecting-ip": alamat};
  assert.equal((await api("GET", "/api/v1/rumah-rusak/rekap", undefined, {...salah, ...K("pb_" + "1".repeat(64))})).s, 401);
  assert.equal(await n("laju_bnpb", `aksi = 'api.kunci_gagal' AND kunci = '${kunci}'`), 1, "kegagalan dicatat per hash IP bergaram");
  assert.equal(await n("laju_bnpb", `kunci = '${alamat}'`), 0, "IP mentah tidak pernah disimpan");
  await DB.batch(Array.from({length: 299}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'api.kunci_gagal', ?)").bind(kunci, Date.now())));
  const kena = await api("GET", "/api/v1/rumah-rusak/rekap", undefined, {...salah, ...K(hanyaRumah.kunci)});
  assert.equal(kena.s, 429, "sesudah 300 kegagalan, bahkan kunci sah dari IP itu ditolak"); assert.equal(kena.h.get("retry-after"), "3600"); assert.equal(kena.h.get("access-control-allow-origin"), "*");
  assert.equal((await api("GET", "/api/v1/rumah-rusak/rekap", undefined, {...ip(), ...K(hanyaRumah.kunci)})).s, 200, "IP lain tidak ikut");
  await DB.batch(Array.from({length: 1000}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'api.v1', ?)").bind("api:" + semua.id, Date.now())));
  const l = await api("GET", "/api/v1/rumah-rusak/rekap", undefined, {...ip(), ...K(semua.kunci)}); assert.equal(l.s, 429); assert.match(l.j.galat, /1000 per 1 jam/);
  assert.equal((await api("GET", "/api/v1/rumah-rusak/rekap", undefined, {...ip(), ...K(hanyaRumah.kunci)})).s, 200, "batas per kunci, kunci lain tidak ikut");
});

uji("terbuka di semua host: centurisk97.id tanpa masuk tetap melayani /api, /api/v1, dan data; halaman lain tetap dikunci", async () => {
  const situs = (j, h = {}) => mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", headers: {"cf-connecting-ip": "192.0.2.9", ...h}});
  for (const j of ["/api/v1", "/api/v1/data/meta"]) { const r = await situs(j); assert.equal(r.status, 200, j); await r.arrayBuffer(); }
  /* dokumentasi /api di centurisk97.id hanya untuk admin yang masuk (pemilik 23 Okt 2026) */
  const dok = await situs("/api"); assert.equal(dok.status, 303, "/api tanpa masuk dialihkan"); assert.match(dok.headers.get("location"), /^\/admin\/masuk/); await dok.arrayBuffer();
  const dokAdmin = await situs("/api", ADMIN); assert.equal(dokAdmin.status, 200, "/api untuk admin"); assert.match(dokAdmin.headers.get("cache-control"), /no-store/); await dokAdmin.arrayBuffer();
  const kunci = await situs("/api/v1/rumah-rusak/rekap", {"x-api-key": hanyaRumah.kunci}); assert.equal(kunci.status, 200); await kunci.arrayBuffer();
  const tertutup = await situs("/laporan"); assert.equal(tertutup.status, 303, "gerbang halaman tidak dilonggarkan"); await tertutup.arrayBuffer();
});

uji("hak akses kunci: buat = Super Admin; daftar dan cabut = moderator ke atas; akun gerbang AKUN_SITUS ditolak ketiganya; cabut mencatat dicabut_oleh", async () => {
  const MOD2 = {"x-admin-token": "moderator-dua"}, GERBANG = {"x-admin-token": "gerbang@x:sandi"};
  const baru = await terbit("Mitra Hak", ["bangunan"]);
  const buat = {nama: "Mitra Gerbang", cakupan: ["bangunan"]};
  for (const [h, nama] of [[GERBANG, "gerbang"], [MOD2, "moderator biasa"]]) assert.equal((await api("POST", "/api/kunci-api/admin/buat", buat, h)).s, 403, `${nama} tidak boleh menerbitkan`);
  assert.equal((await api("GET", "/api/kunci-api/admin/daftar", undefined, GERBANG)).s, 403, "gerbang tidak boleh melihat daftar");
  assert.equal((await api("GET", "/api/kunci-api/admin/daftar", undefined, GERBANG_ORANG)).s, 403, "akun gerbang per-orang (AKUN_SITUS_DUMMY) juga bukan moderator");
  assert.equal((await api("POST", "/api/kunci-api/admin/cabut/" + baru.id, {}, GERBANG)).s, 403, "gerbang tidak boleh mencabut");
  assert.equal(await n("kunci_api", "nama = 'Mitra Gerbang'"), 0);
  const d = await api("GET", "/api/kunci-api/admin/daftar", undefined, MOD2); assert.equal(d.s, 200); assert.equal(d.j.bisa_buat, false, "moderator biasa: halaman menampilkan pesan SUPER_ADMIN");
  assert.equal((await api("GET", "/api/kunci-api/admin/daftar", undefined, ADMIN)).j.bisa_buat, true);
  assert.equal((await api("POST", "/api/kunci-api/admin/cabut/" + baru.id, {}, MOD2)).s, 200, "moderator boleh mencabut");
  const baris = await DB.prepare("SELECT dicabut_oleh FROM kunci_api WHERE id = ?").bind(baru.id).first();
  assert.equal(baris.dicabut_oleh, sha256("moderator-dua").slice(0, 12));
  assert.equal((await api("GET", "/api/kunci-api/admin/daftar", undefined, MOD2)).j.kunci.find(k => k.id === baru.id).dicabut_oleh, baris.dicabut_oleh);
});

uji("privasi v1: koordinat rumah rusak 4 desimal, tanpa catatan; laporan BNPB tanpa oleh; rekap membawa kec_dipotong; HEAD diizinkan", async () => {
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'api.v1'").run();   // uji batas laju di atas memenuhi jatah kunci ini
  await DB.prepare("INSERT INTO rumah_rusak (id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, catatan, pelapor, waktu) VALUES (?, 'banjir', '2026-10-13', -2.123456, 114.987654, '62', 'Kapuas', 'Kec A', 'ringan', 'rumah pak Budi, hubungi', 'akun:abc123', ?)").bind("9".repeat(16), Date.now() + 10).run();
  const r = await api("GET", "/api/v1/rumah-rusak", undefined, K(semua.kunci)); const x = r.j.laporan[0];
  assert.equal(x.id, "9".repeat(16)); assert.equal(x.lat, -2.1235); assert.equal(x.lon, 114.9877); assert.ok(r.j.laporan.every(l => !("catatan" in l)), "catatan dibuang");
  assert.ok(!r.t.includes("pak Budi") && !r.t.includes("-2.123456"), "data presisi tidak bocor");
  assert.equal((await DB.prepare("SELECT lat FROM rumah_rusak WHERE id = ?").bind("9".repeat(16)).first()).lat, -2.123456, "data asli di D1 tidak berubah");
  const l = await api("GET", "/api/v1/laporan-bnpb?jenis=harian&tanggal=2026-10-20", undefined, K(semua.kunci)); assert.ok(!("oleh" in l.j) && !l.t.includes("moderator1"), "tanpa oleh");
  assert.ok(l.j.diubah >= 0);
  const dl = await api("GET", "/api/v1/laporan-bnpb?jenis=harian", undefined, K(semua.kunci)); assert.ok(dl.j.daftar.every(e => !("oleh" in e)));
  const rk = await api("GET", "/api/v1/rumah-rusak/rekap?dari=2026-10-01&sampai=2026-10-31", undefined, K(semua.kunci)); assert.equal(rk.j.kec_dipotong, false);
  const hd = await mf.dispatchFetch("http://bnpb.lokal/api/v1/data/meta", {method: "HEAD"}); assert.equal(hd.status, 200); assert.equal(await hd.text(), ""); assert.equal(hd.headers.get("access-control-allow-origin"), "*");
  const hk = await mf.dispatchFetch("http://bnpb.lokal/api/v1/rumah-rusak/rekap", {method: "HEAD", headers: {...K(semua.kunci), ...ip()}}); assert.equal(hk.status, 200); assert.equal(await hk.text(), "");
  assert.equal((await api("PUT", "/api/v1/data/meta", {})).s, 405);
});

uji("konsesi: tanpa kunci 401, cakupan lain 403, kunci konsesi 200 (private no-store); prov dan nama divalidasi; saring nama", async () => {
  const kon = await terbit("Mitra Konsesi", ["konsesi"]), j = "/api/v1/konsesi?prov=62";
  assert.equal((await api("GET", j, undefined, ip())).s, 401);
  assert.equal((await api("GET", j, undefined, {...ip(), ...K(hanyaRumah.kunci)})).s, 403, "kunci cakupan lain");
  assert.equal((await api("GET", "/api/v1/rumah-rusak/rekap", undefined, {...ip(), ...K(kon.kunci)})).s, 403, "kunci konsesi tidak membuka cakupan lain");
  const r = await api("GET", j, undefined, K(kon.kunci)); assert.equal(r.s, 200, r.t.slice(0, 100)); assert.equal(r.j.prov, "62"); assert.ok(r.j.perusahaan.length > 0);
  assert.equal(r.h.get("cache-control"), "private, no-store"); assert.equal(r.h.get("access-control-allow-origin"), "*");
  const nama = r.j.perusahaan[0].nama, s = await api("GET", `/api/v1/konsesi?prov=62&nama=${encodeURIComponent(nama.slice(3, 10).toUpperCase())}`, undefined, K(kon.kunci));
  assert.equal(s.s, 200); assert.ok(s.j.perusahaan.length >= 1 && s.j.perusahaan.length < r.j.perusahaan.length && s.j.perusahaan.some(p => p.nama === nama)); assert.ok(s.t.length < r.t.length);
  assert.equal((await api("GET", "/api/v1/konsesi?prov=62&nama=zzzzzzzz", undefined, K(kon.kunci))).j.perusahaan.length, 0);
  const d = await api("GET", "/api/v1/konsesi", undefined, K(kon.kunci)); assert.equal(d.s, 200); assert.ok(d.j.provinsi.some(p => p.kode === "62"));
  for (const q of ["prov=00", "prov=6", "prov=abc", "prov=..%2F62", "prov=62&nama=x", "prov=62&nama="]) assert.equal((await api("GET", "/api/v1/konsesi?" + q, undefined, K(kon.kunci))).s, 400, q);
  assert.equal((await api("GET", "/api/v1")).j.endpoint.find(e => e.jalur === "/api/v1/konsesi")?.kunci, true);
});

uji("koreksi rumah rusak: catatan dibersihkan seperti saat buat (tautan, nomor HP dibuang; kata kasar 400)", async () => {
  const id = "9".repeat(16);
  const ok = await api("POST", "/api/rumah-rusak/" + id, {alasan: "rapikan catatan", catatan: "lihat www.contoh.com atau 081234567890 atap roboh"}, ADMIN);
  assert.equal(ok.s, 200, ok.t); assert.ok(!/contoh\.com|0812345/.test(ok.j.catatan), ok.j.catatan); assert.match(ok.j.catatan, /\[tautan dihapus\]/); assert.match(ok.j.catatan, /\[nomor dihapus\]/);
  assert.equal((await DB.prepare("SELECT catatan FROM rumah_rusak WHERE id = ?").bind(id).first()).catatan, ok.j.catatan);
  const kasar = await api("POST", "/api/rumah-rusak/" + id, {alasan: "uji kata kasar", catatan: "dasar bangsat"}, ADMIN); assert.equal(kasar.s, 400); assert.match(kasar.j.galat, /^catatan:/);
});
