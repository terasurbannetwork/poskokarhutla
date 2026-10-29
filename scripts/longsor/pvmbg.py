"""PVMBG/Badan Geologi: zona kerentanan gerakan tanah + prakiraan bulanan, per kecamatan (#46) -> public/longsor/data/pvmbg.json.

AKSES JUJUR. vsi.esdm.go.id (robots: Disallow /), geoportal.esdm.go.id (Disallow /) dan geologi.esdm.go.id/geomap (Disallow) TIDAK disentuh.
Yang dipakai: salinan yang Kementerian PU terbitkan terbuka di sigi.pu.go.id (tanpa token, tanpa robots.txt; sumber sama dengan scripts/cuaca/gerakan_tanah_pu.py),
layanan Hosted/prakiraan_gerakan_tanah_desember_2024 (lapisan 'Zonasi_Overlay', ~200 rb poligon). Atribut:
  unsur      = zona kerentanan gerakan tanah statis (Badan Geologi, peta 2016 dst.): Sangat Rendah/Rendah/Menengah/Tinggi
  zona_perki = prakiraan potensi gerakan tanah SATU bulan (Desember 2024): Rendah/Menengah/Tinggi
BATAS: (1) cakupan nasional (7.262 dari 7.270 kecamatan punya >= 1 titik tercakup), tapi poligon wilayah di luar Jawa sebagian kasar.
(2) prakiraan bulanan hanya satu bulan (Des 2024; 2024 sudah dibuang dari uji karena DIBI tak lengkap), jadi pembanding uji = zona STATIS 'unsur',
bukan prakiraan bulanan. (3) poligon disederhanakan 0,001 derajat (~110 m).

Subperintah:  panen   unduh halaman ke data/raw/longsor/pvmbg/ (BERLANJUT; jeda 1,2 dtk)
              agregat poligon -> per kecamatan (<= 40 titik sampel) -> public/longsor/data/pvmbg.json
              uji     self-check tanpa jaringan
"""
import datetime as dt, json, math, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, MENTAH, UA, WIB, daftar_kec, di_dalam, simpan, titik_sampel
import urllib.request

URL = "https://sigi.pu.go.id/serverpu/rest/services/Hosted/prakiraan_gerakan_tanah_desember_2024/FeatureServer/0/query"
HAL = 2000
DIR = os.path.join(MENTAH, "pvmbg")
SKOR = {"Sangat Rendah": 0, "Rendah": 1, "Menengah": 2, "Tinggi": 3}      # unsur (statis)
PERKI = {"Rendah": 1, "Menengah": 2, "Tinggi": 3}                          # zona_perki (Des 2024)
G = 0.02                                                                   # sel indeks poligon


def panen():
    os.makedirs(DIR, exist_ok=True)
    n = 0
    while True:
        b = os.path.join(DIR, f"h{n:06d}.json")
        if os.path.exists(b):
            n += HAL
            continue
        q = {"where": "1=1", "outFields": "unsur,zona_perki,wilayah", "orderByFields": "fid", "resultOffset": n, "resultRecordCount": HAL,
             "outSR": 4326, "maxAllowableOffset": 0.001, "returnGeometry": "true", "f": "json"}
        time.sleep(1.2)
        req = urllib.request.Request(URL + "?" + urllib.parse.urlencode(q), headers=UA)
        d = json.load(urllib.request.urlopen(req, timeout=180))
        if "error" in d:
            raise RuntimeError(d["error"])
        ft = [[f["attributes"]["unsur"], f["attributes"]["zona_perki"], f["geometry"]["rings"]] for f in d["features"] if f.get("geometry")]
        json.dump(ft, open(b, "w"), separators=(",", ":"))
        print(f"  offset {n}: {len(ft)} poligon", file=sys.stderr)
        if not d.get("exceededTransferLimit"):
            break
        n += HAL


