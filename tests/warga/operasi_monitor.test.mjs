/* Monitoring operasi udara (src/operasi_hasil.js, src/operasi_udara.js monitor + foto, migrations/0106_operasi_monitor.sql, hook cron di src/titik.js) di workerd (Miniflare)
   dengan D1 dan R2 sungguhan, migrasi apa adanya. OCR stempel dikirim gateway (field `stempel`), bukan dibaca Worker.
   Dibuktikan: foto grup (dengan/tanpa keterangan) tersimpan di R2 + diindeks; Water Drop/After WB/Arr Mov -> gerak; foto memasangkan diri ke aksi dan mengisi koordinat;
   penilaian cron padam/masih_api/menunggu dengan putaran titik panas sintetis (dan lewat perbaruiTitik sungguhan); /api/operasi/monitor (bentuk + angka KPI) dan /api/operasi/foto (auth, 404).
   Jalankan: node --test tests/warga/operasi_monitor.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah, JPEG_SAH} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {nilaiAksi, simpanFoto} from "../../src/operasi_hasil.js";
import {perbaruiTitik} from "../../src/titik.js";
import {uraiStempel, urai} from "../../src/operasi_wa.js";

const JAM = 36e5, uji = berantai(), PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const wib = ms => new Date(ms + 7 * JAM).toISOString().slice(0, 10);
/* Worker memakai jam dinding (waktu terima = sekarang; aksi/foto hanya dicari 3 hari ke belakang), sedangkan fixture bertanggal 3-4 Nov 2026.
   Maka tanggal di teks fixture dan di assertion digeser ke "hari ini" (WIB): GESER = selisih hari dari 2026-11-03. */
const GESER = Math.round((Date.parse(wib(Date.now())) - Date.parse("2026-11-03")) / 864e5);
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const gs = (y, m, d) => { const x = new Date(Date.UTC(y, m, d + GESER)); return [x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()]; };
const nama = (m, asal) => { const n = asal.length <= 3 ? BLN[m].slice(0, 3) : BLN[m]; return asal === asal.toUpperCase() ? n.toUpperCase() : n; };
const hariIni = teks => teks
  .replace(/\b(\d{1,2}) (Nov|November|NOV|NOVEMBER) 2026/g, (_, d, b) => { const [y, m, h] = gs(2026, 10, +d); return `${d.length > 1 ? String(h).padStart(2, "0") : h} ${nama(m, b)} ${y}`; })
  .replace(/\bNov (\d{1,2}),(\s*)2026/g, (_, d, sp) => { const [y, m, h] = gs(2026, 10, +d); return `${nama(m, "Nov")} ${h},${sp}${y}`; })
  .replace(/\b2026-11-(\d{2})(?!\d)/g, (_, d) => { const [y, m, h] = gs(2026, 10, +d); return `${y}-${String(m + 1).padStart(2, "0")}-${String(h).padStart(2, "0")}`; });
const t = iso => Date.parse(hariIni(iso));   // "2026-11-03T04:11Z" -> epoch ms pada hari ini
const F3 = JSON.parse(readFileSync(path.join(AKAR, "tests/warga/fixtures/operasi_wa_031126.json"), "utf8")), P3 = id => hariIni(F3.pesan.find(p => p.id === id).teks);
const G = "120363012345678901@g.us";

uji("migrasi 0106 idempoten di atas skema yang sudah ada", async () => {
  const U = await siapkan("uji-monitor-migrasi");
  for (const s of pecah(readFileSync(path.join(AKAR, "migrations/0106_operasi_monitor.sql"), "utf8"))) await U.DB.prepare(s).run();
  assert.equal(await U.n("op_foto"), 0); assert.equal(await U.n("op_gerak_hasil"), 0);
  await assert.rejects(U.DB.prepare("INSERT INTO op_gerak_hasil (gerak_id, hasil) VALUES (1, 'terbakar')").run(), "CHECK hasil");
  await assert.rejects(U.DB.prepare("INSERT INTO op_foto (wa_id, diterima, tanggal, lat) VALUES (1, 1, '2026-11-03', 40)").run(), "lat di luar Indonesia");
});

