"""Penjaga kesegaran data: baca stempel `dibuat` (atau setara) tiap berkas status modul, banding dengan batas umur, tulis
public/data/kesegaran.json, dan beri anotasi ::warning di Actions bila telat, hilang, atau tanpa stempel. Tidak pernah gagal (keluar 0):
penjaga ini memberi tahu, bukan menghalangi terbit.

Batas umur (jam) = jeda terpanjang antar-run sumbernya + ruang telat cron GitHub (±1 jam, p90 ±1) + ruang jaga.yml:
  titik.yml 3 jam            -> 8   (sama dengan /api/status: titik > 8 jam = 503)
  harian (banjir, lintas, gempa, prediksi) -> 30  (jaga_jadwal.mjs memicu pengganti setelah 25 jam)
  jarak_pandang.yml jam 22-10 UTC (jeda malam 12 jam) -> 15
  udara.yml 06 dan 18 UTC (jeda 12 jam) -> 18
Ubah batas bersama jadwal workflow-nya; gerbang tests/agen/kesegaran.test.mjs mencocokkan tabel dengan cron.

Pakai:  python3 scripts/agents/kesegaran.py                       # berkas lokal (di CI: sesaat sebelum deploy = yang akan tayang)
        python3 scripts/agents/kesegaran.py --live https://centurisk97.id   # yang sedang tayang
        python3 scripts/agents/kesegaran.py uji                    # self-check
"""
import datetime as dt, json, os, sys, tempfile, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
KELUAR = "public/data/kesegaran.json"

# (modul, berkas, kunci stempel, batas jam, sumber jadwal)
TABEL = [
    ("karhutla", "public/data/meta.json", "dibuat", 8, "titik.yml"),
    ("karhutla", "public/data/hotspot.json", "acuan", 8, "titik.yml"),
    ("banjir", "public/banjir/data/meta.json", "dibuat", 30, "banjir.yml"),
    ("banjir", "public/banjir/data/rob.json", "dibuat", 30, "banjir.yml"),
    ("longsor", "public/longsor/data/nowcast.json", "dibuat", 30, "lintas.yml"),
    ("cuaca", "public/banjir/data/cuaca_meta.json", "dibuat", 30, "lintas.yml"),
    ("cuaca", "public/banjir/data/cuaca_metar.json", "dibuat", 15, "jarak_pandang.yml"),
    ("udara", "public/udara/data/prakiraan.json", "dibuat", 18, "udara.yml"),
    ("udara", "public/udara/data/jarak_pandang.json", "dibuat", 15, "jarak_pandang.yml"),
    ("gempa", "public/gempa/data/laporan.json", "dibuat", 30, "gempa.yml"),
    ("gunung api", "public/banjir/data/gunungapi_status.json", "dibuat", 8, "titik.yml (magma.py cepat)"),
    ("kekeringan", "public/data/kekeringan_hth.json", "dibuat", 30, "lintas.yml"),
    ("kekeringan", "public/kekeringan/data/gdo.json", "dibuat", 30, "lintas.yml"),
    ("pesisir", "public/pesisir/data/rob_kejadian.json", "dibuat", 30, "banjir.yml"),
    ("prediksi", "public/prediksi/data/prediksi.json", "dibuat", 30, "prediksi.yml"),
]


def waktu(s):
    """string stempel -> datetime sadar zona; tanggal saja = 00.00 WIB; tanpa zona = WIB; None bila tak terbaca."""
    try:
        t = dt.datetime.fromisoformat(str(s).strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=WIB)


def baca(berkas, live, akar):
    """-> dict, atau None bila hilang/rusak."""
    try:
        if live:
            jalur = berkas.removeprefix("public/")
            req = urllib.request.Request(f"{live.rstrip('/')}/{jalur}?cek={int(dt.datetime.now().timestamp())}", headers={"User-Agent": "poskokarhutla-ci/kesegaran"})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.load(r)
        else:
            with open(os.path.join(akar, berkas), encoding="utf-8") as f:
                d = json.load(f)
        return d if isinstance(d, dict) else {}
    except Exception:  # noqa: BLE001
        return None


