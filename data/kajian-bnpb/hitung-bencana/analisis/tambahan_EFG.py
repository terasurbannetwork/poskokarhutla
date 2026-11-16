"""Angka tambahan kelompok E, F, G katalog paradoks (P-32, P-33, P-34, P-35, P-36, P-37, P-42, P-43, P-44, P-46, P-47, P-59, P-61).
Masukan (hanya dibaca):
  hasil/dibi_mentah_2024_2026.json          tarikan DIBI 12 Nov 2026 (tarik_dibi.py)
  hasil/logbook_baris_harian.json           logbook DOCX harian 1 Jan-29 Okt 2026 (urai_logbook_mentah.py)
  data/pusdalops/logbook_kejadian.csv       logbook CSV 2011-2026
  public/data/dibi_kejadian.json            snapshot DIBI 28 Okt 2026 (28 Okt 2025-28 Okt 2026)
  data/laporan-bnpb/bulanan/2026-10/masukan/dibi_kejadian.json   snapshot DIBI 11 Nov 2026
  data/laporan-bnpb/generator/cache/raw/*.csv   FIRMS NRT 24 Okt-12 Nov 2026
  public/data/kluster_hari/*.json           kluster karhutla harian 18-24 Okt 2026
Keluaran: hasil/tambahan_EFG.json. Jalankan: python tambahan_EFG.py
Semua angka di naskah lampiran-a-E/F/G yang bertanda "skrip tambahan_EFG.py" berasal dari berkas keluaran ini."""
import csv, collections, datetime as dt, glob, io, json, math, os, statistics, sys

AK = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AK, "../../../.."))
sys.path.insert(0, AK)
import uji_kriteria as UK   # muat() baris DIBI; pakai definisi K1-K3 yang sama

WIB = dt.timezone(dt.timedelta(hours=7))
H = {}


def P(*a):
    return os.path.join(AKAR, *a)


def pct(a, b):
    return round(100 * a / b, 1) if b else None


R = UK.muat()
for o in R:
    o["lolos"] = any(UK.kr(o).values())
    o["rumah_rusak_semua"] = o["rr"]
d_all = json.load(open(P("data/kajian-bnpb/hitung-bencana/analisis/hasil/dibi_mentah_2024_2026.json"), encoding="utf8"))["data"]
for o, r in zip(R, d_all):
    o["rb"] = int(round(r.get("rumah_rusak_berat") or 0))
    o["kab_id"] = r["id_kab_bps"]
    o["kat"] = r["kategori_bencana"]

P12 = [o for o in R if dt.date(2025, 11, 13) <= o["tgl"] <= dt.date(2026, 11, 12)]
Y25 = [o for o in R if o["th"] == 2025]

# ------------------------------------------------------------------ P-32 ekstensif lawan intensif (GAR 2015)
def gar(rows, kunci, label):
    """Unit = kunci(o). Ekstensif bila meninggal < 30 DAN rumah rusak berat < 600 (proksi 'rumah hancur'); intensif selainnya."""
    g = collections.defaultdict(lambda: dict(md=0, rb=0, rr=0, k2=0, ungsi=0, n=0))
    for o in rows:
        a = g[kunci(o)]
        a["md"] += o["meninggal"]; a["rb"] += o["rb"]; a["rr"] += o["rr"]; a["k2"] += o["k2n"]; a["ungsi"] += o["mengungsi"]; a["n"] += 1
    tot = {k: sum(v[k] for v in g.values()) for k in ("md", "rb", "rr", "k2", "ungsi")}
    ex = [v for v in g.values() if v["md"] < 30 and v["rb"] < 600]
    it = [v for v in g.values() if not (v["md"] < 30 and v["rb"] < 600)]
    def porsi(k):
        return pct(sum(v[k] for v in ex), tot[k])
    return {"unit": label, "n_unit": len(g), "n_ekstensif": len(ex), "n_intensif": len(it), "pct_unit_ekstensif": pct(len(ex), len(g)),
            "total_meninggal": tot["md"], "total_rumah_rusak_berat": tot["rb"], "total_rumah_rusak_RB_RS_RR": tot["rr"], "total_terdampak_luka_ungsi": tot["k2"],
            "pct_meninggal_di_ekstensif": porsi("md"), "pct_rumah_rusak_berat_di_ekstensif": porsi("rb"),
            "pct_rumah_rusak_RBRSRR_di_ekstensif": porsi("rr"), "pct_terdampak_di_ekstensif": porsi("k2"), "pct_mengungsi_di_ekstensif": porsi("ungsi"),
            "meninggal_ekstensif": sum(v["md"] for v in ex), "meninggal_intensif": sum(v["md"] for v in it)}

H["P32"] = {}
for nama, rows in (("2025", Y25), ("12 bulan 13 Nov 2025-12 Nov 2026", P12)):
    H["P32"][nama] = {
        "baris_dibi (hari x kab x jenis)": gar(rows, lambda o: (o["tgl"], o["kab_id"], o["kat"]), "baris"),
        "proksi_kejadian provinsi x hari x kategori": gar(rows, lambda o: (o["tgl"], o["prov"], o["kat"]), "provinsi-hari-kategori"),
        "proksi_kejadian nasional x hari x kategori": gar(rows, lambda o: (o["tgl"], o["kat"]), "nasional-hari-kategori"),
    }
# contoh: pecahan antarkabupaten dalam satu gempa
gempa_ntt = [o for o in R if o["tgl"] == dt.date(2026, 8, 15) and o["kat"] == "Gempabumi"]
H["P32"]["contoh_gempa_NTT_15_Agu_2026_baris"] = [{"prov": o["prov"], "kab": o["kab"], "meninggal": o["meninggal"], "rb": o["rb"], "rr_semua": o["rr"]} for o in sorted(gempa_ntt, key=lambda o: -o["meninggal"])[:8]]
H["P32"]["contoh_gempa_NTT_total_hari_itu"] = {"meninggal": sum(o["meninggal"] for o in gempa_ntt), "rb": sum(o["rb"] for o in gempa_ntt), "baris": len(gempa_ntt)}

