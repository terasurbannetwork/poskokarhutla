"""Kejadian banjir aktif -> public/banjir/data/kejadian_aktif_awal.json + kejadian_aktif_geo.json

Definisi (docs/multi-bencana/bencana/banjir.md, A04): kejadian = gugus kecamatan BERSEBELAHAN (berbagi sisi batas pada
public/geo/kecamatan/*.json) yang status banjirnya hari ini >= Siaga (level 2) di status.json. Kecamatan Siaga yang
sendirian juga satu kejadian. Kode `B0001`, `B0002`, ...: stabil antar-jalan karena gugus baru dicocokkan dengan keluaran
sebelumnya (kecamatan yang sama = kode yang sama); pencocokan satu-satu menurut irisan anggota terbesar, gugus yang
tidak beririsan mendapat nomor baru dari `terakhir` (nomor tidak pernah dipakai ulang). Kejadian yang tak lagi Siaga
hilang dari berkas (kedaluwarsa); bila gugus yang sama muncul lagi sesudah hilang, ia kejadian baru.

_awal: {"hari", "dibuat", "terakhir", "skor_rumus", "kejadian": [{kode, sejak, level_tertinggi (maks gugus), n_kec, kec: ["prov|kab|kec"],
        prov: [kode], penduduk, h3_mm, bahaya_banjir, sungai: {titik, kelas_maks}, skor, skor_komponen (dari 4), bbox, pusat}]}
        Penghitung kode ada di kejadian_aktif_nomor.json (ikut cache); hilang padahal seri_status.json ada = gagal keras.
        Status basi (hari ke-0 != hujan.hari_ini) = keluar non-nol, tidak menulis.
        Kunci yang datanya tidak ada (penduduk kecamatan tak terdaftar, bahaya, sungai) DIBUANG, bukan diisi nol.
_geo:   FeatureCollection, satu fitur per kejadian (MultiPolygon gabungan kecamatan anggota, sisi bersama dihapus).

Skor 0-100 (terbuka, bisa dihitung ulang dari atribut): tingkat 40 (Siaga 0,6 / Awas 1) + penduduk 30 (log10(1+jiwa)/6,5,
maks 1) + jumlah kecamatan 15 (n/10, maks 1) + bahaya InaRISK banjir 15 (nilai maks); komponen yang tidak ada dibuang dan
bobotnya dibagi ulang.

Pakai:  python3 scripts/banjir/kejadian_aktif.py [--hari N] [--keluar DIR]   |   python3 scripts/banjir/kejadian_aktif.py uji
        --hari N: pakai hari ke-N di status.json (0 = hari ini; >0 hanya untuk uji dengan prakiraan).
"""
import argparse, datetime as dt, json, math, os, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from status import GESER, jendela, kelas_sungai
from umum import AKAR, KELUAR, WIB, baca, simpan
from wilayah import _di_dalam

SIAGA = 2
BOBOT = {"tingkat": 40, "penduduk": 30, "n_kec": 15, "bahaya": 15}


def luas2(r):
    """Luas bertanda (rumus tali sepatu): > 0 berlawanan jarum jam."""
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:])) / 2


def arah(r, ccw):
    return r if (luas2(r) > 0) == ccw else r[::-1]


def bagian(geom):
    return geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]


def baca_geo(kunci):
    """{kunci: [poligon]} untuk kecamatan di himpunan `kunci` ("prov|kab|kec"). Kecamatan terbelah: poligonnya digabung."""
    out = defaultdict(list)
    prov = {k.split("|")[0] for k in kunci}
    for kode in prov:
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")))["features"]:
            k = f"{kode}|{f['properties']['kab']}|{f['properties']['kec']}"
            if k in kunci:
                out[k] += bagian(f["geometry"])
    return out


def gugus(kunci, geo):
    """Kelompokkan kunci yang berbagi sisi batas (dua titik berurutan sama). -> [set kunci]."""
    induk = {k: k for k in kunci}

    def cari(x):
        while induk[x] != x:
            induk[x] = induk[induk[x]]
            x = induk[x]
        return x

    sisi = {}
    for k in kunci:
        for p in geo.get(k, ()):
            for r in p:
                for a, b in zip(r, r[1:]):
                    s = (a[0], a[1], b[0], b[1]) if (a[0], a[1]) <= (b[0], b[1]) else (b[0], b[1], a[0], a[1])
                    if s in sisi and sisi[s] != k:
                        induk[cari(k)] = cari(sisi[s])
                    sisi[s] = k
    kel = defaultdict(set)
    for k in kunci:
        kel[cari(k)].add(k)
    return list(kel.values())


