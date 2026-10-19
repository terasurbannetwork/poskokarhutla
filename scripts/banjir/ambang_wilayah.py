"""Ambang status banjir per wilayah (kabupaten) -> public/banjir/data/ambang_wilayah.json + blok ambang_wilayah di validasi.json

Uji luring, bukan langkah harian. Protokol lengkap (ditulis SEBELUM angka validasi/uji dilihat, diubah sekali sebelum
`latih` dari tinjauan validasi-model 19 Okt 2026) di RISET-AMBANG-WILAYAH.md; ringkasnya:
- Data = mesin uji_balik.py: kabupaten-hari, level kabupaten = kecamatan tertinggi, hujan ERA5 sempurna (cache
  data/raw/banjir/uji_balik/), kejadian DIBI banjir/bandang (data/raw/banjir/dibi_tanggal.json). Sampel = uji_balik.pilih()
  dengan kejadian DIPOTONG <= 2021-12-31 (pilih_latih), jadi tahun validasi/uji tidak ikut memilih kabupaten; sampelnya
  beda dari validasi.json.
- Kenop per wilayah = (k, iw): pengali ambang H3 50/100/150 x k (KISI_K) dan ambang jalur intensitas Waspada iw mm/jam.
  iw hanya disapu (KISI_IW_LUAS) bila > 50% hari alarm Waspada aturan sekarang di data latih dipicu imax saja (H3 < 40);
  selain itu iw = 20. Aturan sekarang = SEKARANG (0,8; 20) di semua wilayah.
- latih 2016-2021 memilih kenop wilayah: di antara kenop dengan POD >= Waspada turun <= eps dari POD aturan sekarang di
  wilayah itu, FAR terkecil (seri: CSI terbesar, lalu terdekat SEKARANG); tidak ada -> SEKARANG.
- Penyusutan: nasional atas semua kab; pulau pakai kenop sendiri bila hari kejadian latih >= n_min, selain itu nasional;
  kabupaten pakai kenop sendiri bila >= n_min, selain itu kenop pulaunya.
- validasi 2022-2023 memilih (eps, n_min) dari HIPER: dFAR terkecil (3 desimal) di antara dPOD >= -0,05, seri: dETS rata
  tiga level terbesar; tak ada yang lolos -> dPOD terbesar. Lalu kenop DIPASANG ULANG pada 2016-2023 (final), baru disidik.
- uji 2024-2025 dibuka SEKALI (`buka`): sidik = sha256 parameter + isi ambang_wilayah.py, uji_balik.py, status.py,
  dibi_tanggal.json; `buka` kedua ditolak sama sekali.
- Pembanding: aturan sekarang; alarm acak berlaju sama = nilai harapan analitik per blok (kena = m*e/n).
- Selang kriteria: bootstrap blok pulau x tahun 1.000 ulangan, berpasangan; kab x tahun dilaporkan sebagai pembanding.
- LAYAK bila (>= Waspada, uji): dCSI dan dETS CI bawah > 0; dPOD >= -0,05; dFAR <= -0,03 dan CI atas < 0 (dibaca relatif
  dFAR/FAR_sekarang bila hari kejadian 2024 < 70% rata 2023 dan 2025); penjaga: dETS rata tiga level >= 0 (titik).
- Label wajib: ERA5 prakiraan sempurna; ambang menyerap bias ERA5, tidak langsung berlaku untuk hujan produksi (IFS);
  pakai = false sampai validasi-model meninjau vonis LAYAK.

Pakai:  python3 scripts/banjir/ambang_wilayah.py ambil   unduh ERA5 sampel yang belum ada (kuota, bisa jam-jaman)
        python3 scripts/banjir/ambang_wilayah.py latih   periksa awal + pilih kenop (latih) + hiper (validasi) + pasang ulang
        python3 scripts/banjir/ambang_wilayah.py buka    buka uji 2024-2025 SEKALI, tulis vonis
        python3 scripts/banjir/ambang_wilayah.py uji     swauji luring, data mainan
"""
import datetime as dt, gzip, hashlib, json, os, random, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, baca, simpan
from status import GESER, K_BANJIR, ambang
import uji_balik as ub

