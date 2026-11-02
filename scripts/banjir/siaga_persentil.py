"""Uji PROSPEKTIF ambang Siaga banjir per kab/kota dari persentil hujan lokal -> public/banjir/data/siaga_persentil_log.json

Protokol: PRAREG-SIAGA-PERSENTIL.md (ditulis dan disidik SEBELUM catatan bayangan pertama; baca dulu).
Aturan uji = status.level_banjir produksi, KECUALI ambang H3 Siaga kab = ambang Ps 96,6 yang sudah dibekukan di
ambang_persentil (tabel AMBANG_MENTAH di bawah), dijepit ke [40, 120] mm. Waspada, Awas, imax, InaRISK B, sungai RK, P3 tetap.
Tidak menyunting status.py, uji_balik.py, umum.py, ambang_persentil.py, prospektif.py (hanya mengimpor status.py).

  python3 scripts/banjir/siaga_persentil.py segel   tulis sidik (sekali; menolak bila sidik ada atau log sudah berisi)
  python3 scripts/banjir/siaga_persentil.py         catat: harian, sesudah status.py (butuh hujan.json segar hari ini WIB)
  python3 scripts/banjir/siaga_persentil.py nilai   menilai bulan DIBI matang -> siaga_persentil_skor.json (vonis dikunci sekali)
  python3 scripts/banjir/siaga_persentil.py uji     swauji luring

Log (append-only, entri tak pernah diubah, tak boleh menyusut vs git HEAD: kode 3):
  {"versi": 1, "n_kab": 40, "terbit": {"2026-11-02": {"hari": [4 tanggal], "kab": {"prov|kab": [[sekarang, persentil] x 4]}}}}
  level kab = kecamatan tertinggi 0..3; SEMUA 40 kab sampel selalu ditulis (tak ada kab "hilang berarti nol").
"""
import ast, datetime as dt, hashlib, json, os, random, re, subprocess, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import status as S
from umum import AKAR, KELUAR, MENTAH, WIB, baca, simpan

LOG = os.path.join(KELUAR, "siaga_persentil_log.json")
SKOR = os.path.join(KELUAR, "siaga_persentil_skor.json")
SIDIK = os.path.join(AKAR, "scripts/banjir/siaga_persentil.sidik")
PROTOKOL = os.path.join(AKAR, "scripts/banjir/PRAREG-SIAGA-PERSENTIL.md")
LB = os.path.join(AKAR, "public/data/logbook_kejadian.json")
DIBI = os.path.join(MENTAH, "dibi_tanggal.json")
REL_LOG, REL_SKOR, REL_SIDIK = "public/banjir/data/siaga_persentil_log.json", "public/banjir/data/siaga_persentil_skor.json", "scripts/banjir/siaga_persentil.sidik"
JANGKAR_COMMIT = "17256d9cb33c0fa9962b875d4a60b370ed4821c8"   # commit yang memuat protokol + kode + sidik; diisi SESUDAH commit pendaftaran. Di luar sidik. Kosong = vonis tidak dikunci.
HARI = 4
JENIS_LB = {"banjir", "banjir_bandang", "banjir_longsor"}
BELUM, LULUS, TIDAK_LULUS, TIDAK_MEYAKINKAN = "BELUM CUKUP", "LULUS", "TIDAK LULUS", "TIDAK MEYAKINKAN"

KRITERIA = {"tanggal_registrasi": "2026-11-02", "jendela_mulai": "2026-11-02", "jendela_akhir": "2027-04-30", "tunda_primer": 1, "ambang_status": 2,
            "n_hari_min": 90, "kejadian_min": 60, "matang_hari": 183,
            "jangkar_batas": "2026-11-04", "tak_tercatat_maks": 0.15, "boot_b": 1000, "benih_minggu": 1, "benih_hari": 7, "blok_hari": 7,
            "selang_persen": 95, "dets_min": 0.005, "rasio_alarm_maks": 1.25, "jepit_mm": [40.0, 120.0]}

# Ambang H3 Siaga mentah (Ps 96,6) per kab, disalin dari public/banjir/data/ambang_persentil.json (sidik ambang_persentil 0f07e695...).
AMBANG_SUMBER_SIDIK = "0f07e6957aadd989168962c5f77a1c4db34ca596342c5a3f8e9888dd62a61491"
AMBANG_MENTAH = {
    "11|Aceh Selatan": 120.2, "11|Aceh Tenggara": 96.4, "12|Kota Medan": 64.7, "13|Kota Pariaman": 114.5, "13|Padang Pariaman": 100.8,
    "15|Kota Sungai Penuh": 79.4, "32|Bogor": 62.3, "32|Kota Banjar": 79.3, "32|Kota Bogor": 66.5, "32|Kota Depok": 58.4, "32|Kota Sukabumi": 71.3,
    "32|Sukabumi": 79.5, "33|Banyumas": 85.0, "33|Cilacap": 80.3, "33|Kota Magelang": 89.5, "33|Kota Semarang": 67.4, "33|Magelang": 83.4,
    "33|Temanggung": 87.3, "36|Kota Tangerang Selatan": 58.4, "51|Badung": 82.8, "51|Bangli": 90.4, "51|Buleleng": 81.3, "51|Karangasem": 99.3,
    "51|Kota Denpasar": 74.0, "51|Tabanan": 86.9, "52|Kota Bima": 72.9, "63|Balangan": 49.5, "63|Tapin": 60.7, "64|Kota Balikpapan": 53.8,
    "64|Kota Bontang": 56.5, "64|Kota Samarinda": 63.6, "64|Penajam Paser Utara": 61.5, "65|Kota Tarakan": 57.1, "73|Luwu Utara": 84.9,
    "73|Tana Toraja": 118.9, "75|Gorontalo": 79.2, "75|Kota Gorontalo": 90.1, "81|Kota Ambon": 51.5, "82|Halmahera Utara": 84.0, "92|Manokwari": 81.8,
}


def ambang_siaga(kab, K=KRITERIA):
    lo, hi = K["jepit_mm"]
    return min(max(AMBANG_MENTAH[kab], lo), hi)


def level_sp(h3, bahaya, rk, imax=None, cape=None, p3=None, s=80.0):
    """Salinan S.level_banjir (k 0,8) dengan ambang H3 Siaga = s; Waspada 40 dan Awas 120 tetap."""
    imax, cape, p3 = imax or 0, cape or 0, p3 or 0
    w, _, a = S.ambang(S.K_BANJIR)
    if rk == 3 or (h3 >= a and bahaya >= 0.66):
        return 3
    if rk == 2 or (bahaya >= 0.33 and (h3 >= s or imax >= 30 or p3 >= 0.5)):
        return 2
    if rk == 1 or h3 >= w or imax >= 20 or (cape >= 2500 and h3 >= w):
        return 1
    return 0


