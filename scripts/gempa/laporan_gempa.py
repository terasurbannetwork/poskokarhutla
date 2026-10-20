"""Laporan harian gempa -> public/gempa/data/laporan.json (kontrak v1 docs/multi-bencana/LAPORAN-HARIAN.md, lewat scripts/umum/laporan.py).

Hari = 60 hari terakhir WIB (hari ini = berjalan). Sumber:
  USGS FDSN M >= 4 kotak umum.BBOX, disaring ke Indonesia (umum.provinsi_gempa). Kabupaten: poligon kecamatan, atau pusat
    kecamatan terdekat <= 30 km di provinsi yang sama; gempa laut lebih jauh hanya masuk provinsi + nasional.
  Arsip BMKG Pantau Bencana (https://pantau.terasurban.com/api/gempa/terbaru?jam=720, 30 hari): dirasakan, MMI, status
    tsunami BMKG. Boleh gagal: metrik dirasakan lalu null semua dan sorot tsunami tidak ada.
Metrik: kejadian M >= 4 (utama, jumlah), M >= 5 (jumlah), dirasakan BMKG (jumlah; null sebelum arsip mulai), M terbesar (maks, netral).
Sorot (7 hari terakhir): status tsunami BMKG (tingkat = kode BMKG 1 waspada, 2 siaga, 3 awas; berlabel "BMKG"), gempa M >= 6,
  dirasakan MMI >= V (info). Prakiraan: peluang >= 1 susulan M >= 5 per hari WIB, 7 hari ke depan, tiap gempa utama M >= 5 dalam
  7 hari terakhir, dari susulan.py (param disesuaikan dengan susulan teramati hanya bila terbit_sesuaikan); hanya bila target m5 terbit.
Kode kabupaten: TIDAK ada kode Kemendagri kabupaten di repo; kode = prov + nomor urut nama kabupaten (abjad) di
  public/banjir/data/pusat_kec.json. Stabil selama daftar kabupaten tetap; bukan kode resmi.

Pakai:  python3 scripts/gempa/laporan_gempa.py | uji
"""
import datetime as dt, importlib.util, json, math, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
from umum import AKAR, ambil, jarak_km, provinsi_gempa, usgs_url  # noqa: E402
import susulan as SU  # noqa: E402

_s = importlib.util.spec_from_file_location("umum_laporan_gempa", os.path.join(AKAR, "scripts/umum/laporan.py"))
LP = importlib.util.module_from_spec(_s)
_s.loader.exec_module(LP)

WIB = dt.timezone(dt.timedelta(hours=7))
N_HARI = 60
BMKG_URL = "https://pantau.terasurban.com/api/gempa/terbaru?jam=720"
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
P_MIN_HARIAN = 0.005  # baris prakiraan dibuang bila semua peluang harian di bawah ini
TINGKAT_TSUNAMI = {1: "waspada", 2: "siaga", 3: "awas"}
METRIK = [
    {"k": "kejadian", "label": "Gempa M 4 atau lebih", "satuan": "kejadian", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0, "dari": "n4"},
    {"k": "m5", "label": "Gempa M 5 atau lebih", "satuan": "kejadian", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0, "dari": "n5"},
    {"k": "dirasakan", "label": "Gempa dirasakan", "satuan": "kejadian", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0, "dari": "dir"},
    {"k": "mmaks", "label": "M terbesar", "satuan": "M", "agregat": "maks", "arah": "netral", "desimal": 1, "dari": "m"},
]


def waktu_wib(d):
    d = d.astimezone(WIB)
    return f"{d.day} {BULAN[d.month - 1]} {d:%H.%M} WIB"


def m_teks(m):
    return f"M {m:.1f}".replace(".", ",")


