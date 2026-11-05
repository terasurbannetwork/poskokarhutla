#!/usr/bin/env python3
"""Pencocokan pakar per masalah otomatis + 3 paper + kutipan solusi (ALG §4.2-§4.6, §5; KM-C07).
Skor(p) = 0,45 Teks + 0,15 R + 0,10 L + 0,12 Q + 0,10 J + 0,08 E (bobot di konst.py). Top-10 dengan maks 2 per kampus.
Teks(p) = rerata 3 skor BM25 karya teratas (karya kurang dari 3 dihitung 0) dibagi maksimum atas semua pakar berskor di indeks bahaya itu;
kandidat = R > 0 atau Teks >= 0,2. Tanpa LLM: solusi = kalimat asli abstrak + tautan DOI, berlabel.
Keluaran DATA PAKAR: hanya ke --keluar (di luar repo; ditolak bila di public/) atau R2 `kemitraan/cocok/<kab4>.json`.
Pakai: python3 -I scripts/kemitraan/cocok_pakar.py --induk induk.json --kampus kampus.json --korpus DIR (--keluar DIR | --r2) [--rekam f.json] [--kab 6211] | --cek"""
import collections, datetime, glob, json, math, os, sys, tempfile, time, zlib

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from konst import KONST  # noqa: E402
import geo  # noqa: E402
import indeks_bm25 as ib  # noqa: E402
import korpus as kp  # noqa: E402
import teks  # noqa: E402

PK, BOBOT, SO = KONST["PAKAR"], KONST["BOBOT"]["pakar"], KONST["SOLUSI"]
KOMP = ("teks", "R", "L", "Q", "J", "E")
DAERAH = os.path.join(AKAR, "public", "data", "kemitraan", "daerah")
LABEL = "Kutipan dari abstrak, bukan rekomendasi BNPB"
BELUM_DIUJI = "Belum diuji: skor pakar belum lolos uji relevansi (uji_cocok.json)"


# ---------------------------------------------------------------- murni (acuan A6, A7)
def skor_pakar(k):
    return sum(BOBOT[c] * k[c] for c in KOMP)


def ragam(daftar, n=None, maks=None):
    """Urut skor turun, h turun, id naik; lewati pakar yang membuat kampusnya lebih dari `maks` (2) di daftar; ambil n (10)."""
    n, maks = n or PK["TOP_N"], maks or PK["MAKS_PER_KAMPUS"]
    per, out = collections.Counter(), []
    for d in sorted(daftar, key=lambda d: (-d["skor"], -d["h"], d["id"])):
        if per[d["kampus"]] >= maks:
            continue
        per[d["kampus"]] += 1
        out.append(d["id"])
        if len(out) == n:
            break
    return out


def komp_L(lok, kab4, prov):
    """1 bila karya menyebut nama kab secara tegas (berawalan/Inggris regency-city/nama tak rancu); 0,6 bila hanya nama rancu (kab4_lemah) atau prov/pulau."""
    return PK["LOKAL_KAB"] if kab4 in lok["kab4"] else PK["LOKAL_PROV"] if kab4 in lok.get("kab4_lemah", ()) or prov in lok["prov"] else 0.0


def komp_J(p, pusat):
    if p["lat"] is None or p["lon"] is None or not pusat:
        return PK["KAMPUS_TANPA_TITIK"]
    return math.exp(-geo.haversine_km(p["lat"], p["lon"], pusat[0], pusat[1]) / PK["JARAK_KM"])


def komp_Q(p):
    m = KONST["BOBOT"]["mutu"]
    return m["h"] * p["h_pct"] + m["baru"] * p["baru_pct"]


def kueri(judul, uraian, b, a, prov_nama, pulau):
    """Q = judul + uraian + kamus bahaya + kamus aspek + nama provinsi + nama pulau (ALG §4.2); token unik, urutan tetap."""
    k = teks.kamus()
    return list(dict.fromkeys(teks.token(" ".join([judul or "", uraian or "", " ".join(k["bahaya"].get(b, [])), " ".join(k["aspek"].get(a, [])), prov_nama or "", pulau or ""]))))


