"""Bot berita karhutla: Google News RSS -> public/data/berita.json + arsip bergulir data/raw/berita/arsip.json.

Pakai:  python3 scripts/data/berita.py          ambil 7 hari terakhir, gabung ke arsip, tulis berita.json
        python3 scripts/data/berita.py isi 120  isi arsip mundur 120 hari (jendela 7 hari, kueri umum + 9 prioritas)
        python3 scripts/data/berita.py uji      uji fungsi murni + akurasi sentimen pada label_uji.json
        python3 scripts/data/berita.py ulang    olah ulang arsip tanpa mengambil RSS
        python3 scripts/data/berita.py sampel   cetak judul acak untuk dilabeli tangan

Hanya judul + cuplikan RSS yang dibaca; halaman artikel TIDAK diambil (tautan ke sumber asli tetap disimpan).
Semua aturan (relevansi, geocoding, topik, sentimen) dihitung ulang dari arsip mentah tiap jalan, jadi
perubahan aturan berlaku mundur. Leksikon sentimen buatan sendiri: InSet (Koto & Rahmaningtyas 2017) tidak
berlisensi di GitHub (fajri91/InSet, 13 Okt 2026), jadi tidak boleh didistribusikan ulang.
"""
import datetime as dt, email.utils, glob, hashlib, html, json, math, os, random, re, sys, time, unicodedata
import urllib.parse, urllib.request, xml.etree.ElementTree as ET
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PRIORITAS, PROVINSI
from posko import km, sentroid

DATA = os.path.join(AKAR, "public/data")
RAW = os.path.join(AKAR, "data/raw/berita")
WIB = dt.timezone(dt.timedelta(hours=7))
JENDELA_HARI = 120
MAKS_ARTIKEL = 1500
UA = "Mozilla/5.0 (compatible; poskokarhutla-berita/1.0; +https://github.com/pangantara/poskokarhutla)"

KUERI_UMUM = ["kebakaran hutan", "karhutla", "kebakaran lahan", "kabut asap", "titik panas", "hotspot karhutla",
              "water bombing karhutla", "pembakar lahan ditangkap", "status siaga darurat karhutla", "ISPA asap"]


# Liputan internasional: edisi Google News berbahasa Inggris/Melayu, kueri dipilih agar condong ke api/asap di Indonesia.
EDISI = {"id": ("id", "ID", "ID:id"), "en-US": ("en-US", "US", "US:en"), "en-SG": ("en-SG", "SG", "SG:en"), "en-MY": ("en-MY", "MY", "MY:en"),
         "en-AU": ("en-AU", "AU", "AU:en"), "en-GB": ("en-GB", "GB", "GB:en"), "ms-MY": ("ms", "MY", "MY:ms")}
KUERI_INT = ([("en-US", q) for q in ("Indonesia forest fires", "Indonesia haze", "Kalimantan fires", "Sumatra fires", "Riau haze",
                                     "peatland fires Indonesia", "Indonesia wildfire")]
             + [("en-SG", "transboundary haze Indonesia"), ("en-SG", "Indonesia haze Singapore"), ("en-MY", "haze Malaysia Indonesia fires"),
                ("en-AU", "Indonesia fires"), ("en-GB", "Indonesia wildfires haze"), ("ms-MY", "jerebu Indonesia"),
                ("ms-MY", "kebakaran hutan Indonesia")])


def kueri():
    return ([(q, "umum") for q in KUERI_UMUM] + [(f"karhutla {PROVINSI[p]}", p) for p in PRIORITAS]
            + [(f"kebakaran hutan {PROVINSI[p].replace('Kep. ', 'Kepulauan ')}", p) for p in PROVINSI])


# ---------------------------------------------------------------- teks
STOP = set("yang di ke dari dan ini itu untuk dengan pada akan jadi oleh karena juga dalam atau sudah masih bisa ada tak "
           "agar saat usai kini hari jam pukul the a of in to soal terkait jelang hingga sampai demi lewat via begini "
           "sebut minta kata ungkap jelaskan begitu ya pun nya lagi para sejumlah warga".split())


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^0-9a-z]+", " ", s).strip()


def token(s):
    return norm(s).split()


def kunci_judul(s):
    return {t for t in token(s) if t not in STOP and len(t) > 1}


