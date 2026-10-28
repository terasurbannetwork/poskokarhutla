"""LAB: peta genangan dari radar Sentinel-1 (air baru = gelap sesudah, tidak gelap sebelum), DIUJI terhadap label laporan warga PetaBencana di DKI.
Keluaran: public/banjir/data/lab/genangan_radar.json (+ genangan_radar_ringkas.md). BUKAN produksi, tidak ada layar, tidak ada angka resmi.

Pakai ulang apa adanya: citra_banjir.buka_float_pred3 + ambang -17 dB, citra.COG (pembaca COG), genangan/bersama.KecDKI (kecamatan DKI),
genangan/petabencana_laporan.json (label), DEMNAS 8 m di data/raw/banjir/genangan/medan (masker lereng).
Kriteria (ditulis SEBELUM hasil): scripts/banjir/lab_kriteria/lab_genangan_radar.json, sha256-nya masuk keluaran.

Keterbatasan yang melekat (jujur): revisit S1 6-12 hari (S1A saja sebelum 2024), genangan kota sering surut sebelum satelit lewat, bangunan menutupi
air (double bounce, genangan jalan sempit < 1 piksel 80 m), label = laporan warga (bias pelapor, bukan luas), satu bingkai radar menutup jam tertentu.

Pakai:  python3 scripts/banjir/lab_genangan_radar.py uji     self-check sintetis, tanpa jaringan
        python3 scripts/banjir/lab_genangan_radar.py jalan   STAC + baca adegan (cache data/raw/banjir/lab_radar/) + hitung; LAB_MENIT anggaran (bawaan 40)
"""
import array, collections, datetime as dt, glob, gzip, hashlib, json, math, os, sys, time

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
sys.path.insert(0, os.path.join(AYAH, "genangan"))
sys.path.insert(0, os.path.join(AYAH, "../data"))

AKAR = os.path.abspath(os.path.join(AYAH, "../.."))
KRITERIA = os.path.join(AYAH, "lab_kriteria", "lab_genangan_radar.json")
KELUAR = os.path.join(AKAR, "public/banjir/data/lab/genangan_radar.json")
RINGKAS = os.path.join(AKAR, "public/banjir/data/lab/genangan_radar_ringkas.md")
CACHE = os.path.join(AKAR, "data/raw/banjir/lab_radar")
LAPORAN = os.path.join(AKAR, "data/raw/banjir/genangan/petabencana_laporan.json")
MEDAN = os.path.join(AKAR, "data/raw/banjir/genangan/medan")
WIB = dt.timezone(dt.timedelta(hours=7))
AMBANG_DB = -17.0
TAK = -32768   # None dalam cache int16 (dB x 100)


def kriteria():
    b = open(KRITERIA, "rb").read()
    return json.loads(b), hashlib.sha256(b).hexdigest()[:16]


# ---------------------------------------------------------------- fungsi murni (diuji `uji`)
def otsu(vals, lo=-30.0, hi=0.0, lebar=0.5, jepit=(-22.0, -14.0)):
    """Ambang Otsu (maks varians antar-kelas) pada histogram dB, dijepit ke `jepit`."""
    n = int((hi - lo) / lebar)
    h = [0] * n
    for v in vals:
        h[min(n - 1, max(0, int((v - lo) / lebar)))] += 1
    tot = sum(h)
    if tot == 0:
        return None
    sw = sum(i * c for i, c in enumerate(h))
    wb = sb = 0
    terbaik, ti = -1.0, 0
    for i in range(n):
        wb += h[i]
        sb += i * h[i]
        if wb == 0 or wb == tot:
            continue
        mb, mf = sb / wb, (sw - sb) / (tot - wb)
        v = wb * (tot - wb) * (mb - mf) ** 2
        if v > terbaik:
            terbaik, ti = v, i
    return max(jepit[0], min(jepit[1], lo + (ti + 1) * lebar))


def median(v):
    v = sorted(v)
    n = len(v)
    return None if not n else (v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2)


def dasar_median(lintasan):
    """list lintasan (tiap list dB atau None per sel) -> median per sel (None bila tak ada)"""
    return [median([x for x in s if x is not None]) for s in zip(*lintasan)]


def gelap_baru(sebelum, sesudah, ambang, sah=None):
    """bool|None per sel: sesudah < ambang dan sebelum >= ambang; None bila salah satu tak ada atau sel dimasker (sah[i] False)"""
    return [None if (a is None or b is None or (sah is not None and not sah[i])) else (b < ambang <= a)
            for i, (a, b) in enumerate(zip(sebelum, sesudah))]


