"""Tabel bahaya 12 bulan ke depan lintas bencana + kombinasi berantai (pola P7) -> public/data/outlook12.json

Pakai:  python3 scripts/umum/outlook12.py        baca public/data/iklim_outlook.json (jalankan iklim_outlook.py dulu), tulis berkas
        python3 scripts/umum/outlook12.py uji    self-check luring

Semua angka dari data kejadian historis; tidak ada aturan karangan.
Per bahaya x bulan:
  indeks f(tahun,bulan) = jumlah kejadian bulan itu / rerata bulanan tahun itu (rerata bergerak 5 tahun bila "tren"
    =benar: pencatatan DIBI naik tiap tahun, jadi tahun belakangan tidak boleh otomatis tampak lebih parah).
    1,0 = bulan rerata. Karhutla (titik panas MODIS, penginderaan konsisten) tanpa penormalan tren.
  E_analog = rerata f di K=5 tahun pembanding terdekat di ruang (RONI, DMI) terstandar pada musim yang sama; keadaan
    pendorong sekarang dari iklim_outlook.json (persistensi nilai terakhir, lihat batasan di sana).
  E_semua  = rerata f semua tahun (klimatologi).
Uji balik (leave-one-out tiap tahun): prakiraan analog dari tahun-tahun LAIN lawan prakiraan klimatologi dari tahun-tahun lain;
  skill = 1 - SSE_analog/SSE_klimatologi, dikumpulkan lewat semua bulan. Skill <= 0.02 -> bahaya itu memakai klimatologi
  (dasar="klimatologi") dan TIDAK mengklaim pengaruh iklim.
Tingkat dari indeks yang dipakai (E): tidak ada < 0,1 | rendah < 0,7 | sedang < 1,3 | parah < 2,0 | ekstrem >= 2,0.
  Artinya relatif terhadap bulan rerata bahaya itu sendiri (bukan lintas bahaya): "parah" = bulan yang biasanya
  1,3-2x lebih ramai dari bulan rerata. Batas adalah konvensi tampilan, bukan hasil fit.
Gempa: laju tetap (tidak dipengaruhi iklim): M>=6 dangkal (<=70 km) dalam wilayah katalog, 1990-2025, USGS.
Pasang tertinggi: jendela dari public/banjir/data/pasang_astro.json bila ada (indeks gaya astronomis, BUKAN tinggi air).
Berantai: pasangan A lalu B di provinsi yang sama dengan B dalam 1-30 hari setelah hari kejadian A; diurutkan menurut
  jumlah kejadian x rata-rata korban meninggal (= total korban), disertai lift terhadap peluang acak B dalam 30 hari di
  provinsi yang sama dan 1 preseden terbesar.

Sumber kejadian, berurutan (yang pertama ada yang dipakai): data/raw/iklim/dibi_bulanan.json (cache DIBI BNPB 2008-kini,
  ditulis sini bila dibi.bnpb.go.id terjangkau lewat scripts/banjir/kejadian.dibi) -> DIBI langsung -> klimatologi
  riwayat.json (DIBI 2008-2025 agregat per dasarian; hanya banjir/longsor, TANPA tahun pembanding) + kejadian_dibi
  kejadian.json (3 tahun terakhir; cukup untuk berantai, tidak cukup untuk tahun pembanding).
"""
import bisect
import datetime as dt
import importlib.util
import json
import math
import os
import sys
import urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/outlook12.json")
IKLIM = os.path.join(AKAR, "public/data/iklim_outlook.json")
KEJADIAN = os.path.join(AKAR, "public/banjir/data/kejadian.json")
RIWAYAT = os.path.join(AKAR, "public/banjir/data/riwayat.json")
PASANG = os.path.join(AKAR, "public/banjir/data/pasang_astro.json")
MODIS = os.path.join(AKAR, "public/data/sejarah_modis.json")
GEMPA = os.path.join(AKAR, "public/gempa/data/riwayat_m5.json")
CACHE_DIBI = os.path.join(AKAR, "data/raw/iklim/dibi_bulanan.json")
MUSIM = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]
K = 5
TAHUN_DIBI = (2008, 2025)
AMBANG = [(0.1, "tidak ada"), (0.7, "rendah"), (1.3, "sedang"), (2.0, "parah"), (1e9, "ekstrem")]
SKILL_MIN = 0.02
JENDELA_HARI = 30
NAMA = {"banjir": "Banjir", "longsor": "Tanah longsor", "cuaca": "Cuaca ekstrem (puting beliung, angin kencang)", "kering": "Kekeringan",
        "gelombang": "Gelombang pasang / abrasi", "bandang": "Banjir bandang", "rob": "Rob", "karhutla": "Karhutla (titik panas)", "gempa": "Gempa M6+ dangkal"}
BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]


def tingkat(e):
    return next(n for b, n in AMBANG if e < b)


def _muat(nama, jalur):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, jalur))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def baca(p):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


# ---------------------------------------------------------------- sumber kejadian
def dibi_langsung():
    """Tarik DIBI penuh lewat scripts/banjir/kejadian.dibi (jalur yang sudah dipakai produksi). None bila tak terjangkau."""
    try:
        urllib.request.urlopen(urllib.request.Request("https://dibi.bnpb.go.id/", headers={"User-Agent": "poskokarhutla/1.0"}), timeout=15)
    except Exception:  # noqa: BLE001 situs tak terjangkau: lewati, bukan galat
        return None
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    try:
        k = _muat("banjir_kejadian_outlook", "scripts/banjir/kejadian.py")
        rows = k.dibi(k.Pencocok())
    except Exception as e:  # noqa: BLE001
        print(f"  DIBI langsung gagal: {e}", file=sys.stderr)
        return None
    finally:
        sys.path.pop(0)
    out = [["+".join(j), p, n, t, v["kejadian"], v["meninggal"]] for j, p, n, t, v in rows]
    os.makedirs(os.path.dirname(CACHE_DIBI), exist_ok=True)
    with open(CACHE_DIBI, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    return out


def muat_kejadian():
    """-> (rows [[jenis 'a+b', prov, kab, tgl, n_kejadian, meninggal]], label, penuh: bool)."""
    c = baca(CACHE_DIBI)
    if c:
        return c, "DIBI BNPB 2008-kini (cache data/raw/iklim/dibi_bulanan.json)", True
    c = dibi_langsung()
    if c:
        return c, "DIBI BNPB 2008-kini (langsung dibi.bnpb.go.id)", True
    k = baca(KEJADIAN) or {}
    rows = [["+".join(r["jenis"].split("_")), r["prov"], r["kab"], r["tanggal"], 1, r.get("meninggal", 0)] for r in k.get("kejadian_dibi", [])]
    return rows, "kejadian.json kejadian_dibi (DIBI BNPB, 3 tahun terakhir saja)", False


def deret_bulanan(rows, jenis):
    """{tahun: [12 jumlah kejadian]} untuk satu jenis, tahun penuh TAHUN_DIBI."""
    out = {y: [0.0] * 12 for y in range(TAHUN_DIBI[0], TAHUN_DIBI[1] + 1)}
    for j, p, n, t, nk, mt in rows:
        if jenis in j.split("+") and int(t[:4]) in out:
            out[int(t[:4])][int(t[5:7]) - 1] += nk
    return out if sum(sum(v) for v in out.values()) >= 100 else None


def deret_karhutla():
    d = baca(MODIS)
    if not d:
        return None
    akhir = dt.date.today().year - 1
    out = {}
    for y in d["tahun"]:
        if int(y) <= akhir:
            out[int(y)] = [float(sum(p[y][m] for p in d["prov"].values() if y in p)) for m in range(12)]
    return out


def laju_gempa():
    d = baca(GEMPA)
    if not d:
        return None
    akhir = dt.date.today().year - 1
    n6 = n7 = 0
    for w, la, lo, dalam, m, pv in d["baris"]:
        if 1990 <= int(w[:4]) <= akhir and dalam <= 70:
            n6 += m >= 6.0
            n7 += m >= 7.0
    th = akhir - 1990 + 1
    return {"n_m6": n6, "n_m7": n7, "tahun": [1990, akhir], "per_bulan_m6": n6 / th / 12, "per_bulan_m7": n7 / th / 12}


# ---------------------------------------------------------------- indeks, analog, uji balik
def indeks(seri, tren):
    """{tahun: [12 indeks]}; 1,0 = bulan rerata."""
    th = sorted(seri)
    out = {}
    for y in th:
        if tren:
            w = [t for t in th if abs(t - y) <= 2]
            rata = sum(sum(seri[t]) for t in w) / len(w) / 12
        else:
            rata = sum(sum(seri[t]) for t in th) / len(th) / 12
        out[y] = [v / rata if rata > 0 else 0.0 for v in seri[y]]
    return out


def terdekat(kandidat, r0, d0, k=K):
    """kandidat [(tahun, roni, dmi)] -> k tahun terdekat di ruang terstandar."""
    if len(kandidat) < 3:
        return []
    def sd(i):
        v = [x[i] for x in kandidat]
        m = sum(v) / len(v)
        return math.sqrt(sum((a - m) ** 2 for a in v) / (len(v) - 1)) or 1.0
    s1, s2 = sd(1), sd(2)
    return [t for _, t in sorted((math.hypot((r - r0) / s1, (d - d0) / s2), t) for t, r, d in kandidat)[:k]]


def pendorong_bulan(pend, m, tahun):
    """[(tahun, roni, dmi)] untuk bulan m (1..12) pada tahun-tahun yang ada."""
    p = pend.get(MUSIM[m - 1], {})
    return [(y, p[str(y)][0], p[str(y)][1]) for y in tahun if str(y) in p]


def uji_balik(f, pend, k=K):
    """Leave-one-out per tahun; -> {skill, n, bulan_positif}. f = indeks(...)."""
    th = sorted(f)
    sse_a = sse_c = 0.0
    pos = 0
    for m in range(1, 13):
        sa = sc = 0.0
        kand_semua = pendorong_bulan(pend, m, th)
        if len(kand_semua) < len(th):
            continue
        for y in th:
            lain = [t for t in th if t != y]
            r0, d0 = next((r, d) for t, r, d in kand_semua if t == y)
            ana = terdekat([x for x in kand_semua if x[0] != y], r0, d0, k)
            ea = sum(f[t][m - 1] for t in ana) / len(ana)
            ec = sum(f[t][m - 1] for t in lain) / len(lain)
            sa += (f[y][m - 1] - ea) ** 2
            sc += (f[y][m - 1] - ec) ** 2
        sse_a += sa
        sse_c += sc
        pos += sa < sc
    return {"skill": round(1 - sse_a / sse_c, 3) if sse_c > 0 else 0.0, "n_tahun": len(th), "bulan_skill_positif": pos}


def tabel_bahaya(kunci, nama, f, pend, target, bulan_depan, label_dasar):
    """Satu baris tabel. target = {(tahun,bulan): (roni,dmi)}."""
    th = sorted(f)
    ub = uji_balik(f, pend)
    pakai = ub["skill"] > SKILL_MIN
    bl = []
    for (y, m) in bulan_depan:
        r0, d0 = target[(y, m)]
        ana = terdekat(pendorong_bulan(pend, m, th), r0, d0)
        e_all = sum(f[t][m - 1] for t in th) / len(th)
        e_ana = sum(f[t][m - 1] for t in ana) / len(ana) if ana else e_all
        e = e_ana if pakai else e_all
        bl.append({"b": f"{y}-{m:02d}", "tingkat": tingkat(e), "E": round(e, 2), "E_semua": round(e_all, 2),
                   "E_analog": round(e_ana, 2), "rasio": round(e_ana / e_all, 2) if e_all > 0 else None, "tahun": ana})
    return {"bahaya": kunci, "nama": nama, "dasar": "analog" if pakai else "klimatologi", "sumber": label_dasar, "uji_balik": ub,
            "tahun_data": [th[0], th[-1]], "bulan": bl}


# ---------------------------------------------------------------- berantai
def peristiwa(rows, gempa_rows, prov_nama):
    """-> {(jenis, prov): {tgl: [meninggal, set(kab)]}}; jenis tunggal (baris 'banjir+longsor' dipecah)."""
    ev = {}
    for j, p, n, t, nk, mt in rows:
        for jn in j.split("+"):
            if jn == "bandang":
                continue  # bandang ikut dicatat DIBI sebagai banjir/longsor; pasangannya terlalu tipis bila dipisah
            e = ev.setdefault((jn, p), {}).setdefault(t, [0, set()])
            e[0] += mt or 0
            e[1].add(n)
    for tgl, p in gempa_rows:
        ev.setdefault(("gempa", p), {}).setdefault(tgl, [0, {prov_nama.get(p, p)}])
    return ev


def berantai(ev, prov_nama, hari=JENDELA_HARI, min_hit=8, atas=6):
    """Pasangan A->B: B terjadi 1..hari hari setelah hari A di provinsi yang sama."""
    jenis = sorted({j for j, _ in ev})
    tg = {k: sorted(dt.date.fromisoformat(t) for t in v) for k, v in ev.items()}
    semua = [d for v in tg.values() for d in v]
    awal, akhir = min(semua), max(semua)
    # hari terakhir yang boleh dinilai: B butuh jendela penuh setelah A
    batas = akhir - dt.timedelta(days=hari)
    span = (batas - awal).days + 1
    provs = sorted({p for _, p in ev})
    hasil = []
    for a in jenis:
        for b in jenis:
            if a == b:
                continue
            n = hit = 0
            korban = 0
            base_num = 0.0
            terbaik = None
            for p in provs:
                da = [d for d in tg.get((a, p), []) if d <= batas]
                if not da:
                    continue
                db = tg.get((b, p), [])
                # peluang acak: pecahan hari di [awal,batas] yang punya B dalam 1..hari hari berikutnya
                tutup = 0
                prev_end = awal - dt.timedelta(days=1)
                for x in db:
                    s = max(x - dt.timedelta(days=hari), awal)
                    e = min(x - dt.timedelta(days=1), batas)
                    if e < s:
                        continue
                    s = max(s, prev_end + dt.timedelta(days=1))
                    if e >= s:
                        tutup += (e - s).days + 1
                        prev_end = e
                base_num += len(da) * tutup / span
                for x in da:
                    n += 1
                    i = bisect.bisect_right(db, x)
                    sampai = x + dt.timedelta(days=hari)
                    cocok = [y for y in db[i:] if y <= sampai]
                    if cocok:
                        hit += 1
                        ka = ev[(a, p)][x.isoformat()][0]
                        kb = sum(ev[(b, p)][y.isoformat()][0] for y in cocok)
                        korban += ka + kb
                        if terbaik is None or ka + kb > terbaik[0]:
                            terbaik = (ka + kb, p, x, cocok, ka, kb)
            if n < 20 or hit < min_hit:
                continue
            base = base_num / n
            lift = (hit / n) / base if base > 0 else None
            if lift is None or lift < 1.0:
                continue
            kb_, p, x, cocok, ka, kb = terbaik
            kab_a = sorted(ev[(a, p)][x.isoformat()][1])[:3]
            kab_b = sorted(set().union(*[ev[(b, p)][y.isoformat()][1] for y in cocok]))[:3]
            hasil.append({"a": a, "b": b, "n_a": n, "n_lalu_b": hit, "frac": round(hit / n, 3), "peluang_acak": round(base, 3),
                          "lift": round(lift, 2), "korban_total": korban, "skor": korban, "n_hari": span,
                          "preseden": {"prov": prov_nama.get(p, p), "tanggal_a": x.isoformat(), "kab_a": kab_a, "meninggal_a": ka,
                                       "tanggal_b": [y.isoformat() for y in cocok][:3], "kab_b": kab_b, "meninggal_b": kb,
                                       "sumber": "DIBI BNPB (dibi.bnpb.go.id) via kejadian.json" if a != "gempa" else "USGS (gempa) + DIBI BNPB (susulan)"}})
    hasil.sort(key=lambda r: (-r["skor"], -r["n_lalu_b"]))
    return hasil[:atas]


def jendela_pasang(bulan_depan):
    d = baca(PASANG)
    if not d or "pasang_tinggi" not in d:
        return None
    out = {f"{y}-{m:02d}": [] for y, m in bulan_depan}
    for profil, v in d["pasang_tinggi"].items():
        for w in v["jendela"]:
            b = w["puncak"][:7]
            if b in out:
                out[b].append({"profil": profil, "awal": w["awal"], "akhir": w["akhir"], "puncak": w["puncak"], "indeks": w["nilai"], "ambang": v["ambang"]})
    return {"sumber": "public/banjir/data/pasang_astro.json (" + d.get("jenis", "") + ")", "per_bulan": out}


def klimatologi_riwayat(jenis, bulan_depan):
    """Cadangan: profil bulanan nasional dari riwayat.json musim (agregat DIBI 2008-2025), tanpa tahun pembanding."""
    d = (baca(RIWAYAT) or {}).get("musim", {}).get(jenis)
    if not d:
        return None
    bln = [0.0] * 12
    for p in d.values():
        for i, v in enumerate(p["rata"]):
            bln[min(i // 3, 11)] += v
    rata = sum(bln) / 12
    if rata <= 0:
        return None
    bl = [{"b": f"{y}-{m:02d}", "tingkat": tingkat(bln[m - 1] / rata), "E": round(bln[m - 1] / rata, 2), "E_semua": round(bln[m - 1] / rata, 2),
           "E_analog": None, "rasio": None, "tahun": []} for y, m in bulan_depan]
    return {"bahaya": jenis, "nama": NAMA[jenis], "dasar": "klimatologi", "sumber": "riwayat.json musim (DIBI BNPB 2008-2025, rerata kejadian per dasarian, jumlah provinsi)",
            "uji_balik": None, "tahun_data": [2008, 2025], "bulan": bl}


def bulan_berikut(n=12):
    t = dt.date.today()
    i = t.year * 12 + t.month  # bulan depan (indeks 0-basis = t.month)
    return [((i + k) // 12, (i + k) % 12 + 1) for k in range(n)]


def bangun():
    ik = baca(IKLIM)
    if not ik:
        sys.exit("outlook12: public/data/iklim_outlook.json belum ada; jalankan scripts/umum/iklim_outlook.py dulu")
    pend = ik["pendorong_riwayat"]
    bd = bulan_berikut()
    target = {}
    for p in ik["prakiraan"]:
        y, m = int(p["bulan_tengah"][:4]), int(p["bulan_tengah"][5:])
        target[(y, m)] = (p["pendorong"]["roni"], p["pendorong"]["dmi"])
    assert all(b in target for b in bd), f"iklim_outlook.json tak mencakup {bd[-1]}: jalankan ulang iklim_outlook.py"
    wil = _muat("wilayah_outlook", "scripts/data/wilayah.py")
    rows, label, penuh = muat_kejadian()
    dasar = {"kejadian_hidrometeorologi": label, "tahun_pembanding_tersedia": penuh}
    tab = []
    for j in ("banjir", "longsor", "cuaca", "kering", "gelombang", "rob"):
        s = deret_bulanan(rows, j) if penuh else None
        if s:
            tab.append(tabel_bahaya(j, NAMA[j], indeks(s, True), pend, target, bd, label))
        else:
            c = klimatologi_riwayat(j, bd) if j in ("banjir", "longsor") else None
            if c:
                tab.append(c)
            else:
                dasar.setdefault("dilewati", []).append(f"{j}: tanpa deret bulanan 2008-kini (DIBI tak terjangkau, cache belum ada)")
    kh = deret_karhutla()
    if kh:
        tab.append(tabel_bahaya("karhutla", NAMA["karhutla"], indeks(kh, False), pend, target, bd,
                                f"NASA FIRMS MODIS {min(kh)}-{max(kh)}, jumlah titik panas nasional per bulan (public/data/sejarah_modis.json)"))
    g = laju_gempa()
    if g:
        tab.append({"bahaya": "gempa", "nama": NAMA["gempa"], "dasar": "laju_tetap", "sumber": "USGS FDSN, public/gempa/data/riwayat_m5.json",
                    "uji_balik": None, "tahun_data": g["tahun"],
                    "laju": {"m6_per_bulan": round(g["per_bulan_m6"], 3), "m7_per_bulan": round(g["per_bulan_m7"], 3), "n_m6": g["n_m6"], "n_m7": g["n_m7"]},
                    "bulan": [{"b": f"{y}-{m:02d}", "tingkat": "tetap", "peluang_m6": round(1 - math.exp(-g["per_bulan_m6"]), 2),
                               "peluang_m7": round(1 - math.exp(-g["per_bulan_m7"]), 3)} for y, m in bd]})
    else:
        dasar.setdefault("dilewati", []).append("gempa: riwayat_m5.json tak terbaca")
    ps = jendela_pasang(bd)
    if ps is None:
        dasar.setdefault("dilewati", []).append("pasang tertinggi: pasang_astro.json belum ada")
    # berantai: hidrometeorologi dari kejadian + gempa M>=6 dangkal 1990-kini (batasi ke rentang kejadian DIBI)
    gm = baca(GEMPA) or {"baris": []}
    awal_dibi = min((r[3] for r in rows), default="9999")
    gempa_rows = [(w[:10], pv) for w, la, lo, dalam, m, pv in gm["baris"] if m >= 6.0 and dalam <= 70 and w[:10] >= awal_dibi and pv]
    ev = peristiwa(rows, gempa_rows, wil.PROVINSI)
    ber = berantai(ev, wil.PROVINSI) if ev else []
    uj = {k["bahaya"]: k["uji_balik"] for k in tab if k.get("uji_balik")}
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"), "versi": "outlook12/1",
           "keadaan": ik["keadaan_sekarang"], "pendorong_sumber": "public/data/iklim_outlook.json (persistensi nilai terakhir)",
           "bulan": [f"{y}-{m:02d}" for y, m in bd], "dasar": dasar,
           "definisi_tingkat": {"indeks": "E = kejadian bulan itu / rerata bulanan bahaya itu (1,0 = bulan rerata); dinormalkan tren 5 tahun untuk DIBI",
                                "batas": {"tidak ada": "E<0,1", "rendah": "0,1<=E<0,7", "sedang": "0,7<=E<1,3", "parah": "1,3<=E<2,0", "ekstrem": "E>=2,0"},
                                "analog_dipakai_bila": f"skill leave-one-out > {SKILL_MIN} dibanding klimatologi; selain itu klimatologi",
                                "catatan": "relatif terhadap pola bahaya itu sendiri; bukan perbandingan keparahan antarbahaya"},
           "tabel": tab, "pasang_tertinggi": ps,
           "berantai": {"aturan": f"A di provinsi p, lalu B di p dalam 1-{JENDELA_HARI} hari; skor = jumlah kejadian x rata-rata korban meninggal; lift = frekuensi teramati / peluang B acak 30 hari di provinsi itu",
                        "jumlah_hari_data": ber[0]["n_hari"] if ber else 0, "pasangan": ber},
           "uji_balik": uj,
           "batasan": [
               "Pendorong 12 bulan ke depan = persistensi nilai terakhir (lihat iklim_outlook.json); bila El Nino/IOD berubah, tahun pembanding berubah.",
               "Tahun pembanding hanya 5 tahun dari 18 (DIBI 2008-2025) atau 24 (MODIS 2002-2025): satu tahun luar biasa menggeser angka. Uji balik leave-one-out menentukan apakah analog dipakai.",
               "DIBI hanya mencatat kejadian yang dilaporkan dan per kabupaten (satu kejadian lintas kabupaten bisa terhitung berkali-kali); indeks dinormalkan tren, bukan koreksi bias pelaporan.",
               "Gempa tidak diprakirakan; angka adalah laju historis M>=6 dangkal 1990-2025 dalam wilayah katalog Indonesia, dianggap tetap sepanjang tahun.",
               "Gunung api tidak masuk: repo belum punya riwayat erupsi bulanan.",
               "Pasang tertinggi adalah indeks gaya astronomis, bukan tinggi air dan bukan prakiraan rob.",
               "Berantai = kebersamaan statistik dalam 30 hari di provinsi yang sama, bukan sebab-akibat; lift mendekati 1 berarti hampir sama dengan kebetulan. Korban hanya meninggal dari DIBI; gempa tanpa korban di sini."]}
    if dasar.get("tahun_pembanding_tersedia") is False:
        out["batasan"].insert(0, "DIBI 2008-kini tidak terjangkau saat dibuat: banjir/longsor memakai klimatologi riwayat.json tanpa tahun pembanding; cuaca, kekeringan, gelombang, rob tidak ada tabel. Berantai memakai 3 tahun terakhir saja.")
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR + ".tmp", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    print(f"outlook12.json {os.path.getsize(KELUAR) / 1e3:.0f} KB | {len(tab)} bahaya x {len(bd)} bulan | berantai {len(ber)} | {label}")
    for k in tab:
        print(f"  {k['bahaya']:9s} {k['dasar']:11s} uji {k.get('uji_balik')} | " + " ".join(b["tingkat"][:3] for b in k["bulan"]))
    return out


# ---------------------------------------------------------------- uji
def uji():
    assert tingkat(0.0) == "tidak ada" and tingkat(0.5) == "rendah" and tingkat(1.0) == "sedang" and tingkat(1.5) == "parah" and tingkat(2.0) == "ekstrem"
    # indeks: tren 5 tahun menormalkan kenaikan pelaporan
    seri = {y: [10.0 * (1 + 0.5 * (y - 2000))] * 12 for y in range(2000, 2012)}
    f = indeks(seri, True)
    assert all(abs(v - 1) < 1e-9 for y in range(2002, 2010) for v in f[y]), f[2005]  # tepi deret memakai jendela terpotong
    f2 = indeks({2000: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 2001: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}, False)
    assert abs(f2[2000][0] - 18) < 1e-9 and abs(f2[2001][0] - 6) < 1e-9
    # tahun pembanding terdekat + uji balik: bahaya yang MEMANG ikut RONI harus lulus skill, derau tidak
    import random
    rnd = random.Random(3)
    th = list(range(2000, 2026))
    pend = {ms: {str(y): [rnd.uniform(-2, 2), rnd.uniform(-1, 1)] for y in th} for ms in MUSIM}
    sinyal = {y: [max(0.0, 1.0 + 0.6 * pend[MUSIM[m]][str(y)][0] + rnd.gauss(0, 0.05)) * 10 for m in range(12)] for y in th}
    derau = {y: [rnd.uniform(5, 15) for _ in range(12)] for y in th}
    u1 = uji_balik(indeks(sinyal, False), pend)
    u2 = uji_balik(indeks(derau, False), pend)
    assert u1["skill"] > 0.3, u1
    assert u2["skill"] < SKILL_MIN, u2
    tt = tabel_bahaya("x", "X", indeks(sinyal, False), pend, {(2026, 1): (2.0, 0.0), (2026, 2): (-2.0, 0.0)}, [(2026, 1), (2026, 2)], "uji")
    assert tt["dasar"] == "analog" and tt["bulan"][0]["E"] > tt["bulan"][1]["E"] and tt["bulan"][0]["rasio"] > 1
    assert tabel_bahaya("x", "X", indeks(derau, False), pend, {(2026, 1): (2.0, 0.0)}, [(2026, 1)], "uji")["dasar"] == "klimatologi"
    # berantai: B selalu 5 hari setelah A di prov "11"; di prov "12" B acak jarang -> lift tinggi, preseden = A terbesar
    rows = []
    d0 = dt.date(2020, 1, 1)
    for i in range(40):
        a = d0 + dt.timedelta(days=i * 60)
        rows.append(["banjir", "11", "Kab A", a.isoformat(), 1, i % 5])
        rows.append(["longsor", "11", "Kab B", (a + dt.timedelta(days=5)).isoformat(), 1, 2])
    ev = peristiwa(rows, [], {"11": "Aceh"})
    br = berantai(ev, {"11": "Aceh"}, min_hit=5)
    ab = next(r for r in br if r["a"] == "banjir" and r["b"] == "longsor")
    assert ab["n_lalu_b"] == ab["n_a"] - 0 or ab["n_lalu_b"] >= 38, ab
    assert ab["lift"] > 1.8 and ab["preseden"]["meninggal_a"] == 4 and ab["preseden"]["prov"] == "Aceh"
    # B lebih dulu dari A (longsor lalu banjir) tidak boleh terhitung searah
    ba = [r for r in br if r["a"] == "longsor" and r["b"] == "banjir"]
    assert not ba or ba[0]["n_lalu_b"] < 3 or ba[0]["lift"] < ab["lift"]
    # baris 'banjir+longsor' tidak berpasangan dengan dirinya sendiri (hari sama)
    ev2 = peristiwa([["banjir+longsor", "11", "K", "2020-01-01", 1, 0]], [], {})
    assert set(j for j, _ in ev2) == {"banjir", "longsor"}
    assert bulan_berikut()[0] > (dt.date.today().year, dt.date.today().month)
    print("outlook12 uji: lulus")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        uji()
        bangun()