def jaccard(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def bersih_html(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


# ---------------------------------------------------------------- ambil RSS
def ambil(url, coba=4):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return r.read()
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url}: {e}")
            time.sleep(60 if "429" in str(e) or "503" in str(e) else 5 * (i + 1))


def rss(q, ed="id"):
    hl, gl, ceid = EDISI[ed]
    return "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q, "hl": hl, "gl": gl, "ceid": ceid})


def domain(u):
    d = urllib.parse.urlparse(u or "").netloc.lower()
    return d[4:] if d.startswith("www.") else d


def urai(xml):
    """Item RSS -> artikel mentah {id, judul, sumber, url, tgl, ringkas}."""
    out = []
    for it in ET.fromstring(xml).iter("item"):
        url, judul = (it.findtext("link") or "").strip(), (it.findtext("title") or "").strip()
        sumber, src = (it.findtext("source") or "").strip(), it.find("source")
        if not url or not judul:
            continue
        if sumber and judul.endswith(" - " + sumber):
            judul = judul[: -len(sumber) - 3].strip()
        elif not sumber and " - " in judul and len(judul.rsplit(" - ", 1)[1]) <= 40:
            judul, sumber = (x.strip() for x in judul.rsplit(" - ", 1))
        if " - " in judul and re.fullmatch(r"[\w.-]+\.[a-z]{2,}", judul.rsplit(" - ", 1)[1].strip()):  # "- radarlampung.disway.id"
            judul = judul.rsplit(" - ", 1)[0].strip()
        try:
            tgl = email.utils.parsedate_to_datetime(it.findtext("pubDate")).astimezone(WIB)
        except Exception:
            continue
        # cuplikan Google News biasanya hanya judul + nama media; sisakan hanya teks yang benar-benar tambahan
        d = bersih_html(it.findtext("description"))
        for buang in (judul, sumber):
            d = d.replace(buang, " ") if buang else d
        d = re.sub(r"\s+", " ", d).strip(" - ")
        out.append({"id": hashlib.sha1(url.encode()).hexdigest()[:10], "judul": html.unescape(judul), "sumber": sumber,
                    "url": url, "tgl": tgl.isoformat(timespec="minutes"), "ringkas": d[:300] if len(d) > 20 else ""})
        if src is not None and domain(src.get("url")):
            out[-1]["domain"] = domain(src.get("url"))
    return out


def panen(daftar):
    hasil, gagal = [], 0
    for i, q in enumerate(daftar):
        ed, q = q if isinstance(q, tuple) else ("id", q)
        try:
            xs = urai(ambil(rss(q, ed)))
            for x in xs:
                if ed != "id":
                    x["ed"] = ed
            hasil += xs
        except Exception as e:
            gagal += 1
            print("gagal", e, file=sys.stderr)
        if i < len(daftar) - 1:
            time.sleep(1.0)  # sopan: ~1 permintaan per detik
    if gagal > len(daftar) // 2:
        raise RuntimeError(f"{gagal}/{len(daftar)} kueri gagal")
    return hasil


# ---------------------------------------------------------------- relevansi
R_KUAT = re.compile(r"\b(karhutla|kebakaran (hutan|lahan|gambut|ilalang|semak|savana|kebun|perkebunan|padang)|"
                    r"(lahan|hutan|gambut|ilalang|savana|semak) (\w+ )?terbakar|kabut asap|asap (kiriman|karhutla)|"
                    r"titik (api|panas)|hotspot|water bombing|bom air|manggala agni|pembakar(an)? (hutan|lahan)|"
                    r"(mem|di)bakar (hutan|lahan|ilalang)|sekat kanal|masyarakat peduli api|satgas karhutla)\b")
# asap tanpa frasa "kabut asap": diterima bila disertai kata dampak (pekat, kepung, ISPA, kualitas udara...)
R_ASAP = re.compile(r"\basap\b")
R_ASAP_DAMPAK = re.compile(r"\b(pekat|tebal|kepung|dikepung|mengepung|selimut\w*|diselimuti|ispa|kualitas udara|ispu|jarak pandang|"
                        r"polusi|pernapasan|sesak|masker|labut|karhula)\b")
R_API = re.compile(r"\b(kebakaran|terbakar|dibakar|membakar|hangus|api)\b")
R_ALAM = re.compile(r"\b(hutan|lahan|gambut|hektare|hektar|ha|kebun|ilalang|semak|savana|belukar|gunung|taman nasional|tn|cagar)\b")
R_BANGUNAN = re.compile(r"\b(rumah|pasar|gedung|kapal|mobil|truk|bus|motor|toko|ruko|pabrik|gudang|kantor|kios|pemukiman|"
                        r"permukiman|asrama|hotel|spbu|kilang|tangki|pipa|kereta|apartemen|masjid|gereja|rumah sakit|lapas|"
                        r"bengkel|warung|dapur|sumur minyak|smelter|kendaraan|bangunan|mall|penjara|tenda|keraton|kompor|"
                        r"listrik|korsleting|tabung gas|elpiji)\b")
R_ASING = re.compile(r"\b(amerika|as|california|los angeles|kanada|australia|yunani|turki|spanyol|portugal|prancis|chile|"
                     r"brasil|amazon|korea|jepang|hawaii|israel|rusia|siberia|bolivia|meksiko|eropa|afrika|india|china|"
                     r"tiongkok|thailand|myanmar|laos|vietnam|filipina|argentina|inggris|skotlandia|jerman|italia|"
                     r"kroasia|aljazair|suriah|lebanon|gaza|iran|mongolia|selandia baru|angola|bhutan|kongo|nigeria)\b")
# Malaysia/Singapura/Brunei sengaja TIDAK dianggap luar negeri: kabut asap di sana hampir selalu asap kiriman Indonesia.
R_INDONESIA = re.compile(r"\b(indonesia|ri|asap kiriman|lintas batas|haze)\b")


def relevan(teks, geo=None):
    """(bool, alasan). Aturan: ada frasa kuat karhutla; atau kata api + kata lanskap (hutan/lahan/hektare) tanpa
    kata bangunan. Berita luar negeri dibuang kecuali menyebut Indonesia/asap lintas batas atau tempat di Indonesia."""
    t = norm(teks)
    kuat = R_KUAT.search(t) or (R_ASAP.search(t) and R_ASAP_DAMPAK.search(t))
    indo = R_INDONESIA.search(t) or (geo and (geo["prov"] or geo["kab"]))
    if t.startswith("peta kebakaran hutan") and not indo:  # halaman peta otomatis negara lain
        return False, "luar negeri"
    if not kuat:
        if not (R_API.search(t) and R_ALAM.search(t)):
            return False, "tanpa kata karhutla"
        if R_BANGUNAN.search(t):
            return False, "kebakaran bangunan/kendaraan"
    if R_ASING.search(t) and not indo:
        return False, "luar negeri"
    return True, kuat.group(0) if kuat else "api + lanskap"


# ---- bahasa & asal (liputan internasional)
STOP_EN = set("the of in to and as for on is are with after over from by its amid has have be was were at it this that into "
              "says say will than more could can why how what who not no".split())
STOP_ID = set("yang di ke dari dan ini itu untuk dengan pada akan oleh karena juga dalam atau sudah masih bisa tak belum".split())
# media Indonesia yang menulis dalam bahasa Inggris tetap "nasional"
R_MEDIA_RI = re.compile(r"\b(antara|tempo|jakarta (post|globe)|kompas|detik|cnn indonesia|liputan6|okezone|tribun|republika|"
                        r"independent observer|batam news|aktualita|journalarta|dompet dhuafa|bisnis|insider stories|"
                        r"indonesia business post|voi|jawa pos|media indonesia|metro tv|kumparan|idn|suara|sindonews|katadata|"
                        r"mongabay indonesia|inilah|viva|beritasatu|rri|tvri|kontan|merdeka)\b")
R_SOSMED = re.compile(r"^(facebook|instagram|youtube|tiktok|x|twitter|threads|linkedin)$")


def bahasa(a):
    """'en' / 'ms' / 'id' dari kata fungsi judul; edisi RSS hanya penentu bila kata fungsinya seimbang."""
    tok = token(a["judul"])
    en, idn = sum(t in STOP_EN for t in tok), sum(t in STOP_ID for t in tok)
    ed = a.get("ed", "id")
    if ed.startswith("en"):
        return "id" if idn > en else "en"
    if en >= 2 and en > idn:
        return "en"
    return "ms" if ed == "ms-MY" else "id"


def asal(a, bhs):
    return "internasional" if bhs != "id" and not R_MEDIA_RI.search(norm(a["sumber"])) else "nasional"


# relevansi untuk judul Inggris/Melayu: harus soal api/asap DAN tertaut ke Indonesia
R_KUAT_EN = re.compile(r"\b(wild ?fires?|forest (and land )?(fires?|blazes?)|land fires?|peat ?(land)? fires?|bush ?fires?|haze|hazy|hotspots?|"
                       r"slash and burn|water bombing|karhutla|jerebu|kebakaran (hutan|gambut|tanah|lahan)|"
                       r"titik panas|kawasan panas)\b")
R_API_EN = re.compile(r"\b(fires?|blazes?|burn\w*|smoke|smog|flames?|ablaze|firefight\w*|fire ?fight\w*|arson\w*|kebakaran|asap)\b")
R_ASAP_EN = re.compile(r"\b(smoke|smog|fog|smoky)\b")
R_ALAM_EN = re.compile(r"\b(forests?|peat\w*|land|hectares?|ha|plantations?|concessions?|national parks?|orangutans?|wildlife|palm oil|"
                       r"savanna|grassland|mount|mt|volcano|kalimantan|sumatra\w*|borneo|hutan|gambut)\b")
R_BANGUNAN_EN = re.compile(r"\b(house fire|buildings?|apartments?|factory|market fire|cars?|vehicles?|ships?|vessels?|refinery|"
                           r"warehouses?|hotel|prison|restaurant|plane|kilang|rumah|kedai)\b")
R_INDO_EN = re.compile(r"\b(indonesia\w*|indon|prabowo|borneo|sumatra\w*|sumatera|kalimantan|transboundary|rentas sempadan|"
                       r"cross border haze)\b")
R_ASING_EN = re.compile(r"\b(california|los angeles|canada|canadian|australia\w*|greece|greek|turkey|spain|portugal|france|chile|"
                        r"brazil|amazon|korea|japan|hawaii|israel|russia\w*|siberia|bolivia|mexico|europe\w*|africa\w*|india|"
                        r"china|chinese|thailand|thai|myanmar|laos|vietnam|philippines|manila|cebu|argentina|britain|uk|"
                        r"scotland|german\w*|italy|oregon|colorado|texas|arizona|washington state|us|u s|america\w*|sabah|sarawak|belgium|"
                        r"netherlands|dutch|switzerland|austria|poland|sweden|norway|finland|ukraine|egypt|lebanon|syria|iran|"
                        r"iraq|bangkok|taiwan|hong kong|nepal|pakistan|bangladesh|sri lanka|peru|colombia|venezuela|ecuador)\b")


def relevan_int(teks, geo=None, media=""):
    """(bool, alasan) untuk teks Inggris/Melayu. Asap Malaysia/Singapura hanya diterima bila Indonesia/lintas batas disebut."""
    t = norm(teks)
    kuat = R_KUAT_EN.search(t)
    if not kuat:
        if not (R_API_EN.search(t) and (R_ALAM_EN.search(t) or R_ASAP_EN.search(t))):
            return False, "tanpa kata karhutla"
        if R_BANGUNAN_EN.search(t):
            return False, "kebakaran bangunan/kendaraan"
    indo = R_INDO_EN.search(t) or (media and R_MEDIA_RI.search(norm(media)))  # media Indonesia: konteksnya Indonesia
    if not (indo or (geo and geo["prov"])):
        return False, "tidak menyebut Indonesia"
    if R_ASING_EN.search(t) and not R_INDO_EN.search(t):
        return False, "luar negeri"
    return True, kuat.group(0) if kuat else "api + lanskap"


# ---------------------------------------------------------------- geocoder
PROV_EN = {"north sumatra": "12", "west sumatra": "13", "south sumatra": "16", "riau islands": "21", "bangka belitung islands": "19",
           "west java": "32", "central java": "33", "east java": "35", "west nusa tenggara": "52", "east nusa tenggara": "53",
           "west kalimantan": "61", "central kalimantan": "62", "south kalimantan": "63", "east kalimantan": "64",
           "north kalimantan": "65", "north sulawesi": "71", "central sulawesi": "72", "south sulawesi": "73",
           "southeast sulawesi": "74", "west sulawesi": "76", "north maluku": "82", "west papua": "92", "south papua": "93",
           "central papua": "94", "highland papua": "95", "southwest papua": "96"}
PROV_SINGKAT = {"kalteng": "62", "kalbar": "61", "kalsel": "63", "kaltim": "64", "kaltara": "65", "sumsel": "16", "sumut": "12",
                "sumbar": "13", "sulsel": "73", "sulteng": "72", "sultra": "74", "sulut": "71", "sulbar": "76", "jabar": "32",
                "jateng": "33", "jatim": "35", "ntt": "53", "ntb": "52", "babel": "19", "kepri": "21", "diy": "34",
                "yogyakarta": "34", "jakarta": "31", "malut": "82", "bangka belitung": "19", "papua selatan": "93"}
KAB_SINGKAT = {
    "oki": "Ogan Komering Ilir", "oku": "Ogan Komering Ulu", "oku timur": "Ogan Komering Ulu Timur", "okut": "Ogan Komering Ulu Timur",
    "oku selatan": "Ogan Komering Ulu Selatan", "okus": "Ogan Komering Ulu Selatan", "muba": "Musi Banyuasin",
    "muratara": "Musi Rawas Utara", "pali": "Penukal Abab Lematang Ilir", "lubuklinggau": "Kota Lubuk Linggau",
    "pagaralam": "Kota Pagar Alam", "inhu": "Indragiri Hulu", "inhil": "Indragiri Hilir", "kuansing": "Kuantan Singingi",
    "rohil": "Rokan Hilir", "rohul": "Rokan Hulu", "meranti": "Kepulauan Meranti", "kotim": "Kotawaringin Timur",
    "kobar": "Kotawaringin Barat", "pulpis": "Pulang Pisau", "barsel": "Barito Selatan", "bartim": "Barito Timur",
    "barut": "Barito Utara", "gumas": "Gunung Mas", "palangka raya": "Kota Palangkaraya", "kku": "Kayong Utara",
    "hss": "Hulu Sungai Selatan", "hst": "Hulu Sungai Tengah", "hsu": "Hulu Sungai Utara", "batola": "Barito Kuala",
    "tanbu": "Tanah Bumbu", "kukar": "Kutai Kartanegara", "kutim": "Kutai Timur", "kubar": "Kutai Barat",
    "ppu": "Penajam Paser Utara", "mahulu": "Mahakam Ulu", "tanjabtim": "Tanjung Jabung Timur", "tanjabbar": "Tanjung Jabung Barat",
    "tanjab timur": "Tanjung Jabung Timur", "tanjab barat": "Tanjung Jabung Barat", "batang hari": "Batanghari",
    "tts": "Timor Tengah Selatan", "ttu": "Timor Tengah Utara", "mabar": "Manggarai Barat", "matim": "Manggarai Timur",
    "bovendigoel": "Boven Digoel", "kota baru": "Kotabaru", "labuhan batu": "Labuhanbatu",
}
# nama kabupaten yang juga sungai/kata umum: hanya diterima bila provinsinya disebut atau ada awalan "kabupaten"
KAB_LEMAH = {"kapuas", "landak", "siak", "kampar", "musi", "padang", "malaka", "banjar", "batu", "solok", "agam", "toba",
             "belu", "alor", "ende", "karo", "tebo", "bungo", "paser", "kotabaru", "kota baru", "seruyan", "katingan",
             "lamandau", "melawi", "sekadau", "sanggau", "kerinci", "merangin", "mappi", "asmat", "malinau", "tapin",
             "balangan", "tabalong", "nias", "dairi", "samosir", "pasaman", "sijunjung"}
GENERIK = set("kota tengah barat timur utara selatan hulu hilir ilir ulu baru lama jaya raya sungai pulau besar kecil dalam luar "
              "bukit tanjung teluk muara air batu padang sari makmur indah mulya mulia rejo harapan maju tani gunung danau rawa "
              "laut pantai pesisir kampung desa simpang tanah lubuk koto nagari marga sei pangkalan rantau seberang ujung pasir "
              "karang lima puluh empat tiga dua satu kepulauan induk pusat mandiri sejahtera bersatu damai sentosa kencana merdeka "
              "bakti setia abadi kuala api asap hutan lahan hujan sawit bandar kuta batang talang tebing binjai medan".split())
NEGARA = {"indonesia"}


class Geo:
    """Cocokkan nama provinsi/kabupaten/kecamatan di teks (n-gram terpanjang dulu). Titik = sentroid kecamatan,
    atau rata-rata berbobot luas sentroid kecamatan untuk kabupaten/provinsi (disimpan di pusat.json)."""

    def __init__(self, pusat=None):
        self.pusat = pusat or self.hitung_pusat()
        self.frasa = defaultdict(list)  # frasa ternormalisasi -> [(jenis, kunci, eksplisit)]
        kab_nama = defaultdict(list)
        for k in self.pusat["kab"]:
            kab_nama[k.split("|")[1]].append(k)
        for kode, nama in PROVINSI.items():
            for v in {nama, nama.replace("Kep. ", "Kepulauan "), nama.replace("Kep. ", ""), nama.replace("Sumatera", "Sumatra"),
                      "Provinsi " + nama}:
                self.tambah(norm(v), ("prov", kode, True))
        for v, kode in PROV_SINGKAT.items():
            self.tambah(v, ("prov", kode, True))
        for v, kode in PROV_EN.items():  # judul Inggris: "South Sumatra", "W Kalimantan"
            self.tambah(v, ("prov", kode, True))
            arah, sisa = v.split(" ", 1)
            if arah in ("north", "south", "east", "west", "central"):
                self.tambah(arah[0] + " " + sisa, ("prov", kode, True))
        nama_kab = {norm(n) for n in kab_nama}
        nama_prov = {norm(p) for p in PROVINSI.values()}
        for nama, ks in kab_nama.items():
            n = norm(nama)
            for k in ks:
                self.tambah(n, ("kab", k, n not in KAB_LEMAH))
                bare = n[5:] if n.startswith("kota ") else n
                self.tambah("kabupaten " + bare, ("kab", k, True)); self.tambah("kab " + bare, ("kab", k, True))
                self.tambah(bare + " regency", ("kab", k, True))
                if n.startswith("kota ") and bare not in nama_prov and bare not in nama_kab:
                    self.tambah(bare, ("kab", k, bare not in KAB_LEMAH))
        for v, nama in KAB_SINGKAT.items():
            for k in kab_nama.get(nama, []):
                self.tambah(v, ("kab", k, v not in KAB_LEMAH))
        for k in self.pusat["kec"]:
            n = norm(k.split("|")[2])
            if len(n) < 4 or all(t in GENERIK for t in n.split()):
                self.tambah("kecamatan " + n, ("kec", k, True))
                continue
            self.tambah(n, ("kec", k, False)); self.tambah("kecamatan " + n, ("kec", k, True)); self.tambah("kec " + n, ("kec", k, True))
        self.maks = max(len(f.split()) for f in self.frasa)

    def tambah(self, frasa, target):
        if target not in self.frasa[frasa]:
            self.frasa[frasa].append(target)

    @staticmethod
    def hitung_pusat():
        kec, kab, prov = {}, defaultdict(lambda: [0.0, 0.0, 0.0]), defaultdict(lambda: [0.0, 0.0, 0.0])
        for fn in sorted(glob.glob(os.path.join(AKAR, "public/geo/kecamatan/*.json"))):
            kode = os.path.basename(fn)[:2]
            for f in json.load(open(fn))["features"]:
                p, g = f["properties"], f["geometry"]
                if not p.get("kab") or not p.get("kec"):
                    continue
                ring = max((q[0] for q in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])), key=len)
                la, lo = sentroid(ring)
                luas = abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2 or 1e-6
                kec[f"{kode}|{p['kab']}|{p['kec']}"] = [round(la, 4), round(lo, 4)]
                for d, kk in ((kab, f"{kode}|{p['kab']}"), (prov, kode)):
                    d[kk][0] += la * luas; d[kk][1] += lo * luas; d[kk][2] += luas
        rata = lambda d: {k: [round(v[0] / v[2], 4), round(v[1] / v[2], 4)] for k, v in d.items()}
        return {"kec": kec, "kab": rata(kab), "prov": rata(prov)}

    def cocok(self, teks):
        tok, i, hit = token(teks), 0, []
        while i < len(tok):
            for n in range(min(self.maks, len(tok) - i), 0, -1):
                f = " ".join(tok[i:i + n])
                if f in self.frasa:
                    hit.append(self.frasa[f]); i += n
                    break
            else:
                i += 1
        return hit

    def cari(self, teks):
        """-> {prov:[kode], kab:["kode|Kab"], kec:["kode|Kab|Kec"], lat, lon, presisi}."""
        hit = self.cocok(teks)
        prov, kab, kec = [], [], []
        tambah = lambda l, x: l.append(x) if x not in l else None
        for h in hit:  # provinsi menang atas kabupaten/kecamatan dengan frasa sama
            for j, k, _ in h:
                if j == "prov":
                    tambah(prov, k)
        prov_teks = set(prov)
        for h in hit:
            if any(j == "prov" for j, _, _ in h):
                continue
            kb = [(k, e) for j, k, e in h if j == "kab"]
            eksplisit_kec = any(j == "kec" and e for j, _, e in h)
            if kb and not eksplisit_kec:
                pilih = [k for k, e in kb if k[:2] in prov_teks] or ([kb[0][0]] if len(kb) == 1 and kb[0][1] else [])
                for k in pilih:
                    tambah(kab, k); tambah(prov, k[:2])
        konteks = set(prov)
        for h in hit:
            if any(j in ("prov",) for j, _, _ in h) or (any(j == "kab" for j, _, _ in h) and not any(j == "kec" and e for j, _, e in h)):
                continue
            ks = [(k, e) for j, k, e in h if j == "kec"]
            if not ks:
                continue
            cal = [k for k, _ in ks if k[:2] in konteks]
            if len(cal) > 1:  # nama sama di beberapa kabupaten satu provinsi: pakai yang kabupatennya disebut
                cal = [k for k in cal if k.rsplit("|", 1)[0] in kab]
            if not cal and len(ks) == 1 and ks[0][1]:  # "Kecamatan X" eksplisit dan unik secara nasional
                cal = [ks[0][0]]
            if len(cal) == 1:
                k = cal[0]
                tambah(kec, k); tambah(kab, k.rsplit("|", 1)[0]); tambah(prov, k[:2])
        if kec:
            ll, presisi = self.pusat["kec"][kec[0]], "kec"
        elif kab:
            ll, presisi = self.pusat["kab"][kab[0]], "kab"
        elif prov:
            ll, presisi = self.pusat["prov"].get(prov[0]), "prov"
        else:
            ll, presisi = None, None
        return {"prov": prov, "kab": kab, "kec": kec, "lat": ll and ll[0], "lon": ll and ll[1], "presisi": presisi}


