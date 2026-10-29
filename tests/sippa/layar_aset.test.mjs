/* SP-095: logika murni layar Air tanah, Akses, dan rincian aset (RU §2.3 A1 sampai A4, K1 sampai K3). DOM dan jaringan tidak disentuh. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
globalThis.paginasi = (hal, n, per, nama) => `<nav class="pgn">${n} ${nama}</nav>`;
const S = await import("../../public/pipa/layar_aset.js"), AIR = await import("../../public/pipa/layar_air.js"), AK = await import("../../public/pipa/layar_akses.js");
const {cocokkanJalur} = await import("../../public/pipa/app.js");
const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const json = p => JSON.parse(baca(p));
const tanpaDilarang = t => { assert.doesNotMatch(t, /[—·]/, "em dash atau titik tengah"); assert.doesNotMatch(t, /terbukti/i); };
const KINI = Date.UTC(2026, 9, 28, 3);
const ID = "0123456789abcdef";

const sumur = (o = {}) => ({id: ID, kode: "AS-0012", kelas: "sumur_bor", nama: "Sumur Desa Baru", status: "berfungsi", sumber: "tniad", pemilik_aset: "Pemkab Aceh Barat", pemelihara: "PDAM", prov: "11", kab: "Aceh Barat", lat: 4.45, lon: 96.15,
  kejadian: "Banjir 2025", atribut: {kedalaman_m: 60, debit_lps: 2.5, cat_kode: "CAT-01", zona_konservasi: "aman", pengelola: "PDAM"}, mutu_terakhir: null, inspeksi_terakhir: null, dummy: 0, ...o});

/* ---------- A1, A2: aturan form ---------- */
const formSumur = (o = {}) => ({nama: "Sumur A", pemilik_aset: "Pemkab", sumber: "pemda", keyakinan: "terverifikasi", kab: "", rujukan: "", kejadian: "", kedalaman_m: "60", debit_lps: "2,5", cat_kode: "", zona_konservasi: "aman", rekomendasi_bg: "", pengelola: "", lat: "", lon: "", ...o});
test("A1: sumur zona rusak atau kritis tanpa rekomendasi Badan Geologi ditolak dengan nama medan; dengan rekomendasi atau zona aman lolos", () => {
  for (const z of ["rusak", "kritis"]) { const r = S.cekFormAset("sumur_bor", formSumur({zona_konservasi: z}), "11"); assert.equal(r.badan, null); assert.deepEqual(r.galat.map(g => g.medan), ["rekomendasi_bg"]); assert.match(r.galat[0].alasan, /rekomendasi teknis Badan Geologi/); }
  const ok = S.cekFormAset("sumur_bor", formSumur({zona_konservasi: "rusak", rekomendasi_bg: "BG-123/2026"}), "11");
  assert.deepEqual(ok.galat, []); assert.equal(ok.badan.atribut.rekomendasi_bg, "BG-123/2026"); assert.equal(ok.badan.atribut.debit_lps, 2.5);
  assert.deepEqual(S.cekFormAset("sumur_bor", formSumur(), "11").galat, []);
});
test("cekFormAset: yang salah DITOLAK (nama pendek, angka liar, koordinat di luar Indonesia, lat tanpa lon, provinsi kosong, kelas liar)", () => {
  const medan = (f, prov = "11", kelas = "sumur_bor") => S.cekFormAset(kelas, f, prov).galat.map(g => g.medan);
  assert.deepEqual(medan(formSumur({nama: "a"})), ["nama"]); assert.deepEqual(medan(formSumur({kedalaman_m: "abc"})), ["kedalaman_m"]); assert.deepEqual(medan(formSumur({kedalaman_m: "900"})), ["kedalaman_m"]);
  assert.deepEqual(medan(formSumur({lat: "50", lon: "96"})), ["lat"]); assert.deepEqual(medan(formSumur({lat: "4"})), ["lon"]); assert.deepEqual(medan(formSumur(), ""), ["nama"]);
  assert.deepEqual(medan(formSumur(), "11", "hantu"), ["kelas"]);
  assert.match(S.cekFormAset("sumur_bor", formSumur({kedalaman_m: "900"}), "11").galat[0].alasan, /^Kedalaman harus angka 0 sampai 500\.$/);
});
test("A2: uji mutu tanpa e_coli_cfu ditolak; dengan 3 CFU lolos kirim dan tampil 'tidak laik minum'; 0 CFU hanya 'lolos uji E. coli'", () => {
  const daftar = [sumur()];
  const tanpa = S.cekFormMutu(daftar, {sasaran_id: ID, skor: "1"}); assert.equal(tanpa.badan, null); assert.ok(tanpa.galat.some(g => g.medan === "e_coli_cfu"));
  const ok = S.cekFormMutu(daftar, {sasaran_id: ID, skor: "2", e_coli_cfu: "3"});
  assert.deepEqual(ok.galat, []); assert.deepEqual([ok.badan.jenis, ok.badan.sasaran_jenis, ok.badan.hasil], ["mutu_air", "aset", {e_coli_cfu: 3}]);
  assert.equal(S.statusMutu({e_coli_cfu: 3}).teks, "tidak laik minum"); assert.equal(S.statusMutu({e_coli_cfu: 0}).teks, "lolos uji E. coli"); assert.equal(S.statusMutu(null).teks, "belum diuji mutu");
  assert.match(S.pilMutuHtml({e_coli_cfu: 3}), />tidak laik minum</);
  assert.equal(S.cekFormMutu(daftar, {sasaran_id: "lain", skor: "1", e_coli_cfu: "0"}).badan, null);
});

