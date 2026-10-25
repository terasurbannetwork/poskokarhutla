#!/usr/bin/env python3
"""Paket `turunan`: daftar perhatian kab/kota kedua kajian, provinsi utama, profil kerugian tahunan batas bawah, dan angka tesis
(KERANGKA §10 "Turunan baru", Bab 3.5 Kajian 1, Bab 3.8 dan 12.5 Kajian 2, prinsip 8 dan 15).

Jalankan dari mana saja:  python3 data/kajian-bnpb/bangun/turunan.py
Menulis data/kajian-bnpb/data/turunan/*.csv, lalu self-check assert dan uji penolakan (gagal = keluar non-nol). Stdlib, luring.
Masukan hanya keluaran paket lain (jalankan paketnya dulu bila berubah):
  air-jawa/kab_jawa.csv, air-jawa/dibi_kab_tahun.csv, air-jawa/subsiden_kota.csv    Kajian 1 (119 kab/kota Jawa)
  irbi/irbi_kab_2025.csv, skenario-hidromet/dibi_kab_tahun.csv,
  skenario-hidromet/dibi_geologi_kab_tahun.csv, skenario-geologi/tsunami_kab.csv,
  skenario-geologi/gunungapi_krb_kab.csv                                           Kajian 2 (514 kab/kota)
  dibi/rekap_nasional_tahunan.csv, dibi/kejadian_besar.csv, dibi/jawa_kab_hidromet.csv, public/banjir/data/param_banjir.json
Aturan syarat dan ambang adalah pilihan penyusun (label asumsi-kebijakan); data di baliknya resmi atau estimasi model sesuai sumbernya.
"""
import csv
import json
import math
import os
import statistics
from collections import defaultdict

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))   # data/kajian-bnpb
REPO = os.path.normpath(os.path.join(AKAR, "../.."))
D = lambda *a: os.path.join(AKAR, "data", *a)
OUT = D("turunan")
TAHUN = range(2015, 2026)   # 11 tahun 2015-2025 (syarat b dan c)
MIN_TAHUN = 3               # syarat b: kejadian tercatat >= 3 dari 11 tahun
MIN_SYARAT = 2              # masuk daftar perhatian bila >= 2 syarat


def baca(*jalur):
    with open(D(*jalur), encoding="utf-8") as f:
        return list(csv.DictReader(f))


def f(x):
    return float(x) if x not in ("", None) else None


