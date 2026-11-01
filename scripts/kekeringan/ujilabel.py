"""Uji balik indeks/ambang kekeringan terhadap label Pusdalops (G8) -> data/raw/kekeringan_ujilabel.json; ringkasan manusia di RISET-LABEL.md.

Protokol (ditetapkan SEBELUM skor uji dilihat; label dari label.py):
  satuan     kab-bulan; alarm kab = >= 30% penduduk di sel beralarm (aturan status.py, ambang2.larik_alarm). Diagnosis serentak (bulan sama).
  sampel     per sumber label: hanya bulan dalam cakupan sumber DAN bulan sebelumnya juga dalam cakupan (supaya persistensi adil); gabungan: gabungan cakupan,
             positif bila sumber mana pun positif. Kab 'tidak menerbitkan SK' keluar dari cakupan SK.
  pembagian  LATIH tahun <= 2021 (memilih aturan); UJI tahun >= 2023 (sekali). 2022 tak punya cakupan sumber mana pun. Aturan SPI tidak memakai label sama sekali,
             jadi aturan tetap (A-1,0 sekarang, A-1,5) boleh dilaporkan di kedua periode; yang DISETEL hanya terpilih (CSI latih tertinggi pada gabungan, >= 10 tepat).
  kandidat   aturan ambang2.aturan() tanpa HTH (J/K/L): HTH harian baru ada sejak Sep 2023, tak ada di latih. SPI dibaku 1991-2020; persentil tanah GWETROOT 1991-2020.
  pembanding acak (laju alarm & kejadian sama); klimatologi K1 (kab x bulan-kalender punya kejadian di latih gabungan) dan K2 (himpunan bulan-kalender nasional, ukuran
             dipilih CSI latih); persistensi (kejadian bulan lalu yang SUDAH TERCATAT di akhir bulan itu: logbook memakai pertama_dicatat, bukan tgl_kejadian; persistensi SK
             tidak dipakai karena rentang SK ditetapkan di muka = artefak). Klimatologi dibangun HANYA dari latih gabungan.
  selang     bootstrap blok kab x tahun (2.000 ulangan, cuplikan sama untuk semua metode), CSI per metode dan SELISIH CSI berpasangan metode - K1.
  tambahan   baris uji_tanpa_pelapor_berulang: tanpa kab yang melapor >= 3 bulan berbeda di latih gabungan.
  layak      POD >= 0,5, FAR <= 0,8, CSI >= 2x acak (ujibalik.KRITERIA_LAYAK) DAN CSI > pembanding terbaik DAN batas bawah selisih CSI vs K1 > 0 DAN batas bawah selang CSI > CSI acak,
             pada gabungan UJI DAN pada tiap sumber UJI sendiri. Hanya bila semua itu terpenuhi ambang baru diusulkan.
Pakai:  python3 scripts/kekeringan/ujilabel.py [uji|jalan]
"""
import calendar, json, os, random, sys

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
import ambang2 as A2
import label as LB
import ujibalik as UB

AKAR = os.path.join(AB, "../..")
LATIH_AKHIR, UJI_AWAL, MIN_TEPAT, ULANG, BENIH, MIN_PELAPOR = 2021, 2023, 10, 2000, 20261102, 3
AKHIR_SPI = "2026-08"
SEKARANG, SIAGA = "A-1,0", "A-1,5"


def sebelum(ym):
    y, m = int(ym[:4]), int(ym[5:])
    return f"{y}-{m - 1:02d}" if m > 1 else f"{y - 1}-12"


def skor(c):
    r = UB.skor_kontingensi(*c)
    r["tepat"], r["terlewat"], r["palsu"] = c[0], c[1], c[2]
    return r


def hitung(unit, alarm):
    """unit [(kab, ym, y, y_prev)], alarm(kab, ym, y_prev) -> True/False/None (None = tak dinilai). Mengembalikan ({ym: [h,m,f,n]}, total)."""
    per, tot = {}, [0, 0, 0, 0]
    for kab, ym, y, yp in unit:
        a = alarm(kab, ym, yp)
        if a is None:
            continue
        i = 0 if (y and a) else 1 if y else 2 if a else 3
        per.setdefault(ym, [0, 0, 0, 0])[i] += 1
        tot[i] += 1
    return per, tot


