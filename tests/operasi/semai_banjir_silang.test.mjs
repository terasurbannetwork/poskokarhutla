/* Uji silang SB-09: semai_murni.py (acuan) lawan operasi_semai_murni.js pada angka yang sama.
   (1) faktor H, skor, NMS: grid masukan dijalankan di Python dan JS, hasilnya harus sama.
   (2) fixture_semai_banjir.json (Kendari): hitung_banjir di Python menghasilkan kandidat_sasaran dan zona; JS menghitung ulang zona dari kandidat
       yang sama dengan bobot bawaan dan harus mendarat di sel dan skor yang sama (ALGORITMA semai-banjir §8). */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const mod = await import("../../public/operasi_semai_murni.js");
const M = globalThis.OpsSemaiMurni || mod.default;
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const py = kode => { const r = spawnSync("python3", ["-c", kode], {cwd: REPO, encoding: "utf8", maxBuffer: 64e6, timeout: 120000}); assert.equal(r.status, 0, `python berhenti dengan galat: ${r.stderr}`); return JSON.parse(r.stdout.trim().split("\n").pop()); };
const PRA = `import sys, json; sys.path.insert(0, "scripts/operasi"); import semai as S; M = S.M\n`;

test("H, skor, dan NMS: Python dan JS sama", () => {
  const tiba = [null, 0, 0.99, 1, 2, 3, 3.5, 3.99, 4, 6], Q = [0.1, 0.566, 1], H = [0.5, 1], P = [0.2, 1];
  const cells = Array.from({length: 40}, (_, i) => ({lat: -6 + (i % 8) * 0.15, lon: 106 + Math.floor(i / 8) * 0.2, skor: Math.round((0.2 + ((i * 37) % 80) / 100) * 1000) / 1000}));
  const p = py(PRA + `T = json.loads(${JSON.stringify(JSON.stringify(tiba))}); C = json.loads(${JSON.stringify(JSON.stringify(cells))})
print(json.dumps({"h": [M.faktor_h(t) for t in T], "s": [M.skor(q, h, pp, (0.45, 0.4, 0.15)) for q in ${JSON.stringify(Q)} for h in ${JSON.stringify(H)} for pp in ${JSON.stringify(P)}],
  "z": [[z["lat"], z["lon"], z["skor"]] for z in M.zona_nms(C, 40, 5, 0.35)]}))`);
  assert.deepEqual(tiba.map(t => M.faktorH(t)), p.h, "faktor H");
  const s = []; for (const q of Q) for (const h of H) for (const pp of P) s.push(M.skorBanjir(q, h, pp));
  s.forEach((v, i) => assert.ok(Math.abs(v - p.s[i]) < 1e-12, `skor ${i}: JS ${v} lawan Python ${p.s[i]}`));
  assert.deepEqual(M.zonaNms(cells).map(z => [z.lat, z.lon, z.skor]), p.z, "zona NMS");
  assert.equal(M.skorBanjir(0.566, 0.5, 1).toFixed(2), "0.59", "contoh ALGORITMA §6");
});

test("fixture Kendari: zona hitung ulang dari kandidat sama dengan zona mesin", () => {
  const p = py(PRA + `b = S.muat_json("scripts/operasi/semai_bobot.json"); F = S.muat_json("scripts/operasi/fixture_semai_banjir.json")
b["banjir"]["sasaran_tetap"]["nilai"] = F["bobot_timpa"]["sasaran_tetap"]
init, A, mk = S.medan_fixture(F); med = mk(b)
kota = S.muat_json("scripts/udara/kota.json")["baris"]
kabs = [S.siapkan_kab(k["kode"], k["nama"], k["prov"], k["lat"], k["lon"], {"type": "MultiPolygon", "coordinates": k["polys"]}) for k in F["kab"]]
ps = M.pilih_sasaran(F["hari"], F["prediksi"], F["bmkg"], b)
tempat, _ = S.tempat_py(); base = S.bandara_gabung(__import__("renlap").muat_base())
r = S.hitung_banjir(med, kabs, kota, base, tempat, S.prov_nama(), b, ps["sasaran"], F["hari"], F["putaran"])
print(json.dumps({"kandidat_kolom": r["kandidat_kolom"], "kandidat_sasaran": r["kandidat_sasaran"], "zona": [[z["lat"], z["lon"], z["skor"]] for z in r["zona"]]}))`);
  assert.ok(p.kandidat_sasaran.length > 0, "fixture memuat kandidat");
  const z = M.hitungUlangBanjir(p);
  assert.deepEqual(z.map(x => [x.lat, x.lon, Math.round(x.skor * 100) / 100]), p.zona, "sel dan skor zona");
});