# ------------------------------------------------------------------ P-34 gempa: dampak tidak berurut magnitudo (DIBI tak punya magnitudo)
gp = [o for o in P12 if o["grup"] == "gempa"]
H["P34"] = {"gempa_baris_12bln": len(gp), "dengan_meninggal_0": sum(1 for o in gp if o["meninggal"] == 0), "dengan_meninggal_ge1": sum(1 for o in gp if o["meninggal"] >= 1),
            "lolos_K1K3": sum(1 for o in gp if o["lolos"]), "tanpa_dampak_sama_sekali": sum(1 for o in gp if o["meninggal"] == 0 and o["k2n"] == 0 and o["k3n"] == 0 and o["terendam"] == 0),
            "kolom_magnitudo_di_DIBI": False,
            "meninggal_gempa_12bln": sum(o["meninggal"] for o in gp), "rb_gempa_12bln": sum(o["rb"] for o in gp),
            "gempa_baris_terbesar_meninggal": sorted([(o["meninggal"], str(o["tgl"]), o["kab"]) for o in gp], reverse=True)[:5]}

# ------------------------------------------------------------------ P-35 tren semu
bln24 = collections.Counter(o["tgl"].strftime("%Y-%m") for o in R if o["th"] == 2024)
H["P35"] = {"baris_dibi_per_bulan_2024": dict(sorted(bln24.items())),
            "baris_dibi_per_tahun": {str(y): sum(1 for o in R if o["th"] == y) for y in (2024, 2025, 2026)},
            "is_bencana_true_per_tahun": {str(y): sum(1 for o in R if o["th"] == y and o["is_b"]) for y in (2024, 2025, 2026)},
            "is_bencana_false_per_tahun": {str(y): sum(1 for o in R if o["th"] == y and not o["is_b"]) for y in (2024, 2025, 2026)},
            "lolos_K1K3_per_tahun": {str(y): sum(1 for o in R if o["th"] == y and o["lolos"]) for y in (2024, 2025, 2026)}}
# bulan 2024 awal vs akhir tahun (kelengkapan)
H["P35"]["baris_2024_semester1_lawan_semester2"] = [sum(v for k, v in bln24.items() if k <= "2024-06"), sum(v for k, v in bln24.items() if k > "2024-06")]
# logbook CSV: kejadian per hari pencatatan
rows_csv = list(csv.DictReader(open(P("data/pusdalops/logbook_kejadian.csv"), encoding="utf8")))
def tg(s):
    try:
        return dt.date.fromisoformat(s)
    except Exception:
        return None
per_tahun_kej = collections.Counter(); hari_cat = collections.defaultdict(set); lap_tahun = collections.Counter()
for r in rows_csv:
    t = tg(r["tgl_kejadian"])
    if t and 2011 <= t.year <= 2026:
        per_tahun_kej[t.year] += 1
    p = tg(r["pertama_dicatat"])
    if p and 2011 <= p.year <= 2026:
        hari_cat[p.year].add(p); lap_tahun[p.year] += 1
H["P35"]["csv_kejadian_per_tahun"] = dict(sorted(per_tahun_kej.items()))
H["P35"]["csv_hari_pencatatan_per_tahun"] = {y: len(s) for y, s in sorted(hari_cat.items())}
H["P35"]["csv_kejadian_per_hari_pencatatan"] = {y: round(per_tahun_kej[y] / len(hari_cat[y]), 1) for y in sorted(hari_cat) if y >= 2013 and y <= 2025}
# bila aturan seragam: hanya kejadian yang memenuhi ambang tidak bisa diuji di CSV (tak ada kolom dampak)
# EM-DAT: tidak dihitung dari data; lihat PUSTAKA.md

# ------------------------------------------------------------------ P-36 Simpson: cari pembalikan arah
def periode(th, m1d1=(1, 1), m2d2=(10, 31)):
    a = dt.date(th, *m1d1); b = dt.date(th, *m2d2)
    return [o for o in R if a <= o["tgl"] <= b]

JO25, JO26 = periode(2025), periode(2026)
def metrik(rows):
    return {"baris": len(rows), "lolos": sum(1 for o in rows if o["lolos"]), "meninggal": sum(o["meninggal"] for o in rows),
            "terdampak": sum(o["k2n"] for o in rows)}
H["P36"] = {"periode": "1 Jan sampai 31 Okt, 2025 lawan 2026", "nasional": {"2025": metrik(JO25), "2026": metrik(JO26)}}
hasil_sim = {}
for namametrik in ("baris", "lolos", "meninggal", "terdampak"):
    # per provinsi
    pv = collections.defaultdict(lambda: [0, 0])
    for th, rows in ((0, JO25), (1, JO26)):
        for o in rows:
            v = {"baris": 1, "lolos": 1 if o["lolos"] else 0, "meninggal": o["meninggal"], "terdampak": o["k2n"]}[namametrik]
            pv[o["prov"]][th] += v
    arah_nas = (sum(v[1] for v in pv.values()) > sum(v[0] for v in pv.values()))
    naik = sum(1 for v in pv.values() if v[1] > v[0]); turun = sum(1 for v in pv.values() if v[1] < v[0]); sama = len(pv) - naik - turun
    # per jenis
    jv = collections.defaultdict(lambda: [0, 0])
    for th, rows in ((0, JO25), (1, JO26)):
        for o in rows:
            v = {"baris": 1, "lolos": 1 if o["lolos"] else 0, "meninggal": o["meninggal"], "terdampak": o["k2n"]}[namametrik]
            jv[o["grup"]][th] += v
    jn = sum(1 for v in jv.values() if v[1] > v[0]); jt = sum(1 for v in jv.values() if v[1] < v[0])
    hasil_sim[namametrik] = {"nasional": [sum(v[0] for v in pv.values()), sum(v[1] for v in pv.values())], "nasional_naik": arah_nas,
                             "provinsi_naik": naik, "provinsi_turun": turun, "provinsi_sama": sama, "jenis_naik": jn, "jenis_turun": jt, "jenis": {k: v for k, v in jv.items()}}
