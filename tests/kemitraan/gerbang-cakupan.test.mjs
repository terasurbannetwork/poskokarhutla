/* KM-A11: gerbang registri cakupan Kemitraan (RU §1, TEST.md), tanpa basis data. Penemuan otomatis, bukan daftar tangan:
   ekspor public/kemitraan/hitung.js, ekspor src/kemitraan_hitung.js, scripts/kemitraan/*.py, tiap modul
   public/kemitraan/*.js (tampilan, inti, konst), dan tiap src/kemitraan*.js (rute) harus ada di
   tests/kemitraan/cakupan.json: 'diuji' (nama uji nyata, atau 'uji:<skrip>' untuk self-check --cek),
   'dikecualikan' (alasan >= 15 huruf), atau 'antre' (utang; hanya boleh menyusut, BATAS_ANTRE).
   Berkas yang belum ada dilewati tanpa galat; begitu muncul, wajib tercatat. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const AKAR = new URL("../../", import.meta.url).pathname;
const BATAS_ANTRE = 0; // = jumlah antre saat berkas dibuat; hanya boleh turun
const ls = (d, re) => existsSync(d) ? readdirSync(d).filter((n) => re.test(n)).sort() : [];
const baca = (p) => readFileSync(join(AKAR, p), "utf8");

/* nama ekspor sebuah modul JS: ES export, exports.X =, module.exports.X =, module.exports = {a, b: 1} */
export function namaEkspor(t) {
  const n = new Set();
  for (const m of t.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) n.add(m[1]);
  for (const m of t.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const x of m[1].split(",")) { const s = x.trim().split(/\s+as\s+/).pop(); if (s) n.add(s); }
  for (const m of t.matchAll(/\b(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/g)) n.add(m[1]);
  for (const m of t.matchAll(/module\.exports\s*=\s*\{([^}]*)\}/g)) {
    for (const x of m[1].split(",")) { const k = /^\s*([A-Za-z_$][\w$]*)/.exec(x); if (k) n.add(k[1]); }
  }
  return [...n];
}

