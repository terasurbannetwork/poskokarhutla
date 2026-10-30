#!/usr/bin/env python3
"""Ubah panenan GeoJSON publik BNPB (gis.bnpb.go.id, ArcGIS REST) menjadi dua berkas statis di public/cuaca/data/:
  jaringan_peringatan.json  (DATA_EWS: AWS/ARG, stasiun BMKG, PGA, akselerograf; ATLAS_DEPUTI1 LEWS)
  evakuasi_tsunami.json     (TES, TEA, titik kumpul, rambu, rute, sirine+cakupan: Badung, Cilacap, Labuan Bajo, Bali barat)
Pakai: python3 scripts/cuaca/bangun_bnpb.py <folder geojson>   (nama berkas <layanan>_<layer>.geojson)
Statis (tahunan): jalankan tangan bila BNPB merevisi layernya. Pemilik: cuaca-udara."""
import json, math, os, sys, datetime

KELUAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "cuaca", "data")
SUMBER = "BNPB (gis.bnpb.go.id, layanan ArcGIS publik)"

def muat(d, n):
    return json.load(open(os.path.join(d, n + ".geojson")))["features"]

def angka(v):
    try:
        v = float(v)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None

def titik(f):
    """(lon, lat) Indonesia atau None; MultiPoint ambil titik pertama."""
    g = f.get("geometry") or {}
    c = g.get("coordinates")
    if g.get("type") == "MultiPoint" and c:
        c = c[0]
    if not c or len(c) < 2:
        return None
    x, y = angka(c[0]), angka(c[1])
    if x is None or y is None or not (94 < x < 142 and -12 < y < 7):
        return None
    return round(x, 4), round(y, 4)

def bersih(s):
    s = " ".join(str(s or "").split())
    return s if s and s != "-" else ""

