#!/usr/bin/env python3
"""Infrastruktur PU di zona potensi gerakan tanah tinggi (prakiraan bulanan Badan Geologi) -> public/cuaca/data/gerakan_tanah_pu.json.
Tiap bulan PU mengunggah layanan baru di sigi.pu.go.id (Hosted/Infrastruktur_*Gerakan_Tanah_*_<bulan>_<tahun>); skrip memilih yang terbaru.
Sopan: UA jujur, jeda 1,2 dtk per permintaan, tanpa token. Gagal total = tidak menimpa berkas lama.
Pakai: python3 scripts/cuaca/gerakan_tanah_pu.py [uji]   Pemilik: cuaca-udara."""
import json, os, re, subprocess, sys, time, datetime, urllib.parse, urllib.request

UA = "Centurisk97-BNPB/1.0 (mailto:terasurbannetwork@gmail.com)"
BASE = "https://sigi.pu.go.id/serverpu/rest/services"
KELUAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "cuaca", "data", "gerakan_tanah_pu.json")
BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"]
BLN3 = {b[:3]: i + 1 for i, b in enumerate(BULAN)} | {"agu": 8, "agt": 8, "okt": 10, "des": 12, "mei": 5}
# kelompok ikon: kata kunci jenis (huruf kecil) -> kelompok
KEL = [("jalan", ("jalan", "lereng", "tol")), ("jembatan", ("jembatan",)), ("air", ("bendung", "embung", "situ", "sedimen", "irigasi", "waduk")),
       ("pantai", ("pantai",)), ("sarana", ())]
KELNAMA = {"jalan": "Jalan dan lereng", "jembatan": "Jembatan", "air": "Bendungan, embung, dan irigasi", "pantai": "Pengaman pantai", "sarana": "Sarana lain"}
_t = 0.0

def ambil(url, params):
    global _t
    time.sleep(max(0, 1.2 - (time.time() - _t)))
    u = url + "?" + urllib.parse.urlencode({**params, "f": "json"})
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=60) as r:
            b = r.read()
    except Exception:   # TLS python lama: curl yang sama, UA yang sama
        b = subprocess.run(["curl", "-s", "-m", "60", "-A", UA, u], capture_output=True, check=True).stdout
    _t = time.time()
    d = json.loads(b)
    if "error" in d:
        raise RuntimeError(f"{url}: {d['error'].get('message')}")
    return d

def bulan_dari(nama):
    """('Infrastruktur_Berpotensi_Gerakan_Tanah_Tinggi_des_2025') -> (2025, 12) atau None."""
    m = re.search(r"_([A-Za-z]+)_?(20\d\d)", nama)
    if m and m.group(1).lower()[:3] in BLN3:
        return int(m.group(2)), BLN3[m.group(1).lower()[:3]]
    return None

def layanan_terbaru():
    ada = [(bulan_dari(s["name"]), s["name"]) for s in ambil(BASE + "/Hosted", {})["services"]
           if s["type"] == "FeatureServer" and re.search(r"Infrastruktur.*Gerakan_Tanah", s["name"])]
    ada = [x for x in ada if x[0]]
    if not ada:
        raise RuntimeError("tidak ada layanan Infrastruktur*Gerakan_Tanah di Hosted")
    return max(ada)

def kelompok(jenis):
    j = jenis.lower()
    return next(k for k, kata in KEL if not kata or any(w in j for w in kata))