# ---------------------------------------------------------------- topik
TOPIK = {
    "kejadian": r"\b(ter|ke|di|mem|pem)?bakar(an)?\b|\bapi\b|\bmeluas|\btitik (api|panas)|\bhotspot|\bhangus|\bmembara|\bkobaran|\bdilalap",
    "asap_kesehatan": r"\bkabut asap|\basap\b|\bispa\b|kualitas udara|\bispu\b|\bpm ?2 ?5\b|\b(libur|daring|diliburkan|belajar dari rumah)\b|\bmasker|\bsesak|\bpneumonia",
    "penanganan": r"\bpemadam|\bpadamkan|\bdipadamkan|\bmemadamkan|water bombing|\bbom air|\bhelikopter|\bsatgas|manggala agni|\btni\b|\bpolri\b|\bbrimob|\bbpbd\b|\bbnpb\b|modifikasi cuaca|\bomc\b|\btmc\b|\bdamkar|\bpendinginan",
    "hukum": r"\btersangka|\bditangkap|\btangkap|\bmenangkap|\bdiamankan|\bdisegel|\bsegel|\bkorporasi|\bperusahaan|\bpt\b|\bgugat|\bsanksi|\bpidana|\bpenyidik|\bdiperiksa|\bgakkum|penegakan hukum|\bvonis|\bdivonis|\bpengadilan|\bdakwa|ganti rugi|cabut izin|izin dicabut|\bpembakar\b",
    "kebijakan_anggaran": r"status siaga|tanggap darurat|siaga darurat|\banggaran|\bdana\b|\binstruksi|\binstruksikan|\binpres|rapat koordinasi|\brakor|\bapel\b|\bkebijakan|\bpresiden|\bmenteri|\bmenko|\bgubernur|\bbupati|\bwali kota|\bdpr|bencana nasional|\bregulasi|\bperda\b",
    "dampak": r"\btewas|\bmeninggal|\bkorban|\bpenerbangan|\bbandara|\bpesawat|\bdelay|\bekonomi|\bkerugian|\brugi\b|\bsatwa|\borangutan|\bharimau|\bgajah|\bmengungsi|\bsekolah|\bpanen|\bpetani|\bpariwisata|\bmalaysia|\bsingapura|\bevakuasi",
    "cuaca_iklim": r"\bel nino|\bla nina|\bkemarau|\bhujan|\bbmkg|\bcuaca|\biklim|\bkekeringan|\bkering\b|\bsuhu\b|\bmusim\b",
    "pencegahan_restorasi": r"sekat kanal|\bkanal\b|\bmpa\b|masyarakat peduli api|\bpatroli|\bedukasi|\bsosialisasi|\brestorasi|\bpembasahan|\bembung|sumur bor|\bpencegahan|\bcegah|\bmencegah|deteksi dini|\bbrgm?\b|\bpenanaman|\breboisasi|\bantisipasi",
}
TOPIK["asap_kesehatan"] += r"|\bjerebu|\bipu\b"  # Melayu
TOPIK["hukum"] += r"|\bdisaman|\bsaman\b|\bcuai|\bkecuaian"
TOPIK_EN = {
    "kejadian": r"\bfires?\b|\bwildfires?|\bblazes?|\bburn\w*|\bablaze|\bflames?|\bhotspots?|\bspread\w*|\braging|\bscorch",
    "asap_kesehatan": r"\bhaze|\bhazy|\bsmoke|\bsmog|air quality|\bpsi\b|\bapi\b|\bpm ?2 ?5\b|\bpollut\w*|\brespiratory|\bbreath\w*|\bmasks?\b|\bschools?\b|\btoxic|\bunhealthy|\bhazardous",
    "penanganan": r"\bfirefight\w*|fire ?fight\w*|\bextinguish\w*|\bput out|water bombing|\bhelicopters?|\bwater bomb\w*|\btask force|\bdeploy\w*|\bsoldiers|\bmilitary|\bpersonnel|\bcloud seeding|weather modification|\bsuppress\w*|\bcontain\w*",
    "hukum": r"\barrest\w*|\bsuspects?|\bpolice|\bcourt|\blawsuit|\bsue[sd]?\b|\bnegligence|\bsanction\w*|\bprosecut\w*|\binvestigat\w*|\bcompan(y|ies)|\bfirms?\b|\bcorporat\w*|\bconcessions?|\blicen[cs]es?|\bcrackdown|\bperpetrators|\blegal",
    "kebijakan_anggaran": r"\bpresident|\bprabowo|\bminist\w*|\bgovernment|\bgovt|\bpolicy|\bbudget|\bemergency status|\bnational disaster|\basean|\bdiplomat\w*|\btalks|\bcooperation|\bagreement|\blaw\b|\bparliament|\bdpr\b|\banwar|\bofficials?",
    "dampak": r"\bdead\b|\bdeaths?|\bkill\w*|\bdie[sd]?\b|\binjur\w*|\bflights?|\bairports?|\beconom\w*|\blosses|\bcost|\borangutans?|\bwildlife|\btigers?|\belephants?|\bevacuat\w*|\bdisplaced|\bhouses|\bschools?\b|\bmalaysia\w*|\bsingapore\w*|\bf1\b|\bgrand prix|\btourism",
    "cuaca_iklim": r"\bel nino|\bla nina|\bdrought|\bdry (season|weather|spell)|\brain\w*|\bweather|\bclimate|\bmonsoon|\bheat\b|\bbmkg|\bmetmalaysia",
    "pencegahan_restorasi": r"\bprevent\w*|\brewet\w*|\brestor\w*|\bcanal|\bpatrol\w*|\bpeatland agency|\bbrg\b|\bearly warning|\breforest\w*|\bcommunit(y|ies) fire",
}
TOPIK_RE = {k: re.compile(v) for k, v in TOPIK.items()}
TOPIK_RE_EN = {k: re.compile(v) for k, v in TOPIK_EN.items()}


def topik(teks, bhs="id"):
    t = norm(teks)
    return [k for k, r in (TOPIK_RE_EN if bhs == "en" else TOPIK_RE).items() if r.search(t)]


