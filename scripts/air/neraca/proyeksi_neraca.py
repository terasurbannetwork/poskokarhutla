#!/usr/bin/env python3
"""NA-30: neraca air Jawa di bawah proyeksi iklim NEX-GDDP-CMIP6 (delta-change), TIAP model dijalankan sendiri.

Keputusan pemilik 11 Nov 2026 (RANCANGAN.md "Proyeksi iklim ke neraca"): ET0 baseline = FAO-56 Penman-Monteith dari
NASA POWER (iklim_global.et0_bulan), jadi ET0 proyeksi dihitung ULANG dengan rumus yang sama dari masukan POWER yang
suhunya digeser; bukan faktor baru. Per model m, skenario ssp, kab k, bulan-kalender b:
  hujan  : p'(t)   = p(t) * r[m,k,b],  r = rerata hujan 2041-2060 / rerata 1995-2014 (model yang sama)
  suhu   : T, Tmax, Tmin digeser + dT[m,k,b] (selisih rerata tas); Rs, RH, angin TETAP
  ET0    : et0'(t) = et0_json(t) * ET0_PM(masukan geser) / ET0_PM(masukan asli)  (rasio menjaga bulatan 0,1 mm baseline)
Faktor kab -> sel 0,1 derajat berbobot luas irisan. Seluruh seri 1991-2025 digeser; bak, routing, waduk, kebutuhan 2025
dijalankan ulang oleh neraca.jalankan (konservasi massa diperiksa tiap jalan). Kebutuhan tidak ditumbuhkan.

  python3 proyeksi_neraca.py          # hitung -> public/data/neraca_air/proyeksi_neraca.json (butuh cache nex_gddp)
  python3 proyeksi_neraca.py uji      # self-check tanpa jaringan
"""
import csv, json, math, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import iklim_global as G  # noqa: E402
import neraca as N  # noqa: E402
import proyeksi_iklim as PI  # noqa: E402

KELUAR = os.path.join(N.KELUAR, "proyeksi_neraca.json")
INDIKATOR = ("N_kemarau", "N_tahunan", "N80_kemarau", "R_tahunan", "bulan_defisit")
EPS = 1e-9


# ---------- matematika delta-change (murni) ----------
def faktor_bulanan(dasar12, depan12, tas_dasar12, tas_depan12):
    """-> (r[12], dT[12]). Hujan dasar <= 0 di satu bulan ditolak (rasio tak terdefinisi)."""
    if any(x <= 0 for x in dasar12):
        raise ValueError("hujan dasar bulanan <= 0, rasio tak terdefinisi")
    return [f / a for a, f in zip(dasar12, depan12)], [f - a for a, f in zip(tas_dasar12, tas_depan12)]


def bobot_faktor(irisan, per_kab):
    """irisan {kab: km2}, per_kab {kab: [12]} -> [12] rerata berbobot luas."""
    tot = sum(irisan.values())
    if tot <= 0:
        raise ValueError("luas irisan nol")
    return [sum(a * per_kab[k][b] for k, a in irisan.items()) / tot for b in range(12)]


def terapkan_hujan(p, r, awal=G.AWAL):
    return [round(v * r[t % 12], 1) for t, v in enumerate(p)]


