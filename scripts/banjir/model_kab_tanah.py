"""Kelembapan tanah anteseden ERA5-Land pada model peluang banjir kabupaten-hari -> data/raw/banjir/model_kab_tanah/

Protokol: PRAREG-TANAH.md. Kerangka (sampel, label, CHIRPS/hulu, GBDT/LR, Platt silang, bootstrap, gerbang sia/buka, jejak .sidik)
DIIMPOR dari model_kab_hulu.py (HU) tanpa mengubah berkasnya; di sini hanya fitur tanah dan model M0T/M3T.

Pakai:  python3 scripts/banjir/model_kab_tanah.py asap            uji asap jaringan 2 sel x 2 hari (tidak menyentuh cache)
        python3 scripts/banjir/model_kab_tanah.py ambil [akhir]    ERA5-Land harian per sel sampel, lanjut dari cache
        python3 scripts/banjir/model_kab_tanah.py uji              swauji tanpa jaringan
        python3 scripts/banjir/model_kab_tanah.py latih [--ulang "<alasan galat teknis>"]  JANGAN sebelum PRAREG-TANAH ditinjau
        python3 scripts/banjir/model_kab_tanah.py sia | buka       Uji A / Uji A+B, SEKALI, sesudah tanggalnya
"""
import datetime as dt, gzip, hashlib, json, math, os, random, sys, time
from collections import defaultdict

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
import model_kab_hulu as HU  # noqa: E402  (menambal MK.LATIH/VALIDASI/UJI ke 2016-2023/2024-2025/2026-2027 saat impor)
from umum import ambil as unduh, KuotaHabis  # noqa: E402

MK, ub, G = HU.MK, HU.ub, HU.G
HULU_DIR = HU.KELUAR                        # dibaca saja: sampel, basin, label_latih, dibi_le2025, cache CHIRPS
KELUAR = os.path.join(AKAR, "data/raw/banjir/model_kab_tanah")
CACHE = os.path.join(KELUAR, "era5_land")
PROTOKOL = os.path.join(AKAR, "scripts/banjir/PRAREG-TANAH.md")
SIDIK_JEJAK = os.path.join(AKAR, "scripts/banjir/model_kab_tanah.sidik")
API = "https://archive-api.open-meteo.com/v1/archive"
VAR = ("soil_moisture_0_to_7cm_mean", "soil_moisture_7_to_28cm_mean")
TEBAL = (7, 21)                             # cm: theta 0-28 cm = rerata berbobot tebal
AWAL_T = dt.date(2015, 12, 1)
LAG = 2                                     # hari WIB e-2 berakhir 00.00 WIB e-1
KLIM = (dt.date(2016, 1, 1), dt.date(2023, 12, 31))
KLIM_MIN = 100
SETENGAH = 0.125 + 1e-6                     # titik kisi harus di dalam kotak sel 0,25 derajat
JEDA, TUNDA = 35, 10                        # dtk antarpanggilan (kuota menit 600, satu sel ~265 bobot); hari keterlambatan ERA5-Land
T = ["t2", "t_anom", "t_hx"]
FITUR = HU.FITUR + T
NH = len(HU.FITUR)
I_H3 = MK.FITUR.index("h3")
MODEL = ("M0", "M3", "M0T", "M3T")
KONTRAS = (("M3T", "M3"), ("M0T", "M0"))
ULANG = 10_000
Q_LO, Q_HI = 0.004, 0.996                   # selang 99,2%: sisa anggaran keluarga m = 5 (PRAREG-TANAH §5)

KRITERIA = {
    "pertanyaan": "HT: tanah_ant (t2, t_anom; t_hx hanya LR) ERA5-Land 0-28 cm e-2; kontras M3T-M3 dan M0T-M0",
    "fitur": "theta = (7 s0_7 + 21 s7_28)/28 hari WIB e-2; t_anom = theta - rerata sel-bulan(e-2) 2016-2023 (>=100 hari); t_hx = log1p(h3) t_anom hanya LR; kab = maks atas sel valid",
    "model": "M0 dan M3 resep HULU dilatih ulang pada baris yang sama dengan M0T dan M3T",
    "label_latih": "sama dengan HULU, diverifikasi terhadap label_latih.json HULU",
    "pembagian": "latih 2016-2023, validasi 2024-2025, Uji A 2026-01-01..09-30 (hanya bisa menolak), Uji B 2026-11-01..2027-04-30",
    "alarm": "jumlah alarm sama dengan aturan status.py (>= Waspada, >= Siaga); seri dipecah acak biji 11",
    "ci": "bootstrap 10000 ulangan biji 11, dua skema blok identik keempat model, persentil 0,4 dan 99,6 (99,2%); bawah = terkecil, atas = terbesar",
    "keluarga": "m = 5 (DEBIT, HULU x2, TANAH x2); TANAH memakai sisa anggaran satu-sisi 5 - (2,5 + 0,83 + 0,83) = 0,84% dibagi dua, dibulatkan ke bawah -> 0,4% per kontras; total 4,96%",
    "pemilihan": "kelompok menurut ll silang M0; hiperparameter per model; 5 biji; Platt final di seluruh validasi",
    "sia": "per kontras: dETS Waspada titik <= 0 -> 'tidak terbukti', dihentikan",
    "lulus": "batas bawah dETS Waspada > 0, dETS Siaga > 0, dBSS > 0",
    "tidak_lulus": "dETS Waspada titik <= 0 atau batas atasnya < 0",
    "tidak_meyakinkan": "selain keduanya",
    "latih_ulang": "hanya untuk galat teknis, dengan alasan tertulis di jejak, dicatat sebagai amandemen sebelum sia; jumlahnya dilaporkan di buka",
    "hilang": "sel null gugur per baris; baris tanpa sel tanah valid keluar dari keempat model; titik kisi di luar sel = nodata permanen",
    "tanggal": "sia >= 2027-02-15, buka >= 2027-09-15, CHIRPS (aturan HULU) dan cache tanah lengkap s/d akhir jendela",
}


def aktif(nama, jenis):
    """Indeks fitur aktif. t_hx hanya untuk regresi logistik."""
    a = list(HU.AKTIF["M3" if nama.startswith("M3") else "M0"])
    return a + ([NH, NH + 1] + ([NH + 2] if jenis == "lr" else []) if nama.endswith("T") else [])


_X_LR_HULU, _CEK_HULU = HU.x_lr_h, HU.cek_kelengkapan


def x_lr_t(x):
    return _X_LR_HULU(x) + list(x[NH:])


