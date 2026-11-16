"""Simulasi kerangka L1/L2/L3 pada DIBI 2024-2026 dan logbook 2026 (Bab 6 naskah/06-kerangka.md).
Masukan : hasil/dibi_mentah_2024_2026.json, hasil/logbook_baris_harian.json, ../../../../public/data/wilayah/*.json (pp.wp = WorldPop per kab),
          ../../../../public/data/status_darurat.json, ../../../../public/gempa/data/katalog_merusak.json, data/laporan-bnpb/bulanan/2026-10/masukan/logbook_2026.json
Keluaran: hasil/sim_kerangka.json  (python sim_kerangka.py; Python 3.12, stdlib saja)
Semua ambang adalah [BAWAAN SEMENTARA] dan aturan uji; ini simulasi, bukan keputusan."""
import json, os, glob, math, collections, datetime as dt, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
AK = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AK, "../../../.."))
def P(*a): return os.path.join(AKAR, *a)
def J(p): return json.load(open(p, encoding="utf8"))

RAW = J(os.path.join(AK, "hasil/dibi_mentah_2024_2026.json"))
ROWS = RAW["data"]
EP = dt.datetime(1970, 1, 1)
def wib(ms): return (EP + dt.timedelta(milliseconds=ms, hours=7)).date()
for i, r in enumerate(ROWS):
    r["i"] = i; r["tgl"] = wib(r["dt"]); r["th"] = r["tgl"].year
    r["rb"], r["rs"], r["rr"] = r["rumah_rusak_berat"], r["rumah_rusak_sedang"], r["rumah_rusak_ringan"]
    r["fas"] = r["pendidikan_rusak"] + r["rumah_ibadat_rusak"] + r["fasyankes_rusak"] + r["kantor_rusak"] + r["jembatan_rusak"] + r["fasum_rusak"]
    r["fas5"] = r["pendidikan_rusak"] + r["rumah_ibadat_rusak"] + r["fasyankes_rusak"] + r["kantor_rusak"] + r["jembatan_rusak"]
KAT = sorted({r["kategori_bencana"] for r in ROWS})
TAHUN = (2024, 2025, 2026)
def jan_okt(t): return t.month <= 10
def pct(a, b): return None if not b else round(100.0 * a / b, 1)

# ---------------------------------------------------------------- populasi kab (WorldPop pp.wp), kunci id_kab_bps
POP = {}; POPT = {}
for f in glob.glob(P("public/data/wilayah/*.json")):
    for k, v in J(f).items():
        if len(k) == 4 and isinstance(v, dict) and v.get("pp"):
            POP[int(k)] = v["pp"].get("wp"); POPT[int(k)] = v["pp"].get("t")
POP = {k: v for k, v in POP.items() if v}

# ---------------------------------------------------------------- L1: bentuk KJN
SUM_KEYS = ["meninggal", "hilang", "luka_sakit", "menderita", "mengungsi", "rb", "rs", "rr", "rumah_terendam", "fas", "fas5",
            "pendidikan_rusak", "rumah_ibadat_rusak", "fasyankes_rusak", "fasum_rusak", "kantor_rusak", "jembatan_rusak"]
def ok1(s): return 0.95 <= s <= 1.05
grup = []   # tiap elemen: (daftar baris, bendera)
used = set()
for r in ROWS:
    if r["jumlah_kejadian"] >= 0.999:
        grup.append(([r], "satu_baris")); used.add(r["i"])
fr = [r for r in ROWS if r["i"] not in used]
g1 = collections.defaultdict(list)
for r in fr: g1[(r["kategori_bencana"], r["tgl"], r["provinsi"])].append(r)
sisa = []
for k, v in g1.items():
    if ok1(sum(x["jumlah_kejadian"] for x in v)):
        grup.append((v, "pecahan_1_prov")); used.update(x["i"] for x in v)
    else: sisa += v
g2 = collections.defaultdict(list)
for r in sisa: g2[(r["kategori_bencana"], r["tgl"])].append(r)
sisa2 = []
for k, v in g2.items():
    if ok1(sum(x["jumlah_kejadian"] for x in v)):
        grup.append((v, "pecahan_lintas_prov")); used.update(x["i"] for x in v)
    else: sisa2 += v
g3 = collections.defaultdict(list)
for r in sisa2: g3[(r["kategori_bencana"], r["tgl"], r["provinsi"])].append(r)
for v in g3.values(): grup.append((v, "pecahan_tak_genap"))
assert sum(len(v) for v, _ in grup) == len(ROWS)

KJN = []
for v, bend in grup:
    k = {"kat": v[0]["kategori_bencana"], "tgl": min(x["tgl"] for x in v), "bend": bend, "n_baris": len(v),
         "prov": sorted({x["provinsi"] for x in v}), "kab": sorted({x["kabupaten"] for x in v}), "kabid": sorted({x["id_kab_bps"] for x in v}),
         "resmi": sum(x["jumlah_kejadian"] for x in v), "is_b": any(x["is_bencana"] for x in v), "jenis": sorted({x["jenis_bencana"] for x in v})}
    for s in SUM_KEYS: k[s] = sum(x[s] for x in v)
    k["th"] = k["tgl"].year
    k["md"] = k["meninggal"] + k["hilang"]
    k["rbs"] = k["rb"] + 0.5 * k["rs"] + 0.25 * k["rr"]
    # porsi relatif: per kab dalam KJN
    pk = collections.defaultdict(float)
    for x in v: pk[x["id_kab_bps"]] += x["mengungsi"] + x["menderita"]
    best = None; ada = 0
    for kb, jml in pk.items():
        if kb in POP:
            ada += 1; q = jml / POP[kb]
            if best is None or q > best[0]: best = (q, kb, jml)
    k["porsi"] = best[0] if best else None
    k["porsi_kab"] = best[1] if best else None
    k["porsi_jml"] = best[2] if best else 0
    k["kab_berpop"] = ada
    k["multi_resmi"] = sum(1 for x in v if x["jumlah_kejadian"] >= 2)
    KJN.append(k)
