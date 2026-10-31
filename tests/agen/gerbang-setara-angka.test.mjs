// Gerbang rekomendasi 100: "setara" di data/kajian-bnpb/data/angka.json harus menunjuk kunci yang
// ada dan simetris. Nilai TIDAK dituntut sama: selisih antardokumen resmi adalah fakta yang dilaporkan
// ke selisih.json oleh bangun/selisih.py.
// Akibat gagal: grup setara putus (a menunjuk b, b tidak menunjuk a) atau menunjuk kunci hilang,
// sehingga selisih.json diam-diam melewatkan pasangan. Perbaikan: samakan daftar "setara" di kedua sisi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KAJIAN = fileURLToPath(new URL('../../data/kajian-bnpb/', import.meta.url));
const angka = JSON.parse(readFileSync(KAJIAN + 'data/angka.json', 'utf8')).angka;

test('selisih.py --uji lolos', () => {
  const out = execFileSync('python3', [KAJIAN + 'bangun/selisih.py', '--uji'], { encoding: 'utf8' });
  assert.match(out, /OK/);
});

test('setara menunjuk kunci yang ada dan simetris', () => {
  const rusak = [];
  let n = 0;
  for (const [k, e] of Object.entries(angka)) {
    for (const t of e.setara || []) {
      n++;
      if (!angka[t]) rusak.push(`${k} -> ${t} tidak ada`);
      else if (!(angka[t].setara || []).includes(k)) rusak.push(`${k} -> ${t} tidak simetris`);
      if (t === k) rusak.push(`${k} menunjuk dirinya`);
    }
  }
  assert.ok(n > 0, 'registri tidak punya satu pun pasangan setara');
  assert.deepEqual(rusak, []);
});
