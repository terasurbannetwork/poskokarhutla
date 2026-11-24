/* Memuat public/desa-waspada/desa-waspada.js di node:vm dengan DOM tiruan minimal supaya window.DesaWaspadaCsv bisa diuji murni.
   Skrip sungguhan dijalankan (bukan disalin); fetch ditolak sehingga hanya jalur "daftar belum tersedia" yang berjalan. */
import vm from 'node:vm'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'

export const AKAR = fileURLToPath(new URL('../..', import.meta.url))
export const JS = 'public/desa-waspada/desa-waspada.js'

export function muatCsv(src = fs.readFileSync(AKAR + JS, 'utf8')) {
  const wujud = () => new Proxy(function () {}, {get: (_, k) => k === Symbol.toPrimitive ? () => '' : wujud(), apply: () => wujud(), set: () => true})
  const window = {}
  const ctx = vm.createContext({window, document: wujud(), fetch: () => Promise.reject(new Error('uji')), matchMedia: wujud(), console,
    Date, Number, String, Math, URL, Blob: class {}, requestAnimationFrame: f => f(), setTimeout: () => 0, getComputedStyle: wujud(), nanti: f => f()})
  vm.runInContext(src, ctx, {filename: JS, timeout: 2000})
  return window.DesaWaspadaCsv
}
