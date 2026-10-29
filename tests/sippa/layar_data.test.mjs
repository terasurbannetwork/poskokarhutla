/* SP-031: logika murni layar Data dan metode /pipa/data (PRD §9.4.8, DS §3.5 §4.13): daftar dataset, rumus, gerbang, batas alat dari batas.js,
   dan penjelasan beda angka mesin Studio lawan hidraulika() (DT §5.7). Pembangun HTML tanpa DOM. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");

const D = await import("../../public/pipa/layar_data.js");
const {BATAS_ALAT} = await import("../../public/pipa/batas.js");
const {hidraulika, gerbangHidraulika} = await import("../../public/pipa/hitung.js");
const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("TAB: empat tab berurutan Dataset, Rumus, Gerbang, Batas pemakaian alat (DS §4.13)", () => {
  assert.deepEqual(D.TAB.map(([k]) => k), ["dataset", "rumus", "gerbang", "batas"]);
  assert.deepEqual(D.TAB.map(([, n]) => n), ["Dataset", "Rumus", "Gerbang", "Batas pemakaian alat"]);
});

/* ---------- batas alat: satu sumber dengan Lampiran L ---------- */
test("tabBatasHtml: tiap paragraf BATAS_ALAT tampil utuh dan berurutan, tidak ada salinan teks di layar_data.js", () => {
  const h = D.tabBatasHtml();
  const urut = BATAS_ALAT.map(p => h.indexOf(esc(p)));
  assert.ok(urut.every(i => i >= 0), `paragraf tidak tampil: ${urut.join(",")}`);
  assert.deepEqual([...urut].sort((a, b) => a - b), urut, "urutan paragraf harus sama dengan batas.js");
  const sumber = baca("public/pipa/layar_data.js");
  for (const p of BATAS_ALAT) assert.ok(!sumber.includes(p.slice(0, 40)), `teks batas.js disalin ke layar_data.js: "${p.slice(0, 40)}"`);
  assert.match(h, /Lampiran L/);
});

/* ---------- beda mesin Studio lawan hidraulika ---------- */
test("BEDA_MESIN: angka kalkulator pada kasus OD160 SDR11 2.000 L/min 2 km dicocokkan ke hidraulika() sungguhan (12,5 bar tanpa hisap, 12,8 bar dengan hisap), mesin 12,2 bar", () => {
  const dasar = {bahan: "hdpe", od_mm: 160, sdr: 11, q_lpm: 2000, L_m: 2000, dz_m: 10, K: 5, sisa_bar: 2, C: 130, suhu_c: 35, n_lance: 0, serap_lain_lpm: 2000};
  const tanpa = hidraulika({...dasar, hisap: false}), dengan = hidraulika({...dasar, hisap: true});
  assert.equal(D.BEDA_MESIN.kalkulator.tanpa_hisap, fmt(tanpa.p_pompa_bar)); assert.equal(D.BEDA_MESIN.kalkulator.tanpa_hisap, "12,5");
  assert.equal(D.BEDA_MESIN.kalkulator.dengan_hisap, fmt(dengan.p_pompa_bar)); assert.equal(D.BEDA_MESIN.kalkulator.dengan_hisap, "12,8");
  assert.equal(D.BEDA_MESIN.mesin.tekanan, "12,2");
  assert.equal(tanpa.vonis, "NO-GO"); assert.equal(dengan.vonis, "NO-GO");
  assert.equal(D.BEDA_MESIN.vonis, "NO-GO");
});

test("tabBatasHtml: beda angka mesin dan kalkulator dijelaskan dengan sebab (C 135, tanpa hisap 3,5 m), sumber, dan pil estimasi-model", () => {
  const h = D.tabBatasHtml();
  assert.match(h, /12,2 bar/); assert.match(h, /12,5 bar/); assert.match(h, /12,8 bar/);
  assert.match(h, /C 135/); assert.match(h, /C 130/); assert.match(h, /3,5 m/);
  assert.match(h, /sp-yakin estimasi-model/); assert.match(h, /Sumber:/); assert.match(h, /keputusan 34/);
});

