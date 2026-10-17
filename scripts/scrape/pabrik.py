"""Pabrik kelapa sawit + pulp Indonesia -> public/data/pabrik_sawit.json (untuk pencarian & penyangga 10/25/50 km di layar).

Sumber (keduanya CC BY 4.0, koordinat sudah ada, tanpa perlu Universal Mill List):
- sawit : Trase "Indonesia - Palm Oil Mills (1922-2025)", https://trase.earth/open-data/datasets/indonesia-palm-oil-mills
          unduhan https://resources.trase.earth/data/facilities-data/IDN_PO_mills_clean.geo.json (kapasitas ton TBS/jam)
- pulp  : Trase "Indonesia - Wood pulp mills (2025)", https://trase.earth/open-data/datasets/indonesia-wood-pulp-mills
          unduhan https://resources.trase.earth/data/facilities-data/id_wood_mills_facilities_v2026_02_10.geo.json (kapasitas juta ton/tahun)
Trase tidak memuat status RSPO/ISPO: rspo & ispo selalu null (tidak dikarang).

Pakai:  python3 scripts/scrape/pabrik.py        # unduh (bila belum di cache) + bangun + uji
        python3 scripts/scrape/pabrik.py --uji  # uji berkas hasil saja (tanpa jaringan)
"""
import datetime as dt, json, os, re, sys, urllib.request

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
MENTAH = os.path.join(AKAR, "data/raw/pabrik")
KELUAR = os.path.join(AKAR, "public/data/pabrik_sawit.json")
SUMBER = {
    "trase_po_mills.geo.json": "https://resources.trase.earth/data/facilities-data/IDN_PO_mills_clean.geo.json",
    "trase_wood_mills.geo.json": "https://resources.trase.earth/data/facilities-data/id_wood_mills_facilities_v2026_02_10.geo.json",
}
BBOX = (94.5, -11.5, 141.5, 6.5)  # Indonesia
TETAP = {"PT", "CV", "TBK", "KSO", "PTPN", "KUD", "PMKS", "PKS", "UD", "PD", "KPPN", "SMS", "BGA", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI"}
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))


def tc(s):
    """'ABDI BUDI MULIA 1' -> 'Abdi Budi Mulia 1'; singkatan badan usaha tetap kapital."""
    s = " ".join((s or "").replace("PT.", "PT ").split()).strip(" ,.")
    if not s or not s.isupper():
        return s or None
    return " ".join(w if w in TETAP else "-".join(p.capitalize() for p in w.split("-")) for w in s.split())


def unduh():
    os.makedirs(MENTAH, exist_ok=True)
    for nama, url in SUMBER.items():
        j = os.path.join(MENTAH, nama)
        if not os.path.exists(j):
            req = urllib.request.Request(url, headers={"User-Agent": "pantau-bencana/1.0"})
            open(j, "wb").write(urllib.request.urlopen(req, timeout=120).read())


def bangun():
    from wilayah import Wilayah, PROVINSI
    w = Wilayah()
    kode_nama = {v.upper().replace("KEP. ", "KEPULAUAN ").replace("DI YOGYAKARTA", "DAERAH ISTIMEWA YOGYAKARTA"): k for k, v in PROVINSI.items()}
    kode_nama.update({"KEPULAUAN BANGKA BELITUNG": "19", "BANGKA BELITUNG": "19", "DKI JAKARTA": "31", "YOGYAKARTA": "34"})
    hasil, luar = [], 0
    for jenis, berkas in (("sawit", "trase_po_mills.geo.json"), ("pulp", "trase_wood_mills.geo.json")):
        for f in json.load(open(os.path.join(MENTAH, berkas)))["features"]:
            p = f["properties"]
            lon, lat = f["geometry"]["coordinates"][:2]
            if jenis == "sawit":
                id_, nama, per, grup = p["trase_code"], p["mill_name"], p["company"], p["group"]
                kap, tahun, kab, pn = p["capacity_tonnes_ffb_hour"], p["earliest_year_of_existence"], p["kabupaten_name"], p["province_name"]
                aktif = p["active"] == "Operating"
            else:
                id_, nama, per, grup = p["trase_id"], p["mill_name"], p["company_name"], p["mill_corporate_group"]
                kap, tahun, kab, pn = p["processing_capacity_mt_per_year"], p["year_started_operating"], None, p["province"]
                aktif = True
            if not aktif:
                continue  # pabrik yang sudah tidak beroperasi tidak dicari
            r = w.cari(lon, lat)
            if r:
                prov, kab = r[0], r[1]
            else:  # titik di pantai/laut menurut batas sederhana: pakai atribut Trase
                luar += 1
                prov = kode_nama.get((pn or "").upper())
                kab = tc(kab) if kab else None
            hasil.append({"id": id_, "nama": tc(nama), "perusahaan": tc(per), "grup": tc(grup) if grup and grup.upper() not in ("UNKNOWN", "") else None,
                          "jenis": jenis, "lat": round(lat, 5), "lon": round(lon, 5), "prov": prov, "kab": kab,
                          "kapasitas": kap, "kapasitas_satuan": "ton TBS/jam" if jenis == "sawit" else "juta ton/tahun",
                          "rspo": None, "ispo": None, "tahun": int(tahun) if tahun else None})
    hasil.sort(key=lambda m: (m["prov"] or "", m["nama"] or ""))
    out = {"sumber": "Trase (trase.earth/open-data): Indonesia Palm Oil Mills (1922-2025) + Indonesia Wood pulp mills (2025); koordinat, kapasitas, tahun dari Trase",
           "lisensi": "CC BY 4.0", "versi": "palm-oil-mills 1922-2025; wood-mills v2026-02-10", "dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
           "n": len(hasil), "pabrik": hasil}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(hasil)} pabrik, {luar} titik jatuh di luar batas (prov dari atribut Trase)")


def uji():
    d = json.load(open(KELUAR))
    m = d["pabrik"]
    assert d["n"] == len(m) > 1000, f"jumlah pabrik {len(m)}"
    ids = [x["id"] for x in m]
    assert len(ids) == len(set(ids)), "id ganda"
    for x in m:
        assert BBOX[0] <= x["lon"] <= BBOX[2] and BBOX[1] <= x["lat"] <= BBOX[3], f"{x['id']} di luar Indonesia: {x['lat']},{x['lon']}"
        assert x["prov"], f"{x['id']} {x['nama']} tanpa prov"
        assert x["nama"] and x["jenis"] in ("sawit", "pulp"), x["id"]
    from collections import Counter
    pv = Counter(x["prov"] for x in m).most_common(5)
    g = sum(1 for x in m if x["grup"]) * 100 // len(m)
    print(f"lolos: {len(m)} pabrik ({Counter(x['jenis'] for x in m)}), prov teratas {pv}, grup terisi {g}%, {os.path.getsize(KELUAR)//1024} KB")


if __name__ == "__main__":
    if "--uji" not in sys.argv:
        unduh()
        bangun()
    uji()
