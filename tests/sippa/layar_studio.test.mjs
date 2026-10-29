/* SP-042: logika murni layar Studio /pipa/studio (PRD §9.5, DS §3.9, §3.10, §4.9) dan pekerja Monte Carlo, tanpa DOM dan tanpa basis data.
   Mesin dimuat sebagai skrip klasik (mengisi globalThis.KarhutlaEngine); hitung.js mengisi SippaHitung. Pembangun HTML diperiksa sebagai string. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
(0, eval)(baca("public/inti/format.js").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
const KODE_MESIN = baca("public/pipa/studio_mesin.js");
(0, eval)(KODE_MESIN);
const E = globalThis.KarhutlaEngine;
const {KONST, npv: npvH, bcr: bcrH} = await import("../../public/pipa/hitung.js").then(() => globalThis.SippaHitung);
const S = await import("../../public/pipa/layar_studio.js");
const K = await import("../../public/pipa/studio_skema.js");
const {BATAS_ALAT} = await import("../../public/pipa/batas.js");
const jsn = x => JSON.parse(JSON.stringify(x));

/* ---------- skema ---------- */
test("skema: 32 dimensi, 100 pilihan, 36 parameter dari skema nyata, dan hitungSkema mesin sama (G23)", () => {
  assert.equal(K.SKEMA.length, 32); assert.equal(K.NUMERIK.length, 36);
  assert.deepEqual(E.hitungSkema(K.SKEMA), {dimensi: 32, pilihan: 100});
  assert.deepEqual(S.ringkasSkema(), {dimensi: 32, pilihan: 100, parameter: 36, teks: "32 dimensi, 100 pilihan, 36 parameter numerik"});
  assert.equal(K.KELOMPOK.length, 8);
});

test("skema: tiap kunci ada di defaultState, tiap bawaan ada di pilihannya, tiap kelompok dipakai, rentang numerik memuat bawaan", () => {
  const d = E.defaultState();
  for (const x of K.SKEMA) {
    assert.ok(x.key in d, `${x.key} tidak ada di defaultState`);
    assert.ok(K.KELOMPOK.includes(x.group), `${x.key}: kelompok ${x.group}`);
    assert.ok(x.options.some(o => o.value === String(d[x.key])), `${x.key}: bawaan ${d[x.key]} bukan salah satu pilihan`);
  }
  for (const n of K.NUMERIK) {
    assert.ok(n.key in d && typeof d[n.key] === "number", `${n.key} bukan angka di defaultState`);
    assert.ok(d[n.key] >= n.min && d[n.key] <= n.max, `${n.key}: bawaan ${d[n.key]} di luar ${n.min}..${n.max}`);
  }
  for (const g of K.KELOMPOK) assert.ok([...K.SKEMA, ...K.NUMERIK].some(x => x.group === g), `kelompok ${g} kosong`);
});

/* ---------- keadaan ---------- */
test("bersihkan: kunci liar dibuang, angka dijepit ke rentang, kategori liar jatuh ke bawaan, __proto__ tidak mencemari", () => {
  const d = E.defaultState();
  const b = S.bersihkan(JSON.parse('{"waterQ":99999,"od":"abc","pump":"nuklir","strategy":"backbone","hasBooster":"true","liar":1,"__proto__":{"x":1},"horizon":-3}'));
  assert.equal(b.waterQ, 1000, "dijepit ke maks"); assert.equal(b.od, d.od, "bukan angka = bawaan"); assert.equal(b.pump, d.pump, "kategori liar = bawaan");
  assert.equal(b.strategy, "backbone"); assert.equal(b.hasBooster, true); assert.equal(b.horizon, 1); assert.ok(!("liar" in b));
  assert.equal({}.x, undefined, "prototipe tidak tercemar"); assert.equal(Object.getPrototypeOf(b), Object.prototype);
  assert.deepEqual(S.bersihkan(null), d); assert.deepEqual(S.bersihkan([1, 2]), d);
});

test("bersihkan: blok sippa hanya angka sah, id harus kode besar, koridor bukan angka jadi 1, paling banyak 10 butir", () => {
  const b = S.bersihkan({sippa: {n_lance: 99, dalam_m: "3", koridor: "K1", pinjam: ["BOAT", "x y", 5, "TRUCK"], tambah: [{id: "LAN", q: 8, price: 4200000, why: "w", name: "Lance"}, {id: "bad id", q: 1, price: 1}, {id: "ZZ", q: -1, price: 1}, ...Array.from({length: 20}, (_, i) => ({id: "A" + i, q: 1, price: 1}))]}});
  assert.equal(b.sippa.n_lance, 24); assert.equal(b.sippa.dalam_m, 3); assert.equal(b.sippa.koridor, 1);
  assert.deepEqual(b.sippa.pinjam, ["BOAT", "TRUCK"]);
  assert.equal(b.sippa.tambah.length, 10); assert.equal(b.sippa.tambah[0].id, "LAN"); assert.ok(b.sippa.tambah.every(e => /^[A-Z0-9]{2,12}$/.test(e.id) && e.q > 0));
  assert.ok(!("sippa" in S.bersihkan({sippa: "x"})));
});