/* ---------- gerbang ---------- */
test("GERBANG: tiap kode yang bisa dikeluarkan hitung.js ada di tabel, tiap baris punya tingkat sah, syarat, dan pesan", () => {
  const sumber = baca("public/pipa/hitung.js"), kode = new Set([...sumber.matchAll(/tambah\("(H-[A-Z0-9]+)"/g)].map(m => m[1]));
  assert.ok(kode.size >= 10, `hitung.js hanya memuat ${kode.size} kode gerbang`);
  const tabel = new Set(D.GERBANG.map(g => g.kode));
  for (const k of kode) assert.ok(tabel.has(k), `gerbang ${k} ada di hitung.js tetapi tidak di tabel layar Data`);
  for (const g of D.GERBANG) { assert.ok(["keras", "syarat", "catatan"].includes(g.tingkat), g.kode); assert.ok(g.syarat.length > 10 && g.pesan.length > 10, `${g.kode} tanpa syarat atau pesan`); }
});

test("GERBANG: tingkat di tabel sama dengan tingkat yang dikeluarkan hitung.js untuk kasus pemicunya (tabel tidak berbohong)", () => {
  const dasar = {bahan: "hdpe", od_mm: 160, sdr: 11, q_lpm: 2000, L_m: 2000, dz_m: 10, K: 5, sisa_bar: 2, C: 130, suhu_c: 35, n_lance: 0, serap_lain_lpm: 2000};
  const tingkat = new Proxy({}, {get: (_, kode) => D.GERBANG.filter(g => g.kode === kode).map(g => g.tingkat)});   // satu kode boleh dua tingkat (H-AIR)
  const sama = (g, pesan) => assert.ok(tingkat[g.kode].includes(g.tingkat), pesan ?? `${g.kode}: tabel ${tingkat[g.kode]}, hitung.js ${g.tingkat}`);
  const h = hidraulika(dasar);
  for (const g of h.gerbang) sama(g);
  const serap = hidraulika({...dasar, q_lpm: 600, L_m: 100, od_mm: 200, n_lance: 8, serap_lain_lpm: 0});
  assert.ok(serap.gerbang.some(g => g.kode === "H-SERAP"));
  for (const g of serap.gerbang) sama(g);
  assert.equal(gerbangHidraulika(dasar, h).length, h.gerbang.length);
});

test("tabGerbangHtml: kode, syarat, pil tingkat dan pesan layar; tidak pernah menulis GO sebagai vonis; teks di-escape", () => {
  const h = D.tabGerbangHtml();
  for (const g of D.GERBANG) assert.match(h, new RegExp(`>${g.kode}<`));
  assert.match(h, /sp-gerbang keras/); assert.match(h, /sp-gerbang syarat/); assert.match(h, /sp-gerbang catatan/);
  assert.match(h, /data-label="Pesan layar"/);
  assert.doesNotMatch(h, /(?<![-\w])GO\b/, "kata GO sebagai vonis");
});

/* ---------- rumus ---------- */
test("RUMUS: fungsi PRD §9.3 yang diekspor SippaHitung semuanya dijelaskan; nama fungsi tidak ada yang yatim", async () => {
  await import("../../public/pipa/hitung.js");
  const publik = Object.entries(globalThis.SippaHitung).filter(([, v]) => typeof v === "function").map(([k]) => k);
  const ada = new Set(D.RUMUS.map(r => r.fungsi.replace(/\(.*$/, "")));
  /* fungsi pembantu tanpa rumus tersendiri tidak wajib dijelaskan di sini */
  const PEMBANTU = new Set(["pesanGerbang", "periksaMasukan", "durasiLog", "vonisPilot", "af", "uangTahunan", "kuantil", "nKecil", "cekRH", "batasi", "tampil"]);
  const tanpa = publik.filter(f => !ada.has(f) && !PEMBANTU.has(f));
  assert.deepEqual(tanpa, [], `fungsi tanpa baris rumus di layar Data: ${tanpa.join(", ")}`);
  for (const r of D.RUMUS) assert.ok(r.rumus.length > 5 && r.satuan.length > 0, `${r.fungsi} tanpa rumus atau satuan`);
});

test("tabRumusHtml: rumus dalam .sp-rumus (monospace), satuan di kolom sendiri, teks di-escape", () => {
  const h = D.tabRumusHtml();
  assert.match(h, /<code class="sp-rumus">/); assert.match(h, /data-label="Satuan"/);
  assert.doesNotMatch(D.tabRumusHtml(), /<script|onerror=/i);
});

/* ---------- dataset ---------- */
test("DATASET: tiap baris punya nama, berkas, sumber dan lisensi, keyakinan dari tujuh kunci sah; tidak ada angka tanpa sumber", () => {
  const SAH = ["resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan", "hipotesis", "menunggu", "penilaian-pakar"];
  assert.ok(D.DATASET.length >= 20, `hanya ${D.DATASET.length} dataset`);
  for (const d of D.DATASET) {
    assert.ok(d.nama && d.berkas && d.sumber, `dataset tanpa nama, berkas, atau sumber: ${JSON.stringify(d)}`);
    assert.ok(SAH.includes(d.keyakinan), `${d.nama}: keyakinan "${d.keyakinan}" di luar kosakata`);
  }
});

test("DATASET: keluaran pipeline SIPPA (zona, pemicu, kit_nasional, kelayakan, sel22) terdaftar dengan kunci data bersesi", () => {
  const kunci = D.DATASET.map(d => d.kunci).filter(Boolean);
  for (const k of ["zona", "pemicu", "kit_nasional", "kelayakan_kompleks", "sel22"]) assert.ok(kunci.includes(k), `kunci ${k} tidak terdaftar`);
});

test("tarikDari: tanggal tarik per berkas dibaca dari sumber[] JSON turunan; berkas tidak ada = tanda hubung", () => {
  const z = JSON.parse(baca("data/sippa/keluaran/zona.json"));
  const t = D.tarikDari([z]);
  assert.equal(t["kendala.json"], "2026-10-25"); assert.equal(t["Copernicus DEM GLO-30"], "2026-10-24");
  assert.deepEqual(D.tarikDari([]), {}); assert.deepEqual(D.tarikDari([{}, null]), {});
});

test("tabDatasetHtml: kolom DS §4.13, data-label tiap sel, pil keyakinan, tanggal tarik dari JSON; nama dengan markup di-escape", () => {
  const h = D.tabDatasetHtml({"kendala.json": "2026-10-25"});
  for (const k of ["Nama", "Berkas", "Sumber dan lisensi", "Ditarik", "Penyegaran", "Keterbatasan", "Keyakinan"]) assert.match(h, new RegExp(`data-label="${k}"`));
  assert.match(h, /sp-yakin terverifikasi/); assert.match(h, /<caption class="sr">/);
  assert.match(h, /25 Okt 2026/);
  const x = D.tabDatasetHtml({}, [{nama: "<script>x</script>", berkas: "a", sumber: "b", keyakinan: "resmi", status: "ada"}]);
  assert.doesNotMatch(x, /<script>/);
});

test("tabDatasetHtml: dataset yang belum ada ditandai menunggu atau harus diminta, bukan keyakinan palsu", () => {
  const h = D.tabDatasetHtml({});
  assert.match(h, /harus diminta/); assert.match(h, /sp-yakin menunggu/);
});

/* ---------- kerangka ---------- */
test("tidak ada em dash, titik tengah, kata terbukti, atau toFixed di teks layar Data (DS §6)", () => {
  const t = baca("public/pipa/layar_data.js");
  assert.doesNotMatch(t, /[—·]|terbukti|toFixed\(/i);
  for (const f of [D.tabDatasetHtml({}), D.tabRumusHtml(), D.tabGerbangHtml(), D.tabBatasHtml()]) assert.doesNotMatch(f, /[—·]|terbukti/i);
});

test("tabPanel: tab menjadi tablist ARIA dengan panah kiri dan kanan; tab aktif aria-selected", () => {
  const h = D.kerangkaTab("rumus");
  assert.match(h, /role="tablist"/); assert.equal((h.match(/role="tab"/g) || []).length, 4);
  assert.match(h, /data-tab="rumus"[^>]*aria-selected="true"/); assert.match(h, /data-tab="dataset"[^>]*aria-selected="false"/);
  assert.match(h, /role="tabpanel"/);
});

test("D.tabDari: parameter ?tab= liar jatuh ke Dataset", () => {
  assert.equal(D.tabDari("rumus"), "rumus"); assert.equal(D.tabDari("<x>"), "dataset"); assert.equal(D.tabDari(null), "dataset");
});
