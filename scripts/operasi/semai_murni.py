"""Fungsi murni Peluang Semai Awan (ALGORITMA semai-awan §1 sampai §11): tanpa I/O, stdlib saja.

Semua ambang dan bobot dibaca dari `semai_bobot.json` oleh pemanggil (`nilai(bobot, "gerbang.lcc_min")`), bukan ditulis di sini.
Konstanta fisika (Espy, lapse kering, R, g) bukan ambang dan tinggal di sini.
Dipakai oleh `semai.py` dan ditiru satu-satu oleh `public/operasi_semai_murni.js` (uji silang RENCANA-UJI §3).

Pakai:   from semai_murni import *   (diuji lewat `python3 scripts/operasi/semai.py uji`)
Masukan: angka, daftar profil, dict sel/zona/bobot.
Keluaran: angka, teks, daftar zona. Tidak ada berkas yang dibaca atau ditulis.
"""
import datetime as dt
import difflib
import math
import re

R_UDARA = 287.05      # J/(kg K)
G = 9.80665           # m/s2
ESPY = 125.0          # m per derajat selisih T2m - Td2m
LAPSE_KERING = 0.0098  # derajat per m
BEKU_K = 273.15
R_BUMI_KM = 6371.0088
ARAH8 = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"]


def nilai(bobot, jalur):
    """Ambil `nilai` dari jalur bertitik, mis. nilai(b, 'gerbang.lcc_min')."""
    n = bobot
    for k in jalur.split("."):
        n = n[k]
    return n["nilai"]


