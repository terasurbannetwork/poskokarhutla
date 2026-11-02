"""Panen bulanan aktivasi Sentinel Asia untuk Indonesia (dijalankan direktori-bulanan.yml).

python3 -I scripts/akademisi/pemutakhiran/panen_sentinel.py --panen <folder panen> --menit 5
python3 -I scripts/akademisi/pemutakhiran/panen_sentinel.py --cek

Sumber: https://sentinel-asia.org/EO/EmergencyObservation.html (indeks) lalu satu halaman per aktivasi berakhiran ID (Indonesia).
Digabung ke <panen>/aktivasi_sentinel_asia.json berdasarkan id: baris baru ditambah, baris lama dimutakhirkan (produk bertambah
setelah aktivasi). Halaman aktivasi lebih tua dari --hari tidak diunduh ulang. 403/429 = berhenti. Gagal atau hasil kosong =
berkas lama dibiarkan. Dedupe dan pencocokan ke kejadian dilakukan sambung_panen.mjs.
Sopan: UA jujur, jeda 1,1 detik, batas waktu --menit.
"""
import argparse, datetime, html, json, os, re, sys, time, urllib.error, urllib.request

UA = {"User-Agent": "Centurisk97-direktori/1.0 (panen aktivasi Sentinel Asia; centurisk97.id)"}
B = "https://sentinel-asia.org/EO/"
# urutan tidak penting: pencocokan terpanjang dulu
PROV = [("aceh", "11"), ("north sumatra", "12"), ("sumatera utara", "12"), ("west sumatra", "13"), ("sumatera barat", "13"), ("riau", "14"), ("jambi", "15"),
        ("south sumatra", "16"), ("sumatera selatan", "16"), ("bengkulu", "17"), ("lampung", "18"), ("bangka", "19"), ("riau islands", "21"), ("jakarta", "31"),
        ("west java", "32"), ("jawa barat", "32"), ("central java", "33"), ("jawa tengah", "33"), ("yogyakarta", "34"), ("east java", "35"), ("jawa timur", "35"),
        ("banten", "36"), ("bali", "51"), ("lombok", "52"), ("west nusa tenggara", "52"), ("sumbawa", "52"), ("east nusa tenggara", "53"), ("flores", "53"),
        ("lewotobi", "53"), ("timor", "53"), ("west kalimantan", "61"), ("central kalimantan", "62"), ("south kalimantan", "63"), ("east kalimantan", "64"),
        ("north kalimantan", "65"), ("north sulawesi", "71"), ("central sulawesi", "72"), ("palu", "72"), ("south sulawesi", "73"), ("southeast sulawesi", "74"),
        ("gorontalo", "75"), ("west sulawesi", "76"), ("mamuju", "76"), ("maluku", "81"), ("north maluku", "82"), ("west papua", "91"), ("papua", "94"),
        ("sunda strait", "36"), ("anak krakatau", "18"), ("semeru", "35"), ("merapi", "33"), ("sinabung", "12"), ("ruang", "71"), ("cianjur", "32"),
        ("sukabumi", "32"), ("sumedang", "32")]


class Berhenti(Exception):
    pass


def ambil(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40) as f:
            return f.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        if e.code in (403, 429):
            raise Berhenti(f"HTTP {e.code} dari {u}")
        raise


def prov(s):
    s = s.lower()
    return next((v for k, v in sorted(PROV, key=lambda x: -len(x[0])) if k in s), None)


def fld(t, nama):
    m = re.search(nama + r"\s*:\s*\n?\s*(.*?)\n", t)
    return m.group(1).strip() if m else None


def baris(h, link):
    """Satu halaman aktivasi -> satu baris."""
    nb = re.sub(r"<script.*?</script>|<style.*?</style>", "", h, flags=re.S)
    txt = html.unescape(re.sub(r"<[^>]+>", "\n", nb)); txt = re.sub(r"[ \t]+", " ", txt); txt = re.sub(r"\n\s*\n+", "\n", txt)
    tg = datetime.datetime.strptime(re.search(r"article(\d{8})ID", link).group(1), "%Y%m%d").strftime("%Y-%m-%d")
    mm = re.search(r"\n(\d{4}-\d\d-\d\d)\n(.+)\nEmergency Obs", txt)
    kej = mm.group(2).strip() if mm else None
    lok = fld(txt, "Country/Region")
    a = h.find(">Product<"); z = h.find("For more Value Added Products")
    if z < 0:
        z = h.find("Satellite Image")
    seg = h[a:z] if a >= 0 else ""
    prods, seen = [], set()
    for c in re.split(r'<div class="col card">', seg)[1:]:
        t = re.search(r"<h3[^>]*>(.*?)</h3>", c, re.S)
        v = re.search(r'class="col-right btn-view"\s+href="([^"]+)"', c) or re.search(r'class="col btn-download-new"\s+href="([^"]+)"', c) or re.search(r'href="([^"]+)"', c)
        if not (t and v):
            continue
        u = v.group(1); full = u if u.startswith("http") else B + link.split("/")[0] + "/" + u
        if full not in seen:
            seen.add(full); prods.append({"judul": html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t.group(1)))).strip(), "url": full})
    if kej:
        m = re.search(r"\bin (.+?)(?: on \d| \d{1,2} \w+,? \d{4}|$)", kej)
        lok = m.group(1).strip() if m else lok
    elif lok == "Indonesia":
        lok = None
    return {"id": link.split("/")[1][len("article"):-5], "tanggal": tg, "tanggal_aktivasi_sa": fld(txt, r"SA activation Date\(UTC\)"), "kejadian": kej,
            "jenis bencana": fld(txt, "Disaster Type"), "lokasi teks": None if lok == "Indonesia" else lok, "prov": prov((kej or "") + " " + (fld(txt, "Country/Region") or "")),
            "peminta": fld(txt, "Requester"), "glide": fld(txt, "GLIDE Number"), "produk": prods, "sumber_url": B + link}


