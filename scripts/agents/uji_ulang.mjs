/* Uji worker di CI dengan satu ulangan sempit untuk crash runtime (21 Nov 2026: empat run terbit berturut-turut gagal karena workerd di
   runner GitHub mati di tengah berkas, lalu uji sesudahnya "fetch failed" atau "poisoned stub"; berkas yang sama lulus di lokal).
   Tiap berkas jalan sendiri, berurutan (sama dengan node --test --test-concurrency=1, yang juga memberi tiap berkas prosesnya sendiri).
   Berkas yang gagal diulang SEKALI hanya bila SETIAP kegagalannya bersidik crash runtime (SIDIK) atau rantai lanjutannya ("gagal lebih
   dulu"); satu saja kegagalan asersi = gagal tanpa ulangan. Ulangan yang gagal lagi = gagal. Tidak ada uji yang dilewati.
   Pakai: node scripts/agents/uji_ulang.mjs tests/warga/*.test.mjs */
import {spawnSync} from "node:child_process";

const SIDIK = [/fetch failed/, /poisoned stub/i, /ECONNREFUSED|ECONNRESET|socket hang up|other side closed/, /workerd/i];
const RANTAI = /gagal lebih dulu/;

/* TAP satu berkas -> daftar kegagalan {err, infra}. Induk yang gagal karena anaknya dilewati; anaknya sudah dihitung. */
export function kegagalan(tap) {
  const hasil = [], baris = tap.split("\n");
  for (let i = 0; i < baris.length; i++) {
    if (!/^\s*not ok \d+ - /.test(baris[i])) continue;
    let blok = ""; for (let j = i + 1; j < baris.length && !/^\s*(not )?ok \d+ - /.test(baris[j]); j++) blok += baris[j] + "\n";
    if (/failureType: 'subtestsFailed'/.test(blok)) continue;
    const err = (blok.match(/^\s*error: (.*)$/m) || [])[1] || "";
    hasil.push({err, infra: SIDIK.some(r => r.test(blok)) || RANTAI.test(err)});
  }
  return hasil;
}

function satu(f) {
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", f], {encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "inherit"]});
  return {kode: r.status ?? 1, tap: r.stdout || ""};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let gagal = 0, diulang = 0;
  for (const f of process.argv.slice(2)) {
    let r = satu(f); process.stdout.write(r.tap);
    if (r.kode === 0) continue;
    const k = kegagalan(r.tap), asersi = k.filter(x => !x.infra);
    if (k.length && !asersi.length) {
      diulang++; console.error(`uji_ulang: ${f}: ${k.length} kegagalan bersidik crash runtime; diulang sekali.`);
      r = satu(f); process.stdout.write(r.tap);
      if (r.kode === 0) { console.error(`uji_ulang: ${f}: ulangan lulus.`); continue; }
    }
    gagal++; console.error(`uji_ulang: ${f} GAGAL${asersi.length ? ` (${asersi.length} kegagalan asersi, tidak diulang)` : ""}.`);
  }
  console.error(`uji_ulang: ${gagal} berkas gagal, ${diulang} berkas diulang karena crash runtime.`);
  process.exit(gagal ? 1 : 0);
}