def haversine(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * R_BUMI_KM * math.asin(math.sqrt(a))


# ---- §2 turunan ----------------------------------------------------------------------------------------------
def lcl_m(t2m_c, td2m_c):
    return ESPY * (t2m_c - td2m_c)


def suhu_dasar(t2m_c, lcl):
    return t2m_c - LAPSE_KERING * lcl


def level_beku(t_k, gh_m):
    """Profil dari bawah ke atas. Interpolasi linear pada lapisan pertama dengan t <= 273,15 K; tanpa lapisan beku: None."""
    for i, t in enumerate(t_k):
        if t <= BEKU_K:
            if i == 0:
                return gh_m[0]
            t0, t1 = t_k[i - 1], t
            return gh_m[i - 1] + (t0 - BEKU_K) / (t0 - t1) * (gh_m[i] - gh_m[i - 1])
    return None


def kedalaman_hangat(lbeku_m, lcl, elev=0.0):
    """Level beku (m di atas muka laut) - (LCL + elevasi permukaan) = tebal awan hangat. Tanpa lapisan beku: None."""
    return None if lbeku_m is None else lbeku_m - (lcl + elev)


def w_ke_ms(w_pa_s, t_k, p_hpa):
    """Omega (Pa/s, negatif = naik) ke m/s, positif = naik."""
    return -w_pa_s * R_UDARA * t_k / (p_hpa * 100.0 * G)


def hujan_blok(tp_mm, i):
    """Hujan blok langkah i (mm/jam) dari tp kumulatif: (tp[i+1]-tp[i])/3. Langkah terakhir tak punya pasangan: None."""
    if i + 1 >= len(tp_mm):
        return None
    return (tp_mm[i + 1] - tp_mm[i]) / 3.0


def geser(u200, v200, u850, v850):
    return math.hypot(u200 - u850, v200 - v850)


def angin_pengarah(u850, v850, u700, v700):
    return (u850 + u700) / 2.0, (v850 + v700) / 2.0


# ---- §3 gerbang ----------------------------------------------------------------------------------------------
def gerbang(sel, bobot, mode="bawaan"):
    """sel: lcc, mucape, tclw, geser, rh850, hujan, tdasar, hangat_m (boleh None), jam_lokal (jam awal blok setempat).
    Mengembalikan (lolos, daftar gerbang gagal). Mode 'nimbus' mematikan G7 dan G8. Nilai hilang (None) = gagal."""
    n = lambda j: nilai(bobot, j)
    gagal = []

    def cek(kode, ok):
        if not ok:
            gagal.append(kode)

    def ada(k):
        return sel.get(k) is not None

    cek("G1", ada("lcc") and sel["lcc"] >= n("gerbang.lcc_min"))
    cek("G2", ada("mucape") and sel["mucape"] >= n("gerbang.mucape_min"))
    cek("G3", ada("tclw") and sel["tclw"] >= n("gerbang.tclw_min"))
    cek("G4", ada("geser") and sel["geser"] <= n("gerbang.geser_maks"))
    cek("G5", ada("rh850") and sel["rh850"] >= n("gerbang.rh850_min"))
    cek("G6", ada("hujan") and sel["hujan"] < n("gerbang.hujan_maks_mm_jam"))
    if mode != "nimbus":
        cek("G7", ada("tdasar") and sel["tdasar"] >= n("gerbang.tdasar_min_c"))
        cek("G8", ada("hangat_m") and sel["hangat_m"] >= n("gerbang.hangat_min_m"))
    # G9: blok 3 jam beririsan dengan 07.00 sampai 16.00 setempat (blok dipotong ke jendela di jendela_85)
    j = sel.get("jam_lokal")
    cek("G9", j is not None and j < n("gerbang.jam_akhir") and j + 3 > n("gerbang.jam_mulai"))
    return (not gagal), gagal


def tanda_bahaya(sel, bobot, mode="bawaan"):
    """MUCAPE sangat tinggi: bukan gerbang, menurunkan zona ke daftar hati-hati. Mati di mode Nimbus."""
    return mode != "nimbus" and sel.get("mucape") is not None and sel["mucape"] > nilai(bobot, "bahaya.mucape_maks")


# ---- §5 faktor -----------------------------------------------------------------------------------------------
def ramp(x, lo, hi):
    return min(1.0, max(0.0, (x - lo) / (hi - lo)))


def komponen_q(sel, bobot):
    n = lambda j: nilai(bobot, j)
    return {
        "cape": ramp(sel["mucape"], n("q.cape_lo"), n("q.cape_hi")),
        "air": ramp(sel["tclw"], n("q.air_lo"), n("q.air_hi")),
        "rh": ramp(sel["rh850"], n("q.rh_lo"), n("q.rh_hi")),
        "geser": ramp(n("q.geser_maks") - sel["geser"], 0.0, n("q.geser_maks")),
        "naik": ramp(sel["w"], 0.0, n("q.naik_penuh_ms")),
    }


def faktor_q(komp, mode="bawaan"):
    """Rerata lima komponen; mode 'nimbus' empat pertama (tanpa naik)."""
    k = ["cape", "air", "rh", "geser"] + ([] if mode == "nimbus" else ["naik"])
    return sum(komp[x] for x in k) / len(k)


def titik_hujan(lat, lon, u, v, tau_menit):
    """Titik sel digeser angin pengarah (u timur, v utara, m/s) selama tau menit."""
    d = tau_menit * 60.0
    dlat = v * d / 111320.0
    dlon = u * d / (111320.0 * max(0.05, math.cos(math.radians(lat))))
    return lat + dlat, lon + dlon


def faktor_d(F, F0):
    """F = jumlah frp24 (MW, sudah berpengali gambut) cluster dalam 25 km titik hujan. Tanpa api: 0."""
    return 0.0 if F <= 0 else 1.0 - math.exp(-F / F0)


def faktor_t(km, dekat, jauh):
    return ramp(km, dekat, jauh)


# ---- §6 skor -------------------------------------------------------------------------------------------------
def skor(Q, D, T, w, mode="bawaan"):
    """w = (wQ, wD, wT) berjumlah 1. Gerbang dikalikan pemanggil (sel gagal gerbang = 0)."""
    wq, wd, wt = w
    assert abs(wq + wd + wt - 1.0) < 1e-9, "bobot skor harus berjumlah 1"
    if mode == "nimbus":
        return 0.0 if D <= 0 else wq * Q + wd * D + wt * T
    if Q <= 0 or D <= 0 or T <= 0:
        return 0.0
    return Q ** wq * D ** wd * T ** wt


# ---- tujuan banjir (semai-banjir ALGORITMA §2 sampai §5), blok bobot["banjir"] -------------------------------
def _angka(x, nama):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or x != x:
        raise ValueError(f"{nama} bukan angka: {x!r}")
    return float(x)


def faktor_h(tiba, bobot=None):
    """H, lepas sebelum sasaran (§5): 1 untuk 1..3 jam, turun linear ke 0 di 4 jam, selain itu 0. tiba None (lintasan tak masuk) = 0."""
    if tiba is None:
        return 0.0
    t = _angka(tiba, "tiba")
    if t < 0:
        raise ValueError(f"tiba {t} jam negatif")
    lo, pen, mks = (1, 3, 4) if bobot is None else (nilai(bobot, "banjir.gb3_tiba_min_jam"), nilai(bobot, "banjir.h_penuh_maks_jam"), nilai(bobot, "banjir.gb3_tiba_maks_jam"))
    return 0.0 if t < lo or t >= mks else (1.0 if t <= pen else mks - t)


def lolos_gb(nama, bobot, **kw):
    """Gerbang banjir GB1..GB4 (§4); True = lolos. Nama atau masukan salah: ValueError.
    GB1 dalam(bool), jarak_km (dari tepi luar sasaran)         : di luar poligon dan > gb1_jarak_km
    GB2 titik_kab, sel_kab (kode kab atau None = laut), terlarang (himpunan kode kab sasaran/terancam): tidak ada di terlarang
    GB3 tiba (jam, None = tak masuk)                            : gb3_tiba_min..gb3_tiba_maks
    GB4 hari_tiba, d (teks tanggal)                             : sama"""
    try:
        if nama == "GB1":
            j = _angka(kw["jarak_km"], "jarak_km")
            if j < 0:
                raise ValueError(f"jarak_km {j} negatif")
            return (not kw["dalam"]) and j > nilai(bobot, "banjir.gb1_jarak_km")
        if nama == "GB2":
            t = kw["terlarang"]
            return kw["titik_kab"] not in t and kw["sel_kab"] not in t
        if nama == "GB3":
            if kw["tiba"] is None:
                return False
            t = _angka(kw["tiba"], "tiba")
            return nilai(bobot, "banjir.gb3_tiba_min_jam") <= t <= nilai(bobot, "banjir.gb3_tiba_maks_jam")
        if nama == "GB4":
            if not (isinstance(kw["hari_tiba"], str) and isinstance(kw["d"], str)):
                raise ValueError(f"tanggal bukan teks: {kw['hari_tiba']!r}, {kw['d']!r}")
            return kw["hari_tiba"] == kw["d"]
    except KeyError as e:
        raise ValueError(f"gerbang {nama}: masukan {e} kurang")
    raise ValueError(f"gerbang {nama!r} tak dikenal (GB1..GB4)")


def di_koridor(jarak_tepi_km, jarak_lintasan_km, bobot):
    """§3.2: <= 25 km dari lintasan mundur DAN 30..150 km dari tepi sasaran."""
    e, l = _angka(jarak_tepi_km, "jarak_tepi_km"), _angka(jarak_lintasan_km, "jarak_lintasan_km")
    if e < 0 or l < 0:
        raise ValueError(f"jarak negatif: tepi {e}, lintasan {l}")
    return l <= nilai(bobot, "banjir.koridor_lintasan_km") and nilai(bobot, "banjir.koridor_min_km") <= e <= nilai(bobot, "banjir.koridor_maks_km")


def angin_lemah(ms, bobot):
    """§3.3: angin pengarah di pusat sasaran < 2 m/s = langkah tanpa kandidat."""
    m = _angka(ms, "angin_ms")
    if m < 0:
        raise ValueError(f"angin {m} m/s negatif (kecepatan, bukan komponen)")
    return m < nilai(bobot, "banjir.angin_lemah_ms")


def zona_id_banjir(putaran, urut):
    """`<putaran>-B<huruf>` (D6); urut 0 = A."""
    if not (isinstance(urut, int) and not isinstance(urut, bool) and 0 <= urut < 26) or not putaran or not isinstance(putaran, str):
        raise ValueError(f"zona_id: putaran {putaran!r}, urut {urut!r} tak sah (0..25)")
    return f"{putaran}-B{chr(65 + urut)}"


def alasan_kosong_banjir(n_sasaran, semua_angin_lemah, n_sel_lolos, ada_ifs=True):
    """§7: salah satu dari tanpa_prakiraan, tidak_ada_sasaran, angin_lemah, tidak_ada_awan_hulu; None bila ada sel lolos."""
    if n_sasaran < 0 or n_sel_lolos < 0:
        raise ValueError(f"hitungan negatif: sasaran {n_sasaran}, sel {n_sel_lolos}")
    if not ada_ifs:
        return "tanpa_prakiraan"
    if n_sasaran == 0:
        return "tidak_ada_sasaran"
    if semua_angin_lemah:
        return "angin_lemah"
    return None if n_sel_lolos > 0 else "tidak_ada_awan_hulu"


_URUT_ASAL = ("tetap", "manual", "kejadian", "bmkg", "prakiraan")


def pilih_sasaran(d, prediksi, bmkg, bobot, manual=(), umur_prediksi_jam=0, tercakup=True, kejadian=()):
    """S(d) (§2). d 'YYYY-MM-DD'. prediksi = prediksi.json (atau None), bmkg = cuaca_bmkg_kab10.json (atau None), manual = kode kab.
    Hasil: dict(sasaran=[dict(kode, asal=[...], pantau, belum_teruji)], sumber=[catatan], alasan_kosong).
    tercakup False: sasaran prakiraan tenggang 2 bertanda pantau (tanpa zona). belum_teruji: asalnya hanya `prakiraan` dan tak ada vonis lulus."""
    if not (isinstance(d, str) and len(d) == 10 and d[4] == "-" and d[7] == "-"):
        raise ValueError(f"d {d!r} bukan YYYY-MM-DD")
    umur = _angka(umur_prediksi_jam, "umur_prediksi_jam")
    if umur < 0:
        raise ValueError(f"umur prakiraan {umur} jam negatif")
    for k in manual:
        if not (isinstance(k, str) and len(k) == 4 and k.isdigit()):
            raise ValueError(f"kode kab manual {k!r} bukan 4 angka")
    asal, pantau, sumber, belum = {}, set(), [], False

    def tambah(k, a):
        asal.setdefault(k, set()).add(a)

    for k in nilai(bobot, "banjir.sasaran_tetap"):
        tambah(k, "tetap")
    for k in manual:
        tambah(k, "manual")
    for k in kejadian:                                      # K6: kode kab dari kabar.json (kab_dari_kejadian), sudah disaring basi
        tambah(k, "kejadian")
    if bmkg:
        kond = nilai(bobot, "banjir.bmkg_kondisi")
        for kode, v in bmkg["kab"].items():
            if any(h["tgl"] == d and h["kondisi"] in kond for h in v["hari"]):
                tambah(kode.replace(".", ""), "bmkg")
    else:
        sumber.append("BMKG kab10 tidak ada")
    if prediksi is None:
        sumber.append("prakiraan banjir tidak ada")
    elif umur > nilai(bobot, "banjir.prakiraan_basi_jam"):
        sumber.append(f"prakiraan banjir basi ({umur:g} jam)")
    else:
        bnj = prediksi["kode"]["BNJ"]
        hari = bnj["hari"]
        if d in hari:
            t = hari.index(d)
            lulus = any(v and v[0] == "lulus" for v in (bnj.get("vonis") or {}).values())
            belum = not lulus
            lvmin, pmin = nilai(bobot, "banjir.bnj_level_min"), nilai(bobot, "banjir.hjn_p50_min")
            waspada = {w["kab"] for w in prediksi.get("waspada", []) if w.get("aturan") == "banjir" and w.get("tenggang") == t + 1}
            for r in prediksi["kab"]:
                if r["BNJ"][t][0] >= lvmin or r["id"] in waspada or r["HJN"][t][2] >= pmin:
                    tambah(r["id"], "prakiraan")
                    if t == 1 and not tercakup:
                        pantau.add(r["id"])
        else:
            sumber.append(f"tanggal {d} tak ada di kode.BNJ.hari {hari}")
    hasil = [dict(kode=k, asal=sorted(a, key=_URUT_ASAL.index), pantau=k in pantau and a == {"prakiraan"},
                  belum_teruji=a == {"prakiraan"} and belum) for k, a in sorted(asal.items())]
    return dict(sasaran=hasil, sumber=sumber, alasan_kosong=None if hasil else "tidak_ada_sasaran")


def _jenis_kab(nama):
    n = nama.strip().lower()
    return "kota" if n.startswith("kota") else "kab"


def _inti_nama(nama):
    """Huruf kecil tanpa awalan Kab./Kabupaten/Kota/Administrasi, tanpa spasi dan tanda baca (ejaan 'Padang Sidempuan' = 'Padangsidimpuan' ditangani cocok_nama)."""
    return re.sub(r"[^a-z]", "", re.sub(r"^(kabupaten|kab\.|kota administrasi|kota|administrasi)\s+", "", nama.strip().lower()))


def cocok_nama(nama, kandidat):
    """Satu nama kab/kota dari kabar.json lawan kandidat [(kode, nama_geo)] di provinsi yang sama; None bila tak ada atau ragu.
    Jenis Kota/Kab harus sama ('Kota X' tak pernah jatuh ke 'X'); inti nama persis, atau mirip >= 0,9 dan tunggal (ejaan)."""
    jenis, inti = _jenis_kab(nama), _inti_nama(nama)
    pool = [(k, _inti_nama(n)) for k, n in kandidat if _jenis_kab(n) == jenis]
    persis = [k for k, i in pool if i == inti]
    if persis:
        return persis[0] if len(persis) == 1 else None
    mirip = [k for k, i in pool if difflib.SequenceMatcher(None, inti, i).ratio() >= 0.9]
    return mirip[0] if len(mirip) == 1 else None


def kab_dari_kejadian(kabar, kota, putaran_iso, bobot):
    """K6 (ALGORITMA §2 `kejadian`): kode kab sasaran dari kabar.json. kota = [(kode, prov, nama_geo)]. putaran_iso = jam putaran 'YYYY-MM-DDTHH:MM:SSZ'.
    -> (kode_terurut, catatan). Berkas lebih tua dari kejadian_basi_jam terhadap putaran: tak dipakai, catatan 'kejadian basi'."""
    if not kabar:
        return [], ["kejadian: kabar.json tidak ada"]
    t_put = dt.datetime.fromisoformat(putaran_iso.replace("Z", "+00:00"))
    t_kab = dt.datetime.fromisoformat(kabar["dibuat"])
    if t_kab.tzinfo is None:
        t_kab = t_kab.replace(tzinfo=dt.timezone(dt.timedelta(hours=7)))
    umur = (t_put - t_kab).total_seconds() / 3600
    if umur > nilai(bobot, "banjir.kejadian_basi_jam"):
        return [], [f"kejadian basi ({umur:.0f} jam)"]
    jenis = nilai(bobot, "banjir.kejadian_jenis")
    per_prov = {}
    for kode, prov, nama in kota:
        per_prov.setdefault(prov, []).append((kode, nama))
    hasil, luput = set(), []
    for x in kabar.get("kejadian", []):
        if x.get("jenis") in jenis and x.get("status") == "berjalan":
            k = cocok_nama(x["kab"], per_prov.get(str(x.get("prov")), []))
            if k:
                hasil.add(k)
            else:
                luput.append(f"{x['kab']} ({x.get('prov')})")
    return sorted(hasil), ([f"kejadian: nama tak terpetakan ke kode BPS: {', '.join(luput)}"] if luput else [])


def prov_omc(omc, d, bobot):
    """P_omc(d) (K5): kode provinsi dengan baris OMC berjenis persis `banjir.omc_jenis` dan periode_awal <= d <= periode_akhir (string ISO, urut leksikal = urut tanggal)."""
    jenis = nilai(bobot, "banjir.omc_jenis")
    return sorted({r["kode_prov"] for r in ((omc or {}).get("aktif_hari_ini") or {}).get("baris", [])
                   if r.get("jenis_kegiatan") == jenis and r.get("periode_awal", "9") <= d <= r.get("periode_akhir", "0")})


def _urut_zona(c):
    return (-round(c["skor"], 2), -bool(c.get("kej")), -c["skor"])      # K6: pada skor tampil sama, sel yang melayani kejadian dulu


def zona_kuota(cells, prov, min_km, maks, ambang, maks_prov):
    """K5 (ALGORITMA §6): sel dict lat, lon, skor, provs (kode prov sasaran yang dilayani), kej (melayani asal kejadian).
    1) tiap provinsi di `prov`: NMS atas sel yang melayani provinsi itu, <= maks_prov zona (membawa kuota=<kode>); 2) <= maks zona nasional dari sisa,
    NMS juga terhadap zona kuota. Hasil urut skor turun (huruf zona mengikuti). Skor dan ambang tidak diubah."""
    pilih = []

    def jauh(c):
        return all(haversine(c["lat"], c["lon"], z["lat"], z["lon"]) > min_km for z in pilih)
    urut = sorted(cells, key=_urut_zona)
    for p in sorted(prov):
        n = 0
        for c in urut:
            if n >= maks_prov:
                break
            if c["skor"] >= ambang and p in c.get("provs", ()) and jauh(c):
                pilih.append(dict(c, kuota=p))
                n += 1
    n = 0
    for c in urut:
        if n >= maks:
            break
        if c["skor"] >= ambang and jauh(c):
            pilih.append(c)
            n += 1
    return sorted(pilih, key=_urut_zona)


# ---- §4, §7 zona ---------------------------------------------------------------------------------------------
def ambang_cluster(frp24_list, bobot):
    """maksimum(40 MW, 2% frp24 cluster terbesar)."""
    atas = max(frp24_list) if frp24_list else 0.0
    return max(nilai(bobot, "cluster.frp_min_mw"), nilai(bobot, "cluster.frp_persen_terbesar") * atas)


def zona_nms(cells, min_km, maks, ambang):
    """cells: dict lat, lon, skor (skor tertinggi per sel). Serakah: terbaik jadi zona, buang sel dalam min_km; berhenti di maks
    zona atau skor < ambang."""
    pilih = []
    for c in sorted(cells, key=lambda c: -c["skor"]):
        if len(pilih) >= maks or c["skor"] < ambang:
            break
        if all(haversine(c["lat"], c["lon"], z["lat"], z["lon"]) > min_km for z in pilih):
            pilih.append(c)
    return pilih


def jendela_rentang(skor_per_langkah, idx_terbaik, langkah_utc, zona_waktu, offset_jam, persen, mulai, akhir):
    """Langkah berurutan di sekitar idx_terbaik dengan skor >= persen x puncak, tanpa melompati langkah lebih rendah.
    langkah_utc = jam UTC awal tiap blok 3 jam (kumulatif dari 00 UTC hari acuan). Hasil teks setempat dipotong ke mulai..akhir,
    mis. '10.00 sampai 16.00 WIB'; None bila seluruhnya di luar jendela."""
    ambang = persen * skor_per_langkah[idx_terbaik]
    lo = hi = idx_terbaik
    while lo > 0 and skor_per_langkah[lo - 1] >= ambang:
        lo -= 1
    while hi < len(skor_per_langkah) - 1 and skor_per_langkah[hi + 1] >= ambang:
        hi += 1
    off = offset_jam[zona_waktu]
    awal = langkah_utc[lo] + off
    dasar = (awal // 24) * 24
    s = max(awal - dasar, mulai)
    e = min(langkah_utc[hi] + off + 3 - dasar, akhir)
    if s >= e:
        return None
    return dict(lo=lo, hi=hi, mulai_lokal=s, akhir_lokal=e, utc_mulai=dasar + s - off, utc_akhir=dasar + e - off)


def jendela_85(skor_per_langkah, idx_terbaik, langkah_utc, zona_waktu, offset_jam, persen, mulai, akhir):
    r = jendela_rentang(skor_per_langkah, idx_terbaik, langkah_utc, zona_waktu, offset_jam, persen, mulai, akhir)
    return None if r is None else f"{r['mulai_lokal']:02d}.00 sampai {r['akhir_lokal']:02d}.00 {zona_waktu}"


def zona_waktu_prov(kode_bps, peta):
    """peta = bobot['zona_waktu']['provinsi']. Kode tak dikenal: KeyError (jangan menebak)."""
    return peta[str(kode_bps)[:2]]


# ---- koordinat, arah, jarak terbang ---------------------------------------------------------------------------
def dms(lat, lon):
    def satu(x, pos, neg):
        d = round(abs(x) * 3600)
        return f"{d // 3600}°{d % 3600 // 60:02d}'{d % 60:02d}\" {pos if x >= 0 else neg}"
    return f"{satu(lat, 'N', 'S')} {satu(lon, 'E', 'W')}"


def bulat_mitra(x, langkah):
    return math.floor(x / langkah + 0.5) * langkah


def arah_8(dari_lat, dari_lon, ke_lat, ke_lon):
    """Arah mata angin dari titik pertama ke titik kedua, 8 arah, mis. 'dari tenggara' bila titik kedua di tenggara."""
    p1, p2 = math.radians(dari_lat), math.radians(ke_lat)
    dl = math.radians(ke_lon - dari_lon)
    b = math.degrees(math.atan2(math.sin(dl) * math.cos(p2), math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)))
    return "dari " + ARAH8[int(((b % 360) + 22.5) // 45) % 8]


def titik_dari(lat, lon, baringan_derajat, nm):
    """Titik tujuan dari (lat, lon) pada baringan benar dan jarak mil laut (bola, R 3440,065 NM)."""
    d, t, p1, l1 = nm / 3440.065, math.radians(baringan_derajat), math.radians(lat), math.radians(lon)
    p2 = math.asin(math.sin(p1) * math.cos(d) + math.cos(p1) * math.sin(d) * math.cos(t))
    l2 = l1 + math.atan2(math.sin(t) * math.sin(d) * math.cos(p1), math.cos(d) - math.sin(p1) * math.sin(p2))
    return math.degrees(p2), (math.degrees(l2) + 540) % 360 - 180


def titik_rute_omc(base, zona, angin_ke, masuk_nm, kaki_nm, jarak_kaki_nm, baringan_fn):
    """ALGORITMA §7c: CP0 base, CP1 titik masuk (masuk_nm sebelum zona di garis base-zona), CP2-CP5 dua kaki tabur melintang
    angin pengarah (panjang kaki_nm, berjarak jarak_kaki_nm, berpusat di zona), CP6 base. angin_ke = arah angin bertiup (derajat)
    atau None bila tenang; tanpa angin, kaki melintang garis base-zona. Kaki pertama mulai dari ujung yang lebih dekat CP1."""
    b_bz = baringan_fn(base[0], base[1], zona[0], zona[1])
    masuk = titik_dari(zona[0], zona[1], (b_bz + 180) % 360, masuk_nm)
    sepanjang = angin_ke if angin_ke is not None else b_bz
    lintang = (sepanjang + 90) % 360
    def geser(al, li):
        t = titik_dari(zona[0], zona[1], sepanjang if al >= 0 else (sepanjang + 180) % 360, abs(al))
        return titik_dari(t[0], t[1], lintang if li >= 0 else (lintang + 180) % 360, abs(li))
    h, k = jarak_kaki_nm / 2, kaki_nm / 2
    a1, a2, b1, b2 = geser(-h, -k), geser(-h, k), geser(h, k), geser(h, -k)
    d = lambda p: haversine(masuk[0], masuk[1], p[0], p[1])
    kaki = [a1, a2, b1, b2] if d(a1) <= d(a2) else [a2, a1, b2, b1]
    return [tuple(base), masuk, *kaki, tuple(base)]


def menit_terbang(km, jelajah_kmj, bulat):
    return int(math.floor(km / jelajah_kmj * 60.0 / bulat + 0.5) * bulat)


def ketinggian_kaki(lcl, elev, lcl_min, lcl_maks, bulat, m_ke_kaki=3.281):
    """Ketinggian semai = dasar awan (LCL + elevasi) dalam kaki, kelipatan 500. LCL di luar 300..3000 m: None (tidak terbaca)."""
    if lcl < lcl_min or lcl > lcl_maks:
        return None
    return int(round((lcl + elev) * m_ke_kaki / bulat) * bulat)


def ada_inversi(t_bawah_ke_atas, gh_m=None, elev=0.0):
    """Suhu naik terhadap tinggi di antara lapisan permukaan sampai 700 hPa (daftar t dari bawah ke atas). Bila gh_m diberikan,
    lapisan di bawah permukaan (gh < elev, mis. 1000 hPa di dataran tinggi) dibuang dulu."""
    if gh_m is not None:
        t_bawah_ke_atas = [t for t, g in zip(t_bawah_ke_atas, gh_m) if g >= elev]
    return any(b > a for a, b in zip(t_bawah_ke_atas, t_bawah_ke_atas[1:]))


def usul_bahan(inversi, beban_asap):
    """beban_asap: 'rendah'|'sedang'|'tinggi'|None. Inversi berasap -> dry ice dulu; selain itu NaCl."""
    if inversi and beban_asap in ("sedang", "tinggi"):
        return "dry ice dulu untuk memecah inversi, lalu NaCl"
    return "NaCl"


def jumlah_sortie(jendela_menit, menit_terbang_, menit_semai, armada_siap):
    """floor(jendela / (2 x menit terbang + menit semai)), paling sedikit 1, paling banyak armada siap."""
    n = max(1, int(jendela_menit // (2 * menit_terbang_ + menit_semai)))
    return min(n, armada_siap)


# ---- §7 keadaan kosong, §11 ringkasan -------------------------------------------------------------------------
def kalimat_kosong(alasan, ambang_mw=None, jam_putaran=None):
    if alasan == "tidak_ada_api_besar":
        return f"Tidak ada cluster api di atas {ambang_mw:g} MW, belum perlu semai."
    if alasan == "tidak_ada_awan":
        return "Tidak ada awan layak semai yang hanyut ke api dalam 24 jam ke depan."
    if alasan == "tanpa_prakiraan":
        return f"Prakiraan belum tersedia. Putaran terakhir: {jam_putaran}."
    raise ValueError(alasan)


def _koma(x, d):
    return f"{x:.{d}f}".replace(".", ",")


def ringkasan_teks(data, peran):
    """data: judul_id/judul_en (teks hari dan jam), model, n_cluster, frp_mw, asap, asap_en, bulat_mitra (bobot mitra.bulat_derajat), zona [huruf, prov, lat, lon, jendela,
    skor, base, base_kode, menit], alasan_kosong, kalimat_kosong, ambang_mw. peran 'pos' = Indonesia lengkap; 'mitra' = Inggris,
    koordinat dibulatkan 0,5 derajat, tanpa skor, alasan, dan base."""
    zs = data.get("zona", [])
    if peran == "mitra":
        out = [f"Cloud seeding opportunity, {data['judul_en']} ({data['model']})",
               f"Fires: {data['n_cluster']} large clusters"]
        if data.get("asap_en"):
            out.append("Smoke: " + data["asap_en"])
        if zs:
            out.append("Suggested zones:")
            for z in zs:
                out.append(f"- {z['huruf']} {z['prov_en']}, ~{bulat_mitra(z['lat'], data['bulat_mitra']):.1f}, {bulat_mitra(z['lon'], data['bulat_mitra']):.1f}, "
                           + z["jendela"].replace(".00", ":00").replace(" sampai ", " to "))
        else:
            out.append("No suggested zones for this run.")
        out.append("Model suggestion, not an official forecast. Confirm each operation with BMKG.")
        return "\n".join(out)
    out = [f"Peluang semai, {data['judul_id']} ({data['model']})",
           f"Api: {data['n_cluster']} cluster besar, {data['frp_mw']:,.0f} MW".replace(",", ".")]
    if data.get("asap"):
        out.append("Asap: " + data["asap"])
    if zs:
        out.append("Zona usulan:")
        for z in zs:
            out.append(f"- {z['huruf']} {z['prov']}, {_koma(z['lat'], 3)} {_koma(z['lon'], 3)}, {z['jendela']}, "
                       f"skor {_koma(z['skor'], 2)}, dari {z['base']} ({z['base_kode']}) sekitar {z['menit']} menit")
    else:
        out.append(data["kalimat_kosong"])
    out.append("Usulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG.")
    return "\n".join(out)


# ---- turunan satu sel (skalar, stdlib): rujukan untuk uji dan cermin versi numpy di semai.py -----------------------
NIVO_PL = (1000, 925, 850, 700, 600, 500)


def turunan_sel(c, tp_berikut, jam_lokal):
    """c: nilai satu sel pada satu langkah dengan kunci npz ('sfc_lcc', 'pl_t_850', ...; satuan seperti di semai_ifs.py).
    tp_berikut: sfc_tp langkah berikutnya (mm) atau None. Mengembalikan dict masukan gerbang/Q ditambah lcl, elev, inversi, u/v pengarah.
    Permukaan diaproksimasi dari gh 1000 hPa (tak ada geopotensial permukaan di unduhan): elev = max(0, gh1000)."""
    elev = max(0.0, c["pl_gh_1000"])
    lcl = max(0.0, lcl_m(c["sfc_2t"], c["sfc_2d"]))
    t = [c[f"pl_t_{p}"] for p in NIVO_PL]
    gh = [c[f"pl_gh_{p}"] for p in NIVO_PL]
    lb = level_beku(t, gh)
    w = (w_ke_ms(c["pl_w_850"], c["pl_t_850"], 850) + w_ke_ms(c["pl_w_700"], c["pl_t_700"], 700)) / 2.0
    us, vs = angin_pengarah(c["pl_u_850"], c["pl_v_850"], c["pl_u_700"], c["pl_v_700"])
    return dict(lcc=c["sfc_lcc"], mucape=c["sfc_mucape"], tclw=c["sfc_tclw"],
                geser=geser(c["pl_u_200"], c["pl_v_200"], c["pl_u_850"], c["pl_v_850"]),
                rh850=min(100.0, c["pl_r_850"]),
                hujan=None if tp_berikut is None else max(0.0, (tp_berikut - c["sfc_tp"]) / 3.0),
                tdasar=suhu_dasar(c["sfc_2t"] - BEKU_K, lcl), hangat_m=kedalaman_hangat(lb, lcl, elev),
                jam_lokal=jam_lokal, w=w, lcl=lcl, elev=elev, lbeku=lb, u_pengarah=us, v_pengarah=vs,
                inversi=ada_inversi(t[:4], gh[:4], elev))


def skor_sel(sel, D, T, bobot, mode="bawaan"):
    """(skor, Q, komponen) satu sel: gerbang gagal = skor 0."""
    lolos, _ = gerbang(sel, bobot, mode)
    komp = komponen_q(sel, bobot)
    Q = faktor_q(komp, mode)
    w = (nilai(bobot, "skor.wq"), nilai(bobot, "skor.wd"), nilai(bobot, "skor.wt"))
    return (skor(Q, D, T, w, mode) if lolos else 0.0), Q, komp
