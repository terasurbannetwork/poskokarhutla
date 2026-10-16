"""Leksikon berita karhutla: kueri, relevansi, topik, sentimen (SITUASI/RESPONS), emosi.

Dipindah apa adanya dari scripts/data/berita.py (FASE-0 B3); mesinnya di scripts/umum/berita.py.
Atribut yang dibaca mesin lain: ID, KUERI_UMUM, KUERI_INT, kueri(), relevan(), TOPIK/TOPIK_EN, SITUASI/RESPONS (+_EN), saring().
"""
import importlib.util, os, re, sys

_AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(_AKAR, "scripts/data"))
from wilayah import PRIORITAS, PROVINSI  # noqa: E402


def _muat(rel, nama):
    if nama in sys.modules:
        return sys.modules[nama]
    sp = importlib.util.spec_from_file_location(nama, os.path.join(_AKAR, rel))
    m = importlib.util.module_from_spec(sp); sys.modules[nama] = m; sp.loader.exec_module(m)
    return m


_u = _muat("scripts/umum/berita.py", "umum_berita")
norm, token = _u.norm, _u.token
ID = "karhutla"

KUERI_UMUM = ["kebakaran hutan", "karhutla", "kebakaran lahan", "kabut asap", "titik panas", "hotspot karhutla",
              "water bombing karhutla", "pembakar lahan ditangkap", "status siaga darurat karhutla", "ISPA asap"]


# Liputan internasional: edisi Google News berbahasa Inggris/Melayu, kueri dipilih agar condong ke api/asap di Indonesia.
KUERI_INT = ([("en-US", q) for q in ("Indonesia forest fires", "Indonesia haze", "Kalimantan fires", "Sumatra fires", "Riau haze",
                                     "peatland fires Indonesia", "Indonesia wildfire")]
             + [("en-SG", "transboundary haze Indonesia"), ("en-SG", "Indonesia haze Singapore"), ("en-MY", "haze Malaysia Indonesia fires"),
                ("en-AU", "Indonesia fires"), ("en-GB", "Indonesia wildfires haze"), ("ms-MY", "jerebu Indonesia"),
                ("ms-MY", "kebakaran hutan Indonesia")])


def kueri():
    return ([(q, "umum") for q in KUERI_UMUM] + [(f"karhutla {PROVINSI[p]}", p) for p in PRIORITAS]
            + [(f"kebakaran hutan {PROVINSI[p].replace('Kep. ', 'Kepulauan ')}", p) for p in PROVINSI])


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


# "padam" setelah kata kelistrikan berarti listrik mati (memburuk), bukan api padam: jangan dihitung membaik
BUKAN_API = {"listrik", "lampu", "pln", "aliran", "daya", "jaringan"}
# "hilang" baru berarti membaik bila yang hilang api/asap/titik panas ("asap hilang"), bukan "sinyal hilang", "nyawa hilang"
HILANG_BAIK = {"api", "asap", "kabut", "titik", "hotspot", "kebakaran", "karhutla", "panas"}


def saring(f, tok, i):
    """Penyaring skor() khas karhutla: True = lewati butir ini."""
    if f.startswith("padam") and any(t in BUKAN_API for t in tok[max(0, i - 2):i]):
        return True
    return f == "hilang" and not any(t in HILANG_BAIK for t in tok[max(0, i - 3):i])
