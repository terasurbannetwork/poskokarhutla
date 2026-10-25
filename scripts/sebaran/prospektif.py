"""Uji PROSPEKTIF model "akan membesar": catat ramalan untuk tiap titik api baru saat ia muncul, nilai 72 jam kemudian.

Tidak ada data masa depan yang bisa bocor: ramalan ditulis sekali (append-only) dengan waktu terbit, lalu dinilai setelah
FIRMS memuat 72 jam berikutnya. Dijalankan di CI tiap 3 jam (.github/workflows/titik.yml, langkah boleh gagal), stdlib saja.

Sumber: public/data/hotspot.json dari harian.py (7 hari, VIIRS S-NPP 'N', NOAA-20 'N20', NOAA-21 'N21', keyakinan nominal/tinggi) — tanpa
panggilan FIRMS tambahan. Deteksi digabung ke gudang bergulir 12 hari (titik.json.gz) supaya fitur 7 hari & label 72 jam lengkap.
Titik api baru = komponen sensor PRIMER (<= 750 m & <= 24 jam, lacak.hubungkan) yang deteksi pertamanya berumur 6-24 jam, di
9 provinsi prioritas. Cuaca = Open-Meteo forecast (33 hari lalu + 3 hari ke depan) per sel 0,5 derajat, di-cache per hari,
anggaran bobot per jalan MAKS_BOBOT (kuota 10.000/hari). Model & ambang = model_sebaran.json "lolos" dan "lolos_ulang"
(ramal ulang 14 jam setelah deteksi pertama). Label = sel 375 m sensor primer yang terhubung dengan titik itu dalam 72 jam >= 10.

Sensor (pilih_sensor, aturan TERKUNCI): S-NPP pensiun 1 Nov 2026. Primer = S-NPP; pindah ke NOAA-20 hanya bila acuan >= 1 Nov 2026 DAN S-NPP
diam >= 36 jam DAN NOAA-20 >= 20 deteksi sesudahnya; keputusan disimpan di sensor.json (ikut arsip) dan tak berbalik. Pendamping (n20_0/n20_14)
= NOAA-20 untuk S-NPP, NOAA-21 untuk NOAA-20. Tiap ramalan menyimpan "sensor"/"pendamping" dan dinilai dengan sensor yang SAMA; angka "mode"
dan gerbang hanya dari sensor primer sekarang (per_sensor memuat semua). Tanpa primer: status "tanpa_viirs"/"tanpa_primer", tidak ada
ramalan baru, tidak ada yang ditandai kedaluwarsa. Uji arsip 2024-2026 (S-NPP vs NOAA-20 pada peristiwa sama): SEBARAN_MODEL.md bagian sensor.

Catatan: data/raw/sebaran/prospektif/ramalan.jsonl, nilai.jsonl (append-only); ringkasan: public/data/prospektif.json.
Pakai:  python3 scripts/sebaran/prospektif.py  |  ... uji  |  ... arsip <tujuan.jsonl.gz>  |  ... pulih <sumber.jsonl.gz>
Uji balik historis (bukan prospektif): scripts/sebaran/prospektif_historis.py
"""
import datetime as dt, gzip, json, math, os, random, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import lolos as LL  # noqa: E402
from lacak import hubungkan  # noqa: E402
from umum import MENTAH, PUBLIK, PRIORITAS, T0, pusat, sel  # noqa: E402

RIWAYAT_HARI = float(os.environ.get("PROSPEKTIF_RIWAYAT_HARI", "7"))  # < 7 hanya uji alur (fitur 7 hari terpotong): folder & ringkasan terpisah
FOLDER = os.path.join(MENTAH, "prospektif" if RIWAYAT_HARI >= 7 else "prospektif_uji_alur")
GUDANG = os.path.join(FOLDER, "titik.json.gz")
RAMALAN = os.path.join(FOLDER, "ramalan.jsonl")
NILAI = os.path.join(FOLDER, "nilai.jsonl")
GERBANG = os.path.join(FOLDER, "gerbang.jsonl")  # vonis gerbang per evaluasi (append-only, ikut arsip): dasar syarat dua evaluasi berturut-turut
CUACA = os.path.join(FOLDER, "cuaca")
RINGKAS = os.path.join(PUBLIK, "prospektif.json") if RIWAYAT_HARI >= 7 else os.path.join(FOLDER, "ringkasan.json")
SIMPAN_HARI = 12
UMUR_MIN, UMUR_MAKS = 6 * 60, 24 * 60  # menit sesudah deteksi pertama: jendela NOAA-20 +-3 jam tertutup & sudah masuk NRT
JEDA_NILAI = 72 * 60 + 6 * 60  # 72 jam + keterlambatan NRT
# Gerbang tampil peluang "akan membesar" di layar (semua harus terpenuhi, mode awal):
N_MIN_DINILAI = 300   # ASUMSI: ~17% lolos (teramati prospektif 20 Okt 2026: 149 dari 882) => ~50 kasus lolos
N_MIN_LOLOS = 50      # ASUMSI: dengan 50 kasus, setengah lebar CI95 recall ~ +-0,13 (Wilson); lebih sedikit = recall belum bisa dipegang
TOLERANSI_RECALL = 0.15  # ASUMSI: batas bawah CI95 recall prospektif >= klaim model (model_sebaran.json lolos.kinerja.uji2_recall) - 0,15


# Gerbang KALIBRASI (tambahan di atas gerbang recall; semua mode awal). Peluang yang tampil di layar harus bisa dipercaya sebagai peluang,
# bukan hanya mengurutkan titik:
ECE_MAKS = 0.08   # ASUMSI: selisih rata-rata |teramati - diramal| per kantong <= 8 poin. Laju dasar ~17%: "20%" di layar boleh berarti 12-28%, tidak lebih.
                  # Dengan 10 kantong kuantil @ n=300 (30 per kantong) galat sampling ECE model SEMPURNA ~0,05; 0,08 menyisakan margin ~3 poin untuk
                  # salah kalibrasi sungguhan, jadi ambang ini tidak bisa dilolosi dengan n kecil yang kebetulan bagus dan tidak dihukum karena noise.
# Tiga tambahan setelah tinjauan 22 Okt 2026 (ECE titik pada data kumulatif mulai n=300 = berhenti-opsional, dan buta skala):
KAL_BESAR = (0.75, 1.33)  # kalibrasi-secara-umum: selang Wilson laju teramati harus beririsan dengan [0,75; 1,33] x rata-rata peluang diramal
BOOT_B, BOOT_PCT = 200, 0.90  # ECE dinilai dari persentil ke-90 bootstrap (bukan titik): <= ECE_MAKS
TAMBAH_MIN = 30   # evaluasi "berturut" hanya dihitung bila n dinilai bertambah >= 30 (satu kantong) sejak evaluasi lulus sebelumnya; jalan tanpa data baru tak dihitung
RASIO_LAJU_MAKS = 2.0  # laju api besar prospektif vs laju saat model dikalibrasi: beda > 2x (ke atas/bawah) menolak teruji kecuali sudah direkalibrasi pada data prospektif
SKILL_MIN = 0.0   # Brier skill terhadap klimatologi (laju dasar himpunan yang sama) harus > 0: peluang harus mengalahkan "selalu bilang laju dasar".
KANTONG = 10
KANTONG_MIN_N = 30  # kantong < 30 titik terlalu berisik: jumlah kantong diturunkan (n // 30), minimal 2


def wilson(k, n, z=1.96):
    """Selang Wilson 95% (bawah, atas) untuk proporsi k/n."""
    if n <= 0:
        return None, None
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    r = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, (c - r) / d), min(1.0, (c + r) / d)


def wilson_bawah(k, n, z=1.96):
    return wilson(k, n, z)[0]


