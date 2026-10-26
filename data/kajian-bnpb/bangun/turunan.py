#!/usr/bin/env python3
"""Paket `turunan`: daftar perhatian kab/kota kedua kajian, provinsi utama, profil kerugian tahunan batas bawah, dan angka tesis
(KERANGKA §10 "Turunan baru", Bab 3.5 Kajian 1, Bab 3.8 dan 12.5 Kajian 2, prinsip 8 dan 15).

Jalankan dari mana saja:  python3 data/kajian-bnpb/bangun/turunan.py
Menulis data/kajian-bnpb/data/turunan/*.csv (termasuk lampiran_*.csv untuk tabel lampiran Kajian 2), lalu self-check assert dan uji penolakan (gagal = keluar non-nol). Stdlib, luring.
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
import re
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


# ---------------------------------------------------------------- tabel lampiran Kajian 2 (KERANGKA §5 Lampiran A, B, C, D, E, H)
BAHAYA_TAMPIL = {"banjir": "banjir", "longsor": "tanah longsor", "kekeringan": "kekeringan", "cuaca_ekstrem": "cuaca ekstrem",
                 "gelombang_abrasi": "gelombang ekstrem dan abrasi", "karhutla": "karhutla", "gempa": "gempa bumi", "tsunami": "tsunami",
                 "gunungapi": "gunung api"}
PULAU_TAMPIL = {"Bali–Nusa Tenggara": "Bali dan Nusa Tenggara"}   # en dash hanya untuk rentang (NASKAH-SPEK §4)
SKENARIO_GEO = {"jawa": "Megathrust selatan Jawa, di bawah magnitudo maksimum", "jawa-mmaks": "Megathrust selatan Jawa, magnitudo maksimum",
                "mentawai": "Megathrust Mentawai, di bawah magnitudo maksimum", "mentawai-mmaks": "Megathrust Mentawai, magnitudo maksimum",
                "sumba": "Megathrust Sumba, magnitudo tanpa sumber", "merapi2010": "Erupsi setara Merapi 2010",
                "krb-30-gunung": "Erupsi besar tiga puluh gunung api, pola historis"}
FASE_TAMPIL = {"pra": "prabencana", "saat": "tanggap darurat", "pasca": "pascabencana", "lintas": "lintas tahap"}
ANCAMAN_TAMPIL = dict(BAHAYA_TAMPIL, semua="semua jenis", epidemi="epidemi", gagal_teknologi="gagal teknologi", kebakaran_tpa="kebakaran TPA",
                      konflik_sosial="konflik sosial")
KEKUATAN_TAMPIL = {"kuat": "kuat", "sedang": "sedang", "lemah": "lemah", "belum-terbukti": "belum terbukti"}


def bahaya_pulau_2025():
    """Baris IRBI 2025 per pulau untuk tabel Bab 5, nama pulau memakai tampilan baku (glosarium terlarang: Bali–Nusa Tenggara)."""
    kol = list(baca("irbi", "irbi_agregat_pulau.csv")[0])
    return kol, [dict(r, pulau_nama=PULAU_TAMPIL.get(r["pulau_nama"], r["pulau_nama"])) for r in baca("irbi", "irbi_agregat_pulau.csv") if r["tahun"] == "2025"]


def nama_peraturan(sid):
    """sid paket lembaga -> bentuk rujukan baku: uu-24-2007 -> UU 24/2007; jdih:perban-nomor-1-tahun-2025 -> Perban BNPB 1/2025."""
    m = re.match(r"jdih:(\w+)-nomor-(\d+)-tahun-(\d{4})$", sid)
    if m:
        jenis = {"perban": "Perban BNPB", "juklak": "Juklak BNPB", "perpres": "Perpres"}[m[1]]
        return f"{jenis} {m[2]}/{m[3]}"
    jenis, no, th = re.match(r"(\w+)-(\d+)-(\d{4})$", sid).groups()
    return f"{ {'uu': 'UU', 'pp': 'PP', 'perpres': 'Perpres', 'inpres': 'Inpres'}[jenis]} {no}/{th}"


def lampiran_mitigasi(semua, prov_utama):
    ir = baca("irbi", "irbi_kab_2025.csv")
    syarat = defaultdict(list)
    for r in semua:   # urutan baris semua = urutan bahaya, jadi urutan bahaya per kab stabil
        if r["kajian"] == "mitigasi" and r["masuk"]:
            geo = r["bahaya"] in ("gempa", "tsunami", "gunungapi")   # geologi: syarat_d = paparan, ditulis (b) di Bab 3.8
            huruf = sorted("b" if geo and x == "d" else x for x in "abcd" if r[f"syarat_{x}"])
            syarat[r["kode"]].append(f'{BAHAYA_TAMPIL[r["bahaya"]]} ({", ".join(huruf)})')
    kab = [{"kode": x["kode"], "nama": x["nama_kepmendagri"], "prov_nama": x["prov_nama"], "pulau": PULAU_TAMPIL.get(x["pulau"], x["pulau"]),
            "penduduk_2026": f(x["penduduk_2026"]), "irb_2025": f(x["total"]), "status_2025": x["status_total_resmi"],
            "daftar_perhatian": "; ".join(syarat[x["kode"]]), "n_bahaya_perhatian": len(syarat[x["kode"]])} for x in ir]
    pu = {r["prov"]: r for r in prov_utama}
    prov = {}
    for x in kab:
        p = prov.setdefault(x["kode"][:2], {"prov_kode": x["kode"][:2], "prov_nama": x["prov_nama"], "pulau": x["pulau"], "n_kab": 0,
                                            "penduduk_2026": 0.0, "n_kab_tinggi_2025": 0, "n_kab_perhatian": 0})
        p["n_kab"] += 1
        p["penduduk_2026"] += x["penduduk_2026"]
        p["n_kab_tinggi_2025"] += x["status_2025"] == "Tinggi"
        p["n_kab_perhatian"] += x["n_bahaya_perhatian"] > 0
    for k, p in prov.items():   # kriteria provinsi utama (Bab 3.8) dari provinsi_utama.csv agar sama dengan Bab 3 dan Bab 5
        p.update(meninggal_hilang_2015_2025=pu[k]["meninggal_hilang_2015_2025"], peringkat_daftar=str(pu[k]["peringkat_daftar"]),
                 peringkat_korban=str(pu[k]["peringkat_korban"]))
    # DIBI nasional per tahun (cakupan bencana): bencana alam dan semua klasifikasi; per jenis alam 2015-2025
    rn = [r for r in baca("dibi", "rekap_nasional_tahunan.csv") if r["cakupan"] == "bencana"]
    th = {}
    for r in rn:
        t = th.setdefault(r["tahun"], {"tahun": r["tahun"], "seri": "sejak 2024 (Juklak BNPB 7/2023)" if int(r["tahun"]) >= 2024 else "sebelum 2024",
                                        "kejadian_alam": 0.0, "meninggal_alam": 0.0, "hilang_alam": 0.0, "mengungsi_alam": 0.0, "rumah_rb_alam": 0.0,
                                        "meninggal_semua": 0.0, "hilang_semua": 0.0})
        if r["klasifikasi"] == "alam":
            for a, b in (("kejadian_alam", "kejadian"), ("meninggal_alam", "meninggal"), ("hilang_alam", "hilang"), ("mengungsi_alam", "mengungsi"),
                         ("rumah_rb_alam", "rumah_rusak_berat")):
                t[a] += f(r[b]) or 0
        elif r["klasifikasi"] == "semua":
            t["meninggal_semua"], t["hilang_semua"] = f(r["meninggal"]) or 0, f(r["hilang"]) or 0
    jenis = {}
    for r in rn:
        if r["klasifikasi"] == "alam" and int(r["tahun"]) in TAHUN:
            j = jenis.setdefault(r["kategori_dibi"], {"jenis": r["kategori_dibi"], "kejadian": 0.0, "meninggal_hilang": 0.0, "mengungsi": 0.0,
                                                      "rumah_rb": 0.0})
            j["kejadian"] += f(r["kejadian"]) or 0
            j["meninggal_hilang"] += (f(r["meninggal"]) or 0) + (f(r["hilang"]) or 0)
            j["mengungsi"] += f(r["mengungsi"]) or 0
            j["rumah_rb"] += f(r["rumah_rusak_berat"]) or 0
    # keluaran model geologi berlabel; korban tsunami model dan faktor evakuasi x0,662 tidak dimuat (KERANGKA prinsip 10, celah 3)
    geo = []
    for r in baca("skenario-geologi", "ringkasan.csv"):
        if r["butir"].startswith(("magnitudo /", "korban jiwa tsunami")):
            continue
        k = 1e6 if r["satuan"] == "juta Rp" else 1
        bersih = (r["butir"].replace(">=", "≥").replace("<=", "≤").replace(" < ", " ≤ ").replace("RB + RS", "rumah rusak berat dan sedang")
                  .replace("(H/L 0,15)", "").replace("≤ 180 menit", "dalam tiga jam").strip())
        geo.append({"skenario": SKENARIO_GEO[r["skenario"]], "butir": bersih, **{c: (f(r[c]) * k if f(r[c]) is not None else None)
                                                                                  for c in ("rendah", "tengah", "tinggi")},
                    "satuan": {"juta Rp": "Rp", "km2": "km²"}.get(r["satuan"], r["satuan"]), "label": r["label"].split(" (")[0].split(";")[0]})
    kep = [{"skenario": SKENARIO_GEO[r["skenario"]], "tuas": "kepatuhan bangunan" if r["tuas"].startswith("kepatuhan") else "jam kejadian",
            "nilai_tuas": re.sub(r"malam \(\d,\d+\) vs rata-rata \(\d,\d+\)", "okupansi malam dibanding rata-rata", r["nilai_tuas"]),
            **{c: f(r[c]) for c in ("korban_rendah", "korban_tengah", "korban_tinggi", "rb_tengah", "faktor_terhadap_dasar")}}
           for r in baca("skenario-geologi", "kepekaan.csv") if not r["tuas"].startswith("porsi evakuasi")]
    peran = [{"lembaga": r["nama_lembaga"], "ancaman": ANCAMAN_TAMPIL[r["ancaman"]], "fase": FASE_TAMPIL[r["fase"]], "peran": r["peran"],
              "uraian": r["uraian"], "dasar": f'{nama_peraturan(r["sid"])}, hlm. {r["hlm"].replace("-", "–")}', "jenis_bukti": r["jenis_bukti"]}
             for r in baca("lembaga", "peran.csv")]
    urut = {x: i for i, x in reversed(list(enumerate(r["lembaga"] for r in peran)))}   # baris satu lembaga bersambung (grup LEMBAGA)
    peran.sort(key=lambda r: urut[r["lembaga"]])
    program = [{"id": r["id"], "nama": r["nama"], "kelompok": r["kelompok"], "lokasi": r["lokasi"], "periode": r["periode"].replace("-", "–"),
                "kekuatan": KEKUATAN_TAMPIL[r["kekuatan"]], "posisi": r["posisi"], "status": r["status_label"] or "–",
                "kajian": {"air-jawa": "air", "mitigasi": "mitigasi", "keduanya": "keduanya"}[r["kajian"]]}
               for r in baca("program-terbukti", "kompendium_program.csv")]
    # keluaran mesin hidrometeorologi nasional; baris tahun analog dibuang (tahun tidak diformat sebagai bilangan, NASKAH-SPEK §8)
    hid = [{k: r[k] for k in ("skenario", "metrik", "nilai", "rendah", "tinggi", "satuan", "label")}
           for r in baca("skenario-hidromet", "kartu_skenario.csv") if r["wilayah"] == "nasional" and r["satuan"] != "tahun"]
    return (kab, sorted(prov.values(), key=lambda p: p["prov_kode"]), sorted(th.values(), key=lambda t: t["tahun"]),
            sorted(jenis.values(), key=lambda j: -j["meninggal_hilang"]), geo, kep, peran, program, hid)


def cek_lampiran(kab, prov, th, jenis, geo, kep, peran, program, hid, semua):
    angka = json.load(open(D("angka.json"), encoding="utf-8"))["angka"]
    assert len(kab) == 514 and [x["kode"] for x in kab] == sorted(x["kode"] for x in kab), "Lampiran A: 514 kab urut kode (grup provinsi)"
    assert sum(x["n_bahaya_perhatian"] > 0 for x in kab) == angka["perhatian.mitigasi.kab_unik"]["nilai"], "kab unik daftar perhatian != registri"
    assert sum(x["n_bahaya_perhatian"] for x in kab) == sum(r["masuk"] for r in semua if r["kajian"] == "mitigasi"), "pasangan kab-bahaya hilang"
    assert len(prov) == 38 and sum(p["n_kab"] for p in prov) == 514
    assert sum(p["n_kab_tinggi_2025"] for p in prov) == 169, "kab Tinggi IRBI 2025 != 169 (irbi_hitung_kelas)"
    pulau = [p["pulau"] for p in prov]
    assert all(pulau.index(x) == i or pulau[i - 1] == x for i, x in enumerate(pulau)), "pulau tidak bersambung: grup PULAU pecah"
    t = {x["tahun"]: x for x in th}
    assert (t["2025"]["meninggal_alam"], t["2025"]["hilang_alam"]) == (angka["dibi.alam.meninggal.2025"]["nilai"], 221), "DIBI alam 2025 != registri"
    assert sum(t[str(y)]["meninggal_alam"] for y in TAHUN) == angka["dibi.nasional.meninggal_alam.2015_2025"]["nilai"]
    assert sum(j["meninggal_hilang"] for j in jenis) == sum(t[str(y)]["meninggal_alam"] + t[str(y)]["hilang_alam"] for y in TAHUN)
    assert geo and not any("tsunami" in g["butir"] and "korban" in g["butir"] for g in geo), "korban tsunami model tidak boleh masuk lampiran"
    assert not any(abs((k["faktor_terhadap_dasar"] or 0) - 0.6623) < 1e-3 for k in kep), "faktor x0,662 tidak boleh tampil"
    assert len(peran) == 129 and len(program) == 25
    lb = [r["lembaga"] for r in peran]
    assert all(lb.index(x) == i or lb[i - 1] == x for i, x in enumerate(lb)), "baris lembaga tidak bersambung: grup LEMBAGA pecah"
    assert hid and all(r["satuan"] != "tahun" for r in hid)


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
    kol_p, baris_p = bahaya_pulau_2025()
    tulis("bahaya_pulau_2025.csv", kol_p, baris_p)
    lamp = lampiran_mitigasi(semua, prov)
    cek_lampiran(*lamp, semua)
    for nama, baris in zip(("lampiran_kab", "lampiran_prov", "lampiran_dibi_tahun", "lampiran_dibi_jenis", "lampiran_geologi_model",
                            "lampiran_geologi_kepekaan", "lampiran_peran_lembaga", "lampiran_program", "lampiran_hidromet"), lamp):
        tulis(f"{nama}.csv", list(baris[0]), baris)
    ring = defaultdict(int)
    for r in semua:
        ring[(r["kajian"], r["bahaya"])] += r["masuk"]
    print("daftar perhatian: " + ", ".join(f"{k}/{b} {n}" for (k, b), n in sorted(ring.items())))
    print("self-check hijau")


if __name__ == "__main__":
    main()
