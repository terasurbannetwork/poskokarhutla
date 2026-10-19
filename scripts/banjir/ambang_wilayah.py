"""Ambang status banjir per wilayah (kabupaten) -> public/banjir/data/ambang_wilayah.json + blok ambang_wilayah di validasi.json

Uji luring, bukan langkah harian. Protokol lengkap (ditulis SEBELUM angka validasi/uji dilihat) di RISET-AMBANG-WILAYAH.md;
ringkasnya:
- Data = uji_balik.py apa adanya: kabupaten-hari, level kabupaten = kecamatan tertinggi, hujan ERA5 sempurna (cache
  data/raw/banjir/uji_balik/), kejadian DIBI banjir/bandang (data/raw/banjir/dibi_tanggal.json), sampel uji_balik.pilih().
- Kenop per wilayah: satu pengali k untuk ambang H3 50/100/150 x k, k in KISI_K; jalur I, bahaya, GESER tetap global.
  Aturan sekarang = K_BANJIR (0,8) di semua wilayah.
- latih 2016-2021 memilih k: di antara k dengan POD >= Waspada turun <= eps dari POD aturan sekarang di wilayah itu,
  FAR terkecil (seri: CSI terbesar, lalu k terdekat K_BANJIR); tidak ada yang lolos -> K_BANJIR.
- Penyusutan: nasional atas semua kab; pulau pakai k sendiri bila hari kejadian latih >= n_min, selain itu k nasional;
  kabupaten pakai k sendiri bila hari kejadian latih >= n_min, selain itu k pulaunya.
- validasi 2022-2023 memilih (eps, n_min) dari HIPER: dDFAR terkecil di antara yang dPOD >= -0,05 (seri: dCSI terbesar);
  tak ada yang lolos -> dPOD terbesar.
- uji 2024-2025 dibuka SEKALI (`buka`): sidik parameter disimpan; `buka` menolak bila sidik beda dari yang pernah dibuka.
- Pembanding di uji: aturan sekarang, dan alarm acak berlaju sama (tiap blok kab x tahun, hari alarm ditarik acak sebanyak
  hari alarm aturan wilayah di blok itu). Selang: bootstrap blok kab x tahun 1.000 ulangan, berpasangan.
- LAYAK bila (>= Waspada, uji): dFAR <= -0,10 dan CI atas dFAR < 0; dPOD >= -0,05; dCSI > 0 dan CI bawah dCSI > 0;
  CSI wilayah > CI atas CSI acak; selisih ETS rata tiga level >= 0. Hanya bila LAYAK status.py boleh memakai k wilayah.
- Bias DIBI: kurang lapor -> FAR mutlak pesimistis; pencatatan naik per tahun; 2024 kurang lengkap; tanggal = laporan.

Pakai:  python3 scripts/banjir/ambang_wilayah.py ambil   unduh ERA5 sampel yang belum ada (kuota, bisa jam-jaman)
        python3 scripts/banjir/ambang_wilayah.py latih   pilih k (latih) + hiperparameter (validasi); tanpa angka uji
        python3 scripts/banjir/ambang_wilayah.py buka    buka uji 2024-2025 SEKALI, tulis vonis
        python3 scripts/banjir/ambang_wilayah.py uji     swauji luring, data mainan
"""
import datetime as dt, gzip, hashlib, json, os, random, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, baca, simpan
from status import GESER, K_BANJIR
import uji_balik as ub

LATIH, VALIDASI, UJI = range(2016, 2022), range(2022, 2024), range(2024, 2026)
KISI_K = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 2.0]
HIPER = [(eps, n) for eps in (0.02, 0.04) for n in (20, 40, 80, None)]   # n_min None = tak hingga (satu k nasional)
BATAS_DPOD = -0.05
JALUR = os.path.join(KELUAR, "ambang_wilayah.json")
VERSI = "protokol-2026-10-19"
ULANG = ub.ULANG


