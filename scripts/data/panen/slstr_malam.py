"""#2 Sentinel-3 SLSTR FRP malam -> public/data/slstr_malam.json

Akses (dibuktikan 29 Okt 2026):
  - Katalog OData CDSE (catalogue.dataspace.copernicus.eu): TERBUKA tanpa kunci. Dipakai: daftar lintasan SL_2_FRP
    di atas Indonesia + jam lintasan (malam/siang).
  - Unduh berkas FRP (download.dataspace.copernicus.eu): 401 tanpa token. Butuh CDSE_USER/CDSE_PASS -> MENUNGGU KUNCI.
    Jalur unduh + penguraian ada di `unduh_frp`/`frp_dari_nc` (netCDF4, lab saja), BELUM diuji live.
  - Jalur tanpa kunci lain yang dicoba: FIRMS tidak memuat SLSTR; EUMETSAT Data Store juga butuh kunci. Tidak ada.
Karena itu fraksi malam dihitung dari PROKSI titik FIRMS (VIIRS/MODIS di hotspot72.json) dan diberi label `sumber:"proksi_firms"`.

Rumus: fraksi_malam(k) = sum FRP titik malam / sum FRP semua titik cluster k, malam = jam surya lokal [18,6).
  jam_surya = (jam_UTC + lon/15) mod 24.
Model: P(cluster bertahan > 72 jam | fraksi_malam), regresi logistik; pembanding FWI saja. Latih = cluster mulai lebih awal
  (setengah pertama menurut `awal`), uji = setengah akhir.
KETERBATASAN JUJUR: arsip hanya satu potret (kluster_awal.json, id tidak stabil antar hari), jendela fitur (72 j terakhir)
  tumpang tindih dengan label (durasi). Maka vonis maksimal "TAK SAH" (bukan LOLOS); log prospektif disimpan agar
  label masa depan bisa dibentuk tanpa bocor.
Pakai: python3 slstr_malam.py [uji]"""
import json, math, os, sys, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
from panen_util import http_json, auc, brier, logit_fit, logit_pred, tulis

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
D = os.path.join(RAIZ, "public", "data")
OUT = os.path.join(D, "slstr_malam.json")
CAT = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
BBOX = "POLYGON((94 -11,142 -11,142 6,94 6,94 -11))"


def malam(jam_utc, lon):
    """True bila jam surya lokal di [18,6)."""
    h = (jam_utc + lon / 15.0) % 24
    return h >= 18 or h < 6


def fraksi_malam(titik):
    """titik: [(frp, is_malam)] -> sum FRP malam / sum FRP; None bila total 0."""
    t = sum(f for f, _ in titik)
    return None if t <= 0 else sum(f for f, m in titik if m) / t


def katalog(jam=24):
    """Lintasan SL_2_FRP di atas Indonesia, `jam` jam terakhir (TERBUKA tanpa kunci)."""
    sejak = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=jam)).strftime("%Y-%m-%dT%H:%M:%SZ")
    f = (f"Collection/Name eq 'SENTINEL-3' and contains(Name,'SL_2_FRP') and ContentDate/Start gt {sejak} "
         f"and OData.CSC.Intersects(area=geography'SRID=4326;{BBOX}')")
    from urllib.parse import quote
    u = f"{CAT}?$filter={quote(f)}&$top=100&$orderby={quote('ContentDate/Start desc')}"
    v = http_json(u).get("value", [])
    out = []
    for p in v:
        s = p["ContentDate"]["Start"][:19]
        h = int(s[11:13]) + int(s[14:16]) / 60
        out.append({"nama": p["Name"][:60], "mulai": s, "ukuran_kb": round(p["ContentLength"] / 1024), "jam_utc": round(h, 2)})
    return out


