"""Peta Paparan per bangunan (ALGORITMA F2.1, F2.2, F2.5): sel halus 110 m Open Buildings (ambang 0,70, U11) x zona bahaya.

Memakai ulang scripts/umum/paparan_bangunan.py (geometri, Grid), scripts/umum/bangunan.py (konstanta, halus_*.json), scripts/data/wilayah.py,
scripts/bnpb/terpapar.py (Dukcapil), bahaya_kelas.py. Tiga sumber jiwa berdampingan, tidak dirata-rata: WorldPop per kecamatan
(public/data/penduduk.json), Dukcapil per desa (titik pusat terdekat dalam kecamatan yang sama, U17: estimasi-model), GHSL (null "menunggu" bila belum ada).
Keluaran siklus/saji/paparan/<prov>.json, kab/<kab4>.json, rinci/<kab4>.json (sel 110 m, tanpa koordinat bangunan tunggal); tidak pernah ke public/.
Tanpa grid provinsi: terliput false, kab kosong (bukan 0). Zona tanpa geometri: tersedia false + alasan.
Pakai: python3 -I scripts/siklus/paparan.py uji | kab PROV KAB4 KELUAR_DIR [--kelas] | kejadian AKAR_SAJI [--kode B0007]
"""
import importlib.util, json, math, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
GALAT_KASAR_KM, GALAT_HALUS_KM = 0.8, 0.08
PITA_KM = (1, 3, 5)


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


K = _muat("sk_konst", "scripts/siklus/konst.py")
PB = _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
BG = _muat("sk_bangunan", "scripts/umum/bangunan.py")
HK = _muat("sk_bahaya_kelas", "scripts/siklus/bahaya_kelas.py")
assert K.AMBANG_BANGUNAN == BG.AMBANG_KEYAKINAN, "ambang bangunan harus satu nilai dengan bangunan.py"

KETERBATASAN = ("Bangunan terdeteksi Google Open Buildings v3 dengan keyakinan >= 0,70 (U11); komisi dan omisi tidak dikoreksi. "
                "Bangunan dianggap di zona bila pusat sel 110 m (galat +-0,08 km; sel kasar 0,01 derajat +-0,8 km) berada di zona; sel di batas tidak dibagi. "
                "Desa tanpa poligon: sel ditetapkan ke titik pusat desa Dukcapil terdekat dalam kecamatan yang sama (estimasi-model). "
                "Pembagian jiwa sebanding jumlah bangunan (asumsi-kebijakan); tiga sumber jiwa berdampingan, tahun dan definisinya berbeda. "
                "Kelas InaRISK memakai batas bawaan program, bukan batas resmi.")


# ---------- zona ----------
def zona_dari_bagian(daftar, bahaya, kunci, radius_km=0.0, galat_km=GALAT_HALUS_KM):
    """daftar GeoJSON geometry (Polygon/MultiPolygon/Point) -> zona {fn(lon, lat)}; radius_km > 0 = dalam jarak itu dari tepi poligon."""
    isi = []
    for g in daftar:
        b = PB.cincin(g)
        x0, y0, x1, y1 = PB.kotak_cincin(b)
        pad = radius_km / 111.0
        isi.append((x0 - pad / max(.2, math.cos(math.radians((y0 + y1) / 2))), y0 - pad, x1 + pad / max(.2, math.cos(math.radians((y0 + y1) / 2))), y1 + pad, b))

    def fn(lon, lat):
        for x0, y0, x1, y1, b in isi:
            if x0 <= lon <= x1 and y0 <= lat <= y1 and (PB.jarak_km(lon, lat, b) <= radius_km if radius_km else PB.di_geom(lon, lat, b)):
                return True
        return False
    return {"bahaya": bahaya, "kunci": kunci, "tersedia": True, "fn": fn, "galat_km": galat_km, "radius_km": radius_km or None}


def tak_tersedia(bahaya, alasan):
    return {"bahaya": bahaya, "kunci": None, "tersedia": False, "alasan": alasan}


