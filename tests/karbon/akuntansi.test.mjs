// Kasus tangan untuk public/karbon/akuntansi.js (kontrak docs/karbon/RANCANGAN.md §4). Jalankan: node --test tests/karbon/
import test from "node:test";
import assert from "node:assert/strict";
import {readdirSync, readFileSync, existsSync} from "node:fs";
import {
  CO2_PER_C, AMBANG, ASUMSI_BAWAAN, SUMBER_ASUMSI, validasiAsumsi, gabungAsumsi, hutanPerTahun, baseline, risikoApi, efFRL,
  proyeksiKredit, netKredit, arusKas, npv, irr, hargaImpas, skorSaring, ujiBalik, sensitivitas,
} from "../../public/karbon/akuntansi.js";

const dekat = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);

// Konsesi mini: hutan 1.000 ha, hilang 10 ha/th 2001–2004 (5 ha gambut), 5.000 tCO2 per tahun.
const S = {
  luas_ha: 1200, hutan2000_ha: 1000, gambut_ha: 0, stok_tC: {atas: 100000, bawah: 20000, tanah: 0},
  hilang: Object.fromEntries([2001, 2002, 2003, 2004].map(t => [t, {ha: 10, co2_t: 5000, ha_gambut: 5, ha_primer: 0}])),
  hilang_api: {},
};
const A = {periode_acuan: [2001, 2004], tahun_mulai: 2005, durasi_th: 2, buffer: 0.1};
const LAJU = 40 / 3940;  // Σhilang 40 / Σhutan awal tahun (1000+990+980+970)

test("hutanPerTahun: akhir tahun, 2000 = hutan2000", () => {
  assert.deepEqual(hutanPerTahun(S), {2000: 1000, 2001: 990, 2002: 980, 2003: 970, 2004: 960});
});

test("baseline: laju, ef teramati, hutan awal", () => {
  const b = baseline(S, A);
  dekat(b.laju, LAJU);
  assert.equal(b.ef_tCO2_per_ha, 500);           // 20.000 tCO2 / 40 ha
  assert.equal(b.ef_sumber, "teramati");
  assert.equal(b.hutan_awal_ha, 960);
  assert.equal(b.tahun_data_akhir, 2004);
  assert.equal(b.hilang_rerata_ha, 10);
});

test("baseline: tahun celah sesudah data diproyeksikan, tanpa kredit", () => {
  const b = baseline(S, {...A, tahun_mulai: 2007});   // 2005, 2006 = celah
  dekat(b.hutan_awal_ha, 960 * (1 - LAJU) ** 2);
  const p = proyeksiKredit(S, {...A, tahun_mulai: 2007});
  assert.equal(p.baris[0].tahun, 2007);
  assert.equal(p.baris.length, 2);
});

test("urutan potongan: angka persis", () => {
  const r = proyeksiKredit(S, A).baris[0];
  const E = 960 * LAJU * 500;                      // ±4.873,10 tCO2
  dekat(r.hilang_ha, 960 * LAJU);
  dekat(r.emisi_baseline_t, E);
  dekat(r.emisi_proyek_t, 0.2 * E);
  dekat(r.reduksi_t, 0.8 * E);
  dekat(r.kebocoran_t, 0.16 * E);                  // 0,8 × 0,2
  dekat(r.bruto_t, 0.64 * E);
  dekat(r.pot_ketidakpastian_t, 0.096 * E);        // 0,64 × 0,15
  dekat(r.buffer_t, 0.0544 * E);                   // 0,544 × 0,1
  dekat(r.bagian_negara_t, 0.04896 * E);           // 0,4896 × 0,1
  dekat(r.kredit_t, 0.44064 * E);                  // 0,8·0,8·0,85·0,9·0,9
  dekat(r.kredit_t, 2147.2812, 1e-6);
});

test("total menjumlah, tahun lewat durasi tidak ada", () => {
  const p = proyeksiKredit(S, {...A, durasi_th: 3});
  assert.equal(p.baris.length, 3);
  assert.deepEqual(p.baris.map(r => r.tahun), [2005, 2006, 2007]);
  dekat(p.total.kredit_t, p.baris.reduce((s, r) => s + r.kredit_t, 0));
  dekat(p.rerata_masa_kredit_t, p.total.kredit_t / 3);   // durasi 3 < masa 7: rerata atas 3 baris, bukan 7
  const k = arusKas(p, {...A, durasi_th: 3});
  assert.equal(k.baris.at(-1).tahun, 2007);       // akhir = max(akhir kredit, terbit pertama 2007)
});

test("SMPP 2019: net Manual Book 566.083", () => {
  // baseline gabungan = baseline WRC 924.163 − baseline serapan ARR 117.743 = 806.420
  const baseGabung = netKredit({baseline_t: 924163, proyek_t: 117743});
  assert.equal(baseGabung, 806420);
  assert.equal(netKredit({baseline_t: baseGabung, proyek_t: 240337}), 566083);
  assert.equal(netKredit({baseline_t: 924163, proyek_t: 240337}), 683826);   // WRC saja
  assert.equal(netKredit({baseline_t: 100, proyek_t: 20, kebocoran_t: 5}), 75);
});

