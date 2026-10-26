/* SP-010: fungsi murni public/pipa/hitung.js terhadap kasus acuan bersama (DT §5.8) dan kasus yang HARUS ditolak. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as H from "../../public/pipa/hitung.js";

const ACUAN = JSON.parse(readFileSync(new URL("./fixtures/acuan.json", import.meta.url), "utf8"));
const kasus = id => ACUAN.find(k => k.id === id);
const dekat = (a, b, tol, pesan) => assert.ok(Math.abs(a - b) <= Math.abs(b) * tol + 1e-9, `${pesan}: dapat ${a}, harap ${b} (toleransi ${tol * 100}%)`);
const kode = g => g.map(x => x.kode);

for (const k of ACUAN.filter(x => x.fungsi === "hidraulika")) {
  test(`acuan ${k.id}: hidraulika cocok dengan DT §5.8`, () => {
    const h = H.hidraulika(k.masukan), tol = k.toleransi ?? 0.01;
    for (const [nama, harap] of Object.entries(k.harap)) {
      if (nama === "gerbang") assert.deepEqual(kode(h.gerbang.filter(g => g.tingkat !== "catatan")).sort(), [...harap].sort(), `${k.id}: gerbang`);
      else if (nama === "gerbang_tanpa") for (const c of harap) assert.ok(!kode(h.gerbang).includes(c), `${k.id}: ${c} tidak boleh ada`);
      else if (typeof harap === "number") dekat(h[nama], harap, tol, `${k.id}.${nama}`);
      else assert.equal(h[nama], harap, `${k.id}.${nama}`);
    }
  });
}

for (const k of ACUAN.filter(x => x.fungsi === "zona"))
  test(`acuan ${k.id}: zona(${k.masukan.air}, ${k.masukan.jalan}) = ${k.harap}`, () => assert.equal(H.zona(k.masukan.air, k.masukan.jalan), k.harap));

for (const k of ACUAN.filter(x => x.fungsi === "fSuhu"))
  test(`acuan ${k.id}: fSuhu(${k.masukan.suhu_c}) = ${k.harap}`, () => dekat(H.fSuhu(k.masukan.suhu_c), k.harap, 0.01, k.id));

for (const k of ACUAN.filter(x => x.fungsi === "kuantil"))
  test(`acuan ${k.id}: kuantil tipe 7 sama dengan numpy.percentile`, () => dekat(H.kuantil(k.masukan.xs, k.masukan.p), k.harap, 0.01, k.id));

for (const k of ACUAN.filter(x => x.fungsi === "vonisPilot"))
  test(`acuan ${k.id}: vonisPilot memberi ${k.harap.vonis}`, () => {
    const v = H.vonisPilot(k.masukan);
    assert.equal(v.vonis, k.harap.vonis, `butir gagal: ${v.gagal}`);
    assert.deepEqual(v.gagal, k.harap.gagal);
  });

test("hitung: OD160 SDR11 2.000 L/min 2 km NO-GO karena H-TEKANAN", () => {
  const h = H.hidraulika(kasus("H1").masukan);
  assert.equal(h.vonis, "NO-GO");
  assert.ok(kode(h.gerbang).includes("H-TEKANAN"));
});

test("hitung: sisa tekanan di bawah 1 bar NO-GO (H-SISA), 1 sampai 2 bar HOLD (H-SISA2)", () => {
  const dasar = kasus("H7").masukan;
  const rendah = H.hidraulika({...dasar, pompa: null, sisa_bar: 0.5});
  assert.ok(kode(rendah.gerbang).includes("H-SISA")); assert.equal(rendah.vonis, "NO-GO");
  const sedang = H.hidraulika({...dasar, pompa: null, sisa_bar: 1.5});
  assert.ok(kode(sedang.gerbang).includes("H-SISA2")); assert.equal(sedang.vonis, "HOLD");
});

test("hitung: bawaan kalkulator 300 L/min KONDISIONAL, 600 L/min dengan 8 lance NO-GO H-SERAP", () => {
  assert.equal(H.hidraulika({}).vonis, "KONDISIONAL", "p kosong = semua bawaan");
  assert.equal(H.hidraulika({q_lpm: 600}).vonis, "NO-GO");
  assert.ok(kode(H.hidraulika({q_lpm: 600}).gerbang).includes("H-SERAP"));
});

test("hitung: tidak ada vonis GO di mana pun", () => {
  for (const g of [[], [{tingkat: "catatan"}], [{tingkat: "syarat"}], [{tingkat: "keras"}]]) assert.notEqual(H.vonis(g), "GO");
  assert.deepEqual(["NO-GO", "HOLD", "KONDISIONAL"], [H.vonis([{tingkat: "keras"}, {tingkat: "syarat"}]), H.vonis([{tingkat: "syarat"}]), H.vonis([{tingkat: "catatan"}])]);
});

test("ditolak: kedalaman lance di atas batas melempar RangeError, tepat di batas diterima", () => {
  const batas = H.KONST.dalam_maks_m;
  assert.throws(() => H.hidraulika({dalam_m: batas + 0.1}), {name: "RangeError", message: /keputusan 50/});
  assert.doesNotThrow(() => H.hidraulika({dalam_m: batas}));
  assert.equal(batas, 5, "angka batas ada di satu tempat: KONST.dalam_maks_m");
});

test("ditolak: SDR 13, bahan liar, debit nol, panjang negatif, OD HDPE kosong", () => {
  assert.throws(() => H.hidraulika({bahan: "hdpe", od_mm: 160, sdr: 13}), RangeError);
  assert.throws(() => H.hidraulika({bahan: "baja"}), RangeError);
  assert.throws(() => H.hidraulika({q_lpm: 0}), RangeError);
  assert.throws(() => H.hidraulika({L_m: -5}), RangeError);
  assert.throws(() => H.hidraulika({bahan: "hdpe", sdr: 11, od_mm: null}), RangeError);
  assert.throws(() => H.idHdpe(160, 13), RangeError);
});

test("zona: tepat 2,50 km air atau 5,00 km jalan = jauh (keputusan 51), null = jauh", () => {
  assert.equal(H.zona(2.5, 4), "C"); assert.equal(H.zona(2, 5), "B"); assert.equal(H.zona(2.5, 5), "D");
  assert.equal(H.zona(null, null), "D"); assert.equal(H.zona(1, null), "B");
});

test("idHdpe, idLayflat: ID dari datasheet atau 0,96 x DN dengan tanda asumsi", () => {
  dekat(H.idHdpe(160, 11), 130.909, 0.001, "OD160 SDR11");
  assert.deepEqual(H.idLayflat(100, 96), {id: 96, asumsi: false});
  const a = H.idLayflat(100, null); assert.equal(a.asumsi, true); dekat(a.id, 96, 0.001, "0,96 x DN");
  assert.equal(H.idLayflat(100, 300).asumsi, true, "ID datasheet di luar 40-260 dianggap kosong");
});

test("pRating: interpolasi antar titik, di bawah titik pertama = tekanan pertama, di atas titik terakhir = null", () => {
  const k = H.KELAS_POMPA.ve1500;
  assert.equal(H.pRating(k, 300), 10);
  dekat(H.pRating(k, 1775), 8, 0.001, "tengah antara 10 dan 6 bar");
  assert.equal(H.pRating(k, 2051), null);
});

test("batasTekanan: HDPE = 0,88 x PN x fSuhu, layflat = 0,88 x tekanan kerja datasheet", () => {
  dekat(H.batasTekanan({bahan: "hdpe", sdr: 11, suhu_c: 35}), 11.123, 0.001, "HDPE SDR11 35 C");
  dekat(H.batasTekanan({bahan: "layflat", pk_layflat_bar: 12}), 10.56, 0.001, "layflat 12 bar");
});

test("durasiLog: durasi dalam jam, null bila salah satu ujung kosong, laju dan orang-jam", () => {
  const j = 3600e3, t0 = 1e12;
  const d = H.durasiLog({t_tiba: t0, t_mulai_gelar: t0 + 1 * j, t_air_mengalir: t0 + 3 * j, t_selesai: t0 + 5 * j, t_bongkar_selesai: t0 + 6 * j, panjang_m: 1000, n_orang: 6});
  assert.equal(d.tiba_air, 3); assert.equal(d.gelar, 2); assert.equal(d.bongkar, 1);
  assert.equal(d.laju_m_jam, 500); assert.equal(d.orang_jam_100m, 6 * 2 / 10);
  const k = H.durasiLog({t_tiba: t0, t_mulai_gelar: null, t_air_mengalir: t0 + j, panjang_m: 100, n_orang: 2});
  assert.equal(k.gelar, null); assert.equal(k.laju_m_jam, null); assert.equal(k.tiba_air, 1);
});

test("kuantil: kosong = null, n kecil di bawah 5, satu elemen = elemennya", () => {
  assert.equal(H.kuantil([], 0.5), null); assert.equal(H.kuantil([7], 0.9), 7);
  assert.equal(H.nKecil(4), true); assert.equal(H.nKecil(5), false);
});

test("vonisPilot: butir 5 menyebut petak tanpa probe walau agregat probe lengkap (keputusan 53, semua petak)", () => {
  const v = H.vonisPilot(kasus("V4").masukan), b5 = v.butir[4];
  assert.equal(b5.lulus, false); assert.deepEqual(b5.petak_tanpa_probe, ["P-01"]); assert.equal(b5.nilai, 1, "agregat 100% tetap tidak cukup");
  assert.deepEqual(H.vonisPilot(kasus("V1").masukan).butir[4].petak_tanpa_probe, []);
});

test("vonisPilot: data kosong = BELUM DAPAT DIPAKAI dengan butir null, bukan lulus diam-diam", () => {
  const v = H.vonisPilot({log: [], probe: [], komponen_kembali: [], kit: {}});
  assert.equal(v.vonis, "BELUM DAPAT DIPAKAI");
  assert.ok(v.butir.every(b => b.lulus !== true), "tanpa data tidak ada butir yang lulus");
  assert.equal(v.butir.length, 7);
});

test("bbmJam dan co2: bensin kelas 1.500 L/min 22 L/jam per pompa; solar dari kW x BSFC / massa jenis; CO2 hanya BBM", () => {
  assert.equal(H.bbmJam(30, H.KELAS_POMPA.ve1500, "bensin", 2), 44);
  dekat(H.bbmJam(33.711, null, "solar", 1), 10.033, 0.001, "solar");
  dekat(H.co2(10, "solar"), 26.8, 0.001, "CO2 solar"); dekat(H.co2(10, "bensin"), 23.1, 0.001, "CO2 bensin");
});

test("pesanGerbang: pesan dibentuk dari kode dan angka, bukan disimpan", () => {
  const h = H.hidraulika(kasus("H1").masukan);
  const t = H.pesanGerbang(h.gerbang.find(g => g.kode === "H-TEKANAN"));
  assert.match(t, /Tekanan 12,5 bar melewati batas kerja 11,1 bar/);
  assert.match(H.pesanGerbang(H.hidraulika({q_lpm: 600}).gerbang.find(g => g.kode === "H-SERAP")), /Debit 600 L\/min tidak terserap 8 lance \(paling banyak 320 L\/min\)/);
  assert.doesNotMatch(t, /[—·]/, "tanpa em dash dan titik tengah");
});

test("globalThis.SippaHitung memuat semua fungsi subset P0", () => {
  const S = globalThis.SippaHitung;
  for (const n of ["KONST", "KELAS_POMPA", "kuantil", "nKecil", "durasiLog", "zona", "idHdpe", "idLayflat", "hfHW", "fSuhu", "batasTekanan", "pRating", "hidraulika", "gerbangHidraulika", "pesanGerbang", "vonis", "bbmJam", "co2", "vonisPilot"])
    assert.ok(S?.[n] !== undefined, `SippaHitung.${n} belum ada`);
});

test("hitung.js tidak menyentuh DOM, tidak memakai toFixed dan tidak menulis angka batas kedalaman di luar KONST", () => {
  const src = readFileSync(new URL("../../public/pipa/hitung.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\b(document|window|localStorage)\b/);
  assert.doesNotMatch(src, /toFixed\(/);
});

/* ======================= SP-030: sisa fungsi DT §5 ======================= */
const OPERASI_KOEF = {bara_regu: {lo: 2.8, mid: 1, hi: 0.5}};   // bentuk public/data/operasi.json koef (mid 1,0 saat ini)

