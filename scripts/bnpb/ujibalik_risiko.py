"""Uji balik indeks risiko kecamatan terhadap kejadian nyata -> public/banjir/data/risiko_ujibalik.json  (C4)

Pertanyaan: apakah kabupaten yang indeksnya Tinggi/Sangat tinggi benar lebih sering mengalami kejadian daripada yang Rendah,
dan apakah itu LEBIH BAIK daripada tebakan naif (peringkat penduduk saja)?

DUA UJI, dan batasnya ditulis terang di keluaran:

  1. RETROSPEKTIF (jalan sekarang). Indeks harian tidak punya riwayat, jadi yang diuji hanya komponen STATIS: bahaya InaRISK
     (banjir/bandang/longsor; gempa) x peringkat penduduk x (1 - 0,3 x kapasitas statis). Tak satu pun masukannya memakai data
     kejadian, jadi tak ada kebocoran isi; tetapi ini BUKAN indeks harian: bahaya cuaca, kekeringan, karhutla, gunung api
     (komponen harian) tak bisa diuji mundur dan dikatakan "tak teruji" di keluaran. Kejadian: DIBI BNPB (public/banjir/data/kejadian.json
     `kejadian_dibi`, 3 tahun bergulir, dicatat per KABUPATEN, bukan kecamatan) dan gempa M>=5 USGS (riwayat_m5.json, titik
     -> kabupaten dengan pusat kecamatan terdekat <= 60 km). Satuan uji = kabupaten (skor = kecamatan tertinggi di dalamnya),
     bukan kecamatan, karena kejadian tak dicatat per kecamatan. Jendela = DUA paruh periode DIBI (A lalu B); angka diumumkan
     per paruh. Tak ada ambang yang disetel: ambang kelas (15/35/60) dan aturan lulus di bawah ditetapkan SEBELUM melihat hasil.
     Kejadian DIBI = laporan BPBD (lebih banyak di kabupaten padat dan berlaporan baik), jadi bias pelaporan ikut mengangkat
     baseline penduduk. Itu sebab baseline ini wajib dikalahkan, bukan sekadar base rate.
  2. PROSPEKTIF (tumbuh tiap jalan). Tiap jalan menyimpan potret kelas kabupaten per bahaya (`arsip`); kejadian SESUDAH tanggal
     potret dalam JENDELA_HARI dicocokkan. Inilah satu-satunya uji tanpa kebocoran untuk bahaya harian. Dihitung hanya dari potret
     yang jendelanya sudah tertutup data kejadian (DIBI terlambat beberapa hari).

Tolok ukur: hit rate per kelas; POD, FAR, CSI untuk bendera seperempat teratas (Tinggi+ menjangkau ~90% kabupaten pada skor kabupaten = kecamatan tertinggi, jadi dilaporkan tapi tak dipakai vonis); lalu pembanding dengan jumlah bendera SAMA:
peringkat penduduk kabupaten (naif), bahaya saja (tanpa penduduk dan kapasitas), dan (paruh B) riwayat paruh A (kuat).
ATURAN LULUS (tetap): untuk SETIAP kelompok dan SETIAP paruh, POD indeks >= POD penduduk + 0,10 dan batas bawah selang 90% bootstrap
(2.000 ulangan, benih tetap) selisih itu > 0. Lulus semua = label "belum diuji balik" boleh diganti; selain itu labelnya
"diuji balik: belum lebih baik dari baseline" beserta angkanya.

Pakai:  python3 scripts/bnpb/ujibalik_risiko.py [--keluar BERKAS]    |   python3 scripts/bnpb/ujibalik_risiko.py --cek
Urutan di workflow: sesudah risiko.py (membaca risiko_kecamatan.json dan menambah potret hari itu ke arsip).
"""
import argparse, datetime as dt, json, os, random, sys, tempfile
from collections import Counter

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
sys.path.insert(0, AB)
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import risiko as R                      # satu rumus skor dengan pipeline dan layar
import kejadian as _kej

