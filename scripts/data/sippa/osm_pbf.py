#!/usr/bin/env python3
"""SIPPA SP-108/109/141: ubin OSM dari ekstrak Geofabrik (.osm.pbf) bila Overpass menolak koneksi. Python 3.12 stdlib (pembaca PBF sendiri: zlib + protobuf).

Pakai:
  python3 osm_pbf.py ekstrak 93 papua.osm.pbf           # ubin_<la>_<lo>.json yang BELUM ADA di data/raw/pipa/osm_93 (isi sama dengan kueri `penuh` osm_prov.py)
  python3 osm_pbf.py ekstrak 62 kalimantan.osm.pbf jalan  # jalan_<la>_<lo>.json (jalan + sungai/kanal, tag penuh) untuk graf akses prov 62
  python3 osm_pbf.py ekstrak 93 papua.osm.pbf timpa     # tulis ulang semua ubin
  python3 osm_pbf.py uji                                # self-check dengan PBF sintetis (tanpa jaringan)
Unduh: https://download.geofabrik.de/asia/indonesia/{papua,kalimantan}-latest.osm.pbf (curl; ODbL (c) kontributor OpenStreetMap).
Keluaran berformat Overpass JSON (`elements`: way {id,tags,geometry[{lat,lon}]}, relation {id,tags,members[{type,ref,role,geometry}]}) agar osm_prov.py dan
akses_sippa.py tidak berubah. Way masuk ubin bila ADA simpulnya di kotak ubin +- PAD (Overpass: way yang memotong kotak tanpa simpul di dalamnya ikut;
di sini tidak, selisih kecil). Relasi (multipoligon air) masuk ubin bila ada way anggotanya yang masuk. Simpul di luar ekstrak dilewati.
Tiga lintasan: relasi -> way -> simpul (hanya simpul yang dipakai way terpilih).
"""
import json, math, os, struct, sys, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import osm_prov as O  # noqa: E402

JALAN = set(O.JALAN_RE.split("|"))
AIR_PENUH = {"stream", "ditch", "drain", "canal", "river"}
AIR_JALAN = {"river", "canal"}


# ---------- protobuf ----------
def varint(b, i):
    r = s = 0
    while True:
        c = b[i]
        i += 1
        r |= (c & 127) << s
        if c < 128:
            return r, i
        s += 7


def medan(b):
    """pesan protobuf -> [(nomor, nilai)]; wiretype 0 = int, 2 = bytes, 1/5 = int tetap."""
    i, n, out = 0, len(b), []
    while i < n:
        k, i = varint(b, i)
        w = k & 7
        if w == 0:
            v, i = varint(b, i)
        elif w == 2:
            ln, i = varint(b, i)
            v, i = b[i:i + ln], i + ln
        elif w == 1:
            v, i = struct.unpack_from("<Q", b, i)[0], i + 8
        elif w == 5:
            v, i = struct.unpack_from("<I", b, i)[0], i + 4
        else:
            raise ValueError(f"wiretype {w}")
        out.append((k >> 3, v))
    return out


def paket(b):
    out, i, n = [], 0, len(b)
    while i < n:
        v, i = varint(b, i)
        out.append(v)
    return out


def zz(v):
    return (v >> 1) ^ -(v & 1)


def delta(vs):
    s, out = 0, []
    for v in vs:
        s += zz(v)
        out.append(s)
    return out


def blok(path):
    """-> iterator isi blob OSMData (bytes PrimitiveBlock)."""
    with open(path, "rb") as h:
        while True:
            t = h.read(4)
            if len(t) < 4:
                return
            hd = dict(medan(h.read(struct.unpack(">I", t)[0])))
            blob = dict(medan(h.read(hd[3])))
            if hd[1] != b"OSMData":
                continue
            yield zlib.decompress(blob[3]) if 3 in blob else blob[1]


def isi_blok(data):
    """PrimitiveBlock -> (tabel string, granularity, lat_offset, lon_offset, [grup])."""
    s, gr, lo_, lon_, grup = [], 100, 0, 0, []
    for f, v in medan(data):
        if f == 1:
            s = [x for ff, x in medan(v) if ff == 1]
        elif f == 2:
            grup.append(v)
        elif f == 17:
            gr = v
        elif f == 19:
            lo_ = v
        elif f == 20:
            lon_ = v
    return s, gr, lo_, lon_, grup


def tags(s, ks, vs):
    return {s[k].decode(): s[v].decode() for k, v in zip(ks, vs)}


def way_dari(s, f):
    w = {"id": 0, "k": [], "v": [], "r": []}
    for ff, v in f:
        if ff == 1:
            w["id"] = v
        elif ff == 2:
            w["k"] = paket(v)
        elif ff == 3:
            w["v"] = paket(v)
        elif ff == 8:
            w["r"] = delta(paket(v))
    return w["id"], tags(s, w["k"], w["v"]), w["r"]


