"""Sumber hidup -> rekaman pasang.py (ALGORITMA F1.1 sampai F1.4, mode `masuk`). Fungsi murni; jaringan hanya di CLI pasang.py.

Nama sumber di sk_kejadian_sumber (dipakai sama oleh kaji_gempa.py dan kaji_banjir.py `rencana`, tidak ada tebakan):
  usgs      kode = id USGS (USGS FDSN mentah dari adapter_g2, dan G-kejadian BMKG `/api/gempa/kejadian` yang `utama_id`-nya `u:<id>`)
  bmkg      kode = utama_id `b:...` (gempa tanpa padanan USGS); sengaja bukan `usgs`
  banjir    kode = B00xx (kejadian_aktif_awal.json)
  gunungapi kode = V00xx; cuaca dan jenis lain: public/banjir/data/kejadian_<id>_awal.json, sumber = <id>, hanya bila jenisnya dikenal kunci_kejadian
  karhutla  kode = sel:<i>:<j> (sel 0,02 derajat dari pusat kluster); K#### tidak dipakai
Wilayah: kab4 Kemendagri lewat kunci.kab4 (nama + provinsi). Titik gempa memakai `cari(lon, lat)` -> (prov, kab, kec) | None; di laut = tanpa wilayah (ditulis, tidak dipasang).
Dampak dibiarkan kosong: tidak ada angka dampak di sumber ini (kosong, bukan nol). Tanggal gempa = hari WIB.
Pakai: python3 -I scripts/siklus/hidup.py uji
"""
import datetime as dt, glob, importlib.util, json, os, re, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))


def _muat(nama):
    s = importlib.util.spec_from_file_location("sk_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


P = _muat("pasang")
KN = P.KN
JENIS_DIKENAL = {j for peta in KN._KK.JENIS.values() for v in peta.values() for j in v}


def _rek(sumber, kode, jenis, kab, tgl, akhir=None):
    return {"sumber": sumber, "kode": str(kode), "jenis": tuple(jenis), "kab": sorted(set(kab)), "tgl": tgl, "nilai": {}, "akhir": akhir}


def kab_kunci(daftar):
    """['11|Aceh Jaya|Panga', '11|Aceh Jaya'] -> ['1114'] (kab4 Kemendagri); yang tak terpetakan hilang (kab kosong = tanpa wilayah)."""
    return sorted({k for k in (KN.kab4("|".join(str(x).split("|")[:2])) for x in daftar or []) if k})


def banjir(awal):
    return [_rek("banjir", e["kode"], ("banjir",), kab_kunci(e.get("kec")), e["sejak"]) for e in awal.get("kejadian", []) if e.get("kode") and e.get("sejak")]


def jenis_lain(id_, awal):
    """kejadian_<id>_awal.json bentuk gunungapi: aktif, mulai, kab ['18|Lampung Selatan']. id di luar kunci jenis dikenal -> [] (dilewati)."""
    if id_ not in JENIS_DIKENAL:
        return []
    return [_rek(id_, e["kode"], (id_,), kab_kunci(e.get("kab") or e.get("kec")), e.get("mulai") or e.get("sejak"))
            for e in awal.get("kejadian", []) if e.get("kode") and (e.get("mulai") or e.get("sejak")) and e.get("aktif", True)]


def karhutla(fc):
    """kluster_awal.json (FeatureCollection titik): kluster aktif 24 jam (n24 > 0). Satu sel + kab = satu kode lintas hari (UJ-F1-05)."""
    out = []
    for f in fc.get("features", []):
        p = f.get("properties") or {}
        if not p.get("n24") or p.get("lat") is None or p.get("lon") is None or not p.get("awal"):
            continue
        k = KN.kab4(p.get("kab"), p.get("prov")) if p.get("kab") else None
        out.append(_rek("karhutla", P.kode_sel(p["lat"], p["lon"]), ("karhutla",), [k] if k else [], p["awal"][:10]))
    return out


def _hari_wib(ms):
    return (dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc) + dt.timedelta(hours=7)).date().isoformat()


def _kab_titik(cari, lat, lon):
    r = cari(lon, lat) if isinstance(lat, (int, float)) and isinstance(lon, (int, float)) else None
    k = KN.kab4(r[1], r[0]) if r else None
    return [k] if k else []


