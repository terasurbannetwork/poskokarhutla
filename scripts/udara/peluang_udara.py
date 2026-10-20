"""Peluang PM2,5 rata-rata 24 jam melewati batas status P.14/2020 (55,4 / 150,4 / 250,4) per kab/kota, 3 hari -> public/udara/data/peluang.json (peluang/1)

Jujur soal sumber sebaran: CAMS hanya satu deret (tanpa ansambel), jadi satu-satunya ketidakpastian yang bisa diukur dari kode ini adalah
SENSITIVITAS ASUMSI ASAP di atribusi.py. Anggota = 729 varian (27 sebaran x 27 emisi; normalisasi ke model tidak dipakai karena CAMS adalah jangkar).
Tiap varian v: PM_v = r24 CAMS + (M_v - M_tengah) x (jam prakiraan hari itu / 24), dengan M = PM dari plume api+PLTU hasil atribusi.unit_kota/skala (kode sama).
Artinya: bagian dari CAMS yang bukan asap model tetap, bagian asap model digoyang menurut rentang asumsi atribusi.ASUMSI. Galat CAMS sendiri
TIDAK masuk (tak ada sumber koefisiennya), maka peluang adalah "bila CAMS benar menurut jalur dasarnya"; uji_balik METAR di bawah menunjukkan seberapa jauh CAMS benar.
Hari/kota yang model plume-nya > 1,5 x CAMS (terpercaya=false di atribusi) atau tanpa sumber dalam jangkauan dibuang, bukan ditulis 0 atau 100%.
P3: bila data/raw/udara/stasiun_arsip.json ada (WAQI), tiap stasiun <= 25 km dari kota terpercaya dengan bacaan <= 2 jam dari jam pertama prakiraan
menimbang varian lewat peluang.bobot_obs (sigma 0,35 ln) dengan CAMS mentah jam itu + selisih varian; bobot semua stasiun dikalikan. ESS < 30 -> bobot sama.
Pakai: python3 scripts/udara/peluang_udara.py   |   python3 scripts/udara/peluang_udara.py uji
"""
import datetime as dt
import importlib.util
import itertools
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat
import atribusi

_s = importlib.util.spec_from_file_location("peluang_umum", os.path.join(alat.AKAR, "scripts/umum/peluang.py"))
P = importlib.util.module_from_spec(_s)
_s.loader.exec_module(P)

ESS_MIN = 30
R_STASIUN = 25
SIGMA = 0.35
VARIAN = list(itertools.product(range(len(atribusi.DISP)), range(len(atribusi.EMIS))))   # (indeks DISP, indeks EMIS)
AMBANG = [{"k": "waspada", "label": "Waspada: di atas 55,4 µg/m³", "nilai": alat.BATAS[0]},
          {"k": "siaga", "label": "Siaga: di atas 150,4 µg/m³", "nilai": alat.BATAS[1]},
          {"k": "awas", "label": "Awas: di atas 250,4 µg/m³", "nilai": alat.BATAS[2]}]
KEJADIAN = ["PM2,5 rata-rata 24 jam di atas 55,4 µg/m³ (status Waspada)", "PM2,5 rata-rata 24 jam di atas 150,4 µg/m³ (status Siaga)",
            "PM2,5 rata-rata 24 jam di atas 250,4 µg/m³ (status Awas)"]


def pm_varian(unit, d, dasar, frac):
    """PM24 per varian (urutan VARIAN) dari dasar (r24 CAMS) + selisih asap model; tengah = (1,1,1)/(1,1,1)."""
    sk = [[atribusi.skala(s, e) for e in atribusi.EMIS] for s, _ in unit]
    u = [[pv[di][d] for _, pv in unit] for di in range(len(atribusi.DISP))]
    m = {(di, ei): sum(ui * sk[j][ei] for j, ui in enumerate(u[di])) for di, ei in VARIAN}
    mc = m[(atribusi.TD, atribusi.TE)]
    return [max(0.0, dasar + (m[v] - mc) * frac) for v in VARIAN], mc