uji("uraiStempel: format stempel nyata, zona jam menurut bujur, PM, registrasi 'VN- 8416' dan 'PK - RTQ'", () => {
  const armada = ["VH-L6T", "VN-8416", "PK-RTQ", "N261BE", "PK-ALE", "PK-FPA"], dr = Date.parse("2026-11-03T04:20:00Z");
  const a = uraiStempel("3 Nov 2026 11.17.48\n1°6'41\"S 110°4'46\"E\n29° NE\nKecamatan Simpang Hilir, Kabupaten Kayong Utara\nIndonesia\nAltitude:682.4ft\nVH-L6T/PT.EDC/OPS", {armada, diterima: dr});
  assert.deepEqual([a.registrasi, a.jam_utc, a.lat, a.lon], ["VH-L6T", Date.parse("2026-11-03T04:17:48Z"), -1.11139, 110.07944], "11.17.48 WIB = 04.17.48Z");
  const b = uraiStempel("3 Nov 2026 12.04.29 PM / 2°18'0\"S 110°39'17\"E ... #PT AAI/OPS-PATROLI/PK-ALE/KTG", {armada, diterima: dr});
  assert.deepEqual([b.registrasi, b.jam_utc], ["PK-ALE", Date.parse("2026-11-03T05:04:29Z")], "12 PM = tengah hari");
  assert.equal(uraiStempel("VN- 8416 / PT.BMT/ OPS", {armada}).registrasi, "VN-8416");
  assert.equal(uraiStempel("PT. APD/OPS-KALSEL/PK - RTQ", {armada}).registrasi, "PK-RTQ");
  assert.equal(uraiStempel("N261BE-BNPB-SATGASKARHUTLA-KALSEL-PT. MITRA TRIVEDA AVIASI", {armada}).registrasi, "N261BE");
  const wita = uraiStempel("3 Nov 2026 12.00.00 / 3°20'0\"S 114°50'0\"E", {diterima: dr});
  assert.equal(wita.jam_utc, Date.parse("2026-11-03T04:00:00Z"), "bujur 114,83 = WITA (UTC+8)");
  assert.equal(uraiStempel("3 Nov 2026 11.17.48 / 2°30'10\"S 115°30'0\"E", {diterima: Date.parse("2026-11-03T04:30:00Z")}).jam_utc, Date.parse("2026-11-03T04:17:48Z"), "bujur ambigu 113,5-116,5: zona terdekat dengan waktu terima (Kalteng timur WIB)");
  const t0 = performance.now(); uraiStempel("1°2'3" + " ".repeat(3900) + "x"); uraiStempel("1°2'3" + "  ".repeat(2000) + "x"); assert.ok(performance.now() - t0 < 50, "spasi panjang tidak memicu ReDoS");
  const jauh = uraiStempel("3 Nov 2026 11.17.48 / 1°6'41\"S 110°4'46\"E", {diterima: dr + 5 * 864e5}); assert.equal(jauh.jam_utc, null, "stempel > 3 hari dari waktu terima dibuang");
  assert.deepEqual(Object.values(uraiStempel("tidak ada apa-apa")), [null, null, null, null]);
  assert.equal(uraiStempel("3 Nov 2026 25.99.00", {}).jam_utc, null, "jam tak sah tidak ditebak");
});

uji("uraiStempel atas OCR nyata 31 foto (3-4 Nov 2026): koordinat OCR rusak terurai, infografis/foto tanpa tempelan = null", () => {
  const {blok} = JSON.parse(readFileSync(path.join(AKAR, "tests/warga/fixtures/ocr_stempel_041126.json"), "utf8")), dr = Date.parse("2026-11-04T01:00:00Z");
  const hasil = Object.fromEntries(blok.map(b => { const r = uraiStempel(b.teks, {diterima: dr}); return [b.id, [r.lat, r.lon, r.jam_utc && new Date(r.jam_utc).toISOString().slice(0, 19)]]; }));
  const harap = {35: [-2.9003, 104.7008, "2026-11-03T08:01:55"], 36: [-2.9006, 104.7006, "2026-11-03T09:26:03"], 38: [-1.3628, 110.7417, "2026-11-03T09:30:45"], 39: [-1.5531, 110.7378, "2026-11-03T09:37:40"],
    40: [-1.8928, 110.5392, "2026-11-03T09:55:10"], 44: [-0.1247, 109.5092, "2026-11-03T10:11:50"], 85: [-0.1548, 109.4007, "2026-11-04T00:55:49"], 86: [-0.1547, 109.4075, "2026-11-04T01:09:28"],
    97: [0.0647, 109.5103, "2026-11-04T01:23:41"], 98: [0.2594, 109.5714, "2026-11-04T01:35:53"], 99: [-2.9003, 104.7008, "2026-11-04T01:46:37"]};
  for (const [id, [lat, lon, jam]] of Object.entries(harap)) {
    assert.ok(Math.abs(hasil[id][0] - lat) < 0.01 && Math.abs(hasil[id][1] - lon) < 0.01, `foto ${id}: ${hasil[id]}`); assert.equal(hasil[id][2], jam, `jam foto ${id}`);
  }
  assert.ok(Math.abs(hasil[85][1] - hasil[86][1]) < 0.01, "foto 85 (detik rusak) dan 86 (bersih) satu lokasi");
  for (const b of blok.filter(b => !(b.id in harap))) assert.deepEqual(hasil[b.id].slice(0, 2), [null, null], `foto ${b.id} tanpa koordinat stempel`);
  for (const id of [37, 41, 42, 46, 60, 61, 62, 64, 65, 66, 67, 68, 69, 83, 87]) assert.equal(hasil[id][2], null, `foto ${id} tanpa jam`);
  assert.deepEqual(hasil[83].slice(0, 2), [null, null], "menit rusak (109°đ9') = null, bukan tebakan");
  // bentuk lain: tanggal bulan-dulu, belahan Indonesia, tolak sampah
  assert.equal(uraiStempel("Nov 4,\n2026 08:46:37").jam_utc, Date.parse("2026-11-04T01:46:37Z"));
  assert.deepEqual(Object.values(uraiStempel("1°6'41\"U 110°4'46\"T")).slice(1, 3), [1.11139, 110.07944]);
  assert.equal(uraiStempel("1°6'41\"S 110°4'46\"").lat, null, "tanpa belahan bujur = null");
  assert.equal(uraiStempel("1°66'41\"S 110°4'46\"E").lat, null, "menit >= 60 = null");
  assert.equal(uraiStempel("37°44'11\"N 122°26'30\"W").lat, null, "di luar Indonesia = null");
  assert.equal(uraiStempel("1°6'41\"S 110°4'46\"E 2°6'41\"S 111°4'46\"E").lat, null, "dua pasangan berbeda = ambigu");
});

