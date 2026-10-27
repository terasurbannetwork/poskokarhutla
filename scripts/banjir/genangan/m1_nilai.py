"""Penilai uji prospektif M1 persis menurut docs/banjir/KRITERIA-M1.md + KRITERIA-M1-TAFSIR.md (terkunci; skrip menolak bila hash berbeda).

  m1_nilai.py uji      self-check data sintetis, tanpa jaringan
  m1_nilai.py nilai    baca arsip nyata -> laporan JSON ke stdout (belum ada data nyata sebelum musim berjalan)

Jendela: dari tanggal beku (m1_beku.json) sampai 30 Apr 2027, hanya Nov-Apr. Unit = kecamatan daratan (42) x hari WIB.
Hari masuk bila ada baris hujan teramati sah (tak dikeluarkan) DAN baris label. Prakiraan dihitung bila sidiknya = sidik beku dan
ditulis SEBELUM label hari itu (dibuat prakiraan < dibuat label); versi hujan prakiraan juga harus sebelum 00.00 WIB hari itu.
Label: tafsir n_musim, dihitung SEKALI atas semua hari berlabel di akhir jendela, acuan = ref_proporsi_b3_tepat dari m1_param.json.
Lulus (hanya versi hujan TERAMATI): >= 40 positif (kurang = "belum cukup data"), POD >= 0,50, FAR <= 0,60, batas bawah CI95
bootstrap blok (kecamatan x minggu ISO) berpasangan 1.000 ulangan, benih tetap, dari selisih ETS (M1 dikurangi pembanding terbaik) > 0.
Keputusan penilai yang tidak tertulis di kriteria (semuanya tercatat di keluaran `catatan`):
- "pembanding terbaik": dipilih PER ULANGAN bootstrap (selisih terkecil di antara a-c), jadi konservatif; tiap pembanding dinilai di
  hari yang dimilikinya, M1 dihitung ulang di hari yang sama (berpasangan).
- (a) klimatologi: laju positif per (kecamatan, bulan) atas musim 2017/18-2024/25 (musim 2025/26 belum utuh), label dinormalkan
  dengan acuan yang sama; ambang laju dipilih ETS maksimum atas data yang sama (dalam-sampel, menguntungkan pembanding).
- (b) M0 beku: kecamatan_pemicu.json pada (mm harian, maks 1 jam) hujan teramati yang sama.
- (c) aturan status situs: public/banjir/data/prospektif.json (arsip prospektif.py), entri terbit hari D, waktu-tunda 0, level banjir
  kabupaten/kota >= Siaga (2); arsip hanya per kabupaten/kota, jadi SEMUA kecamatan di kota itu diberi nilai yang sama (aproksimasi),
  kota tak tercatat = Normal; hari tanpa entri terbit = pembanding (c) tidak ada di hari itu.
- label pendamping DSDA (dilaporkan, tidak menentukan): kecamatan dengan pos DSDA Siaga >= 3 menurut m1_label.jsonl; hari
  dengan dsda.status != ok tidak dihitung.
"""
import datetime as dt, json, math, os, random, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tangki as T  # noqa: E402
from bersama import AKAR, WIB  # noqa: E402

PROSPEKTIF = os.path.join(AKAR, "public/banjir/data/prospektif.json")
MIN_POSITIF, POD_MIN, FAR_MAKS, ULANG, BENIH = 40, 0.50, 0.60, 1000, 20261029
# Keputusan sesi induk, 28 Okt 2026, ditetapkan SEBELUM ada data: ketiga pembanding (a, b, c) wajib ada. Tiap pembanding harus tersedia pada
# >= 70% kecamatan-hari yang dinilai untuk M1 DAN memuat >= 20 kecamatan-hari positif pada hari-hari itu; kalau tidak, vonis "belum cukup data".
MIN_CAKUP_PEMBANDING, MIN_POSITIF_PEMBANDING = 0.70, 20
SIAGA_SITUS = 2          # prospektif.SIAGA
MUSIM_KLIM = range(2017, 2025)   # musim 2017/18 .. 2024/25


def blok_minggu(k, tgl):
    i = tgl.isocalendar()
    return (k, i[0], i[1])


# ------------------------------------------------------------------ label
def hari_label(awal, L):
    """Tanggal ISO berlabel di jendela (Nov-Apr), tanpa melihat hujan: dasar n_musim (tafsir: semua kecamatan-hari berlabel)."""
    return sorted(d for d in L if awal <= dt.date.fromisoformat(d) <= T.JENDELA_AKHIR and dt.date.fromisoformat(d).month in T.MUSIM)


