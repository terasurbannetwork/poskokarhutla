/* SP-055: kontras token tema terang dan gelap (RU §2.7, DS §2.1.5). Variabel diurai dari public/admin/admin.css (hex) dan public/inti/tema.css (oklch), dua tema;
   rasio WCAG dihitung untuk pasangan teks dan latar yang dipakai public/pipa/*.css. Teks biasa 4,5:1, komponen dan non-teks 3:1. Tanpa peramban. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";

const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* ---------- penguraian CSS variabel per tema ---------- */
/* blok untuk tema: terang = aturan :root{...}; gelap = :root[data-theme="dark"]{...}. Aturan media prefers-color-scheme diabaikan: layar memakai data-theme eksplisit. */
export function variabelTema(css, tema) {
  const sel = tema === "dark" ? /:root\[data-theme="dark"\]\s*\{([^}]*)\}/g : /(?:^|\n)\s*:root\s*\{([^}]*)\}/g, v = {};
  for (const m of css.matchAll(sel)) for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+?)(?=;|$)/g)) v[d[1]] = d[2].trim();
  return v;
}
/* admin.css lebih akhir dari tema.css di cangkang /pipa: nilainya menang untuk nama yang sama; tema terang jadi dasar tema gelap */
export function tokenGabungan(tema) {
  const admin = baca("public/admin/admin.css"), dasar = baca("public/inti/tema.css");
  const terang = {...variabelTema(dasar, "light"), ...variabelTema(admin, "light")};
  return tema === "light" ? terang : {...terang, ...variabelTema(dasar, "dark"), ...variabelTema(admin, "dark")};
}