KJN.sort(key=lambda k: (k["tgl"], k["kat"]))

def rowi(r):  # baris sebagai satuan (CK)
    return {"meninggal": r["meninggal"], "hilang": r["hilang"], "md": r["meninggal"] + r["hilang"], "luka_sakit": r["luka_sakit"], "menderita": r["menderita"],
            "mengungsi": r["mengungsi"], "rb": r["rb"], "rs": r["rs"], "rr": r["rr"], "rbs": r["rb"] + 0.5 * r["rs"] + 0.25 * r["rr"], "fas": r["fas"], "fas5": r["fas5"]}

# ---------------------------------------------------------------- L2 dan Juklak
def juklak(o):
    k1 = o["meninggal"] >= 1
    k2 = (o["menderita"] + o["luka_sakit"] + o["mengungsi"]) >= 50
    k3 = (o["rb"] + o["rs"] + o["rr"] + o["fas5"]) >= 5
    return {"K1": k1, "K2": k2, "K3": k3}
def l2(o):
    m1 = o["md"] >= 1
    m2 = o["mengungsi"] >= 50 or o["luka_sakit"] >= 50
    m3 = o["menderita"] >= 50
    m4 = o["rbs"] >= 5 or o["fas"] > 0
    m4b = o["rbs"] >= 5 or (o["rbs"] >= 1 and o["fas"] >= 1)
    return {"M1": m1, "M2": m2, "M3": m3, "M4": m4, "M4b": m4b}
for k in KJN:
    k["J"] = juklak(k); k["Jlolos"] = any(k["J"].values())
    k["M"] = l2(k); k["L2"] = any(k["M"][m] for m in ("M1", "M2", "M3", "M4")); k["L2b"] = any(k["M"][m] for m in ("M1", "M2", "M3", "M4b"))
for r in ROWS:
    o = rowi(r); r["J"] = juklak(o); r["Jlolos"] = any(r["J"].values()); r["M"] = l2(o)
    r["L2"] = any(r["M"][m] for m in ("M1", "M2", "M3", "M4")); r["L2b"] = any(r["M"][m] for m in ("M1", "M2", "M3", "M4b"))

# ---------------------------------------------------------------- L3
def kelas_abs(k):
    c = 0; why = []
    for nama, v, (s, b, kk) in (("meninggal+hilang", k["md"], (10, 100, 1000)), ("mengungsi", k["mengungsi"], (1000, 10000, 100000)), ("RBS", k["rbs"], (100, 1000, 10000))):
        kl = 3 if v >= kk else 2 if v >= b else 1 if v >= s else 0
        if kl > c: c = kl; why = [nama]
        elif kl == c and kl > 0: why.append(nama)
    return c, why
NM = ["R", "S", "B", "K"]
def kelas_rel(k):
    p = k["porsi"]
    if p is None: return 0
    return 3 if p >= 0.30 else 2 if p >= 0.10 else 1 if p >= 0.01 else 0
def kelas_ab(k):
    a = k["ka"]
    if k["porsi"] is not None and k["porsi"] >= 0.10 and a < 2: return a + 1
    return a
# status darurat
SK = J(P("public/data/status_darurat.json"))["sk"]
def kat_sk(j):
    t = (j or "").lower(); s = set()
    if "hidrometeorologi" in t: s |= {"Banjir", "Longsor", "Cuaca ekstrem", "Gelombang pasang / Abrasi"}
    if "banjir" in t: s.add("Banjir")
    if "longsor" in t or "gerakan tanah" in t: s.add("Longsor")
    if "cuaca ekstrem" in t or "puting beliung" in t or "angin" in t: s.add("Cuaca ekstrem")
    if "kekeringan" in t: s.add("Kekeringan")
    if "kebakaran hutan" in t or "karhutla" in t or "asap" in t or "kebakaran lahan" in t: s.add("Kebakaran hutan dan lahan")
    if "gempa" in t: s.add("Gempabumi")
    if "tsunami" in t: s.add("Tsunami")
    if "erupsi" in t or "gunung" in t: s.add("Erupsi gunung api")
    if "gelombang" in t or "abrasi" in t: s.add("Gelombang pasang / Abrasi")
    return s
SKI = []
for s in SK:
    if not s["mulai"]: continue
    SKI.append({"skala": s["skala"], "kab": int(s["kab_kode"].replace(".", "")) if s.get("kab_kode") else None, "prov": s["prov_kode"],
                "kat": kat_sk(s["jenis"]), "m": dt.date.fromisoformat(s["mulai"]),
                "b": dt.date.fromisoformat(s["berakhir"]) if s.get("berakhir") else dt.date.fromisoformat(s["mulai"]) + dt.timedelta(days=(s.get("batas_hari") or 14) - 1),
                "jenis": s["jenis"]})
def provkode(kabid): return str(kabid)[:-2]
def status_kelas(k, mundur):
    """0 tanpa status; 1 kab/kota; 2 provinsi. mundur = berapa hari SK boleh mulai SETELAH tanggal kejadian."""
    best = 0
    pks = {provkode(x) for x in k["kabid"]}
    for s in SKI:
        if k["kat"] not in s["kat"]: continue
        if not (s["m"] - dt.timedelta(days=mundur) <= k["tgl"] <= s["b"]): continue
        if s["skala"] == "kabupaten" and s["kab"] in k["kabid"]: best = max(best, 1)
        if s["skala"] == "provinsi" and s["prov"] in pks: best = max(best, 2)
    return best
for k in KJN:
    k["ka"], k["ka_why"] = kelas_abs(k)
    k["kb"] = kelas_rel(k)
    k["kab_"] = kelas_ab(k)
    k["sc_strict"] = status_kelas(k, 0); k["sc"] = status_kelas(k, 14)
    k["kc"] = k["sc"]       # tanpa status=R(0), kab=S(1), prov=B(2)
    k["kc"] = {0: 0, 1: 1, 2: 2}[k["sc"]]
    k["score"] = (math.log10(1 + k["md"]) + math.log10(1 + k["mengungsi"]) + math.log10(1 + k["rbs"])) / 3