def hitung_hari(hujan, sungai, bahaya, ens, kec, sampel, amb=ambang_siaga):
    """Masukan produksi yang sama dengan status.py main() -> {kab: [[level_sekarang, level_persentil] x 4]} untuk kab sampel."""
    sel, hari_ini = hujan["sel"], hujan["hari_ini"]
    i0 = hujan["hari"].index(hari_ini)
    petak = {(S.math.floor(g["lat"] / sel), S.math.floor(g["lon"] / sel)): g for g in hujan["grid"]}
    titik = (sungai or {}).get("titik", [])
    j0 = sungai["hari"].index(hari_ini) if sungai and hari_ini in sungai["hari"] else 3
    bh = (bahaya or {}).get("kec", {})
    e0 = ens["hari"].index(hari_ini) if ens and hari_ini in ens["hari"] else None

    def sel_terdekat(la, lo):
        gy, gx = S.math.floor(la / sel), S.math.floor(lo / sel)
        if (gy, gx) in petak:
            return petak[(gy, gx)]
        dekat = [petak[k] for k in ((gy + a, gx + b) for a in (-1, 0, 1) for b in (-1, 0, 1)) if k in petak]
        return min(dekat or hujan["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)

    def p3_terdekat(la, lo):
        if e0 is None:
            return None
        e = min(ens["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)
        return e["p3"] if abs(e["lat"] - la) <= 1 and abs(e["lon"] - lo) <= 1 else None

    out = {k: [[0, 0] for _ in range(HARI)] for k in sampel}
    ada = set()
    for k, c in kec.items():
        kab = "|".join(k.split("|")[:2])
        if kab not in out:
            continue
        ada.add(kab)
        g = sel_terdekat(c["lat"], c["lon"])
        b = bh.get(k, {}).get("banjir", 0)
        sg, jarak = None, S.RADIUS_SUNGAI_KM
        for i, t in enumerate(titik):
            if abs(t["lat"] - c["lat"]) < 0.25 and abs(t["lon"] - c["lon"]) < 0.25:
                d = S.km(c["lat"], c["lon"], t["lat"], t["lon"])
                if d <= jarak:
                    sg, jarak = i, d
        p3 = p3_terdekat(c["lat"], c["lon"])
        s = amb(kab)
        for d in range(HARI):
            h3 = S.jendela(g["h"], i0 + d + S.GESER)
            rk = S.kelas_sungai(titik[sg]["q"], j0 + d, titik[sg]) if sg is not None else None
            im, cp = S.puncak(g.get("imax"), i0 + d + S.GESER), S.puncak(g.get("cape"), i0 + d + S.GESER)
            pp = p3[e0 + d] if p3 and e0 + d < len(p3) else None
            ls, lp = S.level_banjir(h3, b, rk, im, cp, pp), level_sp(h3, b, rk, im, cp, pp, s)
            out[kab][d] = [max(out[kab][d][0], ls), max(out[kab][d][1], lp)]
    hilang = sorted(set(sampel) - ada)
    if hilang:
        raise ValueError(f"kab sampel tanpa kecamatan: {hilang}")
    return out


def beda_status(kab, st):
    """Level 'sekarang' hitungan sendiri vs status.json produksi (kecamatan tertinggi per kab) -> daftar ketidakcocokan."""
    ref = defaultdict(lambda: [0] * HARI)
    for k, v in st["kec"].items():
        r = ref["|".join(k.split("|")[:2])]
        for d in range(HARI):
            r[d] = max(r[d], v["b"][d])
    return [(k, d, [x[0] for x in v][d], ref[k][d]) for k, v in kab.items() for d in range(HARI) if v[d][0] != ref[k][d]]


def segar(hujan, st, hari_wib):
    """None bila boleh dicatat; selain itu alasan menolak (hujan.json basi: hari_ini bukan hari ini WIB)."""
    if not hujan or not st:
        return "hujan.json/status.json belum ada"
    if hujan["hari_ini"] != hari_wib:
        return f"hujan.json basi: hari_ini {hujan['hari_ini']} bukan hari ini WIB {hari_wib}"
    if st["hari"][0] != hujan["hari_ini"]:
        return f"status.json hari ke-0 {st['hari'][0]} bukan hari ini {hujan['hari_ini']}"
    return None


def periksa(lama, baru):
    """Menolak tulisan yang menyusutkan/mengubah catatan."""
    if lama is None:
        return
    for t, e in lama["terbit"].items():
        if t not in baru["terbit"]:
            raise ValueError(f"entri {t} hilang: log tidak boleh menyusut")
        if baru["terbit"][t] != e:
            raise ValueError(f"entri {t} berubah: log tidak pernah diubah")
    if baru["n_kab"] < 1:
        raise ValueError("n_kab kosong")


def tambah(log, tgl, e, n_kab, K=KRITERIA):
    baru = json.loads(json.dumps(log))
    if tgl in baru["terbit"] or (baru["terbit"] and tgl < max(baru["terbit"])) or not (K["jendela_mulai"] <= tgl <= K["jendela_akhir"]):
        return None  # sudah tercatat, mundur, atau di luar jendela: tidak dicatat, tidak ditimpa
    baru["terbit"][tgl], baru["n_kab"] = e, n_kab
    periksa(log, baru)
    return baru


def git_teks(rev_jalur):
    try:
        r = subprocess.run(["git", "show", rev_jalur], cwd=AKAR, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout if r.returncode == 0 else None


def git_json(rel):
    t = git_teks(f"HEAD:{rel}")
    try:
        return json.loads(t) if t else None
    except ValueError:
        return None


def tercatat_git(rel=REL_LOG):
    try:
        return subprocess.run(["git", "ls-files", "--error-unmatch", rel], cwd=AKAR, capture_output=True).returncode == 0
    except OSError:
        return False


def cek_arsip(lokal, git_ver):
    """Log lokal lebih pendek/berubah dari git HEAD: kode 3 (langkah bash -e berhenti)."""
    if git_ver is None:
        print("siaga_persentil: HEAD belum punya log (pertama kali, atau git tak tersedia); lanjut", file=sys.stderr)
        return
    try:
        periksa(git_ver, lokal if lokal is not None else {"terbit": {}, "n_kab": 1})
    except ValueError as e:
        print(f"siaga_persentil: log tidak boleh menyusut/berubah dibanding git HEAD ({e})", file=sys.stderr)
        sys.exit(3)


# ---- label dan penilaian ----
def nm(s):
    return re.sub(r"[^a-z0-9]", "", re.sub(r"^(kab\.|kabupaten)\s*", "", s.strip().lower()))


def label(dibi, lb, kabs, sumber="gab"):
    """-> {(kab, tanggal)}. sumber: 'dibi' = DIBI banjir/bandang >= 1 kejadian; 'logbook' = logbook Pusdalops banjir/bandang/banjir_longsor
    hari mulai (terlihat[0] bila mulai kosong); 'gab' = keduanya (label utama). kabs = kunci 'prov|kab' sampel; logbook dicocokkan
    lewat nama provinsi + nama kab (tanpa 'Kab.')."""
    ev = set()
    if sumber in ("gab", "dibi"):
        ev = {(f"{p}|{kb}", tgl) for jenis, p, kb, tgl, n in dibi if n >= 1 and {"banjir", "bandang"} & set(jenis) and f"{p}|{kb}" in kabs}
    if sumber in ("gab", "logbook"):
        from wilayah import PROVINSI
        idx = {(PROVINSI.get(k.split("|")[0]), nm(k.split("|")[1])): k for k in kabs}
        for e in lb:
            k = idx.get((e.get("prov"), nm(e.get("kab") or "")))
            hari = e.get("mulai") or (e.get("terlihat") or [None])[0]
            if k and hari and e.get("jenis") in JENIS_LB:
                ev.add((k, hari))
    return ev


def bulan_matang(kini, K=KRITERIA):
    """Bulan jendela YYYY-MM matang bila kini >= hari terakhir bulan itu + matang_hari (lag DIBI nyata ~5 bulan + cadangan). Murni umur:
    tanpa data, tanpa median, tidak bisa disetel."""
    def akhir(ym):  # hari terakhir bulan
        y, m = int(ym[:4]), int(ym[5:])
        return dt.date(y + (m == 12), m % 12 + 1, 1) - dt.timedelta(days=1)
    return {ym for ym in bulan_jendela(K) if akhir(ym) + dt.timedelta(days=K["matang_hari"]) <= dt.date.fromisoformat(kini)}


def bulan_jendela(K=KRITERIA):
    """Bulan YYYY-MM yang memuat sasaran primer dari semua terbit dalam jendela."""
    a = dt.date.fromisoformat(K["jendela_mulai"]) + dt.timedelta(days=K["tunda_primer"])
    z = dt.date.fromisoformat(K["jendela_akhir"]) + dt.timedelta(days=K["tunda_primer"])
    return {str(a + dt.timedelta(days=i))[:7] for i in range((z - a).days + 1)}


def baris_terbit(log, ev, matang, tunda, K=KRITERIA):
    """-> [(terbit, kab, vektor 8)]; vektor = (a,b,c,d sekarang, a,b,c,d persentil), satu kab-hari satu sel. Hanya terbit dalam jendela
    dan sasaran jatuh di bulan matang (matang = himpunan YYYY-MM; label belum matang TIDAK dinilai dan tidak diisi nol)."""
    out = []
    for terbit in sorted(log["terbit"]):
        e = log["terbit"][terbit]
        if not (K["jendela_mulai"] <= terbit <= K["jendela_akhir"]) or len(e["hari"]) <= tunda or e["hari"][tunda][:7] not in matang:
            continue
        tgt = e["hari"][tunda]
        for kab, v in e["kab"].items():
            kena, vec = (kab, tgt) in ev, [0] * 8
            for j in (0, 1):
                ya = v[tunda][j] >= K["ambang_status"]
                vec[4 * j + (0 if ya and kena else 1 if ya else 2 if kena else 3)] = 1
            out.append((terbit, kab, tuple(vec)))
    return out


def jumlah(vs):
    return tuple(sum(c) for c in zip(*vs)) if vs else (0,) * 8


def ets(t):
    a, b, c, d = t
    n = a + b + c + d
    ar = (a + b) * (a + c) / n if n else 0
    return (a - ar) / (a + b + c - ar) if n and (a + b + c - ar) else None


def dets(tot):
    es, ep = ets(tot[:4]), ets(tot[4:])
    return None if es is None or ep is None else ep - es


def metrik(t):
    a, b, c, d = t
    bagi = lambda x, y: round(x / y, 4) if y else None
    e = ets(t)
    return {"a": a, "b": b, "c": c, "d": d, "alarm": a + b, "pod": bagi(a, a + c), "far": bagi(b, a + b), "csi": bagi(a, a + b + c),
            "ets": None if e is None else round(e, 4)}


def selang(xs, K=KRITERIA):
    xs = sorted(xs)
    if len(xs) < 100:
        return None
    sisi = (100 - K["selang_persen"]) / 200
    return [round(xs[int(sisi * len(xs))], 4), round(xs[min(int((1 - sisi) * len(xs)), len(xs) - 1)], 4)]


def boot_minggu(baris, K=KRITERIA):
    """Utama: resampel blok kab x minggu-ISO-terbit dengan pengembalian, kedua aturan memakai resampel yang sama."""
    blok = defaultdict(list)
    for terbit, kab, v in baris:
        blok[(kab, dt.date.fromisoformat(terbit).isocalendar()[:2])].append(v)
    vs = [jumlah(x) for x in blok.values()]
    rng, n, hasil = random.Random(K["benih_minggu"]), len(vs), []
    for _ in range(K["boot_b"] if n else 0):
        d = dets(jumlah([vs[rng.randrange(n)] for _ in range(n)]))
        if d is not None:
            hasil.append(d)
    return selang(hasil, K)


def boot_hari(baris, K=KRITERIA):
    """Kepekaan: blok-bergerak 7 hari atas hari terbit (menangkap korelasi antar kab pada hari yang sama)."""
    per = defaultdict(list)
    for terbit, kab, v in baris:
        per[terbit].append(v)
    hari = [jumlah(per[t]) for t in sorted(per)]
    rng, n, bl, hasil = random.Random(K["benih_hari"]), len(hari), K["blok_hari"], []
    for _ in range(K["boot_b"] if n else 0):
        pilih = []
        while len(pilih) < n:
            i = rng.randrange(0, max(n - bl + 1, 1))
            pilih += hari[i:i + bl]
        d = dets(jumlah(pilih[:n]))
        if d is not None:
            hasil.append(d)
    return selang(hasil, K)


def dets_bulan(baris, tunda):
    """Kepekaan (bukan gerbang): dETS dan jumlah kejadian per bulan sasaran."""
    per = defaultdict(list)
    for terbit, kab, v in baris:
        per[str(dt.date.fromisoformat(terbit) + dt.timedelta(days=tunda))[:7]].append(v)
    out = {}
    for ym in sorted(per):
        tot = jumlah(per[ym])
        d = dets(tot)
        out[ym] = {"n_kejadian": tot[0] + tot[2], "dets": None if d is None else round(d, 4)}
    return out


def kelengkapan(log, kini, K=KRITERIA):
    """-> (hari terbit tercatat dalam jendela, hari kalender jendela sampai min(jendela_akhir, kini))."""
    akhir = min(K["jendela_akhir"], kini)
    kal = (dt.date.fromisoformat(akhir) - dt.date.fromisoformat(K["jendela_mulai"])).days + 1
    return sum(1 for t in log["terbit"] if K["jendela_mulai"] <= t <= akhir), max(kal, 0)


def vonis(n_hari, kejadian, d, lo_minggu, lo_hari, alarm_p, alarm_s, tercatat, kalender, K=KRITERIA):
    if n_hari < K["n_hari_min"] or kejadian < K["kejadian_min"] or d is None:
        return BELUM
    if d <= 0:
        return TIDAK_LULUS
    lengkap = kalender > 0 and kalender - tercatat <= K["tak_tercatat_maks"] * kalender
    ok = (d >= K["dets_min"] and lo_minggu is not None and lo_minggu > 0 and lo_hari is not None and lo_hari > 0
          and alarm_p <= K["rasio_alarm_maks"] * alarm_s and lengkap)
    return LULUS if ok else TIDAK_MEYAKINKAN


def nilai_semua(log, ev, matang, kini, selesai, K=KRITERIA):
    """-> hasil satu set label: tabel semua waktu-tunda (deskriptif) + vonis di waktu-tunda primer.
    vonis_berjalan = BELUM selama jendela belum selesai (perkiraan_sementara hanya informasi)."""
    out = {"tunda": {}}
    for tunda in range(HARI):
        br = baris_terbit(log, ev, matang, tunda, K)
        tot = jumlah([v for _, _, v in br])
        out["tunda"][str(tunda)] = {"hari_dinilai": len({t for t, _, _ in br}), "sekarang": metrik(tot[:4]), "persentil": metrik(tot[4:])}
    br = baris_terbit(log, ev, matang, K["tunda_primer"], K)
    tot = jumlah([v for _, _, v in br])
    d, lm, lh = dets(tot), boot_minggu(br, K), boot_hari(br, K)
    nh, (tc, kal) = len({t for t, _, _ in br}), kelengkapan(log, kini, K)
    andai = vonis(nh, tot[0] + tot[2], d, lm[0] if lm else None, lh[0] if lh else None, tot[4] + tot[5], tot[0] + tot[1], tc, kal, K)
    out.update({"n_hari": nh, "n_kejadian": tot[0] + tot[2], "dets": None if d is None else round(d, 4), "ci_kab_minggu": lm, "ci_blok_hari": lh,
                "alarm_sekarang": tot[0] + tot[1], "alarm_persentil": tot[4] + tot[5],
                "rasio_alarm": round((tot[4] + tot[5]) / (tot[0] + tot[1]), 3) if tot[0] + tot[1] else None,
                "hari_tercatat": tc, "hari_kalender_jendela": kal, "dets_per_bulan": dets_bulan(br, K["tunda_primer"]),
                "perkiraan_sementara": andai, "vonis_berjalan": andai if selesai else BELUM})
    return out


def jendela_selesai(matang, K=KRITERIA):
    """Semua bulan sasaran jendela matang menurut umur (satu-satunya saat vonis boleh dikunci; paling cepat 2027-11-30)."""
    return bulan_jendela(K) <= set(matang)


def laporan_dibi_sampel(dibi, kabs, K=KRITERIA):
    """Laporan SAJA (bukan gerbang): baris DIBI banjir/bandang 40 kab sampel per bulan jendela vs rata-rata bulan kalender yang sama 2023-2025
    untuk kab yang sama, supaya terlihat bila DIBI masih bolong. -> {YYYY-MM: {baris, rata_2023_2025}}"""
    cnt = defaultdict(int)
    for jenis, p, kb, tgl, n in dibi:
        if n >= 1 and {"banjir", "bandang"} & set(jenis) and f"{p}|{kb}" in kabs:
            cnt[tgl[:7]] += 1
    return {ym: {"baris": cnt.get(ym, 0), "rata_2023_2025": round(sum(cnt.get(f"{y}-{ym[5:]}", 0) for y in (2023, 2024, 2025)) / 3, 1)}
            for ym in sorted(bulan_jendela(K))}


def susun_skor(log, dibi, lb, lama, kini, masukan, K=KRITERIA, jangkar=None):
    kabs = set(next(iter(log["terbit"].values()))["kab"]) if log["terbit"] else set()
    matang = bulan_matang(kini, K)
    selesai = jendela_selesai(matang, K)
    utama, dibi_saja, lb_saja = (nilai_semua(log, label(dibi, lb, kabs, s), matang, kini, selesai, K) for s in ("gab", "dibi", "logbook"))
    akhir = (lama or {}).get("vonis_akhir")
    jangkar = JANGKAR_COMMIT if jangkar is None else jangkar
    masukan = {**masukan, "n_hari_terbit": len(log["terbit"])}
    if akhir is None and jangkar and selesai:
        akhir = {"vonis": utama["vonis_berjalan"], "dikunci_pada": kini, "n_hari": utama["n_hari"], "rasio_alarm": utama["rasio_alarm"],
                 "dets": utama["dets"], "jangkar": jangkar, "masukan": masukan}
    return {"versi": 1, "diperbarui": kini, "kriteria": K, "bulan_matang": sorted(matang), "laporan_dibi_sampel": laporan_dibi_sampel(dibi, kabs, K),
            "bulan_jendela_belum_matang": sorted(bulan_jendela(K) - matang), "jendela_selesai": selesai, "masukan": masukan,
            "jangkar_commit": jangkar or None, "n_terbit": len(log["terbit"]), "n_kab": len(kabs),
            "utama_dibi_atau_logbook": utama, "kepekaan_dibi_saja": dibi_saja, "kepekaan_logbook_saja": lb_saja,
            "vonis_berjalan": utama["vonis_berjalan"], "perkiraan_sementara": utama["perkiraan_sementara"], "rasio_alarm": utama["rasio_alarm"],
            "vonis_akhir": akhir,
            "catatan": "Sampel 40 kab ambang_persentil, bukan nasional. LULUS hanya membuka keputusan pemilik + validasi-model; status.py tidak diubah otomatis. "
                       "Prakiraan Open-Meteo forecast (best match) nyata; label DIBI kurang catat kejadian kecil (FAR mutlak pesimistis)."}


def sha_berkas(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def pastikan_ambang(k=None):
    """status.py berubah di tengah musim: catat berhenti (kode 4), bukan diam-diam bergeser."""
    k = S.K_BANJIR if k is None else k
    if S.ambang(k) != [40.0, 80.0, 120.0]:
        print(f"siaga_persentil: ambang status.py {S.ambang(k)} bukan [40, 80, 120]: tolak", file=sys.stderr)
        sys.exit(4)


def pastikan_jangkar(hari_ini, jangkar, K=KRITERIA):
    """Tanpa jangkar commit sesudah masa tenggang, catat berhenti (kode 4): catatan tak berjangkar tak bisa dipertanggungjawabkan."""
    if not jangkar and hari_ini > K["jangkar_batas"]:
        print(f"siaga_persentil: JANGKAR_COMMIT kosong padahal {hari_ini} > {K['jangkar_batas']}: tolak", file=sys.stderr)
        sys.exit(4)


def pastikan_sama(salah):
    """Level 'sekarang' hitungan sendiri beda dari status.json: kode 1 (peringatan di workflow), tidak dicatat."""
    if salah:
        sys.exit(f"level 'sekarang' hitungan sendiri beda dari status.json ({len(salah)} sel, mis. {salah[:3]}): tidak dicatat")


# ---- sidik ----
STATUS_FN = ("ambang", "jendela", "puncak", "kelas_sungai", "km", "level_banjir")
INTI = ("ambang_siaga", "level_sp", "hitung_hari", "beda_status", "segar", "periksa", "tambah", "cek_arsip", "nm", "label",
        "bulan_matang", "bulan_jendela", "baris_terbit", "jumlah", "ets", "dets", "metrik", "selang", "boot_minggu", "boot_hari",
        "dets_bulan", "kelengkapan", "vonis", "nilai_semua", "jendela_selesai", "susun_skor", "jangkar_leluhur", "waktu_jangkar", "sha_berkas", "pastikan_ambang", "pastikan_jangkar",
        "pastikan_sama", "sidik_inti", "sumber_status", "hitung_sidik", "pastikan_sidik", "main_catat", "main_nilai")


def sidik_inti():
    kode = open(os.path.abspath(__file__)).read()
    fn = {n.name: ast.get_source_segment(kode, n) for n in ast.parse(kode).body if isinstance(n, ast.FunctionDef) and n.name in INTI}
    assert set(fn) == set(INTI), set(INTI) ^ set(fn)
    return fn


def sumber_status():
    """sha256 sumber fungsi status.py yang dipakai aturan: mengubahnya = sidik berubah."""
    kode = open(S.__file__).read()
    fn = {n.name: hashlib.sha256(ast.get_source_segment(kode, n).encode()).hexdigest() for n in ast.parse(kode).body
          if isinstance(n, ast.FunctionDef) and n.name in STATUS_FN}
    assert set(fn) == set(STATUS_FN), set(STATUS_FN) ^ set(fn)
    return fn


def hitung_sidik():
    h = hashlib.sha256()
    konst = {"JENIS_LB": sorted(JENIS_LB), "HARI": HARI, "K_BANJIR": S.K_BANJIR, "GESER": S.GESER, "RADIUS_SUNGAI_KM": S.RADIUS_SUNGAI_KM}
    for bagian in (open(PROTOKOL).read(), json.dumps(sidik_inti(), sort_keys=True), json.dumps(KRITERIA, sort_keys=True),
                   json.dumps(AMBANG_MENTAH, sort_keys=True), json.dumps(sumber_status(), sort_keys=True),
                   json.dumps(konst, sort_keys=True)):
        h.update(hashlib.sha256(bagian.encode()).digest())
    return h.hexdigest()


def baca_sidik():
    return [json.loads(x) for x in open(SIDIK).read().splitlines() if x.strip()] if os.path.exists(SIDIK) else []


def jangkar_leluhur(jangkar, cwd=AKAR):
    try:
        return subprocess.run(["git", "merge-base", "--is-ancestor", jangkar, "HEAD"], cwd=cwd, capture_output=True, timeout=30).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def waktu_jangkar(jangkar, cwd=AKAR):
    """Tanggal (YYYY-MM-DD, zona waktu commit) commit jangkar; None bila tak tersedia."""
    try:
        r = subprocess.run(["git", "show", "-s", "--format=%cI", jangkar], cwd=cwd, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.strip()[:10] if r.returncode == 0 and r.stdout.strip() else None


def pastikan_sidik(jejak=None, jangkar=None, leluhur=None, tgl_jangkar=None, terbit_pertama=None):
    """-> baris segel. Sidik berubah/tak cocok jangkar, jangkar bukan leluhur HEAD, atau commit jangkar lebih baru daripada entri log pertama = kode 4;
    sidik belum ada = kode 1. leluhur/tgl_jangkar/terbit_pertama bisa disuntik (swa-uji)."""
    jejak = baca_sidik() if jejak is None else jejak
    jangkar = JANGKAR_COMMIT if jangkar is None else jangkar
    if not jejak:
        sys.exit("siaga_persentil.sidik belum ada: jalankan `segel` dulu (setelah protokol final)")
    seg = jejak[-1]

    def tolak(pesan):
        print(f"siaga_persentil: {pesan}: tolak", file=sys.stderr)
        sys.exit(4)
    if seg["sidik"] != hitung_sidik():
        tolak("sidik berubah sejak disegel (protokol/kode inti/status.py/ambang/kriteria)")
    if jangkar:
        t = git_teks(f"{jangkar}:{REL_SIDIK}")
        a = json.loads(t.splitlines()[-1]) if t else None
        if not a or a["sidik"] != seg["sidik"]:
            tolak(f"sidik di commit jangkar {jangkar} berbeda/tidak tersedia (fetch-depth: 0?)")
        if not (leluhur or jangkar_leluhur)(jangkar):
            tolak(f"commit jangkar {jangkar} bukan leluhur HEAD")
        if terbit_pertama is None:
            log = baca(LOG)
            terbit_pertama = min(log["terbit"]) if log and log.get("terbit") else None
        tj = tgl_jangkar if tgl_jangkar is not None else waktu_jangkar(jangkar)
        if terbit_pertama and (tj is None or tj > terbit_pertama):
            tolak(f"commit jangkar bertanggal {tj}, sesudah entri log pertama {terbit_pertama}")
    return seg


def main_segel():
    if baca_sidik():
        sys.exit("sidik sudah ada: protokol sudah disegel, tidak disegel ulang")
    if baca(LOG) or tercatat_git():
        sys.exit("log sudah ada: sidik harus mendahului catatan pertama")
    baris = {"jenis": "segel", "sidik": hitung_sidik(), "waktu": dt.datetime.now(WIB).isoformat(timespec="seconds")}
    with open(SIDIK, "w") as f:
        f.write(json.dumps(baris) + "\n")
    print("disegel", baris["sidik"])


def main_catat():
    pastikan_sidik()
    pastikan_ambang()
    pastikan_jangkar(str(dt.datetime.now(WIB).date()), JANGKAR_COMMIT)
    from bahaya import kecamatan
    hujan, st = baca(os.path.join(KELUAR, "hujan.json")), baca(os.path.join(KELUAR, "status.json"))
    alasan = segar(hujan, st, str(dt.datetime.now(WIB).date()))
    if alasan:
        print(f"siaga_persentil: tidak dicatat, {alasan}", file=sys.stderr)
        return
    tgl = hujan["hari_ini"]
    if not (KRITERIA["jendela_mulai"] <= tgl <= KRITERIA["jendela_akhir"]):
        print(f"siaga_persentil: {tgl} di luar jendela; tidak dicatat", file=sys.stderr)
        return
    try:
        lama = baca(LOG)
    except ValueError as e:
        sys.exit(f"log tidak terbaca ({e}); tidak ditimpa")
    cek_arsip(lama, git_json(REL_LOG))
    if lama is None and tercatat_git():
        sys.exit("log hilang padahal tercatat di git: pulihkan berkas, tidak memulai log baru diam-diam")
    if lama and tgl in lama["terbit"]:
        print(f"siaga_persentil: {tgl} sudah tercatat; tidak ditimpa", file=sys.stderr)
        return
    sampel = sorted(AMBANG_MENTAH)
    kab = hitung_hari(hujan, baca(os.path.join(KELUAR, "sungai.json")), baca(os.path.join(KELUAR, "bahaya.json")),
                      baca(os.path.join(KELUAR, "hujan_ansambel.json")), kecamatan(), sampel)
    pastikan_sama(beda_status(kab, st))
    meta = baca(os.path.join(KELUAR, "meta.json"))
    sumber = {"hujan": meta["sumber"].get("hujan"), "ansambel": meta["sumber"].get("ansambel"), "meta_dibuat": meta.get("dibuat")} \
        if meta and meta.get("hari_wib") == tgl and meta.get("sumber") else None
    baru = tambah(lama or {"versi": 1, "n_kab": len(sampel), "terbit": {}}, tgl, {"hari": st["hari"], "kab": kab, "sumber": sumber}, len(sampel))
    if baru is None:
        print(f"siaga_persentil: {tgl} tidak dicatat (mundur/di luar jendela)", file=sys.stderr)
        return
    simpan(LOG, baru)
    lebih = sum(1 for v in kab.values() if v[0][1] >= 2 and v[0][0] < 2)
    print(f"siaga_persentil: {len(baru['terbit'])} tanggal terbit; hari ini Siaga+ sekarang {sum(v[0][0] >= 2 for v in kab.values())} kab, "
          f"persentil {sum(v[0][1] >= 2 for v in kab.values())} kab (tambahan {lebih})", file=sys.stderr)


def main_nilai():
    seg = pastikan_sidik()
    log, dibi = baca(LOG), baca(DIBI)
    if not log or not dibi:
        sys.exit("log atau dibi_tanggal.json belum ada")
    lb = (baca(LB) or {}).get("kejadian", [])
    cek_arsip(log, git_json(REL_LOG))
    lokal, git_ = baca(SKOR), git_json(REL_SKOR)
    a, b = (lokal or {}).get("vonis_akhir"), (git_ or {}).get("vonis_akhir")
    if a and b and a != b:
        sys.exit("vonis_akhir lokal berbeda dari git HEAD: tolak")
    lama = lokal if a else (git_ if b else None)
    kini = dt.datetime.now(WIB).strftime("%Y-%m-%d")
    masukan = {"dibi_baris": len(dibi), "dibi_sha256": sha_berkas(DIBI), "logbook_baris": len(lb), "logbook_sha256": sha_berkas(LB) if os.path.exists(LB) else None,
               "sidik": seg["sidik"]}
    s = susun_skor(log, dibi, lb, lama, kini, masukan)
    if lama and lama.get("vonis_akhir") and s["vonis_akhir"] != lama["vonis_akhir"]:
        sys.exit("vonis_akhir sudah dikunci dan tidak boleh berubah")
    simpan(SKOR, s)
    u = s["utama_dibi_atau_logbook"]
    print(f"siaga_persentil nilai: hari {u['n_hari']} (tercatat {u['hari_tercatat']}/{u['hari_kalender_jendela']}), kejadian {u['n_kejadian']}, "
          f"dETS {u['dets']}, rasio alarm {u['rasio_alarm']}, berjalan {s['vonis_berjalan']} (sementara {s['perkiraan_sementara']}), akhir {s['vonis_akhir']}",
          file=sys.stderr)
    print("baris DIBI 40 kab sampel per bulan jendela (baris / rata-rata bulan sama 2023-2025; laporan, bukan gerbang): "
          + ", ".join(f"{ym} {v['baris']}/{v['rata_2023_2025']}" for ym, v in s["laporan_dibi_sampel"].items()), file=sys.stderr)


# ---- swauji ----
def _hujan_mainan(x, y, z):
    hari = [f"2026-11-{d:02d}" for d in range(1, 11)]
    return {"sel": 0.25, "hari": hari, "hari_ini": "2026-11-04", "grid": [
        {"lat": -6.2, "lon": 106.8, "h": [0, 0, x, y, z] + [0] * 5, "a7": 0, "imax": [0] * 10, "cape": [0] * 10}]}


def uji():
    lo, hi = KRITERIA["jepit_mm"]
    # 1. tabel beku: 40 kab, jepit [40,120], ambang kab = ambang Ps ambang_persentil
    assert len(AMBANG_MENTAH) == 40 and all(lo <= ambang_siaga(k) <= hi for k in AMBANG_MENTAH) and ambang_siaga("11|Aceh Selatan") == hi
    assert 40.0 <= S.ambang(S.K_BANJIR)[0] <= min(ambang_siaga(k) for k in AMBANG_MENTAH) and max(ambang_siaga(k) for k in AMBANG_MENTAH) <= S.ambang(S.K_BANJIR)[2]
    p = os.path.join(KELUAR, "ambang_persentil.json")
    if os.path.exists(p):
        pub = json.load(open(p))
        assert pub["sidik"] == AMBANG_SUMBER_SIDIK and {k: v["siaga"] for k, v in pub["ambang_mm"].items()} == AMBANG_MENTAH, "tabel beku beda dari ambang_persentil.json"
    # 2. aturan: s = 80 identik dengan status.level_banjir (sapuan); s lain menggeser HANYA Siaga; urutan W <= S <= A (monoton)
    for h3 in [x / 2 for x in range(0, 400)]:
        for bh in (0, .2, .33, .5, .66, 1):
            for rk in (None, 0, 1, 2, 3):
                for im in (None, 10, 25, 35):
                    for p3 in (None, .3, .6):
                        assert level_sp(h3, bh, rk, im, 3000, p3, 80.0) == S.level_banjir(h3, bh, rk, im, 3000, p3), (h3, bh, rk, im, p3)
                        l40, l120 = level_sp(h3, bh, rk, im, 0, p3, 40.0), level_sp(h3, bh, rk, im, 0, p3, 120.0)
                        l80 = level_sp(h3, bh, rk, im, 0, p3, 80.0)
                        assert l40 >= l80 >= l120, (h3, bh, rk, im, p3)       # ambang Siaga lebih rendah tak pernah menurunkan level
                        assert not (h3 >= 120 and bh >= .66) or l40 == l120 == 3     # Awas tak bergantung pada s
    assert level_sp(70, .4, None, s=60.0) == 2 and S.level_banjir(70, .4, None) == 1      # ambang kab lebih rendah: Siaga lebih cepat
    assert level_sp(70, .4, None, s=120.0) == 1 and level_sp(70, .2, None, s=40.0) == 1   # B < 0,33 tetap tutup Siaga
    assert level_sp(120, .7, None, s=40.0) == 3 and level_sp(39.9, 1, None, s=40.0) == 0   # Awas dan Waspada tak tergeser
    assert [level_sp(h, .5, None, s=60.0) for h in (39.9, 40, 59.9, 60, 119.9)] == [0, 1, 1, 2, 2]
    # 3. hitung_hari: kab sampel tunggal; ambang 80 -> kedua aturan sama; ambang 60 -> persentil lebih tinggi; sampel tanpa kecamatan = galat
    kec = {"32|Bogor|X": {"lat": -6.2, "lon": 106.8}}
    bah = {"kec": {"32|Bogor|X": {"banjir": 0.4}}}
    for amb, bedanya in ((lambda k: 80.0, False), (lambda k: 60.0, True)):
        o = hitung_hari(_hujan_mainan(20, 30, 20), None, bah, None, kec, ["32|Bogor"], amb)["32|Bogor"]   # h3 hari 0 = 70
        assert (o[0][1] > o[0][0]) == bedanya and o[0][0] == 1, o
    try:
        hitung_hari(_hujan_mainan(0, 0, 0), None, bah, None, kec, ["32|Bogor", "99|Tidak ada"]); raise AssertionError("sampel tanpa kecamatan diterima")
    except ValueError:
        pass
    st0 = {"hari": ["2026-11-04"], "kec": {"32|Bogor|X": {"b": [1, 0, 0, 0]}}}
    assert beda_status({"32|Bogor": [[1, 2]] * 4}, {"hari": [], "kec": {"32|Bogor|X": {"b": [1, 1, 1, 1]}}}) == []
    assert beda_status({"32|Bogor": [[1, 2]] * 4}, st0) != []
    # 4. basi: hujan.json hari_ini bukan hari ini WIB ditolak; segar diterima
    hj = {"hari_ini": "2026-11-04"}
    assert segar(hj, {"hari": ["2026-11-04"]}, "2026-11-05") and segar(hj, {"hari": ["2026-11-03"]}, "2026-11-04") and segar(None, {}, "x")
    assert segar(hj, {"hari": ["2026-11-04"]}, "2026-11-04") is None
    # 5. catat idempoten, tak menimpa, tak mundur, tak di luar jendela, menolak menyusut/berubah (kode 3 vs git)
    e = {"hari": ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"], "kab": {"a|b": [[0, 0]] * 4}}
    log = tambah({"versi": 1, "n_kab": 1, "terbit": {}}, "2026-11-02", e, 1)
    log2 = tambah(log, "2026-11-03", e, 1)
    assert list(log2["terbit"]) == ["2026-11-02", "2026-11-03"]
    assert tambah(log2, "2026-11-03", {"hari": [], "kab": {}}, 1) is None and tambah(log2, "2026-11-02", e, 1) is None
    assert tambah(log2, "2026-10-01", e, 1) is None and tambah(log2, "2027-05-01", e, 1) is None
    assert log2["terbit"]["2026-11-03"] == e
    cek_arsip({**log2, "terbit": {**log2["terbit"], "2026-11-04": e}}, log2); cek_arsip(None, None)
    for rusak in ({**log2, "terbit": {"2026-11-03": e}}, {**log2, "terbit": {**log2["terbit"], "2026-11-02": {"hari": [], "kab": {}}}}, None):
        try:
            cek_arsip(rusak, log2); raise AssertionError("log menyusut/berubah diterima")
        except SystemExit as x:
            assert x.code == 3, x.code
    # 6. vonis pada kasus buatan (tercatat/kalender = 100/100 kecuali disebut)
    V = lambda nh, kej, d, lm, lh, ap, as_, tc=100, kal=100: vonis(nh, kej, d, lm, lh, ap, as_, tc, kal)
    assert V(89, 100, .02, .01, .01, 10, 10) == BELUM and V(120, 59, .02, .01, .01, 10, 10) == BELUM and V(120, 100, None, 0, 0, 1, 1) == BELUM
    assert V(120, 100, .01, .001, .002, 125, 100) == LULUS                       # alarm tepat 1,25x: lulus
    assert V(120, 100, .01, .001, .002, 130, 100) == TIDAK_MEYAKINKAN            # menang dengan alarm 1,3x BUKAN lulus
    assert V(120, 100, .004, .001, .002, 100, 100) == TIDAK_MEYAKINKAN           # efek di bawah 0,005
    assert V(120, 100, .01, 0.0, .002, 100, 100) == TIDAK_MEYAKINKAN and V(120, 100, .01, .001, -.001, 100, 100) == TIDAK_MEYAKINKAN  # satu skema gagal
    assert V(120, 100, 0.0, .1, .1, 1, 1) == TIDAK_LULUS and V(120, 100, -.01, -.02, -.02, 1, 1) == TIDAK_LULUS
    assert V(120, 100, .01, .001, .002, 100, 100, 85, 100) == LULUS and V(120, 100, .01, .001, .002, 100, 100, 84, 100) == TIDAK_MEYAKINKAN   # > 15% hari tak tercatat
    assert V(120, 100, -.01, -.02, -.02, 1, 1, 10, 100) == TIDAK_LULUS and V(120, 100, .01, .001, .002, 100, 100, 0, 0) == TIDAK_MEYAKINKAN
    # 7. kematangan murni umur: bulan matang bila kini >= hari terakhir bulan + 183 hari (tanpa data, tanpa median)
    assert "median" not in " ".join(KRITERIA) and KRITERIA["matang_hari"] == 183
    assert bulan_matang("2027-05-31") == set() and bulan_matang("2027-06-01") == {"2026-11"} and bulan_matang("2027-07-02") == {"2026-11", "2026-12"}
    assert bulan_matang("2027-11-30") == bulan_jendela() and bulan_matang("2027-11-29") == bulan_jendela() - {"2027-05"}
    assert bulan_jendela() == {"2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"}
    baris_m = lambda ym, n, kab="K0": [[["banjir"], "32", kab, f"{ym}-01", 1] for _ in range(n)]
    lap = laporan_dibi_sampel(baris_m("2023-11", 3) + baris_m("2023-11", 1, "Z") + baris_m("2024-11", 6) + baris_m("2026-11", 2) + [[["cuaca"], "32", "K0", "2026-11-02", 1]], {"32|K0"})
    assert lap["2026-11"] == {"baris": 2, "rata_2023_2025": 3.0} and lap["2027-05"] == {"baris": 0, "rata_2023_2025": 0.0} and set(lap) == bulan_jendela(), lap
    # 8. nilai pipa utuh pada log buatan: 20 kab, 40 hari terbit (2 Nov .. 11 Des); 4 kejadian per hari
    rng = random.Random(5)
    kabs = [f"32|K{i:02d}" for i in range(20)]
    awal = dt.date(2026, 11, 2)
    tg = lambda i: str(awal + dt.timedelta(days=i))
    kej = {i: set(rng.sample(kabs, 4)) for i in range(0, 60)}
    dibi = [[["banjir"], k.split("|")[0], k.split("|")[1], tg(i), 1] for i, ks in kej.items() for k in ks] + [[["cuaca"], "32", "K00", tg(3), 1]]
    Kc = {**KRITERIA, "n_hari_min": 30, "kejadian_min": 60}

    def log_dari(n, nfp):
        L = {"versi": 1, "n_kab": 20, "terbit": {}}
        for i in range(n):
            kab = {k: [[0, 0] for _ in range(4)] for k in kabs}
            for t in range(4):
                ya = kej[i + t]
                for k in rng.sample(sorted(ya), 2) + rng.sample([x for x in kabs if x not in ya], 4):
                    kab[k][t][0] = 2                                             # sekarang: 2 kena + 4 palsu = 6 alarm
                for k in list(ya) + rng.sample([x for x in kabs if x not in ya], nfp):
                    kab[k][t][1] = 2                                             # persentil: 4 kena + nfp palsu
            L["terbit"][tg(i)] = {"hari": [tg(i + t) for t in range(4)], "kab": kab}
        return L
    mt = bulan_matang("2027-06-01")
    assert mt == {"2026-11"}, mt                                                 # hanya Nov 2026 yang cukup umur; Des belum
    lg = log_dari(40, 1)
    ev0 = label(dibi, [], set(kabs))
    h = baris_terbit(lg, ev0, mt, 1, Kc)
    assert max(t for t, _, _ in h) == "2026-11-29" and len({t for t, _, _ in h}) == 28, (max(t for t, _, _ in h), len({t for t, _, _ in h}))   # sasaran 30 Nov terakhir; Des tak dinilai
    assert baris_terbit(lg, ev0, set(), 1, Kc) == [] and baris_terbit(lg, set(), mt, 1, Kc) != []
    kc = {**Kc, "n_hari_min": 12, "kejadian_min": 40}
    kini = tg(39)
    r = nilai_semua(lg, ev0, mt, kini, True, kc)
    assert r["vonis_berjalan"] == LULUS and r["rasio_alarm"] < 1 and r["dets"] > .005 and r["ci_kab_minggu"][0] > 0 and r["ci_blok_hari"][0] > 0, r
    assert r["hari_tercatat"] == 40 and r["hari_kalender_jendela"] == 40 and set(r["dets_per_bulan"]) == {"2026-11"}
    rb = nilai_semua(lg, ev0, mt, kini, False, kc)
    assert rb["vonis_berjalan"] == BELUM and rb["perkiraan_sementara"] == LULUS                    # jendela belum selesai: BELUM, sementara hanya informasi
    assert nilai_semua(lg, ev0, mt, kini, True, Kc)["vonis_berjalan"] == BELUM                    # 28 hari < 30
    assert nilai_semua(lg, ev0, mt, tg(80), True, kc)["perkiraan_sementara"] == TIDAK_MEYAKINKAN   # 40 dari 81 hari kalender tercatat: tak lengkap
    assert kelengkapan(lg, "2027-12-31") == (40, 180) and kelengkapan(lg, "2026-11-01") == (0, 0)
    lg2 = log_dari(40, 4)                                                                          # 8 alarm vs 6 = 1,33x
    r2 = nilai_semua(lg2, ev0, mt, kini, True, kc)
    assert r2["dets"] > .005 and r2["rasio_alarm"] > 1.25 and r2["vonis_berjalan"] == TIDAK_MEYAKINKAN, r2
    # label: kab dicocokkan lewat nama, hari mulai (terlihat[0] bila mulai kosong); sumber dibi/logbook/gab terpisah
    lbm = [{"jenis": "banjir", "prov": "Jawa Barat", "kab": "Kab. K05", "mulai": tg(500), "terlihat": [tg(500)] * 2},
           {"jenis": "longsor", "prov": "Jawa Barat", "kab": "Kab. K06", "mulai": tg(501), "terlihat": [tg(501)] * 2},
           {"jenis": "banjir_bandang", "prov": "Jawa Barat", "kab": "Kab. K07", "mulai": None, "terlihat": [tg(502), tg(503)]}]
    assert (kabs[5], tg(500)) in label(dibi, lbm, set(kabs)) and (kabs[5], tg(500)) not in label(dibi, lbm, set(kabs), "dibi")
    assert (kabs[7], tg(502)) in label(dibi, lbm, set(kabs), "logbook") and (kabs[0], tg(3)) not in label(dibi, lbm, set(kabs), "logbook")
    assert (kabs[6], tg(501)) not in label(dibi, lbm, set(kabs)) and (kabs[0], tg(3)) not in label(dibi, [], set(kabs))   # longsor/cuaca bukan label
    # vonis dikunci hanya bila jendela selesai + jangkar; sekali terkunci tak berganti; vonis_akhir menyimpan hash masukan
    allm = bulan_jendela()
    assert jendela_selesai(allm) and not jendela_selesai(allm - {"2027-05"}) and not jendela_selesai(set())
    mas = {"dibi_baris": 1, "dibi_sha256": "x", "logbook_baris": 0, "logbook_sha256": None, "sidik": "s"}
    lama = {"vonis_akhir": {"vonis": LULUS}}
    sk = susun_skor(lg, dibi, [], lama, "2027-06-01", mas, Kc, jangkar="abc")
    assert sk["vonis_akhir"] == {"vonis": LULUS} and susun_skor(lg, dibi, [], None, "2027-06-01", mas, Kc, jangkar="abc")["vonis_akhir"] is None   # Des-Mei belum cukup umur
    Ks = {**Kc, "jendela_akhir": tg(10), "n_hari_min": 5, "kejadian_min": 10}   # bulan jendela = {2026-11}
    kunci = susun_skor(lg, dibi, [], None, "2027-06-01", mas, Ks, jangkar="abc")["vonis_akhir"]
    assert kunci and kunci["vonis"] in (LULUS, TIDAK_MEYAKINKAN, TIDAK_LULUS) and kunci["jangkar"] == "abc" and kunci["rasio_alarm"] is not None
    assert kunci["masukan"] == {**mas, "n_hari_terbit": 40}, kunci["masukan"]
    assert susun_skor(lg, dibi, [], None, "2027-06-01", mas, Ks, jangkar="")["vonis_akhir"] is None              # tanpa jangkar
    assert susun_skor(lg, dibi, [], None, "2027-05-31", mas, Ks, jangkar="abc")["vonis_akhir"] is None            # sehari sebelum cukup umur
    prot = open(PROTOKOL).read()
    m = re.search(r"<!-- BEKU:mulai -->\s*```json\s*(.*?)\s*```\s*<!-- BEKU:akhir -->", prot, re.S)
    assert m and json.loads(m.group(1)) == KRITERIA, "blok BEKU di protokol beda dari KRITERIA"
    # 9. penolakan dan kode keluar: ambang status.py berubah = 4; jangkar kosong lewat tenggang = 4; sidik berubah = 4 (kode 3 hanya log menyusut); level beda status.json = 1
    pastikan_ambang()
    for panggil in (lambda: pastikan_ambang(0.9), lambda: pastikan_jangkar("2026-11-05", ""), lambda: pastikan_sidik([{"sidik": "salah"}], ""),
                    lambda: pastikan_sidik([{"sidik": hitung_sidik()}], "jangkar-tak-ada")):
        try:
            panggil(); raise AssertionError("penolakan kode 4 tidak terjadi")
        except SystemExit as x:
            assert x.code == 4, x.code
    pastikan_jangkar("2026-11-04", ""); pastikan_jangkar("2030-01-01", "abc")                                          # masa tenggang / jangkar terisi: lolos
    seg = {"sidik": hitung_sidik()}
    assert pastikan_sidik([seg], "") == seg
    # jangkar: harus leluhur HEAD dan commit-nya tidak lebih baru daripada entri log pertama (fungsi murni dengan masukan buatan)
    asli, globals()["git_teks"] = git_teks, lambda r: json.dumps(seg) + "\n"
    try:
        ya = lambda j: True
        assert pastikan_sidik([seg], "j", ya, "2026-11-02", "2026-11-03") == seg and pastikan_sidik([seg], "j", ya, "2026-11-03", "2026-11-03") == seg
        assert pastikan_sidik([seg], "j", ya, "2026-12-31", "") == seg                                                 # belum ada log: tak ada pembanding waktu
        for tolak in (dict(leluhur=lambda j: False, tgl_jangkar="2026-11-02", terbit_pertama="2026-11-03"),            # bukan leluhur HEAD
                      dict(leluhur=ya, tgl_jangkar="2026-11-04", terbit_pertama="2026-11-03"),                         # jangkar sesudah entri pertama
                      dict(leluhur=ya, tgl_jangkar=None, terbit_pertama="2026-11-03")):                                # waktu jangkar tak tersedia
            if tolak["tgl_jangkar"] is None:
                globals()["waktu_jangkar"], aw = (lambda j, cwd=AKAR: None), waktu_jangkar
            try:
                pastikan_sidik([seg], "j", **tolak); raise AssertionError("jangkar tak sah diterima")
            except SystemExit as x:
                assert x.code == 4, x.code
            finally:
                if tolak["tgl_jangkar"] is None:
                    globals()["waktu_jangkar"] = aw
    finally:
        globals()["git_teks"] = asli
    # repo git sementara (tanpa jaringan): leluhur dan tanggal commit
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        def g(*a, tgl="2026-11-03T10:00:00+07:00"):
            r = subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *a], cwd=d, capture_output=True, text=True,
                               env={**os.environ, "GIT_COMMITTER_DATE": tgl, "GIT_AUTHOR_DATE": tgl})
            assert r.returncode == 0, r.stderr
            return r.stdout.strip()
        g("init", "-q"); open(os.path.join(d, "f"), "w").write("1"); g("add", "f"); g("commit", "-q", "-m", "a")
        c1 = g("rev-parse", "HEAD")
        g("checkout", "-q", "-b", "sisi"); open(os.path.join(d, "f"), "w").write("2"); g("commit", "-q", "-am", "b", tgl="2026-11-05T10:00:00+07:00")
        c3 = g("rev-parse", "HEAD"); g("checkout", "-q", "-"); open(os.path.join(d, "f"), "w").write("3"); g("commit", "-q", "-am", "c")
        assert jangkar_leluhur(c1, d) and not jangkar_leluhur(c3, d) and not jangkar_leluhur("0" * 40, d)
        assert waktu_jangkar(c1, d) == "2026-11-03" and waktu_jangkar(c3, d) == "2026-11-05" and waktu_jangkar("0" * 40, d) is None
    try:
        pastikan_sidik([], ""); raise AssertionError("tanpa sidik diterima")
    except SystemExit as x:
        assert x.code != 3 and x.code, x.code                                                                           # belum disegel: pesan, kode 1
    pastikan_sama([])
    try:
        pastikan_sama([("a|b", 0, 1, 0)]); raise AssertionError("level beda diterima")
    except SystemExit as x:
        assert isinstance(x.code, str), x.code                                                                          # SystemExit(str) = kode 1
    # 10. sidik: kode inti lengkap, deterministik; memuat sumber status.py
    assert set(sidik_inti()) == set(INTI) and hitung_sidik() == hitung_sidik() and set(sumber_status()) == set(STATUS_FN)
    print("ok siaga_persentil")


if __name__ == "__main__":
    {"uji": uji, "nilai": main_nilai, "segel": main_segel}.get(sys.argv[1] if sys.argv[1:] else "", main_catat)()