def per_kecamatan(flag, kec, sah_min=50.0):
    """-> {kec: (pecahan_sel_gelap_baru, persen_sel_sah)}; kec[i] None = di luar DKI. persen sah terhadap sel kecamatan."""
    n, ya, ada = collections.Counter(), collections.Counter(), collections.Counter()
    for f, k in zip(flag, kec):
        if k is None:
            continue
        n[k] += 1
        if f is not None:
            ada[k] += 1
            ya[k] += f
    return {k: (ya[k] / ada[k], 100 * ada[k] / n[k]) for k in n if ada[k] and 100 * ada[k] / n[k] >= sah_min}


def metrik(pred, label):
    """pred, label: {kec: bool} pada kecamatan bersama -> dict hits/miss/fa/cn, POD, FAR, CSI (None bila penyebut 0)"""
    h = m = fa = cn = 0
    for k in set(pred) & set(label):
        p, l = pred[k], label[k]
        h += p and l
        m += (not p) and l
        fa += p and (not l)
        cn += (not p) and (not l)
    r = lambda a, b: None if b == 0 else round(a / b, 3)
    return {"hit": h, "miss": m, "fa": fa, "cn": cn, "POD": r(h, h + m), "FAR": r(fa, h + fa), "CSI": r(h, h + m + fa)}


def auc(skor, label):
    """AUC peringkat (Mann-Whitney, ikatan 0,5): peluang kecamatan berlabel punya skor > yang tak berlabel"""
    k = [x for x in skor if x in label]
    pos, neg = [skor[x] for x in k if label[x]], [skor[x] for x in k if not label[x]]
    if not pos or not neg:
        return None
    return round(sum((p > q) + 0.5 * (p == q) for p in pos for q in neg) / (len(pos) * len(neg)), 3)


def kejadian_dari_laporan(laporan, min_lap, gabung):
    """laporan [{'t'}] -> [{'puncak','hari','n'}] hari WIB >= min_lap digabung bila berjarak <= gabung hari"""
    c = collections.Counter(r["t"][:10] for r in laporan if r.get("status", "confirmed") == "confirmed")
    hari = sorted(d for d, n in c.items() if n >= min_lap)
    grup = []
    for d in hari:
        t = dt.date.fromisoformat(d)
        if grup and (t - grup[-1][-1]).days <= gabung:
            grup[-1].append(t)
        else:
            grup.append([t])
    out = []
    for g in grup:
        p = max(g, key=lambda t: c[t.isoformat()])
        out.append({"puncak": p.isoformat(), "hari": [t.isoformat() for t in g], "n": sum(c[t.isoformat()] for t in g)})
    return out


def label_kec(laporan, kec_of, waktu, jam, min_lap):
    """{kec: bool} berlabel bila >= min_lap laporan dalam +-jam dari `waktu` (datetime aware); kec_of(lon,lat)->kunci|None. kec dengan 0 laporan = False."""
    n = collections.Counter()
    for r in laporan:
        if abs((dt.datetime.fromisoformat(r["t"]) - waktu).total_seconds()) <= jam * 3600:
            k = kec_of(r["lon"], r["lat"])
            if k:
                n[k] += 1
    return n


def prediksi(skor, f):
    return {k: s >= f for k, s in skor.items()}


def lolos_kejadian(csi, naif, semua, kr):
    if csi is None:
        return False
    L = kr["lolos_kejadian"]
    return csi >= L["csi_min"] and csi >= max(naif or 0, semua or 0) + L["margin_atas_pembanding"]


# ---------------------------------------------------------------- penjaga label uji J3 (PRAREG-J3.md)
MESIN = os.path.join(AYAH, "genangan", "mesin.mjs")


def jendela_j3(mesin=MESIN):
    """[(awal, akhir)] datetime WIB jendela kejadian peran "uji" dari KEJADIAN_J3 di mesin.mjs (sumber yang sama dengan muatLabel; tidak disalin).
    Gagal membaca/menemukan tabel = galat keras, BUKAN diam-diam tanpa penjaga."""
    import re
    src = open(mesin).read()
    blok = src[src.index("export const KEJADIAN_J3"):]
    blok = blok[:blok.index("};") + 2]
    out = []
    for m in re.finditer(r'mulai:\s*"(\d{4}-\d{2}-\d{2})",\s*jam:\s*(\d+),\s*peran:\s*"uji"', blok):
        a = dt.datetime.fromisoformat(m.group(1) + "T00:00:00+07:00")
        out.append((a, a + dt.timedelta(hours=int(m.group(2)))))
    if not out:
        raise RuntimeError("tabel KEJADIAN_J3 peran uji tidak terbaca dari mesin.mjs: berhenti")
    return out


