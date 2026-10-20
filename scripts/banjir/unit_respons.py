"""Unit respons banjir (Basarnas, pos SAR, BPBD) -> public/banjir/data/unit_respons.json. Statis, jalan bulanan.

Sumber: OpenStreetMap via Overpass (ODbL, (c) kontributor OpenStreetMap): emergency=disaster_response|rescue_station|
ses_station|water_rescue|mountain_rescue, dan office=government yang namanya memuat Basarnas / Kantor SAR / BPBD /
Penanggulangan Bencana; ditambah 324 kantor BPBD BNPB (public/data/bpbd.json, peta_bpbd gis.bnpb.go.id).
emergency=lifeguard (penjaga pantai wisata), hydrant, telepon, dan defibrilator sengaja tidak diambil: bukan unit tanggap banjir.
Kantor BPBD OSM yang berjarak < 0,6 km dari kantor BNPB dianggap sama (BNPB menang, nomornya Pusdalops).

{"dibuat", "sumber": [..], "unit": [{"j": "basarnas"|"pos"|"bpbd", "n": nama, "lat", "lon", "t"?: telepon, "a"?: alamat}]}
Cakupan OSM tidak lengkap dan nomor tidak diverifikasi: layar menulisnya begitu.
Berkas lama tidak ditimpa bila hasil baru kosong atau kurang dari separuhnya (Overpass sering menjawab sebagian).

Pakai:  python3 scripts/banjir/unit_respons.py   |   python3 scripts/banjir/unit_respons.py uji
"""
import json, math, os, re, sys, time, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from umum import AKAR, KELUAR, WIB, simpan
import datetime as dt

JALUR = os.path.join(KELUAR, "unit_respons.json")
BPBD_BNPB = os.path.join(AKAR, "public/data/bpbd.json")
SERVER = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
KUERI = """[out:json][timeout:180];
area["ISO3166-1"="ID"]->.a;
(nwr["emergency"~"^(disaster_response|rescue_station|ses_station|water_rescue|mountain_rescue)$"](area.a);
 nwr["office"="government"]["name"~"Basarnas|Badan SAR|Search and Rescue|Kantor SAR|Pos SAR|BPBD|Penanggulangan Bencana",i](area.a););
out center tags;"""
RE_SAR = re.compile(r"basarnas|badan sar|search and rescue|kantor sar|pos sar|pencarian dan pertolongan", re.I)
RE_BPBD = re.compile(r"bpbd|penanggulangan bencana", re.I)
SAMA_KM = 0.6