H["P36"]["arah"] = hasil_sim
# Simpson sungguhan pada PERSEN (rasio): persen baris lolos K1-K3, nasional lawan per jenis dan per provinsi (efek komposisi)
def persen_lolos(rows, kunci):
    g = collections.defaultdict(lambda: [0, 0])
    for o in rows:
        g[kunci(o)][0] += 1; g[kunci(o)][1] += 1 if o["lolos"] else 0
    return g
for nama, kk in (("jenis", lambda o: o["grup"]), ("provinsi", lambda o: o["prov"])):
    a = persen_lolos(JO25, kk); b = persen_lolos(JO26, kk)
    tot25 = pct(sum(v[1] for v in a.values()), sum(v[0] for v in a.values())); tot26 = pct(sum(v[1] for v in b.values()), sum(v[0] for v in b.values()))
    kel = [k for k in a if k in b and a[k][0] >= 20 and b[k][0] >= 20]
    nai = [k for k in kel if b[k][1] / b[k][0] > a[k][1] / a[k][0]]
    tur = [k for k in kel if b[k][1] / b[k][0] < a[k][1] / a[k][0]]
    H["P36"]["persen_lolos_" + nama] = {"nasional_2025": tot25, "nasional_2026": tot26, "kelompok_diuji (>=20 baris tiap tahun)": len(kel), "kelompok_persen_naik": len(nai), "kelompok_persen_turun": len(tur),
                                       "pembalikan_Simpson": ((tot26 > tot25) and len(tur) == len(kel)) or ((tot26 < tot25) and len(nai) == len(kel)),
                                       "rinci_jenis": {k: [a[k][0], pct(a[k][1], a[k][0]), b[k][0], pct(b[k][1], b[k][0])] for k in kel} if nama == "jenis" else None}
# pembalikan pada persen karhutla (komposisi): bagian baris karhutla di tiap tahun
H["P36"]["bagian_karhutla_dalam_baris"] = {"2025": pct(sum(1 for o in JO25 if o["grup"] == "karhutla"), len(JO25)), "2026": pct(sum(1 for o in JO26 if o["grup"] == "karhutla"), len(JO26))}
# Cari kasus: provinsi yang naik di jumlah baris sedangkan jenis-jenisnya sebagian besar turun
H["P36"]["provinsi_pembalikan_baris_vs_jenis"] = []
for pv_ in sorted({o["prov"] for o in R}):
    a = collections.Counter(o["grup"] for o in JO25 if o["prov"] == pv_); b = collections.Counter(o["grup"] for o in JO26 if o["prov"] == pv_)
    ks = set(a) | set(b)
    n_turun = sum(1 for k in ks if b[k] < a[k]); n_naik = sum(1 for k in ks if b[k] > a[k])
    tot_a, tot_b = sum(a.values()), sum(b.values())
    if (tot_b > tot_a and n_turun > n_naik and n_naik >= 1) or (tot_b < tot_a and n_naik > n_turun and n_turun >= 1):
        H["P36"]["provinsi_pembalikan_baris_vs_jenis"].append([pv_, tot_a, tot_b, n_naik, n_turun])

# Simpson pada baris is_bencana = benar saja (angka yang diumumkan DIBI)
JB25 = [o for o in JO25 if o["is_b"]]; JB26 = [o for o in JO26 if o["is_b"]]
pvb = collections.defaultdict(lambda: [0, 0])
for th, rows in ((0, JB25), (1, JB26)):
    for o in rows:
        pvb[o["prov"]][th] += 1
H["P36"]["is_bencana_true"] = {"nasional": [len(JB25), len(JB26)], "provinsi_naik": sum(1 for v in pvb.values() if v[1] > v[0]), "provinsi_turun": sum(1 for v in pvb.values() if v[1] < v[0]), "provinsi_sama": sum(1 for v in pvb.values() if v[1] == v[0])}
# ------------------------------------------------------------------ P-37 ekor panjang (12 bulan)
def konsentrasi(rows, f):
    v = sorted((f(o) for o in rows), reverse=True); n = len(v); tot = sum(v)
    if not tot:
        return None
    def top(k):
        return pct(sum(v[:max(1, k)]), tot)
    kum = 0; n50 = None
    for i, x in enumerate(v, 1):
        kum += x
        if kum >= tot / 2:
            n50 = i; break
    return {"total": tot, "n_baris": n, "baris_bernilai_nol": sum(1 for x in v if x == 0), "top1_baris_pct": top(1), "top5_baris_pct": top(5), "top10_baris_pct": top(10),
            "top1persen_pct": top(math.ceil(n * 0.01)), "top10persen_pct": top(math.ceil(n * 0.10)), "baris_untuk_50persen": n50,
            "median": statistics.median(v), "rata_rata": round(tot / n, 1), "maks": v[0]}
H["P37"] = {"periode": "12 bulan 13 Nov 2025-12 Nov 2026, 4.185 baris DIBI",
            "meninggal": konsentrasi(P12, lambda o: o["meninggal"]), "terdampak_luka_ungsi": konsentrasi(P12, lambda o: o["k2n"]),
            "rumah_rusak_RB_RS_RR": konsentrasi(P12, lambda o: o["rr"]), "mengungsi": konsentrasi(P12, lambda o: o["mengungsi"])}
