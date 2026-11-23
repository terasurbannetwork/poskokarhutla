// Uji prospektif guncangan gempa (PB-51): catat sebelum dinilai, append-only, berkas tanpa data. Python dijalankan di folder sementara.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

const PY = process.env.PYTHON || (spawnSync("python3", ["-c", "1"]).status === 0 ? "python3" : "python");

function jalan(kode, {galat = false} = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prosp-"));
  const pra = `import sys, json, os, datetime as dt
sys.path.insert(0, "scripts/gempa")
import prospektif as p
T = ${JSON.stringify(tmp)}
p.BERKAS = os.path.join(T, "prospektif_gempa.json")
class Wil:
    def letak(self, lat, lon, tempat): return ("x", None, tempat)
NOW = dt.datetime(2026, 11, 16, 12, 0, tzinfo=dt.timezone.utc)
ts = lambda jam: int((NOW - dt.timedelta(hours=jam)).timestamp())
PUSAT = {"p|k|a": [-6.9, 107.0], "p|k|b": [-7.2, 107.4], "p|k|c": [-6.5, 106.6]}
PEND = {"p|k|a": 200000, "p|k|b": 80000, "p|k|c": 50000}
def katalog(baris):
    f = os.path.join(T, "kat.json"); json.dump({"baris": baris}, open(f, "w")); return f
def muat(): return json.load(open(p.BERKAS))
`;
  const r = spawnSync(PY, ["-I", "-c", pra + kode], {encoding: "utf8"});
  fs.rmSync(tmp, {recursive: true, force: true});
  if (galat) return r;
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return JSON.parse(r.stdout.trim().split("\n").pop());
}

test("catat: hanya M>=5 baru (<=48 jam) di Indonesia, sekali per id, prakiraan ikut stempel dan sidik model", () => {
  const o = jalan(`
k = katalog([["a1", ts(5), -6.9, 107.0, 5.6, 10.0, "West Java", "M", None],
             ["a2", ts(60), -6.9, 107.0, 5.9, 10.0, "terlalu lama", "M", None],
             ["a3", ts(5), -6.9, 107.0, 4.9, 10.0, "terlalu kecil", "M", None]])
n1 = p.catat(sekarang=NOW, katalog=k, head=lambda: {}, wil=Wil(), pusat=PUSAT, pend=PEND, felt={})
n2 = p.catat(sekarang=NOW, katalog=k, head=lambda: {}, wil=Wil(), pusat=PUSAT, pend=PEND, felt={})
print(json.dumps({"n1": n1, "n2": n2, "a": muat()}))`);
  assert.equal(o.n1, 1); assert.equal(o.n2, 0, "catat ulang tidak menggandakan");
  const b = o.a.butir[0];
  assert.equal(b.id, "a1"); assert.equal(b.dicatat, "2026-11-16T12:00Z"); assert.equal(b.felt_sudah_ada, false);
  assert.equal(b.sidik_model.length, 12); assert.ok(b.prakiraan.mmi_maks >= 5, "M5,6 dangkal di atas kecamatan: MMI tinggi");
  assert.ok(["hijau", "kuning", "oranye", "merah"].includes(b.prakiraan.pager.kelas));
  assert.deepEqual(o.a.penilaian, []);
});

