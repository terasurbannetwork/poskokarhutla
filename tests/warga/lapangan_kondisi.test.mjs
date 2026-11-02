/* LP-022 sisa: bot WA menanyakan kondisi lapangan harian (src/lapangan_wa.js tanyaKondisi + balasKondisi, lewat kait src/wa.js).
   Worker utuh di Miniflare + D1 sungguhan. Kasus DITOLAK: kode orang lain, nomor salah, nilai liar, dummy, jenis tak sesuai, sudah diverifikasi. */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";
import {tanyaKondisi} from "../../src/lapangan_wa.js";
import {tanggalWIB} from "../../src/lapangan_konst.js";

const U = await siapkan("uji-lapangan-kondisi", {ikat: {WA_KUNCI: "kunci-wa-uji"}}), uji = berantai(), DB = U.DB, ENV = {DB, IP_SALT: "garam-uji"};
const HARI = 864e5, KUNCI = {"x-wa-kunci": "kunci-wa-uji"};
const baris = (q, ...p) => DB.prepare(q).bind(...p).all().then(r => r.results);
let nId = 0;
const id16 = () => (0xc000000000000000n + BigInt(++nId)).toString(16);
const orang = async (nama, wa, dummy = 0) => { const id = id16(); await DB.prepare("INSERT INTO orang (id, jenis, nama, wa, prov, status, wajah_status, dibuat, diubah, dummy) VALUES (?, 'pegawai', ?, ?, '62', 'aktif', 'belum', 1, 1, ?)").bind(id, nama, wa, dummy).run(); return id; };
const tugas = async (judul, bencana, anggota, dummy = 0) => {
  const id = id16(); await DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat, dummy) VALUES (?, ?, ?, -2.3, 114.4, 2000, ?, ?, 1, ?)").bind(id, judul, bencana, Date.now() - HARI / 2, Date.now() + 3 * HARI, dummy).run();
  for (const a of anggota) await DB.prepare("INSERT INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, 'anggota')").bind(id, a).run();
  return id;
};
async function balasWA(dari, teks) {
  const f = new FormData(); f.append("dari", dari); f.append("teks", teks);
  const {body, headers} = await badanPanjang(f, KUNCI);
  const r = await U.mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers, body});
  return {s: r.status, j: await r.json()};
}
const kodeDari = pesan => /(?:API (?:MENYALA|BARA|PADAM|BUKAN)|GENANGAN \d+) ([A-Z]{6})/.exec(pesan)?.[1];
const NO = {api1: "6281200000001", api2: "6281200000002", ban: "6281200000003", tanpa: "6281200000004", dum: "6281200000005", sudah: "6281200000006", asing: "6281200000009"};
const hari = tanggalWIB(Date.now());
let O = {}, T = {};

uji("tanya: hanya anggota tugas aktif ber-WA yang belum isi logbook; dummy, tanpa WA, bencana lain dilewati; ulang tidak menggandakan", async () => {
  O.api1 = await orang("Ani", NO.api1); O.api2 = await orang("Budi", NO.api2); O.ban = await orang("Cici", NO.ban); O.tanpa = await orang("Tanpa WA", null);
  O.dum = await orang("Dummy", NO.dum, 1); O.sudah = await orang("Sudah Isi", NO.sudah);
  T.api = await tugas("Patroli gambut", "karhutla", [O.api1, O.api2, O.tanpa, O.dum, O.sudah]);
  T.ban = await tugas("Posko banjir", "banjir", [O.ban]);
  T.lain = await tugas("Gempa", "gempa", [await orang("Gempa", "6281200000008")]);
  await DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, waktu, diubah) VALUES (?, ?, ?, ?, 'patroli', 1, 1)").bind(id16(), O.sudah, T.api, hari).run();
  assert.equal((await tanyaKondisi(ENV, Date.now())).n, 3);
  const p = await baris("SELECT tujuan, pesan, rujukan, dummy FROM wa_antre WHERE jenis = 'tanya_kondisi' ORDER BY tujuan");
  assert.deepEqual(p.map(x => x.tujuan), [NO.api1, NO.api2, NO.ban]);
  assert.ok(p.every(x => !x.dummy && /centurisk97\.id\/petugas/.test(x.pesan)));
  assert.match(p[0].pesan, /API MENYALA [A-Z]{6}/); assert.match(p[2].pesan, /GENANGAN 30 [A-Z]{6}/);
  assert.notEqual(kodeDari(p[0].pesan), kodeDari(p[1].pesan), "kode per orang");
  assert.equal((await tanyaKondisi(ENV, Date.now())).n, 0, "dedup satu pesan per orang per hari");
  assert.equal((await tanyaKondisi({DB}, Date.now())).n, 0, "tanpa IP_SALT tidak mengirim");
});

