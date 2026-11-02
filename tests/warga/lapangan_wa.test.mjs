/* Modul Lapangan tahap C (src/lapangan_wa.js + src/lapangan_panel.js + kait src/wa.js, migrasi 0099): panggilan relawan lewat WA, antrean/hasil gerbang, pesan penugasan,
   ekspor CSV, penanda keahlian, label, retensi foto 2 tahun. Worker utuh di Miniflare + D1 + R2 sungguhan, tanpa mock. Tiap rute punya kasus DITOLAK. (U-11, U-14, LP-020 .. LP-049)
   Berantai: satu cerita, urutan penting. */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN, MOD2, sha256} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";
import {bersihkanLapangan} from "../../src/lapangan_panel.js";

const U = await siapkan("uji-lapangan-c", {r2: true, ikat: {WA_KUNCI: "kunci-wa-uji"}}), uji = berantai(), DB = U.DB;
const PB = {"x-pb": "1"}, MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, KUNCI = {"x-wa-kunci": "kunci-wa-uji"};
const SEMUA = [];   // semua badan balasan, dipindai di akhir: kode pribadi dan vektor tidak boleh muncul (U-11)
const api = async (m, j, b, h = {}) => { const r = await U.api(m, j, b, {...PB, ...h}); SEMUA.push(r.t); return r; };
const baris = (q, ...p) => DB.prepare(q).bind(...p).all().then(r => r.results);
const satu = (q, ...p) => baris(q, ...p).then(r => r[0]);

let nId = 0;
const id16 = () => (0xb000000000000000n + BigInt(++nId)).toString(16);
const STAF = (peran, tok, id, nip, wilayah = "[]") => DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
  VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, ?, 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, "staf" + id.slice(0, 3), "Nama " + id.slice(0, 3), nip, id.slice(0, 3) + "@x.id", "62811" + nip.slice(0, 8), peran, wilayah),
  DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + JAM)]);
const TOK_P = "c".repeat(64), TOK_V = "b".repeat(64), TOK_W = "d".repeat(64);
await STAF('["pimpinan"]', TOK_P, "e1e1e1e1e1e1e1e1", "3100310031003");
await STAF('["verifikator"]', TOK_V, "e2e2e2e2e2e2e2e2", "3200320032003");
await STAF('["pimpinan"]', TOK_W, "e3e3e3e3e3e3e3e3", "3300330033003", '["99"]');
const sesi = tok => ({cookie: "sesi_staf=" + tok, ...PB});
const tanpaPB = h => ({cookie: h.cookie, origin: "http://bnpb.lokal"});
const PIMPINAN = sesi(TOK_P), VERIF = sesi(TOK_V), WIL99 = sesi(TOK_W);

async function orang(nama, {wa = null, prov = "62", dummy = 0, relawan = null} = {}) {
  const id = id16(), kode = id.slice(-2).repeat(13);
  await DB.prepare("INSERT INTO orang (id, jenis, relawan_id, nama, wa, prov, status, kode_sha, wajah_status, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, 'aktif', ?, 'belum', 1, 1, ?)")
    .bind(id, relawan ? "relawan" : "pegawai", relawan, nama, wa, prov, sha256(kode), dummy).run();
  return {id, kode};
}
async function relawan(nama, wa, {prov = "62", kab = "Kapuas", keahlian = ["pemadaman"], status = "siap_tugas", luar = 0} = {}) {
  const id = id16();
  await DB.prepare(`INSERT INTO relawan (id, nama, wa, prov, kab, jalur, keahlian, hari_per_minggu, maks_hari, luar_provinsi, status, setuju_pdp, anonim, dibuat, diubah, dummy)
    VALUES (?, ?, ?, ?, ?, 'umum', ?, 3, 30, ?, ?, 1, 0, 1, 1, 0)`).bind(id, nama, wa, prov, kab, JSON.stringify(keahlian), luar, status).run();
  return id;
}
/* gerbang WA: multipart dari gerbang Baileys */
async function balasWA(dari, teks, kunci = KUNCI) {
  const f = new FormData(); f.append("dari", dari); f.append("teks", teks);
  const {body, headers} = await badanPanjang(f, kunci);
  const r = await U.mf.dispatchFetch("http://bnpb.lokal/api/wa/gateway", {method: "POST", headers, body});
  const t = await r.text(); SEMUA.push(t); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t};
}
const GW = (m, j, b, h = KUNCI) => U.api(m, j, b, h).then(r => { SEMUA.push(r.t); return r; });   // gerbang tidak membawa x-pb

const NOMOR = {r1: "6281100000001", r2: "6281100000002", r3: "6281100000003", r4: "6281100000004", r5: "6281100000005", r6: "6281100000006", r7: "6281100000007", a: "6281100000010", b: "6281100000011", d: "6281100000012"};
let A, B, DUMMY, TUGAS, R = {}, O7, P1, P2;
let CODE = {};   // relawan_id -> kode balas, dibaca dari D1

