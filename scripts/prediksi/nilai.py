"""Nilai prakiraan beku yang sudah matang -> public/prediksi/data/skor.json (+ pasangan.json untuk kalibrasi.py).

Pengamatan (disimpan di public/prediksi/data/amatan/<KODE>.json, {tanggal: {"j": tahap, "kab": {id: nilai}}}):
  HJN  sementara (H+1..H+5): Open-Meteo forecast API untuk tanggal lampau = analisis model, BUKAN observasi; berlabel.
       final (>= H+6): ERA5 per jam lewat Open-Meteo Archive (models=era5). Nilai = [tot, mulai, lama, puncak].
  API  lokasi unik keyakinan sedang/tinggi dari public/data/hotspot.json (7 hari bergulir, hari sepi = nol); hari lama dari titik_hari/<tanggal>.json (FIRMS). Matang H+1.
  BNJ  DIBI (public/data/dibi_kejadian.json) jenis banjir; LSR jenis longsor/gerakan tanah. Hanya sasaran
  LSR  <= (DIBI 'sampai' - 14 hari): DIBI terisi susulan, sebelum itu "menunggu label".
  ASP  menunggu: belum ada stasiun PM2,5 terukur (udara: WAQI_TOKEN/OpenAQ tidak tersedia), CAMS tidak dinilai dengan CAMS.
  ROB  menunggu: pasut IOC hanya disimpan sebagai bacaan terakhir per titik, belum seri harian.
Baseline wajib: persistensi = kejadian pada hari lengkap terakhir sebelum terbit (t-1), klimatologi = frekuensi kejadian
pada bulan kalender yang sama di arsip pengamatan sebelum tanggal sasaran (kab bila >= 10 hari teramati, selain itu
nasional). Skor dibandingkan pada pasangan yang ketiganya ada. Vonis: n < 30 "belum teruji"; Brier model lebih kecil dari
kedua baseline "mengalahkan baseline"; selain itu "belum mengalahkan baseline".

Pakai:  python3 scripts/prediksi/nilai.py               (butuh jaringan untuk HJN)
        python3 scripts/prediksi/nilai.py ujibalik [n]  uji balik retrospektif n hari (bawaan 30) -> ujibalik.json
        python3 scripts/prediksi/nilai.py uji           (tanpa jaringan)
"""
import datetime as dt, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D
import konfirmasi as K
from bayangan import model as B
from catat import AMBANG, PER_PANGGIL, peluang_hujan, per_hari, ringkas_hujan, titik_harian, titik_hotspot

ARSIP_API = "https://archive-api.open-meteo.com/v1/archive"
PRAK_API = "https://api.open-meteo.com/v1/forecast"
LAMPAU_API = "https://previous-runs-api.open-meteo.com/v1/forecast"
FINAL_HARI = 6          # ERA5 terbit ~5 hari terlambat
MARGIN_DIBI = 14
N_MIN = 30
KLIM_MIN = 10
SIMPAN_HARI = 90        # pasangan.json: cukup untuk 46 fit + 14 uji kalibrasi
JENIS = {"BNJ": {"Banjir", "Banjir Bandang", "Banjir Genangan", "Banjir dan Tanah Longsor"},
         "LSR": {"Tanah Longsor", "Gerakan Tanah", "Banjir dan Tanah Longsor"}}
CEX_RE = B.CEX_RE        # label CEX = DIBI cuaca ekstrem/angin/puting (sama dengan label lab)
MENUNGGU = {"ASP": "belum ada stasiun PM2,5 terukur (WAQI_TOKEN/OpenAQ tidak tersedia); CAMS tidak dinilai dengan CAMS",
            "ROB": "pasut IOC belum dipanen sebagai seri harian per titik"}


def log(*a):
    print("nilai:", *a, file=sys.stderr)


# ---------- pengamatan ----------
def jalur_amatan(k, data=None):
    return os.path.join(data or D.DATA, "amatan", k + ".json")


def unduh_hujan(daftar, mulai, akhir, final, url=None):
    """-> {tanggal: {id: [tot, mulai, lama, puncak]}} untuk rentang tanggal WIB."""
    q0 = {"hourly": "precipitation", "timezone": "Asia/Jakarta", "start_date": mulai, "end_date": akhir}
    if final:
        q0["models"] = "era5"
    out = {}
    for i in range(0, len(daftar), PER_PANGGIL):
        b = daftar[i:i + PER_PANGGIL]
        q = {"latitude": ",".join(str(k["lat"]) for k in b), "longitude": ",".join(str(k["lon"]) for k in b), **q0}
        r = D.per_lokasi(D.ambil((url or (ARSIP_API if final else PRAK_API)) + "?" + "&".join(f"{k}={v}" for k, v in q.items())))
        for k, j in zip(b, r):
            for t, jam in per_hari(j["hourly"]["time"], j["hourly"]["precipitation"]).items():
                if (s := ringkas_hujan(jam)):
                    out.setdefault(t, {})[k["id"]] = list(s)
    return out