def zona_dari_berkas(akar=AKAR):
    """Zona dari keluaran bahaya yang sudah ada di repo (sama dengan paparan_bangunan.py). Kosong/tak ada = tersedia false + alasan."""
    baca = lambda r: json.load(open(os.path.join(akar, r), encoding="utf-8"))
    z = []
    try:
        fit = [f for f in baca("public/data/kluster.json")["features"] if f["properties"].get("n24", 0) > 0
               and f["properties"].get("jam_sejak", 99) <= 24 and f["properties"].get("level", 0) >= 2]
    except (OSError, ValueError, KeyError):
        fit = []
    if fit:   # kumulatif dari tepi kompleks aktif; jejak 72 jam belum dimasukkan
        z += [zona_dari_bagian([f["geometry"] for f in fit], "karhutla", f"km{r}", r) for r in PITA_KM]
    else:
        z.append(tak_tersedia("karhutla", "tidak ada kompleks aktif di kluster.json"))
    try:
        gb = [f["geometry"] for f in baca("public/banjir/data/kejadian_aktif_geo.json")["features"]]
    except (OSError, ValueError, KeyError):
        gb = []
    z.append(zona_dari_bagian(gb, "banjir", "poligon") if gb else tak_tersedia("banjir", "tidak ada poligon kejadian aktif"))
    z.append(tak_tersedia("rob", "hanya titik tinggi laut, tidak ada poligon"))
    z.append(tak_tersedia("gempa", "pita MMI dihitung tiket F3.1"))
    try:
        gn = baca("public/gunungapi/data/paparan_geo.json")
        for tk in ("I", "II", "III"):
            g = [v["zona"][tk] for v in gn.values() if v.get("zona", {}).get(tk)]
            if g:
                z.append(zona_dari_bagian(g, "gunungapi", f"krb{tk}"))
    except (OSError, ValueError, KeyError, AttributeError):
        z.append(tak_tersedia("gunungapi", "paparan_geo.json tidak terbaca"))
    return z


# ---------- inti hitung ----------
def terdekat(titik, desa):
    """Voronoi: indeks desa terdekat; d^2 = dlat^2 + (cos(lat0) dlon)^2. desa [(id, lon, lat)]."""
    lon, lat = titik
    return min(desa, key=lambda d: (d[2] - lat) ** 2 + (math.cos(math.radians(lat)) * (d[1] - lon)) ** 2)[0]


def selisih(jiwa):
    v = [x for x in jiwa.values() if x is not None]
    return round(max(v) - min(v)) if len(v) >= 2 else None


