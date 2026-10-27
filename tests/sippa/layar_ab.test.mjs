/* SP-036: logika murni layar A/B (RU §2.3 B1 sampai B3, G6): pemeriksa CSV klien, pengelompokan lengan, vonis G4 tiga nilai, data pilot tanpa vonis G4,
   kartu vonis pilot tujuh butir, pil hipotesis, grafik. DOM dan jaringan tidak disentuh; rumus datang dari hitung.js. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
globalThis.paginasi = (hal, n, per, nama) => `<nav class="pgn">${n} ${nama}</nav>`;

const A = await import("../../public/pipa/layar_ab.js");
const {vonisPilot} = await import("../../public/pipa/hitung.js");
const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const tanpaDilarang = t => { assert.doesNotMatch(t, /[—·]/, "em dash atau titik tengah"); assert.doesNotMatch(t, /terbukti/i, "kata terbukti"); assert.doesNotMatch(t, /100%/, "100% probabilitas"); };

/* data peragaan yang sama dengan DUMMY_AB di src/sippa.js (dibaca dari berkas, bukan disalin), tanggal sesudah jendela pilot */
const DUMMY = (0, eval)("(" + /^const DUMMY_AB = (\{[\s\S]*?\n\});/m.exec(baca("src/sippa.js"))[1] + ")");
const petakDari = (D, tanggal, tambahan = {}) => Object.entries(D).flatMap(([l, rs]) => rs.map(([luas, regu, d24, d72, n7, n30, n90], i) => ({petak_id: `DM-${l}-${i}`, aoi: "DUMMY-AOI", lengan: l, tanggal_perlakuan: tanggal, luas_m2: luas, regu_hari: regu,
  biaya_rp: Math.round(regu * 3e6), air_m3: luas * 0.003, dingin_24j: d24, dingin_72j: d72, nyala_7h: n7, nyala_30h: n30, nyala_90h: n90, unggah_id: "u1", ...tambahan})));

/* ---------- B1: tiga vonis sekaligus ---------- */
test("B1: dummy A/B (lance n 10 lebih baik, surfaktan n 6, sekat n 8 setara) memunculkan LULUS, BELUM BISA DIPUTUS, TIDAK LULUS sekaligus", () => {
  const r = A.ringkasAb(petakDari(DUMMY, "2026-12-20"));
  assert.deepEqual(r.lengan.map(l => [l.kunci, l.n, l.g4.vonis]), [["lance", 10, "LULUS"], ["lance_surfaktan", 6, "BELUM BISA DIPUTUS"], ["sekat_rewetting", 8, "TIDAK LULUS"], ["lance_dalam", 0, "BELUM BISA DIPUTUS"]]);
  assert.equal(r.konv.n, 10);
  const html = r.lengan.map(A.kartuLenganHtml).join("");
  for (const kata of ["LULUS", "BELUM BISA DIPUTUS", "TIDAK LULUS"]) assert.ok(html.includes(`>${kata}<`), `kartu ${kata} tidak tampil`);
  assert.doesNotMatch(html, />GO</, "tidak ada vonis GO");
});
test("B1: baris dummy bertanggal di dalam jendela pilot tetap memberi vonis (peragaan), sedangkan baris nyata di jendela itu tidak", () => {
  const dummy = A.ringkasAb(petakDari(DUMMY, "2026-10-20", {dummy: 1}));
  assert.equal(dummy.pilot, false); assert.equal(dummy.dummy, true); assert.equal(dummy.lengan[0].g4.vonis, "LULUS");
  assert.match(A.kartuLenganHtml(dummy.lengan[0]), />dummy, peragaan</, "vonis dummy selalu berpil dummy, tidak menyamar sebagai hasil lapangan");
  assert.doesNotMatch(A.kartuLenganHtml(A.ringkasAb(petakDari(DUMMY, "2026-12-20", {dummy: 0})).lengan[0]), /dummy, peragaan/);
  const nyata = A.ringkasAb(petakDari(DUMMY, "2026-10-20", {dummy: 0}));
  assert.equal(nyata.pilot, true); assert.ok(nyata.lengan.filter(l => l.ada).every(l => l.g4.vonis == null));
});
test("B1: lengan tanpa petak tidak diberi vonis LULUS atau TIDAK LULUS; kartunya menjelaskan kosong", () => {
  const r = A.ringkasAb(petakDari({konvensional: DUMMY.konvensional}, "2026-12-20"));
  assert.ok(r.lengan.every(l => l.g4.vonis === "BELUM BISA DIPUTUS" && l.n === 0));
  assert.match(A.kartuLenganHtml(r.lengan[0]), /Belum ada petak untuk lengan ini/);
});

