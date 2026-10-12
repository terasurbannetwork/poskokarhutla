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


def rss(q):
    return "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q, "hl": "id", "gl": "ID", "ceid": "ID:id"})


def urai(xml):
    """Item RSS -> artikel mentah {id, judul, sumber, url, tgl, ringkas}."""
    out = []
    for it in ET.fromstring(xml).iter("item"):
        url, judul = (it.findtext("link") or "").strip(), (it.findtext("title") or "").strip()
        sumber = (it.findtext("source") or "").strip()
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
    return out


def panen(daftar):
    hasil, gagal = [], 0
    for i, q in enumerate(daftar):
        try:
            hasil += urai(ambil(rss(q)))
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


# ---------------------------------------------------------------- geocoder
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
        nama_kab = {norm(n) for n in kab_nama}
        nama_prov = {norm(p) for p in PROVINSI.values()}
        for nama, ks in kab_nama.items():
            n = norm(nama)
            for k in ks:
                self.tambah(n, ("kab", k, n not in KAB_LEMAH))
                bare = n[5:] if n.startswith("kota ") else n
                self.tambah("kabupaten " + bare, ("kab", k, True)); self.tambah("kab " + bare, ("kab", k, True))
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
TOPIK_RE = {k: re.compile(v) for k, v in TOPIK.items()}


def topik(teks):
    t = norm(teks)
    return [k for k, r in TOPIK_RE.items() if r.search(t)]


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
NEGASI = {"tidak", "tak", "belum", "bukan", "tanpa", "jangan", "gak", "nggak", "enggak", "tiada"}
# kata pencegahan menetralkan (bukan membalik) kata sesudahnya: "cegah karhutla meluas" bukan berita meluas
PENETRAL = {"cegah", "mencegah", "antisipasi", "mengantisipasi", "hadapi", "menghadapi"}
PENGUAT = {"sangat": 1.5, "makin": 1.5, "semakin": 1.5, "kian": 1.5, "amat": 1.5, "terus": 1.3, "paling": 1.5, "kembali": 1.2}


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