test("NPV dan IRR arus diketahui", () => {
  dekat(npv([-100, 60, 60], 0.1), 4.132231405, 1e-9);   // −100 + 54,5454 + 49,5868
  dekat(irr([-100, 110]), 0.1, 1e-9);
  dekat(irr([-100, 60, 60]), 0.1306623863, 1e-8);       // x=1/(1+r): 60x²+60x−100=0 → x=0,88443
  assert.equal(irr([-100, -5, -1]), null);
  assert.equal(irr([10, 20]), null);
});

test("validasi menolak di luar 0..1, tidak menjepit", () => {
  const v1 = validasiAsumsi(gabungAsumsi({efektivitas: 1.2}));
  assert.equal(v1.ok, false);
  assert.match(v1.galat.join(), /efektivitas/);
  assert.equal(validasiAsumsi(gabungAsumsi({kebocoran: -0.1})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({buffer: 1.5})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({durasi_th: 0})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({tahun_mulai: 2027.5})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({harga_usd: -1})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({efektifitas: 0.5})).ok, false);   // salah ketik = kunci tak dikenal
  assert.equal(validasiAsumsi(gabungAsumsi({periode_acuan: [2001, 2010]}), S).ok, false);   // melewati data 2004
  assert.equal(validasiAsumsi(gabungAsumsi()).ok, true);
  assert.throws(() => proyeksiKredit(S, {...A, efektivitas: 1.2}), /efektivitas/);
});

test("SUMBER_ASUMSI menutup semua kunci bawaan", () => {
  for (const k of Object.keys(ASUMSI_BAWAAN)) {
    assert.ok(SUMBER_ASUMSI[k], `sumber ${k} hilang`);
    assert.ok(["bersumber", "HIPOTESIS"].includes(SUMBER_ASUMSI[k].status), k);
  }
});

test("konsesi tanpa kehilangan: kredit 0, ef dari stok, NPV hingga", () => {
  const Z = {...S, hilang: {}, tahun_data_akhir: 2004};
  const b = baseline(Z, A);
  assert.match(b.ef_sumber, /^stok/);
  dekat(b.ef_tCO2_per_ha, 120 * CO2_PER_C);       // (100.000+20.000)/1.000 × 44/12 = 440
  const p = proyeksiKredit(Z, A);
  assert.equal(p.total.kredit_t, 0);
  const k = arusKas(p, A);
  assert.ok(Number.isFinite(k.npv_usd) && k.npv_usd < 0);
  assert.equal(hargaImpas(Z, A), null);
  // tanpa baris hilang sama sekali dan tanpa tahun_data_akhir
  assert.equal(proyeksiKredit({...S, hilang: {}}, A).total.kredit_t, 0);
});

test("tak ada angka negatif/NaN pada asumsi ekstrem", () => {
  for (const ekstrem of [{efektivitas: 1, kebocoran: 1}, {efektivitas: 0}, {ketidakpastian: 1, buffer: 1}, {metode: "tren"}]) {
    const p = proyeksiKredit(S, {...A, durasi_th: 30, ...ekstrem});
    for (const r of p.baris) for (const [kk, v] of Object.entries(r)) if (kk !== "dalam_masa_baseline") assert.ok(Number.isFinite(v) && v >= 0, `${kk}=${v}`);
  }
});

test("penerbitan: kredit tahun awal ditumpuk di tahun jeda_terbit", () => {
  const a = {...A, durasi_th: 5, jeda_terbit: 3};
  const p = proyeksiKredit(S, a), k = arusKas(p, a), t = Object.fromEntries(k.baris.map(r => [r.tahun, r]));
  const kr = p.baris.map(r => r.kredit_t);
  assert.equal(k.baris[0].tahun, 2004);           // tahun 0 = capex
  assert.equal(t[2005].terbit_t, 0);
  assert.equal(t[2006].terbit_t, 0);
  dekat(t[2007].terbit_t, kr[0] + kr[1] + kr[2]);
  assert.equal(t[2008].terbit_t, 0);              // bukan tahun verifikasi
  dekat(t[2009].terbit_t, kr[3] + kr[4]);         // verifikasi tiap 2 th (2007, 2009)
  assert.equal(t[2005].pendapatan_usd, 0);
  // verifikasi tiap 2 th mulai terbit pertama
  assert.deepEqual(k.baris.filter(r => r.verifikasi_usd > 0).map(r => r.tahun), [2007, 2009]);
});