def hitung_kab(sel, zonas, desa, wp, ghsl=None, kelas_h=None):
    """sel [(i, j, n, luas_m2, kec, lon, lat)] sel halus kabupaten; desa [(id, kec, lon, lat, jiwa)]; wp {kec: jiwa WorldPop};
    ghsl {kunci_zona: jiwa}|None; kelas_h {(i, j): {bahaya: H}}|None. -> dict kabupaten."""
    kec_n, kec_luas = {}, {}
    for i, j, n, a, kc, lo, la in sel:
        kec_n[kc] = kec_n.get(kc, 0) + n
        kec_luas[kc] = kec_luas.get(kc, 0) + a
    des_kec = {}
    for d in desa:
        des_kec.setdefault(d[1], []).append((d[0], d[2], d[3]))
    desa_n, penetapan = {}, {}
    for i, j, n, a, kc, lo, la in sel:
        pool = des_kec.get(kc) or [(d[0], d[2], d[3]) for d in desa]
        did = terdekat((lo, la), pool) if pool else None
        penetapan[(i, j)] = did
        if did is not None:
            desa_n[did] = desa_n.get(did, 0) + n
    out = {"n": sum(kec_n.values()), "luas_m2": sum(kec_luas.values()), "kec": {kc: {"n": kec_n[kc], "luas_m2": kec_luas[kc], "jiwa_worldpop": wp.get(kc)} for kc in sorted(kec_n)},
           "zona": {}}
    for z in zonas:
        if not z["tersedia"]:
            out["zona"].setdefault(z["bahaya"], {"tersedia": False, "alasan": z["alasan"]})
            continue
        dlm = [c for c in sel if z["fn"](c[5], c[6])]
        t_kec, t_des = {}, {}
        for i, j, n, a, kc, lo, la in dlm:
            t_kec[kc] = t_kec.get(kc, 0) + n
            if penetapan[(i, j)] is not None:
                t_des[penetapan[(i, j)]] = t_des.get(penetapan[(i, j)], 0) + n
        wp_j = sum(wp[kc] * t / kec_n[kc] for kc, t in t_kec.items()) if wp and all(wp.get(kc) is not None for kc in t_kec) else None
        dk_j = 0.0
        if desa:
            for d in desa:   # desa tanpa bangunan terdata: titik pusat dalam zona = 1, di luar = 0
                tot = desa_n.get(d[0], 0)
                dk_j += d[4] * (t_des.get(d[0], 0) / tot if tot else (1.0 if z["fn"](d[2], d[3]) else 0.0))
        else:
            dk_j = None
        gh = (ghsl or {}).get(z["kunci"])
        jiwa = {"worldpop": None if wp_j is None else round(wp_j), "dukcapil": None if dk_j is None else round(dk_j), "ghsl": gh}
        e = out["zona"].setdefault(z["bahaya"], {"tersedia": True, "galat_km": z["galat_km"], "per_zona": {}})
        e["per_zona"][z["kunci"]] = {"n": sum(c[2] for c in dlm), "luas_m2": sum(c[3] for c in dlm), "kec": dict(sorted(t_kec.items())),
                                      "desa": {str(k): v for k, v in sorted(t_des.items())}, "jiwa": jiwa, "jiwa_selisih": selisih(jiwa)}
        if kelas_h and z["bahaya"] in HK._T.LAPISAN:
            e["per_zona"][z["kunci"]]["kelas_inarisk"] = HK.klasifikasi((c[2], (kelas_h.get((c[0], c[1])) or {}).get(z["bahaya"])) for c in dlm)
    if kelas_h:
        out["kelas_inarisk"] = {b: HK.klasifikasi((c[2], (kelas_h.get((c[0], c[1])) or {}).get(b)) for c in sel)
                                for b in sorted({b for v in kelas_h.values() for b in v})}
    return out


def rinci(sel, zonas, lat0, lon0, step):
    """Sel 110 m yang masuk zona mana pun: [i, j, n, luas_m2, topeng bit zona]; tanpa koordinat bangunan tunggal."""
    urut = [z for z in zonas if z["tersedia"]]
    baris = []
    for i, j, n, a, kc, lo, la in sel:
        m = sum(1 << b for b, z in enumerate(urut) if z["fn"](lo, la))
        if m:
            baris.append([i, j, n, a, m])
    return {"lat0": lat0, "lon0": lon0, "step": step, "sel_m": 110, "zona_urut": [f"{z['bahaya']}:{z['kunci']}" for z in urut],
            "kolom": ["i", "j", "n", "luas_m2", "topeng"], "sel": baris}


# ---------- berkas saji ----------
def selubung(jenis, isi, G=None):
    G = G or _muat("sk_gudang", "scripts/siklus/gudang.py")
    return G.selubung(jenis, {"yakin": "estimasi-model", "ambang_keyakinan": K.AMBANG_BANGUNAN, "batas_inarisk": K.BATAS_INARISK,
                              "keterbatasan": KETERBATASAN, **isi})


def ringkas_prov(prov, ada_grid, kab_n):
    """paparan/<prov>.json. Tanpa grid: terliput false, kab kosong, tidak pernah n:0."""
    if not ada_grid:
        return {"prov": prov, "terliput": False, "status": "tidak terliput", "kab": {}}
    return {"prov": prov, "terliput": True, "kab": kab_n}


def tulis_saji(root, nama, isi, G=None):
    """Tulis satu berkas saji setelah lolos batas ukuran dan kunci terlarang (saji.periksa_berkas); -> daftar masalah."""
    S = _muat("sk_saji", "scripts/siklus/saji.py")
    kunci = f"siklus/saji/{nama}"
    data = json.dumps(selubung(nama.split("/")[0], isi, G), ensure_ascii=False, sort_keys=True).encode()
    m = S.periksa_berkas(kunci, data)
    if not m:
        j = os.path.join(root, *kunci.split("/"))
        os.makedirs(os.path.dirname(j), exist_ok=True)
        open(j, "wb").write(data)
    return m


