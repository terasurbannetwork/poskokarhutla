/* SP-041: mesin Studio (public/pipa/studio_mesin.js) dalam 0,5% dari angka jalan-ulang baca-C C1.4 (RU §2.2), tanpa peramban dan tanpa basis data.
   Dimuat lewat vm sebagai skrip klasik (pola tests/warga/regu_luring.test.mjs); KONST datang dari hitung.js, satu-satunya tempat batas ditulis. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const baca = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const KODE = baca("public/pipa/studio_mesin.js");
const SUMBER = baca("data/kajian-bnpb/pipa/sumber/Karhutla_Decision_Dashboard.html").split("\n");
await import("../../public/pipa/hitung.js");
const KONST = globalThis.SippaHitung.KONST;
const jsn = x => JSON.parse(JSON.stringify(x));

const ctx = vm.createContext({console, Intl, Math, JSON, Number, Object, Array, Set, Error});
ctx.globalThis = ctx;
vm.runInContext(KODE, ctx, {filename: "studio_mesin.js"});
const E = ctx.KarhutlaEngine;
const dekat = (a, b, tol = 0.005) => Math.abs(a - b) <= tol * Math.abs(b);
const harap = (nama, a, b, tol) => assert.ok(dekat(a, b, tol), `${nama}: ${a} vs acuan ${b} (selisih ${(100 * Math.abs(a - b) / Math.abs(b)).toFixed(3)}% > ${(tol ?? 0.005) * 100}%)`);

/* ---------- angka jalan-ulang ---------- */
test("studio: defaultState + compare cocok baca-C C1.4 dalam 0,5% (CAPEX, OPEX, TCO 5 tahun S1/S2/S3)", () => {
  const [s1, s2, s3] = E.compare(E.defaultState());
  const capex = [5230476081, 9688192331, 19774246500], opex = [745246663, 768489352, 1152257871], tco = [8956709395, 13530639093, 25535535857];
  [s1, s2, s3].forEach((h, i) => {
    harap(`CAPEX S${i + 1}`, h.fin.capex, capex[i]); harap(`OPEX S${i + 1}`, h.fin.opex, opex[i]); harap(`TCO S${i + 1}`, h.fin.tco, tco[i]);
  });
});

test("studio: tekanan semi 5,39 bar, impas semi Rp3,19 M per tahun, Monte Carlo semi P10/P50/P90", () => {
  const semi = E.compare(E.defaultState())[1];
  harap("tekanan semi", semi.hyd.pressBar, 5.3872); harap("impas semi", semi.fin.breakevenAnnual, 3194959655);
  const mc = E.drawRiskMC(semi.s);
  assert.equal(mc.samples, 800);
  harap("MC P10", mc.low, 12057360243); harap("MC P50", mc.mid, 14104858136); harap("MC P90", mc.high, 16074645968);
});

test("studio: uji silang OD160 SDR11 2.000 L/min 2 km +10 m NO-GO tekanan, OD200 lolos tekanan", () => {
  const dasar = {...E.defaultState(), pipe: "hdpe", od: 160, sdr: "11", flowLPM: 2000, networkLength: 2000, branchLength: 0, elevation: 10, pressureEnd: 2, pipeTemp: 35};
  const a = E.assess(dasar);
  assert.equal(a.decision, "NO-GO"); harap("tekanan OD160", a.hyd.pressBar, 12.209);
  assert.ok(a.hard.some(x => /melampaui ambang screening/.test(x)), "OD160 tanpa gerbang tekanan: " + a.hard.join(" | "));
  const b = E.assess({...dasar, od: 200});
  harap("tekanan OD200", b.hyd.pressBar, 6.332); assert.equal(b.decision, "HOLD / VALIDASI");
  assert.ok(!b.hard.some(x => /melampaui ambang screening/.test(x)), "OD200 masih kena gerbang tekanan");
});