test("ubahNilai: strategi portable memasang layflat dan pompa bensin, lokasi terpencil memasang akses, strategi berganti membuang blok sippa", () => {
  const p = S.ubahNilai(E.defaultState(), "strategy", "portable");
  assert.equal(p.pipe, "layflat"); assert.equal(p.pump, "gas"); assert.equal(p.pumpCount, 2); assert.equal(p.networkLength, 800); assert.equal(p.crew, 8);
  const r = S.ubahNilai(E.defaultState(), "site", "remote"); assert.deepEqual([r.access, r.peatDepth, r.flood], ["remote", "deep", "high"]);
  const w = S.ubahNilai({...E.defaultState(), waterRights: "yes"}, "waterSource", "well"); assert.equal(w.waterRights, "pending");
  assert.ok(!("sippa" in S.ubahNilai(E.presetSippa("S0"), "strategy", "semi")));
  assert.ok("sippa" in S.ubahNilai(E.presetSippa("S0"), "flowLPM", 250), "mengubah debit tidak membuang blok sippa");
  assert.equal(S.ubahNilai(E.defaultState(), "hasBooster", "true").hasBooster, true);
  assert.equal(S.ubahNilai(E.defaultState(), "waterQ", "55").waterQ, 55);
});

test("stateAwal: S0 dan S0B berblok sippa, S1 sampai S3 sama dengan compare(defaultState)", () => {
  assert.ok(S.stateAwal("S0").sippa && S.stateAwal("S0B").sippa);
  const c = E.compare(E.defaultState());
  ["S1", "S2", "S3"].forEach((k, i) => assert.deepEqual(jsn(S.stateAwal(k)), jsn(c[i].s), k));
  assert.throws(() => S.stateAwal("S9"), /S9/);
});

/* ---------- manfaat dan keuangan ---------- */
test("manfaatTahunan: bawaan 0 di semua sumber, heli menunggu = null, irigasi nol tanpa tiga syarat, banjir hanya bila pompa banjir terpisah", () => {
  const h = E.assess(E.defaultState()), hb = E.assess(E.presetSippa("S0B"));
  const nol = S.manfaatTahunan(S.MANFAAT_BAWAAN, h);
  assert.deepEqual(nol, {dasar: 0, regu: 0, heli: null, banjir: 0, irigasi: 0});
  const aktif = {regu: {aktif: true, hari: 100, tarif: 3000000}, heli: {aktif: true, n: 10}, banjir: {aktif: true, jam: 200, tarif: 500000}, irigasi: {aktif: true, ha: 50, nilai: 2000000, syarat: [true, true, false]}};
  const a = S.manfaatTahunan(aktif, h), ab = S.manfaatTahunan(aktif, hb);
  assert.equal(a.regu, 3e8); assert.equal(a.heli, null, "harga heli belum ada, tidak pernah dikarang"); assert.equal(a.banjir, 0, "S2 tanpa pompa banjir"); assert.equal(a.irigasi, 0, "syarat ketiga tidak dicentang");
  assert.equal(ab.banjir, 1e8, "S0B memakai pompa banjir terpisah");
  assert.equal(S.manfaatTahunan({...aktif, irigasi: {...aktif.irigasi, syarat: [true, true, true]}}, h).irigasi, 1e8);
  assert.equal(S.manfaatTahunan({...S.MANFAAT_BAWAAN, regu: {aktif: false, hari: 100, tarif: 3e6}}, h).regu, 0, "sakelar mati = 0");
});

test("manfaatTahunan: manfaat terverifikasi isian (annualAvoidedLoss) menjadi dasar", () => {
  assert.equal(S.manfaatTahunan(S.MANFAAT_BAWAAN, E.assess({...E.defaultState(), annualAvoidedLoss: 7e8})).dasar, 7e8);
});

test("keuangan: manfaat 0 sama dengan fin mesin dan dengan SippaHitung.npv dan bcr (H 5, r 8%); BCR 0; null tetap null", () => {
  const f = E.assess(E.defaultState()).fin;
  const k = S.keuangan(f, 0);
  assert.ok(Math.abs(k.npv - f.npv) < 1e-6 * Math.abs(f.npv)); assert.equal(k.bcr, 0);
  const h = npvH({capex: f.capex, opex: f.opex, manfaat: 0, r: 0.08, H: 5});
  assert.ok(Math.abs(k.npv - h) < 1e-6 * Math.abs(h), `npv Studio ${k.npv} vs hitung.js ${h}`);
  const b = S.keuangan(f, 3e9); assert.ok(Math.abs(b.bcr - bcrH({capex: f.capex, opex: f.opex, manfaat: 3e9, r: 0.08, H: 5})) < 1e-9);
  assert.ok(b.npv > k.npv);
  assert.deepEqual(S.keuangan(f, null), {npv: null, bcr: null});
});

