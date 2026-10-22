"""Putaran 2 penyetelan ambang kekeringan vs DIBI -> `kejadian.setel2` di public/data/kekeringan_ujibalik.json (protokol: RISET-AMBANG.md, "Putaran 2").

Tiga tuas, ditulis SEBELUM skor dihitung: (a) 8 rancangan satuan/jeda/toleransi D0-D7, (b) ambang per zona iklim (monsunal R<0,5 vs lain),
(c) SPI + tanah (GWETROOT persentil) + HTH (POWER harian). 91 aturan x 8 rancangan = 728 kandidat; per rancangan satu terpilih di LATIH (CSI, >= 10 tepat),
diuji SEKALI di UJI dengan selang bootstrap Bonferroni (K=8). Kriteria LAYAK tidak dilonggarkan (ujibalik.KRITERIA_LAYAK).

Pakai:  python3 scripts/kekeringan/ambang2.py jalan    (butuh cache data/raw/kekeringan_ekstra.json; diunduh bila belum ada, +/- 15 menit)
        python3 scripts/kekeringan/ambang2.py uji
"""
import calendar, datetime as dt, json, os, random, sys, time
from concurrent.futures import ThreadPoolExecutor

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
import ambang as A1
import spi as SPI
import ujibalik as UB

AKAR = os.path.join(AB, "../..")
EKSTRA = os.path.join(AKAR, "data/raw/kekeringan_ekstra.json")
AWAL = "2023-10"
LATIH_AKHIR, UJI_AWAL = "2024-12", "2025-01"
T = A1.AMBANG_T
ZONA_R, TANAH_P, HTH_D = .5, (20, 10), (21, 31)
MIN_TEPAT, ULANG, BENIH, BATAS_WIL = 10, 10000, 20261022, .30
# (kode, jeda, setengah-lebar toleransi, mode)  mode: b = kab-bulan, q1 = triwulan alarm bulan pertama, q2 = triwulan alarm salah satu bulan
RANCANGAN = (("D0", 0, 0, "b"), ("D1", 0, 1, "b"), ("D2", 1, 0, "b"), ("D3", 2, 0, "b"), ("D4", 1, 1, "b"), ("D5", 2, 1, "b"), ("D6", 0, 0, "q1"), ("D7", 0, 0, "q2"))
URAIAN = {"D0": "kab-bulan, serentak", "D1": "kab-bulan, serentak, kejadian +-1 bulan", "D2": "kab-bulan, jeda 1 bulan", "D3": "kab-bulan, jeda 2 bulan",
          "D4": "kab-bulan, jeda 1 bulan +-1", "D5": "kab-bulan, jeda 2 bulan +-1", "D6": "kab-triwulan, alarm bulan pertama triwulan", "D7": "kab-triwulan, alarm salah satu bulan triwulan"}
BARU = {"I": "E dan tanah <= p", "J": "E dan HTH >= d", "K": "E dan tanah <= p dan HTH >= d", "L": "tanah <= p dan HTH >= d (tanpa SPI)"}


def kode_t(x):
    return f"{x:+.1f}".replace(".", ",")


def aturan():
    """91 aturan: (kode, keluarga, t_z1, t_z2, p, d)."""
    r = [(A1.kode(k, t), k, t, t, None, None) for k in A1.KELUARGA for t in T]
    r += [(f"{k}[Z1{kode_t(a)}|Z2{kode_t(b)}]", k, a, b, None, None) for k in A1.KELUARGA for a in T for b in T if a != b]
    r += [(f"I{kode_t(t)}p{p}", "I", t, t, p, None) for t in T for p in TANAH_P]
    r += [(f"J{kode_t(t)}d{d}", "J", t, t, None, d) for t in T for d in HTH_D]
    r += [(f"K{kode_t(t)}p{p}d{d}", "K", t, t, p, d) for t in T for p in TANAH_P for d in HTH_D]
    r += [(f"Lp{p}d{d}", "L", 0, 0, p, d) for p in TANAH_P for d in HTH_D]
    return r


