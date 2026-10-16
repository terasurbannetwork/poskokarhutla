"""Mesin berita generik lintas bencana: panen Google News RSS, dedup, geocode, topik, skor sentimen, cerita.

Tidak ada kata khas satu bencana di sini. Yang khas (kueri, relevansi, TOPIK, SITUASI/RESPONS) tinggal di
scripts/berita/<id>.py dan disuntik ke fungsi di bawah (MODUL-PLUG-AND-PLAY.md §5).

Pakai (banjir dll.):  python3 scripts/umum/berita.py <id>        panen RSS -> <data>/berita.json
                      python3 scripts/umum/berita.py <id> ulang  olah ulang arsip tanpa RSS
                      python3 scripts/umum/berita.py <id> uji    uji lokal pada tangkapan feed tersimpan
                      python3 scripts/umum/berita.py             self-check mesin
Karhutla memakai scripts/data/berita.py (pembungkus + olah khas karhutla di atas mesin ini).
Stdlib saja.
"""
import datetime as dt, email.utils, glob, hashlib, html, json, math, os, re, sys, time, unicodedata
import urllib.parse, urllib.request, xml.etree.ElementTree as ET
from collections import Counter, defaultdict

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
UA = "Mozilla/5.0 (compatible; poskokarhutla-berita/1.0; +https://github.com/pangantara/poskokarhutla)"
EDISI = {"id": ("id", "ID", "ID:id"), "en-US": ("en-US", "US", "US:en"), "en-SG": ("en-SG", "SG", "SG:en"), "en-MY": ("en-MY", "MY", "MY:en"),
         "en-AU": ("en-AU", "AU", "AU:en"), "en-GB": ("en-GB", "GB", "GB:en"), "ms-MY": ("ms", "MY", "MY:ms")}


def sentroid(ring):
    """Titik berat luas poligon (rumus shoelace). ponytail: salinan posko.sentroid; satu setelah posko.py pindah ke scripts/umum."""
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        c = x1 * y2 - x2 * y1
        a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
    if abs(a) < 1e-12:
        return sum(p[1] for p in ring) / len(ring), sum(p[0] for p in ring) / len(ring)
    return cy / (3 * a), cx / (3 * a)


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


def rss(q, ed="id"):
    hl, gl, ceid = EDISI[ed]
    return "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q, "hl": hl, "gl": gl, "ceid": ceid})


def domain(u):
    d = urllib.parse.urlparse(u or "").netloc.lower()
    return d[4:] if d.startswith("www.") else d


def urai(xml):
    """Item RSS -> artikel mentah {id, judul, sumber, url, tgl, ringkas}."""
    out = []
    for it in ET.fromstring(xml).iter("item"):
        url, judul = (it.findtext("link") or "").strip(), (it.findtext("title") or "").strip()
        sumber, src = (it.findtext("source") or "").strip(), it.find("source")
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
        if src is not None and domain(src.get("url")):
            out[-1]["domain"] = domain(src.get("url"))
    return out


def panen(daftar):
    hasil, gagal = [], 0
    for i, q in enumerate(daftar):
        ed, q = q if isinstance(q, tuple) else ("id", q)
        try:
            xs = urai(ambil(rss(q, ed)))
            for x in xs:
                if ed != "id":
                    x["ed"] = ed
            hasil += xs
        except Exception as e:
            gagal += 1
            print("gagal", e, file=sys.stderr)
        if i < len(daftar) - 1:
            time.sleep(1.0)  # sopan: ~1 permintaan per detik
    if gagal > len(daftar) // 2:
        raise RuntimeError(f"{gagal}/{len(daftar)} kueri gagal")
    return hasil