def tulis(nama, kolom, baris):
    with open(os.path.join(OUT, nama), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(kolom)
        for b in baris:
            w.writerow(["" if b.get(k) is None else (int(b[k]) if isinstance(b[k], float) and b[k] == int(b[k]) else b[k]) for k in kolom])


# ---------------------------------------------------------------- ambang (sama dengan bangun/visual/peta.mjs kuantil)
def batas_kuintil(nilai, kelas=4):
    """Batas bawah kelas nilai ke-(kelas+1) dari 5 kuintil = v[floor(n*kelas/5)], rumus aturKelas peta.mjs. kelas=4: kelas teratas."""
    v = sorted(x for x in nilai if x is not None)
    return v[math.floor(len(v) * kelas / 5)] if v else None


def syarat_a(x, batas):
    """IRBI di kelas nilai teratas; nilai kembar di batas ikut (KERANGKA Bab 3.5)."""
    return x is not None and batas is not None and x >= batas


def batas_kuartil_atas(nilai):
    v = sorted(x for x in nilai if x is not None)
    return v[math.floor(len(v) * 3 / 4)] if v else None


def syarat_kuartil(x, batas):
    """Kuartil atas berisi nilai > 0: bila kuartil ke-3 bernilai 0, nol tidak memenuhi syarat."""
    return x is not None and x > 0 and batas is not None and x >= batas


# ---------------------------------------------------------------- daftar perhatian
def nilai_dibi(rows, kab, jenis, kolom_tahun="tahun", kejadian="kejadian", mh=("meninggal", "hilang"), ungsi="mengungsi"):
    """{kab: (n tahun berkejadian 2015-2025, meninggal+hilang, mengungsi)} untuk jenis di set `jenis`."""
    th, m, u = defaultdict(set), defaultdict(float), defaultdict(float)
    for r in rows:
        t = int(float(r[kolom_tahun]))
        if t in TAHUN and r["_jenis"] in jenis and r["_kode"] in kab:
            if (f(r[kejadian]) or 0) > 0:
                th[r["_kode"]].add(t)
            m[r["_kode"]] += sum(f(r[c]) or 0 for c in mh)
            u[r["_kode"]] += f(r[ungsi]) or 0
    return {k: (len(th[k]), m[k], u[k]) for k in kab}


def daftar(kajian, bahaya, kab, irbi, dibi, ekstra=None, label_ekstra="", min_tahun=MIN_TAHUN, kelas=4):
    """kab {kode: (nama, prov)}; irbi {kode: nilai}; dibi {kode: (n_tahun, mh, ungsi)}; ekstra {kode: bool} syarat d (kajian air) atau
    syarat b paparan (geologi). Kembalikan baris per kab dengan syarat dan status masuk."""
    ba = batas_kuintil(irbi.values(), kelas)
    bm, bu = batas_kuartil_atas([v[1] for v in dibi.values()]), batas_kuartil_atas([v[2] for v in dibi.values()])
    out = []
    for k, (nama, prov) in sorted(kab.items()):
        nt, mh, u = dibi.get(k, (0, 0.0, 0.0))
        s = {"a": syarat_a(irbi.get(k), ba), "b": nt >= min_tahun, "c": syarat_kuartil(mh, bm) or syarat_kuartil(u, bu),
             "d": bool(ekstra and ekstra.get(k))}
        n = sum(s.values())
        out.append({"kajian": kajian, "bahaya": bahaya, "kode": k, "nama": nama, "prov": prov, "irbi2025": irbi.get(k), "ambang_irbi": ba,
                    "n_tahun_dibi": nt, "meninggal_hilang_2015_2025": mh, "mengungsi_2015_2025": u, "syarat_a": s["a"], "syarat_b": s["b"],
                    "syarat_c": s["c"], "syarat_d": s["d"], "syarat_d_arti": label_ekstra, "n_syarat": n, "masuk": n >= MIN_SYARAT,
                    "label": "asumsi-kebijakan"})
    return out


def kajian_air():
    kj = {r["kode"]: r for r in baca("air-jawa", "kab_jawa.csv")}
    assert len(kj) == 119, f"kab Jawa {len(kj)} != 119"
    kab = {k: (r["nama"], r["prov_kode"]) for k, r in kj.items()}
    rows = baca("air-jawa", "dibi_kab_tahun.csv")
    for r in rows:
        r["_kode"], r["_jenis"] = r["kode"], r["kelompok"]
    # syarat d (komponen air, KERANGKA Bab 3.5): kekeringan <- daerah irigasi kewenangan pusat; banjir <- kota dengan laju penurunan muka
    # tanah terverifikasi. CAT rusak (sekunder) dan status siaga/tanggap darurat (SK belum diperoleh) belum dipakai.
    subs = {k for r in baca("air-jawa", "subsiden_kota.csv") if r["label"] == "terverifikasi" for k in r["kab_kode_disebut"].split(";") if k}
    di_pusat = {k for k, r in kj.items() if (f(r["irigasi_pusat_ha"]) or 0) > 0}
    spek = {"kekeringan": ({"kekeringan"}, di_pusat, "daerah irigasi kewenangan pusat"),
            "banjir": ({"banjir", "rob"}, subs, "kota dengan laju penurunan muka tanah terverifikasi"),
            "longsor": ({"longsor"}, None, "")}
    out = []
    for b, (jenis, ekstra, arti) in spek.items():
        irbi = {k: f(r[f"irbi2025_{b}"]) for k, r in kj.items()}
        dibi = nilai_dibi(rows, kab, jenis, kejadian="jumlah_kejadian")
        out.append((b, kab, irbi, dibi, {k: True for k in ekstra} if ekstra else None, arti))
    return out


def kajian_mitigasi():
    ir = {r["kode"]: r for r in baca("irbi", "irbi_kab_2025.csv")}
    assert len(ir) == 514, f"kab IRBI 2025 {len(ir)} != 514"
    kab = {k: (r["nama_kepmendagri"], r["prov_kode"]) for k, r in ir.items()}
    hid = baca("skenario-hidromet", "dibi_kab_tahun.csv")
    geo = baca("skenario-hidromet", "dibi_geologi_kab_tahun.csv")
    for r in hid + geo:
        r["_kode"], r["_jenis"] = r["kode"], r["jenis"]
    out = []
    hidro = {"banjir": ("banjir", {"banjir", "banjir_bandang"}), "longsor": ("longsor", {"longsor"}), "kekeringan": ("kekeringan", {"kekeringan"}),
             "cuaca_ekstrem": ("cuaca_ekstrem", {"cuaca_ekstrem"}), "gelombang_abrasi": ("abrasi", {"gelombang_abrasi", "rob"}),
             "karhutla": ("karlahut", {"karhutla"})}
    for b, (kol, jenis) in hidro.items():
        out.append((b, kab, {k: f(r[kol]) for k, r in ir.items()}, nilai_dibi(hid, kab, jenis), None, ""))
    # geologi (Bab 3.8): (a) IRBI kelas teratas, (b) paparan di kuartil atas (syarat_d kolom), (c) kejadian berkorban DIBI sejak 2008
    tsu = defaultdict(float)
    for r in baca("skenario-geologi", "tsunami_kab.csv"):
        tsu[r["kode"]] = max(tsu[r["kode"]], f(r["jiwa_pesisir_rendah_lt30"]) or 0)
    krb3 = defaultdict(float)
    for r in baca("skenario-geologi", "gunungapi_krb_kab.csv"):
        krb3[r["kode"]] += f(r["jiwa_krb3"]) or 0
    paparan = {"tsunami": (tsu, "jiwa pesisir rendah tiba <= 30 menit di kuartil atas (estimasi model)"),
               "gunungapi": (krb3, "jiwa KRB III PVMBG di kuartil atas"), "gempa": ({}, "paparan KRB gempa per kab belum ada di paket; syarat tidak dinilai")}
    korban = defaultdict(set)
    for r in geo:
        if (f(r["meninggal"]) or 0) + (f(r["hilang"]) or 0) > 0 and int(r["tahun"]) >= 2008:
            korban[r["jenis"]].add(r["kode"])
    geol = {"gempa": ("gempabumi", korban["gempa"] | korban["gempa_tsunami"]), "tsunami": ("tsunami", korban["tsunami"] | korban["gempa_tsunami"]),
            "gunungapi": ("gunungapi", korban["gunungapi"])}
    for b, (kol, berkorban) in geol.items():
        pp, arti = paparan[b]
        bp = batas_kuartil_atas(list(pp.values())) if pp else None
        # dibi dipakai sebagai (n_tahun, mh, ungsi): syarat b geologi = paparan (dipasang lewat ekstra), syarat c = kejadian berkorban
        dibi = {k: (0, 1.0 if k in berkorban else 0.0, 0.0) for k in kab}
        out.append((b, kab, {k: f(r[kol]) for k, r in ir.items()}, dibi, {k: syarat_kuartil(pp.get(k), bp) for k in kab} if pp else None, arti))
    return out


def bangun_daftar():
    semua, kep = [], []
    for kajian, spek in (("air", kajian_air()), ("mitigasi", kajian_mitigasi())):
        for b, kab, irbi, dibi, ekstra, arti in spek:
            geologi = kajian == "mitigasi" and b in ("gempa", "tsunami", "gunungapi")
            mt = 10 ** 9 if geologi else MIN_TAHUN    # geologi: syarat b diganti paparan (ekstra), bukan tahun berkejadian
            dasar = daftar(kajian, b, kab, irbi, dibi, ekstra, arti, mt)
            if geologi:   # syarat c geologi = kejadian berkorban sejak 2008 (bukan kuartil)
                for r in dasar:
                    r["syarat_c"] = dibi[r["kode"]][1] > 0
                    r["n_syarat"] = sum(r[f"syarat_{x}"] for x in "abcd")
                    r["masuk"] = r["n_syarat"] >= MIN_SYARAT
            semua += dasar
            n0 = sum(r["masuk"] for r in dasar)
            varian = [("dasar", n0)]
            if not geologi:
                for d_ in (-1, 1):   # uji kepekaan KERANGKA: ambang (b) +-1 tahun
                    varian.append((f"syarat_b_{MIN_TAHUN + d_}_tahun", sum(r["masuk"] for r in daftar(kajian, b, kab, irbi, dibi, ekstra, arti, MIN_TAHUN + d_))))
            longgar = daftar(kajian, b, kab, irbi, dibi, ekstra, arti, mt, kelas=3)   # (a) digeser satu kelas: dua kelas teratas
            if geologi:
                for r in longgar:
                    r["masuk"] = sum([r["syarat_a"], dibi[r["kode"]][1] > 0, r["syarat_d"]]) >= MIN_SYARAT
            varian.append(("syarat_a_dua_kelas_teratas", sum(r["masuk"] for r in longgar)))
            for v, n in varian:
                kep.append({"kajian": kajian, "bahaya": b, "varian": v, "n_masuk": n, "n_dasar": n0, "selisih": n - n0, "label": "asumsi-kebijakan"})
    return semua, kep


def provinsi_utama(semua):
    """Kajian 2 Bab 3.8: dua kriteria tertulis berdampingan, kab di daftar perhatian (bahaya apa pun) dan meninggal+hilang DIBI 2015-2025."""
    kab = defaultdict(set)
    for r in semua:
        if r["kajian"] == "mitigasi" and r["masuk"]:
            kab[r["prov"]].add(r["kode"])
    mh = defaultdict(float)
    for nama in ("dibi_kab_tahun.csv", "dibi_geologi_kab_tahun.csv"):
        for r in baca("skenario-hidromet", nama):
            if int(r["tahun"]) in TAHUN:
                mh[r["prov"]] += (f(r["meninggal"]) or 0) + (f(r["hilang"]) or 0)
    prov = sorted(set(mh) | set(kab))
    rk = lambda d: {p: i + 1 for i, p in enumerate(sorted(prov, key=lambda p: (-d(p), p)))}
    r1, r2 = rk(lambda p: len(kab[p])), rk(lambda p: mh[p])
    return [{"prov": p, "n_kab_daftar_perhatian": len(kab[p]), "peringkat_daftar": r1[p], "meninggal_hilang_2015_2025": mh[p], "peringkat_korban": r2[p],
             "label": "asumsi-kebijakan"} for p in sorted(prov, key=lambda p: (min(r1[p], r2[p]), p))]


# ---------------------------------------------------------------- profil kerugian tahunan batas bawah (Kajian 2 Bab 12.5)
def p90(x):
    s = sorted(x)
    return s[math.ceil(0.9 * len(s)) - 1]


def profil_kerugian():
    par = json.load(open(os.path.join(REPO, "public/banjir/data/param_banjir.json")))["param"]
    st = {k: (par[f"stimulan_rumah_{k}"][0], par[f"stimulan_rumah_{k}"][1]) for k in ("rb", "rs", "rr")}   # (skema 2022+, skema lama)
    rek = {int(r["tahun"]): r for r in baca("dibi", "rekap_nasional_tahunan.csv") if r["klasifikasi"] == "semua" and r["cakupan"] == "bencana"}
    out = []
    for t in TAHUN:
        r = rek[t]
        n = {"rb": f(r["rumah_rusak_berat"]), "rs": f(r["rumah_rusak_sedang"]), "rr": f(r["rumah_rusak_ringan"])}
        out.append({"lapisan": "tahun", "tahun": t, "rumah_rb": n["rb"], "rumah_rs": n["rs"], "rumah_rr": n["rr"],
                    "rp_tinggi": sum(n[k] * st[k][0] for k in n), "rp_rendah": sum(n[k] * st[k][1] for k in n),
                    "sumber": "DIBI BNPB rekap nasional (semua jenis, cakupan bencana)", "label": "asumsi-kebijakan"})
    for lap, fn in (("sering_median", statistics.median), ("berat_p90", p90)):
        out.append({"lapisan": lap, "tahun": "2015-2025", "rp_tinggi": fn([x["rp_tinggi"] for x in out[:len(TAHUN)]]),
                    "rp_rendah": fn([x["rp_rendah"] for x in out[:len(TAHUN)]]), "sumber": "turunan dari baris tahun", "label": "asumsi-kebijakan"})
    kb = defaultdict(dict)
    for r in baca("dibi", "kejadian_besar.csv"):
        if r["versi"] == "DIBI" and r["kode"] in ("sulteng2018", "sumatra2025") and r["metrik"] in ("rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan"):
            kb[r["kode"]][r["metrik"][len("rumah_rusak_"):]] = f(r["nilai"])
    peta = {"berat": "rb", "sedang": "rs", "ringan": "rr"}
    for kode, v in sorted(kb.items()):
        n = {peta[k]: x for k, x in v.items()}
        out.append({"lapisan": f"ekstrem_analog_{kode}", "tahun": kode[-4:], "rumah_rb": n["rb"], "rumah_rs": n["rs"], "rumah_rr": n["rr"],
                    "rp_tinggi": sum(n[k] * st[k][0] for k in n), "rp_rendah": sum(n[k] * st[k][1] for k in n),
                    "sumber": "DIBI BNPB, kejadian besar (dibi/kejadian_besar.csv)", "label": "asumsi-kebijakan"})
    return out


# ---------------------------------------------------------------- angka tesis (KERANGKA §4 dan §5; dikunci setelah Bab 4-6)
def angka_tesis():
    jw = baca("dibi", "jawa_kab_hidromet.csv")
    mt = defaultdict(float)
    for r in jw:
        if r["cakupan"] == "bencana" and 2015 <= int(r["tahun"]) <= 2026:
            mt[r["jenis_hidromet"]] += f(r["meninggal"]) or 0
    kk = baca("air-jawa", "dibi_kab_tahun.csv")
    kab_kering = lambda t: len({r["kode"] for r in kk if r["kelompok"] == "kekeringan" and r["tahun"] == str(t) and (f(r["jumlah_kejadian"]) or 0) > 0})
    sj = "DIBI BNPB 2015–2026 (sampai batas tarik), 119 kab/kota Jawa, cakupan bencana"
    return [
        {"kajian": "air", "besaran": "meninggal_hidromet_jawa_2015_2026", "nilai": sum(mt.values()), "sumber": sj, "label": "resmi"},
        {"kajian": "air", "besaran": "meninggal_longsor_banjir_jawa_2015_2026", "nilai": mt["tanah_longsor"] + mt["banjir"], "sumber": sj, "label": "resmi"},
        {"kajian": "air", "besaran": "meninggal_longsor_jawa_2015_2026", "nilai": mt["tanah_longsor"], "sumber": sj, "label": "resmi"},
        {"kajian": "air", "besaran": "meninggal_kekeringan_jawa_2015_2026", "nilai": mt["kekeringan"], "sumber": sj, "label": "resmi"},
        {"kajian": "air", "besaran": "kab_kekeringan_2019", "nilai": kab_kering(2019), "sumber": "DIBI BNPB 2019, kab/kota Jawa berkejadian kekeringan", "label": "resmi"},
        {"kajian": "air", "besaran": "kab_kekeringan_2023", "nilai": kab_kering(2023), "sumber": "DIBI BNPB 2023, kab/kota Jawa berkejadian kekeringan", "label": "resmi"},
    ]


# ---------------------------------------------------------------- self-check dan uji penolakan
def cek(semua, kep, prov, prof, tesis):
    for kajian, n in (("air", 119), ("mitigasi", 514)):
        for b in {r["bahaya"] for r in semua if r["kajian"] == kajian}:
            rs = [r for r in semua if r["kajian"] == kajian and r["bahaya"] == b]
            assert len(rs) == n, f"{kajian} {b}: {len(rs)} kab != {n}"
            assert all(r["masuk"] == (r["n_syarat"] >= MIN_SYARAT) for r in rs), f"{kajian} {b}: status masuk tidak sesuai jumlah syarat"
            assert all(r["n_syarat"] == sum(r[f"syarat_{x}"] for x in "abcd") for r in rs), f"{kajian} {b}: n_syarat bukan jumlah syarat"
            # nilai kembar di batas ikut: tiap kab bernilai sama dengan kab yang syarat a-nya benar juga benar
            ya = {r["irbi2025"] for r in rs if r["syarat_a"]}
            assert all(r["syarat_a"] for r in rs if r["irbi2025"] in ya), f"{kajian} {b}: nilai IRBI kembar di batas terpotong"
    assert {r["kajian"] for r in semua} == {"air", "mitigasi"}
    assert all(k["varian"] != "dasar" or k["selisih"] == 0 for k in kep)
    assert len({r["prov"] for r in prov}) == 38, f"provinsi utama: {len({r['prov'] for r in prov})} != 38"
    th = [r for r in prof if r["lapisan"] == "tahun"]
    assert [r["tahun"] for r in th] == list(TAHUN) and all(r["rp_rendah"] <= r["rp_tinggi"] for r in prof if "rp_tinggi" in r)
    lap = {r["lapisan"]: r["rp_tinggi"] for r in prof}
    assert lap["sering_median"] <= lap["berat_p90"] <= max(r["rp_tinggi"] for r in th), "lapisan sering <= berat <= tahun terberat"
    t = {r["besaran"]: r["nilai"] for r in tesis}
    assert t["meninggal_longsor_banjir_jawa_2015_2026"] <= t["meninggal_hidromet_jawa_2015_2026"]


def uji_tolak():
    """Aturan menolak yang salah: nilai kembar di batas tidak terpotong, kuartil bernilai nol tidak memasukkan semua kab, satu syarat tidak cukup."""
    assert batas_kuintil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) == 9 and syarat_a(9, 9) and not syarat_a(8, 9) and not syarat_a(None, 9)
    assert batas_kuintil([5, 5, 5, 5, 5]) == 5 and syarat_a(5, 5)   # kembar: semua ikut, tidak dipotong
    assert batas_kuartil_atas([0, 0, 0, 0, 7]) == 0 and not syarat_kuartil(0, 0) and syarat_kuartil(7, 0)
    kab = {"1": ("a", "11"), "2": ("b", "11"), "3": ("c", "11"), "4": ("d", "11"), "5": ("e", "11")}
    irbi = {"1": 10, "2": 1, "3": 1, "4": 1, "5": 1}
    dibi = {"1": (0, 0, 0), "2": (5, 0, 0), "3": (0, 0, 0), "4": (0, 0, 0), "5": (0, 0, 0)}
    r = {x["kode"]: x for x in daftar("uji", "x", kab, irbi, dibi)}
    assert r["1"]["syarat_a"] and not r["1"]["masuk"], "satu syarat (IRBI) tidak cukup"
    assert r["2"]["syarat_b"] and not r["2"]["masuk"], "satu syarat (tahun) tidak cukup"
    dibi["1"] = (3, 0, 0)
    assert {x["kode"]: x for x in daftar("uji", "x", kab, irbi, dibi)}["1"]["masuk"], "dua syarat masuk"


