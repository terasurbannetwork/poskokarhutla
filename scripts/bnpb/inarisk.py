"""Cermin InaRISK BNPB -> public/data/inarisk/*.json (tiket IR-01; dijalankan TANGAN atau mingguan, bukan di setiap CI).

  python3 scripts/bnpb/inarisk.py tarik    # jaringan, ~1.050 panggilan, berjeda 0,4 dtk per jalur x 4 jalur, bisa dilanjutkan
  python3 scripts/bnpb/inarisk.py bangun   # cache -> keluaran lewat berkas sementara, self-check dulu, baru dipindah
  python3 scripts/bnpb/inarisk.py --cek    # self-check tanpa jaringan: fixture kecil + keluaran nyata bila ada

Rancangan: data/kajian-bnpb/inarisk/ (KEPUTUSAN, RISET, ALUR A1, DESAIN-TEKNIS "Bentuk JSON cermin").
Sumber: InaRISK BNPB (lisensi tidak tertulis, sebut sumbernya, jangan klaim terbuka). Cache: data/raw/inarisk/ (gitignored).
Tanpa data pribadi: hanya angka agregat per kab/kota dan teks rekomendasi.
"""
import json, os, sys, time, datetime, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CACHE = os.path.join(AKAR, "data", "raw", "inarisk")
KELUAR = os.path.join(AKAR, "public", "data", "inarisk")
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture", "inarisk")
BASE = "https://inarisk.bnpb.go.id/apiv4/"
GEO_URL = "https://inarisk.bnpb.go.id/v4/topojson/kabupaten-small.geojson"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
JEDA, JALUR = 0.4, 4
TAHUN = list(range(2015, 2026))
KOLOM = ["total", "gempabumi", "tsunami", "banjir", "longsor", "gunungapi", "karlahut", "kekeringan", "cuaca_ekstrem", "abrasi"]
FILES = ("irbi", "jiwa", "ikd", "tautan")


def ambil(url, coba=4):
    """Teks balasan, atau None bila 404 (tak ada datanya). 5xx/timeout diulang dengan jeda bertambah."""
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            err = e
        except Exception as e:
            err = e
        if i == coba - 1:
            raise err
        print(f"ulang {url}: {err}", file=sys.stderr)
        time.sleep(5 * (i + 1))


def tulis_cache(nama, teks):
    os.makedirs(CACHE, exist_ok=True)
    with open(os.path.join(CACHE, nama), "w", encoding="utf-8") as f:
        f.write("" if teks is None else teks)  # berkas kosong = 404 (tak ada analisa)


def baca_cache(nama):
    p = os.path.join(CACHE, nama)
    if not os.path.exists(p):
        return False, None
    with open(p, encoding="utf-8") as f:
        t = f.read()
    return True, (t or None)


def tarik_satu(nama, url):
    """Ambil bila belum di cache. Mengembalikan True bila memanggil jaringan."""
    ada, _ = baca_cache(nama)
    if ada:
        return False
    tulis_cache(nama, ambil(url))
    time.sleep(JEDA)
    return True


def j(teks):
    return json.loads(teks) if teks else None


# ---------------------------------------------------------------- parser murni

def num(v, nd=2):
    return round(v, nd) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def bangun_irbi(baris, kab, prov):
    """NDJSON IRBI -> irbi.json. Total = fix_values ?? total. status & pembanding hanya 2025."""
    nilai, status, pemb = {}, {}, {}
    for b in baris:
        b = b.strip()
        if not b:
            continue
        o = json.loads(b)
        if o.get("type") != "row":
            continue
        d = o["data"]
        k, t = d["pcode"], d["tahun"]
        total = d.get("fix_values") if d.get("fix_values") is not None else d.get("total")
        v = [num(total)] + [num(d.get(c)) for c in KOLOM[1:]]
        nilai.setdefault(k, {})[str(t)] = v
        if t == 2025:
            if d.get("status") in ("Tinggi", "Sedang", "Rendah"):
                status[k] = d["status"]
            if d.get("pembanding") is not None:
                pemb[k] = num(d["pembanding"])
    return {"tahun": TAHUN, "kolom": KOLOM, "kab": {k: [n, k[:2]] for k, n in kab.items()}, "prov": prov,
            "nilai": nilai, "status": status, "pembanding": pemb}


