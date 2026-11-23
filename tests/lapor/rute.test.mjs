/* Rute Lapor Bencana BNPB (src/lapor_ai.js, migrasi 0155, tiket LA-05/06/10) di workerd (Miniflare) dengan D1 dan R2 sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/lapor/rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import {JPEG_SAH} from "../warga/_bantu.mjs";
import {profilAktif} from "../warga/_profil.mjs";
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
  assert.equal((await api("POST", "/api/lapor/pesan", {teks: "lapor"})).s, 401, "tanpa kunci, tanpa sesi, tanpa nomor");
  assert.equal((await api("POST", "/api/lapor/pesan", {wa: WA, teks: "lapor"})).s, 403, "nomor ketikan tanpa x-pb (K65)");
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

async function _ketik(wa, b) { await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(wa).run();   // alur panjang melampaui 20 per menit; batasnya diuji tersendiri di bawah
  const r = await pesan(wa, b); assert.equal(r.s, 200, r.t.slice(0, 300));
  if (r.j.status === "kejadian" && !tawarKejadian) return _ketik(wa, {teks: String(r.j.pilihan.length)});   // laporan sekecamatan sebelumnya: skrip lama menjawab "Bukan, kejadian lain" supaya alurnya tetap sama
  return r.j; }
let tawarKejadian = false;   // true hanya di uji "kejadian yang sama", yang membaca tawarannya sendiri
const ketik = _ketik;
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
  let st = await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "ditindaklanjuti", catatan: "Tim BPBD berangkat"}, ADMIN); assert.equal(st.s, 400); assert.equal(st.j.perluTindakan, true, "Ditindaklanjuti wajib tindakan (K70)");
  st = await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "ditindaklanjuti", catatan: "Tim BPBD berangkat", tindakan: ["evakuasi"]}, ADMIN); assert.equal(st.s, 200); assert.equal(st.j.status, "ditindaklanjuti");
  const k = await api("GET", "/api/lapor/kabar", undefined, MESIN); assert.equal(k.s, 200);
  assert.deepEqual(k.j.kabar.map(x => x.jenis), ["balasan", "status"]); assert.ok(k.j.kabar.every(x => x.wa === WA && x.nomor === nomor));
  assert.match(k.j.kabar[1].teks, /Ditindaklanjuti\. Tindakan: Evakuasi warga\./);
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
  const r = await api("GET", `/api/lapor/rapor?kode=33.08&wa=${WA}`, undefined, MESIN); assert.equal(r.s, 200, r.t.slice(0, 200));   // K89: rapor daerah dari berkas publik
  assert.equal(r.j.kab, "Magelang"); assert.ok(r.j.risiko?.kelas && r.j.kejadian?.total >= 0); assert.match(r.j.teks, /Rapor daerah: Magelang/);
  assert.ok(r.j.titik === null || Number.isInteger(r.j.titik.n), "titik panas basi = null, bukan 0");
  assert.equal((await api("GET", "/api/lapor/rapor?kode=33.08")).s, 401, "rapor tanpa identitas");
  const s = await api("GET", `/api/lapor/sekitar?jenis=sekolah&wa=${WA}`, undefined, MESIN); assert.equal(s.s, 200, s.t.slice(0, 200)); assert.ok(Array.isArray(s.j.tempat));   // lokasi dari sesi terakhir; Overpass diblok di uji, data OSM lokal tetap jalan
  const k = await api("GET", `/api/lapor/kotak?wa=${WA}&sejak=0`, undefined, MESIN); assert.equal(k.s, 200); assert.ok(k.j.pesan.some(x => x.status && x.nomor === nomor) && !k.j.pesan.some(x => /unduh/.test(x.teks)));
  assert.equal((await api("POST", "/api/lapor/nilai", {wa: WA, nomor, nilai: 9}, MESIN)).s, 400);
  assert.equal((await api("POST", "/api/lapor/nilai", {wa: WA, nomor, nilai: 5}, MESIN)).s, 200);
  assert.equal(JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(nomor).first()).kerja).nilai.nilai, 5);
});

/* ---------- hasil pemeriksaan bersih 19 Nov 2026 ---------- */
const WA4 = "6281200000014", WA5 = "6281200000015";
async function keFoto(wa, ketik = _ketik) {
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
  assert.equal((await foto({data: B64, exif: {kamera: false, waktu: kini}}, H)).s, 400, "tanpa data kamera (tangkapan layar) ditolak");
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

/* ---------- meja BPBD, bukti tindak lanjut, alun-alun hidup, agregat, teruskan (K59-K63, LA-62 sampai LA-67) ---------- */
let W, bogor, bandung, prov32, prov31, polres, nu = 0;
async function lembaga({jenis, tingkat, prov, kab, via = "anggota", waAkun}) {   // akun aktif + sesi /masuk; via: pemilik akun (instansi_akun.wa = mk_akun.wa) atau anggota aktif (mk_anggota)
  nu++; const id = String(nu).padStart(16, "0"), mk = "mk" + String(nu).padStart(14, "0"), tok = (String(nu).padStart(2, "0") + "9f").repeat(32).slice(0, 64), kini = Date.now(), waMk = `62812001${String(nu).padStart(4, "0")}`;
  await DB.batch([DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
      VALUES (?, ?, ?, ?, 'Wilayah uji', ?, ?, ?, ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
      .bind(id, "lembagauji" + nu, jenis, tingkat, kab ? `${prov}|${kab}` : prov, JSON.stringify([prov]), prov, kab ?? null, "g".repeat(32), "0".repeat(64), `lembaga${nu}@b.id`, via === "pemilik" ? waMk : waAkun, kini),
    DB.prepare("INSERT INTO mk_akun (id, wa, nama, status, dibuat) VALUES (?, ?, 'Anggota Uji', 'aktif', ?)").bind(mk, waMk, kini),
    ...(via === "anggota" ? [DB.prepare("INSERT INTO mk_anggota (id, mk_id, tabel, akun_id, status, jalur, rujukan, dibuat, diubah) VALUES (?, ?, 'instansi_akun', ?, 'aktif', 'tinjau', 'uji', ?, ?)").bind("ag" + String(nu).padStart(14, "0"), mk, id, kini, kini)] : []),
    DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, ?, ?, ?, ?)").bind(sha256(tok), mk, kini, kini, kini + 3600e3)]);
  if (["pemkab", "pemkot", "pemprov"].includes(jenis)) return {id, h: {cookie: (await profilAktif(DB, id)).cookie, origin: "http://bnpb.lokal", "x-pb": "1"}};   // akun BPBD: sesi profil (paket profil-bpbd), bukan sesi /masuk
  return {id, h: {cookie: `sesi_masuk=${tok}`, origin: "http://bnpb.lokal", "x-pb": "1"}};
}
const WA_BOGOR = "628120009001";
uji("siapkan: wilayah laporan uji dan akun lembaga (kab, kota lain, dua provinsi, polres)", async () => {
  W = JSON.parse((await DB.prepare("SELECT ringkas FROM lapor_sesi WHERE nomor = ?").bind(nomor).first()).ringkas).wilayah;
  bogor = await lembaga({jenis: W.kab.startsWith("Kota") ? "pemkot" : "pemkab", tingkat: "kab", prov: W.provKode, kab: W.kab, waAkun: WA_BOGOR});
  bandung = await lembaga({jenis: "pemkot", tingkat: "kab", prov: "32", kab: "Kota Bandung", waAkun: "628120009002"});
  prov32 = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "32", via: "pemilik"});
  prov31 = await lembaga({jenis: "pemprov", tingkat: "prov", prov: "31", via: "pemilik"});
  polres = await lembaga({jenis: "polres", tingkat: "kab", prov: "32", kab: W.kab, waAkun: "628120009003"});
});

uji("meja BPBD: kab hanya wilayahnya, provinsi semua kab di dalamnya, luar wilayah 404, akun polres dan tamu ditolak", async () => {
  assert.equal(W.provKode, "32");
  for (const [akun, lihat] of [[bogor, true], [prov32, true], [bandung, false], [prov31, false]]) {
    const d = await api("GET", "/api/lapor/meja", undefined, akun.h); assert.equal(d.s, 200, d.t.slice(0, 200));
    assert.equal(d.j.akun.jenis, "bpbd"); assert.match(d.j.akun.label, /^BPBD /);
    assert.equal(d.j.baris.some(x => x.nomor === nomor), lihat, `daftar ${d.j.akun.label}`);
    assert.ok(d.j.baris.every(x => x.wilayah?.provKode === (akun === prov31 ? "31" : "32")), "tidak ada baris di luar provinsi");
    const r = await api("GET", `/api/lapor/meja/${nomor}`, undefined, akun.h); assert.equal(r.s, lihat ? 200 : 404, `rincian ${d.j.akun.label}`);
    if (lihat) { assert.equal(r.j.akun.jenis, "bpbd"); assert.equal(r.j.pelapor.wa, undefined, "GET BPBD tanpa identitas pelapor (D95, tinjauan keamanan)"); assert.equal(r.j.pelapor.tersembunyi, true);
      assert.ok(d.j.baris.every(x => x.wa == null && x.nama == null), "daftar BPBD tanpa nomor dan nama");
      const p = await api("POST", `/api/lapor/meja/${nomor}/lihat`, {}, akun.h); assert.equal(p.s, 200); assert.equal(p.j.pelapor.wa, WA, "identitas lewat POST lihat yang tercatat"); }
    else assert.equal((await api("POST", `/api/lapor/meja/${nomor}/balas`, {teks: "coba masuk"}, akun.h)).s, 404, "ubah di luar wilayah = tidak ada");
  }
  assert.equal((await api("GET", "/api/lapor/meja", undefined, polres.h)).s, 403, "polres belum punya meja (Q54)");
  assert.equal((await api("GET", "/api/lapor/meja", undefined, {cookie: "sesi_masuk=" + "00".repeat(32)})).s, 403, "sesi tak dikenal");
  assert.equal((await api("GET", "/api/lapor/meja", undefined, ADMIN)).j.akun.jenis, "bnpb");
  const tanpaPb = {...bogor.h}; delete tanpaPb["x-pb"];
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/lihat`, {}, tanpaPb)).s, 403, "POST bersesi wajib x-pb");
  assert.equal(await n("lapor_akses"), 2, "dua POST lihat di atas (kab dan provinsi) tercatat; tanpa x-pb tidak");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/lihat`, {}, bogor.h)).s, 200);
  await api("GET", `/api/lapor/meja/${nomor}`, undefined, bogor.h);
  assert.equal(await n("lapor_akses", `nomor = '${nomor}'`), 3, "hanya POST lihat yang tercatat, GET tidak menulis");
  assert.match((await DB.prepare("SELECT oleh FROM lapor_akses").first()).oleh, /^BPBD /);
});

