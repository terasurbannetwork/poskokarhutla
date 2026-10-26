/* Uji pilot SIPPA Kalteng tanpa login (src/uji_pilot.js, migrations/0061_uji_pilot.sql, keputusan SIPPA 59) di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan.
   Yang dibuktikan: halaman /uji-pilot terbuka tanpa akun (juga di centurisk97.id) dengan CSP ketat; data dossier dan laporan hanya dengan token x-uji;
   tebakan token salah dibatasi per IP; laporan berfoto dengan GPS 3 bacaan, EXIF dicek lalu dibuang dari berkas di R2; aturan isian = public/pipa/uji_pilot_spek.js
   dan = CHECK SQL; foto hanya dengan token; CSV; dummy admin isi/hapus; 503 jujur tanpa migrasi 0061.
   Jalankan: node --test tests/warga/uji_pilot.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {AKAR, JPEG_SAH, badanPanjang, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import "../../src/worker.js";
import {TOKEN_SHA, BATAS_UJI} from "../../src/uji_pilot.js";
import {TAHAP_ID, PETAK, cekIsi} from "../../public/pipa/uji_pilot_spek.js";
import {DATA} from "../../src/uji_pilot_data.js";

const uji = berantai();
const TOK = "ab".repeat(18), TOKEN = "cd".repeat(18);   // TOK = token uji yang sah lewat ikatan UJI_PILOT_SHA; TOKEN = token salah
const U = await siapkan("uji-pilot", {r2: true, ikat: {UJI_PILOT_SHA: createHash("sha256").update(TOK).digest("hex")}});
const {mf, DB, api, n} = U;
let ipN = 0;
const ip = () => ({"cf-connecting-ip": `203.0.113.${++ipN % 250}`});


uji("uji pilot: migrasi 0061 idempoten, CHECK tahap dan petak sama dengan modul aturan", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0061_uji_pilot.sql"), "utf8");
  for (const s of pecah(sql)) await DB.prepare(s).run();   // jalankan ulang: IF NOT EXISTS, tanpa galat
  const tahapSql = sql.match(/tahap IN \(([^)]+)\)/)[1].match(/'([^']+)'/g).map(x => x.slice(1, -1));
  assert.deepEqual(tahapSql, TAHAP_ID, "tahap SQL = uji_pilot_spek.js");
  assert.deepEqual(sql.match(/petak IN \(([^)]+)\)/)[1].match(/'([^']+)'/g).map(x => x.slice(1, -1)), PETAK);
  await assert.rejects(DB.prepare("INSERT INTO uji_pilot_lapor (id, lokasi, tahap, lat, lon, akurasi, diambil, dibuat) VALUES ('aaaaaaaaaaaaaaaa', 11, 'tiba', -2, 114, 5, 1, 1)").run(), /CHECK/);
  await assert.rejects(DB.prepare("INSERT INTO uji_pilot_lapor (id, lokasi, tahap, lat, lon, akurasi, diambil, dibuat) VALUES ('aaaaaaaaaaaaaaaa', 1, 'tiba', -2, 114, 5, 1, 1)").run(), /CHECK/, "baris asli wajib berfoto");
  assert.equal(DATA.lokasi.length, 10); assert.match(TOKEN_SHA, /^[0-9a-f]{64}$/);
  assert.notEqual(TOKEN_SHA, createHash("sha256").update(TOK).digest("hex"), "token uji bukan token produksi");
});

uji("uji pilot: halaman terbuka tanpa akun, juga di centurisk97.id; CSP ketat, no-store, noindex, tanpa referrer; POST 405", async () => {
  for (const host of ["http://bnpb.lokal", "http://centurisk97.id"]) {
    const r = await mf.dispatchFetch(host + "/uji-pilot", {redirect: "manual"}); assert.equal(r.status, 200, host); const h = await r.text();
    assert.match(h, /uji_pilot\.js/); assert.equal(r.headers.get("cache-control"), "no-store"); assert.equal(r.headers.get("referrer-policy"), "no-referrer");
    assert.match(r.headers.get("x-robots-tag"), /noindex/); const csp = r.headers.get("content-security-policy");
    assert.match(csp, /script-src 'self'/); assert.match(csp, /frame-ancestors 'none'/); assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
    assert.doesNotMatch(h, /<script(?![^>]*\bsrc=)[^>]*>[^<]/, "tanpa skrip inline"); assert.doesNotMatch(h, / style="/, "tanpa gaya inline");
  }
  assert.equal((await mf.dispatchFetch("http://bnpb.lokal/uji-pilot", {method: "POST", headers: {origin: "http://bnpb.lokal"}})).status, 405);
  /* data dossier yang dikirim API tidak memuat style inline (CSP style-src tanpa unsafe-inline akan membuangnya) */
  assert.doesNotMatch(JSON.stringify(DATA), / style=\\"/);
});