class Wil:
    """Provinsi/kabupaten dari poligon + pusat kecamatan; kode kab urut abjad per provinsi."""

    def __init__(self):
        sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
        from wilayah import Wilayah, PROVINSI
        self.w, self.prov = Wilayah(), PROVINSI
        self.pusat = [(k.split("|"), v) for k, v in json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json"))).items()]
        kab = {}
        for (kp, kb, _), _v in self.pusat:
            if kb != "None":
                kab.setdefault(kp, set()).add(kb)
        self.kode = {(kp, kb): f"{kp}{i + 1:02d}" for kp, s in kab.items() for i, kb in enumerate(sorted(s))}

    def kec_terdekat(self, lat, lon, batas_km, kp=None):
        best = None
        for (p, kb, _), (la, lo) in self.pusat:
            if (kp and p != kp) or abs(la - lat) > batas_km / 100 or abs(lo - lon) > batas_km / 90:
                continue
            d = jarak_km(lat, lon, la, lo)
            if d <= batas_km and (best is None or d < best[0]):
                best = (d, p, kb)
        return best

    def letak(self, lat, lon, place):
        """-> (kp, kab_nama | None, teks wilayah) atau None bila bukan Indonesia."""
        kp = provinsi_gempa(self.w, lat, lon, place)
        if not kp:
            return None
        adm = self.w.cari(lon, lat)
        kab = adm[1] if adm and adm[0] == kp else None
        if not kab:
            t = self.kec_terdekat(lat, lon, 30, kp)
            kab = t[2] if t else None
        if kab:
            return kp, kab, f"{kab}, {self.prov[kp]}"
        t = self.kec_terdekat(lat, lon, 300)
        return kp, None, (f"laut dekat {t[2]}, {self.prov[t[1]]}" if t else f"laut, {self.prov[kp]}")


def baris_usgs(feats, wil):
    out = []
    for f in feats:
        p, (lon, lat, dalam) = f["properties"], f["geometry"]["coordinates"]
        if p.get("type") != "earthquake" or p.get("mag") is None:
            continue
        lt = wil.letak(lat, lon, p.get("place") or "")
        if not lt:
            continue
        w = dt.datetime.fromtimestamp(p["time"] / 1000, dt.timezone.utc)
        out.append({"id": f["id"], "waktu": w, "lat": lat, "lon": lon, "dalam": round(dalam or 0, 1), "m": round(p["mag"], 1),
                    "prov": lt[0], "kab_nama": lt[1], "wilayah": lt[2]})
    return sorted(out, key=lambda r: r["waktu"])


def baris_bmkg(daftar):
    out = []
    for g in daftar or []:
        try:
            w = dt.datetime.fromisoformat(g["waktu"].replace("Z", "+00:00"))
        except (KeyError, ValueError, AttributeError):
            continue
        ts = g.get("tsunami") or {}
        out.append({"waktu": w, "m": g.get("m"), "lat": g.get("lat"), "lon": g.get("lon"), "dalam": g.get("dalam"),
                    "prov": g.get("prov") or None, "kab_nama": g.get("kab") or None, "wilayah": g.get("wilayah") or "",
                    "dirasakan": g.get("dirasakan") or None, "mmi_maks": g.get("mmi_maks"),
                    "tsunami_kode": ts.get("kode"), "tsunami_teks": ts.get("teks")})
    return out


def prakiraan(ev, model, kini, wil):
    """Gempa utama M >= 5 dalam 7 hari terakhir -> baris peluang susulan M >= 5 per hari WIB (besok s.d. +7)."""
    if not model.get("terbit_target", {}).get("m5"):
        return None
    t_kini = SU._hari(kini.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M"))
    utama = [i for i in SU.gempa_utama(ev) if 0 <= t_kini - ev[i]["t"] <= SU.H]
    if not utama:
        return None
    P = model["param"]
    seq = SU.urutan(ev, utama, SU.H, P["mc"])
    besok = kini.astimezone(WIB).date() + dt.timedelta(days=1)
    hari = [(besok + dt.timedelta(days=k)).isoformat() for k in range(7)]
    baris = []
    for i in sorted(utama, key=lambda i: -ev[i]["m"]):
        e = ev[i]
        umur = t_kini - e["t"]
        Pi = SU.sesuaikan(e["m"], [{"t_hari": t, "m": m} for t, m in seq[i] if t <= umur], umur, P,
                          aktif=model.get("terbit_sesuaikan") is True)  # penyesuaian hanya bila lolos validasi
        t_utc = dt.datetime.strptime(e["w"], "%Y-%m-%dT%H:%M").replace(tzinfo=dt.timezone.utc)
        nilai = []
        for h in hari:
            a = dt.datetime.fromisoformat(h).replace(tzinfo=WIB)
            t1 = (a - t_utc).total_seconds() / 86400
            nilai.append(round(SU.peluang(e["m"], max(t1, SU.T0), 1.0 - max(0.0, SU.T0 - t1), 5.0, Pi)["p"], 4))
        lt = wil.letak(e["lat"], e["lon"], e["place"])
        nama = lt[1] if lt and lt[1] else (lt[2] if lt else e["place"])
        baris.append({"label": f"{nama} ({m_teks(e['m'])}, {waktu_wib(t_utc)})", "prov": e["kp"], "nilai": nilai, "satuan": "peluang"})
    baris = [b for b in baris if max(b["nilai"]) >= P_MIN_HARIAN]  # A18: baris yang semua harinya < 0,5% tampil 0% dan tak informatif
    if not baris:
        return None
    return {"judul": "Peluang harian gempa susulan M 5 atau lebih, 7 hari ke depan", "hari": hari, "baris": baris[:8],
            "catatan": "Hanya gempa utama M≥5 dalam 7 hari terakhir; gempa yang masih dalam rangkaian gempa sebelumnya tidak dihitung."}


def bangun(feats, bmkg, ev, model, kini, wil):
    hari_ini = kini.astimezone(WIB).date()
    hari = [(hari_ini - dt.timedelta(days=N_HARI - 1 - k)).isoformat() for k in range(N_HARI)]
    us = baris_usgs(feats, wil)
    bm = baris_bmkg(bmkg) if bmkg is not None else []
    rows = []
    for r in us:
        rows.append({"hari": r["waktu"].astimezone(WIB).date().isoformat(), "prov": r["prov"],
                     "kab_kode": wil.kode.get((r["prov"], r["kab_nama"])) if r["kab_nama"] else None, "kab_nama": r["kab_nama"],
                     "n4": 1 if r["m"] >= 4 else None, "n5": 1 if r["m"] >= 5 else None, "m": r["m"]})
    dir_bm = [g for g in bm if g["dirasakan"]]
    for g in dir_bm:
        kode = wil.kode.get((g["prov"], g["kab_nama"])) if g["prov"] and g["kab_nama"] else None
        rows.append({"hari": g["waktu"].astimezone(WIB).date().isoformat(), "prov": g["prov"] if g["prov"] in wil.prov else None,
                     "kab_kode": kode, "kab_nama": g["kab_nama"] if kode else None, "dir": 1})
    nas, prov, kab = LP.dari_kejadian(rows, hari, METRIK)
    # dirasakan: null sebelum hari pertama arsip BMKG (bukan 0); tanpa BMKG semuanya null
    awal = min((g["waktu"].astimezone(WIB).date().isoformat() for g in dir_bm), default=None)
    for o in [nas, *prov.values(), *kab]:
        o["dirasakan"] = [None if awal is None or h < awal else v for h, v in zip(hari, o["dirasakan"])]

    batas7 = kini - dt.timedelta(days=7)
    sorot = []
    for g in bm:
        if g["waktu"] >= batas7 and g["tsunami_kode"] in TINGKAT_TSUNAMI:
            sorot.append((0, -g["tsunami_kode"], {"tingkat": TINGKAT_TSUNAMI[g["tsunami_kode"]],
                          "judul": f"BMKG: {g['tsunami_teks'] or 'berpotensi tsunami'}",
                          "teks": f"{m_teks(g['m'])} {waktu_wib(g['waktu'])}, {g['wilayah']}. Sumber: BMKG.", "prov": g["prov"] if g["prov"] in wil.prov else None}))
    for r in us:
        if r["waktu"] >= batas7 and r["m"] >= 6:
            sorot.append((1, -r["m"], {"tingkat": "info", "judul": f"{m_teks(r['m'])} di {r['wilayah']}",
                                       "teks": f"{waktu_wib(r['waktu'])}, kedalaman {r['dalam']:.0f} km. Sumber: USGS.", "prov": r["prov"]}))
    for g in dir_bm:
        if g["waktu"] >= batas7 and (g["mmi_maks"] or 0) >= 5:
            sorot.append((2, -(g["mmi_maks"] or 0), {"tingkat": "info", "judul": f"Dirasakan MMI {_romawi(g['mmi_maks'])}: {g['kab_nama'] or g['wilayah']}",
                                                     "teks": f"{m_teks(g['m'])} {waktu_wib(g['waktu'])}. {g['dirasakan']}. Sumber: BMKG.",
                                                     "prov": g["prov"] if g["prov"] in wil.prov else None}))
    sorot = [s[2] for s in sorted(sorot, key=lambda s: (s[0], s[1]))][:8]

    tambahan = []
    m5 = [r for r in us if r["m"] >= 5][::-1][:20]
    if m5:
        tambahan.append({"id": "m5", "judul": "Gempa M≥5 terbaru", "kolom": ["Waktu", "M", "Kedalaman (km)", "Wilayah"],
                         "baris": [[waktu_wib(r["waktu"]), r["m"], r["dalam"], r["wilayah"]] for r in m5],
                         "catatan": "Katalog USGS, 60 hari terakhir."})
    t_kini = SU._hari(kini.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M"))
    utama = [i for i in SU.gempa_utama(ev) if 0 <= t_kini - ev[i]["t"] <= N_HARI]
    seq = SU.urutan(ev, utama, SU.H, 4.5)
    sus = []
    for i in utama:
        s = [x for x in seq[i] if x[0] <= t_kini - ev[i]["t"]]
        if s:
            e, terbesar = ev[i], max(s, key=lambda x: x[1])
            t_utc = dt.datetime.strptime(e["w"], "%Y-%m-%dT%H:%M").replace(tzinfo=dt.timezone.utc)
            lt = wil.letak(e["lat"], e["lon"], e["place"])
            sus.append([waktu_wib(t_utc), lt[2] if lt else e["place"], e["m"], len(s), terbesar[1]])
    if sus:
        tambahan.append({"id": "susulan", "judul": "Gempa susulan terbesar", "kolom": ["Gempa utama", "Wilayah", "M utama", "Susulan M≥4,5", "M susulan terbesar"],
                         "baris": sorted(sus, key=lambda r: -r[4])[:20], "catatan": "Susulan dalam 7 hari dan jendela jarak Gardner-Knopoff, katalog USGS."})

    cutoff = max([r["waktu"] for r in us] + [g["waktu"] for g in bm], default=kini).astimezone(WIB).strftime("%Y-%m-%dT%H:%M+07:00")
    sumber = [{"nama": "USGS", "url": "https://earthquake.usgs.gov/fdsnws/event/1/", "catatan": "katalog gempa M≥4, domain publik"}]
    if bmkg is not None:
        sumber.append({"nama": "BMKG", "url": "https://data.bmkg.go.id/gempabumi/", "catatan": "gempa dirasakan dan status tsunami, arsip Pantau Bencana 30 hari"})
    spec = [{k: v for k, v in m.items() if k != "dari"} for m in METRIK]
    return LP.susun("gempa", "Laporan Harian Gempa Bumi", hari, spec, nas, prov, kab, cutoff=cutoff, hari_lengkap=hari[-2],
                    sorot=sorot, prakiraan=prakiraan(ev, model, kini, wil), tambahan=tambahan, sumber=sumber,
                    dibuat=kini.astimezone(WIB).strftime("%Y-%m-%dT%H:%M+07:00"))


def _romawi(n):
    return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][max(1, min(12, int(n or 1))) - 1]


def main():
    kini = dt.datetime.now(dt.timezone.utc)
    mulai = (kini - dt.timedelta(days=N_HARI + 1)).strftime("%Y-%m-%d")
    feats = ambil(usgs_url("query", mulai, kini.strftime("%Y-%m-%dT%H:%M:%S"), 4.0, format="geojson"))["features"]
    try:
        bmkg = ambil(BMKG_URL, coba=2, batas_waktu=60)["gempa"]
    except Exception as e:  # arsip BMKG boleh gagal
        print("BMKG gagal:", e, file=sys.stderr)
        bmkg = None
    d = bangun(feats, bmkg, SU.katalog(), SU.muat_model(), kini, Wil())
    j = LP.tulis("gempa", d)
    print(j, os.path.getsize(j), "byte;", sum(x or 0 for x in d["nasional"]["kejadian"]), "gempa M>=4;",
          len(d["sorot"]), "sorot;", len((d.get("prakiraan") or {}).get("baris", [])), "baris prakiraan")


def uji():
    kini = dt.datetime(2026, 10, 18, 10, 0, tzinfo=dt.timezone.utc)
    ms = lambda d: int(d.timestamp() * 1000)
    f = lambda i, d, lon, lat, m, place="10 km of Palu, Indonesia", tipe="earthquake": {
        "id": f"us{i}", "properties": {"mag": m, "place": place, "time": ms(d), "type": tipe}, "geometry": {"coordinates": [lon, lat, 10]}}
    t = lambda **k: kini - dt.timedelta(**k)
    feats = [f(1, t(days=2), 119.87, -0.9, 6.2), f(2, t(days=1), 119.88, -0.91, 4.6), f(3, t(days=20), 120.27, -8.14, 5.2, "55 km NNW of Ruteng, Indonesia"),
             f(4, t(days=3), 125.5, 7.0, 6.5, "20 km of Davao, Philippines"), f(5, t(days=1), 119.9, -0.9, 4.8, tipe="quarry blast"),
             f(6, t(days=90), 119.9, -0.9, 5.0)]
    bmkg = [{"waktu": t(days=2).isoformat(), "m": 6.0, "lat": -0.9, "lon": 119.87, "dalam": 10, "prov": "72", "kab": "Donggala",
             "wilayah": "darat 10 km Donggala", "tsunami": {"kode": 2, "teks": "Berpotensi tsunami, Siaga"}, "dirasakan": "V Palu", "mmi_maks": 5},
            {"waktu": t(days=5).isoformat(), "m": 3.1, "prov": "53", "kab": "Manggarai", "wilayah": "x", "tsunami": {"kode": None}, "dirasakan": None},
            {"waktu": "rusak"}]
    ev = [{"w": e.strftime("%Y-%m-%dT%H:%M"), "t": SU._hari(e.strftime("%Y-%m-%dT%H:%M")), "lat": la, "lon": lo, "dalam": 10, "m": m, "place": "Palu", "kp": "72"}
          for e, la, lo, m in [(t(days=2), -0.9, 119.87, 6.2), (t(days=1), -0.91, 119.88, 4.8), (t(hours=30), -0.95, 119.9, 5.1)]]
    model = {"terbit_target": {"m5": True}, "param": {"a": -2.8, "b": 1.19, "p": 0.9, "c": 0.05, "mc": 4.7, "sa": 0.9, "alfa": 1.06, "m_ref": 6.0}}
    wil = Wil()
    d = bangun(feats, bmkg, ev, model, kini, wil)
    g = LP.periksa(d)
    assert g == [], g
    assert len(d["hari"]) == 60 and d["hari"][-1] == "2026-10-18" and d["hari_lengkap"] == "2026-10-17"
    assert sum(d["nasional"]["kejadian"]) == 3, d["nasional"]["kejadian"]  # Filipina, ledakan tambang, > 60 hari dibuang
    assert sum(d["nasional"]["m5"]) == 2 and max(x for x in d["nasional"]["mmaks"] if x is not None) == 6.2
    dr = d["nasional"]["dirasakan"]
    assert dr[-3] == 1 and dr[0] is None and dr[-1] == 0, dr  # null sebelum arsip BMKG mulai
    assert d["sorot"][0]["tingkat"] == "siaga" and "BMKG" in d["sorot"][0]["judul"] and d["sorot"][1]["tingkat"] == "info", d["sorot"]
    assert "72" in d["prov"] and "53" in d["prov"] and all(k["kode"][:2] == k["prov"] for k in d["kab"])
    p = d["prakiraan"]
    assert p and len(p["hari"]) == 7 and p["hari"][0] == "2026-10-19" and len(p["baris"]) == 1, p
    v = p["baris"][0]["nilai"]
    assert all(0 < a for a in v) and all(a >= b for a, b in zip(v, v[1:])), v  # Omori: makin lama makin kecil
    assert {x["id"] for x in d["tambahan"]} == {"m5", "susulan"} and "rangkaian" in p["catatan"]
    # gempa utama kecil 5 hari lalu: semua peluang harian < 0,5% -> baris dibuang, prakiraan tidak ditulis
    ev_kecil = [dict(ev[0], w=t(days=5).strftime("%Y-%m-%dT%H:%M"), t=SU._hari(t(days=5).strftime("%Y-%m-%dT%H:%M")), m=5.1)]
    d3 = bangun(feats, bmkg, ev_kecil, model, kini, wil)
    assert "prakiraan" not in d3 and LP.periksa(d3) == [], d3.get("prakiraan")
    v_on = bangun(feats, bmkg, ev, dict(model, terbit_sesuaikan=True), kini, wil)["prakiraan"]["baris"][0]["nilai"]
    assert v_on != v, "terbit_sesuaikan true harus memakai param disesuaikan"
    e0 = ev[0]
    a = dt.datetime.fromisoformat(p["hari"][0]).replace(tzinfo=WIB)
    t1 = (a - dt.datetime.strptime(e0["w"], "%Y-%m-%dT%H:%M").replace(tzinfo=dt.timezone.utc)).total_seconds() / 86400
    assert v[0] == round(SU.peluang(e0["m"], t1, 1.0, 5.0, model["param"])["p"], 4), v  # tanpa terbit_sesuaikan = param generik
    assert d["tambahan"][1]["baris"][0][3] == 2, d["tambahan"][1]  # dua susulan di jendela
    # tanpa BMKG: dirasakan null semua, tetap sah; model tidak terbit: tanpa prakiraan
    d2 = bangun(feats, None, ev, dict(model, terbit_target={"m5": False}), kini, wil)
    assert LP.periksa(d2) == [] and all(x is None for x in d2["nasional"]["dirasakan"]) and "prakiraan" not in d2
    assert [s["nama"] for s in d2["sumber"]] == ["USGS"]
    # yang salah ditolak oleh penulis bersama
    import copy
    x = copy.deepcopy(d)
    x["sorot"][0]["tingkat"] = "gawat"
    try:
        LP.tulis("gempa", x)
        raise SystemExit("laporan rusak diterima")
    except ValueError:
        pass
    j = os.path.join(AKAR, "public/gempa/data/laporan.json")
    if os.path.exists(j):
        assert LP.periksa(json.load(open(j))) == [], "laporan.json di disk tidak sah"
    print("laporan_gempa uji OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
