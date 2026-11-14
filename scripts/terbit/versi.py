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
IMPOR = re.compile(r"""((?:\bfrom|\bimport)\s*\(?\s*["'])(\.{1,2}/[^"'?#]+\.js|/(?!/)[^"'?#]+\.js)(["'])""")
IMPOR_V = re.compile(r"""((?:\bfrom|\bimport)\s*\(?\s*["'])(\.{1,2}/[^"'?#]+\.js|/(?!/)[^"'?#]+\.js)(?:\?v=[0-9a-f]{10})?(["'])""")
LIPAT = ("/petugas/", "/pipa/", "/siklus/", "/admin/", "/inti/")   # /siklus/* juga run_worker_first: Worker menyusun ulang header, aturan ini hanya cermin statis   # 2 Nov 2026: tanpa /pipa/ 81 aturan, dengan 64 (batas dini gerbang 80)   # 11 Nov 2026: Meja Pantau membawa ke 81; /admin/ (staf, lalu lintas kecil) dilipat   # 14 Nov 2026: 81 lagi; /inti/ (5 aturan pengecualian) dilipat
TANDA = "# --- dibuat scripts/terbit/versi.py saat terbit (jangan disunting; tidak di-commit) ---"


def berkas(akar, ujung):
    for d, sub, fs in os.walk(akar):
        sub[:] = [s for s in sub if s not in LEWATI]
        for f in fs:
            if f.endswith(ujung):
                yield os.path.join(d, f)