uji("pesan penugasan (LP-022/040): anggota baru dapat pesan dengan Renlap dan tautan /petugas; ulang tidak menggandakan; dummy dan tanpa WA dilewati", async () => {
  A = await orang("Ani Lapangan", {wa: NOMOR.a}); B = await orang("=HYPERLINK(Beni)", {wa: NOMOR.b}); DUMMY = await orang("Contoh Dummy", {wa: NOMOR.d, dummy: 1});
  const NOWA = await orang("Tanpa Nomor");
  const mulai = Date.now() - HARI, selesai = Date.now() + 5 * HARI;
  const badan = anggota => ({judul: "Patroli gambut Kapuas", bencana: "karhutla", lat: -2.3, lon: 114.4, radius_m: 2000, wilayah_teks: "Kapuas, Kalteng", renlap_url: "https://centurisk97.id/renlap/uji", mulai, selesai, anggota});
  assert.equal((await U.api("POST", "/api/petugas/panel/tugas", badan([A.id]), tanpaPB(PIMPINAN))).s, 403, "tanpa x-pb");
  const t = await api("POST", "/api/petugas/panel/tugas", badan([A.id, DUMMY.id, NOWA.id]), PIMPINAN); assert.equal(t.s, 201, t.t); TUGAS = t.j.id;
  let pesan = await baris("SELECT tujuan, pesan, jenis, rujukan FROM wa_antre WHERE jenis = 'penugasan'");
  assert.equal(pesan.length, 1, "hanya Ani (dummy dan tanpa WA dilewati)");
  assert.equal(pesan[0].tujuan, NOMOR.a); assert.equal(pesan[0].rujukan, A.id);
  assert.match(pesan[0].pesan, /Patroli gambut Kapuas/); assert.match(pesan[0].pesan, /https:\/\/centurisk97\.id\/renlap\/uji/); assert.match(pesan[0].pesan, /centurisk97\.id\/petugas/);
  assert.ok(!pesan[0].pesan.includes(A.kode) && !/#k=/.test(pesan[0].pesan), "tanpa kode pribadi");
  const ubah = await api("POST", "/api/petugas/panel/tugas", {...badan([A.id, B.id, DUMMY.id, NOWA.id]), id: TUGAS}, PIMPINAN); assert.equal(ubah.s, 200, ubah.t);
  pesan = await baris("SELECT tujuan FROM wa_antre WHERE jenis = 'penugasan' ORDER BY dibuat, tujuan");
  assert.deepEqual(pesan.map(x => x.tujuan).sort(), [NOMOR.a, NOMOR.b], "anggota lama tidak dikirimi ulang, yang baru dapat satu");
  assert.equal((await api("POST", "/api/petugas/panel/tugas", {...badan([A.id, B.id]), id: TUGAS}, PIMPINAN)).s, 200);
  assert.equal(await satu("SELECT count(*) n FROM wa_antre WHERE jenis = 'penugasan'").then(x => x.n), 2, "simpan ulang tanpa anggota baru = nol pesan baru");
});

uji("panggilan: ditolak tanpa penjaga, tanpa x-pb, isian liar, wilayah lain, tugas tak ada; sah memilih penerima menurut keahlian, wilayah, status (LP-041, ALG §8)", async () => {
  R.r1 = await relawan("Rina Satu", NOMOR.r1); R.r2 = await relawan("Rudi Dua", NOMOR.r2); R.r3 = await relawan("Rita Tiga", NOMOR.r3);
  R.r4 = await relawan("Luar Provinsi", NOMOR.r4, {prov: "31"});          // provinsi lain, tidak bersedia luar provinsi: bukan penerima
  R.r5 = await relawan("Belum Siap", NOMOR.r5, {status: "diverifikasi"});   // belum siap tugas
  R.r6 = await relawan("Dokter", NOMOR.r6, {keahlian: ["medis"]});          // keahlian beda
  R.r7 = await relawan("Tukang Drone", NOMOR.r7, {keahlian: []});           // keahlian hanya lewat penanda orang_keahlian
  O7 = await orang("Tukang Drone", {wa: NOMOR.r7, relawan: R.r7});
  const sah = {tugas_id: TUGAS, keahlian: ["pemadaman"], prov: "62", kab: "Kapuas", kuota: 2, batas_jam: 24, pesan: "Bawa sepatu bot"};
  const kirimP = (b, h = PIMPINAN) => api("POST", "/api/petugas/panel/panggil", b, h);
  assert.equal((await U.api("POST", "/api/petugas/panel/panggil", sah, tanpaPB(PIMPINAN))).s, 403, "tanpa x-pb");
  assert.equal((await kirimP(sah, {})).s, 403, "tanpa penjaga");
  assert.equal((await kirimP(sah, VERIF)).s, 403, "staf verifikator bukan pimpinan/koordalops");
  for (const [salah, ket] of [[{kuota: 0}, "kuota 0"], [{kuota: 101}, "kuota 101"], [{kuota: 1.5}, "kuota pecahan"], [{keahlian: []}, "keahlian kosong"], [{keahlian: ["Medis!"]}, "keahlian liar"], [{keahlian: ["a_a", "a_a"]}, "keahlian ganda"],
    [{prov: "6"}, "prov"], [{batas_jam: 0}, "batas 0"], [{batas_jam: 73}, "batas 73"], [{tugas_id: "bukan"}, "tugas_id"], [{pesan: "p".repeat(301)}, "pesan panjang"], [{kab: "x"}, "kab pendek"]])
    assert.equal((await kirimP({...sah, ...salah})).s, 400, ket);
  assert.equal((await kirimP({...sah, tugas_id: "f".repeat(16)})).s, 404, "tugas tak ada");
  assert.equal((await kirimP(sah, WIL99)).s, 403, "staf wilayah 99 tidak boleh memanggil di provinsi 62");
  assert.equal((await kirimP({...sah, prov: "99"}, WIL99)).s, 404, "tugas tanpa anggota di wilayahnya tidak terlihat");
  assert.equal(await satu("SELECT count(*) n FROM lp_panggil").then(x => x.n), 0, "semua penolakan tidak menulis apa pun");
  const ok = await kirimP(sah); assert.equal(ok.s, 201, ok.t); P1 = ok.j.id;
  assert.equal(ok.j.penerima, 3, "r1, r2, r3");
  const pen = await baris("SELECT relawan_id, kode_balas, status FROM lp_panggil_penerima WHERE panggil_id = ?", P1);
  assert.deepEqual(pen.map(x => x.relawan_id).sort(), [R.r1, R.r2, R.r3].sort());
  assert.ok(pen.every(x => /^[A-Z]{6}$/.test(x.kode_balas) && x.status === "antre")); assert.equal(new Set(pen.map(x => x.kode_balas)).size, 3);
  for (const x of pen) CODE[x.relawan_id] = x.kode_balas;
  const msg = await baris("SELECT tujuan, pesan, rujukan FROM wa_antre WHERE jenis = 'panggil'"); assert.equal(msg.length, 3);
  const m1 = msg.find(x => x.tujuan === NOMOR.r1); assert.match(m1.pesan, new RegExp(`SIAP ${CODE[R.r1]}`)); assert.match(m1.pesan, new RegExp(`TIDAK ${CODE[R.r1]}`)); assert.match(m1.pesan, /Bawa sepatu bot/);
  assert.ok(!m1.pesan.includes(CODE[R.r2]), "kode relawan lain tidak bocor");
  const perm = await satu("SELECT status, prov, butuh FROM relawan_permintaan WHERE id = ?", P1); assert.equal(perm.status, "buka"); assert.deepEqual(JSON.parse(perm.butuh), [{keahlian: "pemadaman", jumlah: 2}]);
  // penanda keahlian: r7 hanya terpanggil lewat orang_keahlian (kuota 1, drone)
  assert.equal((await api("POST", "/api/petugas/panel/keahlian", {orang_id: O7.id, keahlian: "drone", bukti: "Lisensi drone 2026"}, ADMIN)).s, 200);
  const dr = await kirimP({...sah, keahlian: ["drone"], kuota: 1}); assert.equal(dr.s, 201, dr.t); P2 = dr.j.id; assert.equal(dr.j.penerima, 1);
  assert.equal((await satu("SELECT relawan_id FROM lp_panggil_penerima WHERE panggil_id = ?", P2)).relawan_id, R.r7);
  CODE[R.r7] = (await satu("SELECT kode_balas FROM lp_panggil_penerima WHERE panggil_id = ?", P2)).kode_balas;
  const kosong = await kirimP({...sah, keahlian: ["sar"]}); assert.equal(kosong.s, 201); assert.equal(kosong.j.penerima, 0, "tak ada yang cocok = nol penerima, bukan galat");
});

uji("daftar panggilan: hanya penjaga, wilayah, parameter; angka siap/tidak/antre", async () => {
  assert.equal((await api("GET", `/api/petugas/panel/panggil?tugas_id=${TUGAS}`, undefined, {})).s, 403);
  assert.equal((await api("GET", `/api/petugas/panel/panggil?tugas_id=${TUGAS}`, undefined, VERIF)).s, 403);
  assert.equal((await api("GET", "/api/petugas/panel/panggil?tugas_id=zz", undefined, PIMPINAN)).s, 400);
  assert.equal((await api("GET", `/api/petugas/panel/panggil?tugas_id=${TUGAS}`, undefined, WIL99)).s, 404, "wilayah lain");
  const d = await api("GET", `/api/petugas/panel/panggil?tugas_id=${TUGAS}`, undefined, PIMPINAN); assert.equal(d.s, 200);
  const p = d.j.panggil.find(x => x.id === P1); assert.deepEqual({kuota: p.kuota, status: p.status, siap: p.siap, tidak: p.tidak, antre: p.antre}, {kuota: 2, status: "buka", siap: 0, tidak: 0, antre: 3});
  assert.ok(p.batas > Date.now());
  assert.ok(d.j.panggil.every(x => !("kode_balas" in x) && !JSON.stringify(x).includes(CODE[R.r1])), "kode balas tidak keluar di daftar");
});

uji("gerbang WA: antre dan hasil ditolak tanpa kunci / kunci salah; tarik satu kali, tidak ditarik ulang 10 menit; hasil memutakhirkan penerima", async () => {
  assert.equal((await GW("GET", "/api/petugas/wa/antre", undefined, {})).s, 403, "tanpa kunci");
  assert.equal((await GW("GET", "/api/petugas/wa/antre", undefined, {"x-wa-kunci": "salah"})).s, 403, "kunci salah");
  assert.equal((await GW("POST", "/api/petugas/wa/hasil", {hasil: []}, {})).s, 403);
  const a = await GW("GET", "/api/petugas/wa/antre"); assert.equal(a.s, 200); assert.equal(a.j.ok, true);
  assert.equal(a.j.pesan.length, 6, "2 penugasan + 4 panggil (3 + 1; panggilan sar kosong tanpa pesan)");
  assert.deepEqual(Object.keys(a.j.pesan[0]).sort(), ["id", "jenis", "pesan", "tujuan"]);
  assert.equal((await baris("SELECT percobaan FROM wa_antre WHERE id = ?", a.j.pesan[0].id))[0].percobaan, 1);
  assert.equal((await GW("GET", "/api/petugas/wa/antre")).j.pesan.length, 0, "belum 10 menit: tidak ditarik ulang");
  // hasil: badan liar ditolak
  for (const b of [{}, {hasil: "x"}, {hasil: [{id: "pendek", ok: true}]}, {hasil: [{id: a.j.pesan[0].id}]}, {hasil: Array.from({length: 51}, () => ({id: id16(), ok: true}))}]) assert.equal((await GW("POST", "/api/petugas/wa/hasil", b)).s, 400, JSON.stringify(b).slice(0, 40));
  const panggil = a.j.pesan.filter(x => x.jenis === "panggil");
  const h = await GW("POST", "/api/petugas/wa/hasil", {hasil: [...panggil.map(x => ({id: x.id, ok: true})), {id: id16(), ok: true}]});
  assert.equal(h.s, 200); assert.equal(h.j.n, panggil.length, "id asing tidak dihitung");
  assert.equal((await baris("SELECT count(*) n FROM wa_antre WHERE status = 'dikirim'"))[0].n, panggil.length);
  assert.equal((await GW("POST", "/api/petugas/wa/hasil", {hasil: panggil.map(x => ({id: x.id, ok: false}))})).j.n, 0, "hasil ulang atas baris yang sudah dikirim tidak mengubah apa pun");
  assert.equal((await baris("SELECT status FROM lp_panggil_penerima WHERE panggil_id = ? AND relawan_id = ?", P1, R.r1))[0].status, "terkirim");
  // gagal 3 kali = gagal; sebelum itu tetap antre
  const g = id16(); await DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, status, percobaan, dibuat, dikirim, dummy) VALUES (?, ?, 'uji', 'uji', 'antre', 2, 1, 1, 0)").bind(g, NOMOR.a).run();
  const t = await GW("GET", "/api/petugas/wa/antre"); assert.deepEqual(t.j.pesan.map(x => x.id), [g]);
  await GW("POST", "/api/petugas/wa/hasil", {hasil: [{id: g, ok: false, galat: "nomor tidak terdaftar"}]});
  assert.equal((await baris("SELECT status, percobaan FROM wa_antre WHERE id = ?", g))[0].status, "gagal");
  const s = id16(); await DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, status, percobaan, dibuat, dikirim, dummy) VALUES (?, ?, 'uji', 'uji', 'antre', 0, 1, NULL, 0)").bind(s, NOMOR.a).run();
  await GW("GET", "/api/petugas/wa/antre"); await GW("POST", "/api/petugas/wa/hasil", {hasil: [{id: s, ok: false}]});
  assert.deepEqual({...(await baris("SELECT status, percobaan FROM wa_antre WHERE id = ?", s))[0]}, {status: "antre", percobaan: 1}, "gagal sekali masih boleh dicoba lagi");
});

