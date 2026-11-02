"""Model peluang banjir kabupaten-hari untuk OPERASIONAL (KAB2) -> data/raw/banjir/model_kab2/ (BUKAN public/)

Protokol DIBEKUKAN di PRAREG-KAB2.md; berkas ini hanya melaksanakannya. Fitur = M0 HULU (tanpa CHIRPS/hulu/anteseden),
hiperparameter M0 HULU tanpa penyetelan, latih 2016-2025 dengan label bersatu v2 berbobot (TINGGI 1, SEDANG 0,5, RENDAH 0),
negatif hanya `tidak_ada_laporan`, Platt leave-one-year-out. Fungsi dipakai ulang lewat impor dari model_kab, model_kab_hulu,
model_kab_debit, uji_logbook, label_bersatu_v2 (tidak disunting). model_kab.LATIH ditunjuk ulang HANYA lewat pasang() dari
__main__ (impor HULU/DEBIT menambalnya ke 2016-2023; berkas ini tidak menambal apa pun saat diimpor).

Pakai:  python3 scripts/banjir/model_kab2.py uji              swauji tanpa jaringan
        python3 scripts/banjir/model_kab2.py baris            hitung kab, baris, label (tanpa model, tanpa skor)
        python3 scripts/banjir/model_kab2.py latih [--ulang]  50 model lipatan + 5 model akhir (~1 jam), kandidat.json + jejak
        python3 scripts/banjir/model_kab2.py sidik            bekukan kandidat + mulai prospektif (commit model_kab2.sidik sesudahnya)
        python3 scripts/banjir/model_kab2.py uji26            uji 2026-01-01..2026-10-18, SEKALI (sesudah sidik di-commit)
        python3 scripts/banjir/model_kab2.py uji26 --kering   gladi dengan kandidat nyata: tanpa skor, tanpa penanda, boleh berulang
"""
import csv, datetime as dt, gzip, hashlib, inspect, json, math, os, random, subprocess, sys, time
from collections import Counter, defaultdict

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
import model_kab_hulu as HU      # noqa: E402  (blok_h, ets_t, tambal_ub, KELOMPOK_M0, _toy_B; impor menambal MK.LATIH)
import model_kab_debit as MKD    # noqa: E402  (cuaca_sampai: ERA5 2026)
import label_bersatu_v2 as V2    # noqa: E402  (OUT_KAB, OUT_HARI, hari_j3, MIN_GS_KAB_TAHUN)
import uji_logbook as UL         # noqa: E402  (label_dari, kode_geo, pod_kejadian)

MK, ub, G = HU.MK, HU.ub, HU.G

KELUAR = os.path.join(AKAR, "data/raw/banjir/model_kab2")
PROTOKOL = os.path.join(AKAR, "scripts/banjir/PRAREG-KAB2.md")
SIDIK_JEJAK = os.path.join(AKAR, "scripts/banjir/model_kab2.sidik")   # JSONL hanya-tambah, dilacak git, DI LUAR sidik
JEJAK_REPO = AKAR
HULU_KAND = os.path.join(AKAR, "data/raw/banjir/model_kab_hulu/kandidat.json")   # dibaca saja
DIBI_TGL = os.path.join(AKAR, "data/raw/banjir/dibi_tanggal.json")
DESA = os.path.join(AKAR, "public/data/desa_cari.json")
LB26, DIBI26 = UL.LB, UL.DIBI
BERSIH_HEAD = ["scripts/banjir/model_kab2.py", "scripts/banjir/PRAREG-KAB2.md", "scripts/banjir/model_kab.py", "scripts/banjir/uji_balik.py",
               "scripts/banjir/label_bersatu_v2.py", "scripts/banjir/uji_logbook.py"]   # relatif JEJAK_REPO; wajib terlacak & sama dengan HEAD saat uji26

LATIH = range(2016, 2026)
UJI26 = (dt.date(2026, 1, 1), dt.date(2026, 10, 18))
AKHIR_26 = dt.date(2026, 10, 20)               # e+1 hari terakhir + cadangan hari_tahun (ub.AKHIR - 2)
PROSPEKTIF_AKHIR = dt.date(2027, 4, 30)
HIPER = {"dalam": 4, "lr": 0.05, "pohon": 200, "min_h": 5.0, "l2": 1.0, "sub": 0.5}   # M0 HULU, sidik 12ff6a89c8e01921
BIJI_MODEL = (1, 2, 3, 4, 5)
BOBOT = {"TINGGI": 1.0, "SEDANG": 0.5, "RENDAH": 0.0}
FITUR_M0 = ["h1", "h3", "imax", "pers_h3", "sm", "bulan_sin", "bulan_cos", "frek_dibi", "bahaya_b", "level_aturan"]
AKTIF = MK.aktif_dari(HU.KELOMPOK_M0)
ULANG, BIJI = 5000, 11
Q_LO, Q_HI = 0.025, 0.975
SKEMA = HU.SKEMA
LV = MK.LEVEL_ALARM                             # {"waspada": 1, "siaga": 2}
HALUS = 30

KRITERIA = {
    "model": "GBDT fitur M0 HULU (h1 h3 imax pers_h3 sm bulan_sin bulan_cos frek_dibi bahaya_b level_aturan), hiperparameter M0 HULU tanpa penyetelan, 5 biji",
    "label_latih": "v2 2016-2025: positif jangkar bobot TINGGI 1 SEDANG 0,5 RENDAH 0; negatif hanya tidak_ada_laporan (kab-tahun >= 5 poligon gs, DKI hari pb); tak_teramati, J3, ekor gugus d+1 dibuang; positif tak terliput dibuang",
    "kalibrasi": "Platt berbobot per biji pada logit leave-one-year-out 2016-2025; klimatologi kab-bulan berbobot (label v2) dan klimatologi-DIBI kab-bulan (semua kab-hari, label DIBI) dengan Platt LOYO yang sama",
    "uji26": "2026-01-01..2026-10-18, label DIBI ATAU logbook hari mulai, sekali, sesudah sidik di HEAD",
    "alarm": "jumlah alarm sama dengan aturan status.py (>= Waspada, >= Siaga) pada baris dinilai; seri acak biji 11",
    "ci": "bootstrap 5000 biji 11, skema kab x musim-tahun dan pulau x minggu, resampel identik antarpenilai, persentil 2,5 dan 97,5; bawah = terkecil, atas = terbesar",
    "lulus": "batas bawah dETS model-aturan Waspada > 0, Siaga > 0, dETS model-klimatologi-DIBI Waspada > 0, dBSS model vs klimatologi-DIBI > 0 (irisan-gabungan)",
    "peran_uji26": "penolak saja: TIDAK LULUS menghentikan kandidat; LULUS/TIDAK MEYAKINKAN = lanjut prospektif; keputusan tayang hanya dari prospektif",
    "tidak_lulus": "dETS model-aturan Waspada titik <= 0 atau batas atasnya < 0",
    "tidak_meyakinkan": "selain keduanya",
    "prospektif": "tanggal sidik (atau arsip operasional pertama sesudahnya) s.d. 2027-04-30, fitur operasional, kriteria sama, dinilai sekali >= 2027-06-01",
}


def J(nama):
    return os.path.join(KELUAR, nama)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def sha_berkas(p):
    return sha(open(p, "rb").read())


def sidik_kriteria():
    return sha(json.dumps(KRITERIA, sort_keys=True, ensure_ascii=False).encode())[:16]


def tgl_e(e):
    return ub.AWAL + dt.timedelta(e)


# ------------------------------------------------------------------ pasang (HANYA dari __main__)
def pasang():
    MK.LATIH, MK.VALIDASI, MK.UJI = LATIH, range(0), range(2026, 2027)


def cek_pasang():
    if MK.LATIH != LATIH:
        sys.exit(f"model_kab.LATIH = {MK.LATIH}, bukan {LATIH}: pasang() belum dipanggil (hanya dari __main__)")


# ------------------------------------------------------------------ label latih (PRAREG §2, §6a.1-3)
def baca_v2():
    """-> (baris kab_hari v2 [dict], set tanggal pb_dki = 1)."""
    with gzip.open(V2.OUT_KAB, "rt", newline="") as f:
        baris = list(csv.DictReader(f))
    with gzip.open(V2.OUT_HARI, "rt", newline="") as f:
        pb = {dt.date.fromisoformat(r["tanggal"]) for r in csv.DictReader(f) if r["pb_dki"] == "1"}
    return baris, pb


