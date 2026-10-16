"""Leksikon berita kualitas udara: kueri, relevansi, topik. Mesin: scripts/umum/berita.py (dimuat sebagai pustaka).

Tidak ada workflow cuaca/udara (token tak bisa mendorong .github/workflows), jadi berita dijalankan tangan lalu berkasnya di-commit:
  python3 scripts/udara/berita.py          panen RSS -> public/udara/data/berita.json (arsip mentah data/raw/udara/berita, tidak dilacak git)
  python3 scripts/udara/berita.py ulang    olah ulang arsip tanpa RSS
  python3 scripts/udara/berita.py uji      self-check relevansi (offline)
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

ID = "udara"
DATA = "public/banjir/data"   # folder yang ikut cache + terbit banjir.yml (public/udara/data ditimpa checkout main saat terbit)
KELUAR = "berita_udara.json"
RAW = "data/raw/banjir/berita_udara"   # di bawah folder yang sudah ikut cache banjir.yml
JENDELA_HARI = 120
SENTIMEN_TERUJI = False

KUERI_UMUM = ["kualitas udara", "polusi udara", "ISPU", "udara tidak sehat", "PM2,5", "kabut asap", "jarak pandang kabut", "indeks kualitas udara",
              "udara kotor", "ISPA polusi", "masker polusi udara", "emisi kendaraan polusi"]


def kueri():
    return [(q, "umum") for q in KUERI_UMUM] + [(f"kualitas udara {PROVINSI[p].replace('Kep. ', 'Kepulauan ')}", p) for p in PROVINSI]


# ---------------------------------------------------------------- relevansi
R_KUAT = re.compile(r"\b(kualitas udara|polusi udara|pencemaran udara|udara tidak sehat|udara kotor|ispu|indeks standar pencemar udara|indeks kualitas udara|aqi|"
                    r"pm ?2 5|pm ?10|kabut asap|asap tebal|jarak pandang|smog|haze|udara bersih)\b")
# kiasan dan topik lain yang memakai kata yang sama
R_KIASAN = re.compile(r"\b(polusi|kualitas udara) (suara|visual|cahaya|digital|informasi|politik|medsos|konten|sampah plastik)\b|"
                      r"\b(polusi|udara) (segar )?(politik|demokrasi|pemilu|kampanye)\b|\bhaze (band|grup|film|game)\b|\budara (panas|dingin) (politik)\b|"
                      r"\b(film|serial|drama|konser|gim|game|lagu|album) (\w+ )?(smog|haze|polusi)\b")
R_KEUANGAN = re.compile(r"\b(ihsg|saham|bursa|trading halt|rupiah|obligasi|kripto|bitcoin)\b")
R_ASING = re.compile(r"\b(ho chi minh|hanoi|manila|bangkok|kuala lumpur|beijing|shanghai|tokyo|seoul|delhi|mumbai|dhaka|karachi|lahore|kathmandu|taipei|sydney|melbourne|london|new york|paris|dubai|houston|miami|pakistan|india|delhi|lahore|bangladesh|dhaka|china|tiongkok|beijing|jepang|korea|seoul|filipina|vietnam|hanoi|thailand|bangkok|myanmar|nepal|"
                     r"afghanistan|kenya|sudan|brasil|amerika|texas|florida|california|eropa|jerman|spanyol|italia|prancis|inggris|london|australia|"
                     r"afrika|turki|iran|meksiko|taiwan|hong kong|kanada|rusia|ukraina|malaysia|singapura)\b")
R_INDONESIA = re.compile(r"\b(indonesia|bnpb|bpbd|bmkg|klhk|kemenlhk|dlh|pemkab|pemkot|pemprov|polres|kabupaten|kota|kecamatan|desa|kelurahan|jakarta|jabodetabek)\b")


# judul tempelan SEO/spam: token acak di kurung yang tak tertutup ("... Cathie Wood Ai Stock Trades (HqE3bZsvON")
R_SPAM = re.compile(r"\((?=[A-Za-z0-9]*\d)[A-Za-z0-9]{5,}(?:\s|$)|\bstock trades\b", re.I)


def relevan(teks, geo=None):
    """(bool, alasan). Lolos bila ada kata kualitas udara/polusi/ISPU yang bukan kiasan; berita negara lain dibuang kecuali menyebut tempat atau lembaga Indonesia."""
    if R_SPAM.search(teks):
        return False, "spam"
    t = norm(teks)
    if R_KIASAN.search(t) or R_KEUANGAN.search(t):
        return False, "kiasan"
    kuat = R_KUAT.search(t)
    if not kuat:
        return False, "tanpa kata kualitas udara"
    indo = R_INDONESIA.search(t) or (geo and (geo["prov"] or geo["kab"]))
    if R_ASING.search(t) and not indo:
        return False, "luar negeri"
    return True, kuat.group(0)


# ---------------------------------------------------------------- topik
TOPIK = {
    "kondisi": r"\bkualitas udara|\bpolusi|\bispu|\bpm ?2 5|\bpm ?10|\bindeks|\btidak sehat|\bberbahaya|\bpencemaran",
    "kesehatan": r"\bispa|\bmasker|\bsesak|\basma|\bbatuk|\brumah sakit|\bkesehatan|\bdokter|\bpernapasan|\bpenyakit|\bkelompok rentan|\banak",
    "sumber": r"\bkendaraan|\bpltu|\bindustri|\bpabrik|\bemisi|\bbatu bara|\bpembakaran|\bkarhutla|\bkebakaran|\bknalpot|\bsampah",
    "kabut": r"\bkabut|\bjarak pandang|\bbandara|\bpenerbangan|\bpesawat|\bdelay|\bpelabuhan|\bpengelihatan|\bhaze|\bsmog",
    "kebijakan": r"\buji emisi|\bpembatasan|\bganjil genap|\bwfh|\bkebijakan|\bperda|\bregulasi|\bpemprov|\bkemenlhk|\bklhk|\bwarga negara|\bgugatan|\bputusan",
    "penanganan": r"\bhujan buatan|\bmodifikasi cuaca|\bpenyiraman|\bwater mist|\bbpbd|\bmasker dibagikan|\bpenanganan|\bpengendalian|\bantisipasi|\bmitigasi",
}
TOPIK_RE = _u.buat_topik(TOPIK)

# ---------------------------------------------------------------- sentimen (leksikon awal, tidak ditampilkan)
SITUASI = {
    "tidak sehat": -2, "berbahaya": -2, "sangat tidak sehat": -2.5, "memburuk": -1.5, "terburuk": -2, "tercemar": -1.5, "ispa": -1.5, "sesak": -1.5, "pekat": -1.5,
    "baik": 1.5, "membaik": 1.5, "bersih": 1.5, "sehat": 1, "turun": 0.5, "normal": 1,
}
RESPONS = {
    "sigap": 2, "cepat": 1, "tanggap": 1.5, "dibagikan": 1, "berhasil": 2, "efektif": 1.5, "hujan buatan": 1,
    "lamban": -2, "terlambat": -2, "kritik": -2, "dikritik": -2, "abai": -2, "diabaikan": -2, "gagal": -2, "minim": -1.5, "gugat": -1.5,
}

METODE = {
    "sumber": "Google News RSS (hl=id, gl=ID), kueri umum (kualitas udara, polusi udara, ISPU, PM2,5, kabut asap, jarak pandang...) + 'kualitas udara <provinsi>' untuk 38 provinsi, when:7d, sekitar 1 permintaan per detik. Hanya judul dan cuplikan RSS; hak cipta tetap pada penerbit.",
    "arsip": f"Arsip bergulir {JENDELA_HARI} hari. Duplikat dibuang bila tautannya sama atau media yang sama memuat judul berkata-kata sama.",
    "relevansi": "Lolos bila memuat kata kualitas udara, polusi udara, ISPU, PM2,5, kabut asap, atau jarak pandang. Kiasan (polusi suara, polusi visual, polusi politik) dan berita negara lain yang tidak menyebut tempat atau lembaga di Indonesia dibuang.",
    "geocoding": "Nama provinsi, kabupaten/kota, dan kecamatan dicocokkan di judul dan cuplikan, frasa terpanjang dulu.",
    "cerita": "Artikel dalam 72 jam dikelompokkan jadi satu cerita bila kemiripan kata judul (Jaccard) >= 0,5, atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama.",
    "topik": "Multi-label dengan kata kunci: kondisi, kesehatan, sumber, kabut, kebijakan, penanganan.",
    "sentimen": "Leksikon awal tanpa label uji manusia, tidak ditampilkan di layar (sentimen_teruji: false).",
    "batas": "Google News RSS maksimal 100 item per kueri dan bukan arsip lengkap; tidak ada workflow udara, berkas ini diperbarui tangan (lihat `dibuat`).",
}


def uji():
    assert relevan("Kualitas udara Jakarta tidak sehat, ISPU capai 160, warga diminta pakai masker")[0]
    assert relevan("PM2,5 di Palembang melonjak akibat kabut asap, jarak pandang 800 meter")[0]
    assert not relevan("Polusi suara di kawasan wisata dikeluhkan warga")[0]
    assert not relevan("Polusi udara parah di Delhi, sekolah ditutup")[0]
    assert not relevan("Banjir rendam kota")[0]
    assert "kesehatan" in [k for k, r in TOPIK_RE.items() if r.search(norm("Kasus ISPA naik akibat polusi udara"))]
    assert not relevan("Kualitas Udara Jakarta Tidak Sehat Nicolas Roy (NF2fj8 abc")[0] and relevan("Kualitas udara (BMKG) memburuk di Riau")[0]
    print("berita udara: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    else:
        _u.jalankan(sys.modules[__name__], ambil_rss="ulang" not in a, isi_hari=0)