uji("bukti: JPEG disimpan di R2, GPS sah dicatat, maks 10, token atau publik membuka berkas, Selesai butuh bukti atau alasan", async () => {
  const sel = (h, b) => api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "selesai", ...b}, h);
  let r = await sel(bogor.h, {}); assert.equal(r.s, 400); assert.equal(r.j.perluBukti, true);
  assert.equal((await sel(bogor.h, {tanpaBukti: "ab"})).s, 400, "alasan terlalu pendek");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/bukti`, {data: Buffer.from("bukan jpeg".repeat(200)).toString("base64")}, bogor.h)).s, 400);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/bukti`, {data: B64}, bandung.h)).s, 404, "luar wilayah");
  r = await api("POST", `/api/lapor/meja/${nomor}/bukti`, {data: B64, gps: {lat: -6.6, lon: 106.8, akurasi: 10, waktu: Date.now()}}, bogor.h); assert.equal(r.s, 200, r.t.slice(0, 200));
  assert.equal(r.j.bukti.length, 1); const b = r.j.bukti[0]; assert.equal(b.publik, false); assert.equal(b.lokasi, true); assert.match(b.url, new RegExp(`^/api/lapor/bukti/${b.id}\\?t=[0-9a-f]{32}$`));
  assert.ok(await (await mf.getR2Bucket("MEDIA")).head(`lapor/bukti/${b.id}.jpg`), "foto di R2");
  assert.equal(await n("lapor_foto", `id = '${b.id}'`), 0, "terpisah dari foto pelapor");
  assert.ok((await DB.prepare("SELECT catatan FROM lapor_tiket_riwayat WHERE nomor = ? ORDER BY id DESC LIMIT 1").bind(nomor).first()).catatan.startsWith("Foto penanganan ditambahkan"));
  r = await api("POST", `/api/lapor/meja/${nomor}/bukti`, {data: B64, gps: {lat: -6.6, lon: 106.8, akurasi: 5000, waktu: Date.now()}}, ADMIN); assert.equal(r.s, 200);
  assert.equal(r.j.bukti[1].lokasi, false, "GPS tidak sah tidak dicatat");
  // batas 10: delapan baris lagi lewat D1 lalu unggahan ke-11 ditolak dan berkas R2-nya dibuang
  const extra = Array.from({length: 8}, (_, i) => `e${i}`.padEnd(16, "0"));
  await DB.batch(extra.map(id => DB.prepare("INSERT INTO lapor_bukti (id, nomor, kunci_r2, oleh, waktu) VALUES (?, ?, 'x', 'uji', ?)").bind(id, nomor, Date.now())));
  const sebelum = (await (await mf.getR2Bucket("MEDIA")).list({prefix: "lapor/bukti/"})).objects.length;
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/bukti`, {data: B64}, ADMIN)).s, 400);
  assert.equal((await (await mf.getR2Bucket("MEDIA")).list({prefix: "lapor/bukti/"})).objects.length, sebelum, "berkas yatim dibuang");
  await DB.prepare("DELETE FROM lapor_bukti WHERE kunci_r2 = 'x'").run();
  // berkas: token lacak membuka, tanpa token atau alun tanpa tanda publik 404
  const G = (q, id = b.id) => mf.dispatchFetch(`http://bnpb.lokal/api/lapor/bukti/${id}${q}`);
  let f = await G(`?t=${token}`); assert.equal(f.status, 200); assert.equal(f.headers.get("content-type"), "image/jpeg"); assert.match(f.headers.get("cache-control"), /private/);
  assert.equal((await G("")).status, 404); assert.equal((await G("?alun=1")).status, 404, "belum ditandai publik"); assert.equal((await G(`?t=${"0".repeat(32)}`)).status, 404); assert.equal((await G(`?t=${token}`, "zz")).status, 404);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/bukti-publik`, {id: "f".repeat(16), publik: true}, bogor.h)).s, 404);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/bukti-publik`, {id: b.id, publik: true}, prov31.h)).s, 404, "luar wilayah");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/bukti-publik`, {id: b.id, publik: true}, bogor.h)).s, 200);
  assert.equal((await G("?alun=1")).status, 200, "publik dan ditindaklanjuti");
  // pelapor melihat foto penanganan di halaman lacak, tanpa penanda publik
  const l = await api("GET", `/api/lapor/lacak?t=${token}`); assert.equal(l.j.bukti.length, 2); assert.deepEqual(Object.keys(l.j.bukti[0]), ["url", "waktu"]);
  // Selesai dengan bukti: BPBD boleh, riwayat atas nama BPBD, kabar menyebut foto
  r = await sel(bogor.h, {catatan: "Genangan surut"}); assert.equal(r.s, 200, r.t.slice(0, 200)); assert.equal(r.j.status, "selesai");
  assert.match(r.j.riwayat.at(-1).pelaku, /^BPBD /);
  const k = (await api("GET", "/api/lapor/kabar", undefined, MESIN)).j.kabar.filter(x => x.nomor === nomor && x.jenis === "status").at(-1);
  assert.match(k.teks, /Selesai ditangani\. Genangan surut Lihat 2 foto penanganan di halaman lacak\.$/);
  // BPBD tidak membuka kembali (D96); BNPB boleh
  r = await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "ditelaah", catatan: "buka lagi"}, bogor.h); assert.equal(r.s, 403);
  assert.deepEqual((await api("GET", `/api/lapor/meja/${nomor}`, undefined, bogor.h)).j.pindah, [], "tombol buka kembali tidak ditawarkan");
  assert.deepEqual((await api("GET", `/api/lapor/meja/${nomor}`, undefined, ADMIN)).j.pindah, ["ditelaah"]);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/teruskan`, {}, bogor.h)).s, 403, "teruskan hanya BNPB");
  // kembali ke ditindaklanjuti untuk uji alun: BNPB membuka kembali lalu menindaklanjuti
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "ditelaah", catatan: "cek ulang"}, ADMIN)).s, 200);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "ditindaklanjuti", tindakan: ["evakuasi"]}, ADMIN)).s, 200);
});

uji("pengecekan lapangan dan tindakan (K69-K70, LA-73): BPBD wilayah saja, revisi = versi baru berasal petugas, tidak valid memindah tiket, append-only", async () => {
  let r = await api("GET", `/api/lapor/meja/${nomor}`, undefined, bogor.h); assert.equal(r.s, 200);
  assert.ok(r.j.tindakanPilihan.some(x => x.kode === "alat_berat"), "katalog longsor dari bencana.json lewat ASSETS");
  assert.ok(r.j.tindakan.some(x => x.kode === "evakuasi"), "tindakan saat Ditindaklanjuti tersimpan");
  const awal = r.j.revisi.find(x => x.nama === "meninggal"); assert.ok(awal);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/tindakan`, {tindakan: ["alat_berat"]}, bandung.h)).s, 404, "di luar wilayah");
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/tindakan`, {tindakan: ["pompa"]}, bogor.h)).s, 400, "pompa bukan katalog longsor");
  r = await api("POST", `/api/lapor/meja/${nomor}/tindakan`, {tindakan: ["alat_berat"], tindakanLain: "Buka jalur desa"}, bogor.h); assert.equal(r.s, 200, r.t.slice(0, 200));
  assert.deepEqual(r.j.tindakan.slice(-2).map(x => x.label), ["Pengerahan alat berat", "Buka jalur desa"]);
  assert.match(r.j.tindakan.at(-1).oleh, /^BPBD /);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/periksa`, {hasil: "valid", catatan: "x"}, bogor.h)).s, 400, "catatan wajib");
  const vAwal = await n("lapor_versi", `nomor = '${nomor}'`);
  const baru = (awal.nilai ?? 0) + 3;
  r = await api("POST", `/api/lapor/meja/${nomor}/periksa`, {hasil: "sebagian", catatan: "Dicek bersama kades, korban bertambah", ubah: {meninggal: baru}}, bogor.h); assert.equal(r.s, 200, r.t.slice(0, 300));
  assert.equal(r.j.status, "ditindaklanjuti", "Sebagian benar tidak memindah status");
  assert.deepEqual(r.j.revisi.find(x => x.nama === "meninggal"), {...awal, nilai: baru, petugas: true});
  assert.equal(r.j.periksa.at(-1).hasil, "sebagian"); assert.deepEqual(r.j.periksa.at(-1).perubahan, [{nama: "meninggal", dari: awal.nilai, ke: baru}]);
  assert.equal(await n("lapor_versi", `nomor = '${nomor}'`), vAwal + 1, "versi baru");
  assert.equal(await n("lapor_pdf", `nomor = '${nomor}' AND status = 'antre'`) >= 1, true, "PDF versi baru diantre");
  r = await api("POST", `/api/lapor/meja/${nomor}/periksa`, {hasil: "tidak_valid", catatan: "Tidak ada longsor di titik itu"}, bogor.h); assert.equal(r.s, 200);
  assert.equal(r.j.status, "tidak_valid"); assert.equal(await n("lapor_periksa", `nomor = '${nomor}'`), 2);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/periksa`, {hasil: "valid", catatan: "cek ulang lagi"}, bogor.h)).s, 409, "tiket tertutup");
  // kembali ke ditindaklanjuti untuk uji alun
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "ditelaah", catatan: "cek ulang"}, ADMIN)).s, 200);
  assert.equal((await api("POST", `/api/lapor/meja/${nomor}/status`, {ke: "ditindaklanjuti", tindakan: ["evakuasi"]}, ADMIN)).s, 200);
});

async function laporanBaru(wa) {   // laporan longsor lengkap sampai terkirim, tanpa foto; mengembalikan nomornya
  await api("POST", "/api/lapor/izin", {wa}, MESIN);
  let r = await keFoto(wa); r = await ketik(wa, {teks: "1"});
  for (let i = 0; i < 60 && r.status !== "ringkasan"; i++) r = await ketik(wa, {teks: r.pilihan ? "1" : i % 2 ? "belum tahu" : "tidak ada"});
  r = await ketik(wa, {teks: "1"}); assert.equal(r.status, "terkirim"); return r.nomor;
}
uji("alun-alun hidup: titik pusat desa 4 desimal, satu kartu per gugus dengan nWarga, foto publik, tanpa identitas", async () => {
  const wa6 = (await DB.prepare("SELECT nomor FROM lapor_sesi WHERE wa = ? AND nomor IS NOT NULL").bind(WA6).first()).nomor;
  const a = await api("GET", "/api/lapor/alun"); assert.equal(a.s, 200, a.t.slice(0, 200));
  const kartu = a.j.baris.filter(x => x.jenisId === "longsor"); assert.equal(kartu.length, 1, "dua laporan satu gugus = satu kartu");
  const k = kartu[0]; assert.equal(k.nWarga, 2, "dua nomor pelapor berbeda");
  assert.ok(k.titik && Math.abs(k.titik.lat - Math.round(k.titik.lat * 1e4) / 1e4) < 1e-9 && Math.abs(k.titik.lon - Math.round(k.titik.lon * 1e4) / 1e4) < 1e-9, "dibulatkan 4 desimal");
  assert.ok(k.titik.lat !== LOK.lat || k.titik.lon !== LOK.lon, "titik bukan koordinat pelapor");
  assert.equal(k.bukti.length, 1); assert.match(k.bukti[0], /^\/api\/lapor\/bukti\/[0-9a-f]{16}\?alun=1$/);
  assert.match(k.id, /^[0-9a-f]{10}$/);
  for (const dilarang of [WA, WA6, nomor, wa6, "Budi", "Siti", token, "lat\":-6.6,\"lon\":106.8"]) assert.ok(!a.t.includes(dilarang), `bocor: ${dilarang}`);
  assert.deepEqual(Object.keys(k).sort(), ["bukti", "dampak", "id", "jenis", "jenisId", "lokasi", "nWarga", "status", "statusLabel", "subjenis", "tingkat", "titik", "waktu"]);
  // id kartu = sidik laporan paling awal gugus: tetap bila laporan baru bergabung; bukti dicabut = kartu tanpa foto
  const id1 = k.id; await DB.prepare("UPDATE lapor_bukti SET publik = 0").run();
  assert.equal((await api("GET", "/api/lapor/alun?jenis=longsor&x=1")).s, 400, "parameter lain ditolak: kunci cache tepi tidak bisa dibanjiri");
  assert.equal((await api("GET", "/api/lapor/alun?jenis=zzz")).s, 400, "jenis di luar daftar ditolak");
  const b = await api("GET", "/api/lapor/alun?jenis=longsor"); assert.equal(b.j.baris[0].bukti.length, 0); assert.equal(b.j.baris[0].id, id1);
  await DB.prepare("UPDATE lapor_bukti SET publik = 1 WHERE id = (SELECT id FROM lapor_bukti ORDER BY waktu LIMIT 1)").run();
});

