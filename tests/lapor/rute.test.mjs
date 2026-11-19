/* Rute Lapor Bencana BNPB (src/lapor_ai.js, migrasi 0155, tiket LA-05/06/10) di workerd (Miniflare) dengan D1 dan R2 sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/lapor/rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import {JPEG_SAH} from "../warga/_bantu.mjs";
import {langkahKronologi} from "../../src/lapor_spek.js";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)

const uji = berantai();
const MESIN = {authorization: "Bearer mesin-rahasia"};
const U = await siapkan("uji-lapor-rute", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n, mf} = U;
const WA = "6281200000001", WA2 = "6281200000002", WA3 = "6281200000003", TAK = "6281200000099";
const LOK = {lat: -6.6, lon: 106.8, akurasi: 12, sumber: "gps"};
const pesan = (wa, b, h = MESIN) => api("POST", "/api/lapor/pesan", {wa, ...b}, h);
const B64 = Buffer.from(JPEG_SAH).toString("base64");
let nomor, token, fotoId;
const biner = async (j, bytes) => { const r = await mf.dispatchFetch("http://bnpb.lokal" + j, {method: "POST", headers: MESIN, body: bytes}); return {s: r.status}; };

uji("penjaga: tanpa kunci, kunci salah, nomor tidak berizin, tamu web ditolak", async () => {
  assert.equal((await api("POST", "/api/lapor/pesan", {wa: WA, teks: "lapor"})).s, 401, "tanpa kunci dan tanpa sesi");
  assert.equal((await pesan(WA, {teks: "lapor"}, {authorization: "Bearer salah"})).s, 403);
  assert.equal((await pesan(WA, {teks: "lapor"})).s, 403, "nomor belum di lapor_izin");
  assert.equal((await api("GET", "/api/lapor/izin")).s, 403);
  assert.equal(await n("lapor_sesi"), 0, "penolakan tidak menyentuh mesin lapor");
});

uji("izin: mesin dan admin mendaftarkan, mencabut; GET hanya mesin", async () => {
  for (const wa of [WA, WA2, WA3]) assert.equal((await api("POST", "/api/lapor/izin", {wa}, MESIN)).s, 200);
  assert.equal((await api("POST", "/api/lapor/izin", {wa: TAK}, ADMIN)).s, 200);
  assert.equal((await api("POST", "/api/lapor/izin", {wa: TAK, cabut: true}, ADMIN)).s, 200);
  assert.equal((await api("POST", "/api/lapor/izin", {wa: "12"}, MESIN)).s, 400);
  assert.equal((await api("POST", "/api/lapor/izin", {wa: TAK, peran: "x"}, MESIN)).s, 400);
  const g = await api("GET", "/api/lapor/izin", undefined, MESIN);
  assert.deepEqual(g.j.wa, [WA, WA2, WA3]);
});

async function ketik(wa, b) { await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(wa).run();   // alur panjang melampaui 20 per menit; batasnya diuji tersendiri di bawah
  const r = await pesan(wa, b); assert.equal(r.s, 200, r.t.slice(0, 300)); return r.j; }
uji("alur mesin sampai terkirim: nomor tiket, tiket baru, antrean PDF, foto WA, transkrip", async () => {
  let r = await ketik(WA, {teks: "lapor", saluran: "wa"});
  assert.match(r.teksWa, /Setuju/); assert.equal(r.teksWa, r.balasan.length ? r.teksWa : "");
  for (const t of ["1", "1", "Budi Santoso"]) r = await ketik(WA, {teks: t});
  r = await ketik(WA, {lokasi: LOK});
  assert.equal(r.status, "wilayah"); r = await ketik(WA, {teks: "1"});   // konfirmasi desa
  assert.equal(r.status, "rtrw"); r = await ketik(WA, {teks: "Tidak tahu"});
  assert.equal(r.minta, "jenis", JSON.stringify({b: r.balasan, s: r.status, m: r.minta}));
  r = await ketik(WA, {teks: String(r.pilihan.findIndex(x => /longsor/i.test(x)) + 1)});
  for (const t of ["1", ...langkahKronologi("longsor").map(() => "1"), "2", "kemarin jam 05.30"]) r = await ketik(WA, {teks: t});
  let foto = false;
  for (let i = 0; i < 60 && r.status !== "terkirim"; i++) {
    if (r.status === "ringkasan") { assert.deepEqual(r.pilihan, ["Kirim", "Ubah", "Batal"]); r = await ketik(WA, {teks: "1"}); break; }
    if (r.minta === "foto" && !foto) {
      foto = true;
      const f = await api("POST", "/api/lapor/foto", {wa: WA, data: B64, waktu: Date.now() - 60e3, lokasi: {lat: -6.6, lon: 106.8}}, MESIN);
      assert.equal(f.s, 200, f.t.slice(0, 300)); assert.equal(f.j.fotoBaru.lencana, "wa"); fotoId = f.j.fotoBaru.id;
      assert.ok(await (await mf.getR2Bucket("MEDIA")).head(`lapor/foto/${fotoId}.jpg`), "foto di R2");
      r = await ketik(WA, {teks: "1"}); continue;
    }
    r = await ketik(WA, {teks: r.pilihan ? "1" : i % 2 ? "belum tahu" : "tidak ada"});
  }
  assert.ok(foto, "langkah foto dilewati");
  assert.equal(r.status, "terkirim", JSON.stringify(r).slice(0, 400));
  assert.match(r.nomor, /^LA-\d{6}-01$/); nomor = r.nomor;
  assert.match(r.teksWa, new RegExp(nomor)); assert.match(r.teksWa, /\/lapor\/lacak\.html\?t=[0-9a-f]{32}/);
  token = /t=([0-9a-f]{32})/.exec(r.lacak)[1];
  assert.equal(r.unduhan.length, 3);
  assert.equal(await n("lapor_tiket", `nomor = '${nomor}' AND status = 'baru'`), 1);
  assert.equal(await n("lapor_pdf", `nomor = '${nomor}' AND status = 'antre'`), 1);
  assert.equal(await n("lapor_pelapor", `wa = '${WA}' AND nama = 'Budi Santoso'`), 1);
  assert.equal(await n("lapor_foto", `id = '${fotoId}'`), 1);
  assert.ok(await n("lapor_pesan", `sesi = (SELECT id FROM lapor_sesi WHERE nomor = '${nomor}')`) > 10, "transkrip audit append-only");
  assert.equal(await n("lapor_pesan", "teks LIKE '%nomor menyusul%'"), 0);
  assert.equal(await n("lapor_sesi", `token_sha = '${sha256(token)}'`), 1, "hanya sha256 token di D1");
  // pesan sesudah terkirim = laporan baru; status mencantumkan laporan tadi
  const st = await ketik(WA, {teks: "status"}); assert.match(st.teksWa, new RegExp(nomor)); assert.match(st.teksWa, /Laporan diterima/);
});

uji("lacak tanpa login, foto bertoken, token salah 404", async () => {
  const l = await api("GET", `/api/lapor/lacak?t=${token}`); assert.equal(l.s, 200); assert.equal(l.j.nomor, nomor); assert.equal(l.j.status, "baru"); assert.equal(l.j.pelapor, "Budi");
  assert.ok(!/628/.test(l.t), "tanpa nomor WA");
  assert.equal((await api("GET", `/api/lapor/lacak?t=${"0".repeat(32)}`)).s, 404);
  const f = await mf.dispatchFetch(`http://bnpb.lokal/api/lapor/foto/${fotoId}?t=${token}`); assert.equal(f.status, 200); assert.equal(f.headers.get("content-type"), "image/jpeg");
  assert.match(f.headers.get("cache-control"), /private/); assert.equal(f.headers.get("x-robots-tag"), "noindex");
  assert.equal((await mf.dispatchFetch(`http://bnpb.lokal/api/lapor/foto/${fotoId}`)).status, 404);
});

uji("kembali: kembali ke pertanyaan sebelumnya", async () => {
  let r = await ketik(WA2, {teks: "lapor"}); assert.deepEqual(r.pilihan, ["Setuju", "Tidak setuju"]);
  r = await ketik(WA2, {teks: "1"}); assert.notDeepEqual(r.pilihan, ["Setuju", "Tidak setuju"]);
  r = await ketik(WA2, {kembali: true}); assert.equal(r.kembali, true); assert.deepEqual(r.pilihan, ["Setuju", "Tidak setuju"]);
});

uji("meja: tamu ditolak, membuka = dilihat, balas dan status mengisi kabar, pindah tak sah 409", async () => {
  assert.equal((await api("GET", "/api/lapor/meja")).s, 403);
  assert.equal((await api("GET", "/api/lapor/meja", undefined, {"x-admin-token": "gerbang@x:sandi"})).s, 403, "akun gerbang tidak melihat nomor WA");
  const d = await api("GET", "/api/lapor/meja", undefined, ADMIN); assert.equal(d.s, 200);
  const b = d.j.baris.find(x => x.nomor === nomor); assert.equal(b.wa, WA); assert.equal(b.jenisId, "longsor"); assert.equal(b.status, "baru"); assert.equal(b.foto, 1);
  assert.deepEqual(Object.keys(b.dampak), ["meninggal", "hilang", "luka", "mengungsi", "rumah"]); assert.ok(Object.values(b.dampak).every(v => v === null || Number.isFinite(v)), "angka atau null, kosong bukan nol");
  assert.equal((await api("GET", `/api/lapor/meja/${nomor}?lihat=1`, undefined, ADMIN)).j.status, "baru", "GET tidak pernah menulis");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/lihat`, {})).s, 403, "tamu");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/lihat`, {}, ADMIN)).s, 200);
  const r = await api("GET", `/api/lapor/meja/${nomor}`, undefined, ADMIN); assert.equal(r.s, 200);
  assert.equal(r.j.status, "dilihat"); assert.equal(r.j.jenisId, "longsor"); assert.equal(r.j.wilayah.provKode, "32"); assert.deepEqual(r.j.dampak, b.dampak); assert.deepEqual(r.j.pindah, ["ditelaah", "tidak_valid"]); assert.equal(r.j.token, token);
  assert.equal(r.j.riwayat.at(-1).pelaku, "Admin BNPB", "kode pelaku tidak keluar");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "selesai"}, ADMIN)).s, 409);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/balas`, {catatan: "x"}, ADMIN)).s, 400);
  const bl = await api("POST", `/api/lapor/meja/${nomor}/balas`, {catatan: "Tim sedang menuju lokasi."}, ADMIN); assert.equal(bl.s, 200);
  assert.equal(bl.j.status, "ditelaah"); assert.equal(bl.j.balasan[0].teks, "Tim sedang menuju lokasi.");
  const st = await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "ditindaklanjuti", catatan: "Tim BPBD berangkat"}, ADMIN); assert.equal(st.s, 200); assert.equal(st.j.status, "ditindaklanjuti");
  const k = await api("GET", "/api/lapor/kabar", undefined, MESIN); assert.equal(k.s, 200);
  assert.deepEqual(k.j.kabar.map(x => x.jenis), ["balasan", "status"]); assert.ok(k.j.kabar.every(x => x.wa === WA && x.nomor === nomor));
  assert.match(k.j.kabar[1].teks, /Ditindaklanjuti/);
  assert.equal((await api("GET", "/api/lapor/kabar")).s, 403);
  assert.equal((await api("POST", `/api/lapor/kabar/${k.j.kabar[0].id}/terkirim`, {}, MESIN)).s, 200);
  assert.equal((await api("POST", `/api/lapor/kabar/${k.j.kabar[0].id}/terkirim`, {}, MESIN)).s, 404, "sudah ditandai");
  assert.equal((await api("GET", "/api/lapor/kabar", undefined, MESIN)).j.kabar.length, 1);
  assert.equal(await n("lapor_tiket_riwayat", `nomor = '${nomor}'`), 4);   // baru, dilihat, ditelaah, ditindaklanjuti
  const w = await api("GET", `/api/lapor/lacak?t=${token}`); assert.equal(w.j.status, "ditindaklanjuti"); assert.equal(w.j.balasan.length, 1);
});

uji("alun-alun: laporan ditindaklanjuti tampil tanpa nama, nomor WA, nomor tiket", async () => {
  const a = await api("GET", "/api/lapor/alun"); assert.equal(a.s, 200); assert.equal(a.j.jumlah, 1);
  assert.ok(!a.t.includes(WA) && !a.t.includes(nomor) && !a.t.includes("Budi"));
  assert.equal(a.j.baris[0].jenisId, "longsor");
});

uji("PDF: antre dibawa mesin lalu unggah jadi; kabar pdf; unduh bertoken", async () => {
  assert.equal((await api("GET", "/api/lapor/pdf/antre")).s, 403);
  const q = await api("GET", "/api/lapor/pdf/antre", undefined, MESIN); assert.equal(q.s, 200);
  assert.equal(q.j.antre.length, 1); assert.equal(q.j.antre[0].nomor, nomor); assert.equal(q.j.antre[0].versi, 1);
  const bahan = q.j.antre[0].bahan; assert.match(bahan.narasi.judul, /Longsor/i); assert.equal(bahan.foto[0].url, `http://bnpb.lokal/api/lapor/foto/${fotoId}?t=${token}`);
  assert.ok(!JSON.stringify(bahan).includes(WA), "bahan tanpa nomor WA penuh");
  assert.equal((await api("GET", "/api/lapor/pdf/antre", undefined, MESIN)).j.antre.length, 0, "yang diambil ditandai cetak");
  assert.equal((await api("GET", `/api/lapor/unduh/${nomor}.pdf?t=${token}`)).s, 202);
  const pdf = new Uint8Array(300).fill(65); pdf.set([0x25, 0x50, 0x44, 0x46]);
  assert.equal((await biner(`/api/lapor/pdf/${nomor}/1?jenis=pdf`, pdf)).s, 201);
  assert.equal((await biner(`/api/lapor/pdf/${nomor}/1?jenis=pdf`, new TextEncoder().encode("bukan pdf" + " ".repeat(200)))).s, 400);
  assert.equal((await biner(`/api/lapor/pdf/${nomor}/9?jenis=pdf`, pdf)).s, 404);
  assert.equal(await n("lapor_pdf", `nomor = '${nomor}' AND status = 'jadi'`), 1);
  const k = (await api("GET", "/api/lapor/kabar", undefined, MESIN)).j.kabar.filter(x => x.jenis === "pdf");
  assert.equal(k.length, 1); assert.equal(k[0].wa, WA); assert.match(k[0].url, /\/api\/lapor\/unduh\/LA-\d{6}-01\.pdf\?t=[0-9a-f]{32}/);
  const d = await mf.dispatchFetch(`http://bnpb.lokal/api/lapor/unduh/${nomor}.pdf?t=${token}`); assert.equal(d.status, 200); assert.equal(d.headers.get("content-type"), "application/pdf");
  assert.equal((await mf.dispatchFetch(`http://bnpb.lokal/api/lapor/unduh/${nomor}.pdf`)).status, 404);
  const zip = new Uint8Array(300).fill(66); zip.set([0x50, 0x4b]);
  assert.equal((await biner(`/api/lapor/pdf/${nomor}/1?jenis=docx`, zip)).s, 201);
  assert.equal((await mf.dispatchFetch(`http://bnpb.lokal/api/lapor/unduh/${nomor}.docx?t=${token}`)).status, 200);
});

uji("pintu web: butuh sesi /masuk, x-pb, dan izin; nomor dari sesi", async () => {
  const tok = "ab".repeat(32), H = {cookie: `sesi_masuk=${tok}`, origin: "http://bnpb.lokal"}, kini = Date.now();
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, status, dibuat) VALUES ('akunlaporuji0001', ?, 'aktif', ?)").bind(WA3, kini),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, 'akunlaporuji0001', ?, ?, ?)").bind(sha256(tok), kini, kini, kini + 3600e3)]);
  assert.equal((await api("POST", "/api/lapor/pesan", {teks: "lapor"}, H)).s, 403, "tanpa x-pb");
  const r = await api("POST", "/api/lapor/pesan", {teks: "lapor", wa: WA}, {...H, "x-pb": "1"}); assert.equal(r.s, 200, r.t);   // body.wa diabaikan: nomor dari sesi
  assert.equal(await n("lapor_sesi", `wa = '${WA3}'`), 1); assert.equal(await n("lapor_sesi", `wa = '${WA}' AND status = 'identitas'`), 0);
  assert.equal((await api("GET", "/api/lapor/sesi", undefined, H)).s, 200);
  await api("POST", "/api/lapor/izin", {wa: WA3, cabut: true}, MESIN);
  assert.equal((await api("POST", "/api/lapor/pesan", {teks: "lapor"}, {...H, "x-pb": "1"})).s, 403, "izin dicabut");
  await api("POST", "/api/lapor/izin", {wa: WA3}, MESIN);
});

uji("kuota: 60 per jam per nomor berbalasan sopan 429 (pesan dan foto), laporan tersimpan", async () => {
  const kini = Date.now();
  await DB.batch(Array.from({length: 60}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lapor.pesan', ?)").bind(WA2, kini - 30 * 60e3)));
  const sebelum = await n("lapor_sesi", `wa = '${WA2}'`);
  const r = await pesan(WA2, {teks: "1"}); assert.equal(r.s, 429);
  assert.ok(r.j.sisaDetik > 1500 && r.j.sisaDetik <= 1801, `sisaDetik ${r.j.sisaDetik}`);
  assert.match(r.j.balasan, /^Kuota pesan untuk nomor ini habis untuk satu jam ini\. Laporan Anda tersimpan; lanjutkan lagi pukul \d\d\.\d\d WIB\. Bila ada nyawa terancam, telepon 112\.$/);
  assert.equal(r.j.teksWa, r.j.balasan); assert.equal(r.j.galat, r.j.balasan);
  assert.equal(await n("lapor_sesi", `wa = '${WA2}'`), sebelum, "sesi tidak hilang");
  const f = await api("POST", "/api/lapor/foto", {wa: WA2, data: B64}, MESIN); assert.equal(f.s, 429); assert.ok(f.j.sisaDetik > 0);
});

uji("kuota: 120 per hari dan 20 per menit tetap berlaku; web 300 per jam per IP", async () => {
  const kini = Date.now();
  await DB.batch(Array.from({length: 20}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lapor.pesan', ?)").bind(WA3, kini - 1000)));
  const m = await pesan(WA3, {teks: "x"}); assert.equal(m.s, 429); assert.ok(m.j.sisaDetik <= 60, "jendela menit");
  const tok = "cd".repeat(32), ip = "203.0.113.55", H = {cookie: `sesi_masuk=${tok}`, origin: "http://bnpb.lokal", "x-pb": "1", "cf-connecting-ip": ip};
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, status, dibuat) VALUES ('akunlaporuji0002', '6281200000004', 'aktif', ?)").bind(kini),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, 'akunlaporuji0002', ?, ?, ?)").bind(sha256(tok), kini, kini, kini + 3600e3),
    DB.prepare("INSERT INTO lapor_izin (wa, oleh, dibuat) VALUES ('6281200000004', 'uji', ?)").bind(kini),
    ...Array.from({length: 300}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lapor.ip', ?)").bind(sha256(`garam-uji|${ip}`), kini - 1000))]);
  const w = await api("POST", "/api/lapor/pesan", {teks: "lapor"}, H); assert.equal(w.s, 429); assert.match(w.j.balasan, /Kuota pesan/);
  const lain = await api("POST", "/api/lapor/pesan", {teks: "lapor"}, {...H, "cf-connecting-ip": "203.0.113.56"}); assert.equal(lain.s, 200, "IP lain tidak terkena");
});

uji("info daerah: prakiraan, nomor penting, cari desa, tempat sekitar (data publik lewat ASSETS)", async () => {
  const d = await api("GET", `/api/lapor/daerah?lat=-6.6&lon=106.8&wa=${WA}`, undefined, MESIN); assert.equal(d.s, 200, d.t.slice(0, 200)); assert.match(d.j.info, /Prakiraan Centurisk97/);
  const p = await api("GET", `/api/lapor/penting?lat=-6.6&lon=106.8&wa=${WA}`, undefined, MESIN); assert.equal(p.s, 200); assert.equal(p.j.nasional[0].nomor, "112"); assert.ok(p.j.bpbd.length >= 1);
  const c = await api("GET", `/api/lapor/cari?q=paledang&wa=${WA}`, undefined, MESIN); assert.equal(c.s, 200); assert.ok(c.j.hasil.length >= 1);
  assert.equal((await api("GET", "/api/lapor/daerah?lat=-6.6&lon=106.8")).s, 401, "tanpa identitas");
  const s = await api("GET", `/api/lapor/sekitar?jenis=sekolah&wa=${WA}`, undefined, MESIN); assert.equal(s.s, 200, s.t.slice(0, 200)); assert.ok(Array.isArray(s.j.tempat));   // lokasi dari sesi terakhir; Overpass diblok di uji, data OSM lokal tetap jalan
  const k = await api("GET", `/api/lapor/kotak?wa=${WA}&sejak=0`, undefined, MESIN); assert.equal(k.s, 200); assert.ok(k.j.pesan.some(x => x.status && x.nomor === nomor) && !k.j.pesan.some(x => /unduh/.test(x.teks)));
  assert.equal((await api("POST", "/api/lapor/nilai", {wa: WA, nomor, nilai: 9}, MESIN)).s, 400);
  assert.equal((await api("POST", "/api/lapor/nilai", {wa: WA, nomor, nilai: 5}, MESIN)).s, 200);
  assert.equal(JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(nomor).first()).kerja).nilai.nilai, 5);
});

/* ---------- hasil pemeriksaan bersih 19 Nov 2026 ---------- */
const WA4 = "6281200000014", WA5 = "6281200000015";
async function keFoto(wa) {
  let r = await ketik(wa, {teks: "lapor"});
  for (const t of ["1", "1", "Siti Aminah"]) r = await ketik(wa, {teks: t});
  r = await ketik(wa, {lokasi: LOK}); r = await ketik(wa, {teks: "1"}); r = await ketik(wa, {teks: "Tidak tahu"});
  r = await ketik(wa, {teks: String(r.pilihan.findIndex(x => /longsor/i.test(x)) + 1)});
  for (const t of ["1", ...langkahKronologi("longsor").map(() => "1"), "2", "kemarin jam 05.30"]) r = await ketik(wa, {teks: t});
  for (let i = 0; i < 60 && r.minta !== "foto"; i++) r = await ketik(wa, {teks: r.pilihan ? "1" : i % 2 ? "belum tahu" : "tidak ada"});
  assert.equal(r.minta, "foto"); return r;
}
const foto = (b, h = MESIN) => api("POST", "/api/lapor/foto", b, h);