def hari_nilai(awal, L, H):
    """Tanggal ISO yang masuk jendela, punya label dan hujan teramati sah (dasar metrik)."""
    return [d for d in hari_label(awal, L) if d in H and not H[d].get("dikeluarkan")]


def label_positif(hari, L, kunci, ref):
    """-> ({(k, d): 0|1}, {musim: n_musim|None}, tak_hingga). n_musim sekali atas semua `hari` (beri hari_label, bukan hari_nilai)."""
    baris = []
    for d in hari:
        pb = L[d]["pb"]["kec"]
        baris += [(T.musim_dari(dt.date.fromisoformat(d)), pb.get(k, {}).get("n", 0), pb.get(k, {}).get("maks_cm", 0)) for k in kunci]
    nm, _, tak = T.normalkan(baris, ref=ref)
    y = {}
    for d in hari:
        n_m = nm[T.musim_dari(dt.date.fromisoformat(d))]
        for k in kunci:
            e = L[d]["pb"]["kec"].get(k, {})
            y[(k, d)] = 1 if (e.get("maks_cm", 0) >= 10 or e.get("n", 0) >= n_m) else 0
    return y, {str(s): (None if v == math.inf else v) for s, v in nm.items()}, tak


def label_dsda(hari, L, kunci):
    """Label pendamping: {(k, d): 0|1} hanya hari dengan dsda.status ok."""
    return {(k, d): 1 if L[d]["dsda"].get("kec", {}).get(k, {}).get("siaga") else 0
            for d in hari if L[d].get("dsda", {}).get("status") == "ok" for k in kunci}


# ------------------------------------------------------------------ pembanding
def klimatologi(lap, ref, kunci):
    """(a) -> ({(k, bulan): laju}, ambang). lap = {(k, tanggal_iso): (n, maks_cm)} (pemicu.label_laporan)."""
    baris, hari = [], []
    for th in MUSIM_KLIM:
        t = dt.date(th, 11, 1)
        while t <= dt.date(th + 1, 4, 30):
            if t.month in T.MUSIM:
                hari.append(t)
                baris += [(th, *lap.get((k, t.isoformat()), (0, 0))) for k in kunci]
            t += dt.timedelta(days=1)
    nm, _, _ = T.normalkan(baris, ref=ref)
    cnt = {}
    for t in hari:
        for k in kunci:
            n, dm = lap.get((k, t.isoformat()), (0, 0))
            a = cnt.setdefault((k, t.month), [0, 0, []])
            y = 1 if (dm >= 10 or n >= nm[T.musim_dari(t)]) else 0
            a[0] += y
            a[1] += 1
            a[2].append(y)
    laju = {kb: v[0] / v[1] for kb, v in cnt.items()}
    pos = sorted(laju[kb] for kb, v in cnt.items() for y in v[2] if y)
    neg = sorted(laju[kb] for kb, v in cnt.items() for y in v[2] if not y)
    cut = max(sorted(set(laju.values())), key=lambda c: T.ets_dari(T.hitung_kontingensi(pos, neg, c - 1e-9)) or -9)
    return laju, cut


def status_situs(prosp, d, k):
    """(c) -> True/False, atau None bila arsip tak punya entri terbit hari d. k = 'Kota Administrasi ...|kecamatan'."""
    e = (prosp or {}).get("terbit", {}).get(d)
    if not e or e["hari"][0] != d:
        return None
    kab = e["kab"].get("31|" + k.split("|")[0])
    return bool(kab and kab[0][0] >= SIAGA_SITUS)


# ------------------------------------------------------------------ prediksi sah
def prediksi_sah(prak, versi, sidik_beku, L):
    """-> ({tanggal: baris}, {alasan: n}). Sah: sidik = beku, dibuat sebelum label hari itu, (prakiraan) sebelum 00.00 WIB hari itu."""
    out, tolak = {}, {}
    for r in prak:
        if r.get("versi") != versi or r["tanggal"] not in L or r["tanggal"] in out:
            continue
        w = dt.datetime.fromisoformat(r["dibuat"])
        if r["sidik"] != sidik_beku:
            alasan = "sidik berbeda dari beku"
        elif w >= dt.datetime.fromisoformat(L[r["tanggal"]]["dibuat"]):
            alasan = "ditulis sesudah label"
        elif versi == "prakiraan" and w >= dt.datetime.combine(dt.date.fromisoformat(r["tanggal"]), dt.time(0), WIB):
            alasan = "ditulis sesudah 00.00 WIB hari itu"
        else:
            out[r["tanggal"]] = r
            continue
        tolak[alasan] = tolak.get(alasan, 0) + 1
    return out, tolak