L2K = [k for k in KJN if k["L2"]]
# opsi d: titik potong agar proporsi sama dengan opsi a (gabungan semua tahun, KJN L2)
cnt = collections.Counter(k["ka"] for k in L2K); n = len(L2K)
sk_ = sorted(k["score"] for k in L2K)
cuts = []
cum = 0
for c in range(3):
    cum += cnt[c]; idx = min(n - 1, cum)
    cuts.append(sk_[idx] if idx < n else sk_[-1])
# tiap titik potong: kelas naik bila score >= cut ; cut memakai nilai pertama kelas lebih tinggi
def kelas_d(k):
    return sum(1 for c in cuts if k["score"] >= c and c > 0) if cuts[0] > 0 else sum(1 for c in cuts if k["score"] >= c)
for k in KJN: k["kd"] = kelas_d(k)
L2K = [k for k in KJN if k["L2"]]


# ---------------------------------------------------------------- VERSI 2 (kerangka direvisi): L2v2 dan L3v2
def l2v2(k):
    m = {"M1": k["md"] >= 1, "M2": (k["luka_sakit"] + k["mengungsi"] + k["menderita"]) >= 50, "M3": k["rbs"] >= 5, "M4": k["fas5"] > 0}
    return m
def kelas_v2(k):
    t = lambda v, s, b, kk: 3 if v >= kk else 2 if v >= b else 1 if v >= s else 0
    c_md = t(k["md"], 10, 100, 1000); c_rbs = t(k["rbs"], 100, 1000, 10000); c_ung = t(k["mengungsi"], 1000, 10000, 100000)
    base = max(c_md, c_rbs)
    if base >= 1: c = max(base, c_ung)
    else: c = min(c_ung, 1)
    return c
def kelas_ab2(k):
    a = k["ka2"]; p = k["porsi"]
    if p is not None and p >= 0.10:
        j = k["porsi_jml"]
        if a == 0 and j >= 100: return 1
        if a == 1 and j >= 1000: return 2
    return a
for k in KJN:
    k["M2v"] = l2v2(k); k["L2v"] = any(k["M2v"].values()); k["ka2"] = kelas_v2(k); k["kab2"] = kelas_ab2(k)
L2V = [k for k in KJN if k["L2v"]]

# ---------------------------------------------------------------- pelaporan
OUT = {"meta": {"sumber": "DIBI dasbor publik (dibi.bnpb.go.id/api/v1/chart/data), ditarik " + RAW["ditarik"] + "; baris " + str(len(ROWS)) + ", tanggal WIB (UTC+7) " + str(min(r['tgl'] for r in ROWS)) + " s.d. " + str(max(r['tgl'] for r in ROWS)),
                 "penduduk": "WorldPop R2025A per kabupaten (public/data/wilayah/*.json, pp.wp; bukan angka BPS), kab berpenduduk " + str(len(POP)),
                 "status": "public/data/status_darurat.json (BNPB CKAN), " + str(len(SK)) + " SK, tanpa SK skala nasional", "cut_opsi_d": cuts}}

def tab(rs_fn, keyfn, keys):
    return {kk: rs_fn([x for x in keyfn if x[0] == kk]) for kk in keys}
# 1. L1
l1 = {}
for t in TAHUN:
    rt = [r for r in ROWS if r["th"] == t]; kt = [k for k in KJN if k["th"] == t]
    d = {"baris": len(rt), "kjn": len(kt), "ck": len(rt), "resmi_semua": round(sum(r["jumlah_kejadian"] for r in rt), 1),
         "resmi_is_bencana": round(sum(r["jumlah_kejadian"] for r in rt if r["is_bencana"]), 1), "baris_is_bencana": sum(1 for r in rt if r["is_bencana"]),
         "kjn_is_bencana": sum(1 for k in kt if k["is_b"]), "bendera": dict(collections.Counter(k["bend"] for k in kt)),
         "kjn_resmi_ge2": sum(1 for k in kt if k["multi_resmi"])}
    d["per_kategori"] = {}
    for c in KAT:
        rc = [r for r in rt if r["kategori_bencana"] == c]; kc = [k for k in kt if k["kat"] == c]
        d["per_kategori"][c] = {"baris": len(rc), "kjn": len(kc), "ck": len(rc), "resmi_semua": round(sum(r["jumlah_kejadian"] for r in rc), 1),
                                "resmi_is_bencana": round(sum(r["jumlah_kejadian"] for r in rc if r["is_bencana"]), 1)}
    l1[t] = d
OUT["L1"] = l1
OUT["L1_ket"] = {"baris_dgn_jumlah_kejadian_ge2": sum(1 for r in ROWS if r["jumlah_kejadian"] >= 2),
                 "baris_pecahan": sum(1 for r in ROWS if r["jumlah_kejadian"] < 0.999), "kjn_pecahan_tak_genap": sum(1 for k in KJN if k["bend"] == "pecahan_tak_genap"),
                 "jumlah_kjn_total": len(KJN), "id_kab_bps_cocok_penduduk": pct(sum(1 for r in ROWS if r["id_kab_bps"] in POP), len(ROWS)),
                 "kab_unik_dibi": len({r["id_kab_bps"] for r in ROWS}), "kab_unik_tanpa_penduduk": sorted({r["kabupaten"] for r in ROWS if r["id_kab_bps"] not in POP})[:15]}

