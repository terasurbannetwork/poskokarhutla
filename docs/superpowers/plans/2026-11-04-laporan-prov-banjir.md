# Laporan provinsi prediksi banjir (gaya FFGS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tab "Laporan provinsi" di `/prediksi`: enam peta kab per provinsi (hujan kemarin, lengas tanah, prakiraan hujan, ambang pemicu, hujan lewat ambang, peluang banjir) plus tabel dan cetak PDF dari peramban.

**Architecture:** Pipeline hanya menambah satu berkas, `public/prediksi/data/lengas.json`, dari kolom `sm` yang sudah ada di arsip prediksi (`scripts/prediksi/terbit.py`). Fungsi murni (pencocokan nama kab, proyeksi SVG, kelas warna, ambang, lebihan, susunan baris) di `public/prediksi/laporan_prov.js` sebagai `window.LaporanProv`, diuji nyata di node. Gambar DOM di `public/prediksi/laporan_layar.js` (skrip klasik dimuat sesudah `prediksi.js`, memakai global halamannya: `PR`, `ambil`, `$`, `esc`, `fmt`, `pil`, `persen`, `tgl`, `LEVEL`).

**Tech Stack:** JS klasik tanpa build step, Python 3.12 stdlib, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-04-laporan-prov-banjir-design.md`

## Global Constraints

- Hanya staf login: tidak ada rute worker baru; `/prediksi` sudah terkunci di `src/worker.js`.
- Tidak ada workflow, cron, atau pustaka baru. `lengas.json` terbit lewat `prediksi.yml` yang ada.
- Kartu = `.ex.ex-std` dari `public/inti/kartu.css`: pil `.ex-ey`, judul kalimat temuan dengan angka `.hl`, TANPA kaki keterangan/sumber; string `Sumber: ` dilarang di skrip layar (gerbang `tests/agen/gerbang-kartu-std.test.mjs`).
- Panel 4 dan 5 berpil **hipotesis** selama `ambang_persentil.json` `pakai` bukan `true`; FAR uji di `title`.
- Panel 1 tahap `sementara` = analisis model Open-Meteo, BUKAN observasi; pilnya menyebut itu.
- Format angka id-ID (`fmt`), hujan tanpa desimal, lengas dua desimal. Tidak ada titik tengah "·" pemisah teks.
- Kepala tabel rata tengah. Tombol ikon tanpa garis luar.
- Semua teks dari data lewat `esc()`.
- Commit dengan path spesifik (`git commit -- <berkas>`), di `main`, tanpa branch.

## Peta berkas

| Berkas | Aksi | Tanggung jawab |
| --- | --- | --- |
| `scripts/prediksi/terbit.py` | ubah | fungsi `lengas()` + tulis `lengas.json` + uji |
| `public/prediksi/laporan_prov.js` | baru | fungsi murni `window.LaporanProv` |
| `tests/prediksi/laporan_prov.test.mjs` | baru | uji fungsi murni + cakupan poligon 514 kab + invarian `lengas.json` |
| `public/prediksi/index.html` | ubah | tab, section `p-laporan`, `#tip`, muat `kartu.css`, `tip.js`, `laporan_prov.js` |
| `public/prediksi/laporan_layar.js` | baru | `muatLaporan`, `gambarLaporan`, pendengar pemilih dan cetak |
| `public/prediksi/prediksi.js` | ubah | `pilihTab` mengenal `laporan`, `mulai` membaca `#laporan/<prov>` |
| `public/prediksi/prediksi.css` | ubah | kisi panel, peta, legenda, `@media print` |
| `tests/prediksi/prediksi.test.mjs` | ubah | tab baru ada, data laporan dimuat malas |
| `tests/agen/gerbang-kartu-std.test.mjs` | ubah | `LAYAR` + `public/prediksi/laporan_layar.js` |

Penyimpangan kecil dari spec: (1) gambar DOM di `laporan_layar.js`, bukan `laporan_prov.js`, supaya `laporan_prov.js` murni dan teruji di node; `prediksi.js` tidak masuk gerbang kartu karena tab Besok-nya memuat teks `Sumber: ` yang sah di luar kartu standar. (2) Panel peluang banjir digambar tiga peta (+1, +2, +3), bukan satu peta berpemilih: tanpa handler klik tambahan.

---

### Task 1: `lengas.json` dari terbit.py

**Files:**
- Modify: `scripts/prediksi/terbit.py` (fungsi baru sebelum `def periksa`, panggilan di akhir `terbit()`, asersi di `uji()`)
- Test: `tests/prediksi/laporan_prov.test.mjs` (dibuat di sini dengan satu uji; Task 2 menambah isinya)

**Interfaces:**
- Produces: `public/prediksi/data/lengas.json` = `{"dibuat": "<iso WIB>", "hari": "YYYY-MM-DD", "sumber": "<teks>", "kab": {"<id 4 digit>": <float 0..1, 2 desimal>}}`. Kab tanpa nilai tidak ditulis.
- Produces: `lengas(akhir) -> dict | None` di `terbit.py`.

- [ ] **Step 1: Tulis asersi gagal di `uji()`**

Di `scripts/prediksi/terbit.py`, di dalam `uji()`, tepat sebelum baris `t = "2026-10-29"`, tambahkan:

```python
    # lengas.json: sm tenggang +1 dari entri HJN terakhir; None dibuang, di luar 0..1 ditolak
    eh = {"k": "HJN", "t": "2026-10-29", "hari": ["2026-10-30", "2026-10-31", "2026-11-01"], "sumber": "uji",
          "kol": e["kol"], "kab": {"1101": [[0.8, 0.4, 0.05, 10.0, 3, 4, 5, 0.4123, 0], None, None], "1102": [None, None, None],
                                   "1103": [[0.8, 0.4, 0.05, 10.0, 3, 4, 5, None, 0], None, None]}}
    lg = lengas({"HJN": eh})
    assert lg["hari"] == "2026-10-30" and lg["kab"] == {"1101": 0.41}, lg
    assert lengas({}) is None, "tanpa HJN tidak ada lengas.json"
    eh["kab"]["1101"][0][7] = 1.7
    try:
        lengas({"HJN": eh})
        raise AssertionError("sm 1,7 harus ditolak")
    except ValueError:
        pass
```

