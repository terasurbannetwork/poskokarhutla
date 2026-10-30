/* Tugas multi-bahaya sampai ke jalur operasi: penutupan gempa (jendela kaji cepat, Tanpa dampak, laporan regu, penutupan admin), /api/ops/*, penugasan,
   /api/lapangan/tugas, dan admin Pantau ?bencana= untuk tugas banjir yang masuk lewat tugas_banjir.json palsu. D1 + workerd sungguhan.
   Jalankan: node --test tests/warga/tugas_bencana_ops.test.mjs */
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import "../../src/worker.js";
import {tugasBaruDariBerkas, tutupKedaluwarsa, bersihkanInstansi, tautkanLaporanRegu} from "../../src/instansi.js";
import {UMUR_KAJI_CEPAT_JAM} from "../../src/tugas_bencana.js";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";

const JAM = 3600e3, MENIT = 60e3, PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, uji = berantai();
const T0 = Date.now();
const BERKAS = new Map();
/* karhutla palsu tepat di lokasi banjir: kalau infoKluster tidak memeriksa jenis, tugas banjir menempel pada api ini */
BERKAS.set("tugas_kompleks.json", {dibuat: new Date(T0).toISOString(), kompleks: [{id: "K7001", lat: -2.55, lon: 112.0}]});
BERKAS.set("kluster_geo.json", {K7001: [{type: "Polygon", coordinates: [[[111.99, -2.56], [112.01, -2.56], [112.01, -2.54], [111.99, -2.54], [111.99, -2.56]]]}, []]});
BERKAS.set("kluster_awal.json", {type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Point", coordinates: [112, -2.55]}, properties: {id: "K7001", ws: 12, wd: 135}}]});
const aset = async req => { const b = BERKAS.get(new URL(req.url).pathname.split("/").pop()); return b === undefined ? new Response("tidak ada", {status: 404}) : Response.json(b); };
const U = await siapkan("uji-bencana-ops", {r2: true, asetKu: aset});
const {DB, api} = U, env = {DB, ASSETS: {fetch: aset}};
const id16 = () => randomBytes(8).toString("hex");
let ipN = 0; const ipBaru = () => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`});
const SANDI = "SandiUji23456789";
async function akun(username, kab = "Seruyan") {
  const garam = "g".repeat(32), id = id16();
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, 'pemkab', 'kab', ?, ?, '["62"]', '62', ?, ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, 0)`)
    .bind(id, username, "Pemerintah " + kab, "uji|" + username, kab, garam, sha256(garam + SANDI)).run();
  const r = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(r.s, 200, r.t);
  return {id, h: {cookie: r.h.get("set-cookie").split(",")[0].split(";")[0], ...PB}};
}
const K = (lat, lon, o = {}) => ({lat, lon, prov: "62", kab: "Seruyan", kec: "Seruyan Hilir", level: 3, n24: 2, ...o});
const sisipTugas = async (bencana, dibuat, o = {}) => {
  const id = id16();
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, dibuat, terakhir_terdeteksi, status, dummy) VALUES (?, '62', 'Seruyan', 'Seruyan Hilir', ?, ?, 3, 1, ?, ?, 'buka', 0)").bind(id, o.lat ?? -3.5, o.lon ?? 113, dibuat, dibuat).run();
  if (bencana !== "karhutla") await DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES (?, ?)").bind(id, bencana).run();
  return id;
};
const baca = id => DB.prepare("SELECT status, padam_verif, padam_pada FROM tugas_api WHERE id = ?").bind(id).first();

uji("gempa: kedaluwarsa 72 jam menutup dua langkah; yang muda dan karhutla tidak tersentuh; tenggat tidak terlambat sesudah tutup", async () => {
  assert.equal(UMUR_KAJI_CEPAT_JAM, 72);
  const lama = await sisipTugas("gempa", T0 - 80 * JAM), muda = await sisipTugas("gempa", T0 - 10 * JAM), api0 = await sisipTugas("karhutla", T0 - 200 * JAM), banjir = await sisipTugas("banjir", T0 - 200 * JAM);
  assert.deepEqual(await tutupKedaluwarsa(env, T0), {gempa: {ditutup: 1, terverifikasi: 0}});
  assert.deepEqual({...await baca(lama)}, {status: "padam", padam_verif: "padam_dilaporkan", padam_pada: T0});
  for (const [i, s] of [[muda, "buka"], [api0, "buka"], [banjir, "buka"]]) assert.equal((await baca(i)).status, s);
  assert.deepEqual(await tutupKedaluwarsa(env, T0 + MENIT), {}, "idempoten");
  assert.deepEqual(await tutupKedaluwarsa(env, T0 + 49 * JAM), {gempa: {ditutup: 0, terverifikasi: 1}}, "49 jam kemudian: yang lama terverifikasi; yang muda baru 59 jam");
  assert.equal((await baca(lama)).padam_verif, "padam_terverifikasi");
  const {tenggat} = await import("../../src/instansi.js");
  assert.equal(tenggat({status: "padam", dibuat: 1}, T0 + 999 * JAM).terlambat, false);
  const h = await bersihkanInstansi(env, T0 + 100 * JAM); assert.ok(h.kedaluwarsa?.gempa, "dipanggil dari cron bersih-bersih tiap jam: " + JSON.stringify(h));
});

