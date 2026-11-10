"""Lapis bersih DIBI (SK-010): mentah/dibi_harian/*.json (riwayat penuh) + public/data/dibi_kejadian.json -> bersih/dibi/<YYYY>.jsonl.gz.

Aturan ALG F1.6 nomor 1-3 dan 5 (+ wilayah dan nilai tak sah ditandai): tanggal_kosong, tanggal_mustahil, duplikat_persis dibuang dan
dihitung per alasan; jenis_tak_dibandingkan, wilayah_belum_terpetakan, nilai_tak_sah ditandai (baris tetap). masuk = tersisa + dibuang_total.
Kunci wilayah kab4 = Kemendagri 4 digit (kunci.kab4) lewat nama + provinsi; id_kab_bps/kab_kode DIBI (BPS) tidak dipakai sebagai kode. Terdampak karhutla dari sumber bukan sistem kita = null (KA 6). Tanggal WIB.
Berkas publik hanya dipakai untuk tanggal SESUDAH riwayat penuh (rekaman publik sudah digabung per hari: tidak dicampur dengan baris riwayat).
Modul ini juga memegang pembantu bersama bersih_logbook.py: saring (KP 6.1) dan tulis.
Pakai: python3 -I scripts/siklus/bersih_dibi.py bersih [--mentah DIR] [--publik BERKAS] [--keluar DIR] | uji
"""
import collections, datetime as dt, glob, gzip, importlib.util, io, json, os, re, sys, tempfile, unicodedata

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
TAHUN_AWAL = 2011
WIB = dt.timezone(dt.timedelta(hours=7))
KELUAR_BAWAAN = os.path.join(AKAR, "data/raw/siklus")
MENTAH_BAWAAN = os.path.join(AKAR, "data/raw/bnpb/dibi_harian")
PUBLIK_BAWAAN = os.path.join(AKAR, "public/data/dibi_kejadian.json")
ALASAN_BUANG = ("tanggal_kosong", "tanggal_mustahil", "duplikat_persis")
ALASAN_TANDA = ("wilayah_belum_terpetakan", "jenis_tak_dibandingkan", "nilai_tak_sah", "dampak_karhutla_dikosongkan", "tanggal_dari_catat")
BIDI = re.compile("[​-‏‪-‮⁦-⁩﻿]")
# kolom riwayat penuh -> nama bersih; kolom publik -> nama bersih (kolom publik yang hilang = 0 resmi, catatan berkasnya)
PENUH = {"kej": "kej", "md": "md", "hil": "hil", "luka": "luka", "rb": "rb", "rs": "rs", "rr": "rr"}
PUBLIK = {"kejadian": "kej", "meninggal": "md", "hilang": "hil", "luka": "luka", "terdampak": "terdampak", "mengungsi": "mengungsi",
          "rr_berat": "rb", "rr_sedang": "rs", "rr_ringan": "rr", "terendam": "terendam", "f_pendidikan": "f_pendidikan",
          "f_kantor": "f_kantor", "jembatan": "jembatan", "f_umum": "f_umum"}
METRIK = tuple(dict.fromkeys(list(PENUH.values()) + list(PUBLIK.values())))


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def saring(teks, batas=200):
    """KP 6.1: NFKC, buang kontrol dan bidi, buang < >, potong. Menghapus, tidak menolak."""
    t = unicodedata.normalize("NFKC", "" if teks is None else str(teks))
    t = BIDI.sub("", t)
    t = "".join(c for c in t if (c in " " or unicodedata.category(c)[0] != "C") and c not in "<>")
    return " ".join(t.split())[:batas]


