"""Panen #21: laporan dirasakan EMSC (Seismicportal testimonies) -> residu MMI terhadap GMPE+GMICE kita (guncangan.py).

Sumber : https://www.seismicportal.eu/testimonies-ws/api/search?...&includeTestimonies=true  (ZIP: events.csv + satu CSV per kejadian,
         kolom icorr = intensitas terkoreksi Bossu dkk. 2016). Lisensi CC-BY-4.0 (berkas CC-BY-4.0 di dalam ZIP). Kredit: EMSC/Seismicportal.
         ZIP dibaca sambil mengalir dan dihentikan di entri PDF petunjuk (920 KB tak berguna, x84 bulan).
Residu : per kejadian, per sel 0,1 derajat: median icorr - mmi_perkiraan (hanya sel dengan prediksi >= 2).
Kandidat: raw (tanpa koreksi), global, wilayah, jarak, wilayah+jarak; penyusutan K=15 ke tingkat induk.
Pemisahan: waktu kejadian 60/20/20 (latih/validasi/uji). Uji dibuka SEKALI oleh `hitung`; bootstrap per kejadian (selang 90%).
CATATAN "TIDAK MURNI": icorr sudah dikoreksi memakai hubungan intensitas-jarak EMSC sendiri, pelapor adalah pengguna aplikasi yang
  memilih melapor (bias dekat-pusat dan kota), M/kedalaman dari katalog EMSC (bukan USGS yang dipakai GMPE kita), jenis sumber
  ditebak tebak_jenis, Vs30 baku. Jadi residu bukan "kebenaran dasar" GMPE; ia mengukur selisih GMPE kita vs jaringan laporan EMSC.

Pakai : python3 scripts/gempa/emsc.py ambil [YYYY-MM]   # mengunduh bulanan, melanjutkan; arsip ke data/raw/gempa/emsc
        python3 scripts/gempa/emsc.py hitung            # membangun emsc_residu.json + emsc_arsip.json + membekukan koreksi (sekali)
        python3 scripts/gempa/emsc.py prospektif        # menambah kejadian baru (umur >= 7 hari) ke emsc_prospektif.json, append-only
        python3 scripts/gempa/emsc.py uji
"""
import hashlib, io, json, math, os, random, statistics, struct, sys, time, urllib.parse, urllib.request, zlib
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import umum, guncangan

URL = "https://www.seismicportal.eu/testimonies-ws/api/search"
CACHE = os.path.join(umum.AKAR, "data/raw/gempa/emsc")
OUT = umum.KELUAR
MULAI, SELESAI = (2019, 11), (2026, 10)  # 84 bulan
JEDA = 5.0
K = 15
RES = 0.1
BIN_JARAK = [30, 100, 300]  # km -> 4 kelas
_t = [0.0]


def bulan_daftar(a=MULAI, b=SELESAI):
    y, m = a
    while (y, m) <= b:
        yield y, m
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def bacazip(baca):
    """Hasilkan (nama, isi) dari ZIP yang mengalir; berhenti di entri .pdf. `baca(n)` membaca n byte."""
    while True:
        h = baca(30)
        if len(h) < 30 or h[:4] != b"PK\x03\x04":
            return
        _, _, flag, metode, _, _, _, cs, _, nn, ne = struct.unpack("<IHHHHHIIIHH", h)
        if flag & 8:
            raise RuntimeError("ZIP memakai data descriptor; pembaca alir tak mendukung")
        nama = baca(nn).decode("utf8", "replace")
        baca(ne)
        if nama.lower().endswith(".pdf"):
            return
        isi = baca(cs)
        yield nama, (zlib.decompress(isi, -15) if metode == 8 else isi)


def unduh_bulan(y, m, coba=4):
    y2, m2 = (y + 1, 1) if m == 12 else (y, m + 1)
    q = {"minlat": -12, "maxlat": 7, "minlon": 94, "maxlon": 142, "start": f"{y}-{m:02d}-01", "end": f"{y2}-{m2:02d}-01",
         "includeTestimonies": "true"}
    for i in range(coba):
        w = JEDA - (time.time() - _t[0])
        if w > 0:
            time.sleep(w)
        _t[0] = time.time()
        try:
            req = urllib.request.Request(URL + "?" + urllib.parse.urlencode(q), headers={"User-Agent": umum.UA})
            with urllib.request.urlopen(req, timeout=180) as r:
                return {n: b for n, b in bacazip(r.read)}
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"EMSC {y}-{m:02d}: {e}")
            time.sleep(15 * (i + 1))


