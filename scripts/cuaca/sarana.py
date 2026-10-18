"""Sarana pelabuhan dan bandara (statis, dibangun sekali) -> public/banjir/data/cuaca_sarana.json

  pelabuhan  OpenStreetMap lewat Overpass (landuse/industrial=port, harbour=yes, ber-nama), titik dalam 3 km bernama sama digabung.
             jenis: perikanan, penyeberangan, marina, umum (dari nama dan tag seamark); provinsi dari poligon kecamatan.
  bandara    OurAirports (domain publik), jenis large/medium airport, negara ID, penerbangan terjadwal.
Pakai: python3 scripts/cuaca/sarana.py [--bangun]   |   python3 scripts/cuaca/sarana.py uji
Berkas yang sudah ada tidak dibangun ulang kecuali `paksa`; sumber yang gagal membuat bagiannya kosong dan ditulis di "gagal".
"""
import csv, io, json, os, re, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, baca, jarak_km, simpan, titik_terdekat

UA = "poskobanjir/1.0 (pantaubencana)"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
Q = ('[out:json][timeout:90];area["ISO3166-1"="ID"]->.a;(nwr["landuse"="port"]["name"](area.a);nwr["industrial"="port"]["name"](area.a);'
     'nwr["harbour"="yes"]["name"](area.a););out center tags;')
BANDARA = "https://davidmegginson.github.io/ourairports-data/airports.csv"


def jenis(nama, tags):
    n = (nama + " " + tags.get("seamark:harbour:category", "")).lower()
    if re.search(r"ikan|nelayan|fishing|\bppi\b|\bpph\b|\bpps\b|\bppn\b", n):
        return "perikanan"
    if re.search(r"ferry|feri|penyeberangan|asdp|ro-?ro", n):
        return "penyeberangan"
    if "marina" in n:
        return "marina"
    return "umum"


_KATA_ID = re.compile(r"\b(pelabuhan|terminal|dermaga|ppi|pph|pps|ppn|pelindo|pelni|pelra|pangkalan|tpi)\b", re.I)


def nama_pelabuhan(nama, tags=None):
    """Nama tampil bahasa Indonesia: name:id bila ada; nama Inggris OSM ('Benoa Port', 'Boats from Kalipucang') diubah ke 'Pelabuhan X';
    nama lokal tanpa kata pelabuhan/terminal/dermaga diberi awalan 'Pelabuhan'. Idempoten."""
    n = ((tags or {}).get("name:id") or nama or "").strip()
    for pola in (r"^(?:Speed)?[Bb]oats? (?:from|to) (.+)$", r"^(?:Cargo )?Port (?:of|de) (.+)$", r"^(.+?)\s+(?:Dry |Container |Cargo )?(?:Port|Harbou?r)$"):
        m = re.match(pola, n)
        if m:
            return "Pelabuhan " + m[1].strip()
    return n if not n or _KATA_ID.search(n) else "Pelabuhan " + n


def gabung(el):
    """Elemen Overpass -> [[nama, lat, lon, jenis]] tanpa duplikat (nama sama dalam 3 km)."""
    out = []
    for e in el:
        t = e.get("tags", {})
        la, lo = e.get("lat") or (e.get("center") or {}).get("lat"), e.get("lon") or (e.get("center") or {}).get("lon")
        nama = (t.get("name") or "").strip()
        if not nama or la is None or lo is None:
            continue
        tampil = nama_pelabuhan(nama, t)
        if any(o[0].lower() == tampil.lower() and jarak_km(la, lo, o[1], o[2]) < 3 for o in out):
            continue
        out.append([tampil, round(la, 4), round(lo, 4), jenis(nama, t)])
    return sorted(out, key=lambda r: (r[1], r[2]))


def unduh(url, data=None, coba=3):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers={"User-Agent": UA}), timeout=150) as r:
                return r.read()
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url}: {e}")
            time.sleep(10 * (i + 1))


def bandara(teks):
    """CSV OurAirports -> [[kode, nama, lat, lon]] (provinsi diisi pemanggil)."""
    out = []
    for r in csv.DictReader(io.StringIO(teks)):
        if r["iso_country"] == "ID" and r["type"] in ("large_airport", "medium_airport") and r["scheduled_service"] == "yes":
            out.append([r["icao_code"] or r["ident"], r["name"], round(float(r["latitude_deg"]), 4), round(float(r["longitude_deg"]), 4)])
    return sorted(out)


def migrasi_nama():
    """Terapkan nama_pelabuhan pada cuaca_sarana.json yang ada, tanpa unduh dan tanpa mengubah urutan (indeks dampak tetap)."""
    jalur = os.path.join(KELUAR, "cuaca_sarana.json")
    d = baca(jalur)
    for r in d["pelabuhan"]:
        r[0] = nama_pelabuhan(r[0])
    simpan(jalur, d)
    print(f"cuaca sarana: {len(d['pelabuhan'])} nama pelabuhan dirapikan", file=sys.stderr)