def sidik_kriteria():
    return hashlib.sha256(json.dumps(KRITERIA, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def terpasang():
    """Mode yang menulis (latih/sia/buka) menolak jalan bila pasang() belum dipanggil: tanpa itu HU.J menulis ke folder HULU."""
    if not getattr(HU, "_TANAH_DIPASANG", False) or HU.x_lr_h is not x_lr_t:
        sys.exit("pasang() belum dipanggil: model_kab_tanah hanya boleh dijalankan sebagai skrip (__main__), ditolak")


def pasang(keluar=KELUAR):
    """HANYA dipanggil dari __main__ (atau swauji): jangan impor modul ini dari modul lain lalu memanggilnya di proses yang juga
    menjalankan HULU. Menunjuk variabel modul HU ke percobaan ini, HANYA di proses ini (berkas HU tidak disentuh): folder keluaran (HU.J), jejak,
    selang, kontras (mde_h), transformasi LR, sidik, kelengkapan. HU.SAMPEL/BASIN/CHIRPS_DIR tetap folder HULU (konstanta impor)."""
    HU.KELUAR, HU.SIDIK_JEJAK = keluar, SIDIK_JEJAK
    HU._TANAH_DIPASANG = True
    HU.Q_LO, HU.Q_HI, HU.KONTRAS = Q_LO, Q_HI, KONTRAS
    HU.x_lr_h = x_lr_t
    HU.sidik_kriteria, HU.sidik_penuh, HU.cek_kelengkapan = sidik_kriteria, sidik_penuh, cek_kelengkapan


# ---------------------------------------------------------------- ERA5-Land: unduh dan cache
def sel_tanah():
    return sorted(HU.kunci(*s) for s in json.load(open(HU.SAMPEL))["sel"])


def jalur_sel(k):
    return os.path.join(CACHE, f"{k}.json.gz")


def baca_sel(k):
    p = jalur_sel(k)
    if not os.path.exists(p):
        return None
    with gzip.open(p, "rt") as f:
        return json.load(f)


def akhir_sel(c):
    return HU.tgl(c["awal"]) + dt.timedelta(len(c["s1"]) - 1)


def url_sel(k, awal, akhir):
    lat, lon = k.split("_")
    return (f"{API}?latitude={lat}&longitude={lon}&start_date={awal}&end_date={akhir}&daily={','.join(VAR)}"
            "&models=era5_land&timezone=Asia%2FJakarta&cell_selection=land")


def urai(d, awal, akhir):
    """Respons satu lokasi -> {grid, s1, s2}; menolak hari bolong/tak urut atau panjang variabel beda."""
    h, n = d["daily"], (akhir - awal).days + 1
    if h["time"] != [(awal + dt.timedelta(i)).isoformat() for i in range(n)]:
        raise ValueError(f"deret harian tidak utuh {awal}..{akhir}: {len(h['time'])} hari")
    if any(len(h[v]) != n for v in VAR):
        raise ValueError("panjang variabel beda dengan waktu")
    for v in VAR:
        for x in h[v]:
            if x is not None and (isinstance(x, bool) or not isinstance(x, (int, float)) or not 0 <= x <= 0.9):
                raise ValueError(f"{v}: nilai di luar 0..0,9 atau bukan angka: {x!r}")
    return {"grid": [d["latitude"], d["longitude"], d.get("elevation")], "s1": h[VAR[0]], "s2": h[VAR[1]]}


def theta(a, b):
    return None if a is None or b is None else (TEBAL[0] * a + TEBAL[1] * b) / sum(TEBAL)


def dalam_sel(k, grid):
    lat, lon = map(float, k.split("_"))
    return abs(grid[0] - lat) <= SETENGAH and abs(grid[1] - lon) <= SETENGAH


def ambil_sel(k, akhir, log):
    """Sambung ekor cache satu sel s/d `akhir`. Nilai lama tidak diunduh ulang. -> bobot kira-kira atau 0."""
    if akhir > dt.date.today() - dt.timedelta(TUNDA):
        sys.exit(f"akhir {akhir} melewati hari ini - {TUNDA} hari: ERA5-Land belum final, ditolak")
    c = baca_sel(k)
    mulai = AWAL_T if c is None else akhir_sel(c) + dt.timedelta(1)
    if mulai > akhir:
        return 0
    url = url_sel(k, mulai, akhir)
    d = unduh(url, batas_waktu=300)
    r = urai(d, mulai, akhir)
    if c and r["grid"][:2] != c["grid"][:2]:
        raise ValueError(f"{k}: titik kisi berubah {c['grid']} -> {r['grid']}")
    r = buang_ekor_null(r, c)
    c = c or {"sel": k, "awal": str(AWAL_T), "grid": r["grid"], "s1": [], "s2": []}
    c["s1"] += r["s1"]
    c["s2"] += r["s2"]
    os.makedirs(CACHE, exist_ok=True)
    with gzip.open(jalur_sel(k) + ".tmp", "wt") as f:
        json.dump(c, f, separators=(",", ":"))
    os.replace(jalur_sel(k) + ".tmp", jalur_sel(k))
    log.write(json.dumps({"sel": k, "awal": str(mulai), "akhir": str(akhir), "grid": r["grid"], "url": url,
                          "sha256_json_kanonik": hashlib.sha256(json.dumps(d, sort_keys=True).encode()).hexdigest(),
                          "waktu": dt.datetime.now().isoformat(timespec="seconds")}) + "\n")
    log.flush()
    return bobot((akhir - mulai).days + 1)


def buang_ekor_null(r, c):
    """Ekor null (hari yang belum terisi) tidak disimpan supaya `ambil` berikutnya mengulangnya. Sel yang seluruhnya null
    (laut) disimpan apa adanya: itu nodata permanen, bukan ekor belum terisi."""
    ada = any(x is not None for x in r["s1"] + r["s2"]) or (c and any(x is not None for x in c["s1"] + c["s2"]))
    n = len(r["s1"])
    while ada and n and (r["s1"][n - 1] is None or r["s2"][n - 1] is None):
        n -= 1
    return {**r, "s1": r["s1"][:n], "s2": r["s2"][:n]}


def bobot(hari):
    """Bobot panggilan Open-Meteo: <= 10 variabel dihitung 1, x hari/14 (minimal 1)."""
    return max(1.0, hari / 14)


def ambil(akhir=None):
    akhir = akhir or dt.date.today() - dt.timedelta(TUNDA)
    if akhir > dt.date.today() - dt.timedelta(TUNDA):
        sys.exit(f"akhir {akhir} melewati hari ini - {TUNDA} hari: ditolak")
    sel = sel_tanah()
    sisa = [k for k in sel if (c := baca_sel(k)) is None or akhir_sel(c) < akhir]
    kira = sum(bobot((akhir - (AWAL_T if (c := baca_sel(k)) is None else akhir_sel(c))).days) for k in sisa)
    print(f"{len(sel)} sel, {len(sisa)} perlu disambung s/d {akhir} (~{kira:.0f} panggilan berbobot; kuota 5.000/jam, 10.000/hari)", flush=True)
    os.makedirs(KELUAR, exist_ok=True)
    with open(os.path.join(KELUAR, "manifest.jsonl"), "a") as log:
        for i, k in enumerate(sisa):
            for coba in range(6):
                try:
                    ambil_sel(k, akhir, log)
                    break
                except KuotaHabis as e:
                    if "Hourly" not in str(e) or coba == 5:
                        print(f"berhenti, kuota habis ({e}); jalankan lagi besok, cache dipakai ulang", flush=True)
                        return False
                    print("  kuota jam habis, tunggu 20 menit", flush=True)
                    time.sleep(1200)
            print(f"  {i + 1}/{len(sisa)} {k}", flush=True)
            if i + 1 < len(sisa):
                time.sleep(JEDA)
    return True


def asap():
    """2 sel x 2 hari ke KELUAR/asap.json (cache tidak disentuh) + perkiraan unduhan penuh."""
    sel, a, b = sel_tanah()[:2], dt.date(2020, 1, 1), dt.date(2020, 1, 2)
    t0, out, byte = time.time(), {}, 0
    for k in sel:
        d = unduh(url_sel(k, a, b), batas_waktu=120)
        byte += len(json.dumps(d["daily"]))   # isi per hari; kepala respons diabaikan
        r = urai(d, a, b)
        out[k] = {**r, "theta": [theta(x, y) for x, y in zip(r["s1"], r["s2"])], "dalam_sel": dalam_sel(k, r["grid"])}
    dtk = time.time() - t0
    hari = (dt.date.today() - dt.timedelta(TUNDA) - AWAL_T).days + 1
    n = len(sel_tanah())
    tot = n * bobot(hari)
    kira = {"sel": n, "hari_per_sel": hari, "bobot_per_sel": round(bobot(hari)), "bobot_total": round(tot),
            "hari_kuota_min": math.ceil(tot / 10_000), "jam_kuota_min": math.ceil(tot / 5_000),
            "byte_per_sel_hari": round(byte / (2 * len(sel))), "mb_total_kira": round(byte / (2 * len(sel)) * hari * n / 1e6, 1),
            "dtk_asap": round(dtk, 1)}
    os.makedirs(KELUAR, exist_ok=True)
    json.dump({"waktu": dt.datetime.now().isoformat(timespec="seconds"), "hasil": out, "perkiraan": kira}, open(os.path.join(KELUAR, "asap.json"), "w"), indent=1)
    print(json.dumps(out, indent=1))
    print("perkiraan unduhan penuh:", kira)


# ---------------------------------------------------------------- deret, klimatologi, fitur
def muat_tanah(keys, akhir):
    """-> ({sel: [theta | None] indeks hari sejak ub.AWAL s/d akhir}, {sel: grid}); menolak cache yang belum sampai `akhir`."""
    n, th, grid = HU.hari_ke(akhir) + 1, {}, {}
    for k in keys:
        c = baca_sel(k)
        if not c or akhir_sel(c) < akhir:
            sys.exit(f"cache ERA5-Land {k} belum sampai {akhir}: jalankan `ambil`")
        g = (ub.AWAL - HU.tgl(c["awal"])).days
        th[k] = [theta(a, b) for a, b in zip(c["s1"][g:g + n], c["s2"][g:g + n])]
        grid[k] = c["grid"]
        if any(x is not None for x in th[k]) and th[k][-1] is None:
            j = n - 1
            while j and th[k][j - 1] is None:
                j -= 1
            sys.exit(f"ERA5-Land {k}: ekor null {ub.AWAL + dt.timedelta(j)}..{akhir} (belum terisi): ditunda, jalankan `ambil` lagi nanti")
    return th, grid


def manifest_tanah(akhir, keys=None):
    """{sel: [grid, sha256 isi s1/s2 s/d akhir]}: tambahan ekor sesudah `akhir` tidak mengubahnya."""
    out = {}
    for k in keys or sel_tanah():
        c = baca_sel(k)
        n = (akhir - HU.tgl(c["awal"])).days + 1 if c else 0
        out[k] = [c["grid"], hashlib.sha256(json.dumps([c["s1"][:n], c["s2"][:n]]).encode()).hexdigest()] if c else None
    return out


def bulan(i):
    return (ub.AWAL + dt.timedelta(i)).month


def klim_tanah(th):
    """{sel: {"bulan": rerata theta}} dari hari kalender KLIM (latih) saja; sel-bulan < KLIM_MIN hari bernilai tidak punya klimatologi."""
    a, b, out = HU.hari_ke(KLIM[0]), HU.hari_ke(KLIM[1]), {}
    for k, s in th.items():
        acc = defaultdict(list)
        for i in range(a, min(b, len(s) - 1) + 1):
            if s[i] is not None:
                acc[bulan(i)].append(s[i])
        out[k] = {str(m): sum(v) / len(v) for m, v in sorted(acc.items()) if len(v) >= KLIM_MIN}
    return out


def info_tanah(sk, kabs, th, grid, akhir_latih):
    """-> ({kab: [sel tanah valid]}, [sel nodata permanen]). Valid = titik kisi di dalam sel dan ada nilai s/d akhir latih."""
    n = HU.hari_ke(akhir_latih) + 1
    mati = sorted(k for k in th if not dalam_sel(k, grid[k]) or all(x is None for x in th[k][:n]))
    out = {}
    for kab in kabs:
        ks = [HU.kunci(*s) for s in sorted(sk[kab]) if HU.kunci(*s) not in mati]
        if ks:
            out[kab] = ks
    return out, mati


def tambah_tanah(B, th, klim, info):
    """Menambah kolom T ke B["X"] dan MEMBUANG baris tanpa sel tanah valid (dari semua model). -> (B baru, statistik)."""
    st, ada, ekstra = {"masuk": len(B["y"]), "kab_dibuang": 0, "tanpa_tanah": 0}, [], []
    for i, (kab, e) in enumerate(zip(B["kab"], B["e"])):
        if kab not in info:
            st["kab_dibuang"] += 1
            continue
        j = e - LAG
        m = str(bulan(j))
        v = [(th[k][j], th[k][j] - klim[k][m]) for k in info[kab] if th[k][j] is not None and m in klim[k]]
        if not v:
            st["tanpa_tanah"] += 1
            continue
        ta = max(x for _, x in v)
        ada.append(i)
        ekstra.append([max(x for x, _ in v), ta, math.log1p(B["X"][i][I_H3]) * ta])
    out = {k: [B[k][i] for i in ada] for k in B if k != "X"}
    out["X"] = [B["X"][i] + x for i, x in zip(ada, ekstra)]
    st["keluar"] = len(ada)
    return out, st


# ---------------------------------------------------------------- model dan penilaian
def cocok(TR, VA, log=None, grid=None, pohon_maks=None):
    """Kelompok menurut ll silang M0; model lain kelompok sama, hiperparameter disetel per model. -> (jenis, mod, ll kelompok, ll terpilih)."""
    h0, l_g0 = HU.tala_gbdt(TR, VA, aktif("M0", "gbdt"), grid, pohon_maks, log)
    m_lr0, l_l0 = HU.latih_lr_h(TR, VA, aktif("M0", "lr"))
    jenis = "gbdt" if l_g0 <= l_l0 else "lr"
    mod, lls = {}, {}
    for n in MODEL:
        a = aktif(n, jenis)
        if jenis == "gbdt":
            h, l = (h0, l_g0) if n == "M0" else HU.tala_gbdt(TR, VA, a, grid, pohon_maks, log)
            mod[n], lls[n] = HU.latih_anggota(TR, VA, a, h), l
        else:
            mod[n], lls[n] = (m_lr0, l_l0) if n == "M0" else HU.latih_lr_h(TR, VA, a)
    return jenis, mod, {"gbdt": l_g0, "lr": l_l0}, lls


def rangkum(B, P, ref, ulang=ULANG, penuh=True):
    y = B["y"]
    out = {"n": len(y), "kej": sum(y), "laju": round(sum(y) / max(1, len(y)), 4), "kab": len(set(B["kab"]))}
    out["probabilitas"] = {m: {"auc": G.auc(p, y), "brier": G.brier(p, y), "logloss": G.logloss(p, y)} for m, p in list(P.items()) + [("klimatologi", ref)]}
    out["kontras"] = HU.boot_kontras(B, P, ref, kontras=KONTRAS, ulang=ulang)
    if penuh:
        ns, sem = HU.n_alarm(B), range(len(y))
        for lv, L in MK.LEVEL_ALARM.items():
            tot = lambda al: HU.ets_t(MK.kontingensi(al, y, sem))
            out["ets_" + lv] = {**{m: round(tot(MK.alarm_sebanyak(p, ns[lv])), 4) for m, p in P.items()}, "aturan": round(tot([l >= L for l in B["level"]]), 4)}
        out["per_pulau"] = HU.per_pulau(B, P, kontras=KONTRAS)
        out["t_anom_kuantil"] = HU.kuantil([x[NH + 1] for x in B["X"]])
    return out


def cetak(pen):
    print(f"  n={pen['n']} kej={pen['kej']} laju={pen['laju']} kab={pen['kab']}")
    for m, v in pen["probabilitas"].items():
        print(f"    {m:12s} AUC {v['auc']:.4f}  Brier {v['brier']:.5f}  logloss {v['logloss']:.5f}")
    for kn, r in pen["kontras"].items():
        b = r["bss"]
        print(f"  TANAH {kn}: dBSS {b['nilai']:+.5f} CI99,2 [{b['ci'][0]:+.5f}, {b['ci'][1]:+.5f}]")
        for lv in MK.LEVEL_ALARM:
            x = r[lv]
            print(f"    >= {lv} (alarm {x['alarm']}): dETS {x['nilai']:+.4f} CI99,2 [{x['ci'][0]:+.4f}, {x['ci'][1]:+.4f}]")


# ---------------------------------------------------------------- sidik
ISI_KAND = ("fitur", "jenis", *MODEL, "kontrol", "mde", "ll_silang", "klim", "frek", "frek_awal", "sel", "kab", "kab_dibuang", "kab_dibuang_t",
            "platt_klim", "klim_tanah", "grid_tanah", "info_tanah", "sel_tanah_mati")


def tambal():
    return {**HU.tambal(), "FITUR_T": FITUR, "LAG": LAG, "TEBAL": TEBAL, "VAR": VAR, "KLIM": [str(x) for x in KLIM], "KLIM_MIN": KLIM_MIN,
            "AKTIF_T": {n: {j: aktif(n, j) for j in ("gbdt", "lr")} for n in MODEL}, "ULANG_T": ULANG, "Q_T": [Q_LO, Q_HI], "KONTRAS_T": KONTRAS}


def sidik_penuh(kand):
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "kand": {k: kand[k] for k in ISI_KAND}, "tambal": tambal()}, sort_keys=True).encode())
    kode = [os.path.abspath(__file__)] + [os.path.join(AKAR, "scripts/banjir", n) for n in (
        "model_kab_hulu.py", "model_kab.py", "uji_balik.py", "status.py", "label_bersatu.py", "umum.py", "model_kab_debit.py", "PRAREG-HULU.md")]
    kode += [os.path.join(AKAR, "scripts/sebaran/gbdt.py"), PROTOKOL, HU.SAMPEL, HU.BASIN, os.path.join(HULU_DIR, "label_latih.json"),
             HU.J("label_latih.json"), HU.J("dibi_le2025.json")]
    h.update(json.dumps(HU.hash_berkas(*kode)).encode())
    h.update(json.dumps(MK.manifest_era5(kand["sel"])).encode())
    h.update(json.dumps(HU.manifest_chirps(HU.AKHIR_LATIH)).encode())
    h.update(json.dumps(manifest_tanah(HU.AKHIR_LATIH), sort_keys=True).encode())
    return h.hexdigest()[:16]


