/* SP-014: gerbang registri cakupan SIPPA (RU §7.3), tanpa basis data. Penemuan otomatis, bukan daftar tangan:
   fungsi SippaHitung, ekspor modul public/pipa/*.js, layar_*.js, dan scripts/data/sippa/*.py harus ada di
   tests/sippa/cakupan.json ('diuji' menunjuk nama uji yang nyata, atau 'dikecualikan' beralasan). */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync} from "node:fs";
import {join} from "node:path";

const AKAR = new URL("../../", import.meta.url).pathname;
const DIR_PIPA = join(AKAR, "public/pipa");
const DIR_UJI = join(AKAR, "tests/sippa");
const DIR_PY = join(AKAR, "scripts/data/sippa");
const BATAS_ANTRE = 0;          // = jumlah antre saat berkas dibuat; hanya boleh turun
const BATAS_LAYAR_BELUM = 0;   // semua layar LAYAR_SIPPA kini punya modul layar_*.js (27 Okt 2026); hanya boleh turun
const ls = (d, re) => existsSync(d) ? readdirSync(d).filter(n => re.test(n)).sort() : [];

/* ---------- penemuan ---------- */
export async function temukan() {
  const ada = new Set();
  const layar = [];
  // 1. fungsi SippaHitung (hitung.js adalah ES module: dimuat dengan import, yang mengisi globalThis.SippaHitung)
  if (existsSync(join(DIR_PIPA, "hitung.js"))) {
    await import(join(DIR_PIPA, "hitung.js"));
    for (const [k, v] of Object.entries(globalThis.SippaHitung || {})) if (typeof v === "function") ada.add(`SippaHitung.${k}`);
  }
  // 3. ekspor dan globalThis.<X> = pada modul lain
  for (const n of ls(DIR_PIPA, /\.js$/)) {
    if (n === "hitung.js") continue;
    const dasar = n.replace(/\.js$/, "");
    if (n === "ikon.js") { ada.add("ikon.js"); continue; }   // sprite: dicatat per berkas, bukan per ekspor
    const t = readFileSync(join(DIR_PIPA, n), "utf8");
    const nama = [...t.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    for (const m of t.matchAll(/^globalThis\.([A-Za-z_$][\w$]*)\s*=/gm)) nama.push(m[1]);
    for (const x of nama) ada.add(`${dasar}.${x}`);
    if (!nama.length) ada.add(n);   // modul tanpa ekspor tetap harus dijelaskan
    // 4. layar
    const lay = /^layar_(.+)\.js$/.exec(n);
    if (lay) { ada.add(`layar:${lay[1]}`); layar.push(lay[1]); }
    else if (n === "lapangan.js") { ada.add("layar:lapangan"); }
  }
  // 5. skrip Python
  const py = {};
  for (const n of ls(DIR_PY, /\.py$/)) {
    ada.add(`py:${n}`);
    const t = readFileSync(join(DIR_PY, n), "utf8");
    py[n] = /def uji\(/.test(t) && /["']uji["']/.test(t);
  }
  return {ada, layar, py};
}

const sumberUji = () => ls(DIR_UJI, /\.test\.mjs$/).flatMap(n => readFileSync(join(DIR_UJI, n), "utf8").split("\n"))
  .filter(l => /^\s*(?:test|uji)\(\s*[`'"]/.test(l));

/* ---------- pemeriksa murni: mengembalikan {asersi: pesan[]} supaya bisa diuji penolakannya ---------- */
export function periksa(reg, temuan, barisUji, opsi = {}) {
  const batasAntre = opsi.batasAntre ?? BATAS_ANTRE;
  const diuji = reg.diuji || {}, kecuali = reg.dikecualikan || {}, antre = reg.antre || {};
  const g = {};
  const belum = [...temuan.ada].filter(k => !(k in diuji) && !(k in kecuali) && !(k in antre)).sort();
  g.terdaftar = belum.length ? [`${belum.length} hal SIPPA belum punya uji atau alasan: ${belum.join(", ")}; tambahkan ke tests/sippa/cakupan.json`] : [];
  g.yatim = [];
  for (const [k, v] of Object.entries(diuji)) {
    const py = /^uji:(.+)$/.exec(v);
    if (py) { if (temuan.py[`${py[1]}.py`] !== true) g.yatim.push(`entri yatim: ${k} -> "${v}": scripts/data/sippa/${py[1]}.py tidak punya def uji( dan cabang argumen uji`); }
    else if (!barisUji.some(l => l.includes(v))) g.yatim.push(`entri yatim: ${k} -> "${v}" tidak ditemukan di tests/sippa`);
  }
  g.alasan = [];
  for (const [k, v] of Object.entries(kecuali)) {
    if (/^layar_.+\.js$/.test(k)) g.alasan.push(`pengecualian per berkas ditolak: ${k}; catat per handler (INP.md)`);
    if (String(v).replace(/[^\p{L}]/gu, "").length < 15) g.alasan.push(`alasan pengecualian ${k} kurang dari 15 huruf: "${v}"`);
  }
  const nAntre = Object.keys(antre).length;
  g.antre = nAntre > batasAntre ? [`antre ${nAntre} > batas ${batasAntre}: utang uji hanya boleh menyusut`] : [];
  g.basi = [...Object.keys(diuji), ...Object.keys(kecuali), ...Object.keys(antre)].filter(k => !temuan.ada.has(k)).sort()
    .map(k => `kunci basi: ${k}; hapus dari cakupan.json`);
  g.layar = [];
  for (const l of temuan.layar) if (!(opsi.LAYAR || []).includes(l)) g.layar.push(`modul layar_${l}.js tanpa layar "${l}" di LAYAR_SIPPA`);
  const tanpaModul = (opsi.LAYAR || []).filter(l => !temuan.layar.includes(l));
  if (opsi.LAYAR && tanpaModul.length > (opsi.batasLayarBelum ?? BATAS_LAYAR_BELUM)) g.layar.push(`${tanpaModul.length} layar tanpa modul > batas ${opsi.batasLayarBelum ?? BATAS_LAYAR_BELUM}: ${tanpaModul.join(", ")}`);
  return g;
}

const reg = JSON.parse(readFileSync(join(DIR_UJI, "cakupan.json"), "utf8"));
const temuan = await temukan();
const {LAYAR} = await import(join(DIR_PIPA, "app.js"));
const nyata = periksa(reg, temuan, sumberUji(), {LAYAR});
const gagal = k => assert.deepEqual(nyata[k], [], nyata[k].join("\n"));

test("cakupan SIPPA: tiap hal yang ditemukan ada di diuji, dikecualikan, atau antre", () => gagal("terdaftar"));
test("cakupan SIPPA: tiap nilai diuji menunjuk nama uji yang benar-benar ada", () => gagal("yatim"));
test("cakupan SIPPA: pengecualian beralasan, per fungsi atau handler, tidak per berkas layar", () => gagal("alasan"));
test("cakupan SIPPA: antre tidak melebihi BATAS_ANTRE (hanya menyusut)", () => gagal("antre"));
test("cakupan SIPPA: tidak ada kunci basi di registri", () => gagal("basi"));
test("cakupan SIPPA: tiap modul layar_*.js punya layar di LAYAR_SIPPA; layar tanpa modul tidak bertambah", () => gagal("layar"));

test("cakupan SIPPA: penemuan benar-benar menemukan hitung.js, layar_log.js, formulir, dan keadaan (bukan daftar kosong)", () => {
  for (const k of ["SippaHitung.zona", "layar:log", "formulir.cekButir", "keadaan.galat", "app.cocokkanJalur", "ikon.js"])
    assert.ok(temuan.ada.has(k), `penemuan tidak melihat ${k}; ${temuan.ada.size} hal ditemukan`);
});

/* ---------- uji penolakan gerbang sendiri (gerbang yang tidak pernah bisa merah tidak dihitung) ---------- */
const salin = () => structuredClone(reg);
const baris = sumberUji();

test("penolakan: registri tanpa satu entri dilaporkan belum terdaftar, menyebut nama dan angkanya", () => {
  const r = salin(); delete r.diuji["SippaHitung.zona"];
  const g = periksa(r, temuan, baris, {LAYAR});
  assert.equal(g.terdaftar.length, 1);
  assert.match(g.terdaftar[0], /^1 hal SIPPA belum punya uji atau alasan: SippaHitung\.zona;/);
});

test("penolakan: entri yang menunjuk nama uji tidak ada dilaporkan yatim; skrip Python tanpa uji( juga", () => {
  const r = salin(); r.diuji["SippaHitung.zona"] = "uji yang tidak pernah ditulis siapa pun"; r.diuji["app.LAYAR"] = "uji:tidak_ada";
  const g = periksa(r, temuan, baris, {LAYAR});
  assert.equal(g.yatim.length, 2);
  assert.match(g.yatim[0], /entri yatim: SippaHitung\.zona -> .* tidak ditemukan di tests\/sippa/);
  assert.match(g.yatim[1], /tidak_ada\.py tidak punya def uji\(/);
});

test("penolakan: alasan pendek dan pengecualian per berkas layar ditolak", () => {
  const r = salin(); r.dikecualikan["ikon.js"] = "singkat"; r.dikecualikan["layar_log.js"] = "perakit DOM, diperiksa di peramban preview";
  const g = periksa(r, temuan, baris, {LAYAR});
  assert.ok(g.alasan.some(p => /kurang dari 15 huruf/.test(p)), "alasan pendek lolos");
  assert.ok(g.alasan.some(p => /pengecualian per berkas ditolak: layar_log\.js/.test(p)), "pengecualian per berkas layar lolos");
});

test("penolakan: antre melebihi batas dilaporkan dengan angkanya", () => {
  const r = salin(); r.antre = {"SippaHitung.zona": "belum"};
  assert.deepEqual(periksa(r, temuan, baris, {LAYAR, batasAntre: 0}).antre, ["antre 1 > batas 0: utang uji hanya boleh menyusut"]);
  assert.equal(periksa(r, temuan, baris, {LAYAR, batasAntre: 1}).antre.length, 0);
});

test("penolakan: kunci yang sudah tidak ada di kode dilaporkan basi", () => {
  const r = salin(); r.diuji["SippaHitung.lama"] = "log minimal sah diterima";
  assert.deepEqual(periksa(r, temuan, baris, {LAYAR}).basi, ["kunci basi: SippaHitung.lama; hapus dari cakupan.json"]);
});

test("penolakan: modul layar tanpa layar terdaftar, dan layar tanpa modul melewati batas, dilaporkan", () => {
  assert.match(periksa(reg, {...temuan, layar: [...temuan.layar, "hantu"]}, baris, {LAYAR}).layar[0], /layar_hantu\.js tanpa layar "hantu"/);
  assert.match(periksa(reg, {...temuan, layar: []}, baris, {LAYAR, batasLayarBelum: 11}).layar[0], /^16 layar tanpa modul > batas 11/);
});

test("penolakan: BATAS_ANTRE tidak naik di atas jumlah antre registri saat ini", () => {
  assert.ok(BATAS_ANTRE <= Object.keys(reg.antre || {}).length || BATAS_ANTRE === 0, `BATAS_ANTRE ${BATAS_ANTRE} tidak boleh dinaikkan`);
});
