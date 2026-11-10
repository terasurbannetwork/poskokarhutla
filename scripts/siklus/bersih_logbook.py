"""Lapis bersih Logbook Pusdalops (SK-011): data/pusdalops/logbook_kejadian.csv (dibaca saja) -> bersih/logbook/<YYYY>.jsonl.gz.

Enam aturan ALG F1.6 berurutan. Dibuang dan dihitung: tanggal_kosong, tanggal_mustahil, duplikat_persis. Ditandai (baris tetap):
wilayah_belum_terpetakan, jenis_tak_dibandingkan, nilai_tak_sah (nilai jadi null). masuk = tersisa + dibuang_total.
Hanya kolom terstruktur; teks bebas (kendala, kebutuhan, narasi) tidak dibawa. Teks yang tersisa disaring KP 6.1 (bersih_dibi.saring).
Luas (ha) karhutla dari sumber bukan sistem kita = null (KA 6). Baris per kejadian tidak masuk public/.
Pakai: python3 -I scripts/siklus/bersih_logbook.py bersih [--csv BERKAS] [--keluar DIR] | uji
"""
import collections, csv, datetime as dt, gzip, importlib.util, json, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


D = _muat("bersih_dibi")
CSV_BAWAAN = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
ANGKA = {"n_laporan": "n_laporan", "hari_dilaporkan": "hari_dilaporkan", "n_kec": "n_kec", "n_desa": "n_desa", "rumah": "rumah",
         "rumah_rb": "rb", "rumah_rs": "rs", "rumah_rr": "rr", "rumah_terendam": "terendam", "ha": "ha"}
TEKS = {"id_kejadian": ("id", 40), "jenis": ("jenis", 60), "subjenis": ("subjenis", 80), "prov_kode": ("prov_kode", 4), "kab_kode": ("kab_asal", 400)}
TANGGAL = {"tgl_kejadian": "tgl", "pertama_dicatat": "pertama", "terakhir_dicatat": "terakhir"}


SELISIH_CATAT = 300   # hari; sama dengan scripts/bnpb/rekonsiliasi_dalops_dibi.py


def _tgl(s):
    try:
        return dt.date.fromisoformat((s or "").strip()[:10])
    except ValueError:
        return None


def bersihkan(baris, ambil, kab4=None, kunci_jenis=None):
    """baris: iterable dict kolom CSV. -> (per_tahun, laporan)."""
    if kab4 is None:
        kn = _muat("kunci")
        kab4, kunci_jenis = kn.kab4, kunci_jenis or kn._KK.kunci_jenis
    masuk = 0
    buang = collections.Counter({a: 0 for a in D.ALASAN_BUANG})
    tanda = collections.Counter({a: 0 for a in D.ALASAN_TANDA})
    lihat, per = set(), collections.defaultdict(list)
    for r in baris:
        masuk += 1
        t, cat = _tgl(r.get("tgl_kejadian")), _tgl(r.get("pertama_dicatat"))
        dari_catat = False
        if t is None and cat is not None:
            t, dari_catat = cat, True     # tanggal kosong: pakai pertama_dicatat, ditandai
        elif t is not None and cat is not None and abs((cat - t).days) > SELISIH_CATAT:
            t, dari_catat = cat, True     # salah ketik tahun: aturan sama dengan rekonsiliasi_dalops_dibi.py (> 300 hari)
        if t is None:
            buang["tanggal_kosong"] += 1
            continue
        if t.year < D.TAHUN_AWAL or t > ambil:
            buang["tanggal_mustahil"] += 1
            continue
        sidik = json.dumps(r, sort_keys=True, ensure_ascii=False)
        if sidik in lihat:
            buang["duplikat_persis"] += 1
            continue
        lihat.add(sidik)
        o = {"s": "logbook", "tgl": t.isoformat()}
        if dari_catat:
            tanda["tanggal_dari_catat"] += 1
        for k, (n, b) in TEKS.items():
            o[n] = D.saring(r.get(k), b) or None
        for k, n in TANGGAL.items():
            if k != "tgl_kejadian":
                x = _tgl(r.get(k))
                o[n] = x.isoformat() if x else None
        tak_sah = False
        for k, n in ANGKA.items():
            v, sah = D.angka(r.get(k))
            tak_sah |= not sah
            o[n] = v
        kunci = list(kunci_jenis("dalops", o["jenis"] or ""))
        o["kunci_jenis"] = kunci
        o["kab4"] = kab4(o["kab_asal"]) if o["kab_asal"] else None
        if "karhutla" in kunci and o["ha"] is not None:
            o["ha"] = None
            tanda["dampak_karhutla_dikosongkan"] += 1
        if tak_sah:
            tanda["nilai_tak_sah"] += 1
        if o["kab4"] is None:
            tanda["wilayah_belum_terpetakan"] += 1
        if not kunci:
            tanda["jenis_tak_dibandingkan"] += 1
        per[t.year].append(o)
    lap = {"v": 1, "jenis": "bersih_laporan", "sumber": "logbook", "diambil": ambil.isoformat(), "masuk": masuk,
           "tersisa": sum(len(b) for b in per.values()), "dibuang": dict(buang), "dibuang_total": sum(buang.values()), "ditandai": dict(tanda)}
    return per, lap