/* ---------- kolom dan matriks ---------- */
test("susunKolom: S0, S0B, S1, S2, S3 lalu tersimpan paling banyak 6, tiap kolom lewat gerbangSippa, S3 ditutup sampai G5", () => {
  const tersimpan = Array.from({length: 8}, (_, i) => ({id: String(i).padStart(16, "0"), nama: `Uji ${i}`, state: {waterQ: 20 + i}}));
  const k = S.susunKolom(E.defaultState(), tersimpan, KONST);
  assert.deepEqual(k.map(x => x.kode), ["S0", "S0B", "S1", "S2", "S3", "U1", "U2", "U3", "U4", "U5", "U6"], "enam tambahan, tidak lebih");
  assert.equal(k.find(x => x.kode === "S3").ditutup, true); assert.ok(!k.find(x => x.kode === "S2").ditutup);
  for (const c of k) assert.ok(c.hasil.hard && c.hasil.decision && c.hasil.fin, c.kode);
  assert.ok(k.find(x => x.kode === "S3").hasil.conditional.some(t => /G5/.test(t)), "S3 membawa catatan ditutup sampai G5");
  assert.equal(k[5].nama, "Uji 0"); assert.equal(k[5].asal, "tersimpan");
  assert.equal(S.susunKolom(E.defaultState(), [], KONST).length, 5);
});

test("susunKolom: keadaan berblok sippa tidak menularkan blok itu ke S1 sampai S3 (dasar jatuh ke bawaan)", () => {
  const k = S.susunKolom(E.presetSippa("S0"), [], KONST), d = S.susunKolom(E.defaultState(), [], KONST);
  for (const kode of ["S1", "S2", "S3"]) assert.equal(k.find(x => x.kode === kode).hasil.fin.capex, d.find(x => x.kode === kode).hasil.fin.capex, kode);
  assert.ok(k.find(x => x.kode === "S1").hasil.s.sippa === undefined);
});

test("barisMatriks: nilai terbaik hanya di antara kolom bukan NO-GO; kolom NO-GO tetap ada; semua NO-GO atau satu layak = tanpa sorotan", () => {
  const k = S.susunKolom(E.defaultState(), [], KONST), baris = S.barisMatriks(k);
  const capex = baris.find(r => r.k === "capex");
  assert.equal(capex.sel.length, k.length);
  const layak = k.map((c, i) => [c, i]).filter(([c]) => c.hasil.decision !== "NO-GO");
  assert.ok(layak.length >= 2, "uji butuh dua kolom layak");
  const min = Math.min(...layak.map(([c]) => c.hasil.fin.capex));
  capex.sel.forEach((x, i) => assert.equal(x.terbaik, k[i].hasil.decision !== "NO-GO" && k[i].hasil.fin.capex === min, `${k[i].kode} capex terbaik`));
  const tco = baris.find(r => r.k === "tco");
  assert.ok(tco.sel.every((x, i) => !(x.terbaik && k[i].hasil.decision === "NO-GO")), "NO-GO tidak pernah disorot");
  const semuaNoGo = k.map(c => ({...c, hasil: {...c.hasil, decision: "NO-GO"}}));
  assert.ok(S.barisMatriks(semuaNoGo).every(r => r.sel.every(x => !x.terbaik)));
  const satu = k.map((c, i) => i === 3 ? c : {...c, hasil: {...c.hasil, decision: "NO-GO"}});
  assert.ok(S.barisMatriks(satu).every(r => r.sel.every(x => !x.terbaik)), "satu kolom layak tidak dibandingkan dengan siapa pun");
});

test("barisMatriks: kolom NO-GO yang paling murah tidak disorot, kolom layak termurah yang disorot (penjaga per kolom, bukan guard jumlah)", () => {
  const k = S.susunKolom(E.defaultState(), [], KONST);
  const idx = 0, murahSekali = k.map((c, i) => i !== idx ? c : {...c, hasil: {...c.hasil, decision: "NO-GO", fin: {...c.hasil.fin, capex: 1, opex: 1, tco: 1}}});
  const layak = murahSekali.map((c, i) => [c, i]).filter(([c]) => c.hasil.decision !== "NO-GO");
  assert.ok(layak.length >= 2, "sisa kolom layak minimal dua");
  const baris = S.barisMatriks(murahSekali);
  for (const kunci of ["capex", "opex", "tco"]) {
    const r = baris.find(x => x.k === kunci), ambil = c => c.hasil.fin[kunci];
    assert.equal(r.sel[idx].terbaik, false, `${kunci}: kolom NO-GO termurah tidak boleh disorot`);
    const min = Math.min(...layak.map(([c]) => ambil(c)));
    const target = layak.filter(([c]) => ambil(c) === min).map(([, i]) => i);
    assert.ok(target.length >= 1 && r.sel.some(x => x.terbaik), `${kunci}: harus ada sorotan di kolom layak`);
    r.sel.forEach((x, i) => assert.equal(x.terbaik, target.includes(i), `${kunci} kolom ${murahSekali[i].kode}`));
  }
});