def bobot_stasiun(kota, prak, A, src, t0, arsip):
    """-> (bobot per varian, ESS, n stasiun terpakai). Tanpa stasiun terpakai: bobot sama, ESS = jumlah varian."""
    n = len(VARIAN)
    w, pakai = [1.0 / n] * n, 0
    jam0 = alat.dari_iso(prak["jam"][0])
    pm = {k["kode"]: k for k in prak["kota"]}
    for uid, a in (arsip or {}).items():
        dekat = [(alat.jarak_km(a["lat"], a["lon"], k["lat"], k["lon"]), k) for k in kota]
        dk, k = min(dekat, key=lambda x: x[0])
        kp = pm.get(k["kode"])
        if dk > R_STASIUN or not kp:
            continue
        ob = [(alat.dari_iso(j), v) for j, v in a["obs"].items()]
        ob = [(t, v) for t, v in ob if 0 <= (t - jam0).total_seconds() <= 2 * 3600 and v is not None]
        i = None
        if ob:
            t, v = max(ob)
            i = round((t - jam0).total_seconds() / 3600)
        if i is None or kp["mentah"][i] is None:
            continue
        unit = atribusi.unit_kota(k, src, [[i]])
        if not unit:
            continue
        pred, mc = pm_varian(unit, 0, kp["mentah"][i], 1.0)
        # model > 1,5 x CAMS tidak dipercaya (sama dengan atribusi)
        if mc > atribusi.BATAS_PERCAYA * kp["mentah"][i]:
            continue
        wi, _ = P.bobot_obs(pred, v, SIGMA)
        w = [x * y for x, y in zip(w, wi)]
        s = sum(w)
        w = [x / s for x in w] if s > 0 else [1.0 / n] * n
        pakai += 1
    return w, round(1.0 / sum(x * x for x in w), 1), pakai


def vonis_udara(hs, i, tempat, n):
    """Vonis sendiri (peluang.vonis bersama tidak diubah): galat CAMS tidak ada di anggota, jadi 0% dan 100% selalu 'menurut CAMS'."""
    puncak = max((h for h in hs if h["p"][i] is not None), key=lambda h: h["p"][i], default=None)
    if puncak is None:
        return ""
    p = puncak["p"][i]
    if p == 0:
        return f"Dalam {n} hari ke depan, model CAMS tidak menunjukkan {KEJADIAN[i]} {tempat}."
    if p >= 0.995:
        return f"Dalam {n} hari ke depan, menurut CAMS {KEJADIAN[i]} {tempat} terjadi: pada {P.tanggal(puncak['t'])} hampir semua varian melewati batas."
    return P.vonis(hs, AMBANG, i, KEJADIAN[i], tempat, n_hari=n)