uji("balasan SIAP/TIDAK (U-14): kunci gerbang wajib; kode salah dan kode orang lain ditolak tanpa mengubah apa pun", async () => {
  assert.equal((await balasWA(NOMOR.r1, `SIAP ${CODE[R.r1]}`, {})).s, 403, "tanpa x-wa-kunci");
  assert.equal((await balasWA(NOMOR.r1, `SIAP ${CODE[R.r1]}`, {"x-wa-kunci": "salah"})).s, 403);
  const salah = await balasWA(NOMOR.r1, "SIAP QQQQQQ"); assert.equal(salah.s, 200); assert.equal(salah.j.diterima, false);
  const orangLain = await balasWA(NOMOR.r2, `SIAP ${CODE[R.r1]}`); assert.equal(orangLain.j.diterima, false, "kode r1 dari nomor r2");
  const asing = await balasWA("6289999999999", `TIDAK ${CODE[R.r1]}`); assert.equal(asing.j.diterima, false, "nomor tak dikenal");
  assert.equal(orangLain.j.alasan, asing.j.alasan, "alasan sama rupa: tidak membocorkan kode mana yang ada");
  assert.equal((await baris("SELECT status FROM lp_panggil_penerima WHERE panggil_id = ? AND relawan_id = ?", P1, R.r1))[0].status, "terkirim", "tidak berubah");
  assert.equal(await satu("SELECT count(*) n FROM lp_anggota WHERE tugas_id = ?", TUGAS).then(x => x.n), 2);   // A dan B dari uji pertama
  // teks lain dari nomor tak terdaftar tetap diam seperti dulu
  const lain = await balasWA("6289999999999", "halo"); assert.deepEqual(lain.j, {ok: true, disimpan: false});
});