/* ---------- warna ke sRGB linear ---------- */
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
export function keRgb(nilai, v = {}, dalam = 0) {
  const s = String(nilai).trim();
  if (dalam > 5) throw new Error(`rujukan var() berputar: ${s}`);
  let m = /^var\((--[\w-]+)(?:\s*,[^)]*)?\)$/.exec(s);
  if (m) { if (!(m[1] in v)) throw new Error(`token ${m[1]} tidak ditemukan`); return keRgb(v[m[1]], v, dalam + 1); }
  m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) { const h = m[1].length === 3 ? [...m[1]].map(x => x + x).join("") : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); }
  m = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(s);
  if (m) {
    const L = +m[1] / 100, C = +m[2], h = +m[3] * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, ss = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss, g = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss, bl = -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * ss;
    return [r, g, bl].map(x => Math.min(1, Math.max(0, gam(x))));
  }
  m = /^color-mix\(in (?:srgb|oklch),\s*(.+?)\s+(\d+)%,\s*(.+)\)$/.exec(s);
  if (m) { const a = keRgb(m[1], v, dalam + 1), b = keRgb(m[3], v, dalam + 1), t = +m[2] / 100; return a.map((x, i) => x * t + b[i] * (1 - t)); }
  if (/^(?:#fff|white)$/i.test(s)) return [1, 1, 1];
  throw new Error(`warna tidak dikenali: ${s}`);
}
export const luminans = rgb => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export function rasio(a, b) { const x = luminans(a), y = luminans(b), [t, g] = x > y ? [x, y] : [y, x]; return (t + 0.05) / (g + 0.05); }
const kontras = (v, fg, bg) => rasio(keRgb(`var(${fg})`, v), keRgb(`var(${bg})`, v));

/* ---------- pasangan yang dipakai public/pipa/*.css ---------- */
const TEKS = [["--ink", "--card"], ["--ink", "--paper"], ["--ink", "--surface"], ["--ink2", "--card"], ["--ink2", "--paper"], ["--ink2", "--surface"]];
const KOMPONEN = [["--info", "--card"], ["--ink2", "--card"], ["--ok", "--card"], ["--bad", "--card"], ["--brand2", "--card"]];
export const PENGECUALIAN = {};   // "pasangan:tema": alasan >= 15 huruf. Kosong saat ini: semua pasangan lulus. Entri baru wajib tetap gagal (uji di bawah) supaya tidak jadi pengecualian basi.

for (const tema of ["light", "dark"]) {
  const v = tokenGabungan(tema);
  test(`kontras ${tema}: teks biasa (ink, ink2) di card, paper, surface minimal 4,5:1`, () => {
    for (const [fg, bg] of TEKS) { const r = kontras(v, fg, bg); assert.ok(r >= 4.5, `${fg} di ${bg} tema ${tema}: ${r.toFixed(2)}:1 < 4,5:1 (nilai ${v[fg]} di ${v[bg]})`); }
  });
  test(`kontras ${tema}: komponen dan penanda non-teks (cincin fokus, garis, ikon) minimal 3:1 kecuali pengecualian beralasan`, () => {
    for (const [fg, bg] of KOMPONEN) { const k = `${fg}:${bg}:${tema}`, r = kontras(v, fg, bg); if (k in PENGECUALIAN) continue; assert.ok(r >= 3, `${fg} di ${bg} tema ${tema}: ${r.toFixed(2)}:1 < 3:1 (nilai ${v[fg]} di ${v[bg]})`); }
  });
  test(`kontras ${tema}: putih di navy2 (header, kepala tabel, tombol aktif) minimal 4,5:1`, () => {
    const r = rasio([1, 1, 1], keRgb("var(--navy2)", v)); assert.ok(r >= 4.5, `putih di --navy2 ${r.toFixed(2)}:1`);
  });
}
test("pengecualian kontras: tiap entri alasannya cukup panjang dan masih benar-benar gagal (bukan pengecualian basi)", () => {
  for (const [k, alasan] of Object.entries(PENGECUALIAN)) {
    assert.ok(alasan.replace(/[^\p{L}]/gu, "").length >= 15, `alasan ${k} terlalu pendek`);
    const [fg, bg, tema] = k.split(":"), r = kontras(tokenGabungan(tema), fg, bg); assert.ok(r < 3, `${k} sudah lulus (${r.toFixed(2)}:1): hapus dari PENGECUALIAN`);
  }
});

/* ---------- pemindai: token di public/pipa/*.css harus ada di tema ---------- */
test("tiap var(--token) di public/pipa/*.css (tanpa cadangan) terdefinisi di tema terang dan gelap, atau dibuat oleh berkas CSS itu sendiri", () => {
  const dir = new URL("../../public/pipa/", import.meta.url), semuaCss = readdirSync(dir).filter(n => n.endsWith(".css") && !/^uji_pilot/.test(n));
  const buatSendiri = new Set(); for (const n of semuaCss) for (const m of readFileSync(new URL(n, dir), "utf8").matchAll(/(--[\w-]+)\s*:/g)) buatSendiri.add(m[1]);
  const terang = tokenGabungan("light"), gelap = tokenGabungan("dark"), hilang = [];
  for (const n of semuaCss) for (const m of readFileSync(new URL(n, dir), "utf8").matchAll(/var\((--[\w-]+)\)/g)) if (!(m[1] in terang) && !(m[1] in gelap) && !buatSendiri.has(m[1])) hilang.push(`${n}: ${m[1]}`);
  assert.deepEqual([...new Set(hilang)], [], `${new Set(hilang).size} token tanpa definisi: ${[...new Set(hilang)].join(", ")}`);
});

/* ---------- penolakan: pemeriksa tidak buta ---------- */
test("penolakan: pasangan sengaja jelek (abu muda di putih) ditolak dengan angka; penghitung cocok dengan nilai acuan WCAG", () => {
  assert.ok(Math.abs(rasio([0, 0, 0], [1, 1, 1]) - 21) < 1e-9, "hitam di putih = 21:1");
  assert.ok(Math.abs(rasio([1, 1, 1], [1, 1, 1]) - 1) < 1e-9);
  const v = {"--a": "#aaaaaa", "--b": "#ffffff"}; assert.ok(kontras(v, "--a", "--b") < 4.5, `abu muda ${kontras(v, "--a", "--b").toFixed(2)}:1 seharusnya gagal`);
  assert.ok(Math.abs(rasio(keRgb("#767676"), [1, 1, 1]) - 4.54) < 0.01, "#767676 di putih = 4,54:1 (acuan WCAG)");
  assert.throws(() => keRgb("var(--tidak-ada)", {}), /tidak ditemukan/); assert.throws(() => keRgb("hotpink", {}), /tidak dikenali/);
  assert.deepEqual(Object.keys(variabelTema(":root{--x:#fff;--y: 2px}", "light")), ["--x", "--y"]); assert.deepEqual(variabelTema(":root{--x:#fff}", "dark"), {});
});
