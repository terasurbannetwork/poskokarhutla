"""Tarik RUP SiRUP per KLPD-tahun ke cache JSON (bisa dilanjut kalau putus)."""
import json, os, sys, time, urllib.parse, urllib.request
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
KLPD = {"146": "BNPB", "258": "Riau", "269": "Jambi", "280": "Sumsel", "508": "Kalbar", "55": "Kalteng", "533": "Kalsel"}

def cari(tahun, kldi, start, length, ep):
    q = {"tahunAnggaran": tahun, "jenisPengadaan": "", "metodePengadaan": "", "minPagu": "", "maxPagu": "",
         "bulan": "", "lokasi": "", "kldi": kldi, "pdn": "", "ukm": "", "draw": 1, "start": start, "length": length,
         "search[value]": "", "order[0][column]": 5, "order[0][dir]": "DESC"}
    url = f"https://sirup.inaproc.id/sirup/caripaketctr/{ep}?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0",
                                               "Referer": "https://sirup.inaproc.id/sirup/caripaketctr/index"})
    for i in range(5):
        try:
            return json.load(urllib.request.urlopen(req, timeout=90))
        except Exception as e:
            err = e; time.sleep(3 * (i + 1))
    raise err

os.makedirs(CACHE, exist_ok=True)
for ep, jalur in (("search_s", "swakelola"), ("search", "penyedia")):
    for kid, nama in KLPD.items():
        for th in (2024, 2025, 2026):
            fn = f"{CACHE}/{jalur}-{nama}-{th}.json"
            if os.path.exists(fn): continue
            rows, start = [], 0
            while True:
                d = cari(th, kid, start, 1000, ep)
                page = d.get("data") or []
                for r in page: r["tahun"] = th; r["klpd"] = nama; r["jalur"] = jalur
                rows += page; start += 1000
                if start >= (d.get("recordsFiltered") or 0) or not page: break
            json.dump(rows, open(fn, "w"))
            print(jalur, nama, th, len(rows), flush=True)
print("SELESAI")
