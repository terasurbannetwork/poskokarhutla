/* Meja Kerja (src/meja.js, src/meja_spek.js, migrations/0026_meja.sql): worker utuh di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/warga/meja.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import "../../src/worker.js";   // worker.js dulu: posko.js dan worker.js saling impor
import {MEJA, DAFTAR_MEJA, PASANGAN, BARANG, BENCANA, AMBANG, RAPOR, validasi, statusEfektif, tandaBahaya} from "../../src/meja_spek.js";
import {gabungSkor, skorRespons} from "../../src/meja.js";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const uji = berantai(), JAM = 3600e3, HARI = 24 * JAM, MENIT = 60e3, wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
const U = await siapkan("uji-meja"), {DB, api, adm} = U;
const hex = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const KINI = Date.now(), hari = (h = 0) => wib(KINI - h * HARI);

const kaji = (o = {}) => ({kejadian: "banjir", tanggal: hari(1), rumah_rb: 1, rumah_rs: 2, rumah_rr: 3, sekolah: 0, faskes: 0, ibadah: 1, jalan_km: 1.5, jembatan: 0, meninggal: 0, hilang: 0, luka: 2, mengungsi: 40, ...o});
const logis = (o = {}) => ({barang: "beras", jumlah_diminta: 100, satuan: "kg", posko: "Posko Uji", kebutuhan_untuk: 50, ...o});
const dsp = (o = {}) => ({kejadian: "Banjir Uji", nomor_permohonan: "DSP/UJI/1", nilai_diajukan: 1000000, tgl_ajuan: hari(5), ...o});
const baru = (h, meja, prov, kab, data, extra = {}) => api("POST", "/api/meja/catatan", {meja, prov, kab, data, ...extra}, h);
const petugas = async (kab, meja, prov = "71", nama = "Petugas Uji") => {
  const r = await adm("POST", "/api/meja/petugas", {nama, prov, kab, meja}); assert.equal(r.s, 201, r.t);
  assert.match(r.j.kode, /^[0-9a-f]{26}$/); assert.ok(r.j.tautan.endsWith("/meja#k=" + r.j.kode));
  return {id: r.j.petugas.id, h: {"x-kode": r.j.kode}, kode: r.j.kode};
};
const mulai = async (id, h, r = {}) => DB.prepare("UPDATE meja_catatan SET dibuat = ?, diubah = ? WHERE id = ?").bind(KINI - r.umurJam * JAM, KINI - r.umurJam * JAM, id).run();

uji("migrasi idempoten: berkas 0026 jalan dua kali tanpa galat dan tanpa mengubah baris", async () => {
  const sql = pecah(readFileSync(path.join(AKAR, "migrations/0026_meja.sql"), "utf8"));
  assert.ok(sql.length === 7);
  await DB.batch(sql.map(s => DB.prepare(s)));
  await DB.batch(sql.map(s => DB.prepare(s)));
  assert.equal(await U.n("meja_catatan"), 0);
  assert.ok(migrasi().includes("meja_petugas_sah"));
});

uji("CHECK dan trigger D1 sama persis dengan spek: pasangan meja x status, transisi, larik meja petugas, isi liar", async () => {
  const semuaStatus = [...new Set(DAFTAR_MEJA.flatMap(m => MEJA[m].status)), "bogus"];
  const sisip = async (meja, status, over = {}) => {
    try {
      await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah) VALUES (?, ?, '71', 'Kab Cek', ?, ?, ?, ?, 1, 1)")
        .bind(over.id ?? hex(), meja, "Kec Cek", "Desa Cek", over.data ?? "{}", status).run(); return true;
    } catch (e) { return false; }
  };
  for (const m of DAFTAR_MEJA) for (const s of semuaStatus) assert.equal(await sisip(m, s), MEJA[m].status.includes(s), `${m}:${s}`);
  assert.equal(await sisip("tidakada", "tercatat"), false, "meja liar");
  assert.equal(await sisip("kaji_cepat", "dilaporkan", {data: "bukan json"}), false, "json_valid");
  assert.equal(await sisip("kaji_cepat", "dilaporkan", {data: "[1]"}), false, "bukan objek");
  assert.equal(await sisip("kaji_cepat", "dilaporkan", {data: JSON.stringify({x: "a".repeat(6001)})}), false, "terlalu panjang");
  /* desa wajib untuk kaji cepat dan destana, kecamatan untuk destana */
  const tanpa = async (meja, status, kec, desa) => { try { await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah) VALUES (?, ?, '71', 'Kab Cek', ?, ?, '{}', ?, 1, 1)").bind(hex(), meja, kec, desa, status).run(); return true; } catch (e) { return false; } };
  assert.equal(await tanpa("kaji_cepat", "dilaporkan", null, null), false); assert.equal(await tanpa("destana", "tercatat", null, "Desa Cek"), false);
  assert.equal(await tanpa("logistik", "diminta", null, null), true);
  /* transisi: semua pasangan dari x ke */
  let diuji = 0;
  for (const m of DAFTAR_MEJA) for (const d of MEJA[m].status) for (const k of MEJA[m].status) {
    if (d === k) continue;
    const id = hex(); assert.ok(await sisip(m, d, {id}));
    let ok = true; try { await DB.prepare("UPDATE meja_catatan SET status = ? WHERE id = ?").bind(k, id).run(); } catch (e) { ok = false; }
    assert.equal(ok, PASANGAN.includes(`${m}:${d}>${k}`), `${m}:${d}>${k}`); diuji++;
  }
  assert.ok(diuji >= 20);
  const id = hex(); await sisip("logistik", "diminta", {id});
  for (const [kol, nilai] of [["meja", "dsp"], ["prov", "72"], ["kab", "Lain"]]) {
    let ok = true; try { await DB.prepare(`UPDATE meja_catatan SET ${kol} = ? WHERE id = ?`).bind(nilai, id).run(); } catch (e) { ok = false; }
    assert.equal(ok, false, "tidak boleh mengubah " + kol);
  }
  /* petugas: larik meja */
  const pet = async meja => { try { await DB.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'Uji Cek', '71', 'Kab Cek', ?, ?, 1)").bind(hex(), meja, hex() + hex() + hex() + hex()).run(); return true; } catch (e) { return false; } };
  assert.equal(await pet('["dsp","renkon"]'), true); assert.equal(await pet('["dsp","dsp"]'), false); assert.equal(await pet('["liar"]'), false); assert.equal(await pet("[]"), false); assert.equal(await pet("dsp"), false);
  await DB.batch([DB.prepare("DELETE FROM meja_catatan"), DB.prepare("DELETE FROM meja_petugas")]);
});

