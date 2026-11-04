"""Titik panas di konsesi per grup, dipetakan ke emiten tercatat: bahan analisa INTERNAL staf (halaman /bnpb/saham).

Keputusan pemilik 4 Nov 2026: hanya halaman staf, TIDAK publik (sejalan 14 Okt: situs publik tanpa nama perusahaan/grup).
Maka keluaran = data/bnpb/saham_konsesi.js, BUKAN public/. Titik panas di areal konsesi bukan bukti pelanggaran atau penyebab kebakaran.

Pakai ulang konsesi_laporan.py (jangan tulis ulang): titik() = VIIRS S-NPP nominal/tinggi (arsip lokal + FIRMS NRT; hari = kalender WIB),
Indeks/kunci dari aktor_walhi.py (titik-dalam-poligon per poligon konsesi.geojson). Titik di blok tumpang tindih dihitung sekali per grup,
sama dengan dedup konsesi_laporan. Jenis dihitung: sawit + hti (emiten yang dikaitkan memegang perkebunan/HTI); hph & tambang tidak.
Grup per poligon = grup_perusahaan.json (nama persis) lalu kolom `grup` di konsesi.geojson (urutan sama dengan konsesi_laporan: peta), nama grup
disatukan lewat ALIAS. Cakupan grup terbatas pada data GFW 2019/Trase/kurasi: perusahaan tanpa grup tidak terhitung ke grup mana pun.

Arsip VIIRS (data/raw/sebaran/viirs_veg_panjang.pkl) hanya ada di mesin lokal, jadi skrip ini dijalankan manual lalu keluarannya di-commit
(env SAHAM_VIIRS menimpa jalurnya; FIRMS_MAP_KEY untuk menyambung NRT).

Pakai:  python3 -I scripts/data/saham_konsesi.py        # -> data/bnpb/saham_konsesi.js
        python3 -I scripts/data/saham_konsesi.py uji    # self-check
"""
import datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import konsesi_laporan as K  # noqa: E402
from aktor_walhi import Indeks  # noqa: E402

AKAR = K.AKAR
KELUAR = os.path.join(AKAR, "data/bnpb/saham_konsesi.js")   # modul ESM: diimpor src/saham.js tanpa aturan modul JSON di Miniflare
GRUP = os.path.join(AKAR, "data/raw/konsesi/grup_perusahaan.json")
JENIS = ("sawit", "hti")
WIB = K.WIB
DARI = dt.date(2026, 1, 1)
CATATAN = "Titik panas di areal konsesi bukan bukti pelanggaran atau penyebab kebakaran."

# Satukan nama grup yang sama di sumber berbeda (GFW/Trase/kurasi memakai ejaan beda).
ALIAS = {"RGE Group": "Royal Golden Eagle", "Medco Group": "Medco", "Genting Group": "Genting", "Makin Group": "Makin",
         "PT Perkebunan Nusantara III Persero": "Perkebunan Nusantara"}

# Poligon yang dipisah dari grupnya karena pemegangnya bukan emiten grup itu (nama poligon -> grup tersendiri, jatuh ke grup_tanpa_emiten).
PISAH = {"PT Hutan Ketapang Industri": "Sampoerna (HTI Hutan Ketapang)"}

