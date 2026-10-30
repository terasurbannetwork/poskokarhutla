"""Verifikasi prakiraan Open-Meteo terhadap SYNOP stasiun BMKG (OGIMET) + MOS per stasiun
-> public/banjir/data/cuaca_synop_arsip.json (pasangan obs-prakiraan, bergulir) dan cuaca_verif_synop.json (metrik)

Sumber observasi: OGIMET getsynop (https://www.ogimet.com/cgi-bin/getsynop), blok WMO 96 dan 97 (Indonesia), laporan AAXX.
  Satu permintaan = 12 hari satu blok, jeda >= 20 dtk antarpermintaan (OGIMET membatasi keras; ~1,3 MB dan ~90 dtk per 12 hari).
  Syarat OGIMET: data milik layanan meteorologi nasional (BMKG), dipakai non-komersial dengan menyebut sumber; jangan membombardir server.
  Koordinat stasiun: NOAA ISD isd-history.csv (WMO = USAF).
Sumber prakiraan: Open-Meteo Previous Runs (lead 1 hari): precipitation_previous_day1, temperature_2m_previous_day1, zona UTC.
Hujan  : SYNOP grup 6RRRtR dengan tR=4 (24 jam) pada 00 UTC = jumlah jam berakhir 01..24 UTC hari sebelumnya..hari itu (07 WIB ke 07 WIB).
         RRR 990 = jejak (0), 991-999 = 0,1-0,9 mm; iR=3 (dihilangkan, tak ada hujan) = 0; iR=4 (tak tersedia) = tidak dinilai.
Suhu   : grup 1snTTT pada 00/06/12/18 UTC, dibanding temperature_2m_previous_day1 jam yang sama.
Pembagian waktu: 70% tanggal pertama = latih, 30% terakhir = uji (tanpa bocor). Ambang kejadian 20 mm/24 jam.
MOS hujan: per stasiun, ambang prakiraan theta_s (dari kisi) yang memaksimalkan CSI di data LATIH; stasiun dengan < 5 kejadian latih memakai theta gabungan.
MOS suhu : per stasiun per jam, bias = rata-rata(obs - prakiraan) data latih (>= 20 pasangan).
Pembanding naif: persistensi (alarm bila hujan 24 jam kemarin >= 20 mm). Selang kepercayaan: bootstrap per tanggal uji (500 ulangan, benih tetap).
Vonis hujan LOLOS bila CSI-MOS uji > CSI-mentah DAN > CSI pembanding naif terbaik (persistensi atau selalu-alarm, yang terakhir menahan MOS yang menang dengan alarm berlebihan), kejadian uji >= 30 dan batas bawah 95% selisih (MOS-mentah) > 0; selain itu GAGAL.
Vonis suhu LOLOS bila MAE terkoreksi < MAE mentah di uji dan batas atas 95% selisih MAE < 0.
Pakai: python3 scripts/cuaca/synop.py [--isi HARI]   |   python3 scripts/cuaca/synop.py uji
"""
import csv, datetime as dt, io, os, random, subprocess, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, ambil, baca, simpan
from verifikasi import skor

AMBANG = 20.0
JAM = (0, 6, 12, 18)
BLOK = ("96", "97")
KISI_THETA = (1, 2, 3, 5, 7, 10, 12, 15, 18, 20, 25, 30)
MAKS_HARI = 300
N_MIN_KEJADIAN = 30
ARSIP = os.path.join(KELUAR, "cuaca_synop_arsip.json")
HASIL = os.path.join(KELUAR, "cuaca_verif_synop.json")
ATRIBUSI = "Observasi SYNOP stasiun BMKG via OGIMET (ogimet.com); koordinat NOAA ISD; prakiraan Open-Meteo Previous Runs. Verifikasi dan MOS: Centurisk97."
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"


# ---------- pengurai SYNOP (murni) ----------
def _suhu(g):
    if len(g) != 5 or g[0] != "1" or "/" in g[1:] or not g[1:].isdigit():
        return None
    return (-1 if g[1] == "1" else 1) * int(g[2:]) / 10


