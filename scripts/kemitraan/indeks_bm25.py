#!/usr/bin/env python3
"""Indeks BM25 per bahaya untuk pencocokan pakar (ALG §4.1-§4.4, DT §5.2, KM-C07).
Dokumen = satu karya (judul dihitung 2x). Per bahaya b: pakar masuk bila rumpunnya ∋ rumpun b, atau topik/teks karyanya memuat kata kamus b.
`bangun()` = indeks LENGKAP di memori (dipakai cocok_pakar.py); `potong()` = berkas ringkas R2 `kemitraan/indeks_bm25/<B>.json` (<= 400 KB,
<= 2.000 token) untuk worker. Data pakar hanya ke --keluar (di luar repo) atau R2; tidak pernah ke public/.
Pakai: python3 -I scripts/kemitraan/indeks_bm25.py --induk induk.json --kampus kampus.json --korpus DIR (--keluar DIR | --r2) [--rekam rekam.json] | --cek"""
import collections, json, math, os, re, sys, tempfile

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from konst import KONST  # noqa: E402
import korpus as kp  # noqa: E402  (hanya pustaka: jaga_keluar, wrangler, tulis)
import masalah  # noqa: E402  (persentil)
import teks  # noqa: E402

B25, PK = KONST["BM25"], KONST["PAKAR"]
MAKS_TOKEN, MAKS_BYTE, DF_MAKS_REL = 2000, 400_000, 0.25
PULAU = {"sumatera": ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21"], "jawa": ["31", "32", "33", "34", "35", "36"], "bali": ["51"],
         "nusa tenggara": ["52", "53"], "kalimantan": ["61", "62", "63", "64", "65"], "sulawesi": ["71", "72", "73", "74", "75", "76"],
         "maluku": ["81", "82"], "papua": ["91", "92", "93", "94", "95", "96"]}
ALIAS_PULAU = {"sumatra": "sumatera", "java": "jawa", "borneo": "kalimantan", "celebes": "sulawesi", "moluccas": "maluku"}
ALIAS_PROV = {"dki jakarta": ["jakarta"], "di yogyakarta": ["yogyakarta", "jogja"], "kepulauan bangka belitung": ["bangka belitung"]}


def pulau_dari_prov(prov):
    return next((n for n, ps in PULAU.items() if prov in ps), "")


# ---------------------------------------------------------------- BM25 murni (acuan A5, A5b)
def idf(N, n):
    return math.log(1 + (N - n + 0.5) / (n + 0.5))


def suku(i, f, dl, avgdl):
    return i * f * (B25["k1"] + 1) / (f + B25["k1"] * (1 - B25["b"] + B25["b"] * dl / avgdl))


def bm25(q, d, stat):
    """q: token kueri; d: {"judul":[token],"isi":[token]}; stat: {"N","avgdl","df"}. f = 2 x tf_judul + tf_isi, |d| = 2 x |judul| + |isi|."""
    w = B25["BOBOT_JUDUL"]
    cj, ci = collections.Counter(d["judul"]), collections.Counter(d["isi"])
    dl = w * len(d["judul"]) + len(d["isi"])
    s = 0.0
    for t in dict.fromkeys(q):
        f = w * cj[t] + ci[t]
        if f:
            s += suku(idf(stat["N"], stat["df"].get(t, 0)), f, dl, stat["avgdl"])
    return s


# ---------------------------------------------------------------- bahan pakar
def tf_karya(k):
    tj = collections.Counter(teks.token(k.get("judul")))
    ti = collections.Counter(teks.token((k.get("abstrak") or "") + " " + " ".join(k.get("topik") or [])))
    return tj, ti, B25["BOBOT_JUDUL"] * sum(tj.values()) + sum(ti.values())


def muat_korpus(d):
    """DIR/<n>.json (bukan _status) -> {id_pakar: [karya]}."""
    out = {}
    for n in sorted(os.listdir(d)):
        if re.fullmatch(r"\d+\.json", n):
            for i, v in json.load(open(os.path.join(d, n), encoding="utf-8")).items():
                out[i] = v.get("karya") or []
    return out


