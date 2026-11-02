"""Ambang H3 banjir per kabupaten/kota dari persentil hujan lokal -> uji luring terhadap ambang nasional 40/80/120 mm.

Protokol: PRAREG-AMBANG-PERSENTIL.md (ditulis SEBELUM skor apa pun; baca dulu). Hanya mengimpor status.py, uji_balik.py,
umum.py (dibekukan sidik model lain): tidak menyunting. `"pakai": false` di keluaran publik: tidak dibaca layar/status.py.

  python3 scripts/banjir/ambang_persentil.py uji        swauji luring dengan data mainan
  python3 scripts/banjir/ambang_persentil.py latih      sampel, persentil (TANPA label), jumlah alarm cocok, SIDIK
  python3 scripts/banjir/ambang_persentil.py validasi   skor 2022-2023 (boleh dilihat)
  python3 scripts/banjir/ambang_persentil.py buka       uji 2024-2025 + kepekaan 2026, SEKALI (jangan dijalankan pelaksana)
"""
import datetime as dt, gzip, hashlib, inspect, json, math, os, random, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import uji_balik as ub
from status import GESER, K_BANJIR, ambang, level_banjir
from umum import KELUAR, MENTAH, WIB, baca, simpan

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
RAW = os.path.join(MENTAH, "ambang_persentil")
PUBLIK = os.path.join(KELUAR, "ambang_persentil.json")
JEJAK = os.path.join(AKAR, "scripts/banjir/ambang_persentil.sidik")
PROTOKOL = os.path.join(AKAR, "scripts/banjir/PRAREG-AMBANG-PERSENTIL.md")
DIBI = os.path.join(MENTAH, "dibi_tanggal.json")

LATIH = (dt.date(2016, 1, 1), dt.date(2021, 12, 30))   # 12-30: jendela H3 e+1 tidak menyentuh 2022
VALID = (dt.date(2022, 1, 1), dt.date(2023, 12, 31))
UJI = (dt.date(2024, 1, 1), dt.date(2025, 12, 31))
UJI26 = (dt.date(2026, 1, 1), dt.date(2026, 10, 18))
AKHIR_26 = dt.date(2026, 10, 20)
PI = range(500, 1000)       # persentil 50,0 .. 99,9 langkah 0,1, dalam persepuluh
LANTAI_W, LANTAI_S, LANTAI_A = 20.0, 40.0, 60.0   # mm, lantai ambang (protokol, amandemen A1; tidak disetel)
EFEK_W, TOL_S = 0.002, -0.005   # amandemen A1: efek minimum dETS Waspada; toleransi batas bawah dETS Siaga
LAMA = [round(t * K_BANJIR, 1) for t in (50, 100, 150)]   # 40/80/120
LEVEL = ["waspada", "siaga", "awas"]
ULANG = 1000


# ------------------------------------------------------------------ aturan
def lv(h3, b, imax, thr):
    """level_banjir (rk, cape, p3 tidak dipakai) dengan ambang H3 thr = (w, s, a) mm."""
    w, s, a = thr
    if h3 >= a and b >= 0.66:
        return 3
    if b >= 0.33 and (h3 >= s or imax >= 30):
        return 2
    return 1 if (h3 >= w or imax >= 20) else 0


def fitur(c):
    """Deret ub.deret -> (H3, IM) per hari e (jendela e+GESER..+2). H3 = jumlah hujan, IM = jam terbesar (None -> 0)."""
    n = len(c["p"])
    h3, im = [0.0] * n, [0.0] * n
    for e in range(max(0, -GESER), n - 2 - max(GESER, 0)):
        w = slice(e + GESER, e + GESER + 3)
        h3[e] = sum(c["p"][w])
        im[e] = max([x for x in c["im"][w] if x is not None] or [0])
    return h3, im


def hari_periode(per):
    """Indeks hari e (sejak ub.AWAL) untuk periode (awal, akhir) inklusif; e >= 7 dan jendela di dalam data."""
    return list(range(max(ub.hari_ke(per[0]), 7), min(ub.hari_ke(per[1]), ub.hari_ke(ub.AKHIR) - 2) + 1))


def level_kab(F, sk, kab, e, thr):
    return max(lv(F[s][0][e], b[0], F[s][1][e], thr) for s, b in sk[kab].items())