def gabung(polys):
    """Gabungkan poligon bertetangga lewat penghapusan sisi bersama (topologi batas kecamatan berbagi titik yang sama).
    -> koordinat MultiPolygon. Titik simpul yang dilewati dua cincin sekaligus (simpul pinggang) disambung sembarang."""
    sisi = set()
    for p in polys:
        for i, r in enumerate(p):
            r = arah([tuple(c[:2]) for c in r], i == 0)  # luar berlawanan jarum jam, lubang searah jarum jam
            sisi.update(zip(r, r[1:]))
    ke = {}
    for a, b in sisi:
        if (b, a) not in sisi:  # sisi bersama muncul dua arah dan saling hapus
            ke.setdefault(a, []).append(b)
    cincin = []
    while ke:
        a0 = next(iter(ke))
        r, a = [a0], a0
        while True:
            b = ke[a].pop()
            if not ke[a]:
                del ke[a]
            r.append(b)
            a = b
            if a == a0 or a not in ke:
                break
        if len(r) >= 4 and r[0] == r[-1]:
            cincin.append(r)
    luar = [r for r in cincin if luas2(r) > 0]
    lubang = [r for r in cincin if luas2(r) < 0]
    hasil = [[[list(c) for c in r]] for r in luar]
    for h in lubang:
        for pol, r in zip(hasil, luar):
            if _di_dalam(h[0][0], h[0][1], r):
                pol.append([list(c) for c in h])
                break
    return hasil


def cocokkan(baru, lama, terakhir):
    """baru: [set kunci], lama: [(kode, set kunci)] -> ([kode], terakhir baru). Satu-satu, irisan terbesar dulu."""
    pasang = sorted(((len(b & s), i, kode) for i, b in enumerate(baru) for kode, s in lama if b & s), reverse=True)
    kode_baru, terpakai = {}, set()
    for _, i, kode in pasang:
        if i not in kode_baru and kode not in terpakai:
            kode_baru[i] = kode
            terpakai.add(kode)
    for i in range(len(baru)):
        if i not in kode_baru:
            terakhir += 1
            kode_baru[i] = f"B{terakhir:04d}"
    return [kode_baru[i] for i in range(len(baru))], terakhir