# ---------------------------------------------------------------- inti
def cocok(ix, q, kab4, prov, pusat):
    """-> (top-10 berpecahan, skor karya {(pi,ki): bm25}, mx, mentah {pi: bm25 mentah}). mx = pembagi Teks (maksimum mentah); mx kecil = kecocokan teks lemah
    walau Teks = 1,00. ix = indeks LENGKAP dari indeks_bm25.bangun."""
    sk = collections.defaultdict(float)
    for t in q:
        pl = ix["posting"].get(t)
        if pl:
            i = ib.idf(ix["N"], ix["df"][t])
            for pi, ki, tj, ti, dl in pl:
                sk[(pi, ki)] += ib.suku(i, B_JUDUL * tj + ti, dl, ix["avgdl"])
    per = collections.defaultdict(list)
    for (pi, ki), v in sk.items():
        per[pi].append(v)
    mentah = {pi: sum(sorted(v, reverse=True)[:B25["TOP_KARYA"]]) / B25["TOP_KARYA"] for pi, v in per.items()}
    mx = max(mentah.values(), default=0.0)
    kand = []
    for pi, p in enumerate(ix["pakar"]):
        T = mentah.get(pi, 0.0) / mx if mx > 0 else 0.0
        if p["r"] > 0 or T >= PK["TEKS_MIN"]:
            k = {"teks": T, "R": p["r"], "L": komp_L(p["lokal"], kab4, prov), "Q": komp_Q(p), "J": komp_J(p, pusat), "E": p["rekam"]}
            kand.append({"pi": pi, "id": p["id"], "kampus": p["kampus"], "h": p["h"], "skor": skor_pakar(k), "k": k})
    kunci = {d["id"]: d for d in kand}
    return [kunci[i] for i in ragam(kand)], sk, mx, mentah


def kartu(ix, d, sk, q, pusat, mentah=None, wilayah=()):
    p = ix["_isi"][d["pi"]]
    ada = [(sk[(d["pi"], ki)], p["karya"][ki].get("sitasi") or 0, -ki) for ki in range(len(p["karya"])) if sk.get((d["pi"], ki), 0) > 0]
    terbaik = max((a[0] for a in ada), default=0.0)
    # paper relevan = skornya >= KARYA_REL x karya terbaik pakar ini (skor > 0 saja meloloskan karya yang hanya mengenai satu kata umum)
    nilai = sorted((a for a in ada if a[0] >= SO["KARYA_REL"] * terbaik), reverse=True)[:SO["KARYA"]]
    paper, qs = [], set(q)
    for _, _, nk in nilai:
        k = p["karya"][-nk]
        ab = k.get("abstrak") or ""
        kal = teks.kalimat(ab)
        if len(ab) >= kp.ABSTRAK_MAKS and kal:
            kal = kal[:-1]  # abstrak terpotong di batas korpus: kalimat terakhir mungkin separuh, jangan dikutip
        kut = teks.solusi(kal, qs, wilayah) if ab else []
        paper.append({"judul": k["judul"], "tahun": k.get("tahun"), "doi": k.get("doi"), "terbitan": k.get("terbitan") or None, "kutipan": kut,
                      **({"label": LABEL} if kut else {}),
                      "catatan": "Abstrak tidak tersedia" if not ab else None if kut else "Tidak ada kalimat solusi yang jelas di abstrak"})
    km = None if p["lat"] is None or not pusat else round(geo.haversine_km(p["lat"], p["lon"], pusat[0], pusat[1]), 1)
    return {"id": d["id"], "nama": p["nama"], "kampus": p["kampus"], "h": p["h"], "skor": round(d["skor"], 4),
            "pecahan": {c: round(d["k"][c], 4) for c in KOMP}, "bm25_mentah": round((mentah or {}).get(d["pi"], 0.0), 4), "km": km, "paper": paper}


