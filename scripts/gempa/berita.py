"""Leksikon berita gempa bumi dan tsunami: kueri, relevansi, topik. Mesin: scripts/umum/berita.py (dimuat sebagai pustaka).

Tidak ada workflow gempa (token tak bisa mendorong .github/workflows), jadi berita dijalankan tangan lalu berkasnya di-commit:
  python3 scripts/gempa/berita.py          panen RSS -> public/gempa/data/berita.json (arsip mentah data/raw/gempa/berita, tidak dilacak git)
  python3 scripts/gempa/berita.py ulang    olah ulang arsip tanpa RSS
  python3 scripts/gempa/berita.py uji      self-check relevansi (offline)
`dibuat` di berkas keluaran = jam panen, dan layar menampilkannya apa adanya.
Sentimen tidak punya label uji: SENTIMEN_TERUJI False, layar tidak menampilkan nada.
"""
import json
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
PROVINSI = json.load(open(os.path.join(_AKAR, "public/gempa/data/riwayat_prov.json")))["nama"]

ID = "gempa"
DATA = "public/gempa/data"
RAW = "data/raw/gempa/berita"
JENDELA_HARI = 120
SENTIMEN_TERUJI = False

KUERI_UMUM = ["gempa bumi", "gempa hari ini", "gempa susulan", "gempa magnitudo", "tsunami", "peringatan dini tsunami BMKG",
              "gempa dirasakan BMKG", "BPBD gempa", "pengungsi gempa", "kerusakan akibat gempa", "likuefaksi gempa"]


def kueri():
    return [(q, "umum") for q in KUERI_UMUM] + [(f"gempa {PROVINSI[p].replace('Kep. ', 'Kepulauan ')}", p) for p in PROVINSI]


# ---------------------------------------------------------------- relevansi
R_KUAT = re.compile(r"\b(gempa|gempabumi|gempa bumi|tsunami|lindu|likuefaksi|likuifaksi|magnitudo|sesar aktif|megathrust)\b")
# kiasan: "gempa politik", "gempa harga", ... dan karya hiburan
R_KIASAN = re.compile(r"\bgempa (politik|ekonomi|harga|saham|ihsg|pemecatan|rotasi|mutasi|kabinet|bursa|fiskal|pasar|dukungan|suara|jabatan|reshuffle)\b|"
                      r"\b(politik|ekonomi|bursa|saham|ihsg|harga|pasar) (\w+ )?gempa\b|"
                      r"\b(film|serial|drama|konser|gim|game|lagu|album) (\w+ )?(gempa|tsunami)\b|\btsunami (informasi|data|hoaks|pesanan|diskon|pujian|kritik|klaim)\b")
R_KEUANGAN = re.compile(r"\b(ihsg|saham|bursa|trading halt|rupiah|obligasi|kripto|bitcoin)\b")
R_ASING = re.compile(r"\b(pakistan|india|bangladesh|china|tiongkok|jepang|korea|filipina|vietnam|thailand|myanmar|nepal|afghanistan|"
                     r"libya|maroko|nigeria|kenya|sudan|brasil|amerika|california|texas|alaska|eropa|jerman|spanyol|italia|prancis|inggris|"
                     r"australia|selandia baru|afrika|turki|turkiye|suriah|iran|yaman|meksiko|chili|peru|taiwan|malaysia|singapura|tibet|panama|kolombia|ekuador|guatemala|venezuela|honduras|nikaragua|kosta rika|el salvador|kuba|haiti|tonga|fiji|vanuatu|solomon|papua nugini|rusia|kamchatka|selandia|hawaii|argentina|bolivia|kirgistan|tajikistan|uzbekistan|kazakhstan|georgia|armenia|yunani|kreta|rumania|portugal|jamaika|puerto rico|guam|samoa)\b")
R_INDONESIA = re.compile(r"\b(indonesia|bnpb|bpbd|bmkg|basarnas|tagana|pemkab|pemkot|pemprov|polres|kabupaten|kota|kecamatan|desa|kelurahan)\b")


def relevan(teks, geo=None):
    """(bool, alasan). Lolos bila ada kata gempa/tsunami yang bukan kiasan; berita negara lain dibuang kecuali menyebut tempat atau lembaga Indonesia."""
    t = norm(teks)
    if R_KIASAN.search(t) or R_KEUANGAN.search(t):
        return False, "kiasan"
    kuat = R_KUAT.search(t)
    if not kuat:
        return False, "tanpa kata gempa/tsunami"
    indo = R_INDONESIA.search(t) or (geo and (geo["prov"] or geo["kab"]))
    if R_ASING.search(t) and not indo:
        return False, "luar negeri"
    return True, kuat.group(0)


