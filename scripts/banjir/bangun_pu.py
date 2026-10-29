"""Bangun lapisan infrastruktur air PUPR untuk layar banjir (sekali jalan, bukan harian) dari hasil panen publik:
  public/banjir/data/bendungan.json  bendungan (SIGI Hosted/Data_Bendungan) + embung (SIGI Hosted/Embung_2025)
  public/banjir/data/pos_pu.json     LOKASI pos duga air telemetri (SIHKA telemetry-list) dan pos klimatologi/curah hujan (SIGI ast_sihka_klimatologi)
Tanpa nilai: satuan TMA SIHKA tidak seragam (nilai 0,5 sampai 677 pada kolom meter), jadi hanya letak pos yang ditampilkan.
Pakai: python3 scripts/banjir/bangun_pu.py <berkas bendungan.json> <pu_Embung_2025_0.geojson> <pos_duga_air_telemetri.json> <pu_ast_sihka_klimatologi_0.geojson> [tanggal]
`uji` = swa-uji. Diambil 29 Okt 2026."""
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, simpan

DI_INDONESIA = lambda lat, lon: -11.5 < lat < 6.5 and 94 < lon < 142
R = lambda x, n=5: None if x is None else round(float(x), n)


def bendungan(daftar):
    out = []
    for d in daftar:
        if d.get("lat") is None or not DI_INDONESIA(d["lat"], d["lon"]):
            continue
        out.append([R(d["lon"]), R(d["lat"]), d["nama"], d.get("das") or "", d.get("prov") or "", d.get("kab") or "", d.get("volume_juta_m3"),
                    d.get("tinggi_m"), d.get("tahun"), d.get("pengelola") or "", d.get("status_operasi") or ""])
    return out


def embung(gj):
    out = []
    for f in gj["features"]:
        p, (lon, lat) = f["properties"], f["geometry"]["coordinates"][:2]
        if DI_INDONESIA(lat, lon):
            out.append([R(lon), R(lat), p.get("nama") or "", p.get("kelurahan") or "", p.get("kecamatan") or "", p.get("kabupaten___kota") or "",
                        p.get("provinsi") or "", p.get("kewenangan") or ""])
    return out


def pos(telemetri, klim):
    out, lihat = [], set()
    for t in telemetri:
        k = ("d", round(t["lat"], 3), round(t["lon"], 3))
        if DI_INDONESIA(t["lat"], t["lon"]) and k not in lihat:
            lihat.add(k); out.append([R(t["lon"]), R(t["lat"]), t["nama"].title(), "d", ""])
    for f in klim["features"]:
        p, (lon, lat) = f["properties"], f["geometry"]["coordinates"][:2]
        k = ("k", round(lat, 3), round(lon, 3))
        if DI_INDONESIA(lat, lon) and k not in lihat:
            lihat.add(k); out.append([R(lon), R(lat), (p.get("name") or "").title(), "k", p.get("das_name") or ""])
    return out


def main(a):
    tgl = a[4] if len(a) > 4 else "2026-10-29"
    b, e = bendungan(json.load(open(a[0]))), embung(json.load(open(a[1])))
    simpan(os.path.join(KELUAR, "bendungan.json"), {
        "tanggal": tgl, "sumber_bendungan": "PUPR Pusdatin SIGI, Hosted/Data_Bendungan (sigi.pu.go.id/serverpu/rest/services/Hosted/Data_Bendungan/FeatureServer/0)",
        "sumber_embung": "PUPR Pusdatin SIGI, Hosted/Embung_2025 (sigi.pu.go.id/serverpu/rest/services/Hosted/Embung_2025/FeatureServer)",
        "kolom_bendungan": ["lon", "lat", "nama", "das", "prov", "kab", "volume_juta_m3", "tinggi_m", "tahun", "pengelola", "status_operasi"],
        "kolom_embung": ["lon", "lat", "nama", "kelurahan", "kecamatan", "kab", "prov", "kewenangan"], "bendungan": b, "embung": e})
    p = pos(json.load(open(a[2])), json.load(open(a[3])))
    simpan(os.path.join(KELUAR, "pos_pu.json"), {
        "tanggal": tgl, "sumber": "PUPR: SIHKA telemetry-list (sihka.sda.pu.go.id/api/v1s/telemetry-list) untuk pos duga air; SIGI sigi_postgis/ast_sihka_klimatologi untuk pos klimatologi dan curah hujan",
        "catatan": "Hanya lokasi. Nilai tidak dimuat karena satuan tinggi muka air SIHKA tidak seragam.", "kolom": ["lon", "lat", "nama", "jenis(d=duga air, k=klimatologi)", "das"], "pos": p})
    print(f"bendungan {len(b)}, embung {len(e)}, pos {len(p)}")


def uji():
    assert len(bendungan([{"nama": "A", "lat": 1, "lon": 100, "volume_juta_m3": None}, {"nama": "B", "lat": None, "lon": 1}])) == 1
    assert bendungan([{"nama": "A", "lat": 1, "lon": 100}])[0][6] is None
    gj = {"features": [{"properties": {"nama": "E"}, "geometry": {"coordinates": [111, -7]}}, {"properties": {}, "geometry": {"coordinates": [0, 0]}}]}
    assert len(embung(gj)) == 1
    p = pos([{"nama": "SUNGAI X", "lat": -2, "lon": 107}, {"nama": "SUNGAI X", "lat": -2, "lon": 107}], {"features": [{"properties": {"name": "AAWS Y"}, "geometry": {"coordinates": [118, -8]}}]})
    assert [x[3] for x in p] == ["d", "k"] and p[0][2] == "Sungai X"
    print("bangun_pu uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1:])