top = sorted(P12, key=lambda o: -o["k2n"])[0]
H["P37"]["baris_terbesar"] = {"tgl": str(top["tgl"]), "kab": top["kab"], "jenis": top["jenis"], "meninggal": top["meninggal"], "terdampak_luka_ungsi": top["k2n"], "rumah_rusak": top["rr"]}
H["P37"]["tanpa_baris_terbesar_terdampak"] = {"terdampak_luka_ungsi": sum(o["k2n"] for o in P12) - top["k2n"], "meninggal": sum(o["meninggal"] for o in P12) - top["meninggal"]}
# jumlah kejadian lawan dampak: baris dengan 0 meninggal dan terdampak < 50 (separuh+ dari 'kejadian')
H["P37"]["baris_lolos_tapi_dampak_kecil"] = {"lolos": sum(1 for o in P12 if o["lolos"]), "lolos_dengan_terdampak_lt_1000_dan_meninggal_lt_5_dan_rumah_lt_50": sum(1 for o in P12 if o["lolos"] and o["k2n"] < 1000 and o["meninggal"] < 5 and o["k3n"] < 50)}


# ------------------------------------------------------------------ P-33 besar menurut siapa: terdampak absolut lawan relatif terhadap penduduk kabupaten
PEND = json.load(open(P("public/data/penduduk.json"), encoding="utf8"))
import re
def _norm(sx):
    return re.sub(r"^kab\.?\s+|^kabupaten\s+", "", sx.strip().lower())
popk = collections.Counter()
for kk_, v in PEND["kec"].items():
    pp, kb, _ = kk_.split("|"); popk[(pp, _norm(kb))] += v
def pop_of(r):
    return popk.get((str(r["id_kab_bps"])[:2], _norm(r["kabupaten"])))
rr_ = []
for o, r in zip(R, d_all):
    if o in P12:
        pass
P12ids = {id(o) for o in P12}
for o, r in zip(R, d_all):
    if id(o) in P12ids:
        pv_ = pop_of(r)
        if pv_:
            rr_.append((o, pv_))
kuat = [(o, pv_) for o, pv_ in rr_ if o["k2n"] >= 50]
rel = sorted([o["k2n"] / pv_ * 100 for o, pv_ in kuat])
def q(v, p):
    return round(v[min(len(v) - 1, int(round(p / 100 * (len(v) - 1))))], 3) if v else None
top_abs = sorted(rr_, key=lambda x: -x[0]["k2n"])[:20]
top_rel = sorted(rr_, key=lambda x: -(x[0]["k2n"] / x[1]))[:20]
ida = {(str(o["tgl"]), o["kab"], o["kat"]) for o, _ in top_abs}; idr = {(str(o["tgl"]), o["kab"], o["kat"]) for o, _ in top_rel}
H["P33"] = {"catatan": "Penduduk kabupaten/kota = jumlah penduduk kecamatan WorldPop Global2 R2025A tahun 2026 (public/data/penduduk.json), dicocokkan lewat nama; kabupaten tanpa kecocokan nama dibuang.",
            "baris_12bln_dicocokkan": len(rr_), "dari": len(P12), "baris_lolos_K2_dicocokkan": len(kuat),
            "terdampak_pct_penduduk_pada_baris_lolos_K2": {"p10": q(rel, 10), "median": q(rel, 50), "p90": q(rel, 90), "maks": q(rel, 100)},
            "baris_K2_dengan_terdampak_lt_0.1pct_penduduk": sum(1 for x in rel if x < 0.1), "baris_K2_dengan_terdampak_ge_5pct_penduduk": sum(1 for x in rel if x >= 5),
            "irisan_20_teratas_absolut_dan_relatif": len(ida & idr),
            "20_teratas_relatif": [[str(o["tgl"]), o["kab"], o["jenis"], o["k2n"], pv_, round(o["k2n"] / pv_ * 100, 1)] for o, pv_ in top_rel[:8]],
            "20_teratas_absolut": [[str(o["tgl"]), o["kab"], o["jenis"], o["k2n"], pv_, round(o["k2n"] / pv_ * 100, 1)] for o, pv_ in top_abs[:8]],
            "ambang_50_orang_sebagai_pct_penduduk": {"kabupaten_terkecil_penduduk": round(50 / min(popk.values()) * 100, 4), "median_kabupaten": round(50 / statistics.median(popk.values()) * 100, 4), "kabupaten_terbesar_penduduk": round(50 / max(popk.values()) * 100, 5)},
            "kabupaten_dalam_data_penduduk": len(popk), "penduduk_kab_min_median_maks": [min(popk.values()), statistics.median(popk.values()), max(popk.values())]}

# ------------------------------------------------------------------ P-47 nonalam dan sosial di DIBI
NONALAM = {"Epidemi - Wabah penyakit": "epidemi", "Gagal teknologi": "gagal teknologi", "Konflik sosial": "konflik sosial"}
H["P47"] = {}
for kat, nm in NONALAM.items():
    rows = [o for o in R if o["kat"] == kat]
    H["P47"][nm] = {"baris": len(rows), "is_bencana_true": sum(1 for o in rows if o["is_b"]), "lolos_K1K3": sum(1 for o in rows if o["lolos"]), "meninggal": sum(o["meninggal"] for o in rows),
                    "terdampak_luka_ungsi": sum(o["k2n"] for o in rows), "rumah_rusak": sum(o["rr"] for o in rows),
                    "per_tahun": dict(sorted(collections.Counter(o["th"] for o in rows).items())),
                    "jenis_asli": dict(collections.Counter(o["jenis"] for o in rows)), "maks_terdampak": max((o["k2n"] for o in rows), default=0), "maks_meninggal": max((o["meninggal"] for o in rows), default=0)}
