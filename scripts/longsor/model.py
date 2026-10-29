"""Nowcast longsor gaya LHASA (#20): kerentanan statis x pemicu hujan 7 hari di atas P95 sel. Stdlib saja.

Subperintah:
  kerentanan   tanah.json + data/raw/longsor/fitur_statis.json + hujan.json riwayat -> public/longsor/data/kerentanan.json
               (S per kecamatan + P95 hujan 7 hari per sel 0,5 derajat dari SELURUH riwayat 2017-sekarang)
  uji          uji balik -> public/longsor/data/uji_balik.json (LOLOS/GAGAL, lihat uji_balik())
  harian       nowcast hari ini dari public/banjir/data/hujan.json (a7) -> public/longsor/data/nowcast.json (berkas bergulir tetap)
  diri         self-check tanpa jaringan

Model, jujur: SASARAN = ada kejadian longsor DIBI di kabupaten pada hari itu. FITUR = rumus.py (lereng DEM, CN tanah, jarak sesar,
tanpa tutupan lahan) dan hujan 7 hari. TIDAK ADA parameter yang dilatih pada label; bobot dan ambang tetap (rumus.py), satu-satunya
yang 'dilatih' adalah P95 hujan (dari hujan saja, tahun latih 2017-2021, tanpa label). UJI = 2022-2025 tanpa 2024 (DIBI 2024 tidak
lengkap). PEMBANDING = hujan-saja (t), kerentanan-saja (S), klimatologi (frekuensi kejadian kabupaten x bulan pada tahun latih).
"""
import datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, MENTAH, WIB, baca, daftar_kec, kunci_sel, sel_hujan, simpan
import rumus

MULAI = dt.date(2017, 1, 1)
LATIH = (dt.date(2017, 1, 1), dt.date(2021, 12, 31))
UJI_TAHUN = (2022, 2023, 2025)
CN_BAWAAN = 69          # HSG B bila SoilGrids tak ada
RIWAYAT_HARI = 30       # panjang riwayat ringkas di nowcast.json


def harian_sel():
    """data/raw/longsor/hujan.json -> (tanggal_awal, {kunci_sel: [mm*10 per hari]})."""
    d = json.load(open(os.path.join(MENTAH, "hujan.json")))
    return dt.date.fromisoformat(d["mulai"]), d["sel"]


def p95_sel(sel, awal, dari, sampai):
    """{kunci: P95 hujan 7 hari (mm) di tahun [dari, sampai]}, hujan 7 hari tak lengkap dibuang."""
    i0, i1 = (dari - awal).days, (sampai - awal).days
    out = {}
    for k, h in sel.items():
        r7 = [x for x in rumus.jumlah7(h)[i0:i1 + 1] if x is not None]
        if len(r7) > 300:
            out[k] = rumus.persentil(r7, 95) / 10
    return out


