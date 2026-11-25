/* LK-12 (data/kajian-bnpb/lapor-kejadian, RENCANA-UJI U7): laporan ke Buku Besar ujung ke ujung, tanpa mock di jalur yang diuji.
   worker.js utuh di Miniflare + D1 sungguhan (migrasi apa adanya), disajikan lewat server HTTP lokal supaya scripts/siklus/pasang.py
   SUNGGUHAN (python3 -I ... masuk) menarik ingest/modul, ingest/jendela, ingest/sumber dan menulis ingest/kejadian seperti di siklus.yml.
   Alur: laporan warga -> BPBD wilayah cek Valid (rute meja) -> staf Pusdalops usulkan (LU-) -> modul memuat LU- bertanda usulan_staf
   -> pasang.py masuk mendirikan KJ- (aksi baru) -> rincian meja `terpasang` ber-KJ-. Jalur negatif: tiket LA- otomatis saja tidak pernah
   mendirikan KJ-; ia baru menempel sesudah KJ- ada. Nomor WA rekaan 62812000012xx, bukan nomor nyata.
   Jalan: node --test tests/e2e/lapor_kejadian.test.mjs */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {after} from "node:test";
import {berantai, sha256} from "../warga/_bnpb.mjs";
import {mulai} from "../warga/_siklus.mjs";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const uji = berantai();
const U = await mulai("uji-e2e-lapor-kejadian", {ikat: {LAPOR_USUL: "1"}}), {DB, api, mf, n} = U;

/* Worker di balik URL sungguhan: pasang.py memakai urllib, bukan dispatchFetch */
const srv = createServer(async (req, res) => {
  const isi = []; for await (const c of req) isi.push(c);
  const h = Object.fromEntries(Object.entries(req.headers).filter(([k]) => k !== "host" && k !== "content-length"));
  const r = await mf.dispatchFetch("http://bnpb.lokal" + req.url, {method: req.method, headers: h, body: isi.length ? Buffer.concat(isi) : undefined});
  res.writeHead(r.status, {"content-type": r.headers.get("content-type") || "application/json"}); res.end(Buffer.from(await r.arrayBuffer()));
});
await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
after(() => srv.close());
const BASIS = `http://127.0.0.1:${srv.address().port}`;
const BERSIH = mkdtempSync(path.join(tmpdir(), "e2e-lk-bersih-"));   // tanpa CSV DIBI/Logbook lokal: hanya sumber modul dari Worker yang masuk

const tgl = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);   // WIB
const hari = d => tgl(Date.now() + d * 864e5);
async function pasang() {   // pasang.py sungguhan, asinkron (execFileSync membekukan server di proses yang sama); keluaran = hitungan per aksi
  const {stdout: o} = await promisify(execFile)("python3", ["-I", path.join(AKAR, "scripts/siklus/pasang.py"), "masuk", "--bersih", BERSIH, "--basis", BASIS, "--dari", hari(-2), "--sampai", hari(1)],
    {cwd: AKAR, env: {PATH: process.env.PATH, PIPA_TOKEN: "token-pipa-uji"}, encoding: "utf8", timeout: 120e3});
  return JSON.parse(o);
}

/* laporan warga terkirim di Kabupaten Bogor (fixture D1; mesin percakapan diuji di tests/lapor/mesin.test.mjs) */
let nL = 0;
async function laporan({wa, tingkat = "warga", menit = 30}) {
  nL++; const nomor = `LA-${tgl(Date.now()).slice(8, 10)}${tgl(Date.now()).slice(5, 7)}${tgl(Date.now()).slice(2, 4)}-${90 + nL}`, id = `e2e${String(nL).padStart(13, "0")}`, t0 = Date.now() - menit * 60e3;
  const wil = {kode: `32.01.01.${2000 + nL}`, desa: "Desa Uji", kec: "Kec Uji", kab: "Kabupaten Bogor", kabKode: "32.01", prov: "Jawa Barat", provKode: "32"};
  const kerja = {id, wa, status: "terkirim", nomor, terkirim: t0, foto: [], transkrip: [], isian: {jenis: {nilai: "banjir"}, lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: wil}}, waktu: {nilai: "hari ini", ms: t0}}};
  const ringkas = {waktuMs: t0, wilayah: wil, lengkap: 30, foto: 0, dampakMeja: null, dampak: {}};
  await DB.batch([
    DB.prepare("INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES (?, ?, 'terkirim', ?, 'banjir', '32.01', -6.6, 106.8, ?, ?, ?, ?, ?, 0, ?, ?)")
      .bind(id, wa, tingkat, nomor, sha256(nomor), t0, JSON.stringify(kerja), JSON.stringify(ringkas), t0, t0),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, 'baru', ?)").bind(nomor, id, t0)]);
  return nomor;
}

let PD, BP, LA, OTO, LU, KJ;
const rinci = async () => (await api("GET", `/api/lapor/meja/${LA}`, undefined, PD.h)).j.usulan;

uji("siapkan: staf Pusdalops (login sungguhan), akun BPBD Kabupaten Bogor, laporan warga, tiket LA- otomatis BPBD berberkas", async () => {
  PD = await U.staf("Pd E2E", ["pusdalops"]);
  BP = await U.bp({jenis: "pemkab", kab: "Kabupaten Bogor", wilayah: "BPBD Kabupaten Bogor", wa: "6281200001290"});
  LA = await laporan({wa: "6281200001201", menit: 40});
  OTO = await laporan({wa: "6281200001202", tingkat: "bpbd", menit: 20});
  await DB.prepare("INSERT INTO lj_berkas (id, induk, kab, status, isian, dibuat, diubah) VALUES (?, ?, '32.01', 'terbuka', '{}', ?, ?)").bind("e2e0".repeat(4), OTO, Date.now(), Date.now()).run();
  assert.equal(await n("sk_kejadian"), 0);
});