/* ---------- angka tidak berubah ---------- */
test("studio: konstanta G, BASES, PIPE, COST, QBASE, N sama dengan salinan beku studio_konstanta.json", () => {
  const beku = JSON.parse(baca("tests/sippa/fixtures/studio_konstanta.json"));
  assert.equal(E.G, beku.G, "G berubah");
  for (const k of ["BASES", "PIPE", "COST", "QBASE"]) assert.deepEqual(jsn(E[k]), beku[k], `${k} berbeda dari berkas pemilik`);
  assert.equal(beku.N_sumber, SUMBER.find(l => /^ const N=/.test(l)).trim(), "fixture N tidak sama dengan sumber");
  for (const [x, y] of [["12", 12], ["x", 0], [null, 0], [Infinity, 0], [2.5, 2.5]]) assert.equal(E.N(x), y, `N(${x})`);
});

test("studio: tiap baris port di luar penanda SIPPA: ada di berkas pemilik, urut, dan baris pemilik yang hilang selalu berganti baris SIPPA:", () => {
  const port = KODE.split("\n"), mulai = port.findIndex(l => l.startsWith("(function(root){"));
  assert.ok(mulai > 0, "pembuka IIFE tidak ditemukan");
  const asal = SUMBER.slice(11, 299);                         // baris 12-299 berkas pemilik
  let i = 0, ditandai = 0, dalamBlok = false;
  const asing = [];
  for (const l of port.slice(mulai).filter(x => x !== "")) {
    if (/SIPPA: mulai blok/.test(l)) { dalamBlok = true; continue; }
    if (/SIPPA: akhir blok/.test(l)) { dalamBlok = false; continue; }
    if (dalamBlok) continue;
    if (/SIPPA:/.test(l)) { ditandai++; continue; }
    let j = i; while (j < asal.length && asal[j] !== l) j++;
    if (j === asal.length) asing.push(l.slice(0, 80)); else i = j + 1;
  }
  assert.deepEqual(asing, [], `${asing.length} baris port bukan dari berkas pemilik dan tanpa SIPPA:`);
  const hilang = asal.length - port.slice(mulai).filter(l => l !== "" && !/SIPPA:/.test(l)).length;
  assert.ok(hilang <= ditandai, `${hilang} baris pemilik hilang tetapi hanya ${ditandai} baris SIPPA: pengganti`);
});

/* ---------- determinisme ---------- */
test("studio: Monte Carlo deterministik bit per bit; satu medan berbeda memberi benih berbeda", () => {
  const s = E.defaultState();
  const a = E.drawRiskMC(s), b = E.drawRiskMC({...s});
  assert.deepEqual([a.low, a.mid, a.high], [b.low, b.mid, b.high]);
  const c = E.drawRiskMC({...s, crew: 11});
  assert.notDeepEqual([a.low, a.mid, a.high], [c.low, c.mid, c.high], "keadaan beda tetapi MC identik: benih tidak peka");
});

/* ---------- gerbangSippa: hanya menambah ---------- */
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SKEMA = (() => {
  const l = SUMBER.slice(300, 1188).join("\n"), w = {};
  vm.runInNewContext("window.KARHUTLA_SCHEMA=[" + l + "]", {window: w}); return jsn(w.KARHUTLA_SCHEMA);
})();
const NUMERIK = SUMBER.filter(l => /^  \{group:'[^']+',key:'/.test(l)).map(l => ({key: /key:'(\w+)'/.exec(l)[1], min: +/min:([\d.]+|-[\d.]+)/.exec(l)[1], max: +/max:(-?[\d.]+)/.exec(l)[1]}));

test("studio: skema pemilik = 32 dimensi, 100 pilihan, 36 parameter numerik (hitungan nyata, G23)", () => {
  assert.deepEqual(jsn(E.hitungSkema(SKEMA)), {dimensi: 32, pilihan: 100});
  assert.equal(NUMERIK.length, 36);
  assert.ok(!/30 dimensi|93 pilihan/.test(KODE), "teks lama 30 dimensi/93 pilihan masih ada");
});

