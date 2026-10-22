"""Tugas lapangan lintas bencana: kembaran `tugas_kompleks()` karhutla (scripts/data/harian.py) untuk banjir, gempa, gunungapi, cuaca, kekeringan.
-> public/data/tugas_<id>.json. Udara TIDAK punya tugas (tidak ada respons lapangan per titik); karhutla tetap tugas_kompleks.json.

Bentuk = tugas_kompleks.json (docs/bnpb/RANCANGAN-API-PADAM.md bagian 7) + "bencana": "<id>":
  {"dibuat": UTC "...Z" (kunci pertama), "bencana", "syarat_ambang", "kompleks": [tugas...]}
  tugas: id (kode kejadian B/G/V/C/D####, stabil antarhari), lat, lon, prov (2 digit), kab, kec?, level (3 | 2), tingkat (kata asli sumber),
         nama, mulai?, otomatis, syarat ["penduduk"], syarat_dinilai {"penduduk": bool}, jiwa?, wilayah {prov[], kab[], n_kab}, kartu{}, akses?, rekomendasi?
  Daftar tetap bernama `kompleks` supaya pembaca lama (Worker `kompleksSah`) tidak berubah.

Aturan (cermin "level 3 + level 2 bersyarat"): dua tingkat tertinggi skala peringatan hazard itu.
  level 3 = tingkat tertinggi, selalu otomatis; level 2 = tingkat kedua, otomatis HANYA bila jiwa terpapar >= JIWA_MIN (syarat "penduduk").
  Tanpa angka jiwa = level 2 tidak dibuat (tidak bisa dinilai, bukan "tidak terpenuhi").
  hazard      level 3          level 2 (bersyarat jiwa)   sumber kejadian / bidang jiwa
  banjir      Awas             Siaga                      kejadian_aktif_awal.json B#### / penduduk (total penduduk kecamatan terlibat)
  gempa       Siaga (M>=6, <=60 km; src/peringatan.js)  Waspada (M>=5)   /api/gempa/terbaru (kej G####) / jiwa_mmi6 model guncangan
  gunungapi   Awas (IV)        Siaga (III)                kejadian_gunungapi_awal.json V#### + gunungapi_status.json / penduduk_radius
  cuaca       Awas / CAP Extreme   Siaga / CAP Severe     kejadian_cuaca_awal.json C#### / jiwa kejadian
  kekeringan  Awas             Siaga                      kejadian_kekeringan_awal.json D#### / jiwa kejadian
Hanya kejadian aktif; sumber basi (> MAKS_BASI hari) = berkas TIDAK ditulis (berkas lama tidak dihapus karena data macet).
`kartu`: hanya kunci yang datanya benar-benar ada. `akses`: 3 unit respons (BPBD/Basarnas/pos SAR, unit_respons.json) terdekat, garis lurus, bukan rute.
`rekomendasi`: hanya gunungapi (teks resmi PVMBG dari MAGMA); lainnya tidak ditulis (tidak ada sumbernya).

Pakai:  python3 scripts/umum/tugas.py tulis [banjir gempa ...] [--hari YYYY-MM-DD] [--akar DIR] [--gempa BERKAS.json]
        python3 scripts/umum/tugas.py uji
"""
import argparse, datetime as dt, importlib.util, json, os, re, sys, tempfile, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kejadian as KJ   # baca, km, selisih, WIB

AKAR = KJ.AKAR
JIWA_MIN = 1000          # syarat level 2 (dapat disetel: kebijakan pemilik, bukan hasil model)
MAKS_BASI = 2            # hari
JAM_GEMPA = 72
GEMPA_API = os.environ.get("GEMPA_API", "https://centurisk97.id/api/gempa/terbaru?jam=%d" % JAM_GEMPA)
DANGKAL_KM = 60          # = DANGKAL_KM src/peringatan.js
MMI_JIWA = 6.0
BENCANA = ["banjir", "gempa", "gunungapi", "cuaca", "kekeringan"]
KEC_AWAS, KEC_SIAGA = 3, 2
CAP = {"Extreme": 3, "Severe": 2}    # src/peringatan.js TINGKAT_CAP: Severe=Siaga, Extreme=Awas; Moderate (Waspada) tidak dibuat tugas
NAMA_TINGKAT = {3: "Awas", 2: "Siaga"}
DASAR_GEMPA = "mmi_maks = laporan Dirasakan BMKG; jiwa_mmi6 = model GMPE/GMICE belum diuji terhadap laporan Dirasakan; perkiraan, bukan pengukuran"
DASAR_KERING = "ambang hipotesis, gagal uji balik (FAR 0,93), perlu verifikasi petugas"
LABEL = {"kekeringan": DASAR_KERING}


