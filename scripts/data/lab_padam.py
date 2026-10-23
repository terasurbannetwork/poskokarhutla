"""LAB: metode terbaik untuk "LUAS MASIH TERDETEKSI / BELUM PADAM" dan seberapa sering "tak terdeteksi" != padam -> public/data/lab/padam.json (+ padam_ringkas.md)

BUKAN produksi: tidak mengubah harian.py/aturan.py. Memakai ulang fungsi produksi apa adanya: harian.dbscan (kejadian), harian.pix (piksel unik), aturan.kelas_dc,
firms_sumber (pilih SP/NRT, saring kunci), fwi.deret (DC Van Wagner), wilayah.Poligon (gambut), garis_api.PIKSEL_HA (faktor luas sementara), luas_citra (dNBR, opsional).
numpy dipakai (job lab menyediakannya; produksi tetap stdlib).

PERTANYAAN
  Aturan produksi: kompleks aktif bila terdeteksi <= 72 jam, <= 168 jam di gambut DC > 350 (harian.py AKTIF_JAM/AKTIF_GAMBUT_JAM); verifikasi padam instansi
  (src/instansi.js) = 48 jam tanpa titik dalam 2 km. Tak ada rujukan terbitan untuk 168 jam. Seberapa sering api yang "tak terdeteksi" X jam ternyata muncul lagi <= 7 hari,
  dan adakah aturan berbasis LINTASAN BERSIH (bukan jam) yang menekan "padam palsu" tanpa menunda pernyataan padam terlalu lama?

DATA (diunduh di `jalan`, di-cache di data/raw/lab/padam/)
  FIRMS VIIRS S-NPP + NOAA-20 arsip SP, 1 Jul..20 Des, tahun 2019 + 2023 (El Nino, kering) dan 2020 + 2022 (basah), kotak Indonesia, keyakinan nominal+tinggi (kunci FEDS).
  Cuaca ERA5 (Open-Meteo archive) per sel 0,5 derajat: suhu/RH/angin/hujan jam 12 setempat -> DC (fwi.deret, mulai 1 Mar) + cloud_cover per jam UTC.
  Hanya SEL SAMPEL (peringkat jumlah titik, setengah gambut) yang ditarik cuacanya: kuota Open-Meteo gratis 5.000 bobot/jam (bobot = lokasi x hari/14); tiap `jalan` dibatasi
  KUOTA_BOBOT. Kejadian di sel tanpa cuaca dibuang dan dilaporkan.

METODE
  1. Kejadian = harian.dbscan(jam=48) per tahun (episode). t_akhir = deteksi terakhir. Jejak = titik 24 jam terakhir.
  2. "Lintasan": tiap satelit (S-NPP, NOAA-20) x {siang ~13:30, malam ~01:30 waktu surya setempat} = satu kesempatan pengamatan (jam surya dikalibrasi dari acq_time).
     Lintasan BERAWAN bila ERA5 cloud_cover jam lintas >= ambang (60/80/90 disetel); lintasan <= 1,5 jam sesudah t_akhir tak dihitung (itu lintasan deteksinya sendiri).
  3. Muncul ulang = deteksi pertama sesudah t_akhir dalam <= 1 km dari jejak. Kaplan-Meier (tersensor di akhir data) -> P(muncul ulang <= 7 hari | tak terdeteksi g jam) dan
     P(... | k lintasan bersih berturut-turut tanpa deteksi), dipisah gambut/mineral, kelas DC, tahun kering/basah, ukuran; selang bootstrap kejadian.
  4. Aturan: A0 produksi; A1 48 jam; A2 k lintasan bersih (k=2..8); A3 k terpisah gambut/mineral; A4 A3 + kelas DC. Dinyatakan padam pada waktu D (jam sesudah t_akhir).
     Padam palsu = dinyatakan padam (D < muncul ulang) lalu muncul ulang <= D + 168 jam. Keterlambatan = rata-rata D pada padam benar, dibanding A0 BERPASANGAN.
  5. Kriteria DIPRA-TULIS (KRITERIA) dan ditulis ke JSON sebelum angka dihitung. Parameter disetel di satu pasang tahun dan diuji di pasangan lain, dua arah.
  6. Luas: tiga angka (aktif teramati, tak teramati, kandidat padam), BUKAN satu, pada beberapa snapshot.
  7. Sentinel-2 (opsional, <= 30 kejadian): dNBR antara dua citra bersih berurutan sesudah dinyatakan padam; dilewati bila STAC tak terjangkau.

Pakai:  python3 scripts/data/lab_padam.py uji       self-check sintetis, tanpa jaringan
        python3 scripts/data/lab_padam.py jalan     unduh + hitung (FIRMS_MAP_KEY; LAB_MENIT = anggaran menit, bawaan 30)
        python3 scripts/data/lab_padam.py ringkas   tulis ulang padam_ringkas.md dari padam.json
"""
import bisect, collections, datetime as dt, gzip, json, math, os, random, statistics, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aturan as A  # noqa: E402
import firms_sumber as FS  # noqa: E402
import fwi as F  # noqa: E402
import garis_api as GA  # noqa: E402
import harian as H  # noqa: E402
from wilayah import AKAR, Poligon  # noqa: E402

KELUAR = os.path.join(AKAR, "public/data/lab/padam.json")
RINGKAS = os.path.join(AKAR, "public/data/lab/padam_ringkas.md")
LUAS_JSON = os.path.join(AKAR, "public/data/lab/luas.json")
GAMBUT = os.path.join(AKAR, "public/data/lahan/gambut.geojson")
CACHE = os.path.join(AKAR, "data/raw/lab/padam")
UTC = dt.timezone.utc
BBOX = H.BBOX
FAMILI = ("VIIRS_SNPP", "VIIRS_NOAA20")

TAHUN = {2019: "kering", 2023: "kering", 2020: "basah", 2022: "basah"}
LIPAT = [{"setel": [2019, 2020], "uji": [2022, 2023]}, {"setel": [2022, 2023], "uji": [2019, 2020]}]
AKHIR_DATA = (12, 20)        # unduhan sampai 20 Des; kejadian dinilai bila t_akhir <= 30 Nov (tindak lanjut >= 20 hari)
AKHIR_KEJADIAN = (11, 30)
AWAL_CUACA = (3, 1)
AMBANG_AWAN = (60, 80, 90)
AMBANG_UTAMA = 80
KMAKS = 12
CAP_JAM = 240                # D lebih dari 10 hari = tak dinyatakan
HORIZON_PALSU = 168          # muncul ulang <= 7 hari sesudah dinyatakan
RADIUS_KM = 1.0
LINTAS_MIN_JAM = 1.5
NMIN = 30                    # kejadian dinyatakan per strata agar vonis laju padam palsu dihitung
KUOTA_BOBOT = 4600           # per jalan; batas Open-Meteo 5.000/jam (dan 10.000/hari)
SEL_G, SEL_M = 26, 26        # sel sampel gambut / mineral
MAKS_KEJADIAN_TAHUN = 30000
BOOT = 100
PX_UTAMA = 3
SEED = 20261023

# DIPRA-TULIS: dipakai apa adanya; ditulis ke JSON sebelum satu angka hasil dihitung (jalan, tahap "kriteria").
KRITERIA = {
    "padam_palsu_maks": 0.10,
    "padam_palsu_di": "gambut DAN mineral, pada tahun UJI (titik, bukan batas atas)",
    "keterlambatan_maks_vs_A0_jam": 24,
    "keterlambatan_cara": "rata-rata selisih D(aturan) - D(A0) BERPASANGAN pada kejadian yang kedua aturannya menyatakan padam benar",
    "uji_silang": "setel di 2019+2020 uji di 2022+2023, dan sebaliknya; aturan lolos bila lolos di KEDUA arah",
    "n_min_dinyatakan_per_strata": NMIN,
    "populasi_utama": "kejadian dengan >= %d piksel unik (harian.pix); semua ukuran hanya kepekaan" % PX_UTAMA,
    "pemilihan": "dari yang lolos: keterlambatan uji terkecil; seri: A2 < A3 < A4 (lebih sederhana)",
    "ambang_awan_disetel": list(AMBANG_AWAN),
    "ambang_awan_awal": AMBANG_UTAMA,
    "definisi": {
        "padam_palsu": "dinyatakan padam (D < muncul ulang) lalu muncul ulang <= %d jam kemudian dalam <= %.0f km dari jejak" % (HORIZON_PALSU, RADIUS_KM),
        "lintasan_bersih": "lintasan satelit (S-NPP/NOAA-20 x siang/malam) dengan cloud_cover ERA5 jam lintas < ambang; berawan bila >= ambang",
        "A0": "72 jam; 168 jam bila gambut dan DC > 350 (harian.py)", "A1": "48 jam (src/instansi.js)",
        "A2": "k lintasan bersih berturut-turut tanpa deteksi, k sama untuk semua (k=2..8)",
        "A3": "k_gambut dan k_mineral berbeda (k=2..%d)" % KMAKS, "A4": "A3 + k per kelas DC (<200, 200-350, >350) x gambut/mineral",
    },
}


# ---------------------------------------------------------------- murni (diuji)
def wilson(x, n, z=1.959964):
    if n <= 0:
        return None
    p = x / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0.0, c - h), 4), round(min(1.0, c + h), 4)]


def kelas_dc3(dc):
    return "<200" if dc < 200 else "200-350" if dc <= 350 else ">350"


def kelas_ukuran(px):
    return "1" if px <= 1 else "2-4" if px <= 4 else "5-19" if px <= 19 else ">=20"


