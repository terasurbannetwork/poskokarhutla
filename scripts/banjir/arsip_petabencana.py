"""Arsip harian laporan banjir PetaBencana.id -> data/banjir/arsip_petabencana/YYYY-MM.jsonl.gz (append-only, dilacak git,
TIDAK dilayani situs). Endpoint publik tanpa auth: https://data.petabencana.id/reports/archive (server lambat, timeout 180 dtk).
Lisensi data: CC BY 4.0 / CC BY-NC 4.0 (docs.petabencana.id); atribusi "PetaBencana.id" wajib bila ditampilkan. Ditulis di tiap baris (`lisensi`).
Satu baris per hari WIB: {"hari","ambil"(UTC),"lisensi","n","fitur":[GeoJSON feature,...]} (hari kosong tetap diarsip, n=0);
gagal -> {"hari","ambil","gagal"} (bukan arsip; hari itu diulang). Tiap run: kemarin WIB + hari gagal/hilang <=7 hari ke belakang.
Berkas bulanan = gzip beruntun. Pakai:  python3 scripts/banjir/arsip_petabencana.py   |   ... uji
(Panen historis massal: data/raw/publik/petabencana/pb_arsip.py.)
"""
import datetime as dt, gzip, json, os, sys, tempfile, time, urllib.parse, urllib.request

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARSIP = os.path.join(AKAR, "data/banjir/arsip_petabencana")
API = "https://data.petabencana.id/reports/archive?"
LISENSI = "CC BY 4.0 / CC BY-NC 4.0, PetaBencana.id"
WIB = dt.timezone(dt.timedelta(hours=7))
MUNDUR = 7


def berkas(hari):
    return os.path.join(ARSIP, hari.isoformat()[:7] + ".jsonl.gz")


def sudah(hari):
    """True bila hari itu sudah punya baris sukses."""
    b = berkas(hari)
    if not os.path.exists(b):
        return False
    with gzip.open(b, "rt", encoding="utf-8") as f:
        return any(r["hari"] == hari.isoformat() and "fitur" in r for r in map(json.loads, f))


def tambah(hari, baris):
    os.makedirs(ARSIP, exist_ok=True)
    with gzip.open(berkas(hari), "at", encoding="utf-8") as f:
        f.write(json.dumps(baris, ensure_ascii=False, separators=(",", ":")) + "\n")


def unduh(hari):
    q = urllib.parse.urlencode({"start": f"{hari}T00:00:00+0700", "end": f"{hari + dt.timedelta(days=1)}T00:00:00+0700",
                                "geoformat": "geojson"})
    req = urllib.request.Request(API + q, headers={"User-Agent": "poskokarhutla-arsip/1.0"})
    d = json.load(urllib.request.urlopen(req, timeout=180))
    return (d.get("result") or {}).get("features") or []


def arsipkan(hari, ambil_fn=unduh):
    ts = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for c in range(3):
        try:
            f = ambil_fn(hari)
            tambah(hari, {"hari": hari.isoformat(), "ambil": ts, "lisensi": LISENSI, "n": len(f), "fitur": f})
            return True
        except Exception as e:
            galat = e
            time.sleep(10 if ambil_fn is unduh else 0)
    tambah(hari, {"hari": hari.isoformat(), "ambil": ts, "gagal": str(galat)[:120]})
    return False


def jalan():
    kemarin = dt.datetime.now(WIB).date() - dt.timedelta(days=1)
    ok = gagal = 0
    for i in range(MUNDUR):
        h = kemarin - dt.timedelta(days=i)
        if sudah(h):
            continue
        if arsipkan(h):
            ok += 1
        else:
            gagal += 1
        time.sleep(2)
    b = berkas(kemarin)
    print(f"arsip_petabencana sampai {kemarin}: baru {ok}, gagal {gagal}, ukuran {os.path.getsize(b) if os.path.exists(b) else 0} B")
    return 1 if gagal else 0


def uji():
    global ARSIP
    with tempfile.TemporaryDirectory() as d:
        ARSIP = d
        h = dt.date(2026, 11, 3)
        assert not sudah(h)
        def gagal(_): raise OSError("timeout")
        assert not arsipkan(h, gagal) and not sudah(h), "gagal tidak boleh dihitung arsip"
        assert arsipkan(h, lambda _: [{"id": 1}]) and sudah(h)
        assert arsipkan(dt.date(2026, 11, 2), lambda _: []) and sudah(dt.date(2026, 11, 2)), "hari kosong tetap diarsip"
        with gzip.open(berkas(h), "rt") as f:
            r = [json.loads(x) for x in f]
        assert [x.get("n") for x in r] == [None, 1, 0] and r[1]["lisensi"] == LISENSI, r
    print("arsip_petabencana uji: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else sys.exit(jalan())