def nama_cari(nama):
    n = (nama or "").lower().strip().replace("kep.", "kepulauan")
    while True:
        m = re.sub(r"^(kab\.?|kabupaten|kota|adm\.?|administrasi)\s+", "", n)
        if m == n:
            break
        n = m
    return re.sub(r"\s+", " ", n)


ARAH_EN = {"tengah": "central", "timur": "east", "barat": "west", "utara": "north", "selatan": "south", "tenggara": "southeast"}
PULAU_EN = {"jawa": "java", "sumatera": "sumatra"}
KATA_UMUM = {"batang", "banjar", "lebak", "pasir", "bangka"}  # nama kab yang juga kata biasa/pulau: sebutan telanjang hanya bukti lemah


def alias_prov_en(n):
    """Nama provinsi (sudah nama_cari) -> alias Inggris: 'kalimantan tengah' -> 'central kalimantan', 'jawa barat' -> 'west java'."""
    w, out = n.split(), set()
    if n == "papua barat daya":
        out.add("southwest papua")
    elif n.startswith("nusa tenggara ") and len(w) == 3 and w[2] in ARAH_EN:
        out.add(ARAH_EN[w[2]] + " nusa tenggara")
    elif len(w) >= 2 and w[-1] in ARAH_EN:
        dasar = " ".join(w[:-1])
        out |= {f"{ARAH_EN[w[-1]]} {dasar}", f"{ARAH_EN[w[-1]]} {PULAU_EN.get(dasar, dasar)}"}
    if n.startswith("kepulauan "):
        out.add(n[len("kepulauan "):] + " islands")
    return out


def frasa_wilayah(kode, prov_nama):
    """-> {frasa huruf kecil: set(kunci)}. Kunci: 'k:<kab4>' bukti KUAT (L = 1), 'l:<kab4>' bukti LEMAH (L = 0,6), 'p:<NN>' provinsi/pulau (L = 0,6).
    Kuat: dengan awalan kota/kabupaten/kab., atau akhiran/awalan Inggris regency/city, atau nama telanjang >= 5 huruf yang tidak rancu.
    Rancu (lemah): sama dengan nama provinsi, dipakai >= 2 kab/kota (Bandung kab+kota), atau kata biasa (KATA_UMUM). Nama <= 4 huruf (Batu, Palu, Bone) hanya sah berawalan."""
    d = collections.defaultdict(set)
    nm_prov = {nama_cari(v) for v in prov_nama.values()}
    pakai = collections.Counter(nama_cari(v["nama"]) for v in kode.values())
    for k4, v in kode.items():
        nm, kota = nama_cari(v["nama"]), v["nama"].lower().startswith("kota")
        if len(nm) < 3:
            continue
        for aw in (["kota ", "city of "] if kota else ["kabupaten ", "kab. ", "kab ", "regency of "]):
            d[aw + nm].add("k:" + k4)
        d[nm + (" city" if kota else " regency")].add("k:" + k4)
        if len(nm) >= 5:
            rancu = nm in nm_prov or pakai[nm] > 1 or nm in KATA_UMUM
            d[nm].add(("l:" if rancu else "k:") + k4)
    for p, nm in prov_nama.items():
        n = nama_cari(nm)
        for f in {n, *ALIAS_PROV.get(n, []), *alias_prov_en(n)}:
            d[f].add("p:" + p)
    for n, ps in PULAU.items():
        d[n].update("p:" + p for p in ps)
    for a, n in ALIAS_PULAU.items():
        d[a].update("p:" + p for p in PULAU[n])
    return dict(d)


def kompilasi(frasa):
    alt = sorted(frasa, key=len, reverse=True)
    return re.compile(r"(?<![^\W_])(" + "|".join(re.escape(a).replace(r"\ ", r"\s+") for a in alt) + r")(?![^\W_])")


def lokal(teks_pakar, frasa, rx):
    ada = set()
    for m in rx.finditer(teks_pakar.lower()):
        f = re.sub(r"\s+", " ", m.group(1))
        ada |= frasa.get(f, set())
    kuat = {x[2:] for x in ada if x[0] == "k"}
    return {"kab4": sorted(kuat), "kab4_lemah": sorted({x[2:] for x in ada if x[0] == "l"} - kuat), "prov": sorted(x[2:] for x in ada if x[0] == "p")}


