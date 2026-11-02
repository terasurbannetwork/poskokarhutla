"""KAB2-OPS: model operasional peluang banjir kab-hari = KAB2 dilatih ulang 2016-01-21..2026-10-18 (PRAREG-KAB2.md §8 A1).

Resep, fitur, hiperparameter, bobot, aturan pembuangan, Platt LOYO, klimatologi: IDENTIK (fungsi `model_kab2` diimpor, tidak disunting).
Yang beda hanya data: 2026 ikut melatih. Keluaran: data/raw/banjir/model_kab2_ops/. Jejak: scripts/banjir/model_kab2_ops.sidik.

Tafsir A1 (ditetapkan di sini, SEBELUM latih; PRAREG tidak disunting):
 1. Label 2026 = label resmi BEKU `model_kab2/label_26.json` (DIBI banjir/bandang ATAU logbook hari mulai; 98 kab-hari, 40 kab).
    Bobot TINGGI 1,0 bila label v2 kab-hari itu berkeyakinan TINGGI (termasuk logbook berdampak tanpa media); selain itu SEDANG 0,5.
    Alasan (keputusan koordinator): A1 mewajibkan resep identik dengan 2016-2025, tempat logbook berdampak = TINGGI; kalimat A1
    "TINGGI 1 bila resmi + v2 TINGGI" adalah ringkasan yang kurang lengkap.
 2. Negatif 2026: Groundsource berhenti Jan 2026, jadi "kab-tahun 2026 terliput" tak terhitung. Aturan: kab terliput di 2026 BILA
    terliput di 2025 (>= V2.MIN_GS_KAB_TAHUN poligon gs di kab-tahun 2025); DKI juga lewat hari pb_dki 2026. Kab-hari 2026 di kab terliput
    tanpa label resmi, bukan ekor gugus, bukan jendela J3 = negatif bobot 1; di kab tak terliput: dibuang (positifnya pun, PRAREG §6a.1).
    Cakupan logbook 2026 penuh (lb = 1 di 291/291 hari), DIBI 2026 belum terisi susulan: negatif 2026 lebih bocor (laporan resmi saja,
    tanpa media) daripada negatif 2016-2025; batas ini dicatat, tidak dikoreksi.
 3. Semua aturan pembuangan lain (RENDAH, ekor gugus d+1, J3, tak teramati) dijalankan oleh `model_kab2.label_kab` yang SAMA pada baris v2
    sintetis: baris < 2026 apa adanya; 2026 = jangkar resmi + pembawa cakupan (gs_n = ambang pada 2026-12-31 untuk kab terliput 2025).
 3b. Kab-hari 2026 yang di label v2 berjangkar (TINGGI, SEDANG, atau RENDAH) tetapi TIDAK ada di label resmi beku dibuang (diperlakukan seperti
    J3 dan seperti RENDAH bobot 0 di 2016-2025: baris dan ekor d+1 dibuang), bukan negatif; jumlahnya dihitung `baris_ops` ('buang_v2_non_resmi').
 3c. Kab tak terpetakan ke kode BPS dibuang dari 2026 (tak ada label resmi). DKI dengan gs 2025 < ambang terliput 2026 hanya lewat hari pb_dki.
     Klimatologi-DIBI 2026 memakai semua kab-hari 2026 kab terpetakan (tanpa saringan cakupan), konsisten dengan KAB2.
 3d. Bobot: TINGGI v2 (termasuk logbook berdampak tanpa media) = 1,0, SEDANG/tanpa baris v2 = 0,5 (keputusan koordinator; A1 mewajibkan resep identik).
 4. frek_dibi, batas persentil: DIBI <= 2025 dan hujan 2016-2025 (tak diperluas ke 2026): sama dengan kandidat KAB2 dan baris uji 2026.
 5. Sampel kab = `model_kab2/sampel.json` (40 kab, beku). Klimatologi-DIBI 2026 memakai kab-hari 2026 dengan label DIBI beku.
 6. Gerbang `latih`: baris `uji26` di model_kab2.sidik pada HEAD harus ada dan vonisnya bukan TIDAK LULUS.

Pakai:  python3 scripts/banjir/model_kab2_ops.py uji            swauji tanpa jaringan, tanpa tulis
        python3 scripts/banjir/model_kab2_ops.py hitung         jumlah baris/label, tanpa model (cek konsistensi fitur dengan kandidat KAB2)
        python3 scripts/banjir/model_kab2_ops.py latih [--ulang]  50 model lipatan + 5 akhir (~1 jam+) -> kandidat.json, latih.json, jejak
        python3 scripts/banjir/model_kab2_ops.py sidik          bekukan; COMMIT model_kab2_ops.sidik sebelum hari prospektif pertama
"""
import datetime as dt, hashlib, json, os, subprocess, sys, time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import model_kab2 as M2          # noqa: E402  (impor menambal MK.LATIH ke 2016-2023 via HULU; pasang() hanya dari __main__)