def unduh_frp(id_produk, ke):  # pragma: no cover - butuh CDSE_USER/CDSE_PASS (MENUNGGU KUNCI)
    import urllib.parse
    u, p = os.environ.get("CDSE_USER"), os.environ.get("CDSE_PASS")
    if not (u and p):
        raise RuntimeError("MENUNGGU KUNCI: CDSE_USER/CDSE_PASS belum ada")
    from panen_util import http
    tok = json.loads(http("https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
                          data=urllib.parse.urlencode({"client_id": "cdse-public", "grant_type": "password",
                                                       "username": u, "password": p}).encode(),
                          headers={"Content-Type": "application/x-www-form-urlencoded"}))["access_token"]
    open(ke, "wb").write(http(f"https://download.dataspace.copernicus.eu/odata/v1/Products({id_produk})/$value",
                              headers={"Authorization": f"Bearer {tok}"}, timeout=300))


def frp_dari_nc(path_nc):  # pragma: no cover - lab saja (netCDF4)
    """Baca FRP_in.nc/FRP_an.nc SLSTR: variabel FRP_MWIR_Night/FRP_SWIR_Night (MW) + lat/lon -> [(lat,lon,frp)]."""
    import netCDF4
    raise NotImplementedError("belum diuji live (MENUNGGU KUNCI)")


def pip(x, y, ring):
    c = False
    for i in range(len(ring)):
        x1, y1 = ring[i]; x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def dari_firms():
    h72 = json.load(open(os.path.join(D, "hotspot72.json")))
    ac = dt.datetime.fromisoformat(h72["acuan"])
    kl = json.load(open(os.path.join(D, "kluster.json")))["features"]
    aw = {f["properties"]["id"]: f["properties"] for f in json.load(open(os.path.join(D, "kluster_awal.json")))["features"]}
    # indeks grid 0.5 derajat untuk bbox poligon
    g = {}
    cl = []
    for f in kl:
        gt = f["geometry"]["type"]
        if gt not in ("Polygon", "MultiPolygon"):
            continue  # kluster satu titik: tak ada poligon
        ring = f["geometry"]["coordinates"][0] if gt == "Polygon" else f["geometry"]["coordinates"][0][0]
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        bb = (min(xs), min(ys), max(xs), max(ys))
        i = len(cl); cl.append((f["properties"]["id"], bb, ring))
        for gx in range(int(bb[0] * 2) - 1, int(bb[2] * 2) + 2):
            for gy in range(int(bb[1] * 2) - 1, int(bb[3] * 2) + 2):
                g.setdefault((gx, gy), []).append(i)
    pts = {}
    for lat, lon, jam, sen, frp, *_ in h72["baris"]:
        utc = (ac + dt.timedelta(hours=jam)).hour + (ac + dt.timedelta(hours=jam)).minute / 60
        for i in g.get((int(lon * 2), int(lat * 2)), []):
            cid, bb, ring = cl[i]
            if bb[0] <= lon <= bb[2] and bb[1] <= lat <= bb[3] and pip(lon, lat, ring):
                pts.setdefault(cid, []).append((frp or 0.0, malam(utc, lon)))
                break
    return ac, aw, pts


def jam_antara(a, b):
    return (dt.datetime.fromisoformat(b) - dt.datetime.fromisoformat(a)).total_seconds() / 3600


