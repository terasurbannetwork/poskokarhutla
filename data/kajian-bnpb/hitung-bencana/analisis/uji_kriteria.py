"""Uji kriteria Juklak 7/2023 (K1-K4 terukur) pada baris DIBI mentah 2024-2026.
Masukan: hasil/dibi_mentah_2024_2026.json (python tarik_dibi.py). Keluaran: hasil/uji_kriteria.json"""
import json, os, collections, datetime as dt
AK = os.path.dirname(os.path.abspath(__file__))
WIB = dt.timezone(dt.timedelta(hours=7))
GRUP = {"Banjir": "banjir", "Longsor": "longsor", "Cuaca ekstrem": "cuaca ekstrem/angin", "Kebakaran hutan dan lahan": "karhutla",
        "Kekeringan": "kekeringan", "Gempabumi": "gempa", "Tsunami": "gempa", "Gelombang pasang / Abrasi": "gelombang/abrasi",
        "Erupsi gunung api": "erupsi", "Kebakaran permukiman": "kebakaran permukiman"}


def muat():
    d = json.load(open(os.path.join(AK, "hasil/dibi_mentah_2024_2026.json"), encoding="utf8"))["data"]
    out = []
    for r in d:
        def n(k): return int(round(r.get(k) or 0))
        t = dt.datetime.fromtimestamp(r["dt"] / 1000, WIB).date()
        o = dict(tgl=t, th=t.year, grup=GRUP.get(r["kategori_bencana"], "lainnya"), is_b=bool(r["is_bencana"]),
                 jk=float(r["jumlah_kejadian"] or 0), prov=r["provinsi"], kab=r["kabupaten"], jenis=r["jenis_bencana"].strip(),
                 meninggal=n("meninggal"), hilang=n("hilang"), luka=n("luka_sakit"), menderita=n("menderita"), mengungsi=n("mengungsi"),
                 rr=n("rumah_rusak_berat") + n("rumah_rusak_sedang") + n("rumah_rusak_ringan"), terendam=n("rumah_terendam"),
                 fas=n("pendidikan_rusak") + n("rumah_ibadat_rusak") + n("fasyankes_rusak") + n("kantor_rusak") + n("jembatan_rusak"),
                 fasum=n("fasum_rusak"), jembatan=n("jembatan_rusak"))
        o["k2n"] = o["menderita"] + o["luka"] + o["mengungsi"]   # terdampak+luka+mengungsi (dijumlah)
        o["k3n"] = o["rr"] + o["fas"]
        o["tot_terdampak"] = o["k2n"]
        out.append(o)
    return out


def kr(o, a1=1, a2=50, a3=5):
    return {"K1": o["meninggal"] >= a1, "K2": o["k2n"] >= a2, "K3": o["k3n"] >= a3}


def ringkas(rows, a1=1, a2=50, a3=5):
    n = len(rows)
    if not n:
        return {"n": 0}
    lolos = 0
    satu = collections.Counter(); per = collections.Counter(); kombinasi = collections.Counter()
    for o in rows:
        k = kr(o, a1, a2, a3); ya = [x for x in k if k[x]]
        per.update(ya); kombinasi["+".join(ya) or "tidak ada"] += 1
        if ya:
            lolos += 1
        if len(ya) == 1:
            satu[ya[0]] += 1
    return {"n": n, "lolos_min1": lolos, "pct_lolos": round(100 * lolos / n, 1), "tidak_satu_pun": n - lolos,
            "pct_tidak": round(100 * (n - lolos) / n, 1), "per_kriteria": dict(per), "hanya_satu_kriteria": dict(satu),
            "kombinasi": dict(kombinasi.most_common())}


def emdat(o): return o["meninggal"] >= 10 or o["k2n"] >= 100
def baris(rows, **kw): return sum(1 for o in rows if any(kr(o, **kw).values()))
def jangka(rows, a, b): return [o for o in rows if a <= o["tgl"] <= b]