/* ---------- B2: pilot ---------- */
test("B2: data pilot Okt 2026: pil 'pilot, n kecil', tidak pernah satu pun dari tiga vonis G4", () => {
  const r = A.ringkasAb(petakDari(DUMMY, "2026-11-02"));   // di dalam jendela pilot (KONST.pilot_sampai 2026-11-30), bukan dummy
  assert.equal(r.pilot, true);
  const html = r.lengan.filter(l => l.ada).map(A.kartuLenganHtml).join("");
  assert.match(html, /pilot, n kecil/); assert.match(html, /TIDAK DIVONIS, DATA PILOT/);
  for (const kata of ["LULUS", "TIDAK LULUS", "BELUM BISA DIPUTUS"]) assert.ok(!html.includes(`>${kata}<`), `vonis G4 ${kata} muncul pada data pilot`);
  assert.ok(r.lengan.filter(l => l.ada).every(l => l.g4.vonis === null));
  tanpaDilarang(html);
});
test("B2: satu petak ber-AOI PILOT di lengan lance membuat lengan itu tanpa vonis G4, sedangkan lengan lain tidak ikut", () => {
  const p = petakDari(DUMMY, "2026-12-20"); p.find(x => x.lengan === "lance").aoi = "PILOT-KTG";
  const r = A.ringkasAb(p);
  assert.equal(r.lengan.find(l => l.kunci === "lance").g4.vonis, null);
  assert.equal(r.lengan.find(l => l.kunci === "sekat_rewetting").g4.vonis, "TIDAK LULUS");
});

/* ---------- B3: hipotesis ---------- */
test("B3: status unggahan draf: semua angka efikasi berpil hipotesis; ditinjau evaluator menggantinya hanya bila semua petak lengan dan konvensional ditinjau", () => {
  const p = petakDari(DUMMY, "2026-12-20");
  const draf = A.ringkasAb(p, {unggah: [{id: "u1", status: "draf"}]});
  assert.ok(draf.lengan.every(l => l.keyakinan === "hipotesis"));
  assert.match(A.kartuLenganHtml(draf.lengan[0]), /class="sp-yakin hipotesis"[^>]*>hipotesis</);
  const tinjau = A.ringkasAb(p, {unggah: [{id: "u1", status: "ditinjau_evaluator"}]});
  assert.ok(tinjau.lengan.filter(l => l.ada).every(l => l.keyakinan === "ditinjau-evaluator"));
  const campur = p.map((x, i) => i === 0 ? {...x, unggah_id: "u2"} : x);
  assert.equal(A.ringkasAb(campur, {unggah: [{id: "u1", status: "ditinjau_evaluator"}, {id: "u2", status: "draf"}]}).lengan[1].keyakinan, "hipotesis", "satu petak draf menahan pil hipotesis");
});

