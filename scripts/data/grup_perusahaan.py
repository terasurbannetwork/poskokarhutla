"""Profil grup korporasi tiap pemegang konsesi -> data/raw/konsesi/grup_perusahaan.json (analisis internal; TIDAK diterbitkan
di situs sejak keputusan pemilik 14 Okt 2026: situs hanya menampilkan status lahan, tanpa nama perusahaan/grup).

Pakai:  python3 -I scripts/data/grup_perusahaan.py        # unduh (cache scripts/data/.cache/) lalu tulis JSON
        python3 -I scripts/data/grup_perusahaan.py uji    # uji kunci pencocokan

Sumber massal (tanpa scraping Google):
  gfw   Global Forest Watch, Indonesia oil palm concessions v20191031 (kolom group_comp; 'No group' = tak ada grup tercatat)
  trase Trase, Indonesia wood pulp concessions v3 (kolom wood_supplier_corporate_group)
  kurasi  daftar tangan kecil: negara induk grup besar + catatan (fakta umum, diisi hanya bila yakin)
Tak cocok = null, bukan tebakan.
"""
import datetime as dt, json, os, re, struct, sys, urllib.request, zipfile, io

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
CACHE = os.path.join(AKAR, "scripts/data/.cache")
KONSESI = os.path.join(AKAR, "data/raw/konsesi/konsesi_lengkap.geojson")  # bernama, dari scripts/scrape/konsesi.py
KELUAR = os.path.join(AKAR, "data/raw/konsesi/grup_perusahaan.json")
GFW = "https://data-api.globalforestwatch.org/dataset/gfw_oil_palm/v20191031/download/shp?x-api-key=2d60cd88-8348-4c0f-a6d5-bd9adb585a8c"
TRASE = "https://resources.trase.earth/data/facilities-data/indonesia_wood_pulp_concessions_2020_2022_v2026_02_20.geo.json"
SUMBER = [
    "Global Forest Watch / Kemenhut, Indonesia oil palm concessions v20191031 (kolom group_comp) https://data.globalforestwatch.org/",
    "Trase, Indonesia wood pulp concessions v3 (2026) https://trase.earth/open-data",
    "Kurasi tangan: negara induk & catatan grup besar (informasi publik situs/laporan tahunan grup)",
]
SEKTOR = {"sawit": "kelapa sawit", "hti": "HTI/pulp", "hph": "HPH (hutan alam)", "tambang": "pertambangan"}
# nama grup (huruf besar, tanpa spasi/tanda) -> (nama rapi, negara induk, catatan)
KURASI = {
    "SINARMAS": ("Sinar Mas", "Indonesia", "Grup Sinar Mas (Asia Pulp & Paper, Golden Agri-Resources)."),
    "WILMAR": ("Wilmar", "Singapura", "Wilmar International, pedagang & pengolah sawit terbesar dunia, berbasis di Singapura."),
    "ROYALGOLDENEAGLE": ("Royal Golden Eagle", "Indonesia", "RGE (APRIL, Asian Agri); kantor pusat Singapura, pendiri Indonesia."),
    "RGE": ("Royal Golden Eagle", "Indonesia", "RGE (APRIL, Asian Agri); kantor pusat Singapura, pendiri Indonesia."),
    "GENTING": ("Genting Group", "Malaysia", "Genting Plantations, anak usaha Genting Berhad."),
    "SIMEDARBY": ("Sime Darby", "Malaysia", "Sime Darby Plantation (kini SD Guthrie)."),
    "MUSIMMAS": ("Musim Mas", "Indonesia", "Grup sawit terintegrasi berbasis Medan/Singapura."),
    "ASTRAINTERNATIONAL": ("Astra International", "Indonesia", "Astra Agro Lestari, anak usaha Astra."),
    "CARGILL": ("Cargill", "Amerika Serikat", None),
    "JULONG": ("Julong Group", "Tiongkok", "Perkebunan & pengolahan kelapa sawit; induk asal Tiongkok."),
    "LONDONSUMATRA": ("London Sumatra", "Indonesia", "PT PP London Sumatra Indonesia Tbk (Salim Group)."),
    "PERKEBUNANNUSANTARA": ("Perkebunan Nusantara", "Indonesia", "BUMN perkebunan (PTPN)."),
    "BARITOPACIFIC": ("Barito Pacific", "Indonesia", None),
    "MARUBENI": ("Marubeni", "Jepang", None),
    "DJARUM": ("Djarum", "Indonesia", None),
}