test("arus kas satu tahun: semua biaya dihitung tangan", () => {
  const a = {tahun_mulai: 2005, durasi_th: 1, jeda_terbit: 1, porsi_terjual: 0.9, harga_usd: 10, eskalasi: 0, capex_usd: 200,
    opex_tetap_usd_th: 50, opex_usd_per_t: 1, verifikasi_usd: 300, pnbp: 0.1, bagi_hasil_pemegang: 0.35, dana_komunitas: 0.1, pph: 0.22, diskonto: 0.1};
  const k = arusKas({tahun_mulai: 2005, baris: [{tahun: 2005, kredit_t: 1000}]}, a);
  const [y0, y1] = k.baris;
  assert.equal(y0.arus_usd, -100);
  assert.equal(y1.pendapatan_usd, 9000);          // 1.000 × 0,9 × 10
  assert.equal(y1.opex_usd, 1050);                // 50 + 1 × 1.000
  assert.equal(y1.pnbp_usd, 900);
  assert.equal(y1.bagi_hasil_usd, 2362.5);        // 0,35 × (9.000 − 1.050 − 300 − 900)
  assert.equal(y1.komunitas_usd, 900);
  dekat(y1.pajak_usd, 745.25);                    // 0,22 × (9.000 − 5.612,5)
  dekat(y1.arus_usd, 2642.25);
  dekat(k.npv_usd, -100 + 2642.25 / 1.1);
  assert.equal(k.payback_tahun, 1);
  dekat(k.total_pendapatan_usd - k.total_biaya_usd, -100 + 2642.25);
});

test("eskalasi harga dan diskonto ke tahun sebelum mulai", () => {
  const a = {tahun_mulai: 2005, durasi_th: 2, jeda_terbit: 1, porsi_terjual: 1, harga_usd: 10, eskalasi: 0.1, capex_usd: 200,
    opex_tetap_usd_th: 0, opex_usd_per_t: 0, verifikasi_usd: 0, pnbp: 0, bagi_hasil_pemegang: 0, dana_komunitas: 0, pph: 0, diskonto: 0.1};
  const k = arusKas({tahun_mulai: 2005, baris: [{tahun: 2005, kredit_t: 1000}, {tahun: 2006, kredit_t: 1000}]}, a);
  assert.deepEqual(k.baris.map(r => r.arus_usd).map(x => Math.round(x * 1e6) / 1e6), [-100, 9900, 11000]);
  dekat(k.npv_usd, -100 + 9900 / 1.1 + 11000 / 1.21);
});

test("harga impas: NPV ≈ 0", () => {
  const a = {...A, durasi_th: 10, capex_usd: 1000, opex_tetap_usd_th: 100, verifikasi_usd: 100};
  const h = hargaImpas(S, a);
  assert.ok(h > 0 && h < 1000);
  dekat(arusKas(proyeksiKredit(S, a), {...a, harga_usd: h}).npv_usd, 0, 1e-4);
});

test("sensitivitas monoton naik terhadap harga dan volume", () => {
  const m = sensitivitas(S, {...A, durasi_th: 10, capex_usd: 1000, opex_tetap_usd_th: 100}, [3, 5, 8, 10], [0.5, 1, 1.5]);
  assert.equal(m.length, 4); assert.equal(m[0].length, 3);
  for (let i = 1; i < 4; i++) for (let j = 0; j < 3; j++) assert.ok(m[i][j] > m[i - 1][j]);
  for (let i = 0; i < 4; i++) for (let j = 1; j < 3; j++) assert.ok(m[i][j] >= m[i][j - 1]);
});

test("risikoApi: kelas dan buffer 12% + 5% × kelas", () => {
  assert.deepEqual(risikoApi(S), {porsi_api: 0, tahun_berapi: 0, kelas: 0, buffer: 0.12});
  const r1 = risikoApi({...S, hilang_api: {2001: 2, 2002: 1}});   // 3/40 = 7,5%, 2 tahun → kelas 1
  assert.equal(r1.kelas, 1); dekat(r1.buffer, 0.17);
  const r2 = risikoApi({...S, hilang_api: {2001: 8, 2002: 8}});   // 16/40 = 40% → kelas 2
  assert.equal(r2.kelas, 2); dekat(r2.buffer, 0.22);
  assert.equal(proyeksiKredit(S, {...A, buffer: null}).buffer_dipakai, 0.12);
});

test("skorSaring: luas kecil tidak layak, gambut > 2% menutup jalur Verra tanpa menggugurkan layak", () => {
  const s = skorSaring(S, A);
  assert.equal(s.layak, false);
  assert.match(s.alasan.join(), /10\.000/);
  assert.equal(s.jalur_verra, true);
  const G = {...S, luas_ha: 20000, hutan2000_ha: 15000, gambut_ha: 1000, stok_tC: {atas: 1.5e6, bawah: 3e5}};
  const g = skorSaring(G, {...A, durasi_th: 20, capex_usd: 0, opex_tetap_usd_th: 0, verifikasi_usd: 0});
  assert.equal(g.jalur_verra, false);
  assert.equal(g.layak, true);
  assert.match(g.peringatan.join(), /VMD0055/);
  assert.doesNotMatch(g.alasan.join(), /VMD0055/);   // peringatan tak menggugurkan, tak masuk alasan
  dekat(g.porsi_gambut, 0.05);
  dekat(g.stok_tCO2_ha, 120 * CO2_PER_C);
});

test("ujiBalik: laju latih diproyeksikan ke tahun uji", () => {
  // 2001–2002 latih, 2003–2004 uji. laju latih = 20 / (1000+990); ramal dari hutan akhir 2002 = 980
  const u = ujiBalik(S, [2001, 2002], [2003, 2004]);
  const l = 20 / 1990;
  dekat(u.ramal_ha, 980 * l + 980 * (1 - l) * l);
  assert.equal(u.aktual_ha, 20);
  dekat(u.rasio, u.ramal_ha / 20);
  assert.throws(() => ujiBalik(S), /melewati/);
});