def label_kab(baris, pb_dki, j3, kabs, hari):
    """-> ({(kab, date): (y, w)} hari yang DIPAKAI, statistik). `hari` = tanggal yang dinilai. Bobot dan ambang dibaca dari
    global BOBOT / V2.MIN_GS_KAB_TAHUN saat dipanggil (bukan default argumen)."""
    gs, jangkar, j3_baris = Counter(), {}, set()
    for r in baris:
        d = dt.date.fromisoformat(r["tanggal"])
        gs[(r["kunci"], d.year)] += int(r["gs_n"] or 0)
        if r["kunci"] in kabs:
            jangkar[(r["kunci"], d)] = r["keyakinan"]
            if r["jendela_j3"] == "1":
                j3_baris.add((r["kunci"], d))
    out, st, satu = {}, Counter(), dt.timedelta(1)
    for kab in sorted(kabs):
        for d in hari:
            if d in j3 or (kab, d) in j3_baris:
                st["buang_j3"] += 1
                continue
            terliput = gs[(kab, d.year)] >= V2.MIN_GS_KAB_TAHUN or (kab.startswith("31|") and d in pb_dki)
            t = jangkar.get((kab, d))
            if t:
                if not terliput:
                    st["buang_positif_tak_terliput_" + t] += 1
                elif BOBOT[t] <= 0:
                    st["buang_bobot0_" + t] += 1
                else:
                    out[(kab, d)] = (1, BOBOT[t])
                    st["positif_" + t] += 1
            elif (kab, d - satu) in jangkar:
                st["buang_ekor_gugus"] += 1
            elif not terliput:
                st["buang_tak_teramati"] += 1
            else:
                out[(kab, d)] = (0, 1.0)
                st["negatif_tidak_ada_laporan"] += 1
    return out, dict(sorted(st.items()))


def saring(B, lab):
    """Baris MK.bangun -> hanya kab-hari berlabel; y dan w dari `lab`."""
    ix = [i for i, (k, e) in enumerate(zip(B["kab"], B["e"])) if (k, tgl_e(e)) in lab]
    out = {k: [v[i] for i in ix] for k, v in B.items()}
    yw = [lab[(B["kab"][i], tgl_e(B["e"][i]))] for i in ix]
    out["y"], out["w"] = [a for a, _ in yw], [b for _, b in yw]
    return out


def hash_label(TR):
    return sha(json.dumps(sorted(zip(TR["kab"], TR["e"], TR["y"], TR["w"]))).encode())


# ------------------------------------------------------------------ sampel dan data
def pilih_sampel():
    """Semua kab yang SEMUA selnya ada di cache ERA5 uji_balik; kunci '..|None' (tanpa nama kab) dibuang."""
    sk = ub.sel_per_kab()
    kabs = sorted(k for k in sk if not k.endswith("|None") and all(os.path.exists(ub.jalur(*s)) for s in sk[k]))
    return {"dibuat": dt.date.today().isoformat(), "aturan": "PRAREG-KAB2 §2", "kab": kabs,
            "sk": {k: [[la, lo, *b] for (la, lo), b in sorted(sk[k].items())] for k in kabs}}


def sk_dari(sam):
    return sam["kab"], {k: {(a, b): [c, d] for a, b, c, d in v} for k, v in sam["sk"].items()}


def hari_latih():
    return [tgl_e(e) for e in MK.hari_tahun(LATIH)]


def data_latih(sam, tulis=True):
    cek_pasang()
    kabs, sk = sk_dari(sam)
    sel = sorted({s for k in kabs for s in sk[k]})
    dibi = [r for r in json.load(open(DIBI_TGL)) if r[3] <= "2025-12-31"]
    ev = ub.peristiwa(dibi)
    cuaca = MK.muat_cuaca(sel)
    awal = MK.laju_awal(dibi, kabs)
    penuh, eks = MK.frekuensi(ev, kabs, awal)
    pers = MK.persentil_batas(cuaca)
    B = MK.bangun(cuaca, sk, kabs, {"banjir": {}, "longsor": {}}, LATIH, pers, penuh, eks)
    baris, pb = baca_v2()
    lab, st = label_kab(baris, pb, V2.hari_j3(), set(kabs), hari_latih())
    TR = saring(B, lab)
    BD = {"kab": B["kab"], "tahun": B["tahun"], "bulan": B["bulan"], "w": [1.0] * len(B["e"]),       # klimatologi-DIBI: semua kab-hari, label DIBI
          "y": [1 if e in ev["banjir"].get(k, ()) else 0 for k, e in zip(B["kab"], B["e"])]}
    if tulis:
        os.makedirs(KELUAR, exist_ok=True)
        json.dump(sam, open(J("sampel.json"), "w"), separators=(",", ":"))
        json.dump(dibi, open(J("dibi_le2025.json"), "w"), separators=(",", ":"))
        json.dump({"dibuat": str(dt.date.today()), "sha256_kab_hari_v2": sha_berkas(V2.OUT_KAB), "sha256_cakupan_hari_v2": sha_berkas(V2.OUT_HARI),
                   "sha256_tabel_latih": hash_label(TR), "statistik": st, "n": len(TR["y"]), "label_26": bekukan_label26_latih(kabs)},
                  open(J("label_latih.json"), "w"), separators=(",", ":"))
    return {"kabs": kabs, "sk": sk, "sel": sel, "TR": TR, "BD": BD, "st": st, "penuh": penuh, "awal": awal, "pers": pers}


# ------------------------------------------------------------------ model
def platt_w(z, y, w):
    m = G.latih_lr([[v] for v in z], y, w, l2=1e-3)
    return {"mu": m["mu"][0], "sd": m["sd"][0], "b0": m["b"][0], "b1": m["b"][1]}


def latih_gbdt(TR, ix, biji):
    m = G.latih_gbdt([TR["X"][i] for i in ix], [TR["y"][i] for i in ix], [TR["w"][i] for i in ix], pohon=HIPER["pohon"], dalam=HIPER["dalam"],
                     lr=HIPER["lr"], l2=HIPER["l2"], min_h=HIPER["min_h"], sub=HIPER["sub"], seed=biji, fitur_aktif=AKTIF)
    return {"bias": m["bias"], "pohon": m["pohon"]}


def loyo(TR, cocok, skor):
    """Leave-one-year-out: cocok(indeks latih) -> model; skor(model, indeks tahun ditahan) -> nilai. -> nilai luar-lipatan tiap baris."""
    out = [None] * len(TR["y"])
    for th in sorted(set(TR["tahun"])):
        ke = [i for i, t in enumerate(TR["tahun"]) if t == th]
        m = cocok([i for i, t in enumerate(TR["tahun"]) if t != th])
        for i, v in zip(ke, skor(m, ke)):
            out[i] = v
    return out


def klim_w(TR, ix):
    """Laju berbobot kab-bulan dihaluskan ke laju kab (bobot HALUS), laju kab ke laju sampel (bobot HALUS)."""
    km, k, tot = defaultdict(lambda: [0.0, 0.0]), defaultdict(lambda: [0.0, 0.0]), [0.0, 0.0]
    for i in ix:
        a, b = TR["w"][i] * TR["y"][i], TR["w"][i]
        for d in (km[(TR["kab"][i], TR["bulan"][i])], k[TR["kab"][i]], tot):
            d[0] += a
            d[1] += b
    r0 = tot[0] / tot[1]
    rk = {x: (v[0] + HALUS * r0) / (v[1] + HALUS) for x, v in k.items()}
    return {"r0": r0, "kab": rk, "km": {f"{x}|{m}": (v[0] + HALUS * rk[x]) / (v[1] + HALUS) for (x, m), v in km.items()}}


def nilai_klim(kl, kab, bulan):
    return kl["km"].get(f"{kab}|{bulan}", kl["kab"].get(kab, kl["r0"]))


def laju_level_w(TR):
    n, a = [0.0] * 4, [0.0] * 4
    for l, y, w in zip(TR["level"], TR["y"], TR["w"]):
        n[l] += w
        a[l] += w * y
    return [(a[i] + 0.5) / (n[i] + 1) for i in range(4)]


def latih_inti(TR, BD, biji=BIJI_MODEL, log=print):
    """Model akhir 5 biji (Platt LOYO per biji) + klimatologi v2 dan klimatologi-DIBI (BD, Platt LOYO) + laju per level.
    -> (model, logit luar-lipatan per biji, klim v2 LOYO)."""
    semua, ang, oof = list(range(len(TR["y"]))), [], {}
    for b in biji:
        t0 = time.time()
        z = loyo(TR, lambda ix: latih_gbdt(TR, ix, b), lambda m, ke: MK.skor_gbdt(m, [TR["X"][i] for i in ke]))
        m = latih_gbdt(TR, semua, b)
        ang.append({**m, "platt": platt_w(z, TR["y"], TR["w"]), "biji": b})
        oof[b] = z
        log(f"  biji {b}: 10 lipatan + akhir ({time.time() - t0:.0f} dtk)")
    zk = loyo(TR, lambda ix: klim_w(TR, ix), lambda kl, ke: [MK.logit(nilai_klim(kl, TR["kab"][i], TR["bulan"][i])) for i in ke])
    zd = loyo(BD, lambda ix: klim_w(BD, ix), lambda kl, ke: [MK.logit(nilai_klim(kl, BD["kab"][i], BD["bulan"][i])) for i in ke])
    mod = {"jenis": "gbdt", "aktif": AKTIF, "hiper": HIPER, "anggota": ang, "klim": klim_w(TR, semua), "platt_klim": platt_w(zk, TR["y"], TR["w"]),
           "klim_dibi": klim_w(BD, range(len(BD["y"]))), "platt_klim_dibi": platt_w(zd, BD["y"], BD["w"]), "laju_level": laju_level_w(TR)}
    return mod, oof, zk


