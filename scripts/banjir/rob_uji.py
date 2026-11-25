"""Uji balik ambang rob dengan label besar (KI-06). Python stdlib saja, tanpa jaringan.

PROTOKOL (ditulis SEBELUM menghitung apa pun; angka di scripts/banjir/rob_uji.kriteria.json ikut disidik):
 1. Label: kejadian kab-hari dari public/pesisir/data/rob_kejadian.json (tiga sumber, sudah digabung; di sini
    didedupe lagi per (kab, tanggal)). y = ada kejadian pada kab itu di tanggal itu (TANPA jendela +-1 hari:
    jendela membuat persistensi menang otomatis). Hari hanya dihitung bila (a) bulannya punya >= 1 label
    di kab mana pun (sumbernya laporan; bulan tanpa label sama sekali = tak teramati, bukan negatif), dan
    (b) kab "layak": punya titik berarsip DAN pernah punya >= 1 kejadian sebelum 2024-01-01.
 2. Prediktor: maksimum harian muka laut SMOC (arsip data/raw/banjir/rob/arsip_*.json, titik dari titik.json,
    pemetaan titik -> kab lewat rob.norm_kab persis seperti rob.py). Alarm kab-hari = salah satu titik kab
    >= persentil-q titik itu. PERSENTIL DIHITUNG HANYA DARI PERIODE LATIH (bukan ambang.json, yang memakai
    seluruh arsip dan membocorkan periode uji).
 3. Latih: arsip mulai 2022-11-24; latih = sampai 2023-12-31. q dipilih dari daftar tetap (p90, p95, p97, p99)
    dengan ETS terbaik di latih (imbang: PSS, lalu q lebih tinggi). Uji = 2024-01-01..2025-12-31, DIBUKA SEKALI.
 4. Pembanding (scripts/umum/pembanding.py), jumlah alarm SAMA dengan model di set uji: persistensi (ada
    kejadian di kab kemarin) dan klimatologi kab x bulan dari latih (disusutkan). Imbang skor dipecah dengan
    jitter berbenih tetap. Pembanding terbaik = ETS tertinggi di set uji; bootstrap blok berpasangan
    (blok = kab x bulan) atas selisih ETS model - pembanding terbaik, alarm dibekukan.
 5. Vonis: LULUS bila batas bawah CI95 selisih ETS > 0; TIDAK LULUS bila selisih titik <= 0; selain itu
    TIDAK MEYAKINKAN. Dilaporkan juga n kejadian uji, n kab-hari, n alarm, lebar CI (daya).
 6. Sidik: `kunci` menulis scripts/banjir/rob_uji.sidik (kode + kriteria + hash masukan) SEBELUM uji dibuka;
    `jalan` memeriksa sidik, memilih q di latih, membuka penanda scripts/banjir/rob_uji.buka (sekali, O_EXCL),
    lalu menulis public/banjir/data/rob_uji.json.

  python3 -I scripts/banjir/rob_uji.py uji | kunci | jalan
"""
import datetime as dt
import hashlib
import json
import math
import os
import random
import sys
import tempfile

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
import pembanding as P  # noqa: E402
import sidik as S  # noqa: E402

KRITERIA = "scripts/banjir/rob_uji.kriteria.json"
KODE = ["scripts/banjir/rob_uji.py", "scripts/banjir/rob.py", "scripts/umum/pembanding.py", "scripts/umum/sidik.py"]
SIDIK, BUKA, JEJAK = "scripts/banjir/rob_uji.sidik", "scripts/banjir/rob_uji.buka", "scripts/banjir/rob_uji.jejak.jsonl"
LABEL, TITIK, ARSIP = "public/pesisir/data/rob_kejadian.json", "data/raw/banjir/rob/titik.json", "data/raw/banjir/rob"
HASIL = "public/banjir/data/rob_uji.json"


def hari_antara(a, b):
    d = dt.date.fromisoformat(a)
    while d.isoformat() <= b:
        yield d.isoformat()
        d += dt.timedelta(days=1)


