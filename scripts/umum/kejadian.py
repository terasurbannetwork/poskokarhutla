"""Mesin kejadian bersama (A04, A05, A07): calon kejadian harian dari adaptor -> kode stabil `<awalan>NNNN` + masa aktif
-> public/banjir/data/kejadian_<id>_awal.json (atribut ringan) + kejadian_<id>_geo.json (geometri, dimuat malas).

Rujukan bentuk: scripts/banjir/kejadian_aktif.py (B0001). Folder keluaran ber-cache = public/banjir/data (public/<id>/data
ditimpa checkout saat terbit). Gempa TIDAK di sini (G#### di D1); banjir pakai skripnya sendiri; karhutla K#### di scripts/data.

Aturan kode (tertulis, diuji):
  * Calon = {anggota: [kunci satuan], jenis, nama, prov, kab, pusat, besaran, jiwa?, poligon?}. Calon baru dicocokkan SATU-SATU
    dengan kejadian yang masih dalam masa aktif: jenis sama DAN (irisan anggota terbesar dulu; bila tak beririsan dan
    JARAK_KM[id] > 0, titik pusat <= JARAK_KM km, terdekat dulu). Cocok = kode lama; tidak cocok = nomor baru dari `terakhir`.
  * Nomor tidak pernah dipakai ulang (penghitung `terakhir` di kejadian_<id>_nomor.json, ikut cache).
  * Masa aktif: kejadian yang tak muncul lagi tetap terbit `aktif:false` sampai MASA[id] hari sesudah `terakhir`; lewat itu
    keluar dari berkas dan tak bisa dicocokkan lagi (kemunculan berikutnya = kejadian baru, kode baru).
  * `mulai` dibawa dari kode lama; `terakhir` = hari calon terakhir terlihat.
Gugus (satuan kab bersebelahan = berbagi titik batas pada public/geo/kabupaten/*.json): udara & cuaca lintas provinsi,
kekeringan hanya dalam satu provinsi (kalau tidak, gugusnya satu pulau penuh).

_awal: {"dibuat","hari","bencana","awalan","terakhir","kejadian":[{kode,nama,tempat,jenis,prov,kab(maks 12),n_kab,mulai,terakhir,
        aktif,besaran:{nilai,satuan,ket},jiwa?,pusat}]}    _geo: FeatureCollection satu fitur per kode (MultiPolygon/Point).
Input basi/hilang -> adaptor mengembalikan None: tak ada yang ditulis (kejadian lama tidak dihapus karena data macet).

Pakai:  python3 scripts/umum/kejadian.py [cuaca udara gunungapi kekeringan] [--hari YYYY-MM-DD] [--keluar DIR]
        python3 scripts/umum/kejadian.py uji
Urutan di workflow: sesudah modul masukan masing-masing (cuaca_kec/peringatan, udara prakiraan, gunungapi_status, kekeringan_wilayah).
"""
import argparse, datetime as dt, importlib.util, json, math, os, sys, tempfile
from collections import defaultdict

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/banjir/data")
WIB = dt.timezone(dt.timedelta(hours=7))
MASA = {"cuaca": 1, "udara": 2, "gunungapi": 3, "kekeringan": 14}   # hari sesudah terakhir terlihat
JARAK_KM = {"cuaca": 60}   # cadangan pencocokan ruang (CAP terbit ulang dengan id baru)
MAKS_KAB = 12              # kab yang disebut di _awal; sisanya hanya n_kab
PM_TIDAK_SEHAT = 55.4      # P.14/2020, µg/m³ rata-rata 24 jam (batas atas Sedang; scripts/udara/alat.py BATAS[0])
_s = importlib.util.spec_from_file_location("umum_kej_wilayah", os.path.join(AKAR, "scripts/data/wilayah.py"))
_W = importlib.util.module_from_spec(_s)
_s.loader.exec_module(_W)


def baca(jalur, bawaan=None):
    try:
        return json.load(open(jalur, encoding="utf-8"))
    except (OSError, ValueError):
        return bawaan


