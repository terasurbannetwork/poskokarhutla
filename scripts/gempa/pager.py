"""Perkiraan korban jiwa model empiris USGS PAGER (koefisien resmi Indonesia), BERDAMPINGAN dengan model dampak lain; tidak mengganti apa pun.

jiwa = sum_MMI penduduk(MMI) * Phi(ln(MMI / THETA) / BETA), MMI dibulatkan ke 4..10 (di bawah 3,5 tidak dihitung).
Koefisien: usgs/pager fatality.xml v2.2, ccode ID (Jaiswal & Wald 2010). Pita kali/bagi 4. Kelas siaga PAGER: hijau <1, kuning 1-99, oranye 100-999, merah >=1000.
Tidak menghitung korban tsunami atau likuefaksi (Palu 2018: PAGER 86 lawan nyata 4.140; Mentawai 2010: 5 lawan 530).
Paparan penduduk memakai guncangan.py (GMPE+GMICE repo) dan penduduk.json WorldPop. Kembaran peramban: public/gempa/pager.js (uji_js_pager.py).
Rumah rusak TIDAK dipasang (belum terkalibrasi).

Arsip prospektif append-only: public/gempa/data/prospektif_pager.json, satu butir per gempa USGS M>=5 saat pertama terlihat; tidak pernah diubah sesudahnya.
Pakai:  python3 scripts/gempa/pager.py catat [hari=3]   tambah gempa M>=5 baru ke arsip
        python3 scripts/gempa/pager.py uji             self-check
"""
import datetime as dt, importlib.util, json, math, os, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(DIR, "../.."))
ARSIP = os.path.join(AKAR, "public/gempa/data/prospektif_pager.json")
THETA, BETA = 13.248768, 0.150846
PITA = 4
KELAS = ((1000, "merah"), (100, "oranye"), (1, "kuning"), (0, "hijau"))
SUMBER = "USGS PAGER, koefisien fatality.xml v2.2 ccode ID (Jaiswal & Wald 2010)"