/* ---------- penyaring AOI dan satuan ---------- */
test("kelompokkan dan ringkasAb: penyaring AOI hanya memakai petak AOI itu; lengan di luar daftar lengan diabaikan", () => {
  const p = [...petakDari({konvensional: DUMMY.konvensional, lance: DUMMY.lance}, "2026-12-20"), ...petakDari({lance: DUMMY.lance}, "2026-12-20", {aoi: "AOI-2"}), {...petakDari({lance: DUMMY.lance}, "2026-12-20")[0], lengan: "hantu"}];
  assert.deepEqual(A.daftarAoi(p), ["AOI-2", "DUMMY-AOI"]);
  assert.equal(A.kelompokkan(p, "AOI-2").lance.length, 10); assert.equal(A.kelompokkan(p, "AOI-2").konvensional.length, 0);
  assert.equal(A.kelompokkan(p).lance.length, 20); assert.equal(Object.hasOwn(A.kelompokkan(p), "hantu"), false);
});
test("dasarVonis: LULUS menyebut ukuran yang lulus dan kartu menampilkannya; TIDAK LULUS dan pilot tanpa dasar", () => {
  const r = A.ringkasAb(petakDari(DUMMY, "2026-12-20")), lance = r.lengan[0], sekat = r.lengan[2];
  assert.ok(A.dasarVonis(lance.g4).length >= 1); assert.match(A.kartuLenganHtml(lance), /Dasar: [^<]*; biaya per ha dalam batas 1,2 kali konvensional\./);
  assert.doesNotMatch(A.kartuLenganHtml(sekat), /Dasar:/); assert.deepEqual(A.dasarVonis(A.ringkasAb(petakDari(DUMMY, "2026-11-02")).lengan[0].g4), []);
});
test("airPerHa: hanya petak yang mencatat air_m3 (null bukan nol), dibagi luasnya sendiri", () => {
  const ps = [{luas_m2: 10000, air_m3: 50}, {luas_m2: 10000, air_m3: null}, {luas_m2: 5000, air_m3: 10}];
  assert.equal(A.airPerHa(ps), 60 / 1.5);
  assert.equal(A.airPerHa([{luas_m2: 10000, air_m3: null}]), null); assert.equal(A.airPerHa([]), null);
});
test("kalimatEfek: selang relatif terhadap rerata konvensional, id-ID, tanpa kata terlarang; pilot dijelaskan tanpa persen", () => {
  const r = A.ringkasAb(petakDari(DUMMY, "2026-12-20")), k = A.kalimatEfek(r.lengan[0].g4);
  assert.match(k, /^\+140% ha dingin per regu-hari, selang 95% -?\d+% sampai \+?\d+%, n 10 lawan 10\.$/); tanpaDilarang(k);
  const p = A.ringkasAb(petakDari(DUMMY, "2026-11-02")); assert.match(A.kalimatEfek(p.lengan[0].g4), /^Hasil pilot, n kecil/);
  assert.match(A.kalimatEfek({vonis: "BELUM BISA DIPUTUS", n_lengan: 0, n_konv: 3, efikasi_y: {selisih: null, rel: null, ci: null}}), /belum bisa dibandingkan/);
});
test("tabelLenganHtml: biaya dengan CAPEX berpil menunggu (bukan angka tebakan); biaya tanpa CAPEX dan air dari data; waktu sumber id-ID", () => {
  const r = A.ringkasAb(petakDari(DUMMY, "2026-12-20")), h = A.tabelLenganHtml(r, Date.UTC(2026, 9, 28, 3));
  assert.match(h, /menunggu/); assert.match(h, /Biaya per ha dingin, dengan CAPEX teramortisasi/); assert.match(h, /Sumber: SIPPA D1[^<]*per 28 Okt 10\.00 WIB/); tanpaDilarang(h);
  assert.equal((h.match(/<tr>/g) || []).length, 1 + 5, "kepala + konvensional + empat lengan");
});