def proses_kab(profil, kode, prov_nama, pakar, cache, kini=None):
    """Satu kab -> dokumen R2 `cocok/<kab4>.json`. cache = {bahaya: indeks lengkap} dipakai bersama antar kab."""
    kab4, pusat = profil["kode"], (kode.get(profil["kode"]) or {}).get("pusat")
    prov = profil.get("prov") or kab4[:2]
    pl, hasil = ib.pulau_dari_prov(prov), []
    wil = teks.token(" ".join([prov_nama.get(prov) or "", pl, ib.nama_cari((kode.get(kab4) or {}).get("nama") or profil.get("nama"))]))
    for m in profil.get("masalah") or []:
        b = m["B"]
        if b not in cache:
            cache[b] = ib.bangun(pakar, b)
        q = kueri(m.get("judul"), m.get("uraian"), b, m["A"], prov_nama.get(prov), pl)
        top, sk, mx, mentah = cocok(cache[b], q, kab4, prov, pusat)
        hasil.append({"auto_id": m.get("auto_id"), "B": b, "A": m["A"], "judul": m.get("judul"), "bm25_maks": round(mx, 4),
                      "pakar": [kartu(cache[b], d, sk, q, pusat, mentah, wil) for d in top]})
    return {"v": 1, "kab": kab4, "rekam_dimuat": any(p.get("rekam_dimuat") for p in pakar), "dibangun": (kini or datetime.date.today()).isoformat(), "label_kutipan": LABEL, "status": BELUM_DIUJI, "masalah": hasil}


B_JUDUL, B25 = KONST["BM25"]["BOBOT_JUDUL"], KONST["BM25"]


# ---------------------------------------------------------------- --cek
def dunia():
    """Dunia mini sintetis (nama fiktif): 6 kampus-pakar + 1 pakar tak relevan; teks dirancang agar urutan teratas pasti."""
    ka = lambda j, a, th=2023, tp=(), s=5: {"id": "W" + str(zlib.crc32(j.encode()) % 10**6), "judul": j, "abstrak": a, "tahun": th, "doi": "https://doi.org/10.9/" + j[:3].lower().strip(), "terbitan": "Jurnal Uji", "sitasi": s, "topik": list(tp)}
    sol = "We propose an early warning system for flood in Pulang Pisau, Kalimantan Tengah. The method reduces losses. Flooding is common."
    korp = {
        "A1001": [ka("Banjir Pulang Pisau", "Banjir dan peringatan dini di Pulang Pisau. " + sol, 2024, ["Flood Risk"]), ka("Peta bahaya banjir gambut", "Pemodelan banjir kalimantan tengah", 2022)],
        "A1002": [ka("Flood hazard map Kalimantan", "Flood hazard map and modeling for Kalimantan river", 2023, ["Flood Risk"])],
        "A1003": [ka("Flood modeling", "Flood modeling hazard assessment mapping", 2020)],
        "A1004": [ka("Flood forecast", "Flood early warning system threshold monitoring", 2021)],
        "A1005": [ka("Banjir sungai", "Banjir sungai debit drainase", 2019, ["Hydrology"])],
        "A1006": [ka("Slope failure", "Landslide and flood interaction on slope", 2021)],
        "A1007": [ka("Kimia polimer", "Polimer baru untuk plastik", 2020)],
    }
    kamp = {"UA": {"lat": -2.2, "lon": 113.9}, "UB": {"lat": -7.8, "lon": 110.4}, "UC": {"lat": 3.6, "lon": 98.7}, "UD": {"lat": None, "lon": None}, "UE": {"lat": -6.9, "lon": 107.6}}
    orang = [["A1001", "Pakar Uji 1", "UA", ["banjir"], 30], ["A1002", "Pakar Uji 2", "UA", ["banjir"], 25], ["A1003", "Pakar Uji 3", "UA", ["banjir"], 22],
             ["A1004", "Pakar Uji 4", "UB", ["banjir"], 12], ["A1005", "Pakar Uji 5", "UC", ["banjir"], 8], ["A1006", "Pakar Uji 6", "UD", ["longsor"], 40],
             ["A1007", "Pakar Uji 7", "UE", ["kimia"], 50]]
    return orang, kamp, korp