# ------------------------------------------------------------------ hitungan dasar (blok[(kab, tahun)] = [[a,b,c,d] x 3 level])
def jumlah(blok, kunci, i=0):
    t = [0, 0, 0, 0]
    for k in kunci:
        t = [x + y for x, y in zip(t, blok[k][i])]
    return t


def skor_kunci(blok, kunci, i=0):
    return ub.skor(*jumlah(blok, kunci, i))


def rakit(per_k, k_kab, tahun):
    """Blok aturan wilayah: tiap (kab, tahun) diambil dari tabel k milik kab itu."""
    return {(kab, y): per_k[k][(kab, y)] for kab, k in k_kab.items() for y in tahun if (kab, y) in per_k[k]}


def pilih_k(per_k, kabs, tahun, eps):
    """k untuk satu wilayah (gabungan kabs) di tahun latih; lihat docstring modul."""
    kunci = [(kab, y) for kab in kabs for y in tahun if (kab, y) in per_k[K_BANJIR]]
    dasar = skor_kunci(per_k[K_BANJIR], kunci)["pod"]
    if dasar is None:
        return K_BANJIR
    calon = []
    for k in KISI_K:
        s = skor_kunci(per_k[k], kunci)
        if s["pod"] is not None and s["pod"] >= dasar - eps - 1e-12 and s["far"] is not None:
            calon.append((s["far"], -(s["csi"] or 0), abs(k - K_BANJIR), k))
    return min(calon)[3] if calon else K_BANJIR


def n_kejadian(blok, kabs, tahun):
    return sum(blok[(kab, y)][0][0] + blok[(kab, y)][0][2] for kab in kabs for y in tahun if (kab, y) in blok)


def susun(per_k, kabs, eps, n_min, tahun=LATIH):
    """-> {"nasional": k, "pulau": {g: k}, "kab": {kab: k}, "sumber": {kab: "kab"|"pulau"|"nasional"}}"""
    b0 = per_k[K_BANJIR]
    knas = pilih_k(per_k, kabs, tahun, eps)
    pulau, kab_k, sumber = {}, {}, {}
    for g in sorted({ub.KELOMPOK[k[0]] for k in kabs}):
        anggota = [k for k in kabs if ub.KELOMPOK[k[0]] == g]
        sendiri = n_min is not None and n_kejadian(b0, anggota, tahun) >= n_min
        pulau[g] = pilih_k(per_k, anggota, tahun, eps) if sendiri else knas
        for kab in anggota:
            if n_min is not None and n_kejadian(b0, [kab], tahun) >= n_min:
                kab_k[kab], sumber[kab] = pilih_k(per_k, [kab], tahun, eps), "kab"
            else:
                kab_k[kab], sumber[kab] = pulau[g], "pulau" if sendiri else "nasional"
    return {"nasional": knas, "pulau": pulau, "kab": kab_k, "sumber": sumber}


def beda(b1, b0, kunci):
    """Selisih titik POD/FAR/CSI >= Waspada (b1 - b0) di kunci."""
    s1, s0 = skor_kunci(b1, kunci), skor_kunci(b0, kunci)
    return {m: None if s1[m] is None or s0[m] is None else s1[m] - s0[m] for m in ("pod", "far", "csi")}


def pilih_hiper(per_k, kabs):
    """Hiperparameter dipilih di VALIDASI saja. -> (eps, n_min, susunan, tabel calon)"""
    calon = []
    for eps, n_min in HIPER:
        sus = susun(per_k, kabs, eps, n_min)
        b1, b0 = rakit(per_k, sus["kab"], VALIDASI), rakit(per_k, {k: K_BANJIR for k in kabs}, VALIDASI)
        d = beda(b1, b0, sorted(b0))
        calon.append({"eps": eps, "n_min": n_min, "d": {m: None if v is None else round(v, 4) for m, v in d.items()}, "sus": sus})
    lolos = [c for c in calon if c["d"]["pod"] is not None and c["d"]["pod"] >= BATAS_DPOD]
    terbaik = min(lolos, key=lambda c: (c["d"]["far"], -c["d"]["csi"])) if lolos else max(calon, key=lambda c: c["d"]["pod"] or -9)
    return terbaik, calon


