#!/usr/bin/env python3
"""SIPPA SP-020 + SP-109: kekerapan deteksi VIIRS 2012-2025 per sel 2,2 km di kotak Kalteng (62) dan kotak provinsi lain.

Masukan : data/raw/firms/viirs*.csv (gitignore, lokal; berkas "* 2.*" nyasar dilewati). WAJIB memuat semua tahun 2012-2025 (S-NPP);
          tahun kosong = berhenti (tidak mengarang). Berkas lokal 28 Okt 2026 hanya 2015, 2019, 2023-2025: sel22 provinsi lain belum bisa dibangun.
Keluaran: data/sippa/keluaran/sel22.json  (DT 3.1.4, 7.2)
Pakai   : python3 sel22.py [--raw DIR] [--keluar BERKAS] [--prov 16 63 ...]   |   python3 sel22.py uji
  Kalteng (KOTAK) = hitungan lama persis: porsi_berulang dan ringkas hanya atas kotak ini. Provinsi lain (SP-109): kotak kompleks provinsi +- PAD_PROV
  (dari kendala.json + operasi.json) di luar KOTAK, baris ikut `baris`, daftar kotak di `kotak_tambahan`; tanpa --prov tidak ada kotak tambahan
  (keluaran identik dengan skema lama). Sel di tepi KOTAK yang sudah ada di Kalteng tidak diduplikasi.
Python 3.12 stdlib. tahun_aktif, per_tahun (hari api = acq_date berbeda), ringkas
dan porsi berulang HANYA dari S-NPP (satelit "N", sebanding 2012-2025). NOAA-20/21 (2018, 2023 ke atas)
hanya masuk tahun_aktif_semua (batas atas, tidak sebanding antar-era) dan n_baris_firms (baris, bukan kejadian).
"""
import csv, glob, hashlib, json, math, os, sys
from datetime import datetime, timezone

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SEL = 0.02
LAT0, LON0 = -11.5, 94.5
KOTAK = (-3.6, 0.8, 110.7, 115.9)          # lat_min, lat_maks, lon_min, lon_maks
T0, T1 = 2012, 2025
NT = T1 - T0 + 1                            # 14
YAKIN = {"n", "h"}                          # confidence nominal dan tinggi
PORSI_TAHUN = (2019, 2023)
# Penjaga regresi, BUKAN verifikasi: lebar +-3 poin di sekitar nilai teramati metode ini
# (S-NPP, hari api, tahun_aktif S-NPP). KD 1 menyebut 72% dan 85% dengan metode lain; selisih dicatat di laporan.
PORSI_RENTANG = {2019: (0.68, 0.74), 2023: (0.82, 0.88)}   # teramati 0,7121 dan 0,8534 (26 Okt 2026)
SNPP = "N"
MIN_TAHUN_ULANG = 3


def ke_sel(lat, lon):
    return math.floor((lat + 11.5) / SEL), math.floor((lon - 94.5) / SEL)


def id_sel(i, j):
    return f"s{i}_{j}"


def pusat(i, j):
    return LAT0 + (i + 0.5) * SEL, LON0 + (j + 0.5) * SEL


class Sel:
    """Per sel: hari api S-NPP (set acq_date per tahun), tahun aktif semua satelit, baris mentah."""
    def __init__(self):
        self.hari, self.tahun_semua, self.baris = {}, {}, {}
        self.n = 0
        self.hingga = ""


PAD_PROV = 0.2


def kotak_prov(provs):
    """{prov: (lat_min, lat_maks, lon_min, lon_maks)} dari kompleks provinsi di kendala.json + operasi.json, +- PAD_PROV."""
    pub = os.path.join(AKAR, "public", "data")
    kd = json.load(open(os.path.join(pub, "kendala.json")))["kompleks"]
    op = {x["id"]: x for x in json.load(open(os.path.join(pub, "operasi.json")))["kompleks"]}
    out = {}
    for p in provs:
        t = [op[i] for i, v in kd.items() if v["prov"] == p and i in op]
        if t:
            out[p] = (round(min(x["lat"] for x in t) - PAD_PROV, 3), round(max(x["lat"] for x in t) + PAD_PROV, 3),
                      round(min(x["lon"] for x in t) - PAD_PROV, 3), round(max(x["lon"] for x in t) + PAD_PROV, 3))
    return out


def dalam_kotak(lat, lon, kotak):
    return kotak[0] <= lat <= kotak[1] and kotak[2] <= lon <= kotak[3]