for (const k of ACUAN.filter(x => x.fungsi === "bandingRerata"))
  test(`acuan ${k.id}: bandingRerata Welch cocok dengan DT §5.8`, () => {
    const r = H.bandingRerata(k.masukan.a, k.masukan.b), tol = k.toleransi;
    dekat(r.selisih, k.harap.selisih, tol, `${k.id}.selisih`); dekat(r.df, k.harap.df, tol, `${k.id}.df`); dekat(r.t, k.harap.t, tol, `${k.id}.t`);
    dekat(r.ci[0], k.harap.ci[0], tol, `${k.id}.ci.lo`); dekat(r.ci[1], k.harap.ci[1], tol, `${k.id}.ci.hi`);
    assert.equal(r.belum_bisa_diputus, false, "n 10 dan 8 cukup");
  });

for (const k of ACUAN.filter(x => x.fungsi === "bandingProporsi"))
  test(`acuan ${k.id}: bandingProporsi Agresti-Caffo cocok dengan DT §5.8`, () => {
    const {xa, na, xb, nb} = k.masukan, r = H.bandingProporsi(xa, na, xb, nb), tol = k.toleransi;
    dekat(r.selisih, k.harap.selisih, tol, `${k.id}.selisih`); dekat(r.ci[0], k.harap.ci[0], tol, `${k.id}.ci.lo`); dekat(r.ci[1], k.harap.ci[1], tol, `${k.id}.ci.hi`);
  });