# ---------------------------------------------------------------- topik
TOPIK = {
    "kejadian": r"\bgempa|\bguncang|\bmenggoyang|\bdirasakan|\bmagnitudo|\bpusat gempa|\bkedalaman|\bsesar|\bmegathrust|\blindu",
    "korban": r"\btewas|\bmeninggal|\bkorban|\bhilang\b|\bmengungsi|\bpengungsi|\bluka|\btertimbun|\breruntuhan|\bterjebak",
    "kerusakan": r"\brusak|\broboh|\bambruk|\bretak|\blongsor|\blikuefaksi|\blikuifaksi|\bkerusakan|\bjembatan|\bsekolah|\brumah sakit",
    "bantuan": r"\bevakuasi|\bbpbd\b|\bbasarnas|\bsar\b|\btagana|\bposko|\bdapur umum|\bbantuan|\bsalurkan|\bdisalurkan|\btni\b|\bpolri\b|\bpmi\b|\bbnpb\b|\btanggap darurat|\bhuntara",
    "susulan": r"\bsusulan|\bmasih terjadi|\bberulang|\brentetan|\bbertubi",
    "tsunami": r"\btsunami|\bperingatan dini|\bptwc|\bsirene|\bgelombang laut",
    "mitigasi": r"\bmitigasi|\bkesiapsiagaan|\bsimulasi|\bedukasi|\bbangunan tahan gempa|\bantisipasi|\bwaspada|\bhoaks",
}
TOPIK_RE = _u.buat_topik(TOPIK)

# ---------------------------------------------------------------- sentimen (leksikon awal, tidak ditampilkan)
SITUASI = {
    "tewas": -2, "meninggal": -2, "korban jiwa": -2, "korban": -1, "hilang": -1.5, "mengungsi": -1.5, "pengungsi": -1, "roboh": -2, "ambruk": -2,
    "rusak": -1.5, "tertimbun": -2, "terjebak": -1.5, "parah": -1.5, "susulan": -0.5, "tsunami": -1,
    "aman": 1, "normal": 1, "pulih": 2, "kembali normal": 2, "teratasi": 2, "berkurang": 1.5, "mereda": 1.5,
}
RESPONS = {
    "sigap": 2, "cepat": 1, "tanggap": 1.5, "salurkan": 1.5, "disalurkan": 1.5, "bantuan": 1, "berhasil": 2, "diselamatkan": 1.5, "evakuasi": 0.5, "posko": 0.5,
    "lamban": -2, "terlambat": -2, "kritik": -2, "dikritik": -2, "abai": -2, "diabaikan": -2, "gagal": -2, "minim": -1.5,
}

METODE = {
    "sumber": "Google News RSS (hl=id, gl=ID), kueri umum (gempa bumi, gempa susulan, tsunami, BPBD gempa, pengungsi gempa...) + 'gempa <provinsi>' untuk 38 provinsi, when:7d, sekitar 1 permintaan per detik. Hanya judul dan cuplikan RSS; halaman artikel tidak dibuka.",
    "arsip": f"Arsip bergulir {JENDELA_HARI} hari. Duplikat dibuang bila tautannya sama atau media yang sama memuat judul berkata-kata sama.",
    "relevansi": "Lolos bila memuat kata gempa, tsunami, likuefaksi, atau magnitudo. Kiasan (gempa politik, gempa harga) dan berita negara lain yang tidak menyebut tempat atau lembaga di Indonesia dibuang.",
    "geocoding": "Nama provinsi, kabupaten/kota, dan kecamatan dicocokkan di judul dan cuplikan, frasa terpanjang dulu.",
    "cerita": "Artikel dalam 72 jam dikelompokkan jadi satu cerita bila kemiripan kata judul (Jaccard) >= 0,5, atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama.",
    "topik": "Multi-label dengan kata kunci: kejadian, korban, kerusakan, bantuan, susulan, tsunami, mitigasi.",
    "sentimen": "Leksikon awal tanpa label uji manusia, tidak ditampilkan di layar (sentimen_teruji: false).",
    "batas": "Google News RSS maksimal 100 item per kueri dan bukan arsip lengkap; tidak ada workflow gempa, berkas ini diperbarui tangan (lihat `dibuat`).",
}


def uji():
    assert relevan("Gempa M 5,2 guncang Cianjur, BPBD siagakan posko")[0]
    assert not relevan("Gempa politik di partai jelang pilkada")[0]
    assert not relevan("Tsunami hantam pantai Jepang")[0]
    assert not relevan("IHSG longsor, saham gempa harga")[0]
    assert not relevan("Gempa Magnitudo 7,7 Guncang Panama")[0]
    assert relevan("Gempa M 4,1 Guncang Kota Bogor")[0]
    assert not relevan("Banjir rendam kota")[0]
    assert "korban" in [k for k, r in TOPIK_RE.items() if r.search(norm("12 korban meninggal akibat gempa"))]
    print("berita gempa: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    else:
        _u.jalankan(sys.modules[__name__], ambil_rss="ulang" not in a, isi_hari=0)
