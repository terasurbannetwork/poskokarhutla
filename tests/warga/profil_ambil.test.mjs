/* Pengambil laporan dan waktu respons (paket data/kajian-bnpb/profil-bpbd/, PF-08, RENCANA-UJI UP-35 dan UP-36). Worker + D1 sungguhan (Miniflare). Jalankan: node --test tests/warga/profil_ambil.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {profilAktif, PROFIL_KUNCI} from "./_profil.mjs";
import "../../src/worker.js";
import {hitungRespons, persentil} from "../../src/lapor_meja_hak.js";

const uji = berantai();
const U = await siapkan("uji-profil-ambil", {r2: true, ikat: {PROFIL_KUNCI}}), {api, DB, n} = U;
const ASAL = "http://bnpb.lokal", kini = Date.now(), MENIT = 6e4, HARI = 864e5, XPB = {"x-pb": "1", origin: ASAL};
const PADANG = {provKode: "13", prov: "Sumatera Barat", kabKode: "13.71", kab: "Kota Padang", kecKode: "13.71.01", desa: "Padang Barat"}, BOGOR = {provKode: "32", prov: "Jawa Barat", kabKode: "32.71", kab: "Kota Bogor", kecKode: "32.71.03", desa: "Paledang"};
let nu = 0, nl = 0;
async function lembaga(jenis, tingkat, prov, kab) {
  nu++; const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "ambiluji" + nu, jenis, tingkat, kab ? `Pemerintah ${kab}` : `Provinsi ${prov}`, kab ? `${prov}|${kab}` : prov, JSON.stringify([prov]), prov, kab ?? null, "g".repeat(32), "0".repeat(64), `a${nu}@b.id`, `6281200077${String(nu).padStart(3, "0")}`, kini).run();
  return id;
}
async function laporan(wilayah, {masuk = kini - 2 * HARI, status = "baru"} = {}) {
  const nomor = `LA-2611${String(10 + (++nl >> 2)).padStart(2, "0")}-${String(10 + (nl % 100)).padStart(2, "0")}`.replace(/(\d{2})$/, m => m);
  const kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -0.9, lon: 100.35, wilayah}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES (?, ?, 'terkirim', 'bpbd', 'banjir', ?, -0.9, 100.35, ?, ?, ?, ?, ?, 0, ?, ?)`)
    .bind("s" + nomor, "628120066" + String(nl).padStart(4, "0"), wilayah.kabKode, nomor, sha256(nomor), masuk, JSON.stringify(kerja), JSON.stringify({wilayah}), masuk, masuk),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, ?, ?)").bind(nomor, "s" + nomor, status, masuk)]);
  return nomor;
}
const pakai = (p, t = {}) => ({cookie: p.cookie, ...XPB, ...t});
let padang, andi, budi, bogor, nomor1, nomor2, akunPadang;

uji("siapkan: akun Padang dengan dua profil, akun Bogor, laporan", async () => {
  akunPadang = await lembaga("pemkot", "kab", "13", "Kota Padang"); padang = {id: akunPadang};
  andi = await profilAktif(DB, akunPadang, {nama: "Andi Saputra", jabatan: "Pusdalops"}); budi = await profilAktif(DB, akunPadang, {baru: true, nama: "Budi Hartono", jabatan: "Kepala Bidang"});
  bogor = await profilAktif(DB, await lembaga("pemkot", "kab", "32", "Kota Bogor"));
  nomor1 = await laporan(PADANG); nomor2 = await laporan(BOGOR);
});

uji("UP-35 ambil: satu baris lapor_ambil, riwayat 'Diambil oleh' dengan dari = ke, status tetap, log meja, label di daftar dan rincian, idempoten, profil lain 409", async () => {
  const sebelum = await DB.prepare("SELECT status FROM lapor_tiket WHERE nomor = ?").bind(nomor1).first();
  const r = await api("POST", `/api/lapor/meja/${nomor1}/ambil`, {}, pakai(andi)); assert.equal(r.s, 200, r.t);
  assert.match(r.j.label, /^Ditangani: Andi Saputra, Pusdalops BPBD /);
  assert.equal(await n("lapor_ambil", `nomor = '${nomor1}'`), 1);
  assert.deepEqual(await DB.prepare("SELECT dari, ke, catatan FROM lapor_tiket_riwayat WHERE nomor = ? AND catatan LIKE 'Diambil oleh%'").bind(nomor1).first(), {dari: sebelum.status, ke: sebelum.status, catatan: "Diambil oleh Andi Saputra, Pusdalops"});
  assert.equal((await DB.prepare("SELECT status FROM lapor_tiket WHERE nomor = ?").bind(nomor1).first()).status, sebelum.status, "status tiket tidak berubah");
  assert.equal(await n("instansi_profil_log", `profil_id = '${andi.id}' AND jenis = 'meja' AND rute LIKE '%/ambil' AND objek = '${nomor1}'`), 1);
  const d = await api("GET", "/api/lapor/meja", undefined, pakai(andi)); assert.equal(d.j.baris.find(x => x.nomor === nomor1).ditangani, r.j.label);
  assert.equal((await api("GET", `/api/lapor/meja/${nomor1}`, undefined, pakai(andi))).j.ditangani, r.j.label);
  const ulang = await api("POST", `/api/lapor/meja/${nomor1}/ambil`, {}, pakai(andi)); assert.equal(ulang.s, 200); assert.equal(await n("lapor_tiket_riwayat", `nomor = '${nomor1}' AND catatan LIKE 'Diambil oleh%'`), 1, "tanpa riwayat ganda");
  const lain = await api("POST", `/api/lapor/meja/${nomor1}/ambil`, {}, pakai(budi)); assert.equal(lain.s, 409); assert.equal(lain.j.label, r.j.label);
  assert.ok(!r.t.includes("19800101"), "tanpa NIP");
});

uji("UP-35 ambil: staf BNPB 403, luar wilayah 404, tiket selesai atau tidak_valid 409, tanpa sesi profil 403, pengambil dicabut boleh diganti, tidak ada di jawaban publik", async () => {
  assert.equal((await api("POST", `/api/lapor/meja/${nomor1}/ambil`, {}, {...ADMIN, ...XPB})).s, 403, "staf BNPB");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor2}/ambil`, {}, pakai(andi))).s, 404, "luar wilayah");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor1}/ambil`, {}, XPB)).s, 403, "tanpa sesi profil");
  const tutup = await laporan(PADANG, {status: "selesai"}), invalid = await laporan(PADANG, {status: "tidak_valid"});
  assert.equal((await api("POST", `/api/lapor/meja/${tutup}/ambil`, {}, pakai(andi))).s, 409); assert.equal((await api("POST", `/api/lapor/meja/${invalid}/ambil`, {}, pakai(andi))).s, 409);
  await DB.prepare("UPDATE instansi_profil SET status = 'dicabut' WHERE id = ?").bind(andi.id).run();
  const ganti = await api("POST", `/api/lapor/meja/${nomor1}/ambil`, {}, pakai(budi)); assert.equal(ganti.s, 200, ganti.t); assert.match(ganti.j.label, /Budi Hartono/);
  assert.equal((await DB.prepare("SELECT profil_id FROM lapor_ambil WHERE nomor = ?").bind(nomor1).first()).profil_id, budi.id);
  const publik = await api("GET", "/api/lapor/alun", undefined, {}); assert.ok(!/Ditangani/.test(publik.t), "label tidak ada di jawaban publik");
  assert.ok(!/ambilData|Diambil oleh/.test(publik.t));
});

uji("fungsi murni: persentil peringkat terdekat dan hitungRespons (kurang dari 5 = belum cukup data, selisih negatif dibuang)", () => {
  assert.equal(persentil([10, 1, 3, 2, 4], 0.5), 3); assert.equal(persentil([1, 2, 3, 4, 10], 0.9), 10); assert.equal(persentil([], 0.5), null);
  const r = hitungRespons([...Array(5)].map((_, i) => ({kab: "A", masuk: 0, dilihat: (i + 1) * 6e4, ambil: i < 2 ? 5 * 6e4 : null})).concat([{kab: "B", masuk: 0, dilihat: 1, ambil: null}]));
  const a = r.find(x => x.kab === "A"), b = r.find(x => x.kab === "B");
  assert.deepEqual([a.dilihat.median, a.dilihat.p90, a.ditangani.median, a.belum_diambil], [3, 5, 5, 3]); assert.deepEqual([b.cukup, b.catatan, b.dilihat], [false, "belum cukup data", undefined]);
});

uji("UP-36 respons: median dan p90 sama dengan hitungan tangan; belum diambil bukan nol; 4 laporan = belum cukup data; tidak_valid dan di luar 30 hari tidak ikut; BPBD dan tamu 403; tanpa nama PIC dan nomor", async () => {
  const PARIAMAN = {provKode: "13", prov: "Sumatera Barat", kabKode: "13.77", kab: "Kota Pariaman", kecKode: "13.77.01", desa: "Pariaman Tengah"}, akun = await lembaga("pemkot", "kab", "13", "Kota Pariaman"), t0 = kini - 10 * HARI;
  const dl = [1, 2, 3, 4, 10, null], am = [5, 10, 20, 60, null, null];
  for (let i = 0; i < 6; i++) {
    const nomor = await laporan(PARIAMAN, {masuk: t0 + i * 1000});
    if (dl[i] != null) await DB.prepare("INSERT INTO instansi_profil_log (waktu, akun_id, profil_id, jenis, rute, objek) VALUES (?, ?, ?, 'meja', ?, ?)").bind(t0 + i * 1000 + dl[i] * MENIT, akun, budi.id, `POST /api/lapor/meja/${nomor}/lihat`, nomor).run();
    if (am[i] != null) await DB.prepare("INSERT INTO lapor_ambil (nomor, profil_id, akun_id, nama, jabatan, label, waktu) VALUES (?, ?, ?, 'Budi Hartono', 'Kepala Bidang', 'Ditangani: Budi Hartono, Kepala Bidang BPBD', ?)").bind(nomor, budi.id, akun, t0 + i * 1000 + am[i] * MENIT).run();
  }
  await laporan(PARIAMAN, {masuk: t0, status: "tidak_valid"}); await laporan(PARIAMAN, {masuk: kini - 45 * HARI});
  for (let i = 0; i < 3; i++) await laporan(BOGOR, {masuk: t0});   // nomor2 + 3 = empat laporan
  const r = await api("GET", "/api/lapor/respons", undefined, ADMIN); assert.equal(r.s, 200, r.t);
  const p = r.j.bpbd.find(x => /Pariaman/.test(x.wilayah));
  assert.deepEqual([p.laporan, p.cukup, p.belum_dilihat, p.belum_diambil], [6, true, 1, 2]);
  assert.deepEqual(p.dilihat, {n: 5, median: 3, p90: 10}); assert.deepEqual(p.ditangani, {n: 4, median: 10, p90: 60});
  const bgr = r.j.bpbd.find(x => /Bogor/.test(x.wilayah)); assert.equal(bgr.cukup, false); assert.equal(bgr.catatan, "belum cukup data"); assert.equal(bgr.dilihat, undefined);
  assert.ok(!/Andi|Budi|NIP|6281200/.test(r.t), "tanpa nama PIC dan nomor"); assert.ok(!/peringkat|rank/i.test(r.t));
  assert.deepEqual(r.j.bpbd.map(x => x.wilayah), [...r.j.bpbd.map(x => x.wilayah)].sort((a, b) => a.localeCompare(b, "id")), "urut nama wilayah, bukan kecepatan");
  assert.equal((await api("GET", "/api/lapor/respons", undefined, pakai(budi))).s, 403, "BPBD"); assert.equal((await api("GET", "/api/lapor/respons", undefined, {})).s, 403, "tamu");
});

uji("aksi lihat yang ditolak (luar wilayah) tidak tercatat sebagai dilihat; lihat yang berhasil tercatat sesudah sukses", async () => {
  const ditolak = await api("POST", `/api/lapor/meja/${nomor2}/lihat`, {}, pakai(budi)), sebelum = await n("instansi_profil_log", `jenis = 'meja' AND objek = '${nomor2}'`);
  assert.equal(ditolak.s, 404); assert.equal(sebelum, 0, "ditolak = tidak dihitung dilihat");
  const baru = await laporan(PADANG), ok = await api("POST", `/api/lapor/meja/${baru}/lihat`, {}, pakai(budi)); assert.equal(ok.s, 200, ok.t);
  assert.equal(await n("instansi_profil_log", `jenis = 'meja' AND objek = '${baru}' AND rute LIKE '%/lihat'`), 1);
});