def tanpa_j3(laporan, jendela):
    """buang laporan di jendela uji J3 SEGERA setelah baca, tanpa menghitung/menyimpan apa pun darinya -> (laporan_sisa)"""
    ada = lambda t: any(a <= t < b for a, b in jendela)
    return [r for r in laporan if not ada(dt.datetime.fromisoformat(r["t"]))]


def kena_j3(waktu, jam, jendela):
    """jendela label [waktu-jam, waktu+jam] menyentuh jendela uji J3?"""
    d = dt.timedelta(hours=jam)
    return any(waktu - d < b and waktu + d > a for a, b in jendela)


# ---------------------------------------------------------------- masker medan (DEMNAS lokal)
def masker_medan(lons, lats, langkah, kr):
    """-> sah[i] bool per sel kisi: lereng <= batas dan tinggi <= batas, dari minimum DEMNAS 8 m per sel. Tanpa DEM: semua True + peringatan."""
    jb = os.path.join(MEDAN, "demnas_kotak.json")
    if not os.path.exists(jb):
        print("   peringatan: DEMNAS tak ada, masker medan dimatikan", file=sys.stderr)
        return [True] * len(lons), False
    m = json.load(open(jb))
    a = array.array("f")
    with gzip.open(os.path.join(MEDAN, "demnas_kotak.f32.gz"), "rb") as f:
        a.frombytes(f.read())
    W, H, x0, y0, dx, dy, nod = m["kolom"], m["baris"], m["x0"], m["y0"], m["dx"], m["dy"], m["nodata"]
    sel = int(round(langkah / dx))

    def minimum(lon, lat):
        i0, j0 = int((lon - langkah / 2 - x0) / dx), int((y0 - (lat + langkah / 2)) / dy)
        v = [a[j * W + i] for j in range(max(0, j0), min(H, j0 + sel), 2) for i in range(max(0, i0), min(W, i0 + sel), 2)]
        v = [x for x in v if x != nod]
        return min(v) if v else None
    h = {}
    for lon, lat in set(zip(lons, lats)):
        h[(lon, lat)] = minimum(lon, lat)
    dxm, dym = langkah * 111320 * math.cos(math.radians(-6.2)), langkah * 110574
    L = kr["masker"]
    sah = []
    for lon, lat in zip(lons, lats):
        z = h[(lon, lat)]
        if z is None:
            sah.append(False)
            continue
        gs = []
        for dlon, dlat, jarak in ((langkah, 0, dxm), (-langkah, 0, dxm), (0, langkah, dym), (0, -langkah, dym)):
            z2 = h.get((round(lon + dlon, 6), round(lat + dlat, 6)))
            if z2 is not None:
                gs.append(abs(z2 - z) / jarak)
        lereng = math.degrees(math.atan(max(gs))) if gs else 0
        sah.append(lereng <= L["lereng_derajat_maks"] and z <= L["medan_tinggi_m_maks"])
    return sah, True


# ---------------------------------------------------------------- bacaan S1 (jaringan)
def buat_kisi(kr):
    g = kr["kisi"]
    st = g["langkah_derajat"]
    nlon = int(round((g["lon"][1] - g["lon"][0]) / st))
    nlat = int(round((g["lat"][1] - g["lat"][0]) / st))
    lons, lats = [], []
    for j in range(nlat):
        for i in range(nlon):
            lons.append(round(g["lon"][0] + (i + .5) * st, 6))
            lats.append(round(g["lat"][1] - (j + .5) * st, 6))
    return lons, lats