/* ---------- grafik ---------- */
test("grafikTitikHtml: satu lingkaran per petak berregu-hari, garis rerata per lengan, selang hanya untuk lengan non-konvensional; kosong dijelaskan", () => {
  const r = A.ringkasAb(petakDari(DUMMY, "2026-12-20")), svg = A.grafikTitikHtml(r);
  assert.equal((svg.match(/<circle /g) || []).length, 10 + 10 + 6 + 8); assert.equal((svg.match(/class="sp-rerata"/g) || []).length, 4);
  assert.equal((svg.match(/class="sp-ci"/g) || []).length, 3); assert.match(svg, /role="img" aria-label="Ha dingin terverifikasi/);
  assert.match(A.grafikTitikHtml(A.ringkasAb([])), /Belum ada petak/);
});
test("grafikBatangHtml: nyala ulang 7, 30, 90 hari sama dengan proporsi data; baris tanpa hasil tidak digambar; tidak ada nol palsu", () => {
  const r = A.ringkasAb(petakDari(DUMMY, "2026-12-20")), n = A.nyalaPerLengan(r);
  const konv = n.find(x => x.kunci === "konvensional");
  assert.equal(konv.hari[0].p, DUMMY.konvensional.filter(x => x[4] === 1).length / 10);
  assert.equal(n.find(x => x.kunci === "lance_dalam").hari.every(h => h === null), true);
  const svg = A.grafikBatangHtml(r); assert.equal((svg.match(/<rect /g) || []).length, 3 * 4); assert.match(svg, /7 hari/);
  assert.match(A.grafikBatangHtml(A.ringkasAb([{...petakDari(DUMMY, "2026-12-20")[0], nyala_7h: null, nyala_30h: null, nyala_90h: null}])), /Belum ada petak dengan hasil nyala ulang/);
});

/* ---------- kartu vonis pilot (keputusan 53) ---------- */
test("kartuPilotHtml: tujuh butir dengan kata (bukan warna saja), butir null 'data belum lengkap', pil pilot dan asumsi-kebijakan, G4 dipisah", () => {
  const log = [{petak_id: "P1", air_sampai_lance: 1, t_tiba: 0, t_mulai_gelar: 36e5, t_air_mengalir: 3 * 36e5, t_selesai: 5 * 36e5, t_bongkar_selesai: 6 * 36e5, p_ujung_bar: 2.6, p_ujung_menit: 45, p_ujung_sumber: "gauge", kecelakaan: 0, bocor_henti_menit: 0}];
  const v = vonisPilot({log, probe: [], komponen_kembali: []}), h = A.kartuPilotHtml(v, Date.UTC(2026, 10, 2, 3));
  assert.equal((h.match(/<li>/g) || []).length, 7);
  assert.match(h, /data belum lengkap/); assert.match(h, /lulus/); assert.match(h, />pilot, n kecil</); assert.match(h, />asumsi-kebijakan</);
  assert.match(h, /Vonis "lebih baik dari konvensional" tidak diputus dari pilot \(n kurang dari 8 per lengan\)/);
  assert.match(h, new RegExp(`>${v.vonis}<`)); for (const k of ["LULUS", "TIDAK LULUS"]) assert.ok(!h.includes(`>${k}<`), `kartu pilot memakai vonis G4 ${k}`); tanpaDilarang(h);
  for (const [vonis, kelas] of [["DAPAT DIPAKAI", "dapat"], ["DAPAT DIPAKAI BERSYARAT", "syarat"], ["BELUM DAPAT DIPAKAI", "belum-dapat"]]) assert.match(A.kartuPilotHtml({...v, vonis}, 0), new RegExp(`sp-vonis-ab ${kelas}`));
  assert.deepEqual(Object.keys(A.KATA_PILOT), ["DAPAT DIPAKAI", "DAPAT DIPAKAI BERSYARAT", "BELUM DAPAT DIPAKAI"]);
});

/* ---------- pemeriksa CSV ---------- */
const KEPALA = A.KOLOM_CSV.join(",");
const baris = (o = {}) => { const d = {petak_id: "KTG-001", aoi: "KTG-01", prov: "62", lengan: "lance", pasangan_id: "", tanggal_perlakuan: "2026-10-20", luas_m2: "4200", regu_hari: "3,5", air_m3: "120", surfaktan_l: "", biaya_rp: "9000000", dingin_24j: "1", dingin_72j: "1", nyala_7h: "0", nyala_30h: "0", nyala_90h: "", catatan: "", ...o}; return A.KOLOM_CSV.map(k => d[k]).join(","); };
const HARI_INI = "2026-10-28";
test("periksaCsv: berkas sah dihitung (baris, lengan, AOI), pemisah titik koma dan desimal koma dikenali, BOM dibuang", async () => {
  const h = await A.periksaCsv(`${KEPALA}\n${baris({regu_hari: "3.5"})}\n${baris({petak_id: "KTG-002", lengan: "konvensional", regu_hari: "3.5"})}\n`, HARI_INI);
  assert.equal(h.nGalat, 0); assert.equal(h.nBaris, 2); assert.equal(h.nLengan, 2); assert.equal(h.nAoi, 1);
  const pk = await A.periksaCsv(`﻿${A.KOLOM_CSV.join(";")}\n${A.KOLOM_CSV.map(k => ({petak_id: "KTG-001", aoi: "A", lengan: "lance", tanggal_perlakuan: "2026-10-20", luas_m2: "4200", regu_hari: "3,5"})[k] ?? "").join(";")}\n`, HARI_INI);
  assert.equal(pk.pisah, ";"); assert.equal(pk.petak[0].regu_hari, 3.5);
});
test("periksaCsv: satu baris salah menolak seluruh berkas dengan nomor baris dan kolom; tidak ada petak sebagian", async () => {
  const h = await A.periksaCsv(`${KEPALA}\n${baris({regu_hari: "3.5"})}\n${baris({petak_id: "KTG-002", luas_m2: "0", lengan: "tembak", regu_hari: "3.5"})}\n${baris({petak_id: "KTG-003", tanggal_perlakuan: "2026-12-31", regu_hari: "3.5"})}\n`, HARI_INI);
  assert.deepEqual(h.petak, []); assert.equal(h.nGalat, 2, "dua baris salah");
  assert.deepEqual(h.galat.map(g => [g.baris, g.kolom]), [[3, "lengan"], [3, "luas_m2"], [4, "tanggal_perlakuan"]]);
  assert.match(h.galat[2].alasan, /Tidak boleh lebih dari hari ini/);
  const tab = A.tabelGalatHtml(h.galat, 0, `Berkas ditolak. ${h.nGalat} baris salah, tidak ada yang disimpan.`); assert.match(tab, /<caption>/); assert.match(tab, /tidak ada yang disimpan/); tanpaDilarang(tab);
});
test("periksaCsv: aturan server ditiru (surfaktan hanya lance_surfaktan, prov 2 digit, 0/1/kosong, tanggal nyata, petak ganda, kolom asing, kolom wajib hilang)", async () => {
  const kasus = [[baris({surfaktan_l: "5", regu_hari: "3.5"}), "surfaktan_l"], [baris({prov: "6", regu_hari: "3.5"}), "prov"], [baris({dingin_72j: "2", regu_hari: "3.5"}), "dingin_72j"], [baris({tanggal_perlakuan: "2026-02-30", regu_hari: "3.5"}), "tanggal_perlakuan"], [baris({biaya_rp: "1.5", regu_hari: "3.5"}), "biaya_rp"], [baris({petak_id: "ab", regu_hari: "3.5"}), "petak_id"]];
  for (const [b, kolom] of kasus) { const h = await A.periksaCsv(`${KEPALA}\n${b}\n`, HARI_INI); assert.equal(h.galat[0].kolom, kolom, b); assert.equal(h.galat[0].baris, 2); }
  const b1 = baris({regu_hari: "3.5"}), ganda = await A.periksaCsv(`${KEPALA}\n${b1}\n${b1}\n`, HARI_INI); assert.equal(ganda.galat[0].baris, 3); assert.match(ganda.galat[0].alasan, /dua kali/);
  const asing = await A.periksaCsv(`${KEPALA},rahasia\n${b1},x\n`, HARI_INI); assert.deepEqual(asing.galat.map(g => g.kolom), ["rahasia"]); assert.equal(asing.kepalaSalah, true);
  const hilang = await A.periksaCsv(`petak_id,aoi\nX1,Y\n`, HARI_INI); assert.deepEqual(hilang.galat.map(g => g.kolom), ["lengan", "tanggal_perlakuan", "luas_m2"]);
});
test("periksaCsv: batas berkas (kosong, tanpa baris data, > 2.000 baris, > 1 MB, kutip terbuka) ditolak dengan alasan sebelum diperiksa baris", async () => {
  assert.match((await A.periksaCsv("   \n", HARI_INI)).galat[0].alasan, /kosong/);
  assert.match((await A.periksaCsv(`${KEPALA}\n`, HARI_INI)).galat[0].alasan, /tidak punya baris data/);
  const banyak = `${KEPALA}\n` + Array.from({length: 2001}, (_, i) => baris({petak_id: `KTG-${i}`, regu_hari: "3.5"})).join("\n");
  assert.match((await A.periksaCsv(banyak, HARI_INI)).galat[0].alasan, /Paling banyak 2\.000 baris data \(dikirim 2\.001\)/);
  assert.match((await A.periksaCsv("x".repeat(1048577), HARI_INI)).galat[0].alasan, /batas 1 MB/);
  assert.match((await A.periksaCsv(`${KEPALA}\n"abc,def\n`, HARI_INI)).galat[0].alasan, /kutip/);
});
test("periksaCsv: > 500 baris diperiksa per potongan 500 dengan tunda() di antaranya (INP), hasil sama dengan sekali jalan", async () => {
  const n = 1250, teks = `${KEPALA}\n` + Array.from({length: n}, (_, i) => baris({petak_id: `KTG-${i}`, regu_hari: "3.5"})).join("\n");
  let tunda = 0; const h = await A.periksaCsv(teks, HARI_INI, {tunda: async () => { tunda++; }});
  assert.equal(h.nGalat, 0); assert.equal(h.petak.length, n); assert.equal(tunda, 2, "1.250 baris = 3 potongan = 2 jeda");
  assert.equal((await A.periksaCsv(teks, HARI_INI)).petak.length, n);
});
test("periksaCsv: daftar galat dipotong di galatSimpan; tabel galat berpaginasi 50 per halaman", async () => {
  const teks = `${KEPALA}\n` + Array.from({length: 300}, (_, i) => baris({petak_id: `KTG-${i}`, luas_m2: "0", regu_hari: "3.5"})).join("\n"), h = await A.periksaCsv(teks, HARI_INI);
  assert.equal(h.nGalat, 300); assert.equal(h.galat.length, A.BATAS_CSV.galatSimpan);
  const tab = A.tabelGalatHtml(h.galat, 0); assert.equal((tab.match(/<tr>/g) || []).length, 1 + 50); assert.match(tab, /class="pgn"/);
});
test("galatServer: 400 rincian per baris dan kolom, 409 sha sama, tanpa rincian memakai pesan server; teks lewat esc di tabel", () => {
  assert.match(A.galatServer(409, {}).ringkas, /sudah pernah diunggah/);
  const g = A.galatServer(400, {galat: "berkas ditolak: 1 baris salah", rincian: [{baris: 3, kolom: "prov", alasan: "provinsi di luar wilayahmu"}]});
  assert.deepEqual(g.galat, [{baris: 3, kolom: "prov", alasan: "provinsi di luar wilayahmu"}]);
  assert.equal(A.galatServer(500, {}).ringkas, "Unggahan gagal (kode 500). Coba lagi.");
  const tab = A.tabelGalatHtml([{baris: 2, kolom: "<img onerror=x>", alasan: "<script>alert(1)</script>"}], 0); assert.doesNotMatch(tab, /<img|<script/);
});
test("zonaUnggahHtml: hanya perencana dan moderator melihat zona jatuh; peran baca melihat pita; HP melihat 'Unggah dari laptop'", () => {
  assert.match(A.zonaUnggahHtml("B"), /Unggah hanya untuk perencana/); assert.doesNotMatch(A.zonaUnggahHtml("B"), /type="file"/);
  for (const p of ["W", "M"]) { const h = A.zonaUnggahHtml(p); assert.match(h, /accept="\.csv,text\/csv"/); assert.match(h, /Unggah dari laptop/); assert.match(h, /<label class="sp-unggah" for="sp-ab-berkas"/); assert.match(h, /Unduh templat CSV/); }
});
test("daftarUnggahHtml: tombol 'Tandai ditinjau evaluator' hanya moderator dan hanya untuk draf; id dari server dicek 16 heks; nama berkas lewat esc", () => {
  const u = [{id: "0123456789abcdef", nama_berkas: "<b>x</b>.csv", n_baris: 1240, status: "draf", waktu: Date.UTC(2026, 9, 28)}, {id: "fedcba9876543210", nama_berkas: "b.csv", n_baris: 2, status: "ditinjau_evaluator", waktu: Date.UTC(2026, 9, 27)}, {id: "bukanid", nama_berkas: "c.csv", n_baris: 1, status: "draf", waktu: 0}];
  const m = A.daftarUnggahHtml(u, "M"); assert.equal((m.match(/data-tinjau=/g) || []).length, 1); assert.doesNotMatch(m, /<b>x/); assert.match(m, /1\.240/);
  assert.doesNotMatch(A.daftarUnggahHtml(u, "W"), /data-tinjau/); assert.equal(A.daftarUnggahHtml([], "M"), "");
});
test("templatCsv: hanya baris kepala dengan 17 kolom yang sama dengan KOLOM_AB, WAJIB_AB, dan LENGAN di server", () => {
  const dari = nama => new RegExp(`const ${nama} = \\[([^\\]]*)\\]`).exec(baca("src/sippa.js"))[1].match(/"([^"]+)"/g).map(s => s.slice(1, -1));
  assert.deepEqual(A.KOLOM_CSV, dari("KOLOM_AB")); assert.equal(A.templatCsv(), dari("KOLOM_AB").join(",") + "\n");
  assert.deepEqual(A.WAJIB_CSV, dari("WAJIB_AB")); assert.deepEqual(A.LENGAN_AB.map(([k]) => k), dari("LENGAN"));
});
test("berkas layar_ab.js dan layar_ab.css: tanpa toFixed dan kata terlarang, tanpa warna tertanam", () => {
  const js = baca("public/pipa/layar_ab.js"), css = baca("public/pipa/layar_ab.css");
  assert.doesNotMatch(js, /toFixed\(/); tanpaDilarang(js + css); assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
});
test("pratinjauHtml: sepuluh baris pertama, ringkasan baris, lengan, AOI, tombol unggah dengan jumlah; teks lewat esc", async () => {
  const b = (i, o = {}) => baris({petak_id: `KTG-${i}`, regu_hari: "3.5", ...o}), h = await A.periksaCsv(`${KEPALA}\n${Array.from({length: 12}, (_, i) => b(i, i === 0 ? {aoi: "<i>x</i>"} : {})).join("\n")}\n`, HARI_INI);
  const html = A.pratinjauHtml(h, "<b>file</b>.csv", 2048);
  assert.equal((html.match(/<tr>/g) || []).length, 1 + 10); assert.match(html, /12 baris, 1 lengan, 2 AOI/); assert.match(html, /Unggah 12 baris/); assert.doesNotMatch(html, /<b>file|<i>x/); assert.match(html, /2 KB/);
});
