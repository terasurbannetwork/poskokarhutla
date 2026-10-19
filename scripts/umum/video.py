"""Mesin video bersama: YouTube Data API v3 (search.list) -> public/banjir/data/video_<id>.json (folder ber-cache).

Pakai:  YOUTUBE_API_KEY=... python3 scripts/umum/video.py gempa gunungapi ...   (tanpa id = semua bencana KECUALI karhutla)
        python3 scripts/umum/video.py uji                                       self-check tanpa jaringan
Kueri & penyaring relevansi datang dari public/bencana.json: `video.kueri` bila ada, kalau tidak `berita.kueri`.
Tanpa YOUTUBE_API_KEY skrip keluar diam-diam. Berkas yang `dibuat`-nya < JEDA_JAM jam dilewati (satu jalan per hari walau workflow dijalankan ulang).

Kuota (10.000 unit/hari bersama karhutla): search.list = 100 unit, videos.list = 1 unit per 50 video.
Per bencana: maks 2 kueri x (1 halaman terbaru + 2 jendela terpopuler 30 & 90 hari) = 6 panggilan = 600 unit (+ ~16 statistik).
6 bencana x ~616 = ~3.700; karhutla scripts/data/video.py 6 kueri x 6 = 3.600 + ~16. Total ~7.300/hari.
Fungsi API (cari, ringkas, statistik, gabung, durasi) dipakai juga oleh scripts/data/video.py (karhutla): satu salinan.
"""
import datetime as dt, html, json, os, re, sys, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/banjir/data")
HARI = 90
MAKS = 400
MAKS_KUERI = 2
JEDA_JAM = 20
R_BUANG = re.compile(r"game|minecraft|free fire|mobile legends|lirik|karaoke|vtuber|anime|cosplay|asmr|prank|mukbang|jedag|windah|film pendek|ost\b", re.I)
R_RESMI = re.compile(r"bnpb|bpbd|bmkg|pvmbg|esdm|kementerian|sekretariat presiden|badan komunikasi pemerintah|pemprov|pemkab|pemkot|^dinas |humas|polri|polda|basarnas|tni|komdigi", re.I)
R_MEDIA = re.compile(r"tv|news|kompas|detik|tribun|cnn|cnbc|bbc|antara|tempo|liputan|metro|berita|post|republika|viva|okezone|merdeka|sindo|jpnn|inews", re.I)


def durasi(iso):
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    return sum(int(x or 0) * k for x, k in zip(m.groups(), (86400, 3600, 60, 1))) if m else None


def statistik(kunci, ids):
    """videos.list: tonton/suka/komen/durasi, 50 id per panggilan (1 unit kuota)."""
    hasil = {}
    for i in range(0, len(ids), 50):
        p = {"part": "statistics,contentDetails", "id": ",".join(ids[i:i + 50]), "key": kunci}
        with urllib.request.urlopen("https://www.googleapis.com/youtube/v3/videos?" + urllib.parse.urlencode(p), timeout=30) as r:
            for x in json.load(r).get("items", []):
                st = x.get("statistics", {})
                hasil[x["id"]] = {"tonton": int(st.get("viewCount", 0)), "suka": int(st.get("likeCount", 0)) if "likeCount" in st else None,
                                  "komen": int(st.get("commentCount", 0)) if "commentCount" in st else None,
                                  "durasi": durasi(x.get("contentDetails", {}).get("duration"))}
    return hasil


def ringkas(item):
    s, i = item["snippet"], item["id"]["videoId"]
    th = s.get("thumbnails", {})
    gb = (th.get("medium") or th.get("high") or th.get("default") or {}).get("url", "")
    return {"id": i, "judul": html.unescape(s["title"]), "kanal": html.unescape(s.get("channelTitle", "")), "tgl": s["publishedAt"],
            "gambar": gb, "desk": html.unescape(s.get("description", ""))[:200], "url": f"https://www.youtube.com/watch?v={i}"}


def cari(kunci, q, sejak, urut="date", halaman=1, sampai=None):
    p = {"part": "snippet", "q": q, "type": "video", "order": urut, "maxResults": 50, "regionCode": "ID",
         "relevanceLanguage": "id", "publishedAfter": sejak, "key": kunci}
    if sampai:
        p["publishedBefore"] = sampai
    xs = []
    for _ in range(halaman):
        with urllib.request.urlopen("https://www.googleapis.com/youtube/v3/search?" + urllib.parse.urlencode(p), timeout=30) as r:
            j = json.load(r)
        xs += j.get("items", [])
        if not j.get("nextPageToken"):
            break
        p["pageToken"] = j["nextPageToken"]
    return xs