# ------------------------------------------------------------------ statistik
def tambah(t, ya, y):
    t[0 if ya and y else 1 if ya else 2 if y else 3] += 1


def ringkas(t):
    s = T.skor(*t)
    return {"pod": None if s["pod"] is None else round(s["pod"], 3), "far": None if s["far"] is None else round(s["far"], 3),
            "ets": None if s["ets"] is None else round(s["ets"], 4), "a_b_c_d": list(t)}


def jumlah_blok(bloks, idx):
    tot = {}
    for i in idx:
        for n, t in bloks[i].items():
            a = tot.setdefault(n, [0, 0, 0, 0])
            for j in range(4):
                a[j] += t[j]
    return tot


def selisih_min(tot, pembanding):
    """min atas pembanding dari ETS(m1|c) - ETS(c): M1 dikurangi pembanding terbaik."""
    xs = []
    for c in pembanding:
        e1, e0 = T.ets_dari(tot.get("m1|" + c, [0] * 4)), T.ets_dari(tot.get(c, [0] * 4))
        if e1 is None or e0 is None:
            return None            # ketiga pembanding wajib ada
        xs.append(e1 - e0)
    return min(xs) if xs else None


def evaluasi(unit, pembanding, ulang=ULANG):
    """unit: [(blok, y, ya_m1, {nama: ya|None})] -> laporan. Blok = (kecamatan, tahun ISO, minggu ISO)."""
    bloks = {}
    for b, y, ya, pb in unit:
        t = bloks.setdefault(b, {})
        tambah(t.setdefault("m1", [0, 0, 0, 0]), ya, y)
        for c in pembanding:
            if pb.get(c) is not None:
                tambah(t.setdefault(c, [0, 0, 0, 0]), pb[c], y)
                tambah(t.setdefault("m1|" + c, [0, 0, 0, 0]), ya, y)
    daftar = [bloks[b] for b in sorted(bloks)]
    tot = jumlah_blok(daftar, range(len(daftar)))
    m1 = tot.get("m1", [0, 0, 0, 0])
    lap = {"n_unit": len(unit), "n_positif": m1[0] + m1[2], "m1": ringkas(m1),
           "pembanding": {c: {**ringkas(tot.get(c, [0] * 4)), "m1_di_hari_yang_sama": ringkas(tot.get("m1|" + c, [0] * 4))} for c in pembanding}}
    titik = selisih_min(tot, pembanding)
    r, xs = random.Random(BENIH), []
    for _ in range(ulang if daftar else 0):
        d = selisih_min(jumlah_blok(daftar, [r.randrange(len(daftar)) for _ in daftar]), pembanding)
        if d is not None:
            xs.append(d)
    xs.sort()
    lap["selisih_ets_vs_pembanding_terbaik"] = {"titik": None if titik is None else round(titik, 4), "n_blok": len(daftar), "n_ulang_sah": len(xs),
                                                 "ci95": [round(xs[int(.025 * (len(xs) - 1))], 4), round(xs[int(.975 * (len(xs) - 1))], 4)] if xs else None}
    return lap


def vonis(lap):
    k = {"positif_ge_40": lap["n_positif"] >= MIN_POSITIF}
    if not k["positif_ge_40"]:
        return {"vonis": "belum cukup data", "kriteria": k}
    alasan = []
    for c, v in lap["pembanding"].items():
        cakup = sum(v["a_b_c_d"]) / lap["n_unit"] if lap["n_unit"] else 0.0
        pos = v["m1_di_hari_yang_sama"]["a_b_c_d"][0] + v["m1_di_hari_yang_sama"]["a_b_c_d"][2]
        if cakup < MIN_CAKUP_PEMBANDING:
            alasan.append(f"pembanding {c} tersedia pada {cakup:.0%} kecamatan-hari (< {MIN_CAKUP_PEMBANDING:.0%})")
        if pos < MIN_POSITIF_PEMBANDING:
            alasan.append(f"pembanding {c} memuat {pos} kecamatan-hari positif (< {MIN_POSITIF_PEMBANDING})")
    if alasan:
        return {"vonis": "belum cukup data", "kriteria": k, "alasan": alasan}
    m, ci = lap["m1"], lap["selisih_ets_vs_pembanding_terbaik"]["ci95"]
    k["pod_ge_0.50"] = m["pod"] is not None and m["pod"] >= POD_MIN
    k["far_le_0.60"] = m["far"] is not None and m["far"] <= FAR_MAKS
    k["ci95_bawah_selisih_ets_gt_0"] = bool(ci) and ci[0] > 0
    return {"vonis": "lulus" if all(k.values()) else "gagal", "kriteria": k}