uji("SIAP sampai kuota jadi anggota + penugasan + pesan Renlap; sesudah kuota status penuh; TIDAK dicatat; balas ulang tidak ganda (U-14)", async () => {
  const sebelum = await satu("SELECT count(*) n FROM lp_anggota WHERE tugas_id = ?", TUGAS).then(x => x.n);
  const r1 = await balasWA(NOMOR.r1, `  siap ${CODE[R.r1].toLowerCase()} `); assert.equal(r1.j.diterima, true, r1.t);
  const o1 = await satu("SELECT id, jenis FROM orang WHERE relawan_id = ?", R.r1); assert.ok(o1); assert.equal(o1.jenis, "relawan");
  assert.equal(await satu("SELECT count(*) n FROM lp_anggota WHERE tugas_id = ? AND orang_id = ?", TUGAS, o1.id).then(x => x.n), 1);
  const pg = await satu("SELECT status, permintaan_id FROM relawan_penugasan WHERE relawan_id = ?", R.r1); assert.deepEqual({...pg}, {status: "diterima", permintaan_id: P1});
  assert.equal((await satu("SELECT status FROM relawan WHERE id = ?", R.r1)).status, "ditugaskan");
  const pesan = await baris("SELECT pesan, rujukan FROM wa_antre WHERE jenis = 'penugasan' AND tujuan = ?", NOMOR.r1); assert.equal(pesan.length, 1);
  assert.match(pesan[0].pesan, /renlap\/uji/); assert.match(pesan[0].pesan, /Rina Satu/); assert.equal(pesan[0].rujukan, o1.id);
  assert.equal((await balasWA(NOMOR.r1, `SIAP ${CODE[R.r1]}`)).j.alasan, "sudah dibalas", "ulang: idempoten");
  assert.equal((await baris("SELECT count(*) n FROM relawan_penugasan WHERE relawan_id = ?", R.r1))[0].n, 1);
  assert.equal(await satu("SELECT status FROM lp_panggil WHERE id = ?", P1).then(x => x.status), "buka", "baru 1 dari 2");
  // r3 SIAP = kuota terpenuhi
  assert.equal((await balasWA(NOMOR.r3, `SIAP ${CODE[R.r3]}`)).j.diterima, true);
  assert.equal(await satu("SELECT status FROM lp_panggil WHERE id = ?", P1).then(x => x.status), "penuh");
  assert.equal(await satu("SELECT count(*) n FROM lp_anggota WHERE tugas_id = ?", TUGAS).then(x => x.n), sebelum + 2);
  // r2 (pesannya sudah terkirim, belum menjawab) diberi tahu penuh; SIAP-nya ditolak
  assert.equal((await baris("SELECT status FROM lp_panggil_penerima WHERE panggil_id = ? AND relawan_id = ?", P1, R.r2))[0].status, "penuh");
  const infos = await baris("SELECT tujuan, pesan FROM wa_antre WHERE jenis = 'panggil_info'"); assert.ok(infos.some(x => x.tujuan === NOMOR.r2 && /terpenuhi/.test(x.pesan)));
  const r2 = await balasWA(NOMOR.r2, `SIAP ${CODE[R.r2]}`); assert.equal(r2.j.diterima, false); assert.equal(r2.j.alasan, "kuota penuh");
  assert.equal(await baris("SELECT 1 FROM orang WHERE relawan_id = ?", R.r2).then(x => x.length), 0, "r2 tidak dijadikan anggota");
  assert.equal(await baris("SELECT 1 FROM relawan_penugasan WHERE relawan_id = ?", R.r2).then(x => x.length), 0);
  assert.equal((await satu("SELECT status FROM relawan WHERE id = ?", R.r2)).status, "siap_tugas");
  const d = (await api("GET", `/api/petugas/panel/panggil?tugas_id=${TUGAS}`, undefined, PIMPINAN)).j.panggil.find(x => x.id === P1);
  assert.deepEqual({status: d.status, siap: d.siap, antre: d.antre}, {status: "penuh", siap: 2, antre: 0});
  // TIDAK (panggilan drone, kuota 1)
  assert.equal((await balasWA(NOMOR.r7, `TIDAK ${CODE[R.r7]}`)).j.diterima, true);
  assert.equal((await baris("SELECT status FROM lp_panggil_penerima WHERE relawan_id = ?", R.r7))[0].status, "tidak");
  assert.equal(await baris("SELECT 1 FROM relawan_penugasan WHERE relawan_id = ?", R.r7).then(x => x.length), 0);
  assert.equal((await balasWA(NOMOR.r7, `SIAP ${CODE[R.r7]}`)).j.alasan, "sudah dibalas", "TIDAK lalu SIAP ditolak");
});