# KURASI TANGAN. Hanya emiten yang memegang/menginduki konsesi perkebunan atau HTI itu langsung; tak yakin = tidak dimasukkan.
# (kode, nama, bursa, grup (nama setelah ALIAS/PISAH), dasar). Satu grup boleh banyak emiten: deret grup yang sama, tulis di dasar.
SMAS = "Deret = SELURUH grup Sinar Mas di data (sawit + HTI), dibagi dengan SMAR, INKP, TKIM, E5H. "
EMITEN = [
    ("SMAR", "PT Sinar Mas Agro Resources and Technology Tbk", "IDX", "Sinar Mas",
     SMAS + "SMAR = arm sawit/CPO grup di IDX (anak Golden Agri-Resources). Sumber: laporan tahunan SMAR; group_comp GFW 2019 dan Trase v3 menamai grup Sinar Mas."),
    ("E5H", "Golden Agri-Resources Ltd", "SGX", "Sinar Mas",
     SMAS + "GAR = induk SMAR dan pemegang perkebunan sawit grup, tercatat SGX (bukan IDX). Sumber: laporan tahunan GAR."),
    ("INKP", "PT Indah Kiat Pulp & Paper Tbk", "IDX", "Sinar Mas",
     SMAS + "INKP = pabrik pulp APP yang dipasok HTI grup (pemasok bermitra, bukan semuanya milik INKP langsung). Sumber: laporan tahunan INKP; Trase v3 HTI bergrup Sinar Mas."),
    ("TKIM", "PT Pabrik Kertas Tjiwi Kimia Tbk", "IDX", "Sinar Mas",
     SMAS + "TKIM = pabrik kertas APP, bahan baku pulp APP/INKP; bukan pemegang HTI langsung. Disertakan sebagai rantai pulp APP, bukan pemegang konsesi. Sumber: laporan tahunan TKIM."),
    ("AALI", "PT Astra Agro Lestari Tbk", "IDX", "Astra International",
     "Arm perkebunan sawit grup Astra; poligon grup ini bernama anak AALI (mis. Borneo Indah Marjaya, Nirmala Agro Lestari, Persada Bina Nusantara Abadi: catatan 'Astra Agro Lestari' di data GFW). Sumber: laporan tahunan AALI."),
    ("SGRO", "PT Prime Agri Resources Tbk (dahulu PT Sampoerna Agro Tbk)", "IDX", "Sampoerna Agro",
     "Pemegang langsung PT Sampoerna Agro (sawit, Kalbar). HTI PT Hutan Ketapang Industri (Greenpeace 2026) dipisah dari deret karena bukan milik SGRO. Sumber: laporan tahunan SGRO; konsesi sawit GFW."),
    ("ANJT", "PT Austindo Nusantara Jaya Tbk", "IDX", "PT Austindo Nusantara Jaya (ANJA)",
     "Pemegang perkebunan sawit PT Kayung Agro Lestari (Kalbar), anak ANJ Agri; grup di kurasi: 'PT Austindo Nusantara Jaya (ANJA)'. Sumber: laporan tahunan ANJT; group_comp GFW."),
    ("LSIP", "PT PP London Sumatra Indonesia Tbk", "IDX", "London Sumatra",
     "Pemegang langsung perkebunan (Lonsum, anak IndoAgri/Salim). Sumber: laporan tahunan LSIP; group_comp GFW ('PT PP London Sumatra Indonesia Tbk (Salim Group)')."),
    ("SIMP", "PT Salim Ivomas Pratama Tbk", "IDX", "SIMP",
     "Pemegang langsung perkebunan sawit IndoAgri; grup 'SIMP' di data = PT Citra Nusa Inti Sawit. Hanya grup 'SIMP', bukan grup 'Salim Group' (isi campur, tak seluruhnya dipastikan milik SIMP). Sumber: laporan tahunan SIMP."),
    ("TAPG", "PT Triputra Agro Persada Tbk", "IDX", "Djarum Group",
     "Pemegang konsesi bernama PT Triputra Agro Persada (induk TAPG). Label grup 'Djarum Group' berasal dari data GFW, tetapi emiten yang dikaitkan HANYA TAPG, bukan emiten Djarum lain (BBCA dilarang). Sumber: prospektus/laporan tahunan TAPG."),
    ("F34", "Wilmar International Ltd", "SGX", "Wilmar",
     "Induk grup Wilmar, tercatat di SGX (bukan IDX); memegang perkebunan sawit Indonesia lewat anak. Sumber: SGX, laporan tahunan Wilmar; RSPO 2020."),
    ("SDG", "SD Guthrie Berhad (dahulu Sime Darby Plantation)", "Bursa Malaysia", "Sime Darby",
     "Induk perkebunan sawit grup Sime Darby, tercatat di Bursa Malaysia (bukan IDX). Sumber: laporan tahunan SD Guthrie; RSPO 2020."),
    ("GENP", "Genting Plantations Berhad", "Bursa Malaysia", "Genting",
     "Pemegang langsung konsesi sawit Indonesia lewat anak (PT Sepanjang Inti Surya Utama, PT Sawit Sehat, dll.: catatan 'Genting Plantations' di data GFW); Bursa Malaysia (bukan IDX). Sumber: laporan tahunan Genting Plantations."),
    ("KLK", "Kuala Lumpur Kepong Berhad", "Bursa Malaysia", "KLK",
     "Grup 'KLK' di data = PT Sekar Bumi Alam Lestari (sawit Kalbar), anak KLK Indonesia; Bursa Malaysia (bukan IDX). Sumber: laporan tahunan KLK; group_comp GFW."),
    ("MPE", "M.P. Evans Group PLC", "LSE AIM", "MP Evans Group PLC (MPE)",
     "Grup 'MP Evans Group PLC (MPE)' di data GFW untuk anak sawit di Kalbar; induk tercatat London AIM (bukan IDX). Sumber: laporan tahunan MP Evans; group_comp GFW."),
    ("8002", "Marubeni Corporation", "TSE", "Marubeni",
     "Grup 'Marubeni' di data = PT Musi Hutan Persada (HTI pulp Sumsel, Trase v3), anak Marubeni; induk tercatat Tokyo (bukan IDX). Sumber: Trase v3; laporan tahunan Marubeni."),
]
# Alasan tertulis untuk grup besar yang SENGAJA tak dikaitkan. Grup berpoligon dan bertitik lain yang tak ada di sini tetap dicatat dengan alasan baku ALASAN_BAKU.
ALASAN_BAKU = "Tidak ada emiten tercatat yang dapat dikaitkan langsung ke pemegang konsesinya (grup tertutup atau kaitan tak terkonfirmasi)."
TANPA_EMITEN = {
    "Royal Golden Eagle": "RGE (APRIL, Asian Agri, Apical) tertutup; tidak ada induk tercatat di IDX yang menginduki konsesinya.",
    "Musim Mas": "Perusahaan keluarga tertutup, tidak tercatat di bursa.",
    "Perkebunan Nusantara": "PTPN = BUMN; Holding PTPN III (Persero) tidak tercatat di bursa (hanya obligasi).",
    "Government": "Inhutani (BUMN kehutanan), tidak tercatat di bursa.",
    "Medco": "MEDC tidak menginduki konsesi ini: poligon (PT Mata Epsi Agro, PT Selaras Inti Semesta) dipegang lewat Medco Agro di induk non-tercatat. Tak yakin: tidak dimasukkan.",
    "Salim Group": "Isi grup campur (sebagian anak IndoAgri/SIMP, sebagian tidak dipastikan); SIMP dan LSIP sudah dipetakan lewat grup terpisah 'SIMP' dan 'London Sumatra'.",
    "Bakrie Group": "UNSP: status tercatat dan kepemilikan konsesi (PT Bakri Sumatera Plantation, PT Patriot Andalas) belum terkonfirmasi. Tak yakin: tidak dimasukkan.",
    "Djarum": "Konglomerat; PT Fajar Surya Swadaya (HTI) tak punya emiten pemegang. BBCA bukan pemegang konsesi dan tidak boleh dikaitkan.",
    "Sungai Budi Group": "Kaitan PT Bumi Perkasa ke TBLA belum terkonfirmasi. Tak yakin: tidak dimasukkan.",
    "Tiga Pilar Sejahtera Food": "Kaitan PT Bumi Raya Investindo ke AISA belum terkonfirmasi. Tak yakin: tidak dimasukkan.",
    "Cargill": "Perusahaan tertutup AS, tidak tercatat.",
    "Sumitomo": "Entitas Sumitomo pemegang HTI tidak dipastikan (Sumitomo Corp atau Sumitomo Forestry). Tak yakin: tidak dimasukkan.",
    "Sampoerna (HTI Hutan Ketapang)": "HTI PT Hutan Ketapang Industri: bukan milik SGRO (Sampoerna Agro); dipisah dari deret SGRO.",
    "Barito Pacific": "GFW 2019 menamai grup ini untuk PT Wahana Guna Marga Pratama, Agro Pratama Subur Lestari, Gandaerah Hendana; kepemilikan terkini oleh BRPT belum terverifikasi. Tak yakin: tidak dimasukkan.",
    "Jcorp": "Johor Corp = BUMD Johor tertutup; induk bukan emiten.",
}
# Hubungan emiten ke konsesi: langsung (memegang lewat anak), induk (induk tercatat di luar IDX), rantai_pasok (dipasok konsesi grup, bukan pemegang).
HUBUNGAN = {"INKP": "rantai_pasok", "TKIM": "rantai_pasok", "E5H": "induk", "F34": "induk", "SDG": "induk", "GENP": "induk", "KLK": "induk", "MPE": "induk", "8002": "induk"}
# Nama grup tampil bila label sumber menyesatkan (kunci = nama grup data).
GRUP_TAMPIL = {"Djarum Group": "Triputra (label sumber GFW: Djarum Group)"}
# Daftar yang DILARANG (diuji): emiten satu konglomerat yang bukan pemegang konsesi.
DILARANG = {"BBCA"}