# ---------- masukan nyata satu kabupaten ----------
def sel_kab(prov, kab4, akar=AKAR):
    """Sel halus kabupaten dari halus_<prov>.json + kecamatan titik tengah (Wilayah.cari). -> (sel, lat0, lon0, step, nama_kab)."""
    W = _muat("sk_wilayah", "scripts/data/wilayah.py")
    kk = {v: k for k, v in _muat("sk_hvc", "scripts/bnpb/hvc_dasar.py").kab_kode().items()}
    nama = kk[kab4].split("|", 1)[1]
    geo = json.load(open(os.path.join(akar, "public/geo/kecamatan", f"{prov}.json")))["features"]
    pts = [c for f in geo if f["properties"]["kab"] == nama for r in W._cincin(f["geometry"]) for c in r]
    x0, x1, y0, y1 = min(c[0] for c in pts), max(c[0] for c in pts), min(c[1] for c in pts), max(c[1] for c in pts)
    d = json.load(open(os.path.join(akar, "data/terkunci/bangunan", f"halus_{prov}.json")))
    st = d["step"]
    w, sel = W.Wilayah(), []
    for i, j, n, a in d["cells"]:
        la, lo = d["lat0"] + (i + .5) * st, d["lon0"] + (j + .5) * st
        if x0 <= lo <= x1 and y0 <= la <= y1:
            r = w.cari(lo, la)
            if r and r[0] == prov and r[1] == nama:
                sel.append((i, j, n, a, r[2], lo, la))
    return sel, d["lat0"], d["lon0"], st, nama, w


def desa_dukcapil(prov, kab4, w, cache_dir):
    """Desa Dukcapil satu kabupaten [(id, kec, lon, lat, jiwa)]; ArcGIS publik, jeda 2 dtk, cache di data/raw (git-ignored)."""
    cache = os.path.join(cache_dir, f"dukcapil_{kab4}.json")
    if os.path.exists(cache):
        mentah = json.load(open(cache))
    else:
        t = HK._T
        mentah, off = [], 0
        while True:
            r = t.D.ambil(t.DUKCAPIL, {"where": f"no_prop={int(prov)} AND no_kab={int(kab4[2:])}", "outFields": t.FIELD, "returnGeometry": "false",
                                       "returnCentroid": "true", "orderByFields": "objectid", "resultOffset": off, "resultRecordCount": 1000, "f": "json"}, jeda=2)
            if "error" in r:
                raise RuntimeError(f"Dukcapil: {r['error']}")
            fs = r.get("features", [])
            mentah += [d for d in (t.desa_dari_fitur(f) for f in fs) if d]
            off += len(fs)
            if not r.get("exceededTransferLimit") or not fs:
                break
        os.makedirs(cache_dir, exist_ok=True)
        json.dump(mentah, open(cache, "w"))
    out = []
    for d in mentah:
        r = w.cari(d["x"], d["y"])
        out.append((d["oid"], r[2] if r else None, d["x"], d["y"], d["n"]))
    return out


def jalankan_kab(prov, kab4, keluar, kelas=False):
    sel, lat0, lon0, st, nama, w = sel_kab(prov, kab4)
    if not sel:
        sys.exit(f"{kab4}: tidak ada sel halus (tidak terliput)")
    cache = os.path.join(AKAR, "data/raw/siklus")
    desa = desa_dukcapil(prov, kab4, w, cache)
    wp = {k.split("|", 2)[2]: v for k, v in json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["kec"].items() if k.startswith(f"{prov}|{nama}|")}
    zonas = zona_dari_berkas()
    kh = None
    if kelas:
        kh = {(c[0], c[1]): {} for c in sel}
        pts = [(c[5], c[6]) for c in sel]
        for b in ("banjir", "karhutla"):
            for c, h in zip(sel, HK.sampel(b, pts)):
                kh[(c[0], c[1])][b] = h
    h = hitung_kab(sel, zonas, desa, wp, None, kh)
    h["kab4"], h["nama"] = kab4, nama
    masalah = tulis_saji(keluar, f"paparan/kab/{kab4}.json", h)
    masalah += tulis_saji(keluar, f"paparan/rinci/{kab4}.json", {"kab4": kab4, **rinci(sel, zonas, lat0, lon0, st)})
    masalah += tulis_saji(keluar, f"paparan/{prov}.json", ringkas_prov(prov, True, {kab4: {"n": h["n"], "luas_m2": h["luas_m2"]}}))
    return h, masalah


