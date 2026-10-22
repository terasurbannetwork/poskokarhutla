"""Kalibrasi koefisien operasi dari isian lapangan (Fase 4.1-4.2 RANCANGAN-API-PADAM.md) -> public/data/kalibrasi.json

Menarik GET {PIPA_URL}/api/pipa/lapangan?sejak=<ms> (Bearer PIPA_TOKEN; kontrak docs/bnpb/RENCANA-LANJUT.md butir 1.4) lalu menghitung per kelas lahan
(gambut, mineral, campuran, tidak_tahu):
  bara_regu        ha/regu/hari  = padam_ha / (regu x hari antara mulai_padam dan padam_pada)       (hari 0,25 sampai 60)
  ha_bara_piksel   ha/piksel     = luas_lapangan_ha / (luas_satelit_ha / 14,0625)                    ASUMSI: luas_satelit_ha = luas garis luar piksel kompleks
                                                                                                      (tugas_api.luas_ha), jadi luas_satelit/14,0625 ~ jumlah piksel aktif
  kedalaman_bara   cm            = kedalaman_bara_cm (dibandingkan dengan rentang D_BAWAH..D_ATAS gambut_bara.py)
Tidak dikalibrasi (tak ada data di ekspor): air_bara (tak ada kolom air), garis_* (luas_garis_ha dalam ha, bukan km garis).

Aturan pakai: nilai satu kelas HANYA menimpa bawaan bila n >= N_MIN (10). Alasan: p10 dan p90 (lo/hi skenario) baru terpisah dari min/maks dengan n >= 10;
di bawah itu rentangnya cuma min-maks dari segelintir kejadian dan satu isian salah ketik menggeser median. Selang median = selang bebas-sebaran
dari statistik urutan (95%). Skenario: mid = median, lo/hi = p10/p90 (urutan dibalik untuk koefisien yang makin besar makin ringan, mis. bara_regu).
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
N_MIN = 10
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


def ringkas(xs):
    r = lambda v: round(v, 3)
    return {"n": len(xs), "mid": r(kuantil(xs, 0.5)), "p10": r(kuantil(xs, 0.1)), "p90": r(kuantil(xs, 0.9)), "ci": [r(v) for v in ci_median(xs)], "pakai": len(xs) >= N_MIN}


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


def hitung(tugas, bawaan=None):
    """tugas: daftar dict ekspor 1.4 -> dict kalibrasi (tanpa dibuat). bawaan: {nama: mid bawaan} untuk dibandingkan."""
    nilai = {"bara_regu": {}, "ha_bara_piksel": {}}
    dalam = {}
    waktu = []
    for t in tugas:
        if not isinstance(t, dict):
            continue
        kl = t.get("lahan") if t.get("lahan") in KELAS else "tidak_tahu"
        m, p = ms(t.get("mulai_padam")), ms(t.get("padam_pada"))
        pha, rg = angka(t.get("padam_ha")), angka(t.get("regu"))
        if m and p and p > m and pha and pha > 0 and rg and rg >= 1:
            hari = (p - m) / 86400000
            v = pha / (rg * hari)
            if 0.25 <= hari <= 60 and v <= 50:
                nilai["bara_regu"].setdefault(kl, []).append(v)
                waktu.append(p)
        lap, sat = angka(t.get("luas_lapangan_ha")), angka(t.get("luas_satelit_ha"))
        if lap and sat and lap > 0 and sat > 0:
            v = lap / (sat / PIKSEL_HA)
            if v <= 50:
                nilai["ha_bara_piksel"].setdefault(kl, []).append(v)
                if p:
                    waktu.append(p)
        kd = angka(t.get("kedalaman_bara_cm"))
        if kd is not None and 0 <= kd <= 300:
            dalam.setdefault(kl, []).append(kd)
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
            "dilewati": {"air_bara": "ekspor tidak membawa volume air", "garis_*": "luas_garis_ha dalam ha, bukan km garis per regu-hari",
                         "asumsi": "luas_satelit_ha = luas garis luar piksel kompleks; ha_bara_piksel = luas_lapangan_ha / (luas_satelit_ha / 14,0625)"}}


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
        if min(lo, mid, hi) <= 0:
            continue
        k = koef[nama]
        k["kalibrasi"] = {"n": v["n"], "dari": kal.get("dari"), "sampai": kal.get("sampai"), "kelas": "gambut", "bawaan": [k["lo"], k["mid"], k["hi"]]}
        k["lo"], k["mid"], k["hi"] = round(lo, 3), round(mid, 3), round(hi, 3)
        k["sumber"] += f" | KALIBRASI: berdasarkan {v['n']} insiden gambut ({kal.get('dari')} sampai {kal.get('sampai')}), median dan p10-p90 isian lapangan; bawaan {k['kalibrasi']['bawaan']}"
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
    gambut = lambda i: {"lahan": "gambut", "mulai_padam": 1000 * h, "padam_pada": (1000 + 2 + i % 3) * h, "regu": 2, "padam_ha": 2.0 + i * 0.2,
                        "luas_lapangan_ha": 10 + i, "luas_satelit_ha": 140.625, "kedalaman_bara_cm": 20 + 2 * i}
    tg = [gambut(i) for i in range(12)] + [{"lahan": "mineral", "mulai_padam": 1000 * h, "padam_pada": 1003 * h, "regu": 1, "padam_ha": 5}] * 3 + [{"lahan": "gambut"}, {"padam_ha": -1}, "x"]
    k = hitung(tg, {"bara_regu": 1.0})
    g = k["koef"]["bara_regu"]["gambut"]
    assert g["n"] == 12 and g["pakai"] and g["p10"] < g["mid"] < g["p90"] and g["ci"][0] <= g["mid"] <= g["ci"][1], g
    assert k["koef"]["bara_regu"]["mineral"]["n"] == 3 and not k["koef"]["bara_regu"]["mineral"]["pakai"], k["koef"]["bara_regu"]["mineral"]
    h_ = k["koef"]["ha_bara_piksel"]["gambut"]     # luas_lapangan 10..21 ha / 10 piksel
    assert h_["n"] == 12 and abs(h_["mid"] - 1.55) < 1e-9 and k["kedalaman_bara"]["gambut"]["n"] == 12, h_
    assert k["n"] == len(tg) and k["dari"] and k["sampai"] >= k["dari"] and k["rentang"]["bara_regu"]["gambut"] == [g["p10"], g["p90"]]
    # penerapan: urutan skenario terjaga, n < N_MIN tidak menimpa
    import operasi as OP
    kf = copy.deepcopy(OP.KOEF)
    asli = {n: (v["lo"], v["mid"], v["hi"]) for n, v in kf.items()}
    assert sorted(terapkan_koef(kf, k)) == ["bara_regu", "ha_bara_piksel"]
    assert kf["bara_regu"]["lo"] >= kf["bara_regu"]["mid"] >= kf["bara_regu"]["hi"] > 0 and kf["ha_bara_piksel"]["lo"] <= kf["ha_bara_piksel"]["mid"] <= kf["ha_bara_piksel"]["hi"]
    assert kf["bara_regu"]["kalibrasi"]["n"] == 12 and "berdasarkan 12 insiden" in kf["bara_regu"]["sumber"] and n_koef(kf, "bara_regu", "ha_bara_piksel") == 12
    assert all((v["lo"], v["mid"], v["hi"]) == asli[n] for n, v in kf.items() if n not in ("bara_regu", "ha_bara_piksel"))
    kf2 = copy.deepcopy(OP.KOEF)
    assert terapkan_koef(kf2, hitung(tg[:9])) == [] and kf2["bara_regu"]["mid"] == OP.KOEF["bara_regu"]["mid"] and n_koef(kf2, "bara_regu") is None   # n=9 < 10
    assert terapkan_koef(kf2, None) == [] and terapkan_koef(kf2, {"koef": {"bara_regu": {"gambut": {"n": 20}}}}) == []   # berkas rusak tidak menjatuhkan
    # muat: berkas hilang/rusak = None; tarik tanpa token = lewat
    with tempfile.TemporaryDirectory() as d:
        assert muat(os.path.join(d, "x.json")) is None
        open(os.path.join(d, "r.json"), "w").write("{rusak")
        assert muat(os.path.join(d, "r.json")) is None
        json.dump(k, open(os.path.join(d, "k.json"), "w"))
        assert muat(os.path.join(d, "k.json"))["n"] == len(tg)
    assert tarik("http://x", "", 0) is None
    assert ci_median(list(range(1, 11))) == [1, 10]
    print("kalibrasi uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
