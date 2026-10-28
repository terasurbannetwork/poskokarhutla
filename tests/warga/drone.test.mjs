/* Halaman Atur drone gambut (/admin/drone, src/drone.js): siapa boleh membuka, CSP peta, dan arah tamu. Worker utuh di workerd + D1 lokal.
   Jalankan: node --test tests/warga/drone.test.mjs */
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {siapkan, berantai, ADMIN, GERBANG, sha256} from "./_bnpb.mjs";

const uji = berantai(), PB = {"x-pb": "1"};
const U = await siapkan("uji-drone"), {api} = U;
const man = async (j, h = {}) => { const r = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {headers: h, redirect: "manual"}); return {s: r.status, h: r.headers, t: await r.text()}; };
let ip = 0;
const staf = async peran => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf Drone", nip: `1981${++ip}0012005`, unit: "Pusdalops BNPB", email: `d${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {cookie};
};
let nomor = 0;
const instansi = async status => {
  const id = randomBytes(8).toString("hex"), token = randomBytes(32).toString("hex"), kini = Date.now();
  await U.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, 'pemkab', 'kab', 'pemkab Pulang Pisau', ?, ?, '62', 'Pulang Pisau', ?, ?, ?, 'Budi', '198001012005011001', 'Kepala', 'BPBD', 'budi@x.go.id', '6281234567890', 1, 1, 0, ?)`)
    .bind(id, "drone" + (++nomor), `62|Pulang Pisau|d${nomor}`, JSON.stringify(["62"]), "g".repeat(32), "a".repeat(64), status, kini).run();
  await U.DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(token), id, kini, kini + 86400000).run();
  return {cookie: `sesi_instansi=${token}`};
};
const halamanOk = (r, sup) => {
  assert.equal(r.s, 200, r.t.slice(0, 200));
  assert.match(r.t, /<h1>Atur drone gambut<\/h1>/);
  assert.match(r.t, new RegExp(`data-super="${sup}"`));
  assert.match(r.h.get("content-security-policy"), /img-src 'self' data: blob: https:\/\/\*\.openfreemap\.org/, "peta dasar openfreemap diizinkan CSP");
  assert.match(r.h.get("content-security-policy"), /script-src 'self'(;|$)/, "skrip hanya dari situs sendiri (MapLibre dari /vendor)");
  assert.equal(r.h.get("cache-control"), "private, no-store");
  for (const s of ["/vendor/maplibre/maplibre-gl.js", "/laporan_koordalops.js", "/admin/drone_rute.js", "/admin/drone.js"]) assert.ok(r.t.includes(`src="${s}`), s);
};

uji("admin moderator, staf peran apa pun, dan akun instansi aktif membuka /admin/drone", async () => {
  halamanOk(await man("/admin/drone?k=K0029", ADMIN), 1);
  for (const p of [["tmc"], ["pimpinan"], ["verifikator"]]) halamanOk(await man("/admin/drone", await staf(p)), 0);
  halamanOk(await man("/admin/drone", await instansi("aktif")), 0);
});

uji("tamu ke Meja Pantau dengan ?ke= kembali ke cluster; akun gerbang dan instansi belum aktif ditolak", async () => {
  const t = await man("/admin/drone?k=K0029");
  assert.equal(t.s, 303); assert.equal(t.h.get("location"), "/admin/pantau?ke=" + encodeURIComponent("/admin/drone?k=K0029"));
  assert.equal((await man("/admin/drone", GERBANG)).s, 403, "akun gerbang situs saja bukan staf/instansi");
  assert.equal((await man("/admin/drone", await instansi("menunggu"))).s, 303, "instansi belum aktif diperlakukan seperti tamu");
});
