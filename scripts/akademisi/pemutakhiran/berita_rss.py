#!/usr/bin/env python3
"""Panen berita penerbit lewat RSS untuk Direktori Jaringan Kebencanaan. Jalankan: python3 -I berita_rss.py --kerja <folder>
Masukan di <folder>: lembaga.json (wajib), tokoh.json, inovasi.json, berita.json (boleh tak ada; bila ada keluar/berita.json dari mutakhir.py, itu yang
dipakai). Keluaran: <folder>/keluar/berita.json. DATA TIDAK MASUK REPO; unduh/unggah R2 urusan workflow.
Catatan: RSS hanya memuat berita beberapa hari terakhir, jadi panen berkala hanya menangkap berita sekitar tanggal jalan.
Sopan: UA jujur, jeda 1 dtk per host, 403/429 = berhenti di host itu seketika, semua fetch lewat rayap.OPENER + host_aman."""
import argparse, collections, datetime, difflib, email.utils, hashlib, html, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # python3 -I tidak menaruh folder skrip di sys.path
import rayap  # noqa: E402

JENDELA_HARI, MIRIP = 400, 0.85
# feed terbuka (bukan 403/404) dari uji coba 30 Okt 2026; "|N" = halaman paged
FEEDS = """antaranews.com/rss/terkini.xml antaranews.com/rss/humaniora.xml antaranews.com/rss/warta-bumi.xml antaranews.com/rss/metro.xml antaranews.com/rss/politik.xml
antaranews.com/rss/ekonomi.xml antaranews.com/rss/dunia.xml jatim.antaranews.com/rss/terkini.xml jateng.antaranews.com/rss/terkini.xml jabar.antaranews.com/rss/terkini.xml
bali.antaranews.com/rss/terkini.xml sumut.antaranews.com/rss/terkini.xml sumsel.antaranews.com/rss/terkini.xml kalsel.antaranews.com/rss/terkini.xml kaltim.antaranews.com/rss/terkini.xml
papua.antaranews.com/rss/terkini.xml sumbar.antaranews.com/rss/terkini.xml riau.antaranews.com/rss/terkini.xml lampung.antaranews.com/rss/terkini.xml banten.antaranews.com/rss/terkini.xml
www.cnnindonesia.com/nasional/rss www.cnnindonesia.com/rss www.cnnindonesia.com/internasional/rss www.cnnindonesia.com/gaya-hidup/rss
news.detik.com/berita/rss www.detik.com/jatim/berita/rss www.detik.com/sulsel/berita/rss
feed.liputan6.com/rss/news feed.liputan6.com/rss/regional feed.liputan6.com/rss/global
www.mongabay.co.id/feed/ news.mongabay.com/feed/ www.jpnn.com/index.php?mib=rss
sindikasi.okezone.com/index.php/rss/1/RSS2.0 sindikasi.okezone.com/index.php/rss/2/RSS2.0 sindikasi.okezone.com/index.php/rss/3/RSS2.0
www.republika.co.id/rss www.republika.co.id/rss/nasional www.republika.co.id/rss/daerah www.republika.co.id/rss/khazanah
rri.co.id/rss www.sindonews.com/feed rss.tempo.co/ rss.tempo.co/nasional www.viva.co.id/get/all www.inews.id/feed""".split()
MEDIA = {"antaranews.com": "ANTARA", "detik.com": "detikcom", "tempo.co": "Tempo.co", "cnnindonesia.com": "CNN Indonesia", "republika.co.id": "Republika",
         "liputan6.com": "Liputan6", "okezone.com": "Okezone", "rri.co.id": "RRI", "mongabay.co.id": "Mongabay Indonesia", "mongabay.com": "Mongabay",
         "viva.co.id": "VIVA", "sindonews.com": "SINDOnews", "jpnn.com": "JPNN", "inews.id": "iNews"}
