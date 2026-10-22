/* Gerbang mekanis standar uji (tanpa database): rute/tabel/trigger baru di src/ atau migrations/ yang belum
   tercatat di tests/warga/cakupan.json — diuji (dengan nama uji yang benar-benar ada) atau dikecualikan (dengan alasan) — ditolak. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {AKAR, migrasi} from "./_bantu.mjs";

const C = JSON.parse(readFileSync(path.join(AKAR, "tests/warga/cakupan.json"), "utf8"));
const BATAS_ANTRE = 2;   // hanya boleh diturunkan

function temukan() {
  const w = readFileSync(path.join(AKAR, "src/worker.js"), "utf8"), out = new Set(["GET /api/warga", "POST /api/warga", "GET /api/warga/:id", "aset statis"]);
  for (const [, x] of w.matchAll(/p\[0\] === "(\w+)"/g)) out.add("/" + x);
  for (const [, x] of w.matchAll(/p\[1\] === "(\w+)"/g)) out.add("POST /:id/" + x);
  for (const [, x] of w.matchAll(/url\.pathname === "(\/api\/\w+)"/g)) out.add("GET " + x);
  if (/bersihkan\(env\)/.test(w)) out.add("cron bersihkan");
  if (/perbaruiTitik\(env\)/.test(w)) out.add("cron titik");
  const f = readFileSync(path.join(AKAR, "src/foto.js"), "utf8");   // RUTE_FOTO digabung ke RUTE
  const e = readFileSync(path.join(AKAR, "src/ews.js"), "utf8") + readFileSync(path.join(AKAR, "src/sosmed.js"), "utf8") + readFileSync(path.join(AKAR, "src/posko.js"), "utf8");   // RUTE_EWS + RUTE_SOSMED + RUTE_POSKO digabung ke RUTE
  /* Ruang Koordinasi BNPB: RUTE_BNPB, RUTE_RELAWAN, RUTE_ALUN, RUTE_RISET, RUTE_MEJA digabung ke RUTE */
  const bn = ["bnpb", "relawan", "alun", "riset", "meja", "sitrep", "pengingat", "instansi", "penugasan", "staf", "pantau", "inventaris", "korban", "laporan_karhutla", "omc", "operasi_lapangan", "push", "sla", "pipa"].map(m => readFileSync(path.join(AKAR, `src/${m}.js`), "utf8")).join("\n");
  if (/bersihkanBnpb\(env/.test(w)) out.add("cron bersihkanBnpb");
  if (/arsipkanSitrep\(env/.test(w)) out.add("cron arsipkanSitrep");
  if (/buatTugas\(env/.test(w)) out.add("cron buatTugas");
  if (/bersihkanInstansi\(env/.test(w)) out.add("cron bersihkanInstansi");
  if (/kirimPushDaerah\(env/.test(w)) out.add("cron kirimPushDaerah");
  if (/catatRiwayatStatus\(env/.test(w)) out.add("cron catatRiwayatStatus");
  if (/alarmHimawari\(env/.test(w)) out.add("cron alarmHimawari");
  if (/kabarDarurat\(/.test(readFileSync(path.join(AKAR, "src/penugasan.js"), "utf8"))) out.add("cron kabarDarurat");
  if (/kabarLevel3\(/.test(readFileSync(path.join(AKAR, "src/instansi.js"), "utf8"))) out.add("cron kabarLevel3");
  if (/catatAwalTugas\(/.test(readFileSync(path.join(AKAR, "src/instansi.js"), "utf8"))) out.add("cron kunciAlarmVIIRS");
  if (/bersihkanPantau\(env/.test(w)) out.add("cron bersihkanPantau");
  if (/bersihkanStaf\(env/.test(w)) out.add("cron bersihkanStaf");
  if (/buatPengingat\(env/.test(w)) out.add("cron buatPengingat");
  if (/buatPengingat\(env/.test(w)) out.add("cron buatPengingat");
  if (/buatDrafLaporanKarhutla\(env/.test(w)) out.add("cron buatDrafLaporanKarhutla");
  for (const [, x] of (w + "\n" + f + "\n" + e + "\n" + bn).matchAll(/^\s*"((?:GET|POST) \/[\w\/:]+)":/gm)) out.add(x);   // tabel RUTE (statistik, admin, pesan, foto)
  const gm = readFileSync(path.join(AKAR, "src/gempa.js"), "utf8");   // katalog gempa: rute baca + cron
  for (const [, x] of gm.matchAll(/j === "(\/api\/gempa\/\w+)"/g)) out.add("GET " + x);
  if (/perbaruiGempa\(env/.test(w)) out.add("cron gempa");
  for (const [, x] of readFileSync(path.join(AKAR, "src/sihka.js"), "utf8").matchAll(/"(\/api\/banjir\/[\w-]+)"/g)) out.add("GET " + x);   // SIHKA: semua rute baca
  if (/dasarSihka\(env/.test(w)) out.add("cron dasar sihka");
  if (/perbaruiSihka\(env/.test(w)) out.add("cron sihka");
  const pr = readFileSync(path.join(AKAR, "src/peringatan.js"), "utf8");   // peringatan dini: rute baca, rute admin, cron
  if (/j === "\/api\/peringatan\/aktif"/.test(pr)) out.add("GET /api/peringatan/aktif");
  if (/\/api\/admin\/peringatan\//.test(pr)) out.add("POST /api/admin/peringatan/:kunci/cabut");
  if (/periksaPeringatan\(env/.test(w)) out.add("cron peringatan");
  if (/bersihkanFoto\(env\)/.test(w)) out.add("cron bersihkanFoto");
  if (/buatAntrean\(env/.test(w)) out.add("cron antrean posko");
  if (/bersihkanPosko\(env/.test(w)) out.add("cron bersihkanPosko");
  for (const [, x] of w.matchAll(/(prosesGempa|kirimEws|bersihkanEws)\(env/g)) out.add("cron " + x);
  if (/HTML_RUTE/.test(w)) out.add("hit HTML (HTML_RUTE)");
  for (const [, x] of w.matchAll(/(catatGangguan|musnahkanGaram|perbaruiRentang)\(/g)) out.add("cron " + x);
  for (const [, j, n] of migrasi().matchAll(/CREATE (TABLE|TRIGGER) (?:IF NOT EXISTS )?(\w+)/g)) out.add(j.toLowerCase() + " " + n);
  return [...out];
}

test("tiap rute, tabel, dan trigger tercatat di cakupan.json", () => {
  const belum = temukan().filter(k => !(k in C.diuji) && !(k in C.dikecualikan));
  assert.deepEqual(belum, [], `${belum.length} hal belum punya uji integrasi atau alasan pengecualian: ${belum.join(", ")} — tambahkan ke tests/warga/cakupan.json`);
});

test("tiap entri 'diuji' menunjuk nama uji yang benar-benar ada", () => {
  const teks = readdirSync(path.join(AKAR, "tests/warga")).filter(f => f.endsWith(".test.mjs") && f !== "gerbang.test.mjs")
    .map(f => readFileSync(path.join(AKAR, "tests/warga", f), "utf8")).join("\n");
  const yatim = Object.entries(C.diuji).filter(([, nama]) => !teks.includes(`uji("${nama}`)).map(([k, n]) => `${k} -> "${n}"`);
  assert.deepEqual(yatim, [], `${yatim.length} entri diuji tanpa uji yang cocok: ${yatim.join("; ")}`);
});

test("tiap pengecualian punya alasan, antre tidak bertambah", () => {
  const kosong = Object.entries(C.dikecualikan).filter(([, a]) => String(a).trim().length < 15).map(([k]) => k);
  assert.deepEqual(kosong, [], `pengecualian tanpa alasan memadai (< 15 karakter): ${kosong}`);
  const n = Object.keys(C.antre).length;
  assert.ok(n <= BATAS_ANTRE, `antre ${n} > batas ${BATAS_ANTRE}: utang uji hanya boleh menyusut`);
});