def hitung(berkas, tambahan=None):
    """tambahan None = kotak Kalteng; daftar kotak = titik di salah satunya dan di luar KOTAK (sel provinsi lain)."""
    z = Sel()
    for f in berkas:
        with open(f, newline="") as h:
            for r in csv.DictReader(h):
                if r["confidence"] not in YAKIN:
                    continue
                th = int(r["acq_date"][:4])
                if not T0 <= th <= T1:
                    continue
                lat, lon = float(r["latitude"]), float(r["longitude"])
                if tambahan is None:
                    if not dalam_kotak(lat, lon, KOTAK):
                        continue
                elif dalam_kotak(lat, lon, KOTAK) or not any(dalam_kotak(lat, lon, b) for b in tambahan):
                    continue
                k = ke_sel(lat, lon)
                z.n += 1
                z.hingga = max(z.hingga, r["acq_date"])
                z.baris.setdefault(k, [0] * NT)[th - T0] += 1
                z.tahun_semua.setdefault(k, set()).add(th)
                if r["satellite"] == SNPP:
                    z.hari.setdefault(k, [set() for _ in range(NT)])[th - T0].add(r["acq_date"])
    return z


def per_tahun(z, k):
    return [len(x) for x in z.hari[k]]


def porsi_berulang(z, tahun):
    """Porsi hari-api S-NPP `tahun` yang jatuh di sel dengan tahun_aktif (S-NPP) >= 3 sebelumnya."""
    t = tahun - T0
    tot = ulang = 0
    for k in z.hari:
        pt = per_tahun(z, k)
        if pt[t]:
            tot += pt[t]
            if sum(1 for x in pt[:t] if x) >= MIN_TAHUN_ULANG:
                ulang += pt[t]
    return ulang / tot if tot else None


def ringkas(z):
    ta = [sum(1 for x in per_tahun(z, k) if x) for k in z.hari]
    return {f"ge{k}": sum(1 for a in ta if a >= k) for k in (3, 5, 7, 10)}


def periksa(z, kunci=True):
    """Invarian; dipakai uji sintetis dan lari nyata."""
    assert sum(sum(v) for v in z.baris.values()) == z.n, "jumlah baris != baris tersaring"
    assert set(z.hari) <= set(z.baris), "sel S-NPP bukan himpunan bagian sel semua satelit"
    for (i, j), v in z.baris.items():
        assert len(v) == NT, f"{NT} tahun diharapkan, ada {len(v)}"
        assert len(z.tahun_semua[(i, j)]) <= NT, "tahun_aktif_semua > 14"
        lat, lon = pusat(i, j)
        assert ke_sel(lat, lon) == (i, j), f"indeks sel {(i, j)} tidak bolak-balik: pusat {lat},{lon}"
    for k in z.hari:
        pt = per_tahun(z, k)
        assert sum(1 for x in pt if x) <= NT, "tahun_aktif > 14"
        assert all(0 <= x <= 366 for x in pt), "hari api per tahun di luar 0-366"
        assert all(pt[t] <= z.baris[k][t] for t in range(NT)), "hari api > baris mentah"
        assert sum(1 for x in pt if x) <= len(z.tahun_semua[k]), "tahun_aktif S-NPP > semua satelit"
    if kunci:
        for th, (lo, hi) in PORSI_RENTANG.items():
            p = porsi_berulang(z, th)
            assert p is not None and lo <= p <= hi, f"porsi berulang {th} = {p}, di luar {lo}-{hi}"


def sha(berkas):
    h = hashlib.sha256()
    for f in berkas:
        with open(f, "rb") as x:
            for blok in iter(lambda: x.read(1 << 22), b""):
                h.update(blok)
    return h.hexdigest()


def berkas_viirs(raw):
    return sorted(f for f in glob.glob(os.path.join(raw, "viirs*.csv")) if " 2." not in os.path.basename(f))


