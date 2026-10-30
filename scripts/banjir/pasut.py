"""Prediksi pasang surut BMKG Maritim per stasiun -> public/banjir/data/pasut.json (data banjir rob).
Sumber bebas: maritim.bmkg.go.id/pasut (metadata, hltide, data 10 menit). Urutan path persis; UA browser dibalas 403 (umum.ambil
memakai UA sendiri). Datum MSL: tinggi relatif muka laut rata-rata, cm. Gagal per stasiun dilewati. `uji` = swa-uji tanpa jaringan.

Prospek 30 hari (29 Okt 2026) -> pasut_30h.json: SATU panggilan hltide per stasiun (sekitar 73 per hari, 1 per detik) untuk jendela
[hari ini - 335, hari ini + 30]. BMKG hanya melayani prediksi dari 1 Des 2025 sampai 1 Jan 2027 (tanggal di luar itu kosong),
jadi jendela dipotong otomatis. Ambang "pasang tinggi" = persentil 90 maksimum harian stasiun itu sendiri atas jendela itu
(minimal 120 hari, selain itu null). Status 7 hari: tinggi bila ada hari di atas p90, sedang bila di atas p75, selain itu biasa.
Validasi terhadap UHSLC: lihat kepala pasut_validasi.py. Belum ada klaim ketepatan di layar."""
import datetime as dt, os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from umum import ambil, simpan, KELUAR, WIB

U = "https://maritim.bmkg.go.id/pasut"
JEDA = 0.4          # detik antar permintaan
HARI_PUNCAK = 3     # hari ini .. +3
HARI_DERET = 2      # hari ini .. +2
HARI_BASIS = 90     # puncak tinggi ke belakang untuk persentil 90
HARI_PROSPEK = 30   # ke depan
HARI_JENDELA = 335  # ke belakang (BMKG hanya punya sejak 2025-12-01)
JEDA_PROSPEK = 1.0  # detik, sopan: satu permintaan per detik
MIN_BASIS = 120     # hari minimal untuk persentil


def tgl(d):
    return d.strftime("%Y%m%d")


def cm(m):
    return round(float(m) * 100)


def parse_hltide(j):
    """{low_tides, high_tides} -> [{t, cm, jenis}] urut waktu."""
    out = [{"t": x["time"], "cm": cm(x["value"]), "jenis": jenis}
           for kunci, jenis in (("high_tides", "tinggi"), ("low_tides", "rendah")) for x in j.get(kunci, [])]
    return sorted(out, key=lambda p: p["t"])


def rapat_jam(rows):
    """Deret 10 menit [{t, msl}] -> {t0, langkah_menit:60, cm} ambil menit :00 saja, harus berurutan per jam.
    Field `msl` (meter, datum MSL) yang dipakai: sama datum dengan hltide/MSL. `pred_hat` datum HAT (selisih sekitar 70 cm di Tanjung Priok) tidak boleh dipakai."""
    jam = [r for r in rows if r["t"][14:16] == "00" and r.get("msl") not in (None, "")]
    if not jam:
        return None
    return {"t0": jam[0]["t"], "langkah_menit": 60, "cm": [cm(r["msl"]) for r in jam]}


def persentil(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(p * (len(xs) - 1))))]


def maks_harian(puncak):
    """[{t, cm, jenis}] -> maksimum puncak tinggi per tanggal WIB (satu nilai per hari)."""
    h = {}
    for p in puncak:
        if p["jenis"] == "tinggi":
            h[p["t"][:10]] = max(h.get(p["t"][:10], p["cm"]), p["cm"])
    return h


def maks_harian_jam(puncak):
    """[{t, cm, jenis}] -> {tanggal: (cm, jam)} maksimum puncak tinggi per tanggal WIB."""
    h = {}
    for p in puncak:
        if p["jenis"] == "tinggi" and (p["t"][:10] not in h or p["cm"] > h[p["t"][:10]][0]):
            h[p["t"][:10]] = (p["cm"], p["t"][11:16])
    return h


