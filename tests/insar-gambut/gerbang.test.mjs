// IG-08: gerbang Lab InSAR gambut (data/kajian-bnpb/insar-gambut/RENCANA-UJI.md §5).
// Lab, bukan produk: hipotesis sampai vonis `selaras`; tak terukur bukan nol; satu mesin InSAR.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOK = join(ROOT, 'data/kajian-bnpb/insar-gambut');
const baca = (p) => readFileSync(p, 'utf8');
const LAB_PY = baca(join(ROOT, 'scripts/data/insar_gambut.py'));
const BARA = baca(join(ROOT, 'scripts/data/gambut_bara.py'));
const HASIL = JSON.parse(baca(join(DOK, 'hasil_lab.json')));
const HASIL_MD = baca(join(DOK, 'hasil_lab.md'));
const MIN = 50; // terkunci RENCANA-UJI §2
const MIN_KOH = 30;

// ---- pemeriksa murni (diuji dengan masukan palsu di bawah) ----
export const vonisResmi = (h) => h.jendela.find((j) => j.nama === 'api')?.vonis;

export function cekBara(src, vonis) {
  if (vonis === 'selaras') return [];
  const s = [];
  const m = src.match(/^D_BAWAH, D_ATAS = ([\d.]+), ([\d.]+)/m);
  if (!m || +m[1] !== 15 || +m[2] !== 51)
    s.push(`D_BAWAH, D_ATAS di gambut_bara.py bukan 15, 51 padahal vonis lab "${vonis}": rentang kedalaman hanya boleh berubah sesudah vonis selaras dan jawaban pemilik Q2. Kembalikan ke 15.0, 51.0.`);
  if (/insar/i.test(src))
    s.push('gambut_bara.py menyebut InSAR padahal vonis bukan selaras: D InSAR tidak boleh masuk rumus emisi (KEPUTUSAN D7, Q2 = tidak menggantikan). Hapus.');
  return s;
}

export function cekNol(h) {
  const s = [];
  const kunci = ['dh_cm', 'dh_p10', 'dh_p90', 'd_insar_cm', 'd_insar_p10', 'd_insar_p90'];
  for (const j of h.jendela) {
    const kurang = j.koheren_pct < MIN_KOH || j.piksel_terbakar < MIN || j.piksel_kontrol < MIN;
    const v = j.vonis ?? j.vonis_eksploratif;
    const tak = String(v).includes('tak_terukur');
    if (kurang !== tak) s.push(`${j.nama}: vonis "${v}" tidak cocok dengan kriteria terkunci (koheren ${j.koheren_pct}%, terbakar ${j.piksel_terbakar}, kontrol ${j.piksel_kontrol}).`);
    if (tak) for (const k of kunci) if (j[k] !== null) s.push(`${j.nama}: ${k} = ${j[k]} padahal tak terukur; tulis null, bukan angka (tak terukur bukan nol).`);
  }
  return s;
}

export function cekMd(md) {
  const s = [];
  for (const k of [/\baman\b/i, /bebas api/i, /terbukti/i, /\bpasti\b/i, /pelaku/i, /penyebab/i])
    if (k.test(md)) s.push(`hasil_lab.md memuat kata terlarang ${k}: lab ini hipotesis, tanpa vonis aman atau sebab.`);
  for (const b of md.split('\n').filter((l) => l.startsWith('|') && /tak_terukur/.test(l) && !/eksploratif/.test(l)))
    if (/\|\s*-?0(\.0+)?\s*(\||\()/.test(b.split('|').slice(5, 7).join('|') + '|'))
      s.push(`baris tabel tak_terukur menulis 0: ${b.slice(0, 60)}`);
  return s;
}

export function cekMesin(src) {
  const s = [];
  if (!/import subsiden as S/.test(src)) s.push('insar_gambut.py tidak mengimpor subsiden: satu mesin InSAR (milik banjir), bukan salinan.');
  for (const f of ['baca_par', 'baca_raw', 'vertikal', 'kuantil', 'Kisi'])
    if (new RegExp(`^(def|class) ${f}\\b`, 'm').test(src)) s.push(`insar_gambut.py mendefinisikan ${f}: itu milik scripts/banjir/subsiden.py; impor, jangan salin.`);
  return s;
}

export function cekKriteria(src, doc) {
  const s = [];
  for (const k of ['MIN_PIKSEL', 'MIN_KOHEREN_PCT']) {
    const kode = src.match(new RegExp(`^${k}\\s*=\\s*(\\d+)`, 'm'))?.[1];
    const dok = doc.match(new RegExp('`' + k + '`\\s*\\|\\s*(\\d+)'))?.[1];
    if (!kode || kode !== dok) s.push(`${k}: kode ${kode} != dokumen terkunci ${dok}. Kriteria hanya diubah pemilik di RENCANA-UJI §2, tidak disetel di kode.`);
  }
  return s;
}

function* berkas(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    const st = statSync(p);
    if (st.isDirectory()) yield* berkas(p);
    else yield p;
  }
}
export function cekPublic(daftar, isi) {
  const s = [];
  for (const p of daftar) {
    if (/insar/i.test(p.split('/').pop())) s.push(`${p}: berkas bernama insar di public/ sebelum IG-07.`);
    else if (isi && /insar_gambut|insar-gambut|d_insar/i.test(isi(p))) s.push(`${p}: memuat keluaran lab InSAR gambut; belum boleh terbit (hipotesis, IG-07 menunggu vonis dan Q2).`);
  }
  return s;
}

