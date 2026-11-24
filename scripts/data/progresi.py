"""Perkembangan api per insiden (IK-02/04/05, data/kajian-bnpb/insiden-kaya/ALGORITMA.md bagian A)
public/data/progresi/arsip/<id>.json -> public/data/progresi/<id>.json + public/data/progresi/indeks.json

Metode: waktu tiba per petak 375 m = deteksi pertama dikurangi setengah jeda lintasan sebelumnya; permukaan waktu tiba di dalam jejak =
median 5 petak terdeteksi terdekat; garis depan harian pukul 14.00 WIB; laju = p90 kemajuan petak baru dari garis kemarin; lompatan 2-10 km;
perkiraan titik awal berbobot FRP. Murni stdlib (ADR-1): kisi dict, tetangga terdekat lewat indeks blok.
Angka perkembangan berpil hipotesis sampai uji tahan (A10, `uji-tahan`) lulus di dua kelompok (D9, Q10, Q11).

Metode (bukan kode) diambil dari pipeline/src/haze/progression.py dan docs/research/fire-progression.md,
https://github.com/pantaukarhutla/pantau-karhutla, lisensi MIT, ditulis ulang di stdlib. Pemberitahuan lisensi MIT:
  Copyright (c) pantaukarhutla/pantau-karhutla contributors (nama pemegang persis disalin dari LICENSE repo itu saat terbit; tidak ditebak di sini)
  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
  to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Pakai:  python3 -I scripts/data/progresi.py                # DATA = INSIDEN_DATA atau public/data
        python3 -I scripts/data/progresi.py --uji
        python3 -I scripts/data/progresi.py uji-tahan      # A10 pada FIRMS 2019/2023 lokal (data/raw/firms) + 3 insiden musim ini; tulis tests/insiden/hasil_uji.json
"""
import bisect, datetime as dt, glob, json, math, os, random, statistics, sys, tempfile, time

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DATA = os.environ.get("INSIDEN_DATA") or os.path.join(AKAR, "public/data")
HASIL_UJI = os.path.join(AKAR, "tests/insiden/hasil_uji.json")

VERSI = 1
ARSIP_DARI = dt.datetime(2026, 7, 1, tzinfo=dt.timezone.utc)
SEL = 0.0034                   # derajat; satu piksel VIIRS
KM_SEL = SEL * 111.32          # 0,378 km
HA_SEL = 14.0625
JEDA_GABUNG_JAM = 1.5
JEDA_BAWAAN_JAM = 12.0
JEDA_MAKS_JAM = 24.0
K_TETANGGA = 5
FRONT_UTC = 7                  # 14.00 WIB
LOMPAT_MIN_KM, LOMPAT_MAKS_KM = 2.0, 10.0
MIN_PIKSEL = 20                # [SEMENTARA, Q9]
MIN_RIWAYAT_JAM = 48
MAKS_LANGKAH = 30
MAKS_BYTES = 150_000
MAKS_INSIDEN = 120
REHITUNG_JAM = 12
SEBELUM_AWAL_JAM = 24          # petak lebih awal dari awal insiden (bekas bakar lama di lokasi sama) bukan bagian api ini
VIIRS = {"N", "N20", "N21"}
BLOK = 16
CAP_CARI = 30                  # sel; > LOMPAT_MAKS_KM, pencarian terdekat tak perlu lebih jauh
BENIH = 20261124
KRITERIA = {"dalam24_min": 0.60, "mae_tidak_lebih_buruk_dari": "tetangga_terdekat"}   # [SEMENTARA, Q2]


# ---------------- kisi ----------------
class Indeks:
    """Indeks blok 16x16 sel untuk tetangga terdekat Euklid (stdlib)."""
    def __init__(self):
        self.b = {}
        self.n = 0

    def tambah(self, c, v=None):
        self.b.setdefault((c[0] // BLOK, c[1] // BLOK), []).append((c, v))
        self.n += 1

    def cari(self, q, k=1, maks=None):
        """k tetangga terdekat [(jarak_sel, sel, nilai)] urut (jarak, sel); maks = batas jarak sel (None = tak terbatas)."""
        if not self.n:
            return []
        by, bx = q[0] // BLOK, q[1] // BLOK
        kand, r = [], 0
        while True:
            for y in range(by - r, by + r + 1):
                for x in range(bx - r, bx + r + 1):
                    if max(abs(y - by), abs(x - bx)) == r:
                        for c, v in self.b.get((y, x), ()):
                            kand.append((math.hypot(c[0] - q[0], c[1] - q[1]), c, v))
            kand.sort(key=lambda a: (a[0], a[1]))
            lim = r * BLOK + 1      # semua sel di luar cincin r berjarak >= lim
            if len(kand) >= k and kand[k - 1][0] <= lim:
                break
            if maks is not None and lim > maks:
                break
            if r > 4000:
                break
            r += 1
        return [a for a in kand[:k] if maks is None or a[0] <= maks]


def pusat(c):
    return (c[0] + 0.5) * SEL, (c[1] + 0.5) * SEL        # lat, lon


def dilasi(S):
    return S | {(y + dy, x + dx) for (y, x) in S for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))}


