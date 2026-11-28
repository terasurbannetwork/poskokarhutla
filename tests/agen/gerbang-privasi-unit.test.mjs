/* G-5 gerbang privasi Ruang Unit (RU-024; data/kajian-bnpb/kedeputian/RENCANA-UJI.md 7.1, KEAMANAN-PRIVASI.md 3 dan 4, DESAIN-TEKNIS.md 8 dan 9.2).
   Prinsip 6 KEPUTUSAN-AWAL: tidak memanen nama, kontak, atau tanggal lahir orang. Data staf hanya di R2 unit/, tidak di public/.
   Pemeriksa = fungsi murni yang diuji menolak masukan palsu di berkas ini; kode nyata dijalankan: panen.py --cek dan pemanen CKAN
   atas tangkapan tersimpan (urlopen diganti pembaca fixture, tanpa jaringan), lalu keluarannya diperiksa dengan pemeriksa yang sama.
   Butir 7.1:
     a  kolom migrasi tabel Ruang Unit (0110 ke atas) dan kunci JSON keluaran/fixture        -> periksaMigrasi, periksaJson
     b  skrip scripts/bnpb/unit/**: perangkat_penilaian_awal, outFields=*, tanpa returnGeometry -> periksaSkrip + DILARANG nyata
     c  berkas terlacak: masukan KEU-1/IRT-1, tlhp_*, keluaran unit di public/                -> periksaTerlacak
     d  nomor WA terang: kolom/kunci wa, no_wa, hp ditolak butir a; hash bergaram (mis. wa_hash) lolos karena tidak cocok pola
     e  rekap WIL-2 < 10 jiwa: BELUM DIGERBANGI, unit/pengungsian.json dan fixture-nya belum ada (WIL-2, DT 6.15). Tambah saat ada.
   Belum digerbangi juga (di luar wilayah, mekanik-mesin): pola nama berkas masukan KEU-1/IRT-1 di .gitignore; DT tidak menamai
   berkasnya (masukan dibaca dari luar repo), jadi yang dijaga di sini hanya jenis berkas dan data/raw/unit yang diabaikan git. */
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync, execFileSync} from 'node:child_process'
import {readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const baca = p => readFileSync(path.join(ROOT, p), 'utf8')
const telusur = (dir, re) => !existsSync(path.join(ROOT, dir)) ? [] : readdirSync(path.join(ROOT, dir), {withFileTypes: true}).flatMap(e => {
  const rel = `${dir}/${e.name}`
  return e.isDirectory() ? telusur(rel, re) : re.test(e.name) && !/ 2\./.test(e.name) ? [rel] : []
})

// ---------- pemeriksa murni ----------

/** RU 7.1 butir a, persis. nama_tempat, nama_desa, nama_lembaga tidak cocok, jadi lolos tanpa daftar putih tambahan. */
export const PRIBADI = /^(nama(_orang|_pengungsi|_koordinator|_pejabat|_penyedia)?|nik|nip|kk_no|telepon|tel|hp|wa|no_wa|nomor_wa|email|surel|tgl_lahir|tanggal_lahir|alamat(_rumah)?)$/
/** Tabel Ruang Unit (DT 1.4 dan 2.2: 0112_unit, 0113_pengungsian). tlhp_* dilarang dibuat sama sekali (U9, RU 9 butir 9). */
const TABEL_UNIT = /^(unit_\w+|akses_status|hibah_bast|diklat_angkatan|pengungsian_tempat|pengungsian_harian|tlhp_\w*)$/
const PERBAIKI_A = 'PERBAIKI: simpan id (staf:<id>, id profil) atau agregat, bukan data orang; WA hanya hash bergaram secret (KEAMANAN-PRIVASI 4 butir 10, DT 9.2).'

const bersihSql = s => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
const potongAtas = s => { const out = []; let d = 0, m = 0
  for (let i = 0; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')') d--; else if (s[i] === ',' && d === 0) { out.push(s.slice(m, i)); m = i + 1 } }
  return [...out, s.slice(m)] }