uji("lokasi pesan: null, teks kosong, teks angka, di luar kotak ditolak 400; kode desa harus baku", async () => {
  await api("POST", "/api/lapor/izin", {wa: WA4}, MESIN); await api("POST", "/api/lapor/izin", {wa: WA5}, MESIN);
  for (const lokasi of [{lat: null, lon: null}, {lat: "", lon: ""}, {lat: "-6.6", lon: "106.8"}, {lat: 0, lon: 0}, {lat: -6.6}, {lat: true, lon: true}]) {
    await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WA4).run();
    const r = await pesan(WA4, {lokasi}); assert.equal(r.s, 400, JSON.stringify(lokasi));
  }
  for (const kode of ["../../x", "32.71", 3271010001, "", "32.71.01.100a", "3271.01.01.1001"]) assert.equal((await pesan(WA4, {lokasi: {kode}})).s, 400, String(kode));
  assert.equal(await n("lapor_sesi", `wa = '${WA4}'`), 0, "penolakan tidak menyentuh mesin");
});

uji("foto: gps, exif, waktu tidak sah dibuang (mesin dan web), tidak disimpan; header referrer-policy", async () => {
  await keFoto(WA4);
  const tok = "ef".repeat(32), kini = Date.now(), H = {cookie: `sesi_masuk=${tok}`, origin: "http://bnpb.lokal", "x-pb": "1"};
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, status, dibuat) VALUES ('akunlaporuji0005', ?, 'aktif', ?)").bind(WA4, kini),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, 'akunlaporuji0005', ?, ?, ?)").bind(sha256(tok), kini, kini, kini + 3600e3)]);
  const lencana = async j => (await DB.prepare("SELECT lencana, lat FROM lapor_foto WHERE id = ?").bind(j.fotoBaru.id).first());
  // mesin: lokasi null dan waktu masa depan -> tanpa lokasi, waktu unggah
  let r = await foto({wa: WA4, data: B64, waktu: Date.now() + 3600e3, lokasi: {lat: null, lon: null}}); assert.equal(r.s, 200, r.t.slice(0, 200));
  assert.equal(r.j.fotoBaru.lencana, "tanpa"); assert.equal(r.j.fotoBaru.sumberWaktu, "waktu unggah");
  assert.equal(r.h.get("referrer-policy"), "no-referrer");
  // web: gps tidak sah (lat null, akurasi teks, waktu lama), exif tidak sah -> tanpa lokasi
  for (const b of [{gps: {lat: null, lon: 106.8, akurasi: 10, waktu: kini}}, {gps: {lat: -6.6, lon: 106.8, akurasi: "10", waktu: kini}}, {gps: {lat: -6.6, lon: 106.8, akurasi: 10, waktu: kini - 30 * 60e3}},
    {gps: {lat: -6.6, lon: 106.8, akurasi: 10, waktu: kini + 3600e3}}, {exif: {lat: "-6.6", lon: "106.8"}}, {exif: {lat: 99, lon: 106.8}}]) {
    await DB.prepare("DELETE FROM laju_bnpb WHERE kunci IN (?, 'lapor.ip')").bind(WA4).run();
    r = await foto({data: B64, ...b}, H); assert.equal(r.s, 200, JSON.stringify(b) + r.t.slice(0, 200));
    const f = await lencana(r.j); assert.equal(f.lencana, "tanpa", JSON.stringify(b)); assert.equal(f.lat, null);
  }
  // exif dengan lokasi sah tetapi waktu masa depan: lokasi dipakai, waktu dibuang
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WA4).run();
  r = await foto({data: B64, exif: {lat: -6.6, lon: 106.8, waktu: kini + 3600e3}}, H); assert.equal((await lencana(r.j)).lencana, "exif"); assert.equal(r.j.fotoBaru.sumberWaktu, "waktu unggah");
  // gps sah tetap diterima
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WA4).run();
  r = await foto({data: B64, gps: {lat: -6.6, lon: 106.8, akurasi: 10, waktu: kini}}, H); assert.equal((await lencana(r.j)).lencana, "gps");
  // exif waktu > 48 jam lalu tetap ditolak
  await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WA4).run();
  assert.equal((await foto({data: B64, exif: {waktu: kini - 72 * 3600e3}}, H)).s, 400);
});

