"""Rantai kerusakan banjir (KI-60): bangunan tergenang GFM x kurva kedalaman-kerusakan JRC Asia x satu pengali c -> rumah rusak, berpita konformal.

  rusak_rumah = c * N_bangunan_tergenang * f_JRC(kedalaman)      (ALGORITMA.md KI s8; kriteria terkunci di kerusakan.kriteria.json + .sidik)

Masukan : public/banjir/data/genangan_nasional.json (riwayat GFM per kab: hitungan bangunan [bawah, atas], luas per kecamatan),
          data/raw/banjir/kerusakan/dibi_rr.json (rumah rusak DIBI per kab-hari, dari `ambil`), public/data/penduduk.json,
          scripts/banjir/data/kurva_jrc_asia.json (Huizinga dkk. 2017, Table 3-2).
Keluaran: public/banjir/data/kerusakan.json, entri `kerusakan` di public/data/gerbang/banjir.json.
KEDALAMAN: keluaran FwDET (kedalaman_genangan.py) tidak ada di disk, jadi dipakai ASUMSI satu kedalaman (kriteria). Karena f(d) tetap,
c*f(d) satu angka; kurva baru bermakna begitu kedalaman per sel tersedia. Label: perkiraan, kurva Asia JRC, belum kurva Indonesia.
Hanya baca berkas beku/lain; tidak mengimpor umum.py, status.py, genangan/**.

Pakai:  python3 -I scripts/banjir/kerusakan.py ambil   (jaringan: DIBI Superset, tanpa kunci; tulis cache)
        python3 -I scripts/banjir/kerusakan.py kunci   (tulis kerusakan.sidik SEKALI; tolak menimpa)
        python3 -I scripts/banjir/kerusakan.py hitung  (cek sidik -> tulis keluaran)
        python3 -I scripts/banjir/kerusakan.py uji
"""
import datetime as dt
import importlib.util
import json
import math
import os
import sys

AYAH = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AYAH, "..", ".."))
os.chdir(AKAR)   # jalur di .sidik relatif terhadap akar repo


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, "scripts", "umum", nama + ".py"))
    m = importlib.util.module_from_spec(s)
    sys.modules[nama] = m
    s.loader.exec_module(m)
    return m


SEL, GER, SID = _muat("selang"), _muat("gerbang"), _muat("sidik")
R = lambda *p: os.path.join(AKAR, *p)
KRITERIA = "scripts/banjir/kerusakan.kriteria.json"
KODE = ["scripts/banjir/kerusakan.py", "scripts/umum/selang.py", "scripts/banjir/data/kurva_jrc_asia.json"]
SIDIK = "scripts/banjir/kerusakan.sidik"
DIBI = R("data", "raw", "banjir", "kerusakan", "dibi_rr.json")
KELUAR = R("public", "banjir", "data", "kerusakan.json")
LABEL = "perkiraan, kurva Asia JRC, belum kurva Indonesia"


def jrc(kurva, d):
    """Faktor kerusakan pada kedalaman d (m): interpolasi linear di antara titik, datar di atas titik terakhir."""
    t = kurva["titik"]
    if d <= t[0][0]:
        return t[0][1]
    for (x0, y0), (x1, y1) in zip(t, t[1:]):
        if d <= x1:
            return y0 + (y1 - y0) * (d - x0) / (x1 - x0)
    return t[-1][1]


def geo_rata(r):
    return math.exp(sum(math.log(x) for x in r) / len(r))


def median(v):
    s = sorted(v)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def loo(x, obs):
    """x: prediktor per peristiwa (sudah dikali f), obs: rumah rusak. -> (c_penuh, [galat_ln_i], [pred_loo_i])."""
    rasio = [o / v for o, v in zip(obs, x)]
    pred = []
    for i in range(len(x)):
        c = geo_rata(rasio[:i] + rasio[i + 1:]) if len(x) > 1 else None
        pred.append(None if c is None else c * x[i])
    gal = [abs(math.log(o / p)) for o, p in zip(obs, pred) if p]
    return geo_rata(rasio), gal, pred


