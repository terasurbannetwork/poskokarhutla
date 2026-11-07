#!/usr/bin/env python3
"""Uji relevansi pakar (ALG §11, RU §2.9; KM-C10). Dua tahap, dua sesi:
 (a) --siapkan : 60 masalah (6 per aspek, tersebar bahaya dan kab) x 15 pakar gabungan dari 3 sistem (Skor, h-index serumpun, terdekat lama), lembar BUTA
                 (kode acak berbenih, urutan acak per penilai, tanpa kolom sistem/peringkat/h; 3 karya paling relevan tiap pakar sama untuk ketiga sistem).
                 Privat di --keluar: kunci.json (peta kode->id) dan lembar_<p>.csv. Aman untuk git di --label-dir: kunci_anon.json (tanpa peta) dan syarat.json
                 (hash syarat + sistem yang diuji + kunci_anon).
 (b) --label   : dua label staf (masalah_id,kode,nilai 0/1/2) -> nDCG@10 (+@5), kappa (+berbobot), selang bootstrap -> public/data/kemitraan/uji_cocok.json.
Lolos bila nDCG(Skor) >= maks(h, terdekat) + 0,10, kappa tak berbobot >= 0,4, dan >= 50 masalah dipakai. Pil "Belum diuji" hanya lepas lewat
status_pakar()/verifikasi(): menghitung ULANG dari label/cocok_<penilai>.csv + kunci_anon.json dan mensyaratkan sama dengan uji_cocok.json.
Label TIDAK dikarang: tanpa dua berkas label lengkap hasilnya tetap lolos=false.
Pakai: python3 -I scripts/kemitraan/uji_cocok.py --siapkan --induk I --kampus K --cocok DIR --korpus DIR --penilai a,b --keluar DIR [--benih S] [--tanggal D] [--label-dir D]
       python3 -I scripts/kemitraan/uji_cocok.py --label A.csv B.csv [--label-dir D]   |  --bila-ada-label  |  --cek"""
import collections, csv, datetime, glob, hashlib, inspect, json, math, os, random, shutil, sys, tempfile

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from konst import KONST  # noqa: E402
import geo  # noqa: E402
import indeks_bm25 as ib  # noqa: E402
import korpus as kp  # noqa: E402
import teks  # noqa: E402

UJ = KONST["UJI"]
DIR = os.path.join(AKAR, "scripts", "kemitraan")
UJI_JSON = os.path.join(AKAR, "public", "data", "kemitraan", "uji_cocok.json")
LABEL_DIR = os.path.join(AKAR, "data", "kajian-bnpb", "kampus", "label")
SISTEM = ("skor", "h", "terdekat")
KOLOM_LABEL = {"masalah_id", "kode", "nilai"}  # satu-satunya kolom yang boleh ada di berkas label dalam repo
# rumus yang ikut dibekukan (berubah = hash berubah = uji diulang dari label baru)
FORMULA = {"ndcg": "DCG (2^g-1)/log2(i+2) pada k teratas (utama k=10, sensitivitas k=5); g = rerata dua penilai; ideal = urut g di gabungan; "
                   "TAK TERLABEL = 0 (batas bawah, sama untuk ketiga sistem); masalah tanpa g>0 dilewati",
           "kappa": "Cohen tak berbobot, 3 kelas, atas semua pasangan (masalah, pakar): ambang lolos; kappa berbobot kuadrat hanya dilaporkan",
           "gabung": "bergilir antar tiga sistem dengan urutan sistem diacak berbenih per masalah, sampai POOL unik",
           "h": "serumpun (RUMPUN_BAHAYA, gabungan) urut h turun, id naik",
           "terdekat": "serumpun (RUMPUN_BAHAYA gabungan; /akademisi/terdekat lama: satu rumpun), kampus bertitik, km dibulatkan 0,1 (setengah ke atas), urut km naik, h turun, "
                       "urutan induk; BEDA dari rute lama: tanpa parameter prov/luar_prov, tanpa n (diambil 10), pusat = pusat kab bukan lat/lon masukan",
           "bootstrap": "selisih nDCG@10 per masalah (Skor - maks(h, terdekat)), 2000 resampel berpasangan, benih tetap, selang persentil 95%; hanya dilaporkan"}


