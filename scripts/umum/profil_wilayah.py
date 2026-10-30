#!/usr/bin/env python3
"""Profil wilayah kab/kota: sumber riset (IRBI, regulasi, paparan, BPBD, GDACS/EMS) -> public/data/wilayah/NN.json
(NN = kode provinsi 2 digit; kunci = kode BPS 4 digit) + indeks.json (kode -> nama) untuk pencarian nama.
Pakai: python3 scripts/umum/profil_wilayah.py DIR_SUMBER   (DIR_SUMBER berisi data2..data5 hasil panen; wajib)
Layar: public/inti/profil_wilayah.js. Sumber bukan data terbuka (IRBI = InaRISK BNPB), lihat teks sumber di panel."""
import json, os, re, sys, collections

SUM = sys.argv[1] if len(sys.argv) > 1 else sys.exit("pakai: profil_wilayah.py DIR_SUMBER")
KEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "data", "wilayah")
J = lambda p: json.load(open(os.path.join(SUM, p), encoding="utf-8"))
# dataran tinggi Papua: cacahan bangunan satelit kurang andal (awan, atap seng kecil); DKI: atap padat menyatu
TINGGI = {"jayawijaya", "pegununganbintang", "tolikara", "yahukimo", "nduga", "lanijaya", "mamberamotengah", "yalimo", "puncak", "puncakjaya", "intanjaya", "dogiyai", "deiyai", "paniai"}
def norm(s): return re.sub(r"[^a-z0-9]", "", re.sub(r"^(kab\.?|kabupaten|kota|adm\.?|administrasi)\s+", "", (s or "").lower().strip()))

kab = collections.defaultdict(dict); nama = {}
# 1. IRBI
for r in J("data3/bnpb/irbi.json"):
    k = r["kode"]; nama[k] = (r["prov"], r["nama"]); d = kab[k].setdefault("ir", {"y": [], "s": [], "k": []})
    d["y"].append(r["tahun"]); d["s"].append(round(r["skor"], 1)); d["k"].append(1 if r["kelas"] == "Tinggi" else 0)
    if r["tahun"] == 2025: d["b"] = {h: v for h, v in r["bahaya"].items() if v is not None}
# Pemetaan kode sumber -> kode IRBI. Sumber luar (BPS, ATLAS, regulasi, paparan) memakai kode BPS yang bisa bentrok dengan kode IRBI:
# kode dipakai hanya bila namanya cocok nama IRBI pada kode itu; kalau tidak, dicari lewat nama; kalau tetap tak pasti, DIBUANG.
from difflib import SequenceMatcher
from nama_wilayah import nk, ALIAS  # fungsi murni dipindah ke nama_wilayah.py (KM-A03)
KOTA = lambda n: bool(re.match(r"kota\b", (n or "").lower().strip())) or ("jakarta" in (n or "").lower() and "seribu" not in (n or "").lower())  # kota Jakarta; "Kotabaru" bukan kota
IRN = {k: v[1] for k, v in nama.items()}
byn = collections.defaultdict(set)
for k, n in IRN.items(): byn[(KOTA(n), nk(n)[1])].add(k)
def sama(a, b): return KOTA(a) == KOTA(b) and (nk(a)[1] == nk(b)[1] or SequenceMatcher(None, nk(a)[1], nk(b)[1]).ratio() >= 0.93)
STAT = collections.defaultdict(collections.Counter); PAKAI = []; DIB = []
def peta(blok, k, n):
    """kode IRBI untuk (kode sumber k, nama sumber n), atau None."""
    k = str(k) if k is not None else None
    if k in IRN and sama(n, IRN[k]): h = k
    elif k in IRN: h = None  # kode ini milik kab lain di IRBI
    else: h = None
    if h is None:
        for c in [x.strip() for x in (n or "").split(" / ")]:
            cs = byn.get((KOTA(c), nk(c)[1])) or (byn.get((KOTA(c), nk("kepulauan " + c)[1])) or set())
            if len(cs) == 1: h = next(iter(cs)); break
    if h is None and k and k not in IRN and nk(n)[1]: h = k; STAT[blok]["tanpa_irbi"] += 1  # kab di luar IRBI (pemekaran Papua): kode sumber dipakai
    if not h: DIB.append((blok, k, n))
    STAT[blok]["ok" if h == k else "dipetakan" if h else "dibuang"] += 1
    if h: PAKAI.append((blok, n, h))
    return h