def et0_geser(et0_json, par, lat, z, dT, awal=G.AWAL):
    """et0_json: seri baseline (mm/bln); par: masukan POWER {VAR:{YYYYMM:v}}. dT=0 -> seri sama persis."""
    out = []
    for t, base in enumerate(et0_json):
        k = f"{awal + t // 12}{t % 12 + 1:02d}"
        v = [par[n][k] for n in ("T2M", "T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M")]
        h = G.calendar.monthrange(awal + t // 12, t % 12 + 1)[1]
        d = dT[t % 12]
        e0 = G.et0_bulan(lat, z, t % 12 + 1, h, v[0], v[1], v[2], v[3], v[4], v[5])
        e1 = G.et0_bulan(lat, z, t % 12 + 1, h, v[0] + d, v[1] + d, v[2] + d, v[3], v[4], v[5])
        out.append(round(base * (e1 / e0), 1) if e0 > 0 else base)
    return out


def tanda(deltas):
    """5 delta -> 'naik' | 'turun' | 'tak-sepakat' (nol atau campur = tak sepakat)."""
    if all(d > EPS for d in deltas):
        return "naik"
    if all(d < -EPS for d in deltas):
        return "turun"
    return "tak-sepakat"


def sebaran(dasar, per_model):
    """per_model {model: nilai skenario} -> ringkasan delta dengan sebaran."""
    d = {m: round(v - dasar, 2) for m, v in per_model.items()}
    xs = list(d.values())
    return {"dasar": round(dasar, 2), "delta_model": d, "median": round(N.persentil(xs, 0.5), 2), "min": min(xs), "maks": max(xs),
            "tanda": tanda(xs), "n_naik": sum(x > EPS for x in xs), "n_turun": sum(x < -EPS for x in xs)}


# ---------- pemuatan faktor dari cache ----------
def faktor_model(m, sk):
    """-> ({kode: r[12]}, {kode: dT[12]}) untuk model m, skenario sk."""
    def rerata(sk_, var, thn):
        d = [PI.muat(m, sk_, var, t) for t in thn]
        return {k: PI.rerata_masa([x["bulanan"][k] for x in d]) for k in d[0]["bulanan"]}
    pd, td = rerata("historical", "pr", PI.DASAR), rerata("historical", "tas", PI.DASAR)
    pf, tf = rerata(sk, "pr", PI.MASA_DEPAN), rerata(sk, "tas", PI.MASA_DEPAN)
    r, dt = {}, {}
    for k in pd:
        r[k], dt[k] = faktor_bulanan(pd[k], pf[k], td[k], tf[k])
    return r, dt


def irisan_sel(topo):
    out = {}
    for sd in topo["subdas"].values():
        for kode, sels in sd["kab"].items():
            for c, km2 in sels.items():
                out.setdefault(c, {}).setdefault(kode, 0.0)
                out[c][kode] += km2
    return out


def iklim_proyeksi(iklim, pw, irs, r, dt):
    sel = {}
    for c, d in iklim["sel"].items():
        rr, dd = bobot_faktor(irs[c], r), bobot_faktor(irs[c], dt)
        la, lo = G.titik_power(c)
        w = pw[f"{la},{lo}"]
        sel[c] = {"p": terapkan_hujan(d["p"], rr), "et0": et0_geser(d["et0"], w["par"], la, w["z"], dd), "elev": d["elev"]}
    return {"sel": sel, "meta": iklim["meta"]}


def indikator(h, keb):
    """hasil neraca.jalankan -> {kab: {indikator: nilai}} (kebutuhan 2025, klimatologi)."""
    U, jl = h["hasil"][2025]
    U30, jl30 = h["hasil"][2030]
    out = {}
    for k in h["lengkap"]:
        kl = N.ringkas_kab(k, keb["kab"][k], h["kabv"], U, jl, h["bulan"], U30, jl30)["klim"]
        out[k] = {"N_kemarau": sum(kl["N"][m - 1] for m in N.KEMARAU), "N_tahunan": sum(kl["N"]), "N80_kemarau": kl["N80_kemarau_total"],
                  "R_tahunan": sum(kl["R"]), "bulan_defisit": float(sum(1 for x in kl["N"] if x < 0))}
    return out


def main():
    topo, iklim, keb, pw = (json.load(open(p)) for p in (N.TOPO, N.IKLIM, N.KEB, G.P_POWER))
    waduk = list(csv.DictReader(open(N.WADUK)))
    irs = irisan_sel(topo)
    dasar = indikator(N.jalankan(topo, iklim, keb, waduk), keb)
    hasil = {sk: {m: None for m in PI.MODEL} for sk in PI.SKENARIO}
    for sk in PI.SKENARIO:
        for m in PI.MODEL:
            r, dt = faktor_model(m, sk)
            hasil[sk][m] = indikator(N.jalankan(topo, iklim_proyeksi(iklim, pw, irs, r, dt), keb, waduk), keb)
            print(f"{sk} {m} selesai", file=sys.stderr)
    nama = {k: v["nama"] for k, v in keb["kab"].items()}
    kab = {}
    for k in sorted(dasar):
        e = {"nama": nama[k]}
        for sk in PI.SKENARIO:
            e[sk] = {ind: sebaran(dasar[k][ind], {m: hasil[sk][m][k][ind] for m in PI.MODEL}) for ind in INDIKATOR}
        kab[k] = e
    ringkas = {}
    for sk in PI.SKENARIO:
        for ind in INDIKATOR:
            ts = [kab[k][sk][ind]["tanda"] for k in kab]
            ringkas[f"{sk}.{ind}"] = {t: ts.count(t) for t in ("naik", "turun", "tak-sepakat")}
    meta = {
        "label": "estimasi-model", "judul": "Neraca air Jawa di bawah proyeksi iklim 2041-2060 (delta-change, 5 model dijalankan satu per satu)",
        "satuan": "juta m3 (bulan_defisit: bulan); delta = skenario proyeksi minus neraca baseline 1991-2025 dengan kebutuhan 2025 tetap",
        "model": PI.MODEL, "skenario": PI.SKENARIO, "indikator": list(INDIKATOR),
        "metode": __doc__.split("\n\n")[0] + " " + __doc__.split("\n\n")[1],
        "tanda": "naik = kelima model naik; turun = kelimanya turun; tak-sepakat = campur (atau nol). Median dan min-maks selalu dilaporkan bersama.",
        "ringkas_tanda": ringkas,
        "catatan": "Bukan prakiraan. Hanya iklim yang diubah: penduduk, luas irigasi, waduk, dan transfer tetap seperti baseline 2025; target waduk dihitung "
                   "ulang dari aliran iklim proyeksi. RH, radiasi, angin tetap (RH tetap berarti tekanan uap naik bersama suhu). Suhu maks/min digeser sama "
                   "besar dengan suhu rerata. Sumber faktor: proyeksi_iklim.json (meta.catatan berlaku). Rasio hujan bulanan dari rerata 20 tahun, "
                   "tidak diuji signifikansi. Belum divalidasi NA-06.",
        "sumber_faktor": "data/kajian-bnpb/neraca-air/mentah/nex_gddp (cache NEX-GDDP-CMIP6, CC0)"}
    json.dump({"meta": meta, "kab": kab}, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    for sk in PI.SKENARIO:
        print(sk, "N_kemarau", ringkas[f"{sk}.N_kemarau"], file=sys.stderr)


# ---------- uji ----------
def uji():
    # faktor: hujan 100 -> 70 = r 0,7; suhu +1,5; dasar nol ditolak
    r, dt = faktor_bulanan([100.0] * 12, [70.0] * 12, [26.0] * 12, [27.5] * 12)
    assert all(abs(x - 0.7) < 1e-12 for x in r) and all(abs(x - 1.5) < 1e-12 for x in dt)
    try:
        faktor_bulanan([0.0] + [1.0] * 11, [1.0] * 12, [26.0] * 12, [27.0] * 12); raise SystemExit("dasar nol harus ditolak")
    except ValueError:
        pass
    # hujan: perkalian per bulan-kalender, idempoten pada r=1, urutan bulan benar (t=13 -> Feb)
    p = [10.0] * 24
    assert terapkan_hujan(p, [1.0] * 12) == p
    q = terapkan_hujan(p, [1.0, 0.5] + [1.0] * 10)
    assert q[1] == 5.0 and q[13] == 5.0 and q[0] == 10.0 and q[12] == 10.0
    # bobot luas: 3 km2 r=1, 1 km2 r=2 -> 1,25
    assert abs(bobot_faktor({"a": 3.0, "b": 1.0}, {"a": [1.0] * 12, "b": [2.0] * 12})[0] - 1.25) < 1e-12
    # ET0: dT=0 mengembalikan baseline persis; dT>0 menaikkan ET0; rumusnya sama dengan iklim_global (angka tangan)
    par = {"T2M": {}, "T2M_MAX": {}, "T2M_MIN": {}, "ALLSKY_SFC_SW_DWN": {}, "RH2M": {}, "WS2M": {}}
    for y in range(G.AWAL, G.AWAL + 2):
        for m in range(1, 13):
            k = f"{y}{m:02d}"
            for n, v in (("T2M", 26.0), ("T2M_MAX", 30.0), ("T2M_MIN", 22.5), ("ALLSKY_SFC_SW_DWN", 18.0), ("RH2M", 80.0), ("WS2M", 2.0)):
                par[n][k] = v
    base = [round(G.et0_bulan(-7.8, 100, t % 12 + 1, G.calendar.monthrange(G.AWAL + t // 12, t % 12 + 1)[1], 26, 30, 22.5, 18, 80, 2), 1) for t in range(24)]
    assert et0_geser(base, par, -7.8, 100, [0.0] * 12) == base
    naik = et0_geser(base, par, -7.8, 100, [2.0] * 12)
    assert all(a > b for a, b in zip(naik, base)), "suhu naik harus menaikkan ET0"
    assert 0.02 < naik[5] / base[5] - 1 < 0.15, "sensitivitas ET0 ~ 2-15% untuk +2 C (angka tangan FAO-56)"
    # tanda dan sebaran: campur = tak-sepakat; nol = tak-sepakat; semua turun = turun
    assert tanda([-1, -2, -0.5, -3, -1]) == "turun" and tanda([1, 2, 3, 4, 5]) == "naik"
    assert tanda([-1, 2, 3, 4, 5]) == "tak-sepakat" and tanda([0, 1, 1, 1, 1]) == "tak-sepakat"
    s = sebaran(10.0, {"a": 7.0, "b": 9.0, "c": 12.0, "d": 8.0, "e": 6.0})
    assert s["median"] == -2.0 and s["min"] == -4.0 and s["maks"] == 2.0 and s["tanda"] == "tak-sepakat" and (s["n_naik"], s["n_turun"]) == (1, 4)
    print("ok proyeksi_neraca")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