const nama = t => t.replace(/[`"[\]]/g, '').toLowerCase()

/** Butir a (migrasi): kolom data pribadi di tabel Ruang Unit, dan tabel tlhp_*. -> [pesan] */
export function periksaMigrasi(sql, berkas) {
  const s = bersihSql(sql), salah = []
  for (const m of s.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[\]\w]+)\s*\(/gi)) {
    const t = nama(m[1])
    if (!TABEL_UNIT.test(t)) continue
    if (t.startsWith('tlhp_')) { salah.push(`${berkas}: tabel ${t} dilarang (U9: data TLHP hanya skrip lokal, RU 9 butir 9)`); continue }
    let d = 1, i = m.index + m[0].length
    for (; i < s.length && d; i++) d += s[i] === '(' ? 1 : s[i] === ')' ? -1 : 0
    for (const bag of potongAtas(s.slice(m.index + m[0].length, i - 1))) {
      const k = bag.trim().match(/^([`"[\]\w]+)/)
      if (!k || /^(constraint|primary|unique|check|foreign)$/i.test(k[1])) continue
      if (PRIBADI.test(nama(k[1]))) salah.push(`${berkas}: tabel ${t} kolom ${nama(k[1])} (data pribadi, RU 7.1 butir a)`)
    }
  }
  for (const m of s.matchAll(/ALTER\s+TABLE\s+([`"[\]\w]+)\s+ADD\s+(?:COLUMN\s+)?([`"[\]\w]+)/gi)) {
    const t = nama(m[1]), k = nama(m[2])
    if (TABEL_UNIT.test(t) && PRIBADI.test(k)) salah.push(`${berkas}: tabel ${t} kolom ${k} (data pribadi, RU 7.1 butir a)`)
  }
  return salah
}

const EMAIL = /[\w.+-]+@[\w-]+\.[a-z][\w.-]*/i
const HP = /(?:\+62|(?<!\d)62|(?<!\d)0)8\d{7,11}(?!\d)/
/** Atribusi DT 4.8 {nama, url, diambil, lisensi}: `nama` = nama sumber data, bukan orang. Hanya bentuk ini yang lolos. */
const atribusi = o => typeof o.url === 'string' && 'diambil' in o
/** Butir a dan d (JSON): kunci data pribadi, serta nilai berbentuk surel atau nomor HP. -> [pesan] */
export function periksaJson(obj, berkas) {
  const salah = []
  const jalan = (v, j) => {
    if (Array.isArray(v)) return v.forEach((x, i) => jalan(x, `${j}[${i}]`))
    if (typeof v === 'string') {
      if (EMAIL.test(v)) salah.push(`${berkas}: ${j} berisi alamat surel`)
      if (HP.test(v)) salah.push(`${berkas}: ${j} berisi nomor HP/WA terang`)
      return
    }
    if (!v || typeof v !== 'object') return
    for (const [k, x] of Object.entries(v)) {
      if (PRIBADI.test(k.toLowerCase()) && !(k === 'nama' && atribusi(v))) salah.push(`${berkas}: kunci ${j}.${k} (data pribadi, RU 7.1 butir a)`)
      jalan(x, `${j}.${k}`)
    }
  }
  jalan(obj, '$')
  return salah
}

/** Buang badan def cek(...) Python: kasus uji yang MEMANG harus ditolak DILARANG tinggal di sana dan dijalankan dengan urlopen tiruan.
    ponytail: batas blok = baris berikut yang mulai di kolom 0; cukup untuk gaya skrip repo ini. */
const tanpaCek = src => src.replace(/^def cek\([^\n]*\n(?:[ \t]+[^\n]*\n|[ \t]*\n)*/m, '')
/** Butir b (skrip panen): URL literal ke layer pribadi atau kueri ArcGIS non-agregat. -> [pesan] */
export function periksaSkrip(src, berkas) {
  const salah = []
  for (const [u] of tanpaCek(src).matchAll(/https?:\/\/[^\s"'`<>)]+/g)) {
    let d = u; for (let i = 0; i < 5; i++) { try { d = decodeURIComponent(d) } catch { break } }
    const k = d.toLowerCase()
    if (/perangkat_penilaian_awal|survey123/.test(k)) salah.push(`${berkas}: URL ${u} ke layer Survey123 yang membuka nama, kontak, tanggal lahir (U6)`)
    if (!/^https?:\/\/gis\.bnpb\.go\.id\//.test(k)) continue
    if (/[?&]outfields=[^&]*\*/.test(k)) salah.push(`${berkas}: URL ${u} memakai outFields=* (tulis daftar kolom, RU 9 butir 10)`)
    if (/\/query\/?\?/.test(k) && !/[?&]returngeometry=false(&|$)/.test(k)) salah.push(`${berkas}: URL ${u} kueri ArcGIS tanpa returnGeometry=false (titik rumah/orang)`)
  }
  return salah
}

/** Butir c dan "data staf hanya R2 unit/": berkas terlacak git. -> [pesan] */
export function periksaTerlacak(daftar) {
  const salah = []
  for (const f of daftar) {
    if (/(^|\/)tlhp_[^/]*$/i.test(f)) salah.push(`${f}: keluaran IRT-1 (TLHP) hanya di luar repo (U9, DT 5.33)`)
    if (/^(scripts\/bnpb\/unit|tests\/bnpb\/fixtures\/unit)(_[^/]*)?\/.*\.(pdf|xlsx?|docx?|csv)$/i.test(f)) salah.push(`${f}: masukan internal (draf LAKIP/LK, ekspor SIPTL) tidak di-commit; fixture JSON yang dibersihkan saja (KEAMANAN-PRIVASI 3 kelas L)`)
    if (/^public\/(data\/(bnpb\/)?unit[^/]*|bnpb\/unit\/.*\.json$|data\/bnpb\/unit\/)/.test(f)) salah.push(`${f}: keluaran Ruang Unit di public/ (kelas X, KEAMANAN-PRIVASI 3.1); data staf hanya R2 unit/ lewat rute staf`)
  }
  return salah
}

// ---------- kode nyata ----------

/* Pemanen CKAN dijalankan atas tangkapan tests/bnpb/fixtures/unit/ckan/: _buka diganti pembaca fixture, CACHE ke folder sementara.
   DILARANG diuji lewat diizinkan() modul yang sama, bukan salinan. */
const URL_LARANG = [
  'https://gis.bnpb.go.id/server/rest/services/survey123/perangkat_penilaian_awal_final/FeatureServer/10/query?f=json&outFields=kab&returnGeometry=false',
  'https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=*&returnGeometry=false',
  'https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=kab&returnGeometry=true',
  'https://inalogpal.bnpb.go.id/Api/get_instansi_survey',
]
const HARNESS = `
import io, json, os, sys, tempfile
akar = sys.argv[1]
sys.path.insert(0, os.path.join(akar, "scripts", "bnpb", "unit"))
import panen
fx = os.path.join(akar, "tests", "bnpb", "fixtures", "unit", "ckan")
isi = {a: open(os.path.join(fx, a + ".json"), "rb").read() for a in ("organization_list", "package_search")}
class J:
    def __init__(s, b, u): s.b, s.u, s.status, s.headers = io.BytesIO(b), u, 200, {"Content-Length": str(len(b))}
    def geturl(s): return s.u
    def read(s, n=-1): return s.b.read(n)
    def __enter__(s): return s
    def __exit__(s, *a): return False
def buka(req, timeout=None):
    u = req.full_url
    if u.endswith("/robots.txt"): return J(b"", u)
    a = u.split("/action/")[-1].split("?")[0]
    if a not in isi: raise AssertionError("permintaan tak terduga " + u)
    return J(isi[a], u)
panen._buka, panen._tidur, panen.jaring.jeda = buka, lambda s: None, (lambda h, d: None)
ditolak = {}
for u in json.loads(sys.argv[2]):
    try: panen.diizinkan(u); ditolak[u] = False
    except panen.Dilarang: ditolak[u] = True
with tempfile.TemporaryDirectory() as d:
    panen.CACHE = d
    keluar = {"paket": panen.ckan_paket(), "organisasi": panen.ckan_organisasi()}
kel = None
if os.path.exists(os.path.join(akar, "scripts", "bnpb", "unit", "jalan.py")):
    sys.path.insert(0, os.path.join(akar, "scripts", "bnpb"))
    import jalan; kel = jalan.KELUAR
print(json.dumps({"keluar": keluar, "ditolak": ditolak, "KELUAR": kel}))
`
const python = (args, akar = ROOT) => {
  const p = spawnSync('python3', ['-I', ...args], {cwd: akar, encoding: 'utf8', timeout: 60000})
  return {kode: p.status, out: p.stdout, err: (p.stderr || '') + (p.error ? String(p.error) : '')}
}
const panenNyata = (akar = ROOT) => {
  const p = python(['-c', HARNESS, akar, JSON.stringify(URL_LARANG)], akar)
  assert.equal(p.kode, 0, `pemanen CKAN gagal dijalankan atas fixture:\n${p.err}`)
  return JSON.parse(p.out)
}
/** Kolom CKAN bernilai data orang (DT 4.8 "TEMBOLOK BERISI DATA PRIBADI"); kunci DAN nilainya tidak boleh sampai keluaran. */
const CKAN_PRIBADI = ['author', 'author_email', 'maintainer', 'maintainer_email', 'creator_user_id', 'email', 'users', 'user']
const nilaiPribadiFixture = akar => {
  const n = new Set()
  const jalan = v => { if (Array.isArray(v)) return v.forEach(jalan); if (!v || typeof v !== 'object') return
    for (const [k, x] of Object.entries(v)) { if (CKAN_PRIBADI.includes(k) && typeof x === 'string' && x.trim()) n.add(x); jalan(x) } }
  for (const a of ['organization_list', 'package_search']) jalan(JSON.parse(readFileSync(path.join(akar, 'tests/bnpb/fixtures/unit/ckan', a + '.json'), 'utf8')))
  return n
}
/** Pelanggaran keluaran pemanen: kunci pribadi (butir a), kunci CKAN pribadi, nilai pribadi fixture yang bocor, DILARANG yang lolos. */
export function periksaPanen(hasil, nilaiPribadi) {
  const salah = periksaJson(hasil.keluar, 'keluaran ckan_paket/ckan_organisasi')
  const jalan = (v, j) => {
    if (Array.isArray(v)) return v.forEach((x, i) => jalan(x, `${j}[${i}]`))
    if (typeof v === 'string' && nilaiPribadi.has(v)) salah.push(`keluaran pemanen ${j} membawa nilai kolom pribadi CKAN "${v}"`)
    if (!v || typeof v !== 'object') return
    for (const [k, x] of Object.entries(v)) { if (CKAN_PRIBADI.includes(k)) salah.push(`keluaran pemanen ${j}.${k}: kolom pribadi CKAN`); jalan(x, `${j}.${k}`) }
  }
  jalan(hasil.keluar, '$')
  for (const [u, t] of Object.entries(hasil.ditolak)) if (!t) salah.push(`panen.diizinkan() meloloskan URL terlarang ${u}`)
  return salah
}
const tegas = (salah, sebab, akibat, perbaiki) => assert.deepEqual(salah, [], `SEBAB: ${sebab}\nAKIBAT: ${akibat}\n${perbaiki}`)

// ---------- uji repo ----------

test('G-5 b: panen.py --cek lulus (DILARANG, cache, coba ulang, kolom daftar putih CKAN)', () => {
  const p = python(['scripts/bnpb/unit/panen.py', '--cek'])
  assert.equal(p.kode, 0, `SEBAB: self-check pemanen Ruang Unit merah.\nAKIBAT: larangan panen data pribadi tidak terbukti.\nPERBAIKI: betulkan scripts/bnpb/unit/panen.py (ruang-bnpb).\n${p.err}`)
  assert.match(p.out, /panen\.py --cek: lulus/)
})

test('G-5 a, b: pemanen CKAN nyata atas fixture tidak menyimpan kolom pribadi; DILARANG menolak layer pribadi', () => {
  const nilai = nilaiPribadiFixture(ROOT)
  assert.ok(nilai.size > 0, 'fixture CKAN tanpa satu pun nilai author/maintainer: uji kebocoran nilai jadi buta, pulihkan tests/bnpb/fixtures/unit/ckan/')
  const h = panenNyata()
  assert.ok(h.keluar.paket.paket.length > 0 && h.keluar.organisasi.organisasi.length > 0, 'pemanen tidak mengembalikan paket/organisasi dari fixture')
  tegas(periksaPanen(h, nilai), 'ckan_paket/ckan_organisasi membawa kolom atau nilai data orang, atau DILARANG meloloskan URL terlarang.',
    'email, nama penulis, dan id pembuat CKAN sampai ke berkas R2 unit/ (PDP; KEAMANAN-PRIVASI 4).',
    'PERBAIKI: kolom keluaran hanya daftar putih PAKET_KOLOM/ORG_KOLOM di scripts/bnpb/unit/panen.py; aturan DILARANG tidak dihapus.')
})

test('G-5: keluaran Ruang Unit tidak ke public/ (jalan.py KELUAR, langkah workflow --keluar)', () => {
  const h = panenNyata()
  if (h.KELUAR !== null) assert.ok(!path.resolve(h.KELUAR).startsWith(path.join(ROOT, 'public')), `jalan.KELUAR = ${h.KELUAR} berada di public/: data staf hanya R2 unit/`)
  const salah = []
  for (const f of telusur('.github/workflows', /\.ya?ml$/)) for (const m of baca(f).matchAll(/scripts\/bnpb\/unit\/jalan\.py[^\n]*--keluar[ =]+(\S+)/g))
    if (/^(\.\/)?public\b|\/public\//.test(m[1].replace(/["']/g, ''))) salah.push(`${f}: jalan.py --keluar ${m[1]}`)
  tegas(salah, 'langkah workflow menulis keluaran Ruang Unit ke public/.', 'data staf terbit ke situs publik tanpa sesi.', 'PERBAIKI: --keluar ke /tmp/unit lalu unggah ke R2 unit/ (DT 2.3).')
})

test('G-5 a: migrasi tabel Ruang Unit (0110 ke atas) tanpa kolom data pribadi dan tanpa tlhp_*', () => {
  const salah = telusur('migrations', /\.sql$/).filter(f => Number(path.basename(f).slice(0, 4)) >= 110).flatMap(f => periksaMigrasi(baca(f), f))
  tegas(salah, 'migrasi membuat kolom nama/kontak/tanggal lahir di tabel Ruang Unit, atau tabel tlhp_*.', 'data orang tersimpan di D1 produksi (Prinsip 6, U9).', PERBAIKI_A)
})

test('G-5 a, d: fixture dan JSON Ruang Unit tanpa kunci data pribadi, surel, atau nomor HP terang', () => {
  const daftar = [...telusur('tests/bnpb/fixtures', /\.json$/).filter(f => /^tests\/bnpb\/fixtures\/unit(_[^/]*)?\//.test(f) || /^tests\/bnpb\/fixtures\/unit_[^/]*\.json$/.test(f)),
    ...telusur('tests/wa/fixtures', /\.json$/)]
  assert.ok(daftar.includes('tests/bnpb/fixtures/unit/r2/contoh.json'), 'fixture R2 Ruang Unit tidak terbaca: pemindai menunjuk folder yang salah')
  const salah = daftar.flatMap(f => periksaJson(JSON.parse(baca(f)), f))
  tegas(salah, 'JSON Ruang Unit memuat kunci nama/nik/hp/wa/email/alamat atau nilai surel/HP.', 'fixture atau keluaran membawa data orang ke repo publik.', `${PERBAIKI_A} Fixture dari dokumen nyata dibersihkan dulu (DT 9.2 butir 5).`)
})

test('G-5 b: skrip scripts/bnpb/unit/** tanpa URL Survey123, outFields=*, atau kueri ArcGIS bergeometri', () => {
  const daftar = telusur('scripts/bnpb/unit', /\.(py|mjs|js)$/)
  assert.ok(daftar.includes('scripts/bnpb/unit/panen.py'), 'scripts/bnpb/unit/panen.py tidak terbaca')
  tegas(daftar.flatMap(f => periksaSkrip(baca(f), f)), 'skrip Ruang Unit menyebut URL layer pribadi atau kueri ArcGIS non-agregat.',
    'pemanen menarik nama, kontak, atau titik rumah orang.', 'PERBAIKI: agregat kab dengan returnGeometry=false dan outFields daftar kolom (DT 8 "Dilarang dipanen").')
})

test('G-5 c: berkas terlacak tanpa masukan internal KEU-1/IRT-1 dan tanpa keluaran unit di public/; data/raw/unit diabaikan git', () => {
  const daftar = execFileSync('git', ['ls-files', '-z'], {cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28}).split('\0').filter(Boolean)
  tegas(periksaTerlacak(daftar), 'berkas internal BNPB (LAKIP, TLHP) atau keluaran Ruang Unit ikut dilacak git.', 'data kelas L/X terbit di repo publik.',
    'PERBAIKI: git rm --cached berkasnya, simpan di luar repo (KEAMANAN-PRIVASI 3).')
  const p = spawnSync('git', ['check-ignore', '-q', 'data/raw/unit/ckan/x.json'], {cwd: ROOT})
  assert.equal(p.status, 0, 'SEBAB: data/raw/unit/ tidak diabaikan git.\nAKIBAT: tembolok CKAN mentah (email, author) bisa ter-commit.\nPERBAIKI: pulihkan data/raw/* di .gitignore (mekanik-mesin).')
})

// ---------- mode gagal: pemeriksa dan kode nyata wajib merah pada pelanggaran buatan ----------

test('mode gagal: migrasi no_wa TEXT, skrip outFields=*, JSON berkunci nik ditolak dengan berkas dan nama kolom', () => {
  const m = periksaMigrasi('-- uji\nCREATE TABLE IF NOT EXISTS pengungsian_tempat (\n  id TEXT PRIMARY KEY,\n  nama_tempat TEXT,\n  no_wa TEXT,\n  CHECK (length(id) > 0)\n);', 'migrations/0999_palsu.sql')
  assert.equal(m.length, 1); assert.match(m[0], /0999_palsu\.sql.*no_wa/)
  assert.match(periksaMigrasi('ALTER TABLE unit_ketuk ADD COLUMN email TEXT;', 'm.sql')[0], /m\.sql.*email/)
  assert.match(periksaMigrasi('CREATE TABLE tlhp_rek (id TEXT);', 'm.sql')[0], /tlhp_rek/)
  assert.deepEqual(periksaMigrasi('CREATE TABLE lain (nama TEXT, hp TEXT); CREATE TABLE unit_ketuk (id TEXT, oleh TEXT, wa_hash TEXT, nama_lembaga TEXT);', 'm.sql'), [], 'tabel bukan unit dan kolom sah tidak boleh ditolak')

  const s = periksaSkrip('URL = "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=*&returnGeometry=false"', 'scripts/bnpb/unit/palsu.py')
  assert.equal(s.length, 1); assert.match(s[0], /palsu\.py.*outFields=\*/)
  assert.equal(periksaSkrip('u = "https://gis.bnpb.go.id/a/survey123/perangkat_penilaian_awal_final/FeatureServer/10"', 'p.py').length, 1)
  assert.equal(periksaSkrip('u = "https://gis.bnpb.go.id/a/FeatureServer/0/query?outFields=kab%2C%252A&returnGeometry=false"', 'p.py').length, 1)
  assert.equal(periksaSkrip('u = "https://gis.bnpb.go.id/a/FeatureServer/0/query?outFields=kab"', 'p.py').length, 1)
  assert.deepEqual(periksaSkrip('u = "https://gis.bnpb.go.id/a/FeatureServer/0/query?outFields=kab,jumlah&returnGeometry=false"\ndef cek():\n    x = "https://gis.bnpb.go.id/survey123/q?outFields=*"\n\nprint(1)', 'p.py'), [], 'URL sah dan kasus di dalam cek() tidak boleh ditolak')

  const j = periksaJson({dibuat: 'x', baris: [{kab: '1101', nik: '0'}]}, 'tests/bnpb/fixtures/unit/r2/palsu.json')
  assert.equal(j.length, 1); assert.match(j[0], /palsu\.json.*nik/)
  assert.equal(periksaJson({catatan: 'hubungi 081234567890'}, 'a.json').length, 1)
  assert.equal(periksaJson({c: 'kirim ke orang@contoh.id'}, 'a.json').length, 1)
  assert.equal(periksaJson({baris: [{nama: 'Budi', url: 'https://x'}]}, 'a.json').length, 1, '`nama` tanpa bentuk atribusi lengkap tidak boleh lolos')
  assert.deepEqual(periksaJson({sumber: [{nama: 'Portal Satu Data BNPB', url: 'https://data.bnpb.go.id/', diambil: '2026-11-26T00:00:00Z'}], nama_desa: 'x', n: 81234567}, 'a.json'), [])

  assert.equal(periksaTerlacak(['scripts/bnpb/unit/lakip_2025.pdf', 'tests/bnpb/fixtures/unit/tlhp_2026.html', 'public/data/bnpb/unit/stok.json', 'public/bnpb/unit/pengadaan.json', 'public/bnpb/unit/rapor.js', 'public/banjir/data/unit_respons.json']).length, 4)
})

test('mode gagal: pemanen nyata yang dimutasi (kolom maintainer_email, aturan survey123 dicabut) terdeteksi merah', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'g5-'))
  try {
    for (const f of ['scripts/bnpb/unit/panen.py', 'scripts/umum/jaring.py', 'tests/bnpb/fixtures/unit/ckan/organization_list.json', 'tests/bnpb/fixtures/unit/ckan/package_search.json']) {
      mkdirSync(path.join(tmp, path.dirname(f)), {recursive: true}); copyFileSync(path.join(ROOT, f), path.join(tmp, f))
    }
    const asli = baca('scripts/bnpb/unit/panen.py')
    let kini = asli   // mutasi bertumpuk di atas `kini`; set ulang ke asli untuk mulai bersih
    const mutasi = (dari, ke) => { assert.ok(kini.includes(dari), `jangkar mutasi hilang dari panen.py: ${dari}`); kini = kini.replace(dari, ke); writeFileSync(path.join(tmp, 'scripts/bnpb/unit/panen.py'), kini) }
    const nilai = nilaiPribadiFixture(tmp)
    assert.deepEqual(periksaPanen(panenNyata(tmp), nilai), [], 'salinan tanpa mutasi harus bersih (kendali)')

    mutasi('PAKET_KOLOM = ("id", ', 'PAKET_KOLOM = ("maintainer_email", "author", "id", ')
    const a = periksaPanen(panenNyata(tmp), nilai)
    assert.ok(a.some(p => /maintainer_email/.test(p)) && a.some(p => /nilai kolom pribadi CKAN/.test(p)), `kolom pribadi yang ditambah lolos: ${a}`)

    kini = asli
    mutasi('(lambda u: "survey123" in u["teks"]', '(lambda u: False')
    const b = periksaPanen(panenNyata(tmp), nilai)
    assert.deepEqual(b.filter(p => /meloloskan/.test(p)).length, 0, 'aturan perangkat_penilaian_awal kedua masih menahan URL uji pertama')
    mutasi('(lambda u: "perangkat_penilaian_awal" in u["teks"]', '(lambda u: False')
    const c = periksaPanen(panenNyata(tmp), nilai)
    assert.ok(c.some(p => /meloloskan URL terlarang .*survey123/.test(p)), `DILARANG yang dicabut tidak terdeteksi: ${c}`)
  } finally { rmSync(tmp, {recursive: true, force: true}) }
})
