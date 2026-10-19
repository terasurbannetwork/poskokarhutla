"""Uji balik kekeringan "Deteksi Pantau Bencana" -> public/data/kekeringan_ujibalik.json

Dua pertanyaan, dijawab dengan angka apa adanya (termasuk yang buruk):

(a) Aturan status (SPI-3 saja) vs kekeringan yang dikenal: 2015, 2019, 2023. Untuk Jul, Agu, Sep, Okt tiap tahun itu dihitung porsi sel
    (kisi 0,5 derajat, 611 sel) dan porsi kabupaten (>= 30% penduduk, aturan status.py) yang Waspada+ (SPI-3 <= -1), Siaga+ (<= -1,5), Awas
    (<= -2), dibandingkan dengan tahun netral (ONI Jul-Sep dalam -0,5..+0,5, tanpa tahun uji). SPI memakai POWER dan gamma baku 1991-2020 seperti
    spi.py, kecuali bahwa tahun yang sedang diuji DIBUANG dari gamma baku (tinggal-satu-tahun sungguhan, juga untuk tahun netral), jadi rata-rata nasional
    ~16% sel di bawah -1 menurut definisi; yang diuji adalah apakah tahun kering terkenal TERLIHAT menonjol di atas tahun netral.
    Catatan: tingkat Awas penuh di status.py butuh penguat (tanah/SPI-6); di sini hanya tingkat dari SPI-3.

(b) Prospek: hindcast SEAS5 tidak tersedia lewat Open-Meteo, jadi yang diuji model CADANGAN bersyarat fase ENSO (prakiraan.prospek_bersyarat) dengan
    validasi silang tinggal-satu-tahun 1991-2025: prakiraan dibuat akhir Juni (prediktor = ONI Mar-Mei, yang terbit paling akhir pada saat itu)
    untuk SPI-3 Agu-Okt (jendela berakhir Oktober). Kejadian = SPI-3 <= -1. Skor:
      Brier        rerata (p - o)^2 atas semua pasangan sel-tahun; BSS = 1 - Brier / Brier klimatologi (frekuensi tahun lain di sel yang sama)
      Cakupan      kejadian yang didahului alarm / semua kejadian (alarm = prakiraan >= 30%)
      Alarm palsu  alarm yang tak diikuti kejadian / semua alarm
    Sel bertetangga berkorelasi, jadi sampel efektif ~35 tahun, bukan 611 x 35. Ini model cadangan; SEAS5 sendiri belum teruji di sini.

(c) Kejadian nyata: DIBI BNPB (public/banjir/data/kejadian.json, jenis `kering`, ~288 kejadian bertanggal Okt 2023 - 2026). Satuan = kabupaten-bulan; teramati =
    >= 1 kejadian kering DIBI di kabupaten itu pada bulan itu; alarm = tingkat kabupaten dari SPI-3 yang berakhir bulan itu (aturan status.py: >= 30% penduduk).
    Ambang TIDAK disetel pada kejadian ini (-1 dan -1,5 ditetapkan di muka dari definisi SPI), jadi tiap periode adalah uji di luar sampel; periode dibagi tiga
    (Okt 2023-Des 2024, 2025, 2026) supaya terlihat stabil atau tidak. Hanya bagian SPI-3 yang diuji: persentil tanah dan HTH tidak punya riwayat harian di repo.
    Batasan: DIBI mencatat laporan BPBD, bukan semua kekeringan, jadi FAR dari sini batas atas (kabupaten kering tanpa laporan terhitung alarm palsu), dan DIBI 2026
    mungkin belum lengkap. Pembanding: alarm acak dengan laju alarm dan laju kejadian yang sama.
    Label "hipotesis" baru boleh lepas bila KRITERIA_LAYAK terpenuhi di KETIGA periode (ditetapkan sebelum angka dilihat); alasannya ditulis di `kejadian.vonis`.

Pakai:  python3 scripts/kekeringan/ujibalik.py      |  python3 scripts/kekeringan/ujibalik.py uji
"""
import datetime as dt, json, os, statistics, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan
import hth as H
import prakiraan as P
import spi as SPI

