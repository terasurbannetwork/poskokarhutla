/* Pemirsa membaca /api/monitor (karhutla dan banjir) dan ringkasan publik /api/pantau/ringkas (src/monitor.js, migrations/0077_pemirsa_monitor.sql).
   Worker utuh di workerd + D1 sungguhan. Jalankan: node --test tests/warga/monitor_pemirsa.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import "../../src/worker.js";

const JAM = 3600e3, PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, uji = berantai();
const U = await siapkan("uji-monitor-pemirsa", {ikat: {WA_NOMOR: "0812-3456-7890"}}), {DB, api, mf} = U;
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
let ipN = 0;
const masukPemirsa = async tab => {
  const r = await api("POST", "/api/pemirsa/admin/buat", {nama: "Dir Dalops", tab}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await mf.dispatchFetch("https://centurisk97.id/admin/masuk", {method: "POST", redirect: "manual", headers: {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id", "cf-connecting-ip": `198.51.100.${++ipN}`},
    body: new URLSearchParams({email: r.j.username, sandi: r.j.sandi}).toString()});
  assert.equal(m.status, 303); return {cookie: m.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0]};
};
const tugas = async (prov, {bencana, status = "buka", dummy = 0, umurJam = 1} = {}) => {
  const id = id16(), t = Date.now() - umurJam * JAM;
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, dummy) VALUES (?, ?, 'Kab Uji', 'Kec Uji', -2.2, 113.9, 3, 10, 50, ?, ?, ?, ?)").bind(id, prov, t, t, status, dummy).run();
  if (bencana) await DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES (?, ?)").bind(id, bencana).run();
  return id;
};
const baca = (id, pihak, dummy = 0) => DB.prepare("INSERT INTO monitor_baca (tugas_id, pihak, pembaca, nama, unit, waktu, dummy) VALUES (?, ?, ?, 'N', 'U', ?, ?)").bind(id, pihak, `${pihak}:${id}`, Date.now(), dummy).run();
const T = {}; let P, Q;

uji("siapan: tugas karhutla, banjir, dummy; satu akun pemirsa dengan monitor dan satu tanpa", async () => {
  T.k1 = await tugas("14"); T.k2 = await tugas("14", {status: "padam"}); T.k3 = await tugas("62"); T.kd = await tugas("14", {dummy: 1});
  T.b1 = await tugas("32", {bencana: "banjir"}); T.b2 = await tugas("32", {bencana: "banjir", status: "padam"}); T.g = await tugas("32", {bencana: "gempa"});
  await baca(T.k1, "dalops"); await baca(T.k1, "bpbd"); await baca(T.k2, "dalops", 1); await baca(T.kd, "dalops", 1);   // k2: pembacaan dummy tidak dihitung
  const akun = (await DB.prepare("SELECT id FROM instansi_akun LIMIT 1").first())?.id;
  if (!akun) await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, garam, sandi_sha, status, dibuat, dummy) VALUES ('${"a".repeat(16)}', 'akunuji1', 'pemprov', 'prov', 'Prov', 'uji|1', '["14"]', '${"g".repeat(32)}', '${"0".repeat(64)}', 'belum_klaim', 1, 0)`).run();
  const aid = akun || "a".repeat(16);
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, lat, lon, waktu_gps, hasil, pic_nama, pic_jabatan, pic_wa, jarak_km) VALUES (?, ?, ?, 'klien-uji-1', 'konfirmasi', ?, -2.2, 113.9, 1, 'api_ada', 'Pak PIC', 'Kasi', '628123456780', 0.4)").bind(id16(), T.k1, aid, Date.now()).run();
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, tindakan, status_api) VALUES (?, ?, ?, 'klien-uji-2', 'tindakan', ?, 'Sekat', 'bara')").bind(id16(), T.k1, aid, Date.now()).run();
  P = await masukPemirsa(["monitor", "peta"]); Q = await masukPemirsa(["berita"]);
});
uji("pemirsa dengan monitor: GET nasional, tanpa dummy, pihak pemirsa; bencana banjir hanya tugas banjir", async () => {
  const r = await api("GET", "/api/monitor", undefined, P); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.pihak, "pemirsa"); assert.equal(r.j.bencana, "karhutla");
  assert.deepEqual(r.j.tugas.map(t => t.id).sort(), [T.k1, T.k2, T.k3].sort(), "karhutla nasional, tanpa dummy, tanpa banjir/gempa");
  assert.deepEqual(r.j.tugas.find(t => t.id === T.k1).baca.dalops.length, 1);
  const b = await api("GET", "/api/monitor?bencana=banjir", undefined, P); assert.equal(b.s, 200, b.t);
  assert.equal(b.j.bencana, "banjir"); assert.deepEqual(b.j.tugas.map(t => t.id).sort(), [T.b1, T.b2].sort());
  assert.equal((await api("GET", "/api/monitor?bencana=gempa", undefined, P)).s, 400);
});
uji("pemirsa tidak boleh menandai baca (403); tanpa tab monitor ditolak (403); tanpa sesi 401", async () => {
  const w = await api("POST", "/api/monitor/baca", {tugas: [T.k3]}, {...P, ...PB}); assert.equal(w.s, 403, w.t);
  assert.equal(await (async () => (await DB.prepare("SELECT count(*) n FROM monitor_baca WHERE tugas_id = ?").bind(T.k3).first()).n)(), 0);
  assert.equal((await api("GET", "/api/monitor", undefined, Q)).s, 403);
  assert.equal((await api("GET", "/api/monitor")).s, 401);
});
uji("pemirsa membuka /monitor dan peta banjir, tanpa dialihkan", async () => {
  for (const j of ["/monitor", "/banjir/", "/banjir/peta"]) { const r = await mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", headers: P}); assert.equal(r.status, 200, j); await r.arrayBuffer(); }
  const M = await masukPemirsa(["monitor"]);   // hanya monitor: /banjir/ dialihkan ke monitor banjir, bukan ke tab banjir yang tidak ada
  const r = await mf.dispatchFetch("https://centurisk97.id/banjir/", {redirect: "manual", headers: M}); assert.equal(r.status, 303); assert.equal(r.headers.get("location"), "/monitor?bencana=banjir");
});
uji("/api/pantau/ringkas: publik, hitungan benar, dummy dikecualikan, wa dinormalkan", async () => {
  const r = await api("GET", "/api/pantau/ringkas"); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.bencana, "karhutla"); assert.equal(r.j.wa, "6281234567890"); assert.match(r.h.get("cache-control"), /max-age=300/);
  assert.deepEqual(r.j.total, {kejadian: 3, dimonitor: 1, diinfokan: 1, groundcheck: 1, tindak: 1, selesai: 1});
  assert.deepEqual(r.j.prov.map(p => [p.prov, p.nama, p.kejadian]), [["14", "Riau", 2], ["62", "Kalimantan Tengah", 1]]);
  const b = await api("GET", "/api/pantau/ringkas?bencana=banjir"); assert.equal(b.j.bencana, "banjir");
  assert.deepEqual(b.j.total, {kejadian: 2, dimonitor: 0, diinfokan: 0, groundcheck: 0, tindak: 0, selesai: 1});
  assert.equal((await api("GET", "/api/pantau/ringkas?bencana=gempa")).s, 400);
  const h = await mf.dispatchFetch("https://centurisk97.id/api/pantau/ringkas"); assert.equal(h.status, 200, "host terkunci tanpa sesi tetap boleh"); await h.arrayBuffer();
});
