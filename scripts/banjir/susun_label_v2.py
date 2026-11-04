"""Bangun label v1 -> v2 untuk CAMPUR dengan SEMUA sumber dipotong <= 2026-10-18 SEBELUM diproses (PRAREG-CAMPUR §4.4 butir 2; amandemen A-13).
Tidak menyunting label_bersatu.py / label_bersatu_v2.py / label_kec.py: path sumber dialihkan ke salinan terpotong di folder sementara.

  python3 scripts/banjir/susun_label_v2.py status      periksa kesiapan (parquet Groundsource utuh? pyarrow di venv? sumber ada?)
  python3 scripts/banjir/susun_label_v2.py jalankan    ekstrak GS (venv-label) -> label_kec susun -> v1 susun -> v2 susun -> manifest + P_w/T_w
  python3 scripts/banjir/susun_label_v2.py uji

Unduhan: Groundsource parquet (Zenodo 10.5281/zenodo.18647053, record 18647054, CC BY 4.0, 667.122.400 B) ke data/raw/banjir/label_kec/ ; pyarrow hanya di
data/raw/banjir/.venv-label (python3.12), tidak masuk repo. Sumber yang TIDAK ada di checkout ini dan diganti (A-13): arsip logbook harian (hari tercakup
logbook = kosong), PetaBencana (kosong), GFM nasional (CSV kosong; v2 tidak memakainya).
"""
import csv, datetime as dt, gzip, hashlib, json, os, subprocess, sys, tempfile

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
AKAR = os.path.abspath(os.path.join(AYAH, "../.."))
LABEL_AKHIR = dt.date(2026, 10, 18)
PARQUET = os.path.join(AKAR, "data/raw/banjir/label_kec/groundsource_2026.parquet")
PARQUET_B = 667122400
URL_GS = "https://zenodo.org/api/records/18647054/files/groundsource_2026.parquet/content"
VENV_PY = os.path.join(AKAR, "data/raw/banjir/.venv-label/bin/python")
MANIFEST = os.path.join(AKAR, "data/raw/banjir/model_kab_campur/label_v2_manifest.json")


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def saring_csv_logbook(src, dst, akhir=LABEL_AKHIR):
    """Salin CSV logbook, buang baris yang tgl_kejadian ATAU pertama_dicatat > akhir (hanya kolom tanggal yang diperiksa). -> (ditulis, dibuang)."""
    a = b = 0
    with open(src, encoding="utf-8", newline="") as f, open(dst, "w", encoding="utf-8", newline="") as g:
        r = csv.DictReader(f)
        w = csv.DictWriter(g, fieldnames=r.fieldnames)
        w.writeheader()
        for row in r:
            if any((row.get(k) or "")[:10] > str(akhir) for k in ("tgl_kejadian", "pertama_dicatat", "terakhir_dicatat")):
                b += 1
            else:
                w.writerow(row)
                a += 1
    return a, b


def saring_dibi(rows, akhir=LABEL_AKHIR):
    return [r for r in rows if str(r[3])[:10] <= str(akhir)]


def saring_berita(d, akhir=LABEL_AKHIR):
    out = dict(d)
    ar = d["artikel"]
    kunci = next((k for k in ("tgl", "terbit", "tanggal", "t", "waktu") if ar and k in ar[0]), None)
    out["artikel"] = [a for a in ar if kunci is None or str(a.get(kunci))[:10] <= str(akhir)]
    return out, kunci


def status():
    ada = os.path.getsize(PARQUET) if os.path.exists(PARQUET) else 0
    print(f"parquet GS: {ada}/{PARQUET_B} B ({100 * ada / PARQUET_B:.1f}%)")
    try:
        r = subprocess.run([VENV_PY, "-c", "import pyarrow;print(pyarrow.__version__)"], capture_output=True, text=True)
        print("pyarrow venv:", r.stdout.strip() or r.stderr.strip()[-80:])
    except OSError as e:
        print("venv:", e)
    for p in ("data/pusdalops/logbook_kejadian.csv", "data/raw/banjir/dibi_tanggal.json", "public/banjir/data/berita.json", "public/banjir/data/mcdwd.json",
              "data/raw/logbook/arsip", "data/raw/banjir/genangan/petabencana_banjir.json", "public/geo/kecamatan"):
        print(("ada   " if os.path.exists(os.path.join(AKAR, p)) else "TIDAK ") + p)