// Faktor FRL mini: 2 kelas hutan (A 300, B 100 t bk/ha), 2 pendorong (1→X 50, 2→Y 10), fraksi C 0,5.
const FRL = {
  fraksi_karbon: 0.5, kelas_hutan_alam: ["A", "B"],
  biomassa_dm_ha: {A: 300, B: 100, X: 50, Y: 10, 2002: 263.29, 2007: 158.81},
  gambut_ef_tco2_ha_th: {A: 0, B: 0, X: 40, Y: 20, 2002: 32.42, 2007: 45.04},
  tujuan_per_pendorong: {1: "X", 2: "Y", lain: "Y"},
};
const SF = {...S, tutupan2017: {A: 30, B: 10, X: 999}, pendorong: {1: 3, 2: 1}};

test("efFRL: kasus tangan", () => {
  const f = efFRL(SF, FRL, [2001, 2004]);
  assert.equal(f.stok_hutan_dm, 250);              // (300×30 + 100×10) / 40; X bukan hutan alam
  assert.equal(f.stok_tujuan_dm, 40);              // (50×3 + 10×1) / 4
  dekat(f.ef_biomassa_tCO2_ha, 385);               // 210 × 0,5 × 44/12
  assert.equal(f.dekomposisi_tCO2_ha_th, 35);      // (40×3 + 20×1) / 4
  assert.equal(f.porsi_gambut_hilang, 0.5);        // 20 ha gambut / 40 ha
  const kosong = efFRL({...S, tutupan2017: {}, pendorong: {}}, FRL, [2001, 2004]);
  assert.equal(kosong.stok_hutan_dm, 263.29);
  assert.equal(kosong.stok_tujuan_dm, 158.81);
});

test("proyeksi frl: dekomposisi gambut kumulatif menaikkan baseline tahun berikut", () => {
  // tren datar 10 ha/th → baseline_k = 10×385 + (5×k)×35 = 3.850 + 175k
  const a = {...A, metode: "tren", ef_metode: "frl", durasi_th: 3};
  const p = proyeksiKredit(SF, a, FRL);
  assert.deepEqual(p.baris.map(r => r.hilang_ha), [10, 10, 10]);
  dekat(p.baris[0].emisi_baseline_t, 4025);
  dekat(p.baris[1].emisi_baseline_t, 4200);
  dekat(p.baris[2].emisi_baseline_t, 4375);
  dekat(p.baris[1].emisi_proyek_t, 0.2 * 4200);
  assert.equal(p.ef_sumber, "frl");
  assert.throws(() => proyeksiKredit(SF, a), /faktor_frl/);
  // faktor nasional sungguhan bisa dimuat dan menghasilkan angka hingga
  const nyata = JSON.parse(readFileSync(new URL("../../public/karbon/faktor_frl.json", import.meta.url)));
  assert.ok(Number.isFinite(proyeksiKredit({...SF, tutupan2017: {2002: 10}, pendorong: {1: 1}}, a, nyata).total.kredit_t));
});

// ---------- Perubahan jujur-hitung (22 Okt 2026): pendorong, masa baseline, tren, penerbitan, ambang ef ----------
const P = (ha, co2_t) => ({ha, co2_t});
const hil = (ha, pendorong) => ({ha, co2_t: ha * 500, ha_gambut: 0, ha_primer: 0, ...(pendorong ? {pendorong} : {})});
// 2001: semua terpilah (4 ha pertanian, 6 tebang); 2002: 4 ha tanpa pendorong; 2003: tanpa rincian; 2004: semua api/alami.
const SD = {...S, hilang: {
  2001: hil(10, {1: P(4, 2000), 4: P(6, 3000)}),
  2002: hil(10, {1: P(2, 1000), 4: P(4, 2000)}),
  2003: hil(10),
  2004: hil(10, {7: P(10, 5000)}),
}};

test("pendorong: hanya 1,2,3,6; sisa tanpa pendorong dibagi menurut porsi", () => {
  const b = baseline(SD, A);
  // 2001: 4. 2002: 2 + 4 × (2/6). 2003: 10 × (6/26) (porsi seluruh tahun: terpilih 4+2, semua 10+6+10). 2004: 0.
  const ha = 4 + (2 + 4 / 3) + 10 * 6 / 26;
  dekat(b.hilang_rerata_ha, ha / 4);
  dekat(b.porsi_dapat_dicegah, ha / 40);
  dekat(b.laju, ha / 3940);                          // penyebut: hutan awal tahun sungguhan 1000+990+980+970
  assert.deepEqual(b.pendorong_baseline, ["1", "2", "3", "6"]);
  assert.deepEqual(b.peringatan, []);
  assert.match(b.ef_sumber, /^stok/);                // 9,64 ha terfilter < 20 ha walau total 40 ha
  // indikator IFM: jejak tebang nyata (driver 4) rata-rata per tahun periode
  dekat(b.hilang_tebang_rerata_ha, 10 / 4);
  dekat(b.emisi_tebang_rerata_t, 5000 / 4);
  // semua pendorong dipilih → sama dengan seluruh kehilangan (tak ada yang hilang atau dobel)
  const semua = baseline(SD, {...A, pendorong_baseline: ["1", "2", "3", "4", "5", "6", "7"]});
  dekat(semua.hilang_rerata_ha, 10); dekat(semua.porsi_dapat_dicegah, 1);
  // baseline lebih kecil dari tanpa-filter, kredit ikut turun
  assert.ok(proyeksiKredit(SD, A).total.kredit_t < proyeksiKredit({...SD, hilang: S.hilang}, A).total.kredit_t);
});