def alarm_sel(kel, t, p, d, f):
    """f = (s3, s6, hujan, klim, tanah_pct, hth). None bila bahannya kosong."""
    if kel in A1.KELUARGA:
        return A1.alarm_sel(kel, t, f[:4])
    tanah, hth = f[4], f[5]
    if kel == "L":
        return None if tanah is None or hth is None else tanah <= p and hth >= d
    e = A1.alarm_sel("E", t, f[:4])
    if e is None:
        return None
    if kel == "I":
        return None if tanah is None else e and tanah <= p
    if kel == "J":
        return None if hth is None else e and hth >= d
    if tanah is None or hth is None:                                   # K
        return None
    return e and tanah <= p and hth >= d


def zona(seri):
    """1 = monsunal (rerata hujan Jun-Agu / Des-Feb < 0,5, klimatologi 1991-2020), 2 = lainnya."""
    jja = dfm = 0.0
    for y in range(SPI.DASAR[0], SPI.DASAR[1] + 1):
        for m, w in ((6, "j"), (7, "j"), (8, "j"), (12, "d"), (1, "d"), (2, "d")):
            v = seri.get(f"{y}{m:02d}")
            if v is None:
                return 2
            if w == "j":
                jja += v * calendar.monthrange(y, m)[1]
            else:
                dfm += v * calendar.monthrange(y, m)[1]
    return 1 if dfm > 0 and jja / dfm < ZONA_R else 2


def persentil(x, baku):
    if x is None or len(baku) < 20:
        return None
    return 100 * (sum(1 for b in baku if b < x) + .5 * sum(1 for b in baku if b == x)) / len(baku)


def hth_bulanan(harian, bulan):
    """harian = hujan mm mulai 1 Sep 2023 -> {(y, m): HTH terpanjang yang berakhir di bulan itu (hujan < 1 mm), menyambung antar bulan}. None bila hari kosong."""
    out, lari, d0 = {}, 0, dt.date(2023, 9, 1)
    for i, v in enumerate(harian):
        d = d0 + dt.timedelta(days=i)
        lari = lari + 1 if v is not None and 0 <= v < 1 else 0
        k = (d.year, d.month)
        out[k] = max(out.get(k, 0), lari)
    return {b: out.get(b) for b in bulan}


def fitur(pow_sel, ekstra, bulan):
    """{sel: {(y, m): (s3, s6, hujan, klim, tanah_pct, hth)}}"""
    base = A1.fitur(pow_sel, bulan)
    out = {}
    for k, d in base.items():
        e = ekstra.get(k) or {}
        root = e.get("root", {})
        hth = hth_bulanan(e["h"], bulan) if e.get("h") else {}
        o = {}
        for (y, m), f in d.items():
            baku = [root[f"{t}{m:02d}"] for t in range(SPI.DASAR[0], SPI.DASAR[1] + 1) if f"{t}{m:02d}" in root]
            o[(y, m)] = f + (persentil(root.get(f"{y}{m:02d}"), baku), hth.get((y, m)))
        out[k] = o
    return out


def larik_alarm(r, bulan, fit, kabsel, zn):
    """{kab: [None/0/1 per bulan]} untuk aturan r; alarm kab = >= 30% penduduk bernilai di sel beralarm."""
    _, kel, t1, t2, p, d = r
    out = {}
    for kab, sels in kabsel.items():
        seq = []
        for ym in bulan:
            ja = jt = 0
            for sel, jiwa in sels.items():
                f = fit.get(sel)
                a = alarm_sel(kel, t1 if zn.get(sel, 2) == 1 else t2, p, d, f[ym]) if f else None
                if a is not None:
                    ja += jiwa * a
                    jt += jiwa
            seq.append(None if jt == 0 else int(ja / jt >= BATAS_WIL))
        out[kab] = seq
    return out