if __name__ == "__main__":
    R = muat(); H = {}
    P12 = "12 bulan (13 Nov 2025-12 Nov 2026)"
    kum = {"2024": [o for o in R if o["th"] == 2024], "2025": [o for o in R if o["th"] == 2025],
           "2026 (1 Jan-12 Nov)": [o for o in R if o["th"] == 2026],
           P12: jangka(R, dt.date(2025, 11, 13), dt.date(2026, 11, 12)), "semua 2024-2026": R}
    H["catatan"] = ["K4 (lahan >=1 ha), K5, K6 tidak ada di DIBI",
                    "satuan = baris DIBI mentah (hari x kabupaten x jenis x kategori x is_bencana), bukan jumlah_kejadian (pecahan)",
                    "K2 = menderita + luka + mengungsi (dijumlah); K3 = rumah rusak B+S+R + pendidikan + ibadat + kesehatan + kantor + jembatan; fasum_rusak terpisah",
                    "2024 DIBI tidak lengkap (3.752 baris vs 8.946 di 2025)"]
    H["ringkas_periode"] = {k: ringkas(v) for k, v in kum.items()}
    for nama in (P12, "semua 2024-2026", "2025"):
        rs = kum[nama]; g = collections.defaultdict(list)
        for o in rs: g[o["grup"]].append(o)
        H["per_jenis " + nama] = {k: ringkas(v) for k, v in sorted(g.items(), key=lambda x: -len(x[1]))}
    cm = collections.Counter(); cmj = collections.defaultdict(collections.Counter)
    for o in R:
        ya = any(kr(o).values()); cm[(o["is_b"], ya)] += 1; cmj[o["grup"]][(o["is_b"], ya)] += 1
    H["is_bencana_vs_kriteria"] = {"semua": {f"is_bencana={a},kriteria={b}": v for (a, b), v in cm.items()},
                                   "per_jenis": {g: {f"is_b={a},krit={b}": v for (a, b), v in c.items()} for g, c in cmj.items()}}
    ib = [o for o in R if o["is_b"]]; nb = [o for o in R if not o["is_b"]]
    H["is_bencana_profil"] = {"is_bencana_true": ringkas(ib), "is_bencana_false": ringkas(nb),
                              "false_dengan_meninggal": sum(1 for o in nb if o["meninggal"] >= 1),
                              "false_dengan_k2": sum(1 for o in nb if o["k2n"] >= 50),
                              "false_dengan_k3": sum(1 for o in nb if o["k3n"] >= 5)}
    H["is_bencana_per_tahun"] = {str(th): {"true": sum(1 for o in R if o["th"] == th and o["is_b"]),
                                           "false": sum(1 for o in R if o["th"] == th and not o["is_b"])} for th in (2024, 2025, 2026)}

    def sens(rs):
        out = {"n": len(rs), "basis_K1K2K3": baris(rs)}
        out["K1_saja"] = {a: baris(rs, a1=a, a2=10**9, a3=10**9) for a in (1, 3, 10)}
        out["K2_saja"] = {a: baris(rs, a1=10**9, a2=a, a3=10**9) for a in (10, 50, 100, 500)}
        out["K3_saja"] = {a: baris(rs, a1=10**9, a2=10**9, a3=a) for a in (1, 5, 10, 50)}
        out["gabungan_ATAU"] = {f"K1={a1},K2={a2},K3={a3}": baris(rs, a1=a1, a2=a2, a3=a3) for a1, a2, a3 in
                                [(1, 50, 5), (3, 100, 10), (10, 500, 50), (1, 10, 1), (1, 100, 5), (1, 50, 1), (1, 50, 10)]}
        out["EMDAT"] = sum(1 for o in rs if emdat(o))
        return out
    for nama in (P12, "2025", "semua 2024-2026"):
        rs = kum[nama]; g = collections.defaultdict(list)
        for o in rs: g[o["grup"]].append(o)
        H["kepekaan " + nama] = {"total": sens(rs), "per_jenis": {k: sens(v) for k, v in sorted(g.items(), key=lambda x: -len(x[1]))}}

    rs = kum[P12]
    def nol_korban(o): return o["meninggal"] == 0 and o["hilang"] == 0 and o["luka"] == 0 and o["menderita"] == 0 and o["mengungsi"] == 0
    H["logika_ATAU_12bln"] = {
        "n": len(rs),
        "lolos_hanya_K3": sum(1 for o in rs if kr(o)["K3"] and not kr(o)["K1"] and not kr(o)["K2"]),
        "lolos_K3_dan_nol_korban_sama_sekali": sum(1 for o in rs if kr(o)["K3"] and nol_korban(o)),
        "lolos_K3_5_sd_9_tanpa_K1_K2": sum(1 for o in rs if 5 <= o["k3n"] < 10 and not kr(o)["K1"] and not kr(o)["K2"]),
        "lolos_hanya_K1": sum(1 for o in rs if kr(o)["K1"] and not kr(o)["K2"] and not kr(o)["K3"]),
        "lolos_hanya_K1_tepat_1_meninggal": sum(1 for o in rs if o["meninggal"] == 1 and not kr(o)["K2"] and not kr(o)["K3"]),
        "lolos_hanya_K2": sum(1 for o in rs if kr(o)["K2"] and not kr(o)["K1"] and not kr(o)["K3"]),
        "lolos_hanya_K2_50_sd_99": sum(1 for o in rs if 50 <= o["k2n"] < 100 and not kr(o)["K1"] and not kr(o)["K3"]),
        "lolos_semua_tiga": sum(1 for o in rs if all(kr(o).values())),
        "lolos_dua_dari_tiga": sum(1 for o in rs if sum(kr(o).values()) >= 2),
        "fasum_saja_lolos_baru_jika_fasum_dihitung": sum(1 for o in rs if not any(kr(o).values()) and o["fasum"] >= 5),
        "jembatan_rusak_baris": sum(1 for o in rs if o["jembatan"] >= 1),
        "jembatan_penentu_K3": sum(1 for o in rs if o["jembatan"] >= 1 and o["k3n"] - o["jembatan"] < 5 and o["k3n"] >= 5),
        "terendam_tanpa_rusak_dan_tak_lolos": sum(1 for o in rs if o["terendam"] > 0 and o["rr"] == 0 and not any(kr(o).values())),
    }

    def konsen(rs, kunci):
        v = sorted((o[kunci] for o in rs), reverse=True); tot = sum(v); n = len(v)
        return {"total": tot, "n": n, "pct_dari_1pct_teratas": round(100 * sum(v[:max(1, n // 100)]) / tot, 1) if tot else None,
                "pct_dari_10pct_teratas": round(100 * sum(v[:max(1, n // 10)]) / tot, 1) if tot else None,
                "baris_nol": sum(1 for x in v if x == 0), "maks": v[0]}
    H["konsentrasi"] = {nama: {k: konsen(kum[nama], k) for k in ("meninggal", "tot_terdampak", "mengungsi", "rr", "k3n")}
                        for nama in (P12, "2025", "semua 2024-2026")}
    H["is_bencana_x_tahun_x_kriteria"] = {}
    for th in (2024, 2025, 2026):
        for kk, f in (("semua", lambda o: True), ("tanpa karhutla", lambda o: o["grup"] != "karhutla")):
            c = collections.Counter((o["is_b"], any(kr(o).values())) for o in R if o["th"] == th and f(o))
            H["is_bencana_x_tahun_x_kriteria"][f"{th} {kk}"] = {f"is_b={a},krit={b}": v for (a, b), v in sorted(c.items())}
    cj = collections.defaultdict(collections.Counter)
    for o in R:
        if o["th"] >= 2025: cj[o["grup"]][(o["is_b"], any(kr(o).values()))] += 1
    H["is_bencana_per_jenis_2025_2026"] = {g: {f"is_b={a},krit={b}": v for (a, b), v in sorted(c.items())} for g, c in cj.items()}
    json.dump(H, open(os.path.join(AK, "hasil/uji_kriteria.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1, default=str)
    print("ok")