def siapkan_pakar(orang, kampus, korp, rekam, frasa):
    """-> list pakar (hanya yang punya karya). Persentil h dan 'baru' atas pakar berkorpus. rekam = {"catat":[id],"lencana":[id]}."""
    rx, dimuat, rekam = kompilasi(frasa), rekam is not None, rekam or {}
    out = []
    for o in orang:
        ka = korp.get(o[0])
        if not ka or o[15:16] == ["asing"]:
            continue
        kmp = kampus.get(o[2]) or {}
        lat, lon = kmp.get("lat"), kmp.get("lon")
        baru = sum(1 for k in ka if (k.get("tahun") or 0) >= PK["MUTU_TAHUN"]) / len(ka)
        out.append({"id": o[0], "nama": o[1], "kampus": o[2], "rumpun": list(o[3] or []), "h": o[4] or 0, "baru": baru,
                    "lat": lat if isinstance(lat, (int, float)) else None, "lon": lon if isinstance(lon, (int, float)) else None,
                    "rekam": PK["REKAM_CATAT"] if o[0] in rekam.get("catat", ()) else PK["REKAM_LENCANA"] if o[0] in rekam.get("lencana", ()) else 0,
                    "rekam_dimuat": dimuat, "karya": ka, "tf": [tf_karya(k) for k in ka],
                    "topik_teks": " | ".join(t.lower() for k in ka for t in (k.get("topik") or [])),
                    "topik_tok": set(t for k in ka for t in teks.token(" ".join(k.get("topik") or []))),
                    "lokal": lokal(" ".join(k.get("judul", "") + " " + (k.get("abstrak") or "") for k in ka), frasa, rx)})
    hs, bs = [p["h"] for p in out], [p["baru"] for p in out]
    for p in out:
        p["h_pct"] = masalah.persentil(hs, p["h"]) or 0.0
        p["baru_pct"] = masalah.persentil(bs, p["baru"]) or 0.0
    return out


# ---------------------------------------------------------------- indeks per bahaya
# Token kamus yang setelah stem tinggal serpihan (< 4 huruf: 'mas' dari massa, 'hut' dari hutan) atau kata umum lintas bidang
# tidak boleh berdiri sendiri sebagai bukti rumpun/teks: 'Risk Management', 'Water Resources', 'Condensed Matter' bukan pakar bencana.
GENERIK = {"gera", "pana", "flow", "fall", "land", "level", "area", "hari", "tanpa", "matter", "water", "risk", "management", "manajemen", "hazard", "bahaya",
           "multi", "heavy", "strong", "danger", "forest", "burn", "ground", "rise", "kenai", "gari", "quality", "kualita", "exposure", "bersih", "sistem",
           "warn", "peringat", "titik", "tanah", "soil", "rainfall", "extreme", "weather", "wind", "tide", "river", "slope", "coastal", "pasang", "pantai"}
_RX_FRASA = {}


def tokens_kamus(b):
    return {t for t in teks.token(" ".join(teks.kamus()["bahaya"][b])) if len(t) >= 4 and t not in GENERIK}


def frasa_kamus(b):
    """Entri kamus bahaya b utuh (huruf kecil, kata utuh) sebagai satu regex."""
    if b not in _RX_FRASA:
        alt = sorted({x.lower() for x in teks.kamus()["bahaya"][b]}, key=len, reverse=True)
        _RX_FRASA[b] = re.compile(r"(?<![^\W_])(?:" + "|".join(re.escape(a).replace(r"\ ", r"\s+") for a in alt) + r")(?![^\W_])")
    return _RX_FRASA[b]


def rumpun_r(p, b, kb):
    """ALG §4.4 R: 1 bila rumpun pakar ∋ rumpun bahaya; 0,5 bila topik OpenAlex memuat SATU ENTRI kamus b utuh atau >= 2 token kamus berbeda
    (token tunggal tidak cukup: satu kata bersama tidak membuktikan bidang); else 0."""
    if set(p["rumpun"]) & set(KONST["RUMPUN_BAHAYA"][b]):
        return 1.0
    return PK["RUMPUN_TOPIK"] if frasa_kamus(b).search(p["topik_teks"]) or len(p["topik_tok"] & kb) >= 2 else 0.0