def persentil(xs, q):
    s = sorted(xs)
    k = (len(s) - 1) * q / 100
    i = int(k)
    return s[i] if i + 1 >= len(s) else s[i] + (s[i + 1] - s[i]) * (k - i)


def baris(seri, titik_kab, kab_layak, event, bulan_ok, awal, akhir):
    """seri[i]={tgl:maks}; titik_kab[i]=kab; hasil list baris kab-hari: kab, tgl, bulan, y, h={i: nilai}."""
    out = []
    pt = {}
    for i, k in enumerate(titik_kab):
        pt.setdefault(k, []).append(i)
    for k in sorted(kab_layak):
        for d in hari_antara(awal, akhir):
            if d[:7] not in bulan_ok:
                continue
            h = {i: seri[i][d] for i in pt.get(k, []) if d in seri[i]}
            if h:
                out.append({"kab": k, "tgl": d, "bulan": d[5:7], "blok": f"{k}|{d[:7]}", "y": int((k, d) in event), "h": h})
    return out


def alarm_q(r, thr, q):
    return any(v >= thr[i][q] for i, v in r["h"].items())


def latih_q(rows, thr, kandidat):
    """Pilih q di latih: ETS terbaik, lalu PSS, lalu q lebih tinggi."""
    y = [r["y"] for r in rows]
    tabel = {}
    for q in kandidat:
        k = P.kontingensi([alarm_q(r, thr, q) for r in rows], y)
        tabel[q] = {**k, "n_alarm": k["tp"] + k["fp"]}
    nilai = lambda q: (tabel[q]["ets"] if tabel[q]["ets"] is not None else -9, tabel[q]["pss"] if tabel[q]["pss"] is not None else -9, q)
    return max(kandidat, key=nilai), tabel


def jitter(rows, skor, benih=11):
    rng = random.Random(benih)
    return [s + 1e-9 * rng.random() for s in skor]


def nilai_uji(lat, uji, thr, q, event, benih_boot=7, B=300):
    y = [r["y"] for r in uji]
    am = [alarm_q(r, thr, q) for r in uji]
    kmod = P.kontingensi(am, y)
    pers = jitter(uji, [float((r["kab"], (dt.date.fromisoformat(r["tgl"]) - dt.timedelta(days=1)).isoformat()) in event) for r in uji])
    klim = jitter(uji, P.klimatologi(lat, uji, ("kab", "bulan")), 12)
    pemb = {}
    for nama, skor in (("persistensi", pers), ("klimatologi", klim)):
        s = P.samakan_alarm(am, skor, y)
        if s is None:
            pemb[nama] = {"alarm": None}
            continue
        pemb[nama] = {"alarm": s["alarm"], **P.kontingensi(s["alarm"], y), "n_alarm": s["n_alarm"]}
    ada = [n for n in pemb if pemb[n]["alarm"] is not None]
    if not ada:
        raise ValueError("tak satu pembanding pun bisa disamakan jumlah alarmnya")
    terbaik = max(ada, key=lambda n: pemb[n]["ets"] if pemb[n]["ets"] is not None else -9)
    for r, a, b in zip(uji, am, pemb[terbaik]["alarm"]):
        r["_m"], r["_b"] = a, b
    sel = lambda rs: _selisih(rs)
    ci = P.bootstrap_blok(sel, uji, "blok", B=B, seed=benih_boot)
    est = ci["est"]
    vonis = "LULUS" if ci["lo"] > 0 else "TIDAK LULUS" if est <= 0 else "TIDAK MEYAKINKAN"
    for n in pemb:
        pemb[n].pop("alarm")
    return {"q": q, "model": {**kmod, "n_alarm": kmod["tp"] + kmod["fp"]}, "pembanding": pemb, "pembanding_terbaik": terbaik,
            "selisih_ets": ci, "vonis": vonis, "n_kab_hari": len(uji), "n_kejadian": sum(y),
            "n_kab": len({r["kab"] for r in uji}), "n_blok": ci["n_blok"], "lebar_ci": ci["hi"] - ci["lo"]}


