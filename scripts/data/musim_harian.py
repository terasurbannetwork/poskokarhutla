"""Kurva musim api: titik panas kumulatif per hari-ke-n, 2019 s.d. tahun berjalan, nasional dan per provinsi -> public/data/musim_harian.json

Definisi sama dengan baris harian laporan (laporan.py): MODIS + VIIRS S-NPP + VIIRS NOAA-20, semua keyakinan, hari kalender WIB,
provinsi lewat wilayah.py. Berkas ini menyimpan HITUNGAN HARIAN (bukan kumulatif); layar yang menjumlahkan.

  tahun   : tahun yang tercakup (2019..)
  sd      : hari terakhir tahun berjalan
  nasional: {tahun: [titik per hari WIB dari 1 Jan]}      prov: {kode: {tahun: [...]}}
  latar   : rerata 2019-2025 per tanggal kalender kabisat (indeks 0 = 1 Jan, 59 = 29 Feb; 29 Feb dirata-rata atas tahun yang punya)

Dua jalur:
  python3 scripts/data/musim_harian.py bangun <sd>   SEKALI (lokal): baca data/raw/firms/{modis,viirs,viirs_noaa20}.csv (firms.py),
        simpan hitungan di data/raw/firms/musim_harian_hitung.json (cache; hapus untuk hitung ulang), tulis berkas publik.
  perbarui(lap)  tiap laporan.py jalan (CI 3-jam): tahun-tahun lampau dan latar dipakai ulang dari berkas yang sudah di-commit;
        hanya hari yang ada di arsip laporan.json ditimpa (jadi == laporan nasional.titik / prov.titik). Hari sebelum arsip
        tetap dari bangun. Tanpa berkas dasar, perbarui tidak menulis apa-apa.
Pakai:  python3 scripts/data/musim_harian.py uji
"""
import csv, datetime as dt, json, os, statistics, sys

sys.path.insert(0, os.path.dirname(__file__))
AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
JALUR = os.path.join(AKAR, "public/data/musim_harian.json")
HITUNG = os.path.join(AKAR, "data/raw/firms/musim_harian_hitung.json")
AWAL, LATAR_AKHIR = 2019, 2025
WIB = dt.timedelta(hours=7)
SUMBER = "NASA FIRMS MODIS C6.1, VIIRS S-NPP, VIIRS NOAA-20; arsip standar (SP) + NRT; tahun berjalan dari laporan.json"
DEFINISI = "Titik panas semua satelit (M, N, N20), semua keyakinan, hari kalender WIB, provinsi menurut batas BIG; hitungan per hari, bukan kumulatif"


def hari_tahun(tahun):
    return 366 if int(tahun) % 4 == 0 else 365   # 2000-2099


def idx_kabisat(d):
    """Indeks hari di kalender kabisat: 0 = 1 Jan, 59 = 29 Feb."""
    return dt.date(2000, d.month, d.day).timetuple().tm_yday - 1


def latar(nas, prov, tahun):
    """Median per tanggal kalender kabisat atas `tahun`; 1 desimal. 29 Feb: median tahun kabisat saja."""
    def rata(seri):   # seri: {tahun: list}
        out = []
        for i in range(366):
            v = []
            for y in tahun:
                a = seri[y]
                j = i if hari_tahun(y) == 366 or i < 59 else i - 1
                if hari_tahun(y) == 365 and i == 59:
                    continue            # 29 Feb tidak ada
                v.append(a[j])
            out.append(round(statistics.median(v), 1))
        return out
    return {"tahun": list(tahun), "stat": "median", "nasional": rata({y: nas[y] for y in tahun}),
            "prov": {k: rata({y: v[y] for y in tahun}) for k, v in prov.items()}}


def hitung_csv(sd, berkas):
    """CSV FIRMS -> {tahun: {kode: [titik per hari]}} sampai sd (inklusif)."""
    from wilayah import Wilayah
    w, sdd, hasil, tembolok = Wilayah(), dt.date.fromisoformat(sd), {}, {}
    for b in berkas:
        n = 0
        for r in csv.DictReader(open(b)):
            tg = r["acq_date"]
            if tg < f"{AWAL - 1}-12-31":
                continue
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{tg}T{jam[:2]}:{jam[2:]}") + WIB
            d = t.date()
            if d.year < AWAL or d > sdd:
                continue
            k = (round(float(r["longitude"]), 3), round(float(r["latitude"]), 3))
            if k not in tembolok:
                a = w.cari(*k)
                tembolok[k] = a[0] if a else None
            p = tembolok[k]
            if p:
                s = hasil.setdefault(str(d.year), {}).setdefault(p, [0] * hari_tahun(d.year))
                s[d.timetuple().tm_yday - 1] += 1
            n += 1
        print(b, n, "baris", file=sys.stderr)
    return hasil


