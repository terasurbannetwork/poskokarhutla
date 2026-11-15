/* Pencocok orang sekali jalan (KP-22; KEPUTUSAN D10, ALGORITMA 5). Jalan di mesin pemilik, TIDAK menyentuh produksi: membaca ekspor JSON dari berkas,
   menulis SQL ke path di LUAR repo (daftar pasangan tidak pernah masuk git; repo publik). Pemilik menerapkan SQL itu sendiri.
   Pakai:  node scripts/agents/cocok_orang.mjs --orang o.json --staf s.json --instansi i.json --pdt p.json --km k.json --keluar ~/cocok_orang.sql
   Berkas ekspor = keluaran `wrangler d1 execute DB --remote --json --command "SELECT ..."` (larik [{results:[...]}]) atau larik baris biasa. */
import {readFileSync, writeFileSync, realpathSync, existsSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {normalWA} from "../../src/nomor.js";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const nipBaku = n => { const s = String(n ?? "").replace(/[\s.]/g, ""); return s ? (/^\d{18}$/.test(s) ? {baku: s} : {tidakBaku: true}) : {}; };

/* akun: [{tabel, id, nip, wa}], orang: [{id, nip, wa}] -> {pasang: [{tabel, akun_id, orang_id, cara}], tinjau: [{akun_tabel, akun_id, kandidat, alasan}]}. Nama tidak dibaca sama sekali. */
export function cocok(akun, orang) {
  const perNip = new Map(), perWa = new Map();
  for (const o of orang) {
    const n = nipBaku(o.nip).baku; if (n) perNip.set(n, o.id);
    const w = normalWA(o.wa); if (w) perWa.set(w, [...(perWa.get(w) ?? []), o.id]);
  }
  const pasang = [], tinjau = [];
  for (const a of akun) {
    const t = {akun_tabel: a.tabel, akun_id: a.id}, nip = nipBaku(a.nip);
    const dariNip = nip.baku ? perNip.get(nip.baku) : undefined, dariWa = perWa.get(normalWA(a.wa)) ?? [];
    if (nip.tidakBaku) tinjau.push({...t, kandidat: dariWa, alasan: "nip_tidak_baku"});
    if (dariNip) {
      const lain = dariWa.filter(x => x !== dariNip);
      if (lain.length) tinjau.push({...t, kandidat: [dariNip, ...lain], alasan: "bentrok"});
      else pasang.push({tabel: a.tabel, akun_id: a.id, orang_id: dariNip, cara: "nip"});
    } else if (dariWa.length === 1) pasang.push({tabel: a.tabel, akun_id: a.id, orang_id: dariWa[0], cara: "wa"});
    else if (dariWa.length > 1) tinjau.push({...t, kandidat: dariWa, alasan: "bentrok"});
  }
  return {pasang, tinjau};
}

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
export function keSql({pasang, tinjau}, kini) {
  const L = ["-- dibuat cocok_orang.mjs; terapkan: wrangler d1 execute DB --remote --file <berkas ini>. Berisi id akun dan orang: jangan masuk repo."];
  for (const p of pasang) L.push(`INSERT OR IGNORE INTO orang_akun (tabel, akun_id, orang_id, cara, dibuat) VALUES (${q(p.tabel)}, ${q(p.akun_id)}, ${q(p.orang_id)}, ${q(p.cara)}, ${kini});`);
  for (const r of tinjau) {
    const id = createHash("sha256").update(`${r.akun_tabel}|${r.akun_id}`).digest("hex").slice(0, 16);
    L.push(`INSERT OR IGNORE INTO orang_tinjau (id, akun_tabel, akun_id, kandidat, alasan, dibuat) VALUES (${q(id)}, ${q(r.akun_tabel)}, ${q(r.akun_id)}, ${q(JSON.stringify(r.kandidat))}, ${q(r.alasan)}, ${kini});`);
  }
  return L.join("\n") + "\n";
}

/* true bila jalur berada di dalam repo (jalur yang belum ada dinilai lewat induk terdekat yang ada) */
export function diDalamRepo(jalur) {
  let p = path.resolve(jalur), ekor = "";
  while (!existsSync(p)) { ekor = path.join(path.basename(p), ekor); p = path.dirname(p); }
  const r = path.relative(realpathSync(AKAR), path.join(realpathSync(p), ekor));
  return r === "" || (!r.startsWith("..") && !path.isAbsolute(r));
}

const baris = f => { const j = JSON.parse(readFileSync(f, "utf8")); return Array.isArray(j) && j[0]?.results ? j.flatMap(x => x.results) : j; };

function utama(argv) {
  const a = {}; for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, "")] = argv[i + 1];
  if (!a.orang || !a.keluar) throw new Error("wajib: --orang <json> --keluar <path.sql di luar repo>; opsional --staf --instansi --pdt --km");
  if (diDalamRepo(a.keluar)) throw new Error(`ditolak: ${a.keluar} ada di dalam repo; daftar pasangan tidak boleh masuk git. Pilih path di luar repo (mis. ~/cocok_orang.sql).`);
  const akun = [["staf", "staf"], ["instansi", "instansi_akun"], ["pdt", "pdt_akun"], ["km", "km_akun"]]
    .flatMap(([k, tabel]) => a[k] ? baris(a[k]).map(r => ({tabel, id: r.id, nip: r.nip, wa: r.wa})) : []);
  const h = cocok(akun, baris(a.orang));
  writeFileSync(a.keluar, keSql(h, Date.now()), {mode: 0o600});
  console.log(`${h.pasang.length} pasangan, ${h.tinjau.length} masuk tinjau -> ${a.keluar}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) try { utama(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
