"""KS-3 Kesenjangan lokasi evakuasi (DESAIN-TEKNIS sec 6.9; ALGORITMA sec 10.12; tiket RU-091).

Langkah jalan.py (bulanan). Kandidat = titik OSM titik_kumpul, sekolah, pemerintahan per provinsi (public/data/osm_nasional/<prov>.json, [lat, lon, nama]);
`ibadah_n` hanya jumlah, bukan titik, jadi rumah ibadah tidak ikut. Kandidat TIDAK PERNAH disebut lokasi evakuasi resmi (label wajib "bukan lokasi evakuasi resmi").
Desa `kurang` = desa terpapar tinggi (indeks bahaya > ambang tinggi terpapar.json) yang kandidat terdekatnya lebih jauh dari jarak bahaya (kunci Jam Aturan evakuasi_jarak_km:
tsunami 1 km, banjir 2 km, erupsi 2 km; ASUMSI, belum dicek ke pedoman). Bahaya tanpa jarak di kunci itu (longsor, gempa, karhutla) tidak dinilai dan ditulis begitu.
PERKIRAAN dengan DUA BIAS BERLAWANAN: kandidat belum diperiksa berada di luar zona bahaya (butuh indeks InaRISK per titik kandidat, belum ada), sehingga desa `kurang` bisa
terlalu sedikit; OSM belum lengkap, sehingga desa `kurang` bisa terlalu banyak. Desa di provinsi OSM tipis (kandidat per 10.000 penduduk di bawah median nasional, ASUMSI) ditandai.
Yang dinilai hanya bahaya berjarak yang ada lapisannya: banjir. Tsunami dan erupsi belum ada lapisannya di terpapar.py. Desa tanpa penduduk, indeks, atau koordinat dikeluarkan dan dihitung terpisah (bukan nol).

MASUKAN yang ada hari ini: osm_nasional (kandidat, dipakai untuk cakupan OSM per provinsi) dan terpapar.json (penduduk per kab). Per desa (data/raw/unit/desa_terpapar.json, format di pd2.py)
belum ada: bagian desa `kurang` tertulis "belum ada data". Cakupan OSM per provinsi = kandidat per 10.000 penduduk, supaya provinsi dengan OSM tipis terbaca.

  python3 -I scripts/bnpb/unit/ks3.py --cek
"""
import json
import math
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import pd2  # noqa: E402
import rapor  # noqa: E402

AKAR, DATA, OSM = pd2.AKAR, pd2.DATA, pd2.OSM
KUNCI_KANDIDAT = ("titik_kumpul", "sekolah", "pemerintahan")
LABEL_WAJIB = "bukan lokasi evakuasi resmi"
SEL = 0.05          # derajat, sel indeks kandidat (sekitar 5,5 km)
CARI_SEL = 6        # cincin sel terjauh yang dicari; di luar itu jarak ditulis "lebih dari 30 km"
SITUS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jdih_situs.json")


def muat_kandidat(folder=OSM):
    """{prov: [(lat, lon)]} dari tiga kunci titik; provinsi tanpa kunci apa pun tidak muncul."""
    out = {}
    for n in sorted(os.listdir(folder)):
        if not re.fullmatch(r"\d{2}\.json", n):
            continue
        d = pd2._baca(os.path.join(folder, n))
        ada = [k for k in KUNCI_KANDIDAT if isinstance(d.get(k), list)]
        if ada:
            out[n[:2]] = [(float(t[0]), float(t[1])) for k in ada for t in d[k]]
    return out


def indeks(titik):
    g = {}
    for t in titik:
        g.setdefault((math.floor(t[0] / SEL), math.floor(t[1] / SEL)), []).append(t)
    return g


def terdekat(lat, lon, g):
    """Jarak km ke kandidat terdekat dalam CARI_SEL cincin sel; None bila tak ada (lebih jauh dari sekitar 30 km)."""
    ci, cj = math.floor(lat / SEL), math.floor(lon / SEL)
    terbaik = None
    for r in range(CARI_SEL + 1):
        for i in range(ci - r, ci + r + 1):
            for j in range(cj - r, cj + r + 1):
                if max(abs(i - ci), abs(j - cj)) != r:
                    continue
                for t in g.get((i, j), ()):
                    d = pd2.jarak_km(lat, lon, t[0], t[1])
                    if terbaik is None or d < terbaik:
                        terbaik = d
        if terbaik is not None and terbaik <= r * SEL * 111 * 0.98:   # cincin berikutnya (r + 1) paling dekat r sel dari titik; r = 0 selalu lanjut ke cincin 1 (tetangga sel bisa lebih dekat)
            return terbaik
    return terbaik