def _hujan(g):
    if len(g) != 5 or g[0] != "6" or not g[1:].isdigit():
        return None
    rrr, tr = int(g[1:4]), int(g[4])
    return (0.0 if rrr == 990 else (rrr - 990) / 10 if rrr > 990 else float(rrr)), tr


def urai(baris):
    """Satu baris getsynop -> (wmo, 'YYYY-MM-DD', jam, suhu|None, hujan24|None) atau None. Hanya menit 00."""
    p = baris.strip().rstrip("=").split(",", 6)
    if len(p) < 7 or p[5] != "00":
        return None
    try:
        wmo, tgl, jam = p[0], f"{int(p[1]):04d}-{int(p[2]):02d}-{int(p[3]):02d}", int(p[4])
    except ValueError:
        return None
    tk = p[6].replace("=", " ").split()
    if len(tk) < 5 or tk[0] != "AAXX" or tk[2] != wmo or len(tk[3]) != 5:
        return None
    iR = tk[3][0]
    s1, s3 = [], []
    bag = s1
    for t in tk[5:]:
        if t == "333":
            bag = s3
        elif t in ("444", "555"):
            break
        else:
            bag.append(t)
    suhu = _suhu(s1[0]) if s1 else None
    hujan = None
    if jam == 0:
        if iR == "3":
            hujan = 0.0
        elif iR in "01":
            hujan = next((h[0] for h in (_hujan(g) for g in s1) if h and h[1] == 4), None)
        if hujan is None and iR in "02":
            hujan = next((h[0] for h in (_hujan(g) for g in s3) if h and h[1] == 4), None)
    return wmo, tgl, jam, suhu, hujan


def kumpul(teks):
    """Teks getsynop -> {wmo: {tanggal: {'p': mm24|None, 't': {jam: C}}}} (jam terdekat menit 00 saja)."""
    out = {}
    for b in teks.splitlines():
        r = urai(b)
        if not r:
            continue
        wmo, tgl, jam, suhu, hujan = r
        d = out.setdefault(wmo, {}).setdefault(tgl, {"p": None, "t": {}})
        if hujan is not None:
            d["p"] = hujan
        if suhu is not None and jam in JAM:
            d["t"][jam] = suhu
    return out


# ---------- unduhan ----------
def coba(fn, n=4, dasar=15):
    """Ulangi fn() sampai n kali dengan jeda dasar*2^i dtk; galat terakhir dilempar."""
    for i in range(n):
        try:
            return fn()
        except Exception as e:
            if i == n - 1:
                raise
            print(f"  ulang {i + 1}/{n - 1} ({type(e).__name__}): tunggu {dasar * 2 ** i} dtk", file=sys.stderr)
            time.sleep(dasar * 2 ** i)


def unduh_ogimet(mulai, akhir, jeda=20, tahan=None):
    """Bagi mulai..akhir per 12 hari per blok; gagal satu pecahan = dilewati (dicatat), bukan menjatuhkan semua."""
    def _curl(url):
        r = subprocess.run(["curl", "-sS", "-m", "240", "-A", UA, url], capture_output=True, timeout=260)
        if r.returncode:
            raise RuntimeError(r.stderr.decode()[:100])
        return r.stdout.decode("utf-8", "replace")
    tahan = tahan or (lambda url: coba(lambda: _curl(url)))
    out, galat = {}, []
    d0, d1 = dt.date.fromisoformat(mulai), dt.date.fromisoformat(akhir)
    while d0 <= d1:
        d2 = min(d0 + dt.timedelta(days=11), d1)
        for b in BLOK:
            url = f"https://www.ogimet.com/cgi-bin/getsynop?begin={d0:%Y%m%d}0000&end={d2:%Y%m%d}2359&block={b}"
            try:
                teks = tahan(url)
            except Exception as e:
                teks = f"GALAT {type(e).__name__}: {e}"
            if teks.count("AAXX") < 20:   # balasan batas laju / kosong
                galat.append(f"{b}:{d0}..{d2}:{teks[:80]!r}")
            else:
                for w, tg in kumpul(teks).items():
                    out.setdefault(w, {}).update(tg)
            time.sleep(jeda)
        d0 = d2 + dt.timedelta(days=1)
    return out, galat