MK, HU, ub, V2, G = M2.MK, M2.HU, M2.ub, M2.V2, M2.G
AKAR = M2.AKAR
KELUAR = os.path.join(AKAR, "data/raw/banjir/model_kab2_ops")
JEJAK = os.path.join(AKAR, "scripts/banjir/model_kab2_ops.sidik")
JEJAK_KAB2 = "scripts/banjir/model_kab2.sidik"
TAHUN = range(2016, 2027)
KRITERIA = {"dasar": "PRAREG-KAB2.md §8 A1: resep KAB2 identik (M2.KRITERIA model, hiperparameter, biji, Platt LOYO, klimatologi), latih 2016-01-21..2026-10-18",
            "label_2026": "resmi beku model_kab2/label_26.json; TINGGI 1 bila v2 TINGGI (termasuk logbook berdampak), selain itu SEDANG 0,5",
            "negatif_2026": "kab terliput di 2025 (gs_n >= MIN_GS) atau DKI hari pb; label_kab yang sama membuang ekor, J3, tak teramati, positif tak terliput",
            "frek_persentil": "DIBI <= 2025, hujan 2016-2025 (tak diperluas)", "kab": "model_kab2/sampel.json beku",
            "gerbang": "model_kab2.sidik HEAD memuat uji26 dengan vonis selain TIDAK LULUS"}
ISI_KAND = M2.ISI_KAND


def J(n):
    return os.path.join(KELUAR, n)


def sha_kriteria():
    return M2.sha(json.dumps({**KRITERIA, "m2": M2.KRITERIA}, sort_keys=True, ensure_ascii=False).encode())[:16]


# ------------------------------------------------------------------ gerbang (A1.2)
def gerbang_uji26(repo=AKAR, rel=JEJAK_KAB2):
    r = subprocess.run(["git", "-C", repo, "show", "HEAD:" + rel], capture_output=True)
    if r.returncode:
        sys.exit(f"{rel} tidak terlacak di HEAD: ditolak")
    u = [b for b in map(json.loads, filter(str.strip, r.stdout.decode().splitlines())) if b.get("jenis") == "uji26"]
    if not u:
        sys.exit(f"{rel} di HEAD belum memuat baris uji26: ditolak (A1 menunggu vonis uji 2026)")
    if u[-1].get("vonis") == "TIDAK LULUS":
        sys.exit("vonis uji26 KAB2 = TIDAK LULUS: kandidat berhenti, KAB2-OPS tidak dilatih (A1.2)")
    return u[-1]