def main(paksa=False):
    jalur = os.path.join(KELUAR, "cuaca_sarana.json")
    if baca(jalur) and not paksa:
        return
    from wilayah import Wilayah
    w = Wilayah()
    pusat = [(v[0], v[1], k.split("|")[0]) for k, v in (baca(os.path.join(KELUAR, "pusat_kec.json")) or {}).items()]

    def prov(la, lo):  # titik pelabuhan sering jatuh sedikit di laut dari poligon kecamatan: pakai kecamatan terdekat (<= 25 km)
        m = w.cari(lo, la)
        if m:
            return m[0]
        i = titik_terdekat(pusat, la, lo, 25)
        return pusat[i[0]][2] if i else ""
    gagal, pel, bdr = [], [], []
    try:
        for s in OVERPASS:
            try:
                pel = gabung(json.loads(unduh(s, ("data=" + urllib.parse.quote(Q)).encode()))["elements"])
                break
            except Exception as e:
                err = e
        else:
            raise err
    except Exception as e:
        gagal.append(f"pelabuhan: {e}")
    try:
        bdr = bandara(unduh(BANDARA).decode())
    except Exception as e:
        gagal.append(f"bandara: {e}")
    lama = baca(jalur) or {}
    pel = [[n, la, lo, prov(la, lo), j] for n, la, lo, j in pel if prov(la, lo)] or lama.get("pelabuhan", [])
    bdr = [[k, n, la, lo, prov(la, lo)] for k, n, la, lo in bdr if prov(la, lo)] or lama.get("bandara", [])
    if not pel and not bdr:
        raise RuntimeError("sarana: dua sumber gagal " + "; ".join(gagal))
    out = {"pelabuhan": pel, "bandara": bdr, "sumber": {"pelabuhan": "OpenStreetMap contributors (ODbL), via Overpass", "bandara": "OurAirports (domain publik)"}}
    if gagal:
        out["gagal"] = gagal
    simpan(jalur, out)
    print(f"cuaca sarana: {len(pel)} pelabuhan, {len(bdr)} bandara; gagal {gagal}", file=sys.stderr)


def uji():
    el = [{"tags": {"name": "Benoa", "harbour": "yes"}, "lat": -8.74, "lon": 115.2},
          {"tags": {"name": "BENOA", "landuse": "port"}, "center": {"lat": -8.741, "lon": 115.201}},   # duplikat
          {"tags": {"name": "PPI Muara Baru"}, "lat": -6.1, "lon": 106.8}, {"tags": {"landuse": "port"}, "lat": 1, "lon": 1},
          {"tags": {"name": "Pelabuhan Penyeberangan Merak"}, "lat": -5.9, "lon": 106.0}]
    g = gabung(el)
    assert [r[0] for r in g] == ["Pelabuhan Benoa", "PPI Muara Baru", "Pelabuhan Penyeberangan Merak"] and g[0][3] == "umum", g
    assert nama_pelabuhan("Benoa Port") == "Pelabuhan Benoa" and nama_pelabuhan("Boats from Kalipucang") == "Pelabuhan Kalipucang"
    assert nama_pelabuhan("Cargo Port of Bakauheni") == "Pelabuhan Bakauheni" and nama_pelabuhan("Port of Teluk Bayur") == "Pelabuhan Teluk Bayur"
    assert nama_pelabuhan("Mawi") == "Pelabuhan Mawi" and nama_pelabuhan("Terminal Petikemas Makassar") == "Terminal Petikemas Makassar"
    assert nama_pelabuhan("Benoa Port", {"name:id": "Pelabuhan Benoa Bali"}) == "Pelabuhan Benoa Bali" and nama_pelabuhan("Pelabuhan Sanur") == "Pelabuhan Sanur"
    assert nama_pelabuhan(nama_pelabuhan("Benoa Port")) == "Pelabuhan Benoa"   # idempoten
    assert [r[3] for r in g[1:]] == ["perikanan", "penyeberangan"]
    csv_ = "icao_code,ident,type,name,latitude_deg,longitude_deg,iso_country,scheduled_service\nWIII,WIII,large_airport,Soekarno-Hatta,-6.1,106.6,ID,yes\n,X1,small_airport,Kecil,0,0,ID,no\nYSSY,YSSY,large_airport,Sydney,-33,151,AU,yes\n"
    assert bandara(csv_) == [["WIII", "Soekarno-Hatta", -6.1, 106.6]]
    print("ok sarana")


if __name__ == "__main__":
    if sys.argv[1:] == ["--nama"]:
        migrasi_nama()
        sys.exit()
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1:] in (["paksa"], ["--bangun"]))