def cek_label_hulu(milik, hulu, dibi_milik, dibi_hulu):
    """Label latih percobaan ini HARUS sama dengan HULU (kunci isi, bukan tanggal dibuat)."""
    a, b = json.load(open(milik)), json.load(open(hulu))
    for k in ("sha256", "n", "sha256_label_bersatu_csv", "sha256_hari_tercakup"):
        if a.get(k) != b.get(k):
            sys.exit(f"label latih beda dengan label_latih.json HULU ({k}): ditolak")
    if HU.sha_berkas_j(dibi_milik) != HU.sha_berkas_j(dibi_hulu):
        sys.exit("salinan DIBI <= 2025 beda dengan dibi_le2025.json HULU: ditolak")


def cek_kelengkapan(kand, akhir):
    _CEK_HULU(kand, akhir)               # sampel, CHIRPS, ERA5 (aturan HULU)
    muat_tanah(sel_tanah(), akhir)


# ---------------------------------------------------------------- data
def data_latih():
    os.makedirs(HU.KELUAR, exist_ok=True)
    D = HU.data_latih()                  # menulis label_latih.json + dibi_le2025.json ke folder percobaan ini (pasang)
    cek_label_hulu(HU.J("label_latih.json"), os.path.join(HULU_DIR, "label_latih.json"), HU.J("dibi_le2025.json"), os.path.join(HULU_DIR, "dibi_le2025.json"))
    th, grid = muat_tanah(sel_tanah(), HU.AKHIR_LATIH)
    info, mati = info_tanah(D["sk"], list(D["info"]), th, grid, HU.AKHIR_LATIH)
    klim = klim_tanah({k: s for k, s in th.items() if k not in mati})
    D.update(th=th, grid_t=grid, info_t=info, mati_t=mati, klim_t=klim)
    return D