PASANG = (("persistensi", "K1_kab_x_bulan"), ("sekarang", "K1_kab_x_bulan"), ("siaga", "K1_kab_x_bulan"), ("terpilih", "K1_kab_x_bulan"))


def blok_hitung(unit, metode):
    """{(kab, tahun): {metode: [h,m,f,n]}}: satuan cuplik bootstrap = kab x tahun (menahan korelasi antarbulan dan antar-metode)."""
    out = {}
    for mn, f in metode.items():
        for kab, ym, y, yp in unit:
            a = f(kab, ym, yp)
            if a is None:
                continue
            c = out.setdefault((kab, ym[:4]), {}).setdefault(mn, [0, 0, 0, 0])
            c[0 if (y and a) else 1 if y else 2 if a else 3] += 1
    return out


def selang_blok(blok, metode, pasang=PASANG, ulang=ULANG, benih=BENIH):
    """Bootstrap blok kab x tahun, cuplik sama untuk semua metode. -> ({metode: [lo, hi] CSI}, {'a-b': [lo, hi] selisih CSI berpasangan}).
    Blok tanpa tepat/terlewat/palsu di metode mana pun tak memengaruhi CSI dan dibuang dari cuplikan (CSI tak memakai tak-ada)."""
    ks = sorted(k for k, v in blok.items() if any(c[0] + c[1] + c[2] for c in v.values()))
    if len(ks) < 2:
        return None, None
    rnd, tot, dif = random.Random(benih), {m: [] for m in metode}, {f"{a}-{b}": [] for a, b in pasang if a in metode and b in metode}
    for _ in range(ulang):
        s3 = {m: [0, 0, 0] for m in metode}
        for k in (rnd.choice(ks) for _ in ks):
            for m, c in blok[k].items():
                s3[m][0] += c[0]; s3[m][1] += c[1]; s3[m][2] += c[2]
        csi = {m: (v[0] / sum(v) if sum(v) else None) for m, v in s3.items()}
        for m, v in csi.items():
            if v is not None:
                tot[m].append(v)
        for a, b in pasang:
            if csi.get(a) is not None and csi.get(b) is not None:
                dif[f"{a}-{b}"].append(csi[a] - csi[b])
    q = lambda v: [round(sorted(v)[int(.025 * len(v))], 3), round(sorted(v)[int(.975 * len(v)) - 1], 3)] if len(v) > 20 else None
    return {m: q(v) for m, v in tot.items()}, {k: q(v) for k, v in dif.items()}


def vonis(s, ci, pembanding, sel_k1=None):
    """s = skor(); ci = selang CSI (blok kab x tahun); pembanding = CSI terbaik dari K1/K2/persistensi; sel_k1 = selang selisih CSI berpasangan vs K1 (None = tak diminta)."""
    K = UB.KRITERIA_LAYAK
    gagal = []
    if s["pod"] is None or s["pod"] < K["pod_min"]:
        gagal.append(f"POD {s['pod']} < {K['pod_min']}")
    if s["far"] is None or s["far"] > K["far_maks"]:
        gagal.append(f"FAR {s['far']} > {K['far_maks']}")
    if not s["csi_acak"] or s["csi"] is None or s["csi"] < K["csi_lipat_acak"] * s["csi_acak"]:
        gagal.append(f"CSI {s['csi']} < {K['csi_lipat_acak']}x acak {s['csi_acak']}")
    if pembanding is not None and (s["csi"] or 0) <= pembanding:
        gagal.append(f"CSI {s['csi']} tidak melampaui pembanding terbaik {pembanding}")
    if sel_k1 is not None and (not sel_k1 or sel_k1[0] <= 0):
        gagal.append(f"selisih CSI vs klimatologi kab x bulan {sel_k1} tidak di atas nol")
    if not ci or not s["csi_acak"] or ci[0] <= s["csi_acak"]:
        gagal.append(f"batas bawah selang {ci and ci[0]} <= acak {s['csi_acak']}")
    return {"layak": not gagal, "gagal": gagal}


