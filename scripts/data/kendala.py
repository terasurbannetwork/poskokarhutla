"""Kendala lapangan per kompleks api -> public/data/kendala.json

Meniru label slide 7 paparan Rakor BNPB Kalteng 19 Okt 2026 ("Air jauh", "Akses sulit di rawa", "Roda empat sulit masuk"),
tetapi dihitung dari data yang dipegang repo, bukan dari tabel BNPB. Cakupan: kompleks operasi.json di provinsi yang lapisan
sungai+kanal+jalan OSM-nya lengkap (kanal.json `provinsi` = 9 provinsi prioritas); kompleks lain tidak dinilai (tidak ada di keluaran),
bukan "tanpa kendala".

Sumber data (semua sudah terbit, tanpa jaringan, aman dijalankan harian):
  air   : sungai besar OSM waterway=river (jalan.geojson kelas 6) dan kanal/parit/drain OSM (kanal.json, sel 0,02 derajat);
          danau, rawa, embung, dan anak sungai kecil TIDAK ada di data ini -> air_km batas atas (air sebenarnya bisa lebih dekat).
  jalan : jalan OSM kelas trunk/primary (1), secondary (2), tertiary (3) dari jalan.geojson (bisa dilalui roda empat);
          unclassified dan track (jalan desa/kebun/tanah) hanya ada di graf waktu tempuh, bukan di peta -> lihat kaki_km.
  kaki_km, jam : akses.json (graf jalan+sungai OSM semua kelas) untuk kompleks level 3 di 9 provinsi prioritas; jam = tercepat dari
          posko/daops. Kompleks tanpa entri akses.json: kaki_km dan jam null.
  gambut: operasi.json `jenis` == "gambut" (jenis tutupan lahan kompleks menurut operasi.py).

Pakai:  python3 scripts/data/kendala.py        # tulis public/data/kendala.json (jalan setelah operasi.py dan akses.py)
        python3 scripts/data/kendala.py --uji  # self-check
"""
import datetime as dt, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR  # noqa: E402

DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))

# SEMUA ambang di sini; ikut ditulis ke JSON (`ambang`). Ambang = penyaring perencanaan platform ini, BUKAN angka BNPB
# (slide BNPB hanya menyebut label tanpa angka) dan bukan standar baku.
AMBANG = {
    "air_jauh_km": 2.0,     # air_km > ini -> "Air jauh". Rujukan internal operasi.py KOEF: kanal_dekat 0,5 km (selang 10-15 gulung) dan
                            # jarak_air_heli lo 2 km (batas dekat heli isi ember); di atas 2 km pompa+selang tidak lagi mungkin, tinggal heli/tangki.
    "rawa_jalan_km": 1.0,   # gambut dan kaki_km (jalan/track/sungai terdekat, akses.py) > ini -> "Akses sulit di rawa". Asumsi: 1 km pada 4 km/jam
                            # (KAKI_KMJ akses.py) = 15 menit sekali jalan di gambut sambil memikul selang/pompa.
    "roda4_km": 2.0,        # tidak ada jalan roda empat (trunk..tertiary OSM) <= ini -> "Roda empat sulit masuk". Asumsi: 2 km = 30 menit jalan kaki
                            # memikul peralatan dari titik terakhir kendaraan.
    "cari_maks_km": 25.0,   # pencarian terdekat dihentikan di sini; di luar ini nilai null dan dihitung melewati ambang
}
JALAN_KELAS = {1: "trunk/primary", 2: "secondary", 3: "tertiary"}
LABEL = {"air": "Air jauh", "rawa": "Akses sulit di rawa", "roda4": "Roda empat sulit masuk"}
SEL = 0.05            # derajat, indeks ruang
LANGKAH_KM = 0.5      # garis dipadatkan tiap 0,5 km supaya jarak ke titik terdekat tidak melonjak pada segmen panjang


def km(a1, o1, a2, o2):
    return math.hypot((a2 - a1) * 110.57, (o2 - o1) * 111.32 * math.cos(math.radians((a1 + a2) / 2)))