LATIH, VALIDASI, UJI = range(2016, 2022), range(2022, 2024), range(2024, 2026)
FINAL = range(2016, 2024)
KISI_K = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 2.0]
KISI_IW_LUAS = [20, 30, 40]
AMBANG_IMAX_SAJA = 0.5
SEKARANG = (K_BANJIR, 20)
HIPER = [(eps, n) for eps in (0.02, 0.04) for n in (80, 160, None)]   # n_min None = tak hingga (satu kenop nasional)
BATAS_DPOD, BATAS_DFAR, BATAS_2024 = -0.05, -0.03, 0.7
LABEL = ("Hujan ERA5 sebagai prakiraan sempurna (batas atas). Ambang menyerap bias ERA5 dan tidak langsung berlaku untuk "
         "hujan produksi (IFS). Kejadian DIBI kurang lapor: FAR mutlak pesimistis.")
JALUR = os.path.join(KELUAR, "ambang_wilayah.json")
DIBI_TGL = os.path.join(MENTAH, "dibi_tanggal.json")
KODE = [os.path.join(os.path.dirname(os.path.abspath(__file__)), f) for f in ("ambang_wilayah.py", "uji_balik.py", "status.py")]
VERSI = "protokol-2026-10-19b"
ULANG = ub.ULANG


# ------------------------------------------------------------------ hitungan dasar (blok[(kab, tahun)] = [[a,b,c,d] x 3 level])
def jumlah(blok, kunci, i=0):
    t = [0, 0, 0, 0]
    for k in kunci:
        t = [x + y for x, y in zip(t, blok[k][i])]
    return t


def skor_kunci(blok, kunci, i=0):
    return ub.skor(*jumlah(blok, kunci, i))


def ets_kunci(blok, kunci):
    return ub.skor(*jumlah(blok, kunci, 0))["ets"]


def rakit(per, kenop_kab, tahun):
    """Blok aturan wilayah: tiap (kab, tahun) diambil dari tabel kenop milik kab itu."""
    return {(kab, y): per[kn][(kab, y)] for kab, kn in kenop_kab.items() for y in tahun if (kab, y) in per[kn]}


def gabung(blok, kunci_baru):
    """Jumlahkan blok ke kunci baru (mis. pulau x tahun) untuk bootstrap yang lebih kasar."""
    out = {}
    for k, v in blok.items():
        t = out.setdefault(kunci_baru(k), [[0, 0, 0, 0] for _ in v])
        for i, baris in enumerate(v):
            t[i] = [x + y for x, y in zip(t[i], baris)]
    return out


pulau_tahun = lambda k: (ub.KELOMPOK[k[0][0]], k[1])


def pilih_k(per, kabs, tahun, eps):
    """Kenop satu wilayah (gabungan kabs) di `tahun`; lihat docstring modul."""
    kunci = [(kab, y) for kab in kabs for y in tahun if (kab, y) in per[SEKARANG]]
    dasar = skor_kunci(per[SEKARANG], kunci)["pod"]
    if dasar is None:
        return SEKARANG
    calon = []
    for kn in sorted(per):
        s = skor_kunci(per[kn], kunci)
        if s["pod"] is not None and s["pod"] >= dasar - eps - 1e-12 and s["far"] is not None:
            calon.append((s["far"], -(s["csi"] or 0), abs(kn[0] - SEKARANG[0]) + abs(kn[1] - SEKARANG[1]) / 100, kn))
    return min(calon)[3] if calon else SEKARANG


def n_kejadian(blok, kabs, tahun):
    return sum(blok[(kab, y)][0][0] + blok[(kab, y)][0][2] for kab in kabs for y in tahun if (kab, y) in blok)