def bangun(pakar, b):
    """Indeks LENGKAP bahaya b: {b, N, avgdl, df, posting, pakar[], _isi}. Pakar masuk bila R>0 atau ada karya yang memuat token kamus b."""
    kb, ikut = tokens_kamus(b), []
    for p in pakar:
        r = rumpun_r(p, b, kb)
        if r > 0 or any(kb & (set(tj) | set(ti)) for tj, ti, _ in p["tf"]):
            ikut.append((p, r))
    df, posting, dl_total, N = collections.Counter(), collections.defaultdict(list), 0, 0
    for pi, (p, _) in enumerate(ikut):
        for ki, (tj, ti, dl) in enumerate(p["tf"]):
            N += 1; dl_total += dl
            for t in set(tj) | set(ti):
                df[t] += 1
                posting[t].append([pi, ki, tj[t], ti[t], dl])
    return {"b": b, "N": N, "avgdl": round(dl_total / N, 4) if N else 0.0, "df": dict(df), "posting": dict(posting),
            "pakar": [{"id": p["id"], "kampus": p["kampus"], "lat": p["lat"], "lon": p["lon"], "h": p["h"], "h_pct": p["h_pct"], "baru_pct": p["baru_pct"],
                       "rumpun": p["rumpun"], "lokal": p["lokal"], "rekam": p["rekam"], "r": r} for p, r in ikut],
            "rekam_dimuat": any(p.get("rekam_dimuat") for p in pakar), "_isi": [p for p, _ in ikut]}


def potong(ix, maks_token=MAKS_TOKEN, maks_byte=MAKS_BYTE):
    """Berkas worker: kata kamus b dan a diutamakan, lalu token paling sering (df < 25% N); dibuang dari ekor sampai <= maks_byte."""
    kam = set(teks.token(" ".join(teks.kamus()["bahaya"][ix["b"]]))) | set(t for a in teks.kamus()["aspek"].values() for t in teks.token(" ".join(a)))
    batas = DF_MAKS_REL * ix["N"]
    urut = sorted((t for t in ix["posting"] if t in kam or 2 <= ix["df"][t] < batas), key=lambda t: (t not in kam, -ix["df"][t], t))[:maks_token]

    def rakit(ts):
        pakai = sorted({pl[0] for t in ts for pl in ix["posting"][t]})
        baru = {a: i for i, a in enumerate(pakai)}
        return {"v": 1, "b": ix["b"], "N": ix["N"], "avgdl": ix["avgdl"], "rekam_dimuat": ix["rekam_dimuat"], "df": {t: ix["df"][t] for t in ts},
                "posting": {t: [[baru[pl[0]]] + pl[1:] for pl in ix["posting"][t]] for t in ts},
                "pakar": [{k: v for k, v in ix["pakar"][a].items()} for a in pakai], "dipotong": len(ts) < len(ix["posting"])}
    lo, hi, hasil = 0, len(urut), None
    while lo < hi:  # bagi dua: awalan terpanjang yang muat
        m = (lo + hi + 1) // 2
        r = rakit(urut[:m])
        if len(json.dumps(r, ensure_ascii=False, separators=(",", ":")).encode()) <= maks_byte:
            lo, hasil = m, r
        else:
            hi = m - 1
    return hasil or rakit([])


