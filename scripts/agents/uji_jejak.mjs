/* Pencatat jejak uji (pemilik 20 Nov 2026: "yang berubah sedikit di bagian tertentu ya dia hanya itu yang diuji").
   Dimuat lewat NODE_OPTIONS --import oleh scripts/agents/uji_pilih.mjs. Di tiap proses uji ia mencatat berkas repo yang
   di-import, dibaca, atau didaftar (readdir), skrip yang dijalankan sebagai proses anak, dan pemakaian git.
   Proses anak node mewarisi pencatat lewat NODE_OPTIONS dan mencatat atas nama berkas uji induknya (UJI_JEJAK_UJI).
   Keluaran: satu berkas JSON per proses di UJI_JEJAK_DIR; uji_pilih.mjs menggabungnya ke peta. Tanpa UJI_JEJAK_DIR: tidak melakukan apa pun. */
import fs from "node:fs";
import cp from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {registerHooks, syncBuiltinESMExports} from "node:module";

const DIR = process.env.UJI_JEJAK_DIR, asli = p => { try { return fs.realpathSync.native(p); } catch { return p; } };   // /var -> /private/var di macOS
const AKAR = process.env.UJI_JEJAK_AKAR && asli(process.env.UJI_JEJAK_AKAR);
if (DIR && AKAR) {
  const uji = process.env.UJI_JEJAK_UJI || (/\.test\.m?js$/.test(process.argv[1] || "") ? path.relative(AKAR, asli(path.resolve(process.argv[1]))).split(path.sep).join("/") : "");
  if (uji) {
    const utama = !process.env.UJI_JEJAK_ANAK;   // proses berkas uji itu sendiri, bukan proses anaknya
    process.env.UJI_JEJAK_UJI = uji; process.env.UJI_JEJAK_ANAK = "1";   // diwarisi proses anak node
    const baca = new Set(), dir = new Set(), pdir = new Set();
    let daftar = false, git = false;
    const rel = p => {
      try {
        if (p == null) return null;
        if (p instanceof URL) p = fileURLToPath(p); else if (Buffer.isBuffer(p)) p = p.toString(); else if (typeof p !== "string") return null;
        if (p.startsWith("file:")) p = fileURLToPath(p);
        let r = path.relative(AKAR, path.resolve(p));
        if (r.startsWith("..") || path.isAbsolute(r)) r = path.relative(AKAR, asli(path.resolve(p)));
        return !r || r.startsWith("..") || path.isAbsolute(r) || r.startsWith("node_modules") || r.startsWith(".git/") ? null : r.split(path.sep).join("/");
      } catch { return null; }
    };
    const catat = (set, p) => { const r = rel(p); if (r) set.add(r); };
    registerHooks({resolve(spec, ctx, next) { const r = next(spec, ctx); if (r?.url?.startsWith("file:")) catat(baca, r.url); return r; }});
    const bungkus = (obj, nama, set) => { const asli = obj[nama]; if (typeof asli !== "function") return;
      obj[nama] = function (p, ...x) { catat(set, p); return asli.call(this, p, ...x); }; };
    for (const n of ["readFileSync", "readFile", "existsSync", "statSync", "lstatSync", "openSync", "open", "createReadStream", "accessSync", "access", "stat"]) bungkus(fs, n, baca);
    for (const n of ["readdirSync", "readdir", "opendirSync", "opendir"]) bungkus(fs, n, dir);
    for (const n of ["readFile", "stat", "access", "open"]) bungkus(fs.promises, n, baca);
    for (const n of ["readdir", "opendir"]) bungkus(fs.promises, n, dir);
    /* proses anak: git ls-files/ls-tree = bergantung pada DAFTAR berkas; git lain = bergantung pada seluruh pohon (selalu jalan).
       Argumen yang berupa berkas repo dicatat; foldernya juga (skrip Python mengimpor tetangganya, yang tidak terlihat dari sini). */
    const anak = (cmd, args) => {
      const kata = Array.isArray(args) ? [cmd, ...args] : String(cmd).split(/\s+/);
      const prog = path.basename(String(kata[0] || ""));
      if (prog === "git") { if (kata.some(k => k === "ls-files" || k === "ls-tree")) daftar = true; else if (!kata.some(k => ["rev-parse", "config", "init", "add", "commit", "--version"].includes(k))) git = true; }
      for (const k of kata.slice(1)) { const r = typeof k === "string" && !k.startsWith("-") ? rel(k) : null; if (r && fs.existsSync.call(fs, path.join(AKAR, r))) { baca.add(r); pdir.add(path.posix.dirname(r)); } }
    };
    for (const n of ["spawn", "spawnSync", "execFile", "execFileSync", "exec", "execSync", "fork"]) { const asli = cp[n];
      cp[n] = function (c, a, ...x) { try { anak(c, Array.isArray(a) ? a : null); } catch {} return asli.call(this, c, a, ...x); }; }
    syncBuiltinESMExports();
    process.on("exit", code => {
      try {
        fs.writeFileSync(path.join(DIR, `${process.pid}.json`), JSON.stringify({uji, utama, gagal: code !== 0,
          baca: [...baca], dir: [...dir], pdir: [...pdir], daftar, git}));
      } catch {}
    });
  }
}
