#!/usr/bin/env python3
"""Paket `air-jawa`: dataset kajian Grand Design Ketahanan Air Pulau Jawa 2026-2030 per kab/kota (119), provinsi (6), dan
wilayah sungai (24).

Jalankan dari akar repo:
  python3 data/kajian-bnpb/bangun/air_jawa_ocr.py   # sekali: OCR lampiran Permen PUPR 14/2015 -> mentah/permen14_ocr/
  python3 data/kajian-bnpb/bangun/air-jawa.py tarik  # sekali: BPS (Playwright), Wikidata, teks Permen 04/2015 & PU 1/2025 -> mentah/
  python3 data/kajian-bnpb/bangun/air-jawa.py        # bangun luring dari repo + mentah/ + self-check assert (gagal = keluar non-nol)
Python 3 stdlib saja (langkah tarik memanggil curl-setara urllib, pdftotext, dan node untuk halaman BPS).
Silsilah, label, dan keterbatasan: data/kajian-bnpb/data/air-jawa/README.md.

Masukan (repo):
  scripts/udara/kota.json                        kode Kemendagri 4 digit, nama, titik pusat kab berbobot WorldPop
  public/geo/kabupaten/3[1-6].json               batas kab/kota (properti `kab`)
  public/data/penduduk.json                      WorldPop R2025A 2026 per kecamatan
  public/banjir/data/meta.json                   nama provinsi
  public/banjir/data/subsiden_literatur.json     kutipan literatur subsiden per kota
  data/kajian-bnpb/riset/mentah/irbi.ndjson      IRBI BNPB (InaRISK apiv4/data-irbi-full), tarik riset 23 Okt 2026
  data/kajian-bnpb/data/dibi/mentah/dibi_kab_jawa.json   DIBI per kab Jawa per jenis per tahun (paket dibi, tarik 23 Okt 2026)
  data/kajian-bnpb/bangun/air_jawa_rujukan.json  angka yang disalin tangan dari dokumen (rekap Permen 14/2015, WS, BBWS, bendungan, subsiden)
  data/kajian-bnpb/data/air-jawa/mentah/         OCR Permen 14/2015, tabel BPS, Wikidata, teks Permen 04/2015 dan PU 1/2025
Kueri nama kab DIBI dipakai ulang dari scripts/banjir/kejadian.py (kunci_nama).
"""
import csv, difflib, glob, hashlib, json, math, os, re, subprocess, sys, urllib.parse, urllib.request
from collections import Counter, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
P = lambda *a: os.path.join(ROOT, *a)
sys.path.insert(0, P("scripts/banjir"))
from kejadian import kunci_nama   # noqa: E402  pencocok nama kab yang sama dengan pipeline banjir

OUT = P("data/kajian-bnpb/data/air-jawa")
MENTAH = os.path.join(OUT, "mentah")
OCR = os.path.join(MENTAH, "permen14_ocr")
RUJ = P("data/kajian-bnpb/bangun/air_jawa_rujukan.json")
IRBI = P("data/kajian-bnpb/riset/mentah/irbi.ndjson")
DIBI = P("data/kajian-bnpb/data/dibi/mentah/dibi_kab_jawa.json")
JAWA = ["31", "32", "33", "34", "35", "36"]
H5 = ["banjir", "kekeringan", "longsor", "abrasi", "cuaca_ekstrem"]
LAB_R, LAB_T, LAB_E, LAB_A, LAB_S = "resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan", "sekunder"
TANGGAL = "2026-10-23"


# --------------------------------------------------------------------------------------------- umum

def sha1(path):
    return hashlib.sha1(open(path, "rb").read()).hexdigest()


def r2(x):
    return None if x is None else round(x, 2)


def r4(x):
    return None if x is None else round(x, 4)


TABEL = {}


