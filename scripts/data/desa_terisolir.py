"""Desa langganan terisolir -> data/pusdalops/desa_terisolir.csv (agregat; tanpa nama orang dan tanpa teks bebas)

Masukan : data/raw/logbook/arsip/20??/baris.jsonl (tidak di-git; keluaran logbook_pusdalops.py)
Satu baris keluaran = satu desa (kab, kecamatan, desa). Kejadian dihitung unik per id_kejadian; masuk hitungan bila teks kendala/kondisi/
upaya/kronologi cocok POLA (akses terputus, terisolir, sulit dijangkau, jembatan putus, dst).
Disimpan: desa dengan >= 2 kejadian ATAU kejadian di >= 2 tahun berbeda.
Atribusi desa: baris dengan >1 kab dilewati; kecamatan dipasangkan hanya bila 1 kecamatan atau jumlah kec = jumlah desa (zip), selain itu kosong.
Kunci kab = kab_kode dari logbook_bersih.kode_kab ("prov|nama", sama dengan logbook_riwayat.json).
Catatan: POLA sengaja longgar ("akses" saja ikut), jadi hitungan = batas atas; baca sebagai "layak dicek", bukan daftar pasti.
Pakai: python3 scripts/data/desa_terisolir.py      python3 scripts/data/desa_terisolir.py uji
"""
import collections, csv, glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logbook_bersih as LB  # noqa: E402

AKAR = LB.AKAR
KELUAR = os.path.join(AKAR, "data/pusdalops/desa_terisolir.csv")
POLA = re.compile(r"akses|jalan (terputus|putus|tertutup|tertimbun|rusak)|sulit dijangkau|tidak dapat dilalui|terisolir|jembatan (putus|rusak|ambruk)", re.I)
KOLOM = ["kab_kode", "prov_kode", "kabkota", "kecamatan", "desa", "n_kejadian", "jenis", "bulan", "tahun", "tahun_pertama", "tahun_terakhir"]
AWALAN = re.compile(r"^(desa|ds\.?|kelurahan|kel\.?|kampung|kp\.?|nagari|gampong)\s+", re.I)


def nama(s):
    """'DS. sukamaju ' -> 'Sukamaju'; kunci pencocokan = huruf kecil tanpa awalan."""
    s = AWALAN.sub("", " ".join((s or "").split()))
    return s.title()


def pasangan(r):
    """[(kecamatan, desa)] sesuai aturan atribusi di docstring."""
    kec, des = [nama(x) for x in r["kecamatan"] if x], [nama(x) for x in r["desa"] if x]
    if len(kec) == 1:
        return [(kec[0], d) for d in des]
    return list(zip(kec, des)) if kec and len(kec) == len(des) else [("", d) for d in des]


def kumpul(baris):
    """baris (dict) -> {(kab_kode, kec_kunci, desa_kunci): {...}} untuk kejadian ber-pola akses."""
    g = collections.defaultdict(lambda: {"id": set(), "jenis": set(), "bulan": set(), "tahun": set(), "nama": collections.Counter()})
    for r in baris:
        teks = " ".join(str(r.get(k) or "") for k in ("kendala", "kondisi", "upaya", "kronologi"))
        if not POLA.search(teks):
            continue
        kab = LB.kode_kab(r)
        if len(kab) != 1:
            continue
        tgl = r.get("tgl_kejadian") or r["tgl_logbook"]
        for kec, d in pasangan(r):
            x = g[(kab[0], kec.lower(), d.lower())]
            x["id"].add(r["id_kejadian"])
            x["jenis"].add(r["jenis"])
            x["bulan"].add(int(tgl[5:7]))
            x["tahun"].add(int(tgl[:4]))
            x["nama"][(r["kabkota"][0] if r["kabkota"] else "", r["prov_kode"][0] if r["prov_kode"] else "", kec, d)] += 1
    return g


def susun(g):
    out = []
    for (kab, _, _), x in g.items():
        if len(x["id"]) < 2 and len(x["tahun"]) < 2:
            continue
        kabn, pk, kec, d = x["nama"].most_common(1)[0][0]
        th = sorted(x["tahun"])
        out.append({"kab_kode": kab, "prov_kode": pk, "kabkota": kabn, "kecamatan": kec, "desa": d, "n_kejadian": len(x["id"]),
                    "jenis": "; ".join(sorted(x["jenis"])), "bulan": "; ".join(map(str, sorted(x["bulan"]))),
                    "tahun": "; ".join(map(str, th)), "tahun_pertama": th[0], "tahun_terakhir": th[-1]})
    out.sort(key=lambda r: (-r["n_kejadian"], r["kab_kode"], r["desa"]))
    return out


def main():
    berkas = sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??/baris.jsonl")))
    baris = (json.loads(l) for f in berkas for l in open(f, encoding="utf-8"))
    rows = susun(kumpul(baris))
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w", newline="", encoding="utf-8") as o:
        w = csv.DictWriter(o, KOLOM)
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} desa langganan terisolir dari {len(berkas)} tahun -> {os.path.relpath(KELUAR, AKAR)}")
    for r in rows[:5]:
        print(r["n_kejadian"], r["kab_kode"], r["kecamatan"], r["desa"], r["jenis"], r["tahun"])


def uji():
    assert nama("DS. sukamaju ") == "Sukamaju" and nama("Desa  Air  Hitam") == "Air Hitam" and nama("Kelurahan X") == "X"
    mk = lambda i, tgl, desa, jenis="longsor", teks="jalan terputus", kec=("A",): {
        "id_kejadian": i, "tgl_logbook": tgl, "tgl_kejadian": tgl, "jenis": jenis, "kendala": teks, "kondisi": "", "upaya": "", "kronologi": "",
        "kabkota": ["Kab. Banjarnegara"], "prov_kode": ["33"], "kecamatan": list(kec), "desa": desa}
    b = [mk("1", "2015-12-01", ["Ds. Sijeruk"]), mk("2", "2015-12-02", ["sijeruk"], "banjir"),   # 2 kejadian, 1 desa (ejaan beda)
         mk("3", "2016-01-05", ["Pagak"]), mk("4", "2017-02-05", ["Pagak"], teks="akses sulit dijangkau"),  # 2 tahun
         mk("5", "2018-03-01", ["Tunggal"]),                                              # 1 kejadian -> buang
         mk("6", "2018-03-01", ["Lain"], teks="korban dievakuasi"),                       # tanpa pola -> buang
         mk("1", "2015-12-01", ["Ds. Sijeruk"])]                                          # id sama -> tak dobel
    r = {x["desa"]: x for x in susun(kumpul(b))}
    assert set(r) == {"Sijeruk", "Pagak"}, r.keys()
    assert r["Sijeruk"]["n_kejadian"] == 2 and r["Sijeruk"]["jenis"] == "banjir; longsor" and r["Sijeruk"]["kab_kode"] == "33|Banjarnegara"
    assert r["Pagak"]["tahun"] == "2016; 2017" and r["Pagak"]["bulan"] == "1; 2"
    print("uji desa_terisolir: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