test("barisMatriks: baris sesuai PRD 9.5.3, heli menunggu tampil '–' berpil, manfaat 0, MC kosong sebelum pekerja menjawab", () => {
  const k = S.susunKolom(E.defaultState(), [], KONST), baris = S.barisMatriks(k), kunci = baris.map(r => r.k);
  for (const w of ["vonis", "hambatan", "capex", "opex", "tco", "tco_diskon", "impas", "npv0", "bcr0", "npv_regu", "npv_heli", "bcr_heli", "npv_banjir", "npv_irigasi", "mc", "tekanan", "daya", "jam_gelar", "waktu_siap", "risiko", "kesiapan", "co2", "biaya_ha_studio", "biaya_ha_kd"])
    assert.ok(kunci.includes(w), `baris ${w} tidak ada`);
  const heli = baris.find(r => r.k === "npv_heli"); assert.ok(heli.sel.every(x => x.teks === "–" && x.menunggu === true));
  assert.match(heli.sumber, /sippa\.heli\.biaya_jam/);
  const n0 = baris.find(r => r.k === "npv0"); assert.ok(n0.sel.every((x, i) => x.nilai === k[i].hasil.fin.npv), "manfaat 0 = npv mesin");
  assert.ok(baris.find(r => r.k === "mc").sel.every(x => x.teks === "–"));
  for (const r of baris) assert.ok(r.yakin && r.sumber, `baris ${r.k} tanpa pil keyakinan atau sumber`);
  assert.equal(baris.find(r => r.k === "npv_regu").yakin, "asumsi-kebijakan");
  const dgMc = k.map(c => ({...c, mc: E.drawRiskMC(c.hasil.s)}));
  const m = S.barisMatriks(dgMc).find(r => r.k === "mc");
  assert.ok(m.sel.every(x => /P10/.test(x.html) && /P50/.test(x.html) && /P90/.test(x.html)));
});

test("barisMatriks: label tahun dan diskonto mengikuti keadaan; biaya per ha KD memasukkan CAPEX teramortisasi, versi Studio OPEX saja (G09)", () => {
  const st = {...E.defaultState(), horizon: 7, discountRate: 10, verifiedHaAnnual: 100};
  const baris = S.barisMatriks(S.susunKolom(st, [], KONST));
  assert.match(baris.find(r => r.k === "tco").label, /7 tahun/); assert.match(baris.find(r => r.k === "tco_diskon").label, /10%/);
  const s2 = E.assess({...st, ...E.compare(st)[1].s}), idx = 3;
  const kol = S.susunKolom(st, [], KONST)[idx];
  assert.equal(baris.find(r => r.k === "biaya_ha_studio").sel[idx].nilai, kol.hasil.fin.opex / 100);
  const kd = baris.find(r => r.k === "biaya_ha_kd").sel[idx].nilai;
  assert.ok(kd > kol.hasil.fin.opex / 100, "KD lebih besar karena CAPEX teramortisasi ikut"); assert.ok(s2);
  const tanpa = S.barisMatriks(S.susunKolom(E.defaultState(), [], KONST));
  assert.ok(tanpa.find(r => r.k === "biaya_ha_kd").sel.every(x => x.teks === "–"), "tanpa luas padam terverifikasi = –");
});

test("rp: miliar dan juta dengan kata ditulis, koma desimal id-ID, negatif, kosong jadi –", () => {
  assert.equal(S.rp(5230476081), "Rp5,2 miliar"); assert.equal(S.rp(745246663), "Rp745,2 juta"); assert.equal(S.rp(1.2e12), "Rp1,2 triliun");
  assert.equal(S.rp(-3.19e9), "-Rp3,2 miliar"); assert.equal(S.rp(0), "Rp0"); assert.equal(S.rp(250000), "Rp250.000");
  assert.equal(S.rp(null), "–"); assert.equal(S.rp(NaN), "–");
});

/* ---------- impor, ekspor, simpan ---------- */
test("impor: berkas karhutla-decision-v1 lama (assumptions) dan ekspor SIPPA pulih; bukan JSON, bukan objek, dan lebih 32 KB ditolak dengan pesan", () => {
  const lama = JSON.stringify({version: "1.0", type: "Karhutla Decision Studio – screening, not construction", created: "2026-01-01T00:00:00Z", assumptions: {...E.defaultState(), strategy: "backbone", waterQ: 33}, outputs: {decision: "NO-GO"}, boq: []});
  const a = S.impor(lama); assert.equal(a.state.strategy, "backbone"); assert.equal(a.state.waterQ, 33); assert.equal(a.galat, undefined);
  const mentah = S.impor(JSON.stringify({...E.defaultState(), horizon: 9})); assert.equal(mentah.state.horizon, 9);
  assert.match(S.impor("{bukan json").galat, /bukan JSON/); assert.match(S.impor("[1,2]").galat, /objek/); assert.match(S.impor("null").galat, /objek/);
  const besar = S.impor(JSON.stringify({assumptions: {}, isi: "x".repeat(33000)})); assert.match(besar.galat, /32 KB/);
  assert.equal(S.impor("").galat !== undefined, true);
  assert.ok(!("outputs" in a.state) && !("boq" in a.state), "keluaran lama tidak ikut menjadi keadaan");
});

