/* Operasi Lapangan OP-2: pengurai pesan WA satgas udara (src/operasi_wa.js, murni) dan jalur tulisnya lewat POST /api/wa/gateway (src/wa.js -> catatOperasi di src/operasi_udara.js)
   di workerd (Miniflare) dengan D1 sungguhan. Fikstur: 15 pesan nyata 2 Nov 2026 tanpa nama kru (tests/warga/fixtures/operasi_wa_021126.json).
   Dibuktikan: tiap pesan fikstur menghasilkan persis `harap`; kiriman ulang tidak menggandakan; koordinat rusak ditahan; tanpa migrasi 0103 pesan tetap tersimpan.
   Jalankan: node --test tests/warga/operasi_wa.test.mjs */
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
const {urai, tanggalOperasi} = await import("../../src/worker.js").then(() => import("../../src/operasi_wa.js"));   // worker dulu: modul saling impor

const F = JSON.parse(readFileSync(path.join(AKAR, "tests/warga/fixtures/operasi_wa_021126.json"), "utf8")).pesan, P = id => F.find(p => p.id === id);
const ARMADA = [...readFileSync(path.join(AKAR, "migrations/0103_operasi_lapangan.sql"), "utf8").matchAll(/INTO op_armada \([^)]*\) VALUES \('([^']+)'/g)].map(m => m[1]);
const TGL = "2026-11-02";
const dekat = (a, b, apa) => {
  if (typeof b === "number") return assert.ok(Math.abs(a - b) <= 1e-5, `${apa}: ${a} vs ${b}`);
  if (Array.isArray(b)) { assert.equal(a?.length, b.length, `${apa}: panjang`); return b.forEach((x, i) => dekat(a[i], x, `${apa}[${i}]`)); }
  if (b && typeof b === "object") { assert.deepEqual(Object.keys(a ?? {}).sort(), Object.keys(b).sort(), `${apa}: kunci`); return Object.keys(b).forEach(k => dekat(a[k], b[k], `${apa}.${k}`)); }
  assert.equal(a, b, apa);
};

test("urai: 15 pesan fikstur menghasilkan persis harap (koordinat toleransi 1e-5)", () => {
  assert.equal(ARMADA.length, 55);
  for (const p of F) {
    const h = urai(p.teks, {tanggal: TGL, armada: ARMADA}), e = p.harap;
    dekat(h.temuan, e.temuan, `${p.id}.temuan`); dekat(h.gerak, e.gerak, `${p.id}.gerak`);
    dekat(h.status, e.status ?? [], `${p.id}.status`); dekat(h.tertahan, e.tertahan ?? [], `${p.id}.tertahan`);
    if ("dikenali" in e) assert.equal(h.dikenali, e.dikenali, `${p.id}.dikenali`);
  }
});

test("urai: tanggal isi, teks kosong, tanggal tak sah, dan batas koordinat", () => {
  assert.equal(tanggalOperasi(P("vn8416_departure").teks), TGL);
  assert.equal(tanggalOperasi("Senin, 30 Februari 2026"), null);
  assert.equal(tanggalOperasi("tanpa tanggal"), null);
  assert.equal(urai("", {tanggal: TGL}).dikenali, null);
  assert.equal(urai(P("rtq_clear").teks, {tanggal: "bukan"}).dikenali, null, "tanggal operasi wajib sah");
  const luar = urai("PK-FPA\n*1. X*\nN 40° 10' 05\"\nE 109° 41' 36\"\n*Target Clear*", {tanggal: TGL});
  assert.deepEqual([luar.temuan.length, luar.tertahan[0]?.alasan], [0, "koordinat"], "lintang di luar Indonesia ditahan, tidak ditebak");
  const des = urai("PK-FPA\n*1. Desimal*\n-0.27103, 109.36153\n*Target Clear*", {tanggal: TGL});
  assert.deepEqual([des.temuan[0]?.lat, des.temuan[0]?.lon], [-0.27103, 109.36153], "koordinat desimal bertanda");
  const rtb = urai("UR-CSN Back To Base Due To Cuaca ETA 05.10 WIB", {tanggal: TGL});
  assert.equal(rtb.gerak[0].jam_utc, "2026-11-01T22:10Z", "jam WIB sebelum 07.00 jatuh ke hari UTC sebelumnya");
});

