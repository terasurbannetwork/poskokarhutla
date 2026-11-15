/* Paritas bencana PB-30: GET /api/pb/ringkas (src/pb_ringkas.js, src/hak.js pbRingkas*) di workerd (Miniflare) dengan D1 sungguhan.
   Dibuktikan: hak baca (tamu 403), berkas ringkas dibaca apa adanya (null tetap null, mati/basi tampil), hitungan renlap/kepatuhan/tindakan/SK dengan sumber dan waktu,
   renlap versi lama tidak dihitung, kueri SEARCH, tanpa tabel = null, cache isolate berkunci wilayah (tanpa saklar PB_TANPA_CACHE).
   Jalankan: node --test tests/warga/pb_ringkas.test.mjs */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import "../../src/worker.js";   // dahulu: impor sirkular
import {siapkan, berantai, MOD2, ADMIN, sha256} from "./_bnpb.mjs";
import {migrasi} from "./_bantu.mjs";
import {PB_SQL_RINGKAS} from "../../src/hak.js";
import REGISTRY from "../../src/bencana.generated.js";

const uji = berantai();
const hari = d => new Date(Date.now() + 7 * 36e5 + d * 864e5).toISOString().slice(0, 10);
const id = c => c.repeat(16);
const stafDi = async (U, nama, wil) => {
  const tok = (nama === "satu" ? "5" : "6").repeat(64), sid = "st" + nama.padEnd(14, "0");
  await U.DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, 'Staf', ?, 'Pusdalops', ?, ?, '["pusdalops"]', ?, ?, ?, 0, 1, 'tes', 0)`).bind(sid, "pb" + nama, "93" + wil.join("") + nama.length, nama + "@b.id", "6281300" + wil.join("") + nama.length, JSON.stringify(wil), "b".repeat(32), "a".repeat(64)).run();
  await U.DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), sid, Date.now() + 3600e3).run();
  return {cookie: "sesi_staf=" + tok, "x-pb": "1"};
};
const renlap = (U, i, bencana, prov, kab, tgl, versi, status, target) => U.DB.prepare("INSERT INTO pb_renlap (id, bencana, prov, kab, tanggal, versi, status, jml_target, oleh, dibuat, diubah) VALUES (?,?,?,?,?,?,?,?, 'staf:x', 1, 1)").bind(i, bencana, prov, kab, tgl, versi, status, target).run();
const hasil = (U, rid, no, did) => U.DB.prepare("INSERT INTO pb_renlap_hasil (renlap_id, target_no, didatangi, alasan, oleh, waktu) VALUES (?,?,?,?, 'staf:x', 1)").bind(rid, no, did, did === 0 ? "cuaca" : null).run();
const per = (r, b) => r.j.bencana.find(x => x.id === b);

{
  const U = await siapkan("uji-pb-ringkas", {ikat: {PB_TANPA_CACHE: "1"}});
  const kini = Date.now();
  const ringkas = (q = "", h = MOD2) => U.api("GET", "/api/pb/ringkas" + q, undefined, h);

  uji("tamu 403; bencana dan prov ngawur 400", async () => {
    assert.equal((await ringkas("", {})).s, 403);
    assert.equal((await ringkas("?bencana=xyz")).s, 400);
    assert.equal((await ringkas("?prov=../")).s, 400);
  });

  uji("berkas ringkas apa adanya: karhutla mati dan basi tampil, angka null tetap null; semua bencana registri", async () => {
    const r = await ringkas(); assert.equal(r.s, 200, r.t);
    assert.equal(r.j.bencana.length, REGISTRY.bencana.length);
    const k = per(r, "karhutla"); assert.equal(k.ringkas.bencana, "karhutla"); assert.equal(k.ringkas.angka.kejadian_30h, null);
    assert.ok(k.ringkas.basi === true || k.ringkas.basi === false); assert.ok(k.ringkas.angka_meta);
    assert.deepEqual((await ringkas("?bencana=banjir")).j.bencana.map(x => x.id), ["banjir"]);
    assert.match(r.h.get("cache-control"), /no-store/);
  });

  uji("hitungan operasi: renlap terbit, versi lama tersingkir, kepatuhan, tindakan terbuka, SK; tiap angka bersumber dan berwaktu", async () => {
    await renlap(U, id("1"), "banjir", "32", "3273", hari(0), 1, "terbit", 4);
    await renlap(U, id("2"), "banjir", "32", "3273", hari(0), 2, "terbit", 5);      // versi baru mengalahkan v1
    await renlap(U, id("3"), "banjir", "32", "3204", hari(-3), 1, "selesai", 5);
    await renlap(U, id("4"), "banjir", "32", "3205", hari(0), 1, "draf", 9);        // draf tidak dihitung
    await hasil(U, id("2"), 1, 1); await hasil(U, id("2"), 2, 0); await hasil(U, id("3"), 1, 1); await hasil(U, id("1"), 1, 1);   // hasil v1 tidak dihitung
    await U.DB.prepare("INSERT INTO peringatan (kunci, jenis, tingkat, prov, kab, judul, sumber, dibuat, berlaku_hingga) VALUES ('banjir:r:1', 'banjir', 'Siaga', '32', 'Bandung', 'j', 'BMKG', ?, ?)").bind(kini - 1000, kini + 36e5).run();
    await U.DB.prepare("INSERT INTO pb_tindakan (peringatan, butir, selesai, waktu) VALUES ('banjir:r:1', 1, 0, 1), ('banjir:r:1', 2, 1, 1), ('banjir:r:1', 3, 0, 1)").run();
    await U.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, status, terakhir, dibuat, diubah) VALUES (?, 'banjir', '32', 'Bandung', ?, 'buka', 1, 1, 1)").bind(id("9"), hari(-9)).run();
    await U.DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tmt_mulai, tmt_selesai, perpanjangan_ke, dibuat) VALUES (?, ?, 'siaga', 'kab', 'SK-1', ?, ?, 0, 1)").bind(id("a"), id("9"), hari(-5), hari(3)).run();
    const b = per(await ringkas(), "banjir").operasi;
    assert.equal(b.renlap_terbit_hari_ini.nilai, 1); assert.equal(b.renlap_terbit_30h.nilai, 2);
    assert.equal(b.kepatuhan_persen.nilai, 20);          // 2 didatangi (v2 no1, selesai no1) dari target 5 + 5
    assert.equal(b.tindakan_terbuka.nilai, 2); assert.equal(b.sk_berlaku.nilai, 1); assert.equal(b.sk_berakhir_7h.nilai, 1);
    for (const a of Object.values(b)) { assert.ok(a.sumber.startsWith("d1:")); assert.ok(!isNaN(Date.parse(a.waktu))); }
    const l = per(await ringkas(), "pesisir").operasi; assert.equal(l.renlap_terbit_30h.nilai, 0); assert.equal(l.kepatuhan_persen.nilai, null);
    assert.ok(!/staf:x|oleh/.test((await ringkas()).t), "tanpa pembuat");
  });
}

uji("kueri ringkas SEARCH, bukan SCAN tabel besar", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  const sql = [PB_SQL_RINGKAS.renlap, PB_SQL_RINGKAS.didatangi, PB_SQL_RINGKAS.tindakan("peringatan"), PB_SQL_RINGKAS.tindakan("peringatan_x")];
  for (const q of sql) {
    const p = db.prepare("EXPLAIN QUERY PLAN " + q).all().map(r => r.detail).filter(d => /^SCAN (r|n|h|x|pb_renlap|pb_renlap_hasil|pb_tindakan)\b/.test(d));
    assert.deepEqual(p, [], q.slice(0, 60));
  }
});

uji("tanpa tabel pb_* dan logbook (migrasi lama): angka null, bukan 500", async () => {
  const U = await siapkan("uji-pb-ringkas-lama", {sampai: "0094_"});
  const r = await U.api("GET", "/api/pb/ringkas", undefined, MOD2); assert.equal(r.s, 200, r.t);
  assert.equal(per(r, "banjir").operasi.renlap_terbit_30h.nilai, null); assert.equal(per(r, "banjir").operasi.sk_berlaku.nilai, null);
});

uji("cache isolate nyata: staf 32, pemirsa nasional, staf 14 dalam 5 menit, tiap respons hanya wilayahnya", async () => {
  const U = await siapkan("uji-pb-ringkas-cache");   // tanpa PB_TANPA_CACHE
  const k = (i, prov, kab) => U.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, status, terakhir, dibuat, diubah) VALUES (?, 'banjir', ?, ?, ?, 'buka', 1, 1, 1)").bind(i, prov, kab, hari(-9)).run();
  const s = (i, kid, nomor) => U.DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tmt_mulai, tmt_selesai, perpanjangan_ke, dibuat) VALUES (?, ?, 'siaga', 'kab', ?, ?, ?, 0, 1)").bind(i, kid, nomor, hari(-5), hari(20)).run();
  await k(id("1"), "32", "Bandung"); await k(id("2"), "14", "Siak"); await k(id("3"), "14", "Rohul"); await s(id("a"), id("1"), "SK-32"); await s(id("b"), id("2"), "SK-14"); await s(id("c"), id("3"), "SK-14B");
  await renlap(U, id("5"), "banjir", "32", "3273", hari(0), 1, "terbit", 3); await renlap(U, id("6"), "banjir", "14", "1401", hari(0), 1, "terbit", 3); await renlap(U, id("7"), "banjir", "14", "1402", hari(0), 1, "terbit", 3);
  const n = async h => { const r = await U.api("GET", "/api/pb/ringkas", undefined, h); assert.equal(r.s, 200, r.t); const o = per(r, "banjir").operasi; return [o.sk_berlaku.nilai, o.renlap_terbit_hari_ini.nilai]; };
  const h32 = await stafDi(U, "satu", ["32"]), h14 = await stafDi(U, "dua", ["14"]);
  const buat = await U.api("POST", "/api/pemirsa/admin/buat", {nama: "Dir Dalops", tab: ["pusdalops"]}, ADMIN); assert.equal(buat.s, 201, buat.t);
  const m = await U.mf.dispatchFetch("https://centurisk97.id/admin/masuk", {method: "POST", redirect: "manual", headers: {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id"}, body: new URLSearchParams({email: buat.j.username, sandi: buat.j.sandi}).toString()});
  const hP = {cookie: m.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0]};
  assert.deepEqual(await n(h32), [1, 1]);
  assert.deepEqual(await n(hP), [3, 3]);
  assert.deepEqual(await n(h14), [2, 2]);
  assert.equal((await U.api("GET", "/api/pb/ringkas?prov=14", undefined, h32)).s, 403);
  await U.DB.prepare("DELETE FROM logbook_sk").run(); await U.DB.prepare("DELETE FROM pb_renlap").run();   // bukti cache: jawaban ke-5 masih dari isolate
  assert.deepEqual(await n(h32), [1, 1]);
});