def periksa(akar=AKAR, kini=None, live=None, tabel=TABEL):
    kini = kini or dt.datetime.now(dt.timezone.utc)
    baris = []
    for modul, berkas, kunci, batas, sumber in tabel:
        d = baca(berkas, live, akar)
        b = {"modul": modul, "berkas": berkas, "kunci": kunci, "batas_jam": batas, "sumber": sumber, "stempel": None, "umur_jam": None}
        if d is None:
            b["status"] = "hilang"
        else:
            t = waktu(d.get(kunci)) if d.get(kunci) else None
            if t is None:
                b["status"] = "tanpa_stempel"
            else:
                b["stempel"] = t.astimezone(WIB).isoformat(timespec="minutes")
                b["umur_jam"] = round((kini - t).total_seconds() / 3600, 1)
                b["status"] = "telat" if b["umur_jam"] > batas else "segar"
        baris.append(b)
    hitung = {s: sum(1 for b in baris if b["status"] == s) for s in ("segar", "telat", "hilang", "tanpa_stempel")}
    return {"dibuat": kini.astimezone(WIB).isoformat(timespec="minutes"), "sumber": live or "berkas lokal", "ringkas": hitung, "berkas": baris}


def lapor(hasil):
    for b in hasil["berkas"]:
        if b["status"] == "segar":
            continue
        rinci = {"telat": f"umur {b['umur_jam']} jam > batas {b['batas_jam']} (stempel {b['stempel']}; sumber {b['sumber']})",
                 "hilang": "berkas tidak ada atau tidak terbaca", "tanpa_stempel": f"kunci '{b['kunci']}' kosong atau bukan tanggal"}[b["status"]]
        print(f"::warning title=Data {b['status']}: {b['modul']}::{b['berkas']} {rinci}")


def uji():
    kini = dt.datetime(2026, 11, 10, 12, 0, tzinfo=dt.timezone.utc)
    with tempfile.TemporaryDirectory() as tmp:
        def tulis(p, d):
            os.makedirs(os.path.dirname(os.path.join(tmp, p)), exist_ok=True)
            json.dump(d, open(os.path.join(tmp, p), "w"))
        tabel = [("a", "public/a.json", "dibuat", 8, "x"), ("b", "public/b.json", "dibuat", 8, "x"), ("c", "public/c.json", "dibuat", 8, "x"),
                 ("d", "public/d.json", "dibuat", 8, "x"), ("e", "public/e.json", "acuan", 30, "x"), ("f", "public/f.json", "dibuat", 8, "x")]
        tulis("public/a.json", {"dibuat": "2026-11-10T17:00:00+07:00"})   # 10:00Z = 2 jam
        tulis("public/b.json", {"dibuat": "2026-11-10T01:00Z"})           # 11 jam: telat
        tulis("public/d.json", {"sumber": "tanpa stempel"})
        tulis("public/e.json", {"acuan": "2026-11-10"})                   # tanggal saja = 00.00 WIB = 09 Nov 17:00Z
        tulis("public/f.json", {"dibuat": "bukan tanggal"})
        h = periksa(tmp, kini, tabel=tabel)
        s = {b["modul"]: b for b in h["berkas"]}
        assert s["a"]["status"] == "segar" and s["a"]["umur_jam"] == 2.0, s["a"]
        assert s["b"]["status"] == "telat" and s["b"]["umur_jam"] == 11.0, s["b"]
        assert s["c"]["status"] == "hilang", s["c"]
        assert s["d"]["status"] == "tanpa_stempel" and s["f"]["status"] == "tanpa_stempel"
        assert s["e"]["status"] == "segar" and s["e"]["umur_jam"] == 19.0, s["e"]
    print("kesegaran: uji lulus")


def utama():
    if sys.argv[1:] == ["uji"]:
        return uji()
    live = sys.argv[sys.argv.index("--live") + 1] if "--live" in sys.argv else None
    h = periksa(live=live)
    os.makedirs(os.path.dirname(os.path.join(AKAR, KELUAR)), exist_ok=True)
    with open(os.path.join(AKAR, KELUAR), "w", encoding="utf-8") as f:
        json.dump(h, f, ensure_ascii=False, indent=1)
    lapor(h)
    print(f"kesegaran: {h['ringkas']}")


if __name__ == "__main__":
    utama()