Di blok `with tempfile.TemporaryDirectory() as tmp:` sesudah `assert periksa(o) == [] and len(o["kab"]) == 514`, tambahkan:

```python
        lj = json.load(open(os.path.join(tmp, "lengas.json")))
        assert len(lj["kab"]) == 514 and set(lj["kab"].values()) == {0.5}, "lengas.json ikut terbit"
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `python3 scripts/prediksi/terbit.py uji`
Expected: FAIL `NameError: name 'lengas' is not defined`

- [ ] **Step 3: Implementasi**

Sebelum `def periksa(d):` tambahkan:

```python
def lengas(akhir):
    """Lengas tanah per kab untuk tab Laporan provinsi: kolom sm (Open-Meteo soil_moisture 3-9 dan 9-27 cm, dihitung catat.py)
    tenggang +1 dari entri HJN terakhir. -> {"dibuat", "hari", "sumber", "kab": {id: sm}} atau None bila HJN tidak ada.
    Nilai di luar 0..1 = masukan rusak, ditolak (ValueError), tidak dipotong."""
    e = akhir.get("HJN")
    if not e or "sm" not in e["kol"]:
        return None
    i = e["kol"].index("sm")
    kab = {}
    for k, rows in e["kab"].items():
        r = rows[0] if rows else None
        if r is None or r[i] is None:
            continue
        if not 0 <= r[i] <= 1:
            raise ValueError(f"lengas {k} = {r[i]} di luar 0..1")
        kab[k] = round(r[i], 2)
    return {"dibuat": dt.datetime.now(D.WIB).replace(microsecond=0).isoformat(), "hari": e["hari"][0],
            "sumber": "Open-Meteo, lengas tanah 3 sampai 27 cm (fraksi volume), prakiraan hari pertama", "kab": kab}
```

Di `terbit()`, sesudah `D.simpan(os.path.join(data, "lalu.json"), ...)` dan sebelum `return out`:

```python
    lg = lengas(akhir)
    if lg:
        D.simpan(os.path.join(data, "lengas.json"), lg)
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `python3 scripts/prediksi/terbit.py uji`
Expected: `terbit.py: uji lulus`

- [ ] **Step 5: Uji invarian berkas nyata**

Buat `tests/prediksi/laporan_prov.test.mjs`:

```js
// Tab Laporan provinsi /prediksi (gaya FFGS BMKG): fungsi murni public/prediksi/laporan_prov.js dijalankan nyata di node,
// cakupan poligon kab diuji terhadap prediksi.json dan geo/kabupaten sungguhan, lengas.json lewat invarian (bukan potret angka).
// Spec: docs/superpowers/specs/2026-11-04-laporan-prov-banjir-design.md
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const akar = new URL('../../', import.meta.url)
const baca = p => readFileSync(new URL(p, akar), 'utf8')
const json = p => JSON.parse(baca(p))
const ada = p => existsSync(new URL(p, akar))

test('lengas.json: nilai 0..1, minimal 90% dari 514 kab terisi', () => {
  if (!ada('public/prediksi/data/lengas.json')) return
  const d = json('public/prediksi/data/lengas.json')
  assert.match(d.hari, /^\d{4}-\d{2}-\d{2}$/)
  const v = Object.entries(d.kab)
  const salah = v.filter(([, x]) => !(x >= 0 && x <= 1))
  assert.deepEqual(salah, [], `lengas di luar 0..1: ${salah.slice(0, 5).map(([k, x]) => `${k}=${x}`).join(', ')}`)
  assert.ok(v.length >= 0.9 * 514, `lengas hanya ${v.length} dari 514 kab (sm kosong dari Open-Meteo?)`)
})
```

Run: `python3 scripts/prediksi/terbit.py` (menulis berkas nyata dari arsip lokal), lalu `node --test tests/prediksi/laporan_prov.test.mjs`
Expected: PASS. Bila arsip lokal tidak punya `sm` untuk >= 90% kab, catat jumlahnya di laporan dan JANGAN melonggarkan ambang 90%.

- [ ] **Step 6: Commit**

```bash
git add tests/prediksi/laporan_prov.test.mjs public/prediksi/data/lengas.json
git commit -m "prediksi: terbitkan lengas.json (sm tenggang +1) untuk laporan provinsi" -- scripts/prediksi/terbit.py tests/prediksi/laporan_prov.test.mjs public/prediksi/data/lengas.json
```

---

### Task 2: Fungsi murni `laporan_prov.js`

**Files:**
- Create: `public/prediksi/laporan_prov.js`
- Test: `tests/prediksi/laporan_prov.test.mjs` (tambah uji)

**Interfaces:**
- Consumes: `lengas.json` (Task 1); `prediksi.json` (`kab[].{id,nama,prov,pn,HJN,BNJ}`, `kode.HJN.kol`, `kode.BNJ.kol`); `amatan/HJN.json` (`{tanggal: {j, kab: {id: [tot, mulai, lama, puncak]}}}`); `public/banjir/data/ambang_persentil.json` (`pakai`, `ambang_mm["<prov>|<nama geo>"].waspada`, `nasional_mm.waspada`, `uji_2024_2025.persentil.waspada.far`); `public/geo/kabupaten/<prov>.json` (`features[].properties.kab`, Polygon/MultiPolygon).
- Produces `window.LaporanProv`:
  - `kunci(nama: string) -> string`
  - `petaSvg(geo, lebar = 400) -> {lebar, tinggi, d: {kunci: pathString}}`
  - `KELAS: {hujan, lengas, ambang, lebih, level}` masing-masing `{batas: number[], warna: string[], label: string[]}` dengan `warna.length === batas.length + 1`
  - `TANPA: string` (warna tanpa data)
  - `kelas(v, batas) -> -1 | 0..batas.length` (-1 = tanpa data)
  - `indeksAmbang(ap) -> Map<"prov|kunci", mm>`
  - `ambangKab(ap, idx, prov, nama) -> {mm, sumber: "kab" | "nasional"} | null`
  - `lebih(prak, ambang) -> number | null`
  - `susun({d, amatan, lengas, ap, prov}) -> {prov, nama, amatan: {hari, j} | null, n, baris: Baris[]}` dengan `Baris = {id, nama, kunci, hujan, lengas, prak, p50, ambang, sumberAmbang, lebih, lv: (0..3|null)[3], ps: (number|null)[3]}`
  - `waspada(baris, n) -> Baris[]` (lv tenggang n >= 1, urut lv turun lalu nama)
  - `tabel(baris) -> Baris[]` (lv >= 1 di tenggang mana pun, urut lv maksimum turun lalu nama)