def bangun(kota, prak, A, src, t0, arsip=None):
    jam = [alat.dari_iso(j) for j in prak["jam"]]
    hari_jam = [[i for i, j in enumerate(jam) if alat.hari_wib(j) == d] for d in prak["hari"]]
    for s in src:
        cu = atribusi.cuaca_sumber(A, s["lon"], s["lat"], [(j - t0).total_seconds() / 3600 for j in jam], t0)
        s["cuaca_rot"] = [[None if w is None else (*atribusi.putar(w[0], w[1], r), w[2], w[3]) for w in cu] for r in atribusi.ROT_V]
    n = len(VARIAN)
    bobot, ess, pakai = bobot_stasiun(kota, prak, A, src, t0, arsip) if arsip else ([1.0 / n] * n, float(n), 0)
    dipakai = pakai > 0 and ess >= ESS_MIN
    w = bobot if dipakai else None
    pm = {k["kode"]: k for k in prak["kota"]}
    wil = {}
    for k in kota:
        kp = pm.get(k["kode"])
        if not kp:
            continue
        unit = atribusi.unit_kota(k, src, hari_jam)
        if not unit:
            continue
        hs = []
        for d, tgl in enumerate(prak["hari"]):
            idx = hari_jam[d]
            v = [kp["pm"][i] for i in idx if kp["pm"][i] is not None]
            if not v or kp["r24"][d] is None:
                continue
            xs, mc = pm_varian(unit, d, kp["r24"][d], len(idx) / 24)
            if mc > atribusi.BATAS_PERCAYA * (sum(v) / len(v)):
                continue
            hs.append(P.hari(tgl, [round(x) for x in xs], [a["nilai"] for a in AMBANG], w, 0))
        if not hs:
            continue
        i = max((j for j in (0, 1, 2) if any(h["p"][j] and h["p"][j] >= 0.10 for h in hs)), default=0)
        wil[k["kode"]] = {"nama": k["nama"], "tingkat": "kabupaten", "hari": hs, "vonis": vonis_udara(hs, i, "di " + k["nama"], len(prak["hari"]))}
    return wil, {"dipakai": dipakai, "ess": ess, "n_stasiun": pakai, "ess_min": ESS_MIN, "varian": n}


def main():
    t = alat.sekarang()
    prak, A = alat.keluaran("prakiraan.json"), alat.keluaran("angin.json")
    t0 = alat.dari_iso(prak["jam"][0])
    src = atribusi.sumber_list(alat.data("kluster.json"), alat.keluaran("pltu.json"), t, atribusi.lintasan.titik_konsesi())
    arsip = alat.muat(os.path.join(alat.RAW, "stasiun_arsip.json"), {})
    wil, bobot = bangun(alat.kota(), prak, A, src, t0, arsip)
    if not wil:
        raise RuntimeError("peluang_udara: tak ada kota terpercaya")
    mt = (prak.get("galat") or {}).get("metar")
    batasan = [
        "Anggota adalah 729 varian asumsi asap (sebaran x emisi) di atas satu prakiraan CAMS, bukan ansambel cuaca: peluang mengukur ketidakpastian asap model, tidak termasuk galat CAMS sendiri.",
        "Kota yang model asapnya melebihi 1,5 kali CAMS, atau tanpa api/PLTU dalam jangkauan 600 km, tidak ditulis. Hari ini hanya jam tersisa yang digoyang.",
        "Skor uji balik di bawah adalah analisis CAMS hari lampau terhadap METAR, bukan prakiraan 1 sampai 3 hari."
        + ((" CAMS meluputkan sekitar %d%% kejadian asap bandara, jadi 0%% berarti model CAMS tidak menunjukkan asap, bukan jaminan udara bersih." % round((1 - mt["hit"]) * 100)) if mt and mt.get("hit") is not None else ""),
        "Peluang tidak dijepit dengan angka hit dan alarm palsu METAR: kejadiannya (asap menurunkan jarak pandang bandara, 27 bandara, analisis) berbeda dari PM2,5 24 jam di kota, jadi memakainya sebagai koreksi akan mengarang kalibrasi.",
        ("Varian ditimbang dengan bacaan stasiun WAQI (ESS %s dari %d varian, %d stasiun)." % (str(bobot["ess"]).replace(".", ","), bobot["varian"], bobot["n_stasiun"])) if bobot["dipakai"]
        else "Varian berbobot sama: tidak ada bacaan stasiun yang cocok, atau ESS di bawah %d (stasiun %d terpakai, ESS %s)." % (ESS_MIN, bobot["n_stasiun"], str(bobot["ess"]).replace(".", ",")),
    ]
    uji = {"jenis": "analisis CAMS vs METAR (bukan peluang)", **{k: mt[k] for k in ("n", "satuan", "n_bandara", "hit", "far", "csi", "selang", "periode") if k in mt}} if mt else None
    d = P.berkas("udara", "CAMS lewat Open-Meteo, batas P.14/2020", len(VARIAN),
                 {"label": "PM2,5 rata-rata 24 jam", "satuan": "µg/m³", "desimal": 0}, AMBANG, wil, batasan, uji)
    d["bobot"] = bobot
    nb = alat.simpan("peluang.json", d)
    alat.log(f"peluang.json: {nb // 1024} KB, {len(wil)} kota; bobot {bobot}")


