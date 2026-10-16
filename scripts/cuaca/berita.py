"""Leksikon berita cuaca ekstrem: kueri, relevansi, topik. Mesin: scripts/umum/berita.py (dimuat sebagai pustaka).

Tidak ada workflow cuaca/udara (token tak bisa mendorong .github/workflows), jadi berita dijalankan tangan lalu berkasnya di-commit:
  python3 scripts/cuaca/berita.py          panen RSS -> public/cuaca/data/berita.json (arsip mentah data/raw/cuaca/berita, tidak dilacak git)
  python3 scripts/cuaca/berita.py ulang    olah ulang arsip tanpa RSS
  python3 scripts/cuaca/berita.py uji      self-check relevansi (offline)
`dibuat` di berkas keluaran = jam panen, dan layar menampilkannya apa adanya.
Sentimen tidak punya label uji: SENTIMEN_TERUJI False, layar tidak menampilkan nada.
"""
import os
import re
import sys

_AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(_AKAR, "scripts/umum"))
import importlib.util  # noqa: E402


def _muat(rel, nama):
    if nama in sys.modules:
        return sys.modules[nama]
    sp = importlib.util.spec_from_file_location(nama, os.path.join(_AKAR, rel))
    m = importlib.util.module_from_spec(sp); sys.modules[nama] = m; sp.loader.exec_module(m)
    return m


_u = _muat("scripts/umum/berita.py", "umum_berita")
norm = _u.norm
PROVINSI = _muat("scripts/banjir/wilayah.py", "banjir_wilayah").PROVINSI

ID = "cuaca"
DATA = "public/banjir/data"   # folder yang ikut cache + terbit banjir.yml (public/cuaca/data ditimpa checkout main saat terbit)
KELUAR = "berita_cuaca.json"
RAW = "data/raw/banjir/berita_cuaca"   # di bawah folder yang sudah ikut cache banjir.yml
JENDELA_HARI = 120
SENTIMEN_TERUJI = False

KUERI_UMUM = ["cuaca ekstrem", "puting beliung", "angin kencang", "hujan lebat", "hujan es", "gelombang tinggi", "peringatan dini cuaca BMKG",
              "BMKG cuaca ekstrem", "pohon tumbang", "badai petir", "siklon tropis", "hujan petir"]


def kueri():
    return [(q, "umum") for q in KUERI_UMUM] + [(f"cuaca ekstrem {PROVINSI[p].replace('Kep. ', 'Kepulauan ')}", p) for p in PROVINSI]


# ---------------------------------------------------------------- relevansi
R_KUAT = re.compile(r"\b(cuaca ekstrem|cuaca ekstrim|puting beliung|angin puting beliung|angin kencang|angin topan|badai petir|badai tropis|siklon|"
                    r"hujan lebat|hujan deras|hujan es|hujan petir|hujan angin|gelombang tinggi|gelombang laut|peringatan dini cuaca|petir|"
                    r"hujan ekstrem|angin ribut|pohon tumbang|waterspout|tornado)\b")
# kiasan dan topik lain yang memakai kata yang sama
R_KIASAN = re.compile(r"\b(badai|petir|puting beliung|hujan) (phk|pemain|klub|gol|cedera|inflasi|krisis|ekonomi|politik|kritik|kecaman|hujatan|skandal|"
                      r"diskon|promo|bonus|pujian|ucapan|dukungan|hadiah|doa|penonton|likes|komentar|pesanan|order|peminat|investasi|klaim)\b|"
                      r"\b(saham|ihsg|rupiah|harga|politik|ekonomi|kabinet|bursa) (\w+ )?(badai|petir)\b|\bbadai (pasti berlalu|phk|kritik|cedera)\b|"
                      r"\b(film|serial|drama|konser|gim|game|lagu|album|band|grup|tim) (\w+ )?(petir|badai|puting beliung)\b|"
                      r"\b(petir|badai) (band|grup|tim|fc|united)\b|\bthunder\b")