def perbarui_hujan(entri, daftar, kini, data=None, unduh=unduh_hujan):
    """Lengkapi amatan HJN untuk sasaran matang + hari persistensi. -> isi amatan."""
    jal = jalur_amatan("HJN", data)
    am = D.baca(jal, {})
    perlu = set()
    for e in entri:
        if e["k"] == "HJN":
            perlu |= {h for h in e["hari"] if h < kini} | ({D.geser(e["t"], -1)} if e["t"] <= kini else set())
    batas_final = D.geser(kini, -FINAL_HARI)
    final = sorted(t for t in perlu if t <= batas_final and am.get(t, {}).get("j") != "final")
    sementara = sorted(t for t in perlu if t > batas_final and t not in am)
    for daftar_t, fin in ((final, True), (sementara, False)):
        if not daftar_t:
            continue
        try:
            got = unduh(daftar, daftar_t[0], daftar_t[-1], fin)
        except (RuntimeError, D.KuotaHabis) as x:
            log("HJN pengamatan", "final" if fin else "sementara", "gagal:", x)
            continue
        for t in daftar_t:
            if got.get(t) and len(got[t]) >= 0.9 * len(daftar):
                am[t] = {"j": "final" if fin else "sementara", "kab": got[t]}
    D.simpan(jal, am)
    return am


def amatan_api(akar, cari, tanggal, sensor=None):
    """sensor "N" = hanya S-NPP (label KRH_B: >= 5 titik VIIRS S-NPP n/h per kab-hari); None = semua sensor (label API)."""
    hot = titik_hotspot(akar, cari, sensor=sensor)
    out = {}
    for t in sorted(set(tanggal) | set(hot)):
        if (c := titik_harian(akar, cari, t, hot, sensor)) is not None:
            out[t] = {"j": "final", "kab": c}
    return out


def amatan_dibi(akar, cari, kode, margin=MARGIN_DIBI):
    d = D.baca(os.path.join(akar, "public", "data", "dibi_kejadian.json"))
    if not d:
        return {}, None
    akhir = D.geser(d["sampai"], -margin)
    out, t = {}, d["dari"]
    while t <= akhir:
        out[t] = {"j": "final", "kab": {}}
        t = D.geser(t, 1)
    for r in d["kejadian"]:
        if (CEX_RE.search(r["jenis"].lower()) if kode == "CEX" else r["jenis"] in JENIS[kode]) and r["tanggal"] in out and (i := cari(r["prov_kode"], r["kab"])):
            out[r["tanggal"]]["kab"][i] = 1
    return out, akhir


# ---------- pasangan ----------
def kejadian(kode, v, a):
    """Nilai amatan -> 0/1 untuk ambang a. v None = tidak teramati."""
    if v is None:
        return None
    if kode == "HJN":
        return int(v[0] >= a)
    return int(v >= a)


def nilai_amatan(kode, hari, kab):
    """Kab tanpa entri di hari teramati: HJN = tidak teramati, API/BNJ/LSR = nol (cakupan lengkap)."""
    if hari is None:
        return None
    v = hari["kab"].get(kab)
    return v if v is not None or kode == "HJN" else 0


class Klim:
    """Frekuensi kejadian bulan kalender yang sama sebelum tanggal sasaran (sampel arsip pengamatan)."""

    def __init__(self, kode, am):
        self.kode, self.am, self.cache = kode, am, {}

    def __call__(self, kab, a, t):
        key = (a, t)
        if key not in self.cache:
            ev, n, hari = {}, {}, 0
            for h, isi in self.am.items():
                if h[5:7] == t[5:7] and h < t:
                    hari += 1
                    for k, v in isi["kab"].items():
                        ev[k] = ev.get(k, 0) + kejadian(self.kode, v, a)
                        n[k] = n.get(k, 0) + 1
            if self.kode != "HJN":   # cakupan lengkap: kab tak tercatat = 0 pada hari teramati
                n = {k: hari for k in ev}
            kab_hari = sum(n.values()) if self.kode == "HJN" else hari * 514
            self.cache[key] = (ev, n, hari, round(sum(ev.values()) / kab_hari, 3) if kab_hari else None)
        ev, n, hari, nas = self.cache[key]
        nk = n.get(kab, hari if self.kode != "HJN" else 0)
        return round(ev.get(kab, 0) / nk, 3) if nk >= KLIM_MIN else nas


def peluang_prakiraan(kode, kol, r, a_i):
    """Baris arsip -> peluang untuk ambang ke-a_i."""
    if kode == "HJN":
        return r[a_i]
    if kode == "API" or kode in D.KODE_B:
        return r[0]
    lv, ps = r[0], r[1]
    return ps if ps is not None else float(lv >= 2)


AMBANG_KODE = {"HJN": AMBANG, "API": [1], "BNJ": [1], "LSR": [1], "BNJ_B": [1], "LSR_B": [1], "CEX_B": [1], "KRH_B": [5]}


