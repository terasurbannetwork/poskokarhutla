/* Meja Kerja (src/meja.js, src/meja_spek.js, migrations/0026_meja.sql): worker utuh di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/warga/meja.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import "../../src/worker.js";   // worker.js dulu: posko.js dan worker.js saling impor
import {MEJA, DAFTAR_MEJA, DAFTAR_PETUGAS, MEJA_RAPOR, EKSPOR_RISIKO, PASANGAN, BARANG, BENCANA, AMBANG, RAPOR, JENIS_DAMPAK, spekPublik, validasi, statusEfektif, tandaBahaya} from "../../src/meja_spek.js";
import {kelengkapan} from "../../public/inti/kelengkapan.js";
import {JENIS} from "../../src/logbook.js";
import {gabungSkor, skorRespons, DIBI_KOLOM, DIBI_JENIS, selCsv} from "../../src/meja.js";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import {nilai, tenggat} from "../../public/inti/jam_aturan.js";

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
  assert.ok(sql.length === 21, 'jumlah pernyataan migrasi: ' + sql.length);
  await DB.batch(sql.map(s => DB.prepare(s)));
  await DB.batch(sql.map(s => DB.prepare(s)));
  assert.equal(await U.n("meja_catatan"), 0);
  assert.ok(migrasi().includes("meja_petugas_sah"));
});

uji("CHECK dan trigger D1 sama persis dengan spek: pasangan meja x status, transisi, larik meja petugas, isi liar", async () => {
  const semuaStatus = [...new Set(DAFTAR_MEJA.flatMap(m => MEJA[m].status)), "bogus"];
  const sisip = async (meja, status, over = {}) => {
    try {
      let kaji = null;
      if (meja === "rehab") {   // rehab butuh induk kaji cepat masuk_jitupasna di kab yang sama
        kaji = hex(); await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah) VALUES (?, 'kaji_cepat', '71', 'Kab Cek', NULL, 'Desa Cek', '{}', 'masuk_jitupasna', 1, 1)").bind(kaji).run();
      }
      await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, kaji_id, stok) VALUES (?, ?, '71', 'Kab Cek', ?, ?, ?, ?, 1, 1, ?, ?)")
        .bind(over.id ?? hex(), meja, "Kec Cek", "Desa Cek", over.data ?? "{}", status, kaji, meja === "gudang" ? 0 : null).run(); return true;
    } catch (e) { return false; }
  };
  for (const m of DAFTAR_MEJA) for (const s of semuaStatus) assert.equal(await sisip(m, s), MEJA[m].status.includes(s), `${m}:${s}`);
  assert.equal(await sisip("tidakada", "tercatat"), false, "meja liar");
  assert.equal(await sisip("kaji_cepat", "dilaporkan", {data: "bukan json"}), false, "json_valid");
  assert.equal(await sisip("kaji_cepat", "dilaporkan", {data: "[1]"}), false, "bukan objek");
  assert.equal(await sisip("kaji_cepat", "dilaporkan", {data: JSON.stringify({x: "a".repeat(6001)})}), false, "terlalu panjang");
  /* desa wajib untuk kaji cepat dan destana, kecamatan untuk destana */
  const tanpa = async (meja, status, kec, desa) => { try { await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, stok) VALUES (?, ?, '71', 'Kab Cek', ?, ?, '{}', ?, 1, 1, ?)").bind(hex(), meja, kec, desa, status, meja === "gudang" ? 0 : null).run(); return true; } catch (e) { return false; } };
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
  assert.equal((await baru(ADMIN, "destana", "71", "Kab Val", {kelas: "madya", tahun_dibentuk: 2020, tgl_penilaian: "2026-13-45"}, {desa: "Desa V", kec: "Kec V"})).s, 400, "tanggal penilaian tidak sah");
  assert.equal((await baru(ADMIN, "destana", "71", "Kab Val", {kelas: "madya", tahun_dibentuk: 2020, indikator: ["tim_siaga"]}, {desa: "Desa V", kec: "Kec V"})).s, 400, "kolom indikator karangan sudah dihapus (Perban 7/2025 Pasal 13: indikator = SNI)");
  assert.equal((await baru(ADMIN, "destana", "71", "Kab Val", {kelas: "madya", tahun_dibentuk: 2020}, {desa: "Desa V"})).s, 400, "kecamatan wajib");
  assert.equal((await baru(ADMIN, "dsp", "71", "Kab Val", dsp({nilai_diajukan: 1e14}))).s, 400);
  assert.equal((await baru(ADMIN, "renkon", "71", "Kab Val", {bencana: "banjir", judul: "R", tgl_sah: hari(10), berlaku_sampai: hari(20)})).s, 400, "berlaku_sampai sebelum tgl_sah");
  assert.equal((await baru(ADMIN, "renkon", "71", "Kab Val", {bencana: "banjir", judul: "R", tgl_sah: "2026-01-10", berlaku_sampai: "2029-01-11"})).s, 400, "berlaku_sampai lebih dari tgl_sah + 3 tahun (Perban 2/2023 Pasal 21)");
  assert.equal((await baru(ADMIN, "renkon", "71", "Kab Val", {bencana: "banjir", judul: "R", tgl_sah: "2026-01-10", berlaku_sampai: "2029-01-10"})).s, 201, "tepat 3 tahun sah");
  assert.equal((await baru(ADMIN, "renkon", "71", "Kab Val", {bencana: "gempa", judul: "R tanpa sampai", tgl_sah: "2026-01-10"})).s, 201, "berlaku_sampai tidak lagi wajib");
  assert.equal((await api("POST", "/api/meja/catatan", "{bukan json", ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/meja/catatan", "x".repeat(16385), ADMIN)).s, 413);   // batas MAKS_ISIAN 16384 (naik dari 9000 untuk meja dampak, Juklak 7/2023: narasi 5400 huruf + 130 kolom); pengungsi (Juklak 9/2023) tidak muat di batas umum 4096
  /* fungsi murni: tipe ya, isian awal vs tahap */
  assert.equal(BARANG.length, 15); assert.ok(BENCANA.includes("karhutla"));
  const ya = MEJA.dsp.kolom; MEJA.dsp.kolom = [{nama: "setuju", label: "Setuju", tipe: "ya", wajib: true}];
  try { assert.deepEqual(validasi("dsp", {setuju: true}, null), {data: {setuju: true}}); assert.ok(validasi("dsp", {setuju: "ya"}, null).galat); assert.ok(validasi("dsp", {}, null).galat); } finally { MEJA.dsp.kolom = ya; }
  assert.ok(validasi("logistik", {jumlah_kirim: 5, tgl_kirim: hari(0)}, "dikirim").data, "tahap dikirim menerima kolom tahapnya");
  assert.ok(validasi("logistik", {jumlah_kirim: 5, tgl_kirim: hari(0), barang: "beras"}, "dikirim").galat, "kolom awal ditolak di tahap");
  assert.equal(await U.n("meja_catatan"), 4, "2 lama + 2 renkon sah baru (tepat 3 tahun, tanpa berlaku_sampai)");
});

uji("status turunan renkon dan destana benar di tepi tanggal (fungsi murni)", async () => {
  const kini = Date.parse("2026-10-19T05:00:00Z"), h = "2026-10-19", plus = n => wib(Date.parse(h + "T12:00:00Z") + n * HARI);
  const rk = (sampai, uji) => statusEfektif("renkon", {data: {berlaku_sampai: sampai, ...(uji ? {uji_terakhir: uji} : {})}}, kini);
  assert.equal(rk(plus(-1), plus(-10)), "kedaluwarsa", "kemarin = kedaluwarsa");
  assert.equal(rk(plus(0), plus(-10)), "segera_habis", "hari ini masih berlaku (segera habis)");
  assert.equal(rk(plus(90), plus(-10)), "segera_habis", "tepat 90 hari = segera habis");
  assert.equal(rk(plus(91), plus(-10)), "berlaku", "91 hari = berlaku");
  /* F0-2 (RU-008): hari ini 2026-10-19 di fungsi ini; reviu 6 bulan + berlaku 3 tahun dari Jam Aturan (Perban 2/2023 Pasal 21), bukan uji 365 hari */
  const rv = (sah, sampai, reviu, uji) => statusEfektif("renkon", {data: {tgl_sah: sah, berlaku_sampai: sampai, ...(reviu ? {reviu_terakhir: reviu} : {}), ...(uji ? {uji_terakhir: uji} : {})}}, kini);
  assert.equal(rv("2024-03-01", "2027-03-01", "2026-04-18"), "perlu_reviu", "reviu 6 bulan + 1 hari lalu");
  assert.equal(rv("2024-03-01", "2027-03-01", "2026-04-19"), "berlaku", "reviu tepat 6 bulan lalu masih sah");
  assert.equal(rv("2024-03-01", "2027-03-01", null, "2026-10-01"), "perlu_reviu", "catatan lama: uji_terakhir tidak dihitung, reviu dari tgl_sah, tanpa galat");
  assert.equal(rv("2023-10-01", "2026-10-01", "2026-10-01"), "kedaluwarsa", "3 tahun lewat");
  assert.equal(rv("2023-10-19", null, "2026-10-01"), "segera_habis", "tanpa berlaku_sampai: bawaan tgl_sah + 3 tahun (hari ini sisa 0)");
  assert.equal(rv("2023-10-18", null, "2026-10-01"), "kedaluwarsa", "bawaan tgl_sah + 3 tahun sudah lewat");
  assert.equal(rv(plus(-10), plus(200), plus(-10)), "berlaku");
  assert.equal(rk(plus(30), plus(-400)), "segera_habis", "kedaluwarsa > segera_habis > perlu_reviu");
  assert.equal(rk(plus(-5), null), "kedaluwarsa");
  const ds = keg => statusEfektif("destana", {data: keg ? {kegiatan_terakhir: keg} : {}}, kini);
  const nilaiDs = tgl => tandaBahaya("destana", {status: "tercatat", data: {kegiatan_terakhir: "2026-10-19", ...(tgl ? {tgl_penilaian: tgl} : {})}}, kini).includes("penilaian_kedaluwarsa");
  assert.equal(nilaiDs(null), true, "tanpa tgl_penilaian"); assert.equal(nilaiDs("2023-10-01"), true, "penilaian lebih dari 3 tahun");
  assert.equal(nilaiDs("2023-10-19"), false, "penilaian tepat 3 tahun lalu belum kedaluwarsa");
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
  /* DSP (Perban 4/2020 Pasal 21): laporan perkembangan tiap tanggal 5 bulan berikutnya; SPJ 3 bulan sesudah status darurat berakhir. Hari ini 2026-10-19. */
  const dp = (data, status = "cair") => tandaBahaya("dsp", rec(status, kini, data), kini);
  assert.deepEqual(dp({tgl_cair: "2026-10-10"}), [], "cair Oktober: laporan jatuh tempo 5 November");
  assert.deepEqual(dp({tgl_cair: "2026-09-10"}), ["laporan_terlambat"], "cair September: jatuh tempo 5 Oktober lewat");
  assert.deepEqual(dp({tgl_cair: "2026-09-10", laporan_terakhir: "2026-10-12"}), [], "laporan Oktober sudah masuk, berikutnya 5 November");
  assert.deepEqual(dp({tgl_cair: "2026-09-10", tgl_status_berakhir: "2026-06-19"}), ["laporan_terlambat", "spj_terlambat"], "dua tanda sekaligus");
  assert.deepEqual(dp({tgl_cair: "2026-10-10", tgl_status_berakhir: "2026-07-18"}), ["spj_terlambat"], "status berakhir 3 bulan + 1 hari lalu");
  assert.deepEqual(dp({tgl_cair: "2026-10-10", tgl_status_berakhir: "2026-07-19"}), [], "tepat 3 bulan belum terlambat");
  assert.deepEqual(dp({tgl_cair: "2026-10-10"}).filter(x => x === "spj_terlambat"), [], "tanpa tgl_status_berakhir tidak ada tanda SPJ palsu");
  assert.deepEqual(dp({tgl_cair: "2025-01-01", tgl_status_berakhir: "2025-02-01"}, "spj"), [], "sudah SPJ");
  /* kaji cepat: laporan awal 1 x 24 jam (Juklak 3/2022 hal. 16); rec.dibuat proksi waktu tiba */
  assert.deepEqual(tandaBahaya("kaji_cepat", rec("dilaporkan", kini - 25 * JAM), kini), ["belum_diverifikasi"], "25 jam");
  assert.deepEqual(tandaBahaya("kaji_cepat", rec("dilaporkan", kini - 23 * JAM), kini), [], "23 jam");
  assert.deepEqual(tandaBahaya("kaji_cepat", rec("dilaporkan", kini - 73 * JAM), kini), ["belum_diverifikasi"]);
  /* AMBANG hanya cermin Jam Aturan; internal berlabel asumsi di teks tanda */
  assert.equal(AMBANG.logistik_setuju_jam, 24); assert.equal(AMBANG.logistik_setuju_jam, nilai("logistik_setuju_jam"));
  assert.equal(AMBANG.kaji_awal_jam, nilai("kaji_awal")); assert.equal(AMBANG.kaji_lanjutan_jam, 72);
  for (const [m, t] of [["logistik", "belum_disetujui"], ["destana", "pasif"], ["rehab", "macet"]]) assert.match(MEJA[m].bahaya[t], /asumsi/, `tanda internal ${m}.${t} wajib berlabel asumsi`);
  assert.equal(tenggat("renkon_berlaku", "2024-02-29").hasil, "2027-02-28");
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

uji("luring: klien_id ganda tidak membuat baris ganda (buat dan ubah status), waktu klien dipakai, serentak aman, petugas lain terpisah", async () => {
  const p = await petugas("Kab Luring", DAFTAR_PETUGAS), q = await petugas("Kab Luring", DAFTAR_PETUGAS, "71", "Petugas Dua");
  const KL = "klien-luring-0001", n = () => DB.prepare("SELECT count(*) n FROM meja_catatan WHERE klien_id = ?").bind(KL).first().then(r => r.n);
  const waktu = Date.now() - 3 * JAM;
  const a = await baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Luring", klien_id: KL, waktu_klien: waktu});
  assert.equal(a.s, 201, a.t); assert.equal(a.j.catatan.dibuat, waktu, "waktu kejadian = waktu klien");
  assert.equal((await DB.prepare("SELECT waktu, diterima FROM meja_jejak WHERE catatan_id = ?").bind(a.j.catatan.id).first()).waktu, waktu);
  assert.ok((await DB.prepare("SELECT diterima FROM meja_jejak WHERE catatan_id = ?").bind(a.j.catatan.id).first()).diterima > waktu + 2 * JAM, "waktu terima server tercatat terpisah");
  const b = await baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Luring", klien_id: KL, waktu_klien: waktu});
  assert.equal(b.s, 200, b.t); assert.equal(b.j.ulang, true); assert.equal(b.j.catatan.id, a.j.catatan.id); assert.equal(await n(), 1);
  /* serentak: empat kiriman klien_id yang sama -> tetap satu baris */
  const K2 = "klien-luring-0002", par = await Promise.all([1, 2, 3, 4].map(() => baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Luring", klien_id: K2})));
  assert.ok(par.every(r => r.s === 200 || r.s === 201), par.map(r => r.s).join()); assert.equal(new Set(par.map(r => r.j.catatan.id)).size, 1);
  assert.equal((await DB.prepare("SELECT count(*) n FROM meja_catatan WHERE klien_id = ?").bind(K2).first()).n, 1);
  /* petugas lain dengan klien_id sama = catatannya sendiri */
  const c = await baru(q.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Luring", klien_id: KL}); assert.equal(c.s, 201); assert.notEqual(c.j.catatan.id, a.j.catatan.id);
  /* klien_id liar dan waktu tak masuk akal */
  assert.equal((await baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Luring", klien_id: "pendek"})).s, 400);
  assert.equal((await baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Luring", waktu_klien: "kemarin"})).s, 400);
  const depan = await baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Luring", waktu_klien: Date.now() + 5 * JAM});
  assert.ok(depan.j.catatan.dibuat <= Date.now() + 1000, "waktu klien di masa depan diabaikan");
  /* ubah status: kirim ulang klien_id yang sama = 200 ulang, satu jejak */
  const id = a.j.catatan.id, st = (h, b) => api("POST", "/api/meja/catatan/" + id, {aksi: "status", ke: "diverifikasi", ...b}, h), jejak = () => DB.prepare("SELECT count(*) n FROM meja_jejak WHERE catatan_id = ?").bind(id).first().then(r => r.n);
  const w2 = waktu + HARI / 48, s1 = await st(p.h, {klien_id: "klien-status-01", waktu_klien: w2}); assert.equal(s1.s, 200, s1.t); assert.equal(s1.j.catatan.diubah, w2);
  const s2 = await st(p.h, {klien_id: "klien-status-01", waktu_klien: w2}); assert.equal(s2.s, 200, s2.t); assert.equal(s2.j.ulang, true); assert.equal(s2.j.catatan.status, "diverifikasi"); assert.equal(await jejak(), 2);
  assert.equal((await st(p.h, {klien_id: "klien-status-02"})).s, 409, "klien_id baru untuk transisi yang sudah lewat tetap ditolak");
});

uji("alur status per meja: transisi liar ditolak, peran dijaga, isian per tahap, jejak lengkap", async () => {
  const p = await petugas("Kab Alur", DAFTAR_PETUGAS), gerbang = {...GERBANG};
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
  const lihatP = (await api("GET", "/api/meja/catatan/" + k.id, undefined, p.h)).j; assert.deepEqual(lihatP.jejak.map(j => j.oleh), ["Petugas", "Petugas", "Admin"], "petugas hanya melihat label tetap, bukan identitas pelaku"); assert.equal(lihatP.catatan.oleh, "Petugas");
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
  assert.equal(rk.status_efektif, "perlu_reviu"); assert.deepEqual(rk.tanda, ["perlu_reviu"]); assert.deepEqual(rk.aksi, []);
  assert.equal((await st(p.h, rk.id, {ke: "tercatat"})).s, 409);
  const rk2 = await api("POST", "/api/meja/catatan/" + rk.id, {aksi: "ubah", data: {...rk.data, reviu_terakhir: hari(10)}}, p.h);
  assert.equal(rk2.j.catatan.status_efektif, "berlaku"); assert.deepEqual(rk2.j.catatan.tanda, []);
  assert.equal((await api("GET", "/api/meja/catatan?meja=renkon&status=berlaku", undefined, p.h)).j.catatan.length, 1);
  assert.equal((await api("GET", "/api/meja/catatan?meja=renkon&status=kedaluwarsa", undefined, p.h)).j.catatan.length, 0);
  const ds = (await baru(p.h, "destana", undefined, undefined, {kelas: "madya", tahun_dibentuk: 2019, tgl_penilaian: hari(30), kegiatan_terakhir: hari(30)}, {desa: "Desa Tangguh", kec: "Kec Alur"})).j.catatan;
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
  for (const m of MEJA_RAPOR) assert.ok(A.kelengkapan.meja[m]?.n > 0, `kelengkapan ${m}`);
  for (const m of DAFTAR_MEJA.filter(x => !MEJA_RAPOR.includes(x))) assert.ok(!(m in A.kelengkapan.meja), `meja juklak ${m} tidak mengubah skor rapor`);
  assert.ok(A.skor > 0 && A.kelengkapan.skor > 0 && A.komponen_ada === 3 && A.petugas.length === 1);
  assert.equal(C.respons.skor, null); assert.equal(C.regu.skor, null); assert.equal(C.komponen_ada, 1, "kab C hanya kelengkapan: sisanya belum ada data");
  /* hapus: bersih, data nyata utuh */
  const h = await adm("POST", "/api/meja/dummy", {aksi: "hapus"}); assert.equal(h.s, 200, h.t);
  assert.equal(h.j.catatan, i.j.catatan); assert.equal(h.j.regu, 5); assert.equal(h.j.panggilan, 9); assert.equal(h.j.lapangan, i.j.lapangan);
  for (const t of ["meja_catatan", "meja_petugas", "meja_jejak", "meja_pelapor", "panggilan", "regu", "lapangan"]) assert.equal(await U.n(t, "dummy = 1"), 0, t);
  assert.deepEqual({catatan: await U.n("meja_catatan"), petugas: await U.n("meja_petugas"), panggilan: await U.n("panggilan"), regu: await U.n("regu"), lapangan: await U.n("lapangan")}, asli, "data nyata utuh");
  assert.equal((await adm("POST", "/api/meja/dummy", {aksi: "isi"})).s, 201, "bisa diisi lagi");
  assert.ok(await U.n("meja_pelapor", "dummy = 1") > 0, "dummy mengisi identitas contoh");
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

/* ============================================================ sempurna: rehab-rekon, stok gudang, agregat, ekspor */
const SAH = (st, h, id, b) => api("POST", "/api/meja/catatan/" + id, {aksi: "status", ...b}, h);
const rehabIsi = (o = {}) => ({rumah_rb: 2, rumah_rs: 3, rumah_rr: 5, tgl_jitupasna: hari(5), ...o});
/* kaji cepat sampai masuk_jitupasna (petugas verifikasi, admin masukkan) */
const kajiSiap = async (h, kab, prov = "71") => {
  const c = (await (h ? baru(h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa " + kab}) : baru(ADMIN, "kaji_cepat", prov, kab, kaji(), {desa: "Desa " + kab}))).j.catatan;
  assert.equal((await SAH(0, ADMIN, c.id, {ke: "diverifikasi"})).s, 200); assert.equal((await SAH(0, ADMIN, c.id, {ke: "masuk_jitupasna"})).s, 200);
  return c.id;
};

uji("sempurna: enum spek rehab dan gudang sama dengan CHECK/trigger migrasi; tautan kaji_id, saldo stok, dan transaksi dijaga D1", async () => {
  const sql = migrasi();   // semua migrasi (0026 + 0110 yang membangun ulang meja_catatan), bukan 0026 saja
  assert.deepEqual(DAFTAR_MEJA, ["kaji_cepat", "logistik", "dsp", "renkon", "destana", "rehab", "gudang", "pengungsi", "pengaduan", "klaster", "risiko", "dampak"]);
  assert.deepEqual(DAFTAR_PETUGAS, ["kaji_cepat", "logistik", "dsp", "renkon", "destana", "rehab", "gudang", "pengungsi", "klaster", "dampak"], "pengaduan dan risiko hanya pusat");
  for (const m of ["rehab", "gudang"]) assert.ok(sql.includes(`'${m}'`));
  for (const s of MEJA.rehab.status) assert.ok(sql.includes(`'${s}'`), "status rehab di migrasi: " + s);
  assert.ok(PASANGAN.filter(x => x.startsWith("rehab:")).length === 6);
  for (const x of PASANGAN.filter(x => x.startsWith("rehab:"))) assert.ok(sql.includes(`'${x}'`), "pasangan di trigger: " + x);
  assert.deepEqual(MEJA.gudang.status, ["tercatat"]); assert.deepEqual(MEJA.rehab.transisi.usulan, {disetujui: "admin", ditolak: "admin"});
  const coba = async (sqlText, ...a) => { try { await DB.prepare(sqlText).bind(...a).run(); return true; } catch (e) { return false; } };
  const kj = async (status = "masuk_jitupasna", kab = "Kab Tautan", meja = "kaji_cepat") => { const id = hex(); await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah) VALUES (?, ?, '71', ?, NULL, 'Desa D', '{}', ?, 1, 1)").bind(id, meja, kab, status).run(); return id; };
  const rh = (id, kaji, kab = "Kab Tautan", dummy = 0) => coba("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, kaji_id, dummy) VALUES (?, 'rehab', '71', ?, '{}', 'jitupasna', 1, 1, ?, ?)", id, kab, kaji, dummy);
  // F0-3 (migrasi 0110, KEPUTUSAN-AWAL §5.0, tiket RU-009): rehab tanpa kaji cepat induk kini DITERIMA (dulu ditolak). Tautan liar tetap ditolak di bawah.
  assert.equal(await rh(hex(), null), true, "rehab tanpa kaji_id (F0-3)");
  assert.equal(await rh(hex(), hex()), false, "kaji_id liar");
  assert.equal(await rh(hex(), await kj("diverifikasi")), false, "kaji belum masuk_jitupasna");
  assert.equal(await rh(hex(), await kj("masuk_jitupasna", "Kab Lain")), false, "kaji kab lain");
  assert.equal(await rh(hex(), await kj("diminta", "Kab Tautan", "logistik")), false, "induk bukan kaji cepat");
  const ok = await kj(); assert.equal(await rh(hex(), ok), true); assert.equal(await rh(hex(), ok), false, "satu rehab per kaji cepat");
  assert.equal(await rh(hex(), await kj(), "Kab Tautan", 1), false, "dummy tidak boleh menaut induk asli");
  assert.equal(await coba("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, kaji_id) VALUES (?, 'logistik', '71', 'K Tautan', '{}', 'diminta', 1, 1, ?)", hex(), ok), false, "kaji_id hanya untuk rehab");
  const rid = (await DB.prepare("SELECT id FROM meja_catatan WHERE kaji_id = ?").bind(ok).first()).id;
  assert.equal(await coba("UPDATE meja_catatan SET kaji_id = ? WHERE id = ?", await kj(), rid), false, "kaji_id tidak bisa dipindah");
  /* gudang: saldo tidak boleh minus, satu catatan per (kab, gudang, barang), transaksi hanya ditambah */
  const gd = (id, data, stok = 5) => coba("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, stok) VALUES (?, 'gudang', '71', 'Kab Tautan', ?, 'tercatat', 1, 1, ?)", id, JSON.stringify(data), stok);
  const g = hex(); assert.equal(await gd(g, {gudang: "Utama", barang: "beras"}), true);
  assert.equal(await gd(hex(), {gudang: "UTAMA", barang: "beras"}), false, "duplikat tanpa peduli huruf besar");
  assert.equal(await gd(hex(), {gudang: "Utama", barang: "tenda"}), true); assert.equal(await gd(hex(), {gudang: "Utama", barang: "garam"}, -1), false, "stok minus");
  assert.equal(await coba("UPDATE meja_catatan SET stok = -1 WHERE id = ?", g), false, "saldo minus ditolak CHECK");
  assert.equal(await coba("UPDATE meja_catatan SET stok = NULL WHERE id = ?", g), false, "gudang wajib punya stok");
  assert.equal(await coba("UPDATE meja_catatan SET stok = 1 WHERE id = ?", rid), false, "stok hanya untuk gudang");
  const tr = (jenis, delta, gid = g, lid = null) => coba("INSERT INTO meja_stok (gudang_id, jenis, delta, saldo, logistik_id, waktu) VALUES (?, ?, ?, 5, ?, 1)", gid, jenis, delta, lid);
  assert.equal(await tr("masuk", 3), true); assert.equal(await tr("keluar", -3), true); assert.equal(await tr("koreksi", -2), true);
  assert.equal(await tr("masuk", -3), false, "masuk harus positif"); assert.equal(await tr("keluar", 3), false, "keluar harus negatif"); assert.equal(await tr("koreksi", 0), false); assert.equal(await tr("curi", 3), false);
  assert.equal(await tr("masuk", 3, ok), false, "transaksi hanya untuk catatan gudang"); assert.equal(await tr("masuk", 3, hex()), false);
  assert.equal(await coba("UPDATE meja_stok SET delta = 9 WHERE gudang_id = ?", g), false, "transaksi beku"); assert.equal(await coba("DELETE FROM meja_stok WHERE gudang_id = ?", g), false, "transaksi tak bisa dihapus");
  assert.equal(await coba("INSERT INTO meja_ringkas (meja, prov, kab, status, dummy, n, bahaya, jumlah, terbaru) VALUES ('rehab', '71', 'K', 'macet', 0, 1, 2, '{}', 1)"), false, "bahaya <= n");
  assert.equal(await coba("INSERT INTO meja_ringkas (meja, prov, kab, status, dummy, n, bahaya, jumlah, terbaru) VALUES ('liar', '71', 'K', 'macet', 0, 1, 0, '{}', 1)"), false);
  /* petugas boleh memegang meja baru, larik sepuluh meja; meja pusat ditolak */
  const pet = async meja => coba("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'Uji Cek', '71', 'Kab Cek', ?, ?, 1)", hex(), meja, hex() + hex() + hex() + hex());
  assert.equal(await pet(JSON.stringify(DAFTAR_PETUGAS)), true); assert.equal(await pet('["rehab","gudang"]'), true); assert.equal(await pet(JSON.stringify([...DAFTAR_PETUGAS, "kaji_cepat"])), false); assert.equal(await pet('["pengaduan"]'), false); assert.equal(await pet('["risiko"]'), false);
});

uji("sempurna: alur rehab-rekon, peran petugas/admin, aturan lintas kolom, tautan kaji_id sah dan liar, tanda macet 60 hari", async () => {
  const p = await petugas("Kab Rehab", ["kaji_cepat", "rehab", "dsp"]), lain = await petugas("Kab Rehab Lain", ["rehab", "kaji_cepat"]);
  const kj = await kajiSiap(p.h, "Kab Rehab"), kjLain = await kajiSiap(lain.h, "Kab Rehab Lain");
  const mk = (h, kaji_id, data = rehabIsi(), extra = {}) => api("POST", "/api/meja/catatan", {meja: "rehab", kaji_id, data, ...extra}, h);
  /* tautan liar */
  /* F0-3 (RU-010, KEPUTUSAN-AWAL §5.0): kaji_id OPSIONAL; rehab tanpa induk diterima dengan kejadian_ref, kaji_id yang diisi tetap dijaga */
  const bebas = await petugas("Kab Rehab Bebas", ["rehab"]), lain2 = await petugas("Kab Rehab Bebas B", ["rehab"]);   // kab terpisah supaya hitungan kab Rehab di bawah tak berubah
  const tanpaInduk = await mk(bebas.h, undefined, rehabIsi({kejadian_ref: "SK-UJI-1"})); assert.equal(tanpaInduk.s, 201, tanpaInduk.t); assert.ok(!tanpaInduk.j.catatan.kaji_id, "tanpa induk");
  assert.equal((await mk(bebas.h, undefined, rehabIsi({kejadian_ref: "SK-UJI-1"}))).s, 409, "kejadian_ref sama di kab sama");
  assert.equal((await mk(lain2.h, undefined, rehabIsi({kejadian_ref: "SK-UJI-1"}))).s, 201, "kejadian_ref sama di kab lain boleh");
  assert.equal((await mk(bebas.h, undefined)).s, 201, "tanpa kejadian_ref diterima (indeks unik hanya untuk yang berisi)");
  assert.equal((await mk(bebas.h, undefined)).s, 201, "dua rehab tanpa induk dan tanpa kejadian_ref");
  assert.equal((await mk(bebas.h, null)).s, 201, "kaji_id null sama dengan tanpa kaji_id"); assert.equal((await mk(p.h, "bukan-hex")).s, 400); assert.equal((await mk(p.h, hex())).s, 400, "kaji tak ada");
  const belum = (await baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa Belum"})).j.catatan.id; assert.equal((await mk(p.h, belum)).s, 400, "kaji belum masuk_jitupasna");
  assert.equal((await mk(p.h, kjLain)).s, 400, "kaji kab lain (pesan sama dengan tak ada)"); assert.equal((await mk(p.h, kj, rehabIsi(), {kaji_id: kjLain})).s, 400, "kaji_id ganda tidak dipakai");
  assert.equal((await api("POST", "/api/meja/catatan", {meja: "rehab", prov: "71", kab: "Kab Salah", kaji_id: kj, data: rehabIsi()}, ADMIN)).s, 400, "admin: kab berbeda dari kaji");
  assert.equal((await api("POST", "/api/meja/catatan", {meja: "logistik", kaji_id: kj, data: logis()}, p.h)).s, 403, "meja tak diizinkan sebelum cek lain");
  assert.equal((await baru(p.h, "dsp", undefined, undefined, dsp(), {kaji_id: kj})).s, 400, "kaji_id hanya untuk rehab");
  assert.equal((await mk(p.h, kj, rehabIsi({rumah_rb: 0, rumah_rs: 0, rumah_rr: 0}))).s, 400, "total rumah 0"); assert.equal((await mk(p.h, kj, rehabIsi({tgl_jitupasna: hari(-30)}))).s, 400, "tanggal masa depan");
  assert.equal((await mk(p.h, kj, rehabIsi({nilai_usulan: 5}))).s, 400, "kolom tahap lain");
  const r = await mk(p.h, kj); assert.equal(r.s, 201, r.t); const c = r.j.catatan;
  assert.equal(c.kaji_id, kj); assert.equal(c.status, "jitupasna"); assert.equal(c.desa, "Desa Kab Rehab", "wilayah disalin dari kaji cepat"); assert.deepEqual(c.aksi, [{ke: "usulan", peran: "petugas", boleh: true}]);
  assert.equal((await mk(p.h, kj)).s, 409, "satu rehab per kaji cepat");
  assert.equal((await api("GET", "/api/meja/catatan/" + c.id, undefined, lain.h)).s, 404, "kab lain tidak melihat");
  /* pemilih kaji untuk petugas rehab tanpa meja kaji_cepat */
  const hanyaRehab = await petugas("Kab Rehab", ["rehab"]);
  assert.equal((await api("GET", "/api/meja/catatan?meja=kaji_cepat", undefined, hanyaRehab.h)).s, 403);
  assert.equal((await api("GET", "/api/meja/catatan?meja=kaji_cepat&status=masuk_jitupasna&untuk=rehab", undefined, hanyaRehab.h)).j.catatan.map(x => x.id).includes(kj), true);
  /* alur dan peran */
  assert.equal((await SAH(0, p.h, c.id, {ke: "disetujui"})).s, 409, "loncat tahap");
  assert.equal((await SAH(0, p.h, c.id, {ke: "usulan", data: {nilai_usulan: 800, tgl_usulan: hari(6)}})).s, 400, "usulan sebelum JITUPASNA");
  assert.equal((await SAH(0, p.h, c.id, {ke: "usulan", data: {nilai_usulan: 800}})).s, 400, "tgl_usulan wajib");
  assert.equal((await SAH(0, p.h, c.id, {ke: "usulan", data: {nilai_usulan: 800000000, tgl_usulan: hari(2)}})).s, 200, "petugas mengusulkan");
  assert.equal((await SAH(0, p.h, c.id, {ke: "disetujui", data: {nilai_disetujui: 700, tgl_setuju: hari(1)}})).s, 403, "petugas tak boleh menyetujui");
  assert.equal((await SAH(0, GERBANG, c.id, {ke: "disetujui", data: {nilai_disetujui: 700, tgl_setuju: hari(1)}})).s, 403);
  assert.equal((await SAH(0, ADMIN, c.id, {ke: "disetujui", data: {nilai_disetujui: 900000000, tgl_setuju: hari(1)}})).s, 400, "disetujui > usulan");
  assert.equal((await SAH(0, ADMIN, c.id, {ke: "disetujui", data: {nilai_disetujui: 700000000, tgl_setuju: hari(3)}})).s, 400, "tgl_setuju sebelum tgl_usulan");
  assert.equal((await SAH(0, ADMIN, c.id, {ke: "disetujui", data: {nilai_disetujui: 700000000, tgl_setuju: hari(1)}})).s, 200);
  assert.equal((await SAH(0, p.h, c.id, {ke: "cair", data: {nilai_cair: 1, tgl_cair: hari(0)}})).s, 403, "petugas tak boleh mencairkan");
  assert.equal((await SAH(0, ADMIN, c.id, {ke: "cair", data: {nilai_cair: 700000001, tgl_cair: hari(0)}})).s, 400, "cair > disetujui");
  assert.equal((await SAH(0, ADMIN, c.id, {ke: "cair", data: {nilai_cair: 700000000, tgl_cair: hari(0)}})).s, 200);
  assert.equal((await SAH(0, p.h, c.id, {ke: "dibangun", data: {rumah_dibangun: 11, tgl_bangun: hari(0)}})).s, 400, "dibangun > total rumah (2+3+5=10)");
  assert.equal((await SAH(0, p.h, c.id, {ke: "dibangun", data: {rumah_dibangun: 10, tgl_bangun: hari(0)}})).s, 200, "petugas melapor dibangun, sama dengan total boleh");
  assert.equal((await SAH(0, p.h, c.id, {ke: "selesai", data: {tgl_selesai: hari(0)}})).s, 403, "petugas tak boleh menutup");
  assert.equal((await SAH(0, ADMIN, c.id, {ke: "selesai", data: {tgl_selesai: hari(0)}})).s, 200);
  assert.equal((await SAH(0, ADMIN, c.id, {ke: "ditolak", data: {alasan: "x"}})).s, 409, "selesai terkunci");
  const j = (await adm("GET", "/api/meja/catatan/" + c.id)).j; assert.deepEqual(j.jejak.map(x => x.ke), ["jitupasna", "usulan", "disetujui", "cair", "dibangun", "selesai"]);
  assert.equal(j.catatan.data.nilai_cair, 700000000); assert.equal(j.catatan.data.rumah_dibangun, 10);
  /* ditolak keluar dari usulan, alasan wajib; isi awal bisa diubah selama jitupasna */
  const kj2 = await kajiSiap(p.h, "Kab Rehab"), c2 = (await mk(p.h, kj2)).j.catatan;
  assert.equal((await api("POST", "/api/meja/catatan/" + c2.id, {aksi: "ubah", data: rehabIsi({rumah_rb: 4})}, p.h)).j.catatan.data.rumah_rb, 4);
  assert.equal((await SAH(0, ADMIN, c2.id, {ke: "ditolak"})).s, 409, "ditolak hanya dari usulan"); await SAH(0, p.h, c2.id, {ke: "usulan", data: {nilai_usulan: 100, tgl_usulan: hari(1)}});
  assert.equal((await SAH(0, ADMIN, c2.id, {ke: "ditolak"})).s, 400, "alasan wajib"); assert.equal((await SAH(0, ADMIN, c2.id, {ke: "ditolak", data: {alasan: "Berkas kurang"}})).s, 200);
  assert.equal((await api("POST", "/api/meja/catatan/" + c2.id, {aksi: "ubah", data: rehabIsi()}, ADMIN)).s, 409, "isi terkunci");
  /* tanda macet: tahap yang sama > 60 hari (fungsi murni di tepi, lalu lewat API) */
  const kini = Date.parse("2026-10-19T05:00:00Z"), h = "2026-10-19", plus = n => wib(Date.parse(h + "T12:00:00Z") + n * HARI);
  const rec = (status, data) => ({status, dibuat: kini, data: {rumah_rb: 1, ...data}});
  assert.deepEqual(tandaBahaya("rehab", rec("usulan", {tgl_usulan: plus(-60)}), kini), [], "60 hari belum macet");
  assert.deepEqual(tandaBahaya("rehab", rec("usulan", {tgl_usulan: plus(-61)}), kini), ["macet"]);
  assert.deepEqual(tandaBahaya("rehab", rec("jitupasna", {tgl_jitupasna: plus(-61)}), kini), ["macet"]); assert.deepEqual(tandaBahaya("rehab", rec("dibangun", {tgl_bangun: plus(-61)}), kini), ["macet"]);
  assert.deepEqual(tandaBahaya("rehab", rec("selesai", {tgl_selesai: plus(-300)}), kini), [], "selesai tidak macet"); assert.deepEqual(tandaBahaya("rehab", rec("ditolak", {}), kini), []);
  const kj3 = await kajiSiap(p.h, "Kab Rehab"), tua = (await mk(p.h, kj3, rehabIsi({tgl_jitupasna: hari(61)}))).j.catatan; assert.deepEqual(tua.tanda, ["macet"]);
  const kj4 = await kajiSiap(p.h, "Kab Rehab"), muda = (await mk(p.h, kj4, rehabIsi({tgl_jitupasna: hari(60)}))).j.catatan; assert.deepEqual(muda.tanda, []);
  const rk = (await adm("GET", "/api/meja/rekap")).j.per_kab.rehab["71|Kab Rehab"]; assert.equal(rk.bahaya, 1); assert.equal(rk.n, 4); assert.equal(rk.status.selesai, 1); assert.equal(rk.jumlah.nilai_cair, 700000000);
});

uji("sempurna: stok gudang, transaksi, dikirim mengurangi stok atomik, 409 bila kurang, tidak pernah minus", async () => {
  const p = await petugas("Kab Gudang", ["gudang", "logistik"]), lain = await petugas("Kab Gudang Lain", ["gudang", "logistik"]);
  const gd = (h, data) => baru(h, "gudang", undefined, undefined, data), isi = (o = {}) => ({gudang: "Gudang Utama", barang: "beras", satuan: "kg", stok_awal: 100, ambang_min: 30, ...o});
  const g = (await gd(p.h, isi())).j.catatan; assert.equal(g.data.stok, 100); assert.equal(g.status_efektif, "cukup"); assert.deepEqual(g.tanda, []);
  assert.equal((await gd(p.h, isi({gudang: "GUDANG UTAMA"}))).s, 409, "duplikat (kab, gudang, barang)"); assert.equal((await gd(lain.h, isi())).s, 201, "kab lain boleh nama sama");
  const g2 = (await gd(p.h, isi({barang: "selimut", satuan: "lembar", stok_awal: 10}))).j.catatan, gLain = (await gd(lain.h, isi({barang: "tenda", satuan: "unit"}))).j.catatan;
  assert.equal((await gd(p.h, isi({barang: "emas"}))).s, 400); assert.equal((await gd(p.h, isi({stok_awal: -1}))).s, 400); assert.equal((await gd(p.h, isi({stok_awal: 1.5}))).s, 400);
  const stok = (id, b, h = p.h) => api("POST", "/api/meja/catatan/" + id, {aksi: "stok", ...b}, h), saldo = async id => (await DB.prepare("SELECT stok FROM meja_catatan WHERE id = ?").bind(id).first()).stok;
  assert.equal((await stok(g.id, {jenis: "keluar", jumlah: 30})).j.catatan.data.stok, 70);
  const k = await stok(g.id, {jenis: "keluar", jumlah: 71}); assert.equal(k.s, 409); assert.match(k.j.galat, /tersisa 70/); assert.equal(await saldo(g.id), 70, "tidak minus");
  assert.equal((await stok(g.id, {jenis: "masuk", jumlah: 5, catatan: "Pasokan"})).j.catatan.data.stok, 75);
  assert.equal((await stok(g.id, {jenis: "koreksi", jumlah: -5})).s, 403, "koreksi hanya admin"); assert.equal((await stok(g.id, {jenis: "koreksi", jumlah: -5}, ADMIN)).j.catatan.data.stok, 70);
  assert.equal((await stok(g.id, {jenis: "koreksi", jumlah: -71}, ADMIN)).s, 409, "koreksi melewati nol");
  for (const b of [{jenis: "keluar", jumlah: 0}, {jenis: "keluar", jumlah: -3}, {jenis: "masuk", jumlah: 1.5}, {jenis: "masuk", jumlah: "7"}, {jenis: "masuk", jumlah: 1e8}, {jenis: "koreksi", jumlah: 0}, {jenis: "curi", jumlah: 1}, {jumlah: 1}]) assert.equal((await stok(g.id, b, ADMIN)).s, 400, JSON.stringify(b));
  assert.equal((await stok(gLain.id, {jenis: "masuk", jumlah: 1})).s, 404, "gudang kab lain"); assert.equal((await stok(g.id, {jenis: "masuk", jumlah: 1}, {})).s, 403);
  const kl = (await baru(p.h, "kaji_cepat", undefined, undefined, kaji(), {desa: "Desa X"})); assert.equal(kl.s, 403, "petugas tanpa meja kaji"); 
  assert.equal((await stok((await baru(ADMIN, "logistik", "71", "Kab Gudang", logis())).j.catatan.id, {jenis: "masuk", jumlah: 1}, ADMIN)).s, 409, "aksi stok hanya untuk gudang");
  /* saldo = stok awal + jumlah transaksi, dan tiap baris mencatat saldo sesudahnya */
  const tx = (await DB.prepare("SELECT jenis, delta, saldo FROM meja_stok WHERE gudang_id = ? ORDER BY id").bind(g.id).all()).results;
  assert.deepEqual(tx.map(t => [t.jenis, t.delta, t.saldo]), [["keluar", -30, 70], ["masuk", 5, 75], ["koreksi", -5, 70]]);
  const rin = (await api("GET", "/api/meja/catatan/" + g.id, undefined, p.h)).j; assert.equal(rin.transaksi.length, 3); assert.ok(rin.transaksi.every(t => ["Petugas", "Admin"].includes(t.oleh)), "petugas hanya melihat label tetap, bukan pelaku");
  assert.ok((await adm("GET", "/api/meja/catatan/" + g.id)).j.transaksi.every(t => t.oleh));
  /* logistik dikirim dari gudang */
  const minta = async (jml, barang = "beras") => { const l = (await baru(p.h, "logistik", undefined, undefined, logis({barang, jumlah_diminta: jml}))).j.catatan; assert.equal((await SAH(0, ADMIN, l.id, {ke: "disetujui"})).s, 200); return l.id; };
  const kirim = (id, gudang_asal, jml, extra = {}) => SAH(0, ADMIN, id, {ke: "dikirim", data: {jumlah_kirim: jml, tgl_kirim: hari(0), ...(gudang_asal ? {gudang_asal} : {}), ...extra}});
  const l1 = await minta(40); assert.equal((await kirim(l1, g.id, 0)).s, 400, "jumlah 0 dengan gudang"); assert.equal((await kirim(l1, "zzzz", 5)).s, 400, "id gudang liar"); assert.equal((await kirim(l1, hex(), 5)).s, 400, "gudang tidak ada");
  assert.equal((await kirim(l1, g2.id, 5)).s, 400, "gudang menyimpan barang lain"); assert.equal((await kirim(l1, gLain.id, 5)).s, 400, "gudang kab lain");
  assert.equal(await saldo(g.id), 70);
  const sendiri = await kirim(l1, g.id, 40); assert.equal(sendiri.s, 200, sendiri.t); assert.equal(sendiri.j.catatan.gudang_asal_nama, "Gudang Utama"); assert.equal(await saldo(g.id), 30);
  const t1 = await DB.prepare("SELECT jenis, delta, saldo, logistik_id FROM meja_stok WHERE gudang_id = ? ORDER BY id DESC").bind(g.id).first(); assert.deepEqual({...t1}, {jenis: "keluar", delta: -40, saldo: 30, logistik_id: l1});
  assert.equal((await adm("GET", "/api/meja/catatan/" + g.id)).j.catatan.status_efektif, "menipis", "stok 30 <= ambang 30"); assert.deepEqual((await adm("GET", "/api/meja/catatan/" + g.id)).j.catatan.tanda, ["stok_rendah"]);
  /* diterima tidak mengubah stok asal */
  assert.equal((await SAH(0, p.h, l1, {ke: "diterima", data: {jumlah_terima: 40, penerima: "Kepala Posko"}})).s, 200); assert.equal(await saldo(g.id), 30); assert.equal(await U.n("meja_stok", `logistik_id = '${l1}'`), 1);
  /* kurang: 409, logistik tetap disetujui, stok utuh, tanpa transaksi */
  const l2 = await minta(31), sebelum = await U.n("meja_stok"); const k2 = await kirim(l2, g.id, 31); assert.equal(k2.s, 409); assert.match(k2.j.galat, /tersisa 30/);
  assert.equal((await adm("GET", "/api/meja/catatan/" + l2)).j.catatan.status, "disetujui"); assert.equal(await saldo(g.id), 30); assert.equal(await U.n("meja_stok"), sebelum);
  /* kirim tanpa gudang asal tidak menyentuh stok */
  assert.equal((await kirim(l2, null, 31)).s, 200); assert.equal(await saldo(g.id), 30);
  /* dua pengiriman serentak untuk stok yang hanya cukup satu: tepat satu lolos, tidak minus */
  const a = await minta(20), b = await minta(20); const [ra, rb] = await Promise.all([kirim(a, g.id, 20), kirim(b, g.id, 20)]);
  assert.deepEqual([ra.s, rb.s].sort(), [200, 409], `${ra.t} | ${rb.t}`); assert.equal(await saldo(g.id), 10); assert.equal(await U.n("meja_stok", `gudang_id = '${g.id}'`), 5);
  const kalah = ra.s === 409 ? a : b; assert.equal((await adm("GET", "/api/meja/catatan/" + kalah)).j.catatan.status, "disetujui", "yang kalah tetap disetujui");
  /* ubah isi gudang: stok_awal dihitung ulang terhadap transaksi; nama/barang beku; tak boleh membuat saldo minus */
  const ub = (data, h = p.h) => api("POST", "/api/meja/catatan/" + g.id, {aksi: "ubah", data}, h);
  assert.equal((await ub(isi({stok_awal: 200}), ADMIN)).j.catatan.data.stok, 110, "stok awal 100 ke 200 = koreksi +100 dari saldo 10"); assert.equal((await ub(isi({barang: "tenda"}))).s, 409); assert.equal((await ub(isi({gudang: "Lain"}))).s, 409);
  assert.equal((await ub(isi({stok_awal: 0}), ADMIN)).s, 409, "saldo akan minus (110 - 200)"); assert.equal(await saldo(g.id), 110);
  /* ringkas dan rekap melihat gudang */
  const gr = (await adm("GET", "/api/meja/rekap")).j.per_kab.gudang["71|Kab Gudang"]; assert.equal(gr.n, 2); assert.equal(gr.status.menipis ?? 0, 1, "selimut 10 <= ambang 30");
});

uji("keamanan 2: stok_awal gudang hanya admin; selisih jadi baris koreksi; jejak 'isi diubah' memuat nilai lama ke baru", async () => {
  const p = await petugas("Kab Aman2", ["gudang"]);
  const g = (await baru(p.h, "gudang", undefined, undefined, {gudang: "G Aman", barang: "beras", satuan: "kg", stok_awal: 100, ambang_min: 30})).j.catatan;
  const isi = (o = {}) => ({gudang: "G Aman", barang: "beras", satuan: "kg", stok_awal: 100, ambang_min: 30, ...o});
  const ub = (data, h) => api("POST", "/api/meja/catatan/" + g.id, {aksi: "ubah", data}, h), n = q => U.n("meja_stok", `gudang_id = '${g.id}'${q ? " AND " + q : ""}`);
  const saldo = async () => (await DB.prepare("SELECT stok FROM meja_catatan WHERE id = ?").bind(g.id).first()).stok;
  const t = await ub(isi({stok_awal: 999}), p.h); assert.equal(t.s, 403, t.t); assert.equal(await saldo(), 100); assert.equal(await n(), 0, "tanpa baris stok");
  assert.equal((await ub(isi({ambang_min: 40}), p.h)).s, 200, "petugas boleh ubah ambang"); assert.equal(await saldo(), 100); assert.equal(await n(), 0);
  const a = await ub(isi({stok_awal: 150, ambang_min: 40}), ADMIN); assert.equal(a.s, 200, a.t); assert.equal(a.j.catatan.data.stok, 150);
  const k = await DB.prepare("SELECT jenis, delta, saldo, oleh FROM meja_stok WHERE gudang_id = ?").bind(g.id).all(); assert.equal(k.results.length, 1);
  assert.deepEqual([k.results[0].jenis, k.results[0].delta, k.results[0].saldo], ["koreksi", 50, 150]); assert.ok(k.results[0].oleh);
  assert.equal((await ub(isi({stok_awal: 150, ambang_min: 40}), ADMIN)).s, 200); assert.equal(await n(), 1, "kirim ulang nilai sama tidak menambah koreksi"); assert.equal(await saldo(), 150);
  const j = (await DB.prepare("SELECT catatan FROM meja_jejak WHERE catatan_id = ? ORDER BY id").bind(g.id).all()).results.map(x => x.catatan);
  assert.ok(j.some(c => /isi diubah/.test(c) && /ambang_min 30 ke 40/.test(c)), j.join(" | ")); assert.ok(j.some(c => /stok_awal 100 ke 150/.test(c) && /ambang_min 40 ke 40/.test(c) === false), j.join(" | "));
});

uji("sempurna: agregat meja_ringkas sama persis dengan hitung manual dari meja_catatan untuk data acak (tulis, ubah status, umur)", async () => {
  let seed = 20261020; const rnd = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; }, pilih = l => l[rnd(l.length)];
  const KAB = ["Kab Acak Satu", "Kab Acak Dua", "Kab Acak Tiga"], PV = ["55", "56"], ids = {};
  const ke = (meja, id) => (ids[meja] ??= []).push(id);
  const wil = () => [pilih(PV), pilih(KAB)];
  for (let i = 0; i < 14; i++) { const [pv, kb] = wil(); const c = (await baru(ADMIN, "kaji_cepat", pv, kb, kaji({rumah_rb: rnd(9), rumah_rs: rnd(9), rumah_rr: rnd(9), kejadian: pilih(["banjir", "longsor", "karhutla"])}), {desa: "Desa " + i})).j.catatan; ke("kaji", c.id);
    const n = rnd(3); if (n) await SAH(0, ADMIN, c.id, {ke: "diverifikasi"}); if (n > 1) { await SAH(0, ADMIN, c.id, {ke: "masuk_jitupasna"}); if (rnd(2)) await api("POST", "/api/meja/catatan", {meja: "rehab", prov: pv, kab: kb, kaji_id: c.id, data: rehabIsi({tgl_jitupasna: hari(rnd(100))})}, ADMIN); } }
  for (let i = 0; i < 12; i++) { const [pv, kb] = wil(); const c = (await baru(ADMIN, "logistik", pv, kb, logis({barang: pilih(BARANG), kebutuhan_untuk: rnd(500)}))).j.catatan; ke("logistik", c.id); if (rnd(2)) await SAH(0, ADMIN, c.id, {ke: "disetujui"}); }
  for (let i = 0; i < 6; i++) { const [pv, kb] = wil(); ke("dsp", (await baru(ADMIN, "dsp", pv, kb, dsp({nilai_diajukan: 1e6 * (1 + rnd(50))}))).j.catatan.id); }
  for (let i = 0; i < 8; i++) { const [pv, kb] = wil(); ke("renkon", (await baru(ADMIN, "renkon", pv, kb, {bencana: pilih(["banjir", "karhutla", "gempa"]), judul: "R" + i, tgl_sah: hari(600), berlaku_sampai: wib(KINI + (rnd(300) - 100) * HARI), ...(rnd(2) ? {uji_terakhir: hari(rnd(500))} : {})})).j.catatan.id); }
  for (let i = 0; i < 4; i++) { const [pv, kb] = wil(); ke("destana", (await baru(ADMIN, "destana", pv, kb, {kelas: "madya", tahun_dibentuk: 2020, ...(rnd(2) ? {kegiatan_terakhir: hari(rnd(700))} : {})}, {desa: "Desa T" + i, kec: "Kec T"})).j.catatan.id); }
  for (let i = 0; i < 5; i++) { const [pv, kb] = wil(); const c = (await baru(ADMIN, "gudang", pv, kb, {gudang: "G" + i, barang: pilih(BARANG), satuan: "kg", stok_awal: 50 + rnd(100), ambang_min: rnd(120)})).j.catatan; ke("gudang", c.id); if (rnd(2)) await api("POST", "/api/meja/catatan/" + c.id, {aksi: "stok", jenis: "keluar", jumlah: 1 + rnd(40)}, ADMIN); }
  /* umur acak lewat SQL (bukan lewat aplikasi), lalu paksa hitung ulang penuh */
  for (const id of [...ids.kaji, ...ids.logistik]) if (rnd(2)) { const d = KINI - (1 + rnd(200)) * JAM; await DB.prepare("UPDATE meja_catatan SET dibuat = ?, diubah = ? WHERE id = ?").bind(d, Math.min(KINI, d + rnd(100) * JAM + 1), id).run(); }
  const manual = async () => {
    const kini = Date.now(), raw = (await DB.prepare("SELECT meja, prov, kab, status, data, dibuat, diubah, stok FROM meja_catatan WHERE dummy = 0").all()).results, e = {kab: {}, prov: {}};
    for (const r of raw) {
      const rc = {meja: r.meja, status: r.status, data: {...JSON.parse(r.data), ...(r.stok != null ? {stok: r.stok} : {})}, dibuat: r.dibuat, diubah: r.diubah}, se = statusEfektif(r.meja, rc, kini);
      for (const [per, key] of [["kab", r.prov + "|" + r.kab], ["prov", r.prov]]) {
        const a = ((e[per][r.meja] ??= {})[key] ??= {n: 0, status: {}, bahaya: 0, jumlah: Object.fromEntries(MEJA[r.meja].rekap.map(c => [c, 0])), terbaru: 0});
        a.n++; a.status[se] = (a.status[se] || 0) + 1; if (tandaBahaya(r.meja, rc, kini).length) a.bahaya++; a.terbaru = Math.max(a.terbaru, r.diubah); for (const c of MEJA[r.meja].rekap) a.jumlah[c] += rc.data[c] || 0;
      }
    }
    return e;
  };
  const banding = async ket => {
    const e = await manual(), rk = (await adm("GET", "/api/meja/rekap")).j, pb = (await api("GET", "/api/meja/ringkas")).j;
    assert.deepEqual(rk.per_kab, e.kab, ket + ": rekap per kab"); assert.deepEqual(pb.meja, e.prov, ket + ": ringkas per provinsi");
    assert.ok(pb.dihitung > 0 && Date.now() - pb.dihitung < 60e3);
  };
  await DB.prepare("DELETE FROM meja_ringkas_meta").run(); await banding("hitung ulang penuh");
  assert.ok(Object.keys((await adm("GET", "/api/meja/rekap")).j.per_kab).length === 7 && (await U.n("meja_ringkas")) > 20, "semua tujuh meja ada di tabel ringkas");
  /* tulis lagi tanpa hitung ulang penuh: kelompok yang disentuh diperbarui di tulisan itu juga (n, status, bahaya) */
  const [pv, kb] = [PV[0], KAB[0]];
  for (let i = 0; i < 3; i++) await baru(ADMIN, "logistik", pv, kb, logis({kebutuhan_untuk: 7}));
  const l = (await baru(ADMIN, "logistik", pv, kb, logis())).j.catatan; await SAH(0, ADMIN, l.id, {ke: "disetujui"});
  const gdn = (await baru(ADMIN, "gudang", pv, kb, {gudang: "Gbaru", barang: "masker", satuan: "buah", stok_awal: 5, ambang_min: 9})).j.catatan; assert.equal(gdn.status_efektif, "menipis");
  await banding("sesudah tulis bertahap");
  /* tabel ringkas tidak memuat dummy; ringkas dummy=1 hanya admin */
  assert.equal(await U.n("meja_ringkas", "dummy = 1"), 0); assert.equal((await api("GET", "/api/meja/ringkas?dummy=1")).s, 200);
  /* penjelasan tanda berbasis waktu: tanpa tulis, bahaya baru terhitung saat tabel dibangun ulang (cron/jam atau lewat 2 jam) */
  const basi = (await adm("POST", "/api/meja/catatan", {meja: "logistik", prov: "57", kab: "Kab Waktu", data: logis()})).j.catatan;
  await DB.prepare("UPDATE meja_catatan SET dibuat = ?, diubah = ? WHERE id = ?").bind(KINI - 30 * JAM, KINI - 30 * JAM, basi.id).run();
  assert.equal((await adm("GET", "/api/meja/rekap")).j.per_kab.logistik["57|Kab Waktu"].bahaya, 0, "tabel belum tahu karena tidak ada tulis");
  await DB.prepare("UPDATE meja_ringkas_meta SET nilai = ?").bind(Date.now() - 3 * JAM).run();
  assert.equal((await adm("GET", "/api/meja/rekap")).j.per_kab.logistik["57|Kab Waktu"].bahaya, 1, "dibaca lewat 2 jam: dibangun ulang, tanda > 24 jam terhitung");
  /* lebih dari satu halaman pembacaan (>1000 baris) dan tanpa batas 20.000 */
  await DB.batch(Array.from({length: 1100}, (_, i) => DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'logistik', '58', 'Kab Banyak', ?, 'diminta', ?, ?)").bind(hex(), JSON.stringify(logis()), KINI, KINI)));
  await DB.prepare("DELETE FROM meja_ringkas_meta").run(); assert.equal((await adm("GET", "/api/meja/rekap")).j.per_kab.logistik["58|Kab Banyak"].n, 1100);
});

uji("sempurna: ekspor DIBI csv/json hanya admin, kolom DIBI, BOM, sel rumus dinetralkan, rentang tanggal", async () => {
  assert.deepEqual(Object.keys(DIBI_JENIS).sort(), [...BENCANA].sort(), "tiap bencana punya nama DIBI"); assert.equal(DIBI_KOLOM.length, 19);
  assert.equal(selCsv("=1+1"), `"'=1+1"`); assert.equal(selCsv("@x"), `"'@x"`); assert.equal(selCsv("-5a"), `"'-5a"`); assert.equal(selCsv('a"b,c\nd'), '"a""b,c\nd"'); assert.equal(selCsv(7), '"7"'); assert.equal(selCsv(null), '""');
  const mk = (tgl, desa, o = {}, h = ADMIN) => baru(h, "kaji_cepat", "71", "Kab Ekspor", kaji({tanggal: tgl, ...o}), {desa});
  await mk("2026-03-10", "=HYPERLINK(\"http://x\")", {meninggal: 2, hilang: 1, luka: 3, mengungsi: 40, rumah_rb: 4, rumah_rs: 5, rumah_rr: 6, sekolah: 1, faskes: 2, ibadah: 3, kejadian: "longsor"});
  await mk("2026-03-20", 'Desa "Kutip", Baru', {kejadian: "karhutla"}); await mk("2026-04-02", "Desa Luar Rentang");
  const pt = await petugas("Kab Ekspor", ["kaji_cepat"]); await baru(pt.h, "kaji_cepat", undefined, undefined, kaji({tanggal: "2026-03-15"}), {desa: "Desa Petugas"});
  const url = f => `/api/meja/ekspor?meja=kaji_cepat&dari=2026-03-01&sampai=2026-03-31${f}`;
  for (const [m, h] of [["tanpa token", {}], ["token salah", {"x-admin-token": "salah"}], ["petugas", pt.h], ["akun gerbang", {}]]) assert.equal((await api("GET", url("&format=csv"), undefined, h)).s, 403, m);
  assert.equal((await api("GET", url("&format=xlsx"), undefined, ADMIN)).s, 400); assert.equal((await api("GET", "/api/meja/ekspor?meja=dsp", undefined, ADMIN)).s, 400);
  assert.equal((await api("GET", "/api/meja/ekspor?dari=2026-13-40", undefined, ADMIN)).s, 400); assert.equal((await api("GET", "/api/meja/ekspor?dari=2026-05-01&sampai=2026-04-01", undefined, ADMIN)).s, 400);
  const c = await api("GET", url("&format=csv"), undefined, ADMIN); assert.equal(c.s, 200, c.t);
  assert.match(c.h.get("content-type"), /text\/csv; charset=utf-8/); assert.match(c.h.get("content-disposition"), /attachment; filename="dibi-kaji_cepat-\d{4}-\d{2}-\d{2}\.csv"/); assert.equal(c.h.get("cache-control"), "no-store");
  const mentah = new Uint8Array(await (await U.mf.dispatchFetch("http://bnpb.lokal" + url("&format=csv"), {headers: ADMIN})).arrayBuffer());
  assert.deepEqual([...mentah.slice(0, 3)], [0xef, 0xbb, 0xbf], "BOM UTF-8");   // fetch.text() membuang BOM, jadi byte dibaca langsung
  assert.ok(c.t.startsWith(DIBI_KOLOM.map(k => `"${k}"`).join(",") + "\r\n"), "kepala DIBI");
  const baris = c.t.split("\r\n"); assert.equal(baris.length, 1 + 3, "3 kaji dalam rentang, tanpa yang di luar rentang");
  assert.ok(c.t.includes(`"'=HYPERLINK(""http://x"")"`), "sel berawalan = dinetralkan dan kutip digandakan"); assert.ok(!baris.some(b => b.includes(',"=HYPERLINK')), "tidak ada sel yang diawali ="); assert.ok(c.t.includes(`"Desa ""Kutip"", Baru"`));
  assert.ok(!c.t.includes("Desa Luar Rentang"));
  assert.ok(baris[1].includes('"TANAH LONGSOR"') && baris[1].includes('"2026-03-10"') && baris[1].includes('"Sulawesi Utara"') && baris[1].includes('"Kab Ekspor"') && baris[1].includes('"belum diverifikasi"'));
  assert.ok(!c.t.includes("admin:") && !c.t.includes("petugas:"), "tidak membocorkan identitas pelaku");
  const j = await api("GET", url("&format=json"), undefined, ADMIN); assert.equal(j.s, 200); assert.deepEqual(j.j.kolom, DIBI_KOLOM); assert.equal(j.j.baris.length, 3); assert.equal(j.j.dipotong, false);
  const a = j.j.baris.find(x => x.desa.startsWith("=")); assert.deepEqual([a.jenis_bencana, a.tanggal, a.provinsi, a.kabupaten, a.meninggal, a.hilang, a.luka, a.mengungsi, a.rumah_rusak_berat, a.rumah_rusak_sedang, a.rumah_rusak_ringan, a.fasilitas_pendidikan, a.fasilitas_kesehatan, a.fasilitas_ibadah],
    ["TANAH LONGSOR", "2026-03-10", "Sulawesi Utara", "Kab Ekspor", 2, 1, 3, 40, 4, 5, 6, 1, 2, 3]); assert.equal(a.sumber, "Admin pusat (Meja Kerja)"); assert.equal(a.desa, '=HYPERLINK("http://x")', "JSON apa adanya (bukan lembar kerja)");
  assert.ok(j.j.baris.some(x => x.sumber === "BPBD kab/kota (Meja Kerja)" && x.desa === "Desa Petugas"));
  assert.equal((await api("GET", "/api/meja/ekspor?dari=2026-04-01&sampai=2026-04-30", undefined, ADMIN)).t.split("\r\n").length, 2, "default csv, satu baris");
  assert.equal((await adm("GET", "/api/meja/ekspor?sampai=2026-03-12&dari=2026-03-12&format=json")).j.baris.length, 0);
});

uji("sempurna: dummy mengisi tiap status rehab (satu macet), gudang di bawah ambang, transaksi lahir dari logistik dikirim, ringkas dan rapor bukan nol", async () => {
  const asli = {ringkas: await U.n("meja_ringkas", "dummy = 0")};
  const i = await adm("POST", "/api/meja/dummy", {aksi: "isi"}); assert.equal(i.s, 201, i.t); assert.ok(i.j.transaksi_stok >= 5);
  const rh = (await adm("GET", "/api/meja/catatan?meja=rehab")).j.catatan.filter(x => x.dummy);
  for (const s of MEJA.rehab.status) assert.ok(rh.some(x => x.status === s), "rehab tanpa status " + s);
  assert.equal(rh.filter(x => x.tanda.includes("macet")).length, 1, "tepat satu rehab macet"); assert.equal(rh.find(x => x.tanda.includes("macet")).status, "usulan");
  assert.ok(rh.every(x => x.kaji_id && x.desa), "tiap rehab tertaut ke kaji dummy"); assert.equal(new Set(rh.map(x => x.kaji_id)).size, rh.length);
  for (const x of rh) { const k = await DB.prepare("SELECT meja, status, kab, dummy FROM meja_catatan WHERE id = ?").bind(x.kaji_id).first(); assert.deepEqual({...k}, {meja: "kaji_cepat", status: "masuk_jitupasna", kab: x.kab, dummy: 1}); }
  const gd = (await adm("GET", "/api/meja/catatan?meja=gudang")).j.catatan.filter(x => x.dummy);
  assert.ok(gd.some(x => x.status_efektif === "menipis" && x.tanda.includes("stok_rendah")) && gd.some(x => x.status_efektif === "cukup"));
  assert.equal(gd.filter(x => x.status_efektif === "menipis").length, 1, "tepat satu di bawah ambang");
  /* rantai: stok = stok awal + jumlah transaksi; tiap logistik dikirim/diterima ber-gudang_asal punya transaksi keluar sebesar jumlah_kirim */
  for (const g of gd) {
    const sum = (await DB.prepare("SELECT coalesce(sum(delta), 0) s, count(*) n FROM meja_stok WHERE gudang_id = ?").bind(g.id).first());
    assert.equal(g.data.stok, g.data.stok_awal + sum.s, g.data.gudang + " " + g.data.barang); assert.ok(sum.n >= 1); assert.ok(g.data.stok >= 0);
    const akhir = await DB.prepare("SELECT saldo FROM meja_stok WHERE gudang_id = ? ORDER BY waktu DESC, id DESC LIMIT 1").bind(g.id).first(); assert.equal(akhir.saldo, g.data.stok, "saldo transaksi terakhir = stok");
  }
  const lg = (await adm("GET", "/api/meja/catatan?meja=logistik")).j.catatan.filter(x => x.dummy && x.data.gudang_asal);
  assert.ok(lg.length >= 3);
  for (const l of lg) { const t = await DB.prepare("SELECT jenis, delta, gudang_id FROM meja_stok WHERE logistik_id = ?").bind(l.id).first(); assert.deepEqual({...t}, {jenis: "keluar", delta: -l.data.jumlah_kirim, gudang_id: l.data.gudang_asal}); assert.ok(l.gudang_asal_nama); }
  assert.equal((await DB.prepare("SELECT count(*) n FROM meja_stok WHERE jenis = 'masuk'").first()).n >= 2, true); assert.equal((await DB.prepare("SELECT count(*) n FROM meja_stok WHERE jenis = 'koreksi'").first()).n >= 1, true);
  /* ringkas dan rapor bukan nol */
  const dum = (await adm("GET", "/api/meja/ringkas?dummy=1")).j.meja; assert.ok(dum.rehab["62"].n >= 9 && dum.rehab["62"].bahaya === 1 && dum.gudang["62"].n === 4 && dum.gudang["62"].bahaya === 1);
  const rap = (await adm("GET", "/api/meja/rapor?dummy=1")).j.kab.find(k => k.kab === "Kab. Contoh Meja A"); assert.ok(rap.kelengkapan.meja.rehab.n >= 8 && rap.kelengkapan.meja.rehab.bahaya === 1 && rap.kelengkapan.meja.gudang.bahaya === 1 && rap.skor > 0);
  assert.equal(await U.n("meja_ringkas", "dummy = 0"), asli.ringkas, "ringkas asli tak berubah");
  const h = await adm("POST", "/api/meja/dummy", {aksi: "hapus"}); assert.equal(h.s, 200, h.t); assert.ok(h.j.transaksi_stok >= 5);
  for (const t of ["meja_catatan", "meja_stok", "meja_jejak", "meja_ringkas", "meja_ringkas_bencana"]) assert.equal(await U.n(t, "dummy = 1"), 0, t);
  assert.equal((await adm("POST", "/api/meja/dummy", {aksi: "isi"})).s, 201, "bisa diisi lagi"); assert.equal((await adm("POST", "/api/meja/dummy", {aksi: "hapus"})).s, 200);
});

/* ============================================================ juklak: kaji cepat lengkap, pengungsi, pengaduan, klaster, risiko, migrasi 0118 */
const pengungsi = (o = {}) => ({tgl_data: hari(1), nama_tempat: "Balai Uji", jenis_tempat: "terkonsentrasi", kejadian: "banjir", tgl_buka: hari(3), kk: 5, bayi_l: 1, bayi_p: 1, balita_l: 1, balita_p: 1, anak_l: 1, anak_p: 1, remaja_l: 1, remaja_p: 1, dewasa_l: 2, dewasa_p: 2, lansia_l: 1, lansia_p: 1,
  keb_air: "ada", keb_pangan: "ada", keb_sandang: "ada", keb_kesehatan: "ada", keb_hunian: "ada", keb_pendidikan: "ada", ...o});
const aduan = (o = {}) => ({nomor_register: "ULP/" + hex(), kanal: "telepon", tgl_terima: hari(2), perihal: "Hal uji", uraian: "Uraian aduan uji", ...o});
const risikoUji = (o = {}) => ({unit_pemilik: "Biro Uji", tahun: 2026, jenis_konteks: "program", nama_konteks: "Program Uji", indikator: "Indikator Uji", kode: "UJI." + hex().slice(0, 6), pernyataan: "Pernyataan uji", kategori: "operasional", dampak: "Dampak uji", spip: "ketaatan",
  skor_kemungkinan: 3, skor_dampak: 4, level: 12, pengendalian: "ada", memadai: "memadai", res_kemungkinan: 2, res_dampak: 2, res_level: 4, selera: 6, ...o});
const buatStaf = async (kunci, peran) => {   // sesi staf sungguhan; peran ulp/irtama belum masuk trigger staf_larik_sah, trigger dilepas hanya di D1 uji sampai PERAN src/staf.js didaftarkan
  await DB.prepare("DROP TRIGGER IF EXISTS staf_larik_sah").run();
  const tok = kunci.repeat(64), id = (kunci + "4").repeat(8);
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy) VALUES (?, ?, ?, ?, 'Inspektorat', ?, ?, ?, '[]', ?, ?, 0, 1, 'tes', 0)`)
    .bind(id, "juklak" + kunci, "Staf Juklak " + kunci, "9200" + kunci + "000", kunci + "@b.id", "628100000" + kunci.charCodeAt(0), JSON.stringify(peran), "a".repeat(32), "a".repeat(64)).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 3600e3).run();
  return {cookie: "sesi_staf=" + tok, "x-pb": "1"};
};
const st = (h, id, b) => api("POST", "/api/meja/catatan/" + id, {aksi: "status", ...b}, h);

uji("juklak kaji cepat: kolom opsional baru tersimpan, rekomendasi Ya/Tidak dijaga, baris kaji cepat lama tetap terbaca dan bisa diubah", async () => {
  const b = await adm("POST", "/api/meja/catatan", {meja: "kaji_cepat", prov: "71", kab: "Kab Kaji Lengkap", desa: "Desa K", data: kaji({terancam_jiwa: 900, terdampak_kk: 40, rentan_bayi: 3, kesehatan: "Pos kesehatan", air_sanitasi: "Tangki air", kebutuhan: "Tenda 10 unit", rek_status: "ya", rek_status_hari: 14, rek_alasan: "Masih hujan"})});
  assert.equal(b.s, 201, b.t); assert.equal(b.j.catatan.data.rek_status_hari, 14);
  for (const o of [{rek_status: "ya"}, {rek_status: "tidak", rek_status_hari: 5}, {rek_status: "mungkin"}]) assert.equal((await adm("POST", "/api/meja/catatan", {meja: "kaji_cepat", prov: "71", kab: "Kab Kaji Lengkap", desa: "Desa L", data: kaji(o)})).s, 400, JSON.stringify(o));
  const id = hex(), lama = {kejadian: "gempa", tanggal: hari(4), rumah_rb: 1, rumah_rs: 1, rumah_rr: 1, sekolah: 0, faskes: 0, ibadah: 0, jalan_km: 0, jembatan: 0, meninggal: 0, hilang: 0, luka: 0, mengungsi: 2};
  await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, desa, data, status, dibuat, diubah) VALUES (?, 'kaji_cepat', '71', 'Kab Kaji Lama', 'Desa Lama', ?, 'dilaporkan', ?, ?)").bind(id, JSON.stringify(lama), KINI, KINI).run();
  const r = (await adm("GET", "/api/meja/catatan?meja=kaji_cepat&prov=71&kab=" + encodeURIComponent("Kab Kaji Lama"))).j.catatan.find(x => x.id === id);
  assert.ok(r, "baris lama terbaca"); assert.deepEqual(r.data, lama, "data lama tidak berubah saat dibaca");
  const u = await adm("POST", "/api/meja/catatan/" + id, {aksi: "ubah", data: lama}); assert.equal(u.s, 200, u.t); assert.deepEqual(u.j.catatan.data, lama, "catatan lama tetap sah tanpa kolom baru");
  assert.equal((await st(ADMIN, id, {ke: "diverifikasi"})).s, 200, "alur status tetap jalan");
});

uji("juklak pengungsi: agregat tanpa nama, turunan dihitung server, jumlah harian terbaru per tempat, satu per tempat per hari, batas 6000 huruf", async () => {
  const p = await petugas("Kab Pengungsi", ["pengungsi", "klaster"]);
  const w = {desa: "Desa U", kec: "Kec U"}, b1 = await baru(p.h, "pengungsi", undefined, undefined, pengungsi(), w); assert.equal(b1.s, 201, b1.t);
  assert.equal(b1.j.catatan.data.jiwa_total, 14); assert.equal(b1.j.catatan.data.jiwa_l, 7); assert.equal(b1.j.catatan.data.umur_dewasa, 4); assert.equal(b1.j.catatan.status_efektif, "berjalan");
  for (const [o, ket] of [[{jiwa_total: 999}, "kolom turunan dari klien"], [{nik: "3171"}, "tanpa NIK"], [{nama_pengungsi: "Budi"}, "tanpa nama"], [{kk: 15}, "KK melebihi jiwa"], [{keb_air: "mungkin"}, "sektor ada/tidak"], [{jenis_tempat: "lain"}, "jenis"], [{tgl_data: hari(5)}, "tanggal sebelum buka"]])
    assert.equal((await baru(p.h, "pengungsi", undefined, undefined, pengungsi(o), w)).s, 400, ket);
  assert.equal((await baru(p.h, "pengungsi", undefined, undefined, pengungsi(), {kec: "Kec U"})).s, 400, "desa wajib");
  assert.equal((await baru(p.h, "pengungsi", undefined, undefined, pengungsi({nama_tempat: "balai uji"}), w)).s, 409, "satu per tempat per hari, huruf besar diabaikan");
  const b2 = await baru(p.h, "pengungsi", undefined, undefined, pengungsi({tgl_data: hari(0), kk: 6, dewasa_l: 5}), w); assert.equal(b2.s, 201, b2.t);
  assert.equal((await api("POST", "/api/meja/catatan/" + b1.j.catatan.id, {aksi: "ubah", data: pengungsi({tgl_data: hari(0)})}, p.h)).s, 409, "ubah ke tanggal yang sudah ada");
  const b3 = await baru(p.h, "pengungsi", undefined, undefined, pengungsi({nama_tempat: "Balai Tutup", tgl_data: hari(2), tgl_tutup: hari(1)}), w); assert.equal(b3.s, 201, b3.t); assert.equal(b3.j.catatan.status_efektif, "ditutup");
  const rk = (await adm("GET", "/api/meja/rekap")).j.per_kab.pengungsi["71|Kab Pengungsi"];
  assert.equal(rk.n, 3); assert.equal(rk.status.berjalan, 2); assert.equal(rk.status.ditutup, 1);
  assert.equal(rk.jumlah.kk, 6, "KK dari catatan terbaru, tanpa tempat tertutup dan tanpa hari lama"); assert.equal(rk.jumlah.jiwa_total, 17, "jiwa terbaru 17, bukan jumlah semua hari");
  /* kolom terpanjang lewat rute: JSON tetap dalam CHECK 6000 huruf */
  const penuh = {};
  for (const c of MEJA.pengungsi.kolom.filter(c => (c.tahap ?? null) === null)) penuh[c.nama] = c.tipe === "angka" ? c.maks : c.tipe === "teks" ? '"'.repeat(c.maks) : c.tipe === "pilih" ? c.nilai.reduce((a, x) => x.length > a.length ? x : a, "") : hari(0);
  penuh.tgl_tutup = hari(0); const v = validasi("pengungsi", penuh, null, KINI); assert.ok(!v.galat, v.galat); assert.ok(JSON.stringify(v.data).length <= 6000, "JSON terpanjang: " + JSON.stringify(v.data).length);
  const bb = await adm("POST", "/api/meja/catatan", {meja: "pengungsi", prov: "71", kab: "Kab Batas", desa: "Desa B", kec: "Kec B", data: penuh}); assert.equal(bb.s, 201, bb.t);
  assert.ok((await DB.prepare("SELECT length(data) n FROM meja_catatan WHERE id = ?").bind(bb.j.catatan.id).first()).n <= 6000);
});

uji("juklak pengaduan: alur register sampai selesai, tolak lompat tahap, tenggat 15/20 hari kerja, petugas tidak bisa memegang meja ini", async () => {
  assert.equal((await adm("POST", "/api/meja/petugas", {nama: "X Y", prov: "71", kab: "Kab Z", meja: ["pengaduan"]})).s, 400, "pengaduan bukan meja petugas");
  assert.ok(await DB.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'Coba', '71', 'Kab Z', ?, ?, 1)").bind(hex(), '["risiko"]', "e".repeat(64)).run().then(() => false, () => true), "trigger meja_petugas_sah menolak meja pusat");
  const a = await adm("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan()}); assert.equal(a.s, 201, a.t); assert.equal(a.j.catatan.prov, "00"); assert.equal(a.j.catatan.kab, "BNPB Pusat"); assert.equal(a.j.catatan.status, "register");
  const id = a.j.catatan.id;
  for (const ke of ["tindak_lanjut", "selesai", "bogus"]) assert.equal((await st(ADMIN, id, {ke})).s, 409, "lompat tahap " + ke);
  assert.equal((await st(ADMIN, id, {ke: "telaah", data: {kategori: "aneh"}})).s, 400, "kategori sah");
  assert.equal((await st(ADMIN, id, {ke: "telaah", data: {kategori: "berkadar_pengawasan", wewenang: "bnpb", hasil_telaah: "Ada indikasi", tgl_telaah: hari(1)}})).s, 200);
  assert.equal((await st(ADMIN, id, {ke: "diteruskan", data: {tujuan: "Inspektorat III", tgl_diteruskan: hari(1)}})).s, 200);
  assert.equal((await st(ADMIN, id, {ke: "tindak_lanjut", data: {tindakan: "pemeriksaan_audit", tgl_tindak: hari(0)}})).s, 200);
  const s = await st(ADMIN, id, {ke: "selesai", data: {simpulan: "Terbukti sebagian", tgl_selesai: hari(0)}}); assert.equal(s.s, 200, s.t); assert.equal(s.j.catatan.status, "selesai");
  /* register ganda, tolak dari telaah, tenggat */
  const nomor = "ULP/GANDA"; assert.equal((await adm("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan({nomor_register: nomor})})).s, 201);
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan({nomor_register: nomor})})).s, 409, "nomor register unik");
  const t = (await adm("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan({tgl_terima: hari(45)})})).j.catatan; assert.ok(t.tanda.includes("lewat_tenggat"), "20 hari kerja terlewati");
  assert.equal((await st(ADMIN, t.id, {ke: "telaah", data: {kategori: "tidak_berkadar_pengawasan", wewenang: "bnpb", hasil_telaah: "Telaah", tgl_telaah: hari(44)}})).s, 200);
  assert.equal((await st(ADMIN, t.id, {ke: "ditolak", data: {alasan: "Tidak memenuhi 5W"}})).s, 200); assert.equal((await st(ADMIN, t.id, {ke: "selesai", data: {simpulan: "x", tgl_selesai: hari(0)}})).s, 409);
  const lt = (await adm("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan({tgl_terima: hari(45)})})).j.catatan;
  for (const [ke, data] of [["telaah", {kategori: "berkadar_pengawasan", wewenang: "bnpb", hasil_telaah: "T", tgl_telaah: hari(44)}], ["diteruskan", {tujuan: "Inspektorat III", tgl_diteruskan: hari(40)}], ["tindak_lanjut", {tindakan: "klarifikasi", tgl_tindak: hari(10)}]]) assert.equal((await st(ADMIN, lt.id, {ke, data})).s, 200, ke);
  assert.equal((await st(ADMIN, lt.id, {ke: "selesai", data: {simpulan: "Terlambat", tgl_selesai: hari(0)}})).s, 400, "melewati tenggat wajib penjelasan");
  assert.equal((await st(ADMIN, lt.id, {ke: "selesai", data: {simpulan: "Terlambat", tgl_selesai: hari(0), penjelasan_lambat: "Tim audit menunggu dokumen"}})).s, 200);
});

uji("juklak pengaduan: identitas pelapor terpisah, tidak bocor di daftar/rincian/rekap/ringkas/ekspor, dibuka hanya peran Irtama/ULP, tiap buka tercatat", async () => {
  const ulp = await buatStaf("d", ["ulp"]), biasa = await buatStaf("e", ["pusdalops"]), RAHASIA = "Sri Rahasia Pelapor", kontak = "0811-9999-777";
  const dt = aduan(); const a = await api("POST", "/api/meja/catatan", {meja: "pengaduan", data: dt, pelapor: {nama: RAHASIA, alamat: "Jalan Rahasia 7", kontak, pekerjaan: "Guru"}}, ulp); assert.equal(a.s, 201, a.t);
  const id = a.j.catatan.id, anon = await api("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan()}, ulp); assert.equal(anon.s, 201, anon.t);
  /* moderator mencatat tanpa identitas; identitas ditolak; pelapor pada meja lain ditolak; petugas ditolak */
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan(), pelapor: {nama: "Ini Ditolak"}})).s, 403, "moderator tidak menulis identitas");
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "kaji_cepat", prov: "71", kab: "Kab Y", desa: "Desa Y", data: kaji(), pelapor: {nama: "X"}})).s, 400);
  assert.equal((await api("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan(), pelapor: {nama: "x", nik: "1"}}, ulp)).s, 400, "kolom identitas dikunci");
  assert.equal((await api("POST", "/api/meja/catatan", {meja: "pengaduan", data: aduan(), pelapor: "nama"}, ulp)).s, 400, "pelapor harus objek");
  const baris = await DB.prepare("SELECT data FROM meja_catatan WHERE id = ?").bind(id).first(); assert.ok(!baris.data.includes(RAHASIA) && !baris.data.includes(kontak), "kolom data bersih");
  assert.equal((await DB.prepare("SELECT nama FROM meja_pelapor WHERE catatan_id = ?").bind(id).first()).nama, RAHASIA);
  /* tiap jalur baca, admin dan ULP: tidak memuat identitas */
  await adm("POST", "/api/meja/dummy", {aksi: "isi"});
  const jalur = [["GET", "/api/meja/catatan?meja=pengaduan", ADMIN], ["GET", "/api/meja/catatan?meja=pengaduan", ulp], ["GET", "/api/meja/catatan/" + id, ADMIN], ["GET", "/api/meja/catatan/" + id, ulp], ["GET", "/api/meja/rekap", ADMIN], ["GET", "/api/meja/rekap?dummy=1", ADMIN], ["GET", "/api/meja/rapor", ADMIN], ["GET", "/api/meja/ringkas", {}], ["GET", "/api/meja/ringkas?dummy=1", ADMIN], ["GET", "/api/meja/rapor/publik", {}], ["GET", "/api/meja/ekspor?meja=risiko", ADMIN], ["GET", "/api/meja/ekspor?meja=kaji_cepat", ADMIN]];
  for (const [m, j, h] of jalur) { const r = await api(m, j, undefined, h); assert.equal(r.s, 200, `${j}: ${r.t.slice(0, 200)}`); for (const x of [RAHASIA, kontak, "Jalan Rahasia", "Pelapor 1"]) assert.ok(!r.t.includes(x), `${j} membocorkan ${x}`); }
  assert.equal((await api("GET", "/api/meja/ekspor?meja=pengaduan", undefined, ADMIN)).s, 400, "pengaduan tidak punya jalur ekspor");
  /* pengaduan, risiko, klaster tidak tampil di layar publik */
  const ring = (await api("GET", "/api/meja/ringkas")).j.meja; for (const m of ["pengaduan", "risiko", "klaster"]) assert.ok(!(m in ring), m + " keluar dari ringkas publik");
  assert.ok(!(await api("GET", "/api/meja/rekap", undefined, ADMIN)).j.tanpa_renkon?.banjir?.some(k => k.startsWith("00|")), "pusat bukan kabupaten tanpa renkon");
  await adm("POST", "/api/meja/dummy", {aksi: "hapus"});
  /* membuka identitas: hanya peran Irtama/ULP */
  const J = "/api/meja/pelapor/" + id;
  assert.equal((await api("GET", J)).s, 403); assert.equal((await api("GET", J, undefined, ADMIN)).s, 403, "moderator pun ditolak"); assert.equal((await api("GET", J, undefined, biasa)).s, 403, "staf peran lain ditolak");
  const d = await api("GET", J, undefined, ulp); assert.equal(d.s, 200, d.t); assert.deepEqual(d.j, {anonim: false, pelapor: {nama: RAHASIA, alamat: "Jalan Rahasia 7", kontak, pekerjaan: "Guru"}});
  const j = (await api("GET", "/api/meja/catatan/" + id, undefined, ADMIN)).j.jejak; assert.ok(j.some(x => x.catatan === "identitas pelapor dibuka" && x.oleh.startsWith("staf:")), "pembukaan tercatat"); assert.ok(!JSON.stringify(j).includes(RAHASIA), "jejak tanpa isi identitas");
  assert.deepEqual((await api("GET", "/api/meja/pelapor/" + anon.j.catatan.id, undefined, ulp)).j, {anonim: true, pelapor: null});
  assert.equal((await api("GET", "/api/meja/pelapor/" + hex(), undefined, ulp)).s, 404);
  const kj = (await adm("POST", "/api/meja/catatan", {meja: "kaji_cepat", prov: "71", kab: "Kab X", desa: "Desa X", data: kaji()})).j.catatan.id; assert.equal((await api("GET", "/api/meja/pelapor/" + kj, undefined, ulp)).s, 404, "bukan catatan pengaduan");
  /* peran ULP terkunci ke meja pengaduan */
  assert.equal((await api("GET", "/api/meja/catatan?meja=dsp", undefined, ulp)).s, 403); assert.equal((await api("GET", "/api/meja/catatan/" + kj, undefined, ulp)).s, 404); assert.equal((await api("POST", "/api/meja/catatan", {meja: "dsp", prov: "71", kab: "Y", data: dsp()}, ulp)).s, 403); assert.equal((await api("GET", "/api/meja/rekap", undefined, ulp)).s, 403);
  assert.deepEqual((await api("GET", "/api/meja/saya", undefined, ulp)).j, {peran: "ulp"});
});

uji("juklak klaster: dokumen per kabupaten lewat petugas, aturan triwulan, tidak memegang stok", async () => {
  const p = await petugas("Kab Klaster", ["klaster"]), b = (o = {}) => ({tingkat: "kabupaten_kota", dokumen: "rencana_kerja", judul: "Rencana Kerja Uji", tahun: 2026, tgl_dokumen: hari(1), ...o});
  const a = await baru(p.h, "klaster", undefined, undefined, b()); assert.equal(a.s, 201, a.t); assert.equal(a.j.catatan.status, "tercatat"); assert.deepEqual(a.j.catatan.tanda, ["tanpa_dokumen"]);
  assert.equal((await baru(p.h, "klaster", undefined, undefined, b({dokumen: "laporan_triwulan"}))).s, 400, "triwulan wajib"); assert.equal((await baru(p.h, "klaster", undefined, undefined, b({triwulan: "2"}))).s, 400, "triwulan hanya laporan triwulan");
  assert.equal((await baru(p.h, "klaster", undefined, undefined, b({stok: 5}))).s, 400, "tidak ada kolom stok"); assert.equal((await baru(p.h, "klaster", undefined, undefined, b({tautan: "javascript:alert(1)"}))).s, 400, "tautan http saja");
  const c = await baru(p.h, "klaster", undefined, undefined, b({dokumen: "laporan_triwulan", triwulan: "3", tautan: "https://contoh.invalid/x"})); assert.equal(c.s, 201, c.t); assert.deepEqual(c.j.catatan.tanda, []);
  assert.ok(!MEJA.klaster.kolom.some(k => /stok|gudang|barang/.test(k.nama)), "stok tetap di LogPal (KEPUTUSAN-LOGPAL)"); assert.deepEqual(MEJA.klaster.transisi, {}, "tanpa tahap persetujuan (Q2 LogPal belum dijawab pemilik)");
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "klaster", prov: "00", kab: "Nasional", data: b({tingkat: "nasional", tautan: "https://contoh.invalid/n"})})).s, 201, "klaster nasional lewat admin");
});

uji("juklak risiko: register per unit, level residu dijaga, status turunan selera, ekspor CSV Lampiran I Format 2, 3, 4", async () => {
  const p = await petugas("Kab Risiko", ["kaji_cepat"]); assert.equal((await baru(p.h, "risiko", undefined, undefined, risikoUji())).s, 403);
  const a = await adm("POST", "/api/meja/catatan", {meja: "risiko", data: risikoUji({kode: "UJI.A1", res_level: 4, selera: 6})}); assert.equal(a.s, 201, a.t); assert.equal(a.j.catatan.prov, "00"); assert.equal(a.j.catatan.status_efektif, "dalam_selera"); assert.deepEqual(a.j.catatan.tanda, []);
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "risiko", data: risikoUji({kode: "UJI.A1"})})).s, 409, "kode unik per unit dan tahun");
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "risiko", data: risikoUji({kode: "UJI.A2", pengendalian: "belum_ada", memadai: undefined, res_level: 4})})).s, 400, "belum ada pengendalian: residu tidak turun");
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "risiko", data: risikoUji({kode: "UJI.A2", memadai: "belum_memadai", res_level: 4})})).s, 400, "belum memadai: residu tidak turun");
  assert.equal((await adm("POST", "/api/meja/catatan", {meja: "risiko", data: risikoUji({kode: "UJI.A2", kategori: "x"})})).s, 400); assert.equal((await adm("POST", "/api/meja/catatan", {meja: "risiko", data: risikoUji({kode: "UJI.A2", skor_kemungkinan: 6})})).s, 400);
  const b = await adm("POST", "/api/meja/catatan", {meja: "risiko", data: risikoUji({kode: "UJI.B1", res_level: 12, memadai: "belum_memadai", selera: 6})}); assert.equal(b.s, 201, b.t); assert.equal(b.j.catatan.status_efektif, "di_atas_selera"); assert.deepEqual(b.j.catatan.tanda, ["di_atas_selera"]);
  const c = await adm("POST", "/api/meja/catatan", {meja: "risiko", data: risikoUji({kode: "UJI.C1", res_level: 15, memadai: "belum_memadai", level: 15, selera: 6, pernyataan: "=SUM(1)"})}); assert.equal(c.s, 201, c.t);
  for (const [n, kolom] of Object.entries(EKSPOR_RISIKO)) {
    const r = await api("GET", `/api/meja/ekspor?meja=risiko&lampiran=${n}`, undefined, ADMIN); assert.equal(r.s, 200, r.t); assert.match(r.h.get("content-disposition"), new RegExp(`risiko-format${n}-`));
    assert.equal(r.t.replace(/^﻿/, "").split("\r\n")[0], kolom.kolom.map(x => `"${x}"`).join(","), `kepala Format ${n}`);
    assert.ok(r.t.includes("'=SUM(1)"), `Format ${n}: rumus dinetralkan`);
  }
  const f4 = (await api("GET", "/api/meja/ekspor?meja=risiko&lampiran=4", undefined, ADMIN)).t.replace(/^﻿/, "").split("\r\n").slice(1);
  assert.equal(f4.length, 2, "Format 4 hanya di atas selera"); assert.ok(f4[0].includes("UJI.C1") && f4[1].includes("UJI.B1"), "urut dari level tertinggi");
  assert.equal((await api("GET", "/api/meja/ekspor?meja=risiko&lampiran=9", undefined, ADMIN)).s, 400);
  assert.equal((await api("GET", "/api/meja/ekspor?meja=risiko")).s, 403, "ekspor hanya admin");
});

uji("migrasi 0118 di atas data lama: semua baris lolos, FK utuh, trigger meja baru aktif, jalan dua kali tetap idempoten", async () => {
  const mf = new Miniflare({modules: true, script: "export default {fetch: () => new Response('ok')}", compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-meja-0118"}});
  try {
    const D = await mf.getD1Database("DB"), dir = path.join(AKAR, "migrations"), berkas = readdirSync(dir).filter(f => f.endsWith(".sql")).sort(), sql = f => pecah(readFileSync(path.join(dir, f), "utf8"));
    const jalan = async f => D.batch(sql(f).map(s => D.prepare(s)));
    for (const f of berkas.filter(f => f < "0118_")) await jalan(f);
    const tujuh = ["kaji_cepat", "logistik", "dsp", "renkon", "destana", "rehab", "gudang"];
    const pt = "11".repeat(8), gd = "22".repeat(8), kj = "33".repeat(8), lg = "44".repeat(8), rh = "55".repeat(8);
    await D.batch([
      D.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'Lama', '71', 'Kab Lama', ?, ?, 1)").bind(pt, JSON.stringify(tujuh), "a".repeat(64)),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, desa, data, status, dibuat, diubah, petugas_id) VALUES (?, 'kaji_cepat', '71', 'Kab Lama', 'Desa L', '{\"kejadian\":\"banjir\"}', 'masuk_jitupasna', 1, 1, ?)").bind(kj, pt),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, stok) VALUES (?, 'gudang', '71', 'Kab Lama', '{\"gudang\":\"G1\",\"barang\":\"beras\"}', 'tercatat', 1, 1, 50)").bind(gd),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'logistik', '71', 'Kab Lama', '{\"barang\":\"beras\"}', 'dikirim', 1, 1)").bind(lg),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, kaji_id) VALUES (?, 'rehab', '71', 'Kab Lama', '{}', 'jitupasna', 1, 1, ?)").bind(rh, kj),
      D.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh) VALUES (?, NULL, 'masuk_jitupasna', 1, 'x')").bind(kj),
      D.prepare("INSERT INTO meja_stok (gudang_id, jenis, delta, saldo, logistik_id, waktu) VALUES (?, 'keluar', -5, 45, ?, 1)").bind(gd, lg),
      D.prepare("INSERT INTO meja_ringkas (meja, prov, kab, status, dummy, n, bahaya, jumlah, terbaru) VALUES ('kaji_cepat', '71', 'Kab Lama', 'masuk_jitupasna', 0, 1, 0, '{}', 1)"),
    ]);
    const potret = async () => ({c: (await D.prepare("SELECT id, meja, prov, kab, desa, data, status, stok, kaji_id, petugas_id FROM meja_catatan ORDER BY id").all()).results, p: (await D.prepare("SELECT id, nama, meja FROM meja_petugas").all()).results, j: (await D.prepare("SELECT catatan_id, ke FROM meja_jejak").all()).results, s: (await D.prepare("SELECT gudang_id, delta FROM meja_stok").all()).results, r: (await D.prepare("SELECT meja, n FROM meja_ringkas").all()).results});
    const sebelum = await potret();
    await jalan("0118_meja_juklak.sql");
    assert.deepEqual(await potret(), sebelum, "semua baris lolos utuh");
    assert.equal((await D.prepare("PRAGMA foreign_key_check").all()).results.length, 0, "FK utuh");
    /* skema baru hidup */
    await D.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'Baru', '71', 'Kab Lama', ?, ?, 1)").bind("66".repeat(8), JSON.stringify([...tujuh, "pengungsi", "klaster"]), "b".repeat(64)).run();
    for (const [v, ket] of [['["pengaduan"]', "pusat"], ['["risiko"]', "pusat"], ['["kaji_cepat","kaji_cepat"]', "ganda"]]) assert.ok(await D.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'X', '71', 'K', ?, ?, 1)").bind(hex(), v, sha256(v)).run().then(() => false, () => true), `trigger menolak ${ket}`);
    const adu = "77".repeat(8);
    await D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'pengaduan', '00', 'BNPB Pusat', '{}', 'register', 1, 1)").bind(adu).run();
    assert.ok(await D.prepare("UPDATE meja_catatan SET status = 'selesai' WHERE id = ?").bind(adu).run().then(() => false, () => true), "trigger transisi aktif sesudah bangun ulang");
    assert.ok(await D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'pengaduan', '00', 'BNPB Pusat', '{}', 'tercatat', 1, 1)").bind(hex()).run().then(() => false, () => true), "CHECK status pengaduan");
    assert.ok(await D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'bogus', '00', 'B', '{}', 'tercatat', 1, 1)").bind(hex()).run().then(() => false, () => true), "CHECK daftar meja");
    await D.prepare("INSERT INTO meja_pelapor (catatan_id, nama, dibuat) VALUES (?, 'Nama Uji', 1)").bind(adu).run();
    /* jalan kedua: idempoten, baris baru ikut selamat */
    const kedua = await potret(); await jalan("0118_meja_juklak.sql");
    assert.deepEqual(await potret(), kedua, "jalan kedua tidak mengubah baris"); assert.equal((await D.prepare("SELECT nama FROM meja_pelapor WHERE catatan_id = ?").bind(adu).first()).nama, "Nama Uji");
    assert.equal((await D.prepare("SELECT count(*) n FROM sqlite_master WHERE name LIKE '%_cadang'").first()).n, 0, "tanpa sisa cadangan");
    assert.equal((await D.prepare("PRAGMA foreign_key_check").all()).results.length, 0);
    for (const nama of ["meja_catatan_ubah", "meja_rehab_tautan", "meja_petugas_sah", "meja_stok_sah", "meja_pengungsi_hari", "meja_pengaduan_register", "meja_risiko_kode", "meja_gudang_unik"]) assert.ok(await D.prepare("SELECT 1 x FROM sqlite_master WHERE name = ?").bind(nama).first(), nama + " ada");
  } finally { await mf.dispose(); }
});

/* ============================================================ meja dampak: Data kejadian dan dampak (Juklak 7/2023 Lampiran I, migrasi 0119, DATA-DAMPAK.md) */
const KD = MEJA.dampak.kolom;
const INTI_D = (o = {}) => ({jenis: "banjir", nama_kejadian: "Banjir Uji " + hex().slice(0, 6), tanggal: hari(2), jam: "04:15", bujur: 109.689012, lintang: -7.397123, penyebab: "Hujan lebat di hulu", kronologis: "Sungai meluap dini hari dan menggenangi dua desa.", deskripsi: "Genangan 40 sampai 100 cm.",
  sumber: "Laporan petugas BPBD", kondisi_mutakhir: "Genangan mulai surut", status_darurat: "belum_ditetapkan", upaya: "Evakuasi dan dapur umum", meninggal: 1, hilang: 0, luka: 3, mengungsi: 200, terdampak: 900,
  rumah_rb: 2, rumah_rs: 3, rumah_rr: 10, rumah_terendam: 150, nihil_kebutuhan: true, nihil_sosek: true, nihil_prasarana: true, nihil_layanan: true, nihil_aset: true, ...o});
const sebarD = (n, v) => Object.fromEntries(["anak", "dewasa", "lansia"].flatMap((u, i) => ["l", "p"].map((s, j) => [`${n}_${u}_${s}`, v[2 * i + j]])));
const wilD = {kec: "Kec Uji", desa: "Desa Uji"};
const bDampak = (h, kab, data, prov = "33", extra = wilD) => api("POST", "/api/meja/catatan", {meja: "dampak", prov, kab, data, ...extra}, h);
const kelD = (data, w = wilD) => kelengkapan(KD, {...data, ...w});
const logbookN = async (tabel, where = "1") => (await DB.prepare(`SELECT count(*) n FROM ${tabel} WHERE ${where}`).first()).n;

uji("dampak kelengkapan: kosong beda dari nol, nihil menjawab bagian dan menolak isian, rincian tidak melebihi total", async () => {
  assert.deepEqual(JENIS_DAMPAK, JENIS, "jenis meja dampak sama dengan jenis Logbook");
  assert.equal(AMBANG.data_dinamis_hari, nilai("data_dinamis_darurat")); assert.equal(AMBANG.data_dinamis_hari, 1);
  const kosong = kelengkapan(KD, {});
  assert.equal(kosong.persen, 0); assert.equal(kosong.inti_lengkap, false); assert.ok(kosong.kurang_inti.some(x => x.nama === "rumah_rb"), "kosong = belum didata");
  assert.ok(kosong.kurang_inti.some(x => x.nama === "bagian_sosek"), "bagian tanpa satu butir = kurang");
  const nol = kelengkapan(KD, {rumah_rb: 0, meninggal: 0});
  assert.ok(!nol.kurang_inti.some(x => x.nama === "rumah_rb" || x.nama === "meninggal"), "angka 0 terjawab"); assert.ok(nol.persen > 0);
  const sedang = kelD(INTI_D());
  assert.equal(sedang.inti_lengkap, true, JSON.stringify(sedang.kurang_inti)); assert.ok(sedang.persen > 40 && sedang.persen < 100, "rincian umur dan taksiran kosong menurunkan persen: " + sedang.persen);
  assert.ok(sedang.kurang_rinci.some(x => x.nama === "luka_anak_l") && sedang.kurang_rinci.some(x => x.nama === "rugi_rumah"), "rincian umur dan taksiran tampil sebagai kekurangan");
  assert.ok(!sedang.kurang_rinci.some(x => x.nama.startsWith("hilang_")), "hilang 0: rincian umurnya tidak berlaku");
  assert.equal(kelD(INTI_D(), {kec: "K"}).inti_lengkap, false, "desa kosong = inti kurang");
  const semuaButir = Object.fromEntries(KD.filter(c => ["kebutuhan", "sosek", "prasarana", "layanan", "aset"].includes(c.bagian) && !c.nihil && !c.bila).map(c => [c.nama, c.tipe === "teks" ? "isi uji" : 0]));
  const penuh = kelD(INTI_D({...sebarD("meninggal", [0, 0, 1, 0, 0, 0]), ...sebarD("luka", [1, 0, 1, 1, 0, 0]), ...sebarD("mengungsi", [50, 50, 40, 40, 10, 10]), ...sebarD("terdampak", [100, 100, 300, 300, 50, 50]), rugi_rumah: 900,
    nihil_sosek: false, nihil_prasarana: false, nihil_layanan: false, nihil_kebutuhan: false, nihil_aset: false, ...semuaButir}));
  assert.equal(penuh.persen, 100, JSON.stringify([penuh.kurang_inti, penuh.kurang_rinci.slice(0, 5)]));
  /* validasi: nihil menolak isian di bagiannya; rincian > total; nomor HP/NIK/surel; koordinat berpasangan */
  const v = (d, galat) => { const r = validasi("dampak", d, null); if (galat) assert.match(r.galat ?? "", galat, JSON.stringify(d).slice(0, 80)); else assert.ok(r.data, r.galat); return r; };
  v(INTI_D()); v(INTI_D({sawah_ha: 2}), /tidak ada.*Sawah|Sawah/);
  v(INTI_D({nihil_sosek: false, sawah_ha: 2})); v(INTI_D({luka: 2, ...sebarD("luka", [1, 1, 1, 0, 0, 0])}), /rincian luka\/sakit \(3\) tidak boleh melebihi total 2/); v(INTI_D({hilang: undefined, ...sebarD("hilang", [1, 0, 0, 0, 0, 0])}), /rincian hilang/);
  v(INTI_D({penyebab: "hubungi 0812-3456-7890"}), /data pribadi/); v(INTI_D({upaya: "kontak a@b.id"}), /data pribadi/); v(INTI_D({deskripsi: "NIK 3301010101010001"}), /data pribadi/); v(INTI_D({jam: "25:99"}), /jam:menit/);
  v(INTI_D({bujur: undefined}), /berpasangan/); v(INTI_D({lintang: 12}), /Latitude/); v(INTI_D({tgl_tuntas: hari(5)}), /sebelum tanggal kejadian/); v(INTI_D({jenis: "ufo"}), /Jenis/);
  assert.equal(validasi("dampak", INTI_D({bujur: 109.1234567891}), null).data.bujur, 109.123457, "koordinat disimpan 6 angka di belakang koma");
  assert.ok(validasi("dampak", {...INTI_D(), kolom_liar: 1}, null).galat); assert.ok(validasi("dampak", {...INTI_D(), kec: "x"}, null).galat, "kec/desa bukan kolom data");
  assert.ok(JSON.stringify(spekPublik().meja.find(m => m.id === "dampak").kolom.find(c => c.nama === "rumah_rb")).includes('"inti":true'), "spek membawa bagian dan inti");
});

uji("dampak alur: verifikasi ditolak bila inti belum lengkap (menyebut butir), lalu lolos; ubah sesudahnya kembali ke dilaporkan; petugas terkunci kabnya", async () => {
  const p = await petugas("Banjarnegara", ["dampak"], "33"), lain = await petugas("Cilacap", ["dampak"], "33"), tanpa = await petugas("Purwokerto", ["kaji_cepat"], "33");
  const mk = await baru(p.h, "dampak", "33", "Banjarnegara", {jenis: "banjir", nama_kejadian: "Banjir Awal", tanggal: hari(2), rumah_rb: 2}); assert.equal(mk.s, 201, mk.t);
  const id = mk.j.catatan.id; assert.equal(mk.j.catatan.status, "dilaporkan"); assert.equal(mk.j.catatan.kelengkapan.inti_lengkap, false); assert.ok(mk.j.catatan.kelengkapan.persen > 0);
  const tolak = await st(p.h, id, {ke: "diverifikasi"}); assert.equal(tolak.s, 400); assert.match(tolak.j.galat, /verifikasi ditolak: \d+ butir inti/); assert.match(tolak.j.galat, /Kecamatan/); assert.match(tolak.j.galat, /Meninggal \(jiwa total\)/); assert.match(tolak.j.galat, /Kerusakan sosial ekonomi/);
  assert.equal((await DB.prepare("SELECT status FROM meja_catatan WHERE id = ?").bind(id).first()).status, "dilaporkan");
  assert.equal((await st(p.h, id, {ke: "masuk_logbook"})).s, 409, "tidak melompat");
  /* melengkapi lewat ubah (kosong tetap kosong, 0 tersimpan) */
  const ub = await api("POST", "/api/meja/catatan/" + id, {aksi: "ubah", data: INTI_D({nama_kejadian: "Banjir Awal", meninggal: 0}), ...wilD}, p.h); assert.equal(ub.s, 200, ub.t);
  assert.equal(ub.j.catatan.data.meninggal, 0); assert.equal(ub.j.catatan.kelengkapan.inti_lengkap, true);
  const ok = await st(p.h, id, {ke: "diverifikasi"}); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.catatan.status, "diverifikasi");
  /* isi diubah sesudah diverifikasi: kembali ke dilaporkan (verifikasi ulang) di catatan yang sama */
  const u2 = await api("POST", "/api/meja/catatan/" + id, {aksi: "ubah", data: INTI_D({nama_kejadian: "Banjir Awal", meninggal: 2}), ...wilD}, p.h); assert.equal(u2.s, 200, u2.t); assert.equal(u2.j.catatan.status, "dilaporkan"); assert.equal(u2.j.catatan.data.meninggal, 2);
  const jj = (await api("GET", "/api/meja/catatan/" + id, undefined, ADMIN)).j.jejak.map(x => `${x.dari}>${x.ke}`); assert.deepEqual(jj, ["null>dilaporkan", "dilaporkan>dilaporkan", "dilaporkan>diverifikasi", "diverifikasi>dilaporkan"], "jejak: isi diubah, verifikasi, ubah kembali");
  /* satu kejadian per kabupaten: jenis + tanggal + nama (huruf kecil) yang sama ditolak 409 */
  assert.equal((await bDampak(p.h, "Banjarnegara", {jenis: "banjir", nama_kejadian: "BANJIR AWAL", tanggal: hari(3)}, "33", {})).s, 201, "tanggal beda = kejadian lain");
  const dobel = await bDampak(p.h, "Banjarnegara", {jenis: "banjir", nama_kejadian: "banjir awal", tanggal: hari(3)}, "33", {}); assert.equal(dobel.s, 409, dobel.t);
  /* petugas kab lain atau tanpa meja dampak */
  assert.equal((await api("GET", "/api/meja/catatan/" + id, undefined, lain.h)).s, 404); assert.equal((await st(lain.h, id, {ke: "diverifikasi"})).s, 404);
  assert.equal((await api("GET", "/api/meja/catatan?meja=dampak", undefined, lain.h)).j.catatan.length, 0);
  assert.equal((await bDampak(lain.h, "Banjarnegara", {jenis: "banjir", nama_kejadian: "Curang", tanggal: hari(1)}, "33", {})).s, 403, "hanya kabupatennya");
  assert.equal((await bDampak(tanpa.h, "Purwokerto", {jenis: "banjir", nama_kejadian: "Curang", tanggal: hari(1)}, "33", {})).s, 403, "meja tidak diizinkan");
  assert.equal((await bDampak(p.h, "Banjarnegara", {jenis: "banjir", nama_kejadian: "Telepon 081234567890", tanggal: hari(1)}, "33", {})).s, 400, "data pribadi di teks bebas");
});

uji("dampak terima ke Logbook: petugas ditolak; moderator membuat kejadian, memasangkan, 409 bila ganda, pengkinian tidak ganda; di luar jendela catatan tetap", async () => {
  const p = await petugas("Kebumen", ["dampak"], "33");
  const siap = async (kab, data, wil = wilD, h = p.h) => {   // catatan terverifikasi
    const a = await bDampak(h, kab, data, "33", wil); assert.equal(a.s, 201, a.t); const v = await st(h, a.j.catatan.id, {ke: "diverifikasi"}); assert.equal(v.s, 200, v.t); return a.j.catatan.id;
  };
  const kaya = {...sebarD("luka", [1, 0, 1, 1, 0, 0]), rugi_rumah: 900, sawah_ha: 2.5, rugi_sawah: 25, nihil_sosek: false, kios_rb: 0, kios_rs: 1, kios_rr: 0, kios_terendam: 3, rugi_kios: 60, dokumentasi: "https://contoh.id/foto-banjir", keb_logistik: "Beras 1 ton", nihil_kebutuhan: false,
    nihil_prasarana: false, jalan_km: 2, rugi_jalan: 100, sebaran: "https://contoh.id/peta"};
  const id = await siap("Kebumen", INTI_D({nama_kejadian: "Banjir Kebumen", ...kaya}));
  /* petugas tidak bisa menerima; dummy tidak pernah masuk Logbook */
  assert.equal((await st(p.h, id, {ke: "masuk_logbook"})).s, 403, "petugas tidak menerima ke Logbook");
  assert.equal(await logbookN("logbook_kejadian"), 0);
  const t1 = await st(ADMIN, id, {ke: "masuk_logbook"}); assert.equal(t1.s, 200, t1.t);
  assert.equal(t1.j.logbook.tindakan, "buat"); assert.match(t1.j.logbook.kib, /^3305101\d{8}1$/, "KIB: kode BPS Kebumen 3305 dari data wilayah, tanpa diketik petugas"); assert.equal(t1.j.logbook.kib.slice(7, 15), hari(2).replaceAll("-", ""));
  assert.equal(t1.j.catatan.status, "masuk_logbook"); assert.equal(t1.j.catatan.data.logbook_id, t1.j.logbook.kejadian_id); assert.equal(t1.j.catatan.data.logbook_kib, t1.j.logbook.kib);
  const kej = await DB.prepare("SELECT * FROM logbook_kejadian WHERE id = ?").bind(t1.j.logbook.kejadian_id).first();
  assert.equal(kej.jenis, "banjir"); assert.equal(kej.prov, "33"); assert.equal(kej.kab, "Kebumen"); assert.equal(kej.kec, "Kec Uji"); assert.equal(kej.lat, -7.397123); assert.equal(kej.lon, 109.689012)
  const e1 = await DB.prepare("SELECT e.*, j.korban, j.prasarana, j.kerugian_juta, j.dokumentasi FROM logbook_entri e JOIN logbook_entri_juklak j ON j.entri_id = e.id WHERE e.kejadian_id = ?").bind(kej.id).first();
  assert.equal(e1.md, 1); assert.equal(e1.luka, 3); assert.equal(e1.mengungsi_jiwa, 200); assert.equal(e1.rumah_rb, 2); assert.equal(e1.rumah_terendam, 150); assert.equal(e1.sumber_instansi, "BPBD Kebumen");
  assert.equal(JSON.parse(e1.korban).luka["0-17"].L, 1); assert.equal(JSON.parse(e1.korban).terdampak_jiwa, 900); assert.equal(e1.kerugian_juta, 1085, "total taksiran = rumah 900 + sawah 25 + kios 60 + jalan 100");
  const pras = JSON.parse(e1.prasarana); assert.ok(pras.some(x => x.kode === "sawah" && x.jumlah === 2.5 && x.kerugian_juta === 25) && pras.some(x => x.kode === "kios_toko" && x.tingkat === "rs" && x.kerugian_juta === 60) && pras.some(x => x.kode === "kios_toko" && x.tingkat === "terendam" && x.jumlah === 3) && pras.some(x => x.kode === "jalan" && x.jumlah === 2));
  assert.deepEqual(JSON.parse(e1.dokumentasi), ["https://contoh.id/foto-banjir"]); assert.match(e1.catatan, /Kebutuhan Logistik: Beras 1 ton/);
  assert.equal((await DB.prepare("SELECT penyebab, upaya FROM logbook_narasi WHERE kejadian_id = ?").bind(kej.id).first()).penyebab, "Hujan lebat di hulu");
  /* pengkinian: isi diubah, verifikasi ulang, terima lagi = entri baru di kejadian yang sama */
  const u = await api("POST", "/api/meja/catatan/" + id, {aksi: "ubah", data: INTI_D({nama_kejadian: "Banjir Kebumen", meninggal: 4, luka: 3, ...kaya}), ...wilD}, p.h); assert.equal(u.s, 200, u.t); assert.equal(u.j.catatan.status, "dilaporkan"); assert.equal(u.j.catatan.data.logbook_id, kej.id, "tautan Logbook bertahan saat diubah");
  assert.equal((await st(p.h, id, {ke: "diverifikasi"})).s, 200);
  const t2 = await st(ADMIN, id, {ke: "masuk_logbook"}); assert.equal(t2.s, 200, t2.t); assert.equal(t2.j.logbook.tindakan, "tambah"); assert.equal(t2.j.logbook.kejadian_id, kej.id); assert.equal(t2.j.logbook.kib, t1.j.logbook.kib); assert.equal(t2.j.logbook.kib_entri, t1.j.logbook.kib + "-002");
  assert.equal(await logbookN("logbook_kejadian"), 1, "tidak menggandakan kejadian"); assert.equal(await logbookN("logbook_entri", `kejadian_id = '${kej.id}'`), 2);
  assert.equal((await DB.prepare("SELECT md FROM logbook_entri WHERE kejadian_id = ? ORDER BY waktu DESC, rowid DESC LIMIT 1").bind(kej.id).first()).md, 4, "angka terbaru menimpa");
  /* memasangkan dengan kejadian Logbook yang sudah dibuat staf: jenis, prov, kab, tanggal mulai sama */
  const lb = (kab, mulai, jenis = "banjir") => api("POST", "/api/logbook/kejadian", {jenis, kab_kode: "33|" + kab, mulai, md: 0}, ADMIN);
  const l1 = await lb("Cilacap", hari(2) + "T01:00:00+07:00"); assert.equal(l1.s, 201, l1.t);
  const cil = await siap("Cilacap", INTI_D({nama_kejadian: "Banjir Cilacap"}), wilD, ADMIN);
  const t3 = await st(ADMIN, cil, {ke: "masuk_logbook"}); assert.equal(t3.s, 200, t3.t); assert.equal(t3.j.logbook.tindakan, "tambah"); assert.equal(t3.j.logbook.kejadian_id, l1.j.kejadian.id, "satu cocok: tambah entri");
  /* lebih dari satu cocok: 409 dengan kandidat; kirim logbook_id memilih; id kejadian lain jenis ditolak */
  const l2 = await lb("Wonosobo", hari(2) + "T02:00:00+07:00"), l3 = await lb("Wonosobo", hari(2) + "T15:00:00+07:00"); assert.equal(l2.s, 201); assert.equal(l3.s, 201);
  const won = await siap("Wonosobo", INTI_D({nama_kejadian: "Banjir Wonosobo"}), wilD, ADMIN);
  const t4 = await st(ADMIN, won, {ke: "masuk_logbook"}); assert.equal(t4.s, 409, t4.t); assert.equal(t4.j.kandidat.length, 2); assert.match(t4.j.galat, /logbook_id/);
  assert.equal((await DB.prepare("SELECT status FROM meja_catatan WHERE id = ?").bind(won).first()).status, "diverifikasi", "409: catatan tetap diverifikasi");
  const salahJenis = await lb("Wonosobo", hari(2) + "T03:00:00+07:00", "longsor");
  assert.equal((await st(ADMIN, won, {ke: "masuk_logbook", logbook_id: salahJenis.j.kejadian.id})).s, 400, "jenis beda ditolak");
  assert.equal((await st(ADMIN, won, {ke: "masuk_logbook", logbook_id: "zz"})).s, 400);
  const t5 = await st(ADMIN, won, {ke: "masuk_logbook", logbook_id: l3.j.kejadian.id}); assert.equal(t5.s, 200, t5.t); assert.equal(t5.j.logbook.kejadian_id, l3.j.kejadian.id);
  /* kejadian tujuan sudah ditutup: 409 jelas, catatan tetap */
  const l4 = await lb("Magelang", hari(2) + "T01:00:00+07:00"); assert.equal(l4.s, 201);
  assert.equal((await api("POST", `/api/logbook/kejadian/${l4.j.kejadian.id}/tutup`, {tgl_tuntas: hari(1), kondisi_akhir: "Selesai ditangani"}, ADMIN)).s, 200);
  const mag = await siap("Magelang", INTI_D({nama_kejadian: "Banjir Magelang"}), wilD, ADMIN);
  const t6 = await st(ADMIN, mag, {ke: "masuk_logbook"}); assert.equal(t6.s, 409, t6.t); assert.match(t6.j.galat, /sudah ditutup/);
  /* di luar jendela Logbook (mulai > 400 hari): pesan jelas, catatan tetap diverifikasi */
  const tua = await siap("Temanggung", INTI_D({nama_kejadian: "Banjir Lama", tanggal: hari(500)}), wilD, ADMIN);
  const t7 = await st(ADMIN, tua, {ke: "masuk_logbook"}); assert.equal(t7.s, 422, t7.t); assert.match(t7.j.galat, /di luar jendela Logbook/);
  assert.equal((await DB.prepare("SELECT status FROM meja_catatan WHERE id = ?").bind(tua).first()).status, "diverifikasi"); assert.equal(await logbookN("logbook_kejadian", "kab = 'Temanggung'"), 0);
  /* validasi Logbook yang sama: melewati batas wajar ditolak dan klaim dibatalkan; yakin: true meneruskan */
  const besar = await siap("Sleman", INTI_D({nama_kejadian: "Banjir Besar", rumah_rb: 600000}), wilD, ADMIN);
  const t8 = await st(ADMIN, besar, {ke: "masuk_logbook"}); assert.equal(t8.s, 400, t8.t); assert.equal(t8.j.wajar, "rumah_rb"); assert.equal((await DB.prepare("SELECT status FROM meja_catatan WHERE id = ?").bind(besar).first()).status, "diverifikasi");
  assert.equal((await st(ADMIN, besar, {ke: "masuk_logbook", yakin: true})).s, 200);
  /* batal terima: Logbook gagal sesudah klaim (laju tulis Logbook habis) mengembalikan ke diverifikasi dengan jejak */
  const lbm = await siap("Klaten", INTI_D({nama_kejadian: "Banjir Klaten"}), wilD, ADMIN);
  const kunciLaju = (await DB.prepare("SELECT kunci FROM laju_bnpb WHERE aksi = 'logbook_tulis' LIMIT 1").first()).kunci;
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'logbook_tulis', ?)").bind(kunciLaju, Date.now())));
  const t9 = await st(ADMIN, lbm, {ke: "masuk_logbook"}); assert.equal(t9.s, 429, t9.t);
  assert.equal((await DB.prepare("SELECT status FROM meja_catatan WHERE id = ?").bind(lbm).first()).status, "diverifikasi", "klaim dibatalkan");
  const jb = (await api("GET", "/api/meja/catatan/" + lbm, undefined, ADMIN)).j.jejak.map(x => `${x.dari}>${x.ke}`); assert.deepEqual(jb.slice(-2), ["diverifikasi>masuk_logbook", "masuk_logbook>diverifikasi"]);
  assert.equal(await logbookN("logbook_kejadian", "kab = 'Klaten'"), 0);
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'logbook_tulis'").run();
  /* catatan contoh (dummy) tidak pernah masuk Logbook */
  await adm("POST", "/api/meja/dummy", {aksi: "isi"});
  const dm = (await api("GET", "/api/meja/catatan?meja=dampak&status=diverifikasi&prov=62", undefined, ADMIN)).j.catatan.find(x => x.dummy);
  assert.ok(dm, "dummy dampak diverifikasi ada"); const td = await st(ADMIN, dm.id, {ke: "masuk_logbook"}); assert.equal(td.s, 409, td.t); assert.match(td.j.galat, /dummy/);
  await adm("POST", "/api/meja/dummy", {aksi: "hapus"});
});

uji("dampak staf Pusdalops/Koordalops: hanya meja dampak dan hanya terima ke Logbook, tidak mengisi atau mengubah isi", async () => {
  const pd = await buatStaf("a", ["pusdalops"]), ko = await buatStaf("b", ["koordalops"]), luar = await buatStaf("c", ["udara"]), p = await petugas("Boyolali", ["dampak", "kaji_cepat"], "33");
  const a = await bDampak(p.h, "Boyolali", INTI_D({nama_kejadian: "Banjir Boyolali"})); assert.equal(a.s, 201, a.t); const id = a.j.catatan.id;
  assert.equal((await st(p.h, id, {ke: "diverifikasi"})).s, 200);
  { const sy = await api("GET", "/api/meja/saya", undefined, pd); assert.equal(sy.j?.peran, "pusdalops", sy.t); }
  const dft = await api("GET", "/api/meja/catatan?meja=dampak&status=diverifikasi", undefined, pd); assert.equal(dft.s, 200, dft.t); assert.ok(dft.j.catatan.some(x => x.id === id));
  assert.ok(dft.j.catatan.find(x => x.id === id).aksi.some(x => x.ke === "masuk_logbook" && x.boleh), "tombol Terima ke Logbook tersedia");
  for (const m of ["kaji_cepat", "pengaduan", "dsp"]) assert.equal((await api("GET", "/api/meja/catatan?meja=" + m, undefined, pd)).s, 403, m);
  assert.equal((await api("GET", "/api/meja/catatan?meja=dampak", undefined, luar)).s, 403, "peran lain tidak masuk");
  assert.equal((await bDampak(pd, "Boyolali", INTI_D())).s, 403, "tidak mengisi");
  assert.equal((await api("POST", "/api/meja/catatan/" + id, {aksi: "ubah", data: INTI_D(), ...wilD}, pd)).s, 403, "tidak mengubah isi");
  assert.equal((await st(pd, id, {ke: "dilaporkan"})).s, 403, "tidak menarik kembali");
  assert.equal((await api("POST", "/api/meja/impor", {baris: [{prov: "33", kab: "Boyolali", data: INTI_D()}]}, pd)).s, 403, "tidak mengimpor");
  const t = await st(ko, id, {ke: "masuk_logbook"}); assert.equal(t.s, 200, t.t); assert.equal(t.j.logbook.tindakan, "buat"); assert.match(t.j.logbook.kib, /^3309101/);
  assert.match((await DB.prepare("SELECT dibuat_oleh FROM logbook_kejadian WHERE id = ?").bind(t.j.logbook.kejadian_id).first()).dibuat_oleh, /^staf:/, "tercatat atas nama staf");
  /* staf berwilayah provinsi lain tidak bisa */
  await DB.prepare("UPDATE staf SET wilayah = '[\"11\"]' WHERE username = 'juklaka'").run();
  const b = await bDampak(p.h, "Boyolali", INTI_D({nama_kejadian: "Banjir Boyolali Dua"})); assert.equal(b.s, 201); assert.equal((await st(p.h, b.j.catatan.id, {ke: "diverifikasi"})).s, 200);
  assert.equal((await st(pd, b.j.catatan.id, {ke: "masuk_logbook"})).s, 404, "di luar wilayah staf: 404, tidak membocorkan id");
  assert.equal((await api("GET", "/api/meja/catatan/" + b.j.catatan.id, undefined, pd)).s, 404, "GET rincian lintas wilayah 404");
  assert.equal((await api("GET", "/api/meja/catatan/" + b.j.catatan.id, undefined, ADMIN)).s, 200);
  assert.equal((await api("GET", "/api/meja/catatan?meja=dampak", undefined, pd)).j.catatan.length, 0, "daftar disaring ke wilayah staf");
  /* oleh dan jejak mentah hanya admin penuh; petugas dan staf melihat label tetap */
  const mentah = (await api("GET", "/api/meja/catatan/" + id, undefined, ADMIN)).j; assert.ok(mentah.catatan.oleh.startsWith("petugas:") && mentah.jejak.every(j => /^(petugas|admin|staf):/.test(j.oleh)), "admin penuh melihat pelaku asli");
  await DB.prepare("UPDATE staf SET wilayah = '[]' WHERE username = 'juklaka'").run();
  for (const h of [pd, ko, p.h]) { const r = (await api("GET", "/api/meja/catatan/" + id, undefined, h)).j; assert.equal(r.catatan.oleh, "Petugas"); assert.ok(r.jejak.every(j => ["Petugas", "Admin"].includes(j.oleh)), JSON.stringify(r.jejak)); assert.ok(!JSON.stringify(r).match(/(petugas|admin|staf):[0-9a-f]/), "tanpa pelaku mentah"); }
  assert.ok((await api("GET", "/api/meja/catatan?meja=dampak", undefined, pd)).j.catatan.every(x => ["Petugas", "Admin"].includes(x.oleh)), "daftar juga berlabel");
});

uji("dampak impor: 50 baris, tanpa ganda, baris rusak dilaporkan per baris, petugas hanya kabnya, batas jumlah", async () => {
  const p = await petugas("Purbalingga", ["dampak"], "33"), tanpa = await petugas("Banyumas", ["kaji_cepat"], "33");
  const baris = Array.from({length: 50}, (_, i) => ({data: {jenis: "banjir", nama_kejadian: "Banjir Impor " + i, tanggal: hari(3 + (i % 40)), meninggal: i % 3, rumah_rb: i % 7}, kec: "Kec Impor", desa: "Desa " + (i % 9)}));
  const r1 = await api("POST", "/api/meja/impor", {baris}, p.h); assert.equal(r1.s, 200, r1.t.slice(0, 300));
  assert.deepEqual(r1.j.ringkas, {baris: 50, masuk: 50, ganda: 0, galat: 0}); assert.equal(await U.n("meja_catatan", "meja = 'dampak' AND kab = 'Purbalingga'"), 50); assert.equal(await U.n("meja_jejak", "catatan IS 'impor'"), 50);
  const r2 = await api("POST", "/api/meja/impor", {baris}, p.h); assert.equal(r2.s, 200); assert.deepEqual(r2.j.ringkas, {baris: 50, masuk: 0, ganda: 50, galat: 0}, "impor ulang tidak menggandakan"); assert.equal(await U.n("meja_catatan", "meja = 'dampak' AND kab = 'Purbalingga'"), 50);
  assert.equal(r2.j.hasil[0].status, "ganda"); assert.equal(r2.j.hasil[0].baris, 1);
  /* campuran: baru, ganda, rusak (jenis liar, kolom liar, kab lain, nihil bentrok, rincian lebih dari total) */
  const camp = [{data: {jenis: "longsor", nama_kejadian: "Baru Impor", tanggal: hari(5)}}, baris[0], {data: {jenis: "ufo", nama_kejadian: "X", tanggal: hari(5)}}, {data: {jenis: "banjir", nama_kejadian: "Y", tanggal: hari(5), admin: 1}},
    {kab: "Banyumas", data: {jenis: "banjir", nama_kejadian: "Kab lain", tanggal: hari(5)}}, {data: {jenis: "banjir", nama_kejadian: "Bentrok", tanggal: hari(5), nihil_sosek: true, sawah_ha: 1}}, {data: {jenis: "banjir", nama_kejadian: "Rincian", tanggal: hari(5), luka: 1, luka_anak_l: 2}}, "bukan objek"];
  const r3 = await api("POST", "/api/meja/impor", {baris: camp}, p.h); assert.equal(r3.s, 200, r3.t); assert.deepEqual(r3.j.ringkas, {baris: 8, masuk: 1, ganda: 1, galat: 6});
  assert.deepEqual(r3.j.hasil.map(h => h.status), ["masuk", "ganda", "galat", "galat", "galat", "galat", "galat", "galat"]); assert.match(r3.j.hasil[4].galat, /kabupatenmu/); assert.match(r3.j.hasil[2].galat, /Jenis/);
  /* batas: 201 baris, kosong, kolom liar, meja tidak diizinkan, kabupaten terlalu banyak untuk admin */
  assert.equal((await api("POST", "/api/meja/impor", {baris: [...baris, baris[0]]}, p.h)).s, 400); assert.equal((await api("POST", "/api/meja/impor", {baris: []}, p.h)).s, 400); assert.equal((await api("POST", "/api/meja/impor", {baris, x: 1}, p.h)).s, 400);
  assert.equal((await api("POST", "/api/meja/impor", {baris: [baris[0]]}, tanpa.h)).s, 403);
  assert.equal((await api("POST", "/api/meja/impor", {baris: [baris[0]]})).s, 403, "tanpa kode atau token");
  const banyakKab = Array.from({length: 9}, (_, i) => ({prov: "33", kab: "Kab Impor " + i, data: {jenis: "banjir", nama_kejadian: "Satu", tanggal: hari(4)}}));
  assert.equal((await api("POST", "/api/meja/impor", {baris: banyakKab}, ADMIN)).s, 400, "maks 8 kabupaten per impor");
  const adminOk = await api("POST", "/api/meja/impor", {baris: banyakKab.slice(0, 3)}, ADMIN); assert.equal(adminOk.s, 200); assert.equal(adminOk.j.ringkas.masuk, 3);
  const noWil = await api("POST", "/api/meja/impor", {baris: [{data: {jenis: "banjir", nama_kejadian: "Tanpa wilayah", tanggal: hari(4)}}]}, ADMIN); assert.equal(noWil.j.ringkas.galat, 1, "admin wajib menyebut prov dan kab per baris");
  /* ringkasan meja ikut terbaru tanpa menunggu cron */
  const ring = (await api("GET", "/api/meja/rekap", undefined, ADMIN)).j.per_kab.dampak["33|Purbalingga"]; assert.equal(ring.n, 51);
});

uji("dampak kelengkapan per kabupaten: rata-rata dari baris nyata, butir paling sering kosong, belum_dimutakhirkan; hanya admin dan staf Pusdalops", async () => {
  const p = await petugas("Kendal", ["dampak"], "33");
  const mk = async (nama, o = {}, umurHari = 0) => { const a = await bDampak(p.h, "Kendal", INTI_D({nama_kejadian: nama, ...o})); assert.equal(a.s, 201, a.t); if (umurHari) await DB.prepare("UPDATE meja_catatan SET dibuat = ?, diubah = ? WHERE id = ?").bind(KINI - umurHari * HARI, KINI - umurHari * HARI, a.j.catatan.id).run(); return a.j.catatan.id; };
  const a = await mk("Darurat Basi", {status_darurat: "tanggap", tanggal: hari(4)}, 3), b = await mk("Darurat Segar", {status_darurat: "siaga", tanggal: hari(5)}), c = await mk("Darurat Ditutup", {status_darurat: "tanggap", tgl_tuntas: hari(1), tanggal: hari(6)}, 3), d = await mk("Tanpa Darurat", {tanggal: hari(7)}, 3);
  const daftar = (await api("GET", "/api/meja/catatan?meja=dampak&kab=Kendal", undefined, ADMIN)).j.catatan, tanda = n => daftar.find(x => x.data.nama_kejadian === n).tanda;
  assert.deepEqual(tanda("Darurat Basi"), ["belum_dimutakhirkan"], "darurat, belum ditutup, lebih dari sehari tanpa pembaruan"); assert.deepEqual(tanda("Darurat Segar"), []); assert.deepEqual(tanda("Darurat Ditutup"), []); assert.deepEqual(tanda("Tanpa Darurat"), []);
  await DB.prepare("UPDATE meja_ringkas_meta SET nilai = 1").run();   // paksa bangun ulang penuh sekali (jalur cron)
  const adm1 = await api("GET", "/api/meja/kelengkapan", undefined, ADMIN); assert.equal(adm1.s, 200, adm1.t);
  const kend = adm1.j.kab.find(x => x.kab === "Kendal"); assert.equal(kend.kejadian, 4); assert.equal(kend.inti_lengkap, 4); assert.equal(kend.belum_dimutakhirkan, 1);
  const manual = daftar.map(x => x.kelengkapan.persen), rata = Math.round(manual.reduce((s, v) => s + v, 0) / manual.length); assert.equal(kend.persen, rata, "persen rata-rata sama dengan hitung manual dari baris");
  assert.ok(kend.kosong.length > 0 && kend.kosong[0].jumlah === 4 && kend.kosong[0].label, "butir paling sering kosong berlabel"); assert.ok(kend.kosong.some(x => x.nama === "luka_anak_l"));
  assert.ok(adm1.j.kab.findIndex(x => x.kab === "Kendal") >= 0 && adm1.j.ringkas.kejadian >= 4);
  /* sama persis dengan hitung dari seluruh tabel dampak per kabupaten (invarian, bukan potret) */
  const semua = (await DB.prepare("SELECT prov, kab, kec, desa, data FROM meja_catatan WHERE meja = 'dampak' AND dummy = 0").all()).results, per = new Map();
  for (const r of semua) { const k = r.prov + "|" + r.kab, h = kelengkapan(KD, {...JSON.parse(r.data), kec: r.kec, desa: r.desa}), z = per.get(k) ?? {n: 0, persen: 0}; z.n++; z.persen += h.persen; per.set(k, z); }
  for (const x of adm1.j.kab) { const z = per.get(x.prov + "|" + x.kab); assert.equal(x.kejadian, z.n, x.kab); assert.equal(x.persen, Math.round(z.persen / z.n), x.kab); }
  assert.equal(adm1.j.kab.length, per.size);
  /* pembaruan satu catatan memperbarui agregat kabupatennya saja (tanpa menunggu cron) */
  const ub = await api("POST", "/api/meja/catatan/" + d, {aksi: "ubah", data: INTI_D({nama_kejadian: "Tanpa Darurat", tanggal: hari(7), nihil_sosek: false, sawah_ha: 1}), ...wilD}, p.h); assert.equal(ub.s, 200, ub.t);
  const adm2 = (await api("GET", "/api/meja/kelengkapan", undefined, ADMIN)).j.kab.find(x => x.kab === "Kendal"); assert.equal(adm2.kejadian, 4);
  /* akses */
  const pd = await buatStaf("1", ["pusdalops"]); assert.equal((await api("GET", "/api/meja/kelengkapan", undefined, pd)).s, 200, "staf Pusdalops boleh membaca");
  const ulp = await buatStaf("2", ["ulp"]); assert.equal((await api("GET", "/api/meja/kelengkapan", undefined, ulp)).s, 403); assert.equal((await api("GET", "/api/meja/kelengkapan", undefined, p.h)).s, 403, "petugas tidak"); assert.equal((await api("GET", "/api/meja/kelengkapan")).s, 403);
  assert.ok(!JSON.stringify(adm1.j).includes("Hujan lebat"), "tanpa isi laporan, hanya angka dan nama butir");
  const rapor = (await api("GET", "/api/meja/rapor", undefined, ADMIN)).j; assert.ok(!JSON.stringify(rapor.kab.map(k => Object.keys(k.kelengkapan.meja))).includes("dampak"), "rapor BPBD tidak berubah: dampak rapor:false");
  assert.ok(!("dampak" in (await api("GET", "/api/meja/ringkas")).j.meja), "dampak tidak tampil di ringkas publik");
});

uji("migrasi 0119 di atas data lama: semua baris lolos, FK utuh, meja dampak dan trigger aktif, batas data per meja, jalan dua kali tetap idempoten", async () => {
  const mf = new Miniflare({modules: true, script: "export default {fetch: () => new Response('ok')}", compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-meja-0119"}});
  try {
    const D = await mf.getD1Database("DB"), dir = path.join(AKAR, "migrations"), berkas = readdirSync(dir).filter(f => f.endsWith(".sql")).sort(), sql = f => pecah(readFileSync(path.join(dir, f), "utf8"));
    const jalan = async f => D.batch(sql(f).map(s => D.prepare(s)));
    for (const f of berkas.filter(f => f < "0119_")) await jalan(f);
    const pt = "11".repeat(8), gd = "22".repeat(8), kj = "33".repeat(8), lg = "44".repeat(8), adu = "55".repeat(8), pg = "66".repeat(8);
    await D.batch([
      D.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'Lama', '71', 'Kab Lama', ?, ?, 1)").bind(pt, JSON.stringify(["kaji_cepat", "logistik", "pengungsi", "klaster"]), "a".repeat(64)),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, desa, data, status, dibuat, diubah, petugas_id) VALUES (?, 'kaji_cepat', '71', 'Kab Lama', 'Desa L', '{\"kejadian\":\"banjir\"}', 'masuk_jitupasna', 1, 1, ?)").bind(kj, pt),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah, stok) VALUES (?, 'gudang', '71', 'Kab Lama', '{\"gudang\":\"G1\",\"barang\":\"beras\"}', 'tercatat', 1, 1, 50)").bind(gd),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'logistik', '71', 'Kab Lama', '{\"barang\":\"beras\"}', 'dikirim', 1, 1)").bind(lg),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'pengaduan', '00', 'BNPB Pusat', '{}', 'register', 1, 1)").bind(adu),
      D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'pengungsi', '71', 'Kab Lama', '{\"nama_tempat\":\"Balai\",\"tgl_data\":\"2026-11-01\"}', 'tercatat', 1, 1)").bind(pg),
      D.prepare("INSERT INTO meja_pelapor (catatan_id, nama, dibuat) VALUES (?, 'Nama Uji', 1)").bind(adu),
      D.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh) VALUES (?, NULL, 'masuk_jitupasna', 1, 'x')").bind(kj),
      D.prepare("INSERT INTO meja_stok (gudang_id, jenis, delta, saldo, logistik_id, waktu) VALUES (?, 'keluar', -5, 45, ?, 1)").bind(gd, lg),
      D.prepare("INSERT INTO meja_ringkas (meja, prov, kab, status, dummy, n, bahaya, jumlah, terbaru) VALUES ('kaji_cepat', '71', 'Kab Lama', 'masuk_jitupasna', 0, 1, 0, '{}', 1)"),
    ]);
    const potret = async () => ({c: (await D.prepare("SELECT id, meja, prov, kab, desa, data, status, stok, kaji_id, petugas_id FROM meja_catatan ORDER BY id").all()).results, p: (await D.prepare("SELECT id, nama, meja FROM meja_petugas").all()).results, j: (await D.prepare("SELECT catatan_id, ke FROM meja_jejak").all()).results,
      s: (await D.prepare("SELECT gudang_id, delta FROM meja_stok").all()).results, r: (await D.prepare("SELECT meja, n FROM meja_ringkas").all()).results, l: (await D.prepare("SELECT catatan_id, nama FROM meja_pelapor").all()).results});
    const sebelum = await potret();
    await jalan("0119_meja_dampak.sql");
    assert.deepEqual(await potret(), sebelum, "semua baris lolos utuh"); assert.equal((await D.prepare("PRAGMA foreign_key_check").all()).results.length, 0, "FK utuh");
    const coba = async (q, ...a) => D.prepare(q).bind(...a).run().then(() => true, () => false);
    const dm = (id, status, data = "{}", meja = "dampak") => coba("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, ?, '33', 'Kab Baru', ?, ?, 1, 1)", id, meja, data, status);
    const besar = JSON.stringify({x: "a".repeat(15000)});
    const i1 = hex();
    assert.equal(await dm(i1, "dilaporkan"), true); assert.equal(await dm(hex(), "tercatat"), false, "status dampak dijaga CHECK"); assert.equal(await dm(hex(), "dilaporkan", besar), true, "dampak boleh sampai 20000 huruf");
    assert.equal(await dm(hex(), "dilaporkan", JSON.stringify({x: "a".repeat(20001)})), false); assert.equal(await dm(hex(), "dilaporkan", besar, "kaji_cepat"), false, "meja lain tetap 6000");
    for (const [dari, ke, ok] of [["dilaporkan", "diverifikasi", true], ["diverifikasi", "masuk_logbook", true], ["masuk_logbook", "dilaporkan", true], ["dilaporkan", "diverifikasi", true], ["diverifikasi", "dilaporkan", true], ["dilaporkan", "masuk_logbook", false]]) {
      const id = hex(); await dm(id, dari); assert.equal(await coba("UPDATE meja_catatan SET status = ? WHERE id = ?", ke, id), ok, `${dari}>${ke}`);
    }
    const idu = hex(); await D.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'dampak', '33', 'Kab Uniq', ?, 'dilaporkan', 1, 1)").bind(idu, JSON.stringify({jenis: "banjir", tanggal: "2026-11-01", nama_kejadian: "Satu"})).run();
    assert.equal(await coba("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'dampak', '33', 'Kab Uniq', ?, 'dilaporkan', 1, 1)", hex(), JSON.stringify({jenis: "banjir", tanggal: "2026-11-01", nama_kejadian: "SATU"})), false, "indeks unik per kejadian");
    assert.equal(await coba("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'Baru', '71', 'Kab Baru', ?, ?, 1)", hex(), JSON.stringify(DAFTAR_PETUGAS), "c".repeat(64)), true, "sepuluh meja sah");
    assert.equal(await coba("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'Baru', '71', 'Kab Baru', ?, ?, 1)", hex(), '["pengaduan"]', "d".repeat(64)), false, "meja pusat tetap ditolak");
    assert.equal(await coba("INSERT INTO meja_kelengkapan (prov, kab, dummy, n, persen_jumlah, inti_lengkap, belum, kosong, terbaru) VALUES ('33', 'Kab K', 0, 2, 150, 1, 0, '{}', 1)"), true); assert.equal(await coba("INSERT INTO meja_kelengkapan (prov, kab, dummy, n, persen_jumlah, inti_lengkap, belum, kosong, terbaru) VALUES ('33', 'Kab K2', 0, 2, 201, 1, 0, '{}', 1)"), false, "persen <= 100 per kejadian");
    const kedua = await potret(); await jalan("0119_meja_dampak.sql");
    assert.deepEqual(await potret(), kedua, "jalan kedua tidak mengubah baris"); assert.equal((await D.prepare("SELECT count(*) n FROM sqlite_master WHERE name LIKE '%_cadang'").first()).n, 0, "tanpa sisa cadangan"); assert.equal((await D.prepare("PRAGMA foreign_key_check").all()).results.length, 0);
    for (const nama of ["meja_catatan_ubah", "meja_rehab_tautan", "meja_petugas_sah", "meja_stok_sah", "meja_pengungsi_hari", "meja_pengaduan_register", "meja_risiko_kode", "meja_gudang_unik", "meja_dampak_kejadian", "meja_kelengkapan"]) assert.ok(await D.prepare("SELECT 1 x FROM sqlite_master WHERE name = ?").bind(nama).first(), nama + " ada");
  } finally { await mf.dispose(); }
});

uji("dampak data pribadi: HP/NIK dengan pemisah dan digit Unicode, frasa identitas, catatan transisi; koordinat, tanggal, dan frasa wajar lolos", async () => {
  const kolom = ["penyebab", "kronologis", "deskripsi", "upaya", "kondisi_mutakhir", "sumber", "nama_kejadian", "aset_barang", "keb_dana"];
  const tolak = ["hubungi 0812-3456-7890", "telp 0812 3456 7890", "wa +62 812 3456 7890", "(0812)3456_7890", "08.12/3456/7890", "+62-(812)-345-6789", "٠٨١٢٣٤٥٦٧٨٩٠", "０８１２３４５６７８９０", "0­812⁠3456͏7890",
    "NIK 3301 0101 0101 0001", "NIK 3301/0101.0101-0001", "3301_0101_0101_0001", "3301010101010001", "NIK ٣٣٠١٠١٠١٠١٠١٠٠٠١", "kontak a@b.id", "atas nama Budi", "A.N. Budi Santoso", "a.n. Budi", "an. Sari", "alm. Joko", "almarhum Pak Joko", "Almarhumah Siti", "rumah RT 03 / RW 04", "RT.3 RW.4", "rt 3 - rw 4"];
  const lolos = ["-6,597998; 106,797429", "-6.597998, 106.797429", "tanggal 2026-08-12 dan 12/08/2026", "Ibu Kota Nusantara", "ibu hamil 3 orang", "Bapak Bupati hadir", "Jl. Trans Sulawesi km 5", "plan. lanjutan", "korban an. kecil", "Desa RT dan RW setempat", "100 orang pada pukul 08.30", "Rp 200.000.000"];
  for (const t of tolak) for (const k of ["penyebab", "upaya"]) { const r = validasi("dampak", INTI_D({[k]: t}), null); assert.match(r.galat ?? "", new RegExp("data pribadi"), `harus ditolak: ${t}`); assert.ok(r.galat.includes(KD.find(c => c.nama === k).label), "pesan menyebut kolomnya: " + r.galat); }
  for (const t of lolos) for (const k of kolom) { const r = validasi("dampak", INTI_D({[k]: t.slice(0, KD.find(c => c.nama === k).maks), nihil_aset: false, nihil_kebutuhan: false}), null); assert.ok(r.data, `harus lolos di ${k}: ${t}: ${r.galat}`); }
  /* sama dengan aturan narasi Logbook */
  const lb = await api("POST", "/api/logbook/kejadian", {jenis: "banjir", kab_kode: "33|Cilacap", mulai: hari(1), penyebab: "telp 08.12/3456/7890"}, ADMIN); assert.equal(lb.s, 400, "Logbook menolak pemisah yang sama");
  /* catatan transisi untuk dampak disaring; meja lain tidak berubah */
  const p = await petugas("Rembang", ["dampak"], "33"), a = await bDampak(p.h, "Rembang", INTI_D({nama_kejadian: "Banjir Rembang"})); assert.equal(a.s, 201, a.t);
  const bad = await api("POST", "/api/meja/catatan/" + a.j.catatan.id, {aksi: "status", ke: "diverifikasi", catatan: "hubungi 0812-3456-7890"}, p.h); assert.equal(bad.s, 400); assert.match(bad.j.galat, /catatan: .*data pribadi/);
  const ok = await api("POST", "/api/meja/catatan/" + a.j.catatan.id, {aksi: "status", ke: "diverifikasi", catatan: "sudah dicek lapangan"}, p.h); assert.equal(ok.s, 200, ok.t);
});

uji("dampak batas impor 50 baris dan laju 5 per jam per pelaku (petugas dan admin); isian terlalu panjang jadi galat baris", async () => {
  const p = await petugas("Pekalongan", ["dampak"], "33"), baris = n => Array.from({length: n}, (_, i) => ({data: {jenis: "banjir", nama_kejadian: `Laju ${hex()} ${i}`, tanggal: hari(4)}}));
  assert.equal((await api("POST", "/api/meja/impor", {baris: baris(51)}, p.h)).s, 400, "51 baris ditolak");
  assert.equal((await api("POST", "/api/meja/impor", "x".repeat(256 * 1024 + 1), p.h)).s, 413, "badan 256 KB");
  assert.equal((await api("POST", "/api/meja/impor", {baris: baris(50)}, p.h)).j.ringkas.masuk, 50, "50 baris sah");
  for (let i = 0; i < 4; i++) assert.equal((await api("POST", "/api/meja/impor", {baris: baris(1)}, p.h)).s, 200);
  const enam = await api("POST", "/api/meja/impor", {baris: baris(1)}, p.h); assert.equal(enam.s, 429, enam.t); assert.equal(await U.n("meja_catatan", "kab = 'Pekalongan'"), 54, "yang ditolak laju tidak masuk");
  /* admin: laju per pelaku yang sama (5 per jam) */
  const adminImp = () => api("POST", "/api/meja/impor", {baris: [{prov: "33", kab: "Kab Laju Admin", data: {jenis: "banjir", nama_kejadian: "L " + hex(), tanggal: hari(4)}}]}, ADMIN);
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'meja.impor' AND kunci LIKE 'admin:%'").run();
  for (let i = 0; i < 5; i++) assert.equal((await adminImp()).s, 200, "admin ke-" + (i + 1));
  const a6 = await adminImp(); assert.equal(a6.s, 429, a6.t);
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'meja.impor'").run();
  /* panjang JSON baris diperiksa sebelum batch: galat baris, bukan ganda (batas data dampak 20000 di D1 tidak terjangkau validasi kolom, jadi dijaga langsung di CHECK) */
  const id = hex(); assert.equal(await DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, data, status, dibuat, diubah) VALUES (?, 'dampak', '33', 'Kab Panjang', ?, 'dilaporkan', 1, 1)").bind(id, JSON.stringify({x: "a".repeat(20001)})).run().then(() => true, () => false), false);
});

uji("dampak terima: laju 60 per jam, tautan tersimpan dicek ulang, gagal simpan tautan tetap sukses tanpa menggandakan", async () => {
  const p = await petugas("Pati", ["dampak"], "33");
  const siap = async (kab, data) => { const a = await bDampak(ADMIN, kab, data, "33", wilD); assert.equal(a.s, 201, a.t); assert.equal((await st(ADMIN, a.j.catatan.id, {ke: "diverifikasi"})).s, 200); return a.j.catatan.id; };
  /* tautan tersimpan yang tidak cocok lagi (jenis berubah): dicari ulang, buat kejadian baru */
  const nm = "Banjir Pati " + hex().slice(0, 4), id = await siap("Pati", INTI_D({nama_kejadian: nm}));
  const t1 = await st(ADMIN, id, {ke: "masuk_logbook"}); assert.equal(t1.s, 200, t1.t); assert.equal(t1.j.logbook.tindakan, "buat");
  const u = await api("POST", "/api/meja/catatan/" + id, {aksi: "ubah", data: INTI_D({nama_kejadian: nm, jenis: "longsor"}), ...wilD}, ADMIN); assert.equal(u.s, 200, u.t); assert.equal(u.j.catatan.data.logbook_id, t1.j.logbook.kejadian_id);
  assert.equal((await st(ADMIN, id, {ke: "diverifikasi"})).s, 200);
  const t2 = await st(ADMIN, id, {ke: "masuk_logbook"}); assert.equal(t2.s, 200, t2.t); assert.equal(t2.j.logbook.tindakan, "buat", "jenis beda: bukan pengkinian kejadian lama"); assert.notEqual(t2.j.logbook.kejadian_id, t1.j.logbook.kejadian_id); assert.match(t2.j.logbook.kib, /^3318102/);
  assert.equal(t2.j.catatan.data.logbook_id, t2.j.logbook.kejadian_id, "tautan baru menggantikan");
  /* gagal menyimpan tautan: sukses dengan peringatan; penerimaan berikutnya memasangkan lewat pencarian, kejadian tidak ganda */
  const id2 = await siap("Pati", INTI_D({nama_kejadian: "Banjir Pati Dua " + hex().slice(0, 4), tanggal: hari(3)}));
  await DB.prepare("CREATE TRIGGER tmp_gagal_taut BEFORE UPDATE ON meja_catatan WHEN OLD.status = 'masuk_logbook' AND json_extract(NEW.data, '$.logbook_id') IS NOT NULL AND OLD.id = '" + id2 + "' BEGIN SELECT RAISE(ABORT, 'uji'); END").run();
  const n0 = await logbookN("logbook_kejadian", "kab = 'Pati' AND jenis = 'banjir'");
  const t3 = await st(ADMIN, id2, {ke: "masuk_logbook"}); await DB.prepare("DROP TRIGGER tmp_gagal_taut").run();
  assert.equal(t3.s, 200, t3.t); assert.match(t3.j.logbook.peringatan, /tautan/); assert.equal(t3.j.catatan.status, "masuk_logbook"); assert.equal(t3.j.catatan.data.logbook_id, undefined);
  assert.equal(await logbookN("logbook_kejadian", "kab = 'Pati' AND jenis = 'banjir'"), n0 + 1);
  const u3 = await api("POST", "/api/meja/catatan/" + id2, {aksi: "ubah", data: INTI_D({nama_kejadian: t3.j.catatan.data.nama_kejadian, tanggal: t3.j.catatan.data.tanggal, meninggal: 5}), ...wilD}, ADMIN); assert.equal(u3.s, 200, u3.t);
  assert.equal((await st(ADMIN, id2, {ke: "diverifikasi"})).s, 200);
  const t4 = await st(ADMIN, id2, {ke: "masuk_logbook"}); assert.equal(t4.s, 200, t4.t); assert.equal(t4.j.logbook.tindakan, "tambah"); assert.equal(t4.j.logbook.kejadian_id, t3.j.logbook.kejadian_id);
  assert.equal(await logbookN("logbook_kejadian", "kab = 'Pati' AND jenis = 'banjir'"), n0 + 1, "tidak menggandakan kejadian");
  /* laju 60 per jam per pelaku, sebelum klaim */
  const kunci = (await DB.prepare("SELECT kunci FROM laju_bnpb WHERE aksi = 'meja.terima' LIMIT 1").first()).kunci;
  const id3 = await siap("Pati", INTI_D({nama_kejadian: "Banjir Pati Tiga " + hex().slice(0, 4), tanggal: hari(4)}));
  await DB.batch(Array.from({length: 60}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'meja.terima', ?)").bind(kunci, Date.now())));
  const t5 = await st(ADMIN, id3, {ke: "masuk_logbook"}); assert.equal(t5.s, 429, t5.t); assert.equal((await DB.prepare("SELECT status FROM meja_catatan WHERE id = ?").bind(id3).first()).status, "diverifikasi", "ditolak laju sebelum klaim");
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'meja.terima'").run();
  assert.equal((await st(ADMIN, id3, {ke: "masuk_logbook"})).s, 200);
});

uji("migrasi 0119 dengan baris km_aktivasi_meja dan km_magang_lamar yang menunjuk meja_petugas: baris selamat, FK ke meja_petugas utuh, dua kali jalan", async () => {
  const mf = new Miniflare({modules: true, script: "export default {fetch: () => new Response('ok')}", compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-meja-0119-km"}});
  try {
    const D = await mf.getD1Database("DB"), dir = path.join(AKAR, "migrations"), berkas = readdirSync(dir).filter(f => f.endsWith(".sql")).sort(), sql = f => pecah(readFileSync(path.join(dir, f), "utf8"));
    const jalan = async f => D.batch(sql(f).map(s => D.prepare(s)));
    for (const f of berkas.filter(f => f < "0119_")) await jalan(f);
    const pt = "ab".repeat(8), pmt = "99".repeat(8), akt = "cd".repeat(8), mg = "ef".repeat(8), rl = "12".repeat(8), lamar = "34".repeat(8);
    /* induk sungguhan (permintaan relawan, aktivasi, magang, relawan) supaya FK ke meja_petugas diuji dengan baris anak yang sah */
    await D.batch([
      D.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat) VALUES (?, 'KM', '71', 'Kab KM', ?, ?, 1)").bind(pt, JSON.stringify(["kaji_cepat"]), "e".repeat(64)),
      D.prepare("INSERT INTO relawan_permintaan (id, judul, bencana, prov, kab, butuh, mulai, selesai, dibuat) VALUES (?, 'Permintaan KM', 'banjir', '71', 'Kab KM', '[\"p3k\"]', '2026-11-01', '2026-11-05', 1)").bind(pmt),
      D.prepare("INSERT INTO km_aktivasi (id, judul, bahaya, kab4, prov, tanggal, radius_km, kebutuhan, sumber, dibuka, oleh, permintaan_id) VALUES (?, 'Aktivasi KM uji', 'banjir', '7101', '71', '2026-11-01', 100, '[]', 'manual', 1, 'uji', ?)").bind(akt, pmt),
      D.prepare("INSERT INTO km_aktivasi_meja (aktivasi_id, meja_petugas_id) VALUES (?, ?)").bind(akt, pt),
      D.prepare("INSERT INTO relawan (id, nama, prov, kab, jalur, hari_per_minggu, maks_hari, luar_provinsi, setuju_pdp, dibuat, diubah) VALUES (?, 'Relawan KM', '71', 'Kab KM', 'umum', 1, 7, 0, 1, 1, 1)").bind(rl),
      D.prepare("INSERT INTO km_magang (id, penyelenggara, unit, kuota, mulai, selesai, dibuat, diubah) VALUES (?, 'bnpb', 'Unit uji', 1, '2026-11-01', '2026-12-01', 1, 1)").bind(mg),
      D.prepare("INSERT INTO km_magang_lamar (id, magang_id, relawan_id, meja_petugas_id, dibuat, diubah) VALUES (?, ?, ?, ?, 1, 1)").bind(lamar, mg, rl, pt)]);
    const anak = async () => ({a: (await D.prepare("SELECT aktivasi_id, meja_petugas_id FROM km_aktivasi_meja").all()).results, l: (await D.prepare("SELECT id, meja_petugas_id FROM km_magang_lamar").all()).results, p: (await D.prepare("SELECT id, nama FROM meja_petugas").all()).results});
    const sebelum = await anak();
    const fkPetugas = async () => (await D.prepare("PRAGMA foreign_key_check").all()).results;
    assert.equal((await fkPetugas()).length, 0);
    await jalan("0119_meja_dampak.sql");
    assert.deepEqual(await anak(), sebelum, "baris anak dan petugas selamat"); assert.deepEqual(await fkPetugas(), [], "semua FK utuh (termasuk ke meja_petugas) sesudah bangun ulang");
    await jalan("0119_meja_dampak.sql");
    assert.deepEqual(await anak(), sebelum, "jalan kedua"); assert.deepEqual(await fkPetugas(), []);
  } finally { await mf.dispose(); }
});

for (const [sampai, baruAda] of [["0118_", false], ["0119_", true]]) {
  uji(`kode baru di D1 tanpa migrasi ${sampai.slice(0, 4)}${baruAda ? " (0118 ada, 0119 belum)" : " dan sesudahnya"}: meja lama tetap ditulis dan ringkas diperbarui, meja baru 503 bukan 500`, async () => {
    const V = await siapkan("uji-meja-lama-" + sampai, {sampai});
    assert.equal(await V.DB.prepare("SELECT 1 x FROM sqlite_master WHERE name = 'meja_kelengkapan'").first(), null, "tabel kelengkapan memang belum ada");
    const a = await V.adm("POST", "/api/meja/catatan", {meja: "kaji_cepat", prov: "71", kab: "Kab Lama", desa: "Desa L", data: kaji()}); assert.equal(a.s, 201, a.t);
    const b = await V.adm("POST", "/api/meja/catatan", {meja: "renkon", prov: "71", kab: "Kab Lama", data: {bencana: "banjir", judul: "R", tgl_sah: hari(10)}}); assert.equal(b.s, 201, b.t);
    assert.equal(await V.n("meja_ringkas", "meja = 'kaji_cepat' AND kab = 'Kab Lama'"), 1, "ringkas diperbarui walau kelengkapan tak ada");
    const st1 = await V.adm("POST", "/api/meja/catatan/" + a.j.catatan.id, {aksi: "status", ke: "diverifikasi"}); assert.equal(st1.s, 200, st1.t);
    assert.equal((await V.DB.prepare("SELECT status FROM meja_ringkas WHERE meja = 'kaji_cepat'").first()).status, "diverifikasi");
    /* penyegaran penuh (jalur cron): paksa basi lalu baca */
    await V.DB.prepare("UPDATE meja_ringkas_meta SET nilai = 1").run(); await V.DB.prepare("DELETE FROM meja_ringkas").run();
    const rk = await V.adm("GET", "/api/meja/rekap"); assert.equal(rk.s, 200, rk.t); assert.equal(rk.j.per_kab.kaji_cepat["71|Kab Lama"].n, 1); assert.equal(rk.j.per_kab.renkon["71|Kab Lama"].n, 1);
    /* meja baru: 503 yang jelas */
    const baru = [["dampak", INTI_D(), wilD]];
    if (!baruAda) baru.push(["pengungsi", pengungsi(), wilD], ["klaster", {tingkat: "kabupaten_kota", dokumen: "sk_klaster", judul: "J", tahun: 2026, tgl_dokumen: hari(2)}, {}]);
    for (const [meja, data, wil] of baru) { const r = await V.adm("POST", "/api/meja/catatan", {meja, prov: "33", kab: "Kab Lama", data, ...wil}); assert.equal(r.s, 503, `${meja}: ${r.t}`); assert.match(r.j.galat, /belum diaktifkan \(migrasi belum diterapkan\)/); }
    const imp = await V.adm("POST", "/api/meja/impor", {baris: [{prov: "33", kab: "Kab Lama", data: {jenis: "banjir", nama_kejadian: "X", tanggal: hari(2)}}]}); assert.equal(imp.s, 503, imp.t); assert.match(imp.j.galat, /belum diaktifkan/);
    const kl = await V.adm("GET", "/api/meja/kelengkapan"); assert.equal(kl.s, 503, kl.t); assert.match(kl.j.galat, /belum diaktifkan/);
    const dm = await V.adm("POST", "/api/meja/dummy", {aksi: "isi"}); assert.equal(dm.s, 503, dm.t);
    const pt = await V.adm("POST", "/api/meja/petugas", {nama: "Petugas Baru", prov: "33", kab: "Kab Lama", meja: ["kaji_cepat", "dampak"]}); assert.equal(pt.s, 503, pt.t);
    assert.equal((await V.adm("POST", "/api/meja/petugas", {nama: "Petugas Lama", prov: "33", kab: "Kab Lama", meja: ["kaji_cepat"]})).s, 201, "petugas meja lama tetap bisa dibuat");
    /* galat validasi biasa tetap 400, meja lama tetap utuh */
    assert.equal((await V.adm("POST", "/api/meja/catatan", {meja: "kaji_cepat", prov: "71", kab: "Kab Lama", desa: "Desa L", data: kaji({rumah_rb: -1})})).s, 400);
    assert.equal(await V.n("meja_catatan"), 2);
    if (baruAda) { const p = await V.adm("POST", "/api/meja/catatan", {meja: "pengungsi", prov: "71", kab: "Kab Lama", ...wilD, data: pengungsi()}); assert.equal(p.s, 201, "meja 0118 jalan di D1 yang punya 0118: " + p.t); }
  });
}

uji("tabel belum dimigrasi = 503 (bukan 500)", async () => {
  await DB.batch(["meja_pelapor", "meja_stok","meja_ringkas", "meja_ringkas_bencana", "meja_ringkas_meta", "meja_jejak", "meja_catatan", "meja_petugas"].map(t => DB.prepare("DROP TABLE " + t)));
  for (const [j, h] of [["/api/meja/petugas", ADMIN], ["/api/meja/catatan?meja=dsp", ADMIN], ["/api/meja/ringkas", {}], ["/api/meja/rapor/publik", {}], ["/api/meja/rekap", ADMIN]]) {
    const r = await api("GET", j, undefined, h); assert.equal(r.s, 503, `${j}: ${r.t}`); assert.match(r.j.galat, /belum diaktifkan/);
  }
  assert.equal((await api("GET", "/api/meja/spek")).s, 200, "spek tidak butuh DB");
});
