"""Bot video karhutla: YouTube Data API v3 (search.list) -> public/data/video.json.

Pakai:  YOUTUBE_API_KEY=... python3 scripts/data/video.py      ambil video 30 hari terakhir, gabung dengan berkas lama
        python3 scripts/data/video.py                          tanpa kunci: tandai ulang berkas lama saja (tanpa jaringan)
        python3 scripts/data/video.py uji                      uji fungsi murni (tanpa jaringan)

Tiap video ditandai: jenis kanal (resmi/media/kreator), tokoh & lembaga yang disebut di judul, provinsi (Geo milik berita.py),
pendek (Shorts), dan statistik videos.list (tonton, suka, komen, durasi; 1 unit per 50 video).

Hanya metadata publik dari API resmi (judul, kanal, tanggal, gambar mini); video diputar di YouTube lewat tautan.
Kuota: tiap halaman search.list = 100 unit dari 10.000 unit/hari gratis. Per kueri: 2 halaman urut tanggal + 1 halaman urut
jumlah tonton (tanpa yang terakhir, 50 video terbaru cuma menjangkau ~12 jam dan video ramai minggu lalu tak pernah masuk);
6 kueri x 3 halaman = 1.800 unit sehari.
Tanpa YOUTUBE_API_KEY skrip keluar diam-diam (berkas lama tetap dipakai halaman).
"""
import datetime as dt, html, json, os, re, sys, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR
from berita import R_MEDIA_RI, Geo

KELUAR = os.path.join(AKAR, "public/data/video.json")
KUERI = ["karhutla", "kebakaran hutan dan lahan", "kabut asap kebakaran", "kebakaran lahan gambut", "water bombing karhutla", "titik panas karhutla"]
HARI = 30
MAKS = 500  # ~200 KB; urut tonton menambah video lama yang ramai
# judul/deskripsi harus menyebut api/asap hutan-lahan; buang rumah/pasar/kendaraan terbakar dan konten hiburan
R_RELEVAN = re.compile(r"karhutla|kebakaran (hutan|lahan|gambut)|hutan terbakar|lahan terbakar|kabut asap|asap (kebakaran|karhutla)|water ?bombing|titik panas|hotspot|gambut", re.I)
R_BUANG = re.compile(r"rumah|pasar|mobil|motor|kapal|gudang|pabrik terbakar|kos|ruko|toko|asrama|game|minecraft|free fire|mobile legends|lirik|karaoke|"
                     r"vtuber|anime|cosplay|fanbase|asmr|prank|mukbang|jedag|windah|fuji|riyuka|kuyang|pawang hujan|kalau aku jadi", re.I)
# kanal pemerintah/lembaga; media = daftar media berita.py + kanal TV/koran yang hanya muncul di YouTube
R_RESMI = re.compile(r"bnpb|bpbd|kemenhut|kementerian|klhk|bmkg|sekretariat presiden|badan komunikasi pemerintah|pemprov|pemkab|pemkot|"
                     r"pemerintah (provinsi|kabupaten|kota)|^dinas |humas|polri|polda|polres|kodam|korem|manggala agni|komdigi", re.I)
R_MEDIA = re.compile(R_MEDIA_RI.pattern[:-3] + r"|kompas ?tv|tvone|cnbc|bbc|garuda tv|rtv|inews|kaltim (post|today)|radar \w+|banjarmasin post|"
                     r"lombok post|mistar tv|pasundan ekspres|ketik media|kabarindo|medan orbit|priangan com|utusan malaysia|malaysia post|"
                     r"straits times|cna|metro ?tv|berita ?satu|jpnn|astakom|next one|tempodotco|katadata)", re.I)  # tanpa \b di ujung: "tribunnews", "kompastv"
# tokoh & lembaga yang disebut di judul (label, pola)
TOKOH = [("Presiden Prabowo", r"prabowo|\bpresiden\b"), ("Wapres Gibran", r"gibran|\bwapres\b"), ("Menhut Raja Juli", r"raja juli|menhut|menteri kehutanan|kemenhut"),
         ("Mendagri Tito", r"tito karnavian|mendagri"), ("Menteri LH", r"hanif faisol|menteri lingkungan|\bmenlh\b|\bklh\b"),
         ("BNPB", r"\bbnpb\b|suharyanto"), ("BMKG", r"\bbmkg\b|dwikorita"), ("Polri & TNI", r"kapolri|kapolda|kapolres|\bpolri\b|\bpolisi\b|panglima|\btni\b"),
         ("Kepala daerah", r"gubernur|\bbupati\b|wali ?kota|\bwagub\b"), ("DPR", r"\bdpr\b|anggota dewan|komisi iv"),
         ("Negara tetangga", r"malaysia|singapura|asean|jepang|negara tetangga|lintas batas")]
TOKOH_RE = [(n, re.compile(p, re.I)) for n, p in TOKOH]


def relevan(judul, desk=""):
    t = f"{judul} {desk}"
    # judul yang isinya cuma tagar/tanggal ("#karhutla #fyp", "14 Oktober 2026") tidak memberi informasi apa pun
    kata = re.sub(r"#\w+|\d+|[^\w\s]", " ", judul).split()
    return bool(R_RELEVAN.search(t)) and not R_BUANG.search(judul) and len(kata) >= 3 and not re.fullmatch(r"(?i)(oktober|september|november|kebakaran|hutan|lahan|\s)+", " ".join(kata))


def jenis(kanal):
    return "resmi" if R_RESMI.search(kanal) else "media" if R_MEDIA.search(kanal) else "kreator"