// ---- gerbang nyata ----
const lapor = (s, perbaikan) => assert.deepEqual(s, [], s.join('\n') + '\n' + perbaikan);

test('gambut_bara.py tidak memakai InSAR selama vonis bukan selaras', () => {
  assert.ok(vonisResmi(HASIL), 'hasil_lab.json tanpa jendela "api"');
  lapor(cekBara(BARA, vonisResmi(HASIL)), 'Akibat: emisi memakai angka tanpa vonis.');
});

test('tak terukur tidak ditulis 0 di hasil_lab.json', () => lapor(cekNol(HASIL), 'Akibat: angka palsu nol terbaca sebagai gambut tidak turun.'));

test('hasil_lab.md bebas kata terlarang dan tanpa nol palsu', () => lapor(cekMd(HASIL_MD), 'Perbaiki laporan_md di insar_gambut.py lalu jalankan ulang lab.'));

test('kriteria MIN_PIKSEL dan MIN_KOHEREN_PCT sama dengan dokumen terkunci', () =>
  lapor(cekKriteria(LAB_PY, baca(join(DOK, 'RENCANA-UJI.md'))), 'Akibat: vonis disetel sesudah melihat hasil.'));

test('tidak ada mesin InSAR kedua', () => lapor(cekMesin(LAB_PY), 'Akibat: dua pembaca raster berselisih diam-diam.'));

test('tidak ada keluaran InSAR gambut di public/', () => {
  const pub = join(ROOT, 'public');
  const daftar = [...berkas(pub)].map((p) => p.slice(ROOT.length + 1));
  lapor(cekPublic(daftar, (p) => (/\.(json|js|html|md|csv)$/.test(p) ? baca(join(ROOT, p)) : '')), 'Hapus keluaran itu atau tunggu IG-07.');
});

test('python3 -I insar_gambut.py --uji hijau', () => {
  const r = spawnSync('python3', ['-I', 'scripts/data/insar_gambut.py', '--uji'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, `self-check merah (T1-T8):\n${r.stdout}${r.stderr}\nPerbaiki insar_gambut.py (pemilik pipa-data).`);
  assert.match(r.stdout, /hijau/);
});

// ---- pelanggar sintetis: gerbang harus merah ----
test('pelanggar sintetis membuat pemeriksa merah', () => {
  assert.equal(cekBara(BARA.replace('15.0, 51.0', '10.0, 40.0'), 'tak_terukur').length, 1);
  assert.equal(cekBara(BARA + '\n# insar', 'tak_terukur').length, 1);
  assert.deepEqual(cekBara(BARA.replace('15.0, 51.0', '10.0, 40.0'), 'selaras'), []);
  const rusak = structuredClone(HASIL);
  rusak.jendela[0].d_insar_cm = 0;
  assert.ok(cekNol(rusak).length >= 1);
  assert.ok(cekMd(HASIL_MD + '\nwilayah aman').length >= 1);
  assert.ok(cekMesin(LAB_PY + '\ndef baca_raw(a):\n  pass\n').length >= 1);
  assert.ok(cekMesin(LAB_PY.replace('import subsiden as S', '')).length >= 1);
  assert.ok(cekKriteria(LAB_PY.replace(/^MIN_PIKSEL = 50/m, 'MIN_PIKSEL = 20'), baca(join(DOK, 'RENCANA-UJI.md'))).length === 1);
  assert.ok(cekPublic(['public/data/insar_gambut.json'], null).length === 1);
  assert.ok(cekPublic(['public/x.json'], () => '{"d_insar_cm": 3}').length === 1);
});
