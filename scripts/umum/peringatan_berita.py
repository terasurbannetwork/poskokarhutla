"""Peringatan dari BERITA, semua bencana -> public/banjir/data/peringatan_berita.json

Mesin generik (MODUL-PLUG-AND-PLAY): satu skrip, satu keluaran, kata khas tiap bencana hanya di tabel LEKSIKON di bawah.
Bahan (bentuk sama, tanpa adaptor): berita.json (banjir), berita_cuaca/gempa/gunungapi/kekeringan/udara.json di
public/banjir/data, dan public/data/berita.json (karhutla). Hanya artikel <= 72 jam. Tiap judul (+ ringkas) diklasifikasi
dengan ATURAN KATA, bukan model:
- `peringatan` (ke depan): kata kuat (peringatkan, potensi, peringatan dini, prakiraan) atau kata lemah (waspada, siaga,
  imbau) bersama sumber resmi (BMKG, BPBD, BNPB, PVMBG, pemda, dst.; tambahan per bencana).
- `kejadian` (sedang terjadi): kata kejadian khas bencana, dan BUKAN berita pencegahan/penanganan/kebijakan.
- selain itu dibuang. Tanpa provinsi = dibuang, lokasi tidak ditebak. Artikel dicoba di leksikon bencana asal berkasnya dulu,
  lalu leksikon lain; satu artikel hanya jadi satu entri (dedup url, id, judul).
Imbauan pejabat/dinas (Dinkes, Walkot, Bupati, Gubernur, Dinas, BPBD, BMKG yang "mengimbau") = `peringatan`, walau judul menyebut
kondisi; kondisi terukur tanpa pejabat ("Kualitas Udara Lampung Tidak Sehat, Warga Diminta Waspada") = `kejadian`. Alasan: yang
menentukan jenis adalah siapa yang bicara, bukan kata "waspada" saja. Politik/kebijakan/iklan/sudah reda/kiasan keuangan dibuang;
berita bantuan dibuang kecuali judul memuat kata kejadian kuat. Semua regex memakai batas kata (`K()`): "merapat" bukan "rapat".
Rentang tanggal dari teks ("23-31 Oktober 2026", "hingga 25 Oktober", "tiga hari ke depan"); tahun yang tak tertulis dipilih yang
membuat tanggal paling dekat ke tgl terbit (satu aturan rentang dan "hingga"). Tanpa rentang: mulai = tgl berita, selesai +48 jam
(peringatan; +6 jam bila nowcast: "pagi/siang/malam ini", "hari ini", "mulai pukul", "beberapa jam ke depan") atau +24 jam (kejadian).
Digabung per (bencana, bahaya, kab atau prov, jenis, mulai berdekatan); tanpa rentang tertulis, gabungan maks 72 jam sejak mulai.
Env SEKARANG=2026-10-16T20:00 mengganti jam "sekarang" (uji pada berkas berita yang basi).

Pakai:  python3 scripts/umum/peringatan_berita.py          tulis keluaran
        python3 scripts/umum/peringatan_berita.py uji      self-check
        python3 scripts/umum/peringatan_berita.py contoh   jumlah, contoh entri, artikel dibuang acak
Stdlib saja.
"""
import datetime as dt, hashlib, json, os, random, re, sys
from collections import Counter

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
KELUAR = os.path.join(AKAR, "public/banjir/data")
BAHAN = (("banjir", "public/banjir/data/berita.json"), ("cuaca", "public/banjir/data/berita_cuaca.json"),
         ("gempa", "public/banjir/data/berita_gempa.json"), ("gunungapi", "public/banjir/data/berita_gunungapi.json"),
         ("karhutla", "public/data/berita.json"), ("kekeringan", "public/banjir/data/berita_kekeringan.json"),
         ("udara", "public/banjir/data/berita_udara.json"))  # urutan = urutan cadangan leksikon
JAM_BAHAN, JAM_BASI, DURASI, MAKS_SUMBER, MAKS_LOKASI = 72, 48, {"peringatan": 48, "kejadian": 24}, 5, 3
PROVINSI = {
    "11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan",
    "17": "Bengkulu", "18": "Lampung", "19": "Kep. Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta",
    "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali",
    "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah",
    "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara",
    "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat",
    "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah",
    "95": "Papua Pegunungan", "96": "Papua Barat Daya"}