test("pendorong: co2 dialokasikan terpisah dari ha", () => {
  const b = baseline({...SD, hilang: {...SD.hilang, 2003: hil(30, {1: P(30, 9000)})}}, {...A, periode_acuan: [2003, 2003]});
  assert.equal(b.hilang_rerata_ha, 30);              // satu tahun, semua pendorong 1
  const e = baseline({...SD, hilang: {2001: {ha: 30, co2_t: 12000, pendorong: {1: P(10, 2000), 4: P(10, 6000)}}}, tahun_data_akhir: 2001},
    {...A, periode_acuan: [2001, 2001], tahun_mulai: 2002});
  // ha: 10 + (30−20) × 0,5 = 15 ; co2: 2000 + (12000−8000) × (2000/8000) = 3000 → ef = 200 (hil 15 < 20 → stok), cek lewat metode ef nyata di bawah
  dekat(e.hilang_rerata_ha, 15);
});

test("tanpa pendorong di mana pun: semua kehilangan + peringatan", () => {
  const b = baseline(S, A);
  assert.equal(b.hilang_rerata_ha, 10);
  assert.equal(b.porsi_dapat_dicegah, 1);
  assert.deepEqual(b.peringatan, ["pendorong tidak tersedia: baseline memakai semua kehilangan tutupan"]);
  assert.deepEqual(proyeksiKredit(S, A).peringatan, b.peringatan);
  assert.ok(skorSaring(S, A).peringatan.includes(b.peringatan[0]));
  assert.ok(!skorSaring(S, A).alasan.includes(b.peringatan[0]));
});

test("validasi: pendorong_baseline dan masa_baseline_th", () => {
  assert.equal(validasiAsumsi(gabungAsumsi({pendorong_baseline: ["8"]})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({pendorong_baseline: [4]})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({pendorong_baseline: "1"})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({masa_baseline_th: 0})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({masa_baseline_th: 7.5})).ok, false);
  assert.equal(validasiAsumsi(gabungAsumsi({pendorong_baseline: []})).ok, true);
});

test("bawaan 2026: periode acuan 10 tahun data terakhir; teks sumber tanpa jt/rb dan tanpa rujukan bahan internal", () => {
  assert.deepEqual(ASUMSI_BAWAAN.periode_acuan, [2016, 2025]);
  assert.match(SUMBER_ASUMSI.periode_acuan.teks, /2016–2025/);
  for (const [k, v] of Object.entries(SUMBER_ASUMSI)) assert.doesNotMatch(v.teks + v.sumber, /\b\d+ (jt|rb)\b|\bMB hlm|bahan [A-E]\b/, k);
  assert.match(SUMBER_ASUMSI.capex_usd.sumber, /USD 3\.000\.000.*USD 600\.000/);
  assert.match(SUMBER_ASUMSI.harga_usd.teks, /±USD 4 \(rata-rata global MSCI 2025\) sampai ±USD 8 \(REDD\+ BBB\+, Sylvera Q3 2026\)/);
  assert.match(SUMBER_ASUMSI.buffer.teks, /12% \+ 5% × kelas.*22%/);
  assert.equal(Math.round((AMBANG.buffer_lantai + AMBANG.buffer_per_kelas * AMBANG.kelas_api_maks) * 100), 22);   // tangan: 12 + 5×2
});

test("bawaan dan label jujur", () => {
  const d = ASUMSI_BAWAAN;
  assert.deepEqual([d.durasi_th, d.masa_baseline_th, d.harga_usd, d.eskalasi], [20, 7, 5, 0]);
  assert.deepEqual(d.pendorong_baseline, ["1", "2", "3", "6"]);
  assert.equal(SUMBER_ASUMSI.pnbp.status, "HIPOTESIS");
  assert.match(SUMBER_ASUMSI.metode.teks, /BUKAN VM0048/);
  assert.match(SUMBER_ASUMSI.harga_usd.teks, /lantai offtake/);
  assert.doesNotMatch(SUMBER_ASUMSI.buffer.teks, /maks 30%/);
  assert.notEqual(gabungAsumsi().pendorong_baseline, ASUMSI_BAWAAN.pendorong_baseline);   // salinan, bawaan beku tak bocor
});