# ---------------------------------------------------------------- sentimen
# Bobot: + membaik / respons positif, - memburuk / respons negatif. Entri 0 = penghalang (frasa yang memuat kata
# berbobot tapi bermakna lain, mis. "tanggap darurat" bukan pujian "tanggap"). Dicocokkan frasa terpanjang dulu.
SITUASI = {
    "meluas": -2, "makin luas": -2, "membesar": -2, "bertambah": -1.5, "meningkat": -1.5, "peningkatan": -1, "naik": -1,
    "melonjak": -2, "lonjakan": -2, "melonjaknya": -2, "bertambah luas": -2, "memburuk": -2, "parah": -2, "terparah": -2,
    "darurat": -1.5, "tanggap darurat": -1.5, "siaga darurat": -1, "bencana": -1, "bencana nasional": -1.5,
    "tewas": -2.5, "meninggal": -2.5, "meninggal dunia": -2.5, "korban": -1.5, "korban jiwa": -2.5, "terjebak": -2,
    "kritis": -2, "berbahaya": -2, "membahayakan": -2, "bahaya": -1.5, "tidak sehat": -2, "pekat": -1.5, "tebal": -1,
    "menyelimuti": -1.5, "selimuti": -1.5, "diselimuti": -1.5, "mengepung": -1.5, "kepung": -1.5, "dikepung": -1.5,
    "terganggu": -1.5, "ganggu": -1, "mengganggu": -1, "lumpuh": -2, "ditutup": -1, "tertunda": -1, "delay": -1,
    "dialihkan": -1, "dibatalkan": -1, "diliburkan": -1.5, "libur": -1, "belajar dari rumah": -1, "daring": -0.5,
    "ispa": -1.5, "sesak": -1.5, "pneumonia": -1.5, "mengancam": -1.5, "ancam": -1.5, "ancaman": -1, "terancam": -1.5,
    "sulit dipadamkan": -2, "sulit": -1, "kewalahan": -2, "membara": -1.5, "berkobar": -2, "kobaran": -1.5, "mengamuk": -2,
    "terbakar": -1, "dilalap": -1.5, "hangus": -1.5, "hanguskan": -1.5, "ribuan hektare": -1.5, "ratusan hektare": -1,
    "kekeringan": -1, "kemarau panjang": -1, "puncak kemarau": -1, "el nino": -1, "muncul": -1, "bermunculan": -1.5,
    "rekor": -1.5, "tertinggi": -1.5, "mengungsi": -2, "evakuasi": -1.5, "dievakuasi": -1.5, "kabut asap": -1,
    "buruk": -1.5, "terdampak": -1, "terpapar": -1.5, "gagal panen": -1, "masih": -0.5, "kembali terbakar": -1.5,
    "menjalar": -2, "merambat": -1.5, "mendekati": -1, "dekati": -1, "fase": 0, "waspada": -0.5, "siaga": -0.5,
    "padam": 2, "dipadamkan": 1.5, "berhasil dipadamkan": 2.5, "terkendali": 2, "dikendalikan": 1, "berkurang": 2,
    "menurun": 2, "penurunan": 1.5, "turun": 1, "hujan": 1, "hujan turun": 2, "diguyur hujan": 2, "guyuran hujan": 2,
    "diguyur": 1.5, "membaik": 2, "berangsur": 1, "mereda": 2, "reda": 1.5, "menipis": 2, "hilang": 1, "nihil": 2,
    "sehat": 1, "normal": 1.5, "kembali normal": 2, "dibuka kembali": 1.5, "aman": 1, "kondusif": 1.5, "landai": 1.5,
    "pendinginan": 0, "tuntas": 1.5, "musim hujan": 1.5, "hujan buatan": 0, "modifikasi cuaca": 0, "turun hujan": 2,
    "kembali sekolah": 1, "sekolah tatap muka": 1, "jauh berkurang": 2,
    "terdeteksi": -1, "terpantau": -0.5, "zona merah": -1.5, "melanda": -1.5, "dilanda": -1.5,
}
RESPONS = {
    "berhasil": 1.5, "sukses": 1.5, "sigap": 2, "cepat tanggap": 2, "gerak cepat": 2, "tanggap": 1, "tanggap darurat": 0,
    "apresiasi": 2, "mengapresiasi": 2, "diapresiasi": 2, "pujian": 2, "dipuji": 2, "puji": 2, "efektif": 1.5, "optimal": 1,
    "maksimal": 1, "solid": 1, "sinergi": 1, "bersinergi": 1, "serius": 1, "tegas": 1.5, "ditangkap": 1.5, "tangkap": 1.5,
    "menangkap": 1.5, "diamankan": 1, "ditahan": 1, "tersangka": 1, "disegel": 1.5, "segel": 1.5, "menyegel": 1.5,
    "sanksi": 1, "cabut izin": 1.5, "dicabut": 1, "siap": 1, "kesiapan": 0.5, "turun tangan": 1, "gotong royong": 1,
    "jemput bola": 1, "hadir": 0.5, "divonis": 1, "dihukum": 1, "ganti rugi": 0.5, "menang": 1, "dikabulkan": 1,
    "lamban": -2, "lambat": -2, "gagal": -2, "kritik": -2, "kritisi": -2, "dikritik": -2, "mengkritik": -2, "kecam": -2,
    "mengecam": -2, "dikecam": -2, "kecaman": -2, "tidak siap": -2, "abai": -2, "mengabaikan": -2, "diabaikan": -1.5,
    "lalai": -2, "kelalaian": -2, "tidak serius": -2, "minim": -1.5, "kurang": -1, "kekurangan": -1.5, "terbatas": -1,
    "keterbatasan": -1.5, "kewalahan": -1.5, "disorot": -1.5, "menyoroti": -1, "soroti": -1, "sorotan": -1, "desak": -1,
    "mendesak": -1, "didesak": -1, "gugat": -1.5, "gugatan": -1.5, "menggugat": -1.5, "digugat": -1.5, "tuntut": -1,
    "menuntut": -1, "protes": -1.5, "keluhkan": -1.5, "mengeluhkan": -1.5, "mengeluh": -1.5, "keluhan": -1.5,
    "pertanyakan": -1.5, "mempertanyakan": -1.5, "dipertanyakan": -1.5, "salahkan": -1.5, "menyalahkan": -1.5,
    "tuding": -1.5, "menuding": -1.5, "dituding": -1.5, "lepas tangan": -2, "tak berdaya": -2, "pembiaran": -2,
    "dibiarkan": -1.5, "mangkrak": -2, "tumpul": -1.5, "lemah": -1.5, "tebang pilih": -2, "sp3": -1.5, "korupsi": -2,
    "buruk": -1, "tak kunjung": -1.5, "tidak kunjung": -1.5, "molor": -1.5, "telat": -1.5, "terlambat": -1.5,
    "bencana nasional": 0, "wacana": -0.5, "ironis": -1.5, "ironi": -1.5, "sindir": -1.5, "menyindir": -1.5,
    "tagih": -1, "menagih": -1, "tidak transparan": -2, "kecewa": -2, "kekecewaan": -2, "dilaporkan": -0.5,
    "hambat": -1.5, "menghambat": -1.5, "terhambat": -1.5, "kendala": -1.5, "terkendala": -1.5, "kehabisan": -1.5,
    "sulit dijangkau": -1, "rapat terbatas": 0, "percepat": 1, "mempercepat": 1,
}
# Melayu (judul edisi ms-MY memakai leksikon Indonesia + kata ini)
SITUASI.update({"jerebu": -0.5, "merosot": -1.5, "terjejas": -1.5, "bertambah baik": 2, "pulih": 1.5, "beransur pulih": 2, "susut": 1.5,
                "tidak sihat": -2, "sihat": 1, "berterusan": -1, "melarat": -1.5, "tutup": -1, "teruk": -2, "dibuka semula": 1.5})
RESPONS.update({"cuai": -2, "kecuaian": -2, "disaman": -1.5, "saman": -1.5, "gesa": -1, "dalang": -1.5, "mohon maaf": -1,
                "maklum balas": 0.5, "respons": 0.5, "boikot": -1.5})
# Inggris. Situasi: memburuk (-) vs membaik (+). Respons: kritik (-) vs apresiasi/tindakan tegas (+). Entri 0 = penghalang.
SITUASI_EN = {
    "spread": -1.5, "spreads": -1.5, "spreading": -1.5, "spread into": -2, "worsen": -2, "worsens": -2, "worsening": -2, "worsened": -2,
    "worst": -2, "rage": -2, "rages": -2, "raging": -2, "choke": -1.5, "chokes": -1.5, "choking": -1.5, "choked": -1.5,
    "suffocating": -2, "shroud": -1.5, "shrouds": -1.5, "shrouding": -1.5, "blanket": -1.5, "blankets": -1.5, "toxic": -1.5,
    "hazardous": -2, "unhealthy": -1.5, "very unhealthy": -2.5, "dangerous": -2, "record": -1.5, "high": -1, "remain high": -1.5,
    "persist": -1, "persists": -1, "persisting": -1, "persistent": -1, "prolonged": -1, "surge": -2, "surges": -2, "spike": -2,
    "spikes": -2, "soar": -2, "soars": -2, "rise": -1.5, "rises": -1.5, "rising": -1.5, "increase": -1.5, "increases": -1.5,
    "jump": -1.5, "jumps": -1.5, "grows": -1.5, "escalate": -2, "escalates": -2, "escalating": -2, "devastate": -2,
    "devastates": -2, "devastating": -2, "devastated": -2, "destroy": -2, "destroys": -2, "destroying": -2, "destroyed": -2,
    "ravage": -2, "ravages": -2, "burned": -1, "burnt": -1, "scorch": -1.5, "scorched": -1.5, "threaten": -1.5, "threatens": -1.5,
    "threat": -1, "threatening": -1.5, "endanger": -1.5, "killed": -2.5, "dead": -2.5, "deaths": -2.5, "deadly": -2.5,
    "injured": -2, "evacuate": -2, "evacuated": -2, "evacuation": -2, "displaced": -2, "flee": -1.5, "disrupt": -1.5,
    "disrupts": -1.5, "disrupted": -1.5, "disruption": -1.5, "delayed": -1, "cancelled": -1, "diverted": -1, "close": -1,
    "closes": -1.5, "closed": -1.5, "closure": -1.5, "closures": -1.5, "shut": -1.5, "shuts": -1.5, "crisis": -1.5,
    "emergency": -1.5, "disaster": -1, "overwhelm": -2, "overwhelms": -2, "ablaze": -1.5, "burning": -1, "burn": -1,
    "out of control": -2.5, "drought": -1, "el nino": -1, "respiratory": -1.5, "breathing": -1, "smog": -1, "polluted": -1.5,
    "most polluted": -2, "pollution": -1, "haze": 0, "hazy": 0, "chaos": -2, "hard to put out": -2, "struggle": -1,
    "battle": -0.5, "battles": -0.5, "battling": -0.5, "risk": -1, "risks": -1, "at risk": -1.5, "deteriorate": -2,
    "deteriorates": -2, "deteriorating": -2, "plague": -1.5, "toll": -1.5,
    "extinguished": 2, "put out": 1.5, "contained": 2, "under control": 2, "controlled": 1.5, "subside": 2, "subsides": 2,
    "subsided": 2, "ease": 1.5, "eases": 2, "easing": 2, "improve": 2, "improves": 2, "improved": 2, "improving": 2,
    "drop": 1.5, "drops": 1.5, "dropped": 1.5, "decline": 1.5, "declines": 1.5, "falls": 1.5, "fell": 1.5, "plunge": 2,
    "plunges": 2, "decrease": 1.5, "rain": 1, "rains": 1.5, "rainfall": 1, "clear": 1, "clears": 1.5, "reopen": 1.5,
    "reopens": 1.5, "reopened": 1.5, "resume": 1, "resumes": 1, "normal": 1.5, "safe": 1, "safety": 1, "released": 1,
    "freed": 1, "rescued": 0.5, "no active": 2, "fire season": 0, "national disaster status": 0, "air support": 0,
}
RESPONS_EN = {
    "welcome": 1, "welcomes": 1, "praise": 2, "praised": 2, "commend": 2, "commends": 2, "success": 1.5, "successful": 1.5,
    "effective": 1.5, "swift": 1.5, "deploy": 1, "deploys": 1, "deployed": 1, "rescue": 1, "rescued": 1, "rescues": 1,
    "arrest": 1.5, "arrested": 1.5, "arrests": 1.5, "suspects": 1, "sanction": 1.5, "sanctions": 1.5, "revoke": 1.5,
    "revoked": 1.5, "revokes": 1.5, "crackdown": 1.5, "tougher action": 1.5, "tougher": 1, "stricter": 1, "prosecute": 1.5,
    "investigate": 1, "investigation": 1, "under investigation": 1, "stands ready": 1, "ready to assist": 1, "assist": 1,
    "cooperation": 1, "help": 0.5, "offers": 0.5, "aid": 0.5, "vows": 0.5, "moves": 0, "releases": 0.5, "acceleration": 1,
    "criticise": -2, "criticises": -2, "criticised": -2, "criticize": -2, "criticizes": -2, "criticized": -2, "criticism": -2,
    "accused": -2, "accuse": -2, "accuses": -2, "negligence": -2.5, "gross negligence": -3, "lawsuit": -1.5, "sue": -1.5,
    "sued": -1.5, "sues": -1.5, "court": -1, "failure": -2, "fail": -2, "failed": -2, "fails": -2, "slow": -2, "blame": -1.5,
    "blames": -1.5, "mock": -2, "mocks": -2, "roasted": -2, "frustration": -2, "anger": -2, "angry": -2, "outrage": -2,
    "excuses": -2, "apologise": -1.5, "apologize": -1.5, "no show": -2, "brushes off": -2, "pressure": -1.5, "urge": -1,
    "urges": -1, "urged": -1, "demand": -1.5, "demands": -1.5, "grievances": -1.5, "recourse": -1, "yet to": -1.5,
    "no response": -1.5, "lack": -1.5, "lacks": -1.5, "gaps": -1.5, "budget cuts": -1.5, "boycott": -1.5, "do more": -1.5,
    "must": -0.5, "spin": -1.5, "dont pass the buck": -2, "pass the buck": -2, "hard questions": -1, "not discussed": -1,
    "tests": -0.5, "complaint": -1.5, "beyond human error": -1, "silent": -2, "swipe": -1.5,
}
NEGASI = {"tidak", "tak", "belum", "bukan", "tanpa", "jangan", "gak", "nggak", "enggak", "tiada",
          "not", "never", "without", "isn", "doesn", "didn", "won", "cannot", "nor"}
# kata pencegahan menetralkan (bukan membalik) kata sesudahnya: "cegah karhutla meluas" bukan berita meluas
PENETRAL = {"cegah", "mencegah", "antisipasi", "mengantisipasi", "hadapi", "menghadapi", "prevent", "preventing", "prevention", "avert", "curb", "despite"}
PENGUAT = {"sangat": 1.5, "makin": 1.5, "semakin": 1.5, "kian": 1.5, "amat": 1.5, "terus": 1.3, "paling": 1.5, "kembali": 1.2,
           "very": 1.5, "increasingly": 1.5, "extremely": 1.5, "further": 1.3}