DATA = os.path.join(AKAR, "public/banjir/data")
WIB = dt.timezone(dt.timedelta(hours=7))
KELAS_BENDERA = 2                       # Tinggi dan Sangat tinggi
MARGIN_POD = 0.10
ULANGAN, BENIH, SELANG = 2000, 20261020, 0.10   # selang 90%: persentil ke-10 sebagai batas bawah satu sisi
JENDELA_HARI = 14                       # uji prospektif
ARSIP_HARI = 120
MIN_POTRET = 30                         # potret layak minimum sebelum angka prospektif diumumkan
JARAK_GEMPA_KM = 60
M_GEMPA = 5.0
KELOMPOK = {                            # id: (jenis DIBI atau None = USGS, bahaya risiko.py, nama)
    "banjir_longsor": ({"banjir", "longsor", "banjir_longsor", "bandang", "rob"}, "banjir", "Banjir dan longsor"),
    "gempa": (None, "gempa", "Gempa M5+"),
    "cuaca": ({"cuaca", "gelombang"}, "cuaca", "Cuaca ekstrem"),
    "kekeringan": ({"kering"}, "kekeringan", "Kekeringan"),
}
RETRO = ["banjir_longsor", "gempa"]     # yang punya komponen statis -> bisa diuji mundur
PROSPEK = list(KELOMPOK)
TAK_TERUJI = ["karhutla (FWI dan titik panas harian)", "gunung api (status harian)", "cuaca (peringatan harian)", "kekeringan (tingkat harian)"]


def baca(jalur):
    return _kej.baca(jalur)


# ---------------------------------------------------------------- skor kabupaten
def ix_kolom(r):
    return {k: i for i, k in enumerate(r["kolom"])}


def skor_kab(r, bhy, bahaya_stat, mode="indeks"):
    """-> {kab: skor 0-100 atau None} (kecamatan tertinggi). bhy 'banjir' memakai InaRISK STATIS (bahaya.json), bukan h_banjir harian.
    mode: indeks (penuh, kapasitas STATIS), bahaya (hanya bahaya x 100)."""
    ix = ix_kolom(r)
    kp = "kap_statis" if "kap_statis" in ix else "kapasitas"
    out = {}
    for row in r["kec"]:
        kab = f"{row[0]}|{row[1]}"
        if bhy == "banjir":
            b = (bahaya_stat or {}).get(f"{row[0]}|{row[1]}|{row[2]}")
            h = None if not b else max(b.get("banjir") or 0, b.get("bandang") or 0, b.get("longsor") or 0)
        else:
            h = row[ix["h_" + bhy]]
        if mode == "bahaya":
            s = None if h is None else round(100 * h, 1)
        else:
            s = R.risiko({bhy: h}, row[ix["pangkat"]], row[ix[kp]])[0]
        if s is not None and (out.get(kab) is None or s > out[kab]):
            out[kab] = s
        out.setdefault(kab, None)
    return out


def pend_kab(r):
    ix = ix_kolom(r)
    o = {}
    for row in r["kec"]:
        if row[ix["pend"]]:
            o[f"{row[0]}|{row[1]}"] = o.get(f"{row[0]}|{row[1]}", 0) + row[ix["pend"]]
    return o


# ---------------------------------------------------------------- kejadian
def peristiwa(kej, m5, pusat, jenis, usgs, awal, akhir):
    """-> Counter kabupaten -> jumlah kejadian di [awal, akhir] (YYYY-MM-DD, inklusif). Dipakai sebagai set bila hanya ada/tidaknya."""
    s = Counter()
    if usgs:
        for b in m5["baris"]:
            tgl = b[0][:10]
            if awal <= tgl <= akhir and b[4] >= M_GEMPA:
                k = kab_gempa(pusat, b[1], b[2])
                if k:
                    s[k] += 1
    else:
        for e in kej["kejadian_dibi"]:
            if e["jenis"] in jenis and awal <= e["tanggal"] <= akhir:
                s[f"{e['prov']}|{e['kab']}"] += 1
    return s


def kab_gempa(pusat, lat, lon):
    b = None
    for k, (la, lo) in pusat.items():
        if abs(la - lat) > 0.6 or abs(lo - lon) > 0.6:
            continue
        d = _kej.km((lat, lon), (la, lo))
        if d <= JARAK_GEMPA_KM and (b is None or d < b[0]):
            b = (d, k)
    return b and b[1].rsplit("|", 1)[0]