def bangun_t(D, tahun, ev):
    B, st_h = HU.bangun_h(D, tahun, ev)
    B, st_t = tambah_tanah(B, D["th"], D["klim_t"], D["info_t"])
    return B, {"hulu": st_h, "tanah": st_t}


def latih(ulang=False, alasan=None):
    terpasang()
    if ulang and not (alasan and alasan.strip()):
        sys.exit("latih --ulang butuh alasan teks (galat teknis saja, PRAREG-TANAH §8): latih --ulang \"<alasan>\"")
    for n in ("sia.mulai", "buka.mulai", "sia.json", "buka.json"):
        if os.path.exists(HU.J(n)):
            sys.exit(f"{n} ada: sia/buka sudah dimulai; latih ulang = eksperimen baru")
    if os.path.exists(HU.J("kandidat.json")) and not ulang:
        sys.exit("kandidat.json sudah ada: latih ulang butuh flag --ulang (menambah baris latih baru di jejak)")
    t0 = time.time()
    D = data_latih()
    TR, st_tr = bangun_t(D, MK.LATIH, D["ev_l"])
    TRd, _ = bangun_t(D, MK.LATIH, D["ev"])
    VA, st_va = bangun_t(D, MK.VALIDASI, D["ev"])
    assert TR["e"] == TRd["e"] and TR["kab"] == TRd["kab"]
    kab_t = sorted(set(D["info"]) - set(D["info_t"]))
    print(f"latih {len(TR['y'])} baris ({sum(TR['y'])} kej gabungan, {sum(TRd['y'])} DIBI), validasi {len(VA['y'])} ({sum(VA['y'])} kej); "
          f"sel tanah mati {D['mati_t']}; kab dibuang tanah {kab_t}; pengecualian latih {st_tr} validasi {st_va}", flush=True)
    jenis, mod, ll, lls = cocok(TR, VA, log=lambda s: print(s, flush=True))
    print(f"  kelompok {jenis} (ll silang M0: {ll}); terpilih {lls}")
    pk_mentah = [D["klim"][f"{k}|{m}"] for k, m in zip(VA["kab"], VA["bulan"])]
    pl_k = MK.platt([MK.logit(p) for p in pk_mentah], VA["y"])
    pk = MK.pakai_platt(pl_k, [MK.logit(p) for p in pk_mentah])
    P = {n: HU.prediksi_h(m, VA["X"]) for n, m in mod.items()}
    pen = rangkum(VA, P, pk)
    modd = HU.latih_ulang_hiper(TRd, VA, jenis, mod)
    kontrol = rangkum(VA, {n: HU.prediksi_h(m, VA["X"]) for n, m in modd.items()}, pk, penuh=False)
    daya = HU.mde_h(VA, P)
    kand = {"versi": "model-kab-tanah-1", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
            "status": "KANDIDAT: Uji A/B belum dibuka", "fitur": FITUR, "jenis": jenis, **mod, "ll_silang": lls, "klim": D["klim"], "frek": D["penuh"],
            "frek_awal": D["awal"], "kontrol": modd, "mde": daya, "sel": [list(s) for s in D["sel"]], "kab": D["kabs"], "kab_dibuang": D["kab_dibuang"],
            "kab_dibuang_t": kab_t, "platt_klim": pl_k, "klim_tanah": D["klim_t"], "grid_tanah": D["grid_t"], "info_tanah": D["info_t"],
            "sel_tanah_mati": D["mati_t"], "sidik_kriteria": sidik_kriteria()}
    kand["sidik"] = sidik_penuh(kand)
    json.dump(kand, open(HU.J("kandidat.json"), "w"), separators=(",", ":"))
    HU.tambah_jejak({"jenis": "latih", "waktu": kand["dibuat"], "sidik": kand["sidik"], "sidik_kriteria": kand["sidik_kriteria"],
                     **({"ulang": True, "alasan": alasan.strip()} if ulang else {})})
    json.dump({"dibuat": kand["dibuat"], "jenis": jenis, "ll_silang_kelompok_m0": ll, "ll_silang_terpilih": lls, "validasi": pen, "kontrol_dibi_saja": kontrol,
               "mde": daya, "pengecualian": {"latih": st_tr, "validasi": st_va}, "kab_dibuang": D["kab_dibuang"], "kab_dibuang_t": kab_t,
               "sel_tanah_mati": D["mati_t"], "hari_kejadian": {"latih_gabungan": sum(TR["y"]), "latih_dibi": sum(TRd["y"]), "validasi": sum(VA["y"])}},
              open(HU.J("latih.json"), "w"), separators=(",", ":"))
    cetak(pen)
    print("kontrol DIBI saja:")
    cetak(kontrol)
    print(f"MDE: {daya}")
    print(f"sidik {kand['sidik']} sidik_kriteria {kand['sidik_kriteria']}; Uji A/B BELUM DIBUKA ({time.time() - t0:.0f} dtk)")
    print("INGAT: commit scripts/banjir/model_kab_tanah.sidik dan model_kab_tanah.py sebelum sia")


