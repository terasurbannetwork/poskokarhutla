"""Peluang cekaman air padi (penanda risiko gagal panen) per kabupaten -> public/data/kekeringan_padi.json

INI INDIKATOR CEKAMAN AIR, BUKAN DATA PUSO. Kementan menetapkan puso dari pengamatan lapangan (kerusakan > 75%); model ini hanya menghitung
seberapa sering skenario ensemble membuat padi tadah hujan kekurangan air. Sawah beririgasi, pompa, dan genangan sawah tidak dimodelkan, jadi
angka lebih tinggi dari kenyataan di daerah beririgasi. Repo tidak punya data luas sawah: bobot kabupaten = penduduk (bukan luas sawah) dan
semua kabupaten ditandai `data_sawah: false`.

Model (FAO-56 bab 8 neraca air tanaman tunggal + FAO-33 penurunan hasil), per anggota SEAS5 di tiap titik 2 derajat (musiman.json):
  Asumsi tanam   : 15 November (awal musim hujan; tahun El Nino bisa mundur), umur 120 hari, tanah mulai kapasitas lapang (sawah dilumpurkan).
  Fase (hari)    : awal 20, vegetatif 30, generatif 40, pemasakan 30 (FAO-56 Tabel 11, padi 30/30/60/30 hari, diringkas ke varietas 120 hari).
  Kc             : 1,05 awal; naik linear ke 1,20 selama vegetatif; 1,20 generatif; turun linear ke 0,75 selama pemasakan (FAO-56 Tabel 12 padi:
                   ini 1,05, tengah 1,20, akhir 0,90-0,60; dipakai titik tengah 0,75).
  Tanah          : air tersedia total TAW = 100 mm (zona akar 0,5 m x 0,20 m/m, lempung berat; FAO-56 Tabel 19), fraksi p = 0,20 (FAO-56 Tabel 22 padi),
                   stres Ks = (TAW - Dr) / ((1 - p) TAW) bila Dr > p TAW; kelebihan hujan dibuang (tanpa genangan sawah).
  ETa            : Ks x Kc x ET0 harian (ET0 = rerata anggota SEAS5 di blok 4 derajat).
  Hasil          : Ya/Ym = 1 - Ky (1 - sum ETa / sum ETc), Ky = 1,09 untuk padi seluruh musim (Doorenbos & Kassam 1979, FAO-33).
                   Ky per fase tidak dipakai (nilainya tidak saya verifikasi ke sumber), jadi hanya defisit per fase yang dilaporkan.
  Gagal panen    : penurunan hasil >= 50% (AMBANG_GAGAL). Tahap kedua: penurunan >= 25% (AMBANG_TURUN). Ambang ini pilihan kami, bukan definisi resmi.

Pakai:  python3 scripts/kekeringan/padi.py      |  python3 scripts/kekeringan/padi.py uji
"""
import datetime as dt, json, os, statistics, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan
import hth as H

TANAM = (11, 15)
FASE = (("awal", 20), ("vegetatif", 30), ("generatif", 40), ("pemasakan", 30))
KC_AWAL, KC_TENGAH, KC_AKHIR = 1.05, 1.20, 0.75
TAW = 100.0
P_DEPLESI = 0.20
KY = 1.09
AMBANG_GAGAL = 0.50
AMBANG_TURUN = 0.25
ANGGOTA = 51
UMUR = sum(h for _, h in FASE)


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


def indeks_tanam(tgl, terbit):
    """Indeks hari tanam di tgl (ISO); tanam tahun terbit atau berikutnya bila sudah lewat. None bila prakiraan tak mencakup masa tanam penuh."""
    t = dt.date.fromisoformat(terbit)
    d = dt.date(t.year, *TANAM)
    if d < t:
        d = dt.date(t.year + 1, *TANAM)
    s = d.isoformat()
    if s not in tgl or tgl.index(s) + UMUR > len(tgl):
        return None
    return tgl.index(s)