def minggu(d):
    """Senin ISO dari tanggal WIB."""
    return d - dt.timedelta(days=d.weekday())


def peta_grup(fitur, gp):
    """indeks fitur -> grup (tersatukan), hanya jenis JENIS."""
    r = {}
    for i, f in enumerate(fitur):
        p = f["properties"]
        if p["jenis"] not in JENIS:
            continue
        g = (gp.get(p["nama"]) or {}).get("grup") or p.get("grup")
        if g:
            r[i] = PISAH.get(p["nama"]) or ALIAS.get(g, g)
    return r


def hitung(fitur, grup_idx, T, akhir_hari):
    """-> {grup: {konsesi:{jumlah,luas_ha}, titik:{total,d7,d30}, hari:{iso:n}}}. T = [(waktu UTC, lat, lon, frp)]."""
    per = {}  # grup -> {(w,la,lo)}
    ix = Indeks([f for f in fitur])
    for w, la, lo, _ in T:
        if (w + WIB).date() < DARI:
            continue
        for i in ix.cari(lo, la):
            if i in grup_idx:
                per.setdefault(grup_idx[i], set()).add((w, la, lo))
    out = {}
    for g in set(grup_idx.values()):
        idx = [i for i, x in grup_idx.items() if x == g]
        nm = {K.kunci(fitur[i]["properties"]["nama"]) or fitur[i]["properties"]["id"] for i in idx}
        hr = {}
        for w, *_ in per.get(g, ()):
            d = (w + WIB).date().isoformat()
            hr[d] = hr.get(d, 0) + 1
        out[g] = {"konsesi": {"jumlah": len(nm), "luas_ha": round(sum(fitur[i]["properties"].get("luas_peta_ha") or 0 for i in idx))},
                  "titik": ringkas(hr, akhir_hari), "hari": hr}
    return out


