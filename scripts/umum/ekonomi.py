"""Keputusan ekonomi per bencana (F-21, PB-55): public/data/ekonomi/<id>.json.

Satu mesin dampak: jiwa terpapar, laju mengungsi DIBI, dan kebutuhan Sphere dipakai ulang dari scripts/prediksi/terbit.py
(paparan, laju_ungsi, kebutuhan), tidak disalin. Rupiah hanya bila koefisiennya bersumber (Q6):
  koefisien tetap   scripts/umum/ekonomi_koefisien.json, tiap entri wajib nilai, sumber, tanggal (ditolak bila kurang)
  harga beras       public/data/harga_pangan.json (Panel Harga Bapanas, Beras Medium per provinsi), tanggal dari berkasnya
  tanpa koefisien   rupiah null dan komponennya di "tidak_tersedia" (kartu: "koefisien tidak tersedia"), tidak pernah 0
Hanya bencana yang punya aturan mengungsi DIBI di scripts/prediksi/aturan.json (banjir, longsor). Bencana lain tidak diberi
angka mengungsi (Q22): tidak ada berkas, layar menulis tidak ada data. Skor model longsor dan hujan 50 mm TIDAK dipakai
(gerbang public/data/gerbang/<id>.json boleh_tampil false, PB-49/PB-50); seluruh berkas berlabel hipotesis.
DITAHAN (validasi-model 25 Nov 2026): laju_ungsi terbit.py condong ke 1,0 saat terdampak kosong, dan laju x paparan seluruh zona
adalah skenario batas atas, bukan harapan. Selama RUPIAH_NYALA = False (bawaan) berkas hanya memuat jiwa terpapar per kab dan
tabel komponen; perkiraan mengungsi, kg beras, dan rupiah tidak ditulis sama sekali. Jalur rupiah (koefisien, periksa_koef,
harga beras) tetap ada untuk dinyalakan sesudah uji balik lawan DIBI per kejadian lulus. Tanpa jaringan.

Pakai:  python3 scripts/umum/ekonomi.py buat   |   python3 -I scripts/umum/ekonomi.py uji
"""
import datetime as dt, importlib.util, json, os, re, sys, tempfile

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(SINI, "..", ".."))
KOEF = os.path.join(SINI, "ekonomi_koefisien.json")
KELUAR = os.path.join(AKAR, "public", "data", "ekonomi")
WIB = dt.timezone(dt.timedelta(hours=7))
TIDAK = "koefisien tidak tersedia"
KOLOM_PAPARAN = ["kab", "nama", "prov", "jiwa"]
KOLOM = ["kab", "nama", "prov", "jiwa", "laju", "mengungsi", "air_l", "hunian_m2", "jamban", "kkal", "beras_kg", "harga_beras_kg", "rp_beras_hari"]
TANGGAL = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
HIPOTESIS = "Jiwa terpapar dari zona bahaya InaRISK; perkiraan mengungsi dari DIBI 12 bulan belum diuji balik terhadap kejadian."
RUPIAH_NYALA = False   # nyalakan hanya sesudah uji balik laju mengungsi lawan DIBI per kejadian lulus (validasi-model)
DITAHAN = "perkiraan mengungsi dan rupiah ditahan sampai uji balik lawan DIBI per kejadian lulus"
TAHAN_TEKS = "ditahan sampai uji balik"
LABEL_JIWA = {"banjir": "Jiwa terpapar", "longsor": "Penduduk kecamatan terpapar, batas atas"}
KOMPONEN_DITAHAN = ["perkiraan_mengungsi", "beras_per_hari"]
LARANG_TAHAN = {"laju", "mengungsi", "air_l", "hunian_m2", "jamban", "kkal", "beras_kg", "harga_beras_kg", "rp_beras_hari", "beras_kg_orang_hari", "sphere"}