def susun_prospek(st, harian, hari_ini):
    """{tanggal: (cm, jam)} -> {id, nama, prov, lat, lon, p50, p75, p90, hari_basis, status7, hari:[[tgl, cm, jam]]} hari ini .. +30."""
    nilai = [v[0] for v in harian.values()]
    p50 = p75 = p90 = None
    if len(nilai) >= MIN_BASIS:
        p50, p75, p90 = persentil(nilai, 0.5), persentil(nilai, 0.75), persentil(nilai, 0.9)
    ke = (dt.date.fromisoformat(hari_ini) + dt.timedelta(days=HARI_PROSPEK)).isoformat()
    depan = [[d, v[0], v[1]] for d, v in sorted(harian.items()) if hari_ini <= d <= ke]
    if not depan:
        raise ValueError("tidak ada prediksi ke depan")
    status = None
    if p90 is not None:
        m7 = max(x[1] for x in depan[:7])
        status = "tinggi" if m7 > p90 else "sedang" if m7 > p75 else "biasa"
    return {"id": str(st["ID"]), "nama": st["Lokasi"], "prov": st.get("Provinsi"), "lat": st["Lat"], "lon": st["Lon"],
            "p50": p50, "p75": p75, "p90": p90, "hari_basis": len(nilai), "status7": status, "hari": depan}


def periksa_prospek(o):
    assert o["sumber"] and o["dibuat"] and o["stasiun"], "kosong"
    for s in o["stasiun"]:
        assert s["hari"] and all(len(x) == 3 and isinstance(x[1], int) for x in s["hari"]), s["id"]
        assert s["status7"] in ("tinggi", "sedang", "biasa", None)
        assert (s["status7"] is None) == (s["p90"] is None), s["id"]


def prospek(meta, hari_ini):
    hasil, gagal = [], 0
    for st in meta:
        try:
            a, b = tgl(hari_ini - dt.timedelta(days=HARI_JENDELA)), tgl(hari_ini + dt.timedelta(days=HARI_PROSPEK))
            puncak = parse_hltide(ambil(f"{U}/hltide/MSL/WIB/{st['ID']}/{a}/{b}", coba=2, batas_waktu=30))
            hasil.append(susun_prospek(st, maks_harian_jam(puncak), hari_ini.isoformat()))
        except Exception as e:
            gagal += 1
            print(f"  prospek lewati {st.get('Lokasi')}: {e}", file=sys.stderr)
        time.sleep(JEDA_PROSPEK)
    if gagal > len(meta) // 2:
        sys.exit(f"prospek: terlalu banyak stasiun gagal ({gagal}/{len(meta)}), pasut_30h.json lama dipertahankan")
    o = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "mulai": hari_ini.isoformat(), "datum": "MSL", "satuan": "cm",
         "sumber": "BMKG Maritim, prediksi pasang surut (maritim.bmkg.go.id/pasut/hltide/MSL/WIB)",
         "metode": "p90 = persentil 90 maksimum harian stasiun itu sendiri atas jendela prediksi; bukan ambang banjir",
         "stasiun": hasil}
    periksa_prospek(o)
    simpan(os.path.join(KELUAR, "pasut_30h.json"), o)
    print(f"pasut_30h.json: {len(hasil)} stasiun, {gagal} gagal")


def satu(st, hari_ini):
    id_ = st["ID"]
    a, b = tgl(hari_ini), tgl(hari_ini + dt.timedelta(days=HARI_PUNCAK))
    puncak = parse_hltide(ambil(f"{U}/hltide/MSL/WIB/{id_}/{a}/{b}", coba=2, batas_waktu=20))
    time.sleep(JEDA)
    deret = rapat_jam(ambil(f"{U}/data/WIB/{id_}/{a}/{tgl(hari_ini + dt.timedelta(days=HARI_DERET))}", coba=2, batas_waktu=20))
    ting = [p["cm"] for p in puncak if p["jenis"] == "tinggi"]
    di_atas = p90 = hari_di = None
    try:  # basis 90 hari: satu panggilan; gagal -> null
        time.sleep(JEDA)
        basis = ambil(f"{U}/hltide/MSL/WIB/{id_}/{tgl(hari_ini - dt.timedelta(days=HARI_BASIS))}/{tgl(hari_ini - dt.timedelta(days=1))}",
                      coba=1, batas_waktu=20)
        b_cm = list(maks_harian(parse_hltide(basis)).values())
        if len(b_cm) >= 30 and ting:
            p90 = persentil(b_cm, 0.9)
            dua = sorted(maks_harian(puncak).items())[:2]  # hari ini dan besok saja; 4 hari vs ambang satu hari = positif berlebihan
            hari_di = [d for d, v in dua if v > p90]
            di_atas = bool(hari_di)
    except Exception as e:
        print(f"  basis {st['Lokasi']}: {e}", file=sys.stderr)
    return {"id": str(id_), "nama": st["Lokasi"], "prov": st.get("Provinsi"), "lat": st["Lat"], "lon": st["Lon"], "datum": "MSL",
            "puncak": puncak, "deret": deret, "tertinggi_4h_cm": max(ting) if ting else None, "p90_harian_cm": p90, "hari_di_atas": hari_di, "di_atas_biasa": di_atas}


