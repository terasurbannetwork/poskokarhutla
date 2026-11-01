"""Leksikon berita gelombang pasang, rob, abrasi pantai, gelombang tinggi, banjir pesisir. Mesin: scripts/umum/berita.py.

Pakai:  python3 scripts/berita/pesisir.py          panen RSS -> public/banjir/data/berita_pesisir.json
        python3 scripts/berita/pesisir.py ulang    olah ulang arsip tanpa RSS
        python3 scripts/berita/pesisir.py uji      self-check relevansi (offline)
Berkas keluar di folder banjir supaya ikut cache + terbit banjir.yml (pola gempa). Sentimen belum teruji manusia.
"""
import os
import re
import sys

_AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
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

ID = "pesisir"
DATA = "public/banjir/data"   # folder yang ikut cache + terbit banjir.yml
KELUAR = "berita_pesisir.json"
RAW = "data/raw/banjir/berita_pesisir"
JENDELA_HARI = 120
SENTIMEN_TERUJI = False

KUERI_UMUM = ["abrasi pantai", "gelombang pasang", "rob", "gelombang tinggi", "banjir rob", "banjir pesisir", "rob pesisir",
              "peringatan dini gelombang tinggi BMKG", "abrasi pantai BPBD", "pasang laut"]


def kueri():
    return [(q, "umum") for q in KUERI_UMUM] + [(f"abrasi gelombang pasang {PROVINSI[p].replace('Kep. ', 'Kepulauan ')}", p) for p in PROVINSI]


# ---------------------------------------------------------------- relevansi
R_KUAT = re.compile(r"\b(gelombang pasang|gelombang tinggi|abrasi|air pasang|pasang laut|banjir rob|banjir pesisir|rob pesisir|"
                    r"tanggul laut|pemecah gelombang|pasang purnama|pasang surut ekstrem|erosi pantai|swell)\b")
# "rob" sendirian terlalu longgar (nama orang, "Rob Reiner"): wajib ditemani kata pesisir/air
R_ROB = re.compile(r"\brob\b")
R_ROB_KONTEKS = re.compile(r"\b(banjir|pesisir|pasang|terendam|genangan|tanggul|air laut|melanda|landa|rendam|permukiman|pantai|pelabuhan|nelayan|tambak)\b")
R_KIASAN = re.compile(r"\b(gelombang|abrasi) (phk|protes|demo|kritik|pengunduran|penolakan|dukungan|investasi|pemecatan|mutasi|kenaikan harga|"
                      r"pemudik|penumpang|covid|omicron|varian|pandemi|panas)\b|"
                      r"\b(gelombang|abrasi) (\w+ )?(saham|ihsg|rupiah|harga|suara|elektabilitas)\b|\b(saham|ihsg|rupiah|harga|suara) (\w+ )?abrasi\b")
R_KEUANGAN = re.compile(r"\b(ihsg|saham|bursa|trading halt|rupiah|obligasi|kripto|bitcoin)\b")
R_ASING = re.compile(r"\b(pakistan|india|bangladesh|china|tiongkok|jepang|korea|filipina|vietnam|thailand|myanmar|nepal|afghanistan|"
                     r"libya|nigeria|kenya|sudan|brasil|amerika|texas|florida|eropa|jerman|spanyol|italia|prancis|inggris|australia|"
                     r"brisbane|queensland|afrika|turki|iran|yaman|malaysia|singapura)\b")
R_INDONESIA = re.compile(r"\b(indonesia|bnpb|bpbd|bmkg|basarnas|tagana|pemkab|pemkot|pemprov|polres|kabupaten|kota|kecamatan|desa|kelurahan)\b")


def relevan(teks, geo=None):
    """(bool, alasan). Lolos bila ada kata gelombang pasang/abrasi/rob yang bukan kiasan; berita negara lain dibuang
    kecuali menyebut tempat atau lembaga di Indonesia."""
    t = norm(teks)
    if R_KIASAN.search(t) or R_KEUANGAN.search(t):
        return False, "kiasan"
    kuat = R_KUAT.search(t)
    if not kuat and not (R_ROB.search(t) and R_ROB_KONTEKS.search(R_ROB.sub(" ", t))):
        return False, "tanpa kata pesisir"
    indo = R_INDONESIA.search(t) or (geo and (geo["prov"] or geo["kab"]))
    if R_ASING.search(t) and not indo:
        return False, "luar negeri"
    return True, kuat.group(0) if kuat else "rob"


