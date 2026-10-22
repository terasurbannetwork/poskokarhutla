"""Tarik mentah OSM untuk lapisan akses, kanal & fasilitas (9 provinsi prioritas) ke data/raw/osm/.

Pakai:  python3 scripts/scrape/tarik_osm.py [jalan|sungai|fasilitas ...] [kode ...]
jalan & fasilitas: satu kueri per provinsi (area ISO3166-2; diuji: Kalteng < 10 detik).
sungai (sungai + kanal/parit, berat: Kalteng 78 rb ruas kanal): ubin 2 derajat sama dengan
scripts/scrape/osm.py, jadi berkas <kode>-sungai-*.json dipakai bersama.
Yang sudah ada dipakai ulang; hapus berkas untuk menarik ulang.
Sumber: OpenStreetMap via Overpass (ODbL, (c) kontributor OpenStreetMap).
"""
import math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../data"))
import osm
from osm import MENTAH, UBIN, bbox, overpass, q_sungai
from wilayah import PRIORITAS

# kumi.systems timeout saat diuji 13 Okt 2026; mail.ru cermin resmi yang menjawab
osm.SERVER[:] = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]

JALAN = "trunk|primary|secondary|tertiary|trunk_link|primary_link|secondary_link|tertiary_link|unclassified|track"


# ISO 3166-2:ID semua 38 provinsi (lapisan jalan & sungai untuk seluruh Indonesia)
ISO = {"11": "AC", "12": "SU", "13": "SB", "14": "RI", "15": "JA", "16": "SS", "17": "BE", "18": "LA", "19": "BB", "21": "KR",
       "31": "JK", "32": "JB", "33": "JT", "34": "YO", "35": "JI", "36": "BT", "51": "BA", "52": "NB", "53": "NT",
       "61": "KB", "62": "KT", "63": "KS", "64": "KI", "65": "KU", "71": "SA", "72": "ST", "73": "SN", "74": "SG", "75": "GO", "76": "SR",
       "81": "MA", "82": "MU", "91": "PA", "92": "PB", "93": "PS", "94": "PT", "95": "PE", "96": "PD"}


def q_jalan(kode):
    """Jalan kelas tersier ke atas + jalan desa & jalan tanah (track) + sungai utama (rute perahu)."""
    return f"""[out:json][timeout:300];
area["ISO3166-2"="ID-{ISO[kode]}"]->.a;
(way[highway~"^({JALAN})$"](area.a); way[waterway=river](area.a););
out geom tags;"""


def q_fasilitas(kode):
    # tanpa name~"puskesmas",i: regex nama atas semua amenity membuat kueri 504; puskesmas di OSM umumnya clinic/healthcare=centre
    return f"""[out:json][timeout:300];
area["ISO3166-2"="ID-{ISO[kode]}"]->.a;
(
  nwr[amenity~"^(school|kindergarten|hospital|clinic|doctors)$"](area.a);
  nwr[healthcare~"^(centre|hospital|clinic)$"](area.a);
);
out center tags;"""


def q_air(kode):
    """Tampungan air untuk sumber pompa/estafet (air_dem.py): embung, waduk, danau, kolam. Hanya titik tengah + tag."""
    return f"""[out:json][timeout:300];
area["ISO3166-2"="ID-{ISO[kode]}"]->.a;
(
  nwr[landuse~"^(reservoir|basin)$"](area.a);
  nwr[natural=water][water~"^(reservoir|pond|lake|basin|oxbow)$"](area.a);
  nwr[natural=water][name~"embung|waduk|danau|telaga",i](area.a);
);
out center tags;"""


JENIS = {"jalan": q_jalan, "sungai": q_sungai, "fasilitas": q_fasilitas, "air": q_air}


def ubin(kode):
    s, w, n, e = bbox(kode)
    for i in range(math.ceil((n - s) / UBIN)):
        for j in range(math.ceil((e - w) / UBIN)):
            y, x = s + i * UBIN, w + j * UBIN
            yield y, x, (y, x, min(y + UBIN, n), min(x + UBIN, e))


def berkas(kode, jenis, y, x):
    return os.path.join(MENTAH, f"{kode}-{jenis}-{y:.1f}_{x:.1f}.json")


def semua(kode, jenis):
    """Elemen unik semua ubin satu provinsi (fitur lintas ubin muncul sekali)."""
    if jenis != "sungai":
        yield from overpass(JENIS[jenis](kode), os.path.join(MENTAH, f"prov-{jenis}-{kode}.json"))["elements"]
        return
    seen = set()
    for y, x, b in ubin(kode):
        for el in overpass(JENIS[jenis](b), berkas(kode, jenis, y, x))["elements"]:
            if (el["type"], el["id"]) not in seen:
                seen.add((el["type"], el["id"]))
                yield el


if __name__ == "__main__":
    jenis = [a for a in sys.argv[1:] if a in JENIS] or list(JENIS)
    kodes = [a for a in sys.argv[1:] if a not in JENIS]
    # cakupan bawaan (tanpa kode): fasilitas 9 provinsi prioritas, jalan 38 provinsi, sungai/kanal prioritas + bergambut
    from wilayah import PROVINSI
    from kanal import GAMBUT_LAIN
    bawaan = {"fasilitas": PRIORITAS, "jalan": list(PROVINSI), "sungai": PRIORITAS + GAMBUT_LAIN, "air": PRIORITAS + GAMBUT_LAIN}
    for j in jenis:
        for kode in kodes or bawaan[j]:
            n = sum(1 for _ in semua(kode, j))
            print(kode, j, n, flush=True)