H["P47"]["total_baris_DIBI"] = len(R)
H["P47"]["baris_alam_tersisa_pct"] = pct(len(R) - sum(H["P47"][n]["baris"] for n in H["P47"] if isinstance(H["P47"][n], dict)), len(R))
# kebakaran permukiman (nonalam kode 202) sebagai pembanding
kp = [o for o in R if o["kat"] == "Kebakaran permukiman"]
H["P47"]["kebakaran_permukiman_pembanding"] = {"baris": len(kp), "lolos_K1K3": sum(1 for o in kp if o["lolos"]), "is_bencana_true": sum(1 for o in kp if o["is_b"])}
# logbook CSV: jenis non alam
cj = collections.Counter(r["jenis"] for r in rows_csv if (tg(r["tgl_kejadian"]) and tg(r["tgl_kejadian"]).year == 2026))
H["P47"]["logbook_csv_2026_jenis"] = {k: v for k, v in cj.items() if k in ("wabah", "konflik_sosial", "kegagalan_teknologi", "kecelakaan", "kebakaran_permukiman")}
H["P47"]["logbook_csv_semua_tahun_jenis"] = {k: v for k, v in collections.Counter(r["jenis"] for r in rows_csv).items() if k in ("wabah", "konflik_sosial", "kegagalan_teknologi", "kecelakaan", "epidemi")}

# ------------------------------------------------------------------ P-59 sistem identitas: kapasitas indeks KIB, kode kluster
kib = collections.Counter((o["tgl"], o["kab_id"], o["kat"]) for o in R)
H["P59"] = {"DIBI_baris_dengan_n_baris_gt1": sum(1 for r in d_all if r["n_baris"] > 1), "DIBI_n_baris_maks": max(r["n_baris"] for r in d_all)}
# logbook DOCX: banyak baris harian jenis+kab sama pada hari sama (kemungkinan lebih dari satu kejadian satu hari)
LB = json.load(open(P("data/kajian-bnpb/hitung-bencana/analisis/hasil/logbook_baris_harian.json"), encoding="utf8"))
c = collections.Counter((r["hari"], r["jenis"], r["prov"], ";".join(r["kab"])) for r in LB["baris"])
H["P59"]["logbook_docx_kombinasi_hari_jenis_prov_kab_dengan_gt1_baris"] = sum(1 for v in c.values() if v > 1)
H["P59"]["logbook_docx_maks_baris_per_kombinasi"] = max(c.values())
kk = collections.Counter(len(r["kab"]) for r in LB["baris"])
H["P59"]["logbook_docx_baris_multi_kab"] = sum(v for k, v in kk.items() if k > 1)
H["P59"]["logbook_docx_baris_tanpa_kab"] = kk.get(0, 0)
H["P59"]["logbook_docx_maks_kab_per_baris"] = max(kk)
# kluster karhutla harian: kode K#### dipakai ulang?
KL = {}
for f in sorted(glob.glob(P("public/data/kluster_hari/*.json"))):
    try:
        KL[os.path.basename(f)[:-5]] = json.load(open(f, encoding="utf8"))
    except Exception as e:
        KL[os.path.basename(f)[:-5]] = None
import numpy as np
from scipy.spatial import cKDTree
def xy(k):
    return np.array([[x[2] * 111.0, x[1] * 111.0 * math.cos(math.radians(x[2]))] for x in k])
hari_k = sorted(KL)
pas = []
for h1, h2 in zip(hari_k, hari_k[1:]):
    A = KL[h1]["k"]; B = KL[h2]["k"]
    ada_a = {k[0] for k in A}; ada_b = {k[0] for k in B}
    tr = cKDTree(xy(B)); dist, idx = tr.query(xy(A))
    dekat = int((dist <= 2.0).sum())
    sama = sum(1 for i, (d_, j) in enumerate(zip(dist, idx)) if d_ <= 2.0 and B[j][0] == A[i][0])
    ib = {k[0]: k for k in B}
    jar = []
    for a in A:
        b = ib.get(a[0])
        if b:
            jar.append(math.hypot((a[2] - b[2]) * 111.0, (a[1] - b[1]) * 111.0 * math.cos(math.radians(a[2]))))
    pas.append({"dari": h1, "ke": h2, "kluster_hari1": len(A), "kluster_hari2": len(B), "id_yang_sama_ada_di_dua_hari": len(ada_a & ada_b),
                "kluster_hari1_punya_tetangga_hari2_dalam_2km": dekat, "tetangga_id_sama": sama, "tetangga_id_beda": dekat - sama,
                "median_jarak_km_untuk_id_sama": round(statistics.median(jar), 1) if jar else None,
                "pct_id_sama_yang_berjarak_gt_20km": pct(sum(1 for x in jar if x > 20), len(jar))})
H["P59"]["kluster_hari_pasangan"] = pas
tot_dekat = sum(p["kluster_hari1_punya_tetangga_hari2_dalam_2km"] for p in pas); tot_sama = sum(p["tetangga_id_sama"] for p in pas)
H["P59"]["kluster_hari_ringkas"] = {"pasangan_hari": len(pas), "kluster_dengan_tetangga_2km": tot_dekat, "yang_ber_id_sama": tot_sama, "pct_ber_id_sama": pct(tot_sama, tot_dekat)}

# ------------------------------------------------------------------ P-42 naik kelas di tengah jalan (logbook DOCX, kunci V1)
import uji_kunci_logbook as UKL   # memuat ROWS dan grup_v1
ev = UKL.grup_v1(UKL.ROWS, lambda r: (r["jenis"], r["prov"], r["kabk"], r["tgl"]))
ev = [g for g in ev if "2026-01-01" <= min(r["tgl"] for r in g) <= "2026-10-31"]
def kelas_k2(v):
    return 0 if v < 50 else (1 if v < 1000 else 2)
def kelas_md(v):
    return 0 if v == 0 else (1 if v < 10 else 2)
def uji_kelas(fkelas, fnilai):
    awal = collections.Counter(); puncak = collections.Counter(); akhir = collections.Counter()
    naik_dari_awal = 0; turun_dari_puncak = 0; multi = 0
    for g in ev:
        g = sorted(g, key=lambda r: (r["hari"], r["i"]))
        k = [fkelas(fnilai(r["m"])) for r in g]
        awal[k[0]] += 1; puncak[max(k)] += 1; akhir[k[-1]] += 1
        if len(g) > 1:
            multi += 1
            if max(k) > k[0]:
                naik_dari_awal += 1
            if k[-1] < max(k):
                turun_dari_puncak += 1
    n = len(ev)
    return {"kejadian": n, "multi_hari": multi, "kelas_awal": dict(sorted(awal.items())), "kelas_puncak": dict(sorted(puncak.items())), "kelas_akhir": dict(sorted(akhir.items())),
            "naik_kelas_setelah_laporan_pertama": naik_dari_awal, "pct_naik_dari_multihari": pct(naik_dari_awal, multi), "turun_dari_puncak": turun_dari_puncak, "pct_turun_dari_multihari": pct(turun_dari_puncak, multi)}
