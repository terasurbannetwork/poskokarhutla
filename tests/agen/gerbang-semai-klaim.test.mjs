// Gerbang SB-14: berkas semai tidak boleh memuat klaim terlarang.
// Sumber aturan: data/kajian-bnpb/semai-banjir/KEPUTUSAN-SEMAI-BANJIR.md D10 dan
// semai-awan/KEPUTUSAN-SEMAI.md D8 ("akan hujan", "akan padam", "aman", ...).
// Akibat bila dilanggar: layar atau renlap menjanjikan hasil yang tidak bisa dijamin
// OMC (BMKG: "mitigasi, bukan solusi banjir"). Perbaikan: pakai kalimat baku
// "awan layak semai", "hujan dilepas sebelum sasaran (usulan)", "konfirmasi BMKG".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const TERLARANG = [
  'aman', 'akan hujan', 'akan padam', 'mencegah banjir', 'memadamkan',
  'memindah banjir', 'hujan berkurang', 'pasti',
];
const POLA = new RegExp(`(?<![\\p{L}\\p{N}_])(${TERLARANG.join('|')})(?![\\p{L}\\p{N}_])`, 'iu');

// Pengecualian terdokumentasi: "berkas:baris-berisi-potongan" yang sah (mis. kalimat
// negasi di komentar). Kosong; tambah hanya dengan alasan tertulis.
const KECUALI = [];

const BERKAS = [
  ['public', /^(operasi_semai.*\.(js|css|html)|renlap_omc\..*)$/],
  ['scripts/operasi', /^semai.*\.py$/],
  ['scripts/omc', /^efek_banjir\.py$/],
  ['src', /^operasi_semai\.js$/],
];

export function cariKlaim(teks, nama) {
  const temu = [];
  teks.split('\n').forEach((baris, i) => {
    const m = POLA.exec(baris);
    if (m && !KECUALI.some(k => k.berkas === nama && baris.includes(k.potongan))) {
      temu.push(`${nama}:${i + 1} memuat "${m[1]}"`);
    }
  });
  return temu;
}

test('gerbang menolak klaim terlarang (bukti penjaga tidak lepas)', () => {
  assert.equal(cariKlaim('x = "Hujan akan hujan besok"', 'a.js').length, 1);
  assert.equal(cariKlaim('<p>Wilayah AMAN</p>', 'a.html').length, 1);
  assert.equal(cariKlaim('mencegah banjir di Jakarta', 'a.py').length, 1);
  assert.match(cariKlaim('\n\nini pasti', 'a.py')[0], /^a\.py:3 memuat "pasti"/);
});

test('gerbang tidak salah tangkap kata mirip', () => {
  assert.deepEqual(cariKlaim('keamanan pastikan amankan aman_x', 'a.js'), []);
});

test('berkas semai bebas klaim terlarang', () => {
  const temu = [];
  let diperiksa = 0;
  for (const [dir, nama] of BERKAS) {
    for (const f of readdirSync(join(ROOT, dir)).filter(f => nama.test(f))) {
      diperiksa++;
      temu.push(...cariKlaim(readFileSync(join(ROOT, dir, f), 'utf8'), `${dir}/${f}`));
    }
  }
  assert.ok(diperiksa >= 6, `hanya ${diperiksa} berkas semai ketemu; pola berkas gerbang usang, perbarui BERKAS`);
  assert.deepEqual(temu, [], `Klaim terlarang (KEPUTUSAN-SEMAI-BANJIR D10, semai-awan D8):\n${temu.join('\n')}\nGanti dengan kalimat baku "awan layak semai" / "konfirmasi BMKG".`);
});