test("nilai: lawan Dirasakan BMKG sesudah >=1 hari, tanpa_pembanding sesudah 7 hari, tidak ditulis ulang, butir tak berubah", () => {
  const o = jalan(`
k = katalog([["a1", ts(5), -6.9, 107.0, 5.6, 10.0, "West Java", "M", None], ["a2", ts(6), -6.7, 106.9, 5.2, 10.0, "West Java", "M", None]])
p.catat(sekarang=NOW, katalog=k, head=lambda: {}, wil=Wil(), pusat=PUSAT, pend=PEND, felt={})
butir0 = muat()["butir"]
sebelum = p.nilai(sekarang=NOW + dt.timedelta(hours=2), head=lambda: {}, felt={"a1": "III Kab. A, IV Kab. B, II Kab. C"}, pager_arsip="/tidak/ada")
t1 = p.nilai(sekarang=NOW + dt.timedelta(days=2), head=lambda: {}, felt={"a1": "III Kab. A, IV Kab. B, II Kab. C"}, pager_arsip="/tidak/ada")
t2 = p.nilai(sekarang=NOW + dt.timedelta(days=3), head=lambda: {}, felt={"a1": "III Kab. A, IV Kab. B, II Kab. C"}, pager_arsip="/tidak/ada")
t3 = p.nilai(sekarang=NOW + dt.timedelta(days=9), head=lambda: {}, felt={"a1": "x"}, pager_arsip="/tidak/ada")
a = muat()
print(json.dumps({"sebelum": sebelum, "t1": t1, "t2": t2, "t3": t3, "a": a, "sama": a["butir"] == butir0}))`);
  assert.deepEqual(o.sebelum, [0, 0], "belum 1 hari: belum dinilai"); assert.deepEqual(o.t1, [1, 0]); assert.deepEqual(o.t2, [0, 0]);
  assert.deepEqual(o.t3, [1, 0], "a2 tanpa buletin dirasakan sesudah 7 hari");
  assert.equal(o.sama, true, "butir tidak pernah diubah");
  const [n1, n2] = o.a.penilaian;
  assert.equal(n1.status, "dinilai"); assert.equal(n1.felt_mmi_maks, 4); assert.equal(n1.selisih, +(n1.prakiraan_mmi_maks - 4).toFixed(2));
  assert.equal(n2.status, "tanpa_pembanding");
  assert.equal(o.a.metrik.mmi.n, 1); assert.equal(o.a.metrik.tanpa_pembanding_mmi, 1);
});

test("append-only: arsip lokal yang menyusut atau berubah dari HEAD ditolak, penilaian PAGER USGS ditambah di ujung", () => {
  const o = jalan(`
k = katalog([["a1", ts(5), -6.9, 107.0, 5.6, 10.0, "West Java", "M", None]])
p.catat(sekarang=NOW, katalog=k, head=lambda: {}, wil=Wil(), pusat=PUSAT, pend=PEND, felt={})
lokal = muat()
def tolak(head):
    try:
        p.catat(sekarang=NOW, katalog=k, head=lambda: head, wil=Wil(), pusat=PUSAT, pend=PEND, felt={}); return False
    except SystemExit as e:
        return e.code == 3
menyusut = tolak({"butir": lokal["butir"] + [{"id": "z"}]})
berubah = tolak({"butir": [dict(lokal["butir"][0], m=9.0)]})
utuh = tolak({"butir": lokal["butir"]})
pa = os.path.join(T, "pager.json")
json.dump({"butir": [{"id": "us1", "waktu_utc": "2026-11-01T00:00", "pager_resmi": {"kelas": "oranye"}}, {"id": "us2", "waktu_utc": "2026-11-01T00:00", "pager_resmi": {"kelas": "hijau"}},
                     {"id": "us3", "waktu_utc": "2026-11-15T00:00", "pager_resmi": {"kelas": "hijau"}}]}, open(pa, "w"))
alert = {"us1": {"alert": "red", "jiwa": "yellow"}, "us2": {"alert": None, "jiwa": None}, "us3": {"alert": "green", "jiwa": "green"}}
p.nilai(sekarang=NOW, head=lambda: {}, felt={}, usgs=lambda i: alert[i], pager_arsip=pa)
p.nilai(sekarang=NOW, head=lambda: {}, felt={}, usgs=lambda i: alert[i], pager_arsip=pa)
print(json.dumps({"menyusut": menyusut, "berubah": berubah, "utuh_ditolak": utuh, "pp": muat()["pager_penilaian"], "m": muat()["metrik"]}))`);
  assert.equal(o.menyusut, true); assert.equal(o.berubah, true); assert.equal(o.utuh_ditolak, false, "arsip sama dengan HEAD tetap boleh");
  assert.equal(o.pp.length, 1, "us3 baru 1 hari dan us2 belum terbit PAGER (ditunggu sampai 60 hari): tidak ditulis dobel");
  assert.equal(o.pp[0].selisih_kelas, 1); assert.equal(o.pp[0].kelas_usgs, "kuning", "level korban jiwa, bukan alert gabungan (red)");
  assert.deepEqual([o.m.pager.n, o.m.pager.persen_kelas_sama, o.m.pager.persen_dalam_1_kelas], [1, 0, 100]);
});