def hitung(desa, kandidat, jarak, ambang, tipis=frozenset()):
    """-> ({kab: {bahaya: {tinggi, kurang, penduduk_kurang, tanpa_data}}}, [daftar desa kurang]); bahaya tanpa jarak di `jarak` dilewati."""
    g = {p: indeks(t) for p, t in kandidat.items()}
    out, daftar = {}, []
    for x in desa:
        prov = x["kab"][:2]
        for b, v in x["indeks"].items():
            d_max = jarak.get(b)
            if d_max is None:
                continue
            e = out.setdefault(x["kab"], {}).setdefault(b, {"tinggi": 0, "kurang": 0, "kurang_tipis": 0, "penduduk_kurang": 0, "tanpa_data": 0})
            pend, lat, lon = x.get("penduduk"), x.get("lat"), x.get("lon")
            nyata = lambda q: isinstance(q, (int, float)) and not isinstance(q, bool) and math.isfinite(q)  # noqa: E731
            if not (nyata(v) and nyata(pend) and nyata(lat) and nyata(lon)) or prov not in g:
                e["tanpa_data"] += 1   # indeks, penduduk, koordinat, atau OSM provinsi kosong: tidak dinilai, bukan "cukup"
                continue
            if v <= ambang:
                continue
            e["tinggi"] += 1
            dekat = terdekat(lat, lon, g[prov])
            if dekat is None or dekat > d_max:
                e["kurang"] += 1
                e["kurang_tipis"] += prov in tipis
                e["penduduk_kurang"] += pend
                daftar.append({"desa": x.get("kode"), "nama": x.get("nama"), "kab": x["kab"], "bahaya": b, "penduduk": pend, "jarak_km": None if dekat is None else round(dekat, 2), "osm_tipis": prov in tipis})
    return out, daftar


def cakupan_provinsi(kandidat, terpapar_kab, nama):
    """Kandidat per 10.000 penduduk per provinsi; provinsi tanpa kunci OSM atau tanpa penduduk = None."""
    pend = {}
    for k, v in terpapar_kab.items():
        if isinstance(v.get("n"), (int, float)):
            pend[k[:2]] = pend.get(k[:2], 0) + v["n"]
    out = []
    for p in sorted(set(pend) | set(kandidat)):
        n_k = len(kandidat[p]) if p in kandidat else None
        out.append({"prov": p, "nama": nama.get(p, p), "kandidat": n_k, "penduduk": pend.get(p),
                    "per_10rb": None if not n_k and n_k != 0 or not pend.get(p) else n_k / pend[p] * 10000})
    return out


def _nama_prov():
    return {s["kode"]: s["nama"] for s in pd2._baca(SITUS)}


def provinsi_tipis(cov):
    """Provinsi ber-OSM tipis: kandidat per 10.000 penduduk di bawah median nasional (ASUMSI, belum disetel direktorat). -> (set kode, median|None)"""
    v = [c["per_10rb"] for c in cov if c["per_10rb"] is not None]
    if not v:
        return frozenset(), None
    med = statistics.median(v)
    return frozenset(c["prov"] for c in cov if c["per_10rb"] is not None and c["per_10rb"] < med), med


