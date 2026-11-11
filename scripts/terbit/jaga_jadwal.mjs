/* Pemeriksa jadwal yang terlewat, dijalankan jaga.yml (insiden 7-8 Nov 2026).
   GitHub membuang pemicu `schedule` di seluruh repo: jaga.yml (24 kali sehari) tinggal 4 lalu 2, titik.yml 10 kali sehari tinggal 5 lalu 2.
   Situs lalu menerbitkan firespot tanpa lintasan siang. `workflow_dispatch` tidak ikut dibuang, jadi cron Worker memicu jaga.yml tiap jam
   (src/jaga_jadwal.js) dan skrip ini memicu workflow yang terlewat. Uji: tests/agen/jaga_jadwal.test.mjs */
import {pathToFileURL} from "node:url";

const JEDA_MS = 50 * 60000;   // tak memicu lagi bila run terakhir baru dibuat; di bawah 60 menit karena jaga.yml dipicu tiap jam dan run dibuat beberapa detik sesudahnya
const JENDELA_MS = 2 * 3600000, TAHAN_GAGAL_MS = 6 * 3600000;

// Sama dengan PIPA di jaga.yml dan terbit_antre.yml (dijaga tests/agen/gerbang-antrean-data.test.mjs): grup concurrency `data` hanya punya
// satu slot antre, jadi dispatch tidak boleh mengusir run yang sedang menunggu slot itu.
export const PIPA = ["titik", "data", "banjir", "gempa", "lintas", "prediksi", "statis", "titik_palsu", "kemitraan"];

/* maks = menit sejak run sukses terakhir sebelum dianggap terlewat. Pemeriksaan tiap 60 menit, jadi run pengganti jatuh pada kelipatan 60 menit pertama di atas maks:
   titik tiap 3 jam, himawari tiap jam, jarak_pandang tiap 2 jam, udara 13 jam, harian 25 jam (dengan 24 jam run pengganti mendahului cron yang sedang telat).
   jam = [mulai, akhir] UTC workflow yang hanya aktif pada jam itu.
   jendela = [jam, menit mulai, jam, menit batas] UTC: putaran cut-off laporan, harus ada run sukses sesudah "mulai" begitu "batas" lewat.
   masukan = input workflow_dispatch. Urutan = prioritas, karena paling banyak satu workflow grup `data` dipicu per putaran. */
export const JADWAL = [
  {wf: "titik.yml", maks: 170, masukan: {jaga: "ya"}, jendela: [[9, 10, 9, 50], [22, 55, 23, 40]]},
  {wf: "himawari.yml", maks: 50},
  {wf: "jarak_pandang.yml", maks: 70, jam: [23, 10]},
  {wf: "udara.yml", maks: 770},
  {wf: "data.yml", maks: 1490, masukan: {jaga: "ya"}},
  {wf: "banjir.yml", maks: 1490},
  {wf: "gempa.yml", maks: 1490},
];

const ms = t => Date.parse(t);
const aktifJam = ([a, z], h) => (a <= z ? h >= a && h <= z : h >= a || h <= z);
const diPipa = nama => PIPA.includes(nama.split("/").pop().replace(/\.yml(@.*)?$/, ""));