test("tanpa data: katalog kosong dan berkas belum ada tidak error, tanpa angka karangan", () => {
  const o = jalan(`
k = katalog([])
n = p.catat(sekarang=NOW, katalog=k, head=lambda: {}, wil=Wil(), pusat=PUSAT, pend=PEND, felt={})
r = p.nilai(sekarang=NOW, head=lambda: {}, felt={}, pager_arsip="/tidak/ada")
a = muat()
print(json.dumps({"n": n, "r": r, "a": a}))`);
  assert.equal(o.n, 0); assert.deepEqual(o.r, [0, 0]);
  assert.deepEqual([o.a.butir, o.a.penilaian, o.a.pager_penilaian], [[], [], []]);
  assert.equal(o.a.metrik.mmi, null); assert.equal(o.a.metrik.pager, null);
});

test("berkas tayang prospektif_gempa.json (bila ada) berbentuk benar dan butirnya punya stempel sebelum penilaian", () => {
  const f = "public/gempa/data/prospektif_gempa.json";
  if (!fs.existsSync(f)) return;
  const a = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const k of ["butir", "penilaian", "pager_penilaian"]) assert.ok(Array.isArray(a[k]), k);
  const ids = new Set();
  for (const b of a.butir) { assert.ok(!ids.has(b.id), "id ganda " + b.id); ids.add(b.id); assert.ok(b.dicatat && b.sidik_model && b.prakiraan); }
  const nilai = new Map(a.penilaian.map(x => [x.id, x]));
  for (const [id, n] of nilai) { assert.ok(ids.has(id), "penilaian tanpa butir " + id); assert.ok(n.dinilai >= a.butir.find(b => b.id === id).dicatat, "dinilai sebelum dicatat"); }
  assert.equal(nilai.size, a.penilaian.length, "satu penilaian per butir");
});

test("gempa.yml: catatan prospektif berjalan sesudah arsip InaTEWS dan berkasnya ikut di-commit", () => {
  const y = fs.readFileSync(".github/workflows/gempa.yml", "utf8");
  assert.ok(y.indexOf("prospektif.py catat") > y.indexOf("scripts/gempa/inatews.py"));
  assert.ok(y.includes("pager.py catat"));
  assert.ok(y.includes('"$c" -eq 3') && y.includes("::error"), "keluar 3 membuat langkah merah");
  assert.ok(y.includes("id: prospektif") && y.includes("steps.prospektif.outcome == 'failure'"), "commit tetap jalan bila hanya langkah ini merah");
  const langkah = y.slice(y.indexOf("- name: Catatan prospektif guncangan"), y.indexOf("- name: Commit data gempa"));
  assert.ok(!langkah.includes("continue-on-error"), "langkah prospektif tidak boleh continue-on-error");
  assert.ok(y.includes("prospektif_gempa.json") && y.includes("prospektif_pager.json"));
  assert.match(y, /for s in [^;]*\bprospektif\b[^;]*\bpager\b|for s in [^;]*\bpager\b[^;]*\bprospektif\b/, "uji dijalankan lebih dulu");
});

test("di_luar_jendela dihitung meleset, cakupan subset tertulis, dan metrik dipisah menurut felt_sudah_ada", () => {
  const o = jalan(`
k = katalog([["a1", ts(5), -6.9, 107.0, 5.6, 10.0, "West Java", "M", None], ["a2", ts(6), 1.8, 122.2, 5.4, 479.0, "Minahassa", "M", None], ["a3", ts(7), -6.8, 107.1, 5.5, 10.0, "West Java", "M", None]])
p.catat(sekarang=NOW, katalog=k, head=lambda: {}, wil=Wil(), pusat=PUSAT, pend=PEND, felt={"a3": "III X"})
p.nilai(sekarang=NOW + dt.timedelta(days=2), head=lambda: {}, felt={"a1": "III A", "a2": "II B", "a3": "III X"}, pager_arsip="/tidak/ada")
a = muat()
print(json.dumps({"st": {x["id"]: x["status"] for x in a["penilaian"]}, "m": a["metrik"], "aturan": a["aturan"]}))`);
  assert.deepEqual(o.st, {a1: "dinilai", a2: "di_luar_jendela", a3: "dinilai"});
  assert.equal(o.m.di_luar_jendela_mmi, 1); assert.equal(o.m.mmi.di_luar_jendela, 1); assert.equal(o.m.mmi.n_pembanding, 3);
  assert.ok(o.m.mmi.meleset >= 1, "yang di luar jendela ikut meleset");
  assert.ok(o.m.mmi.persen_dalam_1_termasuk_di_luar <= 66.7);
  assert.equal(o.m.cakupan.dicatat, 3); assert.equal(o.m.cakupan.dengan_pembanding, 3); assert.match(o.m.cakupan.catatan, /subset/);
  assert.equal(o.m.mmi_felt_sudah_ada.n_pembanding, 1); assert.equal(o.m.mmi_felt_belum_ada.n_pembanding, 2);
  assert.match(o.aturan, /subset/); assert.match(o.aturan, /felt_sudah_ada/);
});