def erosi(S):
    return {(y, x) for (y, x) in S if all(n in S for n in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))}


def jejak(det):
    """tutup2(dilasi(det)) gabung det."""
    S = dilasi(det)
    for _ in range(2):
        S = dilasi(S)
    for _ in range(2):
        S = erosi(S)
    return S | det


def kuantil(a, q):
    """Interpolasi linier (sama dengan numpy.quantile bawaan)."""
    s = sorted(a)
    p = q * (len(s) - 1)
    i = int(p)
    return s[i] + (s[min(i + 1, len(s) - 1)] - s[i]) * (p - i)


# ---------------- A2, A3 ----------------
def epoch_gabung(raw_jam, t_min, t_maks):
    """A2: epoch dalam [t_min-48, t_maks+1]; lintasan <= JEDA_GABUNG_JAM dari elemen sebelumnya dibuang."""
    e = sorted({x for x in raw_jam if t_min - 48 <= x <= t_maks + 1})
    return [x for i, x in enumerate(e) if i == 0 or x - e[i - 1] > JEDA_GABUNG_JAM]


def tiba(t_pertama, E):
    """A3: (t_tiba, galat) jam. Tanpa lintasan sebelumnya = JEDA_BAWAAN_JAM."""
    k = bisect.bisect_left(E, t_pertama - 0.75)
    gap = t_pertama - E[k - 1] if k > 0 else JEDA_BAWAAN_JAM
    if gap <= 0:
        gap = JEDA_BAWAAN_JAM
    gap = min(gap, JEDA_MAKS_JAM)
    return t_pertama - gap / 2, gap / 2


# ---------------- A4 ----------------
def permukaan(det, fp, k=K_TETANGGA):
    """T(s) = median t_tiba k petak terdeteksi terdekat untuk tiap sel di jejak; petak terdeteksi tak lebih lambat dari t_pertama.
    det {sel: (t_pertama, t_tiba, galat, frp)}."""
    ix = Indeks()
    for c, v in det.items():
        ix.tambah(c, v[1])
    kk = min(k, len(det))
    T = {s: statistics.median(a[2] for a in ix.cari(s, kk)) for s in fp}
    for c, v in det.items():
        T[c] = min(T[c], v[0])
    return T


# ---------------- geometri ----------------
def _dp(p, tol):
    if len(p) < 3:
        return p
    (y0, x0), (y1, x1) = p[0], p[-1]
    dx, dy = x1 - x0, y1 - y0
    n = math.hypot(dx, dy)
    best, bi = -1.0, 0
    for i in range(1, len(p) - 1):
        d = math.hypot(p[i][1] - x0, p[i][0] - y0) if n == 0 else abs(dy * (p[i][1] - x0) - dx * (p[i][0] - y0)) / n
        if d > best:
            best, bi = d, i
    if best <= tol:
        return [p[0], p[-1]]
    return _dp(p[:bi + 1], tol)[:-1] + _dp(p[bi:], tol)