uji("uji pilot: tanpa token atau token salah = 403 di semua API; tebakan salah dihitung per IP sampai 429; token benar tidak dihitung", async () => {
  for (const j of ["/api/uji-pilot", "/api/uji-pilot/lapor", "/api/uji-pilot/lapor.csv", "/api/uji-pilot/foto/0123456789abcdef", "/api/uji-pilot/kecil/0123456789abcdef"]) {
    assert.equal((await api("GET", j, undefined, ip())).s, 403, j);
    assert.equal((await api("GET", j, undefined, {"x-uji": TOKEN, ...ip()})).s, 403, j + " token salah");
  }
  const sama = {"cf-connecting-ip": "198.51.100.77"};
  await DB.prepare(`INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT kunci, 'uji_pilot.gagal', ? FROM (SELECT ? kunci) JOIN (WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM c WHERE i < ?) SELECT i FROM c)`)
    .bind(Date.now(), await ipKunci(sama["cf-connecting-ip"]), BATAS_UJI.gagal).run();
  const r = await api("GET", "/api/uji-pilot", undefined, {"x-uji": TOKEN, ...sama}); assert.equal(r.s, 429);
});
/* kunci laju = ipHash(env, req): dibaca dari baris yang ditulis satu tebakan salah */
async function ipKunci(alamat) {
  await api("GET", "/api/uji-pilot", undefined, {"x-uji": TOKEN, "cf-connecting-ip": alamat});
  return (await DB.prepare("SELECT kunci FROM laju_bnpb WHERE aksi = 'uji_pilot.gagal' ORDER BY rowid DESC LIMIT 1").first()).kunci;
}

uji("uji pilot: aturan isian (cekIsi) menolak tahap, petak, angka, dan suhu di luar batas; bersih untuk yang sah", () => {
  assert.equal(cekIsi("tiba", null, {n_orang: "9", jenis: "karhutla"}).ok, true);
  assert.deepEqual(cekIsi("tiba", null, {n_orang: "9", jenis: "karhutla"}).isi, {n_orang: 9, jenis: "karhutla"});
  assert.match(cekIsi("tiba", null, {jenis: "karhutla"}).galat.join(), /Jumlah orang/);
  assert.match(cekIsi("petak_sebelum", null, {}).galat.join(), /pilih petak/);
  assert.match(cekIsi("tiba", "L1", {n_orang: 3, jenis: "latihan"}).galat.join(), /tidak memakai petak/);
  assert.match(cekIsi("air_mengalir", null, {air_sampai_lance: "1", tekanan_lance_bar: "30"}).galat.join(), /0 sampai 25/);
  assert.match(cekIsi("petak_sesudah", "K1", {suhu: {"1": [10, 20, 30]}}).galat.join(), /suhu titik 1/);
  assert.match(cekIsi("petak_sesudah", "K1", {suhu: {"9": [1, 2, 3, 4]}}).galat.join(), /suhu titik 9/);
  assert.equal(cekIsi("petak_sesudah", "K1", {suhu: {"1": ["52,5", null, "", 30]}}).ok, true);
  assert.deepEqual(cekIsi("petak_sesudah", "K1", {suhu: {"1": ["52,5", null, "", 30]}}).isi.suhu, {"1": [52.5, null, null, 30]});
  assert.match(cekIsi("kendala", null, {}, "").galat.join(), /kendala/);
  assert.match(cekIsi("tiba", null, {n_orang: 2, jenis: "latihan", sisipan: 1}).galat.join(), /tidak dikenal/);
  assert.equal(cekIsi("tahu", null).ok, false);
});

