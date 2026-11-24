/* Paritas bencana PB-11 (src/pb_isian.js `penulis`, KEAMANAN-PRIVASI.md 2): matriks hak tulis /api/pb/titik di workerd (Miniflare) dengan D1 sungguhan.
   Akun instansi pemprov/pemkab/pemkot aktif menulis hanya untuk prov akunnya; tingkat kab hanya kab hasil pemetaan kunci_wilayah -> kode BPS (kode.json).
   Jalankan: node --test tests/warga/pb_hak.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";
import {denganProfil, profilAktif} from "./_profil.mjs";

const uji = berantai();
const REG = JSON.stringify({pesisir: {operasi: true, renlap: {sarana: ["alat_berat", "tenda"]}}});
const {DB, api, n} = await siapkan("uji-pb-hak", {ikat: {PB_REGISTRI: REG}});
const WA = {a: "628120000001", b: "628120000002", c: "628120000003", d: "628120000004", e: "628120000005", f: "628120000006"};
let u = 0;
async function akun(kode, jenis, tingkat, prov, kab, {status = "aktif", wajib = 0} = {}) {
  const id = String(++u).padStart(16, "0"), tok = String(u).padStart(64, "a");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, ?, ?, 'Wilayah uji', ?, ?, ?, ?, ?, ?, ?, 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, ?, 1)`)
    .bind(id, "akunuji" + u, jenis, tingkat, kab ? `${prov}|${kab}` : prov, JSON.stringify([prov]), tingkat === "kab" ? prov : null, kab, "g".repeat(32), "0".repeat(64), status, `a${u}@b.id`, WA[kode] ?? "628120009999", wajib).run();
  await DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 3600e3).run();
  return {id, h: {...(await denganProfil(DB, id, {cookie: "sesi_instansi=" + tok})), "x-pb": "1", origin: "http://bnpb.lokal"}};   // akun BPBD: sesi profil (paket profil-bpbd)
}
const kotaBdg = await akun("a", "pemkot", "kab", "32", "Kota Bandung");
const kabBdg = await akun("b", "pemkab", "kab", "32", "Bandung");
const prov32 = await akun("c", "pemprov", "prov", "32", null);
const nonaktif = await akun("d", "pemkot", "kab", "32", "Kota Bekasi", {status: "menunggu"});
const polres = await akun("e", "polres", "kab", "32", "Kota Bandung");
const ganti = await akun("f", "pemkab", "kab", "32", "Garut", {wajib: 1});
const tanpaPeta = await akun("f", "pemkab", "kab", "32", "Kabupaten Ngarang");
const besarKecil = await akun("f", "pemkot", "kab", "32", "kota bandung");   // pemetaan persis (peka huruf besar/kecil): kunci_nama di kode.json "32|Kota Bandung"
const dummy = await akun("f", "pemkot", "kab", "32", "Kota Cimahi"); await DB.prepare("UPDATE instansi_akun SET dummy = 1 WHERE id = ?").bind(dummy.id).run();
const pos = (b, h) => api("POST", "/api/pb/titik", b, h);
const T = (o = {}) => ({bencana: "pesisir", golongan: "sarana", jenis: "tenda", prov: "32", kab: "3273", nama: "Gudang BPBD Uji", lat: -6.9, lon: 107.6, kapasitas: 10, ...o});
let idKota;

uji("pemkot Bandung menulis kab 3273: 201, oleh instansi:<id> di pb_titik dan pb_log", async () => {
  const r = await pos(T(), kotaBdg.h); assert.equal(r.s, 201, r.t); idKota = r.j.id;
  assert.equal((await DB.prepare("SELECT oleh FROM pb_titik WHERE id = ?").bind(idKota).first()).oleh, "instansi:" + kotaBdg.id);
  assert.equal(await n("pb_log", `oleh = 'instansi:${kotaBdg.id}' AND aksi = 'isi'`), 1);
});

uji("pemkot: kab lain, prov lain, tanpa kab = 403 dan tanpa baris baru", async () => {
  const sebelum = await n("pb_titik", "1");
  for (const o of [{kab: "3204"}, {kab: "3271"}, {kab: ""}, {prov: "31", kab: "3171"}]) assert.equal((await pos(T(o), kotaBdg.h)).s, 403, JSON.stringify(o));
  assert.equal(await n("pb_titik", "1"), sebelum);
});

uji("pemkab Bandung (3204) lolos untuk 3204 dan ditolak untuk 3273: nama mirip tidak tertukar kab/kota", async () => {
  assert.equal((await pos(T({kab: "3204"}), kabBdg.h)).s, 201);
  assert.equal((await pos(T({kab: "3273"}), kabBdg.h)).s, 403);
});

uji("pemprov: seluruh prov 32 (kab apa pun dan tingkat prov), prov lain 403", async () => {
  for (const kab of ["3273", "3204", ""]) assert.equal((await pos(T({kab}), prov32.h)).s, 201, kab);
  assert.equal((await pos(T({prov: "31", kab: "3171"}), prov32.h)).s, 403);
});

uji("akun nonaktif, jenis lain (polres), wajib ganti sandi, dan kab tak terpetakan semuanya 403", async () => {
  for (const a of [nonaktif, polres, ganti, tanpaPeta, besarKecil, dummy]) assert.equal((await pos(T({kab: "3273"}), a.h)).s, 403);
  assert.equal((await pos(T({kab: "3273"}), {cookie: "sesi_instansi=" + "9".repeat(64), "x-pb": "1"})).s, 403);   // sesi tak dikenal
  await DB.prepare("UPDATE instansi_akun SET status = 'dicabut' WHERE id = ?").bind(prov32.id).run();
  assert.equal((await pos(T(), prov32.h)).s, 403);   // dicabut = dicek ulang tiap permintaan
  await DB.prepare("UPDATE instansi_akun SET status = 'aktif' WHERE id = ?").bind(prov32.id).run();
});

uji("tamu dan akun gerbang 403 sebelum body dibaca (body rusak tetap 403, bukan 400)", async () => {
  for (const h of [{}, GERBANG]) { assert.equal((await pos("bukan json", h)).s, 403); assert.equal((await pos(T({bencana: "xyz"}), h)).s, 403); }
  assert.equal((await pos("bukan json", kotaBdg.h)).s, 400);   // akun sah: body baru dibaca
});

uji("ubah dan hapus: akun hanya menyentuh baris wilayahnya (IDOR), baris tak berubah", async () => {
  const lain = (await pos(T({kab: "3204", nama: "Milik Kab"}), kabBdg.h)).j.id;
  const sebelum = await DB.prepare("SELECT nama, dihapus FROM pb_titik WHERE id = ?").bind(lain).first();
  assert.equal((await pos(T({id: lain, kab: "3204", nama: "Dibajak"}), kotaBdg.h)).s, 403);
  assert.equal((await api("POST", "/api/pb/titik/hapus", {id: lain, alasan: "coba hapus"}, kotaBdg.h)).s, 403);
  assert.deepEqual(await DB.prepare("SELECT nama, dihapus FROM pb_titik WHERE id = ?").bind(lain).first(), sebelum);
  assert.equal((await pos(T({id: idKota, nama: "Gudang Diperbarui"}), kotaBdg.h)).s, 200);
  assert.equal((await api("POST", "/api/pb/titik/hapus", {id: idKota, alasan: "salah ketik"}, kotaBdg.h)).s, 200);
  assert.equal(await n("pb_log", `oleh = 'instansi:${kotaBdg.id}'`), 3);   // isi, ubah, hapus
});

uji("moderator nasional dan staf berwilayah tetap sesuai matriks; instansi tidak mewarisi hak moderator", async () => {
  assert.equal((await pos(T({prov: "31", kab: "3171"}), MOD2)).s, 201);
  assert.equal((await pos(T(), GERBANG)).s, 403);
  const tok = "5".repeat(64), id = "staf0000pbhak001";
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, 'pbhakstaf', 'Staf', '920011', 'Pusdalops', 's@b.id', '628120000099', '["pusdalops"]', '["32"]', ?, ?, 0, 1, 'tes', 0)`).bind(id, "a".repeat(32), "0".repeat(64)).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 3600e3).run();
  const h = {cookie: "sesi_staf=" + tok, "x-pb": "1"};
  assert.equal((await pos(T(), h)).s, 201);
  assert.equal((await pos(T({prov: "31", kab: "3171"}), h)).s, 403);
  assert.equal((await DB.prepare("SELECT oleh FROM pb_titik ORDER BY dibuat DESC LIMIT 1").first()).oleh, "staf:" + id);
});

uji("CSRF: cookie sesi_instansi dengan Origin kosong atau \"null\" tanpa Sec-Fetch-Site same-origin = 403; origin asing 403; same-origin sah", async () => {
  const c = kotaBdg.h.cookie, sebelum = await n("pb_titik", "1");
  for (const h of [{cookie: c, "x-pb": "1", origin: "null"}, {cookie: c, "x-pb": "1"}, {cookie: c, "x-pb": "1", origin: "https://jahat.example"}, {cookie: c, "x-pb": "1", origin: "null", "sec-fetch-site": "cross-site"}])
    assert.equal((await pos(T(), h)).s, 403, JSON.stringify(h));
  assert.equal(await n("pb_titik", "1"), sebelum);
  assert.equal((await pos(T(), {cookie: c, "x-pb": "1", origin: "null", "sec-fetch-site": "same-origin"})).s, 201);
});

uji("kode.json gagal dimuat (ASSETS 500 atau JSON rusak) = 403 untuk akun tingkat kab, bukan 500", async () => {
  for (const [nama, balas] of [["uji-pb-hak-500", () => new Response("x", {status: 500})], ["uji-pb-hak-rusak", () => new Response("{bukan json")]]) {
    const U = await siapkan(nama, {ikat: {PB_REGISTRI: REG}, asetKu: async () => balas()});
    await U.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
      VALUES ('0000000000000099', 'akunujix', 'pemkot', 'kab', 'Wil', '32|Kota Bandung', '["32"]', '32', 'Kota Bandung', ?, ?, 'aktif', 'P Uji', '19800101', 'Kasi', 'BPBD', 'x@b.id', '628120000077', 1, 1, 0, 1)`).bind("g".repeat(32), "0".repeat(64)).run();
    await U.DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, '0000000000000099', 1, ?)").bind(sha256("b".repeat(64)), Date.now() + 3600e3).run();
    const r = await U.api("POST", "/api/pb/titik", T(), {cookie: "sesi_instansi=" + "b".repeat(64) + "; " + (await profilAktif(U.DB, "0000000000000099")).cookie, "x-pb": "1", origin: "http://bnpb.lokal"});
    assert.equal(r.s, 403, nama + r.t);
  }
});
