"""Satu definisi angka "titik panas" yang dihitung (keputusan pemilik 25 Okt 2026): LOKASI UNIK per hari kalender WIB.

Semua satelit (MODIS, VIIRS S-NPP, NOAA-20, NOAA-21), SEMUA tingkat keyakinan (rendah, sedang, tinggi).
Keyakinan rendah dikembalikan (keputusan pemilik 28 Okt 2026; 25 Okt sempat sedang/tinggi saja) karena api gambut membara
bersuhu rendah dan sering tertutup asap, sehingga sinyalnya justru jatuh di kelas rendah:
  - Tansey dkk. 2008 (JGR 113, doi:10.1029/2008JD010717), gambut terdegradasi Kalteng: MODIS melewatkan ~60% kebakaran,
    dan MEMASUKKAN titik keyakinan rendah memperbaiki kecocokan dengan luas terbakar.
  - Atwood dkk. 2016 (PLOS ONE, doi:10.1371/journal.pone.0159410): api gambut 2015 bersuhu rendah; MODIS menangkap < separuh
    piksel api yang dilihat sensor sensitif TET-1 FireBird.
  - Sofan dkk. 2019 (Remote Sensing 11:465, doi:10.3390/rs11040465): VIIRS 375 m hanya 71% terhadap kebenaran lapangan gambut Kalteng.
Akibat: lebih banyak alarm palsu di luar gambut (pantulan, permukaan panas). Yang TETAP sedang/tinggi karena koefisiennya diukur
dari titik sedang/tinggi dan belum dikalibrasi ulang: luas terbakar (laporan.py HA_TITIK, angka_kawasan.js n2x), faktor insiden
(insiden.py), rasio NOAA-20/S-NPP (firms_sumber.py), pembanding riwayat S-NPP (sejarah.json), cluster/kompleks (harian.py). Satu sel kisi ~375 m (ukuran piksel VIIRS)
dihitung SEKALI per hari, berapa pun satelit dan lintasan yang melihatnya. Alasan: NOAA-20 dan NOAA-21 lewat dengan selang
~50 menit di orbit yang sama, jadi titik mentah menghitung api yang sama dua kali; pada 25 Okt 2026 433 dari 704 titik NOAA-21
Kalteng jatuh di sel yang sudah terdeteksi satelit lain hari itu, 271 sel sungguh baru. Dengan lokasi unik NOAA-21 ikut menambah
cakupan tanpa hitung dobel, dan pensiunnya S-NPP (1 Nov 2026) tidak membuat angka anjlok.

Akibat: angka ini TIDAK sama dengan SiPongi/GIS BNPB (titik mentah M+N+N20, juga termasuk keyakinan rendah). Cermin JS: public/angka_kawasan.js (selTitik, tandaiUnik).
Uji tanpa jaringan:  python3 scripts/data/titik_unik.py
24 jam (PKH-24):     python3 scripts/data/titik_unik.py 24j   -> public/data/titik_setara.json (kita, setara SiPongi, tinggi saja, angka resmi SiPongi atau null)
"""
import json, math, sys

SENSOR = ("M", "N", "N20", "N21")
KEYAKINAN_MIN = 0   # 0 = rendah ikut dihitung (28 Okt 2026, lihat docstring); dulu 1
SEL = 0.003375   # derajat, ~375 m


def sel(lat, lon):
    """Sel kisi ~375 m tempat titik jatuh (bujur diskalakan cos lintang supaya sel tetap persegi)."""
    return (round(lat / SEL), round(lon * math.cos(math.radians(lat)) / SEL))


def dihitung(s, c):
    return s in SENSOR and c >= KEYAKINAN_MIN


def unik(titik, kunci_hari, kunci=lambda p: (p["s"], p["c"], p["lat"], p["lon"])):
    """Titik yang dihitung: deteksi PERTAMA (urutan masukan) tiap (hari, sel) di antara titik yang lolos dihitung().
    kunci_hari(p) -> label hari; kunci(p) -> (sensor, keyakinan, lat, lon)."""
    lihat, out = set(), []
    for p in titik:
        s, c, la, lo = kunci(p)
        if not dihitung(s, c):
            continue
        k = (kunci_hari(p), sel(la, lo))
        if k not in lihat:
            lihat.add(k)
            out.append(p)
    return out


