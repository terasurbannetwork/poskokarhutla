/* Helper bersama Ruang Koordinasi BNPB (src/bnpb.js) di atas D1 lokal sungguhan: batas laju laju_bnpb, kode pribadi, migrasi 0022. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai} from "./_bnpb.mjs";
import "../../src/worker.js";
import {laju, pemegangKode, kodeBaru, bersihkanBnpb} from "../../src/bnpb.js";

const U = await siapkan("uji-bnpb"), uji = berantai(), JAM = 3600e3;
const env = {DB: U.DB, IP_SALT: "garam-uji"};
const req = (ip, kode) => new Request("http://x/", {headers: {"cf-connecting-ip": ip, ...(kode ? {"x-kode": kode} : {})}});

uji("migrasi 0022 bnpb_bersama idempoten", async () => {
  const f = readFileSync(path.join(AKAR, "migrations/0022_bnpb_bersama.sql"), "utf8");
  await U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES ('kunci-a', 'uji.aksi', 1)").run();
  await U.DB.batch(pecah(f).map(s => U.DB.prepare(s)));
  assert.equal(await U.n("laju_bnpb"), 1);
  await assert.rejects(U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES ('k', 'uji.aksi', 1)").run(), /CHECK/);
});

uji("laju_bnpb: batas per jendela, kunci lain tidak ikut terhitung", async () => {
  const k = Date.now();
  for (let i = 0; i < 3; i++) assert.equal(await laju(env, "ip-satu", "uji.kirim", [[JAM, 3]], k + i), null);
  const r = await laju(env, "ip-satu", "uji.kirim", [[JAM, 3]], k + 10);
  assert.equal(r.status, 429); assert.ok(r.headers.get("retry-after"));
  assert.equal(await laju(env, "ip-dua", "uji.kirim", [[JAM, 3]], k + 11), null);
  assert.equal(await laju(env, "ip-satu", "uji.kirim", [[JAM, 3]], k + 2 * JAM), null, "jendela lewat: boleh lagi");
});

uji("kode pribadi: hanya hash tersimpan, salah/format liar 403, tebakan > 300/jam 429", async () => {
  const {kode, kode_sha} = await kodeBaru();
  assert.match(kode, /^[0-9a-f]{26}$/); assert.notEqual(kode, kode_sha);
  const cari = async h => h === kode_sha ? {id: "pemegang"} : null;
  assert.deepEqual(await pemegangKode(env, req("10.0.0.1", kode), "uji", cari), {id: "pemegang"});
  assert.equal((await pemegangKode(env, req("10.0.0.1", "x".repeat(26)), "uji", cari)).status, 403);
  assert.equal((await pemegangKode(env, req("10.0.0.1"), "uji", cari)).status, 403);
  const k = Date.now();
  await U.DB.batch(Array.from({length: 300}, (_, i) => U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT kunci, aksi, ? FROM laju_bnpb WHERE aksi = 'uji.kode_gagal' LIMIT 1").bind(k - i)));
  assert.equal((await pemegangKode(env, req("10.0.0.1", kode), "uji", cari, k)).status, 429, "IP yang sudah banyak gagal ditolak walau kodenya benar");
  assert.deepEqual(await pemegangKode(env, req("10.0.0.2", kode), "uji", cari, k), {id: "pemegang"}, "IP lain tidak ikut terkunci");
});

uji("cron menit 17: laju_bnpb lebih tua dari 2 hari dibuang", async () => {
  const k = Date.now();
  await U.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES ('kunci-tua', 'uji.tua', ?)").bind(k - 3 * 24 * JAM).run();
  await bersihkanBnpb(env, k);
  assert.equal(await U.n("laju_bnpb", "kunci = 'kunci-tua'"), 0);
});

uji("halaman Ruang Koordinasi tanpa modul (/risiko /sitrep /bnpb): 200, CSP ketat tanpa inline", async () => {
  for (const j of ["/risiko"]) {   // /sitrep dan /bnpb menyusul saat halamannya jadi
    const r = await U.api("GET", j);
    assert.equal(r.s, 200, j + " " + r.t.slice(0, 80));
    const csp = r.h.get("content-security-policy");
    assert.match(csp, /script-src 'self';/); assert.doesNotMatch(csp, /unsafe-inline/);
    assert.doesNotMatch(r.t, /<script(?![^>]*\bsrc=)[^>]*>|\son[a-z]+=|<style|style="/i, j + ": skrip/gaya inline akan diblokir CSP");
  }
});