def _p(akar, *a):
    return os.path.join(akar, *a)


def baca(akar, rel, bawaan=None):
    return KJ.baca(_p(akar, rel), bawaan)


def utc(kini):
    return kini.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ------------------------------------------------------------------ bahan bersama
def akses_unit(akar, lat, lon, n=3):
    U = baca(akar, "public/banjir/data/unit_respons.json")
    if not U or not U.get("unit"):
        return None
    d = sorted(((KJ.km([lat, lon], [u["lat"], u["lon"]]), u) for u in U["unit"]), key=lambda x: (x[0], x[1]["n"]))[:n]
    return {"unit_terdekat": [{k: v for k, v in {"jenis": u["j"], "nama": u["n"], "jarak_km": round(j, 1), "telp": u.get("t")}.items() if v is not None} for j, u in d],
            "dasar": "jarak garis lurus dari unit_respons.json (OSM, BNPB peta_bpbd), bukan rute"}


def utama_kab(r):
    """kab utama kejadian multi-kab: 'sekitar X' dari nama bila X ada di daftar kab, selain itu yang pertama."""
    m = re.search(r"sekitar (.+)$", r.get("nama", ""))
    if m:
        for k in r["kab"]:
            if k.split("|")[1] == m.group(1):
                return k
    return r["kab"][0]


def butir(akar, r, level, tingkat, jiwa, kartu, *, prov=None, kab=None, kec=None, lat=None, lon=None, rek=None, wilayah=None, otomatis=True, hipotesis=False):
    """satu tugas; None bila level 2 tanpa syarat jiwa. `r` = baris kejadian (kode, nama, mulai, pusat, prov, kab)."""
    ok = jiwa is not None and jiwa >= JIWA_MIN
    if level == 2 and not ok:
        return None
    la, lo = (lat, lon) if lat is not None else r["pusat"]
    k = utama_kab(r) if kab is None and r.get("kab") else None
    t = {"id": r["kode"], "lat": round(la, 4), "lon": round(lo, 4), "prov": prov or (k or "")[:2], "kab": kab or (k.split("|")[1] if k else None), "kec": kec,
         "level": level, "tingkat": tingkat, "nama": r["nama"], "mulai": r.get("mulai"), "otomatis": otomatis, "hipotesis": True if hipotesis else None,
         "syarat": ["penduduk"] if level == 2 else [], "syarat_dinilai": {"penduduk": jiwa is not None}, "jiwa": jiwa,
         "wilayah": wilayah or {"prov": r.get("prov"), "kab": r.get("kab"), "n_kab": r.get("n_kab", len(r.get("kab") or []))},
         "kartu": {a: b for a, b in kartu.items() if b is not None}, "akses": akses_unit(akar, la, lo), "rekomendasi": rek}
    return {a: b for a, b in t.items() if b is not None and b != {}}


def _segar(awal, hari):
    return awal and awal.get("hari") and KJ.selisih(hari, awal["hari"]) <= MAKS_BASI


def _aktif(akar, id, hari):
    A = baca(akar, f"public/banjir/data/kejadian_{id}_awal.json")
    return [r for r in A["kejadian"] if r.get("aktif")] if _segar(A, hari) else None


# ------------------------------------------------------------------ adaptor
def tanpa_kosong(f):
    """adaptor -> Daftar tanpa None (level 2 tanpa syarat jiwa) dengan .lengkap; None (sumber basi) tetap None.
    Adaptor mengembalikan (daftar, lengkap): lengkap = SEMUA sumber hazard itu terbaca segar dan utuh, jadi daftar kosong sungguh berarti tak ada kejadian aktif."""
    def g(*a, **k):
        r = f(*a, **k)
        if r is None:
            return None
        d = Daftar(x for x in r[0] if x)
        d.lengkap = bool(r[1])
        return d
    return g


class Daftar(list):
    lengkap = False