def tulis(keluar, jenis, per_tahun, laporan):
    """per_tahun {tahun: [dict]} -> keluar/siklus/bersih/<jenis>/<tahun>.jsonl.gz (gzip deterministik) + laporan.json. Ditulis ulang utuh."""
    d = os.path.join(keluar, "siklus", "bersih", jenis)
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(os.path.join(d, "*")):
        os.remove(f)
    for th, baris in sorted(per_tahun.items()):
        buf = io.BytesIO()
        with gzip.GzipFile(fileobj=buf, mode="wb", mtime=0) as g:
            for b in baris:
                g.write((json.dumps(b, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8"))
        with open(os.path.join(d, f"{th}.jsonl.gz"), "wb") as f:
            f.write(buf.getvalue())
    laporan["keluar_per_tahun"] = {th: len(b) for th, b in sorted(per_tahun.items())}
    with open(os.path.join(d, "laporan.json"), "w", encoding="utf-8") as f:
        json.dump(laporan, f, ensure_ascii=False, sort_keys=True, indent=1)
    return laporan


def angka(v):
    """-> (nilai|None, sah). None murni (tak ada) sah; negatif, NaN, bukan angka tidak sah."""
    if v is None or v == "":
        return None, True
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None, False
    if x != x or x < 0 or x in (float("inf"),):
        return None, False
    return (int(x) if x == int(x) else x), True


def _tgl(r):
    """Baris riwayat penuh (dt epoch ms) atau publik ('tanggal') -> date|None."""
    try:
        if r.get("dt") is not None:
            return dt.datetime.fromtimestamp(float(r["dt"]) / 1000, WIB).date()
        return dt.date.fromisoformat(str(r.get("tanggal"))[:10])
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def _baris(mentah, publik):
    """Hasilkan (baris_mentah, peta_kolom, asal). Publik hanya setelah tanggal terakhir riwayat penuh."""
    akhir = None
    for f in sorted(glob.glob(os.path.join(mentah, "*.json"))):
        for r in json.load(open(f, encoding="utf-8")).get("baris", []):
            t = _tgl(r)
            akhir = t if t and (akhir is None or t > akhir) and t.year < 2100 else akhir
            yield r, PENUH, "riwayat"
    if publik and os.path.exists(publik):
        for r in json.load(open(publik, encoding="utf-8")).get("kejadian", []):
            t = _tgl(r)
            if t is None or akhir is None or t > akhir:
                yield r, PUBLIK, "publik"


def bersihkan(baris, ambil, kab4=None, kunci_jenis=None):
    """baris: iterable (mentah, peta, asal). -> (per_tahun, laporan)."""
    if kab4 is None:
        kn = _muat("kunci")
        def kab4(r):
            # kode DIBI = BPS, beda dari Kemendagri di 164 kabupaten: hanya nama + provinsi (2 digit pertama kode itu sama di kedua sistem).
            # Nama kosong atau tak cocok = None (ditandai wilayah_belum_terpetakan), tidak ditebak dari kode.
            k = r.get("id_kab_bps") if r.get("id_kab_bps") is not None else r.get("kab_kode")
            prov = r.get("prov_kode") or (re.sub(r"\D", "", str(k))[:2] if k is not None else None)
            return kn.kab4(r.get("kabupaten") or r.get("kab"), str(prov) if prov else None)
        kunci_jenis = kunci_jenis or kn._KK.kunci_jenis
    masuk = 0
    buang = collections.Counter({a: 0 for a in ALASAN_BUANG})
    tanda = collections.Counter({a: 0 for a in ALASAN_TANDA})
    lihat, per = set(), collections.defaultdict(list)
    asal_n = collections.Counter()
    for r, peta, asal in baris:
        masuk += 1
        asal_n[asal] += 1
        t = _tgl(r)
        if t is None:
            buang["tanggal_kosong"] += 1
            continue
        if t.year < TAHUN_AWAL or t > ambil:
            buang["tanggal_mustahil"] += 1
            continue
        sidik = json.dumps(r, sort_keys=True, ensure_ascii=False)
        if sidik in lihat:
            buang["duplikat_persis"] += 1
            continue
        lihat.add(sidik)
        jenis = saring(r.get("jenis_bencana", r.get("jenis")), 80)
        kunci = list(kunci_jenis("dibi", jenis))
        kab = kab4(r)
        o = {"s": "dibi", "tgl": t.isoformat(), "jenis": jenis, "kunci_jenis": kunci, "kab4": kab}
        tak_sah = False
        for k_src, k_out in peta.items():
            v, sah = angka(r.get(k_src))
            if not sah:
                tak_sah = True
            o[k_out] = 0 if (asal == "publik" and k_src not in r) else v
        if asal == "riwayat":
            for k in METRIK:
                o.setdefault(k, None)  # kolom yang tak dimiliki riwayat penuh: tidak ada, bukan 0
        if "karhutla" in kunci and o.get("terdampak") is not None:
            o["terdampak"] = None
            tanda["dampak_karhutla_dikosongkan"] += 1
        if tak_sah:
            tanda["nilai_tak_sah"] += 1
        if kab is None:
            tanda["wilayah_belum_terpetakan"] += 1
        if not kunci:
            tanda["jenis_tak_dibandingkan"] += 1
        per[t.year].append(o)
    tersisa = sum(len(b) for b in per.values())
    lap = {"v": 1, "jenis": "bersih_laporan", "sumber": "dibi", "diambil": ambil.isoformat(), "masuk": masuk, "tersisa": tersisa,
           "dibuang": dict(buang), "dibuang_total": sum(buang.values()), "ditandai": dict(tanda), "masuk_per_asal": dict(asal_n)}
    return per, lap


def _uji():
    ambil = dt.date(2026, 11, 10)
    ms = lambda y, m, d: dt.datetime(y, m, d, 5, tzinfo=WIB).timestamp() * 1000
    ok = dict(dt=ms(2026, 3, 2), id_kab_bps=3201, kabupaten="Bogor", jenis_bencana="Banjir", kej=1, md=2, hil=0, luka=1, rb=0, rs=0, rr=5)
    baris = [
        (ok, PENUH, "riwayat"), (dict(ok), PENUH, "riwayat"),                       # duplikat persis
        (dict(ok, dt=None), PENUH, "riwayat"), (dict(ok, dt="x"), PENUH, "riwayat"),  # tanggal kosong x2
        (dict(ok, dt=ms(2010, 5, 1)), PENUH, "riwayat"), (dict(ok, dt=ms(2923, 1, 1)), PENUH, "riwayat"),  # mustahil x2
        (dict(ok, dt=ms(2026, 3, 3), id_kab_bps=9999, kabupaten="Atlantis"), PENUH, "riwayat"),            # wilayah tak terpetakan
        (dict(ok, dt=ms(2026, 3, 4), jenis_bencana="Konflik Sosial"), PENUH, "riwayat"),  # jenis lain
        (dict(ok, dt=ms(2026, 3, 5), md=-3), PENUH, "riwayat"),                       # nilai tak sah
        (dict(ok, dt=ms(2026, 3, 6)), PENUH, "riwayat"),
        ({"tanggal": "2026-10-26", "jenis": "Kebakaran Hutan dan Lahan", "kab_kode": "73.17", "kab": "Luwu", "prov_kode": "73", "kejadian": 1, "terdampak": 600}, PUBLIK, "publik"),
        ({"tanggal": "2026-10-27", "jenis": "Banjir", "kab_kode": "32.01", "kab": "Bogor", "prov_kode": "32", "kejadian": 1, "meninggal": 2}, PUBLIK, "publik"),
    ]
    per, l = bersihkan(baris, ambil)
    assert l["masuk"] == 12 and l["tersisa"] == l["masuk"] - l["dibuang_total"] == 7
    assert l["dibuang"] == {"tanggal_kosong": 2, "tanggal_mustahil": 2, "duplikat_persis": 1}, l
    t = l["ditandai"]
    assert (t["wilayah_belum_terpetakan"], t["jenis_tak_dibandingkan"], t["nilai_tak_sah"], t["dampak_karhutla_dikosongkan"]) == (1, 1, 1, 1), t
    hasil = {o["tgl"]: o for b in per.values() for o in b}
    assert hasil["2026-03-02"]["kab4"] == "3201" and hasil["2026-03-02"]["terdampak"] is None, "tak ada kolom = null, bukan 0"
    assert hasil["2026-03-02"]["md"] == 2 and hasil["2026-03-05"]["md"] is None
    kh = hasil["2026-10-26"]
    assert kh["kab4"] == "7317" and kh["terdampak"] is None and kh["kunci_jenis"] == ["karhutla"]
    assert hasil["2026-10-27"]["md"] == 2 and hasil["2026-10-27"]["hil"] == 0, "kolom publik yang hilang = 0 menurut catatan berkasnya"
    # kode BPS tidak dipakai langsung: Aceh Besar BPS 1108 -> Kemendagri 1106; nama kosong = belum terpetakan (kode tidak ditebak)
    per2, l2 = bersihkan([(dict(ok, id_kab_bps=1108, kabupaten="Aceh Besar"), PENUH, "riwayat"),
                          (dict(ok, dt=ms(2026, 3, 3), id_kab_bps=1108, kabupaten=""), PENUH, "riwayat")], ambil)
    h2 = {o["tgl"]: o for b in per2.values() for o in b}
    assert h2["2026-03-02"]["kab4"] == "1106" and h2["2026-03-03"]["kab4"] is None and l2["ditandai"]["wilayah_belum_terpetakan"] == 1
    # saring (UJ-G0-09 bagian umum)
    assert saring("<img onerror=x>") == "img onerror=x" and saring("a‮b​c") == "abc" and len(saring("x" * 5000, 100)) == 100
    assert saring("ＡＢ") == "AB" and saring("a\x00b\x1fc") == "abc"
    # tulis dan laporan lewat saji
    with tempfile.TemporaryDirectory() as d:
        tulis(d, "dibi", per, l)
        g = gzip.open(os.path.join(d, "siklus/bersih/dibi/2026.jsonl.gz"), "rt", encoding="utf-8").read().splitlines()
        assert len(g) == 7 and all(json.loads(x)["s"] == "dibi" for x in g)
        a = open(os.path.join(d, "siklus/bersih/dibi/2026.jsonl.gz"), "rb").read()
        tulis(d, "dibi", per, l)
        assert open(os.path.join(d, "siklus/bersih/dibi/2026.jsonl.gz"), "rb").read() == a, "keluaran deterministik"
        lap, masalah = _muat("saji").laporan_bersih(d)
        assert masalah == [] and lap["sumber"]["dibi"]["masuk"] == 12
    # masuk bukan tersisa + dibuang ditolak saji
    with tempfile.TemporaryDirectory() as d:
        tulis(d, "dibi", per, dict(l, masuk=99))
        assert _muat("saji").laporan_bersih(d)[1], "laporan tidak seimbang harus ditolak"
    print("bersih_dibi: uji hijau")


def _ambil(a, opsi, bawaan):
    return a[a.index(opsi) + 1] if opsi in a else bawaan


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["bersih"]:
        per, lap = bersihkan(_baris(_ambil(a, "--mentah", MENTAH_BAWAAN), _ambil(a, "--publik", PUBLIK_BAWAAN)), dt.date.today())
        tulis(_ambil(a, "--keluar", KELUAR_BAWAAN), "dibi", per, lap)
        print(json.dumps({k: v for k, v in lap.items() if k != "keluar_per_tahun"}, ensure_ascii=False, indent=1))
    else:
        sys.exit("pakai: bersih_dibi.py bersih [--mentah DIR] [--publik BERKAS] [--keluar DIR] | uji")