def prediksi(mod, X):
    ps = [MK.pakai_platt(a["platt"], MK.skor_gbdt(a, X)) for a in mod["anggota"]]
    return [sum(c) / len(ps) for c in zip(*ps)]


def p_klim(mod, B):
    return MK.pakai_platt(mod["platt_klim"], [MK.logit(nilai_klim(mod["klim"], k, m)) for k, m in zip(B["kab"], B["bulan"])])


def p_klim_dibi(mod, B):
    return MK.pakai_platt(mod["platt_klim_dibi"], [MK.logit(nilai_klim(mod["klim_dibi"], k, m)) for k, m in zip(B["kab"], B["bulan"])])


def peluang(mod, B):
    return {"model": prediksi(mod, B["X"]), "klim": p_klim(mod, B), "klim_dibi": p_klim_dibi(mod, B), "aturan": p_aturan(mod, B)}


def p_aturan(mod, B):
    return [mod["laju_level"][l] for l in B["level"]]


# ------------------------------------------------------------------ penilaian (PRAREG §5)
def alarm_semua(B, P):
    ns = {lv: sum(1 for l in B["level"] if l >= L) for lv, L in LV.items()}
    return ns, {"aturan": {lv: [l >= L for l in B["level"]] for lv, L in LV.items()},
                **{m: {lv: MK.alarm_sebanyak(P[m], ns[lv]) for lv in LV} for m in ("model", "klim", "klim_dibi")}}


PEMBANDING, ACUAN = ("aturan", "klim", "klim_dibi"), "klim_dibi"


def boot(B, alarm, P, ulang=None):
    """Bootstrap blok berpasangan, dua skema; resampel identik untuk semua penilai. -> {kontras: {nilai, ci, skema...}}."""
    ulang = ULANG if ulang is None else ulang
    y, hasil = B["y"], defaultdict(dict)
    for skema in SKEMA:
        bl = HU.blok_h(B, skema)
        kunci = sorted(bl)
        cnt = {m: {lv: MK.cacah(B, alarm[m][lv], bl) for lv in LV} for m in alarm}
        se = {k: {m: sum((P[m][i] - y[i]) ** 2 for i in ix) for m in P} for k, ix in bl.items()}

        def stat(ks):
            e = {m: {lv: HU.ets_t(MK.jumlah(cnt[m][lv], ks)) for lv in LV} for m in cnt}
            t = {m: sum(se[k][m] for k in ks) for m in P}
            out = {f"dets_model-{b}_{lv}": e["model"][lv] - e[b][lv] for b in PEMBANDING for lv in LV}
            out.update({f"dbss_model-{b}": (t[b] - t["model"]) / t[ACUAN] for b in PEMBANDING})   # acuan Brier = klimatologi-DIBI
            return out
        titik, r, xs = stat(kunci), random.Random(BIJI), defaultdict(list)
        for _ in range(ulang):
            for k, v in stat([r.choice(kunci) for _ in kunci]).items():
                xs[k].append(v)
        for k in titik:
            v = sorted(xs[k])
            hasil[k][skema] = {"nilai": round(titik[k], 5), "ci": [round(v[int(Q_LO * (ulang - 1))], 5), round(v[int(Q_HI * (ulang - 1))], 5)], "blok": len(bl)}
    for k, d in hasil.items():
        d["nilai"] = d[SKEMA[0]]["nilai"]
        d["ci"] = [min(d[s]["ci"][0] for s in SKEMA), max(d[s]["ci"][1] for s in SKEMA)]
    return dict(hasil)


def level_model(B, alarm):
    """{kab: {e: 2 siaga, 1 waspada, 0}} dari alarm model (untuk POD per kejadian)."""
    out = defaultdict(dict)
    for i, (k, e) in enumerate(zip(B["kab"], B["e"])):
        out[k][e] = 2 if alarm["siaga"][i] else 1 if alarm["waspada"][i] else 0
    return out


def nilai(B, P, kej=(), ulang=None):
    """P = {model, klim, klim_dibi, aturan}: peluang. kej = [{kab_kode: kab, _a: e}] kejadian logbook (indeks ub)."""
    y = B["y"]
    ns, al = alarm_semua(B, P)
    semua = range(len(y))
    out = {"n": len(y), "kej": sum(y), "laju": round(sum(y) / max(1, len(y)), 5), "kab": len(set(B["kab"])), "alarm": ns,
           "probabilitas": {m: {"auc": G.auc(p, y), "brier": G.brier(p, y), "logloss": G.logloss(p, y)} for m, p in P.items()},
           "skor": {m: {lv: {k: None if v is None else round(v, 4) for k, v in ub.skor(*MK.kontingensi(al[m][lv], y, semua)).items()} for lv in LV} for m in al},
           "kontras": boot(B, al, P, ulang) if ulang != 0 else None}
    lv_at = defaultdict(dict)
    for k, e, l in zip(B["kab"], B["e"], B["level"]):
        lv_at[k][e] = l
    out["pod_kejadian_logbook"] = {"aturan": UL.pod_kejadian(list(kej), lv_at), "model": UL.pod_kejadian(list(kej), level_model(B, al["model"]))}
    return out


def vonis(r):
    k = r["kontras"]
    rin = {"dets_aturan_waspada_bawah_positif": k["dets_model-aturan_waspada"]["ci"][0] > 0, "dets_aturan_siaga_bawah_positif": k["dets_model-aturan_siaga"]["ci"][0] > 0,
           "dets_klim_dibi_waspada_bawah_positif": k["dets_model-klim_dibi_waspada"]["ci"][0] > 0, "dbss_klim_dibi_bawah_positif": k["dbss_model-klim_dibi"]["ci"][0] > 0}
    w = k["dets_model-aturan_waspada"]
    v = "LULUS" if all(rin.values()) else "TIDAK LULUS" if (w["nilai"] <= 0 or w["ci"][1] < 0) else "TIDAK MEYAKINKAN"
    return {"vonis": v, "rincian": rin, "lanjut_prospektif": v != "TIDAK LULUS"}   # uji26 = penolak saja (PRAREG §5)


def cetak(r):
    print(f"  n={r['n']} kej={r['kej']} laju={r['laju']} kab={r['kab']} alarm={r['alarm']}")
    for m, v in r["probabilitas"].items():
        print(f"    {m:7s} AUC {v['auc']:.4f}  Brier {v['brier']:.5f}  logloss {v['logloss']:.5f}")
    for m, d in r["skor"].items():
        print(f"    {m:7s} " + "  ".join(f"{lv}: POD {d[lv]['pod']} FAR {d[lv]['far']} ETS {d[lv]['ets']}" for lv in LV))
    for k, d in r["kontras"].items():
        print(f"    {k:26s} {d['nilai']:+.4f} CI95 [{d['ci'][0]:+.4f}, {d['ci'][1]:+.4f}]")
    print(f"    POD per kejadian logbook: {r['pod_kejadian_logbook']}")


# ------------------------------------------------------------------ sidik dan jejak
def sumber(*objek):
    txt = lambda o: inspect.getsource(o) if callable(o) else repr(sorted(o)) if isinstance(o, (set, frozenset)) else repr(o)   # set: urutan acak antarproses
    return sha("\n".join(txt(o) for o in objek).encode())


def tambal():
    return {"LATIH": [LATIH[0], LATIH[-1]], "UJI26": [str(x) for x in UJI26], "AKHIR_26": str(AKHIR_26), "HIPER": HIPER, "BIJI_MODEL": list(BIJI_MODEL),
            "BOBOT": BOBOT, "AKTIF": AKTIF, "FITUR": MK.FITUR, "ULANG": ULANG, "BIJI": BIJI, "Q": [Q_LO, Q_HI], "HALUS": HALUS, "MULAI": MK.MULAI,
            "MIN_GS": V2.MIN_GS_KAB_TAHUN, "J3": sorted(str(d) for d in V2.hari_j3()), "AWAL": str(ub.AWAL), "AKHIR": str(ub.AKHIR)}


ISI_KAND = ("fitur", "model", "frek", "frek_awal", "pers_batas", "sel", "kab")