# ---------------------------------------------------------------- sia dan buka
def data_uji(kand, jendela, akhir, label):
    B, D = HU.data_uji(kand, jendela, akhir, label)
    th, grid = muat_tanah(sel_tanah(), akhir)
    if grid != kand["grid_tanah"]:
        sys.exit("titik kisi ERA5-Land berubah sejak `latih`: ditolak")
    B, st = tambah_tanah(B, th, kand["klim_tanah"], kand["info_tanah"])
    D["th"], D["pengecualian"] = th, {"hulu": D["pengecualian"], "tanah": st}
    return B, D


def prediksi_uji(kand, B):
    P = {n: HU.prediksi_h(kand[n], B["X"]) for n in MODEL}
    Pk = {n: HU.prediksi_h(kand["kontrol"][n], B["X"]) for n in MODEL}
    return P, HU.p_klim_dari(B, kand["klim"], kand["platt_klim"]), Pk


def hash_jendela(D, awal, akhir):
    a, b = HU.hari_ke(awal) - 31, HU.hari_ke(akhir) + 3
    return {**HU.hash_jendela(D, awal, akhir), "tanah": {k: hashlib.sha256(json.dumps(D["th"][k][a:b]).encode()).hexdigest() for k in sorted(D["th"])}}


def sia():
    terpasang()
    kand = HU.gerbang("sia")
    label = HU.bekukan_label("A", HU.JENDELA_A)
    B, D = data_uji(kand, [HU.JENDELA_A], HU.AKHIR_SIA, label)
    P, pk, Pk = prediksi_uji(kand, B)
    pen = rangkum(B, P, pk)
    kontrol = rangkum(B, Pk, pk, penuh=False)["kontras"]
    v = {kn: HU.vonis_sia_kontras(r) for kn, r in pen["kontras"].items()}
    cetak(pen)
    print("SIA", v)
    json.dump({"tanggal": str(dt.date.today()), "sidik": kand["sidik"], "sha256_label": json.load(open(HU.J("label_A.json")))["sha256"],
               "hash_jendela_A": hash_jendela(D, *HU.JENDELA_A), "pengecualian": D["pengecualian"], "uji_A": pen, "kontrol_dibi_saja": kontrol, "vonis": v},
              open(HU.J("sia.json"), "w"), separators=(",", ":"))
    HU.tambah_jejak({"jenis": "sia", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sha256_sia": HU.sha_berkas_j(HU.J("sia.json")),
                     "sha256_label_A": HU.sha_berkas_j(HU.J("label_A.json"))})
    print("jejak model_kab_tanah.sidik ditambah baris `sia`: COMMIT berkas itu sebelum `buka`")