def susun(per, kabs, eps, n_min, tahun=LATIH):
    """-> {"nasional": kenop, "pulau": {g: kenop}, "kab": {kab: kenop}, "sumber": {kab: "kab"|"pulau"|"nasional"}}"""
    b0 = per[SEKARANG]
    knas = pilih_k(per, kabs, tahun, eps)
    pulau, kab_k, sumber = {}, {}, {}
    for g in sorted({ub.KELOMPOK[k[0]] for k in kabs}):
        anggota = [k for k in kabs if ub.KELOMPOK[k[0]] == g]
        sendiri = n_min is not None and n_kejadian(b0, anggota, tahun) >= n_min
        pulau[g] = pilih_k(per, anggota, tahun, eps) if sendiri else knas
        for kab in anggota:
            if n_min is not None and n_kejadian(b0, [kab], tahun) >= n_min:
                kab_k[kab], sumber[kab] = pilih_k(per, [kab], tahun, eps), "kab"
            else:
                kab_k[kab], sumber[kab] = pulau[g], "pulau" if sendiri else "nasional"
    return {"nasional": knas, "pulau": pulau, "kab": kab_k, "sumber": sumber}


def beda(b1, b0, kunci):
    """Selisih titik >= Waspada (b1 - b0): POD, FAR, CSI, ETS, FAR relatif, dan ETS rata tiga level."""
    s1, s0 = skor_kunci(b1, kunci), skor_kunci(b0, kunci)
    d = {m: None if s1[m] is None or s0[m] is None else s1[m] - s0[m] for m in ("pod", "far", "csi", "ets")}
    d["far_rel"] = None if d["far"] is None or not s0["far"] else d["far"] / s0["far"]
    d["ets_rata"] = ub.ets_rata(b1, kunci) - ub.ets_rata(b0, kunci)
    return d


def pilih_hiper(per, kabs):
    """Hiperparameter dipilih di VALIDASI saja. -> (terpilih, semua calon)"""
    calon = []
    b0 = rakit(per, {k: SEKARANG for k in kabs}, VALIDASI)
    for eps, n_min in HIPER:
        sus = susun(per, kabs, eps, n_min)
        d = beda(rakit(per, sus["kab"], VALIDASI), b0, sorted(b0))
        calon.append({"eps": eps, "n_min": n_min, "d": {m: None if v is None else round(v, 4) for m, v in d.items()}, "sus": sus})
    lolos = [c for c in calon if c["d"]["pod"] is not None and c["d"]["pod"] >= BATAS_DPOD]
    if lolos:
        return min(lolos, key=lambda c: (round(c["d"]["far"], 3), -c["d"]["ets_rata"])), calon
    return max(calon, key=lambda c: c["d"]["pod"] if c["d"]["pod"] is not None else -9), calon


# ------------------------------------------------------------------ periksa awal (data latih saja)
def porsi_imax_saja(hari_kab):
    """hari_kab: [(level kab, H3 terbesar sel kab)] hari-hari latih. -> porsi hari alarm >= Waspada dengan H3 < ambang Waspada."""
    w = ambang(SEKARANG[0])[0]
    alarm = [h for l, h in hari_kab if l >= 1]
    return sum(1 for h in alarm if h < w) / len(alarm) if alarm else 0.0


def kisi_kenop(porsi):
    return [(k, iw) for k in KISI_K for iw in (KISI_IW_LUAS if porsi > AMBANG_IMAX_SAJA else [20])]


def orakel(per, kabs):
    """Batas atas in-sample: tiap kab memilih kenop di LATIH dan dinilai di LATIH yang sama (eps 0,05, n_min 0)."""
    sus = susun(per, kabs, -BATAS_DPOD, 0)
    b0, b1 = rakit(per, {k: SEKARANG for k in kabs}, LATIH), rakit(per, sus["kab"], LATIH)
    d = beda(b1, b0, sorted(b0))
    return {m: None if v is None else round(v, 4) for m, v in d.items()}


# ------------------------------------------------------------------ pembanding acak, selang, vonis
def acak(blok):
    """Alarm acak berlaju sama: nilai harapan per blok dan level (kena = m*e/n), hitungan pecahan."""
    out = {}
    for kunci, v in blok.items():
        baris = []
        for a, b, c, d in v:
            n, e, m = a + b + c + d, a + c, a + b
            kena = m * e / n if n else 0
            baris.append([kena, m - kena, e - kena, n - e - m + kena])
        out[kunci] = baris
    return out