@tanpa_kosong
def adaptor_banjir(akar, hari, **_):
    A = baca(akar, "public/banjir/data/kejadian_aktif_awal.json")
    if not _segar(A, hari):
        return None
    out = []
    for r in A["kejadian"]:
        lv = {3: 3, 2: 2}.get(r["level_tertinggi"])
        if not lv:
            continue
        p, kb, kc = r["kec"][0].split("|")
        rr = {**r, "nama": f"Banjir {NAMA_TINGKAT[lv]}, {kc}, {kb}", "mulai": r.get("sejak"), "kab": sorted({"|".join(x.split("|")[:2]) for x in r["kec"]})}
        out.append(butir(akar, rr, lv, NAMA_TINGKAT[lv], r.get("penduduk"), {"jiwa_terdampak": r.get("penduduk"), "hujan_mm": r.get("h3_mm")}, prov=p, kab=kb, kec=kc,
                         wilayah={"prov": r["prov"], "kab": rr["kab"], "n_kab": len(rr["kab"]), "n_kec": r.get("n_kec")}))
    return out, True


@tanpa_kosong
def adaptor_gunungapi(akar, hari, **_):
    rows, S = _aktif(akar, "gunungapi", hari), baca(akar, "public/banjir/data/gunungapi_status.json", {})
    if rows is None:
        return None
    st = {g["nama"]: g for g in S.get("gunung", [])}
    out = []
    for r in rows:
        nm = r["nama"].removeprefix("G. ")
        g = st.get(nm, {})
        lvl = g.get("level", r["besaran"]["nilai"])
        lv = {4: 3, 3: 2}.get(lvl)
        if not lv:
            continue
        jiwa = g.get("penduduk_radius")
        rek = {"cara": [{"metode": "rekomendasi_pvmbg", "peran": "utama", "alasan": g["rekomendasi"][:1200]}], "sumber": f"PVMBG, MAGMA Indonesia ({g.get('periode', '')})"} if g.get("rekomendasi") else None
        out.append(butir(akar, r, lv, "Awas" if lvl == 4 else "Siaga", jiwa, {"level": lvl, "radius_krb_km": g.get("radius_km"), "jiwa_krb": jiwa, "dasar": "radius rekomendasi PVMBG, penduduk WorldPop 1 km" if g else None}, rek=rek))
    return out, bool(S.get("gunung")) and _segar({"hari": (S.get("dibuat") or "")[:10]}, hari) and all(r["nama"].removeprefix("G. ") in st for r in rows)


@tanpa_kosong
def adaptor_cuaca(akar, hari, **_):
    rows = _aktif(akar, "cuaca", hari)
    if rows is None:
        return None
    out = []
    for r in rows:
        b = r["besaran"]["nilai"]
        lv = CAP.get(b) if r["jenis"].startswith("cap:") else {3: 3, 2: 2}.get(b)
        if not lv:
            continue
        cap = r["jenis"].startswith("cap:")
        # CAP: jiwa kejadian = penduduk SELURUH kab yang tersentuh, bukan di dalam poligon peringatan: bukan syarat (jiwa=None -> level 2 tak dibuat, syarat_dinilai.penduduk false)
        out.append(butir(akar, r, lv, NAMA_TINGKAT[lv], None if cap else r.get("jiwa"),
                         {"jenis_peringatan": r["jenis"].removeprefix("cap:") if cap else "cuaca ekstrem tingkat kecamatan", "berlaku_hingga": r.get("hingga"),
                          "jiwa_kab_terlibat": r.get("jiwa") if cap else None}))
    return out, True


@tanpa_kosong
def adaptor_kekeringan(akar, hari, **_):
    rows = _aktif(akar, "kekeringan", hari)
    if rows is None:
        return None
    reg = {e["kode"]: e for e in (baca(akar, "public/banjir/data/kejadian_kekeringan_nomor.json", {}) or {}).get("aktif", [])}
    W = (baca(akar, "public/data/kekeringan_wilayah.json", {}) or {}).get("kab", {})
    H = (baca(akar, "public/data/kekeringan_hth.json", {}) or {}).get("kab", {})
    out = []
    for r in rows:
        lv = {3: 3, 2: 2}.get(r["besaran"]["nilai"])
        if not lv:
            continue
        ang = reg.get(r["kode"], {}).get("anggota") or r["kab"]   # semua kab gugus (di _awal hanya 12)
        spi = [W[k]["spi3"] for k in ang if k in W and W[k].get("spi3") is not None]
        hth = [H[k]["maks"] for k in ang if k in H and H[k].get("maks") is not None]
        out.append(butir(akar, r, lv, NAMA_TINGKAT[lv], r.get("jiwa"), {"spi3": min(spi) if spi else None, "hari_tanpa_hujan": max(hth) if hth else None, "jiwa_kab_terlibat": r.get("jiwa"),
                                                                         "dasar": DASAR_KERING}, otomatis=False, hipotesis=True))
    return out, bool(W) and all(r["kode"] in reg for r in rows)