const uji = berantai();
const U = await siapkan("uji-operasi-wa", {r2: true, ikat: {WA_KUNCI: "kunci-wa", WA_IZIN: "0812 3456 7890"}}), {api, n, mf, DB} = U;
async function kirim(teks, waktu, mfX = mf) {
  const f = new FormData(); f.set("dari", "6281234567890"); f.set("teks", teks); if (waktu) f.set("waktu", String(waktu));
  const r = await mfX.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: {"x-wa-kunci": "kunci-wa"}, body: f});
  const t = await r.text(); return {s: r.status, j: JSON.parse(t), t};
}
const peta = (q = TGL) => api("GET", `/api/operasi/peta?tanggal=${q}`, undefined, ADMIN).then(r => { assert.equal(r.s, 200, r.t); return r.j; });

uji("pesan pelaksanaan H-3217 -> 7 temuan; kiriman ulang dan pesan sama beda waktu tidak menggandakan", async () => {
  const w0 = Date.now() - 120e3, r = await kirim(P("h3217_pelaksanaan").teks, w0);
  assert.equal(r.s, 200, r.t); assert.equal(r.j.disimpan, true);
  assert.deepEqual([r.j.operasi.tanggal, r.j.operasi.temuan, r.j.operasi.gerak, r.j.operasi.tertahan], [TGL, 7, 0, []]);
  const j = await peta(); assert.equal(j.temuan.length, 7);
  const t0 = j.temuan.find(x => x.lokasi === "Rasau, Kubu Raya"); assert.deepEqual([t0.registrasi, t0.status, t0.lat, t0.lon], ["H-3217", "clear", -0.27103, 109.36153]);
  assert.ok(t0.wa_id > 0, "wa_id terisi");
  assert.equal(t0.jam_utc, new Date(w0 + 7 * 36e5).toISOString().slice(0, 10) === TGL ? w0 : null, "jam temuan = jam pesan diterima bila hari terima = hari operasi (bahan M7)");
  const ulang = await kirim(P("h3217_pelaksanaan").teks, w0);   // kiriman ulang gerbang: baris wa_masuk sama dikembalikan, tanpa operasi
  assert.equal(ulang.j.id, r.j.id); assert.equal(await n("wa_masuk"), 1);
  await kirim(P("h3217_pelaksanaan").teks + " ", Date.now() - 60e3);   // pesan lain (teks beda) dengan isi titik sama: UNIQUE menahan
  assert.equal(await n("wa_masuk"), 2); assert.equal(await n("op_temuan"), 7);
  const sat = await kirim(P("skadron_satu_titik").teks.replace("*6.", "Senin, 2 November 2026\n*6."));   // tanda tangan Skadron Udara 6 -> H-3217, titik sama
  assert.equal(sat.j.operasi.temuan, 1); assert.equal(await n("op_temuan"), 7);
});

