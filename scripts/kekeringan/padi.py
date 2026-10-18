"""Cekaman air padi tadah hujan (penanda risiko gagal panen) per kabupaten -> public/data/kekeringan_padi.json

INI INDIKATOR CEKAMAN AIR, BUKAN DATA PUSO. Kementan menetapkan puso dari pengamatan lapangan (kerusakan > 75%); model ini hanya menghitung
seberapa sering skenario ensemble membuat padi tadah hujan kekurangan air. Sawah beririgasi, pompa, dan genangan sawah tidak dimodelkan, jadi
angka lebih tinggi dari kenyataan di daerah beririgasi. Repo tidak punya data luas sawah: bobot kabupaten = penduduk (bukan luas sawah) dan
semua kabupaten ditandai `data_sawah: false`. JANGAN diperingkat lintas wilayah: tanah, hujan, dan tanam beda tiap wilayah; yang bermakna adalah
`selisih` = penurunan hasil skenario ensemble dikurangi penurunan hasil di wilayah yang sama bila hujan sama dengan klimatologi (Normal).

Model (FAO-56 bab 8 neraca air tanaman tunggal + FAO-33 penurunan hasil), per sel 0,5 derajat dan per anggota SEAS5 titik 2 derajatnya (musiman.json).
Konstanta tanaman dan tanah dari scripts/kekeringan/fao.py (dicocokkan ke teks FAO-56 oleh pengerja neraca):
  Fase (hari)    : awal 30, perkembangan 30, tengah 60, akhir 30 = 150 hari (FAO-56 Tabel 11, padi tropis).
  Kc             : 1,05 awal, naik linear ke 1,20 selama perkembangan, 1,20 tengah, turun linear ke 0,90 selama akhir (Tabel 12).
  Tanah          : TAW = 1000 (qFC - qWP) Zr = 65 mm (lempung Tabel 19, Zr 0,5 m Tabel 22), p = 0,20 (Tabel 22). Ks = (TAW - Dr) / ((1 - p) TAW)
                   bila Dr > p TAW; kelebihan hujan dibuang (tanpa genangan sawah); tanah mulai kapasitas lapang saat tanam (sawah dilumpurkan).
  ETa            : Ks x Kc x ET0 harian (ET0 = rerata anggota SEAS5 di blok 4 derajat).
  Hasil          : Ya/Ym = 1 - Ky (1 - sum ETa / sum ETc), Ky = 1,09 padi seluruh musim (Doorenbos & Kassam 1979, FAO-33). Ky per fase tidak dipakai.
  Gagal panen    : penurunan hasil >= 50% (AMBANG_GAGAL), tahap kedua >= 25% (AMBANG_TURUN). Ambang pilihan kami, bukan definisi resmi.
  Tanam per sel  : ONSET hujan klimatologi POWER 1991-2020 sel itu: bulan pertama (urutan Sep, Okt, Nov, Des, Jan, Feb, Mar) yang jumlah hujan
                   klimatologinya >= 150 mm DAN bulan berikutnya juga >= 150 mm (setara awal musim hujan BMKG 50 mm/dasarian, tiga dasarian berturut-turut).
                   Tanpa bulan seperti itu (wilayah kering): bulan pertama >= 100 mm, atau bulan terbasah. Tanam = tanggal 15 bulan itu, tidak sebelum
                   tanggal terbit prakiraan.
  Di luar prakiraan : musim 150 hari melewati ujung prakiraan (~150 hari); sisanya diisi hujan klimatologi bulanan. Bagian itu dilaporkan (`klim_pct`).
  Normal         : ANSAMBEL klimatologi, bukan hujan konstan: tiap anggota (51, sebanyak ensemble) adalah deret harian acak dengan rerata bulanan = klimatologi
                   POWER sel itu, dibangkitkan pemecah bulanan ke harian (rantai Markov basah/kering, kemungkinan basah = rerata / 15 mm per hari hujan
                   (fao.ASUMSI_INTENSITAS, sama dengan skenario neraca.py), hujan hari basah eksponensial, persistensi lag-1 0,3 (ASUMSI)). Hujan konstan membuat
                   tanah tak pernah kering dan membuat selisih mengukur kejarangan hujan, bukan anomali. ET0 sama dengan skenario ensemble. Dari 51 deret itu diambil
                   median penurunan hasil dan peluang turun >= 25% (`turun_normal`, `turun25_normal`) agar peluang bisa dibandingkan dengan peluang. SEAS5 mentah di
                   bulan +2/+3 membawa bias (median anggota 1,1 sampai 1,2 kali klimatologi) dan hujan hariannya cenderung gerimis, jadi selisih bukan murni sinyal iklim.

Pakai:  python3 scripts/kekeringan/padi.py      |  python3 scripts/kekeringan/padi.py uji
"""
import calendar, datetime as dt, json, os, random, statistics, sys, time, zlib

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan
import fao
import hth as H
import spi as SPI