def sidik_penuh(kand):
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "kand": {k: kand[k] for k in ISI_KAND}, "tambal": tambal()}, sort_keys=True).encode())
    kode = [os.path.abspath(__file__), PROTOKOL] + [os.path.join(AKAR, "scripts/banjir", n) for n in (
        "model_kab.py", "model_kab_hulu.py", "model_kab_debit.py", "uji_balik.py", "status.py", "umum.py", "label_bersatu.py")]
    kode += [os.path.join(AKAR, "scripts/sebaran/gbdt.py"), J("sampel.json"), J("label_latih.json"), J("dibi_le2025.json")]
    h.update(json.dumps([sha_berkas(j) for j in kode]).encode())
    h.update(sumber(UL.label_dari, UL.kode_geo, UL.bersih, UL.pod_kejadian, UL.JENIS_LB, UL.JENIS_DIBI, UL.MAKS_AKTIF, UL.TAHUN0, UL.AWAL, UL.LEVEL).encode())
    h.update(sumber(V2.hari_j3, V2.MIN_GS_KAB_TAHUN).encode())
    h.update(json.dumps(MK.manifest_era5(kand["sel"])).encode())
    return h.hexdigest()[:16]


def tambah_jejak(baris):
    with open(SIDIK_JEJAK, "a") as f:
        f.write(json.dumps(baris, sort_keys=True) + "\n")


def jejak_head():
    rel = os.path.relpath(os.path.realpath(SIDIK_JEJAK), os.path.realpath(JEJAK_REPO))
    r = subprocess.run(["git", "-C", JEJAK_REPO, "show", "HEAD:" + rel], capture_output=True)
    if r.returncode:
        sys.exit(f"{rel} tidak terlacak di HEAD (belum di-commit?): ditolak")
    if not os.path.exists(SIDIK_JEJAK) or open(SIDIK_JEJAK, "rb").read() != r.stdout:
        sys.exit(f"{rel} di working tree beda dari HEAD: commit (atau kembalikan) dulu, ditolak")
    return [json.loads(x) for x in r.stdout.decode().splitlines() if x.strip()]


def muat_kand():
    if not os.path.exists(J("kandidat.json")):
        sys.exit("kandidat.json belum ada: jalankan `latih`")
    kand = json.load(open(J("kandidat.json")))
    if kand["sidik_kriteria"] != sidik_kriteria() or kand["sidik"] != sidik_penuh(kand):
        sys.exit("sidik kriteria/kandidat/kode/data berubah sejak `latih`: ditolak. Latih ulang (--ulang) lalu sidik ulang.")
    return kand


def latih_terakhir(jj, kand):
    l = [b for b in jj if b.get("jenis") == "latih"]
    if not l or l[-1].get("sidik") != kand["sidik"] or l[-1].get("sidik_kriteria") != kand["sidik_kriteria"]:
        sys.exit("baris `latih` terakhir di HEAD (model_kab2.sidik) tidak sama dengan kandidat.json: ditolak")