def bangun_jiwa(mentah):
    """mentah: {pcode: dict balasan data-jiwa-terpapar}. Katalog bencana dari balasan pertama; tiap kab diurut menurut id katalog."""
    kat, kab = None, {}
    for k in sorted(mentah):
        d = mentah[k]
        ids = [(b["id"], b["nama"]) for b in d["bencana"]]
        if kat is None:
            kat = ids
        assert ids == kat, f"katalog bencana jiwa beda di {k}"
        kab[k] = {"penduduk": d.get("penduduk"), "terpapar": [b["jiwa_terpapar"] for b in d["bencana"]]}
    return {"bencana": [{"id": i, "nama": n} for i, n in (kat or [])], "kab": kab}


def bangun_ikd(baris_daftar, analisa):
    """baris_daftar: baris API data-ikd (kab dan provinsi); analisa: {(pcode, tahun): data-ikd detail}. Katalog teks tanpa duplikat."""
    seen, daftar = set(), []
    for r in baris_daftar:
        key = (r["id_wilayah"], r["tahun"])
        if key in seen:
            continue
        seen.add(key)
        daftar.append([r["id_wilayah"], r["nama_wilayah"], r["nama_provinsi"], r["tahun"], num(r["indeks_kab"], 4),
                       (r.get("tingkat_kapasitas") or "").capitalize()])
    daftar.sort(key=lambda x: (x[0], x[3]))
    prio, ind, aks, ix_i, ix_a, an = None, [], [], {}, {}, {}
    for (k, t) in sorted(analisa):
        d = analisa[(k, t)]
        pr = sorted(d["prioritas"], key=lambda p: p["id"])
        nama_pr = [p["nama"] for p in pr]
        if prio is None:
            prio = nama_pr
        assert nama_pr == prio, f"nama prioritas beda di {k}/{t}"
        rek = []
        for r in sorted(d["rekomendasi"], key=lambda r: r["id"]):
            for a in r["aksi"]:
                if a["indikator"] not in ix_i:
                    ix_i[a["indikator"]] = len(ind)
                    ind.append(a["indikator"])
                if a["teks"] not in ix_a:
                    ix_a[a["teks"]] = len(aks)
                    aks.append(a["teks"])
                rek.append([r["id"], ix_i[a["indikator"]], ix_a[a["teks"]]])
        an[f"{k}/{t}"] = {"indeks": num(d["indeks_kab"], 4), "nilai": [num(p["nilai"], 3) for p in pr], "rek": rek}
    return {"tahun_tersedia": sorted({x[3] for x in daftar}), "daftar": daftar, "prioritas": prio or [],
            "indikator": ind, "aksi": aks, "analisa": an}


def bangun_tautan(rows):
    return {"baris": [{"judul": r["title"], "kategori": r["category"], "url": r["url"], "deskripsi": r.get("description")}
                      for r in sorted(rows, key=lambda r: (r.get("sort_order") or 0, r["id"])) if r.get("is_active", True)]}


def merc(x, y):
    import math
    lon = x / 6378137.0 * 180 / math.pi
    lat = (2 * math.atan(math.exp(y / 6378137.0)) - math.pi / 2) * 180 / math.pi
    return [round(lon, 3), round(lat, 3)]


