#!/usr/bin/env node
/* Pemilih uji untuk gerbang push LOKAL (.githooks/pre-push). Pemilik 20 Nov 2026: "gw mau cepat", "yang berubah sedikit ... hanya itu yang diuji".
   Pola dari pangantara scripts/mesin/uji-terkait.mjs (vonis pemilik 7 Okt 2026), tapi ketergantungan dicatat dari yang BENAR-BENAR terjadi
   saat uji jalan (scripts/agents/uji_jejak.mjs: import, baca berkas, readdir, proses anak, git), bukan dari teks jalur: 66 uji warga merakit
   jalurnya saat jalan sehingga pencocokan teks buta terhadapnya.

   Pakai: node scripts/agents/uji_pilih.mjs <skrip npm, mis. uji:warga> --dasar <sha> --sampai <sha> --peta <berkas> [--cetak]
   Skrip npm harus berbentuk "node --test <flag> <glob...>"; bentuk lain dijalankan penuh lewat npm run.

   Uji DIJALANKAN bila: berkas ujinya ikut berubah; belum punya catatan di peta; pernah gagal 60 hari terakhir (inti); memakai git selain
   ls-files (bergantung seluruh pohon); berkas yang ia baca/import berubah; skrip anak yang ia jalankan, atau tetangga sefoldernya, berubah;
   atau ada berkas BARU/TERHAPUS di folder yang ia daftar (readdir) atau ia memakai git ls-files.
   PENUH bila: UJI_PENUH=1, dasar tak terbaca, lebih dari 300 berkas berubah, atau yang berubah package.json, package-lock.json,
   .githooks/pre-push, atau berkas pemilih/pencatat ini. Gagal ke arah PENUH: yang dikorbankan waktu, bukan mutu.
   Suite PENUH tetap dijalankan terbit.yml di GitHub sebelum deploy; risiko "hijau di lokal, merah di CI" diterima pemilik seperti di pangantara. */
import {execFileSync, spawnSync} from "node:child_process";
import {existsSync, globSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, posix, resolve} from "node:path";
import {pathToFileURL} from "node:url";

const AKAR = process.cwd(), HARI = 864e5, JENDELA_INTI = 60 * HARI, BATAS_BERUBAH = 300;
const PEMICU_PENUH = new Set(["package.json", "package-lock.json", ".githooks/pre-push", "scripts/agents/uji_pilih.mjs", "scripts/agents/uji_jejak.mjs"]);
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const skrip = process.argv[2], dasar = arg("--dasar"), sampai = arg("--sampai") || "HEAD", petaF = arg("--peta"), cetak = process.argv.includes("--cetak");

export function berubah(dasar, sampai) {   // [{s: "M"|"A"|"D"|"R", f}] atau null bila tak terbaca
  try {
    const o = execFileSync("git", ["diff", "--name-status", "--no-renames", dasar, sampai], {cwd: AKAR, encoding: "utf8", maxBuffer: 64e6});
    return o.split("\n").filter(Boolean).map(l => { const [s, f] = l.split("\t"); return {s: s[0], f}; });
  } catch { return null; }
}

/* inti logika: pilih uji dari daftar uji, daftar berubah, dan peta. Diekspor untuk gerbang tests/agen/gerbang-uji-pilih.test.mjs. */
export function pilih(semua, ub, peta, kini = Date.now()) {
  if (!ub) return {penuh: "daftar berkas berubah tak terbaca", uji: semua};
  if (ub.length > BATAS_BERUBAH) return {penuh: `${ub.length} berkas berubah (> ${BATAS_BERUBAH})`, uji: semua};
  const pemicu = ub.find(x => PEMICU_PENUH.has(x.f)); if (pemicu) return {penuh: `${pemicu.f} berubah`, uji: semua};
  const set = new Set(ub.map(x => x.f)), struktur = ub.filter(x => x.s !== "M").map(x => x.f), dirUbah = new Set(ub.map(x => posix.dirname(x.f)));
  const alasan = new Map();
  for (const u of semua) {
    const e = peta[u];
    const a = set.has(u) ? "berkas ujinya berubah"
      : !e ? "belum ada catatan"
      : e.gagal && kini - e.gagal < JENDELA_INTI ? "pernah gagal (inti)"
      : e.git ? "memakai git"
      : e.baca.find(f => set.has(f)) ? `membaca ${e.baca.find(f => set.has(f))}`
      : e.pdir.find(d => dirUbah.has(d)) ? `menjalankan skrip di ${e.pdir.find(d => dirUbah.has(d))}`
      : struktur.length && e.daftar ? "daftar berkas repo berubah"
      : struktur.find(f => e.dir.some(d => posix.dirname(f) === d || f.startsWith(d + "/"))) ? `berkas baru/terhapus di folder yang ia daftar`
      : null;
    if (a) alasan.set(u, a);
  }
  return {penuh: null, uji: semua.filter(u => alasan.has(u)), alasan};
}

