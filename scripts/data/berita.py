"""Bot berita karhutla: Google News RSS -> public/data/berita.json + arsip bergulir data/raw/berita/arsip.json.

Pakai:  python3 scripts/data/berita.py          ambil 7 hari terakhir, gabung ke arsip, tulis berita.json
        python3 scripts/data/berita.py isi 120  isi arsip mundur 120 hari (jendela 7 hari, kueri umum + 9 prioritas)
        python3 scripts/data/berita.py uji      uji fungsi murni + akurasi sentimen pada label_uji.json
        python3 scripts/data/berita.py ulang    olah ulang arsip tanpa mengambil RSS
        python3 scripts/data/berita.py sampel   cetak judul acak untuk dilabeli tangan
        python3 scripts/data/berita.py periksa  kesepakatan label manusia (periksa_manusia.json) vs label AI

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
    "gagap": -2, "kartu merah": -2, "dinanti": -1, "minta maaf": -1,
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
# "padam" setelah kata kelistrikan berarti listrik mati (memburuk), bukan api padam: jangan dihitung membaik
BUKAN_API = {"listrik", "lampu", "pln", "aliran", "daya", "jaringan"}
# "hilang" baru berarti membaik bila yang hilang api/asap/titik panas ("asap hilang"), bukan "sinyal hilang", "nyawa hilang"
HILANG_BAIK = {"api", "asap", "kabut", "titik", "hotspot", "kebakaran", "karhutla", "panas"}
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
            if f.startswith("padam") and any(t in BUKAN_API for t in tok[max(0, i - 2):i]):
                continue
            if f == "hilang" and not any(t in HILANG_BAIK for t in tok[max(0, i - 3):i]):
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


# ---------------------------------------------------------------- model nada (judul Indonesia)
# Leksikon saja tidak lebih baik dari menebak label terbanyak untuk 'situasi' (uji 0,745 = mayoritas 0,745, Okt 2026).
# Di sini: Naive Bayes dan regresi logistik (stdlib, deterministik) pada kata + bigram + akar kata kasar + penanda negasi +
# fitur leksikon, dilatih ulang tiap jalan dari label tangan (label_uji.json, manusia) + label_ai.json (asisten AI, lihat
# PEDOMAN-LABEL.md). Model dipilih dengan validasi silang 5 lipat pada bagian 'latih' (F1 makro), lalu diuji sekali pada
# bagian 'uji' dengan selang bootstrap. Bahasa Inggris/Melayu tetap memakai leksikon.
KELAS = ("negatif", "netral", "positif")
R_AKAR = re.compile(r"^(meng|meny|mem|men|me|di|ter|ber|pe|per|ke|se)?(.{3,}?)(kan|an|nya|i|lah)?$")


def fitur_nada(judul):
    tok, f, sisa_neg, sisa_cg = token(judul), set(), 0, 0
    for i, t in enumerate(tok):
        if t in NEGASI:
            sisa_neg = 3; f.add("NEG"); continue
        if t in PENETRAL:
            sisa_cg = 3; f.add("CEGAH"); continue
        awal = "n_" if sisa_neg else "c_" if sisa_cg else ""
        sisa_neg, sisa_cg = max(0, sisa_neg - 1), max(0, sisa_cg - 1)
        if t.isdigit():
            t = "#"
        f.add(awal + t)
        f.add(awal + "~" + R_AKAR.match(t).group(2) if len(t) > 4 else awal + t)
        if i:
            f.add(tok[i - 1] + "_" + t)
    for nama, lex in (("S", SITUASI), ("R", RESPONS)):
        s, al = skor(judul, "", lex)
        f.add(f"L{nama}{max(-2, min(2, round(s * 2.5)))}")
        f.update(f"A{nama}{a}" for a in al)
    return f


class NB:
    """Naive Bayes multinomial atas fitur biner (binarized MNB)."""
    def __init__(self, alfa=0.5):
        self.alfa = alfa

    def latih(self, X, y):
        self.n = Counter(y); self.c = {k: Counter() for k in KELAS}
        for f, k in zip(X, y):
            self.c[k].update(f)
        self.v = {t for k in KELAS for t in self.c[k]}
        self.tot = {k: sum(self.c[k].values()) for k in KELAS}
        return self

    def proba(self, f):
        N, V = sum(self.n.values()), len(self.v) + 1
        lp = {k: math.log((self.n[k] + 1) / (N + 3)) + sum(math.log((self.c[k][t] + self.alfa) / (self.tot[k] + self.alfa * V))
                                                              for t in f if t in self.v) for k in KELAS}
        m = max(lp.values()); e = {k: math.exp(v - m) for k, v in lp.items()}; z = sum(e.values())
        return {k: e[k] / z for k in KELAS}


class LR:
    """Regresi logistik multinomial, SGD dengan L2, urutan acak berbenih (deterministik)."""
    def __init__(self, l2=1e-3, seimbang=False, epoch=25, lr=0.3):
        self.l2, self.seimbang, self.epoch, self.lr = l2, seimbang, epoch, lr

    def latih(self, X, y):
        self.w = {k: defaultdict(float) for k in KELAS}; self.b = {k: 0.0 for k in KELAS}
        n = Counter(y); bobot = {k: (len(y) / (3 * n[k]) if self.seimbang and n[k] else 1.0) for k in KELAS}
        idx, r = list(range(len(X))), random.Random(13)
        for ep in range(self.epoch):
            r.shuffle(idx); eta = self.lr / (1 + ep * 0.2)
            for i in idx:
                p = self.proba(X[i])
                for k in KELAS:
                    g = (p[k] - (y[i] == k)) * bobot[y[i]]
                    self.b[k] -= eta * g
                    for t in X[i]:
                        self.w[k][t] -= eta * (g + self.l2 * self.w[k][t])
        return self

    def proba(self, f):
        z = {k: self.b[k] + sum(self.w[k].get(t, 0.0) for t in f) for k in KELAS}
        m = max(z.values()); e = {k: math.exp(v - m) for k, v in z.items()}; s = sum(e.values())
        return {k: e[k] / s for k in KELAS}


class Leksikon:
    """Pembanding: leksikon lama, ambang 0,25."""
    def __init__(self, lex):
        self.lex = lex

    def latih(self, X, y):
        return self

    def tebak_judul(self, judul):
        return label(skor(judul, "", self.lex)[0])


def tebak(model, judul):
    if isinstance(model, Leksikon):
        return model.tebak_judul(judul)
    p = model.proba(fitur_nada(judul))
    return max(KELAS, key=lambda k: p[k])


def baca_label():
    """Gabungan label manusia (label_uji.json) dan label AI (label_ai.json). -> [{judul, situasi, respons, bagian, sumber_label, sasaran}]"""
    out = []
    p = os.path.join(RAW, "label_uji.json")
    if os.path.exists(p):
        out += [dict(x, sumber_label="manusia") for x in json.load(open(p)) if x.get("situasi")]
    p = os.path.join(RAW, "label_ai.json")
    if os.path.exists(p):
        out += [dict(x, sumber_label="ai") for x in json.load(open(p))["label"] if x.get("situasi")]
    return out


def bootstrap(benar, tebak_, n=2000, seed=11):
    """Selang 95% (persentil) untuk akurasi, F1 makro, recall per kelas."""
    r, idx, hasil = random.Random(seed), list(range(len(benar))), defaultdict(list)
    for _ in range(n):
        s = [r.choice(idx) for _ in idx]
        m = metrik([benar[i] for i in s], [tebak_[i] for i in s])
        hasil["akurasi"].append(m["akurasi"]); hasil["f1_makro"].append(m["f1_makro"])
        for k in KELAS:
            tot = sum(m["konfusi"][k].values())
            if tot:
                hasil["recall_" + k].append(m["konfusi"][k][k] / tot)
    ci = lambda v: [round(sorted(v)[int(len(v) * .025)], 3), round(sorted(v)[int(len(v) * .975) - 1], 3)]
    return {k: ci(v) for k, v in hasil.items()}


def ringkas_metrik(benar, tebak_):
    m = metrik(benar, tebak_)
    m["recall"] = {k: round(m["konfusi"][k][k] / max(1, sum(m["konfusi"][k].values())), 3) for k in KELAS}
    m["ci95"] = bootstrap(benar, tebak_)
    return m


KANDIDAT = {"leksikon": None, "nb_a0.3": lambda: NB(0.3), "nb_a1": lambda: NB(1.0),
            "lr_l2_1e-3": lambda: LR(1e-3), "lr_l2_1e-3_seimbang": lambda: LR(1e-3, True),
            "lr_l2_1e-2_seimbang": lambda: LR(1e-2, True)}


def latih_nada(lab=None, lipat=5, kandidat=KANDIDAT):
    """-> ({dim: model terpilih}, laporan). Validasi silang pada 'latih', uji sekali pada 'uji'."""
    lab = baca_label() if lab is None else lab
    model, lap = {}, {"n_latih": sum(x["bagian"] == "latih" for x in lab), "n_uji": sum(x["bagian"] == "uji" for x in lab),
                      "n_label_ai": sum(x["sumber_label"] == "ai" for x in lab), "n_label_manusia": sum(x["sumber_label"] == "manusia" for x in lab)}
    if not lab:
        return model, lap
    latih = [x for x in lab if x["bagian"] == "latih"]; uji_ = [x for x in lab if x["bagian"] == "uji"]
    urut = list(range(len(latih))); random.Random(5).shuffle(urut)
    lipatan = [set(urut[i::lipat]) for i in range(lipat)]
    Xl = [fitur_nada(x["judul"]) for x in latih]
    for dim, lex in (("situasi", SITUASI), ("respons", RESPONS)):
        yl = [x[dim] for x in latih]
        cv = {}
        for nama, buat in kandidat.items():
            benar, tb = [], []
            for L in lipatan:
                tr = [i for i in range(len(latih)) if i not in L]
                m = Leksikon(lex) if buat is None else buat().latih([Xl[i] for i in tr], [yl[i] for i in tr])
                benar += [yl[i] for i in sorted(L)]; tb += [tebak(m, latih[i]["judul"]) for i in sorted(L)]
            mm = metrik(benar, tb); cv[nama] = {"akurasi": mm["akurasi"], "f1_makro": mm["f1_makro"]}
        pilih = max(cv, key=lambda k: (cv[k]["f1_makro"], cv[k]["akurasi"]))
        m = Leksikon(lex) if kandidat[pilih] is None else kandidat[pilih]().latih(Xl, yl)
        model[dim] = m
        yu = [x[dim] for x in uji_]
        mayor = Counter(yl).most_common(1)[0][0]
        lk = [Leksikon(lex).tebak_judul(x["judul"]) for x in uji_]
        tb = [tebak(m, x["judul"]) for x in uji_]
        # selisih berpasangan model - mayoritas (bootstrap pada judul yang sama)
        r, idx, d_acc, d_f1 = random.Random(3), list(range(len(yu))), [], []
        for _ in range(1000):
            s = [r.choice(idx) for _ in idx]
            b_ = [yu[i] for i in s]
            a1, a0 = metrik(b_, [tb[i] for i in s]), metrik(b_, [mayor] * len(s))
            d_acc.append(a1["akurasi"] - a0["akurasi"]); d_f1.append(a1["f1_makro"] - a0["f1_makro"])
        q = lambda v: [round(sorted(v)[25], 3), round(sorted(v)[974], 3)]
        lap[dim] = {"cv": cv, "terpilih": pilih, "uji": ringkas_metrik(yu, tb), "leksikon_uji": ringkas_metrik(yu, lk),
                    "mayoritas": {"label": mayor, **{k: v for k, v in ringkas_metrik(yu, [mayor] * len(yu)).items() if k != "konfusi"}},
                    "selisih_vs_mayoritas_ci95": {"akurasi": q(d_acc), "f1_makro": q(d_f1)},
                    "uji_manusia": metrik([x[dim] for x in uji_ if x["sumber_label"] == "manusia"],
                                          [t for x, t in zip(uji_, tb) if x["sumber_label"] == "manusia"])}
    return model, lap


# ---------------------------------------------------------------- pantauan media (keluaran untuk ruang krisis)
# Semua aturan di bawah memakai judul saja dan bisa diaudit: tiap butir membawa judul bukti + tautan.
LEMBAGA = {  # kode -> (nama tampilan, pola pada teks ternormalisasi)
    "PUSAT": ("Presiden & pemerintah pusat", r"\bpresiden\b|\bprabowo\b|\bistana\b|\bmenko\w*|\bkemenko\w*|\bwamenko\b|\bseskab\b|\bmensesneg\b|kepala staf kepresidenan|\bksp\b|pemerintah pusat|\bwapres\b|\bgibran\b|\bmenlu\b|\bkemenlu\b|\b(wa)?mendagri\b|\bkemendagri\b|\bmenhub\b|\bkemenhub\b|\bmenkes\b|\bkemenkes\b|\bbrin\b|\bmenkeu\b|\bkemenkeu\b|\bmentan\b|\bkementan\b|\bkemenkum\b|\bkemhan\b|\bkomdigi\b|\bbakom\b|\bpemerintah\b(?! (provinsi|kabupaten|kota|daerah|desa))"),
    "BNPB": ("BNPB", r"\bbnpb\b"),
    "BPBD": ("BPBD", r"\bbpbd\b|\bbpba\b|\bbpb pk\b"),
    "KEMENHUT": ("Kemenhut / Manggala Agni", r"\bkemenhut\b|kementerian kehutanan|\bmenhut\b|menteri kehutanan|raja juli|\bklhk\b|kementerian lhk|manggala agni|\bb?bksda\b|balai taman nasional"),
    "KLH": ("KLH / BPLH", r"\bklh\b|\bbplh\b|kementerian lingkungan hidup|menteri lh\b|\bmenlh\b|wamen lh|hanif faisol|\bgakkum\b"),
    "BMKG": ("BMKG", r"\bbmkg\b"),
    "TNI": ("TNI", r"\btni\b|\bkodim\b|\bkorem\b|\bdanrem\b|\bdandim\b|\bkodam\b|\bpangdam\b|\bbabinsa\b|\bkoramil\b|\blanud\b|\bkodaeral\b|\blantamal\b|pangkogabwilhan|\bprajurit\b"),
    "POLRI": ("Polri", r"\bpolri\b|\bpolda\b|\bpolres\w*|\bpolsek\b|\bkapolda\b|\bkapolres\w*|\bkapolri\b|\bwakapolri\b|\bbrimob\b|\bsatbrimob\b|bhabinkamtibmas|\bpolisi\b(?! hutan)|kepolisian|\bposubsektor\b|bareskrim"),
    "PEMDA": ("Pemerintah daerah", r"\bpemprov\b|\bpemkab\b|\bpemkot\b|\bpemko\b|\bgubernur\b|\bwagub\b|\bgubri\b|\bbupati\b|wali ?kota|\bpemda\b|pemerintah (provinsi|kabupaten|kota|daerah)|kepala daerah|\bdinkes\b|\bdishut\b|\bdamkar\b|\bdisdamkar\w*|satpol pp|\bsatgas\b|\bal haris\b|herman deru|rudy mas ud|sf hariyanto|ria norsan|agustiar sabran"),
    "DPR": ("DPR / DPRD", r"\bdpr\b|\bdprd\b|\bdpd\b|anggota dewan|\blegislator\b|komisi iv"),
    "PERUSAHAAN": ("Perusahaan / korporasi", r"\bpt\b|\bperusahaan\b|\bkorporasi\b|\bkonsesi\b|\bhti\b|\bgapki\b|sinar mas|\bwilmar\b|asian agri|musim mas"),
    "MALAYSIA_SG": ("Malaysia / Singapura", r"\bmalaysia\b|\bsingapura\b|\bsingapore\b"),
}
LEMBAGA_RE = {k: re.compile(v) for k, (_, v) in LEMBAGA.items()}
PEMERINTAH = {"PUSAT", "BNPB", "BPBD", "KEMENHUT", "KLH", "BMKG", "TNI", "POLRI", "PEMDA"}
R_DITINDAK = re.compile(r"\b(disegel|segel|disidik|diselidiki|penyidikan|tersangka|digugat|gugatan|sanksi|dicabut|dijerat|dituding|diduga|dipidana|didenda|terlibat|penyebab)\b")
R_BAIK_P = re.compile(r"\b(penghargaan|apresiasi|diapresiasi|bantu|bantuan|padamkan|serahkan|salurkan|sinergi)\b")
R_TUNTUT = re.compile(r"\b(minta|meminta|diminta|desak|mendesak|didesak|tuntut|menuntut|dituntut|usul\w*|serukan|ajukan|mengajukan|tagih|menagih)\b")


R_PENILAI = re.compile(r"\b(apresiasi|mengapresiasi|kritik|mengkritik|kecam|mengecam|soroti|menyoroti|desak|mendesak|minta|meminta|tuntut|menuntut|gugat|menggugat|"
                       r"puji|memuji|keluhkan|mengeluhkan|pertanyakan|mempertanyakan|ingatkan|mengingatkan|imbau|mengimbau|tegaskan|menegaskan)\b")


R_DINILAI = re.compile(r"\s+(\w+\s+){0,3}?(diminta|didesak|dikritik|disorot|dituntut|digugat|dikecam|diganjar|dinilai lamban|dinilai belum)\b")
# untuk sikap per lembaga hanya kata bernilai kuat (|bobot| >= 1,5) + hasil penegakan hukum; kata rutin (sinergi, siap, percepat) tidak dihitung
RESPONS_SIKAP = {k: v for k, v in RESPONS.items() if abs(v) >= 1.5 or k in ("tersangka", "ditahan", "diamankan", "divonis", "dihukum", "sanksi")}


def klausa(judul):
    return [k for k in re.split(r"\s*(?:[,;:!?|]| - | – | — )\s*", judul) if k.strip()]


def lembaga_di(teks):
    t = norm(teks)
    return [k for k, r in LEMBAGA_RE.items() if r.search(t)]


def sikap_lembaga(judul, respons_judul=None):
    """{kode: 'negatif'|'netral'|'positif'} untuk tiap lembaga yang disebut judul. Aturan: klausa yang memuat lembaga dinilai
    dengan leksikon respons; perusahaan yang ditindak/digugat = negatif; lembaga yang disebut SESUDAH kata desak/minta di
    klausanya = negatif (sasaran tuntutan); klausa netral pada lembaga di klausa pertama mewarisi nada respons judul."""
    out = {}
    ks = klausa(judul)
    nj = norm(judul)
    pertama = min(((r.search(nj).start(), k) for k, r in LEMBAGA_RE.items() if r.search(nj)), default=(0, None))[1]
    for i, k in enumerate(ks):
        t = norm(k)
        for kode, r in LEMBAGA_RE.items():
            m = r.search(t)
            if not m:
                continue
            s = skor(k, "", RESPONS_SIKAP)[0]
            v = label(s)
            if kode == "PERUSAHAAN":
                v = "negatif" if R_DITINDAK.search(t) or s <= -0.25 else "positif" if R_BAIK_P.search(t) or s >= 0.25 else "netral"
            else:
                tt = R_TUNTUT.search(t)
                ucap = R_PENILAI.search(t, m.end())
                if (tt and tt.start() < m.start()) or R_DINILAI.match(t, m.end()):
                    v = "negatif"
                elif ucap:  # "Gubernur apresiasi TNI", "DPRD kritik Pemprov": lembaga ini yang menilai, bukan yang dinilai
                    v = "netral"
                elif v == "netral" and kode == pertama and respons_judul in ("negatif", "positif") and not (tt and tt.start() > m.start()):
                    v = respons_judul
            if out.get(kode, "netral") == "netral":
                out[kode] = v
    return out


ISU = {  # kode -> (judul isu, pola, pemilik saran)
    "korban": ("Korban jiwa & keselamatan", r"\btewas|\bmeninggal|korban jiwa|\bterjebak\b|\btabrakan", "BNPB + Kemenkes + Pemda"),
    "asap_kesehatan": ("Kabut asap & kesehatan warga", r"\bispa\b|kualitas udara|\bispu\b|\bpm ?2 ?5\b|\bmasker|\bsesak|pneumonia|tidak sehat|\bberbahaya\b", "Kemenkes / Dinkes + KLH (ISPU)"),
    "sekolah": ("Sekolah diliburkan / belajar dari rumah", r"\bsekolah\b|belajar dari rumah|belajar di rumah|\bdaring\b|\bpjj\b|diliburkan|\bliburkan|\bwfh\b|\bsiswa\b|\bpelajar\b", "Pemda (Dinas Pendidikan)"),
    "transportasi": ("Gangguan penerbangan & transportasi", r"penerbangan|\bbandara\b|\bpesawat\b|\bdelay\b|tertunda|\bpelayaran\b|jarak pandang|gagal landing", "Kemenhub + AirNav + Pemda"),
    "lintas_batas": ("Asap lintas batas & hubungan ASEAN", r"\bmalaysia\b|\bsingapura\b|\bsingapore\b|asap kiriman|lintas batas|\bjerebu\b|\basean\b|\bbrunei\b", "Kemenlu + KLH"),
    "hukum": ("Penegakan hukum & tanggung jawab korporasi", r"tersangka|ditangkap|\btangkap|disegel|\bsegel|korporasi|\bperusahaan\b|\bsanksi|cabut izin|izin dicabut|penyidikan|divonis|\bpelaku\b|pembakar", "Polri + Gakkum KLH/Kemenhut"),
    "kritik": ("Kritik, gugatan & desakan publik", r"\bgugat|class action|\bkritik|\bkecam|\blamban|\bdemo\b|unjuk rasa|\bdesak|\bmendesak|\btuntut|\bsorot|\bmundur\b|kartu merah|\bgagap\b", "KSP / Humas pemerintah + lembaga yang disorot"),
    "status": ("Status darurat & bencana nasional", r"status (siaga|tanggap)|siaga darurat|tanggap darurat|bencana nasional|siaga satu", "BNPB + Pemda"),
    "udara": ("Pemadaman udara & modifikasi cuaca", r"water ?bombing|\bhelikopter|\bheli\b|bom air|modifikasi cuaca|\bomc\b|\btmc\b|hujan buatan|\bchinook\b|\bpesawat\b", "BNPB + BMKG"),
    "satwa": ("Satwa & kawasan konservasi", r"orangutan|orang utan|\bsatwa|\bgajah\b|\bharimau\b|\bbekantan\b|taman nasional|\btn\b|cagar alam|\btahura\b|hutan lindung", "Kemenhut (BKSDA / Balai TN)"),
    "sebaran": ("Sebaran api & luas terbakar", r"\bhektare|\bhektar\b|\bha\b|\bmeluas|titik panas|\bhotspot|titik api", "BNPB + Kemenhut (Manggala Agni)"),
    "cuaca": ("Cuaca, kemarau & El Nino", r"el nino|kemarau|\bbmkg\b|\bhujan\b|kekeringan|\bcuaca\b", "BMKG"),
    "pencegahan": ("Pencegahan, gambut & kesiapsiagaan", r"\bgambut\b|sekat kanal|restorasi|sumur bor|pencegahan|\bcegah|\bmpa\b|patroli|sosialisasi|\bapel\b|kesiapsiagaan", "Kemenhut + BRGM + Pemda"),
    "sumber_daya": ("Sumber daya: anggaran, personel, alat", r"\banggaran|\bdana\b|\bbtt\b|\bpompa\b|\bpersonel\b|\bhonor\b|logistik|\bmiliar\b|\bjuta\b|kekurangan|\bair bersih\b", "BNPB + Kemenkeu + Pemda"),
    "hoaks": ("Hoaks, viral & klarifikasi", r"\bhoaks|\bhoax|cek fakta|\bviral\b|\bklarifikasi|\bbantah|disinformasi|\bbenarkah\b|\bfaktanya\b", "Komdigi + Humas lembaga terkait"),
    "pusat": ("Arahan Presiden & koordinasi pusat", r"\bpresiden\b|\bprabowo\b|\bistana\b|\bratas\b|rapat terbatas|\bmenko\b|kemenko|\bseskab\b|desk karhutla", "KSP / Setkab + Kemenko Polkam"),
}
ISU_RE = {k: re.compile(v[1]) for k, v in ISU.items()}
TUNTUTAN = {  # kategori tuntutan -> (judul, pola pada isi tuntutan, pemilik); dicocokkan berurutan, yang pertama menang
    "udara": ("Kirim water bombing / helikopter", r"water ?bombing|helikopter|heli|bom air|pesawat", "BNPB"),
    "status": ("Tetapkan status darurat / bencana nasional", r"status|darurat|bencana nasional", "BNPB + Presiden / Pemda"),
    "lintas_batas": ("Asap lintas batas: tuntutan / usulan negara tetangga", r"malaysia|singapura|asean|lintas batas|jiran", "Kemenlu + KLH"),
    "tata_kelola": ("Evaluasi izin, tata kelola, pencopotan pejabat", r"evaluasi|tata kelola|izin|dicopot|copot|mundur|audit", "KSP + Kemenhut + KLH"),
    "hukum": ("Usut & tindak pelaku / perusahaan", r"usut|tindak tegas|hukum|cabut|perusahaan|korporasi|pelaku|tangkap|sanksi|periksa|tanggung jawab|nama perusahaan|pembakar", "Polri + Gakkum KLH/Kemenhut"),
    "kesehatan": ("Layanan kesehatan & masker", r"masker|ispa|kesehatan|layanan|oksigen|posko|gratis|korban", "Kemenkes / Dinkes"),
    "sekolah": ("Liburkan sekolah / belajar dari rumah", r"sekolah|libur|daring|belajar", "Pemda (Dinas Pendidikan)"),
    "pencegahan": ("Pencegahan & pemulihan gambut", r"gambut|restorasi|cegah|pencegahan|sekat|kanal|mangrove|moratorium|pengawasan", "Kemenhut + BRGM"),
    "proyek": ("Hentikan / tinjau proyek (PSN, food estate)", r"psn|food estate|proyek|sawit|tambang", "KSP + kementerian sektor"),
    "data": ("Keterbukaan data & koordinasi", r"data|transparan|koordinasi|kolaborasi|terpadu|satgas|solid|dibuka", "BNPB + KSP"),
    "sumber_daya": ("Percepat penanganan: personel, alat, anggaran", r"personel|alat|anggaran|dana|pompa|sumur bor|honor|logistik|bantuan|turun tangan|tangani|bertindak|bergerak|gerak cepat|perkuat|penanganan|serius|segera|prioritas|lindungi|hentikan", "BNPB + Pemda"),
}
TUNTUTAN_RE = {k: re.compile(r"\b(" + v[1] + r")\b") for k, v in TUNTUTAN.items()}
R_BANTUAN = re.compile(r"bantuan|water ?bombing|helikopter|\bheli\b|personel|pompa|logistik|turun tangan")
R_UCAP = re.compile(r"\b(sebut|menyebut|ungkap|mengungkap|ungkapkan|tegaskan|menegaskan|minta|meminta|desak|mendesak|imbau|mengimbau|ingatkan|mengingatkan|"
                    r"klaim|mengklaim|pastikan|memastikan|akui|mengakui|bantah|membantah|nilai|menilai|soroti|menyoroti|kritik|mengkritik|dorong|mendorong|"
                    r"usul|mengusulkan|janji|berjanji|beberkan|membeberkan|jelaskan|menjelaskan|lapor|melaporkan|catat|mencatat|prediksi|memprediksi|"
                    r"tuntut|menuntut|kecam|mengecam|optimistis|yakin|harap|berharap|perintahkan|instruksikan|bicara|angkat bicara)\b")
R_BUKAN_TOKOH = re.compile(r"^(video|foto|berita|breaking news|opini|editorial|update|data|terpopuler|sorotan|cek fakta|info|karhutla|kebakaran|kabut|asap|cuaca|"
                           r"prakiraan|hari|kasus|luas|titik|hotspot|warga|ini|begini|simak|daftar|lihat|kronologi|wow|waspada|viral|populer|di balik|"
                           r"surat terbuka|artikel|news|ispa|status|polusi|jumlah|ribuan|ratusan|puluhan|sebanyak)\b")
GOL_SIPIL = re.compile(r"\b(walhi|greenpeace|warsi|ylbhi|lbh|celios|icel|auriga|pantau gambut|jikalahari|relawan|mahasiswa|bem|aliansi|lsm|pakar|akademisi|"
                       r"peneliti|guru besar|prof|dosen|warga|masyarakat|aktivis|hmi|pmii|gmni|kammi|ormas|nu\b|muhammadiyah|ansor|ombudsman|kontras)\b")
SARAN_WARGA = {
    "asap_kesehatan": "Saat ISPU/PM2.5 tidak sehat: kurangi aktivitas di luar ruang, pakai masker N95/KN95 bila harus keluar, utamakan perlindungan balita, ibu hamil, lansia, dan penderita penyakit paru/jantung; periksakan diri ke puskesmas bila sesak.",
    "sekolah": "Ikuti pengumuman resmi dinas pendidikan setempat soal jam belajar dan pembelajaran jarak jauh.",
    "transportasi": "Cek status penerbangan/pelayaran langsung ke maskapai atau operator sebelum berangkat; kurangi kecepatan saat jarak pandang turun.",
    "lintas_batas": "Rujuk data resmi kualitas udara dan titik panas; hindari menyebarkan klaim asal asap tanpa data.",
    "hukum": "Jangan membuka lahan dengan membakar; laporkan pembakaran ke Polsek, BPBD, atau Manggala Agni setempat.",
    "korban": "Jauhi lokasi api dan asap tebal; ikuti arahan petugas dan jalur evakuasi; hubungi layanan darurat setempat.",
    "default": "Jangan membakar lahan atau sampah; laporkan api dan asap ke BPBD, Manggala Agni, atau Polsek setempat; pantau informasi resmi BMKG dan BNPB.",
}
BELUM_TAHU = {
    "asap_kesehatan": "Berita tidak mengukur dampak kesehatan; angka ISPA dan ISPU per kabupaten perlu dari Dinkes dan KLH.",
    "transportasi": "Jumlah penerbangan terdampak menurut berita bukan data resmi; perlu konfirmasi AirNav/Kemenhub.",
    "hukum": "Status perkara dari judul berita belum tentu mutakhir; perlu konfirmasi penyidik.",
    "sebaran": "Luas terbakar dari berita berbeda-beda sumbernya; titik panas satelit bukan berarti setiap titik adalah api.",
    "default": "Judul berita belum tentu memuat angka resmi terbaru; konfirmasi ke lembaga pemilik data sebelum dikutip.",
}


def _bukti(x):
    e = {k: x[k] for k in ("id", "judul", "sumber", "tgl", "url") if x.get(k)}
    for k in ("url_asli", "gambar", "cerita"):
        if x.get(k):
            e[k] = x[k]
    if x.get("kab"):
        e["kab"] = x["kab"][0]
    elif x.get("prov"):
        e["prov"] = x["prov"][0]
    return e


def tokoh_dari(judul):
    """[(pembicara, kata_ucap)] dari pola judul: 'X: ...', '..., X sebut/minta/desak ...', 'kata/ujar/menurut X'."""
    out = []
    m = re.match(r"^\s*([^:]{2,60}):\s+\S", judul)
    if m and len(m.group(1).split()) <= 7 and not R_BUKAN_TOKOH.match(norm(m.group(1))):
        out.append((m.group(1).strip(), "pernyataan"))
    for k in klausa(judul):
        t = k.strip()
        m = re.search(r"\b(?:kata|ujar|tutur|menurut)\s+(.{2,50})$", t, re.I)
        if m and len(m.group(1).split()) <= 6:
            out.append((m.group(1).strip(), "pernyataan"))
            continue
        tok = t.split()
        for i, w in enumerate(tok[:8]):
            if i and R_UCAP.fullmatch(norm(w) or "-"):
                pem = " ".join(tok[:i])
                if 1 <= i <= 6 and not R_BUKAN_TOKOH.match(norm(pem)) and not re.search(r"\d{2,}", pem):
                    out.append((pem, norm(w)))
                break
    lihat, hasil = set(), []
    for p, v in out:
        p = re.sub(r"^(video|foto)\s*[:|-]?\s*", "", p, flags=re.I).strip(" '\"“”‘’")
        if p and norm(p) not in lihat and len(norm(p)) > 2:
            lihat.add(norm(p)); hasil.append((p, v))
    return hasil


JABATAN = re.compile(r"^(gubernur|wagub|wakil gubernur|bupati|wabup|wakil bupati|wali ?kota|wawali|menteri|menhut|menlu|mendagri|menko\w*|wamen\w*|presiden|wapres|"
                     r"kapolda|kapolres\w*|kapolri|pangdam|danrem|dandim|kepala bnpb|kepala bpbd|kepala|ketua|anggota|seskab|mensesneg|plt|pj)\s+")
R_WILAYAH_AWAL = re.compile(r"(kalimantan|sumatera|sumatra|jawa|sulawesi|papua|nusa|kepulauan|bangka|maluku|riau|jambi|aceh|bali|banten|kal\w+|sum\w+|sul\w+|ntt|ntb)\b")


def kunci_tokoh(p):
    """'Gubernur Anwar Hafid' dan 'Anwar Hafid' satu tokoh; 'Kapolda Riau Irjen Herry' -> 'herry ...'; jabatan tanpa nama tetap utuh."""
    n = norm(p); m = JABATAN.match(n)
    if not m:
        return n
    sisa = n[m.end():].split()
    for k in (2, 1, 0):
        r = sisa[k:]
        if len(r) >= 2 and not lembaga_di(" ".join(r)) and not R_WILAYAH_AWAL.match(r[0]) and r[0] not in ("irjen", "brigjen", "kombes", "mayjen", "laksda", "marsda"):
            return " ".join(r)
    return n


def tuntutan_dari(judul):
    """[(penuntut, isi, jenis)] jenis 'publik' (warga, relawan, LSM, DPR, Malaysia...) atau 'daerah' (pemda/BPBD minta bantuan)."""
    out = []
    for k in klausa(judul):
        t = k.strip(); tn = norm(t); m = R_TUNTUT.search(tn)
        if not m or m.group(1) in ("diminta", "didesak", "didorong", "dituntut"):
            continue
        penuntut, isi = tn[:m.start()].strip(), tn[m.end():].strip()
        if not isi or len(isi.split()) < 2:
            continue
        lb = lembaga_di(penuntut)
        if lb and set(lb) <= PEMERINTAH:
            if "PEMDA" in lb or "BPBD" in lb:
                if R_BANTUAN.search(isi):
                    out.append((penuntut, isi, "daerah"))
            continue  # pejabat meminta warga / jajaran: imbauan, bukan tuntutan
        if (not penuntut or len(penuntut.split()) > 5 or any(w.endswith("kan") or w in ("bentuk", "ispa", "petugas") for w in penuntut.split())
                or m.group(1) in ("ajukan", "mengajukan")) or re.match(r"(warga|masyarakat|semua pihak|seluruh pihak|personel|jajaran)\b", isi):
            continue
        out.append((penuntut, isi, "publik"))
    return out


def pantau(art, cerita, sekarang, fitur, lonjakan, a_int, geo=None):
    """Keluaran ruang krisis: isu, tokoh, lembaga, tuntutan, kontradiksi, peringatan, rekomendasi_komunikasi.
    art: artikel internal (dengan _t), sudah punya 'cerita', 'label_*', 'lembaga'."""
    t24, t48, t72 = sekarang - dt.timedelta(hours=24), sekarang - dt.timedelta(hours=48), sekarang - dt.timedelta(hours=72)
    t7, t14, t30 = sekarang - dt.timedelta(days=7), sekarang - dt.timedelta(days=14), sekarang - dt.timedelta(days=30)
    hari = [(sekarang - dt.timedelta(days=i)).date().isoformat() for i in range(29, -1, -1)]
    nas = [x for x in art if x["asal"] == "nasional"]
    ukur = lambda xs: {"n24": sum(x["_t"] >= t24 for x in xs), "n24_lalu": sum(t48 <= x["_t"] < t24 for x in xs),
                       "n7": sum(x["_t"] >= t7 for x in xs), "n7_lalu": sum(t14 <= x["_t"] < t7 for x in xs)}
    momen = lambda a, b: round((a - b) / max(b, 1), 2)
    # outlet: tier 1 = 15 media nasional dengan artikel terbanyak (120 hari), tier 2 = 16-60, tier 3 = sisanya
    urut_media = [s for s, _ in Counter(x["sumber"] for x in nas).most_common()]
    tier = {s: 1 if i < 15 else 2 if i < 60 else 3 for i, s in enumerate(urut_media)}
    wakil = lambda xs, k=5: [_bukti(x) for x in sorted({x["cerita"]: x for x in sorted(xs, key=lambda x: x["_t"])}.values(),
                                                    key=lambda x: (-cerita[x["cerita"]]["n_media"], -x["_t"].timestamp()))[:k]]

    # --- isu (gugus narasi lintas cerita) + momentum
    isu = []
    for kode, (nama, _, pemilik) in ISU.items():
        xs = [x for x in art if kode in x["isu"]]
        if not xs:
            continue
        u = ukur(xs); x7 = [x for x in xs if x["_t"] >= t7]
        sit = Counter(x["label_situasi"] for x in x7); res = Counter(x["label_respons"] for x in x7)
        per_hari = Counter(x["tgl"][:10] for x in xs if x["_t"] >= t30)
        tiers = Counter(tier.get(x["sumber"], 3) for x in x7 if x["asal"] == "nasional")
        isu.append({"kode": kode, "nama": nama, "pemilik": pemilik, **u, "n_dasar": sum(t24 - dt.timedelta(days=7) <= x["_t"] < t24 for x in xs), "momentum24": momen(u["n24"], u["n24_lalu"]), "momentum7": momen(u["n7"], u["n7_lalu"]),
                    "cerita7": len({x["cerita"] for x in x7}), "media7": len({x["sumber"] for x in x7}),
                    "media_utama": [s for s, _ in Counter(x["sumber"] for x in x7).most_common(5)],
                    "tier7": [tiers[1], tiers[2], tiers[3]], "n_int7": sum(x["asal"] == "internasional" for x in x7),
                    "prov": [p for p, _ in Counter(p for x in x7 for p in x["prov"]).most_common(5)],
                    "kab": [k for k, _ in Counter(k for x in x7 for k in x["kab"]).most_common(5)],
                    "situasi_n": [sit[k] for k in KELAS], "respons_n": [res[k] for k in KELAS],
                    "harian": [per_hari.get(d, 0) for d in hari], "contoh": wakil(x7 or xs)})
    isu.sort(key=lambda i: -(i["n7"] * (1 + max(-0.5, min(1.5, i["momentum7"])))))

    # --- lembaga: sebutan & sikap per hari (120 hari) + 7 hari vs 7 hari sebelumnya
    lembaga = {}
    for kode, (nama, _) in LEMBAGA.items():
        xs = [x for x in nas if kode in x["lembaga"]]
        if not xs:
            continue
        harian = defaultdict(lambda: [0, 0, 0])
        for x in xs:
            harian[x["tgl"][:10]][KELAS.index(x["lembaga"][kode])] += 1
        x7 = [x for x in xs if x["_t"] >= t7]; xl = [x for x in xs if t14 <= x["_t"] < t7]
        c7, cl = Counter(x["lembaga"][kode] for x in x7), Counter(x["lembaga"][kode] for x in xl)
        lembaga[kode] = {"nama": nama, "n": len(xs), "n7": len(x7), "n7_lalu": len(xl), "sikap7": [c7[k] for k in KELAS], "sikap7_lalu": [cl[k] for k in KELAS],
                         "harian": dict(sorted(harian.items())),
                         "negatif": wakil([x for x in x7 if x["lembaga"][kode] == "negatif"], 6),
                         "positif": wakil([x for x in x7 if x["lembaga"][kode] == "positif"], 6)}

    # --- tokoh: siapa bicara apa
    tk = defaultdict(list)
    for x in nas:
        if x["_t"] < t30:
            continue
        for p, v in x["tokoh"]:
            tk[kunci_tokoh(p)].append((p, v, x))
    tokoh = []
    for kunci, xs in tk.items():
        nama = max(Counter(p for p, _, _ in xs).most_common(3), key=lambda e: (e[1], len(e[0])))[0]
        lb = list(dict.fromkeys(k for p in {p for p, _, _ in xs} for k in lembaga_di(p))); xx = [x for _, _, x in xs]
        golongan = ("pemerintah" if set(lb) & PEMERINTAH else "legislatif" if "DPR" in lb else "korporasi" if "PERUSAHAAN" in lb
                    else "luar negeri" if "MALAYSIA_SG" in lb else "masyarakat sipil" if GOL_SIPIL.search(kunci) else "lainnya")
        res = Counter(x["label_respons"] for x in xx)
        kut = sorted(xs, key=lambda e: e[2]["_t"], reverse=True)
        tokoh.append({"nama": nama, "lembaga": lb[:2], "golongan": golongan, "n": len(xx), "n7": sum(x["_t"] >= t7 for x in xx),
                      "terakhir": kut[0][2]["tgl"], "kata": [v for v, _ in Counter(v for _, v, _ in xs).most_common(3)],
                      "respons_n": [res[k] for k in KELAS], "prov": [p for p, _ in Counter(p for x in xx for p in x["prov"]).most_common(3)],
                      # jangkauan: berapa media memuat cerita yang membawa ucapan ini (apakah pesannya tersebar)
                      "jangkauan": max(cerita[x["cerita"]]["n_media"] for x in xx),
                      "kutipan": [dict(_bukti(x), kata=v, media_cerita=cerita[x["cerita"]]["n_media"]) for _, v, x in kut[:6]]})
    tokoh = [t for t in tokoh if t["n"] >= 2 or t["n7"]]
    tokoh.sort(key=lambda t: (-t["n7"], -t["n"]))

    # --- tuntutan publik + permintaan bantuan daerah
    tt = defaultdict(list)
    for x in nas:
        for penuntut, isi, jenis in x["tuntutan"]:
            if jenis == "publik" and geo and len(penuntut.split()) <= 3 and geo.cari(penuntut)["prov"] and not GOL_SIPIL.search(penuntut) and not lembaga_di(penuntut):
                if not R_BANTUAN.search(isi):
                    continue
                jenis = "daerah"  # "Sumsel minta water bombing": permintaan pemerintah daerah
            kat = next((k for k, r in TUNTUTAN_RE.items() if r.search(isi)), "lain")
            tt[(jenis, kat)].append((penuntut, isi, x))
    tuntutan = []
    for (jenis, kat), xs in tt.items():
        xx = [x for _, _, x in xs]; x7 = [x for x in xx if x["_t"] >= t7]
        if not x7 and not any(x["_t"] >= t30 for x in xx):
            continue
        nama, _, pemilik = TUNTUTAN.get(kat, ("Lainnya", "", "Humas pemerintah"))
        terbaru = sorted(xs, key=lambda e: e[2]["_t"], reverse=True)
        tuntutan.append({"kategori": kat, "jenis": jenis, "nama": ("Permintaan bantuan daerah: " + nama.lower()) if jenis == "daerah" else nama, "pemilik": pemilik,
                         "n": len(xx), "n7": len(x7), "n7_lalu": sum(t14 <= x["_t"] < t7 for x in xx),
                         "penuntut": [p for p, _ in Counter(p for p, _, _ in xs if p).most_common(6)],
                         "prov": [p for p, _ in Counter(p for x in x7 for p in x["prov"]).most_common(4)],
                         "contoh": [dict(_bukti(x), penuntut=p, isi=i) for p, i, x in terbaru[:8]]})
    tuntutan.sort(key=lambda t: (-t["n7"], -t["n"]))

    # --- kontradiksi: klaim padam/nihil/tidak ada api vs satelit (kompleks aktif sesudah klaim di wilayah yang sama)
    kom_kab, kom_prov = defaultdict(list), defaultdict(list)
    for f in fitur:
        p = f["properties"]
        if p.get("akhir"):
            kom_prov[p["prov"]].append(p)
            if p.get("kab"):
                kom_kab[f"{p['prov']}|{p['kab']}"].append(p)
    kontradiksi, lihat = [], set()
    batas_api = min((dt.datetime.fromisoformat(f["properties"]["awal"]) for f in fitur if f["properties"].get("awal")), default=sekarang)
    for x in sorted(art, key=lambda x: x["_t"], reverse=True):
        if x["_t"] < max(t7, batas_api) or x["cerita"] in lihat or x["asal"] != "nasional":
            continue
        m = R_KLAIM.search(norm(x["judul"]))
        if not m:
            continue
        kuat = not re.match(r"(sudah|telah) padam|bantah|bukan", m.group(0))
        if geo:  # lokasi harus dari klausa yang memuat klaim: "Titik api nihil, asap dari Sumsel" bukan klaim tentang Sumsel
            kl = [k for k in klausa(x["judul"]) if R_KLAIM.search(norm(k))]
            gk = geo.cari(kl[0]) if kl else {"prov": [], "kab": []}
            lain = [k for k in klausa(x["judul"]) if k not in kl and (geo.cari(k)["prov"])]
            if gk["prov"]:
                x = dict(x, prov=gk["prov"], kab=gk["kab"])
            elif lain:
                continue
        if x["kab"]:
            wil, ks, ambang = x["kab"][0], kom_kab.get(x["kab"][0], []), 1
        elif x["prov"] and kuat:
            wil, ks, ambang = x["prov"][0], kom_prov.get(x["prov"][0], []), 5
        else:
            continue
        sesudah = [p for p in ks if dt.datetime.fromisoformat(p["akhir"]) >= x["_t"] + dt.timedelta(hours=6)]
        if not kuat:  # "api X sudah padam" hanya membantah api di dekatnya: kompleks <= 10 km dari lokasi setingkat kecamatan
            sesudah = [p for p in sesudah if x["presisi"] == "kec" and km(x["lat"], x["lon"], p["lat"], p["lon"]) <= 10]
        if len(sesudah) < ambang:
            continue
        lihat.add(x["cerita"])
        sesudah.sort(key=lambda p: (-p["level"], -p.get("n24", 0)))
        kontradiksi.append({**_bukti(x), "klaim": m.group(0), "wilayah": wil, "tingkat": "kab" if "|" in wil else "prov",
                            "jenis": "bantahan api" if re.search(r"tidak ada|tak ada|bukan|bantah", m.group(0)) else "klaim padam / nihil",
                            "kompleks_aktif": len(sesudah), "titik24": sum(p.get("n24", 0) for p in sesudah),
                            "prioritas": sum(p["level"] == 3 for p in sesudah), "kompleks": [p["id"] for p in sesudah[:8]],
                            "deteksi_terakhir": max(p["akhir"] for p in sesudah)})
    kontradiksi.sort(key=lambda k: (-k["prioritas"], -k["kompleks_aktif"]))

    # --- peringatan dini: aturan ambang yang bisa diaudit
    per = []
    lj = {}
    for l in sorted(lonjakan, key=lambda l: l["tgl"]):  # per provinsi ambil hari terakhir dalam 48 jam
        if l["prov"] != "ID" and l["tgl"] >= (sekarang - dt.timedelta(days=2)).date().isoformat():
            lj[l["prov"]] = l
    if lj:
        urut = sorted(lj.values(), key=lambda l: -l["n"] / max(l["rata14"], 0.5))
        per.append({"kode": "lonjakan", "level": "tinggi" if any(l["n"] >= 10 and l["n"] >= 3 * max(l["rata14"], 1) for l in urut) else "sedang",
                    "judul": f"Lonjakan berita di {len(urut)} provinsi",
                    "isi": "; ".join(f"{PROVINSI.get(l['prov'], l['prov'])} {l['n']} berita (biasanya {fmt_id(round(l['rata14']))})" for l in urut[:6]) + ("; …" if len(urut) > 6 else "") + ".",
                    "aturan": "berita harian provinsi > rata-rata + 2 SD 14 hari sebelumnya, minimal 5, dalam 48 jam terakhir (tinggi bila ada provinsi >= 10 berita dan >= 3x biasanya)",
                    "pemilik": "BPBD provinsi + Humas BNPB", "provinsi": [{"prov": l["prov"], "tgl": l["tgl"], "n": l["n"], "rata14": l["rata14"]} for l in urut]})
    semua24 = max(1, sum(x["_t"] >= t24 for x in art)); semua_l = max(1, sum(t24 - dt.timedelta(days=7) <= x["_t"] < t24 for x in art))
    for i in isu:
        rata = i["n_dasar"] / 7; porsi, porsi_l = i["n24"] / semua24, i["n_dasar"] / semua_l
        if i["n24"] >= 10 and i["n24"] >= 2 * max(rata, 1) and porsi >= 1.3 * porsi_l:
            per.append({"kode": "isu_" + i["kode"], "level": "tinggi" if i["n24"] >= 3 * max(rata, 1) and porsi >= 2 * porsi_l else "sedang", "judul": f"Isu naik: {i['nama']}",
                        "isi": f"{i['n24']} berita 24 jam terakhir, biasanya {fmt_id(round(rata))}/hari; porsinya {round(porsi * 100)}% dari semua berita (sebelumnya {round(porsi_l * 100)}%).",
                        "aturan": "24 jam >= 10 berita, >= 2x rata-rata harian 7 hari sebelumnya, dan porsi isu di semua berita naik >= 1,3x (tinggi bila >= 3x rata-rata dan porsi >= 2x)",
                        "pemilik": i["pemilik"], "isu": i["kode"], "prov": (i["prov"] or [None])[0]})
    for kode, l in lembaga.items():
        if kode in PEMERINTAH and l["n7"] >= 10:
            s, sl = l["sikap7"][0] / l["n7"], l["sikap7_lalu"][0] / max(1, l["n7_lalu"])
            if l["sikap7"][0] >= 5 and s >= 0.25 and s - sl >= 0.1:
                per.append({"kode": "sikap_" + kode, "level": "tinggi" if s >= 0.4 else "sedang", "judul": f"Sorotan negatif ke {l['nama']} naik",
                            "isi": f"{l['sikap7'][0]} dari {l['n7']} judul 7 hari bernada negatif ({round(s * 100)}%, sebelumnya {round(sl * 100)}%).",
                            "aturan": "lembaga disebut >= 10 judul/7 hari, >= 5 negatif, porsi negatif >= 25% dan naik >= 10 poin", "pemilik": "Humas " + l["nama"], "lembaga": kode})
    korban = [x for x in art if "korban" in x["isu"] and x["_t"] >= t72 and x["asal"] == "nasional" and re.search(r"tewas|meninggal|korban jiwa", norm(x["judul"]))
              and not re.search(r"(tidak|tak|tanpa|nihil|belum|bukan) (ada )?(\w+ )?(korban|tewas|meninggal)", norm(x["judul"]))]
    if korban:
        per.append({"kode": "korban", "level": "tinggi", "judul": "Berita korban jiwa 72 jam terakhir", "isi": f"{len({x['cerita'] for x in korban})} cerita menyebut korban jiwa.",
                    "aturan": "ada judul nasional 72 jam terakhir dengan kata tewas/meninggal/korban jiwa", "pemilik": "BNPB + Kemenkes + Pemda", "bukti": [_bukti(x) for x in korban[:5]]})
    i7 = sum(x["_t"] >= t7 for x in a_int); il = sum(t14 <= x["_t"] < t7 for x in a_int)
    if i7 >= 20 and i7 >= 1.5 * max(il, 1):
        per.append({"kode": "internasional", "level": "sedang", "judul": "Liputan media asing naik", "isi": f"{i7} berita asing 7 hari (sebelumnya {il}).",
                    "aturan": "berita internasional 7 hari >= 20 dan >= 1,5x 7 hari sebelumnya", "pemilik": "Kemenlu + KLH"})
    if kontradiksi:
        per.append({"kode": "kontradiksi", "level": "tinggi" if any(k["prioritas"] for k in kontradiksi) else "sedang", "judul": "Klaim di berita bertentangan dengan satelit",
                    "isi": f"{len(kontradiksi)} judul mengklaim api padam/nihil padahal satelit masih mendeteksi kompleks aktif sesudahnya.",
                    "aturan": "klaim padam/nihil/tidak ada api; kompleks aktif >= 6 jam sesudah terbit di kabupaten itu (>= 5 bila hanya provinsi)",
                    "pemilik": "Humas BNPB/BPBD + Manggala Agni (cek lapangan)"})
    for t in tuntutan:
        if t["jenis"] == "publik" and t["n7"] >= 5 and t["n7"] >= 2 * max(t["n7_lalu"], 1):
            per.append({"kode": "tuntutan_" + t["kategori"], "level": "sedang", "judul": f"Tuntutan naik: {t['nama']}", "isi": f"{t['n7']} judul 7 hari (sebelumnya {t['n7_lalu']}).",
                        "aturan": "tuntutan publik satu kategori >= 5 judul/7 hari dan >= 2x 7 hari sebelumnya", "pemilik": t["pemilik"]})
    for p in per:
        p["tanggapi_dalam"] = "6 jam" if p["level"] == "tinggi" else "24 jam"
    per.sort(key=lambda p: (p["level"] != "tinggi", p["kode"]))

    # --- rekomendasi komunikasi gaya CERC untuk isu teratas (fakta saja; tiap angka dari data di atas)
    api_prov = defaultdict(lambda: [0, 0])
    for f in fitur:
        p = f["properties"]
        if p.get("akhir") and dt.datetime.fromisoformat(p["akhir"]) >= sekarang - dt.timedelta(hours=24):
            api_prov[p["prov"]][0] += 1; api_prov[p["prov"]][1] += p.get("n24", 0)
    berikut = sekarang.replace(hour=21, minute=20, second=0, microsecond=0)
    berikut += dt.timedelta(days=1) if berikut <= sekarang else dt.timedelta(0)
    rekom = []
    for i in [i for i in isu if i["n7"] >= 5][:5]:
        xs = [x for x in nas if i["kode"] in x["isu"] and x["_t"] >= t7]
        prov_s = ", ".join(PROVINSI.get(p, p) for p in i["prov"][:3])
        tahu = [f"{i['n7']} berita nasional dalam 7 hari ({'+' if i['n7'] >= i['n7_lalu'] else ''}{round(i['momentum7'] * 100)}% dibanding 7 hari sebelumnya)"
                + (f", terbanyak menyebut {prov_s}" if prov_s else "") + "."]
        sat = [f"{PROVINSI.get(p, p)} {api_prov[p][0]} kompleks api aktif ({fmt_id(api_prov[p][1])} titik panas 24 jam)" for p in i["prov"][:3] if p in api_prov]
        if sat:
            tahu.append("Satelit 24 jam terakhir: " + "; ".join(sat) + ".")
        tangan = sorted([x for x in xs if set(x["lembaga"]) & PEMERINTAH and ("penanganan" in x["topik"] or "hukum" in x["topik"])
                         and x["label_respons"] != "negatif" and not x["tuntutan"] and not any(x["lembaga"][k] == "negatif" for k in x["lembaga"])],
                        key=lambda x: (-(set(x["prov"]) & set(i["prov"][:3]) != set()), -cerita[x["cerita"]]["n_media"]))
        tangan = list({x["cerita"]: x for x in reversed(tangan)}.values())[::-1][:2]
        rekom.append({"isu": i["kode"], "judul": i["nama"], "pemilik": i["pemilik"], "batas": "sebelum " + berikut.strftime("%d/%m %H:%M") + " WIB",
                      "poin": [{"jenis": "Yang kami ketahui", "teks": " ".join(tahu)},
                               {"jenis": "Yang belum kami ketahui", "teks": BELUM_TAHU.get(i["kode"], BELUM_TAHU["default"])},
                               {"jenis": "Yang sedang dilakukan", "teks": ("Diberitakan: " + "; ".join(f"“{x['judul']}” ({x['sumber']})" for x in tangan) + ".") if tangan
                                else "Belum ada berita penanganan untuk isu ini dalam 7 hari; konfirmasi langkah yang berjalan ke pemilik isu."},
                               {"jenis": "Yang perlu dilakukan warga", "teks": SARAN_WARGA.get(i["kode"], SARAN_WARGA["default"])},
                               {"jenis": "Pembaruan berikutnya", "teks": f"Pantauan berita diperbarui {berikut.strftime('%d/%m %H:%M')} WIB; titik panas satelit tiap 3 jam."}],
                      "bukti": i["contoh"][:3]})
    return {"isu": isu, "tokoh": tokoh[:40], "lembaga": lembaga, "tuntutan": tuntutan, "kontradiksi": kontradiksi[:30],
            "peringatan": per, "rekomendasi_komunikasi": rekom, "tier_media": {"1": urut_media[:15], "2": urut_media[15:60]}}


def validasi_lembaga(bagian="uji"):
    """Sikap per lembaga (aturan) vs label 'sasaran' pada label_ai.json bagian uji. Lembaga yang disebut tanpa label sasaran = netral."""
    p = os.path.join(RAW, "label_ai.json")
    if not os.path.exists(p):
        return {}
    lab = [x for x in json.load(open(p))["label"] if x.get("situasi") and x["bagian"] == bagian]
    benar, tebak_, deteksi = [], [], [0, 0]
    model = None
    for x in lab:
        s = sikap_lembaga(x["judul"], label(skor(x["judul"], "", RESPONS)[0]))
        emas = x.get("sasaran") or {}
        deteksi[0] += sum(k in s for k in emas); deteksi[1] += len(emas)
        for k in set(s) | set(emas):
            benar.append(emas.get(k, "netral")); tebak_.append(s.get(k, "netral"))
    m = ringkas_metrik(benar, tebak_) if benar else {}
    m.pop("konfusi", None)
    return {"n_pasangan": len(benar), "recall_deteksi_sasaran": round(deteksi[0] / max(1, deteksi[1]), 3), **m,
            "mayoritas_akurasi": round(Counter(benar).most_common(1)[0][1] / max(1, len(benar)), 3) if benar else None}


def _semua_bukti(pm):
    for i in pm["isu"]:
        yield from i["contoh"]
    for l in pm["lembaga"].values():
        yield from l["negatif"] + l["positif"]
    for t in pm["tokoh"]:
        yield from t["kutipan"]
    for t in pm["tuntutan"]:
        yield from t["contoh"]
    yield from pm["kontradiksi"]
    for p in pm["peringatan"]:
        yield from p.get("bukti", [])
    for r in pm["rekomendasi_komunikasi"]:
        yield from r["bukti"]


R_KLAIM = re.compile(r"\b(nihil|zero (karhutla|hotspot|api)|bebas (hotspot|titik api|titik panas|asap|api|karhutla)|"
                     r"(tidak|tak) ada (lagi )?(titik api|titik panas|hotspot|kebakaran|api)|padam total|seluruh(nya)? (titik )?(api )?(sudah |telah )?padam|"
                     r"(sudah|telah) padam|berhasil dipadamkan seluruhnya|bukan (dari )?(karhutla|kebakaran)|bantah)\b")


def fmt_id(n):
    return f"{n:,}".replace(",", ".")


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


def perkaya_gambar(out, batas_detik=420, maks_cerita=40, ambil=True):
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
    # setelah cerita sorotan: artikel satu per satu, terbaru dulu, sampai batas waktu (cache membuat daftar terisi bertahap tiap hari)
    sendiri = [a["cerita"] for a in sorted(out["artikel"], key=lambda a: a["tgl"], reverse=True)]
    urut += [c for c in dict.fromkeys(sendiri) if c not in set(urut)]
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


def olah(arsip, sekarang, geo, model=None):
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
        l1, l2 = label(s1), label(s2)
        if bhs == "id" and model:  # judul Indonesia: model terlatih; skor = P(positif) - P(negatif)
            f = fitur_nada(a["judul"])
            for dim, nilai in (("situasi", 0), ("respons", 1)):
                m_ = model.get(dim)
                if m_ is None or isinstance(m_, Leksikon):
                    continue
                p = m_.proba(f); lb = max(KELAS, key=lambda k: p[k])
                if dim == "situasi":
                    s1, l1 = round(p["positif"] - p["negatif"], 2), lb
                else:
                    s2, l2 = round(p["positif"] - p["negatif"], 2), lb
        t = dt.datetime.fromisoformat(a["tgl"])
        nt = norm(a["judul"])
        x = dict({k: v for k, v in a.items() if k != "ed"}, prov=g["prov"], kab=g["kab"], kec=g["kec"], lat=g["lat"], lon=g["lon"], presisi=g["presisi"], topik=topik(teks, bhs),
                 emosi=emosi(a["judul"], bhs), bahasa=bhs, asal=asal(a, bhs),
                 situasi=s1, respons=s2, label_situasi=l1, label_respons=l2, alasan={"situasi": al1, "respons": al2},
                 isu=[k for k, r in ISU_RE.items() if r.search(nt)] if bhs == "id" else [k for k in ("lintas_batas",) if ISU_RE[k].search(nt)] + (["asap_kesehatan"] if re.search(r"\bhaze|smoke|air quality|psi\b", nt) else []),
                 lembaga=sikap_lembaga(a["judul"], l2) if bhs == "id" else {},
                 tokoh=tokoh_dari(a["judul"]) if bhs == "id" else [], tuntutan=tuntutan_dari(a["judul"]) if bhs == "id" else [],
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

    pm = pantau(art, cerita, sekarang, fitur, lonjakan, a_int, geo)
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
    # bukti pantauan media ikut dikeluarkan agar popup bisa menampilkan artikel lengkapnya
    pilih |= {b["id"] for b in _semua_bukti(pm)}
    keluar = [x for x in art if x["id"] in pilih]
    for x in art:
        for k in ("_t", "_k", "_e", "tuntutan"):
            x.pop(k, None)
        if not x["lembaga"]:
            x.pop("lembaga")
        if not x["tokoh"]:
            x.pop("tokoh")
        else:
            x["tokoh"] = [p for p, _ in x["tokoh"]]
    dipakai = {x["cerita"] for x in keluar} | sorot
    return {"artikel": keluar, "cerita": [c for c in cerita.values() if c["id"] in dipakai], "harian": harian, "prov": prov,
            "prov_harian": dict(prov_harian), "kab": dict(kab), "media": media, "media_nas": media_nas,
            "lonjakan": lonjakan, "sorotan": sorotan, "sorotan_nas": sorotan_nas, "internasional": internasional,
            "celah": celah, "tanpa_api": tanpa[:100], **pm, "_semua": art, "_n_cerita": len(cerita), "_cakupan": cakupan.isoformat()}


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
    "model_nada": "Judul Indonesia: nada situasi dan respons ditebak model yang dipilih lewat validasi silang 5 lipat (F1 makro) di antara leksikon lama, Naive Bayes, dan regresi logistik (kata, bigram, akar kata kasar, penanda negasi/pencegahan, fitur leksikon). Dilatih tiap jalan dari label manusia (label_uji.json) + label asisten AI (label_ai.json, pedoman scripts/data/PEDOMAN-LABEL.md, belum diperiksa manusia). Skor = P(positif) - P(negatif). Hasil uji (bagian 'uji', tak dipakai melatih) dengan selang bootstrap 95% ada di validasi.model.",
    "isu": "Gugus narasi lintas cerita dengan pola kata pada judul (16 isu: korban, asap & kesehatan, sekolah, transportasi, lintas batas, hukum, kritik, status darurat, pemadaman udara, satwa, sebaran api, cuaca, pencegahan, sumber daya, hoaks, arahan pusat). Satu judul boleh masuk beberapa isu. Momentum = (jumlah periode ini - periode sebelumnya) / periode sebelumnya, untuk 24 jam dan 7 hari. Tier media: 15 media nasional terbanyak = tier 1, 16-60 = tier 2, sisanya tier 3 (proksi jangkauan; data pembaca tidak tersedia).",
    "lembaga": "Sebutan lembaga (pola nama/jabatan) dan sikap judul terhadapnya: klausa yang memuat lembaga dinilai dengan kata respons berbobot kuat; perusahaan yang ditindak/digugat = negatif; lembaga sesudah kata desak/minta, atau diikuti 'diminta/didesak/dikritik', = negatif; lembaga yang memuji/mengkritik pihak lain dianggap penilai (netral). Diuji pada label 'sasaran' (validasi.lembaga).",
    "tokoh": "Pembicara dari pola judul 'X: ...', 'X sebut/minta/desak/tegaskan ...', 'kata/ujar/menurut X'. Jabatan + nama disatukan bila namanya sama. Jangkauan = media terbanyak yang memuat cerita berisi ucapan itu (apakah pesannya tersebar).",
    "tuntutan": "Klausa dengan minta/desak/tuntut/usul/serukan/tagih: penuntut = kata sebelum kata kerja, isi = sesudahnya, kategori dari kata kunci isi. Pejabat yang meminta warga/jajaran tidak dihitung (itu imbauan). Pemda/BPBD yang meminta bantuan (water bombing, personel, logistik) dicatat terpisah sebagai permintaan bantuan daerah.",
    "kontradiksi": "Judul nasional 7 hari terakhir yang mengklaim nihil/zero/bebas/tidak ada titik api/padam total di suatu kabupaten (atau provinsi), padahal satelit mendeteksi kompleks aktif >= 6 jam sesudah terbit di wilayah itu (>= 1 kompleks di kabupaten, >= 5 di provinsi). Klaim lemah ('api X sudah padam', 'bantah') hanya dihitung bila ada kompleks <= 10 km dari lokasi setingkat kecamatan. Lokasi diambil dari klausa yang memuat klaim.",
    "peringatan": "Aturan ambang tetap (tertulis di tiap butir): lonjakan berita provinsi, isu naik dibanding rata-rata harian 7 hari sebelumnya dan porsinya, sorotan negatif lembaga naik, korban jiwa 72 jam, liputan asing naik, kontradiksi, tuntutan naik. Level tinggi = tanggapi dalam 6 jam, sedang = 24 jam (prinsip CERC: cepat, benar, kredibel).",
    "rekomendasi_komunikasi": "Untuk 5 isu teratas: poin gaya CERC (yang kami ketahui, yang belum, yang sedang dilakukan, yang perlu dilakukan warga, pembaruan berikutnya). Angka diambil dari berita dan satelit di berkas ini; judul penanganan dikutip apa adanya dengan nama media. Bukan pernyataan resmi: wajib diperiksa pemilik isu sebelum dipakai.",
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
    model, lap_model = latih_nada()
    h = olah(arsip, sekarang, geo, model)
    semua = h.pop("_semua"); n_cerita = h.pop("_n_cerita"); cakupan = h.pop("_cakupan")
    try:
        gb = perkaya_gambar(h, ambil=ambil_rss)
    except Exception as e:  # thumbnail hanya hiasan: jangan gagalkan jalan
        gb = {"galat": str(e)[:120]}
    print("gambar", gb, file=sys.stderr)
    v = validasi(geo=geo)
    if v:
        v["inggris"] = validasi(os.path.join(RAW, "label_uji_en.json"), geo=geo, en=True)
    v["model"] = lap_model
    v["lembaga"] = validasi_lembaga()
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
    # listrik padam / sinyal hilang bukan kabar baik; asap hilang tetap membaik
    b = skor("Batam Dikepung Masalah: Air Mati, Listrik Padam, Sinyal Hilang, Kabut Asap Tebal", "", SITUASI)
    assert b[0] < 0 and "+hilang" not in b[1] and "+padam" not in b[1], b
    assert "+hilang" in skor("Kabut asap mulai hilang dari Pekanbaru", "", SITUASI)[1]
    assert skor("Api berhasil dipadamkan", "", SITUASI)[0] > 0
    assert skor("Batam Dikepung Masalah: Air Mati, Listrik Padam, Sinyal Hilang, Kabut Asap Tebal", "", SITUASI)[0] <= 0
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
    # model nada: fitur negasi/pencegahan
    f = fitur_nada("Api belum padam")
    assert "n_padam" in f and "NEG" in f and "padam" not in f, f
    assert "c_meluas" in fitur_nada("Cegah karhutla meluas")
    # sikap per lembaga
    sk = lambda j: sikap_lembaga(j, label(skor(j, "", RESPONS)[0]))
    assert sk("Polda Sumsel Bongkar Kasus Karhutla, 43 Orang Ditahan hingga 16 Korporasi Disidik") == {"POLRI": "positif", "PERUSAHAAN": "negatif"}
    assert sk("Asap Meluas ke Mimika, Rettob Minta BNPB Turun Tangan") == {"BNPB": "negatif"}  # sasaran tuntutan
    assert sk("Gubernur Jambi apresiasi prajurit TNI bantu penanganan karhutla") == {"PEMDA": "netral", "TNI": "positif"}  # pemuji bukan yang dipuji
    assert sk("Batang Hari Terparah, Bupati Diminta Berperan Aktif")["PEMDA"] == "negatif"
    assert sk("Pemkab Natuna Gelar Apel Kesiapsiagaan Hadapi Ancaman Karhutla") == {"PEMDA": "netral"}
    assert lembaga_di("Kapolres Siak dan Dandim tinjau lahan PT ABC") == ["TNI", "POLRI", "PERUSAHAAN"]
    # tokoh & tuntutan
    assert tokoh_dari("BMKG: 120 Titik Panas di Kalbar") == [("BMKG", "pernyataan")]
    assert tokoh_dari("Karhutla Meluas, Teras Narang Minta Pemda Solid") == [("Teras Narang", "minta")]
    assert tokoh_dari("Video: Asap Pekat di Palangka Raya") == []
    assert kunci_tokoh("Gubernur Anwar Hafid") == kunci_tokoh("Anwar Hafid") == "anwar hafid" and kunci_tokoh("Gubernur Kalsel") == "gubernur kalsel"
    assert tuntutan_dari("Relawan Tanjung Puting Desak Pemerintah Kerahkan Water Bombing") == [("relawan tanjung puting", "pemerintah kerahkan water bombing", "publik")]
    assert tuntutan_dari("Kapolda Kalteng minta warga siapkan langkah cepat hadapi karhutla") == []  # imbauan pejabat, bukan tuntutan
    assert tuntutan_dari("Pemkab Ngawi minta water bombing untuk tangani karhutla") == [("pemkab ngawi", "water bombing untuk tangani karhutla", "daerah")]
    assert next(k for k, r in TUNTUTAN_RE.items() if r.search("pemerintah kerahkan water bombing")) == "udara"
    assert next(k for k, r in TUNTUTAN_RE.items() if r.search("dinas terkait segera bertindak")) == "sumber_daya"  # 'bertindak' bukan 'tindak tegas'
    # isu & klaim
    assert {k for k, r in ISU_RE.items() if r.search(norm("Kabut Asap Pekat, Sekolah di Pekanbaru Diliburkan"))} >= {"sekolah"}
    assert R_KLAIM.search(norm("BPBD Pekanbaru Pastikan Nihil Titik Api Baru")) and not R_KLAIM.search(norm("Karhutla Jambi Mulai Terkendali"))
    # pantau(): kontradiksi + peringatan pada data buatan
    T = dt.datetime(2026, 10, 10, 12, tzinfo=WIB)
    def a(i, j, jam, kab=(), prov=("62",), **k):
        x = {"id": f"a{i}", "judul": j, "sumber": f"M{i % 3}", "tgl": (T + dt.timedelta(hours=jam)).isoformat(timespec="minutes"), "url": f"u{i}",
             "_t": T + dt.timedelta(hours=jam), "asal": "nasional", "prov": list(prov), "kab": list(kab), "presisi": "kab" if kab else "prov",
             "lat": None, "lon": None, "topik": ["kejadian"], "label_situasi": "negatif", "label_respons": "netral", "cerita": f"C{i}",
             "isu": [k for k, r in ISU_RE.items() if r.search(norm(j))], "lembaga": sikap_lembaga(j, "netral"), "tokoh": tokoh_dari(j), "tuntutan": tuntutan_dari(j)}
        x.update(k); return x
    art = [a(1, "Seruyan Nihil Titik Api", -30, kab=["62|Seruyan"]), a(2, "Kotim Nihil Titik Api", -30, kab=["62|Kotawaringin Timur"])]
    art += [a(10 + i, f"Warga tewas terjebak api nomor {i}", -5) for i in range(1)]
    art += [a(20 + i, f"Asap pekat, sekolah diliburkan hari {i}", -2) for i in range(12)]
    cer = {x["cerita"]: {"n_media": 1} for x in art}
    fit = [{"properties": {"id": "K1", "prov": "62", "kab": "Seruyan", "awal": "2026-10-08T00:00:00+00:00", "akhir": "2026-10-10T03:00:00+00:00", "level": 3, "n24": 40, "lat": -3, "lon": 112}}]
    pm = pantau(art, cer, T, fit, [], [])
    assert [k["wilayah"] for k in pm["kontradiksi"]] == ["62|Seruyan"], pm["kontradiksi"]  # Kotim tanpa kompleks: bukan kontradiksi
    kode = {p["kode"] for p in pm["peringatan"]}
    assert {"kontradiksi", "korban", "isu_sekolah"} <= kode, kode
    assert all(p["tanggapi_dalam"] in ("6 jam", "24 jam") and p["aturan"] and p["pemilik"] for p in pm["peringatan"])
    assert pm["rekomendasi_komunikasi"] and [q["jenis"] for q in pm["rekomendasi_komunikasi"][0]["poin"]][0] == "Yang kami ketahui"
    # model nada harus mengalahkan menebak label terbanyak (F1 makro, selang bootstrap berpasangan di atas 0)
    _, lap = latih_nada()
    if lap.get("situasi"):
        for dim in ("situasi", "respons"):
            L = lap[dim]
            print("model", dim, L["terpilih"], "uji", (L["uji"]["n"], L["uji"]["akurasi"], L["uji"]["f1_makro"]), "ci", L["uji"]["ci95"]["akurasi"],
                  "mayoritas", (L["mayoritas"]["akurasi"], L["mayoritas"]["f1_makro"]), "selisih ci", L["selisih_vs_mayoritas_ci95"])
        assert lap["situasi"]["selisih_vs_mayoritas_ci95"]["akurasi"][0] > 0, "model situasi tidak lebih akurat dari menebak label terbanyak"
        for dim in ("situasi", "respons"):
            assert lap[dim]["selisih_vs_mayoritas_ci95"]["f1_makro"][0] > 0, f"F1 makro {dim} tidak lebih baik dari menebak label terbanyak"
        vl = validasi_lembaga()
        print("sikap lembaga", {k: vl[k] for k in ("n", "akurasi", "f1_makro", "mayoritas_akurasi")})
    print("ok")


def periksa():
    """Kesepakatan label manusia (periksa_manusia.json) vs label AI (label_ai.json)."""
    pm = [x for x in json.load(open(os.path.join(RAW, "periksa_manusia.json")))["label"] if x.get("situasi")]
    ai = {x["id"]: x for x in json.load(open(os.path.join(RAW, "label_ai.json")))["label"]}
    if not pm:
        print("periksa_manusia.json belum diisi"); return
    for dim in ("situasi", "respons"):
        b = [x[dim] for x in pm if x.get(dim)]; t = [ai[x["id"]][dim] for x in pm if x.get(dim)]
        m = metrik(b, t)
        print(dim, "n", m["n"], "kesepakatan", m["akurasi"], "F1 makro", m["f1_makro"], "(label manusia = benar)")
        if m["akurasi"] < 0.8:
            print("  di bawah 80%: label AI jangan dipakai sebagai acuan; labeli ulang")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif sys.argv[1:2] == ["ulang"]:  # olah ulang arsip tanpa mengambil RSS (setel aturan)
        main(ambil_rss=False)
    elif sys.argv[1:2] == ["sampel"]:
        sampel()
    elif sys.argv[1:2] == ["periksa"]:
        periksa()
    elif sys.argv[1:2] == ["isi"]:
        main(int(sys.argv[2]) if len(sys.argv) > 2 else JENDELA_HARI)
    else:
        main()