test("masa baseline: baris, total, rerata", () => {
  const a = {...A, durasi_th: 3, masa_baseline_th: 2};
  const p = proyeksiKredit(S, a), kr = p.baris.map(r => r.kredit_t);
  assert.deepEqual(p.baris.map(r => r.dalam_masa_baseline), [true, true, false]);
  dekat(p.total_masa_baseline.kredit_t, kr[0] + kr[1]);
  dekat(p.total.kredit_t, kr[0] + kr[1] + kr[2]);
  dekat(p.total_masa_baseline.hilang_ha, p.baris[0].hilang_ha + p.baris[1].hilang_ha);
  dekat(p.rerata_masa_kredit_t, (kr[0] + kr[1]) / 2);
  assert.equal(p.masa_baseline_th, 2);
  // masa lebih panjang dari durasi: rerata atas semua baris
  const q = proyeksiKredit(S, {...a, masa_baseline_th: 9});
  dekat(q.rerata_masa_kredit_t, q.total.kredit_t / 3);
  dekat(q.total_masa_baseline.kredit_t, q.total.kredit_t);
});

test("npv masa baseline: arus kas hanya s.d. tahun terakhir dalam masa", () => {
  const a = {tahun_mulai: 2005, durasi_th: 3, masa_baseline_th: 2, jeda_terbit: 1, siklus_verifikasi: 1, porsi_terjual: 1, harga_usd: 10, eskalasi: 0,
    capex_usd: 200, opex_tetap_usd_th: 0, opex_usd_per_t: 0, verifikasi_usd: 0, pnbp: 0, bagi_hasil_pemegang: 0, dana_komunitas: 0, pph: 0, diskonto: 0.1};
  const pr = {tahun_mulai: 2005, baris: [2005, 2006, 2007].map(tahun => ({tahun, kredit_t: 1000}))};   // arus [−100, 10.000 − 100, 10.000, 10.000] (capex 50/50 tahun 0 dan 1)
  const k = arusKas(pr, a);
  dekat(k.npv_usd, -100 + 9900 / 1.1 + 10000 / 1.21 + 10000 / 1.331);
  dekat(k.npv_masa_baseline_usd, -100 + 9900 / 1.1 + 10000 / 1.21);
  dekat(arusKas(pr, {...a, masa_baseline_th: 3}).npv_masa_baseline_usd, k.npv_usd);   // masa = durasi → sama
  dekat(arusKas(pr, {...a, masa_baseline_th: 50}).npv_masa_baseline_usd, k.npv_usd);
});

test("skorSaring: NPV penuh positif tapi dalam masa negatif → peringatan, tetap layak; alasan terpisah", () => {
  const G = {...S, luas_ha: 20000, hutan2000_ha: 15000, stok_tC: {atas: 1.5e6, bawah: 3e5}};
  const dasar = {...A, durasi_th: 20, masa_baseline_th: 7, opex_tetap_usd_th: 0, verifikasi_usd: 0, capex_usd: 0};
  const bebas = skorSaring(G, dasar), pnpv = arusKas(proyeksiKredit(G, dasar), dasar);
  assert.ok(pnpv.npv_usd > 0 && pnpv.npv_masa_baseline_usd > 0);
  // capex yang melampaui NPV 7 th tetapi di bawah NPV 20 th
  const capex = pnpv.npv_masa_baseline_usd / 0.9;   // capex 50/50 tahun 0,1 menggerus NPV ≈ 0,93 × capex
  const g = skorSaring(G, {...dasar, capex_usd: capex});
  assert.ok(g.npv_usd > 0 && g.npv_masa_baseline_usd < 0, `${g.npv_usd} ${g.npv_masa_baseline_usd}`);
  assert.equal(g.layak, true);                       // layak memakai NPV seluruh durasi
  assert.match(g.peringatan.join(), /Layak hanya bila baseline diperpanjang sesudah tahun ke-7/);
  assert.deepEqual(g.alasan, []);
  assert.ok(!bebas.peringatan.some(x => /Layak hanya/.test(x)));
  assert.ok(g.peringatan.some(x => /sesudah tahun ke-7 memerlukan baseline/.test(x)));          // durasi 20 > masa 7
  assert.ok(!skorSaring(G, {...dasar, durasi_th: 5}).peringatan.some(x => /memerlukan baseline/.test(x)));
  const p = proyeksiKredit(G, dasar);
  dekat(bebas.potensi_kredit_th, p.baris.slice(0, 7).reduce((x, r) => x + r.kredit_t, 0) / 7);   // rerata dalam masa, bukan 10 / 20
});

test("skorSaring: hutan tersisa < 50% luas menggugurkan walau NPV positif", () => {
  const tinggi = (h2000) => ({...S, luas_ha: 20000, hutan2000_ha: h2000, stok_tC: {atas: 1e6, bawah: 0}, hilang: Object.fromEntries([2001, 2002, 2003, 2004].map(t => [t, {ha: 1000, co2_t: 1e6}]))});
  const a = {...A, durasi_th: 20, capex_usd: 0, opex_tetap_usd_th: 0, verifikasi_usd: 0};
  const rendah = skorSaring(tinggi(12000), a);       // sisa 8.000 ha = 40%
  assert.ok(rendah.npv_usd > 0);
  assert.equal(rendah.layak, false);
  assert.match(rendah.alasan.join(), /50%/);
  assert.equal(rendah.alasan.length, 1);
  const cukup = skorSaring(tinggi(15000), a);        // sisa 11.000 ha = 55%
  assert.equal(cukup.layak, true);
  assert.deepEqual(cukup.alasan, []);
});

