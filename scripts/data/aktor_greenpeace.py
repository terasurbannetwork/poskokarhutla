"""Perusahaan di balik titik sumber asap karhutla 2026 menurut Greenpeace Indonesia & Pantau Gambut, dicek silang ke peta.

Pakai:  python3 scripts/data/aktor_greenpeace.py        # -> public/data/aktor_greenpeace.json
        python3 scripts/data/aktor_greenpeace.py uji    # invarian berkas hasil

Sumber: Greenpeace Indonesia & Pantau Gambut (2026), "When Clean Air is Sacrificed for Global Commodities - Indonesia Forest
and Peatland Fire Facts Report 2026" (36 hlm; tabel hlm 25, 26, 28, teks hlm 23-24, 29, 30). METRIK BUKAN TITIK PANAS:
"titik sumber asap" (haze source spots) dan "durasi asap" (hari), 8 Agu - 1 Okt 2026. Jangan dijumlah dengan titik panas WALHI.
Pola sama aktor_walhi.py (pemilik 17 Okt 2026): nama dicocokkan ke public/data/lahan/konsesi.geojson memakai kunci/POLA/Indeks
milik aktor_walhi, lalu titik VIIRS S-NPP 8 Agu - 1 Okt 2026 di poligonnya dihitung dari arsip lokal (tanpa arsip: angka lama
dipertahankan). KHG dicocokkan ke public/data/lahan/khg.geojson per nama (hubung/spasi dinormalkan).
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aktor_walhi as W  # noqa: E402

AKAR = W.AKAR
KHG = os.path.join(AKAR, "public/data/lahan/khg.geojson")
KELUAR = os.path.join(AKAR, "public/data/aktor_greenpeace.json")
PERIODE = ("2026-08-08", "2026-10-02")  # 8 Agu - 1 Okt (akhir eksklusif)
SUMBER = {"judul": "When Clean Air is Sacrificed for Global Commodities: Indonesia Forest and Peatland Fire Facts Report 2026",
          "penerbit": "Greenpeace Indonesia & Pantau Gambut", "tahun": 2026, "url": "https://www.greenpeace.org/indonesia/",
          "metrik": "titik sumber asap (haze source spots) dan durasi asap (hari), BUKAN titik panas", "periode": "8 Agu - 1 Okt 2026"}

# hlm 26: nama, grup ("" = tanda '-'), titik sumber asap, hari asap
SAWIT = [("PT Mekar Karya Kahuripan", "Makin", 52, 12), ("PT Damai Agro Sejahtera", "Bumitama", 48, 11),
         ("PT Sinar Karya Mandiri", "Palma Agro Lestari", 40, 12), ("PT Abadi Mulia Sentosa", "", 32, 10),
         ("PT Arrtu Energie Resources", "Rajawali/Eagle High", 32, 11),
         ("PT Hardaya Sawit Papua Plantation", "Murdaya family/Central Cipta Murdaya", 31, 8),
         ("PT Karya Luhur Sejati", "Best International/Best Agro Plantation", 29, 10), ("PT Sebukit Inter Nusa", "", 26, 6),
         ("PT Kayung Agro Lestari", "Austindo Nusantara Jaya", 25, 7), ("PT Samora Usaha Jaya", "Sungai Budi/Tunas Baru Lampung", 20, 7),
         ("PT Jalin Vaneo", "Pasifik Agro Sentosa", 19, 11), ("PT Menteng Jaya Sawit Perdana", "Kuala Lumpur Kepong (KLK)", 19, 6),
         ("PT Campang Tiga", "Campang Tiga", 19, 10), ("PT Anugerah Palm Indonesia", "Barito Pacific", 18, 6),
         ("PT Sawit Makmur Sejahtera", "Carson Cumberbatch/Goodhope Asia Holdings", 17, 4), ("PT Russelindo Putra Prima", "Mugan", 14, 8),
         ("Koperasi Tanjung Pawan Mandiri", "", 12, 4), ("PT Proteksindo Utama Mulia", "Cempaka Mas Abadi", 11, 3),
         ("PT Sinar Fajar Dua Ribu Lestari", "", 10, 9), ("PT Cipta Karsa Kahuripan", "", 10, 3)]
# hlm 25 (judul kolom di PDF keliru 'Palm oil concessions'; keterangannya PBPH)
PBPH = [("PT Bumi Mekar Hijau", "Sinarmas", 213, 29), ("PT Mohairson Pawan Khatulistiwa", "YARI", 66, 12),
        ("PT Selaras Inti Semesta", "Medco", 41, 6), ("PT Hutan Ketapang Industri", "Sampoerna Agro", 36, 10),
        ("PT Hutan Lestari Raya", "", 32, 14), ("PT Plasma Nuftah Marind Papua", "Moorim", 31, 11),
        ("PT Hermes Sugar Indonesia", "Hermes Distillery Private Limited", 26, 10), ("PT Mayawana Persada", "RGE/Tanoto Family", 26, 7),
        ("PT Inhutani I Unit Pulau Laut", "Pemerintah (BUMN)", 22, 11), ("PT Rimba Makmur Utama", "", 21, 5),
        ("PT Teluk Bintuni Mina Agro Karya", "", 18, 8), ("PT Arfak Indra", "", 17, 9), ("PT Ciptamas Bumi Subur", "", 17, 3),
        ("PT Sumatera Alam Anugerah", "", 17, 8), ("PT Baratama Putra Perkasa", "", 15, 4), ("PT SBA Wood Industries", "", 14, 5),
        ("PT Buana Megatama Jaya", "", 14, 10), ("PT Paramitra Mulia Langgeng", "", 14, 10), ("PT Rimbun Seruyan", "", 11, 8),
        ("PT Jaya Bumi Paser", "", 11, 9)]
CATATAN_NAMA = {"PT Hutan Ketapang Industri": "Tertulis di PDF: d.h. Kertas Basuki Rachmat",
                "PT Inhutani I Unit Pulau Laut": "Tertulis di PDF: PT Inhutani I Unit Pulau Laut (Semaras)"}
# hlm 28: PSN tebu Merauke, titik sumber asap per bulan (Agu, Sep, Okt) dan total; ditambah penanda belum beroperasi di PDF
TEBU = [("PT Andalan Manis Nusantara", 40, 2, None, 42, False), ("PT Berkat Tebu Sejahtera", 19, 8, None, 27, False),
        ("PT Borneo Citra Persada Merauke", 0, 8, None, 8, False), ("PT Global Papua Abadi", 10, 3, None, 13, True),
        ("PT Murni Nusantara Mandiri", 3, 22, None, 25, True), ("PT Semesta Gula Nusantara", 20, 13, None, 33, False)]
TEBU_JUMLAH = (92, 56, None, 148)
PPKH_KEMHAN = {"titik": 294, "lokasi": "Wanam, sekitar jalan akses 135 km", "izin": "Kementerian Kehutanan", "pemegang": "Kementerian Pertahanan (PPKH)"}
# hlm 30: kaitan Singapura/Malaysia (nama, grup, negara, titik, hari, periode, keterangan)
KAITAN = [("PT Damai Agro Sejahtera", "Bumitama Agri Ltd", "SG", 29, 7, "21 Agu - 11 Sep 2026", ""),
          ("PT Kayung Agro Lestari", "First Resources/ANJ/Fangiono (grup berbasis Singapura)", "SG", 25, 7, "8 Agu - 10 Sep 2026",
           "Sekitar 487 ha terbakar Jul-Agu 2026 menurut Nusantara Atlas/TheTreeMap. Tabel hlm 26 menyebut grupnya Austindo Nusantara Jaya."),
          ("PT Mitra Karya Sentosa", "Fangiono/First Resources", "SG", 10, 6, "10 Agu - 11 Sep 2026", ""),
          ("PT Arjuna Utama Sawit", "First Borneo Plantations (FBP)", "SG", 8, 3, "29 Agu - 11 Sep 2026", ""),
          ("PT Menteng Jaya Sawit Perdana", "Kuala Lumpur Kepong (KLK)", "MY", 19, 6, "Agu - 1 Okt 2026", "")]
RIWAYAT = [{"grup": "Genting Plantations", "negara": "MY", "ha_terbakar": 17700, "periode": "2015-2019", "perusahaan": "",
            "rujukan": "Greenpeace 2020, Karhutla dalam Lima Tahun Terakhir"},
           {"grup": "TSH Resources", "negara": "MY", "ha_terbakar": 6100, "periode": "2015-2019", "perusahaan": "PT Bulungan Citra Agro Persada",
            "rujukan": "Greenpeace 2020, Karhutla dalam Lima Tahun Terakhir"}]
# hlm 23-24
RINGKASAN = {"titik_total": 6811, "pbph": {"titik": 970, "entitas": 120}, "sawit": {"titik": 980, "konsesi": 233},
             "khg": {"titik": 3577, "khg": 141, "versi_gambar_hlm24": {"titik": 3463, "khg": 120},
                     "catatan": "Teks hlm 23 dan gambar hlm 24 tidak konsisten; keduanya disimpan"},
             "bekas_terbakar_2015_2023": 2719, "konservasi": {"titik": 862, "kawasan": 44}, "hutan_produksi": 3177,
             "provinsi": {"Kalimantan Tengah": 1728, "Kalimantan Barat": 1240, "Kalimantan Selatan": 404, "Kalimantan Timur": 249,
                          "Sumatera Selatan": 953, "Jambi": 137, "Riau": 45, "Papua Selatan": 1413},
             "provinsi_tabel_hlm9": {"Sumatera Selatan": 987, "Jambi": 103},
             "pulau": {"Kalimantan": 3628, "Papua": 1634, "Sumatera": 1322, "Maluku": 152, "Sulawesi": 75},
             "emisi": {"Indonesia": 126.88, "Kalimantan Tengah": 47, "Kalimantan Barat": 31.4, "Sumatera Selatan": 20.58,
                       "satuan": "juta t CO2e s.d. 1 Okt 2026 (CAMS)", "catatan": "Kalimantan Tengah +-47"}}
KHG_TOP = [("KHG Sungai Kahayan - Sungai Sebangau", 508, 28, "kritis tinggi"), ("KHG Sungai Sugihan - Sungai Lumpur", 255, 29, "kritis tinggi"),
           ("KHG Sungai Pawan - Sungai Tolak", 236, 22, "kritis sedang"), ("KHG Sungai Pukun - Sungai Mentaya", 219, 24, "kritis tinggi"),
           ("KHG Sungai Buluh Besar", 168, 23, "kritis sedang"), ("KHG Sungai Pawan - Sungai Kepulu", 142, 18, "kritis sedang"),
           ("KHG Sungai Kahayan - Sungai Kapuas", 115, 19, "kritis tinggi"), ("KHG Sungai Katingan - Sungai Sebangau", 106, 20, "kritis sedang"),
           ("KHG Sungai Air Hitam Laut - Sungai Buntu Kecil", 91, 19, "kritis sedang"), ("KHG Sungai Lamandau - Sungai Jelai", 84, 20, "kritis sedang")]
GRUP_NEGARA = {"Bumitama": "SG", "Kuala Lumpur Kepong (KLK)": "MY"}  # hanya yang eksplisit di laporan (kaitan SG/MY) -> lewat KAITAN


# kunci "INHUTANI" terlalu umum (semua unit): pilih poligon bernama lengkap; tanpa ini 30 poligon salah cocok
W.POLA = {**W.POLA, "PT Inhutani I Unit Pulau Laut": r"^PT Inhutani I \((unit )?pulau Laut\)$"}


def nkhg(s):
    return re.sub(r"[\s\-]+", " ", re.sub(r"^KHG\s+", "", s or "", flags=re.I)).strip().lower()


def gabung():
    P = {}

    def ambil(nama, jenis):
        k = W.kunci(nama)
        return P.setdefault(k, {"nama": nama, "jenis": jenis, "prov": "", "grup": "", "grup_kaitan": "", "negara": [], "asap_titik": None,
                                "asap_hari": None, "tabel": [], "kaitan": None, "tebu": None, "catatan": CATATAN_NAMA.get(nama, "")})
    for tab, daf, jenis in (("Sawit", SAWIT, "sawit"), ("PBPH", PBPH, "pbph")):
        for i, (nm, g, n, h) in enumerate(daf, 1):
            p = ambil(nm, jenis)
            p.update(grup=g, asap_titik=n, asap_hari=h)
            p["tabel"].append(f"{tab} #{i}")
    for nm, a, b, c, tot, belum in TEBU:
        p = ambil(nm, "tebu")
        p.update(asap_titik=tot, tebu={"agu": a, "sep": b, "okt": c, "total": tot, "belum_beroperasi": belum})
        p["tabel"].append("PSN tebu")
    for nm, g, neg, n, h, per, ket in KAITAN:
        p = ambil(nm, "sawit")
        p["kaitan"] = {"grup": g, "negara": neg, "titik": n, "hari": h, "periode": per, "ket": ket}
        p["grup_kaitan"] = g
        p["negara"] = [neg]
        p["tabel"].append("Kaitan SG/MY")
        if p["asap_titik"] is None:
            p["titik_kaitan_saja"] = True
    return P


def cocok_khg():
    fs = json.load(open(KHG))["features"]
    per = {}
    for f in fs:
        per.setdefault(nkhg(f["properties"]["nama"]), []).append(f["properties"])
    out, tak = [], []
    for nm, n, h, kond in KHG_TOP:
        ps = per.get(nkhg(nm), [])
        r = {"nama": nm, "titik": n, "hari": h, "kondisi": kond, "id": None, "nama_peta": None, "prov": [], "ha": None}
        if ps:
            q = ps[0]
            seg = q["kode"].split(".")[1].split("-")  # KHG.<prov>[-<prov>].xx : kode BPS provinsi
            r.update(id=q["kode"], nama_peta=q["nama"], ha=q.get("ha"),
                     prov=[{"kode": s, "nama": {v: k for k, v in W.KODE.items()}.get(s) or _prov(s)} for s in seg if _prov(s)])
        else:
            tak.append(nm)
        out.append(r)
    return out, tak


def _prov(kode):
    from wilayah import PROVINSI
    return PROVINSI.get(kode)


def tulis(P, fitur, baru):
    lama = {}
    if os.path.exists(KELUAR):
        lama = {p["nama"]: p for p in json.load(open(KELUAR))["perusahaan"]}
    daf = []
    for p in P.values():
        q = {k: v for k, v in p.items() if not k.startswith("_")}
        if not baru:
            for c in ("titik_viirs", "lokasi", "prov_peta"):
                if c in lama.get(q["nama"], {}).get("cek", {}):
                    q["cek"][c] = lama[q["nama"]]["cek"][c]
        for c in ("harian", "titik", "kompleks"):  # keluaran cek_silang (titik mentah) tidak dibawa; layar membacanya dari konsesi2026
            q.pop(c, None)
        if not q["cek"]["poligon"]:
            q["kosong"] = "tanpa_poligon"
        daf.append(q)
    daf.sort(key=lambda q: (q["asap_titik"] or q["kaitan"]["titik"], q["nama"]), reverse=True)
    poli = {}
    for p in P.values():
        for i in p["_poli"]:
            poli.setdefault(fitur[i]["properties"].get("id") or str(i), p["nama"])
    khg, khg_tak = cocok_khg()
    walhi = {p["nama"] for p in json.load(open(W.KELUAR))["perusahaan"]} if os.path.exists(W.KELUAR) else set()
    for q in daf:  # nama persis (kunci "INHUTANI" menyamakan semua unit)
        q["walhi"] = q["nama"] in walhi
    out = {"dibuat": __import__("datetime").date.today().isoformat(), "sumber": SUMBER,
           "periode": {"laporan": "8 Agu - 1 Okt 2026", "cek": "8 Agu - 1 Okt 2026 (hari WIB), VIIRS S-NPP, titik panas (bukan titik sumber asap)"},
           "ringkasan": RINGKASAN, "ppkh_kemhan": PPKH_KEMHAN, "tebu_jumlah": dict(zip(("agu", "sep", "okt", "total"), TEBU_JUMLAH)),
           "riwayat": RIWAYAT, "khg": khg, "khg_tak_cocok": khg_tak, "perusahaan": daf, "poligon": poli}
    with open(KELUAR, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    tak = [q["nama"] for q in daf if not q["cek"]["poligon"]]
    print(f"aktor_greenpeace.json: {len(daf)} perusahaan, {len(daf) - len(tak)} cocok poligon, {len(poli)} poligon; KHG tak cocok {khg_tak}", file=sys.stderr)
    print("tanpa poligon:", tak, file=sys.stderr)
    print("juga di WALHI:", [q["nama"] for q in daf if q["walhi"]], file=sys.stderr)


def uji():
    d = json.load(open(KELUAR))
    assert len(SAWIT) == len(PBPH) == 20
    assert sum(t[4] for t in TEBU) == TEBU_JUMLAH[3] == 148 and sum(t[1] for t in TEBU) == TEBU_JUMLAH[0] == 92 and sum(t[2] for t in TEBU) == 56
    assert all(t[1] + t[2] == t[4] for t in TEBU)
    nama = [p["nama"] for p in d["perusahaan"]]
    assert len(nama) == len(set(nama)), "nama ganda"
    jml = lambda j: sum(1 for p in d["perusahaan"] if "Sawit #" in " ".join(p["tabel"]) and j == "sawit" or "PBPH #" in " ".join(p["tabel"]) and j == "pbph")
    assert jml("sawit") == 20 and jml("pbph") == 20 and sum(1 for p in d["perusahaan"] if p["jenis"] == "tebu") == 6
    assert len(d["khg"]) == 10 and not d["khg_tak_cocok"], d["khg_tak_cocok"]
    assert all(k["id"] and k["prov"] for k in d["khg"])
    assert d["ringkasan"]["titik_total"] == 6811 and sum(d["ringkasan"]["pulau"].values()) == 6811
    for p in d["perusahaan"]:
        assert p["tabel"] and (p["asap_titik"] is not None or p["kaitan"]), p["nama"]
    print("ok", len(nama), "perusahaan;", sum(1 for p in d["perusahaan"] if p["cek"]["poligon"]), "cocok peta")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        W.PERIODE = PERIODE
        fitur = json.load(open(W.KONSESI))["features"]
        P = gabung()
        baru = W.cek_silang(P, fitur)
        tulis(P, fitur, baru)