def jalankan_titik(v, i0):
    """Satu titik: v = {'p': [hari][anggota], 'et0': [hari]} -> list penurunan hasil per anggota + defisit fase rata-rata."""
    et0 = v["et0"][i0:i0 + UMUR]
    reds, fase_def = [], [0.0] * 4
    for j in range(ANGGOTA):
        eta, etc = neraca([max(0.0, row[j]) for row in v["p"][i0:i0 + UMUR]], et0)   # SEAS5 kadang -0,1 mm: artefak model, dianggap 0
        reds.append(penurunan(eta, etc))
        for f in range(4):
            fase_def[f] += (1 - eta[f] / etc[f]) / ANGGOTA
    return reds, fase_def


def bangun(musiman, penduduk, pusat, sekarang):
    if not musiman or not musiman.get("titik"):
        raise ValueError("musiman.json kosong")
    i0 = indeks_tanam(musiman["tgl"], musiman["terbit"])
    if i0 is None:
        raise ValueError(f"prakiraan {musiman['tgl'][0]}..{musiman['tgl'][-1]} tidak mencakup tanam {TANAM} + {UMUR} hari")
    hasil = {}
    for k, v in musiman["titik"].items():
        if v.get("p") is None or v.get("et0") is None:
            continue
        reds, fd = jalankan_titik(v, i0)
        hasil[k] = {"gagal": 100 * sum(1 for r in reds if r >= AMBANG_GAGAL) / ANGGOTA, "turun25": 100 * sum(1 for r in reds if r >= AMBANG_TURUN) / ANGGOTA,
                    "med": 100 * statistics.median(reds), "p90": 100 * sorted(reds)[int(.9 * (ANGGOTA - 1))], "fase": fd}
    if not hasil:
        raise ValueError("tak satu titik pun punya hujan dan ET0")
    peta = H.peta_kec(penduduk, pusat, musiman["anak"])
    kode = H.kode_kab(penduduk)
    per_kab = {}
    for prov, kab, jiwa, c in peta:
        t = musiman["anak"].get(c)
        if t in hasil:
            per_kab.setdefault(kab, []).append((jiwa, hasil[t]))

    def rata(d, f):
        return sum(w * f(r) for w, r in d) / sum(w for w, _ in d)
    kab = {}
    for k, d in per_kab.items():
        fd = [rata(d, lambda r, f=f: r["fase"][f]) for f in range(4)]
        kab[k] = {"kode": kode.get(k), "prov": k.split("|")[0], "gagal": round(rata(d, lambda r: r["gagal"])), "turun25": round(rata(d, lambda r: r["turun25"])),
                  "turun_med": round(rata(d, lambda r: r["med"])), "turun_p90": round(rata(d, lambda r: r["p90"])),
                  "fase_terberat": FASE[max(range(4), key=lambda f: fd[f])][0], "defisit_fase": [round(100 * x) for x in fd], "data_sawah": False}
    return {"dibuat": sekarang.isoformat(timespec="minutes"), "label": "Deteksi Pantau Bencana", "terbit": musiman["terbit"],
            "tanam": musiman["tgl"][i0], "panen": musiman["tgl"][i0 + UMUR - 1], "fase": [{"nama": n, "hari": h} for n, h in FASE],
            "ambang": {"gagal_pct": int(100 * AMBANG_GAGAL), "turun_pct": int(100 * AMBANG_TURUN)},
            "catatan": "Indikator cekaman air padi tadah hujan, BUKAN data puso: Kementan menetapkan puso dari pengamatan lapangan. Irigasi, pompa, dan genangan sawah "
                       "tidak dimodelkan, jadi angka di daerah beririgasi terlalu tinggi. Tanam diasumsikan 15 November dan bobot kabupaten memakai penduduk karena "
                       "data luas sawah belum ada. Hujan ensemble tanpa koreksi bias.",
            "model": {"ky": KY, "taw_mm": TAW, "p_deplesi": P_DEPLESI, "kc": [KC_AWAL, KC_TENGAH, KC_AKHIR], "sumber": "FAO-56 (Allen 1998) bab 8; FAO-33 (Doorenbos & Kassam 1979)"},
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
