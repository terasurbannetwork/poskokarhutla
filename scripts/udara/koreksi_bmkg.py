"""KI-24: koreksi PM2,5 CAMS ke stasiun BMKG, diuji satu kali terhadap pembanding terkuat -> public/udara/data/koreksi_bmkg.json.

Urutan: `kunci` (ambil CAMS di titik stasiun, simpan tabel pasangan di data/raw/udara, tulis sidik berisi kode + kriteria + hash pasangan)
        lalu `jalankan` (cek sidik, buka-sekali, hitung, tulis hasil). Tanpa argumen = keduanya bila belum; sudah dibuka = tidak berbuat apa-apa.
Kriteria: koreksi_bmkg.kriteria.json. Waktu: bagian lama (latih 70% + validasi 30%) memilih faktor per stasiun vs nasional lewat MAE DAN
log-likelihood Gaussian; bagian baru dipakai sekali untuk uji. prakiraan.py hanya memakai faktor bila gerbang_udara.entri_koreksi boleh_tampil.
Pakai : python3 -I scripts/udara/koreksi_bmkg.py uji | kunci | jalankan
"""
import datetime as dt
import hashlib
import importlib.util
import json
import math
import os
import random
import sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat
import pm25_mos as m


def _muat(nama, *jalur):
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, *jalur))
    mod = importlib.util.module_from_spec(sp)
    sys.modules[nama] = mod
    sp.loader.exec_module(mod)
    return mod


SD = _muat("umum_sidik", "scripts", "umum", "sidik.py")
GU = _muat("gerbang_udara", "scripts", "udara", "gerbang_udara.py")

REL = "scripts/udara/koreksi_bmkg"
KODE = [REL + ".py", "scripts/udara/pm25_mos.py"]
KRITERIA = REL + ".kriteria.json"
SIDIK, BUKA, JEJAK = REL + ".sidik", REL + ".buka", REL + ".jejak.jsonl"
PASANGAN = os.path.join(alat.RAW, "koreksi_bmkg_pasangan.json")
HASIL = "koreksi_bmkg.json"
K_SUSUT, F_MIN, F_MAX = 48, 0.2, 3.0
BOOT, BENIH = 500, 3


def faktor(p):
    """p = [(obs, cams)] -> (f mentah, f disusutkan, n). Lewat nol, dijepit, disusutkan ke 1 (sama dengan prakiraan.faktor)."""
    p = [(o, c) for o, c in p if c > 0]
    if not p:
        return None, 1.0, 0
    f = min(F_MAX, max(F_MIN, sum(o * c for o, c in p) / sum(c * c for _, c in p)))
    return f, (len(p) * f + K_SUSUT) / (len(p) + K_SUSUT), len(p)


def ll_gauss(galat):
    """Log-likelihood Gaussian dengan sigma MLE dari galat itu sendiri (sama-sama untuk kedua kandidat, jadi adil)."""
    n = len(galat)
    v = max(sum(e * e for e in galat) / n, 1e-9)
    return -n / 2 * (math.log(2 * math.pi * v) + 1)


def pilih_wilayah(val, f_nas, f_st):
    """val = [(id, obs, cams)]; stasiun dipakai HANYA bila MAE DAN LL Gaussian validasi keduanya lebih baik daripada nasional (analog pembanding.pilih_wilayah)."""
    if not val:
        return {"pilih": "nasional", "n": 0, "alasan": "validasi kosong"}
    en = [f_nas * c - o for _, o, c in val]
    es = [f_st.get(i, 1.0) * c - o for i, o, c in val]
    mn, ms = sum(map(abs, en)) / len(en), sum(map(abs, es)) / len(es)
    ln, ls = ll_gauss(en), ll_gauss(es)
    ok = ms < mn and ls > ln
    return {"pilih": "stasiun" if ok else "nasional", "n": len(val), "mae_nasional": round(mn, 3), "mae_stasiun": round(ms, 3),
            "ll_nasional": round(ln, 1), "ll_stasiun": round(ls, 1),
            "alasan": "MAE dan LL stasiun lebih baik" if ok else f"stasiun tak lebih baik di keduanya (MAE {ms:.3f} vs {mn:.3f}, LL {ls:.1f} vs {ln:.1f})"}


def belah(jam, bagian):
    u = sorted(set(jam))
    return u[max(0, int(len(u) * bagian) - 1)]