class Indeks:
    def __init__(self):
        self.sel = {}

    def tambah(self, lat, lon, tag):
        self.sel.setdefault((math.floor(lat / SEL), math.floor(lon / SEL)), []).append((lat, lon, tag))

    def garis(self, pts, tag):
        """pts [(lat, lon)] dipadatkan tiap LANGKAH_KM."""
        for a, b in zip(pts, pts[1:]):
            n = max(1, math.ceil(km(*a, *b) / LANGKAH_KM))
            for i in range(n):
                self.tambah(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, tag)
        if pts:
            self.tambah(*pts[-1], tag)

    def terdekat(self, lat, lon, maks_km):
        """(jarak_km, tag) terdekat dalam maks_km, atau (None, None). Cincin sel diperluas sampai tak mungkin ada yang lebih dekat."""
        gy, gx = math.floor(lat / SEL), math.floor(lon / SEL)
        sel_km = SEL * 110.57 * 0.97   # lebar sel terkecil (cos 14 derajat) -> tepi cincin r terjamin >= (r - 1) sel dari titik
        best, tag, r = None, None, 0
        while True:
            if (r - 1) * sel_km > maks_km or (best is not None and best <= (r - 1) * sel_km):
                break
            for y in range(gy - r, gy + r + 1):
                for x in range(gx - r, gx + r + 1):
                    if max(abs(y - gy), abs(x - gx)) != r:
                        continue
                    for la, lo, t in self.sel.get((y, x), ()):
                        d = km(lat, lon, la, lo)
                        if best is None or d < best:
                            best, tag = d, t
            r += 1
        return (best, tag) if best is not None and best <= maks_km else (None, None)


def label(air_km, air_ada, gambut, kaki_km, jalan_km, a=AMBANG):
    """Aturan label. air_km/jalan_km None = tidak ditemukan dalam cari_maks_km (dianggap lewat ambang). kaki_km None = bukan kompleks akses.json:
    aturan rawa memakai jalan_km (jalan roda empat) sebagai pengganti terburuk."""
    out = []
    if air_km is None or air_km > a["air_jauh_km"]:
        out.append(LABEL["air"])
    akses = kaki_km if kaki_km is not None else jalan_km
    if gambut and (akses is None or akses > a["rawa_jalan_km"]):
        out.append(LABEL["rawa"])
    if jalan_km is None or jalan_km > a["roda4_km"]:
        out.append(LABEL["roda4"])
    return out


def bangun(kompleks, air, jalan, akses, prov_ok, a=AMBANG):
    out = {}
    for k in kompleks:
        if k["prov"] not in prov_ok:
            continue
        da, ja = air.terdekat(k["lat"], k["lon"], a["cari_maks_km"])
        dj, jj = jalan.terdekat(k["lat"], k["lon"], a["cari_maks_km"])
        ak = akses.get(k["id"])
        kaki = ak["kaki_km"] if ak else None
        jam = ak["dari"][0]["jam"] if ak and ak.get("dari") else None
        gambut = k.get("jenis") == "gambut"
        out[k["id"]] = {"prov": k["prov"], "kab": k.get("kab"),
                        "air_km": None if da is None else round(da, 2), "air_jenis": ja,
                        "jalan_km": None if dj is None else round(dj, 2), "jalan_kelas": JALAN_KELAS.get(jj) if dj is not None else None,
                        "roda4": dj is not None and dj <= a["roda4_km"], "kaki_km": kaki, "jam": jam, "gambut": gambut, "rawa_dasar": "kaki_km" if kaki is not None else "jalan_km",
                        "label": label(da, ja, gambut, kaki, dj, a)}
    return out


def main():
    t0 = time.time()
    op = json.load(open(os.path.join(DATA, "operasi.json")))
    kanal = json.load(open(os.path.join(DATA, "kanal.json")))
    air, jalan = Indeks(), Indeks()
    for la, lo, panjang in kanal["grid"]:
        air.tambah(la, lo, "kanal")
    for f in json.load(open(os.path.join(DATA, "jalan.geojson")))["features"]:
        kl = f["properties"]["k"]
        for g in f["geometry"]["coordinates"]:
            pts = [(c[1], c[0]) for c in g]
            if kl == 6:
                air.garis(pts, "sungai")
            elif kl in JALAN_KELAS:
                jalan.garis(pts, kl)
    ak = json.load(open(os.path.join(DATA, "akses.json")))
    ak.pop("_meta", None)
    hasil = bangun(op["kompleks"], air, jalan, ak, set(kanal["provinsi"]))
    n_lab = {l: sum(l in v["label"] for v in hasil.values()) for l in LABEL.values()}
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "per": op.get("per"), "ambang": AMBANG,
           "label": LABEL, "n": len(hasil), "n_label": n_lab,
           "catatan": ("Perkiraan perencanaan dari data OpenStreetMap (ODbL) yang sudah terbit di repo, bukan survei lapangan dan bukan tabel BNPB; label meniru slide 7 Rakor BNPB Kalteng 19 Okt 2026. "
                       "Hanya kompleks operasi.json di 9 provinsi prioritas (kanal.json provinsi). Ambang di `ambang` adalah asumsi platform (alasan di docstring scripts/data/kendala.py): "
                       "air_km > air_jauh_km: Air jauh; gambut dan akses (kaki_km dari akses.json bila ada, selain itu jalan_km) > rawa_jalan_km: Akses sulit di rawa; "
                       "jalan_km > roda4_km: Roda empat sulit masuk. "
                       "air_km = jarak terdekat ke sungai besar OSM (air_jenis sungai) atau kanal/parit OSM (sel 0,02 derajat, galat sampai ~1,5 km); danau, embung, rawa, dan anak sungai kecil tidak ada di data, jadi air_km adalah batas atas "
                       "(null = tak ada dalam cari_maks_km, dihitung melewati ambang). jalan_km = jarak ke jalan OSM trunk/primary/secondary/tertiary (jalan_kelas); jalan desa/kebun (unclassified, track) tidak ada di peta sehingga "
                       "Roda empat sulit masuk bisa berlebih di tempat yang hanya punya jalan kebun. kaki_km dan jam (tercepat dari posko/daops) hanya untuk kompleks yang masuk akses.json (level 3), selain itu null. "
                       "Kondisi musiman (banjir, portal perusahaan, jalan rusak) tidak dimodelkan."),
           "kompleks": hasil}
    p = os.path.join(DATA, "kendala.json")
    json.dump(out, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"kendala.json {len(hasil)} kompleks, label {n_lab}, {os.path.getsize(p) / 1e3:.0f} KB, {time.time() - t0:.1f} dtk")