def uji():
    import tempfile
    # indeks bolak-balik di seluruh kotak, termasuk tepi
    for lat in (KOTAK[0], -3.59, -1.234, 0.0, KOTAK[1]):
        for lon in (KOTAK[2], 111.111, 113.0, KOTAK[3]):
            i, j = ke_sel(lat, lon)
            assert ke_sel(*pusat(i, j)) == (i, j)
            assert abs(pusat(i, j)[0] - lat) <= SEL and abs(pusat(i, j)[1] - lon) <= SEL
    assert id_sel(413, 880) == "s413_880"
    # lat, lon, tanggal, confidence, satelit, masuk baris tersaring?
    B = [
        (-2.0, 113.0, "2019-03-01", "n", "N", 1), (-2.0, 113.0, "2019-03-01", "h", "N", 1),  # hari sama: 1 hari api
        (-2.0, 113.0, "2019-03-01", "n", "N20", 1),                                          # NOAA: bukan S-NPP
        (-2.0, 113.0, "2020-04-01", "n", "N20", 1),                                          # aktif hanya NOAA
        (-2.0, 113.0, "2019-05-01", "l", "N", 0),    # confidence rendah
        (-2.0, 113.0, "2026-01-01", "n", "N", 0), (-2.0, 113.0, "2011-12-31", "n", "N", 0),
        (5.0, 113.0, "2019-03-01", "n", "N", 0), (-2.0, 120.0, "2019-03-01", "n", "N", 0),  # luar kotak
        (-2.0, 113.0, "2012-01-20", "n", "N", 1), (-2.0, 113.0, "2019-03-02", "n", "N", 1),
    ]
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "viirs_x.csv")
        with open(p, "w", newline="") as h:
            w = csv.writer(h)
            w.writerow(["latitude", "longitude", "acq_date", "confidence", "satellite"])
            for b in B:
                w.writerow(b[:5])
        open(os.path.join(d, "viirs 2.csv"), "w").write("sampah")
        assert berkas_viirs(d) == [p], "berkas '* 2.*' harus dilewati"
        z = hitung(berkas_viirs(d))
        k = next(iter(z.baris))
        assert z.n == sum(b[5] for b in B) == 6, f"n={z.n}, harus 6"
        assert len(z.baris) == 1 and sum(z.baris[k]) == 6
        pt = per_tahun(z, k)
        assert pt[2019 - T0] == 2 and pt[0] == 1 and pt[2020 - T0] == 0, f"hari api {pt}"
        assert sum(1 for x in pt if x) == 2, "tahun_aktif harus S-NPP saja (2012, 2019)"
        assert z.tahun_semua[k] == {2012, 2019, 2020}, "tahun_aktif_semua harus memuat NOAA (2020)"
        assert z.hingga == "2020-04-01", f"data_hingga {z.hingga}: tanggal tertolak tidak boleh ikut"
        periksa(z, kunci=False)
        assert ringkas(z) == {"ge3": 0, "ge5": 0, "ge7": 0, "ge10": 0}
        # lari dua kali: berkas identik byte demi byte
        o1, o2 = os.path.join(d, "a.json"), os.path.join(d, "b.json")
        main(["--raw", d, "--keluar", o1, "--tanpa-kunci"])
        main(["--raw", d, "--keluar", o2, "--tanpa-kunci"])
        assert open(o1, "rb").read() == open(o2, "rb").read(), "keluaran dua kali lari tidak identik"
        j = json.load(open(o1))
        assert j["skema"] == "sel22/2" and j["kolom"] == ["sel", "tahun_aktif", "per_tahun", "tahun_aktif_semua"]
        assert j["baris"][0][3] == 3 and j["baris"][0][1] == 2 and "dibuat" not in j
        assert "bukan kejadian" in j["n_baris_firms"]["label"] and "tidak sebanding" in j["label_tahun_aktif_semua"]
    # porsi berulang dari tahun_aktif S-NPP: sel aktif 2015-2017 lalu 2019 berulang; sel baru tidak
    def sel(pt):
        return [{f"{T0 + t}-{m:02d}-01" for m in range(1, n + 1)} for t, n in enumerate(pt)]
    z = Sel()
    z.hari = {(1, 1): sel([0, 0, 0, 1, 1, 1, 0, 6] + [0] * 6), (2, 2): sel([0] * 7 + [4] + [0] * 6)}   # 2019 = indeks 7
    assert abs(porsi_berulang(z, 2019) - 0.6) < 1e-9
    # invarian harus menolak data rusak
    z = Sel(); z.n = 5; z.baris = {(1, 1): [1] * NT}
    try:
        periksa(z, kunci=False)
    except AssertionError:
        pass
    else:
        raise SystemExit("invarian lolos padahal jumlah baris salah")
    z = Sel(); z.n = 1; z.baris = {(1, 1): [1] + [0] * (NT - 1)}; z.tahun_semua = {(1, 1): {2012}}
    z.hari = {(1, 1): [{"2012-01-01", "2012-01-02"}] + [set() for _ in range(NT - 1)]}   # 2 hari api > 1 baris
    try:
        periksa(z, kunci=False)
    except AssertionError:
        pass
    else:
        raise SystemExit("invarian lolos padahal hari api > baris")
    # kotak tambahan: titik di KOTAK tetap milik Kalteng, titik di kotak lain masuk grup kedua, di luar keduanya dibuang
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "viirs_x.csv")
        with open(p, "w", newline="") as h:
            w = csv.writer(h)
            w.writerow(["latitude", "longitude", "acq_date", "confidence", "satellite"])
            for b in [(-2.0, 113.0, "2019-03-01", "n", "N"), (-8.0, 140.0, "2019-03-01", "n", "N"), (-8.0, 140.0, "2019-03-02", "h", "N"), (20.0, 100.0, "2019-03-01", "n", "N")]:
                w.writerow(b)
        z1, z2 = hitung([p]), hitung([p], [(-9.0, -7.0, 139.0, 141.0)])
        assert z1.n == 1 and z2.n == 2 and len(z2.baris) == 1, (z1.n, z2.n)
        assert not any(dalam_kotak(*pusat(*k), KOTAK) for k in z2.baris)
    assert dalam_kotak(-2.0, 113.0, KOTAK) and not dalam_kotak(-8.0, 140.0, KOTAK)
    assert kotak_prov(["16"])["16"][0] < -4.4758 < kotak_prov(["16"])["16"][1] and kotak_prov(["00"]) == {}
    print("uji sel22: lolos")