function keadaanAcak(r) {
  const s = E.defaultState();
  for (const d of SKEMA) s[d.key] = d.options[Math.floor(r() * d.options.length)].value;
  for (const n of NUMERIK) if (n.key in s && typeof s[n.key] === "number") s[n.key] = +(n.min + r() * (n.max - n.min)).toFixed(2);
  s.networkLength = Math.round(50 + r() * 6000);
  if (r() < 0.6) s.sippa = {n_lance: 1 + Math.floor(r() * 12), dalam_m: +(r() * 7).toFixed(1), koridor: 1 + Math.floor(r() * 4)};
  return s;
}

test("studio: gerbangSippa tidak pernah mengurangi hambatan (200 keadaan acak berbenih 41)", () => {
  const r = mulberry32(41);
  for (let i = 0; i < 200; i++) {
    const s = keadaanAcak(r), asal = E.assess(s), baru = E.gerbangSippa(s, asal, KONST);
    const hilangKeras = asal.hard.filter(x => !baru.hard.includes(x)), hilangSyarat = asal.conditional.filter(x => !baru.conditional.includes(x));
    assert.ok(baru.hard.length >= asal.hard.length && hilangKeras.length === 0 && hilangSyarat.length === 0,
      `benih 41 keadaan ${i}: keras ${asal.hard.length} -> ${baru.hard.length}; hilang keras ${JSON.stringify(hilangKeras)} syarat ${JSON.stringify(hilangSyarat)}`);
    assert.ok(["NO-GO", "HOLD / VALIDASI", "KONDISIONAL"].includes(baru.decision), `keadaan ${i}: keputusan ${baru.decision}`);
    assert.equal(baru.decision === "NO-GO", baru.hard.length > 0, `keadaan ${i}: NO-GO harus tepat ada hambatan keras (skor tidak meluluskan)`);
    assert.ok(asal.hard.length === asal.hard.length && JSON.stringify(s.sippa) === JSON.stringify(jsn(s).sippa), "masukan berubah");
  }
});

test("studio: gerbangSippa tidak mengubah hasil asal dan gagal keras tanpa KONST", () => {
  const s = E.presetSippa("S0"), asal = E.assess(s), n = [asal.hard.length, asal.conditional.length, asal.decision];
  E.gerbangSippa(s, asal, KONST);
  assert.deepEqual([asal.hard.length, asal.conditional.length, asal.decision], n, "hasil asal dimutasi");
  assert.throws(() => E.gerbangSippa(s, asal), /KONST SippaHitung tidak termuat/);
  assert.throws(() => E.gerbangSippa(s, asal, {serap_lance_lpm: 40}), /tidak termuat/);
});

test("studio: H-SERAP kasus ajar 600 L/min dengan 8 lance NO-GO; 300 L/min lolos; S1 sampai S3 tanpa blok sippa tidak kena", () => {
  const s0 = E.presetSippa("S0");
  const ok = E.gerbangSippa(s0, E.assess(s0), KONST);
  assert.ok(!ok.hard.some(x => /^H-SERAP/.test(x)), "300 L/min dengan 8 lance (serap 320) ditolak: " + ok.hard.join(" | "));
  const s600 = {...s0, flowLPM: 600}, h = E.gerbangSippa(s600, E.assess(s600), KONST);
  assert.equal(h.decision, "NO-GO");
  assert.ok(h.hard.includes("H-SERAP: Debit 600 L/min tidak terserap 8 lance (paling banyak 320 L/min)."), h.hard.join(" | "));
  const semua = E.bandingkanSemua(E.defaultState(), KONST);
  for (const k of ["S1", "S2", "S3"]) assert.ok(!semua.find(x => x.kode === k).hasil.hard.some(x => /^H-(SERAP|DALAM)/.test(x)), `${k} kena H-SERAP/H-DALAM padahal tanpa lance`);
});