- [ ] **Step 1: Tulis uji gagal**

Tambahkan ke `tests/prediksi/laporan_prov.test.mjs`:

```js
const win = {}
new Function('window', baca('public/prediksi/laporan_prov.js'))(win)
const L = win.LaporanProv

test('kunci: nama prediksi.json dan geo/kabupaten bertemu, termasuk 8 ejaan yang dulu beda', () => {
  const pasang = [
    ['Kab. Aceh Selatan', 'Aceh Selatan'], ['Kota Medan', 'Kota Medan'],
    ['Kota Tanjungbalai', 'Kota Tanjung Balai'], ['Kota Padangsidimpuan', 'Kota Padang Sidempuan'],
    ['Kab. Mukomuko', 'Muko Muko'], ['Kota Administrasi Jakarta Utara ', 'Kota Administrasi Jakarta Utara'],
    ['Kab. Kep. Siau Tagulandang Biaro', 'Kepulauan Siau Tagulandang Biaro'], ['Kab. Toli-Toli', 'Toli Toli'],
    ['Kab. Pangkajene dan Kepulauan', 'Pangkajene Kepulauan'], ['Kota Parepare', 'Kota Pare Pare']]
  for (const [a, b] of pasang) assert.equal(L.kunci(a), L.kunci(b), `${a} vs ${b}`)
  assert.notEqual(L.kunci('Kab. Bekasi'), L.kunci('Kota Bekasi'), 'kab dan kota senama tidak boleh tertukar')
})

test('cakupan: tiap kab prediksi.json punya tepat satu poligon di geo/kabupaten provinsinya', () => {
  if (!ada('public/prediksi/data/prediksi.json')) return
  const d = json('public/prediksi/data/prediksi.json'), hilang = [], geo = {}
  for (const k of d.kab) {
    geo[k.prov] ||= json(`public/geo/kabupaten/${k.prov}.json`).features.map(f => L.kunci(f.properties.kab))
    const n = geo[k.prov].filter(x => x === L.kunci(k.nama)).length
    if (n !== 1) hilang.push(`${k.id} ${k.nama} (${n} poligon)`)
  }
  assert.deepEqual(hilang, [], `kab tanpa tepat satu poligon: ${hilang.join('; ')}`)
})

test('kelas: batas kiri inklusif, null/NaN = -1, warna satu lebih banyak dari batas', () => {
  assert.equal(L.kelas(null, [1, 20]), -1)
  assert.equal(L.kelas(NaN, [1, 20]), -1)
  assert.equal(L.kelas(0, [1, 20]), 0)
  assert.equal(L.kelas(1, [1, 20]), 1)
  assert.equal(L.kelas(19.9, [1, 20]), 1)
  assert.equal(L.kelas(500, [1, 20]), 2)
  for (const [n, k] of Object.entries(L.KELAS)) {
    assert.equal(k.warna.length, k.batas.length + 1, `${n} warna`)
    assert.equal(k.label.length, k.warna.length, `${n} label`)
  }
})

test('petaSvg: kotak 1x1 derajat di khatulistiwa jadi persegi, MultiPolygon digabung', () => {
  const sq = (x, y) => [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]]
  const geo = {features: [
    {properties: {kab: 'A'}, geometry: {type: 'Polygon', coordinates: sq(100, 0)}},
    {properties: {kab: 'Kota B'}, geometry: {type: 'MultiPolygon', coordinates: [sq(101, 0), sq(101, -1)]}}]}
  const p = L.petaSvg(geo, 200)
  assert.equal(p.lebar, 200)
  assert.ok(Math.abs(p.tinggi - 200) <= 1, `tinggi ${p.tinggi}`)
  assert.equal(p.d.a.split('M').length - 1, 1)
  assert.equal(p.d.kotab.split('M').length - 1, 2)
})

const AP = {pakai: false, nasional_mm: {waspada: 40}, ambang_mm: {'11|Aceh Selatan': {waspada: 52.2}},
  uji_2024_2025: {persentil: {waspada: {far: 0.973}}}}

test('ambang: kab sampel pakai mm-nya, lainnya nasional bertanda; lebihan = prakiraan - ambang', () => {
  const idx = L.indeksAmbang(AP)
  assert.deepEqual(L.ambangKab(AP, idx, '11', 'Kab. Aceh Selatan'), {mm: 52.2, sumber: 'kab'})
  assert.deepEqual(L.ambangKab(AP, idx, '11', 'Kab. Aceh Barat'), {mm: 40, sumber: 'nasional'})
  assert.equal(L.ambangKab(null, new Map(), '11', 'x'), null)
  assert.equal(L.lebih(60, 52.2), 7.8)
  assert.equal(L.lebih(30, 40), -10)
  assert.equal(L.lebih(null, 40), null)
  assert.equal(L.lebih(30, null), null)
})

test('susun: satu baris per kab provinsi, data hilang = null (bukan 0), urut tabel menurut level', () => {
  const kol = ['p1', 'p20', 'p50', 'tot', 'mulai', 'lama', 'puncak', 'm']
  const h = (tot, p50) => [0.9, 0.5, p50, tot, 10, 3, 12, 1]
  const d = {kode: {HJN: {kol}, BNJ: {kol: ['lv', 'ps']}}, kab: [
    {id: '1101', nama: 'Kab. Aceh Selatan', prov: '11', pn: 'Aceh', HJN: [h(60, 0.4), null, null], BNJ: [[2, 0.3], [1, null], null]},
    {id: '1102', nama: 'Kab. Aceh Tenggara', prov: '11', pn: 'Aceh'},
    {id: '1201', nama: 'Kab. Nias', prov: '12', pn: 'Sumatera Utara', HJN: [h(5, 0), null, null]}]}
  const amatan = {'2026-11-02': {j: 'final', kab: {'1101': [3, 1, 2, 1]}}, '2026-11-03': {j: 'sementara', kab: {'1101': [22.1, 1, 13, 6]}}}
  const s = L.susun({d, amatan, lengas: {kab: {'1101': 0.41}}, ap: AP, prov: '11'})
  assert.equal(s.nama, 'Aceh')
  assert.deepEqual(s.amatan, {hari: '2026-11-03', j: 'sementara'})
  assert.equal(s.n, 2)
  const [a, b] = s.baris
  assert.deepEqual([a.hujan, a.lengas, a.prak, a.p50, a.ambang, a.sumberAmbang, a.lebih], [22.1, 0.41, 60, 0.4, 52.2, 'kab', 7.8])
  assert.deepEqual(a.lv, [2, 1, null])
  assert.deepEqual(a.ps, [0.3, null, null])
  assert.deepEqual([b.hujan, b.lengas, b.prak, b.lebih], [null, null, null, null])
  assert.equal(b.sumberAmbang, 'nasional')
  assert.deepEqual(L.waspada(s.baris, 1).map(x => x.id), ['1101'])
  assert.deepEqual(L.waspada(s.baris, 3), [])
  assert.deepEqual(L.tabel(s.baris).map(x => x.id), ['1101'])
  assert.equal(L.susun({d, amatan: null, lengas: null, ap: null, prov: '11'}).amatan, null)
})

test('laporan_prov.js murni: tanpa DOM, tanpa fetch, tanpa "Sumber: "', () => {
  const js = baca('public/prediksi/laporan_prov.js')
  assert.doesNotMatch(js, /document\.|fetch\(|innerHTML|Sumber: /)
})
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --test tests/prediksi/laporan_prov.test.mjs`
Expected: FAIL `ENOENT ... public/prediksi/laporan_prov.js`