/* gabungkan catatan proses ke peta: entri uji yang jalan diganti utuh (ketergantungan lama dibuang), 'gagal' menyimpan waktu gagal terakhir */
export function gabung(peta, catatan, kini = Date.now()) {
  const per = new Map();
  for (const c of catatan) {
    const x = per.get(c.uji) || {baca: new Set(), dir: new Set(), pdir: new Set(), daftar: false, git: false, gagal: false, utama: false};
    for (const k of ["baca", "dir", "pdir"]) for (const v of c[k] || []) x[k].add(v);
    x.daftar ||= c.daftar; x.git ||= c.git; if (c.utama) { x.utama = true; x.gagal ||= c.gagal; }
    per.set(c.uji, x);
  }
  for (const [u, x] of per) {
    if (!x.utama) continue;   // proses uji utamanya tidak tercatat (dibunuh?): jangan timpa catatan lama dengan yang setengah
    const lama = peta[u];
    peta[u] = {baca: [...x.baca].filter(f => f !== u).sort(), dir: [...x.dir].sort(), pdir: [...x.pdir].sort(), daftar: x.daftar, git: x.git,
      gagal: x.gagal ? kini : lama?.gagal || 0, t: kini};
  }
  return peta;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const sk = JSON.parse(readFileSync(join(AKAR, "package.json"), "utf8")).scripts?.[skrip] || "";
  const kata = sk.trim().split(/\s+/);
  const penuhNpm = () => { const r = spawnSync("npm", ["run", skrip], {cwd: AKAR, stdio: "inherit"}); process.exit(r.status ?? 1); };
  if (kata[0] !== "node" || kata[1] !== "--test" || /[;&|]/.test(sk)) penuhNpm();
  const flag = kata.slice(1).filter(k => k.startsWith("--")), pola = kata.slice(1).filter(k => !k.startsWith("--"));
  const semua = [...new Set(pola.flatMap(p => globSync(p, {cwd: AKAR})))].sort();
  let peta = {}; try { peta = petaF && existsSync(petaF) ? JSON.parse(readFileSync(petaF, "utf8")) : {}; } catch { peta = {}; }
  const r = process.env.UJI_PENUH === "1" ? {penuh: "UJI_PENUH=1", uji: semua} : pilih(semua, dasar ? berubah(dasar, sampai) : null, peta);
  console.log(`uji_pilih ${skrip}: ${r.penuh ? `PENUH (${r.penuh})` : `${r.uji.length} dari ${semua.length} uji terdampak`}`);
  if (!r.penuh) for (const u of r.uji.slice(0, 40)) console.log(`  ${u}: ${r.alasan.get(u)}`);
  if (!r.penuh && r.uji.length > 40) console.log(`  ... dan ${r.uji.length - 40} lagi`);
  if (cetak) process.exit(0);
  if (!r.uji.length) process.exit(0);
  const dir = mkdtempSync(join(tmpdir(), "uji-jejak-"));
  const env = {...process.env, UJI_JEJAK_DIR: dir, UJI_JEJAK_AKAR: AKAR,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --import=${pathToFileURL(join(AKAR, "scripts/agents/uji_jejak.mjs")).href}`.trim()};
  delete env.NODE_TEST_CONTEXT;   // dipanggil dari dalam uji lain: tanpa ini node --test tidak menjalankan tiap berkas di prosesnya sendiri
  // dipanggil dari uji yang sedang dicatat (pre-push): tanpa ini tiap uji di sini tercatat atas nama uji luar sebagai proses anak (20 Nov 2026, semua push ditolak)
  delete env.UJI_JEJAK_UJI; delete env.UJI_JEJAK_ANAK;
  const j = spawnSync("node", [...flag, ...r.uji], {cwd: AKAR, stdio: "inherit", env});
  if (petaF) {
    try {
      const catatan = readdirSync(dir).flatMap(f => { try { return [JSON.parse(readFileSync(join(dir, f), "utf8"))]; } catch { return []; } });
      let kini = {}; try { kini = existsSync(petaF) ? JSON.parse(readFileSync(petaF, "utf8")) : {}; } catch {}   // baca ulang: suite lain menulis bersamaan
      writeFileSync(petaF + ".baru." + process.pid, JSON.stringify(gabung(kini, catatan)));
      execFileSync("mv", [petaF + ".baru." + process.pid, petaF]);
    } catch (e) { console.error("uji_pilih: peta tidak tersimpan:", e.message); }
  }
  rmSync(dir, {recursive: true, force: true});
  process.exit(j.status ?? 1);
}