TAHUN_UJI = (2015, 2019, 2023)
BULAN = (7, 8, 9, 10)
TAHUN = range(1991, 2026)
AMBANG_ALARM = .30
UMUR_MAKS_HARI = 30
LAJU_DEFINISI = 15.9   # Phi(-1): porsi sel yang SPI-nya <= -1 menurut definisi
MUSIM_ONI_AKHIR_JUNI = "MAM"
MUSIM_ONI_PUNCAK = "JAS"


def spi3_sel(pow_sel, bulan=BULAN, tahun=TAHUN):
    """{sel: {bulan: {tahun: SPI-3 berakhir bulan itu}}}. Gamma baku 1991-2020 TANPA tahun yang dihitung (tinggal-satu-tahun sungguhan);
    tahun di luar 1991-2020 memakai baku penuh."""
    out = {}
    for k, pow_ in pow_sel.items():
        d = {}
        for m in bulan:
            baku = {t: SPI.jumlah(pow_, t, m, 3) for t in range(SPI.DASAR[0], SPI.DASAR[1] + 1)}
            penuh = P.fit_gamma([v for v in baku.values() if v is not None])
            d[m] = {}
            for y in tahun:
                x = SPI.jumlah(pow_, y, m, 3)
                f = P.fit_gamma([v for t, v in baku.items() if t != y and v is not None]) if y in baku else penuh
                d[m][y] = None if x is None or f is None else P.spi_dari_fit(x, f)
        out[k] = d
    return out


def porsi_sel(spi, tahun, bulan):
    v = [d[bulan][tahun] for d in spi.values() if d[bulan][tahun] is not None]
    if not v:
        return None
    return [round(100 * sum(1 for x in v if x <= th) / len(v), 1) for th in (-1.0, -1.5, -2.0)]


def porsi_kab(spi, tahun, bulan, peta):
    """Porsi kabupaten yang tingkat SPI-nya (>= 30% penduduk) mencapai Waspada, Siaga, Awas."""
    per = {}
    for prov, kab, jiwa, k in peta:
        d = spi.get(k)
        s = d[bulan][tahun] if d else None
        lv = H._st.lv_spi(s)
        if lv is None:
            continue
        w = per.setdefault(kab, [[0, 0, 0, 0], 0])
        w[0][lv] += jiwa
        w[1] += jiwa
    if not per:
        return None
    lvs = [H._st.lv_wilayah(w[0], w[1]) for w in per.values()]
    return [round(100 * sum(1 for l in lvs if l >= i) / len(lvs), 1) for i in (1, 2, 3)]


def aturan(spi, oni, peta):
    netral = [y for y in TAHUN if y not in TAHUN_UJI and (o := oni.get((MUSIM_ONI_PUNCAK, y))) is not None and abs(o) < .5]
    out = {"tahun": {}, "netral": {"tahun": netral, "bulan": {}}}
    for y in TAHUN_UJI:
        out["tahun"][str(y)] = {"oni_jas": oni.get((MUSIM_ONI_PUNCAK, y)),
                                "bulan": {f"{m:02d}": {"sel": porsi_sel(spi, y, m), "kab": porsi_kab(spi, y, m, peta)} for m in BULAN}}
    for m in BULAN:
        s = [porsi_sel(spi, y, m) for y in netral]
        s = [x for x in s if x]
        kb = [porsi_kab(spi, y, m, peta) for y in netral]
        kb = [x for x in kb if x]
        ring = lambda a, i: {"rerata": round(statistics.mean(x[i] for x in a), 1), "min": min(x[i] for x in a), "maks": max(x[i] for x in a)} if a else None
        out["netral"]["bulan"][f"{m:02d}"] = {"sel_waspada": ring(s, 0), "sel_siaga": ring(s, 1), "sel_awas": ring(s, 2),
                                              "kab_waspada": ring(kb, 0), "kab_siaga": ring(kb, 1), "kab_awas": ring(kb, 2)}
    out["temuan"] = temuan(out)
    return out