uji("keberangkatan dan kembali ke base menulis op_gerak dan status armada; kembali menjadikan tidak_siap", async () => {
  const a = await kirim(P("vn8416_departure").teks), b = await kirim(P("vhl6t_departure").teks);
  assert.deepEqual([a.j.operasi.gerak, b.j.operasi.gerak], [1, 1]);
  const kembali = await kirim(P("ur_csn_rtb").teks.replace("REG : UR-CSN", "Senin, 2 November 2026\nREG : UR-CSN"));
  assert.deepEqual([kembali.j.operasi.gerak, kembali.j.operasi.status], [1, 1]);
  const j = await peta();
  const g = Object.fromEntries(j.gerak.map(x => [x.registrasi, x]));
  assert.deepEqual([g["VN-8416"].jenis, g["VN-8416"].jam_utc, g["VN-8416"].misi], ["berangkat", Date.parse("2026-11-02T01:28Z"), "wb"]);
  assert.deepEqual([g["VH-L6T"].jenis, g["VH-L6T"].jam_utc], ["berangkat", Date.parse("2026-11-02T02:05Z")]);
  assert.deepEqual([g["UR-CSN"].jenis, g["UR-CSN"].jam_utc], ["kembali", Date.parse("2026-11-02T04:32Z")]);
  // lokasi target, rujukan patroli, dan alasan kembali ikut tersimpan (bahan metrik M7 waktu respons)
  assert.deepEqual([g["VH-L6T"].rujukan, g["VH-L6T"].lat, g["VH-L6T"].lon], ["PK-FPA", -0.10111, 109.59278]);
  assert.deepEqual([g["VN-8416"].lokasi, g["VN-8416"].lat], ["Air Hitam Besar, Kec. Kendawangan, Kab. Ketapang", -2.84278]);
  assert.equal(g["UR-CSN"].alasan, "Problem Fuel Pump");
  const ur = j.armada.find(x => x.registrasi === "UR-CSN"); assert.deepEqual([ur.status, ur.alasan, ur.sumber], ["tidak_siap", "Problem Fuel Pump", "wa"]);
  await kirim(P("vn8416_departure").teks + "\n", Date.now() - 30e3);   // departure yang sama dikirim lagi: tidak menggandakan gerak
  assert.equal(await n("op_gerak", "registrasi = 'VN-8416'"), 1);
});

uji("koordinat rusak ditahan di respons tanpa menulis; bukan operasi dan bukti WB tidak menulis", async () => {
  const before = await n("op_temuan");
  const r = await kirim(P("fpa_koordinat_rusak").teks + "\nSenin, 2 November 2026");
  assert.deepEqual(r.j.operasi.tertahan, [{alasan: "koordinat", lokasi: "Sejowet, Kuala Behe, Landak"}]); assert.equal(r.j.operasi.temuan, 0);
  const tp = await kirim(P("tanpa_registrasi").teks + "\nSenin, 2 November 2026");
  assert.deepEqual(tp.j.operasi.tertahan, [{alasan: "registrasi", lokasi: "Danau Sembuluh, Kab. Seruyan"}]);
  const bw = await kirim(P("n814ar_before_wb").teks); assert.equal(bw.j.disimpan, true); assert.equal(bw.j.operasi.dikenali, "bukti_wb"); assert.equal(bw.j.operasi.temuan + bw.j.operasi.gerak, 0);
  const bo = await kirim(P("bukan_operasi").teks); assert.equal(bo.j.operasi, undefined, "pesan biasa tidak membawa kunci operasi");
  assert.equal(await n("op_temuan"), before);
});

uji("grup operasi: anggota tak terdaftar disimpan hanya bila dikenali, tanpa nomor HP, nama, dan lampiran", async () => {
  const G = "120363012345678901@g.us";
  const kirimGrup = async (teks, {grup = G, dari = "6289900001111", berkas} = {}) => {
    const f = new FormData(); f.set("dari", dari); f.set("nama", "Capt. Anggota"); f.set("teks", teks); if (grup) f.set("grup", grup);
    if (berkas) f.set("berkas", new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], {type: "image/jpeg"}), "foto.jpg");
    const r = await mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers: {"x-wa-kunci": "kunci-wa"}, body: f});
    return {s: r.status, j: await r.json()};
  };
  const awal = await n("wa_masuk");
  assert.equal((await kirimGrup("Siap, terima kasih komandan", {})).j.disimpan, false, "obrolan grup dibuang");
  assert.equal((await kirimGrup(P("byson_tanda_panggil").teks, {grup: null})).j.disimpan, false, "anggota tak terdaftar tanpa tanda grup tetap dibuang");
  assert.equal((await kirimGrup(P("byson_tanda_panggil").teks, {grup: "bukan-jid"})).j.disimpan, false, "tanda grup tak sah dibuang");
  const r = await kirimGrup(P("byson_tanda_panggil").teks + "\nSenin, 2 November 2026", {berkas: true});
  assert.equal(r.s, 200); assert.equal(r.j.disimpan, true); assert.equal(r.j.operasi.temuan, 1);
  const row = await DB.prepare("SELECT dari, nama, berkas FROM wa_masuk WHERE id = ?").bind(r.j.id).first();
  assert.deepEqual([row.dari, row.nama, row.berkas], [G, null, null], "pengirim diganti id grup; nama dan lampiran tidak disimpan");
  assert.equal(await n("wa_masuk"), awal + 1);
});

