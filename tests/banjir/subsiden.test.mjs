// Penurunan tanah (PT-11): swa-uji skrip + bentuk berkas keluaran bila sudah ada (data InSAR menunggu Q1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

for (const s of ['subsiden', 'proyeksi_tanah']) {
  test(`${s}.py swa-uji`, () => {
    const out = execFileSync('python3', [`scripts/banjir/${s}.py`, 'uji'], { encoding: 'utf8', timeout: 120000 });
    assert.match(out, /OK/);
  });
}

const SUB = 'public/banjir/data/subsiden.json';
const PRO = 'public/banjir/data/proyeksi_tanah.json';

test('subsiden.json (T5): label hipotesis, atribusi, med masuk akal, n >= 10', { skip: !existsSync(SUB) && 'subsiden.json belum ada (Q1)' }, () => {
  const d = JSON.parse(readFileSync(SUB, 'utf8'));
  assert.match(d.label, /hipotesis/i);
  assert.ok(d.atribusi);
  assert.ok(d.kecamatan.length > 0);
  for (const k of d.kecamatan) {
    assert.ok(k.n >= 10, k.kec);
    assert.ok(k.med >= -30 && k.med <= 5, `${k.kec} med ${k.med}`);
  }
});

test('proyeksi_tanah.json (T4, T6): hipotesis, urut, tanpa angka gabungan', { skip: !existsSync(PRO) && 'proyeksi_tanah.json belum ada (Q1)' }, () => {
  const d = JSON.parse(readFileSync(PRO, 'utf8'));
  assert.match(d.label, /hipotesis/i);
  assert.ok(!/rob|laut|gabung/i.test(Object.keys(d).join(' ')));
  for (const k of d.kecamatan) {
    assert.ok(k.hipotesis && k.cakupan >= 30, k.kec);
    for (const t of ['t10_cm', 't20_cm']) assert.ok(k[t].rendah <= k[t].pusat && k[t].pusat <= k[t].tinggi, `${k.kec} ${t}`);
    assert.ok(!Object.keys(k).some((a) => /rob|laut|gabung/i.test(a)), k.kec);
  }
});