def rakit(hit, sd, kode):
    """{tahun:{kode:[..]}} -> isi berkas publik. Semua kode ada di tiap tahun (nol bila kosong)."""
    tahun = [str(y) for y in range(AWAL, int(sd[:4]) + 1)]
    n = lambda y: hari_tahun(y) if y != sd[:4] else (dt.date.fromisoformat(sd) - dt.date(int(y), 1, 1)).days + 1
    prov = {k: {y: (hit.get(y, {}).get(k) or [0] * n(y))[:n(y)] for y in tahun} for k in kode}
    nas = {y: [sum(prov[k][y][i] for k in kode) for i in range(n(y))] for y in tahun}
    ly = [y for y in tahun if int(y) <= LATAR_AKHIR]
    return {"sumber": SUMBER, "definisi": DEFINISI, "dibuat": dt.datetime.now(dt.timezone(WIB)).isoformat(timespec="minutes"),
            "tahun": tahun, "sd": sd, "nasional": nas, "prov": prov, "latar": latar(nas, prov, ly)}


def tulis(m, jalur=JALUR):
    with open(jalur, "w") as f:
        json.dump(m, f, separators=(",", ":"))


def bangun(sd):
    from wilayah import PROVINSI
    if os.path.exists(HITUNG):
        hit = json.load(open(HITUNG))
        assert hit["sd"] == sd, f"cache {HITUNG} sd {hit['sd']} != {sd}; hapus untuk hitung ulang"
        hit = hit["hit"]
    else:
        d = os.path.join(AKAR, "data/raw/firms")
        hit = hitung_csv(sd, [os.path.join(d, f) for f in ("modis.csv", "viirs.csv", "viirs_noaa20.csv")])
        json.dump({"sd": sd, "hit": hit}, open(HITUNG, "w"), separators=(",", ":"))
    m = rakit(hit, sd, sorted(PROVINSI))
    tulis(m)
    print(JALUR, os.path.getsize(JALUR), "byte", {y: sum(v) for y, v in m["nasional"].items()})


def terapkan(m, hari, nas, prov):
    """Timpa hari-hari arsip laporan (hari: iso, nas: titik nasional, prov: {kode: titik}) ke m. Hasilnya == laporan.
    Hari sesudah akhir seri diperpanjang; celah (hari tanpa data di antaranya) -> ValueError."""
    for i, h in enumerate(hari):
        y = h[:4]
        j = dt.date.fromisoformat(h).timetuple().tm_yday - 1
        if y not in m["tahun"]:
            m["tahun"].append(y)
            m["nasional"][y] = []
            for k in m["prov"]:
                m["prov"][k][y] = []
        s = m["nasional"][y]
        if j > len(s):
            raise ValueError(f"celah {y}: seri {len(s)} hari, laporan mulai hari ke-{j}")
        for arr, v in [(s, nas[i])] + [(m["prov"][k][y], prov.get(k, [0] * len(hari))[i]) for k in m["prov"]]:
            if j == len(arr):
                arr.append(v)
            else:
                arr[j] = v
    # nasional laporan == jumlah provinsi (semua titik punya provinsi); dibuktikan di uji()
    m["sd"] = hari[-1]


def perbarui(lap, jalur=JALUR):
    """Dipanggil laporan.main(): perbarui hari arsip laporan di berkas publik. -> berkas ditulis atau None."""
    if not os.path.exists(jalur) or not lap.get("hari"):
        return None
    m = json.load(open(jalur))
    pr = {k: v["titik"] for k, v in lap["prov"].items() if k in m["prov"]}
    terapkan(m, lap["hari"], lap["nasional"]["titik"], pr)
    m["dibuat"] = lap["dibuat"]
    tulis(m, jalur)
    return m


