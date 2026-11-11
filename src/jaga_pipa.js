/* Cadangan pemicu titik.yml dari cron Worker (pemilik 7 Nov 2026: "ya, pasang").
   7 Nov 2026 GitHub tidak membuat dua run terjadwal titik.yml (10.40 dan 13.40 WIB) dan jaga.yml ikut jarang jalan: hotspot /api/titik
   (cron Worker) sudah 396 di Papua Selatan, tetapi firespot, cluster, dan harian30 masih dari 08.18 WIB. jaga.yml hanya memicu ulang run
   yang cancelled, bukan run yang tidak pernah dibuat. Cron Worker andal, jadi dari sini: bila run sukses terakhir > 4 jam dan tak ada run
   grup data yang antre/jalan, picu workflow_dispatch sekali. Paling banyak sekali per 3 jam (run terbaru apa pun < 3 jam = lewat).
   Butuh secret GITHUB_TOKEN (fine-grained, Actions: read and write, repo ini saja); tanpa token = lewat diam-diam. */
const REPO = "terasurbannetwork/poskokarhutla", JAM = 3600e3, BASI = 4 * JAM, JEDA = 3 * JAM;
export const PIPA = /workflows\/(titik|data|banjir|gempa|lintas|prediksi|statis|titik_palsu|kemitraan)\.yml$/;   // grup concurrency `data` (dijaga tests/warga/jaga_titik.test.mjs)

export async function jagaTitik(env, sekarang, ambil = fetch) {
  if (!env.GITHUB_TOKEN) return {lewat: "tanpa token"};
  const h = {authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "centurisk97-jaga"};
  const gh = async j => { const r = await ambil(`https://api.github.com/repos/${REPO}/actions/${j}`, {headers: h, signal: AbortSignal.timeout(8000)}); if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`); return r.json(); };
  const umur = run => run ? sekarang - Date.parse(run.created_at) : Infinity;   // NaN (created_at rusak) = gagal tertutup di bawah
  const [sukses, terbaru] = await Promise.all([gh("workflows/titik.yml/runs?status=success&per_page=1"), gh("workflows/titik.yml/runs?per_page=1")]);
  const u = umur(sukses.workflow_runs?.[0]);
  if (Number.isNaN(u) || u <= BASI) return {lewat: "segar", umur_jam: +(u / JAM).toFixed(1)};
  const ut = umur(terbaru.workflow_runs?.[0]);
  if (Number.isNaN(ut) || ut < JEDA) return {lewat: "run baru < 3 jam", umur_jam: +(u / JAM).toFixed(1)};
  const semua = await gh("runs?per_page=30");   // dispatch mengusir run antre di grup data: jangan memicu bila slotnya terisi
  if ((semua.workflow_runs || []).some(r => r.status !== "completed" && PIPA.test(r.path || ""))) return {lewat: "grup data sibuk"};
  const r = await ambil(`https://api.github.com/repos/${REPO}/actions/workflows/titik.yml/dispatches`, {method: "POST", headers: {...h, "content-type": "application/json"},
    body: JSON.stringify({ref: "main"}), signal: AbortSignal.timeout(8000)});
  r.body?.cancel().catch(() => {});
  return r.status === 204 ? {dipicu: true, umur_jam: +(u / JAM).toFixed(1)} : {gagal: `dispatch HTTP ${r.status}`};
}
