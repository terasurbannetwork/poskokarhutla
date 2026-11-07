// KM-C02: paritas Python = JS untuk generator pertanyaan. `pertanyaan.py --paritas` mencetak 20 kombinasi (kab, masalah, narasumber) beserta keluarannya;
// hitung.js harus menghasilkan keluaran yang sama persis (dibandingkan lewat JSON). Hanya fungsi yang ada di KEDUA sisi yang diperbandingkan.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baca = (p) => readFileSync(join(AKAR, p), "utf8");
const kotak = { module: { exports: {} } };
vm.createContext(kotak);
vm.runInContext(baca("public/kemitraan/konst.js"), kotak);
kotak.module = { exports: {} };
vm.runInContext(baca("public/kemitraan/hitung.js"), kotak);
const H = kotak.module.exports;
const bank = JSON.parse(baca("scripts/kemitraan/pertanyaan.json"));
const py = JSON.parse(execFileSync("python3", ["-I", join(AKAR, "scripts/kemitraan/pertanyaan.py"), "--paritas"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const profil = (kab) => JSON.parse(baca(`public/data/kemitraan/daerah/${kab}.json`));
/* bagian pertama yang beda: "narasumber/arah: py ... != js ..." (kosong bila sama) */
function bedaPertama(a, b) {
  for (const n of new Set([...Object.keys(a.narasumber), ...Object.keys(b.narasumber)])) {
    for (const r of new Set([...Object.keys(a.narasumber[n] || {}), ...Object.keys(b.narasumber[n] || {})])) {
      const x = JSON.stringify(a.narasumber[n]?.[r]), y = JSON.stringify(b.narasumber[n]?.[r]);
      if (x !== y) return `${n}/${r}: py ${x?.slice(0, 160)} != js ${y?.slice(0, 160)}`;
    }
  }
  for (const k of ["data_diminta", "riset"]) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return `${k}: py ${JSON.stringify(a[k]).slice(0, 160)} != js ${JSON.stringify(b[k]).slice(0, 160)}`;
  return "";
}

test("paritas: pertanyaan.py --paritas mencetak 20 kombinasi yang beragam (dengan dan tanpa masalah)", () => {
  assert.equal(py.length, 20, `${py.length} kombinasi, harus 20`);
  assert.ok(py.some((c) => c.masalah) && py.some((c) => !c.masalah), "kombinasi harus memuat kasus dengan dan tanpa masalah");
  assert.ok(new Set(py.map((c) => c.kab)).size >= 8, "kab terlalu sedikit ragamnya");
});

test("paritas pertanyaan Py=JS: 20 kombinasi keluaran panduan() identik", () => {
  const beda = py.map((c) => {
    const p = profil(c.kab), m = c.masalah ? (p.masalah || []).find((x) => x.B === c.masalah.B && x.A === c.masalah.A) : null;
    const js = JSON.parse(JSON.stringify(H.panduan(bank, p, m, c.narasumber, c.ctx)));
    const b = bedaPertama(c.keluar, js);
    return b && `${c.kab}/${c.masalah?.B || "-"}/${b}`;
  }).filter(Boolean);
  assert.deepEqual(beda, [], `${beda.length} dari ${py.length} kombinasi beda: ${beda.slice(0, 3).join(" | ")}`);
});

test("paritas pertanyaan Py=JS: seluruh 514 kab tanpa masalah dan dengan masalah pertama identik (nilai slot tidak menyimpang)", () => {
  const ujiPy = `import glob,json,sys\nsys.path.insert(0,${JSON.stringify(join(AKAR, "scripts/kemitraan"))})\nimport pertanyaan as q\nbank=q.muat();out={}\nfor f in sorted(glob.glob(${JSON.stringify(join(AKAR, "public/data/kemitraan/daerah/[0-9][0-9][0-9][0-9].json"))})):\n p=json.load(open(f,encoding='utf-8'));ms=[None]+(p['masalah'] or [])[:1]\n out[p['kode']]=[q.panduan(bank,p,m,None,{'prov_nama':'Provinsi Uji'}) for m in ms]\nprint(json.dumps(out,ensure_ascii=False))`;
  const semua = JSON.parse(execFileSync("python3", ["-I", "-c", ujiPy], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 }));
  const kab = Object.keys(semua), beda = [];
  assert.equal(kab.length, 514);
  for (const k of kab) {
    const p = profil(k);
    [null, ...(p.masalah || []).slice(0, 1)].forEach((m, i) => {
      const b = bedaPertama(semua[k][i], JSON.parse(JSON.stringify(H.panduan(bank, p, m, null, { prov_nama: "Provinsi Uji" }))));
      if (b) beda.push(`${k}#${i} ${b}`);
    });
  }
  assert.deepEqual(beda, [], `${beda.length} kombinasi beda (kab#indeks): ${beda.slice(0, 3).join(" | ")}`);
});