def peristiwa(riwayat, dibi, penduduk, jendela):
    """Satu baris per peristiwa GFM ber-hitungan bangunan: N tengah, rumah rusak DIBI (jumlah +-jendela hari), penduduk terpapar."""
    out = []
    for e in riwayat:
        if not e.get("bangunan"):
            continue
        a = dt.date.fromisoformat(e["acuan"])
        rr = sum(v for p, k, t, v in dibi if p == e["prov"] and k == e["kab"] and abs((dt.date.fromisoformat(t) - a).days) <= jendela)
        b = e["bangunan"]["tergenang_baru"]
        pop = 0.0
        for kec, s in e["kec"].items():
            jiwa = penduduk.get(f"{e['prov']}|{e['kab']}|{kec}")
            if jiwa and s.get("luas"):
                pop += jiwa * min(1.0, s.get("baru", 0) / s["luas"])
        out.append({"prov": e["prov"], "kab": e["kab"], "acuan": e["acuan"], "N": (b[0] + b[1]) / 2, "N_bawah": b[0], "N_atas": b[1],
                    "rr_dibi": rr, "penduduk_terpapar": round(pop), "cakupan_pct": e.get("cakupan_pct"), "kec": e["kec"]})
    return out


def nilai(per, kri, kurva):
    """per: peristiwa; -> dict hasil (kalibrasi, LOO, pita, vonis). Murni, tanpa berkas."""
    f = jrc(kurva, kri["kedalaman_asumsi_m"])
    sah = [p for p in per if p["rr_dibi"] > 0 and p["N"] > 0 and p["penduduk_terpapar"] > 0]
    # n_miss: model 0 bangunan tergenang tetapi DIBI > 0 (model luput); tidak boleh dibuang diam-diam
    miss = [{"prov": p["prov"], "kab": p["kab"], "acuan": p["acuan"], "rr_dibi": p["rr_dibi"]} for p in per if p["rr_dibi"] > 0 and p["N"] <= 0]
    n, nmin = len(sah), kri["n_min_peristiwa"]
    h = {"n_peristiwa": len(per), "n_sah": n, "n_min": nmin, "f_asumsi": round(f, 4), "n_miss": len(miss), "miss": miss}
    if n < 2:
        return {**h, "c": None, "galat_loo": None, "q": None, "sah": sah, "vonis": "tak dapat dinilai", "galat_model": [], "galat_pemb": []}
    xm, xb, obs = [p["N"] * f for p in sah], [p["penduduk_terpapar"] for p in sah], [p["rr_dibi"] for p in sah]
    c, gm, _ = loo(xm, obs)
    rho, gb, _ = loo(xb, obs)
    q = SEL.split(gm, kri["selang"]["alfa"])
    h.update({"c": c, "rho": rho, "q": q, "galat_loo": math.exp(median(gm)), "galat_loo_pembanding": math.exp(median(gb)),
              "galat_model": gm, "galat_pemb": gb, "sah": sah, "rentang_N": [min(p["N"] for p in sah), max(p["N"] for p in sah)]})
    h["vonis"] = "dinilai" if n >= nmin else "tak dapat dinilai"
    return h


def gerbang_entri(h, kri):
    sumber = ["public/banjir/data/kerusakan.json", "scripts/banjir/kerusakan.kriteria.json"]
    if h["galat_model"] and h["galat_pemb"]:
        gm, gb = h["galat_model"], h["galat_pemb"]
        sl = GER.selang_berpasangan([b - m for m, b in zip(gm, gb)])
        vonis = "lolos" if h["vonis"] == "dinilai" and sl and sl[1] > 0 and sl[0] > 0 else ("tak dapat dinilai" if h["vonis"] != "dinilai" else "gagal")
        e = GER.entri_ringkas("galat LOO ln(rumah rusak model / DIBI), median", "rendah", "rumah rusak = rho x penduduk terpapar (satu rasio)",
                              len(gm), median(gm), median(gb), [sl[1], sl[2]] if sl else None, sumber=sumber, vonis=vonis, prospektif=True)
        e["catatan"] = f"{h['n_sah']} peristiwa sah dari {h['n_peristiwa']} ber-bangunan; n_miss {h['n_miss']} (model 0 bangunan, DIBI > 0); minimal {h['n_min']} agar dinilai; kedalaman ASUMSI {kri['kedalaman_asumsi_m']} m"
        e["alasan"] = f"{e['alasan']}; n_miss {h['n_miss']} (model 0 bangunan, DIBI > 0)"
        return e
    return GER.kosong("galat LOO rumah rusak", f"{h['n_sah']} peristiwa sah (rumah rusak DIBI > 0 dan bangunan GFM ada), minimal {h['n_min']}; n_miss {h.get('n_miss', 0)} (model 0 bangunan, DIBI > 0)", sumber)