test("PAGER: level jiwa tak tersedia = dinilai_gabungan di luar metrik; tanpa jawaban ditutup tepat sesudah 60 hari; simpan bertahap", () => {
  const o = jalan(`
pa = os.path.join(T, "pager.json")
mk = lambda i, tgl: {"id": i, "waktu_utc": tgl, "pager_resmi": {"kelas": "hijau"}}
json.dump({"butir": [mk("g1", "2026-11-01T00:00"), mk("m59", "2026-09-18T12:00"), mk("m60", "2026-09-17T12:00")]}, open(pa, "w"))
def usgs(i):
    if i == "g1": return {"alert": "orange", "jiwa": None}
    raise TimeoutError("lambat")
p.nilai(sekarang=NOW, head=lambda: {}, felt={}, usgs=usgs, pager_arsip=pa)
a = muat()
os.remove(p.BERKAS)
class Henti(BaseException): pass
def usgs2(i):
    if i == "g1": return {"alert": "green", "jiwa": "green"}
    raise Henti()
try:
    p.nilai(sekarang=NOW, head=lambda: {}, felt={}, usgs=usgs2, pager_arsip=pa)
except Henti:
    pass
print(json.dumps({"pp": a["pager_penilaian"], "m": a["metrik"], "bertahap": muat()["pager_penilaian"]}))`);
  const st = Object.fromEntries(o.pp.map(x => [x.id, x]));
  assert.equal(st.g1.status, "dinilai_gabungan"); assert.equal(st.g1.kelas_usgs_gabungan, "oranye"); assert.equal(st.g1.selisih_kelas, undefined);
  assert.equal(st.m60.status, "tanpa_pembanding", "umur 60 hari tanpa jawaban ditutup"); assert.equal(st.m59, undefined, "umur 59 hari masih ditunggu");
  assert.equal(o.m.pager, null, "gabungan tidak masuk metrik kelas jiwa"); assert.equal(o.m.dinilai_gabungan_pager, 1);
  assert.equal(o.bertahap.length, 1); assert.equal(o.bertahap[0].id, "g1", "tersimpan sebelum butir berikutnya melempar");
});

test("head_arsip: belum ada di HEAD = wajar ({}), git gagal = keluar 2; pelanggaran append-only keluar 3 sungguhan", () => {
  const o = jalan(`
import subprocess
g = lambda *a: subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *a], cwd=T, capture_output=True, text=True)
g("init", "-q"); g("commit", "-q", "--allow-empty", "-m", "x")
p.AKAR = T; p.BERKAS = os.path.join(T, "d", "prospektif_gempa.json")
wajar = p.head_arsip()
os.makedirs(os.path.dirname(p.BERKAS)); json.dump({"butir": [{"id": "a"}]}, open(p.BERKAS, "w")); g("add", "."); g("commit", "-q", "-m", "y")
print(json.dumps({"wajar": wajar, "ada": p.head_arsip()}))`);
  assert.deepEqual(o.wajar, {}); assert.deepEqual(o.ada, {butir: [{id: "a"}]});
  const gitRusak = jalan(`
p.AKAR = T   # bukan repositori git
p.head_arsip()`, {galat: true});
  assert.equal(gitRusak.status, 2, "git gagal harus galat, bukan {} diam-diam: " + gitRusak.stderr);
  const langgar = jalan(`
k = katalog([["a1", ts(5), -6.9, 107.0, 5.6, 10.0, "West Java", "M", None]])
p.catat(sekarang=NOW, katalog=k, head=lambda: {}, wil=Wil(), pusat=PUSAT, pend=PEND, felt={})
p.catat(sekarang=NOW, katalog=k, head=lambda: {"butir": [{"id": "z"}, {"id": "a1"}]}, wil=Wil(), pusat=PUSAT, pend=PEND, felt={})`, {galat: true});
  assert.equal(langgar.status, 3, "kode keluar 3 sungguhan: " + langgar.stderr); assert.match(langgar.stderr, /append-only/);
});
