/* Akun staf BNPB dan Meja Pantau (src/staf.js, src/pantau.js) di workerd (Miniflare) dengan D1 + R2 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock klien DB).
   Yang dibuktikan: migrasi 0030 idempoten dan CHECK/trigger-nya menahan; matriks peran x rute (izin DAN larangan, rute lama tidak melonggar); tiap jenis butir muncul dan hilang
   sesuai kondisi sumbernya; wilayah dan peran menyaring; penugasan, jejak, abaikan wajib alasan; dummy hanya Super Admin dan menumbuhkan rantai hulu-hilir; 503 tanpa migrasi.
   Jalankan: node --test tests/warga/pantau.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {PERAN, bersihkanStaf} from "../../src/staf.js";
import {JENIS, bersihkanPantau} from "../../src/pantau.js";
import {LAYAR_SIPPA} from "../../src/sippa.js";

const JAM = 3600e3, MENIT = 60e3, HARI = 24 * JAM, PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const uji = berantai();
const U = await siapkan("uji-pantau", {r2: true});
const {DB, api, n} = U;
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`});

/* ---------------- staf: dibuat lewat rute Super Admin sungguhan, sandi hanya di memori uji ---------------- */
let nipN = 0;
const bikin = async (nama, peran, wilayah = [], {tanpaGanti = false} = {}) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19800${++nipN}0012005`, unit: "Pusdalops BNPB", email: `s${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0], s = {id: r.j.staf.id, username: r.j.username, sandi: r.j.sandi, cookie, nama};
  if (!tanpaGanti) { const g = await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB}); assert.equal(g.s, 200, g.t); s.sandi = g.j.sandi; }
  s.h = {cookie}; s.hp = {cookie, ...PB};   // baca / kirim
  return s;
};
const dari = (s, metode, j, body) => api(metode, j, body, metode === "GET" ? s.h : s.hp);

/* ---------------- sumber butir: SQL langsung (tabelnya milik modul lain; rute pembuatnya diuji di modul itu) ---------------- */
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const sisip = (tabel, o) => DB.prepare(`INSERT INTO ${tabel} (${Object.keys(o).join(", ")}) VALUES (${Object.keys(o).map(() => "?").join(", ")})`).bind(...Object.values(o)).run();
const akunMenunggu = (o = {}) => sisip("instansi_akun", {id: id16(), username: "akun" + id16().slice(0, 8), jenis: "pemkab", tingkat: "kab", wilayah: "Pemerintah Kabupaten Contoh", kunci_wilayah: "k" + id16(), cakupan: '["62"]', prov: "62", kab: "Contoh",
  garam: "a".repeat(32), sandi_sha: "0".repeat(64), status: "menunggu", nama: "Budi", nip: "198001012005011001", jabatan: "Kalak", unit: "BPBD", email: "budi@contoh.go.id", wa: "628123456789", surat: 1, kartu: 1,
  dikirim: Date.now() - 2 * JAM, wajib_ganti: 0, dibuat: Date.now() - 3 * JAM, dummy: 0, ...o});
const tugas = (o = {}) => { const id = id16(); return sisip("tugas_api", {id, prov: "62", kab: "Kotawaringin Timur", kec: "Baamang", lat: -2.5, lon: 113.2, level: 3, n24: 4, luas_ha: 8, dibuat: Date.now() - 8 * JAM, terakhir_terdeteksi: Date.now() - 6 * JAM,
  status: "buka", konfirmasi_pada: null, isian_terakhir: null, dummy: 0, ...o}).then(() => id); };
const panggilan = (o = {}) => { const id = id16(); return sisip("panggilan", {id, tanggal: new Date(Date.now() + 7 * JAM).toISOString().slice(0, 10), perusahaan_id: "pt-" + id, nama_pt: "PT Contoh " + id.slice(0, 4), prov: "62", kab: "Seruyan",
  titik_n: 3, terdeteksi: Date.now() - JAM, lat: -2.5, lon: 112.9, status: "baru", dibuat: Date.now() - 30 * MENIT, dummy: 0, ...o}).then(() => ({id, perusahaan_id: o.perusahaan_id ?? "pt-" + id})); };
const kontakPT = pid => sisip("kontak_pt", {id: id16(), perusahaan_id: pid, nama_pt: "PT", wa: "628123456781", diubah: Date.now(), dummy: 0});
const usulan = async akunId => { const id = id16(); await sisip("usulan_kontak_pt", {id, akun_id: akunId, perusahaan_id: "usul-" + id, nama_pt: "PT Usulan", wa: "628123456782", status: "menunggu", dibuat: Date.now() - JAM, dummy: 0}); return id; };
const akunId = async u => (await DB.prepare("SELECT id FROM instansi_akun WHERE username = ?").bind(u).first()).id;
const bersihSumber = async () => { for (const t of ["pantau_tugas", "usulan_kontak_pt", "tugas_isian", "tugas_api", "panggilan", "kontak_pt", "instansi_akun"]) await DB.prepare(`DELETE FROM ${t} WHERE dummy = 0`).run(); };
const ADM = (j, m = "GET", b) => api(m, j, b, ADMIN);
const butir = async (h = ADMIN) => { const r = await api("GET", "/api/pantau", undefined, h); assert.equal(r.s, 200, r.t); return r.j; };
const ada = (j, jenis) => j.butir.filter(b => b.jenis === jenis);