def relasi_dari(s, f):
    r = {"id": 0, "k": [], "v": [], "role": [], "mem": [], "t": []}
    for ff, v in f:
        if ff == 1:
            r["id"] = v
        elif ff == 2:
            r["k"] = paket(v)
        elif ff == 3:
            r["v"] = paket(v)
        elif ff == 8:
            r["role"] = paket(v)
        elif ff == 9:
            r["mem"] = delta(paket(v))
        elif ff == 10:
            r["t"] = paket(v)
    return r["id"], tags(s, r["k"], r["v"]), [(m, s[ro].decode()) for m, ro, t in zip(r["mem"], r["role"], r["t"]) if t == 1]


def way_dipilih(t, mode):
    h, w = t.get("highway"), t.get("waterway")
    if mode == "jalan":
        return h in JALAN or w in AIR_JALAN
    return h in JALAN or w in AIR_PENUH or t.get("natural") in ("water", "coastline") or t.get("landuse") == "reservoir"


def air_relasi(t):
    return t.get("natural") == "water" or t.get("landuse") == "reservoir"


def baca(pbf, mode):
    """-> (way {id: (tags, [(lat, lon)])}, relasi [(id, tags, [(way_id, role)])]). mode: penuh | jalan (tanpa relasi)."""
    rel = []
    if mode != "jalan":                                    # lintasan 1: relasi air
        for d in blok(pbf):
            s, _, _, _, grup = isi_blok(d)
            for g in grup:
                for f, v in medan(g):
                    if f == 4:
                        i, t, m = relasi_dari(s, medan(v))
                        if air_relasi(t) and m:
                            rel.append((i, t, m))
    anggota = {w for _, _, m in rel for w, _ in m}
    way = {}                                               # lintasan 2: way terpilih (+ anggota relasi), simpan tag dan ref
    for d in blok(pbf):
        s, _, _, _, grup = isi_blok(d)
        for g in grup:
            for f, v in medan(g):
                if f == 3:
                    i, t, r = way_dari(s, medan(v))
                    if len(r) >= 2 and (way_dipilih(t, mode) or i in anggota):
                        way[i] = (t, r)
    perlu = {n for _, r in way.values() for n in r}
    xy = {}                                                # lintasan 3: simpul yang dipakai
    for d in blok(pbf):
        s, gr, lat0, lon0, grup = isi_blok(d)
        for g in grup:
            for f, v in medan(g):
                if f == 2:
                    dn = dict(medan(v))
                    ids, la, lo = delta(paket(dn.get(1, b""))), delta(paket(dn.get(8, b""))), delta(paket(dn.get(9, b"")))
                    for i, a, b in zip(ids, la, lo):
                        if i in perlu:
                            xy[i] = (1e-9 * (lat0 + gr * a), 1e-9 * (lon0 + gr * b))
                elif f == 1:
                    n = dict(medan(v))
                    i = zz(n.get(1, 0))
                    if i in perlu:
                        xy[i] = (1e-9 * (lat0 + gr * zz(n.get(8, 0))), 1e-9 * (lon0 + gr * zz(n.get(9, 0))))
    hasil = {}
    for i, (t, r) in way.items():
        g = [xy[n] for n in r if n in xy]
        if len(g) >= 2:
            hasil[i] = (t, g)
    return hasil, [(i, t, [(w, ro) for w, ro in m if w in hasil]) for i, t, m in rel]


def di_kotak(g, k):
    return any(k[0] <= la <= k[2] and k[1] <= lo <= k[3] for la, lo in g)


def ke_geom(g):
    return [{"lat": round(la, 7), "lon": round(lo, 7)} for la, lo in g]


def ubin_elemen(way, rel, tile, mode):
    """elemen Overpass untuk satu ubin (la, lo)."""
    k = (tile[0] * O.UBIN - O.PAD, tile[1] * O.UBIN - O.PAD, tile[0] * O.UBIN + O.UBIN + O.PAD, tile[1] * O.UBIN + O.UBIN + O.PAD)
    el, dalam = [], set()
    for i, (t, g) in way.items():
        if di_kotak(g, k):
            dalam.add(i)
            if way_dipilih(t, mode):
                el.append({"type": "way", "id": i, "tags": t, "geometry": ke_geom(g)})
    for i, t, m in rel:
        if any(w in dalam for w, _ in m):
            el.append({"type": "relation", "id": i, "tags": t,
                       "members": [{"type": "way", "ref": w, "role": ro, "geometry": ke_geom(way[w][1])} for w, ro in m]})
    return el


def ekstrak(prov, pbf, mode="penuh", timpa=False):
    ub = O.ubin_prov(O.kompleks(prov))
    d = os.path.join(O.RAW, f"osm_{prov}")
    os.makedirs(d, exist_ok=True)
    awalan = "jalan" if mode == "jalan" else "ubin"
    perlu = [t for t in ub if timpa or not os.path.exists(os.path.join(d, f"{awalan}_{t[0]}_{t[1]}.json"))]
    print(prov, mode, len(ub), "ubin,", len(perlu), "ditulis", flush=True)
    if not perlu:
        return
    way, rel = baca(pbf, mode)
    print(len(way), "way,", len(rel), "relasi air dari", os.path.basename(pbf), flush=True)
    for t in perlu:
        el = ubin_elemen(way, rel, t, mode)
        fn = os.path.join(d, f"{awalan}_{t[0]}_{t[1]}.json")
        with open(fn + ".tmp", "w") as h:
            json.dump({"version": 0.6, "generator": f"osm_pbf.py ({os.path.basename(pbf)})", "osm3s": {"copyright": "OpenStreetMap contributors, ODbL"},
                       "elements": el}, h, separators=(",", ":"))
        os.replace(fn + ".tmp", fn)
        print(prov, t, len(el), "elemen", flush=True)