def cek():
    ac = json.load(open(os.path.join(AKAR, "tests", "kemitraan", "fixtures", "acuan.json"), encoding="utf-8"))["bm25"]
    for c in ac:
        m = c["masuk"]
        h = bm25(m["q"], m["d"], m["stat"])
        assert abs(h - c["keluar"]) <= 1e-9, f"bm25 {c['id']}: {h} != {c['keluar']}"
    assert idf(10, 1) > idf(10, 9) > 0
    # posting == bm25 langsung: satu dunia mini
    kampus = {"U1": {"lat": -6.9, "lon": 107.6}}
    ka = lambda j, a, th=2022, tp=(): {"judul": j, "abstrak": a, "tahun": th, "topik": list(tp), "sitasi": 1}
    korp = {"A1001": [ka("Banjir sungai Citarum", "Model banjir untuk Jawa Barat", 2023, ["Flood Risk"]), ka("Gempa Lembang", "Sesar Lembang dan gempa", 2019)],
            "A1002": [ka("Landslide in Java", "Slope failure and flood", 2021)], "A1003": [ka("Kimia polimer", "Polimer baru", 2020)]}
    orang = [["A1001", "Pakar Uji 1", "U1", ["banjir"], 20], ["A1002", "Pakar Uji 2", "U1", ["longsor"], 5], ["A1003", "Pakar Uji 3", "U1", ["kimia"], 9]]
    frasa = {"jawa barat": {"p:32"}, "citarum": {"k:3204"}}
    pk = siapkan_pakar(orang, kampus, korp, {"catat": ["A1001"]}, frasa)
    assert [p["id"] for p in pk] == ["A1001", "A1002", "A1003"] and pk[0]["rekam"] == 1.0 and pk[1]["rekam"] == 0
    assert pk[0]["lokal"] == {"kab4": ["3204"], "kab4_lemah": [], "prov": ["32"]} and pk[1]["lokal"] == {"kab4": [], "kab4_lemah": [], "prov": []}
    assert pk[0]["rekam_dimuat"] and not siapkan_pakar(orang, kampus, korp, None, frasa)[0]["rekam_dimuat"]
    ix = bangun(pk, "banjir")
    assert [p["id"] for p in ix["pakar"]] == ["A1001", "A1002"] and ix["N"] == 3, "pakar kimia tak boleh masuk indeks banjir"
    assert ix["pakar"][0]["r"] == 1.0 and ix["pakar"][1]["r"] == 0.0  # A1002 ikut lewat teks, bukan rumpun/topik
    q = teks.token("banjir sungai citarum flood")
    stat = {"N": ix["N"], "avgdl": ix["avgdl"], "df": ix["df"]}
    for pi, p in enumerate(ix["_isi"]):
        for ki, (tj, ti, dl) in enumerate(p["tf"]):
            lewat = sum(suku(idf(ix["N"], ix["df"][t]), 2 * pl[2] + pl[3], pl[4], ix["avgdl"]) for t in dict.fromkeys(q) for pl in ix["posting"].get(t, []) if pl[0] == pi and pl[1] == ki)
            langsung = bm25(q, {"judul": list(tj.elements()), "isi": list(ti.elements())}, stat)
            assert abs(lewat - langsung) <= 1e-9, (pi, ki, lewat, langsung)
    # potong: muat batas, indeks pakar dipadatkan, token kamus bertahan
    kecil = potong(ix, maks_byte=100_000)
    assert "banjir" in kecil["posting"] and all(pl[0] < len(kecil["pakar"]) for v in kecil["posting"].values() for pl in v)
    sempit = potong(ix, maks_byte=900)
    assert len(json.dumps(sempit, separators=(",", ":")).encode()) <= 900 and sempit["dipotong"], "potong harus patuh batas byte"
    # wilayah: nama pendek butuh awalan
    fr = frasa_wilayah({"1": {"nama": "Kota Batu"}, "2": {"nama": "Kab. Pulang Pisau"}, "3": {"nama": "Kab. Bandung"}, "4": {"nama": "Kota Bandung"}}, {"62": "Kalimantan Tengah"})
    rx = kompilasi(fr)
    assert lokal("batu bara and Batu Aji", fr, rx)["kab4"] == [] and lokal("studi di Kota Batu", fr, rx)["kab4"] == ["1"]
    assert lokal("di pulang pisau dan bandung", fr, rx) == {"kab4": ["2"], "kab4_lemah": ["3", "4"], "prov": []}, "Bandung telanjang = kab+kota = lemah"
    assert lokal("Bandung city", fr, rx)["kab4"] == ["4"] and lokal("Bandung regency", fr, rx)["kab4"] == ["3"]
    assert lokal("kabupaten bandung", fr, rx)["kab4"] == ["3"] and lokal("peat in Borneo", fr, rx)["prov"] == ["61", "62", "63", "64", "65"]
    # nama rancu: sama dengan provinsi, kata biasa -> lemah; berawalan -> kuat; alias provinsi Inggris
    fr2 = frasa_wilayah({"1": {"nama": "Kab. Batang"}, "2": {"nama": "Kota Jambi"}, "3": {"nama": "Kab. Sleman"}, "4": {"nama": "Kab. Pulang Pisau"}},
                        {"15": "Jambi", "62": "Kalimantan Tengah", "32": "Jawa Barat", "36": "Banten"})
    rx2 = kompilasi(fr2)
    assert lokal("studi batang", fr2, rx2) == {"kab4": [], "kab4_lemah": ["1"], "prov": []}
    assert lokal("kabupaten batang dan Jambi", fr2, rx2) == {"kab4": ["1"], "kab4_lemah": ["2"], "prov": ["15"]}
    assert lokal("Sleman", fr2, rx2)["kab4"] == ["3"] and lokal("Pulang Pisau Regency, Central Kalimantan", fr2, rx2) == {"kab4": ["4"], "kab4_lemah": [], "prov": ["62"]}
    assert lokal("West Java", fr2, rx2)["prov"] == ["32"]
    # R: satu token umum tidak cukup (Risk Management, Water Resources, Condensed Matter), entri utuh atau 2 token berbeda cukup
    base = {"rumpun": ["kimia"], "topik_tok": set(), "topik_teks": ""}
    def r_(b, *topik):
        return rumpun_r(dict(base, topik_tok={t for x in topik for t in teks.token(x)}, topik_teks=" | ".join(x.lower() for x in topik)), b, tokens_kamus(b))
    assert r_("multi", "Risk Management") == 0.0 and r_("kekeringan", "Water Resources") == 0.0 and r_("udara", "Condensed Matter Physics") == 0.0
    assert r_("karhutla", "Forest Ecology") == 0.0 and r_("gunungapi", "Fluid Flow and Transfer", "Land Use") == 0.0
    assert r_("multi", "Disaster Management and Resilience") == 0.5 and r_("banjir", "Flood Risk and Management") == 0.5 and r_("gempa", "Seismic Fault Analysis") == 0.5
    assert all(len(t) >= 4 and t not in GENERIK for b in KONST["BAHAYA"] for t in tokens_kamus(b))
    print(f"OK indeks_bm25.py: {len(ac)} kasus acuan bm25, posting == bm25 langsung, potong patuh batas byte, wilayah awalan")


