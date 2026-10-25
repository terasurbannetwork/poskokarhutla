"""Bersihkan cache Actions lama supaya repo tidak melewati batas gratis 10 GB.

Insiden 23 Okt 2026: tiap jalan data menyimpan salinan baru `data-<run_id>` (~1,4 GB) padahal yang dipulihkan hanya yang
terbaru (restore-keys: data-). Lima salinan + cache lab melewati 10 GB, GitHub menggusur cache, dan udara.yml tidak
menemukan data segar. Skrip ini menyimpan SIMPAN salinan terbaru per awalan untuk kunci berbentuk `<awalan>-<angka run>`;
kunci lain (mis. lab-v1-<hash>, node-cache-...) tidak disentuh.

Pakai (di Actions, GH_TOKEN dengan izin actions: write):
        python3 scripts/terbit/bersih_cache.py          # hapus
        python3 scripts/terbit/bersih_cache.py lihat    # hanya tampilkan rencana
        python3 scripts/terbit/bersih_cache.py uji      # self-check
"""
import json, os, re, sys, urllib.request

SIMPAN = 2
POLA = re.compile(r"^(.+)-(\d+)$")


def rencana(caches, simpan=SIMPAN):
    """caches = [{"id", "key", "created_at", "size_in_bytes"}] -> daftar yang dihapus (lama, per awalan, simpan N terbaru)."""
    per = {}
    for c in caches:
        m = POLA.match(c["key"])
        if m:
            per.setdefault(m.group(1), []).append(c)
    hapus = []
    for daftar in per.values():
        daftar.sort(key=lambda c: (c["created_at"], int(POLA.match(c["key"]).group(2))), reverse=True)
        hapus += daftar[simpan:]
    return hapus


def api(jalur, metode="GET"):
    req = urllib.request.Request(f"https://api.github.com/repos/{os.environ['GITHUB_REPOSITORY']}{jalur}", method=metode,
                                 headers={"Authorization": f"Bearer {os.environ['GH_TOKEN']}", "Accept": "application/vnd.github+json",
                                          "X-GitHub-Api-Version": "2022-11-28"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r) if metode == "GET" else None


def semua():
    out, hal = [], 1
    while True:
        d = api(f"/actions/caches?per_page=100&page={hal}")
        out += d["actions_caches"]
        if len(d["actions_caches"]) < 100:
            return out
        hal += 1


def uji():
    c = lambda i, k, t: {"id": i, "key": k, "created_at": t, "size_in_bytes": 1}
    caches = [c(1, "data-100", "2026-10-22T19"), c(2, "data-200", "2026-10-23T00"), c(3, "data-300", "2026-10-23T04"),
              c(4, "prospektif-300", "2026-10-23T04"), c(5, "lab-v1-a2212e81", "2026-10-23T08"), c(6, "node-cache-Linux-x64-npm-89", "2026-10-21"),
              c(7, "data-50", "2026-10-21T00")]
    h = sorted(x["id"] for x in rencana(caches))
    assert h == [1, 7], h   # data- simpan 2 terbaru (300, 200); prospektif satu-satunya; lab & node TIDAK disentuh
    assert rencana(caches, simpan=10) == []
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
        sys.exit(0)
    h = rencana(semua())
    print(f"{len(h)} cache lama, {sum(x['size_in_bytes'] for x in h) / 2**30:.1f} GB")
    for x in h:
        print(f"  {x['key']}  {x['created_at']}  {x['size_in_bytes'] / 2**20:.0f} MB")
        if sys.argv[1:] != ["lihat"]:
            api(f"/actions/caches/{x['id']}", "DELETE")