def ringkas(blok):
    """Skor >= Waspada, CI bootstrap blok pulau x tahun, laju."""
    n = jumlah(blok, sorted(blok))
    s = ub.skor(*n)
    return {**{m: None if s[m] is None else round(s[m], 3) for m in ("pod", "far", "csi", "ets")},
            "ci": {m: v for m, v in ub.bootstrap(gabung(blok, pulau_tahun), 0).items() if m in ("pod", "far", "csi", "ets")},
            "n": {x: round(y, 1) for x, y in zip("abcd", n)}, "laju": round((n[0] + n[1]) / sum(n), 3) if sum(n) else None}


def selisih(b1, b0, ulang=ULANG, seed=3):
    """Bootstrap berpasangan (blok sama untuk kedua aturan). -> {m: [titik, [lo, hi]]}"""
    kunci, r, xs = sorted(b0), random.Random(seed), defaultdict(list)
    for _ in range(ulang):
        p = [r.choice(kunci) for _ in kunci]
        for m, v in beda(b1, b0, p).items():
            if v is not None:
                xs[m].append(v)
    titik = beda(b1, b0, kunci)
    out = {}
    for m, v in xs.items():
        v.sort()
        out[m] = [None if titik[m] is None else round(titik[m], 4), [round(v[int(.025 * (len(v) - 1))], 4), round(v[int(.975 * (len(v) - 1))], 4)]]
    return out


def selisih_dua(b1, b0):
    """Selang kriteria = blok pulau x tahun; kab x tahun hanya pembanding."""
    return {"pulau_tahun": selisih(gabung(b1, pulau_tahun), gabung(b0, pulau_tahun)), "kab_tahun": selisih(b1, b0)}


def vonis(d, far_relatif=False):
    """Kriteria LAYAK (RISET-AMBANG-WILAYAH.md, perubahan protokol sebelum latih). d = selisih blok pulau x tahun."""
    f = d["far_rel"] if far_relatif else d["far"]
    ok = lambda m: d[m][0] is not None
    syarat = [("dCSI > 0 dan CI bawah > 0", ok("csi") and d["csi"][0] > 0 and d["csi"][1][0] > 0),
              ("dETS Waspada > 0 dan CI bawah > 0", ok("ets") and d["ets"][0] > 0 and d["ets"][1][0] > 0),
              ("dPOD >= -0,05", ok("pod") and d["pod"][0] >= BATAS_DPOD),
              (f"dFAR{' relatif' if far_relatif else ''} <= -0,03 dan CI atas < 0", f[0] is not None and f[0] <= BATAS_DFAR and f[1][1] < 0),
              ("penjaga: dETS rata tiga level >= 0", d["ets_rata"][0] >= 0)]
    return all(x for _, x in syarat), syarat


def sidik(sus, eps, n_min, berkas=None):
    h = hashlib.sha256(json.dumps({"versi": VERSI, "kab": {k: list(v) for k, v in sus["kab"].items()}, "eps": eps,
                                   "n_min": n_min, "kisi_k": KISI_K}, sort_keys=True).encode())
    for jalur in (KODE + [DIBI_TGL]) if berkas is None else berkas:
        with open(jalur, "rb") as f:
            h.update(hashlib.sha256(f.read()).digest())
    return h.hexdigest()[:16]


def far_relatif(hari):
    """hari = {tahun: hari kejadian banjir sampel}. True bila 2024 < 70% rata 2023 dan 2025 (DIBI 2024 kurang lengkap)."""
    rata = (hari.get(2023, 0) + hari.get(2025, 0)) / 2
    return bool(rata) and hari.get(2024, 0) < BATAS_2024 * rata


# ------------------------------------------------------------------ data nyata
def pilih_latih(ev, sk):
    """uji_balik.pilih() dengan kejadian dipotong <= 2021-12-31: tahun validasi/uji tidak ikut memilih kabupaten."""
    batas = ub.hari_ke(dt.date(LATIH[-1], 12, 31))
    return ub.pilih({j: {k: {e for e in v if e <= batas} for k, v in ev[j].items()} for j in ev}, sk)