# 2. L2 lawan Juklak
def hitung_l2(kt, rt):
    d = {"baris": len(rt), "baris_juklak": sum(1 for r in rt if r["Jlolos"]), "baris_l2": sum(1 for r in rt if r["L2"]), "baris_l2b": sum(1 for r in rt if r["L2b"]),
         "kjn": len(kt), "kjn_juklak": sum(1 for k in kt if k["Jlolos"]), "kjn_l2": sum(1 for k in kt if k["L2"]), "kjn_l2b": sum(1 for k in kt if k["L2b"]),
         "kjn_l2_bukan_juklak": sum(1 for k in kt if k["L2"] and not k["Jlolos"]), "kjn_juklak_bukan_l2": sum(1 for k in kt if k["Jlolos"] and not k["L2"]),
         "kjn_dibi_is_bencana": sum(1 for k in kt if k["is_b"])}
    d["selisih_pct_kjn_l2_vs_juklak"] = None if not d["kjn_juklak"] else round(100.0 * (d["kjn_l2"] - d["kjn_juklak"]) / d["kjn_juklak"], 1)
    d["selisih_pct_kjn_l2b_vs_juklak"] = None if not d["kjn_juklak"] else round(100.0 * (d["kjn_l2b"] - d["kjn_juklak"]) / d["kjn_juklak"], 1)
    d["selisih_pct_baris_l2_vs_juklak"] = None if not d["baris_juklak"] else round(100.0 * (d["baris_l2"] - d["baris_juklak"]) / d["baris_juklak"], 1)
    # penentu tunggal
    d["juklak_tunggal"] = {c: sum(1 for k in kt if k["J"][c] and sum(k["J"].values()) == 1) for c in ("K1", "K2", "K3")}
    d["l2_tunggal"] = {c: sum(1 for k in kt if k["L2"] and k["M"][c] and sum(k["M"][m] for m in ("M1", "M2", "M3", "M4")) == 1) for c in ("M1", "M2", "M3", "M4")}
    d["l2b_tunggal"] = {c: sum(1 for k in kt if k["L2b"] and k["M"][c] and sum(k["M"][m] for m in ("M1", "M2", "M3", "M4b")) == 1) for c in ("M1", "M2", "M3", "M4b")}
    d["l2_hanya_fasilitas_tanpa_RBS1"] = sum(1 for k in kt if k["M"]["M4"] and not k["M"]["M4b"] and not (k["M"]["M1"] or k["M"]["M2"] or k["M"]["M3"]))
    return d
OUT["L2"] = {}
for t in TAHUN:
    kt = [k for k in KJN if k["th"] == t]; rt = [r for r in ROWS if r["th"] == t]
    d = hitung_l2(kt, rt); d["per_kategori"] = {}
    for c in KAT:
        d["per_kategori"][c] = hitung_l2([k for k in kt if k["kat"] == c], [r for r in rt if r["kategori_bencana"] == c])
    OUT["L2"][t] = d
OUT["L2"]["semua"] = hitung_l2(KJN, ROWS)
OUT["L2"]["jan_okt"] = {t: hitung_l2([k for k in KJN if k["th"] == t and jan_okt(k["tgl"])], [r for r in ROWS if r["th"] == t and jan_okt(r["tgl"])]) for t in TAHUN}
# is_bencana vs juklak/L2 pada baris
OUT["L2"]["is_bencana_vs"] = {str(t): {"baris_is_bencana_true": sum(1 for r in ROWS if r["th"] == t and r["is_bencana"]), "true_dan_juklak": sum(1 for r in ROWS if r["th"] == t and r["is_bencana"] and r["Jlolos"]),
        "true_dan_l2": sum(1 for r in ROWS if r["th"] == t and r["is_bencana"] and r["L2"]), "false_dan_juklak": sum(1 for r in ROWS if r["th"] == t and not r["is_bencana"] and r["Jlolos"]),
        "false_dan_l2": sum(1 for r in ROWS if r["th"] == t and not r["is_bencana"] and r["L2"]), "false_total": sum(1 for r in ROWS if r["th"] == t and not r["is_bencana"])} for t in TAHUN}
def contoh(k):
    return {"wilayah": ", ".join(k["kab"][:3]) + (" dan %d kab lain" % (len(k["kab"]) - 3) if len(k["kab"]) > 3 else "") + " (" + ", ".join(k["prov"]) + ")", "tgl": str(k["tgl"]), "kategori": k["kat"],
            "meninggal": k["meninggal"], "hilang": k["hilang"], "luka": k["luka_sakit"], "menderita": k["menderita"], "mengungsi": k["mengungsi"], "RB": k["rb"], "RS": k["rs"], "RR": k["rr"], "RBS": round(k["rbs"], 2), "fasilitas": k["fas"]}
a = sorted([k for k in KJN if k["L2"] and not k["Jlolos"]], key=lambda k: -(k["md"] * 1000 + k["mengungsi"] + k["menderita"]))
b = sorted([k for k in KJN if k["Jlolos"] and not k["L2"]], key=lambda k: -(k["meninggal"] + k["menderita"] + k["luka_sakit"] + k["mengungsi"] + k["rb"] + k["rs"] + k["rr"]))
OUT["L2"]["contoh_l2_bukan_juklak"] = [contoh(k) for k in a[:6]]
OUT["L2"]["contoh_juklak_bukan_l2"] = [contoh(k) for k in b[:6]]
# penyebab juklak bukan l2: K2 dgn gabungan kategori lemah, K3 rumah ringan
ju_bl = collections.Counter()
for k in KJN:
    if k["Jlolos"] and not k["L2"]:
        ju_bl[("K1" if k["J"]["K1"] else "") + ("K2" if k["J"]["K2"] else "") + ("K3" if k["J"]["K3"] else "")] += 1
OUT["L2"]["juklak_bukan_l2_penentu"] = dict(ju_bl)
l2_bj = collections.Counter()
for k in KJN:
    if k["L2"] and not k["Jlolos"]:
        l2_bj["".join(m for m in ("M1", "M2", "M3", "M4") if k["M"][m])] += 1
OUT["L2"]["l2_bukan_juklak_penentu"] = dict(l2_bj)

# 3. L3
def sebaran(kt, fld):
    c = collections.Counter(k[fld] for k in kt); n = len(kt)
    return {"n": n, **{NM[i]: c[i] for i in range(4)}, "pct": {NM[i]: pct(c[i], n) for i in range(4)}}