def hitung(baris, obs_penuh, kr):
    """baris = [(jam, id, obs, cams)] -> hasil lengkap (tanpa tulis). obs_penuh = {id: {jam: obs}} untuk persistensi."""
    w = kr["pembagian_waktu"]
    t_lama = belah([r[0] for r in baris], w["lama"])
    lama, baru = [r for r in baris if r[0] <= t_lama], [r for r in baris if r[0] > t_lama]
    t_lat = belah([r[0] for r in lama], w["dalam_lama_latih"])
    lat, val = [r for r in lama if r[0] <= t_lat], [r for r in lama if r[0] > t_lat]

    def ajar(rs):
        per = {}
        for _, i, o, c in rs:
            per.setdefault(i, []).append((o, c))
        return faktor([(o, c) for _, _, o, c in rs])[1], {i: dict(zip(("f_mentah", "f", "n"), faktor(p))) for i, p in per.items()}

    fn, fs = ajar(lat)
    pil = pilih_wilayah([(i, o, c) for _, i, o, c in val], fn, {i: x["f"] for i, x in fs.items()})
    fn, fs = ajar(lama)   # refit pada seluruh bagian lama dengan skema terpilih
    f_st = {i: x["f"] for i, x in fs.items()}
    pred = (lambda r: f_st.get(r[1], 1.0) * r[3]) if pil["pilih"] == "stasiun" else (lambda r: fn * r[3])
    # klimatologi stasiun x jam-hari dari bagian lama
    kj, ks = {}, {}
    for j, i, o, _ in lama:
        kj.setdefault((i, j[11:13]), []).append(o)
        ks.setdefault(i, []).append(o)
    rata = lambda v: sum(v) / len(v)

    def klim(r):
        v = kj.get((r[1], r[0][11:13]))
        if v and len(v) >= 3:
            return rata(v)
        return rata(ks[r[1]]) if r[1] in ks else None

    def per24(r):
        return obs_penuh.get(r[1], {}).get((dt.datetime.strptime(r[0], "%Y-%m-%dT%H") - dt.timedelta(hours=24)).strftime("%Y-%m-%dT%H"))

    U = [r for r in baru if klim(r) is not None and per24(r) is not None]
    if len(U) < 50:
        return {"vonis": "BELUM CUKUP DATA", "alasan": f"baris uji lengkap {len(U)} < 50", "n_uji": len(U), "pilih": pil}
    ea = {"koreksi": lambda r: abs(pred(r) - r[2]), "cams_mentah": lambda r: abs(r[3] - r[2]),
          "persistensi_24j": lambda r: abs(per24(r) - r[2]), "klimatologi_stasiun": lambda r: abs(klim(r) - r[2])}
    mae = {k: round(sum(f(r) for r in U) / len(U), 3) for k, f in ea.items()}
    kuat = min((k for k in mae if k != "koreksi"), key=mae.get)
    lo, hi = m.bootstrap_selisih(U, ea["koreksi"], ea[kuat], n=BOOT, benih=BENIH)
    blok = {"mae_model": mae["koreksi"], "mae_mentah": mae["cams_mentah"], "mae_persistensi": mae["persistensi_24j"],
            "mae_klimatologi": mae["klimatologi_stasiun"], "n_uji": len(U), "selang": [lo, hi], "selang_vs": kuat}
    g = GU.entri_koreksi(blok, [])
    return {"vonis": "LOLOS" if g["boleh_tampil"] else "GAGAL", "boleh_tampil": g["boleh_tampil"], "alasan": g["alasan"], "pembanding_terkuat": kuat,
            **blok, "pilih": pil, "f_nasional": round(fn, 3),
            "split": {"lama_sampai": t_lama, "latih_sampai": t_lat, "n_latih": len(lat), "n_validasi": len(val), "n_lama": len(lama), "n_baru": len(baru)},
            "faktor_stasiun": [{"id": i, "f": round(x["f"], 3), "n": x["n"]} for i, x in sorted(fs.items())]}


# ---------- masukan ----------
def siapkan(kr=None):
    """Ambil CAMS di titik stasiun BMKG; simpan {id: {lat, lon, nama}, obs, baris} (tabel dibekukan oleh hash di sidik)."""
    arsip = json.load(open(os.path.join(alat.OUT, "omc_arsip.json"), encoding="utf-8"))
    obs = m.obs_bmkg(arsip)
    awal = min(min(o["h"]) for o in obs.values())
    lalu = min(92, (dt.datetime.now(dt.timezone.utc).replace(tzinfo=None) - dt.datetime.strptime(awal, "%Y-%m-%dT%H")).days + 2)
    ids = sorted(obs)
    cams = {}
    for a in range(0, len(ids), 15):
        b = ids[a:a + 15]
        d = m.coba(lambda: alat.ambil("https://air-quality-api.open-meteo.com/v1/air-quality?" + "&".join([
            "latitude=" + ",".join(f"{obs[i]['lat']:.3f}" for i in b), "longitude=" + ",".join(f"{obs[i]['lon']:.3f}" for i in b),
            f"hourly=pm2_5&past_days={lalu}&forecast_days=1&timezone=GMT&domains=cams_global"])))
        for i, x in zip(b, d if isinstance(d, list) else [d]):
            cams[i] = {w[:13]: v for w, v in zip(x["hourly"]["time"], x["hourly"]["pm2_5"]) if v is not None}
    baris = [[j, i, v, cams[i][j]] for i in ids for j, v in sorted(obs[i]["h"].items()) if j in cams[i]]
    return {"v": 1, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "obs": {i: obs[i]["h"] for i in ids},
            "titik": {i: [obs[i]["lat"], obs[i]["lon"]] for i in ids}, "baris": baris}


