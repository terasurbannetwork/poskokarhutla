"""Uji varian kunci penghapus duplikat logbook Pusdalops 2026 dari baris harian mentah.
Masukan: hasil/logbook_baris_harian.json (python urai_logbook_mentah.py, perlu python-docx). Keluaran: hasil/uji_kunci_logbook.json
Varian: V1 (jenis,prov,kab,tgl) | V1g (V1 + penggabungan kab beririsan seperti logbook_okt.py) | V2 (jenis,prov,kab; jeda <=7 hari antar
kemunculan) | V3 (jenis,prov,tgl) | V4 tanpa dedup. Aturan angka: maks | jumlah | terakhir."""
import json, os, collections, statistics, datetime as dt
AK = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(AK, "hasil/logbook_baris_harian.json"), encoding="utf8"))
ROWS = D["baris"]
for i, r in enumerate(ROWS):
    r["i"] = i
    r["kabk"] = ";".join(r["kab"]) or "-"
    d = r["dampak"]
    r["m"] = {"md": d["md"], "jiwa": d["jiwa"] + 0, "rumah": d["rb"] + d["rs"] + d["rr"], "k2": d["jiwa"] + d["mengungsi"] + d["luka"], "ha": d["ha"]}
KEYS = ("md", "jiwa", "rumah", "k2", "ha")
def dd(s): return dt.date.fromisoformat(s)
def pct(v, p):
    v = sorted(v); return v[min(len(v) - 1, int(round(p / 100 * (len(v) - 1))))] if v else None

def grup_v1(rows, kunci):
    g = collections.OrderedDict()
    for r in rows: g.setdefault(kunci(r), []).append(r)
    return list(g.values())
def grup_v1g(rows):
    base = grup_v1(rows, lambda r: (r["jenis"], r["prov"], r["kabk"], r["tgl"]))
    kel = collections.defaultdict(list)
    for g in base: kel[(g[0]["jenis"], g[0]["prov"], g[0]["tgl"])].append(g)
    out = []
    for vs in kel.values():
        sisa = list(vs)
        while sisa:
            a = sisa.pop(0); ka = set(a[0]["kab"]); a = list(a); i = 0
            while i < len(sisa):
                b = sisa[i]; kb = set(b[0]["kab"]) | {k for r in b for k in r["kab"]}
                if ka & kb or not ka or not kb:
                    ka |= kb; a += b; sisa.pop(i)
                else: i += 1
            out.append(a)
    return out
def grup_v2(rows, jeda=7):
    per = collections.defaultdict(list)
    for r in rows: per[(r["jenis"], r["prov"], r["kabk"])].append(r)
    out = []
    for v in per.values():
        v = sorted(v, key=lambda r: (r["hari"], r["i"])); cur = [v[0]]
        for r in v[1:]:
            if (dd(r["hari"]) - dd(cur[-1]["hari"])).days <= jeda: cur.append(r)
            else: out.append(cur); cur = [r]
        out.append(cur)
    return out
VAR = {"V1 (jenis,prov,kab,tgl)": lambda R: grup_v1(R, lambda r: (r["jenis"], r["prov"], r["kabk"], r["tgl"])),
       "V1g (V1 + gabung kab beririsan)": grup_v1g,
       "V2 (jenis,prov,kab; jeda<=7hr, tanpa tgl)": grup_v2,
       "V3 (jenis,prov,tgl; tanpa kab)": lambda R: grup_v1(R, lambda r: (r["jenis"], r["prov"], r["tgl"])),
       "V4 (tanpa dedup, tiap baris harian)": lambda R: [[r] for r in R]}
def tgl_ev(g): return min(r["tgl"] for r in g)
def nilai(g, aturan, k):
    g = sorted(g, key=lambda r: (r["hari"], r["i"]))
    if aturan == "maks": return max(r["m"][k] for r in g)
    if aturan == "jumlah": return sum(r["m"][k] for r in g)
    return g[-1]["m"][k]   # terakhir
def lolos(m): return m["md"] >= 1 or m["k2"] >= 50 or m["rumah"] >= 5