/* ---------------- ingest lewat gerbang WA ---------------- */
const I = await siapkan("uji-monitor-ingest", {r2: true, ikat: {WA_KUNCI: "kunci-wa", WA_IZIN: "0812 3456 7890"}});
const kirim = async (teks, {berkas, tipe = "image/jpeg", nama = "foto.jpg", dari = "6289900001111", grup = G} = {}) => {
  const f = new FormData(); f.set("dari", dari); if (teks) f.set("teks", teks); if (grup) f.set("grup", grup);
  if (berkas) f.set("berkas", new Blob([berkas], {type: tipe}), nama);
  const r = await I.mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: {"x-wa-kunci": "kunci-wa"}, body: f}); const t = await r.text(); return {s: r.status, j: JSON.parse(t), t};
};
const Q = (sql, ...b) => I.DB.prepare(sql).bind(...b).all().then(r => r.results);

uji("foto grup tanpa keterangan: R2 + op_foto + wa_masuk tanpa nomor HP; lampiran bukan gambar dan obrolan dibuang; pengunduhan lewat /api/operasi/foto/:id", async () => {
  const r = await kirim(null, {berkas: JPEG_SAH}); assert.equal(r.s, 200, r.t); assert.equal(r.j.disimpan, true); assert.ok(r.j.foto.id > 0);
  const w = await I.DB.prepare("SELECT dari, nama, teks, berkas, tipe FROM wa_masuk WHERE id = ?").bind(r.j.id).first();
  assert.deepEqual([w.dari, w.nama, w.teks, w.tipe], [G, null, null, "image/jpeg"]);
  const o = await (await I.mf.getR2Bucket("MEDIA")).get(w.berkas); assert.ok(o, "berkas ada di R2"); assert.equal((await o.arrayBuffer()).byteLength, JPEG_SAH.length);
  const f = (await Q("SELECT * FROM op_foto"))[0]; assert.deepEqual([f.wa_id, f.registrasi, f.jam_utc, f.lat, f.gerak_id], [r.j.id, null, null, null, null], "tanpa stempel/keterangan: kolom kosong, tetap tersimpan");
  const pdf = await kirim(null, {berkas: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2]), tipe: "application/pdf", nama: "x.pdf"}); assert.equal(pdf.j.disimpan, false, "lampiran grup bukan gambar tanpa teks dikenali dibuang");
  assert.equal((await kirim("Siap komandan, terima kasih")).j.disimpan, false, "obrolan grup tetap dibuang");
  const cap = await kirim("makasih pak, ini fotonya VH-L6T", {berkas: JPEG_SAH}); assert.equal(cap.j.disimpan, true);
  assert.equal((await I.DB.prepare("SELECT teks FROM wa_masuk WHERE id = ?").bind(cap.j.id).first()).teks, null, "obrolan di keterangan foto tidak disimpan");
  assert.equal(cap.j.foto.registrasi, "VH-L6T", "tetapi dipakai sebagai petunjuk registrasi");
  const dl = await I.api("GET", `/api/operasi/foto/${r.j.foto.id}`, undefined, ADMIN);
  assert.equal(dl.s, 200); assert.equal(dl.h.get("content-type"), "image/jpeg"); assert.equal(dl.h.get("cache-control"), "private, no-store");
  assert.equal((await I.api("GET", "/api/operasi/foto/999999", undefined, ADMIN)).s, 404, "id tak dikenal");
  assert.equal((await I.api("GET", `/api/operasi/foto/${r.j.foto.id}`)).s, 403, "tamu");
  assert.equal((await I.api("GET", `/api/operasi/foto/${r.j.foto.id}`, undefined, GERBANG)).s, 200, "akun gerbang");
  const ulang = await kirim(null, {berkas: JPEG_SAH}); assert.equal(ulang.j.disimpan, true); assert.equal(await I.n("op_foto"), 3, "tiga foto: tanpa keterangan, dengan keterangan, dan kiriman ulang (waktu terima beda)");
});