OPSI = {"a": "ka", "b": "kb", "a+b": "kab_", "c": "kc", "d": "kd"}
L3 = {"opsi": {}, "matriks": {}, "ket": {}}
for o, f in OPSI.items():
    L3["opsi"][o] = {"semua": sebaran(L2K, f)}
    for t in TAHUN: L3["opsi"][o][str(t)] = sebaran([k for k in L2K if k["th"] == t], f)
    L3["opsi"][o]["per_kategori"] = {c: sebaran([k for k in L2K if k["kat"] == c], f) for c in KAT}
def matriks(f1, f2):
    m = [[0] * 4 for _ in range(4)]
    for k in L2K: m[k[f1]][k[f2]] += 1
    n = len(L2K); sama = sum(m[i][i] for i in range(4))
    return {"baris": "kelas " + f1 + " (R,S,B,K)", "kolom": "kelas " + f2 + " (R,S,B,K)", "m": m, "sama_pct": pct(sama, n),
            "f1_lebih_tinggi": pct(sum(m[i][j] for i in range(4) for j in range(4) if i > j), n), "f2_lebih_tinggi": pct(sum(m[i][j] for i in range(4) for j in range(4) if j > i), n)}
L3["matriks"] = {"a_vs_b": matriks("ka", "kb"), "a_vs_c": matriks("ka", "kc"), "a+b_vs_a": matriks("kab_", "ka"), "a_vs_d": matriks("ka", "kd")}
L3["ket"] = {"n_l2": len(L2K), "kjn_tanpa_penduduk_kab": sum(1 for k in L2K if k["porsi"] is None),
             "kjn_porsi_ge10": sum(1 for k in L2K if k["porsi"] is not None and k["porsi"] >= 0.10), "kjn_porsi_ge30": sum(1 for k in L2K if k["porsi"] is not None and k["porsi"] >= 0.30),
             "kjn_porsi_gt100": sum(1 for k in L2K if k["porsi"] is not None and k["porsi"] > 1),
             "naik_oleh_penaik_relatif": sum(1 for k in L2K if k["kab_"] > k["ka"]),
             "tanpa_status_pct_semua": pct(sum(1 for k in L2K if k["sc"] == 0), len(L2K)), "tanpa_status_pct_ketat": pct(sum(1 for k in L2K if k["sc_strict"] == 0), len(L2K)),
             "tanpa_status_pct_per_tahun": {str(t): pct(sum(1 for k in L2K if k["th"] == t and k["sc"] == 0), sum(1 for k in L2K if k["th"] == t)) for t in TAHUN},
             "tanpa_status_pct_semua_kjn": pct(sum(1 for k in KJN if k["sc"] == 0), len(KJN)),
             "tanpa_status_hanya_kategori_alam_ada_di_sk": pct(sum(1 for k in L2K if k["sc"] == 0 and k["kat"] in ("Banjir", "Longsor", "Cuaca ekstrem", "Kekeringan", "Kebakaran hutan dan lahan", "Gempabumi", "Erupsi gunung api", "Gelombang pasang / Abrasi")), sum(1 for k in L2K if k["kat"] in ("Banjir", "Longsor", "Cuaca ekstrem", "Kekeringan", "Kebakaran hutan dan lahan", "Gempabumi", "Erupsi gunung api", "Gelombang pasang / Abrasi"))),
             "sk_per_tahun_mulai": dict(collections.Counter(str(s["m"].year) for s in SKI)),
             "kelas_b_k_tanpa_status": sum(1 for k in L2K if k["ka"] >= 2 and k["sc"] == 0), "kelas_b_k_total_a": sum(1 for k in L2K if k["ka"] >= 2),
             "kelas_r_dengan_status_prov": sum(1 for k in L2K if k["ka"] == 0 and k["sc"] == 2),
             "d_beda_dari_a": pct(sum(1 for k in L2K if k["kd"] != k["ka"]), len(L2K)), "d_cut": cuts,
             "l2b_n": sum(1 for k in KJN if k["L2b"]), "l2_n": len(L2K)}
# L3 pada L2b juga
L2KB = [k for k in KJN if k["L2b"]]
L3["pada_l2b"] = {o: sebaran(L2KB, f) for o, f in OPSI.items() if o in ("a", "a+b")}
def top_row(k):
    why = list(k["ka_why"]) if k["ka"] > 0 else []
    if k["kab_"] > k["ka"]: why.append("penaik relatif %.1f%% penduduk kab %s" % (100 * k["porsi"], k["porsi_kab"]))
    return {"kelas_ab": NM[k["kab_"]], "kelas_a": NM[k["ka"]], "kelas_b": NM[k["kb"]], "kelas_c": NM[k["kc"]], "kelas_d": NM[k["kd"]], "penentu": "; ".join(why) or "-",
            **contoh(k), "porsi_pct": None if k["porsi"] is None else round(100 * k["porsi"], 2), "skor_d": round(k["score"], 3)}
tp = sorted(L2K, key=lambda k: (-k["kab_"], -k["score"]))[:15]
L3["top15_a+b"] = [top_row(k) for k in tp]
tb = sorted([k for k in L2K if k["kb"] >= 2], key=lambda k: -k["porsi"])[:10]
L3["top10_relatif"] = [top_row(k) for k in tb]
# gempa
GK = J(P("public/gempa/data/katalog_merusak.json"))["baris"]
def prov_in(txt, provs):
    t = (txt or "").lower()
    return any(p.lower() in t for p in provs)
def mag_gempa(k):
    best = None
    for r in GK:
        try: d = dt.date.fromisoformat(r["tanggal"])
        except Exception: continue
        if abs((d - k["tgl"]).days) <= 1 and (prov_in(r["lokasi"], k["prov"]) or prov_in(r["dirasakan"], k["prov"]) or any(kb.lower() in ((r["lokasi"] or "") + (r["dirasakan"] or "")).lower() for kb in k["kab"])):
            if best is None or (r["magnitudo"] or 0) > (best["magnitudo"] or 0): best = r
    return best