def paparan_kejadian(e, geoms, sel_fn, desa_fn, wp_semua):
    """Paparan banjir SATU kejadian aktif (kode B00xx; poligon miliknya saja) untuk kaji_banjir: gabungan kabupaten dari e['kec'] ('prov|kab|kec').
    kec dikunci 'prov|kab|kec' (sama dengan kec_siaga kaji_banjir dan penduduk.json). Grid halus kabupaten tidak ada / tak terliput / tanpa poligon =
    zona banjir tersedia false + alasan (menunggu), bukan nol. Jiwa per sumber dijumlah antarkabupaten hanya bila semuanya ada, selain itu None.
    sel_fn(prov, kab4) -> (sel, lat0, lon0, step, nama, w) | melempar OSError; desa_fn(prov, kab4, w) -> desa; wp_semua {'prov|kab|kec': jiwa}."""
    Kn = _muat("sk_kunci", "scripts/siklus/kunci.py")
    kabs = sorted({tuple(k.split("|")[:2]) for k in e.get("kec", []) if k.count("|") >= 2})
    out = {"kode": e["kode"], "kab": [], "n": None, "kec": {}, "zona": {}}
    tunggu = lambda alasan: out.update(zona={"banjir": {"tersedia": False, "alasan": alasan}}) or out
    if not geoms:
        return tunggu("tidak ada poligon untuk kejadian ini di kejadian_aktif_geo.json (menunggu)")
    zonas, n, jiwa, per, galat = [zona_dari_bagian(geoms, "banjir", "poligon")], 0, [], {"n": 0, "luas_m2": 0, "kec": {}}, None
    for prov, kab in kabs:
        k4 = Kn.kab4(f"{prov}|{kab}")
        if not k4:
            return tunggu(f"kabupaten {prov}|{kab} tidak terpetakan ke kab4 (menunggu)")
        try:
            sel, _, _, _, nama, w = sel_fn(prov, k4)
        except OSError:
            return tunggu(f"grid halus provinsi {prov} tidak ada di data/terkunci/bangunan (menunggu)")
        if not sel:
            return tunggu(f"{k4}: tidak ada sel halus, kabupaten tidak terliput (menunggu)")
        wp = {k.split("|", 2)[2]: v for k, v in wp_semua.items() if k.startswith(f"{prov}|{nama}|")}
        h = hitung_kab(sel, zonas, desa_fn(prov, k4, w), wp)
        z = h["zona"]["banjir"]["per_zona"]["poligon"]
        out["kab"].append(k4)
        galat = h["zona"]["banjir"]["galat_km"]
        per["n"] += z["n"]
        per["luas_m2"] += z["luas_m2"]
        jiwa.append(z["jiwa"])
        for kc, v in h["kec"].items():
            out["kec"][f"{prov}|{nama}|{kc}"] = v
    j = {s: (None if any(x[s] is None for x in jiwa) else sum(x[s] for x in jiwa)) for s in ("worldpop", "dukcapil", "ghsl")}
    out["kab"].sort()
    out["n"] = sum(v["n"] for v in out["kec"].values())
    out["zona"] = {"banjir": {"tersedia": True, "galat_km": galat, "per_zona": {"poligon": {"n": per["n"], "luas_m2": per["luas_m2"], "jiwa": j, "jiwa_selisih": selisih(j)}}}}
    return out


