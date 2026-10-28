"""Analisis per situs: gambut, KHG, desa, SBO, kanal, elevasi profil, hidraulika, peta. Keluar: data.json + img/*.jpg"""
import json, math, os, subprocess, sys
from PIL import Image
from kumpul import curl, km, OUT, REPO, HERE, GENERIK

sys.path.insert(0, f"{REPO}/scripts/data/sippa")
import hidraulika as H  # noqa: E402
sys.path.insert(0, f"{REPO}/scripts/data")
import citra as C  # noqa: E402

LATIHAN = {"K9037"}  # titik api sekitar di luar gambut: petak latihan di kompleks
PIN = {"K2628": "2026-10-14", "K9037": "2026-10-04"}  # adegan bersih yang dipilih manual (sesudahnya berawan)
GULUNG_M = 20      # asumsi panjang satu gulung selang layflat
SERAP_NOZZLE = 160  # L/menit nozzle konvensional di petak pembanding
JARAK_PENDEK_KM = 0.5  # renlap otomatis: air terdekat dari petak <= ini = selang pendek (bagian A), selebihnya selang panjang (bagian B)
PROV = {"14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur"}


def cincin(x, y, r):
    c = False
    for i in range(len(r)):
        x1, y1 = r[i - 1][:2]; x2, y2 = r[i][:2]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def poligon(g):
    if not g:
        return []
    return g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]] if g["type"] == "Polygon" else []


def di_dalam(lon, lat, g):
    return any(cincin(lon, lat, p[0]) and not any(cincin(lon, lat, h) for h in p[1:]) for p in poligon(g))


def jarak_tepi(lat, lon, g):
    best = 1e9
    for p in poligon(g):
        for r in p:
            for x, y in r[::2]:
                if abs(y - lat) < 0.2 and abs(x - lon) < 0.2:
                    best = min(best, km((lat, lon), (y, x)))
    return best


HARI_WIB = "2026-10-26"
BLN = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def hari_wib(acuan_iso):
    """tanggal WIB dari waktu acuan titik panas (live_meta.json hari_wib menang bila ada)"""
    from datetime import datetime, timedelta
    try:
        return json.load(open(f"{OUT}/live_meta.json"))["hari_wib"]
    except Exception:
        return (datetime.fromisoformat(acuan_iso.replace("Z", "+00:00")) + timedelta(hours=7)).strftime("%Y-%m-%d")


def baca(p):
    try:
        return json.load(open(p))
    except Exception:
        return {"features": []}


def arah(a, b):
    (la1, lo1), (la2, lo2) = a, b
    t = math.degrees(math.atan2((lo2 - lo1) * math.cos(math.radians(la1)), la2 - la1)) % 360
    return ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"][int((t + 22.5) // 45) % 8], round(t)