const F3 = JSON.parse(readFileSync(path.join(AKAR, "tests/warga/fixtures/operasi_wa_031126.json"), "utf8"));
test("urai 3 Nov: rencana banyak titik, demobilisasi, ferry RDPL, OMC, jam Z pagi WITA", () => {
  for (const p of F3.pesan) assert.deepEqual(urai(p.teks, {tanggal: "2026-11-03", armada: F3.armada}), p.harap, p.id);
  const g = id => urai(F3.pesan.find(p => p.id === id).teks, {tanggal: "2026-11-03", armada: F3.armada}).gerak[0];
  assert.equal(JSON.parse(g("ikc_rencana").rute).length, 2, "rencana PK-IKC menyimpan semua titik");
  assert.equal(g("snk_omc").jam_utc, "2026-11-02T23:05Z", "23.05Z = 07.05 WITA 3 Nov, masih 2 Nov di UTC");
  assert.equal(g("rdpl_ferry").registrasi, "RDPL-34194");
  assert.deepEqual([g("rty_departure_mvt").jenis, g("rty_departure_mvt").jam_utc, JSON.parse(g("rty_departure_mvt").rute).length], ["berangkat", "2026-11-03T02:37Z", 8], "\"Departure MVT\" dikenali; titik berlintang E salah ketik dibuang");
  assert.equal(g("ra22747_wb_target").target.lokasi, "Tanah Pilih, Banyuasin", "lokasi target = baris sebelum koordinat, bukan jam Eng.Start");
  assert.equal(JSON.parse(g("ale_rencana_sortie2").rute).length, 8);
});

uji("rencana banyak titik tersimpan di rute; demobilisasi menjadikan armada tidak siap", async () => {
  const P3 = id => F3.pesan.find(p => p.id === id).teks;
  const a = await kirim(P3("ikc_rencana").replace("Selasa, 3 November 2026", "Senin, 2 November 2026"));
  const b = await kirim(P3("n4875a_demob").replace("Selasa, 3 November 2026", "Senin, 2 November 2026"));
  assert.deepEqual([a.j.operasi.gerak, b.j.operasi.gerak, b.j.operasi.status], [1, 1, 1]);
  const j = await peta(), r = j.gerak.find(x => x.registrasi === "PK-IKC" && x.jenis === "rencana");
  assert.equal(JSON.parse(r.rute).length, 2);
  assert.deepEqual([r.lat, r.lon], [JSON.parse(r.rute)[0].lat, JSON.parse(r.rute)[0].lon]);
  const n = j.armada.find(x => x.registrasi === "N-4875A"); assert.deepEqual([n.status, n.alasan], ["tidak_siap", "demobilisasi"]);
});

uji("peta operasi tetap tertutup untuk tamu: temuan hasil WA tidak bocor", async () => {
  assert.equal((await api("GET", `/api/operasi/peta?tanggal=${TGL}`)).s, 403);
});

uji("tanpa migrasi 0103 pesan WA tetap tersimpan, tanpa galat", async () => {
  const V = await siapkan("uji-operasi-wa-tanpa", {r2: true, ikat: {WA_KUNCI: "kunci-wa", WA_IZIN: "0812 3456 7890"}});
  for (const t of ["op_target", "op_renlap", "op_temuan", "op_gerak", "op_armada_status", "op_armada", "op_base"]) await V.DB.prepare(`DROP TABLE ${t}`).run();
  const r = await kirim(P("h3217_pelaksanaan").teks, undefined, V.mf);
  assert.equal(r.s, 200, r.t); assert.equal(r.j.disimpan, true); assert.equal(r.j.operasi, undefined);
  assert.equal(await V.n("wa_masuk"), 1);
});