def label_regu(rows):
    """Konfirmasi snapshot -> ({(kode, tanggal, kab): 0/1} dari regu untuk BNJ/LSR, {...: 1} warga positif lemah).
    Regu: positif mengalahkan nol. Warga tak pernah nol. Groundcheck TIDAK masuk (bukan label; RANCANGAN.md fase 2)."""
    regu, warga = {}, {}
    for kab, t, kd, sumber, terjadi, _ in rows:
        if kd not in ("BNJ", "LSR"):
            continue
        if sumber == "regu":
            regu[(kd, t, kab)] = max(terjadi, regu.get((kd, t, kab), 0))
        elif sumber == "warga" and terjadi == 1:
            warga[(kd, t, kab)] = 1
    return regu, warga


def pasangan(entri, am, kini=None, regu=None, warga=None):
    """-> daftar pasangan [kode, ambang, tenggang, tahap, sasaran, kab, p, o, pers, klim, ekstra, asal]
    asal = "ps" (peluang ansambel), "lv" (BNJ/LSR tanpa ps: p = level >= 2, bukan peluang), "p" (kode lain).
    ekstra (HJN ambang 1 saja): [mulai_f, mulai_o, lama_f, lama_o, tot_f, tot_o].
    regu {(kode, tanggal, kab): 0/1} = label lapangan BNJ/LSR: mengisi sel yang DIBI belum label (tahap "regu"; 0 dan 1 sah) dan
    menaikkan 0 -> 1 di hari DIBI; tak pernah menurunkan. warga {...: 1} hanya menaikkan 0 -> 1 di hari yang sudah berlabel
    (tidak membuat sel baru: sel positif-saja membuat p=1 selalu menang), tak pernah jadi nol."""
    regu, warga = regu or {}, warga or {}
    out, klim = [], {k: Klim(k, v) for k, v in am.items()}
    for e in entri:
        k = e["k"]
        ak = D.DASAR.get(k, k)          # model bayangan memakai amatan/baseline kode dasarnya
        if ak not in am:
            continue
        hk = am[ak].get(D.geser(e["t"], -1))
        for n, t in enumerate(e["hari"]):
            hari = am[ak].get(t)
            if (hari is None and not regu) or (kini and t >= kini):
                continue
            for kab, rs in e["kab"].items():
                r = rs[n]
                v, th = nilai_amatan(ak, hari, kab), hari and hari["j"]
                c = regu.get((ak, t, kab))
                if c is not None and (v is None or c > v):
                    v, th = c, (th or "regu")
                if warga.get((ak, t, kab)) and v == 0:
                    v = 1
                if r is None or v is None:
                    continue
                vp = nilai_amatan(ak, hk, kab)
                for ai, a in enumerate(AMBANG_KODE[k]):
                    p = peluang_prakiraan(k, e["kol"], r, ai)
                    if p is None:
                        continue
                    ek = None
                    if k == "HJN" and ai == 0:
                        ek = [r[4], v[1], r[5], v[2], r[3], v[0]]
                    asal = ("lv" if r[1] is None else "ps") if k in ("BNJ", "LSR") else "p"
                    out.append([k, a, n + 1, th, t, kab, p, kejadian(ak, v, a), kejadian(ak, vp, a), klim[ak](kab, a, t), ek, asal])
    return out


# ---------- skor ----------
def brier(ps, os_):
    return round(sum((p - o) ** 2 for p, o in zip(ps, os_)) / len(ps), 4) if ps else None


def andal(ps, os_, nbin=10):
    b = [[0, 0.0, 0] for _ in range(nbin)]
    for p, o in zip(ps, os_):
        x = b[min(int(p * nbin), nbin - 1)]
        x[0] += 1
        x[1] += p
        x[2] += o
    return [[n, round(sp / n, 3), round(so / n, 3)] if n else [0, None, None] for n, sp, so in b]


def kontingensi(ps, os_, ambang=0.5):
    a = sum(p >= ambang and o for p, o in zip(ps, os_))
    b = sum(p >= ambang and not o for p, o in zip(ps, os_))
    c = sum(p < ambang and o for p, o in zip(ps, os_))
    bagi = lambda x, y: round(x / y, 3) if y else None
    return {"a": a, "b": b, "c": c, "pod": bagi(a, a + c), "far": bagi(b, a + b), "csi": bagi(a, a + b + c)}


def mae(xs):
    v = [abs(f - o) for f, o in xs if f is not None and o is not None]
    return (round(sum(v) / len(v), 2), len(v)) if v else (None, 0)