def susun(h, per, kri, boleh):
    """Keluaran publik. Pita hanya pada peristiwa yang N-nya di dalam rentang kalibrasi (gerbang lebar)."""
    c, q = h.get("c"), h.get("q")
    f = h["f_asumsi"]
    rt = h.get("rentang_N")
    peri = []
    for p in per:
        est = None if c is None or not boleh else c * p["N"] * f   # gerbang tertutup: tidak ada angka rumah rusak di berkas publik
        ada = est is not None and q is not None and SEL.dalam_rentang(p["N"], *rt)
        e = {"prov": p["prov"], "kab": p["kab"], "acuan": p["acuan"], "bangunan_tergenang": [p["N_bawah"], p["N_atas"]],
             "perkiraan": None if est is None else round(est),
             "p10": round(est * math.exp(-q)) if ada else None, "p90": round(est * math.exp(q)) if ada else None,
             "dibi_rumah_rusak": p["rr_dibi"] or None, "dibi_tercatat": p["rr_dibi"] > 0}
        if est is not None:
            kc = sorted(((k, s["bangunan_baru"]) for k, s in p["kec"].items() if s.get("bangunan_baru")), key=lambda x: -(x[1][0] + x[1][1]))[:8]
            tot_all = (p["N_bawah"] + p["N_atas"]) or 1
            e["kec"] = [{"kec": k, "perkiraan": round(est * (b[0] + b[1]) / tot_all)} for k, b in kc]
            e["kec_catatan"] = "alokasi proporsional menurut bangunan tergenang; tanpa pita dan belum diuji per kecamatan"
        peri.append(e)
    return {"dibuat": dt.date.today().isoformat(), "label": LABEL, "ticket": "KI-60", "tampil": bool(boleh),
            "vonis": h["vonis"], "n_peristiwa_sah": h["n_sah"], "n_min": h["n_min"], "n_miss": h["n_miss"], "miss": h["miss"], "n_peristiwa_bangunan": h["n_peristiwa"],
            "c": None if c is None else round(c, 5), "galat_loo_faktor": None if h.get("galat_loo") is None else round(h["galat_loo"], 2),
            "galat_loo_pembanding_faktor": None if h.get("galat_loo_pembanding") is None else round(h["galat_loo_pembanding"], 2),
            "pita": {"nama": "P10-P90", "alfa": kri["selang"]["alfa"], "q_ln": round(q, 3) if q is not None and h["vonis"] == "dinilai" else None, "rentang_N_kalibrasi": rt if h["vonis"] == "dinilai" else None},
            "kedalaman_asumsi_m": kri["kedalaman_asumsi_m"], "faktor_jrc": f,
            "kurva": "scripts/banjir/data/kurva_jrc_asia.json (Huizinga dkk. 2017, EUR 28552 EN, Table 3-2)",
            "keterbatasan": ["Peristiwa sah dipilih dengan syarat rumah rusak DIBI > 0 (memilih menurut hasil): ini condong menaikkan c dan pita. Peristiwa model luput (0 bangunan tergenang, DIBI > 0) dihitung terpisah sebagai n_miss, tidak masuk kalibrasi.",
                             "Kedalaman per sel (FwDET) belum tersedia: satu kedalaman asumsi untuk semua bangunan, jadi kurva JRC belum membedakan sel dalam dan dangkal.",
                             "Radar GFM buta di permukiman: jumlah bangunan tergenang cenderung di bawah kenyataan; c menyerap sebagian.",
                             "Rumah rusak DIBI bernilai 0 tidak dibedakan dari tak tercatat; peristiwa berangka 0 dibuang, bukan dihitung sebagai nol.",
                             "Satu pengali c dari sedikit peristiwa; galat LOO dan pita adalah angka yang jujur untuk n itu, bukan jaminan."],
            "peristiwa": peri}