# ------------------------------------------------------------------ pembanding acak dan selang
def acak(blok, seed=7):
    """Alarm acak berlaju sama per blok dan level: m hari alarm dari N hari, kena = berapa yang jatuh di E hari kejadian."""
    r, out = random.Random(seed), {}
    for kunci in sorted(blok):
        baris = []
        for a, b, c, d in blok[kunci]:
            n, e, m = a + b + c + d, a + c, a + b
            kena = sum(1 for x in r.sample(range(n), m) if x < e) if n else 0
            baris.append([kena, m - kena, e - kena, n - e - m + kena])
        out[kunci] = baris
    return out


def ringkas(blok):
    """Skor >= Waspada, CI bootstrap (pola uji_balik.bootstrap), laju."""
    n = jumlah(blok, sorted(blok))
    s = ub.skor(*n)
    return {**{m: None if s[m] is None else round(s[m], 3) for m in ("pod", "far", "csi", "ets")},
            "ci": {m: v for m, v in ub.bootstrap(blok, 0).items() if m in ("pod", "far", "csi", "ets")},
            "n": dict(zip("abcd", n)), "laju": round((n[0] + n[1]) / sum(n), 3) if sum(n) else None}


def selisih(b1, b0, ulang=ULANG, seed=3):
    """Bootstrap berpasangan blok (kab, tahun): dPOD, dFAR, dCSI >= Waspada dan dETS rata tiga level. -> {m: [titik, [lo, hi]]}"""
    kunci, r, xs = sorted(b0), random.Random(seed), defaultdict(list)
    for _ in range(ulang):
        p = [r.choice(kunci) for _ in kunci]
        for m, v in beda(b1, b0, p).items():
            if v is not None:
                xs[m].append(v)
        xs["ets_rata"].append(ub.ets_rata(b1, p) - ub.ets_rata(b0, p))
    titik = {**beda(b1, b0, kunci), "ets_rata": ub.ets_rata(b1) - ub.ets_rata(b0)}
    out = {}
    for m, v in xs.items():
        v.sort()
        out[m] = [None if titik[m] is None else round(titik[m], 4), [round(v[int(.025 * (len(v) - 1))], 4), round(v[int(.975 * (len(v) - 1))], 4)]]
    return out


def vonis(d, wil, ack):
    """Kriteria LAYAK (RISET-AMBANG-WILAYAH.md), ditetapkan di muka. -> (layak, [(kriteria, lolos)])"""
    syarat = [("dFAR <= -0,10 dan CI atas dFAR < 0", d["far"][0] is not None and d["far"][0] <= -0.10 and d["far"][1][1] < 0),
              ("dPOD >= -0,05", d["pod"][0] is not None and d["pod"][0] >= BATAS_DPOD),
              ("dCSI > 0 dan CI bawah dCSI > 0", d["csi"][0] is not None and d["csi"][0] > 0 and d["csi"][1][0] > 0),
              ("CSI wilayah > CI atas CSI acak", wil["csi"] is not None and wil["csi"] > ack["ci"]["csi"][1]),
              ("selisih ETS rata tiga level >= 0", d["ets_rata"][0] >= 0)]
    return all(x for _, x in syarat), syarat


def sidik(sus, eps, n_min):
    teks = json.dumps({"versi": VERSI, "kab": sus["kab"], "eps": eps, "n_min": n_min, "kisi": KISI_K}, sort_keys=True)
    return hashlib.sha256(teks.encode()).hexdigest()[:16]


