"""LAB: metode terbaik untuk "LUAS MASIH TERDETEKSI / BELUM PADAM" dan seberapa sering "tak terdeteksi" != padam -> public/data/lab/padam.json (+ padam_ringkas.md)

BUKAN produksi: tidak mengubah harian.py/aturan.py. Memakai ulang fungsi produksi apa adanya: harian.dbscan (kejadian), harian.pix (piksel unik), aturan.kelas_dc,
firms_sumber (pilih SP/NRT, saring kunci), fwi.deret (DC Van Wagner), wilayah.Poligon (gambut), garis_api.PIKSEL_HA (faktor luas sementara), luas_citra (dNBR, opsional).
numpy dipakai (job lab menyediakannya; produksi tetap stdlib).

PERTANYAAN
  Aturan produksi: kompleks aktif bila terdeteksi <= 72 jam, <= 168 jam di gambut DC > 350 (harian.py AKTIF_JAM/AKTIF_GAMBUT_JAM); verifikasi padam instansi
  (src/instansi.js) = 48 jam tanpa titik dalam 2 km. Tak ada rujukan terbitan untuk 168 jam. Seberapa sering api yang "tak terdeteksi" X jam ternyata muncul lagi <= 7 hari,
  dan adakah aturan berbasis LINTASAN BERSIH (bukan jam) yang menekan "muncul ulang dalam R km (bisa api baru di dekatnya)" tanpa menunda pernyataan padam terlalu lama?

DATA (diunduh di `jalan`, di-cache di data/raw/lab/padam/)
  FIRMS VIIRS S-NPP + NOAA-20 arsip SP, 1 Jul..20 Des, tahun 2019 + 2023 (El Nino, kering) dan 2020 + 2022 (basah), kotak Indonesia, keyakinan nominal+tinggi (kunci FEDS).
  Cuaca ERA5 (Open-Meteo archive) per sel 0,5 derajat: suhu/RH/angin/hujan jam 12 setempat -> DC (fwi.deret, mulai 1 Mar) + cloud_cover per jam UTC.
  Hanya SEL SAMPEL (peringkat jumlah titik, setengah gambut) yang ditarik cuacanya: kuota Open-Meteo gratis 5.000 bobot/jam (bobot = lokasi x hari/14); tiap `jalan` dibatasi
  KUOTA_BOBOT. Kejadian di sel tanpa cuaca dibuang dan dilaporkan.

METODE (v2: proses pembaruan kausal; lihat scripts/data/lab_kriteria/lab_padam.json untuk SEMUA ambang)
  1. Pengamatan = CELAH antar-deteksi. Tiap lintasan terakhir yang berdeteksi (rantai deteksi <= 3 jam) dalam sebuah lokasi adalah calon "deteksi terakhir" t_i; waktu sampai deteksi
     berikutnya dalam R km dari jejak = satu pengamatan, tersensor bila tak ada sampai akhir jendela. Aturan dinilai di tiap celah dengan informasi sampai t_i + D saja.
     Lokasi (identitas) dari harian.dbscan(jam=48), tetapi dbscan TIDAK menggabungkan celah: sebelumnya kejadian dibentuk dengan jam=48 sehingga populasi sudah dikondisikan "tidak muncul
     ulang dalam 48 jam" dan aturan D < 48 jam diremehkan secara mekanis.
  2. "Lintasan": tiap satelit (S-NPP, NOAA-20) x {siang ~13:30, malam ~01:30 waktu surya setempat}. Berawan bila PROKSI AWAN ERA5 (cloud_cover titik tengah sel 0,5 derajat) >= ambang
     (60/80/90 disetel); lintasan <= 1,5 jam sesudah t_i tak dihitung. Proksi ini TIDAK menangkap asap dan BUKAN masker VIIRS.
  3. Muncul ulang = deteksi pertama sesudah t_i dalam <= R km dari jejak (R utama 1 km; 0,5 dan 2 km sebagai kepekaan). Bisa api baru di dekatnya, bukan pasti kebangkitan api lama.
     Kaplan-Meier (tersensor di akhir data), dipisah gambut/mineral, kelas DC, tahun, ukuran; selang bootstrap.
  4. Aturan: A0 produksi; A1 48 jam; A2 k lintasan bersih; A3 k terpisah gambut/mineral; A4 A3 + kelas DC; dinyatakan padam pada D jam sesudah t_i.
     "Muncul ulang dalam R km" = dinyatakan padam (D < muncul ulang) lalu muncul ulang <= D + 168 jam.
  5. UJI MURNI: setel di (2019+2020), pilih aturan HANYA dari data setel, uji SEKALI di (2022+2023). Arah sebaliknya hanya kepekaan. Kriteria: maks(Wilson 95%, bootstrap klaster sel x tahun B=1000 p97,5), >= 20 klaster, dan tak-dinyatakan <= 20%.
     Parameter gabungan dan semua keluaran in-sample diberi label in-sample.
  6. Luas: tiga angka pada beberapa snapshot, hanya memakai informasi <= waktu snapshot, hanya SEL SAMPEL (acak berstrata, benih tetap, dipilih dari tahun setel), luas piksel bukan luas terbakar.
  7. Sentinel-2 (opsional, <= 30 kejadian): dNBR antara dua citra bersih berurutan sesudah dinyatakan padam; dilewati bila STAC tak terjangkau.

Pakai:  python3 scripts/data/lab_padam.py uji       self-check sintetis, tanpa jaringan
        python3 scripts/data/lab_padam.py jalan     unduh + hitung (FIRMS_MAP_KEY; LAB_MENIT = anggaran menit, bawaan 30)
        python3 scripts/data/lab_padam.py ringkas   tulis ulang padam_ringkas.md dari padam.json
"""
import bisect, collections, datetime as dt, gzip, hashlib, inspect, json, math, os, random, socket, statistics, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aturan as A  # noqa: E402
import firms_sumber as FS  # noqa: E402
import fwi as F  # noqa: E402
import garis_api as GA  # noqa: E402
import harian as H  # noqa: E402
import lab_luas as LU  # noqa: E402  (pengunduh arsip tahunan per negara dipakai bersama)
from wilayah import AKAR, Poligon  # noqa: E402

KELUAR = os.path.join(AKAR, "public/data/lab/padam.json")
RINGKAS = os.path.join(AKAR, "public/data/lab/padam_ringkas.md")
JALAN_LOG = os.path.join(AKAR, "public/data/lab/jalan.jsonl")        # append-only, dipakai bersama lab_luas.py
KRITERIA_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lab_kriteria", "lab_padam.json")
LUAS_JSON = os.path.join(AKAR, "public/data/lab/luas.json")
GAMBUT = os.path.join(AKAR, "public/data/lahan/gambut.geojson")
CACHE = os.path.join(AKAR, "data/raw/lab/padam")
UTC = dt.timezone.utc
BBOX = H.BBOX
FAMILI = ("VIIRS_SNPP", "VIIRS_NOAA20")