# ---------------------------------------------------------------- topik
TOPIK = {
    "kejadian": r"\bgelombang|\babrasi|\brob\b|\bpasang|\bterendam|\bgenangan|\btergenang|\bmerendam|\bditerjang|\bdilanda|\bterkikis|\btergerus|\bmenerjang",
    "korban": r"\btewas|\bmeninggal|\bkorban|\bhilang\b|\bmengungsi|\bpengungsi|\bluka|\bterseret|\btenggelam|\bkaram",
    "penanganan": r"\bevakuasi|\bpompa|\bbpbd\b|\bbasarnas|\bsar\b|\btagana|\bposko|\bbantuan|\bdisalurkan|\btni\b|\bpolri\b|\bpmi\b|\bbnpb\b|\bnormalisasi",
    "cuaca": r"\bbmkg|\bcuaca|\bsiklon|\bperingatan dini|\bangin|\bgelombang tinggi|\bpasang purnama|\bmusim|\bla nina",
    "infrastruktur": r"\bjalan\b|\bjembatan|\bputus|\blumpuh|\bpelabuhan|\btambak|\bpermukiman|\brumah|\btanggul|\bpemecah gelombang|\bkerusakan|\brusak|\bperahu|\bkapal",
    "kebijakan": r"\bstatus|\btanggap darurat|\banggaran|\bdana\b|\brelokasi|\bgubernur|\bbupati|\bwali kota|\bmenteri|\bkkp\b|\bhuntara",
    "pencegahan": r"\bmitigasi|\bantisipasi|\bkesiapsiagaan|\bmangrove|\bbakau|\btanggul laut|\bpemecah gelombang|\bpenanaman|\bwaspada|\bsiaga\b|\bimbau",
}
TOPIK_RE = _u.buat_topik(TOPIK)

# ---------------------------------------------------------------- sentimen (leksikon awal, belum teruji)
SITUASI = {
    "meluas": -2, "bertambah": -1, "meningkat": -1, "naik": -0.5, "terendam": -1.5, "tergenang": -1, "terkikis": -1.5, "tergerus": -1.5,
    "tewas": -2, "meninggal": -2, "korban jiwa": -2, "korban": -1, "hilang": -1.5, "mengungsi": -1.5, "pengungsi": -1, "tenggelam": -2,
    "lumpuh": -2, "putus": -1.5, "rusak": -1.5, "ekstrem": -1, "parah": -1.5, "tanggap darurat": 0,
    "surut": 2, "menyurut": 2, "berangsur surut": 2.5, "pulih": 2, "kembali normal": 2, "normal": 1, "reda": 1.5, "teratasi": 2,
    "aman": 1, "berkurang": 1.5, "menurun": 1.5,
}
RESPONS = {
    "sigap": 2, "cepat": 1, "tanggap": 1.5, "disalurkan": 1.5, "bantuan": 1, "berhasil": 2, "apresiasi": 2, "diselamatkan": 1.5,
    "evakuasi": 0.5, "dievakuasi": 0.5, "posko": 0.5, "tanggap darurat": 0,
    "lamban": -2, "terlambat": -2, "kritik": -2, "dikritik": -2, "kecam": -2, "abai": -2, "diabaikan": -2, "gagal": -2,
    "menyalahkan": -1.5, "mengeluh": -1.5, "minim": -1.5,
}

METODE = {
    "sumber": "Google News RSS (hl=id, gl=ID), kueri umum (abrasi pantai, gelombang pasang, rob, gelombang tinggi, banjir pesisir...) + 'abrasi gelombang pasang <provinsi>' untuk 38 provinsi, when:7d. Hanya judul dan cuplikan RSS; halaman artikel tidak dibuka.",
    "arsip": f"Arsip bergulir {JENDELA_HARI} hari. Duplikat dibuang bila tautannya sama atau media yang sama memuat judul berkata-kata sama.",
    "relevansi": "Lolos bila memuat gelombang pasang, gelombang tinggi, abrasi, air pasang, banjir rob, banjir pesisir, atau rob (dengan konteks pesisir atau air). Kiasan dan berita negara lain yang tidak menyebut tempat atau lembaga di Indonesia dibuang.",
    "geocoding": "Nama provinsi, kabupaten/kota, dan kecamatan dicocokkan di judul dan cuplikan, frasa terpanjang dulu.",
    "cerita": "Artikel dalam 72 jam dikelompokkan jadi satu cerita bila kemiripan kata judul (Jaccard) >= 0,5, atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama.",
    "topik": "Multi-label dengan kata kunci: kejadian, korban, penanganan, cuaca, infrastruktur, kebijakan, pencegahan.",
    "sentimen": "Dua skor leksikon awal (situasi dan respons), -1..1. Belum diuji pada label manusia, jadi tidak ditampilkan di layar (sentimen_teruji: false).",
    "batas": "Google News RSS maksimal 100 item per kueri dan bukan arsip lengkap; cuplikan biasanya hanya judul; leksikon tidak memahami sarkasme atau konteks panjang.",
}


def uji():
    assert relevan("Gelombang pasang terjang pesisir Demak, BPBD siagakan posko")[0]
    assert relevan("Abrasi pantai di Kabupaten Indramayu makin parah")[0]
    assert relevan("Rob rendam permukiman warga di Pekalongan")[0]
    assert relevan("BMKG: gelombang tinggi 4 meter di perairan Selatan Jawa")[0]
    assert not relevan("Rob Reiner hadiri premier film baru")[0]
    assert not relevan("Gelombang PHK landa pabrik tekstil")[0]
    assert not relevan("IHSG abrasi, saham gelombang harga")[0]
    assert not relevan("Gelombang pasang hantam pantai Jepang")[0]
    assert not relevan("Banjir bandang rendam kota")[0]
    assert "korban" in [k for k, r in TOPIK_RE.items() if r.search(norm("3 korban tewas diterjang gelombang pasang"))]
    print("berita pesisir: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    else:
        _u.jalankan(sys.modules[__name__], ambil_rss="ulang" not in a, isi_hari=0)