def main(a):
    g = lambda n, b=None: a[a.index(n) + 1] if n in a else b
    if "--cek" in a:
        return cek()
    if not (g("--induk") and g("--kampus") and g("--korpus") and (g("--keluar") or "--r2" in a)):
        sys.exit(__doc__)
    keluar = g("--keluar") or tempfile.mkdtemp(prefix="km_indeks_")
    kp.jaga_keluar(keluar)
    os.makedirs(keluar, exist_ok=True)
    pk = muat_semua(g("--induk"), g("--kampus"), g("--korpus"), g("--rekam"))
    for b in KONST["BAHAYA"]:
        ix = potong(bangun(pk, b))
        p = os.path.join(keluar, f"{b}.json")
        kp.tulis(p, ix)
        if "--r2" in a:
            kp.r2_taruh(f"kemitraan/indeks_bm25/{b}.json", p)
        print(f"{b}: N={ix['N']} token={len(ix['posting'])} pakar={len(ix['pakar'])} {os.path.getsize(p)} byte{' (dipotong)' if ix['dipotong'] else ''}")


def muat_semua(induk, kampus, korpus, rekam=None):
    orang = json.load(open(induk, encoding="utf-8"))
    orang = orang["orang"] if isinstance(orang, dict) else orang
    kode = json.load(open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8"))
    prov = json.load(open(os.path.join(AKAR, "public", "data", "meta.json"), encoding="utf-8"))["provinsi"]
    return siapkan_pakar(orang, json.load(open(kampus, encoding="utf-8")), muat_korpus(korpus), json.load(open(rekam, encoding="utf-8")) if rekam else None,
                         frasa_wilayah(kode, prov))


if __name__ == "__main__":
    main(sys.argv[1:])
