"""Kalibrasi koefisien operasi dari isian lapangan (Fase 4.1-4.2 RANCANGAN-API-PADAM.md) -> public/data/kalibrasi.json

Menarik GET {PIPA_URL}/api/pipa/lapangan?sejak=<ms> (Bearer PIPA_TOKEN; kontrak docs/bnpb/RENCANA-LANJUT.md butir 1.4) lalu menghitung per kelas lahan
(gambut, mineral, campuran, tidak_tahu):
  bara_regu        ha/regu/hari  = padam_ha / (regu x hari antara mulai_padam dan padam_pada)       (hari 0,25 sampai 60; HANYA padam_verif = padam_terverifikasi)
  ha_bara_piksel   ha/piksel     = luas_lapangan_ha / (luas_satelit_ha / 14,0625)                    ASUMSI: luas_satelit_ha = luas garis luar piksel kompleks
                                                                                                      (tugas_api.luas_ha), jadi luas_satelit/14,0625 ~ jumlah piksel aktif
  kedalaman_bara   cm            = kedalaman_bara_cm (dibandingkan dengan rentang D_BAWAH..D_ATAS gambut_bara.py)
Tidak dikalibrasi (tak ada data di ekspor): air_bara (tak ada kolom air), garis_* (luas_garis_ha dalam ha, bukan km garis).

Penyaring sebelum statistik (urut): (1) batas masuk akal per koefisien (BATAS; di luar = ditolak, dihitung di dilewati.ditolak), (2) bara_regu hanya tugas terverifikasi
(selamat dari bias penyintas: tugas yang tak pernah diverifikasi cenderung gagal/ditinggal), (3) satu kabupaten (prov+kab) paling banyak KAB_MAKS (25%) isian per kelas,
(4) p10/p90 dihitung dari data yang di-winsorise ke p15/p85, jadi satu atau dua isian salah-tapi-masih-dalam-batas (n=20: sampai 10% data) tak bisa menggeser lo/hi di luar
rentang data bersih. Median memakai data mentah (kebal pencilan). Karena lo/hi dari ekor 10% dan ekor itu baru bermakna dari ~20 isian, N_MIN = 20 untuk SELURUH tripel
lo/mid/hi (median tidak dipakai sendirian dengan n lebih rendah: itu menaruh titik tengah dari data yang rentangnya masih bawaan, menyesatkan).
Selang median = selang bebas-sebaran dari statistik urutan (95%). Skenario: mid = median, lo/hi = p10/p90 (urutan dibalik untuk koefisien yang makin besar makin ringan, mis. bara_regu).
Hanya kelas "gambut" yang menimpa koefisien operasi (semua koefisien terkalibrasi adalah koefisien bara gambut); kelas lain hanya dilaporkan.

Berkas: public/data/kalibrasi.json {dibuat, dari, sampai, n, n_min, koef{nama{kelas{n,mid,p10,p90,ci,pakai,bawaan}}}, rentang, kedalaman_bara{kelas{...}}, dilewati}
Pakai:  python3 scripts/data/kalibrasi.py         # tarik + tulis (lewat dengan log bila PIPA_TOKEN kosong / 503 / jaringan putus)
        python3 scripts/data/kalibrasi.py uji     # self-check dengan fixture
operasi.py / taktik.py / gambut_bara.py memanggil muat() + terapkan_*() (kalibrasi.json tak ada = bawaan).
"""
import datetime as dt, json, math, os, sys, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR  # noqa: E402

DATA = os.environ.get("KALIBRASI_DATA") or os.path.join(AKAR, "public/data")
N_MIN = 20               # n SETELAH penyaring; lihat docstring
KAB_MAKS = 0.25          # porsi maks satu kabupaten per kelas
WINS = (0.15, 0.85)      # p10/p90 dihitung dari data yang dipangkas ke kuantil ini
TERVERIF = {"bara_regu"} # koefisien yang hanya memakai tugas padam_terverifikasi
# batas masuk akal (ha/regu/hari; ha lapangan per piksel VIIRS 14,06 ha, wajar < ~1,4 piksel penuh). Di luar = salah ketik/satuan, ditolak.
BATAS = {"bara_regu": (0.05, 10.0), "ha_bara_piksel": (0.05, 20.0)}
HARI_LAMA = 365          # jendela tarik
PIKSEL_HA = 14.0625
KELAS = ("gambut", "mineral", "campuran", "tidak_tahu")
DIBALIK = {"bara_regu"}  # makin besar = pekerjaan makin ringan: lo (optimis) = p90, hi (pesimis) = p10