def hitung():
    SID.cek(SIDIK)
    kri, kurva = json.load(open(KRITERIA)), json.load(open("scripts/banjir/data/kurva_jrc_asia.json"))
    if not os.path.exists(DIBI):
        sys.exit("cache DIBI belum ada: jalankan `kerusakan.py ambil`")
    dibi = json.load(open(DIBI))
    riw = json.load(open(R("public", "banjir", "data", "genangan_nasional.json")))["riwayat"]
    pend = json.load(open(R("public", "data", "penduduk.json")))["kec"]
    per = peristiwa(riw, dibi, pend, kri["jendela_hari"])
    h = nilai(per, kri, kurva)
    e = gerbang_entri(h, kri)
    p = GER.jalur("banjir")
    ada = json.load(open(p))["keluaran"] if os.path.exists(p) else {}
    ada["kerusakan"] = e
    GER.tulis("banjir", ada)
    out = susun(h, per, kri, e["boleh_tampil"])
    with open(KELUAR + ".tmp", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    os.replace(KELUAR + ".tmp", KELUAR)
    print(json.dumps({k: out[k] for k in ("vonis", "tampil", "n_peristiwa_sah", "n_min", "c", "galat_loo_faktor", "galat_loo_pembanding_faktor")}), "|", e["alasan"])


def ambil():
    sys.path.insert(0, AYAH)
    sys.path.insert(0, R("scripts", "data"))
    from kejadian import dibi, Pencocok   # DIBI Superset publik
    rows = [[p, n, t, v["rumah_rusak"]] for j, p, n, t, v in dibi(Pencocok()) if {"banjir", "bandang"} & set(j) and t >= "2015-10-01"]
    os.makedirs(os.path.dirname(DIBI), exist_ok=True)
    json.dump(rows, open(DIBI, "w"))
    print(len(rows), "baris DIBI banjir/bandang ->", DIBI)


def kunci():
    d = SID.tulis(SIDIK, KODE, KRITERIA, ["kunci ke-4, 25 Nov 2026; sebelumnya dikunci ulang 2 kali sesudah jumlah peristiwa (15 GFM, 4 sah dengan DIBI>0) terlihat, sebelum galat model dihitung; perubahan: kelas n_miss (model 0 bangunan, DIBI>0); kriteria tidak berubah"])
    print("sidik", d["sidik"])


def uji():
    kv = {"titik": [[0, 0.0], [1, 0.5], [2, 1.0]]}
    assert jrc(kv, -1) == 0 and jrc(kv, 0.5) == 0.25 and jrc(kv, 9) == 1.0
    k = json.load(open("scripts/banjir/data/kurva_jrc_asia.json"))
    assert jrc(k, 1.0) == 0.49 and abs(jrc(k, 1.25) - 0.555) < 1e-9 and jrc(k, 6) == 1.0
    ys = [y for _, y in k["titik"]]
    assert ys == sorted(ys) and ys[0] == 0 and ys[-1] == 1, "kurva harus naik monoton dari 0 ke 1"
    # loo: obs persis 2*x -> c=2, galat LOO 0
    c, g, _ = loo([10, 20, 40, 80], [20, 40, 80, 160])
    assert abs(c - 2) < 1e-9 and max(g) < 1e-9
    kri = json.load(open(KRITERIA))
    def buat(n, rr=lambda i: 2 * (100 + 30 * i) * 0.49 * (1.2 if i % 2 else 0.85)):
        return [{"prov": "1", "kab": f"k{i}", "acuan": "2024-01-01", "N": 100 + 30 * i, "N_bawah": 1, "N_atas": 2, "rr_dibi": rr(i),
                 "penduduk_terpapar": (100 + 30 * i) * 7, "cakupan_pct": 50, "kec": {}} for i in range(n)]
    h = nilai(buat(10), kri, k)
    assert h["vonis"] == "dinilai" and h["n_sah"] == 10 and h["q"] is not None and 1 <= h["galat_loo"] < 1.6, h
    sedikit = nilai(buat(4), kri, k)                       # di bawah n_min: tak dapat dinilai, gerbang menolak
    assert sedikit["vonis"] == "tak dapat dinilai" and gerbang_entri(sedikit, kri)["boleh_tampil"] is False
    nol = nilai(buat(10, rr=lambda i: 0), kri, k)          # DIBI 0 = tak teramati: tak ada peristiwa sah
    assert nol["n_sah"] == 0 and nol["vonis"] == "tak dapat dinilai" and gerbang_entri(nol, kri)["boleh_tampil"] is False
    miss = nilai(buat(10) + [{**buat(1)[0], "N": 0, "N_bawah": 0, "N_atas": 0, "rr_dibi": 50}], kri, k)   # model luput: dihitung, bukan dibuang
    assert miss["n_miss"] == 1 and miss["n_sah"] == 10 and miss["miss"][0]["rr_dibi"] == 50
    assert susun(sedikit, buat(4), kri, False)["pita"]["q_ln"] is None
    # pita hanya di dalam rentang kalibrasi (gerbang lebar)
    luar = buat(10) + [{**buat(1)[0], "N": 99999, "N_bawah": 99999, "N_atas": 99999, "rr_dibi": 0}]
    o = susun(h, luar, kri, True)["peristiwa"]
    assert o[0]["p10"] is not None and o[0]["p10"] < o[0]["perkiraan"] < o[0]["p90"] and o[-1]["p10"] is None and o[-1]["perkiraan"] is not None
    print("ok")


if __name__ == "__main__":
    {"ambil": ambil, "kunci": kunci, "hitung": hitung, "uji": uji}.get((sys.argv[1:] or [""])[0], lambda: sys.exit(__doc__))()