const benar = uji;
const H = () => ({"x-uji": TOK, ...ip()});
const [PLA, PLO] = DATA.lokasi[0].petak;
async function kirim(o = {}) {
  const f = new FormData(), kini = Date.now(), set = (k, v) => v != null && f.append(k, String(v));
  const s = [0, 1, 2].map(i => [PLA + i * 1e-5, PLO + i * 1e-5, 8 + i, kini - (2 - i) * 1000]);
  const d = {lokasi: 1, tahap: "petak_sebelum", petak: "L1", isi: JSON.stringify({tebal_gambut_cm: 310, asap: "2", suhu: {"1": [52, 48, 41, 30]}}), catatan: "uji",
    nama: "Budi", regu: "Daops Uji", lat: s[2][0], lon: s[2][1], akurasi: s[2][2], waktu_gps: s[2][3], sampel: JSON.stringify(s), zona: "Asia/Jakarta", ...o};
  for (const [k, v] of Object.entries(d)) if (v !== undefined) set(k, v);
  if (o.foto !== null) f.append("foto", new File([o.fotoByte || JPEG_SAH], "f.jpg", {type: "image/jpeg"}));
  if (o.thumb !== null) f.append("thumb", new File([JPEG_SAH], "t.jpg", {type: "image/jpeg"}));
  const {body, headers} = await badanPanjang(f, {...H(), ...(o.h || {})});
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/uji-pilot/lapor", {method: "POST", body, headers: {...headers, origin: "http://bnpb.lokal"}});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return {s: r.status, j, t};
}

benar("uji pilot: data dossier dengan token; laporan berfoto tersimpan, EXIF dibuang, jarak ke petak dihitung server, foto hanya dengan token", async () => {
  const d = await api("GET", "/api/uji-pilot", undefined, H()); assert.equal(d.s, 200, d.t); assert.equal(d.j.lokasi.length, 10); assert.equal(d.j.admin, false);
  const r = await kirim(); assert.equal(r.s, 201, r.t); assert.ok(r.j.jarak_petak_m < 20, "dekat petak");
  const b = await DB.prepare("SELECT * FROM uji_pilot_lapor WHERE id = ?").bind(r.j.id).first();
  assert.equal(b.tahap, "petak_sebelum"); assert.equal(b.petak, "L1"); assert.deepEqual(JSON.parse(b.isi), {tebal_gambut_cm: 310, asap: 2, suhu: {"1": [52, 48, 41, 30]}});
  assert.equal(b.dummy, 0); assert.match(b.sha256, /^[0-9a-f]{64}$/);
  const obj = await (await mf.getR2Bucket("MEDIA")).get("uji-pilot/" + r.j.id); assert.ok(obj, "foto di R2");
  const byte = new Uint8Array(await obj.arrayBuffer()); assert.ok(!Buffer.from(byte).includes(Buffer.from("Exif")), "tanpa EXIF");
  assert.equal((await api("GET", "/api/uji-pilot/foto/" + r.j.id, undefined, ip())).s, 403, "tanpa token");
  const fo = await mf.dispatchFetch("http://bnpb.lokal/api/uji-pilot/kecil/" + r.j.id, {headers: H()}); assert.equal(fo.status, 200); assert.match(fo.headers.get("cache-control"), /private/); await fo.arrayBuffer();
  const ls = await api("GET", "/api/uji-pilot/lapor?lokasi=1", undefined, H()); assert.equal(ls.s, 200); assert.ok(ls.j.lapor.some(x => x.id === r.j.id && x.isi.tebal_gambut_cm === 310));
  assert.ok(!("ip_hash" in ls.j.lapor[0]), "hash IP tidak dikirim ke klien");
  const csv = await mf.dispatchFetch("http://bnpb.lokal/api/uji-pilot/lapor.csv", {headers: H()}); const tc = await csv.text();
  assert.equal(csv.status, 200); assert.match(tc.split("\r\n")[0], /^id,lokasi,tahap,petak,diambil_wib,n_orang/); assert.match(tc, /petak_sebelum,L1/);
});

async function kirimThumb(bytes) {
  const f = new FormData(), kini = Date.now(), s = [0, 1, 2].map(i => [PLA + i * 1e-5, PLO + i * 1e-5, 8 + i, kini - (2 - i) * 1000]);
  for (const [k, v] of Object.entries({lokasi: 1, tahap: "tiba", isi: JSON.stringify({n_orang: 4, jenis: "latihan"}), lat: s[2][0], lon: s[2][1], akurasi: 10, waktu_gps: s[2][3], sampel: JSON.stringify(s)})) f.append(k, String(v));
  f.append("foto", new File([JPEG_SAH], "f.jpg", {type: "image/jpeg"})); f.append("thumb", new File([bytes], "t.jpg", {type: "image/jpeg"}));
  const {body, headers} = await badanPanjang(f, H());
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/uji-pilot/lapor", {method: "POST", body, headers: {...headers, origin: "http://bnpb.lokal"}});
  const t = await r.text(); return {s: r.status, j: JSON.parse(t), t};
}

