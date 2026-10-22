"""Kendala lapangan per kompleks api -> public/data/kendala.json

Terinspirasi label slide 7 paparan Rakor BNPB Kalteng 19 Okt 2026 ("Air jauh", "Akses sulit di rawa", "Roda empat sulit masuk"),
tetapi labelnya sengaja diberi nama sesuai yang DIUKUR ("Sungai/kanal besar > 2 km", "Jalan utama > 2 km"), dihitung dari data yang dipegang repo, bukan dari tabel BNPB. Cakupan: kompleks operasi.json di provinsi yang lapisan
sungai+kanal+jalan OSM-nya lengkap (kanal.json `provinsi` = 9 provinsi prioritas); kompleks lain tidak dinilai (tidak ada di keluaran),
bukan "tanpa kendala".

Sumber data (semua sudah terbit, tanpa jaringan, aman dijalankan harian):
  air   : sungai besar OSM waterway=river (jalan.geojson kelas 6) dan kanal/parit/drain OSM (kanal.json, sel 0,02 derajat);
          danau, rawa, embung, dan anak sungai kecil TIDAK ada di data ini -> air_km batas atas (air sebenarnya bisa lebih dekat).
  jalan : jalan OSM kelas trunk/primary (1), secondary (2), tertiary (3) dari jalan.geojson;
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
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
from akses import daftar_akses, pasangkan_akses  # noqa: E402  (akses.json dicocokkan ke kompleks lewat lokasi, bukan id harian)

DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))

# SEMUA ambang di sini; ikut ditulis ke JSON (`ambang`). Ambang = penyaring perencanaan platform ini, BUKAN angka BNPB
# (slide BNPB hanya menyebut label tanpa angka) dan bukan standar baku.
AMBANG = {
    "air_jauh_km": 2.0,     # air_km > ini -> label air. 2 km mengacu pada koef jarak_air_heli lo di operasi.py (skenario optimis jarak isi ember),
                            # BUKAN batas kemampuan heli atau selang; kanal_dekat 0,5 km (selang 10-15 gulung) di berkas yang sama jauh di bawahnya.
    "rawa_jalan_km": 1.0,   # gambut dan kaki_km (jalan/track/sungai terdekat, akses.py) > ini -> "Akses sulit di rawa". Asumsi: 1 km pada 4 km/jam
                            # (KAKI_KMJ akses.py) = 15 menit sekali jalan di gambut sambil memikul selang/pompa.
    "jalan_utama_km": 2.0,  # tidak ada jalan trunk/primary/secondary/tertiary OSM <= ini -> "Jalan utama > 2 km". Mengukur jarak ke jalan UTAMA saja;
                            # jalan desa/kebun (unclassified, track) belum terdata di peta terbit, jadi BUKAN bukti roda empat tak bisa masuk. Asumsi 2 km = 30 menit jalan kaki.
    "air_jauh_acuan": "2 km mengacu pada koef jarak_air_heli lo di operasi.py (asumsi platform), bukan batas kemampuan heli",
    "cari_maks_km": 25.0,   # pencarian terdekat dihentikan di sini; di luar ini nilai null dan dihitung melewati ambang
}
JALAN_KELAS = {1: "trunk/primary", 2: "secondary", 3: "tertiary"}
LABEL = {"air": "Sungai/kanal besar > 2 km", "rawa": "Akses sulit di rawa", "jalan": "Jalan utama > 2 km"}
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


def label(air_km, gambut, kaki_km, jalan_km, a=AMBANG):
    """air_km/jalan_km None = tidak ditemukan dalam cari_maks_km (dianggap melewati ambang). Label rawa HANYA bila kaki_km (akses.json,
    jalan/track/sungai semua kelas) diketahui; tanpa itu tidak ada label rawa (yang terukur cuma jalan utama, itu label tersendiri)."""
    out = []
    if air_km is None or air_km > a["air_jauh_km"]:
        out.append(LABEL["air"])
    if gambut and kaki_km is not None and kaki_km > a["rawa_jalan_km"]:
        out.append(LABEL["rawa"])
    if jalan_km is None or jalan_km > a["jalan_utama_km"]:
        out.append(LABEL["jalan"])
    return out


def bangun(kompleks, air, jalan, akses, prov_ok, a=AMBANG):
    out = {}
    daftar = pasangkan_akses(daftar_akses(akses), [(k["id"], k["lat"], k["lon"]) for k in kompleks if k["prov"] in prov_ok])
    for k in kompleks:
        if k["prov"] not in prov_ok:
            continue
        da, ja = air.terdekat(k["lat"], k["lon"], a["cari_maks_km"])
        dj, jj = jalan.terdekat(k["lat"], k["lon"], a["cari_maks_km"])
        ak = daftar.get(k["id"])
        kaki = ak["kaki_km"] if ak else None
        jam = ak["dari"][0]["jam"] if ak and ak.get("dari") else None
        gambut = k.get("jenis") == "gambut"
        out[k["id"]] = {"prov": k["prov"], "kab": k.get("kab"),
                        "air_km": None if da is None else round(da, 2), "air_jenis": ja,
                        "jalan_km": None if dj is None else round(dj, 2), "jalan_kelas": JALAN_KELAS.get(jj) if dj is not None else None,
                        "jalan_utama_dekat": dj is not None and dj <= a["jalan_utama_km"], "kaki_km": kaki, "jam": jam, "gambut": gambut, 
                        "label": label(da, gambut, kaki, dj, a)}
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
                       "air_km > air_jauh_km: label Sungai/kanal besar > 2 km; gambut dan kaki_km (akses.json) > rawa_jalan_km: Akses sulit di rawa (hanya bila kaki_km ada); "
                       "jalan_km > jalan_utama_km: Jalan utama > 2 km. "
                       "air_km = jarak terdekat ke sungai besar OSM (air_jenis sungai) atau kanal/parit OSM (sel 0,02 derajat, galat sampai ~1,5 km); danau, embung, rawa, dan anak sungai kecil tidak ada di data, jadi air_km adalah batas atas "
                       "(null = tak ada dalam cari_maks_km, dihitung melewati ambang). 2 km air mengacu pada koef jarak_air_heli lo di operasi.py, bukan batas kemampuan heli. "
                       "jalan_km = jarak ke jalan OSM trunk/primary/secondary/tertiary (jalan_kelas). Jalan desa/kebun (unclassified, track) BELUM terdata di peta terbit (jalan.geojson hanya kelas 1-3, graf_jalan.json.gz tidak menyimpan kelas), "
                       "jadi label jalan menyatakan jarak ke jalan utama, bukan bahwa roda empat tidak bisa masuk. kaki_km dan jam (tercepat dari posko/daops) hanya untuk kompleks yang masuk akses.json (level 3), selain itu null dan tanpa label rawa. "
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
    L = label
    assert L(1.0, False, None, 0.5) == []
    assert L(2.5, False, 0.2, 0.5) == [LABEL["air"]]
    assert L(2.0, False, 0.2, 0.5) == []                                  # tepat di ambang: tidak berlabel
    assert L(0.5, True, 1.5, 0.5) == [LABEL["rawa"]]
    assert L(0.5, True, 1.0, 0.5) == []
    assert L(0.5, False, 5.0, 0.5) == []                                  # bukan gambut: tak ada label rawa
    assert L(0.5, True, None, 3.0) == [LABEL["jalan"]]                    # tanpa kaki_km: TIDAK ada label rawa
    assert L(None, True, 3.0, None) == [LABEL["air"], LABEL["rawa"], LABEL["jalan"]]
    # bangun end-to-end kecil
    air, jal = Indeks(), Indeks()
    air.tambah(0, 3 * e, "sungai")
    jal.garis([(0, 0), (0, 5 * e)], 3)
    ks = [{"id": "K1", "prov": "62", "kab": "X", "lat": 0, "lon": 0, "jenis": "gambut"}, {"id": "K2", "prov": "11", "lat": 0, "lon": 0}]
    r = bangun(ks, air, jal, {"K1": {"lat": 0, "lon": 0, "kaki_km": 0.4, "dari": [{"jam": 2.5}]}}, {"62"})
    assert list(r) == ["K1"] and r["K1"]["air_jenis"] == "sungai" and abs(r["K1"]["air_km"] - 3) < 0.01 and r["K1"]["jalan_utama_dekat"] is True
    assert r["K1"]["jalan_kelas"] == "tertiary" and r["K1"]["jam"] == 2.5 and r["K1"]["label"] == [LABEL["air"]], r
    # akses dicocokkan lewat lokasi: id berbeda (K0900) tapi 1 km dari entri tetap cocok; 10 km tidak; entri tanpa lokasi diabaikan
    ak = {"_meta": {}, "K1": {"lat": 0, "lon": 0, "kaki_km": 0.4, "dari": [{"jam": 2.5}]}, "K9": {"kaki_km": 7.0, "dari": [{"jam": 9.0}]}}
    r = bangun([{"id": "K0900", "prov": "62", "lat": 0, "lon": e, "jenis": "gambut"}], air, jal, ak, {"62"})
    assert r["K0900"]["kaki_km"] == 0.4 and r["K0900"]["jam"] == 2.5, r
    r = bangun([{"id": "K1", "prov": "62", "lat": 0, "lon": 10 * e, "jenis": "gambut"}], air, jal, ak, {"62"})
    assert r["K1"]["kaki_km"] is None and r["K1"]["jam"] is None, "id sama tapi lokasi jauh: tidak boleh ditempel"
    r = bangun([{"id": "A", "prov": "62", "lat": 0, "lon": 1.4 * e}, {"id": "B", "prov": "62", "lat": 0, "lon": 0.5 * e}], air, jal, ak, {"62"})
    assert r["B"]["kaki_km"] == 0.4 and r["A"]["kaki_km"] is None, "satu entri untuk satu kompleks: yang terdekat"
    assert bangun([{"id": "K9", "prov": "62", "lat": 5, "lon": 5}], air, jal, ak, {"62"})["K9"]["kaki_km"] is None, "berkas lama tanpa lokasi diabaikan"
    print("kendala: uji lolos")


if __name__ == "__main__":
    if "--uji" in sys.argv[1:] or "uji" in sys.argv[1:]:
        uji()
    else:
        main()