def bangun_kerentanan():
    kecs = daftar_kec()
    tanah = json.load(open(os.path.join(KELUAR, "tanah.json")))
    cn_ = dict(zip(tanah["kec"], tanah["k"]))
    f = json.load(open(os.path.join(MENTAH, "fitur_statis.json")))
    fi = {k: i for i, k in enumerate(f["kec"])}
    pv = baca(os.path.join(KELUAR, "pvmbg.json"))
    pz = dict(zip(pv["kec"], (r[2] for r in pv["k"]))) if pv else {}
    awal, sel = harian_sel()
    ambang = p95_sel(sel, awal, MULAI, dt.date.fromisoformat(json.load(open(os.path.join(MENTAH, "hujan.json")))["sampai"]))
    baris = []
    for k in kecs:
        i = fi[k["id"]]
        t = cn_.get(k["id"])
        cn = t[3] if t else CN_BAWAAN
        S = rumus.kerentanan(f["lereng_p75"][i], cn, f["sesar_km"][i])
        z = pz.get(k["id"])
        spv = rumus.kerentanan_pv(f["lereng_p75"][i], z, f["sesar_km"][i]) if z is not None else S
        baris.append([k["lat"], k["lon"], f["lereng_p75"][i], f["sesar_km"][i], cn, round(S, 3), z, round(spv, 3)])
    simpan(os.path.join(KELUAR, "kerentanan.json"), {
        "dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%d"),
        "rumus": "S = 0,6 skor_lereng(p75 lereng DEM z10; 5-30 derajat, smoothstep) + 0,2 skor_tanah(CN; 49-84) + 0,2 skor_sesar(1 - km/50). "
                 "Tutupan lahan belum ada (bobot 0). Bobot tetap, tidak dilatih pada label. "
                 "S_pv (v2) = 0,5 skor_lereng + 0,3 zona PVMBG (pvmbg.json) + 0,2 skor_sesar; bila zona null (di luar cakupan layanan) S_pv = S.",
        "atribusi": "DEM Terrarium (AWS Open Data); sesar GEM Global Active Faults (CC BY-SA 4.0); SoilGrids 2.0 (CC BY 4.0, ISRIC); hujan ERA5 via Open-Meteo Archive (CC BY 4.0).",
        "kolom": ["lat", "lon", "lereng_p75", "sesar_km", "cn", "S", "pv_zona", "S_pv"], "kec": [k["id"] for k in kecs], "k": baris,
        "sel_deg": 0.5, "ambang_p95_mm": {k: v for k, v in sorted(ambang.items())},
        "ambang_dasar": f"P95 hujan 7 hari ERA5 {MULAI.isoformat()}..{json.load(open(os.path.join(MENTAH, 'hujan.json')))['sampai']}"})
    print(f"kerentanan: {len(kecs)} kec, {len(ambang)} sel beramang", file=sys.stderr)


# ---------------------------------------------------------------- uji balik

def kelas_hari(S, t):
    return rumus.bahaya(S, t)


def klimatologi(dibi, kab_idx, bulan_hari, latih):
    """Peluang kejadian per hari untuk (kabupaten, bulan) dari tahun latih: hari-ada-kejadian / hari kalender."""
    ada = {}
    for tgl, k, n, g in dibi:
        d = dt.date.fromisoformat(tgl)
        if g == 0 and latih[0] <= d <= latih[1]:
            ada.setdefault((k, d.month), set()).add(tgl)
    return {key: len(v) / bulan_hari[key[1]] for key, v in ada.items()}


