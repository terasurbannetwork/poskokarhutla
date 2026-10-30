"""Rencana kunjungan (keputusan SIPPA 64): validasi RENLAP_KUNJUNGAN, tautan Google Maps, total waktu per hari.
Hanya stdlib. Self-check tanpa jaringan dipanggil dari renlap.py uji."""
import json, re, sys
from urllib.parse import quote

MAKS_WAYPOINT = 9          # batas Google Maps web: 9 titik antara per tautan
MENIT_DI_LOKASI = 150      # asumsi 2,5 jam per lokasi (keputusan 64)
KAKI_KMJ = 4.0             # asumsi jalan kaki 4 km/jam, pergi-pulang parkir ke petak
SUMBER = ("osrm", "perkiraan")
_ID = re.compile(r"K\d{4,5}")


def _num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and x == x and abs(x) < 1e7


def valid(teks, ids_ada=None):
    """JSON teks -> dict bersih, atau None (kosong/rusak; alasan ke stderr, tidak pernah melempar)."""
    if not teks or not str(teks).strip():
        return None
    try:
        d = json.loads(teks) if isinstance(teks, str) else teks
        assert isinstance(d, dict) and d.get("v") == 1, "v harus 1"
        a = d["awal"]; assert _num(a["lat"]) and _num(a["lon"]) and -90 <= a["lat"] <= 90 and -180 <= a["lon"] <= 180, "awal salah"
        tim, lihat = [], []
        assert isinstance(d["tim"], list) and 1 <= len(d["tim"]) <= 10, "tim kosong"
        for t in d["tim"]:
            hari = []
            assert isinstance(t["hari"], list) and t["hari"], "hari kosong"
            for h in t["hari"]:
                assert isinstance(h["ids"], list) and h["ids"], "ids kosong"
                for i in h["ids"]:
                    assert isinstance(i, str) and _ID.fullmatch(i) and i not in lihat, f"id salah/ganda {i!r}"
                    assert ids_ada is None or i in ids_ada, f"id {i} tidak ada di dossier"
                    lihat.append(i)
                hari.append({"no": int(h["no"]), "ids": list(h["ids"])})
            tim.append({"no": int(t["no"]), "hari": hari})
        jarak = {}
        for i in lihat:
            j = d["jarak"][i]
            for k in ("lurus_km", "jalan_km", "mobil_menit", "kaki_km"):
                assert _num(j[k]) and j[k] >= 0, f"jarak {i}.{k} salah"
            assert j["sumber"] in SUMBER, f"sumber {i} salah"
            jarak[i] = {k: j[k] for k in ("lurus_km", "jalan_km", "mobil_menit", "kaki_km", "sumber")}
        return {"v": 1, "awal": {"lat": a["lat"], "lon": a["lon"]}, "tim": tim, "jarak": jarak}
    except Exception as ex:
        print(f"PERINGATAN: RENLAP_KUNJUNGAN diabaikan ({type(ex).__name__}: {ex})", file=sys.stderr)
        return None


def _p(p):
    return f"{p[0]:.5f},{p[1]:.5f}"


def tautan(titik):
    """titik = [(lat,lon), ...] berurutan (pertama = asal, terakhir = tujuan) -> daftar URL, tiap tautan paling banyak 9 titik antara."""
    out, i = [], 0
    while i < len(titik) - 1:
        j = min(i + MAKS_WAYPOINT + 1, len(titik) - 1)
        u = f"https://www.google.com/maps/dir/?api=1&origin={_p(titik[i])}&destination={_p(titik[j])}"
        if j - i > 1:
            u += "&waypoints=" + "%7C".join(_p(x) for x in titik[i + 1:j])
        out.append(u + "&travelmode=driving")
        i = j
    return out