def ringkas(hr, akhir):
    """hr = {iso: n}, akhir = date -> total, 7 hari, 30 hari terakhir (termasuk hari akhir)."""
    s = lambda n: sum(c for d, c in hr.items() if (akhir - dt.date.fromisoformat(d)).days < n)
    return {"total": sum(hr.values()), "d7": s(7), "d30": s(30)}


def deret(hr, akhir):
    """Mingguan lengkap dari minggu 1 Jan 2026 s.d. minggu `akhir`, tanpa lubang."""
    m, a, o = minggu(DARI), minggu(akhir), []
    k = {}
    for d, c in hr.items():
        k[minggu(dt.date.fromisoformat(d))] = k.get(minggu(dt.date.fromisoformat(d)), 0) + c
    while m <= a:
        o.append({"minggu": m.isoformat(), "titik": k.get(m, 0)})
        m += dt.timedelta(days=7)
    return o


def susun(h, akhir):
    em = []
    for kode, nama, bursa, g, dasar in EMITEN:
        x = h.get(g)
        if not x:
            continue  # grup tak terpetakan di data konsesi: tidak diklaim
        em.append({"kode": kode, "nama": nama, "bursa": bursa, "grup": GRUP_TAMPIL.get(g, g), "hubungan": HUBUNGAN.get(kode, "langsung"), "dasar": dasar, "konsesi": x["konsesi"],
                   "titik": x["titik"], "mingguan": deret(x["hari"], akhir)})
    pakai = {e[3] for e in EMITEN}
    tanpa = [{"grup": g, "alasan": TANPA_EMITEN.get(g, ALASAN_BAKU), "titik": x["titik"]} for g, x in h.items() if g not in pakai and x["titik"]["total"] > 0]
    return em, sorted(tanpa, key=lambda t: -t["titik"]["total"])


