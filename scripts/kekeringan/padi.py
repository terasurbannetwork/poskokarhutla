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
  Normal         : model yang sama dijalankan dengan hujan harian = rerata klimatologi bulan itu (konstan per hari) sepanjang musim. SEAS5 mentah di bulan +2/+3
                   membawa bias (median anggota 1,1 sampai 1,2 kali klimatologi), jadi selisih sebagian mencerminkan bias itu.

Pakai:  python3 scripts/kekeringan/padi.py      |  python3 scripts/kekeringan/padi.py uji
"""
import calendar, datetime as dt, json, os, statistics, sys, time

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


def hasil_sel(pow_, v, tgl_fc, terbit):
    """Satu sel: v = {'p': [hari][anggota], 'et0': [hari]} titik induknya -> dict penurunan per anggota, Normal, tanam, bagian klimatologi. None bila klimatologi kurang."""
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
    # Normal: hujan harian = rerata klimatologi bulan itu sepanjang musim; ET0 sama dengan skenario ensemble
    _, e, _ = seri_musim(tanam, tgl_fc, lambda i: 0.0, v["et0"], klim)
    pn = [klim[(tanam + dt.timedelta(days=k)).month][0] for k in range(UMUR)]
    normal = penurunan(*neraca(pn, e))
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
            r = hasil_sel(pow_sel[c], v, tgl_fc, terbit)
            if r:
                reds = r["reds"]
                sel[c] = {"gagal": 100 * sum(1 for x in reds if x >= AMBANG_GAGAL) / ANGGOTA, "turun25": 100 * sum(1 for x in reds if x >= AMBANG_TURUN) / ANGGOTA,
                          "med": 100 * statistics.median(reds), "p90": 100 * sorted(reds)[int(.9 * (ANGGOTA - 1))], "normal": 100 * r["normal"], "fase": r["fase"],
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
    if not musiman:   # CI tidak membawa data/raw: coba ambil musiman dulu (prakiraan.muat_musiman melanjutkan/mengunduh, tahan 429)
        import prakiraan as PK
        kunci = [f"{g['lat']},{g['lon']}" for g in r("tanah.json")["grid"]]
        musiman = PK.muat_musiman(kunci, sekarang)
    if not musiman or not musiman.get("titik"):
        print("::warning title=padi::musiman tidak tersedia; padi dilewati, keluaran lama dipertahankan", file=sys.stderr)
        return
    t0 = time.time()
    isi = bangun(musiman, r("penduduk.json"), json.load(open(os.path.join(H.AKAR, "public/banjir/data/pusat_kec.json"))), sekarang)
    isi["lengkap"] = bool(musiman.get("lengkap"))
    if not H.boleh_timpa(ada, isi["lengkap"]):
        print("::warning title=padi::musiman baru sebagian (kuota); keluaran publik yang lengkap dipertahankan", file=sys.stderr)
        return
    simpan(jalur_out, isi)
    top = sorted(isi["kab"].items(), key=lambda x: -x[1]["gagal"])[:3]
    print(f"padi: {len(isi['kab'])} kab; teratas {[(k, v['gagal']) for k, v in top]}; {time.time() - t0:.0f} dtk", file=sys.stderr)


def fixture_musiman(hujan, et0=4.0, hari=150):
    tgl = [(dt.date(2026, 10, 18) + dt.timedelta(days=i)).isoformat() for i in range(hari)]
    return {"terbit": tgl[0], "tgl": tgl, "lengkap": True, "titik": {"0.25,0.25": {"p": [[hujan] * ANGGOTA for _ in range(hari)], "et0": [et0] * hari}},
            "anak": {"0.25,0.25": "0.25,0.25"}}


def uji():
    assert len(KC) == UMUR == 120 and KC[0] == (0, 1.05) and KC[19][0] == 0 and KC[20][0] == 1 and KC[49] == (1, KC_TENGAH) and KC[50] == (2, KC_TENGAH) and KC[119] == (3, KC_AKHIR)
    # hujan melimpah -> tanpa cekaman (ETa = ETc), tanah sudah di kapasitas lapang
    eta, etc = neraca([20.0] * 120, [4.0] * 120)
    assert all(abs(a - c) < 1e-9 for a, c in zip(eta, etc)) and penurunan(eta, etc) == 0
    # tanpa hujan sama sekali: cadangan TAW habis, ETa jauh di bawah ETc, penurunan besar tetapi terbatas 0..1
    eta, etc = neraca([0.0] * 120, [4.0] * 120)
    red = penurunan(eta, etc)
    assert sum(eta) < .3 * sum(etc) and .5 < red <= 1 and eta[0] > 0
    # tanpa hujan: 20 hari awal menuntut 84 mm dari cadangan 100 mm, Ks mulai turun setelah 20 mm habis -> fase awal sebagian terpenuhi, fase akhir hampir nol
    assert .6 < eta[0] / etc[0] < .9 and eta[3] / etc[3] < .1
    # monoton: hujan makin sedikit -> penurunan tidak berkurang
    r = [penurunan(*neraca([x] * 120, [4.0] * 120)) for x in (6.0, 4.0, 3.0, 2.0, 1.0, 0.0)]
    assert all(a <= b + 1e-12 for a, b in zip(r, r[1:])), r
    # masukan salah ditolak
    for p, e in (([1.0] * 100, [4.0] * 120), ([1.0] * 119 + [None], [4.0] * 120), ([-1.0] * 120, [4.0] * 120), ([1.0] * 120, [4.0] * 119)):
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
    # indeks tanam: 15 Nov 2026 = hari ke-28 dari 18 Okt; prakiraan pendek ditolak
    assert indeks_tanam(fixture_musiman(1)["tgl"], "2026-10-18") == 28 and indeks_tanam(fixture_musiman(1, hari=100)["tgl"], "2026-10-18") is None
    pend = {"kec": {"11|Alfa|b": 3000, "11|Zeta|a": 1000}}
    pusat = {"11|Alfa|b": [.3, .3], "11|Zeta|a": [.3, 1.2]}
    now = dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB)
    kering = bangun(fixture_musiman(0.0), pend, pusat, now)
    basah = bangun(fixture_musiman(15.0), pend, pusat, now)
    assert kering["kab"]["11|Alfa"]["gagal"] == 100 and basah["kab"]["11|Alfa"]["gagal"] == 0 and kering["tanam"] == "2026-11-15" and kering["panen"] == "2027-03-14"
    assert kering["kab"]["11|Alfa"]["data_sawah"] is False and "BUKAN data puso" in kering["catatan"] and kering["kab"]["11|Alfa"]["kode"] == "1101"
    try:
        bangun({"titik": {}}, pend, pusat, now)
        raise SystemExit("bangun harus menolak musiman kosong")
    except ValueError:
        pass
    print("ok padi")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