_G = {}


def _guncangan(akar):
    if akar not in _G:
        s = importlib.util.spec_from_file_location("umum_tugas_guncangan", os.path.join(AKAR, "scripts/gempa/guncangan.py"))
        _G[akar] = m = importlib.util.module_from_spec(s)
        s.loader.exec_module(m)
    return _G[akar]


def ambil_gempa(sumber):
    """berkas lokal atau URL -> JSON /api/gempa/terbaru; gagal = None."""
    try:
        if os.path.exists(sumber):
            return json.load(open(sumber, encoding="utf-8"))
        with urllib.request.urlopen(urllib.request.Request(sumber, headers={"User-Agent": "pantau-bencana-tugas"}), timeout=30) as f:
            return json.load(f)
    except (OSError, ValueError) as e:
        print(f"gempa: sumber tidak terbaca ({e})")
        return None


@tanpa_kosong
def adaptor_gempa(akar, hari, gempa=None, kini=None, **_):
    T = gempa if isinstance(gempa, dict) else ambil_gempa(gempa or GEMPA_API)
    if not T or "gempa" not in T:
        return None
    kini = kini or dt.datetime.now(dt.timezone.utc)
    try:
        segar = (kini - dt.datetime.fromisoformat(T["dibuat"].replace("Z", "+00:00"))).total_seconds() <= MAKS_BASI * 86400
    except (KeyError, TypeError, ValueError):
        segar = False
    pusat, pend = baca(akar, "public/banjir/data/pusat_kec.json", {}), (baca(akar, "public/data/penduduk.json", {}) or {}).get("kec", {})
    per = {}
    for x in T["gempa"]:
        t = dt.datetime.fromisoformat(x["waktu"].replace("Z", "+00:00"))
        if x.get("kej") and (kini - t).total_seconds() <= JAM_GEMPA * 3600 and x["m"] >= 5:
            if x["kej"] not in per or (x["m"], x["waktu"]) > (per[x["kej"]]["m"], per[x["kej"]]["waktu"]):
                per[x["kej"]] = x
    out = []
    for kode, x in sorted(per.items()):
        dangkal = x.get("dalam") is not None and x["dalam"] <= DANGKAL_KM
        lv = 3 if x["m"] >= 6 and dangkal else 2
        jiwa = None
        if x.get("dalam") is not None and pusat:
            mk = _guncangan(akar).mmi_kecamatan({"lat": x["lat"], "lon": x["lon"], "m": x["m"], "dalam": x["dalam"]}, pusat)
            jiwa = sum(pend.get(k, 0) for k, v in mk.items() if v["mmi"] >= MMI_JIWA)
        cand = [k for k in pusat if (not x.get("prov") or k.split("|")[0] == x["prov"]) and (not x.get("kab") or k.split("|")[1].lower() == x["kab"].lower())] or list(pusat)
        kk = min(cand, key=lambda k: (KJ.km([x["lat"], x["lon"]], pusat[k]), k)) if cand else None
        p, kb, kc = kk.split("|") if kk else (x.get("prov"), x.get("kab"), None)
        if not p or not kb:
            continue
        r = {"kode": kode, "nama": f"Gempa M {x['m']}, {x['wilayah']}"[:120], "mulai": x["waktu"][:10], "pusat": [x["lat"], x["lon"]], "prov": [p], "kab": [f"{p}|{kb}"]}
        b = butir(akar, r, lv, "Siaga" if lv == 3 else "Waspada", jiwa, {"mag": x["m"], "mmi_maks": x.get("mmi_maks"), "jiwa_mmi6": jiwa, "dalam_km": x.get("dalam"),
                                                                          "dasar": DASAR_GEMPA if jiwa is not None else None},
                  prov=p, kab=kb, kec=kc)
        out.append(b)
    return out, bool(segar and pusat and pend and T.get("jam", JAM_GEMPA) >= JAM_GEMPA)


ADAPTOR = {"banjir": adaptor_banjir, "gempa": adaptor_gempa, "gunungapi": adaptor_gunungapi, "cuaca": adaptor_cuaca, "kekeringan": adaptor_kekeringan}


