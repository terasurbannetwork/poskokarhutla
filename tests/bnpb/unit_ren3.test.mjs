/* RU-049 REN-3 kalender monev: keluaran nyata ren3.py dirender rapor.js asli di vm bersama public/inti/format.js.
   Tiap tenggat tampil dengan pasal bertaut; TLHP sebagai aturan, bukan tanggal; hari kerja berlabel asumsi; berulang tanpa tanggal karangan. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = p => readFileSync(AKAR + p, "utf8");
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN};
vm.createContext(ctx);
vm.runInContext(baca("public/inti/format.js") + "\n;globalThis.esc = esc; globalThis.fmt = fmt;", ctx);
vm.runInContext(baca("public/bnpb/unit/rapor.js"), ctx);
const R = ctx.window.UnitRapor;
const py = (...a) => spawnSync("python3", ["-I", ...a], {cwd: AKAR, encoding: "utf8"});

test("ren3.py --cek hijau", () => { const r = py("scripts/bnpb/unit/ren3.py", "--cek"); assert.equal(r.status, 0, r.stderr || r.stdout); });

test("kartu REN-3 dari keluaran nyata: pasal bertaut, TLHP aturan, hari kerja asumsi, tanpa tanggal karangan", () => {
  const r = py("-c", "import sys,json;sys.path.insert(0,'scripts/bnpb');from unit import ren3;from datetime import date;print(json.dumps(ren3.bangun(date(2026,11,6)),ensure_ascii=False))");
  assert.equal(r.status, 0, r.stderr);
  const b = {...JSON.parse(r.stdout), dibuat: "2026-11-26T00:00:00Z", basi_jam: 1080}, k = b.kartu[0];
  const h = R.html(k, b, Date.parse(b.dibuat) + 3600e3), kepala = h.slice(0, h.indexOf("</header>"));
  assert.match(kepala, /Kalender monev/); assert.match(kepala, /Asumsi: hari kerja tanpa libur nasional/);
  assert.match(kepala, /Angka resmi/); assert.match(kepala, /Hitungan kita/);
  const baris = h.split("<tr>").slice(2);
  assert.equal(baris.length, k.baris.length);
  for (const t of baris) assert.match(t, /<a href="\/bnpb\/hukum#d=[a-z0-9-]+">[^<]+<\/a>/, "tiap tenggat bertaut ke pasalnya");
  const tlhp = baris.find(t => t.includes("Tindak lanjut hasil pemeriksaan"));
  assert.match(tlhp, /60 hari sejak laporan hasil pemeriksaan diterima/); assert.match(tlhp, /dihitung saat peristiwa tercatat/);
  assert.match(baris.find(t => t.includes("Laporan penyelenggaraan pelatihan")), /mulai 6 Nov 2026: 17 Nov 2026/);
  assert.match(baris.find(t => t.includes("Evaluasi sistem peringatan dini")), /3 kali[^]*menunggu tanggal kegiatan terakhir/);
  assert.doesNotMatch(h, /·|\baman\b|NaN|undefined/i);
  assert.equal((h.match(/class="hl"/g) || []).length, k.angka.length);
});