def susun_unit(data, nama, kabs):
    """Sampel satu sumber ('sk', 'rekap', 'laphar', 'logbook') atau 'gabungan'. -> [(kab, ym, y, y_prev)]."""
    S = data["sumber"]
    nama_s = list(S) if nama == "gabungan" else [nama]
    tt = set(data["tidak_terbit_kab"])
    cov = {s: set(S[s]["bulan_cakupan"]) for s in nama_s}
    pos = {s: {(k, b) for k, v in S[s]["kab_bulan_data"].items() for b in v} for s in nama_s}
    kenal = {s: {(k, b) for k, v in S[s]["kab_bulan_dikenal"].items() for b in v} for s in nama_s}   # bahan persistensi: hanya yang sudah tercatat di akhir bulan itu
    bulan = sorted(set().union(*cov.values()))
    out = []
    for ym in bulan:
        if ym > AKHIR_SPI or sebelum(ym) < "1991-01":
            continue
        for kab in kabs:
            def ada(b):
                return [s for s in nama_s if b in cov[s] and not (s == "sk" and kab in tt)]
            if not ada(ym) or not ada(sebelum(ym)):
                continue
            # untuk gabungan, bulan lalu dinilai oleh sumber yang meliput bulan itu SENDIRI; positif sumber mana pun (juga di luar cakupan) dihitung
            out.append((kab, ym, any((kab, ym) in pos[s] for s in nama_s), any((kab, sebelum(ym)) in kenal[s] for s in nama_s)))
    return out


def klimatologi(unit_latih):
    """K1 himpunan (kab, bulan-kalender) berkejadian di latih; K2 = bulan-kalender top-k menurut laju nasional, k dipilih CSI latih."""
    k1 = {(k, ym[5:]) for k, ym, y, _ in unit_latih if y}
    n, p = {}, {}
    for _, ym, y, _ in unit_latih:
        n[ym[5:]] = n.get(ym[5:], 0) + 1
        p[ym[5:]] = p.get(ym[5:], 0) + bool(y)
    urut = sorted(n, key=lambda b: (-p[b] / n[b], b))
    terbaik, k2 = -1, set()
    for k in range(1, len(urut) + 1):
        himp = set(urut[:k])
        _, t = hitung(unit_latih, lambda kab, ym, yp: ym[5:] in himp)
        c = t[0] / (t[0] + t[1] + t[2]) if t[0] + t[1] + t[2] else 0
        if c > terbaik:
            terbaik, k2 = c, himp
    return k1, k2


def bagi(unit):
    return [u for u in unit if int(u[1][:4]) <= LATIH_AKHIR], [u for u in unit if int(u[1][:4]) >= UJI_AWAL]