/* runs = workflow_runs terbaru dulu. Hasil {aksi: "picu"|"tunggu", alasan}. */
export function putuskan(j, runs, kini) {
  if (!runs.length) return {aksi: "tunggu", alasan: "tanpa riwayat"};
  if (runs.some(r => r.status !== "completed")) return {aksi: "tunggu", alasan: "sedang jalan atau antre"};
  if (kini - ms(runs[0].created_at) < JEDA_MS) return {aksi: "tunggu", alasan: "run terakhir baru dibuat"};
  const w = new Date(kini);
  const sukses = runs.find(r => r.conclusion === "success"), tSukses = sukses ? ms(sukses.created_at) : 0;
  const cutoff = cutoffTerlewat(j, w, tSukses);
  // sumbernya yang rusak: memicu terus tidak menolong, dan run merah sudah memberi tahu pemilik. Sesudah 6 jam dicoba lagi: saat jadwal mati tidak ada yang membuat run baru.
  // Putaran cut-off laporan tetap dicoba: jendelanya 2 jam dan JEDA_MS membatasinya paling banyak 3 kali, sedangkan tahanan 6 jam bisa menelan cut-off itu seluruhnya (9 Nov 2026).
  if (!cutoff && runs.length >= 3 && runs.slice(0, 3).every(r => r.conclusion === "failure") && kini - ms(runs[0].created_at) < TAHAN_GAGAL_MS) return {aksi: "tunggu", alasan: "gagal tiga kali berturut"};
  if (j.jam && !aktifJam(j.jam, w.getUTCHours())) return {aksi: "tunggu", alasan: "di luar jam aktif"};
  if (cutoff) return {aksi: "picu", alasan: cutoff};
  if ((kini - tSukses) / 60000 > j.maks) return {aksi: "picu", alasan: `tanpa run sukses lebih dari ${j.maks} menit`};
  return {aksi: "tunggu", alasan: "segar"};
}

function cutoffTerlewat(j, w, tSukses) {
  const kini = w.getTime();
  for (const [h1, m1, h2, m2] of j.jendela || []) for (const hari of [0, -1]) {   // -1: jendela 22.55 masih berlaku sesudah 00.00 UTC
    const pada = (h, m) => Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() + hari, h, m);
    if (kini >= pada(h2, m2) && kini < pada(h2, m2) + JENDELA_MS && tSukses < pada(h1, m1)) return `putaran cut-off ${h1}.${m1} UTC terlewat`;
  }
  return null;
}

async function slotTerisi(baca, api) {
  for (const s of ["queued", "pending", "waiting", "requested"]) {
    const r = await baca(`${api}/runs?status=${s}&per_page=100`);
    if (!r.ok) return true;   // tidak yakin = jangan mengusir
    if (((await r.json()).workflow_runs || []).some(x => diPipa(x.path || ""))) return true;
  }
  return false;
}

export async function jalankan(token, kini, repo, f = fetch, pipaSudah = false) {
  const api = `https://api.github.com/repos/${repo}/actions`, hasil = [];
  const headers = {authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "jaga-jadwal"};
  const baca = u => f(u, {headers, signal: AbortSignal.timeout(20000)});
  let pipaDipicu = pipaSudah;   // langkah sebelumnya di jaga.yml bisa sudah memicu satu pipeline; run-nya belum tentu tampak di API
  for (const j of JADWAL) {
    const r = await baca(`${api}/workflows/${j.wf}/runs?per_page=5`);
    if (!r.ok) { hasil.push({wf: j.wf, galat: r.status}); continue; }
    const d = putuskan(j, (await r.json()).workflow_runs || [], kini);
    if (d.aksi !== "picu") { hasil.push({wf: j.wf, lewat: d.alasan}); continue; }
    if (diPipa(j.wf) && (pipaDipicu || await slotTerisi(baca, api))) { hasil.push({wf: j.wf, lewat: "slot antre terisi"}); continue; }
    const p = await f(`${api}/workflows/${j.wf}/dispatches`, {method: "POST", headers: {...headers, "content-type": "application/json"}, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ref: "main", ...(j.masukan ? {inputs: j.masukan} : {})})});
    if (p.status === 204) { hasil.push({wf: j.wf, dipicu: d.alasan}); pipaDipicu ||= diPipa(j.wf); } else hasil.push({wf: j.wf, galat: p.status});
  }
  return hasil;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const h of await jalankan(process.env.GH_TOKEN, Date.now(), process.env.GH_REPO, fetch, process.env.PIPA_SUDAH === "1")) console.log(JSON.stringify(h));
}