- [ ] **Step 3: Implementasi**

Buat `public/prediksi/laporan_prov.js`:

```js
"use strict";
/* laporan_prov.js: fungsi murni tab "Laporan provinsi" /prediksi (gaya laporan FFGS BMKG). Tanpa DOM dan tanpa fetch;
   prediksi.js menggambar, tests/prediksi/laporan_prov.test.mjs menjalankannya nyata di node.
   Spec: docs/superpowers/specs/2026-11-04-laporan-prov-banjir-design.md */
(() => {
  /* nama prediksi.json ("Kab. Kep. Siau ...", "Kota Administrasi Jakarta Utara ") dan geo/kabupaten ("Kepulauan Siau ...") -> kunci sama.
     ALIAS = ejaan yang beda huruf, bukan cuma spasi/tanda baca. */
  const ALIAS = {kotapadangsidimpuan: "kotapadangsidempuan"};
  const kunci = n => {
    const k = String(n).trim().toLowerCase().replace(/^kab\.\s+/, "").replace("kota administrasi", "kota")
      .replace(/\bkep\.\s*/g, "kepulauan ").replace(/\bdan\b/g, "").replace(/[^a-z]/g, "");
    return ALIAS[k] || k;
  };

  const cincin = g => !g ? [] : g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : [];
  /* GeoJSON provinsi -> path SVG per kunci kab. Ekuirektangular dengan koreksi cos(lintang tengah); cukup untuk satu provinsi. */
  function petaSvg(geo, lebar = 400) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const f of geo.features) for (const r of cincin(f.geometry)) for (const [x, y] of r) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const c = Math.cos((y0 + y1) / 2 * Math.PI / 180), s = lebar / (((x1 - x0) * c) || 1);
    const px = ([x, y]) => `${((x - x0) * c * s).toFixed(1)},${((y1 - y) * s).toFixed(1)}`;
    const d = {};
    for (const f of geo.features) d[kunci(f.properties.kab)] = cincin(f.geometry).map(r => "M" + r.map(px).join("L") + "Z").join("");
    return {lebar, tinggi: Math.round((y1 - y0) * s), d};
  }

  /* Kelas warna. batas kiri inklusif; warna[i] untuk kelas i; label untuk legenda. */
  const KELAS = {
    hujan: {batas: [1, 20, 50, 100, 150], warna: ["#eef2f7", "#c6dbef", "#6baed6", "#2171b5", "#08306b", "#54278f"],
      label: ["<1", "1–20", "20–50", "50–100", "100–150", "≥150"]},
    lengas: {batas: [0.15, 0.25, 0.35, 0.45], warna: ["#a6611a", "#dfc27d", "#e9eef3", "#80cdc1", "#018571"],
      label: ["<0,15", "0,15–0,25", "0,25–0,35", "0,35–0,45", "≥0,45"]},
    ambang: {batas: [40, 60, 80, 120], warna: ["#7a0177", "#c51b8a", "#f768a1", "#fbb4b9", "#fde0dd"],
      label: ["<40", "40–60", "60–80", "80–120", "≥120"]},
    lebih: {batas: [0.5, 10, 25, 50], warna: ["#eef2f7", "#fee391", "#fe9929", "#d95f0e", "#993404"],
      label: ["tidak lewat", "0,5–10", "10–25", "25–50", "≥50"]},
    level: {batas: [1, 2, 3], warna: ["#e2e8f0", "#f2c94c", "#f2994a", "#c9503a"], label: ["Normal", "Waspada", "Siaga", "Awas"]},
  };
  const TANPA = "#cbd5e1";
  const kelas = (v, batas) => {
    if (v == null || Number.isNaN(v)) return -1;
    let i = 0;
    while (i < batas.length && v >= batas[i]) i++;
    return i;
  };

  const bulat1 = v => Math.round(v * 10) / 10;
  const indeksAmbang = ap => new Map(Object.entries(ap?.ambang_mm || {}).map(([x, v]) => {
    const i = x.indexOf("|");
    return [x.slice(0, i) + "|" + kunci(x.slice(i + 1)), v.waspada];
  }));
  function ambangKab(ap, idx, prov, nama) {
    if (!ap) return null;
    const mm = idx.get(prov + "|" + kunci(nama));
    return mm != null ? {mm, sumber: "kab"} : ap.nasional_mm?.waspada != null ? {mm: ap.nasional_mm.waspada, sumber: "nasional"} : null;
  }
  const lebih = (prak, ambang) => prak == null || ambang == null ? null : bulat1(prak - ambang);

  function susun({d, amatan, lengas, ap, prov}) {
    const ih = c => d.kode.HJN?.kol.indexOf(c), ib = c => d.kode.BNJ?.kol.indexOf(c);
    const hariA = amatan ? Object.keys(amatan).sort().at(-1) : null, a = hariA ? amatan[hariA] : null;
    const idx = indeksAmbang(ap);
    const kab = d.kab.filter(k => k.prov === prov);
    const baris = kab.map(k => {
      const h = k.HJN?.[0], am = ambangKab(ap, idx, prov, k.nama), prak = h ? h[ih("tot")] : null;
      const lv = [0, 1, 2].map(n => k.BNJ?.[n] ? k.BNJ[n][ib("lv")] : null);
      const ps = [0, 1, 2].map(n => k.BNJ?.[n] ? k.BNJ[n][ib("ps")] : null);
      return {id: k.id, nama: k.nama, kunci: kunci(k.nama), hujan: a?.kab[k.id]?.[0] ?? null, lengas: lengas?.kab[k.id] ?? null,
        prak, p50: h ? h[ih("p50")] : null, ambang: am?.mm ?? null, sumberAmbang: am?.sumber ?? null, lebih: lebih(prak, am?.mm), lv, ps};
    });
    return {prov, nama: kab[0]?.pn ?? prov, amatan: a ? {hari: hariA, j: a.j} : null, n: baris.length, baris};
  }

  const lvMaks = b => Math.max(-1, ...b.lv.map(v => v ?? -1));
  const waspada = (baris, n) => baris.filter(b => (b.lv[n - 1] ?? 0) >= 1)
    .sort((a, b) => b.lv[n - 1] - a.lv[n - 1] || a.nama.localeCompare(b.nama, "id"));
  const tabel = baris => baris.filter(b => lvMaks(b) >= 1).sort((a, b) => lvMaks(b) - lvMaks(a) || a.nama.localeCompare(b.nama, "id"));

  window.LaporanProv = {kunci, petaSvg, KELAS, TANPA, kelas, indeksAmbang, ambangKab, lebih, susun, waspada, tabel};
})();
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `node --test tests/prediksi/laporan_prov.test.mjs`
Expected: semua PASS. Bila uji cakupan gagal, tambah ejaan ke `ALIAS` (bukan melonggarkan uji) dan sebut kab-nya di pesan commit.

- [ ] **Step 5: Commit**

```bash
git add public/prediksi/laporan_prov.js
git commit -m "prediksi: fungsi murni laporan provinsi (cocok nama kab, peta SVG, kelas, ambang)" -- public/prediksi/laporan_prov.js tests/prediksi/laporan_prov.test.mjs
```

---

### Task 3: Tab Laporan provinsi (tampilan, cetak, gerbang)

**Files:**
- Modify: `public/prediksi/index.html`
- Create: `public/prediksi/laporan_layar.js`
- Modify: `public/prediksi/prediksi.js` (konstanta `PR` baris 5, `pilihTab` baris 230-237, `mulai` baris 255-256)
- Modify: `public/prediksi/prediksi.css` (tambah di akhir)
- Modify: `tests/prediksi/prediksi.test.mjs` (uji `halaman memuat inti` baris 89-96 + uji baru)
- Modify: `tests/agen/gerbang-kartu-std.test.mjs:13-16`

**Interfaces:**
- Consumes: `window.LaporanProv` (Task 2), `lengas.json` (Task 1), global `PR`, `ambil`, `$`, `esc`, `fmt`, `jamWIB`, `pil`, `persen`, `tgl`, `LEVEL` dari `prediksi.js`; `pasangTip()` dari `../inti/tip.js`.
- Produces: `muatLaporan()` (dipanggil `pilihTab` di `prediksi.js`).
- Produces: tab `data-tab="laporan"`, section `#p-laporan`, URL `#laporan/<kode prov>`.