def bangun(desa_doc, kandidat, terpapar, nama, hari):
    jarak = jam.nilai("evakuasi_jarak_km")
    ambang = terpapar["ambang"]["tinggi"]
    cov = cakupan_provinsi(kandidat, terpapar["kab"], nama)
    tipis, med = provinsi_tipis(cov)
    hasil, daftar = hitung(desa_doc["desa"], kandidat, jarak, ambang, tipis) if desa_doc else ({}, [])
    kartu = [rapor.kartu(id="ks3-masukan", sistem="KS-3", pil="Lokasi evakuasi", ikon="data", judul="Keadaan masukan kesenjangan",
                         angka=[], kolom=[{"k": "masukan", "label": "Masukan"}, {"k": "keadaan", "label": "Keadaan"}],
                         baris=[{"masukan": "Penduduk dan indeks bahaya per desa", "keadaan": f"{len(desa_doc['desa'])} desa terbaca" if desa_doc else "belum ada data: data per desa belum tersedia"},
                                {"masukan": "Kandidat bangunan di OpenStreetMap (OSM): titik kumpul, sekolah, kantor pemerintahan", "keadaan": f"{sum(len(v) for v in kandidat.values())} titik di {len(kandidat)} provinsi"},
                                {"masukan": "Kandidat di luar zona bahaya", "keadaan": "belum diperiksa: butuh indeks bahaya per titik kandidat; hasilnya perkiraan dengan dua bias berlawanan (kandidat belum diperiksa di luar zona membuat desa kurang terlalu sedikit, OSM belum lengkap membuatnya terlalu banyak)"},
                                {"masukan": "Bahaya yang dinilai", "keadaan": "dinilai: banjir saja; tsunami dan erupsi belum ada lapisannya"}],
                         rumus=None, sumber=["OpenStreetMap (OSM)", "Keterpaparan penduduk"], label=["sekunder"])]
    kartu.append(rapor.kartu(
        id="ks3-osm", sistem="KS-3", pil="Lokasi evakuasi", ikon="peta", judul="Cakupan OSM per provinsi",
        angka=[{"k": "provinsi", "label": "Provinsi dengan titik kandidat", "nilai": sum(1 for c in cov if c["kandidat"] is not None)},
               {"k": "tanpa", "label": "Provinsi tanpa data kandidat OSM", "nilai": sum(1 for c in cov if c["kandidat"] is None)}],
        kolom=[{"k": "prov", "label": "Provinsi"}, {"k": "kandidat", "label": "Titik kandidat", "angka": True, "title": "titik kumpul, sekolah, kantor pemerintahan di OSM; " + LABEL_WAJIB},
               {"k": "penduduk", "label": "Penduduk", "angka": True, "title": "jumlah penduduk kab/kota di provinsi itu (terpapar.json, data administrasi kependudukan)"},
               {"k": "per10rb", "label": "Per 10.000 penduduk", "angka": True, "desimal": 2, "title": "kosong bila provinsi tanpa kunci OSM atau tanpa penduduk"}],
        baris=[{"prov": c["nama"], "kandidat": c["kandidat"], "penduduk": c["penduduk"], "per10rb": c["per_10rb"]} for c in cov],
        rumus="titik kandidat per 10.000 penduduk = jumlah titik OSM provinsi / penduduk provinsi x 10.000; " + LABEL_WAJIB, sumber=["OpenStreetMap (OSM)", "Keterpaparan penduduk"], label=["proksi", "hitungan_kita"], aturan=["evakuasi_jarak_km"]))
    if desa_doc:
        tot = {}
        for kb in hasil.values():
            for bhy, e in kb.items():
                t = tot.setdefault(bhy, {"tinggi": 0, "kurang": 0, "kurang_tipis": 0, "penduduk_kurang": 0, "tanpa_data": 0})
                for k in t:
                    t[k] += e[k]
        kartu.append(rapor.kartu(
            id="ks3-desa", sistem="KS-3", pil="Lokasi evakuasi", ikon="peta", judul=("Desa tanpa kandidat dalam jarak, " + ", ".join(sorted(tot)))[:60],
            angka=[{"k": "kurang", "label": "Desa terpapar tinggi tanpa kandidat dalam jarak (perkiraan)", "nilai": sum(t["kurang"] for t in tot.values()),
                    "title": "perkiraan dengan dua bias berlawanan: kandidat belum diperiksa di luar zona (terlalu sedikit), OSM belum lengkap (terlalu banyak)"},
                   {"k": "tipis", "label": "Di antaranya di provinsi OSM tipis", "nilai": sum(t["kurang_tipis"] for t in tot.values()),
                    "title": "provinsi dengan kandidat per 10.000 penduduk di bawah median nasional (asumsi): OSM tipis membuat desa kurang cenderung terlalu banyak"}],
            kolom=[{"k": "bahaya", "label": "Bahaya"}, {"k": "jarak", "label": "Jarak bahaya, km", "angka": True}, {"k": "tinggi", "label": "Desa terpapar tinggi", "angka": True},
                   {"k": "kurang", "label": "Desa kurang", "angka": True, "title": "kandidat terdekat lebih jauh dari jarak bahaya; perkiraan dengan dua bias berlawanan"},
                   {"k": "tipis", "label": "Di provinsi OSM tipis", "angka": True, "title": "kurang_tipis: provinsi di bawah median nasional kandidat per 10.000 penduduk (asumsi)"},
                   {"k": "tanpa", "label": "Desa tanpa data", "angka": True, "title": "indeks, penduduk, koordinat, atau OSM provinsi kosong; tidak dinilai"}],
            baris=[{"bahaya": bhy, "jarak": jarak[bhy], "tinggi": t["tinggi"], "kurang": t["kurang"], "tipis": t["kurang_tipis"], "tanpa": t["tanpa_data"]} for bhy, t in sorted(tot.items())],
            rumus="desa kurang = desa dengan indeks bahaya > ambang tinggi dan jarak ke kandidat terdekat > jarak bahaya; " + LABEL_WAJIB, sumber=["Keterpaparan penduduk", "OpenStreetMap (OSM)"],
            label=["proksi", "hitungan_kita"], aturan=["evakuasi_jarak_km"], asumsi=["Asumsi: OSM tipis di bawah median nasional"]))
    sumber = [{"nama": "OpenStreetMap (osm_nasional)", "url": "repo:public/data/osm_nasional/", "diambil": hari, "lisensi": "ODbL, OpenStreetMap contributors"},
              {"nama": "terpapar.json", "url": "repo:public/data/bnpb/terpapar.json", "diambil": terpapar["dibuat"][:10], "lisensi": str(terpapar.get("lisensi", "tidak tertulis"))[:200]}]
    b = rapor.berkas(kartu, sumber)
    b["data"] = {"jarak_km": jarak, "jarak_asumsi": True, "label_wajib": LABEL_WAJIB, "bias": "perkiraan; dua bias berlawanan (kandidat belum diperiksa di luar zona, OSM belum lengkap)", "median_per_10rb": med, "osm_tipis_asumsi": True, "dinilai": ["banjir"], "desa_ada": bool(desa_doc), "provinsi": cov,
                 "kab": hasil, "desa_kurang": sorted(daftar, key=lambda x: (-x["penduduk"], str(x["desa"])))[:200]}
    return b