def _uji():
    ambil = dt.date(2026, 11, 10)
    ok = dict(id_kejadian="LB1", jenis="banjir", tgl_kejadian="2026-03-02", kab_kode="32|Bogor", prov_kode="32", rumah_rb="3", ha="", subjenis="")
    n = [0]

    def b(**k):
        n[0] += 1
        return dict(ok, id_kejadian=f"LB{n[0]}", **k)
    baris = [b(tgl_kejadian=""), b(tgl_kejadian=""), b(tgl_kejadian="2923-01-01"), ok, dict(ok),   # 2 kosong, 1 mustahil, duplikat persis
             b(kab_kode="99|Atlantis"), b(jenis="omc"), b(), b(), b()]
    baris[3] = dict(ok, id_kejadian="LB-dup")
    baris[4] = dict(baris[3])
    per, l = bersihkan(baris, ambil)
    assert l["masuk"] == 10 and l["tersisa"] == 6 and l["dibuang_total"] == 4 and l["tersisa"] + l["dibuang_total"] == l["masuk"], l
    assert l["dibuang"] == {"tanggal_kosong": 2, "tanggal_mustahil": 1, "duplikat_persis": 1}, l
    assert l["ditandai"]["wilayah_belum_terpetakan"] == 1 and l["ditandai"]["jenis_tak_dibandingkan"] == 1, l
    o = per[2026][0]
    assert o["kab4"] == "3201" and o["rb"] == 3 and o["rr"] is None and o["ha"] is None, "kosong = null, bukan 0"
    # nilai tak sah jadi null, baris tetap; karhutla ha dikosongkan; teks bebas tidak dibawa
    per, l = bersihkan([dict(ok, rumah_rb="-4", rumah_rs="abc", kendala="kebutuhan X", kebutuhan="<b>tenda</b>", narasi="n"),
                        dict(ok, id_kejadian="K", jenis="karhutla", ha="783.0", subjenis="gambut")], ambil)
    a, k = per[2026]
    assert l["tersisa"] == 2 and l["ditandai"]["nilai_tak_sah"] == 1 and a["rb"] is None and a["rs"] is None
    assert k["ha"] is None and l["ditandai"]["dampak_karhutla_dikosongkan"] == 1
    assert not ({"kendala", "kebutuhan", "narasi"} & set(a)), "tanpa kolom teks bebas di bersih"
    # tanggal kosong -> pertama_dicatat (ditandai); selisih > 300 hari -> pertama_dicatat; <= 300 tetap; kab_kode panjang tidak terpotong
    per, l = bersihkan([dict(ok, id_kejadian="C1", tgl_kejadian="", pertama_dicatat="2026-03-05"),
                        dict(ok, id_kejadian="C2", tgl_kejadian="2025-03-05", pertama_dicatat="2026-03-06"),
                        dict(ok, id_kejadian="C3", tgl_kejadian="2026-01-05", pertama_dicatat="2026-03-06"),
                        dict(ok, id_kejadian="C4", tgl_kejadian="", pertama_dicatat=""),
                        dict(ok, id_kejadian="C5", kab_kode="; ".join("32|Bogor" for _ in range(30)))], ambil)
    t = {o["id"]: o for b in per.values() for o in b}
    assert t["C1"]["tgl"] == "2026-03-05" and t["C2"]["tgl"] == "2026-03-06" and t["C3"]["tgl"] == "2026-01-05"
    assert l["ditandai"]["tanggal_dari_catat"] == 2 and l["dibuang"]["tanggal_kosong"] == 1 and len(t["C5"]["kab_asal"]) == 30 * 8 + 29 * 2
    # saring teks luar (UJ-G0-09)
    per, _ = bersihkan([dict(ok, subjenis="<img onerror=x>", jenis="banjir", id_kejadian="A‮B"), dict(ok, id_kejadian="L", subjenis="x" * 5000)], ambil)
    s1, s2 = per[2026]
    assert s1["subjenis"] == "img onerror=x" and s1["id"] == "AB" and len(s2["subjenis"]) == 80
    # nama dengan nomor telepon tidak menggagalkan batch
    per, l = bersihkan([dict(ok, subjenis="Warung Budi 0812-3456-7890")], ambil)
    assert l["tersisa"] == 1
    with tempfile.TemporaryDirectory() as d:
        per, l = bersihkan([ok], ambil)
        D.tulis(d, "logbook", per, l)
        lap, masalah = _muat("saji").laporan_bersih(d)
        assert masalah == [] and lap["sumber"]["logbook"]["masuk"] == 1
        assert [json.loads(x)["s"] for x in gzip.open(os.path.join(d, "siklus/bersih/logbook/2026.jsonl.gz"), "rt")] == ["logbook"]
    print("bersih_logbook: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["bersih"]:
        with open(D._ambil(a, "--csv", CSV_BAWAAN), encoding="utf-8", newline="") as f:
            per, lap = bersihkan(csv.DictReader(f), dt.date.today())
        D.tulis(D._ambil(a, "--keluar", D.KELUAR_BAWAAN), "logbook", per, lap)
        print(json.dumps({k: v for k, v in lap.items() if k != "keluar_per_tahun"}, ensure_ascii=False, indent=1))
    else:
        sys.exit("pakai: bersih_logbook.py bersih [--csv BERKAS] [--keluar DIR] | uji")