# ---------------------------------------------------------------- metrik
def bendera_teratas(nilai, n):
    """{kab: nilai} -> n kabupaten teratas (nilai None dibuang; seri dipecah dengan kunci kab: deterministik, bukan tebakan)."""
    return set(k for k, _ in sorted(((k, v) for k, v in nilai.items() if v is not None), key=lambda x: (-x[1], x[0]))[:n])


def metrik(bendera, E, U):
    h = len(bendera & E)
    pod = h / len(E) if E else None
    return {"bendera": len(bendera), "kena": h, "pod": None if pod is None else round(pod, 3),
            "far": None if not bendera else round(1 - h / len(bendera), 3),
            "csi": None if not (bendera | E) else round(h / len(bendera | E), 3),
            "presisi": None if not bendera else round(h / len(bendera), 3)}


def bootstrap_selisih(F1, F2, E, U):
    """Selisih POD (F1 - F2) pada resampel kabupaten; -> (rata-rata, batas bawah selang 90% satu sisi)."""
    rng = random.Random(BENIH)
    U = sorted(U)
    sel = []
    for _ in range(ULANGAN):
        s = [U[rng.randrange(len(U))] for _ in U]
        e = sum(k in E for k in s)
        if e:
            sel.append((sum(k in E and k in F1 for k in s) - sum(k in E and k in F2 for k in s)) / e)
    sel.sort()
    return (round(sum(sel) / len(sel), 3), round(sel[int(SELANG * len(sel))], 3)) if sel else (None, None)


def rank(nilai):
    """{k: angka} -> {k: peringkat rata-rata (seri dirata-ratakan)}."""
    urut = sorted(nilai.values())
    pos = {}
    for i, v in enumerate(urut):
        pos.setdefault(v, []).append(i)
    return {k: sum(pos[v]) / len(pos[v]) for k, v in nilai.items()}


def spearman(a, b):
    ks = sorted(set(a) & set(b))
    if len(ks) < 3:
        return None
    ra, rb = rank({k: a[k] for k in ks}), rank({k: b[k] for k in ks})
    ma, mb = sum(ra.values()) / len(ks), sum(rb.values()) / len(ks)
    va = sum((ra[k] - ma) ** 2 for k in ks) ** 0.5
    vb = sum((rb[k] - mb) ** 2 for k in ks) ** 0.5
    return None if not va or not vb else round(sum((ra[k] - ma) * (rb[k] - mb) for k in ks) / (va * vb), 3)


