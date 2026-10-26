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