FASE = tuple(zip(("awal", "perkembangan", "tengah", "akhir"), fao.FASE_PADI))
KC_AWAL, KC_TENGAH, KC_AKHIR = fao.KC_PADI
TAW = fao.TAW_MINERAL
P_DEPLESI = fao.P_PADI
KY = 1.09
AMBANG_GAGAL = 0.50
AMBANG_TURUN = 0.25
ANGGOTA = 51
UMUR = sum(h for _, h in FASE)
ONSET_BULAN = (9, 10, 11, 12, 1, 2, 3)
ONSET_MM = 150.0
ONSET_LONGGAR_MM = 100.0
TANGGAL_TANAM = 15
INTENSITAS = fao.ASUMSI_INTENSITAS   # mm per hari hujan, sama dengan neraca.py
PERSISTENSI = 0.3                   # ASUMSI: korelasi lag-1 basah/kering


def jadwal_kc():
    """[(indeks fase, Kc)] untuk UMUR hari."""
    out = []
    a, v, g, m = (h for _, h in FASE)
    for i in range(UMUR):
        if i < a:
            f, kc = 0, KC_AWAL
        elif i < a + v:
            f, kc = 1, KC_AWAL + (KC_TENGAH - KC_AWAL) * (i - a + 1) / v
        elif i < a + v + g:
            f, kc = 2, KC_TENGAH
        else:
            f, kc = 3, KC_TENGAH + (KC_AKHIR - KC_TENGAH) * (i - a - v - g + 1) / m
        out.append((f, kc))
    return out


KC = jadwal_kc()


def neraca(p, et0):
    """Neraca air harian UMUR hari: p, et0 (mm/hari). Mengembalikan (ETa per fase, ETc per fase)."""
    if len(p) < UMUR or len(et0) < UMUR:
        raise ValueError(f"neraca butuh {UMUR} hari, ada {len(p)} hujan / {len(et0)} ET0")
    if any(v is None or v < 0 for v in p[:UMUR]) or any(v is None or v < 0 for v in et0[:UMUR]):
        raise ValueError("hujan atau ET0 kosong/negatif")
    dr = 0.0   # defisit zona akar, mm; 0 = kapasitas lapang
    eta, etc = [0.0] * 4, [0.0] * 4
    raw = P_DEPLESI * TAW
    for i in range(UMUR):
        f, kc = KC[i]
        ks = 1.0 if dr <= raw else max(0.0, (TAW - dr) / ((1 - P_DEPLESI) * TAW))
        c = kc * et0[i]
        a = ks * c
        dr = min(TAW, max(0.0, dr - p[i] + a))
        eta[f] += a
        etc[f] += c
    return eta, etc


def penurunan(eta, etc):
    """Penurunan hasil relatif 1 - Ya/Ym (0..1), FAO-33 seluruh musim."""
    tc = sum(etc)
    if tc <= 0:
        raise ValueError("ETc nol")
    return min(1.0, max(0.0, KY * (1 - sum(eta) / tc)))