def sha(o):
    return hashlib.sha256(json.dumps(o, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def hx(*s):
    return hashlib.sha256("|".join(map(str, s)).encode()).hexdigest()


def _fs(n):
    return hashlib.sha256(open(os.path.join(DIR, n), "rb").read()).hexdigest()


def syarat():
    """Segala yang menentukan hasil: rumus, ambang, SISTEM yang diuji (berkas + bobot), dan kode penghitung itu sendiri."""
    fn = (ndcg, kappa, kappa_berbobot, putusan, gabung, bootstrap)
    return {"v": 2, **UJ, "formula": FORMULA,
            "sistem_sha256": {n: _fs(n) for n in ("cocok_pakar.py", "indeks_bm25.py", "teks.py", "kamus.json")},
            "bobot": {k: KONST[k] for k in ("BOBOT", "BM25", "PAKAR", "SOLUSI")},
            "hitung_sha256": {f.__name__: hashlib.sha256(inspect.getsource(f).encode()).hexdigest() for f in fn}}


# ---------------------------------------------------------------- murni
def kode_pakar(benih, mid, pid):
    return "P" + hx(benih, mid, pid)[:10]


def urut_sistem(benih, mid):
    return sorted(SISTEM, key=lambda s: hx(benih, mid, s))


def gabung(sis, n=None, urut=SISTEM):
    """Bergilir dari tiga daftar peringkat (urutan sistem `urut`), n id unik (kurang bila ketiganya habis)."""
    n, out = n or UJ["POOL"], []
    for i in range(max(len(sis[s]) for s in SISTEM)):
        for s in urut:
            if i < len(sis[s]) and sis[s][i] not in out and len(out) < n:
                out.append(sis[s][i])
    return out


def pilih_masalah(cands, benih):
    """6 per aspek, tersebar bahaya (bergilir, urutan acak berbenih) dan kab (maks MAKS_PER_KAB). Kurang -> ValueError."""
    out, n_kab = [], collections.Counter()
    for a in KONST["ASPEK"]:
        per = {}
        for c in sorted((c for c in cands if c["A"] == a), key=lambda c: hx(benih, c["id"])):
            per.setdefault(c["B"], []).append(c)
        urut, ambil, maju = sorted(per, key=lambda b: hx(benih, a, b)), [], True
        while len(ambil) < UJ["PER_ASPEK"] and maju:
            maju = False
            for b in urut:
                if len(ambil) >= UJ["PER_ASPEK"]:
                    break
                for i, c in enumerate(per[b]):
                    if n_kab[c["kab"]] < UJ["MAKS_PER_KAB"]:
                        ambil.append(per[b].pop(i)); n_kab[c["kab"]] += 1; maju = True
                        break
        if len(ambil) < UJ["PER_ASPEK"]:
            raise ValueError(f"aspek {a}: hanya {len(ambil)} masalah memenuhi syarat (maks {UJ['MAKS_PER_KAB']} per kab), butuh {UJ['PER_ASPEK']}")
        out += ambil
    return out


def ndcg(rank, gain, k=None):
    k = k or UJ["NDCG_K"]
    dcg = lambda gs: sum((2 ** g - 1) / math.log2(i + 2) for i, g in enumerate(gs))
    ideal = dcg(sorted(gain.values(), reverse=True)[:k])
    return None if ideal == 0 else dcg([gain.get(x, 0.0) for x in rank[:k]]) / ideal


def kappa(a, b):
    """Cohen tak berbobot. None bila tak terdefinisi."""
    n = len(a)
    po = sum(x == y for x, y in zip(a, b)) / n
    pe = sum((a.count(c) / n) * (b.count(c) / n) for c in (0, 1, 2))
    return None if pe >= 1 else (po - pe) / (1 - pe)


def kappa_berbobot(a, b):
    """Cohen berbobot kuadrat (bobot (i-j)^2). Hanya dilaporkan."""
    n = len(a)
    o = collections.Counter(zip(a, b))
    ra, rb = [a.count(c) / n for c in range(3)], [b.count(c) / n for c in range(3)]
    num = sum((i - j) ** 2 * o[(i, j)] / n for i in range(3) for j in range(3))
    den = sum((i - j) ** 2 * ra[i] * rb[j] for i in range(3) for j in range(3))
    return None if den == 0 else 1 - num / den


def bootstrap(d):
    """Selang persentil 95% rerata d (resampel berpasangan, benih tetap). None bila d kosong."""
    if not d:
        return None
    rng, B = random.Random(20261105), UJ["BOOT"]
    m = sorted(sum(rng.choices(d, k=len(d))) / len(d) for _ in range(B))
    return [m[int(0.025 * B)], m[int(0.975 * B) - 1]]


def putusan(nd, kp_, n):
    """Lolos bila Skor >= maks(h, terdekat) + MARJIN, kappa >= KAPPA_MIN, dan n masalah dipakai >= MIN_DIPAKAI (4 desimal agar tepat di batas tak melantur)."""
    if kp_ is None or any(nd[s] is None for s in SISTEM) or n < UJ["MIN_DIPAKAI"]:
        return False
    return round(nd["skor"], 4) >= round(max(nd["h"], nd["terdekat"]) + UJ["MARJIN"], 4) and round(kp_, 4) >= UJ["KAPPA_MIN"]


def hitung(kunci, la, lb):
    """la, lb = {(masalah_id, kode): 0|1|2}. Wajib lengkap atas seluruh pool kunci."""
    perlu = {(m, k) for m, ks in kunci["pool"].items() for k in ks}
    for nm, l in (("A", la), ("B", lb)):
        if set(l) != perlu:
            raise SystemExit(f"label penilai {nm} tidak lengkap: {len(set(l) & perlu)} dari {len(perlu)} pasangan, {len(set(l) - perlu)} tak dikenal")
    ps = sorted(perlu)
    x, y = [la[p] for p in ps], [lb[p] for p in ps]
    kp_, kw = kappa(x, y), kappa_berbobot(x, y)
    p10, p5, sel = {s: [] for s in SISTEM}, {s: [] for s in SISTEM}, []
    for m, ks in kunci["pool"].items():
        g = {k: (la[(m, k)] + lb[(m, k)]) / 2 for k in ks}
        v = {s: ndcg(kunci["sistem"][m][s], g) for s in SISTEM}
        if v["skor"] is None:
            continue
        for s in SISTEM:
            p10[s].append(v[s]); p5[s].append(ndcg(kunci["sistem"][m][s], g, 5))
        sel.append(v["skor"] - max(v["h"], v["terdekat"]))
    rata = lambda l: sum(l) / len(l) if l else None
    nd = {s: rata(p10[s]) for s in SISTEM}
    r4 = lambda v: None if v is None else round(v, 4)
    ci = bootstrap(sel)
    return {"ndcg_skor": r4(nd["skor"]), "ndcg_h": r4(nd["h"]), "ndcg_terdekat": r4(nd["terdekat"]),
            "ndcg5_skor": r4(rata(p5["skor"])), "ndcg5_h": r4(rata(p5["h"])), "ndcg5_terdekat": r4(rata(p5["terdekat"])),
            "selisih_ci95": None if ci is None else [r4(ci[0]), r4(ci[1])], "selisih_rerata": r4(rata(sel)),
            "kappa": r4(kp_), "kappa_berbobot": r4(kw), "kappa_dipakai": "tak berbobot (keputusan pemilik: berbobot hanya pembanding)",
            "tak_terlabel": "dihitung 0: nDCG adalah batas bawah, sama untuk ketiga sistem",
            "n_masalah": len(kunci["pool"]), "n_masalah_dipakai": len(sel), "n_pasangan": len(ps), "penyaringan": kunci.get("penyaringan"),
            "lolos": putusan(nd, kp_, len(sel))}


def _muat(ld):
    beku = json.load(open(os.path.join(ld, "syarat.json"), encoding="utf-8"))
    raw = open(os.path.join(ld, "kunci_anon.json"), "rb").read()
    return beku, raw


def verifikasi(uji, label_dir=None):
    """True hanya bila lolos=true, hash syarat (termasuk sistem yang diuji) dan kunci sama dengan yang dibekukan, DAN hitung ulang dari label/cocok_<penilai>.csv
    di repo menghasilkan persis uji_cocok.json. Mengetik lolos=true dengan angka yang masuk akal ditolak."""
    ld = label_dir or LABEL_DIR
    try:
        if uji.get("lolos") is not True:
            return False
        beku, raw = _muat(ld)
        if not (uji["syarat_sha256"] == beku["syarat_sha256"] == sha(syarat()) and uji["kunci_sha256"] == beku["kunci_sha256"] == hashlib.sha256(raw).hexdigest()):
            return False
        h = hitung(json.loads(raw), *[baca_label(os.path.join(ld, f"cocok_{p}.csv")) for p in beku["penilai"]])
        return h["lolos"] and all(uji.get(k) == v for k, v in h.items())
    except (OSError, ValueError, KeyError, TypeError, AttributeError, SystemExit):
        return False


def status_pakar(path=None, label_dir=None):
    """Satu-satunya pintu mencabut pil 'Belum diuji'. Berkas hilang/rusak/tak terhitung ulang = tetap belum diuji."""
    try:
        return verifikasi(json.load(open(path or UJI_JSON, encoding="utf-8")), label_dir)
    except (OSError, ValueError):
        return False


def tanpa_label():
    return {"v": 2, "status": "belum_ada_label", "lolos": False, "catatan": "Label relevansi 2 staf (KM-C09) belum ada; skor pakar tetap berpil Belum diuji."}


# ---------------------------------------------------------------- label
def baca_label(path):
    """CSV masalah_id,kode,nilai. Di dalam repo kolomnya HARUS persis tiga itu (tanpa nama/kampus/catatan); di luar repo kolom lain diabaikan."""
    with open(path, encoding="utf-8", newline="") as f:
        rd = csv.DictReader(f)
        if not KOLOM_LABEL <= set(rd.fieldnames or []):
            raise SystemExit(f"{path}: kolom wajib masalah_id,kode,nilai")
        if os.path.realpath(path).startswith(os.path.realpath(AKAR) + os.sep) and set(rd.fieldnames) != KOLOM_LABEL:
            raise SystemExit(f"{path}: di dalam repo hanya boleh kolom masalah_id,kode,nilai (ada tambahan {sorted(set(rd.fieldnames) - KOLOM_LABEL)}); salin tiga kolom itu saja")
        out = {}
        for i, row in enumerate(rd, 2):
            if row["nilai"] not in ("0", "1", "2"):
                raise SystemExit(f"{path}:{i}: nilai '{row['nilai']}' harus 0, 1, atau 2 (kosong = belum dinilai)")
            p = (row["masalah_id"], row["kode"])
            if p in out:
                raise SystemExit(f"{path}:{i}: pasangan {p} ganda")
            out[p] = int(row["nilai"])
    return out


def tulis_json(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, sort_keys=True, indent=1)
        f.write("\n")


def jalankan(label_dir=None, keluar=None, files=None):
    ld = label_dir or LABEL_DIR
    beku, raw = _muat(ld)
    if beku["syarat_sha256"] != sha(syarat()):
        raise SystemExit("syarat/rumus/sistem yang diuji berubah sesudah dibekukan (hash berbeda): ulang --siapkan dan label baru, jangan mengubah apa pun sesudah melihat label")
    if hashlib.sha256(raw).hexdigest() != beku["kunci_sha256"]:
        raise SystemExit("kunci_anon.json tidak sama dengan yang dibekukan saat --siapkan")
    if files is None:
        ada = {os.path.basename(f)[6:-4] for f in glob.glob(os.path.join(ld, "cocok_*.csv"))}
        if ada - set(beku["penilai"]):
            raise SystemExit(f"berkas label penilai {sorted(ada - set(beku['penilai']))} bukan penilai terbeku {beku['penilai']}")
        files = [os.path.join(ld, f"cocok_{p}.csv") for p in beku["penilai"]]
        for p, f in zip(beku["penilai"], files):
            if not os.path.exists(f):
                raise SystemExit(f"label penilai {p} tidak ada: {f}")
    if len(files) != 2:
        raise SystemExit(f"butuh tepat 2 berkas label (dua penilai), dapat {len(files)}")
    h = hitung(json.loads(raw), baca_label(files[0]), baca_label(files[1]))
    h = {"v": 2, "status": "lolos" if h["lolos"] else "tidak_lolos", "dibekukan": beku["dibekukan"], "syarat_sha256": beku["syarat_sha256"],
         "kunci_sha256": beku["kunci_sha256"], "syarat": syarat(), **h}
    tulis_json(keluar or UJI_JSON, h)
    return h


# ---------------------------------------------------------------- siapkan
def sistem_pembanding(induk, kampus, b, pusat):
    """-> (id urut h, id urut terdekat) serumpun bahaya b. Induk: [id, nama, kampus, rumpun[], h, ...]. Terdekat meniru src/akademisi.js:
    km dibulatkan 0,1 (Math.round), urut km naik lalu h turun lalu urutan induk."""
    rp = set(KONST["RUMPUN_BAHAYA"][b])
    ok = [(i, o) for i, o in enumerate(induk) if rp & set(o[3] or [])]
    a = [o[0] for i, o in sorted(ok, key=lambda t: (-(t[1][4] or 0), t[1][0]))]
    num = lambda v: isinstance(v, (int, float))
    bertitik = [(i, o) for i, o in ok if num((kampus.get(o[2]) or {}).get("lat")) and num((kampus.get(o[2]) or {}).get("lon"))]
    km = lambda o: math.floor(geo.haversine_km(kampus[o[2]]["lat"], kampus[o[2]]["lon"], pusat[0], pusat[1]) * 10 + 0.5) / 10
    t = [o[0] for i, o in sorted(bertitik, key=lambda t: (km(t[1]), -(t[1][4] or 0), t[0]))] if pusat else []
    return a, t


def karya_relevan(karya, qtok, n=3):
    """n karya paling relevan: tumpang-tindih token (judul+abstrak) dengan kueri masalah, seri sitasi turun lalu urutan. Tak ada tumpang-tindih = tidak ditampilkan.
    Hanya bergantung pada (pakar, masalah), jadi sama untuk ketiga sistem."""
    sk = []
    for i, k in enumerate(karya or []):
        ov = len(set(teks.token((k.get("judul") or "") + " " + (k.get("abstrak") or ""))) & qtok)
        if ov > 0:
            sk.append((-ov, -(k.get("sitasi") or 0), i))
    return [karya[i] for _, _, i in sorted(sk)[:n]]


LEMBAR_KOLOM = ["masalah_id", "kode", "nilai", "judul_masalah", "uraian", "nama", "kampus", "rumpun", "karya_1", "karya_2", "karya_3"]


def siapkan(docs, induk, kampus, kode, korp, benih, penilai, keluar, label_dir, tanggal):
    """docs = daftar dokumen cocok/<kab4>.json. Menulis keluar/{kunci.json, lembar_<p>.csv} (privat) dan label_dir/{kunci_anon.json, syarat.json} (aman di git)."""
    kp.jaga_keluar(keluar)
    ix = {o[0]: o for o in induk}
    cands, sis, cache = [], {}, {}
    pen = {"n_kandidat": 0, "dibuang_tanpa_pusat": 0, "dibuang_kurang_bertitik": 0, "dibuang_daftar_terlalu_sama": 0}
    for d in docs:
        pusat = (kode.get(d["kab"]) or {}).get("pusat")
        for m in d["masalah"]:
            pen["n_kandidat"] += 1
            if not pusat:
                pen["dibuang_tanpa_pusat"] += 1
                continue
            if (m["B"], d["kab"]) not in cache:
                cache[(m["B"], d["kab"])] = sistem_pembanding(induk, kampus, m["B"], pusat)
            a, t = cache[(m["B"], d["kab"])]
            if len(t) < UJ["MIN_BERTITIK"]:
                pen["dibuang_kurang_bertitik"] += 1
                continue
            s = {"skor": [x["id"] for x in m["pakar"]], "h": a[:UJ["NDCG_K"]], "terdekat": t[:UJ["NDCG_K"]]}
            if len(gabung(s, urut=urut_sistem(benih, m["auto_id"]))) < UJ["POOL"]:
                pen["dibuang_daftar_terlalu_sama"] += 1
                continue
            cands.append({"id": m["auto_id"], "B": m["B"], "A": m["A"], "kab": d["kab"], "judul": m.get("judul"), "uraian": m.get("uraian")})
            sis[m["auto_id"]] = s
    pil = pilih_masalah(cands, benih)
    pen["n_dipilih"] = len(pil)
    pen["kab_berbeda"] = len({c["kab"] for c in pil})
    kam = teks.kamus()
    anon = {"v": 2, "masalah": [{k: c[k] for k in ("id", "kab", "B", "A")} for c in pil], "pool": {}, "sistem": {}, "penyaringan": pen}
    peta, baris = {}, []
    for c in pil:
        s = sis[c["id"]]
        pool = gabung(s, urut=urut_sistem(benih, c["id"]))
        semua = set(pool) | {x for l in s.values() for x in l}
        kd = {x: kode_pakar(benih, c["id"], x) for x in semua}
        assert len(set(kd.values())) == len(kd), f"kode pakar bentrok di {c['id']}"
        anon["pool"][c["id"]] = [kd[x] for x in pool]
        anon["sistem"][c["id"]] = {k: [kd[x] for x in l] for k, l in s.items()}
        peta[c["id"]] = {v: k for k, v in kd.items()}
        qtok = set(teks.token(" ".join([c["judul"] or "", c["uraian"] or "", " ".join(kam["bahaya"].get(c["B"], [])), " ".join(kam["aspek"].get(c["A"], []))])))
        for x in pool:
            o = ix[x]
            ka = [f"{k.get('judul', '')} ({k.get('tahun') or 's.d.'})" for k in karya_relevan(korp.get(x), qtok)]
            baris.append([c["id"], kd[x], "", c["judul"] or "", c["uraian"] or "", o[1], o[2], "; ".join(o[3] or []), *(ka + [""] * 3)[:3]])
    assert len(baris) == UJ["MASALAH"] * UJ["POOL"], len(baris)
    os.makedirs(keluar, exist_ok=True)
    os.makedirs(label_dir, exist_ok=True)
    raw = json.dumps(anon, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    open(os.path.join(label_dir, "kunci_anon.json"), "wb").write(raw)
    tulis_json(os.path.join(keluar, "kunci.json"), {**anon, "benih": benih, "peta": peta})
    for p in penilai:  # S3: acak masalah per penilai, lalu pakar di dalam masalah
        urut = sorted(baris, key=lambda r: (hx(benih, p, "m", r[0]), hx(benih, p, r[0], r[1])))
        with open(os.path.join(keluar, f"lembar_{p}.csv"), "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(LEMBAR_KOLOM)
            w.writerows(urut)
    tulis_json(os.path.join(label_dir, "syarat.json"), {"v": 2, "dibekukan": tanggal, "benih_sha256": hashlib.sha256(benih.encode()).hexdigest(), "penilai": list(penilai),
                                                        "syarat_sha256": sha(syarat()), "kunci_sha256": hashlib.sha256(raw).hexdigest(), "syarat": syarat()})
    return len(pil), len(baris), pen


# ---------------------------------------------------------------- --cek
def _dunia():
    """Dunia sintetis: 30 kab x 10 aspek, 48 pakar fiktif; satu kab tanpa pusat; Skor/h/terdekat sengaja berbeda."""
    bah = ["banjir", "longsor", "gempa", "karhutla"]
    induk = [[f"A{i:04d}", f"Pakar Fiktif {i}", f"U{i % 6}", [bah[i % 4], bah[(i + 1) % 4]], (i * 7) % 31 + 1] for i in range(48)]
    kampus = {f"U{j}": {"lat": -2.0 - j, "lon": 100.0 + 3 * j} for j in range(6)}
    korp = {o[0]: [{"judul": f"Studi {bah[(int(o[0][1:]) + j) % 4]} nomor {j}", "abstrak": f"kajian {bah[(int(o[0][1:]) + j) % 4]} di wilayah", "tahun": 2020 + j, "sitasi": j} for j in range(4)] for o in induk}
    kode, docs = {}, []
    for ki in range(31):
        k4 = f"99{ki:02d}"
        if ki < 30:
            kode[k4] = {"pusat": [-1.0 - ki / 3, 101.0 + ki / 2]}
        else:
            kode[k4] = {}
        ms = []
        for a in KONST["ASPEK"]:
            b = bah[(ki + int(a[1:])) % 4]
            skor = sorted([o[0] for o in induk if b in o[3]], key=lambda x: hx("s", k4, a, x))[:UJ["NDCG_K"]]
            ms.append({"auto_id": f"auto-{k4}-{b}-{a}", "B": b, "A": a, "judul": f"Masalah {b} {a}", "uraian": "uraian fiktif", "pakar": [{"id": x} for x in skor]})
        docs.append({"kab": k4, "masalah": ms})
    return induk, kampus, kode, docs, korp


def _label(kunci, peta, relevan, derau, i):
    out = {}
    for m, ks in kunci["pool"].items():
        rel = relevan(m)
        for k in ks:
            pid = peta[m][k]
            g = 2 if pid in rel else (1 if int(hx("g", m, pid)[:2], 16) % 5 == 0 else 0)
            out[(m, k)] = derau(m, k, g, i)
    return out


def _wr(ld, nama, lab):
    p = os.path.join(ld, nama)
    with open(p, "w", newline="") as f:
        w = csv.writer(f); w.writerow(["masalah_id", "kode", "nilai"])
        for (m, k), g in sorted(lab.items()):
            w.writerow([m, k, g])
    return p


def _gagal(fn, pesan):
    try:
        fn()
    except SystemExit as e:
        assert pesan in str(e), (pesan, str(e))
        return
    raise AssertionError("seharusnya ditolak: " + pesan)


def cek():
    # --- murni
    assert abs(ndcg(["a", "b"], {"a": 2, "b": 0}) - 1.0) < 1e-12 and ndcg(["b", "a"], {"a": 2, "b": 0}) < 1.0 and ndcg(["a"], {"a": 0}) is None
    assert abs(kappa([0, 1, 2, 0, 1, 2], [0, 1, 2, 0, 1, 2]) - 1.0) < 1e-12 and kappa([0, 1, 2, 0], [2, 1, 0, 2]) < 0.4 and kappa([1, 1], [1, 1]) is None
    assert abs(kappa_berbobot([0, 1, 2, 0, 1, 2], [0, 1, 2, 0, 1, 2]) - 1.0) < 1e-12 and kappa_berbobot([0, 2, 0, 2], [2, 0, 2, 0]) < 0
    assert bootstrap([]) is None and bootstrap([0.2] * 10) == [0.2, 0.2] and bootstrap([0.1, 0.3, 0.2]) == bootstrap([0.1, 0.3, 0.2])
    ok = {"skor": 0.80, "h": 0.70, "terdekat": 0.60}
    assert putusan(ok, 0.4, 60) and putusan(ok, 0.5, 50), "tepat di batas harus lolos"
    assert not putusan({**ok, "skor": 0.7999}, 0.9, 60), "kurang dari marjin 0,10 harus gagal"
    assert not putusan(ok, 0.3999, 60) and not putusan(ok, None, 60) and not putusan({**ok, "h": None}, 0.9, 60), "kappa di bawah 0,4 atau tak terdefinisi harus gagal"
    assert not putusan(ok, 0.9, 49), "kurang dari 50 masalah dipakai harus gagal"
    s0 = {"skor": ["a", "b", "c"], "h": ["a", "d", "e"], "terdekat": ["f", "b", "g"]}
    assert gabung(s0, 6) == ["a", "f", "b", "d", "c", "e"] and gabung(s0, 6, ("terdekat", "h", "skor")) != gabung(s0, 6)
    assert len({tuple(urut_sistem("b", f"m{i}")) for i in range(30)}) > 1, "urutan sistem harus berputar antar masalah"
    # terdekat: pembulatan 0,1 + seri h turun (tiru akademisi.js)
    ind = [["X1", "n", "K1", ["banjir"], 5], ["X2", "n", "K2", ["banjir"], 9], ["X3", "n", "K3", ["banjir"], 1], ["X4", "n", "K4", ["banjir"], 50]]
    kam = {"K1": {"lat": 0.0, "lon": 100.0}, "K2": {"lat": 0.0, "lon": 100.0}, "K3": {"lat": 0.0, "lon": 99.0}, "K4": {}}
    assert sistem_pembanding(ind, kam, "banjir", [0.0, 100.0]) == (["X4", "X2", "X1", "X3"], ["X2", "X1", "X3"]), "seri km -> h turun; kampus tanpa titik keluar"
    assert sistem_pembanding(ind, kam, "banjir", None)[1] == []
    # --- fingerprint syarat: sistem yang diuji ikut terbekukan
    s_awal = sha(syarat())
    b0 = KONST["BOBOT"]["pakar"]["teks"]
    KONST["BOBOT"]["pakar"]["teks"] = b0 + 0.01
    try:
        assert sha(syarat()) != s_awal, "bobot skor berubah tapi hash syarat sama"
    finally:
        KONST["BOBOT"]["pakar"]["teks"] = b0
    assert sha(syarat()) == s_awal and {"cocok_pakar.py", "indeks_bm25.py", "teks.py", "kamus.json"} == set(syarat()["sistem_sha256"]) and "ndcg" in syarat()["hitung_sha256"]
    # --- status tanpa label
    with tempfile.TemporaryDirectory() as t:
        assert not status_pakar(os.path.join(t, "tidak_ada.json"), t)
        p = os.path.join(t, "u.json"); tulis_json(p, tanpa_label()); assert not status_pakar(p, t)
        palsu = {"lolos": True, "status": "lolos", "syarat_sha256": s_awal, "kunci_sha256": "0" * 64, "ndcg_skor": 0.8, "ndcg_h": 0.6, "ndcg_terdekat": 0.5, "kappa": 0.5, "n_pasangan": 900, "n_masalah": 60, "n_masalah_dipakai": 60}
        tulis_json(p, palsu); assert not status_pakar(p, t), "lolos=true ketikan tangan tanpa berkas beku/label harus ditolak"
        open(p, "w").write("{rusak"); assert not status_pakar(p, t)
    u = json.load(open(UJI_JSON)) if os.path.exists(UJI_JSON) else {}
    assert u.get("lolos") is not True or status_pakar(), "uji_cocok.json di repo berlolos=true tetapi tak terhitung ulang dari label di repo"
    # --- siapkan atas dunia sintetis
    induk, kampus, kode, docs, korp = _dunia()
    with tempfile.TemporaryDirectory() as t:
        kel, ld = os.path.join(t, "kel"), os.path.join(t, "label")
        m_, b_, pen = siapkan(docs, induk, kampus, kode, korp, "benih1", ["a", "b"], kel, ld, "2026-11-05")
        assert (m_, b_) == (60, 900) and pen["n_kandidat"] == 310 and pen["dibuang_tanpa_pusat"] == 10 and pen["n_dipilih"] == 60, pen
        kunci = json.load(open(os.path.join(kel, "kunci.json")))
        anon_raw = open(os.path.join(ld, "kunci_anon.json"), "rb").read()
        anon = json.loads(anon_raw)
        assert "peta" not in anon and "benih" not in anon and "peta" in kunci, "kunci_anon tak boleh memuat peta kode->id"
        assert "A00" not in anon_raw.decode() and "Pakar" not in anon_raw.decode(), "kunci_anon bocor id/nama pakar"
        asp = [m["A"] for m in anon["masalah"]]
        assert all(asp.count(a) == 6 for a in KONST["ASPEK"]) and len({m["B"] for m in anon["masalah"]}) >= 3, "6 per aspek, tersebar bahaya"
        assert max(collections.Counter(m["kab"] for m in anon["masalah"]).values()) <= UJ["MAKS_PER_KAB"] and "9930" not in {m["kab"] for m in anon["masalah"]}
        assert all(len(v) == 15 and len(set(v)) == 15 for v in anon["pool"].values())
        sheets = {}
        for p in "ab":
            rows = list(csv.reader(open(os.path.join(kel, f"lembar_{p}.csv"), encoding="utf-8")))
            assert rows[0] == LEMBAR_KOLOM and "h" not in rows[0] and not {"skor", "peringkat", "sistem", "rank"} & set(rows[0]) and len(rows) == 901
            assert any(r[8] for r in rows[1:]) and all(r[8].startswith("Studi") or not r[8] for r in rows[1:]), "kolom karya_1 berisi judul karya relevan"
            sheets[p] = rows[1:]
        runs = lambda rs: [r[0] for i, r in enumerate(rs) if i == 0 or rs[i - 1][0] != r[0]]
        assert len(runs(sheets["a"])) == 60 and runs(sheets["a"]) != runs(sheets["b"]), "masalah harus teracak per penilai dan tiap masalah satu blok"
        assert sorted(r[:2] for r in sheets["a"]) == sorted(r[:2] for r in sheets["b"])
        # karya sama untuk pakar yang sama di masalah yang sama tak bergantung sistem (fungsi murni dari pakar+masalah)
        assert len({(r[0], r[1], r[8], r[9], r[10]) for r in sheets["a"]}) == 900
        with tempfile.TemporaryDirectory() as t2:  # deterministik
            siapkan(docs, induk, kampus, kode, korp, "benih1", ["a", "b"], os.path.join(t2, "k"), os.path.join(t2, "l"), "2026-11-05")
            assert open(os.path.join(t2, "l", "kunci_anon.json"), "rb").read() == anon_raw and open(os.path.join(t2, "k", "lembar_a.csv"), "rb").read() == open(os.path.join(kel, "lembar_a.csv"), "rb").read()
        beku = json.load(open(os.path.join(ld, "syarat.json")))
        assert beku["kunci_sha256"] == hashlib.sha256(anon_raw).hexdigest() and beku["penilai"] == ["a", "b"]
        peta = kunci["peta"]
        rel_skor = lambda m: {peta[m][k] for k in anon["sistem"][m]["skor"][:4]}
        rel_h = lambda m: {peta[m][k] for k in anon["sistem"][m]["h"][:4]}
        sama = lambda m, k, g, i: g

        def salin(nama):
            d = os.path.join(t, nama); shutil.copytree(ld, d); return d

        mu = os.path.join(t, "uji.json")
        # KASUS LOLOS
        _wr(ld, "cocok_a.csv", _label(anon, peta, rel_skor, sama, 0)); _wr(ld, "cocok_b.csv", _label(anon, peta, rel_skor, sama, 1))
        h = jalankan(ld, mu)
        assert h["lolos"] and h["kappa"] == 1.0 and h["ndcg_skor"] >= max(h["ndcg_h"], h["ndcg_terdekat"]) + 0.1 and h["n_masalah_dipakai"] == 60, h
        assert h["ndcg5_skor"] is not None and h["selisih_ci95"][0] <= h["selisih_ci95"][1] and h["kappa_berbobot"] == 1.0 and "batas bawah" in h["tak_terlabel"] and h["penyaringan"]["n_kandidat"] == 310
        uji = json.load(open(mu))
        assert verifikasi(uji, ld) and status_pakar(mu, ld), "hasil sah harus terverifikasi lewat hitung ulang"
        assert json.dumps(jalankan(ld, mu), sort_keys=True) == json.dumps(h, sort_keys=True), "keluaran harus deterministik"
        # DITOLAK: lolos=true ketikan tangan dengan angka masuk akal dan hash benar tapi bukan hasil label
        for ubah in ({"ndcg_skor": 0.95}, {"kappa": 0.9}, {"n_masalah_dipakai": 59}, {"selisih_ci95": [0.0, 1.0]}, {"kunci_sha256": "0" * 64}, {"syarat_sha256": "0" * 64}):
            assert not verifikasi({**uji, **ubah}, ld), f"uji dipalsukan {ubah} lolos"
        tulis_json(os.path.join(t, "tangan.json"), {"lolos": True, "status": "lolos", "syarat_sha256": beku["syarat_sha256"], "kunci_sha256": beku["kunci_sha256"], "ndcg_skor": 0.8, "ndcg_h": 0.6,
                                                    "ndcg_terdekat": 0.5, "kappa": 0.5, "n_pasangan": 900, "n_masalah": 60, "n_masalah_dipakai": 60})
        assert not status_pakar(os.path.join(t, "tangan.json"), ld), "JSON lolos:true ketikan tangan dengan angka masuk akal harus ditolak"
        kosong = salin("kosong"); os.remove(os.path.join(kosong, "cocok_b.csv"))
        assert not verifikasi(uji, kosong), "tanpa label di repo tak bisa dihitung ulang"
        rusak = salin("rusak"); open(os.path.join(rusak, "kunci_anon.json"), "wb").write(anon_raw.replace(b"auto-", b"oto--", 1))
        assert not verifikasi(uji, rusak), "kunci_anon diubah harus ditolak"
        # SISTEM YANG DIUJI diubah sesudah beku
        KONST["BOBOT"]["pakar"]["teks"] = b0 + 0.01
        try:
            assert not verifikasi(uji, ld), "bobot skor diubah sesudah dibekukan tapi verifikasi lolos"
            _gagal(lambda: jalankan(ld, mu), "berubah sesudah dibekukan")
        finally:
            KONST["BOBOT"]["pakar"]["teks"] = b0
        assert verifikasi(uji, ld)
        FORMULA["ndcg"] += " (diubah)"
        try:
            _gagal(lambda: jalankan(ld, mu), "berubah sesudah dibekukan")
        finally:
            FORMULA["ndcg"] = FORMULA["ndcg"][:-len(" (diubah)")]
        # KASUS GAGAL MARJIN: yang relevan = h
        d2 = salin("marjin"); _wr(d2, "cocok_a.csv", _label(anon, peta, rel_h, sama, 0)); _wr(d2, "cocok_b.csv", _label(anon, peta, rel_h, sama, 1))
        h2 = jalankan(d2, mu)
        assert not h2["lolos"] and h2["ndcg_h"] > h2["ndcg_skor"] and not status_pakar(mu, d2), h2
        # KASUS GAGAL KAPPA: Skor unggul tetapi B menukar nilai
        d3 = salin("kappa"); _wr(d3, "cocok_b.csv", _label(anon, peta, rel_skor, lambda m, k, g, i: 2 - g, 1))
        h3 = jalankan(d3, mu)
        assert not h3["lolos"] and h3["kappa"] < 0.4 and not status_pakar(mu, d3), h3
        # KASUS GAGAL n < 50: hanya 40 masalah punya relevan, Skor unggul di situ
        ada = set(list(anon["pool"])[:40])
        d4 = salin("sedikit")
        for i, p in enumerate("ab"):
            _wr(d4, f"cocok_{p}.csv", _label(anon, peta, lambda m: rel_skor(m) if m in ada else set(), lambda m, k, g, j: g if m in ada else 0, i))
        h4 = jalankan(d4, mu)
        assert h4["n_masalah_dipakai"] == 40 and h4["ndcg_skor"] >= max(h4["ndcg_h"], h4["ndcg_terdekat"]) + 0.1 and h4["kappa"] == 1.0 and not h4["lolos"] and not status_pakar(mu, d4), h4
        # TOLAK: tak lengkap, satu berkas, nilai ilegal, kolom tambahan di repo, penilai asing, penilai hilang, kunci berubah
        sebagian = dict(list(_label(anon, peta, rel_skor, sama, 0).items())[:-1])
        _gagal(lambda: jalankan(ld, mu, [os.path.join(ld, "cocok_a.csv"), _wr(t, "sb.csv", sebagian)]), "tidak lengkap")
        _gagal(lambda: jalankan(ld, mu, [os.path.join(ld, "cocok_a.csv")]), "tepat 2")
        buruk = os.path.join(t, "buruk.csv"); open(buruk, "w").write("masalah_id,kode,nilai\nx,y,3\n")
        _gagal(lambda: baca_label(buruk), "harus 0, 1, atau 2")
        asing = salin("asing"); _wr(asing, "cocok_c.csv", {})
        _gagal(lambda: jalankan(asing, mu), "bukan penilai terbeku")
        hilang = salin("hilang"); os.remove(os.path.join(hilang, "cocok_b.csv"))
        _gagal(lambda: jalankan(hilang, mu), "tidak ada")
        kr = salin("kunci"); open(os.path.join(kr, "kunci_anon.json"), "wb").write(anon_raw.replace(b"auto-", b"oto--", 1))
        _gagal(lambda: jalankan(kr, mu), "tidak sama")
        rep = os.path.join(AKAR, "data", "raw", "kemitraan"); os.makedirs(rep, exist_ok=True)
        for kolom in ("nama", "catatan"):
            with tempfile.NamedTemporaryFile("w", dir=rep, suffix=".csv", delete=False) as f:
                f.write(f"masalah_id,kode,nilai,{kolom}\nx,y,1,Fiktif\n"); fn = f.name
            try:
                _gagal(lambda: baca_label(fn), "hanya boleh kolom")
            finally:
                os.remove(fn)
        # pilih_masalah: aspek kekurangan kandidat, dan batas per kab
        _gagal_v = lambda c: pilih_masalah(c, "x")
        try:
            _gagal_v([c for c in anon["masalah"] if c["A"] != "A3"]); raise AssertionError("aspek kosong lolos")
        except ValueError as e:
            assert "A3" in str(e)
        try:
            _gagal_v([{**c, "kab": "1111"} for c in anon["masalah"]]); raise AssertionError("semua satu kab lolos")
        except ValueError as e:
            assert "per kab" in str(e)
    print("OK uji_cocok.py: nDCG@10/@5, kappa (+berbobot), bootstrap, putusan (n>=50); siapkan 60x15=900 buta deterministik, kunci_anon terpisah dari peta; lolos 1 kasus, gagal 3 (marjin, kappa, n<50); "
          "lolos ketikan tangan/bobot diubah/kunci diubah/label hilang ditolak; Belum diuji hanya lepas lewat hitung ulang dari label di repo")


def main(a):
    g = lambda n, b=None: a[a.index(n) + 1] if n in a else b
    ld = g("--label-dir", LABEL_DIR)
    if "--cek" in a:
        return cek()
    if "--siapkan" in a:
        if not all(g(x) for x in ("--induk", "--kampus", "--cocok", "--korpus", "--penilai", "--keluar")):
            sys.exit(__doc__)
        pn = g("--penilai").split(",")
        if len(pn) != 2 or pn[0] == pn[1]:
            sys.exit("--penilai butuh dua nama berbeda, dipisah koma")
        induk = json.load(open(g("--induk"), encoding="utf-8"))
        induk = induk["orang"] if isinstance(induk, dict) else induk
        docs = [json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(os.path.join(g("--cocok"), "[0-9][0-9][0-9][0-9].json")))]
        kode = json.load(open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8"))
        for d in docs:  # uraian masalah dari profil publik (bukan data pakar)
            pr = os.path.join(AKAR, "public", "data", "kemitraan", "daerah", d["kab"] + ".json")
            u = {m["auto_id"]: m.get("uraian") for m in json.load(open(pr, encoding="utf-8")).get("masalah", [])} if os.path.exists(pr) else {}
            for m in d["masalah"]:
                m.setdefault("uraian", u.get(m["auto_id"]))
        m, b, pen = siapkan(docs, induk, json.load(open(g("--kampus"), encoding="utf-8")), kode, ib.muat_korpus(g("--korpus")), g("--benih", "kemitraan-uji-1"), pn, g("--keluar"),
                            ld, g("--tanggal", datetime.date.today().isoformat()))
        print(f"{m} masalah, {b} baris per penilai ke {g('--keluar')} (privat); beku di {ld}: kunci_anon.json + syarat.json; penyaringan {json.dumps(pen)}")
        return
    if "--label" in a:
        i = a.index("--label")
        files = [x for x in a[i + 1:] if not x.startswith("--")][:2]
        h = jalankan(ld, None, files)
    elif "--bila-ada-label" in a:
        if not glob.glob(os.path.join(ld, "cocok_*.csv")):
            if not os.path.exists(UJI_JSON) or json.load(open(UJI_JSON)) != tanpa_label():
                tulis_json(UJI_JSON, tanpa_label())
            print(f"belum ada berkas label di {ld}: uji_cocok.json belum_ada_label, lolos=False")
            return
        h = jalankan(ld)
    else:
        sys.exit(__doc__)
    print(json.dumps({k: h[k] for k in ("status", "ndcg_skor", "ndcg_h", "ndcg_terdekat", "kappa", "kappa_berbobot", "selisih_ci95", "n_masalah_dipakai", "lolos")}, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1:])