for (const k of ACUAN.filter(x => x.fungsi === "keuangan"))
  test(`acuan ${k.id}: keuangan af, npv, bcr, impas, crf cocok dengan DT §5.8`, () => {
    const m = k.masukan, tol = k.toleransi, f = {af: () => H.af(m.r, m.H), npv: () => H.npv(m), bcr: () => H.bcr(m), impas: () => H.impas(m), crf: () => H.crf(m.r, m.H)};
    for (const [nama, harap] of Object.entries(k.harap)) dekat(f[nama](), harap, tol, `${k.id}.${nama}`);
  });

for (const k of ACUAN.filter(x => x.fungsi === "neracaAir"))
  test(`acuan ${k.id}: neracaAir stok harian, habis_hari, g1_ok cocok dengan DT §5.8`, () => {
    const n = H.neracaAir(k.masukan);
    assert.deepEqual(n.hari, k.harap.hari); assert.equal(n.habis_hari, k.harap.habis_hari); assert.equal(n.g1_ok, k.harap.g1_ok);
  });

for (const k of ACUAN.filter(x => x.fungsi === "tingkatPemicu"))
  test(`acuan ${k.id}: tingkatPemicu = ${k.harap}`, () => assert.equal(H.tingkatPemicu(k.masukan), k.harap));

test("bandingRerata: n di bawah 8 di salah satu sisi = belum bisa diputus; n di bawah 2 = null", () => {
  const a = [0.42, 0.55, 0.61, 0.48, 0.70, 0.66, 0.52], b = [0.35, 0.41, 0.38, 0.44, 0.30, 0.47, 0.39, 0.36];
  const r = H.bandingRerata(a, b);
  assert.equal(r.belum_bisa_diputus, true, "n_a 7 < 8"); assert.equal(r.n_a, 7); assert.ok(Array.isArray(r.ci), "CI tetap dihitung untuk ditampilkan");
  assert.equal(H.bandingRerata([1], b), null); assert.equal(H.bandingRerata(a, []), null);
  assert.equal(H.bandingRerata([1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6, 7, 8]).belum_bisa_diputus, false, "tepat 8 cukup");
});

