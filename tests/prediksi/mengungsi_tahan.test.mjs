// Perkiraan mengungsi ditahan di layar sampai uji balik lawan DIBI lulus (validasi-model 25 Nov 2026, AGENTS 2.27).
// Merender Perlu tindakan dan rincian /prediksi serta /prediksi/ringkas di vm dengan DOM tiruan dan prediksi.json lokal
// yang dipaksa membawa kebutuhan: angka mengungsi tidak boleh tampil, kalimat tahan harus tampil, jiwa terpapar tetap tampil.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUB = join(dirname(fileURLToPath(import.meta.url)), '../../public/')
const TAHAN = 'Perkiraan mengungsi ditahan sampai uji balik lawan DIBI lulus'

function data() {
  const d = JSON.parse(readFileSync(PUB + 'prediksi/data/prediksi.json', 'utf8'))
  const w = d.waspada.find(x => x.dampak?.jiwa) || d.waspada[0]
  assert.ok(w, 'prediksi.json tanpa waspada; uji butuh minimal satu')
  w.dampak.jiwa ||= 123456
  w.dampak.kebutuhan = { mengungsi: 98765, air_l: 1481475, hunian_m2: 345678, jamban: 4939, kkal: 207406500 }
  for (const x of d.waspada) x.tenggang = 1
  return { d, w }
}

function dom(path, d) {
  const el = () => { const t = { innerHTML: '', textContent: '', value: '', hidden: false, dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false } }, querySelectorAll: () => [], querySelector: () => el(), addEventListener(ty, f) { t['on_' + ty] = f }, setAttribute() {}, getAttribute() { return null }, append() {}, insertAdjacentHTML() {}, showModal() {}, close() {}, closest: () => null }
    return new Proxy(t, { get: (o, k) => k in o ? o[k] : () => el() }) }
  const els = {}
  const document = { getElementById: id => els['#' + id] ||= el(), querySelector: s => els[s] ||= el(), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(), body: el(), documentElement: el(), readyState: 'loading' }
  const ctx = { pasangTip() {}, document, location: { hash: '', search: '', pathname: path }, history: { replaceState() {} }, addEventListener() {}, fetch: path === '/prediksi/' ? () => new Promise(() => {}) : async () => ({ ok: true, json: async () => d }), localStorage: { getItem() { return null }, setItem() {} }, matchMedia: () => ({ matches: false, addEventListener() {} }), requestAnimationFrame: f => f(), setTimeout, clearTimeout, queueMicrotask, console, Intl, navigator: {}, URLSearchParams, Promise }
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx)
  return { ctx, els, muat: fs => { for (const f of fs) vm.runInContext(readFileSync(PUB + f, 'utf8'), ctx, { filename: f }) } }
}

function cek(nama, h) {
  assert.ok(h.includes(TAHAN), `${nama}: kalimat tahan hilang`)
  assert.doesNotMatch(h.replaceAll(TAHAN, ''), /ungsi|98\.765|kkal|jamban/i, `${nama}: angka mengungsi atau kebutuhan Sphere tampil`)
  assert.match(h, /terpapar/, `${nama}: jiwa terpapar harus tetap tampil`)
}

test('prediksi.js: Perlu tindakan dan rincian tanpa angka mengungsi', () => {
  const { d, w } = data(), { ctx, els, muat } = dom('/prediksi/', d)
  muat(['inti/format.js', 'prediksi/besok_inti.js', 'prediksi/prediksi.js'])
  ctx.__d = d
  vm.runInContext('PR.d = __d; PR.hari = 1; gambarWaspada(PR.d.kab, 1)', ctx)
  cek('Perlu tindakan', els['#waspada'].innerHTML)
  vm.runInContext(`bukaRincian(${JSON.stringify(w.kab)})`, ctx)
  cek('rincian', els['#rincian'].innerHTML)
})

test('ringkas.js: Perlu tindakan dan rincian tanpa angka mengungsi', async () => {
  const { d, w } = data(), { els, muat } = dom('/prediksi/ringkas', d)
  muat(['inti/format.js', 'prediksi/besok_inti.js', 'prediksi/ringkas.js'])
  for (let i = 0; i < 50 && !els['#waspada']?.innerHTML; i++) await new Promise(r => setTimeout(r, 10))
  cek('Perlu tindakan', els['#waspada'].innerHTML)
  els['#daftar'].on_click({ target: { closest: () => ({ dataset: { id: w.kab } }) } })
  cek('rincian', els['#rincian'].innerHTML)
})