# ------------------------------------------------------------------ data nyata
def muat():
    baris = baca(os.path.join(MENTAH, "dibi_tanggal.json"))
    if not baris or min(r[3] for r in baris) > "2016-01-01":
        sys.exit("dibi_tanggal.json belum ada atau tidak memuat 2016-2021 (kejadian.json saja hanya 2023+): "
                 "jalankan riwayat.py saat DIBI terjangkau, atau pulihkan cache data/raw/banjir dari CI")
    ev, sk = ub.peristiwa(baris), ub.sel_per_kab()
    kabs = ub.pilih(ev, sk)
    return ev, sk, kabs, {s for k in kabs for s in sk[k]}


def tabel_k(ev, sk, kabs, sel):
    cuaca = {}
    for s in sel:
        with gzip.open(ub.jalur(*s), "rt") as f:
            cuaca[s] = ub.deret(json.load(f))
    semua = range(LATIH[0], UJI[-1] + 1)
    return {k: ub.tabel(cuaca, sk, kabs, ev, "banjir", {"k": k, "geser": GESER}, semua) for k in KISI_K}


def potong(blok, tahun):
    return {k: v for k, v in blok.items() if k[1] in tahun}


def baris_cetak(nama, r):
    f = lambda m: "  -  " if r[m] is None else f"{r[m]:.3f} [{r['ci'][m][0]:.3f}-{r['ci'][m][1]:.3f}]"
    return f"    {nama:9s} POD {f('pod')}  FAR {f('far')}  CSI {f('csi')}  laju {r['laju']}"


def latih():
    ev, sk, kabs, sel = muat()
    if not all(os.path.exists(ub.jalur(*s)) for s in sel):
        sys.exit("cache ERA5 belum lengkap: jalankan `ambang_wilayah.py ambil` dulu")
    per_k = tabel_k(ev, sk, kabs, sel)
    hari = {y: sum(sum(1 for e in ev["banjir"].get(k, ()) if (ub.AWAL + dt.timedelta(e)).year == y) for k in kabs)
            for y in range(LATIH[0], UJI[-1] + 1)}
    print(f"sampel {len(kabs)} kab, {len(sel)} sel; hari kejadian banjir per tahun (audit data, bukan skor): {hari}")
    t, calon = pilih_hiper(per_k, kabs)
    sus = t["sus"]
    sekarang = {k: K_BANJIR for k in kabs}
    per = {}
    for nama, th in (("latih", LATIH), ("validasi", VALIDASI)):
        b0, b1 = rakit(per_k, sekarang, th), rakit(per_k, sus["kab"], th)
        per[nama] = {"sekarang": ringkas(b0), "wilayah": ringkas(b1), "acak": ringkas(acak(b1)), "selisih": selisih(b1, b0)}
        print(f"  {nama} {th[0]}-{th[-1]}")
        for m in ("sekarang", "wilayah", "acak"):
            print(baris_cetak(m, per[nama][m]))
    for c in calon:
        print(f"  hiper eps {c['eps']} n_min {c['n_min']}: validasi d {c['d']}")
    print(f"  terpilih eps {t['eps']} n_min {t['n_min']}; k nasional {sus['nasional']}, pulau {sus['pulau']}")
    lama = baca(JALUR) or {}
    simpan(JALUR, {**{k: v for k, v in lama.items() if k in ("uji", "dibuka")},
                   "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
                   "versi": VERSI, "pakai": False, "periode": {"latih": "2016-2021", "validasi": "2022-2023", "uji": "2024-2025"},
                   "kisi_k": KISI_K, "eps": t["eps"], "n_min": t["n_min"], "sidik": sidik(sus, t["eps"], t["n_min"]),
                   **{k: sus[k] for k in ("nasional", "pulau", "kab", "sumber")}, "hasil": per,
                   "hiper": [{k: c[k] for k in ("eps", "n_min", "d")} for c in calon]})
    print(f"ambang_wilayah.json ditulis (uji BELUM dibuka)", file=sys.stderr)