def kuantil(xs, q):
    s = sorted(xs)
    i = (len(s) - 1) * q
    a, b = math.floor(i), math.ceil(i)
    return s[a] + (s[b] - s[a]) * (i - a)


def ci_median(xs):
    """selang 95% bebas-sebaran untuk median (statistik urutan): peringkat floor((n-1,96 akar n)/2) dan n-itu+1."""
    s, n = sorted(xs), len(xs)
    l = max(1, math.floor((n - 1.96 * math.sqrt(n)) / 2))
    return [s[l - 1], s[n - l]]


def wins(xs):
    a, b = kuantil(xs, WINS[0]), kuantil(xs, WINS[1])
    return [min(max(x, a), b) for x in xs]


def batasi_kab(pasang):
    """pasang: [(nilai, kunci_kab|None)] -> (nilai terpilih, jumlah dibuang). Satu kab paling banyak max(1, KAB_MAKS x total); sisanya (urutan masuk) dibuang. Tanpa kab = tak dibatasi."""
    cap, per, out = max(1, int(KAB_MAKS * len(pasang))), {}, []
    for v, k in pasang:
        if k is not None:
            per[k] = per.get(k, 0) + 1
            if per[k] > cap:
                continue
        out.append(v)
    return out, len(pasang) - len(out)


def ringkas(xs):
    r = lambda v: round(v, 3)
    w = wins(xs)
    return {"n": len(xs), "mid": r(kuantil(xs, 0.5)), "p10": r(kuantil(w, 0.1)), "p90": r(kuantil(w, 0.9)), "ci": [r(v) for v in ci_median(xs)], "pakai": len(xs) >= N_MIN}


def ms(v):
    """ms epoch, ISO, atau None."""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return int(v)
    if isinstance(v, str) and v:
        try:
            return int(dt.datetime.fromisoformat(v.replace("Z", "+00:00")).timestamp() * 1000)
        except ValueError:
            return None
    return None


def angka(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) else None


ASUMSI = ["luas_satelit_ha = luas garis luar piksel cluster; ha_bara_piksel = luas_lapangan_ha / (luas_satelit_ha / 14,0625)",
          "BIAS luas_satelit_ha: bila nilai ekspor = maks sepanjang umur tugas sedangkan luas_lapangan_ha = isian TERAKHIR, rasio condong rendah (ha_bara_piksel terlalu kecil)",
          "BIAS satuan: luas garis luar (poligon) bukan jumlah piksel; poligon cembung membesarkan penyebut sehingga ha_bara_piksel condong rendah di cluster yang renggang",
          "BIAS lahan: kelas lahan dari isian regu (lahan_teramati), bukan peta gambut; salah kelas mencampur bara gambut dengan mineral dan menurunkan bara_regu gambut",
          "BIAS regu: regu = isian TERAKHIR, bukan maks atau rata-rata sepanjang pemadaman; bila regu dikurangi menjelang akhir, bara_regu condong tinggi (optimis)",
          "BIAS penyintas: bara_regu hanya dari tugas padam_terverifikasi; kasus yang ditinggal/tak bisa dipadamkan tak ikut, jadi condong optimis",
          "p10/p90 = kuantil dari data yang di-winsorise ke p15/p85; n dihitung SETELAH penyaring batas, verifikasi, dan batas kabupaten"]