def gabung(lama, baru):
    per = {r["id"]: i for i, r in enumerate(lama)}; hasil = list(lama)
    for r in baru:
        if r["id"] in per:
            hasil[per[r["id"]]] = {**hasil[per[r["id"]]], **{k: v for k, v in r.items() if v not in (None, [])}}
        else:
            hasil.append(r)
    return hasil


def panen(lama, menit, hari):
    t0, batas = time.time(), (datetime.date.today() - datetime.timedelta(days=hari)).strftime("%Y%m%d")
    known = {r["id"] for r in lama}
    links = sorted(set(re.findall(r'href="(\d{4}/article\d+ID\d*\.html)"', ambil(B + "EmergencyObservation.html"))))
    print(f"indeks: {len(links)} aktivasi Indonesia")
    baru = []
    for l in links:
        idr = l.split("/")[1][len("article"):-5]
        if idr in known and re.search(r"article(\d{8})", l).group(1) < batas:
            continue
        if time.time() - t0 > menit * 60:
            print("batas waktu tercapai"); break
        time.sleep(1.1)
        try:
            baru.append(baris(ambil(B + l), l))
        except Berhenti as e:
            print(f"berhenti: {e}"); break
        except Exception as e:
            print(f"GAGAL {l}: {str(e)[:80]}")
    return baru


def cek():
    h = ('<html>Flood and Landslide in West Java, Indonesia on 03 December, 2024\n2024-12-03\nFlood and Landslide in West Java, Indonesia on 03 December, 2024\n'
         '<p>Emergency Obs. Request Information</p><p>Disaster Type: </p><p>Flood and Landslide</p><p>Country/Region: </p><p>Indonesia</p>'
         '<p>SA activation Date(UTC): </p><p>06 December, 2024</p><p>Requester: </p><p>National Research and Innovation Agency (BRIN)</p>'
         '<p>GLIDE Number: </p><p>FL-2024-000221-IDN</p>'
         '<h2>Product</h2><div class="row cards"><div class="col card"><h3>EOS-RS Damage Proxy Map: <br>Sukabumi &amp; Cianjur</h3>'
         '<a class="col btn-download-new" href="article20241203ID/a.png"></a><a class="col-right btn-view" href="article20241203ID/a_view.png"></a></div></div>'
         '<p>For more Value Added Products</p></html>')
    r = baris(h, "2024/article20241203ID.html")
    assert r["id"] == "20241203ID" and r["tanggal"] == "2024-12-03" and r["prov"] == "32" and r["glide"] == "FL-2024-000221-IDN", r
    assert r["lokasi teks"] == "West Java, Indonesia" and r["jenis bencana"] == "Flood and Landslide" and r["peminta"].endswith("(BRIN)"), r
    assert r["produk"] == [{"judul": "EOS-RS Damage Proxy Map: Sukabumi & Cianjur", "url": B + "2024/article20241203ID/a_view.png"}], r["produk"]
    g = gabung([{"id": "x", "produk": []}, {"id": "20241203ID", "prov": None, "produk": []}], [r, {"id": "y", "produk": []}])
    assert [x["id"] for x in g] == ["x", "20241203ID", "y"] and g[1]["prov"] == "32" and len(g[1]["produk"]) == 1
    print("panen_sentinel: cek lulus")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--panen"); ap.add_argument("--menit", type=float, default=5); ap.add_argument("--hari", type=int, default=120); ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    if a.cek:
        cek(); sys.exit(0)
    p = os.path.join(a.panen, "aktivasi_sentinel_asia.json")
    if not os.path.exists(p):
        print("aktivasi_sentinel_asia.json lama tidak ada: tidak menulis apa pun"); sys.exit(0)
    d = json.load(open(p)); lama = d["baris"]
    try:
        baru = panen(lama, a.menit, a.hari)
    except Berhenti as e:
        print(f"berhenti: {e}"); sys.exit(0)
    except Exception as e:
        print(f"gagal, berkas lama dibiarkan: {str(e)[:100]}"); sys.exit(0)
    hasil = gabung(lama, baru)
    if baru and hasil != lama:
        d.update({"dibuat": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "baris": hasil})
        json.dump(d, open(p, "w"), ensure_ascii=False, indent=1)
    print(f"aktivasi_sentinel_asia: {len(lama)} lama, {len(hasil) - len(lama)} baru, {len(baru)} halaman dibaca")
