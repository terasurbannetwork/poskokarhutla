"""Arsip permanen bacaan tinggi muka air pos (D1 sihka_baca, dihapus Worker sesudah 180 hari) -> berkas harian + R2.

  tarik [--hari YYYY-MM-DD]   baca satu hari UTC dari D1 produksi -> data/raw/banjir/arsip_pos/YYYY/MM/YYYY-MM-DD.jsonl.gz + pos_meta.json
  unggah [--hari YYYY-MM-DD]  berkas itu -> R2 poskokarhutla-foto/arsip/pos_sungai/YYYY/MM/YYYY-MM-DD.jsonl.gz (+ pos_meta.json)
  susul [--maks N]            tiap hari 2026-10-19..kemarin yang belum ada: pulihkan dari R2, kalau tak ada tarik lalu unggah (paling lama dulu)
  uji                         self-check tanpa jaringan
Bawaan --hari = kemarin UTC. Butuh CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID di env (tidak pernah dicetak).

Biaya baca D1: sihka_baca PK (pos,t) tanpa indeks t, jadi `WHERE t BETWEEN` memindai tabel penuh. Pakai
`pos IN (SELECT pos FROM sihka_pos) AND t >= ? AND t < ?`: SQLite mencari per pos lewat PK (EXPLAIN: SEARCH ... pos=? AND t>? AND t<?),
baca ~ baris hari itu + satu seek per pos. Bacaan dari pos yang sudah dibuang dari sihka_pos tidak ikut (Worker membuangnya juga).
"""
import argparse, datetime as dt, gzip, json, os, subprocess, sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.join(AKAR, "data/raw/banjir/arsip_pos")
MULAI = dt.date(2026, 10, 19)
WRANGLER = ["npx", "--yes", "wrangler@4.42.0"]
DB, BUCKET = "poskowarga", "poskokarhutla-foto"
SQL_HARI = "SELECT pos, t, v FROM sihka_baca WHERE pos IN (SELECT pos FROM sihka_pos) AND t >= {a} AND t < {b} ORDER BY pos, t"
SQL_META = ("SELECT p.pos, p.nama, p.x, p.y, p.satuan, p.tz, p.merek, p.dilihat, m.sumber, m.pengelola, m.lon, m.lat, m.a3, m.a2, m.a1, m.resmi, m.jenis "
            "FROM sihka_pos p LEFT JOIN sungai_meta m ON m.pos = p.pos")
SQL_META_DASAR = "SELECT pos, nama, x, y, satuan, tz, merek, dilihat FROM sihka_pos"


def kemarin():
    return dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=1)


def rentang(hari):
    """[00:00, 24:00) UTC hari itu dalam detik epoch."""
    a = int(dt.datetime(hari.year, hari.month, hari.day, tzinfo=dt.timezone.utc).timestamp())
    return a, a + 86400


def jalur(hari):
    return os.path.join(DIR, f"{hari:%Y}/{hari:%m}/{hari:%Y-%m-%d}.jsonl.gz")


def kunci_r2(hari):
    return f"arsip/pos_sungai/{hari:%Y}/{hari:%m}/{hari:%Y-%m-%d}.jsonl.gz"


def urai(teks):
    """Keluaran `wrangler d1 execute --json`: [{"results":[...],"success":true}] (kadang didahului log npx) -> baris."""
    i = teks.find("[")
    if i < 0:
        raise ValueError("keluaran wrangler bukan JSON")
    d = json.loads(teks[i:])
    if not d or not all(x.get("success") for x in d):
        raise ValueError("wrangler melaporkan gagal")
    return [r for x in d for r in x.get("results", [])]


def d1(sql):
    r = subprocess.run(WRANGLER + ["d1", "execute", DB, "--remote", "--json", "--command", sql],
                       capture_output=True, text=True, timeout=600)
    if r.returncode:
        raise RuntimeError("wrangler d1 gagal: " + r.stderr[-300:])  # stderr tak memuat token
    return urai(r.stdout)


def tulis_gz(path, baris):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with gzip.GzipFile(tmp, "wb", mtime=0) as f:  # mtime 0: isi sama = berkas sama
        for r in baris:
            f.write((json.dumps({"pos": r["pos"], "t": r["t"], "v": r["v"]}, separators=(",", ":")) + "\n").encode())
    os.replace(tmp, path)


class Kosong(Exception):
    """Hari tanpa baris di D1: bukan kegagalan jaringan; dicatat sebagai penanda, bukan berkas data."""


def jalur_kosong(hari):
    return jalur(hari)[:-len(".jsonl.gz")] + ".kosong"