uji("Arr Mov, Water Drop, After WB menulis aksi; lokasi tanpa koordinat dilengkapi temuan hari itu; foto berketerangan registrasi dipasang ke aksi", async () => {
  const arr = await kirim(P3("fpa_arr_mov_sortie1")); assert.equal(arr.j.operasi.gerak, 1); assert.equal(arr.j.operasi.temuan, 7);
  const kb = (await Q("SELECT g.jenis, g.jam_utc, h.menit_terbang FROM op_gerak g JOIN op_gerak_hasil h ON h.gerak_id = g.id WHERE g.registrasi = 'PK-FPA'"))[0];
  assert.deepEqual([kb.jenis, kb.jam_utc, kb.menit_terbang], ["kembali", t("2026-11-03T04:11Z"), 195], "Flight Time 03:15 = 195 menit");
  const t0 = Date.now(), wd = await kirim(P3("vhl6t_water_drop")); assert.equal(wd.j.operasi.gerak, 1);
  const g = (await Q("SELECT * FROM op_gerak WHERE registrasi = 'VH-L6T'"))[0];
  assert.deepEqual([g.jenis, g.misi, g.alasan, g.lokasi, g.tanggal], ["berangkat", "wb", "water_drop", "Batu Barat, Simpang Hilir, Kayong Utara", hariIni("2026-11-03")]);
  assert.ok(g.jam_utc >= t0 - 5e3 && g.jam_utc <= Date.now() + 5e3, "jam aksi = jam pesan diterima");
  assert.deepEqual([g.lat, g.lon], [-1.1233, 110.07099], "koordinat dari temuan PK-FPA bernama sama");
  assert.equal((await Q("SELECT sumber_lokasi FROM op_gerak_hasil WHERE gerak_id = ?", g.id))[0].sumber_lokasi, "temuan");
  const foto = await kirim("VH-L6T", {berkas: JPEG_SAH}); assert.equal(foto.j.foto.registrasi, "VH-L6T");
  assert.equal((await Q("SELECT gerak_id FROM op_foto WHERE id = ?", foto.j.foto.id))[0].gerak_id, g.id, "dipasang ke aksi registrasi sama dalam +-3 jam");
  assert.deepEqual([(await Q("SELECT lat FROM op_gerak WHERE id = ?", g.id))[0].lat], [-1.1233], "koordinat yang sudah ada tidak ditimpa foto");
  const aw = await kirim(P3("vn8416_after_wb")); assert.equal(aw.j.operasi.gerak, 2);
  const a = (await Q("SELECT g.id, g.alasan, h.* FROM op_gerak g JOIN op_gerak_hasil h ON h.gerak_id = g.id WHERE g.registrasi = 'VN-8416' AND g.jenis = 'berangkat'"))[0];
  assert.deepEqual([a.alasan, a.drops, a.liter, a.lapor, a.luas_terbakar_ha, a.luas_padam_ha], ["water_drop", 17, 68000, "masih_berasap", 8, 3]);
  assert.equal((await Q("SELECT jam_utc FROM op_gerak WHERE registrasi = 'VN-8416' AND jenis = 'kembali'"))[0].jam_utc, t("2026-11-03T06:10Z"), "ETA 06:10 Z");
  const ulang = await kirim(P3("vhl6t_water_drop")); assert.equal(await I.n("op_gerak", "registrasi = 'VH-L6T'"), 2, "pesan identik beda waktu terima = aksi drop kedua (dua pesan drop = dua aksi)");
  void ulang;
});

uji("foto bertanda tangan stempel: koordinat aksi tanpa koordinat diisi dari stempel kiriman gateway; tanpa stempel foto tetap tersimpan", async () => {
  const jam = t("2026-11-03T04:00:00Z"), dr = t("2026-11-03T04:20:00Z");
  const ins = await I.DB.prepare("INSERT INTO op_gerak (tanggal, registrasi, jenis, jam_utc, misi, lokasi, alasan) VALUES (?, 'N261BE', 'berangkat', ?, 'wb', 'Purwasari, Tamban, Barito Kuala', 'water_drop')").bind(hariIni("2026-11-03"), jam).run();
  const id = ins.meta.last_row_id, stempel = hariIni("3 Nov 2026 11.17.48\n1°6'41\"S 110°4'46\"E\nN261BE-BNPB-SATGASKARHUTLA-KALSEL-PT. MITRA TRIVEDA AVIASI");
  const r = await simpanFoto({DB: I.DB}, {waId: 9001, stempel, diterima: dr, teks: null});
  assert.deepEqual([r.registrasi, r.jam_utc, r.lat, r.lon], ["N261BE", t("2026-11-03T04:17:48Z"), -1.11139, 110.07944]);
  assert.equal((await Q("SELECT stempel FROM op_foto WHERE wa_id = 9001"))[0].stempel, stempel, "teks OCR tersimpan untuk audit");
  const g = (await Q("SELECT lat, lon FROM op_gerak WHERE id = ?", id))[0]; assert.deepEqual([g.lat, g.lon], [-1.11139, 110.07944], "koordinat aksi dari foto");
  assert.equal((await Q("SELECT sumber_lokasi FROM op_gerak_hasil WHERE gerak_id = ?", id))[0].sumber_lokasi, "foto");
  assert.equal((await Q("SELECT gerak_id FROM op_foto WHERE wa_id = 9001"))[0].gerak_id, id);
  const tanpa = await simpanFoto({DB: I.DB}, {waId: 9003, diterima: dr, teks: "N261BE"});
  assert.deepEqual([tanpa.jam_utc, tanpa.lat, tanpa.registrasi], [null, null, "N261BE"], "tanpa stempel: kolom kosong, keterangan tetap dipakai");
  assert.equal((await Q("SELECT stempel FROM op_foto WHERE wa_id = 9003"))[0].stempel, null);
  assert.equal(await I.n("op_foto", "wa_id IN (9001, 9003)"), 2);
});

uji("gerbang: stempel hanya dari gateway berkunci; kunci salah ditolak dan tidak ada yang tersimpan", async () => {
  const w = new Date(Date.now() + 7 * 36e5 - 10 * 60e3), tgl = `${w.getUTCDate()} ${"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[w.getUTCMonth()]} ${w.getUTCFullYear()} ${w.toISOString().slice(11, 19).replaceAll(":", ".")}`;
  // stempel digeser ke 10 menit lalu (WIB): stempel > 3 hari dari waktu terima dibuang, dan gateway menolak waktu terima > 7 hari, jadi tanggal tetap 4 Nov membusuk
  const F = JSON.parse(readFileSync(path.join(AKAR, "tests/warga/fixtures/ocr_stempel_041126.json"), "utf8")).blok.find(b => b.id === 98).teks.replace("4 Nov 2026 08.35.53", tgl);
  const kirimS = async (kunci, grup = G) => {
    const f = new FormData(); f.set("dari", "6289900001111"); f.set("grup", grup); f.set("stempel", F); f.set("waktu", String(Date.now())); f.set("berkas", new Blob([JPEG_SAH], {type: "image/jpeg"}), "x.jpg");
    const r = await I.mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: kunci ? {"x-wa-kunci": kunci} : {}, body: f}); return {s: r.status, j: await r.json()};
  };
  const sebelum = await I.n("op_foto");
  assert.equal((await kirimS(null)).s, 403); assert.equal((await kirimS("kunci-salah")).s, 403);
  assert.equal(await I.n("op_foto"), sebelum, "tanpa kunci gateway tak ada foto/stempel masuk");
  const ok = await kirimS("kunci-wa"); assert.equal(ok.s, 200); assert.deepEqual([ok.j.foto.lat, ok.j.foto.lon], [0.25944, 109.57139]);
  const baris = (await Q("SELECT stempel, jam_utc FROM op_foto WHERE id = ?", ok.j.foto.id))[0]; assert.equal(baris.stempel, F.slice(0, 1000)); assert.ok(baris.jam_utc);
  const bukanGrup = await kirimS("kunci-wa", "") ; assert.equal(bukanGrup.s, 200); assert.equal(bukanGrup.j.foto, undefined, "stempel hanya untuk foto grup");
});