def temuan(ar):
    """Kalimat temuan dari angka aturan(): tahun uji dikatakan menonjol hanya bila puncak porsi sel Waspada+ (Jul-Okt) melebihi puncak tahun netral mana pun."""
    f = lambda x: f"{x:.1f}".replace(".", ",")
    puncak = {y: max(((v["sel"][0], m) for m, v in d["bulan"].items() if v["sel"]), default=(None, None)) for y, d in ar["tahun"].items()}
    nm = [(b["sel_waspada"]["maks"], m) for m, b in ar["netral"]["bulan"].items() if b["sel_waspada"]]
    nmaks, nbln = max(nm) if nm else (None, None)
    nama_bln = {"07": "Jul", "08": "Agu", "09": "Sep", "10": "Okt"}
    menonjol = [y for y, (v, _) in puncak.items() if v is not None and nmaks is not None and v > nmaks]
    lain = [f"{y} ({f(puncak[y][0])}% pada {nama_bln[puncak[y][1]]})" for y in puncak if y not in menonjol and puncak[y][0] is not None]
    t = [f"Hanya {' dan '.join(menonjol)} menonjol" if menonjol else "Tidak ada tahun uji yang menonjol"]
    if lain:
        di_bawah = all(puncak[y.split()[0]][0] < LAJU_DEFINISI for y in lain)
        t.append(f"{' dan '.join(lain)} {'di bawah laju definisi sekitar 16% pada puncaknya' if di_bawah else 'tidak melebihi tahun netral'}")
    if nmaks is not None:
        t.append(f"tahun netral mencapai maksimum {f(nmaks)}% pada {nama_bln[nbln]}")
    return {"menonjol": menonjol, "puncak": {y: {"pct": v, "bulan": m} for y, (v, m) in puncak.items()}, "netral_maks": {"pct": nmaks, "bulan": nbln},
            "laju_definisi_pct": LAJU_DEFINISI, "kalimat": "; ".join(t) + "."}


VERSI = 2   # 2 = ada uji kejadian DIBI; berkas versi lama dihitung ulang walau masih segar
KRITERIA_LAYAK = {"pod_min": .5, "far_maks": .8, "csi_lipat_acak": 2.0}   # ditetapkan sebelum angka dilihat; harus lolos di tiap periode
PERIODE = (("2023-10", "2024-12"), ("2025-01", "2025-12"), ("2026-01", "2026-12"))
JENIS = "kering"


def norm_kab(n):
    return "".join(c for c in n.lower().replace("kabupaten", "").replace("kab.", "") if c.isalpha())


def kejadian_per_kab(kej, kab_peta):
    """kej = kejadian.json -> ({('prov|kab', 'YYYY-MM'): n}, cocok, total). Nama kab DIBI dicocokkan ke kunci penduduk.json (prov + nama tanpa 'Kabupaten'); 'Kota X' beda dengan 'X'."""
    idx = {}
    for k in kab_peta:
        idx[(k.split("|")[0], norm_kab(k.split("|")[1]))] = k
    n, cocok, tot = {}, 0, 0
    for e in kej.get("kejadian_dibi", []):
        if e.get("jenis") != JENIS:
            continue
        tot += 1
        k = idx.get((e["prov"], norm_kab(e["kab"])))
        if k:
            cocok += 1
            n[(k, e["tanggal"][:7])] = n.get((k, e["tanggal"][:7]), 0) + 1
    return n, cocok, tot


def tingkat_kab(spi, tahun, bulan, peta):
    """{'prov|kab': tingkat 0..3 dari SPI-3} untuk kabupaten yang punya nilai SPI (aturan >= 30% penduduk, sama dengan status.py)."""
    per = {}
    for prov, kab, jiwa, k in peta:
        d = spi.get(k)
        s = d[bulan][tahun] if d and bulan in d and tahun in d[bulan] else None
        lv = H._st.lv_spi(s)
        if lv is None:
            continue
        w = per.setdefault(kab, [[0, 0, 0, 0], 0])
        w[0][lv] += jiwa
        w[1] += jiwa
    return {kab: H._st.lv_wilayah(w[0], w[1]) for kab, w in per.items()}