uji("teruskan: hanya BNPB; status Diteruskan, pesan BPBD tanpa isi laporan diantre, batas 20 per kab per hari, kab tanpa akun tetap jalan", async () => {
  const no1 = await laporanBaru("6281200000017");
  // dari Dilihat harus lewat Ditelaah (aturan A8): teruskan langsung 409
  await api("POST", `/api/lapor/meja/${no1}/lihat`, {}, ADMIN);
  assert.equal((await api("POST", `/api/lapor/meja/${no1}/teruskan`, {}, ADMIN)).s, 409);
  assert.equal((await api("POST", `/api/lapor/meja/${no1}/status`, {ke: "ditelaah"}, ADMIN)).s, 200);
  assert.equal((await api("POST", `/api/lapor/meja/${no1}/teruskan`, {}, bogor.h)).s, 403, "BPBD tidak meneruskan");
  assert.equal((await api("POST", `/api/lapor/meja/${no1}/teruskan`, {})).s, 403, "tamu");
  const r = await api("POST", `/api/lapor/meja/${no1}/teruskan`, {}, ADMIN); assert.equal(r.s, 200, r.t.slice(0, 300));
  assert.equal(r.j.status, "diteruskan"); assert.equal(r.j.bpbdTerdaftar, true); assert.equal(r.j.antre, 1);
  assert.match(r.j.riwayat.at(-1).catatan, /^Diteruskan ke meja BPBD /);
  const q = await DB.prepare("SELECT wa, nomor, teks, kab FROM lapor_kabar_bpbd").all(); assert.equal(q.results.length, 1);
  assert.equal(q.results[0].wa, WA_BOGOR); assert.match(q.results[0].teks, /\/lapor\/meja$/);
  for (const dilarang of ["longsor", "Longsor", "628120000001", "Desa", "meninggal"]) assert.ok(!q.results[0].teks.includes(dilarang), `pesan BPBD memuat isi laporan: ${dilarang}`);
  // bot yang ada: butir berjenis "bpbd" dengan id berawalan b, ditandai lewat rute kabar yang sama
  const kb = (await api("GET", "/api/lapor/kabar", undefined, MESIN)).j.kabar.filter(x => x.jenis === "bpbd"); assert.equal(kb.length, 1);
  assert.match(kb[0].id, /^b\d+$/); assert.equal(kb[0].wa, WA_BOGOR); assert.equal(kb[0].teks, q.results[0].teks);
  assert.equal((await api("POST", `/api/lapor/kabar/${kb[0].id}/terkirim`, {}, MESIN)).s, 200);
  assert.equal((await api("POST", `/api/lapor/kabar/${kb[0].id}/terkirim`, {}, MESIN)).s, 404);
  assert.equal((await api("GET", "/api/lapor/kabar", undefined, MESIN)).j.kabar.filter(x => x.jenis === "bpbd").length, 0);
  assert.equal((await api("POST", `/api/lapor/meja/${no1}/teruskan`, {}, ADMIN)).s, 409, "sudah diteruskan");
  // batas 20 per kab per hari: status tetap pindah, pesan tidak diantre
  const no2 = await laporanBaru("6281200000018");
  const kini = Date.now();
  await DB.batch(Array.from({length: 18}, (_, i) => DB.prepare("INSERT INTO lapor_kabar_bpbd (wa, nomor, kab, teks, dibuat, terkirim) VALUES (?, 'LA-000000-00', ?, 'x', ?, ?)").bind(WA_BOGOR, W.kab, kini - 3600e3, kini)));
  await api("POST", `/api/lapor/meja/${no2}/lihat`, {}, ADMIN); await api("POST", `/api/lapor/meja/${no2}/status`, {ke: "ditelaah"}, ADMIN);
  let t = await api("POST", `/api/lapor/meja/${no2}/teruskan`, {}, ADMIN); assert.equal(t.j.antre, 1, "pesan ke-20 masih lolos");   // 1 (no1) + 18 + 1 = 20
  const no3 = await laporanBaru("6281200000019");
  await api("POST", `/api/lapor/meja/${no3}/lihat`, {}, ADMIN); await api("POST", `/api/lapor/meja/${no3}/status`, {ke: "ditelaah"}, ADMIN);
  t = await api("POST", `/api/lapor/meja/${no3}/teruskan`, {}, ADMIN); assert.equal(t.s, 200); assert.equal(t.j.status, "diteruskan"); assert.equal(t.j.bpbdTerdaftar, true); assert.equal(t.j.antre, 0, "batas 20 per kab per hari");
  // kab tanpa akun aktif: status pindah, tidak ada pesan
  const no4 = await laporanBaru("6281200000020");
  await DB.prepare("UPDATE instansi_akun SET status = 'dicabut' WHERE kab = ?").bind(W.kab).run();
  await api("POST", `/api/lapor/meja/${no4}/lihat`, {}, ADMIN); await api("POST", `/api/lapor/meja/${no4}/status`, {ke: "ditelaah"}, ADMIN);
  t = await api("POST", `/api/lapor/meja/${no4}/teruskan`, {}, ADMIN); assert.equal(t.s, 200); assert.equal(t.j.bpbdTerdaftar, false); assert.equal(t.j.antre, 0);
  assert.equal((await api("GET", "/api/lapor/meja", undefined, bogor.h)).s, 403, "akun dicabut kehilangan meja");
  await DB.prepare("UPDATE instansi_akun SET status = 'aktif' WHERE kab = ?").bind(W.kab).run();
});

