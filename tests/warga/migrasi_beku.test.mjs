/* Gerbang migrasi beku (22 Okt 2026). Dua kejadian hari itu: 0029 disunting SESUDAH diterapkan di produksi (batas rekomendasi 2000 -> 3000 dan
   'pembasah_l' di trigger isian). Uji lokal membangun skema dari berkas repo, jadi lolos, sementara D1 produksi menolak: cron gagal tiap menit dan
   tugas_api produksi kosong, dan kabar regu berisi pembasah ditolak. Dua gerbang:
   1. isi tiap berkas migrasi dibekukan (sha256 di migrasi_beku.json). Berkas lama berubah = gagal: perubahan skema WAJIB migrasi baru.
      Migrasi baru: tambahkan hash-nya ke migrasi_beku.json di commit yang sama (pesan galat mencetak barisnya).
   2. batas panjang yang dipakai kode (pasRekomendasi, pasAkses, pasKartu) SAMA PERSIS dengan CHECK length(...) di skema hasil semua migrasi:
      lebih besar = D1 menolak seluruh batch; lebih kecil = data terbuang tanpa alasan. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: instansi.js dan worker.js saling impor
import {pasRekomendasi, pasAkses, pasKartu} from "../../src/instansi.js";

const DIR = path.join(AKAR, "migrations"), BEKU = path.join(AKAR, "tests/warga/migrasi_beku.json");

test("migrasi yang sudah ada tidak disunting; migrasi baru tercatat hash-nya", () => {
  const beku = JSON.parse(readFileSync(BEKU, "utf8")), salah = [], baru = [];
  for (const f of readdirSync(DIR).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort()) {
    const h = createHash("sha256").update(readFileSync(path.join(DIR, f))).digest("hex");
    if (!(f in beku)) baru.push(`  "${f}": "${h}",`);
    else if (beku[f] !== h) salah.push(f);
  }
  assert.deepEqual(salah, [], `migrasi berikut berubah sesudah dibekukan; kembalikan isinya dan tulis perubahan skema sebagai migrasi BARU: ${salah.join(", ")}`);
  assert.deepEqual(baru, [], `migrasi baru belum tercatat; tambahkan baris ini ke tests/warga/migrasi_beku.json:\n${baru.join("\n")}`);
  for (const f of Object.keys(beku)) assert.ok(readdirSync(DIR).includes(f), `${f} tercatat tetapi berkasnya hilang; migrasi yang sudah diterapkan tidak boleh dihapus`);
});

/* skema hasil semua migrasi, dibangun di SQLite memori (sama dengan yang dilihat D1 sesudah migrations apply) */
function batasSkema() {
  const db = new DatabaseSync(":memory:");
  for (const s of pecah(migrasi())) db.exec(s);
  const sql = t => db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(t)?.sql ?? "";
  const batas = (t, k) => { const m = sql(t).match(new RegExp(`length\\(${k}\\)\\s*<=\\s*(\\d+)`)); assert.ok(m, `CHECK length(${k}) di ${t} tidak ditemukan`); return Number(m[1]); };
  return {rekomendasi: batas("tugas_api", "rekomendasi"), akses: batas("tugas_api", "akses"), kartu: batas("tugas_kartu", "kartu")};
}

test("batas pasRekomendasi, pasAkses, pasKartu sama persis dengan CHECK di skema", () => {
  const B = batasSkema();
  /* objek yang tidak bisa dipangkas fungsi pas*: panjang JSON tepat n huruf */
  const pas = (n, kunci) => { const o = {[kunci]: ""}; o[kunci] = "a".repeat(n - JSON.stringify(o).length); return o; };
  for (const [nama, fn, kunci, n] of [["rekomendasi", pasRekomendasi, "x", B.rekomendasi], ["akses", pasAkses, "x", B.akses], ["kartu", pasKartu, "insiden_awal", B.kartu]]) {
    const tepat = fn(pas(n, kunci));
    assert.ok(tepat && tepat.length === n, `${nama}: JSON ${n} huruf (= CHECK) harus disimpan utuh, dapat ${tepat?.length ?? null}; batas kode lebih kecil dari CHECK`);
    assert.equal(fn(pas(n + 1, kunci)), null, `${nama}: JSON ${n + 1} huruf melewati CHECK ${n} dan akan ditolak D1; batas kode lebih besar dari CHECK`);
  }
});