uji("panggilan lewat batas atau ditutup menolak SIAP; relawan yang sudah tidak siap tugas ditolak", async () => {
  // r2 masih siap_tugas: panggilan baru kuota 1; batas dimajukan ke masa lalu
  const p = await api("POST", "/api/petugas/panel/panggil", {tugas_id: TUGAS, keahlian: ["pemadaman"], prov: "62", kab: "Kapuas", kuota: 1, batas_jam: 1}, ADMIN); assert.equal(p.s, 201, p.t); assert.equal(p.j.penerima, 1, "hanya r2 yang masih siap");
  const kode = (await satu("SELECT kode_balas FROM lp_panggil_penerima WHERE panggil_id = ?", p.j.id)).kode_balas;
  await DB.prepare("UPDATE lp_panggil SET batas = 1 WHERE id = ?").bind(p.j.id).run();
  const x = await balasWA(NOMOR.r2, `SIAP ${kode}`); assert.equal(x.j.diterima, false); assert.match(x.j.alasan, /ditutup|batas/);
  assert.equal(await baris("SELECT 1 FROM relawan_penugasan WHERE relawan_id = ?", R.r2).then(a => a.length), 0);
  // status relawan berubah jadi nonaktif sebelum membalas
  const p2 = await api("POST", "/api/petugas/panel/panggil", {tugas_id: TUGAS, keahlian: ["pemadaman"], prov: "62", kuota: 1, batas_jam: 5}, ADMIN); assert.equal(p2.s, 201);
  const kode2 = (await satu("SELECT kode_balas FROM lp_panggil_penerima WHERE panggil_id = ?", p2.j.id)).kode_balas;
  await DB.prepare("UPDATE relawan SET status = 'nonaktif' WHERE id = ?").bind(R.r2).run();
  assert.equal((await balasWA(NOMOR.r2, `SIAP ${kode2}`)).j.diterima, false);
  assert.equal(await baris("SELECT 1 FROM lp_anggota a JOIN orang o ON o.id = a.orang_id WHERE o.relawan_id = ?", R.r2).then(a => a.length), 0);
});