def koordinat(wmo_set):
    """NOAA ISD isd-history.csv -> {wmo: (nama, lat, lon)} untuk stasiun Indonesia; entri paling baru menang."""
    req = urllib.request.Request("https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv", headers={"User-Agent": UA})
    isi = coba(lambda: urllib.request.urlopen(req, timeout=120).read()).decode("utf-8", "replace")
    best = {}
    for r in csv.DictReader(io.StringIO(isi)):
        w = r["USAF"][:5]
        if r["CTRY"] == "ID" and w in wmo_set and r["LAT"] and r["LON"]:
            try:
                lat, lon = float(r["LAT"]), float(r["LON"])
            except ValueError:
                continue
            if w not in best or r["END"] > best[w][3]:
                best[w] = (r["STATION NAME"].title(), lat, lon, r["END"])
    return {w: v[:3] for w, v in best.items()}


def unduh_prakiraan(stasiun, mulai, akhir, per_panggil=20, ambil_fn=None):
    """-> {wmo: {tanggal: {'p': mm24 | None, 't': {jam: C}}}} prakiraan lead 1 hari, pada kerangka waktu SYNOP (24 jam berakhir 00 UTC)."""
    ambil_fn = ambil_fn or ambil
    out = {}
    ids = sorted(stasiun)
    d0, d1 = dt.date.fromisoformat(mulai) - dt.timedelta(days=1), dt.date.fromisoformat(akhir)
    while d0 <= d1:
        d2 = min(d0 + dt.timedelta(days=92), d1)
        for a in range(0, len(ids), per_panggil):
            b = ids[a:a + per_panggil]
            q = {"latitude": ",".join(f"{stasiun[w]['lat']:.3f}" for w in b), "longitude": ",".join(f"{stasiun[w]['lon']:.3f}" for w in b),
                 "hourly": "precipitation_previous_day1,temperature_2m_previous_day1", "start_date": d0.isoformat(), "end_date": d2.isoformat(), "timezone": "GMT"}
            r = coba(lambda: ambil_fn("https://previous-runs-api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(q, safe=",")))
            r = r if isinstance(r, list) else [r]
            for w, x in zip(b, r):
                out.setdefault(w, {}).update(deret_prakiraan(x["hourly"]))
        d0 = d2 + dt.timedelta(days=1)
    return out


def deret_prakiraan(h):
    """hourly (time GMT, jam berakhir) -> {tanggal: {'p': jumlah jam 01..24 UTC yang berakhir 00 UTC tanggal itu, 't': {jam: C}}}."""
    t, p, s = h["time"], h["precipitation_previous_day1"], h["temperature_2m_previous_day1"]
    ix = {w: i for i, w in enumerate(t)}
    out = {}
    for w in t:
        if w[11:13] != "00":
            continue
        i = ix[w]
        d = {"p": None, "t": {}}
        if i >= 23 and all(p[k] is not None for k in range(i - 23, i + 1)):
            d["p"] = round(sum(p[i - 23:i + 1]), 2)
        for jam in JAM:
            k = ix.get(w[:11] + f"{jam:02d}:00")
            if k is not None and s[k] is not None:
                d["t"][jam] = s[k]
        out[w[:10]] = d
    return out


# ---------- arsip ----------
def gabung(arsip, meta, obs, fc):
    """Tambah pasangan ke arsip: stasiun[wmo]['h'][tgl] = [p_obs, p_fc, t0o, t0f, t6o, t6f, t12o, t12f, t18o, t18f]."""
    for w, tg in obs.items():
        if w not in meta or w not in fc:
            continue
        s = arsip["stasiun"].setdefault(w, {"nama": meta[w][0], "lat": meta[w][1], "lon": meta[w][2], "h": {}})
        for d, o in tg.items():
            f = fc[w].get(d)
            if not f:
                continue
            baris = [o["p"], f["p"]]
            for j in JAM:
                baris += [o["t"].get(j), f["t"].get(j)]
            if any(v is not None for v in baris):
                s["h"][d] = baris
    semua = sorted({d for s in arsip["stasiun"].values() for d in s["h"]})
    for d in semua[:-MAKS_HARI]:
        for s in arsip["stasiun"].values():
            s["h"].pop(d, None)
    return arsip


# ---------- metrik (murni) ----------
def pasangan_hujan(arsip):
    """-> daftar (tanggal, wmo, obs, fc, obs_kemarin|None) hanya bila obs dan fc ada."""
    out = []
    for w, s in arsip["stasiun"].items():
        for d, b in s["h"].items():
            if b[0] is not None and b[1] is not None:
                kem = (dt.date.fromisoformat(d) - dt.timedelta(days=1)).isoformat()
                out.append((d, w, b[0], b[1], (s["h"].get(kem) or [None])[0]))
    return sorted(out)


def belah(tanggal, bagian=0.7):
    t = sorted(set(tanggal))
    return t[int(len(t) * bagian) - 1] if len(t) >= 2 else t[0]   # tanggal terakhir data latih


def tabel(pas, alarm):
    a = sum(1 for p in pas if alarm(p) and p[2] >= AMBANG)
    b = sum(1 for p in pas if alarm(p) and p[2] < AMBANG)
    c = sum(1 for p in pas if not alarm(p) and p[2] >= AMBANG)
    return a, b, c


def csi(a, b, c):
    return a / (a + b + c) if a + b + c else 0.0


def pilih_theta(latih):
    """latih: pasangan satu stasiun -> theta (dari kisi) terbaik CSI; dipakai juga untuk gabungan."""
    best, bt = -1, AMBANG
    for th in KISI_THETA:
        v = csi(*tabel(latih, lambda p, th=th: p[3] >= th))
        if v > best + 1e-12:
            best, bt = v, th
    return bt


def latih_theta(latih):
    """-> (theta_gabungan, {wmo: theta})."""
    gab = pilih_theta(latih)
    per = {}
    for w in {p[1] for p in latih}:
        x = [p for p in latih if p[1] == w]
        per[w] = pilih_theta(x) if sum(1 for p in x if p[2] >= AMBANG) >= 5 else gab
    return gab, per


def bootstrap_selisih(uji, f1, f2, n=500, benih=7):
    """Selang 95% CSI(f1) - CSI(f2) dengan resampel TANGGAL uji."""
    per = {}
    for p in uji:
        per.setdefault(p[0], []).append(p)
    tg = sorted(per)
    rng = random.Random(benih)
    sel = []
    for _ in range(n):
        s = [p for d in (rng.choice(tg) for _ in tg) for p in per[d]]
        sel.append(csi(*tabel(s, f1)) - csi(*tabel(s, f2)))
    sel.sort()
    return round(sel[int(.025 * n)], 3), round(sel[int(.975 * n) - 1], 3)


def verifikasi_hujan(pas):
    if len(pas) < 50:
        return None
    sp = belah([p[0] for p in pas])
    latih, uji = [p for p in pas if p[0] <= sp], [p for p in pas if p[0] > sp]
    gab, per = latih_theta(latih)
    mentah = lambda p: p[3] >= AMBANG
    mos = lambda p: p[3] >= per.get(p[1], gab)
    pers = lambda p: (p[4] or 0) >= AMBANG
    up = [p for p in uji if p[4] is not None]
    n_k = sum(1 for p in uji if p[2] >= AMBANG)
    lo, hi = bootstrap_selisih(uji, mos, mentah)
    r = {"split_tanggal_latih_terakhir": sp, "n_latih": len(latih), "n_uji": len(uji), "kejadian_latih": sum(1 for p in latih if p[2] >= AMBANG), "kejadian_uji": n_k,
         "theta_gabungan_mm": gab, "mentah": skor(*tabel(uji, mentah)), "mos": skor(*tabel(uji, mos)),
         "persistensi": {**skor(*tabel(up, pers)), "n_uji": len(up)}, "selalu_alarm": skor(*tabel(uji, lambda p: True)), "selisih_csi_mos_mentah_ci95": [lo, hi]}
    csm, csr, csp = r["mos"]["csi"] or 0, r["mentah"]["csi"] or 0, max(r["persistensi"]["csi"] or 0, r["selalu_alarm"]["csi"] or 0)
    r["vonis"] = "LOLOS" if (csm > csr and csm > csp and n_k >= N_MIN_KEJADIAN and lo > 0) else "GAGAL"
    r["alasan"] = (f"CSI uji MOS {csm:.3f} vs mentah {csr:.3f} vs pembanding naif terbaik (persistensi / selalu alarm) {csp:.3f}; kejadian uji {n_k} (min {N_MIN_KEJADIAN}); "
                   f"selisih MOS-mentah selang 95% [{lo}, {hi}]")
    sta = []
    for w in sorted({p[1] for p in uji}):
        x = [p for p in uji if p[1] == w]
        k = sum(1 for p in x if p[2] >= AMBANG)
        if k >= 5:
            sta.append({"wmo": w, "n_kejadian": k, "theta": per.get(w, gab), "csi_mentah": round(csi(*tabel(x, mentah)), 3), "csi_mos": round(csi(*tabel(x, mos)), 3)})
    r["stasiun_uji"] = sorted(sta, key=lambda s: -s["n_kejadian"])[:25]
    r["theta"] = per
    return r


def verifikasi_suhu(arsip):
    """Galat = obs - prakiraan per (stasiun, jam). Bias dari latih, MAE uji mentah vs terkoreksi."""
    rows = []   # (tanggal, wmo, jam, obs, fc)
    for w, s in arsip["stasiun"].items():
        for d, b in s["h"].items():
            for i, j in enumerate(JAM):
                o, f = b[2 + 2 * i], b[3 + 2 * i]
                if o is not None and f is not None and -5 < o < 45:
                    rows.append((d, w, j, o, f))
    if len(rows) < 200:
        return None
    sp = belah([r[0] for r in rows])
    latih, uji = [r for r in rows if r[0] <= sp], [r for r in rows if r[0] > sp]
    g = {}
    for d, w, j, o, f in latih:
        g.setdefault((w, j), []).append(o - f)
    bias = {k: sum(v) / len(v) for k, v in g.items() if len(v) >= 20}
    uji = [r for r in uji if (r[1], r[2]) in bias]
    if len(uji) < 100:
        return None
    mae = lambda xs: sum(xs) / len(xs)
    e_m = [abs(r[3] - r[4]) for r in uji]
    e_k = [abs(r[3] - (r[4] + bias[(r[1], r[2])])) for r in uji]
    rng = random.Random(11)
    per = {}
    for r, a, b in zip(uji, e_m, e_k):
        per.setdefault(r[0], []).append(b - a)
    tg, sel = sorted(per), []
    for _ in range(500):
        v = [x for d in (rng.choice(tg) for _ in tg) for x in per[d]]
        sel.append(mae(v))
    sel.sort()
    hi = sel[int(.975 * 500) - 1]
    bj = {}
    for r in uji:
        bj.setdefault(r[2], []).append(r[3] - r[4])
    return {"split_tanggal_latih_terakhir": sp, "n_uji": len(uji), "n_stasiun_jam": len(bias), "mae_mentah_c": round(mae(e_m), 3), "mae_terkoreksi_c": round(mae(e_k), 3),
            "bias_uji_per_jam_utc": {str(j): round(mae(v), 2) for j, v in sorted(bj.items())},
            "selisih_mae_ci95_atas": round(hi, 3), "vonis": "LOLOS" if mae(e_k) < mae(e_m) and hi < 0 else "GAGAL"}


def jalankan(hari=None, ogimet=None, fc_fn=None, koord_fn=None):
    arsip = baca(ARSIP) or {"stasiun": {}}
    akhir = (dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=2)).isoformat()
    semua = sorted({d for s in arsip["stasiun"].values() for d in s["h"]})
    if hari and not semua:
        mulai = (dt.date.fromisoformat(akhir) - dt.timedelta(days=hari)).isoformat()
    else:
        mulai = (dt.date.fromisoformat(semua[-1]) - dt.timedelta(days=3)).isoformat() if semua else (dt.date.fromisoformat(akhir) - dt.timedelta(days=30)).isoformat()
    galat = []
    d0 = dt.date.fromisoformat(mulai)
    while d0 <= dt.date.fromisoformat(akhir):   # potongan 24 hari, arsip disimpan tiap potong: mati di tengah = lanjut dari sana
        d1 = min(d0 + dt.timedelta(days=23), dt.date.fromisoformat(akhir))
        obs, g = (ogimet or unduh_ogimet)(d0.isoformat(), d1.isoformat())
        galat += g
        if obs:
            meta = {w: (s["nama"], s["lat"], s["lon"]) for w, s in arsip["stasiun"].items()}
            baru = set(obs) - set(meta)
            if baru:
                meta.update((koord_fn or koordinat)(baru))
            info = {w: {"lat": meta[w][1], "lon": meta[w][2]} for w in obs if w in meta}
            fc = (fc_fn or unduh_prakiraan)(info, d0.isoformat(), d1.isoformat())
            gabung(arsip, meta, obs, fc)
            simpan(ARSIP, arsip)
        d0 = d1 + dt.timedelta(days=1)
    pas = pasangan_hujan(arsip)
    tg = sorted({d for s in arsip["stasiun"].values() for d in s["h"]})
    hasil = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "atribusi": ATRIBUSI, "lisensi": "OGIMET: data SYNOP milik layanan meteorologi nasional, non-komersial dengan menyebut sumber",
             "ambang_mm": AMBANG, "lead_hari": 1, "periode": [tg[0], tg[-1]] if tg else None, "n_stasiun": len(arsip["stasiun"]), "n_pasangan_hujan": len(pas),
             "hujan": verifikasi_hujan(pas), "suhu": verifikasi_suhu(arsip), "galat_unduh": galat[:10]}
    if hasil["hujan"] is None and hasil["suhu"] is None:
        print("synop: data belum cukup untuk dinilai; berkas lama tidak ditimpa", file=sys.stderr)
        if arsip["stasiun"]:
            simpan(ARSIP, arsip)
        return None
    simpan(ARSIP, arsip)
    simpan(HASIL, hasil)
    return hasil