uji("validasi spek: kolom liar, tipe salah, di luar rentang, tautan, tipe ya, tahap", async () => {
  const buat = d => baru(ADMIN, "kaji_cepat", "71", "Kab Val", d, {desa: "Desa Val"});
  assert.equal((await buat(kaji())).s, 201);
  for (const [salah, d] of [["kolom liar", kaji({admin: 1})], ["__proto__ liar", JSON.parse('{"__proto__x":1,' + JSON.stringify(kaji()).slice(1))], ["angka teks", kaji({rumah_rb: "abc"})], ["pecahan pada bulat", kaji({rumah_rb: 1.5})], ["negatif", kaji({meninggal: -1})],
    ["terlalu besar", kaji({rumah_rr: 1e7})], ["bencana liar", kaji({kejadian: "ufo"})], ["tanggal ngawur", kaji({tanggal: "2026-02-31"})], ["tanggal masa depan", kaji({tanggal: hari(-30)})], ["tautan javascript", kaji({foto: "javascript:alert(1)"})],
    ["tautan ftp", kaji({foto: "ftp://x.id/a"})], ["tautan berspasi", kaji({foto: "https://x.id/a b"})], ["tautan userinfo", kaji({foto: "https://u:p@x.id/a"})], ["wajib hilang", (({rumah_rb, ...s}) => s)(kaji())],
    ["tahap lain", kaji({jumlah_kirim: 3})], ["objek di angka", kaji({luka: {a: 1}})]]) {
    const r = await buat(d); assert.equal(r.s, 400, `${salah}: ${r.t}`); assert.ok(r.j.galat);
  }
  assert.equal((await buat(kaji({foto: "https://contoh.id/foto.jpg"}))).s, 201);
  assert.equal((await baru(ADMIN, "kaji_cepat", "71", "Kab Val", kaji())).s, 400, "desa wajib");
  assert.equal((await baru(ADMIN, "meja_ngawur", "71", "Kab Val", {})).s, 400);
  assert.equal((await baru(ADMIN, "kaji_cepat", "7", "Kab Val", kaji(), {desa: "Desa Val"})).s, 400, "prov 2 digit");
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "logistik", prov: "71", kab: "Kab Val", data: logis(), tambahan: 1})).s, 400, "kunci atas liar");
  assert.equal((await baru(ADMIN, "logistik", "71", "Kab Val", logis({barang: "emas"}))).s, 400);
  assert.equal((await baru(ADMIN, "destana", "71", "Kab Val", {kelas: "madya", tahun_dibentuk: 2020, indikator: ["tim_siaga", "tim_siaga"]}, {desa: "Desa V", kec: "Kec V"})).s, 400, "multi duplikat");
  assert.equal((await baru(ADMIN, "destana", "71", "Kab Val", {kelas: "madya", tahun_dibentuk: 2020}, {desa: "Desa V"})).s, 400, "kecamatan wajib");
  assert.equal((await baru(ADMIN, "dsp", "71", "Kab Val", dsp({nilai_diajukan: 1e14}))).s, 400);
  assert.equal((await baru(ADMIN, "renkon", "71", "Kab Val", {bencana: "banjir", judul: "R", tgl_sah: hari(10), berlaku_sampai: hari(20)})).s, 400, "berlaku_sampai sebelum tgl_sah");
  assert.equal((await api("POST", "/api/meja/catatan", "{bukan json", ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/meja/catatan", "x".repeat(5000), ADMIN)).s, 413);
  /* fungsi murni: tipe ya, isian awal vs tahap */
  assert.equal(BARANG.length, 15); assert.ok(BENCANA.includes("karhutla"));
  const ya = MEJA.dsp.kolom; MEJA.dsp.kolom = [{nama: "setuju", label: "Setuju", tipe: "ya", wajib: true}];
  try { assert.deepEqual(validasi("dsp", {setuju: true}, null), {data: {setuju: true}}); assert.ok(validasi("dsp", {setuju: "ya"}, null).galat); assert.ok(validasi("dsp", {}, null).galat); } finally { MEJA.dsp.kolom = ya; }
  assert.ok(validasi("logistik", {jumlah_kirim: 5, tgl_kirim: hari(0)}, "dikirim").data, "tahap dikirim menerima kolom tahapnya");
  assert.ok(validasi("logistik", {jumlah_kirim: 5, tgl_kirim: hari(0), barang: "beras"}, "dikirim").galat, "kolom awal ditolak di tahap");
  assert.equal(await U.n("meja_catatan"), 2);
});

uji("status turunan renkon dan destana benar di tepi tanggal (fungsi murni)", async () => {
  const kini = Date.parse("2026-10-19T05:00:00Z"), h = "2026-10-19", plus = n => wib(Date.parse(h + "T12:00:00Z") + n * HARI);
  const rk = (sampai, uji) => statusEfektif("renkon", {data: {berlaku_sampai: sampai, ...(uji ? {uji_terakhir: uji} : {})}}, kini);
  assert.equal(rk(plus(-1), plus(-10)), "kedaluwarsa", "kemarin = kedaluwarsa");
  assert.equal(rk(plus(0), plus(-10)), "segera_habis", "hari ini masih berlaku (segera habis)");
  assert.equal(rk(plus(90), plus(-10)), "segera_habis", "tepat 90 hari = segera habis");
  assert.equal(rk(plus(91), plus(-10)), "berlaku", "91 hari = berlaku");
  assert.equal(rk(plus(200), plus(-365)), "berlaku", "uji tepat 365 hari lalu masih sah");
  assert.equal(rk(plus(200), plus(-366)), "belum_diuji", "uji 366 hari lalu");
  assert.equal(rk(plus(200), null), "belum_diuji", "tanpa uji");
  assert.equal(rk(plus(30), plus(-400)), "segera_habis", "kedaluwarsa > segera_habis > belum_diuji");
  assert.equal(rk(plus(-5), null), "kedaluwarsa");
  const ds = keg => statusEfektif("destana", {data: keg ? {kegiatan_terakhir: keg} : {}}, kini);
  assert.equal(ds("2025-10-19"), "aktif", "tepat 12 bulan lalu = aktif");
  assert.equal(ds("2025-10-18"), "pasif", "12 bulan + 1 hari = pasif");
  assert.equal(ds("2026-10-19"), "aktif"); assert.equal(ds(null), "pasif");
  assert.equal(statusEfektif("kaji_cepat", {status: "diverifikasi", data: {}}, kini), "diverifikasi");
  /* Februari: 29 Feb 2028 mundur 12 bulan = 29 Feb 2027 yang tidak ada; setUTCMonth menormalkan ke 1 Mar 2027 */
  assert.equal(statusEfektif("destana", {data: {kegiatan_terakhir: "2027-03-01"}}, Date.parse("2028-02-29T05:00:00Z")), "aktif");
  /* tanda bahaya di tepi */
  const rec = (status, dibuat, data = {}) => ({status, dibuat, data});
  assert.deepEqual(tandaBahaya("logistik", rec("diminta", kini - 24 * JAM, logis()), kini), [], "tepat 24 jam belum bahaya");
  assert.deepEqual(tandaBahaya("logistik", rec("diminta", kini - 24 * JAM - 1, logis()), kini), ["belum_disetujui"]);
  assert.deepEqual(tandaBahaya("logistik", rec("disetujui", kini - 99 * JAM, logis()), kini), []);
  assert.deepEqual(tandaBahaya("logistik", rec("diterima", kini, {jumlah_kirim: 5, jumlah_terima: 5}), kini), []);
  assert.deepEqual(tandaBahaya("logistik", rec("diterima", kini, {jumlah_kirim: 5, jumlah_terima: 4}), kini), ["selisih_terima"]);
  assert.deepEqual(tandaBahaya("dsp", rec("cair", kini, {tgl_cair: plus(-30)}), kini), [], "30 hari belum bahaya");
  assert.deepEqual(tandaBahaya("dsp", rec("cair", kini, {tgl_cair: plus(-31)}), kini), ["spj_terlambat"]);
  assert.deepEqual(tandaBahaya("dsp", rec("spj", kini, {tgl_cair: plus(-99)}), kini), [], "sudah SPJ");
  assert.deepEqual(tandaBahaya("kaji_cepat", rec("dilaporkan", kini - 73 * JAM), kini), ["belum_diverifikasi"]);
  assert.equal(AMBANG.logistik_setuju_jam, 24);
});

uji("isolasi: petugas kab A tidak bisa membaca atau menulis kab B, dan hanya mejanya", async () => {
  const pa = await petugas("Kab Iso A", ["kaji_cepat", "logistik"]), pb = await petugas("Kab Iso B", ["kaji_cepat", "dsp"]);
  const a1 = await baru(pa.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa A1"}); assert.equal(a1.s, 201, a1.t);
  assert.equal(a1.j.catatan.kab, "Kab Iso A"); assert.equal(a1.j.catatan.prov, "71");
  const b1 = await baru(pb.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa B1"}); assert.equal(b1.s, 201);
  /* baca */
  const la = await api("GET", "/api/meja/catatan?meja=kaji_cepat", undefined, pa.h);
  assert.equal(la.s, 200); assert.deepEqual(la.j.catatan.map(c => c.id), [a1.j.catatan.id]);
  assert.ok(!la.t.includes("Kab Iso B") && !la.t.includes(b1.j.catatan.id));
  assert.equal((await api("GET", "/api/meja/catatan/" + b1.j.catatan.id, undefined, pa.h)).s, 404, "id kab lain = 404, bukan 403");
  assert.equal((await api("GET", "/api/meja/catatan/" + a1.j.catatan.id, undefined, pa.h)).s, 200);
  assert.equal((await api("GET", "/api/meja/catatan?meja=dsp", undefined, pa.h)).s, 403, "meja tak diizinkan");
  assert.equal((await api("GET", "/api/meja/catatan?meja=dsp&kab=Kab%20Iso%20B&prov=71", undefined, pa.h)).s, 403);
  assert.equal((await api("GET", "/api/meja/catatan?meja=kaji_cepat&kab=Kab%20Iso%20B", undefined, pa.h)).j.catatan.length, 1, "parameter kab diabaikan untuk petugas");
  /* tulis */
  assert.equal((await baru(pa.h, "kaji_cepat", "71", "Kab Iso B", kaji(), {desa: "Desa B"})).s, 403, "isi untuk kab lain");
  assert.equal((await baru(pa.h, "kaji_cepat", "72", "Kab Iso A", kaji(), {desa: "Desa B"})).s, 403, "provinsi lain");
  assert.equal((await baru(pa.h, "dsp", undefined, undefined, dsp())).s, 403, "meja tak diizinkan");
  assert.equal((await api("POST", "/api/meja/catatan/" + b1.j.catatan.id, {aksi: "status", ke: "diverifikasi"}, pa.h)).s, 404);
  assert.equal((await api("POST", "/api/meja/catatan/" + b1.j.catatan.id, {aksi: "ubah", data: kaji()}, pa.h)).s, 404);
  assert.equal((await api("GET", "/api/meja/catatan/" + b1.j.catatan.id, undefined, pb.h)).j.catatan.status, "dilaporkan", "kab B utuh");
  /* kode: salah, kosong, dicabut, token admin tidak dipakai sebagai kode */
  assert.equal((await api("GET", "/api/meja/catatan?meja=kaji_cepat", undefined, {"x-kode": "0".repeat(26)})).s, 403);
  assert.equal((await api("GET", "/api/meja/catatan?meja=kaji_cepat")).s, 403);
  assert.equal((await api("GET", "/api/meja/catatan?meja=kaji_cepat", undefined, {"x-kode": "bukan-hex"})).s, 403);
  const s = await api("GET", "/api/meja/saya", undefined, pa.h); assert.equal(s.j.petugas.kab, "Kab Iso A"); assert.ok(!("kode" in s.j.petugas));
  const cabut = await adm("POST", "/api/meja/petugas/" + pa.id, {aksi: "cabut"}); assert.equal(cabut.s, 200);
  assert.equal((await adm("POST", "/api/meja/petugas/" + pa.id, {aksi: "cabut"})).s, 409);
  assert.equal((await api("GET", "/api/meja/catatan?meja=kaji_cepat", undefined, pa.h)).s, 403, "kode dicabut");
  assert.equal((await adm("POST", "/api/meja/petugas/" + hex(), {aksi: "cabut"})).s, 404);
  /* petugas tidak bisa memakai rute admin walau mengirim kode */
  for (const [m, j, b] of [["GET", "/api/meja/petugas"], ["POST", "/api/meja/petugas", {nama: "X", prov: "71", kab: "Y", meja: ["dsp"]}], ["GET", "/api/meja/rapor"], ["GET", "/api/meja/rekap"], ["POST", "/api/meja/dummy", {aksi: "isi"}]])
    assert.equal((await api(m, j, b, pb.h)).s, 403, m + " " + j);
  /* admin melihat keduanya */
  const adm_ = await adm("GET", "/api/meja/catatan?meja=kaji_cepat&kab=Kab%20Iso%20B"); assert.equal(adm_.j.catatan.length, 1);
  /* laju per kode */
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'meja.tulis', ?)").bind(pb.id, Date.now())));
  const l = await baru(pb.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa B2"}); assert.equal(l.s, 429); assert.ok(l.h.get("retry-after"));
  assert.equal((await baru(pa.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa A"})).s, 403, "kode dicabut tidak bisa menulis");
});

uji("alur status per meja: transisi liar ditolak, peran dijaga, isian per tahap, jejak lengkap", async () => {
  const p = await petugas("Kab Alur", DAFTAR_MEJA), gerbang = {...GERBANG};
  /* kaji cepat: petugas verifikasi, hanya admin masukkan JITUPASNA */
  const k = (await baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Alur"})).j.catatan, st = (h, id, b) => api("POST", "/api/meja/catatan/" + id, {aksi: "status", ...b}, h);
  assert.deepEqual(k.aksi, [{ke: "diverifikasi", peran: "petugas", boleh: true}]);
  assert.equal((await st(p.h, k.id, {ke: "masuk_jitupasna"})).s, 409, "loncat tahap");
  assert.equal((await st(p.h, k.id, {ke: "dilaporkan"})).s, 409, "ke status sendiri");
  assert.equal((await st(p.h, k.id, {ke: "bogus"})).s, 409); assert.equal((await st(p.h, k.id, {})).s, 409);
  assert.equal((await st(p.h, k.id, {ke: "diverifikasi", data: {rumah_rb: 9}})).s, 400, "kolom di luar tahap");
  assert.equal((await st(p.h, k.id, {ke: "diverifikasi"})).s, 200);
  assert.equal((await st(p.h, k.id, {ke: "masuk_jitupasna"})).s, 403, "petugas tak boleh ke JITUPASNA");
  assert.equal((await st(gerbang, k.id, {ke: "masuk_jitupasna"})).s, 403, "akun gerbang situs bukan moderator");
  assert.equal((await st(ADMIN, k.id, {ke: "masuk_jitupasna"})).s, 200);
  assert.equal((await st(ADMIN, k.id, {ke: "diverifikasi"})).s, 409, "tidak bisa mundur");
  assert.equal((await api("POST", "/api/meja/catatan/" + k.id, {aksi: "ubah", data: kaji()}, ADMIN)).s, 409, "isi terkunci setelah status awal");
  const jejak = (await adm("GET", "/api/meja/catatan/" + k.id)).j.jejak; assert.deepEqual(jejak.map(j => [j.dari, j.ke]), [[null, "dilaporkan"], ["dilaporkan", "diverifikasi"], ["diverifikasi", "masuk_jitupasna"]]);
  assert.ok(jejak[1].oleh.startsWith("petugas:") && jejak[2].oleh.startsWith("admin:"));
  const lihatP = (await api("GET", "/api/meja/catatan/" + k.id, undefined, p.h)).j; assert.ok(lihatP.jejak.every(j => !("oleh" in j)), "petugas tidak melihat identitas pelaku");
  /* logistik: setuju + kirim admin, terima petugas, tiap tahap memuat kolomnya */
  const l = (await baru(p.h, "logistik", undefined, undefined, logis())).j.catatan;
  assert.equal((await st(p.h, l.id, {ke: "disetujui"})).s, 403, "petugas tak boleh menyetujui permintaannya");
  assert.equal((await st(ADMIN, l.id, {ke: "disetujui"})).s, 200);
  assert.equal((await st(ADMIN, l.id, {ke: "dikirim", data: {jumlah_kirim: 100}})).s, 400, "tgl_kirim wajib");
  assert.equal((await st(ADMIN, l.id, {ke: "dikirim", data: {jumlah_kirim: 100, tgl_kirim: hari(0), armada: "Truk"}})).s, 200);
  assert.equal((await st(p.h, l.id, {ke: "diterima", data: {jumlah_terima: 90}})).s, 400, "penerima wajib");
  const t = await st(p.h, l.id, {ke: "diterima", data: {jumlah_terima: 90, penerima: "Kepala Posko"}}); assert.equal(t.s, 200);
  assert.deepEqual(t.j.catatan.tanda, ["selisih_terima"]); assert.equal(t.j.catatan.data.jumlah_kirim, 100); assert.equal(t.j.catatan.data.barang, "beras");
  /* DSP: persetujuan dan pencairan hanya admin moderator */
  const d = (await baru(p.h, "dsp", undefined, undefined, dsp())).j.catatan;
  assert.equal((await st(p.h, d.id, {ke: "disetujui", data: {nilai_disetujui: 500000, tgl_setuju: hari(0)}})).s, 403, "DSP disetujui petugas ditolak");
  assert.equal((await st(gerbang, d.id, {ke: "disetujui", data: {nilai_disetujui: 500000, tgl_setuju: hari(0)}})).s, 403);
  assert.equal((await st(ADMIN, d.id, {ke: "disetujui", data: {nilai_disetujui: 2000000, tgl_setuju: hari(0)}})).s, 400, "melebihi diajukan");
  assert.equal((await st(MOD2, d.id, {ke: "disetujui", data: {nilai_disetujui: 500000, tgl_setuju: hari(0)}})).s, 200);
  assert.equal((await st(p.h, d.id, {ke: "cair", data: {nilai_cair: 500000, tgl_cair: hari(0)}})).s, 403, "pencairan petugas ditolak");
  assert.equal((await st(ADMIN, d.id, {ke: "cair", data: {nilai_cair: 600000, tgl_cair: hari(0)}})).s, 400, "cair > disetujui");
  assert.equal((await st(ADMIN, d.id, {ke: "cair", data: {nilai_cair: 500000, tgl_cair: hari(0)}})).s, 200);
  assert.equal((await st(p.h, d.id, {ke: "spj", data: {realisasi: 480000, tgl_spj: hari(0)}})).s, 200, "SPJ diserahkan petugas daerah");
  assert.equal((await st(p.h, d.id, {ke: "selesai", data: {tgl_selesai: hari(0)}})).s, 403);
  assert.equal((await st(ADMIN, d.id, {ke: "selesai", data: {tgl_selesai: hari(0)}})).s, 200);
  assert.equal((await st(ADMIN, d.id, {ke: "ditolak", data: {alasan: "x"}})).s, 409, "selesai terkunci");
  const d2 = (await baru(ADMIN, "dsp", "71", "Kab Alur", dsp())).j.catatan;
  assert.equal((await st(ADMIN, d2.id, {ke: "ditolak"})).s, 400, "alasan wajib"); assert.equal((await st(ADMIN, d2.id, {ke: "ditolak", data: {alasan: "Berkas kurang"}})).s, 200);
  /* edit isi: hanya status awal (non-turunan) */
  const l2 = (await baru(p.h, "logistik", undefined, undefined, logis())).j.catatan;
  assert.equal((await api("POST", "/api/meja/catatan/" + l2.id, {aksi: "ubah", data: logis({jumlah_diminta: 250})}, p.h)).j.catatan.data.jumlah_diminta, 250);
  assert.equal((await api("POST", "/api/meja/catatan/" + l2.id, {aksi: "ubah", data: logis({jumlah_diminta: 0})}, p.h)).s, 400);
  assert.equal((await api("POST", "/api/meja/catatan/" + l2.id, {aksi: "hapus"}, p.h)).s, 400);
  /* renkon dan destana: tidak ada transisi, isi boleh diperbarui kapan saja */
  const rk = (await baru(p.h, "renkon", undefined, undefined, {bencana: "banjir", judul: "Renkon Banjir", tgl_sah: hari(400), berlaku_sampai: wib(KINI + 400 * HARI), tautan: "https://contoh.id/r.pdf"})).j.catatan;
  assert.equal(rk.status_efektif, "belum_diuji"); assert.deepEqual(rk.tanda, ["belum_diuji"]); assert.deepEqual(rk.aksi, []);
  assert.equal((await st(p.h, rk.id, {ke: "tercatat"})).s, 409);
  const rk2 = await api("POST", "/api/meja/catatan/" + rk.id, {aksi: "ubah", data: {...rk.data, uji_terakhir: hari(10)}}, p.h);
  assert.equal(rk2.j.catatan.status_efektif, "berlaku"); assert.deepEqual(rk2.j.catatan.tanda, []);
  assert.equal((await api("GET", "/api/meja/catatan?meja=renkon&status=berlaku", undefined, p.h)).j.catatan.length, 1);
  assert.equal((await api("GET", "/api/meja/catatan?meja=renkon&status=kedaluwarsa", undefined, p.h)).j.catatan.length, 0);
  const ds = (await baru(p.h, "destana", undefined, undefined, {kelas: "madya", tahun_dibentuk: 2019, indikator: ["tim_siaga"], kegiatan_terakhir: hari(30)}, {desa: "Desa Tangguh", kec: "Kec Alur"})).j.catatan;
  assert.equal(ds.status_efektif, "aktif");
  assert.equal((await api("POST", "/api/meja/catatan/" + ds.id, {aksi: "ubah", data: {kelas: "utama", tahun_dibentuk: 2019, kegiatan_terakhir: hari(500)}}, p.h)).j.catatan.status_efektif, "pasif");
});

uji("logistik: permintaan > 24 jam belum disetujui ditandai di daftar admin dan rekap", async () => {
  const mk = async jam => { const r = (await baru(ADMIN, "logistik", "71", "Kab Tunda", logis({barang: "tenda"}))).j.catatan; await mulai(r.id, null, {umurJam: jam}); return r.id; };
  const [tua, muda] = [await mk(25), await mk(23)];
  const l = (await adm("GET", "/api/meja/catatan?meja=logistik&kab=Kab%20Tunda")).j.catatan, per = id => l.find(c => c.id === id);
  assert.deepEqual(per(tua).tanda, ["belum_disetujui"]); assert.deepEqual(per(muda).tanda, []);
  const rk = (await adm("GET", "/api/meja/rekap")).j; assert.equal(rk.per_kab.logistik["71|Kab Tunda"].bahaya, 1); assert.equal(rk.per_kab.logistik["71|Kab Tunda"].n, 2);
});

uji("rekap: rumah rusak dan umur data per kab; kab tanpa renkon berlaku per bencana", async () => {
  await baru(ADMIN, "kaji_cepat", "71", "Kab Rekap", kaji({rumah_rb: 10, rumah_rs: 20, rumah_rr: 30}), {desa: "D1"});
  await baru(ADMIN, "kaji_cepat", "71", "Kab Rekap", kaji({rumah_rb: 1, rumah_rs: 2, rumah_rr: 3}), {desa: "D2"});
  await baru(ADMIN, "renkon", "71", "Kab Rekap", {bencana: "karhutla", judul: "R", tgl_sah: hari(30), berlaku_sampai: wib(KINI + 300 * HARI), uji_terakhir: hari(5)});
  await baru(ADMIN, "renkon", "71", "Kab Lapuk", {bencana: "karhutla", judul: "R lama", tgl_sah: hari(900), berlaku_sampai: hari(10), uji_terakhir: hari(500)});
  const r = (await adm("GET", "/api/meja/rekap")).j, k = r.per_kab.kaji_cepat["71|Kab Rekap"];
  assert.equal(k.n, 2); assert.equal(k.jumlah.rumah_rb, 11); assert.equal(k.jumlah.rumah_rs, 22); assert.equal(k.jumlah.rumah_rr, 33);
  assert.ok(Math.abs(k.terbaru - Date.now()) < 120e3, "terbaru = umur data");
  assert.ok(!r.tanpa_renkon.karhutla.includes("71|Kab Rekap"), "punya renkon berlaku");
  assert.ok(r.tanpa_renkon.karhutla.includes("71|Kab Lapuk"), "renkon kedaluwarsa tidak dihitung");
  assert.ok(r.tanpa_renkon.karhutla.includes("71|Kab Tunda"), "kab tanpa renkon sama sekali");
  assert.equal((await api("GET", "/api/meja/rekap")).s, 403);
});

uji("rapor: median waktu respons dihitung dari baris panggilan nyata; kab tanpa data = belum ada data", async () => {
  const kini = Date.now(), prov = "73", KAB = "Kab Rapor Uji";
  const pg = (i, dur, kab = KAB) => DB.prepare(`INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, status, dipanggil_pada, batas, direspons_pada, saluran, dibuat)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 'email', ?)`).bind(hex(), wib(kini - (2 + i) * JAM), `rapor-uji-${kab.length}-${i}`, "PT Rapor Uji", prov, kab, kini - 10 * JAM, dur == null ? "dipanggil" : "direspons",
    kini - (2 + i) * JAM, kini - (2 + i) * JAM + 2 * JAM, dur == null ? null : kini - (2 + i) * JAM + dur * MENIT, kini);
  await DB.batch([10, 20, 60, 100, null].map((d, i) => pg(i, d)));   // median 4 respons = (20+60)/2 = 40
  await DB.batch([pg(0, null, "Kab Rapor Mati")]);   // dipanggil, tak pernah direspons
  /* regu: 3 terdaftar, 2 melapor dalam 7 hari (satu laporan 9 hari lalu tidak dihitung) */
  const regu = [hex(), hex(), hex()];
  await DB.batch(regu.map((id, i) => DB.prepare("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat) VALUES (?, ?, 'BPBD', ?, ?, ?, ?)").bind(id, "Regu Rapor " + i, prov, KAB, hex() + hex() + hex() + hex(), kini)));
  const lap = (rid, jamLalu, n) => DB.prepare("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, status, prov, kab) VALUES (?, ?, ?, ?, ?, ?, -2.2, 113.9, 'bara', ?, ?)")
    .bind(hex(), rid, "klien-rapor-" + n, wib(kini - jamLalu * JAM), kini - jamLalu * JAM, kini - jamLalu * JAM, prov, KAB);
  await DB.batch([lap(regu[0], 5, 1), lap(regu[0], 30, 2), lap(regu[1], 70, 3), lap(regu[2], 9 * 24, 4)]);
  /* kelengkapan: 4 catatan logistik, 1 tertunda (skor 75), 1 kaji sehat */
  const tua = (await baru(ADMIN, "logistik", prov, KAB, logis())).j.catatan; await mulai(tua.id, null, {umurJam: 30});
  for (let i = 0; i < 3; i++) await baru(ADMIN, "logistik", prov, KAB, logis());
  const r = (await adm("GET", "/api/meja/rapor")).j, k = r.kab.find(x => x.kab === KAB && x.prov === prov);
  assert.equal(k.respons.median_menit, 40); assert.equal(k.respons.dipanggil, 5); assert.equal(k.respons.direspons, 4);
  assert.equal(k.respons.skor, Math.round(100 * (RAPOR.respons_terburuk_menit - 40) / (RAPOR.respons_terburuk_menit - RAPOR.respons_terbaik_menit)));
  assert.deepEqual(k.regu, {terdaftar: 3, aktif: 2, laporan_7h: 3, skor: 67});
  assert.deepEqual(k.kelengkapan.meja.logistik, {n: 4, bahaya: 1, skor: 75}); assert.equal(k.kelengkapan.skor, 75);
  const tunggu = (RAPOR.bobot.respons * k.respons.skor + RAPOR.bobot.keaktifan * 67 + RAPOR.bobot.kelengkapan * 75) / 100;
  assert.equal(k.skor, Math.round(tunggu)); assert.equal(k.komponen_ada, 3);
  assert.equal(r.label, "indeks komposit, bobot sementara"); assert.deepEqual(r.bobot, RAPOR.bobot); assert.match(r.lapor_warga, /tidak punya kolom/);
  assert.ok(r.prov.some(p => p.prov === prov));
  const mati = r.kab.find(x => x.kab === "Kab Rapor Mati"); assert.equal(mati.respons.skor, 0, "dipanggil tapi tak pernah direspons = 0, bukan kosong");
  assert.equal(mati.respons.median_menit, null); assert.equal(mati.regu.skor, null); assert.equal(mati.komponen_ada, 1);
  /* urutan: skor menurun, kab tanpa skor di ujung */
  const skor = r.kab.map(x => x.skor ?? -1); assert.deepEqual(skor, [...skor].sort((a, b) => b - a));
  /* fungsi murni */
  assert.equal(gabungSkor({respons: null, keaktifan: null, kelengkapan: null}).skor, null); assert.equal(gabungSkor({respons: 100, keaktifan: null, kelengkapan: 50}).skor, Math.round((35 * 100 + 40 * 50) / 75));
  assert.equal(skorRespons(15, 3, 3), 100); assert.equal(skorRespons(120, 3, 3), 0); assert.equal(skorRespons(null, 0, 0), null);
  assert.equal(Object.values(RAPOR.bobot).reduce((a, b) => a + b, 0), 100);
});

uji("publik: ringkas dan rapor publik hanya angka; tanpa nama petugas, tanpa dummy", async () => {
  await petugas("Kab Rapor Uji", ["logistik"], "73", "Budi Rahasia Petugas");
  for (const j of ["/api/meja/ringkas", "/api/meja/rapor/publik", "/api/meja/spek"]) {
    const r = await api("GET", j); assert.equal(r.s, 200, j);
    for (const rahasia of ["Budi Rahasia", "petugas:", "x-kode", "kode_sha", "Petugas Uji"]) assert.ok(!r.t.includes(rahasia), `${j} membocorkan ${rahasia}`);
  }
  const ring = (await api("GET", "/api/meja/ringkas")).j;
  assert.equal(ring.meja.kaji_cepat["71"].n, await U.n("meja_catatan", "meja = 'kaji_cepat' AND prov = '71' AND dummy = 0")); assert.ok(ring.meja.kaji_cepat["71"].jumlah.rumah_rb >= 11);
  const pub = (await api("GET", "/api/meja/rapor/publik")).j; assert.ok(pub.kab.every(k => !("petugas" in k)));
  assert.ok(pub.kab.find(k => k.kab === "Kab Rapor Uji"), "publik memuat data nyata");
  assert.ok((await adm("GET", "/api/meja/rapor")).t.includes("Budi Rahasia Petugas"), "admin melihat nama");
  const ringkasan = await api("GET", "/api/meja/ringkas?dummy=1"); assert.equal(ringkasan.s, 200);
  assert.equal(ringkasan.h.get("x-robots-tag") ?? null, null);
});

uji("dummy: hanya Super Admin; isi tiap meja dan tiap status, tanda bahaya terpicu, selisih kirim-terima, rapor tak nol; hapus bersih", async () => {
  assert.equal((await api("POST", "/api/meja/dummy", {aksi: "isi"})).s, 403);
  assert.equal((await api("POST", "/api/meja/dummy", {aksi: "isi"}, MOD2)).s, 403, "moderator biasa bukan Super Admin");
  assert.equal((await api("POST", "/api/meja/dummy", {aksi: "isi"}, GERBANG)).s, 403);
  assert.equal((await adm("POST", "/api/meja/dummy", {aksi: "x"})).s, 400);
  const asli = {catatan: await U.n("meja_catatan"), petugas: await U.n("meja_petugas"), panggilan: await U.n("panggilan"), regu: await U.n("regu"), lapangan: await U.n("lapangan")};
  const ringAsli = JSON.stringify((await api("GET", "/api/meja/ringkas")).j.meja), publikAsli = (await api("GET", "/api/meja/rapor/publik")).j.kab.length;
  const i = await adm("POST", "/api/meja/dummy", {aksi: "isi"}); assert.equal(i.s, 201, i.t);
  assert.ok(i.j.catatan >= 25 && i.j.jejak > i.j.catatan && i.j.petugas === 3 && i.j.panggilan === 9 && i.j.regu === 5);
  assert.equal((await adm("POST", "/api/meja/dummy", {aksi: "isi"})).s, 409, "gerbang sudah ada");
  /* tiap meja, tiap status minimal satu baris, tanda bahaya terpicu */
  for (const m of DAFTAR_MEJA) {
    const c = (await adm("GET", `/api/meja/catatan?meja=${m}`)).j.catatan.filter(x => x.dummy);
    const status = new Set(c.map(x => x.status_efektif));
    for (const s of MEJA[m].turunan || MEJA[m].status) assert.ok(status.has(s), `${m} tanpa status ${s}`);
    for (const s of MEJA[m].status) assert.ok(c.some(x => x.status === s), `${m} tanpa status simpanan ${s}`);
    assert.ok(c.some(x => x.tanda.length), `${m} tanpa tanda bahaya`);
    for (const kode of Object.keys(MEJA[m].bahaya)) assert.ok(c.some(x => x.tanda.includes(kode)), `${m} tanpa tanda ${kode}`);
    const jejak = await DB.prepare("SELECT count(*) n FROM meja_jejak j JOIN meja_catatan c ON c.id = j.catatan_id WHERE c.meja = ? AND c.dummy = 1").bind(m).first(); assert.ok(jejak.n >= c.length);
  }
  const lg = (await adm("GET", "/api/meja/catatan?meja=logistik")).j.catatan.filter(x => x.status === "diterima" && x.dummy);
  const sel = lg.map(x => Math.sign(x.data.jumlah_terima - x.data.jumlah_kirim)).sort(); assert.deepEqual(sel, [-1, 0, 1], "satu kurang, satu pas, satu lebih");
  /* petugas dummy tidak bisa dipakai masuk, dan tidak ikut ringkas/rapor publik */
  assert.equal(JSON.stringify((await api("GET", "/api/meja/ringkas")).j.meja), ringAsli, "ringkas tanpa dummy tak berubah");
  assert.equal((await api("GET", "/api/meja/rapor/publik")).j.kab.length, publikAsli);
  const dum = (await adm("GET", "/api/meja/ringkas?dummy=1")).j; assert.ok(dum.meja.destana["62"].n >= 3);
  /* rapor dummy: setiap kolom kab contoh A bukan nol */
  const r = (await adm("GET", "/api/meja/rapor?dummy=1")).j, A = r.kab.find(k => k.kab === "Kab. Contoh Meja A"), B = r.kab.find(k => k.kab === "Kab. Contoh Meja B"), C = r.kab.find(k => k.kab === "Kab. Contoh Meja C");
  assert.equal(A.respons.median_menit, 30); assert.equal(B.respons.median_menit, 100); assert.ok(A.respons.skor > B.respons.skor);
  assert.equal(A.respons.dipanggil, 5); assert.equal(A.respons.direspons, 4);
  assert.deepEqual([A.regu.terdaftar, A.regu.aktif, A.regu.skor], [3, 2, 67]); assert.ok(A.regu.laporan_7h > 0); assert.ok(B.regu.laporan_7h > 0 && B.regu.aktif === 1);
  for (const m of DAFTAR_MEJA) assert.ok(A.kelengkapan.meja[m]?.n > 0, `kelengkapan ${m}`);
  assert.ok(A.skor > 0 && A.kelengkapan.skor > 0 && A.komponen_ada === 3 && A.petugas.length === 1);
  assert.equal(C.respons.skor, null); assert.equal(C.regu.skor, null); assert.equal(C.komponen_ada, 1, "kab C hanya kelengkapan: sisanya belum ada data");
  /* hapus: bersih, data nyata utuh */
  const h = await adm("POST", "/api/meja/dummy", {aksi: "hapus"}); assert.equal(h.s, 200, h.t);
  assert.equal(h.j.catatan, i.j.catatan); assert.equal(h.j.regu, 5); assert.equal(h.j.panggilan, 9); assert.equal(h.j.lapangan, i.j.lapangan);
  for (const t of ["meja_catatan", "meja_petugas", "meja_jejak", "panggilan", "regu", "lapangan"]) assert.equal(await U.n(t, "dummy = 1"), 0, t);
  assert.deepEqual({catatan: await U.n("meja_catatan"), petugas: await U.n("meja_petugas"), panggilan: await U.n("panggilan"), regu: await U.n("regu"), lapangan: await U.n("lapangan")}, asli, "data nyata utuh");
  assert.equal((await adm("POST", "/api/meja/dummy", {aksi: "isi"})).s, 201, "bisa diisi lagi");
  assert.equal((await adm("POST", "/api/meja/dummy", {aksi: "hapus"})).s, 200);
});

uji("halaman /meja dan /admin/meja: 200 dengan CSP ketat; admin tanpa token 403; tanpa skrip/gaya inline", async () => {
  const h = await api("GET", "/meja"); assert.equal(h.s, 200); assert.match(h.h.get("content-type"), /text\/html/);
  const csp = h.h.get("content-security-policy"); assert.match(csp, /script-src 'self'(;|$)/); assert.ok(!/unsafe-inline/.test(csp.split(";").find(x => x.includes("script-src"))));
  assert.equal(h.h.get("cache-control"), "no-store"); assert.match(h.h.get("x-robots-tag"), /noindex/); assert.equal(h.h.get("referrer-policy"), "no-referrer");
  assert.ok(!/<script(?![^>]*\ssrc=)/i.test(h.t) && !/\son\w+=/i.test(h.t) && !/\sstyle=/i.test(h.t), "html bersih inline");
  assert.ok(h.t.includes("/bnpb/meja.js") && h.t.includes("/bnpb/meja.css"));
  const a = await api("GET", "/admin/meja", undefined, ADMIN); assert.equal(a.s, 200, a.t.slice(0, 200)); assert.ok(a.t.includes("/admin/meja.js") && a.t.includes("/admin/meja.css"));
  const tanpa = await U.mf.dispatchFetch("http://bnpb.lokal/admin/meja", {redirect: "manual"}); assert.equal(tanpa.status, 303); assert.match(tanpa.headers.get("location"), /\/admin\/masuk/); await tanpa.arrayBuffer();
  for (const [m, j, b] of [["GET", "/api/meja/petugas"], ["POST", "/api/meja/petugas", {nama: "X", prov: "71", kab: "Y", meja: ["dsp"]}], ["POST", "/api/meja/petugas/" + hex(), {aksi: "cabut"}], ["GET", "/api/meja/rekap"], ["GET", "/api/meja/rapor"],
    ["GET", "/api/meja/catatan?meja=dsp"], ["POST", "/api/meja/catatan", {meja: "dsp", prov: "71", kab: "Y", data: {}}], ["GET", "/api/meja/catatan/" + hex()], ["POST", "/api/meja/catatan/" + hex(), {aksi: "ubah"}], ["GET", "/api/meja/saya"], ["POST", "/api/meja/dummy", {aksi: "isi"}]]) {
    assert.equal((await api(m, j, b)).s, 403, `${m} ${j} tanpa token`);
    assert.equal((await api(m, j, b, {"x-admin-token": "salah"})).s, 403, `${m} ${j} token salah`);
  }
  assert.equal((await api("POST", "/api/meja/catatan", {meja: "dsp"}, {...ADMIN, origin: "https://jahat.example"})).s, 403, "CSRF origin lain");
  for (const f of ["public/bnpb/meja.js", "public/admin/meja.js"]) { const s = readFileSync(path.join(AKAR, f), "utf8"); assert.ok(!/style="/.test(s) && !/—/.test(s) && !/\son\w+="/.test(s), f + ": inline style/em dash/handler"); }
});

uji("tabel belum dimigrasi = 503 (bukan 500)", async () => {
  await DB.batch([DB.prepare("DROP TABLE meja_jejak"), DB.prepare("DROP TABLE meja_catatan"), DB.prepare("DROP TABLE meja_petugas")]);
  for (const [j, h] of [["/api/meja/petugas", ADMIN], ["/api/meja/catatan?meja=dsp", ADMIN], ["/api/meja/ringkas", {}], ["/api/meja/rapor/publik", {}], ["/api/meja/rekap", ADMIN]]) {
    const r = await api("GET", j, undefined, h); assert.equal(r.s, 503, `${j}: ${r.t}`); assert.match(r.j.galat, /belum diaktifkan/);
  }
  assert.equal((await api("GET", "/api/meja/spek")).s, 200, "spek tidak butuh DB");
});