def hitung(tugas, bawaan=None):
    """tugas: daftar dict ekspor 1.4 -> dict kalibrasi (tanpa dibuat). bawaan: {nama: mid bawaan} untuk dibandingkan."""
    nilai = {"bara_regu": {}, "ha_bara_piksel": {}}
    dalam = {}
    ditolak = {"bara_regu": {"bukan_terverifikasi": 0, "di_luar_batas": 0, "kab_berlebih": 0}, "ha_bara_piksel": {"di_luar_batas": 0, "kab_berlebih": 0}}
    for t in tugas:
        if not isinstance(t, dict):
            continue
        kl = t.get("lahan") if t.get("lahan") in KELAS else "tidak_tahu"
        kab = (t.get("prov"), t.get("kab")) if t.get("kab") else None
        m, p = ms(t.get("mulai_padam")), ms(t.get("padam_pada"))
        pha, rg = angka(t.get("padam_ha")), angka(t.get("regu"))
        if m and p and p > m and pha and pha > 0 and rg and rg >= 1:
            hari = (p - m) / 86400000
            v = pha / (rg * hari)
            if not 0.25 <= hari <= 60:
                pass
            elif t.get("padam_verif") != "padam_terverifikasi":
                ditolak["bara_regu"]["bukan_terverifikasi"] += 1
            elif not BATAS["bara_regu"][0] <= v <= BATAS["bara_regu"][1]:
                ditolak["bara_regu"]["di_luar_batas"] += 1
            else:
                nilai["bara_regu"].setdefault(kl, []).append((v, kab))
        lap, sat = angka(t.get("luas_lapangan_ha")), angka(t.get("luas_satelit_ha"))
        if lap and sat and lap > 0 and sat > 0:
            v = lap / (sat / PIKSEL_HA)
            if BATAS["ha_bara_piksel"][0] <= v <= BATAS["ha_bara_piksel"][1]:
                nilai["ha_bara_piksel"].setdefault(kl, []).append((v, kab))
            else:
                ditolak["ha_bara_piksel"]["di_luar_batas"] += 1
        kd = angka(t.get("kedalaman_bara_cm"))
        if kd is not None and 0 <= kd <= 300:
            dalam.setdefault(kl, []).append(kd)
    for nama, per in nilai.items():
        for kl in per:
            per[kl], b = batasi_kab(per[kl])
            ditolak[nama]["kab_berlebih"] += b
    bawaan = bawaan or {}
    koef = {}
    for nama, per in nilai.items():
        koef[nama] = {kl: dict(ringkas(xs), bawaan=bawaan.get(nama)) for kl, xs in per.items()}
    t_ms = [x for x in (ms(t.get("padam_pada")) for t in tugas if isinstance(t, dict)) if x]
    f = lambda x: dt.datetime.fromtimestamp(x / 1000, dt.timezone.utc).strftime("%Y-%m-%d")
    return {"n": len(tugas), "n_min": N_MIN, "dari": f(min(t_ms)) if t_ms else None, "sampai": f(max(t_ms)) if t_ms else None,
            "koef": koef,
            "rentang": {nama: {kl: [v["p10"], v["p90"]] for kl, v in per.items()} for nama, per in koef.items()},
            "kedalaman_bara": {kl: dict(ringkas(xs), bawaan=bawaan.get("kedalaman_bara")) for kl, xs in dalam.items()},
            "dilewati": {"ditolak": ditolak, "air_bara": "ekspor tidak membawa volume air", "garis_*": "luas_garis_ha dalam ha, bukan km garis per regu-hari",
                         "asumsi": ASUMSI}}


# ---- dipakai operasi.py / taktik.py / gambut_bara.py ----
def muat(path=None):
    try:
        d = json.load(open(path or os.path.join(DATA, "kalibrasi.json")))
        return d if isinstance(d, dict) and isinstance(d.get("koef"), dict) else None
    except (OSError, ValueError):
        return None


def terapkan_koef(koef, kal):
    """Timpa lo/mid/hi koef (dict operasi.KOEF, diubah di tempat) untuk kelas gambut dengan n >= N_MIN. -> daftar nama yang ditimpa."""
    ada = []
    for nama, per in ((kal or {}).get("koef") or {}).items():
        v = (per or {}).get("gambut")
        if nama not in koef or not isinstance(v, dict) or not isinstance(v.get("n"), int) or v["n"] < N_MIN:
            continue
        try:
            lo, mid, hi = sorted((float(v["p10"]), float(v["mid"]), float(v["p90"])), reverse=nama in DIBALIK)
        except (KeyError, TypeError, ValueError):
            continue
        b = BATAS.get(nama)
        if min(lo, mid, hi) <= 0 or (b and not (b[0] <= min(lo, mid, hi) and max(lo, mid, hi) <= b[1])):
            continue
        k = koef[nama]
        k["kalibrasi"] = {"n": v["n"], "dari": kal.get("dari"), "sampai": kal.get("sampai"), "kelas": "gambut", "bawaan": [k["lo"], k["mid"], k["hi"]]}
        k["lo"], k["mid"], k["hi"] = round(lo, 3), round(mid, 3), round(hi, 3)
        k["sumber"] += f" | KALIBRASI: berdasarkan {v['n']} insiden{' terverifikasi' if nama in TERVERIF else ''} gambut ({kal.get('dari')} sampai {kal.get('sampai')}), median dan p10-p90 isian lapangan; bawaan {k['kalibrasi']['bawaan']}"
        ada.append(nama)
    return ada


def n_koef(koef, *nama):
    """n insiden terkecil di antara koefisien terkalibrasi yang disebut (None bila salah satunya belum terkalibrasi)."""
    ns = [(koef.get(x) or {}).get("kalibrasi", {}).get("n") for x in nama]
    return min(ns) if all(ns) else None


