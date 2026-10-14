"""Langkah build sebelum `wrangler deploy` (Actions saja; hasilnya TIDAK di-commit).

1. Tiap <script src> / <link href> lokal .js/.css di public/**/*.html diberi ?v=<sha256 isi berkas, 10 hex>. Versi dari ISI,
   bukan git sha: berkas yang tidak berubah tetap ber-URL sama antar-terbit (titik.yml terbit tiap 3 jam), jadi cache tetap hangat.
2. public/_headers ditambah blok aturan: berkas yang diberi versi DAN tidak pernah dimuat tanpa versi (namanya tidak muncul di
   string JS lain atau di HTML di luar tag yang sudah diberi versi, mis. "bagikan.css" yang dimuat bagikan.js) -> max-age 1 tahun,
   immutable. _headers mencocokkan jalur tanpa kueri, jadi berkas yang juga dimuat tanpa ?v tidak boleh immutable (bisa basi
   setahun); berkas itu tetap pakai bawaan Cloudflare (revalidasi ETag). Halaman HTML -> no-cache.

Idempoten: ?v lama diganti, blok _headers lama dibuang dulu.
Pakai:  python3 scripts/terbit/versi.py [akar_public]  |  ... uji
"""
import hashlib, os, re, sys

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public")
TAG = re.compile(r'(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"#?:]+\.(?:js|css))(?:\?[^"]*)?(")', re.I)
LEWATI = {"data", "geo", "lambang", "img", "citra"}
TANDA = "# --- dibuat scripts/terbit/versi.py saat terbit (jangan disunting; tidak di-commit) ---"


def berkas(akar, ujung):
    for d, sub, fs in os.walk(akar):
        sub[:] = [s for s in sub if s not in LEWATI]
        for f in fs:
            if f.endswith(ujung):
                yield os.path.join(d, f)


def sidik(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()[:10]


def jalan(akar=AKAR):
    akar = os.path.abspath(akar)
    halaman, versi, sisa = [], {}, []   # versi: jalur web -> hash; sisa: teks HTML di luar tag yang diberi versi
    for h in berkas(akar, ".html"):
        teks, d = open(h, encoding="utf-8").read(), os.path.dirname(h)
        def ganti(m):
            ref = m.group(2)
            p = os.path.normpath(os.path.join(akar, ref.lstrip("/")) if ref.startswith("/") else os.path.join(d, ref))
            if not p.startswith(akar) or not os.path.isfile(p):
                return m.group(0)
            web = "/" + os.path.relpath(p, akar).replace(os.sep, "/")
            versi[web] = sidik(p)
            return f"{m.group(1)}{ref}?v={versi[web]}{m.group(3)}"
        baru = TAG.sub(ganti, teks)
        if baru != teks:
            open(h, "w", encoding="utf-8").write(baru)
        sisa.append(TAG.sub("", baru))
        halaman.append("/" + os.path.relpath(h, akar).replace(os.sep, "/"))
    js = {p: open(p, encoding="utf-8", errors="replace").read() for p in berkas(akar, ".js")}
    abadi = []
    for web in sorted(versi):
        nama = web.rsplit("/", 1)[1]
        pola = re.compile(r"[\"'`/]" + re.escape(nama) + r"[\"'`?#]")   # di dalam string (muatan), bukan sebutan di komentar
        dinamis = any(pola.search(t) for p, t in js.items() if "/" + os.path.relpath(p, akar).replace(os.sep, "/") != web) \
            or any(pola.search(t) for t in sisa)
        if not dinamis:
            abadi.append(web)
    hp = os.path.join(akar, "_headers")
    lama = open(hp, encoding="utf-8").read() if os.path.exists(hp) else ""
    lama = lama.split("\n" + TANDA)[0].rstrip("\n")
    blok = [TANDA]
    for w in abadi:
        blok += [w, "  Cache-Control: public, max-age=31536000, immutable"]
    for w in sorted(halaman):
        blok += [w, "  Cache-Control: no-cache"]
    open(hp, "w", encoding="utf-8").write(lama + "\n\n" + "\n".join(blok) + "\n")
    print(f"versi.py: {len(versi)} berkas diberi ?v, {len(abadi)} immutable, {len(versi) - len(abadi)} juga dimuat tanpa versi: "
          f"{sorted(set(versi) - set(abadi))}; {len(halaman)} halaman no-cache")
    return versi, abadi


def uji():
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        os.makedirs(os.path.join(t, "banjir"))
        w = lambda p, s: open(os.path.join(t, p), "w").write(s)
        w("a.js", "x=1"); w("b.css", "b{}"); w("c.js", 'l.href = dasar + "b.css"'); w("_headers", "/*\n  X: 1\n")
        w("index.html", '<base href="/"><script src="a.js?v=lama"></script><link href="b.css" rel="stylesheet"><script src="c.js"></script>'
                        '<script src="https://cdn.x/y.js"></script><script src="hilang.js"></script>')
        w("banjir/index.html", '<script src="../a.js" defer></script>')
        versi, abadi = jalan(t)
        i = open(os.path.join(t, "index.html")).read()
        assert f'src="a.js?v={versi["/a.js"]}"' in i and "v=lama" not in i, i
        assert 'src="https://cdn.x/y.js"' in i and 'src="hilang.js"' in i, i
        assert f'src="../a.js?v={versi["/a.js"]}" defer' in open(os.path.join(t, "banjir/index.html")).read()
        assert abadi == ["/a.js", "/c.js"], abadi           # b.css juga dimuat c.js tanpa versi -> tidak immutable
        jalan(t)                                             # idempoten: blok _headers tidak menumpuk
        h = open(os.path.join(t, "_headers")).read()
        assert h.count(TANDA) == 1 and h.startswith("/*\n  X: 1") and "/banjir/index.html\n  Cache-Control: no-cache" in h, h
        w("a.js", "x=2"); v2, _ = jalan(t)
        assert v2["/a.js"] != versi["/a.js"] and v2["/c.js"] == versi["/c.js"], "versi harus mengikuti isi berkas"
    print("versi uji: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan(*sys.argv[1:])