def kalibrasi(p, y, k=KANTONG):
    """Kurva reliabilitas: kantong KUANTIL (sama banyak titik; peluang menumpuk di bawah, kantong lebar-sama akan kosong di atas).
    Tiap kantong: n, rata-rata peluang diramal, laju teramati, Wilson 95%. ECE = sum(n_b/n * |teramati - diramal|).
    Brier skill = 1 - Brier / Brier klimatologi, klimatologi = selalu meramal laju dasar himpunan ini (ukuran yang generous ke klimatologi)."""
    n = len(y)
    if n < 2 * KANTONG_MIN_N:
        return None
    k = max(2, min(k, n // KANTONG_MIN_N))
    o = sorted(range(n), key=lambda i: p[i])
    bins, ece = [], 0.0
    for b in range(k):
        idx = o[b * n // k:(b + 1) * n // k]
        nb, pr, ob = len(idx), sum(p[i] for i in idx) / len(idx), sum(y[i] for i in idx)
        lo, hi = wilson(ob, nb)
        bins.append({"n": nb, "p_diramal": round(pr, 4), "teramati": round(ob / nb, 4), "lo": round(lo, 4), "hi": round(hi, 4),
                     "p_min": round(p[idx[0]], 4), "p_maks": round(p[idx[-1]], 4)})
        ece += nb / n * abs(ob / nb - pr)
    br = sum((pi - yi) ** 2 for pi, yi in zip(p, y)) / n
    dasar = sum(y) / n
    klim = dasar * (1 - dasar)
    return {"n": n, "kantong": bins, "ece": round(ece, 4), "brier": round(br, 4), "brier_klimatologi": round(klim, 4),
            "brier_skill": round(1 - br / klim, 4) if klim > 0 else None, "laju_dasar": round(dasar, 4)}


def metrik_set(p, y, w):
    """Ringkasan satu himpunan ramalan bernilai (bentuk SAMA untuk prospektif.json dan prospektif_historis.json)."""
    import gbdt as G
    tp = sum(a and b for a, b in zip(w, y))
    return {"dinilai": len(y), "lolos": sum(y), "waspada": sum(w), "tepat": tp,
            "recall": round(tp / sum(y), 3) if sum(y) else None, "presisi": round(tp / sum(w), 3) if sum(w) else None,
            "alarm_palsu_per_tidak_lolos": round((sum(w) - tp) / (len(y) - sum(y)), 3) if len(y) > sum(y) else None,
            "auc": round(G.auc(p, y), 3) if 0 < sum(y) < len(y) else None, "brier": round(G.brier(p, y), 4) if y else None,
            "peluang_rata": round(sum(p) / len(p), 4) if p else None, "laju_teramati": round(sum(y) / len(y), 4) if y else None,
            "kalibrasi": kalibrasi(p, y)}


def di_besar(p, y):
    """Kalibrasi-secara-umum: Wilson 95% laju teramati beririsan dengan [KAL_BESAR] x rata-rata peluang diramal (peka skala, tak seperti ECE mutlak)."""
    n = len(y)
    lo, hi = wilson(sum(y), n)
    mp = sum(p) / n
    return {"teramati": round(sum(y) / n, 4), "lo": round(lo, 4), "hi": round(hi, 4), "rata_p": round(mp, 4),
            "ok": lo <= KAL_BESAR[1] * mp and hi >= KAL_BESAR[0] * mp}


def ece_p90(p, y, b=BOOT_B, persen=BOOT_PCT, benih=7):
    """Persentil bootstrap ECE (resampel titik dengan pengembalian, benih tetap): batas atas, bukan taksiran titik."""
    rnd, n, e = random.Random(benih), len(y), []
    for _ in range(b):
        ix = [rnd.randrange(n) for _ in range(n)]
        e.append(kalibrasi([p[i] for i in ix], [y[i] for i in ix])["ece"])
    return sorted(e)[math.ceil(persen * b) - 1]


def gerbang_kalibrasi(p, y):
    """kalibrasi() + ece_p90 + di_besar (dipakai HANYA untuk prospektif; uji balik historis n ~1e5 cukup ECE titik). None bila n terlalu kecil."""
    kal = kalibrasi(p, y)
    if kal is None:
        return None
    kal["ece_p90"], kal["di_besar"] = round(ece_p90(p, y), 4), di_besar(p, y)
    return kal


def kalibrasi_lolos(kal):
    """Lolos gerbang kalibrasi? kal = kalibrasi() (None = n terlalu kecil = belum lolos). Bila ada ece_p90/di_besar (prospektif) keduanya yang menentukan."""
    return bool(kal and kal.get("ece_p90", kal["ece"]) <= ECE_MAKS and kal.get("di_besar", {"ok": True})["ok"]
                and kal["brier_skill"] is not None and kal["brier_skill"] > SKILL_MIN)


def laju_sejalan(prosp, model, rekalibrasi):
    """(ok, rasio): laju api besar prospektif vs laju saat Platt dikalibrasi. Beda > RASIO_LAJU_MAKS x ditolak kecuali sudah direkalibrasi pada data prospektif."""
    if not prosp or not model:
        return bool(rekalibrasi), None
    r = prosp / model
    return bool(rekalibrasi) or 1 / RASIO_LAJU_MAKS <= r <= RASIO_LAJU_MAKS, round(r, 2)


def berturut(riwayat, n, lulus):
    """(dua_berturut, perlu_dicatat). riwayat = vonis lama [{n, lulus}]. Teruji hanya bila evaluasi ini lulus DAN evaluasi lulus sebelumnya
    (dengan >= TAMBAH_MIN dinilai lebih sedikit) juga lulus: satu lulus kebetulan di n kecil tidak cukup."""
    lama = max((r for r in riwayat if r["n"] <= n - TAMBAH_MIN), key=lambda r: r["n"], default=None)
    return bool(lulus and lama and lama["lulus"]), not any(r["n"] == n for r in riwayat)


MAKS_BOBOT = float(os.environ.get("PROSPEKTIF_BOBOT", "400"))
URL = "https://api.open-meteo.com/v1/forecast"


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def menit_dari(t):
    return (t - T0).total_seconds() / 60


# ---------------- gudang deteksi ----------------
def muat_gudang():
    if os.path.exists(GUDANG):
        with gzip.open(GUDANG, "rt") as f:
            return json.load(f)
    return []


SENSOR_URUT = ("N", "N20")  # primer: S-NPP, lalu NOAA-20. NOAA-21 bukan primer: tak ada arsipnya untuk uji balik (hanya pendamping)
PENDAMPING = {"N": "N20", "N20": "N21"}
# Aturan peralihan TERKUNCI (tinjauan validasi-model 23 Okt 2026): "NOAA-20 > 36 jam lebih baru dari S-NPP" terjadi saat S-NPP masih hidup
# (arsip Jul 2024: 29,8% langkah 3 jam), jadi celah S-NPP sebelum tanggal pensiun = celah data, bukan pensiun. Primer pindah ke NOAA-20 hanya
# bila acuan >= PENSIUN_SNPP DAN S-NPP tak mendeteksi >= MATI_JAM DAN NOAA-20 >= MIN_N20 deteksi sejak deteksi S-NPP terakhir. Keputusan disimpan
# (PERALIHAN, ikut arsip) dan tidak pernah berbalik. Padanan JS: sensorTitik di public/sebaran_model.js (tanpa berkas keadaan).
PENSIUN_SNPP = menit_dari(dt.datetime(2026, 11, 1, tzinfo=dt.timezone.utc))
MATI_JAM = 36
MIN_N20 = 20
PERALIHAN = os.path.join(FOLDER, "sensor.json")


def baca_peralihan():
    return json.load(open(PERALIHAN)) if os.path.exists(PERALIHAN) else None


def akhir_sensor(D):
    akhir = {}
    for r in D:
        if r[0] > akhir.get(r[3], -math.inf):
            akhir[r[3]] = r[0]
    return akhir


def pilih_sensor(D, kini, kunci=None, pensiun=None):
    """D = baris [menit, lat, lon, sensor, ...]; kini = menit acuan data; kunci = primer yang sudah dikunci (berkas PERALIHAN) atau None.
    -> (primer | None, pendamping | None, beralih). beralih = True hanya pada jalan yang memutuskan pindah ke NOAA-20 (pemanggil menyimpannya).
    primer None: tak ada deteksi primer (S-NPP belum pensiun tapi kosong, atau NOAA-20 kosong sesudah pensiun) -> status eksplisit."""
    pensiun = PENSIUN_SNPP if pensiun is None else pensiun
    rows = [r for r in D if r[0] <= kini]
    akhir = akhir_sensor(rows)
    beralih = False
    if kunci == "N20":
        prim = "N20" if "N20" in akhir else None
    else:
        aN = akhir.get("N", -math.inf)
        if kini >= pensiun and kini - aN >= MATI_JAM * 60 and sum(1 for r in rows if r[3] == "N20" and r[0] > aN) >= MIN_N20:
            prim, beralih = "N20", True
        else:
            prim = "N" if "N" in akhir else None
    pend = PENDAMPING.get(prim)
    return prim, pend if pend in akhir else None, beralih


def mati(s, kunci):
    """Sensor s sudah dipensiunkan (primer dikunci ke sensor lain)? Hanya S-NPP sesudah peralihan."""
    return kunci == "N20" and s == "N"


def gabung(lama, hs):
    """hotspot.json -> baris [menit, lat, lon, sensor, frp, prov], digabung & dipangkas ke SIMPAN_HARI terakhir."""
    acuan = dt.datetime.fromisoformat(hs["acuan"])
    a0 = menit_dari(acuan)
    baru = []
    for la, lo, jam, s, frp, c, w, _ in hs["baris"]:
        if s in ("N", "N20", "N21") and c >= 1:
            baru.append([round(a0 + jam * 60), la, lo, s, frp, hs["wilayah"][w].split("|")[0]])  # menit BULAT: jam di hotspot.json dibulatkan 0,01 jam terhadap acuan yang berganti, pecahan menit tidak stabil antarjalan
    out = list({(round(r[0]), r[1], r[2], r[3]): r for r in lama + baru}.values())
    out = [r for r in out if r[0] >= a0 - SIMPAN_HARI * 1440]
    out.sort(key=lambda r: r[0])
    return out, a0


# ---------------- titik api baru ----------------
def komponen(snpp):
    akar, _, _ = hubungkan([r[0] for r in snpp], [r[1] for r in snpp], [r[2] for r in snpp])
    g = {}
    for i, a in enumerate(akar):
        g.setdefault(a, []).append(i)
    return g


def label72(snpp, idx_awal, t0):
    """Sel 375 m berbeda yang terjangkau dari deteksi lintasan pertama lewat sambungan <= 750 m & <= 24 jam di [t0, t0 + 72 jam]."""
    daf = [i for i, r in enumerate(snpp) if t0 <= r[0] <= t0 + 72 * 60]
    kotak = {}
    for i in daf:
        r = snpp[i]
        kotak.setdefault((math.floor(r[2] / .0075), math.floor(r[1] / .0075)), []).append(i)
    lihat, antre = set(idx_awal), list(idx_awal)
    while antre:
        a = antre.pop()
        ra = snpp[a]
        gx, gy = math.floor(ra[2] / .0075), math.floor(ra[1] / .0075)
        kx = 111320 * math.cos(math.radians(ra[1]))
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for b in kotak.get((gx + dx, gy + dy), ()):
                    if b in lihat:
                        continue
                    rb = snpp[b]
                    if abs(rb[0] - ra[0]) <= 24 * 60 and math.hypot((rb[2] - ra[2]) * kx, (rb[1] - ra[1]) * 110574) <= 750:
                        lihat.add(b)
                        antre.append(b)
    return len({sel(snpp[i][2], snpp[i][1]) for i in lihat})


# ---------------- cuaca ----------------
def cuaca_sel(daftar, hari):
    """daftar sel 0,5 (lat, lon) -> {(lat, lon): dict cuaca} untuk 'hari' (YYYY-MM-DD), cache per hari, anggaran MAKS_BOBOT."""
    import cuaca
    os.makedirs(CUACA, exist_ok=True)
    out, perlu = {}, []
    for la, lo in daftar:
        j = os.path.join(CUACA, f"{hari}_{la:.2f}_{lo:.2f}.json")
        if os.path.exists(j):
            out[(la, lo)] = json.load(open(j))
        else:
            perlu.append((la, lo))
    bobot1 = cuaca.bobot(33 + 3)
    perlu = perlu[:int(MAKS_BOBOT // bobot1)]
    for a in range(0, len(perlu), 20):
        g = perlu[a:a + 20]
        q = {"latitude": ",".join(str(x[0]) for x in g), "longitude": ",".join(str(x[1]) for x in g), "hourly": ",".join(cuaca.VAR),
             "past_days": 33, "forecast_days": 3, "timezone": "GMT", "wind_speed_unit": "kmh"}
        try:
            d = cuaca.ambil(URL + "?" + urllib.parse.urlencode(q), coba=2, batas_waktu=120)
        except Exception as e:
            log("cuaca gagal:", e)
            break
        for (la, lo), r in zip(g, d if isinstance(d, list) else [d]):
            h = r["hourly"]
            c = {"lat": la, "lon": lo, "mulai": h["time"][0], **{k: h[v] for k, v in zip(cuaca.KOLOM, cuaca.VAR)}}
            json.dump(c, open(os.path.join(CUACA, f"{hari}_{la:.2f}_{lo:.2f}.json"), "w"))
            out[(la, lo)] = c
    for f in os.listdir(CUACA):  # buang cache > 5 hari
        if f[:10] < (dt.date.fromisoformat(hari) - dt.timedelta(days=5)).isoformat():
            os.remove(os.path.join(CUACA, f))
    return out


# ---------------- ramal ----------------
def fitur_titik(K, M, S, rs, t0, lon0, lat0, prov, snpp_idx, n20_idx, ulang):
    from fitur import terakhir
    w = S.jendela(int(t0))
    pertama = [r for r in rs if r[0] - t0 <= 30]
    sel0 = sorted({sel(r[2], r[1]) for r in pertama})
    s = K.sel(sel(rs[0][2], rs[0][1]), prov)  # sel deteksi pertama (= det[0] di data latih)
    tgl = T0 + dt.timedelta(minutes=t0)
    oni, dmi = terakhir(M["iklim"]["oni"], tgl.year, tgl.month), terakhir(M["iklim"]["dmi"], tgl.year, tgl.month)
    jam_lokal = ((t0 + lon0 * 4) / 60) % 24
    u = None
    if ulang:
        sampai = [r for r in rs if r[0] <= t0 + LL.ULANG_MENIT]
        lagi = [r for r in sampai if r[0] > t0 + 60]
        sel14 = sorted({sel(r[2], r[1]) for r in sampai})
        u = {"n14": len(sel14), "frp14": max([r[4] for r in lagi] or [0.0]), "lagi14": 1 if lagi else 0,
             "n20_14": LL.n20_sekitar(n20_idx, sel14, t0 - 180, t0 + LL.ULANG_MENIT + 1)}
    v = LL.fitur_lolos(w, s, tgl.year, len(sel0), max(r[4] for r in pertama), sum(r[4] for r in pertama), 0 if 6 <= jam_lokal < 18 else 1, oni, dmi,
                       LL.konteks(snpp_idx, t0, lon0, lat0), LL.n20_sekitar(n20_idx, sel0, t0 - 180, t0 + 181), u)
    st = "sabana" if prov in ("53", "93") and not s["gambut"] else "gambut" if s["gambut"] else "mineral"
    return v, st


def baca_jsonl(j):
    return [json.loads(l) for l in open(j)] if os.path.exists(j) else []


def nilai_baru(ramalan, dinilai, D, a0, t_awal, acuan, kunci=None):
    """Baris nilai.jsonl baru untuk ramalan yang 72 jam (+ jeda NRT) sudah lewat. Deteksi awal dicocokkan menurut LOKASI (lat, lon persis)
    dan menit +-1, bukan menit pecahan persis: gudang & ramalan lama bisa berbeda pembulatan menit.
    D = gudang semua sensor; tiap ramalan dinilai dengan sensornya sendiri (r["sensor"], catatan lama = S-NPP). Sensor yang sudah berhenti
    sebelum 72 jam-nya lengkap -> kedaluwarsa + sensor_berhenti (label tak lengkap, bukan "tidak lolos"). Sensor yang deteksi terakhirnya
    < t0 + 72 jam tetapi BELUM dipensiunkan -> dilewati (tak ditulis), dinilai lagi di jalan berikutnya: label terpotong tak boleh jadi permanen."""
    akhir = akhir_sensor(D)
    per_s, per_lok = {}, {}
    for x in D:
        rows = per_s.setdefault(x[3], [])
        per_lok.setdefault(x[3], {}).setdefault((x[1], x[2]), []).append(len(rows))
        rows.append(x)
    out = []
    for r in ramalan:
        if (r["kunci"], r["mode"]) in dinilai:
            continue
        t0 = float(r["kunci"].split("_")[0])
        if a0 < t0 + JEDA_NILAI:
            continue
        s = r.get("sensor", "N")
        snpp = per_s.get(s, [])
        if t0 < t_awal:
            out.append({"kunci": r["kunci"], "mode": r["mode"], "kedaluwarsa": True})
            continue
        if akhir.get(s, -math.inf) < t0 + 72 * 60:  # 72 jam belum tertutup deteksi sensor ini
            if mati(s, kunci):
                out.append({"kunci": r["kunci"], "mode": r["mode"], "kedaluwarsa": True, "sensor_berhenti": True, "sensor": s})
            continue
        awal = sorted({i for m, la, lo in r["awal"] for i in per_lok.get(s, {}).get((la, lo), ()) if abs(snpp[i][0] - m) <= 1})
        if not awal:  # titik awal tak ketemu di gudang sesudah jeda: tak akan membaik, jangan dibuang diam-diam
            out.append({"kunci": r["kunci"], "mode": r["mode"], "kedaluwarsa": True, "tak_cocok": True})
            continue
        n72 = label72(snpp, awal, t0)
        out.append({"kunci": r["kunci"], "mode": r["mode"], "n72": n72, "lolos": n72 >= LL.LEPAS, "dinilai": acuan, "sensor": s})
    return out


def main():
    os.makedirs(FOLDER, exist_ok=True)
    M = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))
    if "lolos" not in M:
        sys.exit("model_sebaran.json belum memuat 'lolos' (jalankan lolos.py akhir)")
    hs = json.load(open(os.path.join(PUBLIK, "hotspot.json")))
    D, a0 = gabung(muat_gudang(), hs)
    with gzip.open(GUDANG, "wt") as f:
        json.dump(D, f, separators=(",", ":"))
    per = baca_peralihan()
    kunci_s = (per or {}).get("primer")
    prim, pend, beralih = pilih_sensor(D, a0, kunci_s)
    akhir = akhir_sensor(D)
    if beralih:  # sekali, tak berbalik. Jendela buta: dari deteksi S-NPP terakhir sampai peralihan tak ada titik baru yang diramal
        aN = akhir.get("N")
        per = {"kunci": "peralihan", "mode": "sensor", "primer": "N20", "dari": "N", "beralih": (T0 + dt.timedelta(minutes=a0)).isoformat()[:16],
               "snpp_terakhir": (T0 + dt.timedelta(minutes=aN)).isoformat()[:16] if aN is not None else None,
               "buta_jam": round((a0 - aN) / 60, 1) if aN is not None else None,
               "catatan": "titik api baru yang mulai di jendela buta dan berumur > 24 jam saat peralihan tidak pernah diramal"}
        json.dump(per, open(PERALIHAN, "w"))
        kunci_s = "N20"
        log("PERALIHAN sensor primer S-NPP -> NOAA-20 dikunci:", json.dumps(per))
    ramalan = baca_jsonl(RAMALAN)
    if prim is None:  # tanpa primer: status eksplisit; ramalan lama TIDAK dinilai (akan dinilai saat data kembali), tidak ada yang kedaluwarsa
        st = "tanpa_viirs" if not any(s in akhir for s in SENSOR_URUT) else "tanpa_primer"
        log(f"{st.upper()}: gudang {len(D)} deteksi, sensor {sorted(akhir)}, primer terkunci {kunci_s}, acuan {hs['acuan']}")
        ringkas({"status": st, "sensor": None, "pendamping": None, "peralihan": per})
        return
    snpp = [r for r in D if r[3] == prim]
    n20 = [r for r in D if r[3] == pend] if pend else []
    log(f"gudang {len(D)} deteksi, primer {prim} ({len(snpp)}), pendamping {pend} ({len(n20)}), acuan {hs['acuan']}")
    sudah = {(r["kunci"], r["mode"]) for r in ramalan}
    t_awal = D[0][0] if D else a0
    # titik api baru: komponen yang mulai >= 7 hari sesudah awal gudang (riwayat konteks lengkap) dan berumur 3-24 jam
    calon = []
    for idx in komponen(snpp).values():
        idx.sort(key=lambda i: snpp[i][0])
        t0 = snpp[idx[0]][0]
        pertama = [i for i in idx if snpp[i][0] - t0 <= 30]
        lo0 = sum(snpp[i][2] for i in pertama) / len(pertama)
        la0 = sum(snpp[i][1] for i in pertama) / len(pertama)
        prov = snpp[idx[0]][5]
        if prov not in PRIORITAS or t0 < t_awal + RIWAYAT_HARI * 1440:
            continue
        umur = a0 - t0
        kunci = f"{t0:.0f}_{la0:.4f}_{lo0:.4f}"
        for mode, lo_, hi_ in (("awal", UMUR_MIN, UMUR_MAKS), ("ulang", LL.ULANG_MENIT + 60, LL.ULANG_MENIT + 12 * 60)):
            if lo_ <= umur <= hi_ and (kunci, mode) not in sudah:
                calon.append((mode, kunci, t0, lo0, la0, prov, [snpp[i] for i in idx if snpp[i][0] <= a0]))
    log(f"{len(calon)} ramalan baru untuk dicatat")
    if calon:
        import cuaca
        from fitur import Konteks, Seri
        hari = (T0 + dt.timedelta(minutes=a0)).date().isoformat()
        C = cuaca_sel(sorted({cuaca.sel05(c[4], c[3]) for c in calon}), hari)
        K = Konteks(bekas=False)
        si = LL.Indeks([r[0] for r in snpp], [r[1] for r in snpp], [r[2] for r in snpp])
        ni = LL.Indeks([r[0] for r in n20], [r[1] for r in n20], [r[2] for r in n20]) if n20 else None
        terbit = dt.datetime.now(dt.timezone.utc).isoformat()[:16]
        with open(RAMALAN, "a") as f:
            for mode, kunci, t0, lo0, la0, prov, rs in calon:
                c = C.get(cuaca.sel05(la0, lo0))
                if not c:
                    continue  # dicoba lagi di jalan berikutnya selama masih dalam jendela umur
                S = Seri(c)
                if not S.cukup(int(t0), 24):
                    continue
                v, st = fitur_titik(K, M, S, rs, t0, lo0, la0, prov, si, ni, mode == "ulang")
                mm = M["lolos_ulang" if mode == "ulang" else "lolos"]
                p = LL.prediksi(mm, v)
                f.write(json.dumps({"kunci": kunci, "mode": mode, "sensor": prim, "pendamping": pend, "terbit": terbit, "acuan_data": hs["acuan"], "t0": (T0 + dt.timedelta(minutes=t0)).isoformat()[:16],
                                    "lat": round(la0, 4), "lon": round(lo0, 4), "prov": prov, "strata": st, "p": round(p, 4), "waspada": p >= mm["ambang"],
                                    "ambang": mm["ambang"], "model": M.get("dibuat"), "awal": [r[:3] for r in rs if r[0] - t0 <= 30],
                                    "fitur": {k: round(x, 3) for k, x in v.items()}}, separators=(",", ":")) + "\n")
    # nilai: ramalan yang 72 jam (+ jeda NRT) sudah lewat
    nilai = baca_jsonl(NILAI)
    baru = nilai_baru(ramalan, {(r["kunci"], r["mode"]) for r in nilai}, D, a0, t_awal, hs["acuan"][:16], kunci_s)
    with open(NILAI, "a") as f:
        for r in baru:
            f.write(json.dumps(r) + "\n")
    ringkas({"status": "ok", "sensor": prim, "pendamping": pend, "peralihan": per, "sensor_akhir": {s: (T0 + dt.timedelta(minutes=m)).isoformat()[:16] for s, m in sorted(akhir.items())}})


# ---------------- arsip permanen ----------------
# Cache Actions hidup 7 hari dan bisa tertimpa (kasus 20 Okt 2026). Arsip = SATU berkas jsonl.gz berisi SELURUH ramalan + nilai, diunggah workflow
# ke R2 (poskokarhutla-foto/arsip/prospektif.jsonl.gz) dan dipulihkan SEBELUM prospektif.py jalan. pulih() hanya MENAMBAH baris yang belum ada
# (kunci, mode): append-only, tidak pernah menimpa. Ukuran: ~1 KB/ramalan dikompres ~0,3 KB => setahun ~ 1-2 MB.
def arsip(tujuan):
    n = 0
    with gzip.open(tujuan, "wt") as f:
        for j, baris in (("r", baca_jsonl(RAMALAN)), ("n", baca_jsonl(NILAI)), ("g", baca_jsonl(GERBANG)), ("s", [baca_peralihan()] if baca_peralihan() else [])):
            for r in baris:
                f.write(json.dumps({"j": j, **r}, separators=(",", ":")) + "\n")
                n += 1
    return n


def pulih(sumber):
    """Gabungkan arsip ke ramalan.jsonl / nilai.jsonl: tambah baris yang (kunci, mode)-nya belum ada. Mengembalikan (ramalan+, nilai+)."""
    os.makedirs(FOLDER, exist_ok=True)
    ada = {"r": {(r["kunci"], r["mode"]) for r in baca_jsonl(RAMALAN)}, "n": {(r["kunci"], r["mode"]) for r in baca_jsonl(NILAI)},
           "g": {(r["kunci"], r["mode"]) for r in baca_jsonl(GERBANG)}, "s": {("peralihan", "sensor")} if baca_peralihan() else set()}
    tambah = {"r": [], "n": [], "g": [], "s": []}
    with gzip.open(sumber, "rt") as f:
        for l in f:
            r = json.loads(l)
            j = r.pop("j")
            if (r["kunci"], r["mode"]) not in ada[j]:
                ada[j].add((r["kunci"], r["mode"]))
                tambah[j].append(r)
    if tambah["s"]:  # keputusan peralihan sensor: dipulihkan bila hilang, tak pernah menimpa
        json.dump(tambah["s"][0], open(PERALIHAN, "w"))
    for j, berkas in (("r", RAMALAN), ("n", NILAI), ("g", GERBANG)):
        with open(berkas, "a") as f:
            for r in tambah[j]:
                f.write(json.dumps(r, separators=(",", ":")) + "\n")
    return len(tambah["r"]), len(tambah["n"])  # vonis gerbang ("g") ikut dipulihkan tanpa dilaporkan: hanya penambah


def ringkas(keadaan=None):
    """keadaan = {"status": "ok" | "tanpa_viirs" | "tanpa_primer", "sensor": primer, "pendamping", "peralihan", ...} dari jalan ini; ditulis apa
    adanya ke prospektif.json. Semua angka "mode" dan gerbang (teruji, kalibrasi_ok, berturut) dihitung HANYA pada ramalan sensor primer
    sekarang (gerbang_sensor): peluang di layar berasal dari sensor itu. per_sensor memuat semua sensor."""
    keadaan = keadaan or {}
    sg = keadaan.get("sensor") or (keadaan.get("peralihan") or {}).get("primer") or "N"
    R_semua = baca_jsonl(RAMALAN)
    R = [r for r in R_semua if r.get("sensor", "N") == sg]
    semua_n = baca_jsonl(NILAI)
    N = {(r["kunci"], r["mode"]): r for r in semua_n if not r.get("kedaluwarsa")}
    out = {"diperbarui": dt.datetime.now(dt.timezone.utc).isoformat()[:16], "definisi": "lolos = >= 10 sel VIIRS 375 m (~140 ha) dalam 72 jam sejak deteksi pertama",
           "catatan": "ramalan dicatat saat titik api baru muncul (cuaca = prakiraan Open-Meteo), dinilai 72 jam kemudian dengan FIRMS NRT; tidak bisa disetel ulang sesudahnya",
           "mode": {}, **keadaan, "gerbang_sensor": sg}
    for mode in ("awal", "ulang"):
        rs = [r for r in R if r["mode"] == mode]
        dn = [(r, N[(r["kunci"], mode)]) for r in rs if (r["kunci"], mode) in N]
        y = [1 if n["lolos"] else 0 for _, n in dn]
        p = [r["p"] for r, _ in dn]
        w = [1 if r["waspada"] else 0 for r, _ in dn]
        o = {"dicatat": len(rs), **metrik_set(p, y, w)}
        if mode == "awal":
            o["kalibrasi"] = gerbang_kalibrasi(p, y)
        o["per_bulan"] = {}
        for r, n in dn:
            b = o["per_bulan"].setdefault(r["t0"][:7], {"dinilai": 0, "lolos": 0, "waspada": 0, "tepat": 0})
            b["dinilai"] += 1
            b["lolos"] += n["lolos"]
            b["waspada"] += r["waspada"]
            b["tepat"] += bool(r["waspada"] and n["lolos"])
        o["per_lahan"] = {st: {"dinilai": sum(1 for r, _ in dn if r["strata"] == st), "lolos": sum(1 for r, n in dn if r["strata"] == st and n["lolos"]),
                               "tepat": sum(1 for r, n in dn if r["strata"] == st and n["lolos"] and r["waspada"]),
                               "waspada": sum(1 for r, _ in dn if r["strata"] == st and r["waspada"])} for st in ("gambut", "mineral", "sabana")}
        o["per_sensor"] = {}  # evaluasi dipisah per sensor primer (S-NPP vs NOAA-20 sesudah 1 Nov 2026); catatan tanpa "sensor" = S-NPP
        dn_semua = [(r, N[(r["kunci"], mode)]) for r in R_semua if r["mode"] == mode and (r["kunci"], mode) in N]
        for s in sorted({r.get("sensor", "N") for r, _ in dn_semua}):
            ds = [(r, n) for r, n in dn_semua if r.get("sensor", "N") == s]
            o["per_sensor"][s] = metrik_set([r["p"] for r, _ in ds], [1 if n["lolos"] else 0 for _, n in ds], [1 if r["waspada"] else 0 for r, _ in ds])
        out["mode"][mode] = o
    out["n_min"] = N_MIN_DINILAI
    A = out["mode"]["awal"]
    klaim = json.load(open(os.path.join(PUBLIK, "model_sebaran.json"))).get("lolos", {}).get("kinerja", {}).get("uji2_recall")
    A["recall_bawah95"] = round(wilson_bawah(A["tepat"], A["lolos"]), 3) if A["lolos"] else None
    out["recall_min"] = round(klaim - TOLERANSI_RECALL, 3) if klaim is not None else None
    out["n_min_lolos"] = N_MIN_LOLOS
    out["tak_cocok"] = sum(1 for r in semua_n if r.get("tak_cocok") and r["mode"] == "awal")  # ramalan yang titik awalnya tak ditemukan lagi saat dinilai
    out["sensor_berhenti"] = sum(1 for r in semua_n if r.get("sensor_berhenti") and r["mode"] == "awal")  # ramalan yang sensornya pensiun sebelum 72 jam
    out["teruji_recall"] = bool(A["dinilai"] >= N_MIN_DINILAI and A["lolos"] >= N_MIN_LOLOS and out["recall_min"] is not None
                                and A["recall_bawah95"] is not None and A["recall_bawah95"] >= out["recall_min"])
    out["kalibrasi_ok"] = kalibrasi_lolos(A.get("kalibrasi"))
    out["ece_maks"], out["skill_min"] = ECE_MAKS, SKILL_MIN
    # laju dasar: Platt dikalibrasi pada laju api besar 2015-2023 (luar-lipatan); laju prospektif yang beda > 2x berarti populasi/pelabelan lain
    # dan peluang di layar tak bisa dianggap terkalibrasi, kecuali Platt sudah dipasang ulang pada data prospektif (kunci lolos.rekalibrasi_prospektif).
    ML = json.load(open(os.path.join(PUBLIK, "model_sebaran.json"))).get("lolos", {})
    lap = next((x for x in ML.get("laporan", []) if str(x.get("himpunan", "")).startswith("Luar-lipatan") and x.get("model") == "baru"), None)
    out["laju_model"] = round(lap["lolos"] / lap["n"], 4) if lap and lap.get("n") else None
    out["rekalibrasi_prospektif"] = bool(ML.get("rekalibrasi_prospektif"))
    out["laju_dasar_ok"], out["rasio_laju"] = laju_sejalan(A["laju_teramati"], out["laju_model"], out["rekalibrasi_prospektif"])
    # layar menyembunyikan peluang "akan membesar" selama false: recall prospektif lolos, peluangnya terkalibrasi (ECE persentil-90 bootstrap, kalibrasi
    # secara umum, Brier skill > 0), laju dasar sejalan DAN semua itu lulus pada dua evaluasi berturut-turut (n dinilai bertambah di antaranya).
    # Uji balik historis (prospektif_historis.json) TIDAK ikut menentukan: ia hanya ditampilkan terpisah.
    ok = keadaan.get("status", "ok") == "ok"  # jalan tanpa data primer: tak lulus dan tak mencatat vonis (tak memutus/menyambung "berturut")
    out["lulus_sekarang"] = bool(ok and out["teruji_recall"] and out["kalibrasi_ok"] and out["laju_dasar_ok"])
    riwayat = [r for r in baca_jsonl(GERBANG) if r.get("sensor", "N") == sg]  # berturut tak pernah menyeberangi peralihan sensor
    out["lulus_berturut"], catat = berturut(riwayat, A["dinilai"], out["lulus_sekarang"])
    if ok and catat and A.get("kalibrasi") and A["dinilai"] >= N_MIN_DINILAI:
        with open(GERBANG, "a") as f:
            f.write(json.dumps({"kunci": f"n{A['dinilai']}" if sg == "N" else f"{sg}_n{A['dinilai']}", "mode": "gerbang", "n": A["dinilai"], "sensor": sg,
                                "lulus": out["lulus_sekarang"], "dinilai": out["diperbarui"]}) + "\n")
    out["teruji"] = out["lulus_berturut"]
    if sg != "N" and not out["teruji"]:
        out["catatan_gerbang"] = f"belum teruji untuk {'NOAA-20' if sg == 'N20' else sg}: {A['dinilai']} ramalan dinilai (perlu >= {N_MIN_DINILAI} dan dua evaluasi berturut)"
    out["mulai"] = min((r["t0"] for r in R_semua), default=None)  # ramalan tertua yang masih tercatat (loncat maju = catatan terputus)
    out["terbaru"] = [{"t0": r["t0"], "lat": r["lat"], "lon": r["lon"], "prov": r["prov"], "p": r["p"], "waspada": r["waspada"], "sensor": r.get("sensor", "N"),
                       "n72": N.get((r["kunci"], "awal"), {}).get("n72")} for r in sorted((r for r in R_semua if r["mode"] == "awal"), key=lambda r: r["t0"])[-60:]]
    json.dump(out, open(RINGKAS, "w"), ensure_ascii=False, separators=(",", ":"))
    log("ringkasan", json.dumps(out["mode"].get("awal", {}))[:300])


def uji_sensor():
    """S-NPP pensiun 1 Nov 2026: aturan peralihan terkunci, penilaian per sensor, gerbang per sensor primer, dan main() ujung-ke-ujung tanpa
    jaringan (cuaca dari cache palsu): S-NPP ada (primer N), S-NPP pensiun (primer N20, dikunci & tak berbalik), tanpa VIIRS (status eksplisit)."""
    import shutil, tempfile
    km, H, P0 = 1 / 111.32, 60, PENSIUN_SNPP
    n20s = lambda t_a, n: [[t_a + i, 0, 0, "N20"] for i in range(n)]
    # sebelum tanggal pensiun: celah S-NPP berapa pun = celah data, S-NPP tetap primer
    assert pilih_sensor([[P0 - 10 * 24 * H, 0, 0, "N"]] + n20s(P0 - 2 * H, 100), P0 - H) == ("N", "N20", False)
    assert pilih_sensor(n20s(P0 - 2 * H, 100), P0 - H)[0] is None, "S-NPP kosong sebelum pensiun: tanpa primer, bukan pindah"
    # sesudah: pindah hanya bila S-NPP diam >= 36 jam DAN NOAA-20 >= 20 deteksi sesudahnya
    aN = P0 - 30 * H
    assert pilih_sensor([[aN, 0, 0, "N"]] + n20s(aN + 1, MIN_N20), P0 + 10 * H) == ("N20", None, True)
    assert pilih_sensor([[aN, 0, 0, "N"], [aN + 5, 0, 0, "N21"]] + n20s(aN + 1, MIN_N20), P0 + 10 * H) == ("N20", "N21", True)
    assert pilih_sensor([[aN, 0, 0, "N"]] + n20s(aN + 1, MIN_N20 - 1), P0 + 10 * H)[0] == "N", "NOAA-20 < 20 deteksi: belum pindah"
    assert pilih_sensor([[aN, 0, 0, "N"]] + n20s(aN + 1, MIN_N20), aN + MATI_JAM * H - 1)[0] == "N", "S-NPP diam < 36 jam: belum pindah"
    assert pilih_sensor([[aN, 0, 0, "N"]] + n20s(aN + 1, MIN_N20), aN + MATI_JAM * H, pensiun=aN + 1)[0] == "N20", "tepat 36 jam: pindah"
    # terkunci: S-NPP muncul lagi tidak membalikkan; NOAA-20 kosong -> tanpa primer
    assert pilih_sensor([[P0 + 9 * H, 0, 0, "N"], [P0, 0, 0, "N20"]], P0 + 10 * H, "N20") == ("N20", None, False)
    assert pilih_sensor([[P0 + 9 * H, 0, 0, "N"]], P0 + 10 * H, "N20")[0] is None
    assert pilih_sensor([], P0)[:2] == (None, None) and pilih_sensor([[0, 0, 0, "N21"]], P0)[0] is None, "NOAA-21 saja bukan primer"
    assert pilih_sensor([[P0 + 99 * H, 0, 0, "N"]], P0)[0] is None, "deteksi sesudah acuan tak dihitung"
    # nilai_baru: S-NPP yang 72 jamnya melewati deteksi S-NPP terakhir L (t0 = L - 60 jam) dan belum dipensiunkan -> DILEWATI (dinilai lagi
    # nanti), bukan label terpotong permanen; sesudah dikunci ke N20 -> sensor_berhenti. Ramalan N20 dinilai dengan deteksi N20.
    t0 = 1000
    gud = [[t0, -3.0, 113.0, "N", 5, "62"], [t0 + 60 * H, -3.0, 113.0 + .5 * km, "N", 5, "62"],
           [t0, -2.0, 114.0, "N20", 5, "62"], [t0 + 500, -2.0, 114.0 + .5 * km, "N20", 5, "62"], [t0 + 80 * H, -1.0, 110.0, "N20", 5, "62"]]
    ram = [{"kunci": f"{t0}_-2.0000_114.0000", "mode": "awal", "sensor": "N20", "awal": [[t0, -2.0, 114.0]]},
           {"kunci": f"{t0}_-3.0000_113.0000", "mode": "awal", "awal": [[t0, -3.0, 113.0]]}]
    a0 = t0 + JEDA_NILAI + 5
    nb = nilai_baru(ram, set(), gud, a0, 0, "x")
    assert len(nb) == 1 and nb[0]["kunci"] == f"{t0}_-2.0000_114.0000" and nb[0]["n72"] == 2 and nb[0]["sensor"] == "N20", nb
    nb = {r["kunci"]: r for r in nilai_baru(ram, set(), gud, a0, 0, "x", "N20")}
    assert nb[f"{t0}_-3.0000_113.0000"] == {"kunci": f"{t0}_-3.0000_113.0000", "mode": "awal", "kedaluwarsa": True, "sensor_berhenti": True, "sensor": "N"}, nb
    gud2 = gud + [[t0 + 75 * H, -4.0, 112.0, "N", 5, "62"]]  # S-NPP menutup 72 jam: dinilai biasa
    assert nilai_baru(ram[1:], set(), gud2, a0, 0, "x")[0]["n72"] == 1  # deteksi t0+60 jam > 24 jam dari t0: tak tersambung
    # main() ujung-ke-ujung (model & lahan asli, cuaca palsu di cache): gudang + hotspot.json sintetis di folder sementara
    acuan = dt.datetime(2026, 11, 5, 6, 0, tzinfo=dt.timezone.utc)
    la0, lo0 = -2.3, 113.9  # Kalimantan Tengah (62)

    def hotspot(sensor_baru, sensor_lama, tambah20=False):
        b = [[la0 + .5, lo0 + .5, -8 * 24.0, s, 3.0, 1, 0, ""] for s in sensor_lama]  # deteksi tua: riwayat gudang >= 7 hari (indeks pendamping juga)
        b += [[la0, lo0, -10.0, s, 6.0, 2, 0, ""] for s in sensor_baru]  # titik api baru 10 jam lalu (jendela umur 6-24 jam)
        b += [[la0 + 1, lo0 + 1, -1.0, s, 2.0, 1, 0, ""] for s in sensor_baru]
        if tambah20:  # NOAA-20 >= 20 deteksi sesudah S-NPP terakhir (titik muda, terpisah: bukan calon)
            b += [[la0 - 1 - .05 * i, lo0, -1.0, "N20", 2.0, 1, 0, ""] for i in range(MIN_N20)]
        return {"acuan": acuan.isoformat(), "wilayah": ["62|Pulang Pisau|X"], "sensor_utama": ["M", "N", "N20"], "baris": b}

    asli = {k: globals()[k] for k in ("PUBLIK", "FOLDER", "GUDANG", "RAMALAN", "NILAI", "GERBANG", "CUACA", "RINGKAS", "PERALIHAN")}
    hasil = {}
    try:
        for nama, daf in (("snpp", [hotspot(["N", "N20"], ["N", "N20"])]),
                          ("n20", [hotspot(["N20", "N21"], ["N", "N20", "N21"], True), hotspot(["N", "N20"], ["N", "N20"], True)]),
                          ("tanpa", [hotspot(["M"], ["M"])])):
            with tempfile.TemporaryDirectory() as td:
                pub, fol = os.path.join(td, "pub"), os.path.join(td, "fol")
                os.makedirs(pub)
                os.makedirs(os.path.join(fol, "cuaca"))
                shutil.copy(os.path.join(asli["PUBLIK"], "model_sebaran.json"), pub)
                import cuaca as CU
                cla, clo = CU.sel05(la0, lo0)
                n = 40 * 24
                json.dump({"lat": cla, "lon": clo, "mulai": (acuan - dt.timedelta(days=36)).strftime("%Y-%m-%dT00:00"), "tc": [32.0] * n, "rh": [55.0] * n,
                           "hujan": [0.0] * n, "ws": [12.0] * n, "wd": [90.0] * n},
                          open(os.path.join(fol, "cuaca", f"{acuan.date().isoformat()}_{cla:.2f}_{clo:.2f}.json"), "w"))
                globals().update(PUBLIK=pub, FOLDER=fol, GUDANG=os.path.join(fol, "titik.json.gz"), RAMALAN=os.path.join(fol, "ramalan.jsonl"),
                                 NILAI=os.path.join(fol, "nilai.jsonl"), GERBANG=os.path.join(fol, "gerbang.jsonl"), CUACA=os.path.join(fol, "cuaca"),
                                 RINGKAS=os.path.join(pub, "prospektif.json"), PERALIHAN=os.path.join(fol, "sensor.json"))
                hasil[nama] = []
                for hs in daf:
                    json.dump(hs, open(os.path.join(pub, "hotspot.json"), "w"))
                    main()
                    hasil[nama].append((baca_jsonl(RAMALAN), json.load(open(RINGKAS)), baca_peralihan()))
                if nama == "n20":  # keputusan peralihan ikut arsip dan pulih bila hilang
                    arsip(os.path.join(td, "a.gz"))
                    os.remove(PERALIHAN)
                    pulih(os.path.join(td, "a.gz"))
                    assert baca_peralihan()["primer"] == "N20"
    finally:
        globals().update(asli)
    r, o, per = hasil["snpp"][0]
    assert len(r) == 1 and r[0]["sensor"] == "N" and r[0]["pendamping"] == "N20" and o["status"] == "ok" and o["sensor"] == "N" and per is None, (r, o)
    assert r[0]["fitur"]["n20_0"] >= 1 and o["gerbang_sensor"] == "N", "pendamping N20 di sel awal harus terhitung"
    r, o, per = hasil["n20"][0]
    assert len(r) == 1 and r[0]["sensor"] == "N20" and r[0]["pendamping"] == "N21" and o["sensor"] == "N20" and 0 <= r[0]["p"] <= 1, (r, o)
    assert r[0]["fitur"]["n20_0"] >= 1 and r[0]["fitur"]["n0"] == 1, "S-NPP pensiun: titik dari NOAA-20, pendamping NOAA-21"
    assert per["primer"] == "N20" and o["peralihan"]["buta_jam"] == 8 * 24 and o["gerbang_sensor"] == "N20" and not o["teruji"] and "NOAA-20" in o["catatan_gerbang"], o
    r2, o2, per2 = hasil["n20"][1]
    assert o2["sensor"] == "N20" and per2 == per, "S-NPP muncul lagi: peralihan tidak berbalik"
    r, o, per = hasil["tanpa"][0]
    assert r == [] and o["status"] == "tanpa_viirs" and o["sensor"] is None and "mode" in o, o
    # gerbang per sensor primer: 400 ramalan S-NPP dinilai tidak membuka gerbang untuk NOAA-20 (10 dinilai); vonis gerbang bersensor
    with tempfile.TemporaryDirectory() as td:
        globals().update(RAMALAN=os.path.join(td, "r.jsonl"), NILAI=os.path.join(td, "n.jsonl"), GERBANG=os.path.join(td, "g.jsonl"), RINGKAS=os.path.join(td, "p.json"))
        try:
            rnd = random.Random(5)
            with open(RAMALAN, "w") as fr, open(NILAI, "w") as fn:
                for i in range(410):
                    s_ = "N" if i < 400 else "N20"
                    q = rnd.random() * .3
                    fr.write(json.dumps({"kunci": f"{i}_0_0", "mode": "awal", "sensor": s_, "p": q, "waspada": q > .1, "t0": "2026-10-01T00:00", "strata": "gambut",
                                         "lat": 0, "lon": 0, "prov": "62"}) + "\n")
                    fn.write(json.dumps({"kunci": f"{i}_0_0", "mode": "awal", "n72": 1, "lolos": rnd.random() < q, "sensor": s_}) + "\n")
            ringkas({"status": "ok", "sensor": "N20"})
            o = json.load(open(RINGKAS))
            assert o["mode"]["awal"]["dinilai"] == 10 and not o["teruji_recall"] and not o["teruji"] and o["mode"]["awal"]["per_sensor"]["N"]["dinilai"] == 400, o["mode"]["awal"]
            ringkas({"status": "ok", "sensor": "N"})
            o = json.load(open(RINGKAS))
            assert o["mode"]["awal"]["dinilai"] == 400 and baca_jsonl(GERBANG)[-1]["sensor"] == "N", baca_jsonl(GERBANG)
            # vonis S-NPP lulus tak boleh dihitung sebagai "evaluasi sebelumnya" untuk NOAA-20
            open(GERBANG, "w").write(json.dumps({"kunci": "n300", "mode": "gerbang", "n": 300, "lulus": True}) + "\n")
            assert berturut([r for r in baca_jsonl(GERBANG) if r.get("sensor", "N") == "N20"], 400, True)[0] is False
            ringkas({"status": "tanpa_primer", "sensor": None, "peralihan": {"primer": "N20"}})
            o = json.load(open(RINGKAS))
            assert o["gerbang_sensor"] == "N20" and not o["lulus_sekarang"] and len(baca_jsonl(GERBANG)) == 1, "jalan tanpa primer tak lulus & tak mencatat vonis"
        finally:
            globals().update(asli)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji_sensor()
        # label72: rantai 3 sel dalam 72 jam + satu sel sesudah 72 jam + satu sel 2 km jauhnya -> 3
        km = 1 / 111.32
        s = [[0, 0.0, 110.0, "N", 5, "62"], [600, 0.0, 110 + .5 * km, "N", 5, "62"], [2000, 0.0, 110 + 1.0 * km, "N", 5, "62"],
             [72 * 60 + 100, 0.0, 110 + 1.4 * km, "N", 5, "62"], [100, 0.0, 110 + 3 * km, "N", 5, "62"]]
        assert label72(s, [0], 0) == 3, label72(s, [0], 0)
        # gabung: dedup, buang sensor lain & keyakinan rendah, pangkas umur
        hs = {"acuan": "2026-10-12T12:00:00+00:00", "wilayah": ["62|Pulang Pisau|X"],
              "baris": [[-2.0, 114.0, -1.0, "N", 3.0, 1, 0, ""], [-2.0, 114.0, -1.0, "N", 3.0, 1, 0, ""], [-2.0, 114.0, -2.0, "M", 3.0, 2, 0, ""],
                        [-2.0, 114.1, -3.0, "N20", 3.0, 0, 0, ""], [-2.0, 114.2, -400.0, "N", 3.0, 2, 0, ""]]}
        g, a0 = gabung([], hs)
        assert len(g) == 1 and g[0][3] == "N" and g[0][5] == "62" and abs(g[0][0] - (a0 - 60)) < 1e-6, g
        g2, _ = gabung(g, hs)
        assert len(g2) == 1
        # kasus 0-dinilai: ramalan memuat menit pecahan (.4) yang tak sama dengan gudang sekarang; harus tetap dinilai lewat lokasi
        gud = [[1000, -2.0, 114.0, "N", 5, "62"], [1500, -2.0, 114.0 + .5 * km, "N", 5, "62"], [2000, -2.0, 114.0 + 1.0 * km, "N", 5, "62"],
               [1000 + 75 * 60, -6.0, 106.0, "N", 5, "31"]]  # deteksi S-NPP jauh sesudah 72 jam: jendela label tertutup
        ram = [{"kunci": "1000_-2.0000_114.0000", "mode": "awal", "awal": [[1000.4, -2.0, 114.0]]},
               {"kunci": "9999_-1.0000_100.0000", "mode": "awal", "awal": [[9999.0, -1.0, 100.0]]}]
        nb = nilai_baru(ram, set(), gud, 1000 + JEDA_NILAI + 5, 0, "x")
        assert len(nb) == 1 and nb[0]["n72"] == 3 and nb[0]["lolos"] is False, nb  # ramalan kedua belum 78 jam: tak dinilai
        assert nilai_baru(ram, {("1000_-2.0000_114.0000", "awal")}, gud, 1000 + JEDA_NILAI + 5, 0, "x") == []
        assert nilai_baru(ram, set(), gud, 1000 + JEDA_NILAI + 5, 2000, "x")[0].get("kedaluwarsa")
        r0 = nilai_baru([{"kunci": "1000_-9.0000_100.0000", "mode": "awal", "awal": [[1000.0, -9.0, 100.0]]}], set(), gud, 1000 + JEDA_NILAI + 5, 0, "x")
        assert r0 == [{"kunci": "1000_-9.0000_100.0000", "mode": "awal", "kedaluwarsa": True, "tak_cocok": True}], r0  # tak cocok => dihitung, bukan dibuang
        assert abs(wilson_bawah(34, 50) - 0.541) < .005 and wilson_bawah(0, 0) is None
        # kalibrasi: model sempurna terkalibrasi (y ~ Bernoulli(p)) -> ECE kecil, skill > 0; model terbalik -> ECE besar, skill < 0
        rnd = __import__("random").Random(7)
        pp = [rnd.random() * .5 for _ in range(4000)]
        yy = [1 if rnd.random() < q else 0 for q in pp]
        kb = kalibrasi(pp, yy)
        assert len(kb["kantong"]) == 10 and sum(b["n"] for b in kb["kantong"]) == 4000 and kb["ece"] < .04 and kb["brier_skill"] > .05 and kalibrasi_lolos(kb), kb
        assert all(b["lo"] <= b["teramati"] <= b["hi"] for b in kb["kantong"])
        assert [b["p_diramal"] for b in kb["kantong"]] == sorted(b["p_diramal"] for b in kb["kantong"])
        kj = kalibrasi([.1 if v else .9 for v in yy], yy)
        assert kj["ece"] > .5 and kj["brier_skill"] < 0 and not kalibrasi_lolos(kj), kj
        # hitung tangan: 4 kantong (n=120, k=4): peluang 0,1 teramati 0,3 => ECE 0,2; Brier = rata-rata (p-y)^2; klimatologi = 0,3*0,7
        kh = kalibrasi([.1] * 120, [1 if i % 10 in (0, 3, 6) else 0 for i in range(120)])  # ikatan peluang: urutan stabil = urutan indeks
        assert kh["ece"] == 0.2 and kh["kantong"][0]["teramati"] == .3 and abs(kh["brier"] - (36 * .81 + 84 * .01) / 120) < 1e-3 and kh["brier_klimatologi"] == .21 and len(kh["kantong"]) == 4, kh
        assert kalibrasi([.1] * 50, [0] * 50) is None and not kalibrasi_lolos(None)
        # gerbang 1b: ECE persentil-90 >= ECE titik; kalibrasi-secara-umum menolak model yang skalanya salah walau ECE mutlak kecil
        g = gerbang_kalibrasi(pp, yy)
        assert g["ece_p90"] >= g["ece"] and g["di_besar"]["ok"] and kalibrasi_lolos(g) == (g["ece_p90"] <= ECE_MAKS), g
        assert gerbang_kalibrasi([.1] * 50, [0] * 50) is None
        lamb = [.02] * 3000  # peluang 2% padahal laju 6%: ECE mutlak 0,04 < 0,08 TAPI skala salah 3x -> di_besar menolak
        yl = [1 if i % 50 < 3 else 0 for i in range(3000)]
        dl = di_besar(lamb, yl)
        assert not dl["ok"] and kalibrasi(lamb, yl)["ece"] < ECE_MAKS and not kalibrasi_lolos({**kalibrasi(lamb, yl), "di_besar": dl}), dl
        assert di_besar([.06] * 3000, yl)["ok"] and di_besar([.045] * 3000, yl)["ok"] and not di_besar([.2] * 3000, yl)["ok"]
        # ECE persentil-90 pada sampel kecil yang kebetulan bagus: batas atas > titik (hukuman noise), sampel besar mendekati titik
        rk = random.Random(3)
        pk = [rk.random() * .5 for _ in range(300)]
        yk = [1 if rk.random() < q else 0 for q in pk]
        gk = gerbang_kalibrasi(pk, yk)
        assert gk["ece_p90"] > gk["ece"] + .005 and gk["ece_p90"] > g["ece_p90"], (gk["ece"], gk["ece_p90"], g["ece_p90"])
        # 1c: laju beda > 2x ditolak kecuali direkalibrasi
        assert laju_sejalan(.17, .0279, False) == (False, 6.09) and laju_sejalan(.17, .0279, True)[0] and laju_sejalan(.03, .0279, False)[0]
        assert not laju_sejalan(.01, .0279, False)[0] and laju_sejalan(.0, .0279, False) == (False, None)
        # 1b: dua evaluasi berturut-turut (n harus bertambah >= TAMBAH_MIN); lulus pertama saja, atau n tak bertambah, tidak cukup
        assert berturut([], 400, True) == (False, True)
        assert berturut([{"n": 400, "lulus": True}], 400, True) == (False, False)
        assert berturut([{"n": 400, "lulus": True}], 420, True)[0] is False
        assert berturut([{"n": 400, "lulus": True}], 440, True) == (True, True)
        assert berturut([{"n": 400, "lulus": False}], 500, True)[0] is False and berturut([{"n": 400, "lulus": True}], 500, False)[0] is False
        assert berturut([{"n": 300, "lulus": False}, {"n": 400, "lulus": True}], 500, True)[0]
        lo, hi = wilson(30, 100)
        assert abs(lo - .2189) < .002 and abs(hi - .3961) < .002 and wilson(0, 0) == (None, None)
        # arsip: bolak-balik tidak menambah apa pun, sumber lama TIDAK menimpa baris yang sudah ada
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            globals().update(FOLDER=td, RAMALAN=os.path.join(td, "r.jsonl"), NILAI=os.path.join(td, "n.jsonl"), GERBANG=os.path.join(td, "g.jsonl"))
            open(RAMALAN, "w").write('{"kunci":"a","mode":"awal","p":0.1}\n')
            open(NILAI, "w").write('{"kunci":"a","mode":"awal","n72":3,"lolos":false}\n')
            arsip(os.path.join(td, "x.gz"))
            open(RAMALAN, "a").write('{"kunci":"b","mode":"awal","p":0.2}\n')
            isi = open(RAMALAN).read().replace('"p":0.1', '"p":0.9')
            open(RAMALAN, "w").write(isi)  # salinan lokal berbeda: arsip tak boleh menimpanya
            assert pulih(os.path.join(td, "x.gz")) == (0, 0)
            os.remove(NILAI)
            assert pulih(os.path.join(td, "x.gz")) == (0, 1) and len(baca_jsonl(RAMALAN)) == 2 and baca_jsonl(RAMALAN)[0]["p"] == .9
            # vonis gerbang ikut arsip: pulih menambah yang hilang, tak menimpa
            open(GERBANG, "w").write('{"kunci":"n400","mode":"gerbang","n":400,"lulus":true}\n')
            arsip(os.path.join(td, "y.gz"))
            os.remove(GERBANG)
            pulih(os.path.join(td, "y.gz"))
            assert baca_jsonl(GERBANG)[0]["lulus"] is True
        print("ok")
    elif sys.argv[1:2] == ["arsip"]:
        print("arsip", arsip(sys.argv[2]), "baris")
    elif sys.argv[1:2] == ["pulih"]:
        print("pulih (ramalan, nilai):", pulih(sys.argv[2]) if os.path.exists(sys.argv[2]) else "sumber tidak ada, dilewati")
    else:
        main()