def lintasan(t_akhir, lon, jam_lokal, maks_jam=CAP_JAM, min_jam=LINTAS_MIN_JAM):
    """[(offset_jam, satelit, siangmalam)] urut. jam_lokal = {(satelit, 'D'|'N'): jam surya setempat}; UTC = lokal - lon/15."""
    out = []
    d0 = t_akhir.replace(hour=0, minute=0, second=0, microsecond=0) - dt.timedelta(days=1)
    for hari in range(int(maks_jam / 24) + 3):
        tgl = d0 + dt.timedelta(days=hari)
        for (sat, dn), jam in jam_lokal.items():
            utc = tgl + dt.timedelta(hours=jam - lon / 15)
            off = (utc - t_akhir).total_seconds() / 3600
            if min_jam < off <= maks_jam:
                out.append((round(off, 3), sat, dn))
    return sorted(out)


def awan_jam(cw, utc):
    """cloud_cover (%) ERA5 pada jam UTC terdekat, atau None bila di luar jangkauan/kosong."""
    i = round((utc - cw["utc0"]).total_seconds() / 3600)
    cc = cw["cc"]
    return cc[i] if 0 <= i < len(cc) else None


def lintas_bersih(pasang, cw, t_akhir, ambang):
    """pasang: keluaran lintasan(). -> offset jam lintasan BERSIH (cloud < ambang). Awan kosong dianggap berawan (konservatif)."""
    out = []
    for off, _, _ in pasang:
        c = awan_jam(cw, t_akhir + dt.timedelta(hours=off))
        if c is not None and c < ambang:
            out.append(off)
    return out


def km_s(T, E, H_):
    """Kaplan-Meier diskret per jam: S[h] = P(T > h), h=0..H_. T bilangan bulat (jam), E True bila kejadian; T > H_ tersensor di H_."""
    import numpy as np
    T = np.minimum(np.asarray(T, dtype=np.int64), H_ + 1)
    E = np.asarray(E, dtype=bool) & (T <= H_)
    d = np.bincount(T[E], minlength=H_ + 2)[:H_ + 1].astype(float)
    c = np.bincount(T[~E], minlength=H_ + 2)[:H_ + 1].astype(float)
    n = len(T) - np.concatenate([[0.0], np.cumsum(d + c)[:-1]])
    haz = np.divide(d, n, out=np.zeros_like(d), where=n > 0)
    return np.cumprod(1 - haz)


def p_muncul(S, g, w=HORIZON_PALSU):
    """P(muncul ulang dalam w jam berikut | belum muncul sampai jam g) = 1 - S[g+w]/S[g]."""
    if g + w >= len(S) or S[g] <= 0:
        return None
    return float(1 - S[g + w] / S[g])


def klasif(ep, D):
    """-> 'tak' (tak dinyatakan <= CAP), 'sebelum' (muncul ulang sebelum D: tetap aktif), 'palsu', 'benar'."""
    if D is None or D > CAP_JAM:
        return "tak"
    Tn = ep["Tn"]
    if Tn is not None and Tn <= D:
        return "sebelum"
    return "palsu" if Tn is not None and Tn <= D + HORIZON_PALSU else "benar"


def D_aturan(ep, ar):
    t = ar["tipe"]
    if t == "A0":
        return 168.0 if ep["gb"] and A.kelas_dc(ep["dc"]) == 3 else 72.0
    if t == "A1":
        return 48.0
    cp = ep["cp"][ar["thr"]]
    if t == "A2":
        k = ar["k"]
    elif t == "A3":
        k = ar["kg"] if ep["gb"] else ar["km"]
    else:
        k = ar["k"][kunci_dc(ep)]
    return cp[k - 1] if len(cp) >= k else None


def kunci_dc(ep):
    return ("g" if ep["gb"] else "m") + "|" + kelas_dc3(ep["dc"])


def metrik(eps, Ds, thr=AMBANG_UTAMA):
    c = collections.Counter(klasif(e, D) for e, D in zip(eps, Ds))
    dec = c["palsu"] + c["benar"]
    tel = [D for e, D in zip(eps, Ds) if klasif(e, D) == "benar"]
    ada = [(e, D) for e, D in zip(eps, Ds) if D is not None and D <= CAP_JAM]
    tb = sum(1 for e, D in ada if not any(o <= D for o in e["cp"][thr]))
    return {"n": len(eps), "n_dinyatakan": dec, "n_palsu": c["palsu"], "palsu": round(c["palsu"] / dec, 4) if dec else None,
            "palsu_wilson": wilson(c["palsu"], dec), "n_muncul_sebelum_dinyatakan": c["sebelum"], "n_tak_dinyatakan": c["tak"],
            "telat_jam": round(sum(tel) / len(tel), 1) if tel else None,
            "aktif_tanpa_bersih": round(tb / len(ada), 4) if ada else None, "n_aktif_dinyatakan_dalam_cap": len(ada)}


def tabel_k(eps, thr):
    """{kunci_strata: {k: [n_dinyatakan, n_palsu, jumlah_D_benar, n_benar]}} untuk k=1..KMAKS; strata 'g'/'m' dan 'g|kelas'/'m|kelas'."""
    t = collections.defaultdict(lambda: {k: [0, 0, 0.0, 0] for k in range(1, KMAKS + 1)})
    for e in eps:
        cp = e["cp"][thr]
        for k in range(1, min(KMAKS, len(cp)) + 1):
            c = klasif(e, cp[k - 1])
            if c in ("palsu", "benar"):
                for s in ("g" if e["gb"] else "m", kunci_dc(e)):
                    r = t[s][k]
                    r[0] += 1
                    r[1] += c == "palsu"
                    if c == "benar":
                        r[2] += cp[k - 1]
                        r[3] += 1
    return t


def _ok(r, batas):
    return r[0] >= NMIN and r[1] / r[0] <= batas


def setel(eps, batas=KRITERIA["padam_palsu_maks"]):
    """Setel A2, A3, A4 pada kejadian `eps`. -> {'A2': param|None, 'A3': ..., 'A4': ...}; None = tak ada k <= KMAKS yang memenuhi."""
    hasil = {"A2": None, "A3": None, "A4": None}
    best = {"A2": None, "A3": None, "A4": None}
    for thr in AMBANG_AWAN:
        t = tabel_k(eps, thr)
        # A2: k sama, k=2..8, gambut DAN mineral
        for k in range(2, 9):
            g, m = t["g"][k], t["m"][k]
            if _ok(g, batas) and _ok(m, batas):
                tel = (g[2] + m[2]) / max(1, g[3] + m[3])
                if best["A2"] is None or tel < best["A2"]:
                    best["A2"], hasil["A2"] = tel, {"tipe": "A2", "thr": thr, "k": k, "telat_setel_jam": round(tel, 1)}
                break
        kg = next((k for k in range(2, KMAKS + 1) if _ok(t["g"][k], batas)), None)
        km = next((k for k in range(2, KMAKS + 1) if _ok(t["m"][k], batas)), None)
        if kg and km:
            g, m = t["g"][kg], t["m"][km]
            tel = (g[2] + m[2]) / max(1, g[3] + m[3])
            if best["A3"] is None or tel < best["A3"]:
                best["A3"], hasil["A3"] = tel, {"tipe": "A3", "thr": thr, "kg": kg, "km": km, "telat_setel_jam": round(tel, 1)}
            kk, jml, nb = {}, 0.0, 0
            for gb in ("g", "m"):
                for kd in ("<200", "200-350", ">350"):
                    s = gb + "|" + kd
                    k = next((k for k in range(2, KMAKS + 1) if s in t and _ok(t[s][k], batas)), None)
                    kk[s] = k if k else (kg if gb == "g" else km)   # strata tipis: pakai k A3
                    r = t[s][kk[s]] if s in t else [0, 0, 0.0, 0]
                    jml, nb = jml + r[2], nb + r[3]
            tel4 = jml / max(1, nb)
            if best["A4"] is None or tel4 < best["A4"]:
                best["A4"], hasil["A4"] = tel4, {"tipe": "A4", "thr": thr, "k": kk, "telat_setel_jam": round(tel4, 1)}
    return hasil


def uji_lipat(setel_eps, uji_eps, params, thr_utama=AMBANG_UTAMA):
    """Evaluasi di tahun uji. -> {aturan: {param, metrik: {semua, gambut, mineral}, palsu_gambut, palsu_mineral, lolos_palsu, selisih_telat_vs_A0_jam, lolos_telat, lolos}}"""
    import numpy as np
    A0 = {"tipe": "A0"}
    D0 = [D_aturan(e, A0) for e in uji_eps]
    out = {}
    for nama, ar in [("A0", A0), ("A1", {"tipe": "A1"})] + [(k, v) for k, v in params.items()]:
        if ar is None:
            out[nama] = {"param": None, "lolos": False, "alasan": "tak ada k <= %d yang memenuhi laju padam palsu di data setel" % KMAKS}
            continue
        Ds = [D_aturan(e, ar) for e in uji_eps]
        thr = ar.get("thr", thr_utama)
        m = {"semua": metrik(uji_eps, Ds, thr)}
        for s, f in (("gambut", lambda e: e["gb"]), ("mineral", lambda e: not e["gb"])):
            idx = [i for i, e in enumerate(uji_eps) if f(e)]
            m[s] = metrik([uji_eps[i] for i in idx], [Ds[i] for i in idx], thr)
        pg, pm = m["gambut"], m["mineral"]
        cukup = pg["n_dinyatakan"] >= NMIN and pm["n_dinyatakan"] >= NMIN
        lp = bool(cukup and pg["palsu"] <= KRITERIA["padam_palsu_maks"] and pm["palsu"] <= KRITERIA["padam_palsu_maks"])
        sel = [Ds[i] - D0[i] for i, e in enumerate(uji_eps) if klasif(e, Ds[i]) == "benar" and klasif(e, D0[i]) == "benar"]
        mean = float(np.mean(sel)) if sel else None
        lt = bool(mean is not None and mean <= KRITERIA["keterlambatan_maks_vs_A0_jam"])
        out[nama] = {"param": ar, "metrik": m, "data_cukup": cukup, "lolos_palsu": lp, "selisih_telat_vs_A0_jam": round(mean, 1) if mean is not None else None,
                     "n_berpasangan": len(sel), "lolos_telat": lt, "lolos": lp and lt}
    return out