def tulis_mulai(mode, sidik):
    try:
        fd = os.open(J(mode + ".mulai"), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sys.exit(f"{mode}.mulai sudah ada: sudah dimulai, tidak bisa dijalankan lagi")
    with os.fdopen(fd, "w") as f:
        json.dump({"waktu": dt.datetime.now().isoformat(timespec="seconds"), "sidik": sidik}, f)


# ------------------------------------------------------------------ mode
def latih(ulang=False):
    for n in ("uji26.mulai", "uji26.json"):
        if os.path.exists(J(n)):
            sys.exit(f"{n} ada: uji 2026 sudah dimulai; latih ulang = eksperimen baru dengan protokol baru")
    if os.path.exists(J("kandidat.json")) and not ulang:
        sys.exit("kandidat.json sudah ada: latih ulang butuh --ulang (menambah baris latih baru di jejak, sidik harus diulang)")
    if os.path.exists(HULU_KAND):
        h = json.load(open(HULU_KAND))["M0"]["hiper"]
        if {k: h[k] for k in HIPER} != HIPER:
            sys.exit(f"hiperparameter M0 HULU {h} beda dari HIPER {HIPER}: protokol mewajibkan pakai ulang tanpa penyetelan")
    t0 = time.time()
    D = data_latih(pilih_sampel())
    TR = D["TR"]
    print(f"{len(D['kabs'])} kab, {len(D['sel'])} sel; latih {len(TR['y'])} baris, positif {sum(TR['y'])} (bobot {sum(w * y for w, y in zip(TR['w'], TR['y'])):.1f}); {D['st']}", flush=True)
    mod, oof, zk = latih_inti(TR, D["BD"])
    p_oof = [sum(c) / len(c) for c in zip(*(MK.pakai_platt(a["platt"], oof[a["biji"]]) for a in mod["anggota"]))]
    pk_oof = MK.pakai_platt(mod["platt_klim"], zk)
    y, w = TR["y"], TR["w"]
    diag = {"catatan": "LOYO di data latih yang sudah dilihat rancangan lain: diagnostik, BUKAN uji",
            "keseluruhan": {m: {"auc_w": G.auc(p, y, w), "logloss_w": G.logloss(p, y, w), "brier_w": G.brier(p, y, w)} for m, p in (("model", p_oof), ("klim", pk_oof))},
            "per_tahun_auc_w": {t: {m: G.auc([p[i] for i in ix], [y[i] for i in ix], [w[i] for i in ix]) for m, p in (("model", p_oof), ("klim", pk_oof))}
                                for t in LATIH for ix in [[i for i, v in enumerate(TR["tahun"]) if v == t]] if ix}}
    kand = {"versi": "model-kab2-1", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
            "status": "KANDIDAT OPERASIONAL: uji 2026 belum dibuka", "fitur": MK.FITUR, "fitur_aktif": [MK.FITUR[i] for i in AKTIF], "model": mod,
            "frek": D["penuh"], "frek_awal": D["awal"], "pers_batas": {f"{s[0]:.3f}_{s[1]:.3f}": v for s, v in sorted(D["pers"].items())},
            "sel": [list(s) for s in D["sel"]], "kab": D["kabs"], "sidik_kriteria": sidik_kriteria()}
    kand["sidik"] = sidik_penuh(kand)
    json.dump(kand, open(J("kandidat.json"), "w"), separators=(",", ":"))
    b1 = {**{f"biji_{a['biji']}": a["platt"]["b1"] for a in mod["anggota"]}, "klim": mod["platt_klim"]["b1"], "klim_dibi": mod["platt_klim_dibi"]["b1"]}
    json.dump({"dibuat": kand["dibuat"], "n": len(y), "positif": sum(y), "label": D["st"], "diagnostik_loyo": diag, "platt_b1": b1}, open(J("latih.json"), "w"), separators=(",", ":"))
    print("kemiringan Platt b1:", b1)
    tambah_jejak({"jenis": "latih", "waktu": kand["dibuat"], "sidik": kand["sidik"], "sidik_kriteria": kand["sidik_kriteria"]})
    print(json.dumps(diag["keseluruhan"]))
    print(f"sidik {kand['sidik']}; kandidat.json ditulis ({time.time() - t0:.0f} dtk). Lanjut: `sidik`, lalu COMMIT model_kab2.sidik + model_kab2.py + PRAREG-KAB2.md")


def sidik():
    kand = muat_kand()
    jj = jejak_head()
    latih_terakhir(jj, kand)
    if any(b.get("jenis") == "sidik" and b.get("sidik") == kand["sidik"] for b in jj):
        sys.exit("kandidat ini sudah disidik")
    tambah_jejak({"jenis": "sidik", "sidik": kand["sidik"], "waktu": dt.datetime.now().isoformat(timespec="seconds"),
                  "prospektif": [dt.date.today().isoformat(), PROSPEKTIF_AKHIR.isoformat()]})
    print(f"sidik {kand['sidik']} dibekukan; prospektif {dt.date.today()}..{PROSPEKTIF_AKHIR}. COMMIT model_kab2.sidik sebelum `uji26`.")


def gerbang26():
    """Semua pemeriksaan; TIDAK menulis apa pun."""
    for n in ("uji26.mulai", "uji26.json"):
        if os.path.exists(J(n)):
            sys.exit(f"{n} ada: uji 2026 sudah dijalankan, tidak bisa dijalankan lagi")
    kand = muat_kand()
    jj = jejak_head()
    latih_terakhir(jj, kand)
    if not any(b.get("jenis") == "sidik" and b.get("sidik") == kand["sidik"] for b in jj):
        sys.exit("baris `sidik` untuk kandidat ini belum ada di HEAD: jalankan `sidik` lalu commit")
    if any(b.get("jenis") == "uji26" for b in jj):
        sys.exit("jejak di HEAD sudah memuat baris `uji26`: tidak bisa dijalankan lagi")
    for rel in BERSIH_HEAD:
        if subprocess.run(["git", "-C", JEJAK_REPO, "ls-files", "--error-unmatch", "--", rel], capture_output=True).returncode:
            sys.exit(f"berkas kode {rel} tidak terlacak di HEAD: commit dulu, ditolak")
        if subprocess.run(["git", "-C", JEJAK_REPO, "diff", "--quiet", "HEAD", "--", rel], capture_output=True).returncode:
            sys.exit(f"berkas kode {rel} beda dengan HEAD (belum di-commit): ditolak")
    return kand


def peta_kode(kabs):
    peta = UL.kode_geo(json.load(open(DESA))["kab"], [tuple(k.split("|", 1)) for k in kabs])
    return {f"{p}|{n}": v for (p, n), v in peta.items()}


def label_26(kabs, lb, dibi):
    """-> {gab_mulai, dibi, lb_mulai: {kab: [tanggal]}, kej: [[kab, tanggal]]} di UJI26, kab sampel terpetakan saja."""
    ke = {v: k for k, v in peta_kode(kabs).items()}
    lab, kej = UL.label_dari(lb, dibi, akhir=UJI26[1])
    t = lambda i: UL.AWAL + dt.timedelta(i)
    dalam = lambda d: UJI26[0] <= d <= UJI26[1]
    out = {n: {ke[k]: sorted(str(t(i)) for i in v if dalam(t(i))) for k, v in lab[n].items() if k in ke} for n in ("gab_mulai", "dibi", "lb_mulai")}
    out["kej"] = sorted([ke[e["kab_kode"]], str(t(e["_a"]))] for e in kej if e["kab_kode"] in ke and dalam(t(e["_a"])) and e["jenis"] in UL.JENIS_LB)
    out["kab_terpetakan"] = sorted(ke.values())
    return out


def hitung26(lab):
    return {**{n: sum(map(len, lab[n].values())) for n in ("gab_mulai", "dibi", "lb_mulai")}, "kej": len(lab["kej"]), "kab": len(lab["kab_terpetakan"])}


def bekukan_label26_latih(kabs):
    """Saat `latih`: label 2026 dibekukan ke label_26.json; ringkasnya (sha256 sumber, sha256 isi, hitungan) masuk label_latih.json (disidik).
    Berkas publik diperbarui harian, jadi yang dikunci adalah salinan beku, bukan berkas hidupnya."""
    isi = label_26(kabs, json.load(open(LB26))["kejadian"], json.load(open(DIBI26))["kejadian"])
    rek = {"sha256_logbook": sha_berkas(LB26), "sha256_dibi": sha_berkas(DIBI26), "sha256_isi": sha(json.dumps(isi, sort_keys=True).encode()), "hitung": hitung26(isi)}
    json.dump({"dibekukan": str(dt.date.today()), "sumber": [os.path.relpath(LB26, AKAR), os.path.relpath(DIBI26, AKAR)], **rek, "isi": isi},
              open(J("label_26.json"), "w"), separators=(",", ":"))
    return rek


def bekukan_label26(kabs):
    """Saat `uji26`: label beku dari `latih`; menolak bila isi/sumber/hitungan beda dari yang dicatat di label_latih.json."""
    rek = json.load(open(J("label_latih.json"))).get("label_26")
    c = json.load(open(J("label_26.json"))) if os.path.exists(J("label_26.json")) else None
    if not rek or not c or sha(json.dumps(c["isi"], sort_keys=True).encode()) != rek["sha256_isi"] or hitung26(c["isi"]) != rek["hitung"] \
            or (c["sha256_logbook"], c["sha256_dibi"]) != (rek["sha256_logbook"], rek["sha256_dibi"]):
        sys.exit("label_26.json tidak cocok dengan catatan label_latih.json (sha256 sumber/isi atau hitungan): ditolak")
    return c["isi"]


def muat_cuaca26(sel):
    return MKD.cuaca_sampai(sel, AKHIR_26)


def bangun26(kand, cuaca, lab, nama="gab_mulai"):
    """Baris uji 2026 (label `nama`) pada kab terpetakan, hari UJI26."""
    cek_pasang()
    sam = json.load(open(J("sampel.json")))
    kabs, sk = sk_dari(sam)
    kabs = [k for k in kabs if k in lab["kab_terpetakan"]]
    ev = {"banjir": {k: {ub.hari_ke(d) for d in v} for k, v in lab[nama].items()}, "longsor": {}}
    with HU.tambal_ub(akhir=AKHIR_26):
        B = MK.bangun(cuaca, sk, kabs, ev, range(2026, 2027), MK.persentil_batas(cuaca), kand["frek"], {})
    lo, hi = ub.hari_ke(UJI26[0]), ub.hari_ke(UJI26[1])
    ix = [i for i, e in enumerate(B["e"]) if lo <= e <= hi]
    return {k: [v[i] for i in ix] for k, v in B.items()}


def uji26():
    kand = gerbang26()
    sel = [tuple(s) for s in kand["sel"]]
    cuaca = muat_cuaca26(sel)                  # menolak (sys.exit) bila ERA5 2026 belum sampai AKHIR_26, SEBELUM penanda
    lab = bekukan_label26(kand["kab"])         # menolak bila label beku beda dari catatan latih, SEBELUM penanda
    tulis_mulai("uji26", kand["sidik"])
    mod = kand["model"]
    hasil = {}
    for nama in ("gab_mulai", "dibi", "lb_mulai"):
        B = bangun26(kand, cuaca, lab, nama)
        P = peluang(mod, B)
        kej = [{"kab_kode": k, "_a": ub.hari_ke(d)} for k, d in lab["kej"]] if nama == "gab_mulai" else ()
        hasil[nama] = nilai(B, P, kej, ulang=None if nama == "gab_mulai" else 0)
    v = vonis(hasil["gab_mulai"])
    print("Uji 2026, label DIBI ATAU logbook hari mulai:")
    cetak(hasil["gab_mulai"])
    print("VONIS", v)
    era5 = {f"{s[0]:.3f}_{s[1]:.3f}": sha(json.dumps([cuaca[s][k] for k in ("p", "im", "sm")]).encode()) for s in sorted(cuaca)}
    json.dump({"tanggal": str(dt.date.today()), "sidik": kand["sidik"], "sha256_label": json.load(open(J("label_26.json")))["sha256_isi"], "sha256_era5": era5,
               "sha256_sumber_hidup_saat_uji": [sha_berkas(LB26), sha_berkas(DIBI26)] if os.path.exists(LB26) and os.path.exists(DIBI26) else None,
               "uji26": hasil["gab_mulai"], "titik_label_lain": {n: {k: hasil[n][k] for k in ("n", "kej", "probabilitas", "skor")} for n in ("dibi", "lb_mulai")},
               "vonis": v}, open(J("uji26.json"), "w"), separators=(",", ":"))
    tambah_jejak({"jenis": "uji26", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sidik": kand["sidik"], "vonis": v["vonis"],
                  "sha256_uji26": sha_berkas(J("uji26.json")), "sha256_label_26": sha_berkas(J("label_26.json"))})
    print("jejak model_kab2.sidik ditambah baris `uji26`: COMMIT berkas itu")


def uji26_kering():
    """Gladi uji26 dengan kandidat nyata: label hidup TANPA tulis, ERA5 2026, tiga label, peluang. Tanpa skor, tanpa .mulai, tanpa metrik dari y;
    hanya memeriksa panjang, NaN, rentang peluang, dan sum(y) = hitungan label."""
    kand = muat_kand()
    rek = json.load(open(J("label_latih.json")))["label_26"]["hitung"]
    lab = label_26(kand["kab"], json.load(open(LB26))["kejadian"], json.load(open(DIBI26))["kejadian"])
    h = hitung26(lab)
    if h != rek:
        print(f"PERINGATAN: label hidup {h} beda dari beku saat latih {rek}; uji26 memakai yang beku")
    cuaca = muat_cuaca26([tuple(s) for s in kand["sel"]])
    for nama in ("gab_mulai", "dibi", "lb_mulai"):
        B = bangun26(kand, cuaca, lab, nama)
        P = peluang(kand["model"], B)
        n = len(B["y"])
        assert all(len(B[k]) == n for k in B) and all(len(p) == n for p in P.values()), f"{nama}: panjang beda"
        assert all(p == p and 0 < p < 1 for v in P.values() for p in v), f"{nama}: peluang NaN atau di luar (0, 1)"
        assert sum(B["y"]) == h[nama], (nama, sum(B["y"]), h[nama])
        print(f"  {nama}: {n} baris, {len(set(B['kab']))} kab, label cocok ({h[nama]})")
    print("kering OK: tanpa skor, tanpa uji26.mulai")


def alarm_aturan26(D):
    """Jumlah alarm aturan status.py di UJI26 pada kab terpetakan (dari ERA5 2026 saja; tanpa label, tanpa model)."""
    kabs = [k for k in D["kabs"] if k in peta_kode(D["kabs"])]
    cuaca = muat_cuaca26(D["sel"])
    with HU.tambal_ub(akhir=AKHIR_26):
        B = MK.bangun(cuaca, D["sk"], kabs, {"banjir": {}, "longsor": {}}, range(2026, 2027), MK.persentil_batas(cuaca), D["penuh"], {})
    lo, hi = ub.hari_ke(UJI26[0]), ub.hari_ke(UJI26[1])
    lv = [l for l, e in zip(B["level"], B["e"]) if lo <= e <= hi]
    return {"kab_hari": len(lv), **{nama: sum(1 for l in lv if l >= L) for nama, L in LV.items()}}


def baris():
    """Hitung kab, baris latih, label (tanpa model, tanpa skor); jumlah label 2026 sampel (tanpa skor)."""
    D = data_latih(pilih_sampel(), tulis=False)
    TR = D["TR"]
    print(f"kab {len(D['kabs'])}, sel {len(D['sel'])}; baris latih {len(TR['y'])}, positif {sum(TR['y'])}, bobot positif {sum(w * y for w, y in zip(TR['w'], TR['y'])):.1f}")
    print("label:", json.dumps(D["st"]))
    print("baris per tahun:", dict(sorted(Counter(TR["tahun"]).items())))
    l26 = label_26(D["kabs"], json.load(open(LB26))["kejadian"], json.load(open(DIBI26))["kejadian"])
    print(f"2026 label: {hitung26(l26)}")
    print(f"2026 alarm aturan (tanpa label, tanpa model): {alarm_aturan26(D)}")


# ------------------------------------------------------------------ swauji
def _tolak(f, frag):
    try:
        f()
    except SystemExit as e:
        assert frag in str(e), (frag, str(e))
        return
    raise AssertionError(f"harus ditolak: {frag}")


def uji():
    import tempfile, io, contextlib
    global BOBOT, KELUAR, SIDIK_JEJAK, JEJAK_REPO, BERSIH_HEAD, sidik_penuh, muat_cuaca26, bangun26, bekukan_label26, label_26, nilai
    assert MK.LATIH == range(2016, 2024), "impor model_kab2 tidak boleh memasang model_kab.LATIH (hanya pasang() dari __main__)"
    # 1. fitur: hanya M0 operasional; tidak ada CHIRPS/hulu/anteseden; hiperparameter = M0 HULU
    nama = [MK.FITUR[i] for i in AKTIF]
    assert nama == FITUR_M0, nama
    assert not {"c1", "c3", "c_pers", "hu1", "hu3", "hulu_ada", "a7", "a30", "api85", "api90", "api95"} & set(nama)
    assert not any("chirps" in f.lower() for f in nama) and HU.CH[0] not in MK.FITUR
    if os.path.exists(HULU_KAND):
        h = json.load(open(HULU_KAND))["M0"]
        assert {k: h["hiper"][k] for k in HIPER} == HIPER and h["aktif"] == AKTIF, h["hiper"]
    # 2. pasang: fungsi data menolak sebelum pasang(); pasang tidak dijalankan saat impor
    simpan_l = (MK.LATIH, MK.VALIDASI, MK.UJI)
    try:
        MK.LATIH = range(2016, 2024)
        _tolak(lambda: data_latih({"kab": [], "sk": {}}, tulis=False), "pasang() belum")
        _tolak(lambda: bangun26({}, {}, {}), "pasang() belum")
        pasang()
        cek_pasang()
    finally:
        MK.LATIH, MK.VALIDASI, MK.UJI = simpan_l
    # 3. label: bobot, tak_teramati, positif tak terliput, J3, ekor gugus, DKI pb, ambang gs dibaca saat dipanggil
    D = dt.date.fromisoformat
    r = lambda t, k, ky, gs=0, j3="0": {"tanggal": t, "kunci": k, "keyakinan": ky, "gs_n": str(gs), "jendela_j3": j3}
    baris_ = [r("2020-01-10", "32|A", "TINGGI", 3), r("2020-02-10", "32|A", "SEDANG"), r("2020-03-10", "32|A", "RENDAH", 2), r("2020-08-20", "32|A", "TINGGI", 0, "1"),
              r("2020-04-10", "32|B", "TINGGI", 4), r("2020-04-10", "33|Z", "TINGGI", 50)]
    hari = [D("2020-01-01") + dt.timedelta(i) for i in range(366)]
    j3 = {D("2020-08-17"), D("2020-08-18")}
    pb = {D("2020-05-01"), D("2020-05-02")}
    lab, st = label_kab(baris_, pb, j3, {"32|A", "32|B", "31|D"}, hari)
    assert lab[("32|A", D("2020-01-10"))] == (1, 1.0) and lab[("32|A", D("2020-02-10"))] == (1, 0.5), lab.get(("32|A", D("2020-02-10")))
    assert ("32|A", D("2020-03-10")) not in lab and st["buang_bobot0_RENDAH"] == 1                       # RENDAH bobot 0: tidak latih, tidak negatif
    for d in ("2020-01-11", "2020-02-11", "2020-03-11"):                                                    # ekor gugus d+1 (termasuk RENDAH) dibuang
        assert ("32|A", D(d)) not in lab, d
    assert lab[("32|A", D("2020-01-12"))] == (0, 1.0) and lab[("32|A", D("2020-01-09"))] == (0, 1.0)       # gs 32|A 2020 = 5: terliput
    assert all(("32|A", d) not in lab for d in j3) and ("32|A", D("2020-08-20")) not in lab and st["buang_j3"] == 3 * 2 + 1   # J3: semua kab + baris j3=1
    assert not any(k == "32|B" for k, _ in lab) and st["buang_positif_tak_terliput_TINGGI"] == 1          # gs 4 < 5: positif pun dibuang
    assert {d for k, d in lab if k == "31|D"} == pb and st["buang_tak_teramati"] > 0                       # DKI: hanya hari pb
    assert ("33|Z", D("2020-04-10")) not in lab                                                             # bukan sampel
    simpan_b, simpan_g = BOBOT, V2.MIN_GS_KAB_TAHUN
    try:
        BOBOT = {**BOBOT, "SEDANG": 1.0, "RENDAH": 0.25}
        lab2, _ = label_kab(baris_, pb, j3, {"32|A"}, hari)
        assert lab2[("32|A", D("2020-02-10"))] == (1, 1.0) and lab2[("32|A", D("2020-03-10"))] == (1, 0.25)   # bobot dibaca dari global
        V2.MIN_GS_KAB_TAHUN = 4
        lab3, _ = label_kab(baris_, pb, j3, {"32|B"}, hari)
        assert lab3[("32|B", D("2020-04-10"))] == (1, 1.0) and len(lab3) > 300                            # ambang gs dibaca saat dipanggil
    finally:
        BOBOT, V2.MIN_GS_KAB_TAHUN = simpan_b, simpan_g
    # saring: hanya baris berlabel, y dan w dari label
    e0 = ub.hari_ke(D("2020-01-10"))
    Bt = {"kab": ["32|A", "32|A", "32|A"], "tahun": [2020] * 3, "bulan": [1] * 3, "e": [e0, e0 + 1, e0 + 2], "X": [[1], [2], [3]], "y": [0] * 3, "level": [0] * 3}
    S = saring(Bt, lab)
    assert S["e"] == [e0, e0 + 2] and S["y"] == [1, 0] and S["w"] == [1.0, 1.0] and S["X"] == [[1], [3]]
    # 4. LOYO: tahun ditahan tidak pernah ikut latih lipatannya; tiap baris diskor tepat sekali
    T = {"tahun": [2016, 2017, 2018] * 4, "y": [0] * 12}
    lihat = []

    def cocok(ix):
        lihat.append({T["tahun"][i] for i in ix})
        return len(lihat)
    z = loyo(T, cocok, lambda m, ke: [(m, T["tahun"][i]) for i in ke])
    assert all(v is not None for v in z) and len(lihat) == 3
    assert all(t not in lihat[m - 1] and lihat[m - 1] == {2016, 2017, 2018} - {t} for m, t in z)
    # LOYO vs dalam-sampel pada derau: GBDT menghafal (AUC dalam-sampel tinggi), luar-lipatan ~0,5 -> Platt memakai luar-lipatan
    rr = random.Random(4)
    N = 900
    TRn = {"X": [[rr.random() for _ in MK.FITUR] for _ in range(N)], "y": [int(rr.random() < 0.1) for _ in range(N)], "w": [1.0] * N,
           "tahun": [2016 + i % 3 for i in range(N)], "kab": ["32|A"] * N, "bulan": [1 + i % 12 for i in range(N)], "level": [i % 4 for i in range(N)]}
    simpan_h = dict(HIPER)
    try:
        HIPER.update(pohon=25)
        zin = MK.skor_gbdt(latih_gbdt(TRn, list(range(N)), 1), TRn["X"])
        zo = loyo(TRn, lambda ix: latih_gbdt(TRn, ix, 1), lambda m, ke: MK.skor_gbdt(m, [TRn["X"][i] for i in ke]))
        a_in, a_oof = G.auc([G.sigmoid(v) for v in zin], TRn["y"]), G.auc([G.sigmoid(v) for v in zo], TRn["y"])
        assert a_in - a_oof > 0.1 and abs(a_oof - 0.5) < 0.1, (a_in, a_oof)
        # 5. bobot sampel benar-benar dipakai: bias GBDT = logit laju BERBOBOT; Platt berbobot beda dari tak berbobot
        TRw = {**TRn, "w": [0.5 if y else 1.0 for y in TRn["y"]]}
        m = latih_gbdt(TRw, list(range(N)), 1)
        p0 = sum(w * y for w, y in zip(TRw["w"], TRw["y"])) / sum(TRw["w"])
        assert abs(m["bias"] - math.log(p0 / (1 - p0))) < 1e-9 and abs(latih_gbdt(TRn, list(range(N)), 1)["bias"] - m["bias"]) > 0.3
        zz = [rr.gauss(0, 1) + 1.5 * y for y in TRn["y"]]
        pa, pb_ = platt_w(zz, TRn["y"], TRn["w"]), platt_w(zz, TRn["y"], TRw["w"])
        assert abs(pa["b0"] - pb_["b0"]) > 0.3
        assert abs(sum(MK.pakai_platt(pb_, zz)[i] * TRw["w"][i] for i in range(N)) / sum(TRw["w"]) - p0) < 0.01
        # 6. latih_inti ujung ke ujung (2 biji, pohon sedikit): Platt per biji dari LOYO, klim LOYO, JSON bolak-balik
        sinyal = MK.FITUR.index("h3")
        for i in range(N):
            TRw["y"][i] = int(rr.random() < 0.03 + 0.5 * (TRw["X"][i][sinyal] > 0.85))
        TRw["w"] = [0.5 if (y and i % 2) else 1.0 for i, y in enumerate(TRw["y"])]
        HIPER.update(pohon=15)
        with contextlib.redirect_stdout(io.StringIO()):
            BDt = {"kab": TRw["kab"], "tahun": TRw["tahun"], "bulan": TRw["bulan"], "w": [1.0] * N, "y": [int(b in (1, 2) and i % 5 == 0) for i, b in enumerate(TRw["bulan"])]}
            mod, oof, zk = latih_inti(TRw, BDt, biji=(1, 2), log=lambda s: None)
        zd = loyo(BDt, lambda ix: klim_w(BDt, ix), lambda kl_, ke: [MK.logit(nilai_klim(kl_, BDt["kab"][i], BDt["bulan"][i])) for i in ke])
        assert mod["platt_klim_dibi"] == platt_w(zd, BDt["y"], BDt["w"]) and mod["platt_klim_dibi"] != mod["platt_klim"]   # klim-DIBI: label sendiri, Platt LOYO
        assert mod["klim_dibi"]["km"]["32|A|1"] > mod["klim_dibi"]["km"]["32|A|6"] and len(p_klim_dibi(mod, TRw)) == N
        assert len(mod["anggota"]) == 2 and set(oof) == {1, 2} and all(len(v) == N for v in oof.values()) and len(zk) == N
        assert mod["anggota"][0]["platt"] == platt_w(oof[1], TRw["y"], TRw["w"])                            # Platt dari logit LUAR-lipatan
        assert mod["anggota"][0]["platt"] != platt_w(MK.skor_gbdt(mod["anggota"][0], TRw["X"]), TRw["y"], TRw["w"])
        p = prediksi(mod, TRw["X"])
        assert G.auc(p, TRw["y"]) > 0.7 and json.loads(json.dumps(mod)) == mod
        pk = MK.pakai_platt(mod["platt_klim"], zk)                                                          # Platt klim dari klim LUAR-lipatan
        assert abs(sum(a * w for a, w in zip(pk, TRw["w"])) / sum(TRw["w"]) - sum(w * y for w, y in zip(TRw["w"], TRw["y"])) / sum(TRw["w"])) < 0.005
        assert len(p_klim(mod, TRw)) == N
        ix0 = [i for i, t in enumerate(TRw["tahun"]) if t != 2016]
        assert abs(MK.logit(nilai_klim(klim_w(TRw, ix0), "32|A", TRw["bulan"][0])) - zk[0]) < 1e-12              # klim lipatan tanpa tahun baris itu
        assert len(p_aturan(mod, TRw)) == N and nilai_klim(mod["klim"], "99|X", 1) == mod["klim"]["r0"]
    finally:
        HIPER.clear()
        HIPER.update(simpan_h)
    # 7. penilaian dan vonis: model sempurna LULUS, model = aturan TIDAK LULUS, klimatologi TIDAK LULUS
    Bs = HU._toy_B(n_per=28)                                                                                # 28: (kab, e) unik
    sem = [0.9 if v else 0.03 for v in Bs["y"]]
    kl = [sum(Bs["y"]) / len(Bs["y"])] * len(Bs["y"])
    at = [0.02 + 0.05 * l for l in Bs["level"]]
    kej = [{"kab_kode": k, "_a": e} for k, e, y in zip(Bs["kab"], Bs["e"], Bs["y"]) if y][:40]
    r1 = nilai(Bs, {"model": sem, "klim": kl, "klim_dibi": kl, "aturan": at}, kej, ulang=200)
    assert vonis(r1)["vonis"] == "LULUS" and r1["pod_kejadian_logbook"]["model"]["waspada"] == 1.0 and r1["alarm"]["waspada"] == sum(l >= 1 for l in Bs["level"])
    assert r1["kontras"]["dets_model-aturan_waspada"]["ci"] == [min(r1["kontras"]["dets_model-aturan_waspada"][s]["ci"][0] for s in SKEMA),
                                                                  max(r1["kontras"]["dets_model-aturan_waspada"][s]["ci"][1] for s in SKEMA)]
    r2 = nilai(Bs, {"model": [float(l) for l in Bs["level"]], "klim": kl, "klim_dibi": kl, "aturan": at}, kej, ulang=100)
    assert r2["kontras"]["dets_model-aturan_waspada"]["nilai"] == 0 and vonis(r2)["vonis"] == "TIDAK LULUS"
    assert r2["pod_kejadian_logbook"]["model"]["waspada"] == r2["pod_kejadian_logbook"]["aturan"]["waspada"]
    assert vonis(nilai(Bs, {"model": kl, "klim": kl, "klim_dibi": kl, "aturan": at}, (), ulang=100))["vonis"] != "LULUS"           # = klimatologi: syarat 3 gagal
    kd = [0.9 if v else 0.03 for v in Bs["y"]]                                                            # klim-DIBI sempurna: syarat 3/4 gagal walau klim v2 kalah
    r3 = nilai(Bs, {"model": sem, "klim": kl, "klim_dibi": kd, "aturan": at}, (), ulang=100)
    assert not vonis(r3)["rincian"]["dets_klim_dibi_waspada_bawah_positif"] and vonis(r3)["vonis"] != "LULUS" and r3["kontras"]["dets_model-klim_waspada"]["ci"][0] > 0
    assert vonis(r1)["lanjut_prospektif"] and not vonis(r2)["lanjut_prospektif"]
    rua = lambda w, s, k, b: {"kontras": {"dets_model-aturan_waspada": {"nilai": w[0], "ci": w[1:]}, "dets_model-aturan_siaga": {"nilai": 0, "ci": s},
                                          "dets_model-klim_dibi_waspada": {"nilai": 0, "ci": k}, "dbss_model-klim_dibi": {"nilai": 0, "ci": b}}}
    ok = [.01, .02]
    assert vonis(rua((.02, .01, .03), ok, ok, ok))["vonis"] == "LULUS"
    for i in range(3):                                                                                      # tiap syarat bisa menggagalkan
        a = [ok, ok, ok]
        a[i] = [-.01, .02]
        assert vonis(rua((.02, .01, .03), *a))["vonis"] == "TIDAK MEYAKINKAN"
    assert vonis(rua((.02, -.01, .03), ok, ok, ok))["vonis"] == "TIDAK MEYAKINKAN"
    assert vonis(rua((.02, -.02, -.01), ok, ok, ok))["vonis"] == "TIDAK LULUS" and vonis(rua((0, -.01, .03), ok, ok, ok))["vonis"] == "TIDAK LULUS"
    assert int(Q_LO * (ULANG - 1)) == 124 and int(Q_HI * (ULANG - 1)) == 4874
    # 8. label 2026: indeks uji_logbook -> tanggal, jendela UJI26, kab terpetakan, hanya jenis banjir logbook di kejadian
    simpan_p = globals()["peta_kode"]
    try:
        globals()["peta_kode"] = lambda kabs: {"32|Bogor": "32.01"}
        lb = [{"jenis": "banjir", "kab_kode": "32.01", "mulai": "2026-02-03", "terlihat": ["2026-02-03", "2026-02-05"]},
              {"jenis": "banjir", "kab_kode": "32.01", "mulai": "2026-10-19", "terlihat": ["2026-10-19", "2026-10-19"]},
              {"jenis": "banjir", "kab_kode": "99.99", "mulai": "2026-03-01", "terlihat": ["2026-03-01", "2026-03-01"]},
              {"jenis": "kekeringan", "kab_kode": "32.01", "mulai": "2026-04-01", "terlihat": ["2026-04-01", "2026-04-01"]}]
        db = [{"jenis": "Banjir", "kab_kode": "32.01", "tanggal": "2026-05-06", "kejadian": 1}, {"jenis": "Banjir", "kab_kode": "32.01", "tanggal": "2025-12-31", "kejadian": 1}]
        l = label_26(["32|Bogor"], lb, db)
        assert l["gab_mulai"] == {"32|Bogor": ["2026-02-03", "2026-05-06"]} and l["dibi"] == {"32|Bogor": ["2026-05-06"]}, l
        assert l["kej"] == [["32|Bogor", "2026-02-03"]] and l["kab_terpetakan"] == ["32|Bogor"]
    finally:
        globals()["peta_kode"] = simpan_p
    # 9. latih/sidik/uji26: jejak git di HEAD, sekali jalan, penanda sebelum menilai, ditolak tak menghabiskan jatah
    simpan_g2 = (KELUAR, SIDIK_JEJAK, JEJAK_REPO, BERSIH_HEAD, sidik_penuh, muat_cuaca26, bangun26, bekukan_label26, label_26, nilai)
    with tempfile.TemporaryDirectory() as tmp:
        try:
            KELUAR = tmp
            repo = os.path.join(tmp, "repo")
            os.makedirs(repo)
            git = lambda *a: subprocess.run(["git", "-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True)
            git("init", "-q")
            open(os.path.join(repo, "x"), "w").write("x")
            git("add", "x")
            git("commit", "-q", "-m", "awal")
            SIDIK_JEJAK, JEJAK_REPO, BERSIH_HEAD = os.path.join(repo, "model_kab2.sidik"), repo, ["kode.py"]
            open(os.path.join(repo, "kode.py"), "w").write("a = 1\n")
            sidik_penuh = lambda k: "s1"
            _tolak(gerbang26, "kandidat.json belum ada")
            mod_t = {"anggota": [{"bias": -3.0, "pohon": [], "platt": {"mu": 0, "sd": 1, "b0": 0, "b1": 1}}], "klim": {"r0": .05, "kab": {}, "km": {}},
                     "platt_klim": {"mu": 0, "sd": 1, "b0": 0, "b1": 1}, "laju_level": [.01, .05, .1, .2], "klim_dibi": {"r0": .02, "kab": {}, "km": {}},
                     "platt_klim_dibi": {"mu": 0, "sd": 1, "b0": 0, "b1": 1}}
            json.dump({"sidik": "s1", "sidik_kriteria": sidik_kriteria(), "sel": [[0.125, 0.125]], "kab": ["32|k0"], "model": mod_t}, open(J("kandidat.json"), "w"))
            _tolak(gerbang26, "tidak terlacak")
            tambah_jejak({"jenis": "latih", "sidik": "s0", "sidik_kriteria": sidik_kriteria()})
            git("add", "model_kab2.sidik")
            git("commit", "-q", "-m", "l0")
            _tolak(gerbang26, "baris `latih` terakhir")
            _tolak(sidik, "baris `latih` terakhir")
            tambah_jejak({"jenis": "latih", "sidik": "s1", "sidik_kriteria": sidik_kriteria()})
            _tolak(gerbang26, "beda dari HEAD")
            git("add", "model_kab2.sidik")
            git("commit", "-q", "-m", "l1")
            _tolak(gerbang26, "baris `sidik`")
            with contextlib.redirect_stdout(io.StringIO()):
                sidik()
            _tolak(gerbang26, "beda dari HEAD")
            git("add", "model_kab2.sidik")
            git("commit", "-q", "-m", "sidik")
            _tolak(sidik, "sudah disidik")
            # R7: berkas kode wajib terlacak dan sama dengan HEAD
            _tolak(gerbang26, "berkas kode kode.py tidak terlacak")
            git("add", "kode.py")
            git("commit", "-q", "-m", "kode")
            open(os.path.join(repo, "kode.py"), "w").write("a = 2\n")
            _tolak(gerbang26, "berkas kode kode.py beda dengan HEAD")
            git("checkout", "--", "kode.py")
            assert gerbang26()["sidik"] == "s1"
            # R4: label beku dicek terhadap catatan latih; ditolak tanpa penanda
            lab_t = {"gab_mulai": {"11|k0": ["2026-02-01"]}, "dibi": {}, "lb_mulai": {"11|k0": ["2026-02-01"]}, "kej": [["11|k0", "2026-02-01"]], "kab_terpetakan": ["11|k0"]}
            rek = {"sha256_logbook": "a", "sha256_dibi": "b", "sha256_isi": sha(json.dumps(lab_t, sort_keys=True).encode()), "hitung": hitung26(lab_t)}
            json.dump({"label_26": rek}, open(J("label_latih.json"), "w"))
            json.dump({**rek, "isi": lab_t}, open(J("label_26.json"), "w"))
            assert simpan_g2[7](["11|k0"]) == lab_t
            json.dump({**rek, "sha256_dibi": "lain", "isi": lab_t}, open(J("label_26.json"), "w"))
            _tolak(lambda: simpan_g2[7](["11|k0"]), "tidak cocok")
            json.dump({**rek, "isi": {**lab_t, "dibi": {"11|k0": ["2026-03-01"]}}}, open(J("label_26.json"), "w"))
            _tolak(lambda: simpan_g2[7](["11|k0"]), "tidak cocok")
            json.dump({**rek, "isi": lab_t}, open(J("label_26.json"), "w"))
            # S2: --kering dengan kandidat (mainan): tanpa .mulai, tanpa nilai(), tanpa tulis apa pun; sum(y) dicek
            Bk = HU._toy_B(n_per=28)
            Bk["X"] = [[0.0] * len(MK.FITUR) for _ in Bk["y"]]
            hk = sum(Bk["y"])
            label_26 = lambda kabs, lb, db: {**lab_t, "gab_mulai": {"x": list(range(hk))}, "dibi": {"x": list(range(hk))}, "lb_mulai": {"x": list(range(hk))}}
            json.dump({"label_26": {**rek, "hitung": hitung26(label_26(0, 0, 0))}}, open(J("label_latih.json"), "w"))
            muat_cuaca26, bangun26 = (lambda sel: {}), (lambda kand, cuaca, lab, nama="gab_mulai": Bk)
            nilai = lambda *a, **k: (_ for _ in ()).throw(AssertionError("kering memanggil nilai()"))
            sebelum = sorted(os.listdir(tmp))
            with contextlib.redirect_stdout(io.StringIO()):
                uji26_kering()
            assert sorted(os.listdir(tmp)) == sebelum and not os.path.exists(J("uji26.mulai"))
            label_26 = lambda kabs, lb, db: {**lab_t, "gab_mulai": {"x": list(range(hk + 1))}, "dibi": {"x": list(range(hk))}, "lb_mulai": {"x": list(range(hk))}}
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    uji26_kering()
                raise RuntimeError("sum(y) beda harus gagal")
            except AssertionError:
                pass
            nilai, label_26 = simpan_g2[9], simpan_g2[8]
            json.dump({"label_26": rek}, open(J("label_latih.json"), "w"))
            sidik_penuh = lambda k: "lain"
            _tolak(gerbang26, "berubah sejak `latih`")
            sidik_penuh = lambda k: "s1"
            muat_cuaca26 = lambda sel: sys.exit("ERA5 sel belum sampai")
            _tolak(uji26, "belum sampai")
            assert not os.path.exists(J("uji26.mulai"))                                                    # ditolak = jatah tidak hilang
            muat_cuaca26 = lambda sel: {}
            Bq = HU._toy_B(n_per=28)
            Bq["X"] = [[0.0] * len(MK.FITUR) for _ in Bq["y"]]
            bekukan_label26 = lambda kabs: {"kej": [["11|k0", "2026-02-01"]]}
            json.dump({"sha256_isi": "x"}, open(J("label_26.json"), "w"))
            bangun26 = lambda kand, cuaca, lab, nama="gab_mulai": Bq
            simpan_u = ULANG
            globals()["ULANG"] = 50
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    uji26()
            finally:
                globals()["ULANG"] = simpan_u
            u = json.load(open(J("uji26.json")))
            assert os.path.exists(J("uji26.mulai")) and u["vonis"]["vonis"] in ("LULUS", "TIDAK LULUS", "TIDAK MEYAKINKAN") and set(u["titik_label_lain"]) == {"dibi", "lb_mulai"}
            _tolak(uji26, "sudah dijalankan")
            os.remove(J("uji26.json"))
            _tolak(uji26, "uji26.mulai ada")                                                                 # proses mati di tengah tetap terhitung
            _tolak(lambda: latih(), "uji 2026 sudah dimulai")
        finally:
            KELUAR, SIDIK_JEJAK, JEJAK_REPO, BERSIH_HEAD, sidik_penuh, muat_cuaca26, bangun26, bekukan_label26, label_26, nilai = simpan_g2
    print("ok model_kab2")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m == "uji":
        uji()
    elif m in ("baris", "latih", "sidik", "uji26"):
        pasang()
        {"baris": baris, "latih": lambda: latih("--ulang" in sys.argv), "sidik": sidik,
         "uji26": uji26_kering if "--kering" in sys.argv else uji26}[m]()
    else:
        sys.exit(__doc__)