def buka():
    terpasang()
    kand = HU.gerbang("buka")
    ulang = [b for b in HU.jejak_head() if b.get("jenis") == "latih" and b.get("ulang")]
    s = json.load(open(HU.J("sia.json")))
    labA = HU.bekukan_label("A", HU.JENDELA_A)
    if HU.hash_baris(labA) != s["sha256_label"]:
        sys.exit("label Uji A berubah sejak `sia`")
    labB = HU.bekukan_label("B", HU.JENDELA_B)
    B, D = data_uji(kand, [HU.JENDELA_A, HU.JENDELA_B], HU.AKHIR_BUKA, labA + labB)
    if hash_jendela(D, *HU.JENDELA_A) != s["hash_jendela_A"]:
        sys.exit("deret ERA5/CHIRPS/tanah jendela Uji A berubah sejak `sia`: ditolak")
    P, pk, Pk = prediksi_uji(kand, B)
    pen = rangkum(B, P, pk)
    kontrol = rangkum(B, Pk, pk, penuh=False)["kontras"]
    v = {kn: (HU.vonis_akhir(pen["kontras"][kn], kontrol[kn], HU.mde80_kontras(kand, kn)) if s["vonis"][kn]["vonis"] == "lanjut"
              else {"vonis": "tidak terbukti", "rincian": "dihentikan di Uji A"}) for kn in pen["kontras"]}
    cetak(pen)
    print("VONIS", {k: x["vonis"] for k, x in v.items()}, f"; latih --ulang sebelum sia: {len(ulang)}")
    json.dump({"tanggal": str(dt.date.today()), "sidik": kand["sidik"],
               "sha256_label": {"A": json.load(open(HU.J("label_A.json")))["sha256"], "B": json.load(open(HU.J("label_B.json")))["sha256"]},
               "latih_ulang": {"n": len(ulang), "alasan": [b.get("alasan") for b in ulang]},
               "pengecualian": D["pengecualian"], "uji_final": pen, "kontrol_dibi_saja": kontrol, "vonis": v}, open(HU.J("buka.json"), "w"), separators=(",", ":"))
    HU.tambah_jejak({"jenis": "buka", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sha256_buka": HU.sha_berkas_j(HU.J("buka.json")),
                     "sha256_label_A": HU.sha_berkas_j(HU.J("label_A.json")), "sha256_label_B": HU.sha_berkas_j(HU.J("label_B.json"))})