def skor_kontingensi(h, m, f, n):
    """h tepat, m terlewat, f alarm palsu, n tak-ada -> POD, FAR, CSI, dan CSI acak (alarm acak dengan laju alarm & laju kejadian sama)."""
    tot = h + m + f + n
    a, o = (h + f) / tot if tot else 0, (h + m) / tot if tot else 0
    csi_acak = a * o / (a + o - a * o) if a + o - a * o > 0 else None
    return {"n": tot, "tepat": h, "terlewat": m, "palsu": f, "tak_ada": n, "kejadian_pct": round(100 * o, 1), "alarm_pct": round(100 * a, 1),
            "pod": round(h / (h + m), 3) if h + m else None, "far": round(f / (h + f), 3) if h + f else None,
            "csi": round(h / (h + m + f), 3) if h + m + f else None, "csi_acak": round(csi_acak, 3) if csi_acak is not None else None}


def bulan_dalam(ym, a, b):
    return a <= ym <= b


def uji_kejadian(spi, kej, peta, bulan_akhir):
    """Uji aturan SPI-3 vs DIBI per kabupaten-bulan. bulan_akhir 'YYYY-MM' = SPI terakhir tersedia. Mengembalikan blok `kejadian` (angka apa adanya)."""
    kab_peta = {kab for _, kab, _, _ in peta}
    obs, cocok, tot = kejadian_per_kab(kej, kab_peta)
    awal = PERIODE[0][0]
    bulan = []
    y, m = int(awal[:4]), int(awal[5:])
    while f"{y}-{m:02d}" <= bulan_akhir:
        bulan.append((y, m))
        y, m = (y, m + 1) if m < 12 else (y + 1, 1)
    out = {"periode_data": [awal, bulan_akhir], "dibi_total": tot, "dibi_cocok": cocok, "dibi_dalam_periode": sum(n for (k, ym), n in obs.items() if awal <= ym <= bulan_akhir),
           "kab": len(kab_peta), "ambang": {"waspada": "SPI-3 <= -1", "siaga": "SPI-3 <= -1,5"}, "kriteria_layak": KRITERIA_LAYAK, "aturan": {}}
    tk = {(y, m): tingkat_kab(spi, y, m, peta) for y, m in bulan}
    for nama, lv_min in (("waspada", 1), ("siaga", 2)):
        per = {}
        for lab, (a, b) in (("semua", (awal, bulan_akhir)),) + tuple((f"{a}..{min(b, bulan_akhir)}", (a, min(b, bulan_akhir))) for a, b in PERIODE if a <= bulan_akhir):
            h = mm = f = n = 0
            for (y, m), lv in tk.items():
                ym = f"{y}-{m:02d}"
                if not bulan_dalam(ym, a, b):
                    continue
                for kab, v in lv.items():
                    o, alarm = (kab, ym) in obs, v >= lv_min
                    h, mm, f, n = h + (o and alarm), mm + (o and not alarm), f + (alarm and not o), n + (not o and not alarm)
            per[lab] = skor_kontingensi(h, mm, f, n)
        out["aturan"][nama] = per
    out["vonis"] = vonis(out["aturan"]["waspada"])
    return out


def vonis(per):
    """Lepas 'hipotesis' hanya bila KRITERIA_LAYAK lolos di tiap periode; kalimat berisi angka terburuknya."""
    ps = [v for k, v in per.items() if k != "semua"]
    k = KRITERIA_LAYAK
    f = lambda x: f"{x:.2f}".replace(".", ",")
    gagal = []
    for lab, v in per.items():
        if lab == "semua":
            continue
        if v["pod"] is None or v["pod"] < k["pod_min"]:
            gagal.append(f"{lab}: POD {f(v['pod']) if v['pod'] is not None else 'tak ada kejadian'} < {f(k['pod_min'])}")
        if v["far"] is None or v["far"] > k["far_maks"]:
            gagal.append(f"{lab}: FAR {f(v['far']) if v['far'] is not None else 'tak ada alarm'} > {f(k['far_maks'])}")
        if v["csi"] is None or v["csi_acak"] is None or v["csi"] < k["csi_lipat_acak"] * v["csi_acak"]:
            gagal.append(f"{lab}: CSI {f(v['csi']) if v['csi'] is not None else 'tak ada'} kurang dari {f(k['csi_lipat_acak'])}x alarm acak ({f(v['csi_acak']) if v['csi_acak'] is not None else 'tak ada'})")
    layak = bool(ps) and not gagal
    return {"layak": layak, "hipotesis": not layak,
            "alasan": ("Lolos kriteria di semua periode." if layak else "Belum layak: " + "; ".join(gagal) + ".")}