# ---------------------------------------------------------------- geocoder (nama wilayah Indonesia: sama untuk semua bencana)
PROV_EN = {"north sumatra": "12", "west sumatra": "13", "south sumatra": "16", "riau islands": "21", "bangka belitung islands": "19",
           "west java": "32", "central java": "33", "east java": "35", "west nusa tenggara": "52", "east nusa tenggara": "53",
           "west kalimantan": "61", "central kalimantan": "62", "south kalimantan": "63", "east kalimantan": "64",
           "north kalimantan": "65", "north sulawesi": "71", "central sulawesi": "72", "south sulawesi": "73",
           "southeast sulawesi": "74", "west sulawesi": "76", "north maluku": "82", "west papua": "92", "south papua": "93",
           "central papua": "94", "highland papua": "95", "southwest papua": "96"}
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

    def __init__(self, provinsi, pusat=None):
        PROVINSI = provinsi  # {kode: nama}, disuntik pemanggil
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
        for v, kode in PROV_EN.items():  # judul Inggris: "South Sumatra", "W Kalimantan"
            self.tambah(v, ("prov", kode, True))
            arah, sisa = v.split(" ", 1)
            if arah in ("north", "south", "east", "west", "central"):
                self.tambah(arah[0] + " " + sisa, ("prov", kode, True))
        nama_kab = {norm(n) for n in kab_nama}
        nama_prov = {norm(p) for p in PROVINSI.values()}
        for nama, ks in kab_nama.items():
            n = norm(nama)
            for k in ks:
                self.tambah(n, ("kab", k, n not in KAB_LEMAH))
                bare = n[5:] if n.startswith("kota ") else n
                self.tambah("kabupaten " + bare, ("kab", k, True)); self.tambah("kab " + bare, ("kab", k, True))
                self.tambah(bare + " regency", ("kab", k, True))
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
def buat_topik(tabel):
    """{topik: pola} -> {topik: regex terkompilasi}."""
    return {k: re.compile(v) for k, v in tabel.items()}


def topik(teks, tabel_re):
    t = norm(teks)
    return [k for k, r in tabel_re.items() if r.search(t)]


NEGASI = {"tidak", "tak", "belum", "bukan", "tanpa", "jangan", "gak", "nggak", "enggak", "tiada",
          "not", "never", "without", "isn", "doesn", "didn", "won", "cannot", "nor"}
# kata pencegahan menetralkan (bukan membalik) kata sesudahnya: "cegah karhutla meluas" bukan berita meluas
PENETRAL = {"cegah", "mencegah", "antisipasi", "mengantisipasi", "hadapi", "menghadapi", "prevent", "preventing", "prevention", "avert", "curb", "despite"}
PENGUAT = {"sangat": 1.5, "makin": 1.5, "semakin": 1.5, "kian": 1.5, "amat": 1.5, "terus": 1.3, "paling": 1.5, "kembali": 1.2,
           "very": 1.5, "increasingly": 1.5, "extremely": 1.5, "further": 1.3}


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


def skor(judul, ringkas, lex, saring=None):
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
            if saring and saring(f, tok, i):  # aturan khas bencana (mis. "padam" setelah "listrik"), disuntik leksikon
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



def gabung(lama, baru, sekarang, jendela_hari):
    """Gabung + buang duplikat: tautan sama, atau media sama dengan kumpulan kata judul sama. Buang yang lewat jendela."""
    batas = (sekarang - dt.timedelta(days=jendela_hari)).isoformat()
    lihat, kunci2, out = set(), set(), []
    for a in sorted(lama + baru, key=lambda a: a["tgl"]):
        k2 = (a["sumber"].lower(), " ".join(sorted(kunci_judul(a["judul"]))))
        if a["tgl"] < batas or a["url"] in lihat or k2 in kunci2:
            continue
        lihat.add(a["url"]); kunci2.add(k2); out.append(a)
    return out


# ---------------------------------------------------------------- pipeline generik (bencana tanpa olah khusus, mis. banjir)
def muat(rel, nama):
    """Muat berkas Python dari jalur relatif akar repo (nama modul unik supaya tidak bentrok dengan scripts/data/berita.py)."""
    import importlib.util
    if nama in sys.modules:
        return sys.modules[nama]
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(sp); sys.modules[nama] = m; sp.loader.exec_module(m)
    return m