def indeks():
    """Poligon -> {(gx,gy): [(kotak, unsur, perki, cincin_list)]}."""
    ind, n = {}, 0
    for f in sorted(os.listdir(DIR)):
        for u, p, rings in json.load(open(os.path.join(DIR, f))):
            rings = [r for r in rings if len(r) >= 3]   # generalisasi bisa menyisakan cincin kosong
            if not rings:
                continue
            xs = [c[0] for r in rings for c in r]
            ys = [c[1] for r in rings for c in r]
            kb = (min(xs), min(ys), max(xs), max(ys))
            e = (kb, u, p, rings)
            n += 1
            for gx in range(math.floor(kb[0] / G), math.floor(kb[2] / G) + 1):
                for gy in range(math.floor(kb[1] / G), math.floor(kb[3] / G) + 1):
                    ind.setdefault((gx, gy), []).append(e)
    return ind, n


def cari(ind, x, y):
    for kb, u, p, rings in ind.get((math.floor(x / G), math.floor(y / G)), ()):
        if kb[0] <= x <= kb[2] and kb[1] <= y <= kb[3] and sum(di_dalam(x, y, r) for r in rings) % 2 == 1:   # genap-ganjil: lubang ikut
            return u, p
    return None


def agregat():
    ind, n = indeks()
    kecs = daftar_kec()
    baris, tercakup = [], 0
    for k in kecs:
        pts = titik_sampel(k, 40)
        zs, ps, tinggi = [], [], 0
        for x, y in pts:
            r = cari(ind, x, y)
            if r and r[0] in SKOR:
                zs.append(SKOR[r[0]])
                tinggi += r[0] == "Tinggi"
                if r[1] in PERKI:
                    ps.append(PERKI[r[1]])
        if zs:
            tercakup += 1
            baris.append([len(pts), len(zs), round(sum(zs) / len(zs) / 3, 3), round(tinggi / len(zs), 3), round(sum(ps) / len(ps) / 3, 3) if ps else None])
        else:
            baris.append([len(pts), 0, None, None, None])
    simpan(os.path.join(KELUAR, "pvmbg.json"), {
        "dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%d"),
        "sumber": "Badan Geologi/PVMBG via Kementerian PU sigi.pu.go.id (Hosted/prakiraan_gerakan_tanah_desember_2024, Zonasi_Overlay); vsi/geoportal ESDM tidak diakses (robots.txt melarang).",
        "batas": "Cakupan nasional (kec_tercakup dari total kec). Prakiraan bulanan hanya Desember 2024 (satu bulan, tak bisa jadi pembanding uji 2022-2025); "
                 "pembanding uji = zona statis. Kecamatan tanpa titik tercakup bernilai null (BUKAN rendah).",
        "kolom": ["titik", "titik_tercakup", "zona_skor_0_1", "porsi_tinggi", "prakiraan_des2024_skor_0_1"],
        "skala": "zona: Sangat Rendah 0, Rendah 1/3, Menengah 2/3, Tinggi 1 (rata-rata titik tercakup)",
        "poligon": n, "kec_tercakup": tercakup, "kec": [k["id"] for k in kecs], "k": baris})
    print(f"pvmbg: {n} poligon, {tercakup}/{len(kecs)} kec tercakup", file=sys.stderr)


def uji():
    sq = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]
    lub = [[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]]
    kb = (0, 0, 4, 4)
    ind = {}
    for gx in range(0, 1):
        for gy in range(0, 1):
            ind[(gx, gy)] = [(kb, "Tinggi", "Menengah", [sq, lub])]
    import sys as _s
    global G
    g0, G = G, 10.0
    try:
        assert cari(ind, 3, 3) == ("Tinggi", "Menengah") and cari(ind, 1.5, 1.5) is None and cari(ind, 9, 9) is None
    finally:
        G = g0
    print("pvmbg: uji lolos")


if __name__ == "__main__":
    {"panen": panen, "agregat": agregat, "uji": uji}[sys.argv[1] if sys.argv[1:] else "uji"]()
