/* Denyut jaga.yml (insiden 7-8 Nov 2026): GitHub membuang pemicu `schedule` di seluruh repo, termasuk jaga.yml sendiri, sedangkan `workflow_dispatch`
   tetap jalan. Cron Worker tidak bergantung pada GitHub, jadi sekali per jam ia memicu jaga.yml; pemeriksaan workflow yang terlewat ada di
   scripts/terbit/jaga_jadwal.mjs. Satu subrequest, tanpa mengurai apa pun. */
export async function denyutJaga(env, f = fetch) {
  if (!env.GITHUB_TOKEN) return {lewat: "tanpa token"};
  const r = await f("https://api.github.com/repos/terasurbannetwork/poskokarhutla/actions/workflows/jaga.yml/dispatches", {method: "POST", signal: AbortSignal.timeout(8000),
    headers: {authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "denyut-jaga", "content-type": "application/json"},
    body: JSON.stringify({ref: "main"})});
  r.body?.cancel().catch(() => {});
  return r.status === 204 ? {dipicu: true} : {galat: r.status};
}