def periksa(m):
    """Invarian berkas publik; assert dengan pesan berangka."""
    for y in m["tahun"]:
        pj = hari_tahun(y) if y != m["sd"][:4] else (dt.date.fromisoformat(m["sd"]) - dt.date(int(y), 1, 1)).days + 1
        assert len(m["nasional"][y]) == pj, f"nasional {y}: {len(m['nasional'][y])} hari, harusnya {pj}"
        for k, v in m["prov"].items():
            assert len(v[y]) == pj, f"prov {k} {y}: {len(v[y])} hari, harusnya {pj}"
        assert m["nasional"][y] == [sum(v[y][i] for v in m["prov"].values()) for i in range(pj)], f"nasional {y} != jumlah provinsi"
    L = m["latar"]
    assert L.get("stat") == "median" and len(L["nasional"]) == 366, f"latar nasional {len(L['nasional'])} != 366"
    assert all(len(v) == 366 for v in L["prov"].values()), "latar prov bukan 366 semua"
    assert set(L["prov"]) == set(m["prov"]), "kode prov latar != prov"
    assert all(y in m["tahun"] for y in L["tahun"]), "tahun latar tak ada di tahun"


def uji():
    # latar: dua tahun kecil (2019 biasa, 2020 kabisat), 29 Feb hanya dari 2020
    a19, a20, a21 = [1] * 365, [3] * 366, [20] * 365
    a19[59] = 5                       # 1 Mar 2019 = indeks 60 kabisat
    L = latar({"2019": a19, "2020": a20, "2021": a21}, {}, ["2019", "2020", "2021"])
    assert L["stat"] == "median" and len(L["nasional"]) == 366 and L["nasional"][0] == 3.0 and L["nasional"][59] == 3.0 and L["nasional"][60] == 5.0, (L["nasional"][58:62], "median, bukan rerata 8,0")
    # terapkan: menimpa hari arsip, memperpanjang, menolak celah
    tahun = ["2019", "2026"]
    m = {"tahun": tahun, "sd": "2026-01-02", "prov": {"14": {"2019": [0] * 365, "2026": [1, 2]}, "62": {"2019": [0] * 365, "2026": [3, 4]}},
         "nasional": {"2019": [0] * 365, "2026": [4, 6]}}
    terapkan(m, ["2026-01-02", "2026-01-03"], [10, 7], {"14": [6, 4], "62": [4, 3]})
    assert m["nasional"]["2026"] == [4, 10, 7] and m["prov"]["14"]["2026"] == [1, 6, 4] and m["sd"] == "2026-01-03", m
    try:
        terapkan(m, ["2026-01-06"], [1], {})
        raise AssertionError("celah harus ditolak")
    except ValueError:
        pass
    # periksa menolak panjang salah dan latar salah
    bad = rakit({"2019": {"14": [1] * 365}}, "2026-01-03", ["14"])
    periksa(bad)
    bad["nasional"]["2026"].append(0)
    try:
        periksa(bad)
        raise AssertionError("panjang salah harus ditolak")
    except AssertionError as e:
        assert "harusnya" in str(e), e
    # berkas nyata (bila ada): invarian dan setara laporan.json untuk tiap hari arsip
    lap = json.load(open(os.path.join(AKAR, "public/data/laporan.json"))) if os.path.exists(os.path.join(AKAR, "public/data/laporan.json")) else None
    if os.path.exists(JALUR):
        m = json.load(open(JALUR))
        periksa(m)
        if lap:
            ya = lap["hari"][-1][:4]
            n = 0
            for i, h in enumerate(lap["hari"]):
                if h[:4] != ya or h > m["sd"]:
                    continue
                j = dt.date.fromisoformat(h).timetuple().tm_yday - 1
                assert m["nasional"][ya][j] == lap["nasional"]["titik"][i], f"{h}: musim {m['nasional'][ya][j]} != laporan {lap['nasional']['titik'][i]}"
                for k, v in lap["prov"].items():
                    assert m["prov"][k][ya][j] == v["titik"][i], f"{h} prov {k}: musim {m['prov'][k][ya][j]} != laporan {v['titik'][i]}"
                n += 1
            print(f"  musim_harian cocok laporan.json: {n} hari")
    print("musim_harian uji: lolos")


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a == ["uji"] else bangun(a[1]) if a[:1] == ["bangun"] else sys.exit(__doc__)