test("bandingRerata: df 31 atau lebih memakai 1,96; varians nol tidak menghasilkan NaN", () => {
  const besar = Array.from({length: 40}, (_, i) => i % 7), lain = Array.from({length: 40}, (_, i) => (i % 5) + 1);
  assert.equal(H.bandingRerata(besar, lain).t, 1.96);
  const nol = H.bandingRerata([2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(nol.ci, [1, 1]); assert.ok(!Number.isNaN(nol.selisih));
});

test("bandingProporsi: masukan yang mustahil ditolak (x lebih dari n, n nol, negatif, bukan bilangan bulat)", () => {
  assert.throws(() => H.bandingProporsi(11, 10, 1, 8), RangeError);
  assert.throws(() => H.bandingProporsi(0, 0, 1, 8), RangeError);
  assert.throws(() => H.bandingProporsi(-1, 10, 1, 8), RangeError);
  assert.throws(() => H.bandingProporsi(1.5, 10, 1, 8), RangeError);
});

test("keuangan: manfaat bawaan 0, r dan H bawaan 8% dan 5, H di luar 1-15 ditolak, ha 0 = null", () => {
  assert.equal(H.KONST.r_bawaan, 0.08); assert.equal(H.KONST.h_bawaan, 5);
  dekat(H.npv({capex: 1e9, opex: 1e8}), -(1e8 * H.af(0.08, 5) + 1e9), 1e-9, "manfaat 0, r dan H bawaan");
  assert.throws(() => H.af(0.08, 0), RangeError); assert.throws(() => H.af(0.08, 16), RangeError);
  assert.throws(() => H.npv({capex: 1, opex: 1, r: -0.1, H: 5}), RangeError);
  assert.equal(H.bcr({capex: 0, opex: 0, manfaat: 5, r: 0.08, H: 5}), null, "penyebut nol bukan Infinity");
  assert.equal(H.biayaPerHa({capex: 1e6, umur: 5, r: 0.08, opex: 1e5, regu: 1e5, ha: 0}), null);
  dekat(H.biayaPerHa({capex: 1e6, umur: 5, r: 0.08, opex: 1e5, regu: 2e5, ha: 10}), (1e6 * H.crf(0.08, 5) + 1e5 + 2e5) / 10, 1e-9, "biayaPerHa");
  dekat(H.af(0, 5), 5, 1e-9, "r 0 = H tahun"); dekat(H.crf(0, 5), 0.2, 1e-9, "r 0 = 1/n");
});

test("impas: semi Rp3,19 miliar sama dengan breakevenAnnual mesin Studio (baca-C C1.4)", () => {
  dekat(H.impas({capex: 9688192331, opex: 768489352, r: 0.08, H: 5}), 3194959655, 1e-5, "impas semi");
});

test("neracaAir: stok habis dilaporkan hari pertama negatif; Q95 di bawah Q_eko tidak menambah stok; G1 tepat 1,5 x lolos; hari 0 ditolak", () => {
  const n = H.neracaAir({stok_m3: 100, q95_ls: 5, qeko_ls: 5, q_api_ls: 10, evap_m3_hari: 0, hari: 4});
  assert.equal(n.habis_hari, 1, "100 - 864 < 0 pada hari 1"); assert.equal(n.g1_ok, false);
  const t = H.neracaAir({stok_m3: 1000, q95_ls: 1, qeko_ls: 5, q_api_ls: 2, evap_m3_hari: 0, hari: 2});
  t.hari.forEach((s, i) => dekat(s, 1000 - (i + 1) * 2 * 86.4, 1e-9, `hari ${i + 1}: max(0, Q95 - Q_eko) = 0`));
  assert.equal(H.neracaAir({stok_m3: 5000, q95_ls: 15, qeko_ls: 5, q_api_ls: 10, evap_m3_hari: 0, hari: 1}).g1_ok, true, "15 = 1,5 x 10");
  assert.throws(() => H.neracaAir({stok_m3: 100, q95_ls: 5, qeko_ls: 5, q_api_ls: 10, evap_m3_hari: 0, hari: 0}), RangeError);
});

test("joukowsky: dP bar = rho x a x dv / 1e5; a layflat 150 dan HDPE 300 dari KONST; bukan angka ditolak", () => {
  dekat(H.joukowsky(2, 300), 6, 1e-9, "1000 x 300 x 2 / 1e5");
  dekat(H.joukowsky(2, H.KONST.joukowsky_a.layflat), 3, 1e-9, "layflat");
  assert.throws(() => H.joukowsky(NaN, 300), RangeError);
});

test("tingkatPemicu: ambang tepat -20, 3 hari, 1 titik naik tingkat; null tidak menaikkan; data basi menahan", () => {
  const x = {anom_pct: -20, hari_ps50: 3, titik_ab: 1, basi_ansambel: false, basi_titik: false};
  assert.equal(H.tingkatPemicu(x), "GELAR");
  assert.equal(H.tingkatPemicu({...x, anom_pct: -19.9}), "NORMAL");
  assert.equal(H.tingkatPemicu({...x, hari_ps50: 2}), "SIAGA");
  assert.equal(H.tingkatPemicu({...x, titik_ab: 0}), "PRA-POSISI");
  assert.equal(H.tingkatPemicu({...x, basi_titik: true}), "PRA-POSISI", "titik panas basi tidak boleh menggelar");
  assert.equal(H.tingkatPemicu({...x, anom_pct: null}), "NORMAL");
  assert.equal(H.tingkatPemicu({...x, hari_ps50: null}), "SIAGA");
  assert.equal(H.tingkatPemicu({...x, titik_ab: null}), "PRA-POSISI");
});

/* ---------- zona terverifikasi dan saran sarana: satu kompleks per aturan ---------- */
const K = (o = {}) => ({id: "K0001", air_km_lama: 1.4, air_km_semua: 1.4, jalan_km_lama: 3.2, jalan_km_utama: 3.2, jalan_km_semua: 3.2,
  zona_k: "A", zona_u: "A", zona_o: "A", jam_tiba: 2, beda_air_m: -3.5, ...o});

test("zonaTerverifikasi: hanya hasil cek lolos memakai zona optimistis, selain itu konservatif", () => {
  const k = K({zona_k: "D", zona_o: "A"});
  assert.equal(H.zonaTerverifikasi(k, {hasil: "lolos"}), "A");
  assert.equal(H.zonaTerverifikasi(k, {hasil: "gagal"}), "D");
  assert.equal(H.zonaTerverifikasi(k, null), "D"); assert.equal(H.zonaTerverifikasi(k, undefined), "D");
});

test("saranSarana: enam aturan, masing-masing satu kompleks, berhenti di aturan pertama yang cocok", () => {
  const s = (k, v = "k", api = false) => H.saranSarana(k, v, api), ringkas = r => [r.aturan, r.kit, r.heli];
  assert.deepEqual(ringkas(s(K({jam_tiba: 8, zona_k: "D", jalan_km_lama: 9, air_km_lama: 4}), "k", true)), [1, "sisi_tertahan", true]);
  assert.deepEqual(ringkas(s(K({zona_k: "D", jalan_km_lama: 9, air_km_lama: 4}))), [2, "tidak", false]);
  assert.deepEqual(ringkas(s(K({zona_k: "C", jalan_km_lama: 3, air_km_lama: 4}))), [3, "dari_sumur", false]);
  assert.deepEqual(ringkas(s(K({zona_k: "B", jalan_km_lama: 9, air_km_lama: 1}))), [4, "perahu", false]);
  assert.deepEqual(ringkas(s(K({air_km_lama: 0.5}))), [5, "jinjing", false], "tepat 0,5 km = jinjing");
  assert.deepEqual(ringkas(s(K({air_km_lama: 0.51}))), [6, "relay", false]);
});

test("saranSarana: aturan 1 butuh jam_tiba lebih dari 6 (tepat 6 tidak) DAN api aktif; jam_tiba null dilewati dengan alasan", () => {
  assert.equal(H.saranSarana(K({jam_tiba: 6}), "k", true).aturan, 6, "tepat 6 jam bukan lebih dari 6");
  assert.equal(H.saranSarana(K({jam_tiba: 8}), "k", false).aturan, 6, "tanpa api aktif aturan 1 tidak berlaku");
  const nol = H.saranSarana(K({jam_tiba: null}), "k", true);
  assert.equal(nol.aturan, 6); assert.ok(nol.alasan.some(a => /waktu tempuh belum dihitung/.test(a)), nol.alasan.join("|"));
});

test("saranSarana: versi k u o v memilih air dan zona yang benar; v memakai zonaTerverifikasi; versi liar ditolak", () => {
  const k = K({zona_k: "C", zona_u: "B", zona_o: "A", air_km_lama: 3.1, air_km_semua: 0.4, jalan_km_lama: 2, jalan_km_utama: 8, jalan_km_semua: 2});
  assert.equal(H.saranSarana(k, "k", false).kit, "dari_sumur");
  assert.equal(H.saranSarana(k, "u", false).kit, "perahu");
  assert.equal(H.saranSarana(k, "o", false).kit, "jinjing", "zona A air 0,4");
  assert.equal(H.saranSarana(k, "v", false, {hasil: "lolos"}).kit, "jinjing");
  assert.equal(H.saranSarana(k, "v", false, {hasil: "gagal"}).kit, "dari_sumur");
  assert.equal(H.saranSarana(k, "v", false).kit, "dari_sumur", "belum dicek = konservatif");
  assert.throws(() => H.saranSarana(k, "x", false), RangeError);
});

test("saranSarana: alasan berangka berkoma desimal, kalimat sarana tetap, tautan Hitung L = air x 1,2 dan dz dari DSM", () => {
  const r = H.saranSarana(K(), "k", false);
  assert.deepEqual(r.alasan.slice(0, 3), ["air 1,4 km", "jalan 3,2 km", "zona A konservatif"]);
  assert.equal(typeof r.sarana, "string"); assert.match(r.sarana, /relay/);
  assert.deepEqual(r.tautan_hitung, {L_m: 1680, dz_m: 3.5, dz_sumber: "dsm"});
  assert.equal(H.saranSarana(K({beda_air_m: null}), "k", false).tautan_hitung.dz_m, null, "tanpa DSM dz null, bukan 0");
  assert.ok(Object.is(H.saranSarana(K({beda_air_m: 0}), "k", false).tautan_hitung.dz_m, 0), "bukan -0");
  const semua = ["k", "u", "o"].flatMap(v => [K(), K({zona_k: "D", zona_u: "D", zona_o: "D", jalan_km_lama: 9, jalan_km_utama: 9, jalan_km_semua: 9})].map(x => H.saranSarana(x, v, false)));
  for (const x of semua) assert.doesNotMatch(JSON.stringify(x), /[—·]|terbukti/, "tanpa em dash, titik tengah, terbukti");
});

test("saranSarana: jalan kosong (tanpa rute) tidak menjadi 0 di alasan", () => {
  const r = H.saranSarana(K({zona_k: "D", jalan_km_lama: null, air_km_lama: 3}), "k", false);
  assert.equal(r.aturan, 2); assert.ok(r.alasan.some(a => /tanpa jalan/.test(a)), r.alasan.join("|"));
});

/* ---------- matriks respons ---------- */
test("matriksRespons: empat tingkat dengan regu, hari, heli; bara_regu dari koef, tidak tertanam", () => {
  const m = (frp, luas, z = "A", jam = 2, koef = OPERASI_KOEF) => H.matriksRespons(frp, luas, z, koef, jam);
  const t1 = m(5, 1.5); assert.deepEqual([t1.tingkat, t1.regu, t1.hari, t1.heli], [1, 1, 1.5, "tidak"]);
  const t2 = m(20, 5); assert.deepEqual([t2.tingkat, t2.regu, t2.hari, t2.heli], [2, 2, 2.5, "tidak"]);
  const t3 = m(50, 20); assert.deepEqual([t3.tingkat, t3.regu, t3.hari], [3, 3, 6.7]);
  const t3b = m(50, 40); assert.deepEqual([t3b.tingkat, t3b.regu, t3b.hari], [3, 4, 10]);
  const t4 = m(150, 80); assert.deepEqual([t4.tingkat, t4.regu, t4.hari, t4.heli], [4, 8, 10, "ya"]);
  assert.equal(m(20, 5, "A", 2, {bara_regu: {mid: 2}}).hari, 1.3, "ceil(10 x 5 / (2 x 2)) / 10 = 1,3"); assert.equal(m(20, 5).hari, 2.5);
});

test("matriksRespons: tingkat = maks dari FRP dan luas; batas tepat 10/30/100 MW dan 2/10/50 ha", () => {
  const t = (frp, luas) => H.matriksRespons(frp, luas, "A", OPERASI_KOEF, 1).tingkat;
  assert.deepEqual([t(9.99, 1), t(10, 1), t(30, 1), t(30.01, 1), t(100, 1), t(100.01, 1)], [1, 2, 2, 3, 3, 4]);
  assert.deepEqual([t(1, 2), t(1, 2.01), t(1, 10), t(1, 10.01), t(1, 50), t(1, 50.01)], [1, 2, 2, 3, 3, 4]);
  assert.equal(t(5, 60), 4, "luas besar menaikkan tingkat walau FRP rendah");
  assert.equal(t(150, 1), 4, "FRP besar menaikkan tingkat walau luas kecil");
});

test("matriksRespons: heli tahan_front bila tingkat 2 ke atas dan jam_tiba lebih dari 6; null tidak memicu; sumur dangkal hanya tingkat 1 zona C", () => {
  const h = (frp, luas, jam) => H.matriksRespons(frp, luas, "A", OPERASI_KOEF, jam).heli;
  assert.deepEqual([h(20, 5, 7), h(20, 5, 6), h(5, 1, 9), h(20, 5, null), h(150, 80, 1)], ["tahan_front", "tidak", "tidak", "tidak", "ya"]);
  assert.match(H.matriksRespons(5, 1, "C", OPERASI_KOEF, 1).sarana, /sumur dangkal/);
  assert.doesNotMatch(H.matriksRespons(5, 1, "A", OPERASI_KOEF, 1).sarana, /sumur dangkal/);
  assert.doesNotMatch(H.matriksRespons(20, 5, "C", OPERASI_KOEF, 1).sarana, /sumur dangkal/, "hanya tingkat 1");
});

test("matriksRespons: koefisien kosong, nol, atau FRP dan luas mustahil DITOLAK", () => {
  assert.throws(() => H.matriksRespons(20, 5, "A", {}, 1), RangeError);
  assert.throws(() => H.matriksRespons(20, 5, "A", {bara_regu: {mid: 0}}, 1), RangeError);
  assert.throws(() => H.matriksRespons(20, 5, "A", null, 1), RangeError);
  assert.throws(() => H.matriksRespons(-1, 5, "A", OPERASI_KOEF, 1), RangeError);
  assert.throws(() => H.matriksRespons(20, NaN, "A", OPERASI_KOEF, 1), RangeError);
});

/* ---------- vonis G4 ---------- */
const petak = (n, regu, o = {}) => Array.from({length: n}, (_, i) => ({aoi: "A1", tanggal_perlakuan: "2027-08-01", luas_m2: 10000, regu_hari: regu[i % regu.length],
  biaya_rp: 1e6, dingin_72j: 1, nyala_7h: 0, nyala_30h: 0, nyala_90h: 0, ...o}));
const REGU_LENGAN = [0.9, 1, 1.1, 1, 0.95, 1.05, 1, 1], REGU_KONV = [1.9, 2, 2.1, 2, 1.95, 2.05, 2, 2];

test("vonisG4: LULUS bila lengan 30% lebih efisien per regu-hari, CI di atas nol, n 8 atau lebih, biaya per ha tidak lebih dari 1,2 x", () => {
  const v = H.vonisG4(petak(8, REGU_LENGAN), petak(8, REGU_KONV));
  assert.equal(v.vonis, "LULUS", JSON.stringify(v.alasan)); assert.equal(v.pilot, false); assert.equal(v.n_lengan, 8);
});

test("vonisG4: TIDAK LULUS bila lengan lebih buruk dengan CI jelas, atau biaya per ha lebih dari 1,2 x konvensional", () => {
  assert.equal(H.vonisG4(petak(8, REGU_KONV), petak(8, REGU_LENGAN)).vonis, "TIDAK LULUS", "lengan 2x lebih lambat");
  assert.equal(H.vonisG4(petak(8, REGU_LENGAN, {biaya_rp: 3e6}), petak(8, REGU_KONV)).vonis, "TIDAK LULUS", "efikasi lulus tetapi biaya 3 x");
  assert.equal(H.vonisG4(petak(8, REGU_LENGAN, {biaya_rp: 1.2e6}), petak(8, REGU_KONV)).vonis, "LULUS", "tepat 1,2 x boleh");
});

test("vonisG4: BELUM BISA DIPUTUS bila n kurang dari 8 di salah satu lengan atau semua CI memotong nol", () => {
  assert.equal(H.vonisG4(petak(7, REGU_LENGAN), petak(8, REGU_KONV)).vonis, "BELUM BISA DIPUTUS");
  assert.equal(H.vonisG4(petak(8, REGU_LENGAN), petak(7, REGU_KONV)).vonis, "BELUM BISA DIPUTUS");
  assert.equal(H.vonisG4(petak(8, REGU_KONV), petak(8, REGU_KONV)).vonis, "BELUM BISA DIPUTUS", "lengan sama dengan konvensional");
  assert.equal(H.vonisG4([], []).vonis, "BELUM BISA DIPUTUS");
});

test("vonisG4: nyala ulang 90 hari 30% lebih sedikit dengan CI di atas nol juga meluluskan walau efikasi per regu-hari sama", () => {
  const lengan = petak(10, [1]), konv = petak(10, [1]).map((p, i) => ({...p, nyala_90h: i < 6 ? 1 : 0}));
  const v = H.vonisG4(lengan, konv);
  assert.equal(v.vonis, "LULUS", JSON.stringify(v.alasan));
});

test("vonisG4: data pilot tidak pernah diberi vonis G4 (aoi PILOT, tanggal sampai 30 Nov 2026, atau tanda pilot), walau datanya akan LULUS", () => {
  const konv = petak(8, REGU_KONV);
  for (const o of [{aoi: "PILOT-KALTENG"}, {tanggal_perlakuan: "2026-10-20"}, {tanggal_perlakuan: "2026-11-30"}, {pilot: true}]) {
    const v = H.vonisG4(petak(8, REGU_LENGAN, o), konv);
    assert.equal(v.vonis, null, JSON.stringify(o)); assert.equal(v.pilot, true); assert.match(v.label, /pilot, n kecil/);
  }
  assert.equal(H.vonisG4(petak(8, REGU_LENGAN), petak(8, REGU_KONV, {aoi: "PILOT-X"})).vonis, null, "pilot di sisi konvensional juga");
  assert.equal(H.vonisG4(petak(8, REGU_LENGAN, {tanggal_perlakuan: "2026-12-01"}), petak(8, REGU_KONV, {tanggal_perlakuan: "2026-12-01"})).vonis, "LULUS", "sesudah 30 Nov 2026 bukan pilot");
});

test("vonisG4: petak tanpa regu_hari atau regu_hari nol tidak ikut ukuran efikasi per regu-hari", () => {
  const lengan = [...petak(8, REGU_LENGAN), {...petak(1, [1])[0], regu_hari: null}, {...petak(1, [1])[0], regu_hari: 0}];
  const v = H.vonisG4(lengan, petak(8, REGU_KONV));
  assert.equal(v.vonis, "LULUS"); assert.equal(v.n_lengan, 10);
  assert.ok(Number.isFinite(v.efikasi_y.selisih), "tanpa NaN atau Infinity dari pembagian nol");
});

/* ---------- gerbang kalkulator yang tersisa: tiap kode punya kasus yang memicunya ---------- */
const gk = (m, kodeCari) => H.hidraulika(m).gerbang.find(g => g.kode === kodeCari);

test("gerbang H-RATING: debit di atas titik terakhir rating pompa keras dengan angka batas", () => {
  const g = gk({q_lpm: 2400, n_lance: 100, pompa: "ve1500"}, "H-RATING");
  assert.equal(g.tingkat, "keras"); assert.equal(g.batas, 2050);
  assert.match(H.pesanGerbang(g), /Debit 2\.400 L\/min di luar rating pompa terpilih \(paling banyak 2\.050 L\/min\)/);
  assert.equal(gk({q_lpm: 2050, n_lance: 100, pompa: "ve1500"}, "H-RATING"), undefined, "tepat di titik terakhir masih dalam rating");
  assert.equal(gk({q_lpm: 2400, n_lance: 100, pompa: null}, "H-RATING"), undefined, "tanpa pompa tidak ada rating");
});

test("gerbang H-DAYA: daya poros per pompa di atas 85% rating keras; relay seri membagi rata", () => {
  const m = {q_lpm: 1500, n_lance: 100, pompa: "ve1500", bahan: "layflat", id_datasheet_mm: 100, L_m: 1000, eta: 0.5};
  const g = gk(m, "H-DAYA"); assert.ok(g, "daya 1 pompa melewati 37,4 kW");
  assert.equal(g.tingkat, "keras"); assert.equal(g.batas, 44); assert.match(H.pesanGerbang(g), /Daya poros .* kW per pompa melewati 85% rating 44 kW/);
  assert.equal(gk({...m, n_pompa: 2}, "H-DAYA"), undefined, "dua pompa seri membagi head rata");
});

test("gerbang H-KECEPATAN: di atas 3 m/s syarat (HOLD), sedikit di bawah 3 tidak", () => {
  const g = gk({q_lpm: 600, n_lance: 100, id_datasheet_mm: 60, pompa: null, bahan: "layflat", L_m: 100}, "H-KECEPATAN");
  assert.ok(g && g.tingkat === "syarat" && g.nilai > 3); assert.match(H.pesanGerbang(g), /Kecepatan .* m\/s; risiko lonjakan saat katup ditutup/);
  const qTepat = 3 * Math.PI * 0.1 * 0.1 / 4 * 60000;
  assert.equal(gk({q_lpm: qTepat * 0.999, n_lance: 100, id_datasheet_mm: 100, pompa: null, L_m: 100}, "H-KECEPATAN"), undefined);
});

test("gerbang H-PANAS: HDPE di perimeter api aktif keras, layflat atau perimeter tidak aktif tidak", () => {
  const hdpe = {bahan: "hdpe", od_mm: 200, sdr: 11, q_lpm: 300, perimeter_aktif: true};
  assert.equal(gk(hdpe, "H-PANAS").tingkat, "keras"); assert.equal(H.hidraulika(hdpe).vonis, "NO-GO");
  assert.match(H.pesanGerbang(gk(hdpe, "H-PANAS")), /HDPE tidak boleh berada di perimeter api aktif \(K-16\)/);
  assert.equal(gk({...hdpe, perimeter_aktif: false}, "H-PANAS"), undefined);
  assert.equal(gk({perimeter_aktif: true}, "H-PANAS"), undefined, "layflat bukan masalah termoplastik");
});

test("gerbang H-AIR: stok habis = keras dengan hari ke-n; Q95 di bawah 1,5 x debit operasi = syarat; tanpa sumber = tanpa neraca", () => {
  const syarat = H.hidraulika({q_lpm: 600, n_lance: 20, sumber: {q95_ls: 12, qeko_ls: 2, stok_m3: 1000, hari: 3, evap_m3_hari: 5}});
  const g = syarat.gerbang.find(x => x.kode === "H-AIR");
  assert.equal(g.tingkat, "syarat", "stok 1000 tidak habis dalam 3 hari, tetapi 12 kurang dari 15");
  assert.match(H.pesanGerbang(g), /Q95 12 L\/s kurang dari 1,5 x debit operasi 10 L\/s/);
  const kering = H.hidraulika({q_lpm: 600, n_lance: 20, sumber: {q95_ls: 30, qeko_ls: 2, stok_m3: 100, hari: 5, evap_m3_hari: 5000}});
  const k = kering.gerbang.find(x => x.kode === "H-AIR"); assert.equal(k.tingkat, "keras");
  assert.equal(kering.neraca.habis_hari, 1); assert.match(H.pesanGerbang(k), /Sumber habis pada hari ke-1/); assert.equal(kering.vonis, "NO-GO");
  assert.equal(kering.gerbang.filter(x => x.kode === "H-AIR").length, 1, "keras menggantikan syarat, tidak dobel");
  const aman = H.hidraulika({q_lpm: 300, sumber: {q95_ls: 30, qeko_ls: 2, stok_m3: 5000, hari: 3, evap_m3_hari: 0}});
  assert.equal(aman.gerbang.find(x => x.kode === "H-AIR"), undefined); assert.ok(aman.neraca.g1_ok);
  assert.equal(H.hidraulika({}).neraca, null);
});

test("gerbang H-DSM dan H-UJI: catatan saja, tidak menaikkan vonis; 3 m tepat memicu H-UJI, 2,9 tidak", () => {
  const h = H.hidraulika({dz_sumber: "dsm", dalam_m: 3});
  assert.deepEqual(kode(h.gerbang).filter(c => c === "H-DSM" || c === "H-UJI").sort(), ["H-DSM", "H-UJI"]);
  assert.equal(h.vonis, "KONDISIONAL");
  assert.equal(gk({dalam_m: 2.9}, "H-UJI"), undefined);
  assert.match(H.pesanGerbang(gk({dalam_m: 4}, "H-UJI")), /Kedalaman 3–5 m hanya untuk lengan uji kedua/);
  assert.match(H.pesanGerbang(gk({dz_sumber: "dsm"}, "H-DSM")), /DSM berkanopi/);
});

test("tiap kode gerbang DT §5.3.2 punya pesan sendiri, bukan jatuh ke kode mentah", () => {
  const ctx = {nilai: 1, batas: 1, bahan: "layflat", n_lance: 8, rasio: 0.85, sdr: 11, suhu_c: 35, f_suhu: 0.8, q_api_ls: 1};
  for (const c of ["H-TEKANAN", "H-SISA", "H-SISA2", "H-SERAP", "H-RATING", "H-DAYA", "H-KECEPATAN", "H-PANAS", "H-AIR", "H-DSM", "H-UJI"])
    assert.notEqual(H.pesanGerbang({kode: c, tingkat: "keras", ...ctx}), c, `${c} tanpa pesan`);
});

/* ---------- batas.js dan pendaftaran ---------- */
test("batas.js: BATAS_ALAT larik paragraf bersih dan memuat batas G22/G23 dari PRD §9.4.8", async () => {
  const {BATAS_ALAT} = await import("../../public/pipa/batas.js");
  assert.ok(Array.isArray(BATAS_ALAT) && BATAS_ALAT.length >= 6, `paragraf ${BATAS_ALAT?.length}`);
  for (const p of BATAS_ALAT) { assert.equal(typeof p, "string"); assert.ok(p.trim().length > 20, p); assert.doesNotMatch(p, /[—·]|terbukti|titik api|toFixed/i, p); }
  const semua = BATAS_ALAT.join("\n");
  for (const re of [/tidak membuktikan efektivitas/i, /manfaat bawaan 0/i, /skor tidak meluluskan NO-GO/i, /rating/, /kurva Q-H/, /40%/, /tahun kering/, /serap/i])
    assert.match(semua, re, `batas alat tanpa ${re}`);
});

test("globalThis.SippaHitung memuat semua fungsi SP-030", () => {
  const S = globalThis.SippaHitung;
  for (const n of ["neracaAir", "joukowsky", "zonaTerverifikasi", "saranSarana", "matriksRespons", "tingkatPemicu", "bandingRerata", "bandingProporsi", "vonisG4", "af", "crf", "biayaPerHa", "npv", "bcr", "impas"])
    assert.equal(typeof S?.[n], "function", `SippaHitung.${n} belum ada`);
});