def _selisih(rs):
    y = [r["y"] for r in rs]
    a = P.kontingensi([r["_m"] for r in rs], y)["ets"]
    b = P.kontingensi([r["_b"] for r in rs], y)["ets"]
    return None if a is None or b is None else a - b


def jalankan(seri, titik_kab, kab_layak, event, bulan_ok, kri):
    """Seluruh protokol. `buka` dipanggil pemanggil tepat sebelum set uji dibangun (lihat jalan())."""
    thr = [{q: persentil([v for d, v in s.items() if d <= kri["latih_akhir"]], q) for q in kri["kandidat_q"]} if s else None for s in seri]
    ok = [i for i, t in enumerate(thr) if t]
    seri = [seri[i] for i in ok]
    titik_kab = [titik_kab[i] for i in ok]
    thr = [thr[i] for i in ok]
    awal = min(min(s) for s in seri)
    lat = baris(seri, titik_kab, kab_layak, event, bulan_ok, awal, kri["latih_akhir"])
    q, tabel = latih_q(lat, thr, kri["kandidat_q"])
    yield {"fase": "latih", "q": q, "tabel": {f"p{k}": v for k, v in tabel.items()}, "n_kab_hari": len(lat),
           "n_kejadian": sum(r["y"] for r in lat)}
    uji = baris(seri, titik_kab, kab_layak, event, bulan_ok, kri["uji_awal"], kri["uji_akhir"])
    b = kri.get("bootstrap", {})
    yield {"fase": "uji", **nilai_uji(lat, uji, thr, q, event, b.get("seed", 7), b.get("B", 300))}


def muat(kri):
    """Baca masukan dari disk. Keluaran (seri, titik_kab, kab_layak, event, bulan_ok, hash_masukan)."""
    import rob
    lab = json.load(open(os.path.join(AKAR, LABEL)))
    event = {(e["k"], e["t"]) for e in lab["kejadian"]}
    bulan_ok = {e["t"][:7] for e in lab["kejadian"]}
    norm = {(k.split("|")[0], rob.norm_kab(k.split("|", 1)[1])): k for k in {e["k"] for e in lab["kejadian"]}}
    titik = json.load(open(os.path.join(AKAR, TITIK)))
    seri, titik_kab, hs = [], [], []
    for t in titik:
        k = norm.get((t["kp"], rob.norm_kab(t["kab"])))
        p = rob.arsip_jalur(t)
        if k is None or not os.path.exists(p):
            continue
        seri.append(json.load(open(p)))
        titik_kab.append(k)
        hs.append(hashlib.sha256(open(p, "rb").read()).hexdigest())
    sebelum = {k for k, t in event if t < kri["uji_awal"]}
    layak = sorted(set(titik_kab) & sebelum)
    h = lambda p: hashlib.sha256(open(os.path.join(AKAR, p), "rb").read()).hexdigest()
    return seri, titik_kab, layak, event, bulan_ok, [h(LABEL), h(TITIK), hashlib.sha256("".join(sorted(hs)).encode()).hexdigest()]


def kriteria():
    return json.load(open(os.path.join(AKAR, KRITERIA)))


def kunci():
    os.chdir(AKAR)
    if os.path.exists(BUKA):
        sys.exit(f"{BUKA} sudah ada: uji sudah dibuka, sidik tak boleh ditulis ulang")
    *_, hm = muat(kriteria())
    d = S.tulis(SIDIK, KODE, KRITERIA, hm)
    print("sidik", d["sidik"])


