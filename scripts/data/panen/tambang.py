"""#6 ESDM izin tambang (WIUP/IUP) -> public/data/tambang.json  (FITUR, bukan model)

Akses: geoportal.esdm.go.id/gis1 (ArcGIS REST, terbuka, UA jujur, 200 tanpa kunci; dibuktikan 29 Okt 2026).
  Lapisan: Overlay_WIUP_vs_Kawasan_Hutan/0 (10.474 potongan WIUP x kawasan hutan, Mar 2026) dan
           Join_WIUP_vs_IPPKH/0 (4.797 WIUP penuh yang beririsan IPPKH). MOMI (momi.minerba.esdm.go.id) tidak punya REST terbuka.
  Cakupan = gabungan kedua lapisan (WIUP yang beririsan kawasan hutan/IPPKH), BUKAN seluruh WIUP nasional.
Panen: `python3 tambang.py panen` (resumable, 200 fitur/halaman, retry 4x) -> data/raw/tambang/*.jsonl (tidak di-commit,
  berisi nama usaha; keputusan pemilik 14 Okt: situs tidak menampilkan nama perusahaan).
Olah:  `python3 tambang.py` -> titik api 7 hari (hotspot.json) di dalam WIUP; per provinsi, jenis izin, komoditas.
Rumus: kepadatan_IUP = titik_dalam / luas_WIUP_km2 * 1000 ; lift = pangsa_titik_di_IUP / pangsa_luas_IUP_di_prov  (bila luas prov tersedia).
Tak ada label -> keluaran FEATURE untuk #1 dan model banjir; tak ada klaim prediksi.
Genangan di dalam IUP: BELUM (genangan hanya agregat per kecamatan, tanpa poligon)."""
import json, os, sys, datetime as dt, urllib.parse as up
sys.path.insert(0, os.path.dirname(__file__))
from panen_util import http_json, tulis

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
D = os.path.join(RAIZ, "public", "data")
RAW = os.path.join(RAIZ, "data", "raw", "tambang")
BASE = "https://geoportal.esdm.go.id/gis1/rest/services/"
LAPISAN = {"hutan": "Overlay_WIUP_vs_Kawasan_Hutan", "ippkh": "Join_WIUP_vs_IPPKH"}
CAMPUR = "kode_wiup,jenis_izin,komoditas,kegiatan,nama_prov,nama_kab,luas_sk,tgl_akhir,kode_prov"
HAL = 200


def panen(kunci):
    os.makedirs(RAW, exist_ok=True)
    p = os.path.join(RAW, kunci + ".jsonl")
    ada = sum(1 for _ in open(p)) if os.path.exists(p) else 0
    u = BASE + LAPISAN[kunci] + "/MapServer/0/"
    total = http_json(u + "query?where=1%3D1&returnCountOnly=true&f=json")["count"]
    ada *= HAL  # tiap baris = satu halaman
    with open(p, "a") as f:
        while ada < total:
            q = up.urlencode({"where": "1=1", "outFields": CAMPUR, "outSR": 4326, "maxAllowableOffset": 0.0004,
                              "orderByFields": "objectid", "resultOffset": ada, "resultRecordCount": HAL, "f": "json"})
            r = http_json(u + "query?" + q, timeout=120)
            fs = [{"a": x["attributes"], "r": x["geometry"]["rings"]} for x in r.get("features", []) if x.get("geometry")]
            if not r.get("features"):
                break
            # satu baris = satu halaman; halaman yang punya fitur tanpa geometri tetap dihitung utuh
            f.write(json.dumps({"off": ada, "n": len(r["features"]), "fs": fs}, separators=(",", ":")) + "\n"); f.flush()
            ada += HAL
            print(kunci, min(ada, total), "/", total, flush=True)
    return total


def baca():
    """-> dict kode_wiup -> {a: atribut, polys: [rings,...]} (gabungan dua lapisan, tanpa duplikasi geometri per lapisan)."""
    out = {}
    for k in LAPISAN:
        p = os.path.join(RAW, k + ".jsonl")
        if not os.path.exists(p):
            continue
        for ln in open(p):
            for x in json.loads(ln)["fs"]:
                w = out.setdefault(x["a"]["kode_wiup"], {"a": x["a"], "polys": {}})
                w["polys"].setdefault(k, []).append(x["r"])
    return out


def di_dalam(x, y, rings):
    """Even-odd lintas semua cincin satu fitur (lubang ikut tertangani)."""
    c = False
    for ring in rings:
        for i in range(len(ring)):
            x1, y1 = ring[i - 1]; x2, y2 = ring[i]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
    return c


def bbox(rings):
    xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
    return min(xs), min(ys), max(xs), max(ys)


def indeks(wiup):
    """grid 0.1 derajat -> daftar (kode, rings_gabungan, bbox). Satu WIUP bisa banyak potongan: tiap potongan satu entri."""
    g = {}
    for kode, w in wiup.items():
        pot = w["polys"].get("ippkh") or w["polys"].get("hutan") or []
        for rings in pot:
            if not rings:
                continue
            b = bbox(rings); e = (kode, rings, b)
            for gx in range(int(b[0] * 10) - 1, int(b[2] * 10) + 2):
                for gy in range(int(b[1] * 10) - 1, int(b[3] * 10) + 2):
                    g.setdefault((gx, gy), []).append(e)
    return g


