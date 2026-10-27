"""Ringkasan wilayah banjir per hari WIB (tiru kluster_hari karhutla) -> public/banjir/data/wilayah_hari.json + hari/<tanggal>.json + hari/indeks.json

Satu berkas per hari = keadaan akhir hari (jalan ulang di hari yang sama menimpa). Hari lama tidak pernah dihapus; indeks hanya bertambah.
Hari = status.json hari ke-0. wilayah_hari.json tidak pernah mundur ke hari yang lebih tua dari yang sudah ada.
{"hari","dibuat","sumber":[..],"provinsi":[{kode,nama,status,kejadian_aktif,rob,hujan3_mm,terpapar_jiwa,kab:[{kode,nama,status,
 kejadian_aktif,rob,hujan3_mm,terpapar_jiwa}]}],"total":{kejadian_aktif,rob,terpapar_jiwa,per_status:{Awas,Siaga,Waspada,Aman}}}
Sumber (tanpa karangan; yang tak punya sumber = null, bukan 0):
- status: maks level banjir hari ke-0 status.json (b[0]) dan level rob hari itu (rob.json lv) per kabupaten; tanpa catatan = "Aman".
- kejadian_aktif: banyak kode unik (kejadian_kode, terurut) kejadian_aktif_awal.json yang menyentuh wilayah itu; total = kode unik nasional (satu kejadian di dua kab/prov tidak dihitung dua kali); null bila berkasnya bukan hari itu.
- rob: jumlah titik rob.json berlevel >= Waspada pada hari itu; null bila kab tak punya titik pantau rob (atau hari itu tak ada di rob.json); 0 hanya bila dipantau dan tak ada yang >= Waspada. Provinsi null bila tak satu kab-nya dipantau.
- "Aman" = tidak tercatat Waspada+, BUKAN diukur aman. total.per_status dihitung per kabupaten.
- hujan3_mm: maks h3 kecamatan di status.json (hanya kecamatan berstatus tercatat); null bila tak ada kecamatan tercatat. Provinsi = maks kabupaten.
- terpapar_jiwa: PENDUDUK TERPAPAR (kecamatan Siaga/Awas) dampak.json per provinsi bila dampak.json hari itu; kabupaten selalu null (tak ada sumber).
Pakai:  python3 scripts/banjir/wilayah_hari.py   |   python3 scripts/banjir/wilayah_hari.py uji
"""
import datetime as dt, glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import AKAR, KELUAR, WIB, baca, simpan
from wilayah import PROVINSI

NAMA = ["Aman", "Waspada", "Siaga", "Awas"]
SUMBER = ["status.json", "rob.json", "kejadian_aktif_awal.json", "dampak.json"]
HARI = os.path.join(KELUAR, "hari")


def semua_kab():
    """{kode_prov: {nama_kab}} dari batas kecamatan (hanya properti)."""
    out = {}
    for k in PROVINSI:
        p = os.path.join(AKAR, "public/geo/kecamatan", f"{k}.json")
        if os.path.exists(p):
            out[k] = {f["properties"]["kab"] for f in json.load(open(p))["features"]}
    return out


def _maks(a, b):
    return b if a is None else a if b is None else max(a, b)