# ------------------------------------------------------------------ label (tafsir 1-3)
def baris_ops(v2, l26, kabs):
    """Baris v2 sintetis untuk label_kab: < 2026 apa adanya; 2026 = jangkar resmi + pembawa cakupan + penanda J3.
    -> (baris, {'tinggi_media', 'sedang', 'tinggi_v2_tanpa_media'})."""
    ms = V2.MIN_GS_KAB_TAHUN
    r = lambda t, k, ky, gs=0, j3="0": {"tanggal": t, "kunci": k, "keyakinan": ky, "gs_n": str(gs), "jendela_j3": j3}
    ks, gs25 = set(kabs), Counter()
    for x in v2:
        if x["tanggal"][:4] == "2025":
            gs25[x["kunci"]] += int(x["gs_n"] or 0)
    v26 = {(x["kunci"], x["tanggal"]): x for x in v2 if x["tanggal"] >= "2026" and x["kunci"] in ks}
    out = [x for x in v2 if x["tanggal"] < "2026"]
    out += [r("2026-12-31", k, "RENDAH", ms) for k in sorted(ks) if gs25[k] >= ms]                      # pembawa cakupan 2026 = cakupan 2025
    n = Counter()
    for (k, t), x in sorted(v26.items()):    # semua jangkar v2 2026 non-resmi: RENDAH (bobot 0) = dibuang beserta ekornya; penanda J3 ikut
        if t <= str(M2.UJI26[1]) and t not in l26["gab_mulai"].get(k, ()):
            n["buang_v2_non_resmi_" + x["keyakinan"]] += 1
        out.append(r(t, k, "RENDAH", 0, x["jendela_j3"]))
    for k, ds in sorted(l26["gab_mulai"].items()):
        for t in ds:
            x = v26.get((k, t))
            tinggi = bool(x) and x["keyakinan"] == "TINGGI"
            media = tinggi and any(x[f] == "1" for f in ("gs", "berita", "pb"))
            n["tinggi_media" if media else "tinggi_v2_tanpa_media" if tinggi else "sedang"] += 1   # hanya hitungan; bobot mengikuti `tinggi`
            out.append(r(t, k, "TINGGI" if tinggi else "SEDANG"))
    return out, dict(n)


def label_ops(v2, pb, l26, kabs, hari):
    """-> (lab {(kab, date): (y, w)}, statistik, hitungan bobot 2026)."""
    baris, n = baris_ops(v2, l26, kabs)
    lab, st = M2.label_kab(baris, pb, V2.hari_j3(), set(kabs), hari)
    ok = set(l26["kab_terpetakan"])
    lab = {kd: v for kd, v in lab.items() if kd[0] in ok or kd[1].year < 2026}      # kab tak terpetakan: tak ada label resmi 2026
    return lab, st, n


# ------------------------------------------------------------------ data
def data_ops():
    M2.cek_pasang()
    sam = json.load(open(M2.J("sampel.json")))
    kabs, sk = M2.sk_dari(sam)
    sel = sorted({s for k in kabs for s in sk[k]})
    dibi = json.load(open(M2.J("dibi_le2025.json")))
    l26 = json.load(open(M2.J("label_26.json")))["isi"]
    ev = ub.peristiwa(dibi)
    with HU.tambal_ub(akhir=M2.AKHIR_26):
        cuaca = M2.muat_cuaca26(sel)
        awal = MK.laju_awal(dibi, kabs)
        penuh, eks = MK.frekuensi(ev, kabs, awal)
        pers = MK.persentil_batas(cuaca)
        B = MK.bangun(cuaca, sk, kabs, {"banjir": {}, "longsor": {}}, TAHUN, pers, penuh, eks)
        hari = [M2.tgl_e(e) for e in MK.hari_tahun(TAHUN)]
    v2, pb = M2.baca_v2()
    lab, st, n26 = label_ops(v2, pb, l26, kabs, hari)
    TR = M2.saring(B, lab)
    ok = set(l26["kab_terpetakan"])
    d26 = {(k, d) for k, v in l26["dibi"].items() for d in v}
    ix = [i for i, (k, t) in enumerate(zip(B["kab"], B["tahun"])) if t < 2026 or k in ok]
    BD = {"kab": [B["kab"][i] for i in ix], "tahun": [B["tahun"][i] for i in ix], "bulan": [B["bulan"][i] for i in ix], "w": [1.0] * len(ix),
          "y": [1 if B["e"][i] in ev["banjir"].get(B["kab"][i], ()) or (B["kab"][i], str(M2.tgl_e(B["e"][i]))) in d26 else 0 for i in ix]}
    return {"kabs": kabs, "sk": sk, "sel": sel, "cuaca": cuaca, "B": B, "TR": TR, "BD": BD, "st": st, "n26": n26, "penuh": penuh, "awal": awal, "pers": pers}


