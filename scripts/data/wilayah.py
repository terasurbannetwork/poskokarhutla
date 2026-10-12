"""Cari provinsi/kabupaten/kecamatan sebuah titik dari poligon public/geo/kecamatan/*.json."""
import json, math, os

AKAR = os.path.join(os.path.dirname(__file__), "../..")

PROVINSI = {
    "11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi",
    "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Kep. Bangka Belitung",
    "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah",
    "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat",
    "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah",
    "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara",
    "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara",
    "75": "Gorontalo", "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara", "91": "Papua",
    "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan",
    "96": "Papua Barat Daya",
}
# 6 provinsi pantauan harian BNPB + 3 yang hotspot musimnya lebih besar dari sebagian di antaranya
PRIORITAS = ["62", "16", "61", "93", "64", "63", "15", "53", "14"]
BNPB = {"14": "Riau", "15": "Jambi", "16": "Sumsel", "61": "Kalbar", "62": "Kalteng", "63": "Kalsel"}


def _cincin(geom):
    """Cincin luar tiap bagian poligon (lubang diabaikan; batasnya sudah disederhanakan)."""
    bagian = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [p[0] for p in bagian]


def _di_dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        xi, yi = r[i][0], r[i][1]
        xj, yj = r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


class Wilayah:
    SEL = 0.5  # derajat per sel indeks

    def __init__(self):
        self.indeks = {}
        for kode in PROVINSI:
            p = os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")
            for f in json.load(open(p))["features"]:
                ident = (kode, f["properties"]["kab"], f["properties"]["kec"])
                for r in _cincin(f["geometry"]):
                    xs = [c[0] for c in r]
                    ys = [c[1] for c in r]
                    kotak = (min(xs), min(ys), max(xs), max(ys))
                    for gx in range(math.floor(kotak[0] / self.SEL), math.floor(kotak[2] / self.SEL) + 1):
                        for gy in range(math.floor(kotak[1] / self.SEL), math.floor(kotak[3] / self.SEL) + 1):
                            self.indeks.setdefault((gx, gy), []).append((kotak, r, ident))

    def cari(self, lon, lat):
        """(kode_prov, kab, kec) atau None kalau di laut / luar negeri."""
        for kotak, r, ident in self.indeks.get((math.floor(lon / self.SEL), math.floor(lat / self.SEL)), ()):
            if kotak[0] <= lon <= kotak[2] and kotak[1] <= lat <= kotak[3] and _di_dalam(lon, lat, r):
                return ident
        return None


class Poligon:
    """Indeks titik-dalam-poligon generik untuk lapisan GeoJSON (gambut, kawasan, konsesi)."""
    SEL = 0.5

    def __init__(self, jalur):
        self.indeks = {}
        if not os.path.exists(jalur):
            return
        for f in json.load(open(jalur))["features"]:
            for r in _cincin(f["geometry"]):
                xs, ys = [c[0] for c in r], [c[1] for c in r]
                kotak = (min(xs), min(ys), max(xs), max(ys))
                for gx in range(math.floor(kotak[0] / self.SEL), math.floor(kotak[2] / self.SEL) + 1):
                    for gy in range(math.floor(kotak[1] / self.SEL), math.floor(kotak[3] / self.SEL) + 1):
                        self.indeks.setdefault((gx, gy), []).append((kotak, r, f["properties"]))

    def cari(self, lon, lat):
        for kotak, r, prop in self.indeks.get((math.floor(lon / self.SEL), math.floor(lat / self.SEL)), ()):
            if kotak[0] <= lon <= kotak[2] and kotak[1] <= lat <= kotak[3] and _di_dalam(lon, lat, r):
                return prop
        return None


if __name__ == "__main__":
    w = Wilayah()
    assert w.cari(113.92, -2.21)[0] == "62", w.cari(113.92, -2.21)  # Palangka Raya
    assert w.cari(104.75, -2.98)[0] == "16", w.cari(104.75, -2.98)  # Palembang
    assert w.cari(140.4, -8.5)[0] == "93", w.cari(140.4, -8.5)      # Merauke
    assert w.cari(108.0, -5.0) is None                               # Laut Jawa
    print("ok")