def _cocok_leksikon(tok, lex, maks=3):
    i, out = 0, []
    while i < len(tok):
        for n in range(min(maks, len(tok) - i), 0, -1):
            f = " ".join(tok[i:i + n])
            if f in lex:
                out.append((i, f, lex[f])); i += n
                break
        else:
            i += 1
    return out


def skor(judul, ringkas, lex):
    """Skor [-1,1] + alasan. Judul berbobot 2, cuplikan 1. Negasi dalam 3 kata sebelumnya membalik tanda,
    penguat dalam 2 kata sebelumnya mengalikan bobot. skor = jumlah / (jumlah |bobot| + 1)."""
    total, mutlak, alasan = 0.0, 0.0, []
    for teks, kali in ((judul, 2.0), (ringkas, 1.0)):
        tok = token(teks)
        for i, f, w in _cocok_leksikon(tok, lex):
            if not w:
                continue
            if any(t in PENETRAL for t in tok[max(0, i - 3):i]):
                continue
            neg = any(t in NEGASI for t in tok[max(0, i - 3):i]) and not any(t in NEGASI for t in f.split())
            kuat = max([PENGUAT.get(t, 1.0) for t in tok[max(0, i - 2):i]] + [1.0])
            v = w * kali * kuat * (-1 if neg else 1)
            total += v; mutlak += abs(v)
            alasan.append(("+" if v > 0 else "-") + ("tidak " if neg else "") + f)
    s = total / (mutlak + 1) if mutlak else 0.0
    return round(s, 2), alasan


def label(s, ambang=0.25):
    return "positif" if s >= ambang else "negatif" if s <= -ambang else "netral"


# ---------------------------------------------------------------- emosi
# Kata pemicu di judul, dicocokkan di AWAL kata (\bkata). Satu judul boleh membawa beberapa emosi, masing-masing dihitung sekali.
EMOSI = {
    "marah": "kecam|mengecam|geram|marah|murka|kesal|protes|tuntut|menuntut|desak|mendesak|salahkan|menyalahkan|gugat|menggugat|somasi|demo|unjuk rasa|sesalkan|menyesalkan|lamban|abai|lalai",
    "cemas": "ancam|mengancam|ancaman|waspada|khawatir|cemas|bahaya|berbahaya|darurat|takut|panik|siaga|was-was|kepung|dikepung|mengepung|meluas",
    "sedih": "korban|tewas|meninggal|duka|menderita|kehilangan|mengungsi|pengungsi|sakit|ispa|sesak|balita|hangus|musnah|rugi|kerugian",
    "harapan": "padam|dipadamkan|berhasil|turun|menurun|membaik|hujan|reda|mereda|terkendali|lega|pulih|apresiasi|syukur|bantuan|tuntas|bersih|cerah",
}
EMOSI_EN = {
    "marah": "condemn|criticis|criticiz|anger|angry|outrage|furious|fury|protest|demand|blame|sue[sd]?\\b|lawsuit|accus|negligen|mock|slam|frustrat|slow|excuses|grievance",
    "cemas": "threat|warn|alert|fear|worr|concern|danger|hazardous|emergency|panic|risk|spread|chok|toxic|alarm",
    "sedih": "dead|death|kill|die[sd]?\\b|victim|injur|suffer|loss|displac|evacuat|sick|respiratory|devastat|destroy|grief|mourn",
    "harapan": "extinguish|put out|contain|improv|eases?\\b|easing|drop|declin|rain|rescu|releas|relie|hope|recover|welcome|help|assist|reopen",
}
EMOSI_RE = {k: re.compile(r"\b(" + v.replace("-", " ") + ")") for k, v in EMOSI.items()}
EMOSI_RE_EN = {k: re.compile(r"\b(" + v + ")") for k, v in EMOSI_EN.items()}


def emosi(judul, bhs="id"):
    t = norm(judul)
    return [k for k, r in (EMOSI_RE_EN if bhs == "en" else EMOSI_RE).items() if r.search(t)]


# ---------------------------------------------------------------- pengelompokan cerita
class UF:
    def __init__(self, n):
        self.p = list(range(n))

    def cari(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]; x = self.p[x]
        return x

    def satukan(self, a, b):
        self.p[self.cari(a)] = self.cari(b)


def kelompok(artikel, ambang=0.5, ambang_entitas=0.3, jam=72):
    """Indeks cerita per artikel (leader clustering). Artikel diurut waktu; tiap artikel dibandingkan HANYA dengan artikel
    pertama (pemimpin) tiap cerita yang dimulai <= 72 jam sebelumnya: masuk cerita itu bila Jaccard kata judul >= 0,5,
    atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama; bila tidak ada, ia memulai cerita baru. Berbeda dengan
    single-link, judul harian yang mirip berantai (mis. "ISPA Palembang naik" tiap hari) tidak tergabung jadi satu cerita
    panjang, karena pembandingnya tetap judul pertama dan jendelanya dihitung dari awal cerita."""
    n = len(artikel)
    urut = sorted(range(n), key=lambda i: artikel[i]["_t"])
    df = Counter(t for a in artikel for t in a["_k"])
    pemimpin, idx_tok, idx_ent = [None] * n, defaultdict(list), defaultdict(list)
    batas = dt.timedelta(hours=jam)
    for i in urut:
        a = artikel[i]
        k = sorted(a["_k"], key=lambda t: (df[t], t))
        awal = k[: len(k) - math.ceil(ambang * len(k)) + 1] if k else []
        cek = set()
        for t in awal:
            for j in reversed(idx_tok[t]):
                if a["_t"] - artikel[j]["_t"] > batas:
                    break
                cek.add(j)
        for e in a["_e"]:
            for j in reversed(idx_ent[e]):
                if a["_t"] - artikel[j]["_t"] > batas:
                    break
                cek.add(j)
        terbaik, skor = None, 0
        for j in cek:  # j selalu pemimpin: hanya pemimpin yang masuk indeks
            jc = jaccard(a["_k"], artikel[j]["_k"])
            if (jc >= ambang or (jc >= ambang_entitas and a["_e"] & artikel[j]["_e"])) and jc > skor:
                terbaik, skor = j, jc
        if terbaik is not None:
            pemimpin[i] = terbaik
            continue
        pemimpin[i] = i
        for t in awal:
            idx_tok[t].append(i)
        for e in a["_e"]:
            idx_ent[e].append(i)
    return pemimpin


# ---------------------------------------------------------------- validasi
def metrik(benar, tebak, kelas=("negatif", "netral", "positif")):
    cm = {b: {t: 0 for t in kelas} for b in kelas}
    for b, t in zip(benar, tebak):
        cm[b][t] += 1
    f1 = []
    for c in kelas:
        tp = cm[c][c]; fp = sum(cm[b][c] for b in kelas) - tp; fn = sum(cm[c].values()) - tp
        p = tp / (tp + fp) if tp + fp else 0; r = tp / (tp + fn) if tp + fn else 0
        if tp + fn:  # kelas tanpa contoh benar tidak ikut rata-rata
            f1.append(2 * p * r / (p + r) if p + r else 0)
    return {"n": len(benar), "akurasi": round(sum(b == t for b, t in zip(benar, tebak)) / max(1, len(benar)), 3),
            "f1_makro": round(sum(f1) / max(1, len(f1)), 3), "konfusi": cm}


def validasi(jalur=os.path.join(RAW, "label_uji.json"), geo=None, en=False):
    """Relevansi + sentimen pada label tangan. en=True: label_uji_en.json, aturan & leksikon Inggris."""
    lex_s, lex_r = (SITUASI_EN, RESPONS_EN) if en else (SITUASI, RESPONS)
    if not os.path.exists(jalur):
        return {}
    lab = json.load(open(jalur))
    out = {"sumber": "label tangan pada judul nyata dari jalan pertama; bagian 'latih' dipakai menyetel leksikon, 'uji' tidak disentuh",
           "situasi": {}, "respons": {}}
    rel = [x for x in lab if "relevan" in x]
    if rel:
        tebak = [(relevan_int(x["judul"], geo and geo.cari(x["judul"]), x.get("sumber", "")) if en else
                  relevan(x["judul"] + " " + x.get("ringkas", ""), geo and geo.cari(x["judul"])))[0] for x in rel]
        tp = sum(1 for x, t in zip(rel, tebak) if t and x["relevan"]); fp = sum(1 for x, t in zip(rel, tebak) if t and not x["relevan"])
        fn = sum(1 for x, t in zip(rel, tebak) if not t and x["relevan"])
        out["relevansi"] = {"n": len(rel), "presisi": round(tp / max(1, tp + fp), 3), "recall": round(tp / max(1, tp + fn), 3),
                            "salah_lolos": [x["judul"] for x, t in zip(rel, tebak) if t and not x["relevan"]][:10],
                            "salah_buang": [x["judul"] for x, t in zip(rel, tebak) if not t and x["relevan"]][:10]}
    sen = [x for x in lab if x.get("situasi")]
    for dim, lex in (("situasi", lex_s), ("respons", lex_r)):
        for bag in ("latih", "uji", "semua"):
            xs = [x for x in sen if bag == "semua" or x["bagian"] == bag]
            out[dim][bag] = metrik([x[dim] for x in xs], [label(skor(x["judul"], x.get("ringkas", ""), lex)[0]) for x in xs])
        out[dim]["mayoritas_uji"] = round(Counter(x[dim] for x in sen if x["bagian"] == "uji").most_common(1)[0][1]
                                          / max(1, sum(1 for x in sen if x["bagian"] == "uji")), 3)
    return out


# ---------------------------------------------------------------- gambar (thumbnail ala Google News)
UA_PERAMBAN = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
R_OG = re.compile(r"<meta\b[^>]*?(?:property|name)\s*=\s*[\"'](?:og:image(?::secure_url)?|twitter:image(?::src)?)[\"'][^>]*>", re.I)
R_CONTENT = re.compile(r"content\s*=\s*[\"']([^\"']+)", re.I)


def _get(url, data=None, h=None, maks=400_000):
    q = urllib.request.Request(url, data=data, headers={"User-Agent": UA_PERAMBAN, "Accept-Language": "en,id;q=0.8", **(h or {})})
    with urllib.request.urlopen(q, timeout=8) as f:
        return f.geturl(), f.read(maks).decode("utf-8", "ignore")