def durasi(iso):
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    return sum(int(x or 0) * k for x, k in zip(m.groups(), (86400, 3600, 60, 1))) if m else None


def tandai(v, geo):
    v["jenis"] = jenis(v["kanal"])
    v["tokoh"] = [n for n, r in TOKOH_RE if r.search(v["judul"])]
    # nama acara ("[Metro Siang]", "| Sindo Sore") dan "batang" rokok bukan nama tempat (Kota Metro, Kab. Batang)
    v["prov"] = geo.cari(re.sub(r"\[[^\]]*\]?|\|.*$|\bbatang\b", " ", v["judul"], flags=re.I))["prov"] if geo else []
    v["pendek"] = bool(re.search(r"#shorts?\b", v["judul"] + " " + v.get("desk", ""), re.I)) or (v.get("durasi") or 999) <= 60
    return v


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


def cari(kunci, q, sejak, urut="date", halaman=1):
    p = {"part": "snippet", "q": q, "type": "video", "order": urut, "maxResults": 50, "regionCode": "ID",
         "relevanceLanguage": "id", "publishedAfter": sejak, "key": kunci}
    xs = []
    for _ in range(halaman):
        with urllib.request.urlopen("https://www.googleapis.com/youtube/v3/search?" + urllib.parse.urlencode(p), timeout=30) as r:
            j = json.load(r)
        xs += j.get("items", [])
        if not j.get("nextPageToken"):
            break
        p["pageToken"] = j["nextPageToken"]
    return xs


def gabung(lama, baru, batas):
    semua = {v["id"]: v for v in lama}
    semua.update({v["id"]: v for v in baru})
    xs = [v for v in semua.values() if v["tgl"] >= batas]
    return sorted(xs, key=lambda v: v["tgl"], reverse=True)[:MAKS]


def uji():
    assert relevan("Kebakaran hutan di Riau meluas", "")
    assert relevan("Kabut asap selimuti Palangka Raya")
    assert not relevan("Rumah terbakar, kabut asap tebal di kampung")
    assert not relevan("Tutorial masak rendang")
    assert not relevan("stay safe semua, jangan lupa pakai masker #karhutla #kebakaran #hutan #vtuber")
    assert not relevan("#kabutasap #karhutla #kebakaranhutan")
    assert relevan("Heli water bombing padamkan karhutla #shorts")
    assert jenis("METRO TV ") == "media" and jenis("KOMPASTV JAWA BARAT") == "media" and jenis("Badan Komunikasi Pemerintah RI") == "resmi"
    assert jenis("Aliza Caliana") == "kreator" and jenis("Tribunnews") == "media"
    assert durasi("PT1M5S") == 65 and durasi("PT45S") == 45 and durasi("P0D") == 0 and durasi("PT1H2M") == 3720
    t = tandai({"judul": "Prabowo Pesan Pesawat, BNPB kerahkan heli ke Malaysia #shorts", "kanal": "ARTILERI", "desk": ""}, None)
    assert t["tokoh"] == ["Presiden Prabowo", "BNPB", "Negara tetangga"] and t["pendek"] and t["jenis"] == "kreator", t
    a = [{"id": "a", "tgl": "2026-10-01T00:00:00Z"}, {"id": "b", "tgl": "2026-09-01T00:00:00Z"}]
    g = gabung(a, [{"id": "c", "tgl": "2026-10-10T00:00:00Z"}], "2026-09-15")
    assert [v["id"] for v in g] == ["c", "a"], g
    print("uji video.py: lulus")


def main():
    if sys.argv[1:] == ["uji"]:
        return uji()
    kunci = os.environ.get("YOUTUBE_API_KEY")
    try:
        lama = json.load(open(KELUAR))
    except Exception:
        lama = {"video": []}
    geo = Geo()
    if not kunci:  # tanpa kunci: berkas lama disaring & ditandai ulang, tanggal "dibuat" tetap
        xs = [tandai(v, geo) for v in lama["video"] if relevan(v["judul"], v.get("desk", ""))]
        json.dump({**lama, "video": xs}, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
        print(f"YOUTUBE_API_KEY kosong: {len(xs)} video lama ditandai ulang")
        return
    kini = dt.datetime.now(dt.timezone.utc)
    sejak = (kini - dt.timedelta(days=HARI)).strftime("%Y-%m-%dT%H:%M:%SZ")
    baru = []
    for q in KUERI:
        try:
            hasil = cari(kunci, q, sejak, "date", 2) + cari(kunci, q, sejak, "viewCount")
            baru += [ringkas(x) for x in hasil if x.get("id", {}).get("videoId")]
        except Exception as e:  # satu kueri gagal (kuota/jaringan) tidak menggagalkan yang lain
            print("kueri gagal", q, e)
    baru = [v for v in baru if relevan(v["judul"], v["desk"])]
    xs = [v for v in gabung(lama["video"], baru, sejak[:10]) if relevan(v["judul"], v.get("desk", ""))]
    try:  # statistik semua video (lama ikut diperbarui jumlah tontonnya); gagal = pakai angka lama
        st = statistik(kunci, [v["id"] for v in xs])
        for v in xs:
            v.update(st.get(v["id"], {}))
    except Exception as e:
        print("statistik gagal", e)
    xs = [tandai(v, geo) for v in xs]
    json.dump({"dibuat": kini.strftime("%Y-%m-%dT%H:%M:%SZ"), "sumber": "YouTube Data API v3", "hari": HARI, "video": xs},
              open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(json.dumps({"baru": len(baru), "total": len(xs)}))


if __name__ == "__main__":
    main()