def jarak(a, b, c, d):
    r = math.pi / 180
    x = math.sin((c - a) * r / 2) ** 2 + math.cos(a * r) * math.cos(c * r) * math.sin((d - b) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def unduh():
    if os.environ.get("UNIT_MENTAH"):  # respons Overpass tersimpan (uji lokal tanpa jaringan)
        return json.load(open(os.environ["UNIT_MENTAH"]))["elements"]
    data = urllib.parse.urlencode({"data": KUERI}).encode()
    for coba in range(8):
        url = SERVER[coba % len(SERVER)]
        try:
            req = urllib.request.Request(url, data, headers={"User-Agent": "poskobanjir/1.0 (pantau bencana; unit respons)"})
            j = json.loads(urllib.request.urlopen(req, timeout=240).read())
            if "elements" in j and not (j.get("remark") or "").startswith("runtime error"):
                return j["elements"]
        except Exception as e:
            print(f"  gagal {url}: {e}", file=sys.stderr)
        time.sleep(min(20 * (coba + 1), 120))
    raise SystemExit("Overpass menyerah; berkas lama dibiarkan")


def dari_osm(el):
    """Elemen Overpass -> unit, atau None (tanpa titik / bukan unit tanggap)."""
    t = el.get("tags") or {}
    lat, lon = el.get("lat"), el.get("lon")
    if lat is None:
        c = el.get("center") or {}
        lat, lon = c.get("lat"), c.get("lon")
    if lat is None or lon is None:
        return None
    nama = (t.get("name") or t.get("name:id") or "").strip()
    teks = nama + " " + (t.get("operator") or "")
    if RE_SAR.search(teks):
        j = "basarnas" if re.search(r"basarnas|kantor|badan", teks, re.I) and not re.search(r"\bpos\b", teks, re.I) else "pos"
    elif RE_BPBD.search(teks):
        j = "bpbd"
    elif t.get("emergency") in ("disaster_response", "rescue_station", "ses_station", "water_rescue", "mountain_rescue"):
        j = "pos"
        nama = nama or {"disaster_response": "Pos tanggap bencana", "rescue_station": "Pos penyelamatan", "ses_station": "Pos SAR",
                        "water_rescue": "Pos penyelamatan air", "mountain_rescue": "Pos SAR gunung"}.get(t["emergency"], "Pos tanggap")
    else:
        return None
    if not nama:
        return None
    u = {"j": j, "n": nama, "lat": round(lat, 5), "lon": round(lon, 5)}
    tel = t.get("phone") or t.get("contact:phone")
    if tel:
        u["t"] = tel.strip()[:40]
    return u


def gabung(osm, bnpb):
    """BNPB dulu; BPBD OSM yang berdekatan dengan kantor BNPB dibuang; duplikat OSM (nama sama, < 0,6 km) dibuang."""
    out = [{"j": "bpbd", "n": b["nama"].strip(), "lat": round(b["lat"], 5), "lon": round(b["lon"], 5),
            **({"t": b["pusdalops"]} if b.get("pusdalops") else {}), **({"a": b["alamat"][:90]} if b.get("alamat") else {})} for b in bnpb if b.get("lat") and b.get("lon")]
    kantor = list(out)
    for u in osm:
        if u["j"] == "bpbd" and any(jarak(u["lat"], u["lon"], k["lat"], k["lon"]) < SAMA_KM for k in kantor):
            continue
        if any(o["j"] == u["j"] and o["n"].lower() == u["n"].lower() and jarak(u["lat"], u["lon"], o["lat"], o["lon"]) < SAMA_KM for o in out):
            continue
        out.append(u)
    return out


def main():
    osm = [u for u in map(dari_osm, unduh()) if u]
    bnpb = json.load(open(BPBD_BNPB)).get("kantor", []) if os.path.exists(BPBD_BNPB) else []
    unit = gabung(osm, bnpb)
    if not osm:
        sys.exit("Overpass menjawab kosong; berkas lama dibiarkan")
    if os.path.exists(JALUR):
        lama = json.load(open(JALUR)).get("unit", [])
        if len(unit) < len(lama) / 2:
            sys.exit(f"hasil baru {len(unit)} unit < separuh berkas lama {len(lama)}; tidak ditimpa")
    simpan(JALUR, {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%d"), "sumber": ["OpenStreetMap (ODbL)", "BNPB peta_bpbd"], "unit": unit})
    por = {j: sum(1 for u in unit if u["j"] == j) for j in ("basarnas", "pos", "bpbd")}
    print(f"unit_respons: {len(unit)} unit {por}; dari OSM {len(osm)}", file=sys.stderr)


def uji():
    sar = dari_osm({"type": "node", "lat": -8.63, "lon": 116.1, "tags": {"name": "Kantor SAR NTB", "office": "government"}})
    assert sar["j"] == "basarnas", sar
    pos = dari_osm({"type": "node", "lat": -7.9, "lon": 110.5, "tags": {"name": "POS BASARNAS GUNUNGKIDUL", "emergency": "lifeguard"}})
    assert pos["j"] == "pos", pos
    bp = dari_osm({"type": "way", "center": {"lat": -7.7, "lon": 110.3}, "tags": {"name": "BPBD Sleman", "office": "government"}})
    assert bp["j"] == "bpbd" and bp["lat"] == -7.7
    assert dari_osm({"type": "node", "lat": 1, "lon": 1, "tags": {"emergency": "fire_hydrant"}}) is None
    assert dari_osm({"type": "node", "lat": 1, "lon": 1, "tags": {"emergency": "ses_station"}})["n"] == "Pos SAR"
    bnpb = [{"nama": "BPBD KAB. SLEMAN", "lat": -7.7005, "lon": 110.3, "pusdalops": "0274-1"}]
    g = gabung([bp, {**bp, "lat": -7.0, "n": "BPBD Sleman Utara"}, sar, dict(sar)], bnpb)
    assert [u["n"] for u in g] == ["BPBD KAB. SLEMAN", "BPBD Sleman Utara", "Kantor SAR NTB"], g
    print("ok unit_respons")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
