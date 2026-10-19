"""Kurasi tangan letusan besar Indonesia -> public/gunungapi/data/factsheet_gunungapi.json (A36, pola factsheet_gempa.json).

Daftar peristiwa dipilih tangan (DAFTAR di bawah); angkanya TIDAK diketik tangan: tiap angka diambil dari dua sumber terbuka yang
dibuka lewat HTTP saat skrip jalan, dan tiap angka menyimpan URL sumbernya sendiri:
  meninggal, hilang, luka, rumah_hancur  NOAA NCEI, Significant Volcanic Eruption Database (hazel API, domain publik)
      https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/volcanoes/<id>
  vei                                    Smithsonian GVP, Volcanoes of the World (layanan WFS GVP-VOTW, ExplosivityIndexMax);
      bila GVP tidak memuat peristiwa itu, VEI NCEI. Halaman volcano.si.edu 403 dari luar peramban, WFS-nya terbuka.
  pengungsi                              hanya bila halaman lembaga (BNPB/PVMBG) benar-benar terbuka: sekarang Merapi 2010 (arsip bnpb.go.id)
Yang tidak ada di sumber = null, bukan tebakan. Pilihan angka ("langsung" atau "total") ditulis per baris di DAFTAR dan di keterangan.
Pakai:  python3 scripts/gunungapi/factsheet.py        tulis berkas (jaringan)
        python3 scripts/gunungapi/factsheet.py uji    self-check (luring)
"""
import datetime as dt, json, os, sys, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/gunungapi/data/factsheet_gunungapi.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
NCEI = "https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/volcanoes/"
WFS = "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application/json&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Eruptions&CQL_FILTER="
BNPB_MERAPI = "https://web.archive.org/web/20110721122014/http://bnpb.go.id/irw/berita.asp?id=115"
# (id NCEI, nomor erupsi GVP atau None, gunung, wilayah, korban: "langsung"|"total", catatan vei bila VEI GVP = episode lebih panjang, pengungsi {n, ket, url})
DAFTAR = [
    (367, 16231, "Tambora", "Nusa Tenggara Barat", "total", "", None),
    (2429, 15589, "Krakatau", "Selat Sunda (Banten dan Lampung)", "total", "", None),
    (138, 15953, "Kelud", "Jawa Timur", "langsung", "", None),
    (351, 16210, "Agung", "Bali", "langsung", "", None),
    (94, 15902, "Merapi", "Jawa Tengah dan DI Yogyakarta", "langsung", "", None),
    (2524, 15721, "Galunggung", "Jawa Barat", "langsung", "", None),
    (5304, 15925, "Merapi", "Jawa Tengah dan DI Yogyakarta", "langsung", "",
     {"n": 198488, "ket": "tercatat BNPB per 6 November 2010 pukul 06.00 WIB", "url": BNPB_MERAPI}),
    (6024, 20934, "Kelud", "Jawa Timur", "langsung", "", None),
    (6004, 20818, "Sinabung", "Sumatera Utara", "langsung", "VEI tertinggi rangkaian erupsi 2013 sampai 2018", None),
    (6567, 20818, "Sinabung", "Sumatera Utara", "langsung", "VEI tertinggi rangkaian erupsi 2013 sampai 2018", None),
    (7550, None, "Semeru", "Jawa Timur", "langsung", "", None),
    (7561, 22550, "Marapi", "Sumatera Barat", "langsung", "VEI tertinggi rangkaian erupsi 2023 sampai 2026", None),
    (7567, 22562, "Ruang", "Sulawesi Utara", "langsung", "", None),
    (7576, 22556, "Lewotobi Laki-laki", "Nusa Tenggara Timur", "langsung", "VEI tertinggi rangkaian erupsi 2023 sampai 2025", None),
]
ISO = "%Y-%m-%d"