def phi(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def kelas(jiwa):
    return next(n for b, n in KELAS if jiwa >= b)


def jiwa(per):
    """per = {MMI: penduduk} (kunci MMI bilangan bulat atau string, 1..12). Kembali dict jiwa/bawah/atas/kelas."""
    j = 0.0
    for k, p in per.items():
        k = min(10, int(k))
        if k >= 4 and p > 0:
            j += p * phi(math.log(k / THETA) / BETA)
    return {"jiwa": j, "bawah": j / PITA, "atas": j * PITA, "kelas": kelas(j)}


def per_mmi(nilai_mmi, penduduk):
    """nilai_mmi {kunci_kec: MMI}, penduduk {kunci_kec: jiwa} -> {MMI bulat: penduduk}, pembulatan setengah ke atas (sama dengan Math.round)."""
    per = {}
    for k, v in nilai_mmi.items():
        p = penduduk.get(k)
        if p and v >= 3.5:
            b = min(10, int(v + 0.5))
            per[b] = per.get(b, 0) + p
    return per


def _g():
    s = importlib.util.spec_from_file_location("guncangan_pager", os.path.join(DIR, "guncangan.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def hitung_gempa(gm, pusat, pend):
    """gm = {lat, lon, m, dalam[, jenis]} -> keluaran jiwa() + paparan per MMI."""
    g = _g()
    h = g.mmi_kecamatan(gm, pusat)
    per = per_mmi({k: v["mmi"] for k, v in h.items()}, pend)
    r = jiwa(per)
    r["per_mmi"] = {str(k): per[k] for k in sorted(per)}
    return r


def periksa_arsip(lama, baru):
    """lama/baru = daftar butir. Tiap butir lama wajib ada utuh di posisi yang sama (pola scripts/prediksi/dasar.py). -> pesan galat atau None."""
    if len(baru) < len(lama):
        return f"arsip menyusut {len(lama)} -> {len(baru)} butir"
    for i, (a, b) in enumerate(zip(lama, baru)):
        if a != b:
            return f"butir {i + 1} berubah"
    return None


def butir_head():
    """butir arsip di git HEAD, [] bila belum dilacak."""
    try:
        r = subprocess.run(["git", "show", "HEAD:" + os.path.relpath(ARSIP, AKAR)], cwd=AKAR, capture_output=True, text=True)
        return json.loads(r.stdout)["butir"] if r.returncode == 0 else []
    except (OSError, ValueError, KeyError):
        return []


def catat(hari=3, head=butir_head):
    """Tambah di ujung saja. Menolak (keluar 3) bila arsip lokal lebih pendek atau berbeda dari git HEAD."""
    sys.path.insert(0, DIR)
    from umum import ambil, usgs_url  # noqa: E402
    from laporan_gempa import Wil  # noqa: E402
    wil = Wil()
    kini = dt.datetime.now(dt.timezone.utc)
    f = ambil(usgs_url("query", (kini - dt.timedelta(days=hari)).strftime("%Y-%m-%d"), kini.strftime("%Y-%m-%dT%H:%M:%S"), 5.0, format="geojson"))["features"]
    arsip = json.load(open(ARSIP)) if os.path.exists(ARSIP) else {"sumber": SUMBER, "catatan": "Append-only: perkiraan dicatat sekali saat gempa M>=5 pertama terlihat, tidak diubah. Dinilai lawan korban nyata (EM-DAT/BNPB) kemudian.", "butir": []}
    galat = periksa_arsip(head(), arsip["butir"])
    if galat:
        sys.exit(f"pager arsip DITOLAK, tidak append-only: {galat}")
    n_lama = len(arsip["butir"])
    ada = {b["id"] for b in arsip["butir"]}
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    pend = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["kec"]
    baru = 0
    for x in f:
        p = x["properties"]
        if x["id"] in ada or p.get("type") != "earthquake" or p.get("mag") is None or p["mag"] < 5:
            continue
        lon, lat, dalam = x["geometry"]["coordinates"][:3]
        if not wil.letak(lat, lon, p.get("place") or ""):
            continue  # bukan Indonesia
        gm = {"lat": lat, "lon": lon, "m": p["mag"], "dalam": max(dalam or 10, 1.0)}
        r = hitung_gempa(gm, pusat, pend)
        arsip["butir"].append({"id": x["id"], "waktu_utc": dt.datetime.fromtimestamp(p["time"] / 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M"),
                               "lat": lat, "lon": lon, "dalam_km": gm["dalam"], "m": p["mag"],
                               "dicatat": kini.strftime("%Y-%m-%dT%H:%MZ"),
                               "pager_resmi": {"jiwa": round(r["jiwa"], 2), "bawah": round(r["bawah"], 2), "atas": round(r["atas"], 2), "kelas": r["kelas"], "per_mmi": r["per_mmi"]}})
        baru += 1
    assert periksa_arsip(arsip["butir"][:n_lama], arsip["butir"]) is None
    os.makedirs(os.path.dirname(ARSIP), exist_ok=True)
    with open(ARSIP + ".tmp", "w") as fh:
        json.dump(arsip, fh, ensure_ascii=False, separators=(",", ":"))
    os.replace(ARSIP + ".tmp", ARSIP)
    print("pager arsip:", baru, "baru,", len(arsip["butir"]), "total")


def uji():
    # paparan sintetis: 1 juta jiwa di MMI VIII. Phi(ln(8/13,248768)/0,150846) = Phi(-3,3453) = 4,126e-4
    r = jiwa({8: 1_000_000})
    assert abs(r["jiwa"] - 412.6) < 0.5 and r["kelas"] == "oranye" and r["bawah"] == r["jiwa"] / 4 and r["atas"] == r["jiwa"] * 4, r
    # MMI >= 10 dijepit ke 10, di bawah 4 tidak dihitung, kunci string diterima
    assert jiwa({12: 100})["jiwa"] == jiwa({"10": 100})["jiwa"] and jiwa({3: 10**9})["jiwa"] == 0 and jiwa({})["kelas"] == "hijau"
    # batas kelas
    assert [kelas(x) for x in (0.99, 1, 99.9, 100, 999.9, 1000)] == ["hijau", "kuning", "kuning", "oranye", "oranye", "merah"]
    # per_mmi: 3,49 dibuang, 3,5 -> 4, 4,5 -> 5, 10,7 -> 10; penduduk kosong dilewati
    assert per_mmi({"a": 3.49, "b": 3.5, "c": 4.5, "d": 10.7, "e": 6}, {"a": 1, "b": 2, "c": 4, "d": 8}) == {4: 2, 5: 4, 10: 8}
    # Cianjur 2022 (M5,6, USGS us7000ir9t): paparan lab per MMI 4..10 dari GMPE repo -> ~158 jiwa
    band = [46951347, 5526880, 2235105, 1436440, 342271, 0, 0]
    c = jiwa(dict(zip(range(4, 11), band)))
    assert abs(c["jiwa"] - 158.2) < 0.5 and c["kelas"] == "oranye", c
    # append-only: butir lama tidak boleh menyusut atau berubah
    a, b = {"id": "x"}, {"id": "y"}
    assert periksa_arsip([a], [a, b]) is None and "menyusut" in periksa_arsip([a, b], [a]) and "berubah" in periksa_arsip([a], [b])
    # sambungan ke guncangan.py bila data repo ada
    pusat = os.path.join(AKAR, "public/banjir/data/pusat_kec.json")
    if os.path.exists(pusat):
        p = json.load(open(pusat))
        pend = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["kec"]
        h = hitung_gempa({"lat": -6.836, "lon": 106.9968, "m": 5.6, "dalam": 10.0}, p, pend)
        assert 80 < h["jiwa"] < 320, h["jiwa"]
        print("Cianjur dari data repo:", round(h["jiwa"]), h["kelas"])
    print("pager uji OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a[:1] in ([], ["uji"]) else catat(int(a[1]) if len(a) > 1 else 3)