# 2. regulasi
for r in J("data2/regulasi/regulasi_ringkasan_pemda.json"):
    k = peta("rg", r["kode"], r["nama_pemda"])
    if not k or "rg" in kab[k]: continue
    nama.setdefault(k, (r["prov"], r["nama_pemda"]))
    kab[k]["rg"] = {"pb": r["has_perda_pb"], "bp": r["has_perda_bpbd"], "rp": r["has_rpb"], "rk": r["has_renkon"], "n": r["n_dokumen"], "dr": None, "d": []}
    sd = r["last_status_darurat"]
    if sd: kab[k]["rg"]["dr"] = [sd["tahun"], sd["nomor"], sd["judul"][:200], sd["url"]]
# aturan 3: dokumen yang judulnya menyebut "Kabupaten/Kota X" milik kab lain dibuang (nama lama sah lewat ALIAS/NAMA_LAMA)
NAMA_LAMA = {"mempawah": {"pontianak"}}
_nm = sorted({re.sub(r"^(kab\.?|kabupaten|kota|adm\.?|administrasi)\s+", "", re.sub(r"^(kab\.?|kabupaten|kota)\s+(administrasi\s+)?", "", n.strip(), flags=re.I), flags=re.I).replace("Kep.", "Kepulauan") for n in IRN.values()}, key=len, reverse=True)
SEBUT = re.compile(r"(?<!wali )\b(?:kabupaten|kab\.|kota)\s+(?:administrasi\s+)?(" + "|".join(re.escape(x) for x in _nm if len(x) > 3) + r")\b", re.I)
DROP3 = collections.Counter()
def dok_ok(k, judul):
    own = nk(IRN.get(k) or nama.get(k, ("", ""))[1])[1]
    for m in SEBUT.findall(judul or ""):
        x = nk(m)[1]
        if x != own and x not in NAMA_LAMA.get(own, ()): DROP3["rg_dok"] += 1; return False
    return True
URUT = {"rpb": 0, "renkon": 1, "perda": 2, "perkada": 3}
dok = collections.defaultdict(list)
for r in J("data2/regulasi/regulasi_pb.json"):
    k = peta("rg_dok", r["kode"], r["nama_pemda"])
    if k: dok[k].append(r)
for k, L in dok.items():
    if k not in kab or "rg" not in kab[k]: continue
    L = [r for r in L if dok_ok(k, r["judul"])]
    L.sort(key=lambda r: (URUT.get(r["jenis"], 9), -(r["tahun"] or 0)))
    kab[k]["rg"]["d"] = [[r["jenis"], r["nomor"], r["tahun"], (r["judul"] or "")[:170], r["url"]] for r in L[:12]]
# 3. paparan
for r in sorted(J("data4/paparan/penduduk_meta_kab.json"), key=lambda r: r["kode_kab"] is None):
    k = peta("pp", r["kode_kab"], r["kab"])
    if not k or "t" in kab[k].get("pp", {}): continue  # baris bernama salah-eja tanpa kode tak menimpa baris berkode
    kab[k].setdefault("pp", {}).update(t=round(r["total"]), w=round(r["wanita"]), b=round(r["anak_0_5"]), l=round(r["lansia_60"]))
    nama.setdefault(k, (r["prov"], r["kab"]))
for r in sorted(J("data4/paparan/penduduk_worldpop_kab.json"), key=lambda r: r["kode_kab"] is None):
    k = peta("pp_wp", r["kode_kab"], r["kab"])
    if k and "wp" not in kab[k].get("pp", {}): kab[k].setdefault("pp", {})["wp"] = round(r["penduduk_worldpop"])