def skor_grup(ps):
    """ps = pasangan satu grup -> ringkasan skor."""
    p = [x[6] for x in ps]
    o = [x[7] for x in ps]
    banding = [x for x in ps if x[8] is not None and x[9] is not None]
    bm = brier([x[6] for x in banding], [x[7] for x in banding])
    bp = brier([x[8] for x in banding], [x[7] for x in banding])
    bk = brier([x[9] for x in banding], [x[7] for x in banding])
    ss = lambda b0: round(1 - bm / b0, 3) if bm is not None and b0 else None
    if len(banding) < N_MIN:
        vonis = "belum teruji"
    elif bm < bp and bm < bk:
        vonis = "mengalahkan baseline"
    else:
        vonis = "belum mengalahkan baseline"
    out = {"n": len(ps), "n_banding": len(banding), "hari": len({x[4] for x in ps}), "frek": round(sum(o) / len(o), 3) if o else None,
           "brier": brier(p, o), "brier_banding": bm, "brier_persistensi": bp, "brier_klimatologi": bk,
           "bss_persistensi": ss(bp), "bss_klimatologi": ss(bk), "andal": andal(p, o), **kontingensi(p, o), "vonis": vonis}
    ek = [x[10] for x in ps if x[10]]
    if ek:
        out["mae_mulai"], out["n_mulai"] = mae([(e[0], e[1]) for e in ek])
        out["mae_lama"], out["n_lama"] = mae([(e[2], e[3]) for e in ek])
        out["mae_tot"], _ = mae([(e[4], e[5]) for e in ek])
    return out


def ringkas(pas, n_prakiraan, status=None):
    grup = {}
    for x in pas:
        grup.setdefault((x[0], x[1], x[2], x[3]), []).append(x)
    kode = {}
    for k in D.KODE + D.KODE_B:
        g = [{"ambang": a, "tenggang": n, "tahap": th, **skor_grup(v)} for (kk, a, n, th), v in sorted(grup.items()) if kk == k]
        if g:
            kode[k] = {"status": "dinilai", "prakiraan": n_prakiraan.get(k, 0), "grup": g}
        else:
            kode[k] = {"status": "menunggu", "prakiraan": n_prakiraan.get(k, 0),
                       "alasan": (status or {}).get(k) or (status or {}).get(D.DASAR.get(k)) or MENUNGGU.get(k) or "belum ada prakiraan yang matang"}
    return kode


def ap(ps, os_):
    """Average precision (AUC-PR, jumlah bertingkat seperti sklearn; skor sama dikelompokkan). None bila tak ada kejadian."""
    pos = sum(os_)
    if not pos:
        return None
    urut = sorted(zip(ps, os_), key=lambda x: -x[0])
    tp = n = 0
    awal = 0.0
    hasil = 0.0
    i = 0
    while i < len(urut):
        j = i
        while j < len(urut) and urut[j][0] == urut[i][0]:
            j += 1
        tp += sum(o for _, o in urut[i:j])
        n += j - i
        hasil += (tp / pos - awal) * tp / n
        awal = tp / pos
        i = j
    return round(hasil, 4)


def bayangan(pas, n_prakiraan):
    """Model bayangan berdampingan: per kode dan tenggang, pasangan (sasaran, kab) yang sama dengan model lama (bila ada) lawan
    persistensi dan klimatologi. Vonis = aturan lama (Brier lebih kecil dari KEDUA baseline, n >= 30); vonis_peringkat = AP lebih tinggi
    dari kedua baseline (bayangan mentah, belum dikalibrasi, jadi Brier bisa kalah oleh pergeseran laju sementara peringkat menang)."""
    banding = []
    for kb in D.KODE_B:
        lama = B.INFO[kb]["lama"]
        pl = {(x[2], x[4], x[5]): x[6] for x in pas if lama and x[0] == lama}
        for n in (1, 2, 3):
            rows = [x for x in pas if x[0] == kb and x[2] == n]
            if lama:
                rows = [x for x in rows if (n, x[4], x[5]) in pl]
            if not rows:
                continue
            g = skor_grup(rows)
            bd = [x for x in rows if x[8] is not None and x[9] is not None]
            o = [x[7] for x in bd]
            ab, ak_, ap_ = ap([x[6] for x in bd], o), ap([x[9] for x in bd], o), ap([x[8] for x in bd], o)
            r = {"kode": kb, "lama": lama, "tenggang": n, "n": g["n"], "n_banding": g["n_banding"], "hari": g["hari"], "frek": g["frek"],
                 "brier_bayangan": g["brier_banding"], "brier_persistensi": g["brier_persistensi"], "brier_klimatologi": g["brier_klimatologi"],
                 "ap_bayangan": ab, "ap_persistensi": ap_, "ap_klimatologi": ak_, "vonis": g["vonis"],
                 "pod": g["pod"], "far": g["far"]}
            if lama:
                r["brier_lama"] = brier([pl[(n, x[4], x[5])] for x in bd], o)
                r["ap_lama"] = ap([pl[(n, x[4], x[5])] for x in bd], o)
                r["menang_lama"] = None if g["n_banding"] < N_MIN else bool(r["brier_bayangan"] < r["brier_lama"])
            r["vonis_peringkat"] = "belum teruji" if g["n_banding"] < N_MIN or sum(o) < 5 else (
                "peringkat lebih baik dari baseline" if ab > max(ak_, ap_) else "peringkat belum lebih baik")
            banding.append(r)
    return {"catatan": B.CATATAN, "model": {k: {**B.INFO[k], "prakiraan": n_prakiraan.get(k, 0)} for k in D.KODE_B}, "banding": banding}