def ambil(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
        return json.load(r)


def angka(x):
    """Bilangan bulat tak negatif dari sumber, selain itu None."""
    return x if isinstance(x, int) and not isinstance(x, bool) and x >= 0 else None


def baris(n, g, d, ambil_gvp):
    """Satu kasus dari rekaman NCEI `n`, rekaman GVP `g` (atau None), butir DAFTAR `d`. Setiap angka berpasangan dengan URL-nya."""
    _, no_gvp, gunung, wilayah, pakai, ket_vei, pengungsi = d
    u_ncei = NCEI + str(n["id"])
    tot = n.get("deathsTotal") if pakai == "total" else None
    mati = angka(tot if tot is not None else n.get("deaths"))
    vei, v_url = (angka(g.get("ExplosivityIndexMax")), WFS + urllib.parse.quote(f"Eruption_Number={no_gvp}")) if g and angka(g.get("ExplosivityIndexMax")) is not None else (None, None)
    if vei is None and angka(n.get("vei")) is not None:
        vei, v_url, ket_vei = n["vei"], u_ncei, ""
    s = {}
    for k, sumber_k in (("meninggal", mati), ("hilang", angka(n.get("missing"))), ("luka", angka(n.get("injuries"))), ("rumah_hancur", angka(n.get("housesDestroyed")))):
        if sumber_k is not None:
            s[k] = u_ncei
    if vei is not None:
        s["vei"] = v_url
    if pengungsi:
        s["pengungsi"] = pengungsi["url"]
    tgl = "-".join([f"{n['year']:04d}"] + [f"{n[k]:02d}" for k in ("month", "day") if n.get(k)])
    return {"tanggal": tgl, "gunung": gunung, "wilayah": wilayah, "nama": f"{gunung}, {wilayah}", "vei": vei, "vei_ket": ket_vei or None,
            "meninggal": mati, "hilang": angka(n.get("missing")), "luka": angka(n.get("injuries")), "rumah_hancur": angka(n.get("housesDestroyed")),
            "pengungsi": pengungsi["n"] if pengungsi else None, "pengungsi_ket": pengungsi["ket"] if pengungsi else None,
            "korban_ket": "total termasuk korban tidak langsung (tsunami, kelaparan, penyakit)" if pakai == "total" and tot is not None else None,
            "sumber": s}


def bangun():
    gvp = {}
    nos = sorted({d[1] for d in DAFTAR if d[1]})
    for f in ambil(WFS + urllib.parse.quote("Eruption_Number IN (" + ",".join(map(str, nos)) + ")"))["features"]:
        gvp[f["properties"]["Eruption_Number"]] = f["properties"]
    kasus = []
    for d in DAFTAR:
        n = ambil(NCEI + str(d[0]))
        kasus.append(baris(n, gvp.get(d[1]), d, None))
    kasus.sort(key=lambda k: k["tanggal"])
    return {"sumber": "NOAA NCEI Significant Volcanic Eruption Database (korban, rumah), Smithsonian GVP Volcanoes of the World (VEI), BNPB (pengungsi Merapi 2010); tiap angka menyimpan URL-nya di `sumber`",
            "tanggal": dt.date.today().strftime(ISO),
            "catatan": "Dicocokkan ke sumber pada tanggal berkas ini. Korban = meninggal menurut NCEI (langsung; total hanya untuk Tambora 1815 dan Krakatau 1883 karena korban terbanyaknya tidak langsung: tsunami, kelaparan). "
                       "NCEI memisahkan beberapa peristiwa satu rangkaian: Agung 1963 hanya angka 18 Maret (120 korban lain pada 16 Mei tidak dijumlahkan); Sinabung 2014 dan 2016 dua peristiwa terpisah. "
                       "Semeru 4 Desember 2021: NCEI menulis 51 meninggal pada kolom langsung dan 45 pada kolom total, angka BNPB tidak terbuka, jadi dipakai angka kolom langsung dan tidak dianggap pasti. "
                       "VEI rangkaian panjang (Sinabung, Marapi, Lewotobi) adalah VEI tertinggi seluruh rangkaian di GVP, bukan VEI hari korban jatuh. "
                       "Pengungsi hanya Merapi 2010 (halaman BNPB terbuka lewat arsip web); peristiwa lain null karena halaman lembaganya tidak terbuka dari sini. "
                       "Ruang 2024 tanpa korban jiwa tercatat di NCEI: null, bukan 0.",
            "kasus": kasus}


def periksa(o):
    """Aturan berkas: tiap angka non-null punya URL sumber di `sumber`; tidak ada angka negatif."""
    for k in o["kasus"]:
        for f in ("vei", "meninggal", "hilang", "luka", "rumah_hancur", "pengungsi"):
            v = k.get(f)
            if v is None:
                continue
            assert isinstance(v, int) and v >= 0, (k["nama"], f, v)
            assert str(k["sumber"].get(f, "")).startswith("http"), (k["nama"], f, "angka tanpa URL sumber")
        assert k["tanggal"][:4].isdigit() and k["gunung"] and k["sumber"], k
    return True


def uji():
    n = {"id": 1, "year": 1815, "month": 4, "day": 10, "deaths": 11000, "deathsTotal": 60000, "vei": 7, "injuries": None}
    d = (1, 16231, "Tambora", "NTB", "total", "", None)
    k = baris(n, {"ExplosivityIndexMax": 7}, d, None)
    assert k["meninggal"] == 60000 and k["vei"] == 7 and k["sumber"]["vei"].startswith(WFS) and k["tanggal"] == "1815-04-10" and k["luka"] is None and "luka" not in k["sumber"], k
    k = baris(dict(n, deathsTotal=None), None, (1, None, "X", "Y", "langsung", "ket", None), None)
    assert k["meninggal"] == 11000 and k["vei"] == 7 and k["sumber"]["vei"] == NCEI + "1" and k["vei_ket"] is None, k
    k = baris({"id": 2, "year": 2024, "month": 4, "day": 16}, {"ExplosivityIndexMax": 4}, (2, 22562, "Ruang", "SULUT", "langsung", "", None), None)
    assert k["meninggal"] is None and "meninggal" not in k["sumber"] and k["vei"] == 4, k
    assert angka(-1) is None and angka(True) is None and angka(None) is None and angka(0) == 0
    periksa({"kasus": [k]})
    try:
        periksa({"kasus": [dict(k, meninggal=5)]})
        raise SystemExit("angka tanpa sumber lolos")
    except AssertionError:
        pass
    if os.path.exists(KELUAR):
        periksa(json.load(open(KELUAR)))
    print("factsheet gunungapi: ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        o = bangun()
        periksa(o)
        os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
        tmp = KELUAR + ".tmp"
        with open(tmp, "w") as f:
            json.dump(o, f, ensure_ascii=False, indent=1)
        os.replace(tmp, KELUAR)
        print("factsheet gunungapi:", len(o["kasus"]), "kasus")