def jalankan_kejadian(keluar, awal=None, geo=None, kode=None, sel_fn=None, desa_fn=None, wp_semua=None):
    """Semua kejadian banjir aktif -> siklus/saji/paparan/<kode>.json di bawah `keluar`. -> (daftar (kode, status), masalah). Dry-run tidak ada: hanya menulis ke `keluar`."""
    baca = lambda r: json.load(open(os.path.join(AKAR, r), encoding="utf-8"))
    awal = awal or baca("public/banjir/data/kejadian_aktif_awal.json")
    geo = geo or baca("public/banjir/data/kejadian_aktif_geo.json")
    cache = os.path.join(AKAR, "data/raw/siklus")
    sel_fn = sel_fn or sel_kab
    desa_fn = desa_fn or (lambda prov, k4, w: desa_dukcapil(prov, k4, w, cache))
    wp_semua = wp_semua if wp_semua is not None else baca("public/data/penduduk.json")["kec"]
    hasil, masalah = [], []
    for e in awal["kejadian"]:
        if kode and e["kode"] != kode:
            continue
        g = [f["geometry"] for f in geo.get("features", []) if (f.get("properties") or {}).get("kode") == e["kode"]]
        h = paparan_kejadian(e, g, sel_fn, desa_fn, wp_semua)
        m = tulis_saji(keluar, f"paparan/{e['kode']}.json", h)
        masalah += m
        hasil.append((e["kode"], "ditolak" if m else "ok" if h["zona"]["banjir"]["tersedia"] else "menunggu: " + h["zona"]["banjir"]["alasan"]))
    return hasil, masalah


def semua_kab(akar=AKAR, prov=None):
    """[(prov, kab4)] untuk provinsi yang punya halus_<prov>.json; provinsi tanpa berkas itu dilewati (bukan nol)."""
    kk = _muat("sk_hvc", "scripts/bnpb/hvc_dasar.py").kab_kode()
    ada = lambda p: os.path.exists(os.path.join(akar, "data/terkunci/bangunan", f"halus_{p}.json"))
    return sorted((k.split("|", 1)[0], v) for k, v in kk.items() if (prov is None or k.split("|", 1)[0] == prov) and ada(k.split("|", 1)[0]))


def jalankan_semua(fn, keluar, prov=None):
    """Panggil fn(prov, kab4, keluar) per kabupaten; satu gagal tidak menghentikan yang lain. -> ringkasan; exit 1 bila ada gagal."""
    daftar = semua_kab(prov=prov)
    r = {"kab": len(daftar), "ok": [], "gagal": {}}
    for p, k in daftar:
        try:
            m = fn(p, k, keluar)
            (r["gagal"].__setitem__(k, str(m)[:200]) if m else r["ok"].append(k))
        except (Exception, SystemExit) as e:
            r["gagal"][k] = str(e)[:200]
    r["ok"] = len(r["ok"])
    if not daftar:
        r["catatan"] = "tidak ada halus_<prov>.json di data/terkunci/bangunan: dilewati, bukan nol"
    print(json.dumps(r, ensure_ascii=False))
    return 1 if r["gagal"] else 0


