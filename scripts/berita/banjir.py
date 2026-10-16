"""Leksikon berita banjir, longsor, dan rob: kueri, relevansi, topik, sentimen. Mesin: scripts/umum/berita.py.

Pakai:  python3 scripts/umum/berita.py banjir          panen RSS -> public/banjir/data/berita.json
        python3 scripts/umum/berita.py banjir uji      relevansi pada tangkapan feed tersimpan (offline)

Sentimen banjir BELUM punya label uji manusia, jadi SENTIMEN_TERUJI = False dan layar menyembunyikan kartu sentimen.
Kosakata mengikuti docs/multi-bencana/COPYWRITING.md §5 (kolom banjir/longsor/rob).
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

ID = "banjir"
DATA = "public/banjir/data"
RAW = "data/raw/banjir/berita"  # folder yang sudah ikut cache banjir.yml
JENDELA_HARI = 120
SENTIMEN_TERUJI = False

KUERI_UMUM = ["banjir", "banjir bandang", "tanah longsor", "longsor", "banjir rob", "rob pesisir", "banjir hari ini",
              "BPBD banjir", "pengungsi banjir", "siaga banjir", "peringatan dini banjir BMKG", "status tanggap darurat banjir"]


def kueri():
    return [(q, "umum") for q in KUERI_UMUM] + [(f"banjir {PROVINSI[p].replace('Kep. ', 'Kepulauan ')}", p) for p in PROVINSI]


# ---------------------------------------------------------------- relevansi
R_KUAT = re.compile(r"\b(banjir|longsor|longsoran|air pasang|pasang laut|luapan sungai|sungai meluap|tanggul jebol|pergerakan tanah|tanah bergerak)\b")
# "rob" sendirian terlalu longgar (nama orang, "Rob Reiner"): wajib ditemani kata pesisir/air
R_ROB = re.compile(r"\brob\b")
R_ROB_KONTEKS = re.compile(r"\b(banjir|pesisir|pasang|terendam|genangan|tanggul|air laut|melanda|landa|rendam|warga|permukiman|pantai|pelabuhan|jalan|rumah)\b")
# kiasan dan topik lain yang memakai kata yang sama
R_KIASAN = re.compile(r"\b(banjir|longsor) (diskon|promo|bonus|pujian|ucapan|dukungan|kritik|komentar|order|pesanan|hadiah|doa|penonton|likes|"
                      r"gol|kecaman|protes|tawaran|klaim|curhat|peminat|investasi|impor|uang|suara|air mata|bunga|karangan|dana|penghargaan|"
                      r"informasi|data|notifikasi|laporan|aduan|lamaran|pelamar|cuan)\b|"
                      r"\b(saham|ihsg|rupiah|elektabilitas|suara|dukungan|harga) (\w+ )?longsor\b|\blongsor (saham|ihsg|rupiah|elektabilitas|harga|suara)\b|"
                      r"\b(ekonom|ekonomi|tarif) banjir\b|\bbanjir (dukungan|suara|kritik)\b")
R_KEUANGAN = re.compile(r"\b(ihsg|saham|bursa|trading halt|rupiah|obligasi|kripto|bitcoin)\b")  # "IHSG longsor 8%"
R_ASING = re.compile(r"\b(pakistan|india|bangladesh|china|tiongkok|jepang|korea|filipina|vietnam|thailand|myanmar|nepal|afghanistan|"
                     r"libya|nigeria|kenya|sudan|brasil|amerika|texas|florida|eropa|jerman|spanyol|italia|prancis|inggris|australia|"
                     r"brisbane|queensland|afrika|turki|iran|yaman|malaysia|singapura)\b")
R_INDONESIA = re.compile(r"\b(indonesia|bnpb|bpbd|basarnas|tagana|pemkab|pemkot|pemprov|polres|kabupaten|kota|kecamatan|desa|kelurahan)\b")


def relevan(teks, geo=None):
    """(bool, alasan). Lolos bila ada kata banjir/longsor/rob yang bukan kiasan; berita negara lain dibuang
    kecuali menyebut tempat atau lembaga di Indonesia."""
    t = norm(teks)
    if R_KIASAN.search(t) or R_KEUANGAN.search(t):
        return False, "kiasan"
    kuat = R_KUAT.search(t)
    if not kuat and not (R_ROB.search(t) and R_ROB_KONTEKS.search(R_ROB.sub(" ", t))):
        return False, "tanpa kata banjir/longsor/rob"
    indo = R_INDONESIA.search(t) or (geo and (geo["prov"] or geo["kab"]))
    if R_ASING.search(t) and not indo:
        return False, "luar negeri"
    return True, kuat.group(0) if kuat else "rob"


# ---------------------------------------------------------------- topik
TOPIK = {
    "kejadian": r"\bbanjir|\blongsor|\brob\b|\bmeluap|\bluapan|\btergenang|\bgenangan|\bterendam|\bbandang|\bjebol|\bpasang|\bsurut|\bmerendam|\bditerjang|\bdilanda",
    "korban": r"\btewas|\bmeninggal|\bkorban|\bhilang\b|\bmengungsi|\bpengungsi|\bterisolasi|\bluka|\bterjebak|\btertimbun|\bditemukan",
    "penanganan": r"\bevakuasi|\bpompa|\bbpbd\b|\bbasarnas|\bsar\b|\btagana|\bposko|\bdapur umum|\bperahu|\bbantuan|\bsalurkan|\bdisalurkan|\btni\b|\bpolri\b|\bpmi\b|\bbnpb\b|\bnormalisasi|\bpengerukan",
    "cuaca": r"\bhujan|\bbmkg|\bcurah|\bcuaca|\bsiklon|\bla nina|\bperingatan dini|\bpasang|\bgelombang|\bmusim",
    "infrastruktur": r"\bjalan\b|\bjembatan|\bputus|\blumpuh|\brel\b|\btol\b|\blistrik|\bsekolah|\brumah|\bbendungan|\btanggul|\bdrainase|\bkerusakan|\brusak",
    "kebijakan": r"\bstatus|\btanggap darurat|\bsiaga darurat|\banggaran|\bdana\b|\brelokasi|\bgubernur|\bbupati|\bwali kota|\bpresiden|\bmenteri|\bkemensos|\bganti rugi|\bhuntara|\bhuntap",
    "pencegahan": r"\bmitigasi|\bantisipasi|\bkesiapsiagaan|\bnormalisasi|\bsumur resapan|\btata ruang|\breboisasi|\bsampah|\bwaduk|\bpencegahan|\bcegah|\bsiaga\b|\bwaspada",
}
TOPIK_RE = _u.buat_topik(TOPIK)

# ---------------------------------------------------------------- sentimen (leksikon awal, belum teruji)
# + membaik / respons positif, - memburuk / respons negatif; 0 = penghalang. Dicocokkan frasa terpanjang dulu.
SITUASI = {
    "meluas": -2, "bertambah": -1, "meningkat": -1, "naik": -0.5, "terendam": -1.5, "tergenang": -1, "meluap": -1.5, "jebol": -2,
    "bandang": -2, "tewas": -2, "meninggal": -2, "korban jiwa": -2, "korban": -1, "hilang": -1.5, "mengungsi": -1.5, "pengungsi": -1,
    "terisolasi": -1.5, "lumpuh": -2, "putus": -1.5, "rusak": -1.5, "tertimbun": -2, "terjebak": -1.5, "ekstrem": -1, "parah": -1.5,
    "tanggap darurat": 0, "siaga darurat": 0,
    "surut": 2, "menyurut": 2, "berangsur surut": 2.5, "pulih": 2, "kembali normal": 2, "normal": 1, "reda": 1.5, "teratasi": 2,
    "tertangani": 1.5, "aman": 1, "dibuka kembali": 1.5, "berkurang": 1.5, "menurun": 1.5, "kering": 1,
}
RESPONS = {
    "sigap": 2, "cepat": 1, "tanggap": 1.5, "salurkan": 1.5, "disalurkan": 1.5, "bantuan": 1, "berhasil": 2, "apresiasi": 2, "turun tangan": 1.5,
    "normalisasi": 1, "evakuasi": 0.5, "dievakuasi": 0.5, "diselamatkan": 1.5, "posko": 0.5, "dapur umum": 1,
    "tanggap darurat": 0, "siaga darurat": 0,
    "lamban": -2, "terlambat": -2, "kritik": -2, "dikritik": -2, "kecam": -2, "mengecam": -2, "abai": -2, "diabaikan": -2, "gagal": -2,
    "salahkan": -1.5, "menyalahkan": -1.5, "keluhkan": -1.5, "mengeluh": -1.5, "tak terurus": -2, "minim": -1.5,
}

METODE = {
    "sumber": "Google News RSS (hl=id, gl=ID), kueri umum (banjir, banjir bandang, tanah longsor, banjir rob, BPBD banjir, pengungsi banjir...) + 'banjir <provinsi>' untuk 38 provinsi, when:7d, sekitar 1 permintaan per detik. Hanya judul dan cuplikan RSS; halaman artikel tidak dibuka.",
    "arsip": f"Arsip bergulir {JENDELA_HARI} hari. Duplikat dibuang bila tautannya sama atau media yang sama memuat judul berkata-kata sama.",
    "relevansi": "Lolos bila memuat kata banjir, banjir bandang, longsor, rob (dengan konteks pesisir atau air), luapan, tergenang, pergerakan tanah. Kiasan (banjir diskon, banjir pujian, saham longsor) dan berita negara lain yang tidak menyebut tempat atau lembaga di Indonesia dibuang.",
    "geocoding": "Nama provinsi, kabupaten/kota, dan kecamatan dicocokkan di judul dan cuplikan, frasa terpanjang dulu. Titik = sentroid kecamatan, atau rata-rata sentroid berbobot luas untuk kabupaten/provinsi.",
    "cerita": "Artikel dalam 72 jam dikelompokkan jadi satu cerita bila kemiripan kata judul (Jaccard) >= 0,5, atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama.",
    "topik": "Multi-label dengan kata kunci: kejadian, korban, penanganan, cuaca, infrastruktur, kebijakan, pencegahan.",
    "sentimen": "Dua skor leksikon awal (situasi dan respons), -1..1, aturan negasi dan penguat sama dengan karhutla. Belum diuji pada label manusia, jadi tidak ditampilkan di layar (sentimen_teruji: false).",
    "batas": "Google News RSS maksimal 100 item per kueri dan bukan arsip lengkap; cuplikan biasanya hanya judul; leksikon tidak memahami sarkasme atau konteks panjang.",
}