# ---------- uji ----------
def _v(n):
    out = bytearray()
    while True:
        b = n & 127
        n >>= 7
        out.append(b | (128 if n else 0))
        if not n:
            return bytes(out)


def _zz(n):
    return (n << 1) ^ (n >> 63)


def _f(num, val):
    if isinstance(val, int):
        return _v(num << 3) + _v(val)
    return _v(num << 3 | 2) + _v(len(val)) + val


def _pak(vals):
    return b"".join(_v(x) for x in vals)


def _dl(vals):
    p, out = 0, []
    for x in vals:
        out.append(_zz(x - p))
        p = x
    return out


def _pbf(path):
    st = [b"", b"highway", b"track", b"tracktype", b"grade3", b"natural", b"water", b"building", b"yes", b"outer"]
    stab = b"".join(_f(1, x) for x in st)
    # simpul 1..4 (derajat x 1e7; granularity 100 => satuan 1e-7 derajat): (lat, lon)
    pts = {1: (-80000000, 1400000000), 2: (-80000000, 1400100000), 3: (-80001000, 1400100000), 4: (-80001000, 1400000000)}
    ids = sorted(pts)
    dense = _f(1, _pak(_dl(ids))) + _f(8, _pak(_dl([pts[i][0] for i in ids]))) + _f(9, _pak(_dl([pts[i][1] for i in ids])))
    simpul = _f(1, stab) + _f(2, _f(2, dense)) + _f(17, 100)
    way1 = _f(1, 10) + _f(2, _pak([1, 3])) + _f(3, _pak([2, 4])) + _f(8, _pak(_dl([1, 2, 3])))
    way2 = _f(1, 11) + _f(2, _pak([7])) + _f(3, _pak([8])) + _f(8, _pak(_dl([1, 2])))        # building=yes: dibuang
    way3 = _f(1, 12) + _f(2, _pak([5])) + _f(3, _pak([6])) + _f(8, _pak(_dl([2, 3, 4, 2])))   # natural=water (way)
    ways = _f(1, stab) + _f(2, _f(3, way1) + _f(3, way2) + _f(3, way3)) + _f(17, 100)
    rel = _f(1, 20) + _f(2, _pak([5])) + _f(3, _pak([6])) + _f(8, _pak([9])) + _f(9, _pak(_dl([12]))) + _f(10, _pak([1]))
    rels = _f(1, stab) + _f(2, _f(4, rel)) + _f(17, 100)
    with open(path, "wb") as h:
        for blob in (simpul, ways, rels):
            z = zlib.compress(blob)
            bl = _f(2, len(blob)) + _f(3, z)
            hd = _f(1, b"OSMData") + _f(3, len(bl))
            h.write(struct.pack(">I", len(hd)) + hd + bl)


def uji():
    import tempfile
    assert zz(_zz(-5)) == -5 and zz(_zz(7)) == 7 and varint(_v(300), 0) == (300, 2)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "t.pbf")
        _pbf(p)
        way, rel = baca(p, "penuh")
        assert set(way) == {10, 12}, set(way)                                   # building dibuang, track dan water ikut
        assert way[10][0] == {"highway": "track", "tracktype": "grade3"} and len(way[10][1]) == 3
        assert abs(way[10][1][0][0] - (-8.0)) < 1e-6 and abs(way[10][1][0][1] - 140.0) < 1e-6 and abs(way[10][1][1][1] - 140.01) < 1e-6
        assert len(rel) == 1 and rel[0][1] == {"natural": "water"} and rel[0][2] == [(12, "outer")]
        w2, r2 = baca(p, "jalan")
        assert set(w2) == {10} and r2 == []
        # ubin (-17, 280): kotak lat -8.65..-8.0+..., cukup memuat titik (-8.0, 140.0)? la*0.5 = -8.5 .. -8.0 (+-0.15)
        el = ubin_elemen(way, rel, (-17, 280), "penuh")
        assert {e["type"] for e in el} == {"way", "relation"} and sum(e["type"] == "way" for e in el) == 2, el
        assert ubin_elemen(way, rel, (0, 0), "penuh") == []
        # klasifikasi hilir: moda ruas dari tag yang dibawa PBF
        assert O.M.moda_ruas(el[0]["tags"]) == "motor"
        assert O.garis_elemen(el[-1])[0][3] and O.klasifikasi(el[-1]["tags"], True)[0][0] == "air_semua"
    print("uji osm_pbf: lolos")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["ekstrak"] and len(a) >= 3:
        ekstrak(a[1], a[2], "jalan" if "jalan" in a[3:] else "penuh", "timpa" in a[3:])
    else:
        sys.exit(__doc__)