def ringkas_konfirmasi(rows, am_api=None):
    """Hitungan per kode dan sumber. dipakai: regu BNJ/LSR = label skor; warga BNJ/LSR = positif lemah; groundcheck = audit saja.
    audit_firms: dari baris groundcheck (kab-hari, bukan tugas), berapa yang amatan API (FIRMS) nol; bersyarat pada tugas yang ada."""
    out = {}
    for kab, t, kd, sumber, terjadi, _ in rows:
        x = out.setdefault(kd, {}).setdefault(sumber, {"n": 0, "positif": 0, "nol": 0})
        x["n"] += 1
        x["positif" if terjadi else "nol"] += 1
    for kd, per in out.items():
        for sumber, x in per.items():
            x["dipakai"] = {"regu": "label skor" if kd in ("BNJ", "LSR") else "belum dipakai",
                            "warga": "positif lemah" if kd in ("BNJ", "LSR") else "belum dipakai", "groundcheck": "audit saja"}[sumber]
    if am_api is not None and "groundcheck" in out.get("API", {}):
        gc = [(t, kab) for kab, t, kd, s, o, _ in rows if kd == "API" and s == "groundcheck" and o == 1 and t in am_api]
        out["API"]["groundcheck"]["audit_firms"] = {"n_kabhari": len(gc), "firms_nol": sum(1 for t, kab in gc if not am_api[t]["kab"].get(kab)),
                                                    "catatan": "bersyarat pada tugas yang ada; bukan label Brier"}
    return out


def nilai(kini=None, akar=D.AKAR, folder=None, data=None, unduh=unduh_hujan):
    kini = kini or D.hari_ini()
    entri = D.semua_arsip(folder)
    daftar = D.kab(akar)
    cari = D.pencari(daftar)
    n_pra = {}
    for e in entri:
        n_pra[e["k"]] = n_pra.get(e["k"], 0) + 1
    am, status = {}, {}
    if any(e["k"] == "HJN" for e in entri):
        am["HJN"] = perbarui_hujan(entri, daftar, kini, data, unduh)
    dasar = {D.DASAR.get(e["k"], e["k"]) for e in entri}
    for kd, sensor in (("API", None), ("KRH", "N")):
        tgl = sorted({h for e in entri if D.DASAR.get(e["k"], e["k"]) == kd for h in e["hari"] + [D.geser(e["t"], -1)] if h < kini})
        if tgl:
            # klimatologi butuh bulan yang sama sebelum sasaran: semua titik_hari bulan itu ikut dibaca (+ hotspot.json di amatan_api)
            folder_t = os.path.join(akar, "public", "data", "titik_hari")
            bulan = {t[:7] for t in tgl}
            semua = sorted(f[:10] for f in os.listdir(folder_t) if f[:7] in bulan) if os.path.isdir(folder_t) else []
            am[kd] = amatan_api(akar, cari, sorted(set(semua) | set(tgl)), sensor)
    for k in ("BNJ", "LSR", "CEX"):
        if k in dasar:
            am[k], akhir = amatan_dibi(akar, cari, k)
            status[k] = f"menunggu label DIBI: sasaran <= {akhir} yang dinilai (DIBI terisi susulan {MARGIN_DIBI} hari)" if akhir else "dibi_kejadian.json tidak ada"
    kf = K.muat(data)["rows"]
    regu, warga = label_regu(kf)
    pas = pasangan(entri, am, kini, regu, warga)
    d = data or D.DATA
    batas = D.geser(kini, -SIMPAN_HARI)
    D.simpan(os.path.join(d, "pasangan.json"), {"dibuat": kini, "kol": ["kode", "ambang", "tenggang", "tahap", "sasaran", "kab", "p", "o", "pers", "klim", "ekstra", "asal"],
                                                "baris": [x for x in pas if x[4] >= batas and x[0] in D.KODE]})   # bayangan tak ikut kalibrasi.py (ukuran)
    skor = {"versi": 1, "dibuat": dt.datetime.now(D.WIB).replace(microsecond=0).isoformat(), "jenis": "prospektif",
            "n_min": N_MIN, "kode": ringkas(pas, n_pra, status), "bayangan": bayangan(pas, n_pra),
            "konfirmasi": ringkas_konfirmasi(kf, am.get("API")),
            "catatan": "Prospektif: prakiraan dibekukan sebelum kejadian (arsip append-only). HJN tahap 'sementara' dinilai "
                       "terhadap analisis model, bukan observasi; 'final' terhadap ERA5."}
    D.simpan(os.path.join(d, "skor.json"), skor)
    return skor


# ---------- uji balik retrospektif ----------
def unduh_lampau(daftar, mulai, akhir):
    """Prakiraan lampau Open-Meteo (previous runs): precipitation_previous_dayN = prakiraan dari jalan N hari sebelumnya.
    -> {tenggang: {tanggal: {id: [tot, mulai, lama, puncak]}}}"""
    out = {n: {} for n in (1, 2, 3)}
    var = ",".join(f"precipitation_previous_day{n}" for n in (1, 2, 3))
    for i in range(0, len(daftar), PER_PANGGIL):
        b = daftar[i:i + PER_PANGGIL]
        q = {"latitude": ",".join(str(k["lat"]) for k in b), "longitude": ",".join(str(k["lon"]) for k in b),
             "hourly": var, "timezone": "Asia/Jakarta", "start_date": mulai, "end_date": akhir}
        r = D.per_lokasi(D.ambil(LAMPAU_API + "?" + "&".join(f"{k}={v}" for k, v in q.items())))
        for k, j in zip(b, r):
            for n in (1, 2, 3):
                for t, jam in per_hari(j["hourly"]["time"], j["hourly"][f"precipitation_previous_day{n}"]).items():
                    if (s := ringkas_hujan(jam)):
                        out[n].setdefault(t, {})[k["id"]] = list(s)
    return out


