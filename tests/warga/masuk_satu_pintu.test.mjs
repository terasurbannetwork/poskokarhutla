/* Satu pintu masuk (pemilik 24 Nov 2026: "ga ada admin ga ada instansi, semuanya masuk dari satu tempat"):
   form /admin/masuk juga menerima akun instansi (BPBD, Polri, TNI) sesudah akun admin, pemirsa, dan staf gagal.
   Worker utuh di workerd + D1 sungguhan (TEST.md: tanpa mock). Jalankan: node --test tests/warga/masuk_satu_pintu.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";

const uji = berantai();
const {DB, mf} = await siapkan("uji-satu-pintu");
let ipN = 0;
const masuk = (user, sandi, ke = "") => mf.dispatchFetch("https://centurisk97.id/admin/masuk" + (ke ? "?ke=" + encodeURIComponent(ke) : ""), {
  method: "POST", redirect: "manual", body: new URLSearchParams({email: user, sandi}).toString(),
  headers: {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id", "cf-connecting-ip": `198.51.100.${++ipN % 250}`}});
const SANDI = "SandiUji23456789";
const buat = async (username, status = "belum_klaim") => {   // aktif butuh data verifikasi; masuk berlaku untuk status apa pun selain dicabut
  const garam = "b".repeat(32);
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, 'polda', 'prov', 'Polda Uji', ?, '["13"]', '13', NULL, ?, ?, ?, 0, 0, 0, ?)`).bind(username.padEnd(16, "0").slice(0, 16), username, "kw-" + username, garam, sha256(garam + SANDI), status, Date.now()).run();
};

uji("satu pintu: akun instansi masuk lewat /admin/masuk dan diarahkan ke /instansi dengan sesi instansi", async () => {
  await buat("poldasatupintu");
  const r = await masuk("PoldaSatuPintu", SANDI);
  assert.equal(r.status, 303, await r.text());
  assert.equal(r.headers.get("location"), "/instansi");
  const kuki = r.headers.getSetCookie();
  assert.ok(kuki.some(c => /^sesi_instansi=[0-9a-f]{64}; Path=\/instansi;/.test(c)), "cookie sesi instansi untuk /instansi");
  assert.ok(kuki.some(c => /^sesi_instansi=[0-9a-f]{64}; Path=\/api\/instansi;/.test(c)), "cookie sesi instansi untuk /api/instansi");
  const tok = kuki.find(c => c.startsWith("sesi_instansi=")).split(";")[0];
  const saya = await mf.dispatchFetch("https://centurisk97.id/api/instansi/saya", {headers: {cookie: tok, "x-pb": "1"}});
  assert.equal(saya.status, 200, "sesi dari pintu tunggal dipakai rute instansi");
});

uji("satu pintu: ?ke= di dalam /instansi dihormati, ?ke= di luar /instansi diabaikan", async () => {
  assert.equal((await masuk("poldasatupintu", SANDI, "/instansi?tab=peta")).headers.get("location"), "/instansi?tab=peta");
  assert.equal((await masuk("poldasatupintu", SANDI, "/admin/statistik")).headers.get("location"), "/instansi");
});

uji("satu pintu: sandi salah dan akun dicabut tetap 401 dengan pesan yang sama", async () => {
  await buat("poldadicabut1", "dicabut");
  for (const [u, s] of [["poldasatupintu", "salah-sekali-123"], ["poldadicabut1", SANDI], ["tidakada99", SANDI]]) {
    const r = await masuk(u, s); assert.equal(r.status, 401, u);
    assert.match(await r.text(), /Username atau kata sandi salah/);
  }
});