uji("gempa: laporan regu tidak_ditemukan (Tanpa dampak) menutup dengan padam_dilaporkan; karhutla bukan_api tetap bukan_api", async () => {
  const a = await akun("gempa1");
  const g = await sisipTugas("gempa", Date.now() - JAM, {lat: -4.5, lon: 114}), f = await sisipTugas("karhutla", Date.now() - JAM, {lat: -4.9, lon: 114.4});
  /* regu: tidak_ditemukan dipercaya pada gempa; satu regu = klaim, regu yang sama lagi tetap klaim, regu kedua BERBEDA menutup */
  const l = {id: id16(), lat: -4.5, lon: 114, prov: "62", kab: "Seruyan", status: "tidak_ditemukan", waktu: Date.now(), dipercaya: 1, regu_id: "reguA"};
  const x1 = await tautkanLaporanRegu(env, l, Date.now()); assert.equal(x1?.efek, "klaim_regu"); assert.equal((await baca(g)).status, "buka");
  const x2 = await tautkanLaporanRegu(env, {...l, id: id16()}, Date.now()); assert.equal(x2?.efek, "klaim_regu", "regu sama dua kali tetap klaim");
  const x = await tautkanLaporanRegu(env, {...l, id: id16(), regu_id: "reguB"}, Date.now()); assert.equal(x?.efek, "tanpa_dampak"); assert.deepEqual({...(await baca(g))}.padam_verif, "padam_dilaporkan"); assert.equal((await baca(g)).status, "padam");
  const y = await tautkanLaporanRegu(env, {...l, id: id16(), lat: -4.9, lon: 114.4}, Date.now()); assert.equal(y?.efek, null, "karhutla: tidak_ditemukan tidak menutup"); assert.equal((await baca(f)).status, "buka");
  void a;
});

uji("admin menutup tugas non-karhutla: wewenang, karhutla 409, ganda 409, CSRF origin lain 403", async () => {
  const b = await sisipTugas("banjir", Date.now() - JAM), f = await sisipTugas("karhutla", Date.now() - JAM);
  const alamat = i => `/api/instansi/admin/selesai/${i}`;
  assert.equal((await api("POST", alamat(b), {})).s, 403, "tanpa token");
  assert.equal((await api("POST", alamat(b), {}, {...ADMIN, origin: "https://jahat.example"})).s, 403, "origin lain");
  assert.equal((await api("POST", alamat(f), {}, ADMIN)).s, 409);
  assert.equal((await api("POST", alamat("0".repeat(16)), {}, ADMIN)).s, 404);
  const r = await api("POST", alamat(b), {}, ADMIN); assert.equal(r.s, 200, r.t); assert.equal(r.j.padam_verif, "padam_dilaporkan");
  assert.equal((await api("POST", alamat(b), {}, ADMIN)).s, 409);
  assert.equal((await baca(f)).status, "buka");
});

let BANJIR, A;
uji("banjir lewat tugas_banjir.json palsu: tugas dibuat; /api/lapangan/tugas memuat bencana, bencana_nama, kata", async () => {
  BERKAS.set("tugas_banjir.json", {dibuat: new Date().toISOString(), bencana: "banjir", kompleks: [K(-2.55, 112.0, {id: "B0100", jiwa_terdampak: 50})]});
  const h = await tugasBaruDariBerkas(env, Date.now()); assert.equal(h.bencana?.banjir?.baru, 1, JSON.stringify(h));
  BANJIR = (await DB.prepare("SELECT t.id FROM tugas_api t JOIN tugas_bencana x ON x.tugas_id = t.id WHERE x.bencana = 'banjir' AND t.lat = -2.55").first()).id;
  A = await akun("banjir1");
  const reguR = await api("POST", "/api/posko/regu", {nama: "Regu Uji", unsur: "BPBD", prov: "62", kab: "Seruyan"}, ADMIN); assert.equal(reguR.s, 201, reguR.t);
  const r = await api("GET", "/api/lapangan/tugas", undefined, {"x-kode-regu": reguR.j.kode}); assert.equal(r.s, 200, r.t);
  const t = r.j.tugas.find(x => x.id === BANJIR); assert.ok(t); assert.equal(t.bencana, "banjir"); assert.equal(t.bencana_nama, "Banjir"); assert.equal(t.kata, "surut");
  const lain = r.j.tugas.find(x => x.bencana === "karhutla"); assert.ok(lain && lain.kata === "padam");
  assert.ok(!/Rahasia|akun_id|token|6281/.test(r.t));
});