def jalan():
    os.chdir(AKAR)
    d = S.cek(SIDIK)  # keluar 3 bila kode/kriteria berubah
    kri = kriteria()
    seri, titik_kab, layak, event, bulan_ok, hm = muat(kri)
    assert S.kunci(KODE, KRITERIA, hm) == d["sidik"], "masukan berubah sejak sidik ditulis"
    hasil = []
    for fase in jalankan(seri, titik_kab, layak, event, bulan_ok, kri):
        hasil.append(fase)
        if fase["fase"] == "latih":
            S.buka(BUKA, JEJAK, d["sidik"], {"q": fase["q"]})  # uji dibuka di sini, sekali
    uji_ = hasil[1]
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "sidik": d["sidik"], "kriteria": kri,
           "n_kab_layak": len(layak), "latih": hasil[0], "uji": uji_, "vonis": uji_["vonis"]}
    json.dump(out, open(HASIL, "w"), indent=1, ensure_ascii=False)
    print(json.dumps({"vonis": out["vonis"], "q": uji_["q"], "uji": {k: uji_[k] for k in ("n_kejadian", "n_kab_hari", "n_kab", "lebar_ci")},
                      "selisih_ets": uji_["selisih_ets"], "model": uji_["model"], "pembanding": uji_["pembanding"]}, ensure_ascii=False, indent=1))


def uji():
    kri = {"kandidat_q": [90, 95, 97, 99], "latih_akhir": "2023-12-31", "uji_awal": "2024-01-01", "uji_akhir": "2024-12-31"}
    rng = random.Random(3)
    # mainan: 6 kab; kejadian jatuh pada hari muka laut puncak (model punya sinyal) atau acak
    seri, kabs, event = [], [], set()
    awal = dt.date(2023, 1, 1)
    for n in range(6):
        k = f"33|K{n}"
        s = {}
        for i in range(730):
            d = (awal + dt.timedelta(days=i)).isoformat()
            tinggi = rng.random() < 0.03
            s[d] = 1.5 if tinggi else 1.0 + 0.1 * rng.random()
            if tinggi and rng.random() < 0.9:
                event.add((k, d))
        seri.append(s)
        kabs.append(k)
    bulan_ok = {d[:7] for _, d in event} | {s[:7] for s in seri[0]}
    layak = [k for k in kabs if any(kk == k and t < kri["uji_awal"] for kk, t in event)]
    f = list(jalankan(seri, kabs, layak, event, bulan_ok, kri))
    assert f[0]["fase"] == "latih" and f[1]["fase"] == "uji"
    u = f[1]
    assert u["model"]["pod"] is not None and u["model"]["pod"] > 0.7, u["model"]  # sinyal nyata ditemukan
    assert u["vonis"] == "LULUS", (u["vonis"], u["selisih_ets"])
    # tanpa sinyal: kejadian acak -> tidak boleh LULUS
    ev2 = {(k, (awal + dt.timedelta(days=rng.randrange(730))).isoformat()) for k in kabs for _ in range(15)}
    l2 = [k for k in kabs if any(kk == k and t < kri["uji_awal"] for kk, t in ev2)]
    f2 = list(jalankan(seri, kabs, l2, ev2, {d[:7] for _, d in ev2}, kri))
    assert f2[1]["vonis"] != "LULUS", f2[1]["vonis"]
    # sidik + buka-sekali + ubah kode ditolak
    with tempfile.TemporaryDirectory() as t:
        cwd = os.getcwd()
        os.chdir(t)
        try:
            for n, s in (("a.py", "x=1\n"), ("kr.json", "{}\n")):
                open(n, "w").write(s)
            d = S.tulis("s.sidik", ["a.py"], "kr.json", ["h"])
            S.cek("s.sidik")
            S.buka("b.buka", "j.jsonl", d["sidik"], "x")
            try:
                S.buka("b.buka", "j.jsonl", d["sidik"], "y")
            except RuntimeError:
                pass
            else:
                raise AssertionError("buka kedua lolos")
            open("a.py", "w").write("x=2\n")
            try:
                S.cek("s.sidik")
            except SystemExit as e:
                assert e.code == 3
            else:
                raise AssertionError("kode berubah tetapi cek lolos")
        finally:
            os.chdir(cwd)
    print("rob_uji uji: OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    {"uji": uji, "kunci": kunci, "jalan": jalan}.get(a[0] if len(a) == 1 else "", lambda: sys.exit("pakai: rob_uji.py uji|kunci|jalan"))()
