"""Cermin InaRISK BNPB -> public/data/inarisk/*.json (tiket IR-01; dijalankan TANGAN atau mingguan, bukan di setiap CI).

  python3 scripts/bnpb/inarisk.py tarik    # jaringan, ~1.050 panggilan, berjeda 0,4 dtk per jalur x 4 jalur, bisa dilanjutkan
  python3 scripts/bnpb/inarisk.py bangun   # cache -> keluaran lewat berkas sementara, self-check dulu, baru dipindah;
                                           # tak berubah = tak ditulis; berubah = perubahan.json (IR-09, workflow inarisk.yml mingguan)
  python3 scripts/bnpb/inarisk.py --cek    # self-check tanpa jaringan: fixture kecil + keluaran nyata bila ada

Rancangan: data/kajian-bnpb/inarisk/ (KEPUTUSAN, RISET, ALUR A1, DESAIN-TEKNIS "Bentuk JSON cermin").
Sumber: InaRISK BNPB (lisensi tidak tertulis, sebut sumbernya, jangan klaim terbuka). Cache: data/raw/inarisk/ (gitignored).
Tanpa data pribadi: hanya angka agregat per kab/kota dan teks rekomendasi.
"""
import csv, json, math, os, sys, time, datetime, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CACHE = os.path.join(AKAR, "data", "raw", "inarisk")
KELUAR = os.path.join(AKAR, "public", "data", "inarisk")
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture", "inarisk")
BASE = "https://inarisk.bnpb.go.id/apiv4/"
GEO_URL = "https://inarisk.bnpb.go.id/v4/topojson/kabupaten-small.geojson"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
JEDA, JALUR = 0.4, 4
TAHUN = list(range(2015, 2026))   # tahun fixture; data penuh memakai tahun yang ada di NDJSON (InaRISK bisa menambah tahun)
KOLOM = ["total", "gempabumi", "tsunami", "banjir", "longsor", "gunungapi", "karlahut", "kekeringan", "cuaca_ekstrem", "abrasi"]
FILES = ("irbi", "jiwa", "ikd", "tautan", "spab", "uji_dibi")
SPAB_URL = "https://inarisk2.bnpb.go.id/spab/api/get-data/"
SPAB_KOLOM = ["sekolah", "pilar1", "pilar2", "pilar3", "capaian", "optimal", "belum", "tidak"]
DIBI_DIR = os.path.join(AKAR, "data", "kajian-bnpb", "data", "skenario-hidromet")


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
    """NDJSON IRBI -> irbi.json. Total = fix_values ?? total. status & pembanding hanya tahun terakhir."""
    rows = []
    for b in baris:
        b = b.strip()
        if not b:
            continue
        o = json.loads(b)
        if o.get("type") == "row":
            rows.append(o["data"])
    tahun = sorted({d["tahun"] for d in rows})
    akhir = tahun[-1] if tahun else None
    nilai, status, pemb = {}, {}, {}
    for d in rows:
        k, t = d["pcode"], d["tahun"]
        total = d.get("fix_values") if d.get("fix_values") is not None else d.get("total")
        v = [num(total)] + [num(d.get(c)) for c in KOLOM[1:]]
        nilai.setdefault(k, {})[str(t)] = v
        if t == akhir:
            if d.get("status") in ("Tinggi", "Sedang", "Rendah"):
                status[k] = d["status"]
            if d.get("pembanding") is not None:
                pemb[k] = num(d["pembanding"])
    return {"tahun": tahun, "kolom": KOLOM, "kab": {k: [n, k[:2]] for k, n in kab.items()}, "prov": prov,
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


def bangun_spab(per_prov, gagal):
    """per_prov: {kode provinsi: balasan spab get-data}. Hanya kab yang punya sekolah melapor; kab lain = belum ada data (BUKAN 0).
    Kode wilayah SPAB = Kemendagri seperti IRBI (Aceh 1101 punya 18 kecamatan = Aceh Selatan)."""
    kab = {}
    for p in sorted(per_prov):
        for k, v in per_prov[p]["tabel"]["wilayah"].items():
            if len(k) != 4 or not v.get("sekolah"):
                continue
            kab[k] = [v["sekolah"]] + [num(v[c], 3) for c in SPAB_KOLOM[1:5]] + [v["optimal"], v["belum"], v["tidak"]]
    return {"kolom": SPAB_KOLOM, "kab": kab, "gagal": sorted(gagal)}


# ---- uji IRBI lawan DIBI (K6 butir 5): milik kita, bukan InaRISK
JENIS_DIBI = {  # kolom IRBI -> jenis DIBI (cuplikan skenario-hidromet; banjir_longsor sengaja masuk dua sisi)
    "banjir": ("banjir", "banjir_bandang", "banjir_longsor"), "longsor": ("longsor", "banjir_longsor"),
    "gempabumi": ("gempa", "gempa_tsunami"), "tsunami": ("tsunami", "gempa_tsunami"), "gunungapi": ("gunungapi",),
    "karlahut": ("karhutla",), "kekeringan": ("kekeringan",), "cuaca_ekstrem": ("cuaca_ekstrem",), "abrasi": ("gelombang_abrasi",),
}
HASIL = ("kejadian", "korban", "mengungsi", "rumah_rusak")


def f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def agregat_dibi(baris):
    """{(kode, tahun, jenis): [kejadian, meninggal+hilang, mengungsi, rumah_rusak]}; baris tak ada = tak tercatat."""
    out = {}
    for r in baris:
        a = out.setdefault((r["kode"], int(r["tahun"]), r["jenis"]), [0.0] * 4)
        for i, v in enumerate((f(r["kejadian"]), f(r["meninggal"]) + f(r["hilang"]), f(r["mengungsi"]), f(r["rumah_rusak"]))):
            a[i] += v
    return out


def peringkat(v):
    """Peringkat 1..n, seri dirata-rata."""
    urut = sorted(range(len(v)), key=lambda i: v[i])
    r, i = [0.0] * len(v), 0
    while i < len(urut):
        j2 = i
        while j2 + 1 < len(urut) and v[urut[j2 + 1]] == v[urut[i]]:
            j2 += 1
        for t in range(i, j2 + 1):
            r[urut[t]] = (i + j2) / 2 + 1
        i = j2 + 1
    return r


def spearman(x, y):
    """Korelasi peringkat; None bila salah satu konstan atau n < 3."""
    if len(x) != len(y) or len(x) < 3:
        return None
    a, b = peringkat(x), peringkat(y)
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    sa = math.sqrt(sum((i - ma) ** 2 for i in a))
    sb = math.sqrt(sum((i - mb) ** 2 for i in b))
    return None if sa == 0 or sb == 0 else sum((i - ma) * (j - mb) for i, j in zip(a, b)) / (sa * sb)


def kena_atas(kode, v, persen=0.2):
    """Himpunan kab di quintile teratas (seri dipecah menurut kode). None bila nilai ambang 0 (seri nol tak bermakna)."""
    k = math.ceil(len(kode) * persen)
    urut = sorted(range(len(kode)), key=lambda i: (-v[i], kode[i]))
    return None if v[urut[k - 1]] <= 0 else {kode[i] for i in urut[:k]}


def hit(kode, pred, nyata):
    a, b = kena_atas(kode, pred), kena_atas(kode, nyata)
    return None if a is None or b is None else len(a & b) / len(b)


def r3(v):
    return None if v is None else round(v, 3)


def uji_dibi(irbi, agg, tahun_dibi_maks):
    """Tahun IRBI Y (2015..2024, dasar 2015) meramal DIBI Y+1; 2025 (dasar 2021) hanya tahun sama (Y+1 baru separuh jalan).
    Pembanding: persistensi = peringkat DIBI tahun Y (tahun sama: tahun Y-1). Murni, tanpa berkas."""
    kab = sorted(irbi["kab"])
    tabel = {}
    for (k, t, _), v in agg.items():
        a_ = tabel.setdefault((k, t), [0.0] * 4)
        for i in range(4):
            a_[i] += v[i]
    for k in kab:
        for t in range(2008, tahun_dibi_maks + 1):
            tabel.setdefault((k, t), [0.0] * 4)
    def per(t, jenis):
        return {k: [sum(agg.get((k, t, j2), [0] * 4)[i] for j2 in jenis) for i in range(4)] for k in kab}
    baris = []
    for y in irbi["tahun"]:
        sama = y == irbi["tahun"][-1]
        sasaran = y if sama else y + 1
        dasar = y - 1 if sama else y
        if sasaran > tahun_dibi_maks - 1 and not sama:  # tahun DIBI terakhir masih berjalan: tak dipakai sebagai sasaran
            continue
        skor = [irbi["nilai"][k][str(y)][0] for k in kab]
        rec = {"tahun_irbi": y, "dasar": "HV2021" if y >= 2025 else "HV2015", "tahun_dibi": sasaran,
               "cara": "tahun sama" if sama else "tahun berikut", "n": len(kab), "total": {}, "jenis": {}}
        for i, h in enumerate(HASIL):
            n_ = [tabel[(k, sasaran)][i] for k in kab]
            p_ = [tabel[(k, dasar)][i] for k in kab]
            rec["total"][h] = {"rho_irbi": r3(spearman(skor, n_)), "rho_persisten": r3(spearman(p_, n_)),
                               "hit_irbi": r3(hit(kab, skor, n_)), "hit_persisten": r3(hit(kab, p_, n_))}
        ki = irbi["kolom"]
        for c, js in JENIS_DIBI.items():
            ix = ki.index(c)
            ada = [k for k in kab if irbi["nilai"][k][str(y)][ix] is not None]
            if len(ada) < 30:
                continue
            sc = [irbi["nilai"][k][str(y)][ix] for k in ada]
            n_ = per(sasaran, js)
            p_ = per(dasar, js)
            rec["jenis"][c] = {"n": len(ada), "rho_irbi": r3(spearman(sc, [n_[k][0] for k in ada])),
                               "rho_persisten": r3(spearman([p_[k][0] for k in ada], [n_[k][0] for k in ada]))}
        baris.append(rec)
    return {"hasil": list(HASIL), "tahun_dibi_maks": tahun_dibi_maks, "baris": baris, "vonis": vonis_uji(baris)}


def vonis_uji(baris):
    """Kalimat vonis dari angka, per dasar; HV2015 dan HV2021 tidak dirata-ratakan."""
    out = []
    for dasar in ("HV2015", "HV2021"):
        b = [r for r in baris if r["dasar"] == dasar]
        for h in ("kejadian", "korban"):
            ok = [r for r in b if r["total"][h]["rho_irbi"] is not None and r["total"][h]["rho_persisten"] is not None]
            if not ok:
                continue
            menang = sum(1 for r in ok if r["total"][h]["rho_irbi"] > r["total"][h]["rho_persisten"])
            rata = sum(r["total"][h]["rho_irbi"] for r in ok) / len(ok)
            out.append(f"{dasar}, {h}: IRBI lebih baik dari persistensi di {menang} dari {len(ok)} tahun (rerata korelasi peringkat IRBI {rata:.2f}).".replace(f"{rata:.2f}", f"{rata:.2f}".replace(".", ",")))
    return out


def baca_dibi():
    baris = []
    for n in ("dibi_kab_tahun.csv", "dibi_geologi_kab_tahun.csv"):
        with open(os.path.join(DIBI_DIR, n), encoding="utf-8") as h:
            baris += list(csv.DictReader(h))
    return baris


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


def periksa_spab(spab, kode_kab):
    assert spab["kolom"] == SPAB_KOLOM and spab["kab"], "spab kosong"
    assert set(spab["kab"]) <= kode_kab, f"kode SPAB di luar IRBI: {sorted(set(spab['kab']) - kode_kab)[:5]}"
    for k, v in spab["kab"].items():
        assert v[0] > 0 and all(x is None or 0 <= x <= 1 for x in v[1:5]), (k, v)
        assert v[5] + v[6] + v[7] <= v[0], (k, v)


def periksa_penuh(irbi, jiwa, ikd, tautan, geo, spab=None, uji=None):
    kab = irbi["kab"]
    assert len(kab) == 514, len(kab)
    for k in kab:
        assert sorted(irbi["nilai"][k]) == [str(t) for t in irbi["tahun"]], f"{k} tak punya semua tahun"
    assert irbi["tahun"][0] == 2015 and irbi["tahun"][-1] >= 2025, irbi["tahun"]
    # angka yang dipatok ke layar InaRISK 23 Nov 2026 (rerata 147,95, Tinggi 169, Langkat 231,47) tinggal di cek_fixture dan
    # tests/bnpb/inarisk_hitung.test.mjs: data penuh boleh berubah mingguan (IR-09), yang dijaga di sini bentuknya
    assert len(irbi["status"]) == 514 and set(irbi["status"].values()) <= {"Tinggi", "Sedang", "Rendah"}, len(irbi["status"])
    assert "1205" in jiwa["kab"] and any(k.startswith("1205/") for k in ikd["analisa"]), "Langkat hilang"
    periksa_rek(ikd)
    assert tautan["baris"], "tautan kosong"
    assert len(geo["features"]) == 514
    assert {f["properties"]["pcode"] for f in geo["features"]} == set(kab), "pcode batas tak cocok IRBI"
    assert any(x[0] == "12" for x in ikd["daftar"]), "baris IKD provinsi hilang"
    if spab is not None:
        periksa_spab(spab, set(kab))
    if uji is not None:
        assert uji["baris"] and uji["vonis"], "uji DIBI kosong"


def beda(lama, baru):
    """Kalimat perubahan antara dua set keluaran {irbi, jiwa, ikd, tautan, geo}; [] = sama. Murni, tanpa berkas."""
    out, A = [], lambda n: lama.get(n) or {}
    li, bi = A("irbi"), baru["irbi"]
    th = sorted(set(bi["tahun"]) - set(li.get("tahun", [])))
    if th:
        out.append(f"Tahun IRBI baru: {', '.join(map(str, th))}.")
    for t in bi["tahun"]:
        if t in th:
            continue
        n = sum(1 for k, v in bi["nilai"].items() if (li.get("nilai", {}).get(k, {}).get(str(t)) or [None])[0] != v.get(str(t), [None])[0])
        if n:
            out.append(f"Skor IRBI {t} berubah di {n} kab/kota.")
    ls = li.get("status", {})
    st = [(k, ls.get(k), v) for k, v in sorted(bi["status"].items()) if ls.get(k) != v]
    if st:
        contoh = "; ".join(f"{bi['kab'].get(k, [k])[0]} {a or 'belum ada'} ke {b}" for k, a, b in st[:5])
        out.append(f"Kelas risiko berubah di {len(st)} kab/kota: {contoh}{'; dan lainnya' if len(st) > 5 else ''}.")
    lk = A("ikd")
    lama_ikd = {(x[0], x[3]): x[4] for x in lk.get("daftar", [])}
    baru_ikd = {(x[0], x[3]): x[4] for x in baru["ikd"]["daftar"]}
    n_baru = len(set(baru_ikd) - set(lama_ikd))
    n_ubah = sum(1 for k in set(baru_ikd) & set(lama_ikd) if baru_ikd[k] != lama_ikd[k])
    if n_baru:
        out.append(f"Baris IKD baru: {n_baru} wilayah-tahun.")
    if n_ubah:
        out.append(f"Nilai IKD berubah di {n_ubah} wilayah-tahun.")
    if lk.get("analisa") is not None and lk.get("analisa") != baru["ikd"]["analisa"]:
        out.append("Analisa prioritas dan rekomendasi IKD berubah.")
    lj = A("jiwa").get("kab", {})
    nj = sum(1 for k, v in baru["jiwa"]["kab"].items() if lj.get(k) != v)
    if nj:
        out.append(f"Jiwa terpapar atau penduduk berubah di {nj} kab/kota.")
    if A("tautan").get("baris") != baru["tautan"]["baris"]:
        out.append(f"Tautan berubah: {len(A('tautan').get('baris', []))} ke {len(baru['tautan']['baris'])} tautan.")
    if baru.get("spab") is not None and A("spab").get("kab") != baru["spab"]["kab"]:
        n0, n1 = len(A("spab").get("kab", {})), len(baru["spab"]["kab"])
        out.append(f"Capaian SPAB ditambahkan: {n1} kab/kota bersekolah melapor." if not n0 else f"Capaian SPAB berubah: {n0} ke {n1} kab/kota bersekolah melapor.")
    if baru.get("uji_dibi") is not None and A("uji_dibi").get("baris") != baru["uji_dibi"]["baris"]:
        out.append("Uji IRBI lawan DIBI berubah.")
    if A("geo") != baru["geo"]:
        out.append("Batas kab/kota berubah.")
    return out


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
    assert irbi["tahun"] == TAHUN, irbi["tahun"]
    tautan, geo = {"baris": [{"judul": "a"}]}, {"type": "FeatureCollection", "features": []}
    sama = {"irbi": irbi, "jiwa": jiwa, "ikd": ikd, "tautan": tautan, "geo": geo}
    assert beda(sama, sama) == [], beda(sama, sama)
    ubah = json.loads(json.dumps(irbi))
    ubah["nilai"]["1205"]["2025"][0] = 1.0
    ubah["status"]["1205"] = "Rendah" if irbi["status"]["1205"] != "Rendah" else "Tinggi"
    ubah["tahun"] = TAHUN + [2026]
    for k in ubah["nilai"]:
        ubah["nilai"][k]["2026"] = ubah["nilai"][k]["2025"]
    b = beda(sama, dict(sama, irbi=ubah))
    assert b[0] == "Tahun IRBI baru: 2026." and any("Skor IRBI 2025 berubah di 1" in x for x in b) and any("Langkat" in x for x in b), b
    assert beda({}, sama)[0].startswith("Tahun IRBI baru"), "keluaran pertama = semua baru"
    cek_spab_uji()


def cek_spab_uji():
    sp = bangun_spab({"11": {"tabel": {"wilayah": {
        "1101": {"sekolah": 176, "pilar1": 0.3056818, "pilar2": 0.1185, "pilar3": 0.1098, "capaian": 0.178012, "optimal": 7, "belum": 39, "tidak": 130},
        "1102": {"sekolah": 0, "capaian": 0}, "": {"sekolah": 9}}}}}, ["12"])
    assert list(sp["kab"]) == ["1101"] and sp["kab"]["1101"][4] == 0.178 and sp["gagal"] == ["12"], sp
    periksa_spab(sp, {"1101", "1102"})
    # Spearman: satu arah = 1, berlawanan = -1, seri dirata-rata, konstan = None
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-9 and abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-9
    assert peringkat([5, 5, 1]) == [2.5, 2.5, 1.0] and spearman([1, 1, 1], [1, 2, 3]) is None
    kode = [str(i) for i in range(10)]
    assert hit(kode, list(range(10)), list(range(10))) == 1.0 and hit(kode, list(range(10)), [0] * 10) is None
    # IRBI tahun Y yang persis urutan DIBI Y+1 menang atas persistensi yang acak
    irbi = {"kab": {k: [k, "1"] for k in kode}, "kolom": KOLOM, "tahun": [2015, 2016, 2025],
            "nilai": {k: {str(t): [float(i)] + [None] * 9 for t in (2015, 2016, 2025)} for i, k in enumerate(kode)}}
    agg = {}
    for i, k in enumerate(kode):
        agg[(k, 2015, "banjir")] = [float((i * 7) % 10), 0, 0, 0]       # acak
        agg[(k, 2016, "banjir")] = [float(i), 0, 0, 0]                   # sama dengan urutan IRBI
        agg[(k, 2025, "banjir")] = [float(i), 0, 0, 0]
        agg[(k, 2024, "banjir")] = [float(i), 0, 0, 0]
    u = uji_dibi(irbi, agg, 2026)
    r15 = next(r for r in u["baris"] if r["tahun_irbi"] == 2015)
    assert r15["cara"] == "tahun berikut" and r15["total"]["kejadian"]["rho_irbi"] == 1.0 and r15["total"]["kejadian"]["rho_persisten"] < 1
    assert next(r for r in u["baris"] if r["tahun_irbi"] == 2025)["cara"] == "tahun sama"
    assert u["vonis"][0].startswith("HV2015, kejadian: IRBI lebih baik dari persistensi di 1 dari 1"), u["vonis"]


def cek():
    cek_fixture()
    print("fixture Langkat: ok")
    if all(os.path.exists(os.path.join(KELUAR, n)) for n in ("irbi.json", "jiwa.json", "ikd.json", "tautan.json", "kab.geojson")):
        m = {n: json.load(open(os.path.join(KELUAR, n + ".json"), encoding="utf-8")) for n in FILES if os.path.exists(os.path.join(KELUAR, n + ".json"))}
        periksa_penuh(m["irbi"], m["jiwa"], m["ikd"], m["tautan"], json.load(open(os.path.join(KELUAR, "kab.geojson"), encoding="utf-8")),
                      m.get("spab"), m.get("uji_dibi"))
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
    prov = [x["id_provinsi"] for x in j(baca_cache("provinsi.json")[1])]
    for p in prov:   # SPAB: satu panggilan per provinsi; 404 = gagal (dicatat di spab.json, bukan nol)
        try:
            tarik_satu(f"spab_{p}.json", SPAB_URL + p)
        except Exception as e:
            print(f"GAGAL spab {p}: {e}", file=sys.stderr)
            galat += 1
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
    spab_mentah, spab_gagal = {}, []
    for p in prov:
        ada, t = baca_cache(f"spab_{p}.json")
        (spab_mentah.__setitem__(p, j(t)) if ada and t else spab_gagal.append(p))
    spab = bangun_spab(spab_mentah, spab_gagal) if spab_mentah else None
    uji = None
    try:
        agg = agregat_dibi(baca_dibi())
        uji = uji_dibi(irbi, agg, max(t for (_, t, _) in agg))
    except FileNotFoundError:
        print("PERINGATAN: berkas DIBI skenario-hidromet tak ada, uji IRBI lawan DIBI dilewati")
    periksa_penuh(irbi, jiwa, ikd, tautan, geo, spab, uji)
    def lama(n):
        p = os.path.join(KELUAR, n)
        if not os.path.exists(p):
            return None
        d = json.load(open(p, encoding="utf-8"))
        for x in ("dibuat", "sumber"):
            d.pop(x, None)
        return d
    sebelum = {n: lama(n + ".json") for n in FILES}   # spab/uji_dibi yang belum ada = None -> tahun pertama tak dianggap ganti bila baru nol
    sebelum["geo"] = lama("kab.geojson")
    sebelum_dibuat = (json.load(open(os.path.join(KELUAR, "irbi.json"), encoding="utf-8")).get("dibuat")
                      if os.path.exists(os.path.join(KELUAR, "irbi.json")) else None)
    butir = beda(sebelum, {"irbi": irbi, "jiwa": jiwa, "ikd": ikd, "tautan": tautan, "geo": geo, "spab": spab, "uji_dibi": uji})
    if not butir:
        print("cermin tidak berubah: berkas dibiarkan")
        return
    tgl = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    for d in (irbi, jiwa, ikd, tautan, spab, uji):
        if d is not None:
            d.update({"dibuat": tgl, "sumber": "InaRISK BNPB (inarisk.bnpb.go.id)"})
    if uji is not None:
        uji["sumber"] = "Hitungan Centurisk97: IRBI (InaRISK BNPB) lawan DIBI BNPB per kab; bukan produk InaRISK"
    os.makedirs(KELUAR, exist_ok=True)
    perubahan = {"dibuat": tgl, "sebelumnya": sebelum_dibuat, "butir": butir, "sumber": "InaRISK BNPB (inarisk.bnpb.go.id)"}
    isi = {"irbi.json": irbi, "jiwa.json": jiwa, "ikd.json": ikd, "tautan.json": tautan, "kab.geojson": geo, "perubahan.json": perubahan}
    isi.update({n + ".json": d for n, d in (("spab", spab), ("uji_dibi", uji)) if d is not None})
    for n, d in isi.items():
        with open(os.path.join(KELUAR, n + ".tmp"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    for n in isi:  # semua lolos cek dan tertulis: baru pindahkan
        os.replace(os.path.join(KELUAR, n + ".tmp"), os.path.join(KELUAR, n))
        print(f"{n}: {os.path.getsize(os.path.join(KELUAR, n)) / 1024:.0f} KB")
    print(f"kab tanpa jiwa: {len(tanpa_jiwa)}; kab tanpa analisa IKD: {len(tanpa_ikd)} dari {len(tahun_terakhir_ikd(baris))} kab di daftar; "
          f"kab di IRBI tanpa baris IKD: {len(set(kab) - set(tahun_terakhir_ikd(baris)))}; baris IKD {len(ikd['daftar'])}")
    for x in butir:
        print(f"PERUBAHAN: {x}")


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