def pilih_akhir(hasil_lipat):
    """hasil_lipat: [uji_lipat per arah]. Aturan lolos di SEMUA arah; terkecil keterlambatan uji; seri A2<A3<A4 (A0/A1 pembanding ikut dinilai)."""
    urut = {"A1": 0, "A0": 0, "A2": 1, "A3": 2, "A4": 3}
    lolos = []
    for nama in hasil_lipat[0]:
        if all(h.get(nama, {}).get("lolos") for h in hasil_lipat):
            tel = statistics.mean(h[nama]["metrik"]["semua"]["telat_jam"] or 0 for h in hasil_lipat)
            lolos.append((tel, urut.get(nama, 9), nama))
    return min(lolos)[2] if lolos else None


# ---------------------------------------------------------------- luas, tiga angka
def status_luas(ep, ar, S):
    """Status kejadian pada waktu S (datetime UTC) menurut aturan `ar`: 'aktif_teramati' | 'tak_teramati' | 'kandidat_padam' | 'padam' | None (belum ada / sudah muncul ulang)."""
    if S < ep["t_awal"]:
        return None
    if S <= ep["t_akhir"]:
        return "aktif_teramati"
    umur = (S - ep["t_akhir"]).total_seconds() / 3600
    if ep["Tn"] is not None and ep["Tn"] <= umur:
        return None    # sudah muncul ulang: kejadian lanjutannya dihitung sendiri
    if umur <= 24:
        return "aktif_teramati"
    D = D_aturan(ep, ar)
    if D is None or umur < D:
        return "tak_teramati"
    return "kandidat_padam" if umur <= D + HORIZON_PALSU else "padam"


def luas_tiga(eps, ar, S):
    c = {k: [0, 0.0] for k in ("aktif_teramati", "tak_teramati", "kandidat_padam")}
    berawan = 0
    for e in eps:
        s = status_luas(e, ar, S)
        if s in c:
            c[s][0] += 1
            c[s][1] += e["ha"]
            if s == "tak_teramati" and e.get("awan72", 0) >= 0.5:
                berawan += 1
    return {k + "_ha": round(v[1]) for k, v in c.items()} | {k + "_n": v[0] for k, v in c.items()} | {"tak_teramati_awan_n": berawan}


# ---------------------------------------------------------------- jaringan: FIRMS
def ambil_teks(url, coba=4):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "poskokarhutla-lab/1.0"}), timeout=180) as r:
                return r.read().decode()
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(FS.sensor_url(f"{url}: {type(e).__name__}: {e}")) from None
            time.sleep(15 * (i + 1))


def potongan(thn):
    d, akhir, out = dt.date(thn, 7, 1), dt.date(thn, *AKHIR_DATA), []
    while d <= akhir:
        out.append((d, min(d + dt.timedelta(days=4), akhir)))
        d += dt.timedelta(days=5)
    return out


def jalur_potongan(d0):
    return os.path.join(CACHE, "firms", f"{d0}.json.gz")


def baris_ringkas(baris):
    out = []
    for src, r in baris:
        kc = r.get("confidence", "")
        if kc not in ("n", "h"):
            continue
        sen = 0 if src.startswith("VIIRS_SNPP") else 1
        out.append([round(float(r["latitude"]), 4), round(float(r["longitude"]), 4), r["acq_date"], int(r["acq_time"]), 1 if kc == "n" else 2,
                    round(max(float(r.get("scan") or .4), float(r.get("track") or .4)), 2), r.get("daynight", "D"), sen])
    return out


def unduh_potongan(tugas):
    (d0, d1), kunci, ket = tugas
    p = jalur_potongan(d0)
    if os.path.exists(p):
        return True
    try:
        baris, ok = FS.unduh(d0, d1, kunci, ambil_teks, BBOX, ket, famili=FAMILI)
    except Exception as e:
        print("lab_padam: potongan", d0, "gagal:", FS.sensor_url(e))
        return False
    hari = [d0 + dt.timedelta(days=i) for i in range((d1 - d0).days + 1)]
    if not all(ok.get(x) == set(FAMILI) for x in hari):
        print("lab_padam: potongan", d0, "tak lengkap, dicoba lagi pada jalan berikut")
        return False
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with gzip.open(p + ".tmp", "wt") as f:
        json.dump(baris_ringkas(baris), f)
    os.replace(p + ".tmp", p)
    return True