uji("agregat: hanya akun kampus aktif, staf, admin; sel kecil <3; tanpa identitas; tiap unduhan tercatat", async () => {
  const kini = Date.now(), wil = (kode, kab) => JSON.stringify({wilayah: {provKode: "32", prov: "Jawa Barat", kabKode: kode, kab}, waktuMs: kini - 3600e3});
  const baris = [["62812007001", "32.99", "Kabupaten Uji A"], ["62812007002", "32.99", "Kabupaten Uji A"], ["62812007003", "32.99", "Kabupaten Uji A"], ["62812007004", "32.98", "Kabupaten Uji B"]];
  await DB.batch(baris.flatMap(([wa, kode, kab], i) => [DB.prepare("INSERT INTO lapor_sesi (id, wa, status, jenis, kerja, ringkas, rev, nomor, terkirim, dibuat, diubah) VALUES (?, ?, 'terkirim', 'banjir', '{}', ?, 0, ?, ?, ?, ?)")
      .bind(`agregatuji${i}`.padEnd(14, "0"), wa, wil(kode, kab), `LA-0303${10 + i}-01`, kini, kini, kini),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, ?, ?)").bind(`LA-0303${10 + i}-01`, `agregatuji${i}`.padEnd(14, "0"), i === 2 ? "tidak_valid" : "baru", kini)]));
  // hak: tamu, BPBD, dan kampus yang belum aktif ditolak
  assert.equal((await api("GET", "/api/lapor/agregat")).s, 403);
  assert.equal((await api("GET", "/api/lapor/agregat", undefined, bogor.h)).s, 403, "BPBD bukan kampus mitra");
  const tok = "ab12".repeat(16), HK = {cookie: `sesi_kemitraan=${tok}`};
  await DB.batch([DB.prepare("INSERT INTO institusi (id, nama, jenis, pic_nama, dibuat, diubah) VALUES ('a1b2c3d4e5f60002', 'Kampus Uji', 'pts', 'PIC', 1, 1)"),
    DB.prepare("INSERT INTO km_akun (id, institusi_id, nama, email, status, dibuat, diubah) VALUES ('a1b2c3d4e5f60001', 'a1b2c3d4e5f60002', 'Dosen Uji', 'dosen@kampus.id', 'menunggu', 1, 1)"),
    DB.prepare("INSERT INTO km_sesi (sha, akun_id, dibuat, sampai) VALUES (?, 'a1b2c3d4e5f60001', 1, ?)").bind(sha256(tok), kini + 3600e3)]);
  assert.equal((await api("GET", "/api/lapor/agregat", undefined, HK)).s, 403, "akun kampus belum aktif");
  await DB.prepare("UPDATE km_akun SET status = 'aktif'").run();
  const j = await api("GET", "/api/lapor/agregat?format=json", undefined, HK); assert.equal(j.s, 200, j.t.slice(0, 200));
  assert.equal(j.j.batas, 3); assert.ok(j.j.kolom.length >= 10);
  const A = j.j.baris.find(x => x.kab_kode === "32.99"), B = j.j.baris.find(x => x.kab_kode === "32.98");
  assert.equal(A.laporan, 3); assert.equal(A.pelapor, 3); assert.equal(A.tidak_valid, 1); assert.equal(A.jenis, "Banjir"); assert.equal(A.selisih_resmi_menit, "belum tersedia", "belum ada pencocok, bukan nol");
  assert.equal(B.laporan, "<3"); assert.equal(B.pelapor, "<3"); assert.equal(B.tidak_valid, null);
  for (const dilarang of [/628\d{6,}/, /LA-\d{6}/, /"wa"/, /Budi|Siti/, /"lat"|"lon"|desa|token/i]) assert.ok(!dilarang.test(j.t), `agregat memuat ${dilarang}`);
  const c = await mf.dispatchFetch("http://bnpb.lokal/api/lapor/agregat?format=csv", {headers: HK}); assert.equal(c.status, 200);
  assert.match(c.headers.get("content-type"), /^text\/csv/); const teks = await c.text(); assert.match(teks, /^minggu,prov_kode,provinsi,/); assert.ok(!/628\d{6,}|LA-\d{6}/.test(teks));
  assert.equal((await api("GET", "/api/lapor/agregat?format=csv", undefined, ADMIN)).s, 200, "admin boleh");
  const log = (await DB.prepare("SELECT akun, berkas FROM lapor_unduh ORDER BY id").all()).results;
  assert.deepEqual(log.map(x => x.berkas), ["agregat.json", "agregat.csv", "agregat.csv"]); assert.equal(log[0].akun, "kk:a1b2c3d4e5f60001"); assert.match(log[2].akun, /^admin:/);
});

/* ---------- video bersambung (K57, K61, D77, D79, D89, D90) dan bahasa (K58, D80-D82); LA-58, LA-60, LA-61 ---------- */
const WV = "6281200000031", WV2 = "6281200000032", WV3 = "6281200000033", MB5 = 5 * 1048576, SAMPUL = "data:image/jpeg;base64," + B64;
const DETIK_1904 = 2082844800;
/* MP4 sintetis: ftyp di byte 4, mvhd (skala 1000, durasi detik, waktu rekam), ©xyz opsional; sisanya isian. Cukup untuk pembaca src/media_berkas.js. */
function buatMp4({ukuran, detik = 10, lat = null, lon = null, rekam = Date.now() - 60e3, merk = "isom"}) {
  const b = Buffer.alloc(ukuran, 0x61); b.writeUInt32BE(24, 0); b.write("ftyp" + merk, 4, "latin1");
  b.write("mvhd", 32, "latin1"); b.writeUInt32BE(Math.floor(rekam / 1000) + DETIK_1904, 40); b.writeUInt32BE(1000, 48); b.writeUInt32BE(Math.round(detik * 1000), 52);
  if (lat != null) { b[100] = 0xa9; b.write("xyz", 101, "latin1"); b.write(`\0\0\0\0${lat > 0 ? "+" : "-"}${Math.abs(lat).toFixed(4)}${lon > 0 ? "+" : "-"}${Math.abs(lon).toFixed(4)}/`, 104, "latin1"); }
  return b;
}
const GPS = () => ({lat: -6.6, lon: 106.8, akurasi: 10, waktu: Date.now()});
const mulai = (wa, b, h = MESIN) => api("POST", "/api/lapor/unggah/mulai", {wa, ...b}, h);
const bagian = async (wa, id, n, bytes, h = MESIN) => { const r = await mf.dispatchFetch(`http://bnpb.lokal/api/lapor/unggah/${id}/${n}?wa=${wa}`, {method: "PUT", headers: h, body: bytes}); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return {s: r.status, j, t}; };
const statusU = (wa, id) => api("GET", `/api/lapor/unggah/${id}?wa=${wa}`, undefined, MESIN);
const selesaiU = (wa, id, b = {}) => api("POST", `/api/lapor/unggah/${id}/selesai`, {wa, sampul: SAMPUL, ...b}, MESIN);
const kirimBagian = async (wa, id, vid) => { for (let i = 0; i * MB5 < vid.length; i++) { const r = await bagian(wa, id, i, vid.subarray(i * MB5, (i + 1) * MB5)); assert.equal(r.s, 200, r.t.slice(0, 200)); } };
async function videoUtuh(wa, vid, {gps = GPS(), durasi = 10, sampul} = {}) {   // mulai, semua bagian, selesai; mengembalikan {id, r}
  const m = await mulai(wa, {ukuran: vid.length, durasi, gps}); assert.equal(m.s, 200, m.t.slice(0, 200));
  await kirimBagian(wa, m.j.id, vid); return {id: m.j.id, r: await selesaiU(wa, m.j.id, sampul === undefined ? {} : {sampul})};
}
const R2 = async () => mf.getR2Bucket("MEDIA");
const adaR2 = async k => !!(await (await R2()).head(k));
let vidId, vid, nomorV, tokenV;

uji("video bersambung: tiga bagian, satu terpotong ditolak lalu dilanjutkan, status bagian, selesai masuk laporan sebagai video", async () => {
  for (const wa of [WV, WV2, WV3]) assert.equal((await api("POST", "/api/lapor/izin", {wa}, MESIN)).s, 200);
  assert.equal((await mulai(WV3, {ukuran: 5000})).s, 409, "belum ada laporan yang diisi");
  await keFoto(WV);
  vid = buatMp4({ukuran: 2 * MB5 + 123456, detik: 10});
  for (const ukuran of [999, 31457281, "5000", null, 12.5]) assert.equal((await mulai(WV, {ukuran})).s, 400, String(ukuran));
  assert.equal((await api("POST", "/api/lapor/unggah/mulai", {ukuran: 5000})).s, 401, "tamu");
  const m = await mulai(WV, {ukuran: vid.length, durasi: 10, gps: GPS(), bahasa: "id"}); assert.equal(m.s, 200, m.t.slice(0, 200));
  vidId = m.j.id; assert.match(vidId, /^[0-9a-f]{16}$/); assert.equal(m.j.jumlah, 3); assert.equal(m.j.bagian, MB5); assert.deepEqual(m.j.diterima, []);
  assert.equal(await n("lapor_unggah", `id = '${vidId}' AND wa = '${WV}'`), 1);
  // kuki palsu tanpa sesi hidup ditolak sebelum badan 5 MB dibaca (tinjauan keamanan tahap 2)
  const palsu = await bagian(WV, vidId, 0, Buffer.alloc(1000, 1), {cookie: "sesi_masuk=" + "00".repeat(32), "x-pb": "1", origin: "http://bnpb.lokal"});
  assert.equal(palsu.s, 401, palsu.t.slice(0, 200));
  // nomor lain tidak bisa menyentuh unggahan orang lain
  assert.equal((await statusU(WV2, vidId)).s, 404); assert.equal((await bagian(WV2, vidId, 0, vid.subarray(0, MB5))).s, 404); assert.equal((await selesaiU(WV2, vidId)).s, 404);
  assert.equal((await statusU(WV, "0".repeat(16))).s, 404, "unggahan tak dikenal");
  assert.equal((await bagian(WV, vidId, 3, Buffer.alloc(10))).s, 404, "nomor bagian di luar jumlah");
  // bagian terpotong ditolak, tidak tercatat; yang berlebih ditolak
  let r = await bagian(WV, vidId, 0, vid.subarray(0, 1000)); assert.equal(r.s, 400); assert.match(r.t, /terpotong/);
  assert.deepEqual((await statusU(WV, vidId)).j.diterima, []);
  assert.equal((await bagian(WV, vidId, 0, Buffer.alloc(MB5 + 1))).s, 413);
  // dilanjutkan: bagian 0 dan 2 (terakhir, lebih kecil), lalu status dan selesai-terlalu-dini
  assert.deepEqual((await bagian(WV, vidId, 0, vid.subarray(0, MB5))).j.diterima, [0]);
  assert.deepEqual((await bagian(WV, vidId, 2, vid.subarray(2 * MB5))).j.diterima, [0, 2]);
  assert.equal((await bagian(WV, vidId, 2, vid.subarray(2 * MB5, 2 * MB5 + 10))).s, 400, "bagian terakhir harus tepat sisanya");
  const st = await statusU(WV, vidId); assert.deepEqual(st.j.diterima, [0, 2]); assert.equal(st.j.jumlah, 3); assert.equal(st.j.bagian, MB5);
  const dini = await selesaiU(WV, vidId); assert.equal(dini.s, 409); assert.deepEqual(dini.j.diterima, [0, 2]);
  assert.equal(await n("lapor_unggah", `id = '${vidId}'`), 1, "belum lengkap: unggahan tetap menunggu");
  assert.equal((await bagian(WV, vidId, 1, vid.subarray(MB5, 2 * MB5))).s, 200);   // bagian ulang boleh (menimpa)
  assert.equal((await bagian(WV, vidId, 1, vid.subarray(MB5, 2 * MB5))).s, 200);
  assert.deepEqual((await statusU(WV, vidId)).j.diterima, [0, 1, 2]);
  // sampul rusak = ditolak dan semua dibuang; unggahan baru dipakai untuk selesai yang benar
  const ok = await selesaiU(WV, vidId); assert.equal(ok.s, 200, ok.t.slice(0, 300));
  assert.equal(ok.j.fotoBaru.jenis, "video"); assert.equal(ok.j.fotoBaru.durasi, 10); assert.equal(ok.j.fotoBaru.lencana, "gps"); assert.equal(ok.j.fotoBaru.id, vidId);
  assert.equal((await (await R2()).head(`lapor/foto/${vidId}.vid`)).size, vid.length); assert.ok(await adaR2(`lapor/foto/${vidId}.jpg`), "sampul di R2");
  assert.equal(await n("lapor_unggah", `id = '${vidId}'`), 0, "baris unggahan dibuang");
  assert.equal(await n("lapor_foto", `id = '${vidId}' AND kunci_r2 = 'lapor/foto/${vidId}.vid'`), 1);
  const kerja = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE wa = ? AND nomor IS NULL").bind(WV).first()).kerja);
  assert.deepEqual([kerja.foto[0].jenis, kerja.foto[0].eks, kerja.foto[0].durasi], ["video", "mp4", 10]);
  // sesudah selesai, unggahan yang sama tidak ada lagi
  assert.equal((await selesaiU(WV, vidId)).s, 404);
  // lanjutkan laporan sampai terkirim
  r = await ketik(WV, {teks: "1"});
  for (let i = 0; i < 60 && r.status !== "ringkasan"; i++) r = await ketik(WV, {teks: r.pilihan ? "1" : i % 2 ? "belum tahu" : "tidak ada"});
  r = await ketik(WV, {teks: "1"}); assert.equal(r.status, "terkirim"); nomorV = r.nomor; tokenV = /t=([0-9a-f]{32})/.exec(r.lacak)[1];
});

uji("video bersambung: penyajian dengan Range (206), sampul, token, meja memuat video, PDF memakai sampul, BPBD hanya wilayahnya", async () => {
  const dasar = `/api/lapor/foto/${vidId}`, ambil = (j, h = {}) => mf.dispatchFetch("http://bnpb.lokal" + j, {headers: h});
  let r = await ambil(`${dasar}.mp4?t=${tokenV}`); assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "video/mp4"); assert.equal(r.headers.get("accept-ranges"), "bytes");
  assert.match(r.headers.get("cache-control"), /private/); assert.equal(r.headers.get("x-robots-tag"), "noindex");
  assert.equal(Buffer.compare(Buffer.from(await r.arrayBuffer()), vid), 0, "berkas utuh sama dengan yang diunggah");
  r = await ambil(`${dasar}.mp4?t=${tokenV}`, {range: "bytes=0-99"}); assert.equal(r.status, 206); assert.equal(r.headers.get("content-range"), `bytes 0-99/${vid.length}`); assert.equal(r.headers.get("content-length"), "100");
  assert.equal(Buffer.compare(Buffer.from(await r.arrayBuffer()), vid.subarray(0, 100)), 0);
  r = await ambil(`${dasar}.mp4?t=${tokenV}`, {range: `bytes=${MB5 - 10}-${MB5 + 9}`}); assert.equal(r.status, 206); assert.equal(Buffer.compare(Buffer.from(await r.arrayBuffer()), vid.subarray(MB5 - 10, MB5 + 10)), 0, "rentang melintasi batas bagian");
  r = await ambil(`${dasar}.mp4?t=${tokenV}`, {range: "bytes=-50"}); assert.equal(r.status, 206); assert.equal(r.headers.get("content-range"), `bytes ${vid.length - 50}-${vid.length - 1}/${vid.length}`);
  r = await ambil(`${dasar}.mp4?t=${tokenV}`, {range: `bytes=${vid.length + 10}-`}); assert.equal(r.status, 416); assert.equal(r.headers.get("content-range"), `bytes */${vid.length}`);
  await (await ambil(`${dasar}.mp4?t=${tokenV}`)).arrayBuffer();
  r = await ambil(`${dasar}?t=${tokenV}`); assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/jpeg", "tanpa ekstensi = sampul"); assert.equal((await r.arrayBuffer()).byteLength, JPEG_SAH.length);
  for (const j of [`${dasar}.mp4`, `${dasar}.mp4?t=${"0".repeat(32)}`, `${dasar}?t=${"0".repeat(32)}`, `${dasar}.exe?t=${tokenV}`, `/api/lapor/foto/${fotoId}.mp4?t=${token}`]) assert.equal((await ambil(j)).status, 404, j);
  assert.equal((await ambil(`${dasar}.mp4`, ADMIN)).status, 200, "staf meja boleh tanpa token");
  // meja: foto memuat video dengan sampul dan durasi
  const rin = await api("GET", `/api/lapor/meja/${nomorV}`, undefined, ADMIN); assert.equal(rin.s, 200);
  assert.deepEqual([rin.j.foto[0].jenis, rin.j.foto[0].durasi], ["video", 10]); assert.equal(rin.j.foto[0].url, `${dasar}.mp4?t=${tokenV}`); assert.equal(rin.j.foto[0].sampul, `${dasar}?t=${tokenV}`);
  // BPBD: kab asal melihat video, kab lain tidak punya rincian (jadi tidak punya token)
  const kab = await api("GET", `/api/lapor/meja/${nomorV}`, undefined, bogor.h); assert.equal(kab.s, 200); assert.equal(kab.j.foto[0].jenis, "video"); assert.equal((await ambil(kab.j.foto[0].url)).status, 200);
  assert.equal((await api("GET", `/api/lapor/meja/${nomorV}`, undefined, bandung.h)).s, 404, "kab lain");
  // lacak: foto pertama = sampul; PDF: video diwakili sampulnya (alamat tanpa ekstensi)
  assert.equal((await api("GET", `/api/lapor/lacak?t=${tokenV}`)).j.fotoPertama, `${dasar}?t=${tokenV}`);
  let q; for (let i = 0; i < 12 && !q; i++) q = (await api("GET", "/api/lapor/pdf/antre", undefined, MESIN)).j.antre.find(x => x.nomor === nomorV);   // antrean diambil bertahap
  assert.ok(q, "PDF antre");
  assert.match(q.bahan.foto[0].url, new RegExp(`/api/lapor/foto/${vidId}\\?t=${tokenV}$`)); assert.match(q.bahan.foto[0].ket, /^Video 10 detik, /);
  assert.ok(q.bahan.kelompok.some(g => g.judul === "Foto dan video" && /^Video 1$/.test(g.baris[0][0])));
});

uji("video bersambung: lebih 60 detik, bukan video, lokasi jauh, rekaman lama, sampul rusak ditolak dan berkas R2 dibuang; batas 3 video", async () => {
  await keFoto(WV2);
  const sisa = async (id, kode, re) => { assert.equal(kode.s, 400, kode.t.slice(0, 200)); assert.match(kode.j.galat, re);
    assert.equal(await adaR2(`lapor/foto/${id}.vid`), false, "berkas video dibuang"); assert.equal(await adaR2(`lapor/foto/${id}.jpg`), false, "sampul dibuang");
    assert.equal(await n("lapor_unggah", `id = '${id}'`), 0); assert.equal(await n("lapor_foto", `id = '${id}'`), 0); };
  let x = await videoUtuh(WV2, buatMp4({ukuran: 6 * 1048576, detik: 75}), {durasi: 75}); await sisa(x.id, x.r, /paling lama 60 detik/);
  x = await videoUtuh(WV2, Buffer.from("ini bukan video, hanya teks biasa ".repeat(100)), {durasi: 5}); await sisa(x.id, x.r, /bukan video/);
  x = await videoUtuh(WV2, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(4000, 1)])); await sisa(x.id, x.r, /bukan video/);   // JPEG disamarkan sebagai video
  x = await videoUtuh(WV2, buatMp4({ukuran: 3000, lat: -7.5, lon: 110.1})); await sisa(x.id, x.r, /lebih dari 5 km/);
  x = await videoUtuh(WV2, buatMp4({ukuran: 3000, rekam: Date.now() - 72 * 3600e3})); await sisa(x.id, x.r, /lebih dari 48 jam/);
  x = await videoUtuh(WV2, buatMp4({ukuran: 3000}), {sampul: "data:image/jpeg;base64,AAAA"}); await sisa(x.id, x.r, /sampul/);
  // durasi dari metadata menang atas klaim klien: klaim 5 detik, isi 90 detik
  x = await videoUtuh(WV2, buatMp4({ukuran: 3000, detik: 90}), {durasi: 5}); await sisa(x.id, x.r, /paling lama 60 detik/);
  assert.equal(await n("lapor_foto", `sesi = (SELECT id FROM lapor_sesi WHERE wa = '${WV2}' AND nomor IS NULL)`), 0, "tidak ada yang masuk laporan");
  // lokasi dekat dan webm diterima: lokasi dari metadata video menggantikan GPS yang tak ada; tiga video lolos, keempat ditolak
  x = await videoUtuh(WV2, buatMp4({ukuran: 3000, lat: -6.6, lon: 106.8}), {gps: null}); assert.equal(x.r.s, 200, x.r.t.slice(0, 200)); assert.equal(x.r.j.fotoBaru.lencana, "exif"); assert.equal(x.r.j.fotoBaru.lat, -6.6);
  x = await videoUtuh(WV2, buatMp4({ukuran: 3000, merk: "qt  "})); assert.equal(x.r.s, 200); assert.equal((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE wa = ? AND nomor IS NULL").bind(WV2).first()).kerja.includes('"eks":"mov"'), true);
  const webm = Buffer.alloc(4000, 3); webm.set([0x1a, 0x45, 0xdf, 0xa3]); x = await videoUtuh(WV2, webm, {durasi: 7}); assert.equal(x.r.s, 200, x.r.t.slice(0, 200)); assert.equal(x.r.j.fotoBaru.durasi, 7, "WebM tanpa mvhd memakai durasi klien");
  assert.equal(await n("lapor_foto", `sesi = (SELECT id FROM lapor_sesi WHERE wa = '${WV2}' AND nomor IS NULL)`), 3);
  const keempat = await mulai(WV2, {ukuran: 3000}); assert.equal(keempat.s, 400); assert.match(keempat.j.galat, /3 video/);
  // pintu web: sesi + x-pb juga untuk PUT; multipart tidak tertinggal
  const tok = "9a".repeat(32), kini = Date.now(), H = {cookie: `sesi_masuk=${tok}`, origin: "http://bnpb.lokal"};
  await DB.batch([DB.prepare("INSERT INTO mk_akun (id, wa, status, dibuat) VALUES ('akunlaporuji0031', ?, 'aktif', ?)").bind(WV3, kini), DB.prepare("INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, 'akunlaporuji0031', ?, ?, ?)").bind(sha256(tok), kini, kini, kini + 3600e3)]);
  await keFoto(WV3);
  assert.equal((await mulai(WV3, {ukuran: 3000}, H)).s, 403, "POST tanpa x-pb");
  const mw = await mulai(WV3, {ukuran: 3000, bahasa: "en"}, {...H, "x-pb": "1"}); assert.equal(mw.s, 200, mw.t.slice(0, 200));
  assert.equal((await bagian(WV3, mw.j.id, 0, Buffer.alloc(3000), H)).s, 403, "PUT tanpa x-pb");
  assert.equal((await bagian(WV3, mw.j.id, 0, Buffer.alloc(3000), {...H, origin: "https://jahat.example", "x-pb": "1"})).s, 403, "PUT dari origin lain");
  assert.equal((await bagian(WV3, mw.j.id, 0, Buffer.alloc(3000), {...H, "x-pb": "1"})).s, 200);
  await DB.prepare("DELETE FROM lapor_unggah WHERE id = ?").bind(mw.j.id).run();
});

uji("video bersambung: batas laju dan unggahan berjalan per nomor", async () => {
  await DB.prepare("DELETE FROM lapor_unggah").run(); await DB.prepare("DELETE FROM laju_bnpb WHERE aksi IN ('lapor.unggah', 'lapor.bagian')").run();
  await DB.prepare("DELETE FROM lapor_foto WHERE sesi = (SELECT id FROM lapor_sesi WHERE wa = ? AND nomor IS NULL)").bind(WV2).run();
  const kerja = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE wa = ? AND nomor IS NULL").bind(WV2).first()).kerja); kerja.foto = [];
  await DB.prepare("UPDATE lapor_sesi SET kerja = ? WHERE wa = ? AND nomor IS NULL").bind(JSON.stringify(kerja), WV2).run();
  for (let i = 0; i < 5; i++) assert.equal((await mulai(WV2, {ukuran: 3000})).s, 200);
  const r = await mulai(WV2, {ukuran: 3000}); assert.equal(r.s, 429, "paling banyak 5 unggahan berjalan"); assert.match(r.j.galat, /belum selesai/);
  await DB.prepare("DELETE FROM lapor_unggah").run();
  await DB.batch(Array.from({length: 30}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lapor.unggah', ?)").bind(WV2, Date.now())));
  const l = await mulai(WV2, {ukuran: 3000}); assert.equal(l.s, 429); assert.ok(l.j.sisaDetik > 0);
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'lapor.unggah'").run();
});

uji("video bersambung: cron menit 17 membatalkan multipart dan membuang unggahan 24 jam tanpa bagian baru", async () => {
  await DB.prepare("DELETE FROM lapor_unggah").run();
  const t = new Date(); t.setUTCMinutes(17, 0, 0); const sekarang = t.getTime();
  const a = (await mulai(WV2, {ukuran: 2 * MB5 + 10})).j.id, b = (await mulai(WV2, {ukuran: 2 * MB5 + 10})).j.id;
  assert.equal((await bagian(WV2, a, 0, Buffer.alloc(MB5))).s, 200);
  await DB.prepare("UPDATE lapor_unggah SET akhir = ? WHERE id = ?").bind(sekarang - 25 * 3600e3, a).run();   // basi
  await DB.prepare("UPDATE lapor_unggah SET akhir = ? WHERE id = ?").bind(sekarang - 23 * 3600e3, b).run();   // belum
  await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: sekarang});
  assert.equal(await n("lapor_unggah", `id = '${a}'`), 0, "basi dibuang"); assert.equal(await n("lapor_unggah", `id = '${b}'`), 1, "yang baru 23 jam tetap");
  assert.equal((await statusU(WV2, a)).s, 404);
  assert.equal((await bagian(WV2, a, 1, Buffer.alloc(MB5))).s, 404, "bagian ke unggahan yang dibuang ditolak");
  assert.equal(await adaR2(`lapor/foto/${a}.vid`), false); await DB.prepare("DELETE FROM lapor_unggah").run();
});

/* ---------- bahasa (K58, D80-D82): model palsu lewat outboundService ---------- */
let mauUbahAngka = false; const keModel = [];
const luarModel = async req => {
  const u = new URL(req.url);
  if (u.hostname !== "api.anthropic.com") return new Response("diblok di uji", {status: 599});
  const b = await req.json(), sistem = b.system?.[0]?.text || "", isi = b.messages?.[0]?.content || "";
  const balas = obj => new Response(JSON.stringify({model: "palsu", stop_reason: "end_turn", usage: {}, content: [{type: "text", text: JSON.stringify(obj)}]}), {headers: {"content-type": "application/json"}});
  if (/translate a disaster report message/.test(sistem)) { keModel.push(isi); return balas({teks: `Terjemahan${mauUbahAngka ? " 99" : ""}: ${isi}`}); }
  if (/disaster reporting assistant/.test(sistem)) { const o = JSON.parse(isi); return balas({teks: "[EN] " + o.teks, pilihan: o.pilihan.map(x => "[EN] " + x), ket: o.ket}); }
  return new Response("model tidak dipakai di uji ini", {status: 500});   // pengurai mesin jatuh ke pengurai sederhana
};
uji("bahasa: tanpa model hanya Indonesia, pesan tidak diterjemahkan, daftar bahasa lewat rute", async () => {
  const l = await api("GET", "/api/lapor/bahasa"); assert.equal(l.s, 200); assert.deepEqual(l.j.bahasa, [{kode: "id", nama: "Bahasa Indonesia"}]);
  assert.match(l.h.get("cache-control"), /no-store/);
  assert.equal((await api("POST", "/api/lapor/izin", {wa: WV3}, MESIN)).s, 200); await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WV3).run();
  const r = await pesan(WV3, {teks: "halo", bahasa: "en", saluran: "web"}); assert.equal(r.s, 200); assert.ok(!/\[EN\]/.test(r.t) && r.j.bahasa === undefined, "tanpa kunci: Indonesia saja");
});