def sel(lat, lon):
    return round(math.floor(lat / RES + 1e-9)), round(math.floor(lon / RES + 1e-9))


def olah_bulan(berkas):
    """{nama: bytes} -> daftar kejadian ringkas {id,t,lat,lon,m,d,wil,sel:[[ila,ilo,icorr_median,n],...]}."""
    ev = berkas.get("events.csv", b"").decode("utf8", "replace").splitlines()
    out = []
    for baris in ev[1:]:
        p = baris.split("|")
        if len(p) < 9 or int(p[8] or 0) == 0:
            continue
        uid = p[0]
        isi = berkas.get(uid + ".csv")
        if not isi:
            continue
        per = {}
        for b in isi.decode("utf8", "replace").splitlines():
            if b.startswith("#") or not b.strip():
                continue
            c = b.split(",")
            try:
                per.setdefault(sel(float(c[1]), float(c[0])), []).append(float(c[5]))
            except (ValueError, IndexError):
                continue
        if not per:
            continue
        try:
            lat, lon, mag, dal = float(p[2]), float(p[3]), float(p[5]), float(p[6])
        except ValueError:
            continue
        out.append({"id": uid, "t": p[1].replace(" UTC", "Z"), "lat": lat, "lon": lon, "m": mag, "d": dal, "wil": p[7],
                    "sel": [[a, b, round(statistics.median(v), 1), len(v)] for (a, b), v in sorted(per.items())]})
    return out


def ambil(dari=None):
    os.makedirs(CACHE, exist_ok=True)
    for y, m in bulan_daftar():
        if dari and (y, m) < tuple(int(x) for x in dari.split("-")):
            continue
        j = os.path.join(CACHE, f"{y}-{m:02d}.json")
        # bulan berjalan tidak dianggap final: selalu unduh ulang; bulan lalu final bila berkas ada
        if os.path.exists(j) and (y, m) < (SELESAI[0], SELESAI[1]):
            continue
        ev = olah_bulan(unduh_bulan(y, m))
        umum.simpan(j, ev)
        print(f"{y}-{m:02d}: {len(ev)} kejadian bertestimoni", flush=True)


def muat_semua():
    ev = []
    for y, m in bulan_daftar():
        j = os.path.join(CACHE, f"{y}-{m:02d}.json")
        if os.path.exists(j):
            ev += json.load(open(j))
    return sorted(ev, key=lambda e: e["t"])


# --- residu ---------------------------------------------------------------------------------------------------------------------
def kelas_jarak(km):
    for i, b in enumerate(BIN_JARAK):
        if km < b:
            return i
    return len(BIN_JARAK)


def wilayah(lat, lon):
    t = umum.terdekat(lat, lon, 100)
    return t[0] if t else "LAIN"


def _pred(e, repi, P=guncangan.PARAM):
    d = max(e["d"], 1.0)
    return guncangan.mmi_perkiraan(e["m"], max(repi, 1.0), d, guncangan.tebak_jenis(d, e["m"], e["lat"], e["lon"], P=P), P=P)


def residu_kejadian(e, P=guncangan.PARAM):
    """-> daftar [wilayah, kelas_jarak, residu, prediksi, teramati] per sel dengan prediksi >= 2."""
    out = []
    for a, b, obs, n in e["sel"]:
        la, lo = (a + .5) * RES, (b + .5) * RES
        repi = umum.jarak_km(e["lat"], e["lon"], la, lo)
        pred = _pred(e, repi, P)
        if pred >= 2:
            out.append([wilayah(la, lo), kelas_jarak(repi), obs - pred, pred, obs])
    return out


def susut(n, rerata, induk, k=K):
    """Penyusutan ke induk: (n*rerata + k*induk)/(n+k)."""
    return (n * rerata + k * induk) / (n + k)


def latih_koreksi(baris):
    """baris = [[wil, jarak, residu]...] latih -> tabel koreksi {glob, wil{}, jarak[], wj{'w|j'}} (semua tersusut)."""
    if not baris:
        return {"glob": 0.0, "wil": {}, "jarak": [0.0] * 4, "wj": {}}
    g = statistics.fmean(r[2] for r in baris)
    n = len(baris)
    gs = susut(n, g, 0.0)
    def grup(f):
        d = {}
        for r in baris:
            d.setdefault(f(r), []).append(r[2])
        return d
    wil = {k: susut(len(v), statistics.fmean(v), gs) for k, v in grup(lambda r: r[0]).items()}
    jr = {k: susut(len(v), statistics.fmean(v), gs) for k, v in grup(lambda r: r[1]).items()}
    jarak = [jr.get(i, gs) for i in range(4)]
    wj = {f"{k[0]}|{k[1]}": susut(len(v), statistics.fmean(v), jarak[k[1]]) for k, v in grup(lambda r: (r[0], r[1])).items()}
    return {"glob": gs, "wil": wil, "jarak": jarak, "wj": wj}