def cek():
    ac = json.load(open(os.path.join(AKAR, "tests", "kemitraan", "fixtures", "acuan.json"), encoding="utf-8"))
    for c in ac["skor_pakar"]:
        assert abs(skor_pakar(c["masuk"]) - c["keluar"]) <= 1e-9, f"skor_pakar {c['id']}"
    for c in ac["ragam"]:
        h = ragam(c["masuk"]["daftar"], c["masuk"]["n"])
        assert h == c["keluar"], f"ragam {c['id']}: {h} != {c['keluar']}"
    # komponen
    assert komp_J({"lat": None, "lon": None}, [0, 0]) == 0.3 and abs(komp_J({"lat": 1.0, "lon": 1.0}, [1.0, 1.0]) - 1.0) < 1e-12
    assert komp_L({"kab4": ["6211"], "prov": ["62"]}, "6211", "62") == 1.0 and komp_L({"kab4": [], "prov": ["62"]}, "6211", "62") == 0.6 and komp_L({"kab4": [], "prov": []}, "6211", "62") == 0.0 and komp_L({"kab4": [], "kab4_lemah": ["6211"], "prov": []}, "6211", "62") == 0.6
    # uji ujung ke ujung atas kab nyata (profil publik) + dunia sintetis
    kode = json.load(open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8"))
    prov = json.load(open(os.path.join(AKAR, "public", "data", "meta.json"), encoding="utf-8"))["provinsi"]
    profil = json.load(open(os.path.join(DAERAH, "6211.json"), encoding="utf-8"))
    assert any(m["B"] == "banjir" for m in profil["masalah"]), "fixture butuh kab dengan masalah banjir"
    orang, kamp, korp = dunia()
    pk = ib.siapkan_pakar(orang, kamp, korp, {"catat": ["A1004"]}, ib.frasa_wilayah(kode, prov))
    assert [p["lokal"]["kab4"] for p in pk][0] == ["6211"], "A1001 menyebut Pulang Pisau"
    assert not any(p["rekam_dimuat"] for p in ib.siapkan_pakar(orang, kamp, korp, None, ib.frasa_wilayah(kode, prov)))
    t0, cache = time.monotonic(), {}
    dok = proses_kab(profil, kode, prov, pk, cache, datetime.date(2026, 11, 5))
    dt = time.monotonic() - t0
    assert dt <= 2.0, f"satu kab {dt:.2f} dtk > 2 dtk"
    assert dok["rekam_dimuat"] is True and proses_kab(profil, kode, prov, ib.siapkan_pakar(orang, kamp, korp, None, ib.frasa_wilayah(kode, prov)), {})["rekam_dimuat"] is False
    assert dok["kab"] == "6211" and len(dok["masalah"]) == len(profil["masalah"]) and dok["label_kutipan"] == LABEL
    ban = next(m for m in dok["masalah"] if m["B"] == "banjir")
    ids = [x["id"] for x in ban["pakar"]]
    assert ids[0] == "A1001" and "A1007" not in ids, ids  # sebut kab + rumpun + teks; pakar kimia tak jadi kandidat
    assert collections.Counter(x["kampus"] for x in ban["pakar"])["UA"] == 2 and "A1003" not in ids, ids  # maks 2 per kampus (UA punya 3)
    for x in ban["pakar"]:
        assert all(0 <= v <= 1 for v in x["pecahan"].values()) and abs(skor_pakar(x["pecahan"]) - x["skor"]) < 5e-4, x
    assert [x["skor"] for x in ban["pakar"]] == sorted((x["skor"] for x in ban["pakar"]), reverse=True)
    top = ban["pakar"][0]
    assert top["pecahan"]["L"] == 1.0 and top["pecahan"]["R"] == 1.0 and top["paper"], top
    assert ban["bm25_maks"] > 0 and top["bm25_mentah"] == ban["bm25_maks"] and all(0 <= x["bm25_mentah"] <= ban["bm25_maks"] for x in ban["pakar"]), "Teks 1,00 harus bisa ditelusuri ke bm25 mentah"
    assert next(x for x in ban["pakar"] if x["id"] == "A1004")["pecahan"]["E"] == 1.0
    # solusi: kutipan persis dari abstrak, <= 2 kalimat, skor >= 3; tanpa abstrak -> catatan
    ab = {k["judul"]: k["abstrak"] for p in korp.values() for k in p}
    n_kut = 0
    for x in ban["pakar"]:
        assert len(x["paper"]) <= 3
        for pp in x["paper"]:
            assert len(pp["kutipan"]) <= 2 and (pp["kutipan"] or pp["catatan"])
            assert (pp.get("label") == LABEL) == bool(pp["kutipan"]), "label wajib di tiap paper berkutipan"
            for kt in pp["kutipan"]:
                assert kt["kalimat"] in ab[pp["judul"]] and kt["skor"] >= SO["SKOR_MIN"]; n_kut += 1
    assert n_kut >= 1, "tidak ada satu pun kutipan solusi"
    # abstrak terpotong di batas korpus: kalimat terakhir tidak dikutip
    ab_t = "Flood study of the river. We propose an early warning system for flood"
    k1 = {"id": "W1", "judul": "Banjir uji", "abstrak": ab_t, "tahun": 2024, "doi": None, "terbitan": "", "sitasi": 1, "topik": []}
    k2 = {"id": "W2", "judul": "Penelitian lain", "abstrak": "A study of one river.", "tahun": 2020, "doi": None, "terbitan": "", "sitasi": 9, "topik": []}
    pk1 = ib.siapkan_pakar([["A2001", "Pakar Uji 8", "UA", ["banjir"], 5]], kamp, {"A2001": [k1, k2]}, None, ib.frasa_wilayah(kode, prov))

    def kut_(maks):
        asli = kp.ABSTRAK_MAKS
        kp.ABSTRAK_MAKS = maks
        try:
            d1 = proses_kab(profil, kode, prov, pk1, {})
        finally:
            kp.ABSTRAK_MAKS = asli
        return [pp for m in d1["masalah"] if m["B"] == "banjir" for x in m["pakar"] for pp in x["paper"] if pp["judul"] == "Banjir uji"]
    utuh, terpotong = kut_(3000), kut_(len(ab_t))
    assert utuh and any("early warning" in kt["kalimat"] for pp in utuh for kt in pp["kutipan"]), utuh
    assert terpotong and not any("early warning" in kt["kalimat"] for pp in terpotong for kt in pp["kutipan"]), "kalimat terpotong tidak boleh dikutip"
    assert all(pp["judul"] != "Penelitian lain" for m in proses_kab(profil, kode, prov, pk1, {})["masalah"] for x in m["pakar"] for pp in x["paper"]), "paper lemah relatif tersaring"
    # privasi: tidak menulis ke public/; dokumen JSON tak memuat email/telepon
    with tempfile.TemporaryDirectory() as d:
        kp.jaga_keluar(d)
        s = json.dumps(dok, ensure_ascii=False)
        assert "@" not in s and "wa.me" not in s
    for bad in (os.path.join(AKAR, "public", "data", "kemitraan", "cocok"),):
        try:
            kp.jaga_keluar(bad); raise AssertionError("jaga_keluar meloloskan public/")
        except SystemExit:
            pass
    # deterministik
    assert json.dumps(proses_kab(profil, kode, prov, pk, {}, datetime.date(2026, 11, 5)), sort_keys=True) == json.dumps(dok, sort_keys=True)
    print(f"OK cocok_pakar.py: skor_pakar/ragam acuan, kab 6211 {len(dok['masalah'])} masalah dalam {dt:.2f} dtk, maks 2 per kampus, {n_kut} kutipan verbatim, tanpa kontak")


def main(a):
    g = lambda n, b=None: a[a.index(n) + 1] if n in a else b
    if "--cek" in a:
        return cek()
    if not (g("--induk") and g("--kampus") and g("--korpus") and (g("--keluar") or "--r2" in a)):
        sys.exit(__doc__)
    keluar = g("--keluar") or tempfile.mkdtemp(prefix="km_cocok_")
    kp.jaga_keluar(keluar)
    os.makedirs(keluar, exist_ok=True)
    pk = ib.muat_semua(g("--induk"), g("--kampus"), g("--korpus"), g("--rekam"))
    kode = json.load(open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8"))
    prov = json.load(open(os.path.join(AKAR, "public", "data", "meta.json"), encoding="utf-8"))["provinsi"]
    berkas = [os.path.join(DAERAH, g("--kab") + ".json")] if g("--kab") else sorted(glob.glob(os.path.join(DAERAH, "[0-9][0-9][0-9][0-9].json")))
    cache, n = {}, 0
    for f in berkas:
        profil = json.load(open(f, encoding="utf-8"))
        if not profil.get("masalah"):
            continue
        dok = proses_kab(profil, kode, prov, pk, cache)
        p = os.path.join(keluar, f"{dok['kab']}.json")
        kp.tulis(p, dok)
        if "--r2" in a:
            kp.r2_taruh(f"kemitraan/cocok/{dok['kab']}.json", p)
        n += 1
    print(f"{n} kab ditulis ke {'R2 kemitraan/cocok/' if '--r2' in a else keluar} dari {len(pk)} pakar berkorpus")


if __name__ == "__main__":
    main(sys.argv[1:])