def kriteria_kanonik(K):
    return json.dumps(K, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def muat_kriteria(jalur=None):
    """-> (dict kriteria, sha256 kanonik). Semua ambang dari berkas terpisah; skrip tak punya angka kriteria sendiri."""
    with open(jalur or KRITERIA_JSON, encoding="utf-8") as f:
        K = json.load(f)
    return K, hashlib.sha256(kriteria_kanonik(K).encode("utf-8")).hexdigest()


KRITERIA, KRITERIA_SHA = muat_kriteria()
_K = KRITERIA
TAHUN = {int(k): v for k, v in _K["tahun"].items()}
SETEL_TAHUN, UJI_TAHUN = list(_K["tahun_setel"]), list(_K["tahun_uji"])
LIPAT = [{"setel": SETEL_TAHUN, "uji": UJI_TAHUN}, {"setel": UJI_TAHUN, "uji": SETEL_TAHUN}]    # [0] = satu-satunya yang boleh memilih; [1] kepekaan
AKHIR_DATA, AKHIR_KEJADIAN, AWAL_CUACA = tuple(_K["akhir_data"]), tuple(_K["akhir_kejadian"]), tuple(_K["awal_cuaca"])
SNAPSHOT = [tuple(x) for x in _K["snapshot"]]
AMBANG_AWAN, AMBANG_UTAMA = tuple(_K["ambang_awan_disetel"]), _K["ambang_awan_awal"]
KMAKS, K_A2 = _K["k_maks"], range(_K["k_a2_min"], _K["k_a2_maks"] + 1)
K_MIN = _K["k_min_setel"]
CAP_JAM, HORIZON_PALSU = _K["cap_jam"], _K["horizon_muncul_ulang_jam"]
RADIUS_KM, RADIUS_KEPEKAAN = _K["radius_km_utama"], tuple(_K["radius_km_kepekaan"])
LINTAS_MIN_JAM, RANTAI_JAM = _K["lintas_min_jam"], _K["peristiwa_rantai_jam"]
NMIN, PX_UTAMA = _K["n_min_per_strata"], _K["px_utama_min"]
WILSON_Z, WILSON_SETEL, WILSON_UJI = _K["wilson_z"], _K["wilson_batas_atas_setel_maks"], _K["wilson_batas_atas_uji_maks"]
TELAT_MAKS = _K["keterlambatan_maks_vs_A0_jam"]
TAK_MAKS = _K["tak_dinyatakan_maks"]
KLASTER_B, KLASTER_Q, NKL = _K["bootstrap_klaster_B"], _K["ci_batas_atas_kuantil"], _K["n_klaster_min"]
PEMBANDING = tuple(_K["laporan_pembanding"])
SEL_G, SEL_M, SEL_N_MIN = _K["sel_gambut"], _K["sel_mineral"], _K["sel_n_min_titik"]
KUOTA_BOBOT, MAKS_KEJADIAN_TAHUN, BOOT, SEED = _K["kuota_bobot_per_jalan"], _K["maks_pengamatan_per_tahun"], _K["bootstrap"], _K["benih"]


# ---------------------------------------------------------------- murni (diuji)
def wilson(x, n, z=WILSON_Z):
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
    if t == "AJ":
        return float(ar["jam"])
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


def ci_atas_klaster(pk, B=None, q=None, benih=None):
    """Batas atas persentil q (bawaan 97,5) dari rasio muncul-ulang/dinyatakan, bootstrap KLASTER: resample klaster dengan pengembalian.
    pk {klaster: [n_dinyatakan, n_muncul_ulang]}; rng berbenih (deterministik). None bila < 2 klaster atau tak ada replikasi dengan n > 0."""
    import numpy as np
    if len(pk) < 2:
        return None
    a = np.array([v for _, v in sorted(pk.items())], dtype=float)
    rng = np.random.default_rng(SEED if benih is None else benih)
    ii = rng.integers(0, len(a), (B or KLASTER_B, len(a)))
    N, X = a[ii, 0].sum(1), a[ii, 1].sum(1)
    ok = N > 0
    if not ok.any():
        return None
    return round(float(np.percentile(X[ok] / N[ok], (KLASTER_Q if q is None else q) * 100)), 4)


def batas_atas(n, x, pk):
    """aturan_batas: maks(batas atas Wilson, batas atas bootstrap klaster sel x tahun). None bila klaster kurang dari NKL atau n < NMIN."""
    if n < NMIN or len(pk) < NKL:
        return None
    b = ci_atas_klaster(pk)
    return None if b is None else max(wilson(x, n)[1], b)


def metrik(eps, Ds, thr=AMBANG_UTAMA):
    c = collections.Counter(klasif(e, D) for e, D in zip(eps, Ds))
    pk, pks = {}, {}
    pen = [(e, D) for e, D in zip(eps, Ds) if e["Tn"] is None or e["Tn"] > CAP_JAM]     # penyebut tak-dinyatakan: tak muncul ulang sampai cap
    n_tak_pen = sum(1 for e, D in pen if klasif(e, D) == "tak")
    for e, D in zip(eps, Ds):
        k_ = klasif(e, D)
        if k_ in ("palsu", "benar"):
            for d, key in ((pk, e["klaster"]), (pks, e["klaster"][0])):
                r_ = d.setdefault(key, [0, 0])
                r_[0] += 1
                r_[1] += k_ == "palsu"
    dec = c["palsu"] + c["benar"]
    tel = [D for e, D in zip(eps, Ds) if klasif(e, D) == "benar"]
    ada = [(e, D) for e, D in zip(eps, Ds) if D is not None and D <= CAP_JAM]
    tb = sum(1 for e, D in ada if not any(o <= D for o in e["cp"][thr]))
    return {"n": len(eps), "n_dinyatakan": dec, "n_muncul_ulang": c["palsu"], "laju_muncul_ulang": round(c["palsu"] / dec, 4) if dec else None,
            "muncul_ulang_wilson": wilson(c["palsu"], dec), "n_muncul_sebelum_dinyatakan": c["sebelum"], "n_tak_dinyatakan": c["tak"],
            "telat_jam": round(sum(tel) / len(tel), 1) if tel else None,
            "aktif_tanpa_bersih": round(tb / len(ada), 4) if ada else None, "n_aktif_dinyatakan_dalam_cap": len(ada),
            "n_klaster": len(pk), "muncul_ulang_bootstrap_klaster": ci_atas_klaster(pk) if len(pk) >= 2 else None,
            "n_klaster_sel": len(pks), "muncul_ulang_bootstrap_sel_saja": ci_atas_klaster(pks) if len(pks) >= 2 else None,
            "batas_atas_gabungan": batas_atas(dec, c["palsu"], pk),
            "n_penyebut_tak_dinyatakan": len(pen), "tak_dinyatakan": round(n_tak_pen / len(pen), 4) if pen else None}


def tabel_k(eps, thr):
    """{kunci_strata: {k: [n_dinyatakan, n_palsu, jumlah_D_benar, n_benar, {klaster: [n, palsu]}, n_tak, n_penyebut]}} untuk k=1..KMAKS; strata 'g'/'m' dan 'g|kelas'/'m|kelas'."""
    t = collections.defaultdict(lambda: {k: [0, 0, 0.0, 0, {}, 0, 0] for k in range(1, KMAKS + 1)})
    for e in eps:
        cp = e["cp"][thr]
        pen = e["Tn"] is None or e["Tn"] > CAP_JAM            # penyebut tak-dinyatakan (r[6]); pembilang r[5] = tak dinyatakan pada k itu
        for k in range(1, KMAKS + 1):
            c = klasif(e, cp[k - 1] if k <= len(cp) else None)
            if pen:
                for s in ("g" if e["gb"] else "m", kunci_dc(e)):
                    t[s][k][6] += 1
                    t[s][k][5] += c == "tak"
            if c in ("palsu", "benar"):
                for s in ("g" if e["gb"] else "m", kunci_dc(e)):
                    r = t[s][k]
                    r[0] += 1
                    r[1] += c == "palsu"
                    kl = r[4].setdefault(e["klaster"], [0, 0])
                    kl[0] += 1
                    kl[1] += c == "palsu"
                    if c == "benar":
                        r[2] += cp[k - 1]
                        r[3] += 1
    return t


def _ok(r, batas):
    """Strata memenuhi bila n >= NMIN, >= NKL klaster (sel x tahun), dan maks(batas atas Wilson 95%, batas atas bootstrap klaster) <= batas (bukan titik taksiran).
    Wilson diperiksa dahulu (murah); bootstrap hanya bila Wilson lolos."""
    if r[0] < NMIN or len(r[4]) < NKL or wilson(r[1], r[0])[1] > batas:
        return False
    if r[6] and r[5] / r[6] > TAK_MAKS:      # F3: terlalu sering tak menyatakan padam = aman secara palsu
        return False
    b = ci_atas_klaster(r[4])
    return b is not None and b <= batas


def setel(eps, batas=WILSON_SETEL):
    """Setel A2, A3, A4 pada pengamatan `eps` (HANYA tahun setel). Tiap k = k TERKECIL dengan batas atas Wilson <= batas di gambut DAN mineral.
    -> {'A2': param|None, 'A3': ..., 'A4': ...}; None = tak ada k <= KMAKS yang memenuhi."""
    hasil = {"A2": None, "A3": None, "A4": None}
    best = {"A2": None, "A3": None, "A4": None}
    for thr in AMBANG_AWAN:
        t = tabel_k(eps, thr)
        for k in K_A2:
            g, m = t["g"][k], t["m"][k]
            if _ok(g, batas) and _ok(m, batas):
                tel = (g[2] + m[2]) / max(1, g[3] + m[3])
                if best["A2"] is None or tel < best["A2"]:
                    best["A2"], hasil["A2"] = tel, {"tipe": "A2", "thr": thr, "k": k, "telat_setel_jam": round(tel, 1)}
                break
        kg = next((k for k in range(K_MIN, KMAKS + 1) if _ok(t["g"][k], batas)), None)
        km = next((k for k in range(K_MIN, KMAKS + 1) if _ok(t["m"][k], batas)), None)
        if kg and km:
            g, m = t["g"][kg], t["m"][km]
            tel = (g[2] + m[2]) / max(1, g[3] + m[3])
            if best["A3"] is None or tel < best["A3"]:
                best["A3"], hasil["A3"] = tel, {"tipe": "A3", "thr": thr, "kg": kg, "km": km, "telat_setel_jam": round(tel, 1)}
            kk, jml, nb = {}, 0.0, 0
            for gb in ("g", "m"):
                for kd in ("<200", "200-350", ">350"):
                    s = gb + "|" + kd
                    k = next((k for k in range(K_MIN, KMAKS + 1) if s in t and _ok(t[s][k], batas)), None)
                    kk[s] = k if k else (kg if gb == "g" else km)   # strata tipis: pakai k A3
                    r = t[s][kk[s]] if s in t else [0, 0, 0.0, 0]
                    jml, nb = jml + r[2], nb + r[3]
            tel4 = jml / max(1, nb)
            if best["A4"] is None or tel4 < best["A4"]:
                best["A4"], hasil["A4"] = tel4, {"tipe": "A4", "thr": thr, "k": kk, "telat_setel_jam": round(tel4, 1)}
    return hasil


def uji_lipat(setel_eps, uji_eps, params, thr_utama=AMBANG_UTAMA):
    """Evaluasi di tahun uji. -> {aturan: {param, metrik: {semua, gambut, mineral}, lolos_muncul_ulang, selisih_telat_vs_A0_jam, lolos_telat, lolos}}
    Lolos muncul ulang = n dinyatakan >= NMIN dan batas atas Wilson <= WILSON_UJI di gambut DAN mineral. TIDAK memilih apa pun: hanya menilai."""
    import numpy as np
    A0 = {"tipe": "A0"}
    D0 = [D_aturan(e, A0) for e in uji_eps]
    out = {}
    for nama, ar in [("A0", A0), ("A1", {"tipe": "A1"})] + [(k, v) for k, v in params.items()]:
        if ar is None:
            out[nama] = {"param": None, "lolos": False, "alasan": "tak ada k <= %d yang memenuhi batas atas Wilson di data setel" % KMAKS}
            continue
        Ds = [D_aturan(e, ar) for e in uji_eps]
        thr = ar.get("thr", thr_utama)
        m = {"semua": metrik(uji_eps, Ds, thr)}
        for s, f in (("gambut", lambda e: e["gb"]), ("mineral", lambda e: not e["gb"])):
            idx = [i for i, e in enumerate(uji_eps) if f(e)]
            m[s] = metrik([uji_eps[i] for i in idx], [Ds[i] for i in idx], thr)
        pg, pm = m["gambut"], m["mineral"]
        cukup = pg["n_dinyatakan"] >= NMIN and pm["n_dinyatakan"] >= NMIN and pg["n_klaster"] >= NKL and pm["n_klaster"] >= NKL
        bg, bm = pg["batas_atas_gabungan"], pm["batas_atas_gabungan"]      # None = n < NMIN atau klaster < NKL
        lp = bool(cukup and bg is not None and bm is not None and bg <= WILSON_UJI and bm <= WILSON_UJI)
        ltak = all(x["tak_dinyatakan"] is None or x["tak_dinyatakan"] <= TAK_MAKS for x in (pg, pm))
        sel = [Ds[i] - D0[i] for i, e in enumerate(uji_eps) if klasif(e, Ds[i]) == "benar" and klasif(e, D0[i]) == "benar"]
        mean = float(np.mean(sel)) if sel else None
        lt = bool(mean is not None and mean <= TELAT_MAKS)
        out[nama] = {"param": ar, "metrik": m, "data_cukup": cukup, "lolos_muncul_ulang": lp, "selisih_telat_vs_A0_jam": round(mean, 1) if mean is not None else None,
                     "n_berpasangan": len(sel), "lolos_telat": lt, "lolos_tak_dinyatakan": ltak, "lolos": lp and lt and ltak,
                     "selisih_telat_label": "bersyarat pada hasil (evaluasi): hanya pengamatan yang kedua aturannya menyatakan padam benar",
                     "laporan_saja": nama in PEMBANDING}
    return out


def pilih_setel(params):
    """Pilih aturan HANYA dari parameter hasil setel (data setel; tak ada data uji yang dilihat): keterlambatan setel terkecil, seri A2 < A3 < A4.
    -> nama atau None. A0/A1 pembanding, tak pernah dipilih."""
    urut = {"A2": 1, "A3": 2, "A4": 3}
    ada = [(v["telat_setel_jam"], urut[n], n) for n, v in params.items() if v]
    return min(ada)[2] if ada else None


def vonis_uji(hasil, nama):
    """Vonis SEKALI untuk aturan terpilih pada tahun uji. -> 'lolos' | 'tidak_lolos' | 'tidak_ada_aturan'."""
    if nama is None:
        return "tidak_ada_aturan"
    return "lolos" if hasil.get(nama, {}).get("lolos") else "tidak_lolos"


def kepekaan_radius(uji_eps, ar, radius=RADIUS_KEPEKAAN, thr_utama=AMBANG_UTAMA):
    """Laju muncul ulang aturan `ar` bila radius muncul ulang R = 0,5 / 1 / 2 km (ep['TnR'][R], ep['Tn'] = 1 km). Kepekaan saja."""
    out = {}
    if not ar:
        return out
    Ds = [D_aturan(e, ar) for e in uji_eps]
    thr = ar.get("thr", thr_utama)
    for R in sorted(set(radius) | {RADIUS_KM}):
        ee = [dict(e, Tn=(e["Tn"] if R == RADIUS_KM else e["TnR"][R])) for e in uji_eps]
        r = {}
        for nm, f in (("gambut", lambda e: e["gb"]), ("mineral", lambda e: not e["gb"])):
            idx = [i for i, e in enumerate(ee) if f(e)]
            mm = metrik([ee[i] for i in idx], [Ds[i] for i in idx], thr)
            r[nm] = {k: mm[k] for k in ("n_dinyatakan", "n_muncul_ulang", "laju_muncul_ulang", "muncul_ulang_wilson", "muncul_ulang_bootstrap_klaster", "muncul_ulang_bootstrap_sel_saja", "batas_atas_gabungan", "tak_dinyatakan")}
        out["muncul_ulang_dalam_%s_km" % ("%g" % R)] = r
    return out


# ---------------------------------------------------------------- luas, tiga angka
def status_luas(ep, ar, S):
    """Status lokasi pada waktu S (datetime UTC) menurut aturan `ar`, memakai HANYA informasi <= S. `ep` = pengamatan pada deteksi terakhir <= S
    (bukan t_akhir episode penuh): 'aktif_teramati' | 'tak_teramati' | 'kandidat_padam' | 'padam' | None (belum ada / deteksi terakhir sesudah S / sudah muncul ulang)."""
    if S < ep["t_awal"] or ep["t_akhir"] > S:
        return None
    umur = (S - ep["t_akhir"]).total_seconds() / 3600
    if ep["Tn"] is not None and ep["Tn"] <= umur:
        return None    # sudah muncul ulang (terjadi <= S): lokasi lanjutannya dihitung sendiri
    if umur <= 24:
        return "aktif_teramati"
    D = D_aturan(ep, ar)
    if D is None or umur < D:
        return "tak_teramati"
    return "kandidat_padam" if umur <= D + HORIZON_PALSU else "padam"


def terakhir_per_lokasi(eps, S):
    """Dari pengamatan banyak per lokasi (kunci ep['lok']): yang deteksi terakhirnya <= S, satu per lokasi."""
    best = {}
    for e in eps:
        if e["t_akhir"] <= S and (e["lok"] not in best or e["t_akhir"] > best[e["lok"]]["t_akhir"]):
            best[e["lok"]] = e
    return list(best.values())


def luas_tiga(eps, ar, S):
    """Tiga angka pada S. Luas = piksel unik SAMPAI S x ha/piksel (luas piksel, bukan luas terbakar); hanya sel sampel."""
    c = {k: [0, 0.0] for k in ("aktif_teramati", "tak_teramati", "kandidat_padam")}
    berawan = 0
    for e in terakhir_per_lokasi(eps, S):
        s = status_luas(e, ar, S)
        if s in c:
            c[s][0] += 1
            c[s][1] += e["ha"]
            if s == "tak_teramati" and e.get("awan72", 0) >= 0.5:
                berawan += 1
    return {k + "_ha": round(v[1]) for k, v in c.items()} | {k + "_n": v[0] for k, v in c.items()} | {"tak_teramati_awan_n": berawan}


# ---------------------------------------------------------------- jaringan: FIRMS
_DIAG = {}


def diagnosa_alamat(host, port=443, batas=5.0):
    """Kelas galat tiap alamat (IPv4 dan IPv6) yang dicoba untuk host: 'IPv4 1.2.3.4 ENETUNREACH'. Murni jaringan, tanpa kunci. Dicache per host per jalan."""
    if host in _DIAG:
        return _DIAG[host]
    out = []
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except Exception as e:  # noqa: BLE001
        _DIAG[host] = "DNS %s" % type(e).__name__
        return _DIAG[host]
    for fam, _, _, _, sa in infos[:6]:
        nama = "IPv6" if fam == socket.AF_INET6 else "IPv4"
        try:
            with socket.create_connection((sa[0], sa[1]), timeout=batas):
                kls = "ok"
        except OSError as e:
            kls = (errno_nama(e.errno) if e.errno else type(e).__name__)
        out.append("%s %s %s" % (nama, sa[0], kls))
    _DIAG[host] = "; ".join(out) or "tanpa alamat"
    return _DIAG[host]


def errno_nama(n):
    import errno
    return errno.errorcode.get(n, "errno%s" % n)


def ambil_teks(url, coba=4, jeda=15, diagnosa=diagnosa_alamat):
    """GET teks. Galat akhir = RuntimeError berisi kelas galat + kelas tiap alamat yang dicoba, disaring FS.sensor_url (kunci tak bocor)."""
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "poskokarhutla-lab/1.0"}), timeout=180) as r:
                return r.read().decode()
        except Exception as e:
            if i == coba - 1:
                try:
                    alamat = diagnosa(urllib.parse.urlsplit(url).hostname)
                except Exception:  # noqa: BLE001
                    alamat = "diagnosa gagal"
                raise RuntimeError(FS.sensor_url(f"{url}: {type(e).__name__}: {e} [alamat: {alamat}]")) from None
            time.sleep(jeda * (i + 1))