def muat():
    baris = baca(DIBI_TGL)
    if not baris or min(r[3] for r in baris) > "2016-01-01":
        sys.exit("dibi_tanggal.json belum ada atau tidak memuat 2016-2021 (kejadian.json saja hanya 2023+): "
                 "jalankan riwayat.py saat DIBI terjangkau, atau pulihkan cache data/raw/banjir dari CI")
    ev, sk = ub.peristiwa(baris), ub.sel_per_kab()
    kabs = pilih_latih(ev, sk)
    return ev, sk, kabs, {s for k in kabs for s in sk[k]}


def cuaca_sel(sel):
    if not all(os.path.exists(ub.jalur(*s)) for s in sel):
        sys.exit("cache ERA5 belum lengkap: jalankan `ambang_wilayah.py ambil` dulu")
    out = {}
    for s in sel:
        with gzip.open(ub.jalur(*s), "rt") as f:
            out[s] = ub.deret(json.load(f))
    return out


def hari_latih(cuaca, sk, kabs):
    """[(level kab aturan sekarang, H3 terbesar sel kab)] per kab-hari LATIH (untuk porsi_imax_saja)."""
    par = {"k": SEKARANG[0], "geser": GESER, "i_waspada": SEKARANG[1]}
    hari = list(range(ub.hari_ke(dt.date(LATIH[0], 1, 1)), ub.hari_ke(dt.date(LATIH[-1], 12, 31)) + 1))
    out = []
    for kab in kabs:
        lv = [max(t) for t in zip(*(ub.level_harian(cuaca[s], b, "banjir", par, hari) for s, b in sk[kab].items()))]
        h3 = [max(t) for t in zip(*([sum(cuaca[s]["p"][e + GESER:e + GESER + 3]) for e in hari] for s in sk[kab]))]
        out += list(zip(lv, h3))
    return out


def tabel_kenop(cuaca, sk, kabs, ev, kisi):
    semua = range(LATIH[0], UJI[-1] + 1)
    return {kn: ub.tabel(cuaca, sk, kabs, ev, "banjir", {"k": kn[0], "geser": GESER, "i_waspada": kn[1]}, semua) for kn in kisi}


def hari_kejadian(ev, kabs):
    return {y: sum(1 for k in kabs for e in ev["banjir"].get(k, ()) if (ub.AWAL + dt.timedelta(e)).year == y)
            for y in range(LATIH[0], UJI[-1] + 1)}


def baris_cetak(nama, r):
    f = lambda m: "  -  " if r[m] is None else f"{r[m]:.3f} [{r['ci'][m][0]:.3f}-{r['ci'][m][1]:.3f}]"
    return f"    {nama:9s} POD {f('pod')}  FAR {f('far')}  CSI {f('csi')}  ETS {f('ets')}  laju {r['laju']}"