def olah_ringan(arsip, sekarang, geo, L):
    """Arsip mentah -> berita.json versi ringkas. L = leksikon (scripts/berita/<id>.py): relevan, TOPIK_RE, SITUASI, RESPONS, saring."""
    art = []
    for a in arsip:
        teks = a["judul"] + " " + a.get("ringkas", "")
        g = geo.cari(teks)
        if not L.relevan(teks, g)[0]:
            continue
        s1, al1 = skor(a["judul"], a.get("ringkas", ""), L.SITUASI, getattr(L, "saring", None))
        s2, al2 = skor(a["judul"], a.get("ringkas", ""), L.RESPONS, getattr(L, "saring", None))
        art.append(dict({k: v for k, v in a.items() if k != "ed"}, prov=g["prov"], kab=g["kab"], kec=g["kec"], lat=g["lat"], lon=g["lon"],
                        presisi=g["presisi"], topik=topik(teks, L.TOPIK_RE), situasi=s1, respons=s2, label_situasi=label(s1),
                        label_respons=label(s2), alasan={"situasi": al1, "respons": al2},
                        _t=dt.datetime.fromisoformat(a["tgl"]), _k=kunci_judul(a["judul"]), _e=set(g["kec"] or g["kab"])))
    grup = defaultdict(list)
    for x, r in zip(art, kelompok(art)):
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
    t7, t72 = sekarang - dt.timedelta(days=7), sekarang - dt.timedelta(hours=72)
    rata = lambda xs, k: round(sum(x[k] for x in xs) / len(xs), 3) if xs else None
    harian = defaultdict(list)
    for x in art:
        harian[x["tgl"][:10]].append(x)
    harian = {d: {"n": len(xs), "cerita": len({x["cerita"] for x in xs}), "situasi_rata": rata(xs, "situasi"), "respons_rata": rata(xs, "respons"),
                  "per_topik": dict(Counter(t for x in xs for t in x["topik"]))} for d, xs in sorted(harian.items())}
    prov = {}
    for kode in L.PROVINSI:
        xs = [x for x in art if kode in x["prov"]]
        x7 = [x for x in xs if x["_t"] >= t7]
        if xs:
            prov[kode] = {"n": len(xs), "n7": len(x7), "situasi": rata(x7, "situasi"), "respons": rata(x7, "respons"),
                          "topik": dict(Counter(t for x in x7 for t in x["topik"]).most_common()), "terakhir": max(x["tgl"] for x in xs)}
    kab = defaultdict(lambda: [0, 0])
    for x in art:
        for k in x["kab"]:
            kab[k][0] += 1; kab[k][1] += x["_t"] >= t7
    sorotan = sorted((c for c in cerita.values() if dt.datetime.fromisoformat(c["akhir"]) >= t72), key=lambda c: (-c["n_media"], -c["n"]))[:10]
    art.sort(key=lambda x: x["_t"], reverse=True)
    keluar = art[:MAKS_ARTIKEL]
    for x in art:
        for k in ("_t", "_k", "_e"):
            x.pop(k, None)
    dipakai = {x["cerita"] for x in keluar} | {c["id"] for c in sorotan}
    return {"artikel": keluar, "cerita": [c for c in cerita.values() if c["id"] in dipakai], "harian": harian, "prov": prov, "kab": dict(kab),
            "media": [{"sumber": s, "n": n} for s, n in Counter(x["sumber"] for x in art).most_common(30)], "sorotan": sorotan,
            "_semua": art, "_n_cerita": len(cerita)}


MAKS_ARTIKEL = 1500