def ringkas(D):
    TR = D["TR"]
    per = Counter()
    for t, y in zip(TR["tahun"], TR["y"]):
        per[(t, y)] += 1
    p26 = {"positif": per[(2026, 1)], "negatif": per[(2026, 0)], "bobot_positif": round(sum(w for t, y, w in zip(TR["tahun"], TR["y"], TR["w"]) if t == 2026 and y), 1)}
    return {"kab": len(D["kabs"]), "sel": len(D["sel"]), "baris": len(TR["y"]), "positif": sum(TR["y"]), "2026": p26, "label_2026_jangkar": D["n26"],
            "statistik": D["st"], "per_tahun": {t: [per[(t, 1)], per[(t, 0)]] for t in TAHUN}}


# ------------------------------------------------------------------ sidik
def manifest_era5(D):
    return [[f"{s[0]:.3f}_{s[1]:.3f}", M2.sha(json.dumps([D["cuaca"][s][k] for k in ("p", "im", "sm")]).encode())] for s in sorted(D["cuaca"])]


def sidik_ops(kand, era5):
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "m2": M2.KRITERIA, "kand": {k: kand[k] for k in ISI_KAND}, "tambal": M2.tambal()}, sort_keys=True).encode())
    kode = [os.path.abspath(__file__), M2.PROTOKOL, os.path.abspath(M2.__file__)] + [os.path.join(AKAR, "scripts/banjir", n) for n in (
        "model_kab.py", "model_kab_hulu.py", "model_kab_debit.py", "uji_balik.py", "status.py", "umum.py", "label_bersatu.py")]
    kode += [os.path.join(AKAR, "scripts/sebaran/gbdt.py"), V2.OUT_KAB, V2.OUT_HARI, M2.J("sampel.json"), M2.J("label_26.json"), M2.J("dibi_le2025.json")]
    h.update(json.dumps([M2.sha_berkas(p) for p in kode]).encode())
    h.update(M2.sumber(M2.UL.label_dari, M2.UL.kode_geo, M2.UL.bersih, M2.UL.pod_kejadian, M2.UL.JENIS_LB, M2.UL.JENIS_DIBI, M2.UL.MAKS_AKTIF, M2.UL.TAHUN0,
                       M2.UL.AWAL, M2.UL.LEVEL).encode())
    h.update(M2.sumber(V2.hari_j3, V2.MIN_GS_KAB_TAHUN).encode())
    h.update(json.dumps([era5, kand.get("vonis_uji26_kab2"), kand.get("sha256_baris_uji26_kab2")]).encode())
    return h.hexdigest()[:16]


def tambah_jejak(b):
    with open(JEJAK, "a") as f:
        f.write(json.dumps(b, sort_keys=True) + "\n")


def jejak_head():
    rel = os.path.relpath(os.path.realpath(JEJAK), os.path.realpath(AKAR))
    r = subprocess.run(["git", "-C", AKAR, "show", "HEAD:" + rel], capture_output=True)
    if r.returncode or not os.path.exists(JEJAK) or open(JEJAK, "rb").read() != r.stdout:
        sys.exit(f"{rel} tidak terlacak atau beda dari HEAD: commit dulu, ditolak")
    return [json.loads(x) for x in r.stdout.decode().splitlines() if x.strip()]