test("ekspor: format sippa-studio-1 memuat keadaan dan ringkasan; impor mengembalikan keadaan yang sama; BOQ ikut", () => {
  const st = {...E.defaultState(), waterQ: 41}, h = E.assess(st), j = S.ekspor(st, h, new Date("2026-10-26T00:00:00Z"));
  assert.equal(j.format, "sippa-studio-1"); assert.equal(j.dibuat, "2026-10-26T00:00:00.000Z"); assert.equal(j.keadaan.waterQ, 41);
  assert.equal(j.ringkas.vonis, h.decision); assert.ok(j.boq.length > 20);
  assert.deepEqual(S.impor(JSON.stringify(j)).state, S.bersihkan(st));
  assert.ok(JSON.stringify(j).length < 32768 * 4);
});

test("cekNama: 3 sampai 80 huruf setelah dirapikan; dua huruf dan 81 ditolak dengan batasnya", () => {
  assert.deepEqual(S.cekNama("  Kit relay Kapuas  "), {nama: "Kit relay Kapuas"});
  assert.match(S.cekNama("ab").galat, /3 sampai 80/); assert.match(S.cekNama("x".repeat(81)).galat, /3 sampai 80/); assert.match(S.cekNama("   ").galat, /3 sampai 80/);
  assert.deepEqual(S.cekNama("x".repeat(80)), {nama: "x".repeat(80)});
});

test("badanSimpan: nama, versi mesin, keadaan bersih dan ringkasan; keadaan melebihi 32 KB ditolak sebelum dikirim", () => {
  const st = S.stateAwal("S0"), b = S.badanSimpan("Kit uji", st, E.assess(st));
  assert.equal(b.nama, "Kit uji"); assert.equal(b.versi_mesin, "studio-1"); assert.equal(b.state.sippa.n_lance, 8);
  assert.ok(["NO-GO", "HOLD / VALIDASI", "KONDISIONAL"].includes(b.ringkas.vonis)); assert.equal(typeof b.ringkas.capex, "number");
  const besar = {...st, sippa: {...st.sippa, tambah: Array.from({length: 10}, (_, i) => ({id: "A" + i, q: 1, price: 1, why: "x".repeat(200), name: "y".repeat(80)}))}};
  assert.ok(JSON.stringify(S.badanSimpan("Aman", besar, E.assess(besar)).state).length < 32768);
});

/* ---------- matriks 100 dan CSV ---------- */
test("matriks100: satu baris per pilihan (100), pilihan aktif bertanda, selisih terhadap keadaan aktif nol untuk pilihan yang sama", () => {
  const st = E.defaultState(), m = S.matriks100(st, KONST);
  assert.equal(m.length, 100);
  const aktif = m.filter(r => r.aktif); assert.equal(aktif.length, 32 - 0, "tiap dimensi punya tepat satu pilihan aktif");
  assert.ok(aktif.every(r => r.dCapex === 0 && r.dTco === 0), "pilihan aktif: selisih nol");
  const strategi = m.filter(r => r.kunci === "strategy"); assert.equal(strategi.length, 3);
  assert.ok(strategi.every(r => ["NO-GO", "HOLD / VALIDASI", "KONDISIONAL"].includes(r.status)));
});

test("csv: BOQ berkepala enam kolom, titik koma, tanda kutip digandakan, BOM; matriks 100 = kepala + 100 baris", () => {
  const h = E.assess({...E.defaultState()}), c = S.boqCsv(h);
  assert.ok(c.startsWith("﻿\"ID\";\"Komponen\";\"Kuantitas\";\"Harga satuan Rp\";\"Jumlah Rp\";\"Dasar estimasi\""));
  assert.equal(c.split("\r\n").length, h.boq.length + 1);
  assert.match(S.csvBaris(['a"b', "c;d", 5]), /^"a""b";"c;d";"5"$/);
  const mc = S.matriksCsv(S.matriks100(E.defaultState(), KONST)); assert.equal(mc.split("\r\n").length, 101);
});

