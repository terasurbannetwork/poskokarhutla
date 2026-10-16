"""Bersama modul gempa: unduh dengan jeda + UA peramban penuh, simpan atomik, saring Indonesia, wilayah terdekat.
Python 3.12 stdlib saja. Angka di JSON memakai titik desimal; format Indonesia urusan layar."""
import json, math, os, re, sys, time, urllib.error, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
KELUAR = os.path.join(AKAR, "public/gempa/data")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0.0.0 Safari/537.36")
JEDA = 1.5  # detik antar-permintaan
BBOX = (-12.0, 7.0, 94.0, 142.0)  # lat min, lat maks, lon min, lon maks
_terakhir = [0.0]


def ambil(url, coba=4, batas_waktu=120, mentah=False):
    """GET -> JSON (atau bytes bila mentah). Jeda JEDA dtk antar-permintaan; galat sementara diulang makin lama."""
    for i in range(coba):
        tunggu = JEDA - (time.time() - _terakhir[0])
        if tunggu > 0:
            time.sleep(tunggu)
        _terakhir[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=batas_waktu) as r:
                isi = r.read()
            return isi if mentah else json.loads(isi)
        except urllib.error.HTTPError as e:
            if i == coba - 1 or (400 <= e.code < 500 and e.code not in (408, 429)):
                raise RuntimeError(f"{url.split('?')[0]}: HTTP {e.code} {e.read().decode(errors='replace')[:200]}")
            time.sleep(10 * (i + 1))
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url.split('?')[0]}: {e}")
            time.sleep(10 * (i + 1))


def simpan(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:  # atomik: jalan yang mati di tengah tidak merusak berkas lama
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def jarak_km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def usgs_url(aksi, mulai, akhir, m_min, **tambah):
    q = {"minlatitude": BBOX[0], "maxlatitude": BBOX[1], "minlongitude": BBOX[2], "maxlongitude": BBOX[3],
         "starttime": mulai, "endtime": akhir, "minmagnitude": m_min, "orderby": "time-asc", **tambah}
    if aksi == "count":
        q.pop("orderby")
    return f"https://earthquake.usgs.gov/fdsnws/event/1/{aksi}?" + urllib.parse.urlencode(q)


# Negara tetangga yang ikut terjaring kotak. Dinilai dari teks `place` USGS dan koordinat.
ASING = ("Philippines", "Timor-Leste", "East Timor", "Timor Leste", "Papua New Guinea", "Malaysia", "Brunei",
         "Singapore", "Thailand", "Burma", "Myanmar", "Australia", "Solomon", "Mindanao", "Sulu Sea", "Palau")
_PUSAT = []


def _pusat():
    if not _PUSAT:
        d = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
        _PUSAT.extend((k.split("|", 1)[0], v[0], v[1]) for k, v in d.items())
    return _PUSAT


def terdekat(lat, lon, batas_km=300):
    """(kode_prov, jarak_km) pusat kecamatan terdekat dalam batas_km, selain itu None. Untuk gempa laut."""
    best = None
    for kp, la, lo in _pusat():
        if abs(la - lat) > batas_km / 100 or abs(lo - lon) > batas_km / 90:  # buang cepat; 3 derajat > 300 km
            continue
        d = jarak_km(lat, lon, la, lo)
        if d <= batas_km and (best is None or d < best[1]):
            best = (kp, d)
    return best


def provinsi_gempa(w, lat, lon, place):
    """kode provinsi untuk gempa USGS atau None bila bukan Indonesia.
    1. Darat: poligon kecamatan (selalu diterima).
    2. Dekat pusat kecamatan Indonesia (d <= 100 km): diterima apa pun negara kota di `place` (USGS menamai kota terdekat dari negara
       mana pun, mis. Lospalos/Sarangani untuk gempa Maluku Barat Daya/Talaud), KECUALI place menyebut negara asing dengan jarak "X km"
       dan X <= d: gempa lebih dekat ke kota asing itu daripada ke pusat kecamatan Indonesia (Mindanao, Dili, Vanimo ditolak).
    3. Lebih jauh: tolak bila place menyebut negara asing; selain itu provinsi terdekat <= 200 km (600 km bila place menyebut Indonesia)."""
    adm = w.cari(lon, lat)
    if adm:
        return adm[0]
    asing = any(k in (place or "") for k in ASING)
    dekat = terdekat(lat, lon, 100)
    if dekat:
        x = re.match(r"(\d+) km ", place or "")
        if not (asing and x and int(x.group(1)) <= dekat[1]):
            return dekat[0]
        return None
    if asing:
        return None
    t = terdekat(lat, lon, 600 if "Indonesia" in (place or "") else 200)
    return t[0] if t else None