def tengah(g):
    """satu titik per fitur: titik, simpul tengah garis, atau pusat kotak poligon (ponytail: bukan sentroid)."""
    if not g: return None
    t, c = g.get("type"), g.get("coordinates")
    if t == "Point": return c
    if t == "LineString": return c[len(c) // 2]
    if t == "MultiLineString":
        r = max(c, key=len); return r[len(r) // 2]
    if t in ("Polygon", "MultiPolygon"):
        p = [q for r in (c if t == "Polygon" else [x for y in c for x in y]) for q in r]
        xs, ys = [q[0] for q in p], [q[1] for q in p]
        return [(min(xs) + max(xs)) / 2, (max(ys) + min(ys)) / 2]
    return None

def pilih(p, *kunci):
    for k in kunci:
        v = " ".join(str(p.get(k) or "").split())
        if v: return v
    return ""

def olah(fitur, nama_lapis):
    """hasil: [lon, lat, jenis, nama, kab, prov] atau None. Lapisan batas wilayah (tanpa nama infrastruktur) dibuang."""
    p = fitur.get("properties") or {}
    nm = pilih(p, "nama_infra", "nm_infra", "nm_inf")
    c = tengah(fitur.get("geometry"))
    if not nm or not c: return None
    jenis = pilih(p, "jenis_infr", "jenis_di") or nama_lapis
    jenis = jenis.replace("_", " ")
    if jenis.islower(): jenis = jenis.upper() if len(jenis) <= 5 else jenis.capitalize()   # ptn, ptkin -> PTN, PTKIN
    return [round(c[0], 4), round(c[1], 4), jenis, nm, pilih(p, "kabupaten_", "kab_kota", "wadmkk").replace("Kab. ", ""), pilih(p, "provinsi", "wadmpr")]

def bangun():
    (th, bl), svc = layanan_terbaru()
    url = f"{BASE}/{svc}/FeatureServer"
    baris = []
    for L in ambil(url, {})["layers"]:
        kolom = {f["name"] for f in ambil(f"{url}/{L['id']}", {}).get("fields", [])}
        if not kolom & {"nama_infra", "nm_infra", "nm_inf"}:
            continue   # lapisan batas wilayah: tanpa nama infrastruktur, tak diunduh
        n = ambil(f"{url}/{L['id']}/query", {"where": "1=1", "returnCountOnly": "true"})["count"]
        for off in range(0, n, 1000):
            g = geojson(url, L["id"], off)
            baris += [r for r in (olah(f, L["name"]) for f in g) if r]
    if not baris:
        raise RuntimeError("tidak ada baris berkoordinat")
    jenis = sorted({r[2] for r in baris})
    jl = [{"nama": j, "kel": kelompok(j), "n": sum(1 for r in baris if r[2] == j)} for j in jenis]
    ix = {j: i for i, j in enumerate(jenis)}
    return {"sumber": "PUPR, Badan Geologi (prakiraan gerakan tanah)", "layanan": svc, "bulan": f"{th}-{bl:02d}", "bulan_nama": f"{BULAN[bl - 1].capitalize()} {th}",
            "diambil": str(datetime.date.today()), "kelompok": KELNAMA, "jenis": jl, "n": len(baris), "t": [[r[0], r[1], ix[r[2]], r[3], r[4], r[5]] for r in baris]}

def geojson(url, lid, off):
    global _t
    time.sleep(max(0, 1.2 - (time.time() - _t)))   # ponytail: jeda diulang karena ambil() memaksa f=json
    q = urllib.parse.urlencode({"where": "1=1", "outFields": "*", "outSR": 4326, "resultOffset": off, "resultRecordCount": 1000, "maxAllowableOffset": 0.01, "geometryPrecision": 4, "f": "geojson"})
    u = f"{url}/{lid}/query?{q}"
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=120) as r: b = r.read()
    except Exception:
        b = subprocess.run(["curl", "-s", "-m", "120", "-A", UA, u], capture_output=True, check=True).stdout
    _t = time.time()
    d = json.loads(b)
    if "error" in d: raise RuntimeError(str(d["error"]))
    return d.get("features", [])

def uji():
    assert bulan_dari("Infrastruktur_Berpotensi_Gerakan_Tanah_Tinggi_des_2025") == (2025, 12)
    assert bulan_dari("Infrastruktur_Potensi_Gerakan_Tanah_Bulan_April_2025") == (2025, 4)
    assert bulan_dari("Infrastruktur_Rawan_Gerakan_Tanah_Maret_2022") == (2022, 3)
    assert bulan_dari("Gerakan_Tanah_Tinggi") is None
    assert kelompok("Jalan Nasional") == "jalan" and kelompok("Embung") == "air" and kelompok("TPA") == "sarana"
    assert tengah({"type": "LineString", "coordinates": [[0, 0], [1, 1], [2, 2]]}) == [1, 1]
    print("ok")

if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]: uji(); sys.exit()
    out = bangun()
    tmp = KELUAR + ".tmp"
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(tmp, "w") as fh: json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, KELUAR)
    print(out["layanan"], out["bulan"], out["n"], os.path.getsize(KELUAR), "byte")