def susun(id, tugas, kini, lengkap=False):
    """urutan kunci penting: Worker mengintip 1024 byte pertama untuk dibuat/bencana/lengkap."""
    return {"dibuat": utc(kini), "bencana": id, "lengkap": bool(lengkap), **({"label": LABEL[id]} if id in LABEL else {}), "syarat_ambang": {"jiwa_min": JIWA_MIN, "level3": "tingkat tertinggi skala peringatan, selalu otomatis" if id not in LABEL else "tingkat tertinggi skala peringatan; " + LABEL[id] + ", tidak otomatis",
            "level2": "tingkat kedua, otomatis hanya bila jiwa terpapar >= jiwa_min (syarat penduduk)"}, "kompleks": tugas}


def tulis(ids, hari, akar=AKAR, gempa=None, kini=None):
    kini = kini or dt.datetime.now(dt.timezone.utc)
    hasil = {}
    for i in ids:
        t = ADAPTOR[i](akar, hari, gempa=gempa, kini=kini)
        if t is None:
            print(f"{i}: masukan basi/hilang untuk {hari}, tidak ditulis")
            continue
        jalur = _p(akar, f"public/data/tugas_{i}.json")
        os.makedirs(os.path.dirname(jalur), exist_ok=True)
        with open(jalur + ".tmp", "w", encoding="utf-8") as f:
            json.dump(susun(i, t, kini, t.lengkap), f, ensure_ascii=False, separators=(",", ":"))
        os.replace(jalur + ".tmp", jalur)
        hasil[i] = t
        print(f"{i}: lengkap={t.lengkap} {len(t)} tugas (level 3: {sum(x['level'] == 3 for x in t)}, level 2: {sum(x['level'] == 2 for x in t)}) -> {jalur}")
    return hasil