def main():
    os.makedirs(OUT, exist_ok=True)
    uji_tolak()
    semua, kep = bangun_daftar()
    prov, prof, tesis = provinsi_utama(semua), profil_kerugian(), angka_tesis()
    cek(semua, kep, prov, prof, tesis)
    tulis("daftar_perhatian.csv", ["kajian", "bahaya", "kode", "nama", "prov", "irbi2025", "ambang_irbi", "n_tahun_dibi", "meninggal_hilang_2015_2025",
                                   "mengungsi_2015_2025", "syarat_a", "syarat_b", "syarat_c", "syarat_d", "syarat_d_arti", "n_syarat", "masuk", "label"], semua)
    tulis("daftar_perhatian_kepekaan.csv", ["kajian", "bahaya", "varian", "n_masuk", "n_dasar", "selisih", "label"], kep)
    tulis("provinsi_utama.csv", ["prov", "n_kab_daftar_perhatian", "peringkat_daftar", "meninggal_hilang_2015_2025", "peringkat_korban", "label"], prov)
    tulis("profil_kerugian.csv", ["lapisan", "tahun", "rumah_rb", "rumah_rs", "rumah_rr", "rp_tinggi", "rp_rendah", "sumber", "label"], prof)
    tulis("angka_tesis.csv", ["kajian", "besaran", "nilai", "sumber", "label"], tesis)
    ring = defaultdict(int)
    for r in semua:
        ring[(r["kajian"], r["bahaya"])] += r["masuk"]
    print("daftar perhatian: " + ", ".join(f"{k}/{b} {n}" for (k, b), n in sorted(ring.items())))
    print("self-check hijau")


if __name__ == "__main__":
    main()
