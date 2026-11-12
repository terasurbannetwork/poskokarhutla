/* Log tindak lanjut Usulan langkah (src/dalops_tindak.js, migrations/0128_dl_tindak.sql, data/kajian-bnpb/tindak-langkah/RENCANA-UJI.md T1-T11)
   di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya. Jalankan: node --test tests/warga/dalops_tindak.test.mjs */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {migrasi} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)

const PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const uji = berantai();
const {DB, api, n} = await siapkan("uji-dalops-tindak");
const K = "banjir|11|Pidie Jaya|konfirmasi", K2 = "banjir|12|Langkat|posko";
let ipN = 0, nipN = 0;
const bikin = async (nama, peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19970${++nipN}0012005`, unit: "Pusdalops BNPB", email: `tl${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `192.0.2.${++ipN}`}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {cookie, ...PB};
};
const pos = (b, h = MOD2) => api("POST", "/api/dalops/tindak", b, h);

uji("T1-T2: tamu dan akun gerbang ditolak baca dan tulis; pimpinan baca saja", async () => {
  assert.equal((await api("GET", "/api/dalops/tindak", undefined, {})).s, 401);
  assert.equal((await api("GET", "/api/dalops/tindak", undefined, GERBANG)).s, 401);
  assert.equal((await pos({kunci: K, status: "selesai"}, {})).s, 403);
  assert.equal((await pos({kunci: K, status: "selesai"}, GERBANG)).s, 403);
  const pim = await bikin("Pimpinan Uji", ["pimpinan"]);
  const g = await api("GET", "/api/dalops/tindak", undefined, pim); assert.equal(g.s, 200, g.t); assert.equal(g.j.boleh_tulis, false);
  assert.equal((await pos({kunci: K, status: "selesai"}, pim)).s, 403);
});

uji("T3-T4: simpan selesai lalu proses: satu baris terkini, dua baris riwayat dengan teks langkah", async () => {
  const r = await pos({kunci: K, status: "selesai", catatan: "BPBD konfirmasi  sudah surut", langkah: "Konfirmasi status surut ke BPBD, laporan terakhir 4 Nov"}); assert.equal(r.s, 201, r.t);
  assert.equal(await n("dl_tindak"), 1); assert.equal(await n("dl_tindak_log"), 1);
  const l = await DB.prepare("SELECT catatan, langkah, oleh FROM dl_tindak_log").first();
  assert.equal(l.catatan, "BPBD konfirmasi sudah surut"); assert.match(l.langkah, /laporan terakhir 4 Nov/); assert.match(l.oleh, /^admin:[0-9a-f]+$/);
  assert.equal((await pos({kunci: K, status: "proses"})).s, 201);
  assert.equal(await n("dl_tindak"), 1); assert.equal((await DB.prepare("SELECT status FROM dl_tindak").first()).status, "proses"); assert.equal(await n("dl_tindak_log"), 2);
});

uji("T5: kunci salah, status salah, catatan kepanjangan ditolak 400", async () => {
  for (const b of [{kunci: "banjir|11|Pidie Jaya|terbang", status: "proses"}, {kunci: "longsor|11|X|posko", status: "proses"}, {kunci: "banjir|1|X|posko", status: "proses"},
    {kunci: K, status: "batal"}, {kunci: K, status: "proses", catatan: "x".repeat(301)}]) assert.equal((await pos(b)).s, 400, JSON.stringify(b).slice(0, 80));
  assert.equal(await n("dl_tindak_log"), 2);
});

uji("T6-T7: terkini dan riwayat membawa nama pengisi, riwayat terbaru dulu", async () => {
  const g = await api("GET", "/api/dalops/tindak", undefined, MOD2); assert.equal(g.s, 200, g.t);
  assert.equal(g.j.boleh_tulis, true); assert.deepEqual(g.j.butir.map(x => [x.kunci, x.status, x.oleh_nama]), [[K, "proses", "Moderator"]]);
  assert.equal(g.j.butir[0].oleh, undefined, "kode pengisi tidak dikirim ke layar");
  const r = await api("GET", "/api/dalops/tindak/riwayat?kunci=" + encodeURIComponent(K), undefined, MOD2); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.map(x => x.status), ["proses", "selesai"]);
  assert.equal((await api("GET", "/api/dalops/tindak/riwayat?kunci=x", undefined, MOD2)).s, 400);
});

uji("T8: staf berwilayah hanya provinsinya; nama staf tampil", async () => {
  const st = await bikin("Rina Pusdalops", ["pusdalops"], ["11"]);
  assert.equal((await pos({kunci: K2, status: "proses"}, st)).s, 403);
  assert.equal((await pos({kunci: K, status: "selesai"}, {cookie: st.cookie, origin: st.origin})).s, 403, "sesi staf tanpa x-pb ditolak");
  assert.equal((await pos({kunci: K, status: "selesai"}, st)).s, 201);
  const g = await api("GET", "/api/dalops/tindak", undefined, st); assert.equal(g.j.boleh_tulis, true);
  assert.equal(g.j.butir.find(x => x.kunci === K).oleh_nama, "Rina Pusdalops");
});

uji("T9: lebih dari 120 tulis per 10 menit per pengisi ditolak 429", async () => {
  const kini = Date.now(), oleh = (await DB.prepare("SELECT oleh FROM dl_tindak_log WHERE oleh LIKE 'admin:%' LIMIT 1").first()).oleh;
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO dl_tindak_log (kunci, status, oleh, waktu) VALUES (?, 'proses', ?, ?)").bind(K2, oleh, kini)));
  assert.equal((await pos({kunci: K2, status: "proses"})).s, 429);
});

uji("T10: 503 sopan bila migrasi 0128 belum diterapkan; hak tetap lebih dulu", async () => {
  const L = await siapkan("uji-dalops-tindak-lama", {sampai: "0128_"});
  assert.equal((await L.api("GET", "/api/dalops/tindak", undefined, {})).s, 401);
  const g = await L.api("GET", "/api/dalops/tindak", undefined, MOD2); assert.equal(g.s, 503); assert.match(g.t, /0128_dl_tindak/);
  assert.equal((await L.api("POST", "/api/dalops/tindak", {kunci: K, status: "proses"}, MOD2)).s, 503);
});

uji("T11: kueri terkini, riwayat, laju, nama staf memakai indeks", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  const plan = sql => db.prepare("EXPLAIN QUERY PLAN " + sql).all().map(r => r.detail).join(" | ");
  for (const sql of ["SELECT kunci, status FROM dl_tindak WHERE waktu > ? ORDER BY waktu DESC LIMIT 2000", "SELECT waktu FROM dl_tindak_log WHERE kunci = ? ORDER BY id DESC LIMIT 100",
    "SELECT count(*) n FROM dl_tindak_log WHERE oleh = ? AND waktu > ?", "SELECT id, nama FROM staf WHERE id IN (SELECT value FROM json_each(?))"])
    assert.doesNotMatch(plan(sql), /SCAN (dl_tindak|dl_tindak_log|staf)\b/, sql);
});