- [ ] **Step 1: Tulis uji gagal**

Di `tests/prediksi/prediksi.test.mjs`, ubah baris `for (const id of ['p-besok', 'p-rapor', 'p-dampak', 'p-konfirmasi'])` menjadi:

```js
  for (const id of ['p-besok', 'p-rapor', 'p-dampak', 'p-konfirmasi', 'p-laporan']) assert.ok(html.includes(`id="${id}"`), `tab ${id} hilang`)
  for (const f of ['../inti/kartu.css', '../inti/tip.js', 'laporan_prov.js', 'laporan_layar.js']) assert.ok(html.includes(f), `index.html tidak memuat ${f}`)
```

Tambahkan uji baru di akhir berkas:

```js
test('tab Laporan provinsi: data dimuat malas, teks lewat esc(), pil hipotesis membaca pakai', () => {
  const js = readFileSync(join(ROOT, 'public/prediksi/prediksi.js'), 'utf8')
  assert.ok(!/lengas\.json|amatan\/HJN\.json|ambang_persentil/.test(js), 'data laporan hanya ditarik laporan_layar.js saat tab dibuka')
  assert.match(js, /if \(t === "laporan"\) muatLaporan\(\)/)
  const g = readFileSync(join(ROOT, 'public/prediksi/laporan_layar.js'), 'utf8')
  assert.doesNotMatch(g.slice(0, g.indexOf('async function muatLaporan')), /ambil\(|fetch\(/, 'laporan_layar.js tidak boleh menarik data sebelum tab dibuka')
  assert.match(g, /\.pakai/, 'pil hipotesis harus membaca ambang_persentil.pakai, bukan angka tetap')
  assert.match(g, /window\.print\(\)/)
  for (const f of ['b.nama', 's.nama']) assert.ok(g.includes(`esc(${f}`), `${f} tanpa esc di tab Laporan`)
})
```

Di `tests/agen/gerbang-kartu-std.test.mjs`, tambahkan ke `LAYAR`:

```js
  {skrip: 'public/prediksi/laporan_layar.js', html: 'public/prediksi/index.html', lama: []},
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --test tests/prediksi/prediksi.test.mjs tests/agen/gerbang-kartu-std.test.mjs`
Expected: FAIL `tab p-laporan hilang`, dan gerbang kartu gagal `ENOENT ... laporan_layar.js`.

- [ ] **Step 3: HTML**

Di `public/prediksi/index.html`:

Sesudah `<link rel="stylesheet" href="../inti/tabel.css">` tambahkan:

```html
<link rel="stylesheet" href="../inti/kartu.css">
```

Sesudah `<body>` tambahkan:

```html
<div id="tip" role="tooltip"></div>
```

Di `<nav class="tabs" id="tabs" ...>`, sesudah tombol Dampak:

```html
    <button type="button" data-tab="laporan">Laporan provinsi</button>
```

Sebelum `<section class="page scroll" id="p-konfirmasi" ...>`:

```html
  <section class="page scroll" id="p-laporan" aria-label="Laporan provinsi">
    <div class="wrap pr-wrap">
      <div class="tbar lp-kendali">
        <select id="lpProv" aria-label="Provinsi"></select>
        <button type="button" class="iconbtn" id="lpCetak" aria-label="Unduh PDF" title="Unduh PDF (cetak A4 lanskap)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg></button>
      </div>
      <div id="laporanIsi"><p class="kosong">Memuat laporan…</p></div>
    </div>
  </section>
```

Ganti blok skrip di akhir menjadi:

```html
<script src="../inti/format.js"></script>
<script src="../inti/tip.js"></script>
<script src="laporan_prov.js"></script>
<script src="prediksi.js"></script>
<script src="laporan_layar.js"></script>
```

(`laporan_layar.js` sesudah `prediksi.js`: skrip klasik berbagi lingkup global, jadi `PR`, `ambil`, `pil` terbaca. `mulai()` menunggu fetch sebelum memanggil `pilihTab`, jadi `muatLaporan` sudah terdefinisi saat dipanggil.)

(Tanggal terbit tidak diberi pemilih: arsip `prediksi.json` per hari tidak diterbitkan, jadi pemilih hanya akan punya satu pilihan. Tanggal tampil di kepala laporan.)

- [ ] **Step 4: JS**

Baris 5 `prediksi.js`, tambahkan `lap: undefined, geo: {}` ke `PR`:

```js
const PR = {dampak: null, jalan: null, d: null, skor: null, uji: null, kal: null, lalu: null, kalender: null, n: 60, tab: "besok", lap: undefined, geo: {}};
```

Buat `public/prediksi/laporan_layar.js`:

```js
"use strict";
/* Tab Laporan provinsi (gaya laporan FFGS BMKG): enam peta kab satu provinsi + tabel, cetak A4 lewat window.print().
   Fungsi murni di laporan_prov.js (LP). Data dimuat sekali saat tab pertama dibuka; geometri per provinsi saat dipilih.
   Panel ambang dan lebihan berpil hipotesis selama ambang_persentil.pakai bukan true. */
const LP = window.LaporanProv;
const kartuLap = (ey, judul, isi, kls = "") => `<article class="ex ex-std ${kls}"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div></article>`;
const pilHip = ap => ap?.pakai === true ? "" : `<span class="pr-pil buruk" title="Ambang belum lolos uji. Uji 2024–2025 ambang Waspada: ${persen(ap?.uji_2024_2025?.persentil?.waspada?.far)} alarm tanpa kejadian tercatat (FAR)">hipotesis</span>`;
const mmLap = v => v == null ? "tanpa data" : `${fmt(Math.round(v))} mm`;
function legendaLap(k) {
  const K = LP.KELAS[k];
  return `<div class="lp-leg">${K.warna.map((w, i) => `<span><i style="background:${w}"></i>${esc(K.label[i])}</span>`).join("")}<span><i style="background:${LP.TANPA}"></i>tanpa data</span></div>`;
}
function petaLap(pt, s, kls, nilai, teks) {
  const per = Object.fromEntries(s.baris.map(b => [b.kunci, b]));
  const path = Object.entries(pt.d).map(([k, d]) => {
    const b = per[k], v = b ? nilai(b) : null, i = LP.kelas(v, LP.KELAS[kls].batas);
    const tip = `<b>${esc(b?.nama || k)}</b><br>${esc(b ? teks(b) : "tidak ada di prediksi")}`;
    return `<path d="${d}" fill="${i < 0 ? LP.TANPA : LP.KELAS[kls].warna[i]}" data-tip="${esc(tip)}"/>`;
  }).join("");
  return `<svg class="lp-peta" viewBox="0 0 ${pt.lebar} ${pt.tinggi}" role="img" preserveAspectRatio="xMidYMid meet">${path}</svg>${legendaLap(kls)}`;
}
async function muatLaporan() {
  if (!PR.d) return;   // tab diklik sebelum prediksi.json termuat: mulai() memanggil pilihTab lagi lewat hash
  if (PR.lap === undefined) {
    const banjir = fetch("../banjir/data/ambang_persentil.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
    const [amatan, lengas, ap] = await (PR.memLap ||= Promise.all([ambil("amatan/HJN.json"), ambil("lengas.json"), banjir]));
    PR.lap = {amatan, lengas, ap};
    const prov = [...new Map(PR.d.kab.map(k => [k.prov, k.pn])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
    $("#lpProv").innerHTML = prov.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join("");
    const awal = location.hash.match(/^#laporan\/(\d{2})$/)?.[1];
    if (awal && prov.some(([k]) => k === awal)) $("#lpProv").value = awal;
  }
  gambarLaporan();
}
async function gambarLaporan() {
  const prov = $("#lpProv").value, {amatan, lengas, ap} = PR.lap;
  history.replaceState(null, "", "#laporan/" + prov);
  const geo = PR.geo[prov] ||= await fetch(`../geo/kabupaten/${prov}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!geo) { $("#laporanIsi").innerHTML = '<p class="kosong">Batas kab/kota provinsi ini belum tersedia.</p>'; return; }
  const s = LP.susun({d: PR.d, amatan, lengas, ap, prov}), pt = LP.petaSvg(geo), w = LP.waspada(s.baris, 1);
  const hj = PR.d.kode.HJN, bn = PR.d.kode.BNJ, besok = hj ? tgl(hj.hari[0]) : "";
  const tahapA = !s.amatan ? "" : s.amatan.j === "final" ? '<span class="pr-pil ok" title="ERA5 per jam lewat Open-Meteo Archive">final, ERA5</span>'
    : '<span class="pr-pil abu" title="Open-Meteo untuk tanggal lampau = analisis model, bukan pengukuran; diganti ERA5 sesudah 6 hari">sementara, analisis model</span>';
  const lv = n => b => b.lv[n - 1];
  const panel = [
    kartuLap("Kemarin", `Hujan ${s.amatan ? esc(tgl(s.amatan.hari)) : "kemarin"} ${tahapA}`,
      petaLap(pt, s, "hujan", b => b.hujan, b => `hujan ${mmLap(b.hujan)}`)),
    kartuLap("Kini", `Lengas tanah ${lengas ? esc(tgl(lengas.hari)) : ""}`,
      petaLap(pt, s, "lengas", b => b.lengas, b => b.lengas == null ? "tanpa data" : `lengas ${fmt(Math.round(b.lengas * 100) / 100)}`)),
    kartuLap("Besok", `Prakiraan hujan ${esc(besok)} ${pil(hj?.vonis["p50|1"])}`,
      petaLap(pt, s, "hujan", b => b.prak, b => `total ${mmLap(b.prak)}<br>peluang ≥50 mm: ${persen(b.p50)}`)),
    kartuLap("Ambang", `Hujan pemicu banjir ${pilHip(ap)}`,
      petaLap(pt, s, "ambang", b => b.ambang, b => `ambang Waspada ${mmLap(b.ambang)}${b.sumberAmbang === "nasional" ? " (angka nasional)" : ""}`)),
    kartuLap("Besok", `Prakiraan hujan lewat ambang ${pilHip(ap)}`,
      petaLap(pt, s, "lebih", b => b.lebih == null ? null : Math.max(0, b.lebih), b => b.lebih == null ? "tanpa data" : b.lebih <= 0 ? `${fmt(Math.round(-b.lebih))} mm di bawah ambang` : `${fmt(Math.round(b.lebih))} mm di atas ambang`)),
    ...[1, 2, 3].map(n => kartuLap(n === 1 ? "Besok" : `+${n} hari`, `Peluang banjir ${esc(bn ? tgl(bn.hari[n - 1]) : "")} ${pil(bn?.vonis[`ps|${n}`])}`,
      petaLap(pt, s, "level", lv(n), b => `${b.lv[n - 1] == null ? "tanpa data" : LEVEL[b.lv[n - 1]]}${b.ps[n - 1] != null ? `<br>peluang Siaga: ${persen(b.ps[n - 1])}` : ""}`), n > 1 ? "lp-ext" : "")),
  ];
  const tb = LP.tabel(s.baris);
  const sel = v => v == null ? "–" : fmt(Math.round(v));
  const tabel = tb.length ? `<div class="tw ex-tabel"><table><thead><tr><th>Kab/kota</th><th title="Hujan hari terakhir di arsip pengamatan">Hujan kemarin (mm)</th><th>Lengas</th><th title="Total prakiraan hujan besok">Prakiraan besok (mm)</th><th title="Ambang Waspada, hipotesis">Ambang (mm)</th><th title="Prakiraan dikurangi ambang">Lebihan (mm)</th><th>Banjir +1</th><th>Banjir +2</th><th>Banjir +3</th></tr></thead><tbody>${tb.map(b =>
    `<tr><td>${esc(b.nama)}</td><td class="n">${sel(b.hujan)}</td><td class="n">${b.lengas == null ? "–" : fmt(Math.round(b.lengas * 100) / 100)}</td><td class="n">${sel(b.prak)}</td><td class="n">${sel(b.ambang)}${b.sumberAmbang === "nasional" ? "*" : ""}</td><td class="n">${sel(b.lebih)}</td>${b.lv.map(v => `<td>${v == null ? "–" : LEVEL[v]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  $("#laporanIsi").innerHTML = `<header class="lp-kepala"><h2>Laporan prediksi banjir ${esc(s.nama)}</h2><p class="pr-kecil">Terbit ${esc(jamWIB(PR.d.dibuat))}. Alat bantu staf, tidak untuk disebar ke publik.</p></header>
    <details class="pr-kecil lp-batas" open><summary>Batasan</summary><ul>${PR.d.batasan.map(b => `<li>${esc(b)}</li>`).join("")}<li>Ambang hujan pemicu belum lolos uji; kab di luar sampel memakai angka nasional (bertanda *).</li></ul></details>
    ${kartuLap("Ringkasan", `<span class="hl">${fmt(w.length)} dari ${fmt(s.n)}</span> kab/kota ${esc(s.nama)} berpeluang banjir Waspada atau lebih besok`, tabel || '<p class="pr-kecil">Tidak ada kab/kota berlevel Waspada atau lebih dalam 3 hari.</p>')}
    <div class="lp-grid">${panel.join("")}</div>`;
}

$("#lpProv").addEventListener("change", gambarLaporan);
$("#lpCetak").addEventListener("click", () => window.print());
pasangTip();
```

Di `public/prediksi/prediksi.js`:

Ganti `pilihTab` menjadi:

```js
function pilihTab(t) {
  PR.tab = t;
  document.querySelectorAll("#tabs button").forEach(b => b.dataset.tab === t ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  document.querySelectorAll("main .page").forEach(s => s.classList.toggle("on", s.id === "p-" + t));
  if (t === "rapor" && !$("#rapor table, #rapor section")) gambarRapor();
  if (t === "dampak") muatDampak();
  if (t === "laporan") muatLaporan();
  else history.replaceState(null, "", t === "besok" ? "./" : "#" + t);
}
```

Di `mulai()`, ganti dua baris terakhir menjadi:

```js
  const tab = location.hash.slice(1).split("/")[0];
  if (["rapor", "dampak", "konfirmasi", "laporan"].includes(tab)) pilihTab(tab);
```

- [ ] **Step 5: CSS**

Tambahkan di akhir `public/prediksi/prediksi.css`:

```css
/* Tab Laporan provinsi (gaya FFGS BMKG): kisi 3 kolom panel peta, legenda kelas, cetak A4 lanskap. */
.lp-kendali{display:flex;gap:8px;align-items:center}
.lp-kendali select{flex:1}
.lp-kendali .iconbtn{border:0;background:none;box-shadow:none}
.lp-kepala h2{margin:4px 0}
.lp-batas{margin:6px 0 14px}
.lp-grid{display:grid;gap:14px;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:14px}
.lp-peta{width:100%;height:auto;max-height:340px;display:block}
.lp-peta path{stroke:#fff;stroke-width:.6;vector-effect:non-scaling-stroke}
.lp-peta path:hover{stroke:var(--ink);stroke-width:1.5}
.lp-leg{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11px;color:var(--ink2)}
.lp-leg span{display:inline-flex;align-items:center;gap:4px}
.lp-leg i{width:12px;height:12px;border-radius:3px;display:inline-block}
.lp-grid .ex-std .ex-jd>h3{font-size:15px}
@media (max-width:900px){.lp-grid{grid-template-columns:1fr}}
@media print{
  @page{size:A4 landscape;margin:10mm}
  header.top,.lp-kendali,#tip,.lp-ext{display:none!important}
  main .page{display:none!important}
  main #p-laporan{display:block!important;overflow:visible!important;height:auto!important}
  .lp-grid{grid-template-columns:repeat(3,1fr);gap:8px}
  .lp-grid .ex-std{break-inside:avoid;box-shadow:none}
  .lp-grid .ex-std:nth-child(3n+1){break-before:auto}
  .lp-peta{max-height:62mm}
  body{background:#fff}
}
```

(`.lp-ext` = panel peluang +2 dan +3 disembunyikan saat cetak supaya enam panel inti muat dua baris satu halaman; tabel tetap ikut.)

- [ ] **Step 6: Jalankan uji**

Run: `node --test tests/prediksi/prediksi.test.mjs tests/prediksi/laporan_prov.test.mjs tests/agen/gerbang-kartu-std.test.mjs`
Expected: PASS semua.

Run: `npm run uji:agen`
Expected: PASS (gerbang pemilik berkas: `laporan_prov.js` masuk wilayah agent `prediksi` lewat glob `public/prediksi/**`; bila gerbang menolak, perbaiki rosternya lewat `ilmu.mjs`, jangan melonggarkan gerbang).

- [ ] **Step 7: Commit**

```bash
git add public/prediksi/laporan_layar.js
git commit -m "prediksi: tab Laporan provinsi gaya FFGS (6 peta kab, tabel, cetak A4)" -- public/prediksi/laporan_layar.js public/prediksi/index.html public/prediksi/prediksi.js public/prediksi/prediksi.css tests/prediksi/prediksi.test.mjs tests/agen/gerbang-kartu-std.test.mjs
```

---

### Task 4: Bukti di peramban dan pemeriksa

**Files:** tidak ada berkas baru; perbaikan masuk ke berkas Task 1-3.

- [ ] **Step 1: Jalankan layar lokal**

Pakai `preview_start` dengan konfigurasi `.claude/launch.json` yang sudah ada untuk worker lokal (bila tidak ada, tambahkan entri `wrangler dev` sesuai `package.json`). Buka `/prediksi/#laporan/11`.

- [ ] **Step 2: Periksa**

- `read_console_messages` tanpa galat.
- Panel tampil 8 kartu (ringkasan + 6 peta + 2 peluang tambahan), peta Aceh 23 kab berwarna, tidak ada kab abu-abu kecuali yang memang tanpa data.
- Ganti ke DKI Jakarta (`31`): Kepulauan Seribu dan 5 kota tampil.
- Hover kab memunculkan tip nama + angka.
- `resize_window` mobile: panel satu kolom, tanpa geser horizontal.
- Pratinjau cetak: jalankan `matchMedia('print')` lewat emulasi atau cek CSS print dengan `javascript_tool` (`document.styleSheets`), lalu screenshot layar normal sebagai bukti.

- [ ] **Step 3: Pemeriksa konteks bersih (paralel, satu pesan)**

- `selera-angka`: berkas `public/prediksi/laporan_layar.js`, `public/prediksi/laporan_prov.js`.
- `inp-reviewer`: pendengar `#lpProv` change, hover `data-tip` pada `path` SVG, `gambarLaporan` (render 8 SVG per ganti provinsi).

Pengulas melapor; perbaikan oleh sesi induk, lalu ulangi Step 6 Task 3.

- [ ] **Step 4: Uji penuh dan commit perbaikan**

Run: `npm run uji:prediksi` lalu `npm run uji:agen`
Expected: PASS.

```bash
git commit -m "prediksi: perbaikan laporan provinsi dari pemeriksa" -- <berkas yang berubah>
```

- [ ] **Step 5: Push dan cek tayang**

`git pull --rebase --autostash origin main`, `git push origin main`, tunggu `terbit.yml` hijau, cek `/prediksi/laporan_prov.js` tayang (status 200) sebelum menyebut "tayang".