def uji_balik(kej=None, kecs=None, kerent=None, hujan=None, varian="v1", hanya_pv=False):
    kej = kej or json.load(open(os.path.join(KELUAR, "kejadian.json")))
    kecs = kecs or daftar_kec()
    kerent = kerent or json.load(open(os.path.join(KELUAR, "kerentanan.json")))
    awal, sel = hujan or harian_sel()
    akhir = awal + dt.timedelta(days=len(next(iter(sel.values()))) - 1)
    p95 = p95_sel(sel, awal, *LATIH)
    r7 = {k: rumus.jumlah7(h) for k, h in sel.items() if k in p95}
    S = dict(zip(kerent["kec"], (r[5] for r in kerent["k"])))
    PV = dict(zip(kerent["kec"], ((r[6] if len(r) > 6 else None) for r in kerent["k"])))
    S2 = dict(zip(kerent["kec"], ((r[7] if len(r) > 7 else r[5]) for r in kerent["k"])))
    pakai = S2 if varian == "v2" else S
    kab_kec = {}                                   # kab -> [(S dipakai, kunci sel, S v1, zona PVMBG atau None)]
    for k in kecs:
        c = kunci_sel(*sel_hujan(k["lat"], k["lon"]))
        if c in r7 and k["id"] in S:
            kab_kec.setdefault(f'{k["prov"]}|{k["kab"]}', []).append((pakai[k["id"]], c, S[k["id"]], PV[k["id"]]))
    if hanya_pv:   # subset adil: kabupaten dengan >= 1 kecamatan tercakup layanan PVMBG
        kab_kec = {kb: v for kb, v in kab_kec.items() if any(x[3] is not None for x in v)}
    kab_i = {n: i for i, n in enumerate(kej["kab"])}
    pos ={(r[1], r[0]) for r in kej["dibi"] if r[3] == 0}
    bulan_hari = {m: 0 for m in range(1, 13)}
    d = LATIH[0]
    while d <= LATIH[1]:
        bulan_hari[d.month] += 1
        d += dt.timedelta(days=1)
    clim = klimatologi(kej["dibi"], kab_i, bulan_hari, LATIH)
    skor = {"model": ([], []), "hujan": ([], []), "S": ([], []), "klim": ([], []), "pvmbg": ([], [])}   # (positif, negatif)
    kelas = ([], [])   # (kelas model pos, kelas model neg)
    n_hari = 0
    for kab, daftar in kab_kec.items():
        ki = kab_i.get(kab)
        for th in UJI_TAHUN:
            d = dt.date(th, 1, 1)
            while d.year == th and d <= akhir:
                i = (d - awal).days
                tt = [(s, r7[c][i] / 10 / p95[c], s1, zv) for s, c, s1, zv in daftar if r7[c][i] is not None and p95[c] > 0]
                if tt:
                    ada = (ki, d.isoformat()) in pos if ki is not None else False
                    sk = max(rumus.skor(s, t) for s, t, _, _ in tt)
                    kl = max(rumus.bahaya(s, t) for s, t, _, _ in tt)
                    rs = max(t for _, t, _, _ in tt)
                    cl = clim.get((ki, d.month), 0.0) if ki is not None else 0.0
                    z = 0 if not ada else 1
                    skor["model"][z].append(sk)
                    skor["hujan"][z].append(rs)
                    skor["S"][z].append(max(s1 for _, _, s1, _ in tt))
                    skor["pvmbg"][z].append(max((zv or 0.0) for _, _, _, zv in tt))
                    skor["klim"][z].append(cl)
                    kelas[z].append(kl)
                    n_hari += 1
                d += dt.timedelta(days=1)
    n_pos, n_neg = len(kelas[1]), len(kelas[0])
    auc = {k: (None if v[0] == [] else round(rumus.auc(v[1], v[0]), 4)) for k, v in skor.items()}
    # POD/FAR pada kelas >= sedang dan = tinggi; pembanding hujan-saja diset pada LAJU PERINGATAN yang sama
    hasil = {}
    for nama, ambang in (("sedang_atau_tinggi", 1), ("tinggi", 2)):
        tp = sum(1 for k in kelas[1] if k >= ambang)
        fp = sum(1 for k in kelas[0] if k >= ambang)
        fn = n_pos - tp
        pod, far = rumus.pod_far(tp, fp, fn)
        laju = (tp + fp) / max(1, n_pos + n_neg)
        pembanding = {}
        for kunci in ("hujan", "klim"):
            semua = sorted(skor[kunci][0] + skor[kunci][1], reverse=True)
            n_alarm = tp + fp
            ba = semua[n_alarm - 1] if 0 < n_alarm <= len(semua) else float("inf")
            tp_b = sum(1 for x in skor[kunci][1] if x >= ba)
            fp_b = sum(1 for x in skor[kunci][0] if x >= ba)
            p_b, f_b = rumus.pod_far(tp_b, fp_b, n_pos - tp_b)
            pembanding[kunci] = {"pod": p_b and round(p_b, 4), "far": f_b and round(f_b, 4)}
        hasil[nama] = {"tp": tp, "fp": fp, "fn": fn, "pod": pod and round(pod, 4), "far": far and round(far, 4),
                       "laju_peringatan": round(laju, 4), "pembanding_laju_sama": pembanding}
    am = auc["model"]
    lawan = max(auc["hujan"] or 0, auc["klim"] or 0, auc["S"] or 0, auc["pvmbg"] or 0)
    pod_h = hasil["sedang_atau_tinggi"]["pembanding_laju_sama"]["hujan"]["pod"] or 0
    pod_m = hasil["sedang_atau_tinggi"]["pod"] or 0
    lolos = bool(am and am >= lawan + 0.02 and am >= 0.60 and pod_m > pod_h)
    glc = uji_glc(kej, kecs, kerent, sel, awal, p95, r7, S) if not hanya_pv else None
    return {"varian": varian, "subset": "kabupaten tercakup PVMBG" if hanya_pv else "semua kabupaten",
            "vonis": "LOLOS" if lolos else "GAGAL",
            "aturan": "LOLOS bila AUC model >= AUC terbaik pembanding (hujan-saja, kerentanan-saja, klimatologi, zona PVMBG) + 0,02, AUC >= 0,60, dan POD kelas >= sedang "
                      "lebih besar dari POD hujan-saja pada laju peringatan yang sama.",
            "sasaran": "kabupaten-hari ada kejadian longsor DIBI ('Tanah Longsor' + 'Gerakan Tanah'; tanpa 'Banjir dan Tanah Longsor')",
            "pembagian_waktu": f"P95 hujan dari {LATIH[0]}..{LATIH[1]}; uji tahun {list(UJI_TAHUN)} (2024 dibuang: DIBI tidak lengkap). Tanpa parameter dilatih pada label.",
            "cakupan": {"kabupaten": len(kab_kec), "kab_hari": n_hari, "positif": n_pos, "negatif": n_neg, "laju_dasar": round(n_pos / max(1, n_pos + n_neg), 5),
                        "sel_hujan": len(r7)},
            "auc": auc, "kelas": hasil, "glc_kec": glc}