uji("balasan DITOLAK: kode orang lain, nomor salah, kode ngawur, jenis tak sesuai, nilai liar, dummy; tidak ada logbook/label tercipta", async () => {
  const p = Object.fromEntries((await baris("SELECT tujuan, pesan FROM wa_antre WHERE jenis = 'tanya_kondisi'")).map(x => [x.tujuan, kodeDari(x.pesan)]));
  const kosong = async () => assert.equal((await baris("SELECT count(*) n FROM lapangan_label"))[0].n, 0);
  for (const [dari, teks, alasan] of [
    [NO.api2, `API PADAM ${p[NO.api1]}`, /tidak berlaku/],      // kode milik Ani dipakai Budi
    [NO.asing, `API PADAM ${p[NO.api1]}`, /tidak berlaku/],     // nomor tak dikenal
    [NO.api1, "API PADAM ZZZZZZ", /tidak berlaku/],              // kode ngawur
    [NO.api1, `GENANGAN 30 ${p[NO.api1]}`, /tidak sesuai/],      // jenis banjir pada tugas karhutla
    [NO.ban, `API BARA ${p[NO.ban]}`, /tidak sesuai/],
    [NO.ban, `GENANGAN 9999 ${p[NO.ban]}`, /sampai 500/],        // nilai liar
    [NO.dum, "API BARA ABCDEF", /tidak berlaku/],                // dummy tak pernah sah
  ]) { const r = await balasWA(dari, teks); assert.equal(r.s, 200); assert.equal(r.j.diterima, false, teks); assert.match(r.j.alasan, alasan, teks); }
  assert.equal((await balasWA(NO.api1, "API NYALA " + p[NO.api1])).j.disimpan, false, "kata liar bukan format: diteruskan ke alur lama (diam)");
  await kosong(); assert.equal((await baris("SELECT count(*) n FROM lp_logbook WHERE orang_id IN (?, ?)", O.api2, O.ban))[0].n, 0);
});

