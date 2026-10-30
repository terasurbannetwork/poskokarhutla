"""#28 BPS + #29 Meta Relative Wealth Index + komponen demografi Dukcapil (#30) -> V (kerentanan) per kabupaten
-> public/data/bnpb/kerentanan.json

KOMPONEN  (tiap komponen di-z-skor lintas kabupaten; arah: makin besar z = makin rentan)
  kep   log10(penduduk Dukcapil / luas km2 poligon kabupaten)           Dukcapil + public/geo/kabupaten   (padat = rentan)
  lan   % lansia >= 60 th = (u60+u65+u70+u75) / penduduk                Dukcapil                          (rentan)
  bal   % balita 0-4 th   = u0 / penduduk                               Dukcapil                          (rentan)
  rwi   -RWI rata-rata petak 2,4 km di kabupaten                        Meta RWI, HDX (CC BY-NC 4.0)      (RWI rendah = miskin = rentan)
  mis   % penduduk miskin (P0) kabupaten                                BPS WebAPI, butuh BPS_KEY         (miskin = rentan)
  V_z = rata-rata z komponen yang ADA (>= 3 komponen; komponen hilang bukan 0). Skala z, bukan 0-1: dipakai langsung di model
  risiko_hvc dan diubah ke (0,1) lewat fungsi normal kumulatif di sana.
PEMBANDING  v_inarisk = median raster kerentanan multi-bahaya InaRISK (layer_kerentanan_multi) di pusat kecamatan; BUKAN bagian V_z,
  dipakai sebagai pembanding resmi di uji (korelasi V_z vs v_inarisk dicatat).
BATAS     RWI: model pembelajaran mesin (Chi dkk. PNAS 2022) tahun data sekitar 2018-2021, petak hanya ada di permukiman,
  rata-rata kabupaten tak berbobot penduduk. Lisensi CC BY-NC 4.0: hanya agregat kabupaten yang dikomit, pemakaian nonkomersial.
  Tanpa BPS_KEY komponen `mis` = null dan bps.status = "MENUNGGU KUNCI". Indeks komposit buatan sendiri: belum diuji balik di sini,
  uji baliknya ada di risiko_hvc.json (model korban jiwa).
KELUARAN  {"dibuat","sumber","atribusi","lisensi","bps":{"status",...},"komponen":[...],"kab":{kode:{n,luas,kep,lan,bal,rwi,rwi_n,mis,v_inarisk,z:{...},v,k}}}
Pakai:  python3 scripts/bnpb/kerentanan.py   |   python3 scripts/bnpb/kerentanan.py --cek
"""
import csv, json, math, os, statistics, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hvc_dasar as D
import hvc_stat as S
import terpapar as T
import bps as B

RWI_URL = ("https://data.humdata.org/dataset/76f2a2ea-ba50-40f5-b79c-db95d668b843/resource/b7238173-c1cf-4db1-bbe9-b6bd01420c7d/"
           "download/idn_relative_wealth_index.csv")
RWI_BERKAS = os.path.join(D.MENTAH, "rwi_idn.csv")
KOMPONEN = ["kep", "lan", "bal", "rwi", "mis"]
MIN_KOMPONEN = 3
# dua gaya judul tabel BPS provinsi: (kata kunci, pola judul, pola turvar). Gaya 1 (mis. Jawa Tengah): satu tabel memuat garis/jumlah/persentase sebagai turvar;
# gaya 2 (mis. Aceh): tabel persentase tersendiri.
GAYA_MISKIN = [("kemiskinan", r"^kemiskinan menurut kabupaten", "persentase"),
               ("penduduk miskin", r"persentase penduduk miskin.*menurut kabupaten", None)]
TAHUN_BPS = "123:125"   # kode th = tahun - 1900 (2023-2025; API membatasi 3 tahun per panggilan); terbaru yang terisi dipakai


def luas_km2(poligon):
    """Poligon GeoJSON (daftar cincin: luar lalu lubang) atau MultiPolygon (daftar poligon) -> km2, proyeksi ekuirektangular di lintang tengah."""
    def cincin(r):
        la0 = math.radians(sum(p[1] for p in r) / len(r))
        kx, ky = 111.32 * math.cos(la0), 110.57
        return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip([(p[0] * kx, p[1] * ky) for p in r],
                                                                     [(p[0] * kx, p[1] * ky) for p in r[1:] + r[:1]]))) / 2
    return sum(cincin(p[0]) - sum(cincin(h) for h in p[1:]) for p in poligon)


def agregat_dukcapil(desa):
    """desa [{kab,n,b,l}] -> {kode: (penduduk, balita, lansia)}."""
    out = {}
    for d in desa:
        a = out.setdefault(d["kab"], [0, 0, 0])
        a[0] += d["n"]; a[1] += d["b"]; a[2] += d["l"]
    return out