def entri_retro(lampau):
    """Prakiraan lampau -> entri berbentuk arsip (peluang mentah deterministik m=0), satu per tanggal terbit."""
    terbit = sorted({D.geser(t, -n) for n, v in lampau.items() for t in v})
    out = []
    for t0 in terbit:
        hari = [D.geser(t0, n) for n in (1, 2, 3)]
        kab = {}
        for n, h in enumerate(hari, 1):
            for i, s in lampau[n].get(h, {}).items():
                ps, m = peluang_hujan(s[0], None)
                kab.setdefault(i, [None, None, None])[n - 1] = ps + s + [None, m]
        if kab:
            out.append({"t": t0, "k": "HJN", "hari": hari, "kol": ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "sm", "m"], "kab": kab})
    return out


def ujibalik(n_hari=30, kini=None, akar=D.AKAR, data=None):
    kini = kini or D.hari_ini()
    akhir, mulai = D.geser(kini, -(FINAL_HARI + 1)), D.geser(kini, -(FINAL_HARI + n_hari))
    daftar = D.kab(akar)
    # mentah disimpan (data/raw diabaikan git): kuota jam Open-Meteo bisa habis di tengah, jalan ulang tidak mengunduh lagi
    mentah = os.path.join(akar, "data", "raw", "prediksi", f"lampau_{mulai}_{akhir}.json")
    lampau = {int(k): v for k, v in (D.baca(mentah) or {}).items()}
    if not lampau:
        lampau = unduh_lampau(daftar, mulai, akhir)
        D.simpan(mentah, lampau)
    entri = [e for e in entri_retro(lampau) if all(mulai <= h <= akhir for h in e["hari"])]
    jal = jalur_amatan("HJN", data)
    am = D.baca(jal, {})
    perlu = sorted({h for e in entri for h in e["hari"]} | {D.geser(e["t"], -1) for e in entri})
    perlu = [t for t in perlu if am.get(t, {}).get("j") != "final"]
    if perlu:
        got = unduh_hujan(daftar, perlu[0], perlu[-1], True)
        for t in perlu:
            if got.get(t) and len(got[t]) >= 0.9 * len(daftar):
                am[t] = {"j": "final", "kab": got[t]}
        D.simpan(jal, am)
    pas = pasangan(entri, {"HJN": am})
    out = {"versi": 1, "dibuat": dt.datetime.now(D.WIB).replace(microsecond=0).isoformat(), "jenis": "uji balik retrospektif",
           "periode": [mulai, akhir], "n_terbit": len(entri), "kode": {"HJN": ringkas(pas, {"HJN": len(entri)})["HJN"]},
           "catatan": "Uji balik retrospektif, BUKAN prospektif: prakiraan lampau Open-Meteo (previous runs, deterministik, "
                      "peluang mentah dari jumlah hujan) dinilai terhadap ERA5. Tenggang +N = jalan model N hari sebelum sasaran. "
                      "Tidak dipakai untuk kalibrasi."}
    D.simpan(os.path.join(data or D.DATA, "ujibalik.json"), out)
    return out