/* ================================================================ skema */
uji("migrasi 0030 idempoten; CHECK dan trigger menahan peran/wilayah liar, NIP ganda, abaikan tanpa alasan, jejak hanya menambah", async () => {
  const sql = teks("migrations/0030_staf.sql");
  const { pecah } = await import("./_bantu.mjs");
  for (let i = 0; i < 2; i++) await DB.batch(pecah(sql).map(s => DB.prepare(s)));   // dijalankan ulang di atas skema yang sudah ada
  const dasar = {username: "stafcek01", nama: "Cek", nip: "198001010001", unit: "BNPB", email: "c@bnpb.go.id", wa: "628123456789", peran: '["pusdalops"]', wilayah: "[]", garam: "a".repeat(32), sandi_sha: "0".repeat(64), dibuat: 1};
  const gagalSisip = async (o, pola) => assert.rejects(() => sisip("staf", {id: id16(), ...dasar, ...o}), pola);
  await gagalSisip({peran: '["raja"]', username: "stafcek02", nip: "198001010002"}, /tidak sah/);
  await gagalSisip({peran: '["tmc","tmc"]', username: "stafcek03", nip: "198001010003"}, /tidak sah/);
  await gagalSisip({peran: "[]", username: "stafcek04", nip: "198001010004"}, /CHECK/);
  await gagalSisip({wilayah: '["6"]', username: "stafcek05", nip: "198001010005"}, /tidak sah/);
  await gagalSisip({wilayah: '["62","62"]', username: "stafcek06", nip: "198001010006"}, /tidak sah/);
  await gagalSisip({wa: "081234567890", username: "stafcek07", nip: "198001010007"}, /CHECK/);
  await sisip("staf", {id: id16(), ...dasar, wilayah: '["62","11"]', peran: '["pusdalops","pimpinan"]'});
  await gagalSisip({username: "stafcek08"}, /UNIQUE/);   // NIP yang sama = orang yang sama
  await assert.rejects(() => DB.prepare("UPDATE staf SET peran = '[\"x\"]' WHERE username = 'stafcek01'").run(), /tidak sah/);
  await assert.rejects(() => sisip("pantau_tugas", {butir_id: "abaikan-tanpa", jenis: "api_kabar", status: "abaikan", dibuat: 1, diubah: 1, oleh: "tes"}), /CHECK/);
  await assert.rejects(() => sisip("pantau_tugas", {butir_id: "abaikan-pendek", jenis: "api_kabar", status: "abaikan", alasan: "x", dibuat: 1, diubah: 1, oleh: "tes"}), /CHECK/);
  await sisip("pantau_jejak", {waktu: 1, oleh: "tes", obyek: "butir:jejak-nyata", aksi: "ambil"});
  await assert.rejects(() => DB.prepare("UPDATE pantau_jejak SET aksi = 'x'").run(), /hanya bisa ditambah/);
  await assert.rejects(() => DB.prepare("DELETE FROM pantau_jejak WHERE obyek = 'butir:jejak-nyata'").run(), /hanya bisa ditambah/);
  await DB.prepare("DELETE FROM staf WHERE username = 'stafcek01'").run();
});
uji("daftar peran dan jenis: JS == trigger migrasi == klien (tidak menyimpang)", async () => {
  const sql = teks("migrations/0085_staf_peran_kemitraan.sql"), dariSql = [...sql.match(/value NOT IN \(([^)]*)\)/)[1].matchAll(/'(\w+)'/g)].map(m => m[1]);
  assert.deepEqual(Object.keys(PERAN).sort(), dariSql.sort());
  const klien = teks("public/admin/pantau.js");
  for (const p of Object.keys(PERAN)) assert.ok(klien.includes(`${p}:`), "klien tak mengenal peran " + p);
  assert.ok(Object.keys(JENIS).length >= 10);
  for (const j of Object.values(JENIS)) assert.ok(existsSync(path.join(AKAR, "public", j.tautan.replace(/^\//, "") + ".html")) || j.tautan.startsWith("/admin/") || (j.tautan.startsWith("/pipa/") && LAYAR_SIPPA.includes(j.tautan.slice(6))), "tautan layar kerja: " + j.tautan);   // /pipa/<layar>: cangkang worker (src/sippa.js), bukan berkas HTML
});

/* ================================================================ akun */
let SA;   // staf pusdalops utama
uji("akun staf: hanya Super Admin yang membuat; sandi acak tampil sekali, hanya hash di D1; wajib ganti sebelum dipakai", async () => {
  const badan = {nama: "Siti Aminah", nip: "198511112010012002", unit: "Pusdalops BNPB", email: "siti@bnpb.go.id", wa: "081298765432", peran: ["pusdalops"], wilayah: ["62"]};
  for (const [h, kode] of [[MOD2, 403], [GERBANG, 403], [{}, 403]]) assert.equal((await api("POST", "/api/staf/admin/buat", badan, h)).s, kode);
  assert.equal((await api("POST", "/api/staf/admin/buat", {...badan, peran: ["raja"]}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/staf/admin/buat", {...badan, peran: []}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/staf/admin/buat", {...badan, wilayah: ["99"]}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/staf/admin/buat", {...badan, wa: "123"}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/staf/admin/buat", {...badan, email: "bukan-email"}, ADMIN)).s, 400);
  const r = await api("POST", "/api/staf/admin/buat", badan, ADMIN);
  assert.equal(r.s, 201, r.t); assert.match(r.j.sandi, /^[2-9A-HJ-NP-Za-km-z]{16}$/); assert.match(r.j.username, /^bnpbsiti\d{3}$/);
  const baris = await DB.prepare("SELECT * FROM staf WHERE id = ?").bind(r.j.staf.id).first();
  assert.equal(baris.wajib_ganti, 1); assert.equal(baris.sandi_sha.length, 64); assert.ok(!JSON.stringify(baris).includes(r.j.sandi), "sandi polos tidak boleh ada di D1");
  assert.ok(!(await api("GET", "/api/staf/admin/daftar", undefined, ADMIN)).t.includes(r.j.sandi), "daftar tidak membocorkan sandi");
  assert.equal((await api("POST", "/api/staf/admin/buat", badan, ADMIN)).s, 409, "NIP sama = orang sama");
  /* masuk: salah 401 satu pesan; sebelum ganti sandi, rute kerja tertutup */
  assert.equal((await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: "salah"}, ipBaru())).s, 401);
  assert.equal((await api("POST", "/api/staf/masuk", {username: "tidakada99", sandi: "x"}, ipBaru())).s, 401);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200);
  const cookie = m.h.get("set-cookie"); assert.match(cookie, /sesi_staf=[0-9a-f]{64}; Path=\/; HttpOnly; Secure; SameSite=Lax/);
  const c = {cookie: cookie.split(";")[0]};
  assert.equal((await api("GET", "/api/pantau", undefined, c)).s, 401, "sandi awal diketahui admin: belum boleh bekerja");
  assert.equal((await api("GET", "/api/instansi/admin/antrean", undefined, c)).s, 403);
  const saya = await api("GET", "/api/staf/saya", undefined, c); assert.equal(saya.s, 200); assert.equal(saya.j.staf.wajib_ganti, true);
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, c)).s, 403, "tanpa x-pb ditolak");
  const g = await api("POST", "/api/staf/gantisandi", {}, {...c, ...PB}); assert.equal(g.s, 200); assert.match(g.j.sandi, /^[2-9A-HJ-NP-Za-km-z]{16}$/); assert.notEqual(g.j.sandi, r.j.sandi);
  assert.equal((await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru())).s, 401, "sandi awal hangus");
  assert.equal((await api("GET", "/api/pantau", undefined, c)).s, 200);
  SA = {id: r.j.staf.id, username: r.j.username, sandi: g.j.sandi, nama: "Siti Aminah", h: c, hp: {...c, ...PB}};
  assert.equal(await n("pantau_jejak", "obyek = 'staf:" + SA.id + "'"), 2, "buat dan ganti_sandi tercatat");
});
uji("masuk: sandi benar selalu lolos, salah berulang dari satu (username, IP) kena 429, IP lain tak terganggu", async () => {
  const s = await bikin("Lisa Laju", ["pimpinan"]), ip = {"cf-connecting-ip": "203.0.113.77"};
  for (let i = 0; i < 8; i++) assert.equal((await api("POST", "/api/staf/masuk", {username: s.username, sandi: "salah" + i}, ip)).s, 401);
  assert.equal((await api("POST", "/api/staf/masuk", {username: s.username, sandi: "salah9"}, ip)).s, 429);
  assert.equal((await api("POST", "/api/staf/masuk", {username: s.username, sandi: s.sandi}, ip)).s, 200, "sandi benar tidak bisa dikunci penyerang");
  assert.equal((await api("POST", "/api/staf/masuk", {username: s.username, sandi: "salah"}, {"cf-connecting-ip": "203.0.113.78"})).s, 401);
});
uji("cabut, reset, ubah peran: berlaku seketika; hanya Super Admin", async () => {
  const s = await bikin("Rani Reset", ["verifikator"]);
  assert.equal((await dari(s, "GET", "/api/instansi/admin/antrean")).s, 200);
  assert.equal((await api("POST", "/api/staf/admin/" + s.id, {aksi: "ubah", peran: ["analis_konsesi"], wilayah: []}, MOD2)).s, 403);
  assert.equal((await api("POST", "/api/staf/admin/" + s.id, {aksi: "ubah", peran: ["raja"]}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/staf/admin/" + s.id, {aksi: "ubah", peran: ["analis_konsesi"], wilayah: []}, ADMIN)).s, 200);
  assert.equal((await dari(s, "GET", "/api/instansi/admin/antrean")).s, 403, "peran baru berlaku tanpa masuk ulang");
  assert.equal((await dari(s, "GET", "/api/instansi/admin/usulan")).s, 200);
  const r = await api("POST", "/api/staf/admin/" + s.id, {aksi: "reset"}, ADMIN); assert.equal(r.s, 200); assert.match(r.j.sandi, /^[2-9A-HJ-NP-Za-km-z]{16}$/);
  assert.equal((await dari(s, "GET", "/api/pantau")).s, 401, "reset mencabut semua sesi");
  assert.equal((await api("POST", "/api/staf/masuk", {username: s.username, sandi: s.sandi}, ipBaru())).s, 401);
  const m = await api("POST", "/api/staf/masuk", {username: s.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200);
  assert.equal((await api("GET", "/api/pantau", undefined, {cookie: m.h.get("set-cookie").split(";")[0]})).s, 401, "sandi reset = wajib ganti lagi");
  const t = await bikin("Cabut Cepat", ["pusdalops"]);
  assert.equal((await api("POST", "/api/staf/admin/" + t.id, {aksi: "cabut"}, MOD2)).s, 403);
  assert.equal((await api("POST", "/api/staf/admin/" + t.id, {aksi: "cabut"}, ADMIN)).s, 200);
  assert.equal((await dari(t, "GET", "/api/pantau")).s, 401);
  assert.equal((await api("POST", "/api/staf/masuk", {username: t.username, sandi: t.sandi}, ipBaru())).s, 401);
  assert.equal((await api("POST", "/api/staf/admin/" + t.id, {aksi: "cabut"}, ADMIN)).s, 409);
  const kel = await api("POST", "/api/staf/keluar", {}, SA.hp); assert.equal(kel.s, 200);
  assert.equal((await dari(SA, "GET", "/api/pantau")).s, 401, "keluar menghapus sesi di D1");
  const m2 = await api("POST", "/api/staf/masuk", {username: SA.username, sandi: SA.sandi}, ipBaru()); assert.equal(m2.s, 200);
  SA.h = {cookie: m2.h.get("set-cookie").split(";")[0]}; SA.hp = {...SA.h, ...PB};
});

/* ================================================================ matriks peran x rute */
const P = {};
uji("matriks peran x rute: tiap peran hanya rute sahnya; rute lama tidak melonggar (token/gerbang tetap seperti semula)", async () => {
  for (const p of Object.keys(PERAN)) P[p] = await bikin("Staf " + p, [p]);
  await bersihSumber();
  await akunMenunggu({username: "akunmatriks1"}); const aid = await akunId("akunmatriks1"), uid = await usulan(aid);
  const pg = await panggilan({status: "baru"});
  const MAT = [   // [metode, jalur, body, peran yang BOLEH (200..299 atau 4xx non-izin selain 401/403), nama]
    ["GET", "/api/pantau", undefined, Object.keys(PERAN)],
    ["GET", "/api/instansi/admin/antrean", undefined, ["verifikator", "pusdalops"]],
    ["GET", "/api/instansi/admin/akun/" + aid, undefined, ["verifikator", "pusdalops"]],
    ["GET", "/api/instansi/admin/surat/" + aid, undefined, ["verifikator", "pusdalops"]],
    ["GET", "/api/instansi/admin/pantau", undefined, ["verifikator", "pusdalops"]],
    /* keputusan pemilik 21 Okt 2026: verifikator dan pusdalops (dalam wilayahnya) membuka rincian dan media tugas; peran lain tetap 403. Id tak ada = 404 (bukan 403) bagi yang berhak. */
    ["GET", "/api/instansi/admin/tugas/" + id16(), undefined, ["verifikator", "pusdalops"]],
    ["GET", "/api/instansi/admin/media/" + id16(), undefined, ["verifikator", "pusdalops", "analis_konsesi", "pimpinan"]],   // analis_konsesi dan pimpinan: baca bukti Gakkum saja
    ["GET", "/api/instansi/admin/thumb/" + id16(), undefined, ["verifikator", "pusdalops", "analis_konsesi", "pimpinan"]],
    ["GET", "/api/instansi/admin/usulan", undefined, ["analis_konsesi"]],
    ["POST", "/api/instansi/admin/usulan/" + uid, {aksi: "tolak", alasan: "uji"}, ["analis_konsesi"]],
    ["GET", "/api/posko/kontak", undefined, ["analis_konsesi"]],
    ["GET", "/api/posko/panggilan", undefined, ["analis_konsesi"]],
    ["POST", "/api/posko/panggilan/" + pg.id, {aksi: "abaikan"}, ["analis_konsesi"]],
  ];
  for (const [m, j, b, boleh] of MAT) for (const p of Object.keys(PERAN)) {
    const r = await dari(P[p], m, j, b), izin = boleh.includes(p);
    if (izin) assert.ok(![401, 403].includes(r.s), `${p} ${m} ${j} harus lolos, dapat ${r.s} ${r.t.slice(0, 80)}`);
    else assert.equal(r.s, 403, `${p} ${m} ${j} harus 403, dapat ${r.s}`);
  }
  /* wilayah: staf Kalteng membuka tugas Kalteng (200) tetapi tugas Kalbar 404 */
  { const kt = await bikin("Ver Kalteng", ["verifikator"], ["62"]), tK = await tugas({prov: "62"}), tB = await tugas({prov: "61", kab: "Kubu Raya"});
    assert.equal((await dari(kt, "GET", "/api/instansi/admin/tugas/" + tK)).s, 200); assert.equal((await dari(kt, "GET", "/api/instansi/admin/tugas/" + tB)).s, 404, "tugas provinsi lain: 404");
    assert.equal((await api("GET", "/api/instansi/admin/tugas/" + tB, undefined, ADMIN)).s, 200, "admin tetap boleh"); }
  /* rute yang TIDAK pernah terbuka bagi staf mana pun (moderator ke atas / Super Admin saja) */
  const TERLARANG = [["GET", "/api/instansi/admin/akun"], ["POST", "/api/instansi/admin/buat", {}], ["GET", "/api/posko/regu"],
    ["POST", "/api/posko/regu", {}], ["POST", "/api/posko/kontak/impor", {csv: "x"}], ["POST", "/api/posko/dummy", {aksi: "isi"}], ["POST", "/api/instansi/admin/dummy", {aksi: "isi"}], ["POST", "/api/pantau/dummy", {aksi: "isi"}],
    ["POST", "/api/staf/admin/buat", {}], ["GET", "/api/staf/admin/daftar"], ["POST", "/api/staf/admin/" + SA.id, {aksi: "cabut"}], ["GET", "/api/pengingat/admin"], ["GET", "/api/statistik"]];
  for (const [m, j, b] of TERLARANG) for (const p of Object.keys(PERAN)) assert.ok([401, 403].includes((await dari(P[p], m, j, b)).s), `${p} ${m} ${j} tidak boleh lolos`);
  /* aksi yang tidak diberikan peran: cabut dan reset akun instansi hanya moderator ke atas */
  for (const aksi of ["cabut", "reset"]) for (const p of ["verifikator", "pusdalops"]) assert.equal((await dari(P[p], "POST", "/api/instansi/admin/akun/" + aid, {aksi})).s, 403);
  assert.equal((await DB.prepare("SELECT status FROM instansi_akun WHERE id = ?").bind(aid).first()).status, "menunggu");
  /* tanpa sesi sama sekali */
  for (const [m, j, b] of MAT) assert.ok([401, 403].includes((await api(m, j, b, m === "POST" ? PB : {})).s), `anonim ${m} ${j}`);
  /* rute lama persis seperti semula: token moderator lolos, akun gerbang situs (AKUN_SITUS) tetap TIDAK di rute modOK */
  assert.equal((await api("GET", "/api/instansi/admin/antrean", undefined, MOD2)).s, 200);
  assert.equal((await api("GET", "/api/instansi/admin/antrean", undefined, GERBANG)).s, 403);
  assert.equal((await api("GET", "/api/posko/kontak", undefined, GERBANG)).s, 403);
  assert.equal((await api("GET", "/api/posko/panggilan", undefined, GERBANG)).s, 200, "adm lama: akun gerbang boleh baca panggilan, tak berubah");
  /* temuan keamanan 21 Okt 2026: antrean kerja, penugasan, dan tautan tagih berisi data pribadi; akun gerbang situs (AKUN_SITUS) bukan moderator, jadi 403 (bukan 401: dia memang masuk) */
  assert.equal((await api("GET", "/api/pantau", undefined, GERBANG)).s, 403, "Meja Pantau memakai modOK, bukan adminOK");
  assert.equal((await api("GET", "/api/pantau", undefined, MOD2)).s, 200);
  assert.equal((await api("POST", "/api/pantau/dummy", {aksi: "isi"}, MOD2)).s, 403);
  assert.equal((await api("POST", "/api/pantau/dummy", {aksi: "isi"}, GERBANG)).s, 403);
});
uji("kiriman lewat sesi staf wajib x-pb; pimpinan membaca saja (403 di tiap aksi tulis)", async () => {
  const pg = await panggilan({status: "baru"});
  assert.equal((await api("POST", "/api/posko/panggilan/" + pg.id, {aksi: "abaikan"}, P.analis_konsesi.h)).s, 403, "POST tanpa x-pb tidak dianggap sesi staf");
  assert.equal((await api("POST", "/api/pantau/butir", {id: "konsesi:x", aksi: "ambil"}, P.pusdalops.h)).s, 401);
  const r = await dari(P.pimpinan, "POST", "/api/pantau/butir", {id: "konsesi:x", aksi: "ambil"}); assert.equal(r.s, 403); assert.match(r.j.galat, /pimpinan hanya membaca/);
  assert.equal((await dari(P.pimpinan, "GET", "/api/pantau")).j.saya.baca_saja, true);
  assert.equal((await dari(P.koordalops, "GET", "/api/pantau")).j.saya.baca_saja, false);
});
uji("wilayah staf juga membatasi aksi tulis di rute lama (verifikator provinsi lain: 403/404)", async () => {
  await bersihSumber();
  await akunMenunggu({username: "akunwil62"}); await akunMenunggu({username: "akunwil11", cakupan: '["11"]', prov: "11", kunci_wilayah: "k11"});
  const v = await bikin("Verif Kalteng", ["verifikator"], ["62"]), a62 = await akunId("akunwil62"), a11 = await akunId("akunwil11");
  const antre = await dari(v, "GET", "/api/instansi/admin/antrean"); assert.deepEqual(antre.j.akun.map(a => a.id), [a62]);
  assert.equal((await dari(v, "GET", "/api/instansi/admin/akun/" + a11)).s, 404);
  assert.equal((await dari(v, "GET", "/api/instansi/admin/surat/" + a11)).s, 404);
  assert.equal((await dari(v, "POST", "/api/instansi/admin/akun/" + a11, {aksi: "tolak", dikirim: 1, alasan: "uji uji"})).s, 403);
  const ok = await dari(v, "POST", "/api/instansi/admin/akun/" + a62, {aksi: "tolak", dikirim: (await DB.prepare("SELECT dikirim FROM instansi_akun WHERE id = ?").bind(a62).first()).dikirim, alasan: "Surat tidak terbaca"});
  assert.equal(ok.s, 200, ok.t);
  const jj = await DB.prepare("SELECT oleh FROM instansi_jejak WHERE akun_id = ? AND aksi = 'tolak'").bind(a62).first(); assert.equal(jj.oleh, "staf:" + v.id, "pelaku staf tercatat di jejak instansi");
});

/* ================================================================ butir: muncul dan hilang */
uji("a. tugas api terlambat konfirmasi (> 6 jam) dan kabar (> 24 jam): muncul, id stabil, hilang saat kondisi berakhir; kambuh berid baru", async () => {
  await bersihSumber();
  const t1 = await tugas({dibuat: Date.now() - 8 * JAM}), t2 = await tugas({dibuat: Date.now() - 30 * JAM, konfirmasi_pada: Date.now() - 29 * JAM, isian_terakhir: Date.now() - 26 * JAM});
  const t3 = await tugas({dibuat: Date.now() - 2 * JAM}), t4 = await tugas({dibuat: Date.now() - 30 * JAM, konfirmasi_pada: Date.now() - 29 * JAM, isian_terakhir: Date.now() - 5 * JAM}), t5 = await tugas({dibuat: Date.now() - 9 * JAM, status: "padam"});
  const j = await butir();
  assert.deepEqual(ada(j, "api_konfirmasi").map(b => b.id), ["api-konf:" + t1]);
  assert.equal(ada(j, "api_kabar").length, 1); const kabar = ada(j, "api_kabar")[0];
  assert.match(kabar.id, new RegExp("^api-kabar:" + t2 + ":\\d+$"));
  assert.ok(kabar.terlambat && kabar.tenggat < Date.now() && kabar.prioritas >= 1 && kabar.tautan === "/admin/instansi" && kabar.prov === "62" && kabar.prov_nama === "Kalimantan Tengah");
  assert.ok(![t3, t4, t5].some(t => j.butir.some(b => b.id.includes(t))), "tidak terlambat / sudah padam tidak muncul");
  assert.equal((await butir()).butir.find(b => b.id === "api-konf:" + t1).id, "api-konf:" + t1, "id stabil antar baca");
  await DB.prepare("UPDATE tugas_api SET konfirmasi_pada = ?, isian_terakhir = ? WHERE id = ?").bind(Date.now() - JAM, Date.now() - JAM, t1).run();
  assert.equal(ada(await butir(), "api_konfirmasi").length, 0, "terkonfirmasi: hilang sendiri");
  await DB.prepare("UPDATE tugas_api SET status = 'padam' WHERE id = ?").bind(t2).run();
  assert.equal(ada(await butir(), "api_kabar").length, 0, "padam: hilang sendiri");
  await DB.prepare("UPDATE tugas_api SET status = 'buka', isian_terakhir = ? WHERE id = ?").bind(Date.now() - 27 * JAM, t2).run();
  const lagi = ada(await butir(), "api_kabar")[0]; assert.ok(lagi && lagi.id !== kabar.id, "kambuh sesudah kabar lain = butir baru");
});
uji("b. api di konsesi tanpa kontak PT: muncul per perusahaan dan hilang saat kontak ada", async () => {
  await bersihSumber();
  const a = await panggilan({perusahaan_id: "pt-tanpa-kontak", status: "baru", titik_n: 5}); await panggilan({perusahaan_id: "pt-tanpa-kontak", tanggal: "2000-01-01", status: "baru"});   // sangat lama: di luar jendela
  { const dp = Date.now() - 5 * JAM; await panggilan({perusahaan_id: "pt-selesai", status: "selesai", dipanggil_pada: dp, batas: dp + 2 * JAM, saluran: "wa"}); }
  let j = await butir(); const k = ada(j, "konsesi_tanpa_kontak");
  assert.deepEqual(k.map(b => b.id), ["konsesi:pt-tanpa-kontak:62"]); assert.match(k[0].judul, /5 titik api/);
  assert.equal(ada(j, "panggilan_baru").length, 0, "yang tak bisa dihubungi tidak dobel sebagai belum dihubungi");
  await kontakPT("pt-tanpa-kontak"); j = await butir();
  assert.equal(ada(j, "konsesi_tanpa_kontak").length, 0); assert.equal(ada(j, "panggilan_baru").length, 1, "kontak ada: kini bisa dihubungi");
  void a;
});
uji("c. panggilan belum dihubungi (baru) dan belum direspons (> 2 jam): muncul, hilang saat ditangani", async () => {
  await bersihSumber();
  await kontakPT("pt-c1"); await kontakPT("pt-c2"); await kontakPT("pt-c3");
  const baru = await panggilan({perusahaan_id: "pt-c1", status: "baru"});
  const dp = Date.now() - 3 * JAM, lambat = await panggilan({perusahaan_id: "pt-c2", status: "dipanggil", dipanggil_pada: dp, batas: dp + 2 * JAM, saluran: "wa"});
  const dp2 = Date.now() - 30 * MENIT; await panggilan({perusahaan_id: "pt-c3", status: "dipanggil", dipanggil_pada: dp2, batas: dp2 + 2 * JAM, saluran: "wa"});
  const j = await butir();
  assert.deepEqual(ada(j, "panggilan_baru").map(b => b.id), ["panggil-baru:" + baru.id]);
  assert.equal(ada(j, "panggilan_lambat").length, 1); assert.ok(ada(j, "panggilan_lambat")[0].id.startsWith("panggil-lambat:" + lambat.id + ":")); assert.equal(ada(j, "panggilan_lambat")[0].prioritas, 1);
  await DB.prepare("UPDATE panggilan SET status = 'direspons', direspons_pada = ? WHERE id = ?").bind(Date.now(), lambat.id).run();
  await DB.prepare("UPDATE panggilan SET status = 'dipanggil', dipanggil_pada = ?1, batas = ?1 + 7200000, saluran = 'wa' WHERE id = ?2").bind(Date.now(), baru.id).run();
  const k = await butir(); assert.equal(ada(k, "panggilan_baru").length, 0); assert.equal(ada(k, "panggilan_lambat").length, 0);
});
uji("d dan e. akun instansi menunggu validasi dan usulan kontak menunggu: muncul, hilang saat diputus", async () => {
  await bersihSumber();
  await akunMenunggu({username: "akund1"}); const aid = await akunId("akund1"), uid = await usulan(aid);
  let j = await butir(); assert.equal(ada(j, "akun_menunggu").length, 1); assert.match(ada(j, "akun_menunggu")[0].id, new RegExp("^akun:" + aid + ":\\d+$")); assert.equal(ada(j, "usulan_kontak")[0].id, "usulan:" + uid);
  await DB.prepare("UPDATE instansi_akun SET status = 'aktif' WHERE id = ?").bind(aid).run(); await DB.prepare("UPDATE usulan_kontak_pt SET status = 'diterima', diputus = ? WHERE id = ?").bind(Date.now(), uid).run();
  j = await butir(); assert.equal(ada(j, "akun_menunggu").length, 0); assert.equal(ada(j, "usulan_kontak").length, 0);
});
uji("f. pengait modul belum ada: jenisnya terdaftar tetapi kosong", async () => {
  const j = await butir();
  for (const k of ["laporan_harian", "omc_tanpa_hasil", "inventaris_lama"]) { assert.ok(k in j.jenis, k); assert.equal(ada(j, k).length, 0); }
});

/* ================================================================ penyaringan peran dan wilayah */
uji("peran dan wilayah menyaring; pimpinan dan koordalops melihat semua jenis; aksi di luar lingkup = 404", async () => {
  await bersihSumber();
  const a62 = await tugas({prov: "62", kab: "Kapuas"}), a11 = await tugas({prov: "11", kab: "Aceh Barat", lat: 4.4, lon: 96.1});
  await akunMenunggu({username: "akunsaring"}); await panggilan({perusahaan_id: "pt-saring", prov: "11", kab: "Aceh Barat"});
  const ids = j => j.butir.map(b => b.jenis).sort();
  const nas = await butir(P.koordalops.h), pimp = await butir(P.pimpinan.h), pus = await butir(P.pusdalops.h), ana = await butir(P.analis_konsesi.h), ver = await butir(P.verifikator.h), uda = await butir(P.udara.h);
  assert.deepEqual(ids(pimp), ids(nas)); assert.equal(nas.butir.length, 4);
  assert.deepEqual(ids(pus), ["akun_menunggu", "api_konfirmasi", "api_konfirmasi"], "pusdalops: api dan akun, bukan konsesi");
  assert.deepEqual(ids(ana), ["konsesi_tanpa_kontak"]); assert.deepEqual(ids(ver), ["akun_menunggu"]); assert.deepEqual(ids(uda), []);
  assert.ok(!("api_konfirmasi" in ana.jenis) && "konsesi_tanpa_kontak" in ana.jenis);
  const kalteng = await bikin("Pusdalops Kalteng", ["pusdalops"], ["62"]), aceh = await bikin("Pusdalops Aceh", ["pusdalops", "analis_konsesi"], ["11"]);
  const jk = await butir(kalteng.h), ja = await butir(aceh.h);
  assert.ok(jk.butir.every(b => b.provs.includes("62")) && jk.butir.some(b => b.id === "api-konf:" + a62) && !jk.butir.some(b => b.id === "api-konf:" + a11));
  assert.ok(ja.butir.every(b => b.provs.includes("11")) && ja.butir.some(b => b.id === "api-konf:" + a11) && ja.butir.some(b => b.jenis === "konsesi_tanpa_kontak"));
  assert.equal(jk.saya.wilayah[0], "62");
  /* aksi pada butir di luar wilayah/peran: 404 yang sama dengan butir yang tidak ada */
  assert.equal((await dari(kalteng, "POST", "/api/pantau/butir", {id: "api-konf:" + a11, aksi: "ambil"})).s, 404);
  assert.equal((await dari(P.analis_konsesi, "POST", "/api/pantau/butir", {id: "api-konf:" + a62, aksi: "ambil"})).s, 404);
  assert.equal((await dari(kalteng, "POST", "/api/pantau/butir", {id: "api-konf:tidak-ada-sama-sekali", aksi: "ambil"})).s, 404);
  assert.equal((await dari(kalteng, "GET", "/api/pantau/jejak?id=" + encodeURIComponent("api-konf:" + a11))).s, 404);
});
uji("privasi: pimpinan dan analis tidak menerima tautan tagih/nomor WA PIC; verifikator dan pusdalops menerima tagih bukan-dummy", async () => {
  await bersihSumber();
  await akunMenunggu({username: "akunpic"}); const aid = await akunId("akunpic");
  const t = await tugas({dibuat: Date.now() - 30 * JAM, konfirmasi_pada: Date.now() - 29 * JAM, isian_terakhir: Date.now() - 26 * JAM});
  await sisip("tugas_isian", {id: id16(), tugas_id: t, akun_id: aid, klien_id: "klien-pic-001", langkah: "konfirmasi", dibuat: Date.now() - 29 * JAM, lat: -2.5, lon: 113.2, waktu_gps: Date.now() - 29 * JAM, hasil: "api_ada", pic_nama: "Pak Joko", pic_jabatan: "Mandor", pic_wa: "628111222333", dummy: 0});
  const pus = await dari(P.pusdalops, "GET", "/api/pantau"), pimp = await dari(P.pimpinan, "GET", "/api/pantau"), ana = await dari(P.analis_konsesi, "GET", "/api/pantau"), adm = await ADM("/api/pantau"), gerb = await api("GET", "/api/pantau", undefined, GERBANG);
  const tg = pus.j.butir.find(b => b.jenis === "api_kabar").tagih; assert.ok(tg.length >= 1 && tg[0].tautan.startsWith("https://wa.me/628111222333?text="));
  assert.ok(adm.j.butir.find(b => b.jenis === "api_kabar").tagih.length >= 1);
  assert.equal(gerb.s, 403, "akun gerbang situs bukan moderator: ditolak sama sekali, jadi tanpa nomor maupun tautan tagih"); assert.ok(!gerb.t.includes("628111222333") && !gerb.t.includes("wa.me"));
  for (const r of [pimp, ana]) assert.ok(!r.t.includes("628111222333") && !r.t.includes("wa.me"), "nomor PIC tidak boleh bocor ke peran lain");
  assert.ok(!pus.t.includes("password") && !pus.t.includes("sandi_sha"));
});

/* ================================================================ penugasan, jejak, abaikan */
uji("penugasan: ambil, dipegang orang lain = 409, koordinator menugaskan; selesai/abaikan beralasan; jejak waktu dan pelaku; hilang bila kondisi berakhir", async () => {
  await bersihSumber();
  const A = await bikin("Ani Pusdalops", ["pusdalops"]), B = await bikin("Budi Pusdalops", ["pusdalops"]), K = P.koordalops, t = await tugas(), id = "api-konf:" + t;
  const kirim = (s, b) => dari(s, "POST", "/api/pantau/butir", b);
  assert.equal((await kirim(A, {id, aksi: "terbang"})).s, 400); assert.equal((await kirim(A, {id: "x", aksi: "ambil"})).s, 400);
  assert.equal((await kirim(A, {id, aksi: "ambil"})).s, 200);
  let b = (await butir(A.h)).butir[0]; assert.equal(b.status, "dikerjakan"); assert.deepEqual(b.ditugaskan_ke, {id: A.id, nama: A.nama});
  assert.equal((await butir(A.h)).ringkas.punyaku, 1); assert.equal((await butir(B.h)).ringkas.punyaku, 0);
  const rb = await kirim(B, {id, aksi: "ambil"}); assert.equal(rb.s, 409); assert.match(rb.j.galat, /sudah diambil Ani/);
  assert.equal((await kirim(B, {id, aksi: "selesai"})).s, 409); assert.equal((await kirim(B, {id, aksi: "abaikan", alasan: "uji uji"})).s, 409);
  assert.equal((await kirim(B, {id, aksi: "tugaskan", ke: B.id})).s, 403, "hanya koordinator yang menugaskan");
  assert.equal((await kirim(K, {id, aksi: "tugaskan", ke: "0".repeat(16)})).s, 400, "staf tujuan harus ada");
  assert.equal((await kirim(K, {id, aksi: "tugaskan", ke: B.id})).s, 200);
  assert.equal((await ADM("/api/pantau")).j.butir.find(x => x.id === id).ditugaskan_ke.id, B.id);
  assert.equal((await api("POST", "/api/pantau/butir", {id, aksi: "ambil"}, ADMIN)).s, 400, "admin tanpa akun staf tidak bisa 'ambil'");
  assert.equal((await api("POST", "/api/pantau/butir", {id, aksi: "tugaskan", ke: A.id}, ADMIN)).s, 200, "admin boleh menugaskan");
  assert.equal((await kirim(A, {id, aksi: "abaikan"})).s, 400, "abaikan wajib alasan"); assert.equal((await kirim(A, {id, aksi: "abaikan", alasan: "  "})).s, 400); assert.equal((await kirim(A, {id, aksi: "abaikan", alasan: "ab"})).s, 400);
  assert.equal((await kirim(A, {id, aksi: "abaikan", alasan: "x".repeat(301)})).s, 400);
  assert.equal(await n("pantau_tugas", "status = 'abaikan'"), 0, "penolakan tidak meninggalkan baris");
  assert.equal((await kirim(A, {id, aksi: "abaikan", alasan: "Sudah ditangani langsung lewat telepon Kasatgas"})).s, 200);
  b = (await butir(A.h)).butir.find(x => x.id === id); assert.equal(b.status, "abaikan"); assert.match(b.alasan, /telepon Kasatgas/);
  assert.equal((await butir(A.h)).ringkas.aktif, 0, "yang diabaikan tidak dihitung aktif, tetap terdaftar");
  assert.equal((await kirim(A, {id, aksi: "buka"})).s, 200); assert.equal((await butir(A.h)).butir[0].status, "baru");
  /* S10: butir berbasis kondisi TIDAK bisa ditandai selesai selama kondisinya berlaku (semua jenis butir berbasis kondisi); status dan jejak tidak berubah */
  const sel = await kirim(A, {id, aksi: "selesai", catatan: "Tim sudah di lokasi"}); assert.equal(sel.s, 409); assert.match(sel.j.galat, /berbasis kondisi dan hilang sendiri/);
  b = (await butir(A.h)).butir[0]; assert.equal(b.status, "baru", "tetap baru: selesai ditolak");
  assert.equal((await kirim(A, {id: "x".repeat(8), aksi: "selesai"})).s, 404, "selesai pada butir yang tak ada tetap 404, bukan 200");
  const jj = await dari(A, "GET", "/api/pantau/jejak?id=" + encodeURIComponent(id)); assert.equal(jj.s, 200);
  assert.deepEqual(jj.j.jejak.map(x => x.aksi).reverse(), ["ambil", "tugaskan", "tugaskan", "abaikan", "buka"]);
  assert.ok(jj.j.jejak.every(x => x.waktu > 0 && x.oleh_nama) && jj.j.jejak.at(-1).oleh_nama === "Ani Pusdalops" && jj.j.jejak.some(x => x.oleh_nama === "Admin"), "waktu dan pelaku tercatat");
  const baris = await DB.prepare("SELECT * FROM pantau_jejak WHERE obyek = ? ORDER BY id").bind("butir:" + id).all(); assert.equal(baris.results[0].oleh, "staf:" + A.id);
  /* kondisi berakhir: butir hilang walau berstatus selesai; aksi atasnya 404 */
  await DB.prepare("UPDATE tugas_api SET konfirmasi_pada = ?, isian_terakhir = ? WHERE id = ?").bind(Date.now(), Date.now(), t).run();
  assert.equal((await butir(A.h)).butir.length, 0); assert.equal((await kirim(A, {id, aksi: "buka"})).s, 404);
});
uji("retensi: penugasan lama dibuang cron, jejak tidak; penugasan segar utuh", async () => {
  await DB.prepare("INSERT INTO pantau_tugas (butir_id, jenis, status, dibuat, diubah, oleh) VALUES ('lama-sekali-1', 'api_kabar', 'selesai', 1, ?, 'tes'), ('baru-sekali-1', 'api_kabar', 'selesai', 1, ?, 'tes')").bind(Date.now() - 130 * HARI, Date.now() - HARI).run();
  const jejak0 = await n("pantau_jejak");
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, 2)").bind("b".repeat(64), SA.id).run();
  assert.equal((await bersihkanStaf({DB}, Date.now())).sesi, 1, "sesi staf kedaluwarsa dibuang"); assert.equal(await n("staf_sesi", "token_sha = '" + "b".repeat(64) + "'"), 0);
  const r = await bersihkanPantau({DB}, Date.now()); assert.equal(r.penugasan, 1);
  assert.equal(await n("pantau_tugas", "butir_id = 'lama-sekali-1'"), 0); assert.equal(await n("pantau_tugas", "butir_id = 'baru-sekali-1'"), 1); assert.equal(await n("pantau_jejak"), jejak0);
  await DB.prepare("DELETE FROM pantau_tugas WHERE butir_id = 'baru-sekali-1'").run();
});

/* ================================================================ dummy */
uji("dummy: hanya Super Admin; menumbuhkan seluruh rantai (tiap jenis butir terisi), WA tak teralokasi; staf asli tak melihatnya; hapus mengembalikan semula", async () => {
  await bersihSumber();
  const TAB = ["staf", "pantau_tugas", "pantau_jejak", "panggilan", "kontak_pt", "tugas_api", "instansi_akun", "usulan_kontak_pt", "tugas_isian"], hitung = async () => Object.fromEntries(await Promise.all(TAB.map(async t => [t, await n(t)])));
  const sebelum = await hitung();
  for (const h of [MOD2, GERBANG, {}]) assert.equal((await api("POST", "/api/pantau/dummy", {aksi: "isi"}, h)).s, 403);
  assert.equal((await dari(P.koordalops, "POST", "/api/pantau/dummy", {aksi: "isi"})).s, 403);
  assert.equal((await api("POST", "/api/pantau/dummy", {aksi: "ngawur"}, ADMIN)).s, 400);
  assert.deepEqual(await hitung(), sebelum, "penolakan tidak menulis apa pun");
  const r = await api("POST", "/api/pantau/dummy", {aksi: "isi"}, ADMIN); assert.equal(r.s, 201, r.t); assert.equal(r.j.staf, 7); assert.ok(r.j.penugasan >= 4);
  const j = await butir();
  for (const k of ["api_konfirmasi", "api_kabar", "konsesi_tanpa_kontak", "panggilan_baru", "panggilan_lambat", "akun_menunggu", "usulan_kontak"]) assert.ok(ada(j, k).some(b => b.dummy), "dummy mengisi " + k);
  assert.ok(j.butir.every(b => b.dummy) && j.butir.some(b => b.status === "dikerjakan" && b.ditugaskan_ke) && j.butir.some(b => b.status === "abaikan" && b.alasan), "ember penugasan terisi");
  assert.ok(j.butir.filter(b => b.tagih).every(b => b.tagih.length === 0), "dummy tidak pernah diberi tautan tagih");
  const staf = (await DB.prepare("SELECT username, wa, wajib_ganti FROM staf WHERE dummy = 1").all()).results;
  assert.equal(staf.length, 7); assert.ok(staf.every(s => s.wa.startsWith("62000000") && s.wajib_ganti === 0));
  assert.equal((await api("POST", "/api/staf/masuk", {username: "dummystaf1", sandi: ""}, ipBaru())).s, 401, "sandi dummy acak tak pernah ditampilkan: tak bisa masuk");
  assert.equal((await api("POST", "/api/pantau/dummy", {aksi: "isi"}, ADMIN)).s, 409, "kedua kali ditolak sopan");
  assert.equal((await butir(P.koordalops.h)).butir.length, 0, "staf asli tidak melihat butir dummy");
  assert.equal((await butir(P.pimpinan.h)).butir.length, 0);
  const lihat = await api("GET", "/api/staf/admin/daftar", undefined, ADMIN); assert.ok(lihat.j.staf.filter(s => s.dummy).length === 7);
  const h = await api("POST", "/api/pantau/dummy", {aksi: "hapus"}, ADMIN); assert.equal(h.s, 200, h.t);
  assert.deepEqual(await hitung(), sebelum, "hapus mengembalikan jumlah baris SEMULA di semua tabel rantai");
  assert.equal((await butir()).butir.length, 0);
});

/* ================================================================ halaman dan gaya */
uji("halaman /admin/pantau: kerangka tanpa data dengan CSP ketat; berkas klien ada; tanpa pemisah titik tengah", async () => {
  const r = await U.mf.dispatchFetch("http://bnpb.lokal/admin/pantau");
  assert.equal(r.status, 200); const html = await r.text();
  assert.match(r.headers.get("content-security-policy"), /script-src 'self'/); assert.match(r.headers.get("content-security-policy"), /frame-ancestors 'none'/); assert.equal(r.headers.get("cache-control"), "no-store");
  assert.ok(html.includes("/admin/pantau.js") && html.includes("/admin/pantau.css") && html.includes("/admin/bersama.js") && html.includes('id="aksiJudul"'));
  assert.ok(!/<script>[^<]/.test(html) && !/ style=/.test(html), "tanpa skrip/gaya inline");
  assert.ok(!html.includes("628") && !html.includes("sandi_sha"));
  for (const f of ["public/admin/pantau.js", "public/admin/pantau.css", "src/pantau.js", "src/staf.js"]) { assert.ok(existsSync(path.join(AKAR, f)), f); assert.ok(!teks(f).includes(" · "), `${f}: tanpa pemisah titik tengah`); }
  const js = teks("public/admin/pantau.js");
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(js), "klien memakai textContent saja");
  assert.ok(js.includes("requestAnimationFrame") && js.includes("POTONG"), "INP: daftar berat ditunda dan dipotong");
  /* S10: tanpa tombol Selesai dan tanpa prompt(); alasan abaikan lewat form di kartu; penjelasan di layar */
  assert.ok(!/\bprompt\(/.test(js), "tanpa prompt()");
  assert.ok(!/"data-aksi": "selesai"/.test(js), "tanpa tombol Selesai"); assert.ok(js.includes("data-alasan-form") && js.includes("tidak ada tombol Selesai"), "form alasan inline dan penjelasan");
});

/* ================================================================ tanpa migrasi */
uji("503 sopan bila 0030 belum diterapkan; rute lama tetap jalan dan sesi staf tanpa tabel tidak melonggarkan apa pun", async () => {
  const V = await siapkan("uji-pantau-503", {r2: true});
  for (const t of ["pantau_jejak", "pantau_tugas", "staf_sesi", "staf"]) await V.DB.prepare(`DROP TABLE ${t}`).run();
  for (const [m, j, b] of [["GET", "/api/pantau"], ["POST", "/api/pantau/butir", {id: "api-konf:x", aksi: "ambil"}], ["POST", "/api/staf/masuk", {username: "abcdef", sandi: "x"}], ["GET", "/api/staf/admin/daftar"],
    ["POST", "/api/staf/admin/buat", {nama: "Uji Tanpa Migrasi", nip: "198001010099", unit: "BNPB", email: "u@bnpb.go.id", wa: "081234567890", peran: ["pimpinan"]}], ["POST", "/api/pantau/dummy", {aksi: "isi"}]]) {
    const r = await V.api(m, j, b, ADMIN); assert.equal(r.s, 503, `${m} ${j}: ${r.t.slice(0, 100)}`); assert.match(r.j.galat, /migrasi 0030/);
  }
  const palsu = {cookie: "sesi_staf=" + "a".repeat(64), "x-pb": "1"};
  assert.equal((await V.api("GET", "/api/instansi/admin/antrean", undefined, palsu)).s, 403, "cookie staf tanpa tabel: 403 seperti semula, bukan 500");
  assert.equal((await V.api("GET", "/api/instansi/admin/antrean", undefined, MOD2)).s, 200, "rute lama utuh");
  assert.equal((await V.api("GET", "/api/posko/kontak", undefined, MOD2)).s, 200);
  assert.equal((await V.api("GET", "/admin/pantau")).s, 200, "kerangka halaman tidak butuh tabel");
  assert.deepEqual(await bersihkanPantau({DB: V.DB}, Date.now()), {lewat: "migrasi 0030 belum diterapkan"});
});

/* ================================================================ L1: butir cek_ulang_jatuh_tempo (cek ulang lapangan gambut H+1/H+3/H+7) */
uji("L1: butir cek_ulang_jatuh_tempo: tugas padam di gambut (atau lahan tak diketahui) yang jadwal cek ulangnya lewat; hilang saat ada cek ulang; mineral, belum jatuh tempo, dan butir muncul lagi tidak ikut", async () => {
  await bersihSumber();
  const now = Date.now(), padam = (jamLalu, o = {}) => tugas({status: "padam", padam_verif: "padam_dilaporkan", padam_pada: now - jamLalu * JAM, verif_pada: now - jamLalu * JAM, konfirmasi_pada: now - (jamLalu + 1) * JAM, isian_terakhir: now - jamLalu * JAM, ...o});
  const telat = await padam(30), belum = await padam(10), lama = await padam(80), cek = await padam(30, {cek_ulang_pada: now - 2 * JAM});
  let j = await butir(), b = ada(j, "cek_ulang_jatuh_tempo");
  assert.equal(JENIS.cek_ulang_jatuh_tempo.peran[0], "pusdalops"); assert.ok(j.jenis.cek_ulang_jatuh_tempo);
  assert.deepEqual(b.map(x => x.id.split(":")[1]).sort(), [telat, lama].sort(), "H+1 lewat (30 jam) dan H+3 lewat (80 jam); 10 jam belum; yang sudah dicek ulang tidak");
  const bl = b.find(x => x.id.includes(lama)); assert.match(bl.id, /:1$/, "80 jam tanpa kunjungan sama sekali: jadwal paling awal yang lewat dulu"); assert.match(bl.judul, /Cek ulang H\+1 di Baamang, Kotawaringin Timur belum ada/); assert.equal(bl.tautan, "/admin/instansi"); assert.equal(bl.terlambat, true);
  /* lahan mineral teramati = bukan gambut: tanpa butir */
  await akunMenunggu();
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, kendala, bantuan, status_api, lahan_teramati) SELECT ?, ?, id, ?, 'tindakan', ?, 'Uji', '[]', '[]', 'bara', 'mineral' FROM instansi_akun LIMIT 1")
    .bind("2".repeat(16), telat, "uji-mineral-pantau", now - 40 * JAM).run();
  assert.equal((await DB.prepare("SELECT count(*) n FROM tugas_isian WHERE tugas_id = ?").bind(telat).first()).n, 1);
  assert.ok(!ada(await butir(), "cek_ulang_jatuh_tempo").some(x => x.id.includes(telat)), "mineral teramati: bukan gambut, tanpa butir");
  /* kunjungan berfoto sesudah padam menghapus butir; peran lain tidak melihat jenis ini */
  assert.equal(ada(await butir(), "cek_ulang_jatuh_tempo").some(x => x.id.includes(lama)), true);
  await DB.prepare("UPDATE tugas_api SET cek_ulang_pada = ? WHERE id = ?").bind(now - JAM, lama).run();
  assert.equal(ada(await butir(), "cek_ulang_jatuh_tempo").some(x => x.id.includes(lama) && x.id.endsWith(":1")), false, "H+1 terpenuhi; H+3 (80 jam) lewat jadi butir baru");
  assert.equal(ada(await butir(), "cek_ulang_jatuh_tempo").filter(x => x.id.includes(lama)).map(x => x.id.split(":")[3]).join(), "3");
  await bersihSumber();
});

/* ================================================================ L3 pantau: alarm keselamatan regu dari src/penugasan.js */
uji("L3 pantau: penugasan_darurat muncul di Meja Pantau sebagai butir darurat, prioritas 0 di paling atas; jenis baru terdaftar; staf tanpa peran tidak melihatnya", async () => {
  await bersihSumber();
  const now = Date.now(), tid = await tugas({status: "buka"}), akun = id16();
  await akunMenunggu({id: akun});
  const pid = id16();
  await sisip("penugasan", {id: pid, tugas_id: tid, akun_id: akun, nama: "Regu Alfa", peran: "ketua_regu", orang: 4, token_sha: "a".repeat(63) + "1", status: "aktif", dibuat: now - 3 * JAM, kedaluwarsa: now + 5 * JAM, berangkat_pada: now - 2 * JAM, dummy: 0});
  await sisip("penugasan_darurat", {penugasan_id: pid, jenis: "terkepung_api", lat: -2.5, lon: 113.2, pada: now - 5 * MENIT});
  await tugas({status: "buka", konfirmasi_pada: null, dibuat: now - 30 * JAM});   // api_konfirmasi terlambat, prioritas 1
  const j = await butir(), d = ada(j, "darurat");
  for (const k of ["darurat", "regu_sunyi", "angin_ke_regu", "regu_rotasi"]) { assert.ok(JENIS[k], k); assert.ok(j.jenis[k], "dikirim ke klien: " + k); assert.deepEqual(JENIS[k].peran, ["pusdalops"]); }
  assert.equal(d.length, 1); assert.match(d[0].judul, /DARURAT terkepung api: Regu Alfa/); assert.equal(d[0].prioritas, 0); assert.deepEqual(d[0].provs, ["62"]);
  assert.equal(j.butir[0].jenis, "darurat", "darurat paling atas, di atas butir prioritas 1");
  assert.ok(ada(j, "regu_sunyi").length === 1, "posisi tak pernah terkirim sejak berangkat 2 jam lalu: regu sunyi");
  await DB.prepare("DELETE FROM penugasan_darurat").run(); await DB.prepare("DELETE FROM penugasan WHERE id = ?").bind(pid).run();
  assert.equal(ada(await butir(), "darurat").length, 0, "kondisinya hilang: butir hilang sendiri");
  await bersihSumber();
});