# kategori yang boleh jadi dateline; dunia-usaha hanya bila judul memuat kata kebencanaan; komunikasi/penerbit/media-* tidak pernah
KAT_OK = {"pemerintah", "kerelawanan", "donasi", "lsm", "internasional", "mitra-internasional", "riset", "jejaring", "profesi", "kesehatan", "keagamaan", "inovasi"}
BENCANA = re.compile(r"\b(bencana|banjir|gempa|longsor|karhutla|tsunami|erupsi|kekeringan|darurat|evakuasi|bantuan korban)\b", re.I)
KORUPSI = re.compile(r"\b(kpk|korupsi|tersangka|ott|suap|gratifikasi)\b", re.I)
STOP_CS = {"Maxim", "Kadin", "Antam", "Adaro", "Airfast", "Deliveree", "Lalamove", "Waspada", "Pantau", "ANTARA", "Satu Data", "DANA", "Sukabumi", "Fajar", "Madani", "Kemitraan",
           "Partnership", "Persada", "Rare", "Wings", "Giant", "Pusaka", "Combine", "Singgalang", "Pindad", "Kemenkes", "Mongabay", "Liputan6.com", "detikcom", "Vale"}
TOKOH_KELUAR = {"rasio ridho sani", "robben rico", "tri rismaharini", "saifullah yusuf", "sukanto tanoto", "suharyanto"}
KAT = [("penunjukan jabatan", r"\b(dilantik|ditunjuk|resmi menjabat|pelantikan|serah terima jabatan|kepala .{0,20} baru|dirut baru)\b"),
       ("hukum dan izin", r"\b(izin|perizinan|sidang|gugatan|vonis|lisensi|sertifikasi)\b"),
       ("penghargaan", r"\b(penghargaan|award|juara|raih|meraih|anugerah|apresiasi)\b"),
       ("bantuan dan respons", r"\b(bantuan|salurkan|menyalurkan|tanggap darurat|korban|pengungsi|evakuasi|donasi|relawan|bencana|banjir|longsor|gempa)\b"),
       ("pendanaan dan hibah", r"\b(hibah|pendanaan|dana|anggaran|investasi|pembiayaan|csr|kucurkan)\b"),
       ("peluncuran inovasi", r"\b(luncurkan|meluncurkan|peluncuran|resmikan|meresmikan|inovasi|aplikasi baru|perkenalkan)\b"),
       ("uji dan penerapan", r"\b(uji coba|diuji|pilot|penerapan|implementasi|dipasang|pemasangan|simulasi)\b"),
       ("riset dan publikasi", r"\b(riset|penelitian|studi|kajian|jurnal|peneliti|publikasi)\b"),
       ("kerja sama", r"\b(kerja sama|kerjasama|mou|nota kesepahaman|kolaborasi|gandeng|menggandeng|bermitra|kemitraan)\b"),
       ("kebijakan", r"\b(kebijakan|peraturan|regulasi|perpres|uu|undang-undang|instruksi|rencana aksi|program nasional)\b")]
RUM = [("banjir", r"banjir|rob\b|genangan"), ("longsor", r"longsor|tanah bergerak"), ("gempa", r"gempa"), ("tsunami", r"tsunami"), ("gunung api", r"gunung api|erupsi|vulkan"),
       ("karhutla", r"karhutla|kebakaran hutan|kebakaran lahan|titik panas"), ("kekeringan", r"kekeringan|kemarau"),
       ("cuaca ekstrem", r"cuaca ekstrem|angin kencang|puting beliung|badai"), ("pesisir", r"pesisir|abrasi"), ("iklim", r"iklim|emisi|karbon")]
norm = lambda t: re.sub(r"[^a-z0-9 ]", "", t.lower())


def kat(t):
    t = t.lower()
    return next((k for k, p in KAT if re.search(p, t)), "lainnya")


def rum(t):
    t = t.lower()
    return [k for k, p in RUM if re.search(p, t)]