# ---------------------------------------------------------------- tanggal
BULAN = {b: i + 1 for i, b in enumerate("januari februari maret april mei juni juli agustus september oktober november desember".split())}
BULAN.update({"agu": 8, "agt": 8, "okt": 10, "nov": 11, "des": 12, "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "sep": 9, "sept": 9})
ANGKA = {"satu": 1, "dua": 2, "tiga": 3, "empat": 4, "lima": 5, "enam": 6, "tujuh": 7, "sepekan": 7}
BULAN_RE = "(" + "|".join(sorted(BULAN, key=len, reverse=True)) + r")\b\.?"
SAMPAI = r"(?:-|–|—|sampai dengan|sampai|hingga|s\.?d\.?|s/d)"
R_RENTANG = re.compile(rf"\b(\d{{1,2}})\s*(?:{BULAN_RE}\s*)?{SAMPAI}\s*(\d{{1,2}})\s*{BULAN_RE}(?:\s*(\d{{4}}))?")
R_HINGGA = re.compile(rf"\b(?:sampai dengan|sampai|hingga|s\.?d\.?|s/d)\s*(\d{{1,2}})\s*{BULAN_RE}(?:\s*(\d{{4}}))?")
R_HARI = re.compile(r"\b(\d{1,2}|" + "|".join(ANGKA) + r")\s*hari\s*(?:ke depan|mendatang|ke muka|lagi)")

# ---------------------------------------------------------------- kata umum
def K(*t):
    """Gabung kata/frasa jadi satu regex dengan batas kata di kedua sisi: "rapat" tidak cocok "merapat", "meninggal" tidak
    cocok "meninggalkan". Bentuk berimbuhan ditulis eksplisit (cegah, mencegah, dicegah), tidak lewat substring."""
    return r"\b(?:" + "|".join(t) + r")\b"


# BUANG_KERAS: pencegahan/penanganan/kebijakan/politik/iklan/sudah reda/kiasan keuangan; membuang apa pun isi judulnya.
BUANG_KERAS = K(
    "membaik", "mulai hilang", r"(?:belum|tidak|tak) (?:menunjukkan|ada) (?:aktivitas|peningkatan|tanda)", r"berangsur (?:normal|hilang|pulih|surut)", "kembali normal", "padam", "dipadamkan", "drainase", "normalisasi",
    "bersihkan", "membersihkan", "pembersihan", "kerja bakti", "gotong royong", "gercep", "cegah", "mencegah", "dicegah", "pencegahan",
    "mitigasi", "sosialisasi", "simulasi", "pelatihan", r"rp ?\d[\d.,]*", "anggaran", "proyek", "miliar", "renovasi", "embung", "pengerukan",
    "keruk", "dikeruk", "tanggul", "huntara", "huntap", "hunian", "pasca", "penyintas", "desak", "mendesak", "didesak", "dprd", "dorong",
    "mendorong", "percepat", "mempercepat", "dipercepat", "atasi", "mengatasi", "penanganan", "tangani", "menangani", "ditangani", "upayakan",
    "benahi", "membenahi", "perbaiki", "memperbaiki", "diperbaiki", "perbaikan", "pembangunan", "bangun", "membangun", "dibangun", "uji coba",
    "lawan", "melawan", "tak mau", "peduli", "teliti", "meneliti", "peneliti", "penelitian", "kaji", "mengkaji", "dikaji", "sumur bor",
    "satgas prr", "pemulihan", "rekonstruksi", "doa", "tahun lalu", "setahun", "kilas balik", "populer", "hakim", "narkoba", "2027",
    "musim hujan", "musim kemarau", "dasarian", "sepanjang", "evaluasi", "rapat", "audiensi", "apbd", "jalur evakuasi", "kesiapsiagaan",
    "edukasi", "siapkan", "disiapkan", "menyiapkan", "tips",
    # politik/kebijakan/seremoni: pejabat bertemu atau membahas, desakan ke instansi (warga diminta waspada = imbauan, bukan ini)
    "bahas", "membahas", "dibahas", "temui", "menemui", r"(?<!warga )(?<!masyarakat )diminta", "gagal lindungi", "gagal melindungi", "langkah nyata",
    "penceramah", "mui", "ijti", "pwm", "mhh",
    # iklan
    "promo", "diskon", "hadirkan", "menghadirkan", "daikin",
    # kiasan keuangan ("IHSG longsor")
    "ihsg", "saham", "rupiah", "bursa", "kurs", "bitcoin", "kripto", "emiten", "pasar modal", "obligasi") + r"|^soal\b"
# BUANG_LUNAK: berita bantuan; membuang KECUALI judul memuat kata kejadian kuat ("Banjir Rendam Rumah, Pemkab Salurkan Bantuan" tetap kejadian).
BUANG_LUNAK = K("bantuan", "bantu", "membantu", "dibantu", "salurkan", "menyalurkan", "disalurkan", "sembako", "donasi", "csr")
KEJ_KUAT = K("rendam", "merendam", "terendam", "tewas", "korban jiwa", "meninggal dunia", "erupsi", "meletus", "terbakar", "melanda", "dilanda",
             "terjang", "menerjang", "diterjang", "guncang", "mengguncang", "diguncang", "puting beliung", "hanyut", "jebol", "roboh", "ambruk")
BUANG_UMUM = BUANG_KERAS  # nama lama
RESMI_UMUM = K("bmkg", "bpbd", "bnpb", "bpba", "basarnas", r"stasiun (?:maritim|meteorologi|klimatologi|geofisika)", "pemkab", "pemkot", "pemprov",
               "pemda", "bupati", "wabup", r"wali ?kota", "walkot", "gubernur", "pusdalops", "badan meteorologi", "badan penanggulangan", "dinkes",
               r"dinas(?: \w+){0,2}", "kemenkes", "camat")
KUAT_UMUM = K("perkiraan", "peringatkan", "memperingatkan", "diperingatkan", "ingatkan", "diingatkan", "mengingatkan", "potensi", "berpotensi",
              "peringatan dini", "prakiraan", "diprakirakan", "diperkirakan", "prediksi", "diprediksi", "ancaman", "mengancam")
LEMAH_UMUM = K("waspada", "waspadai", "kewaspadaan", "siaga", "siagakan", "menyiagakan", "imbau", "diimbau", "mengimbau", "himbau", "menghimbau",
               "antisipasi", "mengantisipasi")
KEJ_UMUM = K("tewas", r"meninggal(?: dunia)?", "korban jiwa", "rusak", "merusak", "dirusak", "kerusakan", "roboh", "porak", "mengungsi", "diungsikan",
             "lumpuh", "terisolasi", "amblas", "dilanda")
MASA_DEPAN = re.compile(K("potensi", "berpotensi", "prakiraan", "diprakirakan", "diperkirakan", "prediksi", "diprediksi", "perkiraan"))
NEG_POTENSI = re.compile(r"(?:tidak|tanpa|bukan|nihil|tak)\s+(?:ada\s+|berpotensi\s+|memiliki\s+)*(?:berpotensi|potensi)")
# Imbauan pejabat/dinas = PERINGATAN (ke depan), bukan kejadian, walau judul menyebut kondisi ("Dinkes Babel Imbau Warga Terkait Kabut Asap").
# Tanpa pejabat ("Kualitas Udara Lampung Tidak Sehat, Warga Diminta Waspada") kondisi terukur tetap KEJADIAN. Dua-duanya konsisten:
# yang menentukan jenis adalah siapa yang bicara, bukan kata "waspada" saja.
IMBAU_PEJABAT = re.compile(
    r"\b(?:dinkes|dinas(?: \w+){0,2}|walkot|wali ?kota|wawali|bupati|wabup|gubernur|pemkab|pemkot|pemprov|pemda|bpbd|bmkg|bnpb|kemenkes|camat|lurah|kapolda|kapolres)\b"
    r"(?: [\w.]+){0,6} (?:imbau|diimbau|mengimbau|menghimbau|himbau|(?:minta|meminta)(?: \w+){0,2} (?:warga|masyarakat)(?: \w+){0,2} (?:waspada|siaga|hindari|jauhi|batasi|kurangi|pakai|gunakan|hati-hati|tetap waspada))\b")
# nowcast: masa berlaku peringatan pendek
NOWCAST = re.compile(K(r"(?:pagi|siang|sore|malam|petang|dini hari) ini", "hari ini", "saat ini", "mulai pukul", r"beberapa jam (?:ke depan|mendatang|lagi)"))
JAM_NOWCAST, JAM_MAKS_KLASTER = 6, 72

# Tabel LEKSIKON: bahaya = [(nama, regex)] urutan penting (yang spesifik dulu); kejadian = kata kejadian khas;
# kuat/lemah/resmi/buang = tambahan atas kata umum; tolak = regex yang membuang (mis. ramalan non-resmi). Semua dengan batas kata (K).
_LAHAN = r"(?:hutan|lahan|gambut|semak|belukar|ilalang|alang-alang|savana|sabana|kebun|hgu|hektare|hektar)"
_GUNUNG_API = ("semeru", "lewotobi", "lokon", "karangetang", "krakatau", "sinabung", "marapi", "bromo", "raung", "tangkuban", "dukono",
               "soputan", "kelud", "papandayan", "lewotolok", "rokatenda", "tambora", "sangeang", "gamalama", "merapi", "ibu", "ruang", "ijen",
               "agung", "batur", "slamet", "kerinci", "ciremai", "awu", "egon", "sirung", "inielika", "ebulobo")  # Rinjani sengaja tidak ada
_GUNUNG_BARE = ("semeru", "lewotobi", "lokon", "karangetang", "krakatau", "sinabung", "marapi", "bromo", "raung", "tangkuban", "dukono",
                "soputan", "kelud", "papandayan", "lewotolok", "rokatenda", "tambora", "sangeang", "gamalama")  # tanpa awalan "gunung"
LEKSIKON = {
    "banjir": dict(
        bahaya=[("rob", K("rob", "banjir pasang", "pasang laut", "pasang air laut", "air pasang")),
                ("longsor", r"\blongsor\w*|\b(?:tanah bergerak|pergerakan tanah)\b"),
                ("banjir", r"banjir|\b(?:meluap|terendam|merendam|rendam|genangan)\b")],
        kejadian=K("rendam", "merendam", "terendam", "direndam", "kepung", "mengepung", "dikepung", "terkepung", "meluap", "genangi", "menggenangi",
                   "tergenang", "melanda", "landa", "terjang", "menerjang", "diterjang", "jebol", "hanyut", "terseret", "tertimpa", "menimpa", "timpa",
                   "putus", "terputus", "menyapu", "tersapu", "terdampak", "kembali banjir", "susulan", "banjir bandang"),
        buang=K("karhutla", "kebakaran", "gempa", "erupsi")),
    "cuaca": dict(
        bahaya=[("puting_beliung", K("puting beliung", "angin puting")), ("gelombang_tinggi", K("gelombang tinggi", "gelombang laut")),
                ("angin_kencang", K("angin kencang", "angin ribut", "badai")),
                ("hujan_lebat", K("hujan lebat", "hujan deras", "hujan es", "petir", "cuaca ekstrem", "cuaca buruk"))],
        kejadian=K("terjang", "menerjang", "diterjang", "landa", "melanda", "tumbang", "terbang", "diterbangkan", "terbalik", "tenggelam", "menyapu",
                   "hujan es", "menimpa", "porak"),
        buang=K("karhutla", "kebakaran", "gempa", "erupsi")),
    "gempa": dict(
        bahaya=[("gempa", r"\bgempa\w*|\bmagnitudo\b|\bm ?\d[,.]\d"), ("tsunami", K("tsunami", "megathrust"))],
        kejadian=K("guncang", "mengguncang", "diguncang", "susulan", "terasa", "rasakan", "dirasakan", "getaran", "magnitudo") + r"|\bm ?\d[,.]\d",
        kuat=K("peringatan tsunami", "megathrust"),
        tolak=K("prediksi", "ramalan", "meramal", "memprediksi", "klaim", "ahli", "peneliti", "dukun", "primbon"),  # ramalan gempa non-BMKG
        tolak_kecuali=K("bmkg", "badan meteorologi"),
        # halaman katalog/agregator BMKG, bukan kejadian
        buang=K("karhutla", "banjir", "erupsi", "berikut info bmkg", "gempa terkini di", "30 hari terakhir", "daftar gempa",
                r"gempa(?: bumi)? terbaru di atau dekat", "info gempa terkini")),
    "gunungapi": dict(
        # butuh kata letusan/PVMBG/status atau nama gunung api AKTIF; "gunung" saja (pendaki, Gunung Sindur) bukan gunungapi
        bahaya=[("gunungapi", K("erupsi", "meletus", "letusan", "abu vulkanik", "awan panas", "lahar", "pvmbg", "badan geologi", "vulkanik",
                                r"status (?:siaga|awas|waspada)(?! darurat)", r"(?:gunung|gn|g)\.? ?(?:" + "|".join(_GUNUNG_API) + ")", *_GUNUNG_BARE))],
        kejadian=K("erupsi", "meletus", "letusan", "muntahkan", "semburkan", "luncurkan", "guguran", "awan panas", "lahar", "laharnya", "abu vulkanik",
                   "hujan abu", "kolom abu", "bergemuruh", "kembali meletus"),
        kuat=K("status naik", "naik status", "dinaikkan", "ditetapkan", "rekomendasi", "radius"),
        resmi=K("pvmbg", "badan geologi", "esdm", "pos pengamatan"),
        buang=K("wisata", "pendakian dibuka", "karhutla", "kebakaran hutan", "gempa tektonik")),
    "karhutla": dict(
        # "terbakar" hanya untuk hutan/lahan/gambut/semak/ilalang/savana/kebun/HGU; gudang, warung, kapal, rumah, dst. bukan karhutla
        bahaya=[("karhutla", K("karhutla", "kebakaran hutan", "kebakaran lahan", "lahan terbakar", "hutan terbakar", "titik panas", "hotspot", "titik api",
                               "kabut asap", rf"{_LAHAN}(?: [\w-]+){{0,2}} terbakar", rf"terbakar(?: [\w-]+){{0,2}} {_LAHAN}",
                               rf"kebakaran {_LAHAN}"))],
        kejadian=K("terbakar", "membakar", "dilahap", "melahap", "ludes", "meluas", "titik api", r"titik panas (?:meningkat|bertambah|muncul|terdeteksi)",
                   "kabut asap", "asap selimuti", "selimuti", "menyelimuti", r"karhutla (?:landa|melanda|meluas)"),
        kuat=K(r"titik panas (?:meningkat|bertambah)", "status siaga darurat", "siaga darurat", "waspada karhutla"),
        resmi=K("manggala agni", "klhk", "kementerian kehutanan", "kementerian lingkungan", "polda", "polres", "satgas", "bnpb", "kodam", "kodim"),
        buang=K("tersangka", "korporasi", "perizinan", "izin", "tuntut", "pidana", "sidang", "dpr", "komisi", "utang", "saham", "spbu", "mobil", "truk",
                "rumah terbakar", "ruko", "pasar terbakar", "gedung")),
    "kekeringan": dict(
        bahaya=[("kekeringan", K("kekeringan", "krisis air", "air bersih", "kemarau", "hari tanpa hujan", "sumur kering", "kering", "mengering"))],
        kejadian=K("krisis air", r"kekeringan (?:landa|melanda|meluas|parah)", "dilanda kekeringan", "sumur kering", "kesulitan air",
                   "kesulitan mendapat air", "gagal panen", "sawah kering", "puso", "mengering", "kering kerontang", "krisis air bersih"),
        kuat=K("peringatan dini kekeringan", "hari tanpa hujan", "status awas", "awas kekeringan"),
        resmi=K("kementan", "kementerian pertanian", "pdam"),
        # prakiraan hujan yang cuma menyebut kekeringan di cuplikan bukan peringatan kekeringan
        tolak=K("hujan"), tolak_kecuali=K("hari tanpa hujan", "kekeringan", "kemarau", "kering", "mengering", "krisis air", "air bersih"),
        buang=K("karhutla", "banjir")),
    "udara": dict(
        bahaya=[("kabut_asap", K("kabut asap", "asap karhutla", "asap tebal", "selimuti asap", "asap")),
                ("kualitas_udara", K("ispu", "kualitas udara", "polusi udara", "udara tidak sehat", "masker"))],
        kejadian=K("tidak sehat", "sangat tidak sehat", "berbahaya", "tembus", "menembus", "selimuti", "menyelimuti", "pekat", "kepung", "mengepung",
                   "dikepung", "jarak pandang", "ganggu", "mengganggu", "memburuk", "terburuk", "ispa"),
        kuat=K(r"imbau (?:warga )?(?:pakai|gunakan|kenakan) masker", "pakai masker", "gunakan masker"),
        resmi=K("klhk", "kementerian lingkungan", "dlh", "dinas lingkungan", "dinkes", "dinas kesehatan", "kemenkes", "kementerian kesehatan"),
        buang=K("alat pemantau", "sensor", "aplikasi", "kebijakan", "ganjil genap", "kendaraan listrik", "saham", "dpr",
                # daftar peringkat/peta agregator, bukan kejadian di satu tempat
                "peta sebaran", r"berikut \d+ provinsi", "indeks kualitas udara terburuk", "peringkat", r"urutan (?:ke)?\w+ dalam")),
}
for _l in LEKSIKON.values():  # pra-kompilasi
    _l["re_bahaya"] = [(n, re.compile(r)) for n, r in _l["bahaya"]]
    for k, umum in (("kejadian", ""), ("kuat", KUAT_UMUM), ("lemah", LEMAH_UMUM), ("resmi", RESMI_UMUM), ("buang", BUANG_KERAS)):
        _l["re_" + k] = re.compile("|".join(x for x in (umum, _l.get(k, "")) if x)) if k != "kejadian" else re.compile(
            _l["kejadian"] + "|" + KEJ_UMUM)
    _l["re_tolak"] = re.compile(_l["tolak"]) if _l.get("tolak") else None
    _l["re_tolak_kecuali"] = re.compile(_l["tolak_kecuali"]) if _l.get("tolak_kecuali") else None
re_lunak, re_kej_kuat = re.compile(BUANG_LUNAK), re.compile(KEJ_KUAT)


def _n(t):
    return re.sub(r"\s+", " ", (t or "").lower())


def _tanggal(h, b, tgl, th=None):
    """Tanggal (h, b): tahun tertulis, atau tahun yang membuat tanggalnya PALING DEKAT ke tgl terbit (30 Des + "2 Januari" -> tahun depan;
    16 Okt + "10 Oktober" -> tahun ini, yaitu sudah lewat)."""
    def buat(y):
        try:
            return dt.datetime(y, BULAN[b], int(h), tzinfo=WIB)
        except ValueError:
            return None
    if th:
        return buat(int(th))
    c = [d for d in (buat(y) for y in (tgl.year - 1, tgl.year, tgl.year + 1)) if d]
    return min(c, key=lambda d: abs(d - tgl)) if c else None


def rentang_teks(t, tgl):
    """-> (mulai, selesai) dari teks, atau (None, None). Tanggal saja: mulai 00.00 dan selesai 23.59 WIB. Tahun yang tak tertulis dipilih
    satu aturan untuk rentang dan "hingga": tahun yang membuat tanggal paling dekat ke tgl terbit. "hingga" tanggal lampau -> selesai < tgl."""
    m = R_RENTANG.search(t)
    if m:
        h1, b1, h2, b2, th = m.groups()
        a = _tanggal(h1, b1 or b2, tgl, th)
        if a:
            z = _tanggal(h2, b2, tgl, th)
            if th and z and z < a and b1:
                a = a.replace(year=a.year - 1)  # "28 Desember - 3 Januari 2027"
            elif not th and z:  # selesai = kemunculan pertama h2/b2 pada atau sesudah mulai
                z = next((d for d in (_tanggal(h2, b2, tgl, str(a.year + i)) for i in ((0, 1) if b1 else (0,))) if d and d >= a), None)
            if a and z and z >= a:
                return a, z + dt.timedelta(hours=23, minutes=59)
    m = R_HINGGA.search(t)
    if m:
        z = _tanggal(m.group(1), m.group(2), tgl, m.group(3))
        if z:
            return tgl, z + dt.timedelta(hours=23, minutes=59)
    m = R_HARI.search(t)
    if m:
        n = int(m.group(1)) if m.group(1).isdigit() else ANGKA[m.group(1)]
        return tgl, tgl + dt.timedelta(days=n)
    return None, None


R_MAG = re.compile(r"(?:magnitudo|\bm) ?(\d)[,.](\d)")
R_DAMPAK_GEMPA = re.compile(K("rusak", "merusak", "kerusakan", "retak", "roboh", "ambruk", "korban", "luka", "terluka", "tewas", "meninggal",
                            "mengungsi", "berhamburan", "panik"))
R_ADA_MAG = re.compile(r"(?:\bmagnitudo|\bm) ?\d")


def _gempa_kecil(j):
    """M < 4,0 tanpa kata dampak: kabar rutin katalog BMKG, bukan kejadian yang perlu ditindak."""
    m = R_MAG.search(j)
    return bool(m) and float(f"{m[1]}.{m[2]}") < 4.0 and not R_DAMPAK_GEMPA.search(j)


def klas_satu(b, judul, ringkas=""):
    """Satu leksikon -> (jenis, bahaya) atau (None, alasan)."""
    L = LEKSIKON[b]
    j, t = _n(judul), _n(judul + " " + (ringkas or ""))
    bahaya = next((n for n, r in L["re_bahaya"] if r.search(j)), None) or next((n for n, r in L["re_bahaya"] if r.search(t)), None)
    if not bahaya:
        return None, "bukan bahaya " + b
    if L["re_buang"].search(j) or (re_lunak.search(j) and not re_kej_kuat.search(j)):
        return None, "pencegahan/penanganan/kebijakan"
    if L["re_tolak"] and L["re_tolak"].search(j) and not L["re_tolak_kecuali"].search(j):
        return None, "ramalan tanpa sumber resmi"
    resmi = bool(L["re_resmi"].search(j))
    if resmi and L["re_kuat"].search(NEG_POTENSI.sub("", j)):
        return "peringatan", bahaya
    if IMBAU_PEJABAT.search(j):
        return "peringatan", bahaya  # imbauan pejabat/dinas: peringatan walau judul menyebut kondisi
    if not resmi and MASA_DEPAN.search(NEG_POTENSI.sub("", j)):
        return None, "ke depan tanpa sumber resmi"  # 'potensi/prakiraan' tanpa BMKG/BPBD bukan kejadian dan bukan peringatan
    if L["re_kejadian"].search(j):
        if bahaya == "gempa":
            if _gempa_kecil(j):
                return None, "gempa kecil tanpa dampak"
            if not R_ADA_MAG.search(j) and not R_DAMPAK_GEMPA.search(j):
                return None, "gempa tanpa magnitudo dan tanpa dampak"
        return "kejadian", bahaya
    if resmi and L["re_lemah"].search(j):
        return "peringatan", bahaya
    return None, "tanpa kata peringatan/kejadian"


def klasifikasi(judul, ringkas="", asal=None):
    """Coba leksikon `asal` dulu, lalu yang lain. -> (jenis, bencana, bahaya) atau (None, None, alasan)."""
    urut = ([asal] if asal in LEKSIKON else []) + [b for b in LEKSIKON if b != asal]
    alasan = "bukan bahaya"
    for b in urut:
        jenis, h = klas_satu(b, judul, ringkas)
        if jenis:
            return jenis, b, h
        if h != "bukan bahaya " + b:
            alasan = h
    return None, None, alasan


def lokasi(a):
    """[(prov, kab)] dari kab (atau prov bila kab kosong), maks 3; [] bila kosong atau terlalu umum."""
    if a.get("kab"):
        L = [(k.split("|")[0], k.split("|", 1)[1] if "|" in k else "") for k in a["kab"]]
    else:
        L = [(p, "") for p in a.get("prov") or []]
    L = [x for x in dict.fromkeys(L) if x[0] in PROVINSI]
    return L if len(L) <= MAKS_LOKASI else []


def kunci_judul(j):
    return re.sub(r"[^a-z0-9]", "", _n(j))[:70]


def olah(daftar, sekarang, dibuang=None):
    """daftar = [(asal, artikel)] -> baris terklasifikasi, satu per (artikel, lokasi). `dibuang` menampung (judul, alasan)."""
    lihat, batas = set(), sekarang - dt.timedelta(hours=JAM_BAHAN)
    for asal, a in daftar:
        try:
            tgl = dt.datetime.fromisoformat(a["tgl"])
        except (KeyError, ValueError):
            continue
        if tgl < batas or tgl > sekarang + dt.timedelta(hours=1):
            continue  # basi dulu, baru dedup: judul kembar yang basi tidak boleh menelan yang segar
        ks = {a.get("url"), a.get("id"), kunci_judul(a.get("judul", ""))} - {None, ""}
        if ks & lihat:
            continue
        jenis, bencana, bahaya = klasifikasi(a["judul"], a.get("ringkas"), asal)
        locs = lokasi(a) if jenis else []
        if jenis and not locs:
            jenis, bahaya = None, "tanpa lokasi Indonesia"
        if not jenis:
            if dibuang is not None:
                dibuang.append((a["judul"], bahaya))
            continue
        lihat |= ks  # hanya yang diterima menandai kembar; salinan tanpa lokasi tak boleh menelan salinan berlokasi
        a0, z0 = rentang_teks(_n(a["judul"] + " " + (a.get("ringkas") or "")), tgl)
        mulai = a0 or tgl
        dur = JAM_NOWCAST if jenis == "peringatan" and NOWCAST.search(_n(a["judul"] + " " + (a.get("ringkas") or ""))) else DURASI[jenis]
        selesai = max(z0 or tgl + dt.timedelta(hours=dur), mulai)
        for i, loc in enumerate(locs):
            yield dict(a, _jenis=jenis, _bencana=bencana, _bahaya=bahaya, _loc=loc, _tgl=tgl, _mulai=mulai, _selesai=selesai,
                       _tertulis=z0 is not None, _koordinat=i == 0)


def gabung(baris, sekarang):
    grup = {}
    for r in baris:
        grup.setdefault((r["_bencana"], r["_bahaya"], r["_loc"], r["_jenis"]), []).append(r)
    hasil = []
    for (bencana, bahaya, (p, kab), jenis), rs in grup.items():
        rs.sort(key=lambda r: r["_mulai"])
        klaster = []
        for r in rs:  # satu kejadian = mulai berdekatan (<= 36 jam dari anggota pertama)
            if klaster and r["_mulai"] - klaster[-1][0]["_mulai"] <= dt.timedelta(hours=36):
                klaster[-1].append(r)
            else:
                klaster.append([r])
        for k in klaster:
            mulai = min(r["_mulai"] for r in k)
            # selesai tak memanjang dari anggota terbaru + durasi dasar; tanpa rentang tertulis, total <= 72 jam sejak mulai
            tert = [r["_selesai"] for r in k if r["_tertulis"]]
            tak = [r["_selesai"] for r in k if not r["_tertulis"]]
            selesai = max(tert + ([min(max(tak), mulai + dt.timedelta(hours=JAM_MAKS_KLASTER))] if tak else []))
            sumber, media = [], set()
            for r in sorted(k, key=lambda r: r["_tgl"], reverse=True):
                if r["sumber"] not in media and len(sumber) < MAKS_SUMBER:
                    media.add(r["sumber"])
                    sumber.append({"judul": r["judul"], "sumber": r["sumber"], "url": r["url"], "tgl": r["tgl"]})
            ct = Counter(r["judul"] for r in k)
            judul = max(k, key=lambda r: (ct[r["judul"]], r["_tgl"]))["judul"]
            ada = next((r for r in k if r["_koordinat"] and r.get("lat") is not None), None)
            idn = hashlib.sha1(f"{bencana}|{bahaya}|{kab or p}|{jenis}|{mulai.date()}".encode()).hexdigest()[:10]
            hasil.append({
                "id": idn, "bencana": bencana, "jenis": jenis, "bahaya": bahaya, "prov": p, "prov_nama": PROVINSI.get(p, p),
                "kab": kab, "kec": sorted({c for r in k for c in r.get("kec") or []}),
                "lat": ada["lat"] if ada else None, "lon": ada["lon"] if ada else None, "presisi": ada.get("presisi") if ada else None,
                "mulai": mulai.isoformat(timespec="minutes"), "selesai": selesai.isoformat(timespec="minutes"),
                "aktif": selesai > sekarang, "judul": judul, "n_sumber": len({r["sumber"] for r in k}), "sumber": sumber})
    hasil.sort(key=lambda h: (not h["aktif"], h["jenis"] != "peringatan", -h["n_sumber"], h["mulai"]))
    return hasil


def sekarang_wib():
    s = os.environ.get("SEKARANG")
    return dt.datetime.fromisoformat(s).replace(tzinfo=WIB) if s else dt.datetime.now(WIB)


def muat():
    daftar, dibuat = [], None
    for asal, rel in BAHAN:
        jalur = os.path.join(AKAR, rel)
        if not os.path.exists(jalur):
            continue
        d = json.load(open(jalur))
        daftar += [(asal, a) for a in d["artikel"]]
        dibuat = max(dibuat, d["dibuat"]) if dibuat else d["dibuat"]
    return daftar, dibuat


def bangun(sekarang, dibuang=None):
    daftar, dibuat = muat()
    P = gabung(list(olah(daftar, sekarang, dibuang)), sekarang)
    basi = bool(dibuat) and sekarang - dt.datetime.fromisoformat(dibuat).replace(tzinfo=WIB) > dt.timedelta(hours=JAM_BASI)
    return {"dibuat": sekarang.isoformat(timespec="minutes"), "sumber": "Google News, diolah otomatis", "bahan_basi": basi,
            "bahan_dibuat": dibuat,
            "metode": "Judul berita dibaca dengan aturan kata per bencana. Peringatan: kata peringatkan, potensi, peringatan dini, "
                      "waspada, imbau atau sejenisnya dan sumber resmi (BMKG, BPBD, BNPB, PVMBG, pemda) disebut. Kejadian: kata "
                      "kejadian khas bencana (rendam, erupsi, guncang, terbakar, krisis air, dan sejenisnya), bukan berita pencegahan "
                      "atau kebijakan. Berita tanpa lokasi di Indonesia dibuang, lokasi tidak ditebak. Rentang tanggal dari judul; "
                      "tanpa itu peringatan berlaku 48 jam dan kejadian 24 jam sejak berita terbit. Beberapa media satu kejadian "
                      "digabung. Belum diverifikasi.",
            "peringatan": P}


def simpan(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def main():
    h = bangun(sekarang_wib())
    simpan(os.path.join(KELUAR, "peringatan_berita.json"), h)
    c = Counter((x["bencana"], x["jenis"]) for x in h["peringatan"])
    print(f"peringatan_berita.json: {len(h['peringatan'])} entri ({sum(x['aktif'] for x in h['peringatan'])} aktif), "
          f"basi={h['bahan_basi']}, {dict(c)}", file=sys.stderr)


def contoh():
    s, dibuang = sekarang_wib(), []
    h = bangun(s, dibuang)
    P = h["peringatan"]
    print("sekarang", s.isoformat(timespec="minutes"), "bahan_dibuat", h["bahan_dibuat"], "basi", h["bahan_basi"])
    print("entri", len(P), "aktif", sum(x["aktif"] for x in P))
    print("bencana x jenis:")
    for (b, j), n in sorted(Counter((x["bencana"], x["jenis"]) for x in P).items()):
        print(f"  {b:11s} {j:10s} {n}")
    print("\n2 contoh entri per bencana:")
    for b in LEKSIKON:
        for x in [x for x in P if x["bencana"] == b][:2]:
            print(f"- [{b}/{x['jenis']}/{x['bahaya']}] {x['kab'] or '-'}, {x['prov_nama']} | {x['mulai']} -> {x['selesai']} "
                  f"aktif={x['aktif']} n={x['n_sumber']} | {x['judul'][:100]}")
    random.seed(7)
    print(f"\n10 artikel dibuang acak (dari {len(dibuang)}):")
    for j, why in random.sample(dibuang, min(10, len(dibuang))):
        print(f"- ({why}) {j[:110]}")


def uji():
    sek = dt.datetime(2026, 10, 21, 12, tzinfo=WIB)
    k = klasifikasi
    POS = [  # (judul, asal, jenis, bencana, bahaya)
        ("BMKG Peringatkan Potensi Banjir Rob di Medan Utara 23-31 Oktober 2026", "banjir", "peringatan", "banjir", "rob"),
        ("Banjir Rendam Tiga Desa di Aceh Tenggara", "banjir", "kejadian", "banjir", "banjir"),
        ("Banjir Kembali Kepung Desa Sekoci", "banjir", "kejadian", "banjir", "banjir"),
        ("BPBD Imbau Warga Waspada Longsor", "banjir", "peringatan", "banjir", "longsor"),
        ("Longsor Timpa Rumah Warga di Subang", "banjir", "kejadian", "banjir", "longsor"),
        ("Puting Beliung Terjang Dua Desa di Toba", "cuaca", "kejadian", "cuaca", "puting_beliung"),
        ("BMKG Peringatkan Hujan Lebat dan Angin Kencang di Riau", "cuaca", "peringatan", "cuaca", "angin_kencang"),
        ("Gempa M5,2 Guncang Cianjur, Warga Berhamburan", "gempa", "kejadian", "gempa", "gempa"),
        ("BMKG Terbitkan Peringatan Dini Tsunami Usai Gempa M7,1", "gempa", "peringatan", "gempa", "gempa"),
        ("Gunung Semeru Erupsi, Abu Vulkanik Hujani Lumajang", "gunungapi", "kejadian", "gunungapi", "gunungapi"),
        ("PVMBG Naikkan Status Gunung Lewotobi Jadi Awas, Imbau Warga Jauhi Radius 7 Km", "gunungapi", "peringatan", "gunungapi", "gunungapi"),
        ("Karhutla Landa Kalimantan Tengah, 50 Hektare Lahan Terbakar", "karhutla", "kejadian", "karhutla", "karhutla"),
        ("BPBD Riau Siaga Karhutla, Titik Panas Meningkat", "karhutla", "peringatan", "karhutla", "karhutla"),
        ("Kekeringan Landa Gunungkidul, Warga Alami Krisis Air Bersih", "kekeringan", "kejadian", "kekeringan", "kekeringan"),
        ("BMKG Peringatan Dini Kekeringan, Hari Tanpa Hujan Ekstrem Panjang di NTT", "kekeringan", "peringatan", "kekeringan", "kekeringan"),
        ("Kabut Asap Pekat Selimuti Pekanbaru, ISPU Tidak Sehat", "udara", "kejadian", "udara", "kabut_asap"),
        ("Dinkes Imbau Warga Pakai Masker Saat Kabut Asap di Jambi", "udara", "peringatan", "udara", "kabut_asap"),
    ]
    for judul, asal, jn, bc, bh in POS:
        assert k(judul, "", asal) == (jn, bc, bh), (judul, k(judul, "", asal))
    NEG = [  # (judul, asal): harus dibuang
        ("Cegah Banjir, BPBD Kota Madiun Gencar Bersihkan Aliran Sungai", "banjir"),
        ("Normalisasi Sungai untuk Atasi Banjir Bandung Raya", "banjir"),
        ("Waspada Banjir! Hari Ini Sumbar Diguyur Hujan", "banjir"),
        ("Pemerintah Bangun Huntap Bagi Penyintas Banjir Aceh", "banjir"),
        ("Persib Menang Telak di Kandang", "cuaca"),
        ("Waspada Potensi Angin Kencang Terjang Jawa hingga NTT pada 13-19 Oktober", "cuaca"),   # ke depan tanpa sumber resmi
        ("Ahli Prediksi Gempa Besar Akan Guncang Jawa Bulan Depan", "gempa"),               # ramalan non-BMKG
        ("Simulasi Gempa dan Mitigasi Bencana di Sekolah Padang", "gempa"),
        ("Wisata Gunung Bromo Dibuka Kembali untuk Pendaki", "gunungapi"),
        ("Komisi IV DPR Desak Evaluasi Perizinan Sawit Usai Karhutla", "karhutla"),
        ("Korporasi Jadi Tersangka Kasus Karhutla di Riau", "karhutla"),
        ("Pemerintah Siapkan Anggaran Rp5 Miliar Atasi Kekeringan", "kekeringan"),
        ("Pemkot Luncurkan Aplikasi Pemantau Kualitas Udara", "udara"),
    ]
    for judul, asal in NEG:
        assert k(judul, "", asal)[0] is None, (judul, k(judul, "", asal))
    assert k("Gempa M4,1 di Bantul, BMKG: Tidak Berpotensi Tsunami", "", "gempa")[0] == "kejadian"  # 'tidak berpotensi' bukan peringatan
    assert k("Kualitas Udara Natuna Membaik, Kabut Asap Mulai Hilang", "", "udara")[0] is None  # sudah reda
    assert k("Gunung Merapi belum Menunjukkan Aktivitas Vulkanik, Jumlah Gempa Guguran Turun", "", "gunungapi")[0] is None  # tenang
    assert k("Gempa Magnitudo 2,3 Tercatat di Barat Kota Bogor", "", "gempa")[0] is None  # gempa kecil rutin
    assert k("Gempa M3,6 Guncang Garut, Rumah Warga Retak", "", "gempa")[0] == "kejadian"  # kecil tapi berdampak
    assert k("Gempa M6 Guncang Aceh, BMKG: Tidak Berpotensi Tsunami", "", "banjir")[1] == "gempa"  # cadangan lintas leksikon
    # 1. halaman katalog/agregator gempa dibuang; gempa bermagnitudo/berdampak tetap
    for judul in ("Gempa Terkini di Gorontalo Siang Ini Rabu 14 Oktober 2026, Berikut Info BMKG",
                  "Gempa bumi hari ini: gempa bumi terbaru di atau dekat Kabupaten Keerom ... 30 hari terakhir",
                  "Daftar Gempa Hari Ini di Sumatra Barat", "Gempa Guncang Cianjur Malam Ini"):
        assert k(judul, "", "gempa")[0] is None, (judul, k(judul, "", "gempa"))
    assert k("Gempa M5,2 Guncang Cianjur", "", "gempa")[0] == "kejadian"
    assert k("Gempa Guncang Cianjur, Rumah Warga Rusak", "", "gempa")[0] == "kejadian"
    # 2. politik/kebijakan/iklan/sudah reda dibuang; imbauan pejabat = peringatan; kondisi terukur = kejadian
    for judul, asal in (("Syarif Abdullah Temui Edi Kamtono, Bahas Krisis Air Bersih di Pontianak", "kekeringan"),
                        ("Pemprov Riau Diminta Ambil Langkah Nyata Hadapi Kabut Asap", "udara"),
                        ("Tangkal Kabut Asap di Palembang, Central Elektro Hadirkan Promo AC Daikin", "udara"),
                        ("Soal Karhutla, MUI Mimika Minta Penceramah Ingatkan Jemaah", "karhutla"),
                        ("IJTI Kepri Bahas Blackout Akibat Kabut Asap", "udara"),
                        ("MHH PWM Kalbar: Gubernur Gagal Lindungi Warga dari Kabut Asap Karhutla", "karhutla"),
                        ("Karhutla Gunung Lokon Padam", "karhutla"), ("Kabut Asap di Natuna Berangsur Hilang", "udara"),
                        ("BMKG Ungkap Potensi Hujan pada 9–15 Oktober", "kekeringan"),
                        ("IHSG Longsor 3 Persen Tertekan Aksi Jual Asing", "banjir"),
                        ("Pendaki Tewas di Gunung Rinjani Usai Terpeleset", "gunungapi"), ("Truk Terguling di Jalan Gunung Sindur, Sopir Tewas", "gunungapi"),
                        ("Gudang Plastik di Cakung Terbakar, Api Cepat Membesar", "karhutla"), ("Warung dan Kapal Nelayan Terbakar di Pelabuhan Tegal", "karhutla"),
                        ("Rumah Warga Terbakar di Tengah Kabut Pagi Palangka Raya", "karhutla"),
                        ("Wali Kota Merapat ke Warga Terdampak, Kasus Meninggalkan Luka", "banjir")):
        assert k(judul, "", asal)[0] is None, (judul, k(judul, "", asal))
    assert k("Berikut 10 Provinsi Dengan Indeks Kualitas Udara Terburuk di Indonesia", "", "udara")[0] is None
    assert k("Update BMKG: Peta Sebaran Wilayah dengan Kualitas Udara Terburuk Hari Ini", "", "udara")[0] is None
    assert k("Kualitas Udara Memburuk Akibat Karhutla, Kendari Tetapkan Sekolah Daring", "", "udara")[0] == "kejadian"
    assert k("Dinkes Babel Imbau Warga Terkait Kabut Asap", "", "udara")[:2] == ("peringatan", "udara")
    assert k("Dinkes Babel Imbau Warga Terkait Kabut Asap", "", "karhutla")[0] == "peringatan"
    assert k("Wali Kota Imbau Warga Jauhi Lokasi Banjir Rendam Permukiman", "", "banjir")[0] == "peringatan"
    assert k("Kualitas Udara Lampung Masuk Kategori Tidak Sehat, Warga Diminta Waspada", "", "udara")[0] == "kejadian"
    assert k("Banjir Rendam Rumah Warga, Pemkab Salurkan Bantuan", "", "banjir")[0] == "kejadian"  # kata kejadian kuat menang atas bantuan
    assert k("Pemkab Salurkan Bantuan untuk Warga Terdampak Banjir", "", "banjir")[0] is None
    # 3. batas kata
    assert k("Pendaki Tewas di Gunung Rinjani", "", "gunungapi")[1] != "gunungapi"
    assert k("Gunung Semeru Erupsi", "", "gunungapi")[:2] == ("kejadian", "gunungapi")
    assert k("Status Lewotobi Naik Awas, PVMBG Imbau Warga Jauhi Radius 7 Km", "", "gunungapi")[:2] == ("peringatan", "gunungapi")
    assert k("Lahan Gambut 20 Hektare Terbakar di Ogan Ilir", "", "karhutla")[:2] == ("kejadian", "karhutla")
    assert k("Kebun Sawit Terbakar, Api Melahap Puluhan Hektare", "", "karhutla")[:2] == ("kejadian", "karhutla")
    assert k("Warga Meninggalkan Rumah Terendam", "", "banjir")[0] == "kejadian" and not re_kej_kuat.search("meninggalkan rumah")
    assert not MASA_DEPAN.search("rapat") and not re.search(BUANG_KERAS, "kapal merapat ke dermaga") and re.search(BUANG_KERAS, "rapat koordinasi")
    assert not re.search(KEJ_UMUM, "meninggalkan lokasi") and re.search(KEJ_UMUM, "korban meninggal dunia")
    t = lambda s_, tg=dt.datetime(2026, 10, 21, 8, tzinfo=WIB): rentang_teks(_n(s_), tg)
    a, z = t("bmkg peringatkan banjir rob di medan utara 23-31 oktober 2026")
    assert (a.day, a.month, z.day, z.month, z.hour) == (23, 10, 31, 10, 23), (a, z)
    a, z = t("rob 23 hingga 31 oktober"); assert (a.day, z.day) == (23, 31)
    a, z = t("rob 28 oktober - 2 november 2026"); assert (a.month, z.month, z.day) == (10, 11, 2)
    a, z = t("waspada banjir hingga 25 oktober"); assert a.day == 21 and z.day == 25
    a, z = t("hujan lebat tiga hari ke depan"); assert (z - a).days == 3
    assert t("banjir rendam desa") == (None, None)
    # 4. tahun: satu aturan (paling dekat ke tgl terbit) untuk rentang dan "hingga"
    des = dt.datetime(2026, 12, 30, 8, tzinfo=WIB)
    a, z = t("waspada rob 2-5 januari", des); assert (a.year, a.month, z.year, z.month, z.day) == (2027, 1, 2027, 1, 5), (a, z)
    a, z = t("rob 28 desember - 3 januari", dt.datetime(2026, 12, 28, 8, tzinfo=WIB)); assert (a.year, z.year, z.month) == (2026, 2027, 1), (a, z)
    a, z = t("rob hingga 2 januari", des); assert z.year == 2027 and a == des
    okt = dt.datetime(2026, 10, 16, 8, tzinfo=WIB)
    a, z = t("waspada banjir hingga 10 oktober", okt); assert z.year == 2026 and z < okt, z  # lampau = tahun ini, sudah lewat
    a, z = t("waspada banjir 8-10 oktober", okt); assert (a.year, z.year) == (2026, 2026)
    assert t("banjir 25-5 oktober", okt) == (None, None)
    # 5. masa berlaku: nowcast 6 jam, gabungan klaster maks 72 jam kecuali rentang tertulis
    sek5 = dt.datetime(2026, 10, 21, 12, tzinfo=WIB)
    def a5(i, judul, tgl):
        return ("banjir", {"id": f"n{i}", "judul": judul, "sumber": f"N{i}", "url": f"n{i}", "tgl": tgl, "prov": ["12"], "kab": ["12|Kota Medan"], "kec": [], "lat": 3.7, "lon": 98.7, "presisi": "kab"})
    P5 = gabung(list(olah([a5(1, "BMKG Peringatkan Potensi Hujan Lebat Siang Ini di Medan", "2026-10-21T10:00+07:00")], sek5)), sek5)
    assert P5[0]["selesai"].startswith("2026-10-21T16:00") and P5[0]["aktif"], P5
    P5 = gabung(list(olah([a5(2, "BMKG Peringatkan Potensi Banjir Medan Hari Ini", "2026-10-21T04:00+07:00")], sek5)), sek5)
    assert P5[0]["selesai"].startswith("2026-10-21T10:00") and not P5[0]["aktif"], P5  # +6 jam, bukan +48
    P5 = gabung(list(olah([a5(3, "BMKG Peringatkan Potensi Banjir di Medan", "2026-10-21T04:00+07:00")], sek5)), sek5)
    assert P5[0]["selesai"].startswith("2026-10-23T04:00") and P5[0]["aktif"], P5  # tanpa kata nowcast tetap +48
    P5 = gabung(list(olah([("banjir", dict(r, judul=f"BMKG Peringatkan Potensi Banjir Medan Edisi {i}", sumber=f"M{i}", url=f"r{i}", id=f"r{i}", tgl=tg))
                           for i, tg in enumerate(("2026-10-19T08:00+07:00", "2026-10-20T04:00+07:00", "2026-10-20T20:00+07:00"))
                           for r in [a5(0, "", "")[1]]], dt.datetime(2026, 10, 21, 0, tzinfo=WIB))), dt.datetime(2026, 10, 21, 0, tzinfo=WIB))
    assert len(P5) == 1 and P5[0]["selesai"].startswith("2026-10-22T08:00"), P5[0]  # klaster 3 anggota (tanpa cap: 22T20:00): maks mulai + 72 jam
    P5 = gabung(list(olah([a5(4, "BMKG Peringatkan Potensi Banjir Medan 23-31 Oktober 2026", "2026-10-21T04:00+07:00")], sek5)), sek5)
    assert P5[0]["selesai"].startswith("2026-10-31T23:59"), P5  # rentang tertulis tidak dipotong

    def art(i, judul, tgl, **o):
        return {"id": f"i{i}", "judul": judul, "sumber": o.pop("sumber", f"M{i}"), "url": o.pop("url", f"u{i}"), "tgl": tgl,
                "prov": ["12"], "kab": ["12|Kota Medan"], "kec": [], "lat": 3.7, "lon": 98.7, "presisi": "kab", **o}
    A = [("banjir", art(1, "BMKG Peringatkan Potensi Banjir Rob di Medan Utara 23-31 Oktober 2026", "2026-10-21T07:00+07:00")),
         ("banjir", art(2, "Waspada Banjir Rob Medan Utara 23-31 Oktober, BMKG Ingatkan Warga", "2026-10-21T09:00+07:00")),
         ("banjir", art(3, "Banjir Rendam Tiga Desa di Aceh Tenggara", "2026-10-21T06:00+07:00", prov=["11"], kab=["11|Aceh Tenggara"])),
         ("cuaca", art(4, "Banjir Rendam Tiga Desa di Aceh Tenggara, Ratusan Warga Mengungsi", "2026-10-21T10:00+07:00", prov=["11"], kab=["11|Aceh Tenggara"])),
         ("banjir", art(5, "Banjir Kembali Kepung Desa Sekoci", "2026-10-18T06:00+07:00", prov=["14"], kab=[])),   # > 72 jam
         ("banjir", art(6, "Banjir Kembali Kepung Desa Sekoci", "2026-10-20T06:00+07:00", prov=[], kab=[])),      # tanpa lokasi
         ("banjir", art(7, "Banjir Kembali Kepung Desa Sekoci", "2026-10-20T06:00+07:00", prov=["14"], kab=["14|Kampar"])),
         ("banjir", art(8, "Cegah Banjir, Warga Bersihkan Saluran", "2026-10-21T06:00+07:00")),
         ("udara", art(9, "Karhutla Landa Kalimantan Tengah, 50 Hektare Lahan Terbakar", "2026-10-21T06:00+07:00", prov=["62"], kab=[])),
         ("karhutla", art(10, "Karhutla Landa Kalimantan Tengah, 50 Hektare Lahan Terbakar", "2026-10-21T06:30+07:00", prov=["62"], kab=[], url="u10")),  # kembar lintas berkas
         ("karhutla", art(11, "Kabut Asap Selimuti Kalimantan dan Papua", "2026-10-21T06:00+07:00", prov=["62", "61", "91", "92"], kab=[]))]  # terlalu umum
    dib = []
    P = gabung(list(olah(A, sek, dib)), sek)
    assert len(P) == 4 and len(dib) == 3, (len(P), dib)  # dibuang: no.6 tanpa lokasi, no.8 pencegahan, no.11 terlalu umum (4 prov)
    pr = next(x for x in P if x["jenis"] == "peringatan")
    assert pr["bencana"] == "banjir" and pr["bahaya"] == "rob" and pr["n_sumber"] == 2 and pr["aktif"] and pr["mulai"].startswith("2026-10-23"), pr
    assert pr["selesai"].startswith("2026-10-31T23:59") and pr["kab"] == "Kota Medan" and pr["prov_nama"] == "Sumatera Utara"
    ke = next(x for x in P if x["kab"] == "Aceh Tenggara")
    assert ke["jenis"] == "kejadian" and ke["n_sumber"] == 2 and ke["selesai"].startswith("2026-10-22T10:00") and ke["aktif"], ke
    sk = next(x for x in P if x["kab"] == "Kampar")
    assert sk["selesai"].startswith("2026-10-21T06:00") and not sk["aktif"]  # +24 jam dari 20 Okt 06.00 sudah lewat
    kh = [x for x in P if x["bencana"] == "karhutla"]
    assert len(kh) == 1 and kh[0]["n_sumber"] == 1, kh  # artikel kembar lintas berkas = satu entri
    assert pr["id"] in {x["id"] for x in gabung(list(olah(A, sek)), sek)}  # id stabil antarlari
    assert set(LEKSIKON) == {"banjir", "cuaca", "gempa", "gunungapi", "karhutla", "kekeringan", "udara"}
    print("ok peringatan_berita")


if __name__ == "__main__":
    {"uji": uji, "contoh": contoh}.get(sys.argv[1] if sys.argv[1:] else "", main)()