gem = [k for k in KJN if k["kat"] == "Gempabumi"]
gl = []
for k in sorted(gem, key=lambda k: (-k["kab_"], k["tgl"])):
    if k["kab_"] >= 2 or k["ka"] >= 2 or k["kb"] >= 2:
        m = mag_gempa(k)
        gl.append({**contoh(k), "kelas_a": NM[k["ka"]], "kelas_ab": NM[k["kab_"]], "kelas_b": NM[k["kb"]], "L2": k["L2"],
                   "magnitudo": m["magnitudo"] if m else None, "katalog_id": m["id"] if m else None, "ket_katalog": "BMKG Katalog Signifikan & Merusak 1821-2025 (berakhir 2025-12-28)" if m else ("tanggal setelah akhir katalog" if k["tgl"] > dt.date(2025, 12, 28) else "tidak ada pasangan di katalog")})
L3["gempa"] = {"kjn_gempa_total": len(gem), "kjn_gempa_l2": sum(1 for k in gem if k["L2"]), "sebaran_a": dict(collections.Counter(NM[k["ka"]] for k in gem if k["L2"])),
               "sebaran_ab": dict(collections.Counter(NM[k["kab_"]] for k in gem if k["L2"])), "sebaran_b": dict(collections.Counter(NM[k["kb"]] for k in gem if k["L2"])),
               "kelas_B_atau_K_menurut_a": sum(1 for k in gem if k["L2"] and k["ka"] >= 2), "kelas_B_atau_K_menurut_ab": sum(1 for k in gem if k["L2"] and k["kab_"] >= 2),
               "kelas_B_atau_K_menurut_b": sum(1 for k in gem if k["L2"] and k["kb"] >= 2), "daftar": gl}
# gempa kelas S dgn magnitudo, ringkas
gs = []
for k in gem:
    if k["L2"] and k["kab_"] == 1:
        m = mag_gempa(k); gs.append({"tgl": str(k["tgl"]), "prov": ", ".join(k["prov"]), "magnitudo": m["magnitudo"] if m else None, "md": k["md"], "mengungsi": k["mengungsi"], "RBS": round(k["rbs"], 1)})
L3["gempa"]["kelas_S_ringkas"] = gs[:20]; L3["gempa"]["kelas_S_n"] = len(gs)
OUT["L3"] = L3

V2 = {"L2": {}, "L3": {}}
for t in TAHUN + ("semua",):
    kt = KJN if t == "semua" else [k for k in KJN if k["th"] == t]
    d = {"kjn": len(kt), "juklak": sum(1 for k in kt if k["Jlolos"]), "l2_v1": sum(1 for k in kt if k["L2"]), "l2_v2": sum(1 for k in kt if k["L2v"]),
         "v2_bukan_juklak": sum(1 for k in kt if k["L2v"] and not k["Jlolos"]), "juklak_bukan_v2": sum(1 for k in kt if k["Jlolos"] and not k["L2v"]),
         "tunggal_v2": {c: sum(1 for k in kt if k["L2v"] and k["M2v"][c] and sum(k["M2v"].values()) == 1) for c in ("M1", "M2", "M3", "M4")},
         "selisih_pct_v2_vs_juklak": None}
    d["selisih_pct_v2_vs_juklak"] = None if not d["juklak"] else round(100.0 * (d["l2_v2"] - d["juklak"]) / d["juklak"], 1)
    d["per_kategori"] = {c: {"kjn": sum(1 for k in kt if k["kat"] == c), "juklak": sum(1 for k in kt if k["kat"] == c and k["Jlolos"]), "l2_v1": sum(1 for k in kt if k["kat"] == c and k["L2"]),
                             "l2_v2": sum(1 for k in kt if k["kat"] == c and k["L2v"])} for c in KAT}
    V2["L2"][str(t)] = d
def sebv(kt, f):
    c = collections.Counter(k[f] for k in kt); n = len(kt)
    return {"n": n, **{NM[i]: c[i] for i in range(4)}, "pct": {NM[i]: pct(c[i], n) for i in range(4)}}
for nm, f in (("a_v2", "ka2"), ("a+b_v2", "kab2")):
    V2["L3"][nm] = {"semua": sebv(L2V, f), **{str(t): sebv([k for k in L2V if k["th"] == t], f) for t in TAHUN}, "per_kategori": {c: sebv([k for k in L2V if k["kat"] == c], f) for c in KAT}}
V2["L3"]["a_v1_pada_L2v2"] = sebv(L2V, "ka"); V2["L3"]["a+b_v1_pada_L2v2"] = sebv(L2V, "kab_")
mm = [[0] * 4 for _ in range(4)]
for k in L2V: mm[k["ka"]][k["ka2"]] += 1
V2["L3"]["matriks_a_v1_vs_a_v2"] = mm
mm = [[0] * 4 for _ in range(4)]
for k in L2V: mm[k["kab2"]][k["ka2"]] += 1
V2["L3"]["matriks_ab_v2_vs_a_v2"] = mm
V2["L3"]["naik_penaik_relatif_v2"] = sum(1 for k in L2V if k["kab2"] > k["ka2"])
V2["L3"]["kena_batas_mengungsi_saja"] = sum(1 for k in L2V if k["ka"] > k["ka2"])
def top2(k):
    why = []
    if k["ka2"] > 0:
        if k["md"] >= 10: why.append("meninggal+hilang")
        if k["rbs"] >= 100: why.append("RBS")
        if k["mengungsi"] >= 1000: why.append("mengungsi")
    if k["kab2"] > k["ka2"]: why.append("penaik relatif %.1f%% penduduk" % (100 * k["porsi"]))
    return {"kelas_ab2": NM[k["kab2"]], "kelas_a2": NM[k["ka2"]], "penentu": "; ".join(why) or "-", **contoh(k), "porsi_pct": None if k["porsi"] is None else round(100 * k["porsi"], 2)}