uji("terjemah teks kartu: tanpa model null per butir, bentuk salah 400, paling banyak 60 butir", async () => {
  const r = await api("POST", "/api/lapor/terjemah", {bahasa: "su", teks: ["Pakai lokasi saat ini", "Cari desa"]}, {origin: "http://bnpb.lokal"}); assert.equal(r.s, 200, r.t.slice(0, 200));
  assert.deepEqual(r.j.teks, [null, null], "tanpa model: null, supaya klien tidak menyimpan teks asli sebagai terjemahan");
  assert.equal((await api("POST", "/api/lapor/terjemah", {bahasa: "su", teks: "bukan daftar"}, {origin: "http://bnpb.lokal"})).s, 400);
  const banyak = await api("POST", "/api/lapor/terjemah", {bahasa: "su", teks: Array(80).fill("x".repeat(200))}, {origin: "http://bnpb.lokal"});
  assert.equal(banyak.j.teks.length, 60);
});

uji("bahasa: terjemah masuk disamarkan, asli tersimpan, balasan diterjemahkan, angka berubah ditolak, pintu WA ikut bahasa pilihan", async () => {
  const B = await siapkan("uji-lapor-bahasa", {r2: true, ikat: {WA_MESIN: "mesin-rahasia", ANTHROPIC_API_KEY: "kunci-uji"}, luar: luarModel});
  const WB = "6281200000041", kirimB = (b, h = MESIN) => B.api("POST", "/api/lapor/pesan", {wa: WB, ...b}, h);
  assert.equal((await B.api("POST", "/api/lapor/izin", {wa: WB}, MESIN)).s, 200);
  const l = await B.api("GET", "/api/lapor/bahasa"); assert.equal(l.s, 200); assert.equal(l.j.bahasa.length, (await import("../../src/lapor_bahasa.js")).BAHASA.length);   // daftar 25 bahasa sejak K65 assert.deepEqual(l.j.bahasa[1], {kode: "en", nama: "English"});
  // pesan pertama web berbahasa Inggris: terjemahan masuk ke mesin; yang sampai ke model tidak memuat nomor HP
  const masuk = "Hello I am Budi, call me 081234567890, flood in Bogor"; keModel.length = 0;
  let r = await kirimB({teks: masuk, bahasa: "en", saluran: "web"}); assert.equal(r.s, 200, r.t.slice(0, 300));
  assert.equal(keModel.length, 1); assert.ok(!keModel[0].includes("081234567890") && keModel[0].includes("[nomor HP]"), "disamarkan sebelum ke model");
  assert.match(r.j.balasan, /^\[EN\] /, "balasan diterjemahkan"); assert.equal(r.j.bahasa, "en"); assert.ok(r.j.pilihan.every(x => x.startsWith("[EN] ")), "label tombol ikut");
  assert.ok(!/^\[EN\]/.test(r.j.teksWa), "teksWa tidak diterjemahkan");
  let sesi = JSON.parse((await B.DB.prepare("SELECT kerja FROM lapor_sesi WHERE wa = ?").bind(WB).first()).kerja);
  const t = sesi.transkrip.find(x => x.dari === "pelapor"); assert.equal(sesi.bahasa, "en"); assert.equal(t.bahasa, "en"); assert.match(t.teks, /^Terjemahan: /);
  assert.equal(t.asli, "Hello I am Budi, call me [nomor HP], flood in Bogor", "asli tersimpan, juga disamarkan");
  assert.ok(!JSON.stringify(sesi).includes("081234567890"), "nomor HP mentah tidak ada di sesi");
  // angka yang berubah dalam terjemahan: terjemahan dibuang, teks asli yang dipakai, tanpa asli berdampingan
  mauUbahAngka = true; keModel.length = 0;
  await B.DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WB).run();
  r = await kirimB({teks: "Setuju sekali, ada 3 rumah", bahasa: "en", saluran: "web"}); assert.equal(r.s, 200); mauUbahAngka = false;
  sesi = JSON.parse((await B.DB.prepare("SELECT kerja FROM lapor_sesi WHERE wa = ?").bind(WB).first()).kerja);
  const t2 = sesi.transkrip.filter(x => x.dari === "pelapor").at(-1); assert.equal(t2.teks, "Setuju sekali, ada 3 rumah"); assert.equal(t2.asli, undefined);
  // pintu WA dengan bahasa (pemilik 20 Nov 2026: bot WA bisa bahasa daerah): pesan masuk diterjemahkan, teksWa yang dikirim gateway keluar dalam bahasa pilihan
  keModel.length = 0; await B.DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WB).run();
  r = await kirimB({teks: "lanjut", bahasa: "en", saluran: "wa"}); assert.equal(r.s, 200); assert.equal(keModel.length, 1, "pesan WA ikut diterjemahkan masuk"); assert.match(r.j.teksWa, /^\[EN\] /);
  await B.DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WB).run();
  r = await kirimB({teks: "lanjut", saluran: "wa"}); assert.ok(!/^\[EN\]/.test(r.j.teksWa), "WA tanpa bahasa tetap Indonesia");
  // nomor pilihan ("1") tidak diterjemahkan; bahasa tak dikenal = Indonesia
  await B.DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WB).run();
  keModel.length = 0; r = await kirimB({teks: "1", bahasa: "en", saluran: "web"}); assert.equal(keModel.length, 0, "angka saja tidak dikirim ke model");
  r = await kirimB({teks: "halo", bahasa: "xx", saluran: "web"}); assert.equal(r.s, 200); assert.equal(keModel.length, 0); assert.ok(!/\[EN\]/.test(r.t));
});