def jalankan(L, ambil_rss=True, isi_hari=0, akar=AKAR, sekarang=None):
    """Panen -> arsip bergulir data/raw/berita/<id>/arsip.json -> <L.DATA>/berita.json. Mengembalikan dict keluaran."""
    t0 = time.time()
    sekarang = sekarang or dt.datetime.now(WIB)
    raw = os.path.join(akar, getattr(L, "RAW", os.path.join("data/raw/berita", L.ID)))
    os.makedirs(raw, exist_ok=True)
    os.makedirs(os.path.join(akar, L.DATA), exist_ok=True)
    p_pusat, p_arsip = os.path.join(raw, "pusat.json"), os.path.join(raw, "arsip.json")
    pusat = json.load(open(p_pusat)) if os.path.exists(p_pusat) else Geo.hitung_pusat()
    if not os.path.exists(p_pusat):
        json.dump(pusat, open(p_pusat, "w"), ensure_ascii=False, separators=(",", ":"))
    geo = Geo(L.PROVINSI, pusat)
    arsip = json.load(open(p_arsip))["artikel"] if os.path.exists(p_arsip) else []
    if not arsip and not isi_hari:
        isi_hari = L.JENDELA_HARI
    daftar = [q for q, _ in L.kueri()]
    baru = panen([q + " when:7d" for q in daftar]) if ambil_rss else []
    if isi_hari and ambil_rss:
        for mulai in range(isi_hari, 7, -7):
            a, b = (sekarang - dt.timedelta(days=mulai)).date(), (sekarang - dt.timedelta(days=max(mulai - 7, 6))).date()
            baru += panen([f"{q} after:{a} before:{b}" for q in L.KUERI_UMUM])
            print(f"isi {a}..{b}: {len(baru)} item", file=sys.stderr)
    arsip = gabung(arsip, baru, sekarang, L.JENDELA_HARI)
    json.dump({"diperbarui": sekarang.isoformat(timespec="minutes"), "artikel": arsip}, open(p_arsip, "w"), ensure_ascii=False, separators=(",", ":"))
    h = olah_ringan(arsip, sekarang, geo, L)
    semua, n_cerita = h.pop("_semua"), h.pop("_n_cerita")
    out = {"dibuat": sekarang.isoformat(timespec="minutes"), "bencana": L.ID, "jendela_hari": L.JENDELA_HARI, "kueri": daftar, **h,
           "sentimen_teruji": bool(getattr(L, "SENTIMEN_TERUJI", False)),
           "metode": L.METODE,
           "ringkasan": {"diambil": len(baru), "arsip": len(arsip), "artikel": len(semua), "cerita": n_cerita,
                         "berlokasi": round(sum(1 for x in semua if x["prov"]) / max(1, len(semua)), 3), "detik": round(time.time() - t0)}}
    with open(os.path.join(akar, L.DATA, "berita.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(out["ringkasan"]), file=sys.stderr)
    return out


# ---------------------------------------------------------------- uji
UJI = os.path.join(AKAR, "scripts/umum/uji")


def uji():
    assert norm("Banjir Rob di Pekalongan!") == "banjir rob di pekalongan"
    assert jaccard({"a", "b"}, {"b", "c"}) == 1 / 3
    assert bersih_html("<b>a</b>  &amp; b") == "a & b"
    assert label(0.3) == "positif" and label(-0.3) == "negatif" and label(0.1) == "netral"
    s, al = skor("banjir tidak surut", "", {"surut": 2})
    assert s < 0 and al == ["-tidak surut"], (s, al)
    assert topik("Warga mengungsi", buat_topik({"korban": r"\bmengungsi"})) == ["korban"]
    xml = open(os.path.join(UJI, "feed_banjir.xml"), "rb").read()
    it = urai(xml)
    assert len(it) > 20 and all(x["judul"] and x["url"].startswith("http") for x in it), len(it)
    # kelompok: dua judul hampir sama dalam 72 jam jadi satu cerita
    t = dt.datetime(2026, 10, 15, tzinfo=WIB)
    a = [{"_t": t, "_k": kunci_judul("banjir rendam ratusan rumah pekalongan"), "_e": set()},
         {"_t": t + dt.timedelta(hours=2), "_k": kunci_judul("banjir rendam ratusan rumah di pekalongan"), "_e": set()}]
    assert kelompok(a) == [0, 0]
    print("umum/berita.py uji: ok")


def cli(argv):
    if not argv:
        return uji()
    L = muat(f"scripts/berita/{argv[0]}.py", "berita_" + argv[0])
    if len(argv) > 1 and argv[1] == "uji":
        return uji_bencana(L)
    jalankan(L, ambil_rss="ulang" not in argv[1:], isi_hari=0)


def uji_bencana(L):
    """Pada tangkapan feed tersimpan (offline): berapa yang lolos relevansi dan lokasi, cetak contoh judul."""
    geo = Geo(L.PROVINSI)
    it = urai(open(os.path.join(UJI, f"feed_{L.ID}.xml"), "rb").read())
    ok = [(x, geo.cari(x["judul"])) for x in it if L.relevan(x["judul"] + " " + x["ringkas"], geo.cari(x["judul"]))[0]]
    print(f"{L.ID}: {len(ok)}/{len(it)} lolos relevansi; berlokasi {sum(1 for _, g in ok if g['prov'])}")
    for x, g in ok[:5]:
        print("-", x["judul"], g["prov"], topik(x["judul"], L.TOPIK_RE))
    assert ok, "tidak ada yang lolos relevansi"


if __name__ == "__main__":
    cli(sys.argv[1:])