def tulis(nama, obj):
    p = os.path.join(KELUAR, nama)
    os.makedirs(KELUAR, exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(obj, fh, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)
    print(nama, os.path.getsize(p), "byte")

def jaringan(d):
    # kunci -> (nama tampil, pemilik seperti tertulis di sumber)
    J = [("aws", "AWS dan AAWS (stasiun cuaca otomatis)", "Tidak tertulis di sumber"),
         ("arg", "ARG (penakar hujan otomatis)", "Tidak tertulis di sumber"),
         ("bmkg", "Stasiun BMKG", "BMKG"),
         ("pga", "PGA (akselerograf gunung api)", "PVMBG, Badan Geologi"),
         ("akc", "Akselerograf gempa", "BMKG"),
         ("lews", "LEWS (peringatan dini longsor)", "BNPB, pelaksana tertulis di sumber")]
    idx = {k: i for i, (k, _, _) in enumerate(J)}
    t = []
    for f in muat(d, "DATA_EWS_5"):
        p, c = f["properties"], titik(f)
        if not c:
            continue
        k = "arg" if bersih(p.get("ARG")) else "aws"
        sub = bersih(p.get("Keterangan"))
        t.append([*c, idx[k], bersih(p.get("Location")), sub])
    for f in muat(d, "DATA_EWS_8"):
        p, c = f["properties"], titik(f)
        if c:
            t.append([*c, idx["bmkg"], bersih(p.get("Lokasi")), ", ".join(x for x in [bersih(p.get("Kabupaten")).title(), bersih(p.get("Propinsi")).title()] if x)])
    for f in muat(d, "DATA_EWS_0"):
        p, c = f["properties"], titik(f)
        if c:
            t.append([*c, idx["pga"], bersih(p.get("PGA_STATIO")), ", ".join(x for x in [bersih(p.get("KABUPATEN")).title(), bersih(p.get("PROVINSI")).title()] if x)])
    for f in muat(d, "DATA_EWS_4"):
        p, c = f["properties"], titik(f)
        if c:
            t.append([*c, idx["akc"], bersih(p.get("Nama_Lokas")).title(), bersih(p.get("JENIS"))])
    for f in muat(d, "ATLAS_DEPUTI1_1"):   # LEWS per titik; baris tanpa koordinat dibuang
        p, c = f["properties"], titik(f)
        if c:
            t.append([*c, idx["lews"], ", ".join(x for x in [bersih(p.get("kampung")), bersih(p.get("desa_kel"))] if x) or bersih(p.get("kec_kampun")),
                      ", ".join(x for x in [bersih(p.get("kab_kota1")), bersih(p.get("provinsi"))] if x)])
    jml = [sum(1 for r in t if r[2] == i) for i in range(len(J))]
    tulis("jaringan_peringatan.json", {"sumber": SUMBER, "diambil": str(datetime.date.today()), "keterangan": "DATA_EWS dan ATLAS_DEPUTI1 (LEWS 2014 sampai 2020)",
        "jenis": [{"k": k, "nama": n, "pemilik": o, "n": m} for (k, n, o), m in zip(J, jml)], "t": t})

def garis(f, maks=None):
    g = f.get("geometry") or {}
    bag = g.get("coordinates") or []
    if g.get("type") == "LineString":
        bag = [bag]
    elif g.get("type") != "MultiLineString":
        return []
    out = []
    for r in bag:
        r = [(round(angka(x) or 0, 5), round(angka(y) or 0, 5)) for x, y, *_ in r]
        r = [p for i, p in enumerate(r) if i == 0 or p != r[i - 1]]
        if len(r) > 1:
            out.append([list(p) for p in r])
    return out

def evakuasi(d):
    JN = {"tes": "TES (tempat evakuasi sementara)", "tea": "TEA (tempat evakuasi akhir)", "kumpul": "Titik kumpul", "rambu": "Rambu atau sirine evakuasi", "sirine": "Sirine tsunami"}
    W = []
    def wil(id_, nama, tit, rute=(), cakupan=()):
        W.append({"id": id_, "nama": nama, "titik": [r for r in tit if r], "rute": list(rute), "cakupan": list(cakupan)})
    def pt(f, j, nama, ket="", status=""):
        c = titik(f)
        return [*c, j, bersih(nama), bersih(ket), status] if c else None
    # Badung (RENEVAK_tsunami, Bali selatan)
    tit = [pt(f, "tes", f["properties"].get("Nama_Obyek"), f["properties"].get("Keterangan"), "usulan" if "usul" in str(f["properties"].get("T_Evakuasi")).lower() else "") for f in muat(d, "RENEVAK_tsunami_12")]
    tit += [pt(f, "tea", f["properties"].get("Nama_Obyek"), "daya tampung " + bersih(f["properties"].get("Dy_Tampung")) if bersih(f["properties"].get("Dy_Tampung")) else "", "usulan") for f in muat(d, "RENEVAK_tsunami_11")]
    tit += [pt(f, "kumpul", f["properties"].get("nama")) for f in muat(d, "RENEVAK_tsunami_10")]
    tit += [pt(f, "rambu", "Rambu " + bersih(f["properties"].get("Name")), f["properties"].get("Descript"), bersih(f["properties"].get("Comment"))) for f in muat(d, "RENEVAK_tsunami_4")]
    rute = [g for n in ("RENEVAK_tsunami_13", "RENEVAK_tsunami_8") for f in muat(d, n) for g in garis(f)]
    wil("badung", "Badung, Bali selatan", tit, rute)
    # Cilacap (Peta_Rencana_Evakuasi_Cilacap1: eksisting, usulan, lahan usulan, TEA)
    tit = []
    for n in ("Peta_Rencana_Evakuasi_Cilacap1_3", "Peta_Rencana_Evakuasi_Cilacap1_2", "Peta_Rencana_Evakuasi_Cilacap1_0", "Peta_Rencana_Evakuasi_Cilacap1_1"):
        for f in muat(d, n):
            p = f["properties"]
            tea = bersih(p.get("ket")) == "TEA"
            tit.append(pt(f, "tea" if tea else "tes", p.get("Nama") or ("TEA " if tea else "TES ") + bersih(p.get("notestea")), "", "eksisting" if "telah ada" in bersih(p.get("Kettambaha")) else "usulan"))
    wil("cilacap", "Cilacap, Jawa Tengah", tit)
    # Labuan Bajo
    tit = [pt(f, "tes", "TES rekomendasi", "", "usulan") for f in muat(d, "ruteevakuasi_labuanbajo_2")]
    tit += [pt(f, "tea", "TEA rekomendasi", "", "usulan") for f in muat(d, "ruteevakuasi_labuanbajo_1")]
    tit += [pt(f, "rambu", "Rambu evakuasi", "", "rencana") for f in muat(d, "ruteevakuasi_labuanbajo_0")]
    wil("labuanbajo", "Labuan Bajo, Manggarai Barat", tit, [g for f in muat(d, "ruteevakuasi_labuanbajo_3") for g in garis(f)])
    # Bali barat (Jembrana)
    tit = [pt(f, "tes", f["properties"].get("Nama"), "", "eksisting" if "eksisting" in bersih(f["properties"].get("KET")).lower() else "usulan") for f in muat(d, "JALUR_EVAKUASI_WILBAR_0")]
    tit += [pt(f, "rambu", f["properties"].get("Jenis_Ramb"), f["properties"].get("Tempat_Yan") or f["properties"].get("Jalan_Loka"), bersih(f["properties"].get("Keterangan")).lower()) for f in muat(d, "JALUR_EVAKUASI_WILBAR_1")]
    wil("balibarat", "Bali barat, Jembrana", tit)
    # sirine tsunami + cakupan (poligon disederhanakan ke cincin luar, 4 desimal)
    tit = [pt(f, "sirine", f["properties"].get("Lokasi"), "terpasang " + str(f["properties"].get("Thn_Deply")) if f["properties"].get("Thn_Deply") else "") for f in muat(d, "SIRINE_TSUNAMI_0")]
    cak = []
    for f in muat(d, "SIRINE_TSUNAMI_1"):
        g = f.get("geometry") or {}
        polys = g.get("coordinates") if g.get("type") == "MultiPolygon" else [g.get("coordinates") or []]
        for pl in polys:
            if pl:
                cak.append([[round(x, 4), round(y, 4)] for x, y in pl[0]])
    wil("sirine", "Sirine tsunami BNPB", tit, (), cak)
    n = {w["id"]: len(w["titik"]) for w in W}
    tulis("evakuasi_tsunami.json", {"sumber": SUMBER, "diambil": str(datetime.date.today()), "jenis": JN, "wilayah": W,
        "catatan": "TES nasional PU (ast_tempatevakuasisementara_fulltable, 34 baris) tidak berkoordinat, tidak dimuat."})
    print(n)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    jaringan(sys.argv[1]); evakuasi(sys.argv[1])