def bangun(st, rob, aktif, dampak, kab_geo, kini):
    hari = st["hari"][0]
    lv, rb, hj, ev = {}, {}, {}, {}   # (prov,kab) -> nilai
    for kunci, v in st["kec"].items():
        p, kab, _ = kunci.split("|")
        k = (p, kab)
        lv[k] = max(lv.get(k, 0), v["b"][0])
        hj[k] = _maks(hj.get(k), v.get("h3"))
    inv = {n: k for k, n in PROVINSI.items()}
    if rob and hari in rob["hari"]:
        i = rob["hari"].index(hari)
        for t in rob["titik"]:
            k = (inv.get(t["prov"]), t["kab"])
            if not (k[0] and k[1]):
                continue
            rb.setdefault(k, 0)
            if i < len(t["lv"]) and (t["lv"][i] or 0) >= 1:
                rb[k] += 1
                lv[k] = max(lv.get(k, 0), t["lv"][i])
    aktif_ok = bool(aktif) and aktif.get("hari") == hari
    kode_prov_aktif = {}
    for e in (aktif["kejadian"] if aktif_ok else []):
        for kab in {tuple(x.split("|")[:2]) for x in e["kec"]}:
            ev.setdefault(kab, set()).add(e["kode"])
        for p in e["prov"]:
            kode_prov_aktif.setdefault(p, set()).add(e["kode"])
    kd = lambda ks: sorted(ks) if aktif_ok else None
    dmp = dampak["terpapar"]["prov"] if dampak and dampak.get("hari") == hari else None
    kabs = {p: {x for x in n if x} for p, n in kab_geo.items()}
    for (p, kab) in list(lv) + list(rb) + list(ev):
        if p and kab:
            kabs.setdefault(p, set()).add(kab)
    prov, per = [], dict.fromkeys(NAMA, 0)
    for p in sorted(PROVINSI):
        baris = []
        for kab in sorted(kabs.get(p, ())):
            k = (p, kab)
            s = NAMA[lv.get(k, 0)]
            per[s] += 1
            baris.append({"kode": f"{p}|{kab}", "nama": kab, "status": s,
                          "kejadian_aktif": len(ev.get(k, ())) if aktif_ok else None, "kejadian_kode": kd(ev.get(k, ())),
                          "rob": rb.get(k),   # None = kab tanpa titik pantau rob
                          "hujan3_mm": hj.get(k), "terpapar_jiwa": None})
        nn = lambda f: [b[f] for b in baris if b[f] is not None]
        prov.append({"kode": p, "nama": PROVINSI[p],
                     "status": NAMA[max([NAMA.index(b["status"]) for b in baris], default=0)],
                     "kejadian_aktif": len(kode_prov_aktif.get(p, ())) if aktif_ok else None, "kejadian_kode": kd(kode_prov_aktif.get(p, ())),
                     "rob": sum(nn("rob")) if nn("rob") else None,
                     "hujan3_mm": max(nn("hujan3_mm"), default=None),
                     "terpapar_jiwa": (dmp.get(p, {}).get("penduduk", 0) if dmp is not None else None), "kab": baris})
    tj = [x["terpapar_jiwa"] for x in prov if x["terpapar_jiwa"] is not None]
    semua = set().union(*kode_prov_aktif.values()) if kode_prov_aktif else set()
    rr = [x["rob"] for x in prov if x["rob"] is not None]
    return {"hari": hari, "dibuat": kini.strftime("%Y-%m-%dT%H:%M+07:00"), "sumber": SUMBER, "provinsi": prov,
            "total": {"kejadian_aktif": len(semua) if aktif_ok else None, "kejadian_kode": kd(semua),
                      "rob": sum(rr) if rr else None,
                      "terpapar_jiwa": sum(tj) if tj else None, "per_status": per}}


def tulis(isi, keluar=KELUAR, kini=None):
    """Hari/<tanggal>.json menimpa hari itu; wilayah_hari.json tak mundur; indeks = gabungan (tak menyusut)."""
    hari = os.path.join(keluar, "hari")
    simpan(os.path.join(hari, isi["hari"] + ".json"), isi)
    ada = baca(os.path.join(keluar, "wilayah_hari.json"))
    if not ada or ada["hari"] <= isi["hari"]:
        simpan(os.path.join(keluar, "wilayah_hari.json"), isi)
    lama = (baca(os.path.join(hari, "indeks.json")) or {}).get("hari", [])
    berkas = [os.path.basename(f)[:-5] for f in glob.glob(os.path.join(hari, "*.json")) if re.fullmatch(r"\d{4}-\d\d-\d\d\.json", os.path.basename(f))]
    simpan(os.path.join(hari, "indeks.json"), {"dibuat": isi["dibuat"], "hari": sorted(set(lama) | set(berkas))})


def main():
    st = baca(os.path.join(KELUAR, "status.json"))
    if not st:
        sys.exit("status.json belum ada")
    isi = bangun(st, baca(os.path.join(KELUAR, "rob.json")), baca(os.path.join(KELUAR, "kejadian_aktif_awal.json")),
                 baca(os.path.join(KELUAR, "dampak.json")), semua_kab(), dt.datetime.now(WIB))
    tulis(isi)
    print(f"wilayah_hari: {isi['hari']} {isi['total']}", file=sys.stderr)