test("tren: dipotong ke maksimum tahunan teramati (terfilter), dan ke 0", () => {
  // terfilter 10,20,30,20 (2004: 40 ha api tak masuk); total 10,20,30,60. Regresi: 4 ha/th² → 2005: 30, 2006: 34, 2007: 38
  const T = {...S, hilang: {
    2001: hil(10, {1: P(10, 5000)}), 2002: hil(20, {1: P(20, 10000)}), 2003: hil(30, {1: P(30, 15000)}),
    2004: hil(60, {1: P(20, 10000), 5: P(40, 20000)})}};
  const b = baseline(T, {...A, metode: "tren"});
  dekat(b.tren_b, 4); dekat(b.tren_a + b.tren_b * 2006, 34);
  assert.equal(b.hilangModel(1e6, 2006), 30);        // tanpa potong 34; potong ke total (60) juga 34
  assert.equal(b.hilangModel(1e6, 2050), 30);
  assert.equal(b.hilangModel(5, 2050), 5);           // tetap dibatasi hutan tersisa
  const p = proyeksiKredit(T, {...A, metode: "tren", tahun_mulai: 2006, durasi_th: 2});
  dekat(p.baris[0].hilang_ha, 30);
  // menurun → tak pernah negatif
  const D = {...S, hilang: Object.fromEntries([[2001, 40], [2002, 30], [2003, 20], [2004, 10]].map(([t, ha]) => [t, {ha, co2_t: ha * 500}]))};
  const d = baseline(D, {...A, metode: "tren"});
  dekat(d.tren_b, -10);
  assert.equal(d.hilangModel(1000, 2005), 0);
  assert.equal(d.hilangModel(1000, 2010), 0);
  dekat(d.hilangModel(1000, 2004), 10);
});

test("laju dijepit ke 1", () => {
  const K = {luas_ha: 100, hutan2000_ha: 10, gambut_ha: 0, stok_tC: {}, hilang: {2001: {ha: 20, co2_t: 100}}};
  assert.equal(baseline(K, {periode_acuan: [2001, 2001], tahun_mulai: 2002}).laju, 1);
});

test("penerbitan: hanya di tahun verifikasi, akhir kredit terakhir bila tersisa", () => {
  const a = {tahun_mulai: 2005, durasi_th: 6, jeda_terbit: 2, siklus_verifikasi: 3, porsi_terjual: 1, harga_usd: 1, eskalasi: 0, capex_usd: 0,
    opex_tetap_usd_th: 0, opex_usd_per_t: 0, verifikasi_usd: 40, pnbp: 0, bagi_hasil_pemegang: 0, dana_komunitas: 0, pph: 0, diskonto: 0.1};
  const pr = {tahun_mulai: 2005, baris: [100, 200, 300, 400, 500, 600].map((kredit_t, i) => ({tahun: 2005 + i, kredit_t}))};
  const k = arusKas(pr, a), t = Object.fromEntries(k.baris.map(r => [r.tahun, r]));
  // verifikasi: 2006 (= mulai + jeda − 1), 2009 (+3), lalu 2010 (tahun kredit terakhir, masih ada yang belum terbit)
  assert.deepEqual(k.baris.filter(r => r.verifikasi_usd > 0).map(r => r.tahun), [2006, 2009, 2010]);
  assert.deepEqual(k.baris.filter(r => r.terbit_t > 0).map(r => [r.tahun, r.terbit_t]), [[2006, 300], [2009, 1200], [2010, 600]]);
  assert.equal(k.baris.reduce((x, r) => x + r.terbit_t, 0), 2100);   // semua kredit terbit tepat sekali
  assert.equal(t[2007].pendapatan_usd, 0);
  // kredit terakhir jatuh tepat di tahun verifikasi: tak ada verifikasi ganda
  const b = arusKas({tahun_mulai: 2005, baris: pr.baris.slice(0, 5)}, {...a, durasi_th: 5, siklus_verifikasi: 2});   // 2006, 2008, 2009
  assert.deepEqual(b.baris.filter(r => r.verifikasi_usd > 0).map(r => r.tahun), [2006, 2008, 2009]);
  // jeda melewati durasi: satu penerbitan di tahun jeda
  const c = arusKas({tahun_mulai: 2005, baris: pr.baris.slice(0, 2)}, {...a, durasi_th: 2, jeda_terbit: 4});
  assert.deepEqual(c.baris.filter(r => r.verifikasi_usd > 0).map(r => r.tahun), [2008]);
  assert.deepEqual(c.baris.filter(r => r.terbit_t > 0).map(r => [r.tahun, r.terbit_t]), [[2008, 300]]);
});

test("opex per t memakai kredit yang DIHASILKAN, bukan yang terbit", () => {
  const a = {tahun_mulai: 2005, durasi_th: 2, jeda_terbit: 2, siklus_verifikasi: 1, porsi_terjual: 1, harga_usd: 1, eskalasi: 0, capex_usd: 0,
    opex_tetap_usd_th: 50, opex_usd_per_t: 1, verifikasi_usd: 0, pnbp: 0, bagi_hasil_pemegang: 0, dana_komunitas: 0, pph: 0, diskonto: 0.1};
  const k = arusKas({tahun_mulai: 2005, baris: [{tahun: 2005, kredit_t: 1000}, {tahun: 2006, kredit_t: 400}]}, a);
  const t = Object.fromEntries(k.baris.map(r => [r.tahun, r]));
  assert.equal(t[2005].terbit_t, 0);
  assert.equal(t[2005].opex_usd, 1050);              // 50 + 1 × 1.000 dihasilkan (0 terbit)
  assert.equal(t[2006].opex_usd, 450);
  assert.equal(t[2006].terbit_t, 1400);
});