def ambil_teks_cadangan(url):
    """Jalur cadangan area API: jeda lebih panjang (30/60/90/120 dtk) dan 5 percobaan."""
    return ambil_teks(url, coba=5, jeda=30)


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
        baris, ok = FS.unduh(d0, d1, kunci, ambil_teks_cadangan, BBOX, ket, famili=FAMILI)
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


def titik_ke_ringkas(p):
    return [round(p["lat"], 4), round(p["lon"], 4), p["t"].strftime("%Y-%m-%d"), p["t"].hour * 100 + p["t"].minute, p["c"], round(p["px"], 2), p["dn"] or "D",
            0 if p["s"] == "N" else 1]


def simpan_potongan(d0, baris):
    p = jalur_potongan(d0)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with gzip.open(p + ".tmp", "wt") as f:
        json.dump(baris, f)
    os.replace(p + ".tmp", p)


def arsip_tahun(thn, arsip_fn, status):
    """Sumber UTAMA: arsip tahunan per negara (lab_luas.titik_sensor_tahun, tanpa kunci) untuk S-NPP dan NOAA-20 -> potongan 5 hari yang BELUM ada.
    True bila kedua sensor terbaca dan memuat titik di jendela; False (dengan alasan di status) bila tidak: potongan tidak ditulis sebagian."""
    mulai, akhir = dt.date(thn, 7, 1).isoformat(), dt.date(thn, *AKHIR_DATA).isoformat()
    semua = []
    for sen in ("N", "N20"):
        st = {}
        try:
            pts = arsip_fn(sen, thn, st)
        except Exception as e:  # noqa: BLE001
            pts, st["galat"] = None, "%s: %s" % (type(e).__name__, e)
        if pts is None:
            status[thn] = "arsip %s gagal: %s" % (sen, FS.sensor_url("; ".join(str(v) for v in st.values()) or "tanpa alasan")[:300])
            return False
        pts = [p for p in pts if p["c"] in (1, 2) and mulai <= p["t"].strftime("%Y-%m-%d") <= akhir]
        if not pts:
            status[thn] = "arsip %s kosong di jendela" % sen
            return False
        semua += pts
    per_hari = collections.defaultdict(list)
    for p in semua:
        per_hari[p["t"].date()].append(titik_ke_ringkas(p))
    for d0, d1 in potongan(thn):
        if os.path.exists(jalur_potongan(d0)):
            continue
        simpan_potongan(d0, [r for i in range((d1 - d0).days + 1) for r in per_hari.get(d0 + dt.timedelta(days=i), ())])
    status[thn] = "arsip"
    return True


_KET = {}


def ketersediaan_sekali(kunci, ambil=None):
    """data_availability dipanggil SEKALI per jalan (memori) dan dicache di berkas per hari UTC; RuntimeError bila gagal (dipegang pemanggil)."""
    if "ket" in _KET:
        return _KET["ket"]
    if isinstance(_KET.get("galat"), Exception):
        raise _KET["galat"]
    jalur = os.path.join(CACHE, "ketersediaan.json")
    hari = dt.datetime.now(UTC).date().isoformat()
    try:
        if os.path.exists(jalur):
            c = json.load(open(jalur))
            if c.get("hari") == hari:
                _KET["ket"] = {k: (dt.date.fromisoformat(v[0]), dt.date.fromisoformat(v[1])) for k, v in c["ket"].items()}
                return _KET["ket"]
    except Exception:  # noqa: BLE001
        pass
    try:
        ket = FS.muat_ketersediaan(kunci, ambil or ambil_teks_cadangan, famili=FAMILI)
    except Exception as e:  # noqa: BLE001
        _KET["galat"] = RuntimeError(FS.sensor_url(str(e)))
        raise _KET["galat"] from None
    _KET["ket"] = ket
    os.makedirs(CACHE, exist_ok=True)
    json.dump({"hari": hari, "ket": {k: [v[0].isoformat(), v[1].isoformat()] for k, v in ket.items()}}, open(jalur, "w"))
    return ket


def api_cadangan(tahun_gagal, kunci, stop, unduh=None, benang=2):
    """CADANGAN bila arsip gagal: area API per potongan 5 hari, 1-2 benang, jeda panjang, data_availability sekali. -> set tahun yang lengkap."""
    unduh = unduh or unduh_potongan
    if not tahun_gagal or not kunci:
        return set()
    try:
        ket = ketersediaan_sekali(kunci)
    except Exception as e:  # noqa: BLE001
        print("lab_padam: data_availability gagal, cadangan API dilewati:", FS.sensor_url(e))
        return set()
    tugas = [((d0, d1), kunci, ket) for thn in tahun_gagal for d0, d1 in potongan(thn) if not os.path.exists(jalur_potongan(d0))]
    print("lab_padam: cadangan API, potongan belum ada:", len(tugas))
    with ThreadPoolExecutor(max(1, min(2, benang))) as ex:
        it = iter(tugas)
        while True:
            blok = [b for b in (next(it, None) for _ in range(4)) if b]
            if not blok or stop():
                break
            list(ex.map(unduh, blok))
    return {t for t in tahun_gagal if all(os.path.exists(jalur_potongan(d0)) for d0, _ in potongan(t))}


def kumpul_firms(tahun, kunci, stop, arsip_fn, unduh=None):
    """Arsip dulu per tahun; area API hanya untuk tahun yang arsipnya gagal. Kegagalan satu tahun tidak meng-crash. -> (status per tahun, tahun dari API)."""
    status, gagal = {}, []
    for thn in tahun:
        if all(os.path.exists(jalur_potongan(d0)) for d0, _ in potongan(thn)):
            status[thn] = "cache"
            continue
        if stop():
            status[thn] = "anggaran habis"
            continue
        try:
            ok = arsip_tahun(thn, arsip_fn, status)
        except Exception as e:  # noqa: BLE001
            ok, status[thn] = False, "arsip galat: " + FS.sensor_url("%s: %s" % (type(e).__name__, e))[:200]
        if not ok:
            gagal.append(thn)
    for thn in gagal:
        print("lab_padam: arsip %d gagal (%s); area API jadi cadangan" % (thn, status[thn]))
    pulih = api_cadangan([t for t in gagal if status[t] != "anggaran habis"], kunci, stop, unduh)
    for t in pulih:
        status[t] += " -> area API"
    return status, pulih


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


def selang_seling(sel, peat_share):
    """Urutkan sel berselang-seling gambut/mineral (stabil), supaya pemotongan kuota tidak menghapus satu strata."""
    g = [s for s in sel if peat_share.get(s, 0) >= .5]
    m = [s for s in sel if peat_share.get(s, 0) < .5]
    out = []
    for i in range(max(len(g), len(m))):
        out += g[i:i + 1] + m[i:i + 1]
    return out


def urut_tarik(sel, tahun, batch, ada=lambda thn, s: False):
    """Urutan tarikan [(tahun, [sel])]: potongan sel (yang sudah berselang-seling gambut/mineral) x tahun BERGILIR, jadi potongan kuota/waktu
    menghapus ekor semua tahun & strata secara merata, bukan satu tahun atau satu strata."""
    out = []
    for i in range(0, len(sel), batch):
        for thn in tahun:
            grup = [s for s in sel[i:i + batch] if not ada(thn, s)]
            if grup:
                out.append((thn, grup))
    return out


def cuaca_lengkap(sel, tahun):
    return all(baca_cuaca(thn, *s) is not None for thn in tahun for s in sel)


def tarik_cuaca(sel, tahun, anggaran, batch=8):
    """Tarik sel x tahun yang belum ada di cache, dibatasi KUOTA_BOBOT dan `anggaran()`; urutan bergilir tahun x (gambut/mineral). -> (bobot_terpakai, kuota_habis)."""
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    from umum import ambil, KuotaHabis  # noqa: E402
    bobot, habis = 0.0, False
    for thn, grup in urut_tarik(sel, tahun, batch, lambda t, s: baca_cuaca(t, *s) is not None):
        d_awal, d_akhir = dt.date(thn, *AWAL_CUACA), dt.date(thn, *AKHIR_DATA)
        per_lokasi = (d_akhir - d_awal).days / 14
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


def bangun_kejadian(pts, thn, jam_lokal, gambut, cuaca, ha_px, dalam=lambda lon, lat: True, cap=MAKS_KEJADIAN_TAHUN, rng=None, snaps=()):
    """PROSES PEMBARUAN kausal. pts: titik tahun `thn` (urut waktu). cuaca[(lat,lon)] = cw.
    Lokasi (identitas) = harian.dbscan(jam=48); dbscan TIDAK menggabungkan celah. Dalam tiap lokasi, tiap lintasan terakhir yang berdeteksi (rantai deteksi <= RANTAI_JAM)
    = calon 'deteksi terakhir' t_i = SATU pengamatan: Tn = jam sampai deteksi berikutnya dalam R km dari jejak (dicari di SEMUA titik, juga lokasi lain), None = tersensor.
    Aturan dinilai per pengamatan dengan informasi <= t_i + D. KOVARIAT (sel cuaca, gambut, lon lintasan, DC) dari titik tengah JEJAK pada t_i, bukan rerata seluruh lokasi;
    gambut = mayoritas piksel jejak; cuaca per pengamatan (tanpa cuaca = dibuang dan dihitung 'tanpa_cuaca').
    snaps: daftar datetime; -> deteksi terakhir <= S (titik terakhir dengan t <= S, bukan ujung rantai) per lokasi; px = piksel unik sampai S; awan72 dipotong di S.
    -> (pengamatan list, hitung dict, {S: [pengamatan]})."""
    rng = rng or random.Random(SEED)
    label, _ = H.dbscan(pts, jam=48)
    grup = collections.defaultdict(list)
    for i, l in enumerate(label):
        grup[l].append(i)
    idx = bangun_indeks(pts)
    akhir_data = dt.datetime(thn, *AKHIR_DATA, 23, 59, tzinfo=UTC)
    batas_ep = dt.datetime(thn, *AKHIR_KEJADIAN, 23, 59, tzinfo=UTC)
    hingga = dt.timedelta(days=(CAP_JAM + HORIZON_PALSU) / 24 + 3)
    hit = collections.Counter(lokasi=len(grup))
    gcache = {}

    def gmb(p):
        k = (round(p["lat"] / .004), round(p["lon"] / .004))
        if k not in gcache:
            gcache[k] = gambut.cari(p["lon"], p["lat"]) is not None
        return gcache[k]
    lokasi = []
    for l, ids in sorted(grup.items()):
        ps = [pts[i] for i in sorted(ids)]
        akhir, lihat, pxc = [], set(), []
        for j, p in enumerate(ps):
            lihat.add(H.pix(p))
            pxc.append(len(lihat))
            if j + 1 == len(ps) or (ps[j + 1]["t"] - p["t"]).total_seconds() / 3600 > RANTAI_JAM:
                akhir.append(j + 1)          # rantai berakhir: ps[j] = deteksi terakhir t_i
        lokasi.append({"lok": (thn, l), "ps": ps, "ts": [p["t"] for p in ps], "akhir": akhir, "pxc": pxc})

    def buat(Lk, j, S=None, h=None):
        """Pengamatan pada titik ke-j (1-based) lokasi Lk. S = waktu snapshot (awan72 dipotong di S) atau None. h = Counter penghitung."""
        h = hit if h is None else h
        ps = Lk["ps"]
        t_i = ps[j - 1]["t"]
        jej, lihat = [], set()
        for p in reversed(ps[:j]):              # 24 jam terakhir sampai t_i, paling baru dahulu
            if p["t"] < t_i - dt.timedelta(hours=24) or len(jej) >= 12:
                break
            k = (round(p["lat"] / .004), round(p["lon"] / .004))
            if k not in lihat:
                lihat.add(k)
                jej.append(p)
        lat0, lon0 = sum(p["lat"] for p in jej) / len(jej), sum(p["lon"] for p in jej) / len(jej)      # titik tengah jejak pada t_i
        if not dalam(lon0, lat0):
            h["di_luar_negeri_atau_laut"] += 1
            return None
        sel = sel_05(lat0, lon0)
        cw = cuaca.get(sel)
        if cw is None:
            h["tanpa_cuaca"] += 1
            return None
        tglok = (t_i + dt.timedelta(hours=lon0 / 15)).date().isoformat()
        dc = cw["dc"].get(tglok)
        if dc is None:
            h["tanpa_dc"] += 1
            return None
        gb = sum(1 for p in jej if gmb(p)) * 2 > len(jej)
        Tn = muncul_ulang(jej, t_i, idx, hingga=t_i + hingga)
        TnR = {R: muncul_ulang(jej, t_i, idx, km=R, hingga=t_i + hingga) for R in RADIUS_KEPEKAAN}
        pas = lintasan(t_i, lon0, jam_lokal)
        cp = {thr: lintas_bersih(pas, cw, t_i, thr)[:KMAKS] for thr in AMBANG_AWAN}
        maks_o = 72 if S is None else min(72, (S - t_i).total_seconds() / 3600)
        awan72 = [awan_jam(cw, t_i + dt.timedelta(hours=o)) for o, _, _ in pas if o <= maks_o]
        if S is not None and not awan72:
            fa = 0.0      # belum ada lintasan sampai S: deskriptif saja
        else:
            fa = (sum(1 for c in awan72 if c is None or c >= AMBANG_UTAMA) / len(awan72)) if awan72 else 1.0
        px = Lk["pxc"][j - 1]
        return {"thn": thn, "lok": Lk["lok"], "klaster": (sel, thn), "lat": round(lat0, 4), "lon": round(lon0, 4), "t_awal": ps[0]["t"], "t_akhir": t_i, "gb": bool(gb), "dc": dc,
                "px": px, "ha": px * ha_px, "Tn": Tn, "TnR": TnR, "fu": (akhir_data - t_i).total_seconds() / 3600, "cp": cp, "awan72": fa,
                "jejak": [[p["lon"], p["lat"]] for p in jej[:30]]}
    kand = []
    for Lk in lokasi:
        for j in Lk["akhir"]:
            if Lk["ps"][j - 1]["t"] > batas_ep:
                hit["di_luar_jendela"] += 1
            else:
                kand.append((Lk, j))
    hit["pengamatan_calon"] = len(kand)
    if len(kand) > cap:
        kand = rng.sample(kand, cap)             # sampel acak seragam atas pengamatan: laju tak bias
        hit["disampel_ke"] = cap
    eps = [e for e in (buat(Lk, j) for Lk, j in kand) if e is not None]
    snap, h_snap = {}, collections.Counter()
    for S in snaps:
        lst = []
        for Lk in lokasi:
            if Lk["ts"][0] > S:
                continue
            j = bisect.bisect_right(Lk["ts"], S)          # deteksi terakhir <= S: titik terakhir dengan t <= S, bukan ujung rantai
            e = buat(Lk, j, S, h_snap)
            if e is not None:
                lst.append(e)
        snap[S] = lst
    hit["pengamatan_dipakai"] = len(eps)
    hit["snapshot_tanpa_cuaca"] = h_snap["tanpa_cuaca"]
    return eps, dict(hit), snap