def periksa(o):
    """Kontrak keluaran; AssertionError bila rusak."""
    assert o["sumber"] and o["dibuat"] and o["stasiun"], "kosong"
    for s in o["stasiun"]:
        assert s["id"] and -12 < s["lat"] < 8 and 94 < s["lon"] < 142, s["id"]
        assert s["puncak"] and all(p["jenis"] in ("tinggi", "rendah") and isinstance(p["cm"], int) for p in s["puncak"]), s["id"]
        d = s["deret"]
        assert d and d["langkah_menit"] == 60 and len(d["cm"]) >= 24, s["id"]
        assert all(-1000 < c < 1000 for c in d["cm"]), s["id"]
        assert s["di_atas_biasa"] in (True, False, None)
        assert not s["di_atas_biasa"] or s["p90_harian_cm"] is not None, s["id"]


def main():
    hari_ini = dt.datetime.now(WIB).date()
    meta = ambil(f"{U}/metadata", coba=3, batas_waktu=60)
    hasil, gagal = [], 0
    for st in meta:
        try:
            hasil.append(satu(st, hari_ini))
        except Exception as e:
            gagal += 1
            print(f"  lewati {st.get('Lokasi')}: {e}", file=sys.stderr)
        time.sleep(JEDA)
    o = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sumber": "BMKG Maritim, prediksi pasang surut", "stasiun": hasil}
    periksa(o)
    if gagal > len(meta) // 2:
        sys.exit(f"terlalu banyak stasiun gagal ({gagal}/{len(meta)}), pasut.json lama dipertahankan")
    simpan(os.path.join(KELUAR, "pasut.json"), o)
    print(f"pasut.json: {len(hasil)} stasiun, {gagal} gagal")
    prospek(meta, hari_ini)


def uji():
    j = {"low_tides": [{"time": "2026-10-27T05:50+07:00", "value": -0.686}],
         "high_tides": [{"time": "2026-10-27T22:40+07:00", "value": 1.0436}, {"time": "2026-10-27T11:50+07:00", "value": 0.1857}]}
    p = parse_hltide(j)
    assert [x["t"][11:16] for x in p] == ["05:50", "11:50", "22:40"] and p[0]["jenis"] == "rendah" and p[2]["cm"] == 104, p
    rows = [{"t": f"2026-10-27T{h:02d}:{m:02d}+07:00", "msl": str((h * 6 + m / 10) / 100)} for h in range(24) for m in range(0, 60, 10)]
    r = rapat_jam(rows)
    assert r["langkah_menit"] == 60 and len(r["cm"]) == 24 and r["t0"].startswith("2026-10-27T00:00") and r["cm"][1] == 6, r
    assert rapat_jam([]) is None
    assert persentil(list(range(101)), 0.9) == 90
    assert maks_harian(p) == {"2026-10-27": 104}, maks_harian(p)
    ok = {"dibuat": "x", "sumber": "s", "stasiun": [{"id": "1", "lat": -7.2, "lon": 112.7, "puncak": p, "deret": r, "p90_harian_cm": None, "di_atas_biasa": None}]}
    periksa(ok)
    ok["stasiun"][0]["di_atas_biasa"] = True
    try:
        periksa(ok)
        raise SystemExit("true tanpa p90 lolos")
    except AssertionError:
        pass
    ok["stasiun"][0]["di_atas_biasa"] = None
    ok["stasiun"][0]["deret"]["cm"] = [0] * 5
    try:
        periksa(ok)
        raise SystemExit("kontrak rusak lolos")
    except AssertionError:
        pass
    st = {"ID": 9, "Lokasi": "X", "Provinsi": "P", "Lat": -6.1, "Lon": 106.8}
    h = {(dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat(): (50, "10:00") for i in range(153)}   # sampai 31 Okt
    r = susun_prospek(st, h, "2026-10-29")
    assert r["p90"] == 50 and [x[0] for x in r["hari"]] == ["2026-10-29", "2026-10-30", "2026-10-31"] and r["status7"] == "biasa", r
    h["2026-10-31"] = (170, "21:00")
    assert susun_prospek(st, h, "2026-10-29")["status7"] == "tinggi"
    assert susun_prospek(st, dict(list(h.items())[-40:]), "2026-10-29")["status7"] is None  # basis pendek
    print("pasut uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