def hash_pasangan(d):
    return hashlib.sha256(json.dumps(d["baris"], separators=(",", ":")).encode()).hexdigest()


def _di_akar(f):
    asal = os.getcwd()
    os.chdir(AKAR)
    try:
        return f()
    finally:
        os.chdir(asal)


def kunci():
    d = siapkan()
    alat.simpan(PASANGAN, d)
    s = _di_akar(lambda: SD.tulis(SIDIK, KODE, KRITERIA, [hash_pasangan(d), f"n={len(d['baris'])}"]))
    alat.log(f"koreksi_bmkg: sidik {s['sidik']} dikunci, {len(d['baris'])} pasangan jam")


def jalankan():
    d = json.load(open(PASANGAN, encoding="utf-8"))
    kr = json.load(open(os.path.join(AKAR, KRITERIA), encoding="utf-8"))
    s = _di_akar(lambda: SD.cek(SIDIK))
    if s["masukan"][0] != hash_pasangan(d):
        raise RuntimeError("tabel pasangan berubah sesudah dikunci: sidik tak berlaku")
    hasil = hitung([tuple(r) for r in d["baris"]], d["obs"], kr)
    _di_akar(lambda: SD.buka(BUKA, JEJAK, s["sidik"], {k: hasil.get(k) for k in ("vonis", "mae_model", "mae_mentah", "mae_persistensi", "mae_klimatologi", "n_uji")}))
    hasil.update(v=1, dibuat=dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), sidik=s["sidik"], n_stasiun=len(d["obs"]),
                 sumber="stasiun PM2,5 BMKG (omc_arsip.json) vs CAMS Open-Meteo, per jam")
    alat.simpan(HASIL, hasil)
    alat.log(f"koreksi_bmkg: {hasil['vonis']} | {hasil['alasan']}")


def main():
    if os.path.exists(os.path.join(AKAR, BUKA)):
        return   # sudah dibuka sekali: hasil beku di koreksi_bmkg.json
    if not os.path.exists(os.path.join(AKAR, SIDIK)):
        kunci()
    jalankan()


def uji():
    kr = json.load(open(os.path.join(AKAR, KRITERIA), encoding="utf-8"))
    rng = random.Random(5)
    base = dt.datetime(2026, 10, 1)
    # CAMS dua kali lipat terlalu tinggi, obs mengikuti hari-ke-hari secara acak (persistensi tak membantu), dua stasiun faktor sama
    baris, obs = [], {}
    for d in range(20):
        a = 10 + 30 * rng.random()
        for h in range(24):
            j = (base + dt.timedelta(days=d, hours=h)).strftime("%Y-%m-%dT%H")
            for i in "ab":
                o = a + rng.gauss(0, 1)
                obs.setdefault(i, {})[j] = o
                baris.append((j, i, o, 2 * o + rng.gauss(0, 1)))
    r = hitung(baris, obs, kr)
    assert r["pembanding_terkuat"] != "cams_mentah" and abs(r["f_nasional"] - 0.5) < .05, r
    assert r["mae_model"] < r["mae_mentah"] / 3 and r["vonis"] in ("LOLOS", "GAGAL"), r
    # CAMS sudah persis: koreksi seri dengan CAMS mentah -> GAGAL
    ok = [(j, i, o, o) for j, i, o, _ in baris]
    assert hitung(ok, obs, kr)["vonis"] == "GAGAL"
    # data terlalu sedikit -> bukan LOLOS
    assert hitung(baris[:60], obs, kr)["vonis"] == "BELUM CUKUP DATA"
    # pilih_wilayah: stasiun dipakai hanya bila MAE dan LL lebih baik
    v = [("a", 10.0, 20.0), ("b", 30.0, 30.0)] * 30
    assert pilih_wilayah(v, 0.75, {"a": 0.5, "b": 1.0})["pilih"] == "stasiun"
    assert pilih_wilayah(v, 0.75, {})["pilih"] == "nasional" and pilih_wilayah([], 1, {})["pilih"] == "nasional"
    assert faktor([]) == (None, 1.0, 0) and abs(faktor([(20, 10)] * 48)[1] - 1.5) < 1e-9
    json.dumps(r, allow_nan=False)
    print("koreksi_bmkg uji: lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["kunci"]:
        kunci()
    elif a == ["jalankan"]:
        jalankan()
    else:
        main()