def olah_tahun(tahun_ok, pts, sel, jam_lokal, gambut, ha_px, dalam, sisa):
    """Bangun pengamatan + snapshot per tahun sampai waktu habis (sisa() < 120). -> (pengamatan, [(S, daftar)], hitungan per tahun, tahun yang DIPROSES)."""
    semua, snapsemua, ringkas_hit, diproses = [], [], {}, []
    for thn in tahun_ok:
        cuaca = {s: c for s in sel if (c := baca_cuaca(thn, *s))}
        pt = [p for p in pts[thn] if sel_05(p["lat"], p["lon"]) in cuaca]
        t1 = time.time()
        S_thn = [dt.datetime(thn, mm, dd, 12, tzinfo=UTC) for mm, dd in SNAPSHOT]
        eps, hit_t, snap = bangun_kejadian(pt, thn, jam_lokal, gambut, cuaca, ha_px, dalam=dalam, snaps=S_thn)
        hit_t["titik_di_sel_dengan_cuaca"] = len(pt)
        hit_t["sel_dengan_cuaca"] = len(cuaca)
        ringkas_hit[str(thn)] = hit_t
        semua += eps
        snapsemua += [(S, lst) for S, lst in snap.items()]
        diproses.append(thn)
        print("lab_padam: tahun", thn, hit_t, "%.0f dtk" % (time.time() - t1))
        if sisa() < 120:
            break
    return semua, snapsemua, ringkas_hit, diproses


def tahun_belum_diolah(diproses):
    """Tahun setel/uji yang belum diproses (dipotong waktu)."""
    return sorted(set(SETEL_TAHUN + UJI_TAHUN) - set(diproses))


def faktor_luas():
    """ha per piksel unik: kunci `ha_per_piksel` di lab/luas.json bila ada, selain itu garis_api.PIKSEL_HA. Selalu LUAS PIKSEL, bukan luas terbakar."""
    try:
        def cari(o):
            if isinstance(o, dict):
                if isinstance(o.get("ha_per_piksel"), (int, float)) and o["ha_per_piksel"] > 0:
                    return float(o["ha_per_piksel"])
                for v in o.values():
                    r = cari(v)
                    if r:
                        return r
            return None
        v = cari(json.load(open(LUAS_JSON)))
        if v:
            return v, "public/data/lab/luas.json (ha_per_piksel; luas piksel, bukan luas terbakar)"
    except (OSError, ValueError):
        pass
    return GA.PIKSEL_HA, "garis_api.PIKSEL_HA (luas piksel, bukan luas terbakar; lab/luas.json belum ada atau tanpa ha_per_piksel)"


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
                          "meluas": bool(ha is not None and ha >= 1.0), "muncul_ulang_menurut_firms": e.get("palsu", False)})
        except Exception as x:
            hasil.append({"id": f"{e['thn']}_{e['lat']}_{e['lon']}", "status": "galat_" + type(x).__name__})
    n = [h for h in hasil if "meluas" in h]
    return {"dicoba": len(hasil), "dinilai": len(n), "meluas": sum(h["meluas"] for h in n),
            "porsi_meluas": round(sum(h["meluas"] for h in n) / len(n), 3) if n else None, "rinci": hasil,
            "catatan": "dNBR antar dua adegan SESUDAH dinyatakan padam; bekas bakar yang masih bertambah = bukti tambahan muncul ulang. Gambut bawah permukaan tak selalu mengubah NBR."}


# ---------------------------------------------------------------- orkestrasi
BATASAN = [
    "Aturan berlaku untuk PROKSI AWAN ERA5 (cloud_cover total di titik tengah sel 0,5 derajat pada jam lintas), BUKAN masker VIIRS VNP14IMG; proksi ini tidak menangkap asap/kabut tebal (dominan Agu-Okt). "
    "Tidak boleh dikutip sebagai 'k lintasan satelit bersih' operasional sebelum divalidasi dengan masker VIIRS.",
    "'Lintasan bersih' tidak menjamin api terdeteksi: api kecil/dingin di bawah kanopi, di bawah ambang piksel 375 m, atau di tepi sapuan bisa lolos. Jadi laju muncul ulang di sini BATAS BAWAH.",
    "Bara gambut bawah permukaan tak terlihat satelit mana pun; 'tak muncul ulang' tidak membuktikan padam. Kebenaran akhir = konfirmasi lapangan (/uji-lapangan Q5), yang belum dipakai di sini.",
    "'Muncul ulang dalam R km' diukur dengan deteksi FIRMS yang sama (satu sumber): deteksi baru dalam R km bisa API BARU di dekatnya, bukan kebangkitan api lama. Radius 0,5/1/2 km disajikan sebagai kepekaan.",
    "Pengamatan = celah antar-deteksi (proses pembaruan) dan pengamatan satu sel berkorelasi: batas atas = maks(Wilson, bootstrap klaster sel x tahun B=%d persentil %.1f), strata wajib >= %d klaster (setel DAN uji). Lokasi besar yang terbakar lama tetap menyumbang lebih banyak celah." % (KLASTER_B, KLASTER_Q * 100, NKL),
    "DC dihitung dari cuaca jam 12 setempat pada tanggal t_i; untuk lintasan malam (sekitar 10 jam sebelumnya) DC itu adalah hari yang sama dan tidak berisi informasi sesudah t_i yang bocor ke vonis, tetapi kasar sekitar setengah hari.",
    "Bootstrap 20 klaster sempit untuk rasio langka (persentil 97,5 dari 20 sel kasar): sebab itu ditambal dengan maks(Wilson, bootstrap), dan 'tidak_ada_aturan' adalah hasil sah.",
    "Jam lintas diidealkan (satu lintasan siang + satu malam per satelit, jam surya median dari acq_time); tumpang-tindih sapuan di khatulistiwa dan bukan-lintasan diabaikan.",
    "Cuaca hanya untuk SEL SAMPEL (acak berstrata, benih tetap, dipilih dari titik tahun SETEL saja): luas di tiga angka adalah luas di sel sampel, BUKAN nasional. Pengamatan di sel tanpa cuaca dibuang.",
    "Dua tahun kering + dua basah: kesimpulan musiman bergantung pada empat musim saja; strata dengan n < %d dinyatakan tak cukup." % NMIN,
    "Luas = piksel unik sampai waktu snapshot x faktor ha/piksel: LUAS PIKSEL, bukan luas terbakar.",
    "Populasi utama: berlaku untuk kejadian >= %d piksel unik; semua ukuran hanya kepekaan." % PX_UTAMA,
]


def tulis(d, jalur=None):
    jalur = jalur or KELUAR
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(d, f, ensure_ascii=False, indent=1, default=lambda o: o.isoformat() if hasattr(o, "isoformat") else float(o))
    os.replace(jalur + ".tmp", jalur)


def catat_jalan(skrip, status, vonis, kriteria_sha, jalur=None, waktu=None):
    """Tambah SATU baris ke jalan.jsonl (append-only; baris lama tak pernah ditimpa; berkas/direktori dibuat bila belum ada).
    Format sama dengan lab_luas.py: {skrip, waktu, kriteria_sha, git_commit (env GITHUB_SHA), status, vonis}."""
    jalur = jalur or JALAN_LOG
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    baris = {"skrip": skrip, "waktu": waktu or dt.datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"), "kriteria_sha": kriteria_sha,
             "git_commit": os.environ.get("GITHUB_SHA"), "status": status, "vonis": vonis}
    with open(jalur, "a", encoding="utf-8") as f:
        f.write(json.dumps(baris, ensure_ascii=False, sort_keys=True) + "\n")
    return baris


def pilih_sel_sampel(hit, peat_share, n_g=SEL_G, n_m=SEL_M, n_min=SEL_N_MIN, benih=SEED):
    """Sampel berstrata ACAK (benih tetap) atas sel dengan titik >= n_min: n_g gambut (share >= .5) dan n_m mineral; semua sel bila kuota cukup.
    hit {sel: n titik TAHUN SETEL}, peat_share {sel: 0..1}."""
    rng = random.Random(benih)
    ok = sorted(s for s, n in hit.items() if n >= n_min)
    g = [s for s in ok if peat_share.get(s, 0) >= .5]
    m = [s for s in ok if peat_share.get(s, 0) < .5]
    pilih = lambda daftar, n: daftar if len(daftar) <= n else sorted(rng.sample(daftar, n))
    return pilih(g, n_g) + pilih(m, n_m)


def jalan():
    """Bungkus _jalan: catat baris awal dan akhir ke jalan.jsonl (append-only), juga bila gagal."""
    catat_jalan("lab_padam.py", "mulai", None, KRITERIA_SHA)
    try:
        vonis = _jalan()
    except BaseException as e:
        catat_jalan("lab_padam.py", "gagal", "%s: %s" % (type(e).__name__, FS.sensor_url(str(e))[:200]), KRITERIA_SHA)
        raise
    catat_jalan("lab_padam.py", "selesai", vonis, KRITERIA_SHA)