benar("uji pilot: laporan ditolak bila isian, GPS, EXIF, atau foto tidak sah; tidak ada berkas yatim di R2", async () => {
  const awal = (await (await mf.getR2Bucket("MEDIA")).list({prefix: "uji-pilot/"})).objects.length;
  const kini = Date.now();
  for (const [o, pola] of [[{lokasi: 11}, /lokasi/], [{tahap: "tahu"}, /tahap/], [{petak: "Z9"}, /petak/], [{isi: "{bukan json"}, /JSON/],
    [{lat: undefined}, /GPS wajib/], [{akurasi: 5000}, /akurasi/], [{waktu_gps: kini - 3600e3}, /sudah lama/], [{lat: 20}, /luar Indonesia/],
    [{exif_lat: PLA + 0.2, exif_lon: PLO}, /km dari posisi/], [{exif_waktu: kini - 72 * 3600e3}, /48 jam/], [{foto: null}, /foto bukti wajib/], [{thumb: null}, /gambar kecil/],
    [{fotoByte: new TextEncoder().encode("<html>bukan foto</html>")}, /JPEG atau WebP/], [{sampel: "[]"}, /lokasi tidak bisa diverifikasi/]]) {
    const r = await kirim(o); assert.equal(r.s, 400, `${JSON.stringify(o).slice(0, 60)}: ${r.t}`); assert.match(r.j.galat, pola);
  }
  assert.equal((await (await mf.getR2Bucket("MEDIA")).list({prefix: "uji-pilot/"})).objects.length, awal, "penolakan tidak meninggalkan berkas");
  const besar = await kirimThumb(new Uint8Array(BATAS_UJI.thumb + 10)); assert.equal(besar.s, 400, besar.t); assert.match(besar.j.galat, /300 KB/);
});

benar("uji pilot: dummy hanya admin, mengisi semua tahap lokasi yang dibuka, idempoten per lokasi, hapus hanya dummy", async () => {
  const asli = await n("uji_pilot_lapor", "dummy = 0");
  assert.equal((await api("POST", "/api/uji-pilot/dummy", {aksi: "isi", lokasi: 2}, {...H(), origin: "http://bnpb.lokal"})).s, 403, "pemegang token bukan admin");
  assert.equal((await api("POST", "/api/uji-pilot/dummy", {aksi: "isi", lokasi: 2}, {"x-admin-token": "moderator-dua", origin: "http://bnpb.lokal"})).s, 403, "moderator bukan Super Admin");
  const r = await api("POST", "/api/uji-pilot/dummy", {aksi: "isi", lokasi: 2}, {...ADMIN, origin: "http://bnpb.lokal"}); assert.equal(r.s, 201, r.t);
  const tahap = (await DB.prepare("SELECT DISTINCT tahap FROM uji_pilot_lapor WHERE dummy = 1 AND lokasi = 2").all()).results.map(x => x.tahap).sort();
  assert.deepEqual(tahap, [...TAHAP_ID].sort(), "semua tahap terisi");
  assert.equal((await api("POST", "/api/uji-pilot/dummy", {aksi: "isi", lokasi: 2}, {...ADMIN, origin: "http://bnpb.lokal"})).j.dibuat, 0, "tidak dobel");
  const csv = await (await mf.dispatchFetch("http://bnpb.lokal/api/uji-pilot/lapor.csv", {headers: H()})).text(); assert.doesNotMatch(csv, /Contoh Petugas/, "CSV tanpa dummy");
  const h = await api("POST", "/api/uji-pilot/dummy", {aksi: "hapus"}, {...ADMIN, origin: "http://bnpb.lokal"}); assert.equal(h.s, 200); assert.ok(h.j.dihapus > 0);
  assert.equal(await n("uji_pilot_lapor", "dummy = 1"), 0); assert.equal(await n("uji_pilot_lapor", "dummy = 0"), asli, "laporan asli utuh");
});

uji("uji pilot: tanpa migrasi 0061 daftar laporan kosong dengan tanda belum aktif, CSV 503 (bukan 500)", async () => {
  await DB.prepare("DROP TABLE uji_pilot_lapor").run();
  {
    const r = await api("GET", "/api/uji-pilot/lapor", undefined, H()); assert.equal(r.s, 200); assert.equal(r.j.belum_aktif, true);
    assert.equal((await api("GET", "/api/uji-pilot/lapor.csv", undefined, H())).s, 503);
    assert.equal((await kirim()).s, 503);
  }
  assert.equal((await api("POST", "/api/uji-pilot/dummy", {aksi: "hapus"}, {...ADMIN, origin: "http://bnpb.lokal"})).s, 503);
});
