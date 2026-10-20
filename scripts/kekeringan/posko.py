"""Posko air bersih dan kebutuhan tangki kekeringan -> public/data/posko_kekeringan.json (rantai terakhir status.py; tanpa jaringan)

Pola scripts/banjir/posko.py (greedy: kecamatan paling tinggi tingkatnya jadi posko, kecamatan lain dalam GABUNG_KM satu kabupaten ikut dilayani; pos kabupaten =
kantor BPBD bila namanya cocok):
  bahan   kekeringan_grid.json (tingkat sel) + penduduk.json + banjir/data/pusat_kec.json -> tingkat tiap kecamatan (sel terdekat, sama dengan status.py);
          bpbd.json (kantor), public/kekeringan/data/embung.json (jumlah tampungan OSM per kabupaten, kasar).
  posko   satu per gugus kecamatan Siaga/Awas yang berdekatan (<= GABUNG_KM) dalam satu kabupaten.
  air     LITER_ORANG_HARI = 15: batas minimum kebutuhan air minum, masak, dan kebersihan dasar (Sphere Handbook 2018, Water Supply Standard 2.1, "Water use and quantity").
  tangki  rit sehari = ceil(liter / KAP_TANGKI_L). KAP_TANGKI_L = 5.000 L adalah ASUMSI kami untuk truk tangki air satu rit, bukan data armada BPBD: ganti konstanta bila ada data.
BATAS ATAS: kebutuhan dihitung untuk SEMUA penduduk kecamatan berstatus (WorldPop), padahal tidak semua kehilangan sumber air. Angka ini ukuran skala logistik, bukan jumlah
penerima. Sumber air terdekat tidak dimodelkan; jumlah embung OSM per kabupaten hanya konteks (nol bukan bukti tak ada tampungan).
Pakai:  python3 scripts/kekeringan/posko.py      |  python3 scripts/kekeringan/posko.py uji
"""
import datetime as dt, importlib.util as _iu, json, math, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan
import hth as H
_sp = _iu.spec_from_file_location("banjir_posko", os.path.join(AB, "..", "banjir", "posko.py"))   # nama "posko" bentrok dengan berkas ini
BP = _iu.module_from_spec(_sp)
_sp.loader.exec_module(BP)

AKAR = H.AKAR
DATA = H.DIR_DATA
GABUNG_KM = 15.0
LITER_ORANG_HARI = 15
KAP_TANGKI_L = 5000
SIAGA = 2
LV = {2: "Siaga", 3: "Awas"}


def tangki(jiwa):
    return math.ceil(jiwa * LITER_ORANG_HARI / KAP_TANGKI_L)


def gabung(kec, pusat, radius=GABUNG_KM):
    """kec: [(kunci, level, jiwa)] satu kabupaten. Greedy: urut level turun lalu jiwa turun; yang <= radius km dari posko ikut."""
    sisa = sorted(kec, key=lambda x: (-x[1], -x[2], x[0]))
    out = []
    while sisa:
        k, lv, _ = sisa.pop(0)
        la, lo = pusat[k]
        ikut = [x for x in sisa if BP.km(la, lo, *pusat[x[0]]) <= radius]
        sisa = [x for x in sisa if x not in ikut]
        out.append((k, lv, [k] + [x[0] for x in ikut]))
    return out


def tingkat_kec(grid, penduduk, pusat):
    """{kunci_kec: tingkat sel terdekat} untuk kecamatan yang punya titik tengah dan sel bertingkat."""
    peta = {(round(g[0], 2), round(g[1], 2)): g[7] for g in grid["grid"] if g[7] is not None}
    out = {}
    for kk in penduduk["kec"]:
        a = pusat.get(kk)
        c = H.sel_terdekat(peta, a[0], a[1]) if a else None
        if c:
            out[kk] = peta[c]
    return out