def uji():
    A = atribusi.lintasan.angin_uji(50, 0)
    A["blh"] = [[[800] * 47 for _ in range(18)] for _ in range(25)]
    t0 = alat.dari_iso("2026-10-18T03:00Z")
    jam = [alat.iso(t0 + dt.timedelta(hours=h)) for h in range(72)]
    hari = ["2026-10-18", "2026-10-19", "2026-10-20"]
    mk = lambda c: {"pm": [c] * 72, "mentah": [c] * 72, "r24": [c] * 3}
    prak = {"jam": jam, "hari": hari, "kota": [dict(kode="1671", **mk(50)), dict(kode="6271", **mk(20))]}
    kota = [{"kode": "1671", "nama": "Kota Palembang", "prov": "16", "lat": -3.0, "lon": 104.75},
            {"kode": "6271", "nama": "Kota Palangkaraya", "prov": "62", "lat": -2.2, "lon": 113.95}]
    src = [{"jenis": "api", "id": "K1", "nama": "Kompleks api OKI", "lon": 104.0, "lat": -3.0, "hs": 0.0, "basis": 400 * atribusi.DM_PER_MJ, "ef": atribusi.EF_GAMBUT, "konsesi": []},
           {"jenis": "api", "id": "K2", "nama": "api dekat Palangkaraya", "lon": 113.7, "lat": -2.2, "hs": 0.0, "basis": 20000 * atribusi.DM_PER_MJ, "ef": atribusi.EF_GAMBUT, "konsesi": []}]
    wil, b = bangun(kota, prak, A, src, t0)
    assert "6271" not in wil, "model > 1,5 x CAMS dibuang"
    w = wil["1671"]
    assert P.periksa(P.berkas("udara", "uji", 729, {"label": "x", "satuan": "x", "desimal": 0}, AMBANG, wil, ["uji"])) == []
    assert b["dipakai"] is False and b["ess"] == 729.0 and len(w["hari"]) == 3
    h = w["hari"][1]
    assert h["p10"] <= h["p50"] <= h["p90"] and h["p"][0] is not None, h
    assert h["p90"] > h["p10"], "varian asumsi harus menyebar"          # sebaran nyata, bukan satu angka
    # P3: stasiun membaca jauh di atas tengah -> varian bermodel besar menang; ESS turun
    n0 = 1 / len(VARIAN)
    tengah = h["p50"]
    arsip = {"s1": {"lat": -3.0, "lon": 104.76, "nama": "x", "obs": {prak["jam"][0]: tengah}}}
    w2, e2, n2 = bobot_stasiun(kota, prak, A, src, t0, arsip)
    assert n2 == 1 and abs(sum(w2) - 1) < 1e-9 and 1 <= e2 <= len(VARIAN)
    w3, e3, n3 = bobot_stasiun(kota, prak, A, src, t0, {})
    assert n3 == 0 and e3 == len(VARIAN) and w3[0] == n0
    h0 = [{"t": "2026-10-19", "p": [0, 0, 0]}]
    h1 = [{"t": "2026-10-19", "p": [1.0, 0, 0]}]
    assert "model CAMS tidak menunjukkan" in vonis_udara(h0, 0, "di X", 3) and "tidak muncul" not in vonis_udara(h0, 0, "di X", 3)
    assert "menurut CAMS" in vonis_udara(h1, 0, "di X", 3) and vonis_udara(h1, 0, "di X", 3).startswith("Dalam 3 hari")
    print("peluang_udara.py: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
