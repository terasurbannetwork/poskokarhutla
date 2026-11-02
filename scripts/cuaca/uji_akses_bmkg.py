"""Probe: apakah runner GitHub Actions bisa menjangkau API publik BMKG? Selalu exit 0 kecuali crash.
Jalankan: python3 scripts/cuaca/uji_akses_bmkg.py   |   python3 scripts/cuaca/uji_akses_bmkg.py uji (tanpa jaringan)"""
import json, os, sys, urllib.request, urllib.error

URLS = [
    ("prakiraan adm4", "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.03.1001", True),
    ("nowcast", "https://www.bmkg.go.id/alerts/nowcast/id", False),
    ("autogempa", "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json", False),
    ("prakiraan adm2", "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm2=31.71", True),
]
UAS = [
    ("browser", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    ("proyek", "poskokarhutla/1.0 (+https://centurisk97.id)"),
]


def ambil(url, ua):
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read() or b""
    except Exception as e:  # jaringan/timeout
        return type(e).__name__, b""


def baris(nama, ua, status, isi, cek_json):
    awal = isi[:120].decode("utf-8", "replace").replace("|", "/").replace("\n", " ")
    j = "-"
    if cek_json:
        try:
            d = json.loads(isi)
            j = "ya" if isinstance(d, dict) and "data" in d else "JSON tanpa data"
        except Exception:
            j = "bukan JSON"
    return f"| {nama} | {ua} | {status} | {len(isi)} | {j} | `{awal}` |"


def tabel(ambil_fn):
    out = ["| Endpoint | UA | Status | Byte | JSON ber-data | 120 char awal |", "|---|---|---|---|---|---|"]
    for nama, url, cek in URLS:
        for un, ua in UAS:
            s, b = ambil_fn(url, ua)
            out.append(baris(nama, un, s, b, cek))
    return "\n".join(out)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        t = tabel(lambda u, ua: (200, b'{"data":[1]}'))
        assert t.count("\n") == 1 + len(URLS) * len(UAS) and "| ya |" in t
        t = tabel(lambda u, ua: (403, b'{"status":403,"message":"Forbidden"}'))
        assert "| 403 |" in t and "JSON tanpa data" in t
        print("uji OK")
        sys.exit(0)
    t = tabel(ambil)
    print(t)
    p = os.environ.get("GITHUB_STEP_SUMMARY")
    if p:
        with open(p, "a", encoding="utf-8") as f:
            f.write("## Uji akses BMKG dari runner\n\n" + t + "\n")
