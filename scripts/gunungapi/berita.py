"""Leksikon berita gunung api (erupsi, status PVMBG, abu vulkanik, lahar): kueri, relevansi, topik. Mesin: scripts/umum/berita.py (dimuat sebagai pustaka).

Tidak ada workflow gunung api khusus (token tak bisa mendorong .github/workflows); berkas keluaran dijalankan tangan lalu di-commit, atau dirantai
dari skrip yang sudah dipanggil workflow. Arsip mentah ditaruh di data/raw/banjir/ karena folder itu sudah ikut cache banjir.yml.
  python3 scripts/gunungapi/berita.py          panen RSS -> public/gunungapi/data/berita.json
  python3 scripts/gunungapi/berita.py ulang    olah ulang arsip tanpa RSS
  python3 scripts/gunungapi/berita.py uji      self-check relevansi dan topik (offline)
`dibuat` di berkas keluaran = jam panen, dan layar menampilkannya apa adanya.
Sentimen tidak punya label uji manusia: SENTIMEN_TERUJI False, layar tidak menampilkan nada.
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
PROVINSI = _muat("scripts/banjir/wilayah.py", "banjir_wilayah").PROVINSI   # kode -> nama provinsi, tabel statis yang sama dengan modul lain

ID = "gunungapi"
DATA = "public/gunungapi/data"
RAW = "data/raw/banjir/berita_gunungapi"   # di bawah folder yang sudah ikut cache banjir.yml
JENDELA_HARI = 120
SENTIMEN_TERUJI = False

KUERI_UMUM = ["gunung api", "erupsi gunung", "gunung meletus", "status awas gunung api", "naik status siaga gunung", "abu vulkanik",
              "PVMBG gunung api", "awan panas guguran", "lahar dingin", "pengungsi erupsi", "evakuasi erupsi gunung", "kolom abu erupsi"]


def kueri():
    nama = sorted(json.load(open(os.path.join(_AKAR, "public/gunungapi/data/gunung.json"))))
    return [(q, "umum") for q in KUERI_UMUM] + [(f"erupsi gunung {n}", n) for n in nama]


# ---------------------------------------------------------------- relevansi
R_KUAT = re.compile(r"\b(gunung ?api|gunungapi|erupsi|meletus|letusan gunung|abu vulkanik|awan panas|lahar|vulkanik|pvmbg|magma indonesia|"
                    r"kolom abu|guguran lava|aliran lava|lontaran batu pijar|status awas gunung)\b")
# kiasan, penyakit kulit, dan hiburan yang memakai kata yang sama
R_KIASAN = re.compile(r"\b(meletus|letusan|erupsi) (emosi|amarah|kemarahan|tawa|kreativitas|ide|kegembiraan|protes|demo|konflik|kerusuhan|"
                      r"perang|bentrokan|tawuran|kekerasan|tangis|tepuk|harga|saham|ihsg|inflasi|bursa)\b|"
                      r"\b(amarah|emosi|konflik|kerusuhan|perang|bentrokan|tawuran|protes|demo|baku tembak|pertempuran|tembakan) (\w+ )?meletus\b|"
                      r"\b(film|serial|drama|konser|gim|game|lagu|album|anime|komik) (\w+ )?(erupsi|gunung api|meletus)\b|"
                      r"\berupsi (kulit|obat|gigi|gigi susu|alergi|dermatitis|jerawat|ruam)\b|\bbalon meletus\b|\bban meletus\b|\btabung gas meletus\b")
R_KEUANGAN = re.compile(r"\b(ihsg|saham|bursa|trading halt|rupiah|obligasi|kripto|bitcoin)\b")
R_ASING = re.compile(r"\b(italia|etna|stromboli|vesuvius|islandia|iceland|hawaii|kilauea|mauna loa|jepang|sakurajima|fuji|filipina|taal|mayon|pinatubo|"
                     r"meksiko|popocatepetl|chili|peru|ekuador|kolombia|guatemala|nikaragua|kosta rika|el salvador|selandia baru|tonga|vanuatu|papua nugini|"
                     r"rusia|kamchatka|alaska|amerika|california|washington|eropa|kongo|etiopia|kenya|tanzania|kamerun|yunani|santorini|"
                     r"kepulauan canary|la palma|azores|cape verde|montserrat|saint vincent|karibia|antartika)\b")
R_INDONESIA = re.compile(r"\b(indonesia|bnpb|bpbd|basarnas|tagana|pvmbg|badan geologi|pemkab|pemkot|pemprov|polres|kabupaten|kota|kecamatan|desa|kelurahan)\b")


def relevan(teks, geo=None):
    """(bool, alasan). Lolos bila ada kata gunung api/erupsi/abu vulkanik yang bukan kiasan; berita negara lain dibuang kecuali menyebut tempat atau lembaga Indonesia."""
    t = norm(teks)
    if R_KIASAN.search(t) or R_KEUANGAN.search(t):
        return False, "kiasan"
    kuat = R_KUAT.search(t)
    if not kuat:
        return False, "tanpa kata gunung api/erupsi"
    indo = R_INDONESIA.search(t) or (geo and (geo["prov"] or geo["kab"]))
    if R_ASING.search(t) and not indo:
        return False, "luar negeri"
    return True, kuat.group(0)


# ---------------------------------------------------------------- topik
TOPIK = {
    "kejadian": r"\berupsi|\bmeletus|\bletusan|\bguguran|\bawan panas|\bkolom abu|\bgunung api|\bgunungapi|\bkawah",
    "status": r"\bpvmbg|\bbadan geologi|\bstatus|\blevel (ii|iii|iv|2|3|4)\b|\bawas\b|\bsiaga\b|\bwaspada\b|\bnaik|\bturun|\bradius|\brekomendasi",
    "korban": r"\btewas|\bmeninggal|\bkorban|\bhilang\b|\bluka|\btertimbun|\bterjebak|\bpendaki|\bditemukan",
    "evakuasi": r"\bevakuasi|\bmengungsi|\bpengungsi|\bpengungsian|\bposko|\bbpbd\b|\bbasarnas|\bsar\b|\btagana|\bbantuan|\bdapur umum|\bmasker|\bdisalurkan",
    "penerbangan": r"\bpenerbangan|\bbandara|\bnotam|\bvona|\bpesawat|\bmaskapai|\bditutup|\bdibatalkan|\bjarak pandang",
    "kerusakan": r"\bhujan abu|\bruntuhan|\brusak|\btertutup abu|\bgagal panen|\blahar|\bbanjir lahar|\bjembatan|\batap|\bkebun|\bpertanian",
    "mitigasi": r"\bmitigasi|\bkesiapsiagaan|\bsimulasi|\bedukasi|\bantisipasi|\bimbau|\bhoaks|\bpendakian|\bjalur",
}
TOPIK_RE = _u.buat_topik(TOPIK)

# ---------------------------------------------------------------- sentimen (leksikon awal, tidak ditampilkan)
SITUASI = {
    "tewas": -2, "meninggal": -2, "korban jiwa": -2, "korban": -1, "hilang": -1.5, "mengungsi": -1.5, "pengungsi": -1, "tertimbun": -2,
    "terjebak": -1.5, "rusak": -1.5, "hujan abu": -1, "awan panas": -1.5, "lahar": -1, "meningkat": -1, "naik status": -1,
    "aman": 1, "normal": 1, "turun status": 1.5, "mereda": 1.5, "berkurang": 1.5, "kembali ke rumah": 1.5, "pulang": 1,
}
RESPONS = {
    "sigap": 2, "cepat": 1, "tanggap": 1.5, "disalurkan": 1.5, "bantuan": 1, "berhasil": 2, "diselamatkan": 1.5, "evakuasi": 0.5, "posko": 0.5,
    "lamban": -2, "terlambat": -2, "kritik": -2, "dikritik": -2, "abai": -2, "gagal": -2, "minim": -1.5,
}

METODE = {
    "sumber": "Google News RSS (hl=id, gl=ID), 12 kueri umum (gunung api, erupsi gunung, abu vulkanik, awan panas, lahar, status awas...) + 'erupsi gunung <nama>' untuk tiap gunung di katalog, when:7d, sekitar 1 permintaan per detik. Hanya judul dan cuplikan RSS; halaman artikel tidak dibuka.",
    "arsip": f"Arsip bergulir {JENDELA_HARI} hari. Duplikat dibuang bila tautannya sama atau media yang sama memuat judul berkata-kata sama.",
    "relevansi": "Lolos bila memuat kata gunung api, erupsi, meletus, abu vulkanik, awan panas, lahar, atau PVMBG. Kiasan (amarah meletus, erupsi kulit) dan berita gunung di negara lain yang tidak menyebut tempat atau lembaga di Indonesia dibuang.",
    "geocoding": "Nama provinsi, kabupaten/kota, dan kecamatan dicocokkan di judul dan cuplikan, frasa terpanjang dulu.",
    "cerita": "Artikel dalam 72 jam dikelompokkan jadi satu cerita bila kemiripan kata judul (Jaccard) >= 0,5, atau >= 0,3 dan menyebut kabupaten/kecamatan yang sama.",
    "topik": "Multi-label dengan kata kunci: kejadian, status, korban, evakuasi, penerbangan, kerusakan, mitigasi.",
    "sentimen": "Leksikon awal tanpa label uji manusia, tidak ditampilkan di layar (sentimen_teruji: false).",
    "batas": "Google News RSS maksimal 100 item per kueri dan bukan arsip lengkap; tidak ada workflow gunung api, berkas ini diperbarui tangan (lihat `dibuat`).",
}


# ---------------------------------------------------------------- lokasi: nama gunung -> provinsi
# Geo (mesin) hanya mengenal nama wilayah administratif; berita gunung api hampir selalu menyebut nama gunungnya saja. Sesudah mesin selesai, artikel tanpa kabupaten
# diberi lokasi dari katalog gunung (public/gunungapi/data/gunung.json): kab = "<kode provinsi>|<nama gunung>" supaya peta dan daftar berita mengelompokkan per gunung.
# Nama yang juga kata sehari-hari (Ibu, Agung, Ruang, Awu ...) hanya diterima bila didahului "gunung/gn/g.".
AMBIGU = {"ibu", "agung", "ruang", "awu", "batur", "raung", "iya", "kaba", "colo", "gede", "guntur", "salak", "talang", "ambang", "sirung", "lamongan", "egon", "dieng", "kelud", "slamet", "sumbing", "rinjani"}


def _kode_prov(teks_prov):
    ali = {"daerah istimewa yogyakarta": "34", "dki jakarta": "31"}
    t = norm(teks_prov)
    for a, k in ali.items():
        if a in t:
            return k
    for k, n in sorted(PROVINSI.items(), key=lambda x: -len(x[1])):   # terpanjang dulu: 'Maluku Utara' sebelum 'Maluku'
        if norm(n.replace("Kep. ", "Kepulauan ")) in t or norm(n) in t:
            return k
    return None


def pola_gunung(katalog):
    """-> [(regex, nama, kode_prov, lat, lon)] terpanjang dulu, supaya 'Anak Krakatau' menang atas 'Krakatau'."""
    out = []
    for nama, g in sorted(katalog.items(), key=lambda x: -len(x[0])):
        kode = _kode_prov(g["prov"])
        if not kode:
            continue
        n = re.escape(norm(nama))
        awalan = r"(?:gunung|gunungapi|gn|g)\s+"
        out.append((re.compile(rf"\b{awalan}{n}\b" if norm(nama) in AMBIGU else rf"\b(?:{awalan})?{n}\b"), nama, kode, g["lat"], g["lon"]))
    return out


def beri_lokasi(artikel, pola):
    """Isi prov/kab/lat/lon artikel yang belum berkabupaten dari nama gunung di judul + cuplikan. Mengembalikan jumlah yang terisi."""
    n = 0
    for a in artikel:
        if a.get("kab") and a["kab"][0] != "94|Puncak":   # "puncak" (puncak gunung) dikira Kabupaten Puncak oleh geocoder mesin: abaikan, cari dari nama gunung
            continue
        t = norm(a["judul"] + " " + a.get("ringkas", ""))
        for rx, nama, kode, lat, lon in pola:
            if rx.search(t):
                a["kab"] = [f"{kode}|{nama}"]; a["prov"] = list(dict.fromkeys([kode] + (a.get("prov") or []))); a["lat"], a["lon"], a["presisi"] = lat, lon, "gunung"
                n += 1
                break
    return n


def olah_lokasi():
    """Baca berita.json hasil mesin, isi lokasi gunung, tulis ulang (atomik)."""
    p = os.path.join(_AKAR, DATA, "berita.json")
    d = json.load(open(p))
    kat = json.load(open(os.path.join(_AKAR, "public/gunungapi/data/gunung.json")))
    n = beri_lokasi(d["artikel"], pola_gunung(kat))
    d["ringkasan"]["berlokasi"] = round(sum(1 for a in d["artikel"] if a.get("prov")) / max(1, len(d["artikel"])), 3)
    with open(p + ".tmp", "w") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(p + ".tmp", p)
    print(f"lokasi gunung: {n} artikel diberi lokasi; berlokasi {d['ringkasan']['berlokasi']}", file=sys.stderr)


def uji():
    kat = {"Semeru": {"prov": "Jawa Timur", "lat": -8.1, "lon": 112.9}, "Ibu": {"prov": "Maluku Utara", "lat": 1.5, "lon": 127.6},
           "Merapi": {"prov": "Daerah Istimewa Yogyakarta dan Jawa Tengah", "lat": -7.5, "lon": 110.4}}
    pol = pola_gunung(kat)
    A = [{"judul": "Semeru erupsi lagi", "ringkas": ""}, {"judul": "Ibu hamil jadi korban erupsi", "ringkas": ""}, {"judul": "Gunung Ibu erupsi 3 kali", "ringkas": ""},
         {"judul": "Merapi muntahkan awan panas", "ringkas": ""}, {"judul": "Erupsi gunung di Jepang", "ringkas": ""}]
    assert beri_lokasi(A, pol) == 3 and A[0]["kab"] == ["35|Semeru"] and "kab" not in A[1] and A[2]["kab"] == ["82|Ibu"] and A[3]["kab"] == ["34|Merapi"] and "kab" not in A[4]
    assert relevan("Gunung Semeru erupsi, BPBD Lumajang siagakan posko")[0]
    assert relevan("PVMBG naikkan status Gunung Ibu jadi Siaga")[0]
    assert not relevan("Amarah warga meletus saat rapat")[0]
    assert not relevan("Erupsi kulit pada bayi, ini penyebabnya")[0]
    assert not relevan("Gunung Etna erupsi, bandara Catania ditutup")[0]
    assert not relevan("IHSG longsor, saham erupsi")[0]
    assert not relevan("Banjir rendam kota")[0]
    assert "korban" in [k for k, r in TOPIK_RE.items() if r.search(norm("Pendaki tewas akibat erupsi"))]
    assert "penerbangan" in [k for k, r in TOPIK_RE.items() if r.search(norm("Bandara ditutup akibat abu vulkanik"))]
    print("berita gunungapi: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    else:
        _u.jalankan(sys.modules[__name__], ambil_rss="ulang" not in a, isi_hari=0)
        olah_lokasi()