# ------------------------------------------------------------------ mode
def hitung():
    D = data_ops()
    print(json.dumps(ringkas(D), indent=1, ensure_ascii=False))
    if os.path.exists(M2.J("kandidat.json")):                  # konsistensi dengan KAB2: fitur 2016-2025 dari seri ERA5 panjang = kandidat KAB2
        k2 = json.load(open(M2.J("kandidat.json")))
        pb = {f"{s[0]:.3f}_{s[1]:.3f}": v for s, v in sorted(D["pers"].items())}
        assert pb == k2["pers_batas"] and D["penuh"] == k2["frek"], "batas persentil/frek_dibi beda dari KAB2"
        n = sum(1 for t in D["B"]["tahun"] if t < 2026)
        print(f"batas persentil dan frek_dibi sama dengan KAB2; baris fitur 2016-2025 {n}, 2026 {len(D['B']['e']) - n}")


def latih(ulang=False):
    brs = gerbang_uji26()
    v = brs["vonis"]
    if os.path.exists(J("kandidat.json")) and not ulang:
        sys.exit("kandidat.json ada: latih ulang butuh --ulang")
    if os.path.exists(M2.HULU_KAND):
        h = json.load(open(M2.HULU_KAND))["M0"]["hiper"]
        assert {k: h[k] for k in M2.HIPER} == M2.HIPER, "hiperparameter HULU beda"
    t0 = time.time()
    D = data_ops()
    TR, rg = D["TR"], ringkas(D)
    print(f"gerbang: vonis uji26 KAB2 = {v}\n{json.dumps(rg, ensure_ascii=False)}", flush=True)
    mod, oof, zk = M2.latih_inti(TR, D["BD"])
    p_oof = [sum(c) / len(c) for c in zip(*(MK.pakai_platt(a["platt"], oof[a["biji"]]) for a in mod["anggota"]))]
    pk = MK.pakai_platt(mod["platt_klim"], zk)
    y, w = TR["y"], TR["w"]
    pm = (("model", p_oof), ("klim", pk))
    diag = {"catatan": "LOYO di data latih yang sudah dilihat: diagnostik, BUKAN uji",
            "keseluruhan": {m: {"auc_w": G.auc(p, y, w), "logloss_w": G.logloss(p, y, w), "brier_w": G.brier(p, y, w)} for m, p in pm},
            "per_tahun_auc_w": {t: {m: G.auc([p[i] for i in ix], [y[i] for i in ix], [w[i] for i in ix]) for m, p in pm}
                                for t in TAHUN for ix in [[i for i, v_ in enumerate(TR["tahun"]) if v_ == t]] if ix}}
    kand = {"versi": "model-kab2-ops-1", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
            "status": "OPERASIONAL (A1): dilatih 2016-01-21..2026-10-18; dinilai prospektif saja", "fitur": MK.FITUR, "fitur_aktif": [MK.FITUR[i] for i in M2.AKTIF],
            "model": mod, "frek": D["penuh"], "frek_awal": D["awal"], "pers_batas": {f"{s[0]:.3f}_{s[1]:.3f}": v_ for s, v_ in sorted(D["pers"].items())},
            "sel": [list(s) for s in D["sel"]], "kab": D["kabs"], "sidik_kriteria": sha_kriteria(),
            "vonis_uji26_kab2": v, "sha256_baris_uji26_kab2": M2.sha(json.dumps(brs, sort_keys=True).encode())}
    kand["sidik"] = sidik_ops(kand, manifest_era5(D))
    os.makedirs(KELUAR, exist_ok=True)
    json.dump(kand, open(J("kandidat.json"), "w"), separators=(",", ":"))
    b1 = {**{f"biji_{a['biji']}": a["platt"]["b1"] for a in mod["anggota"]}, "klim": mod["platt_klim"]["b1"], "klim_dibi": mod["platt_klim_dibi"]["b1"]}
    json.dump({"dibuat": kand["dibuat"], "ringkas": rg, "diagnostik_loyo": diag, "platt_b1": b1, "vonis_uji26_kab2": v,
               "sha256_kab_hari_v2": M2.sha_berkas(V2.OUT_KAB), "sha256_label_26": M2.sha_berkas(M2.J("label_26.json"))}, open(J("latih.json"), "w"), separators=(",", ":"))
    tambah_jejak({"jenis": "latih", "waktu": kand["dibuat"], "sidik": kand["sidik"], "sidik_kriteria": kand["sidik_kriteria"]})
    print(json.dumps(diag["keseluruhan"]), "\nb1", b1)
    print(f"sidik {kand['sidik']}; kandidat.json ditulis ({time.time() - t0:.0f} dtk). Lanjut: `sidik`, lalu COMMIT model_kab2_ops.sidik + model_kab2_ops.py")