R_KEUANGAN = re.compile(r"\b(ihsg|saham|bursa|trading halt|rupiah|obligasi|kripto|bitcoin)\b")
R_ASING = re.compile(r"\b(ho chi minh|hanoi|manila|bangkok|kuala lumpur|beijing|shanghai|tokyo|seoul|delhi|mumbai|dhaka|karachi|lahore|kathmandu|taipei|sydney|melbourne|london|new york|paris|dubai|houston|miami|pakistan|india|bangladesh|china|tiongkok|jepang|korea|filipina|vietnam|thailand|myanmar|nepal|afghanistan|"
                     r"libya|maroko|nigeria|kenya|sudan|brasil|amerika|texas|florida|california|eropa|jerman|spanyol|italia|prancis|inggris|australia|"
                     r"brisbane|queensland|afrika|turki|iran|yaman|meksiko|taiwan|hong kong|selandia baru|kanada|rusia|ukraina|mozambik|malaysia|singapura)\b")
R_INDONESIA = re.compile(r"\b(indonesia|bnpb|bpbd|bmkg|basarnas|tagana|pemkab|pemkot|pemprov|polres|kabupaten|kota|kecamatan|desa|kelurahan)\b")


# judul tempelan SEO/spam: token acak di kurung yang tak tertutup ("... Cathie Wood Ai Stock Trades (HqE3bZsvON")
R_SPAM = re.compile(r"\((?=[A-Za-z0-9]*\d)[A-Za-z0-9]{5,}(?:\s|$)|\bstock trades\b", re.I)


def relevan(teks, geo=None):
    """(bool, alasan). Lolos bila ada kata cuaca ekstrem yang bukan kiasan; berita negara lain dibuang kecuali menyebut tempat atau lembaga Indonesia."""
    if R_SPAM.search(teks):
        return False, "spam"
    t = norm(teks)
    if R_KIASAN.search(t) or R_KEUANGAN.search(t):
        return False, "kiasan"
    kuat = R_KUAT.search(t)
    if not kuat:
        return False, "tanpa kata cuaca ekstrem"
    indo = R_INDONESIA.search(t) or (geo and (geo["prov"] or geo["kab"]))
    if R_ASING.search(t) and not indo:
        return False, "luar negeri"
    return True, kuat.group(0)


# ---------------------------------------------------------------- topik
TOPIK = {
    "kejadian": r"\bputing beliung|\bangin kencang|\bhujan lebat|\bhujan deras|\bhujan es|\bpetir|\bbadai|\bsiklon|\bangin topan|\bangin ribut|\bwaterspout",
    "korban": r"\btewas|\bmeninggal|\bkorban|\bhilang\b|\bmengungsi|\bpengungsi|\bluka|\btersambar|\btertimpa|\bterjebak",
    "kerusakan": r"\brusak|\broboh|\bambruk|\btumbang|\batap|\bterbang|\blistrik padam|\bpadam|\bbaliho|\bporak poranda|\bterendam|\blongsor",
    "bantuan": r"\bevakuasi|\bbpbd\b|\bbasarnas|\bsar\b|\btagana|\bposko|\bdapur umum|\bbantuan|\bsalurkan|\bdisalurkan|\btni\b|\bpolri\b|\bpmi\b|\bbnpb\b|\btanggap darurat",
    "peringatan": r"\bbmkg|\bperingatan dini|\bprakiraan|\bwaspada|\bimbau|\bnowcast|\bpotensi|\bberpotensi|\bdiprakirakan",
    "laut": r"\bgelombang|\bpelayaran|\bnelayan|\bkapal|\bpelabuhan|\bpenyeberangan|\bfery|\bferi|\bditutup",
    "mitigasi": r"\bmitigasi|\bkesiapsiagaan|\bsimulasi|\bedukasi|\bantisipasi|\bpangkas pohon|\bhoaks",
}
TOPIK_RE = _u.buat_topik(TOPIK)