def gabung(lama, baru, batas, maks=800):
    semua = {v["id"]: v for v in lama}
    semua.update({v["id"]: v for v in baru})
    xs = [v for v in semua.values() if v["tgl"] >= batas]
    # separuh kuota untuk yang terbaru, sisanya yang paling ditonton, supaya video lama yang ramai tidak terbuang
    baru_ = sorted(xs, key=lambda v: v["tgl"], reverse=True)[:maks // 2]
    ada = {v["id"] for v in baru_}
    ramai = sorted((v for v in xs if v["id"] not in ada), key=lambda v: v.get("tonton") or 0, reverse=True)[:maks - len(baru_)]
    return sorted(baru_ + ramai, key=lambda v: v["tgl"], reverse=True)


def pola(kueri):
    """Judul/deskripsi harus memuat salah satu frasa kueri (batas kata: 'rob' bukan 'robot')."""
    return re.compile(r"\b(" + "|".join(re.escape(k) for k in kueri) + r")\b", re.I)


def relevan(r, judul, desk=""):
    kata = re.sub(r"#\w+|\d+|[^\w\s]", " ", judul).split()   # judul berisi tagar/tanggal saja tidak informatif
    return bool(r.search(f"{judul} {desk}")) and not R_BUANG.search(judul) and len(kata) >= 3


def jenis(kanal):
    return "resmi" if R_RESMI.search(kanal) else "media" if R_MEDIA.search(kanal) else "kreator"


def tandai(v):
    v["jenis"] = jenis(v["kanal"])
    v["pendek"] = bool(re.search(r"#shorts?\b", v["judul"] + " " + v.get("desk", ""), re.I)) or (v.get("durasi") or 999) <= 60
    return v


def kueri_bencana(b):
    return (b.get("video") or {}).get("kueri") or b["berita"]["kueri"]


def jalankan(b, kunci, kini=None):
    """Satu bencana -> dict berkas, atau None bila dilewati (segar)."""
    kini = kini or dt.datetime.now(dt.timezone.utc)
    jalur = os.path.join(KELUAR, f"video_{b['id']}.json")
    try:
        lama = json.load(open(jalur))
    except Exception:
        lama = {"video": []}
    if lama.get("dibuat") and kini - dt.datetime.fromisoformat(lama["dibuat"].replace("Z", "+00:00")) < dt.timedelta(hours=JEDA_JAM):
        return None
    iso = lambda t: t.strftime("%Y-%m-%dT%H:%M:%SZ")
    sejak = iso(kini - dt.timedelta(days=HARI))
    ks = kueri_bencana(b)[:MAKS_KUERI]
    r = pola(kueri_bencana(b))
    baru = []
    for q in ks:
        try:
            hasil = cari(kunci, q, sejak, "date", 1)
            for a, c in ((30, 0), (HARI, 30)):
                hasil += cari(kunci, q, iso(kini - dt.timedelta(days=a)), "viewCount", 1, iso(kini - dt.timedelta(days=c)) if c else None)
            baru += [ringkas(x) for x in hasil if x.get("id", {}).get("videoId")]
        except Exception as e:   # satu kueri gagal (kuota/jaringan) tidak menggagalkan yang lain
            print("kueri gagal", b["id"], q, e)
    baru = [v for v in baru if relevan(r, v["judul"], v["desk"])]
    xs = [v for v in gabung(lama["video"], baru, sejak[:10], MAKS) if relevan(r, v["judul"], v.get("desk", ""))]
    try:
        st = statistik(kunci, [v["id"] for v in xs])
        for v in xs:
            v.update(st.get(v["id"], {}))
    except Exception as e:
        print("statistik gagal", b["id"], e)
    return {"dibuat": iso(kini), "sumber": "YouTube Data API v3", "bencana": b["id"], "hari": HARI, "video": [tandai(v) for v in xs]}


def uji():
    r = pola(["gempa bumi", "tsunami", "rob"])
    assert relevan(r, "Gempa bumi M5,1 guncang Cianjur") and relevan(r, "Banjir rob rendam Pekalongan")
    assert not relevan(r, "Robot baru dirilis hari ini") and not relevan(r, "Gempa bumi lirik lagu")
    assert not relevan(r, "#gempa bumi #fyp") and not relevan(r, "Tutorial masak rendang")
    assert jenis("BPBD Jawa Barat") == "resmi" and jenis("KOMPASTV") == "media" and jenis("Aliza") == "kreator"
    assert durasi("PT1M5S") == 65 and durasi("PT45S") == 45 and durasi("PT1H2M") == 3720
    assert tandai({"judul": "x y z #shorts", "kanal": "a"})["pendek"]
    g = gabung([{"id": "a", "tgl": "2026-10-01"}, {"id": "b", "tgl": "2026-09-01"}], [{"id": "c", "tgl": "2026-10-10"}], "2026-09-15")
    assert [v["id"] for v in g] == ["c", "a"], g
    reg = json.load(open(os.path.join(AKAR, "public/bencana.json")))["bencana"]
    assert all(kueri_bencana(b) for b in reg)
    unit = sum(min(len(kueri_bencana(b)), MAKS_KUERI) * 3 * 100 for b in reg if b["id"] != "karhutla") + 6 * 6 * 100 + 7 * 20
    assert unit < 10000, unit
    print(f"uji video.py (umum): lulus, ~{unit} unit/hari")


def main():
    if sys.argv[1:] == ["uji"]:
        return uji()
    kunci = os.environ.get("YOUTUBE_API_KEY")
    if not kunci:
        print("YOUTUBE_API_KEY kosong: video dilewati")
        return
    reg = json.load(open(os.path.join(AKAR, "public/bencana.json")))["bencana"]
    pilih = sys.argv[1:] or [b["id"] for b in reg if b["id"] != "karhutla"]
    os.makedirs(KELUAR, exist_ok=True)
    for b in reg:
        if b["id"] not in pilih:
            continue
        h = jalankan(b, kunci)
        if h is None:
            print(b["id"], "segar, dilewati")
            continue
        json.dump(h, open(os.path.join(KELUAR, f"video_{b['id']}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
        print(b["id"], len(h["video"]), "video")


if __name__ == "__main__":
    main()
