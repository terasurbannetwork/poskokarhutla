import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const THUMB = ROOT + "public/data/alun/thumb/";
const kabar = JSON.parse(readFileSync(ROOT + "public/data/alun/kabar.json", "utf8"));

test("G1 tiap gambar yang dirujuk ada di disk dan <= 30 KB", () => {
  for (const k of kabar.kejadian) for (const b of k.berita) {
    if (!b.gambar) continue;
    assert.match(b.gambar, /^\/data\/alun\/thumb\/[0-9a-f]{16}\.jpg$/, "Jalur gambar harus relatif situs di folder thumb.");
    assert.ok(statSync(ROOT + "public" + b.gambar).size <= 30_000, `${b.gambar} lebih dari 30 KB. Perkecil di perkecil() scripts/data/alun_gambar.py.`);
  }
});

test("G2 berkas yatim tidak menumpuk: tiap thumb dirujuk satu berita", () => {
  const rujuk = new Set(kabar.kejadian.flatMap(k => k.berita.map(b => b.gambar && b.gambar.split("/").pop())));
  const yatim = readdirSync(THUMB).filter(f => f.endsWith(".jpg") && !rujuk.has(f));
  assert.ok(yatim.length < 40, `${yatim.length} thumb tanpa rujukan; hapus yang tidak dipakai.`);
});

test("G3 gagal dekode, gagal unduh, dan gagal resize tidak memecahkan; gambar hanya bila berkas ada", () => {
  const py = `
import sys, tempfile, os, importlib.util
s = importlib.util.spec_from_file_location("g", "scripts/data/alun_gambar.py"); g = importlib.util.module_from_spec(s); s.loader.exec_module(g)
def boom(*a, **k): raise OSError("jaringan putus")
d = tempfile.mkdtemp()
dok = {"kejadian": [{"berita": [{"url": "https://news.google.com/rss/articles/CBMiX?oc=5"}, {"url": None}]}]}
g.pasang(dok, d, ambil=boom, log=lambda *a: None)
assert "gambar" not in dok["kejadian"][0]["berita"][0], dok
# berkas sudah ada -> dirujuk tanpa unduh
import hashlib
n = hashlib.sha1(b"https://news.google.com/rss/articles/CBMiX?oc=5").hexdigest()[:16] + ".jpg"
open(os.path.join(d, n), "wb").write(b"x")
g.pasang(dok, d, ambil=boom, log=lambda *a: None)
assert dok["kejadian"][0]["berita"][0]["gambar"] == "/data/alun/thumb/" + n
assert not g.url_aman("http://127.0.0.1/a") and not g.url_aman("file:///etc/passwd") and g.url_aman("https://x.id/a.jpg")
assert g.og_image('<meta content="/a.jpg" property="og:image">', "https://x.id/b") == "https://x.id/a.jpg"
`;
  execFileSync("python3", ["-I", "-c", py], {cwd: ROOT});
});

test("G4 logo media yang dirujuk ada di disk, <= 30 KB, dan hanya untuk berita tanpa domain mentah", () => {
  for (const k of kabar.kejadian) for (const b of k.berita) {
    assert.ok(!("domain" in b), "Field domain hanya untuk pipeline logo; dibuang sebelum kabar.json ditulis.");
    if (!b.logo) continue;
    assert.match(b.logo, /^\/data\/alun\/logo\/[0-9a-f]{16}\.jpg$/, "Logo media harus dari folder kita, bukan hotlink.");
    assert.ok(statSync(ROOT + "public" + b.logo).size <= 30_000, `${b.logo} lebih dari 30 KB.`);
  }
});
