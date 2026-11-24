"""Uji batas intensif final (24 Nov 2026) pada dasbor publik DIBI. Bukti internal, tidak dikutip dalam naskah.

Batas yang dapat diuji dengan kolom DIBI:
  1  meninggal + hilang >= 30 (dibandingkan dengan meninggal saja, versi GAR)
  2  rumah rusak berat + 1/2 rusak sedang >= 600 (DIBI tidak punya rumah tidak dapat dihuni sementara; terendam berbobot 0)
  3  tanah longsor: mengungsi >= 1.000
  4  kekeringan: menderita / penduduk kab >= 15 persen (proksi; syarat 20 liter dan 15 hari tidak terukur)
Batas 5 sampai 7 (puso, luas terbakar) tidak punya kolom di DIBI.
Satuan: satu baris DIBI = satu catatan kabupaten/kota per tanggal, sama dengan satuan GAR.
Pemakaian: py uji_batas.py hasil.json [salinan_lokal.json]
Tanpa argumen kedua, data ditarik dari dasbor publik DIBI. Dengan argumen kedua, dipakai salinan
lokal (misalnya hitung-bencana/analisis/hasil/dibi_mentah_2024_2026.json) bila dasbor tidak dapat dijangkau.
"""
import json, ssl, sys, urllib.request, collections

URL = "https://dibi.bnpb.go.id/api/v1/chart/data"
KOL = ["id", "tahun", "id_kab_bps", "jenis_bencana", "is_bencana"]
NUM = ["meninggal", "hilang", "mengungsi", "menderita", "rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan"]


def ambil():
    b = {"datasource": {"id": 1, "type": "table"}, "form_data": {"slice_id": 1, "dashboardId": 1},
         "queries": [{"columns": KOL, "metrics": [{"expressionType": "SQL", "sqlExpression": f"SUM({c})", "label": c} for c in NUM],
                      "row_limit": 100000, "orderby": []}], "result_format": "json", "result_type": "full"}
    r = urllib.request.Request(URL, json.dumps(b).encode(), {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(r, timeout=600, context=ssl.create_default_context()))["result"][0]["data"]


def lokal(p):
    d = json.load(open(p, encoding="utf-8"))
    return d if isinstance(d, list) else d["data"]


rows = lokal(sys.argv[2]) if len(sys.argv) > 2 else ambil()
pend = {k: v["n"] for k, v in json.load(open(r"D:/Project/Work/BNPB/poskokarhutla/public/data/bnpb/kerentanan.json", encoding="utf-8"))["kab"].items()}
v = lambda r, c: r.get(c) or 0


def kriteria(r):
    jiwa = v(r, "meninggal") + v(r, "hilang")
    rumah = v(r, "rumah_rusak_berat") + v(r, "rumah_rusak_sedang") + v(r, "rumah_rusak_ringan")
    return jiwa >= 1 or v(r, "mengungsi") + v(r, "menderita") + v(r, "luka_sakit") >= 50 or rumah >= 5


def batas(r):
    j = (r["jenis_bencana"] or "").lower()
    a = []
    if v(r, "meninggal") + v(r, "hilang") >= 30: a.append("b1")
    if v(r, "rumah_rusak_berat") + 0.5 * v(r, "rumah_rusak_sedang") >= 600: a.append("b2")
    if "longsor" in j and v(r, "mengungsi") >= 1000: a.append("b3")
    if "kekeringan" in j:
        n = pend.get(str(r.get("id_kab_bps") or ""))
        if n and v(r, "menderita") / n >= 0.15: a.append("b4")
    return a


T = collections.Counter(); J = collections.defaultdict(collections.Counter); P = collections.Counter()
for r in rows:
    if not kriteria(r):
        continue
    j = r["jenis_bencana"] or "?"
    a = batas(r)
    gar = v(r, "meninggal") >= 30 or v(r, "rumah_rusak_berat") >= 600
    for C in (T, J[j]):
        C["baris"] += 1
        C["md"] += v(r, "meninggal"); C["jiwa"] += v(r, "meninggal") + v(r, "hilang"); C["rb"] += v(r, "rumah_rusak_berat")
        if a:
            C["intensif"] += 1; C["jiwa_int"] += v(r, "meninggal") + v(r, "hilang"); C["rb_int"] += v(r, "rumah_rusak_berat")
        if gar:
            C["gar"] += 1; C["md_gar"] += v(r, "meninggal"); C["rb_gar"] += v(r, "rumah_rusak_berat")
    for x in a: P[x] += 1
    if "b1" in a and v(r, "meninggal") < 30: P["b1_karena_hilang"] += 1
    if "b2" in a and v(r, "rumah_rusak_berat") < 600: P["b2_karena_bobot"] += 1


def pct(a, b): return round(100 * a / b, 2) if b else None


hasil = {
    "catatan": "Baris DIBI yang memenuhi kriteria a, b, atau c (d sampai f tidak terukur). Bukti internal, tidak dikutip dalam naskah.",
    "total": {"baris": T["baris"], "intensif": T["intensif"], "persen_intensif": pct(T["intensif"], T["baris"]),
              "persen_korban_jiwa_di_intensif": pct(T["jiwa_int"], T["jiwa"]), "persen_rusak_berat_di_intensif": pct(T["rb_int"], T["rb"]),
              "versi_gar_baris": T["gar"], "versi_gar_persen": pct(T["gar"], T["baris"]),
              "versi_gar_persen_meninggal": pct(T["md_gar"], T["md"]), "versi_gar_persen_rusak_berat": pct(T["rb_gar"], T["rb"])},
    "penentu": dict(P),
    "per_jenis": {j: {"baris": c["baris"], "intensif": c["intensif"], "persen": pct(c["intensif"], c["baris"]), "versi_gar": c["gar"]}
                  for j, c in sorted(J.items(), key=lambda x: -x[1]["baris"]) if c["baris"] >= 50},
}
json.dump(hasil, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(hasil["total"], ensure_ascii=False)); print(json.dumps(hasil["penentu"]))
for j, c in hasil["per_jenis"].items(): print(f"{j[:30]:30} {c}")