def _jalan():
    t0 = time.time()
    menit = float(os.environ.get("LAB_MENIT") or 30)
    sisa = lambda: menit * 60 - 150 - (time.time() - t0)
    kunci = os.environ.get("FIRMS_MAP_KEY")
    if not kunci:
        sys.exit("lab_padam: FIRMS_MAP_KEY tidak ada (jalan hanya di GitHub Actions)")
    out = {"_catatan": "LAB, bukan produksi. Kriteria ditulis SEBELUM angka dihitung.", "dibuat": dt.datetime.now(UTC).strftime("%Y-%m-%dT%H:%MZ"),
           "tahap": "kriteria_ditulis", "kriteria_sha": KRITERIA_SHA, "kriteria": KRITERIA, "batasan": BATASAN, "tahun": {str(k): v for k, v in TAHUN.items()}}
    tulis(out)    # kriteria ada di berkas sebelum satu angka hasil dihitung
    print("lab_padam: kriteria ditulis")

    # 1. FIRMS: arsip tahunan per negara (utama), area API hanya cadangan
    stop = lambda: sisa() < menit * 60 * 0.35 - 150
    def arsip_fn(sen, thn, st):
        r = LU.titik_sensor_tahun(sen, thn, None, stop, st)
        return r
    out["firms_status"], _ = kumpul_firms(list(TAHUN), kunci, stop, arsip_fn)
    for t, v in out["firms_status"].items():
        print("lab_padam: FIRMS", t, v)
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
        return "firms_belum_lengkap"
    jam_lokal = kalibrasi_lintas([p for v in pts.values() for p in v[::7]])
    out["lintasan_jam_surya"] = {"%s_%s" % k: v for k, v in jam_lokal.items()}

    # 2. sel sampel: acak berstrata (benih tetap), dipilih dari titik tahun SETEL saja
    gambut = Poligon(GAMBUT)
    dasar = [t for t in SETEL_TAHUN if t in tahun_ok] or tahun_ok
    hit = collections.Counter()
    contoh = collections.defaultdict(list)
    for t in dasar:
        for p in pts[t]:
            s = sel_05(p["lat"], p["lon"])
            hit[s] += 1
            if hit[s] % 40 == 0:
                contoh[s].append((p["lon"], p["lat"]))
    share = {s: sum(1 for x in v if gambut.cari(*x)) / len(v) for s, v in contoh.items() if v}
    sel = selang_seling(pilih_sel_sampel(hit, share), share)
    out["sel_sampel"] = {"n": len(sel), "gambut": sum(1 for s in sel if share.get(s, 0) >= .5), "dipilih_dari_tahun": dasar, "cara": "acak berstrata gambut/mineral, benih %d, sel dengan >= %d titik; semua sel bila kuota cukup" % (SEED, SEL_N_MIN),
                         "cakupan_luas": "tiga angka hanya untuk sel sampel ini, BUKAN nasional"}
    print("lab_padam: sel sampel", len(sel))

    # 3. cuaca
    bobot, habis = tarik_cuaca(sel, tahun_ok, lambda: sisa() < menit * 60 * 0.15)
    out["cuaca"] = {"bobot_terpakai": round(bobot), "kuota_bobot_per_jalan": KUOTA_BOBOT, "terpotong_kuota_atau_waktu": habis}
    terpotong = bool(habis or not cuaca_lengkap(sel, tahun_ok))
    out["cuaca"]["terpotong"] = terpotong
    out["vonis_bila_cuaca_terpotong"] = KRITERIA["vonis_bila_cuaca_terpotong"]
    print("lab_padam: bobot Open-Meteo", round(bobot), "terpotong", terpotong)

    # 4. pengamatan (proses pembaruan)
    from wilayah import Wilayah
    wil = Wilayah()
    ha_px, sumber_ha = faktor_luas()
    out["luas"] = {"ha_per_piksel": ha_px, "sumber": sumber_ha, "catatan": "luas piksel, bukan luas terbakar"}
    semua, snapsemua, ringkas_hit, diproses = olah_tahun(tahun_ok, pts, sel, jam_lokal, gambut, ha_px, lambda lon, lat: wil.cari(lon, lat) is not None, sisa)
    kurang = tahun_belum_diolah(diproses)
    if kurang:      # waktu habis di tengah loop tahun: tahun setel/uji yang tak terolah = terpotong, bukan diam-diam
        terpotong = True
        out["cuaca"]["terpotong"] = True
        out["cuaca"]["terpotong_waktu_olah"] = kurang
        print("lab_padam: waktu habis, tahun belum diolah:", kurang)
    out["kejadian"] = {"per_tahun": ringkas_hit, "total_pengamatan": len(semua), "gambut": sum(e["gb"] for e in semua),
                       "satuan": "pengamatan = celah antar-deteksi (proses pembaruan), bukan kejadian utuh"}
    utama = [e for e in semua if e["px"] >= PX_UTAMA]

    # 5. KM (semua tahun: deskriptif, bukan pemilihan)
    if utama:
        out["survival_km"] = {"label": "PARSIAL: cuaca/waktu terpotong, tahun tak lengkap" if terpotong else "deskriptif, semua tahun yang diolah", "populasi": "berlaku untuk kejadian >= %d piksel (sampai t_i)" % PX_UTAMA, "B": BOOT, "strata": km_strata(utama)}
    out["tahap"] = "km_selesai"
    tulis(out)

    # 6. UJI MURNI: setel di tahun setel -> pilih dari data setel -> uji SEKALI di tahun uji
    ada = all(t in tahun_ok for t in SETEL_TAHUN + UJI_TAHUN) and not terpotong
    a_ = [e for e in utama if e["thn"] in SETEL_TAHUN]
    b_ = [e for e in utama if e["thn"] in UJI_TAHUN]
    pilih, vonis, par = None, KRITERIA["vonis_bila_cuaca_terpotong"] if terpotong else "tidak_dapat_dinilai", {}
    AR = {"label": "UJI MURNI: parameter disetel dan aturan dipilih HANYA dari tahun setel; diuji SEKALI di tahun uji. Populasi: berlaku untuk kejadian >= %d piksel." % PX_UTAMA,
          "kriteria_sha": KRITERIA_SHA, "tahun_setel": SETEL_TAHUN, "tahun_uji": UJI_TAHUN}
    if ada and a_ and b_:
        par = setel(a_)
        pilih = pilih_setel(par)
        h = uji_lipat(a_, b_, par)
        vonis = vonis_uji(h, pilih)
        AR["uji_murni"] = {"n_setel": len(a_), "n_uji": len(b_), "parameter_dari_setel": par, "pemilihan_dari": "data setel saja", "terpilih": pilih, "vonis": vonis, "uji_hasil": h,
                           "kepekaan_radius_muncul_ulang": {"terpilih": kepekaan_radius(b_, par.get(pilih)) if pilih else None, "A0": kepekaan_radius(b_, {"tipe": "A0"})},
                           "aturan_berlaku_untuk": "PROKSI AWAN ERA5 (titik tengah sel 0,5 derajat), tidak menangkap asap; bukan 'k lintasan satelit bersih' operasional sebelum divalidasi dengan masker VIIRS"}
        # kepekaan: arah sebaliknya (BUKAN untuk memilih)
        par2 = setel(b_)
        AR["kepekaan_arah_sebaliknya"] = {"label": "KEPEKAAN saja, tidak dipakai memilih: setel di %s, uji di %s" % (UJI_TAHUN, SETEL_TAHUN), "parameter": par2, "uji_hasil": uji_lipat(b_, a_, par2)}
        # kepekaan: semua ukuran, parameter dari setel, dinilai di tahun uji
        uji_semua = [e for e in semua if e["thn"] in UJI_TAHUN]
        sem = uji_lipat(a_, uji_semua, par)
        AR["kepekaan_semua_ukuran"] = {"label": "parameter dari set SETEL (bukan in-sample), dinilai di tahun UJI %s untuk semua ukuran (1+ piksel)" % UJI_TAHUN,
                                       "hasil": {k: {"muncul_ulang_wilson_gambut": v["metrik"]["gambut"]["muncul_ulang_wilson"], "muncul_ulang_wilson_mineral": v["metrik"]["mineral"]["muncul_ulang_wilson"],
                                                     "telat_vs_A0": v["selisih_telat_vs_A0_jam"]} for k, v in sem.items() if v.get("metrik")}}
        AR["parameter_akhir_gabungan"] = {"label": "IN-SAMPLE: disetel di SEMUA tahun, bukan bukti kinerja; hanya rujukan bentuk parameter", "parameter": setel(utama)}
        out["vonis_aturan"] = {"terpilih": pilih, "vonis": vonis}
    else:
        out["vonis_aturan"] = {"terpilih": None, "vonis": vonis, "alasan": "cuaca terpotong" if terpotong else "data setel/uji tidak lengkap"}
        AR["status"] = ("tidak_dapat_dinilai, alasan: cuaca terpotong (kuota/waktu/galat); tidak ada vonis dari data parsial. " if terpotong else "") + "tidak dapat dinilai: tahun setel/uji belum lengkap atau tanpa pengamatan (setel %s, uji %s, lengkap %s)" % (len(a_), len(b_), tahun_ok)
    out["aturan"] = AR
    out["tahap"] = "aturan_selesai"
    tulis(out)

    # 7. tiga angka: aturan dari set SETEL saja; label tahun uji/tahun setel
    ar_baik = par.get(pilih) if pilih else {"tipe": "A0"}
    ar_baik = ar_baik or {"tipe": "A0"}
    snaps = []
    for S, lst in sorted(snapsemua, key=lambda x: x[0]):
        ep = [e for e in lst if e["px"] >= PX_UTAMA]
        snaps.append({"tgl": S.strftime("%Y-%m-%d"), "peran_tahun": "uji" if S.year in UJI_TAHUN else "setel", "A0": luas_tiga(ep, {"tipe": "A0"}, S),
                      "aturan_terpilih_atau_A0": luas_tiga(ep, ar_baik, S)})
    out["tiga_angka"] = {"definisi": {
        "aktif_teramati": "lokasi dengan deteksi terakhir <= 24 jam sebelum snapshot",
        "tak_teramati": "tanpa deteksi > 24 jam tetapi belum memenuhi aturan padam (menunggu lintasan bersih / tertutup awan); tak_teramati_awan_n = yang >= 50% lintasan 72 jam berawan",
        "kandidat_padam": "sudah memenuhi aturan padam dalam 7 hari terakhir: layak diverifikasi (lapangan/Sentinel-2), belum pasti padam",
        "luas": "piksel unik SAMPAI waktu snapshot x ha/piksel = LUAS PIKSEL, bukan luas terbakar; HANYA sel sampel (acak berstrata dari tahun setel), BUKAN nasional",
        "informasi": "status tiap lokasi memakai hanya informasi <= waktu snapshot (deteksi terakhir <= snapshot, bukan t_akhir episode)"},
        "label": "parameter aturan dipilih dari set SETEL (%s); snapshot tiap tahun diberi peran_tahun uji/setel" % SETEL_TAHUN,
        "aturan_dipakai": ar_baik, "aturan_lolos_uji": vonis == "lolos", "snapshot": snaps}

    # 8. Sentinel-2 (tahun uji, aturan terpilih)
    if sisa() > 240 and ar_baik.get("tipe") != "A0":
        pad = []
        rng = random.Random(SEED)
        for e in b_:
            D = D_aturan(e, ar_baik)
            if klasif(e, D) in ("benar", "palsu") and e["px"] >= 5:
                pad.append(dict(e, D=D, palsu=klasif(e, D) == "palsu"))
        rng.shuffle(pad)
        t1 = time.time()
        out["sentinel2"] = sentinel2(pad, lambda: sisa() < 60 or time.time() - t1 > 600)
    else:
        out["sentinel2"] = {"dilewati": "waktu tersisa tidak cukup atau aturan terpilih A0/tidak ada"}
    out["tahap"] = "selesai"
    out["detik"] = round(time.time() - t0)
    tulis(out)
    ringkas()
    return "%s %s" % (pilih or "tidak_ada_aturan", vonis)