kab.pop(None, None)
bg = collections.defaultdict(lambda: [0, 0.0, collections.Counter()])
_cb = {}
for r in J("data5/bangunan/bangunan_kec_tambal.json"):
    kk = (r["kode_kab"], r["kab"])
    if kk not in _cb: _cb[kk] = peta("pp_bangunan", r["kode_kab"], r["kab"])
    if not _cb[kk]: continue
    a = bg[_cb[kk]]; a[0] += r["n_bangunan"]; a[1] += r["luas_m2"]; a[2][r["sumber_dipakai"]] += 1
for k, (n, lu, sd) in bg.items():
    if not k: continue
    p = kab[k].setdefault("pp", {}); p["g"] = n; p["sg"] = sd.most_common(1)[0][0]
    if k in nama and norm(nama[k][1]) in TINGGI: p["rr"] = 1
for k in list(kab):
    p = kab[k].get("pp")
    if p and p.get("t") and p.get("g"): p["ob"] = round(p["t"] / p["g"], 1)
    if p and k.startswith("31"): p["rr"] = 1
# 4. BPBD (ATLAS_PUSDALOPS: id_kab; cadangan: kontak kab/kota Agu 2024). Hanya kantor resmi, tanpa nomor pribadi staf.
G = lambda f: json.load(open(os.path.join(SUM, "data4/gis/geojson", f + ".geojson"), encoding="utf-8"))["features"]
b = lambda s: (s or "").strip() if (s or "").strip() not in ("-", "") else ""
polys = {}
BPA = collections.defaultdict(list)  # kandidat alamat: ATLAS lalu kontak Agu 2024
for f in G("ATLAS_PUSDALOPS_0"):
    p = f["properties"]; k = peta("bp", p["id_kab"], p["kab_kota_g"])
    if not k: continue
    polys[k] = f["geometry"]; BPA[k].append(b(p["alamat"]))
    kab[k]["bp"] = {"s": b(p["status"]), "a": b(p["alamat"]), "t": b(p["kontak"]), "e": b(p["email"]), "w": b(p["website"])}
for f in G("Data_Kontak_BPBD_Kabkot_Centroid_Agust2024_0"):
    p = f["properties"]; k = peta("bp_kontak", p.get("id_kab"), p.get("Kabkot"))
    if not k or k not in kab: continue
    c = kab[k].setdefault("bp", {"s": "", "a": "", "t": "", "e": "", "w": ""})
    BPA[k].append(b(p.get("Alamat")))
    for a, src in (("s", "Status BPB"), ("a", "Alamat"), ("t", "Kontak BPB"), ("e", "Email")):
        if not c[a] and b(p.get(src)): c[a] = b(p[src])
# aturan 2: alamat BPBD. Buang alamat yang menyebut provinsi/"Kabupaten|Kota X" lain, dan alamat identik yang dipakai >1 kab hanya disimpan di kab yang namanya tersebut.
PROV = {nama[k][0] for k in IRN if nama[k][0]}
SEBUT_A = re.compile(r"\b(?:kabupaten|kab\.|kota)\s+(?:administrasi\s+)?(" + "|".join(re.escape(x) for x in _nm if len(x) > 3) + r")\b", re.I)
def alamat_ok(k, a):
    if not a: return False
    own = nk(IRN.get(k, ""))[1]; low = a.lower()
    for m in SEBUT_A.findall(a):
        if nk(m)[1] != own and nk(m)[1] not in NAMA_LAMA.get(own, ()): return False
    mine = (nama[k][0] or "").lower()
    return not (mine not in low and any(P.lower() in low for P in PROV if P.lower() != mine))
nrm = lambda a: re.sub(r"[^a-z0-9]", "", a.lower())
pilih = {k: next((a for a in c if alamat_ok(k, a)), "") for k, c in BPA.items() if k in IRN}
DROP2 = collections.Counter(); DROP2["tak_lolos"] = sum(1 for k, c in BPA.items() if k in IRN and any(c) and not pilih[k])
grup = collections.defaultdict(list)
for k, a in pilih.items():
    if a: grup[nrm(a)].append(k)
