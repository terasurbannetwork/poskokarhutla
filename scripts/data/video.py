"""Bot video karhutla: YouTube Data API v3 (search.list) -> public/data/video.json.

Pakai:  YOUTUBE_API_KEY=... python3 scripts/data/video.py      ambil video 30 hari terakhir, gabung dengan berkas lama
        python3 scripts/data/video.py uji                      uji fungsi murni (tanpa jaringan)

Hanya metadata publik dari API resmi (judul, kanal, tanggal, gambar mini); video diputar di YouTube lewat tautan.
Kuota: tiap kueri search.list = 100 unit dari 10.000 unit/hari gratis; 6 kueri sehari = 600 unit.
Tanpa YOUTUBE_API_KEY skrip keluar diam-diam (berkas lama tetap dipakai halaman).
"""
import datetime as dt, html, json, os, re, sys, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR

KELUAR = os.path.join(AKAR, "public/data/video.json")
KUERI = ["karhutla", "kebakaran hutan dan lahan", "kabut asap kebakaran", "kebakaran lahan gambut", "water bombing karhutla", "titik panas karhutla"]
HARI = 30
MAKS = 200
# judul/deskripsi harus menyebut api/asap hutan-lahan; buang rumah/pasar/kendaraan terbakar dan konten hiburan
R_RELEVAN = re.compile(r"karhutla|kebakaran (hutan|lahan|gambut)|hutan terbakar|lahan terbakar|kabut asap|asap (kebakaran|karhutla)|water ?bombing|titik panas|hotspot|gambut", re.I)
R_BUANG = re.compile(r"rumah|pasar|mobil|motor|kapal|gudang|pabrik terbakar|kos|ruko|toko|asrama|game|minecraft|free fire|mobile legends|lirik|karaoke", re.I)


def relevan(judul, desk=""):
    t = f"{judul} {desk}"
    return bool(R_RELEVAN.search(t)) and not R_BUANG.search(judul)


def ringkas(item):
    s, i = item["snippet"], item["id"]["videoId"]
    th = s.get("thumbnails", {})
    gb = (th.get("medium") or th.get("high") or th.get("default") or {}).get("url", "")
    return {"id": i, "judul": html.unescape(s["title"]), "kanal": html.unescape(s.get("channelTitle", "")), "tgl": s["publishedAt"],
            "gambar": gb, "desk": html.unescape(s.get("description", ""))[:200], "url": f"https://www.youtube.com/watch?v={i}"}


def cari(kunci, q, sejak):
    p = {"part": "snippet", "q": q, "type": "video", "order": "date", "maxResults": 50, "regionCode": "ID",
         "relevanceLanguage": "id", "publishedAfter": sejak, "key": kunci}
    url = "https://www.googleapis.com/youtube/v3/search?" + urllib.parse.urlencode(p)
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r).get("items", [])


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
    a = [{"id": "a", "tgl": "2026-10-01T00:00:00Z"}, {"id": "b", "tgl": "2026-09-01T00:00:00Z"}]
    g = gabung(a, [{"id": "c", "tgl": "2026-10-10T00:00:00Z"}], "2026-09-15")
    assert [v["id"] for v in g] == ["c", "a"], g
    print("uji video.py: lulus")


def main():
    if sys.argv[1:] == ["uji"]:
        return uji()
    kunci = os.environ.get("YOUTUBE_API_KEY")
    if not kunci:
        print("YOUTUBE_API_KEY kosong: video.py dilewati")
        return
    kini = dt.datetime.now(dt.timezone.utc)
    sejak = (kini - dt.timedelta(days=HARI)).strftime("%Y-%m-%dT%H:%M:%SZ")
    baru = []
    for q in KUERI:
        try:
            baru += [ringkas(x) for x in cari(kunci, q, sejak) if x.get("id", {}).get("videoId")]
        except Exception as e:  # satu kueri gagal (kuota/jaringan) tidak menggagalkan yang lain
            print("kueri gagal", q, e)
    baru = [v for v in baru if relevan(v["judul"], v["desk"])]
    try:
        lama = json.load(open(KELUAR))["video"]
    except Exception:
        lama = []
    xs = gabung(lama, baru, sejak[:10])
    json.dump({"dibuat": kini.strftime("%Y-%m-%dT%H:%M:%SZ"), "sumber": "YouTube Data API v3", "hari": HARI, "video": xs},
              open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(json.dumps({"baru": len(baru), "total": len(xs)}))


if __name__ == "__main__":
    main()