uji("balasan sah: logbook minimal + label terverifikasi 0; banjir cm; balas ulang memperbarui; yang sudah verifikasi tidak ditimpa", async () => {
  const p = Object.fromEntries((await baris("SELECT tujuan, pesan FROM wa_antre WHERE jenis = 'tanya_kondisi'")).map(x => [x.tujuan, kodeDari(x.pesan)]));
  let r = await balasWA(NO.api1, `api menyala ${p[NO.api1].toLowerCase()}`); assert.equal(r.j.diterima, true);
  let lb = (await baris("SELECT id, kegiatan, kondisi FROM lp_logbook WHERE orang_id = ?", O.api1))[0];
  assert.equal(lb.kegiatan, "pemantauan"); assert.deepEqual(JSON.parse(lb.kondisi), {kondisi_api: "menyala"});
  assert.equal((await baris("SELECT count(*) n FROM lp_logbook_foto WHERE logbook_id = ?", lb.id))[0].n, 0);
  let lab = (await baris("SELECT jenis, nilai, terverifikasi, lat FROM lapangan_label WHERE sumber_id = ?", lb.id))[0];
  assert.equal(lab.jenis, "api"); assert.equal(lab.terverifikasi, 0); assert.equal(lab.lat, -2.3); assert.deepEqual(JSON.parse(lab.nilai), {kondisi_api: "menyala"});
  r = await balasWA(NO.api1, `API PADAM ${p[NO.api1]}`); assert.equal(r.j.diterima, true);
  assert.equal((await baris("SELECT count(*) n FROM lp_logbook WHERE orang_id = ?", O.api1))[0].n, 1);
  assert.deepEqual(JSON.parse((await baris("SELECT nilai FROM lapangan_label WHERE sumber_id = ?", lb.id))[0].nilai), {kondisi_api: "padam"});
  r = await balasWA(NO.ban, `GENANGAN 45 ${p[NO.ban]}.`); assert.equal(r.j.diterima, true);
  lab = (await baris("SELECT l.jenis, l.nilai, l.terverifikasi FROM lapangan_label l JOIN lp_logbook b ON b.id = l.sumber_id WHERE b.orang_id = ?", O.ban))[0];
  assert.equal(lab.jenis, "banjir"); assert.deepEqual(JSON.parse(lab.nilai), {tinggi_genangan_cm: 45}); assert.equal(lab.terverifikasi, 0);
  await DB.prepare("UPDATE lapangan_label SET terverifikasi = 1 WHERE sumber_id = ?").bind(lb.id).run();
  r = await balasWA(NO.api1, `API BARA ${p[NO.api1]}`); assert.equal(r.j.diterima, false); assert.match(r.j.alasan, /diverifikasi/);
  assert.equal((await baris("SELECT nilai FROM lapangan_label WHERE sumber_id = ?", lb.id))[0].nilai, '{"kondisi_api":"padam"}');
  assert.equal((await tanyaKondisi(ENV, Date.now())).n, 0, "yang sudah isi logbook tidak ditanya lagi");
});

uji("laju per nomor: balasan ke-21 dalam sejam dijawab 429", async () => {
  let s = 0; for (let i = 0; i < 22; i++) s = (await balasWA(NO.asing, "API BARA ZZZZZZ")).s;
  assert.equal(s, 429);
});

uji("halaman lama belum dialihkan (LP-048, KEPUTUSAN-LAPANGAN bagian D): /lacak, /lapangan, /relawan/saya tetap 200 sampai fiturnya setara di /petugas", async () => {
  for (const j of ["/lacak", "/lapangan", "/relawan/saya"]) {
    const r = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {redirect: "manual"});
    assert.equal(r.status, 200, j); assert.ok(!r.headers.get("location"), j); await r.text();
  }
});

uji("balasan WA tidak merusak label dari logbook aplikasi: tugas_api_id dan lat/lon foto bertahan, nilai digabung", async () => {
  const o = await orang("Dedi", "6281200000020"), t = await tugas("Patroli api", "karhutla", [o]);
  await tanyaKondisi(ENV, Date.now());
  const k = kodeDari((await baris("SELECT pesan FROM wa_antre WHERE tujuan = ?", "6281200000020"))[0].pesan);
  const lb = id16();   // sesudah ditanya, petugas mengisi logbook lewat aplikasi (foto + label bertaut tugas api)
  await DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, kondisi, waktu, diubah) VALUES (?, ?, ?, ?, 'patroli', '{\"kondisi_api\":\"bara\",\"akses\":\"motor\"}', 1, 1)").bind(lb, o, t, hari).run();
  await DB.prepare("INSERT INTO lapangan_label (id, sumber_id, jenis, nilai, lat, lon, waktu, terverifikasi) VALUES (?, ?, 'api', ?, -2.5, 114.6, 1, 0)").bind(id16(), lb, JSON.stringify({kondisi_api: "bara", akses: "motor", tugas_api_id: "abc123", jarak_tugas_m: 321})).run();
  assert.equal((await balasWA("6281200000020", `API PADAM ${k}`)).j.diterima, true);
  const l = (await baris("SELECT nilai, lat, lon FROM lapangan_label WHERE sumber_id = ?", lb))[0];
  assert.deepEqual(JSON.parse(l.nilai), {kondisi_api: "padam", akses: "motor", tugas_api_id: "abc123", jarak_tugas_m: 321});
  assert.equal(l.lat, -2.5); assert.equal(l.lon, 114.6);
});