def jalan():
    from datetime import datetime, timedelta, timezone
    hari = (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()
    return {"evakuasi": bangun(pd2.muat_desa(), muat_kandidat(), pd2._baca(os.path.join(DATA, "terpapar.json")), _nama_prov(), hari)}


def cek():
    kand = {"31": [(-6.0, 106.0), (-6.0, 106.5)]}
    mk = lambda kode, kab, pend, lat, lon, **ind: {"kode": kode, "kab": kab, "penduduk": pend, "lat": lat, "lon": lon, "indeks": ind}  # noqa: E731
    jarak = {"banjir": 2, "tsunami": 1}
    desa = [mk("a", "3101", 100, -6.0, 106.005, banjir=0.9),              # 0,55 km dari kandidat: cukup
            mk("b", "3101", 200, -6.0, 106.25, banjir=0.9),               # 27 km: kurang
            mk("c", "3101", 50, -6.0, 106.25, banjir=0.2),                # tidak tinggi
            mk("d", "3101", 80, -6.0, 106.02, banjir=0.9, longsor=0.9),   # 2,2 km: kurang untuk banjir; longsor tanpa jarak dilewati
            mk("e", "3101", None, -6.0, 106.02, banjir=0.9),              # tanpa penduduk: tanpa data
            mk("f", "3201", 60, -6.9, 107.6, banjir=0.9),                 # provinsi tanpa OSM: tanpa data, bukan kurang
            mk("g", "3101", 30, -6.0, 106.02, tsunami=0.7)]               # tsunami 1 km: kurang
    h, dl = hitung(desa, kand, jarak, 0.66)
    b = h["3101"]["banjir"]
    assert (b["tinggi"], b["kurang"], b["penduduk_kurang"], b["tanpa_data"]) == (3, 2, 280, 1), b
    assert "longsor" not in h["3101"], "bahaya tanpa jarak tidak dinilai"
    assert h["3201"]["banjir"] == {"tinggi": 0, "kurang": 0, "kurang_tipis": 0, "penduduk_kurang": 0, "tanpa_data": 1}, "provinsi tanpa OSM bukan 'cukup'"
    assert h["3101"]["tsunami"]["kurang"] == 1
    assert [x["desa"] for x in dl] == ["b", "d", "g"] and dl[0]["jarak_km"] is None or dl[0]["jarak_km"] > 20
    assert abs(terdekat(-6.0, 106.005, indeks(kand["31"])) - pd2.jarak_km(-6.0, 106.005, -6.0, 106.0)) < 1e-9 and terdekat(10.0, 120.0, indeks(kand["31"])) is None
    # kasus tepi sel: titik di sel yang sama dengan kandidat jauh (3,3 km) sementara kandidat tetangga sel hanya 0,11 km
    ga = indeks([(-6.03, 106.0), (-5.999, 106.0)])
    assert math.floor(-6.0001 / SEL) == math.floor(-6.03 / SEL) != math.floor(-5.999 / SEL)
    assert abs(terdekat(-6.0001, 106.0, ga) - pd2.jarak_km(-6.0001, 106.0, -5.999, 106.0)) < 1e-9 and terdekat(-6.0001, 106.0, ga) < 0.2
    # provinsi tipis: di bawah median nasional
    cvx = [{"prov": "a", "per_10rb": 1.0}, {"prov": "b", "per_10rb": 3.0}, {"prov": "c", "per_10rb": 5.0}, {"prov": "d", "per_10rb": None}]
    assert provinsi_tipis(cvx) == (frozenset({"a"}), 3.0) and provinsi_tipis([{"prov": "d", "per_10rb": None}]) == (frozenset(), None)
    ht, dt = hitung(desa, kand, jarak, 0.66, frozenset({"31"}))
    assert ht["3101"]["banjir"]["kurang_tipis"] == 2 and all(x["osm_tipis"] for x in dt) and hitung(desa, kand, jarak, 0.66)[0]["3101"]["banjir"]["kurang_tipis"] == 0
    cv = cakupan_provinsi(kand, {"3101": {"n": 10000}, "3102": {"n": 10000}, "9999": {"n": 5}}, {"31": "Prov A"})
    assert cv[0] == {"prov": "31", "nama": "Prov A", "kandidat": 2, "penduduk": 20000, "per_10rb": 1.0}, cv
    assert [c["per_10rb"] for c in cv if c["prov"] == "99"] == [None] and [c["kandidat"] for c in cv if c["prov"] == "99"] == [None], "provinsi tanpa OSM: kosong, bukan 0"
    nyata_k = muat_kandidat()
    assert len(nyata_k) >= 30 and all(len(v) > 0 for v in nyata_k.values()), len(nyata_k)
    t = pd2._baca(os.path.join(DATA, "terpapar.json"))
    terpapar = {"dibuat": t["dibuat"], "ambang": t["ambang"], "kab": {"3101": {"n": 10000}}}
    for dd in (None, {"desa": desa}):
        x = bangun(dd, kand, terpapar, {"31": "Prov A"}, "2026-11-26")
        rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **x})
        assert [k["id"] for k in x["kartu"]] == (["ks3-masukan", "ks3-osm"] + (["ks3-desa"] if dd else []))
    n = jalan()["evakuasi"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **n})
    s = json.dumps(n, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b|lokasi evakuasi resmi\b(?!;)", s.replace(LABEL_WAJIB, "")), "kata 'lokasi evakuasi resmi' hanya dalam label bukan"
    assert jam.aturan("evakuasi_jarak_km")["asumsi"] is True and jam.nilai("evakuasi_jarak_km") == {"tsunami": 1, "banjir": 2, "erupsi": 2}
    ok = [c for c in n["data"]["provinsi"] if c["per_10rb"] is not None]
    print(f"ks3.py --cek: lulus ({len(ok)} provinsi dengan cakupan OSM, desa {'ada' if n['data']['desa_ada'] else 'belum ada data'})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