# ------------------------------------------------------------------ rangkai
def susun(awal, beku, prak, L, H, versi, ref, kunci, m0, klim, prosp):
    """-> (unit, info). L,H = {tanggal: baris}; m0 = f(k,mm,m1)->bool; klim = (laju, ambang)."""
    hari_l = hari_label(awal, L)
    hari = hari_nilai(awal, L, H)
    y, nmusim, tak = label_positif(hari_l, L, kunci, ref)
    pred, ditolak = prediksi_sah(prak, versi, beku["sidik"], L)
    laju, cut = klim
    unit, tanpa = [], 0
    for d in hari:
        if d not in pred:
            tanpa += 1
            continue
        t = dt.date.fromisoformat(d)
        for k in kunci:
            x = H[d]["kec"][k]
            unit.append((blok_minggu(k, t), y[(k, d)], bool(pred[d]["kec"][k]["ya"]),
                         {"klimatologi_bulanan": laju.get((k, t.month), 0.0) >= cut, "m0_beku": m0(k, x["mm"], x["m1"]),
                          "status_situs": status_situs(prosp, d, k)}))
    return unit, {"hari_berlabel": len(hari_l), "hari_dinilai": len(hari) - tanpa, "hari_tanpa_prediksi_sah": tanpa, "prediksi_ditolak": ditolak,
                  "n_musim": nmusim, "musim_hanya_a": tak}, y, hari


CATATAN = ["pembanding terbaik dipilih per ulangan bootstrap (selisih terkecil), tiap pembanding dinilai di hari yang dimilikinya dan M1 di hari yang sama",
           "klimatologi bulanan: musim 2017/18-2024/25, ambang laju dipilih ETS maksimum atas data yang sama (dalam-sampel, menguntungkan pembanding)",
           "status situs: arsip prospektif.json per kabupaten/kota, entri terbit hari D, waktu-tunda 0, level banjir >= Siaga; semua kecamatan sekota diberi nilai sama (aproksimasi); hari tanpa entri = pembanding tidak ada",
           "n_musim dihitung sekali atas SEMUA kecamatan-hari berlabel Nov-Apr di jendela (juga yang tanpa hujan sah); metrik hanya atas hari dengan prakiraan sah",
           "ketiga pembanding wajib: tiap pembanding tersedia pada >= 70% kecamatan-hari yang dinilai dan memuat >= 20 positif di hari-hari itu, kalau tidak 'belum cukup data' (keputusan sesi induk 28 Okt 2026, sebelum data)",
           "pembanding (c) dibaca dari prospektif.json, arsip append-only yang dijaga prospektif.py, sehingga tidak ikut sidik; M0 (b) dijaga lewat sha256_m0 saat beku"]
PEMBANDING = ["klimatologi_bulanan", "m0_beku", "status_situs"]