def _terbit():
    s = importlib.util.spec_from_file_location("ekonomi_terbit", os.path.join(AKAR, "scripts", "prediksi", "terbit.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def periksa_koef(nama, e):
    """-> daftar galat untuk satu koefisien. Wajib: nilai angka > 0, sumber teks, tanggal YYYY[-MM[-DD]]; url bila ada harus http(s)."""
    g = []
    if not isinstance(e, dict):
        return [f"{nama}: bukan objek"]
    v = e.get("nilai")
    if isinstance(v, bool) or not isinstance(v, (int, float)) or v <= 0:
        g.append(f"{nama}: nilai wajib angka > 0")
    if not isinstance(e.get("sumber"), str) or not e["sumber"].strip():
        g.append(f"{nama}: sumber wajib")
    if not isinstance(e.get("tanggal"), str) or not TANGGAL.match(e["tanggal"]):
        g.append(f"{nama}: tanggal wajib (YYYY, YYYY-MM, atau YYYY-MM-DD)")
    if "url" in e and not str(e["url"]).startswith(("https://", "http://")):
        g.append(f"{nama}: url bukan http(s)")
    return g


def muat_koef(jalur=KOEF):
    d = json.load(open(jalur, encoding="utf-8"))
    g = [x for n, e in d.get("koefisien", {}).items() for x in periksa_koef(n, e)]
    if g:
        raise ValueError("berkas koefisien tidak sah: " + "; ".join(g))
    return d


def harga_beras(hp, komoditas):
    """public/data/harga_pangan.json -> (fungsi prov -> koefisien atau None, sumber). Harga 0/kosong = None, bukan 0."""
    sumber = {"sumber": hp.get("sumber"), "url": (re.search(r"https?://\S+", hp.get("atribusi") or "") or [None])[0], "tanggal": hp.get("tanggal")}

    def per_prov(prov):
        v = (((hp.get("wilayah") or {}).get(prov) or {}).get("harga") or {}).get(komoditas)
        e = {"nilai": v, **sumber}
        return e if not periksa_koef("harga_beras_kg", e) else None
    return per_prov, sumber


def baris(k, jiwa, laju, kb, beras, harga):
    """Satu kab. laju None (tanpa sejarah, Q22) -> mengungsi dan kebutuhan null; harga None -> rupiah null."""
    if laju is None or kb is None:
        return [k["id"], k["nama"], k["prov"], jiwa, None] + [None] * 8
    kg = round(kb["mengungsi"] * beras, 1)
    h = harga["nilai"] if harga else None
    return [k["id"], k["nama"], k["prov"], jiwa, round(laju, 4), kb["mengungsi"], kb["air_l"], kb["hunian_m2"], kb["jamban"], kb["kkal"],
            kg, h, round(kg * h) if h is not None else None]


def gerbang(akar, bid):
    d = json.load(open(os.path.join(akar, "public", "data", "gerbang", bid + ".json"))) if os.path.exists(os.path.join(akar, "public", "data", "gerbang", bid + ".json")) else {}
    return [{"keluaran": n, "boleh_tampil": bool(v.get("boleh_tampil")), "alasan": v.get("alasan")} for n, v in (d.get("keluaran") or {}).items()]


def hitung(akar=AKAR, koef=None, hp=None, kini=None, rupiah=None):
    """-> {bencana_id: isi berkas}. Hanya aturan berpaparan kec_bahaya dan bermengungsi DIBI. rupiah None = RUPIAH_NYALA."""
    rupiah = RUPIAH_NYALA if rupiah is None else rupiah
    T = _terbit()
    D = T.D
    koef = koef or muat_koef()
    hp = hp if hp is not None else D.baca(os.path.join(akar, "public", "data", "harga_pangan.json"), {})
    at = json.load(open(os.path.join(akar, "scripts", "prediksi", "aturan.json")))
    aturan = [a for a in at["aturan"] if a.get("aktif", True) and a.get("mengungsi") and (a.get("paparan") or {}).get("jenis") == "kec_bahaya"]
    daftar = D.kab(akar)
    cari = D.pencari(daftar)
    pap = T.paparan(akar, daftar, cari, aturan)
    dd = koef["dari_data"]["harga_beras_kg"]
    per_prov, sumber_harga = harga_beras(hp, dd["komoditas"])
    beras = koef["koefisien"]["beras_kg_orang_hari"]
    dibuat = (kini or dt.datetime.now(WIB)).replace(microsecond=0).isoformat()
    out = {}
    for a in aturan:
        bid = a["paparan"]["bahaya"]
        g = gerbang(akar, bid)
        tidak = [{**x, "teks": TIDAK} for x in koef.get("tidak_tersedia", [])]
        if not rupiah:
            rows = sorted(([k["id"], k["nama"], k["prov"], (pap[k["id"]].get(bid) or {}).get("jiwa")] for k in daftar if (pap[k["id"]].get(bid) or {}).get("jiwa")),
                          key=lambda r: -r[3])
            out[bid] = {"dibuat": dibuat, "versi": 1, "bencana": bid, "hipotesis": True, "hipotesis_alasan": HIPOTESIS, "ditahan": DITAHAN,
                        "skor_model": {"dipakai": False, "alasan": "skor model tidak dipakai di kartu keputusan (DESAIN-TEKNIS 6.6, PB-49/PB-50)", "gerbang": g},
                        "paparan": a["paparan"].get("sumber"), "label_jiwa": LABEL_JIWA.get(bid, "Jiwa terpapar"),
                        "komponen": [{"komponen": c, "teks": TAHAN_TEKS, "alasan": DITAHAN} for c in KOMPONEN_DITAHAN] + tidak,
                        "catatan": "Hanya jiwa terpapar per kab/kota; tidak dijumlah antarsumber. Bukan perkiraan mengungsi.",
                        "kolom": KOLOM_PAPARAN, "baris": rows}
            continue
        f, nas = T.laju_ungsi(akar, cari, set(a["mengungsi"]["jenis_dibi"]))
        rows = []
        for k in daftar:
            jiwa = (pap[k["id"]].get(bid) or {}).get("jiwa")
            if not jiwa:
                continue
            laju = (lambda x: x[0] if isinstance(x, tuple) else x)(f(k["id"])) if nas else None   # terbit baru: (laju, n, asal)   # laju nasional 0 = tanpa sejarah DIBI: tanpa angka (Q22)
            kb = T.kebutuhan(round(jiwa * laju), at["sphere"]) if laju is not None else None
            rows.append(baris(k, jiwa, laju, kb, beras["nilai"], per_prov(k["prov"])))
        rows.sort(key=lambda r: -(r[5] or 0))
        out[bid] = {
            "dibuat": dibuat, "versi": 1, "bencana": bid, "hipotesis": True, "hipotesis_alasan": HIPOTESIS,
            "skor_model": {"dipakai": False, "alasan": "skor model tidak dipakai di kartu keputusan (DESAIN-TEKNIS 6.6, PB-49/PB-50)", "gerbang": g},
            "paparan": a["paparan"].get("sumber"),
            "label_jiwa": LABEL_JIWA.get(bid, "Jiwa terpapar"),
            "laju": {"sumber": "DIBI 12 bulan public/data/dibi_kejadian.json, jenis " + ", ".join(a["mengungsi"]["jenis_dibi"]) +
                     "; sum(mengungsi)/sum(terdampak) kab bila >= 3 kejadian tercatat, selain itu nasional", "nasional": round(nas, 4) if nas else None},
            "sphere": at["sphere"]["sumber"],
            "koefisien": {"beras_kg_orang_hari": beras, "harga_beras_kg": {**sumber_harga, "nilai": "per provinsi, kolom harga_beras_kg",
                                                                              "komoditas": "Beras Medium (" + dd["berkas"] + ")"}},
            "komponen": tidak,
            "catatan": "Rupiah = beras saja per hari (kg x harga provinsi), tidak dijumlah antarkab atau antarsumber. Null = koefisien tidak tersedia atau tanpa sejarah, bukan nol.",
            "kolom": KOLOM, "baris": rows,
        }
    return out


def tulis(isi, folder=KELUAR):
    os.makedirs(folder, exist_ok=True)
    for bid, d in isi.items():
        p = os.path.join(folder, bid + ".json")
        with open(p + ".tmp", "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, separators=(",", ":"))
        os.replace(p + ".tmp", p)


def _kunci(v, akar=""):
    if isinstance(v, dict):
        for k, x in v.items():
            yield akar + k
            yield from _kunci(x, akar + k + ".")
    elif isinstance(v, list):
        for x in v:
            yield from _kunci(x, akar)


def uji():
    T = _terbit()
    sp = json.load(open(os.path.join(AKAR, "scripts", "prediksi", "aturan.json")))["sphere"]
    assert T.kebutuhan(41, sp) == {"mengungsi": 41, "air_l": 615, "hunian_m2": 144, "jamban": 3, "kkal": 86100}
    # koefisien kurang satu isian ditolak
    sah = {"nilai": 0.4, "sumber": "Perka 7/2008", "tanggal": "2008"}
    assert periksa_koef("x", sah) == []
    for buang in ("nilai", "sumber", "tanggal"):
        assert periksa_koef("x", {k: v for k, v in sah.items() if k != buang}), buang
    assert periksa_koef("x", {**sah, "nilai": 0}) and periksa_koef("x", {**sah, "nilai": True}) and periksa_koef("x", {**sah, "tanggal": "kemarin"})
    assert periksa_koef("x", {**sah, "url": "ftp://a"}) and periksa_koef("x", {**sah, "sumber": "  "})
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "k.json")
        json.dump({"koefisien": {"a": {"nilai": 1, "sumber": "s"}}}, open(p, "w"))
        try:
            muat_koef(p)
            raise AssertionError("koefisien tanpa tanggal lolos")
        except ValueError as e:
            assert "tanggal" in str(e)
    koef = muat_koef()
    assert "nilai_bangunan" in {x["komponen"] for x in koef["tidak_tersedia"]}
    # harga 0 atau provinsi hilang -> None, bukan 0
    hp = {"sumber": "Panel Harga Bapanas", "atribusi": "Bapanas, https://panelharga.badanpangan.go.id", "tanggal": "2026-11-10",
          "wilayah": {"11": {"harga": {"28": 14000}}, "12": {"harga": {"28": 0}}}}
    f, s = harga_beras(hp, "28")
    assert f("11")["nilai"] == 14000 and f("11")["url"].startswith("https://") and f("12") is None and f("99") is None
    k = {"id": "1101", "nama": "A", "prov": "11"}
    kb = T.kebutuhan(41, sp)
    r = dict(zip(KOLOM, baris(k, 1000, 0.041, kb, 0.4, f("11"))))
    assert r["beras_kg"] == 16.4 and r["rp_beras_hari"] == 229600
    r = dict(zip(KOLOM, baris(k, 1000, 0.041, kb, 0.4, f("12"))))
    assert r["rp_beras_hari"] is None and r["harga_beras_kg"] is None and r["mengungsi"] == 41
    r = dict(zip(KOLOM, baris(k, 1000, None, None, 0.4, f("11"))))   # Q22: tanpa sejarah -> hanya jiwa
    assert r["jiwa"] == 1000 and all(r[c] is None for c in KOLOM[4:])
    # data repo nyata, tulis ke folder sementara
    assert RUPIAH_NYALA is False, "jalur rupiah dinyalakan tanpa vonis uji balik"
    kini = dt.datetime(2026, 11, 25, 8, tzinfo=WIB)
    isi = hitung(kini=kini)
    assert set(isi) == {"banjir", "longsor"}, set(isi)
    with tempfile.TemporaryDirectory() as t:
        tulis(isi, t)
        for bid in isi:
            raw = open(os.path.join(t, bid + ".json"), encoding="utf-8").read()
            assert len(raw.encode()) <= 1024 * 1024, (bid, len(raw))
            d = json.loads(raw)
            assert next(iter(d)) == "dibuat" and d["hipotesis"] is True and d["skor_model"]["dipakai"] is False and d["ditahan"] == DITAHAN
            kunci = {x.rsplit(".", 1)[-1] for x in _kunci(d)}
            assert not ({"tarif", "nama_kru", "pelapor", "no_hp", "nik", "plafon", "harga_kontrak"} & kunci)
            # ditahan: tidak ada kolom atau kunci mengungsi, kg, atau Rp di mana pun, juga tidak ada "Rp" atau "kg" di teks
            assert not (LARANG_TAHAN & (kunci | set(d["kolom"]))), LARANG_TAHAN & (kunci | set(d["kolom"]))
            assert d["kolom"] == KOLOM_PAPARAN and not re.search(r"\bRp|\bkg\b|rupiah_|historis", raw), bid
            assert not re.search(r"\baman\b", raw, re.I), bid
            assert {"perkiraan_mengungsi", "beras_per_hari", "nilai_bangunan"} <= {c["komponen"] for c in d["komponen"]}
            assert d["label_jiwa"] == LABEL_JIWA[bid]
            assert d["baris"], bid
            assert all(len(r) == 4 and r[3] > 0 for r in d["baris"])
    # jalur rupiah (bendera nyala) tetap berjalan dan setia pada aturan null, untuk dinyalakan nanti
    nyala = hitung(kini=kini, rupiah=True)
    for bid, d in nyala.items():
        for n, e in d["koefisien"].items():
            if n != "harga_beras_kg":
                assert periksa_koef(n, e) == [], n
        for row in d["baris"]:
            x = dict(zip(d["kolom"], row))
            assert x["rp_beras_hari"] != 0 or x["mengungsi"] == 0, x
            assert (x["rp_beras_hari"] is None) == (x["harga_beras_kg"] is None or x["mengungsi"] is None), x
    print(f"ekonomi uji: lulus (banjir {len(isi['banjir']['baris'])} kab, longsor {len(isi['longsor']['baris'])} kab; mengungsi, kg, Rp ditahan)")

if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else ""
    if a == "uji":
        uji()
    elif a == "buat":
        isi = hitung()
        tulis(isi)
        for bid, d in isi.items():
            print(f"ekonomi {bid}: {len(d['baris'])} kab, kolom {','.join(d['kolom'])}, ditahan: {d.get('ditahan', '-')}")
    else:
        sys.exit(__doc__)