def sidik():
    kand = json.load(open(J("kandidat.json")))
    D = data_ops()
    if kand["sidik_kriteria"] != sha_kriteria() or kand["sidik"] != sidik_ops(kand, manifest_era5(D)):
        sys.exit("sidik kriteria/kode/data berubah sejak `latih`: ditolak")
    jj = jejak_head()
    l = [b for b in jj if b.get("jenis") == "latih"]
    if not l or l[-1]["sidik"] != kand["sidik"]:
        sys.exit("baris `latih` terakhir di HEAD tidak sama dengan kandidat.json: ditolak")
    if any(b.get("jenis") == "sidik" and b["sidik"] == kand["sidik"] for b in jj):
        sys.exit("kandidat ini sudah disidik")
    tambah_jejak({"jenis": "sidik", "sidik": kand["sidik"], "waktu": dt.datetime.now().isoformat(timespec="seconds"),
                  "prospektif": [dt.date.today().isoformat(), M2.PROSPEKTIF_AKHIR.isoformat()]})
    print(f"sidik {kand['sidik']} dibekukan; prospektif {dt.date.today()}..{M2.PROSPEKTIF_AKHIR}. COMMIT model_kab2_ops.sidik.")


# ------------------------------------------------------------------ swauji
def uji():
    import random, tempfile, io, contextlib
    D = dt.date.fromisoformat
    # 1. resep identik: objek yang SAMA dengan KAB2 (bukan salinan), tanpa CHIRPS; bandingkan dengan kandidat KAB2 bila ada
    assert HU is M2.HU and MK is M2.MK and M2.latih_inti.__module__ == "model_kab2"
    nama = [MK.FITUR[i] for i in M2.AKTIF]
    assert nama == M2.FITUR_M0 and not any("chirps" in f.lower() or f.startswith(("c1", "c3", "c_pers", "hu")) for f in nama)
    assert "latih_inti(" in open(__file__).read() and "M2.latih_inti(TR, D[\"BD\"])" in open(__file__).read()
    if os.path.exists(M2.J("kandidat.json")):
        k2 = json.load(open(M2.J("kandidat.json")))
        m2 = k2["model"]
        assert m2["hiper"] == M2.HIPER and m2["aktif"] == M2.AKTIF and k2["fitur"] == MK.FITUR and k2["fitur_aktif"] == nama
        assert [a["biji"] for a in m2["anggota"]] == list(M2.BIJI_MODEL) and m2["hiper"] == {"dalam": 4, "lr": 0.05, "pohon": 200, "min_h": 5.0, "l2": 1.0, "sub": 0.5}
        assert M2.BOBOT == {"TINGGI": 1.0, "SEDANG": 0.5, "RENDAH": 0.0}
    else:
        print("  (kandidat KAB2 tidak ada: perbandingan hiperparameter dilewati)")
    # 2. label 2026: bobot, negatif via cakupan 2025, ekor, buang tak terliput, J3, tak terpetakan; < 2026 identik dengan label_kab polos
    r = lambda t, k, ky="RENDAH", gsn=0, j3="0", **kw: {"tanggal": t, "kunci": k, "keyakinan": ky, "gs_n": str(gsn), "jendela_j3": j3, "gs": "0", "berita": "0", "pb": "0", **kw}
    v2 = [r("2025-03-10", "32|A", "TINGGI", 6), r("2025-05-10", "32|B", "TINGGI", 2), r("2025-06-10", "32|C", "SEDANG", 9),
          r("2026-02-10", "32|A", "TINGGI", 3, gs="1"), r("2026-03-10", "32|A", "TINGGI", 0, lb_dampak="1"), r("2026-04-10", "32|C", "SEDANG"),
          r("2026-05-10", "32|B", "SEDANG"), r("2026-06-10", "32|A", "RENDAH", 0, "1"), r("2026-07-10", "32|Z", "SEDANG", 9),
          r("2026-09-10", "32|A", "TINGGI", 0, lb_dampak="1"), r("2026-09-20", "32|C", "SEDANG"), r("2026-09-25", "32|C", "RENDAH", 3, gs="1")]
    l26 = {"gab_mulai": {"32|A": ["2026-02-10", "2026-03-10", "2026-06-10", "2026-08-10"], "32|B": ["2026-05-10"], "32|C": ["2026-04-10"]},
           "kab_terpetakan": ["32|A", "32|B", "32|C"]}
    hari = [D("2025-01-01") + dt.timedelta(i) for i in range(365 + 291)]
    lab, st, n = label_ops(v2, set(), l26, {"32|A", "32|B", "32|C", "32|Z"}, hari)
    assert lab[("32|A", D("2026-02-10"))] == (1, 1.0)                                  # resmi + media (v2 TINGGI + gs)
    assert lab[("32|A", D("2026-03-10"))] == (1, 1.0)                                  # v2 TINGGI tanpa media (lb_dampak) = 1,0 (tafsir 1: resep identik)
    assert lab[("32|A", D("2026-08-10"))] == (1, 0.5)                                  # tanpa baris v2 sama sekali = SEDANG
    assert lab[("32|C", D("2026-04-10"))] == (1, 0.5) and n["tinggi_media"] == 1 and n["tinggi_v2_tanpa_media"] == 1 and n["sedang"] == 4, n
    assert ("32|A", D("2026-09-10")) not in lab and ("32|C", D("2026-09-20")) not in lab and ("32|C", D("2026-09-25")) not in lab   # v2 non-resmi (TINGGI/SEDANG/RENDAH): dibuang, bukan negatif
    assert ("32|A", D("2026-09-11")) not in lab and n["buang_v2_non_resmi_TINGGI"] == 1 and n["buang_v2_non_resmi_SEDANG"] == 2 and n["buang_v2_non_resmi_RENDAH"] == 1, n
    assert ("32|A", D("2026-06-10")) not in lab                                        # J3 v2
    assert lab[("32|A", D("2026-09-01"))] == (0, 1.0) and lab[("32|C", D("2026-09-01"))] == (0, 1.0)   # terliput 2025 (gs 6, 9 >= 5) -> negatif 2026
    assert ("32|A", D("2026-02-11")) not in lab and ("32|A", D("2026-03-11")) not in lab              # ekor gugus d+1
    assert not any(k == "32|B" and d.year == 2026 for k, d in lab)                     # tak terliput 2025 (gs 2): negatif DAN positif 2026 dibuang
    assert not any(k == "32|Z" for k, _ in lab) or all(d.year < 2026 for k, d in lab if k == "32|Z")  # tak terpetakan: tak ada label 2026
    lama = M2.label_kab([x for x in v2 if x["tanggal"] < "2026"], set(), V2.hari_j3(), {"32|A", "32|B", "32|C"}, [h for h in hari if h.year == 2025])[0]
    assert {kd: v for kd, v in lab.items() if kd[1].year == 2025 and kd[0] != "32|Z"} == lama      # 2016-2025 tak berubah oleh A1
    # 3. Platt LOYO meliputi 2026; 2026 ikut di lipatan lain; model akhir memuat 2026; bobot terbawa
    rnd = random.Random(1)
    n_ = 300
    TR = {"kab": [f"32|k{i % 3}" for i in range(n_)], "tahun": [2024 + (i % 3) for i in range(n_)], "bulan": [1 + i % 12 for i in range(n_)],
          "X": [[rnd.random() for _ in MK.FITUR] for _ in range(n_)], "y": [1 if rnd.random() < 0.15 else 0 for _ in range(n_)],
          "w": [0.5 if i % 4 == 0 else 1.0 for i in range(n_)], "level": [rnd.randrange(4) for _ in range(n_)]}
    BD = {k: TR[k] for k in ("kab", "tahun", "bulan")} | {"w": [1.0] * n_, "y": TR["y"]}
    rek, asli = [], (M2.latih_gbdt, dict(M2.HIPER))
    def palsu(T, ix, biji):
        rek.append((sorted({T["tahun"][i] for i in ix}), sum(T["w"][i] for i in ix)))
        return asli[0](T, ix, biji)
    try:
        M2.latih_gbdt = palsu
        M2.HIPER["pohon"] = 3
        with contextlib.redirect_stdout(io.StringIO()):
            mod, oof, zk = M2.latih_inti(TR, BD, biji=(1,))
    finally:
        M2.latih_gbdt = asli[0]
        M2.HIPER.update(asli[1])
    tahun_lipatan = [t for t, _ in rek[:-1]]
    assert len(rek) == 4 and all(len(t) == 2 for t in tahun_lipatan) and sorted(tahun_lipatan) == [[2024, 2025], [2024, 2026], [2025, 2026]]   # 2026 ditahan sekali, ikut latih di dua lipatan
    assert rek[-1][0] == [2024, 2025, 2026] and abs(rek[-1][1] - sum(TR["w"])) < 1e-9                                # model akhir: bobot penuh, termasuk 2026
    assert all(o is not None for o in oof[1]) and mod["anggota"][0]["platt"]["b1"] == mod["anggota"][0]["platt"]["b1"]
    assert M2.HIPER["pohon"] == 200
    # 4. gerbang: vonis uji26 di HEAD
    with tempfile.TemporaryDirectory() as tmp:
        git = lambda *a: subprocess.run(["git", "-C", tmp, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True)
        git("init", "-q")
        berkas = os.path.join(tmp, "j.sidik")
        for isi, frag in (([{"jenis": "latih"}], "belum memuat"), ([{"jenis": "uji26", "vonis": "TIDAK LULUS"}], "TIDAK LULUS")):
            open(berkas, "w").write("\n".join(json.dumps(x) for x in isi) + "\n")
            git("add", "j.sidik"); git("commit", "-q", "-m", "x")
            M2._tolak(lambda: gerbang_uji26(tmp, "j.sidik"), frag)
        open(berkas, "w").write(json.dumps({"jenis": "uji26", "vonis": "TIDAK MEYAKINKAN"}) + "\n")
        M2._tolak(lambda: gerbang_uji26(tmp, "j.sidik"), "TIDAK LULUS")               # belum di-commit: HEAD masih TIDAK LULUS
        git("add", "j.sidik"); git("commit", "-q", "-m", "y")
        assert gerbang_uji26(tmp, "j.sidik")["vonis"] == "TIDAK MEYAKINKAN"
    # 5. HEAD asli: gerbang nyata (bila repo punya baris uji26)
    r_ = subprocess.run(["git", "-C", AKAR, "show", "HEAD:" + JEJAK_KAB2], capture_output=True)
    if r_.returncode == 0 and b'"uji26"' in r_.stdout:
        assert gerbang_uji26()["vonis"] in ("LULUS", "TIDAK MEYAKINKAN")
    print("ok model_kab2_ops")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m == "uji":
        uji()
    elif m in ("hitung", "latih", "sidik"):
        M2.pasang()
        {"hitung": hitung, "latih": lambda: latih("--ulang" in sys.argv), "sidik": sidik}[m]()
    else:
        sys.exit(__doc__)
