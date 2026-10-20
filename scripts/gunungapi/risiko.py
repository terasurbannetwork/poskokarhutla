"""Indeks risiko riwayat letusan 0-100 per gunung api (A15) -> public/gunungapi/data/risiko.json. Pola dan bobot sama dengan scripts/gempa/riwayat.py.

Sumber: Smithsonian GVP, Volcanoes of the World (layanan WFS webservices.volcano.si.edu, GVP-VOTW; volcano.si.edu 403 dari luar peramban).
Hanya Activity_Type = "Confirmed Eruption" (letusan "Uncertain" dibuang). Gunung GVP dipasangkan ke katalog MAGMA (public/gunungapi/data/gunung.json)
menurut jarak pusat <= 5 km; gunung MAGMA tanpa pasangan tidak diberi skor (dibuang, bukan nol).
Skor (50:30:20), jendela tahun 1900 sampai tahun penuh terakhir (TAHUN_AKHIR = tahun berjalan - 1, diturunkan dari tanggal lari; catatan sebelum 1900 sangat tidak lengkap):
  50 kekerapan  fK = tahun aktif / jumlah tahun jendela; tahun aktif = tahun yang dilewati sebuah letusan dari tahun mulai sampai tahun akhir
                (tahun akhir tak tercatat = hanya tahun mulai, konservatif)
  30 besaran    fB = VEI tertinggi letusan sejak 1900 / 7 (tanpa VEI = 0)
  20 tren       fT = (log2(rasio / rasio nasional) + 1) / 2, dipotong 0-1; rasio = (letusan 30 tahun terakhir + 0,5)/30 dibagi (letusan sebelumnya + 0,5)/(tahun jendela - 30).
                Dibagi rasio nasional agar membaiknya pencatatan tidak membuat semua gunung tampak naik.
Kelas dari posisi antar gunung bernilai: 10% teratas sangat tinggi, 10-30% tinggi, 30-60% sedang, sisanya rendah.
Suku tren bernilai 0 untuk gunung dengan kurang dari 3 letusan sejak 1900 (rasio dari 0-2 kejadian hanya noise).
Batas jujur: ini RIWAYAT letusan, bukan prakiraan; tidak diuji balik terhadap letusan berikutnya; letusan kecil lama tak tercatat GVP;
satu episode panjang (mis. Sinabung 2013-2018) dihitung satu letusan bertahun mulai tunggal. Status Level I-IV PVMBG tetap satu-satunya status resmi.
Pakai:  python3 scripts/gunungapi/risiko.py        tulis (jaringan)
        python3 scripts/gunungapi/risiko.py uji    self-check
"""
import datetime as dt, json, math, os, sys, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/gunungapi/data/risiko.json")
KATALOG = os.path.join(AKAR, "public/gunungapi/data/gunung.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
WFS = "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application/json&typeName="
TAHUN0, BARU = 1900, 30
TAHUN_AKHIR = dt.date.today().year - 1   # tahun penuh terakhir: tahun berjalan belum lengkap, jadi tidak dinilai
KELAS = ["Rendah", "Sedang", "Tinggi", "Sangat tinggi"]
BOBOT = (50, 30, 20)
MIN_TREN = 3   # kurang dari 3 letusan sejak 1900: rasio hanya noise pseudo-hitungan, suku tren = 0


def ambil(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
        return json.load(r)


def jarak_km(a, b):
    la, lo = math.radians(a[0]), math.radians(a[1])
    lb, lp = math.radians(b[0]), math.radians(b[1])
    h = math.sin((lb - la) / 2) ** 2 + math.cos(la) * math.cos(lb) * math.sin((lp - lo) / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def pasangkan(katalog, gvp):
    """katalog {nama: {lat, lon}}, gvp {nomor: (lat, lon)} -> {nama: nomor GVP terdekat <= 5 km}."""
    out = {}
    for nama, g in katalog.items():
        d, no = min(((jarak_km((g["lat"], g["lon"]), c), n) for n, c in gvp.items()), default=(1e9, None))
        if d <= 5:
            out[nama] = no
    return out


def fitur(letusan):
    """letusan [(tahun_mulai, vei|None, tahun_akhir|None)] -> (fK, fB, n_baru, n_lama, n_tahun_aktif, vei_maks); hanya tahun jendela."""
    L = [(t, v, e) for t, v, e in letusan if t <= TAHUN_AKHIR and (e or t) >= TAHUN0]
    lama = TAHUN_AKHIR - TAHUN0 + 1
    vm = max((v or 0 for _, v, _ in L), default=0)
    th = len({y for t, _, e in L for y in range(max(t, TAHUN0), min(max(e or t, t), TAHUN_AKHIR) + 1)})
    nb = sum(1 for t, _, _ in L if t > TAHUN_AKHIR - BARU)
    return th / lama, min(vm / 7, 1), nb, len(L) - nb, th, vm


def skor(f, rasio_nas):
    fK, fB, nb, nl, _, _ = f
    rasio = ((nb + .5) / BARU) / ((nl + .5) / (TAHUN_AKHIR - TAHUN0 + 1 - BARU))
    fT = min(1, max(0, (math.log2(rasio / rasio_nas) + 1) / 2)) if nb + nl >= MIN_TREN else 0.0
    return round(BOBOT[0] * fK + BOBOT[1] * fB + BOBOT[2] * fT)


def kelas(skors):
    """-> {indeks: kelas 0-3} menurut peringkat; seri skor sama mendapat kelas sama (batas dihitung dari skor, bukan urutan)."""
    s = sorted(skors.values(), reverse=True)
    n = len(s)
    def batas(f):
        return s[min(n - 1, max(0, math.ceil(n * f) - 1))]
    b10, b30, b60 = batas(.10), batas(.30), batas(.60)
    return {k: 3 if v >= b10 else 2 if v >= b30 else 1 if v >= b60 else 0 for k, v in skors.items()}


def hitung(katalog, pasang, letusan_per_no):
    fs = {n: fitur(letusan_per_no.get(no, [])) for n, no in pasang.items()}
    nb = sum(f[2] for f in fs.values()); nl = sum(f[3] for f in fs.values())
    rasio_nas = ((nb + .5) / BARU) / ((nl + .5) / (TAHUN_AKHIR - TAHUN0 + 1 - BARU))
    sk = {n: skor(f, rasio_nas) for n, f in fs.items()}
    kl = kelas(sk)
    return {n: [sk[n], kl[n], fs[n][4], fs[n][5]] for n in sk}, rasio_nas


def bangun():
    katalog = json.load(open(KATALOG))
    vol = ambil(WFS + "GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&CQL_FILTER=" + urllib.parse.quote("Country='Indonesia'"))["features"]
    gvp = {f["properties"]["Volcano_Number"]: (f["properties"]["Latitude"], f["properties"]["Longitude"]) for f in vol}
    pasang = pasangkan(katalog, gvp)
    nomor = sorted(set(pasang.values()))
    erup = ambil(WFS + "GVP-VOTW:Smithsonian_VOTW_Holocene_Eruptions&CQL_FILTER=" + urllib.parse.quote(f"Volcano_Number IN ({','.join(map(str, nomor))})"))["features"]
    per = {}
    for f in erup:
        p = f["properties"]
        if p["Activity_Type"] == "Confirmed Eruption" and p["StartDateYear"] is not None:
            per.setdefault(p["Volcano_Number"], []).append((p["StartDateYear"], p["ExplosivityIndexMax"], p["EndDateYear"]))
    hasil, rasio = hitung(katalog, pasang, per)
    return {"dibuat": dt.date.today().isoformat(), "tahun": [TAHUN0, TAHUN_AKHIR], "kelas": KELAS, "bobot": list(BOBOT),
            "rasio_nasional": round(rasio, 3), "jumlah_letusan": sum(len(v) for v in per.values()), "tanpa_pasangan": sorted(set(katalog) - set(pasang)),
            "gunung": dict(sorted(hasil.items(), key=lambda kv: -kv[1][0])),
            "kolom": "nama: [skor 0-100, kelas 0-3, tahun aktif letusan, VEI tertinggi sejak 1900]",
            "sumber": "Smithsonian GVP, Volcanoes of the World (layanan WFS GVP-VOTW), letusan terkonfirmasi 1900-2025; dipasangkan ke katalog MAGMA menurut jarak pusat <= 5 km"}


def uji():
    assert abs(jarak_km((0, 0), (0, 1)) - 111.19) < .1
    kat = {"A": {"lat": -7.5, "lon": 110.4}, "B": {"lat": 0, "lon": 100}, "C": {"lat": 5, "lon": 5}}
    assert pasangkan(kat, {1: (-7.51, 110.41), 2: (0.1, 100.0)}) == {"A": 1}
    # kekerapan penuh + VEI 7 + tren naik -> mendekati 100; tanpa letusan -> kecil
    banyak = [(t, 7, None) for t in range(TAHUN0, TAHUN_AKHIR + 1)]
    kosong = []
    hs, _ = hitung({"X": {}, "Y": {}}, {"X": 1, "Y": 2}, {1: banyak, 2: kosong})
    assert hs["X"][0] >= 80 and hs["Y"][0] == 0 and hs["X"][1] == 3 and hs["Y"][1] < hs["X"][1], hs
    # besaran naik dengan VEI, ceteris paribus
    a = skor(fitur([(1950, 2, None), (1990, 2, None)]), 1); b = skor(fitur([(1950, 5, None), (1990, 2, None)]), 1)
    assert b - a == round(30 * 3 / 7) or abs((b - a) - 30 * 3 / 7) <= 1, (a, b)
    # tahun di luar jendela diabaikan, tahun kembar dihitung sekali
    assert fitur([(1850, 7, None), (1950, 3, None), (1950, 4, None), (TAHUN_AKHIR + 1, 7, None)])[4:] == (1, 4)
    assert fitur([(1990, 2, 1993), (1992, 3, None)])[4:] == (4, 3)   # 1990-1993 aktif, 1992 sudah termasuk
    assert kelas({"a": 90, "b": 50, "c": 50, "d": 10, "e": 5, "f": 5, "g": 5, "h": 5, "i": 5, "j": 5})["a"] == 3
    if os.path.exists(KELUAR):
        o = json.load(open(KELUAR))
        assert all(0 <= v[0] <= 100 and v[1] in range(4) for v in o["gunung"].values()), "skor di luar 0-100"
    print("risiko gunungapi: ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        o = bangun()
        tmp = KELUAR + ".tmp"
        with open(tmp, "w") as f:
            json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, KELUAR)
        t = list(o["gunung"].items())[:5]
        print("risiko gunungapi:", len(o["gunung"]), "gunung bernilai;", len(o["tanpa_pasangan"]), "tanpa pasangan GVP;", t)