test("studio: H-DALAM menolak 5,1 m dan menerima 5 m (batas dari KONST, bukan ditulis ulang)", () => {
  const s0 = E.presetSippa("S0");
  const dalam = m => E.gerbangSippa({...s0, sippa: {...s0.sippa, dalam_m: m}}, E.assess({...s0, sippa: {...s0.sippa, dalam_m: m}}), KONST).hard.filter(x => /^H-DALAM/.test(x));
  assert.equal(dalam(5.1).length, 1); assert.equal(dalam(KONST.dalam_maks_m).length, 0); assert.equal(dalam(5.1)[0].includes("keputusan 50"), true);
});

test("studio: jaringan permanen lebih dari 2 koridor NO-GO; S3 selalu membawa catatan ditutup sampai G5", () => {
  const s3 = E.compare(E.defaultState())[2].s;
  const tiga = {...s3, sippa: {n_lance: 8, dalam_m: 2, koridor: 3}}, dua = {...s3, sippa: {n_lance: 8, dalam_m: 2, koridor: 2}};
  assert.ok(E.gerbangSippa(tiga, E.assess(tiga), KONST).hard.some(x => /^jaringan_permanen/.test(x)), "koridor 3 lolos");
  assert.ok(!E.gerbangSippa(dua, E.assess(dua), KONST).hard.some(x => /^jaringan_permanen/.test(x)), "koridor 2 ditolak");
  const polos = E.gerbangSippa(s3, E.assess(s3), KONST);
  assert.ok(polos.conditional.some(x => /ditutup sampai uji G5/.test(x)), "catatan G5 tidak ada: " + polos.conditional.join(" | "));
  assert.ok(!polos.hard.some(x => /^jaringan_permanen/.test(x)), "tanpa blok sippa koridor bawaan 1 tidak boleh keras");
});

test("studio: H-AIR faktor 1,5 menambah syarat bila sumber bersih kurang dari 1,5 kali debit", () => {
  const s = {...E.defaultState(), waterQ: 70, envReserve: 10, flowLPM: 3000};       // 3.600 L/min tersedia >= 3.000 (lolos asli) tetapi < 4.500
  const h = E.gerbangSippa(s, E.assess(s), KONST);
  assert.ok(!E.assess(s).hard.some(x => /Sumber air setelah cadangan/.test(x)), "asumsi uji salah: gerbang asli sudah keras");
  assert.ok(h.conditional.some(x => /^H-AIR/.test(x)), h.conditional.join(" | "));
  const longgar = {...s, flowLPM: 1000};
  assert.ok(!E.gerbangSippa(longgar, E.assess(longgar), KONST).conditional.some(x => /^H-AIR/.test(x)));
});