def gempa_usgs(daftar, cari):
    """entri adapter_g2 {id, waktu ms, lat, lon}; tanpa waktu = dilewati (tanggal tidak ditebak)."""
    return [_rek("usgs", g["id"], ("gempa",), _kab_titik(cari, g.get("lat"), g.get("lon")), _hari_wib(g["waktu"]))
            for g in daftar if g.get("id") and isinstance(g.get("waktu"), (int, float))]


def gempa_bmkg(kejadian, cari):
    """kejadian dari /api/gempa/kejadian {utama_id, lat, lon, mulai ISO}: utama_id `u:<id>` -> usgs, `b:...` -> bmkg, selain itu dilewati."""
    out = []
    for k in kejadian:
        uid, m = str(k.get("utama_id") or ""), str(k.get("mulai") or "")
        if not (re.match(r"^[ub]:.+", uid) and m):
            continue
        ms = dt.datetime.fromisoformat(m.replace("Z", "+00:00")).timestamp() * 1000
        out.append(_rek("usgs" if uid[0] == "u" else "bmkg", uid[2:] if uid[0] == "u" else uid, ("gempa",), _kab_titik(cari, k.get("lat"), k.get("lon")), _hari_wib(ms)))
    return out


def mentah_usgs(mentah):
    """berkas mentah adapter_g2 terbaru: <mentah>/usgs-shakemap/<YYYY>/<tanggal>.json -> daftar gempa ([] bila belum ada)."""
    f = sorted(glob.glob(os.path.join(mentah, "usgs-shakemap", "*", "*.json")))
    return json.load(open(f[-1], encoding="utf-8")).get("gempa", []) if f else []


def kumpulkan(akar=AKAR, mentah=None, bmkg=None, cari=None, batas_awal="0000-00-00"):
    """-> (rekaman terurut, ringkas {sumber: n}, kedaluwarsa n). bmkg = daftar kejadian atau None (gagal ambil = dilewati, bukan nol).
    cari dibuat malas hanya bila ada gempa. Rekaman bertanggal < batas_awal dibuang dan dihitung."""
    baca = lambda r: json.load(open(os.path.join(akar, r), encoding="utf-8"))
    ada = lambda r: os.path.exists(os.path.join(akar, r))
    rek = []
    if ada("public/banjir/data/kejadian_aktif_awal.json"):
        rek += banjir(baca("public/banjir/data/kejadian_aktif_awal.json"))
    for f in sorted(glob.glob(os.path.join(akar, "public/banjir/data/kejadian_*_awal.json"))):
        i = re.match(r"kejadian_(.+)_awal\.json$", os.path.basename(f)).group(1)
        if i != "aktif":
            rek += jenis_lain(i, json.load(open(f, encoding="utf-8")))
    if ada("public/data/kluster_awal.json"):
        rek += karhutla(baca("public/data/kluster_awal.json"))
    usgs = mentah_usgs(mentah) if mentah else []
    if usgs or bmkg:
        if cari is None:
            cari = _wilayah().cari
        rek += gempa_usgs(usgs, cari) + gempa_bmkg(bmkg or [], cari)
    lama = sum(1 for r in rek if r["tgl"] < batas_awal)
    rek = sorted((r for r in rek if r["tgl"] >= batas_awal), key=lambda r: (r["sumber"], r["tgl"], r["kode"]))
    n = {}
    for r in rek:
        n[r["sumber"]] = n.get(r["sumber"], 0) + 1
    return rek, n, lama