def baca_item(item, token, EN, res=100.0):
    """dB per titik UTM (E, N) dari satu item S1 RTC; None = di luar/tanpa data"""
    import citra as C
    import citra_banjir as CB
    from concurrent.futures import ThreadPoolExecutor
    url = item["assets"]["vv"]["href"] + "?" + token
    c = C.COG(url)
    tr = item["properties"]["proj:transform"]
    lv = C.level_untuk(c, tr[0], res)
    t = c.ifd[lv]
    W, H, T = t[256], t[257], t[322]
    r = tr[0] * c.ifd[0][256] / W
    tx = math.ceil(W / T)
    off, cnt = t[324], t[325]
    px = [(int((tr[5] - N) / r), int((E - tr[2]) / r)) for E, N in EN]
    perlu = {(y // T, x // T) for y, x in px if 0 <= y < H and 0 <= x < W}

    def satu(yx):
        k = yx[0] * tx + yx[1]
        return yx, (CB.buka_float_pred3(C.ambil(url, (off[k], off[k] + cnt[k])), T, T) if cnt[k] else None)
    with ThreadPoolExecutor(8) as ex:
        ubin = dict(ex.map(satu, perlu))
    out = []
    for y, x in px:
        u = ubin.get((y // T, x // T)) if 0 <= y < H and 0 <= x < W else None
        v = u[(y % T) * T + x % T] if u else None
        out.append(10 * math.log10(v) if v is not None and v > 0 and v == v else None)
    return out


class Radar:
    def __init__(self, lons, lats):
        import citra as C
        self.C = C
        self.EN = [C.ke_utm(la, lo, 48) for lo, la in zip(lons, lats)]
        self.tok, self.t_tok = None, 0
        self.bbox = [min(lons), min(lats), max(lons), max(lats)]
        os.makedirs(CACHE, exist_ok=True)

    def token(self):
        import citra_banjir as CB
        if not self.tok or time.time() - self.t_tok > 1200:
            self.tok, self.t_tok = CB.token_sas(), time.time()
        return self.tok

    def cari(self, a, b):
        """item S1 RTC (tanggal UTC a..b) yang memotong kisi, dikelompokkan per (tanggal UTC, orbit relatif) -> {kunci: [item]}"""
        import citra_banjir as CB
        fit = CB.stac(CB.PC_STAC, {"collections": ["sentinel-1-rtc"], "bbox": self.bbox, "limit": 100,
                                   "datetime": f"{a}T00:00:00Z/{b}T23:59:59Z"})
        g = collections.defaultdict(list)
        for i in fit:
            if "vv" in i["assets"] and i["properties"].get("proj:epsg") == 32748:
                g[(i["properties"]["datetime"][:10], i["properties"].get("sat:relative_orbit"))].append(i)
        return g

    def lintasan(self, kunci, items):
        """dB per sel kisi, gabungan semua item satu lintasan (sah pertama menang); cache int16 x100"""
        jalur = os.path.join(CACHE, f"{kunci[0]}_{kunci[1]}.bin.gz")
        if os.path.exists(jalur):
            a = array.array("h")
            a.frombytes(gzip.open(jalur).read())
            return [None if v == TAK else v / 100 for v in a]
        hasil = [None] * len(self.EN)
        for it in items:
            try:
                v = baca_item(it, self.token(), self.EN)
            except Exception as e:
                print(f"   item {it['id']} gagal: {e}", file=sys.stderr)
                continue
            hasil = [h if h is not None else x for h, x in zip(hasil, v)]
        a = array.array("h", (TAK if v is None else int(round(v * 100)) for v in hasil))
        with gzip.open(jalur, "wb") as f:
            f.write(a.tobytes())
        return hasil


def waktu_lintasan(items):
    return dt.datetime.fromisoformat(min(i["properties"]["datetime"] for i in items).replace("Z", "+00:00"))


# ---------------------------------------------------------------- inti penilaian satu adegan
def nilai_adegan(sesudah, dasar, naif_sebelum, kec, sah_medan, labelkec, kr):
    """semua metode untuk satu adegan sesudah. dasar = list lintasan dasar; labelkec = {kec: bool} (hanya kecamatan dengan data)."""
    L = kr["satuan_uji"]
    med = dasar_median(dasar)
    valid = [v for v in sesudah if v is not None]
    T = otsu(valid)
    if T is None:
        return None
    sah_air = lambda amb: [m and (b is None or b >= amb) for m, b in zip(sah_medan, med)]   # buang air tetap: dasar sudah gelap
    metode = {
        "naif": (naif_sebelum, AMBANG_DB, None),
        "tetap_masker": (med, AMBANG_DB, sah_air(AMBANG_DB)),
        "otsu_masker": (med, T, sah_air(T)),
    }
    out = {"ambang_otsu_db": round(T, 2)}
    for nama, (sb, amb, sah) in metode.items():
        if sb is None:
            out[nama] = None
            continue
        skor_sah = per_kecamatan(gelap_baru(sb, sesudah, amb, sah), kec, kr["masker"]["sah_min_persen_kecamatan"])
        skor = {k: v[0] for k, v in skor_sah.items()}
        ks = [k for k in skor if k in labelkec]
        if nama == "otsu_masker":
            dinilai_utama = ks
        out[nama] = {"metrik": metrik(prediksi(skor, L["ambang_pecahan_sel"]), labelkec),
                     "AUC": auc(skor, labelkec),
                     "kepekaan_CSI": {str(f): metrik(prediksi(skor, f), labelkec)["CSI"] for f in L["kepekaan_pecahan"]},
                     "kec_dinilai": len(ks), "pecahan_median": round(median([skor[k] for k in ks]) or 0, 4)}
    out["semua_positif"] = metrik({k: True for k in dinilai_utama}, labelkec)   # kecamatan yang sama dengan metode utama
    return out


# ---------------------------------------------------------------- jalan
def jalan():
    kr, sha = kriteria()
    mulai, anggaran = time.time(), float(os.environ.get("LAB_MENIT", "40")) * 60
    J3 = jendela_j3()
    lap = tanpa_j3(json.load(open(LAPORAN)), J3)   # laporan jendela uji J3 dibuang di sini, tidak pernah dihitung
    from bersama import KecDKI
    kd = KecDKI()
    kec_of = lambda lo, la: ("%s|%s" % kd.cari(lo, la)) if kd.cari(lo, la) else None
    lons, lats = buat_kisi(kr)
    kec = [kec_of(lo, la) for lo, la in zip(lons, lats)]
    sah_medan, ada_dem = masker_medan(lons, lats, kr["kisi"]["langkah_derajat"], kr)
    print(f"kisi {len(lons)} sel, {sum(k is not None for k in kec)} di DKI, DEM {ada_dem}", file=sys.stderr)
    R = Radar(lons, lats)
    lb = kr["label"]
    kejadian = kejadian_dari_laporan(lap, lb["kejadian_hari_min_laporan"], lb["gabung_kejadian_hari"])
    semua_hari = {h for e in kejadian for h in e["hari"]}
    A = kr["adegan"]
    hasil, keg, dikecualikan = [], [], []
    for ev in kejadian:
        if time.time() - mulai > anggaran:
            keg.append(f"anggaran habis sebelum {ev['puncak']}")
            break
        D = dt.date.fromisoformat(ev["puncak"])
        rec = {"kejadian": ev["puncak"], "hari_laporan": ev["hari"], "n_laporan": ev["n"], "adegan": []}
        try:
            # tanggal WIB D..D+2; lintasan UTC bisa jatuh sehari lebih awal, ambil D-1..D+3 lalu saring
            g = R.cari((D - dt.timedelta(days=1)).isoformat(), (D + dt.timedelta(days=3)).isoformat())
            pas = []
            for (tgl, orb), items in sorted(g.items()):
                w = waktu_lintasan(items)
                sel = (w.astimezone(WIB).date() - D).days
                if A["setelah_hari_wib"][0] <= sel <= A["setelah_hari_wib"][1]:
                    pas.append(((tgl, orb), items, w, sel))
            if not pas:
                rec["status"] = "tanpa_adegan_0_2_hari"
                hasil.append(rec)
                continue
            for kunci, items, w, sel in pas:
                tgl = dt.date.fromisoformat(kunci[0])
                a0, a1 = A["dasar_hari_sebelum"]
                gd = R.cari((tgl - dt.timedelta(days=a1)).isoformat(), (tgl - dt.timedelta(days=a0)).isoformat())
                dekat = lambda d: any(abs((d - dt.date.fromisoformat(h)).days) <= A["dasar_buang_bila_dekat_kejadian_hari"] for h in semua_hari)
                kand = sorted((k for k in gd if k[1] == kunci[1] and not dekat(dt.date.fromisoformat(k[0]))), reverse=True)
                dasar_k = kand[:A["dasar_maks_lintasan"]]
                n0, n1 = A["naif_dasar_hari_sebelum"][0], A["naif_dasar_hari_sebelum"][1]
                naif_k = next((k for k in kand if n0 <= (tgl - dt.date.fromisoformat(k[0])).days <= n1), None)
                if kena_j3(w, lb["jendela_label_jam"], J3):
                    dikecualikan.append(kunci[0])
                    continue
                lab = label_kec(lap, kec_of, w, lb["jendela_label_jam"], 1)
                a = {"tanggal_utc": kunci[0], "waktu_wib": w.astimezone(WIB).isoformat(timespec="minutes"), "orbit": kunci[1],
                     "selisih_hari_wib": sel, "dasar_lintasan": [k[0] for k in dasar_k], "naif_sebelum": naif_k[0] if naif_k else None}
                if not dasar_k:
                    a["status"] = "tanpa_dasar"
                    rec["adegan"].append(a)
                    continue
                if time.time() - mulai > anggaran:
                    a["status"] = "anggaran_habis"
                    rec["adegan"].append(a)
                    continue
                sesudah = R.lintasan(kunci, items)
                dasar = [R.lintasan(k, gd[k]) for k in dasar_k]
                naif_sb = R.lintasan(naif_k, gd[naif_k]) if naif_k else None
                sah_s = 100 * sum(v is not None for v, k in zip(sesudah, kec) if k) / max(1, sum(k is not None for k in kec))
                a["cakupan_sel_persen"] = round(sah_s)
                kecs = sorted(set(k for k in kec if k))
                labelkec = {k: lab.get(k, 0) >= lb["kecamatan_positif_min_laporan"] for k in kecs}
                a["laporan_dalam_jendela"] = sum(lab.values())
                a["kec_positif"] = sum(labelkec.values())
                res = nilai_adegan(sesudah, dasar, naif_sb, kec, sah_medan, labelkec, kr)
                if res is None:
                    a["status"] = "tanpa_piksel"
                else:
                    # batasi label ke kecamatan yang punya data radar >= sah_min (ditangani metrik via irisan)
                    a.update(res)
                    a["status"] = "ok"
                rec["adegan"].append(a)
        except Exception as e:
            rec["status"] = f"galat: {e}"
            print(f"   {ev['puncak']} gagal: {e}", file=sys.stderr)
        hasil.append(rec)
        print(f"   {ev['puncak']}: {len(rec['adegan'])} adegan", file=sys.stderr)
    keg.append("dikecualikan: jendela uji J3 terkunci")   # selalu disebut, tanpa angka
    simpan_hasil(hasil, kr, sha, keg)


def pilih_utama(rec, kr):
    """adegan utama kejadian = selisih hari terkecil lalu cakupan terbesar di antara yang ok; None bila tak ada"""
    ok = [a for a in rec["adegan"] if a.get("status") == "ok"]
    return min(ok, key=lambda a: (a["selisih_hari_wib"], -a["cakupan_sel_persen"]), default=None)


def putusan(rec, kr):
    a = pilih_utama(rec, kr)
    if not a:
        return {"status": rec.get("status", "tanpa_adegan_terpakai"), "lolos": None}
    d = kr["dinilai"]
    m = a["otsu_masker"]["metrik"]
    npos, nneg = m["hit"] + m["miss"], m["fa"] + m["cn"]
    if npos < d["kecamatan_positif_min"] or nneg < d["kecamatan_negatif_min"]:
        return {"status": "tak_dapat_dinilai", "alasan": f"kecamatan positif {npos}, negatif {nneg}", "lolos": None, "adegan": a["tanggal_utc"]}
    naif = (a.get("naif") or {}).get("metrik", {}).get("CSI")
    sp = a["semua_positif"]["CSI"]
    return {"status": "dinilai", "adegan": a["tanggal_utc"], "CSI": m["CSI"], "CSI_naif": naif, "CSI_semua_positif": sp,
            "lolos": lolos_kejadian(m["CSI"], naif, sp, kr)}


def simpan_hasil(hasil, kr, sha, keg):
    for r in hasil:
        r["putusan"] = putusan(r, kr)
    dinilai = [r for r in hasil if r["putusan"]["status"] == "dinilai"]
    nl = sum(r["putusan"]["lolos"] for r in dinilai)
    K = kr["lolos_keseluruhan"]
    tot = {"kejadian_berlabel": len(hasil), "dengan_adegan_0_2_hari": sum(1 for r in hasil if r["adegan"]),
           "adegan_terbaca": sum(1 for r in hasil if pilih_utama(r, kr)), "dinilai": len(dinilai), "lolos": nl,
           "lolos_keseluruhan": (len(dinilai) >= K["kejadian_dinilai_min"] and nl / len(dinilai) >= K["pecahan_lolos_min"]) if dinilai else None}
    csi = lambda r, k: ((pilih_utama(r, kr) or {}).get(k) or {}).get("metrik", {}).get("CSI") if k != "semua_positif" else (pilih_utama(r, kr) or {}).get(k, {}).get("CSI")
    for k in ("otsu_masker", "tetap_masker", "naif", "semua_positif"):
        v = [csi(r, k) for r in dinilai if csi(r, k) is not None]
        tot["CSI_median_" + k] = median(v)
    v = [(pilih_utama(r, kr)["otsu_masker"]["AUC"]) for r in dinilai if pilih_utama(r, kr)["otsu_masker"]["AUC"] is not None]
    tot["AUC_median_otsu_masker"] = median(v)
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "kriteria_sha": sha, "kriteria": KRITERIA.replace(AKAR + "/", ""),
           "sifat": "LAB, bukan produksi. Radar S1 vs laporan warga PetaBencana per kecamatan DKI. Tidak ada peta/angka resmi.",
           "keterbatasan": ["revisit S1 6-12 hari (S1A saja sebelum 2024): genangan kota sering sudah surut saat satelit lewat",
                            "bangunan menutupi air (double bounce) dan jalan sempit < piksel 80 m: genangan kota padat tidak menggelapkan radar",
                            "label = laporan warga (bias pelapor, jam laporan tak sama dengan jam lintasan), bukan luas genangan",
                            "kecamatan ber-label hanya tanda 'ada laporan', bukan tinggi/luas; false alarm bisa genangan nyata yang tak dilaporkan",
                            "model hujan M1 tidak tersedia sebagai pembanding"],
           "ringkasan": tot, "catatan": keg, "kejadian": hasil}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    open(RINGKAS, "w").write(ringkas_md(out))
    print(json.dumps(tot, ensure_ascii=False), file=sys.stderr)


def ringkas_md(o):
    t = o["ringkasan"]
    s = [f"# Lab genangan radar S1 (kriteria {o['kriteria_sha']})", "",
         f"Kejadian berlabel {t['kejadian_berlabel']}, dengan adegan S1 0-2 hari WIB {t['dengan_adegan_0_2_hari']}, terbaca {t['adegan_terbaca']}, dinilai {t['dinilai']}, lolos {t['lolos']}. "
         f"Keseluruhan lolos: {t['lolos_keseluruhan']}.", "",
         "CSI median (ambang 2% sel): " + ", ".join(f"{k} {t['CSI_median_' + k]}" for k in ("otsu_masker", "tetap_masker", "naif", "semua_positif")) + f"; AUC median otsu_masker {t['AUC_median_otsu_masker']}.", "",
         "| Kejadian | Adegan | CSI otsu+masker | naif | semua positif | Putusan |", "|---|---|---|---|---|---|"]
    for r in o["kejadian"]:
        p = r["putusan"]
        s.append(f"| {r['kejadian']} | {p.get('adegan', '-')} | {p.get('CSI', '-')} | {p.get('CSI_naif', '-')} | {p.get('CSI_semua_positif', '-')} | "
                 f"{'lolos' if p['lolos'] else 'gagal' if p['lolos'] is False else p['status']} |")
    s += ["", "Keterbatasan: " + "; ".join(o["keterbatasan"]) + "."]
    return "\n".join(s) + "\n"


# ---------------------------------------------------------------- uji sintetis (tanpa jaringan)
def uji():
    kr, sha = kriteria()
    # otsu: dua mode -25 dan -10 -> ambang di tengah, dijepit ke [-22,-14]
    v = [-25 + (i % 3) * .3 for i in range(300)] + [-10 + (i % 3) * .3 for i in range(700)]
    t = otsu(v)
    assert -22 <= t <= -14, t
    assert otsu([]) is None
    # dasar median, gelap_baru, masker
    assert dasar_median([[-10, None], [-12, -20], [-30, -22]]) == [-12, -21.0]
    assert gelap_baru([-10, -20, None, -10], [-25, -25, -25, -10], -17, [True, True, True, False]) == [True, False, None, None]
    # per_kecamatan: A 4 sel (2 gelap baru), B 4 sel (0), C hanya 1 dari 4 sel sah -> 25% < 50% dibuang
    kec = ["A"] * 4 + ["B"] * 4 + ["C"] * 4 + [None]
    fl = [True, True, False, False] + [False] * 4 + [True, None, None, None] + [True]
    pk = per_kecamatan(fl, kec)
    assert pk == {"A": (0.5, 100.0), "B": (0.0, 100.0)}, pk
    # metrik, AUC, pembanding
    m = metrik({"A": True, "B": True, "C": False, "D": False}, {"A": True, "B": False, "C": True, "D": False})
    assert (m["hit"], m["fa"], m["miss"], m["cn"], m["CSI"]) == (1, 1, 1, 1, 0.333), m
    assert auc({"A": .9, "B": .1, "C": .5}, {"A": True, "B": False, "C": False}) == 1.0
    assert auc({"A": .1, "B": .1}, {"A": True, "B": False}) == 0.5 and auc({"A": 1}, {"A": True}) is None
    assert lolos_kejadian(.4, .2, .3, kr) and not lolos_kejadian(.4, .2, .38, kr) and not lolos_kejadian(.25, 0, 0, kr) and not lolos_kejadian(None, 0, 0, kr)
    # kejadian: 2 hari berurutan >= 3 digabung, hari jauh terpisah
    lap = [{"t": f"2020-01-0{d}T10:00:00+07:00"} for d, n in ((1, 3), (2, 4), (9, 3)) for _ in range(n)]
    ev = kejadian_dari_laporan(lap, 3, 2)
    assert [e["puncak"] for e in ev] == ["2020-01-02", "2020-01-09"] and ev[0]["n"] == 7, ev
    # label_kec: jendela +-12 jam
    w = dt.datetime(2020, 1, 2, 18, tzinfo=WIB)
    lp = [{"t": "2020-01-02T08:00:00+07:00", "lon": 0, "lat": 0}] * 2 + [{"t": "2020-01-01T10:00:00+07:00", "lon": 0, "lat": 0}]
    assert label_kec(lp, lambda a, b: "X", w, 12, 2)["X"] == 2
    # end-to-end sintetis: 14 kecamatan x 20 sel; kec 0-4 banjir (sel gelap baru 40%), kec 5-9 bersih; sebagian sel air tetap & lereng
    n = 20
    kec = [f"k{i // n}" for i in range(14 * n)]
    sebelum = [-10.0] * (14 * n)
    sesudah = [-10.0] * (14 * n)
    for i in range(5 * n):
        if i % 5 < 2:
            sesudah[i] = -24.0
    for i in range(5 * n, 6 * n):
        sebelum[i] = -25.0   # air tetap di k5: gelap sebelum dan sesudah, TIDAK boleh jadi false alarm di metode bermasker
        sesudah[i] = -25.0
    # k6: lereng -> bayangan radar; masker medan membuangnya
    for i in range(6 * n, 7 * n):
        sesudah[i] = -24.0
    sah_medan = [not (6 * n <= i < 7 * n) for i in range(14 * n)]
    label = {f"k{i}": i < 5 for i in range(14)}
    r = nilai_adegan(sesudah, [sebelum, sebelum, sebelum], sebelum, kec, sah_medan, label, kr)
    assert r["otsu_masker"]["metrik"]["CSI"] == 1.0 and r["otsu_masker"]["AUC"] == 1.0, r["otsu_masker"]
    assert r["naif"]["metrik"]["FAR"] > 0, r["naif"]   # tanpa masker: k6 (bayangan lereng) jadi false alarm
    assert r["semua_positif"]["CSI"] == round(5 / 12, 3), r["semua_positif"]   # k5,k6 tanpa sel sah dibuang: 5 positif dari 12
    # putusan: kejadian sintetis lolos; terlalu sedikit kecamatan negatif -> tak dapat dinilai
    rec = {"adegan": [{"status": "ok", "selisih_hari_wib": 1, "cakupan_sel_persen": 90, "tanggal_utc": "x", **r}]}
    p = putusan(rec, kr)
    assert p["status"] == "dinilai" and p["lolos"] is True, p
    r2 = dict(r, otsu_masker=dict(r["otsu_masker"], metrik=metrik({"a": True}, {"a": True})))
    assert putusan({"adegan": [{"status": "ok", "selisih_hari_wib": 0, "cakupan_sel_persen": 90, "tanggal_utc": "x", **r2}]}, kr)["status"] == "tak_dapat_dinilai"
    assert putusan({"adegan": []}, kr)["lolos"] is None
    # penjaga J3: jendela dibaca dari mesin.mjs; laporan di jendela uji = nol baris tersisa, di luar jendela utuh
    J = jendela_j3()
    assert len(J) == 2 and all((b - a).total_seconds() == 96 * 3600 for a, b in J), J
    for a, b in J:
        di_dalam = [{"t": (a + dt.timedelta(hours=h)).isoformat(), "lon": 0, "lat": 0} for h in (0, 30, 95)]
        assert tanpa_j3(di_dalam, J) == [], "laporan jendela uji J3 harus nol baris"
        luar = [{"t": (a - dt.timedelta(hours=1)).isoformat(), "lon": 0, "lat": 0}, {"t": b.isoformat(), "lon": 0, "lat": 0}]
        assert len(tanpa_j3(luar, J)) == 2
        assert kena_j3(a - dt.timedelta(hours=6), 12, J) and not kena_j3(a - dt.timedelta(hours=13), 12, J)
    # buat_kisi: ukuran sesuai kriteria
    lo, la = buat_kisi(kr)
    assert len(lo) == 320 * 310 and lo[0] == 106.6805 and la[0] == -6.0705, (len(lo), lo[0], la[0])
    print("uji lab_genangan_radar: lolos", file=sys.stderr)


if __name__ == "__main__":
    {"uji": uji, "jalan": jalan}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: print(__doc__))()