def jalan():
    import hth as H
    penduduk = json.load(open(os.path.join(H.DIR_DATA, "penduduk.json")))
    tanah = json.load(open(os.path.join(H.DIR_DATA, "tanah.json")))
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    data = json.load(open(LB.KELUAR))
    pow_sel = json.load(open(os.path.join(AKAR, "data/raw/kekeringan_hujan.json")))["sel"]   # cache saja, tanpa unduh
    ekstra = json.load(open(A2.EKSTRA))
    peta = H.peta_kec(penduduk, pusat, pow_sel)
    kabsel = {}
    for _, kab, jiwa, sel in peta:
        kabsel.setdefault(kab, {})[sel] = kabsel.get(kab, {}).get(sel, 0) + jiwa
    kabs = sorted(kabsel)
    units = {n: susun_unit(data, n, kabs) for n in list(data["sumber"]) + ["gabungan"]}
    bulan = sorted({u[1] for v in units.values() for u in v} | {sebelum(u[1]) for v in units.values() for u in v})
    byt = [(int(b[:4]), int(b[5:])) for b in bulan]
    fit = A2.fitur(pow_sel, ekstra, byt)
    zn = {k: A2.zona(v) for k, v in pow_sel.items()}
    aturan = [r for r in A2.aturan() if r[1] not in "JKL"]
    idx = {b: i for i, b in enumerate(bulan)}
    alr = {}
    for r in aturan:
        L = A2.larik_alarm(r, byt, fit, kabsel, zn)
        alr[r[0]] = {k: v for k, v in L.items()}

    def alarm_aturan(kode):
        a = alr[kode]
        return lambda kab, ym, yp: (lambda v: None if v is None else bool(v))(a[kab][idx[ym]])

    latih_g, _ = bagi(units["gabungan"])
    k1, k2 = klimatologi(latih_g)
    # --- memilih di latih gabungan (satu kali, tanpa menyentuh uji) ---
    kand = []
    for r in aturan:
        _, t = hitung(latih_g, alarm_aturan(r[0]))
        if t[0] >= MIN_TEPAT:
            kand.append((t[0] / (t[0] + t[1] + t[2]), r[0], skor(t)))
    kand.sort(key=lambda x: (-x[0], x[1]))
    terpilih = kand[0][1] if kand else None
    out = {"protokol": __doc__.split("Pakai:")[0].strip(), "latih_akhir": LATIH_AKHIR, "uji_awal": UJI_AWAL, "kandidat_n": len(aturan), "kandidat_layak_dipilih": len(kand),
           "terpilih": terpilih, "terpilih_skor_latih": kand[0][2] if kand else None, "top5_latih": [(k, c, s["pod"], s["far"]) for c, k, s in kand[:5]],
           "klimatologi_K2_bulan": sorted(k2), "hasil": {}}
    metode = {"sekarang": alarm_aturan(SEKARANG), "siaga": alarm_aturan(SIAGA), "K1_kab_x_bulan": lambda kab, ym, yp: (kab, ym[5:]) in k1,
              "K2_bulan_nasional": lambda kab, ym, yp: ym[5:] in k2, "persistensi": lambda kab, ym, yp: bool(yp)}
    if terpilih:
        metode["terpilih"] = alarm_aturan(terpilih)
    berulang = {k for k in kabs if len({ym for kab, ym, y, _ in latih_g if y and kab == k}) >= MIN_PELAPOR}   # kab yang melapor >= 3 bulan di latih gabungan

    def nilai(n, lab, u):
        m_n = {k: v for k, v in metode.items() if not (n == "sk" and k == "persistensi")}   # persistensi SK = artefak rentang SK, tidak dipakai
        b = {"n_unit": len(u), "kejadian": sum(1 for x in u if x[2])}
        for mn, f in m_n.items():
            per, t = hitung(u, f)
            b[mn] = skor(t)
            if mn in ("sekarang", "terpilih"):
                b[mn]["per_bulan"] = len(per)
        b["pembanding_terbaik_csi"] = max((b[m]["csi"] or 0) for m in ("K1_kab_x_bulan", "K2_bulan_nasional", "persistensi") if m in b)
        if lab != "latih":
            ci, dif = selang_blok(blok_hitung(u, m_n), m_n)
            for mn in m_n:
                b[mn]["selang_csi"] = ci and ci.get(mn)
            b["selisih_csi_vs_K1"] = dif
            for mn in ("sekarang", "siaga") + (("terpilih",) if terpilih else ()):
                b[mn]["vonis"] = vonis(b[mn], b[mn]["selang_csi"], b["pembanding_terbaik_csi"], (dif or {}).get(f"{mn}-K1_kab_x_bulan"))
        return b

    out["kab_pelapor_berulang"] = len(berulang)
    for n, unit in units.items():
        latih, uji = bagi(unit)
        out["hasil"][n] = {}
        for lab, u in (("latih", latih), ("uji", uji), ("uji_tanpa_pelapor_berulang", [x for x in uji if x[0] not in berulang])):
            if u:
                out["hasil"][n][lab] = nilai(n, lab, u)
    uji_src = [n for n in out["hasil"] if "uji" in out["hasil"][n] and n != "gabungan"]
    out["uji_sumber"] = uji_src
    out["layak_terpilih"] = bool(terpilih) and all(out["hasil"][n]["uji"]["terpilih"]["vonis"]["layak"] for n in ["gabungan"] + uji_src)
    out["layak_sekarang"] = all(out["hasil"][n]["uji"]["sekarang"]["vonis"]["layak"] for n in ["gabungan"] + uji_src)
    jalur = os.path.join(AKAR, "data/raw/kekeringan_ujilabel.json")
    json.dump(out, open(jalur, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in out.items() if k != "protokol"}, ensure_ascii=False)[:200], file=sys.stderr)
    return out