def klim_bulanan(pow_):
    """{bulan 1..12: (mm/hari, mm/bulan)} rata-rata POWER 1991-2020; bulan tanpa data diabaikan."""
    out = {}
    for m in range(1, 13):
        v = [pow_.get(f"{y}{m:02d}") for y in range(SPI.DASAR[0], SPI.DASAR[1] + 1)]
        v = [x for x in v if x is not None]
        if len(v) >= 20:
            r = sum(v) / len(v)
            out[m] = (r, r * 30.4)
    return out


def bulan_onset(klim):
    """Bulan onset hujan (1..12) dari klimatologi bulanan, aturan di docstring; None bila klimatologi tak lengkap."""
    for b, nb in zip(ONSET_BULAN, ONSET_BULAN[1:] + ONSET_BULAN[:1]):
        if b in klim and nb in klim and klim[b][1] >= ONSET_MM and klim[nb][1] >= ONSET_MM:
            return b
    for b in ONSET_BULAN:
        if b in klim and klim[b][1] >= ONSET_LONGGAR_MM:
            return b
    cand = [(klim[b][1], b) for b in ONSET_BULAN if b in klim]
    return max(cand)[1] if cand else None


def tanggal_tanam(bulan, terbit):
    """Tanggal 15 `bulan` pada musim berjalan (Sep-Des tahun terbit, Jan-Mar tahun berikutnya); tidak lebih awal dari tanggal terbit."""
    th = terbit.year if bulan >= 7 else terbit.year + 1
    return max(dt.date(th, bulan, TANGGAL_TANAM), terbit)


def seri_musim(tanam, tgl_fc, anggota_p, et0_fc, klim):
    """Hujan dan ET0 UMUR hari sejak `tanam`: anggota SEAS5 (anggota_p[hari]) di dalam prakiraan, klimatologi bulanan di luarnya.
    Mengembalikan (hujan, et0, jumlah hari terisi klimatologi)."""
    idx = {d: i for i, d in enumerate(tgl_fc)}
    ekor = sum(et0_fc[-14:]) / len(et0_fc[-14:])
    p, e, kl = [], [], 0
    for k in range(UMUR):
        d = tanam + dt.timedelta(days=k)
        i = idx.get(d)
        if i is not None:
            p.append(max(0.0, anggota_p(i)))
            e.append(et0_fc[i])
        else:
            p.append(klim[d.month][0])
            e.append(ekor)
            kl += 1
    return p, e, kl


def hujan_klim_acak(tanam, klim, rng):
    """Satu deret harian UMUR hari beruntun (rantai Markov dua keadaan) dengan rerata bulanan = klimatologi `klim` ({bulan: (mm/hari, mm/bulan)}).
    Kemungkinan hari basah pw = rerata / INTENSITAS (maks 0,9), jumlah hujan hari basah eksponensial dengan rerata rerata/pw, sehingga rerata terjaga."""
    out, basah = [], rng.random() < 0.5
    for k in range(UMUR):
        r = klim[(tanam + dt.timedelta(days=k)).month][0]
        pw = min(0.9, r / INTENSITAS) if r > 0 else 0.0
        peluang = pw + PERSISTENSI * (1 - pw) if basah else pw * (1 - PERSISTENSI)
        basah = pw > 0 and rng.random() < peluang
        out.append(rng.expovariate(pw / r) if basah and r > 0 else 0.0)
    return out


def hasil_sel(pow_, v, tgl_fc, terbit, kunci=""):
    """Satu sel (`kunci` = kunci sel, benih Normal): v = {'p': [hari][anggota], 'et0': [hari]} titik induknya -> dict penurunan per anggota, Normal, tanam, bagian klimatologi. None bila klimatologi kurang."""
    klim = klim_bulanan(pow_)
    b = bulan_onset(klim)
    if b is None or len(klim) < 12:
        return None
    tanam = tanggal_tanam(b, terbit)
    reds, fd, kl = [], [0.0] * 4, 0
    for j in range(ANGGOTA):
        p, e, kl = seri_musim(tanam, tgl_fc, lambda i: v["p"][i][j], v["et0"], klim)
        eta, etc = neraca(p, e)
        reds.append(penurunan(eta, etc))
        for f in range(4):
            fd[f] += (1 - eta[f] / etc[f]) / ANGGOTA if etc[f] > 0 else 0
    # Normal: ansambel deret harian acak berklimatologi sama (benih tetap dari kunci sel agar keluaran stabil)
    rng = random.Random(zlib.crc32(f"{kunci}|{terbit.isoformat()}".encode()))
    _, e, _ = seri_musim(tanam, tgl_fc, lambda i: 0.0, v["et0"], klim)
    normal = [penurunan(*neraca(hujan_klim_acak(tanam, klim, rng), e)) for _ in range(ANGGOTA)]
    return {"reds": reds, "fase": fd, "normal": normal, "tanam": tanam, "klim_pct": 100 * kl / UMUR}


