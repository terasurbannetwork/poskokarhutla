import json, ssl, urllib.request, collections, sys
URL = "https://dibi.bnpb.go.id/api/v1/chart/data"
KOL = ["id", "tahun", "dt", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana", "is_bencana"]
NUM = ["meninggal", "hilang", "mengungsi", "menderita", "rumah_rusak_berat", "rumah_rusak_sedang", "rumah_terendam"]


def ambil():
    b = {"datasource": {"id": 1, "type": "table"}, "form_data": {"slice_id": 1, "dashboardId": 1},
         "queries": [{"columns": KOL, "metrics": [{"expressionType": "SQL", "sqlExpression": f"SUM({c})", "label": c} for c in NUM],
                      "row_limit": 100000, "orderby": []}], "result_format": "json", "result_type": "full"}
    r = urllib.request.Request(URL, json.dumps(b).encode(), {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(r, timeout=600, context=ssl.create_default_context()))["result"][0]["data"]


import os; TER = float(os.environ.get("TER", "1"))
rows = ambil()
pend = {k: v["n"] for k, v in json.load(open(r"D:/Project/Work/BNPB/poskokarhutla/public/data/bnpb/kerentanan.json", encoding="utf-8"))["kab"].items()}
print("baris", len(rows), file=sys.stderr)
v = lambda r, c: r.get(c) or 0


def jenis(r):
    return (r["jenis_bencana"] or "").lower()


def uji(r):
    j = jenis(r)
    alasan = []
    if v(r, "meninggal") >= 30: alasan.append("meninggal>=30")
    if v(r, "rumah_rusak_berat") >= 600: alasan.append("rusak berat>=600")
    if any(k in j for k in ["banjir", "gelombang", "abrasi", "cuaca", "puting", "angin"]):
        s = v(r, "rumah_rusak_berat") + 0.5 * v(r, "rumah_rusak_sedang") + v(r, "rumah_terendam") / 3 * TER
        if s >= 600: alasan.append(f"rumah setara {s:.0f}")
    if "longsor" in j and v(r, "mengungsi") >= 1000: alasan.append("mengungsi>=1000")
    if "kekeringan" in j:
        n = pend.get(str(r.get("id_kab_bps") or ""))
        if n and v(r, "menderita") / n >= 0.15: alasan.append(f"terdampak {100*v(r,'menderita')/n:.0f}% penduduk")
    return alasan


per = collections.defaultdict(lambda: collections.Counter())
contoh = collections.defaultdict(list)
tahun = collections.defaultdict(lambda: collections.Counter())
for r in rows:
    j = r["jenis_bencana"] or "?"
    a = uji(r)
    umum = any(x.startswith(("meninggal", "rusak berat")) for x in a)
    c = per[j]
    c["baris"] += 1; c["md"] += v(r, "meninggal"); c["rb"] += v(r, "rumah_rusak_berat"); c["ung"] += v(r, "mengungsi")
    if umum: c["umum"] += 1
    if a:
        c["intensif"] += 1; c["md_int"] += v(r, "meninggal"); c["rb_int"] += v(r, "rumah_rusak_berat"); c["ung_int"] += v(r, "mengungsi")
        tahun[r["tahun"]]["intensif"] += 1
        if not umum:
            c["baru"] += 1
            contoh[j].append((r["tahun"], r["kabupaten"], r["provinsi"], ", ".join(a), v(r, "meninggal"), v(r, "rumah_rusak_berat"), v(r, "rumah_terendam"), v(r, "mengungsi"), v(r, "menderita")))
    if umum: tahun[r["tahun"]]["umum"] += 1
    tahun[r["tahun"]]["baris"] += 1
    if "kekeringan" in j.lower() and not pend.get(str(r.get("id_kab_bps") or "")): c["tanpa_penduduk"] += 1

out = {"per_jenis": per, "tahun": tahun, "contoh": {k: sorted(x, key=lambda t: -t[6])[:8] for k, x in contoh.items()}}
json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=dict)
T = collections.Counter()
for j, c in sorted(per.items(), key=lambda x: -x[1]["baris"]):
    T.update(c)
    print(f"{j[:28]:28} baris {c['baris']:6} | umum {c['umum']:4} | total intensif {c['intensif']:4} (+{c['baru']}) | %kematian intensif {100*c['md_int']/max(c['md'],1):5.1f}")
print("TOTAL", dict((k, T[k]) for k in ["baris", "umum", "intensif", "baru"]), f"%md {100*T['md_int']/T['md']:.1f} %rb {100*T['rb_int']/T['rb']:.1f} %ung {100*T['ung_int']/max(T['ung'],1):.1f}")