# ------------------------------------------------------------------ uji luring
def uji():
    kini = dt.datetime(2026, 10, 22, 6, 0, tzinfo=dt.timezone.utc)
    hari = "2026-10-22"
    with tempfile.TemporaryDirectory() as t:
        def tulis_(rel, o):
            os.makedirs(os.path.dirname(_p(t, rel)), exist_ok=True)
            json.dump(o, open(_p(t, rel), "w"))
        B = "public/banjir/data/"
        tulis_(B + "unit_respons.json", {"unit": [{"j": "bpbd", "n": f"U{i}", "lat": i, "lon": 100.0} for i in range(5)]})
        tulis_(B + "kejadian_aktif_awal.json", {"hari": hari, "kejadian": [
            {"kode": "B0001", "sejak": hari, "level_tertinggi": 3, "n_kec": 1, "kec": ["11|Aceh|Kec A"], "prov": ["11"], "penduduk": 50, "h3_mm": 120.5, "pusat": [1.0, 100.0]},
            {"kode": "B0002", "sejak": hari, "level_tertinggi": 2, "n_kec": 1, "kec": ["11|Aceh|Kec B"], "prov": ["11"], "penduduk": 5000, "h3_mm": 90, "pusat": [2.0, 100.0]},
            {"kode": "B0003", "sejak": hari, "level_tertinggi": 2, "n_kec": 1, "kec": ["11|Aceh|Kec C"], "prov": ["11"], "penduduk": 10, "pusat": [3.0, 100.0]},
            {"kode": "B0004", "sejak": hari, "level_tertinggi": 1, "n_kec": 1, "kec": ["11|Aceh|Kec D"], "prov": ["11"], "penduduk": 99999, "pusat": [3.0, 100.0]}]})
        b = adaptor_banjir(t, hari)
        assert b.lengkap is True
        assert [x["id"] for x in b] == ["B0001", "B0002"], b   # level 2 tanpa jiwa cukup dibuang; level 1 tidak pernah
        assert b[0]["level"] == 3 and b[0]["syarat"] == [] and b[1]["syarat"] == ["penduduk"] and b[1]["otomatis"], b
        assert b[0]["kartu"] == {"jiwa_terdampak": 50, "hujan_mm": 120.5} and "luas_genangan_ha" not in b[0]["kartu"], b[0]["kartu"]   # level 3 selalu, tak ada luas genangan di sumber
        assert b[1]["kartu"] == {"jiwa_terdampak": 5000, "hujan_mm": 90} and b[0]["prov"] == "11" and b[0]["kab"] == "Aceh" and b[0]["kec"] == "Kec A"
        assert [u["nama"] for u in b[0]["akses"]["unit_terdekat"]] == ["U1", "U0", "U2"], b[0]["akses"]
        assert adaptor_banjir(t, "2026-10-30") is None   # basi = tidak ditulis
        # gunungapi
        tulis_(B + "kejadian_gunungapi_awal.json", {"hari": hari, "kejadian": [
            {"kode": "V0001", "nama": "G. Api", "prov": ["12"], "kab": ["12|X"], "mulai": hari, "aktif": True, "besaran": {"nilai": 4}, "pusat": [0.5, 100.5]},
            {"kode": "V0002", "nama": "G. Siaga", "prov": ["12"], "kab": ["12|X"], "mulai": hari, "aktif": True, "besaran": {"nilai": 3}, "pusat": [0.6, 100.5]},
            {"kode": "V0003", "nama": "G. Sepi", "prov": ["12"], "kab": ["12|X"], "mulai": hari, "aktif": True, "besaran": {"nilai": 3}, "pusat": [0.7, 100.5]},
            {"kode": "V0004", "nama": "G. Waspada", "prov": ["12"], "kab": ["12|X"], "mulai": hari, "aktif": True, "besaran": {"nilai": 2}, "pusat": [0.8, 100.5]},
            {"kode": "V0005", "nama": "G. Mati", "prov": ["12"], "kab": ["12|X"], "mulai": hari, "aktif": False, "besaran": {"nilai": 4}, "pusat": [0.9, 100.5]}]})
        tulis_(B + "gunungapi_status.json", {"gunung": [{"nama": "Api", "level": 4, "radius_km": 6.0, "penduduk_radius": 0, "rekomendasi": "Jauhi radius 6 km.", "periode": "p"},
                                                        {"nama": "Siaga", "level": 3, "radius_km": 3.0, "penduduk_radius": 800}, {"nama": "Sepi", "level": 3, "radius_km": 3.0, "penduduk_radius": 20000}]})
        g = adaptor_gunungapi(t, hari)
        assert g.lengkap is False   # status tanpa `dibuat` dan tak memuat semua gunung: tidak boleh mengaku lengkap
        tulis_(B + "gunungapi_status.json", {"dibuat": hari + "T02:00:00+07:00", "gunung": [{"nama": n, "level": l, "radius_km": 3.0, "penduduk_radius": j} for n, l, j in
                                                                                         (("Api", 4, 0), ("Siaga", 3, 800), ("Sepi", 3, 20000), ("Waspada", 2, 0), ("Mati", 4, 0))]})
        assert adaptor_gunungapi(t, hari).lengkap is True
        tulis_(B + "gunungapi_status.json", {"gunung": [{"nama": "Api", "level": 4, "radius_km": 6.0, "penduduk_radius": 0, "rekomendasi": "Jauhi radius 6 km.", "periode": "p"},
                                                        {"nama": "Siaga", "level": 3, "radius_km": 3.0, "penduduk_radius": 800}, {"nama": "Sepi", "level": 3, "radius_km": 3.0, "penduduk_radius": 20000}]})
        g = adaptor_gunungapi(t, hari)
        assert [x["id"] for x in g] == ["V0001", "V0003"], g   # Awas selalu (jiwa 0 pun); Siaga <1000 jiwa tidak; Waspada & tak aktif tidak
        assert g[0]["level"] == 3 and g[0]["kartu"]["jiwa_krb"] == 0 and g[0]["kartu"]["radius_krb_km"] == 6.0 and g[0]["rekomendasi"]["cara"][0]["alasan"] == "Jauhi radius 6 km."
        assert g[1]["level"] == 2 and g[1]["kartu"]["level"] == 3 and "rekomendasi" not in g[1] and g[1]["prov"] == "12" and g[1]["kab"] == "X"
        # cuaca
        tulis_(B + "kejadian_cuaca_awal.json", {"hari": hari, "kejadian": [
            {"kode": "C0001", "nama": "Hujan Lebat, A", "jenis": "cap:Hujan Lebat", "prov": ["13"], "kab": ["13|P", "13|Q"], "aktif": True, "besaran": {"nilai": "Extreme"}, "pusat": [1, 101], "jiwa": 5, "hingga": "2026-10-22T09:00:00+07:00"},
            {"kode": "C0002", "nama": "Hujan Lebat, B", "jenis": "cap:Hujan Lebat", "prov": ["13"], "kab": ["13|P"], "aktif": True, "besaran": {"nilai": "Severe"}, "pusat": [1, 101], "jiwa": 9000},
            {"kode": "C0003", "nama": "Hujan Lebat, C", "jenis": "cap:Hujan Lebat", "prov": ["13"], "kab": ["13|P"], "aktif": True, "besaran": {"nilai": "Moderate"}, "pusat": [1, 101], "jiwa": 9000},
            {"kode": "C0004", "nama": "Cuaca ekstrem, sekitar Q", "jenis": "kec", "prov": ["13"], "kab": ["13|P", "13|Q"], "aktif": True, "besaran": {"nilai": 3}, "pusat": [1, 101], "jiwa": 2000}]})
        c = adaptor_cuaca(t, hari)
        assert c.lengkap is True
        assert [x["id"] for x in c] == ["C0001", "C0004"], c   # CAP Severe jiwa 9000 TIDAK jadi level 2: jiwa CAP = seluruh kab, bukan syarat
        assert c[0]["kartu"] == {"jenis_peringatan": "Hujan Lebat", "berlaku_hingga": "2026-10-22T09:00:00+07:00", "jiwa_kab_terlibat": 5} and "jiwa" not in c[0] and c[0]["level"] == 3
        assert c[0]["syarat_dinilai"] == {"penduduk": False}, c[0]
        assert c[1]["kartu"] == {"jenis_peringatan": "cuaca ekstrem tingkat kecamatan"} and c[1]["kab"] == "Q" and c[1]["jiwa"] == 2000 and c[1]["syarat_dinilai"] == {"penduduk": True}, c[1]   # 'sekitar Q' memilih kab Q; kec: jiwa kecamatan sungguhan
        # kekeringan: spi3 terendah, hth terpanjang atas SEMUA anggota (registri), bukan hanya 12 di _awal
        tulis_(B + "kejadian_kekeringan_awal.json", {"hari": hari, "kejadian": [
            {"kode": "D0001", "nama": "Kekeringan Siaga/Awas, sekitar M", "prov": ["14"], "kab": ["14|M"], "aktif": True, "besaran": {"nilai": 3}, "pusat": [2, 102], "jiwa": 700000},
            {"kode": "D0002", "nama": "Kekeringan Siaga/Awas, sekitar N", "prov": ["14"], "kab": ["14|N"], "aktif": True, "besaran": {"nilai": 2}, "pusat": [2, 102], "jiwa": 500}]})
        tulis_(B + "kejadian_kekeringan_nomor.json", {"aktif": [{"kode": "D0001", "anggota": ["14|M", "14|Z"]}, {"kode": "D0002", "anggota": ["14|N"]}]})
        tulis_("public/data/kekeringan_wilayah.json", {"kab": {"14|M": {"spi3": -1.6}, "14|Z": {"spi3": -2.4}, "14|N": {"spi3": -1.5}}})
        tulis_("public/data/kekeringan_hth.json", {"kab": {"14|M": {"maks": 20}, "14|Z": {"maks": 41}}})
        k = adaptor_kekeringan(t, hari)
        assert [x["id"] for x in k] == ["D0001"], k   # Siaga jiwa 500 < JIWA_MIN
        assert k[0]["kartu"]["spi3"] == -2.4 and k[0]["kartu"]["hari_tanpa_hujan"] == 41 and k[0]["kartu"]["jiwa_kab_terlibat"] == 700000 and "jiwa" not in k[0]["kartu"], k[0]["kartu"]
        assert k[0]["otomatis"] is False and k[0]["hipotesis"] is True and k[0]["kartu"]["dasar"] == DASAR_KERING and "FAR 0,93" in DASAR_KERING and k.lengkap is True
        tulis_(B + "kejadian_kekeringan_nomor.json", {"aktif": [{"kode": "D0001", "anggota": ["14|M", "14|Z"]}]})
        assert adaptor_kekeringan(t, hari).lengkap is False   # registri tak memuat semua kejadian
        # gempa: sumber dari dict (tanpa jaringan); model guncangan memakai pusat_kec nyata kecil
        tulis_(B + "pusat_kec.json", {"11|Aceh|Dekat": [0.0, 100.0], "11|Aceh|Jauh": [5.0, 100.0], "12|Lain|Dekat": [0.0, 100.0]})
        tulis_("public/data/penduduk.json", {"kec": {"11|Aceh|Dekat": 40000, "11|Aceh|Jauh": 90000, "12|Lain|Dekat": 7}})
        w = lambda kej, m, dalam, waktu="2026-10-22T05:00:00.000Z", **k: {"id": kej, "waktu": waktu, "lat": 0.1, "lon": 100.0, "m": m, "dalam": dalam, "wilayah": "W", "prov": "11", "kab": "Aceh", "kej": kej, "mmi_maks": k.get("mmi"), "sumber": "bmkg"}
        G = {"gempa": [w("G0001", 6.5, 10, mmi=6), w("G0002", 5.4, 10), w("G0003", 5.2, 150), w("G0004", 4.9, 10), w("G0005", 6.8, 10, waktu="2026-10-10T05:00:00.000Z"), {**w("x", 6.0, 10), "kej": None}], "dibuat": "2026-10-22T05:30:00Z", "jam": 72}
        ge = adaptor_gempa(t, hari, gempa=G, kini=kini)
        ids = [x["id"] for x in ge]
        assert "G0001" in ids and "G0004" not in ids and "G0005" not in ids, ids   # M<5 dan lewat 72 jam tidak; tanpa kej tidak
        g1 = next(x for x in ge if x["id"] == "G0001")
        assert g1["level"] == 3 and g1["tingkat"] == "Siaga" and g1["kartu"]["mag"] == 6.5 and g1["kartu"]["mmi_maks"] == 6 and g1["kartu"]["jiwa_mmi6"] >= 40000, g1["kartu"]
        assert g1["kec"] == "Dekat" and g1["prov"] == "11" and g1["kab"] == "Aceh", g1   # kec terdekat di prov/kab dari API, bukan "12|Lain"
        assert "G0003" not in ids or next(x for x in ge if x["id"] == "G0003")["level"] == 2   # M5,2 dalam 150 km: level 2, hanya bila jiwa_mmi6 >= JIWA_MIN
        assert ge.lengkap is True and "belum diuji terhadap laporan Dirasakan" in g1["kartu"]["dasar"] and "bukan pengukuran" in g1["kartu"]["dasar"]
        assert adaptor_gempa(t, hari, gempa={k: v for k, v in G.items() if k != "dibuat"}, kini=kini).lengkap is False   # tanpa cap waktu sumber: tak terjamin segar
        assert adaptor_gempa(t, hari, gempa={**G, "dibuat": "2026-10-15T00:00:00Z"}, kini=kini).lengkap is False
        assert adaptor_gempa(t, hari, gempa={"x": 1}, kini=kini) is None
        # tulis: kunci pertama dibuat, bencana, tugas stabil antar-jalan
        h = tulis(["banjir", "gempa"], hari, akar=t, gempa=G, kini=kini)
        o = json.load(open(_p(t, "public/data/tugas_banjir.json")))
        assert list(o)[:3] == ["dibuat", "bencana", "lengkap"] and o["lengkap"] is True and "label" not in o and o["dibuat"] == "2026-10-22T06:00:00Z" and o["bencana"] == "banjir" and [x["id"] for x in o["kompleks"]] == ["B0001", "B0002"] and "selalu otomatis" in o["syarat_ambang"]["level3"]
        assert "tugas_udara" not in os.listdir(_p(t, "public/data")) and "udara" not in ADAPTOR
        ko = susun("kekeringan", k, kini, True)
        assert "selalu otomatis" not in ko["syarat_ambang"]["level3"] and "verifikasi petugas" in ko["syarat_ambang"]["level3"] and "tidak otomatis" in ko["syarat_ambang"]["level3"] and "verifikasi petugas" in ko["label"]
        assert [x["id"] for x in ADAPTOR["banjir"](t, hari)] == [x["id"] for x in o["kompleks"]]   # id = kode kejadian, tidak berubah
    print("tugas.py uji: OK")


def main():
    a = argparse.ArgumentParser()
    a.add_argument("perintah", choices=["tulis", "uji"])
    a.add_argument("id", nargs="*", default=BENCANA)
    a.add_argument("--hari", default=dt.datetime.now(KJ.WIB).date().isoformat())
    a.add_argument("--akar", default=AKAR)
    a.add_argument("--gempa", default=None, help="berkas JSON /api/gempa/terbaru (bawaan: GEMPA_API)")
    a = a.parse_args()
    if a.perintah == "uji":
        return uji()
    tulis(a.id, a.hari, a.akar, a.gempa)


if __name__ == "__main__":
    main()
