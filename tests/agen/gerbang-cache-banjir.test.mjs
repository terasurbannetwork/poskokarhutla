// Gerbang cache deploy (insiden 4, 7, 9 Nov 2026): tiap `wrangler deploy` mengirim seluruh situs. udara.yml men-deploy tanpa memulihkan cache banjir-,
// jadi public/banjir/data terkirim dari git (Oktober) dan banjir, rob, cuaca, gelombang, gunung api, berita di situs mundur sampai deploy berikutnya; citra
// satelit (tidak ada di git) juga tidak dipulihkan. jaga_segar.py hanya memeriksa public/data, sehingga tidak menangkapnya.
// Workflow yang men-deploy wajib memulihkan cache banjir- dan citra- sebelum tiap deploy, dalam job yang sama.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";

const W = ".github/workflows";
const berkas = readdirSync(W).filter(f => f.endsWith(".yml"));
const tanpaKomentar = f => readFileSync(`${W}/${f}`, "utf8").split("\n").filter(b => !/^\s*#/.test(b));
const DEPLOY = /wrangler(@[\d.]+)?\s+deploy\b/;

/* untuk tiap baris deploy: langkah-langkah job-nya sampai deploy itu */
function langkahPerDeploy(baris) {
  return baris.flatMap((b, i) => {
    if (!DEPLOY.test(b)) return [];
    let awal = 0;
    for (let k = 0; k < i; k++) if (/^ {2}[\w-]+:\s*$/.test(baris[k])) awal = k;
    return [baris.slice(awal, i).join("\n").split(/^(?= {6}- )/m)];
  });
}

const pulih = (kunci, ...jalur) => l => /actions\/cache\/restore@/.test(l) && new RegExp(`key:\\s*${kunci}-`).test(l) && jalur.every(j => new RegExp(`^\\s*${j}\\s*$`, "m").test(l));
const banjir = pulih("banjir", "public/banjir/data", "data/raw/banjir");
const citra = pulih("citra", "public/data/citra", "public/data/citra\\.json");
const deployer = berkas.filter(f => tanpaKomentar(f).some(b => DEPLOY.test(b)));

test("pencarian workflow deploy menemukan semua penerbit", () => {
  assert.ok(deployer.length >= 6 && deployer.includes("udara.yml") && deployer.includes("titik.yml"), `pencarian workflow deploy rusak: ${deployer}`);
});

for (const [nama, cek] of [["banjir-", banjir], ["citra-", citra]])
  test(`tiap deploy didahului pemulihan cache ${nama} dalam job yang sama`, () => {
    const salah = deployer.filter(f => !langkahPerDeploy(tanpaKomentar(f)).every(l => l.some(cek)));
    assert.deepEqual(salah, [], `men-deploy tanpa memulihkan cache ${nama} (data lama dari git atau data hilang menimpa yang tayang): ${salah}`);
  });

test("udara.yml memulihkan banjir sesudah commit, gagal bila cache tidak ada, dan menyalin peringatan BMKG", () => {
  const [l] = langkahPerDeploy(tanpaKomentar("udara.yml"));
  const iPulih = l.findIndex(banjir), iCommit = l.findIndex(x => /name: Commit data udara ke main/.test(x)), iSalin = l.findIndex(x => /cp public\/banjir\/data\/peringatan\.json public\/data\//.test(x));
  assert.ok(iCommit >= 0 && iPulih > iCommit, "dipulihkan sesudah commit, supaya git pull --autostash tidak bentrok dengan berkas banjir");
  assert.match(l[iPulih], /fail-on-cache-miss:\s*true/);
  assert.ok(iSalin > iPulih, "peringatan BMKG disalin sesudah cache banjir dipulihkan");
});