# ---------------------------------------------------------------- sentimen (leksikon awal, tidak ditampilkan)
SITUASI = {
    "tewas": -2, "meninggal": -2, "korban jiwa": -2, "korban": -1, "hilang": -1.5, "mengungsi": -1.5, "pengungsi": -1, "roboh": -2, "ambruk": -2,
    "rusak": -1.5, "tersambar": -2, "tumbang": -1.5, "terjebak": -1.5, "parah": -1.5, "porak poranda": -2,
    "aman": 1, "normal": 1, "pulih": 2, "kembali normal": 2, "teratasi": 2, "berkurang": 1.5, "mereda": 1.5, "cerah": 1,
}
RESPONS = {
    "sigap": 2, "cepat": 1, "tanggap": 1.5, "salurkan": 1.5, "disalurkan": 1.5, "bantuan": 1, "berhasil": 2, "diselamatkan": 1.5, "evakuasi": 0.5, "posko": 0.5,
    "lamban": -2, "terlambat": -2, "kritik": -2, "dikritik": -2, "abai": -2, "diabaikan": -2, "gagal": -2, "minim": -1.5,
}

METODE = {
    "sumber": "Google News RSS (hl=id, gl=ID), kueri umum (cuaca ekstrem, puting beliung, angin kencang, hujan lebat, gelombang tinggi...) + 'cuaca ekstrem <provinsi>' untuk 38 provinsi, when:7d, sekitar 1 permintaan per detik. Hanya judul dan cuplikan RSS; hak cipta tetap pada penerbit.",
    "arsip": f"Arsip bergulir {JENDELA_HARI} hari. Duplikat dibuang bila tautannya sama atau media yang sama memuat judul berkata-kata sama.",
    "relevansi": "Lolos bila memuat kata cuaca ekstrem (puting beliung, angin kencang, hujan lebat, hujan es, gelombang tinggi, petir, siklon). Kiasan (badai PHK, petir sebagai nama grup) dan berita negara lain yang tidak menyebut tempat atau lembaga di Indonesia dibuang.",
    "geocoding": "Nama provinsi, kabupaten/kota, dan kecamatan dicocokkan di judul dan cuplikan, frasa terpanjang dulu.",
    "cerita": "Artikel dalam 72 jam dikelompokkan jadi satu cerita bila kemiripan kata judul (Jaccard) >= 0,5, atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama.",
    "topik": "Multi-label dengan kata kunci: kejadian, korban, kerusakan, bantuan, peringatan, laut, mitigasi.",
    "sentimen": "Leksikon awal tanpa label uji manusia, tidak ditampilkan di layar (sentimen_teruji: false).",
    "batas": "Google News RSS maksimal 100 item per kueri dan bukan arsip lengkap; tidak ada workflow cuaca, berkas ini diperbarui tangan (lihat `dibuat`).",
}


def uji():
    assert relevan("Puting beliung terjang Cianjur, puluhan rumah rusak, BPBD siagakan posko")[0]
    assert relevan("BMKG: hujan lebat disertai petir berpotensi di Jawa Barat")[0]
    assert relevan("Gelombang tinggi 4 meter, nelayan Sulawesi dilarang melaut")[0]
    assert not relevan("Saham GOTO badai PHK jelang akhir tahun")[0]
    assert not relevan("Petir FC kalahkan tim tamu 3-1")[0]
    assert not relevan("Hujan lebat hantam Texas, ribuan warga mengungsi")[0]
    assert not relevan("Gempa M 5 guncang Bogor")[0]
    assert "korban" in [k for k, r in TOPIK_RE.items() if r.search(norm("3 korban meninggal tersambar petir"))]
    assert not relevan("Waspada! Cuaca Ekstrem Kamis, 17 Wilayah Terancam Hujan Lebat Nicolas Roy (NF2fj8 abc")[0] and relevan("Hujan lebat (BMKG) landa Riau")[0]
    print("berita cuaca: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    else:
        _u.jalankan(sys.modules[__name__], ambil_rss="ulang" not in a, isi_hari=0)