def skor(pasangan):
    """pasangan [(p, o, p_klim)] -> dict Brier, Brier klimatologi, BSS, tangkapan, alarm palsu; None bila kosong."""
    if not pasangan:
        return None
    n = len(pasangan)
    bs = sum((p - o) ** 2 for p, o, _ in pasangan) / n
    bk = sum((c - o) ** 2 for _, o, c in pasangan) / n
    kej = sum(o for _, o, _ in pasangan)
    alarm = [(p, o) for p, o, _ in pasangan if p >= AMBANG_ALARM]
    tangkap = sum(o for _, o in alarm)
    return {"n": n, "kejadian_pct": round(100 * kej / n, 1), "p_rerata_pct": round(100 * sum(p for p, _, _ in pasangan) / n, 1), "brier": round(bs, 4), "brier_klim": round(bk, 4),
            "bss": round(1 - bs / bk, 3) if bk > 0 else None, "alarm_n": len(alarm),
            "tangkapan_pct": round(100 * tangkap / kej, 1) if kej else None, "alarm_palsu_pct": round(100 * (len(alarm) - tangkap) / len(alarm), 1) if alarm else None}


def prospek(spi, oni, pow_sel):
    """LOO 1991-2025: prakiraan akhir Juni (ONI MAM) untuk SPI-3 berakhir Oktober, kejadian <= -1."""
    fase_th = {y: P.fase(oni.get((MUSIM_ONI_AKHIR_JUNI, y))) for y in TAHUN}
    per_th = {y: [] for y in TAHUN}
    per_fase = {}
    for k, d in spi.items():
        nilai = d[10]
        for y in TAHUN:
            if nilai[y] is None:
                continue
            r = P.prospek_bersyarat(nilai, fase_th, y)
            if r is None:
                continue
            tri = (r[0][0], 1 if nilai[y] <= -1 else 0, r[1][0])
            per_th[y].append(tri)
            per_fase.setdefault(fase_th[y], []).append(tri)
    semua = [t for v in per_th.values() for t in v]
    # per tahun dengan klimatologi yang sama; rerata BSS antar-tahun menghindari 611 sel yang berkorelasi mendominasi
    bss_map = {y: s["bss"] for y, s in ((y, skor(v)) for y, v in per_th.items()) if s and s["bss"] is not None}
    bss_th = list(bss_map.values())
    return {"model": "bersyarat fase ENSO (ONI Mar-Mei), tinggal-satu-tahun, hindcast SEAS5 tidak tersedia", "bulan_target": "SPI-3 Agu-Okt (berakhir Okt)",
            "ambang_alarm_pct": int(100 * AMBANG_ALARM), "kejadian": "SPI-3 <= -1", "semua": skor(semua),
            "bss_rerata_tahun": round(statistics.mean(bss_th), 3) if bss_th else None, "tahun_bss_positif": sum(1 for b in bss_th if b > 0), "n_tahun": len(bss_th), "bss_per_tahun": {str(y): b for y, b in sorted(bss_map.items())},
            "per_tahun": {str(y): {"oni_mam": oni.get((MUSIM_ONI_AKHIR_JUNI, y)), "fase": fase_th[y], **(skor(per_th[y]) or {})} for y in TAHUN_UJI},
            "per_fase": {f: skor(v) for f, v in sorted(per_fase.items(), key=lambda x: str(x[0]))}}


