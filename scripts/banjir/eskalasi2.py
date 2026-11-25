"""Eskalasi kejadian banjir v2 (KI-77): AMANDEMEN atas eskalasi.py yang TIDAK LOLOS. Aturan di PRAREG-ESKALASI2.md, angka di eskalasi2.kriteria.json.
Python stdlib saja. eskalasi.py dan eskalasi.sidik beku: file ini hanya mengimpor `latih_lr`, `prob_lr`.

  python3 -I scripts/banjir/eskalasi2.py uji       swauji sintetis, tanpa jaringan
  python3 -I scripts/banjir/eskalasi2.py hitung    satuan + EKSPLORASI periode latih (bukan uji, tak ada vonis)
  python3 -I scripts/banjir/eskalasi2.py sidik     bekukan kode + PRAREG + kriteria (sekali; menolak menimpa)
  python3 -I scripts/banjir/eskalasi2.py buka      uji PROSPEKTIF sekali; dijaga: sidik di HEAD, jendela selesai + jeda lapor, penanda O_EXCL

Label fisik: kejadian banjir di kab itu sendiri (Dalops, tanggal KEJADIAN, kab-bulan teramati lewat label_dalops/label_mutu) pada d+1..d+2;
bukan "kab lain di provinsi" dan bukan tanggal dicatat. Perluasan GFM tidak dipakai: hanya pilot 34 kab-hari (label_bersatu), tak cukup.
Satuan (kab, d): d = hari sesudah awal episode s (24 jam), awal episode = ada kejadian tgl s, tak ada kejadian d-3..s-1, dicatat hari s.
"""
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
import math
import os
import random
import subprocess
import sys
from bisect import bisect_right

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(DIR, "../.."))
ONE = dt.timedelta(1)
PRAREG = os.path.join(DIR, "PRAREG-ESKALASI2.md")
KRITERIA = os.path.join(DIR, "eskalasi2.kriteria.json")
SIDIK, BUKA = os.path.join(DIR, "eskalasi2.sidik"), os.path.join(DIR, "eskalasi2.buka")
KELUAR = os.path.join(AKAR, "data/raw/banjir/eskalasi2")
ARSIP_KAB2 = os.path.join(AKAR, "data/banjir/arsip_kab2")
KODE_SIDIK = ["scripts/banjir/eskalasi2.py", "scripts/banjir/debit_glofas.py", "scripts/banjir/eskalasi.py", "scripts/umum/pembanding.py",
              "scripts/banjir/PRAREG-ESKALASI2.md"]