def yakin_maks(titik, kunci_hari, kunci=lambda p: (p["s"], p["c"], p["lat"], p["lon"])):
    """{(hari, sel): keyakinan tertinggi} di antara semua deteksi yang dihitung() di sel itu. unik() mewakilkan sel dengan deteksi PERTAMA,
    yang bisa saja rendah padahal satelit lain di sel yang sama melihat tinggi; keyakinan sel yang dilaporkan = ini (kelas 0 rendah < 1 sedang < 2 tinggi)."""
    m = {}
    for p in titik:
        s, c, la, lo = kunci(p)
        if dihitung(s, c):
            k = (kunci_hari(p), sel(la, lo)); m[k] = max(m.get(k, c), c)
    return m


BMKG_DEFINISI = ("Pembanding definisi BMKG (faktsheet 19 Okt 2026): titik mentah tanpa buang kembaran, MODIS Terra+Aqua, VIIRS S-NPP, VIIRS NOAA-20, "
                 "keyakinan tinggi saja, hari kalender WIB, dalam batas provinsi; NOAA-21 tidak ikut; sumber panas tetap tidak dibuang. "
                 "Cocok persis 1.744 titik nasional 18 Okt 2026. BUKAN angka headline (lokasi unik, semua keyakinan, empat satelit).")
BMKG_CATATAN = "S-NPP berhenti didistribusikan FIRMS 1 Nov 2026 13.00 UTC: sesudahnya deret ini hanya MODIS + NOAA-20, jadi tidak sebanding dengan hari sebelumnya."
BMKG_SENSOR = ("M", "N", "N20")


def seri_bmkg(titik, kunci_hari, prov):
    """{prov: {hari: jumlah}} menurut definisi BMKG (lihat BMKG_DEFINISI); titik = dict s, c (0-2), plus apa yang dibaca kunci_hari dan prov."""
    out = {}
    for p in titik:
        if p["s"] in BMKG_SENSOR and p["c"] == 2:
            d = out.setdefault(prov(p), {}); h = kunci_hari(p); d[h] = d.get(h, 0) + 1
    return out


# PKH-24 (pembanding Pantau Karhutla, MIT): tiga angka 24 jam berdampingan supaya pembaca bisa menyamakan kita dengan SiPongi.
SIPONGI_SENSOR = ("M", "N", "N20")   # Terra+Aqua (M), S-NPP (N), NOAA-20; tanpa NOAA-21
SIPONGI_URL = "https://opsroom.sipongidata.my.id/api/opsroom/indoHotspot"
SIPONGI_SATELIT = ("NASA-SNPP", "NASA-NOAA20", "NASA-MODIS")   # LPN-* (BRIN) bukan padanan NASA FIRMS kita
SIPONGI_KETERANGAN = ("Setara SiPongi = titik mentah Terra, Aqua, S-NPP, NOAA-20 semua tingkat kepercayaan, tanpa buang kembaran dan tanpa buang sumber panas tetap. "
                      "Kepercayaan tinggi saja = VIIRS h dan MODIS >= 80, titik mentah, empat satelit kita (NOAA-21 ikut). Hitungan kita = lokasi unik ~375 m, empat satelit, semua kepercayaan, dan MEMBUANG sel sumber panas tetap (industri, tambang, kilang, PLTU, suar yang lolos uji; kawah tetap dihitung), sedangkan SiPongi tidak membuangnya. Angka SiPongi resmi hanya ditulis bila diambil <= 3 jam dari acuan data kita.")