def muat_tahun(thn):
    """-> list titik dict (urut waktu) atau None bila ada potongan belum ada."""
    pts = []
    for d0, _ in potongan(thn):
        p = jalur_potongan(d0)
        if not os.path.exists(p):
            return None
        for lat, lon, tg, hm, kc, px, dn, sen in json.load(gzip.open(p, "rt")):
            y, m, d = int(tg[:4]), int(tg[5:7]), int(tg[8:10])
            pts.append({"lat": lat, "lon": lon, "t": dt.datetime(y, m, d, hm // 100, hm % 100, tzinfo=UTC), "px": px, "dn": dn, "s": ("N", "N20")[sen], "c": kc})
    pts.sort(key=lambda p: p["t"])
    seen, out = set(), []
    for p in pts:
        k = (p["lat"], p["lon"], p["t"], p["s"])
        if k not in seen:
            seen.add(k)
            out.append(p)
    return out


def kalibrasi_lintas(pts, maks=20000):
    """Jam surya setempat median per (satelit, siang/malam) dari acq_time; bawaan 13,5 / 1,5 bila tak ada data."""
    bawaan = {("N", "D"): 13.5, ("N", "N"): 1.5, ("N20", "D"): 13.5, ("N20", "N"): 1.5}
    langkah = max(1, len(pts) // maks)
    kum = collections.defaultdict(list)
    for p in pts[::langkah]:
        dn = p["dn"] if p["dn"] in ("D", "N") else "D"
        jam = p["t"].hour + p["t"].minute / 60 + p["lon"] / 15
        kum[(p["s"], dn)].append((jam + 12) % 24 - 12 if dn == "N" else jam % 24)   # malam ~1,5 jam: dibungkus agar tak membelah 0/24
    out = dict(bawaan)
    for k, v in kum.items():
        if len(v) >= 50:
            out[k] = round(statistics.median(v), 2)
    return out


# ---------------------------------------------------------------- jaringan: cuaca ERA5
def cuaca_dari_respons(r, thn):
    """Respons archive satu lokasi (timezone=auto) -> {'utc0': datetime, 'cc': [..per jam UTC..], 'dc': {tanggal: DC jam 12 setempat}}."""
    h = r["hourly"]
    h = dict(h, wind_direction_10m=[0] * len(h["time"]))
    hari = H.siang(h)
    seri = F.deret([x[1:5] for x in hari])
    dc = {x[0]: round(s["dc"], 1) for x, s in zip(hari, seri)}
    off = int(r.get("utc_offset_seconds", 0)) / 3600
    t0 = dt.datetime.fromisoformat(h["time"][0]).replace(tzinfo=UTC) - dt.timedelta(hours=off)
    return {"utc0": t0, "cc": list(h["cloud_cover"]), "dc": dc}


def jalur_cuaca(thn, lat, lon):
    return os.path.join(CACHE, "cuaca", f"{thn}_{lat:.2f}_{lon:.2f}.json")


def simpan_cuaca(thn, lat, lon, cw):
    p = jalur_cuaca(thn, lat, lon)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        json.dump({"utc0": cw["utc0"].isoformat(), "cc": cw["cc"], "dc": cw["dc"]}, f, separators=(",", ":"))


def baca_cuaca(thn, lat, lon):
    p = jalur_cuaca(thn, lat, lon)
    if not os.path.exists(p):
        return None
    d = json.load(open(p))
    return {"utc0": dt.datetime.fromisoformat(d["utc0"]), "cc": d["cc"], "dc": d["dc"]}


def tarik_cuaca(sel, tahun, anggaran, batch=8):
    """Tarik sel x tahun yang belum ada di cache, dibatasi KUOTA_BOBOT dan `anggaran()`. -> (bobot_terpakai, kuota_habis)."""
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    from umum import ambil, KuotaHabis  # noqa: E402
    bobot, habis = 0.0, False
    for thn in tahun:
        d_awal, d_akhir = dt.date(thn, *AWAL_CUACA), dt.date(thn, *AKHIR_DATA)
        per_lokasi = (d_akhir - d_awal).days / 14
        todo = [s for s in sel if baca_cuaca(thn, *s) is None]
        for i in range(0, len(todo), batch):
            grup = todo[i:i + batch]
            if bobot + per_lokasi * len(grup) > KUOTA_BOBOT or anggaran():
                return bobot, True
            url = ("https://archive-api.open-meteo.com/v1/archive?latitude=" + ",".join(str(s[0]) for s in grup) + "&longitude=" + ",".join(str(s[1]) for s in grup)
                   + f"&start_date={d_awal}&end_date={d_akhir}&timezone=auto&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,cloud_cover")
            try:
                res = ambil(url, batas_waktu=300)
            except KuotaHabis as e:
                print("lab_padam: kuota Open-Meteo habis:", str(e)[:100])
                return bobot, True
            except Exception as e:
                print("lab_padam: cuaca gagal:", FS.sensor_url(e))
                continue
            bobot += per_lokasi * len(grup)
            for s, r in zip(grup, res if isinstance(res, list) else [res]):
                simpan_cuaca(thn, s[0], s[1], cuaca_dari_respons(r, thn))
    return bobot, habis


# ---------------------------------------------------------------- kejadian
def sel_05(lat, lon):
    return (math.floor(lat / 0.5) * 0.5 + 0.25, math.floor(lon / 0.5) * 0.5 + 0.25)


def bangun_indeks(pts, ukuran=0.01):
    idx = collections.defaultdict(list)
    for p in pts:
        idx[(math.floor(p["lon"] / ukuran), math.floor(p["lat"] / ukuran))].append(p)   # pts urut waktu -> daftar urut waktu
    return {k: ([p["t"] for p in v], v) for k, v in idx.items()}


def muncul_ulang(jejak, t_akhir, idx, ukuran=0.01, km=RADIUS_KM, hingga=None):
    """Jam sampai deteksi pertama sesudah t_akhir dalam <= km dari titik jejak mana pun, atau None."""
    terbaik = None
    for f in jejak:
        kx = 111.32 * math.cos(math.radians(f["lat"]))
        gx, gy = math.floor(f["lon"] / ukuran), math.floor(f["lat"] / ukuran)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                v = idx.get((gx + dx, gy + dy))
                if not v:
                    continue
                ts, ps = v
                for j in range(bisect.bisect_right(ts, t_akhir), len(ps)):
                    if terbaik is not None and ts[j] >= terbaik:
                        break
                    if hingga is not None and ts[j] > hingga:
                        break
                    q = ps[j]
                    if math.hypot((q["lon"] - f["lon"]) * kx, (q["lat"] - f["lat"]) * 110.574) <= km:
                        terbaik = ts[j]
                        break
    return None if terbaik is None else (terbaik - t_akhir).total_seconds() / 3600


def bangun_kejadian(pts, thn, jam_lokal, gambut, cuaca, ha_px, dalam=lambda lon, lat: True, cap=MAKS_KEJADIAN_TAHUN, rng=None):
    """pts: titik tahun `thn` (urut waktu). cuaca[(lat,lon)] = cw. -> (episode list, hitung dict)."""
    rng = rng or random.Random(SEED)
    label, _ = H.dbscan(pts, jam=48)
    grup = collections.defaultdict(list)
    for i, l in enumerate(label):
        grup[l].append(i)
    idx = bangun_indeks(pts)
    akhir_data = dt.datetime(thn, *AKHIR_DATA, 23, 59, tzinfo=UTC)
    batas_ep = dt.datetime(thn, *AKHIR_KEJADIAN, 23, 59, tzinfo=UTC)
    hit = collections.Counter(klaster=len(grup))
    kand = []
    for l, ids in grup.items():
        ps = [pts[i] for i in ids]
        t_akhir = max(p["t"] for p in ps)
        if t_akhir > batas_ep:
            hit["di_luar_jendela"] += 1
            continue
        kand.append(ps)
    if len(kand) > cap:
        hit["disampel_dari"] = len(kand)
        kand = rng.sample(kand, cap)
    eps = []
    for ps in kand:
        lat0, lon0 = sum(p["lat"] for p in ps) / len(ps), sum(p["lon"] for p in ps) / len(ps)
        if not dalam(lon0, lat0):
            hit["di_luar_negeri_atau_laut"] += 1
            continue
        cw = cuaca.get(sel_05(lat0, lon0))
        if cw is None:
            hit["tanpa_cuaca"] += 1
            continue
        t_awal, t_akhir = min(p["t"] for p in ps), max(p["t"] for p in ps)
        tglok = (t_akhir + dt.timedelta(hours=lon0 / 15)).date().isoformat()
        dc = cw["dc"].get(tglok)
        if dc is None:
            hit["tanpa_dc"] += 1
            continue
        gb = gambut.cari(lon0, lat0) is not None or any(gambut.cari(p["lon"], p["lat"]) for p in ps[:20])
        jej, lihat = [], set()
        for p in ps:
            if p["t"] >= t_akhir - dt.timedelta(hours=24):
                k = (round(p["lat"] / .004), round(p["lon"] / .004))
                if k not in lihat:
                    lihat.add(k)
                    jej.append(p)
        Tn = muncul_ulang(jej[:12], t_akhir, idx, hingga=t_akhir + dt.timedelta(days=(CAP_JAM + HORIZON_PALSU) / 24 + 3))
        pas = lintasan(t_akhir, lon0, jam_lokal)
        cp = {thr: lintas_bersih(pas, cw, t_akhir, thr)[:KMAKS] for thr in AMBANG_AWAN}
        awan72 = [awan_jam(cw, t_akhir + dt.timedelta(hours=o)) for o, _, _ in pas if o <= 72]
        px = len({H.pix(p) for p in ps})
        eps.append({"thn": thn, "lat": round(lat0, 4), "lon": round(lon0, 4), "t_awal": t_awal, "t_akhir": t_akhir, "gb": bool(gb), "dc": dc, "px": px,
                    "ha": px * ha_px, "Tn": Tn, "fu": (akhir_data - t_akhir).total_seconds() / 3600, "cp": cp,
                    "awan72": (sum(1 for c in awan72 if c is None or c >= AMBANG_UTAMA) / len(awan72)) if awan72 else 1.0,
                    "jejak": [[p["lon"], p["lat"]] for p in jej[:30]]})
    hit["kejadian_dipakai"] = len(eps)
    return eps, dict(hit)


def faktor_luas():
    """ha per piksel unik: model terpilih di lab/luas.json bila ada (kunci ha_per_piksel / faktor_ha_per_piksel di mana pun), selain itu garis_api.PIKSEL_HA."""
    try:
        def cari(o):
            if isinstance(o, dict):
                for k in ("ha_per_piksel", "faktor_ha_per_piksel"):
                    if isinstance(o.get(k), (int, float)) and o[k] > 0:
                        return float(o[k])
                for v in o.values():
                    r = cari(v)
                    if r:
                        return r
            return None
        v = cari(json.load(open(LUAS_JSON)))
        if v:
            return v, "public/data/lab/luas.json"
    except (OSError, ValueError):
        pass
    return GA.PIKSEL_HA, "garis_api.PIKSEL_HA (faktor sementara produksi; lab/luas.json belum ada atau tanpa faktor)"


# ---------------------------------------------------------------- analisis KM
def km_strata(eps, B=BOOT, seed=SEED):
    """P(muncul ulang <= 7 hari | tak terdeteksi g jam) dan | k lintasan bersih, per strata, dengan selang bootstrap kejadian (2,5-97,5%)."""
    import numpy as np
    rng = np.random.default_rng(seed)
    HJ = 480

    def stratum(f):
        return [e for e in eps if f(e)]
    daftar = {"semua": lambda e: True, "gambut": lambda e: e["gb"], "mineral": lambda e: not e["gb"],
              "tahun_kering": lambda e: TAHUN[e["thn"]] == "kering", "tahun_basah": lambda e: TAHUN[e["thn"]] == "basah"}
    for kd in ("<200", "200-350", ">350"):
        daftar["dc" + kd] = (lambda kd: lambda e: kelas_dc3(e["dc"]) == kd)(kd)
        daftar["gambut_dc" + kd] = (lambda kd: lambda e: e["gb"] and kelas_dc3(e["dc"]) == kd)(kd)
        daftar["mineral_dc" + kd] = (lambda kd: lambda e: not e["gb"] and kelas_dc3(e["dc"]) == kd)(kd)
    for u in ("1", "2-4", "5-19", ">=20"):
        daftar["ukuran" + u] = (lambda u: lambda e: kelas_ukuran(e["px"]) == u)(u)
    G = (24, 48, 72, 120, 168)
    K = (1, 2, 3, 4, 6, 8)
    out = {}
    for nama, f in daftar.items():
        sub = stratum(f)
        if len(sub) < 20:
            out[nama] = {"n": len(sub), "catatan": "n < 20: tak dihitung"}
            continue
        T = np.array([e["Tn"] if e["Tn"] is not None else e["fu"] for e in sub])
        E = np.array([e["Tn"] is not None for e in sub])
        Ti = np.ceil(T).astype(np.int64)
        r = {"n": len(sub), "n_muncul_ulang": int(E.sum()), "g": {}, "k": {}}

        def hitung(fungsi, n):
            nilai = fungsi(np.arange(n))
            bs = []
            for _ in range(B):
                ii = rng.integers(0, n, n)
                v = fungsi(ii)
                if v is not None:
                    bs.append(v)
            if nilai is None:
                return None
            sel = [round(float(np.percentile(bs, 2.5)), 4), round(float(np.percentile(bs, 97.5)), 4)] if len(bs) >= B // 2 else None
            return {"p": round(nilai, 4), "selang": sel}
        for g in G:
            r["g"][str(g)] = hitung(lambda ii, g=g: p_muncul(km_s(Ti[ii], E[ii], HJ), g), len(sub))
        thrs = AMBANG_AWAN if nama in ("semua", "gambut", "mineral") else (AMBANG_UTAMA,)
        for thr in thrs:
            ck = np.array([[e["cp"][thr][k - 1] if len(e["cp"][thr]) >= k else np.nan for k in K] for e in sub])
            r["k"][str(thr)] = {}
            for j, k in enumerate(K):
                ada = ~np.isnan(ck[:, j]) & (T > np.nan_to_num(ck[:, j], nan=1e9))
                if ada.sum() < 20:
                    r["k"][str(thr)][str(k)] = {"n": int(ada.sum()), "p": None}
                    continue
                Ts = np.ceil(T[ada] - ck[ada, j]).astype(np.int64)
                Es = E[ada]
                v = hitung(lambda ii: (None if (s := km_s(Ts[ii], Es[ii], 300))[168] is None else float(1 - s[168])), int(ada.sum()))
                r["k"][str(thr)][str(k)] = {"n": int(ada.sum()), **(v or {"p": None})}
        out[nama] = r
    return out


# ---------------------------------------------------------------- Sentinel-2 (opsional)
def sentinel2(eps_padam, anggaran, maks=30):
    """dNBR antara dua adegan bersih berurutan SESUDAH dinyatakan padam. -> ringkasan; {'dilewati': alasan} bila STAC tak terjangkau."""
    try:
        import citra as C, konsesi_citra_jelas as J, luas_citra as L  # noqa: E402
    except Exception as e:
        return {"dilewati": "impor gagal: %s" % type(e).__name__}
    try:
        urllib.request.urlopen(urllib.request.Request(C.STAC.rsplit("/", 1)[0] + "/", headers=C.UA), timeout=20).read(10)
    except Exception as e:
        return {"dilewati": "STAC tak terjangkau: %s" % type(e).__name__}
    hasil = []
    for e in eps_padam[:maks]:
        if anggaran():
            break
        try:
            pusat = [e["lat"], e["lon"]]
            km = L.kotak_km([], e["jejak"], pusat)
            d1 = (e["t_akhir"] + dt.timedelta(hours=e["D"])).date()
            ad = L.adegan_antara(C, e["lat"], e["lon"], km, d1.isoformat(), (d1 + dt.timedelta(days=25)).isoformat())
            baca = []
            for tgl, _, it in L.pilih(ad, 70, True):
                b = L.baca_nbr(J, it, e["lat"], e["lon"], km, L.AWAN_PASCA)
                if b and (not baca or (dt.date.fromisoformat(tgl) - dt.date.fromisoformat(baca[0][0])).days >= 5):
                    baca.append((tgl, b[0]))
                if len(baca) == 2:
                    break
            if len(baca) < 2:
                hasil.append({"id": f"{e['thn']}_{e['lat']}_{e['lon']}", "status": "tanpa_dua_adegan_bersih"})
                continue
            m = L.topeng(e["lat"], e["lon"], km, [], e["jejak"], pusat)
            ha, cak, nb = L.luas(baca[0][1], baca[1][1], m, km)
            hasil.append({"id": f"{e['thn']}_{e['lat']}_{e['lon']}", "gambut": e["gb"], "tgl": [baca[0][0], baca[1][0]], "luas_baru_ha": ha, "cakupan_pct": cak,
                          "meluas": bool(ha is not None and ha >= 1.0), "palsu_menurut_firms": e.get("palsu", False)})
        except Exception as x:
            hasil.append({"id": f"{e['thn']}_{e['lat']}_{e['lon']}", "status": "galat_" + type(x).__name__})
    n = [h for h in hasil if "meluas" in h]
    return {"dicoba": len(hasil), "dinilai": len(n), "meluas": sum(h["meluas"] for h in n),
            "porsi_meluas": round(sum(h["meluas"] for h in n) / len(n), 3) if n else None, "rinci": hasil,
            "catatan": "dNBR antar dua adegan SESUDAH dinyatakan padam; bekas bakar yang masih bertambah = bukti tambahan padam palsu. Gambut bawah permukaan tak selalu mengubah NBR."}


# ---------------------------------------------------------------- orkestrasi
BATASAN = [
    "Proksi awan = ERA5 cloud_cover total pada jam lintas (sel 0,25 derajat), BUKAN masker VIIRS VNP14IMG (kelas 4 awan / 5 daratan bersih; butuh token LAADS yang tak tersedia). Asap/kabut tebal (dominan di Agu-Okt) tidak tercakup.",
    "'Lintasan bersih' tidak menjamin api terdeteksi: api kecil/dingin di bawah kanopi, di bawah ambang piksel 375 m, atau di tepi sapuan bisa lolos. Jadi laju padam palsu di sini BATAS BAWAH.",
    "Bara gambut bawah permukaan tak terlihat satelit mana pun; 'tak muncul ulang' tidak membuktikan padam. Kebenaran akhir = konfirmasi lapangan (/uji-lapangan Q5), yang belum dipakai di sini.",
    "Muncul ulang diukur dengan deteksi FIRMS yang sama (satu sumber): deteksi baru dalam 1 km mungkin api tetangga/baru, bukan kebangkitan api lama (condong menaikkan padam palsu).",
    "Jam lintas diidealkan (satu lintasan siang + satu malam per satelit, jam surya median dari acq_time); tumpang-tindih sapuan di khatulistiwa dan bukan-lintasan diabaikan.",
    "Cuaca hanya untuk sel sampel (peringkat jumlah titik): luas absolut di snapshot adalah luas di sel sampel, BUKAN nasional; porsi antar-tiga-angka yang bermakna. Kejadian di sel tanpa cuaca dibuang.",
    "Dua tahun kering + dua basah: kesimpulan musiman bergantung pada empat musim saja; strata dengan n < %d dinyatakan tak cukup." % NMIN,
    "Luas kejadian = piksel unik seluruh kejadian x faktor ha/piksel sementara, bukan luas sesaat.",
]


def tulis(d, jalur=None):
    jalur = jalur or KELUAR
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(d, f, ensure_ascii=False, indent=1, default=lambda o: o.isoformat() if hasattr(o, "isoformat") else float(o))
    os.replace(jalur + ".tmp", jalur)


def pilih_sel_sampel(hit, peat_share, n_g=SEL_G, n_m=SEL_M):
    """hit {sel: n titik}, peat_share {sel: 0..1}. -> daftar sel: n_g gambut (share >= .5) + n_m mineral terbanyak titiknya."""
    g = sorted((s for s in hit if peat_share.get(s, 0) >= .5), key=lambda s: -hit[s])[:n_g]
    m = sorted((s for s in hit if peat_share.get(s, 0) < .5), key=lambda s: -hit[s])[:n_m]
    return g + m


def jalan():
    t0 = time.time()
    menit = float(os.environ.get("LAB_MENIT") or 30)
    sisa = lambda: menit * 60 - 150 - (time.time() - t0)
    kunci = os.environ.get("FIRMS_MAP_KEY")
    if not kunci:
        sys.exit("lab_padam: FIRMS_MAP_KEY tidak ada (jalan hanya di GitHub Actions)")
    out = {"_catatan": "LAB, bukan produksi. Kriteria ditulis SEBELUM angka dihitung.", "dibuat": dt.datetime.now(UTC).strftime("%Y-%m-%dT%H:%MZ"),
           "tahap": "kriteria_ditulis", "kriteria": KRITERIA, "batasan": BATASAN, "tahun": {str(k): v for k, v in TAHUN.items()}}
    tulis(out)    # kriteria ada di berkas sebelum satu angka hasil dihitung
    print("lab_padam: kriteria ditulis")

    # 1. FIRMS
    ket = FS.muat_ketersediaan(kunci, ambil_teks, famili=FAMILI)
    tugas = [((d0, d1), kunci, ket) for thn in TAHUN for d0, d1 in potongan(thn) if not os.path.exists(jalur_potongan(d0))]
    print("lab_padam: potongan FIRMS belum ada:", len(tugas))
    with ThreadPoolExecutor(4) as ex:
        sisa_tugas = iter(tugas)
        selesai = 0
        while True:
            blok = [next(sisa_tugas, None) for _ in range(8)]
            blok = [b for b in blok if b]
            if not blok or sisa() < menit * 60 * 0.35 - 150 + 0:
                break
            selesai += sum(ex.map(unduh_potongan, blok))
    tahun_ok, pts = [], {}
    for thn in TAHUN:
        p = muat_tahun(thn)
        if p is not None:
            pts[thn] = p
            tahun_ok.append(thn)
    out["tahun_lengkap"] = tahun_ok
    out["tahun_belum_lengkap"] = [t for t in TAHUN if t not in tahun_ok]
    print("lab_padam: tahun lengkap", tahun_ok, "titik", {t: len(v) for t, v in pts.items()})
    if not tahun_ok:
        out["tahap"] = "firms_belum_lengkap"
        tulis(out)
        return
    jam_lokal = kalibrasi_lintas([p for v in pts.values() for p in v[::7]])
    out["lintasan_jam_surya"] = {"%s_%s" % k: v for k, v in jam_lokal.items()}

    # 2. sel sampel
    gambut = Poligon(GAMBUT)
    kering = [t for t in tahun_ok if TAHUN[t] == "kering"] or tahun_ok
    hit = collections.Counter()
    contoh = collections.defaultdict(list)
    for t in kering:
        for p in pts[t]:
            s = sel_05(p["lat"], p["lon"])
            hit[s] += 1
            if hit[s] % 40 == 0:
                contoh[s].append((p["lon"], p["lat"]))
    share = {s: sum(1 for x in v if gambut.cari(*x)) / len(v) for s, v in contoh.items() if v}
    sel = pilih_sel_sampel({s: n for s, n in hit.items() if n >= 200}, share)
    out["sel_sampel"] = {"n": len(sel), "gambut": sum(1 for s in sel if share.get(s, 0) >= .5)}
    print("lab_padam: sel sampel", len(sel))

    # 3. cuaca
    bobot, habis = tarik_cuaca(sel, tahun_ok, lambda: sisa() < menit * 60 * 0.15)
    out["cuaca"] = {"bobot_terpakai": round(bobot), "kuota_bobot_per_jalan": KUOTA_BOBOT, "terpotong_kuota_atau_waktu": habis}
    print("lab_padam: bobot Open-Meteo", round(bobot), "terpotong", habis)

    # 4. kejadian
    from wilayah import Wilayah
    wil = Wilayah()
    ha_px, sumber_ha = faktor_luas()
    out["luas"] = {"ha_per_piksel": ha_px, "sumber": sumber_ha}
    semua, ringkas_hit = [], {}
    for thn in tahun_ok:
        cuaca = {s: c for s in sel if (c := baca_cuaca(thn, *s))}
        pt = [p for p in pts[thn] if sel_05(p["lat"], p["lon"]) in cuaca]
        t1 = time.time()
        eps, hit_t = bangun_kejadian(pt, thn, jam_lokal, gambut, cuaca, ha_px, dalam=lambda lon, lat: wil.cari(lon, lat) is not None)
        hit_t["titik_di_sel_dengan_cuaca"] = len(pt)
        hit_t["sel_dengan_cuaca"] = len(cuaca)
        ringkas_hit[str(thn)] = hit_t
        semua += eps
        print("lab_padam: tahun", thn, hit_t, "%.0f dtk" % (time.time() - t1))
        if sisa() < 120:
            break
    out["kejadian"] = {"per_tahun": ringkas_hit, "total": len(semua), "gambut": sum(e["gb"] for e in semua)}
    utama = [e for e in semua if e["px"] >= PX_UTAMA]

    # 5. KM
    if utama:
        out["survival_km"] = {"populasi": "px >= %d" % PX_UTAMA, "B": BOOT, "strata": km_strata(utama)}
    out["tahap"] = "km_selesai"
    tulis(out)

    # 6. aturan, uji silang
    lipat = []
    for L_ in LIPAT:
        a = [e for e in utama if e["thn"] in L_["setel"]]
        b = [e for e in utama if e["thn"] in L_["uji"]]
        if not a or not b:
            lipat.append({"setel": L_["setel"], "uji": L_["uji"], "status": "data_tidak_cukup", "n_setel": len(a), "n_uji": len(b)})
            continue
        par = setel(a)
        lipat.append({"setel": L_["setel"], "uji": L_["uji"], "n_setel": len(a), "n_uji": len(b), "parameter": par, "uji_hasil": uji_lipat(a, b, par)})
    ok = [l for l in lipat if "uji_hasil" in l]
    pilih = pilih_akhir([l["uji_hasil"] for l in ok]) if len(ok) == len(LIPAT) else None
    out["aturan"] = {"lipat": lipat, "terpilih": pilih or "tidak ada yang lolos" if len(ok) == len(LIPAT) else "tidak dapat dinilai: data uji silang tidak lengkap"}
    sem_semua = uji_lipat(utama, semua, setel(utama)) if utama and semua else None
    out["aturan"]["kepekaan_semua_ukuran"] = {k: {"palsu_gambut": v["metrik"]["gambut"]["palsu"], "palsu_mineral": v["metrik"]["mineral"]["palsu"],
                                                  "telat_vs_A0": v["selisih_telat_vs_A0_jam"]} for k, v in (sem_semua or {}).items() if v.get("metrik")}
    out["aturan"]["parameter_akhir_gabungan"] = setel(utama) if utama else None
    out["tahap"] = "aturan_selesai"
    tulis(out)

    # 7. tiga angka
    par_akhir = out["aturan"]["parameter_akhir_gabungan"] or {}
    ar_pilih = (par_akhir.get(pilih) if pilih in par_akhir else {"tipe": pilih}) if pilih in ("A0", "A1", "A2", "A3", "A4") else None
    ar_baik = ar_pilih or par_akhir.get("A3") or par_akhir.get("A2") or {"tipe": "A0"}
    snaps = []
    for thn in tahun_ok:
        for (mm, dd) in ((9, 15), (10, 1), (10, 15)):
            S = dt.datetime(thn, mm, dd, 12, tzinfo=UTC)
            ep = [e for e in utama if e["thn"] == thn]
            snaps.append({"tgl": S.strftime("%Y-%m-%d"), "A0": luas_tiga(ep, {"tipe": "A0"}, S), "aturan_terpilih_atau_terbaik": luas_tiga(ep, ar_baik, S)})
    out["tiga_angka"] = {"definisi": {
        "aktif_teramati": "kejadian dengan deteksi <= 24 jam sebelum snapshot",
        "tak_teramati": "tanpa deteksi > 24 jam tetapi belum memenuhi aturan padam (menunggu lintasan bersih / tertutup awan); tak_teramati_awan_n = yang >= 50% lintasan 72 jam berawan",
        "kandidat_padam": "sudah memenuhi aturan padam dalam 7 hari terakhir: layak diverifikasi (lapangan/Sentinel-2), belum pasti padam",
        "luas": "Σ piksel unik kejadian x ha/piksel (sel sampel saja, bukan nasional)"},
        "aturan_dipakai": ar_baik, "aturan_lolos": ar_pilih is not None, "snapshot": snaps}

    # 8. Sentinel-2
    if sisa() > 240 and ar_baik.get("tipe") != "A0":
        pad = []
        rng = random.Random(SEED)
        for e in utama:
            D = D_aturan(e, ar_baik)
            if klasif(e, D) in ("benar", "palsu") and e["px"] >= 5:
                pad.append(dict(e, D=D, palsu=klasif(e, D) == "palsu"))
        rng.shuffle(pad)
        t1 = time.time()
        out["sentinel2"] = sentinel2(pad, lambda: sisa() < 60 or time.time() - t1 > 600)
    else:
        out["sentinel2"] = {"dilewati": "waktu tersisa tidak cukup atau aturan terpilih A0"}
    out["tahap"] = "selesai"
    out["detik"] = round(time.time() - t0)
    tulis(out)
    ringkas()


def ringkas():
    try:
        d = json.load(open(KELUAR))
    except (OSError, ValueError):
        print("lab_padam: padam.json belum ada")
        return
    L = ["# Lab: luas masih terdeteksi / belum padam", "", "Tahap: %s. Tahun lengkap: %s. LAB, bukan produksi." % (d.get("tahap"), d.get("tahun_lengkap")), "",
         "## Kriteria (dipra-tulis)", ""]
    k = d["kriteria"]
    L += ["- Padam palsu <= %.0f%% di %s" % (k["padam_palsu_maks"] * 100, k["padam_palsu_di"]),
          "- Keterlambatan vs A0 <= %d jam (%s)" % (k["keterlambatan_maks_vs_A0_jam"], k["keterlambatan_cara"]), "- Uji silang: %s" % k["uji_silang"], ""]
    a = d.get("aturan")
    if a:
        L += ["## Aturan terpilih", "", "**%s**" % a["terpilih"], ""]
        for l in a["lipat"]:
            L.append("Setel %s, uji %s (n setel %s, n uji %s)" % (l["setel"], l["uji"], l.get("n_setel"), l.get("n_uji")))
            L += ["", "| aturan | padam palsu gambut | padam palsu mineral | selisih telat vs A0 (jam) | lolos |", "|---|---|---|---|---|"]
            for n, v in (l.get("uji_hasil") or {}).items():
                m = v.get("metrik")
                L.append("| %s | %s | %s | %s | %s |" % (n, m and m["gambut"]["palsu"], m and m["mineral"]["palsu"], v.get("selisih_telat_vs_A0_jam"), v.get("lolos")))
            L.append("")
    t = d.get("tiga_angka")
    if t:
        L += ["## Tiga angka (bukan satu)", ""] + ["- %s: %s" % (x, y) for x, y in t["definisi"].items()] + ["", "| snapshot | aturan | aktif teramati (ha) | tak teramati (ha) | kandidat padam (ha) |", "|---|---|---|---|---|"]
        for s in t["snapshot"]:
            for n in ("A0", "aturan_terpilih_atau_terbaik"):
                v = s[n]
                L.append("| %s | %s | %s | %s | %s |" % (s["tgl"], n, v["aktif_teramati_ha"], v["tak_teramati_ha"], v["kandidat_padam_ha"]))
        L.append("")
    km = (d.get("survival_km") or {}).get("strata", {})
    if km.get("semua", {}).get("g"):
        L += ["## P(muncul ulang <= 7 hari | tak terdeteksi g jam), semua kejadian", ""] + ["- g=%s jam: %s" % (g, v and v.get("p")) for g, v in km["semua"]["g"].items()] + [""]
    s2 = d.get("sentinel2")
    if s2:
        L += ["## Sentinel-2", "", json.dumps({x: y for x, y in s2.items() if x != "rinci"}, ensure_ascii=False), ""]
    L += ["## Batasan", ""] + ["- " + b for b in d.get("batasan", [])]
    os.makedirs(os.path.dirname(RINGKAS), exist_ok=True)
    open(RINGKAS, "w").write("\n".join(L) + "\n")
    print("\n".join(L[:40]))


# ---------------------------------------------------------------- uji
def uji():
    UTC_ = UTC
    # --- Wilson: tangan, x=0 n=10 -> batas atas z2/(n+z2) = 0,2775
    w = wilson(0, 10)
    assert w[0] == 0.0 and abs(w[1] - 0.2775) < 1e-3 and wilson(0, 0) is None, w

    # --- lintasan: lon 105 -> offset surya 7 jam; 13:30 lokal = 06:30 UTC, 01:30 lokal = 18:30 UTC hari sebelumnya
    jam = {("N", "D"): 13.5, ("N", "N"): 1.5}
    t_akhir = dt.datetime(2023, 9, 10, 6, 30, tzinfo=UTC_)
    ps = lintasan(t_akhir, 105.0, jam, maks_jam=48)
    assert [round(o, 2) for o, _, _ in ps] == [12.0, 24.0, 36.0, 48.0], ps         # 18:30 (+12), 06:30 (+24), ...
    assert lintasan(t_akhir, 105.0, jam, maks_jam=48, min_jam=0)[0][0] == 12.0      # lintasan deteksi sendiri (offset 0) tak ikut: batas > min_jam
    assert [p[2] for p in ps] == ["N", "D", "N", "D"]

    # --- kalibrasi jam surya: siang 13:30, malam 01:30 (lon 110 -> UTC 06:10 dan 18:10 hari sebelumnya)
    kal = []
    for i in range(80):
        kal.append({"lat": 0.0, "lon": 110.0, "t": dt.datetime(2023, 9, 1 + i % 20, 6, 10, tzinfo=UTC_), "dn": "D", "s": "N"})
        kal.append({"lat": 0.0, "lon": 110.0, "t": dt.datetime(2023, 9, 1 + i % 20, 18, 10, tzinfo=UTC_), "dn": "N", "s": "N"})
    kk = kalibrasi_lintas(kal)
    assert abs(kk[("N", "D")] - 13.5) < .01 and abs(kk[("N", "N")] - 1.5) < .01 and kk[("N20", "D")] == 13.5, kk

    # --- sensor awan: cloud_cover ERA5 per jam UTC; batas >= ambang berawan
    cc = [0] * 100
    cc[12], cc[24], cc[36], cc[48] = 79, 80, 10, None
    cw = {"utc0": dt.datetime(2023, 9, 10, 6, tzinfo=UTC_), "cc": cc, "dc": {}}      # indeks 0 = 06:00; lintasan +12 jam -> 06:30 + 12 = 18:30 -> jam 18:30 ~ indeks 12 atau 13
    # t_akhir 06:30; offset 12 -> 18:30 -> (18:30-06:00)=12,5 jam -> round -> 12 (banker's) ; offset 24 -> 30:30 -> 24,5 -> round 24 ; 36 -> 36 ; 48 -> 48
    assert awan_jam(cw, t_akhir + dt.timedelta(hours=36)) == 10 and awan_jam(cw, t_akhir + dt.timedelta(hours=12)) == 79
    assert lintas_bersih(ps, cw, t_akhir, 80) == [12.0, 36.0], lintas_bersih(ps, cw, t_akhir, 80)       # 79 bersih, 80 berawan, None konservatif berawan
    assert lintas_bersih(ps, cw, t_akhir, 60) == [36.0] and lintas_bersih(ps, cw, t_akhir, 90) == [12.0, 24.0, 36.0]

    # --- Kaplan-Meier dengan tangan: T=[2E,3E,3C,5E], H=10. n=4: S[2]=.75; h=3: d=1,n=3 -> S=.5; h=5: n=1,d=1 -> 0
    S = km_s([2, 3, 3, 5], [True, True, False, True], 10)
    assert [round(float(x), 4) for x in S[:7]] == [1, 1, .75, .5, .5, 0, 0], S[:7]
    assert abs(p_muncul(S, 2, 1) - (1 - .5 / .75)) < 1e-9 and p_muncul(S, 5, 1) is None and p_muncul(S, 2, 99) is None
    # semua tersensor -> S tetap 1, P = 0
    assert p_muncul(km_s([9, 9, 9], [False] * 3, 30), 0, 10) == 0.0

    # --- klasifikasi + A0..A2 pada kejadian rakitan tangan
    def ep(gb, dc, Tn, cp80, px=5):
        return {"gb": gb, "dc": dc, "Tn": Tn, "cp": {60: cp80[:1], 80: cp80, 90: cp80}, "px": px, "thn": 2019, "fu": 400.0}
    e1 = ep(True, 400, 100.0, [12, 24, 36, 48, 60, 72])      # gambut kering: A0 = 168 jam; muncul ulang 100 jam < 168 -> 'sebelum'
    e2 = ep(False, 100, 90.0, [12, 24, 36, 48, 60, 72])      # mineral: A0 = 72, muncul ulang 90 -> A0 benar? 90 > 72 dan <= 72+168 -> palsu
    e3 = ep(False, 100, None, [12, 24, 36, 48, 60, 72])      # tak muncul ulang -> benar
    assert D_aturan(e1, {"tipe": "A0"}) == 168 and D_aturan(e2, {"tipe": "A0"}) == 72 and D_aturan(e1, {"tipe": "A1"}) == 48
    assert [klasif(e, D_aturan(e, {"tipe": "A0"})) for e in (e1, e2, e3)] == ["sebelum", "palsu", "benar"]
    a2 = {"tipe": "A2", "thr": 80, "k": 3}
    assert D_aturan(e2, a2) == 36 and klasif(e2, 36) == "palsu" and D_aturan(e1, {"tipe": "A2", "thr": 80, "k": 9}) is None
    a2b = {"tipe": "A2", "thr": 80, "k": 8}
    assert klasif(e3, D_aturan(e3, a2b)) == "tak"       # hanya 6 lintasan bersih -> tak dinyatakan
    m = metrik([e1, e2, e3], [D_aturan(e, {"tipe": "A0"}) for e in (e1, e2, e3)])
    assert m["n_dinyatakan"] == 2 and m["n_palsu"] == 1 and m["palsu"] == .5 and m["telat_jam"] == 72.0 and m["n_muncul_sebelum_dinyatakan"] == 1, m
    assert kelas_dc3(199.9) == "<200" and kelas_dc3(350) == "200-350" and kelas_dc3(350.1) == ">350" and kelas_ukuran(4) == "2-4" and kelas_ukuran(20) == ">=20"

    # --- setel: gambut muncul ulang 20% setelah lintasan bersih ke-5 (61 jam), mineral tidak pernah.
    # k <= 5: dinyatakan sebelum 61 jam -> palsu 20% > 10%. k >= 6: D=72 >= 61 -> bukan dinyatakan -> palsu 0. Harapan: kg=6, km=2, A2 k=6.
    cp = [12.0 * i for i in range(1, 13)]
    eps = [ep(True, 300, 61.0 if i < 20 else None, cp) for i in range(100)] + [ep(False, 100, None, cp) for _ in range(100)]
    par = setel(eps)
    assert par["A2"]["k"] == 6 and par["A3"]["kg"] == 6 and par["A3"]["km"] == 2, par
    assert par["A4"]["k"]["g|200-350"] == 6 and par["A4"]["k"]["m|<200"] == 2, par["A4"]
    # strata tipis (n < NMIN) tak dinilai: tak ada A2 bila mineral hanya 10 kejadian
    assert setel([e for e in eps if e["gb"]] + eps[-10:])["A2"] is None

    # --- uji silang: tahun uji = salinan; A3 harus lolos kedua kriteria, A1 (48 jam, k setara 4) gagal palsu gambut
    h = uji_lipat(eps, eps, par)
    assert h["A3"]["lolos"] and h["A2"]["lolos"], h["A3"]
    assert h["A1"]["metrik"]["gambut"]["palsu"] == .2 and not h["A1"]["lolos_palsu"] and not h["A1"]["lolos"], h["A1"]["metrik"]["gambut"]
    assert h["A3"]["selisih_telat_vs_A0_jam"] < 0 and h["A3"]["lolos_telat"]
    assert pilih_akhir([h, h]) in ("A0", "A3", "A4", "A2"), pilih_akhir([h, h])
    # telat tak lolos bila k besar: paksa A2 k=12 -> D=144 vs A0=72: selisih > 24
    ar = {"A2": {"tipe": "A2", "thr": 80, "k": 12}, "A3": None, "A4": None}
    hh = uji_lipat(eps, eps, ar)
    assert not hh["A2"]["lolos_telat"] and hh["A2"]["lolos_palsu"] and hh["A3"]["alasan"], hh["A2"]
    # data kurang (n dinyatakan < NMIN) -> bukan lolos
    assert not uji_lipat(eps[:10], eps[:10], par)["A3"]["lolos"]
    # kriteria hanya menyentuh gambut DAN mineral: mineral palsu tinggi menggagalkan
    eps_m = [ep(True, 300, None, cp) for _ in range(60)] + [ep(False, 100, 50.0 if i < 20 else None, cp) for i in range(60)]
    assert not uji_lipat(eps_m, eps_m, {"A2": {"tipe": "A2", "thr": 80, "k": 2}, "A3": None, "A4": None})["A2"]["lolos"]

    # --- pipeline kejadian sintetis (harian.dbscan + muncul ulang + DC + awan + gambut): dua api
    class FakeGambut:
        def cari(self, lon, lat):
            return {} if lat < -2.5 else None
    def P(lat, lon, jam, sen="N"):
        return {"lat": lat, "lon": lon, "t": dt.datetime(2023, 9, 1, tzinfo=UTC_) + dt.timedelta(hours=jam), "px": .4, "dn": "D", "s": sen, "c": 1}
    pts = [P(-3.0, 110.0, 6), P(-3.0, 110.001, 7), P(-3.0, 110.0, 30)]            # api A (gambut): berhenti jam 30, muncul ulang jam 30+150 ...
    pts += [P(-3.0, 110.002, 30 + 150)]                                              # ... 150 jam sesudah t_akhir, dalam 1 km
    pts += [P(-1.0, 105.0, 10), P(-1.0, 105.0, 20)]                                  # api B (mineral): tak pernah muncul ulang, t_akhir jam 20
    pts += [P(-1.0, 105.02, 24 * 30)]                                                 # titik jauh >1 km di waktu lain: bukan muncul ulang api B
    pts.sort(key=lambda p: p["t"])
    cwf = {"utc0": dt.datetime(2023, 3, 1, tzinfo=UTC_), "cc": [20] * (24 * 300), "dc": {"2023-09-%02d" % i: 410.0 + i for i in range(1, 31)} | {"2023-10-%02d" % i: 440.0 for i in range(1, 31)}}
    cuaca = {sel_05(-3.0, 110.0): cwf, sel_05(-1.0, 105.0): cwf}
    eps_s, hit = bangun_kejadian(pts, 2023, {("N", "D"): 13.5, ("N", "N"): 1.5}, FakeGambut(), cuaca, 14.0625)
    byl = {e["gb"]: e for e in eps_s}
    assert len(eps_s) == 4 and sum(e["gb"] for e in eps_s) == 2, (len(eps_s), hit)   # A, A' (muncul ulang), B, B' (titik jauh)
    a_ = [e for e in eps_s if e["gb"] and abs((e["t_akhir"] - dt.datetime(2023, 9, 2, 6, tzinfo=UTC_)).total_seconds()) < 1][0]
    assert abs(a_["Tn"] - 150.0) < 1e-6 and a_["px"] >= 1 and a_["dc"] == 412.0, (a_["Tn"], a_["dc"])
    b_ = [e for e in eps_s if not e["gb"] and e["t_akhir"] == dt.datetime(2023, 9, 1, 20, tzinfo=UTC_)][0]
    assert b_["Tn"] is None and len(b_["cp"][80]) == KMAKS and b_["cp"][80][0] > LINTAS_MIN_JAM and b_["cp"][60] == b_["cp"][80], b_["Tn"]
    # awan 100% -> tak ada lintasan bersih
    cwc = dict(cwf, cc=[100] * (24 * 300))
    ec, _ = bangun_kejadian(pts, 2023, {("N", "D"): 13.5, ("N", "N"): 1.5}, FakeGambut(), {sel_05(-3.0, 110.0): cwc, sel_05(-1.0, 105.0): cwc}, 14.0625)
    assert all(e["cp"][80] == [] and e["cp"][90] == [] for e in ec) and all(e["awan72"] == 1.0 for e in ec)
    # tanpa cuaca sel -> dibuang dan dihitung
    e0, h0 = bangun_kejadian(pts, 2023, {("N", "D"): 13.5}, FakeGambut(), {sel_05(-1.0, 105.0): cwf}, 14.0625)
    assert h0.get("tanpa_cuaca") == 2 and all(not e["gb"] for e in e0), h0

    # --- cuaca_dari_respons: indeks UTC dari utc_offset, DC naik pada hari kering dan turun oleh hujan lebat
    jamjam = [(dt.datetime(2023, 3, 1) + dt.timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(24 * 6)]
    r = {"utc_offset_seconds": 25200, "hourly": {"time": jamjam, "temperature_2m": [32.0] * len(jamjam), "relative_humidity_2m": [50.0] * len(jamjam),
                                                  "wind_speed_10m": [8.0] * len(jamjam), "precipitation": [0.0] * len(jamjam), "cloud_cover": list(range(len(jamjam)))}}
    r["hourly"]["precipitation"][24 * 4 + 5] = 60.0
    cwr = cuaca_dari_respons(r, 2023)
    assert cwr["utc0"] == dt.datetime(2023, 2, 28, 17, tzinfo=UTC_) and awan_jam(cwr, dt.datetime(2023, 2, 28, 18, tzinfo=UTC_)) == 1
    d = sorted(cwr["dc"].items())
    assert d[2][1] > d[1][1] > d[0][1] and d[3][1] < d[2][1] - 20 and d[4][1] > d[3][1], d     # kering naik; hujan 60 mm menurunkan DC

    # --- tiga angka pada satu kejadian: aktif teramati (<=24 j), tak teramati, kandidat padam, padam, sudah muncul ulang
    e = dict(ep(False, 100, None, [24.0, 48.0, 72.0, 96.0]), t_awal=dt.datetime(2023, 9, 1, tzinfo=UTC_), t_akhir=dt.datetime(2023, 9, 2, tzinfo=UTC_), ha=100.0)
    a3 = {"tipe": "A2", "thr": 80, "k": 3}                    # D = 72 jam
    ss = lambda jam_: status_luas(e, a3, e["t_akhir"] + dt.timedelta(hours=jam_))
    assert [ss(x) for x in (-5, 10, 30, 71, 72, 72 + 168, 72 + 169)] == ["aktif_teramati", "aktif_teramati", "tak_teramati", "tak_teramati", "kandidat_padam", "kandidat_padam", "padam"]
    assert status_luas(e, a3, e["t_awal"] - dt.timedelta(hours=1)) is None
    ee = dict(e, Tn=40.0)
    assert status_luas(ee, a3, ee["t_akhir"] + dt.timedelta(hours=41)) is None
    t3 = luas_tiga([e, dict(e, ha=50.0, t_akhir=e["t_akhir"] + dt.timedelta(hours=30)), dict(e, ha=7.0, t_akhir=e["t_akhir"] + dt.timedelta(hours=60))], a3, e["t_akhir"] + dt.timedelta(hours=72))
    assert t3["kandidat_padam_ha"] == 100 and t3["aktif_teramati_ha"] == 7 and t3["tak_teramati_ha"] == 50, t3

    # --- muncul ulang: jarak > 1 km tidak dihitung, tepat di atas ambang
    jej = [{"lat": 0.0, "lon": 100.0}]
    idx = bangun_indeks([{"lat": 0.0, "lon": 100.0 + 0.0125, "t": dt.datetime(2023, 9, 5, tzinfo=UTC_)}, {"lat": 0.0, "lon": 100.008, "t": dt.datetime(2023, 9, 7, tzinfo=UTC_)}])
    assert muncul_ulang(jej, dt.datetime(2023, 9, 1, tzinfo=UTC_), idx) == 6 * 24.0 and muncul_ulang(jej, dt.datetime(2023, 9, 8, tzinfo=UTC_), idx) is None

    # --- KM per strata + tersensor: kejadian sintetis; P7 | g=0 sama dengan frekuensi bila tanpa sensor
    rngt = random.Random(1)
    sint = []
    for i in range(300):
        tn = rngt.choice([None, 60.0, 120.0, 400.0])
        sint.append(dict(ep(i % 2 == 0, 100 + 3 * i, tn, cp, px=5), fu=900.0 if tn is None else 900.0))
    kms = km_strata(sint, B=20)
    assert kms["semua"]["n"] == 300 and 0.4 < kms["semua"]["g"]["24"]["p"] < 0.6, kms["semua"]["g"]["24"]   # 60 & 120 dari 4 pilihan = 50%
    assert kms["gambut"]["k"]["80"]["2"]["n"] > 0 and kms["ukuran5-19"]["n"] == 300

    # --- sampel sel: dua gambut, dua mineral
    pilih = pilih_sel_sampel({(0.25, 100.25): 500, (0.75, 100.25): 400, (1.25, 100.25): 300, (1.75, 100.25): 200}, {(0.25, 100.25): .9, (1.25, 100.25): .1, (0.75, 100.25): .6, (1.75, 100.25): 0}, 1, 1)
    assert pilih == [(0.25, 100.25), (1.25, 100.25)], pilih

    # --- kriteria pra-tulis utuh dan tertulis sebelum angka
    assert KRITERIA["padam_palsu_maks"] == .10 and KRITERIA["keterlambatan_maks_vs_A0_jam"] == 24 and set(KRITERIA["definisi"]) >= {"A0", "A1", "A2", "A3", "A4"}
    # --- kunci tak bocor lewat pesan galat
    os.environ["FIRMS_MAP_KEY"] = "RAHASIA999"
    assert "RAHASIA999" not in FS.sensor_url("https://firms.modaps.eosdis.nasa.gov/api/area/csv/RAHASIA999/VIIRS_SNPP_SP/1,2,3,4/5/2019-07-01")
    del os.environ["FIRMS_MAP_KEY"]
    # --- potongan FIRMS: 5 hari, menutup 1 Jul..20 Des tanpa celah
    pc = potongan(2019)
    assert pc[0][0] == dt.date(2019, 7, 1) and pc[-1][1] == dt.date(2019, 12, 20) and all(b[0] == a[1] + dt.timedelta(days=1) for a, b in zip(pc, pc[1:])) and all((b - a).days <= 4 for a, b in pc)
    # --- faktor luas: bawaan produksi bila lab/luas.json tak ada
    assert faktor_luas()[0] > 0
    print("lab_padam uji: ok")


if __name__ == "__main__":
    perintah = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if perintah == "uji":
        uji()
    elif perintah == "jalan":
        try:
            jalan()
        except SystemExit:
            raise
        except Exception as e:
            sys.exit("lab_padam: " + FS.sensor_url(f"{type(e).__name__}: {e}"))
    elif perintah == "ringkas":
        ringkas()
    else:
        sys.exit("pakai: lab_padam.py uji|jalan|ringkas")