H["P42"] = {"catatan": "Kejadian logbook DOCX kunci V1 (jenis, provinsi, kabupaten, tanggal kejadian), tanggal kejadian 1 Jan-31 Okt 2026; angka dampak dari regex teks bebas. Kelas contoh hanya untuk menguji peka-tidaknya hasil pada saat penetapan kelas, bukan usulan kelas. "
                    "Kelas terdampak+luka+mengungsi: 0 = di bawah 50, 1 = 50-999, 2 = 1.000 atau lebih. Kelas meninggal: 0 = nol, 1 = 1-9, 2 = 10 atau lebih.",
            "kelas_k2": uji_kelas(kelas_k2, lambda m: m["k2"]), "kelas_meninggal": uji_kelas(kelas_md, lambda m: m["md"])}
sel = []
for g in ev:
    g = sorted(g, key=lambda r: (r["hari"], r["i"]))
    if len(g) < 2:
        continue
    k = [kelas_k2(r["m"]["k2"]) for r in g]
    if max(k) > k[0]:
        t0 = dt.date.fromisoformat(g[0]["hari"]); t1 = dt.date.fromisoformat(g[k.index(max(k))]["hari"])
        sel.append((t1 - t0).days)
H["P42"]["hari_dari_laporan_pertama_ke_kelas_puncak_k2"] = {"n": len(sel), "median": statistics.median(sel) if sel else None, "maks": max(sel) if sel else None, "p90": sorted(sel)[int(0.9 * (len(sel) - 1))] if sel else None}

# ------------------------------------------------------------------ P-61 hari tanpa laporan
hari_arsip = LB["hari"]
awal, akhir = dt.date(2026, 1, 1), dt.date(2026, 10, 29)
kal = [awal + dt.timedelta(days=i) for i in range((akhir - awal).days + 1)]
ada = {dt.date.fromisoformat(h) for h in hari_arsip}
per_hari = collections.Counter(r["hari"] for r in LB["baris"])
lewat = sorted(h for h in kal if h not in ada)
med = statistics.median(per_hari.values())
H["P61"] = {"logbook_docx": {"hari_kalender_1Jan_29Okt": len(kal), "hari_arsip": len(hari_arsip), "hari_arsip_unik": len(ada), "hari_tanpa_berkas": [str(x) for x in lewat],
                             "gagal_urai": LB["gagal"], "baris_per_hari_median": med, "baris_per_hari_min": min(per_hari.values()), "baris_per_hari_maks": max(per_hari.values()),
                             "hari_arsip_tanpa_baris": [h for h in hari_arsip if per_hari.get(h, 0) == 0],
                             "delapan_hari_baris_paling_sedikit": sorted([(v, h) for h, v in per_hari.items()])[:8],
                             "hari_dengan_baris_kurang_dari_separuh_median": sorted(h for h, v in per_hari.items() if v < med / 2)}}
def cal_year(y):
    return 366 if (y % 4 == 0) else 365
H["P61"]["csv_hari_pencatatan"] = {}
for y, s in sorted(hari_cat.items()):
    if y < 2013:
        continue
    total = (dt.date(2026, 11, 1) - dt.date(2026, 1, 1)).days if y == 2026 else cal_year(y)
    H["P61"]["csv_hari_pencatatan"][y] = {"hari_ada_pencatatan_pertama": len(s), "hari_dalam_rentang": total, "hari_tanpa": total - len(s), "kejadian_per_tahun_tgl_kejadian": per_tahun_kej[y],
                                          "kejadian_per_hari_ada_catat": round(per_tahun_kej[y] / len(s), 1)}
for y in (2021, 2022, 2023):
    tanpa = [dt.date(y, 1, 1) + dt.timedelta(days=i) for i in range(365) if (dt.date(y, 1, 1) + dt.timedelta(days=i)) not in hari_cat[y]]
    H["P61"]["csv_%d_hari_tanpa_per_bulan" % y] = dict(collections.Counter(x.strftime("%Y-%m") for x in tanpa))
    rentang = []; cur = []
    for x in tanpa:
        if cur and (x - cur[-1]).days == 1:
            cur.append(x)
        else:
            if cur:
                rentang.append((len(cur), str(cur[0]), str(cur[-1])))
            cur = [x]
    if cur:
        rentang.append((len(cur), str(cur[0]), str(cur[-1])))
    H["P61"]["csv_%d_rentang_tanpa_terpanjang" % y] = sorted(rentang, reverse=True)[:4]
dibi_hari = collections.defaultdict(set)
for o in R:
    dibi_hari[o["th"]].add(o["tgl"])
H["P61"]["dibi_hari_dengan_baris"] = {}
for y in (2024, 2025, 2026):
    total = (dt.date(2026, 11, 12) - dt.date(2026, 1, 1)).days + 1 if y == 2026 else cal_year(y)
    H["P61"]["dibi_hari_dengan_baris"][y] = {"hari_dengan_baris": len(dibi_hari[y]), "hari_dalam_rentang": total, "hari_tanpa": total - len(dibi_hari[y])}
H["P61"]["csv_2021_ke_2022"] = {"kejadian_2021": per_tahun_kej[2021], "kejadian_2022": per_tahun_kej[2022], "turun_pct": round(100 * (per_tahun_kej[2022] / per_tahun_kej[2021] - 1), 1),
                                 "per_hari_ada_catat_2021": round(per_tahun_kej[2021] / len(hari_cat[2021]), 1), "per_hari_ada_catat_2022": round(per_tahun_kej[2022] / len(hari_cat[2022]), 1),
                                 "per_hari_kalender_2021": round(per_tahun_kej[2021] / 365, 1), "per_hari_kalender_2022": round(per_tahun_kej[2022] / 365, 1)}

