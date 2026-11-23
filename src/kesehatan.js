/* Papan kesehatan (FITUR.md §11, WEBSITE.md §6d): satu rute staf, GET /api/kesehatan, untuk tab Kesehatan di /admin/kinerja.
   Isi: (1) sumber data basi sekarang (periksaStatus, sama dengan /api/status), (2) tiap workflow GitHub Actions: run terakhir, sukses terakhir,
   gagal beruntun. Berkas data per modul (public/data/kesegaran.json) dibaca layar langsung karena publik.
   Workflow butuh secret GITHUB_TOKEN (sama dengan src/jaga_pipa.js); tanpa token rak itu tertulis "tanpa token", bukan galat.
   Dua panggilan GitHub per 5 menit per isolate (memori modul, sesudah gerbang hak; jawaban ke klien tidak pernah di-cache publik). */
import {json, gagal, periksaStatus} from "./worker.js";
import {stafOK} from "./staf.js";
import {SEMUA_PERAN} from "./admin_halaman.js";
import {REPO} from "./jaga_pipa.js";

const SIMPAN_MS = 5 * 60e3, GALAT_MS = 60e3, STATUS_MS = 60e3;
let simpan = null, simpanStatus = null;   // {t, v}. ponytail: per isolate, jadi beberapa isolate bisa memanggil GitHub sendiri-sendiri; pindah ke KV/D1 bila kuota GitHub terasa

/* murni: workflows (GET actions/workflows) + runs (GET actions/runs, terbaru dulu) -> satu baris per workflow.
   ponytail: hanya 100 run terakhir; workflow jarang (bulanan) bisa tampil "tidak terlihat" walau sehat. Tambah panggilan per workflow bila perlu. */
export function ringkasWorkflow(workflows, runs, kini) {
  const per = new Map();
  for (const r of runs) { const a = per.get(r.workflow_id) || []; a.push(r); per.set(r.workflow_id, a); }
  const umurJam = t => t ? Math.round((kini - Date.parse(t)) / 36e5 * 10) / 10 : null;
  return workflows.map(w => {
    const rs = per.get(w.id) || [], akhir = rs[0], sukses = rs.find(r => r.conclusion === "success");
    let gagalBeruntun = 0; for (const r of rs) { if (r.status !== "completed") continue; if (r.conclusion === "failure" || r.conclusion === "timed_out") gagalBeruntun++; else break; }
    return {nama: w.name, berkas: w.path.replace(/^\.github\/workflows\//, ""), aktif: w.state === "active",
      terakhir: akhir ? {status: akhir.status, hasil: akhir.conclusion, dibuat: akhir.created_at, umur_jam: umurJam(akhir.created_at), url: akhir.html_url} : null,
      sukses_umur_jam: sukses ? umurJam(sukses.created_at) : null, gagal_beruntun: gagalBeruntun};
  }).sort((a, b) => (b.gagal_beruntun - a.gagal_beruntun) || a.nama.localeCompare(b.nama, "id"));
}

export async function muatWorkflow(env, kini, ambil = fetch) {
  if (!env.GITHUB_TOKEN) return {tersedia: false, alasan: "tanpa token"};
  if (simpan && kini >= simpan.t && kini - simpan.t < (simpan.v.tersedia ? SIMPAN_MS : GALAT_MS)) return simpan.v;
  const h = {authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "centurisk97-kesehatan"};
  const gh = async j => { const r = await ambil(`https://api.github.com/repos/${REPO}/actions/${j}`, {headers: h, signal: AbortSignal.timeout(8000)}); if (!r.ok) { r.body?.cancel(); throw new Error(`GitHub HTTP ${r.status}`); } return r.json(); };
  let hasil;
  try {
    const [w, r] = await Promise.all([gh("workflows?per_page=100"), gh("runs?per_page=100")]);
    hasil = {tersedia: true, daftar: ringkasWorkflow(w.workflows || [], r.workflow_runs || [], kini)};
  } catch (e) { hasil = {tersedia: false, alasan: String(e?.message || e).slice(0, 80)}; }   // galat disimpan 1 menit saja: GitHub yang gagal tidak dipukul tiap muat ulang
  simpan = {t: kini, v: hasil};
  return hasil;
}

async function rute(env, req, url, kini) {
  if (!await stafOK(env, req, SEMUA_PERAN)) return gagal(403, "papan kesehatan hanya untuk admin atau staf BNPB");   // hak sama dengan /admin/kinerja dan /api/sla
  /* periksaStatus membaca D1 beberapa kali: disimpan 1 menit per isolate, setara cacheTepi 60 detik /api/status (kuota baca D1, 28 Okt) */
  const statusAwet = async () => { if (!(simpanStatus && kini >= simpanStatus.t && kini - simpanStatus.t < STATUS_MS)) simpanStatus = {t: kini, v: await periksaStatus(env, url, kini)}; return simpanStatus.v; };
  const [s, workflow] = await Promise.all([statusAwet(), muatWorkflow(env, kini)]);
  const r = json({kini: new Date(kini).toISOString(), status: {ok: s.ok, basi: s.basi, sumber: s.sumber}, workflow});
  r.headers.set("cache-control", "no-store");
  return r;
}
export const RUTE_KESEHATAN = {"GET /api/kesehatan": rute};