def bangun(pow_sel, oni, penduduk, pusat, sekarang, kej=None):
    if len(pow_sel) < 3:
        raise ValueError(f"uji balik butuh seri POWER banyak sel, ada {len(pow_sel)}")
    if len({y for (_, y) in oni}) < 25:
        raise ValueError("ONI kurang dari 25 tahun; uji bersyarat fase tak bermakna")
    spi = spi3_sel(pow_sel)
    peta = H.peta_kec(penduduk, pusat, pow_sel)
    kejadian = None
    if kej and any(e.get("jenis") == JENIS for e in kej.get("kejadian_dibi", [])):
        ym = SPI.bulan_terakhir(pow_sel)
        spi_k = spi3_sel(pow_sel, range(1, 13), range(2023, ym[0] + 1))
        kejadian = uji_kejadian(spi_k, kej, peta, f"{ym[0]}-{ym[1]:02d}")
    isi = {"dibuat": sekarang.isoformat(timespec="minutes"), "lengkap": True, "versi": VERSI, "label": "Deteksi Pantau Bencana", "loo": True, "sel": len(pow_sel),
            "periode": [TAHUN[0], TAHUN[-1]], "klimatologi": list(SPI.DASAR),
            "catatan": "Angka apa adanya. SPI dihitung dengan tahun yang diuji dibuang dari gamma baku (tinggal-satu-tahun). Bagian aturan menguji SPI-3 terhadap tahun kering yang dikenal; "
                       "bagian prospek menguji model cadangan bersyarat ENSO, bukan SEAS5 (hindcast tidak tersedia). Sel bertetangga berkorelasi, sampel efektif ~35 tahun.",
            "aturan": aturan(spi, oni, peta), "prospek": prospek(spi, oni, pow_sel)}
    if kejadian:
        isi["kejadian"] = kejadian
        isi["bnpb"] = {"ada": True, "sumber": "DIBI BNPB (kejadian.json, jenis kering)", "alasan": "pencocokan kejadian dilakukan per kabupaten-bulan, lihat `kejadian`"}
    else:
        isi["bnpb"] = {"ada": False, "alasan": "kejadian kering DIBI tidak ada di kejadian.json; pencocokan kejadian tidak dilakukan"}
    return isi


def main():
    import prakiraan as PK
    t0 = time.time()
    sekarang = dt.datetime.now(H.WIB)
    jalur_out = os.path.join(H.DIR_DATA, "kekeringan_ujibalik.json")
    ada = baca(jalur_out)
    if H.lewati(ada, sekarang, UMUR_MAKS_HARI) and ada.get("versi") == VERSI:
        print(f"ujibalik: kekeringan_ujibalik.json berumur {H.umur_hari(ada, sekarang):.0f} hari (< {UMUR_MAKS_HARI}); dilewati", file=sys.stderr)
        return
    r = lambda f: json.load(open(os.path.join(H.DIR_DATA, f)))
    tanah, penduduk, iklim = r("tanah.json"), r("penduduk.json"), r("iklim.json")
    pusat = json.load(open(os.path.join(H.AKAR, "public/banjir/data/pusat_kec.json")))
    pow_sel = SPI.hujan_bulanan([(g["lat"], g["lon"]) for g in tanah["grid"]], dt.datetime.now(H.WIB).date())
    kej = baca(os.path.join(H.AKAR, "public/banjir/data/kejadian.json"))
    isi = bangun(pow_sel, PK.muat_oni(iklim), penduduk, pusat, dt.datetime.now(H.WIB), kej)
    simpan(jalur_out, isi)
    s = isi["prospek"]["semua"]
    k = (isi.get("kejadian") or {}).get("aturan", {}).get("waspada", {}).get("semua") or {}
    print(f"ujibalik: kejadian DIBI Waspada+: POD {k.get('pod')} FAR {k.get('far')} CSI {k.get('csi')} (acak {k.get('csi_acak')}); {(isi.get('kejadian') or {}).get('vonis')}", file=sys.stderr)
    print(f"ujibalik: {isi['sel']} sel; prospek BSS {s['bss']}, tangkapan {s['tangkapan_pct']}%, alarm palsu {s['alarm_palsu_pct']}%; {time.time() - t0:.0f} dtk", file=sys.stderr)