# ------------------------------------------------------------------ P-46 koreksi setelah terbit: bandingkan snapshot DIBI
def kunci_snap(r):
    return (r["tanggal"], r["kab_kode"].replace(".", ""), r["jenis"].strip())
def baca_snap(p):
    d = json.load(open(p, encoding="utf8"))
    out = {}
    for r in d["kejadian"]:
        k = kunci_snap(r)
        v = {c: r.get(c, 0) for c in d["kolom"]}; v["kejadian"] = r.get("kejadian", 0)
        out[k] = v
    return d, out
S1d, S1 = baca_snap(P("public/data/dibi_kejadian.json"))
S2d, S2 = baca_snap(P("data/laporan-bnpb/bulanan/2026-10/masukan/dibi_kejadian.json"))
S3 = {}
for r in d_all:
    t = dt.datetime.fromtimestamp(r["dt"] / 1000, WIB).date()
    k = (str(t), str(r["id_kab_bps"]), r["jenis_bencana"].strip())
    a = S3.setdefault(k, dict(kejadian=0, meninggal=0, hilang=0, luka=0, terdampak=0, mengungsi=0, rr_berat=0, rr_sedang=0, rr_ringan=0, terendam=0))
    a["kejadian"] += r["jumlah_kejadian"] or 0; a["meninggal"] += r["meninggal"] or 0; a["hilang"] += r["hilang"] or 0; a["luka"] += r["luka_sakit"] or 0
    a["terdampak"] += r["menderita"] or 0; a["mengungsi"] += r["mengungsi"] or 0; a["rr_berat"] += r["rumah_rusak_berat"] or 0; a["rr_sedang"] += r["rumah_rusak_sedang"] or 0
    a["rr_ringan"] += r["rumah_rusak_ringan"] or 0; a["terendam"] += r["rumah_terendam"] or 0
def banding(A, B, a, b, nama):
    ka = {k for k in A if a <= k[0] <= b}; kb = {k for k in B if a <= k[0] <= b}
    kom = ka & kb
    metrik_ = ("meninggal", "terdampak", "mengungsi", "rr_berat")
    beda_nilai = 0; beda_ket = collections.Counter()
    for k in kom:
        ada_beda = False
        for m in ("meninggal", "terdampak", "mengungsi", "rr_berat", "rr_sedang", "rr_ringan", "luka", "terendam"):
            if round(A[k].get(m, 0)) != round(B[k].get(m, 0)):
                ada_beda = True; beda_ket[m] += 1
        beda_nilai += 1 if ada_beda else 0
    def tot(S, ks, m):
        return sum(S[k].get(m, 0) for k in ks)
    return {"pasangan": nama, "rentang": [a, b], "kunci_di_A": len(ka), "kunci_di_B": len(kb), "kunci_hanya_A": len(ka - kb), "kunci_hanya_B": len(kb - ka), "kunci_di_keduanya": len(kom),
            "kunci_di_keduanya_dengan_angka_dampak_berubah": beda_nilai, "pct_berubah": pct(beda_nilai, len(kom)), "kolom_berubah": dict(beda_ket),
            "total_A": {m: round(tot(A, ka, m)) for m in metrik_ + ("kejadian",)}, "total_B": {m: round(tot(B, kb, m)) for m in metrik_ + ("kejadian",)}}
H["P46"] = {"snapshot": {"S1": "public/data/dibi_kejadian.json, dibuat " + S1d["dibuat"] + ", " + S1d["dari"] + " s.d. " + S1d["sampai"],
                         "S2": "masukan/dibi_kejadian.json, dibuat " + S2d["dibuat"] + ", " + S2d["dari"] + " s.d. " + S2d["sampai"],
                         "S3": "hasil/dibi_mentah_2024_2026.json, ditarik 2026-11-12T15:04"}}
# Catatan: S3 (tarikan mentah) dijumlahkan per kunci, sedangkan S1 dan S2 digabung oleh pembangun snapshot dengan cara lain (selisih tampak
# seperti penggandaan pada baris kembar); jadi S3 tidak dibandingkan dengan S1 atau S2. Hanya S1 lawan S2 (pembangun sama).
H["P46"]["S1_vs_S2_28Okt_vs_11Nov"] = banding(S1, S2, "2025-11-13", "2026-10-20", "S1 (28 Okt) lawan S2 (11 Nov), tanggal kejadian 13 Nov 2025-20 Okt 2026")
H["P46"]["S1_vs_S2_tepi_21_28Okt"] = banding(S1, S2, "2026-10-21", "2026-10-28", "S1 (28 Okt) lawan S2 (11 Nov), tanggal kejadian 21-28 Okt 2026 (7 hari terakhir snapshot S1)")
KU = json.load(open(P("data/kajian-bnpb/hitung-bencana/analisis/hasil/uji_kunci_logbook.json"), encoding="utf8"))
H["P46"]["logbook_kunci_hasil_keys"] = list(KU.keys())