def bangun():
    fitur = json.load(open(os.path.join(K.LAHAN, "konsesi.geojson")))["features"]
    gp = json.load(open(GRUP))["perusahaan"]
    if os.environ.get("SAHAM_VIIRS"):
        K.VIIRS = os.environ["SAHAM_VIIRS"]
    T, akhir_w = K.titik()
    akhir = (akhir_w + WIB).date()
    h = hitung(fitur, peta_grup(fitur, gp), T, akhir)
    em, tanpa = susun(h, akhir)
    d = {"dibuat": dt.date.today().isoformat(), "periode": {"dari": DARI.isoformat(), "sampai": akhir.isoformat()},
         "sumber": ["NASA FIRMS VIIRS S-NPP 375 m, keyakinan nominal/tinggi, hari kalender WIB (via konsesi_laporan.titik)",
                    "Poligon konsesi sawit (Kemenhut via GFW v20191031) dan HTI (Trase v3 2026), public/data/lahan/konsesi.geojson",
                    "Grup perusahaan: GFW group_comp 2019, Trase, kurasi tangan (data/raw/konsesi/grup_perusahaan.json)",
                    "Pemetaan grup ke emiten: kurasi tangan, dasar per baris"],
         "catatan": CATATAN + " Hanya jenis sawit dan HTI; minggu mulai Senin WIB (minggu pertama dan terakhir bisa parsial).",
         "emiten": em, "grup_tanpa_emiten": tanpa}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    open(KELUAR, "w").write("export default " + json.dumps(d, ensure_ascii=False, indent=1) + ";\n")
    uji_berkas(d)
    for e in em:
        print(e["kode"], e["bursa"], e["grup"], e["titik"], e["konsesi"], file=sys.stderr)
    for t in tanpa:
        print("tanpa", t["grup"], t["titik"], file=sys.stderr)
    print("ditulis", KELUAR, "s.d.", akhir, file=sys.stderr)
    return h


def baca_keluaran():
    t = open(KELUAR).read().strip()
    return json.loads(t.removeprefix("export default ").removesuffix(";"))


def uji_berkas(d):
    assert d["catatan"].startswith(CATATAN) and not (set(e["kode"] for e in d["emiten"]) & DILARANG)
    akhir = dt.date.fromisoformat(d["periode"]["sampai"])
    assert len({e["kode"] for e in d["emiten"]}) == len(d["emiten"])
    for e in d["emiten"]:
        ws = [m["minggu"] for m in e["mingguan"]]
        assert ws == [x["minggu"] for x in deret({}, akhir)], f"{e['kode']}: minggu bolong/tak lengkap"
        assert all(dt.date.fromisoformat(w).weekday() == 0 for w in ws)
        assert sum(m["titik"] for m in e["mingguan"]) == e["titik"]["total"], f"{e['kode']}: jumlah mingguan != total"
        assert e["titik"]["d7"] <= e["titik"]["d30"] <= e["titik"]["total"]
        assert e["dasar"] and e["bursa"] and e["konsesi"]["jumlah"] > 0
    for t in d["grup_tanpa_emiten"]:
        assert t["alasan"] and t["titik"]["total"] >= 0
    assert not os.path.abspath(KELUAR).startswith(os.path.join(os.path.abspath(AKAR), "public")), "keluaran internal dilarang di public/"


