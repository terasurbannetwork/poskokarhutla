"""Evaluasi sortie OMC: selisih-dalam-selisih terhadap kontrol, dibandingkan pita diurnal, dikalibrasi uji plasebo.

Masukan : daftar sortie dari Worker (GET /api/omc/sortie?sejak=) + public/udara/data/omc_arsip.json (panen.py).
Keluaran: public/udara/data/omc_hasil.json (kunci `dibuat` pertama, tidak pernah diganti).
Pakai   : python3 scripts/omc/nilai.py                       satu putaran (endpoint belum ada = keluar bersih, peringatan)
          python3 scripts/omc/nilai.py --sortie berkas.json   pakai daftar sortie dari berkas (uji lokal)
          python3 scripts/omc/nilai.py uji                    self-check luring

Yang dihasilkan HANYA kesesuaian, bukan sebab-akibat. Kategori: sejalan | tak_terbedakan | berlawanan | data_kurang.
`sejalan` butuh: arah sesuai dugaan di >= 2 dari 3 jendela sensitivitas, DiD melewati ambang, nilai mentah di luar pita
diurnal (hari tanpa OMC), tanpa bendera pengganggu, episode berstatus final, dan ambang lolos uji plasebo.

Plasebo menjalankan PROSEDUR YANG SAMA (pilih kontrol dari korelasi 72 jam sebelum tanggal itu, bendera, pita leave-one-out)
pada tanggal semu tanpa OMC. Unit hitung = tanggal unik (n efektif); lolos bila n efektif >= 30 DAN batas atas
Clopper-Pearson satu sisi 95% dari laju "sejalan" palsu <= 10%.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import statistics
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import panen  # noqa: E402  (menarik scripts/udara/alat)
alat = panen.alat

HASIL = os.path.join(alat.OUT, "omc_hasil.json")
ARSIP = panen.BERKAS
URL_SORTIE = "https://centurisk97.id/api/omc/sortie"
UTC = dt.timezone.utc

PRA_JAM = 6
PRA_MIN = 4
KONTROL_KM = (50, 400)
KORELASI_MIN = 0.5
KORELASI_JAM = 72
KORELASI_PASANGAN_MIN = 24
HARI_BASIS = 30          # hari ke belakang untuk pita diurnal
HARI_BASIS_MIN = 10
HARI_PLASEBO = 40        # tanggal semu: 1..40 hari ke belakang
N_EFEKTIF_MIN = 30       # tanggal unik minimal agar laju plasebo boleh dipercaya
PLASEBO_MAKS = 0.10      # batas atas CP satu sisi 95% harus <= ini
RADIUS_SASARAN_KM = {"dry_ice": 40, "nacl": 100}   # ponytail: tanpa angin historis, NaCl hanya diperlebar radiusnya; geser koridor angin bila arsip angin ada
RADIUS_CADANGAN_KM = {"dry_ice": 75, "nacl": 150}
HUJAN_TETANGGA_KM = 150  # METAR dalam jarak ini dari pusat sasaran dianggap "sasaran atau tetangga"
HUJAN_KONTROL_MIN = 0.25  # fraksi jam hujan di kontrol pada jendela pasca yang menandai hujan alami
PM25_JENUH = 1900
JENUH_NISBAH = 0.98
JENUH_MIN_BERULANG = 3   # maksimum historis harus berulang >= 3 kali agar dianggap plafon sensor
DATAR_JAM = 4
JENDELA = {"dry_ice": ([1, 3, 6], 3), "nacl": ([3, 6, 12], 6)}   # (sensitivitas, utama); HIPOTESIS yang dikonfigurasi, bukan kutipan
METRIK = {"dry_ice": ["pm25", "jarak_pandang"], "nacl": ["hujan"]}
UTAMA = {"dry_ice": "pm25", "nacl": "hujan"}   # satu metrik utama per bahan menentukan ringkasan (lihat ringkas())
ARAH = {"pm25": -1, "jarak_pandang": 1, "hujan": 1}
AMBANG_KANDIDAT = {"pm25": [0.25, 0.35, 0.5, 0.7, 1.0], "jarak_pandang": [0.25, 0.35, 0.5, 0.7, 1.0], "hujan": [0.3, 0.4, 0.5, 0.6, 0.8]}
NAMA_ID = {"pm25": "PM2,5", "jarak_pandang": "Jarak pandang", "hujan": "Frekuensi jam hujan"}
BAHAN_ID = {"nacl": "NaCl", "dry_ice": "dry ice"}
BLOK = {"sensor_mati", "sensor_jenuh", "hujan_di_sasaran", "hujan_alami_di_kontrol", "titik_panas_berubah", "radius_diperluas"}
BENDERA_ID = {
    "sensor_mati": "sensor sasaran beku atau bernilai nol",
    "sensor_jenuh": "sensor sasaran jenuh di plafonnya",
    "hujan_di_sasaran": "hujan tercatat di sasaran atau bandara sekitarnya pada jendela itu",
    "hujan_alami_di_kontrol": "hujan alami juga terjadi di stasiun kontrol",
    "titik_panas_berubah": "jumlah titik panas berubah besar",
    "radius_diperluas": "stasiun terdekat berada di luar sasaran (radius diperluas)",
    "plasebo_belum_terkalibrasi": "uji plasebo belum terkalibrasi",
    "jendela_belum_lengkap": "jendela sesudah sortie belum lengkap",
}
FOOTER = "Hasil ini menilai apakah perubahan sejalan dengan dugaan efek. Kesesuaian lokasi atau waktu dengan sasaran belum membuktikan sebab-akibat."
KETERBATASAN = [
    "Palangka Raya tidak punya bandara METAR di IEM: jarak pandang dan hujan di sana tidak bisa dinilai.",
    "Arsip PM2,5 BMKG baru sekitar 5 hari (sejak 16 Okt 2026): pita diurnal dan plasebo PM2,5 belum terhitung; butuh sekitar 40 hari arsip agar `sejalan` mungkin muncul.",
    "Plasebo memakai 40 hari terakhir dan bisa berbeda musim (asap atau hujan) dari saat sortie.",
    "Bendera hujan memakai METAR di bandara dalam 150 km dari sasaran; hujan lokal di luar jangkauan bandara tidak terdeteksi.",
    "OMC yang tidak tercatat di sistem mengotori pita diurnal dan plasebo: hari tanpa OMC berarti hari tanpa OMC tercatat.",
    "Angin historis tidak diarsipkan: bendera angin berbalik dan geseran koridor NaCl belum dinilai.",
    "Hujan dinilai dari kode cuaca METAR (hujan, gerimis, badai petir) di bandara; citra IMERG GIBS belum dipakai.",
    "Stasiun sasaran dipilih berdasarkan jarak ke pusat kab/kota atau poligon; stasiun komposit memakai median antar stasiun yang datanya lengkap.",
    "Jendela efek (dry ice 0-3 jam, NaCl 0-6 jam) adalah hipotesis operasional, bukan kutipan literatur.",
]
RE_HUJAN = re.compile(r"^[-+]?(TS|SH)?(RA|DZ)|^[-+]?TS")   # token METAR; VC* (di sekitar) dan RE* (baru saja) tidak cocok


# ------------------------------------------------------------------ geometri dan sasaran
def norm(s):
    s = re.sub(r"[^a-z0-9 ]", " ", str(s).lower())
    s = re.sub(r"^(kab|kabupaten)\b", "", s.strip())
    return re.sub(r"\s+", "", s)


def cincin(g):
    """Daftar cincin luar GeoJSON Polygon/MultiPolygon: [[(lon, lat), ...]]."""
    if not isinstance(g, dict):
        return []
    c = g.get("coordinates") or []
    if g.get("type") == "Polygon" and c:
        return [[(p[0], p[1]) for p in c[0]]]
    if g.get("type") == "MultiPolygon":
        return [[(p[0], p[1]) for p in poly[0]] for poly in c if poly]
    return []


def dalam(lat, lon, ringer):
    for r in ringer:
        masuk = False
        for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                masuk = not masuk
        if masuk:
            return True
    return False


def sasaran(sortie, kota):
    """(pusat (lat, lon) | None, ringer, daftar kab dikenal)."""
    ringer = cincin(sortie.get("sasaran_poligon"))
    titik = [p for r in ringer for p in r]
    kab = []
    for key in sortie.get("sasaran_kab") or []:
        prov, _, nama = str(key).rpartition("|")
        for k in kota:
            if norm(nama) in (norm(k["kab"]), norm(k["nama"])) and (not prov or not prov.isdigit() or prov == k["prov"]):
                kab.append(k)
                titik.append((k["lon"], k["lat"]))
                break
    if not titik:
        return None, ringer, kab
    return (sum(p[1] for p in titik) / len(titik), sum(p[0] for p in titik) / len(titik)), ringer, kab


# ------------------------------------------------------------------ deret dari arsip
# koordinat pendekat bandara (derajat) untuk jarak ke sasaran; ketelitian kilometer cukup
BANDARA_LL = {"WITT": (5.52, 95.42), "WIMN": (3.64, 98.88), "WIMM": (3.56, 98.67), "WIEE": (-0.79, 100.28), "WIBB": (0.46, 101.44),
              "WIDD": (1.12, 104.12), "WIDN": (0.92, 104.53), "WIPP": (-2.90, 104.70), "WILL": (-5.24, 105.18), "WIOO": (-0.15, 109.40),
              "WAOO": (-3.44, 114.76), "WALL": (-1.27, 116.89), "WAQQ": (3.33, 117.57)}


def hujan_wx(wx):
    return 1 if any(RE_HUJAN.match(t) for t in str(wx or "").split()) else 0


def bangun_seri(arsip):
    """{'pm25'|'jarak_pandang'|'hujan': {nama: {lat, lon, d: {jam: nilai}, cap, cap_n}}}."""
    out = {"pm25": {}, "jarak_pandang": {}, "hujan": {}}
    for nama, s in (arsip.get("pm25") or {}).items():
        d = {h: kv["v"] for h, kv in panen.ke_dict(s).items() if "v" in kv}
        cap = max(d.values()) if d else 0
        out["pm25"][nama] = {"lat": s["lat"], "lon": s["lon"], "d": d, "cap": cap,
                             "cap_n": sum(v >= JENUH_NISBAH * cap for v in d.values()) if cap else 0}
    for icao, s in (arsip.get("metar") or {}).items():
        if icao not in BANDARA_LL:
            continue
        lat, lon = BANDARA_LL[icao]
        vis, hj = {}, {}
        for h, kv in panen.ke_dict(s).items():
            if "vis" in kv:
                vis[h] = min(kv["vis"], 10000)
            hj[h] = hujan_wx(kv.get("wx"))
        out["jarak_pandang"][icao] = {"lat": lat, "lon": lon, "d": vis}
        out["hujan"][icao] = {"lat": lat, "lon": lon, "d": hj}
    return out


def trf(v, jenis):
    return v if jenis == "hujan" else math.log(max(v, 1.0))


def komposit(stasiun, jenis):
    """Median antar stasiun per jam (hujan: rata-rata biner)."""
    per = {}
    for s in stasiun:
        for h, v in s["d"].items():
            per.setdefault(h, []).append(v)
    f = statistics.mean if jenis == "hujan" else statistics.median
    return {h: f(v) for h, v in per.items()}


def pearson(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    va, vb = sum((x - ma) ** 2 for x in a), sum((y - mb) ** 2 for y in b)
    if va == 0 or vb == 0:
        return None
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(va * vb)


def sensor_mati(d, jam):
    """Nol, atau nilai identik >= 4 jam berturut-turut (beku) pada jam-jam itu."""
    ada = sorted(h for h in jam if h in d)
    if any(d[h] == 0 for h in ada):
        return True
    run = 1
    for a, b in zip(ada, ada[1:]):
        run = run + 1 if b == a + 1 and d[b] == d[a] else 1
        if run >= DATAR_JAM:
            return True
    return False


def jenuh(st, jam):
    """Plafon per stasiun dari maksimum historisnya (harus berulang), ditambah batas mutlak 1900."""
    v = [st["d"][h] for h in jam if h in st["d"]]
    if any(x >= PM25_JENUH for x in v):
        return True
    return st.get("cap_n", 0) >= JENUH_MIN_BERULANG and any(x >= JENUH_NISBAH * st["cap"] for x in v)


def siap(semua, nama_list, s, e, W, jenis):
    """Himpunan stasiun tetap untuk satu pengukuran: lengkap di jendela pra DAN pasca (pasca >= ceil(W/2)); PM2,5 beku/nol dibuang."""
    pra, pas = range(s - PRA_JAM, s), range(e, e + W)
    butuh = -(-W // 2)
    ok, mati = [], []
    for n in nama_list:
        d = semua[n]["d"]
        if sum(h in d for h in pra) < PRA_MIN or sum(h in d for h in pas) < butuh:
            continue
        if jenis == "pm25" and sensor_mati(d, list(pra) + list(pas)):
            mati.append(n)
            continue
        ok.append(n)
    return ok, mati


# ------------------------------------------------------------------ inti: kontrol, ukur, analisis
def kontrol_untuk(k, s):
    """Kontrol dipilih BUTA WAKTU: korelasi dihitung hanya dari 72 jam sebelum `s` (jam mulai nyata atau semu).

    Dengan begitu plasebo meniru prosedur nyata utuh, termasuk pemilihan kontrol; memakai kontrol yang dipilih dari
    sortie nyata untuk tanggal semu akan memasukkan informasi sortie ke plasebo (kontrol lolos justru karena ikut turun)."""
    if s in k["c_ctl"]:
        return k["c_ctl"][s]
    jenis, semua = k["jenis"], k["semua"]
    tk = komposit([semua[n] for n in k["tgt"]], jenis)
    out = []
    for n in k["kand"]:
        st = semua[n]
        if any(a <= s + 24 and b >= s - 24 and alat.jarak_km(c[0], c[1], st["lat"], st["lon"]) < KONTROL_KM[0] for a, b, c in k["sortie_pos"]):
            continue   # kontrol tak boleh berada dekat sortie lain (atau sortie ini) dalam +-24 jam
        pas = [(trf(tk[h], jenis), trf(st["d"][h], jenis)) for h in range(s - KORELASI_JAM, s) if h in tk and h in st["d"]]
        if len(pas) < KORELASI_PASANGAN_MIN:
            continue
        r = pearson([p[0] for p in pas], [p[1] for p in pas])   # None = nol-varian (hujan: tak ada jam hujan di basis) => ditolak
        if r is not None and r >= KORELASI_MIN:
            out.append(n)
    k["c_ctl"][s] = out
    return out


def rerata(komp, jam, jenis):
    v = [trf(komp[h], jenis) for h in jam]
    return sum(v) / len(v)


def ukur(k, s, e, W, ctl):
    """Satu pengukuran. Target dan kontrol dihitung pada IRISAN jam sama; mengembalikan dict dengan `D` bila berhasil, atau `gagal`."""
    semua, jenis = k["semua"], k["jenis"]
    ok_t, mati = siap(semua, k["tgt"], s, e, W, jenis)
    ok_c, _ = siap(semua, ctl, s, e, W, jenis)
    r = {"mati": bool(mati), "nk": len(ok_c), "ok_t": ok_t}
    if len(ok_c) < 2:
        r["gagal"] = "stasiun kontrol layak kurang dari 2"
        return r
    if not ok_t:
        r["gagal"] = "stasiun sasaran beku atau bernilai nol" if mati else "stasiun sasaran tak lengkap di sekitar sortie"
        return r
    tk, ck = komposit([semua[n] for n in ok_t], jenis), komposit([semua[n] for n in ok_c], jenis)
    pra = [h for h in range(s - PRA_JAM, s) if h in tk and h in ck]
    pas = [h for h in range(e, e + W) if h in tk and h in ck]
    if len(pra) < PRA_MIN or len(pas) < -(-W // 2):
        r["gagal"] = "jam sahih bersama di sekitar sortie kurang"
        return r
    t = (rerata(tk, pra, jenis), rerata(tk, pas, jenis))
    c = (rerata(ck, pra, jenis), rerata(ck, pas, jenis))
    r.update({"D": t[1] - t[0], "Dk": c[1] - c[0], "t": t, "c": c, "jam": pra + pas})
    return r


def titik_pra_pasca(arsip, provs, s, e, W):
    ar = arsip.get("titik") or {}
    pra = pas = 0
    ada = False
    for p in provs or []:
        if str(p) in ar:
            d = panen.ke_dict(ar[str(p)])
            ada = True
            pra += sum(d.get(h, {}).get("n", 0) for h in range(s - PRA_JAM, s))
            pas += sum(d.get(h, {}).get("n", 0) for h in range(e, e + W))
    return (pra / PRA_JAM * W, pas) if ada else None   # pra diskalakan ke panjang jendela pasca


def analisis(k, d):
    """Pengukuran + bendera untuk offset hari `d` (0 = nyata, >0 = tanggal semu). Di-cache; prosedur sama persis untuk keduanya."""
    if d in k["c_an"]:
        return k["c_an"][d]
    s, e = k["s"] - 24 * d, k["e"] - 24 * d
    ctl = kontrol_untuk(k, s)
    ms = {w: ukur(k, s, e, w, ctl) for w in k["W"]}
    m = ms[k["Wp"]]
    b = list(k["bend_tetap"])
    if m["mati"]:
        b.append("sensor_mati")
    if "D" in m:
        jam = m["jam"]
        if k["metrik"] == "pm25" and any(jenuh(k["semua"][n], jam) for n in m["ok_t"]):
            b.append("sensor_jenuh")
        if k["metrik"] != "hujan":
            e_w = range(e, e + k["Wp"])
            if any(h in st["d"] and st["d"][h] for st in k["hujan_dekat"] for h in e_w):
                b.append("hujan_di_sasaran")
        elif m["c"][1] >= HUJAN_KONTROL_MIN:
            b.append("hujan_alami_di_kontrol")
        tp = titik_pra_pasca(k["arsip"], k["prov"], s, e, k["Wp"])
        if tp and abs(tp[1] - tp[0]) >= 20 and (tp[0] == 0 or abs(tp[1] - tp[0]) / tp[0] > 0.5):
            b.append("titik_panas_berubah")
    k["c_an"][d] = {"ms": ms, "bend": b}
    return k["c_an"][d]


def persentil(v, p):
    v = sorted(v)
    i = (len(v) - 1) * p
    lo = int(math.floor(i))
    hi = min(lo + 1, len(v) - 1)
    return v[lo] + (v[hi] - v[lo]) * (i - lo)


def hari_bersih(k, maks):
    """Offset hari 1..maks tanpa sortie TERCATAT dalam +-24 jam dari jendela (digeser d hari)."""
    wmaks = max(k["W"])
    return [d for d in range(1, maks + 1)
            if not any(x <= k["e"] - 24 * d + wmaks + 24 and y >= k["s"] - 24 * d - 24 for x, y in k["sortie_h"])]


def pita(k, hari, kecuali=None):
    """([p10, p50, p90] | None, jumlah hari terpakai). Selisih mentah target pada jam yang sama di hari tanpa OMC."""
    ds = []
    for d in hari:
        if d != kecuali:
            m = analisis(k, d)["ms"][k["Wp"]]
            if "D" in m:
                ds.append(m["D"])
    if len(ds) < HARI_BASIS_MIN:
        return None, len(ds)
    return [persentil(ds, 0.1), persentil(ds, 0.5), persentil(ds, 0.9)], len(ds)


def kategori(k, ms, band, thr, bendera, sementara=False):
    """(kategori, alasan). alasan 'kandidat' = searah dan di luar pita tetapi tertahan bendera."""
    arah = ARAH[k["metrik"]]
    m = ms[k["Wp"]]
    if "D" not in m:
        return "data_kurang", m["gagal"]
    if band is None:
        return "data_kurang", f"hari tanpa OMC dalam {HARI_BASIS} hari terakhir kurang dari {HARI_BASIS_MIN} untuk pita diurnal"
    did = {w: x["D"] - x["Dk"] for w, x in ms.items() if "D" in x}
    cocok = sum(arah * x >= thr for x in did.values())
    lawan = sum(arah * x <= -thr for x in did.values())
    luar = m["D"] < band[0] if arah < 0 else m["D"] > band[2]
    if cocok >= 2 and luar:
        if sementara:
            return "data_kurang", "jendela sesudah sortie belum lengkap"
        return ("tak_terbedakan", "kandidat") if any(b in BLOK for b in bendera) else ("sejalan", "")
    if lawan >= 2:
        return "berlawanan", ""
    return "tak_terbedakan", ""


# ------------------------------------------------------------------ plasebo
def cp_atas(x, n, alpha=0.05):
    """Batas atas Clopper-Pearson satu sisi (1 - alpha) untuk x sukses dari n."""
    if n <= 0:
        return 1.0
    if x >= n:
        return 1.0
    lo, hi = 0.0, 1.0
    for _ in range(60):   # P(X <= x | p) menurun terhadap p; cari p dengan P = alpha
        p = (lo + hi) / 2
        cdf = sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(x + 1))
        lo, hi = (p, hi) if cdf > alpha else (lo, p)
    return hi


def plasebo(konfs, thr):
    """(n efektif = tanggal unik terevaluasi, x = tanggal unik dengan >= 1 'sejalan' palsu di konfigurasi mana pun)."""
    tgl, sj = set(), set()
    for k in konfs:
        bersih = hari_bersih(k, HARI_PLASEBO)
        band_hari = [d for d in bersih if d <= HARI_BASIS]
        for d in bersih:
            a = analisis(k, d)
            band, _ = pita(k, band_hari, kecuali=d)
            kat, _ = kategori(k, a["ms"], band, thr, a["bend"])
            if kat != "data_kurang":
                tgl.add((k["s"] - 24 * d) // 24)
                if kat == "sejalan":
                    sj.add((k["s"] - 24 * d) // 24)
    return len(tgl), len(sj)


def kalibrasi(konfs, kandidat):
    """Ambang terkecil dengan n efektif >= 30 dan batas atas CP <= 10%. Bila tak ada: terkalibrasi False (sejalan diblokir)."""
    kosong = {"n": 0, "sejalan": 0, "laju": None, "batas_atas": None, "ambang": kandidat[0], "terkalibrasi": False}
    if not konfs:
        return kosong
    for thr in kandidat:
        n, x = plasebo(konfs, thr)
        r = {"n": n, "sejalan": x, "laju": round(x / n, 3) if n else None, "batas_atas": round(cp_atas(x, n), 3) if n else None, "ambang": thr}
        r["terkalibrasi"] = n >= N_EFEKTIF_MIN and r["batas_atas"] <= PLASEBO_MAKS
        if r["terkalibrasi"]:
            return r
    return r


# ------------------------------------------------------------------ sortie -> episode
def waktu(x):
    if x in (None, ""):
        return None
    try:
        if isinstance(x, (int, float)):
            return dt.datetime.fromtimestamp(x / 1000 if x > 1e11 else x, UTC)
        return alat.dari_iso(str(x))
    except (ValueError, OverflowError, OSError):
        return None


def episode(sorties, kota=None):
    """Kelompokkan per bahan: gabung hanya bila jeda < 6 jam DAN jarak pusat sasaran < radius sasaran bahan itu.
    Sortie tanpa jam mulai satu episode sendiri; pusat tak dikenal = tidak digabung (tak bisa dibuktikan sedaerah)."""
    kota = kota if kota is not None else []
    tanpa = [[s] for s in sorties if waktu(s.get("mulai")) is None]
    ada = sorted((s for s in sorties if waktu(s.get("mulai")) is not None), key=lambda s: waktu(s["mulai"]))
    grup, pusat = [], {}
    for s in ada:
        pusat[s["id"]] = sasaran(s, kota)[0]
        for g in grup:
            if g[0]["bahan"] != s["bahan"] or not pusat[s["id"]]:
                continue
            jeda = (waktu(s["mulai"]) - max(waktu(x.get("selesai")) or waktu(x["mulai"]) for x in g)).total_seconds()
            pg = [pusat[x["id"]] for x in g]
            if jeda < 6 * 3600 and all(pg) and alat.jarak_km(pusat[s["id"]][0], pusat[s["id"]][1], sum(p[0] for p in pg) / len(pg),
                                                             sum(p[1] for p in pg) / len(pg)) < RADIUS_SASARAN_KM[s["bahan"]]:
                g.append(s)
                break
        else:
            grup.append([s])
    return grup + tanpa


# ------------------------------------------------------------------ kalimat
def fmt_pct(d):
    return f"{(math.exp(d) - 1) * 100:+.0f}".replace("-", "−") + " persen"


def daftar_bendera(bendera):
    return "; ".join(BENDERA_ID.get(b, b) for b in bendera)


def kalimat(metrik, kat, alasan, m, band, W, bendera, bahan):
    nm, nb = NAMA_ID[metrik], BAHAN_ID[bahan]
    if kat == "data_kurang":
        return f"{nm} belum bisa dinilai: {alasan}."
    d, dk = m["D"], m["Dk"]
    if metrik == "hujan":
        ubah = f"{'naik' if d >= 0 else 'turun'} {abs(d) * 100:.0f} poin persen"
        kontrol = f"stasiun kontrol berubah {dk * 100:+.0f} poin persen".replace("-", "−")
        pita_t = f"{band[0] * 100:+.0f} sampai {band[2] * 100:+.0f} poin persen".replace("-", "−")
    else:
        ubah = f"{'naik' if d >= 0 else 'turun'} {abs(math.exp(d) - 1) * 100:.0f} persen"
        kontrol = f"stasiun kontrol berubah {fmt_pct(dk)}"
        pita_t = f"{fmt_pct(band[0])} sampai {fmt_pct(band[2])}"
    dasar = f"{nm} di sasaran {ubah} dalam {W} jam sesudah {nb}; {kontrol}; pada jam yang sama di hari tanpa OMC, 80 persen perubahan berada di {pita_t}"
    if kat == "sejalan":
        return dasar + ". Perubahan ini searah dugaan dan keluar dari pita itu. Ini kesesuaian, bukan bukti sebab-akibat."
    if kat == "berlawanan":
        return dasar + ". Perubahan berlawanan arah dengan dugaan."
    if "plasebo_belum_terkalibrasi" in bendera:
        return dasar + ". Searah dugaan dan di luar pita, tetapi laju alarm palsu uji plasebo belum terkalibrasi, jadi belum boleh disebut sejalan."
    if alasan == "kandidat":
        return dasar + f". Searah dugaan dan di luar pita, tetapi tertahan oleh: {daftar_bendera([b for b in bendera if b in BLOK])}, jadi belum boleh disebut sejalan."
    cat = f" Catatan: {daftar_bendera(bendera)}." if bendera else ""
    return dasar + ". Perubahan ini masih dalam kisaran pola alami atau tidak melewati ambang." + cat


# ------------------------------------------------------------------ episode -> hasil
def siapkan(grup, ctx):
    """Bangun kerangka hasil + konfigurasi pengukuran per metrik (k atau None bila data_kurang sejak awal)."""
    bahan = grup[0]["bahan"]
    mulai = [waktu(x.get("mulai")) for x in grup]
    selesai = [waktu(x.get("selesai")) or waktu(x.get("mulai")) for x in grup]
    out = {"id": "ep-" + grup[0]["id"], "sortie_ids": [x["id"] for x in grup], "bahan": bahan,
           "mulai": alat.iso(min(mulai)) if mulai[0] else None, "selesai": alat.iso(max(selesai)) if mulai[0] else None,
           "metrik": [], "status": "final"}
    Ws, Wp = JENDELA[bahan]
    pl, ringer = [], []
    for x in grup:
        p, r, _ = sasaran(x, ctx["kota"])
        if p:
            pl.append(p)
        ringer += r
    pusat = (sum(p[0] for p in pl) / len(pl), sum(p[1] for p in pl) / len(pl)) if len(pl) == len(grup) else None
    alasan = "sortie tanpa jam mulai" if mulai[0] is None else ("sasaran tak dikenal" if pusat is None else None)
    s = panen.jam_idx(min(mulai)) if mulai[0] else None
    e = -(-int(max(selesai).timestamp()) // 3600) if mulai[0] else None
    if e is not None and ctx["sekarang_h"] < e + max(Ws) + 1:
        out["status"] = "sementara"
    prep = []
    for metrik in METRIK[bahan]:
        mo = {"nama": metrik, "stasiun_sasaran": [], "stasiun_kontrol": [], "sebelum": None, "sesudah": None, "kontrol_sebelum": None,
              "kontrol_sesudah": None, "pita_diurnal": None, "hari_pita": 0, "kategori": "data_kurang", "kalimat": "", "bendera": []}
        out["metrik"].append(mo)
        k, al = None, alasan
        if al is None:
            semua = ctx["seri"][metrik]
            jar = {n: alat.jarak_km(pusat[0], pusat[1], st["lat"], st["lon"]) for n, st in semua.items()}
            tgt = [n for n, st in semua.items() if (ringer and dalam(st["lat"], st["lon"], ringer)) or jar[n] <= RADIUS_SASARAN_KM[bahan]]
            tetap = []
            if not tgt:
                tgt = [n for n in sorted(jar, key=jar.get) if jar[n] <= RADIUS_CADANGAN_KM[bahan]][:2]
                tetap = ["radius_diperluas"] if tgt else []
            if not tgt:
                al = "tidak ada stasiun dalam atau dekat sasaran"
            else:
                kand = [n for n in semua if n not in tgt and KONTROL_KM[0] <= alat.jarak_km(pusat[0], pusat[1], semua[n]["lat"], semua[n]["lon"]) <= KONTROL_KM[1]]
                k = {"metrik": metrik, "jenis": metrik, "semua": semua, "tgt": sorted(tgt), "kand": kand, "W": Ws, "Wp": Wp, "s": s, "e": e,
                     "sortie_pos": ctx["sortie_pos"], "sortie_h": ctx["sortie_h"], "bend_tetap": tetap, "arsip": ctx["arsip"],
                     "prov": grup[0].get("prov"), "c_ctl": {}, "c_an": {}, "bahan": bahan,
                     "hujan_dekat": [st for st in ctx["seri"]["hujan"].values()
                                     if alat.jarak_km(pusat[0], pusat[1], st["lat"], st["lon"]) <= HUJAN_TETANGGA_KM]}
                mo["stasiun_sasaran"] = k["tgt"]
        if al is not None:
            mo["kalimat"] = kalimat(metrik, "data_kurang", al, None, None, Wp, [], bahan)
        prep.append((mo, k))
    return out, prep


def selesaikan(out, prep, plas):
    bahan = out["bahan"]
    Wp = JENDELA[bahan][1]
    for mo, k in prep:
        if k is None:
            continue
        a = analisis(k, 0)
        ms, bend = a["ms"], list(a["bend"])
        prim = ms[Wp]
        mo["stasiun_kontrol"] = sorted(kontrol_untuk(k, k["s"]))
        band, nh = pita(k, hari_bersih(k, HARI_BASIS))
        mo["pita_diurnal"] = [round(v, 3) for v in band] if band else None
        mo["hari_pita"] = nh
        if "D" in prim:
            f = (lambda v: v) if k["jenis"] == "hujan" else math.exp
            mo["sebelum"], mo["sesudah"] = [round(f(v), 2) for v in prim["t"]]
            mo["kontrol_sebelum"], mo["kontrol_sesudah"] = [round(f(v), 2) for v in prim["c"]]
        p = plas.get(f"{bahan}/{k['metrik']}") or {}
        kat, al = kategori(k, ms, band, p.get("ambang", AMBANG_KANDIDAT[k["metrik"]][0]), bend, out["status"] == "sementara")
        if kat == "sejalan" and not p.get("terkalibrasi"):
            kat, al = "tak_terbedakan", "kandidat"
            bend.append("plasebo_belum_terkalibrasi")
        if al == "jendela sesudah sortie belum lengkap":
            bend.append("jendela_belum_lengkap")
        mo["bendera"], mo["kategori"] = bend, kat
        mo["kalimat"] = kalimat(k["metrik"], kat, al, prim, band, Wp, bend, bahan)
    for mo, k in prep:
        if k is None and not mo["kalimat"]:
            mo["kalimat"] = f"{NAMA_ID[mo['nama']]} belum bisa dinilai: data tidak cukup."
    return out


def ringkas(episodes, plas):
    """Satu aturan untuk ringkasan DAN plasebo: hanya METRIK UTAMA per bahan (dry ice=PM2,5, NaCl=hujan) yang dihitung.
    Plasebo dikalibrasi per metrik; meng-OR-kan dua metrik akan menaikkan alarm palsu di atas yang dikalibrasi."""
    out = {}
    for bahan in ("nacl", "dry_ice"):
        eps = [e for e in episodes if e["bahan"] == bahan]
        if not eps:
            continue
        mu = UTAMA[bahan]
        def kat(e):
            return next((m["kategori"] for m in e["metrik"] if m["nama"] == mu), "data_kurang")
        cukup = [e for e in eps if kat(e) != "data_kurang"]
        sj = [e for e in cukup if kat(e) == "sejalan"]
        p = plas.get(f"{bahan}/{mu}")
        if p and p.get("laju") is not None:
            pl = f"; pada {p['n']} tanggal semu tanpa OMC, {p['laju'] * 100:.0f} persen terklasifikasi sejalan (batas atas {p['batas_atas'] * 100:.0f} persen)"
        else:
            pl = "; laju plasebo belum bisa dihitung (hari tanpa OMC kurang)"
        out[bahan] = {"metrik_utama": mu, "episode": len(eps), "berdata_cukup": len(cukup), "sejalan": len(sj),
                      "laju_plasebo": p.get("laju") if p else None, "batas_atas_plasebo": p.get("batas_atas") if p else None,
                      "kalimat": f"{len(sj)} dari {len(cukup)} episode berdata cukup sejalan dengan dugaan efek {BAHAN_ID[bahan]} "
                                 f"(metrik utama {NAMA_ID[mu]}; {len(eps)} episode seluruhnya){pl}."}
    return out


def hitung(sorties, arsip, sekarang, kota=None):
    kota = kota if kota is not None else alat.kota()
    sortie_h, sortie_pos = [], []
    for x in sorties:
        a = waktu(x.get("mulai"))
        if a:
            b = waktu(x.get("selesai")) or a
            sortie_h.append((panen.jam_idx(a), panen.jam_idx(b)))
            c = sasaran(x, kota)[0]
            if c:
                sortie_pos.append((panen.jam_idx(a), panen.jam_idx(b), c))
    ctx = {"seri": bangun_seri(arsip), "arsip": arsip, "kota": kota, "sortie_h": sortie_h, "sortie_pos": sortie_pos,
           "sekarang_h": panen.jam_idx(sekarang)}
    sp = [siapkan(g, ctx) for g in episode(sorties, kota)]
    konfs = {}
    for out, prep in sp:
        for mo, k in prep:
            if k is not None:
                konfs.setdefault(f"{out['bahan']}/{k['metrik']}", []).append(k)
    plas = {kk: kalibrasi(v, AMBANG_KANDIDAT[kk.split("/")[1]]) for kk, v in konfs.items()}
    eps = sorted((selesaikan(o, p, plas) for o, p in sp), key=lambda e: e["mulai"] or "")
    return eps, plas


# ------------------------------------------------------------------ I/O
def sah(x):
    if not (isinstance(x, dict) and x.get("id") and x.get("bahan") in BAHAN_ID):
        return False
    a, b = waktu(x.get("mulai")), waktu(x.get("selesai"))
    return not (a and b and b < a)   # selesai sebelum mulai = data rusak


def validasi(d):
    if not isinstance(d, dict) or not isinstance(d.get("sortie"), list):
        alat.log("::warning title=omc nilai::bentuk /api/omc/sortie tak dikenal, evaluasi dilewati")
        return None
    ok = [x for x in d["sortie"] if sah(x)]
    if len(ok) != len(d["sortie"]):
        alat.log(f"::warning title=omc nilai::{len(d['sortie']) - len(ok)} sortie dibuang (id/bahan tak sah atau selesai < mulai)")
    return ok


def ambil_sortie(sejak, url=URL_SORTIE):
    """Daftar sortie dari Worker; None bila endpoint belum ada atau jaringan putus (bukan galat)."""
    try:
        d = alat.ambil(f"{url}?sejak={sejak}", timeout=30)
    except Exception as ex:
        alat.log(f"::warning title=omc nilai::endpoint sortie belum bisa dibaca ({type(ex).__name__}), evaluasi dilewati")
        return None
    return validasi(d)


def jalankan(sorties=None, berkas=HASIL, arsip_berkas=ARSIP, sekarang=None, sejak_hari=60):
    sekarang = sekarang or dt.datetime.now(UTC)
    if sorties is None:
        sorties = ambil_sortie((sekarang - dt.timedelta(days=sejak_hari)).date().isoformat())
        if sorties is None:
            return None
    if not os.path.exists(arsip_berkas):
        alat.log("::warning title=omc nilai::omc_arsip.json belum ada, evaluasi dilewati")
        return None
    eps, plas = hitung(sorties, alat.muat(arsip_berkas), sekarang)
    try:
        dibuat = alat.muat(berkas)["dibuat"]
    except (FileNotFoundError, ValueError, KeyError):
        dibuat = sekarang.strftime("%Y-%m-%dT%H:%M:%SZ")
    hasil = {"dibuat": dibuat, "diperbarui": sekarang.strftime("%Y-%m-%dT%H:%M:%SZ"), "sortie": len(sorties), "episode": eps,
             "ringkas": ringkas(eps, plas), "plasebo": plas, "ambang": {k: v["ambang"] for k, v in plas.items()},
             "keterbatasan": KETERBATASAN, "label": {"pm25": "BMKG", "jarak_pandang": "METAR (diolah IEM)", "hujan": "METAR (diolah IEM)",
                                                       "evaluasi": "Centurisk97"},
             "catatan": FOOTER}
    kb = alat.simpan(berkas, hasil)
    alat.log(f"omc_hasil: {len(eps)} episode dari {len(sorties)} sortie; {kb / 1024:.0f} KB")
    return hasil


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("perintah", nargs="?", default="jalan")
    ap.add_argument("--sortie", help="berkas JSON {sortie:[...]} sebagai pengganti endpoint")
    a = ap.parse_args()
    if a.perintah == "uji":
        return uji()
    jalankan(validasi(alat.muat(a.sortie)) if a.sortie else None)


# ------------------------------------------------------------------ self-check
POS = {"T": (-2.2, 113.9), "T2": (-2.1, 113.8), "K1": (-3.3, 114.6), "K2": (-0.5, 114.5), "K3": (-2.9, 111.6)}
BND = {"B1": (-2.2, 113.9), "B2": (-3.3, 114.6), "B3": (-0.5, 114.5)}   # bandara rekaan di posisi yang sama dengan T, K1, K2
HARI_FIX = 60


def _fixture(pm_extra=True, jv_extra=True, hujan_extra=False):
    """Arsip sintetis 60 hari: pola diurnal besar bersama + derau harian bersama; sasaran T/T2/B1, kontrol K*/B*.
    Peristiwa: 20 Okt 06Z sasaran PM2,5 turun 1,3 (log), jarak pandang naik 1,3, hujan B1 menyala 13 jam (bila diminta)."""
    import random
    now = dt.datetime(2026, 10, 21, 12, 0, tzinfo=UTC)
    h1 = panen.jam_idx(now)
    h0 = h1 - HARI_FIX * 24
    rng = random.Random(7)
    hari = {d: rng.gauss(0, 0.3) for d in range(-2, HARI_FIX + 5)}
    hs = h1 - 30
    ev = lambda h: hs + 2 <= h < hs + 14

    def diur(h):
        return 0.9 * math.cos(2 * math.pi * ((h % 24) - 3) / 24)

    ar = {"dibuat": "2026-10-01T00:00:00Z", "pm25": {}, "metar": {}, "titik": {}}
    rs = {n: random.Random(i) for i, n in enumerate(list(POS) + list(BND))}
    for n, (la, lo) in POS.items():
        v = [round(300 * math.exp(diur(h) + hari[(h - h0) // 24] + rs[n].gauss(0, 0.06) + (-1.3 if n in ("T", "T2") and pm_extra and ev(h) else 0)), 1)
             for h in range(h0, h1 + 1)]
        ar["pm25"][n] = {"t0": panen.idx_iso(h0), "lat": la, "lon": lo, "v": v}
    laten = random.Random(99)
    basah = {h: 1 if laten.random() < 0.12 else 0 for h in range(h0, h1 + 1)}   # hujan regional bersama
    for n, (la, lo) in BND.items():
        vis, wx = [], []
        for h in range(h0, h1 + 1):
            j = 800 * math.exp(-diur(h) + hari[(h - h0) // 24] + rs[n].gauss(0, 0.06) + (1.3 if n == "B1" and jv_extra and ev(h) else 0))
            vis.append(round(j / 1609.344, 3))
            sendiri = rs[n].random() < 0.01
            hj = basah[h] or sendiri or (n == "B1" and hujan_extra and ev(h))
            wx.append("-RA" if hj else "")
        ar["metar"][n] = {"t0": panen.idx_iso(h0), "vis": [round(x * 1609.344 / 10) * 10 for x in vis], "wx": wx}
    ar["_hs"] = hs
    return ar, now, hs


def uji():
    import copy
    import tempfile
    BANDARA_LL.update(BND)
    ar, now, hs = _fixture()
    ar.pop("_hs")
    poligon = {"type": "Polygon", "coordinates": [[[113.5, -2.6], [114.3, -2.6], [114.3, -1.8], [113.5, -1.8], [113.5, -2.6]]]}

    def sortie(i, mulai_h, bahan="dry_ice", **kw):
        d = {"id": i, "operasi_id": "op", "pesawat": "PK-X", "mulai": alat.iso(dt.datetime.fromtimestamp(mulai_h * 3600, UTC)),
             "selesai": alat.iso(dt.datetime.fromtimestamp((mulai_h + 1) * 3600, UTC)), "bahan": bahan, "kg": 800, "ketinggian_kaki": 10000,
             "sasaran_kab": [], "sasaran_poligon": poligon, "lintas": False, "prov": ["62"]}
        d.update(kw)
        return d

    def met(eps, nama, i=0):
        return {x["nama"]: x for x in eps[i]["metrik"]}[nama]

    def jalan(s, arsip=ar, sk=now):
        return hitung(s, arsip, sk, kota=[])

    # 1. PM2,5 turun melampaui pita, kontrol stabil => sejalan; plasebo terkalibrasi (n efektif >= 30, batas atas CP <= 10%)
    eps, plas = jalan([sortie("s1", hs)])
    m = met(eps, "pm25")
    p = plas["dry_ice/pm25"]
    assert m["kategori"] == "sejalan" and eps[0]["status"] == "final", m
    assert p["terkalibrasi"] and p["n"] >= N_EFEKTIF_MIN and p["batas_atas"] <= PLASEBO_MAKS, p
    assert m["hari_pita"] >= HARI_BASIS_MIN and len(m["stasiun_kontrol"]) >= 2 and not m["bendera"], m
    assert "berhasil" not in m["kalimat"] and "efektif" not in m["kalimat"] and "persen" in m["kalimat"], m["kalimat"]
    # 1b. jalur jarak_pandang (dry ice, metrik pendukung) lewat bandara rekaan: sejalan juga, plasebo terpisah
    assert met(eps, "jarak_pandang")["kategori"] == "sejalan" and plas["dry_ice/jarak_pandang"]["terkalibrasi"], met(eps, "jarak_pandang")
    # 2. penurunan SAMA dengan pola diurnal => tak_terbedakan, persis kasus 1.907->1.200 (turun besar, tapi kontrol dan pita ikut)
    eps, _ = jalan([sortie("s2", hs - 5 * 24)])
    assert met(eps, "pm25")["kategori"] == "tak_terbedakan", met(eps, "pm25")
    # 2b. diurnal murni yang turun > 36 persen dalam 3 jam (pagi-siang 11Z) TETAP tak_terbedakan, bukan data_kurang
    eps, _ = jalan([sortie("s2b", hs - 3 * 24 + 5)])
    m = met(eps, "pm25")
    assert m["sesudah"] / m["sebelum"] < 0.64 and m["kategori"] == "tak_terbedakan", m
    # 3. sortie tanpa jam mulai => data_kurang; selesai < mulai ditolak validasi
    eps, _ = jalan([sortie("s3", hs, mulai=None, selesai=None)])
    assert all(x["kategori"] == "data_kurang" for x in eps[0]["metrik"]) and "tanpa jam mulai" in eps[0]["metrik"][0]["kalimat"]
    assert validasi({"sortie": [sortie("r", hs, selesai=alat.iso(dt.datetime.fromtimestamp((hs - 2) * 3600, UTC)))]}) == []
    # 4. kontrol tak tersedia => data_kurang
    sendiri = dict(ar, pm25={"T": ar["pm25"]["T"]}, metar={})
    eps, _ = jalan([sortie("s4", hs)], sendiri)
    assert met(eps, "pm25")["kategori"] == "data_kurang" and "kontrol" in met(eps, "pm25")["kalimat"]
    # 5. arsip pendek (seperti produksi: ~5 hari) => plasebo tak terkalibrasi, jujur data_kurang
    pendek = dict(ar, pm25={n: dict(s, t0=panen.idx_iso(panen.iso_idx(s["t0"]) + 55 * 24), v=s["v"][55 * 24:]) for n, s in ar["pm25"].items()})
    eps, plas = jalan([sortie("s5", hs)], pendek)
    assert not plas["dry_ice/pm25"]["terkalibrasi"] and met(eps, "pm25")["kategori"] == "data_kurang"
    # 5b. kalimat khusus bila searah dan di luar pita tetapi plasebo belum terkalibrasi (n efektif dipaksa kecil)
    asli = globals()["N_EFEKTIF_MIN"]
    globals()["N_EFEKTIF_MIN"] = 10_000
    AMBANG_KANDIDAT["pm25"] = [0.25]
    try:
        eps, plas = jalan([sortie("s5b", hs)])
    finally:
        globals()["N_EFEKTIF_MIN"] = asli
        AMBANG_KANDIDAT["pm25"] = [0.25, 0.35, 0.5, 0.7, 1.0]
    m = met(eps, "pm25")
    assert m["kategori"] == "tak_terbedakan" and "plasebo_belum_terkalibrasi" in m["bendera"] and "belum boleh disebut sejalan" in m["kalimat"], m
    # 6. status sementara tidak pernah sejalan
    eps, _ = jalan([sortie("s6", hs)], ar, dt.datetime.fromtimestamp((hs + 4) * 3600, UTC))
    assert eps[0]["status"] == "sementara" and met(eps, "pm25")["kategori"] != "sejalan", met(eps, "pm25")
    # 7. hujan alami di sasaran (METAR bandara sasaran basah pada jendela pasca) tidak boleh sejalan
    a7, _, _ = _fixture(hujan_extra=True)
    a7.pop("_hs")
    eps, _ = jalan([sortie("s7", hs)], a7)
    m = met(eps, "pm25")
    assert m["kategori"] == "tak_terbedakan" and "hujan_di_sasaran" in m["bendera"] and "hujan" in m["kalimat"], m
    # 8. sensor beku (dua stasiun sasaran, satu beku) dan sensor nol => bendera sensor_mati, tidak sejalan
    a8 = copy.deepcopy(ar)
    v = a8["pm25"]["T"]["v"]
    i0 = (hs + 1) - panen.iso_idx(a8["pm25"]["T"]["t0"])
    for i in range(i0 - 6, i0 + 12):
        v[i] = 321.5
    eps, _ = jalan([sortie("s8", hs)], a8)
    m = met(eps, "pm25")
    assert "sensor_mati" in m["bendera"] and m["kategori"] != "sejalan", m
    assert sensor_mati({1: 5.0, 2: 5.0, 3: 5.0, 4: 5.0}, [1, 2, 3, 4]) and sensor_mati({1: 0.0, 2: 3.0}, [1, 2]) and not sensor_mati({1: 5.0, 2: 6.0, 3: 5.0, 4: 5.0}, [1, 2, 3, 4])
    for n in ("T", "T2"):   # keduanya nol => tak ada sasaran sahih => data_kurang
        for i in range(i0 - 6, i0 + 12):
            a8["pm25"][n]["v"][i] = 0.0
    eps, _ = jalan([sortie("s8b", hs)], a8)
    assert met(eps, "pm25")["kategori"] == "data_kurang" and "sensor_mati" in met(eps, "pm25")["bendera"]
    # 9. sensor jenuh: nilai pra menyentuh batas mutlak 1900 dan plafon historis per stasiun
    a9 = copy.deepcopy(ar)
    for n in ("T", "T2"):
        for i in range(i0 - 6, i0):
            a9["pm25"][n]["v"][i] = 1950.0 + i % 3
    eps, _ = jalan([sortie("s9", hs)], a9)
    assert "sensor_jenuh" in met(eps, "pm25")["bendera"] and met(eps, "pm25")["kategori"] != "sejalan"
    assert jenuh({"d": {1: 990.0}, "cap": 1000.0, "cap_n": 3}, [1]) and not jenuh({"d": {1: 990.0}, "cap": 1000.0, "cap_n": 1}, [1])
    # 10. radius diperluas (tak ada stasiun dalam 40 km/poligon) memblokir sejalan
    jauh = {"type": "Polygon", "coordinates": [[[113.7, -2.9], [114.1, -2.9], [114.1, -2.7], [113.7, -2.7], [113.7, -2.9]]]}
    eps, _ = jalan([sortie("s10", hs, sasaran_poligon=jauh)])
    m = met(eps, "pm25")
    assert "radius_diperluas" in m["bendera"] and m["kategori"] != "sejalan", m
    # 11. NaCl/hujan: B1 hujan 13 jam sesudah sortie, kontrol B2/B3 tidak => sejalan; tanpa peristiwa => tidak
    a11, _, _ = _fixture(pm_extra=False, jv_extra=False, hujan_extra=True)
    a11.pop("_hs")
    eps, plas = jalan([sortie("n1", hs, bahan="nacl")], a11)
    m = met(eps, "hujan")
    assert m["kategori"] == "sejalan" and plas["nacl/hujan"]["terkalibrasi"], (m, plas)
    eps, _ = jalan([sortie("n2", hs - 4 * 24, bahan="nacl")], a11)
    assert met(eps, "hujan")["kategori"] != "sejalan"
    assert hujan_wx("-RA") and hujan_wx("TSRA") and hujan_wx("+SHRA") and hujan_wx("TS") and hujan_wx("DZ")
    assert not hujan_wx("VCTS") and not hujan_wx("RERA") and not hujan_wx("VCSH") and not hujan_wx("FU")
    # 12. episode: beda bahan terpisah; jeda < 6 jam digabung hanya bila pusat sasaran dekat; kab dikenal lewat kota.json
    jauh2 = {"type": "Polygon", "coordinates": [[[100.0, 0.0], [100.1, 0.0], [100.1, 0.1], [100.0, 0.1], [100.0, 0.0]]]}
    g = episode([sortie("a", hs), sortie("b", hs + 3), sortie("c", hs + 3, bahan="nacl"), sortie("d", hs + 30), sortie("e", hs + 4, sasaran_poligon=jauh2)])
    assert sorted(len(x) for x in g) == [1, 1, 1, 2], [len(x) for x in g]
    p, _, kab = sasaran({"sasaran_kab": ["62|Kota Palangkaraya"]}, alat.kota())
    assert kab and abs(p[0] + 2.183) < 0.01
    # 13. ringkasan hanya metrik utama; plasebo ditulis berdampingan dengan batas atas
    eps, plas = jalan([sortie("s13", hs)])
    r = ringkas(eps, plas)["dry_ice"]
    assert r["metrik_utama"] == "pm25" and "1 dari 1" in r["kalimat"] and "batas atas" in r["kalimat"] and "tanggal semu" in r["kalimat"], r
    assert cp_atas(0, 30) < 0.10 < cp_atas(0, 20) and cp_atas(3, 30) > 0.10
    # 14. berkas: `dibuat` pertama, tidak berubah; keterbatasan tertulis
    with tempfile.TemporaryDirectory() as td:
        a, f = os.path.join(td, "a.json"), os.path.join(td, "h.json")
        alat.simpan(a, ar)
        h1 = jalankan([sortie("s1", hs)], f, a, now)
        assert next(iter(h1)) == "dibuat" and any("Palangka Raya" in x for x in h1["keterbatasan"])
        h2 = jalankan([sortie("s1", hs)], f, a, now + dt.timedelta(hours=6))
        assert h2["dibuat"] == h1["dibuat"] and h2["episode"][0]["id"] == "ep-s1" and h2["catatan"] == FOOTER
    assert validasi({"sortie": [{"id": "x", "bahan": "nacl"}, {"id": "y", "bahan": "air"}]}) == [{"id": "x", "bahan": "nacl"}]
    assert validasi({"x": 1}) is None
    print("uji nilai: ok")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as ex:
        print(f"nilai gagal: {type(ex).__name__}: {ex}", file=sys.stderr)
        sys.exit(1)