def cari(g, lat, lon):
    for kode, rings, b in g.get((int(lon * 10 // 1), int(lat * 10 // 1)), []):
        if b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and di_dalam(lon, lat, rings):
            return kode
    return None


def olah():
    wiup = baca()
    assert wiup, "belum dipanen: jalankan `tambang.py panen`"
    g = indeks(wiup)
    h = json.load(open(os.path.join(D, "hotspot.json")))
    kw = h["wilayah"]
    prov_all, prov_in, per = {}, {}, {}
    pn = json.load(open(os.path.join(D, "meta.json")))["provinsi"]
    nama2kode = {v.upper().replace("KEP.", "KEPULAUAN").replace("DI ", "DAERAH ISTIMEWA "): k for k, v in pn.items()}
    frp_in = 0.0
    for lat, lon, jam, sen, frp, kf, wi, tgl in h["baris"]:
        pv = (kw[wi] if isinstance(kw, list) else str(wi)).split("|")[0]
        prov_all[pv] = prov_all.get(pv, 0) + 1
        k = cari(g, lat, lon)
        if k:
            prov_in[pv] = prov_in.get(pv, 0) + 1; per[k] = per.get(k, 0) + 1; frp_in += frp or 0
    luas = {}  # ha, per WIUP unik, dari luas_sk resmi
    for k, w in wiup.items():
        luas[k] = w["a"].get("luas_sk") or 0
    def agr(kunci):
        d = {}
        for k, w in wiup.items():
            v = (w["a"].get(kunci) or "?").upper(); e = d.setdefault(v, {"wiup": 0, "luas_ha": 0.0, "titik": 0})
            e["wiup"] += 1; e["luas_ha"] += luas[k]; e["titik"] += per.get(k, 0)
        for e in d.values():
            e["luas_ha"] = round(e["luas_ha"]); e["titik_per_1000km2"] = round(e["titik"] / (e["luas_ha"] / 100) * 1000, 2) if e["luas_ha"] else None
        return dict(sorted(d.items(), key=lambda x: -x[1]["titik"])[:15])
    prov_wiup = {}
    for k, w in wiup.items():
        nm = (w["a"].get("nama_prov") or "").strip().upper()
        pv = nama2kode.get(nm, nm or "?")  # kode_prov ESDM != kode BPS; multi-provinsi tetap dengan nama
        e = prov_wiup.setdefault(pv, {"nama": w["a"].get("nama_prov"), "wiup": 0, "luas_ha": 0.0, "titik_di_iup": 0})
        e["wiup"] += 1; e["luas_ha"] += luas[k]; e["titik_di_iup"] += per.get(k, 0)
    for pv, e in prov_wiup.items():
        e["luas_ha"] = round(e["luas_ha"]); e["titik_total_prov"] = prov_all.get(pv, 0)
        e["pangsa_titik_di_iup"] = round(e["titik_di_iup"] / e["titik_total_prov"], 4) if e["titik_total_prov"] else None
    top = sorted(per.items(), key=lambda x: -x[1])[:25]
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "acuan_titik": h["acuan"],
           "jenis": "fitur (tanpa label; bukan model prediksi)",
           "cakupan": "WIUP yang beririsan kawasan hutan (Mar 2026) atau IPPKH; bukan seluruh WIUP nasional",
           "ringkas": {"wiup": len(wiup), "luas_ha": round(sum(luas.values())), "titik_total": sum(prov_all.values()),
                       "titik_di_iup": sum(prov_in.values()), "frp_di_iup": round(frp_in, 1),
                       "pangsa_titik": round(sum(prov_in.values()) / max(1, sum(prov_all.values())), 5)},
           "per_provinsi": dict(sorted(prov_wiup.items(), key=lambda x: -x[1]["titik_di_iup"])[:20]),
           "per_komoditas": agr("komoditas"), "per_izin": agr("jenis_izin"), "per_kegiatan": agr("kegiatan"),
           "iup_terpanas": [{"kode_wiup": k, "titik": n, "komoditas": wiup[k]["a"].get("komoditas"), "kab": wiup[k]["a"].get("nama_kab"),
                             "luas_ha": round(luas[k])} for k, n in top],
           "atribusi": "Kementerian ESDM, Geoportal ESDM (WIUP vs Kawasan Hutan Mar 2026; WIUP vs IPPKH); titik api NASA FIRMS",
           "lisensi": "Data terbuka layanan geoportal ESDM; tanpa nama usaha di keluaran (kebijakan situs)"}
    print(tulis(os.path.join(D, "tambang.json"), out), "bita", json.dumps(out["ringkas"]))


def uji():
    sq = [[(0, 0), (4, 0), (4, 4), (0, 4), (0, 0)]]
    lub = sq + [[(1, 1), (3, 1), (3, 3), (1, 3), (1, 1)]]
    assert di_dalam(0.5, 0.5, sq) and not di_dalam(5, 5, sq)
    assert not di_dalam(2, 2, lub) and di_dalam(0.5, 2, lub)
    g = indeks({"X": {"a": {}, "polys": {"hutan": [sq]}}})
    assert cari(g, 2.0, 2.0) == "X" and cari(g, 9.0, 9.0) is None
    print("tambang uji OK")


if __name__ == "__main__":
    a = sys.argv[1:] or [""]
    if a[0] == "uji": uji()
    elif a[0] == "panen":
        for k in LAPISAN: panen(k)
    else: olah()