# ---------- istilah entitas (aturan cocok.py) ----------
def bangun_istilah(lem, tok, ino):
    """-> (peta, kategori_lembaga): peta[(ci|cs, istilah)] = {(jenis, id)}; istilah ambigu dibuang. Dateline media/komunikasi/penerbit tak pernah masuk."""
    terms, kategori = collections.defaultdict(set), {}

    def add(jenis, id_, s):
        s = re.sub(r"\s+", " ", s).strip(" .,-")
        if not s: return
        if len(s.split()) >= 2 and len(s) >= 11: terms[("ci", s.lower())].add((jenis, id_))
        elif len(re.sub(r"[^A-Za-z]", "", s)) >= 4 and s not in STOP_CS: terms[("cs", s)].add((jenis, id_))

    for x in lem:
        k = x.get("kategori")
        if x["id"].startswith("media-") or k in ("komunikasi", "penerbit") or (k not in KAT_OK and k != "dunia-usaha"): continue
        kategori[x["id"]] = k
        n = x["nama"]
        add("lembaga", x["id"], re.sub(r"\s*\([^)]*\)", "", n))
        for p in re.findall(r"\(([^)]+)\)", n): add("lembaga", x["id"], p)
        if x.get("singkatan"): add("lembaga", x["id"], x["singkatan"])
        for a in x.get("alias") or []: add("lembaga", x["id"], a)
    for x in ino:
        add("inovasi", x["id"], re.sub(r"\s*\([^)]*\)", "", x["nama"]))
        for p in re.findall(r"\(([^)]+)\)", x["nama"]):
            if " " not in p.strip(): add("inovasi", x["id"], p)
    for x in tok:
        n = re.sub(r"\s*\([^)]*\)", "", x["nama"]).strip()
        if n.lower() in TOKOH_KELUAR or len(n.split()) < 2 or len(n) < 11: continue
        terms[("ci", n.lower())].add(("tokoh", x["id"]))
    for k in [k for k, v in terms.items() if len(v) > 1]: del terms[k]
    return terms, kategori


def penanda(terms):
    def rx(kind, fl):
        ks = sorted([k[1] for k in terms if k[0] == kind], key=len, reverse=True)
        return re.compile(r"(?<![\w-])(?:%s)(?![\w-])" % "|".join(re.escape(k) for k in ks), fl) if ks else None
    return rx("ci", re.I), rx("cs", 0)


def cocokkan(terms, rx, judul, ringkas):
    rci, rcs = rx
    ent = set()
    if rci:
        for m in rci.finditer(judul + " . " + ringkas): ent |= terms[("ci", m.group(0).lower())]
    if rcs:
        for m in rcs.finditer(judul): ent |= terms[("cs", m.group(0))]  # istilah satu kata hanya di judul
    return ent


def saring(judul, ringkas, ent, kategori):
    """Saringan ketat -> entitas yang lolos (kosong = buang berita). KPK/korupsi membuang SELURUH berita; dunia usaha butuh kata kebencanaan di judul."""
    if KORUPSI.search(judul + " " + ringkas): return set()
    return {(j, i) for j, i in ent if j != "lembaga" or kategori.get(i) != "dunia-usaha" or BENCANA.search(judul)}


def foto_arsip(url, tahun_berita):
    """True bila jalur URL foto memuat tahun <= tahun berita - 2 (foto arsip)."""
    jalur = urllib.parse.urlparse(url).path
    return any(int(y) <= int(tahun_berita) - 2 for y in re.findall(r"(?<!\d)((?:19|20)\d\d)(?!\d)", jalur))


def foto_bersih(url, tanggal):
    if not url or not url.startswith(("http://", "https://")) or foto_arsip(url, tanggal[:4]): return None
    return url


# ---------- gabung ----------
def mirip(a, b): return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio() >= MIRIP


def google(b): return "news.google.com" in b.get("url", "") or "Google" in (b.get("sumber") or "")