def koreksi(tab, kand, wil, jr):
    if kand == "raw":
        return 0.0
    if kand == "global":
        return tab["glob"]
    if kand == "wilayah":
        return tab["wil"].get(wil, tab["glob"])
    if kand == "jarak":
        return tab["jarak"][jr]
    return tab["wj"].get(f"{wil}|{jr}", tab["jarak"][jr])


KANDIDAT = ["raw", "global", "wilayah", "jarak", "wilayah+jarak"]


def rmse(baris, tab, kand):
    """RMSE per sel; baris = [(wil, jarak, residu)]."""
    s = [(r[2] - koreksi(tab, kand, r[0], r[1])) ** 2 for r in baris]
    return math.sqrt(sum(s) / len(s)) if s else float("nan")


def bootstrap_selisih(per_kejadian, tab, kand, putaran=1000, seed=7):
    """Selang 90% selisih RMSE (kand - raw) dengan resampling KEJADIAN (sel dalam satu kejadian berkorelasi)."""
    rnd = random.Random(seed)
    n = len(per_kejadian)
    out = []
    for _ in range(putaran):
        sm = [(0.0, 0.0, 0)]
        a = b = c = 0
        for _ in range(n):
            ev = per_kejadian[rnd.randrange(n)]
            for r in ev:
                a += r[2] ** 2
                b += (r[2] - koreksi(tab, kand, r[0], r[1])) ** 2
                c += 1
        out.append(math.sqrt(b / c) - math.sqrt(a / c))
    out.sort()
    return [out[int(.05 * putaran)], out[int(.95 * putaran) - 1]]