# ---- tarik ----
def tarik(url, token, sejak_ms):
    """-> daftar tugas atau None (dengan log)."""
    if not token:
        print("kalibrasi: PIPA_TOKEN kosong, dilewati")
        return None
    req = urllib.request.Request(f"{url.rstrip('/')}/api/pipa/lapangan?sejak={sejak_ms}", headers={"Authorization": "Bearer " + token, "User-Agent": "pantau-bencana-pipeline", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"kalibrasi: HTTP {e.code} dari {url}/api/pipa/lapangan, dilewati" + (" (503: token Worker belum dipasang atau migrasi belum diterapkan)" if e.code == 503 else ""))
        return None
    except (OSError, ValueError) as e:
        print(f"kalibrasi: gagal menarik ({e.__class__.__name__}), dilewati")
        return None
    t = d.get("tugas") if isinstance(d, dict) else d
    return t if isinstance(t, list) else None


def main():
    kini = dt.datetime.now(dt.timezone.utc)
    tugas = tarik(os.environ.get("PIPA_URL") or "https://centurisk97.id", os.environ.get("PIPA_TOKEN"), int((kini - dt.timedelta(days=HARI_LAMA)).timestamp() * 1000))
    if tugas is None:
        return
    import operasi as OP, gambut_bara as GB  # noqa: E402  (impor lambat: operasi mengimpor modul ini)
    kal = hitung(tugas, {"bara_regu": OP.KOEF["bara_regu"]["mid"], "ha_bara_piksel": OP.KOEF["ha_bara_piksel"]["mid"], "kedalaman_bara": [GB.D_BAWAH, GB.D_ATAS]})
    kal = {"dibuat": kini.strftime("%Y-%m-%dT%H:%MZ"), **kal}
    json.dump(kal, open(os.path.join(DATA, "kalibrasi.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    pakai = [f"{n}/{k} n={v['n']}" for n, per in kal["koef"].items() for k, v in per.items() if k == "gambut" and v["pakai"]]
    print(f"kalibrasi: {len(tugas)} tugas, dipakai (gambut, n>={N_MIN}): {pakai or 'tidak ada, bawaan dipertahankan'}")


def uji():
    import copy, tempfile
    h = 86400000
    V = "padam_terverifikasi"
    gambut = lambda i: {"lahan": "gambut", "prov": "P", "kab": "K%d" % (i % 8), "padam_verif": V, "mulai_padam": 1000 * h, "padam_pada": (1000 + 2 + i % 3) * h, "regu": 2, "padam_ha": 2.0 + i * 0.1,
                        "luas_lapangan_ha": 10 + i, "luas_satelit_ha": 140.625, "kedalaman_bara_cm": 20 + 2 * i}
    bersih = [gambut(i) for i in range(24)]
    tg = bersih + [{"lahan": "mineral", "padam_verif": V, "mulai_padam": 1000 * h, "padam_pada": 1003 * h, "regu": 1, "padam_ha": 5}] * 3 + [{"lahan": "gambut"}, {"padam_ha": -1}, "x"]
    k = hitung(tg, {"bara_regu": 1.0})
    g = k["koef"]["bara_regu"]["gambut"]
    assert g["n"] == 24 and g["pakai"] and g["p10"] < g["mid"] < g["p90"] and g["ci"][0] <= g["mid"] <= g["ci"][1], g
    assert k["koef"]["bara_regu"]["mineral"]["n"] == 3 and not k["koef"]["bara_regu"]["mineral"]["pakai"], k["koef"]["bara_regu"]["mineral"]
    h_ = k["koef"]["ha_bara_piksel"]["gambut"]     # luas_lapangan 10..33 ha / 10 piksel
    assert h_["n"] == 24 and abs(h_["mid"] - 2.15) < 1e-9 and k["kedalaman_bara"]["gambut"]["n"] == 24, h_
    assert k["n"] == len(tg) and k["dari"] and k["sampai"] >= k["dari"] and k["rentang"]["bara_regu"]["gambut"] == [g["p10"], g["p90"]]
    assert k["dilewati"]["ditolak"]["bara_regu"] == {"bukan_terverifikasi": 0, "di_luar_batas": 0, "kab_berlebih": 0} and any("penyintas" in a for a in k["dilewati"]["asumsi"])
    # 2a: 1 dan 2 isian salah (masih dalam batas, ekstrem) tidak menggeser lo/hi di luar rentang data bersih; di luar batas ditolak dan dihitung
    mak, mik = max(bersih_v := [x["padam_ha"] / (x["regu"] * ((x["padam_pada"] - x["mulai_padam"]) / h)) for x in bersih]), min(bersih_v)
    for salah in (1, 2):
        ts = [dict(x) for x in bersih]
        for j in range(salah):
            ts[j]["padam_ha"] = 19.5; ts[j]["kab"] = "Z%d" % j      # ~9,7 ha/regu/hari, lolos batas
        gg = hitung(ts)["koef"]["bara_regu"]["gambut"]
        assert gg["n"] == 24 and gg["p90"] <= max(mak, kuantil(bersih_v, 0.9) * 1.2) and gg["p10"] >= mik * 0.8 and gg["p90"] < 3 * g["p90"], (salah, gg, g)
    ts = [dict(x) for x in bersih]
    ts[0]["padam_ha"] = 400; ts[1]["padam_ha"] = 0.0001; ts[2]["luas_lapangan_ha"] = 9000; ts[3]["padam_verif"] = None
    kk = hitung(ts)
    dd = kk["dilewati"]["ditolak"]
    assert kk["koef"]["bara_regu"]["gambut"]["n"] == 21 and dd["bara_regu"]["di_luar_batas"] == 2 and dd["bara_regu"]["bukan_terverifikasi"] == 1 and dd["ha_bara_piksel"]["di_luar_batas"] == 1, dd
    assert kk["koef"]["bara_regu"]["gambut"]["p90"] <= BATAS["bara_regu"][1]
    # satu kabupaten tidak bisa mendominasi: 30 isian, 20 dari satu kab -> cap 7, n = 17 < N_MIN
    ts = [gambut(i) for i in range(30)]
    for x in ts[:20]:
        x["kab"] = "SATU"
    gk = hitung(ts)
    assert gk["koef"]["bara_regu"]["gambut"]["n"] == 17 and not gk["koef"]["bara_regu"]["gambut"]["pakai"] and gk["dilewati"]["ditolak"]["bara_regu"]["kab_berlebih"] == 13, gk["dilewati"]["ditolak"]
    assert batasi_kab([(1, None)] * 5) == ([1] * 5, 0)
    # penerapan: urutan skenario terjaga, n < N_MIN tidak menimpa
    import operasi as OP
    kf = copy.deepcopy(OP.KOEF)
    asli = {n: (v["lo"], v["mid"], v["hi"]) for n, v in kf.items()}
    assert sorted(terapkan_koef(kf, k)) == ["bara_regu", "ha_bara_piksel"]
    assert kf["bara_regu"]["lo"] >= kf["bara_regu"]["mid"] >= kf["bara_regu"]["hi"] > 0 and kf["ha_bara_piksel"]["lo"] <= kf["ha_bara_piksel"]["mid"] <= kf["ha_bara_piksel"]["hi"]
    assert kf["bara_regu"]["kalibrasi"]["n"] == 24 and "berdasarkan 24 insiden terverifikasi gambut" in kf["bara_regu"]["sumber"] and n_koef(kf, "bara_regu", "ha_bara_piksel") == 24
    assert all((v["lo"], v["mid"], v["hi"]) == asli[n] for n, v in kf.items() if n not in ("bara_regu", "ha_bara_piksel"))
    kf2 = copy.deepcopy(OP.KOEF)
    assert terapkan_koef(kf2, hitung(tg[:19])) == [] and kf2["bara_regu"]["mid"] == OP.KOEF["bara_regu"]["mid"] and n_koef(kf2, "bara_regu") is None   # n=19 < 20
    assert terapkan_koef(kf2, None) == [] and terapkan_koef(kf2, {"koef": {"bara_regu": {"gambut": {"n": 30}}}}) == []   # berkas rusak tidak menjatuhkan
    liar = {"koef": {"bara_regu": {"gambut": {"n": 30, "p10": 0.01, "mid": 1.0, "p90": 80}}}}   # berkas lama/diubah tangan di luar batas ditolak
    assert terapkan_koef(copy.deepcopy(OP.KOEF), liar) == []
    # muat: berkas hilang/rusak = None; tarik tanpa token = lewat
    with tempfile.TemporaryDirectory() as d:
        assert muat(os.path.join(d, "x.json")) is None
        open(os.path.join(d, "r.json"), "w").write("{rusak")
        assert muat(os.path.join(d, "r.json")) is None
        json.dump(k, open(os.path.join(d, "k.json"), "w"))
        assert muat(os.path.join(d, "k.json"))["n"] == len(tg)
    assert tarik("http://x", "", 0) is None
    assert ci_median(list(range(1, 11))) == [1, 10] and len(wins(list(range(20)))) == 20
    print("kalibrasi uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