def _impor(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(DIR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


E1, DG, PB, LD, S = (_impor("e1_lama", "eskalasi.py"), _impor("dg_e2", "debit_glofas.py"), _impor("pb_e2", "../umum/pembanding.py"),
                     _impor("ld_e2", "../umum/label_dalops.py"), _impor("sd_e2", "../umum/sidik.py"))
KR = json.load(open(KRITERIA))
FITUR = KR["fitur"]
LATIH = tuple(KR["latih"])


def tgl(s):
    return dt.date.fromisoformat(s)


# ------------------------------------------------------------------ label dan satuan
def teramati(cov, kab, d):
    return d.isoformat()[:7] in cov.get(kab, {})


def satuan(baris, cov, kab_ok):
    """baris = baca_dalops(); -> satuan (kab, d) berlabel. Fitur laporan memakai baris dengan dicatat <= d SAJA.
    Satuan dengan kab-bulan tak teramati di s, d, d+1, d+2 dibuang (bukan negatif)."""
    ev, lp = {}, {}
    for b in baris:
        if "banjir" not in b["bahaya"] or b["kab"] not in kab_ok:
            continue
        t = tgl(b["tgl"])
        ev.setdefault(b["kab"], set()).add(t)
        if b["lapor"]:
            lp.setdefault(b["kab"], []).append((tgl(b["lapor"]), t))
    out = []
    for k, T in sorted(ev.items()):
        L = lp.get(k, [])
        for s in sorted(T):
            if any(s - i * ONE in T for i in (1, 2, 3)) or (s, s) not in L:
                continue
            d = s + ONE
            if not all(teramati(cov, k, x) for x in (s, d, d + ONE, d + 2 * ONE)):
                continue
            n_s = sum(1 for l, t in L if l == s and t == s)
            n_d = sum(1 for l, t in L if l == d and s <= t <= d)
            out.append({"kab": k, "prov": k[:2], "d": d, "bulan": d.month, "y": int(d + ONE in T or d + 2 * ONE in T),
                        "lap_d": math.log1p(n_d), "tumbuh": math.log1p(n_d) - math.log1p(n_s), "flag": int(n_d > n_s),
                        "sinm": math.sin(2 * math.pi * (d.month - 1) / 12), "cosm": math.cos(2 * math.pi * (d.month - 1) / 12)})
    return out


# ------------------------------------------------------------------ fitur fisik
def ref_hujan(p, awal, akhir_latih):
    """P95 jumlah 3 hari bergulir dari hari <= akhir_latih SAJA (persentil lokal kab)."""
    n = (akhir_latih - awal).days + 1
    j = [sum(p[i:i + 3]) for i in range(0, max(n - 2, 0))]
    return DG.persentil(j, 95)


def isi_fisik(u, q, t0, p90, h13, ref3):
    """q, t0, p90: debit titik kab; h13 = hujan d+1..d+3 (mm); ref3 = persentil lokal. Fitur hanya dari q sampai hari d. -> True bila lengkap."""
    i = (u["d"] - t0).days
    r, f, h = DG.rasio(q, i, p90), DG.fase(q, i), DG.hujan_pers(h13, ref3)
    if r is None or f is None or h is None:
        return False
    u["lq"], u["fase"], u["lh13"] = math.log1p(r), float(f), math.log1p(h)
    return True


def hujan_era5(sel_kab, ub, nama_ke_kode, akhir_latih):
    """-> {kode: (p kab-rata-rata per hari sejak ub.AWAL, ref3)} dari cache ERA5 uji_balik (43 kab)."""
    out = {}
    for nama, jl in sel_kab.items():
        k = nama_ke_kode.get(nama)
        if not k:
            continue
        ser = []
        for j in jl:
            with gzip.open(j, "rt") as f:
                ser.append(ub.deret(json.load(f))["p"])
        p = [sum(x or 0.0 for x in c) / len(ser) for c in zip(*ser)]
        out[k] = (p, ref_hujan(p, ub.AWAL, akhir_latih))
    return out


# ------------------------------------------------------------------ model: LR L2 + kalibrasi isotonik (PAV)
def pav(x, y):
    """Isotonik tak-turun. -> (xmin_blok[], nilai[]). Imbang x digabung dulu."""
    g = {}
    for a, b in zip(x, y):
        c = g.setdefault(a, [0.0, 0])
        c[0] += b
        c[1] += 1
    blok = [[a, c[0], c[1]] for a, c in sorted(g.items())]          # [xmin, jumlah y, n]
    out = []
    for b in blok:
        out.append(b)
        while len(out) > 1 and out[-2][1] / out[-2][2] > out[-1][1] / out[-1][2]:
            t = out.pop()
            out[-1][1] += t[1]
            out[-1][2] += t[2]
    return [b[0] for b in out], [b[1] / b[2] for b in out]


def iso(model, s):
    xs, vs = model
    return vs[max(bisect_right(xs, s) - 1, 0)]


def _std(tr, semua):
    mu = [sum(u[f] for u in tr) / len(tr) for f in FITUR]
    sd = [(sum((u[f] - m) ** 2 for u in tr) / len(tr)) ** .5 or 1.0 for f, m in zip(FITUR, mu)]
    return lambda us: [[(u[f] - m) / s for f, m, s in zip(FITUR, mu, sd)] for u in us]


def lr_fit(tr):
    z = _std(tr, None)
    w = E1.latih_lr(z(tr), [u["y"] for u in tr], ridge=KR["ridge"])
    return lambda us: E1.prob_lr(w, z(us))


def latih_model(tr):
    """LR pada semua latih; isotonik dilatih pada skor OOF tinggalkan-satu-tahun (kalibrasi tak melihat skor dalam-sampel). -> f(units)->peluang."""
    tahun = sorted({u["d"].year for u in tr})
    oof, yy = [], []
    for t in tahun:
        a, b = [u for u in tr if u["d"].year != t], [u for u in tr if u["d"].year == t]
        if len(a) < 20 or not any(u["y"] for u in a):
            continue
        oof += lr_fit(a)(b)
        yy += [u["y"] for u in b]
    f, cal = lr_fit(tr), pav(oof, yy)
    return lambda us: [iso(cal, s) for s in f(us)]


# ------------------------------------------------------------------ nilai: pembanding pada jumlah alarm sama
def nilai(tr, te):
    """Model dan pembanding dari tr SAJA; alarm = urutan teratas n_alarm = ceil(alarm_fraksi n_te), pembanding dipasang ke jumlah SAMA (imbang dipecah menurut (d, kab)).
    Pembanding utama = Brier latih terkecil. -> dict angka, tanpa vonis di sini (vonis(n, hasil))."""
    y = [u["y"] for u in te]
    key = [(u["d"].isoformat(), u["kab"]) for u in te]
    pm = latih_model(tr)(te)
    pem = {"klim_prov_bulan": ("prov", "bulan"), "klim_bulan": ("bulan",), "persistensi_laporan": ("flag",)}
    pb, brl = {}, {}
    for n, kk in pem.items():
        pb[n] = PB.klimatologi(tr, te, kk)
        brl[n] = PB.brier(PB.klimatologi(tr, tr, kk), [u["y"] for u in tr])
    utama = min(brl, key=brl.get)
    na = max(1, math.ceil(KR["alarm_fraksi"] * len(te)))
    urut = sorted(range(len(te)), key=lambda i: (-pm[i], key[i]))
    am = [False] * len(te)
    for i in urut[:na]:
        am[i] = True
    sam = PB.samakan_alarm(am, pb[utama], y, pecah=key)
    ab = sam["alarm"]
    assert sum(am) == sum(ab) == na, "jumlah alarm model dan pembanding harus sama"
    rows = [{"y": y[i], "pm": pm[i], "pb": pb[utama][i], "am": am[i], "ab": ab[i], "blok": (te[i]["prov"], te[i]["d"].strftime("%Y-%m"))} for i in range(len(te))]
    ets = lambda r, k: (PB.kontingensi([x[k] for x in r], [x["y"] for x in r]) or {}).get("ets")
    d_ets = lambda r: None if ets(r, "am") is None or ets(r, "ab") is None else ets(r, "am") - ets(r, "ab")
    d_br = lambda r: sum((x["pb"] - x["y"]) ** 2 - (x["pm"] - x["y"]) ** 2 for x in r) / len(r)
    return {"n_latih": len(tr), "n_uji": len(te), "y1_uji": sum(y), "n_prov": len({u["prov"] for u in te}), "pembanding_utama": utama,
            "n_alarm": na, "imbang_dipecah": sam["imbang_dipecah"], "ets_model": ets(rows, "am"), "ets_pembanding": ets(rows, "ab"),
            "brier_model": PB.brier(pm, y), "brier_pembanding": PB.brier(pb[utama], y), "auc_model": PB.auc(pm, y), "auc_pembanding": PB.auc(pb[utama], y),
            "d_ets": PB.bootstrap_blok(d_ets, rows, "blok", KR["boot"], KR["biji"]), "d_brier": PB.bootstrap_blok(d_br, rows, "blok", KR["boot"], KR["biji"])}


def vonis(h):
    """TAK_CUKUP bila n/y1/provinsi di bawah kriteria; LOLOS hanya bila batas bawah 95% d_ets DAN d_brier > 0; selain itu TIDAK_LOLOS."""
    if h["n_uji"] < KR["min_n"] or h["y1_uji"] < KR["min_y1"] or h["n_prov"] < KR["min_prov"]:
        return "TAK_CUKUP"
    lo = [h["d_ets"].get("lo"), h["d_brier"].get("lo")]
    return "LOLOS" if all(x is not None and x > 0 for x in lo) else "TIDAK_LOLOS"


# ------------------------------------------------------------------ penyiapan data (retrospektif)
def siapkan(akhir_latih=None):
    """-> (satuan berfitur lengkap periode latih, ringkasan). Hanya kab layak (debit) yang punya sampel hujan ERA5."""
    ub, sk = E1.sampel_kab()
    kode = json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json")))
    n2k = {v["kunci_nama"]: k for k, v in kode.items() if v.get("kunci_nama")}
    era = hujan_era5(sk, ub, n2k, DG.AKHIR_LATIH)
    rg = DG.ringkas()
    deb = {}
    for k in rg["layak"]:
        r = DG.baca_rec(k)
        deb[k] = (r["q"], tgl(r["t0"]), DG.p90_latih(r["q"], tgl(r["t0"])))
    ok = set(deb) & set(era)
    baris, st = LD.baca_dalops()
    sat = satuan(baris, LD.cakupan_label(baris, "banjir"), ok)
    pakai, buang = [], 0
    for u in sat:
        if not (LATIH[0] <= u["d"].year <= LATIH[1]):
            continue
        q, t0, p90 = deb[u["kab"]]
        p, ref3 = era[u["kab"]]
        e = ub.hari_ke(u["d"])
        if isi_fisik(u, q, t0, p90, sum(p[e + 1:e + 4]), ref3):
            pakai.append(u)
        else:
            buang += 1
    return pakai, {"kab_debit_layak": len(rg["layak"]), "kab_tanpa_sungai_besar": len(rg["tanpa_sungai_besar"]), "kab_belum_diambil": rg["belum_diambil"],
                   "kab_dengan_hujan": len(era), "kab_dipakai": len(ok), "satuan_latih": len(pakai), "dibuang_fitur_kosong": buang}


def eksplorasi(sat):
    """DESKRIPTIF, periode latih saja: AUC satu-fitur dan model LOYO lawan pembanding. BUKAN uji, tidak ada vonis."""
    out = {"n": len(sat), "y1": sum(u["y"] for u in sat), "laju_dasar": None if not sat else sum(u["y"] for u in sat) / len(sat),
           "auc_fitur": {f: PB.auc([u[f] for u in sat], [u["y"] for u in sat]) for f in FITUR}}
    tahun = sorted({u["d"].year for u in sat})
    oof, base, yy = [], [], []
    for t in tahun:
        a, b = [u for u in sat if u["d"].year != t], [u for u in sat if u["d"].year == t]
        if len(a) < 20 or not any(u["y"] for u in a) or not b:
            continue
        oof += latih_model(a)(b)
        base += PB.klimatologi(a, b, ("prov", "bulan"))
        yy += [u["y"] for u in b]
    if yy and 0 < sum(yy) < len(yy):
        out.update(loyo_n=len(yy), loyo_auc_model=PB.auc(oof, yy), loyo_auc_klim_prov_bulan=PB.auc(base, yy),
                   loyo_brier_model=PB.brier(oof, yy), loyo_brier_klim_prov_bulan=PB.brier(base, yy))
    return out


def hitung():
    sat, rk = siapkan()
    print(json.dumps(rk))
    print(json.dumps({"EKSPLORASI_LATIH_bukan_uji": eksplorasi(sat)}, indent=1, default=lambda x: None))


# ------------------------------------------------------------------ sidik dan buka
def _h(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]


def sidik():
    os.chdir(AKAR)
    uji()
    masukan = [f"label_dalops:{_h('scripts/umum/label_dalops.py')}", f"titik_glofas_kab:{_h('scripts/banjir/data/titik_glofas_kab.json')}",
               f"logbook:{_h('data/pusdalops/logbook_kejadian.csv')}", f"p90_latih_batas:{DG.AKHIR_LATIH}"]
    print(S.tulis(os.path.relpath(SIDIK, AKAR), KODE_SIDIK, os.path.relpath(KRITERIA, AKAR), masukan)["sidik"])


def izinkan_buka(hari_ini, sidik_di_head, ada_buka):
    """Aturan penjaga, murni: sidik harus di HEAD, jendela prospektif + jeda lapor harus lewat, penanda belum ada."""
    akhir = tgl(KR["prospektif_akhir"]) + dt.timedelta(KR["jeda_lapor_hari"])
    if not sidik_di_head:
        return "sidik dan PRAREG belum ada di HEAD"
    if ada_buka:
        return "uji sudah dibuka sekali"
    if hari_ini <= akhir:
        return f"jendela prospektif belum selesai: boleh dibuka sesudah {akhir}"
    return None


def _di_head(rel):
    return subprocess.run(["git", "cat-file", "-e", f"HEAD:{rel}"], cwd=AKAR, capture_output=True).returncode == 0


def baca_snapshot(d, cache=DG.CACHE):
    p = os.path.join(cache, "ensemble", f"{d}.json")
    return json.load(open(p))["kab"] if os.path.exists(p) else {}


def fitur_snapshot(snap, d):
    """Snapshot terbit d: kontrol harian t=d-2..d dan ansambel hari d. -> (q[d-2..d] atau None, anggota hari d)."""
    t = snap["t"]
    ix = [t.index((d - i * ONE).isoformat()) for i in (2, 1, 0)] if all((d - i * ONE).isoformat() in t for i in (0, 1, 2)) else None
    if ix is None:
        return None, []
    return [snap["kontrol"][i] for i in ix], [m[ix[2]] for m in snap["anggota"]]


def arsip_h3(bulan_ym):
    """data/banjir/arsip_kab2/YYYY-MM.jsonl -> {(kab 'pp|Nama', terbit): h3 (mm, d+1..d+3)} untuk lead 1."""
    p = os.path.join(ARSIP_KAB2, f"{bulan_ym}.jsonl")
    out = {}
    if os.path.exists(p):
        for ln in open(p):
            r = json.loads(ln)
            if r["lead"] == 1:
                out[(r["kab"], r["terbit"])] = r["fitur"]["h3"]
    return out


def buka():
    os.chdir(AKAR)
    alasan = izinkan_buka(dt.date.today(), _di_head("scripts/banjir/eskalasi2.sidik") and _di_head("scripts/banjir/PRAREG-ESKALASI2.md"), os.path.exists(BUKA))
    if alasan:
        sys.exit("TIDAK DIBUKA: " + alasan)
    ide = S.cek(os.path.relpath(SIDIK, AKAR))["sidik"]
    tr, rk = siapkan()
    kode = json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json")))
    k2n = {k: v["kunci_nama"] for k, v in kode.items() if v.get("kunci_nama")}
    ub, sk = E1.sampel_kab()
    n2k = {v: k for k, v in k2n.items()}
    era = hujan_era5(sk, ub, n2k, DG.AKHIR_LATIH)
    a, b = tgl(KR["prospektif_awal"]), tgl(KR["prospektif_akhir"])
    baris, _ = LD.baca_dalops()
    ok = {k for k in DG.ringkas()["layak"] if k in era}
    te, h3 = [], {}
    for u in satuan(baris, LD.cakupan_label(baris, "banjir"), ok):
        if not (a <= u["d"] <= b):
            continue
        ym = u["d"].strftime("%Y-%m")
        if ym not in h3:
            h3[ym] = arsip_h3(ym)
        snap = baca_snapshot(u["d"]).get(u["kab"])
        h = h3[ym].get((k2n[u["kab"]], u["d"].isoformat()))
        q3, _ = fitur_snapshot(snap, u["d"]) if snap else (None, [])
        r = DG.baca_rec(u["kab"])
        if q3 is None or h is None or any(x is None for x in q3):
            continue
        if isi_fisik(u, [q3[0], q3[1], q3[2]], u["d"] - 2 * ONE, DG.p90_latih(r["q"], tgl(r["t0"])), h, era[u["kab"]][1]):
            te.append(u)
    hasil = nilai(tr, te) if te and tr else {"n_uji": len(te), "y1_uji": sum(u["y"] for u in te), "n_prov": len({u["prov"] for u in te})}
    hasil.update(vonis=vonis(hasil), sidik=ide, ringkas_latih=rk, dibuat=dt.date.today().isoformat(),
                 catatan="prospektif; ansambel diarsip tetapi tidak masuk model; tidak tampil")
    S.buka(os.path.relpath(BUKA, AKAR), None, ide, hasil["vonis"])
    os.makedirs(KELUAR, exist_ok=True)
    json.dump(hasil, open(os.path.join(KELUAR, "hasil.json"), "w"), indent=1, ensure_ascii=False, default=str)
    print(json.dumps(hasil, indent=1, ensure_ascii=False, default=str))


# ------------------------------------------------------------------ swauji
def uji():
    D = dt.date
    cov = {"1111": {"2020-01": (1, 1), "2020-02": (1, 1)}}
    ok = {"1111"}
    B = lambda t, l: {"bahaya": {"banjir"}, "kab": "1111", "tgl": str(t), "lapor": str(l)}
    s0 = D(2020, 1, 10)
    dasar = [B(s0, s0), B(s0, s0 + ONE), B(s0 + ONE, s0 + ONE), B(s0 + 2 * ONE, s0 + 2 * ONE)]
    u = satuan(dasar, cov, ok)
    assert len(u) == 1 and u[0]["d"] == s0 + ONE and u[0]["y"] == 1, u
    assert u[0]["lap_d"] == math.log1p(2) and u[0]["tumbuh"] == math.log1p(2) - math.log1p(1) and u[0]["flag"] == 1, u[0]
    # y hanya dari tanggal KEJADIAN d+1..d+2: kejadian s+4 (d+3) tak dihitung; kejadian d+1 dicatat sangat telat tetap y=1 (label boleh memakai masa depan)
    assert satuan([B(s0, s0), B(s0 + 4 * ONE, s0 + 4 * ONE)], cov, ok)[0]["y"] == 0
    assert satuan([B(s0, s0), B(s0 + 2 * ONE, s0 + 9 * ONE)], cov, ok)[0]["y"] == 1
    # tanpa kebocoran: fitur satuan tak berubah bila ada laporan/kejadian SESUDAH d
    a = satuan([B(s0, s0)], cov, ok)[0]
    b = satuan([B(s0, s0), B(s0 + 2 * ONE, s0 + 2 * ONE), B(s0 + ONE, s0 + 5 * ONE)], cov, ok)[0]
    assert all(a[k] == b[k] for k in ("lap_d", "tumbuh", "flag")) and a["y"] == 0 and b["y"] == 1
    # bukan awal episode / tak dicatat hari-s / kab-bulan tak teramati / kab di luar himpunan -> dibuang
    assert [x["d"] for x in satuan([B(s0 - ONE, s0 - ONE), B(s0, s0)], cov, ok)] == [s0 - ONE + ONE]
    assert satuan([B(s0, s0 + ONE)], cov, ok) == []
    assert satuan([B(D(2020, 3, 5), D(2020, 3, 5))], cov, ok) == []
    assert satuan([B(D(2020, 1, 31), D(2020, 1, 31))], {"1111": {"2020-01": (1, 1)}}, ok) == []         # d+1 jatuh ke bulan tak teramati
    assert satuan(dasar, cov, set()) == []
    # persentil lokal hanya dari latih: lonjakan sesudah akhir latih tak mengubah ref
    p = [float(i % 7) for i in range(40)]
    ref = ref_hujan(p, D(2020, 1, 1), D(2020, 1, 30))
    assert ref == ref_hujan(p[:30] + [999.0] * 10, D(2020, 1, 1), D(2020, 1, 30)) and ref > 0
    # fitur fisik: tak bocor (debit sesudah d diubah), kosong -> satuan ditolak
    q = [10.0, 10.0, 20.0, 20.0, 30.0]
    t0 = D(2020, 1, 1)
    f = {"d": D(2020, 1, 3)}                                     # indeks 2: 20 vs 10 -> naik
    assert isi_fisik(f, q, t0, 10.0, 30.0, 15.0) and f["fase"] == 1.0 and abs(f["lq"] - math.log1p(2.0)) < 1e-12 and abs(f["lh13"] - math.log1p(2.0)) < 1e-12
    g = {"d": D(2020, 1, 3)}
    isi_fisik(g, q[:3] + [999.0, 999.0], t0, 10.0, 30.0, 15.0)
    assert (g["lq"], g["fase"]) == (f["lq"], f["fase"])
    assert not isi_fisik({"d": D(2020, 1, 3)}, [10.0, 10.0, None], t0, 10.0, 30.0, 15.0) and not isi_fisik({"d": D(2020, 1, 3)}, q, t0, 10.0, 30.0, 0.0)
    # PAV: monoton, rata blok benar
    xs, vs = pav([1, 2, 3, 4], [1, 0, 1, 1])
    assert vs == sorted(vs) and abs(iso((xs, vs), 1.5) - .5) < 1e-12 and iso((xs, vs), 99) == 1.0 and iso((xs, vs), -5) == vs[0]
    # model + pembanding pada alarm SAMA, data sintetik dengan sinyal pada lq; model tak melihat y uji
    rnd = random.Random(5)

    def buat(n, tahun):
        r = []
        for i in range(n):
            lq = rnd.gauss(0, 1)
            r.append({"kab": f"{i % 6:04d}", "prov": str(i % 4), "d": D(tahun, 1 + i % 12, 1 + i % 20), "bulan": 1 + i % 12, "y": int(rnd.random() < 1 / (1 + math.exp(-(1.8 * lq - 1)))),
                      "lq": lq, "fase": float(rnd.choice([-1, 0, 1])), "lh13": rnd.gauss(0, 1), "tumbuh": rnd.gauss(0, 1), "lap_d": rnd.gauss(0, 1),
                      "flag": rnd.choice([0, 1]), "sinm": 0.0, "cosm": 1.0})
        return r
    tr, te = buat(500, 2019) + buat(500, 2020), buat(300, 2024)
    h = nilai(tr, te)
    assert h["n_alarm"] == math.ceil(KR["alarm_fraksi"] * 300) and h["auc_model"] > 0.65 and h["ets_model"] > h["ets_pembanding"] - 0.05, h
    te2 = [dict(x, y=1 - x["y"]) for x in te]
    assert nilai(tr, te2)["n_alarm"] == h["n_alarm"]
    assert latih_model(tr)(te) == latih_model(tr)(te2), "peluang model tak boleh bergantung pada y uji"
    # vonis: data tak cukup -> TAK_CUKUP, bukan LOLOS/TIDAK
    assert vonis({"n_uji": 10, "y1_uji": 2, "n_prov": 1, "d_ets": {}, "d_brier": {}}) == "TAK_CUKUP"
    ok_ = {"n_uji": 999, "y1_uji": 999, "n_prov": 99}
    assert vonis({**ok_, "d_ets": {"lo": 0.01}, "d_brier": {"lo": 0.01}}) == "LOLOS" and vonis({**ok_, "d_ets": {"lo": 0.01}, "d_brier": {"lo": -0.01}}) == "TIDAK_LOLOS"
    assert vonis({**ok_, "d_ets": {"lo": None}, "d_brier": {"lo": 0.5}}) == "TIDAK_LOLOS"
    # penjaga buka
    akhir = tgl(KR["prospektif_akhir"]) + dt.timedelta(KR["jeda_lapor_hari"])
    assert izinkan_buka(D(2026, 11, 25), True, False) and izinkan_buka(akhir + ONE, False, False) and izinkan_buka(akhir + ONE, True, True)
    assert izinkan_buka(akhir + ONE, True, False) is None and izinkan_buka(akhir, True, False)
    # snapshot: butuh d-2..d lengkap
    sn = {"t": ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"], "kontrol": [1.0, 2.0, 3.0, 4.0], "anggota": [[1, 2, 3, 4], [5, 6, 7, 8]]}
    assert fitur_snapshot(sn, D(2026, 12, 3)) == ([1.0, 2.0, 3.0], [3, 7]) and fitur_snapshot(sn, D(2026, 12, 2))[0] is None
    # kriteria: jendela prospektif di depan, tak menimpa jendela terbakar
    assert tgl(KR["prospektif_awal"]) > D(2026, 10, 18)
    print("eskalasi2.py uji: ok")


if __name__ == "__main__":
    {"uji": uji, "hitung": hitung, "sidik": sidik, "buka": buka}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