def model(ac, aw, pts):
    baris = []
    for cid, t in pts.items():
        p = aw.get(cid)
        fm = fraksi_malam(t)
        if not p or fm is None or p.get("fwi") is None or len(t) < 3:
            continue
        # hidup = terlihat dalam 12 jam terakhir; label = rentang awal..akhir > 72 j
        if jam_antara(p["akhir"], ac.isoformat()) > 12:
            continue
        baris.append((p["awal"], fm, p["fwi"], 1 if jam_antara(p["awal"], p["akhir"]) > 72 else 0))
    baris.sort()
    n = len(baris); k = n // 2
    tr, te = baris[:k], baris[k:]
    r = {"n": n, "n_latih": len(tr), "n_uji": len(te), "pos_uji": sum(b[3] for b in te), "pos_latih": sum(b[3] for b in tr)}
    if min(r["pos_latih"], r["pos_uji"]) < 10 or min(len(tr) - r["pos_latih"], len(te) - r["pos_uji"]) < 10:
        r["vonis"] = "TAK TERUJI: kelas terlalu sedikit (sensor kanan: cluster yang baru mulai belum sempat melewati 72 j, jadi paruh uji tanpa positif)"; return r
    y_tr = [b[3] for b in tr]; y_te = [b[3] for b in te]
    mf = logit_fit([[b[1], b[2]] for b in tr], y_tr); mb = logit_fit([[b[2]] for b in tr], y_tr)
    pf = logit_pred(mf, [[b[1], b[2]] for b in te]); pb = logit_pred(mb, [[b[2]] for b in te])
    r.update({"auc_fraksi_malam+fwi": round(auc(y_te, pf), 3), "auc_fwi_saja": round(auc(y_te, pb), 3),
              "brier_fraksi_malam+fwi": round(brier(y_te, pf), 4), "brier_fwi_saja": round(brier(y_te, pb), 4),
              "koef_fraksi_malam_std": round(mf["w"][1], 3)})
    naik = r["auc_fraksi_malam+fwi"] > r["auc_fwi_saja"] + 0.02 and r["brier_fraksi_malam+fwi"] <= r["brier_fwi_saja"]
    r["vonis"] = ("TAK SAH (jendela fitur tumpang tindih label; arsip satu potret). Gejala: " +
                  ("fraksi malam menambah AUC" if naik else "fraksi malam TIDAK menambah di atas FWI"))
    return r


def main():
    ac, aw, pts = dari_firms()
    kl = []
    for cid, t in pts.items():
        p = aw.get(cid)
        if not p: continue
        fm = fraksi_malam(t)
        kl.append({"id": cid, "lat": p["lat"], "lon": p["lon"], "prov": p.get("prov"), "n72": len(t),
                   "frp72": round(sum(f for f, _ in t), 1), "fraksi_malam": None if fm is None else round(fm, 3),
                   "hari_aktif": p.get("hari")})
    kl.sort(key=lambda x: -x["frp72"])
    try:
        kat = katalog(24); akses = "katalog_terbuka_ok"
    except Exception as e:
        kat = []; akses = f"katalog_gagal:{type(e).__name__}"
    prev = json.load(open(OUT)) if os.path.exists(OUT) else {}
    hari = ac.strftime("%Y-%m-%d")
    log = [x for x in prev.get("log_prospektif", []) if x[0] != hari]
    log += [[hari, x["id"], x["lat"], x["lon"], x["frp72"], x["fraksi_malam"], x["hari_aktif"]] for x in kl[:300]]
    hari_set = sorted({x[0] for x in log})[-45:]
    log = [x for x in log if x[0] in hari_set]
    m = model(ac, aw, pts)
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "acuan": ac.isoformat(),
           "sumber": "proksi_firms", "slstr": {"akses": akses, "unduh": "MENUNGGU KUNCI (CDSE_USER/CDSE_PASS)",
                                                "lintasan_24j": len(kat), "lintasan_malam": sum(1 for x in kat if malam(x["jam_utc"], 115)),
                                                "contoh": kat[:5]},
           "rumus": "fraksi_malam = sum FRP malam / sum FRP; malam = jam surya lokal [18,6)",
           "model": m, "kluster_top": kl[:60], "log_prospektif": log,
           "atribusi": "NASA FIRMS (VIIRS/MODIS); katalog Copernicus Data Space (Sentinel-3 SLSTR, ESA/EUMETSAT, lisensi Copernicus bebas)",
           "lisensi": "FIRMS: terbuka; Copernicus Sentinel: bebas dengan atribusi"}
    print(tulis(OUT, out), "bita;", json.dumps(m, ensure_ascii=False))


def uji():
    assert malam(18, 105) is True and malam(5, 105) is False   # 05 UTC +7 j = 12 siang
    assert malam(16, 105) is True                              # 23 lokal
    assert fraksi_malam([(10, True), (30, False)]) == .25 and fraksi_malam([(0, True)]) is None
    sq = [(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)]
    assert pip(1, 1, sq) and not pip(3, 1, sq)
    print("slstr_malam uji OK")


if __name__ == "__main__":
    uji() if "uji" in sys.argv else main()