def uji():
    assert sebelum("2020-01") == "2019-12" and sebelum("2020-05") == "2020-04"
    # sintetis: 2 kab, alarm persis sama dengan kejadian -> POD 1, FAR 0
    unit = [("a", f"2019-{m:02d}", m in (7, 8), m - 1 in (7, 8)) for m in range(2, 13)]
    per, t = hitung(unit, lambda kab, ym, yp: ym[5:] in ("07", "08"))
    s = skor(t)
    assert t == [2, 0, 0, 9] and s["pod"] == 1 and s["far"] == 0 and s["csi"] == 1, (t, s)
    _, tp = hitung(unit, lambda kab, ym, yp: bool(yp))                  # persistensi tertinggal satu bulan: tepat 1 (Agt), palsu 1 (Sep), terlewat 1 (Jul)
    assert tp == [1, 1, 1, 8], tp
    _, tn = hitung(unit, lambda kab, ym, yp: None)
    assert tn == [0, 0, 0, 0]
    k1, k2 = klimatologi(unit)
    assert k1 == {("a", "07"), ("a", "08")} and k2 == {"07", "08"}
    assert vonis(s, [.9, 1.0], .5)["layak"] is True and vonis(s, [.9, 1.0], 1.0)["layak"] is False   # sempurna lolos; pembanding sama bagus tak cukup
    s2 = skor([8, 2, 2, 88])
    assert vonis(s2, [.5, .8], .1)["layak"] is True and vonis(s2, [.5, .8], .7)["layak"] is False and vonis(skor([1, 9, 9, 81]), [0, .2], 0)["layak"] is False
    # bootstrap blok: A selalu tepat, B selalu salah -> selisih CSI berpasangan A-B > 0 di seluruh cuplikan
    bl = {(f"k{i}", "2023"): {"A": [1, 0, 0, 1], "B": [0, 1, 1, 1]} for i in range(30)}
    ci, dif = selang_blok(bl, {"A": 0, "B": 0}, (("A", "B"),))
    assert ci["A"] == [1.0, 1.0] and dif["A-B"][0] > 0.9, (ci, dif)
    assert selang_blok({("k", "2023"): {"A": [1, 0, 0, 1]}}, {"A": 0}, ()) == (None, None)
    assert vonis(s2, [.5, .8], .1, [-.1, .2])["layak"] is False and vonis(s2, [.5, .8], .1, [.01, .2])["layak"] is True
    data = {"sumber": {"x": {"bulan_cakupan": ["2019-06", "2019-07", "2019-08", "2020-01"], "kab_bulan_data": {"k": ["2019-07"]}, "kab_bulan_dikenal": {"k": ["2019-07"]}}, "sk": {"bulan_cakupan": ["2019-07", "2019-08"], "kab_bulan_data": {}, "kab_bulan_dikenal": {}}},
            "tidak_terbit_kab": ["t"]}
    ux = susun_unit(data, "x", ["k"])
    assert [u[1] for u in ux] == ["2019-07", "2019-08"] and ux[0][2] is True and ux[1][3] is True    # Jun jadi bulan lalu; Jan 2020 tanpa bulan lalu dibuang
    assert [u[1] for u in susun_unit(data, "sk", ["t"])] == [] and len(susun_unit(data, "gabungan", ["t"])) == 2   # kab tidak-terbit: keluar dari SK, tetap dinilai sumber lain
    print("ok ujilabel")


if __name__ == "__main__":
    if "jalan" in sys.argv[1:]:
        jalan()
    else:
        uji()