uji("bahasa: rincian meja memuat teks asli dan nama bahasa, foto memuat video (fungsi tampil murni)", async () => {
  const {mejaRinciTampil} = await import("../../src/lapor_tampil.js");
  const kini = Date.now(), isian = {jenis: {nilai: "banjir", asal: "pelapor"}, lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: {provKode: "32", prov: "Jawa Barat", kabKode: "32.01", kab: "Kab. Bogor", kec: "X", desa: "Y"}}}};
  const s = {nomor: "LA-010101-01", wa: "6281200000041", isian, terkirim: kini, bahasa: "jv", tiket: {status: "baru", riwayat: []}, balasan: [], bukti: [],
    foto: [{id: "a".repeat(16), jenis: "video", eks: "webm", durasi: 12, lencana: "gps", lencanaTeks: "Lokasi GPS perangkat"}, {id: "b".repeat(16), lencana: "tanpa", lencanaTeks: "Tanpa lokasi"}],
    transkrip: [{dari: "pelapor", teks: "banjir tiga rumah", asli: "banjir telung omah", bahasa: "jv", waktu: kini}, {dari: "bot", teks: "Terima kasih", waktu: kini}]};
  const o = mejaRinciTampil(s, {nama: "Budi"}, "t".repeat(32));
  assert.equal(o.bahasa, "Bahasa Jawa"); assert.equal(o.transkrip[0].asli, "banjir telung omah"); assert.equal(o.transkrip[1].asli, null);
  assert.deepEqual([o.foto[0].jenis, o.foto[0].durasi, o.foto[0].url.endsWith(".webm?t=" + "t".repeat(32))], ["video", 12, true]); assert.equal(o.foto[1].jenis, "foto"); assert.equal(o.foto[1].url, `/api/lapor/foto/${"b".repeat(16)}?t=${"t".repeat(32)}`);
});

uji("video tanpa kotak film: berkepala ftyp tanpa mvhd ditolak walau durasi peramban kecil (tinjauan keamanan tahap 2)", async () => {
  const W4 = "6281200000034"; assert.equal((await api("POST", "/api/lapor/izin", {wa: W4}, MESIN)).s, 200); await keFoto(W4);
  const b = Buffer.alloc(300000, 0x61); b.writeUInt32BE(24, 0); b.write("ftypisom", 4, "latin1");
  const {id, r} = await videoUtuh(W4, b, {durasi: 5});
  assert.equal(r.s, 400, r.t.slice(0, 200)); assert.match(r.j.galat, /Durasi video tidak terbaca/);
  assert.equal(await n("lapor_unggah", `id = '${id}'`), 0); assert.equal(await adaR2(`lapor/foto/${id}.vid`), false);
});