uji("ekspor CSV (LP-024): ditolak tanpa penjaga/parameter/wilayah; isi rekap benar; sel rumus dinetralkan; tanpa vektor, kode, nomor WA (U-11)", async () => {
  const absen = (o, jenis, tanggal, waktu, status = "sah") => DB.prepare(`INSERT INTO lp_absen (id, orang_id, tugas_id, jenis, tanggal, waktu, lat, lon, foto_key, foto_sha256, status, alasan, dummy) VALUES (?, ?, ?, ?, ?, ?, -2.3, 114.4, 'lapangan/absen/x.jpg', ?, ?, '[]', 0)`)
    .bind(id16(), o, TUGAS, jenis, tanggal, waktu, sha256(id16()), status).run();
  const T0 = Date.UTC(2026, 10, 1, 1, 0);
  await absen(A.id, "masuk", "2026-11-01", T0); await absen(A.id, "pulang", "2026-11-01", T0 + 8 * JAM);          // 480 menit
  await absen(A.id, "masuk", "2026-11-02", T0 + HARI, "lolos"); await absen(A.id, "pulang", "2026-11-02", T0 + HARI + 4 * JAM, "lolos");   // 240 menit
  await absen(B.id, "masuk", "2026-11-01", T0, "tinjau");
  await DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, waktu, diubah) VALUES (?, ?, ?, '2026-11-01', 'Patroli', 1, 1)").bind(id16(), A.id, TUGAS).run();
  const u = `/api/petugas/panel/ekspor.csv?tugas_id=${TUGAS}`;
  assert.equal((await api("GET", u, undefined, {})).s, 403, "tanpa penjaga"); assert.equal((await api("GET", u, undefined, VERIF)).s, 403);
  assert.equal((await api("GET", "/api/petugas/panel/ekspor.csv", undefined, PIMPINAN)).s, 400, "tanpa tugas_id");
  assert.equal((await api("GET", "/api/petugas/panel/ekspor.csv?tugas_id=zz", undefined, PIMPINAN)).s, 400);
  assert.equal((await api("GET", `/api/petugas/panel/ekspor.csv?tugas_id=${"f".repeat(16)}`, undefined, PIMPINAN)).s, 404);
  assert.equal((await api("GET", u, undefined, WIL99)).s, 404, "wilayah lain");
  const r = await U.mf.dispatchFetch("http://bnpb.lokal" + u, {headers: PIMPINAN}); const csv = await r.text(); SEMUA.push(csv);
  assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /text\/csv/); assert.match(r.headers.get("content-disposition"), /attachment/); assert.match(r.headers.get("cache-control"), /no-store/);
  const baris_ = csv.replace(/^﻿/, "").trim().split("\r\n");
  assert.equal(baris_[0], "nama,peran,hari_hadir,menit_layanan,logbook_terisi,absen_tinjau");
  assert.ok(baris_.includes("Ani Lapangan,anggota,2,720,1,0"), baris_.join("|"));
  assert.ok(baris_.includes("'=HYPERLINK(Beni),anggota,0,0,0,1"), "rumus dinetralkan, absen tinjau dihitung: " + baris_.join("|"));
  assert.ok(!baris_.some(x => /^=/.test(x)), "tidak ada sel berawalan =");
  for (const rahasia of [A.kode, B.kode, sha256(A.kode), NOMOR.a, NOMOR.b, "vektor"]) assert.ok(!csv.includes(rahasia), "CSV tidak memuat " + rahasia.slice(0, 8));
});

