"""Jaga foto Gallery MAGMA 30 hari terakhir di folder lokal: unduh yang belum ada, hapus yang lebih tua dari 30 hari. Berhenti mengunduh bila disk tersisa kurang dari 15 GB."""
import datetime as dt, json, os, re, shutil, sys, time, urllib.request

AKAR = sys.argv[1]
BATAS = (dt.date.today() - dt.timedelta(days=30)).strftime("%Y%m%d")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
POLA = re.compile(r"https://magma\.vsi\.esdm\.go\.id/img/ga/([A-Z0-9]+)/([A-Z0-9]+?)(\d{12})\.(png|jpg)")


def ambil(url, biner=False):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90) as f:
                b = f.read()
                return b if biner else b.decode("utf-8", "replace")
        except Exception as e:
            print(f"{url[-60:]} percobaan {i + 1} gagal: {e}", flush=True)
            time.sleep(10 * (i + 1))
    return None


n = g = 0
tamat = False
for p in range(1, 1500):
    if tamat or shutil.disk_usage(AKAR).free < 15 * 2**30:
        print("berhenti: halaman", p, "habis jendela" if tamat else "disk tipis", flush=True)
        break
    h = ambil(f"https://magma.esdm.go.id/v1/gunung-api/gallery?page={p}")
    time.sleep(1.2)
    if h is None:
        print("halaman gagal", p, flush=True)
        continue
    temu = sorted({m.group(0) for m in POLA.finditer(h)})
    if not temu:
        break
    for u in temu:
        m = POLA.match(u)
        if m.group(3)[:8] < BATAS:
            tamat = True
            continue
        f = os.path.join(AKAR, "foto_magma", m.group(1), u.rsplit("/", 1)[1])
        if os.path.exists(f):
            continue
        b = ambil(u, biner=True)
        time.sleep(1.2)
        if b is None:
            g += 1
            continue
        os.makedirs(os.path.dirname(f), exist_ok=True)
        with open(f + ".tmp", "wb") as o:
            o.write(b)
        os.replace(f + ".tmp", f)
        n += 1
    if p % 50 == 0:
        print(f"halaman {p}, foto {n}, gagal {g}", flush=True)
hapus = 0
for d, _, fs in os.walk(os.path.join(AKAR, "foto_magma")):
    for x in fs:
        m = re.search(r"(\d{12})\.(png|jpg)$", x)
        if m and m.group(1)[:8] < BATAS:
            os.remove(os.path.join(d, x))
            hapus += 1
print(json.dumps({"foto": n, "gagal": g, "batas": BATAS, "dihapus": hapus}), flush=True)