for g, ks in grup.items():
    if len(ks) < 2: continue
    cocok = [k for k in ks if nk(IRN[k])[1] in nrm(pilih[ks[0]])]
    cocok = [k for k in cocok if not KOTA(IRN[k])] or cocok  # "Wlingi, Blitar": kab menang atas kota
    menang = cocok[0] if len(cocok) == 1 else None
    for k in ks:
        if k == menang: continue
        alt = next((a for a in BPA[k] if alamat_ok(k, a) and nrm(a) != g and len(grup.get(nrm(a), [])) == 0), "")
        pilih[k] = alt; DROP2["duplikat"] += 1
for k, a in pilih.items():
    if k in kab and "bp" in kab[k]: kab[k]["bp"]["a"] = a
# 5. riwayat GDACS (titik dalam poligon kab) + EMS (nama AOI tak punya kab: titik pusat AOI dalam poligon)
def cincin(g): return [r for pol in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]) for r in pol[:1]]
def dalam(x, y, r):
    c = False; j = len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]: c = not c
        j = i
    return c
kotak = {k: (cs, [min(p[0] for r in cs for p in r), min(p[1] for r in cs for p in r), max(p[0] for r in cs for p in r), max(p[1] for r in cs for p in r)]) for k, g in polys.items() for cs in [cincin(g)]}
def cari(x, y):
    for k, (cs, bb) in kotak.items():
        if bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] and any(dalam(x, y, r) for r in cs): return k
rw = collections.defaultdict(list)
for e in J("data2/luar/gdacs.json")["events"]:
    if not e.get("lon_lat"): continue
    k = cari(*e["lon_lat"])
    if k: rw[k].append(["G", e["eventtype"], e["fromdate"][:10], e["nama"] + (" " + e["eventname"] if e.get("eventname") else ""), e["alertlevel"], e.get("severity_text") or "", e["url"]])
for a in J("data2/luar/ems.json")["aktivasi"]:
    bb = a.get("aoi_bbox")
    k = cari(bb[0], bb[1]) if bb else None
    if k: rw[k].append(["E", a["jenis_bencana"], a["tanggal_aktivasi"][:10], a["judul"], "", a["kode"], "https://rapidmapping.emergency.copernicus.eu/%s" % a["kode"]])
for k, L in rw.items():
    L.sort(key=lambda r: r[2], reverse=True); kab[k]["rw"] = L[:25]

# 6. sosek BPS (sk), InaRISK per kecamatan (ik), medan (md). Medan tak berkode: (prov|kab) -> kode4 lewat crosswalk_repo.json.
TH = 2025
def v0(x): return x if x else None  # 0 persen Susenas = sel sampel kecil tak valid
bps = collections.defaultdict(dict)
# BPS, InaRISK, medan memakai kode kab Kemendagri/BPS, bukan IRBI (bentrok untuk puluhan kab, mis. 3171 = Jakarta Selatan vs IRBI Jakarta Pusat): samakan lewat peta()
_pc = {}
def pc(blok, k, n):
    if (k, n) not in _pc: _pc[(k, n)] = peta(blok, k, n)
    return _pc[(k, n)]
for r in J("data5/bps/kemiskinan.json"):
    r["kode"] = pc("sk", r["kode"], r["nama"])
    if not r["kode"]: continue
    if r["kode"] not in nama: nama[r["kode"]] = (r["prov_nama"], r["nama"]); kab[r["kode"]]  # kab tanpa padanan tetap dapat entri
    if r["p0_persen_miskin"] is not None: bps[r["kode"]].setdefault("tr", {})[r["tahun"]] = round(r["p0_persen_miskin"], 2)
    if r["tahun"] == TH: bps[r["kode"]].update(p0=r["p0_persen_miskin"], mj=r["jumlah_miskin_ribu_jiwa"])
for r in J("data5/bps/ipm.json"):
    r["kode"] = pc("sk", r["kode"], r["nama"])
    if not r["kode"]: continue
    if r["tahun"] == TH and r.get("ipm_uhh_sp2020lf") is not None: bps[r["kode"]]["ipm"] = round(r["ipm_uhh_sp2020lf"], 2)