def nilai():
    T.kriteria_ok()
    T.tafsir_ok()
    b, p = T.baca(T.BEKU), T.baca(T.PARAM)
    if not b or not b.get("beku"):
        sys.exit("model belum dibekukan: tidak ada yang dinilai")
    beku = b["beku"][0]
    if beku["sidik"] != T.sidik(p):
        sys.exit("sidik beku != kode/parameter sekarang: hasil tidak sah")
    T.m0_ok()
    awal = dt.datetime.fromisoformat(beku["tanggal_beku"]).date()
    L = {r["tanggal"]: r for r in T.baca_jsonl(T.LABEL_OP)}
    H = {r["tanggal"]: r for r in T.baca_jsonl(T.HUJAN_OP)}
    prak = T.baca_jsonl(T.PRAKIRAAN)
    kunci = [k for k, _, _ in T.kec_daratan()]
    ref = p["latih"]["ref_proporsi_b3_tepat"]
    import pemicu
    klim = klimatologi(pemicu.label_laporan(), ref, kunci)
    m0, prosp = T.m0_fungsi(), T.baca(PROSPEKTIF)
    out = {"jendela": [awal.isoformat(), T.JENDELA_AKHIR.isoformat()], "sidik": beku["sidik"], "kriteria_sha256": T.KRITERIA_SHA256,
           "tafsir_sha256": T.TAFSIR_SHA256, "ref_proporsi_b3": ref, "ambang_klimatologi": klim[1]}
    for versi in ("teramati", "prakiraan"):
        unit, info, y, hari = susun(awal, beku, prak, L, H, versi, ref, kunci, m0, klim, prosp)
        lap = evaluasi(unit, PEMBANDING)
        out[versi] = {**info, **lap}
        if versi == "teramati":
            out[versi].update(vonis(lap))
            pt, _ = prediksi_sah(prak, "teramati", beku["sidik"], L)
            dk = label_dsda(hari, L, kunci)
            ud = [(blok_minggu(k, dt.date.fromisoformat(d)), dk[(k, d)], bool(pt[d]["kec"][k]["ya"]), {}) for (k, d) in sorted(dk) if d in pt]
            out["label_pendamping_dsda"] = {"catatan": "dilaporkan saja, tidak menentukan lulus", **evaluasi(ud, [], 0)}
        else:
            out[versi]["catatan_vonis"] = "versi prakiraan dilaporkan terpisah, tidak menentukan lulus"
    out["catatan"] = CATATAN
    print(json.dumps(out, ensure_ascii=False, indent=1))


