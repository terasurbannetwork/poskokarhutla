"""Indeks gaya pasang astronomis harian (P8) -> public/banjir/data/pasang_astro.json

BUKAN tinggi muka air dan BUKAN prakiraan rob: ini hanya seberapa kuat gaya pembangkit pasang Bulan+Matahari
pada hari itu, dari astronomi murni (tanpa data laut, tanpa kuota, stdlib). Rob nyata masih butuh respons laut
lokal, tekanan udara, angin, gelombang, dan penurunan tanah; itu tetap tugas rob.py.

Rumus (semua publik):
- Posisi Bulan: deret pendek Astronomical Almanac ("low precision", sekitar 0,3 derajat; jarak sekitar 0,3%), Matahari
  rumus standar presisi rendah (Meeus, Astronomical Algorithms bab 25). Waktu UT dianggap TT (selisih ~69 dtk, diabaikan).
- Gaya pembangkit pasang berbanding (1/jarak)^3. Rasio Matahari/Bulan pada jarak rata-rata 0,46 (Pugh 1987, Tides, Surges
  and Mean Sea-Level).
- Suku semi-diurnal ~ cos^2(deklinasi), suku diurnal ~ sin(2 x deklinasi). Bulan dan Matahari dijumlah sebagai vektor fase:
  selisih fase = selisih asensio rekta, jadi pasang purnama/perbani (spring-neap) muncul dengan sendirinya.
- Indeks tiap suku dinormalkan ke maksimumnya sepanjang 2005-2035 (1 = gaya terkuat dalam 31 tahun).
- Faktor nodal f(K1), f(O1), f(M2): rumus Schureman (1958) dari inklinasi orbit Bulan terhadap ekuator I
  (siklus node 18,6 tahun; puncak K1/O1 ~2006 dan ~2025, terendah ~2015-2016). Ini keluaran terpisah untuk konteks:
  efek yang sama sudah ada di deklinasi Bulan yang dipakai indeks, jadi tidak dikalikan dua kali.

Campuran diurnal/semi-diurnal: respons laut bukan gaya ekuilibrium. Repo ini TIDAK punya konstanta harmonik per titik
(rob.py memakai model Open-Meteo, bukan stasiun), jadi bobot memakai ASUMSI: pantura Jawa 80% diurnal / 20% semi-diurnal
(Laut Jawa dikenal dominan diurnal-campuran: Wyrtki 1961, Physical Oceanography of the Southeast Asian Waters; angka 80/20 dari
rencana pemilik, bukan hasil pengukuran), titik lain 50/50 netral (tanpa data; Selat Malaka cenderung semi-diurnal). Bila
konstanta harmonik stasiun didapat (BIG/IOC), isi PROFIL dan jalankan ulang.

Pakai:  python3 scripts/banjir/pasang_astro.py      |  python3 scripts/banjir/pasang_astro.py uji
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, WIB, baca, simpan
from wilayah import AKAR

RAD = math.pi / 180
RASIO_MATAHARI = 0.46
JARAK_BULAN_RATA = 384400.0  # km
HARI_KE_DEPAN = 365
AMBANG_JENDELA = 0.85        # kuantil seri 12 bulan: hari di atas ini = jendela pasang tinggi
PROFIL = {
    "pantura": {"diurnal": 0.8, "semi": 0.2, "label": "Pantura Jawa (Banten-Jatim, DKI)",
                "sumber": "ASUMSI 80/20 (rencana pemilik); arah umum diurnal-campuran: Wyrtki 1961. Belum diukur per stasiun."},
    "lain": {"diurnal": 0.5, "semi": 0.5, "label": "Titik rob lain",
             "sumber": "ASUMSI netral 50/50: tidak ada konstanta harmonik di repo."},
}
KP_PANTURA = {"31", "32", "33", "35", "36"}


def jd(t):
    """JD dari datetime UTC."""
    return 2451545.0 + (t - dt.datetime(2000, 1, 1, 12, tzinfo=dt.timezone.utc)).total_seconds() / 86400


def _ekliptik_ke_ekuator(lam, bet, eps):
    x = math.cos(bet) * math.cos(lam)
    y = math.cos(bet) * math.sin(lam) * math.cos(eps) - math.sin(bet) * math.sin(eps)
    z = math.cos(bet) * math.sin(lam) * math.sin(eps) + math.sin(bet) * math.cos(eps)
    return math.atan2(y, x), math.asin(max(-1, min(1, z)))


def posisi(t):
    """-> dict bulan/matahari: ra (rad), dek (rad), jarak (bulan km, matahari AU)."""
    T = (jd(t) - 2451545.0) / 36525
    eps = (23.4393 - 0.0130042 * T) * RAD
    s = lambda a: math.sin(a * RAD)
    c = lambda a: math.cos(a * RAD)
    lam = 218.32 + 481267.881 * T + 6.29 * s(135.0 + 477198.87 * T) - 1.27 * s(259.3 - 413335.36 * T) \
        + 0.66 * s(235.7 + 890534.22 * T) + 0.21 * s(269.9 + 954397.74 * T) - 0.19 * s(357.5 + 35999.05 * T) \
        - 0.11 * s(186.5 + 966404.03 * T)
    bet = 5.13 * s(93.3 + 483202.02 * T) + 0.28 * s(228.2 + 960400.89 * T) - 0.28 * s(318.3 + 6003.15 * T) \
        - 0.17 * s(217.6 - 407332.21 * T)
    par = 0.9508 + 0.0518 * c(135.0 + 477198.87 * T) + 0.0095 * c(259.3 - 413335.36 * T) \
        + 0.0078 * c(235.7 + 890534.22 * T) + 0.0028 * c(269.9 + 954397.74 * T)
    ra_b, de_b = _ekliptik_ke_ekuator(lam * RAD, bet * RAD, eps)
    M = (357.5291 + 35999.0503 * T) * RAD
    L = 280.460 + 36000.771 * T
    lam_s = (L + 1.9148 * math.sin(M) + 0.0200 * math.sin(2 * M)) * RAD
    R = 1.00014 - 0.01671 * math.cos(M) - 0.00014 * math.cos(2 * M)
    ra_s, de_s = _ekliptik_ke_ekuator(lam_s, 0.0, eps)
    return {"ra_b": ra_b, "de_b": de_b, "r_b": 6378.14 / math.sin(par * RAD), "ra_s": ra_s, "de_s": de_s, "r_s": R}


def gaya(t):
    """(diurnal, semi-diurnal) mentah: besar vektor fase Bulan+Matahari, satuan relatif (Bulan di jarak rata-rata = 1)."""
    p = posisi(t)
    lb = (JARAK_BULAN_RATA / p["r_b"]) ** 3
    ls = RASIO_MATAHARI / p["r_s"] ** 3
    d_ra = p["ra_s"] - p["ra_b"]
    sb, ss = lb * math.cos(p["de_b"]) ** 2, ls * math.cos(p["de_s"]) ** 2
    semi = math.sqrt(max(0.0, sb * sb + ss * ss + 2 * sb * ss * math.cos(2 * d_ra)))
    db, ds = lb * math.sin(2 * p["de_b"]), ls * math.sin(2 * p["de_s"])
    diur = math.sqrt(max(0.0, db * db + ds * ds + 2 * db * ds * math.cos(d_ra)))
    return diur, semi


def nodal(t):
    """Faktor nodal (Schureman 1958): dict f_k1, f_o1, f_m2, dan I (derajat)."""
    T = (jd(t) - 2451545.0) / 36525
    N = (125.04452 - 1934.136261 * T) * RAD
    om, i = 23.4393 * RAD, 5.145 * RAD
    cI = math.cos(om) * math.cos(i) - math.sin(om) * math.sin(i) * math.cos(N)
    I = math.acos(cI)
    nu = math.asin(max(-1, min(1, math.sin(i) * math.sin(N) / math.sin(I))))
    f_o1 = math.sin(I) * math.cos(I / 2) ** 2 / 0.3800
    f_k1 = math.sqrt(0.8965 * math.sin(2 * I) ** 2 + 0.6001 * math.sin(2 * I) * math.cos(nu) + 0.1006)
    f_m2 = math.cos(I / 2) ** 4 / 0.9154
    return {"f_k1": f_k1, "f_o1": f_o1, "f_m2": f_m2, "I": I / RAD}


def skala():
    """Maksimum gaya diurnal & semi-diurnal 2005-2035 (sampel 6 jam, cukup rapat untuk puncak yang landai)."""
    mx = [0.0, 0.0]
    t = dt.datetime(2005, 1, 1, tzinfo=dt.timezone.utc)
    while t.year < 2036:
        d, s = gaya(t)
        mx = [max(mx[0], d), max(mx[1], s)]
        t += dt.timedelta(hours=6)
    return mx


def jendela(tgl, g, ambang):
    """Kelompok hari berurutan (celah <= 1 hari dilebur) dengan g >= ambang -> [{awal, akhir, puncak, nilai}]."""
    idx = [i for i, v in enumerate(g) if v >= ambang]
    out, mulai = [], None
    for k, i in enumerate(idx):
        if mulai is None:
            mulai = prev = i
        elif i - prev <= 2:
            prev = i
        else:
            out.append((mulai, prev)); mulai = prev = i
        if k == len(idx) - 1:
            out.append((mulai, prev))
    res = []
    for a, b in out:
        j = max(range(a, b + 1), key=lambda x: g[x])
        res.append({"awal": tgl[a], "akhir": tgl[b], "puncak": tgl[j], "nilai": round(g[j], 3)})
    return res


def perigee(t0, hari):
    """Perigee Bulan di [t0, t0+hari): minimum jarak per jam + interpolasi parabola. -> [(datetime UTC, km)]"""
    n = hari * 24
    r = [posisi(t0 + dt.timedelta(hours=h))["r_b"] for h in range(n + 1)]
    out = []
    for h in range(1, n):
        if r[h] < r[h - 1] and r[h] <= r[h + 1]:
            a, b, c = r[h - 1], r[h], r[h + 1]
            off = 0.5 * (a - c) / (a - 2 * b + c) if a - 2 * b + c else 0
            out.append((t0 + dt.timedelta(hours=h + off), b - 0.25 * (a - c) * off))
    return out


def hitung(awal):
    """awal: date. -> isi berkas."""
    mx = skala()
    t0 = dt.datetime(awal.year, awal.month, awal.day, 6, tzinfo=dt.timezone.utc)  # 13.00 WIB; envelope berubah lambat
    tgl, D, S = [], [], []
    for k in range(HARI_KE_DEPAN):
        t = t0 + dt.timedelta(days=k)
        d, s = gaya(t)
        tgl.append((awal + dt.timedelta(days=k)).isoformat())
        D.append(round(d / mx[0], 3)); S.append(round(s / mx[1], 3))
    seri, win = {}, {}
    for nama, p in PROFIL.items():
        g = [p["diurnal"] * d + p["semi"] * s for d, s in zip(D, S)]
        seri[nama] = [round(v, 3) for v in g]
        amb = sorted(g)[int(AMBANG_JENDELA * (len(g) - 1))]
        w = jendela(tgl, g, amb)
        win[nama] = {"ambang": round(amb, 3), "jendela": w, "tertinggi": sorted(w, key=lambda x: -x["nilai"])[:6]}
    nod = {"bulan": [], "f_k1": [], "f_o1": [], "f_m2": []}
    for y in range(2005, 2036):
        for m in range(1, 13):
            f = nodal(dt.datetime(y, m, 15, tzinfo=dt.timezone.utc))
            nod["bulan"].append(f"{y}-{m:02d}")
            for k in ("f_k1", "f_o1", "f_m2"):
                nod[k].append(round(f[k], 3))
    ik = max(range(len(nod["f_k1"])), key=lambda i: (nod["f_k1"][i] if nod["bulan"][i] >= f"{awal.year - 3}" else 0))
    titik = {n: [] for n in PROFIL}
    for t in baca(os.path.join(AKAR, "data/raw/banjir/rob/titik.json"), []):
        titik["pantura" if t["kp"] in KP_PANTURA else "lain"].append(f"{t['prov']}|{t['kab']}")
    return {
        "versi": "pasang_astro/1", "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
        "jenis": "indeks gaya pasang astronomis (0-1), BUKAN tinggi muka air dan BUKAN prakiraan rob",
        "mulai": tgl[0], "hari": HARI_KE_DEPAN,
        "sumber": "Astronomical Almanac (Bulan, presisi rendah), Meeus bab 25 (Matahari), Schureman 1958 (faktor nodal), Pugh 1987 (rasio 0,46)",
        "profil": {n: {**p, "titik": titik[n]} for n, p in PROFIL.items()},
        "skala": "1 = gaya terkuat 2005-2035 per suku; indeks profil = bobot diurnal x D + bobot semi x S",
        "seri": {"t0": tgl[0], "D": D, "S": S, "g": seri},
        "pasang_tinggi": win,
        "perigee": [{"t": (p + dt.timedelta(hours=7)).strftime("%Y-%m-%dT%H:%M+07:00"), "km": round(km)} for p, km in perigee(t0, HARI_KE_DEPAN)],
        "nodal": {**nod, "puncak_k1_terdekat": nod["bulan"][ik], "catatan": "puncak K1/O1 saat node naik Bulan di 0 derajat (~2006, ~2025); terendah ~2015-2016"},
        "batasan": [
            "Indeks gaya astronomis, bukan tinggi muka air: respons laut lokal (resonansi teluk/selat), tekanan udara, angin, gelombang, dan penurunan tanah tidak ada di sini.",
            "Bobot diurnal/semi-diurnal adalah ASUMSI (pantura 80/20, lainnya 50/50); repo tidak punya konstanta harmonik per stasiun.",
            "Posisi Bulan presisi rendah (sekitar 0,3 derajat, jarak sekitar 0,3%): tanggal puncak bisa meleset beberapa jam, cukup untuk jendela harian, tidak untuk jam pasang.",
            "Tidak memuat gaya musiman non-astronomis (muka laut tinggi Mei-Juni/Des-Jan, ENSO) yang ikut menentukan rob; itu ada di rob.py dari model laut.",
        ],
    }


def uji():
    U = dt.timezone.utc
    # faktor nodal: puncak K1/O1 ~2006 & ~2025, terendah ~2015-2016, rentang Schureman 0,88..1,12
    def f(thn, bln=7):
        return nodal(dt.datetime(thn, bln, 1, tzinfo=U))["f_k1"]
    serie = [(y + (m - 1) / 12, f(y, m)) for y in range(2005, 2036) for m in range(1, 13)]
    pk = max((x for x in serie if 2020 <= x[0] < 2031), key=lambda x: x[1])[0]
    assert 2024.0 <= pk <= 2026.0, pk
    pk0 = max((x for x in serie if x[0] < 2012), key=lambda x: x[1])[0]
    assert 2005.5 <= pk0 <= 2007.5, pk0
    mn = min(serie, key=lambda x: x[1])
    assert 2014.5 <= mn[0] <= 2017 and 0.87 <= mn[1] <= 0.90, mn
    assert 1.10 <= max(v for _, v in serie) <= 1.13
    # perigee publik: 14 Nov 2016 ~11 UTC, 356.509 km (terdekat sejak 1948); 19 Mar 2011 ~19 UTC, 356.577 km
    for hari0, km_pub in ((dt.datetime(2016, 11, 12, tzinfo=U), 356509), (dt.datetime(2011, 3, 17, tzinfo=U), 356577)):
        hasil = perigee(hari0, 5)
        assert hasil, "perigee tidak ditemukan"
        p, km = min(hasil, key=lambda x: x[1])
        assert abs((p - (hari0 + dt.timedelta(days=2))).total_seconds()) < 86400 and abs(km - km_pub) / km_pub < 0.005, (p, km)
    # deklinasi Bulan maksimum mendekati 28,6 derajat (perhentian besar 2024-2025)
    dmax = max(posisi(dt.datetime(2025, 1, 1, tzinfo=U) + dt.timedelta(hours=6 * k))["de_b"] for k in range(120)) / RAD
    assert 28.0 <= dmax <= 29.0, dmax
    # spring-neap: purnama 5 Nov 2025 gaya semi-diurnal > perempat akhir 12 Nov 2025
    assert gaya(dt.datetime(2025, 11, 5, 13, tzinfo=U))[1] > 1.4 * gaya(dt.datetime(2025, 11, 12, 6, tzinfo=U))[1]
    # jendela: dua puncak terpisah jadi dua jendela, celah 1 hari dilebur
    tg = [f"2026-01-{i:02d}" for i in range(1, 11)]
    w = jendela(tg, [0, .9, 0, .9, 0, 0, 0, .95, 0, 0], .8)
    assert [(x["awal"], x["akhir"]) for x in w] == [("2026-01-02", "2026-01-04"), ("2026-01-08", "2026-01-08")], w
    d = hitung(dt.date(2026, 10, 19))
    assert len(d["seri"]["D"]) == 365 and all(0 <= v <= 1.001 for v in d["seri"]["g"]["pantura"]) and d["pasang_tinggi"]["pantura"]["jendela"]
    print("ok pasang_astro")


def main():
    d = hitung(dt.datetime.now(WIB).date())
    simpan(os.path.join(KELUAR, "pasang_astro.json"), d)
    for n, w in d["pasang_tinggi"].items():
        print(n, "ambang", w["ambang"], "jendela", len(w["jendela"]), "tertinggi:", [(x["awal"], x["akhir"], x["nilai"]) for x in w["tertinggi"]], file=sys.stderr)
    print(f"pasang_astro.json: {os.path.getsize(os.path.join(KELUAR, 'pasang_astro.json')) / 1024:.0f} KB, perigee {len(d['perigee'])}", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