def baca_rwi(jalur):
    """CSV latitude,longitude,rwi,error -> [(lat, lon, rwi)] (baris rusak dibuang)."""
    out = []
    with open(jalur, newline="") as f:
        for r in csv.DictReader(f):
            try:
                out.append((float(r["latitude"]), float(r["longitude"]), float(r["rwi"])))
            except (KeyError, ValueError):
                continue
    return out


def rwi_per_kab(petak, cari_kab, peta_kode):
    """petak [(lat, lon, rwi)] + cari_kab(lat, lon) -> "prov|kab" + peta kode -> {kode: (rata-rata, jumlah petak)}."""
    s = {}
    for la, lo, v in petak:
        kode = peta_kode.get(cari_kab(la, lo))
        if kode:
            t = s.setdefault(kode, [0.0, 0])
            t[0] += v; t[1] += 1
    return {k: (t[0] / t[1], t[1]) for k, t in s.items()}


def susun_v(baris):
    """baris {kode: {kep,lan,bal,rwi,mis (None bila hilang)}} -> {kode: (z{}, v)}. rwi dan mis dibalik tandanya SEBELUM z
    (RWI tinggi = kaya = kurang rentan; mis sudah searah)."""
    kode = list(baris)
    z = {}
    for k in KOMPONEN:
        arah = -1 if k == "rwi" else 1
        z[k] = S.zskor([None if baris[c][k] is None else arah * baris[c][k] for c in kode])
    out = {}
    for i, c in enumerate(kode):
        zi = {k: z[k][i] for k in KOMPONEN}
        out[c] = (zi, S.rerata_ada([zi[k] for k in KOMPONEN], MIN_KOMPONEN))
    return out


def miskin_bps(kodes):
    """-> ({kode: persen}, status). Tanpa kunci: ({}, {"status": "MENUNGGU KUNCI"}). Satu panggilan per provinsi (domain NN00)."""
    try:
        B.kunci()
    except B.KunciKosong:
        return {}, {"status": "MENUNGGU KUNCI", "catatan": "BPS_KEY tidak ada di env; komponen mis = null"}
    hasil, tahun, gagal = {}, set(), []
    for p in sorted({k[:2] for k in kodes}):
        dom = f"{p}00"
        try:
            vid, tp = None, None
            for kata, pola, tp in GAYA_MISKIN:
                vid = B.pilih_var(B.cari_var(dom, kata), pola)
                if vid is not None:
                    break
            if vid is None:
                gagal.append(f"{dom}: variabel tak ditemukan")
                continue
            d = B.urai_data(B.ambil(B.url_data(dom, vid, TAHUN_BPS)), vid, tp)
            for kode, per in d.items():
                t = B.terbaru(per)
                if t and kode in kodes:
                    hasil[kode] = t[1]; tahun.add(t[0])
        except (RuntimeError, B.FormatBeda) as e:
            gagal.append(f"{dom}: {e}")
    return hasil, {"status": "OK" if hasil else "GAGAL", "tahun": sorted(tahun), "domain_gagal": gagal}


def v_inarisk_per_kab():
    pusat = json.load(open(os.path.join(D.AKAR, "public/banjir/data/pusat_kec.json")))
    kunci = list(pusat)
    nilai = T.sampel("layer_kerentanan_multi", [(pusat[k][1], pusat[k][0]) for k in kunci])
    peta, per = D.kab_kode(), {}
    for k, v in zip(kunci, nilai):
        kode = peta.get("|".join(k.split("|")[:2]))
        if kode and v > 0:
            per.setdefault(kode, []).append(v)
    return {k: round(statistics.median(v), 4) for k, v in per.items()}