def sasaran(C, U, sering):
    """Counter -> set kabupaten sasaran. sering=True (DIBI, hampir semua kabupaten punya >= 1 laporan): seperempat teratas menurut jumlah
    kejadian (seri dipecah kunci kab); False (gempa M5+): ada/tidaknya."""
    if not sering:
        return {k for k in C if k in U}
    return set(sorted(U, key=lambda k: (-C.get(k, 0), k))[:len(U) // 4])


def nilai_skor(skor):
    return {k: v for k, v in skor.items() if v is not None}


def uji_kelompok(skor, bahaya_saja, pend, C, sering, riwayat_lalu=None):
    """skor/bahaya_saja = {kab: nilai}; pend = {kab: jiwa}; C = Counter kejadian per kab. -> dict hasil satu kelompok-paruh."""
    U = {k for k, v in skor.items() if v is not None}
    E = sasaran(C, U, sering)
    kelas = {k: R.kelas_dari(v) for k, v in skor.items() if v is not None}
    per = []
    for c in range(4):
        m = [k for k, v in kelas.items() if v == c]
        per.append({"kelas": R.KELAS[c], "kabupaten": len(m), "kena": len(set(m) & E), "hit_rate": round(len(set(m) & E) / len(m), 3) if m else None})
    Fk = {k for k, v in kelas.items() if v >= KELAS_BENDERA}
    N = len(U) // 4                       # bendera uji = seperempat kabupaten dengan skor tertinggi (kelas Tinggi+ menjangkau ~90% kabupaten: tak informatif)
    F = bendera_teratas(nilai_skor(skor), N)
    pop = bendera_teratas({k: pend.get(k) for k in U}, N)
    haz = bendera_teratas({k: bahaya_saja.get(k) for k in U}, N)
    nilai = {k: v for k, v in skor.items() if v is not None}
    out = {"kabupaten": len(U), "kejadian": len(E), "sasaran": "seperempat kabupaten dengan kejadian terbanyak" if sering else "kabupaten dengan >= 1 gempa M5+",
           "spearman_jumlah_kejadian": {"indeks": spearman(nilai, {k: C.get(k, 0) for k in U}), "penduduk": spearman({k: pend.get(k, 0) for k in U}, {k: C.get(k, 0) for k in U}),
                                        "bahaya_saja": spearman({k: bahaya_saja[k] for k in U if bahaya_saja.get(k) is not None}, {k: C.get(k, 0) for k in U})}, "base_rate": round(len(E) / len(U), 3) if U else None, "per_kelas": per,
           "indeks": metrik(F, E, U), "bendera_kelas_tinggi_plus": metrik(Fk, E, U), "baseline_penduduk": metrik(pop, E, U), "bahaya_saja": metrik(haz, E, U)}
    if riwayat_lalu is not None:
        out["riwayat_paruh_A"] = metrik(bendera_teratas({k: riwayat_lalu.get(k, 0) for k in U}, N), E, U)
        out["spearman_jumlah_kejadian"]["riwayat_paruh_A"] = spearman({k: riwayat_lalu.get(k, 0) for k in U}, {k: C.get(k, 0) for k in U})
    sel, bawah = bootstrap_selisih(F, pop, E, U) if E and N else (None, None)
    pi, pp = out["indeks"]["pod"], out["baseline_penduduk"]["pod"]
    jelas = pi is not None and pp is not None and pi - pp >= MARGIN_POD and bawah is not None and bawah > 0
    out["lawan_penduduk"] = {"selisih_pod": None if pi is None or pp is None else round(pi - pp, 3), "bootstrap_selisih_rata": sel, "bootstrap_batas_bawah_90": bawah, "jelas_lebih_baik": jelas}
    return out


# ---------------------------------------------------------------- retrospektif
def paruh(kej):
    t = sorted(e["tanggal"] for e in kej["kejadian_dibi"])
    a, b = dt.date.fromisoformat(t[0]), dt.date.fromisoformat(t[-1])
    mid = a + (b - a) / 2
    s = lambda d: d.isoformat()
    return {"A": [s(a), s(mid)], "B": [s(mid + dt.timedelta(days=1)), s(b)]}


def retro(r, kej, m5, pusat, bahaya_stat):
    P = paruh(kej)
    pend = pend_kab(r)
    hasil = {}
    for g in RETRO:
        jenis, bhy, nama = KELOMPOK[g]
        skor = skor_kab(r, bhy, bahaya_stat)
        saja = skor_kab(r, bhy, bahaya_stat, "bahaya")
        EA = peristiwa(kej, m5, pusat, jenis, jenis is None, *P["A"])
        EB = peristiwa(kej, m5, pusat, jenis, jenis is None, *P["B"])
        sering = jenis is not None
        hasil[g] = {"nama": nama, "A": uji_kelompok(skor, saja, pend, EA, sering), "B": uji_kelompok(skor, saja, pend, EB, sering, riwayat_lalu=EA)}
    return P, hasil


def vonis(hasil):
    gagal, baik = [], []
    for g, v in hasil.items():
        for p in ("A", "B"):
            L = v[p]["lawan_penduduk"]
            (baik if L["jelas_lebih_baik"] else gagal).append(f"{v['nama']} paruh {p}: indeks POD {v[p]['indeks']['pod']} vs penduduk {v[p]['baseline_penduduk']['pod']} (batas bawah {L['bootstrap_batas_bawah_90']})")
    lulus = not gagal
    angka = "; ".join(f"{v['nama']}: POD {v['B']['indeks']['pod']} FAR {v['B']['indeks']['far']} vs penduduk POD {v['B']['baseline_penduduk']['pod']} (paruh B)" for v in hasil.values())
    return {"lulus": lulus,
            "label": "diuji balik: lebih baik dari baseline penduduk (komponen statis)" if lulus else "diuji balik: belum lebih baik dari baseline",
            "ringkas": angka, "tidak_lebih_baik": gagal, "lebih_baik": baik}


# ---------------------------------------------------------------- prospektif (arsip potret)
def potret(r):
    """Potret satu hari: {hari, kab: [kunci], kelas: ['<digit per bahaya BENCANA, x = tak ada>' per kab]} dari risiko_kecamatan.json."""
    ix = ix_kolom(r)
    per = {}
    for row in r["kec"]:
        kab = f"{row[0]}|{row[1]}"
        d = per.setdefault(kab, [None] * len(R.BENCANA))
        for i, b in enumerate(R.BENCANA):
            h = row[ix["h_" + b]]
            s = R.risiko({b: h}, row[ix["pangkat"]], row[ix["kapasitas"]])[0]
            if s is not None and (d[i] is None or s > d[i]):
                d[i] = s
    kab = sorted(per)
    return r["hari"], kab, ["".join("x" if s is None else str(R.kelas_dari(s)) for s in per[k]) for k in kab]


def tambah_arsip(arsip, r):
    hari, kab, kls = potret(r)
    if not arsip or arsip.get("kab") != kab:
        arsip = {"kab": kab, "hari": {}, "catatan": "potret kelas kabupaten (kecamatan tertinggi) per bahaya, urutan " + ",".join(R.BENCANA) + "; x = tak ada data"}
    arsip["hari"][hari] = ",".join(kls)
    for h in sorted(arsip["hari"])[:-ARSIP_HARI]:
        del arsip["hari"][h]
    return arsip


def prospek(arsip, kej, m5, pusat, pend, min_potret=MIN_POTRET):
    """Hanya potret d dengan d + JENDELA_HARI <= akhir data kejadian; kejadian dihitung di (d, d + JENDELA]: STRICTLY sesudah d."""
    out = {"jendela_hari": JENDELA_HARI, "min_potret": min_potret, "kelompok": {}}
    if not arsip or not arsip.get("hari"):
        out["catatan"] = "arsip kosong"
        return out
    kab = arsip["kab"]
    for g in PROSPEK:
        jenis, bhy, nama = KELOMPOK[g]
        i = R.BENCANA.index(bhy)
        akhir = max(e["tanggal"] for e in kej["kejadian_dibi"]) if jenis is not None else max(b[0][:10] for b in m5["baris"])
        layak = [d for d in sorted(arsip["hari"]) if dt.date.fromisoformat(d) + dt.timedelta(days=JENDELA_HARI) <= dt.date.fromisoformat(akhir)]
        h = {"nama": nama, "potret_layak": len(layak), "data_kejadian_sampai": akhir}
        if len(layak) >= min_potret:
            ke = ki = kp = en = hi = hp = fl = 0
            for d in layak:
                kls = arsip["hari"][d].split(",")
                mulai = (dt.date.fromisoformat(d) + dt.timedelta(days=1)).isoformat()
                selesai = (dt.date.fromisoformat(d) + dt.timedelta(days=JENDELA_HARI)).isoformat()
                E = set(peristiwa(kej, m5, pusat, jenis, jenis is None, mulai, selesai))
                ada = {k: c[i] for k, c in zip(kab, kls) if c[i] != "x"}
                F = {k for k, c in ada.items() if int(c) >= KELAS_BENDERA}
                pop = bendera_teratas({k: pend.get(k) for k in ada}, len(F))
                en += len(E & set(kab)); hi += len(F & E); hp += len(pop & E); fl += len(F)
            h.update(bendera=fl, kejadian=en, pod=round(hi / en, 3) if en else None, far=round(1 - hi / fl, 3) if fl else None, pod_penduduk=round(hp / en, 3) if en else None)
        else:
            h["catatan"] = f"belum cukup potret yang jendelanya tertutup data (butuh {min_potret})"
        out["kelompok"][g] = h
    return out


# ---------------------------------------------------------------- rakit
def bangun(r, kej, m5, pusat, bahaya_stat, arsip_lama):
    P, hasil = retro(r, kej, m5, pusat, bahaya_stat)
    arsip = tambah_arsip(arsip_lama, r)
    return {
        "versi": 1, "hari_indeks": r["hari"],
        "metode": "Satuan kabupaten (skor = kecamatan tertinggi). Bendera uji = seperempat kabupaten dengan skor tertinggi; pembanding berbendera sama banyak. Bendera kelas Tinggi+ (skor >= 35) dilaporkan terpisah (`bendera_kelas_tinggi_plus`) tetapi menjangkau ~90% kabupaten (skor = kecamatan tertinggi), jadi tak dipakai untuk vonis.",
        "periode": {"DIBI": P, "pembagian": "dua paruh sama panjang dari rentang kejadian_dibi; indeks statis tidak memakai kejadian apa pun"},
        "aturan_lulus": f"setiap kelompok dan setiap paruh: POD indeks >= POD baseline penduduk + {MARGIN_POD} DAN batas bawah selang 90% bootstrap selisih POD > 0 ({ULANGAN} ulangan, benih {BENIH}). Aturan ditetapkan sebelum hasil dilihat; tidak ada ambang yang disetel.",
        "retrospektif": hasil, "vonis": vonis(hasil),
        "tak_teruji": TAK_TERUJI,
        "keterbatasan": [
            "Yang diuji mundur hanya komponen STATIS (InaRISK banjir/longsor dan gempa x penduduk x kapasitas statis); indeks harian tidak punya riwayat, jadi komponen harian (cuaca, kekeringan, karhutla, gunung api) belum teruji mundur.",
            "Hampir semua kabupaten punya >= 1 laporan DIBI per paruh (jenuh: base rate ~0,9, POD tak informatif), maka sasaran banjir/longsor = seperempat kabupaten dengan laporan terbanyak (aturan tetap, ditetapkan karena jenuh, bukan karena hasil); korelasi peringkat (Spearman) terhadap jumlah laporan dilaporkan sebagai pelengkap tanpa ambang.",
            "Kejadian DIBI dicatat per kabupaten dari laporan BPBD, bukan per kecamatan: uji berjalan di tingkat kabupaten, dan kabupaten padat/berlaporan baik terlihat lebih sering kena (bias pelaporan).",
            "DIBI 2024 tidak lengkap; rentang hanya 3 tahun bergulir, jadi jumlah kejadian per kelompok kecil dan selang bootstrap lebar.",
            "Gempa dipetakan ke kabupaten lewat pusat kecamatan terdekat <= 60 km dari episentrum M>=5 (USGS); episentrum di laut jauh tidak dihitung. Kerusakan tidak diuji, hanya keberadaan guncangan M5+.",
            "Uji prospektif (arsip potret harian) baru mengumumkan angka bila ada cukup potret dengan jendela kejadian tertutup; DIBI terlambat beberapa hari.",
            "Bahaya cuaca dan kekeringan yang tercatat di DIBI adalah kejadian yang dilaporkan, bukan semua kejadian: FAR dari sini batas atas."],
        "prospektif": prospek(arsip, kej, m5, pusat, pend_kab(r)),
        "arsip": arsip,
    }


def muat():
    r = baca(os.path.join(DATA, "risiko_kecamatan.json"))
    return (r, baca(os.path.join(DATA, "kejadian.json")), baca(os.path.join(AKAR, "public/gempa/data/riwayat_m5.json")),
            baca(os.path.join(DATA, "pusat_kec.json")), (baca(os.path.join(DATA, "bahaya.json")) or {}).get("kec"))


# ---------------------------------------------------------------- cek
def cek():
    r, kej, m5, pusat, bs = muat()
    assert r and kej and m5 and pusat and bs, "masukan hilang"
    lama = None
    a = bangun(r, kej, m5, pusat, bs, lama)
    b = bangun(r, kej, m5, pusat, bs, lama)
    assert a == b, "tidak deterministik"
    # paruh tidak bertumpuk dan berurutan: kejadian paruh A tidak bocor ke B
    P = a["periode"]["DIBI"]
    assert P["A"][0] < P["A"][1] < P["B"][0] <= P["B"][1] and (dt.date.fromisoformat(P["B"][0]) - dt.date.fromisoformat(P["A"][1])).days == 1
    for g in RETRO:
        v = a["retrospektif"][g]
        for p in "AB":
            x = v[p]
            assert x["kejadian"] > 0 and x["kabupaten"] > 300 and sum(c["kabupaten"] for c in x["per_kelas"]) == x["kabupaten"]
            for k in ("indeks", "baseline_penduduk", "bahaya_saja"):
                assert x[k]["bendera"] == x["indeks"]["bendera"], "pembanding harus berbendera sama banyak"
                assert x[k]["pod"] is None or 0 <= x[k]["pod"] <= 1
            assert x["lawan_penduduk"]["jelas_lebih_baik"] in (True, False)
        assert "riwayat_paruh_A" in v["B"] and "riwayat_paruh_A" not in v["A"]
    assert a["vonis"]["lulus"] == (not a["vonis"]["tidak_lebih_baik"]) and a["vonis"]["label"]
    # null bukan 0: bahaya hilang -> kabupaten tanpa skor, bukan skor 0
    r2 = json.loads(json.dumps(r))
    ix = ix_kolom(r2)
    for row in r2["kec"]:
        row[ix["h_gempa"]] = None
    assert all(v is None for v in skor_kab(r2, "gempa", bs).values()), "gempa hilang harus null, bukan 0"
    # kejadian per tanggal: tepat batas
    kej_s = {"kejadian_dibi": [{"tanggal": "2026-01-10", "jenis": "banjir", "prov": "11", "kab": "A"}, {"tanggal": "2026-01-11", "jenis": "banjir", "prov": "11", "kab": "B"},
                               {"tanggal": "2026-01-25", "jenis": "banjir", "prov": "11", "kab": "C"}, {"tanggal": "2026-01-26", "jenis": "banjir", "prov": "11", "kab": "D"}]}
    J = KELOMPOK["banjir_longsor"][0]
    assert set(peristiwa(kej_s, m5, pusat, J, False, "2026-01-11", "2026-01-25")) == {"11|B", "11|C"}, "jendela (d, d+14] salah"
    assert sasaran(Counter({"a": 5, "b": 5, "c": 1}), {"a", "b", "c", "d", "e", "f", "g", "h"}, True) == {"a", "b"} and sasaran(Counter({"a": 1, "z": 2}), {"a", "b"}, False) == {"a"}
    assert spearman({"a": 1, "b": 2, "c": 3}, {"a": 10, "b": 20, "c": 30}) == 1.0 and spearman({"a": 1, "b": 2, "c": 3}, {"a": 3, "b": 2, "c": 1}) == -1.0 and spearman({"a": 1, "b": 1, "c": 1}, {"a": 1, "b": 2, "c": 3}) is None
    # metrik pada angka tangan
    E, F = {"a", "b", "c", "d"}, {"a", "b", "x"}
    m = metrik(F, E, set("abcdxyz"))
    assert (m["kena"], m["pod"], m["far"], m["csi"]) == (2, 0.5, 0.333, round(2 / 5, 3)), m
    assert metrik(set(), E, E)["far"] is None and metrik(F, set(), E)["pod"] is None
    assert bendera_teratas({"b": 5, "a": 5, "c": 9, "d": None}, 2) == {"c", "a"}
    # bootstrap: indeks sempurna vs penduduk jelek -> batas bawah > 0; dua pembanding identik -> selisih 0
    U = {f"k{i}" for i in range(100)}
    Ee = {f"k{i}" for i in range(20)}
    assert bootstrap_selisih(Ee, {f"k{i}" for i in range(80, 100)}, Ee, U)[1] > 0
    assert bootstrap_selisih(Ee, Ee, Ee, U) == (0.0, 0.0)
    # prospektif tanpa kebocoran waktu: potret d hanya menghitung kejadian SESUDAH d
    kab = [f"11|K{i}" for i in range(4)]
    d0 = "2026-03-01"
    kej_p = {"kejadian_dibi": [{"tanggal": d0, "jenis": "banjir", "prov": "11", "kab": "K0"},          # hari yang sama: TIDAK dihitung
                               {"tanggal": "2026-03-02", "jenis": "banjir", "prov": "11", "kab": "K1"},   # hari berikut: dihitung
                               {"tanggal": "2026-03-16", "jenis": "banjir", "prov": "11", "kab": "K2"},   # d + 15: di luar jendela
                               {"tanggal": "2026-04-30", "jenis": "banjir", "prov": "11", "kab": "K3"}]}
    ar = {"kab": kab, "hari": {}}
    for j in range(MIN_POTRET):
        ar["hari"][(dt.date.fromisoformat(d0) + dt.timedelta(days=j)).isoformat()] = ",".join(["0300000", "0300000", "0000000", "0000000"])
    pr = prospek(ar, kej_p, {"baris": [["2026-01-01T00:00", 0, 0, 0, 5, "11"]]}, {}, {k: 1 for k in kab})
    g = pr["kelompok"]["banjir_longsor"]
    assert g["potret_layak"] == MIN_POTRET and g["kejadian"] > 0 and g["data_kejadian_sampai"] == "2026-04-30"
    ar1 = {"kab": kab, "hari": {d0: ",".join(["0300000", "0300000", "0000000", "0000000"])}}
    m0 = {"baris": [["2026-01-01T00:00", 0, 0, 0, 5, "11"]]}
    assert prospek(ar1, kej_p, m0, {}, {k: 1 for k in kab})["kelompok"]["banjir_longsor"].get("pod") is None, "satu potret tak boleh menghasilkan angka"
    # satu potret: bendera K0,K1; kejadian di (d, d+14] = hanya K1 (K0 sama hari, K2 hari ke-15, K3 jauh) -> POD 1, FAR 0,5
    g1 = prospek(ar1, kej_p, m0, {}, {k: 1 for k in kab}, min_potret=1)["kelompok"]["banjir_longsor"]
    assert (g1["kejadian"], g1["bendera"], g1["pod"], g1["far"]) == (1, 2, 1.0, 0.5), g1
    # potret hari ini tak layak (kejadian belum ada): jendela belum tertutup
    ar2 = {"kab": kab, "hari": {"2026-04-29": ",".join(["0300000"] * 4)}}
    assert prospek(ar2, kej_p, {"baris": [["2026-01-01T00:00", 0, 0, 0, 5, "11"]]}, {}, {})["kelompok"]["banjir_longsor"]["potret_layak"] == 0
    # arsip: tambah, idempoten per hari, dan dipotong
    ar3 = tambah_arsip(None, r)
    assert list(ar3["hari"]) == [r["hari"]] and len(ar3["hari"][r["hari"]].split(",")) == len(ar3["kab"]) and tambah_arsip(ar3, r) == ar3
    assert all(len(c) == len(R.BENCANA) for c in ar3["hari"][r["hari"]].split(","))
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "u.json")
        _kej.simpan(p, a)
        assert next(iter(json.load(open(p)))) == "dibuat" and os.path.getsize(p) < 400_000, os.path.getsize(p)
    sx = a["retrospektif"]["banjir_longsor"]["A"]
    assert sx["kejadian"] == 515 // 4 or sx["kejadian"] == sx["kabupaten"] // 4
    for g in RETRO:
        print(f"  {a['retrospektif'][g]['nama']}: A {ringkas(a['retrospektif'][g]['A'])} | B {ringkas(a['retrospektif'][g]['B'])}")
    print("cek ok:", a["vonis"]["label"])


def ringkas(x):
    return f"n{x['kejadian']}/{x['kabupaten']} POD {x['indeks']['pod']} FAR {x['indeks']['far']} (penduduk POD {x['baseline_penduduk']['pod']}, bahaya saja {x['bahaya_saja']['pod']}) batas bawah {x['lawan_penduduk']['bootstrap_batas_bawah_90']} spearman {x['spearman_jumlah_kejadian']}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--keluar", default=os.path.join(DATA, "risiko_ujibalik.json"))
    a = ap.parse_args()
    if a.cek:
        return cek()
    r, kej, m5, pusat, bs = muat()
    if not (r and kej and m5 and pusat and bs):
        sys.exit("ujibalik_risiko: masukan hilang; tidak menulis apa pun")
    lama = (baca(a.keluar) or {}).get("arsip")
    isi = bangun(r, kej, m5, pusat, bs, lama)
    _kej.simpan(a.keluar, isi)
    print(f"ujibalik_risiko: {isi['vonis']['label']}; {isi['vonis']['ringkas']}; arsip {len(isi['arsip']['hari'])} potret", file=sys.stderr)


if __name__ == "__main__":
    main()