/* ---------- pintu web tanpa kode (K65, D99-D102, Q57; migrasi 0159): nomor diketik, terikat perangkat lewat kuki HttpOnly ---------- */
const WK = "6281200000051", WK2 = "6281200000052", ORI = "http://bnpb.lokal";
const kukiDari = r => /^(lapor_perangkat=[0-9a-f]{64});/.exec(r.h.get("set-cookie") || "")?.[1] ?? null;
function perangkat(ip) {   // satu peramban: menyimpan kukinya sendiri; kuota nomor ketikan berkunci nomor:perangkat
  let kuki = null; const h = () => ({origin: ORI, "x-pb": "1", ...(kuki ? {cookie: kuki} : {}), ...(ip ? {"cf-connecting-ip": ip} : {})});
  const lacakKuki = r => { kuki ||= kukiDari(r); return r; };
  return {get kuki() { return kuki; }, h,
    async pesan(wa, b) { await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?1 OR kunci LIKE ?1 || ':%'").bind(wa).run(); return lacakKuki(await api("POST", "/api/lapor/pesan", {wa, ...b}, h())); },
    async ketik(wa, b) { const r = await this.pesan(wa, b); assert.equal(r.s, 200, r.t.slice(0, 300));
      if (r.j.status === "kejadian" && !tawarKejadian) return this.ketik(wa, {teks: String(r.j.pilihan.length)});   // lihat _ketik
      return r.j; },
    get: async j => lacakKuki(await api("GET", j, undefined, h())), post: async (j, b) => lacakKuki(await api("POST", j, b, h()))};
}
const A = perangkat(), B = perangkat();
let nomorK, fotoK, tokenK;

uji("pintu web tanpa kode: penjaga x-pb, origin; kuki HttpOnly; hanya sidik di D1; kuki karangan tidak dikenal", async () => {
  for (const wa of [WK, WK2]) assert.equal((await api("POST", "/api/lapor/izin", {wa}, MESIN)).s, 200);
  assert.equal((await api("POST", "/api/lapor/pesan", {wa: WK, teks: "lapor"}, {origin: ORI})).s, 403, "tanpa x-pb");
  assert.equal((await api("POST", "/api/lapor/pesan", {wa: WK, teks: "lapor"}, {origin: "https://jahat.example", "x-pb": "1"})).s, 403, "origin lain");
  assert.equal((await api("POST", "/api/lapor/pesan", {teks: "lapor"}, {origin: ORI, "x-pb": "1"})).s, 401, "tanpa nomor");
  assert.equal(await n("lapor_perangkat"), 0, "penolakan tidak membuat ikatan"); assert.equal(await n("lapor_sesi", `wa = '${TAK}'`), 0);
  const r = await A.pesan(WK, {teks: "lapor"}); assert.equal(r.s, 200, r.t.slice(0, 200));
  const sc = r.h.get("set-cookie"); assert.match(sc, /^lapor_perangkat=[0-9a-f]{64}; /);
  for (const bagian of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/api/lapor", "Max-Age=31536000"]) assert.ok(sc.includes(bagian), `${bagian} di ${sc}`);
  const mentah = A.kuki.split("=")[1];
  assert.equal(await n("lapor_perangkat", `perangkat_sha = '${sha256(mentah)}' AND wa = '${WK}'`), 1, "D1 menyimpan sha256 kunci");
  assert.equal(await n("lapor_perangkat", `perangkat_sha = '${mentah}'`), 0, "kunci mentah tidak tersimpan");
  assert.equal(await n("lapor_milik", `jenis = 'sesi' AND perangkat_sha = '${sha256(mentah)}'`), 1, "sesi terikat ke perangkat");
  assert.equal(r.h.get("cache-control"), "private, no-store");
  assert.equal((await api("POST", "/api/lapor/pesan", {wa: WK, teks: "1"}, {"x-pb": "1", cookie: A.kuki})).s, 403, "kuki tanpa Origin ditolak seperti sesi lain");
  const sama = await A.post("/api/lapor/pesan", {wa: WK, teks: "1"}); assert.equal(sama.s, 200); assert.equal(sama.h.get("set-cookie"), null, "kuki yang sah tidak diterbitkan ulang");
  const karang = "ab".repeat(32), f = await api("POST", "/api/lapor/pesan", {wa: WK2, teks: "lapor"}, {origin: ORI, "x-pb": "1", cookie: `lapor_perangkat=${karang}`});
  assert.equal(f.s, 200); assert.ok(kukiDari(f) && !kukiDari(f).includes(karang), "kuki karangan diganti kuki terbitan server");
  assert.equal(await n("lapor_perangkat", `perangkat_sha = '${sha256(karang)}'`), 0);
});

uji("pintu web tanpa kode: nomor ketikan melapor sampai terkirim (foto GPS), ditandai belum terverifikasi di meja", async () => {
  await DB.prepare("DELETE FROM lapor_sesi WHERE wa = ?").bind(WK).run(); await DB.prepare("DELETE FROM lapor_milik WHERE jenis = 'sesi' AND perangkat_sha = ?").bind(sha256(A.kuki.split("=")[1])).run();
  const k = (b) => A.ketik(WK, b);
  let r = await k({teks: "lapor"});
  for (const t of ["1", "1", "Ani Pelapor"]) r = await k({teks: t});
  r = await k({lokasi: LOK}); r = await k({teks: "1"}); r = await k({teks: "Tidak tahu"});
  r = await k({teks: String(r.pilihan.findIndex(x => /longsor/i.test(x)) + 1)});
  for (const t of ["1", ...langkahKronologi("longsor").map(() => "1"), "2", "kemarin jam 05.30"]) r = await k({teks: t});
  let foto = false;
  for (let i = 0; i < 60 && r.status !== "terkirim"; i++) {
    if (r.status === "ringkasan") { r = await k({teks: "1"}); break; }
    if (r.minta === "foto" && !foto) {
      foto = true; await DB.prepare("DELETE FROM laju_bnpb WHERE kunci = ?").bind(WK).run();
      const f = await A.post("/api/lapor/foto", {wa: WK, data: B64, gps: {lat: -6.6, lon: 106.8, akurasi: 12, waktu: Date.now()}}); assert.equal(f.s, 200, f.t.slice(0, 300));
      assert.equal(f.j.fotoBaru.lencana, "gps"); fotoK = f.j.fotoBaru.id; r = await k({teks: "1"}); continue;
    }
    r = await k({teks: r.pilihan ? "1" : i % 2 ? "belum tahu" : "tidak ada"});
  }
  assert.ok(foto); assert.equal(r.status, "terkirim", JSON.stringify(r).slice(0, 300)); nomorK = r.nomor; tokenK = /t=([0-9a-f]{32})/.exec(r.lacak)[1];
  assert.equal(await n("lapor_tiket", `nomor = '${nomorK}'`), 1);
  const m = await api("GET", `/api/lapor/meja/${nomorK}`, undefined, ADMIN); assert.equal(m.s, 200);
  assert.equal(m.j.nomorTerverifikasi, false, "D101"); assert.equal(m.j.pelapor.wa, WK);
  const banding = await api("GET", `/api/lapor/meja/${nomor}`, undefined, ADMIN); assert.equal(banding.j.nomorTerverifikasi, true, "laporan lewat mesin tetap terverifikasi");
  assert.equal(JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(nomorK).first()).kerja).verifikasi, "ketik");
  assert.equal((await api("GET", `/api/lapor/lacak?t=${tokenK}`)).s, 200, "token lacak tetap seperti biasa");
});

uji("pintu web tanpa kode: perangkat lain dengan nomor sama tidak melihat sesi, kotak, status, foto; memulai sesi baru", async () => {
  assert.equal((await api("POST", `/api/lapor/meja/${nomorK}/lihat`, {}, ADMIN)).s, 200);
  assert.equal((await api("POST", `/api/lapor/meja/${nomorK}/balas`, {catatan: "Tim menuju lokasi."}, ADMIN)).s, 200);
  const q = j => `${j}${j.includes("?") ? "&" : "?"}wa=${WK}`;
  const sa = await A.get(q("/api/lapor/sesi")); assert.equal(sa.s, 200); assert.equal(sa.j.nomor, nomorK);
  const sb = await B.get(q("/api/lapor/sesi")); assert.equal(sb.s, 200); assert.ok(kukiDari(sb), "perangkat baru diberi kuki");
  assert.deepEqual(sb.j, {transkrip: []}, "perangkat B tidak melihat sesi A");
  const ka = await A.get(q("/api/lapor/kotak?sejak=0")); assert.ok(ka.j.pesan.some(x => x.nomor === nomorK && /Tim menuju lokasi/.test(x.teks)), "A melihat balasan");
  const kb = await B.get(q("/api/lapor/kotak?sejak=0")); assert.deepEqual(kb.j.pesan, [], "B tidak melihat balasan");
  const ta = await A.pesan(WK, {teks: "cek status"}); assert.match(ta.j.teksWa, new RegExp(nomorK));
  const tb = await B.pesan(WK, {teks: "cek status"}); assert.equal(tb.s, 200); assert.ok(!tb.t.includes(nomorK), "status B tidak memuat laporan A");
  const foto = async kuki => (await mf.dispatchFetch(`http://bnpb.lokal/api/lapor/foto/${fotoK}`, {headers: kuki ? {cookie: kuki} : {}})).status;
  assert.equal(await foto(A.kuki), 200, "foto sesi A untuk perangkat A"); assert.equal(await foto(B.kuki), 404, "perangkat B"); assert.equal(await foto(null), 404, "tanpa kuki");
  assert.equal((await B.post("/api/lapor/nilai", {wa: WK, nomor: nomorK, nilai: 5})).s, 400, "menilai laporan perangkat lain");
  assert.equal((await A.post("/api/lapor/nilai", {wa: WK, nomor: nomorK, nilai: 5})).s, 200);
  assert.equal((await B.post("/api/lapor/susulan", {wa: WK, nomor: nomorK})).s, 404, "susulan laporan perangkat lain");
  const sebelum = await n("lapor_sesi", `wa = '${WK}'`);
  const b1 = await B.ketik(WK, {teks: "lapor"}); assert.equal(b1.status, "identitas", "B memulai dari awal"); assert.ok(!b1.nomor);
  assert.equal(await n("lapor_sesi", `wa = '${WK}'`), sebelum + 1, "sesi B baru, sesi A tidak dilanjutkan");
  const sa2 = await A.get(q("/api/lapor/sesi")); assert.equal(sa2.j.nomor, nomorK, "A tetap melihat laporannya");
  // mesin dan sesi /masuk tidak diubah: mesin masih menjawab nomor yang sama
  assert.equal((await api("GET", q("/api/lapor/sesi"), undefined, MESIN)).s, 200);
});

uji("pintu web tanpa kode: unggahan video hanya untuk perangkat pembuatnya", async () => {
  await keFoto(WK2, (wa, b) => A.ketik(wa, b));
  const m = await A.post("/api/lapor/unggah/mulai", {wa: WK2, ukuran: 5000, durasi: 5, gps: GPS()}); assert.equal(m.s, 200, m.t.slice(0, 200));
  assert.equal(await n("lapor_milik", `jenis = 'unggah' AND id = '${m.j.id}'`), 1);
  const st = (d, w = WK2) => d.get(`/api/lapor/unggah/${m.j.id}?wa=${w}`);
  assert.equal((await st(A)).s, 200); assert.equal((await B.get(`/api/lapor/unggah/${m.j.id}?wa=${WK2}`)).s, 404, "B belum terikat ke WK2: ikatan baru, tapi bukan pemilik");
  assert.equal((await B.post("/api/lapor/unggah/mulai", {wa: WK2, ukuran: 5000})).s, 409, "B tidak punya laporan di tahap foto");
  const put = async (d, bytes) => { const r = await mf.dispatchFetch(`http://bnpb.lokal/api/lapor/unggah/${m.j.id}/0?wa=${WK2}`, {method: "PUT", headers: d.h(), body: bytes}); return r.status; };
  assert.equal(await put(B, Buffer.alloc(5000)), 404, "bagian dari perangkat lain");
  assert.equal(await put({h: () => ({origin: ORI, "x-pb": "1"})}, Buffer.alloc(5000)), 401, "tanpa kuki, badan besar ditolak sebelum dibaca");
  assert.equal(await put(A, Buffer.alloc(5000)), 200);
});

uji("pintu web tanpa kode: batas per perangkat (nomor), per IP (ikatan baru), per perangkat (pesan)", async () => {
  const C = perangkat(), nomorC = ["6281200000061", "6281200000062", "6281200000063", "6281200000064", "6281200000065", "6281200000066"];
  for (const wa of nomorC) assert.equal((await api("POST", "/api/lapor/izin", {wa}, MESIN)).s, 200);
  for (const wa of nomorC.slice(0, 5)) assert.equal((await C.get(`/api/lapor/sesi?wa=${wa}`)).s, 200, wa);
  assert.equal((await C.get(`/api/lapor/sesi?wa=${nomorC[5]}`)).s, 429, "satu perangkat paling banyak 5 nomor");
  assert.equal((await C.get(`/api/lapor/sesi?wa=${nomorC[0]}`)).s, 200, "nomor yang sudah terikat tetap bisa");
  let kode = 0; const IP = "203.0.113.77";
  for (let i = 0; i < 21; i++) kode = (await perangkat(IP).get(`/api/lapor/sesi?wa=${WK}`)).s;
  assert.equal(kode, 429, "ikatan baru per IP: 20 per jam");
  const D = perangkat("203.0.113.88"); await D.ketik(WK2, {teks: "lapor"});
  const dev = sha256(D.kuki.split("=")[1]); await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'lapor.perangkat', ?)").bind(dev, Date.now())));
  const r = await D.pesan(WK2, {teks: "1"}); assert.equal(r.s, 429, "120 pesan per jam per perangkat"); assert.match(r.j.balasan, /Kuota pesan/);
});

uji("pintu web tanpa kode: klaim BPBD dari nomor ketikan tidak naik; lewat mesin naik (D101)", async () => {
  const WB = "6281200000071", WM = "6281200000072";
  for (const wa of [WB, WM]) assert.equal((await api("POST", "/api/lapor/izin", {wa, peran: "bpbd", kab: "Kab. Bogor"}, MESIN)).s, 200);
  const E = perangkat("203.0.113.99");
  for (const [wa, k] of [[WB, t => E.ketik(WB, t)], [WM, t => ketik(WM, t)]]) {
    let r = await k({teks: "lapor"}); r = await k({teks: "1"}); r = await k({teks: "2"});   // peran: Petugas BPBD
    r = await k({form: {nama: "Dedi", peran: "bpbd", kab: "Kab. Bogor", jabatan: "Staf"}}).catch(() => r);
    r = await k({teks: "Dedi"}).catch(() => r);
    await k({teks: "Halo"});
    const p = await DB.prepare("SELECT peran FROM lapor_pelapor WHERE wa = ?").bind(wa).first();
    if (wa === WM) assert.equal(p?.peran, "bpbd", `${wa} ${JSON.stringify(p)}`);
    else {   // nomor ketikan: profil disimpan di sesinya sendiri, tidak menimpa profil pemilik nomor (tinjauan keamanan 20 Nov 2026)
      assert.equal(p, null, "profil nomor ketikan tidak ditulis ke lapor_pelapor");
      const k = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE wa = ? ORDER BY diubah DESC LIMIT 1").bind(wa).first()).kerja);
      assert.equal(k.pelaporKetik?.peran, "bpbd_klaim");
    }
  }
});