for r in J("data5/bps/hunian.json"):
    r["kode"] = pc("sk", r["kode"], r["nama"])
    if not r["kode"]: continue
    if r["tahun"] == TH:
        for a, f in (("hl", "hunian_layak_persen"), ("sn", "sanitasi_layak_persen"), ("am", "air_minum_layak_persen")):
            if v0(r.get(f)) is not None: bps[r["kode"]][a] = round(r[f], 1)
for r in J("data5/bps/penduduk_bps.json"):
    r["kode"] = pc("sk", r["kode"], r["nama"])
    if not r["kode"]: continue
    if r["tahun"] == TH: bps[r["kode"]].update(pk=r["penduduk_total"], b04=round(r["pct_0_4"], 1), l65=round(r["pct_65plus"], 1))
for k, d in bps.items():
    if k not in kab: continue
    if "p0" in d: d["p0"] = round(d["p0"], 1)
    if "mj" in d: d["mj"] = round(d["mj"], 1)
    if "tr" in d: d["tr"] = [[y, d["tr"][y]] for y in sorted(d["tr"])]
    d["th"] = TH; kab[k]["sk"] = d
# InaRISK: tinggi/sedang per bahaya dari kelas turunan (rendah <=0,333; sedang <=0,666; tinggi >0,666); kelas null = di luar zona, tak dihitung
ik = collections.defaultdict(lambda: {"n": 0, "b": {}, "_t": []})
for r in J("data4/dasar/inarisk_kec.json"):
    kk = pc("ik", r["kec"][:4], r["kab"])
    if not kk: continue
    d = ik[kk]; d["n"] += 1
    for h, v in (r.get("bahaya") or {}).items():
        c = d["b"].setdefault(h, [0, 0])
        if v and v.get("kelas") == "tinggi": c[0] += 1
        elif v and v.get("kelas") == "sedang": c[1] += 1
    m = (r.get("bahaya") or {}).get("multi")
    if m and m.get("nilai") is not None: d["_t"].append((m["nilai"], r["nama"]))
for k, d in ik.items():
    if k not in kab: continue
    t = sorted(d.pop("_t"), key=lambda x: (-x[0], x[1]))[:5]
    d["t"] = [[n, round(v, 2)] for v, n in t]; kab[k]["ik"] = d
# medan
cw = J("data4/dasar/crosswalk_repo.json")["kab"]
def mk(r):
    c = cw.get(r["prov"] + "|" + str(r["kab"]))
    return pc("md", c, r["kab"]) if c else None
md = collections.defaultdict(lambda: {"n": 0, "ld": 0.0, "r5": 0.0, "r10": 0.0, "kp": 0, "ap": 0.0, "lu": 0.0, "j2": None})
tak = 0
for r in J("data5/medan/dem_kec.json"):
    k = mk(r)
    if not k: tak += 1; continue
    if not r.get("coverage"): continue
    d = md[k]; d["n"] += 1; d["ld"] += r["luas_darat_ha"]; d["r5"] += r["luas_le_5m_ha"]; d["r10"] += r["luas_le_10m_ha"]; d["kp"] += 1 if r["pesisir"] else 0; d["lu"] += r["luas_ha"]
for r in J("data5/medan/air_permanen_kec.json"):
    k = mk(r)
    if k in md: md[k]["ap"] += r["luas_air_permanen_ha"] or 0
for r in J("data5/medan/gebco_pantai_kec.json"):
    k = mk(r); j = r.get("jarak_200m_km_min")
    if k in md and j is not None: md[k]["j2"] = j if md[k]["j2"] is None else min(md[k]["j2"], j)
for k, d in md.items():
    if k not in kab or not d["ld"]: continue
    ld = d["ld"]
    kab[k]["md"] = {"n": d["n"], "ld": round(ld), "r5": round(100 * d["r5"] / ld, 1), "r10": round(100 * d["r10"] / ld, 1), "kp": d["kp"],
                    "ap": round(d["ap"]), "j2": None if d["j2"] is None else round(d["j2"], 1)}