def uji_glc(kej, kecs, kerent, sel, awal, p95, r7, S):
    """Pelengkap pada titik GLC (2017-2018 = irisan GLC dan hujan riwayat): POD kelas >= sedang di kecamatan kejadian pada hari kejadian
    vs laju peringatan kecamatan-hari tahun yang sama (lift = POD / laju). Tidak terpisah dari tahun latih P95 (hujan saja, bukan label)."""
    posk = {k["id"]: kunci_sel(*sel_hujan(k["lat"], k["lon"])) for k in kecs}
    tp = n = 0
    for t, lon, lat, mati, akur, pem, kab, kec in kej["glc"]:
        d = dt.date.fromisoformat(t)
        if kec and d >= awal and kec in S and posk[kec] in r7:
            i = (d - awal).days
            if i < len(r7[posk[kec]]) and r7[posk[kec]][i] is not None:
                n += 1
                tp += rumus.bahaya(S[kec], r7[posk[kec]][i] / 10 / p95[posk[kec]]) >= 1
    # laju dasar: contoh kecamatan-hari 2018 (setiap 7 hari, semua kec berhujan)
    tot = al = 0
    for kid, c in posk.items():
        if c in r7 and kid in S and p95.get(c, 0) > 0:
            for i in range(365 + 3, 365 + 365, 7):
                v = r7[c][i] if i < len(r7[c]) else None
                if v is not None:
                    tot += 1
                    al += rumus.bahaya(S[kid], v / 10 / p95[c]) >= 1
    return {"kejadian_dinilai": n, "kena": tp, "pod": round(tp / n, 4) if n else None,
            "laju_peringatan_kec_hari_2018": round(al / tot, 4) if tot else None,
            "lift": round((tp / n) / (al / tot), 2) if n and tot and al else None}


# ---------------------------------------------------------------- harian

