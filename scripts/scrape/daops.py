"""Daops Manggala Agni -> public/data/daops.json. stdlib only.
Sumber: opsroom.sipongidata.my.id/api/data/daerah (dipanggil halaman SiPongi hard-manggala-agni).
Koordinat: Nominatim (1 req/s). Alamat dipakai bila jatuh <=40 km dari ibu kota kab; selain itu kota."""
import json, math, re, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/raw/daops"
SRC = "https://opsroom.sipongidata.my.id/api/data/daerah"
UA = {"User-Agent": "poskokarhutla/1.0"}
# kode daops -> (prov Kemendagri, kabupaten/kota, kueri ibu kota kab, balai PPIKHL). Dikurasi tangan.
S, K, SL = "Balai PPIKHL Sumatera", "Balai PPIKHL Kalimantan", "Balai PPIKHL Sulawesi"
M = {
 "PST-01": ("12", "Simalungun", "Pematang Raya, Simalungun", S),
 "LBT-01": ("12", "Labuhanbatu Selatan", "Kotapinang, Labuhanbatu Selatan", S),
 "SBL-01": ("12", "Deli Serdang", "Lubuk Pakam, Deli Serdang", S),
 "PKU-02": ("14", "Siak", "Minas, Siak", S),
 "SSI-02": ("14", "Siak", "Siak Sri Indrapura", S),
 "DMI-02": ("14", "Kota Dumai", "Dumai", S),
 "RGT-02": ("14", "Indragiri Hulu", "Pematang Reba, Indragiri Hulu", S),
 "BTM-02": ("21", "Kota Batam", "Batam", S),
 "KJB-03": ("15", "Kota Jambi", "Jambi", S),
 "MBL-03": ("15", "Batanghari", "Muara Bulian, Batanghari", S),
 "SRL-03": ("15", "Sarolangun", "Sarolangun", S),
 "MTB-03": ("15", "Tebo", "Muara Tebo, Tebo", S),
 "PTK-04": ("61", "Kubu Raya", "Rasau Jaya, Kubu Raya", K),
 "STG-04": ("61", "Sintang", "Sintang", K),
 "SKW-04": ("61", "Kota Singkawang", "Singkawang", K),
 "KTP-04": ("61", "Ketapang", "Ketapang, Kalimantan Barat", K),
 "SMT-04": ("61", "Kapuas Hulu", "Putussibau, Kapuas Hulu", K),
 "PLK-05": ("62", "Kota Palangka Raya", "Palangka Raya", K),
 "KPS-05": ("62", "Kapuas", "Kuala Kapuas", K),
 "MTW-05": ("62", "Barito Utara", "Muara Teweh", K),
 "PKB-05": ("62", "Kotawaringin Barat", "Pangkalan Bun", K),
 "GWA-06": ("73", "Gowa", "Sungguminasa, Gowa", SL),
 "MLI-06": ("73", "Gowa", "Sungguminasa, Gowa", SL),
 "TNL-07": ("63", "Tanah Laut", "Pelaihari, Tanah Laut", K),
 "TNB-07": ("63", "Tanah Bumbu", "Batulicin, Tanah Bumbu", K),
 "BNS-08": ("16", "Banyuasin", "Pangkalan Balai, Banyuasin", S),
 "MBS-08": ("16", "Musi Banyuasin", "Sekayu, Musi Banyuasin", S),
 "OKI-08": ("16", "Ogan Komering Ilir", "Kayu Agung, Ogan Komering Ilir", S),
 "LHT-08": ("16", "Lahat", "Lahat", S),
}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read()

def geo(q):
    time.sleep(1.1)
    u = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q=" + urllib.parse.quote(q)
    (RAW / ("nominatim_" + re.sub(r"\W+", "_", q)[:60] + ".json")).write_bytes(b := get(u))
    j = json.loads(b)
    return (float(j[0]["lat"]), float(j[0]["lon"])) if j else None

def km(a, b):
    p = math.pi / 180
    h = math.sin((b[0]-a[0])*p/2)**2 + math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin((b[1]-a[1])*p/2)**2
    return 12742 * math.asin(math.sqrt(h))

def main():
    RAW.mkdir(parents=True, exist_ok=True)
    raw = get(SRC); (RAW / "daerah.json").write_bytes(raw)
    out = []
    for grp in json.loads(raw):
        for k in grp["kota"]:
            m = re.match(r"(.*) \((\w+-\d+)\)", k["daerah"]); nama, kode = m.group(1), m.group(2)
            prov, kab, seat_q, balai = M[kode]
            seat = geo(seat_q) or geo(kab)
            if not seat: raise SystemExit('tak ketemu: ' + kode)
            alamat = k["alamat"].strip(" <")
            pt = geo(alamat + ", " + kab)
            if pt and seat and km(pt, seat) <= 40: presisi = "alamat"
            else: pt, presisi = seat, "kota"
            out.append({"nama": "Daops " + nama, "kode": kode, "balai": balai, "brigdal": grp["daerah"],
                        "prov": prov, "kab": kab, "alamat": alamat, "regu": k.get("jumlah_regu"), "anggota": k.get("jumlah_anggota"),
                        "lat": round(pt[0], 5), "lon": round(pt[1], 5), "sumber": SRC, "presisi": presisi})
    (ROOT / "public/data/daops.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(len(out), sum(o["presisi"] == "alamat" for o in out), "alamat")

if __name__ == "__main__":
    main()