test("bobot digeser: JS menormalkan, urutan zona mengikuti bobot, skor nol bila satu faktor nol", () => {
  assert.deepEqual(M.normBobot([1, 1, 2]), [0.25, 0.25, 0.5]);
  assert.equal(M.skorBanjir(0.8, 0, 1), 0);
  const d = {kandidat_kolom: ["lat", "lon", "langkah", "Q", "H", "P", "sasaran_idx", "laut"], kandidat_sasaran: [[-6, 106, 24, 0.9, 0.5, 1, 0, 1], [-6, 107, 24, 0.5, 1, 1, 0, 1]]};
  assert.equal(M.hitungUlangBanjir(d, [0.9, 0.05, 0.05])[0].lon, 106);
  assert.equal(M.hitungUlangBanjir(d, [0.05, 0.9, 0.05])[0].lon, 107);
});

test("ringkasan banjir: susunan dan kalimat batas, tanpa klaim terlarang", () => {
  const data = {dibuat: "2026-11-24T22:30:00Z", putaran: {init: "2026-11-25T12:00:00Z"}, hari_sasaran: "2026-11-26", sasaran: [{kab: "3172", nama: "Kota Jakarta Utara", asal: ["bmkg", "tetap"]}, {kab: "3201", nama: "Kab. Bogor", asal: ["tetap"]}],
    zona: [{huruf: "A", kota: "lepas pantai dekat Kota Tangerang", prov: "Banten", skor: 0.59, jendela_teks: "10.00 sampai 13.00 WIB", cegat: [{kab: "3172", tiba_jam: 3.5}], base: {nama: "Halim", icao: "WIHH", menit: 10}}]};
  const t = M.ringkasanBanjir(data);
  assert.match(t, /^Peluang semai \(banjir\), Rab 25 Nov, 05\.30 WIB \(ECMWF 12z\)\nSasaran: Jakarta Utara \(BMKG, daftar tetap\), Bogor \(daftar tetap\)/);
  assert.match(t, /- BA lepas pantai dekat Kota Tangerang, 10\.00 sampai 13\.00 WIB, skor 0,59, tiba di sasaran sekitar 3,5 jam, dari Halim \(WIHH\) sekitar 10 menit/);
  assert.match(t, /Usulan mesin, bukan prakiraan resmi\. Konfirmasi tiap operasi dengan BMKG\.$/);
  for (const k of ["mencegah banjir", "aman", "akan hujan", "pasti", "berhasil"]) assert.ok(!new RegExp(`\\b${k}\\b`, "i").test(t), `kata terlarang: ${k}`);
  assert.match(M.ringkasanBanjir({galat: 404}), /belum tersedia/);
  assert.match(M.kalimatKosongB("tidak_ada_sasaran", "2026-11-26"), /untuk 2026-11-26/);
});

test("CSV mengutip koma dan tanda kutip", () => { assert.equal(M.csv([["a", 'b,"c"'], [1, null]]), 'a,"b,""c"""\n1,'); });

test("kuota provinsi ber-OMC (K5) dan kejadian (K6): zona_kuota Python dan JS sama", () => {
  const cells = Array.from({length: 24}, (_, i) => ({lat: -3 + (i % 6) * 0.8, lon: 98 + Math.floor(i / 6) * 0.9, skor: Math.round((0.36 + ((i * 29) % 60) / 100) * 100) / 100,
    provs: i % 3 === 0 ? ["11"] : i % 3 === 1 ? ["12", "11"] : ["35"], kej: i % 5 === 0}));
  const p = py(PRA + `C = json.loads(${JSON.stringify(JSON.stringify(cells))})
print(json.dumps([[z["lat"], z["lon"], z["skor"], z.get("kuota")] for z in M.zona_kuota(C, ["11", "12"], 40, 5, 0.35, 3)]))`);
  const j = M.zonaKuota(cells, ["11", "12"]).map(z => [z.lat, z.lon, z.skor, z.kuota ?? null]);
  assert.deepEqual(j, p, "zona kuota");
  assert.ok(j.some(z => z[3] === "11"), "ada zona berkuota");
  const tanpaKej = cells.map(c => ({...c, kej: false}));
  assert.deepEqual(M.zonaKuota(tanpaKej, []).map(z => [z.lat, z.lon]), M.zonaNms(tanpaKej).map(z => [z.lat, z.lon]), "tanpa OMC dan kejadian = zonaNms lama");
  assert.ok(M.zonaKuota(cells, []).length <= 5);
});