# ---------- peta ----------
def mxy(la, lo, z):
    return ((lo + 180) / 360 * 2 ** z * 256, (1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * 2 ** z * 256)


def peta(bb, z, nama, aspek):
    """bb=[s,w,n,e] dilebarkan ke aspek w/h; ubin Esri dijahit lalu dipotong. Kembalikan meta proyeksi."""
    s, w, n, e = bb
    x0, y0 = mxy(n, w, z); x1, y1 = mxy(s, e, z)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    W, Hh = x1 - x0, y1 - y0
    if W / Hh < aspek:
        W = Hh * aspek
    else:
        Hh = W / aspek
    x0, x1, y0, y1 = cx - W / 2, cx + W / 2, cy - Hh / 2, cy + Hh / 2
    tx0, tx1, ty0, ty1 = int(x0 // 256), int(x1 // 256), int(y0 // 256), int(y1 // 256)
    kan = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256), (40, 50, 40))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            p = f"{OUT}/ubin/{z}_{tx}_{ty}.jpg"
            if not os.path.exists(p) or os.path.getsize(p) < 500:
                curl(f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{ty}/{tx}", p, t=60)
            try:
                kan.paste(Image.open(p).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
            except Exception:
                pass
    kan = kan.crop((int(x0 - tx0 * 256), int(y0 - ty0 * 256), int(x1 - tx0 * 256), int(y1 - ty0 * 256)))
    os.makedirs(f"{OUT}/img", exist_ok=True)
    kan.save(f"{OUT}/img/{nama}.jpg", quality=86)
    m_per_px = 156543.03392 * math.cos(math.radians((s + n) / 2)) / 2 ** z
    return {"img": f"img/{nama}.jpg", "z": z, "x0": x0, "y0": y0, "w": kan.width, "h": kan.height, "m_per_px": m_per_px}


def titik_segmen(p, a, b):
    """titik terdekat pada segmen a-b dari p (lat, lon), bidang lokal"""
    c = math.cos(math.radians(p[0]))
    ax, ay, bx, by, px, py = a[1] * c, a[0], b[1] * c, b[0], p[1] * c, p[0]
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return (ay + t * dy, (ax + t * dx) / c)


def proyeksi(m, la, lo):
    if m.get("epsg"):
        E, N = C.ke_utm(la, lo, m["epsg"] % 100, C.epsg_selatan(m["epsg"]))
        return round((E - m["E0"]) / m["res"], 1), round((m["N0"] - N) / m["res"], 1)
    x, y = mxy(la, lo, m["z"])
    return round(x - m["x0"], 1), round(y - m["y0"], 1)


def ekstent(pts, pad_km, min_km=0):
    la = [p[0] for p in pts]; lo = [p[1] for p in pts]
    c = math.cos(math.radians(sum(la) / len(la)))
    s, n, w, e = min(la), max(la), min(lo), max(lo)
    if (n - s) * 111 < min_km:
        m = (n + s) / 2; s, n = m - min_km / 222, m + min_km / 222
    if (e - w) * 111 * c < min_km:
        m = (e + w) / 2; w, e = m - min_km / 222 / c, m + min_km / 222 / c
    return [s - pad_km / 111, w - pad_km / 111 / c, n + pad_km / 111, e + pad_km / 111 / c]


def pilih_z(bb, lebar_px):
    s, w, n, e = bb
    for z in range(17, 8, -1):
        (x0, y0), (x1, y1) = mxy(n, w, z), mxy(s, e, z)
        if max(x1 - x0, y1 - y0) <= lebar_px:
            return z
    return 9


# ---------- elevasi ----------
def profil(a, b, n=30, nama=""):
    f = f"{OUT}/raw/elev_{nama}.json"
    pts = [(a[0] + (b[0] - a[0]) * i / (n - 1), a[1] + (b[1] - a[1]) * i / (n - 1)) for i in range(n)]
    if not os.path.exists(f) or os.path.getsize(f) < 50:
        la = ",".join(f"{p[0]:.5f}" for p in pts); lo = ",".join(f"{p[1]:.5f}" for p in pts)
        curl(f"https://api.open-meteo.com/v1/elevation?latitude={la}&longitude={lo}", f)
    try:
        el = json.load(open(f))["elevation"]
    except Exception:
        el = [None] * n
    L = km(a, b) * 1000
    return [{"x_m": round(L * i / (n - 1)), "z": el[i]} for i in range(n)]


def hid(L, dz, q, n_lance, serap_lain=0, dn=65, pompa="portabel_besar", n_pompa=1):
    h = H.hidraulika({"dn_mm": dn, "L_m": L, "q_lpm": q, "dz_m": dz, "pompa": pompa, "n_pompa": n_pompa,
                      "n_lance": n_lance, "serap_lain_lpm": serap_lain, "sisa_bar": 3})
    return {k: (round(v, 2) if isinstance(v, float) else v) for k, v in h.items() if k not in ("profil", "neraca")}


def main():
    situs = json.load(open(f"{OUT}/situs.json"))
    acuan_h = json.load(open(f"{OUT}/live_hotspot72.json"))
    global HARI_WIB
    HARI_WIB = hari_wib(acuan_h["acuan"])
    for s in situs:
        k, a = s["kel"], s["akses"]; kid = s["id"]; d = f"{OUT}/raw/{kid}"
        pusat = (k["lat"], k["lon"]); air = (a["air"]["lat"], a["air"]["lon"])
        rute = [(y, x) for x, y in (a.get("rute") or [])] or [pusat]
        ujung = rute[-2] if len(rute) >= 2 else pusat
        if kid == "K7357":
            ujung = (-2.5066, 114.4518)          # titik turun perahu (one pager)
        s["titik"] = {"kompleks": pusat, "air": air, "ujung": ujung, "asal": rute[0]}
        # gambut PRIMS
        g = baca(f"{OUT}/g_{kid}.json")["features"]
        dalam = [f for f in g if di_dalam(k["lon"], k["lat"], f["geometry"])]
        s["gambut_prims"] = bool(dalam)
        s["gambut_tepi_km"] = round(min([jarak_tepi(*pusat, f["geometry"]) for f in dalam] or [0]), 1)
        s["gambut_luas_poligon_ha"] = dalam[0]["properties"].get("luas") if dalam else None
        s["air_di_gambut"] = any(di_dalam(air[1], air[0], f["geometry"]) for f in g)
        khg = [f["properties"] for f in baca(f"{d}/prims_khg.json")["features"] if di_dalam(k["lon"], k["lat"], f["geometry"])]
        s["khg"] = khg[0] if khg else ({"nama_khg": "Di luar KHG terdata"} if GENERIK else None)
        desa = [f["properties"] for f in baca(f"{d}/prims_adm_desa.json")["features"] if di_dalam(k["lon"], k["lat"], f["geometry"])]
        s["desa"] = desa[0] if desa else ({"desa": "–", "kecamatan": "–"} if GENERIK else None)
        if not s["nama"] and s["desa"] and s["desa"]["desa"] == "–":
            s["nama"] = f'Kompleks {kid}, {k["kab"].replace("Kota Palangkaraya", "Kota Palangka Raya")}'
        if not s["nama"] and s["desa"]:
            s["nama"] = f'{s["desa"]["desa"].title()}, {s["desa"]["kecamatan"].title()}, {k["kab"].replace("Kota Palangkaraya", "Kota Palangka Raya")}'
        # SBO dan infrastruktur pembasahan
        infra = []
        for lap in ("infrastruktur_pembasahan_3r", "rencana_sumur_bor"):
            for f in baca(f"{d}/prims_{lap}.json")["features"]:
                if not f["geometry"] or f["geometry"]["type"] != "Point":
                    continue
                lo, la = f["geometry"]["coordinates"][:2]
                dd = km(pusat, (la, lo))
                if dd <= 3:
                    p = f["properties"]
                    infra.append({"lat": la, "lon": lo, "d_km": round(dd, 2), "lapis": lap,
                                  "jenis": p.get("kegiatan") or "Rencana sumur bor", "tahun": p.get("tahun"),
                                  "desa": p.get("desa"), "kondisi": p.get("sisfo_kondisi")})
        infra.sort(key=lambda x: x["d_km"])
        s["infra"] = infra
        # titik panas 48 jam (lokasi unik per hari WIB)
        s["titik48"] = [t for t in s["titik72"] if t["jam"] >= -48 and t["hitung"]]
        s["titik24"] = [t for t in s["titik72"] if t["jam"] >= -24 and t["hitung"]]
        # target petak uji: titik panas 24 jam (cadangan 48 jam) <= 3 km, di dalam gambut, paling rapat dan dekat
        kand = [t for t in (s["titik24"] or s["titik48"]) if t["d_km"] <= 3 and any(di_dalam(t["lon"], t["lat"], f["geometry"]) for f in g)]
        def skor(t):
            n5 = sum(1 for u in s["titik48"] if km((t["lat"], t["lon"]), (u["lat"], u["lon"])) <= 0.5)
            return n5 / (1 + t["d_km"]), n5
        tb = max(kand, key=lambda t: skor(t)[0]) if kand else None
        if s.get("paksa"):
            pt = tuple(s["paksa"]["target"])
            tb = min(s["titik48"], key=lambda t: km(pt, (t["lat"], t["lon"])))
        if tb and kid not in LATIHAN and (s.get("paksa") or skor(tb)[1] >= 3 or tb["d_km"] <= 2):   # titik tunggal jauh bukan bara yang layak diuji
            target = (tb["lat"], tb["lon"])
            s["target"] = {"lat": tb["lat"], "lon": tb["lon"], "d_km": tb["d_km"], "n500": skor(tb)[1], "frp": tb["frp"],
                           "jam": tb["jam"], "sensor": tb["sensor"], "tgl": tb["tgl_wib"]}
        else:
            target = pusat
            s["target"] = None
        # garis air PRIMS (kanal, sungai) dekat target atau kompleks
        s["kanal"], s["sungai"] = [], []
        for f in baca(f"{d}/prims_jaringan_kanal.json")["features"]:
            gg = f["geometry"]
            for ln in (gg["coordinates"] if gg and gg["type"] == "MultiLineString" else []):
                if any(km(target, (y, x)) < 5 or km(pusat, (y, x)) < 5 for x, y in ln[::2]):
                    s["kanal"].append(ln)
        for f in baca(f"{d}/prims_sungai.json")["features"]:
            gg = f["geometry"]
            for ln in (gg["coordinates"] if gg and gg["type"] == "MultiLineString" else []):
                if any(km(pusat, (y, x)) < 14 for x, y in ln[::3]):
                    s["sungai"].append({"nama": f["properties"].get("namobj"), "ln": ln})
        # sumber air untuk target: titik air SIPPA (OSM), kanal PRIMS terdekat, sungai PRIMS terdekat
        calon = [{"jenis": a["air"]["jenis"] + " (OSM, titik SIPPA)", "lat": air[0], "lon": air[1], "d_km": round(km(target, air), 2)}]
        # sungai tanpa nama di RBI sering hanya garis alur kecil yang belum tentu berair: tidak dipakai sebagai sumber
        for jenis, lines in (("kanal (PRIMS BRGM)", [(None, l) for l in s["kanal"]]),
                             ("sungai (PRIMS/RBI)", [(x["nama"], x["ln"]) for x in s["sungai"] if (x["nama"] or "").strip()])):
            best = None
            for nm, ln in lines:
                for i_, ((x1, y1), (x2, y2)) in enumerate(zip(ln, ln[1:])):
                    q = titik_segmen(target, (y1, x1), (y2, x2))
                    dd = km(target, q)
                    if best is None or dd < best[0]:
                        best = (dd, q, nm, ln[max(0, i_ - 4): i_ + 6])
            if best:
                calon.append({"jenis": jenis if not (best[2] or "").strip() else f"Sungai {best[2].strip()} (PRIMS/RBI)", "lat": round(best[1][0], 5), "lon": round(best[1][1], 5), "d_km": round(best[0], 2),
                              "garis": [[x, y] for x, y in best[3]]})
        calon.sort(key=lambda c: c["d_km"])
        if GENERIK and not s.get("paksa") and calon[0]["d_km"] > JARAK_PENDEK_KM:
            s["paksa"] = {"otomatis": True}      # air jauh dari petak: pompa di titik air SIPPA dekat jalan, selang panjang (bagian B)
        if s.get("paksa"):      # selang panjang: pompa tetap di air tepi jalan (titik air SIPPA), bukan kanal terdekat ke api
            calon = [c for c in calon if "titik SIPPA" in c["jenis"]] + [c for c in calon if "titik SIPPA" not in c["jenis"]]
        s["air_calon"] = calon
        s["darat"] = calon[0]["d_km"] > 1.0     # tidak ada air jelas dalam 1 km: uji darat tanpa selang
        airt = (calon[0]["lat"], calon[0]["lon"])
        s["titik"]["target"] = target
        s["titik"]["air_t"] = airt
        # jalan kaki ujung -> target
        kj = a["menit"]["kaki"] / a["km"]["kaki"] if a["km"]["kaki"] else 15
        s["kaki_target"] = {"km": round(km(ujung, target) * 1.15, 2), "menit": round(km(ujung, target) * 1.15 * kj)}
        # SBO terdekat ke target
        for i in s["infra"]:
            i["d_target"] = round(km(target, (i["lat"], i["lon"])), 2)
        # cuaca
        try:
            s["cuaca"] = json.load(open(f"{d}/cuaca.json"))["daily"]
        except Exception:
            s["cuaca"] = None
        # profil elevasi air -> target
        s["profil"] = profil(airt, target, 30, kid + "_t")
        s["profil_jalan"] = profil(ujung, target, 40, kid + "_j")
        L_lurus = km(airt, target) * 1000
        L = round(L_lurus * 1.2 + 60)
        el = [p["z"] for p in s["profil"] if p["z"] is not None]
        dz = round(el[-1] - el[0], 1) if el else 1.0
        dz_maks = round(max(el) - el[0], 1) if el else dz
        dz_h = max(0.5, dz, dz_maks)
        s["hid"] = {"L_lurus": round(L_lurus), "L": L, "dz": dz, "dz_maks_profil": dz_maks, "dz_hitung": dz_h,
                    "gulung": math.ceil(L / GULUNG_M) + 2,
                    "minimum": hid(L, dz_h, 240, 2, SERAP_NOZZLE),
                    "penuh": hid(L, dz_h, 320, 8),
                    "dn100": hid(L, dz_h, 320, 8, dn=100)}
        if s["hid"]["penuh"]["vonis"] == "NO-GO":
            n_r = 2
            while hid(math.ceil(L / n_r), dz_h / n_r, 320, 8)["vonis"] != "KONDISIONAL" and n_r < 6:
                n_r += 1
            Ls = math.ceil(L / n_r)
            s["hid"]["relay"] = {"n_ruas": n_r, "L_ruas": Ls, "ruas": hid(Ls, dz_h / n_r, 320, 8)}
        # peta detail Sentinel-2 SWIR
        pts = [pusat, target, airt, ujung, air]
        la_ = [p[0] for p in pts]; lo_ = [p[1] for p in pts]
        cla, clo = (min(la_) + max(la_)) / 2, (min(lo_) + max(lo_)) / 2
        span = max((max(la_) - min(la_)) * 111, (max(lo_) - min(lo_)) * 111 * math.cos(math.radians(cla)))
        kmb = min(9.0, max(4.0, math.ceil(span * 1.35 * 2) / 2))
        if not os.path.exists(f"{OUT}/img/{kid}_s2.json") or json.load(open(f"{OUT}/img/{kid}_s2.json"))["km"] != kmb \
                or abs(json.load(open(f"{OUT}/img/{kid}_s2.json"))["lat"] - cla) > 1e-4:
            env = {**os.environ, "HARI": "60", **({"TGL": PIN[kid]} if kid in PIN else {})}
            if GENERIK:
                env["HARI_ACUAN"] = HARI_WIB
            subprocess.run([sys.executable, f"{HERE}/citra_pilot.py", kid, f"{cla:.5f}", f"{clo:.5f}", str(kmb)], env=env)
        if GENERIK and not os.path.exists(f"{OUT}/img/{kid}_s2.json"):
            # tidak ada adegan Sentinel-2 yang terbaca: pakai ubin Esri (tanggal pengambilan tidak diketahui), ditandai "esri"
            be = ekstent([pusat, target, airt, ujung, air], 0.4, 3)
            md = peta(be, pilih_z(be, 1100), f"{kid}_s2", 1.0)
            md.update({"esri": True, "tgl": HARI_WIB, "jam_utc": "00:00", "satelit": "Esri World Imagery", "adegan": "",
                       "km": round(md["w"] * md["m_per_px"] / 1000, 1)})
        else:
            ms = json.load(open(f"{OUT}/img/{kid}_s2.json"))
            E, N = C.ke_utm(ms["lat"], ms["lon"], ms["epsg"] % 100, C.epsg_selatan(ms["epsg"]))
            md = {"img": f"img/{kid}_s2.jpg", "epsg": ms["epsg"], "E0": E - kmb * 500, "N0": N + kmb * 500, "res": kmb * 1000 / ms["px"],
                  "w": ms["px"], "h": ms["px"], "m_per_px": kmb * 1000 / ms["px"], "tgl": ms["tgl"], "jam_utc": ms["jam_utc"],
                  "satelit": ms["satelit"], "adegan": ms["adegan"], "km": kmb}
        rt = rute + [pusat, target]
        if kid == "K7357":
            rt += [(-2.4126, 114.4366)]
        br = ekstent(rt, 0.8, 3)
        mr = peta(br, pilih_z(br, 1100), f"{kid}_rute", 1.30)
        dd = km(airt, target) or 1e-6           # titik 250 m di depan petak (menjauhi pompa) supaya 4 petak tidak terpotong
        maju = (target[0] + (target[0] - airt[0]) * 0.4 / dd, target[1] + (target[1] - airt[1]) * 0.4 / dd)
        bi = ekstent([airt, target] + ([maju] if dd >= 0.5 else []), 0.1 if dd < 0.5 else 0.3, 0.17)
        mi = peta(bi, min(19, pilih_z(bi, 700)), f"{kid}_inset", 1.0)
        s["peta"] = {"detail": md, "rute": mr, "inset": mi}
        print(kid, "gambut", s["gambut_prims"], "tepi", s["gambut_tepi_km"], "khg", s["khg"] and s["khg"]["nama_khg"],
              "desa", s["desa"] and s["desa"]["desa"], "infra", len(infra), "t48", len(s["titik48"]),
              "L", L, "dz", dz, dz_maks, s["hid"]["penuh"]["vonis"], "target", s["target"], "air", calon[0], "s2", md["tgl"], file=sys.stderr)
    # ringkasan wilayah 48 jam: pilot = Kalteng 25-26 Okt (tetap); renlap = provinsi kompleks, dua tanggal WIB terakhir
    kol = acuan_h["kolom"]; wil = acuan_h["wilayah"]
    provs = sorted({str(s["kel"]["prov"]) for s in situs}) if GENERIK else ["62"]
    baris_ = [dict(zip(kol, b_)) for b_ in acuan_h["baris"]]
    tgls = sorted({r["tgl_wib"] for r in baris_ if r["hitung"]})[-2:] if GENERIK else ["10-25", "10-26"]
    kab = {}
    n = 0
    for r in baris_:
        w = wil[r["wilayah"]] if isinstance(r["wilayah"], int) else r["wilayah"]
        if r["hitung"] and r["tgl_wib"] in tgls and str(w).split("|")[0] in provs:
            n += 1; kb = w.split("|")[1]; kab[kb] = kab.get(kb, 0) + 1
    ring = {"acuan": acuan_h["acuan"], "kalteng48": n, "kab": sorted(kab.items(), key=lambda x: -x[1])[:5]}
    if GENERIK:
        nm = ", ".join(PROV.get(p_, f"provinsi {p_}") for p_ in provs)
        t0, t1 = (tgls + tgls)[0], tgls[-1]
        ring.update({"hari_fwi": HARI_WIB, "wilayah": nm, "tgl_label": (f"{int(t0[3:])}–" if t0 != t1 and t0[:2] == t1[:2] else f"{int(t0[3:])} {BLN[int(t0[:2])]}–" if t0 != t1 else "") + f"{int(t1[3:])} {BLN[int(t1[:2])]}",
                     "judul": f"Renlap: {len(situs)} lokasi", "n_gambut": sum(1 for s in situs if s["gambut_prims"])})
    json.dump({"situs": situs, "ringkas": ring}, open(f"{OUT}/data.json", "w"), ensure_ascii=False)
    print(ring, file=sys.stderr)


if __name__ == "__main__":
    main()