def hitung():
    ev = muat_semua()
    if not ev:
        sys.exit("Belum ada arsip: jalankan `ambil` dulu")
    per = [(e, residu_kejadian(e)) for e in ev]
    per = [(e, r) for e, r in per if r]
    n = len(per)
    i1, i2 = int(n * .6), int(n * .8)
    bagian = {"latih": per[:i1], "validasi": per[i1:i2], "uji": per[i2:]}
    rata = lambda ps: [r for _, rs in ps for r in rs]
    tab = latih_koreksi(rata(bagian["latih"]))
    val = {k: rmse(rata(bagian["validasi"]), tab, k) for k in KANDIDAT}
    pilih = min((k for k in KANDIDAT if k != "raw"), key=lambda k: val[k])
    ujiB = rata(bagian["uji"])
    uji = {k: rmse(ujiB, tab, k) for k in KANDIDAT}  # uji dibuka sekali di sini
    sel_ev = [rs for _, rs in bagian["uji"]]
    ci = bootstrap_selisih(sel_ev, tab, pilih)
    lolos = uji[pilih] < uji["raw"] and ci[1] < 0
    # cacah per wilayah (untuk Metode)
    per_wil = {}
    for r in rata(per):
        per_wil.setdefault(r[0], []).append(r[2])
    sekarang = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    hasil = {
        "versi": 1, "dibuat": sekarang, "jenis": "residu_mmi_emsc",
        "sumber": "EMSC Seismicportal testimonies (CC-BY-4.0), icorr terkoreksi Bossu dkk. 2016; prediksi = guncangan.py mmi_perkiraan",
        "rentang": [ev[0]["t"][:10], ev[-1]["t"][:10]],
        "cacah": {"kejadian": n, "sel": len(rata(per)), **{k: len(v) for k, v in bagian.items()}},
        "pemisahan": "waktu 60/20/20; uji dibuka sekali",
        "kandidat": KANDIDAT, "K_penyusutan": K, "terpilih_validasi": pilih,
        "rmse_validasi": {k: round(v, 4) for k, v in val.items()},
        "kinerja_uji": {"rmse": {k: round(v, 4) for k, v in uji.items()},
                        "selisih_terpilih_vs_raw": round(uji[pilih] - uji["raw"], 4), "selang90_selisih": [round(x, 4) for x in ci],
                        "bootstrap": "per kejadian, 1000 putaran"},
        "bias_latih": {"global": round(tab["glob"], 4), "jarak": [round(x, 4) for x in tab["jarak"]]},
        "bias_wilayah": {k: [round(statistics.fmean(v), 3), len(v)] for k, v in sorted(per_wil.items(), key=lambda kv: -len(kv[1]))[:20]},
        "vonis": "TERBIT" if lolos else "GAGAL",
        "terbit_koreksi": bool(lolos),
        "catatan": ("Koreksi " + ("lolos" if lolos else "TIDAK lolos") + f": RMSE uji {pilih} {uji[pilih]:.3f} vs raw {uji['raw']:.3f}, "
                    f"selang 90% selisih [{ci[0]:.3f}, {ci[1]:.3f}]. "
                    "TIDAK MURNI: icorr sudah dikoreksi EMSC dengan hubungan intensitas-jarak sendiri, pelapor memilih sendiri (bias kota dan dekat pusat), "
                    "M dan kedalaman dari katalog EMSC, jenis sumber ditebak, Vs30 baku. Residu mengukur selisih terhadap jaringan laporan EMSC, bukan kebenaran dasar. "
                    "GMPE tidak dikoreksi di layar kecuali terbit_koreksi true."),
    }
    if lolos:
        hasil["koreksi"] = {"jenis": pilih, "glob": round(tab["glob"], 4), "jarak": [round(x, 4) for x in tab["jarak"]],
                            "wil": {k: round(v, 4) for k, v in tab["wil"].items()},
                            "wj": {k: round(v, 4) for k, v in tab["wj"].items()}}
    umum.simpan(os.path.join(OUT, "emsc_residu.json"), hasil)
    arsip = {"dibuat": sekarang, "res_derajat": RES, "format_sel": "[indeks_lat, indeks_lon, median_icorr, n]; pusat sel = (indeks+0,5)*res",
             "sumber": "EMSC Seismicportal, CC-BY-4.0",
             "kejadian": [{"id": e["id"], "t": e["t"], "lat": e["lat"], "lon": e["lon"], "m": e["m"], "d": e["d"], "sel": e["sel"]} for e, _ in per]}
    j = os.path.join(OUT, "emsc_arsip.json")
    umum.simpan(j, arsip)
    if os.path.getsize(j) > 2_000_000:  # buang sel bersaksi tunggal (n=1) dahulu; bila masih besar, kejadian paling tua
        for k in arsip["kejadian"]:
            k["sel"] = [s for s in k["sel"] if s[3] > 1]
        arsip["kejadian"] = [k for k in arsip["kejadian"] if k["sel"]]
        while os.path.getsize(j) > 2_000_000 and arsip["kejadian"]:
            arsip["kejadian"] = arsip["kejadian"][len(arsip["kejadian"]) // 10 + 1:]
            umum.simpan(j, arsip)
        umum.simpan(j, arsip)
    # prospektif: bekukan titik awal sekali
    pj = os.path.join(OUT, "emsc_prospektif.json")
    if not os.path.exists(pj):
        beku = json.dumps(hasil.get("koreksi") or {"jenis": "raw"}, sort_keys=True)
        umum.simpan(pj, {"dibekukan": sekarang, "beku_sejak": ev[-1]["t"], "sidik_koreksi": hashlib.sha256(beku.encode()).hexdigest()[:16],
                         "koreksi_beku": hasil.get("koreksi") or {"jenis": "raw"},
                         "aturan": "Append-only: kejadian dengan umur >= 7 hari dan t > beku_sejak ditambahkan sekali, tak pernah diubah.",
                         "kejadian": []})
    print(json.dumps({k: hasil[k] for k in ("cacah", "terpilih_validasi", "rmse_validasi", "kinerja_uji", "vonis")}, ensure_ascii=False, indent=1))


def prospektif():
    pj = os.path.join(OUT, "emsc_prospektif.json")
    p = json.load(open(pj))
    ada = {k["id"] for k in p["kejadian"]}
    sk = datetime.now(timezone.utc)
    y, m = int(p["beku_sejak"][:4]), int(p["beku_sejak"][5:7])
    tab = None
    kor = p["koreksi_beku"]
    baru = 0
    for yy, mm in bulan_daftar((y, m), (sk.year, sk.month)):
        for e in olah_bulan(unduh_bulan(yy, mm)):
            umur = (sk - datetime.fromisoformat(e["t"].replace("Z", "+00:00"))).days
            if e["t"] <= p["beku_sejak"] or e["id"] in ada or umur < 7:
                continue
            sel_ = []
            for r, s in zip(residu_kejadian(e), [s for s in e["sel"]]):
                pass
            rs = residu_kejadian(e)
            # residu_kejadian membuang sel pred < 2; hitung ulang pasangan sel agar dapat disimpan
            keep = []
            for a, b, obs, n in e["sel"]:
                la, lo = (a + .5) * RES, (b + .5) * RES
                raw = _pred(e, umum.jarak_km(e["lat"], e["lon"], la, lo))
                if raw >= 2:
                    jr = kelas_jarak(umum.jarak_km(e["lat"], e["lon"], la, lo))
                    c = _koreksi_beku(kor, wilayah(la, lo), jr)
                    keep.append([a, b, obs, round(raw, 2), round(raw + c, 2)])
            if keep:
                p["kejadian"].append({"id": e["id"], "t": e["t"], "m": e["m"], "sel": keep})
                baru += 1
    sel_all = [s for k in p["kejadian"] for s in k["sel"]]
    if sel_all:
        p["metrik"] = {"n_kejadian": len(p["kejadian"]), "n_sel": len(sel_all),
                       "rmse_raw": round(math.sqrt(statistics.fmean((s[2] - s[3]) ** 2 for s in sel_all)), 4),
                       "rmse_koreksi": round(math.sqrt(statistics.fmean((s[2] - s[4]) ** 2 for s in sel_all)), 4)}
    p["diperbarui"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    umum.simpan(pj, p)
    print(f"{baru} kejadian baru ditambahkan; total {len(p['kejadian'])}")


def _koreksi_beku(kor, wil, jr):
    if kor.get("jenis") == "raw" or not kor:
        return 0.0
    tab = {"glob": kor["glob"], "wil": kor["wil"], "jarak": kor["jarak"], "wj": kor["wj"]}
    return koreksi(tab, kor["jenis"], wil, jr)


def uji():
    import zipfile
    # 1. pembaca ZIP alir berhenti di PDF dan tidak membaca isinya
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("events.csv", "#h\nA|2026-01-01T00:00:00.000 UTC|-6.0|106.0|m|5.0|10|JAVA|2\n")
        z.writestr("A.csv", "#x\n#longitude,latitude,time,source,iraw,icorr\n106.01,-6.01,t,app,3,3.0\n106.02,-6.02,t,app,4,5.0\n")
        z.writestr("Instructions.pdf", b"x" * 5000)
        z.writestr("SETELAH.csv", "tak boleh terbaca")
    r = io.BytesIO(buf.getvalue())
    nama = [n for n, _ in bacazip(r.read)]
    assert nama == ["events.csv", "A.csv"], nama
    assert r.tell() < len(buf.getvalue()) - 100, "PDF terbaca padahal harus dilewati"
    # 2. olah_bulan: median icorr per sel
    ev = olah_bulan({n: z for n, z in bacazip(io.BytesIO(buf.getvalue()).read)})
    assert len(ev) == 1 and ev[0]["sel"] == [[-61, 1060, 4.0, 2]], ev
    # 3. penyusutan: n kecil -> ke induk; n besar -> ke rerata
    assert abs(susut(0, 9, 1) - 1) < 1e-9 and abs(susut(10**6, 2, 0) - 2) < 1e-3 and abs(susut(15, 2, 0) - 1) < 1e-9
    # 4. koreksi mengurangi RMSE pada data berbias sintetis, dan raw tidak berubah
    rnd = random.Random(1)
    L = [["a", rnd.randrange(4), 0.8 + rnd.gauss(0, .5)] for _ in range(300)]
    T = latih_koreksi(L)
    assert rmse(L, T, "global") < rmse(L, T, "raw") and abs(koreksi(T, "raw", "a", 0)) == 0
    # 5. sel tak dikenal jatuh ke induk, bukan KeyError
    assert koreksi(T, "wilayah+jarak", "zzz", 2) == T["jarak"][2]
    # 6. bootstrap: koreksi nyata (bias 0,8) selisih negatif seluruh selang; tanpa bias selang menjangkau 0
    ev1 = [[[ "a", 0, 0.8 + rnd.gauss(0, .4)] for _ in range(5)] for _ in range(60)]
    assert bootstrap_selisih(ev1, T, "global", 200)[1] < 0
    ev0 = [[[ "a", 0, rnd.gauss(0, .5)] for _ in range(5)] for _ in range(60)]
    T0 = {"glob": 0.0, "wil": {}, "jarak": [0.0] * 4, "wj": {}}
    ci = bootstrap_selisih(ev0, T0, "global", 200)
    assert ci[0] <= 0 <= ci[1], ci
    # 7. bulan 84
    assert len(list(bulan_daftar())) == 84
    print("emsc uji: OK")


if __name__ == "__main__":
    {"ambil": lambda: ambil(sys.argv[2] if len(sys.argv) > 2 else None), "hitung": hitung, "prospektif": prospektif, "uji": uji}.get(
        sys.argv[1] if len(sys.argv) > 1 else "uji", uji)()