/* ---------- kepekaan ---------- */
test("kepekaan: enam variabel, diurut dari rentang TCO terbesar, sisi rendah tidak lebih kecil dari batas bawah isian", () => {
  const r = S.kepekaan(E.defaultState(), KONST);
  assert.deepEqual(r.map(x => x.k).sort(), ["elevation", "flowLPM", "networkLength", "od", "waterPerHa", "waterQ"].sort());
  const lebar = r.map(x => Math.abs(x.hi.tco - x.lo.tco)); assert.deepEqual([...lebar].sort((a, b) => b - a), lebar, "urut dari rentang terbesar");
  assert.ok(r.every(x => x.lo.nilai >= x.min && x.hi.nilai > x.lo.nilai));
});

/* ---------- HTML ---------- */
const nama = '<img src=x onerror=alert(1)>';
test("tabBandingkanHtml: tabel dan kartu HP dari satu sumber; teks data di-escape; kolom NO-GO tampil dengan alasan keras; S3 ditutup sampai G5; th scope", () => {
  const k = S.susunKolom(E.defaultState(), [{id: "a".repeat(16), nama, state: {waterQ: 5}}], KONST);
  const h = S.tabBandingkanHtml(S.barisMatriks(k), k);
  assert.ok(!h.includes(nama) && h.includes(esc(nama)), "nama skenario wajib di-escape");
  assert.match(h, /class="ad-tabel-wadah/); assert.match(h, /sp-tabel-studio/); assert.match(h, /sp-skenario/);
  assert.match(h, /<th scope="col"/); assert.match(h, /<th scope="row"/); assert.match(h, /ditutup sampai G5/);
  const noGo = k.filter(c => c.hasil.decision === "NO-GO"); assert.ok(noGo.length);
  for (const c of noGo) { assert.ok(h.includes(esc(c.hasil.hard[0])), `alasan keras ${c.kode} tampil`); }
  assert.match(h, /sp-kol-nogo/); assert.match(h, /sp-terbaik/); assert.match(h, /class="sr">terbaik/);
  assert.match(h, /Sumber: /); assert.match(h, /manfaat bawaan 0/i);
  assert.ok(!/GO"|>GO</.test(h.replace(/NO-GO/g, "")), "tidak ada vonis GO");
});

test("tab HTML: Ringkasan, Hidraulika, Biaya, Risiko, Simulasi, Matriks, Batas memuat sumber dan pil keyakinan; batas alat dari batas.js utuh", () => {
  const st = E.defaultState(), h = S.nilaiHasil(st, KONST), mc = E.drawRiskMC(h.s);
  const semua = {ringkasan: S.tabRingkasanHtml(h), hidraulika: S.tabHidraulikaHtml(h), biaya: S.tabBiayaHtml(h, ""), risiko: S.tabRisikoHtml(h),
    simulasi: S.tabSimulasiHtml(h, mc, S.kepekaan(st, KONST)), matriks: S.tabMatriksHtml(S.matriks100(st, KONST)), batas: S.tabBatasHtml()};
  for (const [k, t] of Object.entries(semua)) { assert.ok(t.length > 200, k); assert.match(t, /Sumber: /, `${k} tanpa sumber`); }
  for (const k of ["ringkasan", "hidraulika", "biaya", "risiko", "simulasi", "matriks"]) assert.match(semua[k], /sp-yakin estimasi-model/, `${k} tanpa pil estimasi-model`);
  for (const p of BATAS_ALAT) assert.ok(semua.batas.includes(esc(p)), `paragraf batas.js tidak tampil: ${p.slice(0, 40)}`);
  assert.match(semua.batas, /> Rp200 juta per sorti satu jam/); assert.match(semua.batas, /sippa\.heli\.biaya_jam/);
  assert.match(semua.simulasi, /800/); assert.match(semua.simulasi, /P10/); assert.match(semua.simulasi, /P90/);
  assert.match(semua.risiko, /NO-GO \/ STOP WORK|Hambatan keras/);
});

test("tabBiayaHtml: BOQ disaring dari kotak cari lewat nama dan dasar estimasi; hasil kosong berkalimat; teks di-escape", () => {
  const h = E.assess(E.defaultState()), penuh = S.tabBiayaHtml(h, ""), sedikit = S.tabBiayaHtml(h, "drone");
  assert.ok(sedikit.length < penuh.length); assert.match(sedikit, /Drone/);
  assert.match(S.tabBiayaHtml(h, "tidak-ada-komponen-ini"), /Tidak ada komponen/);
  assert.ok(!S.tabBiayaHtml(h, '<b>"').includes('<b>"'), "kata cari yang dicetak balik di-escape");
});

test("tabRisikoHtml: hambatan keras, bersyarat, catatan tampil dengan teks mesin dan gerbang SIPPA; tanpa hambatan = kalimat kosong", () => {
  const sm = S.nilaiHasil({...E.presetSippa("S0"), flowLPM: 900}, KONST), h = S.tabRisikoHtml(sm);
  assert.ok(sm.hard.some(t => /H-SERAP/.test(t))); assert.ok(h.includes(esc(sm.hard.find(t => /H-SERAP/.test(t)))));
  const bersih = {...sm, hard: [], conditional: [], soft: []};
  assert.match(S.tabRisikoHtml(bersih), /Tidak ada/);
});

test("kartu vonis: kelas dari keputusan mesin tanpa GO; tiga kata baku", () => {
  assert.equal(S.kelasVonis("NO-GO"), "nogo"); assert.equal(S.kelasVonis("HOLD / VALIDASI"), "hold"); assert.equal(S.kelasVonis("KONDISIONAL"), "kondisional");
  assert.throws(() => S.kelasVonis("GO"), /GO/);
});

/* ---------- Monte Carlo di pekerja ---------- */
function bukaPekerja() {
  const keluar = [], ctx = vm.createContext({console, Intl, Math, JSON, Number, Object, Array, Set, Error, String, Map});
  ctx.self = ctx; ctx.globalThis = ctx; ctx.location = {search: "?v=7"};
  ctx.importScripts = u => { ctx.diimpor = u; vm.runInContext(KODE_MESIN, ctx); };
  ctx.postMessage = m => keluar.push(m);
  vm.runInContext(baca("public/pipa/studio_pekerja.js"), ctx, {filename: "studio_pekerja.js"});
  return {ctx, keluar};
}

test("studio_pekerja: memuat mesin dengan versi dari URL pekerja dan menjawab Monte Carlo sama dengan drawRiskMC langsung, 800 sampel", () => {
  const {ctx, keluar} = bukaPekerja();
  assert.equal(ctx.diimpor, "/pipa/studio_mesin.js?v=7");
  const st = E.defaultState();
  ctx.onmessage({data: {id: 5, daftar: [{kode: "S2", state: st}]}});
  assert.equal(keluar.length, 1); assert.equal(keluar[0].id, 5);
  assert.deepEqual(jsn(keluar[0].hasil[0].mc), jsn(E.drawRiskMC(st))); assert.equal(keluar[0].hasil[0].mc.samples, 800); assert.equal(keluar[0].hasil[0].kode, "S2");
});

test("studio_pekerja: masukan buruk dijawab galat bernama, tidak mati diam; lebih 12 kolom ditolak", () => {
  const {ctx, keluar} = bukaPekerja();
  ctx.onmessage({data: {id: 1, daftar: "bukan larik"}}); ctx.onmessage({data: null}); ctx.onmessage({data: {id: 2, daftar: Array.from({length: 13}, (_, i) => ({kode: "U" + i, state: {}}))}});
  assert.equal(keluar.length, 3); assert.ok(keluar.every(m => typeof m.galat === "string" && m.galat.length > 5), JSON.stringify(keluar));
  assert.match(keluar[2].galat, /12/);
});

class PekerjaPalsu {
  constructor(url) { this.url = url; PekerjaPalsu.dibuat.push(this); }
  postMessage(m) { PekerjaPalsu.masuk.push(m); queueMicrotask(() => this.onmessage({data: {id: m.id, hasil: m.daftar.map(d => ({kode: d.kode, mc: E.drawRiskMC(d.state)}))}})); }
  terminate() { this.mati = true; }
}
PekerjaPalsu.dibuat = []; PekerjaPalsu.masuk = [];

test("buatMc: pekerja menjawab, hanya permintaan terbaru yang diterapkan (yang basi null), tutup mematikan pekerja", async () => {
  const mc = S.buatMc({Pekerja: PekerjaPalsu, url: "/pipa/studio_pekerja.js?v=1", mesin: () => E});
  assert.equal(mc.lambat, false); assert.equal(PekerjaPalsu.dibuat[0].url, "/pipa/studio_pekerja.js?v=1");
  const a = mc.hitung([{kode: "S2", state: E.defaultState()}]), b = mc.hitung([{kode: "S2", state: {...E.defaultState(), waterQ: 30}}]);
  assert.equal(await a, null, "permintaan lama dibuang"); const r = await b;
  assert.deepEqual(jsn(r.S2), jsn(E.drawRiskMC({...E.defaultState(), waterQ: 30})));
  mc.tutup(); assert.equal(PekerjaPalsu.dibuat[0].mati, true);
});

test("buatMc: tanpa Web Worker jatuh ke utas utama lewat tunda dengan lambat = true, hasil sama; pekerja galat juga jatuh ke utas utama", async () => {
  const tunda = f => f();
  const l = S.buatMc({Pekerja: undefined, mesin: () => E, tunda}); assert.equal(l.lambat, true);
  assert.deepEqual(jsn((await l.hitung([{kode: "S1", state: E.defaultState()}])).S1), jsn(E.drawRiskMC(E.defaultState())));
  class Rusak { constructor() { throw new Error("worker diblokir CSP"); } }
  const r = S.buatMc({Pekerja: Rusak, mesin: () => E, tunda}); assert.equal(r.lambat, true);
  class Galat { constructor() { queueMicrotask(() => this.onerror?.({message: "gagal"})); } postMessage() {} terminate() {} }
  const g = S.buatMc({Pekerja: Galat, mesin: () => E, tunda});
  const hasil = await g.hitung([{kode: "S1", state: E.defaultState()}]);
  assert.equal(g.lambat, true, "galat pekerja menandai lambat"); assert.ok(hasil.S1.samples === 800);
});

/* ---------- layar ---------- */
test("layar:studio: delapan tab berurutan, hanya Bandingkan semua dan Ringkasan di HP, nama layar baku, mesin gagal dimuat menyebut nama berkas", () => {
  assert.deepEqual(S.TAB.map(([, n]) => n), ["Bandingkan semua", "Ringkasan", "Hidraulika", "Biaya & BOQ", "Risiko & gerbang", "Simulasi & sensitivitas", "Matriks 100 pilihan", "Batas alat"]);
  assert.deepEqual(S.TAB_HP, ["bandingkan", "ringkasan"]);
  assert.equal(S.JUDUL, "Simulator keputusan");
  assert.match(S.pesanMesinGagal(), /studio_mesin\.js/);
  assert.match(S.PITA_HP, /dirancang untuk laptop/); assert.match(S.PITA_LAMBAT, /lambat di peramban ini/);
});

test("layar:studio: kontrol dibangun dari skema, 32 dimensi dan 36 parameter semuanya punya label dan teks bantuan, tanpa gaya sebaris", () => {
  const h = S.kontrolHtml(E.defaultState());
  assert.equal((h.match(/data-dim="/g) || []).length, 32); assert.equal((h.match(/data-num="/g) || []).length, 36);
  assert.equal((h.match(/<details/g) || []).length, 8); assert.ok(!/ style="/.test(h), "CSP style-src self: tanpa gaya sebaris");
  assert.match(h, /role="radiogroup"/); assert.match(h, /<select/); assert.match(h, /type="range"/); assert.match(h, /aria-valuetext="/);
  assert.match(h, /1\.500 m/, "aria-valuetext memuat nilai dan satuan id-ID");
  assert.match(h, /Kelebihan/); assert.match(h, /Kekurangan/);
  assert.ok(h.includes("Menunggu"), "slot harga heli menunggu tampil di blok manfaat");
});

test("layar:studio: blok kit SIPPA hanya untuk keadaan berblok sippa, kedalaman dibatasi KONST.dalam_maks_m", () => {
  assert.ok(!S.kontrolHtml(E.defaultState()).includes("data-sippa="));
  const h = S.kontrolHtml(E.presetSippa("S0")); assert.match(h, /data-sippa="n_lance"/); assert.match(h, /data-sippa="dalam_m"/);
  assert.match(h, new RegExp(`max="${KONST.dalam_maks_m}"`));
});

test("cekNumerik: koma desimal id-ID, di luar rentang ditolak dengan rentangnya, bukan angka ditolak", () => {
  const d = K.NUMERIK.find(n => n.key === "pumpEff");
  assert.deepEqual(S.cekNumerik(d, "0,7"), {nilai: 0.7});
  assert.match(S.cekNumerik(d, "0,95").galat, /0,35.*0,9/); assert.match(S.cekNumerik(d, "abc").galat, /angka/); assert.match(S.cekNumerik(d, "").galat, /diisi/);
  assert.deepEqual(S.cekNumerik(K.NUMERIK.find(n => n.key === "networkLength"), "1.250"), {nilai: 1250});
});

test("rincianKolomHtml: tiap baris ukuran kolom itu tampil, hambatan keras di-escape, kolom tanpa hambatan keras tanpa daftar", () => {
  const k = S.susunKolom(E.defaultState(), [{id: "b".repeat(16), nama, state: {waterQ: 5}}], KONST), baris = S.barisMatriks(k);
  const i = k.findIndex(c => c.kode === "U1"), h = S.rincianKolomHtml(baris, k, i);
  assert.equal((h.match(/<dt>/g) || []).length, baris.length, "satu dt per baris");
  assert.ok(h.includes(esc(k[i].hasil.hard[0])) && !h.includes(nama));
  const j = k.findIndex(c => c.hasil.hard.length === 0);
  if (j >= 0) assert.ok(!S.rincianKolomHtml(baris, k, j).includes("sp-daftar-risiko"), "tanpa hambatan keras tidak ada daftar hambatan");
});

test("studio: teks tampil layar bersih dari kata dan tanda terlarang (tanpa em dash, terbukti, GO, toFixed)", () => {
  const k = S.susunKolom(E.defaultState(), [], KONST);
  const semua = [S.tabBandingkanHtml(S.barisMatriks(k), k), S.tabBatasHtml(), S.kontrolHtml(E.presetSippa("S0B")), S.tabRisikoHtml(S.nilaiHasil(E.defaultState(), KONST))].join("\n");
  assert.doesNotMatch(semua, /[—·]/); assert.doesNotMatch(semua, /terbukti/i); assert.doesNotMatch(semua, /toFixed/); assert.doesNotMatch(semua, /titik api/i);
});