def uji():
    import tempfile
    kini = dt.datetime(2026, 1, 2, 9, tzinfo=WIB)
    st = {"hari": ["2026-01-02", "2026-01-03"], "kec": {"62|A|x": {"b": [2, 0], "h3": 40.0}, "62|A|y": {"b": [1, 0], "h3": 70.5},
                                                       "11|B|z": {"b": [0, 3], "h3": None}}}
    rob = {"hari": ["2026-01-02"], "titik": [{"prov": "Aceh", "kab": "C", "lv": [1]}, {"prov": "Aceh", "kab": "C", "lv": [0]},
                                           {"prov": "Aceh", "kab": "B", "lv": [3]}]}
    aktif = {"hari": "2026-01-02", "kejadian": [{"kode": "B0002", "kec": ["62|A|x", "62|A|y", "11|B|z"], "prov": ["62", "11"]}, {"kode": "B0001", "kec": ["62|A|x"], "prov": ["62"]}]}
    dampak = {"hari": "2026-01-02", "terpapar": {"prov": {"62": {"kec": 1, "penduduk": 900}}}}
    g = {"62": {"A", "Q"}, "11": {"B", "C"}}
    r = bangun(st, rob, aktif, dampak, g, kini)
    P = {p["kode"]: p for p in r["provinsi"]}
    assert len(P) == 38 and r["hari"] == "2026-01-02"
    assert P["62"]["status"] == "Siaga" and P["62"]["kejadian_aktif"] == 2 and P["62"]["kejadian_kode"] == ["B0001", "B0002"] and P["11"]["kejadian_aktif"] == 1 and P["62"]["hujan3_mm"] == 70.5 and P["62"]["terpapar_jiwa"] == 900
    ka = {k["nama"]: k for k in P["62"]["kab"]}
    assert r["total"]["kejadian_aktif"] == 2 and r["total"]["kejadian_kode"] == ["B0001", "B0002"], "kejadian di dua prov dihitung dua kali"
    assert ka["Q"]["rob"] is None and ka["A"]["rob"] is None and P["62"]["rob"] is None, "kab tak dipantau rob harus null"
    assert {k["nama"]: k["rob"] for k in P["11"]["kab"]} == {"B": 1, "C": 1}
    assert ka["Q"]["status"] == "Aman" and ka["Q"]["hujan3_mm"] is None and ka["A"]["terpapar_jiwa"] is None
    assert P["11"]["rob"] == 2 and P["11"]["status"] == "Awas" and P["11"]["terpapar_jiwa"] == 0   # rob B level 3 -> Awas; dampak ada, prov 11 tak terpapar
    assert P["12"]["status"] == "Aman" and P["12"]["kab"] == [] and r["total"]["rob"] == 2 and r["total"]["terpapar_jiwa"] == 900
    assert r["total"]["per_status"] == {"Aman": 1, "Waspada": 1, "Siaga": 1, "Awas": 1}, r["total"]
    # sumber basi -> null, bukan 0
    r2 = bangun(st, {"hari": ["2025-12-31"], "titik": []}, {"hari": "2026-01-01", "kejadian": []}, {"hari": "2026-01-01", "terpapar": {"prov": {}}}, g, kini)
    P2 = {p["kode"]: p for p in r2["provinsi"]}
    assert P2["62"]["rob"] is None and P2["62"]["kejadian_aktif"] is None and P2["62"]["terpapar_jiwa"] is None
    assert r2["total"]["rob"] is None and r2["total"]["kejadian_aktif"] is None and r2["total"]["terpapar_jiwa"] is None
    # tulis: indeks tak menyusut, wilayah_hari tak mundur
    d = tempfile.mkdtemp()
    tulis(r, d)
    mundur = dict(r, hari="2026-01-01")
    tulis(mundur, d)
    assert json.load(open(d + "/wilayah_hari.json"))["hari"] == "2026-01-02"
    assert json.load(open(d + "/hari/indeks.json"))["hari"] == ["2026-01-01", "2026-01-02"]
    os.remove(d + "/hari/2026-01-01.json")
    tulis(dict(r, hari="2026-01-03"), d)
    assert json.load(open(d + "/hari/indeks.json"))["hari"] == ["2026-01-01", "2026-01-02", "2026-01-03"], "indeks menyusut"
    print("ok wilayah_hari")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