def siapkan(kj, parkir, nomor):
    """kj hasil valid(); parkir {id: (lat,lon)}; nomor {id: no lokasi}. Tambah tautan dan total hari -> dict untuk cetak dan data.json."""
    awal = (kj["awal"]["lat"], kj["awal"]["lon"])
    semua, tim_out = [awal], []
    for t in kj["tim"]:
        asal, hari_out = awal, []
        for hi, h in enumerate(t["hari"]):
            titik = [asal] + [parkir[i] for i in h["ids"]]
            mobil = sum(kj["jarak"][i]["mobil_menit"] for i in h["ids"])
            kaki = sum(2 * kj["jarak"][i]["kaki_km"] / KAKI_KMJ * 60 for i in h["ids"])
            terakhir = h["ids"][-1]
            hari_out.append({"no": h["no"], "ids": h["ids"], "nomor": [nomor[i] for i in h["ids"]], "tautan": tautan(titik),
                             "mobil_menit": round(mobil), "kaki_menit": round(kaki), "lokasi_menit": MENIT_DI_LOKASI * len(h["ids"]),
                             "total_menit": round(mobil + kaki + MENIT_DI_LOKASI * len(h["ids"])),
                             "menginap": terakhir if hi + 1 < len(t["hari"]) else None})
            asal = parkir[terakhir]
            semua += [parkir[i] for i in h["ids"]]
        tim_out.append({"no": t["no"], "hari": hari_out})
    semua.append(awal)
    return {**kj, "tim": tim_out, "tautan_semua": tautan(semua)}


def uji():
    ok = {"v": 1, "awal": {"lat": -1.2, "lon": 116.8}, "tim": [{"no": 1, "hari": [{"no": 1, "ids": ["K0001"]}, {"no": 2, "ids": ["K0002"]}]}],
          "jarak": {i: {"lurus_km": 1, "jalan_km": 2, "mobil_menit": 30, "kaki_km": 1, "sumber": "osrm"} for i in ("K0001", "K0002")}}
    assert valid(json.dumps(ok)) is not None and valid("") is None and valid(None) is None
    assert valid(json.dumps({**ok, "v": 2})) is None and valid("{rusak") is None
    assert valid(json.dumps({**ok, "awal": {"lat": 99, "lon": 0}})) is None
    assert valid(json.dumps({**ok, "jarak": {"K0001": ok["jarak"]["K0001"]}})) is None          # jarak K0002 hilang
    assert valid(json.dumps(ok), ids_ada={"K0001"}) is None                                      # K0002 tak ada di dossier
    # tautan: 11 titik -> 1 tautan (origin + 9 waypoint + dest); 12 titik -> 2 tautan, sambung di titik ke-11
    pts = [(-1.0 - i / 100, 116.0 + i / 100) for i in range(11)]
    u = tautan(pts); assert len(u) == 1 and u[0].count("%7C") == 8 and "origin=-1.00000,116.00000" in u[0] and "destination=-1.10000,116.10000" in u[0]
    assert u[0].endswith("&travelmode=driving")
    u = tautan(pts + [(-2.0, 117.0)]); assert len(u) == 2 and "origin=-1.10000,116.10000" in u[1] and "waypoints" not in u[1]
    assert len(tautan(pts[:12 - 1] + pts[:3])) == 2
    assert "waypoints" not in tautan(pts[:2])[0] and "waypoints=-1.01000,116.01000&" in tautan(pts[:3])[0]
    s = siapkan(valid(json.dumps(ok)), {"K0001": (-1.3, 116.9), "K0002": (-1.4, 117.0)}, {"K0001": 2, "K0002": 1})
    h1, h2 = s["tim"][0]["hari"]
    assert h1["menginap"] == "K0001" and h2["menginap"] is None and "origin=-1.30000,116.90000" in h2["tautan"][0]
    assert h1["total_menit"] == 30 + 30 + 150 and "waypoints" in s["tautan_semua"][0]
    print("kunjungan uji ok")


if __name__ == "__main__":
    uji()