def kuantil(xs, pi):
    """Nearest-rank pada daftar terurut, persentil pi/10; dibulatkan 0,1 mm."""
    return round(xs[max(0, min(len(xs) - 1, -(-pi * len(xs) // 1000) - 1))], 1)


def kolam(F, sk, kab, hari):
    return sorted(F[s][0][e] for s in sk[kab] for e in hari)


def thr_pi(pool, pw, ps, pa):
    """Ambang mm (w, s, a) dari persentil + lantai 20/40/60 mm dan urutan w <= s <= a terjamin (amandemen A1)."""
    w = max(kuantil(pool, pw), LANTAI_W)
    sg = max(kuantil(pool, ps), LANTAI_S, w)
    return (w, sg, max(kuantil(pool, pa), LANTAI_A, sg))


def tersentuh(pool, pw, ps, pa):
    """-> (lantai W, lantai S, lantai A, urutan) apakah persentil mentah kab ini diubah lantai/urutan."""
    w, sg, a = kuantil(pool, pw), kuantil(pool, ps), kuantil(pool, pa)
    return (w < LANTAI_W, sg < LANTAI_S, a < LANTAI_A, not (w <= sg <= a))


def hitung_alarm(F, sk, kabs, hari, thr_kab):
    """-> [alarm >= Waspada, >= Siaga, >= Awas] kab-hari di seluruh sampel."""
    n = [0, 0, 0]
    for k in kabs:
        t = thr_kab[k]
        for e in hari:
            l = level_kab(F, sk, k, e, t)
            for i in range(3):
                n[i] += l >= i + 1
    return n


def cari_pi(hitung, target):
    """Persentil (persepuluh) yang hitung(pi) (tidak naik terhadap pi) paling dekat ke target; seri -> lebih tinggi.
    -> (pi, tepi) dengan tepi = "" | "batas_bawah" | "batas_atas" bila target di luar jangkauan kisi."""
    lo, hi = PI[0], PI[-1]
    if hitung(lo) <= target:
        return lo, "batas_bawah"
    if hitung(hi) > target:
        return hi, "batas_atas"
    l, r = lo, hi            # hitung(l) > target >= hitung(r)
    while r - l > 1:
        m = (l + r) // 2
        l, r = (l, m) if hitung(m) <= target else (m, r)
    return (l if abs(hitung(l) - target) < abs(hitung(r) - target) else r), ""


def pilih_persentil(F, sk, kabs, hari):
    """Pw, Ps, Pa (persepuluh) dan ambang mm per kab yang mencocokkan jumlah alarm aturan sekarang di `hari` (TANPA label)."""
    pools = {k: kolam(F, sk, k, hari) for k in kabs}
    target = hitung_alarm(F, sk, kabs, hari, {k: tuple(LAMA) for k in kabs})
    pa, t3 = cari_pi(lambda p: hitung_alarm(F, sk, kabs, hari, {k: thr_pi(pools[k], PI[0], PI[0], p) for k in kabs})[2], target[2])
    ps, t2 = cari_pi(lambda p: hitung_alarm(F, sk, kabs, hari, {k: thr_pi(pools[k], PI[0], p, pa) for k in kabs})[1], target[1])
    pw, t1 = cari_pi(lambda p: hitung_alarm(F, sk, kabs, hari, {k: thr_pi(pools[k], p, ps, pa) for k in kabs})[0], target[0])
    thr = {k: thr_pi(pools[k], pw, ps, pa) for k in kabs}
    return {"pi": {"w": pw, "s": ps, "a": pa}, "tepi": {"w": t1, "s": t2, "a": t3}, "target": target,
            "alarm": hitung_alarm(F, sk, kabs, hari, thr), "thr": thr,
            "tersentuh": [sum(tersentuh(pools[k], pw, ps, pa)[i] for k in kabs) for i in range(4)]}


# ------------------------------------------------------------------ penilaian
def baris_kab(F, sk, kabs, hari, thr_kab, kej):
    """-> [(kab, e, level_persentil, level_lama, kejadian)]."""
    return [(k, e, level_kab(F, sk, k, e, thr_kab[k]), level_kab(F, sk, k, e, tuple(LAMA)), e in kej.get(k, ()))
            for k in kabs for e in hari]


def pulau(kab):
    return ub.KELOMPOK[kab[0]]


def blok_tabel(baris, aturan, kunci):
    """aturan 0 = persentil, 1 = lama; kunci(kab, e) -> kunci blok. -> {blok: [[a, b, c, d] x 3 level]}."""
    out = {}
    for r in baris:
        t = out.setdefault(kunci(r[0], r[1]), [[0, 0, 0, 0] for _ in LEVEL])
        for i in range(3):
            t[i][(0 if r[4] else 1) if r[2 + aturan] >= i + 1 else (2 if r[4] else 3)] += 1
    return out


def kunci_tahun(k, e):
    return (k, (ub.AWAL + dt.timedelta(e)).year)


def kunci_minggu(k, e):
    d = (ub.AWAL + dt.timedelta(e)).isocalendar()
    return (pulau(k), d[0], d[1])


def dets(b1, b0, i, ulang=ULANG, seed=1):
    """dETS = ETS(b1) - ETS(b0) di level i, bootstrap blok berpasangan. -> (titik, [bawah, atas])."""
    ets = lambda b, ks: ub.skor(*ub.jumlah(b, ks, i))["ets"] or 0
    kunci, r, xs = sorted(b0), random.Random(seed), []
    for _ in range(ulang):
        pk = [r.choice(kunci) for _ in kunci]
        xs.append(ets(b1, pk) - ets(b0, pk))
    xs.sort()
    return round(ets(b1, kunci) - ets(b0, kunci), 4), [round(xs[int(.025 * (ulang - 1))], 4), round(xs[int(.975 * (ulang - 1))], 4)]


def ring(b, i):
    n = ub.jumlah(b, sorted(b), i)
    return {**{m: None if v is None else round(v, 3) for m, v in ub.skor(*n).items()}, "n": dict(zip("abcd", n)), "alarm": n[0] + n[1]}


def nilai_periode(baris):
    """Skor kedua aturan (>= Waspada, >= Siaga, Awas), dETS + CI95 dua skema blok, dan per pulau. Fungsi inti (disidik)."""
    bt = [blok_tabel(baris, a, kunci_tahun) for a in (0, 1)]
    bm = [blok_tabel(baris, a, kunci_minggu) for a in (0, 1)]
    out = {"persentil": {LEVEL[i]: ring(bt[0], i) for i in range(3)}, "lama": {LEVEL[i]: ring(bt[1], i) for i in range(3)},
           "dets": {}, "pulau": {}}
    for i in range(3):
        d, ci = dets(bt[0], bt[1], i)
        dm, cim = dets(bm[0], bm[1], i)
        out["dets"][LEVEL[i]] = {"nilai": d, "ci_kab_tahun": ci, "nilai_minggu": dm, "ci_pulau_minggu": cim}
    for g in sorted({pulau(r[0]) for r in baris}):
        sub = [r for r in baris if pulau(r[0]) == g]
        b = [blok_tabel(sub, a, kunci_tahun) for a in (0, 1)]
        out["pulau"][g] = {"kab": len({r[0] for r in sub}), **{n: {LEVEL[i]: ring(b[a], i) for i in range(2)} for a, n in enumerate(("persentil", "lama"))}}
    return out


def vonis(res):
    """LULUS / TIDAK LULUS / TIDAK MEYAKINKAN (protokol §4 + amandemen A1), batas bawah di KEDUA skema blok."""
    w, sg = res["dets"]["waspada"], res["dets"]["siaga"]
    lulus_w = w["nilai"] >= EFEK_W and w["ci_kab_tahun"][0] > 0 and w["ci_pulau_minggu"][0] > 0
    lulus_s = sg["nilai"] >= 0 and sg["ci_kab_tahun"][0] > TOL_S and sg["ci_pulau_minggu"][0] > TOL_S
    if lulus_w and lulus_s:
        return "LULUS"
    return "TIDAK LULUS" if w["nilai"] <= 0 else "TIDAK MEYAKINKAN"


# ------------------------------------------------------------------ data, sidik, gerbang
def sha(b):
    return hashlib.sha256(b).hexdigest()


def sha_berkas(p):
    return sha(open(p, "rb").read())


def pilih_sampel():
    sk = ub.sel_per_kab()
    kabs = sorted(k for k in sk if not k.endswith("|None") and all(os.path.exists(ub.jalur(*s)) for s in sk[k]))
    return {"dibuat": dt.date.today().isoformat(), "aturan": "PRAREG-AMBANG-PERSENTIL §2", "kab": kabs,
            "sk": {k: [[la, lo, *b] for (la, lo), b in sorted(sk[k].items())] for k in kabs}}


def sk_dari(sam):
    return sam["kab"], {k: {(a, b): [c, d] for a, b, c, d in v} for k, v in sam["sk"].items()}


def muat_F(sk):
    F = {}
    for s in sorted({s for v in sk.values() for s in v}):
        with gzip.open(ub.jalur(*s), "rt") as f:
            F[s] = fitur(ub.deret(json.load(f)))
    return F


def dibi_le2025():
    return sorted(r for r in baca(DIBI) if r[3] <= "2025-12-31")


def manifest(sk):
    return {os.path.basename(ub.jalur(*s)): sha_berkas(ub.jalur(*s)) for s in sorted({s for v in sk.values() for s in v})}


def sidik_inti():
    return [lv, fitur, hari_periode, level_kab, kuantil, kolam, thr_pi, hitung_alarm, cari_pi, pilih_persentil, baris_kab, pulau,
            blok_tabel, kunci_tahun, kunci_minggu, dets, ring, nilai_periode, vonis, gerbang_buka, hasil_periode, muat_latih, ev_banjir, main_buka, main_validasi, tersentuh]


def hitung_sidik(sam, latih):
    """Sidik sha256 (protokol §6). latih = {"pi":..., "ambang_mm":...}."""
    kode = "".join(inspect.getsource(f) for f in sidik_inti()) + repr((LATIH, VALID, UJI, PI, LANTAI_W, LANTAI_S, LANTAI_A, EFEK_W, TOL_S, LAMA, ULANG))
    sk = sk_dari(sam)[1]
    bagian = {"protokol": sha_berkas(PROTOKOL), "kode": sha(kode.encode()), "status": sha_berkas(os.path.join(AKAR, "scripts/banjir/status.py")),
              "uji_balik": sha_berkas(os.path.join(AKAR, "scripts/banjir/uji_balik.py")), "umum": sha_berkas(os.path.join(AKAR, "scripts/banjir/umum.py")),
              "sampel": sha(json.dumps(sam, sort_keys=True).encode()), "persentil": sha(json.dumps(latih, sort_keys=True).encode()),
              "dibi_le2025": sha(json.dumps(dibi_le2025()).encode()), "era5": sha(json.dumps(manifest(sk), sort_keys=True).encode())}
    return sha(json.dumps(bagian, sort_keys=True).encode()), bagian


def baca_jejak(jejak=JEJAK):
    return [json.loads(x) for x in open(jejak)] if os.path.exists(jejak) else []


def tambah_jejak(b, jejak=JEJAK):
    with open(jejak, "a") as f:
        f.write(json.dumps({**b, "waktu": dt.datetime.now().isoformat(timespec="seconds")}, ensure_ascii=False) + "\n")


def gerbang_buka(raw, jejak, sidik_skrg):
    """Semua pemeriksaan `buka`; TIDAK menulis apa pun."""
    for n in ("buka.mulai", "buka.json"):
        if os.path.exists(os.path.join(raw, n)):
            sys.exit(f"{n} ada: uji sudah dibuka, tidak bisa dibuka lagi")
    jj = baca_jejak(jejak)
    if any(b.get("jenis") in ("buka", "buka_mulai") for b in jj):
        sys.exit("jejak sudah memuat baris `buka_mulai`/`buka`")
    if not os.path.exists(os.path.join(raw, "validasi.json")) or not any(b.get("jenis") == "validasi" and b.get("sidik") == sidik_skrg for b in jj):
        sys.exit("`validasi` dengan sidik sekarang belum dijalankan")
    if not any(b.get("jenis") == "latih" and b.get("sidik") == sidik_skrg for b in jj):
        sys.exit("sidik berubah sejak `latih` (atau baris latih tidak ada): ditolak")


def ev_banjir():
    return ub.peristiwa(dibi_le2025())["banjir"]


def muat_latih():
    sam, latih = baca(os.path.join(RAW, "sampel.json")), baca(os.path.join(RAW, "latih.json"))
    if not sam or not latih:
        sys.exit("jalankan `latih` dulu")
    sid, _ = hitung_sidik(sam, {"pi": latih["pi"], "ambang_mm": latih["ambang_mm"]})
    if sid != latih["sidik"] or not any(b.get("jenis") == "latih" and b.get("sidik") == sid for b in baca_jejak()):
        sys.exit("sidik berubah sejak `latih`: ditolak")
    return sam, latih, sid


# ------------------------------------------------------------------ mode
def main_latih():
    if os.path.exists(os.path.join(RAW, "latih.json")):
        sys.exit("latih.json ada: sudah dilatih (hapus sadar bila memang ulang sebelum validasi)")
    sam = pilih_sampel()
    kabs, sk = sk_dari(sam)
    F = muat_F(sk)
    hari = hari_periode(LATIH)
    assert ub.AWAL + dt.timedelta(hari[-1] + 1) <= dt.date(2021, 12, 31)
    r = pilih_persentil(F, sk, kabs, hari)
    mm = {k: list(r["thr"][k]) for k in kabs}
    latih = {"pi": r["pi"], "persentil": {n: v / 10 for n, v in r["pi"].items()}, "tepi": r["tepi"], "target_alarm_aturan_sekarang": r["target"],
             "alarm_persentil": r["alarm"], "hari_latih": len(hari), "ambang_mm": mm,
             "urutan_terbalik": sum(not (t[0] <= t[1] <= t[2]) for t in mm.values()), "tersentuh_lantai_urutan": r["tersentuh"]}
    sid, bagian = hitung_sidik(sam, {"pi": latih["pi"], "ambang_mm": mm})
    latih["sidik"], latih["sidik_bagian"] = sid, bagian
    os.makedirs(RAW, exist_ok=True)
    simpan(os.path.join(RAW, "sampel.json"), sam)
    simpan(os.path.join(RAW, "dibi_le2025.json"), dibi_le2025())
    simpan(os.path.join(RAW, "latih.json"), latih)
    tambah_jejak({"jenis": "latih", "sidik": sid})
    n_sel = len({s for v in sk.values() for s in v})
    print(f"sampel {len(kabs)} kab, {n_sel} sel unik ({sum(len(v) for v in sk.values())} kab-sel), {len(hari)} hari latih")
    print(f"persentil Pw/Ps/Pa = {r['pi']['w'] / 10}/{r['pi']['s'] / 10}/{r['pi']['a'] / 10}  tepi {r['tepi']}")
    print(f"kab tersentuh lantai W/S/A dan urutan: {r['tersentuh']} dari {len(kabs)}")
    print(f"alarm latih  target(sekarang) {r['target']}  persentil {r['alarm']}  ambang terbalik di {latih['urutan_terbalik']} kab")
    print(f"sidik {sid}")
    urut = sorted(kabs, key=lambda k: mm[k][0])
    print("terkering:", "; ".join(f"{k} {mm[k]}" for k in urut[:5]))
    print("terbasah :", "; ".join(f"{k} {mm[k]}" for k in urut[-5:]))
    print("COMMIT ambang_persentil.sidik sebelum `buka`.")


def hasil_periode(per):
    sam, latih, sid = muat_latih()
    kabs, sk = sk_dari(sam)
    F = muat_F(sk)
    thr = {k: tuple(v) for k, v in latih["ambang_mm"].items()}
    return nilai_periode(baris_kab(F, sk, kabs, hari_periode(per), thr, ev_banjir())), latih, sam, sid


def cetak(res, judul):
    print(f"\n== {judul}")
    for i, L in enumerate(LEVEL[:2]):
        for a, n in (("lama", "sekarang  "), ("persentil", "persentil ")):
            r = res[a][L]
            f = lambda x: " -  " if r[x] is None else f"{r[x]:.3f}"
            print(f"  >= {L:8s} {n} alarm {r['alarm']:6d} (a={r['n']['a']}) POD {f('pod')} FAR {f('far')} CSI {f('csi')} ETS {f('ets')}")
        d = res["dets"][L]
        print(f"    dETS {d['nilai']:+.4f} CI95 kab x tahun {d['ci_kab_tahun']}   (pulau x minggu {d['nilai_minggu']:+.4f} {d['ci_pulau_minggu']})")
    print(f"  vonis (informasi di validasi): {vonis(res)}")
    for g, v in res["pulau"].items():
        print(f"  {g:20s} {v['kab']:2d} kab  >=Waspada ETS lama {v['lama']['waspada']['ets']} persentil {v['persentil']['waspada']['ets']}"
              f" (alarm {v['lama']['waspada']['alarm']}/{v['persentil']['waspada']['alarm']})")


def tulis_publik(latih, sam, valid=None, uji=None, uji26=None):
    simpan(PUBLIK, {"pakai": False, "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
                    "catatan": "Percobaan luring (PRAREG-AMBANG-PERSENTIL.md); TIDAK dipakai status.py atau layar. Hujan ERA5 sebagai prakiraan sempurna (batas atas keterampilan); DIBI kurang mencatat kejadian kecil, FAR mutlak pesimistis; hanya 40 kab sampel yang sering banjir, tidak berlaku nasional.",
                    "persentil": latih["persentil"], "sidik": latih["sidik"], "alarm_latih": {"sekarang": latih["target_alarm_aturan_sekarang"], "persentil": latih["alarm_persentil"]},
                    "ambang_mm": {k: dict(zip(("waspada", "siaga", "awas"), v)) for k, v in latih["ambang_mm"].items()},
                    "nasional_mm": dict(zip(("waspada", "siaga", "awas"), LAMA)), "validasi_2022_2023": valid, "uji_2024_2025": uji, "sensitif_2026": uji26})


def main_validasi():
    res, latih, sam, sid = hasil_periode(VALID)
    simpan(os.path.join(RAW, "validasi.json"), res)
    tambah_jejak({"jenis": "validasi", "sidik": sid})
    tulis_publik(latih, sam, valid=res)
    cetak(res, "VALIDASI 2022-2023")


def sensitif_2026(sam, latih):
    """Kepekaan (bukan gerbang, tidak disidik): 2026-01-01..10-18, label DIBI ATAU logbook hari mulai, kab terpetakan."""
    import model_kab_debit as MKD, uji_logbook as UL
    kabs, sk = sk_dari(sam)
    desa = json.load(open(os.path.join(AKAR, "public/data/desa_cari.json")))["kab"]
    peta = UL.kode_geo(desa, [tuple(k.split("|", 1)) for k in kabs])
    ke = {v: f"{p}|{n}" for (p, n), v in peta.items()}
    lab, _ = UL.label_dari(json.load(open(UL.LB))["kejadian"], json.load(open(UL.DIBI))["kejadian"], akhir=UJI26[1])
    kej = defaultdict(set)
    for kode, idx in lab["gab_mulai"].items():
        for i in idx:
            d = UL.AWAL + dt.timedelta(i)
            if kode in ke and UJI26[0] <= d <= UJI26[1]:
                kej[ke[kode]].add((d - ub.AWAL).days)
    sel = sorted({s for v in sk.values() for s in v})
    F = {s: fitur(c) for s, c in MKD.cuaca_sampai(sel, AKHIR_26).items()}
    kp = [k for k in kabs if k in ke.values()]
    hari = list(range(ub.hari_ke(UJI26[0]), ub.hari_ke(UJI26[1]) + 1))
    thr = {k: tuple(v) for k, v in latih["ambang_mm"].items()}
    res = nilai_periode(baris_kab(F, sk, kp, hari, thr, kej))
    res["kab_terpetakan"], res["kab_hari_label"] = len(kp), sum(len(v) for v in kej.values())
    return res


def main_buka():
    sam, latih, sid = muat_latih()
    gerbang_buka(RAW, JEJAK, sid)
    fd = os.open(os.path.join(RAW, "buka.mulai"), os.O_CREAT | os.O_EXCL | os.O_WRONLY)   # sebelum menilai: mati di tengah tetap terhitung
    os.write(fd, dt.datetime.now().isoformat().encode())
    os.close(fd)
    tambah_jejak({"jenis": "buka_mulai", "sidik": sid})   # berkas dilacak git, sebelum menilai
    res, *_ = hasil_periode(UJI)
    res["vonis"] = vonis(res)
    try:
        r26 = sensitif_2026(sam, latih)
    except BaseException as e:   # kepekaan bukan gerbang; kegagalannya tidak menghilangkan vonis
        r26 = {"galat": repr(e)}
    simpan(os.path.join(RAW, "buka.json"), {"uji": res, "sensitif_2026": r26})
    tambah_jejak({"jenis": "buka", "sidik": sid, "vonis": res["vonis"]})
    valid = baca(os.path.join(RAW, "validasi.json"))
    tulis_publik(latih, sam, valid=valid, uji=res, uji26=r26)
    cetak(res, f"UJI 2024-2025: {res['vonis']}")
    if "galat" not in r26:
        cetak(r26, "KEPEKAAN 2026 (bukan gerbang)")
    else:
        print("kepekaan 2026 gagal:", r26["galat"])


# ------------------------------------------------------------------ swauji
def uji():
    import tempfile
    # 1. lv == status.level_banjir (rk, cape, p3 tidak dipakai) pada ambang nasional, dan ambang() dipakai apa adanya
    assert LAMA == ambang(K_BANJIR) == [40.0, 80.0, 120.0]
    for h3 in (0, 39.9, 40, 79.9, 80, 119.9, 120, 300):
        for b in (0, .32, .33, .65, .66, 1):
            for im in (0, 19.9, 20, 29.9, 30, 50):
                assert lv(h3, b, im, LAMA) == level_banjir(h3, b, None, im, None, None, k=K_BANJIR), (h3, b, im)
    # 2. kuantil nearest-rank
    xs = list(range(1, 101))
    assert kuantil(xs, 900) == 90 and kuantil(xs, 999) == 100 and kuantil(xs, 500) == 50 and kuantil([7], 999) == 7
    # data mainan: 3 kab, hujan acak berderet panjang aslinya (index ub.AWAL..AKHIR)
    n = (ub.AKHIR - ub.AWAL).days + 1
    r = random.Random(5)

    def cuaca(skala):
        p = [r.expovariate(1 / skala) if r.random() < 0.4 else 0.0 for _ in range(n)]
        return {"p": p, "im": [min(60.0, x / 3) for x in p], "sm": [0.3] * n}
    c = {(0, 0): cuaca(25), (0, 1): cuaca(25), (1, 1): cuaca(8), (2, 2): cuaca(1)}
    sk = {"32|X": {(0, 0): [0.5, 0], (0, 1): [0.7, 0]}, "53|Y": {(1, 1): [0.5, 0]}, "51|Z": {(2, 2): [0.5, 0]}}
    kabs = sorted(sk)
    F = {s: fitur(v) for s, v in c.items()}
    hari = hari_periode(LATIH)
    assert ub.AWAL + dt.timedelta(hari[-1] + 1) <= dt.date(2021, 12, 31)   # jendela terakhir tidak menyentuh 2022
    # 3. pencocokan jumlah alarm + lantai Waspada + kab kering
    h = pilih_persentil(F, sk, kabs, hari)
    assert all(t > 0 for t in h["target"]) and set(h["tepi"].values()) == {""}, (h["tepi"], h["target"])
    pools = {k: kolam(F, sk, k, hari) for k in kabs}
    for dp in (-1, 1):   # tetangga kisi Pw (s, a tetap) tidak lebih dekat ke target
        q = h["pi"]["w"] + dp
        a2 = hitung_alarm(F, sk, kabs, hari, {k: thr_pi(pools[k], q, h["pi"]["s"], h["pi"]["a"]) for k in kabs})
        assert abs(a2[0] - h["target"][0]) >= abs(h["alarm"][0] - h["target"][0]), (dp, a2, h["alarm"])
    assert h["thr"]["51|Z"][0] == LANTAI_W and h["thr"]["51|Z"][1:] == (LANTAI_S, LANTAI_A)   # kab sangat kering: ketiga lantai berlaku
    assert h["thr"]["32|X"][0] > h["thr"]["53|Y"][0]                           # kab basah ambangnya lebih tinggi dari kab kering
    assert abs(h["alarm"][0] - h["target"][0]) <= 0.02 * h["target"][0] + 5, (h["alarm"], h["target"])
    # 4. tidak ada hari > 2021 yang memengaruhi persentil: ubah seluruh hujan >= 2022-01-01 menjadi ekstrem
    mulai22 = ub.hari_ke(dt.date(2022, 1, 1))
    c2 = {s: {**v, "p": v["p"][:mulai22] + [999.0] * (n - mulai22), "im": v["im"][:mulai22] + [99.0] * (n - mulai22)} for s, v in c.items()}
    F2 = {s: fitur(v) for s, v in c2.items()}
    h2 = pilih_persentil(F2, sk, kabs, hari)
    assert h2["thr"] == h["thr"] and h2["pi"] == h["pi"] and h2["target"] == h["target"], "persentil memakai data >= 2022"
    # 5. baris_kab/blok_tabel aturan sekarang == uji_balik.tabel (kontingensi identik)
    ev = {"banjir": {k: {e for e in range(10, 3600) if r.random() < 0.02} for k in kabs}, "longsor": {}}
    per = (dt.date(2016, 1, 1), dt.date(2017, 12, 31))
    mine = blok_tabel(baris_kab(F, sk, kabs, hari_periode(per), {k: tuple(LAMA) for k in kabs}, ev["banjir"]), 1, kunci_tahun)
    ref = ub.tabel(c, sk, kabs, ev, "banjir", {"k": K_BANJIR, "geser": GESER}, [2016, 2017])
    assert mine == ref, "baris_kab beda dari uji_balik.tabel"
    # 6. dETS: tabel identik -> 0 dan CI nol; nilai_periode jalan, vonis tegas
    res = nilai_periode(baris_kab(F, sk, kabs, hari_periode(VALID), {k: tuple(LAMA) for k in kabs}, ev["banjir"]))
    assert res["dets"]["waspada"]["nilai"] == 0 and res["dets"]["waspada"]["ci_kab_tahun"] == [0, 0] and vonis(res) == "TIDAK LULUS"
    W = {"nilai": .004, "ci_kab_tahun": [.001, .008], "ci_pulau_minggu": [.0005, .008]}
    S = {"nilai": .001, "ci_kab_tahun": [-.003, .005], "ci_pulau_minggu": [-.004, .006]}
    pos = {"dets": {"waspada": W, "siaga": S}}
    assert vonis(pos) == "LULUS"
    kecil = lambda **k: {"dets": {"waspada": {**W, **k.get("w", {})}, "siaga": {**S, **k.get("s", {})}}}
    assert vonis(kecil(w={"ci_pulau_minggu": [-.0001, .008]})) == "TIDAK MEYAKINKAN"   # lulus kab x tahun, gagal pulau x minggu
    assert vonis(kecil(w={"nilai": .0019})) == "TIDAK MEYAKINKAN"                       # di bawah efek minimum 0,002
    assert vonis(kecil(s={"nilai": -.001})) == "TIDAK MEYAKINKAN"                       # Siaga titik negatif
    assert vonis(kecil(s={"ci_pulau_minggu": [-.006, .006]})) == "TIDAK MEYAKINKAN"     # Siaga lewat toleransi -0,005
    assert vonis(kecil(w={"nilai": -.1, "ci_kab_tahun": [-.2, .05]})) == "TIDAK LULUS"
    # lantai S/A dan urutan: kab sintetis sangat kering dan kab dengan persentil Waspada > Siaga
    assert thr_pi([0.0] * 50, 500, 999, 999) == (20.0, 40.0, 60.0)
    assert thr_pi([100.0] * 50, 500, 500, 500) == (100.0, 100.0, 100.0)
    assert thr_pi([10.0] * 25 + [90.0] * 25, 999, 500, 500) == (90.0, 90.0, 90.0)   # w > s mentah: s dan a diangkat
    assert tersentuh([0.0] * 50, 500, 500, 500) == (True, True, True, False) and tersentuh([100.0] * 50, 500, 500, 500) == (False,) * 4
    # 7. gerbang buka: menolak tanpa latih/validasi, sidik beda, dan buka kedua kali
    def tolak(raw, jej, sid):
        try:
            gerbang_buka(raw, jej, sid)
        except SystemExit:
            return True
        return False
    with tempfile.TemporaryDirectory() as d:
        jej = os.path.join(d, "x.sidik")
        assert tolak(d, jej, "S")                                           # belum ada latih/validasi
        tambah_jejak({"jenis": "latih", "sidik": "S"}, jej)
        tambah_jejak({"jenis": "validasi", "sidik": "LAMA"}, jej)
        open(os.path.join(d, "validasi.json"), "w").write("{}")
        assert tolak(d, jej, "S")                                           # validasi bersidik lama
        tambah_jejak({"jenis": "validasi", "sidik": "S"}, jej)
        os.remove(os.path.join(d, "validasi.json"))
        assert tolak(d, jej, "S")                                           # validasi.json belum ada
        open(os.path.join(d, "validasi.json"), "w").write("{}")
        assert tolak(d, jej, "BEDA")                                        # sidik berubah
        gerbang_buka(d, jej, "S")                                           # sekarang boleh
        open(os.path.join(d, "buka.mulai"), "w").write("x")
        assert tolak(d, jej, "S")                                           # sudah dimulai
        os.remove(os.path.join(d, "buka.mulai"))
        tambah_jejak({"jenis": "buka_mulai", "sidik": "S"}, jej)
        assert tolak(d, jej, "S")                                           # baris buka_mulai sudah di jejak
    print("ok ambang_persentil")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    {"uji": uji, "latih": main_latih, "validasi": main_validasi, "buka": main_buka}.get(m, lambda: sys.exit(__doc__))()