def main(argv):
    raw = os.path.join(AKAR, "data", "raw", "firms")
    keluar = os.path.join(AKAR, "data", "sippa", "keluaran", "sel22.json")
    kunci, provs = True, []
    a = iter(argv)
    for x in a:
        if x == "--raw":
            raw = next(a)
        elif x == "--keluar":
            keluar = next(a)
        elif x == "--tanpa-kunci":   # hanya uji sintetis; lari nyata selalu mengunci porsi
            kunci = False
        elif x == "--prov":
            provs = [p for p in a]   # sisa argumen = kode provinsi
    berkas = berkas_viirs(raw)
    if not berkas:
        raise SystemExit(f"tidak ada {raw}/viirs*.csv (gitignore, hanya lokal); berhenti, tidak mengarang data")
    z = hitung(berkas)
    periksa(z, kunci)
    tambah = kotak_prov(provs)
    zl = None
    if tambah:
        zl = hitung(berkas, list(tambah.values()))
        periksa(zl, False)
        if kunci:      # tahun yang tak ada berkasnya membuat tahun_aktif sepihak: berhenti
            kosong = [T0 + t for t in range(NT) if not any(v[t] for v in z.baris.values())]
            assert not kosong, f"tahun tanpa data FIRMS {kosong}: sel22 provinsi lain tidak dibangun"
    baris = []
    for k in sorted(z.baris):          # sel yang hanya terdeteksi NOAA tetap tampil: per_tahun nol, tahun_aktif 0
        pt = per_tahun(z, k) if k in z.hari else [0] * NT
        baris.append([id_sel(*k), sum(1 for x in pt if x), pt, len(z.tahun_semua[k])])
    for k in sorted(zl.baris if zl else ()):
        if k not in z.baris:
            pt = per_tahun(zl, k) if k in zl.hari else [0] * NT
            baris.append([id_sel(*k), sum(1 for x in pt if x), pt, len(zl.tahun_semua[k])])
    porsi = {str(t): None if porsi_berulang(z, t) is None else round(porsi_berulang(z, t), 4) for t in PORSI_TAHUN}
    out = {
        "skema": "sel22/2", "data_hingga": z.hingga,
        "sumber": "NASA FIRMS VIIRS, confidence n dan h; tahun_aktif, per_tahun, ringkas hanya S-NPP",
        "keyakinan": "terverifikasi", "tahun": [T0, T1], "kotak": list(KOTAK), "sel_derajat": SEL,
        "indeks": "i=floor((lat+11.5)/0.02), j=floor((lon-94.5)/0.02), id=s{i}_{j}",
        "masukan": {os.path.basename(f): sha([f]) for f in berkas},
        "n_baris_firms": {"nilai": z.n, "label": "baris FIRMS semua satelit tersaring, bukan kejadian"},
        "label_per_tahun": "hari api S-NPP: acq_date berbeda per sel per tahun",
        "label_tahun_aktif_semua": "batas atas, tidak sebanding antar-era (NOAA-20 sejak 2018, NOAA-21 sejak 2023)",
        "porsi_berulang_ge3_tahun": porsi,
        **({"kotak_tambahan": {p: list(b) for p, b in tambah.items()}, "label_kotak_tambahan": "porsi_berulang dan ringkas hanya atas kotak Kalteng; baris provinsi lain ikut `baris`"} if tambah else {}),
        "kolom": ["sel", "tahun_aktif", "per_tahun", "tahun_aktif_semua"], "baris": baris, "ringkas": ringkas(z),
    }
    os.makedirs(os.path.dirname(keluar), exist_ok=True)
    with open(keluar, "w") as h:
        json.dump(out, h, separators=(",", ":"), ensure_ascii=False)
    print(f"sel22: {len(baris)} sel, {z.n} baris FIRMS, porsi berulang {porsi}, ringkas {out['ringkas']} -> {keluar}")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1:])