/* ---------- larangan keputusan 50, heli, nama item ---------- */
test("studio: tidak ada status GO di keluaran mana pun (perbandingan semua preset dan 200 keadaan)", () => {
  const r = mulberry32(7), semua = [];
  for (const x of E.bandingkanSemua(E.defaultState(), KONST)) semua.push(x.hasil.decision);
  for (let i = 0; i < 200; i++) { const s = keadaanAcak(r); semua.push(E.gerbangSippa(s, E.assess(s), KONST).decision); }
  const aneh = [...new Set(semua)].filter(d => !["NO-GO", "HOLD / VALIDASI", "KONDISIONAL"].includes(d) || /^GO$/i.test(d));
  assert.deepEqual(aneh, [], "status di luar tiga yang sah");
  assert.ok(!/["'`]GO["'`]/.test(KODE), "literal status GO ada di berkas");
});

test("studio: heli menunggu, nilai Rp130 juta per jam tidak ada, jam heli tidak mengubah biaya", () => {
  assert.equal(E.HELI.kode, "sippa.heli.biaya_jam"); assert.equal(E.HELI.status, "menunggu"); assert.equal(E.HELI.nilai, null);
  assert.match(E.HELI.pembanding, /Rp200 juta per sorti satu jam/);
  assert.ok(!/130000000|130\.000\.000|Rp130 juta/.test(KODE), "nilai heli 130 juta masih ada di berkas");
  const a = E.assess({...E.defaultState(), airSupport: "helicopter", helicopterHours: 0}), b = E.assess({...E.defaultState(), airSupport: "helicopter", helicopterHours: 100});
  assert.equal(a.fin.opex, b.fin.opex, "jam heli masuk OPEX padahal biaya menunggu BNPB");
  assert.ok(b.conditional.some(x => /menunggu angka BNPB/.test(x)));
});

test("studio: nama item ELEC dan GEN terisi; tiap item BOQ punya nama bukan kode mentah", () => {
  const s = {...E.defaultState(), pump: "electric", site: "remote", hasBooster: true, alignment: "buried", hotend: "metal", security: "high", waterSource: "well", floodUse: "pump", logistics: "forward", maint: "predictive", airSupport: "oncall", drill: "quarterly", drone: "rgb", pipe: "steel", redundancy: "installed"};
  const boq = E.buildBoQ(s), kode = boq.map(x => x.id);
  for (const k of ["ELEC", "GEN", "BOOST", "SPARE", "STEEL", "RGB", "BURIAL", "HOT", "SEC", "WELL", "TRASH", "FORWARD", "TOOLS2", "AIRCTRL", "DRILL2"]) assert.ok(kode.includes(k), `asumsi uji: ${k} tidak muncul`);
  const mentah = boq.filter(x => x.name === x.id).map(x => x.id);
  assert.deepEqual(mentah, [], `item BOQ bernama kode mentah: ${mentah.join(", ")}`);
});

test("studio: teks mesin tanpa kata terlarang (terbukti, titik api, em dash) dan angka tampil id-ID", () => {
  assert.ok(!/terbukti|titik api|[—·]|toFixed\(/i.test(KODE));
  const h = E.assess({...E.defaultState(), pipe: "hdpe", od: 160, flowLPM: 2000, networkLength: 2000, elevation: 10, pressureEnd: 2, branchLength: 0});
  assert.ok(h.hard.some(x => /Tekanan perhitungan 12,2 bar/.test(x)), "angka desimal harus koma id-ID: " + h.hard.join(" | "));
});

/* ---------- preset S0, S0B ---------- */
test("studio: preset S0 dan S0B: BOM relay, kendaraan dan perahu dipinjam, banjir menambah biaya, dibandingkan bersama S1-S3", () => {
  const semua = E.bandingkanSemua(E.defaultState(), KONST);
  assert.deepEqual(jsn(semua.map(x => x.kode)), ["S0", "S0B", "S1", "S2", "S3"]);
  const [s0, s0b] = semua;
  const ada = (h, id) => h.hasil.boq.find(x => x.id === id);
  assert.equal(ada(s0, "LAY100").q, 1000); assert.equal(ada(s0, "LAY65").q, 500); assert.equal(ada(s0, "GAS").q, 2); assert.equal(ada(s0, "LAN").q, 8 * 1);
  assert.ok(!ada(s0, "BOAT") && !ada(s0, "TRUCK"), "perahu atau kendaraan masuk BOQ padahal dipinjam (G06)");
  assert.ok(ada(s0b, "FLD150") && ada(s0b, "FLD150").q === 300 && ada(s0b, "TRASH"), "modul banjir S0B tidak lengkap");
  assert.ok(s0b.hasil.fin.capex > s0.hasil.fin.capex, `S0B ${s0b.hasil.fin.capex} tidak lebih mahal dari S0 ${s0.hasil.fin.capex}`);
  assert.ok(s0.hasil.fin.capex < semua[2].hasil.fin.capex, "S0 relay harus lebih murah dari S1 portable pemilik");
  assert.throws(() => E.presetSippa("S9"), /tidak dikenal/);
  for (const x of semua) assert.ok(["NO-GO", "HOLD / VALIDASI", "KONDISIONAL"].includes(x.hasil.decision));
  // S1 sampai S3 dari bandingkanSemua tetap angka pemilik
  harap("CAPEX S2 lewat bandingkanSemua", semua[3].hasil.fin.capex, 9688192331);
});