def bangun(musiman, pow_sel, penduduk, pusat, sekarang):
    if not musiman or not musiman.get("titik"):
        raise ValueError("musiman.json kosong")
    terbit = dt.date.fromisoformat(musiman["terbit"])
    tgl_fc = [dt.date.fromisoformat(t) for t in musiman["tgl"]]
    if len(tgl_fc) < 60:
        raise ValueError(f"prakiraan hanya {len(tgl_fc)} hari")
    sel = {}
    for c, t in musiman["anak"].items():
        v = musiman["titik"].get(t)
        if v and v.get("p") is not None and v.get("et0") is not None and c in pow_sel:
            r = hasil_sel(pow_sel[c], v, tgl_fc, terbit, c)
            if r:
                reds = r["reds"]
                sel[c] = {"gagal": 100 * sum(1 for x in reds if x >= AMBANG_GAGAL) / ANGGOTA, "turun25": 100 * sum(1 for x in reds if x >= AMBANG_TURUN) / ANGGOTA,
                          "med": 100 * statistics.median(reds), "p90": 100 * sorted(reds)[int(.9 * (ANGGOTA - 1))], "normal": 100 * statistics.median(r["normal"]), "normal25": 100 * sum(1 for x in r["normal"] if x >= AMBANG_TURUN) / ANGGOTA,
                          "normal_gagal": 100 * sum(1 for x in r["normal"] if x >= AMBANG_GAGAL) / ANGGOTA, "fase": r["fase"],
                          "tanam": r["tanam"], "klim_pct": r["klim_pct"]}
    if not sel:
        raise ValueError("tak satu sel pun punya hujan, ET0, dan klimatologi")
    peta = H.peta_kec(penduduk, pusat, sel)
    kode = H.kode_kab(penduduk)
    per_kab = {}
    for prov, kab, jiwa, c in peta:
        per_kab.setdefault(kab, []).append((jiwa, sel[c]))

    def rata(d, f):
        return sum(w * f(r) for w, r in d) / sum(w for w, _ in d)
    kab = {}
    for k, d in per_kab.items():
        fd = [rata(d, lambda r, f=f: r["fase"][f]) for f in range(4)]
        med, normal = rata(d, lambda r: r["med"]), rata(d, lambda r: r["normal"])
        tanam = sorted(r["tanam"] for _, r in d)[len(d) // 2]
        kab[k] = {"kode": kode.get(k), "prov": k.split("|")[0], "gagal": round(rata(d, lambda r: r["gagal"])), "turun25": round(rata(d, lambda r: r["turun25"])),
                  "turun_med": round(med), "turun_p90": round(rata(d, lambda r: r["p90"])), "turun_normal": round(normal), "selisih": round(med - normal),
                  "turun25_normal": round(rata(d, lambda r: r["normal25"])), "gagal_normal": round(rata(d, lambda r: r["normal_gagal"])),
                  "tanam": tanam.isoformat(), "klim_pct": round(rata(d, lambda r: r["klim_pct"])),
                  "fase_terberat": FASE[max(range(4), key=lambda f: fd[f])][0], "defisit_fase": [round(100 * x) for x in fd], "data_sawah": False}
    tg = sorted(r["tanam"] for r in sel.values())
    return {"dibuat": sekarang.isoformat(timespec="minutes"), "label": "Deteksi Pantau Bencana", "terbit": musiman["terbit"],
            "tanam": {"rentang": [tg[0].isoformat(), tg[-1].isoformat()], "definisi": f"onset hujan klimatologi POWER 1991-2020 per sel: bulan pertama dengan hujan >= {ONSET_MM:g} mm dan bulan berikutnya juga; tanam tanggal {TANGGAL_TANAM} bulan itu, paling awal tanggal terbit"},
            "fase": [{"nama": n, "hari": h} for n, h in FASE], "umur": UMUR,
            "ambang": {"gagal_pct": int(100 * AMBANG_GAGAL), "turun_pct": int(100 * AMBANG_TURUN)},
            "catatan": "Indikator cekaman air padi tadah hujan, BUKAN data puso: Kementan menetapkan puso dari pengamatan lapangan. Irigasi, pompa, dan genangan sawah "
                       "tidak dimodelkan, jadi angka di daerah beririgasi terlalu tinggi. Tanam mengikuti onset hujan klimatologi tiap sel dan bobot kabupaten memakai penduduk karena "
                       "data luas sawah belum ada. Jangan diperingkat antarwilayah; bacalah selisih terhadap Normal (hujan klimatologi) di wilayah yang sama. "
                       "Hujan ensemble tanpa koreksi bias, dan bagian musim di luar prakiraan (klim_pct) memakai hujan klimatologi.",
            "model": {"ky": KY, "taw_mm": TAW, "p_deplesi": P_DEPLESI, "kc": [KC_AWAL, KC_TENGAH, KC_AKHIR], "sumber": "FAO-56 (Allen 1998) bab 8 lewat fao.py; FAO-33 (Doorenbos & Kassam 1979)"},
            "kab": kab}


def main():
    r = lambda f: json.load(open(os.path.join(H.DIR_DATA, f)))
    sekarang = dt.datetime.now(H.WIB)
    jalur_out = os.path.join(H.DIR_DATA, "kekeringan_padi.json")
    ada = baca(jalur_out)
    musiman = baca(os.path.join(H.DIR_MENTAH, "musiman.json"))
    if H.lewati(ada, sekarang, 7, musiman and musiman.get("dibuat")):
        print(f"padi: kekeringan_padi.json berumur {H.umur_hari(ada, sekarang):.1f} hari dan lengkap; dilewati", file=sys.stderr)
        return
    kunci = [f"{g['lat']},{g['lon']}" for g in r("tanah.json")["grid"]]
    if not musiman:   # CI tidak membawa data/raw: coba ambil musiman dulu (prakiraan.muat_musiman melanjutkan/mengunduh, tahan 429)
        import prakiraan as PK
        musiman = PK.muat_musiman(kunci, sekarang)
    if not musiman or not musiman.get("titik"):
        print("::warning title=padi::musiman tidak tersedia; padi dilewati, keluaran lama dipertahankan", file=sys.stderr)
        return
    t0 = time.time()
    pow_sel = SPI.hujan_bulanan([tuple(float(x) for x in k.split(",")) for k in kunci], sekarang.date())
    isi = bangun(musiman, pow_sel, r("penduduk.json"), json.load(open(os.path.join(H.AKAR, "public/banjir/data/pusat_kec.json"))), sekarang)
    isi["lengkap"] = bool(musiman.get("lengkap"))
    if not H.boleh_timpa(ada, isi["lengkap"]):
        print("::warning title=padi::musiman baru sebagian (kuota); keluaran publik yang lengkap dipertahankan", file=sys.stderr)
        return
    simpan(jalur_out, isi)
    top = sorted(isi["kab"].items(), key=lambda x: -x[1]["selisih"])[:3]
    print(f"padi: {len(isi['kab'])} kab; selisih terbesar vs Normal {[(k, v['selisih']) for k, v in top]}; {time.time() - t0:.0f} dtk", file=sys.stderr)


def fixture_pow(basah=8.0, kering=3.0):
    """Klimatologi sintetis: Nov-Mar basah, lainnya kering (mm/hari), 1991-2026 Agu."""
    return {f"{y}{m:02d}": (basah if m in (11, 12, 1, 2, 3) else kering) for y in range(1991, 2027) for m in range(1, 13) if (y, m) <= (2026, 8)}


def fixture_musiman(hujan, et0=4.0, hari=150):
    tgl = [(dt.date(2026, 10, 18) + dt.timedelta(days=i)).isoformat() for i in range(hari)]
    return {"terbit": tgl[0], "tgl": tgl, "lengkap": True, "titik": {"0.25,0.25": {"p": [[hujan] * ANGGOTA for _ in range(hari)], "et0": [et0] * hari}},
            "anak": {"0.25,0.25": "0.25,0.25"}}


def uji():
    assert (UMUR, TAW, P_DEPLESI, KC_AKHIR) == (150, 65.0, 0.20, 0.90) and len(KC) == 150
    assert KC[0] == (0, 1.05) and KC[29][0] == 0 and KC[30][0] == 1 and KC[59] == (1, KC_TENGAH) and KC[60] == (2, KC_TENGAH) and KC[119][0] == 2 and KC[120][0] == 3 and KC[149] == (3, KC_AKHIR)
    # hujan melimpah -> tanpa cekaman (ETa = ETc), tanah sudah di kapasitas lapang
    eta, etc = neraca([20.0] * 150, [4.0] * 150)
    assert all(abs(a - c) < 1e-9 for a, c in zip(eta, etc)) and penurunan(eta, etc) == 0
    # tanpa hujan sama sekali: cadangan TAW (65 mm) habis, ETa jauh di bawah ETc
    eta, etc = neraca([0.0] * 150, [4.0] * 150)
    red = penurunan(eta, etc)
    assert sum(eta) < .3 * sum(etc) and .5 < red <= 1 and eta[0] > 0 and eta[3] / etc[3] < .1
    assert .3 < eta[0] / etc[0] < .7        # 30 hari awal menuntut ~126 mm dari 65 mm; Ks turun setelah 13 mm habis
    # monoton: hujan makin sedikit -> penurunan tidak berkurang
    r = [penurunan(*neraca([x] * 150, [4.0] * 150)) for x in (6.0, 4.0, 3.0, 2.0, 1.0, 0.0)]
    assert all(a <= b + 1e-12 for a, b in zip(r, r[1:])), r
    # masukan salah ditolak
    for p, e in (([1.0] * 100, [4.0] * 150), ([1.0] * 149 + [None], [4.0] * 150), ([-1.0] * 150, [4.0] * 150), ([1.0] * 150, [4.0] * 149)):
        try:
            neraca(p, e)
            raise SystemExit("neraca harus menolak")
        except ValueError:
            pass
    try:
        penurunan([0, 0, 0, 0], [0, 0, 0, 0])
        raise SystemExit("penurunan harus menolak ETc nol")
    except ValueError:
        pass
    # onset: Nov-Des >= 150 mm -> Nov; Okt-Nov basah -> Okt; wilayah kering -> bulan >= 100 mm; kering sekali -> bulan terbasah; klimatologi kosong -> None
    kl = lambda d: {m: (d.get(m, 3.0), d.get(m, 3.0) * 30.4) for m in range(1, 13)}
    assert bulan_onset(kl({11: 8, 12: 8, 1: 8})) == 11 and bulan_onset(kl({10: 8, 11: 8})) == 10 and bulan_onset(kl({1: 4.0})) == 1       # 4 x 30,4 = 122 mm saja (longgar)
    assert bulan_onset({}) is None and bulan_onset(kl({11: 8})) == 11            # bulan tunggal tanpa pasangan basah: aturan longgar (>= 100 mm)
    kering_total = {m: (2.0, 60.8) for m in range(1, 13)}
    kering_total[3] = (3.2, 97.3)
    assert bulan_onset(kering_total) == 3                                           # tak ada bulan >= 100 mm: bulan terbasah
    t = dt.date(2026, 10, 18)
    assert tanggal_tanam(10, t) == t and tanggal_tanam(9, t) == t and tanggal_tanam(11, t) == dt.date(2026, 11, 15) and tanggal_tanam(1, t) == dt.date(2027, 1, 15)
    # seri_musim: ujung prakiraan (150 hari dari 18 Okt = 16 Mar) lalu klimatologi; tanam 15 Nov -> 28 hari terakhir musim di luar prakiraan
    f = fixture_musiman(5.0)
    tg = [dt.date.fromisoformat(x) for x in f["tgl"]]
    p, e, k = seri_musim(dt.date(2026, 11, 15), tg, lambda i: 5.0, f["titik"]["0.25,0.25"]["et0"], {m: (1.5, 45.6) for m in range(1, 13)})
    assert len(p) == 150 == len(e) and k == 28 and p[0] == 5.0 and p[-1] == 1.5
    pend = {"kec": {"11|Alfa|b": 3000, "11|Zeta|a": 1000}}
    pusat = {"11|Alfa|b": [.3, .3], "11|Zeta|a": [.3, 1.2]}
    now = dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB)
    pw = {"0.25,0.25": fixture_pow()}
    kering = bangun(fixture_musiman(0.0), pw, pend, pusat, now)
    basah = bangun(fixture_musiman(15.0), pw, pend, pusat, now)
    a, b = kering["kab"]["11|Alfa"], basah["kab"]["11|Alfa"]
    assert a["gagal"] == 100 and b["gagal"] == 0 and a["tanam"] == "2026-11-15" and a["klim_pct"] == 19 and kering["tanam"]["rentang"] == ["2026-11-15", "2026-11-15"]
    assert a["selisih"] > 20 and a["turun_normal"] < a["turun_med"] and b["selisih"] <= 0 and b["turun_med"] == 0       # selisih terhadap Normal, bukan peringkat
    assert a["data_sawah"] is False and "BUKAN data puso" in kering["catatan"] and "peringkat" in kering["catatan"] and a["kode"] == "1101"
    # pemecah hujan klimatologi: rerata terjaga, hujan berumpun (variansi jumlah 7 harian jauh di atas deret konstan), dan deterministik per benih
    klm = {m: (4.0, 121.6) for m in range(1, 13)}
    deret = [hujan_klim_acak(dt.date(2026, 11, 15), klm, random.Random(i)) for i in range(300)]
    rerata = sum(sum(x) for x in deret) / (300 * UMUR)
    assert abs(rerata - 4.0) < 0.25 and all(len(x) == UMUR and min(x) >= 0 for x in deret) and deret[0] == hujan_klim_acak(dt.date(2026, 11, 15), klm, random.Random(0))
    mingguan = [sum(x[i:i + 7]) for x in deret for i in range(0, 140, 7)]
    assert statistics.pstdev(mingguan) > 10 and sum(1 for v in deret[0] if v == 0) > 30            # konstan: pstdev 0, tanpa hari kering
    assert hujan_klim_acak(dt.date(2026, 11, 15), {m: (0.0, 0.0) for m in range(1, 13)}, random.Random(1)) == [0.0] * UMUR
    # TOTAL SAMA -> selisih ~0: anggota ensemble ditarik dari pemecah yang sama dengan Normal, benih berbeda
    rng = random.Random(12345)
    f = fixture_musiman(0.0)
    f["titik"]["0.25,0.25"]["p"] = [[0.0] * ANGGOTA for _ in range(150)]
    kl_pw = klim_bulanan(pw["0.25,0.25"])
    for j in range(ANGGOTA):
        x = hujan_klim_acak(dt.date(2026, 10, 18), kl_pw, rng)
        for i in range(150):
            f["titik"]["0.25,0.25"]["p"][i][j] = x[i]
    sama = bangun(f, pw, pend, pusat, now)["kab"]["11|Alfa"]
    assert abs(sama["selisih"]) <= 3 and abs(sama["turun25"] - sama["turun25_normal"]) <= 8 and "turun25_normal" in sama and "gagal_normal" in sama, sama
    for jelek in (lambda: bangun({"titik": {}}, pw, pend, pusat, now), lambda: bangun(fixture_musiman(1.0), {"0.25,0.25": {"199101": 1.0}}, pend, pusat, now)):
        try:
            jelek()
            raise SystemExit("bangun harus menolak masukan kurang")
        except ValueError:
            pass
    print("ok padi")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