def uji():
    D = dt.date
    assert minggu(D(2026, 1, 1)) == D(2025, 12, 29) and minggu(D(2026, 1, 5)) == D(2026, 1, 5) and minggu(D(2026, 1, 11)) == D(2026, 1, 5)
    # dedup + d7/d30 + minggu kosong = 0, pada poligon sintetis
    kot = lambda x0, x1: {"type": "Polygon", "coordinates": [[[x0, 0], [x1, 0], [x1, 1], [x0, 1], [x0, 0]]]}
    fit = [{"properties": {"id": "a", "nama": "PT A", "jenis": "sawit", "luas_peta_ha": 100}, "geometry": kot(0, 1)},
           {"properties": {"id": "b", "nama": "PT A", "jenis": "hti", "luas_peta_ha": 50}, "geometry": kot(0.5, 1.5)},   # tumpang tindih a
           {"properties": {"id": "c", "nama": "PT C", "jenis": "tambang", "luas_peta_ha": 9}, "geometry": kot(0, 1)},      # jenis dikecualikan
           {"properties": {"id": "d", "nama": "PT D", "jenis": "sawit", "luas_peta_ha": 7}, "geometry": kot(5, 6)}]
    gi = peta_grup(fit, {"PT A": {"grup": "RGE Group"}, "PT D": {"grup": None}})
    assert gi == {0: "Royal Golden Eagle", 1: "Royal Golden Eagle"}, gi
    u = lambda tgl, x: (dt.datetime.fromisoformat(tgl + "T00:00:00+00:00"), 0.5, x, 1.0)
    T = [u("2026-01-02", 0.7), u("2026-01-02", 0.7), u("2026-10-01", 0.7), u("2026-10-28", 0.7), u("2026-10-30", 0.2), u("2026-10-30", 5.5), u("2025-12-31", 0.7)]
    h = hitung(fit, gi, T, D(2026, 11, 1))
    g = h["Royal Golden Eagle"]
    # (a,b) tumpang tindih di 0.7 -> sekali; titik 2 Jan duplikat murni (set) -> sekali; 31 Des 2025 di luar periode; 5.5 bukan grup; tambang tak dihitung
    assert g["titik"] == {"total": 4, "d7": 2, "d30": 2}, g["titik"]
    assert g["konsesi"] == {"jumlah": 1, "luas_ha": 150}, g["konsesi"]
    w = deret(g["hari"], D(2026, 11, 1))
    assert w[0] == {"minggu": "2025-12-29", "titik": 1} and w[-1]["minggu"] == "2026-10-26" and w[-1]["titik"] == 2 and len(w) == 44, (w[0], w[-1], len(w))
    assert sum(x["titik"] for x in w) == 4 and sum(1 for x in w if x["titik"] == 0) == 41
    # emiten tak dikaitkan bila grupnya tak ada di data; grup tanpa emiten disertai alasan; urutan kunci kontrak
    em, tanpa = susun({"Sinar Mas": {"konsesi": {"jumlah": 1, "luas_ha": 1}, "titik": {"total": 0, "d7": 0, "d30": 0}, "hari": {}}, "Musim Mas": {"titik": {"total": 3, "d7": 0, "d30": 0}}}, D(2026, 11, 1))
    assert {e["kode"] for e in em} == {"SMAR", "E5H", "INKP", "TKIM"} and [t["grup"] for t in tanpa] == ["Musim Mas"] and tanpa[0]["alasan"]
    assert set(em[0]) == {"kode", "nama", "bursa", "grup", "hubungan", "dasar", "konsesi", "titik", "mingguan"}
    # kurasi: bursa luar IDX bertanda, tak ada BBCA, grup emiten tidak ganda dengan grup tanpa emiten
    assert {e[0] for e in EMITEN if e[2] != "IDX"} == {"E5H", "F34", "SDG", "GENP", "KLK", "MPE", "8002"} and not ({e[0] for e in EMITEN} & DILARANG)
    assert not ({e[3] for e in EMITEN} & set(TANPA_EMITEN)) and PISAH["PT Hutan Ketapang Industri"] in TANPA_EMITEN and all(len(e) == 5 and e[4] for e in EMITEN)
    if os.path.exists(KELUAR):
        uji_berkas(baca_keluaran())
    print("ok saham_konsesi")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else (bangun() if not sys.argv[1:] else sys.exit(__doc__))
