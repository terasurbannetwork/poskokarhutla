"""Prediksi pasang surut BMKG Maritim per stasiun -> public/banjir/data/pasut.json (data banjir rob).
Sumber bebas: maritim.bmkg.go.id/pasut (metadata, hltide, data 10 menit). Urutan path persis; UA browser dibalas 403 (umum.ambil
memakai UA sendiri). Datum MSL: tinggi relatif muka laut rata-rata, cm. Gagal per stasiun dilewati. `uji` = swa-uji tanpa jaringan."""
import datetime as dt, os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from umum import ambil, simpan, KELUAR, WIB

U = "https://maritim.bmkg.go.id/pasut"
JEDA = 0.4          # detik antar permintaan
HARI_PUNCAK = 3     # hari ini .. +3
HARI_DERET = 2      # hari ini .. +2
HARI_BASIS = 90     # puncak tinggi ke belakang untuk persentil 90


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
    """Deret 10 menit [{t, pred_hat}] -> {t0, langkah_menit:60, cm} ambil menit :00 saja, harus berurutan per jam."""
    jam = [r for r in rows if r["t"][14:16] == "00" and r.get("pred_hat") is not None]
    if not jam:
        return None
    return {"t0": jam[0]["t"], "langkah_menit": 60, "cm": [cm(r["pred_hat"]) for r in jam]}


def persentil(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(p * (len(xs) - 1))))]


def satu(st, hari_ini):
    id_ = st["ID"]
    a, b = tgl(hari_ini), tgl(hari_ini + dt.timedelta(days=HARI_PUNCAK))
    puncak = parse_hltide(ambil(f"{U}/hltide/MSL/WIB/{id_}/{a}/{b}", coba=3, batas_waktu=60))
    time.sleep(JEDA)
    deret = rapat_jam(ambil(f"{U}/data/WIB/{id_}/{a}/{tgl(hari_ini + dt.timedelta(days=HARI_DERET))}", coba=3, batas_waktu=60))
    ting = [p["cm"] for p in puncak if p["jenis"] == "tinggi"]
    di_atas = None
    try:  # basis 90 hari: satu panggilan; gagal -> null
        time.sleep(JEDA)
        basis = ambil(f"{U}/hltide/MSL/WIB/{id_}/{tgl(hari_ini - dt.timedelta(days=HARI_BASIS))}/{tgl(hari_ini - dt.timedelta(days=1))}",
                      coba=2, batas_waktu=60)
        b_cm = [p["cm"] for p in parse_hltide(basis) if p["jenis"] == "tinggi"]
        if len(b_cm) >= 30 and ting:
            di_atas = max(ting) > persentil(b_cm, 0.9)
    except Exception as e:
        print(f"  basis {st['Lokasi']}: {e}", file=sys.stderr)
    return {"id": str(id_), "nama": st["Lokasi"], "prov": st.get("Provinsi"), "lat": st["Lat"], "lon": st["Lon"], "datum": "MSL",
            "puncak": puncak, "deret": deret, "tertinggi_3h_cm": max(ting) if ting else None, "di_atas_biasa": di_atas}


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


def uji():
    j = {"low_tides": [{"time": "2026-10-27T05:50+07:00", "value": -0.686}],
         "high_tides": [{"time": "2026-10-27T22:40+07:00", "value": 1.0436}, {"time": "2026-10-27T11:50+07:00", "value": 0.1857}]}
    p = parse_hltide(j)
    assert [x["t"][11:16] for x in p] == ["05:50", "11:50", "22:40"] and p[0]["jenis"] == "rendah" and p[2]["cm"] == 104, p
    rows = [{"t": f"2026-10-27T{h:02d}:{m:02d}+07:00", "pred_hat": (h * 6 + m / 10) / 100} for h in range(24) for m in range(0, 60, 10)]
    r = rapat_jam(rows)
    assert r["langkah_menit"] == 60 and len(r["cm"]) == 24 and r["t0"].startswith("2026-10-27T00:00") and r["cm"][1] == 6, r
    assert rapat_jam([]) is None
    assert persentil(list(range(101)), 0.9) == 90
    ok = {"dibuat": "x", "sumber": "s", "stasiun": [{"id": "1", "lat": -7.2, "lon": 112.7, "puncak": p, "deret": r, "di_atas_biasa": None}]}
    periksa(ok)
    ok["stasiun"][0]["deret"]["cm"] = [0] * 5
    try:
        periksa(ok)
        raise SystemExit("kontrak rusak lolos")
    except AssertionError:
        pass
    print("pasut uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