uji("pintu web tanpa kode: WA pemilik nomor tidak melanjutkan sesi yang dibuat orang lain dari nomor ketikan (D100)", async () => {
  const WX = "6281200000077"; assert.equal((await api("POST", "/api/lapor/izin", {wa: WX}, MESIN)).s, 200);
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'lapor.ikat'").run();   // uji sebelumnya sengaja menghabiskan batas ikatan per IP
  const C = perangkat("203.0.113.77"); await C.ketik(WX, {teks: "lapor"}); await C.ketik(WX, {teks: "1"});
  assert.equal(await n("lapor_sesi", `wa = '${WX}'`), 1);
  const r = await pesan(WX, {teks: "lapor", saluran: "wa"}); assert.equal(r.s, 200, r.t.slice(0, 200));
  assert.equal(await n("lapor_sesi", `wa = '${WX}'`), 2, "lewat WA mulai sesi baru, bukan melanjutkan sesi ketikan");
});

uji("pintu web tanpa kode: nomor orang lain tidak membuka nama terdaftarnya (tinjauan keamanan 20 Nov 2026)", async () => {
  const WM = "6281200000072";   // profil "Dedi" ditulis lewat jalur WA di uji sebelumnya
  assert.ok(await DB.prepare("SELECT nama FROM lapor_pelapor WHERE wa = ?").bind(WM).first());
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi IN ('lapor.ikat', 'lapor.ketik')").run();
  const F = perangkat("203.0.113.88"); let r = await F.ketik(WM, {teks: "lapor"}); r = await F.ketik(WM, {teks: "1"});
  assert.ok(!JSON.stringify(r).includes("Dedi"), "nama pemilik nomor tidak tampil di perangkat lain");
});

/* ---------- kejadian yang sama (K66, D103-D107; TIKET LA-68, LA-69; migrasi 0160) ---------- */
uji("kejadian yang sama: tawaran sekecamatan tanpa data orang lain, ya, nomor KJ untuk dua laporan, meja mengelompokkan, lepas hanya BNPB", async () => {
  tawarKejadian = true;
  const WA_I = "6281299990011", WA_K = "6281299990012", kini = Date.now();
  assert.equal((await api("POST", "/api/lapor/izin", {wa: WA_K}, MESIN)).s, 200);
  // laporan induk terkirim di Kec. Bogor Tengah (kode 32.71.03), banjir, 30 menit lalu: disisipkan langsung supaya uji tidak mengulang alur panjang
  const wil = {kode: "32.71.03.1001", desa: "Gudang", kec: "Bogor Tengah", kab: "Kota Bogor", kabKode: "32.71", prov: "Jawa Barat", provKode: "32"}, t0 = kini - 1800e3, tk = kini - 3600e3;
  const kerja = {id: "kjinduk000000001", wa: WA_I, status: "terkirim", nomor: "LA-191126-71", terkirim: t0, foto: [], transkrip: [],
    isian: {jenis: {nilai: "banjir"}, subjenis: {nilai: "Banjir bandang"}, lokasi: {nilai: {lat: -6.6, lon: 106.8, wilayah: wil}}, waktu: {nilai: "20 November 2026, 10.00 WIB", ms: tk}}};
  const ringkas = {waktuKejadian: "20 November 2026, 10.00 WIB", waktuMs: tk, subjenis: "Banjir bandang", wilayah: wil, lengkap: 30, foto: 0, dampakMeja: null, dampak: {}};
  await DB.batch([
    DB.prepare("INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES ('kjinduk000000001', ?, 'terkirim', 'warga', 'banjir', '32.71', -6.6, 106.8, 'LA-191126-71', ?, ?, ?, ?, 0, ?, ?)")
      .bind(WA_I, "e".repeat(64), t0, JSON.stringify(kerja), JSON.stringify(ringkas), t0, t0),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES ('LA-191126-71', 'kjinduk000000001', 'baru', ?)").bind(t0)]);
  let r = await ketik(WA_K, {teks: "lapor"});
  for (const t of ["1", "1", "Dewi Uji"]) r = await ketik(WA_K, {teks: t});
  r = await ketik(WA_K, {lokasi: LOK}); assert.equal(r.status, "wilayah");
  r = await ketik(WA_K, {teks: "1"}); assert.equal(r.status, "rtrw");
  r = await ketik(WA_K, {teks: "Tidak tahu"});
  assert.equal(r.status, "kejadian", JSON.stringify(r).slice(0, 300));
  assert.match(r.balasan, /\*Kejadian yang sama\?\*/); assert.match(r.balasan, /Di Kec\. Bogor Tengah sudah ada laporan banjir sejak \d+ \w+ 2026, \d\d\.\d\d WIB dari 1 warga\./); assert.match(r.balasan, /Apakah Anda melaporkan salah satu kejadian ini\?/, "dua jenis ditawarkan (longsor dari uji lain, banjir ini)");
  assert.ok(!JSON.stringify(r).includes(WA_I) && !JSON.stringify(r).includes("LA-191126-71"), "tanpa nomor WA atau nomor tiket laporan lain (D104)");
  const iya = r.pilihan.findIndex(x => /^Ya, banjir/.test(x)); assert.ok(iya >= 0); assert.equal(r.pilihan.at(-1), "Bukan, kejadian lain");
  r = await ketik(WA_K, {teks: String(iya + 1)}); assert.match(r.balasan, /Ada detail yang ingin Anda tambahkan\?/); assert.equal(r.status, "detail");
  r = await ketik(WA_K, {teks: "meninggal 1 orang, jalan terputus"}); assert.equal(r.status, "foto");
  r = await ketik(WA_K, {teks: "1"}); assert.equal(r.status, "ringkasan");
  r = await ketik(WA_K, {teks: "1"}); assert.equal(r.status, "terkirim", JSON.stringify(r).slice(0, 300));
  const baru = r.nomor; assert.match(baru, /^LA-\d{6}-\d{2}$/); assert.notEqual(baru, "LA-191126-71", "tiket sendiri");
  const kj = await DB.prepare("SELECT nomor, kode, induk FROM lapor_kelompok ORDER BY nomor").all();
  assert.equal(kj.results.length, 2); assert.equal(kj.results[0].kode, kj.results[1].kode); const dW = new Date(t0 + 7 * 3600e3), ddmmyy = `${String(dW.getUTCDate()).padStart(2, "0")}${String(dW.getUTCMonth() + 1).padStart(2, "0")}${String(dW.getUTCFullYear()).slice(2)}`;
  assert.equal(kj.results[0].kode, `KJ-${ddmmyy}-01`, "tanggal WIB laporan induk");
  assert.equal(await n("lapor_kelompok", `nomor = 'LA-191126-71' AND induk IS NULL`), 1, "induk ikut ditandai"); assert.equal(await n("lapor_kelompok", `nomor = '${baru}' AND induk = 'LA-191126-71'`), 1);
  const kode = kj.results[0].kode;
  // meja BNPB: dua baris membawa kejadian; jumlah laporan dan warga
  const bd = (await api("GET", "/api/lapor/meja", undefined, ADMIN)).j.baris.filter(x => x.kejadian);
  assert.deepEqual(bd.map(x => x.nomor).sort(), ["LA-191126-71", baru].sort()); assert.deepEqual(bd[0].kejadian, {kode, n_laporan: 2, n_pelapor: 2});
  assert.deepEqual((await api("GET", `/api/lapor/meja/${baru}`, undefined, ADMIN)).j.kejadian, {kode, n_laporan: 2, n_pelapor: 2});
  // BPBD kota itu melihat kejadian tanpa nomor WA; tidak bisa melepas; BPBD kota lain tidak melihatnya sama sekali
  const dB = (await api("GET", "/api/lapor/meja", undefined, bogor.h)).j.baris.filter(x => x.kejadian);
  assert.equal(dB.length, 2); assert.ok(dB.every(x => x.wa == null)); assert.equal(dB[0].kejadian.n_pelapor, 2);
  assert.equal((await api("POST", `/api/lapor/meja/${baru}/lepas`, {}, bogor.h)).s, 403, "BPBD tidak melepas (D106)");
  assert.equal((await api("POST", `/api/lapor/meja/${baru}/lepas`, {}, bandung.h)).s, 404, "luar wilayah");
  assert.equal((await api("POST", `/api/lapor/meja/${baru}/lepas`, {})).s, 403, "tamu");
  assert.equal(await n("lapor_kelompok"), 2, "penolakan tidak menyentuh kejadian");
  // BNPB melepas: tercatat di riwayat; tinggal satu laporan = kejadian bubar
  const lp = await api("POST", `/api/lapor/meja/${baru}/lepas`, {}, ADMIN); assert.equal(lp.s, 200, lp.t.slice(0, 200)); assert.equal(lp.j.kejadian, null);
  assert.equal(await n("lapor_kelompok"), 0);
  assert.equal(await n("lapor_tiket_riwayat", `nomor = '${baru}' AND catatan = 'Dilepas dari kejadian ${kode}'`), 1);
  assert.equal((await api("POST", `/api/lapor/meja/${baru}/lepas`, {}, ADMIN)).s, 409, "sudah lepas");
});

uji("kejadian yang sama: Bukan = jalur lama (pilih jenis) dan tidak memberi nomor KJ", async () => {
  tawarKejadian = true;
  const WA_B = "6281299990013", kini = Date.now();
  assert.equal((await api("POST", "/api/lapor/izin", {wa: WA_B}, MESIN)).s, 200);
  await DB.prepare("UPDATE lapor_sesi SET terkirim = ? WHERE id = 'kjinduk000000001'").bind(kini - 600e3).run();
  let r = await ketik(WA_B, {teks: "lapor"});
  for (const t of ["1", "1", "Eko Uji"]) r = await ketik(WA_B, {teks: t});
  r = await ketik(WA_B, {lokasi: LOK}); r = await ketik(WA_B, {teks: "1"}); r = await ketik(WA_B, {teks: "Tidak tahu"});
  assert.equal(r.status, "kejadian"); r = await ketik(WA_B, {teks: String(r.pilihan.length)});
  assert.equal(r.minta, "jenis"); assert.match(r.balasan, /Jenis bencana/);
  assert.equal(await n("lapor_kelompok"), 0);
  tawarKejadian = false;
});

uji("K67: nomor ketikan di web tanpa daftar izin; lewat mesin WA tetap wajib izin", async () => {
  assert.equal(await n("lapor_izin", `wa = '${TAK}'`), 0);
  assert.equal((await pesan(TAK, {teks: "lapor"})).s, 403, "jalur mesin WA tetap daftar izin");
  const C = perangkat(), r = await C.pesan(TAK, {teks: "lapor"});
  assert.equal(r.s, 200, r.t.slice(0, 200));
  assert.equal(await n("lapor_perangkat", `wa = '${TAK}'`), 1, "nomor ketikan terikat perangkat");
});