def main():
    a = sys.argv[1:]
    h = jalankan(hari=int(a[a.index("--isi") + 1]) if "--isi" in a else None)
    if h:
        r, s = h["hujan"], h["suhu"]
        print(f"synop: {h['n_stasiun']} stasiun, {h['n_pasangan_hujan']} pasangan hujan; hujan {r and r['vonis']} ({r and r['alasan']}); suhu {s and s['vonis']}")


def uji():
    # pengurai
    b = "96749,2026,10,28,00,00,AAXX 28004 96749 01530 72202 10264 20244 30115 40126 53011 60054 70596 82521 333 20253 50490 55017 56000 59008 60027 82620 86460="
    assert urai(b) == ("96749", "2026-10-28", 0, 26.4, 5.0), urai(b)
    assert urai(b.replace("10264", "11030"))[3] == -3.0
    assert urai(b.replace("60054", "69994"))[4] == 0.9 and urai(b.replace("60054", "69904"))[4] == 0.0
    assert urai(b.replace("01530", "41530"))[4] is None            # iR=4: tak tersedia
    assert urai(b.replace("01530", "31530").replace("60054 ", ""))[4] == 0.0   # iR=3: tak ada hujan
    assert urai(b.replace("60054", "60053"))[4] is None            # bukan 24 jam
    assert urai(b.replace("00,00,AAXX", "00,30,AAXX")) is None     # bukan menit 00
    assert urai("96749,2026,10,28,06,00,AAXX 28064 96749 01530 72202 10264 20244 60054=")[4] is None   # hujan 24 jam hanya 00 UTC
    # hujan di seksi 3 (iR=2)
    s3 = "96749,2026,10,28,00,00,AAXX 28004 96749 21530 72202 10264 20244 30115 333 20253 60124 70000="
    assert urai(s3)[4] == 12.0, urai(s3)
    k = kumpul(b + "\n" + b.replace("00,00,AAXX", "06,00,AAXX").replace("10264", "10300") + "\nsampah")
    assert k["96749"]["2026-10-28"] == {"p": 5.0, "t": {0: 26.4, 6: 30.0}}
    # deret prakiraan: 48 jam, hari 2 = 24 jam masing 1 mm
    t = [f"2026-10-0{d}T{h:02d}:00" for d in (1, 2) for h in range(24)]
    p = [None] + [1.0] * 47
    r = deret_prakiraan({"time": t, "precipitation_previous_day1": p, "temperature_2m_previous_day1": [20 + h % 24 for h in range(48)]})
    assert r["2026-10-01"]["p"] is None and r["2026-10-02"]["p"] == 24.0 and r["2026-10-02"]["t"][12] == 20 + 36 % 24
    # skor dan pemilihan theta: prakiraan selalu 2x terlalu rendah -> theta mendekati 10
    rng = random.Random(1)
    pas = []
    for i in range(300):
        o = rng.choice([0, 0, 0, 5, 25, 40])
        pas.append((f"2026-01-{1 + i % 30:02d}", "A", o, o / 2 + rng.random(), None))
    assert 5 <= pilih_theta(pas) <= 12, pilih_theta(pas)
    assert tabel([(0, 0, 25, 25, 0), (0, 0, 5, 25, 0), (0, 0, 30, 1, 0)], lambda p: p[3] >= 20) == (1, 1, 1)
    # alur penuh dengan data sintetik: bias prakiraan 0,5x -> MOS harus menang
    arsip = {"stasiun": {}}
    meta = {"A": ("x", 0, 0), "B": ("y", 1, 1)}
    obs, fc = {}, {}
    d0 = dt.date(2026, 1, 1)
    for w in meta:
        for i in range(290):
            d = (d0 + dt.timedelta(days=i)).isoformat()
            o = rng.choice([0, 0, 3, 8, 25, 25, 40, 40])
            tc = 25 + rng.random()
            obs.setdefault(w, {})[d] = {"p": float(o), "t": {0: tc}}
            fc.setdefault(w, {})[d] = {"p": o * 0.5 + rng.random(), "t": {0: tc - 1.5 + rng.random() * .2}}
    gabung(arsip, meta, obs, fc)
    h = verifikasi_hujan(pasangan_hujan(arsip))
    assert h["mos"]["csi"] > h["mentah"]["csi"] and h["vonis"] == "LOLOS", h
    s = verifikasi_suhu(arsip)
    assert s["mae_terkoreksi_c"] < s["mae_mentah_c"] and s["vonis"] == "LOLOS", s
    # tanpa sinyal (prakiraan acak): tidak boleh LOLOS
    arsip2 = {"stasiun": {}}
    for w in meta:
        for i in range(290):
            d = (d0 + dt.timedelta(days=i)).isoformat()
            obs[w][d]["p"] = float(rng.choice([0, 0, 0, 25]))
            fc[w][d]["p"] = rng.random() * 40
    gabung(arsip2, meta, obs, fc)
    assert verifikasi_hujan(pasangan_hujan(arsip2))["vonis"] == "GAGAL"
    print("synop uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