def tandai_kosong(hari, dicoba):
    n_pos = d1("SELECT count(*) AS n FROM sihka_pos")[0]["n"]
    m = {"hari": hari.isoformat(), "alasan": "0 baris sihka_baca di D1", "pos": n_pos, "dicoba": dicoba,
         "dicatat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}
    os.makedirs(os.path.dirname(jalur_kosong(hari)), exist_ok=True)
    json.dump(m, open(jalur_kosong(hari), "w"), ensure_ascii=False)
    r = r2("put", f"{BUCKET}/{kunci_r2(hari)[:-len('.jsonl.gz')]}.kosong.json", "--file", jalur_kosong(hari), "--content-type", "application/json")
    if r.returncode:
        raise RuntimeError(f"unggah penanda kosong {hari} gagal: {r.stderr[-300:]}")
    print(f"{hari}: kosong (percobaan {dicoba}), penanda dicatat")


def perlu_ulang_kosong(hari, m, kini):
    """Hari kosong dicoba ulang sekali, paling cepat 2 hari sesudahnya; sesudah itu final."""
    return m.get("dicoba", 1) < 2 and (kini - hari).days >= 2


def tarik(hari):
    a, b = rentang(hari)
    baris = d1(SQL_HARI.format(a=a, b=b))
    if not baris:
        raise Kosong(hari)
    try:
        meta = d1(SQL_META)
    except RuntimeError as e:  # hanya bila sungai_meta (migrasi 0066) belum ada; galat lain = gagal
        if "no such table" not in str(e).lower():
            raise
        meta = d1(SQL_META_DASAR)
    tmp = os.path.join(DIR, "pos_meta.json.tmp")
    os.makedirs(DIR, exist_ok=True)
    json.dump({"diambil": hari.isoformat(), "pos": meta}, open(tmp, "w"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, os.path.join(DIR, "pos_meta.json"))
    tulis_gz(jalur(hari), baris)  # terakhir: berkas data ada = meta sudah ada
    n_pos = len({r["pos"] for r in baris})
    print(f"{hari}: {len(baris)} baris, {n_pos} pos, {os.path.getsize(jalur(hari))} byte -> {jalur(hari)}")
    return len(baris)


def r2(*a):
    return subprocess.run(WRANGLER + ["r2", "object", *a, "--remote"], capture_output=True, text=True, timeout=300)


def unggah(hari):
    for kunci, f, tipe in ((kunci_r2(hari), jalur(hari), "application/gzip"),
                           ("arsip/pos_sungai/pos_meta.json", os.path.join(DIR, "pos_meta.json"), "application/json")):
        r = r2("put", f"{BUCKET}/{kunci}", "--file", f, "--content-type", tipe)
        if r.returncode:
            raise RuntimeError(f"unggah {kunci} gagal: {r.stderr[-300:]}")
    print(f"{hari}: terunggah {kunci_r2(hari)}")


def akhir():
    """Hari terakhir yang diarsipkan: H-2 (bacaan terlambat dalam jendela ingest 6 jam sudah masuk)."""
    return dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=2)


def jalur_ok(hari):
    return jalur(hari) + ".ok"


def bersih(e):
    """Pesan galat aman untuk anotasi workflow: satu baris, tanpa '::' dan '%'."""
    return str(e).replace("\n", " ").replace("\r", " ").replace("::", ": ").replace("%", "%25")[:300]


def tidak_ada(r):
    """r2 get gagal karena objeknya memang tidak ada (bukan jaringan/izin)?"""
    e = (r.stderr + r.stdout).lower()
    return "does not exist" in e or "not found" in e or "nosuchkey" in e or "10007" in e


def ambil_r2(kunci, ke):
    """True bila objek terambil, False bila tidak ada; galat lain -> RuntimeError."""
    r = r2("get", f"{BUCKET}/{kunci}", "--file", ke)
    if r.returncode == 0:
        return True
    if os.path.exists(ke):
        os.remove(ke)
    if tidak_ada(r):
        return False
    raise RuntimeError(f"r2 get {kunci} gagal: {r.stderr[-200:]}")


def tandai_ok(hari):
    open(jalur_ok(hari), "w").close()


def susul(maks):
    n, hari, kini = 0, MULAI, akhir()
    try:
        while hari <= kini and n < maks:
            p, k = jalur(hari), jalur_kosong(hari)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            if os.path.exists(jalur_ok(hari)):
                pass
            elif os.path.exists(p):  # sudah ditarik tapi unggah belum sukses: unggah ulang, jangan tarik ulang
                unggah(hari)
                tandai_ok(hari)
                n += 1
            elif ambil_r2(kunci_r2(hari), p):
                print(f"{hari}: sudah di R2, dipulihkan ke lokal")
                tandai_ok(hari)
            else:
                kunci_k = kunci_r2(hari)[:-len(".jsonl.gz")] + ".kosong.json"
                if not os.path.exists(k):
                    ambil_r2(kunci_k, k)
                m = json.load(open(k)) if os.path.exists(k) else None
                if not m or perlu_ulang_kosong(hari, m, kini):
                    try:
                        tarik(hari)
                        unggah(hari)
                        tandai_ok(hari)
                    except Kosong:
                        tandai_kosong(hari, (m or {}).get("dicoba", 0) + 1)
                    n += 1
            hari += dt.timedelta(days=1)
    except Exception as e:
        print(f"::warning title=arsip pos {hari}::{bersih(e)}")
        return 1  # lain kali dicoba lagi; hari yang sudah ditarik tidak ditarik ulang
    print(f"susul selesai: {n} hari baru")
    return 0


def uji():
    global DIR, unggah, tarik, akhir
    d = dt.date(2026, 10, 31)
    a, b = rentang(d)
    assert (a, b) == (1793404800, 1793491200) and b - a == 86400, (a, b)
    p = jalur(d)
    assert p.endswith("arsip_pos/2026/10/2026-10-31.jsonl.gz") and kunci_r2(d) == "arsip/pos_sungai/2026/10/2026-10-31.jsonl.gz"
    assert rentang(dt.date(2026, 11, 1))[0] == b  # hari bersebelahan tidak tumpang tindih
    s = 'npx log\n[{"results":[{"pos":"a","t":1,"v":1.5},{"pos":"b","t":2,"v":2}],"success":true,"meta":{}}]'
    assert urai(s) == [{"pos": "a", "t": 1, "v": 1.5}, {"pos": "b", "t": 2, "v": 2}]
    assert urai('[{"results":[],"success":true}]') == []
    for jelek in ("tanpa json", '[{"results":[],"success":false}]', "[]"):
        try:
            urai(jelek)
            raise SystemExit("urai harus menolak: " + jelek)
        except ValueError:
            pass
    h = dt.date(2026, 10, 20)
    assert jalur_kosong(h).endswith("arsip_pos/2026/10/2026-10-20.kosong")
    m = {"dicoba": 1}
    assert not perlu_ulang_kosong(h, m, dt.date(2026, 10, 21))   # belum 2 hari
    assert perlu_ulang_kosong(h, m, dt.date(2026, 10, 22))       # ulang sekali
    assert not perlu_ulang_kosong(h, {"dicoba": 2}, dt.date(2026, 12, 1))  # final
    assert akhir() == dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=2)
    assert "\n" not in bersih("a::b\nc%d") and "::" not in bersih("a::b") and bersih("x" * 999) == "x" * 300
    class R:
        def __init__(s, e): s.stderr, s.stdout = e, ""
    assert tidak_ada(R("The specified key does not exist. [code: 10007]")) and not tidak_ada(R("fetch failed ETIMEDOUT"))
    # jalur .ok: berkas lokal ada tanpa .ok harus diunggah ulang, bukan dilewati
    import tempfile
    asli = (DIR, unggah, tarik, akhir)
    DIR = tempfile.mkdtemp(); dipanggil = []
    akhir = lambda: MULAI
    unggah = lambda h: dipanggil.append(("unggah", h))
    tarik = lambda h: dipanggil.append(("tarik", h))
    tulis_gz(jalur(MULAI), [{"pos": "a", "t": 1, "v": 1}])
    assert susul(7) == 0 and dipanggil == [("unggah", MULAI)] and os.path.exists(jalur_ok(MULAI))
    dipanggil.clear(); assert susul(7) == 0 and dipanggil == []  # sudah .ok: dilewati
    DIR, unggah, tarik, akhir = asli
    # fallback meta hanya untuk 'no such table'
    d1_asli = d1
    def d1_palsu(msg):
        def f(sql):
            if "sungai_meta" in sql: raise RuntimeError(msg)
            return [{"pos": "a", "t": 1, "v": 1}] if "sihka_baca" in sql else [{"pos": "a"}]
        return f
    globals()["d1"] = d1_palsu("D1_ERROR: no such table: sungai_meta")
    DIR = tempfile.mkdtemp(); tarik(MULAI)
    globals()["d1"] = d1_palsu("D1_ERROR: timeout")
    try:
        tarik(MULAI + dt.timedelta(days=1)); raise SystemExit("galat non-'no such table' harus gagal")
    except RuntimeError: pass
    assert not os.path.exists(jalur(MULAI + dt.timedelta(days=1)))
    globals()["d1"] = d1_asli; DIR = asli[0]
    t = os.path.join(tempfile.mkdtemp(), "x.jsonl.gz")
    tulis_gz(t, [{"pos": "a", "t": 1, "v": 1.5, "lain": 9}])
    assert [json.loads(x) for x in gzip.open(t, "rt")] == [{"pos": "a", "t": 1, "v": 1.5}]
    print("arsip_pos uji ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["tarik", "unggah", "susul", "uji"])
    ap.add_argument("--hari", type=dt.date.fromisoformat, default=None)
    ap.add_argument("--maks", type=int, default=7)
    o = ap.parse_args()
    h = o.hari or kemarin()
    if o.cmd == "uji":
        uji()
    elif o.cmd == "tarik":
        tarik(h)
    elif o.cmd == "unggah":
        unggah(h)
    else:
        sys.exit(susul(o.maks))