export function temukan() {
  const ada = new Set(), py = {};
  for (const [berkas, awalan] of [["public/kemitraan/hitung.js", "hitung"], ["src/kemitraan_hitung.js", "kemitraan_hitung"]]) {
    if (!existsSync(join(AKAR, berkas))) continue;
    const t = baca(berkas), nama = namaEkspor(t);
    for (const x of nama) ada.add(`${awalan}.${x}`);
    if (!nama.length) ada.add(`${awalan}.js`); // modul tanpa ekspor terbaca tetap harus dijelaskan
  }
  for (const n of ls(join(AKAR, "public/kemitraan"), /\.js$/)) if (n !== "hitung.js") ada.add(`js:${n}`);
  for (const n of ls(join(AKAR, "src"), /^kemitraan.*\.js$/)) if (n !== "kemitraan_hitung.js") ada.add(`src:${n}`);
  for (const n of ls(join(AKAR, "scripts/kemitraan"), /\.py$/)) {
    ada.add(`py:${n}`);
    const t = baca(`scripts/kemitraan/${n}`);
    py[n] = /def cek\(/.test(t) && /["']--cek["']/.test(t);
  }
  return { ada, py };
}

const BERKAS_UJI = () => [
  ...ls(join(AKAR, "tests/kemitraan"), /\.test\.mjs$/).map((n) => `tests/kemitraan/${n}`),
  ...ls(join(AKAR, "tests/warga"), /^kemitraan_.*\.test\.mjs$/).map((n) => `tests/warga/${n}`),
  ...ls(join(AKAR, "tests/bnpb"), /^kemitraan_.*\.test\.mjs$/).map((n) => `tests/bnpb/${n}`),
];
const sumberUji = () => BERKAS_UJI().flatMap((p) => baca(p).split("\n")).filter((l) => /^\s*(?:test|uji|it)\(\s*[`'"]/.test(l));

/* ---------- pemeriksa murni: {asersi: pesan[]} supaya penolakannya bisa diuji ---------- */
export function periksa(reg, temuan, barisUji, opsi = {}) {
  const batas = opsi.batasAntre ?? BATAS_ANTRE;
  const diuji = reg.diuji || {}, kecuali = reg.dikecualikan || {}, antre = reg.antre || {};
  const g = {};
  const belum = [...temuan.ada].filter((k) => !(k in diuji) && !(k in kecuali) && !(k in antre)).sort();
  g.terdaftar = belum.length ? [`${belum.length} hal Kemitraan belum punya uji atau alasan: ${belum.join(", ")}; tambahkan ke tests/kemitraan/cakupan.json (diuji / dikecualikan beralasan)`] : [];
  g.yatim = [];
  for (const [k, v] of Object.entries(diuji)) {
    const py = /^uji:(.+)$/.exec(v);
    if (py) { if (temuan.py[`${py[1]}.py`] !== true) g.yatim.push(`entri yatim: ${k} -> "${v}": scripts/kemitraan/${py[1]}.py tidak punya def cek( dan cabang --cek`); }
    else if (!barisUji.some((l) => l.includes(v))) g.yatim.push(`entri yatim: ${k} -> "${v}" tidak ditemukan di nama uji tests/kemitraan, tests/warga/kemitraan_*, tests/bnpb/kemitraan_*`);
  }
  g.alasan = [];
  for (const [k, v] of Object.entries(kecuali)) {
    if (String(v).replace(/[^\p{L}]/gu, "").length < 15) g.alasan.push(`alasan pengecualian ${k} kurang dari 15 huruf: "${v}"`);
  }
  const n = Object.keys(antre).length;
  g.antre = n > batas ? [`antre ${n} > batas ${batas}: utang uji hanya boleh menyusut`] : [];
  g.basi = [...Object.keys(diuji), ...Object.keys(kecuali), ...Object.keys(antre)].filter((k) => !temuan.ada.has(k)).sort()
    .map((k) => `kunci basi: ${k}; hapus dari cakupan.json`);
  g.ganda = Object.keys(diuji).filter((k) => k in kecuali || k in antre).concat(Object.keys(kecuali).filter((k) => k in antre))
    .map((k) => `kunci ganda di dua daftar: ${k}`);
  return g;
}

const reg = JSON.parse(readFileSync(join(AKAR, "tests/kemitraan/cakupan.json"), "utf8"));
const temuan = temukan();
const nyata = periksa(reg, temuan, sumberUji());
const gagal = (k) => assert.deepEqual(nyata[k], [], nyata[k].join("\n"));

test("cakupan KM: tiap hal yang ditemukan ada di diuji, dikecualikan, atau antre", () => gagal("terdaftar"));
test("cakupan KM: tiap nilai diuji menunjuk nama uji atau self-check --cek yang benar-benar ada", () => gagal("yatim"));
test("cakupan KM: pengecualian beralasan >= 15 huruf", () => gagal("alasan"));
test("cakupan KM: antre tidak melebihi BATAS_ANTRE (hanya menyusut)", () => gagal("antre"));
test("cakupan KM: tidak ada kunci basi di registri", () => gagal("basi"));
test("cakupan KM: tidak ada kunci di dua daftar sekaligus", () => gagal("ganda"));

test("cakupan KM: penemuan benar-benar menemukan konst, kode, dan konst.js (bukan daftar kosong)", () => {
  for (const k of ["py:konst.py", "py:kode.py", "js:konst.js"])
    assert.ok(temuan.ada.has(k), `penemuan tidak melihat ${k}; ${temuan.ada.size} hal ditemukan`);
});

test("cakupan KM: penemu ekspor mengenali ES export, exports.X, dan module.exports = {..}", () => {
  assert.deepEqual(namaEkspor("export function a(){}\nexport const b = 1;\nexport { c, d as e };").sort(), ["a", "b", "c", "e"]);
  assert.deepEqual(namaEkspor("exports.x = 1; module.exports.y = 2;\nmodule.exports = { z, w: 1 };").sort(), ["w", "x", "y", "z"]);
});

/* ---------- penolakan gerbang sendiri ---------- */
const salin = () => structuredClone(reg);
const baris = sumberUji();
const bayangan = { ada: new Set([...temuan.ada, "hitung.skor", "py:profil_daerah.py", "src:kemitraan.js"]), py: { ...temuan.py } };

// registri tanpa ketiga kunci itu: uji tetap bermakna setelah berkasnya sungguh ada dan terdaftar
const tanpaTiga = () => {
  const r = salin();
  for (const k of ["hitung.skor", "py:profil_daerah.py", "src:kemitraan.js"])
    for (const daftar of ["diuji", "dikecualikan", "antre"]) delete r[daftar]?.[k];
  return r;
};

test("penolakan: berkas atau ekspor baru yang tidak dicatat dilaporkan, menyebut nama dan angkanya", () => {
  const g = periksa(tanpaTiga(), bayangan, baris);
  assert.equal(g.terdaftar.length, 1);
  assert.match(g.terdaftar[0], /^3 hal Kemitraan belum punya uji atau alasan: hitung\.skor, py:profil_daerah\.py, src:kemitraan\.js;/);
});

test("penolakan: entri menunjuk nama uji tak ada, atau skrip Python tanpa --cek, dilaporkan yatim", () => {
  const r = salin(); r.diuji["py:konst.py"] = "uji:tidak_ada"; r.diuji["js:konst.js"] = "uji yang tidak pernah ditulis siapa pun";
  const g = periksa(r, temuan, baris);
  assert.equal(g.yatim.length, 2);
  assert.ok(g.yatim.some((p) => /tidak_ada\.py tidak punya def cek\(/.test(p)));
  assert.ok(g.yatim.some((p) => /js:konst\.js -> .* tidak ditemukan di nama uji/.test(p)));
});

test("penolakan: alasan pendek ditolak", () => {
  const r = salin(); r.dikecualikan["js:konst.js"] = "singkat";
  assert.match(periksa(r, temuan, baris).alasan[0], /kurang dari 15 huruf/);
});

test("penolakan: antre melebihi batas dilaporkan dengan angkanya", () => {
  const r = salin(); r.antre = { "js:konst.js": "belum" };
  assert.deepEqual(periksa(r, temuan, baris, { batasAntre: 0 }).antre, ["antre 1 > batas 0: utang uji hanya boleh menyusut"]);
  assert.equal(periksa(r, temuan, baris, { batasAntre: 1 }).antre.length, 0);
});

test("penolakan: kunci yang sudah tidak ada di kode dilaporkan basi; kunci di dua daftar dilaporkan ganda", () => {
  const r = salin(); r.diuji["hitung.lama"] = "konst.py dan konst.js identik"; r.dikecualikan["py:kode.py"] = "dicatat ganda untuk uji gerbang";
  const g = periksa(r, temuan, baris);
  assert.deepEqual(g.basi, ["kunci basi: hitung.lama; hapus dari cakupan.json"]);
  assert.deepEqual(g.ganda, ["kunci ganda di dua daftar: py:kode.py"]);
});

test("penolakan: BATAS_ANTRE tidak naik di atas jumlah antre registri saat ini", () => {
  assert.ok(BATAS_ANTRE <= Object.keys(reg.antre || {}).length || BATAS_ANTRE === 0, `BATAS_ANTRE ${BATAS_ANTRE} tidak boleh dinaikkan`);
});