# perusahaan -> grup, untuk yang GFW tandai 'No group'. Tambah di sini hanya dengan sumber yang bisa dirujuk.
KURASI_PT = {"GRAHAINTIJAYA": ("Julong Group", "Perkebunan & pengolahan kelapa sawit di Kalimantan Tengah (Kapuas); induk asal Tiongkok.")}


def kunci(nama):
    """'PT. MERTJU BUANA 1' / 'Mertju Buana, PT' -> 'MERTJUBUANA' (sama dengan scripts/scrape/konsesi.py)."""
    n = re.sub(r"\(.*?\)|\bD\.?\s?H\.?\b.*", " ", (nama or "").upper())
    n = re.sub(r"[^A-Z0-9& ]", " ", n)
    n = re.sub(r"\b(PT|TBK|CV|PERSERO|KOPERASI|KOP|COY|CO|LTD|INC)\b", " ", n)
    n = re.sub(r"\bTBR\b", "TIMBER", n).replace("DJ", "J").replace("TJ", "C").replace("OE", "U")
    n = re.sub(r"(\s+(UNIT|BLOK)\b.*|\s+(\d+|I{1,3}|IV|V|VI{1,3}))+$", "", " ".join(n.split()))
    return n.replace(" ", "")


def kg(grup):
    return re.sub(r"[^A-Z0-9]", "", re.sub(r"\b(GROUP|GRUP)\b", "", grup.upper()))


def ambil(url, nama):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, nama)
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        req = urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0"})
        with urllib.request.urlopen(req, timeout=300) as r, open(p, "wb") as f:
            f.write(r.read())
    return p


def baca_dbf(b):
    n, h, l = struct.unpack("<IHH", b[4:12])
    kol, i = [], 32
    while b[i] != 13:
        kol.append((b[i:i + 11].strip(b"\0").decode(), b[i + 16]))
        i += 32
    for r in range(n):
        o, d = h + r * l + 1, {}
        for k, w in kol:
            d[k] = b[o:o + w].decode("utf8", "replace").strip()
            o += w
        yield d


def muat_gfw():
    z = zipfile.ZipFile(ambil(GFW, "gfw_oil_palm.zip"))
    dbf = z.read(next(n for n in z.namelist() if n.endswith(".dbf")))
    out = {}
    for r in baca_dbf(dbf):
        if r["country"] != "IDN":
            continue
        g = r["group_comp"]
        for nm in (r["company"], r["name"]):
            if nm and g:
                out.setdefault(kunci(nm), g)
    return out


def muat_trase():
    d = json.load(open(ambil(TRASE, "trase_pulp.geo.json")))
    return {kunci(f["properties"]["wood_supplier"]): f["properties"]["wood_supplier_corporate_group"] or ""
            for f in d["features"]}


def rapi(g):
    return g if not g.isupper() else " ".join(w.capitalize() for w in g.split())


def bangun():
    kon = {"perusahaan": list({f["properties"]["nama"]: f["properties"] for f in json.load(open(KONSESI))["features"]}.values())}
    gfw, trase = muat_gfw(), muat_trase()
    hasil = {}
    for p in kon["perusahaan"]:
        nama, jenis = p["nama"], p["jenis"]
        k = kunci(nama)
        g, sumber = None, None
        for sm, tabel in (("gfw", gfw), ("trase", trase)):
            v = tabel.get(k)
            if v and v.lower() not in ("no group", "none", "unknown"):
                g, sumber = v, sm
                break
        if not g and p.get("grup"):  # grup yang sudah ada di berkas konsesi (Trase)
            g, sumber = p["grup"], "trase"
        if not g and k in KURASI_PT:
            g, sumber = KURASI_PT[k][0], "kurasi"
        kur = KURASI.get(kg(g)) if g else None
        if kur:
            g = kur[0]
        hasil[nama] = {"grup": rapi(g) if g else None, "negara_induk": kur[1] if kur else None,
                       "sektor": SEKTOR.get(jenis), "catatan": kur[2] if kur else (KURASI_PT[k][1] if k in KURASI_PT else None),
                       "sumber": sumber}
    json.dump({"dibuat": dt.date.today().isoformat(), "sumber": SUMBER, "perusahaan": hasil},
              open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    return hasil


def uji():
    assert kunci("PT. MERTJU BUANA 1") == kunci("Mertju Buana, PT")
    assert kg("Duta Palma Group") == "DUTAPALMA"
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        h = bangun()
        print(len(h), "perusahaan,", sum(1 for v in h.values() if v["grup"]), "bergrup")