def latih():
    if (baca(JALUR) or {}).get("dibuka"):
        sys.exit("uji sudah dibuka; latih ulang = eksperimen baru dengan periode uji baru")
    ev, sk, kabs, sel = muat()
    cuaca = cuaca_sel(sel)
    hari = hari_kejadian(ev, kabs)
    print(f"sampel {len(kabs)} kab (dipilih dari kejadian <= {LATIH[-1]}), {len(sel)} sel; hari kejadian per tahun (audit): {hari}")
    porsi = porsi_imax_saja(hari_latih(cuaca, sk, kabs))
    kisi = kisi_kenop(porsi)
    print(f"  periksa awal (latih): porsi alarm Waspada hanya dari imax = {porsi:.3f} -> kisi iw {sorted({kn[1] for kn in kisi})}")
    per = tabel_kenop(cuaca, sk, kabs, ev, kisi)
    ork = orakel(per, kabs)
    print(f"  orakel in-sample latih (eps 0,05, n_min 0): {ork}")
    t, calon = pilih_hiper(per, kabs)
    sekarang = {k: SEKARANG for k in kabs}
    hasil = {}
    for nama, th in (("latih", LATIH), ("validasi", VALIDASI)):
        b0, b1 = rakit(per, sekarang, th), rakit(per, t["sus"]["kab"], th)
        hasil[nama] = {"sekarang": ringkas(b0), "wilayah": ringkas(b1), "acak": ringkas(acak(b1)), "selisih": selisih_dua(b1, b0)}
        print(f"  {nama} {th[0]}-{th[-1]} (kenop dipasang di latih)")
        for m in ("sekarang", "wilayah", "acak"):
            print(baris_cetak(m, hasil[nama][m]))
    for c in calon:
        print(f"  hiper eps {c['eps']} n_min {c['n_min']}: validasi d {c['d']}")
    final = susun(per, kabs, t["eps"], t["n_min"], FINAL)
    print(f"  terpilih eps {t['eps']} n_min {t['n_min']}; FINAL (pasang ulang 2016-2023): nasional {final['nasional']}, pulau {final['pulau']}")
    kn = lambda x: {"k": x[0], "iw": x[1]}
    simpan(JALUR, {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
                   "versi": VERSI, "label": LABEL, "pakai": False,
                   "periode": {"latih": "2016-2021", "validasi": "2022-2023", "final": "2016-2023", "uji": "2024-2025"},
                   "periksa": {"porsi_imax_saja": round(porsi, 4), "kisi": [kn(x) for x in kisi], "orakel_latih": ork},
                   "hari_kejadian": hari, "eps": t["eps"], "n_min": t["n_min"],
                   "sidik": sidik(final, t["eps"], t["n_min"]),
                   "nasional": kn(final["nasional"]), "pulau": {g: kn(x) for g, x in final["pulau"].items()},
                   "kab": {k: kn(x) for k, x in final["kab"].items()}, "sumber": final["sumber"], "hasil": hasil,
                   "hiper": [{k: c[k] for k in ("eps", "n_min", "d")} for c in calon]})
    print("ambang_wilayah.json ditulis (uji BELUM dibuka)", file=sys.stderr)


def buka():
    A = baca(JALUR)
    if not A or "sidik" not in A:
        sys.exit("jalankan `latih` dulu")
    if A.get("dibuka"):
        sys.exit(f"uji sudah dibuka {A['dibuka']['tanggal']} (sidik {A['dibuka']['sidik']}); tidak bisa dibuka lagi")
    ev, sk, kabs, sel = muat()
    kab_k = {k: (v["k"], v["iw"]) for k, v in A["kab"].items()}
    if sidik({"kab": kab_k}, A["eps"], A["n_min"]) != A["sidik"]:
        sys.exit("sidik beda: kode, dibi_tanggal.json, atau parameter berubah sejak latih")
    if sorted(kab_k) != kabs:
        sys.exit("sampel kabupaten berubah sejak latih")
    per = tabel_kenop(cuaca_sel(sel), sk, kabs, ev, sorted(set(kab_k.values()) | {SEKARANG}))
    b0, b1 = rakit(per, {k: SEKARANG for k in kabs}, UJI), rakit(per, kab_k, UJI)
    rel = far_relatif({int(y): n for y, n in A["hari_kejadian"].items()})  # kunci JSON = string
    d = selisih_dua(b1, b0)
    layak, syarat = vonis(d["pulau_tahun"], rel)
    uji_ = {"sekarang": ringkas(b0), "wilayah": ringkas(b1), "acak": ringkas(acak(b1)), "selisih": d, "far_relatif": rel,
            "kriteria": [{"syarat": s, "lolos": x} for s, x in syarat], "layak": layak}
    print("  uji 2024-2025")
    for m in ("sekarang", "wilayah", "acak"):
        print(baris_cetak(m, uji_[m]))
    print(f"  selisih pulau x tahun {d['pulau_tahun']}\n  selisih kab x tahun {d['kab_tahun']}")
    for s, x in syarat:
        print(f"    {'LOLOS' if x else 'GAGAL'}  {s}")
    print(f"  VONIS: {'LAYAK' if layak else 'TIDAK LAYAK'}")
    A["dibuka"] = {"sidik": A["sidik"], "tanggal": dt.date.today().isoformat()}
    A["hasil"]["uji"], A["pakai"] = uji_, False  # status.py baru membaca bendera ini setelah validasi-model meninjau vonis
    simpan(JALUR, A)
    V = baca(os.path.join(KELUAR, "validasi.json"))
    V["ambang_wilayah"] = {"periode": A["periode"], "label": LABEL, "layak": layak, "pakai": False, "eps": A["eps"],
                           "n_min": A["n_min"], **{n: A["hasil"][n] for n in ("latih", "validasi", "uji")}}
    simpan(os.path.join(KELUAR, "validasi.json"), V)
    print("ambang_wilayah.json + validasi.json ditulis", file=sys.stderr)


