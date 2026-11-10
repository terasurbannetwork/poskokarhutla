// Paritas Py/JS dan vektor acuan ALGORITMA (SK-003, SK-009): konst.py = konst.js = acuan.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ACUAN = JSON.parse(readFileSync(join(ROOT, 'tests/siklus/fixtures/acuan.json'), 'utf8'));
const dari = (r) => JSON.parse(JSON.stringify(r));

test('konst.py sama dengan konst.js', () => {
  const r = spawnSync('python3', ['-I', join(ROOT, 'scripts/siklus/konst.py'), 'json'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const py = JSON.parse(r.stdout);
  const js = dari(runInNewContext(readFileSync(join(ROOT, 'public/siklus/konst.js'), 'utf8') + ';KONST'));
  assert.deepEqual(js, py);
});

test('konstanta sama dengan acuan ALGORITMA', () => {
  const js = dari(runInNewContext(readFileSync(join(ROOT, 'public/siklus/konst.js'), 'utf8') + ';KONST'));
  assert.deepEqual(js, ACUAN.konstanta);
});

test('parameter tanpa nilai tertulis berstatus null (menunggu), bukan tebakan', () => {
  const k = ACUAN.konstanta;
  assert.equal(k.KURS, null);
  assert.equal(k.FAKTOR_HARGA, null);
  assert.equal(k.TAG_OSM, null);
  assert.equal(k.JENDELA_JENIS.karhutla, null);
});

test('mode gagal terbukti: konstanta berbeda tertangkap deepEqual', () => {
  const js = dari(runInNewContext(readFileSync(join(ROOT, 'public/siklus/konst.js'), 'utf8') + ';KONST'));
  js.PITA = 5;
  assert.throws(() => assert.deepEqual(js, ACUAN.konstanta));
});

const ALFABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function idKJ(kunci, tahun) {
  let v = createHash('sha256').update(kunci, 'utf8').digest().readUIntBE(0, 5);
  let s = '';
  for (let i = 7; i >= 0; i--) s += ALFABET[Math.floor(v / 2 ** (5 * (7 - i))) % 32];
  return `KJ-${tahun}-${s.split('').reverse().join('')}`;
}
const pyJalan = (kode) => spawnSync('python3', ['-I', '-c', kode], { encoding: 'utf8', cwd: ROOT });

test('ID KJ- dari vektor ALGORITMA F1.2 (JS)', () => {
  for (const k of ACUAN.id_kejadian) assert.equal(idKJ(k.masukan, k.tahun), k.id, k.masukan);
  assert.ok(ACUAN.id_kejadian.every((k) => k.id.length === 16));
  assert.ok(ACUAN.id_kejadian.some((k) => k.id === 'KJ-2026-9A2WGN3G'));
});

test('ID KJ- vektor sama dihitung ulang dengan Python hashlib', () => {
  const kode = `import hashlib,json
A="0123456789ABCDEFGHJKMNPQRSTVWXYZ"
def f(k,t):
    v=int.from_bytes(hashlib.sha256(k.encode()).digest()[:5],"big")
    return "KJ-%d-%s"%(t,"".join(A[(v>>(35-5*i))&31] for i in range(8)))
print(json.dumps([f(k["masukan"],k["tahun"]) for k in json.load(open("tests/siklus/fixtures/acuan.json"))["id_kejadian"]]))`;
  const r = pyJalan(kode);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), ACUAN.id_kejadian.map((k) => k.id));
});

const kanonik = (t) => JSON.stringify(JSON.parse(t), (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));