def ringkas():
    try:
        d = json.load(open(KELUAR))
    except (OSError, ValueError):
        print("lab_padam: padam.json belum ada")
        return
    k = d["kriteria"]
    L = ["# Lab: luas masih terdeteksi / belum padam", "", "Tahap: %s. Tahun lengkap: %s. kriteria_sha: %s. LAB, bukan produksi." % (d.get("tahap"), d.get("tahun_lengkap"), d.get("kriteria_sha")), "",
         "> %s" % k["label_proksi_awan"], "", "## Kriteria (dipra-tulis, scripts/data/lab_kriteria/lab_padam.json)", "",
         "- Pilih k terkecil dengan aturan_batas <= %.0f%% di set setel: aturan_batas = maks(Wilson 95%%, bootstrap klaster sel x tahun B=%d p%.1f), gambut DAN mineral, n >= %d, >= %d klaster"
         % (k["wilson_batas_atas_setel_maks"] * 100, k["bootstrap_klaster_B"], k["ci_batas_atas_kuantil"] * 100, k["n_min_per_strata"], k["n_klaster_min"]),
         "- Lolos bila aturan_batas <= %.0f%% di set uji (gambut DAN mineral, sama: n >= %d, >= %d klaster)" % (k["wilson_batas_atas_uji_maks"] * 100, k["n_min_per_strata"], k["n_klaster_min"]),
         "- Tak dinyatakan padam dalam %d jam <= %.0f%% pengamatan (setel DAN uji, gambut DAN mineral)" % (k["cap_jam"], k["tak_dinyatakan_maks"] * 100),
         "- Keterlambatan vs A0 <= %d jam (berpasangan; bersyarat pada hasil)" % k["keterlambatan_maks_vs_A0_jam"], "- Setel %s, uji %s, SEKALI; arah sebaliknya hanya kepekaan" % (k["tahun_setel"], k["tahun_uji"]), ""]
    a = d.get("aturan") or {}
    um = a.get("uji_murni")
    if um:
        L += ["## Uji murni (tahun uji %s, parameter dari tahun setel %s)" % (k["tahun_uji"], k["tahun_setel"]), "", "**Terpilih: %s. Vonis: %s.**" % (um["terpilih"], um["vonis"]), "",
              "| aturan | batas atas gabungan gambut | mineral | n klaster g/m | tak dinyatakan g/m | selisih telat vs A0 (jam) | lolos |", "|---|---|---|---|---|---|---|"]
        for n, v in um["uji_hasil"].items():
            m = v.get("metrik")
            nm = n + (" (pembanding, laporan saja)" if v.get("laporan_saja") else "")
            L.append("| %s | %s | %s | %s/%s | %s/%s | %s | %s |" % (nm, m and m["gambut"]["batas_atas_gabungan"], m and m["mineral"]["batas_atas_gabungan"],
                                                              m and m["gambut"]["n_klaster"], m and m["mineral"]["n_klaster"], m and m["gambut"]["tak_dinyatakan"], m and m["mineral"]["tak_dinyatakan"],
                                                              v.get("selisih_telat_vs_A0_jam"), v.get("lolos") if not v.get("laporan_saja") else "-"))
        L += [""]
    elif a.get("status"):
        L += ["## Aturan", "", a["status"], ""]
    t = d.get("tiga_angka")
    if t:
        L += ["## Tiga angka (bukan satu; sel sampel saja, luas piksel bukan luas terbakar)", ""] + ["- %s: %s" % (x, y) for x, y in t["definisi"].items()] + ["", "- %s" % t.get("label"), "",
              "| snapshot | peran tahun | aturan | aktif teramati (ha) | tak teramati (ha) | kandidat padam (ha) |", "|---|---|---|---|---|---|"]
        for s in t["snapshot"]:
            for n in ("A0", "aturan_terpilih_atau_A0"):
                v = s[n]
                L.append("| %s | %s | %s | %s | %s | %s |" % (s["tgl"], s.get("peran_tahun"), n, v["aktif_teramati_ha"], v["tak_teramati_ha"], v["kandidat_padam_ha"]))
        L.append("")
    km = (d.get("survival_km") or {}).get("strata", {})
    if km.get("semua", {}).get("g"):
        L += ["## P(muncul ulang <= 7 hari | tak terdeteksi g jam), semua pengamatan (deskriptif)", ""] + ["- g=%s jam: %s" % (g, v and v.get("p")) for g, v in km["semua"]["g"].items()] + [""]
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
    cnt_ = [0]
    def ep(gb, dc, Tn, cp80, px=5, klaster=None):
        cnt_[0] += 1      # klaster bergilir: 30 sel (sel x tahun) kecuali ditentukan
        return {"gb": gb, "dc": dc, "Tn": Tn, "cp": {60: cp80[:1], 80: cp80, 90: cp80}, "px": px, "thn": 2019, "fu": 400.0,
                "klaster": klaster or ((cnt_[0] % 30) * .5 + .25, 2019)}
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
    assert m["n_dinyatakan"] == 2 and m["n_muncul_ulang"] == 1 and m["laju_muncul_ulang"] == .5 and m["telat_jam"] == 72.0 and m["n_muncul_sebelum_dinyatakan"] == 1, m
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
    assert h["A1"]["metrik"]["gambut"]["laju_muncul_ulang"] == .2 and not h["A1"]["lolos_muncul_ulang"] and not h["A1"]["lolos"], h["A1"]["metrik"]["gambut"]
    assert h["A3"]["selisih_telat_vs_A0_jam"] < 0 and h["A3"]["lolos_telat"]
    assert pilih_setel(par) == "A3" and vonis_uji(h, "A3") == "lolos" and vonis_uji(h, "A1") == "tidak_lolos" and vonis_uji(h, None) == "tidak_ada_aturan"
    assert pilih_setel({"A2": None, "A3": None, "A4": None}) is None
    # telat tak lolos bila k besar: paksa A2 k=12 -> D=144 vs A0=72: selisih > 24
    ar = {"A2": {"tipe": "A2", "thr": 80, "k": 12}, "A3": None, "A4": None}
    hh = uji_lipat(eps, eps, ar)
    assert not hh["A2"]["lolos_telat"] and hh["A2"]["lolos_muncul_ulang"] and hh["A3"]["alasan"], hh["A2"]
    # data kurang (n dinyatakan < NMIN) -> bukan lolos
    assert not uji_lipat(eps[:10], eps[:10], par)["A3"]["lolos"]
    # kriteria hanya menyentuh gambut DAN mineral: mineral palsu tinggi menggagalkan
    eps_m = [ep(True, 300, None, cp) for _ in range(60)] + [ep(False, 100, 50.0 if i < 20 else None, cp) for i in range(60)]
    assert not uji_lipat(eps_m, eps_m, {"A2": {"tipe": "A2", "thr": 80, "k": 2}, "A3": None, "A4": None})["A2"]["lolos"]

    # --- pipeline PROSES PEMBARUAN sintetis (harian.dbscan identitas + celah antar-deteksi + DC + awan + gambut)
    class FakeGambut:
        def cari(self, lon, lat):
            return {} if lat < -2.5 else None
    def P(lat, lon, jam, sen="N"):
        return {"lat": lat, "lon": lon, "t": dt.datetime(2023, 9, 1, tzinfo=UTC_) + dt.timedelta(hours=jam), "px": .4, "dn": "D", "s": sen, "c": 1}
    # api A (gambut): rantai jam 6-7 (t_i=7); muncul ulang jam 37 = 30 jam sesudah t_i (24-36 jam); lalu jam 37+150 = muncul ulang 150 jam; 1 piksel kecil digeser ~220 m
    pts = [P(-3.0, 110.0, 6), P(-3.0, 110.001, 7), P(-3.0, 110.0, 37), P(-3.0, 110.002, 37 + 150)]
    pts += [P(-1.0, 105.0, 10), P(-1.0, 105.0, 20)]                                  # api B (mineral): dua lintasan; t_i=20 tak pernah muncul ulang
    pts += [P(-1.0, 105.02, 24 * 30)]                                                 # titik jauh >1 km di waktu lain: bukan muncul ulang api B
    pts.sort(key=lambda p: p["t"])
    jl = {("N", "D"): 13.5, ("N", "N"): 1.5}
    cwf = {"utc0": dt.datetime(2023, 3, 1, tzinfo=UTC_), "cc": [20] * (24 * 300), "dc": {"2023-09-%02d" % i: 410.0 + i for i in range(1, 31)} | {"2023-10-%02d" % i: 440.0 for i in range(1, 31)}}
    cuaca = {sel_05(-3.0, 110.0): cwf, sel_05(-1.0, 105.0): cwf}
    t0_ = dt.datetime(2023, 9, 1, tzinfo=UTC_)
    # B17: dbscan(jam=48) lama menyatukan 6,7,37 jadi satu kejadian (celah 30 jam HILANG); pembaruan menjadikannya pengamatan sendiri
    lab_lama, _ = H.dbscan([p for p in pts if p["lat"] < -2.5][:3], jam=48)
    assert len(set(lab_lama)) == 1, lab_lama
    eps_s, hit, snap = bangun_kejadian(pts, 2023, jl, FakeGambut(), cuaca, 14.0625)
    A_ = sorted((e for e in eps_s if e["gb"]), key=lambda e: e["t_akhir"])
    B_ = sorted((e for e in eps_s if not e["gb"]), key=lambda e: e["t_akhir"])
    assert [e["t_akhir"] for e in A_] == [t0_ + dt.timedelta(hours=h_) for h_ in (7, 37, 187)], [e["t_akhir"] for e in A_]
    assert [round(e["Tn"], 3) if e["Tn"] is not None else None for e in A_] == [30.0, 150.0, None], [e["Tn"] for e in A_]
    assert [e["Tn"] for e in B_] == [10.0, None, None] and len(B_) == 3, [e["Tn"] for e in B_]     # t_i=10 -> jam 20 (10 jam); t_i=20 tak muncul; titik jauh tak muncul
    assert A_[0]["dc"] == 411.0, A_[0]["dc"]       # t_i 7 UTC = 14:18 setempat 1 Sep
    assert A_[0]["px"] >= 1 and A_[1]["px"] >= A_[0]["px"] and A_[0]["fu"] > 0 and len(B_[1]["cp"][80]) == KMAKS and B_[1]["cp"][80][0] > LINTAS_MIN_JAM and B_[1]["cp"][60] == B_[1]["cp"][80]
    # aturan 24 jam kini mencatat muncul ulang jam 37 (30 jam sesudah t_i) sebagai PALSU; aturan 48 jam tidak (belum dinyatakan)
    aj24, aj48 = {"tipe": "AJ", "jam": 24}, {"tipe": "AJ", "jam": 48}
    assert klasif(A_[0], D_aturan(A_[0], aj24)) == "palsu" and klasif(A_[0], D_aturan(A_[0], aj48)) == "sebelum"
    assert klasif(A_[1], D_aturan(A_[1], aj24)) == "palsu" and klasif(A_[2], 24.0) == "benar"       # 150 jam: 24 < 150 <= 24+168 -> palsu; tanpa muncul ulang -> benar
    assert metrik(A_, [24.0] * 3)["n_muncul_ulang"] == 2 and metrik(A_, [48.0] * 3)["n_muncul_ulang"] == 1
    # pembaruan kausal: SEMUA celah ada; tak ada pengelompokan yang membuang 'celah < 48 jam'
    assert len(eps_s) == 6 and hit["pengamatan_dipakai"] == 6 and all(e["lok"][0] == 2023 for e in eps_s), hit
    # kepekaan radius: titik 1,5 km dari jejak = muncul ulang pada 2 km, bukan pada 1 km / 0,5 km
    pr = [P(-1.0, 105.0, 10), P(-1.0, 105.0 + 1.5 / 111.32, 60)]
    er, _, _ = bangun_kejadian(pr, 2023, jl, FakeGambut(), cuaca, 14.0625)
    e0r = [e for e in er if e["t_akhir"] == t0_ + dt.timedelta(hours=10)][0]
    assert e0r["Tn"] is None and e0r["TnR"][0.5] is None and abs(e0r["TnR"][2.0] - 50.0) < 1e-6, (e0r["Tn"], e0r["TnR"])
    kr = kepekaan_radius([dict(e0r, gb=True, dc=100.0, cp={60: [12.0], 80: [12.0], 90: [12.0]})], aj24)
    assert set(kr) == {"muncul_ulang_dalam_0.5_km", "muncul_ulang_dalam_1_km", "muncul_ulang_dalam_2_km"} and kr["muncul_ulang_dalam_2_km"]["gambut"]["n_muncul_ulang"] == 1 and kr["muncul_ulang_dalam_1_km"]["gambut"]["n_muncul_ulang"] == 0
    # snapshot kausal: S = jam 20 -> deteksi terakhir <= S saja (lokasi A: t_i=7; Tn=30 > umur 13 -> belum muncul ulang), px sampai S
    S_ = t0_ + dt.timedelta(hours=20)
    es, _, sn = bangun_kejadian(pts, 2023, jl, FakeGambut(), cuaca, 14.0625, snaps=[S_])
    ls = {e["gb"]: e for e in sn[S_]}
    assert ls[True]["t_akhir"] == t0_ + dt.timedelta(hours=7) and ls[False]["t_akhir"] == t0_ + dt.timedelta(hours=20) and all(e["t_akhir"] <= S_ for e in sn[S_]), sn[S_]
    assert ls[True]["px"] == len({H.pix(p) for p in pts[:2]}), ls[True]["px"]
    # awan 100% -> tak ada lintasan bersih
    cwc = dict(cwf, cc=[100] * (24 * 300))
    ec, _, _ = bangun_kejadian(pts, 2023, jl, FakeGambut(), {sel_05(-3.0, 110.0): cwc, sel_05(-1.0, 105.0): cwc}, 14.0625)
    assert all(e["cp"][80] == [] and e["cp"][90] == [] for e in ec) and all(e["awan72"] == 1.0 for e in ec)
    # tanpa cuaca sel -> dibuang dan dihitung
    e0, h0, _ = bangun_kejadian(pts, 2023, {("N", "D"): 13.5}, FakeGambut(), {sel_05(-1.0, 105.0): cwf}, 14.0625)
    assert h0.get("tanpa_cuaca") == 3 and all(not e["gb"] for e in e0), h0
    # cap: sampel acak pengamatan, benih tetap
    ecap1, hc, _ = bangun_kejadian(pts, 2023, jl, FakeGambut(), cuaca, 14.0625, cap=3)
    ecap2, _, _ = bangun_kejadian(pts, 2023, jl, FakeGambut(), cuaca, 14.0625, cap=3)
    assert len(ecap1) == 3 and hc["disampel_ke"] == 3 and [e["t_akhir"] for e in ecap1] == [e["t_akhir"] for e in ecap2]

    # --- B2: kovariat dari titik tengah JEJAK pada t_i. Api merayap melewati batas sel 100,5: tiap pengamatan di selnya sendiri, tanpa cuaca = dibuang & dihitung
    def Q(lat, lon, jam):
        return dict(P(lat, lon, jam), px=1.0)
    dr = [Q(-1.0, 100.495, 6), Q(-1.0, 100.500, 40), Q(-1.0, 100.505, 74), Q(-1.0, 100.510, 108)]
    c1 = sel_05(-1.0, 100.495)
    assert sel_05(-1.0, 100.500) != c1
    ed, hd, _ = bangun_kejadian(dr, 2023, jl, FakeGambut(), {c1: cwf}, 14.0625)
    assert len(ed) == 1 and hd["tanpa_cuaca"] == 3 and ed[0]["klaster"] == (c1, 2023) and abs(ed[0]["lon"] - 100.495) < 1e-9, (hd, [e["lon"] for e in ed])
    ed2, hd2, _ = bangun_kejadian(dr, 2023, jl, FakeGambut(), {c1: cwf, sel_05(-1.0, 100.5): cwf}, 14.0625)
    assert len(ed2) == 4 and {e["klaster"][0] for e in ed2} == {c1, sel_05(-1.0, 100.5)} and abs(ed2[3]["lon"] - 100.510) < 1e-9
    # gambut = mayoritas piksel jejak (3 titik serentak: 2 gambut -> True; 1 gambut -> False); bukan titik tengah lokasi
    gb2 = [Q(-2.4985, 110.0, 6), Q(-2.5045, 110.0, 6), Q(-2.5085, 110.0, 6)]
    gb1 = [Q(-2.4985, 110.0, 6), Q(-2.4945, 110.0, 6), Q(-2.5045, 110.0, 6)]
    cg = {sel_05(-2.504, 110.0): cwf, sel_05(-2.499, 110.0): cwf}
    assert [e["gb"] for e in bangun_kejadian(gb2, 2023, jl, FakeGambut(), cg, 14.0625)[0]] == [True]
    assert [e["gb"] for e in bangun_kejadian(gb1, 2023, jl, FakeGambut(), cg, 14.0625)[0]] == [False]

    # --- B3: snapshot di tengah rantai deteksi: 'deteksi terakhir' = titik terakhir t <= S (bukan ujung rantai); piksel & awan72 sampai S
    ch = [Q(-1.0, 105.000, 6), Q(-1.0, 105.005, 7), Q(-1.0, 105.010, 8)]
    S3 = t0_ + dt.timedelta(hours=7, minutes=30)
    _, _, sn3 = bangun_kejadian(ch, 2023, jl, FakeGambut(), cuaca, 14.0625, snaps=[S3])
    assert len(sn3[S3]) == 1 and sn3[S3][0]["t_akhir"] == t0_ + dt.timedelta(hours=7) and sn3[S3][0]["px"] == len({H.pix(p) for p in ch[:2]}) == 2, sn3[S3]
    assert sn3[S3][0]["Tn"] == 1.0 and sn3[S3][0]["t_akhir"] <= S3        # titik jam 8 ada di masa depan S: hanya muncul sebagai Tn > umur
    # awan sesudah S tidak boleh mempengaruhi awan72 snapshot: bersih sampai S+30 jam, berawan sesudahnya
    S4 = t0_ + dt.timedelta(hours=7 + 30)
    nS = int((S4 - dt.datetime(2023, 3, 1, tzinfo=UTC_)).total_seconds() / 3600)
    cwk = dict(cwf, cc=[20] * nS + [100] * (24 * 300 - nS))
    ck = {sel_05(-1.0, 105.0): cwk}
    e_pen, _, sn4 = bangun_kejadian(ch, 2023, jl, FakeGambut(), ck, 14.0625, snaps=[S4])
    assert sn4[S4][0]["awan72"] == 0.0 and [e for e in e_pen if e["t_akhir"] == t0_ + dt.timedelta(hours=8)][0]["awan72"] > 0, (sn4[S4][0]["awan72"])

    # --- B4: urutan tarik cuaca bergilir tahun x strata; potongan tak menghapus satu strata/tahun; terpotong = tidak lengkap
    sh = {(float(i), 100.25): (1.0 if i % 2 == 0 else 0.0) for i in range(8)}
    sl = selang_seling(sorted(sh)[::-1][:4] + sorted(sh)[:4], sh)
    assert [sh[x] >= .5 for x in sl[:4]] == [True, False, True, False] and sorted(sl) == sorted(sh)
    ur = urut_tarik(sl, [2019, 2020], 2)
    assert [t for t, _ in ur[:4]] == [2019, 2020, 2019, 2020] and all({sh[x] >= .5 for x in g} == {True, False} for _, g in ur) and len(ur) == 8
    assert urut_tarik(sl, [2019, 2020], 2, lambda thn, x: thn == 2019 and x == sl[0])[0] == (2019, [sl[1]])
    import tempfile as _tf
    _lama = globals()["CACHE"]
    with _tf.TemporaryDirectory() as td_:
        globals()["CACHE"] = td_
        try:
            assert not cuaca_lengkap([(1.25, 100.25)], [2019])
            simpan_cuaca(2019, 1.25, 100.25, cwf)
            assert cuaca_lengkap([(1.25, 100.25)], [2019]) and not cuaca_lengkap([(1.25, 100.25)], [2019, 2020])
        finally:
            globals()["CACHE"] = _lama
    assert KRITERIA["vonis_bila_cuaca_terpotong"] == "tidak_dapat_dinilai" and "terpotong" in inspect.getsource(_jalan) and "vonis_bila_cuaca_terpotong" in inspect.getsource(_jalan)

    # --- B5/B6: A0/A1 laporan saja; label selisih; arah sebaliknya TIDAK memilih
    hl = uji_lipat(eps, eps, par)
    assert hl["A0"]["laporan_saja"] and hl["A1"]["laporan_saja"] and not hl["A3"]["laporan_saja"] and "bersyarat" in hl["A3"]["selisih_telat_label"] and set(PEMBANDING) == {"A0", "A1"}
    src_ = inspect.getsource(_jalan)
    assert list(inspect.signature(pilih_setel).parameters) == ["params"] and src_.count("pilih_setel(") == 1 and "pilih_setel(par)" in src_ and "LIPAT[1]" not in src_ and "pilih_setel(par2)" not in src_
    assert LIPAT[1]["setel"] == UJI_TAHUN and KRITERIA["arah_sebaliknya_hanya_kepekaan"] is True and "arah_sebaliknya_hanya_kepekaan" in KRITERIA["_catatan"]

    # --- F1: waktu habis di tengah loop tahun -> tahun tak terolah dilaporkan (jalur nyata olah_tahun), bukan diam-diam
    import tempfile as _tf2
    def Py(thn, lat, lon, jam):
        return {"lat": lat, "lon": lon, "t": dt.datetime(thn, 9, 1, tzinfo=UTC_) + dt.timedelta(hours=jam), "px": .4, "dn": "D", "s": "N", "c": 1}
    selx = [sel_05(-1.0, 105.0)]
    ptsy = {thn: [Py(thn, -1.0, 105.0, 10), Py(thn, -1.0, 105.0, 20)] for thn in (2019, 2020)}
    _lama = globals()["CACHE"]
    with _tf2.TemporaryDirectory() as td_:
        globals()["CACHE"] = td_
        try:
            for thn in (2019, 2020):
                simpan_cuaca(thn, *selx[0], {"utc0": dt.datetime(thn, 3, 1, tzinfo=UTC_), "cc": [20] * (24 * 300), "dc": {"%d-09-%02d" % (thn, i): 400.0 for i in range(1, 31)}})
            r_cepat = olah_tahun([2019, 2020], ptsy, selx, jl, FakeGambut(), 14.0, lambda lon, lat: True, lambda: 0)         # waktu sudah habis sesudah tahun pertama
            r_penuh = olah_tahun([2019, 2020], ptsy, selx, jl, FakeGambut(), 14.0, lambda lon, lat: True, lambda: 1000)
        finally:
            globals()["CACHE"] = _lama
    assert r_cepat[3] == [2019] and r_penuh[3] == [2019, 2020] and set(r_cepat[2]) == {"2019"} and len(r_cepat[0]) < len(r_penuh[0])
    assert tahun_belum_diolah(r_cepat[3]) == [2020, 2022, 2023] and tahun_belum_diolah(r_penuh[3]) == [2022, 2023] and tahun_belum_diolah([2019, 2020, 2022, 2023]) == []

    # --- F3: gerbang tak-dinyatakan (setel DAN uji, gambut DAN mineral); penyebut = pengamatan tanpa muncul ulang sampai cap
    cp_pdk, cp_pjg = [12.0, 24.0, 36.0], [12.0 * i for i in range(1, 13)]
    def campur(frac):
        out_ = []
        for gb_ in (True, False):
            out_ += [ep(gb_, 300, None, cp_pdk if i < int(100 * frac) else cp_pjg) for i in range(100)]
        return out_
    t30, t15 = tabel_k(campur(.30), 80), tabel_k(campur(.15), 80)
    assert t30["g"][4][5] == 30 and t30["g"][4][6] == 100 and not _ok(t30["g"][4], WILSON_SETEL) and _ok(t15["g"][4], WILSON_SETEL) and _ok(t15["m"][4], WILSON_SETEL)
    pr4 = {"A2": {"tipe": "A2", "thr": 80, "k": 4}}
    u30, u15 = uji_lipat(campur(.30), campur(.30), pr4)["A2"], uji_lipat(campur(.15), campur(.15), pr4)["A2"]
    assert u30["metrik"]["gambut"]["tak_dinyatakan"] == .3 and not u30["lolos_tak_dinyatakan"] and not u30["lolos"] and u30["lolos_muncul_ulang"] and u30["lolos_telat"]
    assert u15["lolos_tak_dinyatakan"] and u15["lolos"] and TAK_MAKS == .20
    # yang muncul ulang cepat tidak masuk penyebut (sudah jelas tak padam)
    assert metrik([ep(True, 300, 50.0, cp_pdk)], [None])["n_penyebut_tak_dinyatakan"] == 0
    # setel tak pernah memilih k yang membuat >20% tak dinyatakan (k >= 4 gugur, k terkecil dipilih)
    assert setel(campur(.30))["A2"]["k"] == 2 and setel(campur(.30))["A3"]["kg"] <= 3 and all(not _ok(t30["g"][k_], WILSON_SETEL) for k_ in range(4, 13))

    # --- F4: setiap kunci kriteria yang tidak dibaca kode disebut di _catatan
    import re as _re
    src_kode = open(os.path.abspath(__file__), encoding="utf-8").read().split("def uji():")[0]
    dibaca = set(_re.findall(r'(?:_K|KRITERIA)\["([A-Za-z0-9_]+)"\]', src_kode)) | {"_catatan"}
    doc = [k_ for k_ in KRITERIA if k_ not in dibaca]
    assert doc and all(k_ in KRITERIA["_catatan"] for k_ in doc), [k_ for k_ in doc if k_ not in KRITERIA["_catatan"]]
    assert {"aturan_batas", "ci_metode", "klaster", "versi", "pemilihan"} <= set(doc), doc
    assert "tak_dinyatakan_maks" in dibaca and "alasan" in KRITERIA and "tak_dinyatakan" in KRITERIA["alasan"]

    # --- F2: ringkas() memuat kriteria baru & penandaan pembanding, kolom batas_atas_gabungan / n klaster / tak dinyatakan
    with _tf2.TemporaryDirectory() as td_:
        K0, R0 = globals()["KELUAR"], globals()["RINGKAS"]
        globals()["KELUAR"], globals()["RINGKAS"] = os.path.join(td_, "padam.json"), os.path.join(td_, "r.md")
        try:
            hh_ = uji_lipat(eps, eps, par)
            tulis({"tahap": "uji", "tahun_lengkap": [2019], "kriteria_sha": KRITERIA_SHA, "kriteria": KRITERIA, "batasan": BATASAN,
                   "aturan": {"uji_murni": {"terpilih": "A3", "vonis": "lolos", "uji_hasil": hh_}}})
            import io as _io, contextlib as _cl
            with _cl.redirect_stdout(_io.StringIO()):
                ringkas()
            md = open(globals()["RINGKAS"]).read()
        finally:
            globals()["KELUAR"], globals()["RINGKAS"] = K0, R0
    assert "bootstrap klaster sel x tahun B=1000 p97.5" in md and ">= 20 klaster" in md and "A0 (pembanding, laporan saja)" in md and "A1 (pembanding, laporan saja)" in md
    assert "batas atas gabungan" in md and "n klaster g/m" in md and "tak dinyatakan g/m" in md and "Tak dinyatakan padam dalam 240 jam <= 20%" in md and "A3 |" in md

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
    e = dict(ep(False, 100, None, [24.0, 48.0, 72.0, 96.0]), t_awal=dt.datetime(2023, 9, 1, tzinfo=UTC_), t_akhir=dt.datetime(2023, 9, 2, tzinfo=UTC_), ha=100.0, lok=1)
    a3 = {"tipe": "A2", "thr": 80, "k": 3}                    # D = 72 jam
    ss = lambda jam_: status_luas(e, a3, e["t_akhir"] + dt.timedelta(hours=jam_))
    assert [ss(x) for x in (-5, 10, 30, 71, 72, 72 + 168, 72 + 169)] == [None, "aktif_teramati", "tak_teramati", "tak_teramati", "kandidat_padam", "kandidat_padam", "padam"]    # S < deteksi terakhir = informasi belum ada
    assert status_luas(e, a3, e["t_awal"] - dt.timedelta(hours=1)) is None
    ee = dict(e, Tn=40.0)
    assert status_luas(ee, a3, ee["t_akhir"] + dt.timedelta(hours=41)) is None
    t3 = luas_tiga([e, dict(e, lok=2, ha=50.0, t_akhir=e["t_akhir"] + dt.timedelta(hours=30)), dict(e, lok=3, ha=7.0, t_akhir=e["t_akhir"] + dt.timedelta(hours=60))], a3, e["t_akhir"] + dt.timedelta(hours=72))
    assert t3["kandidat_padam_ha"] == 100 and t3["aktif_teramati_ha"] == 7 and t3["tak_teramati_ha"] == 50, t3
    # S22: lokasi sama, dua pengamatan; pada S hanya yang deteksi terakhirnya <= S yang dipakai (yang sesudah S = masa depan, diabaikan); luas = piksel sampai S
    awal_ = dict(e, lok=9, ha=30.0, t_akhir=e["t_akhir"] + dt.timedelta(hours=10))
    akhir_ = dict(e, lok=9, ha=80.0, t_akhir=e["t_akhir"] + dt.timedelta(hours=100))
    S9 = e["t_akhir"] + dt.timedelta(hours=40)
    assert terakhir_per_lokasi([akhir_, awal_], S9) == [awal_] and luas_tiga([akhir_, awal_], a3, S9)["tak_teramati_ha"] == 30 and luas_tiga([akhir_], a3, S9)["tak_teramati_n"] == 0

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

    # --- sampel sel: acak berstrata, benih tetap, hanya sel dengan titik >= n_min; semua sel bila kuota cukup
    hit_ = {(0.25, 100.25): 500, (0.75, 100.25): 400, (1.25, 100.25): 300, (1.75, 100.25): 200, (2.25, 100.25): 50}
    sh_ = {(0.25, 100.25): .9, (1.25, 100.25): .1, (0.75, 100.25): .6, (1.75, 100.25): 0, (2.25, 100.25): .9}
    assert pilih_sel_sampel(hit_, sh_, 5, 5) == [(0.25, 100.25), (0.75, 100.25), (1.25, 100.25), (1.75, 100.25)]      # kuota cukup: semua, minus sel < n_min
    big = {(i * .5 + .25, 100.25): 300 for i in range(40)}
    pg_ = pilih_sel_sampel(big, {s: 1.0 for s in big}, 10, 10)
    assert len(pg_) == 10 and pg_ == pilih_sel_sampel(big, {s: 1.0 for s in big}, 10, 10) and pg_ != sorted(big)[:10] and set(pg_) <= set(big)     # acak (bukan 10 teratas), deterministik
    assert pg_ != pilih_sel_sampel(big, {s: 1.0 for s in big}, 10, 10, benih=1)

    # --- kriteria: dari berkas terpisah, kunci terurut, tanpa angka hasil, sha kanonik stabil; semua ambang masuk sha
    assert KRITERIA["wilson_batas_atas_setel_maks"] == .10 and KRITERIA["wilson_batas_atas_uji_maks"] == .15 and KRITERIA["n_min_per_strata"] == 60 and KRITERIA["keterlambatan_maks_vs_A0_jam"] == 24
    assert set(KRITERIA["definisi"]) >= {"A0", "A1", "A2", "A3", "A4"} and "VIIRS" in KRITERIA["label_proksi_awan"] and "asap" in KRITERIA["label_proksi_awan"]
    assert open(KRITERIA_JSON, encoding="utf-8").read() == json.dumps(KRITERIA, sort_keys=True, indent=1, ensure_ascii=False) + "\n", "kriteria/lab_padam.json harus kunci terurut"
    assert KRITERIA_SHA == hashlib.sha256(kriteria_kanonik(KRITERIA).encode("utf-8")).hexdigest() and len(KRITERIA_SHA) == 64
    assert muat_kriteria()[1] == KRITERIA_SHA and hashlib.sha256(kriteria_kanonik(dict(KRITERIA, wilson_batas_atas_uji_maks=.2)).encode()).hexdigest() != KRITERIA_SHA
    assert not any(k in KRITERIA for k in ("hasil", "terpilih", "padam_palsu"))
    assert SETEL_TAHUN == [2019, 2020] and UJI_TAHUN == [2022, 2023] and LIPAT[0] == {"setel": [2019, 2020], "uji": [2022, 2023]} and RADIUS_KEPEKAAN == (0.5, 2.0)

    # --- H5/H6: uji murni. Aturan dipilih dari setel saja; data uji TIDAK mengubah pilihan. Wilson H10: titik 0% di n kecil bukan lolos.
    assert wilson(0, 30)[1] > WILSON_SETEL and wilson(0, 60)[1] <= WILSON_SETEL and wilson(9, 60)[1] > WILSON_UJI and wilson(3, 60)[1] < WILSON_UJI
    kl = lambda n, x=0: {(i * .5, 2019): [n // 20, x if i == 0 else 0] for i in range(20)}       # 20 klaster
    assert not _ok([30, 0, 0.0, 30, kl(30), 0, 0], .10) and _ok([60, 0, 0.0, 60, kl(60), 0, 0], .10) and not _ok([59, 0, 0.0, 59, kl(59), 0, 0], .10) and not _ok([100, 8, 0.0, 92, kl(100, 8), 0, 0], .10)
    # B1: klaster < NKL ditolak walau n besar dan titik 0%
    assert not _ok([600, 0, 0.0, 600, {(i, 2019): [30, 0] for i in range(19)}, 0, 0], .10) and _ok([600, 0, 0.0, 600, {(i, 2019): [30, 0] for i in range(20)}, 0, 0], .10)
    # B1: Wilson lolos (5% pada n=2000, batas atas ~6%) tetapi SEMUA muncul ulang menumpuk di 1 dari 20 sel -> bootstrap klaster menggagalkan
    pk_tumpuk = {(i, 2019): [100, 100 if i == 0 else 0] for i in range(20)}
    assert wilson(100, 2000)[1] <= .10 and ci_atas_klaster(pk_tumpuk) > .10 and not _ok([2000, 100, 0.0, 1900, pk_tumpuk, 0, 0], .10)
    pk_rata = {(i, 2019): [100, 5] for i in range(20)}       # 5% merata di semua sel: lolos
    assert ci_atas_klaster(pk_rata) == 0.05 and _ok([2000, 100, 0.0, 1900, pk_rata, 0, 0], .10) and ci_atas_klaster(pk_rata) == ci_atas_klaster(pk_rata)      # deterministik
    assert ci_atas_klaster({(0, 0): [5, 1]}) is None and batas_atas(2000, 100, pk_tumpuk) > .10 and batas_atas(59, 0, kl(59)) is None
    # kepekaan sel saja: klaster sel x tahun dua tahun -> sel saja menggabungkan tahun (klaster lebih sedikit)
    mm_ = metrik([ep(True, 100, None, cp_ := [12.0 * i for i in range(1, 13)], klaster=((i % 3) * .5, 2019 + i % 2)) for i in range(60)], [24.0] * 60)
    assert mm_["n_klaster"] == 6 and mm_["n_klaster_sel"] == 3 and "muncul_ulang_bootstrap_sel_saja" in mm_
    # setel pada data yang titik-taksirannya 7% (n=100) TIDAK lolos 10% karena batas atas Wilson 13,6% -> k diteruskan ke yang lebih besar
    cp2 = [12.0 * i for i in range(1, 13)]
    e7 = [ep(True, 300, 30.0 if i < 7 else None, cp2) for i in range(100)] + [ep(False, 100, None, cp2) for _ in range(100)]
    assert setel(e7)["A3"]["kg"] == 3 and setel(e7)["A3"]["km"] == 2
    # pilih dari setel saja: pilih_setel hanya menerima parameter; uji dengan data uji berlawanan tak mengubah pilihan
    pil = pilih_setel(par)
    ujiA = uji_lipat(eps, eps, par)
    ujiB = uji_lipat(eps, [ep(True, 300, 30.0, cp) for _ in range(100)] + [ep(False, 100, 30.0, cp) for _ in range(100)], par)
    assert pilih_setel(par) == pil and vonis_uji(ujiA, pil) == "lolos" and vonis_uji(ujiB, pil) == "tidak_lolos"

    # --- B8: jalan.jsonl append-only, aman bila berkas/direktori belum ada, format seragam dengan lab_luas, tak menimpa baris lama, tak menulis ke jalur asli
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        jj = os.path.join(td, "belum", "ada", "jalan.jsonl")
        os.environ["GITHUB_SHA"] = "abc123"
        b1 = catat_jalan("lab_padam.py", "mulai", None, KRITERIA_SHA, jalur=jj)
        open(jj, "a").write(json.dumps({"skrip": "lab_luas.py", "status": "selesai"}) + "\n")
        b2 = catat_jalan("lab_padam.py", "selesai", "A3 lolos", KRITERIA_SHA, jalur=jj)
        del os.environ["GITHUB_SHA"]
        b3 = catat_jalan("lab_padam.py", "gagal", "x", KRITERIA_SHA, jalur=jj)
        baris = [json.loads(x) for x in open(jj)]
        assert len(baris) == 4 and baris[0] == b1 and baris[2] == b2 and baris[3] == b3 and baris[1]["skrip"] == "lab_luas.py", baris
        assert set(b1) == {"skrip", "waktu", "kriteria_sha", "git_commit", "status", "vonis"} and b1["git_commit"] == "abc123" and b3["git_commit"] is None and b2["vonis"] == "A3 lolos"
        assert b1["kriteria_sha"] == KRITERIA_SHA and b1["waktu"].endswith("Z")
        # tulis() ke jalur sementara; jalur asli tak tersentuh
        tulis({"kriteria_sha": KRITERIA_SHA}, jalur=os.path.join(td, "padam.json"))
        assert json.load(open(os.path.join(td, "padam.json")))["kriteria_sha"] == KRITERIA_SHA

    # --- kunci tak bocor lewat pesan galat
    os.environ["FIRMS_MAP_KEY"] = "RAHASIA999"
    assert "RAHASIA999" not in FS.sensor_url("https://firms.modaps.eosdis.nasa.gov/api/area/csv/RAHASIA999/VIIRS_SNPP_SP/1,2,3,4/5/2019-07-01")
    del os.environ["FIRMS_MAP_KEY"]
    # --- potongan FIRMS: 5 hari, menutup 1 Jul..20 Des tanpa celah
    pc = potongan(2019)
    assert pc[0][0] == dt.date(2019, 7, 1) and pc[-1][1] == dt.date(2019, 12, 20) and all(b[0] == a[1] + dt.timedelta(days=1) for a, b in zip(pc, pc[1:])) and all((b - a).days <= 4 for a, b in pc)
    # --- sumber FIRMS: arsip tahunan dulu, area API hanya cadangan, kegagalan satu tahun tak meng-crash
    import tempfile as _tf3
    _lama = globals()["CACHE"]
    with _tf3.TemporaryDirectory() as td_:
        globals()["CACHE"] = td_
        try:
            def mk(thn, sen, n=3):
                return [{"lat": -2.0 + i * .01, "lon": 104.0, "t": dt.datetime(thn, 8, 1 + i, 6, 30, tzinfo=UTC), "c": 1 + i % 2, "px": .4, "dn": "D", "frp": 1.0, "s": sen} for i in range(n)]
            def arsip_ok(sen, thn, st):
                if thn == 2020:
                    raise RuntimeError("Network is unreachable (kunci RAHASIA999)")
                return mk(thn, sen) + [{**mk(thn, sen, 1)[0], "c": 0}, {**mk(thn, sen, 1)[0], "t": dt.datetime(thn, 6, 1, tzinfo=UTC)}]   # c=0 dan di luar jendela tersaring
            panggil = []
            def unduh_palsu(tugas):
                (d0, d1), kunci_, ket_ = tugas
                panggil.append(d0)
                simpan_potongan(d0, [])
                return True
            os.environ["FIRMS_MAP_KEY"] = "RAHASIA999"
            _KET.clear()
            _KET["ket"] = {"x": 1}
            st, pulih = kumpul_firms([2019, 2020], "RAHASIA999", lambda: False, arsip_ok, unduh_palsu)
            assert st[2019] == "arsip" and 2019 not in pulih, st
            assert not [d for d in panggil if d.year == 2019], "API dipanggil padahal arsip berhasil"
            assert panggil and all(d.year == 2020 for d in panggil) and pulih == {2020}, (panggil[:2], pulih)
            assert st[2020].endswith("-> area API") and "RAHASIA999" not in json.dumps(st), st
            assert muat_tahun(2019) is not None and len(muat_tahun(2019)) == 6 and {p["s"] for p in muat_tahun(2019)} == {"N", "N20"}
            assert min(p["t"] for p in muat_tahun(2019)) >= dt.datetime(2019, 7, 1, tzinfo=UTC) and all(p["c"] in (1, 2) for p in muat_tahun(2019))
            # arsip gagal semua + API gagal: tahun hilang, tanpa crash
            panggil.clear()
            for d0, _ in potongan(2020):
                os.remove(jalur_potongan(d0))
            _KET.clear()
            _KET["galat"] = RuntimeError("Network is unreachable")
            st, pulih = kumpul_firms([2019, 2020, 2022], "RAHASIA999", lambda: False, lambda s_, t_, c_: None, lambda tg: False)
            assert st[2019] == "cache" and pulih == set() and muat_tahun(2020) is None and "gagal" in st[2020] and not panggil, st
            # arsip kosong di jendela = gagal, bukan 'nol titik'
            st, _ = kumpul_firms([2022], None, lambda: False, lambda s_, t_, c_: [], None)
            assert "kosong" in st[2022] and muat_tahun(2022) is None
            # diagnosa jaringan: kelas galat per alamat, kunci tidak bocor
            try:
                ambil_teks("https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/RAHASIA999/ALL", coba=1,
                           diagnosa=lambda h: "IPv4 1.2.3.4 ENETUNREACH; IPv6 ::1 EHOSTUNREACH")
                raise AssertionError("harus gagal")
            except RuntimeError as e:
                pesan = str(e)
                if "RAHASIA999" in pesan or "ENETUNREACH" not in pesan:
                    raise AssertionError(pesan)
            except AssertionError:
                raise
            _KET.clear()
            del os.environ["FIRMS_MAP_KEY"]
        finally:
            globals()["CACHE"] = _lama
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