def gabung(lama, baru, kini):
    """-> (daftar, jml_baru, jml_ganti_google). Dedupe per URL dan judul mirip; versi penerbit menggantikan versi Google; jendela JENDELA_HARI."""
    sisa = list(lama)
    idx = collections.defaultdict(set)

    def daftar(j, b):
        for w in set(norm(b["judul"]).split()):
            if len(w) > 4: idx[w].add(j)

    for j, b in enumerate(sisa): daftar(j, b)
    urls = {b["url"] for b in sisa}
    ganti, tambah = set(), []

    def cari(judul):
        c = collections.Counter(j for w in set(norm(judul).split()) if len(w) > 4 for j in idx.get(w, ()))
        return [j for j, n in c.most_common(8) if n >= 3 and mirip(judul, sisa[j]["judul"])]

    for nb in baru:
        if nb["url"] in urls: continue
        hit = cari(nb["judul"])
        if any(not google(sisa[j]) and j not in ganti for j in hit): continue  # sudah ada versi penerbit
        for j in hit:
            if j in ganti: continue
            ganti.add(j)
            have = {(e["jenis"], e["id"]) for e in nb["entitas"]}
            nb["entitas"] += [e for e in sisa[j].get("entitas", []) if (e["jenis"], e["id"]) not in have]
        urls.add(nb["url"]); tambah.append(nb)
    # dedupe antarbarulah (satu judul dua feed)
    unik = []
    for nb in tambah:
        if not any(mirip(nb["judul"], u["judul"]) for u in unik if u["tanggal"] == nb["tanggal"]): unik.append(nb)
    batas = (kini - datetime.timedelta(days=JENDELA_HARI)).isoformat()
    hasil = [b for j, b in enumerate(sisa) if j not in ganti] + unik
    hasil = [b for b in hasil if (b.get("tanggal") or "9999") >= batas]
    for b in hasil: b.setdefault("foto_url", None)
    return sorted(hasil, key=lambda b: b["tanggal"], reverse=True), len(unik), len(ganti)


# ---------- jaringan ----------
def muat(url, host, timeout=25):
    """(kode, teks). host = rayap.Host (jeda + blok). 403/429 langsung memblok host itu; host_aman + OPENER wajib."""
    if host.blok or not rayap.host_aman(url): return 0, ""
    w = rayap.JEDA - (time.time() - host.terakhir)
    if w > 0: time.sleep(w)
    try:
        with rayap.OPENER.open(urllib.request.Request(url, headers={"User-Agent": rayap.UA, "Accept": "*/*"}), timeout=timeout) as r:
            b = r.read(3_000_000)
            kode, cs = r.status, r.headers.get_content_charset() or "utf-8"
            if not rayap.host_aman(r.geturl()): return 0, ""
    except urllib.error.HTTPError as e:
        kode, b, cs = e.code, b"", "utf-8"
    except Exception:
        kode, b, cs = 0, b"", "utf-8"
    host.terakhir = time.time()
    if kode in (403, 429): host.blok = True
    try: return kode, b.decode(cs, "replace")
    except LookupError: return kode, b.decode("utf-8", "replace")


def cd(s): return re.sub(r"^\s*<!\[CDATA\[(.*?)\]\]>\s*$", r"\1", s, flags=re.S).strip()
def tag(blk, t):
    m = re.search(r"<%s(?:\s[^>]*)?>(.*?)</%s>" % (t, t), blk, re.S | re.I)
    return cd(m.group(1)) if m else ""