def nowcast_dari(kerent, hujan_json, lama=None, sekarang=None):
    """kerentanan.json + hujan.json repo (a7 = hujan 7 hari teramati H-7..H-1) -> isi nowcast.json."""
    sekarang = sekarang or dt.datetime.now(WIB)
    sel25 = {}
    for g in hujan_json["grid"]:
        sel25[(round(g["lat"] / .25 - .5), round(g["lon"] / .25 - .5))] = g["a7"]
    amb = kerent["ambang_p95_mm"]
    tinggi, sedang, tanpa = [], [], 0
    for n, (lat, lon, ler, ses, cn, S) in enumerate(kerent["k"]):
        a7 = sel25.get((int((lat // .25)), int((lon // .25))))
        p = amb.get(kunci_sel(*sel_hujan(lat, lon)))
        if a7 is None or not p:
            tanpa += 1
            continue
        t = a7 / p
        k = rumus.bahaya(S, t)
        if k == 2:
            tinggi.append([n, round(S, 2), round(t, 2)])
        elif k == 1:
            sedang.append([n, round(S, 2), round(t, 2)])
    akhir = dt.date.fromisoformat(hujan_json["hari_ini"]) - dt.timedelta(days=1)
    riw = [r for r in ((lama or {}).get("riwayat") or []) if r["tgl"] != akhir.isoformat()]
    riw.append({"tgl": akhir.isoformat(), "tinggi": len(tinggi), "sedang": len(sedang)})
    return {"dibuat": sekarang.strftime("%Y-%m-%dT%H:%M+07:00"), "jendela_akhir": akhir.isoformat(),
            "keterangan": "Hujan 7 hari teramati sampai jendela_akhir (a7 Open-Meteo, hujan.json banjir) dibanding P95 hujan 7 hari ERA5 sel 0,5 derajat "
                          "(kerentanan.json). Dua sumber hujan berbeda model: t = hujan/P95 bukan ukuran pasti. Indeks kecamatan = urutan 'kec' di kerentanan.json. "
                          "Baris: [indeks kec, S, t]. Kecamatan yang tidak tercantum = rendah.",
            "bahaya": {"tinggi": "t >= 1 dan S >= 0,50", "sedang": "(t >= 1 dan S >= 0,30) atau (t >= 0,8 dan S >= 0,50)"},
            "ringkas": {"tinggi": len(tinggi), "sedang": len(sedang), "tanpa_nilai": tanpa, "kec": len(kerent["k"])},
            "tinggi": sorted(tinggi, key=lambda r: -r[1] * r[2]), "sedang": sorted(sedang, key=lambda r: -r[1] * r[2]),
            "riwayat": riw[-RIWAYAT_HARI:]}


def jalan_harian():
    kerent = json.load(open(os.path.join(KELUAR, "kerentanan.json")))
    h = json.load(open(os.path.join(AKAR, "public/banjir/data/hujan.json")))
    lama = baca(os.path.join(KELUAR, "nowcast.json"))
    isi = nowcast_dari(kerent, h, lama)
    ub = baca(os.path.join(KELUAR, "uji_balik.json")) or {}
    isi["uji_balik"] = {"vonis": ub.get("vonis", "BELUM DIUJI"), "auc": ub.get("auc"), "berkas": "uji_balik.json"}
    simpan(os.path.join(KELUAR, "nowcast.json"), isi)
    print(f"nowcast {isi['jendela_akhir']}: tinggi {isi['ringkas']['tinggi']}, sedang {isi['ringkas']['sedang']}", file=sys.stderr)


def jalan_uji():
    """Utama = v2 pada subset adil (kabupaten tercakup PVMBG); pembanding: v1 pada subset sama dan v1 pada semua kabupaten."""
    kej, kecs = json.load(open(os.path.join(KELUAR, "kejadian.json"))), daftar_kec()
    kerent, h = json.load(open(os.path.join(KELUAR, "kerentanan.json"))), harian_sel()
    o = uji_balik(kej, kecs, kerent, h, "v2", True)
    o["pembanding_varian"] = {n: {k: v[k] for k in ("varian", "subset", "vonis", "auc", "cakupan")}
                              for n, v in (("v1_subset_pvmbg", uji_balik(kej, kecs, kerent, h, "v1", True)),
                                           ("v1_semua", uji_balik(kej, kecs, kerent, h, "v1", False)))}
    simpan(os.path.join(KELUAR, "uji_balik.json"), {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%d"), **o})
    print(o["vonis"], o["auc"], o["pembanding_varian"], file=sys.stderr)


def diri():
    kerent = {"ambang_p95_mm": {"-6.75,107.75": 100.0}, "k": [[-6.9, 107.6, 30, 5, 84, 0.9], [-6.9, 107.6, 2, 90, 49, 0.01], [-6.9, 107.6, 20, 20, 79, 0.4]]}
    hj = {"hari_ini": "2026-10-13", "grid": [{"lat": -6.875, "lon": 107.625, "a7": 120.0}]}
    n = nowcast_dari(kerent, hj)
    assert [r[0] for r in n["tinggi"]] == [0] and [r[0] for r in n["sedang"]] == [2] and n["ringkas"]["tinggi"] == 1
    assert n["jendela_akhir"] == "2026-10-12" and n["riwayat"] == [{"tgl": "2026-10-12", "tinggi": 1, "sedang": 1}]
    n2 = nowcast_dari(kerent, hj, n)
    assert len(n2["riwayat"]) == 1                              # hari yang sama menimpa, bukan menggandakan
    hj["grid"][0]["a7"] = 10
    assert nowcast_dari(kerent, hj)["ringkas"]["tinggi"] == 0
    assert nowcast_dari(kerent, {"hari_ini": "2026-10-13", "grid": []})["ringkas"]["tanpa_nilai"] == 3
    # uji balik end-to-end pada data sintetis: hujan ekstrem + lereng curam => kejadian; harus AUC model > hujan-saja bila S membedakan
    import random
    random.seed(1)
    awal = dt.date(2017, 1, 1)
    hari = (dt.date(2025, 12, 31) - awal).days + 1
    sel = {kunci_sel(-6.75, 107.75): [random.randint(0, 150) if random.random() < .3 else 0 for _ in range(hari)],
           kunci_sel(-6.25, 107.75): [random.randint(0, 150) if random.random() < .3 else 0 for _ in range(hari)]}
    kecs = [{"id": "a|K1|A", "prov": "a", "kab": "K1", "lat": -6.9, "lon": 107.6}, {"id": "a|K2|B", "prov": "a", "kab": "K2", "lat": -6.4, "lon": 107.6}]
    kerent = {"kec": ["a|K1|A", "a|K2|B"], "k": [[0, 0, 0, 0, 0, 0.9], [0, 0, 0, 0, 0, 0.1]]}
    p = p95_sel(sel, awal, *LATIH)
    r = {k: rumus.jumlah7(h) for k, h in sel.items()}
    dib = []
    for tg in (dt.date(2023, 1, 1) + dt.timedelta(days=i) for i in range(700)):
        i = (tg - awal).days
        if r[kunci_sel(-6.75, 107.75)][i] is not None and r[kunci_sel(-6.75, 107.75)][i] / 10 >= p[kunci_sel(-6.75, 107.75)] and tg.year == 2023 and random.random() < .5:
            dib.append((tg.isoformat(), 0, 1, 0))
    kej = {"kab": ["a|K1", "a|K2"], "dibi": dib, "glc": []}
    out = uji_balik(kej, kecs, kerent, (awal, sel))
    assert out["auc"]["model"] > 0.7 and out["auc"]["klim"] is not None and out["cakupan"]["positif"] == len(dib), out
    print("model longsor: uji lolos")


if __name__ == "__main__":
    {"kerentanan": bangun_kerentanan, "harian": jalan_harian, "diri": diri,
     "uji": jalan_uji}[sys.argv[1] if sys.argv[1:] else "diri"]()