def simpan(jalur, o):
    """`dibuat` kunci pertama (syarat /api/status); tulis atomik."""
    o = {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M%z")[:-2] + ":00", **{k: v for k, v in o.items() if k != "dibuat"}}
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    t = jalur + ".tmp"
    with open(t, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(t, jalur)


def km(a, b):
    la = math.radians((a[0] + b[0]) / 2)
    return 111.2 * math.hypot(a[0] - b[0], (a[1] - b[1]) * math.cos(la))


def selisih(h1, h2):
    return max(0, (dt.date.fromisoformat(h1) - dt.date.fromisoformat(h2)).days)


# ---------------------------------------------------------------- kabupaten (geometri + tetangga), dimuat malas
_KAB = {}


def kab_geo(akar):
    """{ "prov|kab": {poly, bbox, pusat, tetangga:set} } dari public/geo/kabupaten/*.json (tetangga = berbagi titik batas)."""
    if akar in _KAB:
        return _KAB[akar]
    d, titik = {}, defaultdict(set)
    rel = os.path.join(akar, "public/geo/kabupaten")
    for f in sorted(os.listdir(rel)) if os.path.isdir(rel) else []:
        for x in baca(os.path.join(rel, f), {"features": []})["features"]:
            k, g = f"{f[:2]}|{x['properties']['kab']}", x["geometry"]
            ps = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            xs = [c[0] for p in ps for c in p[0]]
            ys = [c[1] for p in ps for c in p[0]]
            d[k] = {"poly": ps, "bbox": (min(xs), min(ys), max(xs), max(ys)), "pusat": [round((min(ys) + max(ys)) / 2, 3), round((min(xs) + max(xs)) / 2, 3)], "tetangga": set()}
            for p in ps:
                for r in p:
                    for c in r:
                        titik[(round(c[0], 3), round(c[1], 3))].add(k)
    for ks in titik.values():
        for k in ks:
            d[k]["tetangga"] |= ks - {k}
    _KAB[akar] = d
    return d


def kab_di(akar, lat, lon, prov=None):
    """kunci kab yang memuat titik; di laut/di luar -> kab dengan pusat terdekat (selalu ada jawaban)."""
    G = kab_geo(akar)
    for k, v in G.items():
        b = v["bbox"]
        if (prov is None or k[:2] in prov) and b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and any(_W._di_dalam(lon, lat, p[0]) for p in v["poly"]):
            return k
    pool = [k for k in G if prov is None or k[:2] in prov] or list(G)
    return min(pool, key=lambda k: km([lat, lon], G[k]["pusat"])) if pool else None


def cari_kab(akar, nama, prov):
    """nama bebas ('Kab. Aceh Selatan', 'Kota Bogor') + kode prov -> kunci kab di geo, atau None."""
    G = kab_geo(akar)
    n = nama.strip()
    bersih = lambda s: "".join(c for c in s.lower() if c.isalnum())
    for cand in (n, n[4:].strip() if n.startswith("Kab.") else n):
        if f"{prov}|{cand}" in G:
            return f"{prov}|{cand}"
    return next((k for k in G if k[:2] == prov and bersih(k[3:]) == bersih(n[4:] if n.startswith("Kab.") else n)), None)


def gugus(akar, kunci, pisah_prov=False):
    """kunci kab -> [set kunci] bersebelahan (kunci yang tak ada di geo berdiri sendiri)."""
    G, induk = kab_geo(akar), {k: k for k in kunci}

    def cari(x):
        while induk[x] != x:
            induk[x] = induk[induk[x]]
            x = induk[x]
        return x
    for k in kunci:
        for t in G.get(k, {}).get("tetangga", ()):
            if t in induk and not (pisah_prov and t[:2] != k[:2]):
                induk[cari(k)] = cari(t)
    kel = defaultdict(set)
    for k in kunci:
        kel[cari(k)].add(k)
    return sorted(kel.values(), key=lambda s: sorted(s)[0])


def _ringkas(poly):
    """bulatkan 2 desimal (~1 km), buang titik berurutan kembar; cincin < 4 titik dibuang."""
    out = []
    for r in poly:
        n = []
        for c in r:
            p = [round(c[0], 2), round(c[1], 2)]
            if not n or n[-1] != p:
                n.append(p)
        if len(n) >= 4:
            out.append(n)
    return out


def dari_kab(akar, keys, pend=None):
    """bagian calon yang diturunkan dari himpunan kab: prov, kab, pusat, poligon (tanpa dissolve), jiwa."""
    G = kab_geo(akar)
    ada = sorted(k for k in keys if k in G)
    pol = [q for k in ada for p in G[k]["poly"] if (q := _ringkas(p))]
    pu = [G[k]["pusat"] for k in ada] or [[0, 0]]
    o = {"prov": sorted({k[:2] for k in keys}), "kab": sorted(keys), "pusat": [round(sum(p[0] for p in pu) / len(pu), 3), round(sum(p[1] for p in pu) / len(pu), 3)],
         "poligon": pol or None}
    if pend is not None:
        o["jiwa"] = sum(pend.get(k, 0) for k in keys)
    return o


# ---------------------------------------------------------------- mesin
def cocokkan(calon, lama, jarak_km=0):
    """-> {indeks calon: indeks lama}. Satu-satu; irisan anggota terbesar dulu, lalu jarak terdekat (hanya bila jarak_km > 0)."""
    pasang = []
    for i, c in enumerate(calon):
        for j, e in enumerate(lama):
            if c.get("jenis") != e.get("jenis"):
                continue
            o = len(set(c["anggota"]) & set(e["anggota"]))
            if o:
                pasang.append((-o, 0, i, j))
            elif jarak_km and km(c["pusat"], e["pusat"]) <= jarak_km:
                pasang.append((0, km(c["pusat"], e["pusat"]), i, j))
    pasang.sort()
    hasil, pakai = {}, set()
    for _, _, i, j in pasang:
        if i not in hasil and j not in pakai:
            hasil[i] = j
            pakai.add(j)
    return hasil


def proses(id, awalan, calon, hari, masa, keluar, jarak_km=0):
    """calon -> tulis _awal, _geo, _nomor di `keluar`. Mengembalikan baris _awal."""
    for c in calon:
        if not c.get("prov") or not c.get("kab"):
            raise ValueError(f"{id}: calon tanpa prov/kab: {c.get('nama')}")
    p = lambda s: os.path.join(keluar, f"kejadian_{id}_{s}.json")
    nomor, awal0, geo0 = baca(p("nomor")), baca(p("awal"), {}), baca(p("geo"), {"features": []})
    terakhir = (nomor or {}).get("terakhir", awal0.get("terakhir", 0))
    lama = [e for e in (nomor or {}).get("aktif", []) if selisih(hari, e["terakhir"]) <= masa]
    calon = sorted(calon, key=lambda c: (sorted(c["anggota"])[:1], c["nama"]))
    cocok = cocokkan(calon, lama, jarak_km)
    baris_lama = {r["kode"]: r for r in awal0.get("kejadian", [])}
    fitur_lama = {f["properties"]["kode"]: f for f in geo0.get("features", [])}
    rows, fitur, reg = [], [], []
    for i, c in enumerate(calon):
        if i in cocok:
            kode, mulai = lama[cocok[i]]["kode"], lama[cocok[i]]["mulai"]
        else:
            terakhir += 1
            kode, mulai = f"{awalan}{terakhir:04d}", hari
        kab = sorted(c["kab"])
        r = {"kode": kode, "nama": c["nama"], "tempat": c.get("tempat") or ", ".join(k.split("|")[1] for k in kab[:3]) + (f" +{len(kab) - 3}" if len(kab) > 3 else ""),
             "jenis": c.get("jenis"), "prov": sorted(c["prov"]), "kab": kab[:MAKS_KAB], "n_kab": len(kab), "mulai": mulai, "terakhir": hari, "aktif": True,
             "besaran": c["besaran"], "pusat": c["pusat"]}
        if c.get("jiwa") is not None:
            r["jiwa"] = c["jiwa"]
        if c.get("hingga"):   # CAP: akhir berlaku peringatan (dibaca scripts/umum/tugas.py untuk kartu cuaca)
            r["hingga"] = c["hingga"]
        rows.append({k: v for k, v in r.items() if v is not None})
        g = {"type": "MultiPolygon", "coordinates": c["poligon"]} if c.get("poligon") else {"type": "Point", "coordinates": [c["pusat"][1], c["pusat"][0]]}
        fitur.append({"type": "Feature", "properties": {"kode": kode}, "geometry": g})
        reg.append({"kode": kode, "anggota": sorted(c["anggota"]), "pusat": c["pusat"], "jenis": c.get("jenis"), "mulai": mulai, "terakhir": hari})
    ada = {r["kode"] for r in rows}
    for j, e in enumerate(lama):   # masih dalam masa tapi tak terlihat hari ini: terbit aktif:false
        if e["kode"] not in ada and e["kode"] in baris_lama and e["kode"] in fitur_lama:
            rows.append({**baris_lama[e["kode"]], "aktif": False})
            fitur.append(fitur_lama[e["kode"]])
            reg.append(e)
    rows.sort(key=lambda r: r["kode"])
    fitur.sort(key=lambda f: f["properties"]["kode"])
    simpan(p("nomor"), {"terakhir": terakhir, "aktif": sorted(reg, key=lambda e: e["kode"])})
    simpan(p("geo"), {"type": "FeatureCollection", "features": fitur})
    simpan(p("awal"), {"hari": hari, "bencana": id, "awalan": awalan, "terakhir": terakhir, "kejadian": rows})
    return rows


# ---------------------------------------------------------------- adaptor tipis (membaca keluaran yang sudah ada)
def _pend(akar):
    """{ 'prov|kab': jiwa } dari public/data/penduduk.json (jumlah kecamatan)."""
    d = defaultdict(int)
    for k, v in (baca(os.path.join(akar, "public/data/penduduk.json"), {}) or {}).get("kec", {}).items():
        d["|".join(k.split("|")[:2])] += v
    return d


def _nama_kab(k):
    return k.split("|")[1]


def adaptor_udara(akar, hari):
    """kab/kota dengan PM2,5 rata-rata 24 jam pertama prakiraan > batas Tidak sehat; kab bersebelahan = satu kejadian."""
    P = baca(os.path.join(akar, "public/udara/data/prakiraan.json"))
    if not P or hari not in P.get("hari", []):
        return None
    pm, G = {}, kab_geo(akar)
    for k in P["kota"]:
        v = [x for x in k["pm"][:24] if x is not None]
        if len(v) >= 12 and round(sum(v) / len(v)) > PM_TIDAK_SEHAT:
            pm[cari_kab(akar, k["nama"], k["prov"]) or f"{k['prov']}|{k['nama']}"] = (round(sum(v) / len(v)), [k["lat"], k["lon"]])
    pend, out = _pend(akar), []
    for g in gugus(akar, set(pm)):
        c = dari_kab(akar, g, pend)
        for k in g:   # kab yang tak ada di geo: titik dari prakiraan
            if k not in G:
                c["pusat"], c["poligon"] = pm[k][1], None
        mx = max(g, key=lambda k: (pm[k][0], k))
        c.update(anggota=sorted(g), jenis="pm25", nama=f"Udara tidak sehat, sekitar {_nama_kab(mx)}", besaran={"nilai": pm[mx][0], "satuan": "µg/m³ PM2,5 24 jam", "ket": f"tertinggi di {_nama_kab(mx)}"})
        out.append(c)
    return out


LEVEL_GUNUNG = {2: "Waspada", 3: "Siaga", 4: "Awas"}


def adaptor_gunungapi(akar, hari):
    S = baca(os.path.join(akar, "public/banjir/data/gunungapi_status.json"))
    if not S or selisih(hari, S["dibuat"][:10]) > 2:
        return None
    out = []
    for g in S["gunung"]:
        if g["level"] < 2:
            continue
        k = kab_di(akar, g["lat"], g["lon"])
        if not k:
            continue
        out.append({"anggota": ["gunung:" + g["nama"]], "jenis": "gunung", "nama": f"G. {g['nama']}", "tempat": f"G. {g['nama']}, {_nama_kab(k)}", "prov": [k[:2]], "kab": [k],
                    "pusat": [g["lat"], g["lon"]], "poligon": None, "besaran": {"nilai": g["level"], "satuan": "level", "ket": f"Level {'I' * g['level'] if g['level'] < 4 else 'IV'} ({LEVEL_GUNUNG[g['level']]})"}})
    return out


def adaptor_kekeringan(akar, hari):
    W = baca(os.path.join(akar, "public/data/kekeringan_wilayah.json"))
    if not W or "kab" not in W:
        return None
    kab = {k: v for k, v in W["kab"].items() if v["lv"] >= 2}
    out = []
    for g in gugus(akar, set(kab), pisah_prov=True):
        mx = max(g, key=lambda k: (kab[k]["lv"], kab[k]["total"], k))
        c = dari_kab(akar, g)
        c.update(anggota=sorted(g), jenis="kering", jiwa=sum(kab[k]["jiwa"][1] for k in g), nama=f"Kekeringan Siaga/Awas, sekitar {_nama_kab(mx)}",
                 besaran={"nilai": kab[mx]["lv"], "satuan": "tingkat", "ket": ("Awas" if kab[mx]["lv"] == 3 else "Siaga") + f" tertinggi; {len(g)} kab"})
        out.append(c)
    return out


def _poligon_cap(p):
    """polygon CAP: cincin [[lon,lat]..] atau daftar cincin atau daftar poligon -> daftar poligon."""
    while isinstance(p, list) and p and isinstance(p[0], list) and p[0] and isinstance(p[0][0], list) and isinstance(p[0][0][0], list):
        return p
    if p and isinstance(p[0][0], list):
        return [p]
    return [[p]]


def adaptor_cuaca(akar, hari):
    """(a) kecamatan tingkat >= 2 hari ini, digugus per kab bersebelahan; (b) tiap peringatan CAP BMKG aktif."""
    C, PU = baca(os.path.join(akar, "public/banjir/data/cuaca_kec.json")), baca(os.path.join(akar, "public/banjir/data/peringatan.json"))
    if not C or hari not in C.get("hari", []) or not PU:
        return None
    d, pusat = C["hari"].index(hari), baca(os.path.join(akar, "public/banjir/data/pusat_kec.json"), {})
    nama = list(pusat)
    pend = (baca(os.path.join(akar, "public/data/penduduk.json"), {}) or {}).get("kec", {})
    per_kab, kec_n, jiwa = defaultdict(int), defaultdict(int), defaultdict(int)
    for r in C["kec"]:
        if r[1][d] >= 2 and r[0] < len(nama):
            k = "|".join(nama[r[0]].split("|")[:2])
            per_kab[k] = max(per_kab[k], r[1][d])
            kec_n[k] += 1
            jiwa[k] += pend.get(nama[r[0]], 0)
    pk = _pend(akar)
    out = []
    for g in gugus(akar, set(per_kab)):
        c = dari_kab(akar, g)
        mx = max(g, key=lambda k: (per_kab[k], kec_n[k], k))
        c.update(anggota=sorted(g), jenis="kec", jiwa=sum(jiwa[k] for k in g) or None, nama=f"Cuaca ekstrem, sekitar {_nama_kab(mx)}",
                 besaran={"nilai": per_kab[mx], "satuan": "tingkat", "ket": ("Awas" if per_kab[mx] == 3 else "Siaga") + f"; {sum(kec_n[k] for k in g)} kecamatan"})
        out.append(c)
    segar = selisih(hari, PU["dibuat"][:10]) <= 1   # peringatan.json basi: CAP-nya tidak dianggap aktif
    for n in PU.get("nowcast", []):
        if not segar or not n.get("aktif") or not n.get("polygon") or (n.get("selesai") or "9")[:10] < hari:
            continue
        ps = _poligon_cap(n["polygon"])
        pts = [c for p in ps for c in p[0]]
        la, lo = sum(c[1] for c in pts) / len(pts), sum(c[0] for c in pts) / len(pts)
        pv = set(n.get("prov") or []) or None
        ks = {k for k in (kab_di(akar, la, lo, pv), *(kab_di(akar, c[1], c[0], pv) for c in pts[:: max(1, len(pts) // 12)])) if k}
        out.append({"anggota": sorted(ks), "jenis": "cap:" + n["event"], "nama": f"{n['event']}, {(n.get('wilayah') or '')[:50]}".strip(", "), "prov": sorted({k[:2] for k in ks}), "kab": sorted(ks),
                    "pusat": [round(la, 3), round(lo, 3)], "poligon": [_ringkas(p) for p in ps if _ringkas(p)] or None, "jiwa": sum(pk.get(k, 0) for k in ks) or None,
                    "hingga": n.get("selesai"),
                    "besaran": {"nilai": n.get("severity"), "satuan": "CAP", "ket": f"{n.get('severity')} / {n.get('urgency')}"}})
    return out


ADAPTOR = {"cuaca": adaptor_cuaca, "udara": adaptor_udara, "gunungapi": adaptor_gunungapi, "kekeringan": adaptor_kekeringan}


def jalankan(id, hari, keluar=KELUAR, akar=AKAR):
    reg = baca(os.path.join(akar, "public/bencana.json"))
    awalan = next(b["kejadian"]["awalan"] for b in reg["bencana"] if b["id"] == id)
    calon = ADAPTOR[id](akar, hari)
    if calon is None:
        print(f"{id}: masukan basi/hilang untuk {hari}, tidak ada yang ditulis")
        return None
    return proses(id, awalan, calon, hari, MASA[id], keluar, JARAK_KM.get(id, 0))


# ---------------------------------------------------------------- uji luring
def _kotak(x, y, s=1.0):
    return [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]]


def uji():
    with tempfile.TemporaryDirectory() as t:
        # --- mesin
        C = lambda a, kab=None, **k: {"anggota": a, "jenis": "x", "nama": "n" + a[0], "prov": ["11"], "kab": kab or ["11|" + a[0]], "pusat": k.get("pusat", [0, 0]),
                                      "besaran": {"nilai": 1, "satuan": "u"}, "poligon": None}
        h = lambda n: (dt.date(2026, 10, 1) + dt.timedelta(days=n)).isoformat()
        r = proses("t", "T", [C(["a", "b"]), C(["c"])], h(0), 2, t)
        assert [x["kode"] for x in r] == ["T0001", "T0002"], r
        assert [x["kode"] for x in proses("t", "T", [C(["a", "b"]), C(["c"])], h(1), 2, t)] == ["T0001", "T0002"]   # data sama = kode sama
        r = proses("t", "T", [C(["a"]), C(["c"]), C(["z"])], h(2), 2, t)   # gugus a,b menyusut ke a: tetap T0001; z baru
        assert {x["nama"]: x["kode"] for x in r} == {"na": "T0001", "nc": "T0002", "nz": "T0003"}, r
        assert next(x for x in r if x["kode"] == "T0001")["mulai"] == h(0)   # mulai dibawa
        # kedaluwarsa tepat waktu (masa=2): c terakhir h(2)
        proses("t", "T", [C(["a"]), C(["z"])], h(3), 2, t)
        proses("t", "T", [C(["a"]), C(["z"])], h(4), 2, t)
        r = {x["kode"]: x for x in proses("t", "T", [C(["a"]), C(["z"])], h(4), 2, t)}   # h(4)-h(2)=2: masih terbit, tak aktif
        assert "T0002" in r and not r["T0002"]["aktif"], r.keys()
        r = {x["kode"]: x for x in proses("t", "T", [C(["a"]), C(["z"])], h(5), 2, t)}   # h(5)-h(2)=3 > masa: hilang
        assert "T0002" not in r, r.keys()
        r = {x["nama"]: x["kode"] for x in proses("t", "T", [C(["a"]), C(["z"]), C(["c"])], h(6), 2, t)}   # c muncul lagi = kejadian baru
        assert r["nc"] == "T0004" and r["na"] == "T0001", r
        s = json.load(open(os.path.join(t, "kejadian_t_awal.json")))
        assert list(s)[0] == "dibuat" and os.path.getsize(os.path.join(t, "kejadian_t_awal.json")) < 4000
        assert proses("h", "H", [{**C(["q"]), "hingga": "2026-10-01T09:00:00+07:00"}], h(0), 1, t)[0]["hingga"] == "2026-10-01T09:00:00+07:00"   # CAP: hingga ikut ke _awal
        # pencocokan ruang (cap): anggota beda, pusat dekat
        a = proses("u", "U", [C(["p"], pusat=[1, 1])], h(0), 1, t, 50)[0]["kode"]
        assert proses("u", "U", [C(["q"], pusat=[1.1, 1.1])], h(1), 1, t, 50)[0]["kode"] == a
        assert next(x for x in proses("u", "U", [C(["r"], pusat=[5, 5])], h(2), 1, t, 50) if x["aktif"])["kode"] != a
        try:
            proses("t", "T", [{**C(["a"]), "kab": []}], h(7), 2, t)
            raise SystemExit("calon tanpa kab harus ditolak")
        except ValueError:
            pass
        # --- adaptor dengan geo kecil: A,B bersebelahan, C jauh; D di provinsi lain menempel A
        ak = os.path.join(t, "akar")
        os.makedirs(os.path.join(ak, "public/geo/kabupaten"))
        os.makedirs(os.path.join(ak, "public/data"))
        os.makedirs(os.path.join(ak, "public/udara/data"))
        os.makedirs(os.path.join(ak, "public/banjir/data"))
        sh = lambda x, y, n: {"type": "Feature", "properties": {"kab": n}, "geometry": {"type": "Polygon", "coordinates": _kotak(x, y)}}
        json.dump({"type": "FeatureCollection", "features": [sh(100, 0, "A"), sh(101, 0, "B"), sh(105, 0, "C")]}, open(os.path.join(ak, "public/geo/kabupaten/11.json"), "w"))
        json.dump({"type": "FeatureCollection", "features": [sh(100, 1, "D")]}, open(os.path.join(ak, "public/geo/kabupaten/12.json"), "w"))
        kw = lambda lv, j: {"lv": lv, "total": 100, "jiwa": [j, j, j // 2]}
        json.dump({"kab": {"11|A": kw(3, 90), "11|B": kw(2, 50), "11|C": kw(2, 10), "12|D": kw(2, 7), "11|E": kw(1, 5)}}, open(os.path.join(ak, "public/data/kekeringan_wilayah.json"), "w"))
        K = adaptor_kekeringan(ak, h(0))
        assert sorted(len(c["anggota"]) for c in K) == [1, 1, 2], K   # A+B satu gugus; D lain provinsi terpisah; C sendiri
        ab = next(c for c in K if len(c["anggota"]) == 2)
        assert ab["jiwa"] == 140 and ab["besaran"]["nilai"] == 3 and ab["poligon"] and ab["prov"] == ["11"]
        json.dump({"dibuat": "2026-10-01T02:00:00+07:00", "gunung": [{"nama": "Api", "prov": "x", "level": 3, "lat": 0.5, "lon": 100.5}, {"nama": "Tenang", "prov": "x", "level": 1, "lat": 0.5, "lon": 105.5}]},
                  open(os.path.join(ak, "public/banjir/data/gunungapi_status.json"), "w"))
        G = adaptor_gunungapi(ak, h(0))
        assert len(G) == 1 and G[0]["kab"] == ["11|A"] and adaptor_gunungapi(ak, h(9)) is None   # level >= 2 saja; masukan basi = None
        pm = lambda v: {"kode": "1101", "nama": "Kab. A", "prov": "11", "lat": 0.5, "lon": 100.5, "pm": [v] * 72}
        json.dump({"hari": [h(0)], "kota": [pm(80), {**pm(90), "kode": "1102", "nama": "Kab. B"}, {**pm(20), "kode": "1103", "nama": "Kab. C"}]}, open(os.path.join(ak, "public/udara/data/prakiraan.json"), "w"))
        U = adaptor_udara(ak, h(0))
        assert len(U) == 1 and U[0]["anggota"] == ["11|A", "11|B"] and U[0]["besaran"]["nilai"] == 90, U
        # keluaran akhir lewat mesin: tiap kejadian punya prov/kab
        for c in K + G + U:
            assert c["prov"] and c["kab"]
    print("kejadian.py uji: OK")


def main():
    a = argparse.ArgumentParser()
    a.add_argument("id", nargs="*", default=list(ADAPTOR))
    a.add_argument("--hari", default=dt.datetime.now(WIB).date().isoformat())
    a.add_argument("--keluar", default=KELUAR)
    a = a.parse_args()
    for i in a.id:
        r = jalankan(i, a.hari, a.keluar)
        if r is not None:
            print(f"{i}: {len(r)} kejadian ({sum(x['aktif'] for x in r)} aktif)")
            for x in r[:2]:
                print("  ", json.dumps(x, ensure_ascii=False))


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