test('sidik: gudang.py sama dengan acuan, JSON kanonik', () => {
  for (const s of ACUAN.sidik) {
    const isi = s.jenis === 'bytes' ? Buffer.from(s.masukan) : Buffer.from(kanonik(s.masukan));
    if (s.jenis === 'json') assert.equal(kanonik(s.masukan), s.kanonik);
    const hasil = createHash('sha256').update(isi).digest('hex');
    const r = pyJalan(`import importlib.util,sys,tempfile,os\ns=importlib.util.spec_from_file_location("g","scripts/siklus/gudang.py");g=importlib.util.module_from_spec(s);s.loader.exec_module(g)\nd=tempfile.mkdtemp();j=os.path.join(d,"x.json");open(j,"w").write(${JSON.stringify(s.masukan)})\nprint(g.sidik(j) if ${s.jenis === 'json' ? 'True' : 'False'} else g.sidik(${JSON.stringify(s.masukan)}.encode()))`);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), hasil);
    if (s.sha256) assert.equal(hasil, s.sha256);
  }
  assert.equal(createHash('sha256').update(ACUAN.sidik[1].kanonik).digest('hex'), createHash('sha256').update(ACUAN.sidik[2].kanonik).digest('hex'));
});

test('anggaran: cek_anggaran gudang.py sama dengan kasus acuan', () => {
  const { a_L, t_L, kasus } = ACUAN.anggaran;
  for (const k of kasus) {
    const r = pyJalan(`import importlib.util,json\ns=importlib.util.spec_from_file_location("g","scripts/siklus/gudang.py");g=importlib.util.module_from_spec(s);s.loader.exec_module(g)\nprint(json.dumps(g.cek_anggaran("saji","a",${k.u},${t_L},${a_L},${k.u_lama})))`);
    const lap = JSON.parse(r.stdout);
    assert.equal(lap === null, k.terima);
    if (!k.terima) assert.equal(lap.kelebihan, k.kelebihan);
    if (k.terpakai_sesudah) assert.equal(t_L + k.u - k.u_lama, k.terpakai_sesudah);
  }
});

test('selisih antarsumber (F1.7): berdampingan, tanpa total, tanpa rata-rata', () => {
  for (const k of ACUAN.selisih) {
    const ada = Object.entries(k.nilai).filter(([, v]) => v != null);
    assert.equal(ada.length, k.n);
    if (ada.length < 2) { assert.equal(k.selisih, null); continue; }
    const maks = ada.reduce((a, b) => (b[1] > a[1] ? b : a)), min = ada.reduce((a, b) => (b[1] < a[1] ? b : a));
    assert.equal(maks[1] - min[1], k.selisih);
    assert.deepEqual(k.arah, { maks: maks[0], min: min[0] });
    assert.equal(Math.round(((maks[1] - min[1]) / maks[1]) * 100), k.persen);
  }
  assert.ok(!JSON.stringify(ACUAN.selisih).match(/"(total|jumlah_gabungan|rata)"/));
});

test('pasang.py: uji hijau dan ID KJ- Python sama dengan vektor acuan (UJ-F1-04..07, 10; INV-9)', () => {
  const u = spawnSync('python3', ['-I', join(ROOT, 'scripts/siklus/pasang.py'), 'uji'], { encoding: 'utf8' });
  assert.equal(u.status, 0, u.stderr + u.stdout);
  const r = pyJalan(`import importlib.util,json\ns=importlib.util.spec_from_file_location("p","scripts/siklus/pasang.py");p=importlib.util.module_from_spec(s);s.loader.exec_module(p)\nprint(json.dumps([p.id_kj(k["masukan"].rsplit("|",1)[0] if k["masukan"].count("|")==3 else k["masukan"], 2 if k["masukan"].count("|")==3 else 1) for k in ${JSON.stringify(ACUAN.id_kejadian)}]))`);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), ACUAN.id_kejadian.map((k) => k.id));
});

test('arsip_kejadian.py: uji hijau (UJ-F1-11)', () => {
  const u = spawnSync('python3', ['-I', join(ROOT, 'scripts/siklus/arsip_kejadian.py'), 'uji'], { encoding: 'utf8' });
  assert.equal(u.status, 0, u.stderr + u.stdout);
});