def buka():
    A = baca(JALUR)
    if not A or "sidik" not in A:
        sys.exit("jalankan `latih` dulu")
    if A.get("dibuka") and A["dibuka"]["sidik"] != A["sidik"]:
        sys.exit(f"uji sudah dibuka untuk sidik {A['dibuka']['sidik']}; parameter berubah sesudahnya = eksperimen baru, tidak boleh dibuka ulang")
    ev, sk, kabs, sel = muat()
    if sorted(A["kab"]) != kabs:
        sys.exit("sampel kabupaten berubah sejak latih; jalankan latih ulang (uji belum dibuka) atau pulihkan data")
    per_k = tabel_k(ev, sk, kabs, sel)
    b0, b1 = rakit(per_k, {k: K_BANJIR for k in kabs}, UJI), rakit(per_k, A["kab"], UJI)
    wil, ack = ringkas(b1), ringkas(acak(b1))
    d = selisih(b1, b0)
    layak, syarat = vonis(d, wil, ack)
    uji_ = {"sekarang": ringkas(b0), "wilayah": wil, "acak": ack, "selisih": d,
            "kriteria": [{"syarat": s, "lolos": x} for s, x in syarat], "layak": layak}
    print("  uji 2024-2025")
    for m in ("sekarang", "wilayah", "acak"):
        print(baris_cetak(m, uji_[m]))
    print(f"  selisih {d}")
    for s, x in syarat:
        print(f"    {'LOLOS' if x else 'GAGAL'}  {s}")
    print(f"  VONIS: {'LAYAK' if layak else 'TIDAK LAYAK'}")
    A["dibuka"] = A.get("dibuka") or {"sidik": A["sidik"], "tanggal": dt.date.today().isoformat()}
    A["hasil"]["uji"] = uji_
    A["pakai"] = False  # status.py baru membaca bendera ini setelah vonis LAYAK ditinjau validasi-model
    simpan(JALUR, A)
    V = baca(os.path.join(KELUAR, "validasi.json"))
    V["ambang_wilayah"] = {"periode": A["periode"], "layak": layak, "pakai": False, "eps": A["eps"], "n_min": A["n_min"],
                           **{n: A["hasil"][n] for n in ("latih", "validasi", "uji")}}
    simpan(os.path.join(KELUAR, "validasi.json"), V)
    print("ambang_wilayah.json + validasi.json ditulis", file=sys.stderr)