def jalan():
    mulai = time.time()
    peta = D.kab_kode()
    desa = json.load(open(os.path.join(D.MENTAH, "dukcapil_desa.json")))
    duk = agregat_dukcapil(desa)
    G = D._kej.kab_geo(D.AKAR)
    luas = {peta[k]: luas_km2(v["poly"]) for k, v in G.items() if k in peta}
    if not os.path.exists(RWI_BERKAS):
        os.makedirs(D.MENTAH, exist_ok=True)
        open(RWI_BERKAS, "wb").write(D.ambil(RWI_URL, mentah=True, batas_waktu=300))
    rwi = rwi_per_kab(baca_rwi(RWI_BERKAS), lambda la, lo: D._kej.kab_di(D.AKAR, la, lo), peta)
    mis, status_bps = miskin_bps(set(duk))
    vin = v_inarisk_per_kab()
    baris, info = {}, D.kab_info()
    for kode, (n, b, l) in duk.items():
        if kode not in info or n <= 0 or not luas.get(kode):
            continue
        baris[kode] = {"n": n, "luas": round(luas[kode], 1), "kep": math.log10(n / luas[kode]), "lan": 100 * l / n, "bal": 100 * b / n,
                       "rwi": rwi[kode][0] if kode in rwi else None, "rwi_n": rwi[kode][1] if kode in rwi else 0, "mis": mis.get(kode)}
    v = susun_v(baris)
    kab = {}
    for kode, r in baris.items():
        zi, vi = v[kode]
        kab[kode] = {"n": r["n"], "luas": r["luas"], "kep": round(r["kep"], 3), "lan": round(r["lan"], 2), "bal": round(r["bal"], 2),
                     "rwi": None if r["rwi"] is None else round(r["rwi"], 3), "rwi_n": r["rwi_n"], "mis": r["mis"],
                     "v_inarisk": vin.get(kode), "z": {k: None if x is None else round(x, 3) for k, x in zi.items()},
                     "v": None if vi is None else round(vi, 3)}
    pasang = [(k["v"], k["v_inarisk"]) for k in kab.values() if k["v"] is not None and k["v_inarisk"]]
    rho = S.spearman([a for a, _ in pasang], [b for _, b in pasang]) if len(pasang) > 10 else None
    D.simpan_plafon("kerentanan.json", {
        "sumber": "Dukcapil Kemendagri (umur, penduduk per desa) + Meta Relative Wealth Index (HDX) + BPS WebAPI (kemiskinan, butuh kunci)",
        "atribusi": "Dukcapil Kemendagri; Chi G, Fang H, Chatterjee S, Blumenstock J (2022) Microestimates of wealth for all low- and middle-income countries, PNAS 119(3):e2113658119 (Meta/UC Berkeley); BPS",
        "lisensi": "RWI: CC BY-NC 4.0 (hanya agregat kabupaten dikomit; pemakaian nonkomersial); Dukcapil: layanan publik tanpa syarat tertulis; BPS: syarat WebAPI",
        "bps": status_bps, "komponen": KOMPONEN, "min_komponen": MIN_KOMPONEN,
        "rumus": "V_z = rata-rata z{log10 kepadatan, % lansia, % balita, -RWI, % miskin} yang ada; z lintas kabupaten",
        "label": "indeks komposit, belum diuji balik di berkas ini; uji balik ada di risiko_hvc.json",
        "uji": {"spearman_v_vs_inarisk": None if rho is None else round(rho, 3), "n": len(pasang)}, "kab": kab})
    print(f"kerentanan.json: {len(kab)} kab, RWI {len(rwi)} kab, BPS {status_bps['status']}, rho(V,InaRISK)={rho}, {time.time() - mulai:.0f} dtk", file=sys.stderr)


def _cek():
    kotak = [[[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]]
    a = luas_km2([kotak])
    assert abs(a - 12308) < 30, a    # 1 derajat x 1 derajat di ekuator ~ 12.300 km2
    lubang = [kotak[0], [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75], [0.25, 0.25]]]
    assert abs(luas_km2([lubang]) - 0.75 * a) / a < 0.01, "lubang harus dikurangkan"
    ag = agregat_dukcapil([{"kab": "3301", "n": 100, "b": 5, "l": 10}, {"kab": "3301", "n": 50, "b": 1, "l": 2}, {"kab": "3302", "n": 10, "b": 0, "l": 0}])
    assert ag == {"3301": [150, 6, 12], "3302": [10, 0, 0]}
    cari = lambda la, lo: "33|A" if lo < 5 else "33|B" if lo < 10 else "99|X"
    r = rwi_per_kab([(0, 1, -1.0), (0, 2, 1.0), (0, 6, 0.5), (0, 20, 9.9)], cari, {"33|A": "3301", "33|B": "3302"})
    assert r == {"3301": (0.0, 2), "3302": (0.5, 1)}, r
    # susun_v: kabupaten miskin padat lansia banyak harus paling rentan; RWI dibalik; komponen hilang tak dihitung 0
    baris = {"A": {"kep": 3.0, "lan": 10, "bal": 9, "rwi": -1.0, "mis": None},
             "B": {"kep": 1.0, "lan": 5, "bal": 6, "rwi": 1.0, "mis": None},
             "C": {"kep": 2.0, "lan": 7, "bal": 8, "rwi": 0.0, "mis": None},
             "D": {"kep": 2.0, "lan": None, "bal": None, "rwi": None, "mis": None}}
    baris["D"].update(lan=None)
    out = susun_v(baris)
    assert out["A"][1] > out["C"][1] > out["B"][1], out
    assert out["A"][0]["rwi"] > 0 > out["B"][0]["rwi"], "RWI harus dibalik tanda"
    assert out["D"][1] is None, "komponen < 3 -> V None, bukan 0"
    assert out["A"][0]["mis"] is None
    # BPS tanpa kunci -> status menunggu, bukan galat
    saved = os.environ.pop("BPS_KEY", None)
    try:
        h, st = miskin_bps({"3301"})
        assert h == {} and st["status"] == "MENUNGGU KUNCI"
    finally:
        if saved is not None:
            os.environ["BPS_KEY"] = saved
    print("kerentanan: --cek hijau")


if __name__ == "__main__":
    _cek() if "--cek" in sys.argv else jalan()