/* ---------- A3, A4: layar Air ---------- */
test("A3: cat.json belum diterima: adaCat salah dan pesan Kosong tetap; tabel sumur tetap tampil; kartu menunggu Badan Geologi", () => {
  const cat = json("data/sippa/keluaran/cat.json"), rows = [sumur()].map(AIR.barisSumur);
  assert.equal(AIR.adaCat(cat), false); assert.equal(AIR.PESAN_CAT_BELUM, "Data cekungan air tanah belum diterima dari Badan Geologi.");
  const r = AIR.ringkasAir(rows, cat); assert.match(AIR.kalimatAir(r), /^1 sumur darurat tercatat, 1 belum diuji mutu; jumlah CAT menunggu Badan Geologi$/);
  assert.match(AIR.tabelSumurHtml(rows, {per: KINI}), /AS-0012/); assert.match(AIR.kartuAirHtml(r, KINI), /menunggu Badan Geologi/);
  assert.equal(AIR.kalimatAir(AIR.ringkasAir(rows, {n_cat: {nilai: 421}, baris: []})), "421 CAT ditetapkan; 1 sumur darurat tercatat, 1 belum diuji mutu");
});
test("A4: legenda memberi kata dan pola untuk tiap zona dan bentuk untuk tiap status mutu; Daftar memuat SEMUA titik tanpa paginasi", () => {
  const l = AIR.legendaHtml();
  for (const [, nama, pola] of S.ZONA_KONSERVASI) { assert.ok(l.includes(nama), nama); assert.match(l, new RegExp(`sp-pola`)); assert.ok(l.includes("pola")); void pola; }
  assert.equal((l.match(/class="sp-pola /g) || []).length, 5); assert.match(l, /Lolos uji E\. coli/); assert.match(l, /Tidak laik minum/); assert.match(l, /Belum diuji mutu/);
  const banyak = Array.from({length: 60}, (_, i) => AIR.barisSumur(sumur({id: (i + 16).toString(16).padStart(16, "0"), kode: `AS-${1000 + i}`})));
  const d = AIR.daftarTitikHtml(banyak); assert.equal((d.match(/<tr>/g) || []).length, 61, "60 titik + kepala"); assert.doesNotMatch(d, /class="pgn"/);
  assert.match(AIR.daftarTitikHtml([AIR.barisSumur(sumur({lat: -2.51234, lon: 114.12345}))]), /-2,5123, 114,1235/, "koordinat memakai empat desimal, bukan satu");
  assert.equal((AIR.petaTitikHtml(banyak).match(/data-sumur=/g) || []).length, 60);
  assert.match(AIR.petaTitikHtml([]), /Belum ada sumur dengan koordinat/);
});
test("tabelSumurHtml: paginasi 25, atribut kosong jadi strip bukan nol, teks data lewat esc, tautan rincian id 16 heks", () => {
  const baris = Array.from({length: 30}, (_, i) => AIR.barisSumur(sumur({kode: `AS-${i}`, atribut: undefined, nama: i === 0 ? "<img src=x onerror=1>" : "x"})));
  const h = AIR.tabelSumurHtml(baris, {per: KINI, hal: 0});
  assert.equal((h.match(/<tr>/g) || []).length, 1 + 25); assert.match(h, /class="pgn"/); assert.doesNotMatch(h, /<img/); assert.match(h, /atribut sumur dibuka dari rincian/); assert.doesNotMatch(h, /\b0 m\b/);
  assert.match(h, /href="\/pipa\/aset\/0123456789abcdef"/); tanpaDilarang(h);
  assert.match(AIR.tabelSumurHtml([], {peran: "B"}), /Perencana yang mencatat sumur/);
});
test("pilihan zona dan proyeksi: ringkasZona menghitung, proyeksi satu titik tidak NaN, penurunan tanah hanya untuk pesisir utara Jawa", () => {
  assert.deepEqual(Object.values(AIR.ringkasZona([AIR.barisSumur(sumur()), AIR.barisSumur(sumur({atribut: {zona_konservasi: "kritis"}})), AIR.barisSumur(sumur({atribut: undefined}))])), [1, 1, 0, 1, 0]);
  const p = AIR.proyeksi([{lat: 4, lon: 96}]); assert.ok(Number.isFinite(p[0].x) && Number.isFinite(p[0].y));
  assert.equal(AIR.perluHatiPenurunan("33"), true); assert.equal(AIR.perluHatiPenurunan("62"), false);
});

/* ---------- K1 sampai K3: layar Akses ---------- */
test("K1: kartu memakai ringkas.total_2018_2025 dan total_2025 apa adanya (3.833 dan 1.088), sama dengan angka.json rehab.dibi", () => {
  const dibi = json("data/sippa/keluaran/jembatan_dibi.json"), r = AK.ringkasDibi(dibi);
  assert.equal(r.total, dibi.ringkas.total_2018_2025); assert.equal(r.totalAkhir, dibi.ringkas.total_2025);
  assert.equal(AK.kalimatDibi(r), "3.833 jembatan rusak 2018 sampai 2025, 1.088 pada 2025");
  assert.equal(r.perProv.reduce((s, x) => s + x.n, 0), r.total, "jumlah per provinsi = total");
  const angka = json("data/kajian-bnpb/data/angka.json").angka;
  assert.equal(angka["rehab.dibi.jembatan_rusak.2018_2025"].nilai, r.total, "angka.json rehab.dibi.jembatan_rusak.2018_2025");
  assert.equal(angka["rehab.dibi.jembatan_rusak.2025"].nilai, r.totalAkhir, "angka.json rehab.dibi.jembatan_rusak.2025");
  assert.match(AK.kartuDibiHtml(r), /Sumber: DIBI BNPB, olahan Pantau Bencana, tahun 2018 sampai 2025, ditarik 23 Okt 2026/); assert.equal(AK.ringkasDibi({}), null);
});
test("K2: 'Jembatan Merah Putih' selalu diikuti Presisi atau Polri dalam kalimat yang sama, di tabel program dan di tabel aset", () => {
  assert.equal(AK.labelProgram("Jembatan Merah Putih", "polri"), "Jembatan Merah Putih Presisi Polri");
  assert.equal(AK.labelProgram("Jembatan Merah Putih Presisi", "polri"), "Jembatan Merah Putih Presisi"); assert.equal(AK.labelProgram("Satgas Pembangunan Jembatan TNI AD", "tniad"), "Satgas Pembangunan Jembatan TNI AD");
  assert.equal(AK.labelProgram("Bailey tanggap darurat", "bnpb_dsp"), "Bailey tanggap darurat (BNPB (DSP))");
  const html = AK.tabelProgramHtml(json("data/sippa/keluaran/program_jembatan.json")) + AK.tabelJembatanHtml([{...sumur({kelas: "jembatan_darurat", sumber: "polri", atribut: {program: "Jembatan Merah Putih"}}), rencana_ganti: null}]);
  for (const m of html.matchAll(/Jembatan Merah Putih[^<]*/g)) assert.match(m[0], /Presisi|Polri/, m[0]);
  assert.ok(/Jembatan Merah Putih/.test(html));
});
test("tabel program: tanggal id-ID bukan ISO mentah, label 'rilis' bukan 'per', biaya kosong '–, tidak diumumkan', baris tanpa rujukan disembunyikan, angka media tidak tampil", () => {
  const prog = json("data/sippa/keluaran/program_jembatan.json"), h = AK.tabelProgramHtml(prog);
  assert.doesNotMatch(h, /\b20\d\d-\d\d-\d\d\b/, "tanggal ISO mentah di tabel"); assert.match(h, /rilis 13 Agu 2026/); assert.match(h, /Sumber dan tanggal rilis/); assert.doesNotMatch(h, /\bper \d/); assert.match(h, /–, tidak diumumkan/);
  assert.doesNotMatch(h, /angka\.json/, "rujukan teknis bocor ke layar"); tanpaDilarang(h);
  const campur = {baris: [...prog.baris, {...prog.baris[0], program: "Program Tanpa Sumber", rujukan: ""}, {...prog.baris[0], program: "Kata Media", keyakinan: "asumsi-kebijakan"}]};
  const o = AK.tabelProgramHtml(campur); assert.doesNotMatch(o, /Tanpa Sumber|Kata Media/); assert.match(o, /2 baris tanpa rujukan disembunyikan/);
  assert.match(AK.tabelProgramHtml({baris: []}), /Belum ada program jembatan berrujukan/);
  assert.equal(S.tglKalender("2026-08-13"), "13 Agu 2026"); assert.equal(S.tglKalender("bukan"), "–"); assert.equal(S.tglKalender(null), "–");
  assert.equal(AK.sumberRingkas("id-x: Kementerian Sekretariat Negara, 13 Agustus 2026 (angka.json rehab.x)"), "Kementerian Sekretariat Negara, 13 Agustus 2026");
});
const jembatan = {kelas: "jembatan_darurat", nama: "Bailey Sungai A", pemilik_aset: "Pemkab X", sumber: "pemda", keyakinan: "terverifikasi", kab: "", rujukan: "Surat Dinas PU 12/2026", jenis_darurat: "bailey", bentang_m: "30", beban_ton: "", program: "", rencana_ganti: "", jenis_permanen: ""};
test("K3: jembatan darurat tanpa pemilik_aset ditolak; tanpa rencana_ganti diterima tetapi berpil 'tanpa jadwal ganti' dan terhitung di chip", () => {
  const tolak = S.cekFormAset("jembatan_darurat", {...jembatan, pemilik_aset: ""}, "11"); assert.equal(tolak.badan, null); assert.ok(tolak.galat.some(g => g.medan === "pemilik_aset"));
  const ok = S.cekFormAset("jembatan_darurat", jembatan, "11"); assert.deepEqual(ok.galat, []); assert.equal(ok.badan.rencana_ganti, undefined); assert.equal(ok.badan.atribut.jenis, "bailey");
  const a = {...sumur({kelas: "jembatan_darurat", kode: "AS-0020"}), rencana_ganti: null}, b = {...a, id: "fedcba9876543210", kode: "AS-0021", rencana_ganti: Date.UTC(2027, 1, 18)}, c = {...a, id: "aaaaaaaaaaaaaaaa", kode: "AS-0022", status: "diganti_permanen"};
  assert.deepEqual(AK.hitungChip([a, b, c, sumur({kelas: "jembatan_permanen"})]), {darurat: 3, permanen: 1, tanpa: 1});
  const h = AK.tabelJembatanHtml([a, b]); assert.equal((h.match(/tanpa jadwal ganti/g) || []).length, 1); assert.match(h, /18 Feb 2027/);
  assert.equal(AK.saringJembatan([a, b], new Set(["darurat", "tanpa"])).length, 1);
  assert.equal(S.cekFormAset("jembatan_darurat", {...jembatan, rencana_ganti: "2027-02-18"}, "11").badan.rencana_ganti, Date.parse("2027-02-18T00:00:00+07:00"));
});
test("jembatan milik pihak lain wajib rujukan sumber (PRD 9.4.11); milik BNPB boleh tanpa; jembatan permanen mengikuti aturan atributnya", () => {
  assert.ok(S.cekFormAset("jembatan_darurat", {...jembatan, rujukan: ""}, "11").galat.some(g => g.medan === "rujukan"));
  assert.deepEqual(S.cekFormAset("jembatan_darurat", {...jembatan, rujukan: "", sumber: "bnpb_dsp"}, "11").galat, []);
  assert.ok(S.cekFormAset("jembatan_permanen", {...jembatan, kelas: "jembatan_permanen", jenis_permanen: ""}, "11").galat.some(g => g.medan === "jenis_permanen"));
});

/* ---------- rincian aset, rute, dan berkas ---------- */
test("rute: /pipa/aset/<id 16 heks> membawa id, /pipa/aset tanpa id dan id liar ditolak; air dan akses adalah layar biasa", () => {
  assert.deepEqual(cocokkanJalur(`/pipa/aset/${ID}`), {layar: "aset", id: ID}); assert.deepEqual(cocokkanJalur("/pipa/air"), {layar: "air"}); assert.deepEqual(cocokkanJalur("/pipa/akses"), {layar: "akses"});
  for (const j of ["/pipa/aset", "/pipa/aset/xyz", `/pipa/aset/${ID.toUpperCase()}`, `/pipa/air/${ID}`]) assert.equal(cocokkanJalur(j), null, j);
});
test("jadwalAset dan kartu angka: skor, hari sejak inspeksi, jatuh tempo id-ID; tanpa inspeksi 'belum ada' dan bukan nol", () => {
  const ins = [{jenis: "mutu_air", skor: 2, waktu: KINI - 42 * 864e5, hasil: {e_coli_cfu: 3}}, {jenis: "berkala", skor: 0, waktu: KINI - 400 * 864e5, hasil: {}}];
  const j = S.jadwalAset(sumur(), ins, KINI); assert.deepEqual([j.skor, j.hariSejak], [2, 42]);
  const h = S.kartuAngkaHtml(j); assert.match(h, /Skor terakhir/); assert.match(h, />42</); tanpaDilarang(h);
  const k = S.jadwalAset(sumur(), [], KINI); assert.equal(k.status, "belum_pernah"); assert.match(S.kartuAngkaHtml(k), /belum ada inspeksi/); assert.doesNotMatch(S.kartuAngkaHtml(k), />0</);
});
test("liniMasaHtml dan isiTab: tab Mutu air hanya untuk sumur, lini masa urut terbaru, teks inspeksi lewat esc, pil tidak laik minum", () => {
  const ins = [{jenis: "serah_terima", skor: 0, waktu: 1e12, hasil: {}, temuan: "<script>x</script>"}, {jenis: "mutu_air", skor: 2, waktu: 2e12, hasil: {e_coli_cfu: 3}, temuan: null}];
  const h = S.liniMasaHtml(ins); assert.ok(h.indexOf("Uji mutu air") < h.indexOf("Serah terima")); assert.doesNotMatch(h, /<script/); assert.match(h, /E\. coli 3 CFU per 100 ml/); assert.match(h, />tidak laik minum</);
  assert.deepEqual(S.tabUntuk(sumur()).map(t => t[0]), ["inspeksi", "mutu", "serah", "peta"]); assert.deepEqual(S.tabUntuk(sumur({kelas: "jembatan_darurat"})).map(t => t[0]), ["inspeksi", "serah", "peta"]);
  assert.match(S.isiTab("mutu", sumur(), []), /Belum ada uji mutu air tercatat/); assert.match(S.isiTab("peta", sumur({lat: null}), []), /Koordinat belum dicatat/);
  assert.match(S.kepalaAsetHtml(sumur({nama: "<b>x</b>"})), /&lt;b&gt;/);
});
test("bukaFormKirim memetakan galat ke isian (aria-describedby ada di form) dan berkas layar bersih dari toFixed, warna tertanam, kata terlarang", () => {
  for (const f of [S.formSumurHtml(), S.formJembatanHtml()]) { for (const m of f.matchAll(/aria-describedby="(g-[a-z_]+)"/g)) assert.ok(f.includes(`id="${m[1]}"`), `${m[1]} tanpa penerima pesan`); }
  for (const b of ["layar_aset.js", "layar_air.js", "layar_akses.js", "layar_aset.css"]) { const t = baca(`public/pipa/${b}`); assert.doesNotMatch(t, /toFixed\(/, b); tanpaDilarang(t); }
  assert.doesNotMatch(baca("public/pipa/layar_aset.css"), /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
});
test("pembangun sisa: rincian sumur melengkapi atribut dari rincian server, form status dan peta kecil, grafik tahun dan batang provinsi Akses, chip penyaring", () => {
  const baris = AIR.barisSumur(sumur({atribut: undefined})), lengkap = AIR.lengkapi(baris, sumur());
  assert.equal(baris.kedalaman, null); assert.equal(lengkap.kedalaman, 60); assert.equal(lengkap.mutu, null);
  const r = AIR.rincianSumurHtml(lengkap, "W"); assert.match(r, /60 m/); assert.match(r, /data-mutu=/); assert.doesNotMatch(AIR.rincianSumurHtml(lengkap, "B"), /data-mutu=/); assert.match(AIR.rincianSumurHtml(null, "B"), /Pilih satu titik/);
  assert.deepEqual(S.cekFormStatus({status: "berfungsi", pemelihara: "PDAM", rujukan: ""}).badan, {status: "berfungsi", pemelihara: "PDAM", rujukan: null}); assert.equal(S.cekFormStatus({status: "hantu"}).badan, null);
  assert.match(S.formStatusHtml(sumur({pemelihara: "<b>"})), /value="&lt;b&gt;"/); assert.match(S.formMutuHtml([sumur()]), /E\. coli/);
  assert.match(S.petaKecilHtml(sumur()), /openstreetmap\.org\/\?mlat=4\.45/); assert.match(S.petaKecilHtml(sumur({lat: null})), /belum dicatat/);
  const dibi = AK.ringkasDibi(json("data/sippa/keluaran/jembatan_dibi.json"));
  assert.equal((AK.grafikTahunHtml(dibi.tahun).match(/<rect /g) || []).length, 8); assert.match(AK.provinsiHtml(dibi.perProv, dibi.rentang), /Jembatan rusak per provinsi, 2018 sampai 2025/); assert.equal(AK.provinsiHtml([], "x"), "");
  assert.match(AK.chipHtml({darurat: 1, permanen: 2, tanpa: 4}, new Set(["darurat"])), /aria-pressed="true"[^>]*>Darurat/); assert.equal(AK.jembatanBukan(sumur()), false); assert.equal(AK.programPemilik({sumber: "pu_sda"}), "pu");
  assert.match(S.kepalaAsetHtml(sumur()), /AS-0012/); assert.equal(S.tglId(null), "–");
});
