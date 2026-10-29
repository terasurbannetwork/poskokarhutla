"""LAB: peta kerusakan bangunan dari radar Sentinel-1 (damage proxy, AMPLITUDO) diuji balik terhadap rumah rusak resmi -> public/data/lab/kerusakan.json

Bukan produksi, tanpa layar. Yang dicari angka uji yang jujur; gagal ditulis gagal.

Metode: untuk satu gempa, tumpukan 5 adegan Sentinel-1 RTC (Microsoft Planetary Computer; orbit & arah sama) SEBELUM dan 1 adegan SESUDAH pertama.
Per piksel (langkah 40 m, VV dan VH): z = (dB_sesudah - rerata dB_tumpukan) / max(sd_tumpukan, median sd seluruh kotak). Piksel "berubah kuat" bila z lewat
ambang (arah naik/turun/mutlak). Skor sel 110 m = bangunan Open Buildings sel x bagian piksel berubah (jendela 3x3). Agregasi ke sel 1 km dan kecamatan.
KETERBATASAN (diulang di keluaran): amplitudo, BUKAN koherensi (PC tak menyediakan SLC); hujan/kelembapan/panen ikut mengubah backscatter; longsor dan
banjir ikut terhitung; resolusi 40 m dan pusat bangunan (bukan jejak); satu geometri pengamatan; kebenaran = survei rumah rusak, bukan cacah lengkap.
Plasebo: skor yang sama dari adegan SEBELUM kejadian; model harus mengalahkannya (kalau tidak, itu struktur lahan, bukan kerusakan).

Kriteria dikunci di scripts/data/lab_kriteria/lab_kerusakan.json (sha256 kanonik, pola lab_luas.py) SEBELUM hasil dilihat.
Pakai ulang: citra_banjir.py (STAC, SAS, buka_float_pred3), data/citra.py (COG, ke_utm), umum/bangunan.py (proses_ubin, halus), gempa/guncangan.py (MMI),
data/wilayah.py (kecamatan). Hanya stdlib.

  python3 scripts/umum/lab_kerusakan.py uji       self-check sintetis TANPA jaringan
  python3 scripts/umum/lab_kerusakan.py jalan     unduh + hitung + uji balik + tulis (jaringan; ubin bangunan ~1,7 GB sekali)
  python3 scripts/umum/lab_kerusakan.py ringkas   tulis ulang kerusakan_ringkas.md dari kerusakan.json
"""
import array, bisect, datetime as dt, hashlib, importlib.util, json, math, os, random, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
OUT = os.path.join(AKAR, "public/data/lab")
RAW = os.path.join(AKAR, "data/raw/lab_kerusakan")
KRITERIA_JALUR = os.path.join(AKAR, "scripts/data/lab_kriteria/lab_kerusakan.json")
UTC = dt.timezone.utc
NAN = float("nan")
RR_URL = "https://gis.bnpb.go.id/server/rest/services/rumah_rusak_cianjur/MapServer/0/query"

JUJUR = [
    "Amplitudo, bukan koherensi: PC tidak menyediakan SLC, jadi deteksi 'damage proxy' koheren (ARIA/DPM) tidak dilakukan.",
    "Perubahan backscatter juga datang dari hujan/kelembapan tanah, panen/tanam sawah, longsor, dan banjir; plasebo (adegan pra-kejadian) mengukur sebagian dari ini.",
    "Resolusi piksel 40 m; bangunan hanya titik pusat Open Buildings v3 pada sel 110 m (bukan jejak), jadi skor = bangunan sel x bagian piksel berubah.",
    "Satu geometri pengamatan (satu orbit/arah): kerusakan menghadap-jauh dan bayangan radar tak terlihat.",
    "Kebenaran = survei rumah rusak BNPB (InaRisk+Rutena, 24.427 rumah per 1 Des 2022), bukan cacah resmi lengkap; sel tanpa titik survei bernilai 0 (bisa belum disurvei).",
    "Hanya satu kejadian punya kebenaran di bawah tingkat kabupaten; uji lintas-kejadian TIDAK mungkin. Pemisahan kalibrasi/uji adalah antar-kecamatan di kejadian yang sama (tetangga berdekatan, ada autokorelasi spasial).",
]


# ---------------------------------------------------------------- kriteria & sha
def kanon(o):
    return json.dumps(o, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def muat_kriteria(jalur=None):
    with open(jalur or KRITERIA_JALUR, encoding="utf-8") as f:
        return json.load(f)


def sha_kriteria(k):
    return hashlib.sha256(kanon(k).encode("utf-8")).hexdigest()


def simpan_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def catat_jalan(baris):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "jalan.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(baris, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n")