uji("nilai: harus angka bulat 1-5 bertipe number dan 30 per jam per nomor", async () => {
  assert.equal((await api("POST", "/api/lapor/nilai", {wa: WA, nomor, nilai: "5"}, MESIN)).s, 400);
  assert.equal((await api("POST", "/api/lapor/nilai", {wa: WA, nomor, nilai: null}, MESIN)).s, 400);
  await DB.batch(Array.from({length: 30}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lapor.nilai', ?)").bind(WA, Date.now())));
  const r = await api("POST", "/api/lapor/nilai", {wa: WA, nomor, nilai: 4}, MESIN); assert.equal(r.s, 429); assert.ok(r.j.sisaDetik > 0);
});

uji("meja: tiket hilang 404, status prototipe diabaikan, pdf antre rusak tidak memacetkan, unduh %-rusak 404", async () => {
  const kini = Date.now();
  await DB.prepare("INSERT INTO lapor_sesi (id, wa, status, kerja, rev, nomor, token_sha, terkirim, dibuat, diubah) VALUES ('sesirusak0001', ?, 'terkirim', '{}', 0, 'LA-010101-01', ?, ?, ?, ?)").bind(WA5, sha256("x"), kini, kini, kini).run();
  assert.equal((await api("POST", "/api/lapor/meja/LA-010101-01/balas", {catatan: "halo"}, ADMIN)).s, 404, "sesi bernomor tanpa tiket");
  assert.equal((await api("GET", "/api/lapor/meja?status=constructor", undefined, ADMIN)).s, 200);
  await DB.prepare("INSERT INTO lapor_pdf (nomor, versi, status, diubah) VALUES ('LA-010101-01', 1, 'antre', ?)").bind(kini).run();
  const q = await api("GET", "/api/lapor/pdf/antre", undefined, MESIN); assert.equal(q.s, 200); assert.ok(!q.j.antre.some(x => x.nomor === "LA-010101-01"));
  assert.equal((await api("GET", "/api/lapor/unduh/%E0%A4%A.pdf?t=" + token)).s, 404);
});

uji("batas 5 laporan sehari dicek sebelum putaran pada pesan kirim; batas IP untuk lacak; token butuh SESI_KUNCI", async () => {
  const kini = Date.now(), sesi = {status: "ringkasan", isian: {}, transkrip: [], ditanya: [], dibuat: kini};
  await DB.batch([...Array.from({length: 5}, (_, i) => DB.prepare("INSERT INTO lapor_sesi (id, wa, status, kerja, rev, nomor, terkirim, dibuat, diubah) VALUES (?, ?, 'terkirim', '{}', 0, ?, ?, ?, ?)").bind(`selesai${i}000000`, WA5, `LA-0202${10 + i}-01`, kini - 1000 - i, kini - 1000, kini - 1000)),
    DB.prepare("INSERT INTO lapor_sesi (id, wa, status, kerja, rev, dibuat, diubah) VALUES ('aktifringkas01', ?, 'ringkasan', ?, 0, ?, ?)").bind(WA5, JSON.stringify(sesi), kini, kini)]);
  const r = await pesan(WA5, {teks: "1"}); assert.equal(r.s, 200); assert.match(r.j.balasan, /Batas laporan harian/);
  assert.equal(await n("lapor_pesan", "sesi = 'aktifringkas01'"), 0, "tidak ada putaran");
  const ip = "203.0.113.77";
  await DB.batch(Array.from({length: 300}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lapor.lacak', ?)").bind(sha256(`garam-uji|${ip}`), kini)));
  assert.equal((await api("GET", `/api/lapor/lacak?t=${token}`, undefined, {"cf-connecting-ip": ip})).s, 429);
  assert.equal((await api("GET", `/api/lapor/lacak?t=${token}`, undefined, {"cf-connecting-ip": "203.0.113.78"})).s, 200);
  const T = await siapkan("uji-lapor-tanpa-kunci", {r2: true, ikat: {WA_MESIN: "mesin-rahasia", SESI_KUNCI: ""}});
  assert.equal((await T.api("GET", `/api/lapor/lacak?t=${token}`)).s, 503);
  assert.equal((await T.api("GET", "/api/lapor/alun")).s, 503);
});

/* ---------- laporan susulan (LA-26, F-28, A12, Q26) ---------- */
const WA6 = "6281200000016";
const tokenDariMeja = async no => (await api("GET", `/api/lapor/meja/${no}`, undefined, ADMIN)).j.token;
uji("susulan: mulai dari laporan terkirim, kabar digabung jadi versi 2 di tiket yang sama, jenis dan lokasi terkunci", async () => {
  await api("POST", "/api/lapor/izin", {wa: WA6}, MESIN);
  let r = await keFoto(WA6);
  r = await ketik(WA6, {teks: "1"});   // lanjut tanpa foto
  for (let i = 0; i < 60 && r.status !== "ringkasan"; i++) r = await ketik(WA6, {teks: r.pilihan ? "1" : i % 2 ? "belum tahu" : "tidak ada"});
  r = await ketik(WA6, {teks: "1"}); assert.equal(r.status, "terkirim"); const no = r.nomor;
  const awal = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(no).first()).kerja);
  assert.equal((await api("POST", "/api/lapor/susulan", {wa: WA5, nomor: no}, MESIN)).s, 404, "bukan milik nomor itu");
  assert.equal((await api("POST", "/api/lapor/susulan", {nomor: no})).s, 401);
  const m = await api("POST", "/api/lapor/susulan", {wa: WA6, nomor: no}, MESIN); assert.equal(m.s, 200, m.t.slice(0, 300)); assert.equal(m.j.susulanDari, no);
  assert.equal(await n("lapor_sesi", `wa = '${WA6}' AND nomor IS NULL`), 1, "sesi salinan tanpa nomor");
  r = await ketik(WA6, {teks: "meninggal jadi 2"}); assert.equal(r.status, "ringkasan");
  r = await ketik(WA6, {teks: "1"}); assert.equal(r.status, "terkirim", JSON.stringify(r).slice(0, 300)); assert.equal(r.susulan, 2); assert.equal(r.nomor, no);
  assert.match(r.teksWa, /versi 2/);
  const v = await DB.prepare("SELECT versi, perubahan FROM lapor_versi WHERE nomor = ?").bind(no).all(); assert.equal(v.results.length, 1); assert.equal(v.results[0].versi, 2);
  assert.ok(JSON.parse(v.results[0].perubahan).some(x => x.nama === "meninggal"));
  const rw = await DB.prepare("SELECT dari, ke, pelaku, catatan FROM lapor_tiket_riwayat WHERE nomor = ? ORDER BY id DESC LIMIT 1").bind(no).first();
  assert.deepEqual([rw.dari, rw.ke, rw.pelaku], ["baru", "baru", "Pelapor"]); assert.match(rw.catatan, /^Susulan versi 2: /);
  assert.equal(await n("lapor_pdf", `nomor = '${no}' AND versi = 2 AND status = 'antre'`), 1);
  assert.equal(await n("lapor_sesi", `nomor = '${no}'`), 1, "tidak ada tiket kedua");
  const akhir = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(no).first()).kerja);
  assert.deepEqual(akhir.isian.jenis, awal.isian.jenis); assert.deepEqual(akhir.isian.lokasi, awal.isian.lokasi); assert.equal(akhir.isian.meninggal.nilai, 2);
  const d = (await api("GET", "/api/lapor/meja", undefined, ADMIN)).j.baris.find(x => x.nomor === no); assert.equal(d.versi, 2); assert.equal(d.adaSusulan, true);
  const l = await api("GET", `/api/lapor/lacak?t=${await tokenDariMeja(no)}`); assert.equal(l.j.versi, 2); assert.equal(l.j.bisaSusulan, true); assert.ok(l.j.terkirimMs > 0);
  assert.equal((await api("POST", `/api/lapor/meja/${no}/lihat`, {}, ADMIN)).j.adaSusulan, false, "staf bertindak: penanda mati");
  await ketik(WA6, {teks: "lapor"});   // laporan baru sedang diisi: susulan ditolak
  assert.equal((await api("POST", "/api/lapor/susulan", {wa: WA6, nomor: no}, MESIN)).s, 409);
  await DB.prepare("UPDATE lapor_sesi SET status = 'batal' WHERE wa = ? AND nomor IS NULL AND status != 'terkirim'").bind(WA6).run();
  await DB.prepare("UPDATE lapor_sesi SET terkirim = ? WHERE nomor = ?").bind(Date.now() - 73 * 3600e3, no).run();
  assert.equal((await api("POST", "/api/lapor/susulan", {wa: WA6, nomor: no}, MESIN)).s, 409, "di luar 72 jam");
});