def _wilayah():
    s = importlib.util.spec_from_file_location("sk_wilayah", os.path.join(AKAR, "scripts/data/wilayah.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m.Wilayah()


def _uji():
    import tempfile
    cari = lambda lon, lat: ("33", "Cilacap", "Cilacap Utara") if lon > 100 else None     # lon <= 100 = laut
    # banjir: kec berkunci penuh -> kab4; kab tak terpetakan = kosong (tanpa wilayah), bukan dibuang
    b = banjir({"kejadian": [{"kode": "B0007", "sejak": "2026-10-18", "kec": ["33|Cilacap|Kroya", "33|Cilacap|Adipala"]}, {"kode": "B0008", "sejak": "2026-10-18", "kec": ["99|Atlantis|X"]}, {"kode": "B9", "kec": []}]})
    assert [(r["sumber"], r["kode"], r["kab"], r["tgl"]) for r in b] == [("banjir", "B0007", ["3301"], "2026-10-18"), ("banjir", "B0008", [], "2026-10-18")], b
    # jenis lain: gunungapi dikenal, id tak dikenal dilewati, tak aktif dilewati
    v = {"kejadian": [{"kode": "V0001", "kab": ["33|Cilacap"], "mulai": "2026-10-19", "aktif": True}, {"kode": "V0002", "kab": ["33|Cilacap"], "mulai": "2026-10-19", "aktif": False}]}
    assert [(r["sumber"], r["kode"], r["jenis"]) for r in jenis_lain("gunungapi", v)] == [("gunungapi", "V0001", ("gunungapi",))] and jenis_lain("planet", v) == []
    # karhutla: sel, bukan K####; dua hari kluster sama sel -> kode sama; n24 = 0 dilewati
    fc = lambda i, n24: {"features": [{"properties": {"id": i, "lat": -2.505, "lon": 114.003, "n24": n24, "prov": "62", "kab": "Kotawaringin Timur", "awal": "2026-11-08T01:00:00+00:00"}}]}
    k1, k2 = karhutla(fc("K0003", 5)), karhutla(fc("K0011", 7))
    assert k1[0]["kode"] == "sel:-126:5700" == k2[0]["kode"] and k1[0]["kab"] and karhutla(fc("K1", 0)) == []
    # gempa: tgl WIB (23:30 UTC = hari berikutnya), laut = tanpa wilayah, bmkg u: -> usgs, b: -> bmkg, tanpa waktu dilewati
    ms = int(dt.datetime(2026, 11, 9, 23, 30, tzinfo=dt.timezone.utc).timestamp() * 1000)
    g = gempa_usgs([{"id": "us1", "waktu": ms, "lat": -7.7, "lon": 109.0}, {"id": "us2", "waktu": ms, "lat": -9.0, "lon": 90.0}, {"id": "us3"}], cari)
    assert [(r["kode"], r["tgl"], r["kab"]) for r in g] == [("us1", "2026-11-10", ["3301"]), ("us2", "2026-11-10", [])]
    bm = gempa_bmkg([{"utama_id": "u:us1", "lat": -7.7, "lon": 109.0, "mulai": "2026-11-09T23:30:00.000Z"}, {"utama_id": "b:2026|x", "lat": -7.7, "lon": 109.0, "mulai": "2026-11-09T23:30:00.000Z"},
                     {"utama_id": "zzz", "mulai": "2026-11-09T23:30:00.000Z"}], cari)
    assert [(r["sumber"], r["kode"]) for r in bm] == [("usgs", "us1"), ("bmkg", "b:2026|x")]
    # kumpulkan dari akar sementara; kedaluwarsa dihitung, gempa dari mentah + bmkg dedupe nanti oleh pasang (sudah_ada)
    with tempfile.TemporaryDirectory() as t:
        os.makedirs(os.path.join(t, "public/banjir/data"))
        os.makedirs(os.path.join(t, "public/data"))
        os.makedirs(os.path.join(t, "mentah/usgs-shakemap/2026"))
        json.dump({"kejadian": [{"kode": "B1", "sejak": "2026-11-09", "kec": ["33|Cilacap|Kroya"]}, {"kode": "B2", "sejak": "2026-01-01", "kec": ["33|Cilacap|Kroya"]}]}, open(os.path.join(t, "public/banjir/data/kejadian_aktif_awal.json"), "w"))
        json.dump({"kejadian": [{"kode": "V1", "kab": ["33|Cilacap"], "mulai": "2026-11-08"}]}, open(os.path.join(t, "public/banjir/data/kejadian_gunungapi_awal.json"), "w"))
        json.dump({"gempa": [{"id": "us1", "waktu": ms, "lat": -7.7, "lon": 109.0}]}, open(os.path.join(t, "mentah/usgs-shakemap/2026/2026-11-10.json"), "w"))
        rek, n, lama = kumpulkan(t, os.path.join(t, "mentah"), [{"utama_id": "u:us1", "lat": -7.7, "lon": 109.0, "mulai": "2026-11-09T23:30:00.000Z"}], cari, "2026-10-01")
        assert n == {"banjir": 1, "gunungapi": 1, "usgs": 2} and lama == 1, (n, lama)
        assert kumpulkan(t, None, None, cari, "2026-10-01")[1] == {"banjir": 1, "gunungapi": 1}, "tanpa gempa: cari tidak dibuat"
    print("hidup: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        _uji()
    else:
        sys.exit("pakai: hidup.py uji (dipakai lewat pasang.py masuk --hidup)")