def uji():
    # skor: prakiraan sempurna -> Brier 0, BSS 1; prakiraan = klimatologi -> BSS 0; semua alarm -> tangkapan 100%, alarm palsu = 1 - frekuensi
    sempurna = [(1.0, 1, .5), (0.0, 0, .5)] * 5
    s = skor(sempurna)
    assert s["brier"] == 0 and s["bss"] == 1 and s["tangkapan_pct"] == 100 and s["alarm_palsu_pct"] == 0
    s = skor([(.5, 1, .5), (.5, 0, .5)] * 5)
    assert s["bss"] == 0 and s["alarm_n"] == 10 and s["tangkapan_pct"] == 100 and s["alarm_palsu_pct"] == 50
    s = skor([(0.1, 1, .5), (0.1, 0, .5)])
    assert s["tangkapan_pct"] == 0 and s["alarm_palsu_pct"] is None and s["bss"] < 0       # skor buruk dilaporkan negatif, tidak disembunyikan
    assert skor([]) is None
    # data sintetis: 3 sel; 2015 kering di semua sel (Jul-Okt), tahun lain normal; ONI MAM 2015 El Nino
    def seri(y_kering):
        d = {}
        for y in range(1991, 2027):
            for m in range(1, 13):
                if (y, m) <= (2026, 8):
                    d[f"{y}{m:02d}"] = (6.0 + (y * 7 + m * 3) % 5 * .3) * (0.05 if (y in y_kering and 5 <= m <= 10) else 1.0)
        return d
    pw = {"0.25,0.25": seri({2015}), "0.25,1.25": seri({2015}), "0.25,2.25": seri({2015})}
    oni = {(m, y): 0.1 for y in range(1991, 2027) for m in ("MAM", "JAS")}
    oni[("MAM", 2015)] = oni[("JAS", 2015)] = 1.5
    oni[("MAM", 1997)] = oni[("JAS", 1997)] = 1.5
    pend = {"kec": {"11|Alfa|b": 3000, "11|Zeta|a": 1000}}
    pusat = {"11|Alfa|b": [.3, .3], "11|Zeta|a": [.3, 1.2]}
    isi = bangun(pw, oni, pend, pusat, dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB))
    a15 = isi["aturan"]["tahun"]["2015"]["bulan"]["10"]
    assert a15["sel"][0] == 100.0 and a15["kab"][0] == 100.0 and 2015 not in isi["aturan"]["netral"]["tahun"]
    assert isi["aturan"]["netral"]["bulan"]["10"]["sel_waspada"]["rerata"] < 20
    p = isi["prospek"]
    assert p["per_tahun"]["2015"]["fase"] == "el_nino" and p["per_tahun"]["2015"]["kejadian_pct"] == 100.0
    # 2015 dan 1997 sama-sama El Nino; tahun diuji tidak ikut menghitung dirinya, jadi p 2015 = (1 kejadian 1997? tidak: 1997 normal) -> hanya soal skala
    assert 0 <= p["per_tahun"]["2015"]["p_rerata_pct"] <= 100 and p["semua"]["n"] > 100 and set(p["per_fase"]) == {"el_nino", "netral"}
    assert len(json.dumps(isi)) < 80_000
    for jelek in (lambda: bangun({"a": pw["0.25,0.25"]}, oni, pend, pusat, dt.datetime.now()), lambda: bangun(pw, {("MAM", 2000): 0}, pend, pusat, dt.datetime.now())):
        try:
            jelek()
            raise SystemExit("bangun harus menolak masukan kurang")
        except ValueError:
            pass
    # LOO sungguhan: tahun yang dihitung tidak ikut gamma baku. Seri datar kecuali 2015 sangat kering: tanpa LOO fit menyerap 2015 dan SPI-nya lebih lunak
    sd = {f"{y}{m:02d}": (1.0 if (y, m) == (2015, 0) else 3.0 + ((y * 37 + m * 11) % 17) / 17 * 8) for y in range(1991, 2027) for m in range(1, 13) if (y, m) <= (2026, 8)}
    for m in (8, 9, 10):
        sd[f"2015{m:02d}"] = 2.0
    spi_loo = spi3_sel({"a": sd})["a"][10][2015]
    f_penuh = P.fit_gamma([SPI.jumlah(sd, t, 10, 3) for t in range(1991, 2021)])
    assert spi_loo < P.spi_dari_fit(SPI.jumlah(sd, 2015, 10, 3), f_penuh) - 0.05, spi_loo
    t = isi["aturan"]["temuan"]
    assert t["menonjol"] == ["2015"] and t["kalimat"].startswith("Hanya 2015 menonjol") and "di bawah laju definisi" in t["kalimat"] and "menangkap" not in t["kalimat"]
    assert set(p["bss_per_tahun"]) <= {str(y) for y in TAHUN} and p["tahun_bss_positif"] <= p["n_tahun"]
    # penjaga umur: 29 hari dilewati, 31 hari mencoba lagi
    now = dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB)
    assert H.lewati({"dibuat": "2026-09-19T07:00+07:00", "lengkap": True}, now, UMUR_MAKS_HARI) and not H.lewati({"dibuat": "2026-09-17T07:00+07:00", "lengkap": True}, now, UMUR_MAKS_HARI)
    assert isi["lengkap"] is True and isi["bnpb"]["ada"] is False                      # tanpa kej: tak ada pencocokan, dilaporkan terus terang
    # kejadian nyata: kategori kontingensi, nama kab dicocokkan, bulan di luar SPI diabaikan, hipotesis tetap bila kurang
    assert skor_kontingensi(5, 5, 5, 85) == {"n": 100, "tepat": 5, "terlewat": 5, "palsu": 5, "tak_ada": 85, "kejadian_pct": 10.0, "alarm_pct": 10.0, "pod": .5, "far": .5, "csi": .333, "csi_acak": .053}
    assert skor_kontingensi(0, 0, 0, 10)["pod"] is None and norm_kab("Kabupaten Alfa") == norm_kab("ALFA") != norm_kab("Kota Alfa")
    kej = {"kejadian_dibi": [{"tanggal": "2026-08-03", "jenis": "kering", "prov": "11", "kab": "Kabupaten Alfa"}, {"tanggal": "2026-08-09", "jenis": "kering", "prov": "11", "kab": "Alfa"},
                             {"tanggal": "2026-10-09", "jenis": "kering", "prov": "11", "kab": "Alfa"}, {"tanggal": "2026-08-03", "jenis": "banjir", "prov": "11", "kab": "Alfa"},
                             {"tanggal": "2026-08-03", "jenis": "kering", "prov": "11", "kab": "Tak Ada"}]}
    k = bangun(pw, oni, pend, pusat, dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB), kej)["kejadian"]
    assert k["dibi_total"] == 4 and k["dibi_cocok"] == 3 and k["dibi_dalam_periode"] == 2 and k["periode_data"] == ["2023-10", "2026-08"]
    w = k["aturan"]["waspada"]["semua"]
    assert w["terlewat"] == 1 and w["tepat"] == 0 and w["pod"] == 0 and w["n"] == w["tepat"] + w["terlewat"] + w["palsu"] + w["tak_ada"] == 70 and k["vonis"]["hipotesis"] is True and "Belum layak" in k["vonis"]["alasan"]
    assert list(k["aturan"]["waspada"]) == ["semua", "2023-10..2024-12", "2025-01..2025-12", "2026-01..2026-08"]
    assert vonis({"semua": {}, "a": {"pod": .9, "far": .3, "csi": .6, "csi_acak": .1}})["layak"] is True and vonis({"semua": {}, "a": {"pod": .9, "far": .9, "csi": .6, "csi_acak": .1}})["layak"] is False
    print("ok ujibalik")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
