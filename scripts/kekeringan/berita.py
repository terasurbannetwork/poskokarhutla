"""Leksikon berita kekeringan dan krisis air (kemarau, gagal panen, air bersih): kueri, relevansi, topik. Mesin: scripts/umum/berita.py (dimuat sebagai pustaka).

Tidak ada workflow kekeringan khusus (token tak bisa mendorong .github/workflows); berkas keluaran dijalankan tangan lalu di-commit.
  python3 scripts/kekeringan/berita.py          panen RSS -> public/kekeringan/data/berita.json (arsip mentah data/raw/berita/kekeringan, tidak dilacak git)
  python3 scripts/kekeringan/berita.py ulang    olah ulang arsip tanpa RSS
  python3 scripts/kekeringan/berita.py uji      self-check relevansi dan topik (offline)
`dibuat` di berkas keluaran = jam panen, dan layar menampilkannya apa adanya.
Sentimen tidak punya label uji manusia: SENTIMEN_TERUJI False, layar tidak menampilkan nada.
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
PROVINSI = _muat("scripts/banjir/wilayah.py", "banjir_wilayah").PROVINSI   # kode -> nama provinsi, tabel statis yang sama dengan modul lain

ID = "kekeringan"
DATA = "public/banjir/data"   # folder yang ikut cache + terbit banjir.yml (public/kekeringan/data ditimpa checkout main saat terbit)
KELUAR = "berita_kekeringan.json"
RAW = "data/raw/banjir/berita_kekeringan"   # di bawah folder yang sudah ikut cache banjir.yml
JENDELA_HARI = 120
SENTIMEN_TERUJI = False

KUERI_UMUM = ["kekeringan", "kekeringan hari ini", "krisis air bersih", "kemarau panjang", "musim kemarau BMKG", "sumur kering", "gagal panen kekeringan",
              "bantuan air bersih", "BPBD kekeringan", "status siaga darurat kekeringan", "waduk surut kemarau", "dropping air bersih"]


def kueri():
    return [(q, "umum") for q in KUERI_UMUM] + [(f"kekeringan {PROVINSI[p].replace('Kep. ', 'Kepulauan ')}", p) for p in PROVINSI]


# ---------------------------------------------------------------- relevansi
R_KUAT = re.compile(r"\b(kekeringan|kemarau|krisis air|krisis air bersih|kesulitan air bersih|sulit air bersih|kekurangan air bersih|sumur kering|"
                    r"waduk surut|sungai mengering|gagal panen|puso|dropping air|droping air|bantuan air bersih|hari tanpa hujan|darurat kekeringan)\b")
# kiasan dan topik lain yang memakai kata yang sama
R_KIASAN = re.compile(r"\bkekeringan (gol|prestasi|ide|inspirasi|kreativitas|emosi|cinta|dana|likuiditas|uang|stok|talenta|pemain|data|gelar|trofi|medali|pemasukan|investasi|kasih sayang|perhatian)\b|"
                      r"\b(gol|prestasi|ide|inspirasi|likuiditas|dana|gelar|trofi|medali|talenta) (\w+ )?kekeringan\b|\bmengering (modal|dana|likuiditas|inspirasi|kreativitas)\b|"
                      r"\b(film|serial|drama|konser|gim|game|lagu|album|novel) (\w+ )?(kekeringan|kemarau)\b|\bkemarau (cinta|prestasi|gol|gelar)\b")
R_KEUANGAN = re.compile(r"\b(ihsg|saham|bursa|trading halt|rupiah|obligasi|kripto|bitcoin)\b")
R_ASING = re.compile(r"\b(pakistan|india|bangladesh|china|tiongkok|jepang|korea|filipina|vietnam|thailand|myanmar|nepal|afghanistan|"
                     r"libya|maroko|nigeria|kenya|sudan|somalia|etiopia|zimbabwe|zambia|afrika|brasil|amerika|california|texas|eropa|jerman|spanyol|italia|prancis|inggris|"
                     r"australia|selandia baru|turki|suriah|iran|irak|yaman|meksiko|chili|argentina|kolombia|panama|ekuador|bolivia|peru|singapura|malaysia|laos|kamboja|"
                     r"mongolia|kazakhstan|uzbekistan|syria|gaza|israel|palestina)\b")
R_INDONESIA = re.compile(r"\b(indonesia|bnpb|bpbd|bmkg|basarnas|tagana|pemkab|pemkot|pemprov|polres|kabupaten|kota|kecamatan|desa|kelurahan)\b")


def relevan(teks, geo=None):
    """(bool, alasan). Lolos bila ada kata kekeringan/kemarau/krisis air yang bukan kiasan; berita negara lain dibuang kecuali menyebut tempat atau lembaga Indonesia."""
    t = norm(teks)
    if R_KIASAN.search(t) or R_KEUANGAN.search(t):
        return False, "kiasan"
    kuat = R_KUAT.search(t)
    if not kuat:
        return False, "tanpa kata kekeringan/kemarau"
    indo = R_INDONESIA.search(t) or (geo and (geo["prov"] or geo["kab"]))
    if R_ASING.search(t) and not indo:
        return False, "luar negeri"
    return True, kuat.group(0)


# ---------------------------------------------------------------- topik
TOPIK = {
    "kejadian": r"\bkekeringan|\bkemarau|\bmengering|\bkering\b|\bhari tanpa hujan|\bsurut",
    "air_bersih": r"\bair bersih|\bkrisis air|\bsumur|\bdropping|\bdroping|\bmata air|\btangki|\bpdam|\bkesulitan air|\bantre air|\bantri air",
    "pertanian": r"\bgagal panen|\bpuso\b|\bsawah|\bpetani|\bpadi|\bpertanian|\birigasi|\bladang|\btanaman|\bpanen",
    "korban": r"\bterdampak|\bkorban|\bwarga|\bpengungsi|\bmengungsi|\bjiwa|\bkepala keluarga|\bkk\b|\bpenyakit|\bdiare|\bispa",
    "penanganan": r"\bbpbd\b|\bbantuan|\bdisalurkan|\bsalurkan|\bposko|\btanggap darurat|\bstatus siaga|\bstatus darurat|\bbnpb\b|\bdistribusi|\bhujan buatan|\bmodifikasi cuaca|\bpompa",
    "cuaca": r"\bbmkg\b|\bel nino|\bhujan|\bprakiraan|\bmusim|\bdasarian|\bspi\b|\bcurah",
    "kebakaran": r"\bkarhutla|\bkebakaran|\bhotspot|\btitik panas|\bkabut asap|\bterbakar",
}
TOPIK_RE = _u.buat_topik(TOPIK)

# ---------------------------------------------------------------- sentimen (leksikon awal, tidak ditampilkan)
SITUASI = {
    "gagal panen": -2, "puso": -2, "krisis": -1.5, "kesulitan": -1.5, "kekurangan": -1.5, "mengering": -1.5, "sumur kering": -1.5, "kritis": -1.5,
    "terdampak": -1, "parah": -1.5, "meluas": -1, "bertambah": -1,
    "hujan turun": 1.5, "pulih": 2, "teratasi": 2, "berkurang": 1.5, "mereda": 1.5, "melimpah": 1.5, "lancar": 1,
}
RESPONS = {
    "sigap": 2, "cepat": 1, "tanggap": 1.5, "disalurkan": 1.5, "bantuan": 1, "berhasil": 2, "dibantu": 1.5, "posko": 0.5, "distribusi": 0.5,
    "lamban": -2, "terlambat": -2, "kritik": -2, "dikritik": -2, "abai": -2, "gagal": -2, "minim": -1.5,
}

METODE = {
    "sumber": "Google News RSS (hl=id, gl=ID), 12 kueri umum (kekeringan, krisis air bersih, kemarau panjang, sumur kering, gagal panen...) + 'kekeringan <provinsi>' untuk 38 provinsi, when:7d, sekitar 1 permintaan per detik. Hanya judul dan cuplikan RSS; halaman artikel tidak dibuka.",
    "arsip": f"Arsip bergulir {JENDELA_HARI} hari. Duplikat dibuang bila tautannya sama atau media yang sama memuat judul berkata-kata sama.",
    "relevansi": "Lolos bila memuat kata kekeringan, kemarau, krisis air, sumur kering, atau gagal panen. Kiasan (kekeringan gol, kekeringan prestasi) dan berita negara lain yang tidak menyebut tempat atau lembaga di Indonesia dibuang.",
    "geocoding": "Nama provinsi, kabupaten/kota, dan kecamatan dicocokkan di judul dan cuplikan, frasa terpanjang dulu.",
    "cerita": "Artikel dalam 72 jam dikelompokkan jadi satu cerita bila kemiripan kata judul (Jaccard) >= 0,5, atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama.",
    "topik": "Multi-label dengan kata kunci: kejadian, air bersih, pertanian, korban, penanganan, cuaca, kebakaran.",
    "sentimen": "Leksikon awal tanpa label uji manusia, tidak ditampilkan di layar (sentimen_teruji: false).",
    "batas": "Google News RSS maksimal 100 item per kueri dan bukan arsip lengkap; tidak ada workflow kekeringan, berkas ini diperbarui tangan (lihat `dibuat`).",
}


def uji():
    assert relevan("Kekeringan landa Gunungkidul, BPBD salurkan air bersih")[0]
    assert relevan("Warga Kupang kesulitan air bersih akibat kemarau panjang")[0]
    assert not relevan("Kekeringan gol Persija berlanjut")[0]
    assert not relevan("Kekeringan melanda Somalia, jutaan orang kelaparan")[0]
    assert not relevan("Mengering modal usaha kecil, saham anjlok")[0]
    assert not relevan("Banjir rendam kota")[0]
    assert "pertanian" in [k for k, r in TOPIK_RE.items() if r.search(norm("Petani gagal panen akibat kemarau"))]
    assert "air_bersih" in [k for k, r in TOPIK_RE.items() if r.search(norm("PDAM dropping air bersih"))]
    print("berita kekeringan: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    else:
        _u.jalankan(sys.modules[__name__], ambil_rss="ulang" not in a, isi_hari=0)