# ------------------------------------------------------------------ uji
def uji():
    T.kriteria_ok()
    T.tafsir_ok()
    # blok minggu ISO: Senin-Minggu satu blok
    assert blok_minggu("A", dt.date(2026, 11, 2)) == blok_minggu("A", dt.date(2026, 11, 8)) != blok_minggu("A", dt.date(2026, 11, 9))
    # evaluasi: M1 sempurna melawan pembanding acak -> lulus; 30 positif -> belum cukup data; M1 acak -> gagal
    r = random.Random(1)
    unit, unit_sedikit, unit_buruk = [], [], []
    for i in range(1200):
        k, w = f"K{i % 6}", i // 6 // 7
        y = 1 if r.random() < 0.06 else 0
        pb = {"klimatologi_bulanan": r.random() < 0.1, "m0_beku": r.random() < 0.1, "status_situs": None if i % 4 == 0 else r.random() < 0.1}
        unit.append(((k, 2026, w), y, bool(y), pb))
        unit_buruk.append(((k, 2026, w), y, r.random() < 0.5, pb))
        unit_sedikit.append(((k, 2026, w), 1 if i < 30 else 0, i < 30, pb))
    ok = evaluasi(unit, PEMBANDING, 200)
    assert ok["n_positif"] >= 40 and ok["m1"]["pod"] == 1.0 and ok["m1"]["far"] == 0.0, ok["m1"]
    assert ok["selisih_ets_vs_pembanding_terbaik"]["ci95"][0] > 0 and vonis(ok)["vonis"] == "lulus", ok
    # status_situs tak ada di 1/4 hari: M1 dinilai di hari yang sama dengan pembanding itu
    c = ok["pembanding"]["status_situs"]
    assert sum(c["a_b_c_d"]) == 900 and sum(c["m1_di_hari_yang_sama"]["a_b_c_d"]) == 900 and sum(ok["m1"]["a_b_c_d"]) == 1200, c
    assert vonis(evaluasi(unit_sedikit, PEMBANDING, 50))["vonis"] == "belum cukup data"
    # pembanding (c) hilang seluruhnya / hanya 50% / positif <20: belum cukup data dengan alasan; selisih_min menolak bila satu pembanding tak ada
    for isi in (lambda i, p: None, lambda i, p: p if i % 2 else None):
        u = [(b, y, ya, {**pb, "status_situs": isi(i, pb["status_situs"])}) for i, (b, y, ya, pb) in enumerate(unit)]
        v = vonis(evaluasi(u, PEMBANDING, 50))
        assert v["vonis"] == "belum cukup data" and "status_situs" in v["alasan"][0], v
    ada = iter(range(10))      # (c) ada di hari positif hanya 10 kali: cakupan tinggi tetapi positif < 20
    u = [(b, y, ya, {**pb, "status_situs": pb["status_situs"] if not y or next(ada, None) is not None else None}) for b, y, ya, pb in unit]
    v = vonis(evaluasi(u, PEMBANDING, 50))
    assert v["vonis"] == "belum cukup data" and "positif" in v["alasan"][0], v
    assert selisih_min({"m1": [1, 0, 0, 5], "klimatologi_bulanan": [1, 0, 0, 5], "m1|klimatologi_bulanan": [1, 0, 0, 5]}, PEMBANDING) is None
    bu = evaluasi(unit_buruk, PEMBANDING, 200)
    assert vonis(bu)["vonis"] == "gagal" and not vonis(bu)["kriteria"]["far_le_0.60"], vonis(bu)
    assert evaluasi(unit, PEMBANDING, 200) == ok                      # benih tetap = deterministik
    # kontrak data: beku 2026-11-10, dua hari, label dengan n_musim dari acuan 0,05
    kunci = [f"Kota|K{i}" for i in range(20)]
    beku = {"sidik": "s" * 64}
    mk = lambda tgl, mm: {"tanggal": tgl, "dikeluarkan": False, "kec": {k: {"mm": mm, "m1": mm / 3, "m3": mm / 2, "h": 0} for k in kunci}}
    H = {t: mk(t, mm) for t, mm in (("2026-11-10", 5.0), ("2026-11-11", 80.0), ("2026-11-12", 10.0), ("2026-10-30", 9.0))}
    H["2026-11-13"] = {**mk("2026-11-13", 0.0), "dikeluarkan": True}
    lab = lambda tgl, kec, jam, dsda="ok": {"tanggal": tgl, "dibuat": f"{tgl[:8]}{int(tgl[8:]) + 1:02d}T{jam}:00+07:00", "pb": {"kec": kec},
                                         "dsda": {"status": dsda, "kec": {kunci[0]: {"siaga": 3, "n_pos": 1}}}}
    # 11-11: 4 kecamatan laporan 2, 1 kecamatan 12 cm -> proporsi (a) 5% = acuan; n_musim=3 (laporan 2 tak cukup); 11-10 dan 11-12 kosong
    ramai = {kunci[i]: {"n": 2, "maks_cm": 0} for i in range(1, 4)}
    ramai[kunci[4]] = {"n": 1, "maks_cm": 12}
    ramai[kunci[5]] = {"n": 3, "maks_cm": 0}
    L = {"2026-11-10": lab("2026-11-10", {}, "06"), "2026-11-11": lab("2026-11-11", ramai, "06"), "2026-11-12": lab("2026-11-12", {}, "06", "gagal"),
         "2026-10-30": lab("2026-10-30", {}, "06"), "2026-11-13": lab("2026-11-13", {}, "06")}
    awal = dt.date(2026, 11, 10)
    assert hari_nilai(awal, L, H) == ["2026-11-10", "2026-11-11", "2026-11-12"]       # Oktober, dikeluarkan, kosong hujan: tidak
    assert hari_label(awal, L) == ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]    # n_musim: hari dikeluarkan ikut, Oktober tidak
    # hari berlabel tanpa hujan sah (11-14: banyak laporan >= 10 cm) mengubah n_musim, tetapi tidak masuk metrik
    L2 = {**L, "2026-11-14": lab("2026-11-14", {kunci[i]: {"n": 1, "maks_cm": 15} for i in range(10)}, "06")}
    assert hari_nilai(awal, L2, H) == hari_nilai(awal, L, H)
    assert label_positif(hari_label(awal, L2), L2, kunci, 0.05)[1] == {"2026": None}, label_positif(hari_label(awal, L2), L2, kunci, 0.05)[1]
    assert label_positif(hari_nilai(awal, L2, H), L2, kunci, 0.05)[1] == {"2026": 3}
    y, nm, tak = label_positif(hari_nilai(awal, L, H), L, kunci, 0.05)
    
    assert nm == {"2026": 3} and not tak and y[(kunci[5], "2026-11-11")] == 1 and y[(kunci[4], "2026-11-11")] == 1 and y[(kunci[1], "2026-11-11")] == 0, (nm, y)
    assert sum(y.values()) == 2
    # (a) lebih tinggi dari acuan -> tak hingga, hanya (a)
    _, nm2, tak2 = label_positif(hari_nilai(awal, L, H), L, kunci, 0.005)
    assert nm2 == {"2026": None} and tak2 == [2026]
    ds = label_dsda(hari_nilai(awal, L, H), L, kunci)
    assert ds[(kunci[0], "2026-11-10")] == 1 and (kunci[0], "2026-11-12") not in ds and ds[(kunci[1], "2026-11-10")] == 0     # dsda gagal = tak dihitung
    # prediksi sah: sidik beda, sesudah label, prakiraan sesudah 00.00 WIB ditolak
    pk = lambda tgl, versi, dibuat, sidik="s" * 64: {"tanggal": tgl, "versi": versi, "dibuat": dibuat, "sidik": sidik, "kec": {k: {"ya": k == kunci[5]} for k in kunci}}
    prak = [pk("2026-11-10", "teramati", "2026-11-11T05:00:00+07:00"), pk("2026-11-11", "teramati", "2026-11-12T07:00:00+07:00"),     # sesudah label (06.00)
            pk("2026-11-12", "teramati", "2026-11-13T05:00:00+07:00", "x" * 64),
            pk("2026-11-10", "prakiraan", "2026-11-09T23:30:00+07:00"), pk("2026-11-11", "prakiraan", "2026-11-11T00:00:00+07:00")]
    pt, tl = prediksi_sah(prak, "teramati", beku["sidik"], L)
    assert sorted(pt) == ["2026-11-10"] and tl == {"ditulis sesudah label": 1, "sidik berbeda dari beku": 1}, (pt, tl)
    pp, tl = prediksi_sah(prak, "prakiraan", beku["sidik"], L)
    assert sorted(pp) == ["2026-11-10"] and tl == {"ditulis sesudah 00.00 WIB hari itu": 1}, (pp, tl)
    # cap menit sama: prakiraan beberapa detik lebih dulu = sah; sama detik atau sesudah = ditolak
    Ls = {"2026-11-11": {"dibuat": "2026-11-12T06:00:30+07:00"}}
    cap = lambda s: [pk("2026-11-11", "teramati", s)]
    assert sorted(prediksi_sah(cap("2026-11-12T06:00:10+07:00"), "teramati", beku["sidik"], Ls)[0]) == ["2026-11-11"]
    assert prediksi_sah(cap("2026-11-12T06:00:30+07:00"), "teramati", beku["sidik"], Ls)[0] == {}
    assert prediksi_sah(cap("2026-11-12T06:00:45+07:00"), "teramati", beku["sidik"], Ls)[0] == {}
    assert prediksi_sah(cap("2026-11-12T06:01:00+07:00"), "teramati", beku["sidik"], Ls)[0] == {}
    # pembanding: klimatologi sintetis, status situs (kota > kecamatan), M0 palsu
    lap = {(k, f"{th}-12-{d:02d}"): (1, 15) for k in kunci[:1] for th in MUSIM_KLIM for d in range(1, 11)}
    laju, cut = klimatologi(lap, 0.5, kunci)
    assert laju[(kunci[0], 12)] == 10 / 31 and laju[(kunci[1], 12)] == 0 and laju[(kunci[0], 1)] == 0, laju[(kunci[0], 12)]
    assert laju[(kunci[0], 12)] >= cut > 0 and not laju[(kunci[1], 12)] >= cut
    prosp = {"terbit": {"2026-11-10": {"hari": ["2026-11-10", "2026-11-11"], "kab": {"31|Kota": [[2, 0, 5, 0], [0, 0, 0, 0]]}}}}
    assert status_situs(prosp, "2026-11-10", "Kota|K1") is True and status_situs(prosp, "2026-11-10", "Lain|K1") is False
    assert status_situs(prosp, "2026-11-11", "Kota|K1") is None and status_situs(None, "2026-11-10", "Kota|K1") is None
    unit, info, y, hari = susun(awal, beku, prak, L, H, "teramati", 0.05, kunci, lambda k, mm, m1: mm >= 50, (laju, cut), prosp)
    assert len(unit) == 20 and info["hari_berlabel"] == 4 and info["hari_tanpa_prediksi_sah"] == 2 and info["hari_dinilai"] == 1, info
    assert all(u[3]["m0_beku"] is False and u[3]["status_situs"] is True for u in unit) and sum(u[2] for u in unit) == 1
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:] or ["uji"]
    {"uji": uji, "nilai": nilai}.get(a[0], uji)()