# ------------------------------------------------------------------ P-43 dan P-44 hotspot
sys.path.insert(0, P("scripts/data"))
import titik_unik as TU
SENS = {"VIIRS_SNPP": "N", "VIIRS_NOAA20": "N20", "VIIRS_NOAA21": "N21", "MODIS": "M"}
def hari_wib(acq_date, acq_time):
    hh = int(acq_time); t = dt.datetime.fromisoformat(acq_date).replace(tzinfo=dt.timezone.utc) + dt.timedelta(hours=hh // 100, minutes=hh % 100)
    return t.astimezone(WIB).date()
per = {}
cs = {"l": 0, "n": 1, "h": 2}
for f in sorted(glob.glob(P("data/laporan-bnpb/generator/cache/raw/*.csv"))):
    nm = os.path.basename(f); s = [v for k, v in SENS.items() if nm.startswith(k)][0]
    for r in csv.DictReader(open(f, encoding="utf-8")):
        if s == "M":
            cf = int(r["confidence"]); c = 0 if cf < 30 else (1 if cf < 80 else 2)
        else:
            c = cs.get(r["confidence"].strip().lower()[:1], 0)
        h = hari_wib(r["acq_date"], r["acq_time"]); la = float(r["latitude"]); lo = float(r["longitude"])
        e = per.setdefault(h, {}).setdefault(s, [0, set(), 0])
        e[0] += 1; e[1].add(TU.sel(la, lo))
        if c == 2:
            e[2] += 1
H["P43"] = {"catatan": "FIRMS NRT cache generator 24 Okt-12 Nov 2026, hari kalender WIB; sel 375 m seperti scripts/data/titik_unik.py; semua keyakinan; MODIS ikut; tidak disaring ke daratan Indonesia", "hari": {}}
for h in sorted(per):
    if h < dt.date(2026, 10, 25) or h > dt.date(2026, 11, 11):
        continue
    d = per[h]
    mentah_semua = sum(v[0] for v in d.values())
    unik_semua = len(set().union(*[v[1] for v in d.values()]))
    mentah_viirs = sum(v[0] for s, v in d.items() if s != "M")
    unik_viirs = len(set().union(*[v[1] for s, v in d.items() if s != "M"])) if any(s != "M" for s in d) else 0
    bmkg = sum(d[s][2] for s in ("M", "N", "N20") if s in d)
    H["P43"]["hari"][str(h)] = {"mentah_semua_satelit": mentah_semua, "lokasi_unik_semua_satelit": unik_semua, "rasio_mentah_per_unik": round(mentah_semua / unik_semua, 2), "mentah_VIIRS": mentah_viirs,
                                "unik_VIIRS": unik_viirs, "per_sensor_mentah": {s: v[0] for s, v in sorted(d.items())}, "definisi_BMKG_M_N_N20_tinggi": bmkg}
hd = H["P43"]["hari"]
_h2 = {k: v for k, v in hd.items() if k >= "2026-10-26"}
H["P43"]["bmkg_lawan_unik_26Okt_11Nov"] = {"hari": len(_h2), "total_unik": sum(v["lokasi_unik_semua_satelit"] for v in _h2.values()), "total_definisi_BMKG": sum(v["definisi_BMKG_M_N_N20_tinggi"] for v in _h2.values()),
                                           "rasio_unik_per_BMKG_min": round(min(v["lokasi_unik_semua_satelit"] / max(1, v["definisi_BMKG_M_N_N20_tinggi"]) for v in _h2.values()), 1),
                                           "rasio_unik_per_BMKG_maks": round(max(v["lokasi_unik_semua_satelit"] / max(1, v["definisi_BMKG_M_N_N20_tinggi"]) for v in _h2.values()), 1)}
H["P43"]["ringkas"] = {"hari_dihitung": len(hd), "rasio_mentah_per_unik_min": min(v["rasio_mentah_per_unik"] for v in hd.values()), "rasio_mentah_per_unik_maks": max(v["rasio_mentah_per_unik"] for v in hd.values()),
                       "rasio_total": round(sum(v["mentah_semua_satelit"] for v in hd.values()) / sum(v["lokasi_unik_semua_satelit"] for v in hd.values()), 2),
                       "total_mentah": sum(v["mentah_semua_satelit"] for v in hd.values()), "total_unik_hari_sel": sum(v["lokasi_unik_semua_satelit"] for v in hd.values())}
H["P44"] = {"hari": {}}
for h in sorted(per):
    if str(h) not in hd:
        continue
    d = per[h]
    tanpa = set().union(*[v[1] for s, v in d.items() if s != "N"]) if any(s != "N" for s in d) else set()
    semua = set().union(*[v[1] for v in d.values()])
    H["P44"]["hari"][str(h)] = {"mentah_SNPP": d.get("N", [0])[0], "mentah_semua": sum(v[0] for v in d.values()), "unik_semua": len(semua), "unik_tanpa_SNPP": len(tanpa),
                                "pct_unik_tersisa_tanpa_SNPP": pct(len(tanpa), len(semua)), "pct_mentah_tersisa_tanpa_SNPP": pct(sum(v[0] for s, v in d.items() if s != "N"), sum(v[0] for v in d.values()))}
sebelum = [v for k, v in H["P44"]["hari"].items() if k <= "2026-10-31"]
sesudah = [v for k, v in H["P44"]["hari"].items() if k >= "2026-11-02"]
def rata(xs, k):
    return round(sum(x[k] for x in xs) / len(xs), 1) if xs else None
H["P44"]["ringkas"] = {"hari_sebelum_1Nov": len(sebelum), "hari_sesudah_1Nov": len(sesudah),
                       "rata_pct_unik_tersisa_tanpa_SNPP_sebelum": round(sum(x["pct_unik_tersisa_tanpa_SNPP"] for x in sebelum) / len(sebelum), 1),
                       "rata_pct_mentah_tersisa_tanpa_SNPP_sebelum": round(sum(x["pct_mentah_tersisa_tanpa_SNPP"] for x in sebelum) / len(sebelum), 1),
                       "rata_mentah_per_hari_sebelum": rata(sebelum, "mentah_semua"), "rata_mentah_per_hari_sesudah": rata(sesudah, "mentah_semua"),
                       "rata_unik_per_hari_sebelum": rata(sebelum, "unik_semua"), "rata_unik_per_hari_sesudah": rata(sesudah, "unik_semua"),
                       "rata_mentah_SNPP_per_hari_sesudah": rata(sesudah, "mentah_SNPP")}

json.dump(H, open(os.path.join(AK, "hasil/tambahan_EFG.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1, default=str)
print("selesai", os.path.join(AK, "hasil/tambahan_EFG.json"))