V2["L3"]["top15_ab2"] = [top2(k) for k in sorted(L2V, key=lambda k: (-k["kab2"], -k["score"]))[:15]]
gm = [k for k in KJN if k["kat"] == "Gempabumi" and k["L2v"]]
V2["L3"]["gempa"] = {"l2v2": len(gm), "sebaran_a2": dict(collections.Counter(NM[k["ka2"]] for k in gm)), "sebaran_ab2": dict(collections.Counter(NM[k["kab2"]] for k in gm)),
    "B_atau_K_ab2": [ {**top2(k), "magnitudo": (mag_gempa(k) or {}).get("magnitudo")} for k in gm if k["kab2"] >= 2]}
V2["tren_jan_okt"] = {str(t): {"kjn_l2_v2": sum(1 for k in KJN if k["th"] == t and jan_okt(k["tgl"]) and k["L2v"]), "kjn_S_ke_atas_ab2": sum(1 for k in L2V if k["th"] == t and jan_okt(k["tgl"]) and k["kab2"] >= 1),
    "kjn_B_ke_atas_ab2": sum(1 for k in L2V if k["th"] == t and jan_okt(k["tgl"]) and k["kab2"] >= 2)} for t in TAHUN}
V2["tren_tahun_berjalan"] = {str(t): {"kjn_l2_v2": sum(1 for k in KJN if k["th"] == t and k["L2v"]), "kjn_S_ke_atas_ab2": sum(1 for k in L2V if k["th"] == t and k["kab2"] >= 1)} for t in TAHUN}
# magnitudo dari EMSC (public/gempa/data/emsc_arsip.json) bila katalog BMKG berakhir 2025-12-28; dicocokkan manual menurut tanggal UTC dan lokasi episentrum
EMSC = {"2026-08-15": {"m": 7.7, "waktu_utc": "2026-08-14T21:58", "lat": -8.374, "lon": 121.358, "kedalaman_km": 20.0}, "2026-06-16": {"m": 6.7, "waktu_utc": "2026-06-16T03:27", "lat": -1.131, "lon": 120.195, "kedalaman_km": 10.0}}
for r in L3["gempa"]["daftar"]:
    if r["tgl"] in EMSC: r["magnitudo_emsc_manual"] = EMSC[r["tgl"]]
for r in V2["L3"]["gempa"]["B_atau_K_ab2"]:
    if r["tgl"] in EMSC: r["magnitudo_emsc_manual"] = EMSC[r["tgl"]]
OUT["v2"] = V2

# 4. Tren
def tren(flt):
    out = {}
    for t in TAHUN:
        rt = [r for r in ROWS if r["th"] == t and flt(r["tgl"])]; kt = [k for k in KJN if k["th"] == t and flt(k["tgl"])]
        l2t = [k for k in kt if k["L2"]]
        out[t] = {"baris": len(rt), "kjn": len(kt), "resmi_semua": round(sum(r["jumlah_kejadian"] for r in rt), 1),
                  "resmi_is_bencana": round(sum(r["jumlah_kejadian"] for r in rt if r["is_bencana"]), 1),
                  "kjn_l2": len(l2t), "kjn_kelas_S_ke_atas_ab": sum(1 for k in l2t if k["kab_"] >= 1), "kjn_kelas_B_ke_atas_ab": sum(1 for k in l2t if k["kab_"] >= 2),
                  "kjn_kelas_S_ke_atas_a": sum(1 for k in l2t if k["ka"] >= 1),
                  "kjn_juklak": sum(1 for k in kt if k["Jlolos"]),
                  "meninggal": sum(r["meninggal"] for r in rt), "hilang": sum(r["hilang"] for r in rt), "md": sum(r["meninggal"] + r["hilang"] for r in rt),
                  "mengungsi": sum(r["mengungsi"] for r in rt), "rbs": round(sum(r["rb"] + 0.5 * r["rs"] + 0.25 * r["rr"] for r in rt), 0),
                  "md_pada_kjn_l2": sum(k["md"] for k in l2t), "kejadian_non_karhutla_resmi": round(sum(r["jumlah_kejadian"] for r in rt if r["kategori_bencana"] != "Kebakaran hutan dan lahan"), 1)}
        out[t]["sampai"] = str(max([r["tgl"] for r in rt] or [None]))
    return out
OUT["tren"] = {"jan_okt": tren(jan_okt), "tahun_berjalan": tren(lambda d: True)}
def arah(a, b): return None if not a else round(100.0 * (b - a) / a, 1)
tj = OUT["tren"]["jan_okt"]
OUT["tren"]["perubahan_pct_jan_okt"] = {m: {"2024_ke_2025": arah(tj[2024][m], tj[2025][m]), "2025_ke_2026": arah(tj[2025][m], tj[2026][m])} for m in ("baris", "kjn", "resmi_semua", "resmi_is_bencana", "kjn_l2", "kjn_kelas_S_ke_atas_ab", "kjn_kelas_B_ke_atas_ab", "kjn_juklak", "md", "mengungsi", "rbs", "md_pada_kjn_l2")}
OUT["tren"]["patahan_is_bencana"] = {str(t): {"baris": sum(1 for r in ROWS if r["th"] == t), "false": sum(1 for r in ROWS if r["th"] == t and not r["is_bencana"]),
        "false_pct": pct(sum(1 for r in ROWS if r["th"] == t and not r["is_bencana"]), sum(1 for r in ROWS if r["th"] == t)),
        "false_per_kategori": dict(collections.Counter(r["kategori_bencana"] for r in ROWS if r["th"] == t and not r["is_bencana"]).most_common(6))} for t in TAHUN}
