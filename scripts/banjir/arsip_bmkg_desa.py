"""Arsip harian prakiraan cuaca BMKG per desa (satu desa wakil per kab) -> data/banjir/arsip_bmkg_desa/YYYY-MM.jsonl.gz
(append-only, dilacak git, TIDAK dilayani situs). BMKG tidak menyimpan prakiraan lama: hari yang tidak diarsip hilang.

Sumber: https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=<kode> (data terbuka BMKG, atribusi wajib; batas resmi 60/menit/IP,
dipakai <=50/menit). Desa wakil: scripts/cuaca/data/desa_wakil_kab.json.
Satu baris per desa per hari WIB: {"hari","k"(adm4),"kab","ambil"(UTC),"analisis","w":[[utc "YYYY-MM-DD HH", t, hu, tp, tcc, ws, wd_deg, kode_cuaca]]}.
Gagal -> {"hari","k","kab","ambil","gagal"}; baris gagal tidak menghalangi ulangan di hari yang sama (hanya baris sukses menghitung).
Berkas bulanan = gzip beruntun (anggota ditambah per run; gzip.open membacanya sebagai satu aliran).
Pakai:  python3 scripts/banjir/arsip_bmkg_desa.py   |   ... uji
"""
import concurrent.futures, datetime as dt, gzip, json, os, sys, tempfile, threading, time, urllib.request

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WAKIL = os.path.join(AKAR, "scripts/cuaca/data/desa_wakil_kab.json")
ARSIP = os.path.join(AKAR, "data/banjir/arsip_bmkg_desa")
API = "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4="
JEDA = 1.25        # detik antar permintaan = 48/menit
WIB = dt.timezone(dt.timedelta(hours=7))


def ringkas(d, k, kab, hari, ambil):
    """Respons BMKG -> baris arsip; kosong/rusak -> ValueError."""
    langkah = [x for blok in d["data"][0]["cuaca"] for x in blok]
    if not langkah:
        raise ValueError("cuaca kosong")
    return {"hari": hari, "k": k, "kab": kab, "ambil": ambil, "analisis": langkah[0].get("analysis_date"),
            "w": [[x["utc_datetime"][:13], x.get("t"), x.get("hu"), x.get("tp"), x.get("tcc"), x.get("ws"),
                   x.get("wd_deg"), x.get("weather")] for x in langkah]}


def sudah(berkas, hari):
    """kode adm4 yang sudah punya baris sukses pada hari itu."""
    if not os.path.exists(berkas):
        return set()
    with gzip.open(berkas, "rt", encoding="utf-8") as f:
        return {r["k"] for r in map(json.loads, f) if r["hari"] == hari and "w" in r}


def tambah(berkas, baris):
    os.makedirs(os.path.dirname(berkas), exist_ok=True)
    with gzip.open(berkas, "at", encoding="utf-8") as f:
        for r in baris:
            f.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")


def ambil(k):
    req = urllib.request.Request(API + k, headers={"User-Agent": "poskokarhutla-arsip/1.0 (data terbuka BMKG)"})
    for c in range(2):
        try:
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            if c == 0 and "429" in str(e):
                time.sleep(60)
            elif c == 1:
                raise


def jalan():
    kab = json.load(open(WAKIL))["kab"]
    hari = dt.datetime.now(WIB).date().isoformat()
    berkas = os.path.join(ARSIP, hari[:7] + ".jsonl.gz")
    ada = sudah(berkas, hari)
    tugas = [(kk, v["adm4"]) for kk, v in sorted(kab.items()) if v["adm4"] not in ada]
    kunci, slot = threading.Lock(), [time.time()]

    def satu(t):
        kk, k = t
        with kunci:                       # pemberi jatah: satu permintaan tiap JEDA detik, lintas utas
            tunggu = slot[0] - time.time()
            slot[0] = max(slot[0], time.time()) + JEDA
        if tunggu > 0:
            time.sleep(tunggu)
        ts = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        try:
            r = ringkas(ambil(k), k, kk, hari, ts)
        except Exception as e:
            r = {"hari": hari, "k": k, "kab": kk, "ambil": ts, "gagal": str(e)[:120]}
        with kunci:
            tambah(berkas, [r])
        return "w" in r

    # API lambat (timeout 30 dtk umum): 24 utas supaya timeout tidak menahan antrean; laju tetap <=48/menit
    with concurrent.futures.ThreadPoolExecutor(24) as ex:
        hasil = list(ex.map(satu, tugas))
    ok = sum(hasil)
    gagal = len(hasil) - ok
    print(f"arsip_bmkg_desa {hari}: baru {ok}, gagal {gagal}, sudah ada {len(ada)}, ukuran {os.path.getsize(berkas) if os.path.exists(berkas) else 0} B")
    return 1 if gagal > len(kab) // 4 else 0       # >25% gagal = run dianggap gagal (peringatan di workflow)


def uji():
    ctoh = os.path.join(AKAR, "data/raw/publik/bmkg_prakiraan/adm4_31.71.03.1001.json")
    if os.path.exists(ctoh):
        r = ringkas(json.load(open(ctoh)), "31.71.03.1001", "31.71", "2026-11-04", "x")
        assert len(r["w"]) >= 8 and all(len(w) == 8 for w in r["w"]), r
    try:
        ringkas({"data": [{"cuaca": [[]]}]}, "k", "kab", "h", "x")
        raise SystemExit("cuaca kosong harus ditolak")
    except ValueError:
        pass
    assert len(json.load(open(WAKIL))["kab"]) > 400
    with tempfile.TemporaryDirectory() as d:
        b = os.path.join(d, "a", "2026-11.jsonl.gz")
        tambah(b, [{"hari": "h", "k": "1", "w": []}])
        tambah(b, [{"hari": "h", "k": "2", "gagal": "x"}, {"hari": "g", "k": "3", "w": []}])
        assert sudah(b, "h") == {"1"} and sudah(b, "g") == {"3"}, "gzip beruntun / gagal tak dihitung"
    print("arsip_bmkg_desa uji: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else sys.exit(jalan())