def bangun_geo(geo, kab):
    """Batas InaRISK (EPSG:3857) -> lon/lat 3 desimal, properti {pcode, nama}. Titik kembar berurutan dibuang."""
    fit = []
    for f in geo["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        out = []
        for poly in polys:
            cin = []
            for ring in poly:
                r = []
                for x, y in ring:
                    p = merc(x, y)
                    if not r or r[-1] != p:
                        r.append(p)
                if len(r) >= 4:
                    cin.append(r)
            if cin:
                out.append(cin)
        k = str(f["properties"]["ID_W"])
        fit.append({"type": "Feature", "properties": {"pcode": k, "nama": kab.get(k) or f["properties"]["name"]},
                    "geometry": {"type": "MultiPolygon", "coordinates": out}})
    return {"type": "FeatureCollection", "features": fit}


# ---------------------------------------------------------------- self-check

def periksa_langkat(irbi, jiwa, ikd):
    """Angka Langkat (1205) yang sama dengan layar InaRISK 23 Nov 2026; berlaku untuk fixture dan data penuh."""
    assert irbi["nilai"]["1205"]["2025"][0] == 231.47, irbi["nilai"]["1205"]["2025"]
    assert jiwa["kab"]["1205"]["penduduk"] == 1057605
    a = ikd["analisa"]["1205/2025"]
    assert round(a["indeks"], 2) == 0.30 and len(a["nilai"]) == 7, a["indeks"]
    assert ikd["prioritas"][0] == "Perkuatan Kebijakan Dan Kelembagaan"


BOBOT_IKD = (0.06, 0.06, 0.075, 0.105, 0.21, 0.35, 0.14)


def periksa_rek(ikd):
    ni, na, npri = len(ikd["indikator"]), len(ikd["aksi"]), len(ikd["prioritas"])
    assert len(set(ikd["indikator"])) == ni and len(set(ikd["aksi"])) == na, "katalog berduplikat"
    for kunci, a in ikd["analisa"].items():
        assert len(a["nilai"]) == npri, kunci
        for p, i, s in a["rek"]:
            assert 1 <= p <= npri and 0 <= i < ni and 0 <= s < na, (kunci, p, i, s)
        # rumus IKD terukur (KEPUTUSAN D11, sama dengan BOBOT_IKD di public/bnpb/inarisk_hitung.js): bila InaRISK mengubah bobot, cek ini merah
        if a.get("indeks") is not None and all(v is not None for v in a["nilai"]):
            hit = sum(w * v for w, v in zip(BOBOT_IKD, a["nilai"]))
            assert abs(hit - a["indeks"]) <= 0.001, f"{kunci}: rumus IKD {hit:.4f} lawan indeks {a['indeks']:.4f}"


def periksa_penuh(irbi, jiwa, ikd, tautan, geo):
    kab = irbi["kab"]
    assert len(kab) == 514, len(kab)
    for k in kab:
        assert sorted(irbi["nilai"][k]) == [str(t) for t in TAHUN], f"{k} tak punya 11 tahun"
    from collections import Counter
    c = Counter(irbi["status"].values())
    assert c["Tinggi"] == 169 and c["Sedang"] == 345 and sum(c.values()) == 514, c
    t25 = [irbi["nilai"][k]["2025"][0] for k in kab]
    t25 = [v for v in t25 if v]
    assert round(sum(t25) / len(t25), 2) == 147.95, sum(t25) / len(t25)
    periksa_langkat(irbi, jiwa, ikd)
    periksa_rek(ikd)
    assert len(tautan["baris"]) == 7, len(tautan["baris"])
    assert len(geo["features"]) == 514
    assert {f["properties"]["pcode"] for f in geo["features"]} == set(kab), "pcode batas tak cocok IRBI"
    assert any(x[0] == "12" for x in ikd["daftar"]), "baris IKD provinsi hilang"


def cek_fixture():
    def f(n):
        with open(os.path.join(FIX, n), encoding="utf-8") as h:
            return h.read()
    kab, prov = {"1205": "Langkat"}, {"12": "Sumatera Utara"}
    irbi = bangun_irbi(f("irbi.ndjson").splitlines(), kab, prov)
    jiwa = bangun_jiwa({"1205": json.loads(f("jiwa_1205.json"))})
    rows = json.loads(f("ikd_daftar_1205.json"))["data"]["rows"]
    ikd = bangun_ikd(rows, {("1205", 2025): json.loads(f("ikd_1205_2025.json"))["data"]})
    assert sorted(irbi["nilai"]["1205"]) == [str(t) for t in TAHUN]
    assert irbi["status"].get("1205") in ("Tinggi", "Sedang")
    periksa_langkat(irbi, jiwa, ikd)
    periksa_rek(ikd)
    assert len(ikd["analisa"]["1205/2025"]["rek"]) == 9 + 4 + 13 + 5 + 6 + 13 + 4
    assert merc(0, 0) == [0.0, 0.0]


def cek():
    cek_fixture()
    print("fixture Langkat: ok")
    if all(os.path.exists(os.path.join(KELUAR, n)) for n in ("irbi.json", "jiwa.json", "ikd.json", "tautan.json", "kab.geojson")):
        m = {n: json.load(open(os.path.join(KELUAR, n + ".json"), encoding="utf-8")) for n in FILES}
        periksa_penuh(m["irbi"], m["jiwa"], m["ikd"], m["tautan"], json.load(open(os.path.join(KELUAR, "kab.geojson"), encoding="utf-8")))
        print("keluaran nyata: ok")
    else:
        print("keluaran nyata belum ada: lewati")


# ---------------------------------------------------------------- tarik / bangun

def daftar_pcode():
    _, t = baca_cache("kabupaten.json")
    return [x["id_kabupaten"] for x in j(t)]


def tahun_terakhir_ikd(baris):
    """{pcode kab: tahun terakhir di daftar}; id 4 digit = kab/kota, 2 digit = provinsi."""
    out = {}
    for r in baris:
        k = r["id_wilayah"]
        if len(k) == 4:
            out[k] = max(out.get(k, 0), r["tahun"])
    return out


def tahun_kab(baris):
    """{kode kab (4 digit) dan provinsi (2 digit): [tahun menurun]} dari daftar IKD."""
    out = {}
    for r in baris:
        if len(r["id_wilayah"]) in (2, 4):
            out.setdefault(r["id_wilayah"], set()).add(r["tahun"])
    return {k: sorted(v, reverse=True) for k, v in out.items()}


def analisa_ada(k, t):
    """Isi analisa dari cache bila ada rekomendasinya, selain itu None."""
    ada, tx = baca_cache(f"ikd_{k}_{t}.json")
    d = (j(tx) or {}).get("data", {}) if ada and tx else {}
    return d if d.get("rekomendasi") else None


def tarik_analisa(kt):
    """Tahun terbaru dulu, mundur sampai ada analisa. Mengembalikan jumlah gagal (0 = mulus)."""
    k, tahun = kt
    try:
        for t in tahun:
            tarik_satu(f"ikd_{k}_{t}.json", BASE + f"data-ikd/{k}/{t}")
            if analisa_ada(k, t):
                break
        return 0
    except Exception as e:
        print(f"GAGAL ikd {k}: {e}", file=sys.stderr)
        return 1


def baca_daftar_ikd():
    baris, p = [], 1
    while True:
        ada, t = baca_cache(f"ikd_daftar_{p}.json")
        if not ada:
            break
        d = j(t)["data"]
        baris += d["rows"]
        if p >= d["pagination"]["total_page"]:
            break
        p += 1
    return baris


def tarik():
    t0, n = time.time(), 0
    for nama, jalur in (("irbi.ndjson", "data-irbi-full"), ("provinsi.json", "provinsi"), ("kabupaten.json", "kabupaten"),
                        ("external-links.json", "external-links?limit=100")):
        n += tarik_satu(nama, BASE + jalur)
    n += tarik_satu("kab.geojson", GEO_URL)
    p = 1
    while True:
        tarik_satu(f"ikd_daftar_{p}.json", BASE + f"data-ikd?per_page=100&page={p}")
        tp = j(baca_cache(f"ikd_daftar_{p}.json")[1])["data"]["pagination"]["total_page"]
        if p >= tp:
            break
        p += 1
    tugas = [(f"jiwa_{k}.json", BASE + f"data-jiwa-terpapar/{k}") for k in daftar_pcode()]
    tugas = [x for x in tugas if not baca_cache(x[0])[0]]
    print(f"{len(tugas)} panggilan jiwa tersisa")
    galat = 0

    def kerja(x):
        try:
            return tarik_satu(*x)
        except Exception as e:
            print(f"GAGAL {x[0]}: {e}", file=sys.stderr)
            return None
    with ThreadPoolExecutor(JALUR) as ex:
        for i, r in enumerate(ex.map(kerja, tugas), 1):
            galat += r is None
            if i % 100 == 0:
                print(f"  {i}/{len(tugas)}")
    with ThreadPoolExecutor(JALUR) as ex:
        galat += sum(ex.map(tarik_analisa, sorted(tahun_kab(baca_daftar_ikd()).items())))
    print(f"tarik selesai: {len(tugas)} diproses, {galat} gagal (jalankan lagi untuk melanjutkan), {time.time() - t0:.0f} dtk")
    return galat


def bangun():
    def teks(n):
        ada, t = baca_cache(n)
        assert ada and t, f"cache {n} belum ada: jalankan tarik"
        return t
    kab = {x["id_kabupaten"]: x["nama_kabupaten"] for x in j(teks("kabupaten.json"))}
    prov = {x["id_provinsi"]: x["nama_provinsi"] for x in j(teks("provinsi.json"))}
    irbi = bangun_irbi(teks("irbi.ndjson").splitlines(), kab, prov)
    jiwa_mentah, tanpa_jiwa = {}, []
    for k in kab:
        ada, t = baca_cache(f"jiwa_{k}.json")
        (jiwa_mentah.__setitem__(k, j(t)) if ada and t else tanpa_jiwa.append(k))
    baris = baca_daftar_ikd()
    analisa, tanpa_ikd = {}, []
    for k, tahun in tahun_kab(baris).items():
        t = next((t for t in tahun if analisa_ada(k, t)), None)
        if t:
            analisa[(k, t)] = analisa_ada(k, t)
        else:
            tanpa_ikd.append(k)
    jiwa, ikd = bangun_jiwa(jiwa_mentah), bangun_ikd(baris, analisa)
    tautan = bangun_tautan(j(teks("external-links.json"))["data"]["rows"])
    geo = bangun_geo(j(teks("kab.geojson")), kab)
    miring = sorted(set(irbi["kab"]) ^ {f["properties"]["pcode"] for f in geo["features"]})
    if miring:
        print(f"PERINGATAN pcode batas vs IRBI tak cocok: {miring}")
    periksa_penuh(irbi, jiwa, ikd, tautan, geo)
    tgl = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    for d in (irbi, jiwa, ikd, tautan):
        d.update({"dibuat": tgl, "sumber": "InaRISK BNPB (inarisk.bnpb.go.id)"})
    os.makedirs(KELUAR, exist_ok=True)
    isi = {"irbi.json": irbi, "jiwa.json": jiwa, "ikd.json": ikd, "tautan.json": tautan, "kab.geojson": geo}
    for n, d in isi.items():
        with open(os.path.join(KELUAR, n + ".tmp"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    for n in isi:  # semua lolos cek dan tertulis: baru pindahkan
        os.replace(os.path.join(KELUAR, n + ".tmp"), os.path.join(KELUAR, n))
        print(f"{n}: {os.path.getsize(os.path.join(KELUAR, n)) / 1024:.0f} KB")
    print(f"kab tanpa jiwa: {len(tanpa_jiwa)}; kab tanpa analisa IKD: {len(tanpa_ikd)} dari {len(tahun_terakhir_ikd(baris))} kab di daftar; "
          f"kab di IRBI tanpa baris IKD: {len(set(kab) - set(tahun_terakhir_ikd(baris)))}; baris IKD {len(ikd['daftar'])}")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "--cek"
    if a == "tarik":
        sys.exit(1 if tarik() else 0)
    elif a == "bangun":
        bangun()
    elif a == "--cek":
        cek()
    else:
        sys.exit(__doc__)