def hitung_24j(titik, kunci=lambda p: (p["s"], p["c"], p["lat"], p["lon"]), palsu=frozenset(), sel_palsu=None):
    """titik = deret dict (s, c, lat, lon) milik jendela 24 jam. -> {kita, setara_sipongi, tinggi_saja}.
    palsu = set sel sumber panas tetap (titik_palsu.sel_industri()[0]) dengan sel_palsu(lat, lon) -> sel; hanya hitungan 'kita' yang membuangnya."""
    titik = list(titik)
    sah = [p for p in titik if not (palsu and sel_palsu(kunci(p)[2], kunci(p)[3]) in palsu)]
    return {"kita": len(unik(sah, lambda p: 0, kunci)),
            "setara_sipongi": sum(1 for p in titik if kunci(p)[0] in SIPONGI_SENSOR),
            "tinggi_saja": sum(1 for p in titik if kunci(p)[0] in SENSOR and kunci(p)[1] == 2)}


def sipongi_24j(ambil=None):
    """Angka resmi SiPongi 24 jam: banyak titik NASA (SNPP, NOAA-20, MODIS) semua kepercayaan dan yang confidence_level 'high'.
    -> {semua, tinggi, sumber, diambil} atau None bila tak terjangkau/berubah bentuk (JANGAN diganti 0). ambil(url) -> teks JSON, untuk uji."""
    import datetime as dt, gzip, json, urllib.parse, urllib.request
    q = [("wilayah", "IN"), ("filterperiode", "false"), ("late", "24")] + [("satelit[]", x) for x in SIPONGI_SATELIT] + [("confidence[]", x) for x in ("low", "medium", "high")]
    url = SIPONGI_URL + "?" + urllib.parse.urlencode(q)
    try:
        if ambil:
            teks = ambil(url)
        else:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "pantau-karhutla-riset", "Accept-Encoding": "gzip"}), timeout=40)
            b = r.read()
            teks = (gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b).decode()
        fs = json.loads(teks)["features"]
        if not isinstance(fs, list) or (fs and "confidence_level" not in fs[0].get("properties", fs[0])):
            return None
        sif = lambda f: f.get("properties", f)
        return {"semua": len(fs), "tinggi": sum(1 for f in fs if sif(f).get("confidence_level") == "high"), "sumber": SIPONGI_URL,
                "diambil": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")}
    except Exception as e:   # jaringan, 5xx, JSON/bentuk berubah: null, bukan nol
        print("titik_unik: SiPongi 24 jam tak terjangkau:", type(e).__name__, e, file=__import__("sys").stderr)
        return None


def selaras(acuan, diambil, jam=3):
    """True bila |diambil - acuan| <= jam (ISO 8601; acuan boleh +00:00 atau Z)."""
    import datetime as dt
    f = lambda x: dt.datetime.fromisoformat(x.replace("Z", "+00:00")).astimezone(dt.timezone.utc)
    return abs(f(diambil) - f(acuan)) <= dt.timedelta(hours=jam)


def tulis_setara(hotspot24=None, keluar=None, ambil=None):
    """public/data/hotspot24.json (baris [lat, lon, jam relatif acuan, sensor, frp, keyakinan, ...]) -> public/data/titik_setara.json."""
    import json, os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import titik_palsu as TP
    akar = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
    hotspot24 = hotspot24 or os.path.join(akar, "public/data/hotspot24.json")
    keluar = keluar or os.path.join(akar, "public/data/titik_setara.json")
    h = json.load(open(hotspot24))
    t = [{"s": r[3], "c": r[5], "lat": r[0], "lon": r[1]} for r in h["baris"] if r[2] > -24]
    pal, _ = TP.sel_industri()
    out = {"acuan": h["acuan"], "jendela_jam": 24, **hitung_24j(t, palsu=pal, sel_palsu=TP.sel), "sipongi_resmi": None, "keterangan": SIPONGI_KETERANGAN}
    sp = sipongi_24j(ambil)
    out["sipongi_resmi"] = sp if sp and selaras(h["acuan"], sp["diambil"]) else None   # beda waktu > 3 jam = tak sebanding
    with open(keluar, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    return out


if __name__ == "__main__" and sys.argv[1:] == ["24j"]:
    print(json.dumps(tulis_setara(), ensure_ascii=False))
elif __name__ == "__main__":
    p = lambda s, c, la, lo, h="10-25": {"s": s, "c": c, "lat": la, "lon": lo, "h": h}
    T = [p("N20", 1, -2.0, 113.0), p("N21", 2, -2.0001, 113.0001),   # sel sama, satelit lain: sekali
         p("N21", 1, -2.0, 113.01),                                    # ~1,1 km ke timur: sel baru
         p("N", 1, -2.0, 113.0, "10-24"),                              # sel sama hari lain: dihitung lagi
         p("M", 0, -3.0, 114.0), p("X", 2, -3.0, 114.0)]               # keyakinan rendah: DIHITUNG (KEYAKINAN_MIN 0); sensor asing: ditolak
    assert KEYAKINAN_MIN == 0, "pemilik 28 Okt 2026: keyakinan rendah ikut dihitung"
    u = unik(T, lambda q: q["h"])
    assert [(q["s"], q["h"]) for q in u] == [("N20", "10-25"), ("N21", "10-25"), ("N", "10-24"), ("M", "10-25")], u
    ym = yakin_maks(T, lambda q: q["h"])
    assert ym[("10-25", sel(-2.0, 113.0))] == 2 and ym[("10-24", sel(-2.0, 113.0))] == 1 and ym[("10-25", sel(-3.0, 114.0))] == 0, ym   # N20 sedang dulu, N21 tinggi kemudian -> tinggi
    sb = seri_bmkg([p("N20", 2, -2.0, 113.0), p("N20", 2, -2.0, 113.0), p("N21", 2, -2.0, 113.0), p("M", 1, -2.0, 113.0), p("N", 2, -2.0, 113.0, "10-24")], lambda q: q["h"], lambda q: "62")
    assert sb == {"62": {"10-25": 2, "10-24": 1}}, sb   # mentah (kembaran dihitung), tinggi saja, N21 dan sedang tidak
    assert not dihitung("X", 2) and dihitung("M", 0)
    assert sel(-2.0, 113.0) == sel(-2.0001, 113.0001) != sel(-2.0, 113.01)
    T24 = [p("N20", 1, -2.0, 113.0), p("N21", 2, -2.0001, 113.0001), p("N", 0, -2.0, 113.01), p("M", 2, -3.0, 114.0), p("M", 0, -9.0, 120.0), p("N20", 2, -2.0, 113.0)]
    h24 = hitung_24j(T24)
    assert h24 == {"kita": 4, "setara_sipongi": 5, "tinggi_saja": 3}, h24    # kita: 4 sel (tiga titik di satu sel dihitung sekali); sipongi: enam titik tanpa N21; tinggi: N21, M2, N20-2
    assert hitung_24j(T24, palsu={(round(-3.0 / 0.01), round(114.0 / 0.01))}, sel_palsu=lambda la, lo: (round(la / 0.01), round(lo / 0.01)))["kita"] == 3   # sel M(-3,114) dibuang
    fs = [{"properties": {"confidence_level": c}} for c in ("low", "high", "high", "medium")]
    sp = sipongi_24j(lambda u: json.dumps({"features": fs}))
    assert (sp["semua"], sp["tinggi"]) == (4, 2) and "late=24" in SIPONGI_URL + "?late=24", sp
    assert sipongi_24j(lambda u: "<html>Server Error</html>") is None and sipongi_24j(lambda u: json.dumps({"features": [{"x": 1}]})) is None   # gagal/bentuk berubah = None, bukan 0
    assert sipongi_24j(lambda u: json.dumps({"features": []}))["semua"] == 0   # kosong sungguhan = 0 yang sah
    assert selaras("2026-10-12T12:27:00+00:00", "2026-10-12T14:00Z") and not selaras("2026-10-12T12:27:00+00:00", "2026-11-24T00:17Z")
    print("titik_unik: uji lolos")