test("arusKas menolak tahun_mulai proyeksi yang tak sama dengan asumsi", () => {
  const pr = proyeksiKredit(S, A);
  assert.throws(() => arusKas(pr, {...A, tahun_mulai: 2006}), /tahun_mulai/);
  assert.throws(() => arusKas({baris: pr.baris}, A), /tahun_mulai/);
  assert.doesNotThrow(() => arusKas(pr, A));
});

test("ef teramati hanya bila hilang baseline >= 20 ha di periode", () => {
  const dgn = ha => ({...S, hilang: Object.fromEntries([2001, 2002, 2003, 2004].map(t => [t, {ha, co2_t: ha * 300}]))});
  const pas = baseline(dgn(5), A);                   // tepat 20 ha
  assert.equal(pas.ef_sumber, "teramati"); dekat(pas.ef_tCO2_per_ha, 300);
  const kurang = baseline(dgn(4.95), A);             // 19,8 ha
  assert.match(kurang.ef_sumber, /^stok.*< 20 ha/);
  dekat(kurang.ef_tCO2_per_ha, 120 * CO2_PER_C);
  assert.equal(proyeksiKredit(dgn(4.95), A).ef_sumber, kurang.ef_sumber);
});

test("risikoApi: lima tahun berapi = kelas 2 walau porsi kecil; buffer maks efektif 22%", () => {
  const R = {...S, hilang: Object.fromEntries([2001, 2002, 2003, 2004, 2005, 2006].map(t => [t, {ha: 100}]))};   // 600 ha
  const lima = risikoApi({...R, hilang_api: {2001: 1, 2002: 1, 2003: 1, 2004: 1, 2005: 1}});   // 5/600 < 10%
  assert.equal(lima.kelas, 2); dekat(lima.buffer, 0.22);
  const empat = risikoApi({...R, hilang_api: {2001: 1, 2002: 1, 2003: 1, 2004: 1}});
  assert.equal(empat.kelas, 1); dekat(empat.buffer, 0.17);
  assert.equal(risikoApi({...R, hilang_api: {2001: 1, 2002: 0.5, 2003: 0.5}}).kelas, 0);   // < 1 ha bukan tahun berapi
  assert.equal(risikoApi({...R, hilang_api: {2001: 600}}).buffer <= 0.22 + 1e-12, true);
});

test("efFRL: kelas tujuan lebih padat dari hutan tidak memberi emisi negatif", () => {
  const f = efFRL(SF, {...FRL, biomassa_dm_ha: {...FRL.biomassa_dm_ha, X: 500, Y: 500}}, [2001, 2004]);
  assert.equal(f.ef_biomassa_tCO2_ha, 0);
});

test("IRR: rentang pencarian −99%..+1000%", () => {
  dekat(irr([-100, 1000]), 9, 1e-9);                 // 900% di dalam rentang
  assert.equal(irr([-100, 2000]), null);             // 1900% di luar rentang
  dekat(irr([-100, 50]), -0.5, 1e-9);                // IRR negatif ditemukan
  assert.equal(irr([-100, 0.5]), null);              // −99,5% di luar rentang
});

test("faktor FRL ngawur tak membuat kredit negatif", () => {
  const p = proyeksiKredit(SF, {...A, ef_metode: "frl", durasi_th: 2}, {...FRL, fraksi_karbon: -0.5});
  for (const r of p.baris) for (const [kk, v] of Object.entries(r)) if (typeof v === "number") assert.ok(v >= 0, `${kk}=${v}`);
  assert.equal(p.total.kredit_t, 0);
});

// Fixture stat sungguhan (Pangean dsb.) dibuat pengerja lain; ujinya terdaftar hanya bila berkasnya ada.
const DIR_FIX = new URL("./fixtures/", import.meta.url);
const FIX = (existsSync(DIR_FIX) ? readdirSync(DIR_FIX).filter(f => f.endsWith(".json")) : [])
  .map(f => { try { return [f, JSON.parse(readFileSync(new URL(f, DIR_FIX)))]; } catch { return [f, null]; } }).filter(([, s]) => s && s.hilang && "hutan2000_ha" in s);
for (const [nama, s] of FIX) test(`fixture nyata ${nama}: angka hingga dan tak negatif`, () => {
  const p = proyeksiKredit(s, {});
  assert.ok(p.total.kredit_t >= 0 && Number.isFinite(p.total.kredit_t));
  for (const r of p.baris) for (const v of Object.values(r)) assert.ok(Number.isFinite(v) && v >= 0);
  const sk = skorSaring(s, {});
  assert.ok(Number.isFinite(sk.npv_usd));
  assert.ok(Number.isFinite(ujiBalik(s).ramal_ha));
});
