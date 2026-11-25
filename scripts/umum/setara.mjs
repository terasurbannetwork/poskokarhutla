// Pembanding kesetaraan Python-JS (KI-15). Kasus tetap + LCG ber-seed -> fungsi Python (subprocess `python3 -I -c`) dan fungsi JS
// dijalankan pada kasus yang sama, hasilnya dibandingkan dengan toleransi. Kontrol negatif: salinan JS yang sengaja digeser harus
// menghasilkan selisih; bila tidak, pembandingnya buta dan uji dianggap gagal.
// Pola: scripts/gempa/uji_js_guncangan.py, scripts/gunungapi/uji_setara.mjs.
import {spawnSync} from "node:child_process";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

export const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** LCG ber-seed (Numerical Recipes): deterministik antar mesin, hasil di [0, 1). */
export function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

/** Jalankan `kode` Python (harus mendefinisikan `f(kasus)`) pada tiap kasus; kembalikan daftar hasil (JSON). AKAR ada di sys.path. */
export function py(kode, kasus) {
  const skrip = `import sys, json\nsys.dont_write_bytecode = True\nsys.path.insert(0, ${JSON.stringify(AKAR)})\n${kode}\nprint(json.dumps([f(c) for c in json.load(sys.stdin)]))`;
  const r = spawnSync("python3", ["-I", "-c", skrip], {input: JSON.stringify(kasus), encoding: "utf8", maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`python gagal (status ${r.status}): ${(r.stderr || "").slice(-1500)}`);
  return JSON.parse(r.stdout);
}

const norm = x => JSON.parse(JSON.stringify(x === undefined ? null : x));   // undefined/NaN seperti JSON: kunci hilang, NaN -> null

function sama(a, b, tol) {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= tol;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => k in b && sama(a[k], b[k], tol));
}

/** Bandingkan Python lawan JS pada `kasus`. -> {n, beda: [{i, kasus, py, js}]}. */
export function setara({kasus, kode, js, tol = 0}) {
  const hp = py(kode, kasus);
  const beda = [];
  kasus.forEach((c, i) => { const j = norm(js(c)); if (!sama(hp[i], j, tol)) beda.push({i, kasus: c, py: hp[i], js: j}); });
  return {n: kasus.length, beda};
}

/** Ringkas selisih untuk pesan gagal / todo: jumlah + beberapa contoh. */
export function ringkas(res, maks = 5) {
  return `${res.beda.length} dari ${res.n} kasus beda; contoh: ${res.beda.slice(0, maks).map(b => JSON.stringify({kasus: b.kasus, py: b.py, js: b.js})).join(" | ")}`;
}
