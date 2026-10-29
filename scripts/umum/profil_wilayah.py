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
# 2. regulasi
for r in J("data2/regulasi/regulasi_ringkasan_pemda.json"):
    k = r["kode"]; nama.setdefault(k, (r["prov"], r["nama_pemda"]))
    kab[k]["rg"] = {"pb": r["has_perda_pb"], "bp": r["has_perda_bpbd"], "rp": r["has_rpb"], "rk": r["has_renkon"], "n": r["n_dokumen"], "dr": None, "d": []}
    sd = r["last_status_darurat"]
    if sd: kab[k]["rg"]["dr"] = [sd["tahun"], sd["nomor"], sd["judul"][:200], sd["url"]]
URUT = {"rpb": 0, "renkon": 1, "perda": 2, "perkada": 3}
dok = collections.defaultdict(list)
for r in J("data2/regulasi/regulasi_pb.json"): dok[r["kode"]].append(r)
for k, L in dok.items():
    if k not in kab or "rg" not in kab[k]: continue
    L.sort(key=lambda r: (URUT.get(r["jenis"], 9), -(r["tahun"] or 0)))
    kab[k]["rg"]["d"] = [[r["jenis"], r["nomor"], r["tahun"], (r["judul"] or "")[:170], r["url"]] for r in L[:12]]
# 3. paparan
for r in J("data4/paparan/penduduk_meta_kab.json"):
    kab[r["kode_kab"]].setdefault("pp", {}).update(t=round(r["total"]), w=round(r["wanita"]), b=round(r["anak_0_5"]), l=round(r["lansia_60"]))
    nama.setdefault(r["kode_kab"], (r["prov"], r["kab"]))
for r in J("data4/paparan/penduduk_worldpop_kab.json"):
    kab[r["kode_kab"]].setdefault("pp", {})["wp"] = round(r["penduduk_worldpop"])
kab.pop(None, None)
bg = collections.defaultdict(lambda: [0, 0.0, collections.Counter()])
for r in J("data5/bangunan/bangunan_kec_tambal.json"):
    a = bg[r["kode_kab"]]; a[0] += r["n_bangunan"]; a[1] += r["luas_m2"]; a[2][r["sumber_dipakai"]] += 1
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
for f in G("ATLAS_PUSDALOPS_0"):
    p = f["properties"]; k = str(p["id_kab"]); polys[k] = f["geometry"]
    kab[k]["bp"] = {"s": b(p["status"]), "a": b(p["alamat"]), "t": b(p["kontak"]), "e": b(p["email"]), "w": b(p["website"])}
for f in G("Data_Kontak_BPBD_Kabkot_Centroid_Agust2024_0"):
    p = f["properties"]; k = str(p.get("id_kab") or "")
    if k not in kab: continue
    c = kab[k].setdefault("bp", {"s": "", "a": "", "t": "", "e": "", "w": ""})
    for a, src in (("s", "Status BPB"), ("a", "Alamat"), ("t", "Kontak BPB"), ("e", "Email")):
        if not c[a] and b(p.get(src)): c[a] = b(p[src])
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

os.makedirs(KEL, exist_ok=True); per = collections.defaultdict(dict); idx = {}
for k, v in kab.items():
    if k not in nama: continue
    v["n"] = nama[k][1]; v["p"] = nama[k][0]; per[k[:2]][k] = v; idx[k] = [nama[k][0], nama[k][1]]
for pr, d in per.items():
    s = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(KEL, pr + ".json"), "w", encoding="utf-8").write(s)
open(os.path.join(KEL, "indeks.json"), "w", encoding="utf-8").write(json.dumps(idx, ensure_ascii=False, separators=(",", ":")))
tot = len(idx); print("kab", tot, {s: sum(1 for v in kab.values() if s in v) for s in ("ir", "rg", "pp", "bp", "rw")})
print("terbesar", max(os.path.getsize(os.path.join(KEL, f)) for f in os.listdir(KEL)))
