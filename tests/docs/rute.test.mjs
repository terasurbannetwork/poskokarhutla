/* Uji rute Docs (DC-03): pola jalur di src/docs_rute.js menerima tiap jalur di public/docs/_rute.json (ditulis generator) dan menolak jalur aneh;
   tiap jalur dipetakan ke berkas aset yang ada di public/. Bila _rute.json belum ada (generator belum menulisnya), uji pencocokan dilewati. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { AKAR } from './_pembantu.mjs'

const { ruteDocs, jalurDocs, asetDocs, DOCS_HTML_LANGSUNG } = await import(new URL('../../src/docs_rute.js', import.meta.url))
const BERKAS = path.join(AKAR, 'public', 'docs', '_rute.json')

function bacaJalur() {
  const j = JSON.parse(fs.readFileSync(BERKAS, 'utf8'))
  const daftar = Array.isArray(j) ? j : Object.values(j).find(Array.isArray) || []
  return daftar.map((e) => (typeof e === 'string' ? e : e.url || e.jalur || e.path)).filter(Boolean)
}

test('pola menolak jalur aneh', () => {
  const [[re]] = ruteDocs()
  for (const x of ['/docsx', '/docs/../admin', '/docs//a', '/docs/A', '/docs/a.b', '/docs/a/b/c/d', '/docs/a%2fb', '/docs/' + 'a'.repeat(49), '/doc']) {
    assert.ok(!re.test(x), x)
    assert.ok(!jalurDocs(x), x)
  }
  for (const x of ['/docs', '/docs/', '/docs/a', '/docs/a/b', '/docs/pengembang/a/b']) assert.ok(re.test(x), x)
})

test('pemetaan aset: panduan dua tingkat, pengembang tiga tingkat', () => {
  assert.equal(asetDocs('/docs'), '/docs/index.html')
  assert.equal(asetDocs('/docs/m'), '/docs/m/index.html')
  assert.equal(asetDocs('/docs/m/h'), '/docs/m/h.html')
  assert.equal(asetDocs('/docs/pengembang'), '/docs/pengembang/index.html')
  assert.equal(asetDocs('/docs/pengembang/m'), '/docs/pengembang/m/index.html')
  assert.equal(asetDocs('/docs/pengembang/m/h/'), '/docs/pengembang/m/h.html')
})

test('tiap jalur di _rute.json diterima pola dan menunjuk berkas aset yang ada', { skip: !fs.existsSync(BERKAS) && 'public/docs/_rute.json belum ditulis generator' }, () => {
  const [[re, , , peta]] = ruteDocs()
  const daftar = bacaJalur()
  assert.ok(daftar.length > 0, '_rute.json kosong')
  for (const j of daftar) {
    assert.ok(re.test(j) && jalurDocs(j.replace(/\/+$/, '')), `${j} ditolak pola`)
    const aset = peta(j)
    assert.ok(fs.existsSync(path.join(AKAR, 'public', aset)), `${aset} tidak ada untuk ${j}`)
    if (j !== '/docs') assert.ok(DOCS_HTML_LANGSUNG.test(aset), `${aset} bukan alamat langsung berpola`)
  }
})