uji("urai: Water Drop lain dan registrasi tanpa aksi; pesan 'Before WB' tetap bukti, bukan aksi", () => {
  const h = urai(P3("n261be_water_drop"), {tanggal: hariIni("2026-11-03"), armada: F3.armada});
  assert.deepEqual([h.dikenali, h.gerak[0].tindakan, h.gerak[0].target.lokasi], ["water_drop", "drop", "Purwasari, Tamban, Barito Kuala"]);
  assert.deepEqual(urai("Water Drop Sortie 1", {tanggal: hariIni("2026-11-03")}).tertahan, [{alasan: "registrasi"}]);
  assert.equal(urai("BEFORE WB\nWater Source Sungai\nN261BE", {tanggal: hariIni("2026-11-03"), armada: F3.armada}).dikenali, "bukti_wb");
});

/* ---------------- penilaian cron dan monitor ---------------- */
const M = await siapkan("uji-monitor-nilai", {r2: true});
const staf = [0, 0]; let ipN = 0;
const bikin = async (nama, peran) => {
  const r = await M.api("POST", "/api/staf/admin/buat", {nama, nip: `19970${++staf[0]}0012005`, unit: "Pusdalops BNPB", email: `mon${staf[0]}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await M.api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `192.0.2.${++ipN}`}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await M.api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200); return {cookie};
};
/* k = tengah hari WIB kemarin: tanggal tiap aksi tetap (kemarin/lusa) sepanjang hari uji berjalan */
const K = Date.parse(`${wib(Date.now() - 24 * JAM)}T12:00:00+07:00`), D2 = wib(K - 30 * JAM), D1 = wib(K - 10 * JAM);
const geser = (lat, km) => lat + km / 111.2;
const AKSI = {   // [registrasi, jam, lat, lon, misi, alasan]
  A: ["VH-L6T", K - 30 * JAM, -1.0, 110.0, "wb", null], B: ["VN-8416", K - 30 * JAM, -2.0, 110.5, "wb", null], C: ["VH-L6T", K - 10 * JAM, -1.5, 110.2, "wb", null],
  D: ["N261BE", K - 10 * JAM, -1.2, 110.1, "wb", "water_drop"], E: ["VN-8416", K - 30 * JAM, -2.3, 110.6, "wb", null], F: ["PK-FPA", K - 30 * JAM, -0.5, 109.5, "patroli", null],
  G: ["PK-SNK", K - 20 * JAM, -3.0, 114.7, "omc", null], H: ["VH-L6T", K - 5 * JAM, null, null, "wb", null]};
const id = {};

uji("nilaiAksi: masih_api, padam, menunggu, dan tak dinilai dari putaran titik panas sintetis; hasil final tidak dihitung ulang", async () => {
  for (const [k, [reg, jam, lat, lon, misi, alasan]] of Object.entries(AKSI)) id[k] = (await M.DB.prepare("INSERT INTO op_gerak (tanggal, registrasi, jenis, jam_utc, misi, lat, lon, alasan, lokasi) VALUES (?, ?, 'berangkat', ?, ?, ?, ?, ?, ?)")
    .bind(wib(jam), reg, jam, misi, lat, lon, alasan, `Lokasi ${k}`).run()).meta.last_row_id;
  const [, jA] = AKSI.A, [, jB] = AKSI.B, [, jD] = AKSI.D, [, jE] = AKSI.E;
  const titik = [
    {lat: geser(-1.0, 0.5), lon: 110.0, t: jA + 5 * JAM},        // A: 0,5 km, di dalam 24 jam -> masih_api
    {lat: geser(-2.0, 3), lon: 110.5, t: jB + 2 * JAM},          // B: 3 km -> bukan titiknya -> padam
    {lat: geser(-1.2, 0.4), lon: 110.1, t: jD + JAM},            // D: 0,4 km, 1 jam sesudah aksi -> masih_api walau belum 24 jam
    {lat: geser(-2.3, 0.2), lon: 110.6, t: jE - JAM},            // E: titik SEBELUM aksi -> tidak dihitung -> padam
    {lat: geser(-2.3, 0.2), lon: 110.6, t: jE + 25 * JAM}];      // E: titik 25 jam sesudah -> di luar jendela 24 jam
  const r = await nilaiAksi({DB: M.DB}, titik, K);
  assert.deepEqual([r.padam, r.masih_api], [2, 2]);
  const h = Object.fromEntries((await M.DB.prepare("SELECT gerak_id, hasil, titik_dekat, dicek FROM op_gerak_hasil").all()).results.map(x => [x.gerak_id, x]));
  assert.deepEqual([h[id.A].hasil, h[id.A].titik_dekat, h[id.B].hasil, h[id.D].hasil, h[id.E].hasil], ["masih_api", 1, "padam", "masih_api", "padam"]);
  assert.equal(h[id.A].dicek, K); for (const k of ["C", "F", "G", "H"]) assert.equal(h[id[k]], undefined, `${k}: tanpa hasil (menunggu / bukan wb / tanpa koordinat)`);
  const lagi = await nilaiAksi({DB: M.DB}, [], K + 3 * JAM); assert.deepEqual([lagi.padam, lagi.masih_api], [0, 0], "hasil final tidak berubah");
  assert.equal(await M.n("op_gerak_hasil"), 4);
  assert.equal(await nilaiAksi({DB: M.DB}, [], K + 13 * JAM).then(x => x.padam), 0, "C (jam K-10): 24 jam baru genap di K+14, sebelumnya menunggu");
  assert.equal(await nilaiAksi({DB: M.DB}, [], K + 15 * JAM).then(x => x.padam), 1, "sesudah K+14 tanpa titik: padam");
  await M.DB.prepare("DELETE FROM op_gerak_hasil WHERE gerak_id = ?").bind(id.C).run();   // kembalikan C ke 'menunggu' untuk uji monitor
});

uji("fixture monitor: foto, status armada, temuan berasap", async () => {
  const sisip = (t, o) => M.DB.prepare(`INSERT INTO ${t} (${Object.keys(o).join(",")}) VALUES (${Object.keys(o).map(() => "?").join(",")})`).bind(...Object.values(o)).run();
  for (const [wa, k] of [[1, "A"], [2, "A"], [3, "B"]]) await sisip("op_foto", {wa_id: wa, diterima: AKSI[k][1], tanggal: wib(AKSI[k][1]), registrasi: AKSI[k][0], jam_utc: AKSI[k][1] + wa * 60e3, lat: AKSI[k][2], lon: AKSI[k][3], gerak_id: id[k]});
  for (const [tgl, reg, st] of [[D2, "VH-L6T", "siap"], [D1, "VN-8416", "siap"], [D2, "VN-8416", "siap"], [D2, "PK-FPA", "siaga"], [D1, "N261BE", "tidak_siap"]]) await sisip("op_armada_status", {tanggal: tgl, registrasi: reg, status: st});
  await sisip("op_temuan", {tanggal: D2, jam_utc: AKSI.A[1] - 30 * 60e3, registrasi: "PK-FPA", lat: -1.0, lon: 110.0, status: "berasap"});
  await sisip("op_temuan", {tanggal: D2, jam_utc: AKSI.B[1] - 60 * 60e3, registrasi: "PK-FPA", lat: -2.0, lon: 110.5, status: "berasap"});
  await sisip("op_temuan", {tanggal: D2, jam_utc: AKSI.B[1] - 60 * 60e3, registrasi: "PK-FPA", lat: -3.9, lon: 110.5, status: "clear"});
});

uji("GET /api/operasi/monitor: auth (tamu 403, staf tanpa peran 403, akun gerbang dan moderator 200), rentang ketat, bentuk respons", async () => {
  const udara = await bikin("Staf Udara", ["udara"]), tanpa = await bikin("Kemitraan", ["kemitraan"]), q = `?dari=${D2}&sampai=${D1}`;
  for (const [nama, h] of [["tamu", {}], ["staf peran lain", tanpa]]) { assert.equal((await M.api("GET", "/api/operasi/monitor" + q, undefined, h)).s, 403, nama); assert.equal((await M.api("GET", "/api/operasi/monitor?dari=bukan", undefined, h)).s, 403, `${nama}: auth sebelum validasi`); }
  for (const h of [GERBANG, MOD2, ADMIN, udara]) assert.equal((await M.api("GET", "/api/operasi/monitor" + q, undefined, h)).s, 200);
  for (const bad of ["?dari=2026-02-30&sampai=2026-03-01", `?dari=${D1}&sampai=${D2}`, "?dari=2026-10-01&sampai=2026-11-30", "?dari=2026-12-01&sampai=2026-12-31x"]) assert.equal((await M.api("GET", "/api/operasi/monitor" + bad, undefined, GERBANG)).s, 400, bad);
  assert.equal((await M.api("GET", `/api/operasi/monitor?dari=${D2}`, undefined, GERBANG)).s, 200, "sampai bawaan = hari ini WIB");
  const r = await M.api("GET", "/api/operasi/monitor" + q, undefined, GERBANG); assert.equal(r.h.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(r.j), ["dari", "sampai", "aksi", "kpi"]); assert.deepEqual([r.j.dari, r.j.sampai], [D2, D1]);
  assert.equal(r.j.aksi.length, 8);
  const a = Object.fromEntries(r.j.aksi.map(x => [x.id, x])), A = a[id.A];
  assert.deepEqual(Object.keys(A).sort(), ["base_id", "foto", "guna", "hasil", "id", "jam_utc", "jenis", "lat", "liter", "drop", "lapor_akhir", "lokasi", "lon", "luas_padam_ha", "luas_terbakar_ha", "registrasi", "sumber_lokasi", "tanggal", "titik_dekat"].sort());
  assert.deepEqual([A.registrasi, A.base_id, A.guna, A.jenis, A.hasil, A.titik_dekat, A.sumber_lokasi, A.lat, A.lon, A.tanggal], ["VH-L6T", "PNK", "wb", "berangkat", "masih_api", 1, "teks", -1, 110, D2]);
  assert.deepEqual(A.foto.map(f => [f.url, f.lat]), [[`/api/operasi/foto/${A.foto[0].id}`, -1], [`/api/operasi/foto/${A.foto[1].id}`, -1]]); assert.equal(A.foto[0].jam_utc, AKSI.A[1] + 60e3);
  assert.deepEqual([a[id.B].hasil, a[id.C].hasil, a[id.D].hasil, a[id.E].hasil, a[id.F].hasil, a[id.G].hasil, a[id.H].hasil], ["padam", "menunggu", "masih_api", "padam", "tak_dinilai", "tak_dinilai", "tak_dinilai"]);
  assert.deepEqual([a[id.D].jenis, a[id.F].guna, a[id.G].guna, a[id.H].lat, a[id.H].sumber_lokasi], ["drop", "patroli", "omc", null, null]);
  assert.deepEqual([a[id.C].titik_dekat, a[id.F].titik_dekat], [0, null]);
  const S = r.j.kpi.semua;
  assert.deepEqual(S, {sortie: 7, aksi_wb: 6, dinilai: 4, padam: 2, masih_api: 2, menunggu: 1, persen_padam: 0.5, respons_median_menit: 45, hari_siap: 4, hari_terbang: 6, utilisasi: 0.75,
    aksi_berfoto: 2, persen_berfoto: 0.25, drop_total: 0, liter_total: 0, menit_terbang: 0});
  assert.deepEqual(Object.keys(r.j.kpi.base).sort(), ["BDJ", "KTG", "PNK"]);
  const V = r.j.kpi.armada["VH-L6T"];
  assert.deepEqual([V.sortie, V.aksi_wb, V.dinilai, V.padam, V.masih_api, V.menunggu, V.persen_padam, V.respons_median_menit, V.hari_siap, V.hari_terbang, V.utilisasi, V.aksi_berfoto, V.persen_berfoto],
    [3, 3, 1, 0, 1, 1, 0, 30, 1, 2, 1, 1, 0.333], "satu armada: hanya aksinya sendiri");
  assert.equal(r.j.kpi.armada["PK-FPA"].persen_padam, null, "dinilai < 1 -> null"); assert.equal(r.j.kpi.armada["PK-FPA"].utilisasi, 1);
  assert.equal(r.j.kpi.base.PNK.aksi_wb, 3); assert.equal(r.j.kpi.base.KTG.padam, 2);
  const sempit = await M.api("GET", `/api/operasi/monitor?dari=${D1}&sampai=${D1}`, undefined, GERBANG); assert.deepEqual(sempit.j.aksi.map(x => x.id).sort(), [id.C, id.D, id.H].sort(), "rentang satu hari");
  const kosong = await M.api("GET", "/api/operasi/monitor?dari=2026-01-01&sampai=2026-01-02", undefined, GERBANG); assert.deepEqual([kosong.j.aksi, kosong.j.kpi.semua.persen_padam, kosong.j.kpi.semua.utilisasi, kosong.j.kpi.semua.respons_median_menit, kosong.j.kpi.semua.persen_berfoto], [[], null, null, null, null]);
  assert.match((await M.api("GET", "/api/operasi/monitor", undefined, GERBANG)).j.dari, /^\d{4}-\d\d-\d\d$/, "bawaan hari ini WIB");
  assert.equal((await M.api("GET", `/api/operasi/foto/${A.foto[0].id}`, undefined, ADMIN)).s, 404, "op_foto tanpa pesan WA/berkas: 404 sopan, bukan 500");
});

uji("GET /api/operasi/jejak: auth (tamu 403, staf peran lain 403, gerbang/moderator/staf udara 200), tanggal sah, callsign cocok ber-strip, jendela WIB, dummy tersembunyi", async () => {
  const udara = await bikin("Staf Udara", ["udara"]), tanpa = await bikin("Kemitraan", ["kemitraan"]), J = "/api/operasi/jejak", awal = Date.parse(`${D1}T00:00:00Z`) - 7 * JAM;
  for (const [nama, h] of [["tamu", {}], ["staf peran lain", tanpa]]) { assert.equal((await M.api("GET", J, undefined, h)).s, 403, nama); assert.equal((await M.api("GET", J + "?tanggal=bukan", undefined, h)).s, 403, `${nama}: auth sebelum validasi`); }
  for (const h of [GERBANG, MOD2, ADMIN, udara]) assert.equal((await M.api("GET", `${J}?tanggal=${D1}`, undefined, h)).s, 200);
  for (const bad of ["?tanggal=2026-02-30", "?tanggal=x", "?tanggal=2026-11-03x"]) assert.equal((await M.api("GET", J + bad, undefined, GERBANG)).s, 400, bad);
  assert.equal((await M.api("GET", J, undefined, GERBANG)).j.tanggal, wib(Date.now()), "bawaan hari ini WIB");
  await M.DB.prepare("INSERT INTO op_armada (registrasi, tipe, peran, pemilik, dummy) VALUES ('PK-DUM', 'Dummy', 'wb', 'lainnya', 1)").run();
  const pos = (hex, menit, flight, lat) => M.DB.prepare("INSERT INTO adsb_posisi (hex, menit, wilayah, lat, lon, alt, gs, heli, flight, tipe) VALUES (?, ?, 'kalbar', ?, 110, 500, 80, 1, ?, 'S70')").bind(hex, menit, lat, flight).run();
  await pos("aaaaaa", awal, "vhl6t", -1); await pos("aaaaaa", awal + JAM, " VHL6T ", -1.1);   // cocok: huruf kecil, spasi ujung (callsign ADS-B tanpa strip)
  await pos("aaaaaa", awal - JAM, "VHL6T", -9); await pos("aaaaaa", awal + 24 * JAM, "VHL6T", -9);   // di luar jendela WIB
  await pos("bbbbbb", awal + 2 * JAM, "N261BE", -2); await pos("cccccc", awal + 2 * JAM, "GIA123", -3); await pos("dddddd", awal + 2 * JAM, null, -4); await pos("eeeeee", awal + 3 * JAM, "PKDUM", -5);
  const r = await M.api("GET", `${J}?tanggal=${D1}`, undefined, GERBANG); assert.equal(r.h.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(r.j), ["tanggal", "aktif", "posisi_hari_ini", "jejak"]); assert.deepEqual([r.j.tanggal, r.j.aktif, r.j.posisi_hari_ini], [D1, true, 6], "6 baris dalam jendela, semua armada atau bukan");
  assert.deepEqual(r.j.jejak.map(x => [x.registrasi, x.hex, x.titik.length]), [["N261BE", "bbbbbb", 1], ["PK-DUM", "eeeeee", 1], ["VH-L6T", "aaaaaa", 2]]);
  assert.deepEqual(r.j.jejak[2].titik.map(t => [t.t, t.lat]), [[awal, -1], [awal + JAM, -1.1]]); assert.deepEqual(Object.keys(r.j.jejak[2].titik[0]), ["t", "lat", "lon", "alt", "gs"]);
  assert.deepEqual((await M.api("GET", `${J}?tanggal=${D1}`, undefined, udara)).j.jejak.map(x => x.registrasi), ["N261BE", "VH-L6T"], "staf nyata tidak melihat armada dummy");
  assert.deepEqual((await M.api("GET", `${J}?tanggal=2026-01-01`, undefined, GERBANG)).j, {tanggal: "2026-01-01", aktif: true, posisi_hari_ini: 0, jejak: []});
  const V = await siapkan("uji-jejak-tanpa-tabel"); await V.DB.prepare("DROP TABLE adsb_posisi").run();
  assert.deepEqual((await V.api("GET", `${J}?tanggal=${D1}`, undefined, ADMIN)).j, {tanggal: D1, aktif: false, posisi_hari_ini: 0, jejak: []}, "tabel belum ada: aktif false, bukan 500");
});

uji("503 sopan tanpa 0106 (auth tetap lebih dulu)", async () => {
  const V = await siapkan("uji-monitor-503");
  for (const t of ["op_foto", "op_gerak_hasil"]) await V.DB.prepare(`DROP TABLE ${t}`).run();
  const r = await V.api("GET", "/api/operasi/monitor?dari=2026-11-03&sampai=2026-11-03", undefined, ADMIN); assert.equal(r.s, 503, r.t);
  assert.equal((await V.api("GET", "/api/operasi/monitor", undefined, {})).s, 403);
});

/* ---------------- hook cron FIRMS ---------------- */
const asetPublik = async req => { const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p); return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404}); };
uji("perbaruiTitik menilai aksi lewat putaran FIRMS sungguhan: titik <= 1 km dalam 24 jam = masih_api; tanpa titik sesudah 24 jam = padam", async () => {
  const C = await siapkan("uji-monitor-cron"), kini = Date.now(), t3 = new Date(kini - 3 * JAM), tgl = t3.toISOString().slice(0, 10), hm = t3.toISOString().slice(11, 16).replace(":", "");
  const ins = (reg, jam, lat) => C.DB.prepare("INSERT INTO op_gerak (tanggal, registrasi, jenis, jam_utc, misi, lat, lon) VALUES (?, ?, 'berangkat', ?, 'wb', ?, 109.59)").bind(wib(jam), reg, jam, lat).run().then(r => r.meta.last_row_id);
  const baru = await ins("VH-L6T", kini - 10 * JAM, -0.1), lama = await ins("VN-8416", kini - 30 * JAM, -0.1), jauh = await ins("N261BE", kini - 10 * JAM, -0.9);
  const KEP = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
  const asli = globalThis.fetch;
  globalThis.fetch = async u => new Response(String(u).includes("MODIS") ? "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight"
    : `${KEP}\n-0.1002,109.5902,330,0.4,0.4,${tgl},${hm},N20,VIIRS,n,2.0NRT,290,10,D`);
  try { const h = await perbaruiTitik({DB: C.DB, ASSETS: {fetch: asetPublik}, FIRMS_MAP_KEY: "kunci-uji"}, kini); assert.ok(h.titik >= 1, JSON.stringify(h)); assert.deepEqual([h.operasi.masih_api, h.operasi.padam], [1, 1], JSON.stringify(h)); }
  finally { globalThis.fetch = asli; }
  const hs = Object.fromEntries((await C.DB.prepare("SELECT gerak_id, hasil FROM op_gerak_hasil").all()).results.map(x => [x.gerak_id, x.hasil]));
  assert.equal(hs[baru], "masih_api", "titik 3 jam lalu, di dalam [t0, t0+24 jam] aksi 10 jam lalu");
  assert.equal(hs[lama], "padam", "aksi 30 jam lalu: titik 3 jam lalu sudah di luar jendelanya (t0+24 jam = 6 jam lalu)");
  assert.equal(hs[jauh], undefined, "aksi jauh dari titik, belum 24 jam: menunggu");
});