# ------------------------------------------------------------------ swauji
def uji():
    import tempfile
    kabs = ["32|A", "32|B", "33|C", "72|D"]

    def blok_kn(kn):
        # mainan: tiap kab-tahun 300 hari, 10 kejadian; k makin besar = alarm makin sedikit, palsu turun lebih cepat dari kena
        k, out = kn[0], {}
        for kab in kabs:
            for y in range(2016, 2026):
                kena = max(0, round(8 - 2 * (k - 0.8) * (2 if kab == "32|A" else 1)))
                palsu = max(0, round(80 - 60 * (k - 0.8)))
                out[(kab, y)] = [[kena, palsu, 10 - kena, 290 - palsu]] * 3
        return out
    per = {kn: blok_kn(kn) for kn in kisi_kenop(0.0)}
    assert sorted(per) == [(k, 20) for k in KISI_K] and SEKARANG in per
    assert len(kisi_kenop(0.51)) == len(KISI_K) * 3 and len(kisi_kenop(0.5)) == len(KISI_K)
    # periksa awal: porsi alarm yang H3-nya di bawah 40 (dipicu imax saja); hari tanpa alarm tidak dihitung
    assert porsi_imax_saja([(1, 10), (1, 50), (2, 39.9), (0, 5), (3, 120)]) == 0.5 and porsi_imax_saja([(0, 1)]) == 0
    # pilih_k: eps 0 -> POD tidak boleh turun (k 1,0 masih kena 8 karena round, alarm palsu lebih sedikit); eps besar -> k terbesar
    assert pilih_k(per, ["32|B"], LATIH, 0) == (1.0, 20)
    assert pilih_k(per, ["32|B"], LATIH, 1) == (2.0, 20)
    assert pilih_k(per, ["32|B"], LATIH, 0.1) == (1.4, 20)
    # penyusutan
    s = susun(per, kabs, 0.1, None)
    assert set(s["kab"].values()) == {s["nasional"]} and set(s["sumber"].values()) == {"nasional"}, s
    s = susun(per, kabs, 0.1, 10)
    assert s["sumber"]["32|A"] == "kab" and s["kab"]["32|A"] == (1.0, 20) and s["kab"]["32|B"] == (1.4, 20), s
    s = susun(per, kabs, 0.1, 61)   # kab 60 kejadian latih < 61; Jawa (3 kab) 180 >= 61; Sulawesi 60 < 61
    assert s["sumber"]["32|B"] == "pulau" and s["sumber"]["72|D"] == "nasional", s
    assert susun(per, kabs, 0.1, 61, FINAL)["sumber"]["32|B"] == "kab"   # pasang ulang 2016-2023: 80 kejadian per kab
    b = rakit(per, {"32|A": (0.6, 20), "32|B": (2.0, 20)}, [2016])
    assert b[("32|A", 2016)] == per[(0.6, 20)][("32|A", 2016)] and b[("32|B", 2016)] == per[(2.0, 20)][("32|B", 2016)]
    # gabung pulau x tahun menjumlah per blok
    blok = rakit(per, {k: SEKARANG for k in kabs}, range(2016, 2026))
    g = gabung(blok, pulau_tahun)
    assert len(g) == 20 and g[("Jawa", 2016)][0] == [24, 240, 6, 630] and g[("Sulawesi", 2016)][0] == [8, 80, 2, 210], g[("Jawa", 2016)]
    # alarm acak = nilai harapan: total alarm/kejadian/hari tetap, kena = m*e/n, ETS 0
    ac = acak(blok)
    for k in blok:
        for (a, b_, c, d), (a2, b2, c2, d2) in zip(blok[k], ac[k]):
            assert abs(a + b_ - a2 - b2) < 1e-9 and abs(a + c - a2 - c2) < 1e-9 and abs(a2 - (a + b_) * (a + c) / (a + b_ + c + d)) < 1e-9
    assert abs(ets_kunci(ac, sorted(ac))) < 1e-9
    # selisih aturan sama = 0, CI [0, 0], di kedua jenis blok
    z = selisih_dua(blok, blok)
    assert all(v[0] == 0 and v[1] == [0, 0] for t in z.values() for v in t.values()), z
    # vonis: kriteria baru; tiap syarat gagal sendiri-sendiri
    d = {"far": [-0.04, [-0.06, -0.01]], "far_rel": [-0.042, [-0.06, -0.01]], "pod": [-0.03, [-0.08, 0.0]],
         "csi": [0.01, [0.002, 0.02]], "ets": [0.005, [0.001, 0.01]], "ets_rata": [0.001, [0, 0.002]]}
    assert vonis(d)[0] and vonis(d, True)[0]
    for rusak in ({"far": [-0.02, [-0.05, -0.01]]}, {"far": [-0.04, [-0.06, 0.001]]}, {"pod": [-0.06, [-0.1, 0]]},
                  {"csi": [0.01, [-0.001, 0.02]]}, {"ets": [0.005, [-0.001, 0.01]]}, {"ets_rata": [-0.001, [-0.002, 0]]}):
        assert not vonis({**d, **rusak})[0], rusak
    assert not vonis({**d, "far_rel": [-0.02, [-0.05, -0.01]]}, True)[0] and vonis({**d, "far_rel": [-0.02, [-0.05, -0.01]]})[0]
    assert far_relatif({2023: 100, 2024: 69, 2025: 100}) and not far_relatif({2023: 100, 2024: 70, 2025: 100})
    # hiper dipilih hanya dari VALIDASI: mengubah tabel uji tidak mengubah pilihan
    t1, _ = pilih_hiper(per, kabs)
    rusak = {k: {kk: ([[0, 0, 10, 290]] * 3 if kk[1] in UJI else v) for kk, v in t.items()} for k, t in per.items()}
    t2, _ = pilih_hiper(rusak, kabs)
    assert (t1["eps"], t1["n_min"], t1["sus"]) == (t2["eps"], t2["n_min"], t2["sus"])
    assert [n for _, n in HIPER] == [80, 160, None, 80, 160, None]
    # sidik: berubah bila parameter ATAU isi berkas berubah
    with tempfile.NamedTemporaryFile("wb", delete=False) as f:
        f.write(b"a")
    s1 = sidik(t1["sus"], 0.02, 80, [f.name])
    assert s1 == sidik(t1["sus"], 0.02, 80, [f.name])
    assert s1 != sidik({"kab": {**t1["sus"]["kab"], "32|A": (9, 20)}}, 0.02, 80, [f.name])
    with open(f.name, "wb") as g_:
        g_.write(b"b")
    assert s1 != sidik(t1["sus"], 0.02, 80, [f.name])
    os.unlink(f.name)
    # pemilih sampel memotong kejadian sesudah 2021: kab yang kejadiannya hanya 2022+ tidak terpilih
    ev = {"banjir": {"32|A": {ub.hari_ke(dt.date(2017, 1, 5))}, "32|B": {ub.hari_ke(dt.date(2023, 1, 5))}}, "longsor": {}}
    sk = {"32|A": {(1, 1): 0}, "32|B": {(1, 2): 0}}
    assert pilih_latih(ev, sk) == ["32|A"] and ub.pilih(ev, sk) == ["32|A", "32|B"]
    assert not set(LATIH) & set(VALIDASI) and not set(VALIDASI) & set(UJI) and set(FINAL) == set(LATIH) | set(VALIDASI)
    print("ok ambang_wilayah")


if __name__ == "__main__":
    perintah = sys.argv[1:2] or ["latih"]
    if perintah == ["uji"]:
        uji()
    elif perintah == ["ambil"]:
        _, _, kabs, sel = muat()
        sys.exit(0 if ub.ambil_cuaca(sel) else 1)
    elif perintah == ["buka"]:
        buka()
    else:
        latih()
