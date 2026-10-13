"""Tambalan audit ops ke public/index.html (agen lain juga menyisip ke berkas ini, jadi lewat jangkar, bukan sunting langsung):
  1. escUrl(): tautan pihak ketiga (berita, media, kredit foto) hanya http(s); skema lain (javascript:, data:) jadi "#".
  2. kluster_awal.json di muatan pertama (tanpa poligon & api24); kluster_geo.json dimuat saat keluar dari tab Ringkasan,
     buka kompleks, atau Simulasi/Metode yang butuh api24. Jatuh ke kluster.json lengkap bila berkas pecahan belum ada.

Tiap jangkar harus cocok PERSIS sebanyak yang diharapkan; satu saja meleset = tidak ada yang ditulis. Sudah terpasang = dilewati.
Pakai:  python3 scripts/splice_ops.py [--cek] [--berkas public/index.html]
"""
import argparse
import pathlib
import sys

TANDA = "const escUrl = "
ATURAN = [
    # (nama, lama, baru, jumlah kemunculan yang diharapkan)
    ("escUrl", """const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));""",
     """const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* href dari data pihak ketiga (RSS berita, media, kredit foto): hanya http(s), selain itu (javascript:, data:, …) jadi "#" */
const escUrl = u => { const s = String(u ?? "").trim(); return /^https?:\\/\\//i.test(s) ? esc(s) : "#"; };""", 1),
    ("href a.url", 'href="${esc(a.url)}"', 'href="${escUrl(a.url)}"', 5),
    ("href a.url||#", 'href="${esc(a.url || "#")}"', 'href="${escUrl(a.url)}"', 1),
    ("href url_asli", 'href="${esc(a.url_asli || a.url || "#")}"', 'href="${escUrl(a.url_asli || a.url)}"', 2),
    ("href f.sumber", 'href="${esc(f.sumber)}"', 'href="${escUrl(f.sumber)}"', 1),
    ("kluster awal", 'muatJSON("data/kluster.json"),',
     'muatJSON("data/kluster_awal.json").then(d => (d.awal = true, d)).catch(() => muatJSON("data/kluster.json")),', 1),
    ("lengkapiKluster", "function bukaTab(id, dorong = true) {",
     """/* kluster_awal.json tidak memuat poligon & api24 (± 28 % lebih kecil); kluster_geo.json melengkapinya di tempat (objek fitur
   yang sama, urutan sama) saat pertama keluar dari Ringkasan atau membuka kompleks. Selalu resolve; gagal = boleh dicoba lagi. */
function lengkapiKluster() {
  if (!S.kluster?.awal) return Promise.resolve();
  return lengkapiKluster._p ||= muatJSON("data/kluster_geo.json").then(G => {
    for (const f of S.kluster.features) { const g = G[f.properties.id]; if (!g) continue; if (g[0]) f.geometry = g[0]; f.properties.api24 = g[1]; }
    S.kluster.awal = false; if (typeof peta !== "undefined" && peta) peta.getSource("kluster")?.setData(S.kluster);
  }).catch(e => { lengkapiKluster._p = null; console.warn("kluster_geo.json", e); });
}
function bukaTab(id, dorong = true) {
  if (id !== "ringkasan") lengkapiKluster();""", 1),
    ("sim tunggu", 'if (id === "sim") Sim.buka();', 'if (id === "sim") lengkapiKluster().then(() => Sim.buka());', 1),
    ("metode tunggu", 'if (id === "metode" && !sudah.metode) { sudah.metode = 1; renderMetode(); }',
     'if (id === "metode" && !sudah.metode) { sudah.metode = 1; lengkapiKluster().then(renderMetode); }', 1),
    ("siapkan tunggu", "    if (this.K) return this.K;", "    if (this.K) return this.K;\n    await lengkapiKluster();", 1),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--berkas", default=str(pathlib.Path(__file__).resolve().parents[1] / "public/index.html"))
    a = ap.parse_args()
    p = pathlib.Path(a.berkas)
    s = p.read_text()
    if TANDA in s:
        print(f"{p}: sudah terpasang, dilewati")
        return
    salah = [f"{n}: {s.count(lama)} kemunculan, diharapkan {k}" for n, lama, _, k in ATURAN if s.count(lama) != k]
    if salah:
        sys.exit("jangkar tidak cocok, tidak ada yang ditulis:\n  " + "\n  ".join(salah))
    if a.cek:
        print(f"{p}: {len(ATURAN)} jangkar cocok")
        return
    for _, lama, baru, _ in ATURAN:
        s = s.replace(lama, baru)
    p.write_text(s)
    print(f"{p}: {len(ATURAN)} tambalan dipasang")


if __name__ == "__main__":
    main()