# per bulan jumlah baris, untuk patahan
OUT["tren"]["baris_per_bulan"] = {str(t): [sum(1 for r in ROWS if r["tgl"].year == t and r["tgl"].month == m) for m in range(1, 13)] for t in TAHUN}
OUT["tren"]["kjn_l2_per_bulan"] = {str(t): [sum(1 for k in KJN if k["L2"] and k["tgl"].year == t and k["tgl"].month == m) for m in range(1, 13)] for t in TAHUN}
OUT["tren"]["md_per_bulan"] = {str(t): [sum(r["meninggal"] + r["hilang"] for r in ROWS if r["tgl"].year == t and r["tgl"].month == m) for m in range(1, 13)] for t in TAHUN}
# korban terpusat: berapa md berasal dari top-5 KJN per tahun
OUT["tren"]["md_konsentrasi"] = {str(t): {"md": sum(k["md"] for k in KJN if k["th"] == t), "top5": sum(sorted([k["md"] for k in KJN if k["th"] == t], reverse=True)[:5]),
                                          "top5_info": [(str(k["tgl"]), k["kat"], ", ".join(k["prov"])[:40], k["md"]) for k in sorted([k for k in KJN if k["th"] == t], key=lambda k: -k["md"])[:5]]} for t in TAHUN}

# 5. Logbook 2026
import uji_kunci_logbook as U   # memuat baris dan fungsi grup (modul-level aman)
LR = U.ROWS
def d_aturan(g):
    g = sorted(g, key=lambda r: (r["hari"], r["i"]))
    last = g[-1]["dampak"]
    mx = lambda key: max(r["dampak"][key] for r in g)
    return {"meninggal": last["md"], "hilang": mx("hilang"), "luka": mx("luka"), "jiwa": mx("jiwa"), "mengungsi": mx("mengungsi"), "rb": last["rb"], "rs": last["rs"], "rr": last["rr"], "kk": mx("kk")}
def l2_log(d):
    md = d["meninggal"] + d["hilang"]; rbs = d["rb"] + 0.5 * d["rs"] + 0.25 * d["rr"]
    m = {"M1": md >= 1, "M2": d["mengungsi"] >= 50 or d["luka"] >= 50, "M3": d["jiwa"] >= 50, "M4": rbs >= 5}
    return m, md, rbs
def juk_log(d):
    return d["meninggal"] >= 1 or (d["jiwa"] + d["luka"] + d["mengungsi"]) >= 50 or (d["rb"] + d["rs"] + d["rr"]) >= 5
def ev_log(gs):
    out = []
    for g in gs:
        tg = min(r["tgl"] for r in g)
        if not ("2026-01-01" <= tg <= "2026-10-31"): continue
        d = d_aturan(g); m, md, rbs = l2_log(d)
        out.append({"jenis": g[0]["jenis"], "tgl": tg, "d": d, "md": md, "rbs": rbs, "M": m, "L2": any(m.values()), "J": juk_log(d)})
    return out
LOG = {}
for nama, fn in (("V2", U.grup_v2), ("V1g", U.grup_v1g), ("V1", lambda R: U.grup_v1(R, lambda r: (r["jenis"], r["prov"], r["kabk"], r["tgl"])))):
    ev = ev_log(fn(LR))
    LOG[nama] = {"kjn": len(ev), "l2": sum(1 for e in ev if e["L2"]), "juklak": sum(1 for e in ev if e["J"]), "l2_bukan_juklak": sum(1 for e in ev if e["L2"] and not e["J"]),
                 "juklak_bukan_l2": sum(1 for e in ev if e["J"] and not e["L2"]), "md": sum(e["md"] for e in ev), "mengungsi": sum(e["d"]["mengungsi"] for e in ev), "rbs": round(sum(e["rbs"] for e in ev), 0),
                 "penentu_tunggal_l2": {c: sum(1 for e in ev if e["L2"] and e["M"][c] and sum(e["M"].values()) == 1) for c in ("M1", "M2", "M3", "M4")},
                 "per_jenis": {j: {"kjn": sum(1 for e in ev if e["jenis"] == j), "l2": sum(1 for e in ev if e["jenis"] == j and e["L2"])} for j in sorted({e["jenis"] for e in ev})}}
LOG["V2"]["_ev"] = None
lb26 = J(P("data/laporan-bnpb/bulanan/2026-10/masukan/logbook_2026.json"))["kejadian"]
LOG["logbook_2026.json"] = {"kejadian_total_berkas": len(lb26), "kejadian_tgl_2026_01_10": sum(1 for e in lb26 if "2026-01-01" <= e["tgl"] <= "2026-10-31"),
                            "keterangan": "kunci (jenis, prov, kab, tgl) dengan angka maks lintas hari; V1 di atas mereproduksinya dari baris harian"}
LOG["baris_harian_mentah"] = len(LR)
# banding DIBI 2026 Jan-Okt
LOG["dibi_2026_jan_okt"] = {"baris": OUT["tren"]["jan_okt"][2026]["baris"], "kjn": OUT["tren"]["jan_okt"][2026]["kjn"], "resmi": OUT["tren"]["jan_okt"][2026]["resmi_semua"],
                            "kjn_l2": OUT["tren"]["jan_okt"][2026]["kjn_l2"], "md": OUT["tren"]["jan_okt"][2026]["md"]}
LOG["dibi_2026_jan_okt_non_karhutla"] = {"kjn": sum(1 for k in KJN if k["th"] == 2026 and jan_okt(k["tgl"]) and k["kat"] != "Kebakaran hutan dan lahan"),
                                         "kjn_l2": sum(1 for k in KJN if k["th"] == 2026 and jan_okt(k["tgl"]) and k["kat"] != "Kebakaran hutan dan lahan" and k["L2"])}
OUT["logbook"] = LOG
for k in OUT["logbook"]["V2"].keys(): pass
del OUT["logbook"]["V2"]["_ev"]

# ---------------------------------------------------------------- simpan
def bersih(o):
    if isinstance(o, dict): return {str(k): bersih(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [bersih(v) for v in o]
    if isinstance(o, (dt.date,)): return str(o)
    return o
json.dump(bersih(OUT), open(os.path.join(AK, "hasil/sim_kerangka.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("ok", len(KJN), len(L2K))