def garis_batas(S, tol=0.0004):
    """Batas himpunan sel -> MultiLineString (lon, lat), 4 desimal, cincin tertutup.
    ponytail: tepi tangga disederhanakan Douglas-Peucker, tanpa penghalusan buffer; tambah bila tampilan butuh."""
    ruas = {}
    def sisi(a, b):
        ruas.setdefault(a, []).append(b)
        ruas.setdefault(b, []).append(a)
    for (y, x) in S:
        if (y - 1, x) not in S: sisi((y, x), (y, x + 1))
        if (y + 1, x) not in S: sisi((y + 1, x), (y + 1, x + 1))
        if (y, x - 1) not in S: sisi((y, x), (y + 1, x))
        if (y, x + 1) not in S: sisi((y, x + 1), (y + 1, x + 1))
    pakai, garis = set(), []
    for a in sorted(ruas):
        for b in sorted(ruas[a]):
            if frozenset((a, b)) in pakai:
                continue
            cincin, cur, nxt = [a], a, b
            while True:
                pakai.add(frozenset((cur, nxt)))
                cincin.append(nxt)
                cur = nxt
                if cur == a:
                    break
                sisa = [c for c in sorted(ruas[cur]) if frozenset((cur, c)) not in pakai]
                if not sisa:
                    break
                nxt = sisa[0]
            pts = [(v[0] * SEL, v[1] * SEL) for v in cincin]
            if len(pts) > 5 and pts[0] == pts[-1]:      # cincin tertutup: pecah di titik terjauh supaya DP tak degenerat
                m = max(range(1, len(pts) - 1), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
                pts = _dp(pts[:m + 1], tol)[:-1] + _dp(pts[m:], tol)
            else:
                pts = _dp(pts, tol)
            garis.append([[round(p[1], 4), round(p[0], 4)] for p in pts])
    return {"type": "MultiLineString", "coordinates": garis}


# ---------------- A5-A8 ----------------
def iso(h):
    return (ARSIP_DARI + dt.timedelta(hours=h)).strftime("%Y-%m-%dT%H:%MZ")


def bearing(dari, ke):
    """Arah geometri dari -> ke, derajat (bukan arah angin); titik (lat, lon)."""
    dx = (ke[1] - dari[1]) * 111.32 * math.cos(math.radians(ke[0]))
    dy = (ke[0] - dari[0]) * 110.57
    return int(round((math.degrees(math.atan2(dx, dy)) + 360) % 360)) % 360


def garis_depan(fp, T, t0):
    """A5+A6: [(k, tk, dijangkau, baru, laju|None)] per langkah harian 07.00 UTC."""
    pertama = math.floor((t0 - FRONT_UTC) / 24) * 24 + FRONT_UTC + 24
    maxT = max(T.values())
    urut = sorted(fp, key=lambda s: (T[s], s))
    out, i, reached, ix = [], 0, set(), Indeks()
    tk, k = pertama, 0
    while tk < maxT + 24:
        baru = set()
        while i < len(urut) and T[urut[i]] <= tk:
            baru.add(urut[i])
            i += 1
        laju = None
        if reached and baru:
            d = [r[0][0] for r in (ix.cari(c, 1, CAP_CARI) for c in sorted(baru)) if r]
            sebar = [x for x in d if x * KM_SEL <= LOMPAT_MIN_KM]
            if sebar:
                p90 = kuantil(sebar, 0.9)
                terukur = p90 > 1 + 1e-9       # D6: kemajuan satu sel (p90 <= 1) = di batas resolusi, bukan terukur: null, tak pernah 0
                laju = {"k": k, "t": iso(tk), "median_km": round(statistics.median(sebar) * KM_SEL, 2),
                        "p90_km": round(p90 * KM_SEL, 2) if terukur else None, "terukur": terukur}
                if not terukur:
                    laju["di_batas_resolusi"] = True
        for c in baru:
            ix.tambah(c)
        reached = reached | baru
        if reached:
            out.append((k, tk, set(reached), baru, laju))
        tk += 24
        k += 1
    return out


def lompatan(det):
    """A7. Satu (terjauh) per hari UTC: petak 2-10 km dari semua yang tercapai hari-hari sebelumnya."""
    hari = {}
    for c in sorted(det, key=lambda c: (det[c][1], c)):
        hari.setdefault(int(det[c][1] // 24), []).append(c)
    seen, out = Indeks(), []
    for h in sorted(hari):
        if seen.n:
            terbaik = None
            for c in hari[h]:
                r = seen.cari(c, 1, CAP_CARI)
                if not r:
                    continue
                d = r[0][0] * KM_SEL
                if LOMPAT_MIN_KM <= d <= LOMPAT_MAKS_KM and (terbaik is None or d > terbaik[0]):
                    terbaik = (d, c, r[0][1])
            if terbaik:
                d, c, asal = terbaik
                la, lo = pusat(c)
                la0, lo0 = pusat(asal)
                out.append({"t": iso(det[c][1]), "lat": round(la, 4), "lon": round(lo, 4), "jarak_km": round(d, 1),
                            "dari": [round(la0, 4), round(lo0, 4)], "arah_deg": bearing((la0, lo0), (la, lo))})
        for c in hari[h]:
            seen.tambah(c)
    return out


def titik_awal(det):
    """A8."""
    t0 = min(v[1] for v in det.values())
    awal = sorted(c for c, v in det.items() if v[1] <= t0 + 1.0)
    w = [(det[c][3] or 0) + 1.0 for c in awal]
    lat = sum(wi * pusat(c)[0] for wi, c in zip(w, awal)) / sum(w)
    lon = sum(wi * pusat(c)[1] for wi, c in zip(w, awal)) / sum(w)
    sig = max(det[c][2] for c in awal)
    jauh = max(math.hypot((pusat(c)[0] - lat) * 110.57, (pusat(c)[1] - lon) * 111.32 * math.cos(math.radians(lat))) for c in awal)
    return {"t": iso(t0), "t_paling_awal": iso(t0 - sig), "t_paling_akhir": iso(min(det[c][0] for c in awal)), "galat_jam": round(sig, 1),
            "lat": round(lat, 4), "lon": round(lon, 4), "radius_m": int(max(375, round(jauh * 1000))),
            "mulai_lebih_awal": len(awal) >= 5, "sel_saat_pertama": len(awal)}


# ---------------- gabungan ----------------
def baca_uji():
    try:
        u = json.load(open(HASIL_UJI))
        return {"vonis": u.get("vonis", "belum"), "mae_jam": u.get("gabungan", {}).get("mae_jam"), "dalam24": u.get("gabungan", {}).get("dalam24"),
                "berkas": "tests/insiden/hasil_uji.json"}
    except Exception:
        return {"vonis": "belum", "mae_jam": None, "dalam24": None, "berkas": "tests/insiden/hasil_uji.json"}


def kosong(iid, dibuat, alasan, sejak=None, n=0):
    return {"versi": VERSI, "id": iid, "dibuat": dibuat, "tersedia": False, "alasan": alasan, "hitung_sejak": sejak, "petak_unik": n}


def hitung(arsip, iid, dibuat, awal_menit=None, uji=None):
    """Berkas progresi satu insiden dari arsip deteksinya. Murni: tak membaca berkas selain argumen (kecuali hasil uji bila `uji` kosong)."""
    pet = [p for p in arsip.get("petak", []) if p[4] in VIIRS and (awal_menit is None or p[2] >= awal_menit - SEBELUM_AWAL_JAM * 60)]
    sejak = iso(min(p[2] for p in pet) / 60) if pet else None
    if arsip.get("terpotong"):
        return kosong(iid, dibuat, "terlalu besar untuk arsip", sejak, len(pet))
    if len(pet) < MIN_PIKSEL:
        return kosong(iid, dibuat, "terlalu kecil untuk dilacak", sejak, len(pet))
    tj = [p[2] / 60 for p in pet]
    if max(tj) - min(tj) < MIN_RIWAYAT_JAM:
        return kosong(iid, dibuat, "arsip kurang dari 2 hari", sejak, len(pet))
    E = epoch_gabung([m / 60 for m in arsip.get("epoch", [])], min(tj), max(tj))
    det = {}
    for p in pet:
        c, t = (p[0], p[1]), p[2] / 60
        if c not in det or t < det[c][0]:
            det[c] = (t, p[3])
    det = {c: (v[0],) + tiba(v[0], E) + (v[1],) for c, v in det.items()}
    fp = jejak(set(det))
    T = permukaan(det, fp)
    langkah = garis_depan(fp, T, min(v[1] for v in det.values()))
    uji = uji or baca_uji()
    out = {"versi": VERSI, "id": iid, "dibuat": dibuat, "tersedia": True, "alasan": None, "hitung_sejak": sejak, "petak_unik": len(det),
           "hipotesis": uji["vonis"] != "lulus",
           "metode": {"sel_m": 375, "garis_depan": "14.00 WIB", "waktu_tiba": "deteksi pertama dikurangi setengah jeda lintasan",
                      "isi": "median 5 sel terdeteksi terdekat", "uji": uji,
                      "luas_catatan": "luas dijangkau = sel yang dilalui garis depan, batas atas luas terbakar",
                      "arah_catatan": "arah lompatan = geometri dari asal ke tujuan, bukan arah angin"},
           "titik_awal": titik_awal(det),
           "isokron": [{"k": k, "t": iso(tk), "luas_ha": round(len(r) * HA_SEL), "baru_ha": round(len(b) * HA_SEL), "geometri": garis_batas(r)}
                       for k, tk, r, b, _ in langkah[-MAKS_LANGKAH:]],
           "laju": [l for *_, l in langkah if l],
           "lompatan": lompatan(det),
           "seri": [{"t": iso(tk), "luas_ha": round(len(r) * HA_SEL), "baru_ha": round(len(b) * HA_SEL)} for _, tk, r, b, _ in langkah]}
    while len(json.dumps(out, separators=(",", ":"))) > MAKS_BYTES and len(out["isokron"]) > 1:
        out["isokron"] = out["isokron"][1:]
        out["isokron_dipangkas"] = True
    return out


def ringkas(p):
    if not p.get("tersedia"):
        return {"tersedia": False, "alasan": p.get("alasan")}
    akhir = p["laju"][-1] if p["laju"] else None
    return {"tersedia": True, "langkah": len(p["seri"]), "laju_p90_km_per_hari": akhir["p90_km"] if akhir else None,
            "terukur": bool(akhir and akhir["terukur"]), "lompatan": len(p["lompatan"]), "vonis": p["metode"]["uji"]["vonis"]}


def tulis(path, isi):
    with tempfile.NamedTemporaryFile("w", dir=os.path.dirname(path), delete=False, suffix=".tmp") as f:
        f.write(json.dumps(isi, ensure_ascii=False, separators=(",", ":")))
    os.replace(f.name, path)


def main():
    t_mulai = time.time()
    try:
        ins = json.load(open(os.path.join(DATA, "insiden.json")))["insiden"]
    except Exception as e:
        print("progresi: insiden.json tak terbaca (%s), dilewati tanpa menghapus apa pun" % e)
        return
    folder = os.path.join(DATA, "progresi")
    os.makedirs(folder, exist_ok=True)
    dibuat = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).replace(microsecond=0).isoformat()
    aktif = []
    gab = {k: r.get("ke") for k, r in ins.items() if r.get("status") == "gabung"}
    for k in gab:       # insiden gabung: berkasnya dihapus, indeks mencatat gabung_ke (ALGORITMA C)
        if os.path.exists(os.path.join(folder, k + ".json")):
            os.remove(os.path.join(folder, k + ".json"))
    for f in sorted(glob.glob(os.path.join(folder, "arsip", "*.json"))):
        iid = os.path.basename(f)[:-5]
        if (ins.get(iid) or {}).get("status") == "aktif":
            try:
                aktif.append((len(json.load(open(f)).get("petak", [])), iid, f))
            except Exception as e:
                print("::warning title=progresi::arsip %s rusak (%s), dilewati" % (iid, e))
    aktif.sort(reverse=True)
    if len(aktif) > MAKS_INSIDEN:
        print("::notice title=progresi::%d insiden aktif berarsip, dibatasi %d terbesar" % (len(aktif), MAKS_INSIDEN))
    n_hitung = n_tetap = 0
    uji = baca_uji()
    for _, iid, f in aktif[:MAKS_INSIDEN]:
        arsip = json.load(open(f))
        pt = arsip.get("petak", [])
        sumber = [len(pt), max((p[2] for p in pt), default=0), len(arsip.get("epoch", []))]
        tujuan = os.path.join(folder, iid + ".json")
        try:
            lama = json.load(open(tujuan))
            if lama.get("versi") == VERSI and lama.get("sumber") == sumber and time.time() - os.path.getmtime(tujuan) < REHITUNG_JAM * 3600 \
                    and lama.get("metode", {}).get("uji", uji) == uji:
                n_tetap += 1
                continue
        except Exception:
            pass
        awal = ins[iid].get("awal")
        am = int((dt.datetime.strptime(awal, "%Y-%m-%dT%H:%MZ").replace(tzinfo=dt.timezone.utc) - ARSIP_DARI).total_seconds() // 60) if awal else None
        try:
            p = hitung(arsip, iid, dibuat, am, uji)
        except Exception as e:
            print("::warning title=progresi::%s gagal (%s)" % (iid, e))
            continue
        p["sumber"] = sumber
        tulis(tujuan, p)
        n_hitung += 1
    idx = {}
    for f in sorted(glob.glob(os.path.join(folder, "*.json"))):
        iid = os.path.basename(f)[:-5]
        if iid != "indeks":
            try:
                idx[iid] = ringkas(json.load(open(f)))
            except Exception:
                pass
    tulis(os.path.join(folder, "indeks.json"), {"dibuat": dibuat, "insiden": idx, "gabung": gab})
    mb = sum(os.path.getsize(f) for f in glob.glob(os.path.join(folder, "*.json"))) / 1e6
    print("progresi: %d dihitung, %d tetap, %d tersedia dari %d, %.1f MB, %.1f dtk" %
          (n_hitung, n_tetap, sum(1 for v in idx.values() if v["tersedia"]), len(idx), mb, time.time() - t_mulai))


# ---------------- A10 uji tahan ----------------
def prediksi_tahan(det, tahan, k):
    """Sel `tahan` ditebak dari median t_tiba k sel terdeteksi terdekat di sisa; [(prediksi, benar)]."""
    ix = Indeks()
    for c in det:
        if c not in tahan:
            ix.tambah(c, det[c][1])
    return [(statistics.median(a[2] for a in ix.cari(c, k)), det[c][1]) for c in sorted(tahan)]


def metrik(pasang):
    s = [p - b for p, b in pasang]
    a = [abs(x) for x in s]
    return {"n": len(s), "mae_jam": round(sum(a) / len(a), 2), "median_galat_jam": round(statistics.median(a), 2), "bias_jam": round(sum(s) / len(s), 2),
            "dalam12": round(sum(1 for x in a if x <= 12) / len(a), 3), "dalam24": round(sum(1 for x in a if x <= 24) / len(a), 3)}


def uji_tahan_satu(petak_t, epoch_jam):
    """petak_t {sel: t_pertama_jam}; 20% sel ditahan (benih tetap). -> {metode: [(prediksi, benar)]}."""
    E = epoch_gabung(epoch_jam, min(petak_t.values()), max(petak_t.values()))
    det = {c: (t,) + tiba(t, E) for c, t in petak_t.items()}
    tahan = set(random.Random(BENIH).sample(sorted(det), max(1, len(det) // 5)))
    return {"nn": prediksi_tahan(det, tahan, 1), "median5": prediksi_tahan(det, tahan, 5), "median9": prediksi_tahan(det, tahan, 9)}


def kelompok(daftar, nama):
    """daftar [(id, petak_t, epoch_jam, komposisi_sensor)] -> metrik per insiden, gabungan, vonis."""
    gab, per = {"nn": [], "median5": [], "median9": []}, []
    for label, pt, ej, kom in daftar:
        r = uji_tahan_satu(pt, ej)
        for m in gab:
            gab[m] += r[m]
        per.append({"id": label, "petak_unik": len(pt), "sensor": kom, **{m: metrik(r[m]) for m in r}})
    g = {m: metrik(v) for m, v in gab.items()}
    lulus = g["median5"]["dalam24"] >= KRITERIA["dalam24_min"] and g["median5"]["mae_jam"] <= g["nn"]["mae_jam"]
    return {"kelompok": nama, "per_insiden": per, "vonis": "lulus" if lulus else "gagal",
            "gabungan": {"mae_jam": g["median5"]["mae_jam"], "dalam12": g["median5"]["dalam12"], "dalam24": g["median5"]["dalam24"], "metode": g}}


def firms_tahun(tahun):
    """VIIRS keyakinan nominal/tinggi, vegetasi: ({sel: (t_pertama_jam sejak 1 Jan, satelit)}, {sel 1 derajat: {epoch jam}})."""
    import csv
    d0 = dt.datetime(tahun, 1, 1, tzinfo=dt.timezone.utc)
    sel, ep = {}, {}
    for f in sorted(glob.glob(os.path.join(AKAR, "data/raw/firms", "viirs*_%d.csv" % tahun))):
        for r in csv.DictReader(open(f)):
            if r["confidence"] not in ("n", "h", "nominal", "high") or r.get("type", "0") not in ("0", ""):
                continue
            hm = int(r["acq_time"])
            t = (dt.datetime.strptime(r["acq_date"], "%Y-%m-%d").replace(tzinfo=dt.timezone.utc) - d0).total_seconds() / 3600 + hm // 100 + hm % 100 / 60
            la, lo = float(r["latitude"]), float(r["longitude"])
            c = (math.floor(la / SEL), math.floor(lo / SEL))
            if c not in sel or t < sel[c][0]:
                sel[c] = (t, r["satellite"])
            ep.setdefault((math.floor(la), math.floor(lo)), set()).add(round(t * 2) / 2)
    return sel, ep


def komponen(sel, jendela_jam=72, r=2):
    """Satu api = rantai sel (tetangga <= r sel, selisih t_pertama <= jendela). -> [[sel]]"""
    induk = {}
    def cari(a):
        while induk[a] != a:
            induk[a] = induk[induk[a]]
            a = induk[a]
        return a
    ada = set()
    for c in sorted(sel, key=lambda c: (sel[c][0], c)):
        induk[c] = c
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                n = (c[0] + dy, c[1] + dx)
                if n in ada and sel[c][0] - sel[n][0] <= jendela_jam:
                    induk[cari(n)] = cari(c)
        ada.add(c)
    g = {}
    for c in induk:
        g.setdefault(cari(c), []).append(c)
    return list(g.values())


def uji_tahan():
    t0 = time.time()
    # Aturan pemilihan DIKUNCI sebelum hasil dihitung (RENCANA-UJI §2): 5 per tahun (2019, 2023), terbesar menurut sel unik dengan 200 <= n <= 5000
    # (di atas 5000 = rantai ruang-waktu lintas banyak api, bukan satu api).
    hist, pilihan = [], []
    for th in (2019, 2023):
        sel, ep = firms_tahun(th)
        kp = komponen(sel)
        cand = sorted([k for k in kp if 200 <= len(k) <= 5000], key=lambda k: (-len(k), min(k)))[:5]
        for k in cand:
            raw = set()
            for y in range(min(c[0] for c in k) * 0 + math.floor(min(c[0] for c in k) * SEL) - 1, math.floor(max(c[0] for c in k) * SEL) + 2):
                for x in range(math.floor(min(c[1] for c in k) * SEL) - 1, math.floor(max(c[1] for c in k) * SEL) + 2):
                    raw |= ep.get((y, x), set())
            sens = {}
            for c in k:
                sens[sel[c][1]] = sens.get(sel[c][1], 0) + 1
            awal = min(k, key=lambda c: sel[c][0])
            label = "%d@%.2f,%.2f" % ((th,) + pusat(awal))
            aw = min(sel[c][0] for c in k)      # aturan SEBELUM_AWAL_JAM yang sama dengan produksi; rantai dibangun dari awalnya, jadi tak ada yang dibuang
            hist.append((label, {c: sel[c][0] for c in k if sel[c][0] >= aw - SEBELUM_AWAL_JAM}, sorted(raw), sens))
            pilihan.append({"id": label, "petak_unik": len(k)})
        print("tahun %d: %d sel unik, %d komponen, %d terpilih (%.0f dtk)" % (th, len(sel), len(kp), len(cand), time.time() - t0), flush=True)
    out = kelompok(hist, "FIRMS lengkap 2019 dan 2023")
    out.update({"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "benih": BENIH, "kriteria": KRITERIA, "pilihan": pilihan,
                "pemilihan": "5 per tahun terbesar menurut sel unik dengan 200 <= n <= 5000; satu api = rantai sel (tetangga <= 2 sel, selisih t_pertama <= 72 jam); dikunci sebelum hasil dihitung",
                "aturan_awal": "petak lebih awal dari awal insiden dikurangi %d jam dibuang pada SEMUA kelompok (D20); kelompok FIRMS: awal = deteksi pertama rantai, jadi tak ada yang terbuang" % SEBELUM_AWAL_JAM,
                "jenis_uji": "interpolasi sel ditahan (20% sel disembunyikan, ditebak dari tetangga), BUKAN akurasi garis depan terhadap perimeter independen",
                "peringatan": "uji ini mengukur seberapa baik sel yang ditahan ditebak dari tetangga, bukan akurasi terhadap perimeter independen"})
    # kelompok musim ini (masukan produksi, Q11): 3 arsip aktif terbesar dengan >= 50 petak VIIRS sesudah awal insiden
    mi = []
    try:
        ins = json.load(open(os.path.join(DATA, "insiden.json")))["insiden"]
        cand = []
        for f in glob.glob(os.path.join(DATA, "progresi", "arsip", "*.json")):
            a, iid = json.load(open(f)), os.path.basename(f)[:-5]
            if ins.get(iid, {}).get("status") != "aktif" or not ins[iid].get("awal"):
                continue
            am = (dt.datetime.strptime(ins[iid]["awal"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=dt.timezone.utc) - ARSIP_DARI).total_seconds() / 60
            pet = [p for p in a["petak"] if p[4] in VIIRS and p[2] >= am - SEBELUM_AWAL_JAM * 60]
            if len(pet) >= 50:
                cand.append((len(pet), iid, pet, a["epoch"]))
        for n, iid, pet, e in sorted(cand, reverse=True)[:3]:
            sens = {}
            for p in pet:
                sens[p[4]] = sens.get(p[4], 0) + 1
            mi.append((iid, {(p[0], p[1]): p[2] / 60 for p in pet}, [m / 60 for m in e], sens))
    except Exception as e:
        print("musim ini dilewati:", e)
    out["vonis_historis"] = out["vonis"]
    if mi:
        out["musim_ini"] = kelompok(mi, "arsip titik_hari musim ini (masukan produksi, Q11)")
        if len(mi) < 3:     # RENCANA-UJI §2 butir 6 minta 3 insiden; kurang dari itu tak menghakimi (tetap hipotesis di layar)
            out["vonis"] = "belum"
            out["alasan_vonis"] = "kelompok musim ini hanya %d insiden dengan >= 50 petak (diminta 3), %d sel ditahan: belum cukup untuk vonis" % (len(mi), out["musim_ini"]["gabungan"]["metode"]["median5"]["n"])
        else:
            out["vonis"] = "lulus" if out["vonis_historis"] == "lulus" and out["musim_ini"]["vonis"] == "lulus" else "gagal"
    else:
        out["vonis"] = "belum"            # Q11: tanpa kelompok produksi vonis historis tak boleh dipakai
        out["alasan_vonis"] = "kelompok musim ini tak tersedia"
    os.makedirs(os.path.dirname(HASIL_UJI), exist_ok=True)
    json.dump(out, open(HASIL_UJI, "w"), ensure_ascii=False, indent=1)
    print(json.dumps({"vonis": out["vonis"], "historis": out["vonis_historis"], "gabungan": out["gabungan"], "musim_ini": out.get("musim_ini", {}).get("gabungan")}, ensure_ascii=False, indent=1))
    print("tersimpan", HASIL_UJI, "%.0f dtk" % (time.time() - t0))


# ---------------- uji ----------------
def _garis(n, per_hari=1):
    """Garis lurus: per_hari sel baru tiap hari, terdeteksi 07.00 UTC; lintasan tiap hari 07.00 UTC."""
    return {"petak": [[0, i, ((i // per_hari) * 24 + 7) * 60, 5.0, "N20"] for i in range(n)],
            "epoch": [(d * 24 + 7) * 60 for d in range(n // per_hari + 3)]}


def uji():
    assert epoch_gabung([10, 10.5, 11, 20], 0, 30) == [10, 20], epoch_gabung([10, 10.5, 11, 20], 0, 30)
    assert tiba(30, [24]) == (27.0, 3.0)
    assert tiba(30, []) == (24.0, 6.0)
    assert tiba(30, [29.9]) == (24.0, 6.0), "lintasan < 0,75 jam bukan lintasan sebelumnya"
    assert tiba(100, [0]) == (88.0, 12.0), "jeda dibatasi 24 jam"
    # indeks tetangga terdekat sama dengan brute force
    rnd = random.Random(1)
    pts = {(rnd.randint(-80, 80), rnd.randint(-80, 80)) for _ in range(300)}
    ix = Indeks()
    for c in pts:
        ix.tambah(c)
    for _ in range(40):
        q = (rnd.randint(-90, 90), rnd.randint(-90, 90))
        assert [(a[0], a[1]) for a in ix.cari(q, 5)] == sorted((math.hypot(c[0] - q[0], c[1] - q[1]), c) for c in pts)[:5]
    assert ix.cari((5000, 5000), 1, 30) == []
    # A4: petak terdeteksi tak lebih lambat dari t_pertama; sel kosong = median 5 tetangga terdekat
    det = {(0, i): (i * 10.0, i * 10.0 - 3, 3.0, 1.0) for i in range(10)}
    T = permukaan(det, jejak(set(det)))
    assert all(T[c] <= det[c][0] for c in det)
    assert T[(1, 4)] == statistics.median([det[(0, i)][1] for i in (2, 3, 4, 5, 6)]), T[(1, 4)]
    # A5/A6: 1 sel per hari -> di batas resolusi (null, bukan 0); 2 sel per hari -> terukur
    a = _garis(30)
    p = hitung(a, "T-1", "x", uji={"vonis": "belum"})
    assert p["tersedia"] and p["hipotesis"] and len(p["isokron"]) >= 20 and p["laju"], p.get("alasan")
    assert all(abs(l["median_km"] - KM_SEL) < 0.01 and (l["terukur"] or (l["p90_km"] is None and l["di_batas_resolusi"])) for l in p["laju"][:-2]), p["laju"][:5]
    assert sum(1 for l in p["laju"] if not l["terukur"]) > 10 and all(l["p90_km"] != 0 for l in p["laju"]), "satu sel per hari = di batas resolusi, null bukan 0"
    dua = hitung(_garis(60, 2), "T-12", "x", uji={"vonis": "belum"})
    assert any(l["terukur"] and l["p90_km"] > KM_SEL for l in dua["laju"]), "dua sel per hari melewati batas resolusi"
    assert p["metode"]["uji"]["vonis"] == "belum"
    # A7: 3 km dari semua yang ada = lompatan; 12 km bukan
    b = _garis(30)
    b["petak"].append([0, 30 + int(3 / KM_SEL) + 1, (20 * 24 + 7) * 60, 5.0, "N"])
    pj = hitung(b, "T-2", "x")
    assert len(pj["lompatan"]) == 1 and 2.0 <= pj["lompatan"][0]["jarak_km"] <= 10.0, pj["lompatan"]
    c = _garis(30)
    c["petak"].append([0, 30 + int(12 / KM_SEL), (20 * 24 + 7) * 60, 5.0, "N"])
    assert hitung(c, "T-3", "x")["lompatan"] == []
    # A8: >= 5 petak saat pertama terlihat = mulai_lebih_awal
    d = {"petak": [[0, i, 7 * 60, 3.0, "N"] for i in range(6)] + [[0, 6 + i, (24 * (i + 1) + 7) * 60, 3.0, "N"] for i in range(30)],
         "epoch": [(24 * k + 7) * 60 for k in range(35)]}
    assert hitung(d, "T-4", "x")["titik_awal"]["mulai_lebih_awal"] is True
    assert p["titik_awal"]["mulai_lebih_awal"] is False and p["titik_awal"]["radius_m"] >= 375
    # tak tersedia: < 20 petak, arsip < 2 hari, terpotong, MODIS-pertama tak dihitung
    k = hitung(_garis(10), "T-5", "x")
    assert not k["tersedia"] and k["alasan"] == "terlalu kecil untuk dilacak"
    assert hitung({"petak": [[0, i, i * 60, 1.0, "N"] for i in range(25)], "epoch": []}, "T-6", "x")["alasan"] == "arsip kurang dari 2 hari"
    assert hitung(dict(_garis(30), terpotong=True), "T-7", "x")["alasan"] == "terlalu besar untuk arsip"
    m = _garis(30)
    m["petak"] = [q[:4] + ["M"] for q in m["petak"]]
    assert hitung(m, "T-8", "x")["alasan"] == "terlalu kecil untuk dilacak"
    # petak sebelum awal insiden dibuang
    e = _garis(30)
    e["petak"] = [[5, i, 0, 1.0, "N"] for i in range(25)] + [[0, q[1], q[2] + 100 * 24 * 60, 5.0, "N"] for q in e["petak"]]
    e["epoch"] = [x + 100 * 24 * 60 for x in e["epoch"]]
    assert hitung(e, "T-9", "x", awal_menit=100 * 24 * 60)["petak_unik"] == 30
    # determinisme, 30 langkah, ukuran
    assert hitung(a, "T-1", "x", uji={"vonis": "belum"}) == p
    big = hitung(_garis(60), "T-10", "x")
    assert len(big["isokron"]) <= MAKS_LANGKAH and len(json.dumps(big)) <= MAKS_BYTES and big["seri"][0]["luas_ha"] > 0
    g = garis_batas({(0, 0)})
    assert len(g["coordinates"]) == 1 and g["coordinates"][0][0] == g["coordinates"][0][-1]
    assert bearing((0, 0), (0, 1)) == 90 and bearing((0, 0), (1, 0)) == 0
    assert abs(kuantil([0, 1, 2, 3, 4], 0.9) - 3.6) < 1e-9
    # tolok ukur ADR-1: 20.000 petak < 60 detik
    rn, petak, cy, cx = random.Random(2), {}, 0, 0
    while len(petak) < 20000:
        cy += rn.choice((-1, 0, 1))
        cx += rn.choice((-1, 0, 1))
        petak.setdefault((cy, cx), len(petak) // 40)
    besar = {"petak": [[y, x, int((d * 24 + 7) * 60), 3.0, "N"] for (y, x), d in petak.items()], "epoch": [(d * 24 + 7) * 60 for d in range(500)]}
    t = time.time()
    assert hitung(besar, "T-11", "x")["tersedia"]
    dtk = time.time() - t
    assert dtk < 60, dtk
    # ketahanan: insiden.json hilang tak crash dan tak menghapus
    global DATA
    with tempfile.TemporaryDirectory() as d:
        lama, DATA = DATA, d
        os.makedirs(os.path.join(d, "progresi"))
        open(os.path.join(d, "progresi", "X.json"), "w").write("{}")
        main()
        DATA = lama
        assert os.path.exists(os.path.join(d, "progresi", "X.json"))
    # A10 pada garis lurus: tebakan dari tetangga kena
    r = uji_tahan_satu({(0, i): i * 6.0 for i in range(40)}, [6.0 * i - 1 for i in range(40)])
    assert metrik(r["median5"])["dalam24"] >= 0.9
    print("progresi uji: OK (20.000 petak %.1f dtk)" % dtk)


if __name__ == "__main__":
    if sys.argv[1:] == ["--uji"]:
        uji()
    elif sys.argv[1:] == ["uji-tahan"]:
        uji_tahan()
    else:
        main()