def jalankan():
    if not os.path.exists(PARQUET) or os.path.getsize(PARQUET) != PARQUET_B:
        sys.exit(f"parquet Groundsource belum utuh ({os.path.getsize(PARQUET) if os.path.exists(PARQUET) else 0}/{PARQUET_B} B): unduh dulu "
                 f"(curl -C - -o {PARQUET} {URL_GS})")
    import label_bersatu as V1
    import label_bersatu_v2 as V2
    import label_kec as LK
    if not os.path.exists(LK.POLI):
        subprocess.run([VENV_PY, os.path.join(AYAH, "label_kec.py"), "ambil"], check=True)       # ekstraksi butuh pyarrow
    if not os.path.exists(LK.KELUAR):
        subprocess.run([sys.executable, os.path.join(AYAH, "label_kec.py"), "susun"], check=True)
    with tempfile.TemporaryDirectory() as t:
        lb = os.path.join(t, "logbook.csv")
        ditulis, dibuang = saring_csv_logbook(V1.CSV_LB, lb)
        dibi = os.path.join(t, "dibi.json")
        json.dump(saring_dibi(json.load(open(V1.DIBI))), open(dibi, "w"))
        ber = os.path.join(t, "berita.json")
        b, kunci_b = saring_berita(json.load(open(V2.BERITA)))
        json.dump(b, open(ber, "w"))
        pb = os.path.join(t, "pb.json")
        json.dump(json.load(open(V2.PB)) if os.path.exists(V2.PB) else [], open(pb, "w"))
        gfm = os.path.join(t, "gfm.csv")
        open(gfm, "w").write("tanggal_lintasan,prov|kab,tergenang_ha\n")
        V1.CSV_LB, V1.DIBI, V1.GFM, V2.BERITA, V2.PB = lb, dibi, gfm, ber, pb
        print(f"logbook: {ditulis} baris dipakai, {dibuang} dibuang (> {LABEL_AKHIR}); berita kunci tanggal: {kunci_b}")
        V1.susun()
        V2.susun()
    man = {"dibuat": dt.date.today().isoformat(), "label_akhir": str(LABEL_AKHIR), "groundsource": {"url": URL_GS, "zenodo": "10.5281/zenodo.18647053", "ukuran": PARQUET_B, "sha256": sha(PARQUET)},
           "v2": {os.path.basename(p): sha(p) for p in (V2.OUT_KAB, V2.OUT_HARI)}, "logbook_dibuang": dibuang,
           "pengganti_A13": ["arsip logbook harian (hari tercakup kosong)", "PetaBencana (kosong bila berkas tak ada)", "GFM (CSV kosong)"]}
    import model_kab_campur as C
    sam = json.load(open(C.SAMPEL))["kab"]
    import model_kab2 as K2
    K2.pasang()
    baris, pb_ = K2.baca_v2()
    lab, st = K2.label_kab(baris, pb_, V2.hari_j3(), set(sam), K2.hari_latih())
    ks = [k for k, _ in lab]
    g = C.gabung_wilayah([k for k, _ in lab], [d.year for _, d in lab], [v[0] for v in lab.values()], [v[1] for v in lab.values()], set(C.LATIH))
    man["wilayah"] = {"rincian": g["rincian"], "peta": g["peta"], "cw_sekunder": g["cw_sekunder"], "label_statistik": st}
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    json.dump(man, open(MANIFEST, "w"), separators=(",", ":"))
    print("manifest ditulis:", MANIFEST)
    print("P_w/T_w:", json.dumps({c: (v["P_w"], v["T_w"], v["lolos"]) for c, v in g["rincian"].items()}))


def uji():
    with tempfile.TemporaryDirectory() as t:
        s, d = os.path.join(t, "a.csv"), os.path.join(t, "b.csv")
        with open(s, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id_kejadian", "tgl_kejadian", "pertama_dicatat", "terakhir_dicatat"])
            w.writerows([["1", "2026-10-18", "2026-10-18", "2026-10-18"], ["2", "2026-10-19", "2026-10-19", "2026-10-19"], ["3", "2026-10-10", "2026-10-20", "2026-10-21"],
                         ["4", "", "", ""]])
        assert saring_csv_logbook(s, d) == (2, 2)
        assert [r[0] for r in csv.reader(open(d))][1:] == ["1", "4"]
    assert saring_dibi([["x", "p", "k", "2026-10-18", 1], ["x", "p", "k", "2026-10-19", 1]]) == [["x", "p", "k", "2026-10-18", 1]]
    b, k = saring_berita({"artikel": [{"terbit": "2026-10-18T10:00"}, {"terbit": "2026-10-19T00:00"}]})
    assert len(b["artikel"]) == 1 and k == "terbit"
    print("ok susun_label_v2")


if __name__ == "__main__":
    {"status": status, "jalankan": jalankan, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