uji("daftar orang menurut keahlian (LP-046) dan penanda keahlian: hanya Super Admin menulis; wilayah dihormati", async () => {
  const keA = (b, h = ADMIN, m = "POST") => api(m, "/api/petugas/panel/keahlian", b, h);
  assert.equal((await U.api("POST", "/api/petugas/panel/keahlian", {orang_id: A.id, keahlian: "pompa"}, ADMIN)).s, 403, "tanpa x-pb");
  assert.equal((await keA({orang_id: A.id, keahlian: "pompa"}, PIMPINAN)).s, 403, "pimpinan bukan Super Admin");
  assert.equal((await keA({orang_id: A.id, keahlian: "pompa"}, MOD2)).s, 403, "moderator bukan Super Admin");
  assert.equal((await keA({orang_id: A.id, keahlian: "pompa"}, {})).s, 403);
  assert.equal((await keA({orang_id: "bukan", keahlian: "pompa"})).s, 400); assert.equal((await keA({orang_id: A.id, keahlian: "Pompa Air"})).s, 400); assert.equal((await keA({orang_id: A.id, keahlian: "pompa", bukti: "b".repeat(201)})).s, 400);
  assert.equal((await keA({orang_id: "f".repeat(16), keahlian: "pompa"})).s, 404);
  assert.equal((await keA({orang_id: A.id, keahlian: "pompa", bukti: "Operator pompa 2025"})).s, 200);
  assert.equal((await keA({orang_id: A.id, keahlian: "pompa", bukti: "Operator pompa 2026"})).s, 200, "ulang = perbarui bukti");
  assert.equal(await satu("SELECT count(*) n FROM orang_keahlian WHERE orang_id = ?", A.id).then(x => x.n), 1);
  assert.equal((await satu("SELECT bukti FROM orang_keahlian WHERE orang_id = ?", A.id)).bukti, "Operator pompa 2026");
  const ls = await api("GET", "/api/petugas/panel/orang?keahlian=pompa", undefined, PIMPINAN); assert.equal(ls.s, 200);
  assert.deepEqual(ls.j.orang.map(x => ({id: x.id, nama: x.nama, jenis: x.jenis, prov: x.prov, keahlian: x.keahlian})), [{id: A.id, nama: "Ani Lapangan", jenis: "pegawai", prov: "62", keahlian: ["pompa"]}]);
  assert.ok(!JSON.stringify(ls.j).includes(NOMOR.a) && !JSON.stringify(ls.j).includes("kode"), "tanpa WA dan kode");
  const dr = await api("GET", "/api/petugas/panel/orang?keahlian=drone", undefined, PIMPINAN); assert.deepEqual(dr.j.orang.map(x => x.id), [O7.id], "penanda orang_keahlian");
  const pm = await api("GET", "/api/petugas/panel/orang?keahlian=pemadaman", undefined, PIMPINAN); assert.ok(pm.j.orang.some(x => x.nama === "Rina Satu" && x.keahlian.includes("pemadaman")), "keahlian relawan ikut");
  assert.equal((await api("GET", "/api/petugas/panel/orang?keahlian=pompa", undefined, {})).s, 403); assert.equal((await api("GET", "/api/petugas/panel/orang?keahlian=pompa", undefined, VERIF)).s, 403);
  assert.equal((await api("GET", "/api/petugas/panel/orang?keahlian=Pompa!", undefined, PIMPINAN)).s, 400);
  assert.deepEqual((await api("GET", "/api/petugas/panel/orang?keahlian=pompa", undefined, WIL99)).j.orang, [], "staf wilayah 99 tidak melihat provinsi 62");
  assert.equal((await api("GET", "/api/petugas/panel/orang", undefined, PIMPINAN)).j.baris.length > 0, true, "tanpa ?keahlian tetap daftar lama");
  // batas 10 penanda per orang, lalu hapus
  for (let i = 0; i < 9; i++) assert.equal((await keA({orang_id: A.id, keahlian: "ahli_" + "abcdefghi"[i]})).s, 200);
  assert.equal((await keA({orang_id: A.id, keahlian: "ahli_z"})).s, 409, "penanda ke-11");
  assert.equal((await keA({orang_id: A.id, keahlian: "pompa"}, PIMPINAN, "DELETE")).s, 403);
  assert.equal((await keA({orang_id: A.id, keahlian: "pompa"}, ADMIN, "DELETE")).s, 200);
  assert.equal((await api("GET", "/api/petugas/panel/orang?keahlian=pompa", undefined, PIMPINAN)).j.orang.length, 0);
});

uji("label.json (LP-023): hanya token admin; hanya terverifikasi, bukan dummy; sejak menyaring", async () => {
  const lb = async (tanggal) => { const id = id16(); await DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, waktu, diubah) VALUES (?, ?, ?, ?, 'Patroli', 1, 1)").bind(id, B.id, TUGAS, tanggal).run(); return id; };
  const label = async (sumber, jenis, ver, waktu, dummy = 0) => DB.prepare("INSERT INTO lapangan_label (id, sumber_id, jenis, nilai, lat, lon, waktu, terverifikasi, dummy) VALUES (?, ?, ?, '{\"kondisi_api\":\"menyala\"}', -2.3, 114.4, ?, ?, ?)").bind(id16(), sumber, jenis, waktu, ver, dummy).run();
  await label(await lb("2026-10-01"), "api", 1, 1000); await label(await lb("2026-10-02"), "api", 0, 2000); await label(await lb("2026-10-03"), "banjir", 1, 3000, 1); await label(await lb("2026-10-04"), "banjir", 1, 4000);
  assert.equal((await api("GET", "/api/petugas/label.json", undefined, {})).s, 403, "tanpa token");
  assert.equal((await api("GET", "/api/petugas/label.json", undefined, {"x-admin-token": "bukan-token"})).s, 403);
  assert.equal((await api("GET", "/api/petugas/label.json", undefined, PIMPINAN)).s, 403, "sesi staf bukan token admin");
  const r = await api("GET", "/api/petugas/label.json", undefined, ADMIN); assert.equal(r.s, 200);
  assert.deepEqual(r.j.label.map(x => [x.jenis, x.waktu]), [["api", 1000], ["banjir", 4000]], "tak terverifikasi dan dummy tidak ikut");
  assert.deepEqual(Object.keys(r.j.label[0]).sort(), ["id", "jenis", "lat", "lon", "nilai", "waktu"]); assert.equal(r.j.label[0].nilai.kondisi_api, "menyala");
  assert.deepEqual((await api("GET", "/api/petugas/label.json?sejak=2000", undefined, ADMIN)).j.label.map(x => x.waktu), [4000]);
  assert.equal((await api("GET", "/api/petugas/label.json?sejak=abc", undefined, ADMIN)).s, 400);
});

