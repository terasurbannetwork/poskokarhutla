"""Langkah build sebelum `wrangler deploy` (Actions saja; hasilnya TIDAK di-commit).

1. Tiap <script src> / <link href> lokal .js/.css di public/**/*.html diberi ?v=<sha256 isi berkas, 10 hex>. Versi dari ISI,
   bukan git sha: berkas yang tidak berubah tetap ber-URL sama antar-terbit (titik.yml terbit tiap 3 jam), jadi cache tetap hangat.
2. public/_headers ditambah blok aturan: berkas yang diberi versi DAN tidak pernah dimuat tanpa versi (namanya tidak muncul di
   string JS lain atau di HTML di luar tag yang sudah diberi versi, mis. "bagikan.css" yang dimuat bagikan.js) -> max-age 1 tahun,
   immutable. _headers mencocokkan jalur tanpa kueri, jadi berkas yang juga dimuat tanpa ?v tidak boleh immutable (bisa basi
   setahun); berkas itu tetap pakai bawaan Cloudflare (revalidasi ETag). Halaman HTML -> no-cache.
   Aturan digabung per pola ("/*.html", "/folder/*.js") supaya jauh di bawah batas 100 aturan Cloudflare.

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


def jalan(akar=AKAR, maks=100):
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
    # Cloudflare menolak deploy kalau _headers > 100 aturan (kode 100324). Satu splat per pola ("/dir/*.js" sah, dokumen resmi).
    # Halaman: satu aturan "/*.html" (jalur "/x/" tanpa nama berkas tidak kena, sama seperti aturan per-berkas lama).
    # Immutable: "/*.js" dan "/*.css" untuk semua; berkas yang TIDAK boleh immutable (dimuat tanpa ?v, atau tak diberi versi)
    # dikecualikan dengan "! Cache-Control" lalu header bawaan Cloudflare ditulis ulang (diuji di wrangler dev: tanpa baris
    # kedua, header hilang total). Daftar pengecualian dihitung ulang tiap terbit dari semua .js/.css, jadi berkas baru
    # yang belum diberi versi otomatis aman. Pengecualian digabung per awalan nama ("/gempa/sim*.js") bila semua yang
    # kena memang pengecualian.
    ada = set(abadi)
    semua = [("/" + os.path.relpath(os.path.join(d, f), akar).replace(os.sep, "/"))
             for d, _, fs in os.walk(akar) for f in fs if " 2." not in f]   # salinan iCloud "x 2.js" tak ikut dihitung (AGENTS.md §9)
    blok, kecuali, pulih = [TANDA], [], []
    for ujung in (".js", ".css"):
        sama = [w for w in semua if w.endswith(ujung)]
        asing = sorted(w for w in sama if w not in ada)
        if len(asing) < len(sama):
            blok += [f"/*{ujung}", "  Cache-Control: public, max-age=31536000, immutable"]
        # Pola pengecualian: nama persis, awalan ("/gempa/si*.js") atau akhiran ("/*kejadian.js"); aman = tak mengena satu pun
        # berkas immutable (splat rakus, "*" mencocokkan "/" juga). Pilih serakah: yang menutup pengecualian terbanyak, lalu terpendek.
        # Akhiran menggabung nama yang sama di banyak folder jadi satu aturan (jumlah aturan tak tumbuh per folder).
        cand = {}
        def tambah(q, ok):
            if q not in cand:
                kena = {x for x in sama if ok(x)}
                if kena and not (kena & ada):
                    cand[q] = kena
        for w in asing:
            tambah(w, lambda x, w=w: x == w)
            for i in range(1, len(w) - len(ujung)):                       # awalan: "/gempa/si*.js"
                tambah(w[:i] + "*" + ujung, lambda x, a=w[:i]: x.startswith(a))
            nm = w.rsplit("/", 1)[1]
            for i in range(0, len(nm) - len(ujung) - 1):                   # akhiran nama: "/*kejadian.js", "/*sim.js"
                t = nm[i:]
                tambah("/*" + t, lambda x, t=t: x.endswith(t) and len(x) > len(t))
            for k in [i for i, c in enumerate(w) if c == "/"][1:]:         # akhiran nama di dalam folder: "/pipa/*s.js"
                dr = w[:k + 1]
                for i in range(0, len(nm) - len(ujung)):
                    t = nm[i:]
                    tambah(dr + "*" + t, lambda x, dr=dr, t=t: x.startswith(dr) and x.endswith(t) and len(x) > len(dr) + len(t))
            for i in range(0, len(nm) - len(ujung) - 2):                   # potongan nama: "/*sim_*.js"
                for j in range(i + 3, len(nm) - len(ujung) + 1):
                    t = nm[i:j]
                    tambah("/*" + t + "*" + ujung, lambda x, t=t: t in x[1:] and x.endswith(ujung))
        sisa = set(asing)
        # Folder yang hampir seluruhnya pengecualian: satu "/dir/*.js" lalu tiap berkas immutable di dalamnya dipulihkan
        # (aturan sesudahnya menang: "! Cache-Control" + immutable). Dipakai bila untung > 3 aturan.
        while True:
            dirs = {w[:k + 1] for w in sisa for k, c in enumerate(w) if c == "/" and k > 0}
            net = {dr: (len([w for w in sisa if w.startswith(dr)]) - 1 - len([w for w in sama if w.startswith(dr) and w in ada])) for dr in dirs}
            if not net or max(net.values()) <= 3:
                break
            dr = max(net, key=lambda k: (net[k], -len(k)))
            kecuali.append(dr + "*" + ujung)
            pulih += [w for w in sama if w.startswith(dr) and w in ada]
            sisa = {w for w in sisa if not w.startswith(dr)}
        while sisa:
            q = max(cand, key=lambda k: (len(cand[k] & sisa), -len(k)))
            kecuali.append(q); sisa -= cand[q]
    for pola in kecuali:
        blok += [pola, "  ! Cache-Control", "  Cache-Control: public, max-age=0, must-revalidate"]
    for w in pulih:   # sesudah semua pengecualian: berkas immutable di dalam folder pengecualian
        blok += [w, "  ! Cache-Control", "  Cache-Control: public, max-age=31536000, immutable"]
    if halaman:
        blok += ["/*.html", "  Cache-Control: no-cache"]
    jumlah = sum(1 for b in lama.splitlines() if b.startswith("/")) + sum(1 for b in blok if b.startswith("/"))
    if jumlah > maks:
        sys.exit(f"versi.py: _headers {jumlah} aturan > {maks} (batas Cloudflare); gabung aturan tulisan tangan di public/_headers")
    open(hp, "w", encoding="utf-8").write(lama + "\n\n" + "\n".join(blok) + "\n")
    print(f"versi.py: {len(versi)} berkas diberi ?v, {len(abadi)} immutable, {len(versi) - len(abadi)} juga dimuat tanpa versi: "
          f"{sorted(set(versi) - set(abadi))}; {len(halaman)} halaman no-cache; {jumlah} aturan")
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
        assert h.count(TANDA) == 1 and h.startswith("/*\n  X: 1") and "/*.html\n  Cache-Control: no-cache" in h, h
        w("a.js", "x=2"); v2, _ = jalan(t)
        assert v2["/a.js"] != versi["/a.js"] and v2["/c.js"] == versi["/c.js"], "versi harus mengikuti isi berkas"
        assert "/*.js\n  Cache-Control: public, max-age=31536000, immutable" in h and "/*.html\n  Cache-Control: no-cache" in h, h
        w("d.js", "y=1"); w("e.html", '<script src="d.js"></script><script>"d.js"</script>')   # d.js juga dimuat tanpa ?v
        jalan(t); h = open(os.path.join(t, "_headers")).read()
        assert "/*.js\n  Cache-Control: public, max-age=31536000, immutable" in h and "/d.js\n  ! Cache-Control" in h and "/a" not in h.split(TANDA)[1], h  # d.js jadi pengecualian
        try:
            jalan(t, maks=2); raise AssertionError("harus gagal bila aturan > maks")
        except SystemExit:
            pass
    print("versi uji: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan(*sys.argv[1:])