def uji():
    import tempfile
    assert brier([1, 0], [1, 0]) == 0 and brier([0.5], [1]) == 0.25 and brier([], []) is None
    a = andal([0.05, 0.95, 0.96], [0, 1, 0])
    assert a[0] == [1, 0.05, 0.0] and a[9][0] == 2 and len(a) == 10
    k = kontingensi([0.9, 0.9, 0.1, 0.1], [1, 0, 1, 0])
    assert (k["a"], k["b"], k["c"], k["pod"], k["far"], k["csi"]) == (1, 1, 1, 0.5, 0.5, 0.333)
    assert mae([(14, 16), (None, 3), (2, 2)]) == (1.0, 2)
    # sintetis: model sempurna mengalahkan baseline; model terbalik tidak; n < 30 belum teruji
    def pas(p_fn, n=40):
        return [["HJN", 1, 1, "final", f"2026-10-{1 + i % 28:02d}", "1101", p_fn(i % 2), i % 2, 1 - i % 2, 0.5, None] for i in range(n)]
    assert skor_grup(pas(float))["vonis"] == "mengalahkan baseline"
    assert skor_grup(pas(lambda o: 1.0 - o))["vonis"] == "belum mengalahkan baseline"
    assert skor_grup(pas(float, 10))["vonis"] == "belum teruji"
    # alur nilai dengan unduh tiruan, folder sementara
    daftar = D.kab()
    with tempfile.TemporaryDirectory() as tmp:
        f, d = os.path.join(tmp, "arsip"), os.path.join(tmp, "data")
        t = "2026-09-01"
        for i in range(12):
            ti = D.geser(t, i)
            baris = [[0.8, 0.4, 0.05, 12.0, 14, 3, 15, 0.4, 0]] * 3
            D.tambah_arsip({"t": ti, "k": "HJN", "dibuat": "x", "sumber": "uji", "hari": [D.geser(ti, n) for n in (1, 2, 3)],
                            "kol": ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "sm", "m"], "kab": {"1101": baris}}, f)
        dipanggil = []

        def tiruan(daf, m, a, fin):
            dipanggil.append((m, a, fin))
            out, x = {}, m
            while x <= a:
                out[x] = {k["id"]: [5.0, 16, 2, 16] for k in daf}
                x = D.geser(x, 1)
            return out
        s = nilai("2026-09-20", folder=f, data=d, unduh=tiruan)
        g = s["kode"]["HJN"]["grup"]
        assert any(x["tahap"] == "final" for x in g) and any(x["tahap"] == "sementara" for x in g), g
        g1 = next(x for x in g if x["ambang"] == 1 and x["tenggang"] == 1 and x["tahap"] == "final")
        assert g1["frek"] == 1.0 and g1["mae_mulai"] == 2.0 and g1["mae_lama"] == 1.0 and g1["mae_tot"] == 7.0, g1
        assert s["kode"]["ASP"]["status"] == "menunggu" and "stasiun" in s["kode"]["ASP"]["alasan"]
        am = D.baca(jalur_amatan("HJN", d))
        assert am["2026-09-14"]["j"] == "final" and am["2026-09-15"]["j"] == "sementara"
        assert "2026-09-20" not in am, "sasaran hari ini belum matang, tidak diamati"
        # jalan kedua: tidak mengunduh ulang yang sudah final
        dipanggil.clear()
        nilai("2026-09-20", folder=f, data=d, unduh=tiruan)
        assert all(not fin for _, _, fin in dipanggil), dipanggil
    # API: hari sepi di hotspot.json = amatan nol (bukan menunggu)
    from catat import titik_hotspot
    with tempfile.TemporaryDirectory() as tmp:
        os.makedirs(os.path.join(tmp, "public", "data"))
        k0 = daftar[0]
        json.dump({"kolom": ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib", "hitung"],
                   "acuan": "2026-10-30T00:24:00+00:00", "wilayah": [k0["geo"] + "|X"],
                   "baris": [[0, 100, 0, "N", 1, 1, 0, "10-26", 1], [0, 100, 0, "N", 1, 1, 0, "10-28", 1]]},
                  open(os.path.join(tmp, "public", "data", "hotspot.json"), "w"))
        a = amatan_api(tmp, D.pencari(daftar), ["2026-10-29", "2026-09-01"])
        assert a["2026-10-29"] == {"j": "final", "kab": {}} and nilai_amatan("API", a["2026-10-29"], k0["id"]) == 0, a
        assert a["2026-10-28"]["kab"] == {k0["id"]: 1} and "2026-09-01" not in a, a
    # retro: bentuk entri sah
    e = entri_retro({1: {"2026-09-10": {"1101": [3.0, 14, 2, 14]}}, 2: {}, 3: {}})
    assert e[0]["t"] == "2026-09-09" and D.periksa_entri(dict(e[0], dibuat="x", sumber="x")) is None
    # model bayangan berdampingan: pasangan sama dengan model lama, vonis memakai aturan baseline yang sama
    assert ap([0.9, 0.8, 0.1], [1, 0, 1]) == 0.8333 and ap([0.5, 0.5], [0, 0]) is None
    ev = lambda d: int(dt.date.fromisoformat(d).day % 3 == 0)
    am_b = {"BNJ": {D.geser("2026-08-01", i): {"j": "final", "kab": {"1101": 1} if ev(D.geser("2026-08-01", i)) else {}} for i in range(100)}}
    ent = []
    for i in range(12, 50):
        ti = D.geser("2026-09-01", i)
        hr = [D.geser(ti, n) for n in (1, 2, 3)]
        ent.append({"t": ti, "k": "BNJ", "hari": hr, "kol": ["lv", "ps"], "kab": {"1101": [[1, 0.5]] * 3}})
        ent.append({"t": ti, "k": "BNJ_B", "hari": hr, "kol": ["p"], "kab": {"1101": [[float(ev(h))] for h in hr]}})
        ent.append({"t": ti, "k": "CEX_B", "hari": hr, "kol": ["p", "jeda"], "kab": {"1101": [[0.5, 7]] * 3}})
    pb = bayangan(pasangan(ent, am_b, "2026-10-30"), {})
    r1 = next(x for x in pb["banding"] if x["kode"] == "BNJ_B" and x["tenggang"] == 1)
    assert r1["n_banding"] >= 30 and r1["brier_bayangan"] == 0 and r1["brier_lama"] == 0.25 and r1["menang_lama"] is True and r1["vonis"] == "mengalahkan baseline", r1
    assert r1["ap_bayangan"] == 1.0 and r1["vonis_peringkat"] == "peringkat lebih baik dari baseline", r1
    assert not any(x["kode"] == "CEX_B" for x in pb["banding"]), "CEX_B tanpa amatan CEX: tidak dinilai, tidak dikarang"
    assert D.DASAR["KRH_B"] == "KRH" and AMBANG_KODE["KRH_B"] == [5]
    # konfirmasi lapangan: regu 0 = negatif sah, warga tak pernah negatif, groundcheck bukan label, sel tak terbaca tak ditebak
    rows = [["1101", "2026-10-31", "BNJ", "regu", 0, None], ["1102", "2026-10-31", "BNJ", "regu", 1, None], ["1101", "2026-10-31", "LSR", "warga", 1, None],
            ["1101", "2026-10-31", "API", "groundcheck", 1, None], ["1103", "2026-10-31", "BNJ", "warga", 1, None]]
    regu, warga = label_regu(rows)
    assert regu == {("BNJ", "2026-10-31", "1101"): 0, ("BNJ", "2026-10-31", "1102"): 1} and warga == {("LSR", "2026-10-31", "1101"): 1, ("BNJ", "2026-10-31", "1103"): 1}, (regu, warga)
    assert label_regu(rows + [["1101", "2026-10-31", "BNJ", "regu", 1, None]])[0][("BNJ", "2026-10-31", "1101")] == 1
    t0 = "2026-10-31"     # di luar jangkauan DIBI (am BNJ berhenti 2026-10-20): hanya sel regu yang dinilai
    amk = {"BNJ": {"2026-10-20": {"j": "final", "kab": {}}}, "LSR": {"2026-10-20": {"j": "final", "kab": {}}}}
    en = [{"t": "2026-10-30", "k": "BNJ", "hari": [t0, "2026-11-01", "2026-11-02"], "kol": ["lv", "ps"], "kab": {k: [[2, 0.6]] * 3 for k in ("1101", "1102", "1103")}},
          {"t": "2026-10-30", "k": "LSR", "hari": [t0, "2026-11-01", "2026-11-02"], "kol": ["lv", "ps"], "kab": {"1101": [[2, 0.6]] * 3}}]
    ps = {(x[0], x[5]): x for x in pasangan(en, amk, "2026-11-05", regu, warga) if x[2] == 1}
    assert ps[("BNJ", "1101")][7] == 0 and ps[("BNJ", "1102")][7] == 1 and ps[("BNJ", "1101")][3] == "regu", ps
    assert ("BNJ", "1103") not in ps and ("LSR", "1101") not in ps, "warga di sel tanpa label tidak membuat sel (positif-saja)"
    amd = {"BNJ": {t0: {"j": "final", "kab": {}}}}
    pw = {(x[0], x[5]): x for x in pasangan(en[:1], amd, "2026-11-05", {}, warga) if x[2] == 1}
    assert pw[("BNJ", "1103")][7] == 1 and pw[("BNJ", "1101")][7] == 0, "warga menaikkan 0->1 di hari berlabel saja, tak pernah menurunkan"
    assert all(x[7] == 0 for x in pasangan(en[:1], amd, "2026-11-05", {}, {}) if x[2] == 1)
    rk = ringkas_konfirmasi(rows, {t0: {"j": "final", "kab": {}}})
    assert rk["BNJ"]["regu"] == {"n": 2, "positif": 1, "nol": 1, "dipakai": "label skor"} and rk["BNJ"]["warga"]["dipakai"] == "positif lemah", rk
    assert rk["API"]["groundcheck"]["dipakai"] == "audit saja" and rk["API"]["groundcheck"]["audit_firms"]["firms_nol"] == 1, rk
    # groundcheck tak masuk Brier API: pasangan API identik dengan atau tanpa baris groundcheck
    ea = [{"t": "2026-10-30", "k": "API", "hari": [t0, "2026-11-01", "2026-11-02"], "kol": ["p"], "kab": {"1101": [[0.9]] * 3}}]
    aa = {"API": {"2026-10-30": {"j": "final", "kab": {}}, t0: {"j": "final", "kab": {}}}}
    assert pasangan(ea, aa, "2026-11-05", *label_regu(rows)) == pasangan(ea, aa, "2026-11-05")
    print("nilai.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif sys.argv[1:2] == ["ujibalik"]:
        o = ujibalik(int(sys.argv[2]) if len(sys.argv) > 2 else 30)
        print("ujibalik:", o["periode"], o["n_terbit"], "terbit;", [(g["ambang"], g["tenggang"], g["n"], g["vonis"]) for g in o["kode"]["HJN"].get("grup", [])])
    elif len(sys.argv) == 1:
        K.perbarui(D.hari_ini())     # tanpa PIPA_TOKEN / gagal: dilewati, tak menggagalkan
        s = nilai()
        print("nilai:", {k: (v["status"], sum(g["n"] for g in v.get("grup", []))) for k, v in s["kode"].items()})
    else:
        print(__doc__)