def uji():
    e = 1 / 111.32   # ~1 km di khatulistiwa
    ix = Indeks()
    ix.garis([(0, 0), (0, 10 * e)], 2)      # garis 10 km ke timur, kelas 2
    d, t = ix.terdekat(3 * e, 5 * e, 25)    # 3 km di utara tengah garis -> ~3 km (padat 0,5 km)
    assert abs(d - 3) < 0.05 and t == 2, (d, t)
    d, t = ix.terdekat(0, 12 * e, 25)       # lewat ujung: ~2 km dari titik akhir
    assert abs(d - 2) < 0.05, d
    assert ix.terdekat(0, 40 * e, 25) == (None, None)   # di luar cari_maks_km
    d, _ = ix.terdekat(0.3, 0, 25)          # lintas banyak sel (33 km) -> None; 20 km -> ketemu
    assert d is None
    ix.tambah(0.18, 0, "x")                 # ~19,9 km, beberapa cincin sel jauhnya
    d, t = ix.terdekat(0.09, 20 * e, 25)    # titik di tengah antara garis (10 km) dan "x": cincin harus cukup luas
    assert abs(d - 14.1) < 0.2, d   # ke ujung garis (10 km utara-barat daya), bukan ke "x" (22 km)
    L, a = label, AMBANG
    assert L(1.0, "sungai", False, None, 0.5) == []
    assert L(2.5, "sungai", False, 0.2, 0.5) == ["Air jauh"]
    assert L(2.0, "sungai", False, 0.2, 0.5) == []                       # tepat di ambang: tidak berlabel
    assert L(0.5, "kanal", True, 1.5, 0.5) == ["Akses sulit di rawa"]
    assert L(0.5, "kanal", True, 1.0, 0.5) == []
    assert L(0.5, "kanal", False, 5.0, 0.5) == []                         # bukan gambut: tak ada label rawa
    assert L(0.5, "kanal", True, None, 3.0) == ["Akses sulit di rawa", "Roda empat sulit masuk"]   # tanpa akses.json pakai jalan_km
    assert L(None, None, True, None, None) == ["Air jauh", "Akses sulit di rawa", "Roda empat sulit masuk"]
    # bangun end-to-end kecil
    air, jal = Indeks(), Indeks()
    air.tambah(0, 3 * e, "sungai")
    jal.garis([(0, 0), (0, 5 * e)], 3)
    ks = [{"id": "K1", "prov": "62", "kab": "X", "lat": 0, "lon": 0, "jenis": "gambut"}, {"id": "K2", "prov": "11", "lat": 0, "lon": 0}]
    r = bangun(ks, air, jal, {"K1": {"kaki_km": 0.4, "dari": [{"jam": 2.5}]}}, {"62"})
    assert list(r) == ["K1"] and r["K1"]["air_jenis"] == "sungai" and abs(r["K1"]["air_km"] - 3) < 0.01 and r["K1"]["roda4"] is True
    assert r["K1"]["jalan_kelas"] == "tertiary" and r["K1"]["jam"] == 2.5 and r["K1"]["label"] == ["Air jauh"], r
    print("kendala: uji lolos")


if __name__ == "__main__":
    if "--uji" in sys.argv[1:] or "uji" in sys.argv[1:]:
        uji()
    else:
        main()