uji("negatif: tiket LA- otomatis saja tidak pernah mendirikan KJ- (pasang.py sungguhan: tanpa_pasangan, nol keputusan)", async () => {
  const m = await api("GET", `/api/siklus/ingest/modul?sumber=lapor_ai&dari=${hari(-2)}&sampai=${hari(1)}`, undefined, {authorization: "Bearer token-pipa-uji"});
  assert.equal(m.s, 200, m.t); assert.deepEqual(m.j.baris.map(b => b.kode), [OTO], "hanya tiket bpbd berberkas yang keluar, laporan warga tidak");
  assert.ok(!("usulan_staf" in m.j.baris[0]));
  const h = await pasang();
  assert.equal(h.tanpa_pasangan, 1, JSON.stringify(h)); assert.equal(h.baru ?? 0, 0, JSON.stringify(h));
  assert.equal(await n("sk_kejadian"), 0, "LA- otomatis mendirikan kejadian resmi: TAUTAN_SAJA di pasang.py lepas");
  assert.equal(await n("sk_kejadian_sumber", "sumber = 'lapor_ai'"), 0, "LA- tanpa pasangan tidak boleh ditulis sebagai baris sumber");
});

uji("usul ditolak sebelum BPBD cek Valid; BPBD wilayah cek Valid lewat rute meja; staf Pusdalops mengusulkan LU-", async () => {
  let r = await api("POST", `/api/lapor/meja/${LA}/usulkan`, {}, PD.hp); assert.equal(r.s, 422, r.t.slice(0, 200));
  assert.equal((await api("POST", `/api/lapor/meja/${LA}/usulkan`, {}, BP.hp)).s, 403, "akun BPBD tidak mengusulkan (Q11)");
  r = await api("POST", `/api/lapor/meja/${LA}/periksa`, {hasil: "valid", catatan: "Dicek ke lokasi bersama kades"}, BP.hp); assert.equal(r.s, 200, r.t.slice(0, 300));
  assert.equal((await rinci()).siap, true);
  r = await api("POST", `/api/lapor/meja/${LA}/usulkan`, {}, PD.hp); assert.equal(r.s, 200, r.t.slice(0, 300));
  LU = r.j.usulan.kode; assert.match(LU, /^LU-\d{6}-\d{2}$/);
  assert.deepEqual((await rinci()).status, {kode: LU, putaran: 1, keadaan: "menunggu", kejadian_id: null});
  assert.equal(await n("sk_kejadian"), 0, "Worker tidak mendirikan kejadian sendiri (D9)");
});

uji("modul memuat LU- bertanda usulan_staf, tanpa nomor WA", async () => {
  const m = await api("GET", `/api/siklus/ingest/modul?sumber=lapor_ai&dari=${hari(-2)}&sampai=${hari(1)}`, undefined, {authorization: "Bearer token-pipa-uji"});
  assert.equal(m.s, 200, m.t);
  const lu = m.j.baris.find(b => b.kode === LU);
  assert.deepEqual(lu, {sumber: "lapor_ai", kode: LU, jenis: "banjir", prov: "32", kab: "Bogor", mulai: tgl(Date.now() - 40 * 60e3), usulan_staf: true});
  assert.doesNotMatch(m.t, /62812000012/);
});

uji("pasang.py masuk sungguhan: LU- mendirikan satu KJ- (baru); rincian meja terpasang ber-KJ-", async () => {
  const h = await pasang();
  assert.equal(h.baru, 1, JSON.stringify(h));
  const s = await DB.prepare("SELECT status, kejadian_id FROM sk_kejadian_sumber WHERE sumber = 'lapor_ai' AND kode = ?").bind(LU).first();
  assert.equal(s?.status, "terpasang", JSON.stringify(s)); assert.match(s.kejadian_id, /^KJ-\d{4}-[0-9A-Z]{8}$/); KJ = s.kejadian_id;
  const k = await DB.prepare("SELECT jenis, kab4, mulai FROM sk_kejadian WHERE id = ?").bind(KJ).first();
  assert.deepEqual({...k}, {jenis: "banjir", kab4: "3201", mulai: tgl(Date.now() - 40 * 60e3)});
  assert.equal(await n("sk_kejadian"), 1);
  const u = await rinci(); assert.deepEqual(u.status, {kode: LU, putaran: 1, keadaan: "terpasang", kejadian_id: KJ}); assert.equal(u.siap, false);
  assert.equal((await api("POST", `/api/lapor/meja/${LA}/usulkan`, {}, PD.hp)).s, 409, "terpasang tidak diusulkan ulang");
});

uji("jalan ulang: tiket LA- otomatis menempel ke KJ- yang sama, tanpa KJ- kembar; jalan ketiga nol keputusan", async () => {
  let h = await pasang();
  assert.equal(h.tambah, 1, JSON.stringify(h)); assert.equal(h.baru ?? 0, 0, JSON.stringify(h));
  assert.equal((await DB.prepare("SELECT kejadian_id FROM sk_kejadian_sumber WHERE sumber = 'lapor_ai' AND kode = ?").bind(OTO).first())?.kejadian_id, KJ);
  h = await pasang();
  assert.equal((h.baru ?? 0) + (h.tambah ?? 0), 0, JSON.stringify(h));
  assert.equal(await n("sk_kejadian"), 1, "jalan berulang membuat KJ- kembar");
});