def hitung(grups, filt):
    gs = [g for g in grups if filt(g)]
    out = {"kejadian": len(gs)}
    for a in ("maks", "jumlah", "terakhir"):
        tot = {k: sum(nilai(g, a, k) for g in gs) for k in ("md", "jiwa", "rumah", "ha")}
        out[a] = tot
    out["lolos_ambang_K1K2K3_aturan_maks"] = sum(1 for g in gs if lolos({k: nilai(g, "maks", k) for k in KEYS}))
    out["baris_harian"] = sum(len(g) for g in gs)
    return out
if __name__ == "__main__":
    H = {"sumber": D["sumber"], "hari_arsip": len(D["hari"]), "baris_mentah_total": len(ROWS), "gagal_urai": D["gagal"],
         "catatan": ["unit tgl kejadian: Okt 2026 = tgl kejadian di 2026-10; Jan-Okt = 2026-01-01 sampai 2026-10-31 (kejadian bertanggal 2025 dan Nov 2026 tidak dihitung)",
                     "terdampak jiwa = angka 'jiwa terdampak' saja (KK tidak dikonversi); k2 = jiwa terdampak + mengungsi + luka; rumah = RB+RS+RR",
                     "aturan jumlah = jumlah semua baris lintas hari (angka kumulatif ditambahkan berulang), disertakan sebagai pembanding"]}
    per = {"Okt 2026": lambda g: tgl_ev(g).startswith("2026-10"), "Jan-Okt 2026": lambda g: "2026-01-01" <= tgl_ev(g) <= "2026-10-31",
           "semua tgl": lambda g: True}
    H["varian"] = {}
    gcache = {}
    for nv, f in VAR.items():
        gcache[nv] = f(ROWS)
        H["varian"][nv] = {p: hitung(gcache[nv], pf) for p, pf in per.items()}
    # pembanding: pertama dilaporkan di bulan
    H["varian_pertama_dilaporkan_Jan_Okt"] = {nv: sum(1 for g in gcache[nv] if "2026-01-01" <= min(r["hari"] for r in g) <= "2026-10-31") for nv in VAR}
    # selisih antar V1 dan V3 (kejadian berbeda kab yang sama jenis/prov/tgl)
    # --- dinamika V1 (jenis,prov,kab,tgl)
    v1 = gcache["V1 (jenis,prov,kab,tgl)"]
    dyn = {"grup_V1": len(v1)}
    multi = [g for g in v1 if len({r["hari"] for r in g}) >= 2]
    dyn["grup_multi_hari"] = len(multi)
    turun = collections.Counter(); naik_kelas = 0; naik_kelas_ket = collections.Counter()
    for g in v1:
        g = sorted(g, key=lambda r: (r["hari"], r["i"]))
        # nilai per hari = maks hari itu
        hari = collections.OrderedDict()
        for r in g:
            for k in KEYS: hari.setdefault(r["hari"], {x: 0 for x in KEYS})[k] = max(hari[r["hari"]][k], r["m"][k]) if r["hari"] in hari else r["m"][k]
        seri = list(hari.values())
        for k in ("md", "jiwa", "rumah", "k2"):
            v = [s[k] for s in seri]
            if any(v[j] < max(v[:j]) for j in range(1, len(v))): turun[k] += 1
        if len(seri) >= 2:
            if any(any(seri[j][k] < max(s[k] for s in seri[:j]) for k in ("md", "jiwa", "rumah", "k2")) for j in range(1, len(seri))): turun["salah_satu_dari_4"] += 1
        awal = lolos(seri[0]); akhir = lolos({k: max(s[k] for s in seri) for k in KEYS})
        if akhir and not awal:
            naik_kelas += 1
            m_ = {k: max(s[k] for s in seri) for k in KEYS}
            naik_kelas_ket["K1" if m_["md"] >= 1 and seri[0]["md"] < 1 else "K2" if m_["k2"] >= 50 and seri[0]["k2"] < 50 else "K3"] += 1
    dyn["koreksi_turun_grup"] = dict(turun)
    dyn["pct_koreksi_turun_dari_multi_hari"] = round(100 * turun["salah_satu_dari_4"] / len(multi), 1) if multi else None
    dyn["naik_kelas_lolos_hanya_di_laporan_kemudian"] = naik_kelas
    dyn["naik_kelas_per_kriteria_pertama_yang_terpenuhi"] = dict(naik_kelas_ket)
    dyn["pct_naik_kelas_dari_grup_lolos_akhir"] = round(100 * naik_kelas / max(1, sum(1 for g in v1 if lolos({k: max(r["m"][k] for r in g) for k in KEYS}))), 1)
    dyn["lolos_akhir"] = sum(1 for g in v1 if lolos({k: max(r["m"][k] for r in g) for k in KEYS}))
    dyn["hari_per_grup"] = {"median": statistics.median([len({r["hari"] for r in g}) for g in v1]), "p90": pct([len({r["hari"] for r in g}) for g in v1], 90),
                            "maks": max(len({r["hari"] for r in g}) for g in v1), "pct_1_hari": round(100 * sum(1 for g in v1 if len({r["hari"] for r in g}) == 1) / len(v1), 1)}
    # selisih hari: tgl kejadian ke pertama dilaporkan
    sel = []; beda_bln = 0; neg = 0; tahun_luar = 0
    for g in v1:
        t = g[0]["tgl"]; p = min(r["hari"] for r in g)
        if not t.startswith("2026") and not t.startswith("2025-12"): tahun_luar += 1
        s = (dd(p) - dd(t)).days; sel.append(s)
        if s < 0: neg += 1
        if t[:7] != p[:7]: beda_bln += 1
    dyn["selisih_tgl_kejadian_ke_pertama_dilaporkan_hari"] = {"median": statistics.median(sel), "p90": pct(sel, 90), "p99": pct(sel, 99),
        "pct_gt3": round(100 * sum(1 for s in sel if s > 3) / len(sel), 1), "pct_beda_bulan": round(100 * beda_bln / len(v1), 1),
        "negatif_tgl_setelah_laporan": neg, "tgl_bukan_2026_atau_des2025": tahun_luar}
    sel_f = [s for s in sel if 0 <= s <= 400]
    dyn["selisih_tanpa_pencilan(0..400)"] = {"n": len(sel_f), "median": statistics.median(sel_f), "p90": pct(sel_f, 90), "pct_gt3": round(100 * sum(1 for s in sel_f if s > 3) / len(sel_f), 1)}
    # lintas bulan dalam grup V2: grup yang melewati akhir bulan
    H["dinamika_V1"] = dyn
    # perbedaan konsekuensi: kejadian V4 vs V1 per jenis Jan-Okt
    jn = collections.Counter(); jn3 = collections.Counter()
    for g in gcache["V1 (jenis,prov,kab,tgl)"]:
        if "2026-01-01" <= tgl_ev(g) <= "2026-10-31": jn[g[0]["jenis"]] += 1
    for g in gcache["V2 (jenis,prov,kab; jeda<=7hr, tanpa tgl)"]:
        if "2026-01-01" <= tgl_ev(g) <= "2026-10-31": jn3[g[0]["jenis"]] += 1
    H["per_jenis_Jan_Okt"] = {"V1": dict(jn.most_common()), "V2": dict(jn3.most_common())}
    # contoh karhutla/kekeringan: kejadian berlangsung berminggu-minggu: berapa grup V2 panjang?
    pj = [(g[0]["jenis"], (dd(max(r["hari"] for r in g)) - dd(min(r["hari"] for r in g))).days) for g in gcache["V2 (jenis,prov,kab; jeda<=7hr, tanpa tgl)"]]
    H["durasi_V2_hari_per_jenis"] = {j: {"n": len(v), "median": statistics.median(v), "p90": pct(v, 90), "maks": max(v)} for j, v in
                                     ((j, [d for jj, d in pj if jj == j]) for j in sorted({j for j, _ in pj})) if len(v) >= 10}
    # kunci V1 yang berubah tgl: kejadian V2 dengan >1 nilai tgl (tgl berubah antarhari = pemecah V1)
    mt = 0; tot = 0
    for g in gcache["V2 (jenis,prov,kab; jeda<=7hr, tanpa tgl)"]:
        if len({r["hari"] for r in g}) >= 2:
            tot += 1
            if len({r["tgl"] for r in g}) > 1: mt += 1
    H["V2_multi_hari_dengan_tgl_berbeda"] = {"grup_multi_hari": tot, "dengan_lebih_dari_1_tgl": mt, "pct": round(100 * mt / tot, 1) if tot else None}
    json.dump(H, open(os.path.join(AK, "hasil/uji_kunci_logbook.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("ok")
