/* Log tindakan per profil, retensi, dan gerbang pembungkus rute untuk akun BPBD dengan profil PIC (paket data/kajian-bnpb/profil-bpbd/, RENCANA-UJI UP-19, UP-20, UP-28, UP-32).
   Worker + D1 sungguhan lewat Miniflare (tests/warga/_bnpb.mjs). Jalankan: node --test tests/warga/profil_log.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import {profilAktif, PROFIL_KUNCI} from "./_profil.mjs";
import "../../src/worker.js";
import {RUTE_INSTANSI, bersihkanInstansi} from "../../src/instansi.js";

const uji = berantai();
const U = await siapkan("uji-profil-log", {r2: true, ikat: {PROFIL_KUNCI}}), {api, DB, n} = U;
const ASAL = "http://bnpb.lokal", kini = Date.now(), PB = {"x-pb": "1", origin: ASAL};
const HARI = 864e5, SANDI_UJI = "SandiRahasiaUji99", id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
let nu = 0;
async function akun(jenis = "pemprov", prov = "13") {
  nu++; const id = String(nu).padStart(16, "0"), garam = "g".repeat(32), tok = (String(nu).padStart(2, "0") + "7c").repeat(32).slice(0, 64);
  await DB.batch([DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
      VALUES (?, ?, ?, 'prov', 'Wilayah uji', ?, ?, ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`).bind(id, "logprofil" + nu, jenis, "k" + nu, JSON.stringify([prov]), prov, garam, sha256(garam + SANDI_UJI), `l${nu}@b.id`, `6281200200${String(nu).padStart(3, "0")}`, kini),
    DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(tok), id, kini, kini + 36e5)]);
  return {id, cookie: `sesi_instansi=${tok}`};
}
const gabung = (a, p) => ({cookie: [a.cookie, p?.cookie].filter(Boolean).join("; "), ...PB});

uji("UP-19 skenario penuh: log memuat id profil yang benar untuk pin_ok, pin_salah, kerja, keluar, ganti_profil; tanpa PIN, sandi, atau isi badan", async () => {
  const a = await akun(), p = await profilAktif(DB, a.id, {nama: "Rina Putri"}), q = await profilAktif(DB, a.id, {baru: true, nama: "Budi"});
  const salah = await api("POST", `/api/instansi/profil/pin/${p.id}`, {pin: "100234"}, {...gabung(a), "cf-connecting-ip": "203.0.113.5"}); assert.equal(salah.s, 401);
  const ok = await api("POST", `/api/instansi/profil/pin/${p.id}`, {pin: p.pin}, {...gabung(a), "cf-connecting-ip": "203.0.113.6"}); assert.equal(ok.s, 200, ok.t);
  const token = /sesi_profil=([0-9a-f]{64})/.exec(ok.h.get("set-cookie"))?.[1]; assert.ok(token);
  const dalam = {cookie: `${a.cookie}; sesi_profil=${token}`, ...PB};
  const k = await api("POST", "/api/instansi/kontak", {nama_pt: "PT Rahasia Uji", wa: "081234567891"}, dalam); assert.equal(k.s, 201, k.t);
  assert.equal((await api("GET", "/api/instansi/tugas", undefined, dalam)).s, 200, "GET tidak dicatat");
  assert.equal((await api("POST", "/api/instansi/profil/keluar", {}, dalam)).s, 200);
  const pin2 = await api("POST", `/api/instansi/profil/pin/${q.id}`, {pin: q.pin}, {...gabung(a), "cf-connecting-ip": "203.0.113.7"}); assert.equal(pin2.s, 200);
  const t2 = /sesi_profil=([0-9a-f]{64})/.exec(pin2.h.get("set-cookie"))[1], dalam2 = {cookie: `${a.cookie}; sesi_profil=${t2}`, ...PB};
  const l = await api("GET", "/api/instansi/profil/log", undefined, dalam2); assert.equal(l.s, 200, l.t);
  assert.ok(l.j.log.some(x => x.jenis === "kerja" && x.profil === "Rina Putri"), "PIC melihat log lembaganya dengan nama profil");
  assert.equal((await api("GET", "/api/instansi/profil/log", undefined, {cookie: `${a.cookie}; sesi_profil=${token}`})).s, 401, "sesi profil yang sudah keluar");
  assert.equal((await api("POST", "/api/instansi/keluar", {}, dalam2)).s, 200);
  const log = (await DB.prepare("SELECT jenis, profil_id, rute, objek, oleh, ip FROM instansi_profil_log WHERE akun_id = ? ORDER BY id").bind(a.id).all()).results;
  assert.deepEqual(log.map(x => [x.jenis, x.profil_id]), [["pin_salah", p.id], ["pin_ok", p.id], ["kerja", p.id], ["ganti_profil", p.id], ["pin_ok", q.id], ["keluar", q.id]], JSON.stringify(log));
  const kerja = log.find(x => x.jenis === "kerja"); assert.equal(kerja.rute, "POST /api/instansi/kontak"); assert.equal(kerja.objek, null);
  assert.ok(log.every(x => x.ip === null || x.ip.length === 12), "ip 12 karakter pertama hash");
  const semua = JSON.stringify((await DB.prepare("SELECT * FROM instansi_profil_log").all()).results);
  for (const rahasia of [p.pin, q.pin, "100234", SANDI_UJI, token, "PT Rahasia Uji", "081234567891"]) assert.ok(!semua.includes(rahasia), `log tidak memuat ${rahasia.slice(0, 6)}...`);
  const b = await akun("pemprov", "14"), pb = await profilAktif(DB, b.id), lb = await api("GET", "/api/instansi/profil/log", undefined, {cookie: `${b.cookie}; ${pb.cookie}`});
  assert.ok(!JSON.stringify(lb.j).includes(p.id), "log lembaga lain tidak terlihat");
});

uji("UP-20 log hanya bisa ditambah: UPDATE ditolak, DELETE yang lebih muda dari 730 hari ditolak, yang berumur tiga tahun boleh; bersihkanInstansi memangkas yang tua saja", async () => {
  const a = await akun("pemprov", "15"), tua = kini - 1100 * HARI, muda = kini - 100 * HARI;
  const sisip = (waktu, jenis = "masuk") => DB.prepare("INSERT INTO instansi_profil_log (waktu, akun_id, jenis) VALUES (?, ?, ?)").bind(waktu, a.id, jenis).run();
  await sisip(tua); await sisip(tua + 1); await sisip(muda); await sisip(kini);
  await assert.rejects(DB.prepare("UPDATE instansi_profil_log SET jenis = 'keluar' WHERE akun_id = ?").bind(a.id).run(), /hanya bisa ditambah/);
  await assert.rejects(DB.prepare("DELETE FROM instansi_profil_log WHERE akun_id = ? AND waktu = ?").bind(a.id, muda).run(), /disimpan 2 tahun/);
  await assert.rejects(DB.prepare("DELETE FROM instansi_profil_log WHERE akun_id = ?").bind(a.id).run(), /disimpan 2 tahun/, "campuran muda dan tua: seluruh pernyataan gagal");
  assert.equal(await n("instansi_profil_log", `akun_id = '${a.id}'`), 4);
  assert.equal((await DB.prepare("DELETE FROM instansi_profil_log WHERE akun_id = ? AND waktu = ?").bind(a.id, tua).run()).meta.changes, 1, "berumur tiga tahun boleh dihapus");
  const hasil = await bersihkanInstansi({DB, MEDIA: undefined}, Date.now()); assert.equal(hasil.profil.log, 1, "satu baris tua lain dipangkas");
  assert.equal(await n("instansi_profil_log", `akun_id = '${a.id}'`), 2, "yang muda dibiarkan");
});

uji("UP-32 pembungkus: tiap POST /api/instansi non-admin tanpa x-pb ditolak 403; sesi profil wajib ganti PIN ditolak di semua rute API kecuali ganti PIN, keluar, dan daftar profil", async () => {
  const kunci = Object.keys(RUTE_INSTANSI), post = kunci.filter(k => k.startsWith("POST /api/instansi/") && !k.includes("/admin/")), baru = kunci.filter(k => /^(GET|POST) \/api\/instansi\//.test(k) && !k.includes("/admin/"));
  for (const k of ["POST /api/instansi/profil", "POST /api/instansi/profil/:id", "POST /api/instansi/profil/pin/:id", "POST /api/instansi/profil/gantipin/:id", "POST /api/instansi/profil/keluar", "POST /api/instansi/kirim", "POST /api/instansi/profil/foto/:id"])
    assert.ok(post.includes(k), `${k} terdaftar lewat RUTE_INSTANSI (pembungkus)`);
  const a = await akun("pemkab", "16"), p = await profilAktif(DB, a.id, {wajibGanti: 1});
  const jalur = k => k.split(" ")[1].replace(":id", id16());
  for (const k of post) {
    const r = await api("POST", jalur(k), {}, {cookie: `${a.cookie}; ${p.cookie}`, origin: ASAL});
    assert.equal(r.s, 403, k); assert.match(r.j?.galat ?? r.t, /x-pb/, k);
  }
  const BOLEH = new Set(["POST /api/instansi/profil/gantipin/:id", "POST /api/instansi/profil/keluar", "GET /api/instansi/profil"]);
  for (const k of baru.filter(k => !BOLEH.has(k))) {
    const r = await api(k.split(" ")[0], jalur(k), k.startsWith("POST") ? {} : undefined, {cookie: `${a.cookie}; ${p.cookie}`, ...PB});
    assert.equal(r.s, 403, k); assert.equal(r.j?.pin_wajib_ganti, true, `${k}: ${r.t.slice(0, 120)}`);
  }
  assert.equal((await api("GET", "/api/instansi/profil", undefined, {cookie: `${a.cookie}; ${p.cookie}`})).s, 200);
  const sukses = await api("GET", "/instansi", undefined, {cookie: `${a.cookie}; ${p.cookie}`}); assert.equal(sukses.s, 200, "halaman /instansi tetap terbuka supaya layar ganti PIN tampil");
});