def url_asli(gurl, jeda):
    """news.google.com/rss/articles/<id> -> URL penerbit lewat endpoint publik batchexecute (tanpa login)."""
    gid = urllib.parse.urlparse(gurl).path.rsplit("/", 1)[-1]
    _, hal = _get(f"https://news.google.com/rss/articles/{gid}", maks=4_000_000); jeda()
    sg, ts = re.search(r'data-n-a-sg="([^"]+)"', hal), re.search(r'data-n-a-ts="([^"]+)"', hal)
    if not (sg and ts):
        return None
    dalam = json.dumps(["garturlreq", [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1, None, None, None, None, None, 0, 1],
                                       "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0], gid, int(ts.group(1)), sg.group(1)])
    badan = urllib.parse.urlencode({"f.req": json.dumps([[["Fbv4je", dalam, None, "generic"]]])}).encode()
    _, j = _get("https://news.google.com/_/DotsSplashUi/data/batchexecute", badan,
                {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}); jeda()
    u = json.loads(json.loads(j.split("\n\n")[1])[0][2])[1]
    return u if u.startswith("http") else None


def og_gambar(hal, dasar):
    for m in R_OG.finditer(hal):
        c = R_CONTENT.search(m.group(0))
        if c:
            u = urllib.parse.urljoin(dasar, html.unescape(c.group(1).strip()))
            if u.startswith("http://"):
                u = "https://" + u[7:]
            if u.startswith("https://"):
                return u
    return None


def perkaya_gambar(out, batas_detik=150, maks_cerita=40, ambil=True):
    """Pasang `url_asli` + `gambar` (og:image) pada artikel pemimpin cerita yang ditampilkan. Tiap tautan Google News hanya
    diambil sekali (cache data/raw/berita/gambar.json, termasuk yang gagal). Maks 2 permintaan/detik, batas waktu per jalan,
    galat apa pun tidak menggagalkan jalan."""
    p = os.path.join(RAW, "gambar.json")
    try:
        cache = json.load(open(p))
    except Exception:
        cache = {}
    t0, n_baru = time.time(), 0
    jeda = lambda: time.sleep(0.5)
    per_cerita = defaultdict(list)
    for a in sorted(out["artikel"], key=lambda a: a["tgl"]):
        per_cerita[a["cerita"]].append(a)
    urut = [c["id"] for c in out["sorotan"] + out.get("sorotan_nas", []) + out["internasional"]["sorotan"]]
    urut += [c["id"] for c in sorted(out["cerita"], key=lambda c: (-c["n_media"], -c["n"]))]
    urut = list(dict.fromkeys(urut))[:maks_cerita]
    for cid in urut if ambil else []:
        for a in per_cerita[cid][:3]:  # pemimpin dulu, lalu dua artikel berikutnya bila gagal
            if a["url"] in cache:
                if cache[a["url"]].get("gambar"):
                    break
                continue
            if time.time() - t0 > batas_detik:
                break
            e = {"t": dt.datetime.now(WIB).isoformat(timespec="minutes")}
            try:
                e["asli"] = url_asli(a["url"], jeda)
                if e["asli"]:
                    akhir, hal = _get(e["asli"]); jeda()
                    e["gambar"] = og_gambar(hal, akhir)
            except Exception as ex:
                e["galat"] = str(ex)[:80]
            cache[a["url"]], n_baru = e, n_baru + 1
            if e.get("gambar"):
                break
    batas = (dt.datetime.now(WIB) - dt.timedelta(days=JENDELA_HARI + 10)).isoformat()
    cache = {k: v for k, v in cache.items() if v.get("t", "") >= batas}
    gambar_c = {}
    for a in out["artikel"]:
        e = cache.get(a["url"]) or {}
        if e.get("asli"):
            a["url_asli"] = e["asli"]
            a.setdefault("domain", domain(e["asli"]))
        if e.get("gambar"):
            a["gambar"] = e["gambar"]
            gambar_c.setdefault(a["cerita"], e["gambar"])
    for c in out["cerita"] + out["sorotan"] + out.get("sorotan_nas", []) + out["internasional"]["sorotan"]:
        if c["id"] in gambar_c:
            c["gambar"] = gambar_c[c["id"]]
    if ambil:
        try:
            json.dump(cache, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
        except Exception as ex:
            print("cache gambar gagal disimpan", ex, file=sys.stderr)
    return {"baru": n_baru, "cache": len(cache), "dengan_gambar": sum(1 for a in out["artikel"] if a.get("gambar")), "detik": round(time.time() - t0)}


# ---------------------------------------------------------------- utama
def baca_arsip():
    p = os.path.join(RAW, "arsip.json")
    return json.load(open(p))["artikel"] if os.path.exists(p) else []


def gabung(lama, baru, sekarang):
    """Gabung + buang duplikat: tautan sama, atau media sama dengan kumpulan kata judul sama. Buang yang lewat jendela."""
    batas = (sekarang - dt.timedelta(days=JENDELA_HARI)).isoformat()
    lihat, kunci2, out = set(), set(), []
    for a in sorted(lama + baru, key=lambda a: a["tgl"]):
        k2 = (a["sumber"].lower(), " ".join(sorted(kunci_judul(a["judul"]))))
        if a["tgl"] < batas or a["url"] in lihat or k2 in kunci2:
            continue
        lihat.add(a["url"]); kunci2.add(k2); out.append(a)
    return out


def olah(arsip, sekarang, geo):
    fitur = json.load(open(os.path.join(DATA, "kluster.json")))["features"] if os.path.exists(os.path.join(DATA, "kluster.json")) else []
    meta = json.load(open(os.path.join(DATA, "meta.json"))) if os.path.exists(os.path.join(DATA, "meta.json")) else {}
    akhir_data = dt.datetime.fromisoformat(meta.get("data_terakhir", sekarang.isoformat()))
    cakupan = akhir_data - dt.timedelta(days=7)  # kluster.json hanya memuat 7 hari terakhir
    kom_kab, prioritas = defaultdict(list), []
    for f in fitur:
        p = f["properties"]
        if p.get("kab"):
            kom_kab[f"{p['prov']}|{p['kab']}"].append(p)
        if p["level"] == 3:
            prioritas.append(p)

    art = []
    for a in arsip:
        teks, bhs = a["judul"] + " " + a.get("ringkas", ""), bahasa(a)
        if bhs == "id":
            g = geo.cari(teks)
            ok, _ = relevan(teks, g)
        else:  # "Jakarta" di judul asing = pemerintah pusat, bukan Provinsi DKI
            g = geo.cari(re.sub(r"(?i)\bjakarta\b", " ", teks))
            ok = relevan_int(teks, g, a["sumber"])[0] and not R_SOSMED.search(norm(a["sumber"]))
        if not ok:
            continue
        lex_s, lex_r = (SITUASI_EN, RESPONS_EN) if bhs == "en" else (SITUASI, RESPONS)
        s1, al1 = skor(a["judul"], a.get("ringkas", ""), lex_s)
        s2, al2 = skor(a["judul"], a.get("ringkas", ""), lex_r)
        t = dt.datetime.fromisoformat(a["tgl"])
        x = dict({k: v for k, v in a.items() if k != "ed"}, prov=g["prov"], kab=g["kab"], kec=g["kec"], lat=g["lat"], lon=g["lon"], presisi=g["presisi"], topik=topik(teks, bhs),
                 emosi=emosi(a["judul"], bhs), bahasa=bhs, asal=asal(a, bhs),
                 situasi=s1, respons=s2, label_situasi=label(s1), label_respons=label(s2), alasan={"situasi": al1, "respons": al2},
                 kompleks=None, n_kompleks=None, jarak_prioritas_km=None, _t=t, _k=kunci_judul(a["judul"]), _e=set(g["kec"] or g["kab"]))
        if t >= cakupan and fitur:  # hanya artikel di dalam jendela data api yang bisa ditautkan
            ks = []
            for kb in x["kab"]:
                for p in kom_kab.get(kb, []):
                    if p.get("awal") and dt.datetime.fromisoformat(p["awal"]) <= t + dt.timedelta(days=3) and dt.datetime.fromisoformat(p["akhir"]) >= t - dt.timedelta(days=3):
                        ks.append(p)
            ks.sort(key=lambda p: (-p["level"], -p.get("skor", 0)))
            x["kompleks"], x["n_kompleks"] = [p["id"] for p in ks[:20]], len(ks)
            if x["presisi"] in ("kab", "kec") and prioritas:
                x["jarak_prioritas_km"] = round(min(km(x["lat"], x["lon"], p["lat"], p["lon"]) for p in prioritas))
        art.append(x)

    # cerita
    akar = kelompok(art)
    grup = defaultdict(list)
    for x, r in zip(art, akar):
        grup[r].append(x)
    cerita = {}
    for g in grup.values():
        g.sort(key=lambda x: x["_t"])
        cid = "C" + g[0]["id"]
        judul = Counter(norm(x["judul"]) for x in g).most_common(1)[0][0]
        media = list(dict.fromkeys(x["sumber"] for x in g))
        cerita[cid] = {"id": cid, "judul": next(x["judul"] for x in g if norm(x["judul"]) == judul), "n": len(g), "n_media": len(media),
                       "media": media[:30], "awal": g[0]["tgl"], "akhir": g[-1]["tgl"],
                       "prov": list(dict.fromkeys(p for x in g for p in x["prov"])),
                       "kab": list(dict.fromkeys(k for x in g for k in x["kab"]))[:10],
                       "topik": [t for t, _ in Counter(t for x in g for t in x["topik"]).most_common(3)],
                       "situasi": round(sum(x["situasi"] for x in g) / len(g), 2), "respons": round(sum(x["respons"] for x in g) / len(g), 2)}
        gi = [x for x in g if x["asal"] == "internasional"]
        cerita[cid].update(n_int=len(gi), media_int=list(dict.fromkeys(x["sumber"] for x in gi))[:30],
                           asal="internasional" if 2 * len(gi) >= len(g) else "nasional")
        for x in g:
            x["cerita"] = cid

    hari = lambda x: x["tgl"][:10]
    t7, t72 = sekarang - dt.timedelta(days=7), sekarang - dt.timedelta(hours=72)
    rata = lambda xs, k: round(sum(x[k] for x in xs) / len(xs), 3) if xs else None

    per_hari = defaultdict(list)
    for x in art:
        per_hari[hari(x)].append(x)
    LBL = ("negatif", "netral", "positif")
    ring = lambda xs: {"n": len(xs), "situasi_n": [sum(x["label_situasi"] == l for x in xs) for l in LBL],
                       "respons_n": [sum(x["label_respons"] == l for x in xs) for l in LBL],
                       "emosi": dict(Counter(e for x in xs for e in x["emosi"]))}
    harian = {}
    for d, xs in sorted(per_hari.items()):
        xi = [x for x in xs if x["asal"] == "internasional"]
        harian[d] = {**ring(xs), "cerita": len({x["cerita"] for x in xs}), "situasi_rata": rata(xs, "situasi"),
                     "respons_rata": rata(xs, "respons"), "per_topik": dict(Counter(t for x in xs for t in x["topik"])),
                     "n_nas": len(xs) - len(xi), "n_int": len(xi)}
        if xi:
            harian[d]["intl"] = {**ring(xi), "cerita": len({x["cerita"] for x in xi}), "situasi_rata": rata(xi, "situasi"),
                                 "respons_rata": rata(xi, "respons"), "per_topik": dict(Counter(t for x in xi for t in x["topik"]))}
    prov_harian = defaultdict(dict)
    for d, xs in per_hari.items():
        for kode in {p for x in xs for p in x["prov"]}:
            prov_harian[kode][d] = ring([x for x in xs if kode in x["prov"]])

    prov = {}
    for kode in PROVINSI:
        xs = [x for x in art if kode in x["prov"]]
        x7 = [x for x in xs if x["_t"] >= t7]
        if xs:
            prov[kode] = {"n": len(xs), "n7": len(x7), "situasi": rata(x7, "situasi"), "respons": rata(x7, "respons"),
                          "topik": dict(Counter(t for x in x7 for t in x["topik"]).most_common()), "terakhir": max(x["tgl"] for x in xs)}

    kab = defaultdict(lambda: [0, 0])
    for x in art:
        for k in x["kab"]:
            kab[k][0] += 1; kab[k][1] += x["_t"] >= t7
    media = [{"sumber": s, "n": n} for s, n in Counter(x["sumber"] for x in art).most_common(30)]
    dom = {}
    for x in art:
        if x.get("domain"):
            dom.setdefault(x["sumber"], x["domain"])
    def daftar_media(xs, k=30):
        n7 = Counter(x["sumber"] for x in xs if x["_t"] >= t7)
        return [{"sumber": s, "n": n, "n7": n7[s], "domain": dom.get(s)} for s, n in Counter(x["sumber"] for x in xs).most_common(k)]
    a_int = [x for x in art if x["asal"] == "internasional"]

    # lonjakan: hari dengan jumlah > rata-rata + 2 sd dari 14 hari sebelumnya (minimal 5 artikel), per provinsi + nasional
    lonjakan = []
    hari_semua = [(sekarang - dt.timedelta(days=i)).date().isoformat() for i in range(JENDELA_HARI, -1, -1)]
    awal_data = min((hari(x) for x in art), default=sekarang.date().isoformat())
    for kode in ["ID"] + list(PROVINSI):
        c = Counter(hari(x) for x in art if kode == "ID" or kode in x["prov"])
        if not c:
            continue
        for i, d in enumerate(hari_semua):
            if i < 14 or hari_semua[i - 14] < awal_data:
                continue
            seb = [c[hari_semua[j]] for j in range(i - 14, i)]
            m = sum(seb) / 14; sd = math.sqrt(sum((v - m) ** 2 for v in seb) / 14)
            if c[d] >= 5 and c[d] > m + 2 * sd:
                lonjakan.append({"prov": kode, "tgl": d, "n": c[d], "rata14": round(m, 1), "sd14": round(sd, 1)})

    sorotan = sorted((c for c in cerita.values() if dt.datetime.fromisoformat(c["akhir"]) >= t72), key=lambda c: (-c["n_media"], -c["n"]))[:10]
    sorotan_nas = sorted((c for c in cerita.values() if c["asal"] == "nasional" and dt.datetime.fromisoformat(c["akhir"]) >= t72),
                         key=lambda c: (-c["n_media"], -c["n"]))[:10]
    sorotan_int = sorted((c for c in cerita.values() if c["n_int"] and dt.datetime.fromisoformat(c["akhir"]) >= t7),
                         key=lambda c: (-len(c["media_int"]), -c["n_int"]))[:10]
    prov_int = {}
    for kode in PROVINSI:
        xs = [x for x in a_int if kode in x["prov"]]
        if xs:
            prov_int[kode] = {"n": len(xs), "n7": sum(x["_t"] >= t7 for x in xs), "situasi": rata(xs, "situasi"),
                              "media": [s for s, _ in Counter(x["sumber"] for x in xs).most_common(5)]}
    internasional = {"n": len(a_int), "n7": sum(x["_t"] >= t7 for x in a_int), "n_media": len({x["sumber"] for x in a_int}),
                     "bahasa": dict(Counter(x["bahasa"] for x in a_int)), "media": daftar_media(a_int, 20),
                     "sorotan": sorotan_int, "prov": prov_int,
                     "tanpa_lokasi": sum(not x["prov"] for x in a_int)}

    kab7 = {k for k, v in kab.items() if v[1]}
    celah_kab = defaultdict(list)
    for p in prioritas:
        if p.get("kab") and f"{p['prov']}|{p['kab']}" not in kab7:
            celah_kab[f"{p['prov']}|{p['kab']}"].append(p)
    celah = sorted(({"kab": k, "prov": k[:2], "kompleks": [p["id"] for p in sorted(ps, key=lambda p: p.get("peringkat", 9e9))][:20],
                     "n_prioritas": len(ps), "luas_ha": round(sum(p.get("luas", 0) for p in ps))} for k, ps in celah_kab.items()),
                   key=lambda c: -c["n_prioritas"])

    # berita tanpa titik panas: artikel kejadian 4 hari terakhir (jendela +-3 hari tercakup data api) di kabupaten tanpa kompleks aktif
    tanpa, lihat = [], set()
    for x in sorted(art, key=lambda x: x["_t"], reverse=True):
        if x["_t"] >= akhir_data - dt.timedelta(days=4) and "kejadian" in x["topik"] and x["kab"] and x["n_kompleks"] == 0 and x["cerita"] not in lihat:
            lihat.add(x["cerita"])
            tanpa.append({"id": x["id"], "judul": x["judul"], "sumber": x["sumber"], "url": x["url"], "tgl": x["tgl"], "kab": x["kab"], "cerita": x["cerita"]})

    art.sort(key=lambda x: x["_t"], reverse=True)
    # keluar: 1.500 terbaru + 400 internasional terbaru + artikel di balik tiap lonjakan (maks 15) dan tiap cerita sorotan (maks 30)
    pilih = {x["id"] for x in art[:MAKS_ARTIKEL]} | {x["id"] for x in a_int[:400]}
    for l in lonjakan:
        pilih |= {x["id"] for x in [x for x in art if hari(x) == l["tgl"] and (l["prov"] == "ID" or l["prov"] in x["prov"])][:15]}
    sorot, anggota = {c["id"] for c in sorotan + sorotan_nas + sorotan_int}, defaultdict(list)
    for x in art:
        if x["cerita"] in sorot and len(anggota[x["cerita"]]) < 30:
            anggota[x["cerita"]].append(x["id"])
    pilih |= {i for v in anggota.values() for i in v}
    media_nas = daftar_media([x for x in art if x["asal"] == "nasional"])
    keluar = [x for x in art if x["id"] in pilih]
    for x in art:
        for k in ("_t", "_k", "_e"):
            x.pop(k, None)
    dipakai = {x["cerita"] for x in keluar} | sorot
    return {"artikel": keluar, "cerita": [c for c in cerita.values() if c["id"] in dipakai], "harian": harian, "prov": prov,
            "prov_harian": dict(prov_harian), "kab": dict(kab), "media": media, "media_nas": media_nas,
            "lonjakan": lonjakan, "sorotan": sorotan, "sorotan_nas": sorotan_nas, "internasional": internasional,
            "celah": celah, "tanpa_api": tanpa[:100], "_semua": art, "_n_cerita": len(cerita), "_cakupan": cakupan.isoformat()}


METODE = {
    "sumber": "Google News RSS (hl=id, gl=ID), kueri umum + 'karhutla <provinsi>' untuk 9 provinsi prioritas + 'kebakaran hutan <provinsi>' untuk 38 provinsi, when:7d, ~1 permintaan/detik. Hanya judul dan cuplikan RSS; halaman artikel tidak dibuka.",
    "arsip": f"Arsip bergulir {JENDELA_HARI} hari. Duplikat dibuang bila tautannya sama atau media yang sama memuat judul berkata-kata sama.",
    "relevansi": "Lolos bila memuat frasa karhutla (karhutla, kebakaran hutan/lahan/gambut, lahan terbakar, kabut asap, titik api/panas, hotspot, water bombing, Manggala Agni, pembakar lahan, sekat kanal, MPA), atau kata api + kata lanskap (hutan, lahan, hektare, ilalang) tanpa kata bangunan/kendaraan (rumah, pasar, gedung, kapal, mobil, pabrik...). Berita negara lain dibuang kecuali menyebut Indonesia, asap lintas batas, atau tempat di Indonesia.",
    "geocoding": "Nama provinsi, kabupaten/kota dan kecamatan dicocokkan di judul+cuplikan (frasa terpanjang dulu), termasuk singkatan (Kalteng, OKI, Inhil, Kotim...). Kabupaten bernama sungai/kata umum (Kapuas, Siak, Landak...) dan nama yang dipakai di lebih dari satu provinsi hanya diterima bila provinsinya juga disebut. Kecamatan hanya diterima bila provinsinya (atau kabupatennya) disebut, atau ditulis 'Kecamatan X' dan namanya unik. Titik = sentroid kecamatan; bila hanya kabupaten/provinsi, rata-rata sentroid kecamatan berbobot luas.",
    "cerita": "Artikel dalam 72 jam dikelompokkan jadi satu cerita bila kemiripan kata judul (Jaccard) >= 0,5, atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama.",
    "tautan_api": "Untuk artikel di dalam jendela data api 7 hari: kompleks di kabupaten yang sama yang aktif dalam +-3 hari dari terbit (maks. 20 id, urut level), dan jarak ke kompleks prioritas terdekat (hanya bila lokasi setingkat kabupaten/kecamatan).",
    "topik": "Multi-label dengan aturan kata kunci: kejadian (bakar, api, meluas, titik api), asap_kesehatan (kabut asap, ISPA, kualitas udara, sekolah libur/daring, masker), penanganan (pemadaman, water bombing, satgas, Manggala Agni, TNI/Polri, BPBD, modifikasi cuaca), hukum (tersangka, ditangkap, disegel, korporasi, gugatan, sanksi), kebijakan_anggaran (status siaga/tanggap darurat, anggaran, instruksi, rakor, presiden/menteri/gubernur), dampak (korban jiwa, penerbangan, ekonomi, satwa, sekolah), cuaca_iklim (El Nino, kemarau, hujan, BMKG), pencegahan_restorasi (sekat kanal, MPA, patroli, edukasi, restorasi, pembasahan).",
    "sentimen": "Dua skor leksikon buatan sendiri, -1..1. Situasi: memburuk (meluas, bertambah, darurat, tewas, tidak sehat) vs membaik (padam, terkendali, berkurang, hujan turun, membaik). Respons: nada terhadap penanganan/pemerintah/perusahaan, positif (berhasil, sigap, apresiasi, efektif, ditangkap, disegel) vs negatif (lamban, gagal, kritik, kecam, tidak siap, abai, lalai, gugatan). Judul berbobot 2x cuplikan; 'tidak/tak/belum/bukan/tanpa' dalam 3 kata sebelumnya membalik tanda; 'sangat/makin/semakin/kian' mengalikan 1,5. Skor = jumlah/(jumlah mutlak + 1); positif >= 0,25, negatif <= -0,25. 'alasan' memuat kata yang cocok. InSet tidak dipakai karena repositorinya tanpa lisensi.",
    "lonjakan": "Hari ketika jumlah artikel suatu provinsi (atau nasional, 'ID') > rata-rata + 2 simpangan baku 14 hari sebelumnya, minimal 5 artikel.",
    "celah": "Kompleks prioritas (level 3) di kabupaten yang tidak muncul di berita mana pun 7 hari terakhir: api tanpa berita.",
    "tanpa_api": "Artikel kejadian 4 hari terakhir dengan lokasi kabupaten tetapi tanpa kompleks aktif +-3 hari di kabupaten itu: kemungkinan api kecil/tak terdeteksi satelit, berita lama, atau salah lokasi.",
    "internasional": "Kueri tambahan di edisi Google News Inggris (AS, Singapura, Malaysia, Australia, Inggris) dan Melayu (Malaysia): 'Indonesia forest fires', 'Indonesia haze', 'Kalimantan/Sumatra fires', 'Riau haze', 'peatland fires Indonesia', 'transboundary haze Indonesia', 'jerebu Indonesia' dll. Bahasa ditebak dari kata fungsi judul (the/of/in vs yang/di/dan). Asal 'internasional' = judul Inggris/Melayu dari media di luar Indonesia; media Indonesia berbahasa Inggris (Antara, Tempo English, Jakarta Post/Globe, Kompas) tetap 'nasional'. Relevansi judul asing: harus memuat kata api/asap (wildfire, forest fire, haze, hotspot, jerebu...) DAN menyebut Indonesia/Borneo/Sumatra/Kalimantan/lintas batas atau provinsi Indonesia; kebakaran negara lain dan berita kualitas udara Singapura/Malaysia tanpa kaitan Indonesia dibuang. Nama provinsi Inggris (South Sumatra, Central Kalimantan, W Kalimantan...) dan '<kabupaten> regency' ikut dipetakan. Sentimen dan topik memakai leksikon Inggris tersendiri dengan aturan negasi yang sama; judul Melayu memakai leksikon Indonesia + kata Melayu (jerebu, cuai, disaman, merosot, pulih...).",
    "emosi": {"cara": "Kata pemicu di judul dicocokkan di awal kata; satu judul bisa membawa beberapa emosi, masing-masing dihitung sekali. Judul Inggris memakai padanan Inggris.",
              "id": EMOSI, "en": EMOSI_EN},
    "gambar": "Untuk cerita yang ditampilkan (maks. 40 per jalan) tautan Google News diurai ke URL penerbit lewat endpoint publik news.google.com, lalu og:image/twitter:image halaman itu dibaca. Hasil disimpan sekali di cache; maks. 2 permintaan/detik, batas 150 detik per jalan. Ikon media dari domain sumber RSS.",
    "batas": "Google News RSS maksimal 100 item per kueri dan bukan arsip lengkap; cuplikan biasanya hanya judul, jadi sentimen praktis dari judul saja; leksikon bias ke bahasa berita arus utama dan tidak memahami sarkasme atau konteks panjang.",
}


def main(isi_hari=0, ambil_rss=True):
    t0 = time.time()
    os.makedirs(RAW, exist_ok=True)
    sekarang = dt.datetime.now(WIB)
    p_pusat = os.path.join(RAW, "pusat.json")
    if os.path.exists(p_pusat):
        pusat = json.load(open(p_pusat))
    else:
        pusat = Geo.hitung_pusat()
        json.dump(pusat, open(p_pusat, "w"), ensure_ascii=False, separators=(",", ":"))
    geo = Geo(pusat)
    arsip = baca_arsip()
    daftar = [q for q, _ in kueri()]
    if not arsip and not isi_hari:
        isi_hari = JENDELA_HARI  # cache hilang: bangun ulang arsip sekali
    baru = panen([q + " when:7d" for q in daftar] + [(ed, q + " when:7d") for ed, q in KUERI_INT]) if ambil_rss else []
    if isi_hari:
        umum = KUERI_UMUM + [f"karhutla {PROVINSI[p]}" for p in PRIORITAS]
        for mulai in range(isi_hari, 7, -7):
            a, b = (sekarang - dt.timedelta(days=mulai)).date(), (sekarang - dt.timedelta(days=max(mulai - 7, 6))).date()
            baru += panen([f"{q} after:{a} before:{b}" for q in umum] + [(ed, f"{q} after:{a} before:{b}") for ed, q in KUERI_INT[:4]])
            print(f"isi {a}..{b}: {len(baru)} item", file=sys.stderr)
    n_ambil = len(baru)
    # arsip menyimpan SEMUA item (relevansi dihitung ulang tiap jalan, jadi perbaikan aturan berlaku mundur)
    arsip = gabung(arsip, baru, sekarang)
    with open(os.path.join(RAW, "arsip.json"), "w") as f:
        json.dump({"diperbarui": sekarang.isoformat(timespec="minutes"), "artikel": arsip}, f, ensure_ascii=False, separators=(",", ":"))
    h = olah(arsip, sekarang, geo)
    semua = h.pop("_semua"); n_cerita = h.pop("_n_cerita"); cakupan = h.pop("_cakupan")
    try:
        gb = perkaya_gambar(h, ambil=ambil_rss)
    except Exception as e:  # thumbnail hanya hiasan: jangan gagalkan jalan
        gb = {"galat": str(e)[:120]}
    print("gambar", gb, file=sys.stderr)
    v = validasi(geo=geo)
    if v:
        v["inggris"] = validasi(os.path.join(RAW, "label_uji_en.json"), geo=geo, en=True)
    out = {"dibuat": sekarang.isoformat(timespec="minutes"), "jendela_hari": JENDELA_HARI, "kueri": daftar,
           "kueri_int": [f"{q} [{ed}]" for ed, q in KUERI_INT], **h, "validasi": v, "metode": METODE,
           "ringkasan": {"diambil": n_ambil, "arsip": len(arsip), "artikel": len(semua), "cerita": n_cerita,
                         "berlokasi": round(sum(1 for x in semua if x["prov"]) / max(1, len(semua)), 3),
                         "berlokasi_kab": round(sum(1 for x in semua if x["kab"]) / max(1, len(semua)), 3),
                         "internasional": sum(x["asal"] == "internasional" for x in semua), "gambar": gb,
                         "cakupan_api_sejak": cakupan, "detik": round(time.time() - t0)}}
    with open(os.path.join(DATA, "berita.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(out["ringkasan"]), f"{os.path.getsize(os.path.join(DATA, 'berita.json')) / 1e6:.2f} MB", file=sys.stderr)


def sampel(n=120, seed=7):
    """Cetak judul acak dari arsip (yang lolos) dan dari panen mentah (yang dibuang) untuk dilabeli tangan."""
    geo = Geo(json.load(open(os.path.join(RAW, "pusat.json"))))
    arsip = baca_arsip()
    random.Random(seed).shuffle(arsip)
    for a in arsip[:n]:
        print(json.dumps({"judul": a["judul"], "ringkas": a["ringkas"]}, ensure_ascii=False))


def uji():
    assert norm("Karhutla di Palangka Raya, Kalteng!") == "karhutla di palangka raya kalteng"
    assert jaccard({"a", "b"}, {"b", "c"}) == 1 / 3
    # negasi & penguat
    assert skor("Api belum padam", "", SITUASI)[0] < 0, skor("Api belum padam", "", SITUASI)
    assert skor("Api berhasil dipadamkan", "", SITUASI)[0] > 0
    assert skor("Kebakaran tidak meluas", "", SITUASI)[0] > 0
    assert skor("Tidak ada korban jiwa", "", SITUASI)[0] > 0
    assert skor("Asap makin pekat", "", SITUASI)[0] < skor("Asap pekat", "", SITUASI)[0] < 0
    assert label(skor("Pemerintah dikritik lamban tangani karhutla", "", RESPONS)[0]) == "negatif"
    assert label(skor("Status tanggap darurat karhutla ditetapkan", "", RESPONS)[0]) == "netral"
    assert label(skor("Polisi tangkap pembakar lahan", "", RESPONS)[0]) == "positif"
    assert "-meluas" in skor("Karhutla meluas", "", SITUASI)[1]
    assert skor("Cegah karhutla meluas, helikopter dikerahkan", "", SITUASI)[0] == 0
    # relevansi
    assert relevan("Kebakaran hutan di Seruyan meluas")[0]
    assert not relevan("Kebakaran rumah di Pasar Minggu hanguskan 5 kios")[0]
    assert not relevan("Kebakaran hutan Los Angeles tewaskan 10 orang")[0]
    assert relevan("Malaysia keluhkan asap kiriman dari Indonesia")[0]
    assert relevan("Kabut Asap Selimuti Singapura, Polusi Memburuk")[0]
    assert relevan("Pekanbaru Dikepung Asap, Penderita ISPA Mulai Meningkat")[0]
    assert not relevan("Peta kebakaran hutan Malanje")[0]
    assert not relevan("Dinkes Kota Jambi Pantau Kasus ISPA Harian")[0]  # ISPA tanpa kaitan asap: tidak
    assert relevan("Lahan seluas 10 hektare terbakar di Kampar")[0]
    assert not relevan("Harga cabai naik di pasar")[0]
    # geocoder
    g = Geo()
    r = g.cari("Karhutla di Kabupaten Pulang Pisau, Kalteng")
    assert r["prov"] == ["62"] and r["kab"] == ["62|Pulang Pisau"] and r["presisi"] == "kab", r
    r = g.cari("Kebakaran lahan di OKI Sumsel meluas")
    assert r["kab"] == ["16|Ogan Komering Ilir"], r
    assert g.cari("Asap selimuti Palangka Raya")["kab"] == ["62|Kota Palangkaraya"]
    assert g.cari("Banjir di Kapuas")["kab"] == []  # nama sungai tanpa provinsi: ditolak
    assert g.cari("Karhutla di Kapuas, Kalimantan Tengah")["kab"] == ["62|Kapuas"]
    assert g.cari("Hujan di Jambi")["prov"] == ["15"] and g.cari("Hujan di Jambi")["kab"] == []
    assert g.cari("Pemadaman di Seruyan Hilir, Seruyan, Kalteng")["kec"] == ["62|Seruyan|Seruyan Hilir"]
    r = g.cari("Lahan terbakar di Kecamatan Pangkalan Kerinci")
    assert r["kec"] and r["kec"][0].startswith("14|Pelalawan"), r
    assert g.cari("Polisi Inhil tangkap pembakar lahan")["kab"] == ["14|Indragiri Hilir"]
    assert g.cari("Karhutla di Indonesia")["presisi"] is None
    # internasional: bahasa, asal, relevansi, geocoder & sentimen Inggris
    assert bahasa({"judul": "Haze from Indonesia chokes Singapore as fires rage", "ed": "en-US"}) == "en"
    assert bahasa({"judul": "Jerebu: Indonesia belum beri maklum balas", "ed": "ms-MY"}) == "ms"
    assert bahasa({"judul": "Karhutla di Riau meluas"}) == "id"
    assert asal({"sumber": "Reuters"}, "en") == "internasional" and asal({"sumber": "ANTARA News"}, "en") == "nasional"
    assert relevan_int("Malaysia closes schools due to haze from Indonesia forest fires")[0]
    assert not relevan_int("Canadian wildfires force thousands to flee")[0]
    assert not relevan_int("Malaysia closes schools in capital due to haze")[0]  # tanpa kaitan Indonesia: tidak
    assert not relevan_int("Hundreds Flee as Belgium Battles Wildfire at German Border", None, "Tempo.co English")[0]
    assert not relevan_int("Fire destroys factory warehouse in Kalimantan")[0]
    assert relevan_int("Govt accelerates firefighting across 107,000 ha of land", None, "ANTARA News")[0]
    assert g.cari("Fires spread in South Sumatra and W Kalimantan")["prov"] == ["16", "61"]
    assert g.cari("Fires in Ogan Komering Ilir regency")["kab"] == ["16|Ogan Komering Ilir"]
    assert label(skor("Haze worsens as fires rage in Indonesia", "", SITUASI_EN)[0]) == "negatif"
    assert label(skor("Fires extinguished, air quality improves", "", SITUASI_EN)[0]) == "positif"
    assert skor("Fires not contained", "", SITUASI_EN)[0] < 0
    assert label(skor("Indonesia accused of gross negligence in wildfires lawsuit", "", RESPONS_EN)[0]) == "negatif"
    assert label(skor("Police arrest 72 suspects over forest fires", "", RESPONS_EN)[0]) == "positif"
    # emosi: judul tanpa kata pemicu ditolak; judul beremosi ganda dihitung sekali per emosi
    assert emosi("Harga cabai naik di pasar") == []
    assert emosi("Warga kecam pemerintah, korban ISPA bertambah, korban tewas") == ["marah", "sedih"]
    assert emosi("Api berhasil dipadamkan, hujan turun") == ["harapan"]
    assert set(emosi("Residents sue government as toxic haze threatens", "en")) == {"marah", "cemas"}
    assert emosi("Indonesia moves east", "en") == []  # "east" bukan "eases"
    # pengelompokan
    T = dt.datetime(2026, 10, 1, tzinfo=WIB)
    mk = lambda j, h, e=(): {"_t": T + dt.timedelta(hours=h), "_k": kunci_judul(j), "_e": set(e)}
    a = [mk("Karhutla di Seruyan meluas hingga 500 hektare", 0), mk("Karhutla Seruyan meluas capai 500 hektare", 5),
         mk("Karhutla di Seruyan meluas hingga 500 hektare", 100), mk("Polisi tangkap pembakar lahan di Siak", 1)]
    c = kelompok(a)
    assert c[0] == c[1] and c[0] != c[2] and c[0] != c[3], c
    b = [mk("Water bombing dikerahkan di Pulang Pisau", 0, ["62|Pulang Pisau"]), mk("Helikopter water bombing padamkan api Pulang Pisau", 3, ["62|Pulang Pisau"])]
    assert len(set(kelompok(b))) == 1
    # metrik
    m = metrik(["positif", "negatif", "netral", "netral"], ["positif", "netral", "netral", "netral"])
    assert m["akurasi"] == 0.75 and m["konfusi"]["negatif"]["netral"] == 1
    # akurasi sentimen pada label tangan tidak boleh turun di bawah lantai
    v = validasi(geo=g)
    if v:
        for dim in ("situasi", "respons"):
            print(dim, {k: (v[dim][k]["akurasi"], v[dim][k]["f1_makro"]) for k in ("latih", "uji", "semua")}, "mayoritas", v[dim]["mayoritas_uji"])
        print("relevansi", {k: v["relevansi"][k] for k in ("n", "presisi", "recall")})
        assert v["situasi"]["uji"]["akurasi"] >= 0.6 and v["respons"]["uji"]["akurasi"] >= 0.6, "akurasi sentimen turun"
        assert v["relevansi"]["presisi"] >= 0.85, "presisi relevansi turun"
    ve = validasi(os.path.join(RAW, "label_uji_en.json"), geo=g, en=True)
    if ve:
        for dim in ("situasi", "respons"):
            print("en", dim, {k: (ve[dim][k]["n"], ve[dim][k]["akurasi"], ve[dim][k]["f1_makro"]) for k in ("latih", "uji")}, "mayoritas", ve[dim]["mayoritas_uji"])
        print("en relevansi", {k: ve["relevansi"][k] for k in ("n", "presisi", "recall")})
        for dim in ("situasi", "respons"):
            assert ve[dim]["uji"]["akurasi"] > ve[dim]["mayoritas_uji"], f"sentimen Inggris {dim} tidak lebih baik dari menebak label terbanyak"
        assert ve["relevansi"]["presisi"] >= 0.9, "presisi relevansi Inggris turun"
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif sys.argv[1:2] == ["ulang"]:  # olah ulang arsip tanpa mengambil RSS (setel aturan)
        main(ambil_rss=False)
    elif sys.argv[1:2] == ["sampel"]:
        sampel()
    elif sys.argv[1:2] == ["isi"]:
        main(int(sys.argv[2]) if len(sys.argv) > 2 else JENDELA_HARI)
    else:
        main()