def sidik(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()[:10]


def sasaran(akar, p, ref):
    return os.path.normpath(os.path.join(akar, ref.lstrip("/")) if ref.startswith("/") else os.path.join(os.path.dirname(p), ref))


def impor_berversi(akar, sisa_html, web_):
    """Impor ES lokal ("from './x.js'", "import('/y.js')") diberi ?v=<hash isi AKHIR target>, ditulis ke disk sebelum HTML.
    Peramban memuat modul per URL utuh: modul yang dimuat dengan dua URL berbeda (dengan dan tanpa ?v) jadi dua instans.
    Jadi target hanya diberi versi bila SEMUA jalannya lewat impor (namanya tak muncul sebagai string di JS lain atau di HTML di
    luar tag berversi) dan tak ikut siklus impor (hash tak bisa saling bergantung). Hash = isi sesudah impornya sendiri diberi
    versi, jadi perubahan modul daun ikut mengubah URL semua pengimpornya. Kembali: {jalur web: hash} target yang diberi versi."""
    js = {os.path.normpath(p): open(p, encoding="utf-8", errors="replace").read() for p in berkas(akar, ".js")}
    sisi = {p: [q for q in (sasaran(akar, p, m.group(2)) for m in IMPOR_V.finditer(t)) if q in js] for p, t in js.items()}
    bersih = {p: IMPOR_V.sub('"x"', t) for p, t in js.items()}
    siklus, warna = set(), {}
    def dfs(p, jalur):
        warna[p] = 1; jalur.append(p)
        for q in sisi[p]:
            if warna.get(q) == 1:
                siklus.update(jalur[jalur.index(q):])
            elif not warna.get(q):
                dfs(q, jalur)
        jalur.pop(); warna[p] = 2
    sys.setrecursionlimit(10000)
    for p in js:
        if not warna.get(p):
            dfs(p, [])
    # Nama berkas dirakit dari template (`./layar_${c.layar}.js` di pipa/app.js) selalu dimuat tanpa ?v: nama yang cocok tak aman.
    rakit = [re.compile("^" + ".*".join(re.escape(b) for b in re.split(r"\$\{[^}]*\}", m.group(1).rsplit("/", 1)[-1])) + "$")
             for t in list(js.values()) + list(sisa_html) for m in re.finditer(r"`([^`]*\$\{[^`]*\.js)[?#`]", t)]
    def aman(q):
        if q in siklus or any(r.match(os.path.basename(q)) for r in rakit):
            return False
        pola = re.compile(r"[\"'`/]" + re.escape(os.path.basename(q)) + r"[\"'`?#]")
        return not any(pola.search(t) for p, t in bersih.items() if p != q) and not any(pola.search(t) for t in sisa_html)
    boleh = {q for qs in sisi.values() for q in qs if aman(q)}
    akhir = {}
    def hash_(p):
        if p not in akhir:
            d = os.path.dirname(p)
            def ganti(m):
                q = sasaran(akar, p, m.group(2))
                return m.group(0) if q not in boleh else f"{m.group(1)}{m.group(2)}?v={hash_(q)}{m.group(3)}"
            baru = IMPOR_V.sub(ganti, js[p])
            if baru != js[p]:
                open(p, "w", encoding="utf-8").write(baru)
            akhir[p] = hashlib.sha256(baru.encode("utf-8")).hexdigest()[:10]
        return akhir[p]
    for p in js:
        hash_(p)
    return {web_(q): akhir[q] for q in boleh}


def jalan(akar=AKAR, maks=100):
    akar = os.path.abspath(akar)
    halaman, versi, sisa = [], {}, []   # versi: jalur web -> hash; sisa: teks HTML di luar tag yang diberi versi
    web_ = lambda p: "/" + os.path.relpath(p, akar).replace(os.sep, "/")
    html = {h: open(h, encoding="utf-8").read() for h in berkas(akar, ".html")}
    sisa = [TAG.sub("", t) for t in html.values()]
    versi.update(impor_berversi(akar, sisa, web_))
    sisa = []
    for h, teks in html.items():
        d = os.path.dirname(h)
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
    # Impor yang tersisa tanpa ?v (target tak aman diberi versi, lihat impor_berversi) terikat ke jalur persis, bukan ke nama.
    impor, dimuat = set(), {}
    for p, t in js.items():
        for m in IMPOR.finditer(t):
            impor.add(web_(sasaran(akar, p, m.group(2))))
        dimuat[p] = IMPOR_V.sub('"x"', t)   # impor yang sudah diberi ?v juga bukan muatan tanpa versi
    abadi = []
    for web in sorted(versi):
        nama = web.rsplit("/", 1)[1]
        pola = re.compile(r"[\"'`/]" + re.escape(nama) + r"[\"'`?#]")   # di dalam string (muatan), bukan sebutan di komentar
        dinamis = web in impor or any(pola.search(t) for p, t in dimuat.items() if "/" + os.path.relpath(p, akar).replace(os.sep, "/") != web) \
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
        for dr in LIPAT:   # folder yang sengaja dibalik: modulnya saling impor relatif (tanpa ?v), jadi tak jadi pola nama global
            if any(w.startswith(dr) for w in sisa):
                kecuali.append(dr + "*" + ujung)
                sisa = {w for w in sisa if not w.startswith(dr)}   # tanpa pemulihan: berkas berversi di sini ikut revalidasi
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
        # Impor ES: daun -> tengah -> m.js diberi ?v berantai; s.js juga dimuat sebagai string -> tanpa ?v; x/y saling impor -> tanpa ?v.
        os.makedirs(os.path.join(t, "m"))
        w("m/daun.js", "export const a=1"); w("m/tengah.js", 'export * from "./daun.js"'); w("m/s.js", "export const s=1")
        w("m/x.js", 'import "./y.js"'); w("m/y.js", 'import "./x.js"'); w("m/lain.js", 'new Worker("s.js")')
        w("m/layar_a.js", "export const b=1"); w("m/rute.js", 'import "./layar_a.js"; const m = await import(`./layar_${n}.js`)')
        w("m/m.js", 'import {a} from "./tengah.js"; import {s} from "/m/s.js"; import "./x.js"; const d = import("../m/daun.js")')
        w("m.html", '<script type="module" src="m/m.js"></script>')
        v3, abadi3 = jalan(t)
        m, tg = open(os.path.join(t, "m/m.js")).read(), open(os.path.join(t, "m/tengah.js")).read()
        assert f'"./daun.js?v={v3["/m/daun.js"]}"' in tg and f'"./tengah.js?v={v3["/m/tengah.js"]}"' in m, (m, tg)
        assert f'import("../m/daun.js?v={v3["/m/daun.js"]}")' in m, m      # dinamis dan jalur lain ke berkas sama: hash sama
        assert '"/m/s.js"' in m and '"./x.js"' in m and '"./x.js"' in open(os.path.join(t, "m/y.js")).read(), m
        assert v3["/m/m.js"] == sidik(os.path.join(t, "m/m.js")) and "/m/tengah.js" in abadi3 and "/m/s.js" not in abadi3
        assert '"./layar_a.js"' in open(os.path.join(t, "m/rute.js")).read(), "nama hasil template tidak boleh diberi ?v"
        jalan(t); assert open(os.path.join(t, "m/m.js")).read().count("?v=") == 2, "idempoten: ?v impor tidak menumpuk"
        w("m/daun.js", "export const a=2"); v4, _ = jalan(t)
        assert v4["/m/tengah.js"] != v3["/m/tengah.js"] and v4["/m/m.js"] != v3["/m/m.js"], "daun berubah, pengimpor ikut berubah URL"
        try:
            jalan(t, maks=2); raise AssertionError("harus gagal bila aturan > maks")
        except SystemExit:
            pass
    print("versi uji: lolos")


def segarkan_katalog():
    """Indeks halaman /bnpb/katalog-dokumen ikut segar di semua jalur terbit; gagal = terbit tetap jalan dengan indeks yang ter-commit."""
    import subprocess
    skrip = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bnpb", "katalog_dokumen.py")
    try:
        subprocess.run([sys.executable, skrip], check=True, timeout=180)
    except Exception as e:
        print(f"::warning title=Katalog dokumen::indeks tidak diperbarui: {e}")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        jalan(*sys.argv[1:])
        if not sys.argv[1:]:   # tanpa argumen = langkah terbit sungguhan; uji dengan akar sementara tidak menyentuh indeks
            segarkan_katalog()