uji("ops: peta tugas banjir tanpa kluster/angin karhutla terdekat; periode, serah, permintaan, pelajaran, linimasa, patroli jalan", async () => {
  const p = await api("GET", `/api/ops/tugas/${BANJIR}`, undefined, A.h); assert.equal(p.s, 200, p.t);
  assert.equal(p.j.tugas.bencana, "banjir"); assert.equal(p.j.kluster, null, "tak menempel pada kluster karhutla terdekat"); assert.equal(p.j.angin, null);
  const mulai = Date.now(), selesai = mulai + 12 * JAM;
  const aw = await api("GET", `/api/ops/periode?tugas_id=${BANJIR}`, undefined, A.h); assert.equal(aw.s, 200, aw.t); assert.match(aw.j.awal.sasaran, /banjir/i); assert.ok(!/api di|Padamkan/.test(aw.j.awal.sasaran + aw.j.awal.keselamatan));
  const per = await api("POST", "/api/ops/periode", {tugas_id: BANJIR, mulai, selesai, pj: "Kalak BPBD"}, A.h); assert.equal(per.s, 201, per.t);
  const pid = per.j.periode.id;
  assert.equal((await api("POST", `/api/ops/periode/${pid}`, {aksi: "terbit"}, A.h)).s, 200);
  assert.equal((await api("POST", `/api/ops/periode/${pid}`, {aksi: "serah", dari: "Regu A", ke: "Regu B", catatan: "air naik"}, A.h)).s, 200);
  assert.equal((await api("GET", `/api/ops/periode/${pid}`, undefined, A.h)).j.serah.length, 1);
  const pm = await api("POST", "/api/ops/permintaan", {tugas_id: BANJIR, jenis: "logistik", barang: "lainnya", barang_ket: "perahu karet", jumlah: 3, satuan: "unit"}, A.h); assert.equal(pm.s, 201, pm.t);
  const dl = await api("GET", `/api/ops/permintaan?tugas_id=${BANJIR}`, undefined, A.h); assert.equal(dl.s, 200, dl.t);
  assert.equal((await api("POST", "/api/ops/pelajaran", {tugas_id: BANJIR, catatan: "Perahu perlu disiapkan lebih awal"}, A.h)).s, 201);
  const li = await api("GET", `/api/ops/linimasa/${BANJIR}`, undefined, A.h); assert.equal(li.s, 200, li.t);
  const dt = li.j.linimasa.find(e => e.jenis === "deteksi"); assert.match(dt.ket, /banjir/i); assert.ok(!/api terdeteksi/i.test(dt.ket));
  assert.equal(li.j.pelajaran.length, 1);
  const pt = await api("POST", "/api/ops/patroli", {kec: "Seruyan Hilir", alasan: "lainnya", alasan_ket: "pantau genangan", jadwal: Date.now() + JAM}, A.h); assert.equal(pt.s, 201, pt.t);
  assert.equal((await api("GET", "/api/ops/patroli", undefined, A.h)).j.patroli.length, 1);
  /* akun kabupaten lain tidak melihat tugas banjir ini */
  const B = await akun("banjir2", "Kotawaringin"); assert.equal((await api("GET", `/api/ops/tugas/${BANJIR}`, undefined, B.h)).s, 404);
});

uji("penugasan ke tugas banjir: pesan WA menyebut lokasi banjir, bukan titik api", async () => {
  const r = await api("POST", `/api/instansi/penugasan/${BANJIR}`, {nama: "Hendra", peran: "ketua_regu", wa: "081234567890", orang: 3}, A.h); assert.equal(r.s, 201, r.t);
  const pesan = r.j.wa.pesan; assert.match(pesan, /lokasi banjir/); assert.ok(!/titik api/.test(pesan));
});

uji("admin Pantau: ?bencana= menyaring, daftar bencana + label per tugas terlambat, nilai liar 400", async () => {
  await DB.prepare("UPDATE tugas_api SET dibuat = ? WHERE id = ?").bind(Date.now() - 30 * JAM, BANJIR).run();
  await DB.prepare("UPDATE tugas_api SET konfirmasi_pada = NULL WHERE id = ?").bind(BANJIR).run();
  const semua = await api("GET", "/api/instansi/admin/pantau", undefined, ADMIN); assert.equal(semua.s, 200, semua.t);
  assert.ok(semua.j.bencana.some(b => b.id === "banjir" && b.nama === "Banjir") && semua.j.bencana.some(b => b.id === "karhutla"));
  const bj = await api("GET", "/api/instansi/admin/pantau?bencana=banjir", undefined, ADMIN); assert.equal(bj.s, 200);
  assert.ok(bj.j.terlambat.length >= 1 && bj.j.terlambat.every(t => t.bencana === "banjir" && t.bencana_nama === "Banjir"));
  assert.equal(bj.j.provinsi.reduce((a, p) => a + p.aktif, 0), semua.j.bencana.find(b => b.id === "banjir").n - (await DB.prepare("SELECT count(*) n FROM tugas_api t JOIN tugas_bencana x ON x.tugas_id = t.id WHERE x.bencana = 'banjir' AND t.status != 'buka'").first()).n);
  assert.equal((await api("GET", "/api/instansi/admin/pantau?bencana=tsunami", undefined, ADMIN)).s, 400);
  const rin = await api("GET", `/api/instansi/admin/tugas/${BANJIR}`, undefined, ADMIN); assert.equal(rin.s, 200); assert.equal(rin.j.tugas.bencana, "banjir");
});