def bersih(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", html.unescape(s)))).strip()


def tgl(s):
    try: return email.utils.parsedate_to_datetime(s).astimezone(datetime.timezone(datetime.timedelta(hours=7))).strftime("%Y-%m-%d")
    except Exception:
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
        return "-".join(m.groups()) if m else ""


def media_dari(u):
    h = urllib.parse.urlparse(u).netloc
    return next((v for k, v in MEDIA.items() if h.endswith(k)), h.replace("www.", ""))


def foto_feed(blk):
    for pat in (r'<media:content[^>]+url=["\']([^"\']+)', r'<media:thumbnail[^>]+url=["\']([^"\']+)', r'<enclosure[^>]+url=["\']([^"\']+)'):
        for m in re.finditer(pat, blk, re.I):
            u = html.unescape(m.group(1))
            if re.search(r"\.(jpe?g|png|webp)|image|foto|img|photo|thumb|cdn", u, re.I) and not re.search(r"\.(mp3|mp4|mpg)", u): return u
    m = re.search(r'<img[^>]+src=["\']([^"\']+)', html.unescape(blk), re.I)
    return html.unescape(m.group(1)) if m else ""


def urai(teks):
    out = []
    for blk in re.findall(r"<item[\s>].*?</item>", teks, re.S):
        link, t = tag(blk, "link") or tag(blk, "guid"), bersih(tag(blk, "title"))
        if not link.startswith("http") or not t: continue
        out.append({"judul": t, "url": re.split(r"\?utm", link)[0], "tanggal": tgl(tag(blk, "pubDate") or tag(blk, "dc:date")), "media": media_dari(link),
                    "foto_url": foto_feed(blk), "ringkas": bersih(tag(blk, "description") or tag(blk, "content:encoded"))[:400]})
    return out


def og_image(teks):
    for p in (r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']'):
        m = re.search(p, teks[:300000], re.I)
        if m: return html.unescape(m.group(1))
    return ""


def baca(p, bawaan):
    if not os.path.exists(p): return bawaan
    d = json.load(open(p, encoding="utf-8"))
    return d.get("lembaga", d) if isinstance(d, dict) else d


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--kerja", required=True); ap.add_argument("--hari"); ap.add_argument("--menit", type=float, default=40)
    a = ap.parse_args()
    kini = datetime.date.fromisoformat(a.hari) if a.hari else datetime.date.today()
    hari, mulai = kini.isoformat(), time.monotonic()
    lem, tok, ino = (baca(os.path.join(a.kerja, f), []) for f in ("lembaga.json", "tokoh.json", "inovasi.json"))
    terms, kategori = bangun_istilah(lem, tok, ino); rx = penanda(terms)
    keluar = os.path.join(a.kerja, "keluar", "berita.json")
    lama = baca(keluar if os.path.exists(keluar) else os.path.join(a.kerja, "berita.json"), [])
    hosts, ambil, ditolak, cocok = collections.defaultdict(rayap.Host), {}, set(), {}
    for f in FEEDS:
        if time.monotonic() - mulai > a.menit * 30: break
        u = "https://" + f
        h = hosts[urllib.parse.urlparse(u).netloc]
        kode, teks = muat(u, h)
        if kode in (403, 429): ditolak.add(urllib.parse.urlparse(u).netloc)
        for it in (urai(teks) if kode == 200 else []):
            if it["tanggal"] and it["tanggal"] >= (kini - datetime.timedelta(days=30)).isoformat(): ambil.setdefault(it["url"], it)
    for it in sorted(ambil.values(), key=lambda i: i["tanggal"], reverse=True):
        ent = saring(it["judul"], it["ringkas"], cocokkan(terms, rx, it["judul"], it["ringkas"]), kategori)
        if ent and not any(mirip(it["judul"], c["judul"]) for c in cocok.values() if c["tanggal"] == it["tanggal"]): it["ent"] = ent; cocok[it["url"]] = it
    baru = []
    for it in cocok.values():
        foto = foto_bersih(it["foto_url"], it["tanggal"])
        if not foto and time.monotonic() - mulai < a.menit * 55:
            kode, teks = muat(it["url"], hosts[urllib.parse.urlparse(it["url"]).netloc])
            if kode in (403, 429): ditolak.add(urllib.parse.urlparse(it["url"]).netloc)
            if kode == 200: foto = foto_bersih(html.unescape(og_image(teks)), it["tanggal"])
        t = it["judul"]
        baru.append({"id": "brt-" + hashlib.sha1(it["url"].encode()).hexdigest()[:10], "judul": t, "tanggal": it["tanggal"], "media": it["media"], "url": it["url"],
                     "ringkas": it["ringkas"][:300] or t, "kategori": kat(t + " " + it["ringkas"]), "rumpun": rum(t + " " + it["ringkas"]),
                     "entitas": sorted(({"jenis": j, "id": i} for j, i in it["ent"]), key=lambda e: (e["jenis"], e["id"])),
                     "sumber": "RSS penerbit (%s)" % it["media"], "diperiksa": hari, "foto_url": foto})
    hasil, n_baru, n_ganti = gabung(lama, baru, kini)
    os.makedirs(os.path.dirname(keluar), exist_ok=True)
    with open(keluar, "w", encoding="utf-8") as f: json.dump(hasil, f, ensure_ascii=False, separators=(",", ":"))
    print("berita_rss: feed %d, item %d, cocok %d, baru %d (berfoto %d), menggantikan Google %d, total %d, host ditolak %s"
          % (len(FEEDS), len(ambil), len(cocok), n_baru, sum(1 for b in baru if b["foto_url"]), n_ganti, len(hasil), sorted(ditolak) or "-"))


if __name__ == "__main__":
    main()