# ---------------------------------------------------------------- uji (tanpa jaringan)
def uji():
    import tempfile, subprocess, io, contextlib
    global CACHE, SIDIK_JEJAK, data_uji, prediksi_uji, hash_jendela
    # 1. respons Open-Meteo, theta berbobot, titik kisi
    d = {"latitude": -6.2, "longitude": 106.9, "elevation": 4.0,
         "daily": {"time": ["2020-01-01", "2020-01-02"], VAR[0]: [0.40, None], VAR[1]: [0.48, 0.44]}}
    r = urai(d, dt.date(2020, 1, 1), dt.date(2020, 1, 2))
    assert r["grid"] == [-6.2, 106.9, 4.0] and abs(theta(0.40, 0.48) - 0.46) < 1e-12 and theta(None, 0.44) is None
    for rusak in (["2020-01-01", "2020-01-03"], ["2020-01-01"]):
        try:
            urai({**d, "daily": {**d["daily"], "time": rusak}}, dt.date(2020, 1, 1), dt.date(2020, 1, 2))
            raise AssertionError("hari bolong harus ditolak")
        except ValueError:
            pass
    assert dalam_sel("-6.125_106.875", [-6.2, 106.9]) and dalam_sel("-6.125_106.875", [-6.25, 107.0])
    assert not dalam_sel("-6.125_106.875", [-6.3, 106.9]) and not dalam_sel("-6.125_106.875", [-6.1, 107.1])
    assert bobot(3687) > 263 and bobot(3) == 1.0
    for buruk in (1.2, -0.01, "0.4", True):                      # bukan angka atau di luar 0..0,9: ditolak
        try:
            urai({**d, "daily": {**d["daily"], VAR[1]: [buruk, 0.44]}}, dt.date(2020, 1, 1), dt.date(2020, 1, 2))
            raise AssertionError(f"{buruk!r} harus ditolak")
        except ValueError:
            pass
    ek = buang_ekor_null({"grid": [0, 0], "s1": [0.3, 0.3, None, None], "s2": [0.3, 0.3, 0.3, None]}, None)
    assert ek["s1"] == [0.3, 0.3] and ek["s2"] == [0.3, 0.3]     # ekor belum terisi tidak disimpan
    assert buang_ekor_null({"grid": [0, 0], "s1": [None, None], "s2": [None, None]}, None)["s1"] == [None, None]   # laut disimpan
    assert buang_ekor_null({"grid": [0, 0], "s1": [None], "s2": [None]}, {"s1": [0.3], "s2": [0.3]})["s1"] == []
    HU._tolak(lambda: ambil_sel("k", dt.date.today() - dt.timedelta(TUNDA - 1), None), "melewati hari ini")
    terpasang()
    HU._TANAH_DIPASANG = False
    HU._tolak(terpasang, "pasang() belum dipanggil")
    HU._tolak(lambda: latih(), "pasang() belum dipanggil")
    HU._TANAH_DIPASANG = True
    HU._tolak(lambda: latih(True, "  "), "butuh alasan")
    # 2. indeks e-2 (assert pembeda) dan anomali dari latih saja
    n = HU.hari_ke(dt.date(2025, 3, 10)) + 5
    s = [0.30] * n
    e = HU.hari_ke(dt.date(2025, 3, 10))                         # hari validasi; e-2 = 8 Maret 2025
    th = {"a": list(s), "b": list(s)}
    klim = klim_tanah(th)
    assert abs(klim["a"]["3"] - 0.30) < 1e-12 and set(klim["a"]) == {str(m) for m in range(1, 13)}
    info = {"K": ["a", "b"]}
    Bm = lambda: {"kab": ["K", "Z"], "tahun": [2025] * 2, "bulan": [3] * 2, "e": [e, e], "X": [[0.0] * NH, [0.0] * NH], "y": [0, 0], "level": [0, 0]}
    B0, st = tambah_tanah(Bm(), th, klim, info)
    assert B0["kab"] == ["K"] and st["kab_dibuang"] == 1 and len(B0["X"][0]) == len(FITUR) and all(abs(a - b) < 1e-12 for a, b in zip(B0["X"][0][NH:], [0.30, 0.0, 0.0]))
    for geser in (-1, 0, 1):                                    # e-1, e, e+1 tidak boleh mengubah fitur
        th["a"][e + geser] = 0.55
        assert tambah_tanah(Bm(), th, klim, info)[0]["X"][0][NH:] == B0["X"][0][NH:], geser
        th["a"][e + geser] = 0.30
    th["a"][e - 2] = 0.50                                       # e-2 mengubahnya
    x = tambah_tanah(Bm(), th, klim, info)[0]["X"][0][NH:]
    assert abs(x[0] - 0.50) < 1e-12 and abs(x[1] - 0.20) < 1e-12
    th["a"][e - 2] = 0.30
    bx = Bm()
    bx["X"][0][I_H3] = math.e - 1                               # log1p(h3) = 1 -> t_hx = t_anom
    th["b"][e - 2] = 0.40
    assert abs(tambah_tanah(bx, th, klim, info)[0]["X"][0][NH + 2] - 0.10) < 1e-12
    th["b"][e - 2] = 0.30
    i24, i23 = HU.hari_ke(dt.date(2024, 3, 5)), HU.hari_ke(dt.date(2023, 3, 5))
    th["a"][i24] = 0.99                                         # nilai 2024 (validasi) TIDAK boleh mengubah klimatologi
    assert klim_tanah(th)["a"] == klim["a"]
    th["a"][i23] = 0.99                                         # nilai 2023 (latih) mengubahnya
    assert klim_tanah(th)["a"]["3"] > klim["a"]["3"] and klim_tanah(th)["a"]["4"] == klim["a"]["4"]
    th["a"][i24] = th["a"][i23] = 0.30
    th["a"][e - 2] = None                                       # sel null gugur, sel lain dipakai
    th["b"][e - 2] = 0.35
    assert abs(tambah_tanah(Bm(), th, klim, info)[0]["X"][0][NH] - 0.35) < 1e-12
    th["b"][e - 2] = None                                       # semua sel null: baris keluar
    B1, st = tambah_tanah(Bm(), th, klim, info)
    assert B1["kab"] == [] and st["tanpa_tanah"] == 1
    th["a"][e - 2] = th["b"][e - 2] = 0.30
    sedikit = {"a": [None] * n}
    for i in range(HU.hari_ke(dt.date(2016, 3, 1)), HU.hari_ke(dt.date(2016, 3, 31)) + 1):
        sedikit["a"][i] = 0.3                                   # hanya 31 hari Maret di latih: < KLIM_MIN -> tanpa klimatologi
    assert klim_tanah(sedikit)["a"] == {}
    sk = {"K": {(-6.125, 106.875): [0, 0], (-6.375, 106.875): [0, 0]}, "Z": {(-7.125, 110.125): [0, 0]}}
    thi = {"-6.125_106.875": [0.3, None], "-6.375_106.875": [0.3, 0.3], "-7.125_110.125": [None, None]}
    gi = {"-6.125_106.875": [-6.2, 106.9], "-6.375_106.875": [-6.6, 106.9], "-7.125_110.125": [-7.1, 110.1]}
    inf, mati = info_tanah(sk, ["K", "Z"], thi, gi, ub.AWAL + dt.timedelta(1))
    assert inf == {"K": ["-6.125_106.875"]} and mati == ["-6.375_106.875", "-7.125_110.125"]   # kisi di luar sel; semua null
    # 3. fitur aktif dan transformasi LR
    assert aktif("M0T", "gbdt") == HU.AKTIF["M0"] + [NH, NH + 1] and aktif("M3T", "lr") == HU.AKTIF["M3"] + [NH, NH + 1, NH + 2]
    assert aktif("M0", "lr") == HU.AKTIF["M0"] and aktif("M3", "gbdt") == HU.AKTIF["M3"] and FITUR[NH:] == T
    xx = [1.0] * len(FITUR)
    assert len(x_lr_t(xx)) == len(FITUR) and x_lr_t(xx)[NH:] == [1.0] * 3 and HU.x_lr_h is x_lr_t
    # 4. model: sinyal hanya di t_anom -> M0T dan M3T lebih baik; kontras dan selang
    rr = random.Random(7)
    Xs, ys, tahun = [], [], []
    for i in range(1500):
        v = [rr.random() for _ in FITUR]
        Xs.append(v); ys.append(1 if rr.random() < 0.03 + 0.4 * (v[NH + 1] > 0.8) else 0); tahun.append(2024 + i % 2)
    TR_, VA_ = {"X": Xs[:1000], "y": ys[:1000]}, {"X": Xs[1000:], "y": ys[1000:], "tahun": tahun[1000:]}
    jenis, mod, ll, lls = cocok(TR_, VA_, grid=[(2, 0.1)], pohon_maks=20)
    assert set(mod) == set(MODEL) and lls["M0T"] < lls["M0"] and lls["M3T"] < lls["M3"], lls
    assert mod["M3T"]["aktif"] == aktif("M3T", jenis) and json.loads(json.dumps(mod["M0T"])) == mod["M0T"]
    ml, _ = HU.latih_lr_h(TR_, VA_, aktif("M0T", "lr"))
    assert abs(sum(HU.prediksi_h(ml, VA_["X"])) / 500 - sum(VA_["y"]) / 500) < 0.03
    Bs = HU._toy_B()
    Bs["X"] = [[0.0] * len(FITUR) for _ in Bs["y"]]
    sempurna = [0.9 if v else 0.03 for v in Bs["y"]]
    klimk = [sum(Bs["y"]) / len(Bs["y"])] * len(Bs["y"])
    pen = rangkum(Bs, {"M0": klimk, "M3": klimk, "M0T": sempurna, "M3T": klimk}, klimk, ulang=200)
    assert set(pen["kontras"]) == {"M3T-M3", "M0T-M0"} and pen["kontras"]["M0T-M0"]["waspada"]["ci"][0] > 0
    assert HU.vonis_kontras(pen["kontras"]["M0T-M0"])["vonis"] == "LULUS" and HU.vonis_kontras(pen["kontras"]["M3T-M3"])["vonis"] == "TIDAK LULUS"
    assert int(Q_LO * (ULANG - 1)) == 39 and int(Q_HI * (ULANG - 1)) == 9959 and HU.Q_LO == Q_LO
    dm = HU.mde_h(Bs, {"M0": klimk, "M3": klimk, "M0T": sempurna, "M3T": klimk}, target=30, ulang=30, ulangan=4)
    assert set(dm) >= {"M3T-M3", "M0T-M0"} and abs(dm["z"] - 2.652) < 0.01
    # 5. manifest tanah tahan tambahan ekor; label harus sama dengan HULU; gerbang/sia/buka pada data mainan
    simpan = (CACHE, SIDIK_JEJAK, data_uji, prediksi_uji, hash_jendela, HU.KELUAR, HU.SIDIK_JEJAK, HU.JEJAK_REPO, HU.SIA_DARI, HU.BUKA_DARI,
              HU.sidik_penuh, HU.cek_kelengkapan, HU.DIBI_TGL)
    with tempfile.TemporaryDirectory() as tmp:
        try:
            CACHE = os.path.join(tmp, "c")
            os.makedirs(CACHE)
            tulis = lambda k, c: json.dump(c, gzip.open(jalur_sel(k), "wt"))
            tulis("k", {"awal": "2015-12-01", "grid": [0, 0, 0], "s1": [0.1, 0.2, 0.3], "s2": [0.1, 0.2, 0.3]})
            m1 = manifest_tanah(dt.date(2015, 12, 2), ["k"])
            tulis("k", {"awal": "2015-12-01", "grid": [0, 0, 0], "s1": [0.1, 0.2, 0.3, 0.4], "s2": [0.1, 0.2, 0.3, 0.4]})
            assert manifest_tanah(dt.date(2015, 12, 2), ["k"]) == m1 and akhir_sel(baca_sel("k")) == dt.date(2015, 12, 4)
            tulis("k", {"awal": "2015-12-01", "grid": [0, 0, 0], "s1": [0.1, 0.25, 0.3, 0.4], "s2": [0.1, 0.2, 0.3, 0.4]})
            assert manifest_tanah(dt.date(2015, 12, 2), ["k"]) != m1
            ak = ub.AWAL + dt.timedelta(3)                         # muat_tanah: ekor null menunda, laut (semua null) tidak
            tulis("-1.125_100.125", {"awal": str(ub.AWAL), "grid": [0, 0, 0], "s1": [0.3, 0.3, None, None], "s2": [0.3, 0.3, 0.3, 0.3]})
            tulis("-1.375_100.125", {"awal": str(ub.AWAL), "grid": [0, 0, 0], "s1": [None] * 4, "s2": [None] * 4})
            HU._tolak(lambda: muat_tanah(["-1.125_100.125"], ak), "ekor null")
            assert muat_tanah(["-1.375_100.125"], ak)[0]["-1.375_100.125"] == [None] * 4
            assert muat_tanah(["-1.125_100.125"], ub.AWAL + dt.timedelta(1))[0]["-1.125_100.125"] == [0.3, 0.3]
            HU._tolak(lambda: muat_tanah(["-1.375_100.125"], ub.AWAL + dt.timedelta(4)), "belum sampai")
            la, lb_, da, db = (os.path.join(tmp, f) for f in ("la.json", "lb.json", "da.json", "db.json"))
            json.dump({"dibuat": "x", "sha256": "s", "n": 1, "sha256_label_bersatu_csv": "c", "sha256_hari_tercakup": "h"}, open(la, "w"))
            json.dump({"dibuat": "y", "sha256": "s", "n": 1, "sha256_label_bersatu_csv": "c", "sha256_hari_tercakup": "h"}, open(lb_, "w"))
            open(da, "w").write("[1]"); open(db, "w").write("[1]")
            cek_label_hulu(la, lb_, da, db)                     # tanggal dibuat boleh beda
            json.dump({"dibuat": "y", "sha256": "LAIN", "n": 1, "sha256_label_bersatu_csv": "c", "sha256_hari_tercakup": "h"}, open(lb_, "w"))
            HU._tolak(lambda: cek_label_hulu(la, lb_, da, db), "label latih beda")
            json.dump({"dibuat": "y", "sha256": "s", "n": 1, "sha256_label_bersatu_csv": "c", "sha256_hari_tercakup": "h"}, open(lb_, "w"))
            open(db, "w").write("[2]")
            HU._tolak(lambda: cek_label_hulu(la, lb_, da, db), "salinan DIBI")
            repo = os.path.join(tmp, "repo")
            os.makedirs(repo)
            git = lambda *a: subprocess.run(["git", "-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True)
            git("init", "-q")
            open(os.path.join(repo, "x.txt"), "w").write("x"); git("add", "x.txt"); git("commit", "-q", "-m", "awal")
            HU.KELUAR, HU.SIDIK_JEJAK, HU.JEJAK_REPO = tmp, os.path.join(repo, "model_kab_tanah.sidik"), repo
            HU.sidik_penuh, HU.cek_kelengkapan = (lambda k: "x"), (lambda k, a: None)
            HU.DIBI_TGL = os.path.join(tmp, "dibi.json")
            json.dump([[["banjir"], "11", "k0", "2026-02-01", 1], [["banjir"], "11", "k0", "2026-12-01", 1]], open(HU.DIBI_TGL, "w"))
            HU._tolak(lambda: HU.gerbang("sia", dt.date(2027, 2, 14)), "baru boleh")
            kd = {"sidik": "x", "sidik_kriteria": sidik_kriteria(), "mde": None}
            json.dump(kd, open(HU.J("kandidat.json"), "w"))
            HU._tolak(lambda: HU.gerbang("sia", dt.date(2027, 2, 15)), "tidak terlacak")
            HU.tambah_jejak({"jenis": "latih", "sidik": "lama", "sidik_kriteria": kd["sidik_kriteria"]})
            HU.tambah_jejak({"jenis": "latih", "sidik": "x", "sidik_kriteria": kd["sidik_kriteria"], "ulang": True, "alasan": "galat teknis mainan"})
            git("add", "model_kab_tanah.sidik"); git("commit", "-q", "-m", "latih")
            data_uji = lambda kand, jendela, akhir, label: (Bs, {"pengecualian": {}})
            prediksi_uji = lambda kand, B: ({"M0": klimk, "M3": klimk, "M0T": sempurna, "M3T": klimk}, klimk,
                                            {"M0": klimk, "M3": klimk, "M0T": sempurna, "M3T": klimk})
            hash_jendela = lambda D, a, b: {"x": 1}
            HU.SIA_DARI = HU.BUKA_DARI = dt.date(2020, 1, 1)
            with contextlib.redirect_stdout(io.StringIO()):
                sia()
            sv = json.load(open(HU.J("sia.json")))["vonis"]
            assert sv["M0T-M0"]["vonis"] == "lanjut" and sv["M3T-M3"]["vonis"] == "tidak terbukti"
            HU._tolak(lambda: HU.gerbang("sia"), "sudah dimulai")
            HU._tolak(lambda: HU.gerbang("buka"), "beda dari HEAD")      # jejak sia belum di-commit
            git("add", "model_kab_tanah.sidik"); git("commit", "-q", "-m", "sia")
            with contextlib.redirect_stdout(io.StringIO()):
                buka()
            v = json.load(open(HU.J("buka.json")))["vonis"]
            assert v["M0T-M0"]["vonis"] == "LULUS" and v["M3T-M3"]["vonis"] == "tidak terbukti"
            assert json.load(open(HU.J("label_B.json")))["n"] == 1
            assert json.load(open(HU.J("buka.json")))["latih_ulang"] == {"n": 1, "alasan": ["galat teknis mainan"]}
            HU._tolak(lambda: HU.gerbang("buka"), "sudah dimulai")
            HU._tolak(lambda: latih(), "sia/buka sudah dimulai")
        finally:
            (CACHE, SIDIK_JEJAK, data_uji, prediksi_uji, hash_jendela, HU.KELUAR, HU.SIDIK_JEJAK, HU.JEJAK_REPO, HU.SIA_DARI, HU.BUKA_DARI,
             HU.sidik_penuh, HU.cek_kelengkapan, HU.DIBI_TGL) = simpan
    assert HU.KELUAR == KELUAR and HU.SAMPEL.startswith(HULU_DIR) and HU.J("x") == os.path.join(KELUAR, "x")
    print("uji tanah: OK")


if __name__ == "__main__":
    pasang()
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m == "uji":
        uji()
    elif m == "asap":
        asap()
    elif m == "ambil":
        ambil(*(dt.date.fromisoformat(x) for x in sys.argv[2:3]))
    elif m in ("latih", "sia", "buka"):
        ul = "--ulang" in sys.argv
        alasan = sys.argv[sys.argv.index("--ulang") + 1] if ul and len(sys.argv) > sys.argv.index("--ulang") + 1 else None
        {"latih": lambda: latih(ul, alasan), "sia": sia, "buka": buka}[m]()
    else:
        sys.exit(__doc__)