def tulis_csv(nama, kolom, baris):
    for b in baris:
        assert len(b) == len(kolom), (nama, b)
        for v in b:
            assert not (isinstance(v, float) and not math.isfinite(v)), f"NaN/inf di {nama}: {b}"
    with open(os.path.join(OUT, nama), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(kolom)
        w.writerows([["" if v is None else v for v in b] for b in baris])
    TABEL[nama] = {"kolom": kolom, "baris": baris}


def angka_id(s):
    """'95,73' -> 95.73; '1.234' -> 1234; '0,23' -> 0.23 (format Indonesia: titik ribuan, koma desimal)."""
    s = s.strip()
    if s in ("", "...", "–", "-", "NA"):
        return None
    return float(s.replace(".", "").replace(",", "."))


# --------------------------------------------------------------------------------------------- tarik (jaringan)

def ambil(url, data=None, kepala=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "poskokarhutla-kajian-bnpb/1.0 (riset air-jawa)", **(kepala or {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except OSError as e:   # peraturan.go.id kadang gagal jabat tangan TLS dengan urllib; curl lolos
        if data is not None:
            raise
        print(f"  urllib gagal ({e}); pakai curl", file=sys.stderr)
        return subprocess.run(["curl", "-sSL", "-m", "180", "-A", "Mozilla/5.0", url], capture_output=True, check=True).stdout


SPARQL = [
    """SELECT ?item ?label ?coord ?typeLabel ?admLabel WHERE {
  VALUES ?type { wd:Q12323 wd:Q131681 wd:Q3215290 }
  ?item wdt:P31 ?type ; wdt:P17 wd:Q252 ; wdt:P625 ?coord .
  ?item rdfs:label ?label FILTER(LANG(?label) IN ("id","en"))
  OPTIONAL { ?item wdt:P131 ?adm }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "id,en". } }""",
    """SELECT DISTINCT ?item ?label ?coord WHERE {
  VALUES ?nm { "Bendungan Jatigede"@id "Bendungan Karian"@id "Bendungan Pidekso"@id "Waduk Jatigede"@id "Waduk Saguling"@id
               "Waduk Logung"@id "Waduk Nglangon"@id "Bendungan Semantok"@id "Bendungan Jlantah"@id "Bendungan Ciawi"@id
               "Bendungan Sukamahi"@id "Waduk Gembong"@id "Waduk Klego"@id "Waduk Panohan"@id }
  ?item rdfs:label ?nm . BIND(STR(?nm) AS ?label) ?item wdt:P625 ?coord . }""",
]
BPS_URL = {
    "air_minum_layak_prov_2025": "https://www.bps.go.id/id/statistics-table/2/ODQ1IzI=/persentase-rumah-tangga-menurut-provinsi-dan-sumber-air-minum-layak--persen-.html",
    "air_minum_layak_kab_jateng_2025": "https://jateng.bps.go.id/id/statistics-table/2/MjQ4MCMy/persentase-rumah-tangga-yang-memiliki-akses-terhadap-air-minum-layak-menurut-kabupaten-kota-di-provinsi-jawa-tengah.html",
    "sumber_air_minum_prov_2023": "https://www.bps.go.id/id/statistics-table/3/YzBaMlduSlFVbTVrUnpWeU9YRTJka0pVTTFkU1FUMDkjMw==/distribusi-persentase-rumah-tangga-menurut-provinsi-dan-sumber-air-minum--2020.html?year=2023",
    "penduduk_nasional_2026": "https://www.bps.go.id/id/statistics-table/2/MTk3NSMy/jumlah-penduduk-menurut-provinsi.html",
}
PDF_URL = {"permen04_2015": "https://peraturan.go.id/files/bn429-2015.pdf",
           "permen_pu1_2025_bbws": "https://peraturan.bpk.go.id/Download/377958/2025pmpu1.pdf"}


def tarik():
    os.makedirs(MENTAH, exist_ok=True)
    gab = {"ditarik": TANGGAL, "sumber": "https://query.wikidata.org/sparql", "kueri": SPARQL, "bindings": []}
    for q in SPARQL:
        r = json.loads(ambil("https://query.wikidata.org/sparql", urllib.parse.urlencode({"query": q}).encode(), {"Accept": "application/sparql-results+json"}))
        gab["bindings"] += r["results"]["bindings"]
    json.dump(gab, open(os.path.join(MENTAH, "wikidata_bendungan.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"  wikidata: {len(gab['bindings'])} baris", file=sys.stderr)
    for nama, url in PDF_URL.items():
        pdf = os.path.join(MENTAH, f".{nama}.pdf")
        open(pdf, "wb").write(ambil(url))
        txt = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
        with open(os.path.join(MENTAH, f"{nama}.txt"), "w", encoding="utf-8") as f:
            f.write(f"#url {url}\n#ditarik {TANGGAL}\n#sha1_pdf {sha1(pdf)}\n" + txt)
        os.remove(pdf)
        print(f"  {nama}: {len(txt)} karakter", file=sys.stderr)
    subprocess.run(["node", P("data/kajian-bnpb/bangun/air_jawa_bps.mjs"), os.path.join(MENTAH, "bps")] +
                   [f"{k}={v}" for k, v in BPS_URL.items()], check=True)


# --------------------------------------------------------------------------------------------- wilayah

def titik_dalam(lon, lat, geom):
    """Ray casting; Polygon/MultiPolygon GeoJSON dengan lubang."""
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for poly in polys:
        dalam = False
        for i, cincin in enumerate(poly):
            c = False
            for (x1, y1), (x2, y2) in zip(cincin, cincin[1:] + cincin[:1]):
                if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                    c = not c
            if i == 0:
                dalam = c
            elif c:
                dalam = False
        if dalam:
            return True
    return False


def wilayah():
    kota = json.load(open(P("scripts/udara/kota.json"), encoding="utf-8"))
    ki = {c: i for i, c in enumerate(kota["kolom"])}
    geo = {}
    for p in JAWA:
        for ft in json.load(open(P(f"public/geo/kabupaten/{p}.json"), encoding="utf-8"))["features"]:
            geo[(p, ft["properties"]["kab"])] = ft["geometry"]
    prov_nama = json.load(open(P("public/banjir/data/meta.json"), encoding="utf-8"))["provinsi"]
    W = {}
    for b in kota["baris"]:
        p = b[ki["prov"]]
        if p not in JAWA:
            continue
        assert (p, b[ki["kab"]]) in geo, f"{b[ki['kab']]} tidak ada di public/geo/kabupaten/{p}.json"
        W[b[ki["kode"]]] = {"kode": b[ki["kode"]], "nama": b[ki["kab"]], "nama_kepmendagri": b[ki["nama"]].strip(), "prov": p,
                            "prov_nama": prov_nama[p], "lat": b[ki["lat"]], "lon": b[ki["lon"]], "geom": geo[(p, b[ki["kab"]])]}
    assert len(W) == 119 and len(geo) == 119, f"kab/kota Jawa {len(W)}, harus 119"
    dari_nama = {(w["prov"], w["nama"]): k for k, w in W.items()}
    pend = json.load(open(P("public/data/penduduk.json"), encoding="utf-8"))
    pop = Counter()
    for key, v in pend["kec"].items():
        pv, kab = key.split("|")[:2]
        if pv in JAWA:
            pop[dari_nama[(pv, kab)]] += v
    assert len(pop) == 119 and min(pop.values()) > 0
    for k in W:
        W[k]["penduduk"] = pop[k]
    return W, prov_nama, pend["sumber"]


# --------------------------------------------------------------------------------------------- IRBI

def irbi(W):
    baris = [json.loads(l) for l in open(IRBI, encoding="utf-8") if l.strip()]
    meta = [b for b in baris if b.get("type") == "meta"]
    rows = [b["data"] for b in baris if b.get("type") == "row"]
    assert len(meta) == 1 and meta[0]["data"]["pagination"]["total_data"] == len(rows) == 5654
    D = {(r["pcode"], r["tahun"]): r for r in rows if r["pcode"] in W}
    assert len(D) == 119 * 11, f"IRBI Jawa {len(D)} baris, harus 1.309"
    K = ["kode", "nama", "prov_kode", "tahun", "skala"] + H5 + ["total", "status_resmi", "basis_resmi", "label"]
    B = []
    for k in sorted(W):
        for y in range(2015, 2026):
            r = D[(k, y)]
            B.append([k, W[k]["nama"], W[k]["prov"], y, "baru_2025" if y == 2025 else "lama_2015_2024"] + [r[h] for h in H5] +
                     [r["total"], r["status"], int(r["fix_values"] is not None), LAB_R])
    tulis_csv("irbi_kab_2015_2025.csv", K, B)
    # silang dengan paket irbi bila sudah dibangun (angka harus identik)
    lain = P("data/kajian-bnpb/data/irbi/irbi_kab_2015_2025.csv")
    silang = "paket irbi belum ada"
    if os.path.exists(lain):
        n = 0
        for r in csv.DictReader(open(lain, encoding="utf-8")):
            if r["kode"] in W:
                d = D[(r["kode"], int(r["tahun"]))]
                for h in H5 + ["total"]:
                    v = None if r[h] == "" else float(r[h])
                    assert (v is None and d[h] is None) or abs(v - d[h]) < 1e-9, ("beda dengan paket irbi", r["kode"], r["tahun"], h)
                n += 1
        assert n == 119 * 11
        silang = f"identik dengan data/kajian-bnpb/data/irbi/irbi_kab_2015_2025.csv ({n} baris Jawa)"
    tot = sum(r["total"] for (k, y), r in D.items())
    assert abs(tot - sum(b[K.index("total")] for b in B)) < 1e-6
    return D, {"sha1": sha1(IRBI), "meta_api": meta[0]["data"], "silang_paket_irbi": silang}


# --------------------------------------------------------------------------------------------- DIBI

KELOMPOK = [("banjir", lambda r: r["kategori_bencana"] == "Banjir" and r["jenis_bencana"] != "Banjir Rob"),
            ("rob", lambda r: r["jenis_bencana"] == "Banjir Rob"),
            ("longsor", lambda r: r["kategori_bencana"] == "Longsor"),
            ("kekeringan", lambda r: r["kategori_bencana"] == "Kekeringan"),
            ("gelombang_abrasi", lambda r: r["kategori_bencana"] == "Gelombang pasang / Abrasi"),
            ("cuaca_ekstrem", lambda r: r["kategori_bencana"] == "Cuaca ekstrem")]
KD = ["jumlah_kejadian", "meninggal", "hilang", "luka_sakit", "mengungsi", "menderita_mengungsi", "rumah_rusak_berat",
      "rumah_rusak_sedang", "rumah_rusak_ringan", "rumah_terendam", "n_baris"]


def kelompok(r):
    for n, f in KELOMPOK:
        if f(r):
            return n
    return "lain"


def dibi(W):
    d = json.load(open(DIBI, encoding="utf-8"))
    kunci = {(w["prov"], kunci_nama(n)): k for k, w in W.items() for n in (w["nama"], w["nama_kepmendagri"])}
    agg = defaultdict(lambda: [0.0] * len(KD))
    peta_kode = {}
    for r in d["data"]:
        p = str(r["id_provinsi_bps"])
        k = kunci.get((p, kunci_nama(r["kabupaten"])))
        assert k, f"DIBI kab tak terpetakan: {r['kabupaten']} ({p})"
        peta_kode[(r["id_kab_bps"], r["kabupaten"])] = k
        a = agg[(k, r["tahun"], kelompok(r), int(bool(r["is_bencana"])))]
        for i, m in enumerate(KD):
            a[i] += r[m] or 0
    assert len(set(peta_kode.values())) == 119, "tidak semua 119 kab muncul di DIBI"
    beda_kode = sorted(f"{a}->{k} ({n})" for (a, n), k in peta_kode.items() if str(a) != k)
    K = ["kode", "nama", "prov_kode", "tahun", "kelompok", "is_bencana"] + KD + ["label"]
    B = [[k, W[k]["nama"], W[k]["prov"], y, g, ib] + [r4(v) if i == 0 else int(round(v)) for i, v in enumerate(a)] + [LAB_R]
         for (k, y, g, ib), a in sorted(agg.items())]
    tulis_csv("dibi_kab_tahun.csv", K, B)
    tot_src = sum(r["jumlah_kejadian"] for r in d["data"])
    assert abs(tot_src - sum(a[0] for a in agg.values())) < 1e-6, "jumlah kejadian keluaran != sumber"
    for m in ("meninggal", "mengungsi", "rumah_terendam"):
        assert sum(r[m] or 0 for r in d["data"]) == sum(int(round(a[KD.index(m)])) for a in agg.values()), m
    tahun = sorted({r["tahun"] for r in d["data"]})
    return agg, {"ditarik": d["ditarik"], "sumber": d["sumber"], "tabel": d["tabel"], "tahun": [tahun[0], tahun[-1]],
                 "baris": len(d["data"]), "jumlah_kejadian": r4(tot_src), "kode_bps_beda_kemendagri": beda_kode}


def dibi_ringkas(agg, k, kel, y0=2015, y1=2025, ib=1):
    v = [0.0] * len(KD)
    for (kk, y, g, b), a in agg.items():
        if kk == k and g == kel and y0 <= y <= y1 and b == ib:
            v = [x + z for x, z in zip(v, a)]
    return dict(zip(KD, v))


# --------------------------------------------------------------------------------------------- BPS air minum

def bps_baris(nama):
    t = open(os.path.join(MENTAH, "bps", f"{nama}.txt"), encoding="utf-8").read()
    url = re.search(r"^#url (.*)$", t, re.M).group(1)
    ditarik = re.search(r"^#ditarik (.*)$", t, re.M).group(1)
    diperbarui = re.search(r"Terakhir Diperbarui : (.*)", t)
    rows = [l.split("\t") for l in t.splitlines() if "\t" in l]
    return rows, {"url": url, "ditarik": ditarik, "diperbarui": diperbarui.group(1).strip() if diperbarui else None}


NAMA_PROV_BPS = {"DKI JAKARTA": "31", "JAWA BARAT": "32", "JAWA TENGAH": "33", "DI YOGYAKARTA": "34", "JAWA TIMUR": "35", "BANTEN": "36"}


def air_minum(W):
    out, meta = [], {}
    rows, m = bps_baris("air_minum_layak_prov_2025")
    meta["prov_layak_2025"] = m
    prov = {}
    for r in rows:
        if r[0].strip().upper() in NAMA_PROV_BPS:
            prov[NAMA_PROV_BPS[r[0].strip().upper()]] = angka_id(r[1])
        if r[0].strip().upper() == "INDONESIA":
            prov["ID"] = angka_id(r[1])
    assert set(JAWA) <= set(prov), prov
    for p in JAWA + ["ID"]:
        out.append(["provinsi", p, None, 2025, "rumah_tangga_akses_air_minum_layak_persen", prov[p], m["url"], LAB_R])
    rows, m = bps_baris("air_minum_layak_kab_jateng_2025")
    meta["kab_jateng_layak_2025"] = m
    kab = {}
    for r in rows:
        mm = re.match(r"^(\d{4}) (.*)$", r[0].strip())
        if not mm:
            continue
        kode, nama = mm.groups()
        if kode == "3300":
            assert angka_id(r[1]) == prov["33"], "nilai provinsi Jateng beda antara tabel kab dan tabel nasional"
            continue
        assert kode in W and kunci_nama(nama) == kunci_nama(W[kode]["nama_kepmendagri"]), f"kode BPS {kode} {nama} tidak sama dengan Kemendagri"
        kab[kode] = angka_id(r[1])
    assert len(kab) == 35
    for k, v in sorted(kab.items()):
        out.append(["kab", k[:2], k, 2025, "rumah_tangga_akses_air_minum_layak_persen", v, m["url"], LAB_R])
    rows, m = bps_baris("sumber_air_minum_prov_2023")
    meta["prov_sumber_2023"] = m
    leding = {}
    for r in rows:
        nm = r[0].strip().upper()
        if nm in NAMA_PROV_BPS or nm == "INDONESIA":
            leding[NAMA_PROV_BPS.get(nm, "ID")] = angka_id(r[1])
    assert leding["ID"] == 8.92, "kolom leding Indonesia 2023 bukan 8,92: kolom tabel BPS bergeser"
    for p in JAWA + ["ID"]:
        out.append(["provinsi", p, None, 2023, "rumah_tangga_sumber_air_minum_leding_persen", leding[p], m["url"], LAB_R])
    tulis_csv("air_minum.csv", ["tingkat", "prov_kode", "kode_kab", "tahun", "indikator", "nilai", "sumber", "label"], out)
    rows, m = bps_baris("penduduk_nasional_2026")
    meta["penduduk_nasional_2026"] = dict(m, nilai=[r for r in rows if r[0].strip() == "Indonesia"][0][1].strip())
    return prov, kab, leding, meta


# --------------------------------------------------------------------------------------------- irigasi (Permen PUPR 14/2015)

KUNCI_KAB = defaultdict(dict)   # prov -> kunci_nama -> kode
SKEL = str.maketrans("GYJQ", "AVIO")   # OCR memotong kaki huruf g/y/j/q karena garis tabel dihapus
ALIAS_IRIG = {"SUKOHARDJO": "SUKOHARJO"}
JENIS_RE = re.compile(r"Nama Daerah Irigasi\s+(Permukaan|Rawa|Air Tanah|Pompa|Tambak)", re.I)
KABH = re.compile(r"^\W{0,3}([A-Za-z]{1,2}|\d)?\W{0,2}\s*(Kab\b\.?|Kota\b)\s+(.+?)\s*$")
DIL3 = re.compile(r"^\W{0,3}(\d{1,4})\W{0,2}\s+D\W{0,3}[IL1l]\b.*?\s(\d[\d.,]*)\s*\W{0,2}$")
DIH = re.compile(r"^\W{0,3}(\d{1,3})\W{0,2}\s+D\W{0,2}\s?[IL1l]\W{0,2}\s?[A-Z]?\W{0,2}\s+(.*)$")
BAG = re.compile(r"\b(Kabupaten|Kab\.|Kota)\s+(.*)$")
NOL = re.compile(r"Bendung|Dam\b|Air Baku|Bendungan|Sebagian|Waduk|Mata Air", re.I)
BBWS_RE = re.compile(r"\b(BBWS|BWS)\s+([A-Za-z \-]+?)\s*:")


def skel(s):
    return re.sub(r"[^A-Z]", "", s.upper()).translate(SKEL)


def angka_ocr(s):
    """Angka OCR format Indonesia: titik ribuan, koma desimal (DI kecil, mis. '0,23'). Koma + 3 digit = ribuan (salah baca)."""
    s = re.sub(r"[^\d.,]", "", s)
    if not re.search(r"\d", s):
        return None
    m = re.match(r"^(.*?),(\d{1,2})$", s)
    if m:
        return round(int(re.sub(r"\D", "", m.group(1)) or "0") + int(m.group(2)) / 10 ** len(m.group(2)), 2)
    return int(re.sub(r"\D", "", s))


def prov_ocr(s):
    u = s.upper()
    if "BANTEN" in u:
        return "36"
    if re.search(r"JAWA\s*BARAT", u):
        return "32"
    if re.search(r"JAWA\s*TEN[GC]AH", u):
        return "33"
    if "YOGYA" in u:
        return "34"
    if re.search(r"JAWA\s*TIMUR", u):
        return "35"
    if "DKI" in u or "JAKARTA" in u:
        return "31"
    return "lain"


def persis(prov, jenis, nama, kabur=True):
    """Nama header kab (tanpa angka) -> kode bila sama (kerangka huruf). Kabur (difflib >= 0,75) hanya di provinsi yang diketahui."""
    t = skel(nama)
    t = skel(ALIAS_IRIG.get(t, t))
    hit = sorted({kode for p in ([prov] if prov in KUNCI_KAB else KUNCI_KAB) for key, kode in KUNCI_KAB[p].items()
                  if (jenis == "KOTA") == key.startswith("KOTA ") and skel(key[5:] if key.startswith("KOTA ") else key) == t})
    if len(hit) == 1:
        return hit[0]
    if hit or not kabur or prov not in KUNCI_KAB:
        return None
    cand = defaultdict(set)
    for key, kode in KUNCI_KAB[prov].items():
        if (jenis == "KOTA") == key.startswith("KOTA "):
            cand[skel(key[5:] if key.startswith("KOTA ") else key)].add(kode)
    m = difflib.get_close_matches(t, list(cand), n=2, cutoff=0.75)
    if m and len(cand[m[0]]) == 1 and (len(m) == 1 or difflib.SequenceMatcher(None, t, m[0]).ratio() > difflib.SequenceMatcher(None, t, m[1]).ratio()):
        return next(iter(cand[m[0]]))
    return None


def awalan_kab(prov, jenis, sisa):
    """'Tangerang z 21.007 Ha' -> kode kab dengan nama terpanjang yang menjadi awalan (konteks provinsi wajib)."""
    if prov not in KUNCI_KAB:
        return None
    huruf = skel(sisa)
    for a, b in ALIAS_IRIG.items():
        if huruf.startswith(skel(a)):
            huruf = skel(b) + huruf[len(skel(a)):]
    for coba in (jenis, "KAB" if jenis == "KOTA" else "KOTA"):   # dokumen kadang menulis 'Kabupaten Surakarta' untuk Kota Surakarta
        best = None
        for key, kode in KUNCI_KAB[prov].items():
            if (coba == "KOTA") != key.startswith("KOTA "):
                continue
            kl = skel(key[5:] if key.startswith("KOTA ") else key)
            if huruf.startswith(kl) and (best is None or len(kl) > best[0]):
                best = (len(kl), kode)
        if best:
            return best[1]
    return None


def halaman(p):
    return [l for l in open(os.path.join(OCR, f"p{p:03d}.txt"), encoding="utf-8").read().splitlines() if not l.startswith("#")]


def lampiran3(koreksi):
    """Subtotal per kab (jumlah DI, ha) di Lampiran III (kewenangan kab/kota), hlm 64-590."""
    jenis = prov = cur = None
    out, dipakai = [], set()
    for p in range(64, 591):
        for l in halaman(p):
            m = JENIS_RE.search(l)
            if m:
                jenis = m.group(1).title()
                continue
            if re.search(r"ROVIN", l, re.I) and not re.search(r"Kab\.|Kota", l):
                prov, cur = prov_ocr(l), None
                continue
            m = KABH.match(l)
            if m:
                rest = m.group(3)
                mm = re.match(r"(.*?)\s+([\dA-Z][\d.,]*)\s*\W?\s+([\d.,]+)\W*$", rest)
                nama, n, ha = (mm.group(1), angka_ocr(mm.group(2)), angka_ocr(mm.group(3))) if mm else (re.sub(r"[\d.,\s]+$", "", rest), None, None)
                for kk, (nn, hh) in koreksi.items():
                    hk, pot = kk.split("|")
                    if int(hk) == p and pot in l:
                        n, ha, nama = nn, hh, re.sub(r"[\d.,\s]+$", "", nama)
                        dipakai.add(kk)
                jk = "KOTA" if m.group(2).startswith("Kota") else "KAB"
                huruf = (m.group(1) or "").lower()
                kode = persis(prov, jk, nama, kabur=False) if prov in KUNCI_KAB else None
                if kode is None:
                    k2 = persis(None, jk, nama, kabur=False)
                    if k2:
                        kode, prov = k2, k2[:2]
                    elif huruf == "a":
                        prov = "lain"   # urutan huruf mulai lagi di provinsi luar Jawa (judul provinsi sering rusak garis bawah)
                    elif prov in KUNCI_KAB:
                        kode = persis(prov, jk, nama)
                if prov not in KUNCI_KAB:
                    cur = None
                    continue
                cur = {"jenis": jenis, "prov": prov, "kode": kode, "n": n, "ha": ha, "hlm": p, "teks": l.strip(), "di_n": 0, "di_ha": 0}
                out.append(cur)
                continue
            m = DIL3.match(l)
            if m and cur:
                cur["di_n"] += 1
                cur["di_ha"] += angka_ocr(m.group(2)) or 0
    assert dipakai == set(koreksi), f"koreksi subtotal tak terpakai: {set(koreksi) - dipakai}"
    return out


def bagian(prov, teks):
    m = BAG.search(teks)
    if not m or prov not in KUNCI_KAB:
        return None
    kode = awalan_kab(prov, "KOTA" if m.group(1) == "Kota" else "KAB", m.group(2))
    if NOL.search(m.group(2)):
        ha = 0
    else:
        # 'M1 Ha' = '41 Ha': OCR membaca angka 4 sebagai M (3 kasus, semuanya dibuktikan oleh total DI: 2235-2194, 82-41, 53-12)
        mm = re.search(r"([\dM][\d.,]*)\s*[Hh]a\b", m.group(2))
        ha = angka_ocr(mm.group(1).replace("M", "4")) if mm else (0 if re.search(r"\s-\s*[Hh]a\b", m.group(2)) else None)
    return kode, ha, m.group(0).strip(), prov


def lampiran12(halaman_list, kewenangan, koreksi):
    """Per DI di Lampiran I (pusat) / II (provinsi): total, BBWS (bila disebut), bagian per kab; DI utuh-kab memakai judul grup."""
    jenis, prov, grup, di = "Permukaan", None, None, None
    out, judul = [], []
    for p in halaman_list:
        for l in halaman(p):
            m = JENIS_RE.search(l)
            if m:
                jenis = m.group(1).title()
                continue
            if re.search(r"Jumlah|Luasan|Provinsi/|Keterangan", l):
                continue
            if re.search(r"ROVIN", l, re.I) and not BAG.search(l):
                prov, grup = prov_ocr(l), None
                mm = re.search(r"([\dA-Z][\d.,]*)\W*\s+([\d.,]+)\s*$", l)
                judul.append({"hlm": p, "kewenangan": kewenangan, "jenis": jenis, "prov": prov, "teks": l.strip(),
                              "ha": angka_ocr(mm.group(2)) if mm else None, "di": []})
                continue
            m = KABH.match(l)
            if m and not DIH.match(l) and not re.search(r"\d", m.group(3)) and not NOL.search(l):
                grup = persis(prov, "KOTA" if m.group(2).startswith("Kota") else "KAB", m.group(3)) if prov in KUNCI_KAB else None
                continue
            m = DIH.match(l)
            if m:
                mm = re.match(r"^(.*?)\s+\|?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?=$|\(|Kabupaten|Kab\.|Kota|BBWS|BWS|Mrican|[A-Z][a-z]+ (?:Kiri|Kanan))(.*)$", m.group(2))
                nama, tot, sisa = (mm.group(1), angka_ocr(mm.group(2)), mm.group(3)) if mm else (m.group(2), None, "")
                for kk, v in koreksi.items():
                    hk, pot = kk.split("|")
                    if int(hk) == p and pot in l:
                        tot, nama = v, pot
                        koreksi_dipakai.add(kk)
                bb = BBWS_RE.search(sisa)
                di = {"kewenangan": kewenangan, "jenis": jenis, "prov": prov, "grup": grup, "nama": nama.strip(), "total": tot,
                      "bbws": bb.group(0).rstrip(" :") if bb else None, "bagian": [], "hlm": p, "teks": l.strip()}
                out.append(di)
                if judul:
                    judul[-1]["di"].append(di)
                b = bagian(prov, sisa)
                if b:
                    di["bagian"].append(b)
                continue
            if di is None:
                continue
            mp = re.match(r"^\W{0,3}[A-C]\.\s*Provinsi\s+(.*)$", l)
            if mp:
                prov = prov_ocr(mp.group(1))
                continue
            b = bagian(prov, l)
            if b:
                di["bagian"].append(b)
    return out, judul


koreksi_dipakai = set()


def irigasi(W, ruj):
    for k, w in W.items():
        for n in (w["nama"], w["nama_kepmendagri"]):
            KUNCI_KAB[w["prov"]][kunci_nama(n)] = k
    rek = ruj["permen14_rekap"]
    kor = ruj["permen14_koreksi"]
    assert len(glob.glob(os.path.join(OCR, "p*.txt"))) == 578, "OCR Permen 14/2015 belum lengkap: jalankan air_jawa_ocr.py"
    # --- Lampiran III: subtotal kab
    l3 = lampiran3(kor["subtotal_kab"])
    assert all(e["kode"] and e["ha"] is not None and e["n"] is not None for e in l3), [e for e in l3 if not (e["kode"] and e["ha"] is not None and e["n"])]
    assert len({(e["kode"], e["jenis"]) for e in l3}) == len(l3), "subtotal kab ganda"
    # --- Lampiran I/II: per DI
    di1, j1 = lampiran12(range(14, 29), "pusat", kor["total_di"])
    di2, j2 = lampiran12(range(30, 63), "provinsi", kor["total_di"])
    assert koreksi_dipakai == set(kor["total_di"]), f"koreksi total DI tak terpakai: {set(kor['total_di']) - koreksi_dipakai}"
    baris_kab = []        # (kode|None, prov, kewenangan, jenis, ha, n_di, metode, hlm)
    di_out = []
    for di in di1 + di2:
        parts = [b for b in di["bagian"] if b[3] in KUNCI_KAB]
        if not parts and not (di["grup"] and di["prov"] in KUNCI_KAB):
            continue
        if parts:
            s = round(sum(b[1] or 0 for b in parts), 2)
            for b in parts:
                if b[0] or b[1]:   # bagian rusak tanpa nama dan tanpa luas (mis. 'Kabupaten z Ha') dilewati
                    baris_kab.append([b[0], b[3], di["kewenangan"], di["jenis"], b[1] or 0, 1 if (b[1] or 0) > 0 else 0,
                                      "bagian DI lintas kab/prov" if b[0] else f"bagian DI {di['nama']} tanpa nama kab terbaca: {b[2]}", di["hlm"]])
            sisa = round(di["total"] - s, 2)
            if sisa:
                baris_kab.append([None, parts[0][3], di["kewenangan"], di["jenis"], sisa, 0, f"sisa DI {di['nama']}: total {di['total']} - bagian {s} (salah baca OCR bagian kecil)", di["hlm"]])
            letak = "; ".join(f"{W[b[0]]['nama'] if b[0] else b[2]}={b[1]}" for b in parts)
        else:
            baris_kab.append([di["grup"], di["prov"], di["kewenangan"], di["jenis"], di["total"], 1, "DI utuh dalam satu kab", di["hlm"]])
            letak = f"{W[di['grup']]['nama']}={di['total']}"
        di_out.append([di["kewenangan"], di["jenis"], di["prov"] if not parts else parts[0][3], di["nama"], di["total"], di["bbws"], letak,
                       ";".join(sorted({b[3] for b in parts})) if parts else di["prov"], di["hlm"], LAB_R])
    # judul seksi provinsi: total DI harus = angka judul; selisih jadi baris sisa
    for j in j1 + j2:
        if j["prov"] not in KUNCI_KAB or j["ha"] is None:
            continue
        s = sum(d["total"] or 0 for d in j["di"])
        if s != j["ha"]:
            baris_kab.append([None, j["prov"], j["kewenangan"], j["jenis"], j["ha"] - s, 0,
                              f"sisa seksi '{j['teks'][:40]}': judul {j['ha']} - jumlah DI {s} (salah baca OCR total DI)", j["hlm"]])
    for e in l3:
        baris_kab.append([e["kode"], e["prov"], "kabkota", e["jenis"], e["ha"], e["n"], "subtotal kab Lampiran III", e["hlm"]])
    # rekonsiliasi dengan rekap resmi per provinsi x kewenangan x jenis
    rek_rows = []
    for kw in ("pusat", "provinsi", "kabkota"):
        for p in JAWA:
            for jn in ("Permukaan", "Air Tanah", "Pompa", "Rawa", "Tambak"):
                resmi = rek[kw].get(p, {}).get(jn)
                ocr = round(sum(b[4] for b in baris_kab if b[1] == p and b[2] == kw and b[3] == jn and b[0] is not None), 2)
                sisa = round(sum(b[4] for b in baris_kab if b[1] == p and b[2] == kw and b[3] == jn and b[0] is None), 2)
                n_ocr = sum(b[5] for b in baris_kab if b[1] == p and b[2] == kw and b[3] == jn)
                if resmi is None and ocr == 0 and sisa == 0:
                    continue
                assert resmi is not None, (kw, p, jn, ocr)
                selisih = round(resmi[1] - ocr - sisa, 2)
                if selisih:
                    baris_kab.append([None, p, kw, jn, selisih, 0, f"sisa rekap: rekap {resmi[1]} - jumlah kab OCR {ocr + sisa}", None])
                rek_rows.append([kw, p, jn, resmi[0], resmi[1], n_ocr if kw == "kabkota" else None, ocr, round(sisa + selisih, 2),
                                 r4((sisa + selisih) / resmi[1] * 100), LAB_R])
    # invarian: tiap provinsi x kewenangan x jenis = rekap; sisa kecil
    for r in rek_rows:
        kw, p, jn, n_res, ha_res, n_ocr, ocr, sisa = r[:8]
        total = round(sum(b[4] for b in baris_kab if b[1] == p and b[2] == kw and b[3] == jn), 2)
        assert total == ha_res, (kw, p, jn, total, ha_res)
        batas = 2 if kw == "kabkota" else 100
        assert abs(sisa) <= batas, f"sisa tak teratribusi terlalu besar {kw} {p} {jn}: {sisa} ha (batas {batas})"
        if kw == "kabkota":
            assert n_ocr == n_res, f"jumlah DI kab/kota {p} {jn}: OCR {n_ocr} != rekap {n_res}"
    for kw in ("pusat", "provinsi"):   # jumlah DI Jawa hasil OCR = jumlah DI rekap (94 pusat, 457 provinsi)
        n_rek = sum(v[0] for p in JAWA for v in rek[kw].get(p, {}).values())
        n_ocr = sum(1 for d in di_out if d[0] == kw)
        assert n_ocr == n_rek, f"jumlah DI {kw} Jawa: OCR {n_ocr} != rekap {n_rek}"
    tot_jawa = sum(r[4] for r in rek_rows)
    tercetak = sum(v for kw in rek["total_provinsi_tercetak"] if kw != "_catatan" for v in rek["total_provinsi_tercetak"][kw].values())
    assert tercetak == 3135123 and tot_jawa == tercetak + 1, (tot_jawa, tercetak)   # +1: kolom Jatim kab/kota 533.035 vs TOTAL tercetak 533.034
    tulis_csv("irigasi_rekonsiliasi.csv", ["kewenangan", "prov_kode", "jenis", "rekap_n_di", "rekap_ha", "ocr_n_di", "ocr_ha_teratribusi_kab",
                                           "ha_tak_teratribusi", "persen_tak_teratribusi", "label_rekap"], rek_rows)
    K = ["kode", "nama", "prov_kode", "kewenangan", "jenis", "ha", "n_di", "metode", "hlm_bn638", "label"]
    B = [[b[0], W[b[0]]["nama"] if b[0] else "(tak teratribusi ke kab)", b[1], b[2], b[3], b[4], b[5], b[6], b[7], LAB_R] for b in baris_kab]
    tulis_csv("irigasi_kab.csv", K, B)
    tulis_csv("irigasi_di_pusat_provinsi.csv", ["kewenangan", "jenis", "prov_kode", "nama_di", "total_ha", "bbws_disebut", "bagian_per_kab",
                                                "provinsi_bagian", "hlm_bn638", "label"], di_out)
    per_kab = defaultdict(lambda: defaultdict(float))
    for b in baris_kab:
        if b[0]:
            per_kab[b[0]][b[2]] += b[4]
            if b[2] == "kabkota":
                per_kab[b[0]]["n_di_kabkota"] += b[5]
    bbws_kab = defaultdict(set)
    for di in di1:
        if di["bbws"]:
            for b in di["bagian"]:
                if b[0] and (b[1] or 0) > 0:
                    bbws_kab[b[0]].add(di["bbws"])
    return per_kab, rek_rows, bbws_kab, {"n_subtotal_kab": len(l3), "n_di_pusat_jawa": sum(1 for d in di_out if d[0] == "pusat"),
                                         "n_di_provinsi_jawa": sum(1 for d in di_out if d[0] == "provinsi"), "total_jawa_ha": tercetak}


# --------------------------------------------------------------------------------------------- bendungan

def dms(teks):
    """"7°15'(13.37-46.35)\" LS" -> -7.2583 (rentang ditulis dokumen = titik tengah). LS/BB negatif."""
    t = re.sub(r"\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)", lambda m: str((float(m.group(1)) + float(m.group(2))) / 2), teks)
    t = re.sub(r"\((\d+)'(\d+(?:\.\d+)?)\"-(\d+)'(\d+(?:\.\d+)?)\"\)",
               lambda m: f"{(int(m.group(1)) * 60 + float(m.group(2)) + int(m.group(3)) * 60 + float(m.group(4))) / 2 / 60:.6f}'", t)
    m = re.match(r"\s*(\d+)°\s*(\d+(?:\.\d+)?)'\s*(?:(\d+(?:\.\d+)?)\")?\s*(LS|LU|BT|BB)", t)
    assert m, teks
    v = int(m.group(1)) + float(m.group(2)) / 60 + (float(m.group(3)) / 3600 if m.group(3) else 0)
    return -v if m.group(4) in ("LS", "BB") else v


def bendungan(W, ruj):
    wd = json.load(open(os.path.join(MENTAH, "wikidata_bendungan.json"), encoding="utf-8"))
    koor = {}
    for b in wd["bindings"]:
        q = b["item"]["value"].rsplit("/", 1)[-1]
        x, y = map(float, re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", b["coord"]["value"]).groups())
        koor[q] = (x, y)
    qid = {k: v for k, v in ruj["wikidata_qid"].items() if not k.startswith("_")}

    def kab_dari(x, y):
        hit = [k for k, w in W.items() if titik_dalam(x, y, w["geom"])]
        return hit[0] if len(hit) == 1 else None

    def pilih_titik(did, kab, resmi=None):
        """Urutan: koordinat dokumen resmi (bila jatuh di kab yang disebut) -> Wikidata (cek kab) -> pusat kab (peraga)."""
        catatan = []
        if resmi:
            x, y = resmi
            kk = kab_dari(x, y)
            if kab is None or kk == kab:
                return x, y, "dokumen BBWS Pemali Juana 2021 (resmi)", "lolos cek poligon kab", kk
            catatan.append(f"koordinat dokumen jatuh di {W[kk]['nama'] if kk else 'luar Jawa/laut'}, bukan {W[kab]['nama']}")
        if did in qid and qid[did] in koor:
            x, y = koor[qid[did]]
            kk = kab_dari(x, y)
            if kab is None and kk:
                return x, y, f"Wikidata {qid[did]}", "; ".join(catatan + ["kab diturunkan dari koordinat"]), kk
            if kk == kab:
                return x, y, f"Wikidata {qid[did]}", "; ".join(catatan + ["lolos cek poligon kab"]), kk
            catatan.append(f"Wikidata {qid[did]} jatuh di {W[kk]['nama'] if kk else 'luar Jawa'}, ditolak")
        if kab:
            return W[kab]["lon"], W[kab]["lat"], "pusat kab berbobot penduduk (scripts/udara/kota.json)", "; ".join(catatan + ["TITIK PERAGA, bukan lokasi bendungan"]), kab
        return None, None, None, "; ".join(catatan + ["tanpa koordinat"]), None

    pj = ruj["bendungan_pj2021"]
    ki = {c: i for i, c in enumerate(pj["_kolom"])}
    tot = defaultdict(float)
    D, angka = {}, []
    url_pj = "https://sda.pu.go.id/balai/bbwspemalijuana/files/datasda/Bendungan_BBWSPemaliJuana.pdf"
    for r in pj["baris"]:
        did = r[ki["nama"]].lower()
        for c in ("luas_genangan_ha", "vol_normal_juta_m3", "vol_efektif_juta_m3", "luas_genangan_2021_ha", "tampungan_2021_juta_m3",
                  "sedimentasi_juta_m3", "piezometer", "piezometer_rusak"):
            tot[c] += r[ki[c]] or 0
        x, y, ks, cek, kk = pilih_titik(did, r[ki["kab_kode"]], (dms(r[ki["bujur_teks"]]), dms(r[ki["lintang_teks"]])))
        D[did] = {"id": did, "nama": r[ki["nama"]], "kab": r[ki["kab_kode"]], "lokasi": f"Desa {r[ki['desa']]}, Kec. {r[ki['kecamatan']]}",
                  "tahun": r[ki["tahun_bangun"]], "status": "operasi", "bbws": "BBWS Pemali-Juana (inventaris 2021)", "ws": None,
                  "lon": r6(x), "lat": r6(y), "koordinat_sumber": ks, "koordinat_cek": cek,
                  "kapasitas": r[ki["vol_normal_juta_m3"]], "kapasitas_label": LAB_R, "tampungan_terukur": r[ki["tampungan_2021_juta_m3"]],
                  "tahun_ukur": 2021, "sedimentasi": r[ki["sedimentasi_juta_m3"]],
                  "pemanfaatan": f"desain: {r[ki['pemanfaatan_desain']]} | 2021: {r[ki['pemanfaatan_2021']]}"}
        for c, sat, th in (("vol_normal_juta_m3", "juta m3", "desain"), ("vol_efektif_juta_m3", "juta m3", "desain"), ("luas_genangan_ha", "ha", "desain"),
                           ("tampungan_2021_juta_m3", "juta m3", "2021"), ("luas_genangan_2021_ha", "ha", "2021"), ("sedimentasi_juta_m3", "juta m3", "s.d. 2021"),
                           ("piezometer", "buah", "2021"), ("piezometer_rusak", "buah", "2021")):
            if r[ki[c]] is not None:
                angka.append([did, c, r[ki[c]], sat, th, url_pj + " (status Juli 2021)", LAB_R, ""])
    rek_pj = []
    for c, v in pj["total_dokumen"].items():
        selisih = round(tot[c] - v, 3)
        # Satu-satunya selisih yang diketahui: sedimentasi, baris dokumen berjumlah 96,545 tetapi TOTAL tercetak 96,51
        # (subtotal kab di dokumen juga dibulatkan: Grobogan 42,98 vs 42,99; Pati 1,302 vs 1,33; Rembang 2,16 vs 2,165).
        assert abs(selisih) < 0.011 or (c == "sedimentasi_juta_m3" and abs(selisih) < 0.05), f"jumlah {c} inventaris BBWS PJ {tot[c]} != TOTAL dokumen {v}"
        rek_pj.append([c, r4(tot[c]), v, selisih, "cocok" if abs(selisih) < 0.011 else "selisih di dokumen sumber (TOTAL tercetak != jumlah baris)", LAB_R])
    tulis_csv("bendungan_rekonsiliasi.csv", ["kolom", "jumlah_18_baris", "total_tercetak_dokumen", "selisih", "catatan", "label"], rek_pj)
    url_b = "data/kajian-bnpb/riset/B-air-jawa.md §3"
    for did, nama, kab, ws, status, ang in ruj["bendungan_riset_b"]["baris"]:
        if did not in D:
            x, y, ks, cek, kk = pilih_titik(did, kab)
            if kab is None and kk:
                cek += f" ({W[kk]['nama']})"
            kap = [a for a in ang if a[0].startswith("kapasitas") and a[0] != "kapasitas_efektif" and not a[3]]   # desain (tanpa tahun ukur)
            D[did] = {"id": did, "nama": nama, "kab": kab or kk, "lokasi": None, "tahun": None, "status": status, "bbws": None, "ws": None,
                      "lon": r6(x), "lat": r6(y), "koordinat_sumber": ks, "koordinat_cek": cek,
                      "kapasitas": kap[0][1] if kap else None, "kapasitas_label": kap[0][4] if kap else None,
                      # hanya besaran yang sama dengan kapasitas desain (kapasitas total); efektif tidak dibandingkan dengan total
                      "tampungan_terukur": next((a[1] for a in ang if a[0] == "kapasitas" and a[3]), None),
                      "tahun_ukur": next((a[3] for a in ang if a[0] == "kapasitas" and a[3]), None),
                      "sedimentasi": None, "pemanfaatan": None}
        D[did]["ws"] = ws
        for a in ang:
            angka.append([did, a[0], a[1], a[2], a[3], url_b, a[4], a[5]])
    K = ["id", "nama", "kab_kode", "kab_nama", "prov_kode", "lokasi", "ws_dasar_nama_sungai", "bbws_sumber", "status", "tahun_bangun",
         "kapasitas_desain_juta_m3", "label_kapasitas", "versi_kapasitas_lain", "tampungan_terukur_juta_m3", "tahun_ukur", "sedimentasi_juta_m3",
         "kehilangan_tampungan_persen", "label_kehilangan", "pemanfaatan", "lon", "lat", "koordinat_sumber", "koordinat_cek"]
    B = []
    for did, d in sorted(D.items(), key=lambda kv: (kv[1]["kab"] or "", kv[0])):
        lain = sorted({f"{a[2]:g} ({a[4] or 'desain'}, {a[6]})" for a in angka if a[0] == did and a[1].startswith("kapasitas") and a[2] != d["kapasitas"]})
        hilang = r2((1 - d["tampungan_terukur"] / d["kapasitas"]) * 100) if d["kapasitas"] and d["tampungan_terukur"] else None
        lab_h = None if hilang is None else f"olah({d['kapasitas_label']})"
        B.append([did, d["nama"], d["kab"], W[d["kab"]]["nama"] if d["kab"] else None, d["kab"][:2] if d["kab"] else None, d["lokasi"], d["ws"], d["bbws"],
                  d["status"], d["tahun"], d["kapasitas"], d["kapasitas_label"], "; ".join(lain) or None, d["tampungan_terukur"], d["tahun_ukur"],
                  d["sedimentasi"], hilang, lab_h, d["pemanfaatan"], d["lon"], d["lat"], d["koordinat_sumber"], d["koordinat_cek"]])
    tulis_csv("bendungan.csv", K, B)
    tulis_csv("bendungan_angka.csv", ["id", "besaran", "nilai", "satuan", "tahun", "sumber", "label", "catatan"], angka)
    assert all(b[2] in W for b in B), [b[0] for b in B if b[2] not in W]
    return D, {"n": len(D), "n_pj2021": len(pj["baris"]), "tidak_ditemukan": ruj["bendungan_riset_b"]["tidak_ditemukan"],
               "wikidata": {"ditarik": wd["ditarik"], "baris": len(wd["bindings"])}}


def r6(x):
    return None if x is None else round(x, 6)


# --------------------------------------------------------------------------------------------- subsiden

def subsiden(W, ruj):
    lit = json.load(open(P("public/banjir/data/subsiden_literatur.json"), encoding="utf-8"))
    kk = {k: v for k, v in ruj["subsiden_kota_kab"].items() if not k.startswith("_")}
    K = ["kota_kunci", "wilayah_literatur", "kab_kode_disebut", "min_cm_th", "tengah_cm_th", "maks_cm_th", "besaran", "periode", "metode",
         "sitasi", "url", "label", "berkas_sumber"]
    B = []
    for kunci, v in lit["kota"].items():
        if kunci not in kk:   # Medan: luar Jawa
            continue
        if not v["sumber"]:
            B.append([kunci, v["kota"], ";".join(kk[kunci]), None, None, None, "BELUM terverifikasi: " + v.get("catatan", "")[:200], None, None, None, None,
                      LAB_S, "public/banjir/data/subsiden_literatur.json"])
        for s in v["sumber"]:
            B.append([kunci, v["kota"], ";".join(kk[kunci]), s["min_cm_thn"], s["tengah_cm_thn"], s["maks_cm_thn"], s["ringkas"], s["periode"], s["metode"],
                      s["sitasi"], s["url"], LAB_T, "public/banjir/data/subsiden_literatur.json (" + s["verifikasi"] + ")"])
    sb = ruj["subsiden_riset_b"]
    for r in sb["baris"]:
        kunci, wil, kabs, mn, mx, bes, per, met, sit, url, lab = r
        B.append([kunci, wil, ";".join(kabs), mn, None, mx, bes, per, met, sit, url, lab, "data/kajian-bnpb/riset/B-air-jawa.md §6.1"])
    for b in B:
        for k in (b[2] or "").split(";"):
            assert k == "" or k in W, b
    tulis_csv("subsiden_kota.csv", K, B)
    titik = {}
    for kunci, kabs in kk.items():
        if kunci == "jakarta":
            dki = [W[k] for k in ("3171", "3172", "3173", "3174", "3175")]
            titik[kunci] = (sum(w["lon"] for w in dki) / 5, sum(w["lat"] for w in dki) / 5, "rerata pusat 5 kota administrasi DKI (titik peraga)")
        elif kabs:
            titik[kunci] = (W[kabs[0]]["lon"], W[kabs[0]]["lat"], f"pusat {W[kabs[0]]['nama']} berbobot penduduk (titik peraga)")
    return B, titik, {"literatur_diperbarui": lit["diperbarui"], "label_berkas": lit["label"]}


# --------------------------------------------------------------------------------------------- wilayah sungai

def wilayah_sungai(W, ruj, prov_nama, bbws_kab, D):
    ws = ruj["ws_permen04_2015"]["daftar"]
    bb = {w: b for b in ruj["bbws_permen_pu1_2025"]["daftar"] for w in b[3]}
    assert len(ws) == 24 and len({w[0] for w in ws}) == 24
    assert set(bb) <= {w[1] for w in ws}, set(bb) - {w[1] for w in ws}
    K = ["kode_ws", "nama_ws", "kategori", "provinsi", "kab_kategori_c", "pengelola_menurut_permen04_2015", "bbws_permen_pu1_2025", "lokasi_bbws",
         "n_kab_di_provinsi_ws", "bendungan_dalam_inventaris", "ipa_persen", "catatan_ipa", "label"]
    B, tautan = [], []
    for kode, nama, kat, provs, kabc, bintang in ws:
        if kat in ("A2", "A3"):
            pengelola = "Menteri PU (Pasal 5 ayat 3)"
        elif kat == "B":
            pengelola = f"Gubernur {prov_nama[provs[0]]} (Pasal 5 ayat 4)"
        else:
            pengelola = f"Bupati/Wali Kota {W[kabc]['nama']} (Pasal 5 ayat 5)"
        kab = [kabc] if kabc else sorted(k for k in W if k[:2] in provs)
        for k in kab:
            tautan.append([k, W[k]["nama"], kode, nama, kat, "disebut langsung di Lampiran I (kategori C)" if kabc else
                           "kandidat: provinsi kab tercantum untuk WS ini; batas WS (peta Lampiran V) belum dipetakan ke kab", LAB_R if kabc else LAB_A])
        dams = sorted(d["nama"] for d in D.values() if d["ws"] and re.split(r"\s*\(", d["ws"])[0] in [nama] + nama.split("-"))
        b = bb.get(nama)
        B.append([kode, nama, kat, ";".join(provs), kabc, pengelola, b[0] if b else None, b[2] if b else None, len(kab), "; ".join(dams) or None,
                  None, ruj["ipa_pulau_2010"]["ipa_per_ws"], LAB_R])
    for k, s in sorted(bbws_kab.items()):
        for x in sorted(s):
            tautan.append([k, W[k]["nama"], None, None, None, f"{x} memegang DI kewenangan pusat lintas provinsi di kab ini (Permen PUPR 14/2015 Lampiran I)", LAB_R])
    tulis_csv("ws.csv", K, B)
    tulis_csv("ws_kab.csv", ["kode", "nama", "kode_ws", "nama_ws", "kategori", "jenis_tautan", "label"], tautan)
    ipa = ruj["ipa_pulau_2010"]
    tulis_csv("ipa_pulau_2010.csv", ipa["_kolom"] + ["sumber", "label"], [r + [ipa["_sumber"], ipa["label"]] for r in ipa["baris"]])
    cat = ruj["cat_rusak_2023"]
    tulis_csv("cat_air_tanah_rusak.csv", ["cat", "prov_kode", "sumber", "label"], [[c, ";".join(p), cat["_sumber"], cat["label"]] for c, p in cat["daftar"]])
    ner = ruj["neraca_jawa"]
    tulis_csv("neraca_jawa.csv", ["besaran", "nilai", "satuan", "keterangan", "sumber", "label"], [r + [ner["_sumber"], ner["label"]] for r in ner["butir"]])
    return B, tautan


# --------------------------------------------------------------------------------------------- utama

def main():
    os.makedirs(OUT, exist_ok=True)
    ruj = json.load(open(RUJ, encoding="utf-8"))
    W, prov_nama, sumber_pend = wilayah()
    D_irbi, meta_irbi = irbi(W)
    agg, meta_dibi = dibi(W)
    am_prov, am_kab, leding, meta_am = air_minum(W)
    irg, rek_irg, bbws_kab, meta_irg = irigasi(W, ruj)
    Dam, meta_dam = bendungan(W, ruj)
    sub_rows, sub_titik, meta_sub = subsiden(W, ruj)
    ws_rows, ws_tautan = wilayah_sungai(W, ruj, prov_nama, bbws_kab, Dam)

    # --- tabel indikator 119 kab (Lampiran A kajian)
    kel = [n for n, _ in KELOMPOK]
    ws_c, ws_kand, bbws_di = defaultdict(list), Counter(), defaultdict(list)
    for t in ws_tautan:
        if t[4] == "C":
            ws_c[t[0]].append(t[3])
        elif t[2]:
            ws_kand[t[0]] += 1
        else:
            bbws_di[t[0]].append(t[5].split(" memegang")[0])
    sub_kab = defaultdict(list)    # hanya baris yang MENYEBUT kab itu; tidak diturunkan ke kab tetangga
    for r in sub_rows:
        for k in (r[2] or "").split(";"):
            if k and r[5] is not None:
                sub_kab[k].append((r[5], r[11]))
    K = (["kode", "nama", "nama_kepmendagri", "prov_kode", "prov_nama", "penduduk_worldpop_2026"] +
         [f"irbi2025_{h}" for h in H5] + ["irbi2025_total", "irbi2025_status"] + [f"irbi2024_{h}" for h in H5] +
         [f"dibi1525_kejadian_{g}" for g in kel] + ["dibi1525_meninggal_hilang_air", "dibi1525_mengungsi_air", "dibi1525_menderita_mengungsi_air",
                                                     "dibi1525_rumah_terendam_air"] +
         ["air_minum_layak_kab_2025", "air_minum_layak_prov_2025", "tingkat_data_air_minum"] +
         ["irigasi_pusat_ha", "irigasi_provinsi_ha", "irigasi_kabkota_ha", "irigasi_total_ha", "n_di_kabkota"] +
         ["n_bendungan_dalam_paket", "bendungan_nama", "subsiden_maks_cm_th_terverifikasi", "subsiden_semua_versi", "ws_kategori_c_disebut",
          "bbws_pemegang_di_pusat", "n_ws_kandidat_provinsi", "lon_pusat", "lat_pusat"])
    AIR = ["banjir", "rob", "longsor", "kekeringan", "gelombang_abrasi"]
    B = []
    for k in sorted(W):
        w = W[k]
        r25, r24 = D_irbi[(k, 2025)], D_irbi[(k, 2024)]
        dd = {g: dibi_ringkas(agg, k, g) for g in kel}
        dams = sorted(d["nama"] for d in Dam.values() if d["kab"] == k)
        B.append([k, w["nama"], w["nama_kepmendagri"], w["prov"], w["prov_nama"], w["penduduk"]] +
                 [r25[h] for h in H5] + [r25["total"], r25["status"]] + [r24[h] for h in H5] +
                 [r4(dd[g]["jumlah_kejadian"]) for g in kel] +
                 [int(sum(dd[g]["meninggal"] + dd[g]["hilang"] for g in AIR)), int(sum(dd[g]["mengungsi"] for g in AIR)),
                  int(sum(dd[g]["menderita_mengungsi"] for g in AIR)), int(sum(dd[g]["rumah_terendam"] for g in AIR))] +
                 [am_kab.get(k), am_prov[w["prov"]], "kab (BPS Jateng)" if k in am_kab else "provinsi saja"] +
                 [r2(irg[k]["pusat"]), r2(irg[k]["provinsi"]), r2(irg[k]["kabkota"]), r2(irg[k]["pusat"] + irg[k]["provinsi"] + irg[k]["kabkota"]),
                  int(irg[k]["n_di_kabkota"])] +
                 [len(dams), "; ".join(dams) or None, max((v for v, lab in sub_kab[k] if lab == LAB_T), default=None),
                  "; ".join(f"{v:g} ({lab})" for v, lab in sorted(set(sub_kab[k]))) or None, "; ".join(ws_c[k]) or None,
                  "; ".join(sorted(set(bbws_di[k]))) or None, ws_kand[k], w["lon"], w["lat"]])
    tulis_csv("kab_jawa.csv", K, B)
    KAB = {b[0]: dict(zip(K, b)) for b in B}

    # --- ringkasan provinsi
    KP = ["prov_kode", "prov_nama", "n_kab", "penduduk_worldpop_2026"] + [f"irbi2025_{h}_rerata" for h in H5] + \
         [f"irbi2025_{h}_berbobot_penduduk" for h in H5] + ["irbi2025_n_kab_tinggi"] + [f"dibi1525_kejadian_{g}" for g in kel] + \
         ["dibi1525_meninggal_hilang_air", "dibi1525_mengungsi_air", "air_minum_layak_2025", "air_minum_leding_2023",
          "irigasi_pusat_ha_rekap", "irigasi_provinsi_ha_rekap", "irigasi_kabkota_ha_rekap", "irigasi_total_ha_rekap", "irigasi_total_ha_tercetak",
          "irigasi_ha_tak_teratribusi_kab", "n_bendungan_dalam_paket", "n_kota_subsiden_literatur", "n_ws"]
    BP = []
    for p in JAWA:
        ks = [k for k in W if k[:2] == p]
        pop = sum(W[k]["penduduk"] for k in ks)

        def rr(h, bobot):
            v = [(D_irbi[(k, 2025)][h], W[k]["penduduk"]) for k in ks if D_irbi[(k, 2025)][h] is not None]
            if not v:
                return None
            return r4(sum(a * (b if bobot else 1) for a, b in v) / sum((b if bobot else 1) for _, b in v))
        rek = {kw: sum(r[4] for r in rek_irg if r[0] == kw and r[1] == p) for kw in ("pusat", "provinsi", "kabkota")}
        BP.append([p, prov_nama[p], len(ks), pop] + [rr(h, False) for h in H5] + [rr(h, True) for h in H5] +
                  [sum(D_irbi[(k, 2025)]["status"] == "Tinggi" for k in ks)] +
                  [r4(sum(KAB[k][f"dibi1525_kejadian_{g}"] for k in ks)) for g in kel] +
                  [sum(KAB[k]["dibi1525_meninggal_hilang_air"] for k in ks), sum(KAB[k]["dibi1525_mengungsi_air"] for k in ks),
                   am_prov[p], leding[p]] +
                  [rek["pusat"], rek["provinsi"], rek["kabkota"], sum(rek.values()),
                   sum(ruj["permen14_rekap"]["total_provinsi_tercetak"][kw].get(p, 0) for kw in ("pusat", "provinsi", "kabkota")),
                   r2(sum(r[7] for r in rek_irg if r[1] == p))] +
                  [sum(1 for d in Dam.values() if d["kab"] and d["kab"][:2] == p),
                   sum(1 for kk, kabs in ruj["subsiden_kota_kab"].items() if not kk.startswith("_") and kk != "pantura" and
                       ((kabs and kabs[0][:2] == p) or (kk == "jakarta" and p == "31"))),
                   sum(1 for w in ws_rows if p in w[3].split(";"))])
    tulis_csv("provinsi.csv", KP, BP)

    # --- peta
    fitur = []
    for k in sorted(W):
        props = {c: KAB[k][c] for c in K if c not in ("lon_pusat", "lat_pusat")}
        fitur.append({"type": "Feature", "properties": props, "geometry": W[k]["geom"]})
    json.dump({"type": "FeatureCollection", "name": "air_jawa_kab", "sumber_geometri": "public/geo/kabupaten/3[1-6].json", "features": fitur},
              open(os.path.join(OUT, "peta_kab.geojson"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    KB = TABEL["bendungan.csv"]["kolom"]
    json.dump({"type": "FeatureCollection", "name": "air_jawa_bendungan", "features": [
        {"type": "Feature", "properties": dict(zip(KB, b)), "geometry": {"type": "Point", "coordinates": [b[KB.index("lon")], b[KB.index("lat")]]}}
        for b in TABEL["bendungan.csv"]["baris"] if b[KB.index("lon")] is not None]},
        open(os.path.join(OUT, "peta_bendungan.geojson"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    KS = TABEL["subsiden_kota.csv"]["kolom"]
    fs = []
    for kunci, (x, y, ket) in sorted(sub_titik.items()):
        rs = [dict(zip(KS, r)) for r in sub_rows if r[0] == kunci]
        mx = [r["maks_cm_th"] for r in rs if r["maks_cm_th"] is not None]
        fs.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [r6(x), r6(y)]},
                   "properties": {"kota_kunci": kunci, "titik": ket, "n_sumber": len(rs), "maks_cm_th_terbesar": max(mx) if mx else None,
                                  "label_campuran": sorted({r["label"] for r in rs}), "sumber": rs}})
    json.dump({"type": "FeatureCollection", "name": "air_jawa_subsiden_literatur",
               "catatan": "Titik peraga per kota (bukan lokasi ukur). Angka per kota; jangan diturunkan ke kab lain.", "features": fs},
              open(os.path.join(OUT, "peta_subsiden.geojson"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    # --- air-jawa.json: cermin semua tabel + silsilah
    meta = {"paket": "air-jawa", "dibuat_oleh": "data/kajian-bnpb/bangun/air-jawa.py", "tanggal_bangun": TANGGAL,
            "label": {LAB_R: "instansi pemerintah, dokumen/API dibuka", LAB_T: "sumber primer non-pemerintah dibuka (abstrak jurnal)",
                      LAB_E: "keluaran model (tidak dipakai di paket ini)", LAB_A: "pilihan penyusun (kandidat WS per provinsi, nama sungai -> WS)",
                      LAB_S: "riset B: berita/ringkasan, sumber primer BELUM dibuka; jangan jadi angka utama",
                      "olah(x)": "hitungan penyusun dari angka berlabel x"},
            "wilayah": {"sumber_kode": "scripts/udara/kota.json (Kepmendagri 300.2.2-2138/2025)", "penduduk": sumber_pend},
            "irbi": meta_irbi, "dibi": meta_dibi, "air_minum": meta_am, "irigasi": meta_irg, "bendungan": meta_dam, "subsiden": meta_sub,
            "rujukan_sha1": sha1(RUJ)}
    json.dump({"meta": meta, "tabel": TABEL}, open(os.path.join(OUT, "air-jawa.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    # --- self-check: invarian lintas tabel
    assert len(B) == 119 and len(BP) == 6 and sum(b[2] for b in BP) == 119
    assert sum(b[3] for b in BP) == sum(w["penduduk"] for w in W.values())
    assert sum(b[KP.index("irigasi_total_ha_rekap")] for b in BP) == meta_irg["total_jawa_ha"] + 1
    assert abs(sum(KAB[k]["irigasi_total_ha"] for k in W) + sum(b[KP.index("irigasi_ha_tak_teratribusi_kab")] for b in BP) - (meta_irg["total_jawa_ha"] + 1)) < 0.05
    assert all(KAB[k]["irigasi_total_ha"] == 0 for k in W if k[:2] == "31"), "DKI tidak punya DI di Permen 14/2015"
    assert sum(1 for k in W if KAB[k]["irigasi_total_ha"] > 0) >= 100
    for g in kel:   # jumlah DIBI per kab = jumlah dari tabel tahunan
        assert abs(sum(KAB[k][f"dibi1525_kejadian_{g}"] for k in W) -
                   sum(a[0] for (kk, y, gg, ib), a in agg.items() if gg == g and ib == 1 and 2015 <= y <= 2025)) < 0.01   # pembulatan 4 desimal per kab
    # IRBI kosong = tidak dinilai InaRISK (mis. abrasi di kab tanpa pantai); dicatat, bukan diisi nol
    kosong = {h: [k for k in sorted(W) if KAB[k][f"irbi2025_{h}"] is None] for h in H5}
    assert not kosong["kekeringan"] and not kosong["cuaca_ekstrem"] and kosong["banjir"] == ["3101"], {h: len(v) for h, v in kosong.items()}
    meta["irbi"]["kosong_2025"] = kosong
    json.dump({"meta": meta, "tabel": TABEL}, open(os.path.join(OUT, "air-jawa.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    assert len(TABEL["bendungan.csv"]["baris"]) == meta_dam["n"] and all(b[KB.index("lon")] is not None for b in TABEL["bendungan.csv"]["baris"])
    for f in os.listdir(OUT):
        if f.endswith(".csv"):
            teks = open(os.path.join(OUT, f), encoding="utf-8").read().lower()
            assert not re.search(r"(^|,)(nan|inf|-inf|none|null)(,|$)", teks, re.M), f"nilai kosong tak sah di {f}"

    print(f"air-jawa: {len(W)} kab, {len(BP)} provinsi, {len(ws_rows)} WS, {meta_dam['n']} bendungan, {len(sub_rows)} baris subsiden")
    print(f"  IRBI {meta_irbi['silang_paket_irbi']}")
    print(f"  DIBI {meta_dibi['baris']} baris {meta_dibi['tahun']}, kejadian {meta_dibi['jumlah_kejadian']}")
    print(f"  irigasi: {meta_irg['n_subtotal_kab']} subtotal kab, {meta_irg['n_di_pusat_jawa']} DI pusat, {meta_irg['n_di_provinsi_jawa']} DI provinsi; "
          f"tak teratribusi {sum(r[7] for r in rek_irg):.2f} ha dari {meta_irg['total_jawa_ha']}")
    for r in rek_irg:
        if r[7]:
            print(f"    sisa {r[0]:8} {r[1]} {r[2]:9}: {r[7]:+} ha")
    for b in TABEL["bendungan.csv"]["baris"]:
        if "PERAGA" in (b[-1] or "") or "ditolak" in (b[-1] or "") or "bukan" in (b[-1] or ""):
            print(f"  bendungan {b[0]}: {b[-2]} | {b[-1]}")
    print("self-check hijau")


if __name__ == "__main__":
    if sys.argv[1:] == ["tarik"]:
        tarik()
    else:
        main()