def skor(level, penduduk, n_kec, bahaya):
    """-> 0-100; komponen None dibuang, bobot dibagi ulang."""
    k = {"tingkat": 0.6 if level == 2 else 1.0, "n_kec": min(1.0, n_kec / 10),
         "penduduk": None if penduduk is None else min(1.0, math.log10(1 + penduduk) / 6.5),
         "bahaya": bahaya}
    ada = {n: v for n, v in k.items() if v is not None}
    return round(100 * sum(BOBOT[n] * v for n, v in ada.items()) / sum(BOBOT[n] for n in ada), 1)


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--hari", type=int, default=0)
    a.add_argument("--keluar", default=KELUAR)
    a = a.parse_args()
    st = baca(os.path.join(KELUAR, "status.json"))
    if not st:
        sys.exit("status.json belum ada")
    d = a.hari
    hari = st["hari"][d]
    hujan = baca(os.path.join(KELUAR, "hujan.json"))
    if not hujan or st["hari"][0] != hujan["hari_ini"]:  # status basi: tidak menimpa; hanya berkas awal yang belum ada ditulis kosong (seperti seri_status)
        jalur = os.path.join(a.keluar, "kejadian_aktif_awal.json")
        if not os.path.exists(jalur):
            simpan(jalur, {"hari": None, "terakhir": 0, "kejadian": []})
        sys.exit(f"status.json hari ke-0 {st['hari'][0]} bukan hari ini ({hujan and hujan['hari_ini']}): ditolak, tidak ada yang ditulis")
    siaga = {k: v for k, v in st["kec"].items() if v["b"][d] >= SIAGA}
    pend = (baca(os.path.join(AKAR, "public/data/penduduk.json"), {}) or {}).get("kec", {})
    bahaya = (baca(os.path.join(KELUAR, "bahaya.json"), {}) or {}).get("kec", {})
    pusat = baca(os.path.join(KELUAR, "pusat_kec.json"), {})
    sungai = baca(os.path.join(KELUAR, "sungai.json"))
    awal_lama = baca(os.path.join(a.keluar, "kejadian_aktif_awal.json"), {})
    nomor = os.path.join(a.keluar, "kejadian_aktif_nomor.json")  # penghitung kode, berkas sendiri yang ikut cache
    terakhir0 = (baca(nomor) or {}).get("terakhir")
    if terakhir0 is None:
        terakhir0 = awal_lama.get("terakhir")  # peralihan dari versi tanpa berkas nomor
    if terakhir0 is None:
        if os.path.exists(os.path.join(a.keluar, "seri_status.json")):
            sys.exit("kejadian_aktif_nomor.json hilang padahal seri_status.json ada (cache terhapus?): menolak mulai dari B0001, "
                     "kode lama bisa terpakai ulang. Pulihkan berkasnya atau tulis {\"terakhir\": N} dengan N = nomor terbesar yang pernah terbit.")
        terakhir0 = 0
    # hujan 3 hari hari d: hanya bila status dan hujan satu hari-ini (status.json lama + hujan.json baru = tidak dipakai)
    h3 = None
    if hujan and hujan["hari_ini"] == st["hari"][0]:
        i0, sel = hujan["hari"].index(hujan["hari_ini"]), hujan["sel"]
        petak = {(math.floor(g["lat"] / sel), math.floor(g["lon"] / sel)): g for g in hujan["grid"]}

        def h3_kec(k):
            if k not in pusat:
                return None
            la, lo = pusat[k]
            g = petak.get((math.floor(la / sel), math.floor(lo / sel))) or min(
                hujan["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)
            return round(jendela(g["h"], i0 + d + GESER), 1)
        h3 = h3_kec
    j0 = sungai["hari"].index(st["hari"][0]) if sungai and st["hari"][0] in sungai["hari"] else None

    geo = baca_geo(set(siaga))
    kel = sorted(gugus(set(siaga), geo), key=lambda s: sorted(s)[0])
    lama = [(e["kode"], set(e["kec"])) for e in awal_lama.get("kejadian", [])]
    kode, terakhir = cocokkan(kel, lama, terakhir0)
    sejak = {e["kode"]: e.get("sejak") for e in awal_lama.get("kejadian", [])}
    awal, fitur = [], []
    for s, kd in sorted(zip(kel, kode), key=lambda x: x[1]):
        ks = sorted(s)
        level = max(siaga[k]["b"][d] for k in ks)
        pk = [k for k in ks if k in pend]
        e = {"kode": kd, "sejak": sejak.get(kd) or hari, "level_tertinggi": level, "n_kec": len(ks), "kec": ks,
             "prov": sorted({k.split("|")[0] for k in ks})}
        if pk:
            e["penduduk"] = sum(pend[k] for k in pk)
            if len(pk) < len(ks):
                e["kec_tanpa_penduduk"] = len(ks) - len(pk)  # penduduk = jumlah yang terdaftar saja
        hs = [h3(k) for k in ks] if h3 else []
        if [x for x in hs if x is not None]:
            e["h3_mm"] = max(x for x in hs if x is not None)
        bh = [bahaya[k]["banjir"] for k in ks if k in bahaya]
        if bh:
            e["bahaya_banjir"] = max(bh)
        if sungai and j0 is not None:
            kl = [kelas_sungai(sungai["titik"][siaga[k]["sg"]]["q"], j0 + d, sungai["titik"][siaga[k]["sg"]])
                  for k in ks if siaga[k]["sg"] is not None]
            tt = {siaga[k]["sg"] for k in ks if siaga[k]["sg"] is not None}
            if tt:
                e["sungai"] = {"titik": len(tt)}
                if any(x is not None for x in kl):
                    e["sungai"]["kelas_maks"] = max(x for x in kl if x is not None)
        e["skor_komponen"] = 2 + ("penduduk" in e) + ("bahaya_banjir" in e)  # dari 4: tingkat dan n_kec selalu ada
        e["skor"] = skor(level, e.get("penduduk"), len(ks), e.get("bahaya_banjir"))
        poli = gabung([p for k in ks for p in geo[k]])
        xs = [c[0] for p in poli for r in p for c in r]
        ys = [c[1] for p in poli for r in p for c in r]
        e["bbox"] = [round(min(xs), 3), round(min(ys), 3), round(max(xs), 3), round(max(ys), 3)]
        e["pusat"] = [round((e["bbox"][1] + e["bbox"][3]) / 2, 3), round((e["bbox"][0] + e["bbox"][2]) / 2, 3)]
        awal.append(e)
        fitur.append({"type": "Feature", "properties": {"kode": kd},
                      "geometry": {"type": "MultiPolygon", "coordinates": [[[[round(c[0], 4), round(c[1], 4)] for c in r] for r in p] for p in poli]}})
    dibuat = dt.datetime.now(WIB).isoformat(timespec="minutes")
    simpan(nomor, {"terakhir": terakhir})
    simpan(os.path.join(a.keluar, "kejadian_aktif_awal.json"), {
        "hari": hari, "dibuat": dibuat, "terakhir": terakhir, "ambang_level": SIAGA,
        "skor_rumus": "tingkat 40 (Siaga 0,6; Awas 1) + penduduk 30 (log10(1+jiwa)/6,5) + n_kec 15 (n/10) + bahaya InaRISK banjir 15; komponen tak ada dibuang, bobot dibagi ulang",
        "kejadian": awal})
    simpan(os.path.join(a.keluar, "kejadian_aktif_geo.json"), {"hari": hari, "type": "FeatureCollection", "features": fitur})
    print(f"kejadian_aktif: hari {hari}: {len(siaga)} kec >= Siaga -> {len(awal)} kejadian "
          f"{[(e['kode'], e['n_kec'], e.get('penduduk'), e['skor']) for e in awal][:8]}", file=sys.stderr)


def uji():
    # luas/arah
    kotak = [(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)]
    assert luas2(kotak) == 1 and luas2(arah(kotak, False)) == -1
    # dua kotak bersebelahan + satu terpisah
    def sq(x, y):
        return [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]]
    geo = {"a": [sq(0, 0)], "b": [sq(1, 0)], "c": [sq(5, 5)], "d": [sq(1, 1)]}
    g = sorted(map(sorted, gugus({"a", "b", "c"}, geo)))
    assert g == [["a", "b"], ["c"]], g
    assert sorted(map(sorted, gugus({"a", "d"}, geo))) == [["a"], ["d"]]  # hanya bersentuhan di satu titik sudut: bukan tetangga
    # gabungan a+b = persegi panjang 2x1, tanpa sisi bersama
    m = gabung(geo["a"] + geo["b"])
    assert len(m) == 1 and len(m[0]) == 1 and abs(luas2(m[0][0]) - 2) < 1e-9, m
    # cincin 8 kotak mengelilingi lubang -> satu poligon dengan satu lubang
    ring = [sq(x, y) for x in range(3) for y in range(3) if (x, y) != (1, 1)]
    m = gabung(ring)
    assert len(m) == 1 and len(m[0]) == 2 and abs(luas2(m[0][0]) - 9) < 1e-9 and abs(luas2(m[0][1]) + 1) < 1e-9, m
    # kode stabil: gugus yang sama (anggota bergeser) tetap B0001; gugus baru B0003; terakhir tidak mundur
    k, t = cocokkan([{"a", "b"}, {"z"}], [("B0001", {"a", "b", "c"}), ("B0002", {"q"})], 2)
    assert k == ["B0001", "B0003"] and t == 3, (k, t)
    k, t = cocokkan([{"a", "b"}, {"z"}], [("B0001", {"a", "b"})], 1)
    assert k == ["B0001", "B0002"] and t == 2
    # dua gugus baru berebut satu kode lama: yang irisannya terbesar menang
    k, t = cocokkan([{"a"}, {"b", "c"}], [("B0001", {"a", "b", "c"})], 1)
    assert k == ["B0002", "B0001"], k
    # skor: komponen hilang dibuang
    assert skor(3, 10 ** 6.5 - 1, 10, 1) == 100 and skor(2, None, 1, None) == round(100 * (40 * .6 + 15 * .1) / 55, 1)
    print("ok kejadian_aktif")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
