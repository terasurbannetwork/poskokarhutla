/* Papan aktivasi per profil dan kirim ulang undangan (paket data/kajian-bnpb/profil-bpbd/, PF-07, RENCANA-UJI UP-33 dan UP-34). Worker + D1 sungguhan (Miniflare).
   Jalankan: node --test tests/warga/profil_papan.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";

const uji = berantai();
const U = await siapkan("uji-profil-papan"), {api, DB, n} = U;
const ASAL = "http://bnpb.lokal", kini = Date.now(), HARI = 864e5, PB = {"x-pb": "1", origin: ASAL};
const KAB = [...new Set(Object.keys(JSON.parse(readFileSync(path.join(AKAR, "public/banjir/data/pusat_kec.json"), "utf8"))).filter(k => k.startsWith("62|")).map(k => k.split("|")[1]))].sort();
const [K_AKTIF, K_BARU, K_KURANG, K_LAMA, K_MENUNGGU, K_TOLAK, K_BELUM_KLAIM, K_KOSONG, K_LAIN] = KAB.slice(0, 9);
let nu = 0, ipN = 0;
const ip = () => ({"cf-connecting-ip": `10.7.${Math.floor(++ipN / 250)}.${ipN % 250}`});
const akun = async (kab, status, {jenis = "pemkab", prov = "62", tingkat = "kab"} = {}) => {
  const id = String(++nu).padStart(16, "d"), dasar = {nama: "Budi", nip: "198001012005011001", jabatan: "Kepala", unit: "BPBD", email: `b${nu}@x.go.id`, wa: `62812777${String(nu).padStart(4, "0")}`};
  const lengkap = ["menunggu", "aktif", "ditolak"].includes(status);
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, alasan, surat, kartu, dikirim, wajib_ganti, dibuat, ${lengkap ? "nama, nip, jabatan, unit, email, wa" : "dummy"})
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ${lengkap ? "?, ?, ?, ?, ?, ?" : "0"})`).bind(id, `papanuji${nu}`, jenis, tingkat, `BPBD ${kab ?? "Provinsi " + prov}`, tingkat === "prov" ? prov : `${prov}|${kab}`, JSON.stringify([prov]),
    tingkat === "kab" ? prov : null, tingkat === "kab" ? kab : null, "g".repeat(32), "0".repeat(64), status, status === "ditolak" ? "perbaiki" : null, lengkap ? 1 : 0, lengkap ? 1 : 0, lengkap ? 1 : null, kini, ...(lengkap ? Object.values(dasar) : [])).run();
  return id;
};
let pn = 0;
const profil = (akunId, status, terakhir = null) => { pn++; const dipakai = status === "aktif" || status === "menunggu";
  return DB.prepare(`INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, foto, pin_garam, pin_sha, status, terakhir_masuk, dibuat, diubah) VALUES (?, ?, ?, 'Analis', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(String(pn).padStart(16, "e"), akunId, `Petugas Papan ${pn}`, `NIPRAHASIA${pn}`, `rahasia${pn}@bpbd.go.id`, `62899123${String(pn).padStart(5, "0")}`, dipakai ? 1 : 0, dipakai ? "a".repeat(16) : null, dipakai ? "b".repeat(64) : null, status, terakhir, kini + pn, kini + pn).run(); };
const baris = (j, prov, kab) => j.daftar.find(r => r.prov === prov && (r.kab ?? null) === (kab ?? null));
let ids = {}, kontakId, kontakLain;
const staf = async (wilayah, i) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: `Verifikator ${i}`, nip: `19960${i}0012005`, unit: "Pusdalops BNPB", email: `v${i}@bnpb.go.id`, wa: "081234567890", peran: ["verifikator"], wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ip()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {cookie, ...PB};
};

uji("siapkan: delapan keadaan BPBD di Kalimantan Tengah dan kontak pemangku", async () => {
  ids.prov = await akun(null, "aktif", {jenis: "pemprov", tingkat: "prov"}); for (let i = 0; i < 3; i++) await profil(ids.prov, "aktif", kini - 1000);
  ids.aktif = await akun(K_AKTIF, "aktif"); for (let i = 0; i < 3; i++) await profil(ids.aktif, "aktif", kini - 3600e3 * (i + 1));
  ids.kurang = await akun(K_KURANG, "aktif"); await profil(ids.kurang, "aktif", kini); await profil(ids.kurang, "aktif", kini); await profil(ids.kurang, "dicabut");
  ids.lama = await akun(K_LAMA, "aktif"); for (let i = 0; i < 3; i++) await profil(ids.lama, "aktif", kini - 45 * HARI);
  ids.menunggu = await akun(K_MENUNGGU, "menunggu"); for (let i = 0; i < 3; i++) await profil(ids.menunggu, "menunggu");
  ids.tolak = await akun(K_TOLAK, "ditolak"); await profil(ids.tolak, "draf");
  ids.baru = await akun(K_BARU, "belum_klaim"); await profil(ids.baru, "draf"); await profil(ids.baru, "draf"); await profil(ids.baru, "dicabut");
  ids.klaim = await akun(K_BELUM_KLAIM, "aktif"); await profil(ids.klaim, "aktif", kini); await profil(ids.klaim, "aktif", kini); await profil(ids.klaim, "aktif", kini); await profil(ids.klaim, "menunggu");
  const kontak = (kab, wa, kat = "bpbd") => { const id = String(++nu).padStart(16, "f"); return DB.prepare("INSERT INTO kontak_pemangku (id, nama, jabatan, kategori, prov, kab, wa, status, dibuat, diubah) VALUES (?, 'Kontak BPBD', 'Kepala', ?, '62', ?, ?, 'aktif', ?, ?)").bind(id, kat, kab, wa, kini, kini).run().then(() => id); };
  kontakId = await kontak(K_BARU, "628129990001"); kontakLain = await kontak(K_LAIN, "628129990002"); ids.kontakProv = await kontak(null, "628129990003"); ids.kontakPolri = await kontak(K_BARU, "628129990004", "polri");
});

uji("UP-33 papan: jumlah PIC, status akun, menunggu, terakhir masuk, 38 baris provinsi; tanpa NIP, email, HP; tamu 403", async () => {
  assert.equal((await api("GET", "/api/masuk/aktivasi", undefined, ip())).s, 403, "tamu");
  const r = await api("GET", "/api/masuk/aktivasi", undefined, {...ADMIN, ...ip()}); assert.equal(r.s, 200, r.t.slice(0, 200));
  assert.equal(r.j.daftar.filter(x => x.tingkat === "prov").length, 38, "38 baris provinsi di samping kab/kota");
  const kab62 = r.j.daftar.filter(x => x.prov === "62" && x.tingkat === "kab").length; assert.equal(kab62, KAB.length);
  const cek = (kab, pic, aktif, status, menunggu) => { const b = baris(r.j, "62", kab); assert.deepEqual([b.pic, b.pic_aktif, b.status, b.menunggu], [pic, aktif, status, menunggu], kab ?? "provinsi"); return b; };
  cek(K_AKTIF, 3, 3, "aktif", false); cek(K_KURANG, 2, 2, "aktif_kurang", false); cek(K_LAMA, 3, 3, "lama", false); cek(K_MENUNGGU, 3, 0, "menunggu", true);
  cek(K_TOLAK, 1, 0, "ditolak", false); cek(K_BARU, 2, 0, "belum_klaim", false); cek(K_KOSONG, 0, 0, "belum_ada", false); cek(null, 3, 3, "aktif", false);
  const klaim = cek(K_BELUM_KLAIM, 4, 3, "aktif", true); assert.ok(klaim.menunggu, "akun aktif dengan satu profil menunggu: menunggu benar");
  const a = baris(r.j, "62", K_AKTIF); assert.ok(Math.abs(a.terakhir_masuk - (kini - 3600e3)) < 2000, "terakhir_masuk = maksimum profil");
  assert.equal(baris(r.j, "62", K_KOSONG).akun_id, null);
  assert.ok(!/NIPRAHASIA|rahasia\d+@|62899123/.test(r.t), "papan tanpa NIP, email, HP");
  const rinci = await api("GET", `/api/masuk/aktivasi?prov=62&kab=${encodeURIComponent(K_AKTIF)}`, undefined, {...ADMIN, ...ip()}); assert.equal(rinci.s, 200, rinci.t);
  assert.equal(rinci.j.profil.length, 3); assert.ok(!/NIPRAHASIA|rahasia\d+@|62899123/.test(rinci.t), "rincian tanpa data pribadi penuh"); assert.equal(rinci.j.pemda.status, "aktif");
  const prov = await api("GET", "/api/masuk/aktivasi?prov=62&tingkat=prov", undefined, {...ADMIN, ...ip()}); assert.equal(prov.s, 200, prov.t); assert.equal(prov.j.profil.length, 3); assert.equal(prov.j.kab, null);
  assert.equal(prov.j.kontak_bpbd[0].wa.includes("628129990003"), false, "nomor kontak tersamar");
});

uji("UP-33 papan: staf wilayah lain tidak melihat baris di luar wilayahnya; peran di luar daftar ditolak", async () => {
  const sendiri = await staf(["62"], 1), lain = await staf(["32"], 2);
  const a = await api("GET", "/api/masuk/aktivasi", undefined, {...sendiri, ...ip()}); assert.equal(a.s, 200); assert.ok(a.j.daftar.some(x => x.prov === "62")); assert.ok(a.j.daftar.every(x => x.prov === "62"));
  const b = await api("GET", "/api/masuk/aktivasi", undefined, {...lain, ...ip()}); assert.equal(b.s, 200); assert.ok(b.j.daftar.every(x => x.prov === "32")); assert.ok(!b.j.daftar.some(x => x.prov === "62"));
  assert.equal((await api("GET", `/api/masuk/aktivasi?prov=62&kab=${encodeURIComponent(K_AKTIF)}`, undefined, {...lain, ...ip()})).s, 403);
  const h = await api("POST", "/api/masuk/undang-ulang", {akun_id: ids.baru, kontak_id: kontakId}, {...lain, ...ip()}); assert.equal(h.s, 403, "kirim ulang di luar wilayah");
});

uji("UP-34 kirim ulang: satu baris wa_antre undang_pf ke kontak bpbd wilayah itu, tanpa sandi, dengan username dan tautan; batas satu per jam", async () => {
  const kirim = (b, h = {...ADMIN, ...ip(), ...PB}) => api("POST", "/api/masuk/undang-ulang", b, h);
  assert.equal((await kirim({akun_id: ids.baru, kontak_id: kontakId}, {...ip()})).s, 403, "tanpa x-pb dan hak");
  assert.equal((await kirim({akun_id: ids.baru, kontak_id: kontakLain})).s, 400, "kontak wilayah lain");
  assert.equal((await kirim({akun_id: ids.baru, kontak_id: ids.kontakPolri})).s, 400, "kontak bukan kategori bpbd");
  assert.equal(await n("wa_antre", "jenis = 'undang_pf'"), 0);
  const ok = await kirim({akun_id: ids.baru, kontak_id: kontakId, tujuan: "628120000000", wa: "628120000000"}); assert.equal(ok.s, 201, ok.t);
  assert.equal(await n("wa_antre", "jenis = 'undang_pf'"), 1);
  const w = await DB.prepare("SELECT tujuan, pesan, rujukan, status FROM wa_antre WHERE jenis = 'undang_pf'").first();
  assert.equal(w.tujuan, "628129990001", "tujuan dari baris kontak, bukan badan"); assert.equal(w.rujukan, ids.baru); assert.equal(w.status, "antre");
  assert.match(w.pesan, /papanuji\d+/); assert.match(w.pesan, /https:\/\/centurisk97\.id\/instansi/); assert.doesNotMatch(w.pesan, /sandi awal:|tugas api|Pantau Bencana/i);
  assert.equal((await kirim({akun_id: ids.baru, kontak_id: kontakId})).s, 429, "kedua dalam satu jam");
  assert.equal(await n("wa_antre", "jenis = 'undang_pf'"), 1);
  const salin = await kirim({akun_id: ids.klaim}); assert.equal(salin.s, 200); assert.match(salin.j.teks_salin, /Username: papanuji/); assert.equal(await n("wa_antre", "jenis = 'undang_pf'"), 1, "teks salin tidak menulis antrean");
  const tanpaKontak = await kirim({akun_id: ids.kurang, kontak_id: ids.kontakProv}); assert.equal(tanpaKontak.s, 400, "kontak provinsi untuk akun kab");
  await DB.prepare("UPDATE instansi_akun SET status = 'dicabut', alasan = 'x' WHERE id = ?").bind(ids.tolak).run();
  assert.equal((await kirim({akun_id: ids.tolak})).s, 409, "dicabut");
  assert.equal((await kirim({akun_id: "1".repeat(16)})).s, 404);
  const prov = await kirim({akun_id: ids.prov, kontak_id: ids.kontakProv}); assert.equal(prov.s, 201, prov.t);
});

uji("undang-ulang: teks salin juga dibatasi per akun per jam", async () => {
  const kirim = b => api("POST", "/api/masuk/undang-ulang", b, {...ADMIN, ...ip(), ...PB});
  assert.equal((await kirim({akun_id: ids.aktif})).s, 200); assert.equal((await kirim({akun_id: ids.aktif})).s, 429);
});
