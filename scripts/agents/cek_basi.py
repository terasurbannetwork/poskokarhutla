"""Penjaga data beku (PB-68.10): periksa UMUR berkas keluaran kunci tiap workflow dari TANGGAL DI DALAM berkas (`dibuat`), bukan mtime checkout git.

Kenapa ada: langkah `continue-on-error` di lintas.yml menelan galat prakiraan.py, neraca.py, dan paparan.py hampir empat minggu
(19 Okt sampai 16 Nov 2026) sementara run tetap hijau. scripts/agents/kesegaran.py hanya memberi ::warning dan batasnya jam; penjaga ini
menghitung HARI dan GAGAL (keluar 1) pada ambang merah, jadi run merah, bukan hijau diam-diam.

Ambang diturunkan dari jadwal sumbernya (satu tempat, tabel TABEL di bawah):
  kuning = jeda terpanjang antar-run sumber + ruang telat/lewat satu run  -> ::warning
  merah  = kuning + beberapa run yang terlewat berturut-turut             -> ::error dan keluar 1
Berkas hilang, rusak, atau tanpa tanggal terbaca = merah (kebekuan tak boleh lolos hanya karena stempelnya hilang).

Pakai:  python3 scripts/agents/cek_basi.py lintas|statis        periksa grup (jalan di akar repo)
        python3 scripts/agents/cek_basi.py lintas --akar DIR    akar lain (untuk uji)
        python3 scripts/agents/cek_basi.py uji                  self-check
"""
import datetime as dt, json, os, sys, tempfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))

# (grup, berkas, kunci tanggal, kuning hari, merah hari, sumber jadwal)
TABEL = [
    # SEAS5 di-cache 7 hari di dalam run harian lintas.yml; prakiraan.py menulis ulang `dibuat` tiap run yang sukses
    ("lintas", "public/data/kekeringan_prakiraan.json", "dibuat", 9, 14, "lintas.yml harian (status.py rantai; SEAS5 cache 7 hari)"),
    ("lintas", "public/data/kekeringan_neraca.json", "dibuat", 3, 7, "lintas.yml harian (status.py rantai)"),
    # paparan.json ditulis ulang tiap run harian lintas.yml dan di-commit ke main
    ("lintas", "public/gunungapi/data/paparan.json", "dibuat", 3, 8, "lintas.yml harian (paparan.py)"),
    # risiko.json bulanan (statis.yml tanggal 2): satu bulan terlewat = kuning, dua = merah
    ("lintas", "public/gunungapi/data/risiko.json", "dibuat", 45, 75, "statis.yml bulanan (risiko.py)"),
    ("statis", "public/gunungapi/data/risiko.json", "dibuat", 45, 75, "statis.yml bulanan (risiko.py)"),
]


def waktu(s):
    """string tanggal -> datetime sadar zona; tanggal saja = 00.00 WIB; tanpa zona = WIB; None bila tak terbaca."""
    if not isinstance(s, str) or not s.strip():
        return None
    try:
        t = dt.datetime.fromisoformat(s.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=WIB)


def periksa(grup, akar=AKAR, kini=None, tabel=TABEL):
    """-> daftar dict {berkas, status: segar|kuning|merah|hilang|tanpa_tanggal, umur_hari, ...}."""
    kini = kini or dt.datetime.now(dt.timezone.utc)
    hasil = []
    for g, berkas, kunci, kuning, merah, sumber in tabel:
        if g != grup:
            continue
        b = {"berkas": berkas, "kunci": kunci, "kuning": kuning, "merah": merah, "sumber": sumber, "stempel": None, "umur_hari": None}
        try:
            with open(os.path.join(akar, berkas), encoding="utf-8") as f:
                d = json.load(f)
        except (OSError, ValueError):
            b["status"] = "hilang"
            hasil.append(b)
            continue
        t = waktu(d.get(kunci)) if isinstance(d, dict) else None
        if t is None:
            b["status"] = "tanpa_tanggal"
        else:
            b["stempel"] = t.astimezone(WIB).isoformat(timespec="minutes")
            b["umur_hari"] = round((kini - t).total_seconds() / 86400, 1)
            b["status"] = "merah" if b["umur_hari"] > merah else "kuning" if b["umur_hari"] > kuning else "segar"
        hasil.append(b)
    return hasil


def lapor(hasil):
    """cetak anotasi Actions; -> jumlah galat (merah, hilang, tanpa_tanggal)."""
    galat = 0
    for b in hasil:
        s = b["status"]
        if s == "segar":
            print(f"segar: {b['berkas']} umur {b['umur_hari']} hari (kuning > {b['kuning']}, merah > {b['merah']})")
        elif s == "kuning":
            print(f"::warning title=Data mulai basi::{b['berkas']} umur {b['umur_hari']} hari > {b['kuning']} (stempel {b['stempel']}; sumber {b['sumber']})")
        else:
            galat += 1
            rinci = {"merah": f"umur {b['umur_hari']} hari > {b['merah']} (stempel {b['stempel']}); sumber {b['sumber']}",
                     "hilang": "berkas tidak ada atau bukan JSON",
                     "tanpa_tanggal": f"kunci '{b['kunci']}' kosong atau bukan tanggal"}[s]
            print(f"::error title=Data beku::{b['berkas']} {rinci}")
    return galat


def uji():
    kini = dt.datetime(2026, 11, 16, 12, 0, tzinfo=dt.timezone.utc)
    with tempfile.TemporaryDirectory() as tmp:
        def tulis(p, d):
            os.makedirs(os.path.dirname(os.path.join(tmp, p)), exist_ok=True)
            with open(os.path.join(tmp, p), "w") as f:
                json.dump(d, f)
        tabel = [("t", f"{n}.json", "dibuat", 3, 8, "x") for n in "abcdef"] + [("lain", "z.json", "dibuat", 3, 8, "x")]
        tulis("a.json", {"dibuat": "2026-11-16T10:00:00+07:00"})   # 5 jam
        tulis("b.json", {"dibuat": "2026-11-11"})                  # tanggal saja: 4,6 hari -> kuning
        tulis("c.json", {"dibuat": "2026-10-19T17:58+07:00"})      # 27 hari -> merah
        tulis("d.json", {"sumber": "tanpa tanggal"})
        tulis("e.json", {"dibuat": "bukan tanggal"})
        # f.json hilang
        s = {b["berkas"]: b for b in periksa("t", tmp, kini, tabel)}
        assert s["a.json"]["status"] == "segar", s["a.json"]
        assert s["b.json"]["status"] == "kuning", s["b.json"]
        assert s["c.json"]["status"] == "merah" and s["c.json"]["umur_hari"] > 27, s["c.json"]
        assert s["d.json"]["status"] == "tanpa_tanggal" and s["e.json"]["status"] == "tanpa_tanggal"
        assert s["f.json"]["status"] == "hilang" and "z.json" not in s
    print("cek_basi: uji lulus")


def utama():
    a = sys.argv[1:]
    if a == ["uji"]:
        return uji()
    if not a or a[0] not in {g for g, *_ in TABEL}:
        print("pakai: cek_basi.py lintas|statis [--akar DIR] | uji", file=sys.stderr)
        return 2
    akar = a[a.index("--akar") + 1] if "--akar" in a else AKAR
    hasil = periksa(a[0], akar)
    galat = lapor(hasil)
    print(f"cek_basi {a[0]}: {len(hasil)} berkas, {galat} galat")
    return 1 if galat else 0


if __name__ == "__main__":
    sys.exit(utama())