# ------------------------------------------------------------------ swauji
def uji():
    kabs = ["32|A", "32|B", "33|C", "72|D"]

    def blok_k(k):
        # mainan: tiap kab-tahun 300 hari, 10 kejadian; k makin besar = alarm makin sedikit, palsu turun lebih cepat dari kena
        out = {}
        for kab in kabs:
            for y in range(2016, 2026):
                kena = max(0, round(8 - 2 * (k - 0.8) * (2 if kab == "32|A" else 1)))
                palsu = max(0, round(80 - 60 * (k - 0.8)))
                out[(kab, y)] = [[kena, palsu, 10 - kena, 290 - palsu]] * 3
        return out
    per_k = {k: blok_k(k) for k in KISI_K}
    # pilih_k: eps 0 -> POD tidak boleh turun sama sekali; eps besar -> k terbesar (FAR terkecil)
    assert pilih_k(per_k, ["32|B"], LATIH, 0) == 1.0   # POD sama dengan 0,8 (round) tapi alarm palsu lebih sedikit
    assert pilih_k(per_k, ["32|B"], LATIH, 1) == 2.0
    # 32|B: POD 0,8 -> k 1,4: kena round(8-1,2)=7 -> POD 0,7 (turun 0,1); eps 0,1 boleh, k 1,6 kena 6 tidak
    assert pilih_k(per_k, ["32|B"], LATIH, 0.1) == 1.4, pilih_k(per_k, ["32|B"], LATIH, 0.1)
    # penyusutan: n_min None -> semua nasional; n_min tinggi -> pulau/nasional; n_min rendah -> kab sendiri
    s = susun(per_k, kabs, 0.1, None)
    assert set(s["kab"].values()) == {s["nasional"]} and set(s["sumber"].values()) == {"nasional"}, s
    s = susun(per_k, kabs, 0.1, 10)
    assert s["sumber"]["32|A"] == "kab" and s["kab"]["32|A"] == 1.0 and s["kab"]["32|B"] == 1.4, s  # 32|A POD turun 2x lebih cepat
    s = susun(per_k, kabs, 0.1, 61)   # kab 60 kejadian latih < 61; pulau Jawa (3 kab) 180 >= 61; Sulawesi 60 < 61
    assert s["sumber"]["32|B"] == "pulau" and s["sumber"]["72|D"] == "nasional", s
    # rakit mengambil tabel k milik tiap kab
    b = rakit(per_k, {"32|A": 0.6, "32|B": 2.0}, [2016])
    assert b[("32|A", 2016)] == per_k[0.6][("32|A", 2016)] and b[("32|B", 2016)] == per_k[2.0][("32|B", 2016)]
    # alarm acak: jumlah alarm dan kejadian per blok tetap, kena ~ laju dasar
    blok = rakit(per_k, {k: 0.8 for k in kabs}, range(2016, 2026))
    ac = acak(blok)
    for k in blok:
        for (a, b_, c, d), (a2, b2, c2, d2) in zip(blok[k], ac[k]):
            assert a + b_ == a2 + b2 and a + c == a2 + c2 and a + b_ + c + d == a2 + b2 + c2 + d2
    assert skor_kunci(ac, sorted(ac))["pod"] < 0.5 < skor_kunci(blok, sorted(blok))["pod"]
    # selisih: aturan sama -> 0 dengan CI [0, 0]
    z = selisih(blok, blok, 30)
    assert all(v[0] == 0 and v[1] == [0, 0] for v in z.values()), z
    # vonis: kriteria di muka
    d = {"far": [-0.12, [-0.2, -0.05]], "pod": [-0.03, [-0.08, 0.0]], "csi": [0.01, [0.002, 0.02]], "ets_rata": [0.001, [0, 0.002]]}
    assert vonis(d, {"csi": 0.05}, {"ci": {"csi": [0.01, 0.02]}})[0]
    for rusak in ({"far": [-0.09, [-0.2, -0.01]]}, {"far": [-0.12, [-0.2, 0.01]]}, {"pod": [-0.06, [-0.1, 0]]},
                  {"csi": [0.01, [-0.001, 0.02]]}, {"ets_rata": [-0.001, [-0.002, 0]]}):
        assert not vonis({**d, **rusak}, {"csi": 0.05}, {"ci": {"csi": [0.01, 0.02]}})[0], rusak
    assert not vonis(d, {"csi": 0.015}, {"ci": {"csi": [0.01, 0.02]}})[0]
    # pilih_hiper hanya melihat VALIDASI: mengubah tabel uji tidak mengubah pilihan
    t1, _ = pilih_hiper(per_k, kabs)
    rusak = {k: {kk: ([[0, 0, 10, 290]] * 3 if kk[1] in UJI else v) for kk, v in t.items()} for k, t in per_k.items()}
    t2, _ = pilih_hiper(rusak, kabs)
    assert (t1["eps"], t1["n_min"], t1["sus"]) == (t2["eps"], t2["n_min"], t2["sus"])
    # sidik berubah bila parameter berubah
    assert sidik(t1["sus"], 0.02, 20) != sidik({**t1["sus"], "kab": {**t1["sus"]["kab"], "32|A": 9}}, 0.02, 20)
    assert not set(LATIH) & set(VALIDASI) and not set(VALIDASI) & set(UJI) and K_BANJIR in KISI_K
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