def larik_kejadian(obs, bulan, kabs):
    idx = {f"{y}-{m:02d}": i for i, (y, m) in enumerate(bulan)}
    E = {k: [0] * len(bulan) for k in kabs}
    for (kab, ym), n in obs.items():
        if kab in E and ym in idx:
            E[kab][idx[ym]] = 1
    return E


def triwulan(i, bulan):
    y, m = bulan[i]
    return (y, (m - 1) // 3)


def tabel(rc, A, E, ta, tb):
    """{kunci_bulan_atau_triwulan: [alarm_n, alarm_palsu, kejadian_n, kejadian_tertangkap, unit_valid]} untuk rancangan rc dan rentang bulan alarm [ta, tb] (indeks)."""
    _, L, tol, mode = rc
    out = {}
    sel = lambda u: out.setdefault(u, [0, 0, 0, 0, 0])
    if mode == "b":
        for kab, a in A.items():
            e = E[kab]
            for t in range(max(ta, tol - L), tb + 1):
                if a[t] is None:
                    continue
                w = sel(t)
                w[4] += 1
                if a[t]:
                    w[0] += 1
                    w[1] += not any(e[j] for j in range(t + L - tol, t + L + tol + 1))
            for s in range(ta + L + tol, tb + L - tol + 1):
                if s >= len(e) or a[s - L] is None or not e[s]:
                    continue
                w = sel(s)
                w[2] += 1
                w[3] += any(a[j] for j in range(s - L - tol, s - L + tol + 1) if a[j] is not None)
        return out
    qs = {}
    for i in range(ta, tb + 1):
        qs.setdefault(triwulan(i, list_bulan(len(E[next(iter(E))]))), []).append(i)
    for kab, a in A.items():
        e = E[kab]
        for q, ms in qs.items():
            al = [a[i] for i in ms] if mode == "q2" else [a[ms[0]]]
            if all(x is None for x in al):
                continue
            ada = any(x for x in al if x is not None)
            kej = any(e[i] for i in ms)
            w = sel(q)
            w[4] += 1
            w[0] += ada
            w[1] += ada and not kej
            w[2] += kej
            w[3] += kej and ada
    return out


def list_bulan(n):
    y, m, o = 2023, 10, []
    for _ in range(n):
        o.append((y, m))
        y, m = (y, m + 1) if m < 12 else (y + 1, 1)
    return o


def skor(tab, lebar=1):
    """POD = tertangkap/kejadian, FAR = palsu/alarm, CSI = 1/(1/(1-FAR) + 1/POD - 1); CSI acak dari laju alarm dan kejadian yang sama (jendela selebar `lebar`)."""
    an, af, en, ec, nv = (sum(v[i] for v in tab.values()) for i in range(5))
    pod = ec / en if en else None
    far = af / an if an else None
    csi = 1 / (1 / (1 - far) + 1 / pod - 1) if ec and an and far < 1 else (0.0 if an or en else None)
    a, o = (an / nv, en / nv) if nv else (0, 0)
    pa, po = 1 - (1 - a) ** lebar, 1 - (1 - o) ** lebar
    acak = 1 / (1 / po + 1 / pa - 1) if pa > 0 and po > 0 else None
    r = lambda x: None if x is None else round(x, 3)
    return {"unit": nv, "alarm": an, "palsu": af, "kejadian": en, "tertangkap": ec, "alarm_pct": round(100 * a, 1), "kejadian_pct": round(100 * o, 1),
            "pod": r(pod), "far": r(far), "csi": r(csi), "csi_acak": r(acak)}


def selang(tab, lebar, kiri, kanan, ulang=ULANG, benih=BENIH):
    rng = random.Random(benih)
    kunci = sorted(tab)
    nilai = {"pod": [], "far": [], "csi": []}
    for _ in range(ulang):
        t = {i: tab[rng.choice(kunci)] for i in range(len(kunci))}
        s = skor(t, lebar)
        for k in nilai:
            if s[k] is not None:
                nilai[k].append(s[k])
    q = lambda v, p: sorted(v)[min(len(v) - 1, max(0, int(p * (len(v) - 1))))]
    return {k: [round(q(v, kiri), 3), round(q(v, kanan), 3)] if v else None for k, v in nilai.items()}


def vonis_rc(s, ci, rc):
    k = UB.KRITERIA_LAYAK
    f = lambda x: "tak ada" if x is None else f"{x:.2f}".replace(".", ",")
    g = []
    if s["pod"] is None or s["pod"] < k["pod_min"]:
        g.append(f"POD {f(s['pod'])} < {f(k['pod_min'])}")
    if s["far"] is None or s["far"] > k["far_maks"]:
        g.append(f"FAR {f(s['far'])} > {f(k['far_maks'])}")
    if s["csi"] is None or s["csi_acak"] is None or s["csi"] < k["csi_lipat_acak"] * s["csi_acak"]:
        g.append(f"CSI {f(s['csi'])} kurang dari {f(k['csi_lipat_acak'])}x acak ({f(s['csi_acak'])})")
    if not ci.get("csi") or s["csi_acak"] is None or ci["csi"][0] <= s["csi_acak"]:
        g.append(f"batas bawah selang CSI {f(ci['csi'][0] if ci.get('csi') else None)} tidak di atas acak")
    return {"layak": not g, "alasan": "Lolos kriteria di periode uji." if not g else "Belum layak: " + "; ".join(g) + "."}


def rentang(rc, bulan, uji):
    _, L, tol, mode = rc
    n, il, iu = len(bulan), bulan.index((2024, 12)), bulan.index((2025, 1))
    if mode != "b":
        return (iu, n - 1) if uji else (0, il)
    return (iu, n - 1 - L - tol) if uji else (max(0, tol - L), il - L - tol)


def setel2(pow_sel, ekstra, peta, obs, bulan_akhir):
    bulan = A1.bulan_antara(AWAL, bulan_akhir)
    fit = fitur(pow_sel, ekstra, bulan)
    zn = {k: zona(s) for k, s in pow_sel.items()}
    kabsel = {}
    for _, kab, jiwa, sel in peta:
        kabsel.setdefault(kab, {})
        kabsel[kab][sel] = kabsel[kab].get(sel, 0) + jiwa
    E = larik_kejadian(obs, bulan, kabsel)
    reg = aturan()
    K = len(RANCANGAN)
    kiri, kanan = .025 / K, 1 - .025 / K
    A = {r[0]: larik_alarm(r, bulan, fit, kabsel, zn) for r in reg}
    hasil = {}
    for rc in RANCANGAN:
        lebar = 2 * rc[2] + 1
        tl = rentang(rc, bulan, False)
        tu = rentang(rc, bulan, True)
        skr = {r[0]: skor(tabel(rc, A[r[0]], E, *tl), lebar) for r in reg}
        ok = [r[0] for r in reg if skr[r[0]]["tertangkap"] >= MIN_TEPAT]
        pil = max(ok, key=lambda k: skr[k]["csi"] if skr[k]["csi"] is not None else -1) if ok else None
        urut = sorted(ok, key=lambda k: -(skr[k]["csi"] or 0))[:5]
        h = {"uraian": URAIAN[rc[0]], "jeda": rc[1], "toleransi": rc[2], "latih": list(bulan_antara_str(bulan, tl)), "uji": list(bulan_antara_str(bulan, tu)),
             "kandidat_n": len(reg), "memenuhi_syarat_tepat_latih": len(ok), "latih_lolos_pod_far": sum(1 for k in skr if (skr[k]["pod"] or 0) >= .5 and (skr[k]["far"] if skr[k]["far"] is not None else 1) <= .8),
             "latih_top5": [{"kode": k, **{x: skr[k][x] for x in ("pod", "far", "csi", "csi_acak", "tertangkap")}} for k in urut], "terpilih": pil}
        sk = A1.kode(*SEKARANG_KEL)
        h["sekarang"] = {"kode": sk, "latih": skr[sk], "uji": skor(tabel(rc, A[sk], E, *tu), lebar)}
        if pil:
            tab = tabel(rc, A[pil], E, *tu)
            s = skor(tab, lebar)
            ci = selang(tab, lebar, kiri, kanan)
            h["terpilih_latih"] = skr[pil]
            h["terpilih_uji"] = s
            h["terpilih_selang_bonferroni"] = ci
            h["vonis"] = vonis_rc(s, ci, rc)
        else:
            h["vonis"] = {"layak": False, "alasan": "Tak ada kandidat dengan >= 10 tepat di periode latih."}
        hasil[rc[0]] = h
    layak = [k for k, h in hasil.items() if h["vonis"]["layak"]]
    best = max(layak, key=lambda k: hasil[k]["terpilih_uji"]["csi"]) if layak else None
    skala = {k: (h["terpilih_uji"]["csi"] / h["terpilih_uji"]["csi_acak"]) for k, h in hasil.items() if h.get("terpilih_uji") and h["terpilih_uji"]["csi"] and h["terpilih_uji"]["csi_acak"]}
    dekat = max(skala, key=skala.get) if skala else None
    kode_pil = {k: h["terpilih"] for k, h in hasil.items()}
    pel = pelaporan(A, E, peta, rc_dekat=next(r for r in RANCANGAN if r[0] == (best or dekat)), pil=kode_pil.get(best or dekat), bulan=bulan) if (best or dekat) and kode_pil.get(best or dekat) else None
    return {"protokol": "scripts/kekeringan/RISET-AMBANG.md (Putaran 2)", "latih": [AWAL, LATIH_AKHIR], "uji": [UJI_AWAL, bulan_akhir], "aturan_n": len(reg), "kandidat_n": len(reg) * K,
            "bonferroni_k": K, "bootstrap": {"ulang": ULANG, "cuplik": "bulan atau triwulan", "benih": BENIH, "persentil": [round(100 * kiri, 4), round(100 * kanan, 4)]},
            "zona": {"z1_monsunal": sum(1 for v in zn.values() if v == 1), "z2_lainnya": sum(1 for v in zn.values() if v == 2), "aturan": f"R = hujan Jun-Agu / Des-Feb 1991-2020 < {ZONA_R}"},
            "keluarga_baru": BARU, "kriteria_layak": {**UB.KRITERIA_LAYAK, "csi_bawah_selang_di_atas_acak": True, "koreksi": "Bonferroni K=8"},
            "rancangan": hasil, "terbaik_uji": dekat, "rasio_csi_acak_uji": {k: round(v, 2) for k, v in skala.items()},
            "vonis": {"layak": bool(layak), "rancangan": best, "terpilih": hasil[best]["terpilih"] if best else None,
                      "alasan": (f"Lolos di {best} ({hasil[best]['uraian']}): {hasil[best]['terpilih']}." if best else
                                 "Tidak satu pun dari 8 rancangan lolos kriteria di periode uji: " + "; ".join(f"{k}: {h['vonis']['alasan'].replace('Belum layak: ', '')}" for k, h in hasil.items())[:900])},
            "pelaporan": pel}


SEKARANG_KEL = ("A", -1.0)


def bulan_antara_str(bulan, rg):
    a, b = rg
    return f"{bulan[a][0]}-{bulan[a][1]:02d}", f"{bulan[b][0]}-{bulan[b][1]:02d}"


def pelaporan(A, E, peta, rc_dekat, pil, bulan):
    """Diagnostik kewajaran target DIBI (tidak dipakai menentukan lulus)."""
    prov = {}
    for p, kab, _, _ in peta:
        prov[kab] = p
    bln_lapor = {kab: sum(e) for kab, e in E.items()}
    per_prov = {}
    for kab, n in bln_lapor.items():
        d = per_prov.setdefault(prov[kab], [0, 0, 0])
        d[0] += 1
        d[1] += n > 0
        d[2] += n
    pernah = {p for p, d in per_prov.items() if d[1] > 0}
    urut = sorted(per_prov.items(), key=lambda x: -x[1][2])
    total_bln = sum(bln_lapor.values())
    kab_lapor = [n for n in bln_lapor.values() if n > 0]
    tu = rentang(rc_dekat, bulan, True)
    lebar = 2 * rc_dekat[2] + 1
    grup = {"pernah": [0, 0, 0], "tak_pernah": [0, 0, 0]}
    for kab, a in A[pil].items():
        t = tabel(rc_dekat, {kab: a}, {kab: E[kab]}, *tu)
        s = [sum(v[i] for v in t.values()) for i in (0, 1, 4)]
        g = grup["pernah" if prov[kab] in pernah else "tak_pernah"]
        for i in range(3):
            g[i] += s[i]
    f = lambda g: {"alarm": g[0], "palsu": g[1], "far": round(g[1] / g[0], 3) if g[0] else None, "unit": g[2]}
    return {"rancangan": rc_dekat[0], "aturan": pil, "kab_total": len(E), "kab_pernah_melapor": len(kab_lapor), "kab_pernah_melapor_pct": round(100 * len(kab_lapor) / len(E), 1),
            "bulan_lapor_total": total_bln, "kab_melapor_ulang": sum(1 for n in kab_lapor if n >= 2), "kab_melapor_ulang_pct_dari_pelapor": round(100 * sum(1 for n in kab_lapor if n >= 2) / max(1, len(kab_lapor)), 1),
            "provinsi_teratas": [{"prov": p, "kab": d[0], "kab_melapor": d[1], "kab_bulan_lapor": d[2]} for p, d in urut[:5]], "provinsi_pernah_melapor": len(pernah), "provinsi_total": len(per_prov),
            "far_menurut_pelaporan": {"provinsi_pernah_melapor": f(grup["pernah"]), "provinsi_tak_pernah_melapor": f(grup["tak_pernah"])}}


def unduh_ekstra(sel_keys):
    from umum import ambil
    ua = {"User-Agent": "Mozilla/5.0"}

    def satu(k):
        lat, lon = k.split(",")
        try:
            d = ambil(f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG&longitude={lon}&latitude={lat}&start=20230901&end=20260831&format=JSON", coba=4, batas_waktu=120, kepala=ua)
            m = ambil(f"https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=GWETROOT&community=AG&longitude={lon}&latitude={lat}&start=1991&end=2026&format=JSON", coba=4, batas_waktu=120, kepala=ua)
            return k, {"h": [round(v, 2) if v > -900 else None for _, v in sorted(d["properties"]["parameter"]["PRECTOTCORR"].items())],
                       "root": {a: b for a, b in m["properties"]["parameter"]["GWETROOT"].items() if b > -900 and not a.endswith("13")}}
        except Exception as e:
            print(f"  POWER {k}: {e}", file=sys.stderr)
            return k, None
    with ThreadPoolExecutor(4) as ex:
        return {k: v for k, v in ex.map(satu, sel_keys) if v}


def jalan():
    import hth as H
    from umum import baca, simpan
    t0 = time.time()
    r = lambda f: json.load(open(os.path.join(H.DIR_DATA, f)))
    tanah, penduduk = r("tanah.json"), r("penduduk.json")
    pusat = json.load(open(os.path.join(H.AKAR, "public/banjir/data/pusat_kec.json")))
    pow_sel = SPI.hujan_bulanan([(g["lat"], g["lon"]) for g in tanah["grid"]], dt.datetime.now(H.WIB).date())
    ekstra = baca(EKSTRA, None)
    if not ekstra or not all(k in ekstra for k in pow_sel):
        ekstra = unduh_ekstra(list(pow_sel))
        simpan(EKSTRA, ekstra)
    peta = H.peta_kec(penduduk, pusat, pow_sel)
    kej = baca(os.path.join(H.AKAR, "public/banjir/data/kejadian.json"))
    obs, _, _ = UB.kejadian_per_kab(kej, {kab for _, kab, _, _ in peta})
    ym = SPI.bulan_terakhir(pow_sel)
    s2 = setel2(pow_sel, ekstra, peta, obs, f"{ym[0]}-{ym[1]:02d}")
    s2["dibuat"] = dt.datetime.now(H.WIB).isoformat(timespec="minutes")
    jalur = os.path.join(H.DIR_DATA, "kekeringan_ujibalik.json")
    isi = baca(jalur)
    isi["kejadian"]["setel2"] = s2
    simpan(jalur, isi)
    print(f"ambang2: {s2['kandidat_n']} kandidat; vonis layak={s2['vonis']['layak']}; {time.time() - t0:.0f} dtk", file=sys.stderr)
    for k, h in s2["rancangan"].items():
        u = h.get("terpilih_uji") or {}
        print(f"  {k} {h['terpilih']}: uji POD {u.get('pod')} FAR {u.get('far')} CSI {u.get('csi')} acak {u.get('csi_acak')}", file=sys.stderr)


def uji():
    assert kode_t(-.5) == "-0,5" and len(aturan()) == 91 and len({r[0] for r in aturan()}) == 91
    # persentil, zona, HTH
    assert persentil(1, list(range(2, 32))) == 0 and persentil(40, list(range(30))) == 100 and persentil(5, [5] * 30) == 50 and persentil(None, [1] * 30) is None
    mus = {f"{y}{m:02d}": (1.0 if m in (6, 7, 8) else 8.0) for y in range(1991, 2021) for m in range(1, 13)}
    assert zona(mus) == 1 and zona({k: 5.0 for k in mus}) == 2
    r = hth_bulanan([5] + [0] * 29 + [0] * 5 + [3], [(2023, 9), (2023, 10)])              # Sep: 29 hari kering; Okt 1-5 menyambung -> 34
    assert r[(2023, 9)] == 29 and r[(2023, 10)] == 34, r
    # alarm keluarga baru
    f = (-1.2, None, 10, 50, 5, 25)
    assert alarm_sel("I", -1, 10, None, f) is True and alarm_sel("I", -1, 10, None, (-1.2, None, 10, 50, 15, 25)) is False
    assert alarm_sel("J", -1, None, 21, f) is True and alarm_sel("J", -1, None, 31, f) is False and alarm_sel("K", -1, 10, 31, f) is False
    assert alarm_sel("L", 0, 10, 21, (None, None, None, None, 5, 25)) is True and alarm_sel("L", 0, 10, 21, (0, 0, 0, 0, None, 25)) is None
    # tabel: kab K1 alarm di bulan 1,2; kejadian di bulan 2 dan 5 (indeks); D0 serentak: 1 tepat, 1 palsu, 1 tertangkap, 1 terlewat
    n = 8
    A = {"K1": [0, 1, 1, 0, 0, 0, 0, 0]}
    E = {"K1": [0, 0, 1, 0, 0, 1, 0, 0]}
    s = skor(tabel(("D0", 0, 0, "b"), A, E, 0, 7))
    assert (s["alarm"], s["palsu"], s["kejadian"], s["tertangkap"]) == (2, 1, 2, 1) and s["pod"] == .5 and s["far"] == .5 and s["csi"] == .333
    s = skor(tabel(("D1", 0, 1, "b"), A, E, 0, 7), 3)                            # toleransi +-1: alarm bulan 1 ada kejadian di bulan 2 -> tak palsu
    assert (s["palsu"], s["tertangkap"]) == (0, 1) and s["csi"] == .5
    s = skor(tabel(("D2", 1, 0, "b"), A, E, 0, 6))                               # jeda 1: alarm t menilai kejadian t+1: alarm 1 -> E2 ya, alarm 2 -> E3 tidak
    assert (s["alarm"], s["palsu"], s["kejadian"], s["tertangkap"]) == (2, 1, 2, 1)   # kejadian bulan 2 (alarm 1) tertangkap, bulan 5 (alarm 4) terlewat
    # triwulan: indeks 0 = Okt 2023; bulan 0-2 = Q4-23
    A2 = {"K1": [1, 0, 0, 0, 0, 0, 0, 0, 0], "K2": [0, 1, 0, 0, 0, 0, 0, 0, 0]}
    E2 = {"K1": [0, 1, 0, 0, 0, 0, 0, 0, 0], "K2": [0, 0, 1, 0, 0, 0, 0, 0, 0]}
    q1, q2 = skor(tabel(("D6", 0, 0, "q1"), A2, E2, 0, 8)), skor(tabel(("D7", 0, 0, "q2"), A2, E2, 0, 8))
    assert q1["alarm"] == 1 and q1["tertangkap"] == 1 and q2["alarm"] == 2 and q2["tertangkap"] == 2 and q2["kejadian"] == 2
    # CSI acak tanpa toleransi = rumus klasik
    s = skor({0: [10, 5, 10, 5, 100]})
    assert abs(s["csi_acak"] - .1 * .1 / (.2 - .01)) < .002
    print("ok ambang2 (unit)")
    # integrasi sintetis: D0 'sekarang' harus sama dengan ambang.setel; sel 0 & 1 kemarau tegas -> zona 1
    pw, peta, obs = _sintetis()
    eks = {k: {"h": [0.0 if (i // 30) % 12 in (5, 6, 7, 8) else 6.0 for i in range(1096)], "root": {f"{y}{m:02d}": (.2 if k in ("0.25,0.25", "0.25,1.25") and 6 <= m <= 9 and y >= 2023 else .6 + ((y * 7 + m) % 5) * .01)
                                                                                    for y in range(1991, 2027) for m in range(1, 13) if (y, m) <= (2026, 8)}} for k in pw}
    global MIN_TEPAT
    MIN_TEPAT = 2                                                                       # data sintetis hanya 4 kejadian latih
    s2 = setel2(pw, eks, peta, obs, "2026-08")
    lama = A1.setel(pw, peta, obs, "2026-08")
    d0 = s2["rancangan"]["D0"]["sekarang"]["uji"]
    u = lama["hasil"]["sekarang"]["uji"]
    assert (d0["tertangkap"], d0["palsu"], d0["kejadian"]) == (u["tepat"], u["palsu"], u["tepat"] + u["terlewat"]), (d0, u)
    assert s2["kandidat_n"] == 91 * 8 and s2["zona"]["z1_monsunal"] == 2 and s2["vonis"]["layak"] in (True, False) and set(s2["rancangan"]) == {r[0] for r in RANCANGAN}
    assert s2["rancangan"]["D0"]["terpilih"] is not None and s2["rancangan"]["D0"]["terpilih_uji"]["pod"] == 1.0, s2["rancangan"]["D0"]
    assert all("uji" not in c for c in s2["rancangan"]["D0"]["latih_top5"]) and len(json.dumps(s2)) < 40_000
    print("ok ambang2")


def _sintetis():
    def seri(kemarau, kering_basah):
        d = {}
        for y in range(1991, 2027):
            for m in range(1, 13):
                if (y, m) > (2026, 8):
                    continue
                base = (.8 if 6 <= m <= 9 else 8.0) if kemarau else 8.0
                v = base * (1 + ((y * 7 + m * 3) % 5 - 2) * .05)
                if y >= 2023 and ((kemarau and 6 <= m <= 9) or (kering_basah and m in (1, 2, 12))):
                    v *= .1
                d[f"{y}{m:02d}"] = v
        return d
    pw = {"0.25,0.25": seri(True, False), "0.25,1.25": seri(True, False), "0.25,2.25": seri(False, True), "0.25,3.25": seri(False, False)}
    peta = [("11", f"11|K{i}", 1000, f"0.25,{i}.25") for i in range(4)]
    obs = {(f"11|K{i}", f"{y}-{m:02d}"): 1 for i in (0, 1) for y in (2023, 2024, 2025, 2026) for m in (7, 8) if (y, m) >= (2023, 10)}
    return pw, peta, obs


if __name__ == "__main__":
    {"uji": uji, "jalan": jalan}.get((sys.argv[1:] or ["uji"])[0], uji)()