# aturan 1: penduduk sumber paparan harus sepadan dengan proyeksi BPS (0,5-2x); Papua pemekaran 2022 (batas beda) dikecualikan
DROP1 = collections.Counter()
PP_CURIGA = {"7503"}  # Bone Bolango: paparan 325.928 vs BPS 172.726 (1,89x), sumber dicurigai tertukar; dibuang atas keputusan pemilik
for k in PP_CURIGA:
    if "pp" in kab[k]: del kab[k]["pp"]; DROP1["pp_curiga"] += 1
for k, v in kab.items():
    t, pk = v.get("pp", {}).get("t"), v.get("sk", {}).get("pk")
    if t is None or not pk or 0.5 <= t / pk <= 2: continue
    if k[:2] in ("91", "92", "93", "94", "95", "96", "97") and k not in IRN: DROP1["papua_pemekaran_dibiarkan"] += 1; continue
    del v["pp"]; DROP1["pp"] += 1
os.makedirs(KEL, exist_ok=True)
for f in os.listdir(KEL):  # berkas provinsi basi dari jalan lama (mis. 97.json kode BPS) dihapus; salinan "NN 2.json" tak disentuh
    if re.fullmatch(r"\d\d\.json", f): os.remove(os.path.join(KEL, f))
per = collections.defaultdict(dict); idx = {}
for k, v in kab.items():
    if k not in nama: continue
    v["n"] = nama[k][1]; v["p"] = nama[k][0]; per[k[:2]][k] = v; idx[k] = [nama[k][0], nama[k][1]]
for pr, d in per.items():
    s = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(KEL, pr + ".json"), "w", encoding="utf-8").write(s)
open(os.path.join(KEL, "indeks.json"), "w", encoding="utf-8").write(json.dumps(idx, ensure_ascii=False, separators=(",", ":")))
tot = len(idx); print("kab", tot, {s: sum(1 for v in kab.values() if s in v) for s in ("ir", "rg", "pp", "bp", "rw", "sk", "ik", "md")})
n = lambda s: sum(1 for v in kab.values() if s in v)
assert n("sk") >= 500 and n("ik") >= 500 and n("md") >= 500, "blok baru terlalu sedikit"
assert all(h not in IRN or any(sama(c, IRN[h]) or sama("kepulauan " + c, IRN[h]) for c in (n or "").split(" / ")) for _, n, h in PAKAI), "nama sumber tak cocok nama IRBI"
for b_, c_ in sorted(STAT.items()): print("peta", b_, dict(c_))
if os.environ.get("DIBUANG"): print(sorted(set(DIB), key=str))
assert all(0.5 <= v["pp"]["t"] / v["sk"]["pk"] <= 2 for k, v in kab.items() if v.get("pp", {}).get("t") and v.get("sk", {}).get("pk") and not (k[:2] in ("91", "92", "93", "94", "95", "96", "97") and k not in IRN)), "pp/sk.pk di luar 0,5-2"
_al = collections.Counter(v["bp"]["a"] for v in kab.values() if v.get("bp", {}).get("a"))
assert not [a for a, c in _al.items() if c > 1], "alamat BPBD kembar antar kab"
print("dibuang aturan1", dict(DROP1), "aturan2", dict(DROP2), "aturan3", dict(DROP3))
assert all(0 <= v["sk"]["p0"] <= 100 for v in kab.values() if "p0" in v.get("sk", {}))
assert all(0 <= v["md"]["r10"] <= 100 and v["md"]["r5"] <= v["md"]["r10"] for v in kab.values() if "md" in v)
assert all(all(c[0] + c[1] <= v["ik"]["n"] for c in v["ik"]["b"].values()) for v in kab.values() if "ik" in v)
print("medan kec tak terpetakan", tak)
print("terbesar", max(os.path.getsize(os.path.join(KEL, f)) for f in os.listdir(KEL)))