def bangun(grid, penduduk, pusat, bpbd, embung, hari):
    lv = tingkat_kec(grid, penduduk, pusat)
    per_kab = {}
    for kk, l in lv.items():
        if l >= SIAGA and kk in pusat:
            per_kab.setdefault("|".join(kk.split("|")[:2]), []).append((kk, l, penduduk["kec"][kk]))
    kantor = {}
    for b in bpbd.get("kantor", []):
        kantor.setdefault(BP.norm(b["nama"]), []).append(b)
    lap, kab = [], []
    for kb, kec in sorted(per_kab.items()):
        mine = []
        for k, l, layan in gabung(kec, pusat):
            jiwa = sum(penduduk["kec"][x] for x in layan)
            la, lo = pusat[k]
            p = {"id": f"A{len(lap) + len(mine) + 1:04d}", "kab": kb, "kec": k.split("|")[2], "lat": la, "lon": lo, "lv": l, "kec_n": len(layan),
                 "layan": [x.split("|")[2] for x in layan[:6]], "jiwa": jiwa, "liter": jiwa * LITER_ORANG_HARI, "tangki": tangki(jiwa)}
            mine.append(p)
        jiwa = sum(p["jiwa"] for p in mine)
        nama = kb.split("|")[1]
        la = sum(p["lat"] * p["jiwa"] for p in mine) / max(1, jiwa)
        lo = sum(p["lon"] * p["jiwa"] for p in mine) / max(1, jiwa)
        bp = next((b for b in kantor.get(BP.norm(nama), []) if BP.km(la, lo, b["lat"], b["lon"]) <= 200), None)
        y = {"kab": kb, "nama": nama, "prov": kb[:2], "lv": max(p["lv"] for p in mine), "posko": [p["id"] for p in mine], "kec_n": sum(p["kec_n"] for p in mine), "jiwa": jiwa,
             "liter": jiwa * LITER_ORANG_HARI, "tangki": tangki(jiwa), "embung": (embung.get("kab") or {}).get(kb)}
        if bp:
            y["bpbd"] = {"nama": bp["nama"], "lat": bp["lat"], "lon": bp["lon"], "alamat": bp.get("alamat"), "pusdalops": bp.get("pusdalops")}
        lap += mine
        kab.append(y)
    prov = {}
    for y in kab:
        p = prov.setdefault(y["prov"], {"kab": 0, "posko": 0, "jiwa": 0, "liter": 0, "tangki": 0})
        p["kab"] += 1; p["posko"] += len(y["posko"]); p["jiwa"] += y["jiwa"]; p["liter"] += y["liter"]; p["tangki"] += y["tangki"]
    jiwa = sum(y["jiwa"] for y in kab)
    return {"dibuat": dt.datetime.now(H.WIB).isoformat(timespec="minutes"), "hari": hari, "label": "Deteksi Pantau Bencana",
            "param": {"liter_orang_hari": LITER_ORANG_HARI, "kap_tangki_l": KAP_TANGKI_L, "gabung_km": GABUNG_KM, "kelok": BP.KELOK, "laju_kmj": BP.LAJU},
            "nasional": {"kab": len(kab), "posko": len(lap), "kec": sum(p["kec_n"] for p in lap), "jiwa": jiwa, "liter": jiwa * LITER_ORANG_HARI, "tangki": sum(y["tangki"] for y in kab),
                         "tangki_posko": sum(p["tangki"] for p in lap)},
            "sumber": {"liter": "Sphere Handbook 2018, Water Supply Standard 2.1: minimum 15 liter per orang per hari",
                       "tangki": f"Asumsi kami: satu truk tangki {KAP_TANGKI_L:,} liter per rit; bukan data armada BPBD".replace(",", "."),
                       "jiwa": "WorldPop 2026, semua penduduk kecamatan Siaga atau Awas (batas atas: tidak semuanya kehilangan sumber air)",
                       "pos": "Kantor BPBD kabupaten dari BNPB peta_bpbd bila namanya cocok; embung = jumlah objek OpenStreetMap per kabupaten (kasar, tidak lengkap)"},
            "prov": prov, "kabupaten": sorted(kab, key=lambda y: (-y["lv"], -y["jiwa"], y["kab"])), "posko": lap}


def main():
    r = lambda f: baca(os.path.join(DATA, f))
    grid, penduduk = r("kekeringan_grid.json"), r("penduduk.json")
    if not grid or not penduduk:
        sys.exit("posko kekeringan: kekeringan_grid.json/penduduk.json belum ada")
    pusat = baca(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")) or {}
    isi = bangun(grid, penduduk, pusat, r("bpbd.json") or {}, baca(os.path.join(AKAR, "public/kekeringan/data/embung.json")) or {}, (r("kekeringan_meta.json") or {}).get("hari_ini"))
    simpan(os.path.join(DATA, "posko_kekeringan.json"), isi)
    n = isi["nasional"]
    print(f"posko kekeringan: {n['posko']} posko, {n['kab']} kabupaten, {n['jiwa']:,} jiwa, {n['liter'] / 1e6:,.1f} juta liter/hari, {n['tangki']:,} rit tangki/hari", file=sys.stderr)


def uji():
    assert tangki(1000) == 3 and tangki(0) == 0 and tangki(333) == 1 and tangki(334) == 2        # 15 L x 1000 = 15.000 L = 3 tangki; 5.010 L = 2
    p = {"a": [0, 0], "b": [0, .1], "c": [0, 1]}
    assert [x[2] for x in gabung([("a", 3, 10), ("b", 2, 99), ("c", 2, 5)], p)] == [["a", "b"], ["c"]]       # level lebih tinggi jadi posko; b dalam 11 km ikut
    assert [x[0] for x in gabung([("b", 2, 5), ("c", 2, 50)], p)] == ["c", "b"]                               # level sama: jiwa terbanyak dahulu
    grid = {"grid": [[.25, .25, "11", None, None, None, None, 3, None, None], [.25, 1.25, "11", None, None, None, None, 0, None, None]]}
    pend = {"kec": {"11|Alfa|a": 2000, "11|Alfa|b": 1000, "11|Zeta|c": 5000}}
    pus = {"11|Alfa|a": [.3, .3], "11|Alfa|b": [.3, .35], "11|Zeta|c": [.3, 1.2]}
    bp = {"kantor": [{"nama": "ALFA", "lat": .3, "lon": .3, "alamat": "x", "pusdalops": "1"}]}
    o = bangun(grid, pend, pus, bp, {"kab": {"11|Alfa": 4}}, "2026-10-19")
    assert o["nasional"] == {"kab": 1, "posko": 1, "kec": 2, "jiwa": 3000, "liter": 45000, "tangki": 9, "tangki_posko": 9}, o["nasional"]     # Zeta level 0: tak masuk
    k = o["kabupaten"][0]
    assert k["embung"] == 4 and k["bpbd"]["pusdalops"] == "1" and o["posko"][0]["kec"] == "a" and o["prov"]["11"]["tangki"] == 9
    assert bangun({"grid": [[.25, .25, "11", None, None, None, None, 1, None, None]]}, pend, pus, {}, {}, "x")["nasional"]["posko"] == 0   # hanya Waspada: tak ada posko
    print("ok posko kekeringan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