# ---------------------------------------------------------------- statistik (murni)
def peringkat(v):
    """peringkat rerata (seri dirata-ratakan), mulai 1"""
    urut = sorted(range(len(v)), key=lambda i: v[i])
    r = [0.0] * len(v)
    i = 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and v[urut[j + 1]] == v[urut[i]]:
            j += 1
        for k in range(i, j + 1):
            r[urut[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(a, b):
    """None bila < 3 pasang atau salah satu konstan"""
    if len(a) < 3:
        return None
    ra, rb = peringkat(a), peringkat(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    sab = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    saa, sbb = sum((x - ma) ** 2 for x in ra), sum((y - mb) ** 2 for y in rb)
    return None if saa == 0 or sbb == 0 else sab / math.sqrt(saa * sbb)


def presisi_k(skor, benar, k):
    """bagian k teratas menurut skor yang juga k teratas menurut kebenaran (seri: urutan indeks, stabil)"""
    k = max(1, min(k, len(skor)))
    a = set(sorted(range(len(skor)), key=lambda i: -skor[i])[:k])
    b = set(sorted(range(len(benar)), key=lambda i: -benar[i])[:k])
    return len(a & b) / k


def ukuran_k(n, krit):
    return max(krit["presisi_k"]["min_k"], int(round(krit["presisi_k"]["pecahan"] * n)))


def kuantil(v, q):
    v = sorted(v)
    return v[min(len(v) - 1, max(0, int(q * (len(v) - 1) + .5)))]


def bootstrap_selisih(unit, fa, fb, krit):
    """CI selisih Spearman(fa) - Spearman(fb) dengan resampling BLOK 0,05 derajat (sel 1 km berdekatan tidak saling bebas).
    unit: daftar dict dengan 'lat','lon','benar'; fa/fb: fungsi unit->skor. -> (batas bawah, batas atas)"""
    bt = krit["bootstrap"]
    blok = {}
    for u in unit:
        blok.setdefault((math.floor(u["lat"] / bt["blok_derajat"]), math.floor(u["lon"] / bt["blok_derajat"])), []).append(u)
    kunci = sorted(blok)
    rng = random.Random(bt["benih"])
    sel = []
    for _ in range(bt["ulang"]):
        s = [u for k in (rng.choice(kunci) for _ in kunci) for u in blok[k]]
        b = [u["benar"] for u in s]
        ra, rb = spearman([fa(u) for u in s], b), spearman([fb(u) for u in s], b)
        if ra is not None and rb is not None:
            sel.append(ra - rb)
    if len(sel) < 50:
        return None, None
    a = (1 - bt["tingkat_ci"]) / 2
    return kuantil(sel, a), kuantil(sel, 1 - a)


# ---------------------------------------------------------------- Sentinel-1 (murni)
def pilih_adegan(items, tanggal, waktu_utc, sesudah_maks_hari, n_sebelum, kotak=None):
    """Kelompok (orbit relatif, arah, epsg) dengan adegan SESUDAH paling dini (<= sesudah_maks_hari) dan >= n_sebelum+1 adegan sebelum
    (n_sebelum untuk tumpukan nyata + 1 untuk plasebo). Item harus menutupi seluruh kotak [barat,selatan,timur,utara]. -> dict atau None."""
    t0 = f"{tanggal}T{waktu_utc}"
    batas = (dt.date.fromisoformat(tanggal) + dt.timedelta(days=sesudah_maks_hari)).isoformat() + "T23:59:59"
    grup = {}
    for i in items:
        if kotak and not (i["bbox"][0] <= kotak[0] and i["bbox"][1] <= kotak[1] and i["bbox"][2] >= kotak[2] and i["bbox"][3] >= kotak[3]):
            continue
        p = i["properties"]
        grup.setdefault((p.get("sat:relative_orbit"), p.get("sat:orbit_state"), p.get("proj:epsg")), []).append(i)
    terbaik = None
    for k, g in grup.items():
        g = sorted(g, key=lambda i: i["properties"]["datetime"])
        sebelum = [i for i in g if i["properties"]["datetime"][:19] < t0]
        sesudah = [i for i in g if t0 <= i["properties"]["datetime"][:19] <= batas]
        if not sesudah or len(sebelum) < n_sebelum + 1:
            continue
        cand = (sesudah[0]["properties"]["datetime"], str(k))
        if terbaik is None or cand < terbaik[0]:
            terbaik = (cand, k, sesudah[0], sebelum[::-1][:n_sebelum + 1])
    if not terbaik:
        return None
    return {"orbit": terbaik[1][0], "arah": terbaik[1][1], "epsg": terbaik[1][2], "sesudah": terbaik[2], "sebelum": terbaik[3]}  # sebelum: terbaru dulu


def hitung_z(sesudah_db, tumpukan_db):
    """z per piksel = (dB sesudah - rerata tumpukan) / max(sd tumpukan, median sd seluruh kotak). Piksel dengan data hilang -> NaN. -> (array z, lantai sd)"""
    n, m = len(sesudah_db), len(tumpukan_db)
    mu, sd = array.array("f", [NAN]) * n, array.array("f", [NAN]) * n
    sdv = []
    for k, vs in enumerate(zip(*tumpukan_db)):
        if sesudah_db[k] != sesudah_db[k] or any(v != v for v in vs):
            continue
        r = sum(vs) / m
        mu[k] = r
        sd[k] = s = math.sqrt(sum((v - r) ** 2 for v in vs) / (m - 1))
        sdv.append(s)
    lantai = max(1e-3, sorted(sdv)[len(sdv) // 2]) if sdv else 1.0  # 1e-3 dB hanya mencegah bagi nol
    z = array.array("f", [NAN]) * n
    for k in range(n):
        if mu[k] == mu[k]:
            z[k] = (sesudah_db[k] - mu[k]) / max(sd[k], lantai)
    return z, lantai


def daftar_kombo(krit):
    m = krit["model"]
    return [(p, a, zt) for p in m["polarisasi_dicoba"] for a in krit["arah_dicoba"] for zt in m["ambang_z_dicoba"]]


def topeng_piksel(zv, zh, kombo):
    """bitmask 'berubah kuat' per kombinasi; -1 bila VV atau VH tak sah"""
    if zv != zv or zh != zh:
        return -1
    zc = zv if abs(zv) >= abs(zh) else zh
    m = 0
    for b, (pol, arah, zt) in enumerate(kombo):
        z = zv if pol == "VV" else zh if pol == "VH" else zc
        if (abs(z) >= zt) if arah == "mutlak" else (z >= zt) if arah == "naik" else (z <= -zt):
            m |= 1 << b
    return m


def bagian_sel(piksel_topeng, nb):
    """piksel_topeng: daftar bitmask jendela (tanpa -1) -> daftar bagian berubah per kombinasi, atau None bila < 5 piksel sah"""
    if len(piksel_topeng) < 5:
        return None
    return [sum((m >> b) & 1 for m in piksel_topeng) / len(piksel_topeng) for b in range(nb)]


# ---------------------------------------------------------------- vonis (murni)
def vonis(rho_m, rho_naif, rho_plasebo, p_m, p_naif, ci_bawah, n_uji, krit):
    k = krit["lolos"]
    s = {
        "n_sel_uji_cukup": n_uji >= k["min_sel_uji"],
        "rho_model_cukup": rho_m is not None and rho_m >= k["min_rho_uji"],
        "mengalahkan_naif_terkuat": rho_m is not None and rho_naif is not None and rho_m - rho_naif >= k["selisih_pembanding_min"],
        "ci_selisih_di_atas_nol": ci_bawah is not None and ci_bawah > k["ci_selisih_bawah_min"],
        "presisi_k_tidak_kalah": p_m is not None and p_naif is not None and p_m - p_naif >= k["presisi_k_selisih_min"],
        "mengalahkan_plasebo": rho_m is not None and rho_plasebo is not None and rho_m - rho_plasebo >= k["selisih_plasebo_min"],
    }
    gagal = [n for n, v in s.items() if not v]
    return {"lolos": not gagal, "syarat": s, "gagal_di": gagal}


def evaluasi(unit, kombo, krit):
    """unit: dict dengan split ('kal'/'uji'), skor[list per kombo], plasebo[list], n, mmi, benar, lat, lon.
    Pilih kombinasi pada 'kal', nilai pada 'uji'. -> dict hasil"""
    kal = [u for u in unit if u["split"] == "kal"]
    uji = [u for u in unit if u["split"] == "uji"]
    tabel = []
    for b, kb in enumerate(kombo):
        rk = spearman([u["skor"][b] for u in kal], [u["benar"] for u in kal])
        ru = spearman([u["skor"][b] for u in uji], [u["benar"] for u in uji])
        tabel.append({"polarisasi": kb[0], "arah": kb[1], "z": kb[2], "rho_kal": rk, "rho_uji": ru})
    layak = [b for b in range(len(kombo)) if tabel[b]["rho_kal"] is not None]
    if not layak or len(uji) < 3:
        return {"tabel": tabel, "terpilih": None, "n_kal": len(kal), "n_uji": len(uji)}, None
    b = max(layak, key=lambda i: (tabel[i]["rho_kal"], -i))  # seri -> urutan daftar
    ben = [u["benar"] for u in uji]
    k = ukuran_k(len(uji), krit)
    model = lambda u: u["skor"][b]
    cara = {"model": model, "plasebo": lambda u: u["plasebo"][b],
            "naif_n_x_mmi": lambda u: u["n"] * u["mmi"], "naif_n": lambda u: u["n"], "naif_mmi": lambda u: u["mmi"]}
    hasil = {n: {"rho": spearman([f(u) for u in uji], ben), "presisi_k": presisi_k([f(u) for u in uji], ben, k)} for n, f in cara.items()}
    kuat = max(("naif_n_x_mmi", "naif_n", "naif_mmi"), key=lambda n: (hasil[n]["rho"] if hasil[n]["rho"] is not None else -2))
    lo, hi = bootstrap_selisih(uji, model, cara[kuat], krit)
    lo_p, hi_p = bootstrap_selisih(uji, model, cara["plasebo"], krit)
    v = vonis(hasil["model"]["rho"], hasil[kuat]["rho"], hasil["plasebo"]["rho"], hasil["model"]["presisi_k"], hasil[kuat]["presisi_k"], lo, len(uji), krit)
    return {"tabel": tabel, "terpilih": {"polarisasi": kombo[b][0], "arah": kombo[b][1], "z": kombo[b][2], "rho_kal": tabel[b]["rho_kal"]},
            "n_kal": len(kal), "n_uji": len(uji), "k": k, "presisi_acak": k / len(uji), "uji": hasil, "naif_terkuat": kuat,
            "selisih_vs_naif_terkuat": {"nilai": hasil["model"]["rho"] - hasil[kuat]["rho"] if hasil["model"]["rho"] is not None and hasil[kuat]["rho"] is not None else None, "ci90": [lo, hi]},
            "selisih_vs_plasebo": {"nilai": hasil["model"]["rho"] - hasil["plasebo"]["rho"] if hasil["model"]["rho"] is not None and hasil["plasebo"]["rho"] is not None else None, "ci90": [lo_p, hi_p]},
            "vonis": v}, b


# ---------------------------------------------------------------- pemuat (jaringan)
def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def muat_pustaka():
    sys.path[:0] = [os.path.join(AKAR, "scripts/data"), os.path.join(AKAR, "scripts/banjir")]
    import citra as C  # noqa: E402  scripts/data/citra.py (COG, ke_utm)
    CB = _muat("lab_citra_banjir", "scripts/banjir/citra_banjir.py")  # STAC, SAS, buka_float_pred3
    B = _muat("lab_bangunan", "scripts/umum/bangunan.py")
    G = _muat("lab_guncangan", "scripts/gempa/guncangan.py")
    return C, CB, B, G


def ulang(fn, n=4):
    for i in range(n):
        try:
            return fn()
        except Exception as e:  # PC kadang 504
            if i == n - 1:
                raise
            print(f"   ulang ({e})", file=sys.stderr)
            time.sleep(6 * (i + 1))


def ambil_kebenaran(jalur):
    """Titik rumah rusak BNPB -> [[kec,desa,skor,kelas,sumber,tgl_ms,lon,lat]]; di-cache. Layer tak mendukung paginasi: pakai rentang FID."""
    if os.path.exists(jalur):
        return json.load(open(jalur))
    def q(p):
        return json.load(urllib.request.urlopen(RR_URL + "?" + urllib.parse.urlencode(dict(p, f="json")), timeout=90))
    ids = sorted(ulang(lambda: q({"where": "1=1", "returnIdsOnly": "true"}))["objectIds"])
    out = []
    for i in range(0, len(ids), 1000):
        c = ids[i:i + 1000]
        r = ulang(lambda: q({"where": f"FID>={c[0]} and FID<={c[-1]}", "outFields": "nama_kecam,nama_kelur,tingkat_ke,kesimpulan,Sumber,answer_dat", "outSR": 4326}))
        out += [[f["attributes"]["nama_kecam"], f["attributes"]["nama_kelur"], f["attributes"]["tingkat_ke"], f["attributes"]["kesimpulan"], f["attributes"]["Sumber"],
                 f["attributes"]["answer_dat"], f["geometry"]["x"], f["geometry"]["y"]] for f in r["features"] if f.get("geometry")]
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    json.dump(out, open(jalur, "w"))
    return out


def cari_adegan(CB, C, kej, krit):
    k = kej["kotak"]
    t = dt.date.fromisoformat(kej["tanggal"])
    q = {"collections": ["sentinel-1-rtc"], "bbox": [k[0] + .02, k[1] + .02, k[2] - .02, k[3] - .02], "limit": 100,
         "datetime": f"{t - dt.timedelta(days=100)}T00:00:00Z/{t + dt.timedelta(days=kej['sesudah_maks_hari'] + 2)}T23:59:59Z"}
    items = ulang(lambda: json.loads(C.ambil(CB.PC_STAC, data=json.dumps(q).encode()))["features"])
    return pilih_adegan(items, kej["tanggal"], kej["waktu_utc"], kej["sesudah_maks_hari"], krit["model"]["n_sebelum"], [k[0] + .02, k[1] + .02, k[2] - .02, k[3] - .02])


def baca_grid(C, CB, item, token, pol, E0, N0, w, h, r):
    """w x h nilai linear (NaN = tanpa data) pada kisi UTM (pojok kiri-atas E0,N0; sisi r m), nearest dari level overview <= r."""
    url = item["assets"][pol.lower()]["href"] + "?" + token
    c = ulang(lambda: C.COG(url))
    tr = item["properties"]["proj:transform"]
    t = c.ifd[C.level_untuk(c, tr[0], r)]
    W, H, T = t[256], t[257], t[322]
    rs = tr[0] * c.ifd[0][256] / W
    kol = [int((E0 + (j + .5) * r - tr[2]) / rs) for j in range(w)]
    bar = [int((tr[5] - (N0 - (i + .5) * r)) / rs) for i in range(h)]
    tx = math.ceil(W / T)
    off, cnt = t[324], t[325]
    off, cnt = (off,) if isinstance(off, int) else off, (cnt,) if isinstance(cnt, int) else cnt
    perlu = {(y // T, x // T) for y in bar for x in kol if 0 <= y < H and 0 <= x < W}

    def satu(yx):
        k = yx[0] * tx + yx[1]
        return yx, (ulang(lambda: CB.buka_float_pred3(C.ambil(url, (off[k], off[k] + cnt[k])), T, T)) if cnt[k] else None)
    with ThreadPoolExecutor(8) as ex:
        ubin = dict(ex.map(satu, perlu))
    out = array.array("f", [NAN]) * (w * h)
    for i, y in enumerate(bar):
        for j, x in enumerate(kol):
            u = ubin.get((y // T, x // T)) if 0 <= y < H and 0 <= x < W else None
            if u:
                v = u[(y % T) * T + x % T]
                if v > 0 and v == v:
                    out[i * w + j] = v
    return out, rs


def ke_db(a):
    return array.array("f", (10 * math.log10(v) if v == v else NAN for v in a))


def jalan(kej_id="cianjur_2022"):
    mulai_t = time.time()
    krit = muat_kriteria()
    sha = sha_kriteria(krit)
    mulai = dt.datetime.now(UTC).isoformat(timespec="seconds")
    kej = krit["kejadian"][kej_id]
    catat_jalan({"skrip": "lab_kerusakan.py", "waktu": mulai, "id_jalan": mulai, "fase": "awal", "kriteria_sha": sha, "kejadian": kej_id, "git_commit": os.environ.get("GITHUB_SHA")})
    C, CB, B, G = muat_pustaka()
    wm = B._muat_wilayah()
    w = wm.Wilayah()
    dur = {}

    def tahap(n, t0):
        dur[n] = round(time.time() - t0, 1)
        print(f"  {n}: {dur[n]} dtk", flush=True)

    # 1. kebenaran
    t0 = time.time()
    titik = ambil_kebenaran(os.path.join(RAW, "cianjur_rr.json"))
    split = krit["split_kecamatan"]
    kec_split = {**{k: "kal" for k in split["kalibrasi"]}, **{k: "uji" for k in split["uji"]}}
    kec_tabel = {}
    sel_benar = {}
    di_luar = 0
    for kec, desa, sk, kelas, sumber, tgl, x, y in titik:
        e = kec_tabel.setdefault(kec, {"total": 0, "berat": 0, "sedang": 0, "ringan": 0})
        e["total"] += 1
        e[{"Rusak Berat": "berat", "Rusak Sedang": "sedang", "Rusak Ringan": "ringan"}.get(kelas, "ringan")] += 1
        if not isinstance(x, float) or not isinstance(y, float):
            di_luar += 1
            continue
        ident = w.cari(x, y)
        if not ident or ident[2] != kec or ident[0] != "32":  # koordinat harus jatuh di kecamatan bernama sama
            di_luar += 1
            continue
        s = sel_benar.setdefault((math.floor(y / .01), math.floor(x / .01)), [0, 0])
        s[0] += 1
        s[1] += kelas == "Rusak Berat"
    evalkec = {k for k, e in kec_tabel.items() if e["total"] >= krit["min_titik_kecamatan"]}
    assert evalkec == set(kec_split), (evalkec, set(kec_split))  # split di berkas kriteria harus sama dengan aturannya
    tahap("kebenaran", t0)

    # 2. bangunan (ubin S2 yang menutupi kotak)
    t0 = time.time()
    k = kej["kotak"]
    ada = B.daftar(6)
    tok = {B.token_s2(gy * .05, gx * .05, 6) for gx in range(int(k[0] / .05), int(k[2] / .05) + 2) for gy in range(int(k[1] / .05) - 1, int(k[3] / .05) + 2)} & set(ada)
    halus = {}
    for tk in sorted(tok):
        B.unduh(6, tk, ada[tk])
        h = B.proses_ubin(6, tk, w.cari)
        for key, (n, a) in h["halus"].get("32", {}).items():
            halus[key] = halus.get(key, 0) + n
    cells = []  # (lat, lon, n, kec)
    for key, n in halus.items():
        i, j = map(int, key.split(","))
        lat, lon = B.LAT0 + (i + .5) / B.HALUS, B.LON0 + (j + .5) / B.HALUS
        if k[0] <= lon <= k[2] and k[1] <= lat <= k[3]:
            ident = w.cari(lon, lat)
            cells.append((lat, lon, n, ident[2] if ident and ident[0] == "32" and ident[1] == "Cianjur" else None))
    tahap("bangunan", t0)

    # 3. SAR
    t0 = time.time()
    ad = cari_adegan(CB, C, kej, krit)
    if not ad:
        raise SystemExit("tak ada adegan Sentinel-1 yang memenuhi syarat")
    zona = ad["epsg"] % 100
    langkah = krit["model"]["langkah_m"]
    sudut = [C.ke_utm(la, lo, zona) for la in (k[1], k[3]) for lo in (k[0], k[2])]
    E0, N1 = min(s[0] for s in sudut), max(s[1] for s in sudut)
    E1, N0 = max(s[0] for s in sudut), min(s[1] for s in sudut)
    gw, gh = int((E1 - E0) / langkah), int((N1 - N0) / langkah)
    tok_sas = ulang(CB.token_sas)
    semua = [("sesudah", ad["sesudah"])] + [(f"sebelum{i}", it) for i, it in enumerate(ad["sebelum"])]  # sebelum0 = terbaru
    db = {}
    for nama, it in semua:
        for pol in ("VV", "VH"):
            cache = os.path.join(RAW, "s1", f"{it['id']}_{pol}_{gw}x{gh}_{int(E0)}_{int(N1)}.f32")
            if os.path.exists(cache):
                a = array.array("f")
                a.frombytes(open(cache, "rb").read())
            else:
                a, _ = baca_grid(C, CB, it, tok_sas, pol, E0, N1, gw, gh, langkah)
                os.makedirs(os.path.dirname(cache), exist_ok=True)
                open(cache + ".tmp", "wb").write(a.tobytes())
                os.replace(cache + ".tmp", cache)
            db[(nama, pol)] = ke_db(a)
        print(f"   adegan {nama} {it['properties']['datetime'][:10]}", flush=True)
    tahap("baca_sar", t0)

    t0 = time.time()
    nb = krit["model"]["n_sebelum"]
    kombo = daftar_kombo(krit)
    z_nyata, z_plasebo, lantai = {}, {}, {}
    for pol in ("VV", "VH"):
        z_nyata[pol], lantai[pol] = hitung_z(db[("sesudah", pol)], [db[(f"sebelum{i}", pol)] for i in range(nb)])
        z_plasebo[pol], _ = hitung_z(db[("sebelum0", pol)], [db[(f"sebelum{i}", pol)] for i in range(1, nb + 1)])
    tahap("z", t0)

    # 4. sel -> bagian berubah -> unit 1 km
    t0 = time.time()
    unit = {}
    for lat, lon, n, kec in cells:
        if kec is None:
            continue
        E, N = C.ke_utm(lat, lon, zona)
        c0, r0 = int((E - E0) / langkah), int((N1 - N) / langkah)
        u = unit.setdefault((math.floor(lat / .01), math.floor(lon / .01)), {"n": 0, "kec": {}, "skor": [0.0] * len(kombo), "plasebo": [0.0] * len(kombo), "n_sah": 0})
        u["n"] += n
        u["kec"][kec] = u["kec"].get(kec, 0) + n
        for tz, tujuan in ((z_nyata, "skor"), (z_plasebo, "plasebo")):
            ms = []
            for rr in range(r0 - 1, r0 + 2):
                for cc in range(c0 - 1, c0 + 2):
                    if 0 <= rr < gh and 0 <= cc < gw:
                        m = topeng_piksel(tz["VV"][rr * gw + cc], tz["VH"][rr * gw + cc], kombo)
                        if m >= 0:
                            ms.append(m)
            fr = bagian_sel(ms, len(kombo))
            if fr is None:
                continue
            if tujuan == "skor":
                u["n_sah"] += n
            for b in range(len(kombo)):
                u[tujuan][b] += n * fr[b]
    # 5. unit evaluasi
    daftar_unit, kec_skor = [], {}
    for (iy, ix), u in sorted(unit.items()):
        kec = max(u["kec"], key=lambda q: (u["kec"][q], q))
        for kc, nn in u["kec"].items():
            e = kec_skor.setdefault(kc, {"n": 0, "skor": [0.0] * len(kombo), "mmi_n": 0.0})
            e["n"] += nn
        lat, lon = (iy + .5) * .01, (ix + .5) * .01
        if kec not in kec_split or u["n"] < krit["min_bangunan_sel"] or u["n_sah"] < .5 * u["n"]:
            continue
        mmi = G.mmi_perkiraan(kej["magnitudo"], G.jarak_km(kej["pusat"][0], kej["pusat"][1], lat, lon), kej["dalam_km"], kej["jenis_sumber"])
        b_ = sel_benar.get((iy, ix), [0, 0])
        daftar_unit.append({"lat": lat, "lon": lon, "kec": kec, "split": kec_split[kec], "n": u["n"], "mmi": mmi, "benar": b_[0], "benar_berat": b_[1],
                            "skor": u["skor"], "plasebo": u["plasebo"]})
    hasil, b = evaluasi(daftar_unit, kombo, krit)
    # kecamatan (pelengkap)
    for u in daftar_unit:
        e = kec_skor[u["kec"]]
        e["mmi_n"] += u["mmi"] * u["n"]
    kec_baris = []
    for kc in sorted(kec_split):
        e, t_ = kec_skor.get(kc, {"n": 0, "skor": [0.0] * len(kombo), "mmi_n": 0.0}), kec_tabel[kc]
        sk = sum(u["skor"][b] for u in daftar_unit if u["kec"] == kc)
        nn = sum(u["n"] for u in daftar_unit if u["kec"] == kc)
        mm = sum(u["mmi"] * u["n"] for u in daftar_unit if u["kec"] == kc) / nn if nn else None
        kec_baris.append({"kec": kc, "split": kec_split[kc], "rr_total": t_["total"], "rr_berat": t_["berat"], "bangunan": nn, "skor": sk, "mmi_rata": mm, "naif_n_x_mmi": nn * mm if mm else None})
    kecm = {"n": len(kec_baris),
            "rho_model": spearman([q["skor"] for q in kec_baris], [q["rr_total"] for q in kec_baris]),
            "rho_naif_n_x_mmi": spearman([q["naif_n_x_mmi"] or 0 for q in kec_baris], [q["rr_total"] for q in kec_baris]),
            "rho_naif_n": spearman([q["bangunan"] for q in kec_baris], [q["rr_total"] for q in kec_baris]),
            "catatan": "11 kecamatan, jumlah kecil: hanya deskriptif, tidak menentukan vonis"}
    tahap("agregasi_uji", t0)
    dur["total"] = round(time.time() - mulai_t, 1)

    doc = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds"), "versi": 1, "status": "selesai", "bukan_produksi": True,
           "kriteria_sha": sha, "kriteria": krit, "jujur": JUJUR,
           "kejadian": {kej_id: {
               "nama": "Gempa Cianjur 21 Nov 2022 (M5,6)", "tingkat_kebenaran": "kecamatan dan sel 1 km (titik survei rumah rusak BNPB)",
               "adegan": {"orbit": ad["orbit"], "arah": ad["arah"], "sesudah": {"id": ad["sesudah"]["id"], "tgl": ad["sesudah"]["properties"]["datetime"][:10]},
                          "sebelum": [{"id": i["id"], "tgl": i["properties"]["datetime"][:10]} for i in ad["sebelum"]],
                          "tumpukan_nyata": "sebelum0..4", "plasebo": "sesudah=sebelum0, tumpukan=sebelum1..5"},
               "kisi": {"lebar": gw, "tinggi": gh, "langkah_m": langkah, "lantai_sd_db": {p: round(v, 3) for p, v in lantai.items()}},
               "kebenaran": {"titik": len(titik), "di_luar_kecamatan_namanya": di_luar, "per_kecamatan": kec_tabel},
               "bangunan": {"sel_110m": len(cells), "total": sum(c[2] for c in cells)},
               "hasil": hasil, "kecamatan": kec_baris, "kecamatan_metrik": kecm,
               "unit": [{"lat": round(u["lat"], 3), "lon": round(u["lon"], 3), "kec": u["kec"], "split": u["split"], "n": u["n"], "mmi": round(u["mmi"], 2), "benar": u["benar"],
                         "skor": round(u["skor"][b], 1), "plasebo": round(u["plasebo"][b], 1)} for u in daftar_unit],
               "durasi_dtk": dur}},
           "kejadian_lain": [
               {"id": "sulbar_2021", "nama": "Gempa Sulbar (Mamuju/Majene) 15 Jan 2021", "status": "tidak_dijalankan",
                "alasan": "kebenaran hanya per kabupaten (DIBI/Majene-Mamuju, 2-3 unit): Spearman tak bermakna; Open Buildings Sulbar belum diunduh"},
               {"id": "palu_2018", "nama": "Gempa-tsunami-likuefaksi Palu 28 Sep 2018", "status": "tidak_dijalankan",
                "alasan": "kebenaran hanya per kabupaten (4-5 unit); kerusakan didominasi tsunami/likuefaksi, bukan getaran; Open Buildings Sulteng belum diunduh"}]}
    simpan_json(os.path.join(OUT, "kerusakan.json"), doc)
    catat_jalan({"skrip": "lab_kerusakan.py", "waktu": dt.datetime.now(UTC).isoformat(timespec="seconds"), "id_jalan": mulai, "fase": "akhir", "kriteria_sha": sha,
                 "kejadian": kej_id, "vonis": hasil.get("vonis", {}).get("lolos"), "durasi_dtk": dur["total"]})
    tulis_ringkas(doc)
    print(json.dumps(hasil.get("vonis"), ensure_ascii=False), f"total {dur['total']} dtk")


def f3(v):
    return "-" if v is None else f"{v:.3f}"


def tulis_ringkas(doc):
    L = ["# Lab kerusakan bangunan dari radar (damage proxy amplitudo)", "",
         f"Status: **{doc['status']}**, dibuat {doc['dibuat']}, kriteria_sha {doc['kriteria_sha'][:12]}. Bukan produksi, tanpa layar.", ""]
    for kid, e in doc["kejadian"].items():
        h = e["hasil"]
        L += [f"## {e['nama']}", "", f"Kebenaran: {e['tingkat_kebenaran']}. Orbit {e['adegan']['orbit']} {e['adegan']['arah']}, sesudah {e['adegan']['sesudah']['tgl']}, sebelum {', '.join(s['tgl'] for s in e['adegan']['sebelum'][:5])}.", ""]
        if not h.get("terpilih"):
            L += ["Tidak dapat dinilai (unit kurang).", ""]
            continue
        v, t = h["vonis"], h["terpilih"]
        L += [f"**Vonis: {'LOLOS' if v['lolos'] else 'GAGAL'}**" + ("" if v["lolos"] else f" (tidak terpenuhi: {', '.join(v['gagal_di'])})"), "",
              f"Kombinasi dipilih di kecamatan kalibrasi: {t['polarisasi']}, arah {t['arah']}, z >= {t['z']} (rho kalibrasi {f3(t['rho_kal'])}). Sel kalibrasi {h['n_kal']}, sel uji {h['n_uji']}, k = {h['k']} (acak {h['presisi_acak']:.2f}).", "",
              "| Pembanding (sel uji) | rho Spearman | presisi@k |", "|---|---|---|"]
        for n, d in h["uji"].items():
            L.append(f"| {n} | {f3(d['rho'])} | {f3(d['presisi_k'])} |")
        L += ["", f"Selisih model - naif terkuat ({h['naif_terkuat']}): {f3(h['selisih_vs_naif_terkuat']['nilai'])}, CI90 blok {[None if x is None else round(x, 3) for x in h['selisih_vs_naif_terkuat']['ci90']]}.",
              f"Selisih model - plasebo: {f3(h['selisih_vs_plasebo']['nilai'])}, CI90 {[None if x is None else round(x, 3) for x in h['selisih_vs_plasebo']['ci90']]}.", "",
              f"Kecamatan (n={e['kecamatan_metrik']['n']}, deskriptif): rho model {f3(e['kecamatan_metrik']['rho_model'])}, naif n x MMI {f3(e['kecamatan_metrik']['rho_naif_n_x_mmi'])}, naif n {f3(e['kecamatan_metrik']['rho_naif_n'])}.",
              f"Waktu proses: {e['durasi_dtk']['total']} dtk ({', '.join(f'{k} {v}' for k, v in e['durasi_dtk'].items() if k != 'total')}).", ""]
    L += ["## Kejadian lain", ""] + [f"- {x['nama']}: {x['status']}, {x['alasan']}" for x in doc["kejadian_lain"]]
    L += ["", "## Keterbatasan", ""] + ["- " + x for x in doc["jujur"]]
    open(os.path.join(OUT, "kerusakan_ringkas.md"), "w").write("\n".join(L) + "\n")


# ---------------------------------------------------------------- uji (tanpa jaringan)
def uji():
    krit = muat_kriteria()
    # statistik
    assert peringkat([3, 1, 1, 2]) == [4.0, 1.5, 1.5, 3.0]
    assert abs(spearman([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-12 and abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12
    assert spearman([1, 1, 1], [1, 2, 3]) is None and spearman([1, 2], [1, 2]) is None
    assert presisi_k([5, 4, 3, 2, 1], [1, 2, 3, 4, 5], 2) == 0 and presisi_k([5, 4, 3, 2, 1], [9, 8, 1, 1, 1], 2) == 1
    assert ukuran_k(30, krit) == 10 and ukuran_k(300, krit) == 30
    assert sha_kriteria({"a": 1, "b": 2}) == sha_kriteria({"b": 2, "a": 1}) != sha_kriteria({"a": 1, "b": 3})
    assert len(kanon(krit)) > 100 and set(krit["split_kecamatan"]["kalibrasi"]).isdisjoint(krit["split_kecamatan"]["uji"])
    # z-score: tumpukan tetap, sesudah turun 3 sd -> z ~ -3; piksel hilang -> NaN; lantai sd mencegah pembagian ~0
    tump = [array.array("f", [-10.0, -10.0]), array.array("f", [-11.0, -10.0]), array.array("f", [-9.0, -10.0]), array.array("f", [-10.5, -10.0]), array.array("f", [-9.5, -10.0])]
    z, lantai = hitung_z(array.array("f", [-10.0 - 3 * math.sqrt(.625), -12.0]), tump)
    assert abs(z[0] + 3) < 1e-4 and lantai > 0 and abs(z[1] + 2 / lantai) < 1e-3  # piksel 2 sd=0 -> dilantai
    z2, _ = hitung_z(array.array("f", [NAN, -10.0]), tump)
    assert z2[0] != z2[0]
    # topeng piksel
    kb = [("VV", "mutlak", 2.0), ("VH", "turun", 3.0), ("VV+VH", "naik", 2.0)]
    assert topeng_piksel(-2.5, 0.0, kb) == 0b001 and topeng_piksel(0.0, -3.5, kb) == 0b010
    assert topeng_piksel(NAN, 1.0, kb) == -1
    assert topeng_piksel(2.5, -3.5, kb) == 0b010 | 0b001 and topeng_piksel(3.0, 2.5, kb) == 0b101
    assert bagian_sel([1, 1, 0, 0], 1) is None and bagian_sel([1, 1, 0, 0, 1], 1) == [0.6]
    # pilih adegan: orbit 98 sesudah 2 hari vs orbit 47 sesudah 10 hari; sebelum dihitung hanya sebelum waktu gempa
    def it(tgl, orb, arah="ascending", bb=(106, -8, 108, -6)):
        return {"id": f"{orb}_{tgl}", "bbox": list(bb), "properties": {"datetime": f"{tgl}T11:15:00Z", "sat:relative_orbit": orb, "sat:orbit_state": arah, "proj:epsg": 32748}}
    seri = [it(f"2022-{m}", 98) for m in ("09-12", "09-24", "10-06", "10-18", "10-30", "11-11", "11-23")] + [it("2022-11-21", 98), it("2022-11-12", 47, "descending"), it("2022-12-01", 47, "descending")]
    p = pilih_adegan(seri, "2022-11-21", "06:21:00", 5, 5, [106.5, -7.5, 107.5, -6.5])
    assert p["orbit"] == 98 and len(p["sebelum"]) == 6
    assert p["sesudah"]["id"] == "98_2022-11-21" and [i["id"] for i in p["sebelum"]][0] == "98_2022-11-11" and p["sebelum"][-1]["id"] == "98_2022-09-12"
    assert pilih_adegan(seri[:3], "2022-11-21", "06:21:00", 5, 5) is None
    assert pilih_adegan([it("2022-10-0%d" % i, 1, bb=(107.1, -7, 107.2, -6.9)) for i in range(1, 8)] + [it("2022-11-22", 1, bb=(107.1, -7, 107.2, -6.9))], "2022-11-21", "06:21:00", 5, 5, [106.5, -7.5, 107.5, -6.5]) is None  # tak menutupi kotak
    # evaluasi ujung ke ujung (sintetis): dunia A skor ~ kebenaran (lolos), dunia B skor acak (gagal), dunia C plasebo sama baiknya (gagal)
    kombo = daftar_kombo(krit)
    rng = random.Random(7)

    def dunia(skor_fn, plasebo_fn):
        us = []
        for i in range(160):
            n = rng.randint(30, 400)
            mmi = 5 + rng.random()
            benar = int(n * rng.random() ** 2 * (mmi - 4))  # kebenaran bergantung pada n, mmi, dan acak
            lat, lon = -6.7 - .01 * (i // 16), 107.0 + .01 * (i % 16)
            us.append({"lat": lat, "lon": lon, "kec": "x", "split": "kal" if (i // 16) % 2 == 0 else "uji", "n": n, "mmi": mmi, "benar": benar,
                       "skor": [skor_fn(benar, n) for _ in kombo], "plasebo": [plasebo_fn(benar, n) for _ in kombo]})
        return us
    hasil_a, _ = evaluasi(dunia(lambda b, n: b + rng.random() * 3, lambda b, n: rng.random() * n), kombo, krit)
    assert hasil_a["vonis"]["lolos"], hasil_a["vonis"]
    hasil_b, _ = evaluasi(dunia(lambda b, n: rng.random() * n, lambda b, n: rng.random() * n), kombo, krit)
    assert not hasil_b["vonis"]["lolos"]
    hasil_c, _ = evaluasi(dunia(lambda b, n: b + rng.random() * 3, lambda b, n: b + rng.random() * 3), kombo, krit)
    assert not hasil_c["vonis"]["lolos"] and "mengalahkan_plasebo" in hasil_c["vonis"]["gagal_di"]
    hasil_d, _ = evaluasi(dunia(lambda b, n: b, lambda b, n: 0)[:6], kombo, krit)  # unit terlalu sedikit -> tak dinilai
    assert hasil_d["terpilih"] is None or not hasil_d["vonis"]["lolos"]
    # bootstrap deterministik (benih tetap)
    us = dunia(lambda b, n: b + rng.random(), lambda b, n: 0)
    uu = [u for u in us if u["split"] == "uji"]
    a1 = bootstrap_selisih(uu, lambda u: u["skor"][0], lambda u: u["n"], krit)
    assert a1 == bootstrap_selisih(uu, lambda u: u["skor"][0], lambda u: u["n"], krit) and a1[0] <= a1[1]
    print("lab_kerusakan uji: OK")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if arg == "uji":
        uji()
    elif arg == "jalan":
        jalan()
    elif arg == "ringkas":
        tulis_ringkas(json.load(open(os.path.join(OUT, "kerusakan.json"))))
    else:
        raise SystemExit(__doc__)