# ---------- uji ----------
def _uji():
    # sel 110 m fiktif: 2 kecamatan, 2 desa Dukcapil di kecamatan A, 1 di B
    sel = [(0, 0, 100, 5000, "A", 100.000, -1.0), (0, 1, 100, 5000, "A", 100.001, -1.0), (0, 9, 100, 5000, "A", 100.009, -1.0), (5, 5, 50, 2500, "B", 100.005, -1.005)]
    desa = [("d1", "A", 100.0, -1.0, 600), ("d2", "A", 100.009, -1.0, 400), ("d3", "B", 100.005, -1.005, 300), ("d4", "B", 100.5, -1.5, 80)]
    persegi = {"type": "Polygon", "coordinates": [[[99.9995, -1.0005], [100.0015, -1.0005], [100.0015, -0.9995], [99.9995, -0.9995], [99.9995, -1.0005]]]}
    z = [zona_dari_bagian([persegi], "banjir", "poligon"), tak_tersedia("rob", "hanya titik tinggi laut"), tak_tersedia("gempa", "menunggu")]
    wp = {"A": 1000, "B": 400}
    h = hitung_kab(sel, z, desa, wp)
    zb = h["zona"]["banjir"]["per_zona"]["poligon"]
    assert zb["n"] == 200 and zb["kec"] == {"A": 200} and zb["desa"] == {"d1": 200}, zb
    assert zb["jiwa"] == {"worldpop": round(1000 * 200 / 300), "dukcapil": round(600 * 200 / 200 + 400 * 0 + 0 + 0), "ghsl": None}, zb["jiwa"]
    assert zb["jiwa_selisih"] == abs(667 - 600) and "total" not in json.dumps(h) and "rata" not in json.dumps(h)
    assert h["zona"]["rob"] == {"tersedia": False, "alasan": "hanya titik tinggi laut"}   # bukan 0
    assert h["n"] == 350 and h["kec"]["B"]["jiwa_worldpop"] == 400
    # desa d4 tanpa bangunan: titik pusat di luar zona = 0 (tidak menambah), di dalam = 1
    z2 = zona_dari_bagian([{"type": "Polygon", "coordinates": [[[100.4, -1.6], [100.6, -1.6], [100.6, -1.4], [100.4, -1.4], [100.4, -1.6]]]}], "banjir", "poligon")
    assert hitung_kab(sel, [z2], desa, wp)["zona"]["banjir"]["per_zona"]["poligon"]["jiwa"]["dukcapil"] == 80
    # tanpa desa Dukcapil dan tanpa WorldPop kecamatan: null, bukan 0
    kosong = hitung_kab(sel, z[:1], [], {})["zona"]["banjir"]["per_zona"]["poligon"]["jiwa"]
    assert kosong == {"worldpop": None, "dukcapil": None, "ghsl": None}
    # contoh ALG F2.5: WorldPop 3.000, Dukcapil 3.032,14, GHSL 2.700 -> selisih 332
    assert selisih({"worldpop": 3000, "dukcapil": round(3032.14), "ghsl": 2700}) == 332 and selisih({"a": 5, "b": None}) is None
    assert abs(5000 * 600 / 1600 + 4000 * 300 / 1400 + 3000 * 100 / 1000 - 3032.14) < .01
    # radius karhutla kumulatif: titik 0,9 km dan 2 km dari tepi
    pt = {"type": "Point", "coordinates": [100.0, 0.0]}
    r1, r3 = zona_dari_bagian([pt], "karhutla", "km1", 1), zona_dari_bagian([pt], "karhutla", "km3", 3)
    assert r1["fn"](100.0, 0.0081) and not r1["fn"](100.0, 0.018) and r3["fn"](100.0, 0.018) and not r3["fn"](100.0, 0.03)
    # kelas InaRISK terhubung: sel di zona dengan H 0,2 dan nodata
    kh = {(0, 0): {"banjir": 0.2}, (0, 1): {"banjir": None}}
    kz = hitung_kab(sel, z[:1], desa, wp, None, kh)["zona"]["banjir"]["per_zona"]["poligon"]["kelas_inarisk"]
    assert kz == {"rendah": 100, "sedang": 0, "tinggi": 0, "tak_terliput": 100}, kz
    # rinci: hanya sel di zona, sel 110 m, tanpa koordinat bangunan
    ri = rinci(sel, z, -12.0, 94.0, 0.001)
    assert ri["sel_m"] == 110 and [b[:2] for b in ri["sel"]] == [[0, 0], [0, 1]] and ri["zona_urut"] == ["banjir:poligon"]
    # provinsi tanpa grid: terliput false, bukan n:0
    p = ringkas_prov("99", False, {})
    assert p == {"prov": "99", "terliput": False, "status": "tidak terliput", "kab": {}}
    # berkas saji: keterbatasan tertulis, ambang 0,70, batas InaRISK; kunci terlarang dan ukuran ditolak
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        assert tulis_saji(t, "paparan/kab/9999.json", h) == []
        b = json.load(open(os.path.join(t, "siklus/saji/paparan/kab/9999.json")))
        assert b["ambang_keyakinan"] == 0.7 and b["batas_inarisk"] == [0.33, 0.66] and "0,70" in b["keterbatasan"] and b["yakin"] == "estimasi-model"
        assert tulis_saji(t, "paparan/kab/9998.json", {"x": {"total": 1}})
        assert tulis_saji(t, "paparan/rinci/9998.json", {"x": "y" * 1_000_001}) and not os.path.exists(os.path.join(t, "siklus/saji/paparan/rinci/9998.json"))
    # zona dari berkas repo: tidak melempar, rob dan gempa tersedia false
    zz = zona_dari_berkas(tempfile.gettempdir() + "/_tak_ada_siklus")
    assert all(not x["tersedia"] for x in zz if x["bahaya"] in ("rob", "gempa", "karhutla"))
    assert jalankan_semua(lambda *a: [], tempfile.gettempdir(), prov="zz") == 0 and semua_kab(prov="zz") == []
    # paparan kejadian: dua kabupaten digabung, kec berkunci penuh; grid hilang = menunggu (bukan 0); tanpa poligon = menunggu
    class _W:
        pass
    selK = {"3301": [(0, 0, 100, 5000, "A", 100.000, -1.0)], "3302": [(0, 1, 50, 2500, "B", 100.001, -1.0)]}
    def sel_fn(prov, k4):
        if prov == "99":
            raise FileNotFoundError("halus_99.json")
        return selK[k4], 0, 0, .001, {"3301": "Cilacap", "3302": "Banyumas"}[k4], _W()
    ev = {"kode": "B0007", "kec": ["33|Cilacap|A", "33|Banyumas|B"]}
    pk = paparan_kejadian(ev, [persegi], sel_fn, lambda *a: [], {"33|Cilacap|A": 1000, "33|Banyumas|B": 400})
    zp = pk["zona"]["banjir"]["per_zona"]["poligon"]
    assert pk["kab"] == ["3301", "3302"] and set(pk["kec"]) == {"33|Cilacap|A", "33|Banyumas|B"} and zp["n"] == 150 and zp["jiwa"]["dukcapil"] is None, pk
    assert zp["jiwa"]["worldpop"] == round(1000 * 100 / 100) + round(400 * 50 / 50) == 1400 and zp["jiwa"]["ghsl"] is None
    hl = paparan_kejadian({"kode": "B9", "kec": ["99|X|Y"]}, [persegi], sel_fn, lambda *a: [], {})
    assert hl["zona"]["banjir"]["tersedia"] is False and "menunggu" in hl["zona"]["banjir"]["alasan"] and hl["n"] is None, "grid tidak ada = menunggu, bukan 0"
    assert paparan_kejadian(ev, [], sel_fn, lambda *a: [], {})["zona"]["banjir"]["tersedia"] is False
    with tempfile.TemporaryDirectory() as t:
        aw = {"kejadian": [ev, {"kode": "B0008", "kec": ["99|X|Y"]}]}
        ge = {"features": [{"properties": {"kode": "B0007"}, "geometry": persegi}, {"properties": {"kode": "B0008"}, "geometry": persegi}]}
        hs, ms = jalankan_kejadian(t, aw, ge, None, sel_fn, lambda *a: [], {})
        assert ms == [] and hs[0] == ("B0007", "ok") and hs[1][1].startswith("menunggu"), hs
        assert json.load(open(os.path.join(t, "siklus/saji/paparan/B0007.json")))["zona"]["banjir"]["per_zona"]["poligon"]["n"] == 150
    print("paparan: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        _uji()
    elif a[:1] == ["kab"] and len(a) >= 4:
        h, m = jalankan_kab(a[1], a[2], a[3], "--kelas" in a)
        print(json.dumps({"n": h["n"], "luas_m2": h["luas_m2"], "kec": len(h["kec"]), "zona": {b: (e.get("per_zona") and {k: [v["n"], v["jiwa"]] for k, v in e["per_zona"].items()}) or e for b, e in h["zona"].items()}, "masalah": m}, ensure_ascii=False))
        sys.exit(1 if m else 0)
    elif a[:1] == ["kejadian"] and len(a) >= 2:
        hs, ms = jalankan_kejadian(a[1], kode=a[a.index("--kode") + 1] if "--kode" in a else None)
        for k, st in hs:
            print(k, st)
        sys.exit(1 if ms else 0)
    else:
        sys.exit("pakai: paparan.py uji | kab PROV KAB4 KELUAR_DIR [--kelas] | kejadian AKAR_SAJI [--kode B0007]")