def validasi(jalur=os.path.join(RAW, "label_uji.json"), geo=None):
    if not os.path.exists(jalur):
        return {}
    lab = json.load(open(jalur))
    out = {"sumber": "label tangan pada judul nyata dari jalan pertama; bagian 'latih' dipakai menyetel leksikon, 'uji' tidak disentuh",
           "situasi": {}, "respons": {}}
    rel = [x for x in lab if "relevan" in x]
    if rel:
        tebak = [relevan(x["judul"] + " " + x.get("ringkas", ""), geo and geo.cari(x["judul"]))[0] for x in rel]
        tp = sum(1 for x, t in zip(rel, tebak) if t and x["relevan"]); fp = sum(1 for x, t in zip(rel, tebak) if t and not x["relevan"])
        fn = sum(1 for x, t in zip(rel, tebak) if not t and x["relevan"])
        out["relevansi"] = {"n": len(rel), "presisi": round(tp / max(1, tp + fp), 3), "recall": round(tp / max(1, tp + fn), 3),
                            "salah_lolos": [x["judul"] for x, t in zip(rel, tebak) if t and not x["relevan"]][:10],
                            "salah_buang": [x["judul"] for x, t in zip(rel, tebak) if not t and x["relevan"]][:10]}
    sen = [x for x in lab if x.get("situasi")]
    for dim, lex in (("situasi", SITUASI), ("respons", RESPONS)):
        for bag in ("latih", "uji", "semua"):
            xs = [x for x in sen if bag == "semua" or x["bagian"] == bag]
            out[dim][bag] = metrik([x[dim] for x in xs], [label(skor(x["judul"], x.get("ringkas", ""), lex)[0]) for x in xs])
        out[dim]["mayoritas_uji"] = round(Counter(x[dim] for x in sen if x["bagian"] == "uji").most_common(1)[0][1]
                                          / max(1, sum(1 for x in sen if x["bagian"] == "uji")), 3)
    return out


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
        teks = a["judul"] + " " + a.get("ringkas", "")
        g = geo.cari(teks)
        ok, _ = relevan(teks, g)
        if not ok:
            continue
        s1, al1 = skor(a["judul"], a.get("ringkas", ""), SITUASI)
        s2, al2 = skor(a["judul"], a.get("ringkas", ""), RESPONS)
        t = dt.datetime.fromisoformat(a["tgl"])
        x = dict(a, prov=g["prov"], kab=g["kab"], kec=g["kec"], lat=g["lat"], lon=g["lon"], presisi=g["presisi"], topik=topik(teks),
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
        for x in g:
            x["cerita"] = cid

    hari = lambda x: x["tgl"][:10]
    t7, t72 = sekarang - dt.timedelta(days=7), sekarang - dt.timedelta(hours=72)
    rata = lambda xs, k: round(sum(x[k] for x in xs) / len(xs), 3) if xs else None

    per_hari = defaultdict(list)
    for x in art:
        per_hari[hari(x)].append(x)
    harian = {d: {"n": len(xs), "cerita": len({x["cerita"] for x in xs}), "situasi_rata": rata(xs, "situasi"),
                  "respons_rata": rata(xs, "respons"), "per_topik": dict(Counter(t for x in xs for t in x["topik"]))}
              for d, xs in sorted(per_hari.items())}

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
    keluar = art[:MAKS_ARTIKEL]
    for x in art:
        for k in ("_t", "_k", "_e"):
            x.pop(k, None)
    dipakai = {x["cerita"] for x in keluar} | {c["id"] for c in sorotan}
    return {"artikel": keluar, "cerita": [c for c in cerita.values() if c["id"] in dipakai], "harian": harian, "prov": prov,
            "kab": dict(kab), "media": media, "lonjakan": lonjakan, "sorotan": sorotan, "celah": celah, "tanpa_api": tanpa[:100],
            "_semua": art, "_n_cerita": len(cerita), "_cakupan": cakupan.isoformat()}


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
    baru = panen([q + " when:7d" for q in daftar]) if ambil_rss else []
    if isi_hari:
        umum = KUERI_UMUM + [f"karhutla {PROVINSI[p]}" for p in PRIORITAS]
        for mulai in range(isi_hari, 7, -7):
            a, b = (sekarang - dt.timedelta(days=mulai)).date(), (sekarang - dt.timedelta(days=max(mulai - 7, 6))).date()
            baru += panen([f"{q} after:{a} before:{b}" for q in umum])
            print(f"isi {a}..{b}: {len(baru)} item", file=sys.stderr)
    n_ambil = len(baru)
    # arsip menyimpan SEMUA item (relevansi dihitung ulang tiap jalan, jadi perbaikan aturan berlaku mundur)
    arsip = gabung(arsip, baru, sekarang)
    with open(os.path.join(RAW, "arsip.json"), "w") as f:
        json.dump({"diperbarui": sekarang.isoformat(timespec="minutes"), "artikel": arsip}, f, ensure_ascii=False, separators=(",", ":"))
    h = olah(arsip, sekarang, geo)
    semua = h.pop("_semua"); n_cerita = h.pop("_n_cerita"); cakupan = h.pop("_cakupan")
    out = {"dibuat": sekarang.isoformat(timespec="minutes"), "jendela_hari": JENDELA_HARI, "kueri": daftar, **h,
           "validasi": validasi(geo=geo), "metode": METODE,
           "ringkasan": {"diambil": n_ambil, "arsip": len(arsip), "artikel": len(semua), "cerita": n_cerita,
                         "berlokasi": round(sum(1 for x in semua if x["prov"]) / max(1, len(semua)), 3),
                         "berlokasi_kab": round(sum(1 for x in semua if x["kab"]) / max(1, len(semua)), 3),
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