uji("retensi foto 2 tahun (LP-049): foto R2 lama dihapus dan foto_key jadi 'dihapus', baris tetap; foto baru utuh", async () => {
  const bucket = await U.mf.getR2Bucket("MEDIA"), tua = Date.now() - 800 * HARI, baru = Date.now() - 30 * HARI;
  for (const k of ["lapangan/absen/tua.jpg", "lapangan/absen/baru.jpg", "lapangan/logbook/tua.jpg", "lapangan/logbook/baru.jpg"]) await bucket.put(k, new Uint8Array([1, 2, 3]));
  const lbId = (await satu("SELECT id FROM lp_logbook LIMIT 1")).id;
  const absen = (key, waktu, tgl) => DB.prepare(`INSERT INTO lp_absen (id, orang_id, tugas_id, jenis, tanggal, waktu, lat, lon, foto_key, foto_sha256, status, alasan, dummy) VALUES (?, ?, ?, 'masuk', ?, ?, -2.3, 114.4, ?, ?, 'sah', '[]', 0)`).bind(id16(), A.id, TUGAS, tgl, waktu, key, sha256(key)).run();
  await absen("lapangan/absen/tua.jpg", tua, "2024-09-01"); await absen("lapangan/absen/baru.jpg", baru, "2026-10-03");
  const foto = (key, waktu) => DB.prepare("INSERT INTO lp_logbook_foto (id, logbook_id, foto_key, sha256, waktu, dummy) VALUES (?, ?, ?, ?, ?, 0)").bind(id16(), lbId, key, sha256(key), waktu).run();
  await foto("lapangan/logbook/tua.jpg", tua); await foto("lapangan/logbook/baru.jpg", baru);
  const label0 = await satu("SELECT count(*) n FROM lapangan_label").then(x => x.n);
  await bersihkanLapangan({DB, MEDIA: bucket}, Date.now());
  assert.equal(await bucket.head("lapangan/absen/tua.jpg"), null); assert.equal(await bucket.head("lapangan/logbook/tua.jpg"), null);
  assert.ok(await bucket.head("lapangan/absen/baru.jpg")); assert.ok(await bucket.head("lapangan/logbook/baru.jpg"));
  assert.equal((await satu("SELECT foto_key, status, lat FROM lp_absen WHERE foto_sha256 = ?", sha256("lapangan/absen/tua.jpg"))).foto_key, "dihapus");
  assert.equal((await satu("SELECT status FROM lp_absen WHERE foto_sha256 = ?", sha256("lapangan/absen/tua.jpg"))).status, "sah", "baris tetap");
  assert.equal((await satu("SELECT foto_key FROM lp_absen WHERE foto_sha256 = ?", sha256("lapangan/absen/baru.jpg"))).foto_key, "lapangan/absen/baru.jpg");
  assert.equal((await satu("SELECT foto_key FROM lp_logbook_foto WHERE sha256 = ?", sha256("lapangan/logbook/tua.jpg"))).foto_key, "dihapus");
  assert.equal((await satu("SELECT foto_key FROM lp_logbook_foto WHERE sha256 = ?", sha256("lapangan/logbook/baru.jpg"))).foto_key, "lapangan/logbook/baru.jpg");
  assert.equal(await satu("SELECT count(*) n FROM lapangan_label").then(x => x.n), label0, "label tidak ikut");
  await bersihkanLapangan({DB, MEDIA: bucket}, Date.now());   // ulang aman
});

uji("laju balasan per nomor: balasan beruntun dari satu nomor berhenti di 429; semua balasan tanpa kode pribadi atau vektor", async () => {
  let s429 = 0;
  for (let i = 0; i < 25; i++) { const r = await balasWA("6289900000009", "SIAP AAAAAA"); if (r.s === 429) s429++; }
  assert.ok(s429 >= 4, `429 muncul sesudah 20 per jam: ${s429}`);
  assert.equal((await balasWA(NOMOR.r1, "SIAP BBBBBB")).s, 200, "nomor lain tidak ikut terhalang");
  for (const t of SEMUA) { assert.ok(!/vektor"\s*:/.test(t), "vektor tidak muncul"); assert.ok(!t.includes(A.kode) && !t.includes(sha256(A.kode)), "kode pribadi tidak muncul"); }
});

uji("tanpa tabel 0099 rute panggilan menjawab 503 dan balasan WA tidak melempar (pola tahap B)", async () => {
  await DB.batch(["lp_panggil_penerima", "lp_panggil"].map(t => DB.prepare(`DROP TABLE ${t}`)));
  const p = await api("POST", "/api/petugas/panel/panggil", {tugas_id: TUGAS, keahlian: ["pemadaman"], prov: "62", kuota: 1, batas_jam: 5}, ADMIN); assert.equal(p.s, 503, p.t); assert.match(p.j.galat ?? p.j.error ?? p.t, /migrasi/);
  assert.equal((await api("GET", `/api/petugas/panel/panggil?tugas_id=${TUGAS}`, undefined, PIMPINAN)).s, 503);
  const b = await balasWA(NOMOR.r1, "SIAP CCCCCC"); assert.equal(b.s, 200); assert.equal(b.j.diterima, false);
});
